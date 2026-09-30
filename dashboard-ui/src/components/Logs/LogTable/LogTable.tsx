import { Fragment, useMemo, useState } from 'react'

import Button from '../../../design-system/atoms/Button'
import EmptyState from '../../../design-system/atoms/EmptyState'
import type { ILogRow } from '../../../types/log'
import { formatSpan, formatTime } from '../../../utils/logs/format'
import { buildListItems, buildLogTree, type ILogNode } from '../../../utils/logs/listView'

import styles from './LogTable.module.css'
import LogTableRow from './LogTableRow'

export interface ILogTableProps {
    rows: ILogRow[]
    isGroupingSuccess: boolean
    selectedId: number | null
    /** 폴링으로 방금 들어온 행 (잠깐 강조) */
    newIds: ReadonlySet<number>
    hasFilter: boolean
    hasMore: boolean
    isLoading: boolean
    isLoadingMore: boolean
    /** 필터를 바꿔 새 결과를 기다리는 중 — 이전 행을 흐리게 유지한다 */
    isUpdating: boolean
    onSelect: (id: number) => void
    onLoadMore: () => void
}

const COLUMN_COUNT = 7

const clock = (ms: number) => formatTime(ms, Date.now(), { isWithMs: false })

/** 요청 기록 표: 외부 호출 트리 · 정상 요청 묶음 · 시간 공백 */
function LogTable({
    rows,
    isGroupingSuccess,
    selectedId,
    newIds,
    hasFilter,
    hasMore,
    isLoading,
    isLoadingMore,
    isUpdating,
    onSelect,
    onLoadMore,
}: ILogTableProps) {
    const items = useMemo(
        () => buildListItems(buildLogTree(rows), { isGroupingSuccess }),
        [rows, isGroupingSuccess],
    )
    const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set())
    const toggleGroup = (key: string) =>
        setExpanded((prev) => {
            const next = new Set(prev)
            if (next.has(key)) next.delete(key)
            else next.add(key)
            return next
        })

    const renderNode = ({ row, children }: ILogNode) => (
        <Fragment key={row.id}>
            <LogTableRow
                row={row}
                isNested={false}
                isChildCountShown={children.length === 0}
                isSelected={row.id === selectedId}
                isNew={newIds.has(row.id)}
                onSelect={onSelect}
            />
            {children.map((child) => (
                <LogTableRow
                    key={child.id}
                    row={child}
                    isNested
                    isChildCountShown={false}
                    isSelected={child.id === selectedId}
                    isNew={newIds.has(child.id)}
                    onSelect={onSelect}
                />
            ))}
        </Fragment>
    )

    return (
        <div className={styles.wrap} aria-busy={isUpdating}>
            {isUpdating ? (
                <div className={styles.updatingBar} role="progressbar" aria-label="새 결과를 불러오는 중" />
            ) : null}
            <table className={styles.table}>
                <caption className={styles.caption}>요청 기록 목록</caption>
                <colgroup>
                    <col className={styles.colStatus} />
                    <col className={`${styles.colService} ${styles.hideNarrow}`} />
                    <col className={styles.colMethod} />
                    <col />
                    <col className={styles.colDuration} />
                    <col className={styles.colTime} />
                    <col className={`${styles.colException} ${styles.hideNarrow}`} />
                </colgroup>
                <thead>
                    <tr>
                        <th scope="col">상태</th>
                        <th scope="col" className={styles.hideNarrow}>
                            서비스
                        </th>
                        <th scope="col">메서드</th>
                        <th scope="col">경로</th>
                        <th scope="col" className={styles.thDuration}>
                            걸린 시간
                        </th>
                        <th scope="col">시각</th>
                        <th scope="col" className={styles.hideNarrow}>
                            예외
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {items.map((item) => {
                        if (item.type === 'node') return renderNode(item.node)
                        if (item.type === 'gap') {
                            return (
                                <tr key={item.key} className={styles.gapRow}>
                                    <td colSpan={COLUMN_COUNT}>
                                        <span className={styles.gapPill}>
                                            {formatSpan(item.spanMs)} 동안 기록된 요청이 없어요
                                        </span>
                                    </td>
                                </tr>
                            )
                        }
                        const isExpanded = expanded.has(item.key)
                        const isAll2xx = item.nodes.every((n) => (n.row.statusCode ?? 0) < 300)
                        return (
                            <Fragment key={item.key}>
                                <tr className={styles.groupRow}>
                                    <td colSpan={COLUMN_COUNT}>
                                        <span className={styles.groupInner}>
                                            <span className={styles.groupStatus}>
                                                ✓ {isAll2xx ? '2xx' : '2xx·3xx'}
                                            </span>
                                            <span className={styles.groupLabel}>
                                                정상 처리한 요청 {item.nodes.length}건
                                            </span>
                                            <span className={styles.groupPaths} title={item.paths.join('\n')}>
                                                {item.paths.join(' ')}
                                            </span>
                                            <span className={styles.groupTime}>
                                                {clock(item.from)} – {clock(item.to)}
                                            </span>
                                            <Button
                                                variant="link"
                                                size="sm"
                                                aria-expanded={isExpanded}
                                                onClick={() => toggleGroup(item.key)}
                                            >
                                                {isExpanded ? '접기 ⌃' : '펼치기 ⌄'}
                                            </Button>
                                        </span>
                                    </td>
                                </tr>
                                {isExpanded ? item.nodes.map(renderNode) : null}
                            </Fragment>
                        )
                    })}
                </tbody>
            </table>
            {rows.length === 0 ? (
                <EmptyState>
                    {isLoading
                        ? '불러오는 중이에요…'
                        : hasFilter
                          ? '조건에 맞는 로그가 없습니다.'
                          : '아직 수신된 로그가 없습니다.'}
                </EmptyState>
            ) : null}
            {hasMore ? (
                <div className={styles.more}>
                    <Button variant="outline" disabled={isLoadingMore || isUpdating} onClick={onLoadMore}>
                        {isLoadingMore ? '불러오는 중…' : '더 보기'}
                    </Button>
                </div>
            ) : null}
        </div>
    )
}

export default LogTable
