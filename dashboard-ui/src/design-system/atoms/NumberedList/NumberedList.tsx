import styles from './NumberedList.module.css'

export interface INumberedListProps {
    items: string[]
}

/** 원 안 번호가 붙는 순서 목록 */
function NumberedList({ items }: INumberedListProps) {
    return (
        <ol className={styles.list}>
            {items.map((item) => (
                <li key={item} className={styles.item}>
                    {item}
                </li>
            ))}
        </ol>
    )
}

export default NumberedList
