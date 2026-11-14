import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react'
import type { ReactNode } from 'react'

type Tone = 'info' | 'success' | 'warning' | 'error'

const tones: Record<Tone, { cls: string; Icon: typeof Info }> = {
  info: { cls: 'bg-primary-soft text-ink border-primary', Icon: Info },
  success: { cls: 'bg-success-soft text-ink border-success', Icon: CheckCircle2 },
  warning: { cls: 'bg-warning-soft text-ink border-warning-ink', Icon: AlertTriangle },
  error: { cls: 'bg-danger-soft text-ink border-danger', Icon: XCircle },
}

/**
 * Inline message. Not a live region by default - announcements go through the shared announcer so that
 * messages are not read twice. Messages never disappear on a timer.
 */
export function Alert({
  tone = 'info',
  title,
  children,
  action,
}: {
  tone?: Tone
  title?: string
  children?: ReactNode
  action?: ReactNode
}) {
  const { cls, Icon } = tones[tone]
  return (
    <div className={`flex gap-3 rounded-xl border-l-4 p-4 ${cls}`}>
      <Icon aria-hidden="true" size={22} className="mt-0.5 shrink-0" />
      <div className="flex flex-1 flex-col gap-1">
        {title && <p className="font-bold">{title}</p>}
        {children && <div>{children}</div>}
        {action && <div className="mt-2">{action}</div>}
      </div>
    </div>
  )
}
