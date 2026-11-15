import { expect, test, type BrowserContext, type Page } from '@playwright/test'
import { PASSWORD, expectNoSeriousA11yViolations, next, uniqueEmail } from './helpers'

/**
 * Voice-first welcome (docs/ux/first-visit-flow.md): one question, language and accessibility on the same screen,
 * voice answers. Speech synthesis and recognition are SIMULATED (headless browsers have neither); these tests check
 * ACCESSFLOW's behaviour, not real voices or real recognition accuracy.
 */

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

/** Simulated recogniser: each start() "hears" the next phrase from window.__say. */
async function fakeRecognition(context: BrowserContext) {
  await context.addInitScript(() => {
    const w = window as unknown as { __say: string[]; __heardLang: string }
    w.__say = []
    class FakeRecognition {
      lang = ''
      onresult: ((e: unknown) => void) | null = null
      onend: (() => void) | null = null
      onerror: ((e: unknown) => void) | null = null
      start() {
        w.__heardLang = this.lang
        const phrase = w.__say.shift() ?? ''
        setTimeout(() => {
          this.onresult?.({
            resultIndex: 0,
            results: [{ isFinal: true, 0: { transcript: phrase } }],
          })
          this.onend?.()
        }, 50)
      }
      stop() {}
      abort() {}
    }
    Object.defineProperty(window, 'webkitSpeechRecognition', {
      value: FakeRecognition,
      configurable: true,
    })
    Object.defineProperty(window, 'SpeechRecognition', {
      value: FakeRecognition,
      configurable: true,
    })
    localStorage.setItem('af:voicePrivacyAccepted', 'true') // privacy notice is tested in assistive.spec.ts
  })
}
const say = (page: Page, ...phrases: string[]) =>
  page.evaluate((p) => (window as unknown as { __say: string[] }).__say.push(...p), phrases)

const spokenTexts = (page: Page) =>
  page.evaluate(() =>
    (window as unknown as { __spoken: { text: string; lang: string }[] }).__spoken.map(
      (s) => `${s.lang}: ${s.text}`,
    ),
  )

const WELCOME = /Welcome to ACCESSFLOW\.\s*What would you like to do today\?/

test('welcome: one question, four choices, language and voice on the same screen; no axe issues', async ({
  page,
}) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(WELCOME)
  for (const option of [
    'Find a job',
    'Create my profile',
    'Ask for support',
    'Help me get started',
  ])
    await expect(page.getByRole('button', { name: new RegExp(`^\\d\\. ${option}`) })).toBeVisible()
  const access = page.getByRole('region', { name: 'Language and accessibility' })
  await expect(
    access.getByRole('button', { name: /Activate Audio Accessibility/ }),
  ).toHaveAttribute('aria-pressed', 'false')
  await expect(access.getByRole('group', { name: 'Language' }).getByRole('button')).toHaveCount(5)
  // Nothing asks about disability: there is no "do you use a screen reader" question
  await expect(page.getByText(/screen reader\?/i)).toHaveCount(0)
  await expectNoSeriousA11yViolations(page, 'welcome')
  await access.getByRole('button', { name: /More options/ }).click()
  await expectNoSeriousA11yViolations(page, 'welcome with more options')
})

test('language buttons translate the page at once and the choice is remembered', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'አማርኛ' }).click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'am')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('ዛሬ ምን ማድረግ ይፈልጋሉ?')
  await page.reload()
  await expect(page.getByRole('heading', { level: 1 })).toContainText('ዛሬ ምን ማድረግ ይፈልጋሉ?')
})

