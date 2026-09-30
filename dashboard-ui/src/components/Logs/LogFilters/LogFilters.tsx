import SearchField from '../../../design-system/atoms/SearchField'
import SegmentedControl from '../../../design-system/atoms/SegmentedControl'
import ToggleChip from '../../../design-system/atoms/ToggleChip'
import type { ILogFilters, TLogKind, TStatusFilter } from '../../../types/log'

import styles from './LogFilters.module.css'

const KIND_OPTIONS: { value: TLogKind | ''; label: string }[] = [
    { value: '', label: '전체' },
    { value: 'INBOUND', label: '받은 요청' },
    { value: 'OUTBOUND', label: '보낸 요청' },
]

const STATUS_CHIPS: {
    value: TStatusFilter
    label: string
    tone: 'neutral' | 'warning' | 'danger'
    title?: string
}[] = [
    { value: '2xx', label: '2xx', tone: 'neutral' },
    { value: '4xx', label: '4xx', tone: 'warning' },
    { value: '5xx', label: '5xx', tone: 'danger' },
    {
        value: 'none',
        label: '응답 없음',
        tone: 'danger',
        title: '응답을 받지 못한 호출 (연결 실패·타임아웃)',
    },
]

export interface ILogFiltersProps {
    filters: ILogFilters
    /** 디바운스 전 입력값 */
    searchText: string
    onKindChange: (kind: TLogKind | '') => void
    onToggleStatus: (status: TStatusFilter) => void
    onSearchTextChange: (text: string) => void
}

/** 구분 · 상태 칩 · 검색 */
function LogFilters({
    filters,
    searchText,
    onKindChange,
    onToggleStatus,
    onSearchTextChange,
}: ILogFiltersProps) {
    return (
        <div className={styles.filters}>
            <SegmentedControl
                label="요청 구분"
                options={KIND_OPTIONS}
                value={filters.kind}
                onChange={onKindChange}
            />
            <div className={styles.chips} role="group" aria-label="상태">
                {STATUS_CHIPS.map((chip) => (
                    <ToggleChip
                        key={chip.value}
                        appearance="plain"
                        label={chip.label}
                        tone={chip.tone}
                        title={chip.title}
                        isPressed={filters.statuses.includes(chip.value)}
                        onToggle={() => onToggleStatus(chip.value)}
                    />
                ))}
            </div>
            <div className={styles.search}>
                <SearchField
                    label="로그 검색"
                    placeholder="경로, 예외, requestId로 찾기"
                    value={searchText}
                    onChange={onSearchTextChange}
                />
            </div>
        </div>
    )
}

export default LogFilters
