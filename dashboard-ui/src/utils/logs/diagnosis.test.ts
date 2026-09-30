import { describe, expect, it } from 'vitest'

import { makeOutbound, makeRow } from '../../mocks/logFixtures'

import { diagnose, getResultBox } from './diagnosis'

describe('원인 문장 (F1)', () => {
    it('실패한 외부 호출 때문에 실패한 요청', () => {
        const parent = makeRow({
            statusCode: 500,
            exceptionClass: 'org.x.ResourceAccessException',
        })
        const call = makeOutbound(parent, {
            targetHost: 'pg-gateway:9000',
            statusCode: null,
            durationMs: 3000,
            exceptionClass: 'java.net.SocketTimeoutException',
            exceptionMessage: 'Read timed out',
        })
        expect(diagnose(parent, [call])).toEqual({
            headline: 'pg-gateway:9000 호출이 실패해서 이 요청도 실패했어요',
            hints: [
                'pg-gateway:9000 서버가 정상적으로 떠 있는지 확인해 보세요',
                '읽기 타임아웃 3.0초가 이 호출에 충분한지 확인해 보세요',
            ],
        })
    })

    it.each([
        [
            '응답 없는 외부 호출',
            makeOutbound(null, { targetHost: 'pg:9000', statusCode: null }),
            'pg:9000에서 응답을 받지 못했어요',
        ],
        [
            '5xx 외부 호출',
            makeOutbound(null, { targetHost: 'ai:8000', statusCode: 502 }),
            'ai:8000에서 502 오류가 났어요',
        ],
        [
            '예외 있는 5xx',
            makeRow({ statusCode: 500, exceptionClass: 'a.b.DataIntegrityViolationException' }),
            '서버 안에서 DataIntegrityViolationException 예외가 났어요',
        ],
        [
            '예외 있는 4xx',
            makeRow({ statusCode: 400, exceptionClass: 'a.MethodArgumentNotValidException' }),
            '앱이 MethodArgumentNotValidException 예외를 400 응답으로 처리했어요',
        ],
        ['예외 없는 4xx', makeRow({ statusCode: 401 }), '401 응답으로 요청을 거부했어요'],
        ['예외 없는 5xx', makeRow({ statusCode: 503 }), '서버가 503 오류를 돌려줬어요'],
        ['정상', makeRow({ statusCode: 200 }), '정상 처리했어요'],
    ])('%s', (_name, row, headline) => {
        expect(diagnose(row, []).headline).toBe(headline)
    })
})

describe('확인 가이드 (F2)', () => {
    it('연결 실패', () => {
        const call = makeOutbound(null, {
            targetHost: 'pg:9000',
            statusCode: null,
            exceptionClass: 'java.net.ConnectException',
            exceptionMessage: 'Connection refused',
        })
        expect(diagnose(call, []).hints).toEqual([
            'pg:9000 서버가 떠 있는지, 주소와 포트가 맞는지 확인해 보세요',
        ])
    })

    it('외부 5xx', () => {
        expect(
            diagnose(makeOutbound(null, { targetHost: 'ai:8000', statusCode: 500 }), [])
                .hints,
        ).toEqual(['ai:8000 서버 로그에서 같은 시각의 오류를 확인해 보세요'])
    })

    it.each([
        [401, '인증 토큰이나 권한 설정이 맞는지 확인해 보세요'],
        [403, '인증 토큰이나 권한 설정이 맞는지 확인해 보세요'],
        [404, '요청 경로와 HTTP 메서드가 맞는지 확인해 보세요'],
        [400, '요청 바디와 파라미터 값이 검증 조건에 맞는지 확인해 보세요'],
    ])('%s', (statusCode, hint) => {
        expect(diagnose(makeRow({ statusCode }), []).hints).toEqual([hint])
    })

    it('DB 제약 조건', () => {
        expect(
            diagnose(
                makeRow({
                    statusCode: 500,
                    exceptionClass:
                        'org.springframework.dao.DataIntegrityViolationException',
                }),
                [],
            ).hints,
        ).toEqual([
            '중복 키나 NOT NULL 같은 DB 제약 조건에 걸리지 않았는지 확인해 보세요',
        ])
    })

    it('해당 없으면 빈 목록', () => {
        expect(diagnose(makeRow({ statusCode: 200 }), []).hints).toEqual([])
        expect(
            diagnose(makeRow({ statusCode: 500, exceptionClass: 'a.Boom' }), [])
                .hints,
        ).toEqual([])
    })
})

describe('결과 박스 (F7)', () => {
    it.each([
        [
            '처리된 예외',
            makeRow({ statusCode: 400, exceptionClass: 'a.X' }),
            { tone: 'warning', label: '예외 발생 · 앱이 400 응답으로 처리함' },
        ],
        [
            '외부 호출 예외',
            makeOutbound(null, { statusCode: null, exceptionClass: 'a.X' }),
            { tone: 'danger', label: '보낸 요청 실패' },
        ],
        [
            '서버 예외',
            makeRow({ statusCode: 500, exceptionClass: 'a.X' }),
            { tone: 'danger', label: '예외 발생 · 서버 오류' },
        ],
        ['응답 없음', makeRow({ statusCode: null }), { tone: 'danger', label: '응답 없음' }],
        [
            '예외 없는 5xx',
            makeRow({ statusCode: 503 }),
            { tone: 'danger', label: '서버 오류 503 · 예외 정보 없음' },
        ],
        [
            '예외 없는 4xx',
            makeRow({ statusCode: 401 }),
            {
                tone: 'warning',
                label: '요청 거부 401 · 예외 정보 없음 (인증 필터 등 컨트롤러 이전 단계 응답)',
            },
        ],
        ['정상', makeRow({ statusCode: 200 }), { tone: 'success', label: '✓ 정상 처리' }],
    ])('%s', (_name, row, expected) => {
        expect(getResultBox(row)).toEqual(expected)
    })
})

