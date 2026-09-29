import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'

import DashboardLayout from './DashboardLayout'

const meta = {
    title: 'Layouts/DashboardLayout',
    component: DashboardLayout,
    tags: ['autodocs'],
    parameters: { layout: 'fullscreen' },
    args: {
        topbar: <div>상단 바</div>,
        summary: <div>요약</div>,
        children: <div>요청 기록</div>,
        overlay: null,
    },
} satisfies Meta<typeof DashboardLayout>

export default meta
type TStory = StoryObj<typeof meta>

/** 슬롯: topbar · summary · main · overlay */
export const Slots: TStory = {
    play: async ({ canvas, canvasElement }) => {
        await expect(canvas.getByRole('main')).toHaveTextContent('요청 기록')
        for (const slot of ['topbar', 'summary', 'main']) {
            await expect(canvasElement.querySelector(`[data-slot="${slot}"]`)).not.toBeNull()
        }
    },
}
