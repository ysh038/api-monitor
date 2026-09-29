import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn } from 'storybook/test'

import StatCard from './StatCard'

const meta = {
    title: 'Atoms/StatCard',
    component: StatCard,
    tags: ['autodocs'],
    args: {
        title: 'pg-gateway:9000',
        description: '2건 모두 실패했어요',
        tone: 'danger',
        isPressed: false,
        onClick: fn(),
    },
} satisfies Meta<typeof StatCard>

export default meta
type TStory = StoryObj<typeof meta>

/** 요약의 외부 서버 카드 — 누르면 그 서버로 좁힌다 */
export const Default: TStory = {
    play: async ({ canvas, userEvent, args }) => {
        const card = canvas.getByRole('button', { name: /pg-gateway:9000/ })
        await expect(card).toHaveAttribute('aria-pressed', 'false')
        await userEvent.click(card)
        await expect(args.onClick).toHaveBeenCalled()
    },
}

export const Pressed: TStory = {
    args: { isPressed: true },
    play: async ({ canvas }) => {
        await expect(canvas.getByRole('button')).toHaveAttribute('aria-pressed', 'true')
    },
}
