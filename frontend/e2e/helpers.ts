import AxeBuilder from '@axe-core/playwright'
import { expect, type Page } from '@playwright/test'

export const uniqueEmail = () => `e2e-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`
export const PASSWORD = 'my coffee is hot today'

/** Runs axe-core with WCAG 2.0/2.1/2.2 A and AA rules; fails on any serious or critical violation. */
export async function expectNoSeriousA11yViolations(page: Page, label: string) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze()
  const serious = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  )
  const summary = serious.map(
    (v) => `${v.id} (${v.impact}): ${v.nodes.length} node(s) — ${v.nodes[0]?.target.join(' ')}`,
  )
  expect(summary, `axe serious/critical violations on ${label}`).toEqual([])
  return results
}

export async function next(page: Page) {
  await page
    .getByRole('button', { name: /^(Next|Check my answers|Save and go back to my answers)$/ })
    .click()
}

export async function currentQuestion(page: Page) {
  return (await page.getByRole('heading', { level: 2 }).first().textContent())?.trim() ?? ''
}

/** Completes the registration flow (one question per screen) using the given email. */
export async function register(page: Page, email: string, name = 'Almaz Test') {
  await page.goto('/register')
  await expect(page.getByRole('heading', { level: 1, name: 'Create your account' })).toBeVisible()
  await page.getByLabel('What should we call you?').fill(name)
  await next(page)
  await page.getByLabel('With my email address').check()
  await next(page)
  await page.getByLabel('What is your email address?').fill(email)
  await next(page)
  await page.getByLabel('Create a password').fill(PASSWORD)
  await next(page)
  await page.getByLabel('I have read how ACCESSFLOW protects my information, and I agree.').check()
  await next(page)
  await expect(page.getByRole('heading', { name: 'Check your answers' })).toBeVisible()
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Create your profile' })).toBeVisible()
}

/** Completes the guided profile flow with a refugee-ID route and a private support request. */
export async function completeProfile(page: Page) {
  await page.getByLabel('What is your first name?').fill('Almaz')
  await next(page)
  await page.getByLabel("What is your father's name?").fill('Bekele')
  await next(page)
  await next(page) // grandfather (optional)
  await next(page) // birth year (optional)
  await page.getByLabel('Which region do you live in?').selectOption({ label: 'Addis Ababa' })
  await next(page)
  await next(page) // city (optional)
  await page.getByLabel('What kind of work are you looking for?').fill('Customer service')
  await next(page)
  await page
    .getByLabel('Tell employers a little about yourself')
    .fill('Three years helping customers by phone.')
  await next(page)
  await next(page) // experience (optional list)
  // Education: add one entry through the repeatable list
  await page.getByRole('button', { name: 'Add', exact: true }).click()
  await page.getByLabel('Level').selectOption({ label: 'Diploma' })
  await page.getByLabel('School or college').fill('Adama TVET College')
  await page.getByRole('button', { name: 'Save this entry' }).click()
  await expect(
    page.getByRole('listitem').filter({ hasText: 'Diploma · Adama TVET College' }),
  ).toBeVisible()
  await next(page)
  await page.getByLabel('What are your skills?').fill('Typing, Amharic, English')
  await next(page)
  await page.getByLabel('Amharic').check()
  await next(page)
  await page.getByLabel('Refugee ID').check()
  await next(page)
  await page.getByLabel('What are the last 4 characters of your document number?').fill('7A9Z')
  await next(page)
  await next(page) // document upload (optional)
  await page.getByLabel('Yes, please').check()
  await next(page)
  await page.getByLabel('Interviews').check()
  await next(page)
  await page
    .getByLabel('Tell us what would help you')
    .fill('Please send interview questions in writing.')
  await next(page)
  await page.getByLabel('Message in ACCESSFLOW').check()
  await next(page)
  await page.getByLabel('Sign language').check()
  await next(page)
  await expect(page.getByRole('heading', { name: 'Check your answers' })).toBeVisible()
  await page.getByRole('button', { name: 'Save my profile' }).click()
  await expect(page.getByRole('heading', { level: 1, name: /^Hello,/ })).toBeVisible()
}
