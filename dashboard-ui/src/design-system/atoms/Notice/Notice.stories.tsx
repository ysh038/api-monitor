import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'

import Notice from './Notice'

const meta = {
    title: 'Atoms/Notice',
    component: Notice,
    tags: ['autodocs'],
    args: { children: '검색 조건이 걸려 있어요', tone: 'info' },
} satisfies Meta<typeof Notice>

export default meta
type TStory = StoryObj<typeof meta>

/** 오른쪽 끝에 동작 버튼이 있는 안내 줄 */
export const WithAction: TStory = {
    args: { action: <button type="button">해제</button> },
    play: async ({ canvas }) => {
        await expect(canvas.getByRole('button', { name: '해제' })).toBeVisible()
    },
}

/** 상세 상단 Mock 안내 */
export const Dashed: TStory = {
    args: {
        tone: 'warning',
        variant: 'dashed',
        children: '개발 모드에서 넣은 Mock 데이터입니다. 실제 요청이 아닙니다.',
    },
}

/** 결과 박스 — 정상 처리 */
export const Success: TStory = {
    args: { tone: 'success', children: '✓ 정상 처리' },
}

/** 결과 박스 — 예외 없는 5xx */
export const Danger: TStory = {
    args: { tone: 'danger', variant: 'outline', children: '서버 오류 500 · 예외 정보 없음' },
}
