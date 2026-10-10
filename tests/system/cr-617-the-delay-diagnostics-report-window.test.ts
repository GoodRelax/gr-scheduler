// CR-617 on the shipped build: IC-107 opens the Delay Diagnostics Report window (RW-1), IC-52 and Esc close it alone.

import { expect, test, type Browser, type Page } from '@playwright/test'
import { bare, specTable } from '../contract/spec-table'
import { CLEARING_UP_MS, launchReferenceBrowser } from './live-app'
import { ERP_SAMPLE, keyOf, openDocument, openStage, settle, type Stage } from './cr-570-tree-state-stage'
import { rowOf } from './sws-case'

const T_103 = specTable('T-103')
const REPORT = `[data-role="${bare(rowOf(T_103, 'U-66').cells[0] ?? '')}"]`
const SEARCH_PANEL = `[data-role="${bare(rowOf(T_103, 'U-64').cells[0] ?? '')}"]`
const DIAGNOSE = rowOf(specTable('T-109'), 'IC-107').id
const CLOSE = rowOf(specTable('T-109'), 'IC-52').id
const EXPORT = rowOf(specTable('T-109'), 'IC-140').id
const COPY = rowOf(specTable('T-109'), 'IC-108').id
const OPEN_SEARCH = keyOf('SK-24')

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
async function press(page: Page, selector: string): Promise<void> {
  const box = await page.locator(selector).first().boundingBox()
  expect(box, `${selector} is on the screen`).not.toBeNull()
  if (box === null) return
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.up()
  await settle(page)
}

/** @purity non-pure */
async function isDiagnosisShown(page: Page): Promise<boolean> {
  return (await page.locator(`[data-icon="${DIAGNOSE}"]`).first().getAttribute('data-pressed')) === 'true'
}

test.describe('CR-617 -- the report window on the shipped build', () => {
  test.setTimeout(120_000)

  test('RW-1 / RW-2 / RW-3: IC-107 opens the window with its title row and IC-140, IC-108 under it', async () => {
    const stage = await opened()
    try {
      const page = stage.page
      await expect(page.locator(REPORT)).toHaveCount(0)
      await press(page, `[data-icon="${DIAGNOSE}"]`)
      await expect(page.locator(REPORT)).toHaveCount(1)
      await expect(page.locator(`${REPORT} [data-icon="${EXPORT}"]`)).toHaveCount(1)
      await expect(page.locator(`${REPORT} [data-icon="${COPY}"]`)).toHaveCount(1)
      await expect(page.locator(`${REPORT} thead th`)).toHaveCount(specTable('T-347').rows.length)
    } finally {
      await stage.close()
    }
  })

  test('RW-1: IC-52 closes the window alone, and the diagnosis stays shown', async () => {
    const stage = await opened()
    try {
      const page = stage.page
      await press(page, `[data-icon="${DIAGNOSE}"]`)
      expect(await isDiagnosisShown(page), 'IC-107 stands pressed while the diagnosis is shown').toBe(true)
      await press(page, `${REPORT} [data-icon="${CLOSE}"]`)
      await expect(page.locator(REPORT)).toHaveCount(0)
      expect(await isDiagnosisShown(page), 'the diagnosis is still shown').toBe(true)
    } finally {
      await stage.close()
    }
  })

  test('RG-16 / RW-5: Esc closes the window in front -- the search panel opened later goes first', async () => {
    const stage = await opened()
    try {
      const page = stage.page
      await press(page, `[data-icon="${DIAGNOSE}"]`)
      await page.keyboard.press(OPEN_SEARCH)
      await settle(page)
      await expect(page.locator(SEARCH_PANEL)).toHaveCount(1)
      await page.mouse.click(5, 5)
      await page.keyboard.press('Escape')
      await settle(page)
      await expect(page.locator(SEARCH_PANEL)).toHaveCount(0)
      await expect(page.locator(REPORT)).toHaveCount(1)
      await page.keyboard.press('Escape')
      await settle(page)
      await expect(page.locator(REPORT)).toHaveCount(0)
    } finally {
      await stage.close()
    }
  })
})
