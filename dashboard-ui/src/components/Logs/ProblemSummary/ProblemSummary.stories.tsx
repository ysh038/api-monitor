import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, within } from 'storybook/test'

import { BASE_TIME, makeOutbound, makeRow, makeScenario } from '../../../mocks/logFixtures'

import ProblemSummary from './ProblemSummary'

const rows = makeScenario()
const payment = rows[3]

const meta = {
    title: 'Logs/ProblemSummary',
    component: ProblemSummary,
    tags: ['autodocs'],
    args: { rows, onSelect: fn() },
} satisfies Meta<typeof ProblemSummary>

export default meta
type TStory = StoryObj<typeof meta>

/** P6·H4·L1: 반복되는 문제(최근 순, 최대 5개) · 외부 연결 상태 · 기준 안내 */
export const Default: TStory = {
    play: async ({ canvas, userEvent, args }) => {
        await expect(canvas.getByText('최근 14건 기준')).toBeVisible()

        const problems = within(canvas.getByRole('region', { name: '반복되는 문제' }))
        const items = problems.getAllByRole('button')
        await expect(items).toHaveLength(5)
        await expect(problems.getByText('외 1개')).toBeVisible()
        await expect(items[0]).toHaveTextContent('pg-gateway:9000 호출이 실패해서 이 요청도 실패했어요')
        await expect(items[0]).toHaveTextContent('GET /api/v1/payments/{id}')
        await userEvent.click(items[0])
        await expect(args.onSelect).toHaveBeenCalledWith(payment.id)

        const hosts = within(canvas.getByRole('region', { name: '외부 연결 상태' }))
        const hostItems = hosts.getAllByRole('button')
        await expect(hostItems.map((item) => item.textContent)).toEqual([
            expect.stringContaining('ai-server:8000'),
            expect.stringContaining('pg-gateway:9000'),
        ])
        await expect(hostItems[1]).toHaveTextContent('실패 · 타임아웃')
        await expect(hostItems[1]).toHaveTextContent('성공 기록 없음')
        await expect(hostItems[0]).toHaveTextContent('마지막 성공')
    },
}

/** P7·H4: 문제도 보낸 요청도 없을 때 */
export const Empty: TStory = {
    args: { rows: [makeRow(), makeRow({ statusCode: 201 })] },
    play: async ({ canvas }) => {
        await expect(canvas.getByText('최근 요청에서 문제가 없어요')).toBeVisible()
        await expect(canvas.getByText('보낸 요청이 없어요')).toBeVisible()
    },
}

/** 외부 서버가 모두 정상일 때 */
export const HealthyHosts: TStory = {
    args: {
        rows: [
            makeOutbound(null, { targetHost: 'ai-server:8000', statusCode: 200, durationMs: 450, createdAt: BASE_TIME }),
            makeOutbound(null, { targetHost: 'mq-broker:5672', statusCode: 204, durationMs: 12, createdAt: BASE_TIME }),
        ],
    },
    play: async ({ canvas }) => {
        await expect(canvas.getByText('정상 · 450ms')).toBeVisible()
    },
}

const heightOf = (el: Element | null) => Math.round(el?.getBoundingClientRect().height ?? -1)

/** L2: 항목 수(0~5)와 관계없이 높이가 같다 — 폴링으로 늘고 줄어도 아래 표가 움직이지 않는다 */
export const StableHeight: TStory = {
    parameters: {
        // 높이 비교를 위해 같은 컴포넌트를 세 번 그려서 같은 이름의 영역이 겹친다 — 실제 화면에는 하나뿐
        a11y: { config: { rules: [{ id: 'landmark-unique', enabled: false }] } },
    },
    render: (args) => (
        <div style={{ display: 'grid', gap: 24, width: 960 }}>
            <div data-testid="full">
                <ProblemSummary {...args} rows={rows} />
            </div>
            <div data-testid="one">
                <ProblemSummary {...args} rows={[makeRow({ statusCode: 500 })]} />
            </div>
            <div data-testid="empty">
                <ProblemSummary {...args} rows={[]} />
            </div>
        </div>
    ),
    play: async ({ canvas }) => {
        const full = heightOf(canvas.getByTestId('full'))
        await expect(full).toBeGreaterThan(150)
        await expect(heightOf(canvas.getByTestId('one'))).toBe(full)
        await expect(heightOf(canvas.getByTestId('empty'))).toBe(full)
    },
}

/** L1: 불러온 행이 100건을 넘어도 최신 100건만 본다 — 101번째 이후의 문제는 세지 않는다 */
export const LatestHundredOnly: TStory = {
    args: {
        rows: [
            ...Array.from({ length: 100 }, (_, i) => makeRow({ id: 2000 - i, statusCode: 200, createdAt: BASE_TIME - i * 1000 })),
            makeRow({ id: 1, statusCode: 500, path: '/api/v1/old-failure', createdAt: BASE_TIME - 999_000 }),
        ],
    },
    play: async ({ canvas }) => {
        await expect(canvas.getByText('최근 100건 기준')).toBeVisible()
        await expect(canvas.getByText('최근 요청에서 문제가 없어요')).toBeVisible()
    },
}
