import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn } from 'storybook/test'

import { EMPTY_FILTERS } from '../../../utils/logs/filterState'

import LogFilters from './LogFilters'

const meta = {
    title: 'Logs/LogFilters',
    component: LogFilters,
    tags: ['autodocs'],
    args: {
        filters: EMPTY_FILTERS,
        searchText: '',
        onKindChange: fn(),
        onToggleStatus: fn(),
        onSearchTextChange: fn(),
    },
} satisfies Meta<typeof LogFilters>

export default meta
type TStory = StoryObj<typeof meta>

export const Default: TStory = {
    play: async ({ canvas, userEvent, args }) => {
        // E1
        await expect(canvas.getByRole('button', { name: '전체' })).toHaveAttribute(
            'aria-pressed',
            'true',
        )
        await userEvent.click(canvas.getByRole('button', { name: '보낸 요청' }))
        await expect(args.onKindChange).toHaveBeenCalledWith('OUTBOUND')
        // E2
        await userEvent.click(canvas.getByRole('button', { name: '5xx' }))
        await expect(args.onToggleStatus).toHaveBeenCalledWith('5xx')
        await userEvent.type(canvas.getByRole('searchbox', { name: '로그 검색' }), 'x')
        await expect(args.onSearchTextChange).toHaveBeenCalledWith('x')
    },
}

/** E2: 여러 상태 칩이 동시에 켜진다 */
export const MultipleStatuses: TStory = {
    args: {
        filters: { ...EMPTY_FILTERS, kind: 'INBOUND', statuses: ['4xx', 'none'] },
    },
    play: async ({ canvas }) => {
        await expect(canvas.getByRole('button', { name: '받은 요청' })).toHaveAttribute(
            'aria-pressed',
            'true',
        )
        await expect(canvas.getByRole('button', { name: '4xx' })).toHaveAttribute('aria-pressed', 'true')
        await expect(canvas.getByRole('button', { name: '응답 없음' })).toHaveAttribute(
            'aria-pressed',
            'true',
        )
        await expect(canvas.getByRole('button', { name: '2xx' })).toHaveAttribute(
            'aria-pressed',
            'false',
        )
    },
}

/** E6 제거 (2026-09-30): 필터 줄에 서비스 선택 상자와 "예외가 난 요청만" 이 없다 */
export const NoServiceOrExceptionFilter: TStory = {
    play: async ({ canvas }) => {
        await expect(canvas.queryByRole('combobox')).toBeNull()
        await expect(canvas.queryByRole('checkbox')).toBeNull()
    },
}
