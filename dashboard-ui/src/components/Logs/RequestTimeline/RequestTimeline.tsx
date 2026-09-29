import { useMemo, type CSSProperties } from 'react'

import SectionHeader from '../../../design-system/atoms/SectionHeader'
import type { ILogRow } from '../../../types/log'
import { formatTime } from '../../../utils/logs/format'
import { getStatusLabel } from '../../../utils/logs/status'
import { buildTimeline } from '../../../utils/logs/timeline'

import styles from './RequestTimeline.module.css'

export interface IRequestTimelineProps {
    rows: ILogRow[]
    selectedId: number | null
    onSelect: (id: number) => void
}

const xVar = (x: number) => ({ '--x': x }) as CSSProperties

/**
 * 시간대별 요청: 요청 하나가 막대 하나, 높을수록 심각.
 * 막대 클릭은 마우스 보조 수단이다 — 키보드 사용자는 같은 요청을 아래 표에서 고른다.
 */
function RequestTimeline({ rows, selectedId, onSelect }: IRequestTimelineProps) {
    const { bars, ticks } = useMemo(() => buildTimeline(rows), [rows])
    const rowById = useMemo(() => new Map(rows.map((row) => [row.id, row])), [rows])
    if (bars.length === 0) return null

    return (
        <div className={styles.timeline}>
            <SectionHeader
                title="시간대별 요청"
                level={3}
                size="sm"
                description="막대 하나가 요청 하나예요. 높을수록 심각한 상태예요."
            />
            <div className={styles.chart} aria-hidden="true">
                {bars.map((bar) => {
                    const row = rowById.get(bar.id)
                    return (
                        <span
                            key={bar.id}
                            data-bar-id={bar.id}
                            className={`${styles.bar} ${styles[`level${bar.level}`]} ${styles[bar.tone]} ${bar.id === selectedId ? styles.isSelected : ''}`}
                            style={xVar(bar.x)}
                            title={
                                row
                                    ? `${getStatusLabel(row.statusCode)} ${row.method} ${row.path} · ${formatTime(row.createdAt)}`
                                    : undefined
                            }
                            onClick={() => onSelect(bar.id)}
                        />
                    )
                })}
            </div>
            <div className={styles.axis} aria-hidden="true">
                {ticks.map((tick) => (
                    <span key={tick.label} className={styles.tick} style={xVar(tick.x)}>
                        {tick.label}
                    </span>
                ))}
            </div>
        </div>
    )
}

export default RequestTimeline
