import { X } from 'lucide-react'
import { type PropsWithChildren, useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'

interface ModalProps extends PropsWithChildren {
  open: boolean
  title: string
  description?: string
  onClose: () => void
  width?: 'sm' | 'md' | 'lg'
}

export function Modal({ open, title, description, onClose, width = 'md', children }: ModalProps) {
  const titleId = useId()
  const descriptionId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) return
    const previous = document.activeElement as HTMLElement | null
    const dialog = dialogRef.current
    const appRoot = document.getElementById('root')
    const previousAriaHidden = appRoot?.getAttribute('aria-hidden') ?? null
    const previousInert = appRoot?.inert ?? false

    if (appRoot) {
      appRoot.inert = true
      appRoot.setAttribute('aria-hidden', 'true')
    }

    const getFocusable = () => Array.from(dialog?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ) ?? []).filter((element) => element.getAttribute('aria-hidden') !== 'true')

    const focusable = getFocusable()
    ;(focusable[0] ?? dialog)?.focus()

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
        return
      }

      if (event.key !== 'Tab') return
      const elements = getFocusable()
      if (!elements.length) {
        event.preventDefault()
        dialog?.focus()
        return
      }

      const first = elements[0]
      const last = elements[elements.length - 1]
      const active = document.activeElement
      if (event.shiftKey && (active === first || !dialog?.contains(active))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (active === last || !dialog?.contains(active))) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', handleKey)
    document.body.classList.add('modal-open')
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.classList.remove('modal-open')
      if (appRoot) {
        appRoot.inert = previousInert
        if (previousAriaHidden === null) appRoot.removeAttribute('aria-hidden')
        else appRoot.setAttribute('aria-hidden', previousAriaHidden)
      }
      previous?.focus()
    }
  }, [open])

  if (!open) return null

  return createPortal(
    <div className="modal-backdrop" role="presentation" onMouseDown={() => onCloseRef.current()}>
      <div
        className={`modal modal-${width}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        ref={dialogRef}
        tabIndex={-1}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h2 id={titleId}>{title}</h2>
            {description && <p id={descriptionId}>{description}</p>}
          </div>
          <button className="icon-button" type="button" aria-label="关闭" data-tooltip="关闭" onClick={() => onCloseRef.current()}>
            <X aria-hidden="true" />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>,
    document.body,
  )
}

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  danger?: boolean
  onConfirm: () => void
  onClose: () => void
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = '确认',
  danger = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} title={title} onClose={onClose} width="sm">
      <p className="confirm-message">{message}</p>
      <div className="modal-actions">
        <button className="button button-secondary" type="button" onClick={onClose}>
          取消
        </button>
        <button
          className={`button ${danger ? 'button-danger' : 'button-primary'}`}
          type="button"
          onClick={() => {
            onConfirm()
            onClose()
          }}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
