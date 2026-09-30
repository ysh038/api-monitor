/**
 * 테스트·스토리 공용 픽스처. 앱 코드에서는 import 하지 않는다 (dist 미포함).
 * 기본 시나리오는 참고 이미지(2026-09-29)의 요청 기록을 따른다.
 */
import type { ILogDetail, ILogRow } from '../types/log'

/** 2026-09-29 09:08:46.227 (로컬 시각) */
export const BASE_TIME = new Date(2026, 8, 29, 9, 8, 46, 227).getTime()

let nextId = 1000

export function makeRow(overrides: Partial<ILogRow> = {}): ILogRow {
    nextId += 1
    return {
        id: nextId,
        kind: 'INBOUND',
        requestId: `req-${nextId}`,
        parentRequestId: null,
        serviceName: 'order-api',
        instanceId: 'order-api-1',
        method: 'GET',
        path: '/api/v1/orders',
        targetHost: null,
        statusCode: 200,
        durationMs: 12,
        clientIp: '10.0.0.7',
        isAsync: false,
        createdAt: BASE_TIME,
        exceptionClass: null,
        exceptionMessage: null,
        exceptionHandled: null,
        childCount: 0,
        isMock: false,
        ...overrides,
    }
}

export function makeOutbound(
    parent: ILogRow | null,
    overrides: Partial<ILogRow> = {},
): ILogRow {
    return makeRow({
        kind: 'OUTBOUND',
        parentRequestId: parent?.requestId ?? null,
        serviceName: parent?.serviceName ?? 'order-api',
        requestId: `call-${nextId + 1}`,
        clientIp: null,
        targetHost: 'ai-server:8000',
        path: '/predict',
        createdAt: parent?.createdAt ?? BASE_TIME,
        ...overrides,
    })
}

export function makeDetail(
    row: ILogRow,
    overrides: Partial<ILogDetail> = {},
): ILogDetail {
    return {
        ...row,
        requestHeaders: { accept: 'application/json' },
        responseHeaders: { 'content-type': 'application/json' },
        requestBody: null,
        responseBody: '{"ok":true}',
        isRequestBodyTruncated: false,
        isResponseBodyTruncated: false,
        exceptionStacktrace: null,
        exceptionCauses: [],
        related: { children: [], parent: null, sameRequestId: [] },
        ...overrides,
    }
}

const SEC = 1000

/** 참고 이미지 상단 묶음과 같은 구성 (최신순) */
export function makeScenario(): ILogRow[] {
    const t = BASE_TIME
    const okA = makeRow({ path: '/api/v1/payments?status=PAID', createdAt: t + 70 * SEC })
    const okB = makeRow({ path: '/api/v1/receipts/f1', createdAt: t + 60 * SEC })
    const payment = makeRow({
        path: '/api/v1/payments/7781',
        statusCode: 500,
        durationMs: 3000,
        createdAt: t,
        childCount: 1,
        exceptionClass: 'org.springframework.web.client.ResourceAccessException',
        exceptionMessage:
            'I/O error on GET request for "http://pg-gateway:9000/payments/7781/status": Read timed out',
    })
    const paymentCall = makeOutbound(payment, {
        targetHost: 'pg-gateway:9000',
        path: '/payments/7781/status',
        statusCode: null,
        durationMs: 3000,
        exceptionClass: 'java.net.SocketTimeoutException',
        exceptionMessage: 'Read timed out',
    })
    const predict = makeRow({
        method: 'POST',
        path: '/api/v1/orders/3/predict',
        statusCode: 500,
        durationMs: 52,
        createdAt: t - 10 * SEC,
        childCount: 1,
        exceptionClass:
            'org.springframework.web.client.HttpServerErrorException',
        exceptionMessage: '500 Internal Server Error',
    })
    const predictCall = makeOutbound(predict, {
        method: 'POST',
        statusCode: 500,
        durationMs: 45,
        createdAt: t - 10 * SEC + 100,
    })
    const risk = makeRow({
        path: '/api/v1/risk-scores',
        durationMs: 436,
        createdAt: t - 21 * SEC,
        childCount: 1,
    })
    const riskCall = makeOutbound(risk, {
        path: '/risk?month=2026-09',
        durationMs: 420,
        createdAt: t - 20 * SEC,
    })
    const orders = makeRow({
        method: 'POST',
        statusCode: 500,
        durationMs: 1200,
        createdAt: t - 30 * SEC,
        exceptionClass:
            'org.springframework.dao.DataIntegrityViolationException',
        exceptionMessage: 'could not execute statement',
    })
    const notFound = makeRow({
        path: '/api/v1/order',
        statusCode: 404,
        durationMs: 4,
        createdAt: t - 38 * SEC,
    })
    const invalid = makeRow({
        method: 'POST',
        statusCode: 400,
        durationMs: 9,
        createdAt: t - 45 * SEC,
        exceptionClass:
            'org.springframework.web.bind.MethodArgumentNotValidException',
        exceptionMessage: 'Validation failed',
        exceptionHandled: true,
    })
    const unauthorized = makeRow({
        path: '/api/v1/auth/login',
        method: 'POST',
        statusCode: 401,
        durationMs: 12,
        createdAt: t - 60 * SEC,
        exceptionClass: 'com.example.auth.LoginFailedException',
        exceptionMessage: '비밀번호가 틀렸습니다',
        exceptionHandled: true,
    })
    const oldA = makeRow({ path: '/api/v1/orders', createdAt: t - 20 * 60 * SEC })
    const oldB = makeRow({ path: '/api/v1/auth/login', createdAt: t - 20 * 60 * SEC - 10 * SEC })
    // 목록 API 는 id 내림차순(최신순)이다
    return [
        okA,
        okB,
        paymentCall,
        payment,
        predictCall,
        predict,
        riskCall,
        risk,
        orders,
        notFound,
        invalid,
        unauthorized,
        oldA,
        oldB,
    ]
        .map((row, index, all) => ({ ...row, id: 500 + all.length - index }))
}
