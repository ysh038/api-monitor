import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'

import styles from './SegmentedControl.module.css'

export interface ISegmentedOption<TValue extends string> {
    value: TValue
    label: string
}

export interface ISegmentedControlProps<TValue extends string> {
    /** 그룹 이름 (스크린리더) */
    label: string
    options: ISegmentedOption<TValue>[]
    value: TValue
    onChange: (value: TValue) => void
}

interface IIndicatorBox {
    x: number
    width: number
}

/**
 * 하나만 고르는 버튼 묶음. 선택 상태는 aria-pressed 로 알린다.
 * 선택 표시는 별도 요소로 그려서, 고를 때 새 버튼 자리로 미끄러져 간다 (처음 그릴 때는 바로 제자리).
 */
function SegmentedControl<TValue extends string>({
    label,
    options,
    value,
    onChange,
}: ISegmentedControlProps<TValue>) {
    const groupRef = useRef<HTMLDivElement>(null)
    const [box, setBox] = useState<IIndicatorBox | null>(null)
    const [isAnimated, setAnimated] = useState(false)

    // 선택한 버튼의 위치·폭을 재서 선택 표시를 맞춘다. 묶음 크기가 바뀌어도 다시 맞춘다.
    useLayoutEffect(() => {
        const group = groupRef.current
        if (!group) return undefined
        const measure = () => {
            const active = group.querySelector<HTMLElement>('[aria-pressed="true"]')
            setBox(active ? { x: active.offsetLeft, width: active.offsetWidth } : null)
        }
        measure()
        if (typeof ResizeObserver === 'undefined') return undefined
        const observer = new ResizeObserver(measure)
        observer.observe(group)
        group.querySelectorAll('button').forEach((button) => observer.observe(button))
        return () => observer.disconnect()
    }, [value, options])

    // 첫 위치를 잡은 다음 프레임부터 전환을 켠다 — 처음 그릴 때 미끄러지지 않게
    useEffect(() => {
        if (!box || isAnimated) return undefined
        const frame = requestAnimationFrame(() => setAnimated(true))
        return () => cancelAnimationFrame(frame)
    }, [box, isAnimated])

    const indicatorStyle = box
        ? ({ '--indicator-x': `${box.x}px`, '--indicator-width': `${box.width}px` } as CSSProperties)
        : undefined

    return (
        <div
            ref={groupRef}
            className={styles.group}
            role="group"
            aria-label={label}
            data-has-indicator={box ? 'true' : undefined}
        >
            {box ? (
                <span
                    className={`${styles.indicator} ${isAnimated ? styles.isAnimated : ''}`}
                    style={indicatorStyle}
                    aria-hidden="true"
                    data-indicator=""
                />
            ) : null}
            {options.map((option) => (
                <button
                    key={option.value}
                    type="button"
                    className={styles.option}
                    aria-pressed={option.value === value}
                    data-label={option.label}
                    onClick={() => onChange(option.value)}
                >
                    {option.label}
                </button>
            ))}
        </div>
    )
}

export default SegmentedControl
