import { describe, expect, it } from 'vitest'

import { BASE_TIME, makeOutbound, makeRow } from '../../mocks/logFixtures'

import { findRecoveredAuth } from './recovery'

const SEC = 1000
const expired = (overrides = {}) =>
    makeRow({ method: 'GET', path: '/api/v1/orders/3', statusCode: 401, createdAt: BASE_TIME, ...overrides })
const retry = (overrides = {}) =>
    makeRow({ method: 'GET', path: '/api/v1/orders/3', statusCode: 200, createdAt: BASE_TIME + 2 * SEC, ...overrides })

describe('findRecoveredAuth — 재시도로 회복된 401', () => {
    it('A1: 같은 IP 가 30초 안에 같은 요청을 다시 보내 성공하면 회복이다', () => {
        const row = expired()
        const refresh = makeRow({ method: 'POST', path: '/api/v1/auth/refresh', createdAt: BASE_TIME + SEC })
        expect(findRecoveredAuth([retry(), refresh, row])).toEqual(new Set([row.id]))
    })

    it('A1: ID 만 다른 경로·route 가 같으면 같은 요청이다. 3xx 도 성공이다', () => {
        const a = expired({ path: '/api/v1/orders/3' })
        const b = expired({ route: '/api/v1/items/{itemId}', path: '/api/v1/items/x1' })
        const recovered = findRecoveredAuth([
            a,
            b,
            retry({ path: '/api/v1/orders/7' }),
            retry({ route: '/api/v1/items/{itemId}', path: '/api/v1/items/x2', statusCode: 304 }),
        ])
        expect(recovered).toEqual(new Set([a.id, b.id]))
    })

    it('A1: 같은 시각이면 id 가 더 큰 성공만 재시도다', () => {
        const before = retry({ createdAt: BASE_TIME })
        const row = expired()
        const after = retry({ createdAt: BASE_TIME })
        expect(findRecoveredAuth([before, row])).toEqual(new Set())
        expect(findRecoveredAuth([after, row])).toEqual(new Set([row.id]))
    })

    it.each([
        ['IP 가 없음', { clientIp: null }, {}],
        ['30초 뒤에 성공', {}, { createdAt: BASE_TIME + 31 * SEC }],
        ['401 보다 먼저 성공', {}, { createdAt: BASE_TIME - SEC }],
        ['다른 IP', {}, { clientIp: '10.0.0.99' }],
        ['다른 경로', {}, { path: '/api/v1/payments/3' }],
        ['다른 메서드', {}, { method: 'POST' }],
        ['다른 서비스', {}, { serviceName: 'pay-api' }],
        ['다시 401', {}, { statusCode: 401 }],
        ['5xx', {}, { statusCode: 500 }],
    ])('A2: %s 이면 회복이 아니다', (_, rowOverrides, retryOverrides) => {
        expect(findRecoveredAuth([retry(retryOverrides), expired(rowOverrides)])).toEqual(new Set())
    })

    it('A2: 401 이 아닌 4xx 와 보낸 요청은 대상이 아니다', () => {
        const forbidden = expired({ statusCode: 403 })
        const outbound = makeOutbound(null, { statusCode: 401, clientIp: '10.0.0.7', path: '/api/v1/orders/3', method: 'GET' })
        expect(findRecoveredAuth([retry(), forbidden, outbound])).toEqual(new Set())
    })
})
