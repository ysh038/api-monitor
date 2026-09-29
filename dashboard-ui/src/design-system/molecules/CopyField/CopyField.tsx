import { useEffect, useState } from 'react'

import Button from '../../atoms/Button'

import styles from './CopyField.module.css'

const COPIED_MS = 1200

export interface ICopyFieldProps {
    value: string
    /** 복사 버튼의 스크린리더 이름 (예: "requestId 복사") */
    copyLabel: string
    /** 기본은 클립보드. 스토리·테스트에서 바꿔 끼운다 */
    onCopy?: (value: string) => void
}

const copyToClipboard = (value: string) => {
    // http 로 열린 대시보드 등 클립보드 권한이 없는 환경에서는 조용히 넘어간다
    navigator.clipboard?.writeText(value).catch(() => undefined)
}

/** 고정폭 값 + 복사 버튼. 누르면 1.2초 동안 "복사됨" */
function CopyField({ value, copyLabel, onCopy = copyToClipboard }: ICopyFieldProps) {
    const [isCopied, setCopied] = useState(false)

    useEffect(() => {
        if (!isCopied) return
        const timer = setTimeout(() => setCopied(false), COPIED_MS)
        return () => clearTimeout(timer)
    }, [isCopied])

    return (
        <span className={styles.field}>
            <span className={styles.value}>{value}</span>
            <Button
                variant="link"
                size="sm"
                aria-label={copyLabel}
                onClick={() => {
                    onCopy(value)
                    setCopied(true)
                }}
            >
                {isCopied ? '복사됨' : '복사'}
            </Button>
        </span>
    )
}

export default CopyField
