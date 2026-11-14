import { useMemo } from 'react'
import { useNavigate } from 'react-router'
import { useAnnounce } from '../../a11y/announcer'
import { Loading, PageHeader } from '../../design-system/Layout'
import { FlowRunner } from '../../engine-react/FlowRunner'
import { useT } from '../../i18n/useT'
import { api } from '../../lib/api'
import { useSession } from '../../lib/session'
import type { Profile } from '../../lib/types'
import { useApi } from '../../lib/useApi'
import { useFlow } from '../shared/useFlow'

const EDITABLE = ['about', 'location', 'work', 'education']

/** Edit the profile with the same engine and validation; identity and support have their own pages. */
export default function ProfileEditPage() {
  const t = useT()
  const { me } = useSession()
  const navigate = useNavigate()
  const announce = useAnnounce()
  const flow = useFlow('profile')
  const profile = useApi<Profile>('/api/v1/profile')
  const def = useMemo(
    () =>
      flow.data && {
        ...flow.data,
        sections: flow.data.sections.filter((s) => EDITABLE.includes(s)),
        steps: flow.data.steps.filter((s) => EDITABLE.includes(s.section)),
      },
    [flow.data],
  )
  if (!def || !profile.data) return <Loading label={t('app.loading')} />
  const p = profile.data
  const initial = {
    givenName: p.givenName,
    fatherName: p.fatherName,
    grandfatherName: p.grandfatherName,
    birthYear: p.birthYear,
    region: p.region,
    city: p.city,
    headline: p.headline,
    summary: p.summary,
    experience: p.experience,
    education: p.education,
    skills: p.skills.join(', '),
    languages: p.languages,
  }
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={t('profile.editTitle')} lead={t('profile.editLead')} />
      <FlowRunner
        definition={def}
        flowKey="profile"
        context="edit"
        draftOwner={me?.id ?? null}
        serverDrafts
        initial={initial}
        submitLabel={t('app.save')}
        onSubmit={async (data) => {
          await api.put('/api/v1/profile', data)
          announce(t('profile.saved'))
          navigate('/profile')
        }}
      />
    </div>
  )
}
