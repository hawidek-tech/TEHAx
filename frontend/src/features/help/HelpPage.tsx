import { MessageCircleQuestion, Search } from 'lucide-react'
import { useId, useState } from 'react'
import { usePreferences } from '../../a11y/preferences'
import { ReadAloud } from '../../a11y/ReadAloud'
import { Button } from '../../design-system/Button'
import { inputClass } from '../../design-system/Field'
import { Card, PageHeader } from '../../design-system/Layout'
import { useT } from '../../i18n/useT'
import type { HelpArticle } from '../../lib/types'
import { useApi } from '../../lib/useApi'
import { LoadState } from '../shared/LoadState'
import { AssistantDialog } from './AssistantDialog'

/** Approved help content (always available, cached for offline use) plus the optional assistant. */
export default function HelpPage() {
  const t = useT()
  const id = useId()
  const { prefs } = usePreferences()
  const [q, setQ] = useState('')
  const [applied, setApplied] = useState('')
  const [assistant, setAssistant] = useState(false)
  const articles = useApi<HelpArticle[]>(
    `/api/v1/help?locale=${prefs.locale}${applied ? `&q=${encodeURIComponent(applied)}` : ''}`,
  )
  return (
    <>
      <PageHeader
        title={t('help.title')}
        lead={t('help.lead')}
        actions={
          <Button
            icon={<MessageCircleQuestion size={18} aria-hidden="true" />}
            onClick={() => setAssistant(true)}
          >
            {t('help.openAssistant')}
          </Button>
        }
      />
      <form
        role="search"
        aria-label={t('help.searchLabel')}
        className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end"
        onSubmit={(e) => {
          e.preventDefault()
          setApplied(q.trim())
        }}
      >
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor={`${id}-q`} className="font-semibold">
            {t('help.searchLabel')}
          </label>
          <input
            id={`${id}-q`}
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className={`${inputClass(false)} min-h-12`}
          />
        </div>
        <Button type="submit" icon={<Search size={18} aria-hidden="true" />}>
          {t('help.search')}
        </Button>
      </form>
      <LoadState state={articles}>
        {(list) =>
          list.length === 0 ? (
            <p>{t('help.noResults')}</p>
          ) : (
            <ul className="grid gap-4 md:grid-cols-2">
              {list.map((a) => (
                <li key={a.slug}>
                  <Card as="article" className="flex h-full flex-col gap-2">
                    <h2 className="text-xl font-bold" lang={a.locale}>
                      {a.title}
                    </h2>
                    <p lang={a.locale}>{a.body}</p>
                    {!a.reviewed && a.locale !== 'en' && (
                      <p className="text-sm text-muted">{t('help.draftTranslation')}</p>
                    )}
                    {a.locale !== prefs.locale && (
                      <p className="text-sm text-muted">{t('help.notTranslated')}</p>
                    )}
                    <ReadAloud text={`${a.title}. ${a.body}`} />
                  </Card>
                </li>
              ))}
            </ul>
          )
        }
      </LoadState>
      {assistant && <AssistantDialog open onClose={() => setAssistant(false)} />}
    </>
  )
}
