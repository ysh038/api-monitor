import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { expect, fn } from 'storybook/test'

import SegmentedControl from './SegmentedControl'

const OPTIONS = [
    { value: '', label: '전체' },
    { value: 'INBOUND', label: '들어온 요청' },
    { value: 'OUTBOUND', label: '외부 호출' },
]

const meta = {
    title: 'Atoms/SegmentedControl',
    component: SegmentedControl,
    tags: ['autodocs'],
    args: { label: '요청 구분', options: OPTIONS, value: '', onChange: fn() },
} satisfies Meta<typeof SegmentedControl>

export default meta
type TStory = StoryObj<typeof meta>

export const Default: TStory = {
    play: async ({ canvas, userEvent, args }) => {
        await expect(canvas.getByRole('button', { name: '전체' })).toHaveAttribute(
            'aria-pressed',
            'true',
        )
        await expect(
            canvas.getByRole('button', { name: '외부 호출' }),
        ).toHaveAttribute('aria-pressed', 'false')
        await userEvent.click(canvas.getByRole('button', { name: '외부 호출' }))
        await expect(args.onChange).toHaveBeenCalledWith('OUTBOUND')
    },
}

export const Controlled: TStory = {
    render: function Render(args) {
        const [value, setValue] = useState('')
        return <SegmentedControl {...args} value={value} onChange={setValue} />
    },
    play: async ({ canvas, userEvent }) => {
        const inbound = canvas.getByRole('button', { name: '들어온 요청' })
        await userEvent.click(inbound)
        await expect(inbound).toHaveAttribute('aria-pressed', 'true')
        await expect(canvas.getByRole('group', { name: '요청 구분' })).toBeVisible()
    },
}
