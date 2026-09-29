import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, within } from 'storybook/test'

import { makeOutbound, makeRow, makeScenario } from '../../../mocks/logFixtures'

import LogTable from './LogTable'

const rows = makeScenario()
const payment = rows[3]

const meta = {
    title: 'Logs/LogTable',
    component: LogTable,
    tags: ['autodocs'],
    args: {
        rows,
        isGroupingSuccess: true,
        selectedId: null,
        newIds: new Set<number>(),
        hasFilter: false,
        hasMore: false,
        isLoading: false,
        isLoadingMore: false,
        onSelect: fn(),
        onLoadMore: fn(),
    },
} satisfies Meta<typeof LogTable>

export default meta
type TStory = StoryObj<typeof meta>

/** 참고 이미지 구성: 묶음 · 트리 · 공백 */
export const Scenario: TStory = {
    play: async ({ canvas }) => {
        await expect(canvas.getAllByText('정상 처리한 요청 2건')).toHaveLength(2)
        await expect(canvas.getByText(/19분 동안 기록된 요청이 없어요/)).toBeVisible()
        // C6: 부모 아래 들여쓴 외부 호출
        await expect(canvas.getByText('pg-gateway:9000')).toBeVisible()
    },
}

/** C5: 펼치기 → 묶였던 행이 보이고 접기로 바뀐다 */
export const ExpandGroup: TStory = {
    play: async ({ canvas, userEvent }) => {
        await expect(canvas.queryByText('/api/v1/receipts/f1')).toBeNull()
        const [expand] = canvas.getAllByRole('button', { name: /펼치기/ })
        await expect(expand).toHaveAttribute('aria-expanded', 'false')
        await userEvent.click(expand)
        await expect(canvas.getByText('/api/v1/receipts/f1')).toBeVisible()
        const collapse = canvas.getByRole('button', { name: /접기/ })
        await expect(collapse).toHaveAttribute('aria-expanded', 'true')
    },
}

/** C3: 묶기를 끄면 모든 행이 보인다 */
export const Ungrouped: TStory = {
    args: { isGroupingSuccess: false },
    play: async ({ canvas }) => {
        await expect(canvas.queryByText(/정상 처리한 요청/)).toBeNull()
        await expect(canvas.getByText('/api/v1/receipts/f1')).toBeVisible()
    },
}

/** C10: 클릭·Enter 로 선택 */
export const SelectRow: TStory = {
    play: async ({ canvas, userEvent, args }) => {
        const row = canvas.getByText('/api/v1/payments/7781').closest('tr')
        if (!row) throw new Error('행 없음')
        await userEvent.click(row)
        await expect(args.onSelect).toHaveBeenCalledWith(payment.id)
        row.focus()
        await userEvent.keyboard('{Enter}')
        await expect(args.onSelect).toHaveBeenCalledTimes(2)
    },
}

export const Selected: TStory = {
    args: { selectedId: payment.id },
    play: async ({ canvas }) => {
        const row = canvas.getByText('/api/v1/payments/7781').closest('tr')
        await expect(row).toHaveAttribute('aria-current', 'true')
    },
}

/** C6·C7: 백그라운드 · 외부 호출 N · MOCK */
export const Tags: TStory = {
    args: {
        rows: [
            makeOutbound(null, { targetHost: 'mq-broker:5672', path: '/publish', statusCode: 200 }),
            makeRow({ childCount: 3, statusCode: 500, path: '/api/v1/batch' }),
            makeRow({ isMock: true, statusCode: 404, path: '/api/v1/mock' }),
        ],
    },
    play: async ({ canvas }) => {
        await expect(canvas.getByText('백그라운드')).toBeVisible()
        await expect(canvas.getByText('외부 호출 3')).toBeVisible()
        await expect(canvas.getByText('MOCK')).toBeVisible()
    },
}

/** C8: 필터 없을 때 빈 문구 */
export const EmptyNoFilter: TStory = {
    args: { rows: [] },
    play: async ({ canvas }) => {
        await expect(canvas.getByRole('status')).toHaveTextContent('아직 수신된 로그가 없습니다.')
    },
}

/** C8: 필터 있을 때 빈 문구 */
export const EmptyWithFilter: TStory = {
    args: { rows: [], hasFilter: true },
    play: async ({ canvas }) => {
        await expect(canvas.getByRole('status')).toHaveTextContent('조건에 맞는 로그가 없습니다.')
    },
}

export const Loading: TStory = {
    args: { rows: [], isLoading: true },
    play: async ({ canvas }) => {
        await expect(canvas.getByRole('status')).toHaveTextContent('불러오는 중')
    },
}

/** C9: 더 보기 */
export const LoadMore: TStory = {
    args: { hasMore: true },
    play: async ({ canvas, userEvent, args }) => {
        await userEvent.click(canvas.getByRole('button', { name: '더 보기' }))
        await expect(args.onLoadMore).toHaveBeenCalled()
    },
}

/** 폴링으로 새로 들어온 행 강조 */
export const NewRows: TStory = {
    args: { newIds: new Set([payment.id]) },
    play: async ({ canvasElement }) => {
        const table = within(canvasElement)
        const row = table.getByText('/api/v1/payments/7781').closest('tr')
        await expect(row).toHaveAttribute('data-new', 'true')
    },
}
