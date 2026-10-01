import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn } from 'storybook/test'

import Drawer from './Drawer'

const meta = {
    title: 'Organisms/Drawer',
    component: Drawer,
    tags: ['autodocs'],
    args: {
        isOpen: true,
        label: '요청 상세',
        onClose: fn(),
        children: '상세 내용',
    },
} satisfies Meta<typeof Drawer>

export default meta
type TStory = StoryObj<typeof meta>

/** 열리면 닫기 버튼에 포커스 */
export const Open: TStory = {
    play: async ({ canvas, args, userEvent }) => {
        const dialog = canvas.getByRole('dialog', { name: '요청 상세' })
        await expect(dialog).toBeVisible()
        const close = canvas.getByRole('button', { name: '닫기' })
        await expect(close).toHaveFocus()
        await userEvent.click(close)
        await expect(args.onClose).toHaveBeenCalledTimes(1)
    },
}

/** ESC 로 닫기 */
export const EscapeKey: TStory = {
    play: async ({ args, userEvent }) => {
        await userEvent.keyboard('{Escape}')
        await expect(args.onClose).toHaveBeenCalledTimes(1)
    },
}

/** 배경 클릭으로 닫기 */
export const BackdropClick: TStory = {
    play: async ({ canvasElement, args, userEvent }) => {
        const backdrop = canvasElement.querySelector('[data-drawer-backdrop]')
        if (!(backdrop instanceof HTMLElement)) throw new Error('backdrop 없음')
        await userEvent.click(backdrop)
        await expect(args.onClose).toHaveBeenCalledTimes(1)
    },
}

export const Closed: TStory = {
    args: { isOpen: false },
    play: async ({ canvas }) => {
        await expect(canvas.queryByRole('dialog')).toBeNull()
    },
}

const STORAGE_KEY = 'story-drawer-width'
const RESIZE = { defaultWidth: 560, minWidth: 400, storageKey: STORAGE_KEY }

const clearStoredWidth = () => {
    localStorage.removeItem(STORAGE_KEY)
}

/** R1~R5: 왼쪽 가장자리 손잡이로 폭 조절 — 끌기·키보드·더블클릭·기억 */
export const Resizable: TStory = {
    args: { resize: RESIZE },
    beforeEach: clearStoredWidth,
    play: async ({ canvas, userEvent }) => {
        const handle = canvas.getByRole('separator', { name: '상세 패널 폭 조절' })
        const panel = canvas.getByRole('dialog')
        const widthOf = () => Math.round(panel.getBoundingClientRect().width)

        // R1
        await expect(handle).toHaveAttribute('aria-orientation', 'vertical')
        await expect(handle).toHaveAttribute('aria-valuenow', '560')
        await expect(handle).toHaveAttribute('aria-valuemin', '400')
        await expect(handle).toHaveAttribute('aria-valuemax', String(window.innerWidth - 80))
        await expect(widthOf()).toBe(560)

        // R2: 왼쪽으로 100px 끌면 100px 넓어진다
        const drag = async (dx: number) => {
            const rect = handle.getBoundingClientRect()
            const x = rect.left + rect.width / 2
            const y = rect.top + 100
            await userEvent.pointer([
                { keys: '[MouseLeft>]', target: handle, coords: { clientX: x, clientY: y } },
                { target: handle, coords: { clientX: x + dx, clientY: y } },
                { keys: '[/MouseLeft]', target: handle, coords: { clientX: x + dx, clientY: y } },
            ])
        }
        await drag(-100)
        await expect(widthOf()).toBe(660)
        await expect(handle).toHaveAttribute('aria-valuenow', '660')
        // R5: 기억
        await expect(localStorage.getItem(STORAGE_KEY)).toBe('660')

        // R2: 최소·최대로 제한
        await drag(2000)
        await expect(widthOf()).toBe(400)
        await drag(-5000)
        await expect(widthOf()).toBe(window.innerWidth - 80)

        // R4: 더블클릭하면 기본 폭
        await userEvent.dblClick(handle)
        await expect(widthOf()).toBe(560)

        // R3: 키보드
        handle.focus()
        await userEvent.keyboard('{ArrowLeft}')
        await expect(widthOf()).toBe(576)
        await userEvent.keyboard('{Shift>}{ArrowLeft}{/Shift}')
        await expect(widthOf()).toBe(640)
        await userEvent.keyboard('{ArrowRight}')
        await expect(widthOf()).toBe(624)
    },
}

/** R5: 기억해 둔 폭으로 연다 */
export const RestoresStoredWidth: TStory = {
    args: { resize: RESIZE },
    beforeEach: () => {
        localStorage.setItem(STORAGE_KEY, '700')
        return clearStoredWidth
    },
    play: async ({ canvas }) => {
        await expect(canvas.getByRole('separator')).toHaveAttribute('aria-valuenow', '700')
        await expect(Math.round(canvas.getByRole('dialog').getBoundingClientRect().width)).toBe(700)
    },
}

/** R5: 저장된 값이 이상하면 기본 폭 */
export const IgnoresBadStoredWidth: TStory = {
    args: { resize: RESIZE },
    beforeEach: () => {
        localStorage.setItem(STORAGE_KEY, 'abc')
        return clearStoredWidth
    },
    play: async ({ canvas }) => {
        await expect(canvas.getByRole('separator')).toHaveAttribute('aria-valuenow', '560')
    },
}

/** resize 를 주지 않으면 손잡이가 없다 */
export const FixedWidth: TStory = {
    play: async ({ canvas }) => {
        await expect(canvas.queryByRole('separator')).toBeNull()
    },
}
