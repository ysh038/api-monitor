import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn } from 'storybook/test'

import { makeDetail, makeOutbound, makeRow, makeScenario } from '../../../mocks/logFixtures'

import LogDetail from './LogDetail'

const scenario = makeScenario()
const paymentCall = scenario[2]
const payment = scenario[3]

const STACK = [
    'org.springframework.web.client.ResourceAccessException: I/O error on GET request',
    '\tat org.springframework.web.client.RestTemplate.doExecute(RestTemplate.java:915)',
    '\tat com.example.pay.PaymentClient.status(PaymentClient.java:42)',
    ...Array.from({ length: 17 }, (_, i) => `\tat org.apache.catalina.core.Valve${i}.invoke(Valve.java:${i})`),
].join('\n')

const paymentDetail = makeDetail(payment, {
    exceptionStacktrace: STACK,
    exceptionCauses: [{ exceptionClass: 'java.net.SocketTimeoutException', message: 'Read timed out' }],
    requestHeaders: { accept: 'application/json', 'x-request-id': 'req-7781' },
    responseHeaders: {},
    requestBody: null,
    responseBody: '{"error":"Internal Server Error","status":500}',
    isResponseBodyTruncated: true,
    related: {
        children: [paymentCall],
        parent: null,
        sameRequestId: [makeRow({ serviceName: 'pay-api', path: '/internal/payments/7781' })],
    },
})

const meta = {
    title: 'Logs/LogDetail',
    component: LogDetail,
    tags: ['autodocs'],
    args: {
        detail: paymentDetail,
        isLoading: false,
        onNavigate: fn(),
        onCopy: fn(),
    },
} satisfies Meta<typeof LogDetail>

export default meta
type TStory = StoryObj<typeof meta>

/** 참고 이미지 상세: 배지 · 원인 문장 · 확인 가이드 · 표 · 예외 · 호출 흐름 */
export const FailedByCall: TStory = {
    play: async ({ canvas }) => {
        await expect(canvas.getByText('500 · 서버 오류')).toBeVisible()
        await expect(
            canvas.getByRole('heading', {
                name: 'pg-gateway:9000 호출이 실패해서 이 요청도 실패했어요',
            }),
        ).toBeVisible()
        await expect(canvas.getByRole('heading', { name: '이렇게 확인해 보세요' })).toBeVisible()
        await expect(canvas.getByText('500 Internal Server Error')).toBeVisible()
        await expect(canvas.getByText('9월 29일 오전 09:08:46.227')).toBeVisible()
        await expect(canvas.getByText('Caused by: java.net.SocketTimeoutException')).toBeVisible()
        await expect(canvas.getByRole('heading', { name: '호출 흐름' })).toBeVisible()
    },
}

/** F6: 12줄 넘는 스택트레이스는 접었다 펼친다 */
export const StackToggle: TStory = {
    play: async ({ canvas, userEvent }) => {
        const stack = canvas.getByRole('region', { name: '스택트레이스' })
        await expect(stack).not.toHaveTextContent('Valve16')
        await userEvent.click(canvas.getByRole('button', { name: '전체 스택트레이스 보기 (20줄)' }))
        await expect(stack).toHaveTextContent('Valve16')
        await expect(canvas.getByRole('button', { name: '접기' })).toBeVisible()
    },
}

/** F8: 호출 흐름의 외부 호출·연관 목록을 누르면 그 상세로 */
export const Navigate: TStory = {
    play: async ({ canvas, userEvent, args }) => {
        await userEvent.click(canvas.getByRole('button', { name: /pg-gateway:9000 GET \/payments\/7781\/status/ }))
        await expect(args.onNavigate).toHaveBeenCalledWith(paymentCall.id)
        await userEvent.click(canvas.getByRole('button', { name: /\/internal\/payments\/7781/ }))
        await expect(args.onNavigate).toHaveBeenCalledTimes(2)
    },
}

/** F9: 요청/응답 탭 */
export const MessageTabs: TStory = {
    play: async ({ canvas, userEvent }) => {
        const panel = () => canvas.getByRole('tabpanel')
        await expect(panel()).toHaveTextContent('x-request-id')
        await expect(panel()).toHaveTextContent('바디 없음')
        await userEvent.click(canvas.getByRole('tab', { name: '응답' }))
        await expect(panel()).toHaveTextContent('헤더 없음')
        await expect(panel()).toHaveTextContent('"status": 500')
        await expect(panel()).toHaveTextContent('최대 크기를 넘어 앞부분만 저장되었습니다.')
    },
}

/** F10: requestId 복사 */
export const Copy: TStory = {
    play: async ({ canvas, userEvent, args }) => {
        const button = canvas.getByRole('button', { name: 'requestId 복사' })
        await userEvent.click(button)
        await expect(args.onCopy).toHaveBeenCalledWith(payment.requestId)
        await expect(button).toHaveTextContent('복사됨')
    },
}

