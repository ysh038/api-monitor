import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, waitFor, within } from 'storybook/test'

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
        isUpdating: false,
        onSelect: fn(),
        onLoadMore: fn(),
    },
} satisfies Meta<typeof LogTable>

export default meta
type TStory = StoryObj<typeof meta>

/** 참고 이미지 구성: 묶음 · 트리 */
export const Scenario: TStory = {
    play: async ({ canvas }) => {
        await expect(canvas.getAllByText('정상 처리한 요청 2건')).toHaveLength(2)
        // C4 제거: 시간 공백 줄은 없다
        await expect(canvas.queryByText(/동안 기록된 요청이 없어요/)).toBeNull()
        // C6: 부모 아래 들여쓴 외부 호출
        await expect(canvas.getByText('pg-gateway:9000')).toBeVisible()
    },
}

/** C5: 묶음 줄은 건수만 — 줄 전체를 누르면 펼쳐지고, 펼친 행은 세로선으로 묶음 표시 */
export const ExpandGroup: TStory = {
    play: async ({ canvas, canvasElement, userEvent }) => {
        const [group] = canvas.getAllByRole('button', { name: '정상 처리한 요청 2건' })
        await expect(group).toHaveAttribute('aria-expanded', 'false')
        // 접힌 줄에는 경로·시각 범위가 없다
        await expect(canvas.queryByText('/api/v1/receipts/f1')).toBeNull()
        await expect(canvas.queryByText(/\d{2}:\d{2}:\d{2} – \d{2}:\d{2}:\d{2}/)).toBeNull()
        await expect(canvasElement.querySelectorAll('[data-grouped="true"]')).toHaveLength(0)

        await userEvent.click(group)
        await expect(group).toHaveAttribute('aria-expanded', 'true')
        await expect(canvas.getByText('/api/v1/receipts/f1')).toBeVisible()
        await expect(canvasElement.querySelectorAll('[data-grouped="true"]')).toHaveLength(2)

        // 키보드로 다시 접기
        group.focus()
        await userEvent.keyboard('{Enter}')
        await expect(group).toHaveAttribute('aria-expanded', 'false')
        // C5a: 줄어드는 애니메이션이 끝난 뒤에 사라진다
        await waitFor(() => expect(canvas.queryByText('/api/v1/receipts/f1')).toBeNull())
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

/** C6·C7: 백그라운드 · 보낸 요청 N · MOCK */
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
        await expect(canvas.getByText('보낸 요청 3')).toBeVisible()
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

/** S1·S2·S4: 필터를 바꾸는 중 — 이전 결과를 그대로 보이며 갱신 중 표시, 더 보기 잠금 */
export const Updating: TStory = {
    args: { isUpdating: true, hasMore: true, hasFilter: true },
    play: async ({ canvas }) => {
        const table = canvas.getByRole('table')
        await expect(table.closest('[aria-busy]')).toHaveAttribute('aria-busy', 'true')
        await expect(canvas.getByRole('progressbar', { name: '새 결과를 불러오는 중' })).toBeInTheDocument()
        await expect(canvas.getByText('pg-gateway:9000')).toBeVisible()
        await expect(canvas.queryByText('불러오는 중이에요…')).toBeNull()
        await expect(canvas.queryByText('조건에 맞는 로그가 없습니다.')).toBeNull()
        await expect(canvas.getByRole('button', { name: '더 보기' })).toBeDisabled()
    },
}

/** S3: 갱신이 끝나면 aria-busy 가 풀린다 */
export const NotUpdating: TStory = {
    args: { hasMore: true },
    play: async ({ canvas }) => {
        const table = canvas.getByRole('table')
        await expect(table.closest('[aria-busy]')).toHaveAttribute('aria-busy', 'false')
        await expect(canvas.queryByRole('progressbar')).toBeNull()
        await expect(canvas.getByRole('button', { name: '더 보기' })).toBeEnabled()
    },
}

/** C5: 묶음 줄은 구분선이 아니라 표의 한 행 — 같은 칸·같은 배경, 상태 칸 2xx, 서비스 칸은 공통 서비스 */
export const GroupLooksLikeARow: TStory = {
    play: async ({ canvas }) => {
        const [toggle] = canvas.getAllByRole('button', { name: '정상 처리한 요청 2건' })
        const groupRow = toggle.closest('tr')
        const dataRow = canvas.getByText('/api/v1/payments/7781').closest('tr')
        if (!groupRow || !dataRow) throw new Error('행 없음')
        const cells = groupRow.querySelectorAll('td')
        await expect(cells).toHaveLength(dataRow.querySelectorAll('td').length)
        await expect(getComputedStyle(groupRow).backgroundColor).toBe(
            getComputedStyle(canvas.getByText('/api/v1/risk-scores').closest('tr') as Element).backgroundColor,
        )
        await expect(cells[0]).toHaveTextContent('2xx')
        await expect(cells[1]).toHaveTextContent('order-api')
        await expect(cells[3]).toHaveTextContent('정상 처리한 요청 2건')
    },
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const heightOf = (el: Element | null) => el?.getBoundingClientRect().height ?? -1
const topOf = (el: Element | null) => el?.getBoundingClientRect().top ?? -1

/**
 * C5a: 아코디언 — 묶였던 행은 0에서 서서히 늘고 줄며, 아래 행은 그 속도대로 함께 움직인다
 * (미리 점프하지 않는다).
 */
export const AccordionAnimation: TStory = {
    play: async ({ canvas, canvasElement, userEvent }) => {
        const [group] = canvas.getAllByRole('button', { name: '정상 처리한 요청 2건' })
        const below = canvas.getByText('/api/v1/payments/7781').closest('tr')
        const topClosed = topOf(below)

        await userEvent.click(group)
        const firstGrouped = () => canvasElement.querySelector('[data-grouped="true"]')
        // 펼친 직후: 묶인 행은 아직 거의 높이가 없다 → 아래 행도 거의 안 움직였다
        await expect(heightOf(firstGrouped())).toBeLessThan(8)
        // C5b ②: 프레임을 기다리지 않고 바로 늘기 시작한다 — 두 프레임 뒤엔 이미 높이가 있다
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
        await expect(heightOf(firstGrouped())).toBeGreaterThan(0.5)
        await sleep(140)
        // 도중: 행 높이도, 아래 행 위치도 처음과 끝 사이
        const midHeight = heightOf(firstGrouped())
        const midTop = topOf(below)
        await expect(midHeight).toBeGreaterThan(2)
        await sleep(400)
        const fullHeight = heightOf(firstGrouped())
        const topOpen = topOf(below)
        await expect(midHeight).toBeLessThan(fullHeight - 2)
        await expect(midTop).toBeGreaterThan(topClosed + 1)
        await expect(midTop).toBeLessThan(topOpen - 1)
        await expect(fullHeight).toBeGreaterThan(25)

        // 접기: 누른 직후에는 아직 남아 있고, 줄어드는 도중을 거쳐, 끝나면 사라진다
        await userEvent.click(group)
        await expect(firstGrouped()).not.toBeNull()
        await sleep(140)
        await expect(heightOf(firstGrouped())).toBeLessThan(fullHeight - 2)
        await expect(topOf(below)).toBeGreaterThan(topClosed + 1)
        await sleep(400)
        await expect(firstGrouped()).toBeNull()
        await expect(Math.round(topOf(below))).toBe(Math.round(topClosed))
    },
}
