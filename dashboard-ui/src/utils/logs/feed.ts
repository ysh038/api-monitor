import type { ILogRow } from '../../types/log'

export const PAGE_SIZE = 100
export const POLL_LIMIT = 500
export const POLL_INTERVAL_MS = 5000
export const FLASH_MESSAGE_MS = 2500
export const SEARCH_DEBOUNCE_MS = 300
/**
 * 폴링으로 붙는 행의 안전 상한 (spec G4a). 개발·설치 현장의 적은 트래픽에서는 닿지 않고,
 * 트래픽이 많은 곳에 탭을 오래 켜 둘 때 목록이 끝없이 커지는 것만 막는다.
 */
export const MAX_FEED_ROWS = 1000

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

/**
 * 폴링 결과를 페이지 목록 앞에 붙인다. 폴링 때문에 상한을 넘으면 가장 오래된 행부터 뺀다.
 * "더 보기"로 사용자가 이미 불러온 만큼은 줄이지 않는다 — 상한 = max(maxRows, 폴링 직전 행 수).
 * 행을 뺐으면 남은 행을 한 페이지로 합친다: 마지막 페이지가 꽉 차 있어 "더 보기"가 남고,
 * 누르면 남은 맨 아래 행보다 오래된 것(뺀 행)부터 다시 받는다.
 */
export function mergePolledPages(
    pages: ILogRow[][],
    incoming: ILogRow[],
    maxRows: number,
): { pages: ILogRow[][]; newIds: number[]; isTrimmed: boolean } {
    const existing = pages.flat()
    const merged = mergeNewer(existing, incoming)
    if (merged.newIds.length === 0) return { pages, newIds: [], isTrimmed: false }
    const cap = Math.max(maxRows, existing.length)
    if (merged.rows.length <= cap) {
        const fresh = merged.rows.slice(0, merged.newIds.length)
        return { pages: [fresh, ...pages], newIds: merged.newIds, isTrimmed: false }
    }
    return { pages: [merged.rows.slice(0, cap)], newIds: merged.newIds, isTrimmed: true }
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
