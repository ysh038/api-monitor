import type { ReactNode } from 'react'

import Card from '../../../design-system/atoms/Card'

import styles from './PanelLayout.module.css'

export interface IPanelLayoutProps {
    label: string
    /** 안쪽 여백이 있는 윗부분 (제목·필터 등), 세로로 쌓인다 */
    top: ReactNode
    /** 카드 가장자리까지 채우는 아랫부분 (표) */
    body: ReactNode
}

/** 카드 하나를 여백 있는 윗부분 + 꽉 찬 아랫부분으로 나눈다 */
function PanelLayout({ label, top, body }: IPanelLayoutProps) {
    return (
        <Card label={label} padding="none">
            <div className={styles.top} data-slot="panel-top">
                {top}
            </div>
            <div className={styles.body} data-slot="panel-body">
                {body}
            </div>
        </Card>
    )
}

export default PanelLayout
