import { useMemo } from 'react'

import MeterBar from '../../../design-system/atoms/MeterBar'
import SectionHeader from '../../../design-system/atoms/SectionHeader'
import type { ILogRow } from '../../../types/log'
import { buildCallFlow } from '../../../utils/logs/callFlow'

import styles from './LogDetail.module.css'

const TONE_CLASS: Record<string, string | undefined> = {
    danger: styles.flowDanger,
    warning: styles.flowWarning,
}

export interface ICallFlowProps {
    /** 흐름의 맨 위 (들어온 요청) */
    root: ILogRow
    /** 그 요청 중 나간 외부 호출 */
    calls: ILogRow[]
    /** 지금 보고 있는 행 — 이 줄은 누를 수 없다 */
    currentId: number
    onNavigate: (id: number) => void
}

/** 호출 흐름 워터폴 */
function CallFlow({ root, calls, currentId, onNavigate }: ICallFlowProps) {
    const flow = useMemo(() => buildCallFlow(root, calls), [root, calls])
    return (
        <>
            <SectionHeader title="호출 흐름" level={3} size="md" aside={`외부 호출 ${calls.length}건`} />
            <ul className={styles.flow}>
                {flow.bars.map((bar) => {
                    const content = (
                        <>
                            <span className={styles.flowLine}>
                                <span className={styles.flowLabel}>{bar.label}</span>
                                <span className={`${styles.flowDuration} ${TONE_CLASS[bar.tone] ?? ''}`}>
                                    {bar.durationLabel}
                                </span>
                            </span>
                            <MeterBar ratio={bar.width} start={bar.start} tone={bar.tone} size="lg" />
                        </>
                    )
                    const className = `${styles.flowItem} ${bar.isRoot ? styles.flowRoot : styles.flowChild}`
                    return (
                        <li key={bar.id}>
                            {bar.id === currentId ? (
                                <div className={className} aria-current="true">
                                    {content}
                                </div>
                            ) : (
                                <button type="button" className={className} onClick={() => onNavigate(bar.id)}>
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
        </>
    )
}

export default CallFlow
