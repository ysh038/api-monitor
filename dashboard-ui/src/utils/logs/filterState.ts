import type { ILogFilters, TLogKind, TStatusFilter } from '../../types/log'

export const EMPTY_FILTERS: ILogFilters = {
    kind: '',
    statuses: [],
    q: '',
}

export const STATUS_FILTERS: readonly TStatusFilter[] = ['2xx', '4xx', '5xx', 'none']
const KINDS: readonly TLogKind[] = ['INBOUND', 'OUTBOUND']

export const changeKind = (filters: ILogFilters, kind: TLogKind | ''): ILogFilters => ({
    ...filters,
    kind,
})

export function toggleStatus(filters: ILogFilters, status: TStatusFilter): ILogFilters {
    const next = filters.statuses.includes(status)
        ? filters.statuses.filter((s) => s !== status)
        : [...filters.statuses, status]
    // 쿼리 키·URL 이 선택 순서에 흔들리지 않도록 고정 순서로 둔다
    return { ...filters, statuses: STATUS_FILTERS.filter((s) => next.includes(s)) }
}

export const hasAnyFilter = (f: ILogFilters) => Boolean(f.kind || f.statuses.length || f.q)

export interface IHashState {
    filters: ILogFilters
    selectedId: number | null
}

/** #/?kind=..&status=..&q=..&id=.. (스타터가 index.html 만 서빙하므로 해시 방식) */
export function toHash({ filters, selectedId }: IHashState): string {
    const params = new URLSearchParams()
    if (filters.kind) params.set('kind', filters.kind)
    if (filters.statuses.length) params.set('status', filters.statuses.join(','))
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
            kind: isKind(kind) ? kind : '',
            statuses: STATUS_FILTERS.filter((s) => statuses.includes(s)),
            q: params.get('q') ?? '',
        },
        selectedId: params.has('id') && Number.isInteger(id) && id > 0 ? id : null,
    }
}
