import type { ILogRow } from '../../types/log'

import { isSuccessRow } from './status'

/** 최상위 행과, 불러온 행 중에서 찾은 그 요청의 외부 호출 */
export interface ILogNode {
    row: ILogRow
    children: ILogRow[]
}

export type TListItem =
    | { type: 'node'; key: string; node: ILogNode }
    | {
          type: 'group'
          key: string
          nodes: ILogNode[]
          /** 중복 없는 경로 (등장 순) */
          paths: string[]
          /** 가장 오래된 시각 */
          from: number
          /** 가장 최신 시각 */
          to: number
      }

/** 부모 요청을 찾는 키. requestId 는 서비스 간에 전파될 수 있어 서비스 이름과 같이 쓴다 */
export const parentKey = (serviceName: string, requestId: string) =>
    `${serviceName}\u0000${requestId}`

/**
 * 외부 호출을 부모 요청 아래로 모은다. 같은 requestId 가 다른 서비스에도 있을 수 있으므로
 * (전파된 requestId) 서비스 이름까지 같아야 부모로 본다.
 * 최상위 순서는 입력(최신순)을 따르고, 자식은 시간순으로 둔다.
 */
export function buildLogTree(rows: ILogRow[]): ILogNode[] {
    const parents = new Map<string, ILogNode>()
    const nodes: ILogNode[] = rows.map((row) => ({ row, children: [] }))
    for (const node of nodes) {
        const { row } = node
        if (row.kind === 'INBOUND' && row.requestId) {
            parents.set(parentKey(row.serviceName, row.requestId), node)
        }
    }

    const topLevel: ILogNode[] = []
    for (const node of nodes) {
        const { row } = node
        const parent =
            row.kind === 'OUTBOUND' && row.parentRequestId
                ? parents.get(parentKey(row.serviceName, row.parentRequestId))
                : undefined
        if (parent) parent.children.push(row)
        else topLevel.push(node)
    }
    for (const node of topLevel) {
        node.children.sort((a, b) => a.createdAt - b.createdAt || a.id - b.id)
    }
    return topLevel
}

const isSuccessNode = (node: ILogNode) =>
    isSuccessRow(node.row) && node.children.every(isSuccessRow)

function toGroup(run: ILogNode[]): TListItem {
    const oldest = run[run.length - 1]
    return {
        type: 'group',
        // 폴링으로 위에 새 행이 붙어도 key 가 유지되도록 가장 오래된 행 기준
        key: `group-${oldest.row.id}`,
        nodes: run,
        paths: [...new Set(run.map((n) => n.row.path))],
        from: oldest.row.createdAt,
        to: run[0].row.createdAt,
    }
}

/**
 * 표에 그릴 항목 목록. 묶기가 켜져 있으면 연속 정상 항목 2개 이상을 묶는다.
 * (시간 공백 줄과 공백으로 묶음을 끊던 동작은 2026-09-30 제거 — spec C4)
 */
export function buildListItems(
    nodes: ILogNode[],
    { isGroupingSuccess }: { isGroupingSuccess: boolean },
): TListItem[] {
    const items: TListItem[] = []
    let run: ILogNode[] = []

    const flush = () => {
        if (run.length >= 2) items.push(toGroup(run))
        else for (const node of run) items.push(nodeItem(node))
        run = []
    }

    nodes.forEach((node) => {
        if (isGroupingSuccess && isSuccessNode(node)) {
            run.push(node)
            return
        }
        flush()
        items.push(nodeItem(node))
    })
    flush()
    return items
}

const nodeItem = (node: ILogNode): TListItem => ({
    type: 'node',
    key: `row-${node.row.id}`,
    node,
})
