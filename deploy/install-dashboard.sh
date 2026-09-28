#!/bin/sh
# API 모니터 대시보드 설치/업데이트. 같은 폴더의 api-monitor-server-*.tar.gz 를 로드하고 실행한다.
# 다시 실행해도 된다 (기존 컨테이너는 교체, 쌓인 로그는 유지).
# 사용: ./install-dashboard.sh [포트, 기본 8090]
set -e
PORT="${1:-8090}"
IMAGE=api-monitor-server:1.0.0
cd "$(dirname "$0")"

TAR=$(ls api-monitor-server-*.tar.gz 2>/dev/null | head -1)
if [ -n "$TAR" ]; then
  echo "[1/3] 이미지 로드: $TAR"
  docker load -i "$TAR" >/dev/null
else
  echo "[1/3] tar 파일 없음 → 이미 로드된 $IMAGE 사용"
fi

echo "[2/3] 대시보드 실행 (포트 $PORT)"
docker rm -f api-monitor >/dev/null 2>&1 || true
docker run -d --name api-monitor --restart unless-stopped \
  -p "$PORT:8081" \
  -v api-monitor-data:/data \
  "$IMAGE" >/dev/null

echo "[3/3] 확인"
i=0
until curl -sf "http://localhost:$PORT/api/health" >/dev/null 2>&1 || wget -qO- "http://localhost:$PORT/api/health" >/dev/null 2>&1; do
  i=$((i+1)); [ $i -ge 20 ] && { echo "대시보드가 응답하지 않습니다: docker logs api-monitor"; exit 1; }
  sleep 1
done
IP=$(hostname -I 2>/dev/null | awk '{print $1}')
echo "완료: http://${IP:-<서버IP>}:$PORT"
if [ "$PORT" != "8090" ]; then
  echo "※ 포트를 바꿨으므로 앱 .env에 API_MONITOR_DISCOVERY_PORT=$PORT 를 추가해야 자동 연결됩니다."
fi
