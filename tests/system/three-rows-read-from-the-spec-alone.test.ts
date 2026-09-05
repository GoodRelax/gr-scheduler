// Three rows of the specification, measured on the shipped build by a reader
// who was allowed `docs/spec/` and nothing else.
//
//   S-132  (table T-217, `_assets/tbl-settings.md`) -- the corner radius a
//          highlight box is drawn with. `FR-019` (MUST) sends the value to
//          table T-217 and holds it steady across zoom.
//
//   SK-3   (table T-036, `01-04-requirements.md`) -- `Delete` / `Backspace`
//          delete what is selected, and send the whole of what that means to
//          row `SL-1` of table T-023c. `SL-1` names five kinds and rules a row
//          (`TaskGroup`) out of them.
//
//   IN-4   (table T-028, `01-04-requirements.md`) -- `Esc` consumes ONE tier at
//          a time, in an order the row itself sets out, from a raised notice
//          down to a shown explanation.
//
// ⛔ NO SENTENCE OF THE MANUSCRIPT IS QUOTED OR TRANSLATED IN THIS FILE. Rule
// 03 section 5 asks for the row ID instead, so every claim below cites the row
// that carries it and the reader goes to `docs/spec` for the wording.
//
// ⭐ EVERY NUMBER AND EVERY ROW ID ASSERTED IS READ OUT OF `docs/spec` AT READ
// TIME. Chapter 1.9 asks that of a case verifying a requirement that points at
// a table: the corner radius, the distance that parts a press from a drag, the
// two keys of `SK-3`, and which entrance arms which holding are all taken from
// the manuscript, so moving a value there moves this file with it. Nothing here
// is a number read off the running application.
//
// ⛔ NO `swsCase` IS DECLARED. Table T-219 row `TW-2` has Chapter 9's cases
// generated from those declarations and hung from an `SWS-xxx` node of Chapter
// 6.1, and none of today's `SWS-` nodes is about a corner radius, a delete key
// or the `Esc` tiers. The rows each case leans on are named in prose at the
// case instead, the way `tests/system/user-reported-fixes.test.ts` does.
//
// ⛔ WHAT IS PRESSED IS THE SHIPPED BUILD -- `dist/index.html` over `file://`,
// as `tests/system/measured-sweep.test.ts` presses it. `NFR-004` row `CN-1`
// has `dist/` hold exactly one file; this file only opens it.
//
// ⭐ EACH CASE SAYS WHAT WOULD MAKE IT GO RED, in the sentence above its body.

import { expect, test, type Browser, type Page } from '@playwright/test'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { specTable, type SpecTable } from '../contract/spec-table'
import { CLEARING_UP_MS, launchReferenceBrowser, readSettledDrawnSvg, screenOf } from './live-app'
import { rowOf } from './sws-case'

// ---------------------------------------------------------------------------
// What the specification says, read at read time
// ---------------------------------------------------------------------------

const T023B: SpecTable = specTable('T-023b')
const T023C: SpecTable = specTable('T-023c')
const T025: SpecTable = specTable('T-025')
const T028: SpecTable = specTable('T-028')
const T036: SpecTable = specTable('T-036')
const T109: SpecTable = specTable('T-109')
const T206: SpecTable = specTable('T-206')
const T217: SpecTable = specTable('T-217')

