export const OTHER = '기타'
export const OTHER_MAX = 20

/**
 * 저장된 구분 글자를 입력 양식의 모습으로 되돌린다(수정할 때 쓴다).
 * 「기타(회식 준비)」 → 버튼 「기타」 + 글 「회식 준비」. 그 밖의 구분은 그대로.
 */
export function splitCategory(value: string): { selected: string; otherText: string } {
  const m = /^기타\((.*)\)$/.exec(value)
  return m ? { selected: OTHER, otherText: m[1] } : { selected: value, otherText: '' }
}

export type CategoryCheck = { ok: true; value: string } | { ok: false; reason: string }

/**
 * 구분 버튼으로 고른 값과 「기타」 설명 글을 저장할 구분 글자로 만든다.
 * 「기타」를 골랐으면 「기타(회식 준비)」처럼 글을 붙이고, 글이 비면 막는다.
 */
export function composeCategory(selected: string, otherText: string): CategoryCheck {
  if (selected !== OTHER) return { ok: true, value: selected }
  const text = otherText.trim().replace(/\s+/g, ' ')
  if (!text) return { ok: false, reason: '「기타」는 어떤 업무인지 한 줄로 적어 주세요.' }
  if (text.length > OTHER_MAX) {
    return { ok: false, reason: `「기타」 내용은 ${OTHER_MAX}자까지 적을 수 있습니다.` }
  }
  return { ok: true, value: `${OTHER}(${text})` }
}
