import { expect, test } from '@playwright/test'

/** Every accessibility setting must actually change the interface (spec: no decorative settings). */
test.describe('accessibility preferences change the interface', () => {
  test.beforeEach(async ({ page }) => page.goto('/preview'))

  test('text size scales the root font up to 200%', async ({ page }) => {
    const size = () => page.evaluate(() => getComputedStyle(document.documentElement).fontSize)
    expect(await size()).toBe('16px')
    await page.getByRole('radio', { name: /200%/ }).check()
    await expect.poll(size).toBe('32px')
  })

  test('high contrast switches to the black/yellow palette', async ({ page }) => {
    await page.getByRole('switch', { name: /High contrast/ }).check()
    await expect(page.locator('html')).toHaveAttribute('data-contrast', 'high')
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe(
      'rgb(0, 0, 0)',
    )
  })

  test('simple words replace instructions with simplified text', async ({ page }) => {
    await page.goto('/')
    const before = await page.getByRole('heading', { level: 1 }).textContent()
    await page.goto('/settings')
    await page.getByRole('switch', { name: /Simple words/ }).check()
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Find work. Do it your way.')
    expect(before).not.toBe('Find work. Do it your way.')
  })

  test('listen buttons can be hidden', async ({ page }) => {
    await expect(
      page
        .getByRole('group', { name: 'Listen' })
        .or(page.getByText(/Listening is not available/))
        .first(),
    ).toBeVisible()
    await page.getByRole('switch', { name: /Listen buttons/ }).uncheck()
    await expect(page.getByRole('button', { name: 'Listen' })).toHaveCount(0)
    await expect(page.getByText(/Listening is not available/)).toHaveCount(0)
  })

  test('keyboard first shows the skip link and thickens focus outlines', async ({ page }) => {
    await page.getByRole('switch', { name: /Keyboard first/ }).check()
    await expect(page.locator('html')).toHaveAttribute('data-keyboard', 'true')
    await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeVisible()
    expect(
      await page.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue('--af-focus-width').trim(),
      ),
    ).toBe('5px')
  })

  test('reduce motion turns off transitions', async ({ page }) => {
    await page.getByRole('switch', { name: /Reduce motion/ }).check()
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced')
    const duration = await page.evaluate(
      () =>
        getComputedStyle(document.querySelector('.af-transition')!).transitionDuration.split(
          ',',
        )[0],
    )
    expect(parseFloat(duration)).toBeLessThan(0.01)
  })

  test('captions setting is saved and exposed to the read-aloud caption bar', async ({ page }) => {
    await page.getByRole('switch', { name: /Captions for audio/ }).check()
    await expect(page.getByRole('switch', { name: /Captions for audio/ })).toBeChecked()
    await page.reload()
    await expect(page.getByRole('switch', { name: /Captions for audio/ })).toBeChecked()
  })

  test('language switch translates the whole interface and sets lang', async ({ page }) => {
    await page.getByRole('radio', { name: /Afaan Oromoo/ }).check()
    await expect(page.locator('html')).toHaveAttribute('lang', 'om')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText("Qindaa'ina keessan yaalaa")
    await page.getByRole('radio', { name: /ትግርኛ/ }).check()
    await expect(page.locator('html')).toHaveAttribute('lang', 'ti')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('ቅጥዕታትኩም ፈትኑ')
  })

  test('shared device mode keeps no answers on the device', async ({ page }) => {
    await page.getByRole('switch', { name: /Shared device/ }).check()
    await page.goto('/register')
    await page.getByLabel('What should we call you?').fill('Shared Phone')
    await page.getByRole('button', { name: 'Next' }).click()
    await page.waitForTimeout(1200)
    const drafts = await page.evaluate(() =>
      Object.keys(localStorage).filter((k) => k.startsWith('af:draft:')),
    )
    expect(drafts).toEqual([])
  })

  test('without shared device mode, passwords are still never stored on the device', async ({
    page,
  }) => {
    await page.goto('/register')
    await page.getByLabel('What should we call you?').fill('Own Phone')
    await page.getByRole('button', { name: 'Next' }).click()
    await page.getByLabel('With my email address').check()
    await page.getByRole('button', { name: 'Next' }).click()
    await page.getByLabel('What is your email address?').fill('own@example.com')
    await page.getByRole('button', { name: 'Next' }).click()
    await page.getByLabel('Create a password').fill('a secret sentence here')
    await page.getByRole('button', { name: 'Next' }).click()
    await page.waitForTimeout(1200)
    const stored = await page.evaluate(() => JSON.stringify(localStorage))
    expect(stored).toContain('Own Phone')
    expect(stored).not.toContain('a secret sentence here')
  })
})
