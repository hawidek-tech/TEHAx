import { expect, test } from '@playwright/test'
import { expectNoSeriousA11yViolations, next, register, uniqueEmail } from './helpers'

/** Automated WCAG 2.2 A/AA checks (axe-core). Zero serious or critical issues is a release gate. */
const PUBLIC_PAGES = [
  '/',
  '/preview',
  '/register',
  '/sign-in',
  '/jobs',
  '/jobs/0c000000-0000-4000-8000-000000000001',
  '/help',
  '/privacy',
  '/accessibility',
  '/developers',
  '/does-not-exist',
]

for (const path of PUBLIC_PAGES) {
  test(`axe: ${path}`, async ({ page }) => {
    await page.goto(path)
    await expect(page.locator('[data-page-heading]').first()).toBeVisible()
    await expectNoSeriousA11yViolations(page, path)
  })
}

test('axe: high-contrast mode and 200% text on the job list', async ({ page }) => {
  await page.goto('/settings')
  await page.getByRole('switch', { name: /High contrast/ }).check()
  await page.getByRole('radio', { name: /200%/ }).check()
  await page.goto('/jobs')
  await expect(page.getByRole('heading', { name: /jobs? found/ })).toBeVisible()
  await expectNoSeriousA11yViolations(page, 'jobs (high contrast, 200%)')
})

test('axe: every registration step, the review step, and signed-in pages', async ({ page }) => {
  await page.goto('/register')
  for (let i = 0; i < 5; i++) {
    await expectNoSeriousA11yViolations(page, `registration step ${i + 1}`)
    if (i === 0) await page.getByLabel('What should we call you?').fill('Axe Tester')
    if (i === 1) await page.getByLabel('With my email address').check()
    if (i === 2) await page.getByLabel('What is your email address?').fill(uniqueEmail())
    if (i === 3) await page.getByLabel('Create a password').fill('my coffee is hot today')
    if (i === 4) await page.getByLabel(/I have read how ACCESSFLOW/).check()
    await next(page)
  }
  await expectNoSeriousA11yViolations(page, 'registration review')

  // Error state
  await page.goto('/register')
  await next(page)
  await expectNoSeriousA11yViolations(page, 'registration error state')

  // Signed in: profile flow first steps, dashboard, profile, support, applications
  await register(page, uniqueEmail())
  await expectNoSeriousA11yViolations(page, 'profile flow step 1')
  for (const path of [
    '/dashboard',
    '/profile',
    '/support',
    '/support/new',
    '/identity',
    '/applications',
    '/settings',
    '/account',
    '/saved',
  ]) {
    await page.goto(path)
    await expect(page.locator('[data-page-heading]').first()).toBeVisible()
    await expectNoSeriousA11yViolations(page, path)
  }
})

test('axe: voice-input privacy dialog and help assistant dialog', async ({ page, context }) => {
  // Chromium already exposes speech recognition; this stub just guarantees the voice button renders (no audio used).
  await context.addInitScript(() => {
    ;(window as unknown as { webkitSpeechRecognition: unknown }).webkitSpeechRecognition = class {
      start() {}
      stop() {}
      abort() {}
    }
  })
  await page.goto('/register')
  await page.getByRole('button', { name: 'Speak your answer' }).click()
  await expect(page.getByRole('dialog', { name: 'Before you use your voice' })).toBeVisible()
  await expectNoSeriousA11yViolations(page, 'voice privacy dialog')
  await page.getByRole('button', { name: 'I will type instead' }).click()
  await page.getByRole('button', { name: 'Help with this question' }).click()
  await expect(page.getByRole('dialog', { name: 'Help assistant' })).toBeVisible()
  await page.getByRole('button', { name: 'Ask', exact: true }).click()
  await expect(page.getByText('Get support from a person')).toBeVisible()
  await expectNoSeriousA11yViolations(page, 'assistant dialog with answer')
})
