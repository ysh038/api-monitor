import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'

import CodeBlock from './CodeBlock'

const meta = {
    title: 'Atoms/CodeBlock',
    component: CodeBlock,
    tags: ['autodocs'],
    args: {
        label: '응답 바디',
        children: '{\n  "orderId": 3,\n  "status": "PAID"\n}',
    },
} satisfies Meta<typeof CodeBlock>

export default meta
type TStory = StoryObj<typeof meta>

/** 요청·응답 바디 (줄바꿈) */
export const Wrap: TStory = {
    args: { isWrapping: true },
    play: async ({ canvas }) => {
        await expect(canvas.getByText(/"status": "PAID"/)).toBeVisible()
    },
}

/** 스택트레이스 (가로 스크롤, 스크롤 영역은 키보드로 닿을 수 있다) */
export const Stack: TStory = {
    args: {
        label: '스택트레이스',
        isWrapping: false,
        children:
            'org.springframework.web.client.ResourceAccessException: I/O error on GET request for "http://pg-gateway:9000/payments/7781/status": Read timed out\n\tat org.springframework.web.client.RestTemplate.doExecute(RestTemplate.java:915)',
    },
    play: async ({ canvas }) => {
        await expect(canvas.getByLabelText('스택트레이스')).toHaveAttribute('tabindex', '0')
    },
}
