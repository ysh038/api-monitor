import Badge from '../../../design-system/atoms/Badge'
import type { ILogRow } from '../../../types/log'
import {
    getExceptionTone,
    getStatusLabel,
    getStatusTone,
    shortClassName,
} from '../../../utils/logs/status'

import styles from './LogParts.module.css'

/** 상태 글자: 5xx·응답 없음 빨강, 4xx 주황, 3xx 파랑, 2xx 흐린 회색 (참고 이미지) */
export function StatusText({ code }: { code: number | null }) {
    const tone = getStatusTone(code)
    return (
        <Badge
            appearance="text"
            tone={tone === 'success' ? 'neutral' : tone}
            title={code === null ? '응답 없음 (연결 실패·타임아웃)' : undefined}
        >
            {getStatusLabel(code)}
        </Badge>
    )
}

export function MockTag() {
    return (
        <Badge appearance="dashed" tone="warning" size="sm" title="개발 모드에서 넣은 Mock 데이터입니다">
            MOCK
        </Badge>
    )
}

const RECOVERED_TITLE =
    '같은 사용자(IP)가 30초 안에 같은 요청을 다시 보내 성공했어요. 토큰 만료 후 재발급 같은 정상 흐름일 가능성이 높아요.'

/** 재시도로 회복된 401 표시 (dashboard-recovered-401 A5). 좁은 화면에서는 "재시도" 로 줄인다 */
export function RecoveredTag() {
    return (
        <span className={styles.isCollapsible} title={RECOVERED_TITLE}>
            <span className={styles.exceptionLong}>
                <Badge appearance="outline" tone="neutral" size="sm">
                    재시도 성공
                </Badge>
            </span>
            <span className={styles.exceptionShort}>
                <Badge appearance="outline" tone="neutral" size="sm">
                    재시도
                </Badge>
            </span>
        </span>
    )
}

/** 예외 이름. isCollapsible 이면 좁은 화면에서 "예외" 로 줄인다 */
export function ExceptionTag({ row, isCollapsible = false }: { row: ILogRow; isCollapsible?: boolean }) {
    if (!row.exceptionClass) return null
    const tone = getExceptionTone(row) === 'warning' ? styles.warning : styles.danger
    const title = `${row.exceptionClass}: ${row.exceptionMessage ?? ''}`
    return (
        <span className={isCollapsible ? styles.isCollapsible : undefined}>
            <span className={`${styles.exception} ${styles.exceptionLong} ${tone}`} title={title}>
                {shortClassName(row.exceptionClass)}
            </span>
            <span className={`${styles.exception} ${styles.exceptionShort} ${tone}`} title={title}>
                예외
            </span>
        </span>
    )
}

export interface ILogPathProps {
    row: ILogRow
    /** 부모 요청 아래 트리로 붙은 외부 호출 (└ 표시) */
    isNested?: boolean
    /** 자식 외부 호출이 화면에 안 보일 때 "보낸 요청 N" 태그 */
    isChildCountShown?: boolean
    /** 들어온 요청 앞에 [서비스] (연관 목록) */
    isServiceShown?: boolean
    /** 긴 경로를 줄바꿈 (상세 제목) */
    isWrapping?: boolean
}

/** 경로 칸: MOCK · (└) → host path · 백그라운드 / 외부 호출 N */
export function LogPath({
    row,
    isNested = false,
    isChildCountShown = false,
    isServiceShown = false,
    isWrapping = false,
}: ILogPathProps) {
    const isOutbound = row.kind === 'OUTBOUND'
    return (
        <span className={`${styles.path} ${isWrapping ? styles.isWrapping : ''}`}>
            {row.isMock ? <MockTag /> : null}
            {isNested ? (
                <span className={styles.nest} aria-hidden="true">
                    └
                </span>
            ) : null}
            <span className={styles.pathText}>
                {isOutbound ? (
                    <>
                        <span className={styles.arrow} title="보낸 요청">
                            →
                        </span>{' '}
                        <span className={styles.host}>{row.targetHost ?? ''}</span>
                    </>
                ) : null}
                {!isOutbound && isServiceShown ? (
                    <span className={styles.service}>[{row.serviceName}] </span>
                ) : null}
                {row.path}
            </span>
            {isOutbound && !row.parentRequestId ? (
                <Badge
                    appearance="outline"
                    tone="neutral"
                    size="sm"
                    title="HTTP 요청 처리 밖(스케줄러·MQ·별도 스레드)에서 나간 호출"
                >
                    백그라운드
                </Badge>
            ) : null}
            {!isOutbound && isChildCountShown && row.childCount > 0 ? (
                <Badge appearance="soft" tone="info" size="sm">
                    보낸 요청 {row.childCount}
                </Badge>
            ) : null}
        </span>
    )
}
