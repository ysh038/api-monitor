import { describe, expect, it } from 'vitest'

import type { ILogFilters } from '../../types/log'

import {
    changeKind,
    changeService,
    clearScope,
    EMPTY_FILTERS,
    getScopeLabel,
    hasAnyFilter,
    parseHash,
    selectHost,
    toggleStatus,
    toHash,
} from './filterState'

const filters = (overrides: Partial<ILogFilters> = {}): ILogFilters => ({
    ...EMPTY_FILTERS,
    ...overrides,
})

describe('필터 상태 전이 (E4)', () => {
    it('호스트를 고르면 보낸 요청 탭이 되고 서비스는 유지된다', () => {
        expect(selectHost(filters({ service: 'order-api' }), 'pg:9000')).toEqual(
            filters({ service: 'order-api', host: 'pg:9000', kind: 'OUTBOUND' }),
        )
    })

    it('같은 호스트를 다시 고르면 호스트 필터만 해제된다', () => {
        expect(
            selectHost(filters({ host: 'pg:9000', kind: 'OUTBOUND' }), 'pg:9000'),
        ).toEqual(filters({ kind: 'OUTBOUND' }))
    })

    it('보낸 요청이 아닌 구분으로 바꾸면 호스트가 해제된다', () => {
        const base = filters({ host: 'pg:9000', kind: 'OUTBOUND' })
        expect(changeKind(base, 'INBOUND')).toEqual(filters({ kind: 'INBOUND' }))
        expect(changeKind(base, '')).toEqual(filters())
        expect(changeKind(base, 'OUTBOUND')).toEqual(base)
    })

    it('서비스를 고르면 호스트가 해제된다', () => {
        expect(
            changeService(filters({ host: 'pg:9000', kind: 'OUTBOUND' }), 'a'),
        ).toEqual(filters({ service: 'a', kind: 'OUTBOUND' }))
    })

    it('해제는 서비스와 호스트를 둘 다 푼다', () => {
        expect(
            clearScope(filters({ service: 'a', host: 'h', kind: 'OUTBOUND' })),
        ).toEqual(filters({ kind: 'OUTBOUND' }))
    })

    it('상태 칩은 여러 개를 켜고 끌 수 있다', () => {
        const two = toggleStatus(toggleStatus(filters(), '5xx'), 'none')
        expect(two.statuses).toEqual(['5xx', 'none'])
        expect(toggleStatus(two, '5xx').statuses).toEqual(['none'])
    })

    it('hasAnyFilter', () => {
        expect(hasAnyFilter(filters())).toBe(false)
        expect(hasAnyFilter(filters({ q: 'x' }))).toBe(true)
        expect(hasAnyFilter(filters({ statuses: ['2xx'] }))).toBe(true)
        expect(hasAnyFilter(filters({ isExceptionOnly: true }))).toBe(true)
    })

    it('E7: 범위 안내 문구', () => {
        expect(getScopeLabel(filters())).toBeNull()
        expect(getScopeLabel(filters({ service: 'a', host: 'h' }))).toBe(
            '서비스: a · 보낸 대상: h',
        )
        expect(getScopeLabel(filters({ host: 'h' }))).toBe('보낸 대상: h')
    })
})

describe('URL 해시 (E5)', () => {
    it('필터와 선택 id 를 해시로 왕복 변환한다', () => {
        const state = {
            filters: filters({
                service: 'order api',
                host: 'pg:9000',
                kind: 'OUTBOUND',
                statuses: ['4xx', 'none'],
                isExceptionOnly: true,
                q: '결제/7781',
            }),
            selectedId: 42,
        }
        const hash = toHash(state)
        expect(hash.startsWith('#/?')).toBe(true)
        expect(parseHash(hash)).toEqual(state)
    })

    it('필터가 없으면 빈 해시', () => {
        expect(toHash({ filters: filters(), selectedId: null })).toBe('')
        expect(parseHash('')).toEqual({ filters: filters(), selectedId: null })
    })

    it('잘못된 값은 버린다', () => {
        expect(parseHash('#/?kind=SIDEWAYS&status=2xx,9xx&id=abc')).toEqual({
            filters: filters({ statuses: ['2xx'] }),
            selectedId: null,
        })
    })
})
