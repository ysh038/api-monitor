import { useCallback, useEffect, useRef, useState } from 'react'

/** --duration-slow 와 같은 값. 접을 때 이 시간 뒤에 행을 지운다 (spec C5a) */
const COLLAPSE_MS = 320

/**
 * opening 행을 그렸지만 아직 높이 0 (다음 프레임에 open 으로)
 * open    원래 높이로 늘어남
 * closing 높이 0 으로 줄어드는 중 — 끝나면 지운다
 */
export type TGroupPhase = 'opening' | 'open' | 'closing'

/** 대기 중인 예약 — requestAnimationFrame 과 setTimeout 은 id 공간이 달라 종류를 같이 기억한다 */
type TPending = { kind: 'frame' | 'timeout'; id: number }

const cancel = ({ kind, id }: TPending) =>
    kind === 'frame' ? cancelAnimationFrame(id) : window.clearTimeout(id)

/** 정상 요청 묶음의 아코디언 여닫기 단계 */
export function useGroupAccordion() {
    const [phases, setPhases] = useState<ReadonlyMap<string, TGroupPhase>>(new Map())
    const timers = useRef(new Map<string, TPending>())

    const setPhase = useCallback((key: string, phase: TGroupPhase | null) => {
        setPhases((prev) => {
            const next = new Map(prev)
            if (phase) next.set(key, phase)
            else next.delete(key)
            return next
        })
    }, [])

    const clearTimer = (key: string) => {
        const pending = timers.current.get(key)
        if (pending) {
            cancel(pending)
            timers.current.delete(key)
        }
    }

    // opening 으로 높이 0 인 행이 그려진 뒤에 open 으로 바꿔야 전환이 일어난다 (두 프레임 뒤)
    useEffect(() => {
        for (const [key, phase] of phases) {
            if (phase !== 'opening' || timers.current.has(key)) continue
            const first = requestAnimationFrame(() => {
                const second = requestAnimationFrame(() => {
                    timers.current.delete(key)
                    setPhase(key, 'open')
                })
                timers.current.set(key, { kind: 'frame', id: second })
            })
            timers.current.set(key, { kind: 'frame', id: first })
        }
    }, [phases, setPhase])

    useEffect(() => {
        const pending = timers.current
        return () => {
            for (const timer of pending.values()) cancel(timer)
        }
    }, [])

    const toggle = (key: string) => {
        const current = phases.get(key)
        clearTimer(key)
        if (current === 'open' || current === 'opening') {
            setPhase(key, 'closing')
            const id = window.setTimeout(() => {
                timers.current.delete(key)
                setPhase(key, null)
            }, COLLAPSE_MS)
            timers.current.set(key, { kind: 'timeout', id })
        } else {
            setPhase(key, 'opening')
        }
    }

    return { phaseOf: (key: string) => phases.get(key), toggle }
}
