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
        serviceOptions: [
            { value: '', label: '전체 서비스 · 1,230건 · 에러 5' },
            { value: 'order-api', label: 'order-api · 1,200건 · 에러 5' },
        ],
        isServiceEmpty: false,
        onKindChange: fn(),
        onToggleStatus: fn(),
        onExceptionOnlyChange: fn(),
        onServiceChange: fn(),
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
        await userEvent.click(canvas.getByRole('checkbox', { name: '예외가 난 요청만' }))
        await expect(args.onExceptionOnlyChange).toHaveBeenCalledWith(true)
        // E6
        await userEvent.selectOptions(canvas.getByRole('combobox', { name: '서비스' }), 'order-api')
        await expect(args.onServiceChange).toHaveBeenCalledWith('order-api')
        await userEvent.type(canvas.getByRole('searchbox', { name: '로그 검색' }), 'x')
        await expect(args.onSearchTextChange).toHaveBeenCalledWith('x')
    },
}

/** E2: 여러 상태 칩이 동시에 켜진다 */
export const MultipleStatuses: TStory = {
    args: {
        filters: { ...EMPTY_FILTERS, kind: 'INBOUND', statuses: ['4xx', 'none'], isExceptionOnly: true },
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
        await expect(canvas.getByRole('checkbox')).toBeChecked()
    },
}

export const NoServices: TStory = {
    args: {
        isServiceEmpty: true,
        serviceOptions: [{ value: '', label: '아직 로그를 보낸 서비스가 없습니다' }],
    },
    play: async ({ canvas }) => {
        await expect(canvas.getByRole('combobox', { name: '서비스' })).toBeDisabled()
    },
}
