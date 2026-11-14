import { Eye } from 'lucide-react'
import { useT } from '../../i18n/useT'
import type { Profile } from '../../lib/types'

/** Shows exactly what the employer will receive from the profile, based on the sharing choices. */
export function SharingPreview({
  profile,
  sections,
  shareAccommodation,
}: {
  profile?: Profile
  sections: string[]
  shareAccommodation: boolean
}) {
  const t = useT()
  if (!profile) return null
  const rows: [string, string][] = []
  if (sections.includes('NAME'))
    rows.push([
      t('apply.share.NAME'),
      [profile.givenName, profile.fatherName, profile.grandfatherName].filter(Boolean).join(' '),
    ])
  if (sections.includes('LOCATION'))
    rows.push([
      t('apply.share.LOCATION'),
      [profile.region && t(`regions.${profile.region}`), profile.city].filter(Boolean).join(', '),
    ])
  if (sections.includes('EXPERIENCE'))
    rows.push([
      t('apply.share.EXPERIENCE'),
      t('flow.listCount', { count: profile.experience.length }),
    ])
  if (sections.includes('EDUCATION'))
    rows.push([
      t('apply.share.EDUCATION'),
      t('flow.listCount', { count: profile.education.length }),
    ])
  if (sections.includes('SKILLS')) rows.push([t('apply.share.SKILLS'), profile.skills.join(', ')])
  if (sections.includes('LANGUAGES'))
    rows.push([
      t('apply.share.LANGUAGES'),
      profile.languages.map((l) => t(`flows.profile.languages.options.${l}`)).join(', '),
    ])
  if (sections.includes('RESUME'))
    rows.push([t('apply.share.RESUME'), profile.resume?.name ?? t('apply.noResume')])
  return (
    <section
      aria-labelledby="sharing-preview"
      className="mt-6 rounded-2xl border-2 border-primary p-4"
    >
      <h3 id="sharing-preview" className="flex items-center gap-2 text-xl font-bold">
        <Eye aria-hidden="true" />
        {t('apply.previewTitle')}
      </h3>
      <p className="mb-3 text-muted">{t('apply.previewLead')}</p>
      {rows.length === 0 ? (
        <p>{t('apply.previewNothing')}</p>
      ) : (
        <dl className="flex flex-col gap-2">
          {rows.map(([k, v]) => (
            <div key={k}>
              <dt className="font-semibold">{k}</dt>
              <dd>{v || t('flow.notAnswered')}</dd>
            </div>
          ))}
        </dl>
      )}
      <p className="mt-3 font-semibold">
        {shareAccommodation
          ? t('apply.previewAccommodationShared')
          : t('apply.previewAccommodationPrivate')}
      </p>
      <p className="mt-1 text-sm text-muted">{t('apply.previewNever')}</p>
    </section>
  )
}
