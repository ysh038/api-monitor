import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'

import FailureSummary from './FailureSummary'

const meta = {
    title: 'Logs/FailureSummary',
    component: FailureSummary,
    tags: ['autodocs'],
} satisfies Meta<typeof FailureSummary>

export default meta
type TStory = StoryObj<typeof meta>

/** D0: 고정 제목과 고정 설명 두 줄만. 실패 건수·외부 서버 카드는 없다 */
export const Default: TStory = {
    play: async ({ canvas }) => {
        await expect(canvas.getByRole('heading', { level: 1, name: '모니터링 툴' })).toBeVisible()
        await expect(canvas.getByText('로그를 봅시다')).toBeVisible()
        await expect(canvas.queryByRole('button')).toBeNull()
        await expect(canvas.queryByRole('group')).toBeNull()
    },
}

/** L2·L7: 제목·설명은 한 줄 고정(넘치면 말줄임 + title) */
export const NarrowOneLine: TStory = {
    render: () => (
        <div style={{ width: 120 }}>
            <FailureSummary />
        </div>
    ),
    play: async ({ canvas }) => {
        const headline = canvas.getByRole('heading', { level: 1 })
        await expect(headline).toHaveAttribute('title', '모니터링 툴')
        const headlineStyle = getComputedStyle(headline)
        await expect(headlineStyle.whiteSpace).toBe('nowrap')
        await expect(headlineStyle.textOverflow).toBe('ellipsis')
        await expect(headlineStyle.fontVariantNumeric).toContain('tabular-nums')
        const description = canvas.getByText('로그를 봅시다')
        await expect(description).toHaveAttribute('title', '로그를 봅시다')
        await expect(getComputedStyle(description).whiteSpace).toBe('nowrap')
    },
}
