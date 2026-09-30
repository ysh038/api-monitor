import { describe, expect, it } from 'vitest'

import { BASE_TIME, makeOutbound, makeRow, makeScenario } from '../../mocks/logFixtures'

import { buildHostHealth, buildProblems, normalizePath, problemBasis } from './problems'

const SEC = 1000

describe('normalizePath (P2)', () => {
    it.each([
        ['/api/v1/orders/3', '/api/v1/orders/{id}'],
        ['/api/v1/orders/3/predict?x=1', '/api/v1/orders/{id}/predict'],
        ['/files/6f1c2a9e-8b3d-4c1e-9f00-1234567890ab', '/files/{id}'],
        ['/blobs/0123456789abcdef0123', '/blobs/{id}'],
        ['/api/v1/receipts/f-2931/download', '/api/v1/receipts/f-2931/download'],
        ['/api/v1/orders', '/api/v1/orders'],
    ])('%s → %s', (path, expected) => {
        expect(normalizePath(path)).toBe(expected)
    })
})

describe('buildProblems — 반복되는 문제', () => {
    it('P1: 실패와 4xx 만 문제다. 예외가 있어도 2xx 는 아니다', () => {
        const problems = buildProblems([
            makeRow({ statusCode: 200, exceptionClass: 'a.Recovered' }),
            makeRow({ statusCode: 302 }),
            makeRow({ statusCode: 404, path: '/x' }),
            makeRow({ statusCode: 500, path: '/y' }),
        ])
        expect(problems.map((p) => p.status).sort()).toEqual(['404', '500'])
    })

    it('P2: ID 만 다른 같은 실패는 한 문제로 묶는다', () => {
        const problems = buildProblems([
            makeRow({ method: 'POST', path: '/api/v1/orders/3', statusCode: 500, exceptionClass: 'a.Boom', createdAt: BASE_TIME }),
            makeRow({ method: 'POST', path: '/api/v1/orders/5', statusCode: 500, exceptionClass: 'a.Boom', createdAt: BASE_TIME - SEC }),
        ])
        expect(problems).toHaveLength(1)
        expect(problems[0]).toMatchObject({ count: 2, context: 'POST /api/v1/orders/{id}' })
    })

    it('P2: 상태나 원인이 다르면 따로 센다', () => {
        const problems = buildProblems([
            makeRow({ statusCode: 500, exceptionClass: 'a.Boom' }),
            makeRow({ statusCode: 500, exceptionClass: 'a.Other' }),
            makeRow({ statusCode: 503, exceptionClass: 'a.Boom' }),
        ])
        expect(problems).toHaveLength(3)
    })

    it('P2: route·errorCode·rootCauseType 이 오면 그 값으로 묶는다', () => {
        const base = { statusCode: 409, route: '/api/v1/orders/{orderId}', exceptionClass: 'a.Conflict' }
        const problems = buildProblems([
            makeRow({ ...base, path: '/api/v1/orders/1', errorCode: 'ORDER_ALREADY_CANCELED' }),
            makeRow({ ...base, path: '/api/v1/orders/2', errorCode: 'ORDER_ALREADY_CANCELED' }),
            makeRow({ ...base, path: '/api/v1/orders/3', errorCode: 'ORDER_NOT_PAID' }),
        ])
        expect(problems.map((p) => [p.context, p.count]).sort()).toEqual([
            ['GET /api/v1/orders/{orderId}', 1],
            ['GET /api/v1/orders/{orderId}', 2],
        ])
    })

    it('P3: 실패한 보낸 요청 때문에 실패한 받은 요청은 그 대상 서버가 원인 — 보낸 요청은 따로 세지 않는다', () => {
        const [, paymentCall, payment] = makeScenario().slice(1, 4)
        const problems = buildProblems([paymentCall, payment])
        expect(problems).toHaveLength(1)
        expect(problems[0]).toMatchObject({
            title: 'pg-gateway:9000 호출이 실패해서 이 요청도 실패했어요',
            context: 'GET /api/v1/payments/{id}',
            latestId: payment.id,
        })
    })

    it('P3: 부모가 없거나 성공한 보낸 요청의 실패는 따로 센다', () => {
        const parent = makeRow({ statusCode: 200 })
        const call = makeOutbound(parent, { targetHost: 'pg:9000', statusCode: 503 })
        const background = makeOutbound(null, { targetHost: 'mq:5672', statusCode: null, exceptionClass: 'java.net.ConnectException' })
        const problems = buildProblems([call, parent, background])
        expect(problems.map((p) => p.context).sort()).toEqual(['→ mq:5672', '→ pg:9000'])
    })

    it('P4·P5: 제목·건수·마지막 시각·가장 최근 id, 최근 순', () => {
        const older = makeRow({ statusCode: 401, path: '/api/v1/me', createdAt: BASE_TIME - 60 * SEC })
        const newer = makeRow({ statusCode: 401, path: '/api/v1/me', createdAt: BASE_TIME })
        const recent = makeRow({ statusCode: 404, path: '/api/v1/order', createdAt: BASE_TIME + 10 * SEC })
        const problems = buildProblems([recent, newer, older])
        expect(problems.map((p) => p.status)).toEqual(['404', '401'])
        expect(problems[1]).toEqual({
            key: expect.any(String),
            title: '401 응답으로 요청을 거부했어요',
            context: 'GET /api/v1/me',
            status: '401',
            tone: 'warning',
            count: 2,
            lastAt: newer.createdAt,
            latestId: newer.id,
        })
    })

    it('P5: 마지막 시각이 같으면 건수가 많은 순', () => {
        const a = [1, 2, 3].map(() => makeRow({ statusCode: 500, path: '/a', createdAt: BASE_TIME }))
        const b = makeRow({ statusCode: 500, path: '/b', createdAt: BASE_TIME })
        expect(buildProblems([b, ...a]).map((p) => p.count)).toEqual([3, 1])
    })
})

