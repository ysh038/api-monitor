import { useMemo } from 'react'

import Badge from '../../../design-system/atoms/Badge'
import type { ILogRow } from '../../../types/log'
import { formatCount, formatTime } from '../../../utils/logs/format'
import { buildHostHealth, buildProblems, type IHostHealth } from '../../../utils/logs/problems'

import styles from './ProblemSummary.module.css'

const MAX_ITEMS = 5

export interface IProblemSummaryProps {
    /** 지금 목록에 불러온 행 (현재 필터 기준) */
    rows: ILogRow[]
    /** 누른 문제·서버의 가장 최근 요청 상세를 연다 */
    onSelect: (id: number) => void
}

const clock = (ms: number) => formatTime(ms, Date.now(), { isWithMs: false })

const HOST_STATE_LABEL: Record<IHostHealth['state'], string> = {
    fail: '실패',
    warn: '응답',
    ok: '정상',
}

function ColumnHead({ title, hiddenCount }: { title: string; hiddenCount: number }) {
    return (
        <div className={styles.columnHead}>
            <h3 className={styles.columnTitle}>{title}</h3>
            {hiddenCount > 0 ? <span className={styles.more}>외 {formatCount(hiddenCount)}개</span> : null}
        </div>
    )
}

/**
 * 문제 요약 — 반복되는 문제 · 외부 연결 상태 (docs/specs/dashboard-problem-summary.md).
 * 지금 불러온 행만으로 계산하는 "최근 문제" 요약이라 기준 건수를 함께 밝힌다.
 */
function ProblemSummary({ rows, onSelect }: IProblemSummaryProps) {
    const problems = useMemo(() => buildProblems(rows), [rows])
    const hosts = useMemo(() => buildHostHealth(rows), [rows])

    return (
        <div className={styles.summary}>
            <p className={styles.basis}>지금 목록의 최근 {formatCount(rows.length)}건 기준</p>
            <div className={styles.columns}>
                <section className={styles.column} aria-label="반복되는 문제">
                    <ColumnHead title="반복되는 문제" hiddenCount={problems.length - MAX_ITEMS} />
                    <ul className={styles.list}>
                        {problems.length === 0 ? (
                            <li className={styles.empty}>최근 요청에서 문제가 없어요</li>
                        ) : (
                            problems.slice(0, MAX_ITEMS).map((problem) => (
                                <li key={problem.key}>
                                    <button
                                        type="button"
                                        className={`${styles.item} ${styles.problemItem}`}
                                        title={`${problem.title}\n${problem.context}`}
                                        onClick={() => onSelect(problem.latestId)}
                                    >
                                        <Badge appearance="text" tone={problem.tone}>
                                            {problem.status}
                                        </Badge>
                                        <span className={styles.text}>
                                            <span className={styles.title}>{problem.title}</span>
                                            <span className={styles.context}>{problem.context}</span>
                                        </span>
                                        <span className={styles.count}>{formatCount(problem.count)}건</span>
                                        <span className={styles.time}>{clock(problem.lastAt)}</span>
                                    </button>
                                </li>
                            ))
                        )}
                    </ul>
                </section>
                <section className={styles.column} aria-label="외부 연결 상태">
                    <ColumnHead title="외부 연결 상태" hiddenCount={hosts.length - MAX_ITEMS} />
                    <ul className={styles.list}>
                        {hosts.length === 0 ? (
                            <li className={styles.empty}>보낸 요청이 없어요</li>
                        ) : (
                            hosts.slice(0, MAX_ITEMS).map((host) => (
                                <li key={host.host}>
                                    <button
                                        type="button"
                                        className={`${styles.item} ${styles.hostItem} ${styles[host.state]}`}
                                        onClick={() => onSelect(host.latestId)}
                                    >
                                        <span className={styles.dot} aria-hidden="true" />
                                        <span className={styles.text}>
                                            <span className={styles.host}>{host.host}</span>
                                            <span className={styles.state}>
                                                {HOST_STATE_LABEL[host.state]} · {host.detail}
                                            </span>
                                        </span>
                                        <span className={styles.time}>
                                            {host.lastSuccessAt === null
                                                ? '성공 기록 없음'
                                                : `마지막 성공 ${clock(host.lastSuccessAt)}`}
                                        </span>
                                    </button>
                                </li>
                            ))
                        )}
                    </ul>
                </section>
            </div>
        </div>
    )
}

export default ProblemSummary
