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

/** L4: 세로 스크롤바 자리를 항상 확보해서 스크롤바가 생기고 사라져도 가로 위치가 그대로다 */
export const StableScrollbarGutter: TStory = {
    play: async () => {
        await expect(getComputedStyle(document.documentElement).scrollbarGutter).toBe('stable')
    },
}

/** H5: 스크롤바는 얇고 트랙 배경이 없다 — 페이지와 안쪽 스크롤 영역 모두 */
export const ThinScrollbars: TStory = {
    play: async ({ canvasElement }) => {
        const inner = document.createElement('div')
        inner.style.overflow = 'auto'
        canvasElement.appendChild(inner)
        for (const el of [document.documentElement, inner]) {
            const style = getComputedStyle(el)
            await expect(style.scrollbarWidth).toBe('thin')
            // "손잡이색 트랙색" — 트랙은 투명
            await expect(style.scrollbarColor).toMatch(/ (transparent|rgba\(0, 0, 0, 0\))$/)
        }
        inner.remove()
    },
}
