import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn } from 'storybook/test'

import RequestLogHeader from './RequestLogHeader'

const meta = {
    title: 'Logs/RequestLogHeader',
    component: RequestLogHeader,
    tags: ['autodocs'],
    args: {
        visibleCount: 38,
        totalCount: 38,
        isGroupingSuccess: true,
        onGroupingChange: fn(),
    },
} satisfies Meta<typeof RequestLogHeader>

export default meta
type TStory = StoryObj<typeof meta>

export const Default: TStory = {
    play: async ({ canvas, userEvent, args }) => {
        await expect(canvas.getByRole('heading', { name: '요청 기록' })).toBeVisible()
        await expect(canvas.getByText('38건 보는 중 · 전체 38건')).toBeVisible()
        await userEvent.click(canvas.getByRole('switch', { name: '성공한 요청 묶어 보기' }))
        await expect(args.onGroupingChange).toHaveBeenCalledWith(false)
    },
}

/** 서비스 건수를 아직 못 받았을 때 */
export const UnknownTotal: TStory = {
    args: { visibleCount: 1234, totalCount: null },
    play: async ({ canvas }) => {
        await expect(canvas.getByText('1,234건 보는 중')).toBeVisible()
    },
}
