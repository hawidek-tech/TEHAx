import { Download, Lock, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { useAnnounce } from '../../a11y/announcer'
import { Alert } from '../../design-system/Alert'
import { Button, LinkButton } from '../../design-system/Button'
import { Badge, Card, PageHeader } from '../../design-system/Layout'
import { FileField } from '../../engine-react/FileField'
import { useT } from '../../i18n/useT'
import { api, downloadFile } from '../../lib/api'
import type { Consent, Profile } from '../../lib/types'
import { useApi } from '../../lib/useApi'
import { ACCOMMODATIONS } from '../jobs/JobsPage'
import { DateText } from '../shared/DateText'
import { LoadState } from '../shared/LoadState'

/** The reusable profile: view, edit, CV, private support preferences and sharing/consent control. */
export default function ProfilePage() {
  const t = useT()
  const announce = useAnnounce()
  const profile = useApi<Profile>('/api/v1/profile')
  const consents = useApi<Consent[]>('/api/v1/consents')
  const [supportDraft, setSupport] = useState<string[] | null>(null)
  const support = supportDraft ?? profile.data?.supportPreferences ?? []

  const saveSupport = async () => {
    await api.put('/api/v1/profile/support-preferences', { categories: support })
    announce(t('profile.supportSaved'))
    setSupport(null)
    profile.reload()
  }

  return (
    <LoadState state={profile}>
      {(p) => (
        <>
          <PageHeader
            title={t('profile.title')}
            lead={t('profile.lead')}
            actions={
              p.completed ? (
                <LinkButton to="/profile/edit" icon={<Pencil size={18} aria-hidden="true" />}>
                  {t('profile.edit')}
                </LinkButton>
              ) : undefined
            }
          />
          {!p.completed && (
            <div className="mb-6">
              <Alert
                tone="info"
                title={t('profile.notStartedTitle')}
                action={<LinkButton to="/onboarding">{t('app.start')}</LinkButton>}
              >
                {t('profile.notStarted')}
              </Alert>
            </div>
          )}
          {p.completed && p.missing.length > 0 && (
            <div className="mb-6">
              <Alert tone="warning" title={t('profile.missingTitle')}>
                {p.missing.map((m) => t(`profile.missing.${m}`)).join(', ')}
              </Alert>
            </div>
          )}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card as="section">
              <h2 className="mb-3 text-xl font-bold">{t('profile.about')}</h2>
              <dl className="flex flex-col gap-2">
                <Row
                  label={t('profile.name')}
                  value={[p.givenName, p.fatherName, p.grandfatherName].filter(Boolean).join(' ')}
                />
                <Row
                  label={t('flows.profile.region.label')}
                  value={p.region && t(`regions.${p.region}`)}
                />
                <Row label={t('flows.profile.city.label')} value={p.city} />
                <Row label={t('flows.profile.headline.label')} value={p.headline} />
                <Row label={t('flows.profile.summary.label')} value={p.summary} />
                <Row label={t('flows.profile.skills.label')} value={p.skills.join(', ')} />
                <Row
                  label={t('flows.profile.languages.label')}
                  value={p.languages
                    .map((l) => t(`flows.profile.languages.options.${l}`))
                    .join(', ')}
                />
              </dl>
            </Card>
            <Card as="section">
              <h2 className="mb-3 text-xl font-bold">{t('flows.profile.experience.label')}</h2>
              {p.experience.length === 0 ? (
                <p className="text-muted">{t('flow.listEmpty')}</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {p.experience.map((e, i) => (
                    <li key={i} className="rounded-lg border border-line p-3">
                      <p className="font-bold">{String(e.title)}</p>
                      <p className="text-muted">
                        {String(e.organization)}
                        {e.startYear ? ` · ${e.startYear}${e.endYear ? '–' + e.endYear : ''}` : ''}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
              <h2 className="mb-3 mt-6 text-xl font-bold">{t('flows.profile.education.label')}</h2>
              {p.education.length === 0 ? (
                <p className="text-muted">{t('flow.listEmpty')}</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {p.education.map((e, i) => (
                    <li key={i} className="rounded-lg border border-line p-3">
                      <p className="font-bold">
                        {t(`flows.profile.education.items.level.options.${e.level}`)}
                      </p>
                      <p className="text-muted">
                        {String(e.institution)}
                        {e.field ? ` · ${e.field}` : ''}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <Card as="section">
              <h2 className="mb-2 text-xl font-bold">{t('profile.resumeTitle')}</h2>
              <p className="mb-3 text-muted">{t('profile.resumeLead')}</p>
              {p.resume ? (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-semibold">{p.resume.name}</span>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<Download size={16} aria-hidden="true" />}
                    onClick={() =>
                      downloadFile(`/api/v1/files/${p.resume!.id}/content`, p.resume!.name)
                    }
                  >
                    {t('profile.download')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<Trash2 size={16} aria-hidden="true" />}
                    onClick={async () => {
                      await api.put('/api/v1/profile/resume', { fileId: null })
                      announce(t('profile.resumeRemoved'))
                      profile.reload()
                    }}
                  >
                    {t('app.remove')}
                  </Button>
                </div>
              ) : (
                <FileField
                  meta={{ id: 'resume-upload' }}
                  purpose="RESUME"
                  value={undefined}
                  onChange={async (fid) => {
                    if (fid) {
                      await api.put('/api/v1/profile/resume', { fileId: fid })
                      announce(t('profile.resumeAdded'))
                      profile.reload()
                    }
                  }}
                />
              )}
            </Card>
            <Card as="section">
              <h2 className="mb-2 flex items-center gap-2 text-xl font-bold">
                <Lock size={20} aria-hidden="true" />
                {t('profile.supportTitle')}
              </h2>
              <p className="mb-3 text-muted">{t('profile.supportLead')}</p>
              <fieldset>
                <legend className="sr-only">{t('profile.supportTitle')}</legend>
                <div className="grid gap-1 sm:grid-cols-2">
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
              <Button className="mt-3" onClick={saveSupport}>
                {t('app.save')}
              </Button>
            </Card>
          </div>

          <Card as="section" className="mt-6">
            <h2 className="mb-2 text-xl font-bold">{t('profile.sharingTitle')}</h2>
            <p className="mb-3 text-muted">{t('profile.sharingLead')}</p>
            <LoadState state={consents}>
              {(list) =>
                list.length === 0 ? (
                  <p>{t('profile.noConsents')}</p>
                ) : (
                  <ul className="flex flex-col gap-3">
                    {list.map((c) => (
                      <li
                        key={c.id}
                        className="flex flex-col gap-2 rounded-xl border-2 border-line p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="font-bold">{c.recipientName}</p>
                          <p className="text-muted">
                            {c.scopes.map((s) => t(`apply.share.${s}`)).join(', ')}
                          </p>
                          <p className="text-sm">
                            <DateText iso={c.grantedAt} />
                          </p>
                        </div>
                        {c.revokedAt ? (
                          <Badge tone="danger">{t('profile.revoked')}</Badge>
                        ) : (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={async () => {
                              await api.post(`/api/v1/consents/${c.id}/revoke`)
                              announce(t('applications.consentRevoked'))
                              consents.reload()
                            }}
                          >
                            {t('applications.revokeConsent')}
                            <span className="sr-only">: {c.recipientName}</span>
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                )
              }
            </LoadState>
          </Card>
          <p className="mt-6">
            <Link className="font-semibold text-primary underline" to="/account">
              {t('profile.accountLink')}
            </Link>{' '}
            ·{' '}
            <Link className="font-semibold text-primary underline" to="/identity">
              {t('nav.identity')}
            </Link>
          </p>
        </>
      )}
    </LoadState>
  )
}

function Row({ label, value }: { label: string; value?: string }) {
  const t = useT()
  return (
    <div>
      <dt className="font-semibold text-muted">{label}</dt>
      <dd>{value || <span className="text-muted">{t('flow.notAnswered')}</span>}</dd>
    </div>
  )
}
