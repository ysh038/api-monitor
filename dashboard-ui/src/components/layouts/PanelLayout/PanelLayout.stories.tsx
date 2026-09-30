import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'

import PanelLayout from './PanelLayout'

const meta = {
    title: 'Layouts/PanelLayout',
    component: PanelLayout,
    tags: ['autodocs'],
    args: {
        label: '요청 기록',
        top: <div>제목 · 필터 · 시간대별 요청</div>,
        body: <div>표 (가장자리까지)</div>,
    },
} satisfies Meta<typeof PanelLayout>

export default meta
type TStory = StoryObj<typeof meta>

export const Slots: TStory = {
    play: async ({ canvas, canvasElement }) => {
        await expect(canvas.getByRole('region', { name: '요청 기록' })).toBeVisible()
        await expect(canvasElement.querySelector('[data-slot="panel-top"]')).not.toBeNull()
        await expect(canvasElement.querySelector('[data-slot="panel-body"]')).not.toBeNull()
    },
}
