import type { IServicesOverview } from '../../types/log'

import { formatCount } from './format'

export interface ISelectOption {
    value: string
    label: string
}

const withCounts = (name: string, total: number, errors: number) =>
    `${name} · ${formatCount(total)}건${errors > 0 ? ` · 에러 ${formatCount(errors)}` : ''}`

/** 필터 줄 서비스 선택 상자 옵션 (기존 사이드바 서비스 목록을 대신한다) */
export function buildServiceOptions(overview: IServicesOverview | undefined): {
    options: ISelectOption[]
    isEmpty: boolean
} {
    if (!overview) {
        return { isEmpty: false, options: [{ value: '', label: '전체 서비스' }] }
    }
    const { services } = overview
    if (services.length === 0) {
        return {
            isEmpty: true,
            options: [{ value: '', label: '아직 로그를 보낸 서비스가 없습니다' }],
        }
    }
    const total = services.reduce((sum, s) => sum + s.total, 0)
    const errors = services.reduce((sum, s) => sum + s.errors, 0)
    return {
        isEmpty: false,
        options: [
            { value: '', label: withCounts('전체 서비스', total, errors) },
            ...services.map((s) => ({
                value: s.name,
                label: withCounts(s.name, s.total, s.errors),
            })),
        ],
    }
}

/** "전체 N건" — 선택한 서비스(없으면 모든 서비스)의 누적 건수 */
export function getScopeTotal(
    overview: IServicesOverview | undefined,
    service: string,
): number | null {
    if (!overview) return null
    if (!service) return overview.services.reduce((sum, s) => sum + s.total, 0)
    return overview.services.find((s) => s.name === service)?.total ?? 0
}
