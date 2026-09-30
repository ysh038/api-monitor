import styles from './ToggleChip.module.css'

export interface IToggleChipProps {
    label: string
    /** 앞 점과 눌린 상태의 색 */
    tone: 'neutral' | 'success' | 'info' | 'warning' | 'danger'
    isPressed: boolean
    onToggle: () => void
    title?: string
    /** filled 혼자 놓일 때(회색 배경) · plain 트랙 안에 묶어 놓을 때(꺼지면 배경 없음) */
    appearance?: 'filled' | 'plain'
}

/** 여러 개를 동시에 켤 수 있는 필터 칩 */
function ToggleChip({
    label,
    tone,
    isPressed,
    onToggle,
    title,
    appearance = 'filled',
}: IToggleChipProps) {
    return (
        <button
            type="button"
            className={`${styles.chip} ${styles[tone]} ${styles[appearance]}`}
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
