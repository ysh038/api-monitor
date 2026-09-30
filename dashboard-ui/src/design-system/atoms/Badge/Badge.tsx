import type { ReactNode } from 'react'

import styles from './Badge.module.css'

export type TTone = 'neutral' | 'success' | 'info' | 'warning' | 'danger'

export interface IBadgeProps {
    children: ReactNode
    tone?: TTone
    /** soft 옅은 배경 · outline 테두리 · dashed 점선 테두리 · text 글자색만 */
    appearance?: 'soft' | 'outline' | 'dashed' | 'text'
    size?: 'sm' | 'md'
    title?: string
}

function Badge({
    children,
    tone = 'neutral',
    appearance = 'soft',
    size = 'md',
    title,
}: IBadgeProps) {
    return (
        <span
            className={`${styles.badge} ${styles[tone]} ${styles[appearance]} ${styles[size]}`}
            title={title}
        >
            {children}
        </span>
    )
}

export default Badge
