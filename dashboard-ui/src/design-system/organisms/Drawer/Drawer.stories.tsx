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
