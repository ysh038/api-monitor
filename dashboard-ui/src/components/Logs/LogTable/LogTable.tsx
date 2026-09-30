import { Fragment, useMemo } from 'react'

import Badge from '../../../design-system/atoms/Badge'
import Button from '../../../design-system/atoms/Button'
import EmptyState from '../../../design-system/atoms/EmptyState'
import type { ILogRow } from '../../../types/log'
import { buildListItems, buildLogTree, type ILogNode } from '../../../utils/logs/listView'

import styles from './LogTable.module.css'
import LogTableRow from './LogTableRow'
import { useGroupAccordion } from './useGroupAccordion'

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

/** 표에 그릴 행(보낸 요청 포함)이 이보다 많은 묶음은 애니메이션 없이 여닫는다 (spec C5b ③) */
const ACCORDION_MAX_ROWS = 30

/** 요청 기록 표: 보낸 요청 트리 · 정상 요청 묶음 */
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
    const groups = useGroupAccordion()

    const renderNode = (
        { row, children }: ILogNode,
        isInGroup = false,
        collapse?: 'open' | 'closed',
    ) => (
        <Fragment key={row.id}>
            <LogTableRow
                row={row}
                isNested={false}
                isChildCountShown={children.length === 0}
                isSelected={row.id === selectedId}
                isNew={newIds.has(row.id)}
                isInGroup={isInGroup}
                collapse={collapse}
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
                    isInGroup={isInGroup}
                    collapse={collapse}
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
                        const phase = groups.phaseOf(item.key)
                        const isExpanded = phase === 'open'
                        const rowCount = item.nodes.reduce((sum, n) => sum + 1 + n.children.length, 0)
                        const isAnimated = rowCount <= ACCORDION_MAX_ROWS
                        const label = `정상 처리한 요청 ${item.nodes.length}건`
                        const services = new Set(item.nodes.map((n) => n.row.serviceName))
                        const service = services.size === 1 ? [...services][0] : ''
                        const toggle = () => groups.toggle(item.key, isAnimated)
                        return (
                            <Fragment key={item.key}>
                                {/* 행 어디를 눌러도 여닫힌다. 키보드·스크린리더용 버튼은 상태 칸에 두고,
                                    버튼 클릭은 이 행으로 전달돼 한 번만 토글된다 */}
                                <tr
                                    className={`${styles.row} ${styles.isQuiet} ${styles.groupRow}`}
                                    onClick={toggle}
                                >
                                    <td>
                                        <button
                                            type="button"
                                            className={styles.groupToggle}
                                            aria-expanded={isExpanded}
                                            aria-label={label}
                                        >
                                            <span className={styles.groupChevron} aria-hidden="true">
                                                ›
                                            </span>
                                            {/* 일반 행의 상태 칸과 같은 배지 — 행 높이가 같아진다 (spec C5c) */}
                                            <Badge appearance="text" tone="neutral">
                                                2xx
                                            </Badge>
                                        </button>
                                    </td>
                                    <td className={`${styles.service} ${styles.hideNarrow}`} title={service || undefined}>
                                        {service}
                                    </td>
                                    <td />
                                    <td>
                                        {label}
                                        {isExpanded ? (
                                            <span className={styles.groupCollapse} aria-hidden="true">
                                                접기
                                            </span>
                                        ) : null}
                                    </td>
                                    <td />
                                    <td />
                                    <td className={styles.hideNarrow} />
                                </tr>
                                {phase
                                    ? item.nodes.map((node) =>
                                          renderNode(
                                              node,
                                              true,
                                              isAnimated ? (isExpanded ? 'open' : 'closed') : undefined,
                                          ),
                                      )
                                    : null}
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
