import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { expect, fn } from 'storybook/test'

import SearchField from './SearchField'

const meta = {
    title: 'Atoms/SearchField',
    component: SearchField,
    tags: ['autodocs'],
    args: {
        label: '로그 검색',
        placeholder: '경로, 예외, requestId로 찾기',
        value: '',
        onChange: fn(),
    },
} satisfies Meta<typeof SearchField>

export default meta
type TStory = StoryObj<typeof meta>

export const Empty: TStory = {
    play: async ({ canvas, userEvent, args }) => {
        const input = canvas.getByRole('searchbox', { name: '로그 검색' })
        await userEvent.type(input, 'a')
        await expect(args.onChange).toHaveBeenCalledWith('a')
    },
}

export const Typing: TStory = {
    render: function Render(args) {
        const [value, setValue] = useState('')
        return <SearchField {...args} value={value} onChange={setValue} />
    },
    play: async ({ canvas, userEvent }) => {
        const input = canvas.getByRole('searchbox')
        await userEvent.type(input, '/payments')
        await expect(input).toHaveValue('/payments')
    },
}
