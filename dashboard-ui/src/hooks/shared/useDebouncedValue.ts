import { useEffect, useState } from 'react'

/** value 가 delayMs 동안 바뀌지 않으면 반영한다 (검색 300ms 디바운스) */
export function useDebouncedValue<TValue>(value: TValue, delayMs: number): TValue {
    const [debounced, setDebounced] = useState(value)
    useEffect(() => {
        const timer = setTimeout(() => setDebounced(value), delayMs)
        return () => clearTimeout(timer)
    }, [value, delayMs])
    return debounced
}
