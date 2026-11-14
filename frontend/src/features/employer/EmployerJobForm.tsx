import { Plus, Trash2 } from 'lucide-react'
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useAnnounce } from '../../a11y/announcer'
import { Alert } from '../../design-system/Alert'
import { Button } from '../../design-system/Button'
import { FormField, inputClass } from '../../design-system/Field'
import { Card, Loading, PageHeader } from '../../design-system/Layout'
import { useT } from '../../i18n/useT'
import { ApiError, api } from '../../lib/api'
import type { JobDetail } from '../../lib/types'
import { ACCOMMODATIONS, REGIONS } from '../jobs/JobsPage'

interface Question {
  label: string
  type: 'text' | 'textarea' | 'radio'
  required: boolean
  options: string
}
const ACC_TEXT = [
  'workplaceAccommodations',
  'interviewArrangements',
  'flexibleWorking',
  'assistiveTechnology',
  'applicationAccessibility',
] as const
const EMPTY = {
  title: '',
  summary: '',
  plainSummary: '',
  description: '',
  region: 'ADDIS_ABABA',
  city: '',
  workMode: 'ONSITE',
  employmentType: 'FULL_TIME',
  salaryText: '',
  deadline: '',
  status: 'DRAFT',
}

/** Job posting + the employer accommodation form (all five areas) + custom application questions. */
export default function EmployerJobForm() {
  const { id } = useParams()
  const t = useT()
  const uid = useId()
  const navigate = useNavigate()
  const announce = useAnnounce()
  const [job, setJob] = useState(EMPTY)
  const [acc, setAcc] = useState<Record<string, string>>({})
  const [cats, setCats] = useState<string[]>([])
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(Boolean(id))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const errorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!id) return
    api
      .get<JobDetail>(`/api/v1/employer/jobs/${id}`)
      .then((j) => {
        setJob({
          title: j.title,
          summary: j.summary,
          plainSummary: j.plainSummary,
          description: j.description,
          region: j.region,
          city: j.city ?? '',
          workMode: j.workMode,
          employmentType: j.employmentType,
          salaryText: j.salaryText ?? '',
          deadline: j.deadline,
          status: j.status,
        })
        setCats(j.accommodations?.categories ?? [])
        setAcc(
          Object.fromEntries(
            Object.entries(j.accommodations ?? {})
              .filter(([k]) => k !== 'categories')
              .map(([k, v]) => [k, String(v ?? '')]),
          ),
        )
        setQuestions(
          j.customQuestions.map((q) => ({
            label: q.label,
            type: q.type as Question['type'],
            required: q.required,
            options: q.options.join('\n'),
          })),
        )
      })
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <Loading label={t('app.loading')} />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setErrors({})
    setError(null)
    const body = {
      ...job,
      city: job.city || undefined,
      salaryText: job.salaryText || undefined,
      accommodations: {
        categories: cats,
        ...Object.fromEntries(Object.entries(acc).map(([k, v]) => [k, v.trim() || undefined])),
      },
      customQuestions: questions
        .filter((q) => q.label.trim())
        .map((q) => ({
          label: q.label,
          type: q.type,
          required: q.required,
          options:
            q.type === 'radio'
              ? q.options
                  .split('\n')
                  .map((o) => o.trim())
                  .filter(Boolean)
              : [],
        })),
    }
    try {
      if (id) await api.put(`/api/v1/employer/jobs/${id}`, body)
      else await api.post('/api/v1/employer/jobs', body)
      announce(t('employer.saved'))
      navigate('/employer')
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors.length)
        setErrors(
          Object.fromEntries(
            err.fieldErrors.map((f) => [f.field.split('.')[0], t(`errors.${f.code}`)]),
          ),
        )
      setError(t(`errors.${err instanceof ApiError ? err.code : 'error.network'}`))
      window.requestAnimationFrame(() => errorRef.current?.focus())
    }
  }

  const text = (name: keyof typeof EMPTY, multiline = false, required = true, hintKey?: string) => (
    <FormField
      id={`${uid}-${name}`}
      label={t(`employer.fields.${name}`)}
      hint={hintKey ? t(hintKey) : undefined}
      error={errors[name]}
      required={required}
    >
      {multiline ? (
        <textarea
          id={`${uid}-${name}`}
          rows={name === 'description' ? 8 : 3}
          value={job[name]}
          onChange={(e) => setJob({ ...job, [name]: e.target.value })}
          aria-describedby={hintKey ? `${uid}-${name}-hint` : undefined}
          className={`${inputClass(Boolean(errors[name]))} py-3`}
        />
      ) : (
        <input
          id={`${uid}-${name}`}
          type={name === 'deadline' ? 'date' : 'text'}
          value={job[name]}
          onChange={(e) => setJob({ ...job, [name]: e.target.value })}
          aria-describedby={hintKey ? `${uid}-${name}-hint` : undefined}
          className={`${inputClass(Boolean(errors[name]))} min-h-12`}
        />
      )}
    </FormField>
  )
  const select = (
    name: keyof typeof EMPTY,
    options: string[],
    label: (o: string) => string,
  ): ReactNode => (
    <FormField id={`${uid}-${name}`} label={t(`employer.fields.${name}`)} required>
      <select
        id={`${uid}-${name}`}
        value={job[name]}
        onChange={(e) => setJob({ ...job, [name]: e.target.value })}
        className={`${inputClass(false)} min-h-12`}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {label(o)}
          </option>
        ))}
      </select>
    </FormField>
  )

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={id ? t('employer.editJob') : t('employer.newJob')}
        lead={t('employer.formLead')}
      />
      <form onSubmit={submit} noValidate className="flex flex-col gap-6">
        {error && (
          <div ref={errorRef} tabIndex={-1} role="alert">
            <Alert tone="error">{error}</Alert>
          </div>
        )}
        <Card as="section" className="flex flex-col gap-5">
          <h2 className="text-xl font-bold">{t('employer.sectionJob')}</h2>
          {text('title')}
          {text('summary', true)}
          {text('plainSummary', true, true, 'employer.fields.plainSummaryHint')}
          {text('description', true)}
          {select('region', REGIONS, (o) => t(`regions.${o}`))}
          {text('city', false, false)}
          {select('workMode', ['ONSITE', 'REMOTE', 'HYBRID'], (o) => t(`jobs.workMode.${o}`))}
          {select('employmentType', ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP'], (o) =>
            t(`jobs.type.${o}`),
          )}
          {text('salaryText', false, false)}
          {text('deadline')}
          {select('status', ['DRAFT', 'PUBLISHED', 'CLOSED'], (o) => t(`employer.status.${o}`))}
        </Card>
        <Card as="section" className="flex flex-col gap-5">
          <h2 className="text-xl font-bold">{t('employer.sectionAccommodations')}</h2>
          <p className="text-muted">{t('employer.accommodationsLead')}</p>
          <fieldset>
            <legend className="mb-2 text-lg font-semibold">{t('employer.acc.categories')}</legend>
            <div className="grid gap-1 sm:grid-cols-2">
              {ACCOMMODATIONS.map((a) => (
                <label key={a} className="flex min-h-11 cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={cats.includes(a)}
                    onChange={(e) =>
                      setCats(e.target.checked ? [...cats, a] : cats.filter((x) => x !== a))
                    }
                    className="size-5 accent-[var(--af-primary)]"
                  />
                  {t(`accommodations.${a}`)}
                </label>
              ))}
            </div>
          </fieldset>
          {ACC_TEXT.map((k) => (
            <FormField
              key={k}
              id={`${uid}-${k}`}
              label={t(`employer.acc.${k}`)}
              hint={t(`employer.acc.${k}Hint`)}
            >
              <textarea
                id={`${uid}-${k}`}
                rows={3}
                value={acc[k] ?? ''}
                onChange={(e) => setAcc({ ...acc, [k]: e.target.value })}
                aria-describedby={`${uid}-${k}-hint`}
                className={`${inputClass(false)} py-3`}
              />
            </FormField>
          ))}
          <h3 className="text-lg font-bold">{t('employer.acc.contactTitle')}</h3>
          {(['contactName', 'contactEmail', 'contactPhone'] as const).map((k) => (
            <FormField
              key={k}
              id={`${uid}-${k}`}
              label={t(`employer.acc.${k}`)}
              error={
                errors.accommodations && k === 'contactEmail' ? errors.accommodations : undefined
              }
            >
              <input
                id={`${uid}-${k}`}
                type={k === 'contactEmail' ? 'email' : k === 'contactPhone' ? 'tel' : 'text'}
                value={acc[k] ?? ''}
                onChange={(e) => setAcc({ ...acc, [k]: e.target.value })}
                className={`${inputClass(false)} min-h-12`}
              />
            </FormField>
          ))}
        </Card>
        <Card as="section" className="flex flex-col gap-5">
          <h2 className="text-xl font-bold">{t('employer.sectionQuestions')}</h2>
          <p className="text-muted">{t('employer.questionsLead')}</p>
          {questions.map((q, i) => (
            <fieldset key={i} className="flex flex-col gap-3 rounded-xl border-2 border-line p-4">
              <legend className="px-1 font-bold">{t('employer.questionN', { n: i + 1 })}</legend>
              <FormField id={`${uid}-q${i}`} label={t('employer.questionLabel')} required>
                <input
                  id={`${uid}-q${i}`}
                  value={q.label}
                  onChange={(e) =>
                    setQuestions(
                      questions.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)),
                    )
                  }
                  className={`${inputClass(false)} min-h-12`}
                />
              </FormField>
              <FormField id={`${uid}-qt${i}`} label={t('employer.questionType')} required>
                <select
                  id={`${uid}-qt${i}`}
                  value={q.type}
                  onChange={(e) =>
                    setQuestions(
                      questions.map((x, j) =>
                        j === i ? { ...x, type: e.target.value as Question['type'] } : x,
                      ),
                    )
                  }
                  className={`${inputClass(false)} min-h-12`}
                >
                  {(['text', 'textarea', 'radio'] as const).map((o) => (
                    <option key={o} value={o}>
                      {t(`employer.questionTypes.${o}`)}
                    </option>
                  ))}
                </select>
              </FormField>
              {q.type === 'radio' && (
                <FormField
                  id={`${uid}-qo${i}`}
                  label={t('employer.questionOptions')}
                  hint={t('employer.questionOptionsHint')}
                  required
                >
                  <textarea
                    id={`${uid}-qo${i}`}
                    rows={3}
                    value={q.options}
                    aria-describedby={`${uid}-qo${i}-hint`}
                    onChange={(e) =>
                      setQuestions(
                        questions.map((x, j) => (j === i ? { ...x, options: e.target.value } : x)),
                      )
                    }
                    className={`${inputClass(false)} py-3`}
                  />
                </FormField>
              )}
              <label className="flex min-h-11 items-center gap-3">
                <input
                  type="checkbox"
                  checked={q.required}
                  onChange={(e) =>
                    setQuestions(
                      questions.map((x, j) => (j === i ? { ...x, required: e.target.checked } : x)),
                    )
                  }
                  className="size-5"
                />
                {t('employer.questionRequired')}
              </label>
              <Button
                variant="ghost"
                size="sm"
                icon={<Trash2 size={16} aria-hidden="true" />}
                onClick={() => setQuestions(questions.filter((_, j) => j !== i))}
              >
                {t('app.remove')}
                <span className="sr-only">: {t('employer.questionN', { n: i + 1 })}</span>
              </Button>
            </fieldset>
          ))}
          {questions.length < 5 && (
            <Button
              variant="secondary"
              icon={<Plus size={18} aria-hidden="true" />}
              onClick={() =>
                setQuestions([
                  ...questions,
                  { label: '', type: 'text', required: false, options: '' },
                ])
              }
            >
              {t('employer.addQuestion')}
            </Button>
          )}
        </Card>
        <Button type="submit" size="lg">
          {t('app.save')}
        </Button>
      </form>
    </div>
  )
}
