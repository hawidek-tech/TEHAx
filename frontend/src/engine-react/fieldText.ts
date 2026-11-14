import { useCallback } from 'react'
import { useOptionalT, useT } from '../i18n/useT'
import type { Field, Option } from '../engine/types'

/**
 * Text for a field by convention: flows.<flow>.<field>.label | .hint | .example | .why | .options.<value>.
 * Employer-written custom questions carry a literal `label` instead.
 */
export function useFieldText(ns: string) {
  const t = useT()
  const opt = useOptionalT()
  return useCallback(
    (f: Field) => {
      const base = `${ns}.${f.id}`
      return {
        label: f.label ?? (f.labelKey ? t(f.labelKey) : t(`${base}.label`)),
        hint: f.label ? undefined : opt(`${base}.hint`),
        example: f.label ? undefined : opt(`${base}.example`),
        why: f.label ? undefined : opt(`${base}.why`),
        option: (o: Option) =>
          o.label ?? (o.labelKey ? t(o.labelKey) : t(`${base}.options.${o.value}`)),
      }
    },
    [ns, t, opt],
  )
}

export function useErrorText() {
  const t = useT()
  return useCallback(
    (code: string | undefined, f?: Field) =>
      code ? t(`errors.${code}`, { max: f?.maxLength, min: f?.minLength }) : undefined,
    [t],
  )
}
