import type { ReactNode } from 'react'

import styles from './EmptyState.module.css'

export interface IEmptyStateProps {
    children: ReactNode
}

/** 목록이 비었을 때 가운데 흐린 문구 */
function EmptyState({ children }: IEmptyStateProps) {
    return (
        <p className={styles.empty} role="status">
            {children}
        </p>
    )
}

export default EmptyState
