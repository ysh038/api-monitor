# 결정 기록 — dashboard-ui

> 기술적 결정을 내릴 때마다 **근거와 함께** 기록한다. 결론만 적으면 몇 주 뒤 같은 논쟁을 반복한다.
> 형식: 최신이 위. 번복된 결정은 지우지 말고 취소선 + 번복 사유.

## 결정

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
