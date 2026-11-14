import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import { describedBy, inputClass, type FieldMeta } from '../design-system/Field'
import { useT } from '../i18n/useT'
import type { Field, Option } from '../engine/types'

interface Props {
  field: Field
  value: unknown
  onChange: (v: unknown) => void
  meta: FieldMeta
  optionLabel: (o: Option) => string
  /** Visible label text for controls rendered inside a fieldset (radio/checkbox) or with their own <label>. */
  label: string
  labelHidden?: boolean
}

/**
 * Native, accessible form controls only (no custom widgets): input, textarea, select, radio, checkbox.
 * Large text and 48px+ targets. Errors are linked through aria-describedby and aria-invalid.
 */
export function FieldControl({
  field: f,
  value,
  onChange,
  meta,
  optionLabel,
  label,
  labelHidden,
}: Props) {
  const t = useT()
  const [showPassword, setShowPassword] = useState(false)
  const invalid = Boolean(meta.error)
  const common = {
    id: meta.id,
    'aria-describedby': describedBy(meta),
    'aria-invalid': invalid || undefined,
    'aria-required': f.required || undefined,
  }
  const str = value === undefined || value === null ? '' : String(value)

  switch (f.type) {
    case 'textarea':
      return (
        <textarea
          {...common}
          rows={5}
          value={str}
          maxLength={f.maxLength}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputClass(invalid)} py-3`}
        />
      )
    case 'select':
      return (
        <select
          {...common}
          value={str}
          onChange={(e) => onChange(e.target.value || undefined)}
          className={`${inputClass(invalid)} min-h-14`}
        >
          <option value="">{t('flow.selectPlaceholder')}</option>
          {f.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {optionLabel(o)}
            </option>
          ))}
        </select>
      )
    case 'radio':
    case 'checkboxes': {
      const multi = f.type === 'checkboxes'
      const selected = multi ? ((value as string[] | undefined) ?? []) : str
      return (
        <fieldset
          aria-describedby={describedBy(meta)}
          aria-invalid={invalid || undefined}
          className="flex flex-col gap-3"
        >
          <legend className={labelHidden ? 'sr-only' : 'mb-2 text-lg font-semibold'}>
            {label}
          </legend>
          {f.options?.map((o, i) => {
            const id = `${meta.id}-${i}`
            const checked = multi ? (selected as string[]).includes(o.value) : selected === o.value
            return (
              <label
                key={o.value}
                htmlFor={id}
                className={`af-transition flex min-h-14 cursor-pointer items-center gap-4 rounded-xl border-2 px-4 py-3 text-lg ${
                  checked
                    ? 'border-primary bg-primary-soft font-semibold'
                    : 'border-field bg-surface hover:border-primary'
                }`}
              >
                <input
                  id={id}
                  type={multi ? 'checkbox' : 'radio'}
                  name={meta.id}
                  value={o.value}
                  checked={checked}
                  onChange={(e) => {
                    if (!multi) return onChange(o.value)
                    const cur = new Set(selected as string[])
                    if (e.target.checked) cur.add(o.value)
                    else cur.delete(o.value)
                    onChange(f.options!.map((x) => x.value).filter((v) => cur.has(v)))
                  }}
                  className="size-6 shrink-0 accent-[var(--af-primary)]"
                />
                <span>{optionLabel(o)}</span>
              </label>
            )
          })}
        </fieldset>
      )
    }
    case 'consent':
      return (
        <label
          htmlFor={meta.id}
          className="flex min-h-14 cursor-pointer items-start gap-4 rounded-xl border-2 border-field bg-surface px-4 py-3 text-lg"
        >
          <input
            {...common}
            type="checkbox"
            checked={value === true}
            onChange={(e) => onChange(e.target.checked)}
            className="mt-1 size-6 shrink-0 accent-[var(--af-primary)]"
          />
          <span>{label}</span>
        </label>
      )
    case 'password':
      return (
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            {...common}
            type={showPassword ? 'text' : 'password'}
            autoComplete={f.autocomplete}
            value={str}
            onChange={(e) => onChange(e.target.value)}
            className={`${inputClass(invalid)} min-h-14`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            aria-pressed={showPassword}
            className="af-transition inline-flex min-h-14 shrink-0 items-center justify-center gap-2 rounded-xl border-2 border-primary px-4 font-semibold text-primary hover:bg-primary-soft"
          >
            {showPassword ? (
              <EyeOff aria-hidden="true" size={20} />
            ) : (
              <Eye aria-hidden="true" size={20} />
            )}
            {showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
          </button>
        </div>
      )
    default: {
      const type = f.type === 'email' ? 'email' : f.type === 'tel' ? 'tel' : 'text'
      const inputMode =
        f.type === 'year' || f.type === 'number' ? 'numeric' : f.type === 'tel' ? 'tel' : undefined
      return (
        <input
          {...common}
          type={type}
          inputMode={inputMode}
          autoComplete={f.autocomplete ?? 'off'}
          value={str}
          maxLength={f.maxLength}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputClass(invalid)} min-h-14`}
        />
      )
    }
  }
}
