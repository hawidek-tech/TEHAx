export const statusTone = (s: string) =>
  s === 'OFFERED' || s === 'VERIFIED' || s === 'RESOLVED'
    ? 'success'
    : s === 'NOT_SELECTED' || s === 'REJECTED' || s === 'WITHDRAWN'
      ? 'danger'
      : s === 'INTERVIEW' || s === 'IN_PROGRESS'
        ? 'primary'
        : 'warning'

/** Ordered stages shown in the application tracker. */
export const STAGES = ['SUBMITTED', 'UNDER_REVIEW', 'INTERVIEW', 'DECISION'] as const
export const stageOf = (status: string) =>
  status === 'SUBMITTED'
    ? 0
    : status === 'UNDER_REVIEW'
      ? 1
      : status === 'INTERVIEW'
        ? 2
        : status === 'OFFERED' || status === 'NOT_SELECTED'
          ? 3
          : -1
