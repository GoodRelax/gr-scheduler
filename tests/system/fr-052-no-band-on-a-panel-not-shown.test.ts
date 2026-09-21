// System case for FR-052's clause on a properties panel that is not shown (GR-22 of table T-023d).

// WHY: a Playwright file, not a unit -- which part a press reaches is decided by
// the page the shell builds; tests/unit/uf-61.test.ts holds the frame side.
// WHY: every number asserted (screen, band width, press/drag boundary) is read
// out of docs/spec at read time, never measured locally.

import { expect, test, type Browser, type Page } from '@playwright/test'
import { specTable, type SpecTable } from '../contract/spec-table'
import { CLEARING_UP_MS, launchReferenceBrowser, readSettledDrawnSvg, screenOf } from './live-app'
import { rowOf } from './sws-case'

const T025: SpecTable = specTable('T-025')
const T206: SpecTable = specTable('T-206')

/** @purity pure */
function numberIn(cell: string, what: string): number {
  const found = /-?\d+(?:\.\d+)?/.exec(cell.replace(/`/g, ''))
  const value = Number(found?.[0] ?? '')
  if (!Number.isFinite(value)) {
    throw new Error(`${what} states no number this file can read: ${JSON.stringify(cell)}`)
  }
  return value
}

/** @purity pure */
function settingOf(id: string): number {
  const row = rowOf(T206, id)
  return numberIn(row.cells[1] ?? '', `table T-206 row ${id}`)
}

const BASE_SCREEN = screenOf(rowOf(T025, 'MC-6'))

// see GR-22, S-134
const BAND_WIDTH_PX = settingOf('S-134')

// see S-208
const PRESS_OR_DRAG_PX = settingOf('S-208')

const REACH_PX = 120

// WHY: the same selectors the neighbouring System files lean on -- no spec
// row fixes how a part is marked in the page.
const PROPERTIES = '[data-role="Properties Panel"]'
const SCROLLBARS = '[data-role="Scrollbars"]'
const DIVIDER = '[data-role="Panel Divider"]'

let browser: Browser | null = null

test.beforeAll(async () => {
  browser = await launchReferenceBrowser()
})

test.afterAll(async () => {
  // WHY: this is the hook's own allowance, not an assertion's -- see
  // CLEARING_UP_MS in ./live-app.
  test.setTimeout(CLEARING_UP_MS)
  await browser?.close()
})

interface Opened {
  readonly page: Page
  close(): Promise<void>
}

/** @purity non-pure */
async function openTheApp(baseURL: string | undefined): Promise<Opened> {
  if (baseURL === undefined) {
    throw new Error('playwright.config.ts declares no baseURL for the running application')
  }
  if (browser === null) throw new Error('the reference browser was not opened')
  const context = await browser.newContext({ baseURL, viewport: BASE_SCREEN })
  const page = await context.newPage()
  await page.goto('/')
  await readSettledDrawnSvg(page)
  return {
    page,
    /** @purity non-pure */
    async close(): Promise<void> {
      await context.close()
    },
  }
}

interface Box {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

/** @purity semi-pure-b */
async function verticalBar(page: Page): Promise<Box | null> {
  return page.evaluate((selector: string) => {
    const bar = Array.from(document.querySelectorAll(selector)).find(
      (one) => one.getAttribute('data-axis') === 'vertical',
    )
    if (bar === undefined) return null
    const box = bar.getBoundingClientRect()
    return { x: box.x, y: box.y, width: box.width, height: box.height }
  }, SCROLLBARS)
}

/** @purity semi-pure-b */
async function partAt(page: Page, x: number, y: number): Promise<string | null> {
  return page.evaluate(
    (at: { x: number; y: number; roles: string }) => {
      const hit = document.elementFromPoint(at.x, at.y)
      const part = hit?.closest(at.roles) ?? null
      return part === null ? null : part.getAttribute('data-role')
    },
    { x, y, roles: `${SCROLLBARS}, ${DIVIDER}` },
  )
}

/** @purity semi-pure-b */
async function propertiesWidth(page: Page): Promise<number> {
  return page.evaluate((selector: string) => {
    const panel = document.querySelector(selector)
    return panel === null ? 0 : Math.round(panel.getBoundingClientRect().width)
  }, PROPERTIES)
}

// WHY: goes red if the properties panel's grab band is laid over the right
// edge while the panel is put away -- the press would reach the band, not the bar.
test('FR-052 (S-99h): pressing the right edge while the panel is not shown grabs the vertical bar', async ({
  baseURL,
}) => {
  test.setTimeout(180_000)
  const opened = await openTheApp(baseURL)
  const page = opened.page
  try {
    const bar = await verticalBar(page)
    expect(bar, 'SC-4 of table T-031: the vertical bar is on the screen').not.toBeNull()
    const track = bar as Box
    const before = await propertiesWidth(page)

    // WHY: the pixel just inside the bar's right edge -- the place a band laid
    // on the panel boundary (S-134 wide, straddling it) would cover.
    expect(BAND_WIDTH_PX, 'S-134 states a band a pointer could land in').toBeGreaterThan(1)
    const at = { x: track.x + track.width - 1, y: track.y + track.height / 2 }

    expect(
      await partAt(page, at.x, at.y),
      'FR-052: with the properties panel not shown, the right edge belongs to the vertical ' +
        '`Scrollbars`, not to a `Panel Divider` grab band',
    ).toBe('Scrollbars')

    expect(REACH_PX, 'the drag runs further than S-208, so it is a drag').toBeGreaterThan(
      PRESS_OR_DRAG_PX,
    )
    await page.mouse.move(at.x, at.y)
    await page.mouse.down()
    await page.mouse.move(at.x - REACH_PX, at.y, { steps: 12 })
    await page.mouse.up()
    await page.waitForTimeout(700)

    expect(
      await propertiesWidth(page),
      'FR-052: a drag from the right edge did not grab a panel boundary, so the panel that ' +
        'is not shown kept its width',
    ).toBe(before)
  } finally {
    await opened.close()
  }
})
