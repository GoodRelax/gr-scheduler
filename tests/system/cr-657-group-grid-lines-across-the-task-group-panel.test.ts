// CR-657 on the shipped build: the Task Group Panel's task-group-boundary lines continue the schedule side's U-18.

import { expect, test, type Browser, type Page } from '@playwright/test'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { specTable } from '../contract/spec-table'
import { CLEARING_UP_MS, DRAWN_SVG, launchReferenceBrowser, readSettledDrawnSvg, screenOf } from './live-app'
import { rowOf } from './sws-case'

const BASE_SCREEN = screenOf(rowOf(specTable('T-025'), 'MC-6'))
const SHIPPED_BUILD = join(process.cwd(), 'dist', 'index.html')
const GROUP_GRID_TOGGLE = 'IC-43'
const NEAR_PX = 0.02

interface ScheduleRule {
  readonly key: string
  readonly x: number
  readonly y: number
  readonly thickness: number
  readonly colour: string
}

interface PanelLine {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
  readonly colour: string
}

interface Measured {
  readonly panelLeft: number
  readonly panelRight: number
  readonly panelBottom: number
  readonly scheduleRules: readonly ScheduleRule[]
  readonly panelLines: readonly PanelLine[]
}

let browser: Browser | null = null

test.beforeAll(async () => {
  if (!existsSync(SHIPPED_BUILD)) {
    throw new Error('the shipped build this file measures is not there; run `npx vite build` first (dist/index.html)')
  }
  browser = await launchReferenceBrowser()
})

test.afterAll(async () => {
  test.setTimeout(CLEARING_UP_MS)
  await browser?.close()
})

// see FR-042, U-18, U-22
/** @purity semi-pure-b */
async function measure(page: Page): Promise<Measured> {
  return page.evaluate((drawn: string) => {
    const rows = Array.from(document.querySelectorAll('[data-role="Task Group Title Tree"] [data-group-id]'))
      .map((row) => row.getBoundingClientRect())
      .filter((box) => box.width > 0 && box.height > 0)
    const panelLeft = Math.min(...rows.map((box) => box.x))
    const panelRight = Math.max(...rows.map((box) => box.x + box.width))
    const panelBottom = Math.max(...rows.map((box) => box.y + box.height))
    const scheduleRules = Array.from(
      document.querySelectorAll(`${drawn} line[data-figure^="row-"][data-figure$="-rule"]`),
    ).map((line) => {
      const box = line.getBoundingClientRect()
      const style = getComputedStyle(line)
      return {
        key: line.getAttribute('data-figure') ?? '',
        x: box.x,
        y: box.y + box.height / 2,
        thickness: Number.parseFloat(style.strokeWidth),
        colour: style.stroke,
      }
    })
    const inks = new Set(scheduleRules.map((rule) => rule.colour))
    const tree = document.querySelector('[data-role="Task Group Title Tree"]')
    const panelLines = Array.from(tree?.querySelectorAll('*') ?? [])
      .map((node) => ({ box: node.getBoundingClientRect(), colour: getComputedStyle(node).backgroundColor }))
      .filter(({ box, colour }) => box.height > 0 && box.height <= 2 && box.width > 0 && (inks.size === 0 || inks.has(colour)))
      .map(({ box, colour }) => ({ x: box.x, y: box.y, width: box.width, height: box.height, colour }))
    return { panelLeft, panelRight, panelBottom, scheduleRules, panelLines }
  }, DRAWN_SVG)
}

/** @purity pure */
function panelLineFor(rule: ScheduleRule, lines: readonly PanelLine[]): PanelLine | undefined {
  return lines.find((line) => Math.abs(line.y + line.height / 2 - rule.y) < NEAR_PX)
}

/** @purity non-pure */
async function openTheApp(): Promise<{ page: Page; close(): Promise<void> }> {
  if (browser === null) throw new Error('the reference browser was not opened')
  const context = await browser.newContext({ viewport: BASE_SCREEN })
  const page = await context.newPage()
  await page.goto(pathToFileURL(SHIPPED_BUILD).href)
  await readSettledDrawnSvg(page)
  return {
    page,
    /** @purity non-pure */
    async close(): Promise<void> {
      await context.close()
    },
  }
}

/** @purity non-pure */
async function pressToggle(page: Page): Promise<void> {
  await page.click(`[data-icon="${GROUP_GRID_TOGGLE}"]`, { timeout: 8_000 })
  await page.mouse.move(BASE_SCREEN.width - 1, BASE_SCREEN.height - 1)
  await readSettledDrawnSvg(page)
}

/** @purity pure */
function expectSameLineOnBothSides(measured: Measured): void {
  const visible = measured.scheduleRules.filter((rule) => rule.y <= measured.panelBottom + NEAR_PX)
  expect(visible.length, 'the schedule side draws task-group-boundary lines beside the panel').toBeGreaterThan(0)
  for (const rule of visible) {
    const line = panelLineFor(rule, measured.panelLines)
    expect(line, `the panel carries a line at the boundary of ${rule.key} (y ${rule.y})`).toBeDefined()
    const drawn = line as PanelLine
    expect(drawn.height, `${rule.key}: the same thickness`).toBeCloseTo(rule.thickness, 2)
    expect(drawn.colour, `${rule.key}: the same colour`).toBe(rule.colour)
    expect(drawn.x, `${rule.key}: from the panel's left edge`).toBeCloseTo(measured.panelLeft, 2)
    expect(drawn.x + drawn.width, `${rule.key}: to the panel's right edge`).toBeCloseTo(measured.panelRight, 2)
    expect(drawn.x + drawn.width, `${rule.key}: unbroken into the schedule side's line`).toBeCloseTo(rule.x, 2)
  }
  expect(measured.panelLines.length, 'no panel line stands where the schedule side has none').toBe(visible.length)
}

test('FR-042: while S-68 is true the panel carries, at each row boundary, the schedule side\'s line', async () => {
  test.setTimeout(180_000)
  const opened = await openTheApp()
  try {
    expectSameLineOnBothSides(await measure(opened.page))
  } finally {
    await opened.close()
  }
})

test('S-68 through IC-43: switched off, neither side has the lines; switched back, both have them again', async () => {
  test.setTimeout(180_000)
  const opened = await openTheApp()
  try {
    const before = await measure(opened.page)
    expect(before.scheduleRules.length, 'the opened document shows the lines').toBeGreaterThan(0)
    // STEP: IC-43 sets S-68 false.
    await pressToggle(opened.page)
    const off = await measure(opened.page)
    expect(off.scheduleRules, 'the schedule side draws no task-group-boundary line').toEqual([])
    expect(off.panelLines, 'the panel draws no task-group-boundary line').toEqual([])
    // STEP: IC-43 again sets S-68 true.
    await pressToggle(opened.page)
    expectSameLineOnBothSides(await measure(opened.page))
  } finally {
    await opened.close()
  }
})
