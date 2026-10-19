import { expect, test, type Browser, type Page } from '@playwright/test'
import { bare, specTable } from '../contract/spec-table'
import { CLEARING_UP_MS, launchReferenceBrowser } from './live-app'
import { ERP_SAMPLE, openDocument, openStage, settle, type Stage } from './cr-570-tree-state-stage'
import { rowOf } from './sws-case'

const REPORT = `[data-role="${bare(rowOf(specTable('T-103'), 'U-66').cells[0] ?? '')}"]`
const DIAGNOSE = rowOf(specTable('T-109'), 'IC-107').id

type WindowName = 'delayDiagnosticsReport' | 'propertiesPanel'
interface Outcome {
  readonly ok: boolean
  readonly refusal?: { readonly reason: string }
}

let browser: Browser | null = null

test.beforeAll(async () => {
  browser = await launchReferenceBrowser()
})

test.afterAll(async () => {
  test.setTimeout(CLEARING_UP_MS)
  await browser?.close()
})

/** @purity non-pure */
async function opened(): Promise<Stage> {
  if (browser === null) throw new Error('no browser')
  const stage = await openStage(browser)
  await openDocument(stage.page, 'sample-large-erp-program.ja.xml', ERP_SAMPLE)
  return stage
}

/** @purity non-pure */
async function runDiagnostics(page: Page): Promise<Outcome> {
  const outcome = await page.evaluate(() => {
    const api = (window as unknown as { grSchedulerAgentApi: { runDelayDiagnostics(): unknown } }).grSchedulerAgentApi
    return api.runDelayDiagnostics()
  })
  await settle(page)
  return outcome as Outcome
}

/** @purity non-pure */
async function closeWindow(page: Page, which: WindowName): Promise<Outcome> {
  const outcome = await page.evaluate((name) => {
    const api = (window as unknown as { grSchedulerAgentApi: { closeWindow(which: string): unknown } }).grSchedulerAgentApi
    return api.closeWindow(name)
  }, which)
  await settle(page)
  return outcome as Outcome
}

/** @purity non-pure */
async function isDiagnosePressed(page: Page): Promise<boolean> {
  return (await page.locator(`[data-icon="${DIAGNOSE}"]`).first().getAttribute('data-pressed')) === 'true'
}

test.describe('CR-803 -- the Agent API runs and closes the report window on the shipped build', () => {
  test.setTimeout(120_000)

  test('AM-31: runDelayDiagnostics opens the report window as IC-107 does, and IC-107 stands pressed', async () => {
    const stage = await opened()
    try {
      const page = stage.page
      await expect(page.locator(REPORT)).toHaveCount(0)
      expect(await isDiagnosePressed(page)).toBe(false)

      const outcome = await runDiagnostics(page)

      expect(outcome.ok).toBe(true)
      await expect(page.locator(REPORT)).toHaveCount(1)
      expect(await isDiagnosePressed(page), 'IC-107 stands pressed while the window is open').toBe(true)
    } finally {
      await stage.close()
    }
  })

  test('AM-31: with the window open a second call runs the diagnosis again and keeps it open', async () => {
    const stage = await opened()
    try {
      const page = stage.page
      await runDiagnostics(page)

      const outcome = await runDiagnostics(page)

      expect(outcome.ok).toBe(true)
      await expect(page.locator(REPORT)).toHaveCount(1)
      expect(await isDiagnosePressed(page)).toBe(true)
    } finally {
      await stage.close()
    }
  })

  test('AM-33: closeWindow delayDiagnosticsReport closes the window alone and IC-107 is no longer pressed', async () => {
    const stage = await opened()
    try {
      const page = stage.page
      await runDiagnostics(page)
      await expect(page.locator(REPORT)).toHaveCount(1)

      const outcome = await closeWindow(page, 'delayDiagnosticsReport')

      expect(outcome.ok).toBe(true)
      await expect(page.locator(REPORT)).toHaveCount(0)
      expect(await isDiagnosePressed(page), 'IC-107 is not pressed once the window is closed').toBe(false)
    } finally {
      await stage.close()
    }
  })

  test('AM-33: closing a window that is already closed answers ok and changes nothing', async () => {
    const stage = await opened()
    try {
      const page = stage.page

      const report = await closeWindow(page, 'delayDiagnosticsReport')
      const panel = await closeWindow(page, 'propertiesPanel')

      expect(report.ok).toBe(true)
      expect(panel.ok).toBe(true)
      await expect(page.locator(REPORT)).toHaveCount(0)
    } finally {
      await stage.close()
    }
  })

  test('AM-33: a name that is neither window is refused malformedRequest', async () => {
    const stage = await opened()
    try {
      const page = stage.page

      const outcome = await closeWindow(page, 'searchPanel' as WindowName)

      expect(outcome.ok).toBe(false)
      expect(outcome.refusal?.reason).toBe('malformedRequest')
    } finally {
      await stage.close()
    }
  })
})
