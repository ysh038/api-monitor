import type { ILogRow } from '../../types/log'

import { formatDuration } from './format'
import { isFailure, shortClassName } from './status'

export interface IDiagnosis {
    /** 상세 제목에 쓰는 원인 문장 */
    headline: string
    /** "이렇게 확인해 보세요" 목록. 없으면 빈 배열 */
    hints: string[]
}

const TIMEOUT_CLASS = /(SocketTimeout|Timeout)Exception$/
const TIMEOUT_MESSAGE = /timed? ?out/i
const CONNECT_CLASS = /(Connect|UnknownHost|NoRouteToHost)Exception$/
const CONNECT_MESSAGE = /connection refused/i
const VALIDATION_CLASS = /(MethodArgumentNotValid|ConstraintViolation|BindException|HttpMessageNotReadable)/
const DATA_INTEGRITY_CLASS = /DataIntegrityViolationException$/

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

function hintsOf(row: ILogRow): string[] {
    const host = row.targetHost
    const exceptionClass = row.exceptionClass ?? ''
    const message = row.exceptionMessage ?? ''
    const code = row.statusCode

    if (TIMEOUT_CLASS.test(exceptionClass) || TIMEOUT_MESSAGE.test(message)) {
        const hints = [
            `읽기 타임아웃 ${formatDuration(row.durationMs)}가 이 호출에 충분한지 확인해 보세요`,
        ]
        return host ? [`${host} 서버가 정상적으로 떠 있는지 확인해 보세요`, ...hints] : hints
    }
    if (CONNECT_CLASS.test(exceptionClass) || CONNECT_MESSAGE.test(message)) {
        return [
            `${host ?? '대상'} 서버가 떠 있는지, 주소와 포트가 맞는지 확인해 보세요`,
        ]
    }
    if (row.kind === 'OUTBOUND' && code !== null && code >= 500) {
        return [`${host} 서버 로그에서 같은 시각의 오류를 확인해 보세요`]
    }
    if (DATA_INTEGRITY_CLASS.test(exceptionClass)) {
        return ['중복 키나 NOT NULL 같은 DB 제약 조건에 걸리지 않았는지 확인해 보세요']
    }
    if (code === 401 || code === 403) {
        return ['인증 토큰이나 권한 설정이 맞는지 확인해 보세요']
    }
    if (code === 404) return ['요청 경로와 HTTP 메서드가 맞는지 확인해 보세요']
    if (code === 400 || VALIDATION_CLASS.test(exceptionClass)) {
        return ['요청 바디와 파라미터 값이 검증 조건에 맞는지 확인해 보세요']
    }
    return []
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
            label: row.kind === 'OUTBOUND' ? '외부 호출 실패' : '예외 발생 · 서버 오류',
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
