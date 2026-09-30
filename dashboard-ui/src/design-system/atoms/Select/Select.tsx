import styles from './Select.module.css'

export interface ISelectOption {
    value: string
    label: string
}

export interface ISelectProps {
    /** 스크린리더용 이름 */
    label: string
    value: string
    options: ISelectOption[]
    onChange: (value: string) => void
    isDisabled?: boolean
}

function Select({ label, value, options, onChange, isDisabled = false }: ISelectProps) {
    return (
        <select
            className={styles.select}
            aria-label={label}
            value={value}
            disabled={isDisabled}
            onChange={(event) => onChange(event.target.value)}
        >
            {options.map((option) => (
                <option key={option.value} value={option.value}>
                    {option.label}
                </option>
            ))}
        </select>
    )
}

export default Select
