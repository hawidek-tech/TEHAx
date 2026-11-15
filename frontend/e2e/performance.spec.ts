import { expect, test } from '@playwright/test'

/**
 * Low-data / slow-network budget. Emulates Chrome DevTools "Slow 3G" (400 kbps down, 400 ms RTT) and a 4x slower
 * CPU (a low-cost Android phone), on a cold cache, and measures bytes transferred and time until the welcome page is usable.
 */
test('first visit on slow 3G stays within the low-data budget', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Network throttling uses the Chrome DevTools Protocol')
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Network.enable')
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true })
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 400,
    downloadThroughput: (400 * 1024) / 8,
    uploadThroughput: (400 * 1024) / 8,
  })
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })

  let bytes = 0
  cdp.on(
    'Network.loadingFinished',
    (e: { encodedDataLength: number }) => (bytes += e.encodedDataLength),
  )
  const start = Date.now()
  await page.goto('/', { waitUntil: 'commit' })
  await expect(page.getByRole('button', { name: /Activate Audio Accessibility/ })).toBeVisible({
    timeout: 30_000,
  })
  const usableMs = Date.now() - start
  await page.waitForLoadState('networkidle')

  console.log(
    `slow-3G first visit: usable after ${usableMs} ms, ${Math.round(bytes / 1024)} KB transferred`,
  )
  test.info().annotations.push({
    type: 'perf',
    description: `usable=${usableMs}ms transferred=${Math.round(bytes / 1024)}KB`,
  })
  expect(bytes).toBeLessThan(200 * 1024) // whole first visit under 200 KB
  expect(usableMs).toBeLessThan(10_000)
})
