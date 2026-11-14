import { LogIn } from 'lucide-react'
import { useId, useRef, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router'
import { useAnnounce } from '../../a11y/announcer'
import { Alert } from '../../design-system/Alert'
import { Button } from '../../design-system/Button'
import { FormField, inputClass } from '../../design-system/Field'
import { Card, PageHeader } from '../../design-system/Layout'
import { useT } from '../../i18n/useT'
import { ApiError, NetworkError } from '../../lib/api'
import { useSession } from '../../lib/session'

export default function SignInPage() {
  const t = useT()
  const { me, signIn } = useSession()
  const navigate = useNavigate()
  const announce = useAnnounce()
  const [params] = useSearchParams()
  const id = useId()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const errorRef = useRef<HTMLDivElement>(null)
  const next = params.get('next')
  const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : null

  if (me)
    return (
      <Navigate
        to={
          safeNext ??
          (me.roles.includes('EMPLOYER')
            ? '/employer'
            : me.roles.includes('SUPPORT_STAFF')
              ? '/staff'
              : '/dashboard')
        }
        replace
      />
    )

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!identifier.trim() || !password) {
      setError(t('auth.fillBoth'))
      window.requestAnimationFrame(() => errorRef.current?.focus())
      return
    }
    setBusy(true)
    try {
      const user = await signIn(identifier.trim(), password)
      announce(t('auth.signedIn', { name: user.displayName }))
      navigate(
        safeNext ??
          (user.roles.includes('EMPLOYER')
            ? '/employer'
            : user.roles.includes('SUPPORT_STAFF')
              ? '/staff'
              : '/dashboard'),
      )
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.code === 'auth.tooManyAttempts'
            ? t('errors.auth.tooManyAttempts', { seconds: err.retryAfterSeconds ?? 60 })
            : t(`errors.${err.code}`)
          : err instanceof NetworkError
            ? t('errors.error.network')
            : t('errors.error.unexpected')
      setError(msg)
      window.requestAnimationFrame(() => errorRef.current?.focus())
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title={t('auth.signInTitle')} lead={t('auth.signInLead')} />
      <Card>
        <form onSubmit={submit} noValidate className="flex flex-col gap-5">
          {error && (
            <div ref={errorRef} tabIndex={-1} role="alert">
              <Alert tone="error">{error}</Alert>
            </div>
          )}
          <FormField
            id={`${id}-identifier`}
            label={t('auth.identifier')}
            hint={t('auth.identifierHint')}
            required
          >
            <input
              id={`${id}-identifier`}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoComplete="username"
              aria-describedby={`${id}-identifier-hint`}
              className={`${inputClass(false)} min-h-14`}
            />
          </FormField>
          <FormField id={`${id}-password`} label={t('auth.password')} required>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                id={`${id}-password`}
                type={show ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className={`${inputClass(false)} min-h-14`}
              />
              <Button variant="secondary" aria-pressed={show} onClick={() => setShow((s) => !s)}>
                {show ? t('auth.hidePassword') : t('auth.showPassword')}
              </Button>
            </div>
          </FormField>
          <Button type="submit" size="lg" busy={busy} icon={<LogIn size={20} aria-hidden="true" />}>
            {t('auth.signInButton')}
          </Button>
        </form>
      </Card>
      <p className="mt-6 text-center">
        {t('auth.noAccount')}{' '}
        <Link to="/preview" className="font-semibold text-primary underline">
          {t('auth.createAccount')}
        </Link>
      </p>
      <p className="mt-2 text-center text-muted">
        {t('auth.forgotHelp')}{' '}
        <Link to="/help" className="font-semibold text-primary underline">
          {t('nav.help')}
        </Link>
      </p>
    </div>
  )
}
