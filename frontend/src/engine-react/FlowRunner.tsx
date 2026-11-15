import { ArrowLeft, ArrowRight, Check, CloudOff, Loader2, Save } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useAnnounce } from '../a11y/announcer'
import { useAudioGuide } from '../a11y/audioGuide'
import { usePreferences } from '../a11y/preferences'
import { Alert } from '../design-system/Alert'
import { Button } from '../design-system/Button'
import { Dialog } from '../design-system/Dialog'
import { Card, ProgressBar } from '../design-system/Layout'
import { AssistantDialog } from '../features/help/AssistantDialog'
import { useT } from '../i18n/useT'
import { ApiError, NetworkError, api } from '../lib/api'
import type { Draft } from '../lib/types'
import { useOnline } from '../lib/useOnline'
import { clearLocalDraft, loadLocalDraft, saveLocalDraft } from '../engine/drafts'
import {
  collectVisibleData,
  initialData,
  sensitiveFieldIds,
  validateStep,
  visibleSteps,
} from '../engine/logic'
import type { Field, FlowData, FlowDefinition } from '../engine/types'
import { QuestionStep } from './QuestionStep'
import { ReviewStep } from './ReviewStep'
import { useErrorText, useFieldText } from './fieldText'

export interface FlowRunnerProps {
  definition: FlowDefinition
  /** i18n namespace and draft key, e.g. "profile" → flows.profile.* */
  flowKey: string
  context?: string
  /** User id for drafts, or "anon" before sign-in. null disables local drafts. */
  draftOwner: string | null
  serverDrafts: boolean
  prefill?: Record<string, unknown>
  initial?: FlowData
  submitLabel: string
  /** If set, the review step requires ticking this explicit confirmation before submitting. */
  confirmLabel?: string
  /** Extra content on the review screen, computed from the current answers. */
  reviewExtra?: (data: FlowData) => ReactNode
  onSubmit: (data: FlowData) => Promise<void>
  /** Called when the visible step changes (used by embedded components to emit a non-personal step event). */
  onStepChange?: (info: { stepId: string; index: number; total: number; section?: string }) => void
  /**
   * Steps not asked on the way forward because the answer is already known (pre-filled). They are still shown on
   * the review screen, where they can be changed, and are validated before sending (never ask twice).
   */
  skipSteps?: string[]
  /** A link under a question that switches to another way of answering, e.g. "Use email instead". */
  alternatives?: Record<string, { label: string; set: FlowData; goTo: string }>
}

/** Question types whose "how to answer" text has already been spoken in this visit (later questions are shorter). */
const spokenHow = new Set<string>()

type SyncState = 'idle' | 'saving' | 'saved' | 'local' | 'error'

/**
 * The reusable accessible form engine (ADR 0003). Drives registration, guided profile, identity,
 * support requests and job applications from the same flow definitions the server validates against.
 */
