import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'

import MeterBar from './MeterBar'

const meta = {
    title: 'Atoms/MeterBar',
    component: MeterBar,
    tags: ['autodocs'],
    args: { ratio: 0.6, tone: 'neutral' },
} satisfies Meta<typeof MeterBar>

export default meta
type TStory = StoryObj<typeof meta>

/** 표의 소요 막대 — 장식이라 접근성 트리에서 숨긴다 (값은 옆 글자가 전달) */
export const Neutral: TStory = {
    play: async ({ canvasElement }) => {
        const bar = canvasElement.querySelector('[aria-hidden="true"]')
        await expect(bar).not.toBeNull()
    },
}

export const Slow: TStory = { args: { ratio: 1, tone: 'danger' } }

export const Laggy: TStory = { args: { ratio: 0.9, tone: 'warning' } }

/** 호출 흐름 — 시작 위치가 있는 막대 */
export const Offset: TStory = {
    args: { start: 0.25, ratio: 0.5, tone: 'danger', size: 'lg' },
}
