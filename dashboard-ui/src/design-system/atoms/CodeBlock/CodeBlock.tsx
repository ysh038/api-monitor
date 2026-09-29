import type { ReactNode } from 'react'

import styles from './CodeBlock.module.css'

export interface ICodeBlockProps {
    children: ReactNode
    /** 스크린리더용 이름 (스크롤 영역이라 키보드 포커스를 받는다) */
    label: string
    /** true 면 긴 줄을 접는다 (바디), false 면 가로 스크롤 (스택트레이스) */
    isWrapping?: boolean
}

function CodeBlock({ children, label, isWrapping = true }: ICodeBlockProps) {
    return (
        <pre
            className={`${styles.code} ${isWrapping ? styles.wrap : styles.nowrap}`}
            role="region"
            aria-label={label}
            tabIndex={0}
        >
            {children}
        </pre>
    )
}

export default CodeBlock
