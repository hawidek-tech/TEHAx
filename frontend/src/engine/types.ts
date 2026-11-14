/** Flow definitions - identical shape to the backend's FlowDefinition (ADR 0003). */
export type FieldType =
  | 'text'
  | 'textarea'
  | 'password'
  | 'email'
  | 'tel'
  | 'year'
  | 'number'
  | 'date'
  | 'select'
  | 'radio'
  | 'checkboxes'
  | 'consent'
  | 'file'
  | 'list'

export interface Option {
  value: string
  labelKey?: string
  label?: string
}

export interface Field {
  id: string
  type: FieldType
  labelKey?: string
  label?: string
  icon?: string
  required?: boolean
  voice?: boolean
  sensitive?: boolean
  autocomplete?: string
  minLength?: number
  maxLength?: number
  min?: number
  max?: number
  maxItems?: number
  validator?: string
  options?: Option[]
  prefill?: string
  defaultValue?: unknown
  itemFields?: Field[]
  filePurpose?: string
}

export interface Condition {
  field: string
  in: string[]
}

export interface Step {
  id: string
  section: string
  showIf?: Condition
  fields: Field[]
}

export interface FlowDefinition {
  key: string
  version: number
  sections: string[]
  steps: Step[]
  requireOneOf?: string[]
}

export type FlowData = Record<string, unknown>

/** Text-entry types that get voice input (passwords, files and choice controls do not). */
export const VOICE_TYPES: FieldType[] = ['text', 'textarea', 'email', 'tel', 'year', 'number']

export const voiceEnabled = (f: Field) => f.voice !== false && VOICE_TYPES.includes(f.type)
