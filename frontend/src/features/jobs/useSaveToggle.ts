import { useCallback } from 'react'
import { useNavigate } from 'react-router'
import { useAnnounce } from '../../a11y/announcer'
import { useT } from '../../i18n/useT'
import { api } from '../../lib/api'
import { useSession } from '../../lib/session'
import type { JobSummary } from '../../lib/types'

export function useSaveToggle(onChanged: () => void) {
  const { me } = useSession()
  const navigate = useNavigate()
  const announce = useAnnounce()
  const t = useT()
  return useCallback(
    async (job: Pick<JobSummary, 'id' | 'saved' | 'title'>) => {
      if (!me) return navigate(`/sign-in?next=/jobs/${job.id}`)
      if (job.saved) await api.del(`/api/v1/saved-jobs/${job.id}`)
      else await api.put(`/api/v1/saved-jobs/${job.id}`)
      announce(
        job.saved
          ? t('jobs.unsavedAnnounce', { title: job.title })
          : t('jobs.savedAnnounce', { title: job.title }),
      )
      onChanged()
    },
    [me, navigate, announce, t, onChanged],
  )
}
