/**
 * 대시보드 도메인 타입. 서버 응답(snake_case)은 mappers 에서 이 형태로 바뀐다.
 * API 형식은 MIGRATION.md 의 "API" 절 참고.
 */

export type TLogKind = 'INBOUND' | 'OUTBOUND'

export interface ILogRow {
    id: number
    kind: TLogKind
    requestId: string | null
    /** OUTBOUND 가 어떤 INBOUND 처리 중 나갔는지 */
    parentRequestId: string | null
    serviceName: string
    instanceId: string | null
    method: string
    /** 쿼리 포함 */
    path: string
    /** OUTBOUND 만 */
    targetHost: string | null
    /** null = 응답 없음(연결 실패·타임아웃) */
    statusCode: number | null
    durationMs: number | null
    clientIp: string | null
    /** SSE 등 비동기 */
    isAsync: boolean
    /** epoch ms */
    createdAt: number
    exceptionClass: string | null
    exceptionMessage: string | null
    exceptionHandled: boolean | null
    /** INBOUND 아래 외부 호출 수 */
    childCount: number
    /** Node 개발 모드 Mock 데이터 */
    isMock: boolean
}

export interface IExceptionCause {
    exceptionClass: string
    message: string | null
}

export interface IRelatedLogs {
    /** 이 요청 중 나간 외부 호출 */
    children: ILogRow[]
    /** 외부 호출이면 발생시킨 요청 */
    parent: ILogRow | null
    /** 같은 requestId 를 가진 다른 서비스 요청 */
    sameRequestId: ILogRow[]
}

export interface ILogDetail extends ILogRow {
    requestHeaders: Record<string, string>
    responseHeaders: Record<string, string>
    requestBody: string | null
    responseBody: string | null
    isRequestBodyTruncated: boolean
    isResponseBodyTruncated: boolean
    exceptionStacktrace: string | null
    exceptionCauses: IExceptionCause[]
    related: IRelatedLogs
}

export interface IServiceStat {
    name: string
    total: number
    /** 5xx + 응답 없음 */
    errors: number
    exceptions: number
    lastSeen: number
}

export interface IHostStat {
    host: string
    total: number
}

export interface IServicesOverview {
    services: IServiceStat[]
    hosts: IHostStat[]
}

export interface IHealth {
    /** Node 서버 npm run dev 일 때만 true. 스타터 내장 대시보드는 항상 false */
    isDev: boolean
}

export type TStatusFilter = '2xx' | '4xx' | '5xx' | 'none'

export interface ILogFilters {
    host: string
    kind: TLogKind | ''
    statuses: TStatusFilter[]
    q: string
}
