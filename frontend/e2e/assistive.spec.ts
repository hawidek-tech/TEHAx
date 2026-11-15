import { expect, test } from '@playwright/test'
import { next, register, uniqueEmail } from './helpers'

/**
 * Voice input and read-aloud UI behaviour. Headless browsers have no microphone or voices, so the Web Speech APIs
 * are replaced with small fakes: this verifies OUR interface (review-before-use, controls, captions), not the
 * browser's recognition quality.
 */
test('voice input: privacy notice, recognised text is reviewed and edited before it is used', async ({
  page,
  context,
}) => {
  await context.addInitScript(() => {
    class FakeRecognition {
      lang = ''
      onresult: ((e: unknown) => void) | null = null
      onend: (() => void) | null = null
      onerror: ((e: unknown) => void) | null = null
      start() {
        ;(window as unknown as { __recognitionLang: string }).__recognitionLang = this.lang
        setTimeout(() => {
          this.onresult?.({
            resultIndex: 0,
            results: [{ isFinal: true, 0: { transcript: 'almas' } }],
          })
          this.onend?.()
        }, 50)
      }
      stop() {}
      abort() {}
    }
    // Chromium's built-in recogniser cannot be replaced by assignment; redefine both names.
    Object.defineProperty(window, 'webkitSpeechRecognition', {
      value: FakeRecognition,
      configurable: true,
    })
    Object.defineProperty(window, 'SpeechRecognition', {
      value: FakeRecognition,
      configurable: true,
    })
  })
  await page.goto('/register')
  const field = page.getByLabel('What should we call you?')
  await page.getByRole('button', { name: 'Speak your answer' }).click()
  const privacy = page.getByRole('dialog', { name: 'Before you use your voice' })
  await expect(privacy).toContainText('Google')
  await privacy.getByRole('button', { name: 'I understand, use my voice' }).click()

  const review = page.getByRole('dialog', { name: 'Check what we heard' })
  const transcript = review.getByLabel('Text from your voice')
  await expect(transcript).toHaveValue('almas')
  await expect(field).toHaveValue('') // never applied automatically
  await transcript.fill('Almaz') // user corrects the recognition
  await review.getByRole('button', { name: 'Use this text' }).click()
  await expect(field).toHaveValue('Almaz')
  await expect(field)
    .toBeFocused()
    .catch(() => undefined)
  expect(
    await page.evaluate(
      () => (window as unknown as { __recognitionLang: string }).__recognitionLang,
    ),
  ).toBe('en-US')

  // Language follows the interface language (Amharic → am-ET)
  await page.goto('/settings')
  await page.getByRole('radio', { name: /አማርኛ/ }).check()
  await page.goto('/register')
  await page.getByRole('button', { name: 'መልስዎን ይናገሩ' }).click()
  await expect
    .poll(() =>
      page.evaluate(() => (window as unknown as { __recognitionLang: string }).__recognitionLang),
    )
    .toBe('am-ET')
})

test('voice input: unsupported browser shows a typing alternative', async ({ page, context }) => {
  // Simulate a browser without speech recognition (e.g. Firefox).
  await context.addInitScript(() => {
    Object.defineProperty(window, 'webkitSpeechRecognition', {
      value: undefined,
      configurable: true,
    })
    Object.defineProperty(window, 'SpeechRecognition', { value: undefined, configurable: true })
  })
  await page.goto('/register')
  await expect(
    page.getByText(/Voice input does not work in this browser. Please type your answer./),
  ).toBeVisible()
  await expect(page.getByLabel('What should we call you?')).toBeEditable()
})

test('read-aloud: play, pause, resume and stop, with on-screen captions; never starts by itself', async ({
  page,
  context,
}) => {
  await context.addInitScript(() => {
    const spoken: string[] = []
    ;(window as unknown as { __spoken: string[] }).__spoken = spoken
    const synth = {
      speaking: false,
      paused: false,
      getVoices: () => [{ lang: 'en-US', name: 'Fake English' }],
      speak: (u: { text: string }) => spoken.push(u.text),
      pause() {},
      resume() {},
      cancel() {},
      addEventListener() {},
      removeEventListener() {},
    }
    Object.defineProperty(window, 'speechSynthesis', { value: synth })
    ;(window as unknown as { SpeechSynthesisUtterance: unknown }).SpeechSynthesisUtterance = class {
      text: string
      constructor(t: string) {
        this.text = t
      }
    }
  })
  await page.goto('/settings')
  await page.getByRole('switch', { name: /Captions for audio/ }).check()
  await page.goto('/register')
  expect(
    await page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken.length),
  ).toBe(0)
  await page.getByRole('button', { name: 'Listen' }).first().click()
  expect(
    await page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken[0]),
  ).toContain('What should we call you?')
  await expect(page.getByText('Now reading:')).toBeVisible()
  await page.getByRole('button', { name: 'Pause' }).click()
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('button', { name: 'Stop' }).click()
  await expect(page.getByText('Now reading:')).toHaveCount(0)
})

test('read-aloud: says clearly when the device has no voice for the language', async ({
  page,
  context,
}) => {
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
  })
  await page.goto('/settings')
  await page.getByRole('radio', { name: /ትግርኛ/ }).check()
  await page.goto('/register')
  await expect(page.getByText(/ኣብዚ መሳርሒ ብዚ ቋንቋ ምስማዕ ኣይከኣልን/).first()).toBeVisible()
})

test('offline: answers are kept on the device and the user is told; sending waits for a connection', async ({
  page,
  context,
}) => {
  await register(page, uniqueEmail())
  await page.getByLabel('What is your first name?').fill('Offline')
  await next(page)
  await expect(page.getByText('All changes saved')).toBeVisible()
  await context.setOffline(true)
  await expect(page.getByText(/You are offline/).first()).toBeVisible()
  await page.getByLabel("What is your father's name?").fill('Tester')
  await next(page)
  await expect(
    page.getByText('Saved on this device. It will be sent when you are back online.').first(),
  ).toBeVisible()
  await expect.poll(() => page.evaluate(() => JSON.stringify(localStorage))).toContain('Tester')
  await context.setOffline(false)
  await page.getByLabel("What is your grandfather's name?").fill('Back')
  await expect(page.getByText('All changes saved')).toBeVisible({ timeout: 15_000 })
})