test('Activate Audio Accessibility reads the question and the numbered choices (English and Amharic)', async ({
  page,
  context,
}) => {
  await fakeVoices(context, ['en-US', 'am-ET'])
  await page.goto('/')
  expect(await spokenTexts(page)).toEqual([]) // nothing before the person presses a button
  await page.getByRole('button', { name: /Activate Audio Accessibility/ }).click()
  await expect(page.getByRole('region', { name: 'Audio guidance' })).toBeVisible()
  await expect
    .poll(async () => (await spokenTexts(page)).at(-1))
    .toContain('en-US: Audio accessibility is on.')
  const last = (await spokenTexts(page)).at(-1)!
  for (const part of [
    'What would you like to do today?',
    '1. Find a job.',
    '4. Help me get started.',
  ])
    expect(last).toContain(part)
  await expect(page.getByTestId('audio-guide-text')).toContainText('1. Find a job.')

  // In Amharic the screen is read with an Amharic voice
  await page.getByRole('button', { name: 'አማርኛ' }).click()
  await page.reload()
  await page
    .getByRole('region', { name: 'የድምፅ መመሪያ' })
    .getByRole('button', { name: /ድገም|ቀጥል/ })
    .click()
  await expect.poll(async () => (await spokenTexts(page)).at(-1)).toContain('am-ET:')
  await expect.poll(async () => (await spokenTexts(page)).at(-1)).toContain('ሥራ ፈልግ')
})

test('with the voice guide off (screen-reader experience) ACCESSFLOW never speaks', async ({
  page,
  context,
}) => {
  await fakeVoices(context, ['en-US'])
  await page.goto('/')
  await page.getByRole('button', { name: /^\d\. Find a job/ }).click()
  await expect(page.getByRole('heading', { name: /jobs? found/ })).toBeVisible()
  await page
    .getByRole('link')
    .filter({ hasText: /Assistant|Agent|Educator|Intern/ })
    .first()
    .click()
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await page.waitForTimeout(800)
  expect(await spokenTexts(page)).toEqual([])
  await expect(page.getByRole('region', { name: 'Audio guidance' })).toHaveCount(0)
})

test('voice guide on a job: the description is read after the title', async ({ page, context }) => {
  await fakeVoices(context, ['en-US'])
  await page.goto('/jobs')
  await page.getByRole('button', { name: 'Voice guide' }).click()
  await page
    .getByRole('link')
    .filter({ hasText: /Customer Support Agent/ })
    .first()
    .click()
  await expect
    .poll(async () => (await spokenTexts(page)).join(' | '))
    .toContain('Customer Support Agent')
  const description = await page.locator('main [data-announce]').first().innerText()
  await expect
    .poll(async () => (await spokenTexts(page)).at(-1))
    .toContain(description.slice(0, 40))
})

test('choose by voice: saying "find a job" or a number opens that choice', async ({
  page,
  context,
}) => {
  await fakeRecognition(context)
  await page.goto('/')
  await say(page, 'Find a job')
  await page.getByRole('button', { name: 'Choose by voice' }).click()
  await expect(page.getByText('You chose: Find a job.')).toBeVisible()
  await expect(page).toHaveURL(/\/jobs$/)

  await page.goto('/')
  await say(page, 'number three')
  await page.getByRole('button', { name: 'Choose by voice' }).click()
  await expect(page).toHaveURL(/\/register\?next=%2Fsupport%2Fnew&reason=support/)
  // Recognition uses the page language
  expect(
    await page.evaluate(() => (window as unknown as { __heardLang: string }).__heardLang),
  ).toBe('en-US')
})

test('voice answers inside a form: yes ticks the agreement, spoken commands go next and back; not understood is said', async ({
  page,
  context,
}) => {
  await fakeRecognition(context)
  await fakeVoices(context, ['en-US'])
  await page.goto('/register')
  await page.getByRole('button', { name: 'Voice guide' }).click()
  await page.getByLabel('What should we call you?').fill('Voice User')
  await next(page)
  await page.getByRole('button', { name: 'Use email instead of a phone number' }).click()
  await page.getByLabel('What is your email address?').fill(uniqueEmail())
  await next(page)
  await page.getByLabel('Create a password').fill(PASSWORD)
  await next(page)
  const consent = page.getByLabel(/I have read how ACCESSFLOW/)
  await expect(consent).not.toBeChecked()

  await say(page, 'banana')
  await page.getByRole('main').getByRole('button', { name: 'Answer by voice' }).click()
  await expect(
    page.getByRole('main').getByText(/Sorry, I did not understand “banana”/),
  ).toBeVisible()

  await say(page, 'yes')
  await page.getByRole('main').getByRole('button', { name: 'Answer by voice' }).click()
  await expect(consent).toBeChecked()

  const bar = page.getByRole('region', { name: 'Audio guidance' })
  await say(page, 'next')
  await bar.getByRole('button', { name: 'Say a command' }).click()
  await expect(page.getByRole('heading', { name: 'Check your answers' })).toBeVisible()
  await say(page, 'back')
  await bar.getByRole('button', { name: 'Say a command' }).click()
  await expect(consent).toBeVisible()
})

