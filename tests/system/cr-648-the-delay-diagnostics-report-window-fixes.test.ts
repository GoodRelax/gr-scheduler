// CR-648 on the shipped build: the wheel over the report (T-023, U-66), a jump from a maximised report (SJ-3), the text steps (SV-16).

import { expect, test, type Browser, type Page } from '@playwright/test'
import { bare, specTable } from '../contract/spec-table'
import { CLEARING_UP_MS, launchReferenceBrowser, readSettledDrawnSvg } from './live-app'
import { ERP_SAMPLE, openDocument, openStage, settle, type Stage } from './cr-570-tree-state-stage'
import { rowOf } from './sws-case'

const T_103 = specTable('T-103')
const REPORT = `[data-role="${bare(rowOf(T_103, 'U-66').cells[0] ?? '')}"]`
const DIAGNOSE = rowOf(specTable('T-109'), 'IC-107').id
const MAXIMISE = rowOf(specTable('T-109'), 'IC-130').id
const TEXT_SIZE = rowOf(specTable('T-109'), 'IC-127').id
const NAME_CELL = `${REPORT} td[data-search-task]`
const STEPS = specTable('T-333').rows.map((one) => Number(bare(one.by['値'] ?? '').replace(/\D+$/, '')))

let browser: Browser | null = null

test.beforeAll(async () => {
  browser = await launchReferenceBrowser()
})

test.afterAll(async () => {
  test.setTimeout(CLEARING_UP_MS)
  await browser?.close()
})

/** @purity non-pure */
async function openedWithReport(): Promise<Stage> {
  if (browser === null) throw new Error('no browser')
  const stage = await openStage(browser)
  await openDocument(stage.page, 'sample-large-erp-program.ja.xml', ERP_SAMPLE)
  await press(stage.page, `[data-icon="${DIAGNOSE}"]`)
  await expect(stage.page.locator(REPORT)).toHaveCount(1)
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
async function reportBox(page: Page): Promise<{ readonly width: number; readonly height: number }> {
  const box = await page.locator(REPORT).first().boundingBox()
  return { width: box?.width ?? 0, height: box?.height ?? 0 }
}

/** @purity non-pure */
async function fontSizes(page: Page): Promise<{ readonly heading: string; readonly table: string }> {
  return page.evaluate((report: string) => {
    const window = document.querySelector(report)
    const heading = window?.firstElementChild?.firstElementChild
    const table = window?.querySelector('table')
    return {
      heading: heading === null || heading === undefined ? '' : getComputedStyle(heading).fontSize,
      table: table === null || table === undefined ? '' : getComputedStyle(table).fontSize,
    }
  }, REPORT)
}

test.describe('CR-648 -- the report window fixes on the shipped build', () => {
  test.setTimeout(120_000)

  test('T-023 / SV-15 / U-66: the wheel over the report scrolls its table and leaves the schedule still', async () => {
    const stage = await openedWithReport()
    try {
      const page = stage.page
      const tableBox = await page.locator(`${REPORT} table`).first().boundingBox()
      expect(tableBox, 'premise: the report shows its table').not.toBeNull()
      if (tableBox === null) return
      const before = await readSettledDrawnSvg(page)
      await page.mouse.move(tableBox.x + 40, tableBox.y + 60)
      await page.mouse.wheel(0, 300)
      await settle(page)
      const scrolled = await page.evaluate((report: string) => document.querySelector(report)?.lastElementChild?.scrollTop ?? -1, REPORT)
      expect(scrolled, 'T-023: the wheel goes to the report table as its scroll').toBeGreaterThan(0)
      expect(await readSettledDrawnSvg(page), 'T-023 MUST NOT: the schedule behind the report does not move').toBe(before)
    } finally {
      await stage.close()
    }
  })

  test('SJ-3 / FR-134: a jump from a maximised report puts the window back to normal first', async () => {
    const stage = await openedWithReport()
    try {
      const page = stage.page
      const normal = await reportBox(page)
      await press(page, `${REPORT} [data-icon="${MAXIMISE}"]`)
      const maximised = await reportBox(page)
      expect(maximised.width, 'premise: IC-130 widened the window').toBeGreaterThan(normal.width)
      await press(page, NAME_CELL)
      const after = await reportBox(page)
      expect(after, 'SJ-3: the window is back at its normal size after the jump').toEqual(normal)
    } finally {
      await stage.close()
    }
  })

  test('SV-16 / S-429 / IC-127: the heading and the table start at the first step and follow every step', async () => {
    const stage = await openedWithReport()
    try {
      const page = stage.page
      expect(await fontSizes(page), 'S-429: the first step of T-333').toEqual({ heading: `${STEPS[0]}px`, table: `${STEPS[0]}px` })
      await press(page, `${REPORT} [data-icon="${TEXT_SIZE}"]`)
      expect(await fontSizes(page), 'SV-16: the heading follows IC-127 too').toEqual({ heading: `${STEPS[1]}px`, table: `${STEPS[1]}px` })
    } finally {
      await stage.close()
    }
  })
})
