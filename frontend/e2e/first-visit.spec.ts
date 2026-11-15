import { expect, test, type BrowserContext, type Page } from '@playwright/test'
import { expectNoSeriousA11yViolations } from './helpers'

/** First visit, usage modes and the single Help and settings menu (docs/ux/first-visit-flow.md). */

/** Simulated speech engine (headless browsers have no voices); records what would be spoken. */
async function fakeVoices(context: BrowserContext, langs: string[]) {
  await context.addInitScript((voiceLangs: string[]) => {
    const spoken: { text: string; lang: string }[] = []
    ;(window as unknown as { __spoken: typeof spoken }).__spoken = spoken
    const synth = {
      getVoices: () => voiceLangs.map((l) => ({ lang: l, name: `Fake ${l}` })),
      speak: (u: { text: string; lang: string }) => spoken.push({ text: u.text, lang: u.lang }),
      pause() {},
      resume() {},
      cancel() {},
      addEventListener() {},
      removeEventListener() {},
    }
    Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true })
    ;(window as unknown as { SpeechSynthesisUtterance: unknown }).SpeechSynthesisUtterance = class {
      text: string
      lang = ''
      voice: unknown = null
      constructor(t: string) {
        this.text = t
      }
    }
  }, langs)
}
const spoken = (page: Page) =>
  page.evaluate(() => (window as unknown as { __spoken: { text: string }[] }).__spoken.length)
const allSpoken = (page: Page) =>
  page.evaluate(() =>
    (window as unknown as { __spoken: { text: string; lang: string }[] }).__spoken.map(
      (s) => `${s.lang}: ${s.text}`,
    ),
  )

async function setUp(page: Page, mode: RegExp) {
  await page.goto('/')
  await page.getByRole('button', { name: /Jalqabi Start/ }).click()
  await page.getByRole('button', { name: /^English/ }).click()
  await page.getByRole('button', { name: mode }).click()
  await expect(
    page.getByRole('heading', { level: 1, name: 'What would you like to do today?' }),
  ).toBeVisible()
}

test('first visit: Start → language → how → what; one h1 per screen, focus moves, no axe issues', async ({
  page,
}) => {
  await page.goto('/')
  const start = page.getByRole('button', { name: /Jalqabi Start/ })
  await expect(start).toBeVisible()
  await expect(page.getByRole('button', { name: /Activate Audio Accessibility/ })).toBeVisible()
  await expectNoSeriousA11yViolations(page, 'first visit: start')
  await start.click()

  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused()
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Choose your language')
  await expect(page.getByRole('button', { name: /ትግርኛ/ })).toBeVisible()
  await expectNoSeriousA11yViolations(page, 'first visit: language')
  await page.getByRole('button', { name: /^English/ }).click()

  await expect(
    page.getByRole('heading', { level: 1, name: 'How do you want to use ACCESSFLOW?' }),
  ).toBeFocused()
  await expectNoSeriousA11yViolations(page, 'first visit: how')
  await page.getByRole('button', { name: /I'll read and type/ }).click()

  const what = page.getByRole('heading', { level: 1, name: 'What would you like to do today?' })
  await expect(what).toBeFocused()
  for (const option of [
    'Find a job',
    'Create my profile',
    'Ask for support',
    'Learn how this works',
  ])
    await expect(page.getByRole('button', { name: new RegExp(`^${option}`) })).toBeVisible()
  await expectNoSeriousA11yViolations(page, 'first visit: what')

  // The tour, and back
  await page.getByRole('button', { name: /^Learn how this works/ }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'How ACCESSFLOW works' })).toBeFocused()
  await expect(page.getByRole('main').getByRole('listitem')).toHaveCount(5)
  await page.getByRole('button', { name: 'Got it' }).click()
  await expect(what).toBeVisible()

  // Choices are remembered on this device: no setup questions next time
  await page.reload()
  await expect(what).toBeVisible()
})

test('language choice translates the screens and is remembered; shared device forgets the setup', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: /Jalqabi Start/ }).click()
  await page.getByRole('button', { name: /አማርኛ/ }).click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'am')
  await page.getByRole('button', { name: /እኔ አንብቤ እጽፋለሁ/ }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('ዛሬ ምን ማድረግ ይፈልጋሉ?')
  await page.reload()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('ዛሬ ምን ማድረግ ይፈልጋሉ?')

  // Shared device: the setup (which can reveal a disability) is not kept for the next person
  await page.goto('/settings')
  await page.getByRole('switch', { name: /የጋራ መሣሪያ/ }).check()
  await page.goto('/')
  await page.reload()
  await expect(page.getByRole('button', { name: /Jalqabi Start/ })).toBeVisible()
})

