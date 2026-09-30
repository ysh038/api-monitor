import type { ReactNode } from 'react'

import styles from './Notice.module.css'

export interface INoticeProps {
    children: ReactNode
    tone?: 'neutral' | 'success' | 'info' | 'warning' | 'danger'
    variant?: 'soft' | 'outline' | 'dashed'
    /** 오른쪽 끝 동작 (예: 해제 버튼) */
    action?: ReactNode
}

/** 색 배경의 안내 상자. 결과 박스·Mock 안내·필터 안내 줄에 쓴다 */
function Notice({ children, tone = 'info', variant = 'soft', action }: INoticeProps) {
    return (
        <div className={`${styles.notice} ${styles[tone]} ${styles[variant]}`}>
            <div className={styles.body}>{children}</div>
            {action ? <div className={styles.action}>{action}</div> : null}
        </div>
    )
}

export default Notice
