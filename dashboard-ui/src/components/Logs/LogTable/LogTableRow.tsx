import type { KeyboardEvent, ReactNode } from 'react'

import MeterBar from '../../../design-system/atoms/MeterBar'
import type { ILogRow } from '../../../types/log'
import { formatDuration, splitTime } from '../../../utils/logs/format'
import {
    getDurationRatio,
    getDurationTone,
    isFailure,
    isSuccessRow,
} from '../../../utils/logs/status'
import { ExceptionTag, LogPath, StatusText } from '../LogParts'

import styles from './LogTable.module.css'

const DURATION_CLASS: Record<string, string | undefined> = {
    danger: styles.durationDanger,
    warning: styles.durationWarning,
}

export interface ILogTableRowProps {
    row: ILogRow
    isNested: boolean
    isChildCountShown: boolean
    isSelected: boolean
    isNew: boolean
    /** 펼친 정상 요청 묶음 안의 행 (왼쪽 세로선) */
    isInGroup?: boolean
    /**
     * 아코디언으로 여닫히는 행이면 지금 상태 (spec C5a). 칸 내용·여백·테두리를 높이 0↔원래 높이로
     * 한꺼번에 전환해서, 행이 늘고 줄 때 아래 행들이 같은 속도로 따라 움직인다.
     */
    collapse?: 'open' | 'closed'
    onSelect: (id: number) => void
}

/** 표 한 줄. 클릭·Enter·Space 로 상세를 연다 */
function LogTableRow({
    row,
    isNested,
    isChildCountShown,
    isSelected,
    isNew,
    isInGroup = false,
    collapse,
    onSelect,
}: ILogTableRowProps) {
    const cell = (content: ReactNode) =>
        collapse ? (
            <div className={styles.collapseGrid}>
                <div className={styles.collapseClip}>
                    <div className={styles.collapsePad}>{content}</div>
                </div>
            </div>
        ) : (
            content
        )
    const durationTone = getDurationTone(row.durationMs)
    const time = splitTime(row.createdAt)
    const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onSelect(row.id)
        }
    }
    const classes = [
        styles.row,
        isFailure(row) ? styles.isFailure : '',
        isSuccessRow(row) ? styles.isQuiet : '',
        collapse ? styles.collapsible : '',
    ].join(' ')

    return (
        <tr
            className={classes}
            tabIndex={0}
            aria-current={isSelected ? 'true' : undefined}
            data-new={isNew ? 'true' : undefined}
            data-grouped={isInGroup ? 'true' : undefined}
            data-collapse={collapse}
            onClick={() => onSelect(row.id)}
            onKeyDown={onKeyDown}
        >
            <td>{cell(<StatusText code={row.statusCode} />)}</td>
            <td
                className={`${styles.service} ${styles.hideNarrow}`}
                title={row.instanceId ? `${row.serviceName} @ ${row.instanceId}` : row.serviceName}
            >
                {cell(row.serviceName)}
            </td>
            <td className={styles.method}>{cell(row.method)}</td>
            <td className={styles.pathCell} title={`${row.targetHost ?? ''}${row.path}`}>
                {cell(<LogPath row={row} isNested={isNested} isChildCountShown={isChildCountShown} />)}
            </td>
            <td>
                {cell(
                    <span className={styles.duration}>
                        <span className={styles.meter}>
                            <MeterBar ratio={getDurationRatio(row.durationMs)} tone={durationTone} />
                        </span>
                        <span className={DURATION_CLASS[durationTone]}>
                            {formatDuration(row.durationMs)}
                        </span>
                    </span>,
                )}
            </td>
            <td className={styles.time}>
                {cell(
                    <>
                        {time.date ? <span className={styles.date}>{time.date} </span> : null}
                        {time.clock}
                        <span className={styles.millis}>{time.millis}</span>
                    </>,
                )}
            </td>
            <td className={styles.hideNarrow}>{cell(<ExceptionTag row={row} isCollapsible />)}</td>
        </tr>
    )
}

export default LogTableRow
