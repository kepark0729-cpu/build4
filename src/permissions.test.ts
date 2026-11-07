import { describe, expect, it } from 'vitest'
import {
  canEditTask,
  checkNewMemberName,
  editorName,
  resolveUser,
  type User,
} from './permissions'

const manager: User = { role: 'manager' }
const a: User = { role: 'member', name: '채용 담당자 A' }

describe('고칠 수 있는 범위', () => {
  it('팀장은 모든 업무를 고친다', () => {
    expect(canEditTask(manager, { owner: '채용 담당자 A' })).toBe(true)
    expect(canEditTask(manager, { owner: '급여 담당자 B' })).toBe(true)
  })
  it('담당자는 자기 업무만 고친다', () => {
    expect(canEditTask(a, { owner: '채용 담당자 A' })).toBe(true)
    expect(canEditTask(a, { owner: '급여 담당자 B' })).toBe(false)
  })
})

describe('마지막 수정자 이름', () => {
  it('팀장이면 「팀장」, 담당자면 자기 이름', () => {
    expect(editorName(manager)).toBe('팀장')
    expect(editorName(a)).toBe('채용 담당자 A')
  })
})

describe('들어가기 선택 되살리기', () => {
  const members = ['채용 담당자 A', '급여 담당자 B']
  it('팀장 · 담당자 · 모르는 이름을 구분한다', () => {
    expect(resolveUser('팀장', members)).toEqual({ role: 'manager' })
    expect(resolveUser('급여 담당자 B', members)).toEqual({ role: 'member', name: '급여 담당자 B' })
    expect(resolveUser('없는 사람', members)).toBeNull()
    expect(resolveUser(null, members)).toBeNull()
  })
})

describe('새 담당자 이름 규칙', () => {
  const members = ['채용 담당자 A']
  it('앞뒤 공백을 지우고 통과시킨다', () => {
    expect(checkNewMemberName('  노무 담당자 D ', members)).toEqual({ ok: true, name: '노무 담당자 D' })
  })
  it('빈 이름 · 「팀장」 · 같은 이름은 막는다', () => {
    expect(checkNewMemberName('   ', members).ok).toBe(false)
    expect(checkNewMemberName('팀장', members).ok).toBe(false)
    expect(checkNewMemberName('채용 담당자 a', members).ok).toBe(false)
  })
})
