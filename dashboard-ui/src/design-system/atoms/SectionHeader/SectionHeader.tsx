import type { ReactNode } from 'react'

import styles from './SectionHeader.module.css'

export interface ISectionHeaderProps {
    title: string
    level: 2 | 3 | 4
    size?: 'lg' | 'md' | 'sm' | 'caption'
    /** 제목 옆 흐린 설명 */
    description?: string
    /** 오른쪽 끝 보조 영역 (건수, 스위치 등) */
    aside?: ReactNode
}

function SectionHeader({ title, level, size = 'md', description, aside }: ISectionHeaderProps) {
    const Heading = `h${level}` as const
    return (
        <div className={`${styles.header} ${styles[size]}`}>
            <div className={styles.titleRow}>
                <Heading className={styles.title}>{title}</Heading>
                {description ? <p className={styles.description}>{description}</p> : null}
            </div>
            {aside ? <div className={styles.aside}>{aside}</div> : null}
        </div>
    )
}

export default SectionHeader
