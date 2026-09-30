import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'

import KeyValueList from './KeyValueList'

const meta = {
    title: 'Atoms/KeyValueList',
    component: KeyValueList,
    tags: ['autodocs'],
    args: {
        items: [
            { key: 'status', label: '상태', value: '500 Internal Server Error', tone: 'danger' },
            { key: 'kind', label: '방향', value: '받은 요청' },
            { key: 'time', label: '시각', value: '9월 29일 오전 09:08:46.227' },
            { key: 'duration', label: '걸린 시간', value: '3.0초', tone: 'danger' },
            { key: 'ex', label: '예외', value: 'ResourceAccessException' },
        ],
    },
} satisfies Meta<typeof KeyValueList>

export default meta
type TStory = StoryObj<typeof meta>

/** 상세 요약 표 (이미지의 상태·방향·시각·걸린 시간·예외) */
export const Default: TStory = {
    play: async ({ canvas }) => {
        await expect(canvas.getByText('상태')).toBeVisible()
        await expect(canvas.getByText('500 Internal Server Error')).toBeVisible()
    },
}
