# 대시보드 API와 배포 제약

이 화면(`dashboard-ui/dist`)을 서빙하는 두 곳과 그 API 형식입니다. React 이전 작업 때의 `MIGRATION.md`에서 계속 필요한 부분만 옮겼습니다.

## 이 화면이 쓰이는 곳 (중요한 제약)

같은 빌드 결과물(`dist/`)이 두 곳에서 서빙됩니다.

1. **Node 대시보드 서버** (`server/`): `http://<서버>:8090/`
2. **Spring Boot 스타터 내장 대시보드** (`starter/`): `http://<앱>:<포트>/_api-monitor/`. `dist/`가 jar 안에 들어갑니다.

그래서 아래를 반드시 지킵니다.

- **API 호출은 상대경로**: `fetch('api/logs')`처럼 앞에 `/`를 붙이지 않습니다. `/api/...`로 쓰면 `/_api-monitor/` 아래에서 깨집니다.
- **빌드 base는 상대경로**: `vite.config.ts`의 `base: './'`를 유지합니다.
- **라우터**: 필요하면 URL 해시 방식만 씁니다. 스타터는 `index.html`, `favicon.svg`, `assets/*`(하위 폴더 없이)만 서빙하고, 다른 경로를 `index.html`로 돌려주지 않습니다.
- **가볍게 유지**: jar에 들어가므로 MUI 같은 무거운 UI 라이브러리는 쓰지 않습니다. 데이터 로딩에 TanStack Query 정도는 괜찮고, axios 대신 `fetch`를 권장합니다.
- **스타일**: 기존 `app.css`의 CSS 변수(색상 토큰, 다크 모드 포함)를 그대로 가져와 씁니다. 새 색을 하드코딩하지 않습니다.
- **Storybook과 스토리 파일**: 앱 코드에서 import하지 않으므로 `dist/`에 포함되지 않습니다. 자유롭게 써도 됩니다.

## 개발 환경

```bash
# 터미널 1: Node 대시보드 서버 (API + Mock 데이터)
cd ../server && npm ci && npm run dev        # http://localhost:8081

# 터미널 2: 이 폴더
npm ci && npm run dev                         # http://localhost:5173 (/api 는 8081로 프록시)
```

`npm run dev`로 띄운 Node 서버는 개발 모드라서, `/api/health`가 `dev: true`를 돌려주고 Mock API가 켜집니다. 화면 상단 **Mock 데이터 추가** 버튼(아래 "개발 모드" 참고)으로 모든 표시 경우를 채울 수 있습니다.

## API (Node 서버와 스타터 내장 대시보드 모두 같은 형식)

### `GET api/logs`: 목록 (최신순)

쿼리 파라미터(전부 선택):

| 이름 | 값 |
|---|---|
| `service` | 서비스명 |
| `kind` | `INBOUND` / `OUTBOUND` |
| `status` | `2xx,4xx,5xx,none` 쉼표 구분 (`none` = 응답 없음) |
| `exception` | `1` = 예외 있는 것만 |
| `q` | 경로·바디·예외 부분 일치, requestId 정확히 일치 |
| `host` | 외부 호출 대상 호스트 |
| `afterId` | 이 id보다 새로운 것만 (5초 폴링용) |
| `beforeId` | 이 id보다 오래된 것 (더 보기) |
| `limit` | 기본 100, 최대 500 |

응답은 `{ items: Row[], limit }`이고, `Row`는 이렇습니다.

```ts
{
  id: number
  kind: 'INBOUND' | 'OUTBOUND'
  request_id: string | null
  parent_request_id: string | null      // OUTBOUND가 어떤 INBOUND 처리 중 나갔는지
  service_name: string
  instance_id: string | null
  method: string
  path: string                           // 쿼리 포함
  target_host: string | null             // OUTBOUND만
  status_code: number | null             // null = 응답 없음(연결 실패·타임아웃) → "ERR" 배지
  duration_ms: number | null
  client_ip: string | null
  async: 0 | 1                           // SSE 등 비동기
  created_at: number                     // epoch ms
  exception_class: string | null
  exception_message: string | null
  exception_handled: 0 | 1 | null
  child_count: number                    // INBOUND 아래 외부 호출 수
  is_mock?: 0 | 1                        // Node 개발 모드 Mock 데이터 (스타터에는 없음)
}
```

### `GET api/logs/:id`: 상세

`Row`에 아래 필드가 더해집니다.

- `request_headers`, `response_headers`: `{ [name]: string }` 객체
- `request_body`, `response_body`: 문자열 (JSON이면 pretty print)
- `request_body_truncated`, `response_body_truncated`: `0 | 1`
- `exception_stacktrace`: 문자열
- `exception_causes`: `{ exceptionClass, message }[]`
- `related`:
  - `children`: `Row[]`, 이 요청 중 나간 외부 호출
  - `parent`: `Row | null`, 외부 호출이면 발생시킨 요청
  - `sameRequestId`: `Row[]`, 같은 requestId를 가진 다른 서비스 요청

없는 id면 404를 돌려줍니다.

### `GET api/services`

```ts
{
  services: { name, total, errors, exceptions, lastSeen }[]
  hosts: { host, total }[]
}
```

- `errors`는 5xx와 응답 없음을 합친 수입니다.

### `GET api/health`

```ts
{ status: 'ok', service: 'api-monitor', dev?: boolean, ... }
```

- `dev === true`일 때만 개발 모드 UI를 보여줍니다. 스타터 내장 대시보드는 `dev`를 보내지 않습니다.

### 개발 모드 전용 (Node 서버 `npm run dev`에서만 존재)

- `POST api/dev/mock` → `{ inserted }`: Mock 19건 추가
- `DELETE api/dev/mock` → `{ deleted }`: Mock만 삭제
