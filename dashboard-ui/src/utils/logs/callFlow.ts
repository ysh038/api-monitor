import type { ILogRow } from '../../types/log'

import { formatDuration } from './format'
import { getStatusTone, isFailure, type TTone } from './status'

export interface ICallFlowBar {
    id: number
    isRoot: boolean
    /** 'GET /api/v1/payments/7781' 또는 '→ host/path' */
    label: string
    /** 0~1 */
    start: number
    /** 0~1 */
    width: number
    tone: TTone
    /** '3.0초' 또는 '3.0초 · 응답 없음' */
    durationLabel: string
}

export interface ICallFlow {
    bars: ICallFlowBar[]
    ticks: { x: number; label: string }[]
}

function toneOf(row: ILogRow): TTone {
    if (isFailure(row)) return 'danger'
    return getStatusTone(row.statusCode) === 'warning' ? 'warning' : 'neutral'
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n))

/** 호출 흐름 워터폴: 부모 요청 = 0~끝, 외부 호출 = 시작 시각 차이만큼 떨어진 막대 */
export function buildCallFlow(root: ILogRow, children: ILogRow[]): ICallFlow {
    const total = root.durationMs && root.durationMs > 0 ? root.durationMs : 1

    const rootBar: ICallFlowBar = {
        id: root.id,
        isRoot: true,
        label: `${root.method} ${root.path}`,
        start: 0,
        width: 1,
        tone: toneOf(root),
        durationLabel: formatDuration(root.durationMs),
    }
    const childBars = children.map((child): ICallFlowBar => {
        const offset = Math.min(total, Math.max(0, child.createdAt - root.createdAt))
        const length = Math.min(child.durationMs ?? 0, total - offset)
        return {
            id: child.id,
            isRoot: false,
            label: `→ ${child.targetHost ?? ''}${child.path}`,
            start: clamp01(offset / total),
            width: clamp01(length / total),
            tone: toneOf(child),
            durationLabel:
                formatDuration(child.durationMs) +
                (child.statusCode === null ? ' · 응답 없음' : ''),
        }
    })

    const tickLabel = (ms: number) => (ms === 0 ? '0' : formatDuration(ms))
    return {
        bars: [rootBar, ...childBars],
        ticks: [
            { x: 0, label: '0' },
            { x: 0.5, label: tickLabel(total / 2) },
            { x: 1, label: tickLabel(total) },
        ],
    }
}
