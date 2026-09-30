import { describe, expect, it } from 'vitest'

import { prettyBody, splitStack } from './detailText'

const stack = [
    'org.springframework.web.client.ResourceAccessException: I/O error',
    '\tat org.springframework.web.client.RestTemplate.doExecute(RestTemplate.java:915)',
    '\tat com.example.pay.PaymentClient.status(PaymentClient.java:42)',
    '\tat java.base/java.lang.Thread.run(Thread.java:1583)',
    '\tat java.lang.Thread.run(Thread.java:1583)',
    ...Array.from({ length: 10 }, (_, i) => `\tat org.apache.catalina.X${i}(X.java:1)`),
].join('\n')

describe('splitStack (F3)', () => {
    it('12줄 미리보기와 전체 줄 수', () => {
        const preview = splitStack(stack, false)
        expect(preview.lines).toHaveLength(12)
        expect(preview.totalLines).toBe(15)
        expect(preview.isTruncatable).toBe(true)
        expect(splitStack(stack, true).lines).toHaveLength(15)
    })

    it('프레임워크 패키지가 아닌 at 줄만 앱 코드', () => {
        const { lines } = splitStack(stack, true)
        expect(lines.filter((l) => l.isApp).map((l) => l.text)).toEqual([
            '\tat com.example.pay.PaymentClient.status(PaymentClient.java:42)',
        ])
    })

    it('12줄 이하면 접을 필요가 없다', () => {
        expect(splitStack('a\nb', false).isTruncatable).toBe(false)
    })
})

describe('prettyBody (F4)', () => {
    it('JSON 은 2칸 들여쓰기', () => {
        expect(prettyBody('{"a":1,"b":[1]}')).toBe(
            '{\n  "a": 1,\n  "b": [\n    1\n  ]\n}',
        )
    })

    it('잘린 JSON·일반 문자열은 원문', () => {
        expect(prettyBody('{"a":1,"b')).toBe('{"a":1,"b')
        expect(prettyBody('hello')).toBe('hello')
    })

    it('빈 값은 null', () => {
        expect(prettyBody(null)).toBeNull()
        expect(prettyBody('')).toBeNull()
    })
})
