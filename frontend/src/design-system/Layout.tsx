import type { ReactNode } from 'react'

/** Page heading. data-page-heading receives focus on navigation so screen readers announce the new page. */
export function PageHeader({
  title,
  lead,
  actions,
  eyebrow,
}: {
  title: string
  lead?: ReactNode
  actions?: ReactNode
  eyebrow?: string
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:mb-8">
      {eyebrow && (
        <p className="text-sm font-bold uppercase tracking-wide text-primary">{eyebrow}</p>
      )}
      <h1
        data-page-heading
        tabIndex={-1}
        className="text-3xl font-extrabold leading-tight sm:text-4xl"
      >
        {title}
      </h1>
      {lead && (
        <div data-page-lead className="max-w-2xl text-lg text-muted">
          {lead}
        </div>
      )}
      {actions && <div className="mt-1 flex flex-wrap gap-3">{actions}</div>}
    </div>
  )
}

export function Card({
  children,
  className = '',
  as: As = 'div',
}: {
  children: ReactNode
  className?: string
  as?: 'div' | 'section' | 'article' | 'li'
}) {
  return <As className={`af-card p-5 sm:p-6 ${className}`}>{children}</As>
}

export function Badge({
  children,
  tone = 'neutral',
  announce,
}: {
  children: ReactNode
  tone?: 'neutral' | 'primary' | 'success' | 'warning' | 'danger'
  /** Include this badge in what the audio guide reads for the page. */
  announce?: boolean
}) {
  const cls = {
    neutral: 'bg-surface-2 text-ink',
    primary: 'bg-primary-soft text-primary',
    success: 'bg-success-soft text-success',
    warning: 'bg-warning-soft text-warning-ink',
    danger: 'bg-danger-soft text-danger',
  }[tone]
  return (
    <span
      data-announce={announce || undefined}
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold ${cls}`}
    >
      {children}
    </span>
  )
}

export function Loading({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-8 text-muted" role="status">
      <span
        className="size-6 animate-spin rounded-full border-4 border-primary border-t-transparent"
        aria-hidden="true"
      />
      <span>{label}</span>
    </div>
  )
}

export function EmptyState({
  title,
  children,
  action,
}: {
  title: string
  children?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="af-card flex flex-col items-start gap-3 border-dashed p-6">
      <p className="text-lg font-bold">{title}</p>
      {children && <div className="text-muted">{children}</div>}
      {action}
    </div>
  )
}

/** Progress shown as text AND a bar, so it never relies on visuals alone. */
export function ProgressBar({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max === 0 ? 0 : Math.round((value / max) * 100)
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-sm font-semibold">
        <span>{label}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
        <div
          className="af-transition h-full rounded-full bg-primary"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
