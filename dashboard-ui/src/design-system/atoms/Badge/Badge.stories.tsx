import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'

import Badge from './Badge'

const meta = {
    title: 'Atoms/Badge',
    component: Badge,
    tags: ['autodocs'],
    args: { children: '500 · 서버 오류', tone: 'danger' },
} satisfies Meta<typeof Badge>

export default meta
type TStory = StoryObj<typeof meta>

/** 상세 상단 상태 배지 */
export const Soft: TStory = {
    args: { appearance: 'soft', size: 'md' },
    play: async ({ canvas }) => {
        await expect(canvas.getByText('500 · 서버 오류')).toBeVisible()
    },
}

/** 표의 상태 글자 (500 · 응답 없음 · 404) */
export const Text: TStory = {
    args: { appearance: 'text', children: '응답 없음' },
}

/** 개발 모드 배지 */
export const DevMode: TStory = {
    args: { appearance: 'soft', tone: 'warning', children: '개발 모드 · Mock 데이터' },
}

/** MOCK 태그 */
export const Dashed: TStory = {
    args: {
        appearance: 'dashed',
        tone: 'warning',
        size: 'sm',
        children: 'MOCK',
        title: '개발 모드에서 넣은 Mock 데이터입니다',
    },
    play: async ({ canvas }) => {
        await expect(canvas.getByText('MOCK')).toHaveAttribute(
            'title',
            '개발 모드에서 넣은 Mock 데이터입니다',
        )
    },
}

/** 백그라운드 태그 */
export const Outline: TStory = {
    args: { appearance: 'outline', tone: 'neutral', size: 'sm', children: '백그라운드' },
}

/** 외부 호출 N 태그 */
export const Info: TStory = {
    args: { appearance: 'soft', tone: 'info', size: 'sm', children: '외부 호출 2' },
}

export const AllTones: TStory = {
    render: (args) => (
        <>
            {(['neutral', 'success', 'info', 'warning', 'danger'] as const).map((tone) => (
                <Badge key={tone} {...args} tone={tone}>
                    {tone}
                </Badge>
            ))}
        </>
    ),
}
