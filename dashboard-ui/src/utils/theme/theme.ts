/**
 * 화면 테마. 선택(preference)은 자동/라이트/다크 셋이고, 실제 적용(resolved)은 라이트/다크 둘이다.
 * 적용 결과는 <html data-theme> 로 표시하고, 다크 색상은 tokens.css 의 [data-theme='dark'] 에서 바뀐다.
 * index.html 의 첫 화면 스크립트도 같은 키·규칙을 쓴다 (바꾸면 같이 바꾼다).
 */
export type TThemePreference = 'system' | 'light' | 'dark'
export type TResolvedTheme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'api-monitor.theme'
export const SYSTEM_DARK_QUERY = '(prefers-color-scheme: dark)'

export const THEME_OPTIONS: { value: TThemePreference; label: string }[] = [
    { value: 'system', label: '자동' },
    { value: 'light', label: '라이트' },
    { value: 'dark', label: '다크' },
]

/** 브라우저 localStorage 중 여기서 쓰는 부분 (테스트에서 바꿔 끼운다) */
export interface IThemeStorage {
    getItem: (key: string) => string | null
    setItem: (key: string, value: string) => void
}

export function parseThemePreference(value: unknown): TThemePreference {
    return value === 'light' || value === 'dark' || value === 'system' ? value : 'system'
}

export function resolveTheme(preference: TThemePreference, isSystemDark: boolean): TResolvedTheme {
    if (preference === 'system') return isSystemDark ? 'dark' : 'light'
    return preference
}

/** 저장소를 못 쓰면(차단·시크릿 모드) 자동으로 본다 */
export function readStoredThemePreference(storage: IThemeStorage | null): TThemePreference {
    try {
        return parseThemePreference(storage?.getItem(THEME_STORAGE_KEY))
    } catch {
        return 'system'
    }
}

/** 저장에 실패해도 화면 전환은 계속한다 (이번 방문 동안만 유지) */
export function writeStoredThemePreference(storage: IThemeStorage | null, preference: TThemePreference): void {
    try {
        storage?.setItem(THEME_STORAGE_KEY, preference)
    } catch {
        // 저장 불가 환경 — 무시
    }
}
