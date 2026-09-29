import { useQuery } from '@tanstack/react-query'

import { fetchHealth } from './healthApi'

/**
 * 서버 상태. dev === true 인 Node 개발 서버에서만 개발 모드 UI 를 켠다.
 * 실패하면 개발 모드가 아닌 것으로 본다 (운영 서버·스타터 내장 대시보드).
 */
export function useIsDevServer(): boolean {
    const { data } = useQuery({
        queryKey: ['health'],
        queryFn: ({ signal }) => fetchHealth(signal),
        staleTime: Infinity,
        retry: false,
        refetchOnWindowFocus: false,
    })
    return data?.isDev ?? false
}
