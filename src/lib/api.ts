import type { Task } from '../data'
import type { DateStr, Status } from '../dates'
import { supabase } from './supabase'

/** 저장 표 tasks 의 한 줄 (PRD 6절 칸) */
export interface TaskRow {
  id: number
  title: string
  category: string
  owner: string
  status: Status
  start_date: DateStr
  end_date: DateStr
  important: boolean
  start_hour: number | null
  end_hour: number | null
  last_changed: DateStr
  last_editor: string
}

export type NewTaskInput = Omit<Task, 'id' | 'status' | 'lastChanged' | 'lastEditor'>

export function rowToTask(r: TaskRow): Task {
  return {
    id: r.id,
    title: r.title,
    category: r.category,
    owner: r.owner,
    status: r.status,
    start: r.start_date,
    end: r.end_date,
    important: r.important,
    startHour: r.start_hour ?? undefined,
    endHour: r.end_hour ?? undefined,
    lastChanged: r.last_changed,
    lastEditor: r.last_editor,
  }
}

/** 새 업무를 저장 표에 넣을 모양으로 바꾼다. 상태는 「진행 중」, 변경일은 오늘로 시작한다. */
export function newTaskToRow(n: NewTaskInput, today: DateStr, editor: string) {
  return {
    title: n.title,
    category: n.category,
    owner: n.owner,
    status: '진행 중' as Status,
    start_date: n.start,
    end_date: n.end,
    important: n.important,
    start_hour: n.startHour ?? null,
    end_hour: n.startHour === undefined ? null : (n.endHour ?? null),
    last_changed: today,
    last_editor: editor,
  }
}

function client() {
  if (!supabase) throw new Error('저장소 연결 정보가 없습니다. 소유자에게 알려 주세요.')
  return supabase
}

function fail(what: string, error: { message: string }): never {
  console.error(what, error.message)
  throw new Error(`${what} 못했습니다. 잠시 뒤 다시 해 보세요.`)
}

export async function fetchTasks(): Promise<Task[]> {
  // 삭제 표시가 된 업무는 목록에 나오지 않는다.
  const { data, error } = await client().from('tasks').select('*').is('deleted_at', null).order('id')
  if (error) fail('업무를 불러오지', error)
  return (data as TaskRow[]).map(rowToTask)
}

export async function fetchMembers(): Promise<string[]> {
  const { data, error } = await client().from('members').select('name').order('id')
  if (error) fail('담당자를 불러오지', error)
  return (data as { name: string }[]).map((m) => m.name)
}

/** 담당자 추가(팀장). 다른 사람이 먼저 같은 이름을 만들었으면(23505) 그대로 성공으로 본다. */
export async function insertMember(name: string): Promise<void> {
  const { error } = await client().from('members').insert({ name })
  if (error && error.code !== '23505') fail('담당자를 추가하지', error)
}

export async function fetchCategories(): Promise<string[]> {
  const { data, error } = await client().from('categories').select('name').order('id')
  if (error) fail('구분을 불러오지', error)
  return (data as { name: string }[]).map((c) => c.name)
}

export async function insertTask(n: NewTaskInput, today: DateStr, editor: string): Promise<Task> {
  const { data, error } = await client()
    .from('tasks')
    .insert(newTaskToRow(n, today, editor))
    .select('*')
    .single()
  if (error) fail('업무를 저장하지', error)
  return rowToTask(data as TaskRow)
}

/** 수정할 때 바뀌는 칸. 상태 · 마지막 상태 변경일은 건드리지 않는다(상태 버튼으로만 바뀐다). */
export function taskToUpdate(n: NewTaskInput, editor: string) {
  return {
    title: n.title,
    category: n.category,
    owner: n.owner,
    start_date: n.start,
    end_date: n.end,
    important: n.important,
    start_hour: n.startHour ?? null,
    end_hour: n.startHour === undefined ? null : (n.endHour ?? null),
    last_editor: editor,
  }
}

export async function updateTask(id: number, n: NewTaskInput, editor: string): Promise<Task> {
  const { data, error } = await client()
    .from('tasks')
    .update(taskToUpdate(n, editor))
    .eq('id', id)
    .is('deleted_at', null)
    .select('*')
    .single()
  if (error) fail('업무를 수정하지', error)
  return rowToTask(data as TaskRow)
}

/** 삭제: 지우지 않고 삭제 표시만 한다. 되돌릴 수 있다. */
export async function deleteTask(id: number, by: string): Promise<void> {
  const { error } = await client()
    .from('tasks')
    .update({ deleted_at: new Date().toISOString(), deleted_by: by })
    .eq('id', id)
    .is('deleted_at', null)
  if (error) fail('업무를 삭제하지', error)
}

/** 삭제 되돌리기 */
export async function restoreTask(id: number): Promise<Task> {
  const { data, error } = await client()
    .from('tasks')
    .update({ deleted_at: null, deleted_by: null })
    .eq('id', id)
    .select('*')
    .single()
  if (error) fail('삭제를 되돌리지', error)
  return rowToTask(data as TaskRow)
}

/** 상태 변경. 변경 기록은 DB 트리거가 남긴다. */
export async function updateStatus(
  id: number,
  status: Status,
  today: DateStr,
  editor: string,
): Promise<Task> {
  const { data, error } = await client()
    .from('tasks')
    .update({ status, last_changed: today, last_editor: editor })
    .eq('id', id)
    .select('*')
    .single()
  if (error) fail('상태를 바꾸지', error)
  return rowToTask(data as TaskRow)
}

/** 구분 추가. 다른 사람이 먼저 같은 이름을 만들었으면(23505) 그대로 성공으로 본다. */
export async function insertCategory(name: string): Promise<void> {
  const { error } = await client().from('categories').insert({ name })
  if (error && error.code !== '23505') fail('구분을 추가하지', error)
}
