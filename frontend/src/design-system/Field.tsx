import { AlertCircle, HelpCircle, Lightbulb } from 'lucide-react'
import type { ReactNode } from 'react'
import { useT } from '../i18n/useT'

export interface FieldMeta {
  id: string
  hint?: string
  example?: string
  why?: string
  error?: string
}

/** ids for aria-describedby: hint, example and error are all read with the field. */
export function describedBy(meta: FieldMeta) {
  return (
    [
      meta.hint && `${meta.id}-hint`,
      meta.example && `${meta.id}-example`,
      meta.error && `${meta.id}-error`,
    ]
      .filter(Boolean)
      .join(' ') || undefined
  )
}

/** Hint, example, "why we ask" and error text shown under a question. Icons always accompany text. */
export function FieldSupport({ meta }: { meta: FieldMeta }) {
  const t = useT()
  return (
    <div className="flex flex-col gap-2">
      {meta.hint && (
        <p id={`${meta.id}-hint`} className="text-base text-muted">
          {meta.hint}
        </p>
      )}
      {meta.example && (
        <p
          id={`${meta.id}-example`}
          className="flex items-start gap-2 rounded-lg bg-surface-2 px-3 py-2 text-base"
        >
          <Lightbulb aria-hidden="true" size={20} className="mt-0.5 shrink-0 text-accent" />
          <span>
            <span className="font-semibold">{t('flow.example')}: </span>
            {meta.example}
          </span>
        </p>
      )}
      {meta.why && (
        <details className="rounded-lg border border-line px-3 py-2">
          <summary className="flex min-h-11 cursor-pointer items-center gap-2 font-semibold text-primary">
            <HelpCircle aria-hidden="true" size={20} />
            {t('flow.whyWeAsk')}
          </summary>
          <p className="mt-1 pb-1">{meta.why}</p>
        </details>
      )}
    </div>
  )
}

export function FieldError({ meta }: { meta: FieldMeta }) {
  if (!meta.error) return null
  return (
    <p
      id={`${meta.id}-error`}
      className="flex items-start gap-2 rounded-lg bg-danger-soft px-3 py-2 font-semibold text-danger"
    >
      <AlertCircle aria-hidden="true" size={20} className="mt-0.5 shrink-0" />
      <span>{meta.error}</span>
    </p>
  )
}

export const inputClass = (invalid: boolean) =>
  `af-transition w-full rounded-xl border-2 bg-surface px-4 text-lg text-ink placeholder:text-muted ${
    invalid ? 'border-danger' : 'border-field'
  } focus:border-primary`

/** Simple labelled field for ordinary (non-flow) forms such as sign-in and employer forms. */
export function FormField({
  id,
  label,
  hint,
  error,
  required,
  children,
}: {
  id: string
  label: string
  hint?: string
  error?: string
  required?: boolean
  children: ReactNode
}) {
  const t = useT()
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-lg font-semibold">
        {label}
        {!required && (
          <span className="ml-2 text-base font-normal text-muted">({t('app.optional')})</span>
        )}
      </label>
      {hint && (
        <p id={`${id}-hint`} className="text-muted">
          {hint}
        </p>
      )}
      {children}
      <FieldError meta={{ id, error }} />
    </div>
  )
}
