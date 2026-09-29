import { describe, expect, it } from 'vitest'

import { buildServiceOptions, getScopeTotal } from './serviceOptions'

const overview = {
    services: [
        { name: 'order-api', total: 1200, errors: 5, exceptions: 7, lastSeen: 0 },
        { name: 'pay-api', total: 30, errors: 0, exceptions: 0, lastSeen: 0 },
    ],
    hosts: [],
}

describe('서비스 선택 상자 (E6)', () => {
    it('전체 + 서비스별 건수, 에러가 있으면 덧붙인다', () => {
        expect(buildServiceOptions(overview)).toEqual({
            isEmpty: false,
            options: [
                { value: '', label: '전체 서비스 · 1,230건 · 에러 5' },
                { value: 'order-api', label: 'order-api · 1,200건 · 에러 5' },
                { value: 'pay-api', label: 'pay-api · 30건' },
            ],
        })
    })

    it('서비스가 없으면 안내 한 줄', () => {
        expect(buildServiceOptions({ services: [], hosts: [] })).toEqual({
            isEmpty: true,
            options: [{ value: '', label: '아직 로그를 보낸 서비스가 없습니다' }],
        })
    })

    it('불러오기 전에는 전체 서비스만', () => {
        expect(buildServiceOptions(undefined)).toEqual({
            isEmpty: false,
            options: [{ value: '', label: '전체 서비스' }],
        })
    })

    it('전체 건수는 선택한 서비스 기준', () => {
        expect(getScopeTotal(overview, '')).toBe(1230)
        expect(getScopeTotal(overview, 'pay-api')).toBe(30)
        expect(getScopeTotal(overview, 'none')).toBe(0)
        expect(getScopeTotal(undefined, '')).toBeNull()
    })
})
