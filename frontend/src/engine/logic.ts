import type { Field, FlowData, FlowDefinition, Step } from './types'

export function isPresent(v: unknown) {
  if (v === null || v === undefined) return false
  if (typeof v === 'string') return v.trim() !== ''
  if (Array.isArray(v)) return v.length > 0
  return true
}

/** Same rule as the backend: a step with showIf is visible only when the referenced answer matches. */
export function isStepVisible(step: Step, data: FlowData) {
  if (!step.showIf) return true
  const v = data[step.showIf.field]
  return v !== undefined && v !== null && step.showIf.in.includes(String(v))
}

export const visibleSteps = (def: FlowDefinition, data: FlowData) =>
  def.steps.filter((s) => isStepVisible(s, data))

const EMAIL = /^[^@\s]{1,64}@[^@\s]{1,189}\.[^@\s]{2,}$/

/** Ethiopian mobile numbers: 09XXXXXXXX / 07XXXXXXXX / +2519XXXXXXXX / +2517XXXXXXXX. */
export function normaliseEthiopianPhone(value: string): string | null {
  let d = value.replace(/[\s\-().]/g, '')
  if (d.startsWith('+251')) d = d.slice(4)
  else if (d.startsWith('00251')) d = d.slice(5)
  else if (d.startsWith('251') && d.length === 12) d = d.slice(3)
  else if (d.startsWith('0')) d = d.slice(1)
  return /^[79]\d{8}$/.test(d) ? `+251${d}` : null
}

/**
 * Client-side validation mirroring the server (FlowValidator). Returns a translatable error code or null.
 * The server remains the authority; this gives immediate, accessible feedback.
 */
export function validateField(f: Field, value: unknown, now = new Date()): string | null {
  if (!isPresent(value)) {
    if (f.type === 'consent' && f.required) return 'validation.consent'
    return f.required ? 'validation.required' : null
  }
  switch (f.type) {
    case 'text':
    case 'textarea':
    case 'password': {
      const s = String(value)
      const v = f.type === 'password' ? s : s.trim()
      const max = f.maxLength ?? (f.type === 'textarea' ? 2000 : 200)
      if (v.length > max) return 'validation.tooLong'
      if (f.minLength && v.length < f.minLength) return 'validation.tooShort'
      if (f.validator === 'last4' && !/^[A-Za-z0-9]{4}$/.test(v)) return 'validation.last4'
      return null
    }
    case 'email':
      return EMAIL.test(String(value).trim()) ? null : 'validation.email'
    case 'tel':
      return normaliseEthiopianPhone(String(value)) ? null : 'validation.phone'
    case 'year':
    case 'number': {
      const n = Number(String(value).trim())
      if (!Number.isInteger(n)) return 'validation.number'
      if (f.min !== undefined && n < f.min) return 'validation.min'
      const max =
        f.max === undefined ? undefined : f.type === 'year' ? now.getFullYear() + f.max : f.max
      if (max !== undefined && n > max) return 'validation.max'
      return null
    }
    case 'select':
    case 'radio':
      return f.options?.some((o) => o.value === value) ? null : 'validation.option'
    case 'checkboxes':
      return Array.isArray(value) && value.every((v) => f.options?.some((o) => o.value === v))
        ? null
        : 'validation.option'
    case 'consent':
      return value === true || !f.required ? null : 'validation.consent'
    case 'list': {
      if (!Array.isArray(value)) return 'validation.invalid'
      if (value.length > (f.maxItems ?? 10)) return 'validation.tooMany'
      return null
    }
    default:
      return null
  }
}

/** Validates one list entry; returns errors keyed by sub-field id. */
export function validateItem(f: Field, item: FlowData): Record<string, string> {
  const errors: Record<string, string> = {}
  for (const sub of f.itemFields ?? []) {
    const e = validateField(sub, item[sub.id])
    if (e) errors[sub.id] = e
  }
  return errors
}

export function validateStep(step: Step, data: FlowData): Record<string, string> {
  const errors: Record<string, string> = {}
  for (const f of step.fields) {
    const e = validateField(f, data[f.id])
    if (e) errors[f.id] = e
  }
  return errors
}

/** Only answers to visible steps are submitted (matches the server, which drops hidden answers). */
export function collectVisibleData(def: FlowDefinition, data: FlowData): FlowData {
  const out: FlowData = {}
  for (const step of visibleSteps(def, data)) {
    for (const f of step.fields) {
      if (data[f.id] !== undefined) out[f.id] = data[f.id]
    }
  }
  return out
}

export function sensitiveFieldIds(def: FlowDefinition): Set<string> {
  const ids = new Set<string>()
  def.steps.forEach((s) =>
    s.fields.forEach((f) => (f.sensitive || f.type === 'password') && ids.add(f.id)),
  )
  return ids
}

/** Initial values from field defaults and prefill sources (profile, account), never overwriting answers. */
export function initialData(
  def: FlowDefinition,
  sources: Record<string, unknown>,
  existing: FlowData = {},
): FlowData {
  const data: FlowData = { ...existing }
  for (const step of def.steps) {
    for (const f of step.fields) {
      if (data[f.id] !== undefined) continue
      if (f.prefill && isPresent(sources[f.prefill])) data[f.id] = sources[f.prefill]
      else if (f.defaultValue !== undefined) data[f.id] = f.defaultValue
    }
  }
  return data
}
