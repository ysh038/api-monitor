import styles from './StatCard.module.css'

export interface IStatCardProps {
    /** 윗줄 (고정폭 글꼴) */
    title: string
    /** 아랫줄 강조 문구 */
    description: string
    tone?: 'neutral' | 'warning' | 'danger'
    /** 이 카드로 좁혀 보고 있는지 */
    isPressed: boolean
    onClick: () => void
}

/** 누르면 그 대상으로 좁혀 보는 요약 카드 */
function StatCard({ title, description, tone = 'neutral', isPressed, onClick }: IStatCardProps) {
    return (
        <button type="button" className={styles.card} aria-pressed={isPressed} onClick={onClick}>
            <span className={styles.title}>{title}</span>
            <span className={`${styles.description} ${styles[tone]}`}>{description}</span>
        </button>
    )
}

export default StatCard
