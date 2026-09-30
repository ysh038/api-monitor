// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { makeRow } from '../../mocks/logFixtures'
import type { ILogFilters, ILogRow } from '../../types/log'
import { EMPTY_FILTERS } from '../../utils/logs/filterState'

import { fetchLogs } from './logsApi'
import { useLogFeedQuery } from './useLogFeedQuery'

vi.mock('./logsApi', () => ({ fetchLogs: vi.fn() }))
const fetchLogsMock = vi.mocked(fetchLogs)

function deferred<TValue>() {
    let resolve!: (value: TValue) => void
    const promise = new Promise<TValue>((r) => {
        resolve = r
    })
    return { promise, resolve }
}

function wrapper({ children }: { children: ReactNode }) {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    return createElement(QueryClientProvider, { client }, children)
}

const ALL_ROWS: ILogRow[] = [makeRow({ id: 3 }), makeRow({ id: 2 }), makeRow({ id: 1 })]
const INBOUND_ROWS: ILogRow[] = [makeRow({ id: 2 })]
const INBOUND: ILogFilters = { ...EMPTY_FILTERS, kind: 'INBOUND' }

afterEach(() => {
    fetchLogsMock.mockReset()
})

describe('필터 변경 중 이전 결과 유지 (dashboard-smooth-filter)', () => {
    it('S5: 처음에는 불러오는 중이고 행이 없다', async () => {
        const first = deferred<ILogRow[]>()
        fetchLogsMock.mockReturnValueOnce(first.promise)
        const { result } = renderHook(() => useLogFeedQuery(EMPTY_FILTERS), { wrapper })
        expect(result.current.isLoading).toBe(true)
        expect(result.current.rows).toEqual([])
        first.resolve(ALL_ROWS)
        await waitFor(() => expect(result.current.rows).toHaveLength(3))
    })

    it('S1·S2·S3: 필터를 바꾸면 새 결과가 올 때까지 이전 결과를 보이고 isUpdating 이다', async () => {
        fetchLogsMock.mockResolvedValueOnce(ALL_ROWS)
        const { result, rerender } = renderHook(({ filters }) => useLogFeedQuery(filters), {
            wrapper,
            initialProps: { filters: EMPTY_FILTERS },
        })
        await waitFor(() => expect(result.current.rows).toHaveLength(3))
        expect(result.current.isUpdating).toBe(false)

        const next = deferred<ILogRow[]>()
        fetchLogsMock.mockReturnValueOnce(next.promise)
        rerender({ filters: INBOUND })

        await waitFor(() => expect(result.current.isUpdating).toBe(true))
        expect(result.current.rows.map((r) => r.id)).toEqual([3, 2, 1])
        expect(result.current.isLoading).toBe(false)

        next.resolve(INBOUND_ROWS)
        await waitFor(() => expect(result.current.rows.map((r) => r.id)).toEqual([2]))
        expect(result.current.isUpdating).toBe(false)
    })
})
