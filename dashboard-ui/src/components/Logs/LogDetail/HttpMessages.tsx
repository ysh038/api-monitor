import { useId, useState } from 'react'

import CodeBlock from '../../../design-system/atoms/CodeBlock'
import SectionHeader from '../../../design-system/atoms/SectionHeader'
import Tabs from '../../../design-system/atoms/Tabs'
import type { ILogDetail } from '../../../types/log'
import { prettyBody } from '../../../utils/logs/detailText'

import styles from './LogDetail.module.css'

function HeadersTable({ headers }: { headers: Record<string, string> }) {
    const entries = Object.entries(headers)
    if (entries.length === 0) return <p className={styles.none}>헤더 없음</p>
    return (
        <table className={styles.headers}>
            <tbody>
                {entries.map(([name, value]) => (
                    <tr key={name}>
                        <th scope="row">{name}</th>
                        <td>{value}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    )
}

function Body({ body, isTruncated, label }: { body: string | null; isTruncated: boolean; label: string }) {
    const pretty = prettyBody(body)
    if (pretty === null) return <p className={styles.none}>바디 없음</p>
    return (
        <>
            <CodeBlock label={label}>{pretty}</CodeBlock>
            {isTruncated ? <p className={styles.truncated}>최대 크기를 넘어 앞부분만 저장되었습니다.</p> : null}
        </>
    )
}

/** 요청 / 응답 탭: 헤더 표와 바디 */
function HttpMessages({ detail }: { detail: ILogDetail }) {
    const [activeId, setActiveId] = useState('req')
    const idPrefix = useId()
    const tabs = [
        { id: 'req', label: '요청' },
        { id: 'res', label: '응답' },
    ].map((tab) => ({
        ...tab,
        buttonId: `${idPrefix}-tab-${tab.id}`,
        panelId: `${idPrefix}-panel-${tab.id}`,
    }))
    return (
        <>
            <Tabs label="요청과 응답" tabs={tabs} activeId={activeId} onChange={setActiveId} />
            {tabs.map((tab) => {
                const isRequest = tab.id === 'req'
                return (
                    <div
                        key={tab.id}
                        className={styles.panel}
                        role="tabpanel"
                        id={tab.panelId}
                        aria-labelledby={tab.buttonId}
                        hidden={tab.id !== activeId}
                    >
                        <SectionHeader title="헤더" level={3} size="caption" />
                        <HeadersTable headers={isRequest ? detail.requestHeaders : detail.responseHeaders} />
                        <SectionHeader title="바디" level={3} size="caption" />
                        <Body
                            label={isRequest ? '요청 바디' : '응답 바디'}
                            body={isRequest ? detail.requestBody : detail.responseBody}
                            isTruncated={
                                isRequest ? detail.isRequestBodyTruncated : detail.isResponseBodyTruncated
                            }
                        />
                    </div>
                )
            })}
        </>
    )
}

export default HttpMessages
