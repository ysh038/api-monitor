# 작업 로그 — dashboard-ui

> `/ship` 시 맨 위에 한 줄씩 추가된다. 형식: `- YYYY-MM-DD <해시 7자> <요약>`

- 2026-09-29 fb17373 @eslint/js 10.0.0(사용 중지 버전) → 10.0.1
- 2026-09-29 c766f28 요약 문구: 5xx 없이 4xx만 있으면 "모두 정상" 대신 "K건이 4xx로 거부됐어요"
- 2026-09-29 09365e9 .gitignore `logs` 패턴에 가려져 빠졌던 src/utils/logs·components/Logs·queries/Logs 추가
- 2026-09-29 3e220eb 대시보드 React 이전 + 참고 이미지 진단 기능(요약·호스트 카드·시간대별 막대·호출 트리·묶음·원인 문장·확인 가이드·호출 흐름)
- 2026-09-29 3a9f3fe Storybook·Vitest·stylelint 도구 설정, TanStack Query 추가
- 2026-09-29 2641076 에이전트 하네스 설치 (쓰기 게이트 index.ts 제외 수정 포함)
