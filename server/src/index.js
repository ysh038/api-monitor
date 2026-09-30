const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const config = require('./config');
const { openDatabase } = require('./db');
const { createIngestQueue, ingestRouter } = require('./ingest');
const { queryRouter } = require('./query');
const { devRouter } = require('./dev');

const db = openDatabase(config.dbPath);
const queue = createIngestQueue(db, config);

// 보관 정책: retentionDays보다 오래된 로그를 1시간마다 삭제한다.
const purgeStmt = db.prepare('DELETE FROM api_logs WHERE created_at < ?');
function purgeOldLogs() {
  const cutoff = Date.now() - config.retentionDays * 24 * 60 * 60 * 1000;
  const { changes } = purgeStmt.run(cutoff);
  if (changes > 0) {
    console.log(`[retention] ${config.retentionDays}일 지난 로그 ${changes}건 삭제`);
    db.pragma('wal_checkpoint(TRUNCATE)');
  }
}
purgeOldLogs();
setInterval(purgeOldLogs, 60 * 60 * 1000).unref();

const app = express();
app.disable('x-powered-by');
app.use(ingestRouter(queue, config));
app.use(queryRouter(db, queue, config));
if (config.dev) app.use(devRouter(db)); // npm run dev 일 때만 Mock 데이터 API
app.use(express.static(config.staticDir));
// 화면이 빌드되지 않은 상태로 띄웠을 때 안내 (API 는 그대로 동작)
if (!fs.existsSync(path.join(config.staticDir, 'index.html'))) {
  app.get('/', (req, res) =>
    res.status(503).type('text').send(`대시보드 화면이 없습니다: ${config.staticDir}\ndashboard-ui 에서 npm run build 를 실행하세요.`),
  );
}

const server = app.listen(config.port, () => {
  console.log(`[api-monitor] http://0.0.0.0:${config.port}  (db: ${config.dbPath}, retention: ${config.retentionDays}d, ui: ${config.staticDir})${config.dev ? '  [DEV 모드: Mock 데이터 기능 켜짐]' : ''}`);
});

function shutdown() {
  server.close();
  queue.close();
  db.close();
  process.exit(0);
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
