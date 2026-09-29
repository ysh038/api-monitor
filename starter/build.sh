#!/bin/sh
# JDK·Node 가 없어도 Docker 로 스타터 jar 를 빌드한다.
# 결과: build/libs/api-monitor-spring-boot-starter-<버전>.jar (대시보드 화면 포함)
set -e
cd "$(dirname "$0")"
ROOT="$(cd .. && pwd)"
if command -v java >/dev/null 2>&1 && command -v npm >/dev/null 2>&1; then
  ./gradlew --no-daemon build
else
  # 1) 대시보드 화면 빌드 (Node 이미지)
  docker run --rm -v "$ROOT/dashboard-ui":/ui -w /ui node:22-alpine sh -c 'npm ci --no-audit --no-fund && npm run build'
  # 2) 스타터 빌드 (JDK 이미지, 위에서 만든 dist 사용)
  docker run --rm -v "$ROOT":/w -v apimon-gradle:/root/.gradle -w /w/starter eclipse-temurin:21-jdk \
    ./gradlew --no-daemon build -PskipDashboardBuild
fi
ls -l build/libs/
