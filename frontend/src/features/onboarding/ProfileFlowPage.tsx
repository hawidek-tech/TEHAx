import { CheckCircle2, Circle, CircleDot, ShieldCheck } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { useAnnounce } from '../../a11y/announcer'
import { useAudioGuide } from '../../a11y/audioGuide'
import { Alert } from '../../design-system/Alert'
import { Button, LinkButton } from '../../design-system/Button'
import { Card, Loading } from '../../design-system/Layout'
import { FlowRunner } from '../../engine-react/FlowRunner'
import { isPresent } from '../../engine/logic'
import { useT } from '../../i18n/useT'
import { api } from '../../lib/api'
import { useSession } from '../../lib/session'
import type { Profile } from '../../lib/types'
import { useApi } from '../../lib/useApi'
import {
  PROFILE_PARTS,
  SUPPORT_STEPS,
  answeredSteps,
  namesFromDisplayName,
  nextPart,
  nextUnstartedPart,
  profileAnswers,
  subsetDefinition,
} from './profileParts'
import { useFlow } from '../shared/useFlow'

type View =
  | { kind: 'overview' }
  | { kind: 'part'; index: number; change?: boolean }
  | { kind: 'partDone'; index: number }
  | { kind: 'support' }
  | { kind: 'supportDone' }

/**
 * Guided profile in three short parts plus optional parts (docs/ux/first-visit-flow.md, Path B).
 * Each part is saved on its own; questions already answered (for example while applying) are not asked again.
 */
