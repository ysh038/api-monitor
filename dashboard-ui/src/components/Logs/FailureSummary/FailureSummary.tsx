import { SUMMARY_DESCRIPTION, SUMMARY_TITLE } from '../../../utils/logs/summary'

import styles from './FailureSummary.module.css'

/** 화면 맨 위 요약 머리: 고정 제목 · 고정 설명 (D0) */
function FailureSummary() {
    return (
        <div className={styles.summary}>
            <h1 className={styles.headline} title={SUMMARY_TITLE}>
                {SUMMARY_TITLE}
            </h1>
            <p className={styles.description} title={SUMMARY_DESCRIPTION}>
                {SUMMARY_DESCRIPTION}
            </p>
        </div>
    )
}

export default FailureSummary
