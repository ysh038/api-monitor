import { useMemo } from 'react'

import StatCard from '../../../design-system/atoms/StatCard'
import type { ILogRow } from '../../../types/log'
import {
    getSummaryDescription,
    getSummaryHeadline,
    summarizeHosts,
    summarizeRequests,
} from '../../../utils/logs/summary'

import styles from './FailureSummary.module.css'

export interface IFailureSummaryProps {
    /** 지금 불러온 행 */
    rows: ILogRow[]
    /** 좁혀 보고 있는 외부 호출 대상 */
    selectedHost: string
    hasFilter: boolean
    onSelectHost: (host: string) => void
}

/** 화면 맨 위 요약: 몇 건 중 몇 건이 실패했는지, 어느 외부 서버가 실패했는지 */
function FailureSummary({ rows, selectedHost, hasFilter, onSelectHost }: IFailureSummaryProps) {
    const summary = useMemo(() => summarizeRequests(rows), [rows])
    const hosts = useMemo(() => summarizeHosts(rows), [rows])
    const description = getSummaryDescription(summary)

    const headline = getSummaryHeadline(summary, { hasFilter })

    // 결과 유무·건수와 관계없이 세 줄(제목·설명·카드 줄)을 항상 같은 높이로 둔다 — 아래 목록이 출렁이지 않게 (dashboard-stable-layout L1~L3)
    return (
        <div className={styles.summary}>
            <h1 className={styles.headline} title={headline}>
                {headline}
            </h1>
            <p
                className={styles.description}
                title={description ?? undefined}
                aria-hidden={description ? undefined : true}
            >
                {description ?? '\u00a0'}
            </p>
            <div className={styles.hosts} role="group" aria-label="실패한 외부 서버">
                {hosts.length > 0 ? (
                    hosts.map((host) => (
                        <StatCard
                            key={host.host}
                            title={host.host}
                            description={host.label}
                            tone="danger"
                            isPressed={selectedHost === host.host}
                            onClick={() => onSelectHost(host.host)}
                        />
                    ))
                ) : (
                    <p className={styles.noHosts}>실패한 외부 서버가 없어요</p>
                )}
            </div>
        </div>
    )
}

export default FailureSummary