export default function ProfileFlowPage() {
  const t = useT()
  const { me } = useSession()
  const navigate = useNavigate()
  const announce = useAnnounce()
  const guide = useAudioGuide()
  const flow = useFlow('profile')
  const loaded = useApi<Profile>('/api/v1/profile')
  const [profile, setProfile] = useState<Profile | null>(null)
  // The open part is kept in the address (?part=work), so a reload - even offline - returns to the same part.
  const [params, setParams] = useSearchParams()
  const [view, setViewState] = useState<View>(() => {
    const part = params.get('part')
    if (part === 'support') return { kind: 'support' }
    const index = PROFILE_PARTS.findIndex((x) => x.id === part)
    return index >= 0 ? { kind: 'part', index } : { kind: 'overview' }
  })
  const setView = (v: View) => {
    setViewState(v)
    const part =
      v.kind === 'part' ? PROFILE_PARTS[v.index].id : v.kind === 'support' ? 'support' : null
    setParams(part ? { part } : {}, { replace: true })
  }
  const heading = useRef<HTMLHeadingElement>(null)
  const first = useRef(true)

  // Focus and (with the audio guide) read each new screen; the form engine does this itself inside a part.
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    if (view.kind === 'part' || view.kind === 'support') return
    window.requestAnimationFrame(() => heading.current?.focus())
  }, [view])

  if (flow.loading || (loaded.loading && !loaded.error) || !flow.data)
    return <Loading label={t('app.loading')} />
  const p = profile ?? loaded.data
  const answers = { ...namesFromDisplayName(me?.displayName), ...profileAnswers(p) }
  const saved = profileAnswers(p)
  const upcoming = nextPart(p)
  const partTitle = (i: number) =>
    t('profileParts.partOf', {
      current: i + 1,
      total: PROFILE_PARTS.length,
      name: t(`profileParts.names.${PROFILE_PARTS[i].id}`),
    })

  if (view.kind === 'part' || view.kind === 'support') {
    const isSupport = view.kind === 'support'
    const ids = isSupport ? SUPPORT_STEPS : [...PROFILE_PARTS[view.index].steps]
    const def = subsetDefinition(flow.data, ids)
    const known = isSupport ? [] : answeredSteps(ids, answers)
    // "Change" shows every question; otherwise answered questions are skipped (and shown on the review screen).
    const skip = !isSupport && !view.change && known.length < ids.length ? known : []
    return (
      <div className="mx-auto max-w-3xl">
        <header className="mb-6 flex flex-col gap-2">
          <p className="text-sm font-bold uppercase tracking-wide text-primary">
            {t('onboarding.eyebrow')}
          </p>
          <h1 data-page-heading tabIndex={-1} className="text-3xl font-extrabold">
            {isSupport ? t('profileParts.names.support') : partTitle(view.index)}
          </h1>
          <p data-page-lead className="text-lg text-muted">
            {isSupport ? t('profileParts.supportLead') : t('profileParts.partLead')}
          </p>
        </header>
        <FlowRunner
          key={isSupport ? 'support' : PROFILE_PARTS[view.index].id}
          definition={def}
          flowKey="profile"
          context={isSupport ? 'support' : PROFILE_PARTS[view.index].id}
          draftOwner={me?.id ?? null}
          serverDrafts
          initial={
            isSupport
              ? { workplaceSupport: p?.supportPreferences ?? [] }
              : Object.fromEntries(
                  ids.filter((id) => isPresent(answers[id])).map((id) => [id, answers[id]]),
                )
          }
          skipSteps={skip}
          submitLabel={isSupport ? t('profileParts.saveSupport') : t('profileParts.savePart')}
          onSubmit={async (data) => {
            if (isSupport) {
              await api.put(`/api/v1/learners/${me!.id}/support`, {
                workplaceSupport: data.workplaceSupport ?? [],
                request:
                  data.supportNeeded === 'yes'
                    ? {
                        category: data.supportCategory,
                        message: data.supportMessage,
                        contact: data.supportContact,
                      }
                    : null,
              })
              announce(t('profileParts.supportSaved'))
              setView({ kind: 'supportDone' })
              return
            }
            const res = await api.put<Profile>(`/api/v1/profile/steps?steps=${ids.join(',')}`, data)
            setProfile(res)
            announce(
              t('profileParts.partDone', { current: view.index + 1, total: PROFILE_PARTS.length }),
            )
            setView({ kind: 'partDone', index: view.index })
          }}
        />
        <p className="mt-6">
          <Button variant="ghost" onClick={() => setView({ kind: 'overview' })}>
            {t('profileParts.allParts')}
          </Button>
        </p>
      </div>
    )
  }

  if (view.kind === 'partDone' || view.kind === 'supportDone') {
    const isSupport = view.kind === 'supportDone'
    // After a part: continue with a part not started yet; optional questions left blank are not a reason to go back.
    const after = nextUnstartedPart(p)
    const nextIndex = after ? PROFILE_PARTS.findIndex((x) => x.id === after.id) : -1
    const title = isSupport
      ? t('profileParts.supportSaved')
      : nextIndex >= 0
        ? t('profileParts.partDone', { current: view.index + 1, total: PROFILE_PARTS.length })
        : t('profileParts.allDone')
    return (
      <Screen headingRef={heading} title={title} guideText={title} guide={guide}>
        {isSupport && (
          <Alert tone="success" title={t('profileParts.privateTitle')}>
            {t('profileParts.privateBody')}
          </Alert>
        )}
        {!isSupport && nextIndex >= 0 && (
          <Button size="lg" onClick={() => setView({ kind: 'part', index: nextIndex })}>
            {t('profileParts.continueWith', {
              name: t(`profileParts.names.${PROFILE_PARTS[nextIndex].id}`),
            })}
          </Button>
        )}
        {(isSupport || nextIndex < 0) && (
          <LinkButton size="lg" to="/jobs">
            {t('profileParts.lookAtJobs')}
          </LinkButton>
        )}
        {!isSupport && nextIndex < 0 && (
          <OptionalParts onSupport={() => setView({ kind: 'support' })} />
        )}
        <Button variant="secondary" size="lg" onClick={() => navigate('/')}>
          {t('profileParts.stop')}
        </Button>
      </Screen>
    )
  }

  // Overview: what the profile has, how long it is, and one main button.
  const nextIndex = upcoming ? PROFILE_PARTS.findIndex((x) => x.id === upcoming.id) : -1
  const remaining = PROFILE_PARTS.flatMap((x) => x.steps).filter(
    (id) => !isPresent(saved[id]),
  ).length
  const intro =
    nextIndex >= 0
      ? t('profileParts.intro', { parts: PROFILE_PARTS.length, questions: remaining })
      : t('profileParts.allDone')
  return (
    <Screen
      headingRef={heading}
      title={t('profileParts.title')}
      lead={intro}
      guideText={`${t('profileParts.title')}. ${intro}`}
      guide={guide}
    >
      {nextIndex >= 0 && (
        <Button size="lg" onClick={() => setView({ kind: 'part', index: nextIndex })}>
          {nextIndex === 0 && remaining === PROFILE_PARTS.flatMap((x) => x.steps).length
            ? t('app.start')
            : t('profileParts.continueWith', {
                name: t(`profileParts.names.${PROFILE_PARTS[nextIndex].id}`),
              })}
        </Button>
      )}
      <Card as="section">
        <h2 className="mb-3 text-xl font-bold">{t('profileParts.partsTitle')}</h2>
        <ol className="flex flex-col gap-3">
          {PROFILE_PARTS.map((part, i) => {
            const left = part.steps.filter((id) => !isPresent(saved[id])).length
            const state = left === 0 ? 'done' : left < part.steps.length ? 'started' : 'todo'
            return (
              <li key={part.id} className="flex flex-wrap items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-lg font-semibold">
                  {state === 'done' ? (
                    <CheckCircle2 aria-hidden="true" className="text-success" />
                  ) : state === 'started' ? (
                    <CircleDot aria-hidden="true" className="text-primary" />
                  ) : (
                    <Circle aria-hidden="true" className="text-muted" />
                  )}
                  {partTitle(i)}
                  <span className="text-base font-normal text-muted">
                    ({t(`profileParts.state.${state}`, { count: left })})
                  </span>
                </span>
                <Button
                  variant="secondary"
                  onClick={() => setView({ kind: 'part', index: i, change: state === 'done' })}
                >
                  {state === 'todo'
                    ? t('app.start')
                    : state === 'done'
                      ? t('profileParts.change')
                      : t('app.continue')}
                  <span className="sr-only">: {t(`profileParts.names.${part.id}`)}</span>
                </Button>
              </li>
            )
          })}
        </ol>
      </Card>
      <OptionalParts onSupport={() => setView({ kind: 'support' })} />
      <Button variant="secondary" size="lg" onClick={() => navigate('/')}>
        {t('profileParts.stop')}
      </Button>
    </Screen>
  )
}

