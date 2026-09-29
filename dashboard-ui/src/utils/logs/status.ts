import type { ILogRow } from '../../types/log'

/** design-system 컴포넌트의 tone prop 과 같은 값 집합 */
export type TTone = 'neutral' | 'success' | 'info' | 'warning' | 'danger'

const SLOW_MS = 3000
const LAGGY_MS = 1000

export function getStatusTone(code: number | null): TTone {
    if (code === null || code >= 500) return 'danger'
    if (code >= 400) return 'warning'
    if (code >= 300 || code < 200) return 'info'
    return 'success'
}

export const getStatusLabel = (code: number | null) =>
    code === null ? '응답 없음' : String(code)

export function getStatusCategory(code: number | null): string {
    if (code === null) return '응답 없음'
    if (code >= 500) return '서버 오류'
    if (code >= 400) return '요청 거부'
    if (code >= 300) return '리다이렉트'
    return '정상'
}

const REASON_PHRASES: Record<number, string> = {
    200: 'OK',
    201: 'Created',
    202: 'Accepted',
    204: 'No Content',
    301: 'Moved Permanently',
    302: 'Found',
    304: 'Not Modified',
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    405: 'Method Not Allowed',
    409: 'Conflict',
    413: 'Payload Too Large',
    415: 'Unsupported Media Type',
    422: 'Unprocessable Entity',
    429: 'Too Many Requests',
    500: 'Internal Server Error',
    501: 'Not Implemented',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
    504: 'Gateway Timeout',
}

/** 500 Internal Server Error */
export function getStatusText(code: number | null): string {
    if (code === null) return '응답 없음'
    const reason = REASON_PHRASES[code]
    return reason ? `${code} ${reason}` : String(code)
}

/** 실패 = 5xx 또는 응답 없음 (서버 api/services 의 errors 와 같은 정의) */
export const isFailure = (row: ILogRow) =>
    row.statusCode === null || row.statusCode >= 500

/** 정상 = 2xx·3xx 이고 예외 없음 */
export const isSuccessRow = (row: ILogRow) =>
    row.statusCode !== null && row.statusCode < 400 && !row.exceptionClass

export function getDurationTone(ms: number | null): TTone {
    if (ms === null) return 'neutral'
    if (ms >= SLOW_MS) return 'danger'
    if (ms >= LAGGY_MS) return 'warning'
    return 'neutral'
}

/** 소요 막대 길이 0~1. 짧은 호출도 구분되도록 로그 스케일, 3초 = 1 */
export function getDurationRatio(ms: number | null): number {
    if (ms === null || ms <= 0) return 0
    return Math.min(1, Math.log10(ms + 1) / Math.log10(SLOW_MS + 1))
}

/** 4xx 이하로 처리된 예외는 warning, 5xx·응답 없음은 danger */
export const getExceptionTone = (row: ILogRow): TTone =>
    row.statusCode !== null && row.statusCode < 500 ? 'warning' : 'danger'

export const shortClassName = (className: string | null) =>
    className ? (className.split('.').pop() ?? '') : ''
