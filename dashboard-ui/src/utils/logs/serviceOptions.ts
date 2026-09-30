import type { IServicesOverview } from '../../types/log'

/**
 * "전체 N건" — 서비스별 누적 건수의 합. 아직 못 받았으면 null.
 * 대시보드는 한 프로젝트에 설치돼 그 서비스만 보므로 서비스를 고르는 선택 상자는 없다.
 */
export function getTotalCount(overview: IServicesOverview | undefined): number | null {
    if (!overview) return null
    return overview.services.reduce((sum, s) => sum + s.total, 0)
}
