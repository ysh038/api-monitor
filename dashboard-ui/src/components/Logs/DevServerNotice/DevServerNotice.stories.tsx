import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'

import DevServerNotice from './DevServerNotice'

const meta = {
    title: 'Logs/DevServerNotice',
    component: DevServerNotice,
    tags: ['autodocs'],
    args: { notice: 'unreachable' },
} satisfies Meta<typeof DevServerNotice>

export default meta
type TStory = StoryObj<typeof meta>

/** A1: API 서버(:8081)가 꺼져 있음 — 경고와 실행할 명령 */
export const Unreachable: TStory = {
    play: async ({ canvas }) => {
        await expect(canvas.getByRole('status')).toHaveTextContent('API 서버에 연결할 수 없어요.')
        await expect(canvas.getByText('cd server && npm run dev')).toBeVisible()
    },
}

/** A2: API 서버가 운영 모드(npm start) — Mock 기능이 꺼져 있다는 안내 */
export const NotDevMode: TStory = {
    args: { notice: 'not-dev-mode' },
    play: async ({ canvas }) => {
        await expect(canvas.getByRole('status')).toHaveTextContent('Mock 데이터 기능이 꺼져 있어요')
        await expect(canvas.getByText('cd server && npm run dev')).toBeVisible()
    },
}

/** A3·A5: 안내가 필요 없으면 아무것도 그리지 않는다 */
export const Hidden: TStory = {
    args: { notice: null },
    play: async ({ canvas }) => {
        await expect(canvas.queryByRole('status')).toBeNull()
    },
}
