import type { CSSProperties } from 'react'

import styles from './MeterBar.module.css'

export interface IMeterBarProps {
    /** 막대 길이 0~1 */
    ratio: number
    /** 막대 시작 위치 0~1 */
    start?: number
    tone?: 'neutral' | 'success' | 'info' | 'warning' | 'danger'
    size?: 'sm' | 'lg'
}

/** 값을 옆 글자로 함께 보여 주는 장식 막대 (aria-hidden) */
function MeterBar({ ratio, start = 0, tone = 'neutral', size = 'sm' }: IMeterBarProps) {
    const vars = { '--meter-ratio': ratio, '--meter-start': start } as CSSProperties
    return (
        <span className={`${styles.track} ${styles[size]} ${styles[tone]}`} aria-hidden="true">
            <span className={styles.fill} style={vars} />
        </span>
    )
}

export default MeterBar
