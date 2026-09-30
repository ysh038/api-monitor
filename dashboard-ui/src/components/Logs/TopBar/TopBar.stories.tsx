import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, within } from 'storybook/test'

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
        themePreference: 'system',
        onToggleAutoRefresh: fn(),
        onChangeTheme: fn(),
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

/** T7: 화면 테마 — 현재 선택이 눌린 상태, 누르면 선택이 바뀐다 */
export const ThemeSelect: TStory = {
    args: { themePreference: 'system' },
    play: async ({ canvas, userEvent, args }) => {
        const group = canvas.getByRole('group', { name: '화면 테마' })
        await expect(group).toBeVisible()
        await expect(canvas.getByRole('button', { name: '자동' })).toHaveAttribute('aria-pressed', 'true')
        await expect(canvas.getByRole('button', { name: '다크' })).toHaveAttribute('aria-pressed', 'false')
        await userEvent.click(canvas.getByRole('button', { name: '다크' }))
        await expect(args.onChangeTheme).toHaveBeenCalledWith('dark')
    },
}

export const ThemeDark: TStory = {
    args: { themePreference: 'dark' },
    play: async ({ canvas }) => {
        await expect(canvas.getByRole('button', { name: '다크' })).toHaveAttribute('aria-pressed', 'true')
        await expect(canvas.getByRole('button', { name: '라이트' })).toHaveAttribute('aria-pressed', 'false')
    },
}

/** L5: Mock 결과 메시지가 나타나도 다른 버튼 위치가 그대로다 */
export const DevMessageNoShift: TStory = {
    // 비교하려고 상단 바(header 랜드마크)를 두 개 그리므로 중복 랜드마크 규칙만 이 스토리에서 끈다
    parameters: {
        a11y: {
            config: {
                rules: [
                    { id: 'landmark-no-duplicate-banner', enabled: false },
                    { id: 'landmark-unique', enabled: false },
                ],
            },
        },
    },
    render: (args) => (
        <div style={{ width: 1280 }}>
            <div data-testid="without">
                <TopBar {...args} isDev devMessage={null} />
            </div>
            <div data-testid="with">
                <TopBar {...args} isDev devMessage="Mock 데이터를 넣지 못했어요" />
            </div>
        </div>
    ),
    play: async ({ canvas }) => {
        const leftOf = (testId: string, name: string) =>
            Math.round(
                within(canvas.getByTestId(testId)).getByRole('button', { name }).getBoundingClientRect().left,
            )
        for (const name of ['다크', 'Mock 데이터 넣기', 'Mock 데이터 지우기']) {
            await expect(leftOf('with', name)).toBe(leftOf('without', name))
        }
    },
}
