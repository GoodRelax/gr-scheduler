// Pins for four OPEN rows of `docs/development-records/defects.md` -- the four
// the user pressed out of the shipped build on 2026-09-01, every one of which
// passed all 5570 automated tests on its way through.
//
//   D-06   a comment box cannot be placed at all
//   D-147  the entrance that hides the watermark is inert
//   ⛔ D-181 WAS PINNED HERE AND IS NOT ANY MORE. Measured 2026-09-02: it was
//     never a defect. The row bands do not move -- read before, during and
//     after the grab, all eight stand at the same y and the same height. What
//     exchanges is two LANES INSIDE one band, which is table T-014's ST-2
//     ordering 「start 昇順 -> finish 降順」 and ST-3's greedy pass doing exactly
//     what they say once the grabbed bar's start crosses a day. One Ctrl+Z puts
//     it back and one Ctrl+Y swaps it again -- a road with no pointer on it, so
//     the exchange belongs to the document and not to the holding of the grab.
//     ⚠️ A case asserting the bands DO hold still is worth writing from the
//     specification; it is not this file's job, because nothing here is open.
//   ⛔ D-182 WAS PINNED HERE AND IS NOT ANY MORE. It is fixed, so the case that
//     held it is an ordinary assertion now: the user's ruling of 2026-09-02
//     settled the two rows that disagreed (CR-328), FR-043 now writes 掴みシロ
//     を離した日 rather than a day derived from the plan, and `edit-task.ts`
//     and `input-command-translator.ts` carry the dropped day between them.
//     ⭐ Its control stays where it was: the pinned case is gone, the thing
//     that proves the pointer reaches the hold at all is still worth running.
//
// WHY THEY ARE HERE AND NOT IN `npm run parity`. That harness holds the
// application against
// `previous-project-result/11-row-controls/row-controls-sample.html`, move for
// move. ⛔ THAT SAMPLE IS A ROW CONTROLS SAMPLE: it has rows and nothing else
// -- no task bars, no schedule canvas to place a box on, no watermark. Not one
// of the four is a question it can be asked, so parity's own known-defect list
// is empty and says so on every run. These four need the running application.
//
// ⛔⛔ WHAT THIS FILE IS NOT. It declares no `swsCase`, and that is deliberate.
// Table T-219 (row TW-2) has Chapter 9's cases GENERATED from the declarations
// a case carries, so every `swsCase` becomes a node of the specification's own
// test chapter. A case that is EXPECTED TO FAIL must never become one: the
// specification would then carry a node asserting that the product is broken,
// which is a statement about today's build and not about the software. The
// rows these cases lean on are named in prose instead, at each case.
//
// ⭐ HOW A PIN IS BUILT HERE, AND WHY IT COMES IN PAIRS.
//
//   * the pinned case asserts the CORRECT behaviour and is marked `test.fail()`
//     -- Playwright's expected-to-fail. While the defect is open the suite is
//     green. ⭐ THE DAY THE DEFECT IS FIXED THE CASE PASSES, AND PLAYWRIGHT
//     THEN REPORTS IT AS A FAILURE: "expected to fail, but passed". So the pin
//     cannot rot into a case that quietly succeeds for ever.
//   * ⛔ AN EXPECTED-TO-FAIL CASE CANNOT GUARD ITSELF. Every failure inside it
//     counts as the expected one, including a probe that reached nothing --
//     which is exactly how a pin turns into a case that tests nothing. So each
//     pinned case is preceded by a CONTROL case, not marked `test.fail()`,
//     which drives the same pointer over the same part of the same screen and
//     asserts that the product answered. The control is green today and stays
//     green after the fix; if it goes red, the probe is broken, not the
//     product.
//
// ⭐ EACH CASE SAYS WHAT WOULD MAKE IT GO RED, in the sentence above its body.
//
// ⭐ NOTHING HERE COPIES A VALUE OUT OF THE SPECIFICATION, and there is nothing
// to copy: every assertion is a comparison of the product against ITSELF a
// moment earlier -- what the drawing held before a press and after it, where a
// label stood before a grab and during it. Chapter 1.9 (`:275`) asks a test
// that verifies a requirement pointing at a table to be driven by data copied
// from that table; these cases verify no table, they hold a ledger row.
//
// ⭐ WHAT IS READ OUT OF THE TREE. Two things, and both are there to stop a pin
// outliving what it pins: the screen of the base environment (table T-025, row
// `MC-6`, through `screenOf`), and the ledger itself -- the last case fails if
// a row pinned here has left `docs/development-records/defects.md`, which is
// where a fixed row goes.

