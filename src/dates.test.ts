import { describe, expect, it } from 'vitest'
import holidayCsv from '../휴일.csv?raw'
import {
  businessDaysAgo,
  businessDaysSince,
  isOverdue,
  isStalled,
  normalizeRange,
  parseHolidays,
  rangeText,
} from './dates'

const holidays = parseHolidays(holidayCsv)
const none = new Set<string>()

const task = (over: Partial<Parameters<typeof isStalled>[0]> = {}) => ({
  status: '진행 중' as const,
  end: '2099-01-01',
  lastChanged: '2026-11-02', // 월
  ...over,
})

describe('휴일 목록', () => {
  it('휴일.csv 에서 날짜를 읽는다 (머리글 제외)', () => {
    expect(holidays.size).toBeGreaterThan(100)
    expect(holidays.has('2026-10-05')).toBe(true) // 쉬는 날 개천절
    expect(holidays.has('날짜')).toBe(false)
  })
  it('기념일은 들어 있지 않다', () => {
    expect(holidays.has('2026-05-08')).toBe(false) // 어버이날
  })
})

describe('영업일 계산', () => {
  it('월요일 변경 → 수요일: 화 · 수 = 2일', () => {
    expect(businessDaysSince('2026-11-02', '2026-11-04', holidays)).toBe(2)
  })
  it('금요일 변경 → 다음 월요일: 월 하루만 센다 (토 · 일 제외)', () => {
    expect(businessDaysSince('2026-11-06', '2026-11-09', holidays)).toBe(1)
  })
  it('추석 연휴가 낀 경우 휴일을 세지 않는다', () => {
    // 수 9/23 변경 → 월 9/28: 목 · 금 휴일, 토 · 일 주말 → 월 하루
    expect(businessDaysSince('2026-09-23', '2026-09-28', holidays)).toBe(1)
    expect(businessDaysSince('2026-09-23', '2026-09-28', none)).toBe(3)
  })
  it('대체공휴일(2026-10-05 월)도 뺀다', () => {
    // 금 10/2 변경 → 화 10/6: 월 10/5 대체공휴일 → 화 하루
    expect(businessDaysSince('2026-10-02', '2026-10-06', holidays)).toBe(1)
  })
  it('같은 날은 0일', () => {
    expect(businessDaysSince('2026-11-04', '2026-11-04', holidays)).toBe(0)
  })
})

describe('오래 멈춤 · 기한 초과 표시', () => {
  it('2영업일 이상 지났고 완료가 아니면 오래 멈춤', () => {
    expect(isStalled(task(), '2026-11-04', holidays)).toBe(true)
    expect(isStalled(task(), '2026-11-03', holidays)).toBe(false)
  })
  it('완료는 표시하지 않는다', () => {
    expect(isStalled(task({ status: '완료' }), '2026-11-30', holidays)).toBe(false)
    expect(isOverdue(task({ status: '완료', end: '2026-01-01' }), '2026-11-04')).toBe(false)
  })
  it('연휴 다음 영업일에는 오래 멈춤이 아니다', () => {
    expect(isStalled(task({ lastChanged: '2026-09-23' }), '2026-09-28', holidays)).toBe(false)
  })
  it('종료일이 오늘이면 아직 기한 초과가 아니고, 어제면 기한 초과', () => {
    expect(isOverdue(task({ end: '2026-11-04' }), '2026-11-04')).toBe(false)
    expect(isOverdue(task({ end: '2026-11-03' }), '2026-11-04')).toBe(true)
  })
  it('상태를 바꿔 마지막 변경일이 오늘이 되면 표시가 사라진다', () => {
    const stalled = task()
    expect(isStalled(stalled, '2026-11-04', holidays)).toBe(true)
    expect(isStalled({ ...stalled, lastChanged: '2026-11-04' }, '2026-11-04', holidays)).toBe(false)
  })
})

describe('시작일 · 종료일', () => {
  it('종료일이 비었거나 시작일보다 이르면 시작일로 맞춘다', () => {
    expect(normalizeRange('2026-11-10', null)).toBe('2026-11-10')
    expect(normalizeRange('2026-11-10', '2026-11-09')).toBe('2026-11-10')
  })
  it('시작일과 같거나 뒤인 종료일은 그대로 둔다', () => {
    expect(normalizeRange('2026-11-10', '2026-11-10')).toBe('2026-11-10')
    expect(normalizeRange('2026-11-10', '2026-11-14')).toBe('2026-11-14')
  })
  it('하루짜리는 날짜 하나, 기간은 「시작 ~ 종료」로 보인다', () => {
    expect(rangeText('2026-11-10', '2026-11-10')).toBe('2026-11-10')
    expect(rangeText('2026-11-10', '2026-11-14')).toBe('2026-11-10 ~ 2026-11-14')
  })
})

describe('가상 데이터용 날짜', () => {
  it('오늘이 토요일이어도 n 영업일 전 날짜가 같은 n 으로 되돌아온다', () => {
    for (const today of ['2026-11-07', '2026-11-04', '2026-10-04']) {
      for (const n of [1, 2, 3, 5]) {
        const d = businessDaysAgo(today, n, holidays)
        expect(businessDaysSince(d, today, holidays)).toBe(n)
      }
    }
  })
})
