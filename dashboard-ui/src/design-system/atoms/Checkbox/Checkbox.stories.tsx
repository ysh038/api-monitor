import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn } from 'storybook/test'

import Checkbox from './Checkbox'

const meta = {
    title: 'Atoms/Checkbox',
    component: Checkbox,
    tags: ['autodocs'],
    args: { label: '예외가 난 요청만', isChecked: false, onChange: fn() },
} satisfies Meta<typeof Checkbox>

export default meta
type TStory = StoryObj<typeof meta>

export const Unchecked: TStory = {
    play: async ({ canvas, userEvent, args }) => {
        const box = canvas.getByRole('checkbox', { name: '예외가 난 요청만' })
        await expect(box).not.toBeChecked()
        await userEvent.click(canvas.getByText('예외가 난 요청만'))
        await expect(args.onChange).toHaveBeenCalledWith(true)
    },
}

export const Checked: TStory = {
    args: { isChecked: true },
    play: async ({ canvas }) => {
        await expect(canvas.getByRole('checkbox')).toBeChecked()
    },
}
