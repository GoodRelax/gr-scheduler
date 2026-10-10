// CR-664 / CR-689 (FR-006, CV-9): the color rows of the properties panel share the other rows' name edge and value edge, swept live.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { expect, test, type Browser, type Page } from '@playwright/test'
import { bare, specTable, unbroken } from '../contract/spec-table'
import { CLEARING_UP_MS, launchReferenceBrowser, readSettledDrawnSvg, screenOf, taskBodyPoint } from './live-app'
import { rowOf } from './sws-case'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

const FR_006_RIGHT_ALIGNED = '⛔ **項目名は値の欄の左に置き、右詰めにすること（MUST）'
const FR_006_SAME_EDGES =
  '⭐ 色の行（入力の型が `色` の行）も同じであり、項目名は色の欄の 1 段目の左に置き、色の欄の 2 つの段は値の欄の左端から始めること（MUST）'
const CV_9_TWO_ROWS = '⭐ 欄は見本の 2 段だけとし、項目名は 1 段目の左に置くこと（MUST）（`FR-006`）'

const roleOf = (id: string): string =>
  `[data-role="${bare(specTable('T-103').rows.find((one) => one.id === id)?.by['確定名（英）'] ?? '')}"]`
const PROPERTIES_PANEL = roleOf('U-25')
const PANEL_DIVIDER = roleOf('U-24')

const COLOR_FORM = '色'
const COLOR_ROWS = specTable('T-016')
  .rows.filter((row) => bare(row.by['入力の型'] ?? '') === COLOR_FORM && bare(row.by['対象'] ?? '') === 'Task')
  .map((row) => row.id)

const S_248 = ((): number => {
  const found = /(\d+(?:\.\d+)?)/.exec(bare(specTable('T-206').rows.find((one) => one.id === 'S-248')?.by['既定'] ?? ''))
  if (found === null) throw new Error('table T-206 row S-248 states no number')
  return Number(found[1])
})()

const SCREEN = screenOf(rowOf(specTable('T-025'), 'MC-6'))

// WHY: sub-pixel layout rounds differently per row; one pixel is the line the eye cannot tell apart.
const SAME_EDGE_PX = 1

const SETTLE_MS = 900

interface Field {
  readonly row: string
  readonly nameRight: number
  readonly nameBottom: number
  readonly valueLeft: number
  readonly valueTop: number
}

let browser: Browser | null = null

test.beforeAll(async () => {
  browser = await launchReferenceBrowser()
})

test.afterAll(async () => {
  test.setTimeout(CLEARING_UP_MS)
  await browser?.close()
})

/** @purity semi-pure-b */
async function fieldsOf(page: Page): Promise<Field[]> {
  return page.evaluate((panel: string) => {
    const out: Field[] = []
    const root = document.querySelector(panel)
    for (const line of Array.from(root?.querySelectorAll('[data-field-row][data-editable]') ?? [])) {
      const name = line.firstElementChild
      const value = line.children[1]
      if (name === null || value === undefined) continue
      const range = document.createRange()
      range.selectNodeContents(name)
      const words = Array.from(range.getClientRects()).filter((one) => one.width > 0)
      const boxes = [value, ...Array.from(value.querySelectorAll('*'))]
        .map((one) => one.getBoundingClientRect())
        .filter((one) => one.width > 0 && one.height > 0)
      if (words.length === 0 || boxes.length === 0) continue
      out.push({
        row: line.getAttribute('data-field-row') ?? '',
        nameRight: Math.max(...words.map((one) => one.right)),
        nameBottom: Math.max(...words.map((one) => one.bottom)),
        valueLeft: Math.min(...boxes.map((one) => one.left)),
        valueTop: Math.min(...boxes.map((one) => one.top)),
      })
    }
    return out
  }, PROPERTIES_PANEL)
}

/** @purity pure */
function mostCommon(values: readonly number[]): number {
  const counted = new Map<number, number>()
  for (const one of values) counted.set(Math.round(one), (counted.get(Math.round(one)) ?? 0) + 1)
  return [...counted.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]?.[0] ?? Number.NaN
}

/** @purity non-pure */
async function openOnATask(page: Page): Promise<void> {
  await page.goto('/')
  await readSettledDrawnSvg(page)
  const target = await taskBodyPoint(page)
  expect(target, 'premise: a task plan wide enough to double-click is drawn').not.toBeNull()
  if (target === null) return
  await page.mouse.dblclick(target.x, target.y)
  await page.waitForSelector(`${PROPERTIES_PANEL} [data-field-row="${COLOR_ROWS[0] ?? ''}"]`)
  await page.waitForTimeout(SETTLE_MS)
}

/** @purity semi-pure-b */
async function panelWidthOf(page: Page): Promise<number> {
  return page.evaluate((panel: string) => document.querySelector(panel)?.getBoundingClientRect().width ?? 0, PROPERTIES_PANEL)
}