export function FlowRunner(props: FlowRunnerProps) {
  const {
    definition: def,
    flowKey,
    context = '',
    draftOwner,
    serverDrafts,
    prefill,
    initial,
    submitLabel,
    confirmLabel,
    reviewExtra,
    onSubmit,
  } = props
  const t = useT()
  const announce = useAnnounce()
  const online = useOnline()
  const { prefs } = usePreferences()
  const ns = `flows.${flowKey}`
  const fieldText = useFieldText(ns)
  const errText = useErrorText()
  const sensitive = useMemo(() => sensitiveFieldIds(def), [def])
  const skipKey = (props.skipSteps ?? []).join(',')
  const skip = useMemo(() => new Set(skipKey ? skipKey.split(',') : []), [skipKey])

  const [data, setData] = useState<FlowData>(() => initialData(def, prefill ?? {}, initial))
  const [loaded, setLoaded] = useState(false)
  const [restored, setRestored] = useState<string | null>(null)
  const firstStepId = () =>
    (visibleSteps(def, data).find((s) => !skip.has(s.id)) ?? def.steps[0])?.id
  const [stepId, setStepId] = useState<string>(firstStepId)
  const [returnToReview, setReturnToReview] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [sync, setSync] = useState<SyncState>('idle')
  const [conflict, setConflict] = useState<Draft | null>(null)
  const [help, setHelp] = useState<{ field: Field; label: string } | null>(null)
  const version = useRef<number | undefined>(undefined)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const summaryRef = useRef<HTMLDivElement>(null)
  const firstRender = useRef(true)
  const dirty = useRef(false)

  const allVisible = visibleSteps(def, data)
  // The path forward leaves out pre-filled steps, except the one being changed from the review screen.
  const steps = allVisible.filter((s) => !skip.has(s.id) || s.id === stepId)
  const REVIEW = '__review'
  const index =
    stepId === REVIEW
      ? steps.length
      : Math.max(
          0,
          steps.findIndex((s) => s.id === stepId),
        )
  const step = steps[index]
  const total = steps.length
  const draftUrl = `/api/v1/drafts/${flowKey}?context=${encodeURIComponent(context)}`

  // ---- Load: server draft (signed in) and/or local draft ---------------------------------------------------------
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const local = draftOwner ? loadLocalDraft(draftOwner, flowKey, context) : null
      let server: Draft | undefined
      if (serverDrafts) {
        try {
          server = await api.get<Draft | undefined>(draftUrl)
        } catch {
          /* offline: fall back to the local copy */
        }
      }
      if (cancelled) return
      const useLocal =
        local && (!server || (local.pendingSync && local.savedAt > Date.parse(server.updatedAt)))
      const source = useLocal
        ? { data: local!.data, step: local!.step, when: local!.savedAt }
        : server
          ? { data: server.data, step: server.currentStep, when: Date.parse(server.updatedAt) }
          : null
      if (server) version.current = server.version
      if (source && Object.keys(source.data).length) {
        setData(initialData(def, prefill ?? {}, source.data))
        if (source.step && def.steps.some((s) => s.id === source.step)) setStepId(source.step)
        setRestored(new Date(source.when).toLocaleString(prefs.locale))
        if (useLocal && local!.pendingSync) dirty.current = true
      }
      setLoaded(true)
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flowKey, context, draftOwner, serverDrafts])

  // ---- Autosave --------------------------------------------------------------------------------------------------
  const saveServer = useCallback(
    async (payload: FlowData, current: string, force = false) => {
      // Passwords are never stored in drafts, not even on the server.
      const clean = Object.fromEntries(
        Object.entries(payload).filter(
          ([k]) =>
            !def.steps.some((s) => s.fields.some((f) => f.id === k && f.type === 'password')),
        ),
      )
      const saved = await api.put<Draft>(draftUrl, {
        definitionVersion: def.version,
        expectedVersion: force ? undefined : version.current,
        currentStep: current,
        data: clean,
      })
      version.current = saved.version
    },
    [def, draftUrl],
  )

  useEffect(() => {
    if (!loaded) return
    if (firstRender.current) {
      firstRender.current = false
      if (!dirty.current) return
    }
    const timer = window.setTimeout(async () => {
      const current = stepId === REVIEW ? steps[steps.length - 1]?.id : stepId
      if (draftOwner)
        saveLocalDraft(
          draftOwner,
          flowKey,
          context,
          data,
          current,
          sensitive,
          serverDrafts,
          prefs.sharedDevice,
        )
      if (!serverDrafts) return setSync('local')
      if (!navigator.onLine) return setSync('local')
      setSync('saving')
      try {
        await saveServer(data, current)
        if (draftOwner)
          saveLocalDraft(
            draftOwner,
            flowKey,
            context,
            data,
            current,
            sensitive,
            false,
            prefs.sharedDevice,
          )
        dirty.current = false
        setSync('saved')
      } catch (e) {
        if (e instanceof ApiError && e.code === 'draft.conflict') {
          try {
            setConflict((await api.get<Draft>(draftUrl)) ?? null)
          } catch {
            setSync('error')
          }
        } else setSync(e instanceof NetworkError ? 'local' : 'error')
      }
    }, 800)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, stepId, loaded, online])

  useEffect(() => {
    if (sync === 'local' && serverDrafts && !online) announce(t('connection.savedLocal'))
  }, [sync, online, serverDrafts, announce, t])

  // ---- Focus management ------------------------------------------------------------------------------------------
  const focusStep = useCallback(() => {
    window.requestAnimationFrame(() => {
      if (prefs.keyboardFirst && stepId !== REVIEW) {
        const control = document.querySelector<HTMLElement>(
          `#q-${step?.fields[0]?.id}, #q-${step?.fields[0]?.id}-0`,
        )
        if (control) return control.focus()
      }
      headingRef.current?.focus()
    })
  }, [prefs.keyboardFirst, stepId, step])

  const skipFirstFocus = useRef(true)
  useEffect(() => {
    if (skipFirstFocus.current) {
      skipFirstFocus.current = false
      return
    }
    focusStep()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepId])

  // ---- Step events and audio guidance ------------------------------------------------------------------------
  const guide = useAudioGuide()
  const describeStep = useCallback((): string => {
    if (stepId === REVIEW)
      return `${t('flow.reviewTitle')}. ${t('flow.reviewLead')} ${t('audio.reviewInstructions', { button: submitLabel })}`
    if (!step) return ''
    return step.fields
      .map((f) => {
        const tx = fieldText(f)
        const parts = [t('flow.stepOf', { current: index + 1, total }), tx.label]
        if (!f.required && f.type !== 'consent') parts.push(t('flow.optionalQuestion'))
        if (tx.hint) parts.push(tx.hint)
        const how =
          f.type === 'radio'
            ? 'radio'
            : f.type === 'checkboxes'
              ? 'checkboxes'
              : f.type === 'consent'
                ? 'consent'
                : f.type === 'list'
                  ? 'list'
                  : f.type === 'file'
                    ? 'file'
                    : 'text'
        const firstOfType = !spokenHow.has(how)
        if (tx.example && firstOfType) parts.push(`${t('flow.example')}: ${tx.example}`)
        if (f.options?.length && f.type !== 'select')
          parts.push(`${t('audio.choices')}: ${f.options.map((o) => tx.option(o)).join(', ')}`)
        if (f.options?.length && f.type === 'select')
          parts.push(t('audio.selectInstructions', { count: f.options.length }))
        if (firstOfType && guide.active) {
          spokenHow.add(how)
          parts.push(t(`audio.how.${how}`))
        }
        return parts.join('. ')
      })
      .join('. ')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepId, step, index, total, t, fieldText, submitLabel, guide.active])

  useEffect(() => {
    if (!loaded) return
    props.onStepChange?.({
      stepId,
      index: stepId === REVIEW ? total : index + 1,
      total,
      section: step?.section,
    })
    guide.say(describeStep())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepId, loaded, guide.active])

  // ---- Navigation ------------------------------------------------------------------------------------------------
  const change = (id: string, value: unknown) => {
    dirty.current = true
    setData((d) => ({ ...d, [id]: value }))
    if (errors[id])
      setErrors((e) => Object.fromEntries(Object.entries(e).filter(([k]) => k !== id)))
  }

  const showErrors = (e: Record<string, string>) => {
    setErrors(e)
    window.requestAnimationFrame(() => summaryRef.current?.focus())
    const all = def.steps.flatMap((s) => s.fields)
    guide.say(
      `${t('flow.errorSummaryTitle')}. ${Object.entries(e)
        .map(([fid, code]) =>
          errText(
            code,
            all.find((f) => f.id === fid),
          ),
        )
        .join('. ')}`,
    )
  }

  const next = () => {
    if (!step) return
    const e = validateStep(step, data)
    if (def.requireOneOf && step.fields.some((f) => def.requireOneOf!.includes(f.id))) {
      const lastOfGroup = steps
        .filter((s) => s.fields.some((f) => def.requireOneOf!.includes(f.id)))
        .pop()
      if (
        lastOfGroup?.id === step.id &&
        !def.requireOneOf.some((id) => String(data[id] ?? '').trim())
      )
        e[step.fields[0].id] = 'validation.requireOneOf'
    }
    if (Object.keys(e).length) return showErrors(e)
    setErrors({})
    const target = returnToReview || index === steps.length - 1 ? REVIEW : steps[index + 1].id
    setReturnToReview(false)
    setStepId(target)
  }

  const back = () => {
    setErrors({})
    if (index > 0) setStepId(steps[index - 1].id)
  }

  const submit = async () => {
    setSubmitError(null)
    // Re-check every visible step before sending.
    for (const s of allVisible) {
      const e = validateStep(s, data)
      if (Object.keys(e).length) {
        setStepId(s.id)
        return showErrors(e)
      }
    }
    if (confirmLabel && !confirmed) {
      setSubmitError(t('flow.confirmRequired'))
      announce(t('flow.confirmRequired'), 'assertive')
      return
    }
    setSubmitting(true)
    try {
      await onSubmit(collectVisibleData(def, data))
      if (draftOwner) clearLocalDraft(draftOwner, flowKey, context)
      // The answers are saved for real now; the draft would otherwise be offered as "unfinished" later.
      if (serverDrafts) void api.del(draftUrl).catch(() => undefined)
    } catch (e) {
      if (e instanceof ApiError && e.fieldErrors.length) {
        const mapped: Record<string, string> = {}
        e.fieldErrors.forEach((fe) => (mapped[fe.field.split(/[[.]/)[0]] = fe.code))
        const target = steps.find((s) => s.fields.some((f) => mapped[f.id]))
        if (target) {
          setStepId(target.id)
          return showErrors(mapped)
        }
      }
      const msg =
        e instanceof NetworkError
          ? t('connection.submitOffline')
          : t(`errors.${e instanceof ApiError ? e.code : 'error.unexpected'}`)
      setSubmitError(msg)
      announce(msg, 'assertive')
    } finally {
      setSubmitting(false)
    }
  }

  const startOver = async () => {
    if (draftOwner) clearLocalDraft(draftOwner, flowKey, context)
    if (serverDrafts) await api.del(draftUrl).catch(() => undefined)
    version.current = undefined
    setData(initialData(def, prefill ?? {}, initial))
    setStepId(firstStepId())
    setRestored(null)
    announce(t('flow.startedOver'))
  }

  // ---- Render ----------------------------------------------------------------------------------------------------
  const sectionIndex = step ? def.sections.indexOf(step.section) : def.sections.length
  const errorEntries = Object.entries(errors)

  return (
    <div className="flex flex-col gap-5" data-flow={flowKey}>
      {/* Progress: text + bar + sections, so it is never conveyed by colour or shape alone */}
      <div className="flex flex-col gap-3">
        <p className="text-base font-semibold" aria-live="off">
          {stepId === REVIEW
            ? t('flow.reviewProgress')
            : t('flow.stepOf', { current: index + 1, total })}
        </p>
        <ProgressBar
          value={stepId === REVIEW ? total : index}
          max={total}
          label={t('flow.progressLabel')}
        />
        {def.sections.length > 1 && (
          <ol className="flex flex-wrap gap-2" aria-label={t('flow.sectionsLabel')}>
            {def.sections.map((s, i) => {
              const state =
                stepId === REVIEW || i < sectionIndex
                  ? 'completed'
                  : i === sectionIndex
                    ? 'current'
                    : 'remaining'
              return (
                <li
                  key={s}
                  aria-current={state === 'current' ? 'step' : undefined}
                  className={`flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold ${
                    state === 'completed'
                      ? 'bg-success-soft text-success'
                      : state === 'current'
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface-2 text-muted'
                  }`}
                >
                  {state === 'completed' && <Check size={14} aria-hidden="true" />}
                  {t(`${ns}.sections.${s}`)}
                  <span className="sr-only">({t(`flow.${state}`)})</span>
                </li>
              )
            })}
          </ol>
        )}
        <SyncIndicator state={sync} serverDrafts={serverDrafts} />
      </div>

      {restored && (
        <Alert
          tone="info"
          title={t('flow.restoredTitle')}
          action={
            <Button variant="ghost" size="sm" onClick={startOver}>
              {t('flow.startOver')}
            </Button>
          }
        >
          {t('flow.restoredLead', { when: restored })}
        </Alert>
      )}

      {errorEntries.length > 0 && (
        <div
          ref={summaryRef}
          tabIndex={-1}
          role="alert"
          className="rounded-xl border-2 border-danger bg-danger-soft p-4"
        >
          <p className="text-lg font-bold">{t('flow.errorSummaryTitle')}</p>
          <ul className="mt-2 list-disc pl-6">
            {errorEntries.map(([fid, code]) => {
              const f = step?.fields.find((x) => x.id === fid)
              return (
                <li key={fid}>
                  <a
                    href={`#q-${fid}`}
                    className="font-semibold text-danger underline"
                    onClick={(e) => {
                      e.preventDefault()
                      document.getElementById(`q-${fid}`)?.focus()
                    }}
                  >
                    {f ? `${fieldText(f).label}: ` : ''}
                    {errText(code, f)}
                  </a>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      <Card className="sm:p-8">
        {!loaded ? (
          <p className="flex items-center gap-2 text-muted">
            <Loader2 className="animate-spin" aria-hidden="true" />
            {t('app.loading')}
          </p>
        ) : stepId === REVIEW ? (
          <>
            <ReviewStep
              def={def}
              ns={ns}
              data={data}
              headingRef={headingRef}
              onChange={(id) => {
                setReturnToReview(true)
                setStepId(id)
              }}
            />
            {reviewExtra?.(data)}
            {confirmLabel && (
              <label className="mt-6 flex min-h-14 cursor-pointer items-start gap-4 rounded-xl border-2 border-primary bg-primary-soft px-4 py-3 text-lg font-semibold">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="mt-1 size-6 shrink-0 accent-[var(--af-primary)]"
                />
                <span>{confirmLabel}</span>
              </label>
            )}
            {submitError && (
              <div className="mt-4">
                <Alert tone="error">{submitError}</Alert>
              </div>
            )}
          </>
        ) : step ? (
          <>
            {step.fields.map((f) => (
              <QuestionStep
                key={f.id}
                field={f}
                ns={ns}
                data={data}
                error={errors[f.id]}
                onChange={change}
                headingRef={headingRef}
                onHelp={(field, label) => setHelp({ field, label })}
              />
            ))}
            {props.alternatives?.[step.id] && (
              <p className="mt-5">
                <button
                  type="button"
                  className="inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4"
                  onClick={() => {
                    const alt = props.alternatives![step.id]
                    dirty.current = true
                    setErrors({})
                    setData((d) => ({ ...d, ...alt.set }))
                    setStepId(alt.goTo)
                  }}
                >
                  {props.alternatives[step.id].label}
                </button>
              </p>
            )}
          </>
        ) : null}
      </Card>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <Button
          variant="secondary"
          size="lg"
          icon={<ArrowLeft size={20} aria-hidden="true" />}
          onClick={stepId === REVIEW ? () => setStepId(steps[steps.length - 1].id) : back}
          disabled={index === 0}
        >
          {t('app.back')}
        </Button>
        {stepId === REVIEW ? (
          <Button
            size="lg"
            icon={<Check size={20} aria-hidden="true" />}
            onClick={submit}
            busy={submitting}
            disabled={submitting}
          >
            {submitting ? t('flow.submitting') : submitLabel}
          </Button>
        ) : (
          <Button
            size="lg"
            icon={<ArrowRight size={20} aria-hidden="true" />}
            onClick={next}
            disabled={!loaded}
          >
            {returnToReview
              ? t('flow.backToReview')
              : index === steps.length - 1
                ? t('flow.toReview')
                : t('app.next')}
          </Button>
        )}
      </div>

      <Dialog
        open={conflict !== null}
        title={t('flow.conflictTitle')}
        onClose={() => setConflict(null)}
        actions={
          <>
            <Button
              onClick={async () => {
                await saveServer(data, stepId, true).catch(() => undefined)
                setConflict(null)
                setSync('saved')
              }}
            >
              {t('flow.conflictKeepMine')}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                if (conflict) {
                  setData(conflict.data)
                  version.current = conflict.version
                }
                setConflict(null)
              }}
            >
              {t('flow.conflictUseOther')}
            </Button>
          </>
        }
      >
        <p>{t('flow.conflictLead')}</p>
      </Dialog>

      {help && (
        <AssistantDialog
          open
          onClose={() => setHelp(null)}
          flowKey={flowKey}
          fieldId={help.field.id}
          fieldLabel={help.label}
        />
      )}
    </div>
  )
}

function SyncIndicator({ state, serverDrafts }: { state: SyncState; serverDrafts: boolean }) {
  const t = useT()
  if (state === 'idle') return null
  const content =
    state === 'local'
      ? {
          icon: <CloudOff size={16} aria-hidden="true" />,
          text: serverDrafts ? t('connection.savedLocal') : t('connection.savedDevice'),
          cls: 'text-warning-ink',
        }
      : state === 'saving'
        ? {
            icon: <Loader2 size={16} className="animate-spin" aria-hidden="true" />,
            text: t('connection.saving'),
            cls: 'text-muted',
          }
        : state === 'error'
          ? {
              icon: <CloudOff size={16} aria-hidden="true" />,
              text: t('connection.syncFailed'),
              cls: 'text-danger',
            }
          : {
              icon: <Save size={16} aria-hidden="true" />,
              text: t('connection.saved'),
              cls: 'text-success',
            }
  return (
    <p className={`flex items-center gap-2 text-sm font-semibold ${content.cls}`}>
      {content.icon}
      {content.text}
    </p>
  )
}
