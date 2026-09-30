import { useCallback, useEffect, useRef, useState } from 'react'

/** 잠깐 보였다 사라지는 메시지. 새 메시지는 타이머를 다시 시작한다 */
export function useFlashMessage(
    durationMs: number,
): [string | null, (message: string) => void] {
    const [message, setMessage] = useState<string | null>(null)
    const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

    const show = useCallback(
        (next: string) => {
            clearTimeout(timer.current)
            setMessage(next)
            timer.current = setTimeout(() => setMessage(null), durationMs)
        },
        [durationMs],
    )

    useEffect(() => () => clearTimeout(timer.current), [])

    return [message, show]
}
