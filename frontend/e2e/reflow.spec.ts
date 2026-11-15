import { expect, test } from '@playwright/test'

const PAGES = [
  '/',
  '/preview',
  '/register',
  '/jobs',
  '/jobs/0c000000-0000-4000-8000-000000000001',
  '/help',
  '/privacy',
]

/** WCAG 1.4.10 Reflow (320 CSS px) and 1.4.4 Resize text (200%): no horizontal scrolling, nothing cut off. */
test.describe('reflow at 320px width @mobile', () => {
  test.use({ viewport: { width: 320, height: 640 } })
  for (const path of PAGES) {
    test(`no horizontal scroll: ${path}`, async ({ page }) => {
      await page.goto(path)
      await expect(page.locator('[data-page-heading]').first()).toBeVisible()
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
      expect(overflow).toBeLessThanOrEqual(0)
    })
  }
})

test.describe('200% text size at 1280px', () => {
  for (const path of PAGES) {
    test(`no horizontal scroll at 200% text: ${path}`, async ({ page }) => {
      await page.goto('/preview')
      await page.getByRole('radio', { name: /200%/ }).check()
      await page.goto(path)
      await expect(page.locator('[data-page-heading]').first()).toBeVisible()
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
      expect(overflow).toBeLessThanOrEqual(0)
    })
  }
})
