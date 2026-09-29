import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'

import SectionHeader from './SectionHeader'

const meta = {
    title: 'Atoms/SectionHeader',
    component: SectionHeader,
    tags: ['autodocs'],
    args: { title: '요청 기록', level: 2 },
} satisfies Meta<typeof SectionHeader>

export default meta
type TStory = StoryObj<typeof meta>

/** 카드 제목 + 오른쪽 보조 영역 */
export const WithAside: TStory = {
    args: { aside: '38건 보는 중 · 전체 38건' },
    play: async ({ canvas }) => {
        await expect(canvas.getByRole('heading', { level: 2, name: '요청 기록' })).toBeVisible()
    },
}

/** 작은 소제목 + 설명 (시간대별 요청) */
export const Small: TStory = {
    args: {
        title: '시간대별 요청',
        level: 3,
        size: 'sm',
        description: '막대 하나가 요청 하나예요. 높을수록 심각한 상태예요.',
    },
}

/** 흐린 대문자 소제목 (헤더 · 바디) */
export const Caption: TStory = {
    args: { title: '헤더', level: 4, size: 'caption' },
}
