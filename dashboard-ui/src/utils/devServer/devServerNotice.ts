/**
 * Vite 개발 서버로 화면을 띄웠을 때, API 서버(Node :8081) 상태를 알려 주는 안내.
 * 운영 빌드(Node 서버 /, 스타터 /_api-monitor/)에서는 항상 null 이다.
 */
export type TDevServerNotice = 'unreachable' | 'not-dev-mode'
export type THealthStatus = 'pending' | 'success' | 'error'

export interface IDevServerState {
    /** import.meta.env.DEV — Vite 개발 서버로 띄웠는지 */
    isViteDev: boolean
    healthStatus: THealthStatus
    /** api/health 의 dev === true */
    isDev: boolean
}

export const HEALTH_RECHECK_MS = 5000

export function getDevServerNotice({ isViteDev, healthStatus, isDev }: IDevServerState): TDevServerNotice | null {
    if (!isViteDev) return null
    if (healthStatus === 'error') return 'unreachable'
    if (healthStatus === 'success' && !isDev) return 'not-dev-mode'
    return null
}

/** 안내가 떠 있는 동안에만 다시 확인해서, API 서버를 켜면 안내가 저절로 사라지게 한다 */
export function getHealthRecheckInterval(state: IDevServerState): number | false {
    return getDevServerNotice(state) ? HEALTH_RECHECK_MS : false
}
