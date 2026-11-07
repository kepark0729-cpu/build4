import { describe, expect, it } from 'vitest'
import { newTaskToRow, rowToTask, taskToUpdate, type TaskRow } from './api'

describe('업무 수정할 때 바뀌는 칸', () => {
  const n = {
    title: '고친 이름',
    category: '기타(회식 준비)',
    owner: '급여 담당자 B',
    start: '2026-11-10',
    end: '2026-11-12',
    important: true,
    startHour: 10,
    endHour: 12,
  }
  it('상태와 마지막 상태 변경일은 포함하지 않고 마지막 수정자만 바꾼다', () => {
    const u = taskToUpdate(n, '팀장')
    expect(u).toMatchObject({ title: '고친 이름', category: '기타(회식 준비)', last_editor: '팀장', start_hour: 10, end_hour: 12 })
    expect(u).not.toHaveProperty('status')
    expect(u).not.toHaveProperty('last_changed')
  })
  it('시간을 지우면 둘 다 비운다', () => {
    const u = taskToUpdate({ ...n, startHour: undefined, endHour: undefined }, '팀장')
    expect(u.start_hour).toBeNull()
    expect(u.end_hour).toBeNull()
  })
})

const row: TaskRow = {
  id: 7,
  title: '면접 일정 조율 안내',
  category: '채용',
  owner: '채용 담당자 A',
  status: '진행 중',
  start_date: '2026-11-09',
  end_date: '2026-11-10',
  important: true,
  start_hour: 10,
  end_hour: 12,
  last_changed: '2026-11-06',
  last_editor: '채용 담당자 A',
}

describe('저장 표 ↔ 화면 업무 변환', () => {
  it('저장된 줄을 화면 업무로 바꾼다', () => {
    expect(rowToTask(row)).toEqual({
      id: 7,
      title: '면접 일정 조율 안내',
      category: '채용',
      owner: '채용 담당자 A',
      status: '진행 중',
      start: '2026-11-09',
      end: '2026-11-10',
      important: true,
      startHour: 10,
      endHour: 12,
      lastChanged: '2026-11-06',
      lastEditor: '채용 담당자 A',
    })
  })

  it('시간이 비어 있으면 undefined 로 돌려준다', () => {
    const t = rowToTask({ ...row, start_hour: null, end_hour: null })
    expect(t.startHour).toBeUndefined()
    expect(t.endHour).toBeUndefined()
  })

  it('새 업무는 진행 중 · 변경일 오늘 · 수정자로 저장한다', () => {
    const r = newTaskToRow(
      {
        title: '새 업무',
        category: '기타',
        owner: '급여 담당자 B',
        start: '2026-11-10',
        end: '2026-11-10',
        important: false,
      },
      '2026-11-07',
      '급여 담당자 B',
    )
    expect(r).toMatchObject({
      status: '진행 중',
      start_date: '2026-11-10',
      end_date: '2026-11-10',
      start_hour: null,
      end_hour: null,
      last_changed: '2026-11-07',
      last_editor: '급여 담당자 B',
    })
  })

  it('시작 시간 없이 종료 시간만 있으면 둘 다 비운다', () => {
    const r = newTaskToRow(
      {
        title: 'x',
        category: '기타',
        owner: 'a',
        start: '2026-11-10',
        end: '2026-11-10',
        important: false,
        endHour: 15,
      },
      '2026-11-07',
      'a',
    )
    expect(r.start_hour).toBeNull()
    expect(r.end_hour).toBeNull()
  })
})
