import styles from './SegmentedControl.module.css'

export interface ISegmentedOption<TValue extends string> {
    value: TValue
    label: string
}

export interface ISegmentedControlProps<TValue extends string> {
    /** 그룹 이름 (스크린리더) */
    label: string
    options: ISegmentedOption<TValue>[]
    value: TValue
    onChange: (value: TValue) => void
}

/** 하나만 고르는 버튼 묶음. 선택 상태는 aria-pressed 로 알린다 */
function SegmentedControl<TValue extends string>({
    label,
    options,
    value,
    onChange,
}: ISegmentedControlProps<TValue>) {
    return (
        <div className={styles.group} role="group" aria-label={label}>
            {options.map((option) => (
                <button
                    key={option.value}
                    type="button"
                    className={styles.option}
                    aria-pressed={option.value === value}
                    onClick={() => onChange(option.value)}
                >
                    {option.label}
                </button>
            ))}
        </div>
    )
}

export default SegmentedControl
