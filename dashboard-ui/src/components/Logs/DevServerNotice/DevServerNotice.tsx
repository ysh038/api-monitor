import Notice from '../../../design-system/atoms/Notice'
import type { TDevServerNotice } from '../../../utils/devServer'

import styles from './DevServerNotice.module.css'

export interface IDevServerNoticeProps {
    /** null 이면 아무것도 그리지 않는다 (운영 빌드·개발 모드 연결됨·확인 중) */
    notice: TDevServerNotice | null
}

const START_COMMAND = 'cd server && npm run dev'

/** Vite 개발 서버에서 API 서버(Node :8081) 상태를 알려 주는 안내 (A1, A2) */
function DevServerNotice({ notice }: IDevServerNoticeProps) {
    if (notice === null) return null

    if (notice === 'unreachable') {
        return (
            <div role="status" className={styles.wrap}>
                <Notice tone="warning" variant="outline">
                    <strong>API 서버에 연결할 수 없어요.</strong> 새 터미널에서{' '}
                    <code className={styles.command}>{START_COMMAND}</code> 를 실행하세요. 연결되면 이
                    안내는 저절로 사라져요.
                </Notice>
            </div>
        )
    }

    return (
        <div role="status" className={styles.wrap}>
            <Notice tone="info" variant="outline">
                <strong>API 서버가 운영 모드(npm start)로 떠 있어서 Mock 데이터 기능이 꺼져 있어요.</strong>{' '}
                <code className={styles.command}>{START_COMMAND}</code> 로 다시 켜면 Mock 버튼이 나타나요.
            </Notice>
        </div>
    )
}

export default DevServerNotice
