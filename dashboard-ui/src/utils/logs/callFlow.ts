import type { ILogRow } from '../../types/log'

import { formatDuration } from './format'
import { getStatusTone, isFailure, type TTone } from './status'

/** work 내 서버가 직접 처리 · wait 다른 서버를 기다림 · call 보낸 요청 */
export type TCallFlowSegmentKind = 'work' | 'wait' | 'call'

export interface ICallFlowSegment {
    kind: TCallFlowSegmentKind
    /** 0~1 */
    start: number
    /** 0~1 */
    width: number
    tone: TTone
}

export interface ICallFlowLane {
    id: number
    isRoot: boolean
    /** '내 서버' 또는 보낸 대상 host */
    title: string
    /** 'GET /api/v1/payments/7781' */
    subtitle: string
    /** '3.0초' 또는 '3.0초 · 응답 없음' */
    durationLabel: string
    tone: TTone
    segments: ICallFlowSegment[]
}

export interface ICallFlow {
    /** 누가 시간을 썼는지 한 문장 */
    summary: string
    /** 다른 서버를 기다린 시간(ms, 겹친 구간은 한 번만) */
    waitMs: number
    lanes: ICallFlowLane[]
    ticks: { x: number; label: string }[]
}

export const MY_SERVER = '내 서버'
const UNKNOWN_HOST = '알 수 없는 서버'

function toneOf(row: ILogRow): TTone {
    if (isFailure(row)) return 'danger'
    return getStatusTone(row.statusCode) === 'warning' ? 'warning' : 'neutral'
}

/** [시작, 끝] ms 구간들의 합집합 (정렬·병합) */
function unionOf(intervals: [number, number][]): [number, number][] {
    const sorted = intervals.filter(([s, e]) => e > s).sort((a, b) => a[0] - b[0])
    const merged: [number, number][] = []
    for (const [start, end] of sorted) {
        const last = merged[merged.length - 1]
        if (last && start <= last[1]) last[1] = Math.max(last[1], end)
        else merged.push([start, end])
    }
    return merged
}

function summaryOf(root: ILogRow, calls: ILogRow[], waitMs: number): string {
    if (root.durationMs === null || root.durationMs <= 0) return '걸린 시간 정보가 없어요'
    const total = formatDuration(root.durationMs)
    if (calls.length === 0) return `보낸 요청 없이 ${MY_SERVER}가 ${total} 동안 직접 처리했어요`
    const hosts = new Set(calls.map((call) => call.targetHost ?? UNKNOWN_HOST))
    const waited = formatDuration(waitMs)
    return hosts.size === 1
        ? `${total} 중 ${waited}는 ${[...hosts][0]} 응답을 기다렸어요`
        : `${total} 중 ${waited}는 다른 서버 ${hosts.size}곳의 응답을 기다렸어요`
}

/**
 * 호출 흐름 — 서버별 레인 (spec F5·F5a).
 * 받은 요청 시작을 0 으로 두고, 보낸 요청은 created_at(시작 시각) 차이만큼 떨어진 곳에서 자기 소요만큼 그린다.
 * 내 서버 레인은 보낸 요청 구간의 합집합을 "기다림", 나머지를 "직접 처리"로 나눈다.
 * 로그에 스레드 정보가 없으므로 기다림은 추정치다 (보낸 요청 도중에 내 서버가 다른 일을 했을 수도 있다).
 */
export function buildCallFlow(root: ILogRow, calls: ILogRow[]): ICallFlow {
    const total = root.durationMs && root.durationMs > 0 ? root.durationMs : 1

    const callSpans = calls.map((call): [number, number] => {
        const offset = Math.min(total, Math.max(0, call.createdAt - root.createdAt))
        return [offset, Math.min(total, offset + (call.durationMs ?? 0))]
    })
    const waits = unionOf(callSpans)
    const waitMs = waits.reduce((sum, [s, e]) => sum + (e - s), 0)

    const rootSegments: ICallFlowSegment[] = []
    let cursor = 0
    for (const [start, end] of waits) {
        if (start > cursor) {
            rootSegments.push({ kind: 'work', start: cursor / total, width: (start - cursor) / total, tone: 'info' })
        }
        rootSegments.push({ kind: 'wait', start: start / total, width: (end - start) / total, tone: 'neutral' })
        cursor = end
    }
    if (cursor < total) {
        rootSegments.push({ kind: 'work', start: cursor / total, width: (total - cursor) / total, tone: 'info' })
    }

    const rootLane: ICallFlowLane = {
        id: root.id,
        isRoot: true,
        title: MY_SERVER,
        subtitle: `${root.method} ${root.path}`,
        durationLabel: formatDuration(root.durationMs),
        tone: toneOf(root),
        segments: rootSegments,
    }
    const callLanes = calls.map((call, index): ICallFlowLane => {
        const [start, end] = callSpans[index]
        return {
            id: call.id,
            isRoot: false,
            title: call.targetHost ?? UNKNOWN_HOST,
            subtitle: `${call.method} ${call.path}`,
            durationLabel:
                formatDuration(call.durationMs) + (call.statusCode === null ? ' · 응답 없음' : ''),
            tone: toneOf(call),
            segments: [{ kind: 'call', start: start / total, width: (end - start) / total, tone: toneOf(call) }],
        }
    })

    const tickLabel = (ms: number) => (ms === 0 ? '0' : formatDuration(ms < 1000 ? Math.round(ms) : ms))
    return {
        summary: summaryOf(root, calls, waitMs),
        waitMs,
        lanes: [rootLane, ...callLanes],
        ticks: [
            { x: 0, label: '0' },
            { x: 0.5, label: tickLabel(total / 2) },
            { x: 1, label: tickLabel(total) },
        ],
    }
}