// WHY: the divider nearest the panel's left edge is the one FR-052 lets the author drag.
/** @purity non-pure */
async function narrowToTheFloor(page: Page): Promise<void> {
  const at = await page.evaluate(
    ({ panel, divider }: { panel: string; divider: string }) => {
      const left = document.querySelector(panel)?.getBoundingClientRect().left ?? Number.NaN
      let best: { x: number; y: number; off: number } | null = null
      for (const band of Array.from(document.querySelectorAll(divider))) {
        const box = band.getBoundingClientRect()
        if (box.width <= 0 || box.height <= 0) continue
        const x = box.left + box.width / 2
        const off = Math.abs(x - left)
        if (best === null || off < best.off) best = { x, y: box.top + box.height / 2, off }
      }
      return best
    },
    { panel: PROPERTIES_PANEL, divider: PANEL_DIVIDER },
  )
  expect(at, 'premise: a Panel Divider stands at the panel edge').not.toBeNull()
  if (at === null) return
  await page.mouse.move(at.x, at.y)
  await page.mouse.down()
  await page.mouse.move(SCREEN.width - 2, at.y, { steps: 16 })
  await page.mouse.up()
  await page.waitForTimeout(SETTLE_MS)
}

/** @purity non-pure */
function expectTheColorRowsLineUp(fields: readonly Field[], where: string): void {
  const others = fields.filter((one) => !COLOR_ROWS.includes(one.row))
  expect(others.length, `premise (${where}): the panel draws rows other than the color rows`).toBeGreaterThan(2)
  const nameEdge = mostCommon(others.map((one) => one.nameRight))
  const valueEdge = mostCommon(others.map((one) => one.valueLeft))
  for (const row of COLOR_ROWS) {
    const field = fields.find((one) => one.row === row)
    expect(field, `premise (${where}): the panel draws the color row ${row}`).toBeDefined()
    if (field === undefined) continue
    expect(field.nameBottom, `${row} (${where}): ${FR_006_SAME_EDGES} -- the name stands beside the first row, not above`).toBeGreaterThan(
      field.valueTop + SAME_EDGE_PX,
    )
    expect(
      Math.abs(field.nameRight - nameEdge),
      `${row} (${where}): ${FR_006_SAME_EDGES} -- name ends at ${field.nameRight}, the other rows at ${nameEdge}`,
    ).toBeLessThanOrEqual(SAME_EDGE_PX)
    expect(
      Math.abs(field.valueLeft - valueEdge),
      `${row} (${where}): ${FR_006_SAME_EDGES} -- content starts at ${field.valueLeft}, the other rows at ${valueEdge}`,
    ).toBeLessThanOrEqual(SAME_EDGE_PX)
    expect(valueEdge, `${where}: ${FR_006_RIGHT_ALIGNED}`).toBeGreaterThan(nameEdge)
  }
}

interface SwatchRows {
  readonly row: string
  readonly tops: number
}

// WHY: the grid is the element holding the transparent entry (CV-9, CR-689); its cells' tops count its rows.
/** @purity semi-pure-b */
async function swatchRowsOf(page: Page): Promise<SwatchRows[]> {
  return page.evaluate(
    ({ panel, rows }: { panel: string; rows: readonly string[] }) => {
      const out: SwatchRows[] = []
      for (const row of rows) {
        const entry = document.querySelector(`${panel} [data-field-row="${row}"][data-color-choice="transparent"]`)
        const grid = entry?.parentElement
        if (grid === null || grid === undefined) continue
        const kids = Array.from(grid.children)
          .map((one) => one.getBoundingClientRect())
          .filter((one) => one.width > 0 && one.height > 0)
        out.push({ row, tops: new Set(kids.map((one) => Math.round(one.top))).size })
      }
      return out
    },
    { panel: PROPERTIES_PANEL, rows: COLOR_ROWS },
  )
}

test('FR-006 still says what the cases press', () => {
  for (const said of [FR_006_RIGHT_ALIGNED, FR_006_SAME_EDGES, CV_9_TWO_ROWS]) {
    expect(REQUIREMENTS, said).toContain(unbroken(said))
  }
  expect(COLOR_ROWS.length, 'premise: table T-016 holds color rows for a Task').toBeGreaterThan(0)
  expect(S_248).toBeGreaterThan(0)
})

for (const scheme of ['light', 'dark'] as const) {
  test(`FR-006 「${FR_006_SAME_EDGES}」 (${scheme} theme, default width and S-248)`, async ({ baseURL }) => {
    test.setTimeout(180_000)
    if (baseURL === undefined) throw new Error('playwright.config.ts declares no baseURL for the running application')
    if (browser === null) throw new Error('the reference browser was not opened')
    const context = await browser.newContext({ baseURL, viewport: SCREEN, colorScheme: scheme })
    const page = await context.newPage()
    try {
      await openOnATask(page)
      expectTheColorRowsLineUp(await fieldsOf(page), `${scheme}, default width ${await panelWidthOf(page)}px`)

      await narrowToTheFloor(page)
      const width = await panelWidthOf(page)
      expect(Math.abs(width - S_248), `premise: the drag stopped at S-248 (${S_248}px); the panel is ${width}px`).toBeLessThanOrEqual(2)
      expectTheColorRowsLineUp(await fieldsOf(page), `${scheme}, S-248 width ${width}px`)

      const grids = await swatchRowsOf(page)
      expect(grids.length, 'premise: every color row draws its grid').toBe(COLOR_ROWS.length)
      for (const grid of grids) expect(grid.tops, `${grid.row}: ${CV_9_TWO_ROWS} -- ${JSON.stringify(grid)}`).toBe(2)
    } finally {
      await context.close()
    }
  })
}
