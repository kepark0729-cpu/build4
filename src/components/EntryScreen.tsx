import { MANAGER } from '../permissions'

interface Props {
  members: string[]
  onPick: (who: string) => void
}

/** 비밀번호 없는 시연용 들어가기. 고른 사람 기준으로 화면이 열린다. */
export default function EntryScreen({ members, onPick }: Props) {
  return (
    <section className="card" aria-label="들어가기">
      <h2>누구로 들어갈까요?</h2>
      <p className="muted">시연용이라 비밀번호는 없습니다. 고른 사람 기준으로 화면이 열립니다.</p>
      <div className="buttons entry">
        <button type="button" className="manager" onClick={() => onPick(MANAGER)}>
          {MANAGER}
        </button>
        {members.map((m) => (
          <button type="button" key={m} onClick={() => onPick(m)}>
            {m}
          </button>
        ))}
      </div>
    </section>
  )
}
