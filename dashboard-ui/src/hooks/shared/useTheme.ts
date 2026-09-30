import { useCallback, useEffect, useState } from 'react'

import {
    readStoredThemePreference,
    resolveTheme,
    SYSTEM_DARK_QUERY,
    writeStoredThemePreference,
} from '../../utils/theme'
import type { IThemeStorage, TThemePreference } from '../../utils/theme'

function getStorage(): IThemeStorage | null {
    try {
        return window.localStorage
    } catch {
        return null
    }
}

function isSystemDark(): boolean {
    return typeof window.matchMedia === 'function' && window.matchMedia(SYSTEM_DARK_QUERY).matches
}

function applyTheme(preference: TThemePreference) {
    document.documentElement.dataset.theme = resolveTheme(preference, isSystemDark())
}

/**
 * 화면 테마 선택. 선택을 저장하고 <html data-theme> 에 적용한다.
 * "자동"이면 OS 설정 변경을 바로 따라간다.
 */
export function useTheme() {
    const [preference, setPreferenceState] = useState<TThemePreference>(() =>
        readStoredThemePreference(getStorage()),
    )

    useEffect(() => {
        applyTheme(preference)
        if (preference !== 'system' || typeof window.matchMedia !== 'function') return undefined
        const media = window.matchMedia(SYSTEM_DARK_QUERY)
        const onChange = () => applyTheme('system')
        media.addEventListener('change', onChange)
        return () => media.removeEventListener('change', onChange)
    }, [preference])

    const setPreference = useCallback((next: TThemePreference) => {
        writeStoredThemePreference(getStorage(), next)
        setPreferenceState(next)
    }, [])

    return { preference, setPreference }
}
