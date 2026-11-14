import { X } from 'lucide-react'
import { useEffect, useId, useRef, type ReactNode } from 'react'
import { useT } from '../i18n/useT'

interface Props {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  actions?: ReactNode
}

/**
 * Modal dialog built on the native <dialog> element: the browser provides focus trapping, Escape to close,
 * and inertness of the page behind. Focus returns to the element that opened it.
 */
export function Dialog({ open, title, onClose, children, actions }: Props) {
  const t = useT()
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const opener = useRef<Element | null>(null)

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) {
      opener.current = document.activeElement
      if (typeof d.showModal === 'function') d.showModal()
      else d.setAttribute('open', '')
    } else if (!open && d.open) {
      d.close()
      if (opener.current instanceof HTMLElement) opener.current.focus()
    }
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      className="m-auto w-[min(40rem,calc(100vw-2rem))] max-h-[calc(100vh-2rem)] rounded-2xl border-2 border-line bg-surface p-0 text-ink shadow-2xl backdrop:bg-black/60"
    >
      {open && (
        <div className="flex flex-col gap-4 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <h2 id={titleId} className="text-xl font-bold">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="af-transition inline-flex min-h-11 items-center gap-1 rounded-lg px-3 font-semibold hover:bg-surface-2"
            >
              <X aria-hidden="true" size={20} />
              {t('app.close')}
            </button>
          </div>
          <div>{children}</div>
          {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
        </div>
      )}
    </dialog>
  )
}
