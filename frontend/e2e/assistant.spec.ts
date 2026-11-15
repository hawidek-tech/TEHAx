import { expect, test, type BrowserContext, type Page } from '@playwright/test'
import { PASSWORD, register, uniqueEmail } from './helpers'

/**
 * The voice assistant end to end. Speech synthesis and recognition are SIMULATED: the fake voice "finishes" each
 * sentence after a few milliseconds, and the fake microphone "hears" the phrases the test supplies (one per listen).
 * This verifies ACCESSFLOW's conversation logic, not real voices or real recognition accuracy.
 */
async function fakeSpeech(context: BrowserContext, voices = ['en-US', 'am-ET']) {
  await context.addInitScript((voiceLangs: string[]) => {
    const w = window as unknown as {
      __spoken: { text: string; lang: string }[]
      __say: string[]
      __listening: boolean
      __recLang: string
      __starts: number
    }
    w.__spoken = []
    w.__say = []
    w.__listening = false
    w.__starts = 0
    const synth = {
      getVoices: () => voiceLangs.map((l) => ({ lang: l, name: `Fake ${l}` })),
      speak: (u: { text: string; lang: string; onend?: () => void }) => {
        w.__spoken.push({ text: u.text, lang: u.lang })
        setTimeout(() => u.onend?.(), 5)
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
      onend: (() => void) | null = null
      onerror: (() => void) | null = null
      constructor(t: string) {
        this.text = t
      }
    }
    class FakeRecognition {
      lang = ''
      onresult: ((e: unknown) => void) | null = null
      onend: (() => void) | null = null
      onerror: ((e: unknown) => void) | null = null
      private timer = 0
      start() {
        w.__listening = true
        w.__recLang = this.lang
        w.__starts++
        const poll = () => {
          const phrase = w.__say.shift()
          if (phrase === undefined) {
            this.timer = window.setTimeout(poll, 30)
            return
          }
          w.__listening = false
          if (phrase === '<silence>') this.onerror?.({ error: 'no-speech' })
          else
            this.onresult?.({
              resultIndex: 0,
              results: [{ isFinal: true, 0: { transcript: phrase } }],
            })
          this.onend?.()
        }
        this.timer = window.setTimeout(poll, 30)
      }
      stop() {
        this.abort()
      }
      abort() {
        window.clearTimeout(this.timer)
        w.__listening = false
        this.onend?.()
      }
    }
    Object.defineProperty(window, 'webkitSpeechRecognition', {
      value: FakeRecognition,
      configurable: true,
    })
    Object.defineProperty(window, 'SpeechRecognition', {
      value: FakeRecognition,
      configurable: true,
    })
  }, voices)
}

const listening = (page: Page) =>
  page.evaluate(() => (window as unknown as { __listening: boolean }).__listening)
const say = (page: Page, phrase: string) =>
  page.evaluate((p) => (window as unknown as { __say: string[] }).__say.push(p), phrase)
const lastAssistant = async (page: Page) =>
  (await page.locator('[role="log"] li.self-start').last().innerText()).replace(/\s+/g, ' ')
const allSpoken = (page: Page) =>
  page.evaluate(() =>
    (window as unknown as { __spoken: { text: string }[] }).__spoken.map((s) => s.text),
  )

const starts = (page: Page) =>
  page.evaluate(() => (window as unknown as { __starts: number }).__starts)

/**
 * Waits for the assistant's NEXT turn: a new listening session (or a typed-password request), then returns what it
 * last said. Counting listening sessions avoids races with the fast simulated voice.
 */
let seen = 0
async function nextTurn(page: Page) {
  const password = page.getByLabel(/Type your password/)
  await expect
    .poll(
      async () =>
        ((await listening(page)) && (await starts(page)) > seen) || (await password.isVisible()),
      { timeout: 15_000 },
    )
    .toBe(true)
  seen = await starts(page)
  return { said: await lastAssistant(page), password: await password.isVisible() }
}
test.beforeEach(() => {
  seen = 0
})

test('blind user: Enter on the welcome page, then find a job, hear it, create an account and apply - all by voice', async ({
  page,
  context,
}) => {
  test.setTimeout(120_000)
  await fakeSpeech(context)
  await page.goto('/')
  // The assistant entry has focus on arrival: one Enter starts the conversation (no searching for buttons)
  await expect(page.getByRole('button', { name: /Talk to ACCESSFLOW/ })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/assistant/)

  const phoneNumber = `09${String(Math.floor(Math.random() * 1e8)).padStart(8, '0')}`
  let heardMore = false
  const rules: [RegExp, () => string][] = [
    [/Say yes to keep it/, () => 'yes'], // checked first: these prompts also mention other words
    [/What can I help you with today/, () => 'I want to find a job'],
    [/What kind of job/, () => 'customer support'],
    [
      /hear more, hear the next job, or apply/,
      () => (heardMore ? 'apply' : ((heardMore = true), 'tell me more')),
    ],
    [/already have an ACCESSFLOW account/, () => 'no'],
    [/What should I call you/, () => 'Almaz Bekele'],
    [/I heard .* Is that right\?/, () => 'yes'],
    [/mobile phone number/, () => phoneNumber.split('').join(' ')],
    [/Do you agree\?/, () => 'yes'],
    [/region/i, () => 'Addis Ababa'],
    [/kind of work are you looking for/, () => 'Customer service'],
    [/skills/i, () => 'Typing, Amharic and English'],
    [/Why do you want this job/, () => 'I enjoy helping people solve their problems.'],
    [/experience do you have/, () => 'Three years answering customer calls.'],
    [/When could you start/, () => 'in two weeks'],
    [/languages can you use/, () => 'Amharic and English'],
    [/The choices are/, () => 'one'],
    [/send your application/, () => 'yes, send it'],
    [/anything else/, () => '<done>'],
  ]
  for (let turn = 0; turn < 60; turn++) {
    const { said, password } = await nextTurn(page)
    if (password) {
      await page.getByLabel(/Type your password/).fill(PASSWORD)
      await page.getByLabel(/Type your password/).press('Enter')
      await expect(page.getByLabel(/Type your password/)).toBeHidden()
      continue
    }
    const rule = rules.find(([re]) => re.test(said))
    expect(rule, `no scripted answer for: ${said}`).toBeTruthy()
    const answer = rule![1]()
    if (answer === '<done>') break
    await say(page, answer)
  }

  const spoken = (await allSpoken(page)).join(' | ')
  expect(spoken).toContain('Welcome to ACCESSFLOW!')
  expect(spoken).toContain('I found')
  expect(spoken).not.toContain(PASSWORD) // the password is never spoken
  await expect(page.locator('[role="log"]')).toContainText(/Your application for .* was sent/)
  await expect(page.locator('[role="log"]')).not.toContainText(PASSWORD) // nor shown
  const apps = await page.evaluate(async () => (await fetch('/api/v1/applications')).json())
  expect(apps).toHaveLength(1)

  // Leaving the assistant (in-app navigation) releases the microphone at once
  expect(await listening(page)).toBe(true)
  await page.getByRole('link', { name: 'ACCESSFLOW' }).click()
  await expect.poll(() => listening(page)).toBe(false)
})

test('never sends without an explicit yes: "no" keeps the application as a draft', async ({
  page,
  context,
}) => {
  test.setTimeout(90_000)
  await fakeSpeech(context)
  await register(page, uniqueEmail(), 'Draft Tester')
  await page.goto('/assistant?start=1')
  const rules: [RegExp, string][] = [
    [/Say yes to keep it/, 'skip'], // skip keeps an existing answer
    [/unfinished/, 'no'],
    [/What can I help you with today/, 'find a job in customer support'],
    [/hear more, hear the next job, or apply/, 'apply'],
    [/region/i, 'Oromia'],
    [/kind of work are you looking for/, 'Sales'],
    [/skills/i, 'skip'],
    [/Why do you want this job/, 'I want to grow my career in this field.'],
    [/experience do you have/, 'Two years in a shop.'],
    [/When could you start/, 'now'],
    [/languages can you use/, 'Amharic'],
    [/The choices are/, 'one'],
    [/send your application/, 'no, not yet'],
  ]
  for (let turn = 0; turn < 40; turn++) {
    const { said } = await nextTurn(page)
    if (/kept your answers/.test(said) || /anything else/.test(said)) break
    const rule = rules.find(([re]) => re.test(said))
    expect(rule, `no scripted answer for: ${said}`).toBeTruthy()
    await say(page, rule![1])
  }
  await expect(page.locator('[role="log"]')).toContainText('I kept your answers')
  expect(
    await page.evaluate(async () => (await fetch('/api/v1/applications')).json()),
  ).toHaveLength(0)
  const drafts = await page.evaluate(async () => (await fetch('/api/v1/drafts')).json())
  expect(drafts.some((d: { flowKey: string }) => d.flowKey === 'job-application')).toBe(true)

  // Returning later: the assistant offers to continue
  await page.goto('/')
  await page.goto('/assistant?start=1')
  await expect
    .poll(() => lastAssistant(page), { timeout: 15_000 })
    .toContain('You have something unfinished: a job application')
})

test('silence, repeat, help and not understood are handled politely; Enter resumes after a pause', async ({
  page,
  context,
}) => {
  await fakeSpeech(context)
  await page.goto('/assistant')
  await page.getByRole('button', { name: 'Start talking' }).click()
  await nextTurn(page)
  await say(page, '<silence>')
  await expect.poll(() => lastAssistant(page)).toContain("I didn't hear anything")
  await nextTurn(page)
  await say(page, '<silence>')
  await expect.poll(() => lastAssistant(page)).toContain("I'll wait. Press Enter")
  await expect(page.getByRole('status').first()).toHaveText('Paused')
  expect(await listening(page)).toBe(false) // microphone off while paused
  await page.locator('h1').click() // focus outside fields
  await page.keyboard.press('Enter')
  let t = await nextTurn(page)
  expect(t.said).toContain('What can I help you with today')
  await say(page, 'repeat that')
  t = await nextTurn(page)
  expect(t.said).toContain('What can I help you with today')
  await say(page, 'banana')
  await expect(page.getByRole('log')).toContainText('Sorry, I did not understand “banana”')
  t = await nextTurn(page)
  await say(page, 'what can you do')
  await expect(page.getByRole('log')).toContainText('At any time you can say repeat')
})

test('Deaf or non-speaking: the same conversation by typing and suggestions, with no sound and no microphone', async ({
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
  await page.goto('/assistant')
  await page.getByRole('button', { name: 'Start talking' }).click()
  await page.getByRole('button', { name: 'Spoken replies' }).click()
  await expect(page.getByRole('log')).toHaveAttribute('aria-live', 'polite') // text replies are announced
  await expect(page.getByRole('button', { name: 'Microphone' })).toHaveCount(0)
  await page
    .getByRole('group', { name: 'Suggested answers' })
    .getByRole('button', { name: 'Find a job' })
    .click()
  await expect(page.getByRole('log')).toContainText('What kind of job are you looking for?')
  await page.getByLabel('Or type your answer').fill('any job')
  await page.getByLabel('Or type your answer').press('Enter')
  await expect(page.getByRole('log')).toContainText(/I found (one|\d+) open jobs?/)
  await page
    .getByRole('group', { name: 'Suggested answers' })
    .getByRole('button', { name: 'Tell me more' })
    .click()
  await expect(page.getByRole('log')).toContainText(
    /This employer offers|not listed workplace support/,
  )
})

test('Amharic: understood, answered and listened to in Amharic', async ({ page, context }) => {
  await fakeSpeech(context)
  await page.goto('/')
  await page.getByRole('button', { name: 'አማርኛ' }).click()
  await page
    .getByRole('button', { name: /ከACCESSFLOW ጋር ይነጋገሩ/ })
    .first()
    .click()
  await nextTurn(page)
  expect(await page.evaluate(() => (window as unknown as { __recLang: string }).__recLang)).toBe(
    'am-ET',
  )
  await say(page, 'ሥራ መፈለግ እፈልጋለሁ')
  await expect(page.locator('[role="log"]')).toContainText('ምን ዓይነት ሥራ እየፈለጉ ነው?')
})

test('signed-in user: ask for private support and hear application status by voice', async ({
  page,
  context,
}) => {
  test.setTimeout(90_000)
  await fakeSpeech(context)
  await register(page, uniqueEmail(), 'Support Tester')
  await page.goto('/assistant?start=1')
  const rules: [RegExp, string][] = [
    [/What can I help you with today/, 'I need support'],
    [/The choices are/, 'one'],
    [/Tell us what would help/, 'Please send interview questions in writing.'],
    [/send this support request/, 'yes'],
    [/anything else/, 'my applications'],
  ]
  let support = false
  for (let turn = 0; turn < 20; turn++) {
    const { said } = await nextTurn(page)
    if (/haven't applied/.test(said)) break
    if (/anything else/.test(said) && support) {
      await say(page, 'my applications')
      await expect(page.getByRole('log')).toContainText("You haven't applied for any jobs yet")
      break
    }
    if (/support request now/.test(said)) support = true
    const rule = rules.find(([re]) => re.test(said))
    expect(rule, `no scripted answer for: ${said}`).toBeTruthy()
    await say(page, rule![1])
  }
  await expect(page.locator('[role="log"]')).toContainText('Only support staff can see it')
  const requests = await page.evaluate(async () => (await fetch('/api/v1/support-requests')).json())
  expect(requests).toHaveLength(1)
})
