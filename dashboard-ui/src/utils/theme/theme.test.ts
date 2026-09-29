import { describe, expect, it } from 'vitest'

import {
    parseThemePreference,
    readStoredThemePreference,
    resolveTheme,
    THEME_OPTIONS,
    THEME_STORAGE_KEY,
    writeStoredThemePreference,
} from './theme'

function makeStorage(initial: Record<string, string> = {}) {
    const data = new Map(Object.entries(initial))
    return {
        getItem: (key: string) => data.get(key) ?? null,
        setItem: (key: string, value: string) => {
            data.set(key, value)
        },
        data,
    }
}

const BROKEN_STORAGE = {
    getItem: () => {
        throw new Error('SecurityError')
    },
    setItem: () => {
        throw new Error('QuotaExceededError')
    },
}

describe('테마 선택값 해석 (T1)', () => {
    it.each([
        ['light', 'light'],
        ['dark', 'dark'],
        ['system', 'system'],
    ])('%s 는 그대로 쓴다', (value, expected) => {
        expect(parseThemePreference(value)).toBe(expected)
    })

    it.each([[null], [undefined], [''], ['Dark'], ['blue'], [1]])('%s 는 자동(system)이다', (value) => {
        expect(parseThemePreference(value)).toBe('system')
    })
})

describe('적용 테마 결정 (T2)', () => {
    it('자동이면 OS 다크 여부를 따른다', () => {
        expect(resolveTheme('system', true)).toBe('dark')
        expect(resolveTheme('system', false)).toBe('light')
    })

    it('라이트·다크는 OS 와 관계없이 그대로다', () => {
        expect(resolveTheme('light', true)).toBe('light')
        expect(resolveTheme('dark', false)).toBe('dark')
    })
})

describe('저장 (T4, T6)', () => {
    it('api-monitor.theme 키에 저장하고 다시 읽는다', () => {
        const storage = makeStorage()
        writeStoredThemePreference(storage, 'dark')
        expect(storage.data.get(THEME_STORAGE_KEY)).toBe('dark')
        expect(THEME_STORAGE_KEY).toBe('api-monitor.theme')
        expect(readStoredThemePreference(storage)).toBe('dark')
    })

    it('저장값이 이상하면 자동이다', () => {
        expect(readStoredThemePreference(makeStorage({ [THEME_STORAGE_KEY]: 'purple' }))).toBe('system')
    })

    it('저장소를 쓸 수 없어도 오류 없이 자동이다', () => {
        expect(readStoredThemePreference(BROKEN_STORAGE)).toBe('system')
        expect(() => writeStoredThemePreference(BROKEN_STORAGE, 'dark')).not.toThrow()
        expect(readStoredThemePreference(null)).toBe('system')
    })
})

describe('버튼 묶음 선택지 (T7)', () => {
    it('자동 / 라이트 / 다크 순서다', () => {
        expect(THEME_OPTIONS).toEqual([
            { value: 'system', label: '자동' },
            { value: 'light', label: '라이트' },
            { value: 'dark', label: '다크' },
        ])
    })
})