test('More options: simple words, bigger text and picture phrases change the interface at once', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: /More options/ }).click()
  await page.getByRole('switch', { name: 'Use simple words' }).check()
  await expect(page.getByRole('heading', { level: 1 })).toContainText('What do you want to do now?')
  await page.getByRole('switch', { name: 'Bigger text' }).check()
  await expect
    .poll(() => page.evaluate(() => getComputedStyle(document.documentElement).fontSize))
    .toBe('24px')
  await page.getByRole('switch', { name: 'Bigger text' }).uncheck()
  await page.getByRole('switch', { name: 'Use simple words' }).uncheck() // simple words also reword buttons
  await page.getByRole('switch', { name: 'Picture phrases and sign language' }).check()
  await page.goto('/register')
  await expect(page.getByRole('button', { name: 'Sign or choose phrases' })).toBeVisible()
  const order = await page.evaluate(() => {
    const b = [...document.querySelectorAll('main button')].map((x) => x.textContent ?? '')
    return {
      sign: b.findIndex((x) => x.includes('Sign or choose phrases')),
      voice: b.findIndex((x) => x.includes('Speak')),
    }
  })
  expect(order.sign).toBeGreaterThanOrEqual(0)
  if (order.voice >= 0) expect(order.sign).toBeLessThan(order.voice)
})

test('Help me get started: short guide with quick settings, then back to the choices', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: /^\d\. Help me get started/ }).click()
  await expect(page.getByRole('heading', { level: 1, name: "Let's get you started" })).toBeFocused()
  await expect(page.getByRole('main').getByRole('listitem')).toHaveCount(5)
  await expect(page.getByRole('button', { name: /Activate Audio Accessibility/ })).toBeVisible()
  await expectNoSeriousA11yViolations(page, 'get started')
  await page.getByRole('button', { name: 'Back to the choices' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(WELCOME)
})

test('header: voice guide, language and Help on every page; the Help menu holds every item', async ({
  page,
}) => {
  await page.goto('/jobs')
  const header = page.getByRole('banner')
  await expect(header.getByRole('button', { name: 'Voice guide' })).toHaveAttribute(
    'aria-pressed',
    'false',
  )
  await expect(header.getByRole('combobox', { name: 'Language' })).toBeVisible()
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
  ])
    await expect(dialog.getByRole('button', { name, exact: true })).toBeVisible()
  for (const name of ['Voice guide', 'Picture phrases and sign language'])
    await expect(dialog.getByRole('switch', { name })).toBeVisible()
  await expect(dialog.getByRole('checkbox', { name: 'Use simple words' })).toBeVisible()
  await expectNoSeriousA11yViolations(page, 'help and settings')
})

test('no single-key shortcuts: typing letters on the welcome screen changes nothing', async ({
  page,
}) => {
  await page.goto('/')
  await page.keyboard.type('hjrsq123')
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('without speech recognition, there is no voice button and every choice still works', async ({
  page,
  context,
}) => {
  await context.addInitScript(() => {
    Object.defineProperty(window, 'webkitSpeechRecognition', {
      value: undefined,
      configurable: true,
    })
    Object.defineProperty(window, 'SpeechRecognition', { value: undefined, configurable: true })
  })
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Choose by voice' })).toHaveCount(0)
  await page.getByRole('button', { name: /^\d\. Find a job/ }).click()
  await expect(page).toHaveURL(/\/jobs$/)
})
