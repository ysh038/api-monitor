import { describe, expect, it } from 'vitest'

import { makeRow } from '../../mocks/logFixtures'

import { buildTimeline } from './timeline'

const at = (h: number, m: number, s = 0) =>
    new Date(2026, 8, 29, h, m, s).getTime()

describe('buildTimeline (D5)', () => {
    it('x 는 시간순 0~1, 높이는 심각도', () => {
        const ok = makeRow({ statusCode: 200, createdAt: at(8, 50) })
        const warn = makeRow({ statusCode: 404, createdAt: at(9, 0) })
        const fail = makeRow({ statusCode: null, createdAt: at(9, 10) })
        const { bars } = buildTimeline([fail, warn, ok])

        const byId = new Map(bars.map((b) => [b.id, b]))
        expect(byId.get(ok.id)).toMatchObject({ x: 0, level: 1, tone: 'neutral' })
        expect(byId.get(warn.id)).toMatchObject({
            x: 0.5,
            level: 2,
            tone: 'warning',
        })
        expect(byId.get(fail.id)).toMatchObject({ x: 1, level: 3, tone: 'danger' })
    })

    it('처리된 예외가 있는 2xx 는 경고 높이', () => {
        const { bars } = buildTimeline([
            makeRow({ statusCode: 200, exceptionClass: 'X' }),
        ])
        expect(bars[0].level).toBe(2)
    })

    it('행이 하나면 가운데', () => {
        const { bars } = buildTimeline([makeRow()])
        expect(bars[0].x).toBe(0.5)
    })

    it('10분 이상이면 5분 눈금', () => {
        const { ticks } = buildTimeline([
            makeRow({ createdAt: at(9, 10, 30) }),
            makeRow({ createdAt: at(8, 49, 41) }),
        ])
        expect(ticks.map((t) => t.label)).toEqual([
            '08:50',
            '08:55',
            '09:00',
            '09:05',
            '09:10',
        ])
        expect(ticks[0].x).toBeGreaterThan(0)
        expect(ticks[4].x).toBeLessThan(1)
    })

    it('10분 미만이면 1분 눈금', () => {
        const { ticks } = buildTimeline([
            makeRow({ createdAt: at(9, 3, 10) }),
            makeRow({ createdAt: at(9, 0, 30) }),
        ])
        expect(ticks.map((t) => t.label)).toEqual(['09:01', '09:02', '09:03'])
    })

    it('빈 목록', () => {
        expect(buildTimeline([])).toEqual({ bars: [], ticks: [] })
    })
})
