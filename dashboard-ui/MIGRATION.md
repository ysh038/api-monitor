# 대시보드 React 이전 작업 안내

`server/public/`의 바닐라 JS 대시보드(`index.html`, `app.js`, `app.css`)를 이 폴더(React 19 + Vite + TypeScript)로 **기능 그대로** 옮기는 작업입니다. 이전이 끝나면 이 문서는 지웁니다.

- 브랜치: `feat/react-migration`
- 이 폴더 밖(`server/`, `starter/`)은 수정하지 않습니다. 빌드 결과(`dist/`)를 Node 서버와 스타터가 서빙하도록 연결하는 작업은 저장소 루트 세션에서 따로 합니다.

## 이 화면이 쓰이는 곳 (중요한 제약)

같은 빌드 결과물(`dist/`)이 두 곳에서 서빙됩니다.

1. **Node 대시보드 서버** (`server/`): `http://<서버>:8090/`
2. **Spring Boot 스타터 내장 대시보드** (`starter/`): `http://<앱>:<포트>/_api-monitor/`. `dist/`가 jar 안에 들어갑니다.

그래서 아래를 반드시 지킵니다.

- **API 호출은 상대경로**: `fetch('api/logs')`처럼 앞에 `/`를 붙이지 않습니다. `/api/...`로 쓰면 `/_api-monitor/` 아래에서 깨집니다.
- **빌드 base는 상대경로**: `vite.config.ts`의 `base: './'`를 유지합니다.
- **라우터**: 필요하면 URL 해시 방식만 씁니다. 스타터는 `index.html`과 `assets/*`만 서빙하고, 다른 경로를 `index.html`로 돌려주지 않습니다.
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

## 옮겨야 할 기능 (완료 기준)

기존 화면(`server/public/`)을 옆에 띄워 놓고 하나씩 비교합니다.

**레이아웃**
- 상단 바: 로고, 마지막 갱신 시각, "자동 갱신 5초" 토글(끄면 로고 점 색이 바뀜)
- 좌측 사이드바
  - 서비스 목록: "전체" 포함, 요청 수와 에러 수(에러는 빨간색), 클릭하면 필터
  - 외부 호출 대상 목록: 클릭하면 호스트 필터와 "외부 호출" 탭 선택
- 사이드바 필터가 걸리면 상단에 안내 줄과 "해제" 버튼

**필터**
- 전체 / 들어온 요청 / 외부 호출 세그먼트
- 상태 칩: 2xx, 4xx, 5xx, 응답 없음 (다중 선택)
- "예외만" 토글
- 검색창: 300ms 디바운스

**목록 표**
- 컬럼: 상태 배지(2xx 초록, 3xx 파랑, 4xx 주황, 5xx 빨강, null은 "ERR" 테두리), 서비스, 메서드, 경로, 소요, 시각, 예외 태그
- 외부 호출은 `→ host/path` 형태로 표시하고, 부모가 없으면 "백그라운드" 태그
- 들어온 요청에 외부 호출이 있으면 "외부 호출 N" 태그
- 소요 3초 이상이면 강조
- 시각은 `HH:mm:ss.SSS`, 오늘이 아니면 `MM-DD` 추가
- 예외 태그: 4xx로 처리된 예외는 주황, 5xx·응답 없음은 빨강. 좁은 화면(1180px 이하)에서는 "예외"로 축약
- 5초마다 `afterId`로 새 항목만 받아 맨 위에 추가하고 잠깐 강조. 탭이 숨겨져 있으면 폴링을 멈춤
- 사이드바는 10초마다 갱신
- "더 보기"(`beforeId`)
- 빈 상태 문구: 필터가 있을 때와 없을 때 다름

**상세 (오른쪽 패널, 배경 클릭·ESC로 닫기)**
- 제목: 배지, 메서드, (외부 호출이면 host), 경로
- 메타 정보: 서비스@인스턴스, 구분(들어온 요청 / 비동기 / 외부 호출 / 백그라운드), 시각, 소요, requestId(복사 버튼), 클라이언트 IP 또는 부모 requestId
- 결과 박스
  - 예외: 클래스, 메시지, cause 체인, 스택트레이스(12줄 축약 → "전체 보기"). 앱 코드 줄(프레임워크 패키지가 아닌 줄)은 강조
  - 예외 없는 5xx, 4xx, 응답 없음: 각각 다른 문구
  - 정상: "✓ 정상 처리"
- 연관 목록: 부모, 외부 호출(children), 같은 requestId. 클릭하면 그 상세로 이동
- 요청/응답 탭: 헤더 표와 바디(JSON pretty print, 잘렸으면 안내)

**개발 모드** (`api/health`의 `dev === true`일 때만)
- `DEV 모드` 배지, 탭 제목 `API Monitor (DEV)`
- **Mock 데이터 추가**와 **Mock 삭제** 버튼, 결과 메시지 2.5초 표시
- `is_mock` 행에는 `MOCK` 태그(목록, 상세 제목, 연관 목록)
- 상세 상단에 "Mock 데이터입니다" 안내

**공통**
- 다크 모드(`prefers-color-scheme`)
- 760px 이하에서 사이드바 숨김
- 모든 텍스트는 이스케이프(React 기본 동작)

## 확인 방법

1. Node 서버를 `npm run dev`로 띄우고 **Mock 데이터 추가**를 누릅니다.
2. 기존 화면(`http://localhost:8081`)과 새 화면(`http://localhost:5173`)을 나란히 비교합니다.
3. `npm run lint`와 `npm run build`가 통과해야 합니다.
4. `dist/index.html`의 스크립트와 CSS 경로가 `./assets/...`인지 확인합니다.
