"""검증용 가짜 AI 서버 (Python 표준 라이브러리만 사용). 모니터링 관련 코드는 없다."""
import json
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, fmt, *args):
        print(f"[ai-server] X-Request-Id={self.headers.get('X-Request-Id')} {self.command} {self.path}", flush=True)

    def _json(self, status, obj):
        body = json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _read_body(self):
        length = int(self.headers.get("Content-Length") or 0)
        return self.rfile.read(length) if length else b""

    def do_GET(self):
        if self.path.startswith("/risk"):
            return self._json(200, {"month": "2026-08", "items": [{"agentId": "A-100", "score": 0.82}, {"agentId": "A-203", "score": 0.41}]})
        if self.path.startswith("/slow"):
            time.sleep(3)
            return self._json(200, {"late": True})
        self._json(404, {"detail": "not found"})

    def do_POST(self):
        self._read_body()
        if self.path.startswith("/fail"):
            return self._json(500, {"detail": "model not loaded: risk-model-v3"})
        if self.path.startswith("/query"):
            self.send_response(200)
            self.send_header("Content-Type", "text/event-stream")
            self.send_header("Transfer-Encoding", "chunked")
            self.end_headers()
            for token in ["이번 달", " 위험 기관은", " A-100 입니다."]:
                chunk = f"event: token\ndata: {json.dumps({'text': token}, ensure_ascii=False)}\n\n".encode()
                self.wfile.write(f"{len(chunk):x}\r\n".encode() + chunk + b"\r\n")
                self.wfile.flush()
                time.sleep(0.4)
            self.wfile.write(b"0\r\n\r\n")
            return
        self._json(404, {"detail": "not found"})


if __name__ == "__main__":
    ThreadingHTTPServer(("0.0.0.0", 8000), Handler).serve_forever()
