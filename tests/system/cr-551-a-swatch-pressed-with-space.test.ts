// CR-551 FT-1: a color swatch pressed with Space settles with no further pointer input, swept live.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { expect, test, type Browser } from '@playwright/test'
import { bare, specTable, unbroken } from '../contract/spec-table'
import { CLEARING_UP_MS, DRAWN_SVG, launchReferenceBrowser, readSettledDrawnSvg, screenOf, taskBodyPoint } from './live-app'
import { rowOf } from './sws-case'

const DESIGN = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '05-07-design.md'), 'utf8'))

const FT_1_INPUT = '人の入力（ポインタとキー）'

const WORDS = JSON.parse(readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'display-words.json'), 'utf8')) as {
  colorNames: { spelling: string; text: { ja: string; en: string } }[]
}

// see T-294
const T_294 = specTable('T-294')
const edgeLightOf = (spelling: string): string => {
  const row = T_294.rows.find((one) => bare(one.cells[1] ?? '') === spelling)
  return (/#[0-9a-f]{6}/i.exec(row?.by['明るいテーマの縁'] ?? '')?.[0] ?? '').toLowerCase()
}

// see U-25
const PROPERTIES_PANEL = `[data-role="${bare(specTable('T-103').rows.find((one) => one.id === 'U-25')?.by['確定名（英）'] ?? '')}"]`
// see T-016
const LINE_ROW = specTable('T-016').rows.find(
  (row) => bare(row.by['対象'] ?? '') === 'Task' && (row.by['列（`GRS JSON`）'] ?? '').includes('`strokeColor`'),
)?.id ?? ''

// see MC-6
const SCREEN = screenOf(rowOf(specTable('T-025'), 'MC-6'))

// WHY: the color lands in the frames the page asks for by itself; this is how long the case lets them run.
const SETTLE_MS = 1_500

let browser: Browser | null = null

test.beforeAll(async () => {
  browser = await launchReferenceBrowser()
})

test.afterAll(async () => {
  test.setTimeout(CLEARING_UP_MS)
  await browser?.close()
})

test('FT-1 still says: 人の入力（ポインタとキー）', () => {
  expect(DESIGN).toContain(FT_1_INPUT)
  expect(LINE_ROW).not.toBe('')
})

test('FT-1: Space on a focused swatch shows its color in the field and on the schedule, and undo is enabled, with no pointer movement', async ({
  baseURL,
}) => {
  // see FT-1, CV-6, CV-9, SK-6
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
    await page.waitForSelector(`${PROPERTIES_PANEL} [data-field-row="${LINE_ROW}"]`)
    const undoBefore = await page.getAttribute('[data-icon="IC-5"]', 'data-enabled')
    const swatch = page
      .locator(`${PROPERTIES_PANEL} [data-field-row="${LINE_ROW}"][data-color-choice]:not([aria-pressed="true"])`)
      .filter({ hasNot: page.locator('[data-color-choice="transparent"]') })
      .first()
    const name = (await swatch.getAttribute('data-color-choice')) ?? ''
    expect(name, 'premise: the line color field offers a name to choose').not.toBe('')
    await swatch.focus()
    await page.keyboard.press('Space')
    await page.waitForTimeout(SETTLE_MS)
    // WHY: CV-9 (CR-689) shows the value by outlining its swatch, named by its tooltip; no sides line remains.
    const words = WORDS.colorNames.find((one) => one.spelling === name)?.text
    const chosen = page.locator(`${PROPERTIES_PANEL} [data-field-row="${LINE_ROW}"][data-color-chosen="true"]`)
    await expect(chosen, 'CV-9: one swatch is outlined as the value').toHaveCount(1)
    expect(await chosen.getAttribute('data-color-choice'), 'CV-9: the outlined swatch is the pressed name').toBe(name)
    const tip = (await chosen.getAttribute('title')) ?? ''
    expect([words?.ja, words?.en], `the chosen swatch tooltip: ${tip}`).toContain(tip)
    const stroke = await page.evaluate(
      ({ selector, uid }: { selector: string; uid: string }) =>
        document.querySelector(`${selector} [data-figure="task-${uid}-plan"]`)?.getAttribute('stroke') ?? '',
      { selector: DRAWN_SVG, uid: target.uid },
    )
    expect(stroke.toLowerCase(), 'CV-6: the schedule draws the edge value of the chosen name').toBe(edgeLightOf(name))
    expect(undoBefore, 'premise: nothing to undo before the press').not.toBe('true')
    expect(await page.getAttribute('[data-icon="IC-5"]', 'data-enabled')).toBe('true')
  } finally {
    await context.close()
  }
})
