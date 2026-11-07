import { useState, type FormEvent } from 'react'
import { checkNewMemberName } from '../permissions'

interface Props {
  members: string[]
  /** 저장에 성공하면 true */
  onAdd: (name: string) => Promise<boolean>
}

/** 팀장에게만 보이는 담당자 추가. */
export default function AddMember({ members, onAdd }: Props) {
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (saving) return
    const check = checkNewMemberName(name, members)
    if (!check.ok) {
      setNotice('')
      return setError(check.reason)
    }
    setError('')
    setSaving(true)
    const ok = await onAdd(check.name)
    setSaving(false)
    if (!ok) return // 안내는 위쪽에 나온다. 입력은 그대로 둔다.
    setNotice(`「${check.name}」을(를) 추가했습니다. 들어가기에서 고를 수 있습니다.`)
    setName('')
  }

  return (
    <form className="card" onSubmit={submit} aria-label="담당자 추가">
      <h2>담당자 추가 <span className="muted">(팀장만)</span></h2>
      <div className="inline">
        <input
          type="text"
          value={name}
          placeholder="예: 노무 담당자 D (이름 대신 역할)"
          aria-label="새 담당자 이름"
          onChange={(e) => setName(e.target.value)}
        />
        <button type="submit" disabled={saving}>{saving ? '추가 중…' : '추가'}</button>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      {notice && !error && <p className="notice" role="status">{notice}</p>}
    </form>
  )
}
