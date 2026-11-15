/**
 * The conversations the voice assistant can hold. Each one uses the SAME APIs and flow definitions as the screens, so
 * everything said here is saved, validated and shown exactly as if it had been typed into the forms.
 */
import { interpret, normalise } from '../a11y/voiceCommands'
import {
  initialData,
  isPresent,
  normaliseEthiopianPhone,
  validateField,
  visibleSteps,
} from '../engine/logic'
import type { Field, FlowData, FlowDefinition } from '../engine/types'
import {
  MINIMUM_FOR_APPLYING,
  PROFILE_PARTS,
  SUPPORT_STEPS,
  namesFromDisplayName,
  profileAnswers,
  subsetDefinition,
} from '../features/onboarding/profileParts'
import { ApiError, api } from '../lib/api'
import type {
  ApplicationSummary,
  Draft,
  JobDetail,
  JobSummary,
  Locale,
  Me,
  NotificationItem,
  Profile,
} from '../lib/types'
import { MenuSignal, type Answer, type ConversationEngine } from './engine'
import { anyJob, email, intent, jobKeywords, number, phone, yesNo } from './nlu'

export interface DialogContext {
  e: ConversationEngine
  t: (key: string, options?: Record<string, unknown>) => string
  /** Optional text (undefined when the key does not exist). */
  opt: (key: string) => string | undefined
  me: () => Me | null | undefined
  register: (payload: Record<string, unknown>) => Promise<Me>
  signIn: (identifier: string, password: string) => Promise<Me>
  setLocale: (l: Locale) => void
}

const isText = (a: Answer): a is { text: string } => 'text' in a

/** Small word lists for browsing jobs (en + am; other languages use the numbered suggestions). */
const WORDS = {
  more: [
    'more',
    'tell me more',
    'details',
    'describe',
    'more about',
    'what is it',
    'ተጨማሪ',
    'ዝርዝር',
    'ንገረኝ',
  ],
  next: ['next', 'next job', 'another', 'another one', 'skip', 'other', 'ቀጣይ', 'ሌላ', 'ቀጣዩ'],
  previous: ['previous', 'last one', 'go back', 'back', 'ያለፈው', 'ተመለስ'],
  apply: [
    'apply',
    'i want to apply',
    'apply for this',
    'i want this',
    'this one',
    'አመልክት',
    'ማመልከት',
    'ላመልክት',
  ],
  search: [
    'search again',
    'new search',
    'different job',
    'something else',
    'another kind',
    'እንደገና ፈልግ',
  ],
  email: ['email', 'e mail', 'use email', 'ኢሜይል'],
}
function pick(text: string, keys: (keyof typeof WORDS)[]): keyof typeof WORDS | null {
  const t = normalise(text)
  for (const k of keys) if (WORDS[k].some((w) => t === w || t.includes(w))) return k
  return null
}

// ---- Main conversation -------------------------------------------------------------------------------------------