describe('buildHostHealth — 외부 연결 상태', () => {
    it('H1·H2: 마지막 결과, 마지막 성공, 실패 이유', () => {
        const ok = makeOutbound(null, { targetHost: 'ai:8000', statusCode: 200, durationMs: 450, createdAt: BASE_TIME })
        const okOld = makeOutbound(null, { targetHost: 'ai:8000', statusCode: 500, createdAt: BASE_TIME - 5 * SEC })
        const refused = makeOutbound(null, {
            targetHost: 'pg:9000',
            statusCode: null,
            exceptionClass: 'java.net.ConnectException',
            exceptionMessage: 'Connection refused',
            createdAt: BASE_TIME,
        })
        const health = buildHostHealth([ok, okOld, refused])
        expect(health).toEqual([
            {
                host: 'pg:9000',
                state: 'fail',
                detail: '연결 거부',
                total: 1,
                failed: 1,
                lastSuccessAt: null,
                latestId: refused.id,
            },
            {
                host: 'ai:8000',
                state: 'ok',
                detail: '450ms',
                total: 2,
                failed: 1,
                lastSuccessAt: ok.createdAt,
                latestId: ok.id,
            },
        ])
    })

    it.each([
        [{ exceptionClass: 'java.net.SocketTimeoutException' }, '타임아웃'],
        [{ exceptionMessage: 'Read timed out' }, '타임아웃'],
        [{ exceptionClass: 'java.net.UnknownHostException' }, '주소를 찾지 못함'],
        [{ exceptionClass: 'javax.net.ssl.SSLHandshakeException' }, '인증서 오류'],
        [{ exceptionClass: 'java.security.cert.CertPathValidatorException' }, '인증서 오류'],
        [{}, '응답 없음'],
    ])('H2: 응답 없는 실패 이유 %#', (overrides, detail) => {
        const call = makeOutbound(null, { statusCode: null, ...overrides })
        expect(buildHostHealth([call])[0].detail).toBe(detail)
    })

    it('H2: 상태 코드가 있는 실패는 HTTP 코드', () => {
        expect(buildHostHealth([makeOutbound(null, { statusCode: 503 })])[0].detail).toBe('HTTP 503')
    })

    it('H3: 실패 → 4xx → 정상, 같으면 이름 순', () => {
        const health = buildHostHealth([
            makeOutbound(null, { targetHost: 'b-ok', statusCode: 200 }),
            makeOutbound(null, { targetHost: 'a-ok', statusCode: 200 }),
            makeOutbound(null, { targetHost: 'z-warn', statusCode: 404 }),
            makeOutbound(null, { targetHost: 'y-fail', statusCode: 500 }),
        ])
        expect(health.map((h) => [h.host, h.state])).toEqual([
            ['y-fail', 'fail'],
            ['z-warn', 'warn'],
            ['a-ok', 'ok'],
            ['b-ok', 'ok'],
        ])
    })

    it('받은 요청만 있으면 빈 목록', () => {
        expect(buildHostHealth([makeRow()])).toEqual([])
    })
})

describe('요약 기준 행 (L1)', () => {
    it('항상 최신 100건, 적으면 그 수만큼', () => {
        const many = Array.from({ length: 150 }, (_, i) => makeRow({ id: 1000 - i }))
        const basis = problemBasis(many)
        expect(basis).toHaveLength(100)
        expect(basis[0].id).toBe(1000)
        expect(basis.at(-1)?.id).toBe(901)
        expect(problemBasis(many.slice(0, 14))).toHaveLength(14)
    })
})
