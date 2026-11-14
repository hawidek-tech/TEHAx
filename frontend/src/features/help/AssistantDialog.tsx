import { Bot, LifeBuoy, Send } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { Link } from 'react-router'
import { usePreferences } from '../../a11y/preferences'
import { useAnnounce } from '../../a11y/announcer'
import { ReadAloud } from '../../a11y/ReadAloud'
import { VoiceInput } from '../../a11y/VoiceInput'
import { Alert } from '../../design-system/Alert'
import { Button } from '../../design-system/Button'
import { Dialog } from '../../design-system/Dialog'
import { inputClass } from '../../design-system/Field'
import { useT } from '../../i18n/useT'
import { ApiError, NetworkError, api } from '../../lib/api'
import type { AssistantAnswer } from '../../lib/types'

interface Props {
  open: boolean
  onClose: () => void
  flowKey?: string
  fieldId?: string
  fieldLabel?: string
  topic?: string
  /** PUBLIC text to explain, e.g. a job description. Never personal data. */
  contextText?: string
}

/**
 * Optional help assistant. It explains; it never fills in answers, submits, or decides anything.
 * - Approved help articles are always shown (works with no AI at all, and offline-cached).
 * - An AI answer is requested only if the user ticks consent for THIS question; personal details are
 *   removed on the server before anything is sent to the external AI service.
 * - A human support route is always offered.
 */
export function AssistantDialog({
  open,
  onClose,
  flowKey,
  fieldId,
  fieldLabel,
  topic,
  contextText,
}: Props) {
  const t = useT()
  const announce = useAnnounce()
  const { prefs } = usePreferences()
  const qid = useId()
  const [question, setQuestion] = useState(
    contextText
      ? t('help.defaultJobQuestion')
      : fieldLabel
        ? t('help.defaultQuestion', { question: fieldLabel })
        : '',
  )
  const [allowAi, setAllowAi] = useState(false)
  const [aiAvailable, setAiAvailable] = useState<boolean | null>(null)
  const [answer, setAnswer] = useState<AssistantAnswer | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    api
      .get<{ aiAvailable: boolean }>('/api/v1/assistant/status')
      .then((s) => setAiAvailable(s.aiAvailable))
      .catch(() => setAiAvailable(false))
  }, [open])

  const ask = async () => {
    if (!question.trim()) return
    setBusy(true)
    setError(null)
    try {
      const res = await api.post<AssistantAnswer>('/api/v1/assistant/ask', {
        question: question.trim().slice(0, 500),
        locale: prefs.locale,
        flowKey,
        fieldId,
        fieldLabel,
        topic,
        contextText: contextText?.slice(0, 6000),
        allowExternalAi: allowAi,
      })
      setAnswer(res)
      announce(
        res.answer
          ? t('help.answerReady')
          : res.articles.length
            ? t('help.articlesReady')
            : t('help.uncertain'),
      )
    } catch (e) {
      const msg =
        e instanceof NetworkError
          ? t('help.offline')
          : t(`errors.${e instanceof ApiError ? e.code : 'error.unexpected'}`)
      setError(msg)
      announce(msg, 'assertive')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} title={t('help.assistantTitle')} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <p className="text-muted">{t('help.assistantLead')}</p>
        <div className="flex flex-col gap-2">
          <label htmlFor={qid} className="font-semibold">
            {t('help.askLabel')}
          </label>
          <p id={`${qid}-hint`} className="text-sm text-muted">
            {t('help.askHint')}
          </p>
          <textarea
            id={qid}
            aria-describedby={`${qid}-hint`}
            rows={3}
            maxLength={500}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className={`${inputClass(false)} py-3`}
          />
          <VoiceInput
            question={t('help.askLabel')}
            currentValue={question}
            multiline
            onAccept={setQuestion}
          />
        </div>

        {aiAvailable && (
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border-2 border-field p-3">
            <input
              type="checkbox"
              checked={allowAi}
              onChange={(e) => setAllowAi(e.target.checked)}
              className="mt-1 size-6 shrink-0 accent-[var(--af-primary)]"
            />
            <span>
              <span className="block font-semibold">{t('help.aiConsentLabel')}</span>
              <span className="text-sm text-muted">{t('help.aiConsentHint')}</span>
            </span>
          </label>
        )}
        {aiAvailable === false && <p className="text-sm text-muted">{t('help.aiUnavailable')}</p>}

        <Button
          icon={<Send size={18} aria-hidden="true" />}
          onClick={ask}
          busy={busy}
          disabled={!question.trim() || busy}
        >
          {t('help.ask')}
        </Button>

        {error && <Alert tone="error">{error}</Alert>}

        {answer && (
          <section aria-label={t('help.resultsLabel')} className="flex flex-col gap-3">
            {answer.answer && (
              <div className="rounded-xl border-2 border-primary bg-primary-soft p-4">
                <p className="mb-2 flex items-center gap-2 font-bold">
                  <Bot size={20} aria-hidden="true" />
                  {t('help.aiAnswerTitle')}
                </p>
                <p className="whitespace-pre-line">{answer.answer}</p>
                <p className="mt-2 text-sm text-muted">{t('help.aiDisclaimer')}</p>
                <div className="mt-2">
                  <ReadAloud text={answer.answer} />
                </div>
              </div>
            )}
            {answer.articles.map((a) => (
              <article key={a.slug} className="rounded-xl border-2 border-line p-4">
                <h3 className="font-bold">{a.title}</h3>
                <p className="mt-1">{a.body}</p>
                {!a.reviewed && a.locale !== 'en' && (
                  <p className="mt-2 text-sm text-muted">{t('help.draftTranslation')}</p>
                )}
                <div className="mt-2">
                  <ReadAloud text={`${a.title}. ${a.body}`} />
                </div>
              </article>
            ))}
            {(answer.uncertain || (!answer.answer && answer.articles.length === 0)) && (
              <Alert tone="warning">{t('help.uncertain')}</Alert>
            )}
          </section>
        )}

        <Alert
          tone="info"
          title={t('help.humanTitle')}
          action={
            <Link
              to="/support"
              onClick={onClose}
              className="inline-flex min-h-11 items-center gap-2 font-semibold text-primary underline"
            >
              <LifeBuoy size={18} aria-hidden="true" />
              {t('help.humanLink')}
            </Link>
          }
        >
          {t('help.humanBody')}
        </Alert>
      </div>
    </Dialog>
  )
}
