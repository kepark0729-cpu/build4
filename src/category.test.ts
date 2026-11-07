import { describe, expect, it } from 'vitest'
import { composeCategory, splitCategory } from './category'

describe('저장된 구분을 양식으로 되돌리기', () => {
  it('「기타(글)」는 기타 버튼과 글로 나눈다', () => {
    expect(splitCategory('기타(회식 준비)')).toEqual({ selected: '기타', otherText: '회식 준비' })
  })
  it('다른 구분은 그대로', () => {
    expect(splitCategory('채용')).toEqual({ selected: '채용', otherText: '' })
    expect(splitCategory('기타')).toEqual({ selected: '기타', otherText: '' })
  })
  it('만들었다가 되돌려도 같다', () => {
    const c = composeCategory('기타', '교육 장소 섭외')
    expect(c.ok && splitCategory(c.value)).toEqual({ selected: '기타', otherText: '교육 장소 섭외' })
  })
})

describe('구분 글자 만들기', () => {
  it('기타가 아니면 고른 값 그대로', () => {
    expect(composeCategory('채용', '')).toEqual({ ok: true, value: '채용' })
    expect(composeCategory('채용', '남은 글')).toEqual({ ok: true, value: '채용' })
  })
  it('기타를 고르면 「기타(글)」로 만든다', () => {
    expect(composeCategory('기타', '회식 준비')).toEqual({ ok: true, value: '기타(회식 준비)' })
  })
  it('앞뒤 공백을 지우고 여러 칸 띄어쓰기는 한 칸으로 만든다', () => {
    expect(composeCategory('기타', '  회식   준비 ')).toEqual({ ok: true, value: '기타(회식 준비)' })
  })
  it('기타인데 글이 비면 막는다', () => {
    expect(composeCategory('기타', '').ok).toBe(false)
    expect(composeCategory('기타', '   ').ok).toBe(false)
  })
  it('20자를 넘으면 막고, 20자는 통과한다', () => {
    expect(composeCategory('기타', 'a'.repeat(21)).ok).toBe(false)
    expect(composeCategory('기타', 'a'.repeat(20)).ok).toBe(true)
  })
})
