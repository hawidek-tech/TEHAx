import { isPresent } from '../../engine/logic'
import type { FlowData, FlowDefinition } from '../../engine/types'
import type { Profile } from '../../lib/types'

/**
 * The guided profile in short parts (docs/ux/first-visit-flow.md, Path B). Each part is saved on its own with
 * PUT /api/v1/profile/steps, so the learner can stop after any part.
 */
export const PROFILE_PARTS = [
  {
    id: 'about',
    steps: ['givenName', 'fatherName', 'grandfatherName', 'birthYear', 'region', 'city'],
  },
  { id: 'work', steps: ['headline', 'summary', 'experience', 'education'] },
  { id: 'skills', steps: ['skills', 'languages'] },
] as const

/** Private support part (optional). Saved with PUT /api/v1/learners/{id}/support; never shown to employers. */
export const SUPPORT_STEPS = [
  'supportNeeded',
  'supportCategory',
  'supportMessage',
  'supportContact',
  'workplaceSupport',
]

/** What an employer needs before an application can be sent (asked only if missing). */
export const MINIMUM_FOR_APPLYING = ['givenName', 'fatherName', 'region', 'headline', 'skills']

/** A copy of the flow with only the given steps (and only the sections they use). */
export function subsetDefinition(def: FlowDefinition, stepIds: readonly string[]): FlowDefinition {
  const steps = def.steps.filter((s) => stepIds.includes(s.id))
  return { ...def, sections: def.sections.filter((x) => steps.some((s) => s.section === x)), steps }
}

/** The saved profile as answers to the profile flow (same field ids as the server). */
export function profileAnswers(p: Profile | undefined): FlowData {
  if (!p) return {}
  const d: FlowData = {
    givenName: p.givenName,
    fatherName: p.fatherName,
    grandfatherName: p.grandfatherName,
    birthYear: p.birthYear,
    region: p.region,
    city: p.city,
    headline: p.headline,
    summary: p.summary,
    experience: p.experience?.length ? p.experience : undefined,
    education: p.education?.length ? p.education : undefined,
    skills: p.skills?.length ? p.skills.join(', ') : undefined,
    languages: p.languages?.length ? p.languages : undefined,
  }
  return Object.fromEntries(Object.entries(d).filter(([, v]) => isPresent(v)))
}

/** Steps whose answer is already known: they are skipped on the way forward and shown on the review screen. */
export const answeredSteps = (stepIds: readonly string[], data: FlowData) =>
  stepIds.filter((id) => isPresent(data[id]))

/** Parts nobody has started yet (no answer at all) and parts with some answers. */
function partStates(p: Profile | undefined) {
  const data = profileAnswers(p)
  return PROFILE_PARTS.map((part) => ({
    part,
    answered: part.steps.filter((id) => isPresent(data[id])).length,
  }))
}

/**
 * The part to continue with: the first part not started yet, otherwise the first part with unanswered (optional)
 * questions, or null when every question has an answer.
 */
export function nextPart(p: Profile | undefined) {
  const states = partStates(p)
  return (
    states.find((s) => s.answered === 0)?.part ??
    states.find((s) => s.answered < s.part.steps.length)?.part ??
    null
  )
}

/** The next part nobody has started yet (after finishing a part), or null when every part has answers. */
export function nextUnstartedPart(p: Profile | undefined) {
  return partStates(p).find((s) => s.answered === 0)?.part ?? null
}

/** The learner started the profile but left whole parts untouched (offered as "one thing to finish"). */
export function profileUnfinished(p: Profile | undefined) {
  const states = partStates(p)
  return states.some((s) => s.answered > 0) && states.some((s) => s.answered === 0)
}

/**
 * Pre-fills given name and father's name from the account name (Ethiopian names: "Almaz Bekele" → Almaz, Bekele).
 * The learner sees both on the review screen and can change them.
 */
export function namesFromDisplayName(displayName: string | undefined): FlowData {
  const parts = (displayName ?? '').trim().split(/\s+/).filter(Boolean)
  const out: FlowData = {}
  if (parts[0]) out.givenName = parts[0]
  if (parts[1]) out.fatherName = parts[1]
  return out
}
