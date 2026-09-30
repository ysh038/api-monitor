import { useQuery } from '@tanstack/react-query'

import { fetchLogDetail } from './logsApi'
import { logsQueryKeys } from './logsQueryKeys'

/** 선택한 로그 상세. id 가 null 이면 요청하지 않는다. 없는 id 면 data 가 null */
export function useLogDetailQuery(id: number | null) {
    return useQuery({
        queryKey: logsQueryKeys.detail(id ?? 0),
        queryFn: ({ signal }) => fetchLogDetail(id ?? 0, signal),
        enabled: id !== null,
        // 저장된 로그는 바뀌지 않는다
        staleTime: Infinity,
    })
}
