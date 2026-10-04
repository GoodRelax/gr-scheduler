// CR-664 (FR-006): the colour rows of the properties panel share the other rows' name edge and value edge, swept live.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { expect, test, type Browser, type Page } from '@playwright/test'
import { bare, specTable, unbroken } from '../contract/spec-table'
import { CLEARING_UP_MS, DRAWN_SVG, launchReferenceBrowser, readSettledDrawnSvg, screenOf } from './live-app'
import { rowOf } from './sws-case'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

const FR_006_RIGHT_ALIGNED = '⛔ **項目名は値の欄の左に置き、右詰めにすること（MUST）'
const FR_006_NAME_ABOVE = '⭐ ただし、色の行（入力の型が `色` の行）は、項目名を欄の上の 1 行に置くこと（MUST）'
const FR_006_SAME_EDGES =
  'その 1 行でも項目名はほかの行と同じ項目名の欄に右詰めで置き、色の欄の中身は値の欄の左端から始めること（MUST）'
const FR_006_WRAP = '同じ行に並ぶ操作子をすべてその幅で並べられないときは、その行を折り返すこと（MUST）'

// see U-25, U-24
const roleOf = (id: string): string =>
  `[data-role="${bare(specTable('T-103').rows.find((one) => one.id === id)?.by['確定名（英）'] ?? '')}"]`
const PROPERTIES_PANEL = roleOf('U-25')
const PANEL_DIVIDER = roleOf('U-24')

// see T-016
const COLOUR_FORM = '色'
const COLOUR_ROWS = specTable('T-016')
  .rows.filter((row) => bare(row.by['入力の型'] ?? '') === COLOUR_FORM && bare(row.by['対象'] ?? '') === 'Task')
  .map((row) => row.id)

// see S-248
const S_248 = ((): number => {
  const found = /(\d+(?:\.\d+)?)/.exec(bare(specTable('T-206').rows.find((one) => one.id === 'S-248')?.by['既定'] ?? ''))
  if (found === null) throw new Error('table T-206 row S-248 states no number')
  return Number(found[1])
})()

// see MC-6
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
  const target = await page.evaluate((selector: string) => {
    const drawing = document.querySelector(selector)
    for (const plan of Array.from(drawing?.querySelectorAll('[data-figure$="-plan"]') ?? [])) {
      if (!/^task-\d+-plan$/.test(plan.getAttribute('data-figure') ?? '')) continue
      const box = plan.getBoundingClientRect()
      if (box.width < 30 || box.height < 6) continue
      const x = box.left + box.width / 2
      const y = box.top + box.height / 2
      if (document.elementFromPoint(x, y) !== plan) continue
      return { x, y }
    }
    return null
  }, DRAWN_SVG)
  expect(target, 'premise: a task plan wide enough to double-click is drawn').not.toBeNull()
  if (target === null) return
  await page.mouse.dblclick(target.x, target.y)
  await page.waitForSelector(`${PROPERTIES_PANEL} [data-field-row="${COLOUR_ROWS[0] ?? ''}"]`)
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
function expectTheColourRowsLineUp(fields: readonly Field[], where: string): void {
  const others = fields.filter((one) => !COLOUR_ROWS.includes(one.row))
  expect(others.length, `premise (${where}): the panel draws rows other than the colour rows`).toBeGreaterThan(2)
  const nameEdge = mostCommon(others.map((one) => one.nameRight))
  const valueEdge = mostCommon(others.map((one) => one.valueLeft))
  for (const row of COLOUR_ROWS) {
    const field = fields.find((one) => one.row === row)
    expect(field, `premise (${where}): the panel draws the colour row ${row}`).toBeDefined()
    if (field === undefined) continue
    expect(field.nameBottom, `${row} (${where}): ${FR_006_NAME_ABOVE}`).toBeLessThanOrEqual(field.valueTop + SAME_EDGE_PX)
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

interface LastLine {
  readonly row: string
  readonly width: number
  readonly needed: number
  readonly tops: number
}

// WHY: the last colour line is the one holding the transparent entry (CV-9).
/** @purity semi-pure-b */
async function lastLinesOf(page: Page): Promise<LastLine[]> {
  return page.evaluate(
    ({ panel, rows }: { panel: string; rows: readonly string[] }) => {
      const out: LastLine[] = []
      for (const row of rows) {
        const entry = document.querySelector(`${panel} [data-field-row="${row}"][data-colour-choice="transparent"]`)
        const line = entry?.parentElement
        if (line === null || line === undefined) continue
        const kids = Array.from(line.children)
          .map((one) => one.getBoundingClientRect())
          .filter((one) => one.width > 0 && one.height > 0)
        const gap = Number.parseFloat(window.getComputedStyle(line).columnGap) || 0
        out.push({
          row,
          width: line.getBoundingClientRect().width,
          needed: kids.reduce((sum, one) => sum + one.width, 0) + gap * Math.max(0, kids.length - 1),
          tops: new Set(kids.map((one) => Math.round(one.top))).size,
        })
      }
      return out
    },
    { panel: PROPERTIES_PANEL, rows: COLOUR_ROWS },
  )
}

test('FR-006 still says what the cases press', () => {
  for (const said of [FR_006_RIGHT_ALIGNED, FR_006_NAME_ABOVE, FR_006_SAME_EDGES, FR_006_WRAP]) {
    expect(REQUIREMENTS, said).toContain(unbroken(said))
  }
  expect(COLOUR_ROWS.length, 'premise: table T-016 holds colour rows for a Task').toBeGreaterThan(0)
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
      expectTheColourRowsLineUp(await fieldsOf(page), `${scheme}, default width ${await panelWidthOf(page)}px`)

      await narrowToTheFloor(page)
      const width = await panelWidthOf(page)
      expect(Math.abs(width - S_248), `premise: the drag stopped at S-248 (${S_248}px); the panel is ${width}px`).toBeLessThanOrEqual(2)
      expectTheColourRowsLineUp(await fieldsOf(page), `${scheme}, S-248 width ${width}px`)

      const lines = await lastLinesOf(page)
      expect(lines.length, 'premise: every colour row draws its last line').toBe(COLOUR_ROWS.length)
      for (const line of lines) {
        expect(line.needed, `premise (${line.row}): at S-248 the last line cannot stand on one line`).toBeGreaterThan(line.width)
        expect(line.tops, `${line.row}: ${FR_006_WRAP} -- ${JSON.stringify(line)}`).toBeGreaterThan(1)
      }
    } finally {
      await context.close()
    }
  })
}
