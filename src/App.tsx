import { useCallback, useEffect, useMemo, useState } from 'react'
import holidayCsv from '../휴일.csv?raw'
import type { Task } from './data'
import { parseHolidayNames, parseHolidays, todayStr, type Status } from './dates'
import {
  fetchCategories,
  fetchMembers,
  fetchTasks,
  insertCategory,
  insertMember,
  insertTask,
  updateImportant,
  updateStatus,
} from './lib/api'
import { canEditTask, editorName, MANAGER, resolveUser } from './permissions'
import AddMember from './components/AddMember'
import CalendarView from './components/CalendarView'
import EntryScreen from './components/EntryScreen'
import TaskForm, { type NewTask } from './components/TaskForm'
import TeamList from './components/TeamList'

const SAVED_KEY = 'team-board-entry'

// 들어가기 선택을 이 브라우저에 기억한다(새로 고침해도 같은 사람). 막혀 있어도 동작은 그대로다.
function readSaved(): string | null {
  try {
    return localStorage.getItem(SAVED_KEY)
  } catch {
    return null
  }
}
function writeSaved(who: string | null) {
  try {
    if (who === null) localStorage.removeItem(SAVED_KEY)
    else localStorage.setItem(SAVED_KEY, who)
  } catch {
    /* 기억하지 못해도 괜찮다 */
  }
}

function messageOf(e: unknown) {
  return e instanceof Error ? e.message : '알 수 없는 문제가 생겼습니다.'
}

export default function App() {
  const today = useMemo(() => todayStr(), [])
  const holidays = useMemo(() => parseHolidays(holidayCsv), [])
  const holidayNames = useMemo(() => parseHolidayNames(holidayCsv), [])
  const [view, setView] = useState<'work' | 'calendar'>('work')
  const [tasks, setTasks] = useState<Task[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [members, setMembers] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [actionError, setActionError] = useState('')
  const [saved, setSaved] = useState<string | null>(readSaved)

  // 들어가기에서 고른 사람. 담당자 목록에 없는 이름이면 다시 고르게 한다.
  const user = useMemo(() => resolveUser(saved, members), [saved, members])

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const [t, c, m] = await Promise.all([fetchTasks(), fetchCategories(), fetchMembers()])
      setTasks(t)
      setCategories(c)
      setMembers(m)
    } catch (e) {
      setLoadError(messageOf(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  function enter(who: string | null) {
    writeSaved(who)
    setSaved(who)
    setActionError('')
  }

  // 저장에 성공한 뒤에만 화면에 반영한다. 실패하면 안내 한 줄을 보이고 화면은 그대로 둔다.
  async function addTask(n: NewTask): Promise<boolean> {
    if (!user) return false
    setActionError('')
    try {
      const savedTask = await insertTask(n, today, editorName(user))
      setTasks((prev) => [...prev, savedTask])
      return true
    } catch (e) {
      setActionError(messageOf(e))
      return false
    }
  }

  async function changeStatus(id: number, status: Status) {
    if (!user) return
    const current = tasks.find((t) => t.id === id)
    if (!current || current.status === status) return // 같은 상태를 다시 눌러도 변경일은 그대로다.
    setActionError('')
    try {
      const savedTask = await updateStatus(id, status, today, editorName(user))
      setTasks((prev) => prev.map((t) => (t.id === id ? savedTask : t)))
    } catch (e) {
      setActionError(messageOf(e))
    }
  }

  async function changeImportant(id: number, important: boolean) {
    if (!user) return
    const current = tasks.find((t) => t.id === id)
    if (!current || current.important === important || !canEditTask(user, current)) return
    setActionError('')
    try {
      const savedTask = await updateImportant(id, important)
      setTasks((prev) => prev.map((t) => (t.id === id ? savedTask : t)))
    } catch (e) {
      setActionError(messageOf(e))
    }
  }

  async function addCategory(name: string): Promise<boolean> {
    setActionError('')
    try {
      await insertCategory(name)
      setCategories((c) => (c.some((x) => x.toLowerCase() === name.toLowerCase()) ? c : [...c, name]))
      return true
    } catch (e) {
      setActionError(messageOf(e))
      return false
    }
  }

  async function addMember(name: string): Promise<boolean> {
    setActionError('')
    try {
      await insertMember(name)
      setMembers((m) => (m.some((x) => x.toLowerCase() === name.toLowerCase()) ? m : [...m, name]))
      return true
    } catch (e) {
      setActionError(messageOf(e))
      return false
    }
  }

  return (
    <main>
      <header>
        <h1>팀 업무 공유판</h1>
        <p className="muted">
          오늘 {today} · 가상 데이터로 시연합니다. 다른 사람이 쓴 내용은 새로 고침하면 보입니다.
        </p>
        {user && (
          <p className="userbar" role="status">
            <strong>{user.role === 'manager' ? MANAGER : user.name}</strong>
            {user.role === 'manager' ? '(관리자)' : ''} 기준으로 보는 중 ·{' '}
            <button type="button" className="ghost" onClick={() => enter(null)}>
              바꾸기
            </button>
          </p>
        )}
      </header>

      {actionError && (
        <p className="error" role="alert">
          {actionError}
        </p>
      )}

      {loading ? (
        <p className="muted" role="status">불러오는 중…</p>
      ) : loadError ? (
        <div className="card">
          <p className="error" role="alert">{loadError}</p>
          <button type="button" onClick={() => void load()}>다시 불러오기</button>
        </div>
      ) : !user ? (
        <EntryScreen members={members} onPick={enter} />
      ) : (
        <>
          <nav className="tabs buttons" aria-label="화면 선택">
            <button type="button" aria-pressed={view === 'work'} onClick={() => setView('work')}>
              업무
            </button>
            <button type="button" aria-pressed={view === 'calendar'} onClick={() => setView('calendar')}>
              캘린더
            </button>
          </nav>

          {/* 두 화면을 오가도 쓰던 내용과 고른 보기가 그대로 남도록 숨기기만 한다. */}
          <div hidden={view !== 'work'}>
            <TaskForm
              members={members}
              categories={categories}
              today={today}
              user={user}
              onAddCategory={addCategory}
              onSubmit={addTask}
            />

            {user.role === 'manager' && <AddMember members={members} onAdd={addMember} />}

            <TeamList
              members={members}
              tasks={tasks}
              today={today}
              holidays={holidays}
              user={user}
              onChangeStatus={changeStatus}
            />
          </div>

          <div hidden={view !== 'calendar'}>
            <CalendarView
              tasks={tasks}
              members={members}
              user={user}
              today={today}
              holidayNames={holidayNames}
              onChangeImportant={changeImportant}
            />
          </div>
        </>
      )}
    </main>
  )
}
