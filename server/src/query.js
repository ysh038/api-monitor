const express = require('express');

const LIST_COLUMNS = `
  id, kind, request_id, parent_request_id, service_name, instance_id, method, path, target_host,
  status_code, duration_ms, client_ip, async, created_at,
  exception_class, exception_message, exception_handled`;

const STATUS_CLASSES = { '2xx': [200, 299], '3xx': [300, 399], '4xx': [400, 499], '5xx': [500, 599] };

function buildFilter(q) {
  const where = [];
  const params = {};
  if (q.service) {
    where.push('service_name = @service');
    params.service = q.service;
  }
  if (q.kind === 'INBOUND' || q.kind === 'OUTBOUND') {
    where.push('kind = @kind');
    params.kind = q.kind;
  }
  if (q.status) {
    const classes = String(q.status).split(',');
    const parts = [];
    for (const c of classes) {
      if (STATUS_CLASSES[c]) parts.push(`(status_code BETWEEN ${STATUS_CLASSES[c][0]} AND ${STATUS_CLASSES[c][1]})`);
      else if (c === 'none') parts.push('status_code IS NULL');
    }
    if (parts.length) where.push(`(${parts.join(' OR ')})`);
  }
  if (q.exception === '1' || q.exception === 'true') where.push('exception_class IS NOT NULL');
  if (q.host) {
    where.push('target_host = @host');
    params.host = q.host;
  }
  if (q.q) {
    where.push(`(path LIKE @q ESCAPE '\\' OR request_body LIKE @q ESCAPE '\\' OR response_body LIKE @q ESCAPE '\\'
                 OR request_id = @qExact OR parent_request_id = @qExact
                 OR exception_class LIKE @q ESCAPE '\\' OR exception_message LIKE @q ESCAPE '\\')`);
    params.q = `%${String(q.q).replace(/[\\%_]/g, (m) => '\\' + m)}%`;
    params.qExact = String(q.q).trim();
  }
  return { where, params };
}

const parseJson = (v) => {
  if (v === null || v === undefined) return null;
  try {
    return JSON.parse(v);
  } catch {
    return v;
  }
};

function queryRouter(db, queue) {
  const router = express.Router();

  const childrenStmt = db.prepare(
    `SELECT ${LIST_COLUMNS} FROM api_logs WHERE parent_request_id = ? ORDER BY created_at, id LIMIT 500`,
  );
  const parentStmt = db.prepare(
    `SELECT ${LIST_COLUMNS} FROM api_logs WHERE request_id = ? AND kind = 'INBOUND' ORDER BY id LIMIT 1`,
  );
  const siblingsStmt = db.prepare(
    `SELECT ${LIST_COLUMNS} FROM api_logs WHERE request_id = ? AND id != ? AND kind = 'INBOUND' ORDER BY id LIMIT 50`,
  );
  const detailStmt = db.prepare('SELECT * FROM api_logs WHERE id = ?');
  const servicesStmt = db.prepare(`
    SELECT service_name AS name,
           COUNT(*) AS total,
           SUM(CASE WHEN status_code >= 500 OR status_code IS NULL THEN 1 ELSE 0 END) AS errors,
           SUM(CASE WHEN exception_class IS NOT NULL THEN 1 ELSE 0 END) AS exceptions,
           MAX(created_at) AS lastSeen
    FROM api_logs GROUP BY service_name ORDER BY service_name`);
  const hostsStmt = db.prepare(`
    SELECT target_host AS host, COUNT(*) AS total
    FROM api_logs WHERE kind = 'OUTBOUND' AND target_host IS NOT NULL
    GROUP BY target_host ORDER BY total DESC LIMIT 100`);

  // 목록: 최신순. afterId=폴링용 신규분, beforeId=더 보기
  router.get('/api/logs', (req, res) => {
    const { where, params } = buildFilter(req.query);
    const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);
    if (req.query.afterId) {
      where.push('id > @afterId');
      params.afterId = Number(req.query.afterId);
    }
    if (req.query.beforeId) {
      where.push('id < @beforeId');
      params.beforeId = Number(req.query.beforeId);
    }
    const sql = `SELECT ${LIST_COLUMNS},
                   (SELECT COUNT(*) FROM api_logs c WHERE c.parent_request_id = api_logs.request_id
                      AND api_logs.kind = 'INBOUND') AS child_count
                 FROM api_logs ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
                 ORDER BY id DESC LIMIT ${limit}`;
    res.json({ items: db.prepare(sql).all(params), limit });
  });

  router.get('/api/logs/:id', (req, res) => {
    const row = detailStmt.get(Number(req.params.id));
    if (!row) return res.status(404).json({ error: 'not found' });
    row.request_headers = parseJson(row.request_headers);
    row.response_headers = parseJson(row.response_headers);
    row.exception_causes = parseJson(row.exception_causes);
    const related = {
      children: row.kind === 'INBOUND' && row.request_id ? childrenStmt.all(row.request_id) : [],
      parent: row.parent_request_id ? parentStmt.get(row.parent_request_id) || null : null,
      // 같은 X-Request-Id로 들어온 다른 서비스의 인바운드 (서비스 간 호출 추적)
      sameRequestId: row.kind === 'INBOUND' && row.request_id ? siblingsStmt.all(row.request_id, row.id) : [],
    };
    res.json({ ...row, related });
  });

  router.get('/api/services', (req, res) => {
    res.json({ services: servicesStmt.all(), hosts: hostsStmt.all() });
  });

  // 스타터가 대시보드를 자동으로 찾을 때 이 헤더로 식별한다 (같은 포트의 다른 서비스와 구분)
  router.get('/api/health', (req, res) => {
    res.set('X-Api-Monitor', '1');
    res.json({ status: 'ok', service: 'api-monitor', ...queue.stats() });
  });

  return router;
}

module.exports = { queryRouter };
