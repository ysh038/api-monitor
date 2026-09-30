# syntax=docker/dockerfile:1
# 빌드 기준은 저장소 루트: docker build -f server/Dockerfile -t api-monitor-server:1.0.0 .

# 1단계: 대시보드 화면(dashboard-ui) 빌드 → dist/
FROM node:22-alpine AS ui
WORKDIR /ui
COPY dashboard-ui/package.json dashboard-ui/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY dashboard-ui/ ./
RUN npm run build

# 2단계: 서버 production 의존성만 설치 (better-sqlite3 native 모듈 포함)
FROM node:22-alpine AS deps
WORKDIR /app
# prebuilt 바이너리가 없을 때를 대비한 빌드 도구 (최종 이미지에는 포함되지 않음)
RUN apk add --no-cache python3 make g++
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

# 3단계: 실행 이미지 (빌드 도구 없이 node_modules + 서버 코드 + 화면 빌드 결과만)
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production \
    PORT=8081 \
    DB_PATH=/data/monitor.db \
    RETENTION_DAYS=30 \
    STATIC_DIR=/app/public
COPY --from=deps /app/node_modules ./node_modules
COPY server/package.json ./
COPY server/src ./src
COPY --from=ui /ui/dist ./public
RUN mkdir -p /data && chown node:node /data
USER node
VOLUME ["/data"]
EXPOSE 8081
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:${PORT}/api/health >/dev/null || exit 1
CMD ["node", "src/index.js"]
