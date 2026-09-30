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

/** E2a: 상태 칩은 세그먼트와 같은 회색 트랙 한 장 위에 묶여 있고, 꺼진 칩은 배경이 없다 */
export const StatusChipsInTrack: TStory = {
    args: { filters: { ...EMPTY_FILTERS, statuses: ['4xx'] } },
    play: async ({ canvas }) => {
        const TRANSPARENT = 'rgba(0, 0, 0, 0)'
        const segment = canvas.getByRole('group', { name: '요청 구분' })
        const track = canvas.getByRole('group', { name: '상태' })
        await expect(getComputedStyle(track).backgroundColor).not.toBe(TRANSPARENT)
        await expect(getComputedStyle(track).backgroundColor).toBe(
            getComputedStyle(segment).backgroundColor,
        )
        // 두 묶음의 높이가 같다 — 나란히 놓였을 때 한 줄로 맞는다
        await expect(Math.round(track.getBoundingClientRect().height)).toBe(
            Math.round(segment.getBoundingClientRect().height),
        )
        const off = canvas.getByRole('button', { name: '2xx' })
        const on = canvas.getByRole('button', { name: '4xx' })
        await expect(getComputedStyle(off).backgroundColor).toBe(TRANSPARENT)
        await expect(getComputedStyle(on).backgroundColor).not.toBe(TRANSPARENT)
    },
}
