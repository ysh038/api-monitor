import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { expect, fn } from 'storybook/test'

import Tabs, { type ITabsProps } from './Tabs'

const TABS = [
    { id: 'req', label: '요청', buttonId: 'tab-req', panelId: 'panel-req' },
    { id: 'res', label: '응답', buttonId: 'tab-res', panelId: 'panel-res' },
]

/** 탭은 패널과 짝으로 쓴다 (aria-controls 가 가리킬 패널이 있어야 한다) */
function WithPanels(props: ITabsProps) {
    return (
        <>
            <Tabs {...props} />
            {props.tabs.map((tab) => (
                <div
                    key={tab.id}
                    id={tab.panelId}
                    role="tabpanel"
                    aria-labelledby={tab.buttonId}
                    hidden={tab.id !== props.activeId}
                >
                    {tab.label} 패널
                </div>
            ))}
        </>
    )
}

const meta = {
    title: 'Atoms/Tabs',
    component: Tabs,
    tags: ['autodocs'],
    args: {
        label: '요청과 응답',
        tabs: TABS,
        activeId: 'req',
        onChange: fn(),
    },
    render: (args) => <WithPanels {...args} />,
} satisfies Meta<typeof Tabs>

export default meta
type TStory = StoryObj<typeof meta>

export const Default: TStory = {
    play: async ({ canvas, userEvent, args }) => {
        const request = canvas.getByRole('tab', { name: '요청' })
        await expect(request).toHaveAttribute('aria-selected', 'true')
        await userEvent.click(canvas.getByRole('tab', { name: '응답' }))
        await expect(args.onChange).toHaveBeenCalledWith('res')
    },
}

/** 화살표 키로 탭 이동 */
export const Keyboard: TStory = {
    render: function Render(args) {
        const [activeId, setActiveId] = useState('req')
        return <WithPanels {...args} activeId={activeId} onChange={setActiveId} />
    },
    play: async ({ canvas, userEvent }) => {
        await userEvent.tab()
        await expect(canvas.getByRole('tab', { name: '요청' })).toHaveFocus()
        await userEvent.keyboard('{ArrowRight}')
        const response = canvas.getByRole('tab', { name: '응답' })
        await expect(response).toHaveFocus()
        await expect(response).toHaveAttribute('aria-selected', 'true')
        await expect(canvas.getByRole('tabpanel')).toHaveTextContent('응답 패널')
    },
}
