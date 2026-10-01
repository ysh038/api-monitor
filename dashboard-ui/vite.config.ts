/// <reference types="vitest/config" />
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { storybookTest } from '@storybook/addon-vitest/vitest-plugin'
import { playwright } from '@vitest/browser-playwright'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    // 스타터 내장 대시보드(/_api-monitor/)와 Node 서버(/) 어디서 열려도 동작하도록 상대경로로 빌드
    base: './',
    build: {
        outDir: 'dist',
    },
    server: {
        // 다른 프로젝트의 Vite(기본 5173)와 겹치지 않게 고정. 이미 쓰이면 다른 포트로 가지 않고 멈춘다 (P1)
        port: 5180,
        strictPort: true,
        // 개발 중 API는 Node 대시보드 서버(npm run dev, :8081)로 보낸다
        proxy: {
            '/api': 'http://localhost:8081',
        },
    },
    test: {
        projects: [
            {
                // 순수 함수·훅 단위 테스트 (src/**/*.test.ts)
                extends: true,
                test: {
                    name: 'unit',
                    environment: 'node',
                    include: ['src/**/*.test.{ts,tsx}'],
                },
            },
            {
                // 스토리 play 함수 + a11y 검사 (브라우저)
                extends: true,
                plugins: [
                    storybookTest({
                        configDir: path.join(dirname, '.storybook'),
                    }),
                ],
                test: {
                    name: 'storybook',
                    browser: {
                        enabled: true,
                        headless: true,
                        provider: playwright({}),
                        // 데스크톱 폭에서 검증한다 (기본 414px 면 760px 이하 전용 레이아웃이 걸린다)
                        viewport: { width: 1280, height: 800 },
                        instances: [{ browser: 'chromium' }],
                    },
                },
            },
        ],
    },
})
