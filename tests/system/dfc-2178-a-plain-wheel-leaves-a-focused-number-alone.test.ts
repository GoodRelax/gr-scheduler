// DFC-2178 (MH-4, MK-1): a plain wheel over a focused number field leaves its number and focus alone and scrolls the panel, swept live.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { expect, test, type Browser, type Page } from '@playwright/test'
import { bare, specTable, unbroken } from '../contract/spec-table'
import { CLEARING_UP_MS, launchReferenceBrowser, readSettledDrawnSvg, screenOf, taskBodyPoint } from './live-app'
import { rowOf } from './sws-case'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

const MH_4_KEEP_TEXT = '⛔ 編集している入力の字と焦点を動かしてはならない（MUST NOT）'
const MK_1_SCROLL = '| MK-1 | ホイール（修飾なし） | **縦スクロール**（ズームではない） |'

const roleOf = (id: string): string =>
  `[data-role="${bare(specTable('T-103').rows.find((one) => one.id === id)?.by['確定名（英）'] ?? '')}"]`
const PROPERTIES_PANEL = roleOf('U-25')
const ROW_TITLE_TREE = roleOf('U-23')

const MIN_HEIGHT_NUMBER = `${PROPERTIES_PANEL} [data-field-row="PR-20"] input[type="number"]`
const MIN_HEIGHT_CHECK = `${PROPERTIES_PANEL} [data-field-row="MH-2"] input[type="checkbox"]`
const FIRST_NUMBER = `${PROPERTIES_PANEL} input[type="number"]`

const SCREEN = screenOf(rowOf(specTable('T-025'), 'MC-6'))
// WHY: half the MC-6 height, so a task's fields overflow the panel and a plain wheel has something to scroll.
const SHORT_SCREEN = { width: SCREEN.width, height: Math.round(SCREEN.height / 2) }

// WHY: a number the field does not hold yet, so a step of the host's spin shows as a different number.
const TYPED = '61'
// WHY: three notches each way: the host steps a focused number entry once per notch.
const NOTCHES = 3
const NOTCH_PX = 100
const SETTLE_MS = 600

let browser: Browser | null = null

test.beforeAll(async () => {
  browser = await launchReferenceBrowser()
})

test.afterAll(async () => {
  test.setTimeout(CLEARING_UP_MS)
  await browser?.close()
})

interface Held {
  readonly value: string
  readonly isFocused: boolean
  readonly scrollTop: number
  readonly scrollRoom: number
}

/** @purity semi-pure-b */
async function heldOf(page: Page, selector: string): Promise<Held> {
  return page.evaluate(
    ({ field, panel }: { field: string; panel: string }) => {
      const entry = document.querySelector(field) as HTMLInputElement | null
      const box = document.querySelector(panel)
      return {
        value: entry?.value ?? '',
        isFocused: entry !== null && document.activeElement === entry,
        scrollTop: box?.scrollTop ?? 0,
        scrollRoom: box === null ? 0 : box.scrollHeight - box.clientHeight,
      }
    },
    { field: selector, panel: PROPERTIES_PANEL },
  )
}

/** @purity non-pure */
async function plainWheelOver(page: Page, selector: string, notchPx: number): Promise<void> {
  const box = await page.locator(selector).first().boundingBox()
  expect(box, `premise: ${selector} is drawn`).not.toBeNull()
  if (box === null) return
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  for (let notch = 0; notch < NOTCHES; notch += 1) {
    await page.mouse.wheel(0, notchPx)
    await page.waitForTimeout(SETTLE_MS / NOTCHES)
  }
  await page.waitForTimeout(SETTLE_MS)
}

/** @purity non-pure */
async function openedOn(viewport: { width: number; height: number }, baseURL: string | undefined): Promise<Page> {
  if (baseURL === undefined) throw new Error('playwright.config.ts declares no baseURL for the running application')
  if (browser === null) throw new Error('the reference browser was not opened')
  const context = await browser.newContext({ baseURL, viewport })
  const page = await context.newPage()
  await page.goto('/')
  await readSettledDrawnSvg(page)
  return page
}

test('MH-4 and MK-1 still say what the cases press', () => {
  for (const said of [MH_4_KEEP_TEXT, MK_1_SCROLL]) expect(REQUIREMENTS, said).toContain(unbroken(said))
})

test(`MH-4 「${MH_4_KEEP_TEXT}」: a plain wheel over the min height number being typed`, async ({ baseURL }) => {
  test.setTimeout(180_000)
  const page = await openedOn(SCREEN, baseURL)
  try {
    const row = await page.locator(`${ROW_TITLE_TREE} [data-group-id]`).first().boundingBox()
    expect(row, 'premise: a row title is drawn').not.toBeNull()
    if (row === null) return
    await page.mouse.click(row.x + row.width / 2, row.y + Math.min(row.height / 2, 8))
    await page.locator(MIN_HEIGHT_CHECK).click()
    await page.waitForTimeout(SETTLE_MS)
    await page.locator(MIN_HEIGHT_NUMBER).click()
    await page.keyboard.press('Control+A')
    await page.keyboard.type(TYPED)
    for (const notchPx of [NOTCH_PX, -NOTCH_PX]) {
      await plainWheelOver(page, MIN_HEIGHT_NUMBER, notchPx)
      const held = await heldOf(page, MIN_HEIGHT_NUMBER)
      expect(held.value, `MH-4: ${MH_4_KEEP_TEXT} -- the wheel (${notchPx}) stepped the typed number`).toBe(TYPED)
      expect(held.isFocused, `MH-4: ${MH_4_KEEP_TEXT} -- the wheel (${notchPx}) took the focus`).toBe(true)
    }
  } finally {
    await page.context().close()
  }
})

test(`MK-1 「${MK_1_SCROLL}」: a plain wheel over a focused task number scrolls the panel and keeps the number`, async ({
  baseURL,
}) => {
  test.setTimeout(180_000)
  const page = await openedOn(SHORT_SCREEN, baseURL)
  try {
    const target = await taskBodyPoint(page)
    expect(target, 'premise: a task plan wide enough to double-click is drawn').not.toBeNull()
    if (target === null) return
    await page.mouse.dblclick(target.x, target.y)
    await page.waitForSelector(FIRST_NUMBER)
    await page.locator(FIRST_NUMBER).first().click()
    const before = await heldOf(page, FIRST_NUMBER)
    expect(before.scrollRoom, 'premise: the task fields overflow the panel on the short screen').toBeGreaterThan(0)
    await plainWheelOver(page, FIRST_NUMBER, NOTCH_PX)
    const after = await heldOf(page, FIRST_NUMBER)
    expect(after.value, 'MH-4: a plain wheel stepped the focused number').toBe(before.value)
    expect(after.isFocused, 'MH-4: a plain wheel took the focus').toBe(true)
    expect(after.scrollTop, `MK-1: ${MK_1_SCROLL} -- the panel did not scroll`).toBeGreaterThan(before.scrollTop)
  } finally {
    await page.context().close()
  }
})
