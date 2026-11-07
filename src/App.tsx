import { useCallback, useEffect, useMemo, useState } from 'react'
import holidayCsv from '../휴일.csv?raw'
import type { Task } from './data'
import { parseHolidayNames, parseHolidays, todayStr, type Status } from './dates'
import {
  deleteTask,
  fetchCategories,
  fetchMembers,
  fetchTasks,
  insertCategory,
  insertMember,
  insertTask,
  restoreTask,
  updateStatus,
  updateTask,
} from './lib/api'
import { canEditTask, editorName, resolveUser } from './permissions'
import AddMember from './components/AddMember'
import CalendarView from './components/CalendarView'
import Dashboard from './components/Dashboard'
import Drawer from './components/Drawer'
import EntryScreen from './components/EntryScreen'
import Sidebar, { type View } from './components/Sidebar'
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

const DEMO_NOTICE =
  '가상 데이터로 시연합니다. 실제 직원 정보는 입력하지 마세요. 다른 사람이 쓴 내용은 새로 고침하면 보입니다.'

const TITLES: Record<View, string> = {
  dashboard: '대시보드',
  work: '업무 목록',
  calendar: '캘린더',
  members: '담당자 관리',
}

interface Toast {
  text: string
  action?: { label: string; run: () => void }
}

export default function App() {
  const today = useMemo(() => todayStr(), [])
  const holidays = useMemo(() => parseHolidays(holidayCsv), [])
  const holidayNames = useMemo(() => parseHolidayNames(holidayCsv), [])
  const [view, setView] = useState<View>('dashboard') // 첫 화면은 대시보드
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<Task | null>(null)
  const [toast, setToast] = useState<Toast | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [members, setMembers] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
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

  // 알림(토스트)은 잠깐 보였다가 저절로 사라진다. 「되돌리기」가 있으면 조금 더 오래 둔다.
  useEffect(() => {
    if (!toast) return
    const id = window.setTimeout(() => setToast(null), toast.action ? 7000 : 3500)
    return () => window.clearTimeout(id)
  }, [toast])

  // 화면을 그대로 둔 채(쓰던 내용 · 고른 보기 유지) 최신 내용으로 다시 읽는다.
  async function refresh() {
    setRefreshing(true)
    setActionError('')
    try {
      const [t, c, m] = await Promise.all([fetchTasks(), fetchCategories(), fetchMembers()])
      setTasks(t)
      setCategories(c)
      setMembers(m)
      setToast({ text: '최신 내용으로 새로 고쳤습니다.' })
    } catch (e) {
      setActionError(messageOf(e))
    } finally {
      setRefreshing(false)
    }
  }

  function closeDrawer() {
    setDrawerOpen(false)
    setEditing(null)
  }

  function enter(who: string | null) {
    writeSaved(who)
    setSaved(who)
    setActionError('')
    closeDrawer()
    setView('dashboard')
  }

  function openNew() {
    setEditing(null)
    setDrawerOpen(true)
    // 열리면 바로 업무 이름부터 쓸 수 있게 한다.
    window.setTimeout(() => document.getElementById('new-title')?.focus(), 30)
  }

  function openEdit(task: Task) {
    if (!user || !canEditTask(user, task)) return
    setEditing(task)
    setDrawerOpen(true)
  }

  // 저장에 성공한 뒤에만 화면에 반영한다. 실패하면 안내 한 줄을 보이고 쓰던 내용은 그대로 둔다.
  async function addTask(n: NewTask): Promise<boolean> {
    if (!user) return false
    setActionError('')
    try {
      const savedTask = await insertTask(n, today, editorName(user))
      setTasks((prev) => [...prev, savedTask])
      closeDrawer()
      setToast({ text: `「${n.title}」 업무를 저장했습니다. (${n.owner})` })
      return true
    } catch (e) {
      setActionError(messageOf(e))
      return false
    }
  }

  async function saveEdit(n: NewTask): Promise<boolean> {
    if (!user || !editing || !canEditTask(user, editing)) return false
    setActionError('')
    try {
      const savedTask = await updateTask(editing.id, n, editorName(user))
      setTasks((prev) => prev.map((t) => (t.id === savedTask.id ? savedTask : t)))
      closeDrawer()
      setToast({ text: `「${n.title}」 업무를 수정했습니다.` })
      return true
    } catch (e) {
      setActionError(messageOf(e))
      return false
    }
  }

  // 삭제는 지우지 않고 삭제 표시만 해서, 알림의 「되돌리기」로 바로 살릴 수 있다.
  async function removeTask(task: Task) {
    if (!user || !canEditTask(user, task)) return
    setActionError('')
    try {
      await deleteTask(task.id, editorName(user))
      setTasks((prev) => prev.filter((t) => t.id !== task.id))
      setToast({
        text: `「${task.title}」 업무를 삭제했습니다.`,
        action: {
          label: '되돌리기',
          run: () => {
            void (async () => {
              try {
                const back = await restoreTask(task.id)
                setTasks((prev) => (prev.some((t) => t.id === back.id) ? prev : [...prev, back].sort((a, b) => a.id - b.id)))
                setToast({ text: `「${task.title}」 업무를 되돌렸습니다.` })
              } catch (e) {
                setActionError(messageOf(e))
              }
            })()
          },
        },
      })
    } catch (e) {
      setActionError(messageOf(e))
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
      setToast({ text: `「${current.title}」 → ${status}` })
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

  // 들어가기 전(또는 불러오는 중 · 실패)에는 메뉴 없이 가운데 한 장만 보인다.
  if (loading || loadError || !user) {
    return (
      <div className="app solo">
        <div className="main-col">
        <div className="demo-banner">{DEMO_NOTICE}</div>
        <main className="content">
          <div className="page-head">
            <h1>팀 업무 공유판</h1>
            <span className="muted">오늘 {today}</span>
          </div>
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
          ) : (
            <EntryScreen members={members} onPick={enter} />
          )}
        </main>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <Sidebar
        user={user}
        view={view}
        onView={setView}
        onNew={openNew}
        onSwitch={() => enter(null)}
        onRefresh={() => void refresh()}
        refreshing={refreshing}
        today={today}
      />

      <div className="main-col">
      <div className="demo-banner">{DEMO_NOTICE}</div>
      <main className="content">
        <div className="page-head">
          <h1>{TITLES[view]}</h1>
        </div>

        {actionError && (
          <p className="error" role="alert">
            {actionError}
          </p>
        )}

        {view === 'dashboard' && (
          <Dashboard
            tasks={tasks}
            members={members}
            user={user}
            today={today}
            holidays={holidays}
            onGoList={() => setView('work')}
          />
        )}

        {view === 'work' && (
          <TeamList
            members={members}
            tasks={tasks}
            today={today}
            holidays={holidays}
            user={user}
            onChangeStatus={changeStatus}
            onEdit={openEdit}
            onDelete={(t) => void removeTask(t)}
          />
        )}

        {/* 캘린더는 고른 보기 · 기간 · 팀원이 오갈 때 사라지지 않도록 숨기기만 한다. */}
        <div hidden={view !== 'calendar'}>
          <CalendarView
            tasks={tasks}
            members={members}
            user={user}
            today={today}
            holidayNames={holidayNames}
          />
        </div>

        {view === 'members' && user.role === 'manager' && (
          <>
            <AddMember members={members} onAdd={addMember} />
            <section className="card" aria-label="현재 담당자">
              <h2>현재 담당자 <span className="muted">{members.length}명</span></h2>
              <div className="buttons">
                {members.map((m) => (
                  <span className="chip" key={m}>{m}</span>
                ))}
              </div>
            </section>
          </>
        )}
      </main>
      </div>

      <Drawer open={drawerOpen} title={editing ? '업무 수정' : '새 업무 쓰기'} onClose={closeDrawer}>
        {/* 새 업무 양식은 고치는 동안에도 숨겨 둘 뿐이라 쓰던 내용이 남는다. */}
        <div hidden={editing !== null}>
          <TaskForm
            idPrefix="new"
            members={members}
            categories={categories}
            today={today}
            user={user}
            onAddCategory={addCategory}
            onSubmit={addTask}
          />
        </div>
        {editing && (
          <TaskForm
            key={editing.id}
            idPrefix="edit"
            initial={editing}
            members={members}
            categories={categories}
            today={today}
            user={user}
            onAddCategory={addCategory}
            onSubmit={saveEdit}
          />
        )}
      </Drawer>

      {toast && (
        <div className="toast" role="status">
          {toast.text}
          {toast.action && (
            <button type="button" className="toast-action" onClick={toast.action.run}>
              {toast.action.label}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