export async function runAssistant(c: DialogContext) {
  const { e, t } = c
  const me = c.me()
  await e.say(me ? t('assistant.welcomeBack', { name: me.displayName }) : t('assistant.welcome'))
  if (me) await offerUnfinished(c)
  let prompt = t('assistant.whatHelp')
  for (;;) {
    try {
      const chips = [
        t('assistant.chips.findJob'),
        t('assistant.chips.profile'),
        t('assistant.chips.support'),
        t('assistant.chips.track'),
      ]
      const a = await e.ask(prompt, { chips, help: t('assistant.whatCanIDo') })
      if (!isText(a)) {
        prompt = t('assistant.whatHelp')
        continue
      }
      let i = intent(a.text)
      if (!i) {
        const n = interpret(
          a.text,
          chips.map((label, k) => ({ value: String(k), label })),
        )
        if (n.kind === 'option')
          i = (['findJob', 'createProfile', 'support', 'track'] as const)[Number(n.value)]
      }
      switch (i) {
        case 'findJob':
          await findJob(c, a.text)
          break
        case 'createProfile':
          await profileDialog(c)
          break
        case 'support':
          await supportDialog(c)
          break
        case 'track':
          await trackDialog(c)
          break
        case 'continue':
          if (!(await offerUnfinished(c, true))) await e.say(t('assistant.nothingUnfinished'))
          break
        case 'signIn':
          await ensureAccount(c, 'signIn')
          break
        case 'english':
        case 'amharic':
          c.setLocale(i === 'english' ? 'en' : 'am')
          await new Promise((r) => window.setTimeout(r, 300)) // let the new language load
          await e.say(t('assistant.languageChanged'))
          break
        case 'help':
          await e.say(t('assistant.whatCanIDo'))
          await e.say(t('assistant.controls'))
          break
        default:
          await e.say(t('assistant.notUnderstood', { heard: a.text }))
          prompt = t('assistant.whatHelp')
          continue
      }
      prompt = t('assistant.anythingElse')
    } catch (err) {
      if (err instanceof MenuSignal) {
        prompt = t('assistant.menuPrompt')
        continue
      }
      throw err
    }
  }
}

/** Offers to continue unfinished work (drafts) or reports news. Returns true when something was offered. */
async function offerUnfinished(c: DialogContext, asked = false): Promise<boolean> {
  const { e, t } = c
  const [drafts, notes] = await Promise.all([
    api.get<Draft[]>('/api/v1/drafts').catch(() => [] as Draft[]),
    api.get<NotificationItem[]>('/api/v1/notifications').catch(() => [] as NotificationItem[]),
  ])
  const news = notes.find((n) => !n.read && n.type === 'APPLICATION_STATUS')
  if (news && !asked) {
    await e.say(
      t('notifications.APPLICATION_STATUS', {
        jobTitle: news.params.jobTitle,
        status: t(`applications.status.${news.params.status}`),
      }),
    )
    void api.post(`/api/v1/notifications/${news.id}/read`).catch(() => undefined)
  }
  const d = drafts.find((x) =>
    ['job-application', 'profile', 'support-request'].includes(x.flowKey),
  )
  if (!d) return false
  const what =
    d.flowKey === 'job-application' || d.context.startsWith('job:') ? 'job-application' : d.flowKey
  const a = await e.ask(
    t('assistant.unfinished', { what: t(`assistant.unfinishedWhat.${what}`) }),
    {
      chips: [t('app.yes'), t('app.no')],
    },
  )
  if (!isText(a) || yesNo(a.text) !== 'yes') return true
  if (what === 'job-application')
    await applyDialog(c, d.flowKey === 'job-application' ? d.context : d.context.slice(4))
  else if (d.flowKey === 'profile') await profileDialog(c)
  else await supportDialog(c)
  return true
}

// ---- Jobs --------------------------------------------------------------------------------------------------------

async function findJob(c: DialogContext, firstWords: string) {
  const { e, t } = c
  let any = anyJob(firstWords)
  let words = any ? '' : jobKeywords(firstWords)
  for (;;) {
    if (!words && !any) {
      const a = await e.ask(t('assistant.jobs.what'), {
        chips: [t('assistant.chips.anyJob')],
        help: t('assistant.jobs.whatHelp'),
      })
      if (!isText(a)) return
      any = anyJob(a.text)
      words = any ? '' : jobKeywords(a.text) || normalise(a.text)
      any = any || !words
    }
    e.thinking()
    let jobs = await api.get<JobSummary[]>(
      `/api/v1/jobs${words ? `?q=${encodeURIComponent(words)}` : ''}`,
    )
    if (!jobs.length && words) {
      for (const w of words.split(' ').filter((x) => x.length > 3)) {
        jobs = await api.get<JobSummary[]>(`/api/v1/jobs?q=${encodeURIComponent(w)}`)
        if (jobs.length) break
      }
    }
    if (!jobs.length) {
      jobs = await api.get<JobSummary[]>('/api/v1/jobs')
      await e.say(t('assistant.jobs.noneFor', { what: words, count: jobs.length }))
    } else
      await e.say(
        words
          ? t('assistant.jobs.found', { count: jobs.length, what: words })
          : t('assistant.jobs.foundAll', { count: jobs.length }),
      )
    if (!jobs.length) return
    const next = await browseJobs(c, jobs)
    if (next !== 'search') return
    words = ''
    any = false
  }
}

