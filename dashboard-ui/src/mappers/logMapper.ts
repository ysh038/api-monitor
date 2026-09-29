import type {
    IExceptionCause,
    IHealth,
    IHostStat,
    ILogDetail,
    ILogRow,
    IServiceStat,
    IServicesOverview,
    TLogKind,
} from '../types/log'

/** 서버 응답(unknown) → 도메인 타입. 형태가 틀리면 조용히 넘기지 않고 던진다 */
export class MappingError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'MappingError'
    }
}

type TRecord = Record<string, unknown>

const isRecord = (value: unknown): value is TRecord =>
    typeof value === 'object' && value !== null && !Array.isArray(value)

function asRecord(value: unknown, what: string): TRecord {
    if (!isRecord(value)) throw new MappingError(`${what}: 객체가 아닙니다`)
    return value
}

function num(raw: TRecord, key: string): number {
    const value = raw[key]
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        throw new MappingError(`${key}: 숫자가 아닙니다`)
    }
    return value
}

function str(raw: TRecord, key: string): string {
    const value = raw[key]
    if (typeof value !== 'string') throw new MappingError(`${key}: 문자열이 아닙니다`)
    return value
}

const optNum = (raw: TRecord, key: string): number | null =>
    typeof raw[key] === 'number' ? (raw[key] as number) : null

const optStr = (raw: TRecord, key: string): string | null =>
    typeof raw[key] === 'string' ? (raw[key] as string) : null

/** 0 | 1 | boolean → boolean */
const flag = (raw: TRecord, key: string) => raw[key] === 1 || raw[key] === true

function kind(raw: TRecord): TLogKind {
    const value = raw.kind
    if (value === 'INBOUND' || value === 'OUTBOUND') return value
    throw new MappingError(`kind: 알 수 없는 값 ${String(value)}`)
}

function list<TItem>(value: unknown, map: (item: unknown) => TItem): TItem[] {
    return Array.isArray(value) ? value.map(map) : []
}

export function mapLogRow(value: unknown): ILogRow {
    const raw = asRecord(value, 'log row')
    return {
        id: num(raw, 'id'),
        kind: kind(raw),
        requestId: optStr(raw, 'request_id'),
        parentRequestId: optStr(raw, 'parent_request_id'),
        serviceName: str(raw, 'service_name'),
        instanceId: optStr(raw, 'instance_id'),
        method: str(raw, 'method'),
        path: str(raw, 'path'),
        targetHost: optStr(raw, 'target_host'),
        statusCode: optNum(raw, 'status_code'),
        durationMs: optNum(raw, 'duration_ms'),
        clientIp: optStr(raw, 'client_ip'),
        isAsync: flag(raw, 'async'),
        createdAt: num(raw, 'created_at'),
        exceptionClass: optStr(raw, 'exception_class'),
        exceptionMessage: optStr(raw, 'exception_message'),
        exceptionHandled:
            raw.exception_handled === null || raw.exception_handled === undefined
                ? null
                : flag(raw, 'exception_handled'),
        childCount: optNum(raw, 'child_count') ?? 0,
        isMock: flag(raw, 'is_mock'),
    }
}

/** GET api/logs → { items, limit } */
export function mapLogList(value: unknown): ILogRow[] {
    const raw = asRecord(value, 'log list')
    if (!Array.isArray(raw.items)) throw new MappingError('items: 배열이 아닙니다')
    return raw.items.map(mapLogRow)
}

/** 헤더 값이 배열로 오면 쉼표로 잇는다 */
const headerValue = (value: unknown) =>
    Array.isArray(value) ? value.map(String).join(', ') : String(value)

function mapHeaders(value: unknown): Record<string, string> {
    if (!isRecord(value)) return {}
    return Object.fromEntries(
        Object.entries(value).map(([name, v]) => [name, headerValue(v)]),
    )
}

const emptyToNull = (value: string | null) => (value === '' ? null : value)

function mapCause(value: unknown): IExceptionCause {
    const raw = asRecord(value, 'exception cause')
    return { exceptionClass: str(raw, 'exceptionClass'), message: optStr(raw, 'message') }
}

/** GET api/logs/:id */
export function mapLogDetail(value: unknown): ILogDetail {
    const raw = asRecord(value, 'log detail')
    const related = isRecord(raw.related) ? raw.related : {}
    return {
        ...mapLogRow(raw),
        requestHeaders: mapHeaders(raw.request_headers),
        responseHeaders: mapHeaders(raw.response_headers),
        requestBody: emptyToNull(optStr(raw, 'request_body')),
        responseBody: emptyToNull(optStr(raw, 'response_body')),
        isRequestBodyTruncated: flag(raw, 'request_body_truncated'),
        isResponseBodyTruncated: flag(raw, 'response_body_truncated'),
        exceptionStacktrace: emptyToNull(optStr(raw, 'exception_stacktrace')),
        exceptionCauses: list(raw.exception_causes, mapCause),
        related: {
            children: list(related.children, mapLogRow),
            parent: isRecord(related.parent) ? mapLogRow(related.parent) : null,
            sameRequestId: list(related.sameRequestId, mapLogRow),
        },
    }
}

function mapServiceStat(value: unknown): IServiceStat {
    const raw = asRecord(value, 'service')
    return {
        name: str(raw, 'name'),
        total: num(raw, 'total'),
        errors: optNum(raw, 'errors') ?? 0,
        exceptions: optNum(raw, 'exceptions') ?? 0,
        lastSeen: optNum(raw, 'lastSeen') ?? 0,
    }
}

function mapHostStat(value: unknown): IHostStat {
    const raw = asRecord(value, 'host')
    return { host: str(raw, 'host'), total: num(raw, 'total') }
}

/** GET api/services */
export function mapServicesOverview(value: unknown): IServicesOverview {
    const raw = asRecord(value, 'services')
    return {
        services: list(raw.services, mapServiceStat),
        hosts: list(raw.hosts, mapHostStat),
    }
}

/** GET api/health — dev === true 일 때만 개발 모드 */
export function mapHealth(value: unknown): IHealth {
    const raw = asRecord(value, 'health')
    return { isDev: raw.dev === true }
}

/** POST/DELETE api/dev/mock → 건수 */
export function mapMockResult(value: unknown, key: 'inserted' | 'deleted'): number {
    return optNum(asRecord(value, 'mock result'), key) ?? 0
}
