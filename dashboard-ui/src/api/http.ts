/**
 * 원시 HTTP 호출. jar 에 들어가는 번들이라 axios 대신 fetch 를 쓴다 (MIGRATION.md).
 * 응답 본문은 unknown 으로 돌려주고, 형태 검증·변환은 mappers 가 맡는다.
 */
export class HttpError extends Error {
    readonly status: number

    constructor(status: number, url: string) {
        super(`HTTP ${status}: ${url}`)
        this.name = 'HttpError'
        this.status = status
    }
}

export async function requestJson(
    url: string,
    init?: RequestInit & { signal?: AbortSignal },
): Promise<unknown> {
    const response = await fetch(url, {
        ...init,
        headers: { Accept: 'application/json', ...init?.headers },
    })
    if (!response.ok) throw new HttpError(response.status, url)
    return response.json()
}

export const isNotFound = (error: unknown) =>
    error instanceof HttpError && error.status === 404
