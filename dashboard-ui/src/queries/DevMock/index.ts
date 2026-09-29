import { useMutation, useQueryClient } from '@tanstack/react-query'

import { logsQueryKeys } from '../Logs'
import { servicesQueryKeys } from '../Services'

import { deleteMockLogs, insertMockLogs } from './devMockApi'

/** 개발 모드 Mock 추가·삭제. 끝나면 목록은 첫 페이지부터, 서비스 건수는 다시 받는다 */
export function useDevMockMutations() {
    const queryClient = useQueryClient()
    const reload = async () => {
        await Promise.all([
            queryClient.resetQueries({ queryKey: logsQueryKeys.feeds() }),
            queryClient.invalidateQueries({ queryKey: servicesQueryKeys.all }),
        ])
    }
    const insert = useMutation({ mutationFn: insertMockLogs, onSuccess: reload })
    const remove = useMutation({
        mutationFn: deleteMockLogs,
        onSuccess: async () => {
            queryClient.removeQueries({ queryKey: logsQueryKeys.details() })
            await reload()
        },
    })
    return {
        insertMock: insert.mutateAsync,
        deleteMock: remove.mutateAsync,
        isPending: insert.isPending || remove.isPending,
    }
}
