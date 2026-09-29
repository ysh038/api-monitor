import { buildLogDetailUrl, buildLogsUrl, type ILogCursor } from '../../api/endpoints'
import { isNotFound, requestJson } from '../../api/http'
import { mapLogDetail, mapLogList } from '../../mappers/logMapper'
import type { ILogDetail, ILogFilters, ILogRow } from '../../types/log'

export async function fetchLogs(
    filters: ILogFilters,
    cursor: ILogCursor,
    signal?: AbortSignal,
): Promise<ILogRow[]> {
    return mapLogList(await requestJson(buildLogsUrl(filters, cursor), { signal }))
}

/** 없는 id 면 null (서버 404) */
export async function fetchLogDetail(
    id: number,
    signal?: AbortSignal,
): Promise<ILogDetail | null> {
    try {
        return mapLogDetail(await requestJson(buildLogDetailUrl(id), { signal }))
    } catch (error) {
        if (isNotFound(error)) return null
        throw error
    }
}
