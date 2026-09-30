import { useQuery } from '@tanstack/react-query'

import { getHealthRecheckInterval } from '../../utils/devServer'
import type { THealthStatus } from '../../utils/devServer'

import { fetchHealth } from './healthApi'

export interface IServerHealth {
    /** dev === true 인 Node 개발 서버. 실패·확인 중이면 false (운영 서버·스타터 내장 대시보드) */
    isDev: boolean
    status: THealthStatus
}

/**
 * 서버 상태. dev === true 인 Node 개발 서버에서만 개발 모드 UI 를 켠다.
 * Vite 개발 서버에서 API 서버가 꺼져 있거나 운영 모드면, 켜질 때까지 5초마다 다시 확인한다.
 */
export function useServerHealth(isViteDev: boolean = import.meta.env.DEV): IServerHealth {
    const { data, status } = useQuery({
        queryKey: ['health'],
        queryFn: ({ signal }) => fetchHealth(signal),
        staleTime: Infinity,
        retry: false,
        refetchOnWindowFocus: false,
        refetchInterval: (query) =>
            getHealthRecheckInterval({
                isViteDev,
                healthStatus: query.state.status,
                isDev: query.state.data?.isDev ?? false,
            }),
    })
    return { isDev: data?.isDev ?? false, status }
}
