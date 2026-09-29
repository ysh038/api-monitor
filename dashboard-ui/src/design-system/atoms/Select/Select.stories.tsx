import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn } from 'storybook/test'

import Select from './Select'

const meta = {
    title: 'Atoms/Select',
    component: Select,
    tags: ['autodocs'],
    args: {
        label: '서비스',
        value: '',
        onChange: fn(),
        options: [
            { value: '', label: '전체 서비스 · 1,230건 · 에러 5' },
            { value: 'order-api', label: 'order-api · 1,200건 · 에러 5' },
            { value: 'pay-api', label: 'pay-api · 30건' },
        ],
    },
} satisfies Meta<typeof Select>

export default meta
type TStory = StoryObj<typeof meta>

export const Default: TStory = {
    play: async ({ canvas, userEvent, args }) => {
        const select = canvas.getByRole('combobox', { name: '서비스' })
        await userEvent.selectOptions(select, 'pay-api')
        await expect(args.onChange).toHaveBeenCalledWith('pay-api')
    },
}

/** 서비스가 아직 없을 때 */
export const Disabled: TStory = {
    args: {
        isDisabled: true,
        options: [{ value: '', label: '아직 로그를 보낸 서비스가 없습니다' }],
    },
    play: async ({ canvas }) => {
        await expect(canvas.getByRole('combobox')).toBeDisabled()
    },
}
