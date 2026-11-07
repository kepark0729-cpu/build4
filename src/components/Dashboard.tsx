import { useMemo, useState } from 'react'
import type { Task } from '../data'
import { isOverdue, isStalled, rangeText, type DateStr } from '../dates'
import { attentionTasks, dueSoon, memberStats, summarize, todayTasks } from '../dashboard'
import { MANAGER, type User } from '../permissions'

interface Props {
  tasks: Task[]
  members: string[]
  user: User
  today: DateStr
  holidays: Set<DateStr>
  onGoList: () => void
}

const SHOW = 6 // 칸마다 먼저 보여 주는 개수

function timeText(t: Task) {
  return t.startHour !== undefined && t.endHour !== undefined ? `${t.startHour}~${t.endHour}시` : ''
}

function MiniList({
  title,
  hint,
  items,
  empty,
  today,
  holidays,
  onGoList,
}: {
  title: string
  hint?: string
  items: Task[]
  empty: string
  today: DateStr
  holidays: Set<DateStr>
  onGoList: () => void
}) {
  const shown = items.slice(0, SHOW)
  return (
    <section className="card dash-list" aria-label={title}>
      <h2>
        {title} <span className="muted">{items.length}건</span>
      </h2>
      {hint && <p className="muted">{hint}</p>}
      {items.length === 0 ? (
        <p className="empty">{empty}</p>
      ) : (
        <ul>
          {shown.map((t) => (
            <li key={t.id}>
              <div className="dl-main">
                <span className="dl-title">
                  {t.important && <span className="star" title="중요">★</span>}
                  {t.title}
                </span>
                {isOverdue(t, today) && <span className="flag overdue">기한 초과</span>}
                {isStalled(t, today, holidays) && <span className="flag stalled">오래 멈춤</span>}
              </div>
              <div className="dl-sub muted">
                {t.owner} · {rangeText(t.start, t.end)}
                {timeText(t) && ` · ${timeText(t)}`}
              </div>
            </li>
          ))}
        </ul>
      )}
      {items.length > SHOW && (
        <button type="button" className="ghost more" onClick={onGoList}>
          외 {items.length - SHOW}건 · 업무 목록에서 보기
        </button>
      )}
    </section>
  )
}

/** 첫 화면: 지금 팀 상황을 한눈에. 숫자 카드, 주의가 필요한 업무, 오늘 · 이번 주 일정, 팀원별 현황. */
export default function Dashboard({ tasks, members, user, today, holidays, onGoList }: Props) {
  // 담당자는 「전체 / 내 업무」를 바꿔 볼 수 있다. 팀장은 전체만.
  const [scope, setScope] = useState<'all' | 'mine'>('all')
  const scoped = useMemo(
    () => (scope === 'mine' && user.role === 'member' ? tasks.filter((t) => t.owner === user.name) : tasks),
    [tasks, scope, user],
  )

  const stats = useMemo(() => summarize(scoped, today, holidays), [scoped, today, holidays])
  const attention = useMemo(() => attentionTasks(scoped, today, holidays), [scoped, today, holidays])
  const todayList = useMemo(() => todayTasks(scoped, today), [scoped, today])
  const soon = useMemo(() => dueSoon(scoped, today), [scoped, today])
  const perMember = useMemo(
    () => memberStats(tasks, members, today, holidays),
    [tasks, members, today, holidays],
  )

  const name = user.role === 'manager' ? MANAGER : user.name

  return (
    <div className="dashboard">
      <div className="dash-hello">
        <p>
          <strong>{name}</strong>님, 오늘 {today} 기준입니다.
          {stats.overdue + stats.stalled > 0
            ? ` 확인이 필요한 업무가 ${attention.length}건 있어요.`
            : ' 밀린 업무가 없습니다.'}
        </p>
        {user.role === 'member' && (
          <div className="buttons small" role="group" aria-label="볼 범위">
            <button type="button" aria-pressed={scope === 'all'} onClick={() => setScope('all')}>
              팀 전체
            </button>
            <button type="button" aria-pressed={scope === 'mine'} onClick={() => setScope('mine')}>
              내 업무만
            </button>
          </div>
        )}
      </div>

      <div className="stat-grid" aria-label="요약">
        <div className="stat s-blue">
          <span className="num">{stats.inProgress}</span>
          <span className="lbl">진행 중</span>
        </div>
        <div className="stat s-red">
          <span className="num">{stats.overdue}</span>
          <span className="lbl">기한 초과</span>
        </div>
        <div className="stat s-amber">
          <span className="num">{stats.stalled}</span>
          <span className="lbl">오래 멈춤</span>
        </div>
        <div className="stat s-green">
          <span className="num">{stats.doneThisWeek}</span>
          <span className="lbl">이번 주 완료</span>
        </div>
      </div>

      <div className="dash-cols">
        <MiniList
          title="주의가 필요한 업무"
          hint="기한이 지났거나 오래 멈춘 업무예요."
          items={attention}
          empty="지금은 없습니다. 👍"
          today={today}
          holidays={holidays}
          onGoList={onGoList}
        />
        <MiniList
          title="오늘 하는 업무"
          items={todayList}
          empty="오늘 하는 업무가 없습니다."
          today={today}
          holidays={holidays}
          onGoList={onGoList}
        />
        <MiniList
          title="이번 주 마감 예정"
          hint="오늘부터 7일 안에 끝나는 업무예요."
          items={soon}
          empty="마감이 다가오는 업무가 없습니다."
          today={today}
          holidays={holidays}
          onGoList={onGoList}
        />

        <section className="card" aria-label="팀원별 현황">
          <h2>팀원별 현황</h2>
          <ul className="member-bars">
            {perMember.map((m) => {
              const pct = (n: number) => (m.total === 0 ? 0 : (n / m.total) * 100)
              return (
                <li key={m.name}>
                  <div className="mb-head">
                    <span className="mb-name">{m.name}</span>
                    <span className="muted">
                      {m.total}건
                      {m.overdue > 0 && <span className="flag overdue">기한 초과 {m.overdue}</span>}
                      {m.stalled > 0 && <span className="flag stalled">오래 멈춤 {m.stalled}</span>}
                    </span>
                  </div>
                  <div
                    className="bar"
                    role="img"
                    aria-label={`완료 ${m.done}, 진행 중 ${m.inProgress}, 멈춤 ${m.paused}`}
                  >
                    <span className="b-done" style={{ width: `${pct(m.done)}%` }} />
                    <span className="b-prog" style={{ width: `${pct(m.inProgress)}%` }} />
                    <span className="b-pause" style={{ width: `${pct(m.paused)}%` }} />
                  </div>
                  <div className="mb-legend muted">
                    완료 {m.done} · 진행 중 {m.inProgress} · 멈춤 {m.paused}
                  </div>
                </li>
              )
            })}
          </ul>
          <button type="button" className="ghost more" onClick={onGoList}>
            업무 목록에서 자세히 보기
          </button>
        </section>
      </div>
    </div>
  )
}
