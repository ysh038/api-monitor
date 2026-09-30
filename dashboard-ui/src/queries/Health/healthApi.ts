import { HEALTH_URL } from '../../api/endpoints'
import { requestJson } from '../../api/http'
import { mapHealth } from '../../mappers/logMapper'
import type { IHealth } from '../../types/log'

export async function fetchHealth(signal?: AbortSignal): Promise<IHealth> {
    return mapHealth(await requestJson(HEALTH_URL, { signal }))
}
