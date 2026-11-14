import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { Loading } from '../design-system/Layout'
import { useT } from '../i18n/useT'
import { useSession } from '../lib/session'
import type { Role } from '../lib/types'

/** UX guard only - every API call is authorised on the server regardless of what the browser shows. */
export function RequireAuth({
  children,
  requiredRole,
}: {
  children: ReactNode
  requiredRole?: Role
}) {
  const { me } = useSession()
  const t = useT()
  const location = useLocation()
  if (me === undefined) return <Loading label={t('app.loading')} />
  if (me === null)
    return (
      <Navigate
        to={`/sign-in?next=${encodeURIComponent(location.pathname + location.search)}`}
        replace
      />
    )
  if (requiredRole && !me.roles.includes(requiredRole)) return <Navigate to="/" replace />
  return <>{children}</>
}