function OptionalParts({ onSupport }: { onSupport: () => void }) {
  const t = useT()
  return (
    <Card as="section">
      <h2 className="mb-1 text-xl font-bold">{t('profileParts.optionalTitle')}</h2>
      <p className="mb-3 text-muted">{t('profileParts.optionalLead')}</p>
      <div className="flex flex-wrap gap-3">
        <Button
          variant="secondary"
          icon={<ShieldCheck aria-hidden="true" size={20} />}
          onClick={onSupport}
        >
          {t('profileParts.names.support')}
        </Button>
        <LinkButton variant="secondary" to="/identity">
          {t('profileParts.names.identity')}
        </LinkButton>
      </div>
    </Card>
  )
}

function Screen({
  headingRef,
  title,
  lead,
  guideText,
  guide,
  children,
}: {
  headingRef: React.RefObject<HTMLHeadingElement | null>
  title: string
  lead?: string
  guideText: string
  guide: ReturnType<typeof useAudioGuide>
  children: React.ReactNode
}) {
  const say = guide.say
  useEffect(() => {
    const timer = window.setTimeout(() => say(guideText), 300)
    return () => window.clearTimeout(timer)
  }, [say, guideText])
  return (
    <div data-flow="profile-parts" className="mx-auto flex max-w-3xl flex-col gap-5">
      <div className="flex flex-col gap-2">
        <h1 ref={headingRef} data-page-heading tabIndex={-1} className="text-3xl font-extrabold">
          {title}
        </h1>
        {lead && (
          <p data-page-lead className="text-xl text-muted">
            {lead}
          </p>
        )}
      </div>
      {children}
    </div>
  )
}
