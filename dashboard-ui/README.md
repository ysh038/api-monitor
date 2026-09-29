# dashboard-ui

API Monitor 대시보드 화면 (React 19 + Vite + TypeScript). 빌드 결과(`dist/`)를 Node 대시보드 서버(`../server`)와 Spring Boot 스타터(`../starter`, `/_api-monitor`)가 서빙합니다.

```bash
npm ci
npm run dev      # http://localhost:5173 (/api 는 Node 서버 :8081 로 프록시, ../server 에서 npm run dev 먼저 실행)
npm run build    # dist/
npm run lint
```

API 형식과 배포 제약은 [docs/api.md](docs/api.md)를 참고하세요.
