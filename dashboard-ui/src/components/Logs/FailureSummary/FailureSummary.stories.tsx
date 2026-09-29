import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn } from 'storybook/test'

import { makeRow, makeScenario } from '../../../mocks/logFixtures'

import FailureSummary from './FailureSummary'

const meta = {
    title: 'Logs/FailureSummary',
    component: FailureSummary,
    tags: ['autodocs'],
    args: {
        rows: makeScenario(),
        selectedHost: '',
        hasFilter: false,
        onSelectHost: fn(),
    },
} satisfies Meta<typeof FailureSummary>

export default meta
type TStory = StoryObj<typeof meta>

/** 참고 이미지 상단 — 실패 요약과 외부 서버 카드 */
export const WithFailures: TStory = {
    play: async ({ canvas, userEvent, args }) => {
        await expect(
            canvas.getByRole('heading', { level: 1, name: '요청 14건 중 5건이 실패했어요' }),
        ).toBeVisible()
        await expect(
            canvas.getByText(
                '실패한 5건 중 4건은 외부 서버 호출과 관련 있어요. 서버를 눌러 좁혀 볼 수 있어요.',
            ),
        ).toBeVisible()
        // D4
        await userEvent.click(canvas.getByRole('button', { name: /pg-gateway:9000/ }))
        await expect(args.onSelectHost).toHaveBeenCalledWith('pg-gateway:9000')
    },
}

export const HostSelected: TStory = {
    args: { selectedHost: 'pg-gateway:9000' },
    play: async ({ canvas }) => {
        await expect(canvas.getByRole('button', { name: /pg-gateway:9000/ })).toHaveAttribute(
            'aria-pressed',
            'true',
        )
    },
}

/** D3: 실패가 없으면 호스트 카드도 없다 */
export const AllGood: TStory = {
    args: { rows: [makeRow(), makeRow(), makeRow({ statusCode: 404 })] },
    play: async ({ canvas }) => {
        await expect(
            canvas.getByRole('heading', { name: '요청 3건 모두 정상 처리했어요' }),
        ).toBeVisible()
        await expect(canvas.queryByRole('button')).toBeNull()
    },
}

export const Empty: TStory = {
    args: { rows: [] },
    play: async ({ canvas }) => {
        await expect(canvas.getByRole('heading', { name: '아직 받은 요청이 없어요' })).toBeVisible()
    },
}
