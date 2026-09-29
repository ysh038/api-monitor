import Badge from '../../../design-system/atoms/Badge'
import Button from '../../../design-system/atoms/Button'
import Switch from '../../../design-system/atoms/Switch'
import { formatTime } from '../../../utils/logs/format'

import styles from './TopBar.module.css'

export interface ITopBarProps {
    /** api/health 의 dev === true (Node 개발 서버) */
    isDev: boolean
    isAutoRefresh: boolean
    /** 마지막으로 목록을 받은 시각 (epoch ms) */
    lastUpdatedAt: number | null
    /** Mock 추가·삭제 결과 (2.5초 표시) */
    devMessage: string | null
    isMockPending: boolean
    onToggleAutoRefresh: (isOn: boolean) => void
    onInsertMock: () => void
    onDeleteMock: () => void
}

function TopBar({
    isDev,
    isAutoRefresh,
    lastUpdatedAt,
    devMessage,
    isMockPending,
    onToggleAutoRefresh,
    onInsertMock,
    onDeleteMock,
}: ITopBarProps) {
    return (
        <header className={styles.bar}>
            <div className={styles.brand}>
                <span
                    className={`${styles.dot} ${isAutoRefresh ? '' : styles.isPaused}`}
                    title={isAutoRefresh ? '자동 새로고침 켜짐' : '자동 새로고침 꺼짐'}
                />
                API Monitor
                {isDev ? (
                    <Badge tone="warning" title="npm run dev 로 실행 중입니다. Mock 데이터 기능은 개발 모드에서만 보입니다.">
                        개발 모드 · Mock 데이터
                    </Badge>
                ) : null}
            </div>
            <div className={styles.actions}>
                {lastUpdatedAt !== null ? (
                    <span className={styles.updated}>
                        {formatTime(lastUpdatedAt, lastUpdatedAt, { isWithMs: false })}에
                        새로고침했어요
                    </span>
                ) : null}
                <Switch label="5초마다 새로고침" isChecked={isAutoRefresh} onChange={onToggleAutoRefresh} />
                {isDev ? (
                    <>
                        <span className={styles.divider} aria-hidden="true" />
                        <div className={styles.devActions}>
                            <Button variant="soft" disabled={isMockPending} onClick={onInsertMock}>
                                Mock 데이터 넣기
                            </Button>
                            <Button variant="secondary" disabled={isMockPending} onClick={onDeleteMock}>
                                Mock 데이터 지우기
                            </Button>
                        </div>
                        <span className={styles.devMessage} role="status">
                            {devMessage}
                        </span>
                    </>
                ) : null}
            </div>
        </header>
    )
}

export default TopBar
