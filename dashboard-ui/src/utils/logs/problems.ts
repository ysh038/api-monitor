import type { ILogRow } from '../../types/log'

import { diagnose } from './diagnosis'
import { formatDuration } from './format'
import { parentKey } from './listView'
import { getStatusLabel, getStatusTone, isFailure, isRejected, type TTone } from './status'

/** 반복되는 문제 한 줄 (docs/specs/dashboard-problem-summary.md P4) */
export interface IProblem {
    key: string
    /** 상세의 원인 문장과 같은 문장 */
    title: string
    /** 'POST /api/v1/orders/{id}' 또는 '→ pg-gateway:9000' */
    context: string
    /** '500' · '응답 없음' */
    status: string
    tone: TTone
    count: number
    lastAt: number
    /** 가장 최근에 난 행 — 누르면 이 상세를 연다 */
    latestId: number
}

/** 외부 연결 상태 한 줄 (H1) */
export interface IHostHealth {
    host: string
    /** 마지막 호출 결과: 정상 · 4xx · 실패(5xx·응답 없음) */
    state: 'ok' | 'warn' | 'fail'
    /** 정상이면 걸린 시간, 아니면 이유 */
    detail: string
    total: number
    failed: number
    /** 마지막으로 성공한 시각. 한 번도 없으면 null */
    lastSuccessAt: number | null
    latestId: number
}

/** 요약은 불러온 행 중 항상 최신 이만큼으로 계산한다 (spec L1) */
export const PROBLEM_BASIS_ROWS = 100

/** 요약 기준 행 — 최신 100건 (적으면 전부). 목록은 최신순이다 */
export const problemBasis = (rows: ILogRow[]) => rows.slice(0, PROBLEM_BASIS_ROWS)

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const LONG_HEX = /^[0-9a-f]{16,}$/i
const NUMBER = /^\d+$/

/** 경로 템플릿이 없을 때 ID 조각을 {id} 로 바꿔 같은 API 끼리 묶는다 (P2) */
export function normalizePath(path: string): string {
    const [pathname] = path.split('?')
    return pathname
        .split('/')
        .map((segment) =>
            NUMBER.test(segment) || UUID.test(segment) || LONG_HEX.test(segment) ? '{id}' : segment,
        )
        .join('/')
}

const isProblemRow = (row: ILogRow) => isFailure(row) || isRejected(row)
const routeOf = (row: ILogRow) => row.route ?? normalizePath(row.path)
/** 백엔드 로그 표준의 집계 기준과 같은 우선순위: errorCode → rootCauseType → 예외 클래스 */
const causeOf = (row: ILogRow) => row.errorCode ?? row.rootCauseType ?? row.exceptionClass ?? ''
const isNewer = (a: ILogRow, b: ILogRow) =>
    a.createdAt > b.createdAt || (a.createdAt === b.createdAt && a.id > b.id)

interface IDraft {
    key: string
    context: string
    latest: ILogRow
    latestChildren: ILogRow[]
    count: number
}

/**
 * 반복되는 문제 — 불러온 행의 실패·4xx 를 원인별로 묶는다 (P1~P5).
 * 실패한 받은 요청이 실패한 보낸 요청을 가졌으면 원인은 그 대상 서버이고, 그 보낸 요청은 따로 세지 않는다.
 */
