import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'

import Card from './Card'

const meta = {
    title: 'Atoms/Card',
    component: Card,
    tags: ['autodocs'],
    args: { children: '요청 기록', label: '요청 기록' },
} satisfies Meta<typeof Card>

export default meta
type TStory = StoryObj<typeof meta>

/** 요청 기록·상세 섹션 카드 */
export const Section: TStory = {
    args: { padding: 'lg' },
    play: async ({ canvas }) => {
        await expect(canvas.getByRole('region', { name: '요청 기록' })).toBeVisible()
    },
}

/** 표처럼 가장자리까지 채우는 내용 */
export const Flush: TStory = { args: { padding: 'none' } }

/** 카드 안의 옅은 회색 상자 (확인 가이드) */
export const Muted: TStory = { args: { padding: 'md', tone: 'muted' } }