describe('확인 가이드 추가 규칙 (F2a)', () => {
    const hints = (overrides: Parameters<typeof makeRow>[0]) => diagnose(makeRow(overrides), []).hints
    const DB_POOL = 'DB 커넥션 풀이 모자라지 않은지(최대 커넥션 수, 오래 걸리는 쿼리) 확인해 보세요'

    it.each([
        ['org.springframework.jdbc.CannotGetJdbcConnectionException', 'Failed to obtain JDBC Connection'],
        ['java.sql.SQLTransientConnectionException', 'HikariPool-1 - Connection is not available, request timed out after 30000ms'],
    ])('DB 커넥션 부족: %s (메시지에 timed out 이 있어도 타임아웃 규칙보다 먼저)', (exceptionClass, exceptionMessage) => {
        expect(hints({ statusCode: 500, exceptionClass, exceptionMessage })).toEqual([DB_POOL])
    })

    it('SSL 인증서', () => {
        const call = makeOutbound(null, {
            targetHost: 'pg:9443',
            statusCode: null,
            exceptionClass: 'javax.net.ssl.SSLHandshakeException',
            exceptionMessage: 'PKIX path building failed',
        })
        expect(diagnose(call, []).hints).toEqual([
            'pg:9443 서버 인증서가 유효한지, 우리 서버가 신뢰하는 인증서인지 확인해 보세요',
        ])
    })

    it.each([
        [{ statusCode: 500, exceptionClass: 'org.springframework.orm.ObjectOptimisticLockingFailureException' }],
        [{ statusCode: 409 }],
    ])('동시 수정 충돌 %#', (overrides) => {
        expect(hints(overrides)).toEqual(['같은 데이터를 동시에 고친 다른 요청이 없는지 확인해 보세요'])
    })

    it('NullPointerException', () => {
        expect(hints({ statusCode: 500, exceptionClass: 'java.lang.NullPointerException' })).toEqual([
            '스택트레이스에서 강조된 앱 코드 줄을 보고, 비어 있을 수 있는 값을 확인해 보세요',
        ])
    })

    it.each([
        'jakarta.persistence.EntityNotFoundException',
        'java.util.NoSuchElementException',
        'org.springframework.dao.EmptyResultDataAccessException',
    ])('데이터 없음: %s (404 로 처리돼도 경로 규칙보다 먼저)', (exceptionClass) => {
        expect(hints({ statusCode: 404, exceptionClass })).toEqual([
            '찾으려는 데이터가 실제로 있는지(id 값) 확인해 보세요',
        ])
    })

    it.each(['java.lang.OutOfMemoryError', 'java.lang.StackOverflowError'])('%s', (exceptionClass) => {
        expect(hints({ statusCode: 500, exceptionClass })).toEqual([
            '메모리 사용량이나 끝없이 도는 재귀 호출이 없는지 확인해 보세요',
        ])
    })

    it('JSON 읽기 실패는 검증 실패와 다른 문장', () => {
        expect(
            hints({
                statusCode: 400,
                exceptionClass: 'org.springframework.http.converter.HttpMessageNotReadableException',
            }),
        ).toEqual(['요청 바디가 올바른 JSON 형식인지, 필드 타입이 맞는지 확인해 보세요'])
    })

    it('AccessDeniedException 은 500 이어도 권한 문장', () => {
        expect(
            hints({ statusCode: 500, exceptionClass: 'org.springframework.security.access.AccessDeniedException' }),
        ).toEqual(['인증 토큰이나 권한 설정이 맞는지 확인해 보세요'])
    })

    it.each([
        [{ statusCode: 405 }, '이 경로가 받는 HTTP 메서드(GET, POST 등)가 맞는지 확인해 보세요'],
        [
            { statusCode: 500, exceptionClass: 'org.springframework.web.HttpRequestMethodNotSupportedException' },
            '이 경로가 받는 HTTP 메서드(GET, POST 등)가 맞는지 확인해 보세요',
        ],
        [{ statusCode: 415 }, '요청의 Content-Type 헤더가 이 API가 받는 형식인지 확인해 보세요'],
        [
            { statusCode: 413, exceptionClass: 'org.springframework.web.multipart.MaxUploadSizeExceededException' },
            '업로드 크기 제한(max-file-size 등)을 넘지 않았는지 확인해 보세요',
        ],
        [{ statusCode: 429 }, '호출 횟수 제한(rate limit)에 걸리지 않았는지 확인해 보세요'],
    ])('상태 코드 %#', (overrides, hint) => {
        expect(hints(overrides)).toEqual([hint])
    })

    it('보낸 요청의 429 는 대상 서버의 제한', () => {
        const call = makeOutbound(null, { targetHost: 'api.partner.com', statusCode: 429 })
        expect(diagnose(call, []).hints).toEqual([
            'api.partner.com 서버의 호출 횟수 제한(rate limit)에 걸리지 않았는지 확인해 보세요',
        ])
    })
})
