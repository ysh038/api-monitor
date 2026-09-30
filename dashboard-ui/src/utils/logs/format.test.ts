import { describe, expect, it } from 'vitest'

import {
    formatDetailTime,
    formatDuration,
    formatTime,
    splitTime,
} from './format'

const at = (h: number, m: number, s: number, ms: number, d = 29) =>
    new Date(2026, 8, d, h, m, s, ms).getTime()

describe('formatTime (B1)', () => {
    const now = at(10, 0, 0, 0)

    it('오늘이면 HH:mm:ss.SSS', () => {
        expect(formatTime(at(9, 8, 46, 227), now)).toBe('09:08:46.227')
    })

    it('오늘이 아니면 MM-DD 를 앞에 붙인다', () => {
        expect(formatTime(at(23, 5, 1, 7, 28), now)).toBe('09-28 23:05:01.007')
    })

    it('isWithMs=false 면 밀리초를 뺀다', () => {
        expect(formatTime(at(9, 8, 46, 227), now, { isWithMs: false })).toBe(
            '09:08:46',
        )
    })

    it('splitTime 은 날짜·시각·밀리초를 나눠 준다', () => {
        expect(splitTime(at(9, 8, 46, 227), now)).toEqual({
            date: null,
            clock: '09:08:46',
            millis: '.227',
        })
        expect(splitTime(at(9, 8, 46, 5, 1), now).date).toBe('09-01')
    })
})

describe('formatDuration (B2)', () => {
    it.each([
        [null, '-'],
        [0, '0ms'],
        [436, '436ms'],
        [999, '999ms'],
        [1000, '1.0초'],
        [3000, '3.0초'],
        [1234, '1.2초'],
        [12_345, '12초'],
    ])('%s → %s', (ms, expected) => {
        expect(formatDuration(ms)).toBe(expected)
    })
})

describe('formatDetailTime (B6)', () => {
    it('오전 시각', () => {
        expect(formatDetailTime(at(9, 8, 46, 227))).toBe(
            '9월 29일 오전 09:08:46.227',
        )
    })

    it('오후 시각은 12시간제', () => {
        expect(formatDetailTime(at(13, 5, 0, 0))).toBe(
            '9월 29일 오후 01:05:00.000',
        )
        expect(formatDetailTime(at(12, 0, 0, 0))).toBe(
            '9월 29일 오후 12:00:00.000',
        )
        expect(formatDetailTime(at(0, 30, 0, 0))).toBe(
            '9월 29일 오전 12:30:00.000',
        )
    })
})
