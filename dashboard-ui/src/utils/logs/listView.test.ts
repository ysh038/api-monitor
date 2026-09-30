import { describe, expect, it } from 'vitest'

import {
    BASE_TIME,
    makeOutbound,
    makeRow,
    makeScenario,
} from '../../mocks/logFixtures'

import { buildListItems, buildLogTree } from './listView'

const MIN = 60_000

describe('buildLogTree (C1)', () => {
    it('부모가 불러온 행에 있으면 외부 호출을 부모 아래 붙인다', () => {
        const parent = makeRow({ childCount: 2 })
        const later = makeOutbound(parent, { createdAt: BASE_TIME + 200 })
        const earlier = makeOutbound(parent, { createdAt: BASE_TIME + 100 })
        const tree = buildLogTree([later, earlier, parent])

        expect(tree).toHaveLength(1)
        expect(tree[0].row.id).toBe(parent.id)
        // 자식은 시간순
        expect(tree[0].children.map((c) => c.id)).toEqual([
            earlier.id,
            later.id,
        ])
    })

    it('부모가 없으면 외부 호출은 최상위에 남는다', () => {
        const orphan = makeOutbound(null)
        const inbound = makeRow()
        const tree = buildLogTree([orphan, inbound])
        expect(tree.map((n) => n.row.id)).toEqual([orphan.id, inbound.id])
    })

    it('같은 requestId 라도 다른 서비스의 요청에는 붙이지 않는다', () => {
        const parent = makeRow({ serviceName: 'order-api', requestId: 'r-1' })
        const otherService = makeRow({
            serviceName: 'pay-api',
            requestId: 'r-1',
        })
        const call = makeOutbound(parent)
        const tree = buildLogTree([call, otherService, parent])
        const payNode = tree.find((n) => n.row.id === otherService.id)
        const orderNode = tree.find((n) => n.row.id === parent.id)
        expect(payNode?.children).toEqual([])
        expect(orderNode?.children.map((c) => c.id)).toEqual([call.id])
    })
})

describe('buildListItems (C2~C4)', () => {
    const ok = (offsetMs: number, path = '/ok') =>
        makeRow({ path, createdAt: BASE_TIME + offsetMs })

    it('C2: 연속된 정상 최상위 항목 2개 이상을 묶는다', () => {
        const a = ok(3000, '/a')
        const b = ok(2000, '/b')
        const c = ok(1000, '/a')
        const fail = makeRow({ statusCode: 500, createdAt: BASE_TIME })
        const items = buildListItems(buildLogTree([a, b, c, fail]), {
            isGroupingSuccess: true,
        })

        expect(items.map((i) => i.type)).toEqual(['group', 'node'])
        const group = items[0]
        if (group.type !== 'group') throw new Error('group 이어야 한다')
        expect(group.nodes).toHaveLength(3)
        expect(group.paths).toEqual(['/a', '/b'])
        expect(group.from).toBe(c.createdAt)
        expect(group.to).toBe(a.createdAt)
    })

    it('C2: 정상 항목이 하나뿐이면 묶지 않는다', () => {
        const items = buildListItems(
            buildLogTree([
                makeRow({ statusCode: 500, createdAt: BASE_TIME + 2000 }),
                ok(1000),
                makeRow({ statusCode: 404, createdAt: BASE_TIME }),
            ]),
            { isGroupingSuccess: true },
        )
        expect(items.map((i) => i.type)).toEqual(['node', 'node', 'node'])
    })

    it('C2: 자식 외부 호출이 실패한 요청은 정상으로 보지 않는다', () => {
        const parent = makeRow({ createdAt: BASE_TIME + 1000 })
        const call = makeOutbound(parent, { statusCode: 500 })
        const items = buildListItems(
            buildLogTree([call, parent, ok(0)]),
            { isGroupingSuccess: true },
        )
        expect(items.map((i) => i.type)).toEqual(['node', 'node'])
    })

    it('C3: 묶기가 꺼져 있으면 묶음이 없다', () => {
        const items = buildListItems(buildLogTree([ok(2000), ok(1000)]), {
            isGroupingSuccess: false,
        })
        expect(items.every((i) => i.type === 'node')).toBe(true)
    })

    it('C4 제거: 시간이 멀리 떨어져도 공백 항목을 넣지 않는다', () => {
        const newer = makeRow({ statusCode: 500, createdAt: BASE_TIME })
        const older = makeRow({ statusCode: 500, createdAt: BASE_TIME - 27 * MIN })
        const items = buildListItems(buildLogTree([newer, older]), { isGroupingSuccess: true })
        expect(items.map((i) => i.type)).toEqual(['node', 'node'])
    })

    it('C4 제거: 멀리 떨어진 정상 요청도 이어져 있으면 한 묶음이다', () => {
        const items = buildListItems(
            buildLogTree([ok(0), ok(-10 * MIN), ok(-10 * MIN - 1000)]),
            { isGroupingSuccess: true },
        )
        expect(items.map((i) => i.type)).toEqual(['group'])
    })

    it('참고 이미지 시나리오', () => {
        const items = buildListItems(buildLogTree(makeScenario()), {
            isGroupingSuccess: true,
        })
        expect(items.map((i) => i.type)).toEqual([
            'group', // 정상 2건
            'node', // payments/7781 (+ pg-gateway)
            'node', // predict (+ ai-server)
            'node', // risk-scores (+ ai-server) — 혼자라 안 묶임
            'node', // orders 500
            'node', // 404
            'node', // 400
            'node', // 401
            'group', // 20분 전 정상 2건 — 공백 줄 없이 바로 이어진다
        ])
    })

    it('항목 key 는 서로 다르다', () => {
        const items = buildListItems(buildLogTree(makeScenario()), {
            isGroupingSuccess: true,
        })
        const keys = items.map((i) => i.key)
        expect(new Set(keys).size).toBe(keys.length)
    })
})
