import type { ILogRow } from '../../types/log'

export const PAGE_SIZE = 100
export const POLL_LIMIT = 500
export const POLL_INTERVAL_MS = 5000
export const FLASH_MESSAGE_MS = 2500
export const SEARCH_DEBOUNCE_MS = 300

/** 폴링으로 받은 더 새로운 행을 앞에 붙인다. 이미 있는 id 는 건너뛴다 */
export function mergeNewer(
    existing: ILogRow[],
    incoming: ILogRow[],
): { rows: ILogRow[]; newIds: number[] } {
    const known = new Set(existing.map((row) => row.id))
    const fresh = incoming.filter((row) => !known.has(row.id))
    if (fresh.length === 0) return { rows: existing, newIds: [] }
    return { rows: [...fresh, ...existing], newIds: fresh.map((row) => row.id) }
}

export const shouldPoll = ({
    isAutoRefresh,
    isDocumentHidden,
}: {
    isAutoRefresh: boolean
    isDocumentHidden: boolean
}) => isAutoRefresh && !isDocumentHidden

/** 서비스 목록은 10초마다 = 5초 폴링 두 번에 한 번 */
export const isServicesRefreshTick = (tick: number) => tick % 2 === 0

export const hasMorePages = (lastPageLength: number) => lastPageLength >= PAGE_SIZE

export const getDocumentTitle = (isDev: boolean) =>
    isDev ? 'API Monitor (DEV)' : 'API Monitor'
