import { expect, test } from '@playwright/test'
import { spawn, type ChildProcess } from 'node:child_process'
import { PASSWORD, uniqueEmail } from './helpers'

/**
 * Embedding from a SEPARATE origin (the demo partner site on :5500). The frame authenticates with an
 * in-memory token, so it works with no cookies at all (as when third-party cookies are blocked).
 */
const servers: ChildProcess[] = []
const base = process.env.E2E_BASE_URL ?? 'http://localhost:8081'

test.beforeAll(async () => {
  for (const port of [5500, 5599]) {
    const p = spawn('node', ['../demo-partner-site/serve.mjs', String(port), base], {
      stdio: 'ignore',
    })
    servers.push(p)
  }
  await new Promise((r) => setTimeout(r, 800))
})
test.afterAll(() => servers.forEach((s) => s.kill()))

test('registered partner origin: sign up inside the frame without any cookies', async ({
  page,
  context,
}) => {
  // Block ALL cookies for the ACCESSFLOW origin, simulating strict third-party cookie blocking.
  await context.route(`${base}/**`, async (route) => {
    const headers = { ...route.request().headers() }
    delete headers['cookie']
    const response = await route.fetch({ headers })
    const respHeaders = { ...response.headers() }
    delete respHeaders['set-cookie']
    await route.fulfill({ response, headers: respHeaders })
  })
  await page.goto('http://localhost:5500/')
  await expect(
    page.getByRole('heading', { level: 1, name: 'Start your career journey' }),
  ).toBeVisible()
  const frame = page.frameLocator('iframe[title="ACCESSFLOW: create your account"]')
  await expect(frame.getByRole('heading', { level: 1, name: 'Create your account' })).toBeVisible()
  await expect(frame.getByText('with Demo Learning Platform')).toBeVisible()

  await frame.getByLabel('What should we call you?').fill('Embedded Learner')
  await frame.getByRole('button', { name: 'Next' }).click()
  await frame.getByLabel('With my email address').check()
  await frame.getByRole('button', { name: 'Next' }).click()
  await frame.getByLabel('What is your email address?').fill(uniqueEmail())
  await frame.getByRole('button', { name: 'Next' }).click()
  await frame.getByLabel('Create a password').fill(PASSWORD)
  await frame.getByRole('button', { name: 'Next' }).click()
  await frame.getByLabel(/I have read how ACCESSFLOW/).check()
  await frame.getByRole('button', { name: 'Check my answers' }).click()
  await frame.getByRole('button', { name: 'Create account' }).click()
  // Signed in via bearer token: the profile flow (an authenticated endpoint) loads inside the frame.
  await expect(frame.getByLabel('What is your first name?')).toBeVisible()
  // The host page received only an opaque "ready" event.
  await expect(page.locator('#events')).toContainText('accessflow:ready')
  // A full-page fallback is always offered.
  await expect(frame.getByRole('link', { name: /Open ACCESSFLOW in a new tab/ })).toBeVisible()
})

test('unregistered origin: the browser refuses to render the frame (frame-ancestors) and the fallback link remains', async ({
  page,
}) => {
  const blocked: string[] = []
  page.on('console', (m) => m.text().includes('frame-ancestors') && blocked.push(m.text()))
  await page.goto('http://localhost:5599/')
  const iframe = page.locator('iframe[title="ACCESSFLOW: create your account"]')
  await expect(iframe).toHaveCount(1)
  await page.waitForTimeout(2000)
  const frame = page.frameLocator('iframe[title="ACCESSFLOW: create your account"]')
  await expect(frame.getByRole('heading', { name: 'Create your account' })).toHaveCount(0)
  await expect(
    page.getByRole('link', { name: 'Having trouble? Open ACCESSFLOW in a new tab' }).first(),
  ).toBeVisible()
  expect(blocked.length).toBeGreaterThan(0)
})
