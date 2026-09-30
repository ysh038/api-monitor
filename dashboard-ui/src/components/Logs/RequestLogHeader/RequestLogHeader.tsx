import SectionHeader from '../../../design-system/atoms/SectionHeader'
import Switch from '../../../design-system/atoms/Switch'
import { formatCount } from '../../../utils/logs/format'

import styles from './RequestLogHeader.module.css'

export interface IRequestLogHeaderProps {
    /** 불러온 행 수 */
    visibleCount: number
    /** 선택한 서비스(또는 전체)의 누적 건수. 모르면 null */
    totalCount: number | null
    isGroupingSuccess: boolean
    onGroupingChange: (isOn: boolean) => void
}

/** "요청 기록" 제목 · 건수 · 성공한 요청 묶어 보기 */
function RequestLogHeader({
    visibleCount,
    totalCount,
    isGroupingSuccess,
    onGroupingChange,
}: IRequestLogHeaderProps) {
    const count =
        `${formatCount(visibleCount)}건 보는 중` +
        (totalCount === null ? '' : ` · 전체 ${formatCount(totalCount)}건`)
    return (
        <SectionHeader
            title="요청 기록"
            level={2}
            size="lg"
            aside={
                <>
                    <span className={styles.count}>{count}</span>
                    <Switch
                        label="성공한 요청 묶어 보기"
                        isChecked={isGroupingSuccess}
                        onChange={onGroupingChange}
                    />
                </>
            }
        />
    )
}

export default RequestLogHeader
