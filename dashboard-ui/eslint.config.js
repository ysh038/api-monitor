import js from '@eslint/js'
import { defineConfig, globalIgnores } from 'eslint/config'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import storybook from 'eslint-plugin-storybook'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default defineConfig([
    // create-harness: 하네스 생성 파일은 호스트 lint 대상이 아니다
    globalIgnores(['dist', 'storybook-static', '.harness/**']),
    {
        files: ['**/*.{ts,tsx}'],
        extends: [
            js.configs.recommended,
            tseslint.configs.recommended,
            reactHooks.configs.flat['recommended-latest'],
            reactRefresh.configs.vite,
        ],
        languageOptions: {
            ecmaVersion: 2022,
            globals: globals.browser,
        },
        rules: {
            // any 금지 (00-core)
            '@typescript-eslint/no-explicit-any': 'error',
        },
    },
    {
        // 스토리는 meta 를 default export 하고 스토리를 named export 한다 — HMR 경계 규칙 대상 아님
        files: ['**/*.stories.{ts,tsx}'],
        rules: {
            'react-refresh/only-export-components': 'off',
        },
    },
    ...storybook.configs['flat/recommended'],
])
