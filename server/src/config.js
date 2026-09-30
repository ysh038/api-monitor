const fs = require('node:fs');
const path = require('node:path');

// 우선순위: 환경변수 > config.json > 기본값
function loadFileConfig() {
  const file = process.env.CONFIG_FILE || path.join(__dirname, '..', 'config.json');
  if (!fs.existsSync(file)) return {};
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

const file = loadFileConfig();

function pick(envName, fileKey, fallback) {
  if (process.env[envName] !== undefined && process.env[envName] !== '') return process.env[envName];
  if (file[fileKey] !== undefined) return file[fileKey];
  return fallback;
}

// 대시보드 화면 폴더: STATIC_DIR > 저장소의 dashboard-ui/dist (로컬 개발) > server/public (도커 이미지 안)
function resolveStaticDir() {
  if (process.env.STATIC_DIR) return path.resolve(process.env.STATIC_DIR);
  const repoDist = path.join(__dirname, '..', '..', 'dashboard-ui', 'dist');
  if (fs.existsSync(path.join(repoDist, 'index.html'))) return repoDist;
  return path.join(__dirname, '..', 'public');
}

module.exports = {
  staticDir: resolveStaticDir(),
  // npm run dev (--dev) 로 띄웠을 때만 true: 화면에 DEV 표시와 Mock 데이터 기능이 켜진다
  dev: process.argv.includes('--dev') || process.env.API_MONITOR_DEV === '1',
  port: Number(pick('PORT', 'port', 8081)),
  dbPath: pick('DB_PATH', 'dbPath', path.join(__dirname, '..', 'data', 'monitor.db')),
  retentionDays: Number(pick('RETENTION_DAYS', 'retentionDays', 30)),
  // 비어 있으면 인증 없이 수신. 값을 넣으면 X-Api-Key 헤더가 일치해야 수신한다.
  ingestApiKey: pick('INGEST_API_KEY', 'ingestApiKey', ''),
  ingestMaxPayload: pick('INGEST_MAX_PAYLOAD', 'ingestMaxPayload', '5mb'),
  flushIntervalMs: Number(pick('FLUSH_INTERVAL_MS', 'flushIntervalMs', 200)),
  flushBatchSize: Number(pick('FLUSH_BATCH_SIZE', 'flushBatchSize', 200)),
  maxQueueSize: Number(pick('MAX_QUEUE_SIZE', 'maxQueueSize', 20000)),
};
