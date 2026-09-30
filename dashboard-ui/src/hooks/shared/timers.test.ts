// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useDebouncedValue, useFlashMessage } from './index'

beforeEach(() => {
    vi.useFakeTimers()
})

afterEach(() => {
    vi.useRealTimers()
})

describe('useDebouncedValue (E3)', () => {
    it('300ms 동안 입력이 멈춰야 한 번 반영된다', () => {
        const { result, rerender } = renderHook(
            ({ value }) => useDebouncedValue(value, 300),
            { initialProps: { value: '' } },
        )
        rerender({ value: 'a' })
        act(() => vi.advanceTimersByTime(200))
        rerender({ value: 'ab' })
        act(() => vi.advanceTimersByTime(200))
        expect(result.current).toBe('')
        act(() => vi.advanceTimersByTime(100))
        expect(result.current).toBe('ab')
    })
})

describe('useFlashMessage (G3)', () => {
    it('메시지는 2.5초 뒤 사라진다', () => {
        const { result } = renderHook(() => useFlashMessage(2500))
        act(() => result.current[1]('Mock 19건 추가'))
        expect(result.current[0]).toBe('Mock 19건 추가')
        act(() => vi.advanceTimersByTime(2499))
        expect(result.current[0]).toBe('Mock 19건 추가')
        act(() => vi.advanceTimersByTime(1))
        expect(result.current[0]).toBeNull()
    })

    it('새 메시지는 타이머를 다시 시작한다', () => {
        const { result } = renderHook(() => useFlashMessage(2500))
        act(() => result.current[1]('first'))
        act(() => vi.advanceTimersByTime(2000))
        act(() => result.current[1]('second'))
        act(() => vi.advanceTimersByTime(2000))
        expect(result.current[0]).toBe('second')
        act(() => vi.advanceTimersByTime(500))
        expect(result.current[0]).toBeNull()
    })
})
