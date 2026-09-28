const express = require('express');
const { INSERT_SQL, toRow } = require('./db');

/**
 * 수신 큐: /ingest는 큐에 넣고 바로 202를 돌려주고,
 * 일정 주기/건수마다 한 트랜잭션으로 묶어 SQLite에 쓴다.
 */
function createIngestQueue(db, config) {
  const insert = db.prepare(INSERT_SQL);
  const insertMany = db.transaction((rows) => {
    for (const row of rows) insert.run(row);
  });
  let queue = [];
  let dropped = 0;

  function flush() {
    if (queue.length === 0) return;
    const batch = queue;
    queue = [];
    try {
      insertMany(batch);
    } catch (err) {
      console.error(`[ingest] ${batch.length}건 저장 실패:`, err.message);
    }
  }

  const timer = setInterval(flush, config.flushIntervalMs);
  timer.unref();

  return {
    push(rows) {
      for (const row of rows) {
        if (queue.length >= config.maxQueueSize) {
          dropped++;
          continue;
        }
        queue.push(row);
      }
      if (queue.length >= config.flushBatchSize) setImmediate(flush);
    },
    flush,
    stats: () => ({ queued: queue.length, dropped }),
    close() {
      clearInterval(timer);
      flush();
    },
  };
}

/** API key 검증 자리. INGEST_API_KEY가 비어 있으면 통과. */
function apiKeyGuard(config) {
  return (req, res, next) => {
    if (!config.ingestApiKey) return next();
    if (req.get('X-Api-Key') === config.ingestApiKey) return next();
    res.status(401).json({ error: 'invalid api key' });
  };
}

function ingestRouter(queue, config) {
  const router = express.Router();
  router.post(
    '/ingest',
    apiKeyGuard(config),
    express.json({ limit: config.ingestMaxPayload }),
    (req, res) => {
      const events = Array.isArray(req.body) ? req.body : [req.body];
      const now = Date.now();
      const rows = [];
      for (const e of events) {
        const row = toRow(e, now);
        if (row) rows.push(row);
      }
      queue.push(rows);
      res.status(202).json({ accepted: rows.length, rejected: events.length - rows.length });
    },
  );
  return router;
}

module.exports = { createIngestQueue, ingestRouter };
