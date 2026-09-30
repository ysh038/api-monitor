import { describe, expect, it } from 'vitest'

import { EMPTY_FILTERS } from '../utils/logs/filterState'

import {
    buildLogDetailUrl,
    buildLogsUrl,
    DEV_MOCK_URL,
    HEALTH_URL,
    SERVICES_URL,
} from './endpoints'

describe('상대경로 (A1)', () => {
    it('모든 API 경로는 / 로 시작하지 않는다', () => {
        const urls = [
            buildLogsUrl(EMPTY_FILTERS, { limit: 100 }),
            buildLogDetailUrl(12),
            SERVICES_URL,
            HEALTH_URL,
            DEV_MOCK_URL,
        ]
        for (const url of urls) {
            expect(url.startsWith('/')).toBe(false)
            expect(url.startsWith('api/')).toBe(true)
        }
        expect(buildLogDetailUrl(12)).toBe('api/logs/12')
    })
})

describe('쿼리스트링 (A2)', () => {
    it('빈 값은 빼고 필터 → 커서 순서로 넣는다', () => {
        expect(buildLogsUrl(EMPTY_FILTERS, { limit: 100 })).toBe(
            'api/logs?limit=100',
        )
        expect(
            buildLogsUrl(
                {
                    host: 'pg:9000',
                    kind: 'OUTBOUND',
                    statuses: ['5xx', 'none'],
                    q: 'a b',
                },
                { afterId: 7, limit: 500 },
            ),
        ).toBe(
            'api/logs?host=pg%3A9000&kind=OUTBOUND&status=5xx%2Cnone&q=a+b&afterId=7&limit=500',
        )
    })

    it('beforeId', () => {
        expect(buildLogsUrl(EMPTY_FILTERS, { beforeId: 3, limit: 100 })).toBe(
            'api/logs?beforeId=3&limit=100',
        )
    })
})
