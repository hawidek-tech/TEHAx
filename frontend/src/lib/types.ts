/** API response types (mirror backend DTOs). */
export type Locale = 'en' | 'am' | 'om' | 'so' | 'ti'
export type Role = 'APPLICANT' | 'EMPLOYER' | 'SUPPORT_STAFF' | 'PARTNER_ADMIN' | 'PLATFORM_ADMIN'

export interface Me {
  id: string
  displayName: string
  email?: string
  phone?: string
  roles: Role[]
  locale: Locale
  organizationId?: string
}

export interface SessionResponse {
  user: Me
  embedToken?: string
  embedTokenExpiresInSeconds?: number
}

export interface Preferences {
  locale: Locale
  textScale: number
  highContrast: boolean
  simplifiedLanguage: boolean
  captions: boolean
  keyboardFirst: boolean
  readAloud: boolean
  reducedMotion: boolean
  sharedDevice: boolean
  audioGuide: boolean
  /**
   * How the person chose to use ACCESSFLOW on the first visit. Kept ONLY on this device (never sent to the server,
   * never stored in shared-device mode) because it can reveal a disability.
   */
  usageMode?: UsageMode | null
}

export type UsageMode = 'listen' | 'screenReader' | 'read' | 'sign'

export interface FileInfo {
  id: string
  purpose: string
  name: string
  contentType: string
  sizeBytes: number
  createdAt: string
}

export interface Profile {
  givenName?: string
  fatherName?: string
  grandfatherName?: string
  birthYear?: number
  region?: string
  city?: string
  headline?: string
  summary?: string
  education: Record<string, unknown>[]
  experience: Record<string, unknown>[]
  skills: string[]
  languages: string[]
  supportPreferences: string[]
  resume?: FileInfo
  completed: boolean
  missing: string[]
  updatedAt?: string
}

export interface Accommodations {
  categories: string[]
  workplaceAccommodations?: string
  interviewArrangements?: string
  flexibleWorking?: string
  assistiveTechnology?: string
  applicationAccessibility?: string
  contactName?: string
  contactEmail?: string
  contactPhone?: string
}

export interface JobSummary {
  id: string
  title: string
  organizationName?: string
  summary: string
  plainSummary: string
  region: string
  city?: string
  workMode: string
  employmentType: string
  deadline: string
  daysLeft: number
  accommodations: string[]
  saved: boolean
}

export interface CustomQuestion {
  id: string
  label: string
  type: string
  required: boolean
  options: string[]
}

export interface JobDetail extends Omit<JobSummary, 'accommodations'> {
  organizationDescription?: string
  description: string
  salaryText?: string
  status: string
  accommodations?: Accommodations
  customQuestions: CustomQuestion[]
  open: boolean
}

export interface ApplicationSummary {
  id: string
  referenceCode: string
  jobId: string
  jobTitle?: string
  organizationName?: string
  status: string
  submittedAt: string
  updatedAt: string
}

export interface StatusChange {
  status: string
  note?: string
  changedAt: string
}

export interface ApplicationDetail {
  summary: ApplicationSummary
  answers: Record<string, unknown>
  sharedProfile: Record<string, unknown>
  accommodationNote?: string
  history: StatusChange[]
  consentId?: string
}

export interface Draft {
  flowKey: string
  context: string
  definitionVersion: number
  currentStep?: string
  data: Record<string, unknown>
  version: number
  updatedAt: string
}

export interface SupportRequest {
  id: string
  category: string
  message: string
  preferredContact: string
  status: string
  staffResponse?: string
  createdAt: string
  updatedAt: string
}

export interface Verification {
  id: string
  route: string
  documentLabel?: string
  documentLast4?: string
  documentUploaded: boolean
  partnerOrgId?: string
  status: string
  reviewerNote?: string
  createdAt: string
  reviewedAt?: string
}

export interface NotificationItem {
  id: string
  type: string
  params: Record<string, string>
  read: boolean
  createdAt: string
}

export interface Consent {
  id: string
  recipientOrg?: string
  recipientName?: string
  applicationId?: string
  purpose: string
  scopes: string[]
  noticeVersion: string
  grantedAt: string
  revokedAt?: string
}

export interface HelpArticle {
  slug: string
  locale: string
  topic: string
  title: string
  body: string
  reviewed: boolean
}

export interface AssistantAnswer {
  answer?: string
  source: 'ai' | 'local'
  aiAvailable: boolean
  uncertain: boolean
  articles: HelpArticle[]
  humanSupportPath: string
}

export interface ReferralPartner {
  id: string
  name: string
  type: string
  description?: string
}
