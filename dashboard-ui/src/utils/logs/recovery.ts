import type { ILogRow } from '../../types/log'

import { routeOf } from './problems'

/** 401 뒤 이 안에 같은 요청이 성공하면 회복으로 본다 (docs/specs/dashboard-recovered-401.md A1) */
export const RECOVERY_WINDOW_MS = 30_000

/** 같은 사용자(IP)의 같은 요청 — IP 가 없으면 알 수 없다 */
const requestKey = (row: ILogRow) =>
    row.kind === 'INBOUND' && row.clientIp
        ? `${row.serviceName}|${row.clientIp}|${row.method}|${routeOf(row)}`
        : null

const isSucceeded = (row: ILogRow) => row.statusCode !== null && row.statusCode < 400
const isAfter = (a: ILogRow, b: ILogRow) =>
    a.createdAt > b.createdAt || (a.createdAt === b.createdAt && a.id > b.id)

/**
 * 재시도로 회복된 401 의 id (A1·A2). 토큰 만료 → 재발급 → 같은 요청 재시도 같은 정상 흐름이다.
 * 회복되지 않은 401 은 진짜 문제일 수 있어(시계 어긋남·키 불일치·리프레시 고장) 그대로 둔다.
 */
export function findRecoveredAuth(rows: ILogRow[]): Set<number> {
    const successes = new Map<string, ILogRow[]>()
    for (const row of rows) {
        const key = requestKey(row)
        if (key && isSucceeded(row)) successes.set(key, [...(successes.get(key) ?? []), row])
    }

    const recovered = new Set<number>()
    for (const row of rows) {
        if (row.statusCode !== 401) continue
        const key = requestKey(row)
        const candidates = key ? successes.get(key) : undefined
        const isRecovered = candidates?.some(
            (retry) => isAfter(retry, row) && retry.createdAt - row.createdAt <= RECOVERY_WINDOW_MS,
        )
        if (isRecovered) recovered.add(row.id)
    }
    return recovered
}
