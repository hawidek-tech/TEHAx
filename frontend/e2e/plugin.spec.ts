import { expect, test, type FrameLocator, type Page } from '@playwright/test'
import { PASSWORD, uniqueEmail } from './helpers'

/** One-script <db-signup> module on a blank page and inside the official Savanna static starter. */
const BLANK = 'http://localhost:5520/blank.html'
const SAVANNA = 'http://localhost:5510/pages'

const nextIn = (f: FrameLocator) =>
  f.getByRole('button', { name: /^(Next|Check my answers)$/ }).click()

/** Click Next until the given question (h2) is shown - robust against the frame resizing between steps. */
async function advanceTo(f: FrameLocator, heading: RegExp) {
  for (let i = 0; i < 12; i++) {
    const h = (await f.getByRole('heading', { level: 2 }).first().textContent()) ?? ''
    if (heading.test(h)) return
    const before =
      (await f
        .getByText(/^Question \d+ of \d+$/)
        .first()
        .textContent()
        .catch(() => '')) ?? ''
    await nextIn(f)
    await expect(f.getByText(/^(Question \d+ of \d+|Check your answers)$/).first()).not.toHaveText(
      before,
    )
  }
  throw new Error(`Question not reached: ${heading}`)
}

/** Registration in the frame: 4 questions (email through the "Use email instead" link). */
async function registerIn(f: FrameLocator, email: string) {
  await f.getByLabel('What should we call you?').fill('Plugin Learner')
  await nextIn(f)
  await f.getByRole('button', { name: 'Use email instead of a phone number' }).click()
  await f.getByLabel('What is your email address?').fill(email)
  await nextIn(f)
  await f.getByLabel('Create a password').fill(PASSWORD)
  await nextIn(f)
  await f.getByLabel(/I have read how ACCESSFLOW/).check()
  await nextIn(f)
  await f.getByRole('button', { name: 'Create account' }).click()
  // Names come from the account name ("Plugin Learner"): the first profile question is the region
  await expect(f.getByLabel('Which region do you live in?')).toBeVisible()
}

/** Short sign-up profile in the frame, then the optional private support question (emits db-signup:support). */
async function profileIn(f: FrameLocator) {
  await f.getByLabel('Which region do you live in?').selectOption({ label: 'Addis Ababa' })
  await nextIn(f)
  await f.getByLabel('What kind of work are you looking for?').fill('Data entry')
  await nextIn(f)
  await nextIn(f) // skills (optional)
  await f.getByRole('button', { name: 'Continue', exact: true }).click()
  await f.getByLabel('Yes, please').check()
  await nextIn(f)
  await f.getByLabel('Technology', { exact: false }).first().check()
  await nextIn(f)
  await f.getByLabel('Tell us what would help you').fill('Screen reader setup help.')
  await nextIn(f)
  await f.getByLabel('Message in ACCESSFLOW').check()
  await advanceTo(f, /^Check your answers$/)
  await f.getByRole('button', { name: 'Save my profile' }).click()
}

async function events(page: Page) {
  return (await page.locator('#events').textContent()) ?? ''
}

test('blank page: one script installs <db-signup>; isolated, no globals, events without personal data', async ({
  page,
}) => {
  await page.addInitScript(() => {
    ;(window as unknown as { __keysBefore: string[] }).__keysBefore = Object.keys(window)
  })
  await page.goto(BLANK)
  const hostButtonBorder = await page
    .locator('#host-button')
    .evaluate((el) => getComputedStyle(el).borderStyle)
  const hostTitleColor = await page
    .locator('#host-title')
    .evaluate((el) => getComputedStyle(el).color)

  const frame = page.frameLocator('iframe[title="ACCESSFLOW: create your account"]')
  // lang="am" is honoured
  await expect(frame.getByRole('heading', { level: 1 })).toHaveText('መለያዎን ይፍጠሩ')
  await expect(page.locator('#events')).toContainText('db-signup:ready')

  // Host styles unchanged; host styles do not reach the module
  expect(
    await page.locator('#host-button').evaluate((el) => getComputedStyle(el).borderStyle),
  ).toBe(hostButtonBorder)
  expect(await page.locator('#host-title').evaluate((el) => getComputedStyle(el).color)).toBe(
    hostTitleColor,
  )
  expect(await page.evaluate(() => document.body.getAttribute('style'))).toBeNull()
  // No question about how the person uses it: the form starts at once (voice guide switch in the frame header)
  await frame.getByRole('combobox').first().selectOption('en')
  await expect(frame.getByRole('button', { name: 'Voice guide' })).toBeVisible()
  const moduleInputBorder = await frame
    .locator('input')
    .first()
    .evaluate((el) => getComputedStyle(el).borderStyle)
  expect(moduleInputBorder).not.toBe('dashed')

  // No new global variables from the module
  const newGlobals = await page.evaluate(() => {
    const before = new Set((window as unknown as { __keysBefore: string[] }).__keysBefore)
    return Object.keys(window).filter(
      (k) => !before.has(k) && !/^\d+$/.test(k) && k !== '__keysBefore',
    )
  })
  expect(newGlobals).toEqual([])
  expect(await page.evaluate(() => customElements.get('db-signup') !== undefined)).toBe(true)

  // Register; step / support / done events arrive, without personal data
  const email = uniqueEmail()
  await registerIn(frame, email)
  await expect(page.locator('#events')).toContainText('db-signup:step')
  await profileIn(frame)
  await expect(page.locator('#events')).toContainText('db-signup:support')
  await expect(page.locator('#events')).toContainText('db-signup:done')
  const log = await events(page)
  expect(log).not.toContain(email)
  expect(log).not.toContain('Plugin')
  expect(log).not.toContain('Screen reader setup')
})

