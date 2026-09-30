import { useMemo } from 'react'

import Badge from '../../../design-system/atoms/Badge'
import Card from '../../../design-system/atoms/Card'
import EmptyState from '../../../design-system/atoms/EmptyState'
import KeyValueList, { type IKeyValueItem } from '../../../design-system/atoms/KeyValueList'
import Notice from '../../../design-system/atoms/Notice'
import NumberedList from '../../../design-system/atoms/NumberedList'
import SectionHeader from '../../../design-system/atoms/SectionHeader'
import CopyField from '../../../design-system/molecules/CopyField'
import type { ILogDetail } from '../../../types/log'
import { diagnose, getResultBox } from '../../../utils/logs/diagnosis'
import { formatDetailTime, formatDuration } from '../../../utils/logs/format'
import {
    getDurationTone,
    getStatusCategory,
    getStatusText,
    getStatusTone,
    shortClassName,
} from '../../../utils/logs/status'
import { LogPath, MockTag } from '../LogParts'

import CallFlow from './CallFlow'
import ExceptionBox from './ExceptionBox'
import HttpMessages from './HttpMessages'
import styles from './LogDetail.module.css'
import RelatedList from './RelatedList'

export interface ILogDetailProps {
    /** undefined = 아직 없음(불러오는 중), null = 없는 id */
    detail: ILogDetail | null | undefined
    isLoading: boolean
    onNavigate: (id: number) => void
    /** 복사 동작 (기본: 클립보드) */
    onCopy?: (value: string) => void
}

const valueTone = (tone: string): IKeyValueItem['tone'] =>
    tone === 'danger' || tone === 'warning' ? tone : 'default'

function kindLabel(detail: ILogDetail): string {
    if (detail.kind === 'OUTBOUND') {
        return detail.parentRequestId ? '보낸 요청' : '보낸 요청 (백그라운드)'
    }
    return detail.isAsync ? '받은 요청 · 비동기/SSE' : '받은 요청'
}

function metaItems(detail: ILogDetail, onCopy?: (value: string) => void): IKeyValueItem[] {
    const isOutbound = detail.kind === 'OUTBOUND'
    const copy = (value: string | null, label: string) =>
        value ? <CopyField value={value} copyLabel={`${label} 복사`} onCopy={onCopy} /> : '-'
    return [
        {
            key: 'status',
            label: '상태',
            value: getStatusText(detail.statusCode),
            tone: valueTone(getStatusTone(detail.statusCode)),
        },
        { key: 'kind', label: '방향', value: kindLabel(detail) },
        {
            key: 'service',
            label: '서비스',
            value: (
                <>
                    {detail.serviceName}
                    {detail.instanceId ? <span className={styles.muted}> @ {detail.instanceId}</span> : null}
                </>
            ),
        },
        { key: 'time', label: '시각', value: formatDetailTime(detail.createdAt) },
        {
            key: 'duration',
            label: '걸린 시간',
            value: formatDuration(detail.durationMs),
            tone: valueTone(getDurationTone(detail.durationMs)),
        },
        ...(detail.exceptionClass
            ? [{ key: 'exception', label: '예외', value: shortClassName(detail.exceptionClass) }]
            : []),
        isOutbound
            ? { key: 'id', label: '보낸 요청 ID', value: copy(detail.requestId, '보낸 요청 ID') }
            : { key: 'id', label: 'requestId', value: copy(detail.requestId, 'requestId') },
        isOutbound
            ? {
                  key: 'parent',
                  label: '부모 requestId',
                  value: copy(detail.parentRequestId, '부모 requestId'),
              }
            : { key: 'ip', label: '클라이언트 IP', value: detail.clientIp ?? '-' },
    ]
}

/** 요청 상세: 원인 → 확인 가이드 → 요약 표 → 예외 → 호출 흐름 → 연관 → 요청/응답 */
function LogDetail({ detail, isLoading, onNavigate, onCopy }: ILogDetailProps) {
    const diagnosis = useMemo(
        () => (detail ? diagnose(detail, detail.related.children) : null),
        [detail],
    )
    if (detail === undefined || isLoading) {
        return <EmptyState>불러오는 중이에요…</EmptyState>
    }
    if (detail === null || diagnosis === null) {
        return <EmptyState>이 요청을 찾을 수 없어요. 삭제되었을 수 있어요.</EmptyState>
    }

    const tone = getStatusTone(detail.statusCode)
    const result = getResultBox(detail)
    const { parent, children, sameRequestId } = detail.related
    const flowRoot = detail.kind === 'OUTBOUND' ? parent : detail
    const flowCalls = detail.kind === 'OUTBOUND' ? [detail] : children

    return (
        <div className={styles.detail}>
            <Card label="진단">
                <div className={styles.stack}>
                    <div className={styles.pillRow}>
                        <Badge tone={tone} size="md">
                            {detail.statusCode === null
                                ? '응답 없음'
                                : `${detail.statusCode} · ${getStatusCategory(detail.statusCode)}`}
                        </Badge>
                        {detail.isMock ? <MockTag /> : null}
                    </div>
                    <h2 className={styles.headline}>{diagnosis.headline}</h2>
                    <p className={styles.request}>
                        <span className={styles.method}>{detail.method}</span>
                        <LogPath row={{ ...detail, isMock: false }} isWrapping />
                    </p>
                    {detail.isMock ? (
                        <Notice tone="warning" variant="dashed">
                            개발 모드에서 넣은 <b>Mock 데이터</b>입니다. 실제 요청이 아닙니다.
                        </Notice>
                    ) : null}
                    {diagnosis.hints.length > 0 ? (
                        <Card tone="muted" padding="md">
                            <div className={styles.stack}>
                                <SectionHeader title="이렇게 확인해 보세요" level={3} size="sm" />
                                <NumberedList items={diagnosis.hints} />
                            </div>
                        </Card>
                    ) : null}
                </div>
            </Card>

            <Card label="요약">
                <div className={styles.stack}>
                    <KeyValueList items={metaItems(detail, onCopy)} />
                    {detail.exceptionClass ? (
                        <ExceptionBox detail={detail} />
                    ) : (
                        <Notice tone={result.tone} variant={result.tone === 'success' ? 'soft' : 'outline'}>
                            {result.label}
                        </Notice>
                    )}
                </div>
            </Card>

            {flowRoot && flowCalls.length > 0 ? (
                <Card label="호출 흐름">
                    <CallFlow root={flowRoot} calls={flowCalls} currentId={detail.id} onNavigate={onNavigate} />
                </Card>
            ) : null}

            {sameRequestId.length > 0 ? (
                <Card label="연관 요청">
                    <RelatedList
                        title="같은 requestId의 다른 서비스 요청"
                        rows={sameRequestId}
                        onNavigate={onNavigate}
                    />
                </Card>
            ) : null}

            <Card label="요청과 응답">
                <HttpMessages key={detail.id} detail={detail} />
            </Card>
        </div>
    )
}

export default LogDetail
