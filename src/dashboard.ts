import { startOfWeek } from './calendar'
import type { Task } from './data'
import { addDays, isOverdue, isStalled, type DateStr } from './dates'

export interface Stats {
  total: number
  inProgress: number
  overdue: number
  stalled: number
  doneThisWeek: number
}

/** 첫 화면 위쪽 숫자 카드. 이번 주는 일~토. */
export function summarize(tasks: Task[], today: DateStr, holidays: Set<DateStr>): Stats {
  const weekStart = startOfWeek(today)
  const weekEnd = addDays(weekStart, 6)
  return {
    total: tasks.length,
    inProgress: tasks.filter((t) => t.status === '진행 중').length,
    overdue: tasks.filter((t) => isOverdue(t, today)).length,
    stalled: tasks.filter((t) => isStalled(t, today, holidays)).length,
    doneThisWeek: tasks.filter(
      (t) => t.status === '완료' && t.lastChanged >= weekStart && t.lastChanged <= weekEnd,
    ).length,
  }
}

/** 기한 초과이거나 오래 멈춘 업무. 기한 초과를 먼저, 종료일이 오래된 순. */
export function attentionTasks(tasks: Task[], today: DateStr, holidays: Set<DateStr>): Task[] {
  return tasks
    .filter((t) => isOverdue(t, today) || isStalled(t, today, holidays))
    .sort((a, b) => {
      const ao = isOverdue(a, today) ? 0 : 1
      const bo = isOverdue(b, today) ? 0 : 1
      return ao - bo || a.end.localeCompare(b.end) || a.id - b.id
    })
}

/** 오늘이 시작일~종료일 사이에 있고 아직 끝나지 않은 업무. 시간이 있는 업무가 먼저. */
export function todayTasks(tasks: Task[], today: DateStr): Task[] {
  return tasks
    .filter((t) => t.status !== '완료' && t.start <= today && today <= t.end)
    .sort((a, b) => (a.startHour ?? Infinity) - (b.startHour ?? Infinity) || a.id - b.id)
}

/** 앞으로 7일(오늘 포함) 안에 끝나는 미완료 업무. 이미 기한이 지난 업무는 뺀다. */
export function dueSoon(tasks: Task[], today: DateStr): Task[] {
  const last = addDays(today, 6)
  return tasks
    .filter((t) => t.status !== '완료' && t.end >= today && t.end <= last)
    .sort((a, b) => a.end.localeCompare(b.end) || a.id - b.id)
}

export interface MemberStat {
  name: string
  total: number
  inProgress: number
  paused: number
  done: number
  overdue: number
  stalled: number
}

/** 팀원별 상태 개수. 목록 순서는 담당자 순서 그대로. */
export function memberStats(
  tasks: Task[],
  members: string[],
  today: DateStr,
  holidays: Set<DateStr>,
): MemberStat[] {
  return members.map((name) => {
    const mine = tasks.filter((t) => t.owner === name)
    return {
      name,
      total: mine.length,
      inProgress: mine.filter((t) => t.status === '진행 중').length,
      paused: mine.filter((t) => t.status === '멈춤').length,
      done: mine.filter((t) => t.status === '완료').length,
      overdue: mine.filter((t) => isOverdue(t, today)).length,
      stalled: mine.filter((t) => isStalled(t, today, holidays)).length,
    }
  })
}
