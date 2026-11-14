import { Lock, Search } from 'lucide-react'
import { useEffect, useId, useMemo, useState, type FormEvent } from 'react'
import { useAnnounce } from '../../a11y/announcer'
import { Button } from '../../design-system/Button'
import { inputClass } from '../../design-system/Field'
import { Card, EmptyState, PageHeader } from '../../design-system/Layout'
import { useT } from '../../i18n/useT'
import { useSession } from '../../lib/session'
import type { JobSummary, Profile } from '../../lib/types'
import { useApi } from '../../lib/useApi'
import { LoadState } from '../shared/LoadState'
import { JobCard } from './JobCard'
import { useSaveToggle } from './useSaveToggle'

export const REGIONS = [
  'ADDIS_ABABA',
  'AFAR',
  'AMHARA',
  'BENISHANGUL_GUMUZ',
  'CENTRAL_ETHIOPIA',
  'DIRE_DAWA',
  'GAMBELA',
  'HARARI',
  'OROMIA',
  'SIDAMA',
  'SOMALI',
  'SOUTH_ETHIOPIA',
  'SOUTH_WEST_ETHIOPIA',
  'TIGRAY',
  'OUTSIDE_ETHIOPIA',
]
export const ACCOMMODATIONS = [
  'SCREEN_READER',
  'SIGN_LANGUAGE',
  'CAPTIONS',
  'ACCESSIBLE_BUILDING',
  'FLEXIBLE_HOURS',
  'REMOTE_WORK',
  'ASSISTIVE_TECH',
  'ACCESSIBLE_INTERVIEW',
  'EXTRA_TIME',
  'WRITTEN_INSTRUCTIONS',
  'QUIET_SPACE',
  'TRANSPORT',
]

/**
 * Job discovery. The workplace-support filter is PRIVATE: it is applied for this search only, is not saved
 * with the search, and is never visible to employers. Nobody is asked to disclose a disability.
 */
export default function JobsPage() {
  const t = useT()
  const id = useId()
  const announce = useAnnounce()
  const { me } = useSession()
  const profile = useApi<Profile>(me ? '/api/v1/profile' : null)
  const [form, setForm] = useState({ q: '', region: '', workMode: '', type: '' })
  // Private support filter: starts from the user's own private profile choices, can be changed freely.
  const profileSupport = profile.data?.supportPreferences ?? []
  const [supportOverride, setSupport] = useState<string[] | null>(null)
  const support = supportOverride ?? profileSupport
  const usedProfile = supportOverride === null && profileSupport.length > 0
  const [appliedForm, setAppliedForm] = useState({ ...form, support: null as string[] | null })
  const applied = { ...appliedForm, support: appliedForm.support ?? profileSupport }

  const supportKey = applied.support.join(',')
  const url = useMemo(() => {
    const p = new URLSearchParams()
    if (applied.q) p.set('q', applied.q)
    if (applied.region) p.set('region', applied.region)
    if (applied.workMode) p.set('workMode', applied.workMode)
    if (applied.type) p.set('type', applied.type)
    if (supportKey) supportKey.split(',').forEach((s) => p.append('support', s))
    return `/api/v1/jobs?${p.toString()}`
  }, [applied.q, applied.region, applied.workMode, applied.type, supportKey])
  const jobs = useApi<JobSummary[]>(url)
  const toggleSave = useSaveToggle(jobs.reload)

  useEffect(() => {
    if (jobs.data && !jobs.loading) announce(t('jobs.results', { count: jobs.data.length }))
  }, [jobs.data, jobs.loading, announce, t])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setAppliedForm({ ...form, support })
  }

  const select = (name: keyof typeof form, options: string[], labelKey: (v: string) => string) => (
    <div className="flex flex-col gap-1">
      <label htmlFor={`${id}-${name}`} className="font-semibold">
        {t(`jobs.filters.${name}`)}
      </label>
      <select
        id={`${id}-${name}`}
        value={form[name]}
        onChange={(e) => setForm({ ...form, [name]: e.target.value })}
        className={`${inputClass(false)} min-h-12`}
      >
        <option value="">{t('jobs.filters.any')}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {labelKey(o)}
          </option>
        ))}
      </select>
    </div>
  )

  return (
    <>
      <PageHeader title={t('jobs.title')} lead={t('jobs.lead')} />
      <div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
        <Card as="section" className="self-start">
          <h2 className="mb-4 text-xl font-bold">{t('jobs.filtersTitle')}</h2>
          <form
            onSubmit={submit}
            className="flex flex-col gap-4"
            role="search"
            aria-label={t('jobs.searchLabel')}
          >
            <div className="flex flex-col gap-1">
              <label htmlFor={`${id}-q`} className="font-semibold">
                {t('jobs.filters.q')}
              </label>
              <input
                id={`${id}-q`}
                type="search"
                value={form.q}
                maxLength={100}
                onChange={(e) => setForm({ ...form, q: e.target.value })}
                className={`${inputClass(false)} min-h-12`}
              />
            </div>
            {select('region', REGIONS, (v) => t(`regions.${v}`))}
            {select('workMode', ['ONSITE', 'REMOTE', 'HYBRID'], (v) => t(`jobs.workMode.${v}`))}
            {select('type', ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP'], (v) =>
              t(`jobs.type.${v}`),
            )}
            <fieldset className="rounded-xl border-2 border-primary p-3">
              <legend className="flex items-center gap-2 px-1 font-bold">
                <Lock size={16} aria-hidden="true" />
                {t('jobs.supportFilterTitle')}
              </legend>
              <p className="mb-2 text-sm text-muted">{t('jobs.supportFilterLead')}</p>
              {usedProfile && (
                <p className="mb-2 text-sm font-semibold">{t('jobs.supportFromProfile')}</p>
              )}
              <div className="flex flex-col gap-1">
                {ACCOMMODATIONS.map((a) => (
                  <label key={a} className="flex min-h-11 cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      checked={support.includes(a)}
                      onChange={(e) =>
                        setSupport(
                          e.target.checked ? [...support, a] : support.filter((x) => x !== a),
                        )
                      }
                      className="size-5 accent-[var(--af-primary)]"
                    />
                    {t(`accommodations.${a}`)}
                  </label>
                ))}
              </div>
            </fieldset>
            <Button type="submit" icon={<Search size={18} aria-hidden="true" />}>
              {t('jobs.searchButton')}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                const empty = { q: '', region: '', workMode: '', type: '' }
                setForm(empty)
                setSupport([])
                setAppliedForm({ ...empty, support: [] })
              }}
            >
              {t('jobs.clear')}
            </Button>
          </form>
        </Card>
        <section aria-labelledby={`${id}-results`}>
          <h2 id={`${id}-results`} className="mb-4 text-xl font-bold">
            {jobs.data ? t('jobs.results', { count: jobs.data.length }) : t('jobs.resultsTitle')}
          </h2>
          <LoadState state={jobs}>
            {(list) =>
              list.length === 0 ? (
                <EmptyState title={t('jobs.noResults')}>{t('jobs.noResultsHint')}</EmptyState>
              ) : (
                <ul className="flex flex-col gap-4">
                  {list.map((j) => (
                    <li key={j.id}>
                      <JobCard job={j} onToggleSave={toggleSave} />
                    </li>
                  ))}
                </ul>
              )
            }
          </LoadState>
        </section>
      </div>
    </>
  )
}
