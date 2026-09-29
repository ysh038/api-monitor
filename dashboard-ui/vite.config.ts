import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // 스타터 내장 대시보드(/_api-monitor/)와 Node 서버(/) 어디서 열려도 동작하도록 상대경로로 빌드
  base: './',
  build: {
    outDir: 'dist',
  },
  server: {
    // 개발 중 API는 Node 대시보드 서버(npm run dev, :8081)로 보낸다
    proxy: {
      '/api': 'http://localhost:8081',
    },
  },
})
