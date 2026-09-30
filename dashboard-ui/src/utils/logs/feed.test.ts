import { describe, expect, it } from 'vitest'

import { makeRow } from '../../mocks/logFixtures'

import {
    getDocumentTitle,
    hasMorePages,
    isServicesRefreshTick,
    mergeNewer,
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
