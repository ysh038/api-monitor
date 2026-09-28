# syntax=docker/dockerfile:1
# 1단계: production 의존성만 설치 (better-sqlite3 native 모듈 포함)
FROM node:22-alpine AS deps
WORKDIR /app
# prebuilt 바이너리가 없을 때를 대비한 빌드 도구 (최종 이미지에는 포함되지 않음)
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

# 2단계: 실행 이미지 (빌드 도구 없이 node_modules + 앱 코드만)
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production \
    PORT=8081 \
    DB_PATH=/data/monitor.db \
    RETENTION_DAYS=30
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src
COPY public ./public
RUN mkdir -p /data && chown node:node /data
USER node
VOLUME ["/data"]
EXPOSE 8081
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:${PORT}/api/health >/dev/null || exit 1
CMD ["node", "src/index.js"]
