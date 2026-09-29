import styles from './ToggleChip.module.css'

export interface IToggleChipProps {
    label: string
    /** 앞 점과 눌린 상태의 색 */
    tone: 'neutral' | 'success' | 'info' | 'warning' | 'danger'
    isPressed: boolean
    onToggle: () => void
    title?: string
}

/** 여러 개를 동시에 켤 수 있는 필터 칩 */
function ToggleChip({ label, tone, isPressed, onToggle, title }: IToggleChipProps) {
    return (
        <button
            type="button"
            className={`${styles.chip} ${styles[tone]}`}
            aria-pressed={isPressed}
            title={title}
            onClick={onToggle}
        >
            <span className={styles.dot} aria-hidden="true" />
            <span className={styles.label} data-label={label}>
                {label}
            </span>
        </button>
    )
}

export default ToggleChip
