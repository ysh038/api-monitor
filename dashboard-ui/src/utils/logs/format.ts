const pad = (n: number, width = 2) => String(n).padStart(width, '0')

const isSameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString()

export interface ISplitTime {
    /** 오늘이 아니면 MM-DD */
    date: string | null
    /** HH:mm:ss */
    clock: string
    /** .SSS */
    millis: string
}

/** 목록용 시각을 날짜·시각·밀리초로 나눈다 (밀리초는 흐리게 표시하려고 분리) */
export function splitTime(ms: number, now: number = Date.now()): ISplitTime {
    const d = new Date(ms)
    return {
        date: isSameDay(d, new Date(now))
            ? null
            : `${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
        clock: `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`,
        millis: `.${pad(d.getMilliseconds(), 3)}`,
    }
}

/** 오늘이면 HH:mm:ss.SSS, 아니면 MM-DD HH:mm:ss.SSS */
export function formatTime(
    ms: number,
    now: number = Date.now(),
    { isWithMs = true }: { isWithMs?: boolean } = {},
): string {
    const { date, clock, millis } = splitTime(ms, now)
    const time = isWithMs ? clock + millis : clock
    return date ? `${date} ${time}` : time
}

/** 436ms · 3.0초 · 12초 */
export function formatDuration(ms: number | null): string {
    if (ms === null) return '-'
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(ms >= 10_000 ? 0 : 1)}초`
}

/** 9월 29일 오전 09:08:46.227 */
export function formatDetailTime(ms: number): string {
    const d = new Date(ms)
    const hours = d.getHours()
    const meridiem = hours < 12 ? '오전' : '오후'
    const hour12 = hours % 12 === 0 ? 12 : hours % 12
    return `${d.getMonth() + 1}월 ${d.getDate()}일 ${meridiem} ${pad(hour12)}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`
}

/** 1,234 */
export const formatCount = (n: number) => n.toLocaleString('ko-KR')
