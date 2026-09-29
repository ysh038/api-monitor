import { useQuery } from '@tanstack/react-query'

import { fetchServicesOverview } from './servicesApi'

export const servicesQueryKeys = {
    all: ['services'] as const,
}

/** 서비스별·외부 호출 대상별 누적 건수. 갱신 주기는 대시보드 폴링이 정한다 (10초) */
export function useServicesQuery() {
    return useQuery({
        queryKey: servicesQueryKeys.all,
        queryFn: ({ signal }) => fetchServicesOverview(signal),
        staleTime: Infinity,
        refetchOnWindowFocus: false,
    })
}
