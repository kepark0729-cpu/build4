// 날짜는 'YYYY-MM-DD' 글자로 다룬다. 시간대 때문에 하루가 밀리지 않게 UTC 로 계산한다.

export type DateStr = string

function toUtc(s: DateStr): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

function fromUtc(d: Date): DateStr {
  return d.toISOString().slice(0, 10)
}

export function addDays(s: DateStr, n: number): DateStr {
  const d = toUtc(s)
  d.setUTCDate(d.getUTCDate() + n)
  return fromUtc(d)
}

export function todayStr(now: Date = new Date()): DateStr {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** 휴일.csv(날짜,요일,이름,구분)에서 날짜만 모은다. 첫 줄(머리글)과 BOM 은 건너뛴다. */
export function parseHolidays(csv: string): Set<DateStr> {
  const set = new Set<DateStr>()
  for (const line of csv.replace(/^﻿/, '').split(/\r?\n/)) {
    const first = line.split(',')[0]?.trim()
    if (first && /^\d{4}-\d{2}-\d{2}$/.test(first)) set.add(first)
  }
  return set
}

/** 휴일.csv 에서 날짜별 휴일 이름을 모은다. 같은 날 이름이 둘이면 「 · 」로 잇는다. */
export function parseHolidayNames(csv: string): Map<DateStr, string> {
  const map = new Map<DateStr, string>()
  for (const line of csv.replace(/^﻿/, '').split(/\r?\n/)) {
    const [date, , name] = line.split(',').map((c) => c.trim())
    if (date && name && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      map.set(date, map.has(date) ? `${map.get(date)} · ${name}` : name)
    }
  }
  return map
}

/** 0 일요일 ~ 6 토요일 */
export function dayOfWeek(s: DateStr): number {
  return toUtc(s).getUTCDay()
}

export function isBusinessDay(s: DateStr, holidays: Set<DateStr>): boolean {
  const dow = toUtc(s).getUTCDay() // 0 일, 6 토
  return dow !== 0 && dow !== 6 && !holidays.has(s)
}

/** 마지막 변경일 다음 날부터 오늘까지, 토 · 일과 공휴일을 뺀 날 수. */
export function businessDaysSince(
  lastChanged: DateStr,
  today: DateStr,
  holidays: Set<DateStr>,
): number {
  let count = 0
  for (let d = addDays(lastChanged, 1); d <= today; d = addDays(d, 1)) {
    if (isBusinessDay(d, holidays)) count++
  }
  return count
}

/** 오늘(쉬는 날이면 직전 영업일)로부터 영업일 n 일 전 날짜. 가상 데이터 만들 때 쓴다. */
export function businessDaysAgo(
  today: DateStr,
  n: number,
  holidays: Set<DateStr>,
): DateStr {
  let d = today
  while (!isBusinessDay(d, holidays)) d = addDays(d, -1)
  let left = n
  while (left > 0) {
    d = addDays(d, -1)
    if (isBusinessDay(d, holidays)) left--
  }
  return d
}

export const STALLED_DAYS = 2

export type Status = '진행 중' | '멈춤' | '완료'

export interface Flaggable {
  status: Status
  end: DateStr // 종료일
  lastChanged: DateStr
}

/** 종료일이 오늘보다 앞이고 완료가 아닌 업무. 종료일이 오늘이면 아직 아니다. */
export function isOverdue(t: Flaggable, today: DateStr): boolean {
  return t.status !== '완료' && t.end < today
}

/** 시작일 · 종료일 입력값을 맞춘다. 종료일이 비었거나 시작일보다 이르면 시작일로 맞춘다. */
export function normalizeRange(start: DateStr, end: DateStr | null): DateStr {
  return end && end >= start ? end : start
}

/** 같은 날이면 날짜 하나, 기간이면 「시작 ~ 종료」. */
export function rangeText(start: DateStr, end: DateStr): string {
  return start === end ? start : `${start} ~ ${end}`
}

/** 마지막 변경 뒤 쉬는 날을 뺀 2일 이상 지났고 완료가 아닌 업무. */
export function isStalled(
  t: Flaggable,
  today: DateStr,
  holidays: Set<DateStr>,
): boolean {
  return (
    t.status !== '완료' &&
    businessDaysSince(t.lastChanged, today, holidays) >= STALLED_DAYS
  )
}
