import { describe, expect, it } from 'vitest'

import { getDevServerNotice, getHealthRecheckInterval, HEALTH_RECHECK_MS } from './devServerNotice'

describe('개발 서버 안내 (A1~A5)', () => {
    it('A1: 개발 서버에서 health 가 실패하면 연결 불가 안내', () => {
        expect(getDevServerNotice({ isViteDev: true, healthStatus: 'error', isDev: false })).toBe('unreachable')
    })

    it('A2: health 는 성공했지만 dev 가 아니면 운영 모드 안내', () => {
        expect(getDevServerNotice({ isViteDev: true, healthStatus: 'success', isDev: false })).toBe('not-dev-mode')
    })

    it('A3: dev === true 면 안내 없음', () => {
        expect(getDevServerNotice({ isViteDev: true, healthStatus: 'success', isDev: true })).toBeNull()
    })

    it('A4: 확인 중에는 안내 없음', () => {
        expect(getDevServerNotice({ isViteDev: true, healthStatus: 'pending', isDev: false })).toBeNull()
    })

    it.each([
        ['error', false],
        ['success', false],
        ['success', true],
        ['pending', false],
    ] as const)('A5: 운영 빌드에서는 %s/%s 여도 안내 없음', (healthStatus, isDev) => {
        expect(getDevServerNotice({ isViteDev: false, healthStatus, isDev })).toBeNull()
    })
})

describe('health 재확인 주기 (A6)', () => {
    it('개발 서버에서 안내가 필요한 동안 5초마다 다시 확인한다', () => {
        expect(HEALTH_RECHECK_MS).toBe(5000)
        expect(getHealthRecheckInterval({ isViteDev: true, healthStatus: 'error', isDev: false })).toBe(5000)
        expect(getHealthRecheckInterval({ isViteDev: true, healthStatus: 'success', isDev: false })).toBe(5000)
    })

    it('개발 모드로 연결됐거나 운영 빌드면 다시 확인하지 않는다', () => {
        expect(getHealthRecheckInterval({ isViteDev: true, healthStatus: 'success', isDev: true })).toBe(false)
        expect(getHealthRecheckInterval({ isViteDev: false, healthStatus: 'error', isDev: false })).toBe(false)
    })
})
