import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'

import NumberedList from './NumberedList'

const meta = {
    title: 'Atoms/NumberedList',
    component: NumberedList,
    tags: ['autodocs'],
    args: {
        items: [
            'pg-gateway:9000 서버가 정상적으로 떠 있는지 확인해 보세요',
            '읽기 타임아웃 3.0초가 이 호출에 충분한지 확인해 보세요',
        ],
    },
} satisfies Meta<typeof NumberedList>

export default meta
type TStory = StoryObj<typeof meta>

/** 이렇게 확인해 보세요 */
export const Default: TStory = {
    play: async ({ canvas }) => {
        const items = canvas.getAllByRole('listitem')
        await expect(items).toHaveLength(2)
    },
}
