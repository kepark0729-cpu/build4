import { describe, expect, it } from 'vitest'
import { attentionTasks, dueSoon, memberStats, summarize, todayTasks } from './dashboard'
import type { Task } from './data'

const none = new Set<string>()
const TODAY = '2026-11-11' // 수요일. 이번 주는 11/8(일)~11/14(토)

const t = (id: number, over: Partial<Task> = {}): Task => ({
  id,
  title: `업무${id}`,
  category: '채용',
  owner: 'A',
  status: '진행 중',
  start: '2026-11-11',
  end: '2026-11-11',
  important: false,
  lastChanged: '2026-11-11',
  lastEditor: 'A',
  ...over,
})

describe('숫자 카드', () => {
  const tasks = [
    t(1), // 진행 중, 오늘
    t(2, { end: '2026-11-09', start: '2026-11-09' }), // 기한 초과
    t(3, { lastChanged: '2026-11-04' }), // 오래 멈춤(영업일 5일)
    t(4, { status: '완료', lastChanged: '2026-11-10' }), // 이번 주 완료
    t(5, { status: '완료', lastChanged: '2026-11-03' }), // 지난 주 완료
    t(6, { status: '멈춤' }),
  ]
  it('개수를 센다', () => {
    expect(summarize(tasks, TODAY, none)).toEqual({
      total: 6,
      inProgress: 3, // 업무1 · 2 · 3 (업무6은 「멈춤」 상태)
      overdue: 1, // 업무2
      stalled: 1, // 업무3 (마지막 변경 11/4 → 쉬는 날 빼고 5일)
      doneThisWeek: 1,
    })
  })
  it('이번 주 완료는 일~토 안에서만 센다', () => {
    expect(summarize([t(7, { status: '완료', lastChanged: '2026-11-08' })], TODAY, none).doneThisWeek).toBe(1)
    expect(summarize([t(8, { status: '완료', lastChanged: '2026-11-07' })], TODAY, none).doneThisWeek).toBe(0)
    expect(summarize([t(9, { status: '완료', lastChanged: '2026-11-14' })], TODAY, none).doneThisWeek).toBe(1)
    expect(summarize([t(10, { status: '완료', lastChanged: '2026-11-15' })], TODAY, none).doneThisWeek).toBe(0)
  })
})

describe('주의가 필요한 업무', () => {
  it('기한 초과를 먼저, 그다음 오래 멈춤. 완료는 뺀다', () => {
    const tasks = [
      t(1, { lastChanged: '2026-11-04' }), // 오래 멈춤
      t(2, { start: '2026-11-09', end: '2026-11-09' }), // 기한 초과(종료일 11/9)
      t(3, { start: '2026-11-05', end: '2026-11-05' }), // 기한 초과(더 오래됨)
      t(4, { status: '완료', start: '2026-11-01', end: '2026-11-01' }),
      t(5), // 정상
    ]
    expect(attentionTasks(tasks, TODAY, none).map((x) => x.id)).toEqual([3, 2, 1])
  })
})

describe('오늘 하는 업무 · 이번 주 마감', () => {
  const tasks = [
    t(1, { start: '2026-11-10', end: '2026-11-12', startHour: 14, endHour: 15 }),
    t(2, { start: '2026-11-11', end: '2026-11-11', startHour: 9, endHour: 10 }),
    t(3, { start: '2026-11-12', end: '2026-11-12' }), // 내일
    t(4, { status: '완료' }),
    t(5, { start: '2026-11-11', end: '2026-11-17' }), // 7일 안에 안 끝남(마감 11/17 > 11/17? 오늘+6=11/17 포함)
    t(6, { start: '2026-11-11', end: '2026-11-18' }), // 마감 11/18 은 밖
  ]
  it('오늘 하는 업무는 시간 있는 업무가 먼저', () => {
    expect(todayTasks(tasks, TODAY).map((x) => x.id)).toEqual([2, 1, 5, 6])
  })
  it('7일 안에 끝나는 미완료 업무를 종료일 순으로', () => {
    expect(dueSoon(tasks, TODAY).map((x) => x.id)).toEqual([2, 1, 3, 5])
  })
  it('이미 기한이 지난 업무는 마감 예정에 넣지 않는다', () => {
    expect(dueSoon([t(7, { start: '2026-11-09', end: '2026-11-09' })], TODAY)).toEqual([])
  })
})

describe('팀원별 현황', () => {
  it('담당자 순서대로 상태별로 센다', () => {
    const tasks = [
      t(1, { owner: 'A' }),
      t(2, { owner: 'A', status: '완료' }),
      t(3, { owner: 'B', status: '멈춤' }),
    ]
    const s = memberStats(tasks, ['B', 'A', 'C'], TODAY, none)
    expect(s.map((x) => x.name)).toEqual(['B', 'A', 'C'])
    expect(s[1]).toMatchObject({ total: 2, inProgress: 1, done: 1, paused: 0 })
    expect(s[0]).toMatchObject({ total: 1, paused: 1 })
    expect(s[2].total).toBe(0)
  })
})
