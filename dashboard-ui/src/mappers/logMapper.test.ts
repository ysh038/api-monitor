import { describe, expect, it } from 'vitest'

import {
    mapHealth,
    mapLogDetail,
    mapLogList,
    mapServicesOverview,
} from './logMapper'

const rawRow = {
    id: 7,
    kind: 'OUTBOUND',
    request_id: 'call-1',
    parent_request_id: 'req-1',
    service_name: 'order-api',
    instance_id: null,
    method: 'GET',
    path: '/status',
    target_host: 'pg:9000',
    status_code: null,
    duration_ms: 3000,
    client_ip: null,
    async: 0,
    created_at: 1_700_000_000_000,
    exception_class: 'java.net.SocketTimeoutException',
    exception_message: 'Read timed out',
    exception_handled: null,
    child_count: 0,
    is_mock: 1,
}

describe('mapLogList', () => {
    it('snake_case 행을 도메인 타입으로 바꾼다', () => {
        expect(mapLogList({ items: [rawRow], limit: 100 })).toEqual([
            {
                id: 7,
                kind: 'OUTBOUND',
                requestId: 'call-1',
                parentRequestId: 'req-1',
                serviceName: 'order-api',
                instanceId: null,
                method: 'GET',
                path: '/status',
                targetHost: 'pg:9000',
                statusCode: null,
                durationMs: 3000,
                clientIp: null,
                isAsync: false,
                createdAt: 1_700_000_000_000,
                exceptionClass: 'java.net.SocketTimeoutException',
                exceptionMessage: 'Read timed out',
                exceptionHandled: null,
                childCount: 0,
                isMock: true,
                route: null,
                errorCode: null,
                rootCauseType: null,
            },
        ])
    })

    it('L3: 선택 필드 route·error_code·root_cause_type 이 있으면 읽는다', () => {
        const [row] = mapLogList({
            items: [
                {
                    ...rawRow,
                    route: '/api/v1/orders/{orderId}',
                    error_code: 'ORDER_ALREADY_CANCELED',
                    root_cause_type: 'java.net.SocketTimeoutException',
                },
            ],
        })
        expect(row).toMatchObject({
            route: '/api/v1/orders/{orderId}',
            errorCode: 'ORDER_ALREADY_CANCELED',
            rootCauseType: 'java.net.SocketTimeoutException',
        })
    })

    it('스타터 응답처럼 is_mock·선택 필드가 없어도 된다', () => {
        const { is_mock: _omit, ...withoutMock } = rawRow
        void _omit
        const [row] = mapLogList({ items: [withoutMock] })
        expect(row.isMock).toBe(false)
    })

    it('형식이 틀리면 에러', () => {
        expect(() => mapLogList({ items: [{ id: 'x' }] })).toThrow()
        expect(() => mapLogList(null)).toThrow()
    })
})

describe('mapLogDetail', () => {
    it('헤더·바디·연관 목록을 바꾼다', () => {
        const detail = mapLogDetail({
            ...rawRow,
            request_headers: { accept: 'a', 'x-multi': ['1', '2'] },
            response_headers: null,
            request_body: '',
            response_body: '{"a":1}',
            request_body_truncated: 0,
            response_body_truncated: 1,
            exception_stacktrace: 'trace',
            exception_causes: [{ exceptionClass: 'a.B', message: 'm' }],
            related: { children: [rawRow], parent: null, sameRequestId: [] },
        })
        expect(detail.requestHeaders).toEqual({ accept: 'a', 'x-multi': '1, 2' })
        expect(detail.responseHeaders).toEqual({})
        expect(detail.requestBody).toBeNull()
        expect(detail.responseBody).toBe('{"a":1}')
        expect(detail.isResponseBodyTruncated).toBe(true)
        expect(detail.exceptionCauses).toEqual([
            { exceptionClass: 'a.B', message: 'm' },
        ])
        expect(detail.related.children).toHaveLength(1)
        expect(detail.related.parent).toBeNull()
    })
})

describe('mapServicesOverview / mapHealth', () => {
    it('서비스·호스트 통계', () => {
        expect(
            mapServicesOverview({
                services: [
                    { name: 'a', total: 3, errors: 1, exceptions: 0, lastSeen: 5 },
                ],
                hosts: [{ host: 'h', total: 2 }],
            }),
        ).toEqual({
            services: [
                { name: 'a', total: 3, errors: 1, exceptions: 0, lastSeen: 5 },
            ],
            hosts: [{ host: 'h', total: 2 }],
        })
    })

    it('dev 가 true 일 때만 개발 모드', () => {
        expect(mapHealth({ status: 'ok', dev: true })).toEqual({ isDev: true })
        expect(mapHealth({ status: 'ok' })).toEqual({ isDev: false })
        expect(mapHealth({ status: 'ok', dev: 'yes' })).toEqual({ isDev: false })
    })
})
