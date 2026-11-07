// 시연용 권한. 로그인이 아니라 「들어가기」에서 고른 사람 기준으로 화면에서만 나눈다.
// 실제 제한은 로그인을 붙일 때 저장소 규칙(RLS)으로 건다.

export const MANAGER = '팀장'

export type User = { role: 'manager' } | { role: 'member'; name: string }

/** 팀장은 모든 업무, 담당자는 자기 업무만 고칠 수 있다. */
export function canEditTask(user: User, task: { owner: string }): boolean {
  return user.role === 'manager' || task.owner === user.name
}

/** 마지막 수정자 · 변경 기록의 바꾼 사람에 쓰는 이름. 팀장이면 「팀장」. */
export function editorName(user: User): string {
  return user.role === 'manager' ? MANAGER : user.name
}

/** 들어가기에서 고른 값(저장해 둔 글자)을 사람으로 바꾼다. 담당자 목록에 없으면 null. */
export function resolveUser(saved: string | null, members: string[]): User | null {
  if (saved === MANAGER) return { role: 'manager' }
  if (saved && members.includes(saved)) return { role: 'member', name: saved }
  return null
}

export type MemberNameCheck = { ok: true; name: string } | { ok: false; reason: string }

/** 새 담당자 이름 규칙: 앞뒤 공백 제거, 비면 안 됨, 「팀장」 불가, 같은 이름(대소문자 무시) 불가. */
export function checkNewMemberName(raw: string, existing: string[]): MemberNameCheck {
  const name = raw.trim()
  if (!name) return { ok: false, reason: '담당자 이름을 적어 주세요.' }
  if (name === MANAGER) return { ok: false, reason: '「팀장」은 담당자 이름으로 쓸 수 없습니다.' }
  if (existing.some((m) => m.toLowerCase() === name.toLowerCase())) {
    return { ok: false, reason: `「${name}」은 이미 있는 담당자입니다.` }
  }
  return { ok: true, name }
}
