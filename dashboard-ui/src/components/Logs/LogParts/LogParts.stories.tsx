import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'

import { makeOutbound, makeRow } from '../../../mocks/logFixtures'

import { ExceptionTag, LogPath, MockTag, StatusText } from './LogParts'

const meta = {
    title: 'Logs/LogParts',
    component: LogPath,
    tags: ['autodocs'],
    args: { row: makeRow({ path: '/api/v1/payments/7781' }) },
} satisfies Meta<typeof LogPath>

export default meta
type TStory = StoryObj<typeof meta>

export const InboundPath: TStory = {
    play: async ({ canvas }) => {
        await expect(canvas.getByText('/api/v1/payments/7781')).toBeVisible()
    },
}

/** C6: 외부 호출은 → host path, 부모 없으면 백그라운드 */
export const BackgroundCall: TStory = {
    args: { row: makeOutbound(null, { targetHost: 'pg-gateway:9000', path: '/status' }) },
    play: async ({ canvas }) => {
        await expect(canvas.getByText('→')).toBeVisible()
        await expect(canvas.getByText('pg-gateway:9000')).toBeVisible()
        await expect(canvas.getByText('백그라운드')).toBeVisible()
    },
}

/** 트리로 부모 아래 붙은 외부 호출 */
export const NestedCall: TStory = {
    args: {
        row: makeOutbound(makeRow(), { targetHost: 'ai-server:8000', path: '/predict' }),
        isNested: true,
    },
    play: async ({ canvas }) => {
        await expect(canvas.getByText('└')).toBeVisible()
        await expect(canvas.queryByText('백그라운드')).toBeNull()
    },
}

/** C6: 자식이 트리에 안 보이면 외부 호출 N 태그 */
export const WithChildCount: TStory = {
    args: { row: makeRow({ childCount: 2 }), isChildCountShown: true },
    play: async ({ canvas }) => {
        await expect(canvas.getByText('외부 호출 2')).toBeVisible()
    },
}

/** C7: MOCK 태그 */
export const Mock: TStory = {
    args: { row: makeRow({ isMock: true }) },
    play: async ({ canvas }) => {
        await expect(canvas.getByText('MOCK')).toBeVisible()
    },
}

/** 연관 목록: 들어온 요청 앞에 [서비스] */
export const WithService: TStory = {
    args: { row: makeRow({ serviceName: 'pay-api' }), isServiceShown: true },
    play: async ({ canvas }) => {
        await expect(canvas.getByText('[pay-api]')).toBeVisible()
    },
}

export const Parts: TStory = {
    render: () => (
        <>
            <StatusText code={500} />
            <StatusText code={null} />
            <StatusText code={404} />
            <StatusText code={200} />
            <MockTag />
            <ExceptionTag row={makeRow({ statusCode: 400, exceptionClass: 'a.b.MethodArgumentNotValidException' })} />
            <ExceptionTag row={makeRow({ statusCode: 500, exceptionClass: 'a.b.DataIntegrityViolationException', exceptionMessage: 'dup' })} />
        </>
    ),
    play: async ({ canvas }) => {
        await expect(canvas.getByText('응답 없음')).toBeVisible()
        await expect(canvas.getByText('DataIntegrityViolationException')).toHaveAttribute(
            'title',
            'a.b.DataIntegrityViolationException: dup',
        )
    },
}
