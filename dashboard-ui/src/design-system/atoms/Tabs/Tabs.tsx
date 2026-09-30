import { useRef, type KeyboardEvent } from 'react'

import styles from './Tabs.module.css'

export interface ITab {
    id: string
    label: string
    /** 이 탭 버튼의 DOM id — 패널의 aria-labelledby 가 가리킨다 */
    buttonId: string
    /** 이 탭이 여는 패널의 DOM id (aria-controls) */
    panelId: string
}

export interface ITabsProps {
    label: string
    tabs: ITab[]
    activeId: string
    onChange: (id: string) => void
}

const ARROW_STEPS: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1 }

/** 탭 목록만 그린다. 패널은 부모가 role="tabpanel" 로 그린다 */
function Tabs({ label, tabs, activeId, onChange }: ITabsProps) {
    const refs = useRef(new Map<string, HTMLButtonElement>())

    const moveFocus = (event: KeyboardEvent, index: number) => {
        const step = ARROW_STEPS[event.key]
        if (!step) return
        event.preventDefault()
        const next = tabs[(index + step + tabs.length) % tabs.length]
        onChange(next.id)
        refs.current.get(next.id)?.focus()
    }

    return (
        <div className={styles.list} role="tablist" aria-label={label}>
            {tabs.map((tab, index) => {
                const isActive = tab.id === activeId
                return (
                    <button
                        key={tab.id}
                        ref={(node) => {
                            if (node) refs.current.set(tab.id, node)
                            else refs.current.delete(tab.id)
                        }}
                        type="button"
                        role="tab"
                        id={tab.buttonId}
                        className={styles.tab}
                        aria-selected={isActive}
                        aria-controls={tab.panelId}
                        tabIndex={isActive ? 0 : -1}
                        onClick={() => onChange(tab.id)}
                        onKeyDown={(event) => moveFocus(event, index)}
                    >
                        {tab.label}
                    </button>
                )
            })}
        </div>
    )
}

export default Tabs
