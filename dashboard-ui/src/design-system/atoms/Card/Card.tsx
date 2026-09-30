import type { ReactNode } from 'react'

import styles from './Card.module.css'

export interface ICardProps {
    children: ReactNode
    /** 있으면 이름 있는 영역(section)으로 그린다 */
    label?: string
    padding?: 'none' | 'md' | 'lg'
    /** surface 흰 카드 · muted 카드 안의 회색 상자 */
    tone?: 'surface' | 'muted'
}

function Card({ children, label, padding = 'lg', tone = 'surface' }: ICardProps) {
    const className = `${styles.card} ${styles[tone]} ${styles[padding]}`
    return label ? (
        <section className={className} aria-label={label}>
            {children}
        </section>
    ) : (
        <div className={className}>{children}</div>
    )
}

export default Card
