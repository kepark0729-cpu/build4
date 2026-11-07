import { useEffect, type ReactNode } from 'react'

interface Props {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}

/** 오른쪽에서 열리는 입력 패널. 닫아도 안에 쓰던 내용은 그대로 남는다(숨기기만 한다). */
export default function Drawer({ open, title, onClose, children }: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <div className="drawer-wrap" hidden={!open}>
      <div className="drawer-backdrop" onClick={onClose} aria-hidden="true" />
      <div className="drawer" role="dialog" aria-modal="true" aria-label={title}>
        <div className="drawer-head">
          <h2>{title}</h2>
          <button type="button" className="ghost" onClick={onClose} aria-label="닫기">
            닫기 (Esc)
          </button>
        </div>
        <div className="drawer-body">{children}</div>
      </div>
    </div>
  )
}
