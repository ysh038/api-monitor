import type { ILogFilters, TLogKind, TStatusFilter } from '../../types/log'

export const EMPTY_FILTERS: ILogFilters = {
    service: '',
    host: '',
    kind: '',
    statuses: [],
    isExceptionOnly: false,
    q: '',
}

export const STATUS_FILTERS: readonly TStatusFilter[] = ['2xx', '4xx', '5xx', 'none']
const KINDS: readonly TLogKind[] = ['INBOUND', 'OUTBOUND']

/** 호스트를 고르면 외부 호출 탭으로. 같은 호스트를 다시 고르면 호스트만 해제 */
export function selectHost(filters: ILogFilters, host: string): ILogFilters {
    if (filters.host === host) return { ...filters, host: '' }
    return { ...filters, host, kind: 'OUTBOUND' }
}

/** 외부 호출이 아닌 구분으로 바꾸면 호스트 필터는 의미가 없어 해제 */
export function changeKind(filters: ILogFilters, kind: TLogKind | ''): ILogFilters {
    return { ...filters, kind, host: kind === 'OUTBOUND' ? filters.host : '' }
}

export const changeService = (filters: ILogFilters, service: string): ILogFilters => ({
    ...filters,
    service,
    host: '',
})

export const clearScope = (filters: ILogFilters): ILogFilters => ({
    ...filters,
    service: '',
    host: '',
})

export function toggleStatus(filters: ILogFilters, status: TStatusFilter): ILogFilters {
    const next = filters.statuses.includes(status)
        ? filters.statuses.filter((s) => s !== status)
        : [...filters.statuses, status]
    // 쿼리 키·URL 이 선택 순서에 흔들리지 않도록 고정 순서로 둔다
    return { ...filters, statuses: STATUS_FILTERS.filter((s) => next.includes(s)) }
}

export const hasAnyFilter = (f: ILogFilters) =>
    Boolean(
        f.service || f.host || f.kind || f.statuses.length || f.isExceptionOnly || f.q,
    )

/** 서비스·외부 호출 대상 필터 안내 줄 문구 */
export function getScopeLabel(f: ILogFilters): string | null {
    const labels: string[] = []
    if (f.service) labels.push(`서비스: ${f.service}`)
    if (f.host) labels.push(`보낸 대상: ${f.host}`)
    return labels.length ? labels.join(' · ') : null
}

export interface IHashState {
    filters: ILogFilters
    selectedId: number | null
}

/** #/?service=..&kind=..&status=..&exception=1&q=..&id=.. (스타터가 index.html 만 서빙하므로 해시 방식) */
export function toHash({ filters, selectedId }: IHashState): string {
    const params = new URLSearchParams()
    if (filters.service) params.set('service', filters.service)
    if (filters.host) params.set('host', filters.host)
    if (filters.kind) params.set('kind', filters.kind)
    if (filters.statuses.length) params.set('status', filters.statuses.join(','))
    if (filters.isExceptionOnly) params.set('exception', '1')
    if (filters.q) params.set('q', filters.q)
    if (selectedId !== null) params.set('id', String(selectedId))
    const query = params.toString()
    return query ? `#/?${query}` : ''
}

const isKind = (value: string | null): value is TLogKind =>
    KINDS.some((kind) => kind === value)

const isStatusFilter = (value: string): value is TStatusFilter =>
    STATUS_FILTERS.some((status) => status === value)

export function parseHash(hash: string): IHashState {
    const query = hash.replace(/^#\/?\??/, '')
    const params = new URLSearchParams(query)
    const kind = params.get('kind')
    const statuses = (params.get('status') ?? '').split(',').filter(isStatusFilter)
    const id = Number(params.get('id'))
    return {
        filters: {
            service: params.get('service') ?? '',
            host: params.get('host') ?? '',
            kind: isKind(kind) ? kind : '',
            statuses: STATUS_FILTERS.filter((s) => statuses.includes(s)),
            isExceptionOnly: params.get('exception') === '1',
            q: params.get('q') ?? '',
        },
        selectedId: params.has('id') && Number.isInteger(id) && id > 0 ? id : null,
    }
}
