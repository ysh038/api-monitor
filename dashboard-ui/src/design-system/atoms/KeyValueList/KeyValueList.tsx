import type { ReactNode } from 'react'

import styles from './KeyValueList.module.css'

export interface IKeyValueItem {
    key: string
    label: string
    value: ReactNode
    tone?: 'default' | 'success' | 'warning' | 'danger'
}

export interface IKeyValueListProps {
    items: IKeyValueItem[]
}

/** 왼쪽 이름 · 오른쪽 값 두 칸 목록 (dl) */
function KeyValueList({ items }: IKeyValueListProps) {
    return (
        <dl className={styles.list}>
            {items.map((item) => (
                <div key={item.key} className={styles.row}>
                    <dt className={styles.label}>{item.label}</dt>
                    <dd
                        className={`${styles.value} ${item.tone && item.tone !== 'default' ? styles[item.tone] : ''}`}
                    >
                        {item.value}
                    </dd>
                </div>
            ))}
        </dl>
    )
}

export default KeyValueList