async function browseJobs(c: DialogContext, jobs: JobSummary[]): Promise<'done' | 'search'> {
  const { e, t } = c
  let i = 0
  let intro = true
  for (;;) {
    const j = jobs[i]
    if (intro) {
      await e.say(
        t('assistant.jobs.describe', {
          n: i + 1,
          total: jobs.length,
          title: j.title,
          org: j.organizationName ?? '',
          place: j.city ?? t(`regions.${j.region}`),
          mode: t(`jobs.workMode.${j.workMode}`, { defaultValue: '' }),
          days: j.daysLeft,
        }),
      )
      intro = false
    }
    const a = await e.ask(t('assistant.jobs.whatNow'), {
      chips: [
        t('assistant.chips.more'),
        t('assistant.chips.nextJob'),
        t('assistant.chips.apply'),
        t('assistant.chips.searchAgain'),
      ],
      help: t('assistant.jobs.browseHelp'),
    })
    const byNumber = isText(a)
      ? interpret(a.text, [
          { value: 'more', label: t('assistant.chips.more') },
          { value: 'next', label: t('assistant.chips.nextJob') },
          { value: 'apply', label: t('assistant.chips.apply') },
          { value: 'search', label: t('assistant.chips.searchAgain') },
        ])
      : null
    const choice = !isText(a)
      ? a.control === 'back'
        ? 'previous'
        : 'next'
      : (pick(a.text, ['apply', 'search', 'more', 'previous', 'next']) ??
        (byNumber?.kind === 'option' ? byNumber.value : null))
    if (choice === 'more') {
      e.thinking()
      const d = await api.get<JobDetail>(`/api/v1/jobs/${j.id}`)
      const support = d.accommodations?.categories?.length
        ? t('assistant.jobs.support', {
            list: d.accommodations.categories.map((x) => t(`accommodations.${x}`)).join(', '),
          })
        : t('assistant.jobs.noSupportListed')
      await e.say(`${d.plainSummary || d.summary} ${support}`)
    } else if (choice === 'next') {
      if (i < jobs.length - 1) {
        i++
        intro = true
      } else await e.say(t('assistant.jobs.last'))
    } else if (choice === 'previous') {
      if (i > 0) {
        i--
        intro = true
      } else await e.say(t('assistant.jobs.first'))
    } else if (choice === 'apply') {
      await applyDialog(c, j.id)
      return 'done'
    } else if (choice === 'search') return 'search'
    else if (isText(a)) await e.say(t('assistant.notUnderstood', { heard: a.text }))
  }
}

// ---- Account -----------------------------------------------------------------------------------------------------

async function ensureAccount(
  c: DialogContext,
  reason: 'apply' | 'profile' | 'support' | 'track' | 'signIn',
) {
  const { e, t } = c
  const me = c.me()
  if (me) return me
  if (reason !== 'signIn') await e.say(t(`assistant.account.need.${reason}`))
  if (reason === 'signIn') return signInDialog(c)
  const a = await e.ask(t('assistant.account.haveOne'), { chips: [t('app.yes'), t('app.no')] })
  if (isText(a) && yesNo(a.text) === 'yes') return signInDialog(c)
  return registerDialog(c)
}

async function confirmValue(c: DialogContext, spokenBack: string): Promise<boolean> {
  const a = await c.e.ask(c.t('assistant.confirm', { value: spokenBack }), {
    chips: [c.t('app.yes'), c.t('app.no')],
  })
  return isText(a) && yesNo(a.text) === 'yes'
}

