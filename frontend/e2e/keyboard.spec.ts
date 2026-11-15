import { expect, test } from '@playwright/test'
import { PASSWORD, uniqueEmail } from './helpers'

/** Registration completed using ONLY the keyboard (no mouse/pointer events). */
test('registration can be completed with the keyboard only', async ({ page }) => {
  await page.goto('/register')
  const press = (k: string) => page.keyboard.press(k)
  // Skip link is the first Tab stop
  await press('Tab')
  await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused()
  await press('Enter')

  const tabTo = async (
    name: RegExp | string,
    role: 'button' | 'textbox' | 'radio' | 'checkbox' = 'button',
    max = 40,
  ) => {
    const target =
      role === 'textbox' ? page.getByRole('textbox', { name }) : page.getByRole(role, { name })
    for (let i = 0; i < max; i++) {
      if (await target.evaluate((el) => el === document.activeElement).catch(() => false)) return
      await press('Tab')
    }
    throw new Error(`Could not reach ${name} with Tab`)
  }

  await tabTo('What should we call you?', 'textbox')
  await page.keyboard.type('Keyboard User')
  await tabTo(/^Next$/)
  await press('Enter')
  await expect(page.getByText('Question 2 of')).toBeVisible()
  await tabTo('Use email instead of a phone number')
  await press('Enter')
  await tabTo('What is your email address?', 'textbox')
  await page.keyboard.type(uniqueEmail())
  await tabTo(/^Next$/)
  await press('Enter')
  await tabTo('Create a password', 'textbox')
  await page.keyboard.type(PASSWORD)
  await tabTo(/^Next$/)
  await press('Enter')
  await tabTo('I have read how ACCESSFLOW protects my information, and I agree.', 'checkbox')
  await press('Space')
  await tabTo(/^Check my answers$/)
  await press('Enter')
  await expect(page.getByRole('heading', { name: 'Check your answers' })).toBeFocused()
  await tabTo(/^Create account$/)
  await press('Enter')
  await expect(page.getByRole('heading', { level: 1, name: 'Your profile' })).toBeVisible()
})

test('first visit can be completed with the keyboard only', async ({ page }) => {
  await page.goto('/')
  const press = (k: string) => page.keyboard.press(k)
  const tabTo = async (name: RegExp) => {
    const target = page.getByRole('button', { name })
    for (let i = 0; i < 30; i++) {
      if (
        await target
          .evaluate((el) => el === document.activeElement, undefined, { timeout: 500 })
          .catch(() => false)
      )
        return
      await press('Tab')
    }
    throw new Error(`Could not reach ${name} with Tab`)
  }
  // Language and the voice guide come before the choices, all reachable with Tab
  await tabTo(/Activate Audio Accessibility/)
  await tabTo(/^\d\. Find a job/)
  await press('Enter')
  await expect(page).toHaveURL(/\/jobs$/)
})

test('errors are announced, summarised and linked to the field', async ({ page }) => {
  await page.goto('/register')
  await page.getByRole('button', { name: 'Next' }).click()
  const summary = page.getByRole('alert').filter({ hasText: 'Please check your answer' })
  await expect(summary).toBeFocused()
  await expect(summary).toContainText('Please answer this question.')
  const input = page.getByLabel('What should we call you?')
  await expect(input).toHaveAttribute('aria-invalid', 'true')
  const describedBy = await input.getAttribute('aria-describedby')
  expect(describedBy).toContain('q-displayName-error')
})
