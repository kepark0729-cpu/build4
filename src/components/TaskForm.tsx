import { useState, type FormEvent } from 'react'
import { END_HOURS, START_HOURS, type Task } from '../data'
import { normalizeRange, type DateStr } from '../dates'
import type { User } from '../permissions'

export type NewTask = Omit<Task, 'id' | 'status' | 'lastChanged' | 'lastEditor'>

interface Props {
  members: string[]
  categories: string[]
  today: DateStr
  user: User
  /** 저장에 성공하면 true */
  onAddCategory: (name: string) => Promise<boolean>
  /** 저장에 성공하면 true */
  onSubmit: (t: NewTask) => Promise<boolean>
}

export default function TaskForm({
  members,
  categories,
  today,
  user,
  onAddCategory,
  onSubmit,
}: Props) {
  // 담당자는 들어간 사람으로 자동. 팀장만 누구 업무로 쓸지 고른다.
  const [managerPick, setManagerPick] = useState(members[0] ?? '')
  const owner = user.role === 'member' ? user.name : managerPick
  const [saving, setSaving] = useState(false)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [start, setStart] = useState<DateStr>(today)
  // 종료일을 직접 고치기 전(null)에는 시작일을 그대로 따라간다.
  const [endInput, setEndInput] = useState<DateStr | null>(null)
  const end = normalizeRange(start, endInput)
  const [important, setImportant] = useState(false)
  const [startHour, setStartHour] = useState<number | undefined>()
  const [endHour, setEndHour] = useState<number | undefined>()
  const [adding, setAdding] = useState(false)
  const [newCategory, setNewCategory] = useState('')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  function changeStartDate(v: DateStr) {
    setStart(v)
    // 시작일이 직접 고른 종료일보다 뒤로 가면 종료일을 다시 시작일에 맞춘다.
    if (endInput && endInput < v) setEndInput(null)
  }

  function pickStart(h: number) {
    const next = startHour === h ? undefined : h
    setStartHour(next)
    // 시작보다 이르거나 같은 종료 시간은 지운다. 시작을 풀면 종료도 푼다.
    if (next === undefined || (endHour !== undefined && endHour <= next)) setEndHour(undefined)
  }

  async function addCategory() {
    const name = newCategory.trim()
    if (!name || saving) return
    const existing = categories.find((c) => c.toLowerCase() === name.toLowerCase())
    if (existing) {
      setCategory(existing)
      setNotice(`「${existing}」은 이미 있어서 그 버튼을 골랐습니다.`)
    } else {
      setSaving(true)
      const ok = await onAddCategory(name)
      setSaving(false)
      if (!ok) return // 안내는 위쪽에 나온다. 입력은 그대로 두어 다시 눌러 볼 수 있다.
      setCategory(name)
      setNotice(`「${name}」 버튼을 만들었습니다.`)
    }
    setNewCategory('')
    setAdding(false)
    setError('')
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (saving) return
    if (!owner) return setError('담당자가 없습니다. 담당자를 먼저 추가해 주세요.')
    if (!title.trim()) return setError('업무 이름을 적어 주세요.')
    if (!category) return setError('구분 버튼을 하나 눌러 주세요.')
    if (!start) return setError('시작일을 골라 주세요.')
    setSaving(true)
    const ok = await onSubmit({
      title: title.trim(),
      category,
      owner,
      start,
      end,
      important,
      startHour,
      endHour: startHour === undefined ? undefined : endHour,
    })
    setSaving(false)
    if (!ok) return // 저장에 실패하면 입력한 내용을 그대로 둔다.
    setNotice(`「${title.trim()}」을(를) 저장했습니다.`)
    setError('')
    setTitle('')
    setImportant(false)
    setEndInput(null)
    setStartHour(undefined)
    setEndHour(undefined)
  }

  return (
    <form className="card" onSubmit={submit} aria-label="새 업무 입력">
      <h2>새 업무 쓰기</h2>

      {user.role === 'manager' && (
        <div className="field">
          <span className="label">누구 업무로 쓸까요 <span className="muted">(팀장만)</span></span>
          <div className="buttons">
            {members.map((m) => (
              <button type="button" key={m} aria-pressed={owner === m} onClick={() => setManagerPick(m)}>
                {m}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="field">
        <label className="label" htmlFor="title">업무 이름</label>
        <input
          id="title"
          type="text"
          value={title}
          placeholder="예: 신입 입사 서류 안내"
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div className="field">
        <span className="label">구분</span>
        <div className="buttons">
          {categories.map((c) => (
            <button type="button" key={c} aria-pressed={category === c} onClick={() => setCategory(c)}>
              {c}
            </button>
          ))}
          {!adding && (
            <button type="button" className="ghost" onClick={() => setAdding(true)}>
              + 추가
            </button>
          )}
        </div>
        {adding && (
          <div className="inline">
            <input
              type="text"
              autoFocus
              value={newCategory}
              placeholder="새 구분 이름"
              aria-label="새 구분 이름"
              onChange={(e) => setNewCategory(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void addCategory()
                }
              }}
            />
            <button type="button" disabled={saving} onClick={() => void addCategory()}>만들기</button>
            <button type="button" className="ghost" onClick={() => { setAdding(false); setNewCategory('') }}>
              취소
            </button>
          </div>
        )}
      </div>

      <div className="row">
        <div className="field">
          <label className="label" htmlFor="start">시작일</label>
          <input id="start" type="date" value={start} onChange={(e) => changeStartDate(e.target.value)} />
        </div>
        <div className="field">
          <label className="label" htmlFor="end">
            종료일 <span className="muted">(시작일과 같게 채워져 있어요)</span>
          </label>
          <input
            id="end"
            type="date"
            value={end}
            min={start || undefined}
            onChange={(e) => setEndInput(e.target.value || null)}
          />
        </div>
        <label className="check">
          <input type="checkbox" checked={important} onChange={(e) => setImportant(e.target.checked)} />
          중요
        </label>
      </div>

      <div className="field">
        <span className="label">시간 <span className="muted">(선택 · 시작일~종료일 매일, 시간 단위)</span></span>
        <div className="time-row">
          <span className="muted">시작</span>
          <div className="buttons small">
            {START_HOURS.map((h) => (
              <button type="button" key={h} aria-pressed={startHour === h} onClick={() => pickStart(h)}>
                {h}시
              </button>
            ))}
          </div>
        </div>
        <div className="time-row">
          <span className="muted">종료</span>
          <div className="buttons small">
            {END_HOURS.map((h) => (
              <button
                type="button"
                key={h}
                aria-pressed={endHour === h}
                disabled={startHour === undefined || h <= startHour}
                onClick={() => setEndHour(endHour === h ? undefined : h)}
              >
                {h}시
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && <p className="error" role="alert">{error}</p>}
      {notice && !error && <p className="notice" role="status">{notice}</p>}

      <button type="submit" className="primary" disabled={saving}>
        {saving ? '저장 중…' : '저장'}
      </button>
    </form>
  )
}
