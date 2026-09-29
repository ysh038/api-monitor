import type { KeyboardEvent } from 'react'

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
    onSelect: (id: number) => void
}

/** 표 한 줄. 클릭·Enter·Space 로 상세를 연다 */
function LogTableRow({
    row,
    isNested,
    isChildCountShown,
    isSelected,
    isNew,
    onSelect,
}: ILogTableRowProps) {
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
    ].join(' ')

    return (
        <tr
            className={classes}
            tabIndex={0}
            aria-current={isSelected ? 'true' : undefined}
            data-new={isNew ? 'true' : undefined}
            onClick={() => onSelect(row.id)}
            onKeyDown={onKeyDown}
        >
            <td>
                <StatusText code={row.statusCode} />
            </td>
            <td
                className={`${styles.service} ${styles.hideNarrow}`}
                title={row.instanceId ? `${row.serviceName} @ ${row.instanceId}` : row.serviceName}
            >
                {row.serviceName}
            </td>
            <td className={styles.method}>{row.method}</td>
            <td className={styles.pathCell} title={`${row.targetHost ?? ''}${row.path}`}>
                <LogPath row={row} isNested={isNested} isChildCountShown={isChildCountShown} />
            </td>
            <td>
                <span className={styles.duration}>
                    <span className={styles.meter}>
                        <MeterBar ratio={getDurationRatio(row.durationMs)} tone={durationTone} />
                    </span>
                    <span className={DURATION_CLASS[durationTone]}>
                        {formatDuration(row.durationMs)}
                    </span>
                </span>
            </td>
            <td className={styles.time}>
                {time.date ? <span className={styles.date}>{time.date} </span> : null}
                {time.clock}
                <span className={styles.millis}>{time.millis}</span>
            </td>
            <td className={styles.hideNarrow}>
                <ExceptionTag row={row} isCollapsible />
            </td>
        </tr>
    )
}

export default LogTableRow
