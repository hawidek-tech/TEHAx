import { expect, test, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import {
  completeProfile,
  expectNoSeriousA11yViolations,
  next,
  register,
  uniqueEmail,
} from './helpers'

/** Employer and support-staff screens. Needs DEMO_ACCOUNTS_PASSWORD (read from backend/.env or the environment). */
function demoPassword(): string | undefined {
  if (process.env.DEMO_ACCOUNTS_PASSWORD) return process.env.DEMO_ACCOUNTS_PASSWORD
  try {
    return readFileSync('../backend/.env', 'utf8')
      .match(/^DEMO_ACCOUNTS_PASSWORD=(.+)$/m)?.[1]
      ?.trim()
  } catch {
    return undefined
  }
}
const PW = demoPassword()

async function signIn(page: Page, email: string, password: string) {
  await page.goto('/sign-in')
  await page.getByLabel('Email or phone number').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
}

test('employer reviews a consented application and updates its status; staff verify identity', async ({
  browser,
}) => {
  test.skip(!PW, 'DEMO_ACCOUNTS_PASSWORD not configured')
  test.setTimeout(240_000) // three users (applicant, employer, staff) in one journey
  // Applicant applies to the Kidame data-entry internship
  const applicant = await (await browser.newContext()).newPage()
  const email = uniqueEmail()
  const motivation = `I want to learn data skills (${Date.now()}).`
  const applicantName = `Role Test ${Date.now()}`
  await register(applicant, email, applicantName)
  await completeProfile(applicant)
  await applicant.goto('/jobs/0c000000-0000-4000-8000-000000000006/apply')
  // Full profile and known contact details: the application starts with its own questions
  await applicant.getByLabel('Why do you want this job?').fill(motivation)
  await next(applicant)
  await next(applicant)
  await applicant.getByLabel('Now').check()
  await next(applicant)
  await next(applicant)
  await next(applicant)
  await applicant.getByLabel(/I have checked my answers/).check()
  await applicant.getByRole('button', { name: 'Send my application' }).click()
  await expect(applicant.getByRole('heading', { name: 'Your application was sent' })).toBeVisible()

  // Employer
  const employer = await (await browser.newContext()).newPage()
  await signIn(employer, 'employer@example.com', PW!)
  await expect(employer.getByRole('heading', { level: 1, name: 'Your jobs' })).toBeVisible()
  await expectNoSeriousA11yViolations(employer, 'employer dashboard')
  await employer
    .getByRole('link', { name: /View applications\s*:\s*Data Entry Internship/ })
    .click()
  await expect(employer.getByText(/does not rank, score or reject/)).toBeVisible()
  const card = employer.getByRole('article').filter({ hasText: motivation })
  await expect(card.getByRole('heading', { name: 'Almaz Bekele' })).toBeVisible()
  await expect(card).not.toContainText('Please send interview questions in writing') // private support request never shown
  await expect(card).not.toContainText('Sign language') // private workplace-support choice never shown
  await expectNoSeriousA11yViolations(employer, 'employer applications')
  await card.getByLabel('Status').selectOption({ label: 'Invited to interview' })
  await card.getByRole('button', { name: 'Save' }).click()
  await expect(card.getByText('Invited to interview').first()).toBeVisible()

  // Employer job form (accommodation form) is accessible
  await employer.goto('/employer/jobs/new')
  await expect(
    employer.getByRole('heading', { name: 'Accommodations and accessibility' }),
  ).toBeVisible()
  await expectNoSeriousA11yViolations(employer, 'employer job + accommodation form')

  // Applicant: the news is the one main action on the returning visit
  await applicant.goto('/')
  await expect(applicant.getByRole('heading', { level: 1 })).toHaveText(
    `Welcome back, ${applicantName}.`,
  )
  await expect(
    applicant.getByText('Update on "Data Entry Internship": Invited to interview.'),
  ).toBeVisible()
  await applicant.getByRole('button', { name: 'Open' }).click()
  await expect(applicant).toHaveURL(/\/applications$/)
  await applicant.goto('/dashboard')
  await expect(
    applicant.getByText(/Update on "Data Entry Internship": Invited to interview/),
  ).toBeVisible()

  // Support staff verify the refugee-ID request
  const staff = await (await browser.newContext()).newPage()
  await signIn(staff, 'support@example.com', PW!)
  await expect(staff.getByRole('heading', { level: 1, name: 'Support queue' })).toBeVisible()
  await expectNoSeriousA11yViolations(staff, 'staff identity queue')
  const request = staff.getByRole('article').filter({ hasText: applicantName })
  await request.getByRole('button', { name: 'Mark as verified' }).click()
  await expect(request).toHaveCount(0) // leaves the pending queue
  await staff.getByRole('button', { name: 'Support requests' }).click()
  await expectNoSeriousA11yViolations(staff, 'staff support queue')
  const support = staff.getByRole('article').filter({ hasText: applicantName })
  await support.getByLabel('Your reply').fill('We will share questions 2 days before.')
  await support.getByLabel('Status').selectOption({ label: 'Answered' })
  await support.getByRole('button', { name: 'Send reply' }).click()
  await expect(support).toHaveCount(0)

  await applicant.goto('/identity')
  await expect(applicant.getByText('Verified').first()).toBeVisible()
  await applicant.goto('/support')
  await expect(applicant.getByText('We will share questions 2 days before.')).toBeVisible()
})
