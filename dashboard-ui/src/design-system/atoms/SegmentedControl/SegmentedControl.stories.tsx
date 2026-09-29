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

const rectOf = (el: Element) => {
    const r = el.getBoundingClientRect()
    return { left: Math.round(r.left), width: Math.round(r.width) }
}
const indicatorOf = (group: HTMLElement) => group.querySelector('[data-indicator]')
const settle = () => new Promise((resolve) => setTimeout(resolve, 350))
/** 화면에 붙은 뒤 두 프레임 — 실제 사용자는 그린 직후 16ms 안에 누르지 않는다 */
const nextFrames = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))

/** M2: 처음 그릴 때 선택 표시가 이미 선택한 버튼 자리에 있다 (미끄러지지 않음) */
export const IndicatorInitial: TStory = {
    args: { value: 'OUTBOUND' },
    play: async ({ canvas }) => {
        const group = canvas.getByRole('group', { name: '요청 구분' })
        const indicator = indicatorOf(group)
        await expect(indicator).not.toBeNull()
        await expect(indicator).toHaveAttribute('aria-hidden', 'true')
        await expect(rectOf(indicator!)).toEqual(rectOf(canvas.getByRole('button', { name: '외부 호출' })))
    },
}

/** M1·L6: 고르면 선택 표시가 새 버튼 위치·폭으로 미끄러져 가고, 버튼 폭은 변하지 않는다 */
export const IndicatorSlides: TStory = {
    render: function Render(args) {
        const [value, setValue] = useState('')
        return <SegmentedControl {...args} value={value} onChange={setValue} />
    },
    play: async ({ canvas, userEvent }) => {
        const group = canvas.getByRole('group', { name: '요청 구분' })
        const indicator = indicatorOf(group)!
        const buttons = OPTIONS.map((o) => canvas.getByRole('button', { name: o.label }))
        const widthsBefore = buttons.map((b) => rectOf(b).width)

        await nextFrames()
        await userEvent.click(canvas.getByRole('button', { name: '외부 호출' }))
        // 전환 도중에는 아직 새 자리에 도착하지 않았다 (순간이동이 아님)
        await expect(getComputedStyle(indicator).transitionProperty).toContain('transform')
        await settle()
        await expect(rectOf(indicator)).toEqual(rectOf(canvas.getByRole('button', { name: '외부 호출' })))
        await expect(buttons.map((b) => rectOf(b).width)).toEqual(widthsBefore)
    },
}

/** M3: 버튼 폭이 바뀌면 선택 표시가 다시 맞춰진다 */
export const IndicatorResizes: TStory = {
    render: function Render(args) {
        const [options, setOptions] = useState(OPTIONS)
        return (
            <div>
                <SegmentedControl {...args} options={options} value="INBOUND" />
                <button
                    type="button"
                    onClick={() =>
                        setOptions(OPTIONS.map((o) => (o.value === 'INBOUND' ? { ...o, label: '들어온 요청 (서버로 들어온 것)' } : o)))
                    }
                >
                    라벨 바꾸기
                </button>
            </div>
        )
    },
    play: async ({ canvas, userEvent }) => {
        await userEvent.click(canvas.getByRole('button', { name: '라벨 바꾸기' }))
        await settle()
        const group = canvas.getByRole('group', { name: '요청 구분' })
        await expect(rectOf(indicatorOf(group)!)).toEqual(
            rectOf(canvas.getByRole('button', { name: '들어온 요청 (서버로 들어온 것)' })),
        )
    },
}
