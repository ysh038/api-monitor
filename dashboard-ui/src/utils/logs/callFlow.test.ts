import { describe, expect, it } from 'vitest'

import { BASE_TIME, makeOutbound, makeRow } from '../../mocks/logFixtures'

import { buildCallFlow } from './callFlow'

describe('buildCallFlow (F5)', () => {
    it('부모는 전체, 자식은 시작 차이만큼 떨어진 위치', () => {
        const root = makeRow({ statusCode: 500, durationMs: 3000 })
        const call = makeOutbound(root, {
            targetHost: 'pg:9000',
            path: '/status',
            statusCode: null,
            durationMs: 1500,
            createdAt: BASE_TIME + 750,
        })
        const flow = buildCallFlow(root, [call])

        expect(flow.bars).toEqual([
            expect.objectContaining({
                id: root.id,
                start: 0,
                width: 1,
                tone: 'danger',
                durationLabel: '3.0초',
                isRoot: true,
            }),
            expect.objectContaining({
                id: call.id,
                start: 0.25,
                width: 0.5,
                tone: 'danger',
                label: '→ pg:9000/status',
                durationLabel: '1.5초 · 응답 없음',
                isRoot: false,
            }),
        ])
        expect(flow.ticks).toEqual([
            { x: 0, label: '0' },
            { x: 0.5, label: '1.5초' },
            { x: 1, label: '3.0초' },
        ])
    })

    it('부모 범위를 넘는 자식은 잘라낸다', () => {
        const root = makeRow({ durationMs: 100 })
        const call = makeOutbound(root, {
            durationMs: 500,
            createdAt: BASE_TIME + 50,
        })
        const [, child] = buildCallFlow(root, [call]).bars
        expect(child.start).toBe(0.5)
        expect(child.width).toBe(0.5)
    })

    it('부모보다 먼저 기록된 자식은 0 에서 시작', () => {
        const root = makeRow({ durationMs: 100 })
        const call = makeOutbound(root, {
            durationMs: 40,
            createdAt: BASE_TIME - 10,
        })
        const [, child] = buildCallFlow(root, [call]).bars
        expect(child.start).toBe(0)
        expect(child.width).toBe(0.4)
    })

    it('정상 호출은 neutral, 4xx 는 warning', () => {
        const root = makeRow({ statusCode: 200, durationMs: 10 })
        const call = makeOutbound(root, { statusCode: 404, durationMs: 5 })
        const [rootBar, child] = buildCallFlow(root, [call]).bars
        expect(rootBar.tone).toBe('neutral')
        expect(child.tone).toBe('warning')
    })

    it('소요가 없으면 0 으로 나누지 않는다', () => {
        const flow = buildCallFlow(makeRow({ durationMs: null }), [])
        expect(flow.bars[0].width).toBe(1)
        expect(Number.isFinite(flow.ticks[1].x)).toBe(true)
    })
})
