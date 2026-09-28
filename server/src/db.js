const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');

function openDatabase(dbPath) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('busy_timeout = 5000');

  db.exec(`
    CREATE TABLE IF NOT EXISTS api_logs (
      id                        INTEGER PRIMARY KEY AUTOINCREMENT,
      kind                      TEXT    NOT NULL DEFAULT 'INBOUND',  -- INBOUND | OUTBOUND
      request_id                TEXT,
      parent_request_id         TEXT,
      service_name              TEXT    NOT NULL,
      instance_id               TEXT,
      method                    TEXT,
      path                      TEXT,
      target_host               TEXT,
      request_headers           TEXT,
      request_body              TEXT,
      request_body_truncated    INTEGER NOT NULL DEFAULT 0,
      status_code               INTEGER,
      response_headers          TEXT,
      response_body             TEXT,
      response_body_truncated   INTEGER NOT NULL DEFAULT 0,
      duration_ms               INTEGER,
      client_ip                 TEXT,
      async                     INTEGER NOT NULL DEFAULT 0,
      created_at                INTEGER NOT NULL,
      received_at               INTEGER NOT NULL,
      exception_class           TEXT,
      exception_message         TEXT,
      exception_stacktrace      TEXT,
      exception_cause_class     TEXT,
      exception_cause_message   TEXT,
      exception_causes          TEXT,
      exception_handled         INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_logs_created    ON api_logs(created_at);
    CREATE INDEX IF NOT EXISTS idx_logs_service    ON api_logs(service_name, status_code, exception_class);
    CREATE INDEX IF NOT EXISTS idx_logs_request_id ON api_logs(request_id);
    CREATE INDEX IF NOT EXISTS idx_logs_parent     ON api_logs(parent_request_id);
  `);
  return db;
}

const INSERT_SQL = `
  INSERT INTO api_logs (
    kind, request_id, parent_request_id, service_name, instance_id, method, path, target_host,
    request_headers, request_body, request_body_truncated,
    status_code, response_headers, response_body, response_body_truncated,
    duration_ms, client_ip, async, created_at, received_at,
    exception_class, exception_message, exception_stacktrace,
    exception_cause_class, exception_cause_message, exception_causes, exception_handled
  ) VALUES (
    @kind, @request_id, @parent_request_id, @service_name, @instance_id, @method, @path, @target_host,
    @request_headers, @request_body, @request_body_truncated,
    @status_code, @response_headers, @response_body, @response_body_truncated,
    @duration_ms, @client_ip, @async, @created_at, @received_at,
    @exception_class, @exception_message, @exception_stacktrace,
    @exception_cause_class, @exception_cause_message, @exception_causes, @exception_handled
  )`;

const str = (v) => (v === undefined || v === null ? null : String(v));
const int = (v) => (v === undefined || v === null || v === '' || Number.isNaN(Number(v)) ? null : Math.trunc(Number(v)));
const json = (v) => (v === undefined || v === null ? null : typeof v === 'string' ? v : JSON.stringify(v));
const bool = (v) => (v ? 1 : 0);

/** 1-4 포맷(+확장 필드)의 이벤트를 DB 행으로 변환한다. 필수값이 없으면 null. */
function toRow(event, receivedAt) {
  if (!event || typeof event !== 'object' || !event.serviceName) return null;
  const ex = event.exception && typeof event.exception === 'object' ? event.exception : null;
  // cause 체인: causes 배열 우선, 없으면 단일 cause를 따라 내려간다.
  let causes = null;
  if (ex) {
    if (Array.isArray(ex.causes)) causes = ex.causes;
    else {
      causes = [];
      for (let c = ex.cause; c && causes.length < 20; c = c.cause) {
        causes.push({ exceptionClass: c.exceptionClass, message: c.message });
      }
    }
  }
  const firstCause = causes && causes.length ? causes[0] : null;
  return {
    kind: event.kind === 'OUTBOUND' ? 'OUTBOUND' : 'INBOUND',
    request_id: str(event.requestId),
    parent_request_id: str(event.parentRequestId),
    service_name: String(event.serviceName),
    instance_id: str(event.instanceId),
    method: str(event.method),
    path: str(event.path),
    target_host: str(event.targetHost),
    request_headers: json(event.requestHeaders),
    request_body: str(event.requestBody),
    request_body_truncated: bool(event.requestBodyTruncated),
    status_code: int(event.statusCode),
    response_headers: json(event.responseHeaders),
    response_body: str(event.responseBody),
    response_body_truncated: bool(event.responseBodyTruncated),
    duration_ms: int(event.durationMs),
    client_ip: str(event.clientIp),
    async: bool(event.async),
    created_at: int(event.timestamp) ?? receivedAt,
    received_at: receivedAt,
    exception_class: ex ? str(ex.exceptionClass) : null,
    exception_message: ex ? str(ex.message) : null,
    exception_stacktrace: ex ? str(ex.stackTrace) : null,
    exception_cause_class: firstCause ? str(firstCause.exceptionClass) : null,
    exception_cause_message: firstCause ? str(firstCause.message) : null,
    exception_causes: causes && causes.length ? JSON.stringify(causes) : null,
    exception_handled: ex ? (ex.handled === undefined ? null : bool(ex.handled)) : null,
  };
}

module.exports = { openDatabase, INSERT_SQL, toRow };
