import { Download, Trash2 } from 'lucide-react'
import { useId, useState } from 'react'
import { useNavigate } from 'react-router'
import { useAnnounce } from '../../a11y/announcer'
import { Alert } from '../../design-system/Alert'
import { Button } from '../../design-system/Button'
import { Dialog } from '../../design-system/Dialog'
import { FormField, inputClass } from '../../design-system/Field'
import { Card, PageHeader } from '../../design-system/Layout'
import { useT } from '../../i18n/useT'
import { ApiError, api, downloadFile } from '../../lib/api'
import { useSession } from '../../lib/session'

/** Data rights: download everything, change password, permanently delete the account. */
export default function AccountPage() {
  const t = useT()
  const id = useId()
  const announce = useAnnounce()
  const navigate = useNavigate()
  const { me, signOut } = useSession()
  const [pw, setPw] = useState({ current: '', next: '' })
  const [pwMsg, setPwMsg] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletePw, setDeletePw] = useState('')
  const [deleteErr, setDeleteErr] = useState<string | null>(null)

  const changePassword = async () => {
    try {
      await api.post('/api/v1/auth/password', { currentPassword: pw.current, newPassword: pw.next })
      setPw({ current: '', next: '' })
      setPwMsg({ tone: 'success', text: t('account.passwordChanged') })
      announce(t('account.passwordChanged'))
    } catch (e) {
      const code = e instanceof ApiError ? (e.fieldErrors[0]?.code ?? e.code) : 'error.network'
      setPwMsg({ tone: 'error', text: t(`errors.${code}`) })
      announce(t(`errors.${code}`), 'assertive')
    }
  }

  const deleteAccount = async () => {
    try {
      await api.post('/api/v1/account/delete', { password: deletePw })
      await signOut()
      announce(t('account.deleted'))
      navigate('/')
    } catch (e) {
      setDeleteErr(
        t(`errors.${e instanceof ApiError ? (e.fieldErrors[0]?.code ?? e.code) : 'error.network'}`),
      )
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={t('account.title')} lead={t('account.lead', { name: me?.displayName })} />
      <div className="flex flex-col gap-6">
        <Card as="section">
          <h2 className="mb-2 text-xl font-bold">{t('account.exportTitle')}</h2>
          <p className="mb-3 text-muted">{t('account.exportLead')}</p>
          <Button
            variant="secondary"
            icon={<Download size={18} aria-hidden="true" />}
            onClick={async () => {
              await downloadFile('/api/v1/account/export', 'accessflow-my-data.json')
              announce(t('account.exported'))
            }}
          >
            {t('account.export')}
          </Button>
        </Card>
        <Card as="section">
          <h2 className="mb-3 text-xl font-bold">{t('account.passwordTitle')}</h2>
          <div className="flex flex-col gap-4">
            {pwMsg && <Alert tone={pwMsg.tone}>{pwMsg.text}</Alert>}
            <FormField id={`${id}-cur`} label={t('account.currentPassword')} required>
              <input
                id={`${id}-cur`}
                type="password"
                autoComplete="current-password"
                value={pw.current}
                onChange={(e) => setPw({ ...pw, current: e.target.value })}
                className={`${inputClass(false)} min-h-14`}
              />
            </FormField>
            <FormField
              id={`${id}-new`}
              label={t('account.newPassword')}
              hint={t('flows.registration.password.hint')}
              required
            >
              <input
                id={`${id}-new`}
                type="password"
                autoComplete="new-password"
                aria-describedby={`${id}-new-hint`}
                value={pw.next}
                onChange={(e) => setPw({ ...pw, next: e.target.value })}
                className={`${inputClass(false)} min-h-14`}
              />
            </FormField>
            <Button onClick={changePassword} disabled={!pw.current || !pw.next}>
              {t('account.changePassword')}
            </Button>
          </div>
        </Card>
        <Card as="section" className="border-danger">
          <h2 className="mb-2 text-xl font-bold">{t('account.deleteTitle')}</h2>
          <p className="mb-3">{t('account.deleteLead')}</p>
          <Button
            variant="danger"
            icon={<Trash2 size={18} aria-hidden="true" />}
            onClick={() => setDeleteOpen(true)}
          >
            {t('account.delete')}
          </Button>
        </Card>
      </div>
      <Dialog
        open={deleteOpen}
        title={t('account.deleteConfirmTitle')}
        onClose={() => setDeleteOpen(false)}
        actions={
          <>
            <Button variant="danger" onClick={deleteAccount} disabled={!deletePw}>
              {t('account.deleteConfirm')}
            </Button>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>
              {t('app.cancel')}
            </Button>
          </>
        }
      >
        <p className="mb-3">{t('account.deleteWarning')}</p>
        {deleteErr && (
          <div className="mb-3">
            <Alert tone="error">{deleteErr}</Alert>
          </div>
        )}
        <FormField id={`${id}-del`} label={t('auth.password')} required>
          <input
            id={`${id}-del`}
            type="password"
            autoComplete="current-password"
            value={deletePw}
            onChange={(e) => setDeletePw(e.target.value)}
            className={`${inputClass(false)} min-h-14`}
          />
        </FormField>
      </Dialog>
    </div>
  )
}
