import { describe, expect, it } from 'vitest'

import { makeOutbound, makeRow, makeScenario } from '../../mocks/logFixtures'

import {
    getSummaryDescription,
    type IRequestSummary,
    summarizeHosts,
    summarizeRequests,
    SUMMARY_TITLE,
} from './summary'

describe('summarizeRequests (D1)', () => {
    it('참고 이미지 시나리오: 14건 중 5건 실패, 4건이 외부 호출 관련, 4xx 3건', () => {
        expect(summarizeRequests(makeScenario())).toEqual({
            total: 14,
            failed: 5,
            rejected: 3,
            outboundRelated: 4,
        })
    })

    it('4xx 는 실패가 아니라 거부로 센다', () => {
        expect(
            summarizeRequests([makeRow({ statusCode: 200 }), makeRow({ statusCode: 401 })]),
        ).toEqual({ total: 2, failed: 0, rejected: 1, outboundRelated: 0 })
    })

    it('실패한 자식이 있어도 부모가 성공이면 관련 실패로 세지 않는다', () => {
        const parent = makeRow({ statusCode: 200 })
        const call = makeOutbound(parent, { statusCode: 503 })
        expect(summarizeRequests([call, parent])).toEqual({
            total: 2,
            failed: 1,
            rejected: 0,
            outboundRelated: 1,
        })
    })
})

describe('문구 (D3·D3a·D3b) — 건수는 쓰지 않는다', () => {
    const summary = (overrides: Partial<IRequestSummary>): IRequestSummary => ({
        total: 10,
        failed: 0,
        rejected: 0,
        outboundRelated: 0,
        ...overrides,
    })

    it('D3: 제목은 건수와 관계없이 고정', () => {
        expect(SUMMARY_TITLE).toBe('요청 흐름을 살펴봐요')
    })

    it('실패 + 외부 호출 관련', () => {
        expect(getSummaryDescription(summary({ total: 4000, failed: 2000, outboundRelated: 8 }))).toBe(
            '실패한 요청이 있어요. 외부 서버 호출 때문인 것도 있어서 아래 서버를 눌러 좁혀 볼 수 있어요.',
        )
    })

    it('외부 호출과 무관한 실패만', () => {
        expect(getSummaryDescription(summary({ failed: 2 }))).toBe(
            '실패한 요청이 있어요. 누르면 원인을 볼 수 있어요.',
        )
    })

    it('4xx 만 (로그인 실패 401 등)', () => {
        expect(getSummaryDescription(summary({ rejected: 1 }))).toBe(
            '서버 오류는 없고, 4xx로 거부된 요청이 있어요.',
        )
    })

    it('모두 정상', () => {
        expect(getSummaryDescription(summary({}))).toBe('모두 정상 처리했어요.')
    })

    it('0건이면 필터 여부에 따라 다른 문구', () => {
        const empty = summary({ total: 0 })
        expect(getSummaryDescription(empty)).toBe('아직 받은 요청이 없어요.')
        expect(getSummaryDescription(empty, { hasFilter: true })).toBe('조건에 맞는 요청이 없어요.')
    })

    it('D3b: 실패와 4xx 가 함께 있으면 4xx 도 알린다', () => {
        expect(getSummaryDescription(summary({ failed: 5, rejected: 3, outboundRelated: 4 }))).toBe(
            '실패한 요청이 있어요. 외부 서버 호출 때문인 것도 있어서 아래 서버를 눌러 좁혀 볼 수 있어요. 4xx로 거부된 요청도 있어요.',
        )
    })

    it('설명에 건수가 들어가지 않는다 (4xx 같은 상태 범주 표기는 제외)', () => {
        const cases = [
            summary({ total: 1234, failed: 567, rejected: 89, outboundRelated: 12 }),
            summary({ total: 1234, rejected: 89 }),
            summary({ total: 1234 }),
        ]
        for (const c of cases) {
            expect(getSummaryDescription(c).replace(/\b[1-5]xx\b/g, '')).not.toMatch(/\d/)
        }
    })
})

describe('summarizeHosts (D2)', () => {
    it('실패가 있는 호스트만, 실패·전체 많은 순', () => {
        const hosts = summarizeHosts(makeScenario())
        expect(hosts).toEqual([
            {
                host: 'ai-server:8000',
                total: 2,
                failed: 1,
                label: '2건 중 1건 실패했어요',
            },
            {
                host: 'pg-gateway:9000',
                total: 1,
                failed: 1,
                label: '1건 모두 실패했어요',
            },
        ])
    })

    it('실패가 없으면 빈 목록', () => {
        expect(summarizeHosts([makeOutbound(null)])).toEqual([])
    })
})