/** F11: Mock 데이터 */
export const Mock: TStory = {
    args: { detail: makeDetail(makeRow({ isMock: true })) },
    play: async ({ canvas }) => {
        await expect(canvas.getByText(/Mock 데이터/)).toBeVisible()
        await expect(canvas.getByText('MOCK')).toBeVisible()
    },
}

/** F7: 결과 박스 문구 */
export const ResultOk: TStory = {
    args: { detail: makeDetail(makeRow({ statusCode: 200 })) },
    play: async ({ canvas }) => {
        await expect(canvas.getByText('✓ 정상 처리')).toBeVisible()
    },
}

export const ResultRejected: TStory = {
    args: { detail: makeDetail(makeRow({ statusCode: 401 })) },
    play: async ({ canvas }) => {
        await expect(
            canvas.getByText('요청 거부 401 · 예외 정보 없음 (인증 필터 등 컨트롤러 이전 단계 응답)'),
        ).toBeVisible()
        await expect(canvas.getByText('인증 토큰이나 권한 설정이 맞는지 확인해 보세요')).toBeVisible()
    },
}

export const ResultServerError: TStory = {
    args: { detail: makeDetail(makeRow({ statusCode: 503 })) },
    play: async ({ canvas }) => {
        await expect(canvas.getByText('서버 오류 503 · 예외 정보 없음')).toBeVisible()
    },
}

/** 외부 호출 상세 — 부모 요청이 흐름 맨 위, 부모 requestId 표시 */
export const OutboundCall: TStory = {
    args: {
        detail: makeDetail(paymentCall, {
            exceptionStacktrace: 'java.net.SocketTimeoutException: Read timed out',
            related: { children: [], parent: payment, sameRequestId: [] },
        }),
    },
    play: async ({ canvas, userEvent, args }) => {
        await expect(canvas.getByText('pg-gateway:9000에서 응답을 받지 못했어요')).toBeVisible()
        await expect(canvas.getByText('보낸 요청 실패')).toBeVisible()
        await expect(canvas.getByText('부모 requestId')).toBeVisible()
        await userEvent.click(canvas.getByRole('button', { name: /GET \/api\/v1\/payments\/7781/ }))
        await expect(args.onNavigate).toHaveBeenCalledWith(payment.id)
    },
}

export const BackgroundCall: TStory = {
    args: { detail: makeDetail(makeOutbound(null, { statusCode: 200 })) },
    play: async ({ canvas }) => {
        await expect(canvas.getByText('보낸 요청 (백그라운드)')).toBeVisible()
        // F5b: 보낸 받은 요청이 없는 백그라운드 호출은 호출 흐름을 그리지 않는다
        await expect(canvas.queryByRole('heading', { name: '호출 흐름' })).toBeNull()
    },
}

export const Loading: TStory = {
    args: { detail: undefined, isLoading: true },
    play: async ({ canvas }) => {
        await expect(canvas.getByRole('status')).toHaveTextContent('불러오는 중')
    },
}

export const NotFound: TStory = {
    args: { detail: null },
    play: async ({ canvas }) => {
        await expect(canvas.getByRole('status')).toHaveTextContent('이 요청을 찾을 수 없어요')
    },
}

/** F5·F5a: 서버별 레인 — 내 서버 · 보낸 대상, 누가 시간을 썼는지 한 문장 */
export const FlowLanes: TStory = {
    play: async ({ canvas }) => {
        await expect(canvas.getByText('3.0초 중 3.0초는 pg-gateway:9000 응답을 기다렸어요')).toBeVisible()
        await expect(canvas.getByText('내 서버', { selector: '*' })).toBeVisible()
        // 지금 보고 있는 내 서버 레인은 누를 수 없고, 보낸 요청 레인은 누를 수 있다
        await expect(canvas.queryByRole('button', { name: /^내 서버/ })).toBeNull()
        await expect(canvas.getByRole('button', { name: /^pg-gateway:9000/ })).toBeVisible()
    },
}

/** F5b: 보낸 요청이 없어도 호출 흐름을 보여 준다 (원인이 내 서버 안쪽이라는 뜻) */
export const NoOutboundCalls: TStory = {
    args: { detail: makeDetail(makeRow({ statusCode: 200, durationMs: 3000 })) },
    play: async ({ canvas }) => {
        await expect(canvas.getByRole('heading', { name: '호출 흐름' })).toBeVisible()
        await expect(canvas.getByText('보낸 요청 없음')).toBeVisible()
        await expect(canvas.getByText('보낸 요청 없이 내 서버가 3.0초 동안 직접 처리했어요')).toBeVisible()
    },
}