test('blank page: module first load (compressed bytes on the wire) is below 500 KB', async ({
  page,
}) => {
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Network.enable')
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true })
  const urls = new Map<string, string>()
  let moduleBytes = 0
  cdp.on('Network.responseReceived', (e: { requestId: string; response: { url: string } }) =>
    urls.set(e.requestId, e.response.url),
  )
  cdp.on('Network.loadingFinished', (e: { requestId: string; encodedDataLength: number }) => {
    if (urls.get(e.requestId)?.startsWith('http://localhost:8081/'))
      moduleBytes += e.encodedDataLength
  })
  await page.goto(BLANK)
  await expect(page.frameLocator('iframe').first().getByRole('heading', { level: 1 })).toBeVisible()
  await page.waitForLoadState('networkidle')
  const kb = Math.round(moduleBytes / 1024)
  console.log(
    `module first load (Amharic, incl. Ethiopic font if not installed): ${kb} KB transferred`,
  )
  test.info().annotations.push({ type: 'size', description: `${kb} KB` })
  expect(moduleBytes).toBeLessThan(500 * 1024)
})

test('Savanna starter: sign up, edit profile on another page (same session), apply through the career gateway', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto(`${SAVANNA}/signup.html`)
  const signup = page.frameLocator('iframe[title="ACCESSFLOW: create your account"]')
  await expect(signup.getByText('with Savanna static pages (local demo copy)')).toBeVisible()
  await registerIn(signup, uniqueEmail())
  await profileIn(signup)
  await expect(page.locator('#events')).toContainText('db-signup:done')
  // Host Bootstrap still works
  expect(
    await page.evaluate(() => typeof (window as unknown as { bootstrap?: unknown }).bootstrap),
  ).toBe('object')

  // Navigate with the Savanna sidebar: profile editing, still signed in (token kept per tab inside the frame)
  await page.getByRole('link', { name: 'My profile' }).click()
  const profile = page.frameLocator('iframe[title="ACCESSFLOW: edit your profile"]')
  await expect(profile.getByText(/Signed in as Plugin Learner/)).toBeVisible()
  await expect(profile.getByLabel('What is your first name?')).toHaveValue('Plugin')
  for (let i = 0; i < 5; i++) await nextIn(profile)
  await profile.getByLabel('Which city or town do you live in?').fill('Hawassa')
  await profile.getByRole('button', { name: /^(Next|Check my answers)$/ }).click()
  for (let i = 0; i < 6; i++) {
    if (await profile.getByRole('button', { name: 'Save', exact: true }).isVisible()) break
    await nextIn(profile)
  }
  await profile.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(profile.getByText('Your profile was saved.')).toBeVisible()

  // Career gateway: same form engine
  await page.getByRole('link', { name: 'Career gateway' }).click()
  const jobs = page.frameLocator('iframe[title="ACCESSFLOW: find and apply for jobs"]')
  await jobs.getByRole('button', { name: /Junior Web Developer/ }).click()
  await jobs.getByRole('button', { name: 'Apply for this job' }).click()
  // Contact details are known from the account: not asked again
  await jobs.getByLabel('Why do you want this job?').fill('I build accessible websites.')
  await nextIn(jobs)
  await jobs
    .getByLabel('What experience do you have for this job?')
    .fill('Two years of HTML and CSS.')
  await nextIn(jobs)
  await jobs.getByLabel('Now').check()
  for (let i = 0; i < 4; i++) await nextIn(jobs)
  await jobs.getByLabel(/I have checked my answers/).check()
  await jobs.getByRole('button', { name: 'Send my application' }).click()
  await expect(jobs.getByText('Your application was sent.')).toBeVisible()
  await expect(page.locator('#events')).toContainText(/db-signup:done .*AF-/)
  expect(errors).toEqual([])
})

test('unregistered host origin cannot frame the keyless module', async ({ page }) => {
  // The demo partner site origin :5599 is not registered for any integration.
  const { spawn } = await import('node:child_process')
  const server = spawn('python3', ['-m', 'http.server', '5599', '-d', '../demo'], {
    stdio: 'ignore',
  })
  try {
    await new Promise((r) => setTimeout(r, 800))
    await page.goto('http://localhost:5599/blank.html')
    await page.waitForTimeout(2000)
    await expect(
      page.frameLocator('iframe').first().getByRole('heading', { level: 1 }),
    ).toHaveCount(0)
  } finally {
    server.kill()
  }
})
