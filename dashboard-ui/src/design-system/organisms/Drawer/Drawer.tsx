import { useEffect, useRef, type ReactNode } from 'react'

import Button from '../../atoms/Button'

import styles from './Drawer.module.css'

export interface IDrawerProps {
    isOpen: boolean
    /** 대화상자 이름 (스크린리더) */
    label: string
    onClose: () => void
    children: ReactNode
    /** 바뀌면 본문 스크롤을 맨 위로 (다른 항목으로 이동했을 때) */
    contentKey?: string | number
}

/** 오른쪽에서 밀려 나오는 패널. 닫기 버튼·배경 클릭·ESC 로 닫는다 */
function Drawer({ isOpen, label, onClose, children, contentKey }: IDrawerProps) {
    const closeRef = useRef<HTMLButtonElement>(null)
    const bodyRef = useRef<HTMLDivElement>(null)
    // 부모가 매 렌더 새 함수를 넘겨도 포커스를 다시 뺏지 않도록 최신 onClose 는 ref 로 읽는다
    const onCloseRef = useRef(onClose)
    useEffect(() => {
        onCloseRef.current = onClose
    }, [onClose])

    useEffect(() => {
        if (!isOpen) return
        closeRef.current?.focus()
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onCloseRef.current()
        }
        document.addEventListener('keydown', onKeyDown)
        return () => document.removeEventListener('keydown', onKeyDown)
    }, [isOpen])

    useEffect(() => {
        bodyRef.current?.scrollTo({ top: 0 })
    }, [contentKey])

    if (!isOpen) return null
    return (
        <>
            <div className={styles.backdrop} data-drawer-backdrop onClick={onClose} />
            <section className={styles.panel} role="dialog" aria-modal="true" aria-label={label}>
                <span className={styles.close}>
                    <Button ref={closeRef} variant="ghost" aria-label="닫기" onClick={onClose}>
                        ✕
                    </Button>
                </span>
                <div ref={bodyRef} className={styles.body}>
                    {children}
                </div>
            </section>
        </>
    )
}

export default Drawer
