import type { ILogFilters } from '../types/log'

/**
 * API 경로는 전부 상대경로다. Node 서버(/)와 스타터 내장 대시보드(/_api-monitor/)
 * 양쪽에서 같은 빌드가 동작해야 하므로 앞에 / 를 붙이지 않는다 (MIGRATION.md).
 */
export const LOGS_URL = 'api/logs'
export const SERVICES_URL = 'api/services'
export const HEALTH_URL = 'api/health'
export const DEV_MOCK_URL = 'api/dev/mock'

export interface ILogCursor {
    /** 이 id 보다 새로운 것만 (폴링) */
    afterId?: number
    /** 이 id 보다 오래된 것 (더 보기) */
    beforeId?: number
    limit: number
}

export function buildLogsUrl(filters: ILogFilters, cursor: ILogCursor): string {
    const params = new URLSearchParams()
    if (filters.service) params.set('service', filters.service)
    if (filters.host) params.set('host', filters.host)
    if (filters.kind) params.set('kind', filters.kind)
    if (filters.statuses.length) params.set('status', filters.statuses.join(','))
    if (filters.isExceptionOnly) params.set('exception', '1')
    if (filters.q) params.set('q', filters.q)
    if (cursor.afterId !== undefined) params.set('afterId', String(cursor.afterId))
    if (cursor.beforeId !== undefined) params.set('beforeId', String(cursor.beforeId))
    params.set('limit', String(cursor.limit))
    return `${LOGS_URL}?${params}`
}

export const buildLogDetailUrl = (id: number) => `${LOGS_URL}/${id}`
