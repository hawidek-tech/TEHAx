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

/** Signs out through the "My account" menu. */
export async function signOut(page: Page) {
  await page.getByRole('button', { name: 'My account' }).click()
  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page.getByRole('link', { name: 'Sign in' }).first()).toBeVisible()
}

/**
 * Registration: 4 questions (name, contact, password, privacy). Phone is the default; this uses
 * "Use email instead". Ends on the profile overview.
 */
export async function register(page: Page, email: string, name = 'Almaz Test') {
  await page.goto('/register')
  await expect(page.getByRole('heading', { level: 1, name: 'Create your account' })).toBeVisible()
  await page.getByLabel('What should we call you?').fill(name)
  await next(page)
  await page.getByRole('button', { name: 'Use email instead of a phone number' }).click()
  await page.getByLabel('What is your email address?').fill(email)
  await next(page)
  await page.getByLabel('Create a password').fill(PASSWORD)
  await next(page)
  await page.getByLabel('I have read how ACCESSFLOW protects my information, and I agree.').check()
  await next(page)
  await expect(page.getByRole('heading', { name: 'Check your answers' })).toBeVisible()
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Your profile' })).toBeVisible()
}

/** On a review screen: change one answer and come back to the review. */
export async function changeOnReview(page: Page, label: string, value: string) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  await page.getByRole('button', { name: new RegExp(`^Change\\W+${escaped}$`) }).click()
  await page.getByLabel(label).fill(value)
  await next(page)
  await expect(page.getByRole('heading', { name: 'Check your answers' })).toBeVisible()
}

/**
 * Completes the guided profile part by part (Almaz Bekele), then the optional private support part and the
 * refugee-ID route. Starts on the profile overview.
 */
export async function completeProfile(page: Page) {
  await page.getByRole('button', { name: /^(Start|Continue: About you)$/ }).click()
  // Part 1: first and father's name are already known from the account name - skipped, changed on review
  await expect(page.getByRole('heading', { level: 2 })).toContainText('grandfather')
  await next(page) // grandfather (optional)
  await next(page) // birth year (optional)
  await page.getByLabel('Which region do you live in?').selectOption({ label: 'Addis Ababa' })
  await next(page)
  await next(page) // city (optional)
  await expect(page.getByRole('heading', { name: 'Check your answers' })).toBeVisible()
  await changeOnReview(page, 'What is your first name?', 'Almaz')
  await changeOnReview(page, "What is your father's name?", 'Bekele')
  await page.getByRole('button', { name: 'Save this part' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Part 1 of 3 done.' })).toBeVisible()

  // Part 2: work and study
  await page.getByRole('button', { name: 'Continue: Work and study' }).click()
  await page.getByLabel('What kind of work are you looking for?').fill('Customer service')
  await next(page)
  await page
    .getByLabel('Tell employers a little about yourself')
    .fill('Three years helping customers by phone.')
  await next(page)
  await next(page) // experience (optional list)
  await page.getByRole('button', { name: 'Add', exact: true }).click()
  await page.getByLabel('Level').selectOption({ label: 'Diploma' })
  await page.getByLabel('School or college').fill('Adama TVET College')
  await page.getByRole('button', { name: 'Save this entry' }).click()
  await expect(
    page.getByRole('listitem').filter({ hasText: 'Diploma · Adama TVET College' }),
  ).toBeVisible()
  await next(page)
  await page.getByRole('button', { name: 'Save this part' }).click()

  // Part 3: skills and languages
  await page.getByRole('button', { name: 'Continue: Skills and languages' }).click()
  await page.getByLabel('What are your skills?').fill('Typing, Amharic, English')
  await next(page)
  await page.getByLabel('Amharic').check()
  await next(page)
  await page.getByRole('button', { name: 'Save this part' }).click()
  await expect(
    page.getByRole('heading', { level: 1, name: 'Your profile is ready.' }),
  ).toBeVisible()

  // Optional: private support (never shown to employers)
  await page.getByRole('button', { name: 'Private support (optional)' }).click()
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
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(
    page.getByText('Only support staff can see this. Employers never see it.'),
  ).toBeVisible()

  // Optional: identity route
  await page.goto('/identity')
  await page.getByRole('button', { name: 'Start verification' }).click()
  await page.getByLabel('Refugee ID').check()
  await next(page)
  await page.getByLabel('What are the last 4 characters of your document number?').fill('7A9Z')
  await next(page)
  await next(page) // document upload (optional)
  await page.getByRole('button', { name: 'Send for checking' }).click()
  await expect(page.getByRole('listitem').filter({ hasText: 'Refugee ID' })).toBeVisible()
}
