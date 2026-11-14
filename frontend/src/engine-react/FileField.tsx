import { FileCheck2, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { Button } from '../design-system/Button'
import { describedBy, type FieldMeta } from '../design-system/Field'
import { useAnnounce } from '../a11y/announcer'
import { useT } from '../i18n/useT'
import { ApiError, api } from '../lib/api'
import type { FileInfo } from '../lib/types'

/** Protected upload: the file goes straight to the server; only its id is kept in the answers. */
export function FileField({
  meta,
  purpose,
  value,
  name,
  onChange,
}: {
  meta: FieldMeta
  purpose: string
  value: unknown
  name?: string
  onChange: (id: string | undefined, name?: string) => void
}) {
  const t = useT()
  const announce = useAnnounce()
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const accept =
    purpose === 'RESUME'
      ? '.pdf,.docx,application/pdf'
      : '.pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png'

  const upload = async (file: File) => {
    setBusy(true)
    setError(null)
    try {
      const form = new FormData()
      form.append('file', file)
      const info = await api.post<FileInfo>(
        `/api/v1/files?purpose=${encodeURIComponent(purpose)}`,
        form,
      )
      onChange(info.id, info.name)
      announce(t('flow.fileUploaded', { name: info.name }))
    } catch (e) {
      const code = e instanceof ApiError ? e.code : 'error.network'
      setError(t(`errors.${code}`))
      announce(t(`errors.${code}`), 'assertive')
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {value ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border-2 border-success bg-success-soft px-4 py-3">
          <FileCheck2 aria-hidden="true" className="text-success" />
          <span className="font-semibold">
            {t('flow.fileUploaded', { name: name ?? t('flow.fileDefaultName') })}
          </span>
          <Button variant="ghost" size="sm" onClick={() => onChange(undefined)}>
            {t('flow.fileRemove')}
          </Button>
        </div>
      ) : (
        <>
          {/* The visible button is the single keyboard/screen-reader control; the native input is hidden. */}
          <input
            ref={input}
            type="file"
            accept={accept}
            tabIndex={-1}
            aria-hidden="true"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
          />
          <Button
            id={meta.id}
            aria-describedby={describedBy(meta)}
            variant="secondary"
            icon={<Upload size={20} aria-hidden="true" />}
            busy={busy}
            onClick={() => input.current?.click()}
          >
            {busy ? t('flow.fileUploading') : t('flow.fileChoose')}
          </Button>
        </>
      )}
      <p className="text-muted">
        {t(purpose === 'RESUME' ? 'flow.fileHintResume' : 'flow.fileHintId')}
      </p>
      {error && <p className="font-semibold text-danger">{error}</p>}
    </div>
  )
}
