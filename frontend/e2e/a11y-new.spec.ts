import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { expectNoSeriousA11yViolations } from './helpers'

test('axe: welcome with audio guide active (audio bar)', async ({ page, context }) => {
  await context.addInitScript(() => {
    Object.defineProperty(window, 'speechSynthesis', {
      value: {
        getVoices: () => [{ lang: 'en-US' }],
        speak() {},
        cancel() {},
        pause() {},
        resume() {},
        addEventListener() {},
        removeEventListener() {},
      },
    })
    ;(window as unknown as { SpeechSynthesisUtterance: unknown }).SpeechSynthesisUtterance = class {
      constructor(public text: string) {}
    }
  })
  await page.goto('/')
  await page.getByRole('button', { name: 'Activate Audio Accessibility' }).click()
  await expect(page.getByRole('region', { name: 'Audio guidance' })).toBeVisible()
  await expectNoSeriousA11yViolations(page, 'welcome + audio bar')
})

test('axe: sign-language dialog with camera on', async ({ page, context }) => {
  await context.grantPermissions(['camera'])
  await page.goto('/register')
  await page.getByRole('button', { name: 'Sign or choose phrases' }).click()
  await page.getByRole('button', { name: 'Turn on camera' }).click()
  await expect(page.getByText('Camera is on', { exact: true })).toBeVisible()
  await expectNoSeriousA11yViolations(page, 'sign dialog')
})

test('axe: dark theme (embedded, theme=dark)', async ({ page }) => {
  await page.goto('http://localhost:5520/blank.html')
  await page.evaluate(() => document.querySelector('db-signup')!.setAttribute('theme', 'dark'))
  const frame = page.frameLocator('iframe').first()
  await expect(frame.getByRole('heading', { level: 1 })).toBeVisible()
  await expect
    .poll(() =>
      page
        .frames()
        .find((f) => f.url().includes('theme=dark'))
        ?.evaluate(() => document.documentElement.dataset.theme),
    )
    .toBe('dark')
  await expectNoSeriousA11yViolations(page, 'blank page with dark embedded module')
})

for (const view of ['signup', 'profile', 'jobs']) {
  test(`axe: Savanna ${view} page including the embedded module (module-only results)`, async ({
    page,
  }) => {
    await page.goto(`http://localhost:5510/pages/${view}.html`)
    await expect(
      page.frameLocator('iframe').first().getByRole('heading', { level: 1 }),
    ).toBeVisible()
    await page.waitForTimeout(500)
    // Scan only the ACCESSFLOW module: the original Savanna starter markup is outside our scope and unmodified.
    const results = await new AxeBuilder({ page })
      .include('db-signup')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze()
    const serious = results.violations
      .filter((v) => v.impact === 'serious' || v.impact === 'critical')
      .map((v) => `${v.id}: ${v.nodes[0]?.target.join(' ')}`)
    expect(serious).toEqual([])
  })
}
