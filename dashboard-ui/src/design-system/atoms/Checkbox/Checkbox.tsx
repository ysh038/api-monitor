import styles from './Checkbox.module.css'

export interface ICheckboxProps {
    label: string
    isChecked: boolean
    onChange: (isChecked: boolean) => void
}

function Checkbox({ label, isChecked, onChange }: ICheckboxProps) {
    return (
        <label className={styles.checkbox}>
            <input
                type="checkbox"
                className={styles.input}
                checked={isChecked}
                onChange={(event) => onChange(event.target.checked)}
            />
            {label}
        </label>
    )
}

export default Checkbox
