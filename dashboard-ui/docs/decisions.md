# 결정 기록 — dashboard-ui

> 기술적 결정을 내릴 때마다 **근거와 함께** 기록한다. 결론만 적으면 몇 주 뒤 같은 논쟁을 반복한다.
> 형식: 최신이 위. 번복된 결정은 지우지 말고 취소선 + 번복 사유.

## 결정

### 2026-09-29 필터를 바꿀 때 화면이 비지 않게 (docs/specs/dashboard-smooth-filter.md)

#### 이전 결과 유지 + 진행 막대, 흐리게 하지 않음
- **결정**: 목록 무한 쿼리에 `placeholderData: keepPreviousData`. 새 결과를 기다리는 동안(`isPlaceholderData`) 표 위에 얇은 진행 막대와 `aria-busy` 를 둔다. "더 보기"는 잠근다.
- **대안**: 행을 반투명(opacity)으로 흐리게.
- **근거**: 필터마다 새 캐시 키(`gcTime: 0`)로 시작해서 표가 0행 → "불러오는 중" → 새 결과로 깜빡였고, 사용자가 페이지 새로고침으로 느꼈다. 흐리게 하면 글자 대비가 2.2:1 까지 떨어져 스토리 a11y 검사(AA 4.5:1)가 실패했다.

### 2026-09-29 테마 전환 · 개발 포트 고정 · API 연결 안내 (docs/specs/dashboard-dev-ux.md)

#### 다크 색상은 `data-theme` 속성으로만 켠다
- **결정**: tokens.css 의 다크 블록 조건을 `@media (prefers-color-scheme: dark)` 에서 `:root[data-theme='dark']` 로 바꿨다. "자동"이면 JS(index.html 첫 화면 스크립트 + `useTheme`)가 OS 설정을 보고 속성을 넣는다.
- **대안**: 미디어 쿼리 블록을 두고 `[data-theme]` 덮어쓰기 블록을 하나 더 두기 / CSS `light-dark()` 로 semantic 토큰 전체 재작성.
- **근거**: 첫 대안은 다크 토큰 35개를 두 벌 유지해야 한다. `light-dark()` 는 토큰 파일 전체를 바꿔야 해서 이번 범위에 비해 크다. 속성 방식은 다크 정의가 한 벌이고, 첫 화면 스크립트 덕분에 번쩍임도 없다. Storybook 은 preview 에서 같은 속성을 OS 설정대로 넣는다.

#### 개발 포트 5180 고정 + strictPort
- **결정**: `server.port: 5180`, `strictPort: true`.
- **근거**: 같은 Mac 에서 다른 프로젝트(hrd-aimon-fe)의 Vite 가 5173 을 쓰고 있어, 이 프로젝트가 조용히 5174 로 뜨고 5173 에서 엉뚱한 화면을 보는 일이 있었다. 포트가 차 있으면 다른 포트로 도망가지 않고 멈추는 쪽이 헷갈리지 않는다.

#### API 연결 안내는 Vite 개발 서버에서만
- **결정**: `import.meta.env.DEV` 일 때만 health 실패(연결 불가)·`dev` 아님(운영 모드)을 안내하고, 안내가 떠 있는 동안 5초마다 health 를 다시 확인한다.
- **근거**: 운영 빌드(Node 서버·스타터 내장)에서는 화면과 API 가 같은 서버라 "Node 서버를 켜라"는 안내가 맞지 않는다. 다시 확인하지 않으면 서버를 켠 뒤에도 새로고침 전까지 안내가 남는다.

### 2026-09-29 대시보드 React 이전 (docs/specs/dashboard-react-migration.md)

#### 사이드바 제거
- **결정**: 참고 이미지처럼 사이드바를 없앴다. 서비스는 필터 줄 선택 상자, 외부 호출 대상은 요약의 호스트 카드로 고른다.
- **대안**: MIGRATION 완료 기준대로 사이드바 유지 + 요약 카드 추가.
- **근거**: 사용자 결정. 요약 카드가 "어느 서버가 실패했나"를 이미 보여 주므로 호스트 목록이 겹친다.

#### 실패 = 5xx + 응답 없음
- **결정**: 요약·막대·묶음에서 "실패"는 5xx 와 status null 만 센다. 4xx 는 경고로 따로 칠한다.
- **근거**: 서버 `api/services` 의 `errors` 와 같은 정의라 숫자가 서로 맞는다. 참고 이미지의 38건 중 10건도 이 정의로 맞아떨어진다.

#### 라이트 모드 글자 색은 app.css 보다 한 단계 진하게
- **결정**: `--color-*-strong`, `--color-primary-strong`, `--color-text-muted` 를 app.css 색보다 진한 primitive 로 두고 글자에만 쓴다. 배경·보더·점·막대는 app.css 색 그대로.
- **근거**: app.css 의 `--accent`·`--ok`·`--warn`·`--muted` 는 옅은 배경 위 글자로 쓰면 WCAG AA(4.5:1)에 못 미쳐 스토리 a11y 검사(`test: 'error'`)가 실패한다. 다크 모드는 원래 색으로 통과해서 그대로 둔다.

#### fetch + TanStack Query, axios 없음
- **결정**: `src/api/http.ts` 의 fetch 래퍼 + TanStack Query. `50-auth-http` 의 axios 규칙은 이 프로젝트에 적용하지 않는다.
- **근거**: MIGRATION.md — jar 에 들어가는 번들이라 가볍게, 인증도 없다.

#### 목록 = 무한 쿼리 + 폴링 페이지 끼워 넣기
- **결정**: 첫 페이지·더 보기는 `useInfiniteQuery`, 5초 폴링 결과는 `setQueryData` 로 맨 앞 페이지로 끼운다. 자동 재요청은 끄고(`staleTime: Infinity`, `gcTime: 0`), Mock 추가·삭제 뒤에는 `resetQueries` 로 첫 페이지만 다시 받는다.
- **근거**: 무한 쿼리를 재요청하면 모든 페이지를 다시 받는데, 끼워 넣은 폴링 페이지 때문에 중복이 생긴다. 기존 화면도 필터를 바꾸면 처음부터 다시 받았다.

#### 필터·선택 상세는 URL 해시
- **결정**: `#/?service=..&kind=..&status=..&exception=1&q=..&id=..`, replaceState 로 갱신.
- **근거**: 필터는 URL 에(20-data-fetching). 스타터는 index.html 만 서빙하므로 경로 대신 해시(MIGRATION.md).

#### 쓰기 게이트가 design-system index.ts 를 컴포넌트로 보지 않게
- **결정**: `.harness/gates/ui-prereq-check.mjs` EXCLUDE_PATTERNS 에 `/\/index\.ts/` 추가 (사용자 승인).
- **근거**: 커밋 게이트(storybook-check.mjs)는 이미 index.ts 를 제외한다. 쓰기 게이트만 index.stories.tsx 를 요구해 공개 API 파일을 만들 수 없었다.


## 논의 중 (아직 결정 아님)

<!-- 확정 안 된 아이디어는 여기. TODO로 바로 승격하지 않는다 -->

- **eslint.harness.config.js 연결**: 하네스 린트 조각(명명 규칙·계층 import·페이지 raw 태그)이 `eslint.config.js` 에 아직 연결되지 않았다. 필요한 `eslint-plugin-import` 가 없고 ESLint 10 호환을 확인해야 한다. 이번 코드는 규칙을 손으로 지켰다.
- **/ds-init 의 Example* 참조 구현**: 만들지 않았다. 실제 부품(Button → CopyField → Drawer, layouts)이 atom→organism 사슬을 이미 보여 준다. 필요하면 추가.
