import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../design-system/Button'
import { FieldError, FieldSupport } from '../design-system/Field'
import { VoiceInput } from '../a11y/VoiceInput'
import { useAnnounce } from '../a11y/announcer'
import { useT } from '../i18n/useT'
import { validateItem } from '../engine/logic'
import { voiceEnabled, type Field, type FlowData } from '../engine/types'
import { FieldControl } from './FieldControl'
import { useErrorText, useFieldText } from './fieldText'

/** Repeatable entries (education, work experience): add, edit and remove one entry at a time. */
export function ListField({
  field,
  ns,
  value,
  onChange,
  baseId,
}: {
  field: Field
  ns: string
  value: unknown
  onChange: (v: FlowData[]) => void
  baseId: string
}) {
  const t = useT()
  const announce = useAnnounce()
  const text = useFieldText(`${ns}.${field.id}.items`)
  const errText = useErrorText()
  const items = (Array.isArray(value) ? value : []) as FlowData[]
  const [editing, setEditing] = useState<number | null>(null)
  const [draft, setDraft] = useState<FlowData>({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  const startAdd = () => {
    setDraft({})
    setErrors({})
    setEditing(items.length)
  }
  const save = () => {
    const e = validateItem(field, draft)
    setErrors(e)
    if (Object.keys(e).length) {
      announce(t('flow.errorSummaryTitle'), 'assertive')
      return
    }
    const next = [...items]
    next[editing!] = Object.fromEntries(
      Object.entries(draft).filter(([, v]) => v !== '' && v !== undefined),
    )
    onChange(next)
    setEditing(null)
    announce(t('flow.listSaved'))
  }
  const summary = (item: FlowData) =>
    (field.itemFields ?? [])
      .filter((f) => item[f.id] !== undefined && f.type !== 'textarea')
      .map((f) =>
        f.options
          ? text(f).option(
              f.options.find((o) => o.value === item[f.id]) ?? { value: String(item[f.id]) },
            )
          : String(item[f.id]),
      )
      .join(' · ')

  return (
    <div className="flex flex-col gap-4">
      {items.length === 0 && editing === null && (
        <p className="text-muted">{t('flow.listEmpty')}</p>
      )}
      {items.length > 0 && (
        <ul className="flex flex-col gap-3">
          {items.map((item, i) =>
            editing === i ? null : (
              <li
                key={i}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-line bg-surface-2 px-4 py-3"
              >
                <span className="font-semibold">
                  {summary(item) || t('flow.listItem', { n: i + 1 })}
                </span>
                <span className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<Pencil size={16} aria-hidden="true" />}
                    onClick={() => {
                      setDraft(item)
                      setErrors({})
                      setEditing(i)
                    }}
                  >
                    {t('app.edit')}
                    <span className="sr-only">: {summary(item)}</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<Trash2 size={16} aria-hidden="true" />}
                    onClick={() => {
                      onChange(items.filter((_, j) => j !== i))
                      announce(t('flow.listRemoved'))
                    }}
                  >
                    {t('app.remove')}
                    <span className="sr-only">: {summary(item)}</span>
                  </Button>
                </span>
              </li>
            ),
          )}
        </ul>
      )}
      {editing !== null ? (
        <fieldset className="flex flex-col gap-5 rounded-2xl border-2 border-primary p-4">
          <legend className="px-2 text-lg font-bold">
            {t('flow.listItem', { n: editing + 1 })}
          </legend>
          {(field.itemFields ?? []).map((sub) => {
            const tx = text(sub)
            const id = `${baseId}-${sub.id}`
            const meta = {
              id,
              hint: tx.hint,
              example: tx.example,
              error: errText(errors[sub.id], sub),
            }
            const inFieldset = sub.type === 'radio' || sub.type === 'checkboxes'
            return (
              <div key={sub.id} className="flex flex-col gap-2">
                {!inFieldset && (
                  <label htmlFor={id} className="text-lg font-semibold">
                    {tx.label}
                    {!sub.required && (
                      <span className="ml-2 font-normal text-muted">({t('app.optional')})</span>
                    )}
                  </label>
                )}
                <FieldSupport meta={meta} />
                <FieldError meta={meta} />
                <FieldControl
                  field={sub}
                  value={draft[sub.id]}
                  onChange={(v) => setDraft((d) => ({ ...d, [sub.id]: v }))}
                  meta={meta}
                  optionLabel={tx.option}
                  label={tx.label}
                />
                {voiceEnabled(sub) && (
                  <VoiceInput
                    question={tx.label}
                    currentValue={String(draft[sub.id] ?? '')}
                    multiline={sub.type === 'textarea'}
                    onAccept={(v) => setDraft((d) => ({ ...d, [sub.id]: v }))}
                  />
                )}
              </div>
            )
          })}
          <div className="flex flex-wrap gap-3">
            <Button onClick={save}>{t('flow.listSave')}</Button>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              {t('app.cancel')}
            </Button>
          </div>
        </fieldset>
      ) : (
        items.length < (field.maxItems ?? 10) && (
          <Button
            variant="secondary"
            icon={<Plus size={20} aria-hidden="true" />}
            onClick={startAdd}
          >
            {items.length ? t('flow.listAddAnother') : t('flow.listAdd')}
          </Button>
        )
      )}
    </div>
  )
}
