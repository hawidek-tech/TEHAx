import { expect, test, type Page } from '@playwright/test'
import {
  PASSWORD,
  completeProfile,
  expectNoSeriousA11yViolations,
  next,
  register,
  signOut,
  uniqueEmail,
} from './helpers'

/**
 * The main demonstration journey (docs/ux/first-visit-flow.md, Path A), end to end against the real backend:
 * first visit → find a job → apply → 4 account questions → only the missing profile details → application.
 */
test('Path A: a new learner finds a job and applies in at most 14 question screens @mobile', async ({
  page,
}) => {
  let questions = 0
  const answer = async () => {
    questions++
    await next(page)
  }

  // Welcome: one question; language on the same screen
  await page.goto('/')
  await page.getByRole('button', { name: 'አማርኛ' }).click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'am')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('ዛሬ ምን ማድረግ ይፈልጋሉ?')
  await page.getByRole('button', { name: 'English', exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    'What would you like to do today?',
  )
  await page.getByRole('button', { name: /^\d\. Find a job/ }).click()

  // Jobs can be browsed without an account
  await expect(page.getByRole('heading', { name: /jobs? found/ })).toBeVisible()
  await page.getByLabel('Keywords').fill('customer support')
  await page.getByRole('button', { name: 'Search' }).click()
  await page
    .getByRole('link', { name: 'Customer Support Agent (Amharic and English)', exact: true })
    .click()
  await expect(
    page.getByRole('heading', { name: 'Support and accessibility at this job' }),
  ).toBeVisible()
  await page.getByRole('link', { name: 'Apply for this job' }).click()

  // Account only now: 4 questions, phone is default, email via a link
  await expect(page.getByText('To apply, you need an account. 4 questions.')).toBeVisible()
  const email = uniqueEmail()
  await page.getByLabel('What should we call you?').fill('Almaz Bekele')
  await answer()
  await page.getByRole('button', { name: 'Use email instead of a phone number' }).click()
  await page.getByLabel('What is your email address?').fill(email)
  await answer()
  await page.getByLabel('Create a password').fill(PASSWORD)
  await answer()
  await page.getByLabel('I have read how ACCESSFLOW protects my information, and I agree.').check()
  await answer()
  await page.getByRole('button', { name: 'Create account' }).click()

  // Only the missing profile details; names come from the account name and are NOT asked again
  await expect(page.getByText('The employer needs a few details')).toBeVisible()
  await expect(page.getByRole('heading', { level: 2 })).toHaveText(/region/)
  await page.getByLabel('Which region do you live in?').selectOption({ label: 'Addis Ababa' })
  await answer()
  await page.getByLabel('What kind of work are you looking for?').fill('Customer service')
  await answer()
  await page.getByLabel('What are your skills?').fill('Typing, Amharic, English')
  await answer()
  await expect(page.getByRole('heading', { name: 'Check your answers' })).toBeVisible()
  await expect(page.getByText('Almaz', { exact: true })).toBeVisible()
  await expect(page.getByText('Bekele', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Save and continue to the application' }).click()

  // Application: contact details are already known (shown on review, not asked)
  await expect(page.getByRole('heading', { level: 2 })).toHaveText(/Why do you want this job/)
  await page.getByLabel('Why do you want this job?').fill('I enjoy helping people solve problems.')
  await answer()
  await page
    .getByLabel('What experience do you have for this job?')
    .fill('Three years helping customers by phone.')
  await answer()
  await page.getByLabel('In two weeks').check()
  await answer()
  await page.getByLabel('Which languages can you use with customers?').fill('Amharic and English')
  await answer()
  await page.getByLabel('Yes', { exact: true }).check()
  await answer()
  await answer() // what to share (defaults)
  await answer() // keep support private (default)
  await expect(page.getByRole('heading', { name: 'Check your answers' })).toBeVisible()
  await expect(page.getByText(email)).toBeVisible()
  expect(questions).toBeLessThanOrEqual(14)

  await page.getByLabel('I have checked my answers and I want to send this application.').check()
  await page.getByRole('button', { name: 'Send my application' }).click()
  await expect(page.getByRole('heading', { name: 'Your application was sent' })).toBeVisible()
  await expect(page.getByText(/Reference: AF-/).first()).toBeVisible()
  await expect(page.getByRole('link', { name: 'Finish my profile (optional)' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Look at more jobs' })).toBeVisible()
  await expectNoSeriousA11yViolations(page, 'application confirmation')
})

async function signInAgain(page: Page, email: string) {
  await page.goto('/sign-in')
  await page.getByLabel('Email or phone number').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
}

test('save and resume: a half-finished part is offered as "one thing to finish" after signing in again', async ({
  page,
}) => {
  const email = uniqueEmail()
  await register(page, email)
  await page.getByRole('button', { name: /^(Start|Continue: About you)$/ }).click()
  await page.getByLabel("What is your grandfather's name?").fill('Haile')
  await next(page)
  await expect(page.getByText('All changes saved')).toBeVisible()
  await signOut(page)
  await signInAgain(page, email)

  await expect(
    page.getByRole('heading', { level: 1, name: 'Welcome back, Almaz Test.' }),
  ).toBeVisible()
  await expect(page.getByText('You have one thing to finish: your profile.')).toBeVisible()
  await page.getByRole('button', { name: 'Continue' }).click()
  // Straight back into the unfinished part
  await expect(page).toHaveURL(/part=about/)
  await expect(page.getByText('We kept your answers')).toBeVisible()
  await expect(page.getByRole('heading', { level: 2 })).toContainText('born')
  await page.getByRole('button', { name: 'Back' }).click()
  await expect(page.getByLabel("What is your grandfather's name?")).toHaveValue('Haile')
})

test('Path B: stop after part 1, the returning visit continues with part 2', async ({ page }) => {
  const email = uniqueEmail()
  await register(page, email)
  await expect(page.getByText(/3 short parts/)).toBeVisible()
  await page.getByRole('button', { name: /^(Start|Continue: About you)$/ }).click()
  await next(page) // grandfather
  await next(page) // birth year
  await page.getByLabel('Which region do you live in?').selectOption({ label: 'Amhara' })
  await next(page)
  await next(page) // city
  await page.getByRole('button', { name: 'Save this part' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Part 1 of 3 done.' })).toBeFocused()
  await page.getByRole('button', { name: 'Stop for now' }).click()

  await expect(page.getByText('You have one thing to finish: your profile.')).toBeVisible()
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page.getByRole('button', { name: 'Continue: Work and study' })).toBeVisible()
})

test('private support choices from the profile filter jobs for the learner only', async ({
  page,
}) => {
  await register(page, uniqueEmail())
  await completeProfile(page) // includes the private "Sign language" workplace-support choice
  await page.goto('/jobs')
  await expect(
    page.getByText('We used the private support choices from your profile.'),
  ).toBeVisible()
  await expect(
    page.getByRole('link', { name: 'Sign Language Health Educator', exact: true }),
  ).toBeVisible()
  await expect(page.getByRole('link', { name: 'Farm Records Assistant', exact: true })).toHaveCount(
    0,
  )
  await page.getByRole('button', { name: 'Clear all filters' }).click()
  await expect(
    page.getByRole('link', { name: 'Farm Records Assistant', exact: true }),
  ).toBeVisible()
})

test('Accessibility Preview: settings change the page immediately', async ({ page }) => {
  await page.goto('/preview')
  await expect(page.getByRole('heading', { level: 1, name: 'Try your settings' })).toBeVisible()
  await page.getByRole('radio', { name: /150%/ }).check()
  await expect
    .poll(() => page.evaluate(() => getComputedStyle(document.documentElement).fontSize))
    .toBe('24px')
})
