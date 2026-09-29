import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn } from 'storybook/test'

import CopyField from './CopyField'

const meta = {
    title: 'Molecules/CopyField',
    component: CopyField,
    tags: ['autodocs'],
    args: { value: '6f1c2a9e-requestId', copyLabel: 'requestId 복사', onCopy: fn() },
} satisfies Meta<typeof CopyField>

export default meta
type TStory = StoryObj<typeof meta>

/** requestId 복사 — 누르면 잠깐 "복사됨" */
export const Default: TStory = {
    play: async ({ canvas, userEvent, args }) => {
        await expect(canvas.getByText('6f1c2a9e-requestId')).toBeVisible()
        await userEvent.click(canvas.getByRole('button', { name: 'requestId 복사' }))
        await expect(args.onCopy).toHaveBeenCalledWith('6f1c2a9e-requestId')
        await expect(canvas.getByRole('button', { name: 'requestId 복사' })).toHaveTextContent(
            '복사됨',
        )
    },
}
