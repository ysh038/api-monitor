import { describe, expect, it } from 'vitest'

import { makeRow } from '../../mocks/logFixtures'

import {
    getDurationRatio,
    getDurationTone,
    getExceptionTone,
    getStatusCategory,
    getStatusLabel,
    getStatusText,
    getStatusTone,
    isFailure,
    isSuccessRow,
    shortClassName,
} from './status'

describe('상태 분류 (B3)', () => {
    it.each([
        [200, 'success'],
        [204, 'success'],
        [302, 'info'],
        [404, 'warning'],
        [500, 'danger'],
        [null, 'danger'],
    ] as const)('%s → %s', (code, tone) => {
        expect(getStatusTone(code)).toBe(tone)
    })

    it('null 은 응답 없음 라벨', () => {
        expect(getStatusLabel(null)).toBe('응답 없음')
        expect(getStatusLabel(500)).toBe('500')
    })

    it('상태 범주 라벨', () => {
        expect(getStatusCategory(500)).toBe('서버 오류')
        expect(getStatusCategory(401)).toBe('요청 거부')
        expect(getStatusCategory(301)).toBe('리다이렉트')
        expect(getStatusCategory(200)).toBe('정상')
        expect(getStatusCategory(null)).toBe('응답 없음')
    })

    it('실패는 5xx 와 응답 없음', () => {
        expect(isFailure(makeRow({ statusCode: 500 }))).toBe(true)
        expect(isFailure(makeRow({ statusCode: null }))).toBe(true)
        expect(isFailure(makeRow({ statusCode: 404 }))).toBe(false)
    })

    it('정상은 2xx·3xx 이고 예외가 없을 때', () => {
        expect(isSuccessRow(makeRow({ statusCode: 200 }))).toBe(true)
        expect(isSuccessRow(makeRow({ statusCode: 302 }))).toBe(true)
        expect(isSuccessRow(makeRow({ statusCode: 404 }))).toBe(false)
        expect(
            isSuccessRow(makeRow({ statusCode: 200, exceptionClass: 'X' })),
        ).toBe(false)
    })
})

describe('소요 막대 (B4)', () => {
    it('톤은 3초 이상 danger, 1초 이상 warning, 그 외 neutral', () => {
        expect(getDurationTone(3000)).toBe('danger')
        expect(getDurationTone(1200)).toBe('warning')
        expect(getDurationTone(999)).toBe('neutral')
        expect(getDurationTone(null)).toBe('neutral')
    })

    it('길이는 3초를 1로 하는 로그 스케일', () => {
        expect(getDurationRatio(3000)).toBe(1)
        expect(getDurationRatio(10_000)).toBe(1)
        expect(getDurationRatio(0)).toBe(0)
        expect(getDurationRatio(null)).toBe(0)
        const small = getDurationRatio(4)
        const mid = getDurationRatio(436)
        expect(small).toBeGreaterThan(0)
        expect(mid).toBeGreaterThan(small)
        expect(mid).toBeLessThan(1)
    })
})

describe('예외 톤 (B5)', () => {
    it('4xx 로 처리된 예외는 warning, 5xx·응답 없음은 danger', () => {
        expect(getExceptionTone(makeRow({ statusCode: 400 }))).toBe('warning')
        expect(getExceptionTone(makeRow({ statusCode: 500 }))).toBe('danger')
        expect(getExceptionTone(makeRow({ statusCode: null }))).toBe('danger')
    })

    it('패키지를 뗀 클래스 이름', () => {
        expect(shortClassName('java.net.SocketTimeoutException')).toBe(
            'SocketTimeoutException',
        )
        expect(shortClassName(null)).toBe('')
    })
})

describe('상태 문구 (B7)', () => {
    it.each([
        [500, '500 Internal Server Error'],
        [404, '404 Not Found'],
        [200, '200 OK'],
        [599, '599'],
        [null, '응답 없음'],
    ])('%s → %s', (code, text) => {
        expect(getStatusText(code)).toBe(text)
    })
})
