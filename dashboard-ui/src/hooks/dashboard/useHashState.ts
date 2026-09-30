import { useCallback, useEffect, useRef, useState } from 'react'

import { parseHash, toHash, type IHashState } from '../../utils/logs/filterState'

const readHash = () => parseHash(window.location.hash)

/**
 * 필터·선택 상세를 URL 해시(#/?...)와 맞춘다. 새로고침·링크 공유가 그대로 동작한다.
 * 스타터는 index.html 과 assets 만 서빙하므로 경로 대신 해시를 쓴다 (MIGRATION.md).
 * 필터를 바꿀 때마다 방문 기록이 쌓이지 않도록 replaceState 로 바꾼다.
 */
export function useHashState(onExternalChange?: (next: IHashState) => void) {
    const [state, setState] = useState<IHashState>(readHash)
    const onExternalChangeRef = useRef(onExternalChange)
    useEffect(() => {
        onExternalChangeRef.current = onExternalChange
    }, [onExternalChange])

    useEffect(() => {
        // 사용자가 주소창에서 해시를 직접 바꾸거나 뒤로 가기를 했을 때
        const onHashChange = () => {
            const next = readHash()
            setState(next)
            onExternalChangeRef.current?.(next)
        }
        window.addEventListener('hashchange', onHashChange)
        return () => window.removeEventListener('hashchange', onHashChange)
    }, [])

    const writeHash = useCallback((next: IHashState) => {
        const hash = toHash(next)
        if (hash === window.location.hash) return
        const { pathname, search } = window.location
        window.history.replaceState(window.history.state, '', hash || `${pathname}${search}`)
    }, [])

    return [state, setState, writeHash] as const
}
