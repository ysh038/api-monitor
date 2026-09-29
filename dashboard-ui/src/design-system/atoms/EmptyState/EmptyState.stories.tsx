import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'

import EmptyState from './EmptyState'

const meta = {
    title: 'Atoms/EmptyState',
    component: EmptyState,
    tags: ['autodocs'],
    args: { children: '아직 수신된 로그가 없습니다.' },
} satisfies Meta<typeof EmptyState>

export default meta
type TStory = StoryObj<typeof meta>

export const Default: TStory = {
    play: async ({ canvas }) => {
        await expect(canvas.getByRole('status')).toHaveTextContent('아직 수신된 로그가 없습니다.')
    },
}
