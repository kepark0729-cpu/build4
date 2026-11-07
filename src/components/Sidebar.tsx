import type { ReactNode } from 'react'
import { MANAGER, type User } from '../permissions'

export type View = 'dashboard' | 'work' | 'calendar' | 'members'

interface Props {
  user: User
  view: View
  onView: (v: View) => void
  onNew: () => void
  onSwitch: () => void
  onRefresh: () => void
  refreshing: boolean
  today: string
}

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  )
}

/** 왼쪽 메뉴: 누구로 보는 중인지, 새 업무 쓰기, 화면 이동, 새로 고침. */
export default function Sidebar({ user, view, onView, onNew, onSwitch, onRefresh, refreshing, today }: Props) {
  const name = user.role === 'manager' ? MANAGER : user.name
  const items: { id: View; label: string; icon: ReactNode }[] = [
    {
      id: 'dashboard',
      label: '대시보드',
      icon: (
        <Icon>
          <rect x="3" y="3" width="7" height="9" rx="1.5" />
          <rect x="14" y="3" width="7" height="5" rx="1.5" />
          <rect x="14" y="12" width="7" height="9" rx="1.5" />
          <rect x="3" y="16" width="7" height="5" rx="1.5" />
        </Icon>
      ),
    },
    {
      id: 'work',
      label: '업무 목록',
      icon: (
        <Icon>
          <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
        </Icon>
      ),
    },
    {
      id: 'calendar',
      label: '캘린더',
      icon: (
        <Icon>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M16 3v4M8 3v4M3 11h18" />
        </Icon>
      ),
    },
  ]
  if (user.role === 'manager') {
    items.push({
      id: 'members',
      label: '담당자 관리',
      icon: (
        <Icon>
          <circle cx="9" cy="8" r="3.5" />
          <path d="M2.5 20c.6-3.5 3.2-5.5 6.5-5.5s5.9 2 6.5 5.5M17 11a3 3 0 1 0 0-6M18.5 14.7c1.7.7 2.8 2.3 3 4.3" />
        </Icon>
      ),
    })
  }

  return (
    <aside className="sidebar" aria-label="메뉴">
      <div className="brand">
        <span className="logo" aria-hidden="true">
          ✓
        </span>
        팀 업무 공유판
      </div>

      <div className="who">
        <span className="avatar" aria-hidden="true">
          {name.slice(0, 1)}
        </span>
        <div>
          <div className="who-name">{name}</div>
          <div className="who-role">{user.role === 'manager' ? '관리자' : '담당자'}로 보는 중</div>
        </div>
        <button type="button" className="ghost" onClick={onSwitch}>
          바꾸기
        </button>
      </div>

      <button type="button" className="btn-new" onClick={onNew}>
        <Icon>
          <path d="M12 5v14M5 12h14" />
        </Icon>
        새 업무 쓰기
      </button>

      <nav className="nav" aria-label="화면 이동">
        {items.map((it) => (
          <button
            type="button"
            key={it.id}
            aria-current={view === it.id ? 'page' : undefined}
            onClick={() => onView(it.id)}
          >
            {it.icon}
            {it.label}
          </button>
        ))}
      </nav>

      <div className="side-foot">
        <button type="button" className="ghost refresh" onClick={onRefresh} disabled={refreshing}>
          <Icon>
            <path d="M21 12a9 9 0 1 1-3-6.7M21 4v5h-5" />
          </Icon>
          {refreshing ? '불러오는 중…' : '새로 고침'}
        </button>
        <span>오늘 {today}</span>
      </div>
    </aside>
  )
}