const spellDigits = (d: string) => d.split('').join(' ')

async function askPhoneOrEmail(c: DialogContext, allowEmail: boolean) {
  const { e, t } = c
  for (;;) {
    const a = await e.ask(
      allowEmail ? t('assistant.account.phone') : t('assistant.account.identifier'),
      {
        chips: allowEmail ? [t('assistant.chips.useEmail')] : [],
      },
    )
    if (!isText(a)) continue
    const wantsEmail = pick(a.text, ['email']) || /@| at /.test(a.text.toLowerCase())
    if (wantsEmail) {
      let address = /@| at /.test(a.text.toLowerCase()) ? email(a.text) : ''
      if (!address) {
        const b = await e.ask(t('assistant.account.email'))
        if (!isText(b)) continue
        address = email(b.text)
      }
      if (validateField({ id: 'email', type: 'email', required: true }, address)) {
        await e.say(t('assistant.account.badEmail', { heard: address }))
        continue
      }
      if (await confirmValue(c, address.replace('@', ' at ').replace(/\./g, ' dot ')))
        return { email: address }
      continue
    }
    const digits = phone(a.text)
    if (!normaliseEthiopianPhone(digits)) {
      await e.say(t('assistant.account.badPhone', { heard: spellDigits(digits) || a.text }))
      continue
    }
    if (await confirmValue(c, spellDigits(digits))) return { phone: digits }
  }
}

async function askPassword(c: DialogContext, newPassword: boolean): Promise<string> {
  for (;;) {
    const a = await c.e.ask(
      c.t(newPassword ? 'assistant.account.newPassword' : 'assistant.account.password'),
      { kind: 'password' },
    )
    if (!isText(a)) continue
    if (newPassword && a.text.length < 8) {
      await c.e.say(c.t('assistant.account.shortPassword'))
      continue
    }
    return a.text
  }
}

async function registerDialog(c: DialogContext): Promise<Me | null> {
  const { e, t } = c
  let name = ''
  while (!name) {
    const a = await e.ask(t('assistant.account.name'))
    if (isText(a) && (await confirmValue(c, a.text))) name = a.text.trim()
  }
  const contact = await askPhoneOrEmail(c, true)
  const password = await askPassword(c, true)
  await e.say(t('assistant.account.privacy'))
  const agree = await e.ask(t('assistant.account.agree'), { chips: [t('app.yes'), t('app.no')] })
  if (!isText(agree) || yesNo(agree.text) !== 'yes') {
    await e.say(t('assistant.account.noAgreement'))
    return null
  }
  try {
    e.thinking()
    const me = await c.register({
      displayName: name,
      ...contact,
      password,
      acceptPrivacyNotice: true,
    })
    await e.say(t('assistant.account.created', { name: me.displayName }))
    return me
  } catch (err) {
    await e.say(t(`errors.${err instanceof ApiError ? err.code : 'error.unexpected'}`))
    const a = await e.ask(t('assistant.account.trySignIn'), { chips: [t('app.yes'), t('app.no')] })
    return isText(a) && yesNo(a.text) === 'yes' ? signInDialog(c) : null
  }
}

async function signInDialog(c: DialogContext): Promise<Me | null> {
  const { e, t } = c
  for (let attempt = 0; attempt < 3; attempt++) {
    const id = await askPhoneOrEmail(c, false)
    const password = await askPassword(c, false)
    try {
      e.thinking()
      const me = await c.signIn(id.phone ?? id.email ?? '', password)
      await e.say(t('assistant.account.signedIn', { name: me.displayName }))
      return me
    } catch (err) {
      await e.say(
        t(`errors.${err instanceof ApiError ? err.code : 'error.unexpected'}`, { seconds: 60 }),
      )
    }
  }
  return null
}

