// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { BASE_TIME, makeRow, makeScenario } from '../../../mocks/logFixtures'
import type { ILogRow } from '../../../types/log'

import LogTable from './LogTable'

// 행 하나가 그려질 때마다 StatusText 가 한 번 불린다 → 행 렌더 횟수를 센다
const renders = vi.hoisted(() => ({ count: 0 }))
vi.mock('../LogParts', async (importOriginal) => {
    const original = await importOriginal<typeof import('../LogParts')>()
    return {
        ...original,
        StatusText: (props: Parameters<typeof original.StatusText>[0]) => {
            renders.count += 1
            return original.StatusText(props)
        },
    }
})

const NO_IDS: ReadonlySet<number> = new Set()
const onSelect = vi.fn()
const onLoadMore = vi.fn()

const renderTable = (rows: ILogRow[]) =>
    render(
        <LogTable
            rows={rows}
            isGroupingSuccess
            selectedId={null}
            newIds={NO_IDS}
            hasFilter={false}
            hasMore={false}
            isLoading={false}
            isLoadingMore={false}
            isUpdating={false}
            onSelect={onSelect}
            onLoadMore={onLoadMore}
        />,
    )

beforeEach(() => {
    renders.count = 0
    vi.useFakeTimers()
})

afterEach(() => {
    vi.useRealTimers()
})

describe('아코디언 성능 (C5b)', () => {
    it('① 묶음을 펼쳐도 묶음 밖 행은 다시 렌더링하지 않는다', () => {
        renderTable(makeScenario())
        const before = renders.count
        const [toggle] = screen.getAllByRole('button', { name: '정상 처리한 요청 2건' })
        act(() => {
            fireEvent.click(toggle)
        })
        act(() => {
            vi.runAllTimers()
        })
        // 새로 그려진 것은 펼친 묶음의 2행뿐
        expect(renders.count - before).toBe(2)
    })

    it('③ 30행을 넘는 묶음은 애니메이션 없이 바로 여닫는다', () => {
        const many = Array.from({ length: 31 }, (_, i) =>
            makeRow({ path: `/ok/${i}`, createdAt: BASE_TIME - i * 1000 }),
        )
        const { container } = renderTable(many)
        const [toggle] = screen.getAllByRole('button', { name: '정상 처리한 요청 31건' })

        act(() => {
            fireEvent.click(toggle)
        })
        expect(container.querySelectorAll('[data-grouped="true"]')).toHaveLength(31)
        expect(container.querySelectorAll('[data-collapse]')).toHaveLength(0)

        act(() => {
            fireEvent.click(toggle)
        })
        // 타이머를 돌리지 않아도 바로 사라진다
        expect(container.querySelectorAll('[data-grouped="true"]')).toHaveLength(0)
    })
})
