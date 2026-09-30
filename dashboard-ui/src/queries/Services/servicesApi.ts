import { SERVICES_URL } from '../../api/endpoints'
import { requestJson } from '../../api/http'
import { mapServicesOverview } from '../../mappers/logMapper'
import type { IServicesOverview } from '../../types/log'

export async function fetchServicesOverview(signal?: AbortSignal): Promise<IServicesOverview> {
    return mapServicesOverview(await requestJson(SERVICES_URL, { signal }))
}