// ---- Questions from flow definitions -------------------------------------------------------------------------------

function textFor(c: DialogContext, ns: string, f: Field) {
  const base = `${ns}.${f.id}`
  return {
    label: f.label ?? (f.labelKey ? c.t(f.labelKey) : c.t(`${base}.label`)),
    hint: f.label ? undefined : c.opt(`${base}.hint`),
    option: (o: { value: string; label?: string; labelKey?: string }) =>
      o.label ?? (o.labelKey ? c.t(o.labelKey) : c.t(`${base}.options.${o.value}`)),
  }
}

type FieldResult = { value: unknown } | { control: 'back' | 'skip' }

/** Asks one field by voice (or text) and returns a validated value. */
async function askField(
  c: DialogContext,
  ns: string,
  f: Field,
  current: unknown,
): Promise<FieldResult> {
  const { e, t } = c
  const tx = textFor(c, ns, f)
  const optional = !f.required && f.type !== 'consent'
  const options = (f.options ?? []).map((o) => ({ value: o.value, label: tx.option(o) }))
  const list = options.map((o, i) => `${i + 1}: ${o.label}`).join('. ')
  const prompt = [
    f.type === 'consent' ? t(`${ns}.${f.id}.statement`, { defaultValue: tx.label }) : tx.label,
    tx.hint,
    f.type === 'radio' || f.type === 'select' ? t('assistant.q.chooseOne', { list }) : '',
    f.type === 'checkboxes' ? t('assistant.q.chooseMany', { list }) : '',
    f.type === 'consent' ? t('assistant.q.agree') : '',
    optional ? t('assistant.q.optional') : '',
    isPresent(current) && f.type !== 'list'
      ? t('assistant.q.current', { value: show(current, options) })
      : '',
  ]
    .filter(Boolean)
    .join(' ')

  if (f.type === 'file') {
    await e.say(t('assistant.q.fileLater'))
    return { control: 'skip' }
  }
  if (f.type === 'list') return askList(c, ns, f, current)

  for (;;) {
    const a = await e.ask(prompt, {
      // A question that already has an answer can be skipped: the answer is kept.
      optional: optional || isPresent(current),
      chips:
        f.type === 'consent'
          ? [t('app.yes'), t('app.no')]
          : options.length <= 6
            ? options.map((o) => o.label)
            : [],
      help: tx.hint ?? t('assistant.q.help'),
    })
    if (!isText(a)) {
      if (a.control === 'skip' && isPresent(current)) return { value: current }
      if (a.control === 'back' || a.control === 'skip') return { control: a.control }
      continue
    }
    const said = a.text
    let value: unknown
    if (
      isPresent(current) &&
      (yesNo(said) === 'yes' || /keep|same|ያው/.test(normalise(said))) &&
      f.type !== 'consent'
    )
      return { value: current }
    switch (f.type) {
      case 'radio':
      case 'select': {
        const r = interpret(said, options)
        if (r.kind === 'option') value = r.value
        else if (r.kind === 'yes' || r.kind === 'no')
          value = options.find((o) => o.value === r.kind)?.value
        break
      }
      case 'checkboxes': {
        // Several choices in one answer: by name ("interviews and travel") or by number ("one and three").
        const tt = normalise(said)
        const words = tt.split(' ')
        if (/^(none|nothing|no|ምንም)( |$)/.test(tt)) value = []
        else {
          const chosen = options.filter(
            (o, k) =>
              tt.includes(normalise(o.label)) ||
              words.some((w) => {
                const r = interpret(w, options)
                return (
                  r.kind === 'option' && r.value === o.value && /^\d+$|^[a-z]+$/.test(w) && k >= 0
                )
              }),
          )
          value = chosen.length ? chosen.map((o) => o.value) : undefined
        }
        break
      }
      case 'consent':
        value = yesNo(said) === 'yes' ? true : yesNo(said) === 'no' ? false : undefined
        break
      case 'tel': {
        const d = phone(said)
        if (normaliseEthiopianPhone(d) && (await confirmValue(c, spellDigits(d)))) value = d
        else if (!normaliseEthiopianPhone(d))
          await e.say(t('assistant.account.badPhone', { heard: spellDigits(d) || said }))
        if (value === undefined) continue
        break
      }
      case 'email': {
        const addr = email(said)
        if (
          !validateField(f, addr) &&
          (await confirmValue(c, addr.replace('@', ' at ').replace(/\./g, ' dot ')))
        )
          value = addr
        else if (validateField(f, addr))
          await e.say(t('assistant.account.badEmail', { heard: addr }))
        if (value === undefined) continue
        break
      }
      case 'year':
      case 'number':
        value = number(said) ?? undefined
        break
      default:
        value = said.trim()
    }
    if (value === undefined) {
      await e.say(t('assistant.q.notUnderstood', { heard: said }))
      continue
    }
    const error = validateField(f, value)
    if (error) {
      await e.say(t(`errors.${error}`, { max: f.maxLength, min: f.minLength }))
      continue
    }
    if (f.type === 'radio' || f.type === 'select' || f.type === 'checkboxes')
      await e.say(t('assistant.q.gotChoice', { value: show(value, options) }))
    return { value }
  }
}

