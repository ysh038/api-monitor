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

export const Empty: TStory = {
    args: { rows: [] },
    play: async ({ canvas }) => {
        await expect(canvas.queryByRole('heading')).toBeNull()
    },
}
