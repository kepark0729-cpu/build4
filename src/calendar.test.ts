import { describe, expect, it } from 'vitest'
import holidayCsv from '../휴일.csv?raw'
import {
  monthWeeks,
  periodLabel,
  shiftAnchor,
  sortForDay,
  startOfWeek,
  tasksOnDay,
  visibleTasks,
  weekDays,
} from './calendar'
import { parseHolidayNames } from './dates'

describe('주 · 달 칸 만들기 (일~토)', () => {
  it('주는 일요일에서 토요일까지 7일', () => {
    expect(weekDays('2026-11-11')).toEqual([
      '2026-11-08', '2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14',
    ])
    expect(startOfWeek('2026-11-08')).toBe('2026-11-08') // 일요일은 그대로
  })
  it('2026년 11월은 11/1(일)부터 12/5(토)까지 5주', () => {
    const weeks = monthWeeks('2026-11-15')
    expect(weeks).toHaveLength(5)
    expect(weeks[0][0]).toBe('2026-11-01')
    expect(weeks[4][6]).toBe('2026-12-05')
    expect(weeks.every((w) => w.length === 7)).toBe(true)
  })
  it('달이 수요일에 시작하면 앞 달 날짜로 첫 주를 채운다', () => {
    const weeks = monthWeeks('2026-04-10') // 4/1 은 수요일
    expect(weeks[0][0]).toBe('2026-03-29')
    expect(weeks[0][3]).toBe('2026-04-01')
  })
})

describe('이전 · 다음', () => {
  it('주간은 7일씩', () => {
    expect(shiftAnchor('2026-11-10', 'week', 1)).toBe('2026-11-17')
    expect(shiftAnchor('2026-11-10', 'week', -1)).toBe('2026-11-03')
  })
  it('월간은 한 달씩, 해를 넘긴다', () => {
    expect(shiftAnchor('2026-11-10', 'month', 1)).toBe('2026-12-10')
    expect(shiftAnchor('2026-12-10', 'month', 1)).toBe('2027-01-10')
    expect(shiftAnchor('2026-01-10', 'month', -1)).toBe('2025-12-10')
  })
  it('월말에서 짧은 달로 가면 그 달 마지막 날로 맞춘다', () => {
    expect(shiftAnchor('2026-01-31', 'month', 1)).toBe('2026-02-28')
    expect(shiftAnchor('2028-01-31', 'month', 1)).toBe('2028-02-29') // 윤년
  })
})

describe('기간 글', () => {
  it('월간 · 주간', () => {
    expect(periodLabel('2026-11-10', 'month')).toBe('2026년 11월')
    expect(periodLabel('2026-11-11', 'week')).toBe('2026년 11월 8일 ~ 14일')
    expect(periodLabel('2026-11-30', 'week')).toBe('2026년 11월 29일 ~ 12월 5일')
  })
})

describe('캘린더에 올릴 업무', () => {
  const tasks = [
    { id: 1, owner: 'A', important: true, start: '2026-11-09', end: '2026-11-11' },
    { id: 2, owner: 'A', important: false, start: '2026-11-09', end: '2026-11-09' },
    { id: 3, owner: 'B', important: true, start: '2026-11-10', end: '2026-11-10', startHour: 14 },
    { id: 4, owner: 'B', important: true, start: '2026-11-10', end: '2026-11-10', startHour: 9 },
  ]
  it('기본은 고른 팀원의 업무를 모두, 종류를 하나만 켜면 그 종류만', () => {
    expect(visibleTasks(tasks, new Set(['A'])).map((t) => t.id)).toEqual([1, 2])
    expect(visibleTasks(tasks, new Set(['A']), { important: true, normal: false }).map((t) => t.id)).toEqual([1])
    expect(visibleTasks(tasks, new Set(['A']), { important: false, normal: true }).map((t) => t.id)).toEqual([2])
    expect(visibleTasks(tasks, new Set(['A']), { important: false, normal: false })).toEqual([])
    expect(visibleTasks(tasks, new Set(['A', 'B']), { important: true, normal: false }).map((t) => t.id)).toEqual([1, 3, 4])
    expect(visibleTasks(tasks, new Set())).toEqual([])
  })
  it('시작일부터 종료일까지 양끝 포함해 모든 날에 나온다', () => {
    const a = tasks[0]
    expect(tasksOnDay([a], '2026-11-08')).toEqual([])
    expect(tasksOnDay([a], '2026-11-09')).toEqual([a])
    expect(tasksOnDay([a], '2026-11-10')).toEqual([a])
    expect(tasksOnDay([a], '2026-11-11')).toEqual([a])
    expect(tasksOnDay([a], '2026-11-12')).toEqual([])
  })
  it('시간 순서로 늘어서고 시간 없는 업무는 뒤로 간다', () => {
    expect(sortForDay(tasks.filter((t) => t.start === '2026-11-10')).map((t) => t.id)).toEqual([4, 3])
    expect(sortForDay([tasks[0], tasks[3]]).map((t) => t.id)).toEqual([4, 1])
  })
})

describe('휴일 이름', () => {
  const names = parseHolidayNames(holidayCsv)
  it('날짜별 이름을 읽는다', () => {
    expect(names.get('2026-12-25')).toBe('크리스마스')
    expect(names.get('2026-10-05')).toBe('쉬는 날 개천절')
  })
  it('같은 날 이름이 둘이면 이어 붙인다', () => {
    expect(names.get('2025-05-05')).toBe('부처님오신날 · 어린이날')
  })
  it('쉬는 날이 아닌 날은 없다', () => {
    expect(names.has('2026-11-10')).toBe(false)
  })
})