function show(v: unknown, options: { value: string; label: string }[]): string {
  if (Array.isArray(v))
    return v.length
      ? v
          .map((x) =>
            typeof x === 'object' ? '' : (options.find((o) => o.value === x)?.label ?? String(x)),
          )
          .join(', ')
      : '-'
  if (typeof v === 'boolean') return v ? '✓' : '-'
  return options.find((o) => o.value === v)?.label ?? String(v)
}

async function askList(
  c: DialogContext,
  ns: string,
  f: Field,
  current: unknown,
): Promise<FieldResult> {
  const { e, t } = c
  const items = Array.isArray(current) ? [...(current as FlowData[])] : []
  const label = textFor(c, ns, f).label
  for (;;) {
    const a = await e.ask(
      items.length
        ? t('assistant.q.listMore', { label, count: items.length })
        : t('assistant.q.listAdd', { label }),
      { optional: true, chips: [t('app.yes'), t('app.no')] },
    )
    if (!isText(a)) return a.control === 'back' ? { control: 'back' } : { value: items }
    if (yesNo(a.text) !== 'yes') return { value: items }
    const item: FlowData = {}
    for (const sub of f.itemFields ?? []) {
      const r = await askField(c, `${ns}.${f.id}`, sub, undefined)
      if ('value' in r) item[sub.id] = r.value
    }
    items.push(item)
  }
}

/**
 * Asks the visible questions of a flow one by one ("back" returns to the previous question, "skip" leaves an optional
 * one empty). Known answers in `skip` are not asked again. Progress is saved as a draft after every answer.
 */
async function voiceFlow(
  c: DialogContext,
  def: FlowDefinition,
  ns: string,
  start: FlowData,
  opts: { skip?: string[]; draftUrl?: string } = {},
): Promise<FlowData> {
  const data: FlowData = { ...start }
  const skip = new Set(opts.skip ?? [])
  let i = 0
  for (;;) {
    const steps = visibleSteps(def, data).filter((s) => !skip.has(s.id))
    if (i >= steps.length) return data
    const step = steps[i]
    let back = false
    for (const f of step.fields) {
      const r = await askField(c, ns, f, data[f.id])
      if ('value' in r) data[f.id] = r.value
      else if (r.control === 'back') back = true
    }
    i = back ? Math.max(0, i - 1) : i + 1
    if (opts.draftUrl) {
      const clean = Object.fromEntries(
        Object.entries(data).filter(
          ([k]) =>
            !def.steps.some((s) => s.fields.some((f) => f.id === k && f.type === 'password')),
        ),
      )
      void api
        .put(opts.draftUrl, { definitionVersion: def.version, currentStep: step.id, data: clean })
        .catch(() => undefined)
    }
  }
}

