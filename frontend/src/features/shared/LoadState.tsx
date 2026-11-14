import type { ReactNode } from 'react'
import { Alert } from '../../design-system/Alert'
import { Button } from '../../design-system/Button'
import { Loading } from '../../design-system/Layout'
import { useT } from '../../i18n/useT'
import type { ApiState } from '../../lib/useApi'

/** Accessible loading / error (with retry) states for data-backed pages. */
export function LoadState<T>({
  state,
  children,
}: {
  state: ApiState<T>
  children: (data: T) => ReactNode
}) {
  const t = useT()
  if (state.loading && state.data === undefined) return <Loading label={t('app.loading')} />
  if (state.error && state.data === undefined)
    return (
      <Alert
        tone="error"
        title={t('errors.loadFailedTitle')}
        action={
          <Button variant="secondary" size="sm" onClick={state.reload}>
            {t('app.retry')}
          </Button>
        }
      >
        {t(`errors.${state.error}`)}
      </Alert>
    )
  if (state.data === undefined) return null
  return <>{children(state.data)}</>
}
