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
