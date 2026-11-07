import { useState, type FormEvent } from 'react'
import { composeCategory, OTHER, OTHER_MAX, splitCategory } from '../category'
import { END_HOURS, START_HOURS, type Task } from '../data'
import { normalizeRange, type DateStr } from '../dates'
import type { User } from '../permissions'

export type NewTask = Omit<Task, 'id' | 'status' | 'lastChanged' | 'lastEditor'>

interface Props {
  members: string[]
  categories: string[]
  today: DateStr
  user: User
  /** 있으면 이 업무를 고치는 양식(처음 칸이 채워져 있다). 없으면 새 업무 쓰기. */
  initial?: Task
  /** 같은 화면에 양식이 둘일 때 칸 id 가 겹치지 않게 하는 앞글자 */
  idPrefix?: string
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
  initial,
  idPrefix = 'new',
  onAddCategory,
  onSubmit,
}: Props) {
  const editing = initial !== undefined
  const init = initial ? splitCategory(initial.category) : null
  // 담당자는 들어간 사람으로 자동. 팀장만 누구 업무로 쓸지(고칠 때는 누구 업무로 옮길지) 고른다.
  const [managerPick, setManagerPick] = useState(initial?.owner ?? members[0] ?? '')
  const owner = user.role === 'member' ? user.name : managerPick
  const [saving, setSaving] = useState(false)
  const [title, setTitle] = useState(initial?.title ?? '')
  const [category, setCategory] = useState(init?.selected ?? '')
  const [otherText, setOtherText] = useState(init?.otherText ?? '') // 「기타」를 골랐을 때 적는 글
  const [start, setStart] = useState<DateStr>(initial?.start ?? today)
  // 종료일을 직접 고치기 전(null)에는 시작일을 그대로 따라간다.
  const [endInput, setEndInput] = useState<DateStr | null>(
    initial && initial.end !== initial.start ? initial.end : null,
  )
  const end = normalizeRange(start, endInput)
  const [important, setImportant] = useState(initial?.important ?? false)
  const [startHour, setStartHour] = useState<number | undefined>(initial?.startHour)
  const [endHour, setEndHour] = useState<number | undefined>(initial?.endHour)
  // 저장된 구분이 버튼 목록에 없으면(드문 경우) 그 구분도 버튼으로 함께 보여 준다.
  const options = category && !categories.includes(category) ? [...categories, category] : categories
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
    const cat = composeCategory(category, otherText)
    if (!cat.ok) return setError(cat.reason)
    if (!start) return setError('시작일을 골라 주세요.')
    setSaving(true)
    const ok = await onSubmit({
      title: title.trim(),
      category: cat.value, // 「기타」는 「기타(글)」로 저장한다

      owner,
      start,
      end,
      important,
      startHour,
      endHour: startHour === undefined ? undefined : endHour,
    })
    setSaving(false)
    if (!ok) return // 저장에 실패하면 입력한 내용을 그대로 둔다.
    setNotice('') // 저장했다는 안내는 화면 아래 알림(토스트)으로 나온다
    setError('')
    if (editing) return // 고치는 양식은 저장하면 닫히므로 칸을 비우지 않는다.
    setTitle('')
    setOtherText('')
    setImportant(false)
    setEndInput(null)
    setStartHour(undefined)
    setEndHour(undefined)
  }

  return (
    <form className="card" onSubmit={submit} aria-label={editing ? '업무 수정' : '새 업무 입력'}>
      <h2>{editing ? '업무 수정' : '새 업무 쓰기'}</h2>

      {user.role === 'manager' && (
        <div className="field">
          <span className="label">
            {editing ? '누구 업무로 둘까요' : '누구 업무로 쓸까요'} <span className="muted">(팀장만)</span>
          </span>
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
        <label className="label" htmlFor={`${idPrefix}-title`}>업무 이름</label>
        <input
          id={`${idPrefix}-title`}
          type="text"
          value={title}
          placeholder="예: 신입 입사 서류 안내"
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div className="field">
        <span className="label">구분</span>
        <div className="buttons">
          {options.map((c) => (
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
        {category === OTHER && (
          <div className="inline other-text">
            <input
              type="text"
              autoFocus
              value={otherText}
              maxLength={OTHER_MAX}
              placeholder={`기타 내용을 적어 주세요 (예: 회식 준비, ${OTHER_MAX}자까지)`}
              aria-label="기타 내용"
              onChange={(e) => setOtherText(e.target.value)}
            />
            <span className="muted">목록에는 「{OTHER}({otherText.trim().replace(/\s+/g, ' ') || '내용'})」로 보입니다.</span>
          </div>
        )}
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
          <label className="label" htmlFor={`${idPrefix}-start`}>시작일</label>
          <input id={`${idPrefix}-start`} type="date" value={start} onChange={(e) => changeStartDate(e.target.value)} />
        </div>
        <div className="field">
          <label className="label" htmlFor={`${idPrefix}-end`}>
            종료일 <span className="muted">(시작일과 같게 채워져 있어요)</span>
          </label>
          <input
            id={`${idPrefix}-end`}
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
        {saving ? '저장 중…' : editing ? '수정 저장' : '저장'}
      </button>
    </form>
  )
}
