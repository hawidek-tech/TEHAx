import { Hand, MessageCircleQuestion } from 'lucide-react'
import { useState } from 'react'
import { SignLanguageDialog } from '../a11y/sign/SignLanguageDialog'
import type { RefObject } from 'react'
import { ReadAloud } from '../a11y/ReadAloud'
import { VoiceInput } from '../a11y/VoiceInput'
import { VoiceAnswer } from '../a11y/VoiceAnswer'
import { useAudioGuide } from '../a11y/audioGuide'
import { usePreferences } from '../a11y/preferences'
import { Button } from '../design-system/Button'
import { FieldError, FieldSupport } from '../design-system/Field'
import { FieldIcon } from '../design-system/Icon'
import { useT } from '../i18n/useT'
import { voiceEnabled, type Field, type FlowData } from '../engine/types'
import { FieldControl } from './FieldControl'
import { FileField } from './FileField'
import { ListField } from './ListField'
import { useErrorText, useFieldText } from './fieldText'

interface Props {
  field: Field
  ns: string
  data: FlowData
  error?: string
  onChange: (id: string, value: unknown) => void
  headingRef: RefObject<HTMLHeadingElement | null>
  onHelp: (field: Field, label: string) => void
}

/**
 * One question per screen. The question text is the step heading (focused on arrival so screen readers
 * read it), and also the label of the control. Hint, example, why-we-ask, voice input and read-aloud
 * are all attached to the same question.
 */
export function QuestionStep({ field, ns, data, error, onChange, headingRef, onHelp }: Props) {
  const t = useT()
  const { prefs } = usePreferences()
  const [signOpen, setSignOpen] = useState(false)
  const guide = useAudioGuide()
  const text = useFieldText(ns)(field)
  const errText = useErrorText()
  const id = `q-${field.id}`
  const meta = {
    id,
    hint: text.hint,
    example: text.example,
    why: text.why,
    error: errText(error, field),
  }
  const value = data[field.id]
  const usesFieldset = field.type === 'radio' || field.type === 'checkboxes'
  const readText = [
    text.label,
    text.hint,
    text.example && `${t('flow.example')}: ${text.example}`,
    meta.error,
  ]
    .filter(Boolean)
    .join('. ')

  const signFirst = prefs.usageMode === 'sign'
  const signControl = (field.type === 'text' || field.type === 'textarea') &&
    field.voice !== false && (
      <>
        <Button
          variant={signFirst ? 'primary' : 'secondary'}
          size={signFirst ? 'md' : 'sm'}
          icon={<Hand size={18} aria-hidden="true" />}
          onClick={() => setSignOpen(true)}
        >
          {t('sign.open')}
        </Button>
        {signOpen && (
          <SignLanguageDialog
            open
            question={text.label}
            currentValue={value === undefined ? '' : String(value)}
            onClose={() => setSignOpen(false)}
            onAccept={(v) => onChange(field.id, v)}
          />
        )}
      </>
    )

  return (
    <div className="af-enter flex flex-col gap-5">
      <div className="flex items-start gap-4">
        <FieldIcon name={field.icon} />
        <div className="flex flex-col gap-1">
          <h2
            ref={headingRef}
            tabIndex={-1}
            className="text-2xl font-bold leading-snug sm:text-3xl"
          >
            {usesFieldset ||
            field.type === 'list' ||
            field.type === 'consent' ||
            field.type === 'file' ? (
              text.label
            ) : (
              <label htmlFor={id}>{text.label}</label>
            )}
          </h2>
          {!field.required && field.type !== 'consent' && (
            <p className="font-semibold text-muted">{t('flow.optionalQuestion')}</p>
          )}
        </div>
      </div>

      <FieldSupport meta={meta} />
      <FieldError meta={meta} />

      {field.type === 'list' ? (
        <ListField
          field={field}
          ns={ns}
          value={value}
          baseId={id}
          onChange={(v) => onChange(field.id, v)}
        />
      ) : field.type === 'file' ? (
        <FileField
          meta={meta}
          purpose={field.filePurpose ?? 'IDENTITY_DOCUMENT'}
          value={value}
          name={data[`${field.id}__name`] as string | undefined}
          onChange={(fid, name) => {
            onChange(field.id, fid)
            onChange(`${field.id}__name`, name)
          }}
        />
      ) : (
        <FieldControl
          field={field}
          value={value}
          onChange={(v) => onChange(field.id, v)}
          meta={meta}
          optionLabel={text.option}
          label={field.type === 'consent' ? t(`${ns}.${field.id}.statement`) : text.label}
          labelHidden={usesFieldset}
        />
      )}

      <div className="flex flex-wrap items-center gap-3">
        {/* "I use sign language or pictures": picture phrases come first (in reading order too) and are larger. */}
        {signFirst && signControl}
        {voiceEnabled(field) && (
          <VoiceInput
            question={text.label}
            currentValue={value === undefined ? '' : String(value)}
            multiline={field.type === 'textarea'}
            onAccept={(v) => onChange(field.id, v)}
          />
        )}
        {!signFirst && signControl}
        {/* Choices, yes/no and consent can be answered by voice too: say the number or the name. */}
        {(field.type === 'radio' ||
          field.type === 'select' ||
          field.type === 'checkboxes' ||
          field.type === 'consent') && (
          <VoiceAnswer
            prominent={guide.active}
            options={(field.options ?? []).map((o) => ({ value: o.value, label: text.option(o) }))}
            onOption={(v) => {
              if (field.type === 'checkboxes') {
                const current = Array.isArray(value) ? (value as string[]) : []
                onChange(
                  field.id,
                  current.includes(v) ? current.filter((x) => x !== v) : [...current, v],
                )
              } else onChange(field.id, v)
            }}
            onYes={field.type === 'consent' ? () => onChange(field.id, true) : undefined}
            onNo={field.type === 'consent' ? () => onChange(field.id, false) : undefined}
          />
        )}
        <ReadAloud text={readText} />
        <Button
          variant="ghost"
          size="sm"
          icon={<MessageCircleQuestion size={18} aria-hidden="true" />}
          onClick={() => onHelp(field, text.label)}
        >
          {t('flow.getHelp')}
        </Button>
      </div>
      {prefs.keyboardFirst && (
        <p className="rounded-lg bg-surface-2 px-3 py-2 text-sm">{t('flow.keyboardTip')}</p>
      )}
    </div>
  )
}
