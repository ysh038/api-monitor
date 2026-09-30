import styles from './SearchField.module.css'

export interface ISearchFieldProps {
    /** 스크린리더용 이름 */
    label: string
    value: string
    onChange: (value: string) => void
    placeholder?: string
}

function SearchField({ label, value, onChange, placeholder }: ISearchFieldProps) {
    return (
        <input
            type="search"
            className={styles.field}
            aria-label={label}
            placeholder={placeholder}
            value={value}
            onChange={(event) => onChange(event.target.value)}
        />
    )
}

export default SearchField
