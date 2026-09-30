import type { ILogRow } from '../../types/log'

import { isFailure, type TTone } from './status'

export interface ITimelineBar {
    id: number
    /** 0~1, 가장 오래된 행 = 0 */
    x: number
    /** 1 정상 · 2 경고(4xx, 처리된 예외) · 3 실패 */
    level: 1 | 2 | 3
    tone: TTone
}

export interface ITimelineTick {
    x: number
    /** HH:mm */
    label: string
}

const MINUTE = 60_000
const WIDE_SPAN_MS = 10 * MINUTE

function severity(row: ILogRow): Pick<ITimelineBar, 'level' | 'tone'> {
    if (isFailure(row)) return { level: 3, tone: 'danger' }
    if ((row.statusCode ?? 0) >= 400 || row.exceptionClass) {
        return { level: 2, tone: 'warning' }
    }
    return { level: 1, tone: 'neutral' }
}

const pad = (n: number) => String(n).padStart(2, '0')

/** [min, max] 안의 stepMinutes 배수 분 (로컬 시각 기준) */
function minuteTicks(min: number, max: number, stepMinutes: number): number[] {
    const cursor = new Date(min)
    cursor.setSeconds(0, 0)
    if (cursor.getTime() < min) cursor.setMinutes(cursor.getMinutes() + 1)
    while (cursor.getMinutes() % stepMinutes !== 0) {
        cursor.setMinutes(cursor.getMinutes() + 1)
    }
    const ticks: number[] = []
    for (let t = cursor.getTime(); t <= max; t += stepMinutes * MINUTE) {
        ticks.push(t)
    }
    return ticks
}

/** 시간대별 요청 막대: 요청 하나가 막대 하나, 높이는 심각도 */
export function buildTimeline(rows: ILogRow[]): {
    bars: ITimelineBar[]
    ticks: ITimelineTick[]
} {
    if (rows.length === 0) return { bars: [], ticks: [] }
    const times = rows.map((r) => r.createdAt)
    const min = Math.min(...times)
    const max = Math.max(...times)
    const span = max - min
    const toX = (t: number) => (span === 0 ? 0.5 : (t - min) / span)

    const bars = rows.map((row) => ({
        id: row.id,
        x: toX(row.createdAt),
        ...severity(row),
    }))
    const ticks =
        span === 0
            ? []
            : minuteTicks(min, max, span >= WIDE_SPAN_MS ? 5 : 1).map((t) => {
                  const d = new Date(t)
                  return {
                      x: toX(t),
                      label: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
                  }
              })
    return { bars, ticks }
}
