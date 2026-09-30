import { useEffect, useRef, useState } from 'react'

/** --duration-slow 와 같은 값. 접을 때 이 시간 뒤에 행을 지운다 (spec C5a) */
const COLLAPSE_MS = 320

/**
 * open    펼침 — 새로 나타난 행은 CSS @starting-style 로 첫 프레임부터 0 → 원래 높이로 늘어난다
 * closing 높이 0 으로 줄어드는 중 — 끝나면 지운다
 */
export type TGroupPhase = 'open' | 'closing'

/** 정상 요청 묶음의 아코디언 여닫기 단계 (spec C5a·C5b) */
export function useGroupAccordion() {
    const [phases, setPhases] = useState<ReadonlyMap<string, TGroupPhase>>(new Map())
    const timers = useRef(new Map<string, number>())

    const setPhase = (key: string, phase: TGroupPhase | null) =>
        setPhases((prev) => {
            const next = new Map(prev)
            if (phase) next.set(key, phase)
            else next.delete(key)
            return next
        })

    useEffect(() => {
        const pending = timers.current
        return () => {
            for (const id of pending.values()) window.clearTimeout(id)
        }
    }, [])

    /** isAnimated=false 면 줄어드는 시간을 기다리지 않고 바로 지운다 (큰 묶음) */
    const toggle = (key: string, isAnimated: boolean) => {
        window.clearTimeout(timers.current.get(key))
        timers.current.delete(key)
        if (phases.get(key) !== 'open') {
            // 닫힘 또는 접는 중 → 펼침. 접는 중이면 지금 높이에서 이어서 늘어난다
            setPhase(key, 'open')
            return
        }
        if (!isAnimated) {
            setPhase(key, null)
            return
        }
        setPhase(key, 'closing')
        timers.current.set(
            key,
            window.setTimeout(() => {
                timers.current.delete(key)
                setPhase(key, null)
            }, COLLAPSE_MS),
        )
    }

    return { phaseOf: (key: string) => phases.get(key), toggle }
}
