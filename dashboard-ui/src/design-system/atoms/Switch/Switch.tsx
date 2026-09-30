import styles from './Switch.module.css'

export interface ISwitchProps {
    label: string
    isChecked: boolean
    onChange: (isChecked: boolean) => void
}

function Switch({ label, isChecked, onChange }: ISwitchProps) {
    return (
        <label className={styles.switch}>
            <input
                type="checkbox"
                role="switch"
                className={styles.input}
                checked={isChecked}
                onChange={(event) => onChange(event.target.checked)}
            />
            <span className={styles.track} aria-hidden="true" />
            <span>{label}</span>
        </label>
    )
}

export default Switch
