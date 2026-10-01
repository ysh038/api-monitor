import {
    useEffect,
    useRef,
    useState,
    type CSSProperties,
    type KeyboardEvent as ReactKeyboardEvent,
    type PointerEvent as ReactPointerEvent,
    type ReactNode,
} from 'react'

import Button from '../../atoms/Button'

import styles from './Drawer.module.css'

/** 폭 조절 옵션. 주지 않으면 폭이 고정이다 */
export interface IDrawerResize {
    defaultWidth: number
    minWidth: number
    /** 주면 조절한 폭을 이 키로 브라우저에 기억한다 */
    storageKey?: string
}

export interface IDrawerProps {
    isOpen: boolean
    /** 대화상자 이름 (스크린리더) */
    label: string
    onClose: () => void
    children: ReactNode
    /** 바뀌면 본문 스크롤을 맨 위로 (다른 항목으로 이동했을 때) */
    contentKey?: string | number
    /** 왼쪽 가장자리를 끌어 폭을 바꿀 수 있게 한다 */
    resize?: IDrawerResize
}

/** 최대 폭 = 화면 폭 − 이 값. 뒤 배경을 눌러 닫을 자리를 남긴다 */
const VIEWPORT_GAP = 80
const KEY_STEP = 16
const KEY_STEP_LARGE = 64

function readStoredWidth(key: string | undefined): number | null {
    if (!key) return null
    try {
        const value = Number(window.localStorage.getItem(key))
        return Number.isFinite(value) && value > 0 ? value : null
    } catch {
        return null
    }
}

function storeWidth(key: string | undefined, width: number) {
    if (!key) return
    try {
        window.localStorage.setItem(key, String(width))
    } catch {
        // 저장소를 못 쓰면(사생활 보호 모드 등) 이번 세션만 유지한다
    }
}

/**
 * 오른쪽에서 밀려 나오는 패널. 닫기 버튼·배경 클릭·ESC 로 닫는다.
 * resize 를 주면 왼쪽 가장자리 손잡이(창 분할자)로 폭을 바꾼다 — 끌기, ←/→(Shift 는 크게), 더블클릭은 기본 폭.
 */
function Drawer({ isOpen, label, onClose, children, contentKey, resize }: IDrawerProps) {
    const closeRef = useRef<HTMLButtonElement>(null)
    const bodyRef = useRef<HTMLDivElement>(null)
    const panelRef = useRef<HTMLElement>(null)
    // 부모가 매 렌더 새 함수를 넘겨도 포커스를 다시 뺏지 않도록 최신 onClose 는 ref 로 읽는다
    const onCloseRef = useRef(onClose)
    useEffect(() => {
        onCloseRef.current = onClose
    }, [onClose])

    const maxWidth = () => Math.max(resize?.minWidth ?? 0, window.innerWidth - VIEWPORT_GAP)
    const clamp = (width: number) =>
        Math.round(Math.min(maxWidth(), Math.max(resize?.minWidth ?? 0, width)))
    const [width, setWidth] = useState(() =>
        resize ? clamp(readStoredWidth(resize.storageKey) ?? resize.defaultWidth) : 0,
    )

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

    const commitWidth = (next: number) => {
        const clamped = clamp(next)
        setWidth(clamped)
        storeWidth(resize?.storageKey, clamped)
    }

    // 끄는 동안에는 상태를 바꾸지 않고 CSS 변수만 바꾼다 — 상세 내용이 매 움직임마다 다시 그려지지 않게
    const startDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
        if (event.button !== 0) return
        event.preventDefault()
        const handle = event.currentTarget
        const startX = event.clientX
        const startWidth = width
        let current = startWidth
        const { cursor, userSelect } = document.body.style
        document.body.style.cursor = 'col-resize'
        document.body.style.userSelect = 'none'

        const onMove = (move: PointerEvent) => {
            current = clamp(startWidth + (startX - move.clientX))
            panelRef.current?.style.setProperty('--drawer-width', `${current}px`)
            handle.setAttribute('aria-valuenow', String(current))
        }
        const onUp = () => {
            window.removeEventListener('pointermove', onMove)
            window.removeEventListener('pointerup', onUp)
            document.body.style.cursor = cursor
            document.body.style.userSelect = userSelect
            commitWidth(current)
        }
        window.addEventListener('pointermove', onMove)
        window.addEventListener('pointerup', onUp)
    }

    const onHandleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
        const step = event.shiftKey ? KEY_STEP_LARGE : KEY_STEP
        if (event.key === 'ArrowLeft') commitWidth(width + step)
        else if (event.key === 'ArrowRight') commitWidth(width - step)
        else return
        event.preventDefault()
    }

    if (!isOpen) return null
    const panelStyle = resize ? ({ '--drawer-width': `${width}px` } as CSSProperties) : undefined
    return (
        <>
            <div className={styles.backdrop} data-drawer-backdrop onClick={onClose} />
            <section
                ref={panelRef}
                className={styles.panel}
                style={panelStyle}
                role="dialog"
                aria-modal="true"
                aria-label={label}
            >
                {resize ? (
                    <div
                        className={styles.handle}
                        role="separator"
                        aria-orientation="vertical"
                        aria-label="상세 패널 폭 조절"
                        aria-valuenow={width}
                        aria-valuemin={resize.minWidth}
                        aria-valuemax={maxWidth()}
                        tabIndex={0}
                        onPointerDown={startDrag}
                        onKeyDown={onHandleKeyDown}
                        onDoubleClick={() => commitWidth(resize.defaultWidth)}
                    />
                ) : null}
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
