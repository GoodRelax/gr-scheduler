// System test: pins for open ledger rows, driven against the live app (DFC-06, DFC-147, DFC-182, DFC-232).

// WHY: not driven through `npm run parity` -- that harness compares against a
// rows-only sample with no task bars, canvas or watermark to press.

// WHY: each pinned case is `test.fail()` so the run stays green while the row
// is open, and turns "expected to fail, but passed" the day it is fixed.
// WHY: an expected-to-fail case cannot guard itself, so each is preceded by a
// plain CONTROL case proving the same gesture still reaches the product.

import { expect, test, type Browser, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { specTable, unbroken, type SpecTable } from '../contract/spec-table'
import { DEFAULT_DISPLAY_RATIO } from '../fixtures/display-scale'
import { CLEARING_UP_MS, launchReferenceBrowser, readSettledDrawnSvg, screenOf } from './live-app'
import { rowOf } from './sws-case'

interface Pin {
  readonly ledger: string
  readonly wrong: string
}

const D230: Pin = {
  ledger: 'DFC-230',
  wrong:
    'the first frame is drawn with the App Header measured as 0 high, so the whole tree ' +
    'stands 24px too high and a ninth row leaks into the drawing area -- table T-077 row ' +
    'BO-1 (MUST NOT) draws nothing until the screen size is settled',
}

// WHY: DFC-230's case lives in first-frame-is-the-settled-frame.test.ts (needs
// its own launch); it stays here only so the ledger gate below still sees it.
const PINNED: readonly Pin[] = [D230]

const T025: SpecTable = specTable('T-025')

const SCREEN_ROW = 'MC-6'

const BASE_SCREEN = screenOf(rowOf(T025, SCREEN_ROW))

const REQUIREMENTS = unbroken(
  readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'),
)

// WHY: the headings are Japanese and rule 03 section 5 keeps this file ASCII,
// so they are spelled as escapes -- as tests/fixtures/display-scale.ts does.
const DEFAULT_COLUMN = String.fromCharCode(0x65e2, 0x5b9a)
const DEFAULT_VALUE_COLUMN = String.fromCharCode(0x65e2, 0x5b9a, 0x5024)

/** @purity pure */
function settingOf(table: string, id: string, column: string): number {
  const cell = rowOf(specTable(table), id).by[column] ?? ''
  const found = /-?\d+(?:\.\d+)?/.exec(cell.replace(/`/g, ''))
  const value = Number(found?.[0] ?? '')
  if (!Number.isFinite(value)) {
    throw new Error(`table ${table} row ${id} states no number this file can read: ${cell}`)
  }
  return value
}

// see S-4, S-5
const S_4 = settingOf('T-201', 'S-4', DEFAULT_VALUE_COLUMN)
const S_5 = settingOf('T-201', 'S-5', DEFAULT_VALUE_COLUMN)
// see S-75, S-76
const S_75 = settingOf('T-203', 'S-75', DEFAULT_COLUMN)
const S_76 = settingOf('T-203', 'S-76', DEFAULT_COLUMN)
// see S-180
const S_180 = settingOf('T-206', 'S-180', DEFAULT_COLUMN)
// see S-22, S-247
const S_22 = settingOf('T-201', 'S-22', DEFAULT_VALUE_COLUMN)
const S_247 = settingOf('T-206', 'S-247', DEFAULT_COLUMN)

// see DM-3, DS-1
const MARK_WIDTH_PX = Math.min(S_22 * DEFAULT_DISPLAY_RATIO * S_247, S_180)
// see S-180, DS-1, DS-8
const MARK_HEIGHT_PX = S_4 * DEFAULT_DISPLAY_RATIO * S_76 * S_5
// see S-1, DS-4
const DAY_WIDTH_PX = settingOf('T-201', 'S-1', DEFAULT_VALUE_COLUMN) * DEFAULT_DISPLAY_RATIO * S_75

let browser: Browser | null = null

test.beforeAll(async () => {
  browser = await launchReferenceBrowser()
})

test.afterAll(async () => {
  // WHY: this is the hook's own allowance, not an assertion's -- see
  // CLEARING_UP_MS in ./live-app for the measurement behind it.
  test.setTimeout(CLEARING_UP_MS)
  await browser?.close()
})

/** @purity semi-pure-b */
function openedBrowser(): Browser {
  if (browser === null) throw new Error('the reference browser was not opened')
  return browser
}

/** @purity pure */
function serverUrlOf(baseURL: string | undefined): string {
  if (baseURL === undefined) {
    throw new Error('playwright.config.ts declares no baseURL for the running application')
  }
  return baseURL
}

interface Opened {
  readonly page: Page
  close(): Promise<void>
}

/** @purity non-pure */
async function openTheApp(baseURL: string | undefined): Promise<Opened> {
  const context = await openedBrowser().newContext({
    baseURL: serverUrlOf(baseURL),
    viewport: BASE_SCREEN,
  })
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

// WHY: the same selector tests/system/live-app.ts leans on -- no spec row
// fixes how a part is marked, so a change to it should break these cases.
const CANVAS = '[data-role="Schedule Canvas"] svg'
const CANVAS_PART = '[data-role="Schedule Canvas"]'
const NOTICES = '[data-role="Notification Area"]'
const PANEL = '[data-role="Row Title Panel"]'

interface Box {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

/** @purity semi-pure-b */
async function censusOf(page: Page): Promise<{ shapes: string; notice: string }> {
  return page.evaluate(
    /** @purity semi-pure-b */
    (asked: { canvas: string; notices: string }) => {
      const svg = document.querySelector(asked.canvas)
      const counted = new Map<string, number>()
      if (svg !== null) {
        for (const element of Array.from(svg.querySelectorAll('*'))) {
          counted.set(element.tagName, (counted.get(element.tagName) ?? 0) + 1)
        }
      }
      const shapes = Array.from(counted.entries())
        .sort((one, two) => (one[0] < two[0] ? -1 : 1))
        .map(([tag, how]) => `${tag}=${how}`)
        .join(' ')
      return {
        shapes,
        notice: (document.querySelector(asked.notices)?.textContent ?? '').trim(),
      }
    },
    { canvas: CANVAS, notices: NOTICES },
  )
}

// WHY: wider than censusOf on purpose -- a surface opened over the canvas
// (S-99g) leaves every shape there untouched, so only the whole screen answers.
/** @purity semi-pure-b */
async function screenCensusOf(page: Page): Promise<{ parts: string; notice: string }> {
  return page.evaluate(
    /** @purity semi-pure-b */
    (notices: string) => {
      const named = Array.from(document.querySelectorAll('[data-role]'))
        .map((one) => one.getAttribute('data-role') ?? '')
        .sort((one, two) => (one < two ? -1 : 1))
      return {
        parts: named.join(' '),
        notice: (document.querySelector(notices)?.textContent ?? '').trim(),
      }
    },
    NOTICES,
  )
}

// WHY: a real pointer, not element.click() -- the shell reads the pointer,
// and a synthetic click has reached nothing in this project before.
/** @purity non-pure */
async function pressEntrance(page: Page, icon: string): Promise<boolean> {
  const at = await page.evaluate(
    /** @purity semi-pure-b */
    (wanted: string) => {
      const entry = document.querySelector(`[data-icon="${wanted}"]`)
      if (entry === null) return null
      const box = entry.getBoundingClientRect()
      return {
        x: box.x + box.width / 2,
        y: box.y + box.height / 2,
        enabled: entry.getAttribute('data-enabled'),
      }
    },
    icon,
  )
  if (at === null) return false
  expect(at.enabled, `the entrance ${icon} is drawn as one that cannot be pressed`).not.toBe('false')
  await page.mouse.move(at.x, at.y)
  await page.mouse.down()
  await page.mouse.up()
  await page.waitForTimeout(500)
  return true
}

/** @purity semi-pure-b */
async function armingOf(page: Page, icon: string): Promise<string | null> {
  return page.evaluate(
    /** @purity semi-pure-b */
    (wanted: string) =>
      document.querySelector(`[data-icon="${wanted}"]`)?.getAttribute('data-armed') ?? null,
    icon,
  )
}

// WHY: wheeled rather than jumped -- there is no settled handle for the
// scroll position, and the wheel is what a person turns.
/** @purity non-pure */
async function scrollToTheGround(page: Page): Promise<void> {
  await page.mouse.move(BASE_SCREEN.width / 2, BASE_SCREEN.height / 2)
  for (let turn = 0; turn < 30; turn += 1) await page.mouse.wheel(0, 900)
  await page.waitForTimeout(900)
}

// WHY: found by asking the page, not a coordinate written here --
// elementFromPoint re-measures itself when the screen or document moves.
/** @purity semi-pure-b */
async function emptyCanvasPoint(page: Page): Promise<{ x: number; y: number } | null> {
  return page.evaluate(
    /** @purity semi-pure-b */
    (asked: { canvas: string; panel: string }) => {
      const svg = document.querySelector(asked.canvas)
      const panel = document.querySelector(asked.panel)?.getBoundingClientRect()
      if (svg === null || panel === undefined) return null
      const left = Math.round(panel.right + 80)
      const right = window.innerWidth - 200
      for (let y = window.innerHeight - 40; y > 120; y -= 8) {
        for (let x = left; x < right; x += 24) {
          if (document.elementFromPoint(x, y) !== svg) continue
          // WHY: room to the right too -- the drag below runs that way, and a
          // point with something drawn 20px along is not an empty spot.
          if (document.elementFromPoint(x + 160, y) !== svg) continue
          return { x, y }
        }
      }
      return null
    },
    { canvas: CANVAS, panel: PANEL },
  )
}

const REACH_PX = 160

/** @purity non-pure */
async function cursorAt(page: Page, x: number, y: number): Promise<string> {
  await page.mouse.move(x, y)
  return page.evaluate(
    /** @purity semi-pure-b */
    (canvas: string) => {
      const surface = document.querySelector(canvas)
      return surface instanceof HTMLElement ? surface.style.cursor : ''
    },
    // WHY: the part itself, not CANVAS -- that reaches the SVG drawing inside
    // it, which carries no style.cursor and reads as '' everywhere.
    CANVAS_PART,
  )
}

// WHY: unlike emptyCanvasPoint, elementFromPoint cannot answer inside a row
// (its own band is always topmost), so this reads the cursor PTD-5 sets there.
/** @purity non-pure */
async function emptyPointOnADrawnRow(page: Page): Promise<{ x: number; y: number } | null> {
  const ground = await page.evaluate(
    /** @purity semi-pure-b */
    (asked: { panel: string; reach: number }) => {
      const panel = document.querySelector(asked.panel)?.getBoundingClientRect()
      if (panel === undefined) return null
      const middles: number[] = []
      for (const row of Array.from(document.querySelectorAll('[data-depth]'))) {
        const band = row.getBoundingClientRect()
        const middle = Math.round(band.y + band.height / 2)
        if (middle >= 120 && middle <= window.innerHeight - 40) middles.push(middle)
      }
      return {
        left: Math.round(panel.right + 80),
        right: window.innerWidth - 200 - asked.reach,
        middles,
      }
    },
    { panel: PANEL, reach: REACH_PX },
  )
  if (ground === null) return null
  for (const y of ground.middles) {
    for (let x = ground.left; x <= ground.right; x += 24) {
      if ((await cursorAt(page, x, y)) !== 'default') continue
      if ((await cursorAt(page, x + REACH_PX, y)) !== 'default') continue
      return { x, y }
    }
  }
  return null
}

const DUMMY_FIGURE = '-dummies'

interface FaintHold extends Box {
  readonly key: string
  readonly halves: readonly number[]
}

// WHY: found by how faint they are -- the one thing FR-043 says about them
// that a browser can measure, since everything else on the canvas is solid.
// TRAP: the PM-1a marker group is faint too, so the key tells the two apart.
// A width floor cannot: DM-3 draws the mark 2.0001px wide at the default scale.
/** @purity semi-pure-b */
async function faintHolds(page: Page): Promise<FaintHold[]> {
  return page.evaluate(
    /** @purity semi-pure-b */
    (asked: { canvas: string; suffix: string }) => {
      const svg = document.querySelector(asked.canvas)
      if (svg === null) return []
      const out: FaintHold[] = []
      for (const element of Array.from(svg.querySelectorAll('g'))) {
        if (Number(getComputedStyle(element).opacity) > 0.4) continue
        const key = element.getAttribute('data-figure') ?? ''
        if (!key.endsWith(asked.suffix)) continue
        const box = element.getBoundingClientRect()
        if (box.width <= 0 || box.x < 0 || box.x + box.width > window.innerWidth) continue
        if (box.y < 60 || box.y + box.height > window.innerHeight) continue
        out.push({
          key,
          x: Math.round(box.x),
          y: Math.round(box.y),
          width: Math.round(box.width),
          height: Math.round(box.height),
          halves: Array.from(element.children)
            .map((child) => Math.round(child.getBoundingClientRect().x))
            .sort((one, two) => one - two),
        })
      }
      return out
    },
    { canvas: CANVAS, suffix: DUMMY_FIGURE },
  )
}

// TRAP: the floor is half a drawn day and must stay under one, or the S-129 actual a
// dropped dummy writes is filtered out and the drop reads as having written nothing.
/** @purity semi-pure-b */
async function barsAround(page: Page, y: number): Promise<Array<{ x: number; width: number; height: number }>> {
  return page.evaluate(
    /** @purity semi-pure-b */
    (asked: { canvas: string; y: number; floor: number }) => {
      const svg = document.querySelector(asked.canvas)
      if (svg === null) return []
      return Array.from(svg.querySelectorAll('polygon'))
        .map((one) => one.getBoundingClientRect())
        .filter((box) => Math.abs(box.y + box.height / 2 - asked.y) < 24 && box.width >= asked.floor)
        .map((box) => ({
          x: Math.round(box.x),
          width: Math.round(box.width),
          height: Math.round(box.height),
        }))
        .sort((one, two) => one.height - two.height)
    },
    { canvas: CANVAS, y, floor: DAY_WIDTH_PX / 2 },
  )
}

const RECTANGLE_TASK = 'IC-23'
const COMMENT_BOX = 'IC-35'
const HIDE_WATERMARK = 'IC-41'
const DATE_RULES = 'IC-42'

// WHY: proves the palette itself still answers a press, so the DFC-147 case
// below cannot pass merely because nothing here reaches the product.
test('control for DFC-147: a neighbouring entrance of the same palette group answers a press', async ({
  baseURL,
}) => {
  test.setTimeout(180_000)
  const app = await openTheApp(baseURL)
  const before = await censusOf(app.page)
  expect(await pressEntrance(app.page, DATE_RULES), `${DATE_RULES} is not on the screen`).toBe(true)
  const after = await censusOf(app.page)
  expect(
    after.shapes,
    `pressing ${DATE_RULES} left the drawing untouched, so this file is not reaching the palette ` +
      'at all and the case on DFC-147 below would be worthless',
  ).not.toBe(before.shapes)
  await app.close()
})

// WHY: asserts FR-029 (MUST) -- a press that cannot act must say why -- and
// not the watermark's own drawing, which this build does not render at all.
test('DFC-147: pressing the entrance that hides the watermark either does something or says why not', async ({
  baseURL,
}) => {
  test.setTimeout(180_000)
  const app = await openTheApp(baseURL)
  const before = await screenCensusOf(app.page)
  expect(await pressEntrance(app.page, HIDE_WATERMARK), `${HIDE_WATERMARK} is not on the screen`).toBe(
    true,
  )
  const after = await screenCensusOf(app.page)
  try {
    expect(
      after.parts !== before.parts || after.notice !== before.notice,
      `${HIDE_WATERMARK} was pressed: the parts on screen are unchanged (${after.parts}) and the ` +
        'notification area is empty',
    ).toBe(true)
  } finally {
    await app.close()
  }
})

// WHY: proves the point, the arming and the drag below still reach the
// product, so the DFC-06 case cannot pass by pressing something inert.
test('control for DFC-06: with the rectangle entrance armed, the same drag on the same spot draws', async ({
  baseURL,
}) => {
  test.setTimeout(180_000)
  const app = await openTheApp(baseURL)
  const spot = await emptyPointOnADrawnRow(app.page)
  expect(spot, 'no drawn row covers a point with empty ground under it').not.toBeNull()
  if (spot === null) return

  expect(await pressEntrance(app.page, RECTANGLE_TASK), `${RECTANGLE_TASK} is not on the screen`).toBe(
    true,
  )
  expect(await armingOf(app.page, RECTANGLE_TASK), `${RECTANGLE_TASK} did not arm`).toBe('true')

  const before = await censusOf(app.page)
  await app.page.mouse.move(spot.x, spot.y)
  await app.page.mouse.down()
  await app.page.mouse.move(spot.x + REACH_PX, spot.y, { steps: 10 })
  await app.page.mouse.up()
  await app.page.waitForTimeout(900)
  const after = await censusOf(app.page)
  expect(
    after.shapes,
    'an armed entrance and a drag on empty canvas drew nothing, so the case on DFC-06 below ' +
      'reaches nothing',
  ).not.toBe(before.shapes)
  await app.close()
})

test('DFC-06: with the comment box entrance armed, a press on empty canvas places one', async ({
  baseURL,
}) => {
  test.setTimeout(180_000)
  const app = await openTheApp(baseURL)
  const spot = await emptyPointOnADrawnRow(app.page)
  expect(spot, 'no drawn row covers a point with empty ground under it').not.toBeNull()
  if (spot === null) return

  expect(await pressEntrance(app.page, COMMENT_BOX), `${COMMENT_BOX} is not on the screen`).toBe(true)
  expect(await armingOf(app.page, COMMENT_BOX), `${COMMENT_BOX} did not arm`).toBe('true')

  const before = await censusOf(app.page)
  await app.page.mouse.move(spot.x, spot.y)
  await app.page.mouse.down()
  await app.page.mouse.up()
  await app.page.waitForTimeout(900)
  const pressed = await censusOf(app.page)
  expect(
    pressed.shapes,
    `${COMMENT_BOX} armed, then pressed at (${spot.x}, ${spot.y}): the drawing is unchanged ` +
      `(${before.shapes})`,
  ).not.toBe(before.shapes)

  // WHY: pressed off the first box (PTD-3, not PTD-4) -- table T-023b (MUST)
  // keeps an arming standing, so a second press owes a second box.
  await app.page.mouse.move(spot.x + REACH_PX, spot.y)
  await app.page.mouse.down()
  await app.page.mouse.up()
  await app.page.waitForTimeout(900)
  const twice = await censusOf(app.page)
  try {
    expect(
      twice.shapes,
      `${COMMENT_BOX} stayed armed and was pressed a second time at ` +
        `(${spot.x + REACH_PX}, ${spot.y}): ` +
        `the drawing is unchanged (${pressed.shapes})`,
    ).not.toBe(pressed.shapes)
  } finally {
    await app.close()
  }
})

interface Dropped {
  readonly planX: number
  readonly planWidth: number
  readonly step: number
  readonly carriedPx: number
  readonly after: ReadonlyArray<{ x: number; width: number; height: number }>
}

// WHY: FR-001 / FR-019 part a press from a drag at S-208, read here rather than
// WHY: written, so the carry below follows the product's own boundary.
const PRESS_OR_DRAG_PX = settingOf('T-206', 'S-208', DEFAULT_COLUMN)

// WHY: drawn fresh, not from the starting document -- every unstarted task
// there sits off-screen at the default zoom, out of pointer reach.
// WHY: the drag distance is the product's own drawn mark width (FR-043), not
// a pixel count written here, so a change to that width moves the drag too.
/** @purity non-pure */
async function dropTheDummy(page: Page, steps: number): Promise<Dropped> {
  await scrollToTheGround(page)
  const spot = await emptyCanvasPoint(page)
  expect(spot, 'no point on the canvas has empty ground under it').not.toBeNull()
  if (spot === null) throw new Error('unreachable')

  // WHY: excludes holds already on screen -- the starting document has its
  // own unstarted tasks, and taking the first faint mark found one of those.
  // TRAP: keyed by data-figure, never by position -- the drop redraws the
  // board, so every existing mark moves and would be counted as a new one.
  const already = new Set((await faintHolds(page)).map((one) => one.key))

  expect(await pressEntrance(page, RECTANGLE_TASK), `${RECTANGLE_TASK} is not on the screen`).toBe(true)
  const barWidth = 300
  await page.mouse.move(spot.x, spot.y)
  await page.mouse.down()
  await page.mouse.move(spot.x + barWidth, spot.y, { steps: 10 })
  await page.mouse.up()
  await page.waitForTimeout(1000)

  const fresh = (await faintHolds(page)).filter((one) => !already.has(one.key))
  expect(
    fresh.length,
    'drawing a task put no NEW faint grab-hold on the screen, so it is not being drawn unstarted',
  ).toBe(1)
  const dummy = fresh[0]
  if (dummy === undefined) throw new Error('unreachable')

  // WHY: the widest bar in the band is the plan bar -- the hold's own two
  // halves are drawn in the same band as a fraction of that width.
  const beside = await barsAround(page, dummy.y + dummy.height / 2)
  const plan = beside.slice().sort((one, two) => two.width - one.width)[0]
  expect(plan, 'the task drawn has no plan bar beside its grab-hold').not.toBeUndefined()
  if (plan === undefined) throw new Error('unreachable')
  expect(
    Math.abs(plan.width - barWidth),
    `the widest bar beside the grab-hold is ${plan.width}px, and the task drawn was ${barWidth}px`,
  ).toBeLessThan(24)

  expect(dummy.halves.length, 'FR-043 (MUST) draws the ダミーの印 1 つだけ').toBe(1)
  const step = dummy.width
  expect(
    step,
    `表 T-240 の DM-3 (MUST): ダミーを描く幅は進捗マーカーの径（S-22 ${S_22}px × 描く比 ` +
      `${DEFAULT_DISPLAY_RATIO}）× S-247 ${S_247} と S-180 ${S_180}px の小さい方であり、` +
      `${MARK_WIDTH_PX}px になる`,
  ).toBe(Math.round(MARK_WIDTH_PX))
  expect(
    dummy.height,
    `S-180: 縦の広がりは実績バーの帯に従う（S-4 ${S_4}px × 描く比 ` +
      `${DEFAULT_DISPLAY_RATIO} × zoomY ${S_76} × S-5 ${S_5}）ので ${MARK_HEIGHT_PX}px になる`,
  ).toBe(Math.round(MARK_HEIGHT_PX))

  // WHY: pressed a quarter into the mark -- inside GR-9's (start) half and
  // short of the centre pixel, which FR-043 routes to GR-17 (finish) instead.
  // WHY: a move no further than S-208 is a press, not a drag, so the product writes
  // WHY: nothing; the mark is a few px here, so three of them may not reach that boundary.
  const carriedPx = Math.max(steps * step, PRESS_OR_DRAG_PX + step)
  const from = { x: dummy.x + dummy.width / 4, y: dummy.y + dummy.height / 2 }
  await page.mouse.move(from.x, from.y)
  await page.waitForTimeout(250)
  await page.mouse.down()
  await page.mouse.move(from.x + carriedPx, from.y, { steps: 8 })
  await page.waitForTimeout(250)
  await page.mouse.up()
  await page.waitForTimeout(1000)

  return {
    planX: plan.x,
    planWidth: plan.width,
    step,
    carriedPx,
    after: await barsAround(page, dummy.y + dummy.height / 2),
  }
}

// WHY: proves only that a drop writes something -- not where -- so the
// DFC-182 case below cannot pass by dragging a gesture the product ignores.
test('control for DFC-182: dropping the dummy of an unstarted task writes an actual bar', async ({
  baseURL,
}) => {
  test.setTimeout(180_000)
  const app = await openTheApp(baseURL)
  const dropped = await dropTheDummy(app.page, 3)
  expect(
    dropped.after.length,
    'after the drop the row holds fewer than two bars, so no actual bar was drawn beside the plan',
  ).toBeGreaterThan(1)
  // WHY: catches the press landing on GR-3 (plan start) instead of the hold
  // -- a pinned case alone would not notice the plan bar moving instead.
  const plan = dropped.after[dropped.after.length - 1]
  expect(
    `${plan?.x ?? '?'}:${plan?.width ?? '?'}`,
    'the plan bar moved, so the press landed on the plan start point (GR-3) and not on the hold',
  ).toBe(`${dropped.planX}:${dropped.planWidth}`)
  await app.close()
})

// WHY: both complaints are collected and asserted together, so a run shows
// both instead of stopping at the first (FR-043 MUST / MUST NOT, both halves).
test('DFC-182: where the dummy is dropped decides where the actual starts', async ({ baseURL }) => {
  test.setTimeout(240_000)
  const near = await openTheApp(baseURL)
  const short = await dropTheDummy(near.page, 3)
  await near.close()
  const far = await openTheApp(baseURL)
  const long = await dropTheDummy(far.page, 8)
  await far.close()

  /** @purity pure */
  const actualOf = (one: Dropped): number => one.after[0]?.x ?? Number.NaN
  const complaints: string[] = []
  if (actualOf(short) === short.planX) {
    complaints.push(
      `carried ${short.carriedPx}px along, the actual bar starts at x=${actualOf(short)}, which ` +
        'is the plan start itself (FR-043 MUST NOT)',
    )
  }
  if (actualOf(short) === actualOf(long)) {
    complaints.push(
      `carried ${short.carriedPx}px and ${long.carriedPx}px, the actual bar landed at ` +
        `x=${actualOf(short)} both times (one step is ${short.step}px)`,
    )
  }
  expect(complaints, 'the drop position was ignored').toEqual([])
})

const DRAW_WIDTH_PX = 300

interface TypedInto {
  readonly tag: string
  readonly width: number
  readonly height: number
  readonly value: string
}

// WHY: a box of its own is part of the answer -- the shipped build keeps a
// 0x0 input in the page always, so focus alone does not mean anyone sees it.
/** @purity semi-pure-b */
async function focusedTypableField(page: Page): Promise<TypedInto | null> {
  return page.evaluate(
    /** @purity semi-pure-b */
    () => {
      const active = document.activeElement
      if (active === null) return null
      const tag = active.tagName
      const editable = (active as HTMLElement).isContentEditable === true
      const typed =
        tag === 'TEXTAREA' ||
        (tag === 'INPUT' && ['text', 'search', null, ''].includes(active.getAttribute('type')))
      if (!typed && !editable) return null
      const box = active.getBoundingClientRect()
      if (box.width < 1 || box.height < 1) return null
      return {
        tag,
        width: Math.round(box.width),
        height: Math.round(box.height),
        value: editable ? (active.textContent ?? '').trim() : (active as HTMLInputElement).value,
      }
    },
  )
}

// WHY: proves the drag itself still draws a shape, so the pinned DFC-232
// case below cannot pass because the gesture it drives reaches nothing.
test('control for DFC-232: a task dragged onto empty ground below the last row is drawn', async ({
  baseURL,
}) => {
  test.setTimeout(180_000)
  const app = await openTheApp(baseURL)
  await scrollToTheGround(app.page)
  const spot = await emptyCanvasPoint(app.page)
  expect(spot, 'no point on the canvas has empty ground under it').not.toBeNull()
  if (spot === null) {
    await app.close()
    return
  }

  expect(await pressEntrance(app.page, RECTANGLE_TASK), `${RECTANGLE_TASK} is not on the screen`).toBe(
    true,
  )
  const before = await censusOf(app.page)
  await app.page.mouse.move(spot.x, spot.y)
  await app.page.mouse.down()
  await app.page.mouse.move(spot.x + DRAW_WIDTH_PX, spot.y, { steps: 10 })
  await app.page.mouse.up()
  await app.page.waitForTimeout(1000)
  const after = await censusOf(app.page)
  expect(
    after.shapes,
    'dragging on empty ground below the last row drew nothing, so the pinned case on DFC-232 ' +
      'below would reach nothing',
  ).not.toBe(before.shapes)
  await app.close()
})

// WHY: FR-091 (MUST) is that a just-drawn task takes text input on the spot,
// not after re-selecting it and opening the Properties Panel as a second step.
test('DFC-232: a task drawn on empty ground leaves a name field under the keyboard', async ({
  baseURL,
}) => {
  test.setTimeout(180_000)
  const app = await openTheApp(baseURL)
  await scrollToTheGround(app.page)
  const spot = await emptyCanvasPoint(app.page)
  expect(spot, 'no point on the canvas has empty ground under it').not.toBeNull()
  if (spot === null) {
    await app.close()
    return
  }

  expect(await pressEntrance(app.page, RECTANGLE_TASK), `${RECTANGLE_TASK} is not on the screen`).toBe(
    true,
  )
  const before = await censusOf(app.page)
  await app.page.mouse.move(spot.x, spot.y)
  await app.page.mouse.down()
  await app.page.mouse.move(spot.x + DRAW_WIDTH_PX, spot.y, { steps: 10 })
  await app.page.mouse.up()
  await app.page.waitForTimeout(1000)
  const after = await censusOf(app.page)
  expect(
    after.shapes,
    `the drag on empty ground drew no new shape (${before.shapes} before, ${after.shapes} after), ` +
      'so this case never reached the moment FR-091 is about',
  ).not.toBe(before.shapes)

  try {
    const field = await focusedTypableField(app.page)
    expect(
      field,
      'right after the task was drawn nothing that takes text holds the keyboard, so FR-091 ' +
        '(MUST) is not met: 「作った直後に入力できること（MUST）」, and a person has to select ' +
        'the task again and open the Properties Panel -- the two steps the requirement forbids',
    ).not.toBeNull()
    if (field === null) return

    const typed = 'ZetaDrawnTask'
    await app.page.keyboard.type(typed)
    await app.page.waitForTimeout(400)
    const filled = await focusedTypableField(app.page)
    expect(
      filled?.value ?? null,
      `what was typed did not reach the field that held the keyboard (a ${field.tag} of ` +
        `${field.width}x${field.height}px), so the name cannot be entered on the spot`,
    ).toContain(typed)
  } finally {
    await app.close()
  }
})

// WHY: the width and height above are derived from these, so a reworded clause
// must break this file rather than quietly move what the cases admit.
const CLAUSES: readonly (readonly [string, string])[] = [
  [
    'T-023d closing (MUST) -- the hit area of GR-9 / GR-17 / GR-18 is the mark FR-043 draws',
    '⭐ `GR-9` / `GR-17` / `GR-18` の当たり判定は、`FR-043` が描いた印そのものとすること（MUST）。',
  ],
  [
    'T-023d closing (MUST NOT) -- that hit area is never a box wider than the mark',
    '⛔ ダミーの当たり判定を、描いた印より広い箱で取ってはならない（MUST NOT）',
  ],
]

const DM_3_THE_DRAWN_WIDTH =
  'ダミーを描く幅は、そのタスクの進捗マーカーの径に `_assets/tbl-settings.md` の 表 T-206 の `S-247` を掛けた幅と、同表の `S-180` の小さい方とすること（MUST）'

test('the manuscript still states the mark this file measures, word for word', () => {
  for (const [name, clause] of CLAUSES) {
    expect(REQUIREMENTS, name).toContain(clause)
  }
  expect(
    rowOf(specTable('T-240'), 'DM-3').cells[1] ?? '',
    'FR-043 table T-240 row DM-3 (MUST) is what the drawn width above is derived from',
  ).toContain(DM_3_THE_DRAWN_WIDTH)
})

// WHY: both files -- a settled row moves from defects.md to fixed-defects.md,
// and reading only the first once misread that move as a deletion.
const LEDGERS: readonly string[] = ['defects.md', 'fixed-defects.md']

// WHY: a pin on a settled row is not a fault -- it becomes the fix's own
// control -- so this only checks the row still exists in the ledger pair.
test('every defect pinned in this file is still a row of the ledger', () => {
  const written = LEDGERS.map((file) =>
    readFileSync(join(process.cwd(), 'docs', 'development-records', file), 'utf8'),
  )
  for (const pin of PINNED) {
    expect(
      written.some((ledger) => ledger.includes(`| ${pin.ledger} |`)),
      `${pin.ledger} is pinned by a System case but is a row of neither ${LEDGERS.join(' nor ')} ` +
        'under docs/development-records/ -- the row it was written for is gone',
    ).toBe(true)
  }
  // WHY: catches a copied-and-half-edited case pinning the same row twice.
  expect(new Set(PINNED.map((one) => one.ledger)).size, 'two pins name the same ledger row').toBe(
    PINNED.length,
  )
})
