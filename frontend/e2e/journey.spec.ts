import { expect, test } from '@playwright/test'
import {
  completeProfile,
  expectNoSeriousA11yViolations,
  next,
  register,
  uniqueEmail,
} from './helpers'

/** The main demonstration journey (spec §12), end to end against the real backend and database. */
test('complete journey: language → preview → register → profile → find job → apply → track @mobile', async ({
  page,
}) => {
  // 1–2. Welcome and language selection
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await page.getByRole('radio', { name: /አማርኛ/ }).check()
  await expect(page.locator('html')).toHaveAttribute('lang', 'am')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('ይመዝገቡ')
  await page
    .getByRole('radio', { name: /^English/ })
    .first()
    .check()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')

  // 3–4. Accessibility preview: settings change the page immediately
  await page.getByRole('link', { name: 'Start' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Try your settings' })).toBeVisible()
  await page.getByRole('radio', { name: /150%/ }).check()
  await expect
    .poll(() => page.evaluate(() => getComputedStyle(document.documentElement).fontSize))
    .toBe('24px')
  await page.getByRole('radio', { name: /100%/ }).check()
  await page.getByRole('link', { name: 'Continue to create an account' }).click()

  // 5. Registration (one question per screen)
  const email = uniqueEmail()
  await register(page, email)

  // 6. Guided profile incl. alternative ID route and private support request
  await completeProfile(page)

  // 7. Dashboard progress tracker
  await expect(page.getByText('Your profile is ready')).toBeVisible()
  await expect(page.getByText(/steps completed/)).toBeVisible()

  // 8. Job discovery with the PRIVATE support filter (prefilled from the private profile choice)
  await page.goto('/jobs')
  await expect(
    page.getByText('We used the private support choices from your profile.'),
  ).toBeVisible()
  await expect(page.getByRole('heading', { name: /jobs? found/ })).toBeVisible()
  await expect(
    page.getByRole('link', { name: 'Sign Language Health Educator', exact: true }),
  ).toBeVisible()
  await expect(page.getByRole('link', { name: 'Farm Records Assistant', exact: true })).toHaveCount(
    0,
  )
  // Clear the private filter, then search
  await page.getByRole('button', { name: 'Clear all filters' }).click()
  await page.getByLabel('Keywords').fill('customer support')
  await page.getByRole('button', { name: 'Search' }).click()

  // 9. Job details with employer accommodations
  await page
    .getByRole('link', { name: 'Customer Support Agent (Amharic and English)', exact: true })
    .click()
  await expect(
    page.getByRole('heading', { name: 'Support and accessibility at this job' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Show simple description' }).click()
  await expect(
    page.getByText('You will help customers by answering their questions.'),
  ).toBeVisible()
  await page.getByRole('link', { name: 'Apply for this job' }).click()

  // 10. Application on the same engine, prefilled from the profile
  await expect(page.getByRole('heading', { level: 1, name: /^Apply:/ })).toBeVisible()
  await next(page) // phone (optional)
  await expect(page.getByLabel('Which email address can the employer use?')).toHaveValue(email)
  await next(page)
  await page.getByLabel('Why do you want this job?').fill('I enjoy helping people solve problems.')
  await next(page)
  await expect(page.getByLabel('What experience do you have for this job?')).toHaveValue(
    'Three years helping customers by phone.',
  )
  await next(page)
  await page.getByLabel('In two weeks').check()
  await next(page)
  await page.getByLabel('Which languages can you use with customers?').fill('Amharic and English')
  await next(page)
  await page.getByLabel('Yes', { exact: true }).check()
  await next(page)
  await page.getByLabel('My education').uncheck()
  await next(page)
  await next(page) // keep support private (default)

  // 11. Review: what the employer will see
  await expect(page.getByRole('heading', { name: 'Check your answers' })).toBeVisible()
  await expect(
    page.getByText('Your support needs stay private. They are not shared.'),
  ).toBeVisible()
  // Explicit confirmation is required
  await page.getByRole('button', { name: 'Send my application' }).click()
  await expect(page.getByText('Please tick the box to confirm before sending.')).toBeVisible()
  await page.getByLabel('I have checked my answers and I want to send this application.').check()
  await page.getByRole('button', { name: 'Send my application' }).click()

  // 12–13. Confirmation and status tracking
  await expect(page.getByRole('heading', { name: 'Your application was sent' })).toBeVisible()
  await expect(page.getByText(/Reference: AF-/).first()).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Where your application is' })).toBeVisible()
  await expectNoSeriousA11yViolations(page, 'application confirmation')
})

test('save and resume: a half-finished profile is restored after signing out and in', async ({
  page,
}) => {
  const email = uniqueEmail()
  await register(page, email)
  await page.getByLabel('What is your first name?').fill('Saba')
  await next(page)
  await page.getByLabel("What is your father's name?").fill('Haile')
  await next(page)
  await expect(page.getByText('All changes saved')).toBeVisible()
  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page.getByRole('link', { name: 'Sign in' }).first()).toBeVisible()
  await page.goto('/sign-in')
  await page.getByLabel('Email or phone number').fill(email)
  await page.getByLabel('Password', { exact: true }).fill('my coffee is hot today')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1, name: /^Hello,/ })).toBeVisible()
  await page.goto('/onboarding')
  await expect(page.getByText('We kept your answers')).toBeVisible()
  await expect(page.getByRole('heading', { level: 2 })).toContainText('grandfather')
  await page.getByRole('button', { name: 'Back' }).click()
  await expect(page.getByLabel("What is your father's name?")).toHaveValue('Haile')
})
