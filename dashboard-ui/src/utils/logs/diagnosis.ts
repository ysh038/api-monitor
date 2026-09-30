import type { ILogRow } from '../../types/log'

import { formatDuration } from './format'
import { isFailure, shortClassName } from './status'

export interface IDiagnosis {
    /** 상세 제목에 쓰는 원인 문장 */
    headline: string
    /** "이렇게 확인해 보세요" 목록. 없으면 빈 배열 */
    hints: string[]
}

function headlineOf(row: ILogRow): string {
    const host = row.targetHost ?? ''
    const code = row.statusCode
    const exception = shortClassName(row.exceptionClass)
    if (row.kind === 'OUTBOUND') {
        if (code === null) return `${host}에서 응답을 받지 못했어요`
        if (code >= 500) return `${host}에서 ${code} 오류가 났어요`
    }
    if (code === null) return '응답을 보내지 못했어요'
    if (exception && code >= 500) return `서버 안에서 ${exception} 예외가 났어요`
    if (exception && code >= 400) {
        return `앱이 ${exception} 예외를 ${code} 응답으로 처리했어요`
    }
    if (code >= 500) return `서버가 ${code} 오류를 돌려줬어요`
    if (code >= 400) return `${code} 응답으로 요청을 거부했어요`
    return '정상 처리했어요'
}

interface IHintRule {
    matches: (row: ILogRow) => boolean
    hints: (row: ILogRow) => string[]
}

const classIs = (pattern: RegExp) => (row: ILogRow) => pattern.test(row.exceptionClass ?? '')
const messageIs = (pattern: RegExp) => (row: ILogRow) => pattern.test(row.exceptionMessage ?? '')
const statusIs =
    (...codes: number[]) =>
    (row: ILogRow) =>
        row.statusCode !== null && codes.includes(row.statusCode)
const anyOf =
    (...checks: ((row: ILogRow) => boolean)[]) =>
    (row: ILogRow) =>
        checks.some((check) => check(row))
const isOutbound = (row: ILogRow) => row.kind === 'OUTBOUND'
const hostOf = (row: ILogRow) => row.targetHost ?? '대상'

const AUTH_HINT = '인증 토큰이나 권한 설정이 맞는지 확인해 보세요'

/**
 * 확인 가이드 규칙표 — 위에서부터 처음 맞는 규칙 하나만 쓴다 (spec F2·F2a).
 * 예외 클래스로 원인을 알 수 있는 규칙을 상태 코드 규칙보다 앞에 둔다.
 * 순서가 뜻을 가진다: 예) Hikari 풀 고갈 메시지에도 "timed out" 이 있어서 DB 규칙이 타임아웃보다 먼저다.
 */