// ---- Applying ----------------------------------------------------------------------------------------------------

async function applyDialog(c: DialogContext, jobId: string) {
  const { e, t } = c
  const me = await ensureAccount(c, 'apply')
  if (!me) return
  e.thinking()
  const [job, form, profileDef, profile, mine] = await Promise.all([
    api.get<JobDetail>(`/api/v1/jobs/${jobId}`),
    api.get<FlowDefinition>(`/api/v1/jobs/${jobId}/application-form`),
    api.get<FlowDefinition>('/api/v1/forms/profile'),
    api.get<Profile>('/api/v1/profile'),
    api.get<ApplicationSummary[]>('/api/v1/applications'),
  ])
  const existing = mine.find((a) => a.jobId === jobId)
  if (existing) {
    await e.say(
      t('assistant.apply.already', {
        title: job.title,
        status: t(`applications.status.${existing.status}`),
      }),
    )
    return
  }
  if (!job.open) {
    await e.say(t('jobs.closed'))
    return
  }
  // Only the profile details this employer still needs; names come from the account name.
  const saved = profileAnswers(profile)
  const missing = MINIMUM_FOR_APPLYING.filter((id) => !isPresent(saved[id]))
  if (missing.length) {
    const names = namesFromDisplayName(me.displayName)
    const ask = missing.filter((id) => !isPresent(names[id]))
    await e.say(t('assistant.apply.minimum', { count: ask.length }))
    const data = await voiceFlow(c, subsetDefinition(profileDef, missing), 'flows.profile', names, {
      skip: missing.filter((id) => isPresent(names[id])),
    })
    await api.put(`/api/v1/profile/steps?steps=${missing.join(',')}`, data)
  }
  // The application itself; contact details already on the account are not asked again.
  await e.say(t('assistant.apply.start', { title: job.title }))
  const draftUrl = `/api/v1/drafts/job-application?context=${encodeURIComponent(jobId)}`
  const draft = await api.get<Draft | undefined>(draftUrl).catch(() => undefined)
  const start = initialData(
    form,
    { 'account.email': me.email, 'account.phone': me.phone, 'profile.summary': profile.summary },
    draft?.data ?? {},
  )
  const contactKnown = Boolean(me.phone || me.email)
  const data = await voiceFlow(c, form, 'flows.job-application', start, {
    skip: contactKnown ? ['contactPhone', 'contactEmail'] : [],
    draftUrl,
  })
  // Review: everything is read back, then an explicit yes is needed to send.
  const review = visibleSteps(form, data)
    .flatMap((s) => s.fields)
    .filter((f) => isPresent(data[f.id]))
    .map((f) => {
      const tx = textFor(c, 'flows.job-application', f)
      return `${tx.label} ${show(
        data[f.id],
        (f.options ?? []).map((o) => ({ value: o.value, label: tx.option(o) })),
      )}`
    })
    .join('. ')
  await e.say(t('assistant.apply.review', { answers: review }))
  const a = await e.ask(
    t('assistant.apply.confirm', { title: job.title, org: job.organizationName ?? '' }),
    {
      chips: [t('assistant.chips.send'), t('assistant.chips.notYet')],
    },
  )
  if (!isText(a) || yesNo(a.text) !== 'yes') {
    await e.say(t('assistant.apply.kept'))
    return
  }
  e.thinking()
  const res = await api.post<ApplicationSummary>(`/api/v1/jobs/${jobId}/applications`, data)
  void api.del(draftUrl).catch(() => undefined)
  await e.say(
    t('assistant.apply.sent', {
      title: job.title,
      reference: res.referenceCode.split('').join(' '),
    }),
  )
}

// ---- Profile, support, tracking ----------------------------------------------------------------------------------

