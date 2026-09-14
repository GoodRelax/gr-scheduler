// Playwright globalSetup: warms the dev server before any test's clock starts (DFC-604).
import type { FullConfig } from '@playwright/test'
import { launchReferenceBrowser, readSettledDrawnSvg } from './live-app'

const WARM_UP_TIMEOUT_MS = 180_000

// WHY: origin is read back from config.webServer.url instead of recomputed,
// so this file cannot drift from the port playwright.config.ts derived.
/** @purity non-pure */
export default async function globalSetup(config: FullConfig): Promise<void> {
  const origin = config.webServer?.url
  if (typeof origin !== 'string') {
    throw new Error('playwright.config.ts declares no webServer.url for globalSetup to warm')
  }

  const startedAt = Date.now()
  const probeStartedAt = Date.now()
  const probe = await fetch(origin)
  await probe.text()
  console.log(
    `[global-warm-dev-server] first fetch of ${origin} answered ${String(probe.status)} in ` +
      `${String(Date.now() - probeStartedAt)}ms`,
  )

  const browser = await launchReferenceBrowser()
  try {
    const page = await browser.newPage({ baseURL: origin })
    await page.goto('/', { timeout: WARM_UP_TIMEOUT_MS })
    await readSettledDrawnSvg(page)
  } finally {
    await browser.close()
  }

  console.log(`[global-warm-dev-server] warmed the dev server in ${String(Date.now() - startedAt)}ms`)
}
