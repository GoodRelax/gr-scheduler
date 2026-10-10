// CR-551 JDG-407 (FT-1): a value chosen in the browser's color picker lands with no further input, swept live.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { expect, test, type Browser } from '@playwright/test'
import { bare, specTable, unbroken } from '../contract/spec-table'
import { CLEARING_UP_MS, DRAWN_SVG, launchReferenceBrowser, readSettledDrawnSvg, screenOf, taskBodyPoint } from './live-app'
import { rowOf } from './sws-case'

const DESIGN = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '05-07-design.md'), 'utf8'))

const FT_1_PICKER = '閲覧環境が開いた選ぶ窓（色の入力の色選び、日付の入力のカレンダー）で選んだ値が届いたことも、その窓を開いた押下の続きに数え、シェル自身が起こす'

// see U-25
const PROPERTIES_PANEL = `[data-role="${bare(specTable('T-103').rows.find((one) => one.id === 'U-25')?.by['確定名（英）'] ?? '')}"]`
// see T-016
const LINE_ROW = specTable('T-016').rows.find(
  (row) => bare(row.by['対象'] ?? '') === 'Task' && (row.by['列（`GRS JSON`）'] ?? '').includes('`strokeColor`'),
)?.id ?? ''

// see MC-6
const SCREEN = screenOf(rowOf(specTable('T-025'), 'MC-6'))

// WHY: a value no palette name draws, so seeing it proves the picker's value landed.
const PICKED = '#12ab34'
// WHY: "a short wait": the frames the page asks for by itself, and no more.
const SETTLE_MS = 1_000

let browser: Browser | null = null

test.beforeAll(async () => {
  browser = await launchReferenceBrowser()
})

test.afterAll(async () => {
  test.setTimeout(CLEARING_UP_MS)
  await browser?.close()
})

test('FT-1 still says: 選ぶ窓 ... で選んだ値が届いたことも、その窓を開いた押下の続きに数え、シェル自身が起こす', () => {
  expect(DESIGN).toContain(FT_1_PICKER)
  expect(LINE_ROW).not.toBe('')
})

test('FT-1 / CV-9: a color chosen in the picker shows on the bar and in the field with no pointer or key input afterwards', async ({
  baseURL,
}) => {
  // see FT-1, CV-9, CV-4, CV-6
  test.setTimeout(180_000)
  if (baseURL === undefined) throw new Error('playwright.config.ts declares no baseURL for the running application')
  if (browser === null) throw new Error('the reference browser was not opened')
  const context = await browser.newContext({ baseURL, viewport: SCREEN })
  const page = await context.newPage()
  try {
    await page.goto('/')
    await readSettledDrawnSvg(page)
    const target = await taskBodyPoint(page)
    expect(target, 'premise: a task plan wide enough to double-click is drawn').not.toBeNull()
    if (target === null) return
    await page.mouse.dblclick(target.x, target.y)
    const field = `${PROPERTIES_PANEL} [data-field-row="${LINE_ROW}"]`
    await page.waitForSelector(field)
    await page.locator(`${field} [data-color-custom-entry]`).first().click()
    const picker = page.locator(`${field} input[type="color"]`).first()
    await picker.waitFor({ state: 'attached' })
    // WHY: what the browser does when its picker window closes: the value is set and input / change fire.
    await picker.evaluate((input: HTMLInputElement, value: string) => {
      input.value = value
      input.dispatchEvent(new Event('input', { bubbles: true }))
      input.dispatchEvent(new Event('change', { bubbles: true }))
    }, PICKED)
    await page.waitForTimeout(SETTLE_MS)
    const stroke = await page.evaluate(
      ({ selector, uid }: { selector: string; uid: string }) =>
        document.querySelector(`${selector} [data-figure="task-${uid}-plan"]`)?.getAttribute('stroke') ?? '',
      { selector: DRAWN_SVG, uid: target.uid },
    )
    expect(stroke.toLowerCase(), 'CV-6: the bar draws the chosen value').toBe(PICKED)
    // WHY: CV-9 (CR-689) has no sides line; the custom entrance names the value in its tooltip and is outlined.
    const custom = page.locator(`${field} [data-color-custom-entry]`).first()
    expect(await custom.getAttribute('title'), 'CV-9: the custom entrance tooltip shows the uppercase hex').toContain(
      PICKED.toUpperCase(),
    )
    expect(await custom.getAttribute('data-color-chosen'), 'CV-9: the custom entrance is the chosen swatch').toBe('true')
  } finally {
    await context.close()
  }
})
