import type { ILogRow } from '../../types/log'

import { formatCount } from './format'
import { parentKey } from './listView'
import { isFailure } from './status'

export interface IRequestSummary {
    total: number
    failed: number
    /** 스스로 실패한 외부 호출 + 실패한 외부 호출을 가진 실패 요청 */
    outboundRelated: number
}

export interface IHostSummary {
    host: string
    total: number
    failed: number
    label: string
}

export function summarizeRequests(rows: ILogRow[]): IRequestSummary {
    const parentsWithFailedCall = new Set<string>()
    for (const row of rows) {
        if (row.kind === 'OUTBOUND' && row.parentRequestId && isFailure(row)) {
            parentsWithFailedCall.add(parentKey(row.serviceName, row.parentRequestId))
        }
    }

    let failed = 0
    let outboundRelated = 0
    for (const row of rows) {
        if (!isFailure(row)) continue
        failed += 1
        const isRelated =
            row.kind === 'OUTBOUND' ||
            (row.requestId !== null &&
                parentsWithFailedCall.has(parentKey(row.serviceName, row.requestId)))
        if (isRelated) outboundRelated += 1
    }
    return { total: rows.length, failed, outboundRelated }
}

export function getSummaryHeadline(
    { total, failed }: IRequestSummary,
    { hasFilter = false }: { hasFilter?: boolean } = {},
): string {
    if (total === 0) return hasFilter ? '조건에 맞는 요청이 없어요' : '아직 받은 요청이 없어요'
    return failed > 0
        ? `요청 ${formatCount(total)}건 중 ${formatCount(failed)}건이 실패했어요`
        : `요청 ${formatCount(total)}건 모두 정상 처리했어요`
}

export function getSummaryDescription({
    failed,
    outboundRelated,
}: IRequestSummary): string | null {
    if (failed === 0) return null
    if (outboundRelated === 0) return '실패한 요청을 누르면 원인을 볼 수 있어요.'
    const share =
        outboundRelated === failed
            ? `실패한 ${formatCount(failed)}건 모두`
            : `실패한 ${formatCount(failed)}건 중 ${formatCount(outboundRelated)}건은`
    return `${share} 외부 서버 호출과 관련 있어요. 서버를 눌러 좁혀 볼 수 있어요.`
}

/** 실패가 있는 외부 호출 대상만, 실패·전체가 많은 순 */
export function summarizeHosts(rows: ILogRow[]): IHostSummary[] {
    const byHost = new Map<string, { total: number; failed: number }>()
    for (const row of rows) {
        if (row.kind !== 'OUTBOUND' || !row.targetHost) continue
        const stat = byHost.get(row.targetHost) ?? { total: 0, failed: 0 }
        stat.total += 1
        if (isFailure(row)) stat.failed += 1
        byHost.set(row.targetHost, stat)
    }
    return [...byHost]
        .filter(([, stat]) => stat.failed > 0)
        .map(([host, { total, failed }]) => ({
            host,
            total,
            failed,
            label:
                failed === total
                    ? `${formatCount(total)}건 모두 실패했어요`
                    : `${formatCount(total)}건 중 ${formatCount(failed)}건 실패했어요`,
        }))
        .sort(
            (a, b) =>
                b.failed - a.failed ||
                b.total - a.total ||
                a.host.localeCompare(b.host),
        )
}
