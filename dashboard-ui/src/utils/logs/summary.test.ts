import { describe, expect, it } from 'vitest'

import { SUMMARY_DESCRIPTION, SUMMARY_TITLE } from './summary'

describe('요약 머리 (D0)', () => {
    it('제목은 고정 문구', () => {
        expect(SUMMARY_TITLE).toBe('모니터링 툴')
    })

    it('설명도 고정 문구', () => {
        expect(SUMMARY_DESCRIPTION).toBe('로그를 봅시다')
    })

    it('건수가 들어가지 않는다', () => {
        expect(`${SUMMARY_TITLE} ${SUMMARY_DESCRIPTION}`).not.toMatch(/\d/)
    })
})
