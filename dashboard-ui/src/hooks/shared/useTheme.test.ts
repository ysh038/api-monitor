// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { THEME_STORAGE_KEY } from '../../utils/theme'

import { useTheme } from './useTheme'

type TListener = (event: { matches: boolean }) => void

/** jsdom 에는 matchMedia 가 없어서 OS 다크 여부를 흉내 낸다 */
function mockSystemDark(initial: boolean) {
    let matches = initial
    const listeners = new Set<TListener>()
    vi.stubGlobal('matchMedia', (query: string) => ({
        get matches() {
            return matches
        },
        media: query,
        addEventListener: (_: string, listener: TListener) => listeners.add(listener),
        removeEventListener: (_: string, listener: TListener) => listeners.delete(listener),
    }))
    return {
        set(next: boolean) {
            matches = next
            listeners.forEach((listener) => listener({ matches: next }))
        },
    }
}

beforeEach(() => {
    localStorage.clear()
    delete document.documentElement.dataset.theme
})

afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
})

describe('useTheme', () => {
    it('T1·T3: 저장값이 없으면 자동이고, OS 설정대로 data-theme 을 넣는다', () => {
        mockSystemDark(true)
        const { result } = renderHook(() => useTheme())
        expect(result.current.preference).toBe('system')
        expect(document.documentElement.dataset.theme).toBe('dark')
    })

    it('T4: 선택을 바꾸면 저장되고 data-theme 이 바뀐다', () => {
        mockSystemDark(true)
        const { result } = renderHook(() => useTheme())
        act(() => result.current.setPreference('light'))
        expect(result.current.preference).toBe('light')
        expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light')
        expect(document.documentElement.dataset.theme).toBe('light')
    })

    it('T4: 저장된 선택으로 시작한다', () => {
        mockSystemDark(false)
        localStorage.setItem(THEME_STORAGE_KEY, 'dark')
        const { result } = renderHook(() => useTheme())
        expect(result.current.preference).toBe('dark')
        expect(document.documentElement.dataset.theme).toBe('dark')
    })

    it('T5: 자동일 때 OS 설정이 바뀌면 바로 따라간다', () => {
        const system = mockSystemDark(false)
        renderHook(() => useTheme())
        expect(document.documentElement.dataset.theme).toBe('light')
        act(() => system.set(true))
        expect(document.documentElement.dataset.theme).toBe('dark')
    })

    it('T5: 라이트·다크로 고정하면 OS 설정이 바뀌어도 그대로다', () => {
        const system = mockSystemDark(false)
        const { result } = renderHook(() => useTheme())
        act(() => result.current.setPreference('light'))
        act(() => system.set(true))
        expect(document.documentElement.dataset.theme).toBe('light')
    })

    it('T6: 저장소를 쓸 수 없어도 오류 없이 동작한다', () => {
        mockSystemDark(true)
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new Error('SecurityError')
        })
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('SecurityError')
        })
        const { result } = renderHook(() => useTheme())
        expect(result.current.preference).toBe('system')
        act(() => result.current.setPreference('light'))
        expect(document.documentElement.dataset.theme).toBe('light')
    })
})
