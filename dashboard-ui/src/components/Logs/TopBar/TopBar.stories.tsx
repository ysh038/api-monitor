import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn } from 'storybook/test'

import { BASE_TIME } from '../../../mocks/logFixtures'

import TopBar from './TopBar'

const meta = {
    title: 'Logs/TopBar',
    component: TopBar,
    tags: ['autodocs'],
    args: {
        isDev: false,
        isAutoRefresh: true,
        lastUpdatedAt: BASE_TIME,
        devMessage: null,
        isMockPending: false,
        onToggleAutoRefresh: fn(),
        onInsertMock: fn(),
        onDeleteMock: fn(),
    },
} satisfies Meta<typeof TopBar>

export default meta
type TStory = StoryObj<typeof meta>

/** 운영 서버·스타터 내장 대시보드 — 개발 모드 UI 없음 */
export const Production: TStory = {
    play: async ({ canvas }) => {
        await expect(canvas.getByText('09:08:46에 새로고침했어요')).toBeVisible()
        await expect(canvas.queryByText('개발 모드 · Mock 데이터')).toBeNull()
        await expect(canvas.queryByRole('button', { name: 'Mock 데이터 넣기' })).toBeNull()
    },
}

/** G1: 자동 갱신 끄기 → 로고 점이 멈춤 표시 */
export const ToggleAutoRefresh: TStory = {
    play: async ({ canvas, userEvent, args }) => {
        await userEvent.click(canvas.getByRole('switch', { name: '5초마다 새로고침' }))
        await expect(args.onToggleAutoRefresh).toHaveBeenCalledWith(false)
    },
}

export const Paused: TStory = {
    args: { isAutoRefresh: false },
    play: async ({ canvas }) => {
        await expect(canvas.getByTitle('자동 새로고침 꺼짐')).toBeVisible()
    },
}

/** G2: 개발 모드 — 배지와 Mock 버튼, 결과 메시지 */
export const DevMode: TStory = {
    args: { isDev: true, devMessage: 'Mock 19건 추가' },
    play: async ({ canvas, userEvent, args }) => {
        await expect(canvas.getByText('개발 모드 · Mock 데이터')).toBeVisible()
        await expect(canvas.getByRole('status')).toHaveTextContent('Mock 19건 추가')
        await userEvent.click(canvas.getByRole('button', { name: 'Mock 데이터 넣기' }))
        await expect(args.onInsertMock).toHaveBeenCalled()
        await userEvent.click(canvas.getByRole('button', { name: 'Mock 데이터 지우기' }))
        await expect(args.onDeleteMock).toHaveBeenCalled()
    },
}

export const DevModePending: TStory = {
    args: { isDev: true, isMockPending: true },
    play: async ({ canvas }) => {
        await expect(canvas.getByRole('button', { name: 'Mock 데이터 넣기' })).toBeDisabled()
    },
}
