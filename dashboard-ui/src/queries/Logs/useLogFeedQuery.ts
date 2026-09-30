import {
    keepPreviousData,
    useInfiniteQuery,
    useQueryClient,
    type InfiniteData,
} from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'

import type { ILogFilters, ILogRow } from '../../types/log'
import {
    hasMorePages,
    MAX_FEED_ROWS,
    mergePolledPages,
    PAGE_SIZE,
    POLL_LIMIT,
} from '../../utils/logs/feed'

import { fetchLogs } from './logsApi'
import { logsQueryKeys } from './logsQueryKeys'

type TFeedData = InfiniteData<ILogRow[], number | null>

/**
 * 로그 목록 (최신순). 첫 페이지 + "더 보기"(beforeId) 는 무한 쿼리 페이지이고,
 * 5초 폴링(afterId)으로 받은 새 행은 캐시 맨 앞에 페이지로 끼워 넣는다.
 * 폴링 때문에 MAX_FEED_ROWS 를 넘으면 가장 오래된 행부터 뺀다 (spec G4a).
 *
 * 캐시가 폴링으로만 갱신되도록 자동 재요청은 모두 끈다 — 무한 쿼리를 재요청하면
 * 모든 페이지를 다시 받는데, 폴링으로 끼운 페이지 때문에 중복이 생긴다.
 * 처음부터 다시 받을 때는 resetQueries 로 첫 페이지만 받는다.
 *
 * 필터를 바꾸면 새 결과가 올 때까지 이전 결과를 그대로 보여 준다 (keepPreviousData).
 * 그동안 isUpdating 이 true 다 — 빈 표·"불러오는 중"으로 깜빡이지 않게 (dashboard-smooth-filter).
 */
export function useLogFeedQuery(filters: ILogFilters) {
    const queryClient = useQueryClient()
    const queryKey = useMemo(() => logsQueryKeys.feed(filters), [filters])

    const query = useInfiniteQuery({
        queryKey,
        queryFn: ({ pageParam, signal }) =>
            fetchLogs(
                filters,
                { beforeId: pageParam ?? undefined, limit: PAGE_SIZE },
                signal,
            ),
        initialPageParam: null as number | null,
        getNextPageParam: (lastPage) =>
            hasMorePages(lastPage.length) ? lastPage[lastPage.length - 1].id : undefined,
        staleTime: Infinity,
        // 필터를 바꿨다 돌아오면 기존 화면처럼 새로 받는다
        gcTime: 0,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        placeholderData: keepPreviousData,
    })

    const rows = useMemo(() => query.data?.pages.flat() ?? [], [query.data])

    /** 더 새로운 행을 받아 앞에 붙이고, 새로 붙은 id 를 돌려준다 */
    const pollNewer = useCallback(async (): Promise<number[]> => {
        const current = queryClient.getQueryData<TFeedData>(queryKey)
        if (!current) return []
        const maxId = current.pages.find((page) => page.length > 0)?.[0]?.id ?? 0
        const incoming = await fetchLogs(filters, { afterId: maxId, limit: POLL_LIMIT })
        let newIds: number[] = []
        queryClient.setQueryData<TFeedData>(queryKey, (old) => {
            if (!old) return old
            const merged = mergePolledPages(old.pages, incoming, MAX_FEED_ROWS)
            newIds = merged.newIds
            if (newIds.length === 0) return old
            return {
                pages: merged.pages,
                pageParams: merged.isTrimmed ? [null] : [null, ...old.pageParams],
            }
        })
        return newIds
    }, [queryClient, queryKey, filters])

    return {
        rows,
        isLoading: query.isPending,
        /** 필터를 바꿔 새 결과를 기다리는 중 (rows 는 이전 필터의 결과) */
        isUpdating: query.isPlaceholderData,
        isError: query.isError,
        hasMore: query.hasNextPage,
        isLoadingMore: query.isFetchingNextPage,
        loadMore: query.fetchNextPage,
        dataUpdatedAt: query.dataUpdatedAt,
        pollNewer,
    }
}