test('"Read it to me" turns on the audio guide and reads the next screen', async ({
  page,
  context,
}) => {
  await fakeVoices(context, ['en-US'])
  await page.goto('/')
  expect(await spoken(page)).toBe(0) // nothing before the person presses a button
  await page.getByRole('button', { name: /Jalqabi Start/ }).click()
  // "Choose your language" is said once in each language that has a voice (here: English only)
  await expect.poll(() => allSpoken(page)).toContain('en-US: Choose your language')
  await page.getByRole('button', { name: /^English/ }).click()
  await page.getByRole('button', { name: /^Read it to me/ }).click()
  await expect(page.getByRole('region', { name: 'Audio guidance' })).toBeVisible()
  await expect(page.getByTestId('audio-guide-text')).toContainText(
    'What would you like to do today?',
  )
  await expect(page.getByTestId('audio-guide-text')).toContainText('1. Find a job')
})

test('"Activate Audio Accessibility" is one touch from the first screen and skips the "how" question', async ({
  page,
  context,
}) => {
  await fakeVoices(context, ['en-US', 'am-ET'])
  await page.goto('/')
  await page.getByRole('button', { name: /Activate Audio Accessibility/ }).click()
  await expect(page.getByRole('region', { name: 'Audio guidance' })).toBeVisible()
  await expect.poll(() => allSpoken(page)).toContain('am-ET: ቋንቋዎን ይምረጡ')
  await page.getByRole('button', { name: /አማርኛ/ }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('ዛሬ ምን ማድረግ ይፈልጋሉ?')
  await expect.poll(async () => (await allSpoken(page)).at(-1)).toContain('ዛሬ ምን ማድረግ ይፈልጋሉ?')
})

for (const mode of [/^I use my own screen reader/, /^I use sign language or pictures/]) {
  test(`mode ${mode.source}: ACCESSFLOW never speaks after the choice`, async ({
    page,
    context,
  }) => {
    await fakeVoices(context, ['en-US'])
    await setUp(page, mode)
    const before = await spoken(page)
    await page.getByRole('button', { name: /^Find a job/ }).click()
    await expect(page.getByRole('heading', { name: /jobs? found/ })).toBeVisible()
    await page
      .getByRole('link')
      .filter({ hasText: /Assistant|Agent|Educator|Intern/ })
      .first()
      .click()
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await page.waitForTimeout(800)
    expect(await spoken(page)).toBe(before)
    await expect(page.getByRole('region', { name: 'Audio guidance' })).toHaveCount(0)
  })
}

test('sign/pictures mode: picture phrases come first on written questions', async ({ page }) => {
  await setUp(page, /^I use sign language or pictures/)
  await page.goto('/register')
  const sign = page.getByRole('button', { name: 'Sign or choose phrases' })
  await expect(sign).toBeVisible()
  // Placed before the voice button
  const order = await page.evaluate(() => {
    const buttons = [...document.querySelectorAll('main button')].map((b) => b.textContent ?? '')
    return {
      sign: buttons.findIndex((t) => t.includes('Sign or choose phrases')),
      voice: buttons.findIndex((t) => t.includes('Speak')),
    }
  })
  expect(order.sign).toBeLessThan(order.voice)
})

test('header has only Help and settings (and sign in); the Help menu holds every item', async ({
  page,
}) => {
  await setUp(page, /I'll read and type/)
  const header = page.getByRole('banner')
  await expect(header.getByRole('combobox')).toHaveCount(0)
  await expect(header.getByRole('button')).toHaveText(['Help and settings'])
  await header.getByRole('button', { name: 'Help and settings' }).click()
  const dialog = page.getByRole('dialog', { name: 'Help and settings' })
  for (const name of [
    'Repeat',
    'What would you like to do?',
    'Ask a question',
    'Ask a person',
    'Save and stop',
    'All settings',
    'English',
    'አማርኛ',
    'Afaan Oromoo',
    'Soomaali',
    'ትግርኛ',
    'Read it to me',
    'I use my own screen reader',
    "I'll read and type",
    'I use sign language or pictures',
  ])
    await expect(dialog.getByRole('button', { name, exact: true })).toBeVisible()
  await expect(dialog.getByRole('checkbox', { name: 'Use simple words' })).toBeVisible()
  await expectNoSeriousA11yViolations(page, 'help and settings')

  // Change language from the menu
  await dialog.getByRole('button', { name: 'አማርኛ' }).click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'am')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('ዛሬ ምን ማድረግ ይፈልጋሉ?')
})

test('no single-key shortcuts: typing letters on a screen changes nothing', async ({ page }) => {
  await setUp(page, /I'll read and type/)
  const url = page.url()
  await page.keyboard.type('hjrsq123')
  await expect(page).toHaveURL(url)
  await expect(page.getByRole('dialog')).toHaveCount(0)
})