async function profileDialog(c: DialogContext) {
  const { e, t } = c
  const me = await ensureAccount(c, 'profile')
  if (!me) return
  const [def, profile] = await Promise.all([
    api.get<FlowDefinition>('/api/v1/forms/profile'),
    api.get<Profile>('/api/v1/profile'),
  ])
  const answers = { ...namesFromDisplayName(me.displayName), ...profileAnswers(profile) }
  const todo = PROFILE_PARTS.filter((p) => p.steps.some((id) => !isPresent(answers[id])))
  if (!todo.length) await e.say(t('assistant.profile.complete'))
  else await e.say(t('assistant.profile.intro', { parts: todo.length }))
  for (const [n, part] of todo.entries()) {
    await e.say(
      t('assistant.profile.part', {
        n: n + 1,
        total: todo.length,
        name: t(`profileParts.names.${part.id}`),
      }),
    )
    const ids = [...part.steps]
    const data = await voiceFlow(c, subsetDefinition(def, ids), 'flows.profile', answers, {
      skip: ids.filter((id) => isPresent(answers[id])),
      draftUrl: `/api/v1/drafts/profile?context=${part.id}`,
    })
    await api.put(`/api/v1/profile/steps?steps=${ids.join(',')}`, data)
    void api.del(`/api/v1/drafts/profile?context=${part.id}`).catch(() => undefined)
    Object.assign(answers, data)
    if (n < todo.length - 1) {
      const a = await e.ask(
        t('assistant.profile.partDone', { name: t(`profileParts.names.${todo[n + 1].id}`) }),
        { chips: [t('app.yes'), t('app.no')] },
      )
      if (!isText(a) || yesNo(a.text) !== 'yes') {
        await e.say(t('assistant.profile.saved'))
        return
      }
    }
  }
  await e.say(t('assistant.profile.ready'))
  const a = await e.ask(t('assistant.profile.offerSupport'), { chips: [t('app.yes'), t('app.no')] })
  if (!isText(a) || yesNo(a.text) !== 'yes') return
  const data = await voiceFlow(c, subsetDefinition(def, SUPPORT_STEPS), 'flows.profile', {
    workplaceSupport: profile.supportPreferences ?? [],
  })
  await api.put(`/api/v1/learners/${me.id}/support`, {
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
  await e.say(t('assistant.support.sent'))
}

async function supportDialog(c: DialogContext) {
  const { e, t } = c
  const me = await ensureAccount(c, 'support')
  if (!me) return
  await e.say(t('assistant.support.intro'))
  const def = await api.get<FlowDefinition>('/api/v1/forms/support-request')
  const draftUrl = '/api/v1/drafts/support-request?context='
  const draft = await api.get<Draft | undefined>(draftUrl).catch(() => undefined)
  const data = await voiceFlow(c, def, 'flows.support-request', draft?.data ?? {}, { draftUrl })
  const a = await e.ask(t('assistant.support.confirm'), {
    chips: [t('assistant.chips.send'), t('assistant.chips.notYet')],
  })
  if (!isText(a) || yesNo(a.text) !== 'yes') {
    await e.say(t('assistant.apply.kept'))
    return
  }
  await api.post('/api/v1/support-requests', data)
  void api.del(draftUrl).catch(() => undefined)
  await e.say(t('assistant.support.sent'))
}

async function trackDialog(c: DialogContext) {
  const { e, t } = c
  const me = await ensureAccount(c, 'track')
  if (!me) return
  const apps = await api.get<ApplicationSummary[]>('/api/v1/applications')
  if (!apps.length) {
    await e.say(t('assistant.track.none'))
    return
  }
  await e.say(
    `${t('assistant.track.count', { count: apps.length })} ${apps
      .map((a, i) =>
        t('assistant.track.item', {
          n: i + 1,
          title: a.jobTitle ?? '',
          org: a.organizationName ?? '',
          status: t(`applications.status.${a.status}`),
        }),
      )
      .join(' ')}`,
  )
}
