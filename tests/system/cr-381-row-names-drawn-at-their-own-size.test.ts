// The shipped build's Row Title Panel, measured: each row name at the size FR-094 gives its depth, its controls unmoved.

import { expect, test, type Browser, type Page } from '@playwright/test'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { specTable } from '../contract/spec-table'
import { displayRatioAt } from '../fixtures/display-scale'
import { CLEARING_UP_MS, launchReferenceBrowser, readSettledDrawnSvg, screenOf } from './live-app'
import { rowOf } from './sws-case'

const BASE_SCREEN = screenOf(rowOf(specTable('T-025'), 'MC-6'))
const SHIPPED_BUILD = join(process.cwd(), 'dist', 'index.html')
const SIZE_TOLERANCE_PX = 0.05

// see FR-065, T-109
const AGENT_API_ENTRANCE = ((): string => {
  const wanted = /FR-065(?![0-9])/
  const found = specTable('T-109').rows.filter((row) => row.cells.some((cell) => wanted.test(cell)))
  if (found.length !== 1) {
    throw new Error(`table T-109 has ${found.length} entrances governed by FR-065, and this file needs one`)
  }
  return found[0]?.id ?? ''
})()

interface RowNameSettings {
  readonly rowTitleFont: number
  readonly rowTitleTopScale: number
  // see FR-039, T-202, S-234
  readonly displayScale: number
}

interface MeasuredRow {
  readonly depth: number
  readonly name: string
  readonly namePx: number
  readonly boxPx: number
  readonly controls: readonly string[]
}

// see FR-094, FR-039, T-201, T-252
// WHY: S-36 is a px row of the label group, so DS-1 of table T-252 has the
// WHY: drawing multiply it once by the ratio; the stored value stays as it is.
/** @purity pure */
function expectedNamePx(depth: number, settings: RowNameSettings): number {
  const stored =
    depth === 1 ? settings.rowTitleFont * settings.rowTitleTopScale : settings.rowTitleFont
  return stored * displayRatioAt(settings.displayScale)
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

// see FR-065, T-109
/** @purity non-pure */
async function openAgentApi(page: Page): Promise<void> {
  const at = await page.evaluate((wanted: string) => {
    const entry = document.querySelector(`[data-icon="${wanted}"]`)
    if (entry === null) return null
    const box = entry.getBoundingClientRect()
    if (box.width < 1 || box.height < 1) return null
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
  }, AGENT_API_ENTRANCE)
  expect(at, `the entrance ${AGENT_API_ENTRANCE} is on the screen`).not.toBeNull()
  const point = at as { x: number; y: number }
  await page.mouse.move(point.x, point.y)
  await page.mouse.down()
  await page.mouse.up()
  await page.waitForTimeout(500)
}

// see T-107
/** @purity semi-pure-b */
async function readRowNameSettings(page: Page): Promise<RowNameSettings> {
  return page.evaluate(() => {
    const api = (window as unknown as { grSchedulerAgentApi?: { readDocument(): unknown } }).grSchedulerAgentApi
    if (api === undefined) throw new Error('the Agent API is not open, so the document cannot be read')
    const held = api.readDocument() as { documentSettings: RowNameSettings }
    return {
      rowTitleFont: held.documentSettings.rowTitleFont,
      rowTitleTopScale: held.documentSettings.rowTitleTopScale,
      displayScale: held.documentSettings.displayScale,
    }
  })
}

// see FR-085, T-051
/** @purity semi-pure-b */
async function measureRows(page: Page): Promise<MeasuredRow[]> {
  return page.evaluate(() => {
    const px = (element: Element): number => Number.parseFloat(getComputedStyle(element).fontSize)
    const measured: MeasuredRow[] = []
    for (const row of Array.from(document.querySelectorAll('[data-depth]'))) {
      const leaves = Array.from(row.querySelectorAll('*')).filter((one) => {
        const text = (one.textContent ?? '').trim()
        return (
          one.children.length === 0 &&
          text !== '' &&
          one.closest('[data-icon]') === null &&
          one.closest('[data-row-grab]') === null &&
          !/^[⋮\s]+$/.test(text) &&
          !/^▾\s*\d+$/.test(text)
        )
      })
      const name = leaves[0]
      if (name === undefined) continue
      measured.push({
        depth: Number(row.getAttribute('data-depth')),
        name: (name.textContent ?? '').trim(),
        namePx: px(name),
        boxPx: px(row),
        controls: Array.from(row.querySelectorAll('[data-icon]')).map((icon) => {
          const box = icon.getBoundingClientRect()
          return `${px(icon)}px ${Math.round(box.width * 10) / 10}x${Math.round(box.height * 10) / 10}`
        }),
      })
    }
    return measured
  })
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

test('FR-094 / PI-37: every drawn row name is S-36 x S-38 at depth 1 and S-36 below it', async () => {
  test.setTimeout(180_000)
  const opened = await openTheApp()
  try {
    await openAgentApi(opened.page)
    const settings = await readRowNameSettings(opened.page)
    expect(
      Number.isFinite(settings.rowTitleFont) &&
        Number.isFinite(settings.rowTitleTopScale) &&
        Number.isFinite(settings.displayScale),
      'the document holds S-36, S-38 and S-234',
    ).toBe(true)
    const rows = await measureRows(opened.page)
    expect(rows.some((row) => row.depth === 1), `a depth-1 row is drawn: ${JSON.stringify(rows)}`).toBe(true)
    const off = rows.filter((row) => Math.abs(row.namePx - expectedNamePx(row.depth, settings)) > SIZE_TOLERANCE_PX)
    expect(
      off.map((row) => ({ depth: row.depth, name: row.name, drawn: row.namePx, expected: expectedNamePx(row.depth, settings) })),
      `S-36 ${settings.rowTitleFont}, S-38 ${settings.rowTitleTopScale}, S-234 ` +
        `${settings.displayScale}: every row name at depth 1 is S-36 x S-38 and every deeper one ` +
        `S-36, each of them drawn once at the ratio FR-039 (MUST) gives -- ` +
        `「描く比は、\`S-234\` を 100 で割り、同書の 表 T-206 の \`S-236\` を掛けた値とすること（MUST）」 ` +
        `-- which is ${displayRatioAt(settings.displayScale).toFixed(5)} here`,
    ).toEqual([])
  } finally {
    await opened.close()
  }
})

test('T-051 HF-5: the row boxes and their controls do not take the size of the name they hold', async () => {
  test.setTimeout(180_000)
  const opened = await openTheApp()
  try {
    const rows = await measureRows(opened.page)
    expect(rows.length, 'the panel draws rows').toBeGreaterThan(0)
    expect(
      [...new Set(rows.map((row) => row.boxPx))],
      `every row box carries one font size whatever its name size: ${JSON.stringify(rows)}`,
    ).toHaveLength(1)
    const controls = rows.flatMap((row) => row.controls)
    expect(controls.length, 'the rows draw controls').toBeGreaterThan(0)
    expect([...new Set(controls)], `every control is drawn alike on every row: ${JSON.stringify(rows)}`).toHaveLength(1)
  } finally {
    await opened.close()
  }
})
