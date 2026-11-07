import { addDays, dayOfWeek, type DateStr } from './dates'

export type CalendarMode = 'month' | 'week'

const pad = (n: number) => String(n).padStart(2, '0')
const ymd = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`
const parts = (s: DateStr) => s.split('-').map(Number) as [number, number, number]
const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate()

/** 그 주의 일요일 (달력은 일~토) */
export function startOfWeek(s: DateStr): DateStr {
  return addDays(s, -dayOfWeek(s))
}

/** 기준 날짜가 든 주의 7일 (일~토) */
export function weekDays(anchor: DateStr): DateStr[] {
  const start = startOfWeek(anchor)
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

/** 기준 날짜가 든 달을 덮는 주들 (일~토). 앞뒤 달 날짜도 채운다. */
export function monthWeeks(anchor: DateStr): DateStr[][] {
  const [y, m] = parts(anchor)
  const last = ymd(y, m, daysInMonth(y, m))
  const weeks: DateStr[][] = []
  for (let start = startOfWeek(ymd(y, m, 1)); start <= last; start = addDays(start, 7)) {
    weeks.push(weekDays(start))
  }
  return weeks
}

export function sameMonth(a: DateStr, b: DateStr): boolean {
  return a.slice(0, 7) === b.slice(0, 7)
}

/** 월간은 한 달, 주간은 일주일 옮긴다. 월말에서 짧은 달로 가면 그 달 마지막 날로 맞춘다. */
export function shiftAnchor(anchor: DateStr, mode: CalendarMode, dir: 1 | -1): DateStr {
  if (mode === 'week') return addDays(anchor, 7 * dir)
  const [y, m, d] = parts(anchor)
  const total = y * 12 + (m - 1) + dir
  const ny = Math.floor(total / 12)
  const nm = (total % 12) + 1
  return ymd(ny, nm, Math.min(d, daysInMonth(ny, nm)))
}

/** 지금 보는 기간을 글로. 예: 2026년 11월 / 2026년 11월 8일 ~ 14일 */
export function periodLabel(anchor: DateStr, mode: CalendarMode): string {
  const [y, m] = parts(anchor)
  if (mode === 'month') return `${y}년 ${m}월`
  const days = weekDays(anchor)
  const [, m1, d1] = parts(days[0])
  const [y2, m2, d2] = parts(days[6])
  if (m1 === m2) return `${y2}년 ${m1}월 ${d1}일 ~ ${d2}일`
  return `${y2}년 ${m1}월 ${d1}일 ~ ${m2}월 ${d2}일`
}

interface Ranged {
  start: DateStr
  end: DateStr
}

/** 시작일부터 종료일까지(양끝 포함)에 그날이 들어 있는 업무 */
export function tasksOnDay<T extends Ranged>(tasks: T[], day: DateStr): T[] {
  return tasks.filter((t) => t.start <= day && day <= t.end)
}

/** 캘린더에는 고른 팀원의 업무를 올린다. importantOnly 가 켜지면 「중요」로 체크한 것만. */
export function visibleTasks<T extends { important: boolean; owner: string }>(
  tasks: T[],
  selected: ReadonlySet<string>,
  importantOnly = false,
): T[] {
  return tasks.filter((t) => selected.has(t.owner) && (!importantOnly || t.important))
}

/** 시간이 있는 업무를 시작 시간 순으로 먼저, 시간 없는 업무는 뒤에(등록 순). */
export function sortForDay<T extends { id: number; startHour?: number }>(tasks: T[]): T[] {
  return [...tasks].sort((a, b) => {
    const ah = a.startHour ?? Infinity
    const bh = b.startHour ?? Infinity
    return ah === bh ? a.id - b.id : ah - bh
  })
}
