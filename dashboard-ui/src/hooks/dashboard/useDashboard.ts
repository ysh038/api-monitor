import { useCallback, useEffect, useMemo, useState } from 'react'

import { useDevMockMutations } from '../../queries/DevMock'
import { useServerHealth } from '../../queries/Health'
import { useLogDetailQuery, useLogFeedQuery } from '../../queries/Logs'
import { useServicesQuery } from '../../queries/Services'
import type { ILogFilters, TLogKind, TStatusFilter } from '../../types/log'
import {
    FLASH_MESSAGE_MS,
    getDocumentTitle,
    isServicesRefreshTick,
    POLL_INTERVAL_MS,
    SEARCH_DEBOUNCE_MS,
    shouldPoll,
} from '../../utils/logs/feed'
import {
    changeKind,
    hasAnyFilter,
    parseHash,
    toggleStatus,
} from '../../utils/logs/filterState'
import { getTotalCount } from '../../utils/logs/serviceOptions'
import { getDevServerNotice } from '../../utils/devServer'
import { useDebouncedValue, useFlashMessage, useTheme } from '../shared'

import { useHashState } from './useHashState'

const EMPTY_IDS: ReadonlySet<number> = new Set()

/** 대시보드 화면 상태·데이터 조합. 페이지는 이 훅을 부르고 조립만 한다 */
export function useDashboard() {
    // 검색어: 입력은 바로 보이고, 필터(요청·URL)에는 300ms 멈춘 뒤 반영
    const [searchText, setSearchText] = useState(() => parseHash(window.location.hash).filters.q)
    const [hashState, setHashState, writeHash] = useHashState((next) => setSearchText(next.filters.q))
    const { selectedId } = hashState
    const debouncedQ = useDebouncedValue(searchText.trim(), SEARCH_DEBOUNCE_MS)
    const filters: ILogFilters = useMemo(
        () => ({ ...hashState.filters, q: debouncedQ }),
        [hashState.filters, debouncedQ],
    )

    useEffect(() => {
        writeHash({ filters, selectedId })
    }, [filters, selectedId, writeHash])

    const updateFilters = useCallback(
        (update: (prev: ILogFilters) => ILogFilters) =>
            setHashState((prev) => ({ ...prev, filters: update(prev.filters) })),
        [setHashState],
    )
    const selectRow = useCallback(
        (id: number | null) => setHashState((prev) => ({ ...prev, selectedId: id })),
        [setHashState],
    )
    const closeDetail = useCallback(() => selectRow(null), [selectRow])

    // ---------- 데이터 ----------
    const feed = useLogFeedQuery(filters)
    const services = useServicesQuery()
    const detailQuery = useLogDetailQuery(selectedId)
    const health = useServerHealth()
    const isDev = health.isDev
    const mock = useDevMockMutations()
    // Vite 개발 서버에서만: API 서버가 꺼져 있거나 운영 모드면 안내 (운영 빌드에서는 항상 null)
    const devServerNotice = getDevServerNotice({
        isViteDev: import.meta.env.DEV,
        healthStatus: health.status,
        isDev,
    })
    const theme = useTheme()

    useEffect(() => {
        document.title = getDocumentTitle(isDev)
    }, [isDev])

    // ---------- 자동 갱신: 5초마다 새 행, 10초마다 서비스 건수 ----------
    const [isAutoRefresh, setAutoRefresh] = useState(true)
    const [isGroupingSuccess, setGroupingSuccess] = useState(true)
    const [lastPolledAt, setLastPolledAt] = useState<number | null>(null)
    // 새 행 강조는 그 행을 받은 필터에서만 — 필터가 바뀌면 자연히 비어 보인다
    const [flash, setFlash] = useState<{ filters: ILogFilters; ids: ReadonlySet<number> }>({
        filters,
        ids: EMPTY_IDS,
    })
    const { pollNewer } = feed
    const { refetch: refetchServices } = services

    useEffect(() => {
        let tick = 0
        const timer = setInterval(async () => {
            if (!shouldPoll({ isAutoRefresh, isDocumentHidden: document.hidden })) return
            tick += 1
            try {
                const ids = await pollNewer()
                setLastPolledAt(Date.now())
                if (ids.length > 0) setFlash({ filters, ids: new Set(ids) })
                if (isServicesRefreshTick(tick)) await refetchServices()
            } catch {
                // 서버 재시작 중 등은 다음 주기에 다시 시도한다
            }
        }, POLL_INTERVAL_MS)
        return () => clearInterval(timer)
    }, [isAutoRefresh, pollNewer, refetchServices, filters])

    const lastUpdatedAt =
        feed.dataUpdatedAt || lastPolledAt
            ? Math.max(feed.dataUpdatedAt, lastPolledAt ?? 0)
            : null

    // ---------- 개발 모드 Mock ----------
    const [devMessage, showDevMessage] = useFlashMessage(FLASH_MESSAGE_MS)
    const insertMock = async () => {
        try {
            showDevMessage(`Mock ${await mock.insertMock()}건 추가`)
        } catch {
            showDevMessage('Mock 데이터를 넣지 못했어요')
        }
    }
    const deleteMock = async () => {
        try {
            const deleted = await mock.deleteMock()
            closeDetail()
            showDevMessage(`Mock ${deleted}건 삭제`)
        } catch {
            showDevMessage('Mock 데이터를 지우지 못했어요')
        }
    }

    return {
        // 상단 바
        isDev,
        devServerNotice,
        themePreference: theme.preference,
        setThemePreference: theme.setPreference,
        isAutoRefresh,
        setAutoRefresh,
        lastUpdatedAt,
        devMessage,
        isMockPending: mock.isPending,
        insertMock,
        deleteMock,
        // 필터
        filters,
        searchText,
        setSearchText,
        hasFilter: hasAnyFilter(filters),
        totalCount: getTotalCount(services.data),
        changeKind: (kind: TLogKind | '') => updateFilters((f) => changeKind(f, kind)),
        toggleStatus: (status: TStatusFilter) => updateFilters((f) => toggleStatus(f, status)),
        // 목록
        rows: feed.rows,
        isLoading: feed.isLoading,
        isUpdating: feed.isUpdating,
        hasMore: feed.hasMore,
        isLoadingMore: feed.isLoadingMore,
        loadMore: () => void feed.loadMore(),
        newIds: flash.filters === filters ? flash.ids : EMPTY_IDS,
        isGroupingSuccess,
        setGroupingSuccess,
        // 상세
        selectedId,
        selectRow,
        closeDetail,
        detail: detailQuery.isError ? null : detailQuery.data,
        isDetailLoading: detailQuery.isFetching && detailQuery.data === undefined,
    }
}
