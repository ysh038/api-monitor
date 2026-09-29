import { describe, expect, it } from 'vitest'

import { makeOutbound, makeRow, makeScenario } from '../../mocks/logFixtures'

import {
    getSummaryDescription,
    getSummaryHeadline,
    summarizeHosts,
    summarizeRequests,
} from './summary'

describe('summarizeRequests (D1)', () => {
    it('참고 이미지 시나리오: 14건 중 5건 실패, 4건이 외부 호출 관련', () => {
        expect(summarizeRequests(makeScenario())).toEqual({
            total: 14,
            failed: 5,
            outboundRelated: 4,
        })
    })

    it('실패한 자식이 있어도 부모가 성공이면 관련 실패로 세지 않는다', () => {
        const parent = makeRow({ statusCode: 200 })
        const call = makeOutbound(parent, { statusCode: 503 })
        expect(summarizeRequests([call, parent])).toEqual({
            total: 2,
            failed: 1,
            outboundRelated: 1,
        })
    })
})

describe('문구', () => {
    it('실패가 있으면 N건 중 M건이 실패했어요', () => {
        const summary = { total: 38, failed: 10, outboundRelated: 8 }
        expect(getSummaryHeadline(summary)).toBe('요청 38건 중 10건이 실패했어요')
        expect(getSummaryDescription(summary)).toBe(
            '실패한 10건 중 8건은 외부 서버 호출과 관련 있어요. 서버를 눌러 좁혀 볼 수 있어요.',
        )
    })

    it('D3: 실패가 없으면 모두 정상 처리했어요', () => {
        const summary = { total: 12, failed: 0, outboundRelated: 0 }
        expect(getSummaryHeadline(summary)).toBe(
            '요청 12건 모두 정상 처리했어요',
        )
        expect(getSummaryDescription(summary)).toBeNull()
    })

    it('외부 호출과 무관한 실패만 있으면 행을 눌러 보라고 안내한다', () => {
        expect(
            getSummaryDescription({ total: 5, failed: 2, outboundRelated: 0 }),
        ).toBe('실패한 요청을 누르면 원인을 볼 수 있어요.')
    })

    it('실패 전부가 외부 호출 관련이면 모두라고 쓴다', () => {
        expect(
            getSummaryDescription({ total: 5, failed: 2, outboundRelated: 2 }),
        ).toBe(
            '실패한 2건 모두 외부 서버 호출과 관련 있어요. 서버를 눌러 좁혀 볼 수 있어요.',
        )
    })

    it('행이 없으면 필터 여부에 따라 다른 문구', () => {
        const empty = { total: 0, failed: 0, outboundRelated: 0 }
        expect(getSummaryHeadline(empty)).toBe('아직 받은 요청이 없어요')
        expect(getSummaryHeadline(empty, { hasFilter: true })).toBe(
            '조건에 맞는 요청이 없어요',
        )
    })

    it('천 단위 구분 기호', () => {
        expect(
            getSummaryHeadline({ total: 1234, failed: 0, outboundRelated: 0 }),
        ).toBe('요청 1,234건 모두 정상 처리했어요')
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
