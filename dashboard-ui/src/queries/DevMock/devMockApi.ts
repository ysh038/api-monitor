import { DEV_MOCK_URL } from '../../api/endpoints'
import { requestJson } from '../../api/http'
import { mapMockResult } from '../../mappers/logMapper'

/** Mock 19건 추가 → 추가된 건수 */
export async function insertMockLogs(): Promise<number> {
    return mapMockResult(await requestJson(DEV_MOCK_URL, { method: 'POST' }), 'inserted')
}

/** Mock 만 삭제 → 삭제된 건수 */
export async function deleteMockLogs(): Promise<number> {
    return mapMockResult(await requestJson(DEV_MOCK_URL, { method: 'DELETE' }), 'deleted')
}
