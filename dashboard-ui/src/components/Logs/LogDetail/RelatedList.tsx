import SectionHeader from '../../../design-system/atoms/SectionHeader'
import type { ILogRow } from '../../../types/log'
import { formatDuration, formatTime } from '../../../utils/logs/format'
import { shortClassName } from '../../../utils/logs/status'
import { LogPath, StatusText } from '../LogParts'

import styles from './LogDetail.module.css'

export interface IRelatedListProps {
    title: string
    rows: ILogRow[]
    onNavigate: (id: number) => void
}

/** 연관 요청 목록. 누르면 그 상세로 이동 */
function RelatedList({ title, rows, onNavigate }: IRelatedListProps) {
    if (rows.length === 0) return null
    return (
        <>
            <SectionHeader title={title} level={3} size="caption" />
            <ul className={styles.related}>
                {rows.map((row) => (
                    <li key={row.id}>
                        <button type="button" className={styles.relatedItem} onClick={() => onNavigate(row.id)}>
                            <StatusText code={row.statusCode} />
                            <span className={styles.method}>{row.method}</span>
                            <LogPath row={row} isServiceShown />
                            <span className={styles.relatedMeta}>
                                {formatDuration(row.durationMs)} · {formatTime(row.createdAt)}
                                {row.exceptionClass ? ` · ${shortClassName(row.exceptionClass)}` : ''}
                            </span>
                        </button>
                    </li>
                ))}
            </ul>
        </>
    )
}

export default RelatedList