const HINT_RULES: IHintRule[] = [
    {
        matches: anyOf(
            classIs(/(CannotGetJdbcConnection|SQLTransientConnection|JDBCConnection)Exception$/),
            messageIs(/Connection is not available/i),
        ),
        hints: () => ['DB 커넥션 풀이 모자라지 않은지(최대 커넥션 수, 오래 걸리는 쿼리) 확인해 보세요'],
    },
    {
        matches: classIs(/(OutOfMemoryError|StackOverflowError)$/),
        hints: () => ['메모리 사용량이나 끝없이 도는 재귀 호출이 없는지 확인해 보세요'],
    },
    {
        matches: classIs(/(SSLHandshakeException|SSLException|CertPathValidatorException)$/),
        hints: (row) => [
            `${hostOf(row)} 서버 인증서가 유효한지, 우리 서버가 신뢰하는 인증서인지 확인해 보세요`,
        ],
    },
    {
        matches: anyOf(classIs(/(SocketTimeout|Timeout)Exception$/), messageIs(/timed? ?out/i)),
        hints: (row) => {
            const timeout = `읽기 타임아웃 ${formatDuration(row.durationMs)}가 이 호출에 충분한지 확인해 보세요`
            return row.targetHost
                ? [`${row.targetHost} 서버가 정상적으로 떠 있는지 확인해 보세요`, timeout]
                : [timeout]
        },
    },
    {
        matches: anyOf(
            classIs(/(Connect|UnknownHost|NoRouteToHost)Exception$/),
            messageIs(/connection refused/i),
        ),
        hints: (row) => [`${hostOf(row)} 서버가 떠 있는지, 주소와 포트가 맞는지 확인해 보세요`],
    },
    {
        matches: (row) => isOutbound(row) && statusIs(429)(row),
        hints: (row) => [
            `${hostOf(row)} 서버의 호출 횟수 제한(rate limit)에 걸리지 않았는지 확인해 보세요`,
        ],
    },
    {
        matches: (row) => isOutbound(row) && row.statusCode !== null && row.statusCode >= 500,
        hints: (row) => [`${row.targetHost} 서버 로그에서 같은 시각의 오류를 확인해 보세요`],
    },
    {
        matches: classIs(/DataIntegrityViolationException$/),
        hints: () => ['중복 키나 NOT NULL 같은 DB 제약 조건에 걸리지 않았는지 확인해 보세요'],
    },
    {
        matches: anyOf(classIs(/OptimisticLock(ing)?(Failure)?Exception$/), statusIs(409)),
        hints: () => ['같은 데이터를 동시에 고친 다른 요청이 없는지 확인해 보세요'],
    },
    {
        matches: classIs(/NullPointerException$/),
        hints: () => ['스택트레이스에서 강조된 앱 코드 줄을 보고, 비어 있을 수 있는 값을 확인해 보세요'],
    },
    {
        matches: classIs(/(EntityNotFound|NoSuchElement|EmptyResultDataAccess)Exception$/),
        hints: () => ['찾으려는 데이터가 실제로 있는지(id 값) 확인해 보세요'],
    },
    {
        matches: classIs(/HttpMessageNotReadableException$/),
        hints: () => ['요청 바디가 올바른 JSON 형식인지, 필드 타입이 맞는지 확인해 보세요'],
    },
    {
        matches: anyOf(classIs(/AccessDeniedException$/), statusIs(401, 403)),
        hints: () => [AUTH_HINT],
    },
    {
        matches: anyOf(classIs(/HttpRequestMethodNotSupportedException$/), statusIs(405)),
        hints: () => ['이 경로가 받는 HTTP 메서드(GET, POST 등)가 맞는지 확인해 보세요'],
    },
    {
        matches: anyOf(classIs(/HttpMediaTypeNotSupportedException$/), statusIs(415)),
        hints: () => ['요청의 Content-Type 헤더가 이 API가 받는 형식인지 확인해 보세요'],
    },
    {
        matches: anyOf(classIs(/MaxUploadSizeExceededException$/), statusIs(413)),
        hints: () => ['업로드 크기 제한(max-file-size 등)을 넘지 않았는지 확인해 보세요'],
    },
    {
        matches: statusIs(429),
        hints: () => ['호출 횟수 제한(rate limit)에 걸리지 않았는지 확인해 보세요'],
    },
    {
        matches: statusIs(404),
        hints: () => ['요청 경로와 HTTP 메서드가 맞는지 확인해 보세요'],
    },
    {
        matches: anyOf(
            classIs(/(MethodArgumentNotValid|ConstraintViolation|BindException)/),
            statusIs(400),
        ),
        hints: () => ['요청 바디와 파라미터 값이 검증 조건에 맞는지 확인해 보세요'],
    },
]

function hintsOf(row: ILogRow): string[] {
    return HINT_RULES.find((rule) => rule.matches(row))?.hints(row) ?? []
}

/**
 * 상세 상단의 원인 문장과 확인 가이드.
 * 실패한 요청이 실패한 외부 호출을 가졌으면 그 호출을 원인으로 본다.
 */
export function diagnose(row: ILogRow, children: ILogRow[]): IDiagnosis {
    const failedCall = isFailure(row)
        ? children.find((child) => isFailure(child))
        : undefined
    if (failedCall) {
        return {
            headline: `${failedCall.targetHost ?? '외부 서버'} 호출이 실패해서 이 요청도 실패했어요`,
            hints: hintsOf(failedCall),
        }
    }
    return { headline: headlineOf(row), hints: hintsOf(row) }
}

export interface IResultBox {
    tone: 'success' | 'warning' | 'danger'
    label: string
}

/** 상세의 결과 박스 문구 (기존 대시보드 문구 그대로) */
export function getResultBox(row: ILogRow): IResultBox {
    const code = row.statusCode
    if (row.exceptionClass) {
        if (code !== null && code < 500) {
            return { tone: 'warning', label: `예외 발생 · 앱이 ${code} 응답으로 처리함` }
        }
        return {
            tone: 'danger',
            label: row.kind === 'OUTBOUND' ? '보낸 요청 실패' : '예외 발생 · 서버 오류',
        }
    }
    if (code === null) return { tone: 'danger', label: '응답 없음' }
    if (code >= 500) return { tone: 'danger', label: `서버 오류 ${code} · 예외 정보 없음` }
    if (code >= 400) {
        return {
            tone: 'warning',
            label: `요청 거부 ${code} · 예외 정보 없음 (인증 필터 등 컨트롤러 이전 단계 응답)`,
        }
    }
    return { tone: 'success', label: '✓ 정상 처리' }
}
