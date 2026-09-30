import { useMemo, type CSSProperties } from 'react'

import SectionHeader from '../../../design-system/atoms/SectionHeader'
import type { ILogRow } from '../../../types/log'
import { buildCallFlow, type ICallFlowSegment, MY_SERVER } from '../../../utils/logs/callFlow'

import styles from './LogDetail.module.css'

const TONE_CLASS: Record<string, string | undefined> = {
    danger: styles.flowDanger,
    warning: styles.flowWarning,
}

const ESTIMATE_NOTE =
    '다른 서버를 기다린 시간은 보낸 요청들이 걸린 구간을 합친 값이에요. 동시에 보낸 요청이 겹치면 한 번만 세요.'

const segmentClass = (segment: ICallFlowSegment) =>
    segment.kind === 'call' ? styles[`segCall_${segment.tone}`] : styles[`seg_${segment.kind}`]

const segmentVars = (segment: ICallFlowSegment) =>
    ({ '--seg-start': segment.start, '--seg-width': segment.width }) as CSSProperties

const LEGEND: { key: string; className: string | undefined; label: string }[] = [
    { key: 'work', className: styles.seg_work, label: `${MY_SERVER}가 직접 처리` },
    { key: 'wait', className: styles.seg_wait, label: '다른 서버를 기다림' },
    { key: 'call-ok', className: styles.segCall_neutral, label: '정상 응답' },
    { key: 'call-fail', className: styles.segCall_danger, label: '실패' },
]

export interface ICallFlowProps {
    /** 흐름 기준인 받은 요청 */
    root: ILogRow
    /** 그 요청 중 보낸 요청 (없어도 된다) */
    calls: ILogRow[]
    /** 지금 보고 있는 행 — 이 레인은 누를 수 없다 */
    currentId: number
    onNavigate: (id: number) => void
}

/** 호출 흐름 — 서버별 레인 + 누가 시간을 썼는지 한 문장 (spec F5·F5a·F5b) */
function CallFlow({ root, calls, currentId, onNavigate }: ICallFlowProps) {
    const flow = useMemo(() => buildCallFlow(root, calls), [root, calls])
    return (
        <>
            <SectionHeader
                title="호출 흐름"
                level={3}
                size="md"
                aside={calls.length > 0 ? `보낸 요청 ${calls.length}건` : '보낸 요청 없음'}
            />
            <p className={styles.flowSummary} title={calls.length > 0 ? ESTIMATE_NOTE : undefined}>
                {flow.summary}
            </p>
            <ul className={styles.flow}>
                {flow.lanes.map((lane) => {
                    const label = `${lane.title} ${lane.subtitle} ${lane.durationLabel}`
                    const content = (
                        <>
                            <span className={styles.laneName}>
                                <span className={styles.laneTitle}>{lane.title}</span>
                                <span className={styles.laneSubtitle}>{lane.subtitle}</span>
                            </span>
                            <span className={styles.laneTrack} aria-hidden="true">
                                {lane.segments.map((segment) => (
                                    <span
                                        key={`${segment.kind}-${segment.start}`}
                                        className={`${styles.segment} ${segmentClass(segment) ?? ''}`}
                                        style={segmentVars(segment)}
                                    />
                                ))}
                            </span>
                            <span className={`${styles.flowDuration} ${TONE_CLASS[lane.tone] ?? ''}`}>
                                {lane.durationLabel}
                            </span>
                        </>
                    )
                    return (
                        <li key={lane.id}>
                            {lane.id === currentId ? (
                                <div className={styles.lane} aria-current="true">
                                    {content}
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    className={styles.lane}
                                    aria-label={label}
                                    onClick={() => onNavigate(lane.id)}
                                >
                                    {content}
                                </button>
                            )}
                        </li>
                    )
                })}
            </ul>
            <div className={styles.axis} aria-hidden="true">
                {flow.ticks.map((tick) => (
                    <span key={tick.x}>{tick.label}</span>
                ))}
            </div>
            {calls.length > 0 ? (
                <ul className={styles.legend} aria-label="막대 색 설명">
                    {LEGEND.map((item) => (
                        <li key={item.key}>
                            <span className={`${styles.legendSwatch} ${item.className ?? ''}`} aria-hidden="true" />
                            {item.label}
                        </li>
                    ))}
                </ul>
            ) : null}
        </>
    )
}

export default CallFlow
