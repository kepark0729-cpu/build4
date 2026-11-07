import type { Task } from '../data'
import { isOverdue, isStalled, rangeText, type DateStr, type Status } from '../dates'
import { canEditTask, type User } from '../permissions'

const STATUSES: Status[] = ['진행 중', '멈춤', '완료']

interface Props {
  members: string[]
  tasks: Task[]
  today: DateStr
  holidays: Set<DateStr>
  user: User
  onChangeStatus: (id: number, status: Status) => void
}

function timeText(t: Task) {
  return t.startHour !== undefined && t.endHour !== undefined
    ? `${t.startHour}~${t.endHour}시`
    : ''
}

export default function TeamList({ members, tasks, today, holidays, user, onChangeStatus }: Props) {
  return (
    <section aria-label="팀 업무 목록">
      <h2>팀 업무</h2>
      {members.map((m) => {
        const mine = tasks.filter((t) => t.owner === m)
        return (
          <div className="card" key={m}>
            <h3>
              {m} <span className="muted">· {mine.length}건</span>
            </h3>
            {mine.length === 0 && <p className="muted">아직 쓴 업무가 없습니다.</p>}
            <ul className="tasks">
              {mine.map((t) => {
                const overdue = isOverdue(t, today)
                const stalled = isStalled(t, today, holidays)
                const editable = canEditTask(user, t)
                return (
                  <li key={t.id} data-status={t.status}>
                    <div className="task-main">
                      <span className="task-title">
                        {t.important && <span className="star" title="중요">★</span>}
                        {t.title}
                      </span>
                      <span className="chip">{t.category}</span>
                      <span className="muted">
                        {rangeText(t.start, t.end)}
                        {timeText(t) && ` · ${timeText(t)}`}
                      </span>
                      {overdue && <span className="flag overdue">기한 초과</span>}
                      {stalled && <span className="flag stalled">오래 멈춤</span>}
                      <span className="muted edited">마지막 수정 {t.lastEditor}</span>
                    </div>
                    {editable ? (
                      <div className="buttons small" role="group" aria-label={`${t.title} 상태`}>
                        {STATUSES.map((s) => (
                          <button
                            type="button"
                            key={s}
                            aria-pressed={t.status === s}
                            onClick={() => onChangeStatus(t.id, s)}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <span className="status-view" aria-label={`${t.title} 상태`}>
                        {t.status}
                      </span>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        )
      })}
    </section>
  )
}
