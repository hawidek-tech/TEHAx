import { expect, test, type BrowserContext, type Page } from '@playwright/test'
import { next, register, uniqueEmail } from './helpers'

/**
 * Speech synthesis is simulated (headless browsers have no voices). These tests verify ACCESSFLOW's behaviour:
 * what is spoken, when, in which language, and the controls. Real device voices are NOT covered here.
 */
async function fakeVoices(context: BrowserContext, langs: string[]) {
  await context.addInitScript((voiceLangs: string[]) => {
    const spoken: { text: string; lang: string }[] = []
    ;(window as unknown as { __spoken: typeof spoken }).__spoken = spoken
    const synth = {
      getVoices: () => voiceLangs.map((l) => ({ lang: l, name: `Fake ${l}` })),
      speak: (u: { text: string; lang: string; onend?: () => void }) => {
        spoken.push({ text: u.text, lang: u.lang })
      },
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
  page.evaluate(
    () => (window as unknown as { __spoken: { text: string; lang: string }[] }).__spoken,
  )
const lastSpoken = async (page: Page) => (await spoken(page)).at(-1)?.text ?? ''

test('audio accessibility (English): one touch on the first screen starts guidance through the first visit, registration, errors, review', async ({
  page,
  context,
}) => {
  await fakeVoices(context, ['en-US', 'am-ET'])
  await page.goto('/')
  expect(await spoken(page)).toEqual([]) // nothing plays before the user asks
  const activate = page.getByRole('button', { name: /Activate Audio Accessibility/ })
  await expect(activate).toBeVisible()
  await activate.click()
  await expect(page.getByRole('region', { name: 'Audio guidance' })).toBeVisible()
  // The welcome question and the numbered choices are read at once
  await expect.poll(() => lastSpoken(page)).toContain('What would you like to do today?')
  expect(await lastSpoken(page)).toContain('Audio accessibility is on.')
  expect(await lastSpoken(page)).toContain('1. Find a job')
  await expect(page.getByTestId('audio-guide-text')).toContainText(
    'What would you like to do today?',
  )

  // Spoken navigation help
  await page
    .getByRole('region', { name: 'Audio guidance' })
    .getByRole('button', { name: 'Help' })
    .click()
  await expect.poll(() => lastSpoken(page)).toContain('press Tab to go to the next item')

  // Registration: progress, question and (first time only) how to answer are spoken
  await page.goto('/register?next=%2Fonboarding&reason=profile')
  await page.getByRole('button', { name: 'Repeat' }).click() // a reload needs a user action before speech is allowed
  await expect.poll(() => lastSpoken(page)).toContain('Question 1 of 4')
  expect(await lastSpoken(page)).toContain('What should we call you?')
  expect(await lastSpoken(page)).toContain('Type your answer, or press Speak your answer.')
  await page.getByLabel('What should we call you?').fill('Audio User')
  await next(page)
  await expect.poll(() => lastSpoken(page)).toContain('What is your mobile phone number?')
  expect(await lastSpoken(page)).not.toContain('Type your answer') // shorter after the first time
  // Errors are spoken in plain language
  await next(page)
  await expect
    .poll(() => lastSpoken(page))
    .toContain('Please check your answer. Please answer this question.')
  await page.getByRole('button', { name: 'Use email instead of a phone number' }).click()
  await page.getByLabel('What is your email address?').fill(uniqueEmail())
  await next(page)
  await page.getByLabel('Create a password').fill('my coffee is hot today')
  await next(page)
  await page.getByLabel(/I have read how ACCESSFLOW/).check()
  await next(page)
  await expect.poll(() => lastSpoken(page)).toContain('Check your answers')
  expect(await lastSpoken(page)).toContain('Create account')
  await page.getByRole('button', { name: 'Create account' }).click()
  // Next page (profile overview) is guided too
  await expect.poll(() => lastSpoken(page)).toContain('Your profile has 3 short parts')
  // Repeat / turn off
  await page.getByRole('button', { name: 'Repeat' }).click()
  await expect.poll(async () => (await spoken(page)).length).toBeGreaterThan(8)
  await page.getByRole('button', { name: 'Turn off audio' }).click()
  await expect(page.getByRole('region', { name: 'Audio guidance' })).toHaveCount(0)
})

test('audio accessibility (Amharic): Amharic text is spoken with an Amharic voice', async ({
  page,
  context,
}) => {
  await fakeVoices(context, ['en-US', 'am-ET'])
  await page.goto('/')
  await page.getByRole('button', { name: 'አማርኛ' }).click()
  await page.getByRole('button', { name: /የድምፅ ተደራሽነትን አብራ/ }).click()
  await expect.poll(() => lastSpoken(page)).toContain('ዛሬ ምን ማድረግ ይፈልጋሉ?')
  expect((await spoken(page)).at(-1)?.lang).toBe('am-ET')
  await page.goto('/register')
  await page.getByRole('button', { name: 'ድገም' }).click()
  await expect.poll(() => lastSpoken(page)).toContain('ጥያቄ 1 ከ')
  expect(await lastSpoken(page)).toContain('በምን ስም እንጥራዎት?')
})

test('audio accessibility: no voice for the language is stated on screen, never read with a wrong voice', async ({
  page,
  context,
}) => {
  await fakeVoices(context, ['en-US']) // no Amharic voice on this "device"
  await page.goto('/')
  await page.getByRole('button', { name: 'አማርኛ' }).click()
  await page.getByRole('button', { name: /የድምፅ ተደራሽነትን አብራ/ }).click()
  await expect(page.getByRole('region', { name: 'የድምፅ መመሪያ' })).toContainText(
    'ይህ መሣሪያ ለዚህ ቋንቋ ድምፅ የለውም',
  )
  await expect(page.getByTestId('audio-guide-text')).toContainText('ዛሬ ምን ማድረግ ይፈልጋሉ?')
  // Nothing was spoken: Amharic is never read with a wrong-language voice
  expect(await spoken(page)).toEqual([])
})

test('sign-language option: explicit camera start, visible indicator, tracks stopped on close; phrase message confirmed before use', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['camera'])
  await page.addInitScript(() => {
    const streams: MediaStream[] = []
    ;(window as unknown as { __streams: MediaStream[] }).__streams = streams
    const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices)
    navigator.mediaDevices.getUserMedia = async (c) => {
      const s = await original(c)
      streams.push(s)
      return s
    }
  })
  await page.goto('/register')
  await page.getByRole('button', { name: 'Sign or choose phrases' }).click()
  const dialog = page.getByRole('dialog', { name: 'Sign language and phrases' })
  await expect(dialog.getByText('Automatic sign recognition is not available yet')).toBeVisible()
  expect(
    await page.evaluate(() => (window as unknown as { __streams: MediaStream[] }).__streams.length),
  ).toBe(0) // no camera until asked
  await dialog.getByRole('button', { name: 'Turn on camera' }).click()
  await expect(dialog.getByText('Camera is on', { exact: true })).toBeVisible()
  await dialog.getByRole('button', { name: 'Turn off camera' }).click()
  expect(
    await page.evaluate(() =>
      (window as unknown as { __streams: MediaStream[] }).__streams
        .flatMap((s) => s.getTracks())
        .every((t) => t.readyState === 'ended'),
    ),
  ).toBe(true)
  // Turn on again, then close the dialog: tracks must stop
  await dialog.getByRole('button', { name: 'Turn on camera' }).click()
  await expect(dialog.getByText('Camera is on', { exact: true })).toBeVisible()
  await dialog.getByRole('button', { name: 'I need help.' }).click()
  await expect(dialog.getByLabel('Your message')).toHaveValue('I need help.')
  await expect(page.getByLabel('What should we call you?')).toHaveValue('') // nothing used before confirmation
  await dialog.getByLabel('Your message').fill('Selam')
  await dialog.getByRole('button', { name: 'Use this message' }).click()
  await expect(page.getByLabel('What should we call you?')).toHaveValue('Selam')
  expect(
    await page.evaluate(() =>
      (window as unknown as { __streams: MediaStream[] }).__streams
        .flatMap((s) => s.getTracks())
        .every((t) => t.readyState === 'ended'),
    ),
  ).toBe(true)
})

test('offline mid-journey (profile part 2, after 8 earlier questions): answers kept, reload while offline restores them, sync after reconnecting', async ({
  page,
  context,
}) => {
  await register(page, uniqueEmail())
  // Let the service worker install and cache the app shell and form definitions
  await page
    .waitForFunction(
      () => navigator.serviceWorker?.controller !== null || navigator.serviceWorker === undefined,
      null,
      { timeout: 15_000 },
    )
    .catch(() => undefined)
  await page.reload()
  await page.waitForFunction(() => !!navigator.serviceWorker?.controller, null, { timeout: 15_000 })
  // Path A order: 4 account questions, then the profile; question 7 of the journey is in part 2 (work)
  await page.getByRole('button', { name: /^(Start|Continue: About you)$/ }).click()
  await next(page) // grandfather
  await next(page) // birth year
  await page.getByLabel('Which region do you live in?').selectOption({ label: 'Oromia' })
  await next(page)
  await next(page) // city
  await page.getByRole('button', { name: 'Save this part' }).click()
  await page.getByRole('button', { name: 'Continue: Work and study' }).click()
  await expect(page).toHaveURL(/part=work/)
  await expect(page.getByText('Question 1 of')).toBeVisible()
  await context.setOffline(true)
  await page.getByLabel('What kind of work are you looking for?').fill('Farm records')
  await next(page)
  await page.getByLabel('Tell employers a little about yourself').fill('Written while offline.')
  await next(page)
  await expect(
    page.getByText('Saved on this device. It will be sent when you are back online.').first(),
  ).toBeVisible()

  // Reload while still offline: the app shell comes from the service worker and the answers from the device
  await page.reload()
  await expect(page.getByText('We kept your answers')).toBeVisible({ timeout: 15_000 })
  await page.getByRole('button', { name: 'Back' }).click()
  await expect(page.getByLabel('Tell employers a little about yourself')).toHaveValue(
    'Written while offline.',
  )
  await page.getByRole('button', { name: 'Back' }).click()
  await expect(page.getByLabel('What kind of work are you looking for?')).toHaveValue(
    'Farm records',
  )

  // Back online: the next change synchronises with the server
  await context.setOffline(false)
  await page.getByLabel('What kind of work are you looking for?').fill('Farm records assistant')
  await expect(page.getByText('All changes saved')).toBeVisible({ timeout: 15_000 })
  const draft = await page.evaluate(async () =>
    (await fetch('/api/v1/drafts/profile?context=work')).json(),
  )
  expect(draft.data.summary).toBe('Written while offline.')
  const profile = await page.evaluate(async () => (await fetch('/api/v1/profile')).json())
  expect(profile.region).toBe('OROMIA')
})
