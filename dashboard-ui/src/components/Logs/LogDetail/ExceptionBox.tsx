import { useState } from 'react'

import Button from '../../../design-system/atoms/Button'
import CodeBlock from '../../../design-system/atoms/CodeBlock'
import type { ILogDetail } from '../../../types/log'
import { splitStack } from '../../../utils/logs/detailText'
import { getResultBox } from '../../../utils/logs/diagnosis'

import styles from './LogDetail.module.css'

/** 예외 결과 박스: 클래스 · 메시지 · cause 체인 · 스택트레이스(12줄 미리보기) */
function ExceptionBox({ detail }: { detail: ILogDetail }) {
    const [isFullStack, setFullStack] = useState(false)
    const result = getResultBox(detail)
    const stack = detail.exceptionStacktrace ? splitStack(detail.exceptionStacktrace, isFullStack) : null

    return (
        <div
            className={`${styles.exception} ${result.tone === 'warning' ? styles.exceptionWarning : styles.exceptionDanger}`}
        >
            <span className={styles.exceptionLabel}>{result.label}</span>
            <span className={styles.exceptionClass}>{detail.exceptionClass}</span>
            {detail.exceptionMessage ? (
                <p className={styles.exceptionMessage}>{detail.exceptionMessage}</p>
            ) : null}
            {detail.exceptionCauses.length > 0 ? (
                <ul className={styles.causes} aria-label="원인 체인">
                    {detail.exceptionCauses.map((cause, index) => (
                        <li key={`${cause.exceptionClass}-${index}`} className={styles.cause}>
                            Caused by: {cause.exceptionClass}
                            {cause.message ? <div className={styles.causeMessage}>{cause.message}</div> : null}
                        </li>
                    ))}
                </ul>
            ) : null}
            {stack ? (
                <>
                    <CodeBlock label="스택트레이스" isWrapping={false}>
                        {stack.lines.map((line, index) => (
                            <span key={index}>
                                {line.isApp ? <span className={styles.appFrame}>{line.text}</span> : line.text}
                                {index < stack.lines.length - 1 ? '\n' : null}
                            </span>
                        ))}
                    </CodeBlock>
                    {stack.isTruncatable ? (
                        <span className={styles.toggle}>
                            <Button variant="link" size="sm" onClick={() => setFullStack((v) => !v)}>
                                {isFullStack ? '접기' : `전체 스택트레이스 보기 (${stack.totalLines}줄)`}
                            </Button>
                        </span>
                    ) : null}
                </>
            ) : null}
        </div>
    )
}

export default ExceptionBox