import { expect, test, type Browser, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { specTable, type SpecTable } from '../contract/spec-table'
import { launchReferenceBrowser, readSettledDrawnSvg, screenOf } from './live-app'
import { rowOf } from './sws-case'

// ---------------------------------------------------------------------------
// What each case pins
// ---------------------------------------------------------------------------

/** One row of the ledger, and the one line this file holds it to. */
interface Pin {
  readonly ledger: string
  readonly wrong: string
}

const D06: Pin = {
  ledger: 'D-06',
  wrong:
    'the comment box entrance arms, the canvas answers the pointer, and a press ' +
    'and a drag on empty canvas draw nothing and raise no notice',
}

const D147: Pin = {
  ledger: 'D-147',
  wrong:
    'the entrance that hides the watermark is drawn enabled, and pressing it ' +
    'changes nothing on the screen and raises no notice',
}


const PINNED: readonly Pin[] = [D06, D147]

/**
 * Say, on the run's own output, which ledger row this case is holding.
 *
 * ⭐ Printed rather than only annotated. A pinned case is GREEN today, so it
 * scrolls past in the summary with everything else; the one thing that must
 * not be missable is that the suite is green because a defect is open.
 *
 * @purity non-pure
 */
function announce(pin: Pin, what: string): void {
  // eslint-disable-next-line no-console
  console.log(`\n[OPEN DEFECT ${pin.ledger}] ${what}\n    ${pin.wrong}`)
  test.info().annotations.push({ type: 'open defect', description: `${pin.ledger}: ${pin.wrong}` })
}

// ---------------------------------------------------------------------------
// The screen, read out of the specification at read time
// ---------------------------------------------------------------------------

const T025: SpecTable = specTable('T-025')

/** The row of table T-025 that fixes the screen of the base environment. */
const SCREEN_ROW = 'MC-6'

const BASE_SCREEN = screenOf(rowOf(T025, SCREEN_ROW))

// ---------------------------------------------------------------------------
// Driving the running application
// ---------------------------------------------------------------------------

let browser: Browser | null = null

test.beforeAll(async () => {
  browser = await launchReferenceBrowser()
})

test.afterAll(async () => {
  await browser?.close()
})

/** The browser opened for this file, or a failure that says it was not. @purity semi-pure-b */
function openedBrowser(): Browser {
  if (browser === null) throw new Error('the reference browser was not opened')
  return browser
}

/** Where the dev server the configuration declares is listening. @purity pure */
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

/**
 * The application, up and settled, on the screen of the base environment.
 *
 * @purity non-pure
 */
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

/**
 * ⛔ THE SAME HANDLE `tests/system/live-app.ts` LEANS ON, and no other. Nothing
 * in the specification says how a part is marked in the page; the shell writes
 * the part's settled name, and a change to that marking breaks these cases,
 * as it should.
 */
const CANVAS = '[data-role="Schedule Canvas"] svg'
const NOTICES = '[data-role="Notification Area"]'
const PANEL = '[data-role="Row Title Panel"]'

/** A box the page reported, in the page's own pixels. */
interface Box {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

/**
 * What the screen is holding right now: how many of each shape the drawing has,
 * and whatever the notification area is saying.
 *
 * ⭐ Counts and not the markup. What every one of these four is accused of is
 * doing NOTHING, and "nothing happened" is exactly what a census answers
 * without needing to know what the right something would have looked like.
 *
 * @purity semi-pure-b
 */
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

/**
 * Press an entrance of table T-109 with a real pointer.
 *
 * ⛔ A REAL POINTER, not `element.click()`. The shell reads the pointer, and a
 * synthetic click has reached nothing in this project before.
 *
 * @purity non-pure
 */
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

/** Whether the entrance stands armed (FR-029 writes it beside the entry). @purity semi-pure-b */
async function armingOf(page: Page, icon: string): Promise<string | null> {
  return page.evaluate(
    /** @purity semi-pure-b */
    (wanted: string) =>
      document.querySelector(`[data-icon="${wanted}"]`)?.getAttribute('data-armed') ?? null,
    icon,
  )
}

/**
 * Take the view to the end of the document, so that the ground below the last
 * row is on screen.
 *
 * ⭐ Wheeled rather than jumped. There is no settled handle for the scroll
 * position, and the wheel is what a person turns.
 *
 * @purity non-pure
 */
async function scrollToTheGround(page: Page): Promise<void> {
  await page.mouse.move(BASE_SCREEN.width / 2, BASE_SCREEN.height / 2)
  for (let turn = 0; turn < 30; turn += 1) await page.mouse.wheel(0, 900)
  await page.waitForTimeout(900)
}

/**
 * A point on the canvas with nothing drawn under it.
 *
 * ⛔ FOUND BY ASKING THE PAGE, not by a coordinate written here. `elementFromPoint`
 * returning the drawing itself is the page's own answer that nothing is in the
 * way -- a coordinate would have to be re-measured every time the screen or the
 * starting document moved.
 *
 * @purity semi-pure-b
 */
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
          // ⚠️ Room to the right as well: the drag below runs that way, and a
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




/** A faint pair of grab-holds, and where each half of it stands. */
interface FaintHold extends Box {
  /** The left edge of each half, in the order they are drawn. */
  readonly halves: readonly number[]
}

/**
 * The faint grab-holds a task that has not started yet is drawn with.
 *
 * ⭐ Found by how faint they are, which is the one thing `FR-043` says about
 * them that a browser can measure without this file copying a number:
 * everything else on the canvas is drawn solid.
 *
 * ⭐ THE TWO HALVES ARE REPORTED SEPARATELY, and they are what gives the case
 * below a unit to measure a drop in. `FR-043` puts the end hold `S-129` beyond
 * the start hold -- one working day at the value that setting comes with -- so
 * the gap between them is a distance the PRODUCT chose, not one written here.
 *
 * @purity semi-pure-b
 */
async function faintHolds(page: Page): Promise<FaintHold[]> {
  return page.evaluate(
    /** @purity semi-pure-b */
    (canvas: string) => {
      const svg = document.querySelector(canvas)
      if (svg === null) return []
      const out: FaintHold[] = []
      for (const element of Array.from(svg.querySelectorAll('g'))) {
        if (Number(getComputedStyle(element).opacity) > 0.4) continue
        const box = element.getBoundingClientRect()
        if (box.width < 4 || box.x < 0 || box.x > window.innerWidth - 4) continue
        if (box.y < 60 || box.y + box.height > window.innerHeight - 4) continue
        out.push({
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
    CANVAS,
  )
}

/** The solid bars sitting in one row band, left edge and width. @purity semi-pure-b */
async function barsAround(page: Page, y: number): Promise<Array<{ x: number; width: number; height: number }>> {
  return page.evaluate(
    /** @purity semi-pure-b */
    (asked: { canvas: string; y: number }) => {
      const svg = document.querySelector(asked.canvas)
      if (svg === null) return []
      return Array.from(svg.querySelectorAll('polygon'))
        .map((one) => one.getBoundingClientRect())
        .filter((box) => Math.abs(box.y + box.height / 2 - asked.y) < 24 && box.width >= 4)
        .map((box) => ({
          x: Math.round(box.x),
          width: Math.round(box.width),
          height: Math.round(box.height),
        }))
        .sort((one, two) => one.height - two.height)
    },
    { canvas: CANVAS, y },
  )
}

/** Entrances of table T-109 these cases press, by the row that names them. */
const RECTANGLE_TASK = 'IC-23'
const COMMENT_BOX = 'IC-35'
const HIDE_WATERMARK = 'IC-41'
const DATE_RULES = 'IC-42'

// ---------------------------------------------------------------------------
// D-147 -- the entrance that hides the watermark is inert
// ---------------------------------------------------------------------------

// GOES RED IF: the neighbouring entrance stops answering a press -- either the
// entrance moved, or the pointer this file drives stopped reaching the palette.
// It has nothing to say about D-147 itself; it is here so that the pinned case
// below cannot pass by failing to press anything.
test('control for D-147: a neighbouring entrance of the same palette group answers a press', async ({
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
      'at all and the pin on D-147 below would be worthless',
  ).not.toBe(before.shapes)
  await app.close()
})

// GOES RED IF: D-147 is fixed. Playwright then reports "expected to fail, but
// passed" and this entry has to be taken out. Nothing else makes it pass: the
// press either changes what is on the screen or the notification area says why
// it cannot, and today it does neither.
test('D-147: pressing the entrance that hides the watermark either does something or says why not', async ({
  baseURL,
}) => {
  test.fail()
  test.setTimeout(180_000)
  announce(D147, 'pressing the watermark entrance')
  const app = await openTheApp(baseURL)
  const before = await censusOf(app.page)
  expect(await pressEntrance(app.page, HIDE_WATERMARK), `${HIDE_WATERMARK} is not on the screen`).toBe(
    true,
  )
  const after = await censusOf(app.page)
  const answered = after.shapes !== before.shapes || after.notice !== before.notice
  try {
    // FR-029 (MUST): an entrance that is pressed and cannot act must tell the
    // author why. So "nothing changed AND nothing was said" is the one answer
    // the specification does not allow, whatever the watermark itself does.
    expect(
      answered,
      `${HIDE_WATERMARK} was pressed: the drawing is unchanged (${after.shapes}) and the ` +
        'notification area is empty',
    ).toBe(true)
  } finally {
    await app.close()
  }
})

// ---------------------------------------------------------------------------
// D-06 -- a comment box cannot be placed at all
// ---------------------------------------------------------------------------

// GOES RED IF: the canvas stops answering an armed entrance at all, or the spot
// this file drags on stops being empty ground. It says nothing about D-06; it
// proves that the point, the arming and the drag below are a gesture the
// product does respond to.
test('control for D-06: with the rectangle entrance armed, the same drag on the same spot draws', async ({
  baseURL,
}) => {
  test.setTimeout(180_000)
  const app = await openTheApp(baseURL)
  await scrollToTheGround(app.page)
  const spot = await emptyCanvasPoint(app.page)
  expect(spot, 'no point on the canvas has empty ground under it').not.toBeNull()
  if (spot === null) return

  expect(await pressEntrance(app.page, RECTANGLE_TASK), `${RECTANGLE_TASK} is not on the screen`).toBe(
    true,
  )
  expect(await armingOf(app.page, RECTANGLE_TASK), `${RECTANGLE_TASK} did not arm`).toBe('true')

  const before = await censusOf(app.page)
  await app.page.mouse.move(spot.x, spot.y)
  await app.page.mouse.down()
  await app.page.mouse.move(spot.x + 160, spot.y, { steps: 10 })
  await app.page.mouse.up()
  await app.page.waitForTimeout(900)
  const after = await censusOf(app.page)
  expect(
    after.shapes,
    'an armed entrance and a drag on empty canvas drew nothing, so the probe the pin on D-06 ' +
      'below uses reaches nothing',
  ).not.toBe(before.shapes)
  await app.close()
})

// GOES RED IF: D-06 is fixed -- a comment box is drawn where the drag was made,
// or the product says why it cannot place one. Today the census is byte for
// byte identical after both a press and a drag, and the notification area stays
// empty, while the entrance itself reports `data-armed=true`.
test('D-06: with the comment box entrance armed, a press and a drag on empty canvas place one', async ({
  baseURL,
}) => {
  test.fail()
  test.setTimeout(180_000)
  announce(D06, 'placing a comment box on empty canvas')
  const app = await openTheApp(baseURL)
  await scrollToTheGround(app.page)
  const spot = await emptyCanvasPoint(app.page)
  expect(spot, 'no point on the canvas has empty ground under it').not.toBeNull()
  if (spot === null) return

  expect(await pressEntrance(app.page, COMMENT_BOX), `${COMMENT_BOX} is not on the screen`).toBe(true)
  // ⚠️ The arming is asserted BEFORE the gesture on purpose. It is the half of
  // D-06 that already works, and a pinned case that failed here would be
  // pinning something else entirely.
  expect(await armingOf(app.page, COMMENT_BOX), `${COMMENT_BOX} did not arm`).toBe('true')

  const before = await censusOf(app.page)
  await app.page.mouse.move(spot.x, spot.y)
  await app.page.mouse.down()
  await app.page.mouse.up()
  await app.page.waitForTimeout(700)
  const pressed = await censusOf(app.page)

  await app.page.mouse.move(spot.x, spot.y)
  await app.page.mouse.down()
  await app.page.mouse.move(spot.x + 160, spot.y + 60, { steps: 10 })
  await app.page.mouse.up()
  await app.page.waitForTimeout(900)
  const dragged = await censusOf(app.page)

  const answered =
    pressed.shapes !== before.shapes ||
    dragged.shapes !== before.shapes ||
    dragged.notice !== before.notice
  try {
    expect(
      answered,
      `${COMMENT_BOX} armed, then pressed and dragged at (${spot.x}, ${spot.y}): the drawing is ` +
        `unchanged (${before.shapes}) and the notification area is empty`,
    ).toBe(true)
  } finally {
    await app.close()
  }
})

// ---------------------------------------------------------------------------
// D-182 -- a bar's dummy ignores where it is dropped
// ---------------------------------------------------------------------------

interface Dropped {
  /** The left edge of the plan bar the dummy belongs to. */
  readonly planX: number
  /** How wide that plan bar was drawn, before the hold was touched. */
  readonly planWidth: number
  /** The gap the product draws between the two grab-holds -- see `faintHolds`. */
  readonly step: number
  /** How far the hold was dragged before it was let go. */
  readonly carriedPx: number
  /** The bars in that row after the drop, shortest first: the actual, then the plan. */
  readonly after: ReadonlyArray<{ x: number; width: number; height: number }>
}

/**
 * Draw a task that has not started, then drag its actual-start grab-hold
 * `steps` of the product's own spacing to the right, and let go.
 *
 * ⭐ A TASK DRAWN HERE AND NOT ONE OUT OF THE STARTING DOCUMENT. Every task
 * that has not started in that document is drawn off the right of the screen at
 * the zoom the application comes up at, so its hold cannot be reached with a
 * pointer at all. One drawn on the ground below the last row is in view, at the
 * same zoom, with its own plan start to measure against.
 *
 * ⛔ NOT A NUMBER OF PIXELS WRITTEN HERE. The distance is counted in the gap
 * the product itself draws between the start hold and the end hold -- `FR-043`
 * puts the second `S-129` beyond the first -- so this file spells no width and
 * no zoom, and a change to either moves the drag with it.
 *
 * ⚠️ NOT COUNTED FROM THE PLAN START. `GR-9` says the start hold stands one
 * working day past the plan start; measured on two screens, the product draws
 * it there on one and on the plan start itself on the other. That is not what
 * this file pins, so it leans on the gap between the two holds instead, which
 * held on both.
 *
 * @purity non-pure
 */
async function dropTheDummy(page: Page, steps: number): Promise<Dropped> {
  await scrollToTheGround(page)
  const spot = await emptyCanvasPoint(page)
  expect(spot, 'no point on the canvas has empty ground under it').not.toBeNull()
  if (spot === null) throw new Error('unreachable')

  // ⛔ WHICH GRAB-HOLDS WERE THERE BEFORE. The starting document has unstarted
  // tasks of its own, and one of their holds can be on screen. Taking "the
  // first faint thing drawn" measured a hold belonging to somebody else's bar
  // and read a day width of zero out of it.
  const already = new Set((await faintHolds(page)).map((one) => `${one.x}:${one.y}`))

  expect(await pressEntrance(page, RECTANGLE_TASK), `${RECTANGLE_TASK} is not on the screen`).toBe(true)
  const barWidth = 300
  await page.mouse.move(spot.x, spot.y)
  await page.mouse.down()
  await page.mouse.move(spot.x + barWidth, spot.y, { steps: 10 })
  await page.mouse.up()
  await page.waitForTimeout(1000)

  const fresh = (await faintHolds(page)).filter((one) => !already.has(`${one.x}:${one.y}`))
  expect(
    fresh.length,
    'drawing a task put no NEW faint grab-hold on the screen, so it is not being drawn unstarted',
  ).toBe(1)
  const dummy = fresh[0]
  if (dummy === undefined) throw new Error('unreachable')

  // ⭐ The widest bar in that band is the plan bar. The hold's own two halves
  // are drawn in the same band and are a fraction of its width.
  const beside = await barsAround(page, dummy.y + dummy.height / 2)
  const plan = beside.slice().sort((one, two) => two.width - one.width)[0]
  expect(plan, 'the task drawn has no plan bar beside its grab-hold').not.toBeUndefined()
  if (plan === undefined) throw new Error('unreachable')
  expect(
    Math.abs(plan.width - barWidth),
    `the widest bar beside the grab-hold is ${plan.width}px, and the task drawn was ${barWidth}px`,
  ).toBeLessThan(24)

  expect(dummy.halves.length, 'the grab-hold is not drawn as the two FR-043 asks for').toBe(2)
  const step = (dummy.halves[1] ?? 0) - (dummy.halves[0] ?? 0)
  expect(step, 'the two grab-holds are drawn on top of each other, so there is no unit to drag in')
    .toBeGreaterThan(0)

  // ⛔⛔ THE MIDDLE OF THE PAIR, AND IT IS MEASURED, NOT CHOSEN FOR TIDINESS.
  // The two holds overlap; FR-043 gives the overlap to the START hold, which is
  // the one wanted. ⚠️ Nearer the left edge is NOT the start hold: table
  // T-023d puts GR-3, the plan start point, above GR-9, so it takes the press
  // there. Measured on the shipped build, counting from the start hold's own
  // left edge with one step drawn 6px wide: at +3px and +6px the PLAN bar moved
  // and no actual was written at all; at +9px through +15px the actual was
  // written and the plan bar did not move; at +18px the END hold took it and
  // the actual came out the width of the whole drag. The middle of the pair
  // lands in the middle of that window.
  const carriedPx = steps * step
  const from = { x: dummy.x + dummy.width / 2, y: dummy.y + dummy.height / 2 }
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

// GOES RED IF: the dummy stops being reachable, or letting go of it stops
// writing anything. It says nothing about WHERE the actual lands; it proves
// that the drag below is a gesture the product accepts and acts on.
test('control for D-182: dropping the dummy of an unstarted task writes an actual bar', async ({
  baseURL,
}) => {
  test.setTimeout(180_000)
  const app = await openTheApp(baseURL)
  const dropped = await dropTheDummy(app.page, 3)
  expect(
    dropped.after.length,
    'after the drop the row holds fewer than two bars, so no actual bar was drawn beside the plan',
  ).toBeGreaterThan(1)
  // ⛔⛔ AND IT WAS THE HOLD THAT WAS GRABBED, NOT THE PLAN START POINT BESIDE
  // IT. Table T-023d puts GR-3 above GR-9, so a press a few pixels too far left
  // moves the plan bar instead -- measured, and it wrote no actual at all. A
  // pinned case cannot notice that on its own; this is where it is caught.
  const plan = dropped.after[dropped.after.length - 1]
  expect(
    `${plan?.x ?? '?'}:${plan?.width ?? '?'}`,
    'the plan bar moved, so the press landed on the plan start point (GR-3) and not on the hold',
  ).toBe(`${dropped.planX}:${dropped.planWidth}`)
  await app.close()
})

// GOES RED IF: the drop position stops being read, or the actual start goes
// back to the plan start. Two things are asked:
//   * FR-043 (MUST NOT) forbids the actual start being put on the plan start
//     itself, because the plan start point (GR-3) already stands there and the
//     two would stop being tellable apart.
//   * dragging the hold three steps along and eight steps along must not write
//     the same thing. 「掴んで置く値は、実績開始日 ＝ 掴みシロを離した日」
//     (MUST, 利用者の裁定 2026-09-02), and ⛔ the same requirement forbids that
//     being read as one rule with 「ダミーを描く位置は、予定の開始日の翌稼働
//     日」 (MUST NOT) -- reading them as one is exactly what made both drops
//     write the same day.
// ⭐ BOTH ARE COLLECTED AND ASSERTED TOGETHER, so that a run shows both rather
// than stopping at the first.
// ⚠️ THIS CASE WAS `test.fail()` UNTIL 2026-09-02 and held ledger row D-182.
// Measured on the shipped build with one day 6px wide: +3 steps and +8 steps
// both put the actual at x=254 before, and put it at two different x's after.
test('D-182: where the dummy is dropped decides where the actual starts', async ({ baseURL }) => {
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

// ---------------------------------------------------------------------------
// The pins themselves
// ---------------------------------------------------------------------------

// GOES RED IF: a row pinned here has left the ledger -- which is what happens to
// a row once it is fixed and moved on to `fixed-defects.md`. At that moment the
// case above it should already have gone red for passing; this is the second
// net, for the case where somebody deletes the pin's subject and not the pin.
test('every defect pinned in this file is still an open row of the ledger', () => {
  const ledger = readFileSync(
    join(process.cwd(), 'docs', 'development-records', 'defects.md'),
    'utf8',
  )
  for (const pin of PINNED) {
    expect(
      ledger.includes(`| ${pin.ledger} |`),
      `${pin.ledger} is pinned by a case in this file but is no longer a row of ` +
        'docs/development-records/defects.md -- if it was fixed, take the pin out',
    ).toBe(true)
  }
  // ⚠️ Every pin is spelled once, so a copied-and-half-edited case cannot pin
  // the same row twice and leave another with none.
  expect(new Set(PINNED.map((one) => one.ledger)).size, 'two pins name the same ledger row').toBe(
    PINNED.length,
  )
})
