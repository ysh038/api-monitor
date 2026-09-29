import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { expect, fn } from 'storybook/test'

import Switch from './Switch'

const meta = {
    title: 'Atoms/Switch',
    component: Switch,
    tags: ['autodocs'],
    args: { label: '5초마다 새로고침', isChecked: true, onChange: fn() },
} satisfies Meta<typeof Switch>

export default meta
type TStory = StoryObj<typeof meta>

export const On: TStory = {
    play: async ({ canvas, userEvent, args }) => {
        const toggle = canvas.getByRole('switch', { name: '5초마다 새로고침' })
        await expect(toggle).toBeChecked()
        await userEvent.click(toggle)
        await expect(args.onChange).toHaveBeenCalledWith(false)
    },
}

export const Off: TStory = {
    args: { isChecked: false, label: '성공한 요청 묶어 보기' },
}

/** 키보드로 켜고 끄기 */
export const Controlled: TStory = {
    render: function Render(args) {
        const [isChecked, setChecked] = useState(false)
        return <Switch {...args} isChecked={isChecked} onChange={setChecked} />
    },
    play: async ({ canvas, userEvent }) => {
        const toggle = canvas.getByRole('switch')
        await userEvent.tab()
        await expect(toggle).toHaveFocus()
        await userEvent.keyboard(' ')
        await expect(toggle).toBeChecked()
    },
}
