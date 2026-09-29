import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { expect, fn } from 'storybook/test'

import ToggleChip from './ToggleChip'

const meta = {
    title: 'Atoms/ToggleChip',
    component: ToggleChip,
    tags: ['autodocs'],
    args: { label: '5xx', tone: 'danger', isPressed: false, onToggle: fn() },
} satisfies Meta<typeof ToggleChip>

export default meta
type TStory = StoryObj<typeof meta>

export const Off: TStory = {
    play: async ({ canvas, userEvent, args }) => {
        const chip = canvas.getByRole('button', { name: '5xx' })
        await expect(chip).toHaveAttribute('aria-pressed', 'false')
        await userEvent.click(chip)
        await expect(args.onToggle).toHaveBeenCalled()
    },
}

export const On: TStory = {
    args: { isPressed: true },
    play: async ({ canvas }) => {
        await expect(canvas.getByRole('button')).toHaveAttribute('aria-pressed', 'true')
    },
}

/** 상태 칩 네 개 */
export const StatusChips: TStory = {
    render: (args) => (
        <>
            <ToggleChip {...args} label="2xx" tone="neutral" />
            <ToggleChip {...args} label="4xx" tone="warning" isPressed />
            <ToggleChip {...args} label="5xx" tone="danger" />
            <ToggleChip
                {...args}
                label="응답 없음"
                tone="danger"
                title="응답을 받지 못한 호출 (연결 실패·타임아웃)"
            />
        </>
    ),
}

/** M4·L6: 켜고 끌 때 색이 부드럽게 바뀌고, 굵어져도 폭이 그대로다 */
export const SmoothToggle: TStory = {
    render: function Render(args) {
        const [isPressed, setPressed] = useState(false)
        return <ToggleChip {...args} isPressed={isPressed} onToggle={() => setPressed((v) => !v)} />
    },
    play: async ({ canvas, userEvent }) => {
        const chip = canvas.getByRole('button', { name: '5xx' })
        const transition = getComputedStyle(chip).transitionProperty
        for (const property of ['background-color', 'border-color', 'color']) {
            await expect(transition).toContain(property)
        }
        const widthOff = chip.getBoundingClientRect().width
        await userEvent.click(chip)
        await expect(chip).toHaveAttribute('aria-pressed', 'true')
        await expect(chip.getBoundingClientRect().width).toBe(widthOff)
    },
}
