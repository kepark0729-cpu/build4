import { useMemo, useState } from 'react'
import {
  monthWeeks,
  periodLabel,
  sameMonth,
  shiftAnchor,
  sortForDay,
  tasksOnDay,
  visibleTasks,
  weekDays,
  type CalendarMode,
  type KindFilter,
} from '../calendar'
import type { Task } from '../data'
import { dayOfWeek, type DateStr } from '../dates'
import { canEditTask, type User } from '../permissions'

const DOW = ['일', '월', '화', '수', '목', '금', '토']
const COLORS = 8 // 담당자마다 색 8가지를 돌려 쓴다 (CSS 의 m0~m7)

interface Props {
  tasks: Task[]
  members: string[]
  user: User
  today: DateStr
  holidayNames: Map<DateStr, string>
  onChangeImportant: (id: number, important: boolean) => void
}

function timeText(t: Task) {
  return t.startHour !== undefined && t.endHour !== undefined ? `${t.startHour}~${t.endHour}시` : ''
}

/** 올린 업무를(중요는 ★ 표시, 「중요만 보기」로 걸러 보기) 월간 · 주간으로 보여 주는 캘린더. 팀원 이름 버튼으로 여러 명을 함께 고른다. */
export default function CalendarView({ tasks, members, user, today, holidayNames, onChangeImportant }: Props) {
  const [mode, setMode] = useState<CalendarMode>('month')
  const [anchor, setAnchor] = useState<DateStr>(today)
  // 처음: 담당자는 자기 버튼, 팀장은 모든 팀원이 눌려 있다.
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(user.role === 'member' ? [user.name] : members),
  )

  const [kinds, setKinds] = useState<KindFilter>({ important: true, normal: true })

  const weeks = useMemo(() => (mode === 'month' ? monthWeeks(anchor) : [weekDays(anchor)]), [mode, anchor])
  const shown = useMemo(() => visibleTasks(tasks, selected, kinds), [tasks, selected, kinds])
  const periodCount = useMemo(
    () => new Set(weeks.flat().flatMap((d) => tasksOnDay(shown, d).map((t) => t.id))).size,
    [weeks, shown],
  )

  function toggle(name: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  const allSelected = members.length > 0 && members.every((m) => selected.has(m))

  return (
    <section className="card" aria-label="캘린더">
      <div className="cal-bar">
        <div className="buttons" role="group" aria-label="보기 선택">
          <button type="button" aria-pressed={mode === 'month'} onClick={() => setMode('month')}>
            월간
          </button>
          <button type="button" aria-pressed={mode === 'week'} onClick={() => setMode('week')}>
            주간
          </button>
        </div>
        <div className="buttons" role="group" aria-label="기간 옮기기">
          <button type="button" onClick={() => setAnchor((a) => shiftAnchor(a, mode, -1))}>
            이전
          </button>
          <button type="button" onClick={() => setAnchor(today)}>
            오늘
          </button>
          <button type="button" onClick={() => setAnchor((a) => shiftAnchor(a, mode, 1))}>
            다음
          </button>
        </div>
        <strong className="period" aria-live="polite">
          {periodLabel(anchor, mode)}
        </strong>
      </div>

      <div className="field">
        <span className="label">
          팀원 <span className="muted">(여러 명을 함께 눌러 겹쳐 볼 수 있어요)</span>
        </span>
        <div className="buttons" role="group" aria-label="팀원 선택">
          {members.map((m, i) => (
            <button
              type="button"
              key={m}
              className={`member m${i % COLORS}`}
              aria-pressed={selected.has(m)}
              onClick={() => toggle(m)}
            >
              <span className="dot" aria-hidden="true" />
              {m}
            </button>
          ))}
          <button
            type="button"
            className="ghost"
            onClick={() => setSelected(allSelected ? new Set() : new Set(members))}
          >
            {allSelected ? '전체 해제' : '전체 선택'}
          </button>
        </div>
        <div className="buttons" role="group" aria-label="업무 종류">
          <label>
            <input
              type="checkbox"
              checked={kinds.important}
              onChange={(e) => setKinds((k) => ({ ...k, important: e.target.checked }))}
            />{' '}
            ★ 중요 업무
          </label>
          <label>
            <input
              type="checkbox"
              checked={kinds.normal}
              onChange={(e) => setKinds((k) => ({ ...k, normal: e.target.checked }))}
            />{' '}
            일반 업무
          </label>
        </div>
        <p className="muted">
          보고 싶은 종류에 체크하세요. 둘 다 체크하면 전부 보이고, 중요 업무는 ★ 로 표시됩니다. 내 업무의 ☆ / ★ 를 눌러 중요 표시를 바로 바꿀 수 있어요(팀장은 모든 업무). 시작일부터 종료일까지
          날짜마다 나옵니다.
        </p>
      </div>

      <div className="cal-scroll">
        <div className={`cal-grid ${mode}`} role="grid" aria-label={periodLabel(anchor, mode)}>
          {DOW.map((d, i) => (
            <div key={d} role="columnheader" className={`cal-dow${i === 0 ? ' sun' : i === 6 ? ' sat' : ''}`}>
              {d}
            </div>
          ))}
          {weeks.flat().map((day) => {
            const holiday = holidayNames.get(day)
            const dow = dayOfWeek(day)
            const outside = mode === 'month' && !sameMonth(day, anchor)
            const items = sortForDay(tasksOnDay(shown, day))
            const [, m, d] = day.split('-').map(Number)
            const cls = [
              'cal-cell',
              day === today ? 'today' : '',
              outside ? 'outside' : '',
              holiday || dow === 0 ? 'off' : '',
              !holiday && dow === 6 ? 'sat' : '',
            ]
              .filter(Boolean)
              .join(' ')
            return (
              <div key={day} role="gridcell" className={cls} aria-label={day}>
                <div className="cal-date">
                  <span className="num">{d === 1 || mode === 'week' ? `${m}/${d}` : d}</span>
                  {day === today && <span className="today-tag">오늘</span>}
                  {holiday && <span className="holiday">{holiday}</span>}
                </div>
                <div className="cal-items">
                  {items.map((t) => (
                    <div
                      key={t.id}
                      className={`ct m${Math.max(0, members.indexOf(t.owner)) % COLORS}`}
                      title={`${t.owner} · ${t.title}${timeText(t) ? ` · ${timeText(t)}` : ''}`}
                    >
                      <span className="ct-title">
                        {canEditTask(user, t) ? (
                          <button
                            type="button"
                            className="ghost"
                            style={{ padding: '0 2px', minHeight: 0, border: 0 }}
                            aria-pressed={t.important}
                            aria-label={`${t.title} 중요 표시 ${t.important ? '끄기' : '켜기'}`}
                            title={t.important ? '중요 해제' : '중요로 표시'}
                            onClick={() => onChangeImportant(t.id, !t.important)}
                          >
                            {t.important ? '★' : '☆'}
                          </button>
                        ) : (
                          t.important && <span aria-label="중요">★ </span>
                        )}
                        {timeText(t) && <span className="ct-time">{timeText(t)}</span>}
                        {t.title}
                      </span>
                      <span className="ct-owner">{t.owner}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {periodCount === 0 && (
        <p className="muted" role="status">
          이 기간에 보여 줄 업무가 없습니다. 팀원 버튼이나 기간을 바꿔 보세요.
        </p>
      )}
    </section>
  )
}
