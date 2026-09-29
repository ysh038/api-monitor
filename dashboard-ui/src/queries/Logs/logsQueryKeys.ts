import type { ILogFilters } from '../../types/log'

export const logsQueryKeys = {
    all: ['logs'] as const,
    feeds: () => [...logsQueryKeys.all, 'feed'] as const,
    feed: (filters: ILogFilters) => [...logsQueryKeys.feeds(), filters] as const,
    details: () => [...logsQueryKeys.all, 'detail'] as const,
    detail: (id: number) => [...logsQueryKeys.details(), id] as const,
}
