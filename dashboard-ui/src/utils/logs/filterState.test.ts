import { describe, expect, it } from 'vitest'

import type { ILogFilters } from '../../types/log'

import {
    changeKind,
    EMPTY_FILTERS,
    hasAnyFilter,
    parseHash,
    toggleStatus,
    toHash,
} from './filterState'

const filters = (overrides: Partial<ILogFilters> = {}): ILogFilters => ({
    ...EMPTY_FILTERS,
    ...overrides,
})

describe('필터 상태 전이 (E4)', () => {
    it('구분을 바꾸면 kind 만 바뀐다', () => {
        const base = filters({ statuses: ['5xx'], q: 'x' })
        expect(changeKind(base, 'OUTBOUND')).toEqual(filters({ statuses: ['5xx'], q: 'x', kind: 'OUTBOUND' }))
        expect(changeKind(filters({ kind: 'OUTBOUND' }), '')).toEqual(filters())
    })

    it('상태 칩은 여러 개를 켜고 끌 수 있다', () => {
        const two = toggleStatus(toggleStatus(filters(), '5xx'), 'none')
        expect(two.statuses).toEqual(['5xx', 'none'])
        expect(toggleStatus(two, '5xx').statuses).toEqual(['none'])
    })

    it('필터 항목은 구분·상태·검색뿐이다 (서비스·예외만·보낸 대상 제거)', () => {
        expect(Object.keys(EMPTY_FILTERS).sort()).toEqual(['kind', 'q', 'statuses'])
    })

    it('hasAnyFilter', () => {
        expect(hasAnyFilter(filters())).toBe(false)
        expect(hasAnyFilter(filters({ q: 'x' }))).toBe(true)
        expect(hasAnyFilter(filters({ statuses: ['2xx'] }))).toBe(true)
        expect(hasAnyFilter(filters({ kind: 'INBOUND' }))).toBe(true)
    })
})

describe('URL 해시 (E5)', () => {
    it('필터와 선택 id 를 해시로 왕복 변환한다', () => {
        const state = {
            filters: filters({
                kind: 'OUTBOUND',
                statuses: ['4xx', 'none'],
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

    it('예전 링크의 service·exception·host 는 읽지 않는다', () => {
        expect(parseHash('#/?service=order-api&exception=1&host=pg%3A9000&kind=INBOUND')).toEqual({
            filters: filters({ kind: 'INBOUND' }),
            selectedId: null,
        })
    })

    it('잘못된 값은 버린다', () => {
        expect(parseHash('#/?kind=SIDEWAYS&status=2xx,9xx&id=abc')).toEqual({
            filters: filters({ statuses: ['2xx'] }),
            selectedId: null,
        })
    })
})
