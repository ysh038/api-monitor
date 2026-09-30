import { describe, expect, it } from 'vitest'

import { BASE_TIME, makeOutbound, makeRow } from '../../mocks/logFixtures'

import { buildCallFlow } from './callFlow'

const close = (n: number) => Math.round(n * 1000) / 1000

describe('buildCallFlow — 서버별 레인 (F5)', () => {
    it('내 서버 레인은 직접 처리 구간과 기다린 구간으로 나뉜다', () => {
        const root = makeRow({ method: 'GET', path: '/api/v1/payments/7781', statusCode: 500, durationMs: 3000 })
        const call = makeOutbound(root, {
            targetHost: 'pg:9000',
            method: 'GET',
            path: '/status',
            statusCode: null,
            durationMs: 1500,
            createdAt: BASE_TIME + 750,
        })
        const flow = buildCallFlow(root, [call])

        expect(flow.lanes[0]).toEqual({
            id: root.id,
            isRoot: true,
            title: '내 서버',
            subtitle: 'GET /api/v1/payments/7781',
            durationLabel: '3.0초',
            tone: 'danger',
            segments: [
                { kind: 'work', start: 0, width: 0.25, tone: 'info' },
                { kind: 'wait', start: 0.25, width: 0.5, tone: 'neutral' },
                { kind: 'work', start: 0.75, width: 0.25, tone: 'info' },
            ],
        })
        expect(flow.lanes[1]).toEqual({
            id: call.id,
            isRoot: false,
            title: 'pg:9000',
            subtitle: 'GET /status',
            durationLabel: '1.5초 · 응답 없음',
            tone: 'danger',
            segments: [{ kind: 'call', start: 0.25, width: 0.5, tone: 'danger' }],
        })
        expect(flow.ticks).toEqual([
            { x: 0, label: '0' },
            { x: 0.5, label: '1.5초' },
            { x: 1, label: '3.0초' },
        ])
    })

    it('동시에 보낸 요청이 겹치면 기다린 시간은 한 번만 센다', () => {
        const root = makeRow({ durationMs: 1000 })
        const a = makeOutbound(root, { durationMs: 400, createdAt: BASE_TIME + 100 })
        const b = makeOutbound(root, { durationMs: 400, createdAt: BASE_TIME + 300 })
        const flow = buildCallFlow(root, [a, b])
        const wait = flow.lanes[0].segments.filter((s) => s.kind === 'wait')
        expect(wait.map((s) => [close(s.start), close(s.width)])).toEqual([[0.1, 0.6]])
        expect(flow.waitMs).toBe(600)
    })

    it('받은 요청 범위를 넘는 보낸 요청은 잘라낸다', () => {
        const root = makeRow({ durationMs: 100 })
        const call = makeOutbound(root, { durationMs: 500, createdAt: BASE_TIME + 50 })
        const [, lane] = buildCallFlow(root, [call]).lanes
        expect(lane.segments).toEqual([{ kind: 'call', start: 0.5, width: 0.5, tone: 'neutral' }])
    })

    it('받은 요청보다 먼저 기록된 보낸 요청은 0 에서 시작', () => {
        const root = makeRow({ durationMs: 100 })
        const call = makeOutbound(root, { durationMs: 40, createdAt: BASE_TIME - 10 })
        const [, lane] = buildCallFlow(root, [call]).lanes
        expect(lane.segments[0].start).toBe(0)
        expect(lane.segments[0].width).toBe(0.4)
    })

    it('정상 호출은 neutral, 4xx 는 warning', () => {
        const root = makeRow({ statusCode: 200, durationMs: 10 })
        const call = makeOutbound(root, { statusCode: 404, durationMs: 5 })
        const [rootLane, lane] = buildCallFlow(root, [call]).lanes
        expect(rootLane.tone).toBe('neutral')
        expect(lane.tone).toBe('warning')
    })

    it('호스트가 없으면 제목은 알 수 없는 서버', () => {
        const root = makeRow({ durationMs: 10 })
        const call = makeOutbound(root, { targetHost: null, durationMs: 5 })
        expect(buildCallFlow(root, [call]).lanes[1].title).toBe('알 수 없는 서버')
    })
})

describe('눈금', () => {
    it('1초 미만 눈금은 ms 를 정수로 반올림한다', () => {
        expect(buildCallFlow(makeRow({ durationMs: 27 }), []).ticks.map((t) => t.label)).toEqual([
            '0',
            '14ms',
            '27ms',
        ])
    })
})

describe('요약 문장 (F5a)', () => {
    it('한 서버', () => {
        const root = makeRow({ durationMs: 3000 })
        const call = makeOutbound(root, { targetHost: 'pg-gateway:9000', durationMs: 2900, createdAt: BASE_TIME + 50 })
        expect(buildCallFlow(root, [call]).summary).toBe('3.0초 중 2.9초는 pg-gateway:9000 응답을 기다렸어요')
    })

    it('같은 서버로 여러 번 보내도 한 서버', () => {
        const root = makeRow({ durationMs: 1000 })
        const calls = [
            makeOutbound(root, { targetHost: 'ai:8000', durationMs: 200, createdAt: BASE_TIME }),
            makeOutbound(root, { targetHost: 'ai:8000', durationMs: 200, createdAt: BASE_TIME + 500 }),
        ]
        expect(buildCallFlow(root, calls).summary).toBe('1.0초 중 400ms는 ai:8000 응답을 기다렸어요')
    })

    it('여러 서버', () => {
        const root = makeRow({ durationMs: 1000 })
        const calls = [
            makeOutbound(root, { targetHost: 'ai:8000', durationMs: 200, createdAt: BASE_TIME }),
            makeOutbound(root, { targetHost: 'pg:9000', durationMs: 300, createdAt: BASE_TIME + 500 }),
        ]
        expect(buildCallFlow(root, calls).summary).toBe('1.0초 중 500ms는 다른 서버 2곳의 응답을 기다렸어요')
    })

    it('보낸 요청이 없으면 내 서버가 전부 처리 — 레인 하나, 전부 직접 처리 구간', () => {
        const flow = buildCallFlow(makeRow({ durationMs: 3000 }), [])
        expect(flow.summary).toBe('보낸 요청 없이 내 서버가 3.0초 동안 직접 처리했어요')
        expect(flow.lanes).toHaveLength(1)
        expect(flow.lanes[0].segments).toEqual([{ kind: 'work', start: 0, width: 1, tone: 'info' }])
    })

    it('소요 정보가 없으면 0 으로 나누지 않고 그렇다고 말한다', () => {
        const flow = buildCallFlow(makeRow({ durationMs: null }), [])
        expect(flow.summary).toBe('걸린 시간 정보가 없어요')
        expect(Number.isFinite(flow.ticks[1].x)).toBe(true)
    })
})