export function buildProblems(rows: ILogRow[]): IProblem[] {
    const inbound = new Map<string, ILogRow>()
    const failedCalls = new Map<string, ILogRow[]>()
    for (const row of rows) {
        if (row.kind === 'INBOUND' && row.requestId) {
            inbound.set(parentKey(row.serviceName, row.requestId), row)
        }
        if (row.kind === 'OUTBOUND' && row.parentRequestId && isFailure(row)) {
            const key = parentKey(row.serviceName, row.parentRequestId)
            failedCalls.set(key, [...(failedCalls.get(key) ?? []), row])
        }
    }

    const drafts = new Map<string, IDraft>()
    for (const row of rows) {
        if (!isProblemRow(row)) continue
        const status = getStatusLabel(row.statusCode)
        let key: string
        let context: string
        let children: ILogRow[] = []

        if (row.kind === 'OUTBOUND') {
            const parent = row.parentRequestId
                ? inbound.get(parentKey(row.serviceName, row.parentRequestId))
                : undefined
            // 부모 요청의 문제로 이미 세었다
            if (parent && isFailure(parent) && isFailure(row)) continue
            const host = row.targetHost ?? ''
            key = `out|${host}|${status}|${causeOf(row)}`
            context = `→ ${host}`
        } else {
            const calls = row.requestId && isFailure(row)
                ? (failedCalls.get(parentKey(row.serviceName, row.requestId)) ?? [])
                : []
            const cause = calls.length > 0 ? `call:${calls[0].targetHost ?? ''}` : causeOf(row)
            key = `in|${row.method}|${routeOf(row)}|${status}|${cause}`
            context = `${row.method} ${routeOf(row)}`
            children = calls
        }

        const draft = drafts.get(key)
        if (!draft) {
            drafts.set(key, { key, context, latest: row, latestChildren: children, count: 1 })
            continue
        }
        draft.count += 1
        if (isNewer(row, draft.latest)) {
            draft.latest = row
            draft.latestChildren = children
        }
    }

    return [...drafts.values()]
        .map(({ key, context, latest, latestChildren, count }) => ({
            key,
            title: diagnose(latest, latestChildren).headline,
            context,
            status: getStatusLabel(latest.statusCode),
            tone: getStatusTone(latest.statusCode),
            count,
            lastAt: latest.createdAt,
            latestId: latest.id,
        }))
        .sort((a, b) => b.lastAt - a.lastAt || b.count - a.count || a.key.localeCompare(b.key))
}

const TIMEOUT = /(SocketTimeout|Timeout)Exception$/
const TIMEOUT_MESSAGE = /timed? ?out/i
const UNKNOWN_HOST = /UnknownHostException$/
const CONNECT = /(Connect|NoRouteToHost)Exception$/
const CONNECT_MESSAGE = /connection refused/i
const CERTIFICATE = /(SSL\w*Exception|CertPathValidatorException)$/

/** 실패한 보낸 요청의 이유 한 마디 (H2) */
function failureReasonOf(row: ILogRow): string {
    if (row.statusCode !== null) return `HTTP ${row.statusCode}`
    const exceptionClass = row.exceptionClass ?? ''
    const message = row.exceptionMessage ?? ''
    if (CERTIFICATE.test(exceptionClass)) return '인증서 오류'
    if (UNKNOWN_HOST.test(exceptionClass)) return '주소를 찾지 못함'
    if (TIMEOUT.test(exceptionClass) || TIMEOUT_MESSAGE.test(message)) return '타임아웃'
    if (CONNECT.test(exceptionClass) || CONNECT_MESSAGE.test(message)) return '연결 거부'
    return '응답 없음'
}

const STATE_ORDER: Record<IHostHealth['state'], number> = { fail: 0, warn: 1, ok: 2 }

/** 외부 연결 상태 — 보낸 대상 서버마다 마지막 결과와 마지막 성공 시각 (H1~H3) */
export function buildHostHealth(rows: ILogRow[]): IHostHealth[] {
    const byHost = new Map<string, ILogRow[]>()
    for (const row of rows) {
        if (row.kind !== 'OUTBOUND' || !row.targetHost) continue
        byHost.set(row.targetHost, [...(byHost.get(row.targetHost) ?? []), row])
    }

    return [...byHost]
        .map(([host, calls]): IHostHealth => {
            const latest = calls.reduce((a, b) => (isNewer(b, a) ? b : a))
            const successes = calls.filter((call) => !isProblemRow(call))
            const state = isFailure(latest) ? 'fail' : isRejected(latest) ? 'warn' : 'ok'
            return {
                host,
                state,
                detail: state === 'ok' ? formatDuration(latest.durationMs) : failureReasonOf(latest),
                total: calls.length,
                failed: calls.filter(isFailure).length,
                lastSuccessAt: successes.length > 0 ? Math.max(...successes.map((s) => s.createdAt)) : null,
                latestId: latest.id,
            }
        })
        .sort((a, b) => STATE_ORDER[a.state] - STATE_ORDER[b.state] || a.host.localeCompare(b.host))
}
