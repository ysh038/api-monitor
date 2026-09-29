import type { ReactNode } from 'react'

import styles from './DashboardLayout.module.css'

export interface IDashboardLayoutProps {
    topbar: ReactNode
    summary: ReactNode
    /** 본문 (요청 기록) */
    children: ReactNode
    /** 화면 위에 뜨는 패널 (상세) */
    overlay: ReactNode
}

/** 대시보드 골격 — 상단 바 아래에 요약과 본문을 세로로 쌓는다 */
function DashboardLayout({ topbar, summary, children, overlay }: IDashboardLayoutProps) {
    return (
        <div className={styles.layout}>
            <div className={styles.topbar} data-slot="topbar">
                {topbar}
            </div>
            <div className={styles.content}>
                <section data-slot="summary" aria-label="요약">
                    {summary}
                </section>
                <main data-slot="main">{children}</main>
            </div>
            <div data-slot="overlay">{overlay}</div>
        </div>
    )
}

export default DashboardLayout
