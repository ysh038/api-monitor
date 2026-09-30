export const STACK_PREVIEW_LINES = 12

/** 기존 대시보드(server/public/app.js)와 같은 프레임워크 패키지 목록 — 이 외의 at 줄이 앱 코드 */
const FRAMEWORK_FRAME =
    /^\s*at (java\.|javax\.|jakarta\.|jdk\.|sun\.|org\.springframework\.|org\.apache\.|org\.hibernate\.|com\.mysql\.|com\.zaxxer\.|io\.micrometer\.|tools\.jackson\.|com\.fasterxml\.|org\.eclipse\.|io\.undertow\.|reactor\.|kotlin\.)/
const FRAME = /^\s*at /

export interface IStackLine {
    text: string
    isApp: boolean
}

export function splitStack(
    stack: string,
    isFull: boolean,
): { lines: IStackLine[]; totalLines: number; isTruncatable: boolean } {
    const all = stack.split('\n')
    const shown = isFull ? all : all.slice(0, STACK_PREVIEW_LINES)
    return {
        lines: shown.map((text) => ({
            text,
            isApp: FRAME.test(text) && !FRAMEWORK_FRAME.test(text),
        })),
        totalLines: all.length,
        isTruncatable: all.length > STACK_PREVIEW_LINES,
    }
}

/** JSON 이면 2칸 들여쓰기, 잘린 JSON·일반 문자열은 원문, 빈 값은 null */
export function prettyBody(body: string | null): string | null {
    if (body === null || body === '') return null
    const trimmed = body.trim()
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
            return JSON.stringify(JSON.parse(trimmed), null, 2)
        } catch {
            // 최대 크기에서 잘린 JSON 은 원문 그대로
        }
    }
    return body
}
