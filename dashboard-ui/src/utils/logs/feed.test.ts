import { describe, expect, it } from 'vitest'

import { makeRow } from '../../mocks/logFixtures'

import {
    getDocumentTitle,
    hasMorePages,
    isServicesRefreshTick,
    MAX_FEED_ROWS,
    mergeNewer,
    mergePolledPages,
    PAGE_SIZE,
    shouldPoll,
} from './feed'

describe('mergeNewer (G4)', () => {
    it('새 행을 앞에 붙이고 새 id 를 돌려준다', () => {
        const old = [makeRow({ id: 2 }), makeRow({ id: 1 })]
        const incoming = [makeRow({ id: 4 }), makeRow({ id: 3 })]
        const merged = mergeNewer(old, incoming)
        expect(merged.rows.map((r) => r.id)).toEqual([4, 3, 2, 1])
        expect(merged.newIds).toEqual([4, 3])
    })

    it('이미 있는 id 는 한 번만', () => {
        const old = [makeRow({ id: 2 }), makeRow({ id: 1 })]
        const merged = mergeNewer(old, [makeRow({ id: 3 }), makeRow({ id: 2 })])
        expect(merged.rows.map((r) => r.id)).toEqual([3, 2, 1])
        expect(merged.newIds).toEqual([3])
    })

    it('새 행이 없으면 같은 배열', () => {
        const old = [makeRow({ id: 1 })]
        expect(mergeNewer(old, []).rows).toBe(old)
    })
})

describe('폴링 판단 (G5)', () => {
    it('자동 갱신이 꺼졌거나 탭이 숨겨지면 폴링하지 않는다', () => {
        expect(shouldPoll({ isAutoRefresh: true, isDocumentHidden: false })).toBe(true)
        expect(shouldPoll({ isAutoRefresh: false, isDocumentHidden: false })).toBe(false)
        expect(shouldPoll({ isAutoRefresh: true, isDocumentHidden: true })).toBe(false)
    })

    it('서비스 목록은 폴링 두 번에 한 번 (10초)', () => {
        expect([1, 2, 3, 4].map(isServicesRefreshTick)).toEqual([
            false,
            true,
            false,
            true,
        ])
    })

    it('페이지 크기만큼 왔으면 더 있다', () => {
        expect(hasMorePages(PAGE_SIZE)).toBe(true)
        expect(hasMorePages(PAGE_SIZE - 1)).toBe(false)
    })
})

describe('탭 제목 (G6)', () => {
    it('개발 모드면 (DEV)', () => {
        expect(getDocumentTitle(true)).toBe('API Monitor (DEV)')
        expect(getDocumentTitle(false)).toBe('API Monitor')
    })
})

describe('폴링 병합 + 안전 상한 (G4a)', () => {
    const rowsFrom = (start: number, count: number) =>
        Array.from({ length: count }, (_, i) => makeRow({ id: start - i }))
    const ids = (pages: { id: number }[][]) => pages.flat().map((r) => r.id)

    it('상한 안이면 새 행을 앞 페이지로 붙인다', () => {
        const pages = [rowsFrom(10, 3)]
        const merged = mergePolledPages(pages, [makeRow({ id: 12 }), makeRow({ id: 11 })], 1000)
        expect(ids(merged.pages)).toEqual([12, 11, 10, 9, 8])
        expect(merged.pages).toHaveLength(2)
        expect(merged.newIds).toEqual([12, 11])
        expect(merged.isTrimmed).toBe(false)
    })

    it('상한을 넘으면 가장 오래된 행부터 뺀다', () => {
        const pages = [rowsFrom(1000, 1000)]
        const merged = mergePolledPages(pages, rowsFrom(1005, 5), 1000)
        expect(merged.pages.flat()).toHaveLength(1000)
        expect(ids(merged.pages).slice(0, 2)).toEqual([1005, 1004])
        expect(ids(merged.pages).at(-1)).toBe(6)
        expect(merged.newIds).toEqual([1005, 1004, 1003, 1002, 1001])
        expect(merged.isTrimmed).toBe(true)
        // 뺀 뒤에도 마지막 페이지가 꽉 차 있어 "더 보기"가 남는다
        expect(hasMorePages(merged.pages.at(-1)?.length ?? 0)).toBe(true)
    })

    it('"더 보기"로 불러온 만큼은 줄이지 않는다 (상한 = max(상한, 폴링 직전 행 수))', () => {
        const pages = [rowsFrom(1200, 1200)]
        const merged = mergePolledPages(pages, rowsFrom(1203, 3), 1000)
        expect(merged.pages.flat()).toHaveLength(1200)
        expect(ids(merged.pages).slice(0, 3)).toEqual([1203, 1202, 1201])
    })

    it('새 행이 없으면 같은 페이지 배열', () => {
        const pages = [rowsFrom(3, 3)]
        expect(mergePolledPages(pages, [], 1000).pages).toBe(pages)
    })

    it('안전 상한은 1,000건', () => {
        expect(MAX_FEED_ROWS).toBe(1000)
    })
})
