import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn } from 'storybook/test'

import Button from './Button'

const meta = {
    title: 'Atoms/Button',
    component: Button,
    tags: ['autodocs'],
    args: {
        children: 'Mock 데이터 넣기',
        onClick: fn(),
    },
} satisfies Meta<typeof Button>

export default meta
type TStory = StoryObj<typeof meta>

/** 상단 바 — Mock 데이터 넣기 */
export const Soft: TStory = {
    args: { variant: 'soft' },
    play: async ({ canvas, userEvent, args }) => {
        const button = canvas.getByRole('button', { name: 'Mock 데이터 넣기' })
        await userEvent.tab()
        await expect(button).toHaveFocus()
        await userEvent.keyboard('{Enter}')
        await expect(args.onClick).toHaveBeenCalledTimes(1)
    },
}

/** 상단 바 — Mock 데이터 지우기 */
export const Secondary: TStory = {
    args: { variant: 'secondary', children: 'Mock 데이터 지우기' },
}

/** 목록 하단 — 더 보기 */
export const Outline: TStory = {
    args: { variant: 'outline', children: '더 보기' },
}

/** 묶음 펼치기·복사·해제 */
export const Link: TStory = {
    args: { variant: 'link', size: 'sm', children: '펼치기' },
}

/** 패널 닫기 (아이콘 버튼) */
export const Ghost: TStory = {
    args: { variant: 'ghost', children: '✕', 'aria-label': '닫기' },
    play: async ({ canvas, userEvent, args }) => {
        await userEvent.click(canvas.getByRole('button', { name: '닫기' }))
        await expect(args.onClick).toHaveBeenCalled()
    },
}

export const Disabled: TStory = {
    args: { variant: 'soft', disabled: true },
    play: async ({ canvas, userEvent, args }) => {
        await userEvent.click(canvas.getByRole('button'))
        await expect(args.onClick).not.toHaveBeenCalled()
    },
}
