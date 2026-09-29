# 명세: 테마 전환 · 개발 포트 고정 · API 연결 안내

- 작성일: 2026-09-29
- 상태: 구현됨

## 목표

세 가지 불편을 해결한다.

1. **테마를 고를 수 없다**: 화면이 OS 설정(`prefers-color-scheme`)만 따라간다. macOS를 "자동"으로 두면 저녁에 갑자기 다크로 바뀌고, 사용자가 고정할 방법이 없다.
2. **개발 포트가 겹친다**: 다른 프로젝트의 Vite가 5173을 쓰고 있으면 `npm run dev`가 조용히 5174로 뜬다. 습관대로 `localhost:5173`을 열면 다른 프로젝트 화면이 나온다.
3. **개발 모드 버튼이 조용히 사라진다**: 개발 중 API 서버(Node, :8081)가 꺼져 있거나 `npm start`(운영 모드)로 떠 있으면 Mock 버튼이 아무 설명 없이 안 보인다.

## 범위 밖

- 테마를 서버나 URL에 저장하는 것. 브라우저 `localStorage`만 쓴다.
- 운영 빌드(Node 서버 `/`, 스타터 `/_api-monitor/`)에서 API 오류를 안내하는 것. 이번 안내는 Vite 개발 서버에서만 나온다.
- Storybook에 테마 전환 도구막대를 추가하는 것. Storybook은 OS 설정을 따른다.

## 수용 기준

**테마** (`utils/theme`, `hooks/shared/useTheme`, `TopBar`)
- [x] T1: 저장값이 없거나 알 수 없는 값이면 선택은 "자동"(`system`)이다.
- [x] T2: "자동"이면 OS가 다크일 때 `dark`, 아니면 `light`로 적용한다. "라이트"와 "다크"는 OS와 관계없이 그대로 적용한다.
- [x] T3: 적용된 테마는 `<html data-theme="light|dark">`로 표시되고, 다크 색상은 `data-theme="dark"`일 때만 쓰인다.
- [x] T4: 선택을 바꾸면 `localStorage`의 `api-monitor.theme`에 저장되고, 새로고침해도 유지된다.
- [x] T5: "자동" 상태에서 OS 설정이 바뀌면 화면도 바로 바뀐다.
- [x] T6: `localStorage`를 쓸 수 없는 환경(차단, 시크릿 모드 등)에서도 오류 없이 "자동"으로 동작한다.
- [x] T7: 상단 바에 "화면 테마" 버튼 묶음(자동 / 라이트 / 다크)이 있고, 현재 선택이 눌린 상태(`aria-pressed`)로 보인다. 누르면 선택이 바뀐다.
- [x] T8: 첫 화면이 그려지기 전에(`index.html`) 저장된 테마를 적용해서, 다크 선택 시 흰 화면이 번쩍이지 않는다.

**개발 포트** (`vite.config.ts`)
- [x] P1: `npm run dev`는 5180 포트로 뜬다. 5180이 이미 쓰이고 있으면 다른 포트로 가지 않고 오류로 멈춘다.

**API 연결 안내** (`utils/devServer`, `queries/Health`, `DevServerNotice`)
- [x] A1: Vite 개발 서버에서 `api/health` 요청이 실패하면 "API 서버에 연결할 수 없다"는 경고와 실행할 명령(`cd server && npm run dev`)을 보여준다.
- [x] A2: Vite 개발 서버에서 `api/health`는 성공했지만 `dev`가 아니면(운영 모드) "Mock 기능이 꺼져 있다"는 안내와 실행할 명령을 보여준다.
- [x] A3: `api/health`가 `dev: true`면 안내가 없다.
- [x] A4: 확인 중(응답 전)에는 안내가 없다.
- [x] A5: 운영 빌드에서는 어떤 경우에도 안내가 없다.
- [x] A6: 개발 서버에서 안내가 떠 있는 동안 5초마다 다시 확인해서, API 서버를 켜면 안내가 저절로 사라지고 Mock 버튼이 나타난다.

## 영향 범위

- 만질 파일
  - 테마: `src/design-system/tokens.css`(다크 적용 조건), `index.html`(첫 화면 테마), `.storybook/preview.tsx`(OS 설정 반영), `src/utils/theme/`, `src/hooks/shared/useTheme.ts`, `src/components/Logs/TopBar/`
  - 안내: `src/utils/devServer/`, `src/queries/Health/`, `src/components/Logs/DevServerNotice/`, `src/components/layouts/DashboardLayout/`(notice 슬롯), `src/hooks/dashboard/useDashboard.ts`, `src/pages/DashboardPage.tsx`
  - 포트: `vite.config.ts`, 문서의 5173 → 5180
- 새 의존성: 없음
- 기존 기능 영향
  - 다크 색상 적용 조건이 CSS 미디어 쿼리에서 `data-theme` 속성으로 바뀐다. JS가 늘 속성을 넣어 주므로 "자동"일 때의 결과는 이전과 같다.
  - 운영 빌드 동작은 테마 버튼이 생기는 것 말고는 같다.

## 열린 질문

없음