/** The first number written in a cell. @purity pure */
function numberIn(cell: string, what: string): number {
  const found = /-?\d+(?:\.\d+)?/.exec(cell.replace(/`/g, ''))
  const value = Number(found?.[0] ?? '')
  if (!Number.isFinite(value)) {
    throw new Error(`${what} states no number this file can read: ${JSON.stringify(cell)}`)
  }
  return value
}

/**
 * One cell of a row, taken by position, with the table's shape guarded.
 *
 * ⭐ By position and not by heading: the headings of these tables are Japanese
 * and rule 03 section 5 keeps this tree ASCII. A table that gains or loses a
 * column fails loudly here rather than silently reading the wrong cell.
 *
 * @purity pure
 */
function cellOf(table: SpecTable, id: string, column: number, columns: number): string {
  const row = rowOf(table, id)
  if (row.cells.length !== columns) {
    throw new Error(
      `table ${table.id} row ${id} has ${row.cells.length} cells after the row ID, not the ` +
        `${columns} this file reads by position -- a column was added or taken away`,
    )
  }
  return row.cells[column] ?? ''
}

/** The screen of the base environment: table T-025, row `MC-6`. */
const BASE_SCREEN = screenOf(rowOf(T025, 'MC-6'))

// Table T-217 holds six cells after the row ID -- key, type, default, floor,
// ceiling, meaning -- with the default in the third.
const T217_COLUMNS = 6
const T217_DEFAULT = 2

/**
 * `S-132` (`cornerRadiusPx`) of table T-217: the corner radius of a highlight
 * box, which `FR-019` (MUST) has drawn the same at every zoom.
 */
const CORNER_RADIUS_PX = numberIn(
  cellOf(T217, 'S-132', T217_DEFAULT, T217_COLUMNS),
  'table T-217 row S-132',
)

// Table T-206 holds three cells after the row ID -- key, default, meaning.
const T206_COLUMNS = 3
const T206_DEFAULT = 1

/**
 * `S-208` of table T-206: the travel that parts a press from a drag, which
 * `FR-019` (MUST) names as the boundary for placing a highlight box.
 */
const PRESS_OR_DRAG_PX = numberIn(
  cellOf(T206, 'S-208', T206_DEFAULT, T206_COLUMNS),
  'table T-206 row S-208',
)

/**
 * The keys table T-036 row `SK-3` assigns, read out of the assignment cell.
 *
 * ⛔ NOT WRITTEN OUT HERE. The row's assignment column is the one home of the
 * spelling (`R3.4`), and it names `Delete` and `Backspace` today -- so what the
 * loop below presses is whatever that cell names. A row that gains a third key
 * gains a run of these cases without this file being touched.
 *
 * @purity pure
 */
function keysOfSk3(): readonly string[] {
  // Table T-036 holds three cells after the row ID -- what the key does, the
  // assignment, and the entrance the assignment moves.
  const said = cellOf(T036, 'SK-3', 1, 3)
  const found = [...said.matchAll(/`([A-Za-z0-9+ ]+)`/g)].map((one) => (one[1] ?? '').trim())
  if (found.length === 0) {
    throw new Error(`table T-036 row SK-3 names no key this file can read: ${JSON.stringify(said)}`)
  }
  return found
}

const SK3_KEYS = keysOfSk3()

/**
 * The manuscript's spelling of a key, in the spelling the driver answers to.
 *
 * ⛔ A SPELLING MAP AND NOTHING MORE. Table T-036 writes the modifier as
 * `Ctrl`, which is what a keyboard prints on itself; the driver's own name for
 * the same key is `Control`. No assignment is decided here -- which keys are
 * pressed still comes out of the table.
 *
 * @purity pure
 */
function asDriven(spelling: string): string {
  return spelling
    .replace(/\s*\+\s*/g, '+')
    .split('+')
    .map((part) => (part === 'Ctrl' ? 'Control' : part))
    .join('+')
}

/** `SK-2` -- selects everything table T-023c row `SL-1` says can be selected. */
const SK2_KEY = (() => {
  const found = /`([^`]+)`/.exec(cellOf(T036, 'SK-2', 1, 3))
  if (found === null) throw new Error('table T-036 row SK-2 names no key this file can read')
  return asDriven(found[1] ?? '')
})()

/**
 * `IC-74` -- the one entrance of table T-109 whose rule is table T-051 row
 * `HF-10`, the one at the head of the Row Title Panel that unfolds every row.
 *
 * ⚠️ Anchored so that `HF-1` cannot be found by asking for `HF-10`.
 */
const UNFOLD_ALL_ENTRANCE = (() => {
  const wanted = /HF-10(?![0-9])/
  const found = T109.rows.filter((row) => row.cells.some((cell) => wanted.test(cell)))
  if (found.length !== 1) {
    throw new Error(
      `table T-109 has ${found.length} entrances whose rule is HF-10, and this file needs one`,
    )
  }
  return found[0]?.id ?? ''
})()

/** `SK-13` -- opens the help, which is one of the faces `S-99g` counts. */
const SK13_KEY = (() => {
  const found = /`([^`]+)`/.exec(cellOf(T036, 'SK-13', 1, 3))
  if (found === null) throw new Error('table T-036 row SK-13 names no key this file can read')
  return asDriven(found[1] ?? '')
})()

// The two Japanese words that name the holdings of table T-023b this file arms.
// ⚠️ Built from their code points rather than written out: rule 03 section 5
// keeps this tree ASCII, and `tests/system/rows-fixed-with-nothing-holding-them
// .test.ts` gives the same reason for the same two words.
/** U+30CF U+30A4 U+30E9 U+30A4 U+30C8 U+30DC U+30C3 U+30AF U+30B9 -- the highlight box. */
const HIGHLIGHT_BOX_WORD = String.fromCharCode(
  0x30cf, 0x30a4, 0x30e9, 0x30a4, 0x30c8, 0x30dc, 0x30c3, 0x30af, 0x30b9,
)
/** U+30B3 U+30E1 U+30F3 U+30C8 U+30DC U+30C3 U+30AF U+30B9 -- the comment box. */
const COMMENT_BOX_WORD = String.fromCharCode(
  0x30b3, 0x30e1, 0x30f3, 0x30c8, 0x30dc, 0x30c3, 0x30af, 0x30b9,
)

/**
 * The entrance of table T-109 that arms one holding of table T-023b.
 *
 * ⛔ NOT FOUND BY THE WORD ALONE: table T-109 prints the comment box's name in
 * the purpose of two entrances -- one arms it, one edits its text. ⭐ The
 * last column of table T-109 names the `AR-nn` an entrance arms, so the holding
 * is looked up in table T-023b first and the entrance by that row ID.
 *
 * @purity pure
 */
function entranceArming(holding: string): string {
  const armed = T023B.rows.filter((row) => (row.cells[0] ?? '').includes(holding))
  if (armed.length !== 1) {
    throw new Error(`table T-023b has ${armed.length} holdings named ${JSON.stringify(holding)}`)
  }
  const wanted = new RegExp(`${armed[0]?.id ?? ''}(?![0-9])`)
  const found = T109.rows.filter((row) => wanted.test(row.cells[row.cells.length - 1] ?? ''))
  if (found.length !== 1) {
    throw new Error(
      `table T-109 has ${found.length} entrances arming ${armed[0]?.id ?? ''}, and this file ` +
        'needs exactly one',
    )
  }
  return found[0]?.id ?? ''
}

/** `IC-36` -- the entrance arming row `AR-6` of table T-023b, the highlight box. */
const HIGHLIGHT_BOX_ENTRANCE = entranceArming(HIGHLIGHT_BOX_WORD)
/** `IC-35` -- the entrance arming row `AR-5` of table T-023b, the comment box. */
const COMMENT_BOX_ENTRANCE = entranceArming(COMMENT_BOX_WORD)

/**
 * A guard, not an assertion: `SL-1` of table T-023c must still say that a row
 * is NOT among what can be selected, because that sentence is the whole of what
 * the third case of the `SK-3` block below judges.
 *
 * ⚠️ U+884C U+FF08 -- the two characters that open the clause ruling a row out.
 * Matched by code point, and paired with `TaskGroup` so that the clause is
 * found rather than the word for a row on its own.
 */
const ROW_IS_NOT_A_TARGET = (() => {
  const said = rowOf(T023C, 'SL-1').cells.join(' ')
  const opening = String.fromCharCode(0x884c, 0xff08)
  return said.includes(opening) && said.includes('TaskGroup')
})()

/**
 * The tiers `IN-4` consumes, in the order the row writes them.
 *
 * ⭐ Read out of the cell so that the ORDER asserted below is the manuscript's
 * and not one copied into this file. The words are matched by their code
 * points, for the same ASCII reason as above.
 */
const ESC_TIERS: readonly { readonly key: string; readonly word: string }[] = [
  // U+51FA U+3066 U+3044 U+308B U+901A U+77E5 -- a raised notice
  { key: 'notice', word: String.fromCharCode(0x51fa, 0x3066, 0x3044, 0x308b, 0x901a, 0x77e5) },
  // U+958B U+3044 U+3066 U+3044 U+308B U+9762 -- an open face
  { key: 'face', word: String.fromCharCode(0x958b, 0x3044, 0x3066, 0x3044, 0x308b, 0x9762) },
  // U+69CB U+3048 -- a holding
  { key: 'holding', word: String.fromCharCode(0x69cb, 0x3048) },
]

/**
 * Where each tier this file drives stands in `IN-4`'s own order.
 *
 * @purity pure
 */
function escOrderOf(key: string): number {
  const said = rowOf(T028, 'IN-4').cells.join(' ')
  const tier = ESC_TIERS.find((one) => one.key === key)
  if (tier === undefined) throw new Error(`no tier named ${key}`)
  const at = said.indexOf(tier.word)
  if (at < 0) {
    throw new Error(`table T-028 row IN-4 no longer names the tier ${key}, so its order is unknown`)
  }
  return at
}

// ---------------------------------------------------------------------------
// Driving the shipped build
// ---------------------------------------------------------------------------

/**
 * ⛔ THE DELIVERABLE, not the sources and not the dev server. `NFR-004` row
 * `CN-1` has `dist/` hold exactly one file and that file be the `.html`;
 * `tests/nfr/` is what assembles and judges it. This file only presses it.
 */
const SHIPPED_BUILD = join(process.cwd(), 'dist', 'index.html')

/**
 * ⛔ THE SAME HANDLES the neighbouring System files lean on, and no others.
 * Nothing in the specification says how a part is marked in the page; the shell
 * writes the part's settled name of `_assets/tbl-glossary.md`, and a change to
 * that marking breaks these cases, as it should.
 */
const CANVAS = '[data-role="Schedule Canvas"] svg'
const CANVAS_PART = '[data-role="Schedule Canvas"]'
const ROW_PANEL = '[data-role="Row Title Panel"]'
const HELP = '[data-role="Help Modal"]'

let browser: Browser | null = null

test.beforeAll(async () => {
  if (!existsSync(SHIPPED_BUILD)) {
    throw new Error(
      'the shipped build this file presses is not there; run `npx vite build` first ' +
        '(dist/index.html)',
    )
  }
  browser = await launchReferenceBrowser()
})

test.afterAll(async () => {
  // ⛔ THE HOOK'S OWN ALLOWANCE, NOT AN ASSERTION'S. Closing the reference
  // browser passes a hook's 30s default on this machine; `CLEARING_UP_MS` of
  // `./live-app` carries the measurements and the reason.
  test.setTimeout(CLEARING_UP_MS)
  await browser?.close()
})

interface Opened {
  readonly page: Page
  close(): Promise<void>
}

/**
 * The shipped build, up and settled, on the screen of the base environment.
 *
 * ⚠️ Not a fixed pause after the load. `BO-1` of table T-077 holds the page
 * invisible until the size is settled and the shell may legitimately draw twice
 * on the way up, so what is waited for is two identical readings of the
 * drawing.
 *
 * @purity non-pure
 */
async function openTheApp(): Promise<Opened> {
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

/**
 * Press with a real pointer.
 *
 * ⛔ A REAL POINTER, not `element.click()`. The shell builds its input from
 * pointer events, and a synthetic click has reached nothing in this project
 * before.
 *
 * @purity non-pure
 */
async function pressAt(page: Page, at: { x: number; y: number }): Promise<void> {
  await page.mouse.move(at.x, at.y)
  await page.mouse.down()
  await page.mouse.up()
}

/** Press one entrance of table T-109 wherever it stands. @purity non-pure */
async function pressEntrance(page: Page, icon: string): Promise<boolean> {
  const at = await page.evaluate((wanted: string) => {
    const entry = document.querySelector(`[data-icon="${wanted}"]`)
    if (entry === null) return null
    const box = entry.getBoundingClientRect()
    if (box.width < 1 || box.height < 1) return null
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
  }, icon)
  if (at === null) return false
  await pressAt(page, at)
  await page.waitForTimeout(500)
  return true
}

/** Whether an entrance stands armed -- `FR-029` writes it beside the entry. @purity semi-pure-b */
async function armingOf(page: Page, icon: string): Promise<string | null> {
  return page.evaluate(
    (wanted: string) =>
      document.querySelector(`[data-icon="${wanted}"]`)?.getAttribute('data-armed') ?? null,
    icon,
  )
}

/** The shape the canvas shows at a point -- `IN-2` of table T-028. @purity non-pure */
async function cursorAt(page: Page, x: number, y: number): Promise<string> {
  await page.mouse.move(x, y)
  return page.evaluate((part: string) => {
    const surface = document.querySelector(part)
    return surface instanceof HTMLElement ? surface.style.cursor : ''
  }, CANVAS_PART)
}

/** How far the drags below run along a row. */
const REACH_PX = 160

/**
 * Empty ground that one of the DRAWN ROWS covers, with room along the row.
 *
 * ⛔ Ground BELOW the last row is no good for placing: `FR-019` (MUST) holds an
 * annotation's position by a date and a row identifier, and ground no row
 * covers points at no row -- which is the OTHER rule of the same requirement,
 * and not what `S-132` is about. ⭐ Emptiness is the PRODUCT's own answer:
 * `PD-5` of table T-023a gives ground that hit nothing the plain arrow, read
 * with nothing armed.
 *
 * @purity non-pure
 */
async function groundOnADrawnRow(page: Page): Promise<{ x: number; y: number } | null> {
  const ground = await page.evaluate(
    (asked: { panel: string; reach: number }) => {
      const panel = document.querySelector(asked.panel)?.getBoundingClientRect()
      if (panel === undefined) return null
      const middles: number[] = []
      for (const row of Array.from(document.querySelectorAll('[data-depth]'))) {
        const band = row.getBoundingClientRect()
        const middle = Math.round(band.y + band.height / 2)
        if (middle >= 300 && middle <= window.innerHeight - 60) middles.push(middle)
      }
      return {
        left: Math.round(panel.right + 80),
        right: window.innerWidth - 200 - asked.reach,
        middles,
      }
    },
    { panel: ROW_PANEL, reach: REACH_PX },
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

/** One element of the drawing, as the page reports it. */
interface Drawn {
  readonly tag: string
  readonly attrs: string
  readonly rx: number | null
}

/**
 * Every element of the drawing right now.
 *
 * ⭐ The corner radius is read from the resolved geometry the browser holds --
 * `rx` of an SVG rectangle -- and not from the attribute text, so a value that
 * arrives through a style or a presentation attribute is still seen.
 *
 * @purity semi-pure-b
 */
async function drawnElements(page: Page): Promise<Drawn[]> {
  return page.evaluate((canvas: string) => {
    const svg = document.querySelector(canvas)
    if (svg === null) return []
    return Array.from(svg.querySelectorAll('*')).map((element) => {
      const rect = element as SVGRectElement
      const held =
        typeof (rect as { rx?: unknown }).rx === 'object' && rect.rx !== null
          ? rect.rx.baseVal.value
          : null
      return {
        tag: element.tagName,
        attrs: Array.from(element.attributes)
          .map((one) => `${one.name}=${one.value}`)
          .join(' ')
          .slice(0, 400),
        rx: typeof held === 'number' && Number.isFinite(held) ? held : null,
      }
    })
  }, CANVAS)
}

/**
 * The elements the second reading holds and the first did not.
 *
 * ⚠️ By multiset and not by set: the drawing is full of repeated shapes, and a
 * placement that happened to draw one more of an existing shape would be
 * invisible to a plain difference.
 *
 * @purity pure
 */
function addedBy(before: readonly Drawn[], after: readonly Drawn[]): Drawn[] {
  const seen = new Map<string, number>()
  for (const one of before) {
    const key = `${one.tag}|${one.attrs}`
    seen.set(key, (seen.get(key) ?? 0) + 1)
  }
  const out: Drawn[] = []
  for (const one of after) {
    const key = `${one.tag}|${one.attrs}`
    const left = seen.get(key) ?? 0
    if (left > 0) seen.set(key, left - 1)
    else out.push(one)
  }
  return out
}

/** A short description of some elements, for a failure that has to say what it saw. @purity pure */
function describe(some: readonly Drawn[]): string {
  return some.map((one) => `${one.tag}[rx=${one.rx ?? '-'}] ${one.attrs}`).join('\n  ')
}

/**
 * The name of every row the Row Title Panel is drawing, in its own order.
 *
 * ⚠️ Names come back CUT: `FR-085` ends a name that does not fit with an
 * ellipsis, and that is the requirement working. Nothing here compares a name
 * against one it typed; the names are carried so that a failure can say WHICH
 * row went missing.
 *
 * @purity semi-pure-b
 */
async function readRowNames(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('[data-depth]')).map(
      (row) => `${row.getAttribute('data-depth')}:${(row.querySelector('span')?.textContent ?? '').trim()}`,
    ),
  )
}

/**
 * Whatever a standing confirmation is saying, or an empty list while none is.
 *
 * ⭐ Read BEFORE it is answered, so that a failure can say what the tool
 * offered to delete. `U-55` (`_assets/tbl-glossary.md`) is the part's settled
 * name, and the shell marks the part with it.
 *
 * @purity semi-pure-b
 */
async function readConfirmation(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('[data-role]'))
      .filter((marked) => (marked.getAttribute('data-role') ?? '').includes('Confirm'))
      .map((marked) => (marked.textContent ?? '').trim().slice(0, 600))
      .filter((said) => said !== ''),
  )
}

/** Whatever the notices are saying right now (table T-037). @purity semi-pure-b */
async function readNotices(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    // ⛔ THE ROLE IS `Notification Area`, and asking for a role called `Notice`
    // is how an earlier probe of this project found none and called a defect
    // fixed.
    Array.from(document.querySelectorAll('[data-role]'))
      .filter((marked) => (marked.getAttribute('data-role') ?? '').includes('Notification'))
      .map((marked) => (marked.textContent ?? '').trim())
      .filter((said) => said !== ''),
  )
}

/** Whether one of `S-99g`'s faces is standing. @purity semi-pure-b */
async function faceIsUp(page: Page): Promise<boolean> {
  return page.evaluate((wanted: string) => {
    const face = document.querySelector(wanted)
    if (face === null) return false
    const box = face.getBoundingClientRect()
    return box.width > 1 && box.height > 1
  }, HELP)
}

/** Arm a holding and say so loudly when the entrance is not reachable. @purity non-pure */
async function arm(page: Page, entrance: string): Promise<void> {
  expect(await pressEntrance(page, entrance), `the entrance ${entrance} is on the screen`).toBe(true)
  expect(await armingOf(page, entrance), `${entrance} stands armed`).toBe('true')
}

/** Place a highlight box by dragging along a row, and give back what it drew. @purity non-pure */
async function placeAHighlightBox(page: Page): Promise<Drawn[]> {
  const spot = await groundOnADrawnRow(page)
  expect(spot, 'a drawn row covers empty ground with room along it').not.toBeNull()
  const at = spot as { x: number; y: number }

  await arm(page, HIGHLIGHT_BOX_ENTRANCE)

  const before = await drawnElements(page)
  expect(REACH_PX, 'the drag runs further than S-208, so it is a drag').toBeGreaterThan(
    PRESS_OR_DRAG_PX,
  )
  await page.mouse.move(at.x, at.y)
  await page.mouse.down()
  await page.mouse.move(at.x + REACH_PX, at.y, { steps: 12 })
  await page.mouse.up()
  await page.waitForTimeout(900)

  const added = addedBy(before, await drawnElements(page))
  expect(added.length, 'FR-019: the drag placed a highlight box').toBeGreaterThan(0)
  return added
}

// ---------------------------------------------------------------------------
// S-132 -- how round the corners of a highlight box are
// ---------------------------------------------------------------------------

// GOES RED IF: a highlight box is drawn with any corner radius other than the
// one table T-217 row `S-132` states. `FR-019` (MUST) sends that radius to
// table T-217 and has it drawn the same at every zoom, and the row's own note
// gives the reason for its ceiling -- corners too round stop the frame saying
// what it encloses.
//
// ⚠️ WHAT IS COMPARED IS THE RESOLVED GEOMETRY, not the attribute text: a
// radius that arrives through a style rather than an attribute is still the
// radius the reader sees.
test(`S-132: a placed highlight box is drawn with a corner radius of ${CORNER_RADIUS_PX}`, async () => {
  test.setTimeout(180_000)
  const opened = await openTheApp()
  const page = opened.page
  try {
    const added = await placeAHighlightBox(page)
    const rounded = added.filter((one) => one.rx !== null)

    expect(
      rounded.length,
      'the placement drew something that carries a corner radius; what it drew was:\n  ' +
        describe(added),
    ).toBeGreaterThan(0)

    expect(
      rounded.map((one) => one.rx),
      `S-132 (table T-217): every corner the placement drew is ${CORNER_RADIUS_PX}px round; ` +
        `what the drag drew was:\n  ${describe(added)}`,
    ).toEqual(rounded.map(() => CORNER_RADIUS_PX))
  } finally {
    await opened.close()
  }
})

// ---------------------------------------------------------------------------
// SK-3 -- `Delete` / `Backspace`, over exactly what `SL-1` names
// ---------------------------------------------------------------------------

// GOES RED IF: either key of table T-036 row `SK-3` stops deleting what is
// selected. ⭐ The selection is made by `SK-2`, whose own cell sends what it
// selects to table T-023c row `SL-1` -- so the two rows together say that after
// this gesture nothing `SL-1` names is left. The task shapes of the drawing are
// what is counted.
//
// ⚠️ A CONFIRMATION IS ANSWERED WHEN ONE STANDS. `FR-032` (MUST) asks for one
// when a row is deleted and when a `Task` with WBS descendants is, and table
// T-037 row `NT-7` (MUST) has it answerable by the `y` keystroke. Answering it
// is part of asking for the deletion, not a weakening of the judgement.
for (const key of SK3_KEYS) {
  test(`SK-3: ${key} deletes every task ${SK2_KEY} selected`, async () => {
    test.setTimeout(180_000)
    const opened = await openTheApp()
    const page = opened.page
    try {
      const shapesBefore = await page.evaluate(
        (canvas: string) => document.querySelectorAll(`${canvas} polygon`).length,
        CANVAS,
      )
      expect(shapesBefore, 'the build opens with tasks drawn, so there is something to delete').
        toBeGreaterThan(0)

      await page.mouse.move(BASE_SCREEN.width / 2, BASE_SCREEN.height / 2)
      await page.keyboard.press(SK2_KEY)
      await page.waitForTimeout(400)
      await page.keyboard.press(key)
      await page.waitForTimeout(700)
      // `NT-7` (MUST) has the two answers reachable by the `y` / `n` keys.
      await page.keyboard.press('y')
      await page.waitForTimeout(1200)

      expect(
        await page.evaluate(
          (canvas: string) => document.querySelectorAll(`${canvas} polygon`).length,
          CANVAS,
        ),
        `SK-3 with ${key}: no task of the ${shapesBefore} drawn is left`,
      ).toBe(0)
    } finally {
      await opened.close()
    }
  })
}

// GOES RED IF: the same gesture takes a row away. Table T-023c row `SL-1` rules
// a row (`TaskGroup`) out of what can be selected, and `SK-3` says its targets
// are exactly what that row names -- so a row survives a `Delete` however many
// tasks it held. ⚠️ The rows are counted in the Row Title Panel, which table T-031 row
// `SC-3` has drawn at all times.
test(`SK-3 / SL-1: the same ${SK3_KEYS[0]} leaves every row standing`, async () => {
  test.setTimeout(180_000)
  expect(
    ROW_IS_NOT_A_TARGET,
    'table T-023c row SL-1 still says a row (TaskGroup) is not among what can be selected',
  ).toBe(true)

  const opened = await openTheApp()
  const page = opened.page
  try {
    const rowsBefore = await readRowNames(page)
    expect(rowsBefore.length, 'the build opens with rows drawn').toBeGreaterThan(0)

    await page.mouse.move(BASE_SCREEN.width / 2, BASE_SCREEN.height / 2)
    await page.keyboard.press(SK2_KEY)
    await page.waitForTimeout(400)
    expect(
      (await readRowNames(page)).length,
      'SK-2 selected but deleted nothing, so the rows still stand at this point',
    ).toBe(rowsBefore.length)

    await page.keyboard.press(SK3_KEYS[0] as string)
    await page.waitForTimeout(700)
    const asked = await readConfirmation(page)
    await page.keyboard.press('y')
    await page.waitForTimeout(1200)

    // ⚠️ NOT AN EQUALITY, A FLOOR. The panel draws the rows that fit, and
    // `FR-042` (MUST) treats a row's stated height as a LOWER bound driven by
    // what the row carries -- so emptying the rows can legitimately let MORE of
    // them fit. What `SL-1` forbids is the count going DOWN.
    //
    // ⚠️ THE COUNT AND NOT THE NAMES. `FR-032` (MUST) has a row whose name was
    // derived from a task settle that name before the task goes, and (MUST) has
    // a nameless task's row settle on a default name -- so a name may
    // legitimately change here. What `SL-1` promises is that the ROW is still
    // there.
    const rowsAfter = await readRowNames(page)
    expect(
      rowsAfter.length,
      'SL-1: a row is not among what can be selected, so none of them was deleted; ' +
        `before [${rowsBefore.join(' | ')}], after [${rowsAfter.join(' | ')}]; ` +
        `the confirmation said [${asked.join(' // ')}]`,
    ).toBeGreaterThanOrEqual(rowsBefore.length)
  } finally {
    await opened.close()
  }
})

// GOES RED IF: a highlight box outlives the same gesture. `SL-1` names five
// kinds, and a highlight box is the third of them, so one placed a moment
// earlier is inside what `SK-3` deletes.
test(`SK-3 / SL-1: ${SK3_KEYS[0]} takes a placed highlight box with it`, async () => {
  test.setTimeout(180_000)
  const opened = await openTheApp()
  const page = opened.page
  try {
    const added = await placeAHighlightBox(page)
    const marks = added.map((one) => `${one.tag}|${one.attrs}`)

    await page.mouse.move(BASE_SCREEN.width / 2, BASE_SCREEN.height / 2)
    await page.keyboard.press(SK2_KEY)
    await page.waitForTimeout(400)
    await page.keyboard.press(SK3_KEYS[0] as string)
    await page.waitForTimeout(700)
    await page.keyboard.press('y')
    await page.waitForTimeout(1200)

    const left = (await drawnElements(page)).map((one) => `${one.tag}|${one.attrs}`)
    expect(
      marks.filter((mark) => left.includes(mark)),
      'SL-1: the highlight box is among what SK-3 deletes, so nothing it drew is left',
    ).toEqual([])
  } finally {
    await opened.close()
  }
})

// ---------------------------------------------------------------------------
// IN-4 -- `Esc` consumes one tier at a time, in the order the row writes
// ---------------------------------------------------------------------------

// GOES RED IF: one `Esc` consumes both tiers, or consumes the lower one first.
// Table T-028 row `IN-4` (MUST) has `Esc` consume ONE tier when there is one to
// consume, and puts an open face ahead of a holding in its order; `FR-020` says
// the same of the watermark face, which it puts in `Esc`'s first tier. The
// order asserted is read out of the row itself by `escOrderOf`.
test('IN-4: with a face up and a holding armed, one Esc closes the face and leaves the holding', async () => {
  test.setTimeout(180_000)
  expect(
    escOrderOf('face'),
    'table T-028 row IN-4 still puts an open face ahead of a holding',
  ).toBeLessThan(escOrderOf('holding'))

  const opened = await openTheApp()
  const page = opened.page
  try {
    await arm(page, HIGHLIGHT_BOX_ENTRANCE)
    await page.keyboard.press(SK13_KEY)
    await page.waitForTimeout(900)
    expect(await faceIsUp(page), `SK-13 (${SK13_KEY}) put a face up`).toBe(true)
    expect(
      await armingOf(page, HIGHLIGHT_BOX_ENTRANCE),
      'the holding survived the face being opened, so both tiers stand',
    ).toBe('true')

    await page.keyboard.press('Escape')
    await page.waitForTimeout(900)
    expect(await faceIsUp(page), 'IN-4: the first Esc closed the face').toBe(false)
    expect(
      await armingOf(page, HIGHLIGHT_BOX_ENTRANCE),
      'IN-4: the first Esc consumed ONE tier, so the holding is still armed',
    ).toBe('true')

    await page.keyboard.press('Escape')
    await page.waitForTimeout(900)
    expect(
      await armingOf(page, HIGHLIGHT_BOX_ENTRANCE),
      'IN-4: the second Esc consumed the next tier down, the holding',
    ).not.toBe('true')
  } finally {
    await opened.close()
  }
})

// GOES RED IF: one `Esc` clears the holding while a notice is still on the
// screen, or clears both at once. `IN-4` puts a raised notice at the head of
// its order, on the user's own instruction, and table T-037 row `NT-8` (MUST)
// has that clearing happen ahead of every tier of `Enter` and `Esc`.
//
// ⭐ THE NOTICE IS RAISED BY THE SPECIFICATION'S OWN ROUTE, and by one that
// changes no value of the document: `IC-74` of table T-109 is the entrance
// table T-051 row `HF-10` puts at the head of the Row Title Panel, and when
// nothing is folded it has nothing to do -- at which point `FR-029` (MUST) has
// the entrance tell the reason it cannot act, and table T-233 row `RS-31` is
// that reason. Pressing it more than once is what makes a later press find
// nothing folded, whatever the build opened with.
test('IN-4: with a notice up and a holding armed, one Esc clears the notice only', async () => {
  test.setTimeout(180_000)
  expect(
    escOrderOf('notice'),
    'table T-028 row IN-4 still puts a raised notice ahead of a holding',
  ).toBeLessThan(escOrderOf('holding'))

  const opened = await openTheApp()
  const page = opened.page
  try {
    await arm(page, COMMENT_BOX_ENTRANCE)

    let notices: string[] = []
    for (let tries = 0; notices.length === 0 && tries < 3; tries += 1) {
      expect(
        await pressEntrance(page, UNFOLD_ALL_ENTRANCE),
        `the entrance ${UNFOLD_ALL_ENTRANCE} is on the screen`,
      ).toBe(true)
      notices = await readNotices(page)
    }

    expect(
      notices.length,
      `FR-029 / RS-31: ${UNFOLD_ALL_ENTRANCE} with nothing folded told the reason`,
    ).toBeGreaterThan(0)
    expect(
      await armingOf(page, COMMENT_BOX_ENTRANCE),
      'the holding survived a press on an entrance that does not arm, so both tiers stand',
    ).toBe('true')

    await page.keyboard.press('Escape')
    await page.waitForTimeout(900)
    expect((await readNotices(page)).length, 'IN-4 / NT-8: the first Esc cleared the notice').toBe(0)
    expect(
      await armingOf(page, COMMENT_BOX_ENTRANCE),
      'IN-4: the first Esc consumed ONE tier, so the holding is still armed',
    ).toBe('true')

    await page.keyboard.press('Escape')
    await page.waitForTimeout(900)
    expect(
      await armingOf(page, COMMENT_BOX_ENTRANCE),
      'IN-4: the second Esc consumed the next tier this file drives, the holding',
    ).not.toBe('true')
  } finally {
    await opened.close()
  }
})
