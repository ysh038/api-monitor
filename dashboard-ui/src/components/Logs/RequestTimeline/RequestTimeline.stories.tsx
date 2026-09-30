import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn } from 'storybook/test'

import { makeScenario } from '../../../mocks/logFixtures'

import RequestTimeline from './RequestTimeline'

const rows = makeScenario()

const meta = {
    title: 'Logs/RequestTimeline',
    component: RequestTimeline,
    tags: ['autodocs'],
    args: { rows, selectedId: null, onSelect: fn() },
} satisfies Meta<typeof RequestTimeline>

export default meta
type TStory = StoryObj<typeof meta>

/** D5·D6: 요청 하나가 막대 하나, 누르면 그 요청 상세 */
export const Default: TStory = {
    play: async ({ canvas, canvasElement, userEvent, args }) => {
        await expect(canvas.getByRole('heading', { name: '시간대별 요청' })).toBeVisible()
        const bars = canvasElement.querySelectorAll('[data-bar-id]')
        await expect(bars).toHaveLength(rows.length)
        const target = canvasElement.querySelector(`[data-bar-id="${rows[3].id}"]`)
        if (!(target instanceof HTMLElement)) throw new Error('막대 없음')
        await userEvent.click(target)
        await expect(args.onSelect).toHaveBeenCalledWith(rows[3].id)
    },
}

export const Selected: TStory = {
    args: { selectedId: rows[3].id },
}

/** L8: 결과가 0건이어도 틀을 유지한다 (요구사항 변경: 예전에는 아무것도 그리지 않았다) */
export const Empty: TStory = {
    args: { rows: [] },
    play: async ({ canvas, canvasElement }) => {
        await expect(canvas.getByRole('heading', { name: '시간대별 요청' })).toBeVisible()
        await expect(canvasElement.querySelectorAll('[data-bar-id]')).toHaveLength(0)
    },
}

/** L8: 막대가 있을 때와 0건일 때 높이가 같다 */
export const StableHeight: TStory = {
    render: (args) => (
        <div style={{ display: 'grid', gap: 24, width: 900 }}>
            <div data-testid="with-bars">
                <RequestTimeline {...args} />
            </div>
            <div data-testid="empty">
                <RequestTimeline {...args} rows={[]} />
            </div>
        </div>
    ),
    play: async ({ canvas }) => {
        const heightOf = (id: string) => Math.round(canvas.getByTestId(id).getBoundingClientRect().height)
        await expect(heightOf('with-bars')).toBeGreaterThan(40)
        await expect(heightOf('empty')).toBe(heightOf('with-bars'))
    },
}
