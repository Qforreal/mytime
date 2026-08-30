import { CheckCircle2, Info, X } from 'lucide-react'
import { useEffect } from 'react'

export interface ToastMessage {
  id: number
  text: string
  type?: 'success' | 'info'
}

interface ToastProps {
  toast: ToastMessage | null
  onClose: () => void
}

export function Toast({ toast, onClose }: ToastProps) {
  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(onClose, 3200)
    return () => window.clearTimeout(timer)
  }, [toast, onClose])

  if (!toast) return null

  return (
    <div className="toast" role="status" aria-live="polite">
      {toast.type === 'info' ? <Info aria-hidden="true" /> : <CheckCircle2 aria-hidden="true" />}
      <span>{toast.text}</span>
      <button type="button" className="toast-close" aria-label="关闭提示" onClick={onClose}>
        <X aria-hidden="true" />
      </button>
    </div>
  )
}
