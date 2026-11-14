import { Pencil } from 'lucide-react'
import type { RefObject } from 'react'
import { Button } from '../design-system/Button'
import { useT } from '../i18n/useT'
import { visibleSteps } from '../engine/logic'
import type { Field, FlowData, FlowDefinition } from '../engine/types'
import { useFieldText } from './fieldText'

/** "Check your answers": every visible answer with a Change button, before anything is submitted. */
export function ReviewStep({
  def,
  ns,
  data,
  onChange,
  headingRef,
}: {
  def: FlowDefinition
  ns: string
  data: FlowData
  onChange: (stepId: string) => void
  headingRef: RefObject<HTMLHeadingElement | null>
}) {
  const t = useT()
  const text = useFieldText(ns)

  const display = (f: Field): string => {
    const v = data[f.id]
    const tx = text(f)
    if (v === undefined || v === '' || (Array.isArray(v) && v.length === 0))
      return t('flow.notAnswered')
    if (f.type === 'password') return '••••••••'
    if (f.type === 'consent') return v ? t('app.yes') : t('app.no')
    if (f.type === 'file') return String(data[`${f.id}__name`] ?? t('flow.fileDefaultName'))
    if (f.type === 'select' || f.type === 'radio')
      return tx.option(f.options?.find((o) => o.value === v) ?? { value: String(v) })
    if (f.type === 'checkboxes')
      return (v as string[])
        .map((x) => tx.option(f.options?.find((o) => o.value === x) ?? { value: x }))
        .join(', ')
    if (f.type === 'list') return t('flow.listCount', { count: (v as unknown[]).length })
    return String(v)
  }

  return (
    <div className="af-enter flex flex-col gap-5">
      <h2 ref={headingRef} tabIndex={-1} className="text-2xl font-bold sm:text-3xl">
        {t('flow.reviewTitle')}
      </h2>
      <p className="text-lg text-muted">{t('flow.reviewLead')}</p>
      <dl className="flex flex-col divide-y divide-line rounded-2xl border-2 border-line bg-surface">
        {visibleSteps(def, data).flatMap((step) =>
          step.fields.map((f) => (
            // A <dl> may only contain div > (dt + dd); the Change button therefore lives inside the dd.
            <div key={f.id} className="flex flex-col gap-1 p-4">
              <dt className="font-semibold text-muted">{text(f).label}</dt>
              <dd className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <span className="whitespace-pre-line text-lg">{display(f)}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<Pencil size={16} aria-hidden="true" />}
                  onClick={() => onChange(step.id)}
                >
                  {t('flow.change')}
                  <span className="sr-only">: {text(f).label}</span>
                </Button>
              </dd>
            </div>
          )),
        )}
      </dl>
    </div>
  )
}
