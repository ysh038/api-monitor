import { describe, expect, it } from 'vitest'

import { getTotalCount } from './serviceOptions'

describe('전체 건수 (요청 기록 머리의 "전체 N건")', () => {
    it('서비스별 누적 건수의 합', () => {
        expect(
            getTotalCount({
                services: [
                    { name: 'order-api', total: 1200, errors: 5, exceptions: 7, lastSeen: 0 },
                    { name: 'pay-api', total: 30, errors: 0, exceptions: 0, lastSeen: 0 },
                ],
                hosts: [],
            }),
        ).toBe(1230)
    })

    it('아직 못 받았으면 null, 서비스가 없으면 0', () => {
        expect(getTotalCount(undefined)).toBeNull()
        expect(getTotalCount({ services: [], hosts: [] })).toBe(0)
    })
})
