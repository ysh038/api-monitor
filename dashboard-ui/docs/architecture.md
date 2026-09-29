# 아키텍처 — dashboard-ui

> 구조가 바뀔 때마다 갱신한다. 에이전트는 큰 작업 전에 이 문서를 읽는다.

## 시스템 개요

API Monitor 대시보드. 빌드 결과(`dist/`)를 두 곳이 서빙한다 — Node 대시보드 서버(`server/`, `/`)와
Spring Boot 스타터 내장 대시보드(`starter/`, `/_api-monitor/`). 그래서 API·에셋 경로는 전부 상대경로다
(`base: './'`, `fetch('api/logs')`). API 형식은 `MIGRATION.md` 의 "API" 절.

- `GET api/logs` (5초 폴링 `afterId`, 더 보기 `beforeId`), `GET api/logs/:id`, `GET api/services` (10초),
  `GET api/health` (`dev === true` 면 개발 모드), `POST|DELETE api/dev/mock` (개발 모드 전용)

## 레이어

`.cursor/rules/10-architecture` 의 레이어 규칙을 따른다. 이 프로젝트 고유의 예외나 보충이 있으면 여기 적는다.

## 주요 디렉터리

```
src/
├── pages/DashboardPage.tsx      유일한 화면. useDashboard 호출 + 조립
├── hooks/dashboard/             화면 상태 조합 (필터↔해시, 폴링, 개발 모드)
├── hooks/shared/                useDebouncedValue, useFlashMessage
├── queries/{Logs,Services,Health,DevMock}/   TanStack Query 훅 (index.ts 로만 import)
├── api/                         endpoints(상대경로 URL) · http(fetch 래퍼)
├── mappers/logMapper.ts         서버 snake_case → 도메인 타입, 형태 검증
├── types/log.ts                 도메인 타입
├── utils/logs/                  순수 계산: 트리·묶음·요약·진단·막대·흐름·해시 (단위 테스트)
├── components/Logs/             도메인 organism (TopBar, FailureSummary, LogTable, LogDetail …)
├── components/layouts/          template (DashboardLayout, PanelLayout)
├── design-system/{atoms,molecules,organisms}/  도메인 비의존 부품 + 스토리
└── mocks/logFixtures.ts         테스트·스토리 전용 픽스처 (앱 번들 미포함)
```

## 외부 의존성

| 의존성 | 용도 | 도입 이유 |
|--------|------|-----------|
| @tanstack/react-query | 서버 상태 캐시·폴링 병합 | MIGRATION 허용, 가벼움 |
| storybook + @storybook/addon-vitest + a11y (dev) | 부품 스토리·상호작용·접근성 테스트 | 하네스 design-system 모듈 |
| vitest + jsdom + @testing-library/react (dev) | 순수 함수·훅 단위 테스트 | 하네스 테스트 규칙 |
| stylelint + stylelint-declaration-strict-value (dev) | 색 토큰 강제 | 하네스 check |
