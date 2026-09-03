// One System case for each of five CLOSED rows of the defect ledger
// (`docs/development-records/defects.md` and, once a row has been measured,
// `docs/development-records/fixed-defects.md`) -- rows the user reported, that
// are visible on the screen, and that were fixed and measured by hand but had
// nothing holding the fix down.
//
//   D-34   the retired word for a notice is gone from every word the screen prints
//   D-45   resting on a task bar tells its name and its two dates
//   D-72   the guide cursor can be switched to a crosshair and to one vertical line
//   D-87   the palette-visibility entrance stands at the left end of the header
//   D-160  the entrances at the head of the row title panel do not sit on top of each other
//
// ⛔ THE SIXTH ROW, D-116, HAS NO CASE HERE, AND THAT IS DELIBERATE. It asks
// that a row's name be given "the width the specification gives it", and two
// MUSTs of the specification give it two different widths:
//
//   `FR-085` (`01-04-requirements.md`) fixes the usable width as exactly three
//   terms -- `S-79` (`rowTitlePanelWidth`, table T-203) less the row's depth
//   times `S-37` (`rowTitleIndent`, table T-201) less `S-140` (table T-206) --
//   which is 170 - 16*depth - 0.
//
//   Table T-023d row `GR-20` (MUST) then puts the row grab-hold, `S-138` wide,
//   immediately before the name and after the indent, and table T-051 row
//   `HF-15` (MUST) has it drawn at all times. Nothing subtracts it in `FR-085`.
//
// Measured on the running application at the screen of table T-025 row `MC-6`
// (2026-09-02): a depth-1 row's name is given 134px, a depth-2 row 118px, a
// depth-3 row 102px -- each exactly 20px under `FR-085`'s three terms (the
// 16px hold plus the 4px space beside it). Asserting either number would be
// choosing between two MUSTs, so no case was written. What is missing is a
// term in `FR-085`'s formula for `GR-20`, or a MUST saying the hold is drawn
// over the name rather than before it.
//
// ⛔ NO `swsCase` IS DECLARED HERE. Table T-219 (row TW-2) has Chapter 9's
// cases GENERATED from those declarations and hung from a `SWS-xxx` node of
// Chapter 6.1. `SWS-1` through `SWS-8` are the whole of that chapter today and
// not one of them is about a notice's wording, a tooltip, the guide cursor or
// where an entrance stands, so every case here would have to invent its own
// parent. The rows each case leans on are named in prose instead, at the case.
//
// ⭐ EVERY NUMBER ASSERTED IS READ OUT OF `docs/spec` AT READ TIME -- the wait
// before a tooltip, the size of an entrance, which entrance sets which guide
// mode, and the order the entrances stand in. Nothing is a number measured off
// the running application, and moving a value in the manuscript moves the case
// with it. Chapter 1.9 (`:275`) asks exactly this of a test that verifies a
// requirement pointing at a table.
//
// ⭐ EACH CASE SAYS WHAT WOULD MAKE IT GO RED, in the sentence above its body.

import { expect, test, type Browser, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { bare, specTable, type SpecTable } from '../contract/spec-table'
import { CLEARING_UP_MS, launchReferenceBrowser, readSettledDrawnSvg, screenOf } from './live-app'
import { rowOf } from './sws-case'

// ---------------------------------------------------------------------------
// What the specification says, read at read time
// ---------------------------------------------------------------------------

const T025: SpecTable = specTable('T-025')
const T109: SpecTable = specTable('T-109')
const T202: SpecTable = specTable('T-202')
const T206: SpecTable = specTable('T-206')
const T212: SpecTable = specTable('T-212')

/**
 * One cell of a row, taken by position, with the table's shape guarded.
 *
 * ⭐ By position and not by heading: the headings of these tables are Japanese
 * and rule 03 section 5 keeps this tree ASCII. `tests/system/sws-case.ts` says
 * the same of `lastCellOf`, and asks a caller that reads another column to
 * guard the column count itself -- which is what `columns` is for.
 *
 * @purity pure
 */
function cellOf(table: SpecTable, rowId: string, column: number, columns: number): string {
  const row = rowOf(table, rowId)
  if (row.cells.length !== columns) {
    throw new Error(
      `table ${table.id} row ${rowId} has ${row.cells.length} cells after the row ID, not the ` +
        `${columns} this file reads by position -- a column was added or taken away`,
    )
  }
  return row.cells[column] ?? ''
}

/** The first number written in a cell. @purity pure */
function numberIn(cell: string, what: string): number {
  const found = /-?\d+(?:\.\d+)?/.exec(cell.replace(/`/g, ''))
  const value = Number(found?.[0] ?? '')
  if (!Number.isFinite(value)) {
    throw new Error(`${what} states no number this file can read: ${JSON.stringify(cell)}`)
  }
  return value
}

/** The screen of the base environment: table T-025, row `MC-6`. */
const BASE_SCREEN = screenOf(rowOf(T025, 'MC-6'))

/**
 * `S-124` (`iconHintDelayMs`) of table T-212: how long a pointer has to rest
 * before an explanation is put up. `FR-092` row `EZ-6` (MUST) says the wait on
 * a task is this one and forbids a second one.
 */
const HINT_DELAY_MS = numberIn(cellOf(T212, 'S-124', 1, 5), 'table T-212 row S-124')

/** `S-138` of table T-206: the side of the box an entrance draws its shape in. */
const ENTRANCE_SHAPE_PX = numberIn(cellOf(T206, 'S-138', 1, 3), 'table T-206 row S-138')

/** `S-141` of table T-206: the least space `FR-029` leaves around that shape. */
const ENTRANCE_CLEAR_PX = numberIn(cellOf(T206, 'S-141', 1, 3), 'table T-206 row S-141')

/**
 * The narrowest an entrance's frame can be drawn.
 *
 * ⭐ `FR-029` (MUST) has the shape drawn in a box of `S-138` a side, and (MUST)
 * leaves at least `S-141` between that shape and the entrance's own frame, on
 * every surface. So a frame holds the shape plus that space twice over, and a
 * pitch shorter than this between two neighbours means their frames overlap.
 */
const NARROWEST_ENTRANCE_PX = ENTRANCE_SHAPE_PX + ENTRANCE_CLEAR_PX * 2

// Columns of table T-109 (`_assets/tbl-glossary.md`), after the row ID.
const T109_COLUMNS = 5
const SURFACE_COLUMN = 0
const PURPOSE_COLUMN = 2
const SOURCE_COLUMN = 3

/** Row IDs of table T-109 that sit on one surface, in the table's own order. @purity pure */
function entrancesOnSurface(surface: string): readonly string[] {
  const found = T109.rows
    .filter((row) => row.cells.length === T109_COLUMNS)
    .filter((row) => bare(row.cells[SURFACE_COLUMN] ?? '') === surface)
    .map((row) => row.id)
  if (found.length === 0) throw new Error(`table T-109 puts no entrance on ${surface}`)
  return found
}

/**
 * The one row of table T-109 whose purpose names this text, or a failure.
 *
 * ⭐ Used so that no case here spells an `IC-nn` of its own: the entrance is
 * found by what the table says it does.
 *
 * @purity pure
 */
function entranceNaming(text: string): string {
  const found = T109.rows.filter((row) => (row.cells[PURPOSE_COLUMN] ?? '').includes(text))
  if (found.length !== 1) {
    throw new Error(
      `table T-109 has ${found.length} entrances whose purpose names ${JSON.stringify(text)}, ` +
        'and this file needs exactly one',
    )
  }
  return found[0]?.id ?? ''
}

/**
 * The `HF-nn` of table T-051 an entrance of table T-109 takes as its rule.
 *
 * @purity pure
 */
function rowPanelRuleOf(entrance: string): string {
  const found = /HF-\d+/.exec(cellOf(T109, entrance, SOURCE_COLUMN, T109_COLUMNS))
  if (found === null) {
    throw new Error(`table T-109 row ${entrance} names no HF row of table T-051 as its rule`)
  }
  return found[0]
}

/**
 * The one entrance of table T-109 whose rule is this row of table T-051.
 *
 * ⚠️ Anchored at the end so that `HF-1` cannot be found by asking for `HF-10`.
 *
 * @purity pure
 */
function entranceRuledBy(rule: string): string {
  const wanted = new RegExp(`${rule}(?![0-9])`)
  const found = T109.rows
    .filter((row) => row.cells.length === T109_COLUMNS)
    .filter((row) => wanted.test(row.cells[SOURCE_COLUMN] ?? ''))
  if (found.length !== 1) {
    throw new Error(
      `table T-109 has ${found.length} entrances whose rule is ${rule}, and this file needs one`,
    )
  }
  return found[0]?.id ?? ''
}

// ---------------------------------------------------------------------------
// Driving the running application
// ---------------------------------------------------------------------------

let browser: Browser | null = null

test.beforeAll(async () => {
  browser = await launchReferenceBrowser()
})

test.afterAll(async () => {
  // ⛔ THE HOOK'S OWN ALLOWANCE, NOT AN ASSERTION'S. Closing the reference
  // browser passes a hook's 30s default on this machine; `CLEARING_UP_MS` of
  // `./live-app` carries the measurements and the reason.
  test.setTimeout(CLEARING_UP_MS)
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
 * ⚠️ `locale` reaches `FR-038`: the requirement (MUST) has the application open
 * in the language chosen last and, when it cannot read one, in the language the
 * browser asks for. A context opened here has chosen none, so the locale
 * decides -- which is how the case for D-34 gets a Japanese screen.
 *
 * @purity non-pure
 */
async function openTheApp(baseURL: string | undefined, locale?: string): Promise<Opened> {
  const context = await openedBrowser().newContext({
    baseURL: serverUrlOf(baseURL),
    viewport: BASE_SCREEN,
    ...(locale === undefined ? {} : { locale }),
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
 * ⛔ THE SAME HANDLES `tests/system/live-app.ts` AND
 * `tests/system/open-defect-pins.test.ts` LEAN ON, and no others. Nothing in
 * the specification says how a part or an entrance is marked in the page; the
 * shell writes the part's settled name (`_assets/tbl-glossary.md`) and the
 * entrance's row ID of table T-109, and a change to either marking breaks these
 * cases, as it should.
 */
const CANVAS = '[data-role="Schedule Canvas"] svg'
const TOOLTIP = '[data-role="Tooltip"]'

/** A box the page reported, in the page's own pixels. */
interface Box {
  readonly entrance: string
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

/**
 * Where each of these entrances stands right now, in the order they were asked
 * for. An entrance that is not on the screen is left out.
 *
 * @purity semi-pure-b
 */
async function readEntranceBoxes(page: Page, wanted: readonly string[]): Promise<Box[]> {
  return page.evaluate((asked: readonly string[]) => {
    const out = []
    for (const entrance of asked) {
      const element = document.querySelector(`[data-icon="${entrance}"]`)
      if (element === null) continue
      const box = element.getBoundingClientRect()
      if (box.width < 1 || box.height < 1) continue
      out.push({
        entrance,
        x: Math.round(box.x * 100) / 100,
        y: Math.round(box.y * 100) / 100,
        width: Math.round(box.width * 100) / 100,
        height: Math.round(box.height * 100) / 100,
      })
    }
    return out
  }, wanted)
}

/**
 * Press an entrance with a real pointer.
 *
 * ⛔ A REAL POINTER, not `element.click()`. The shell reads the pointer, and a
 * synthetic click has reached nothing in this project before
 * (`tests/system/open-defect-pins.test.ts` says the same).
 *
 * @purity non-pure
 */
async function pressEntrance(page: Page, entrance: string): Promise<boolean> {
  const boxes = await readEntranceBoxes(page, [entrance])
  const box = boxes[0]
  if (box === undefined) return false
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.up()
  await page.waitForTimeout(600)
  return true
}

/** Every piece of text a leaf of the page is showing right now. @purity semi-pure-b */
async function readScreenTexts(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const out: string[] = []
    for (const element of Array.from(document.querySelectorAll('*'))) {
      if (element.children.length > 0) continue
      const words = (element.textContent ?? '').trim()
      if (words !== '') out.push(words)
    }
    return out
  })
}

// ---------------------------------------------------------------------------
// D-34 -- the word for a notice
// ---------------------------------------------------------------------------

// ⚠️ The two Japanese words this row is about, built from their code points
// rather than written out. Rule 03 section 5 keeps this tree ASCII, and
// `tests/system/live-app.ts` gives the same reason for the one character it
// needs: a literal would be invisible in a diff.
/** The retired word, U+77E5 U+3089 U+305B -- the user's instruction of 2026-08-25. */
const RETIRED_NOTICE_WORD = String.fromCharCode(0x77e5, 0x3089, 0x305b)

/** The settled word for the same thing, U+901A U+77E5. */
const SETTLED_NOTICE_WORD = String.fromCharCode(0x901a, 0x77e5)

/** The mark a cut-short name ends in, U+2026. */
const ELLIPSIS = String.fromCharCode(0x2026)

/** The manuscript `FR-038` (MUST) makes the one home of every word the screen prints. */
const DICTIONARY = join(process.cwd(), 'docs', 'spec', '_source', 'display-words.json')

/** One string of the dictionary, and where in it that string lives. */
interface Wording {
  readonly at: string
  readonly text: string
}

/**
 * Every string the dictionary holds, wherever it sits in the shape.
 *
 * ⚠️ `$comment` is skipped: it is the manuscript talking to its reader, and
 * nothing in it is printed.
 *
 * @purity pure
 */
function wordingsIn(value: unknown, at: string): Wording[] {
  if (typeof value === 'string') return [{ at, text: value }]
  if (Array.isArray(value)) return value.flatMap((one, i) => wordingsIn(one, `${at}[${i}]`))
  if (value !== null && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .filter(([key]) => key !== '$comment')
      .flatMap(([key, one]) => wordingsIn(one, `${at}.${key}`))
  }
  return []
}

/**
 * Whether a piece of text is written in Japanese script.
 *
 * ⭐ Kana (U+3040..U+30FF) or han (U+4E00..U+9FFF), counted by code point so
 * that this file spells no character of either. Rule 03 section 5.
 *
 * @purity pure
 */
function isJapanese(text: string): boolean {
  for (const character of text) {
    const code = character.codePointAt(0) ?? 0
    if (code >= 0x3040 && code <= 0x30ff) return true
    if (code >= 0x4e00 && code <= 0x9fff) return true
  }
  return false
}

// GOES RED IF: the retired word is put back into the manuscript the screen
// takes its words from, or into anything the running application prints. Two
// halves are asked, and each can fail on its own -- the manuscript's own count,
// which is 0 today and is what `FR-038` makes the whole of the answer, and the
// screen, which has to be showing Japanese words for the walk to mean anything
// (a run that found none fails as well).
test('D-34: no word the screen can print, and none it does print, carries the retired word', async ({
  baseURL,
}) => {
  test.setTimeout(180_000)

  // ⭐ THE MANUSCRIPT FIRST. `FR-038` (MUST) has every word the screen prints
  // live in one dictionary per language and forbids requirements and tables
  // from spelling one, so counting there counts every word the product can
  // ever put up -- including the notices that need a document in a state this
  // case cannot reach.
  const wordings = wordingsIn(JSON.parse(readFileSync(DICTIONARY, 'utf8')), 'display-words')
  const retired = wordings.filter((one) => one.text.includes(RETIRED_NOTICE_WORD))
  expect(
    retired.map((one) => `${one.at}: ${one.text}`),
    `${DICTIONARY} still writes the retired word; the settled one is the other`,
  ).toEqual([])
  expect(
    wordings.some((one) => one.text.includes(SETTLED_NOTICE_WORD)),
    'the dictionary writes the settled word nowhere at all, so this case would pass on an empty ' +
      'dictionary just as well',
  ).toBe(true)

  // ⭐ THEN THE SCREEN. Two surfaces are made to speak: the explanation an
  // entrance puts up when the pointer rests on it (`FR-092` row `EZ-2`), and
  // the notice `FR-029` (MUST) requires when an entrance that is drawn faint is
  // pressed -- which is where the retired word actually stood.
  const app = await openTheApp(baseURL, 'ja-JP')
  try {
    const palette = entranceNaming('S-99e')
    const boxes = await readEntranceBoxes(app.page, [palette])
    const box = boxes[0]
    expect(box, `the entrance ${palette} is not on the screen`).not.toBeUndefined()
    if (box === undefined) return
    await app.page.mouse.move(box.x - 40, box.y + box.height / 2)
    await app.page.waitForTimeout(200)
    await app.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await app.page.waitForTimeout(HINT_DELAY_MS + 1500)
    const rested = await readScreenTexts(app.page)

    const faint = await app.page.evaluate(
      /** @purity semi-pure-b */
      () =>
        document.querySelector('[data-icon][data-enabled="false"]')?.getAttribute('data-icon') ??
        null,
    )
    expect(faint, 'no entrance is drawn faint, so no notice can be raised without editing').not.toBeNull()
    if (faint === null) return
    expect(await pressEntrance(app.page, faint), `${faint} is not on the screen`).toBe(true)
    const told = await readScreenTexts(app.page)

    const shown = [...new Set([...rested, ...told])]
    const japanese = shown.filter(isJapanese)
    expect(
      japanese.length,
      'the running application put no Japanese words on the screen at all, so the walk below ' +
        'proves nothing -- it did not open in Japanese, or neither the explanation nor the notice came',
    ).toBeGreaterThan(1)
    expect(
      shown.filter((text) => text.includes(RETIRED_NOTICE_WORD)),
      'the running application printed the retired word',
    ).toEqual([])
  } finally {
    await app.close()
  }
})

// ---------------------------------------------------------------------------
// D-45 -- resting on a task bar
// ---------------------------------------------------------------------------

/** What `FR-092` row `EZ-6` (MUST) asks a rested pointer to be told, taken apart. */
interface Telling {
  readonly name: string
  readonly start: string
  readonly finish: string
}

/**
 * Read a telling of `EZ-6` out of what the tooltip says.
 *
 * ⭐ The shape is the row's own: the task's name, then `start` and `finish`
 * written `YYYY-MM-DD` and set in that order with a `/` between them. `EZ-6`
 * (MUST NOT) forbids writing the month as a word, which is why the pattern
 * takes digits only.
 *
 * @purity pure
 */
function tellingIn(said: string): Telling | null {
  const found = /^(.*?)\s*(\d{4}-\d{2}-\d{2})\s*\/\s*(\d{4}-\d{2}-\d{2})$/.exec(said.trim())
  if (found === null) return null
  return { name: found[1] ?? '', start: found[2] ?? '', finish: found[3] ?? '' }
}

/** The task bars that are wholly on the screen, topmost first. @purity semi-pure-b */
async function readBarsOnScreen(page: Page): Promise<Array<{ x: number; y: number; width: number; height: number }>> {
  return page.evaluate((canvas: string) => {
    const svg = document.querySelector(canvas)
    if (svg === null) return []
    return Array.from(svg.querySelectorAll('polygon'))
      .map((one) => one.getBoundingClientRect())
      .filter(
        (box) =>
          box.x > 200 &&
          box.y > 100 &&
          box.x + box.width < window.innerWidth - 20 &&
          box.y + box.height < window.innerHeight - 20 &&
          box.width > 60 &&
          box.height >= 12,
      )
      .map((box) => ({
        x: Math.round(box.x),
        y: Math.round(box.y),
        width: Math.round(box.width),
        height: Math.round(box.height),
      }))
      .sort((one, two) => one.y - two.y || one.x - two.x)
  }, CANVAS)
}

/** Whatever the tooltip is saying right now. @purity semi-pure-b */
async function readTooltip(page: Page): Promise<string> {
  return page.evaluate(
    (selector: string) => (document.querySelector(selector)?.textContent ?? '').trim(),
    TOOLTIP,
  )
}

/**
 * Rest the pointer in the middle of a bar and report what is said before the
 * wait is up and after it.
 *
 * ⛔ THE POINTER ARRIVES FROM SOMEWHERE ELSE FIRST. `EZ-6` (MUST) starts the
 * wait when the pointer stops, so a pointer that was already there would have
 * been resting for an unknown time.
 *
 * @purity non-pure
 */
async function restOnBar(
  page: Page,
  bar: { x: number; y: number; width: number; height: number },
): Promise<{ early: string; late: string }> {
  const at = { x: bar.x + Math.round(bar.width / 2), y: bar.y + Math.round(bar.height / 2) }
  await page.mouse.move(at.x - 60, at.y - 60)
  await page.waitForTimeout(300)
  await page.mouse.move(at.x, at.y)
  // ⭐ Both moments are counted in `S-124` itself, not in numbers written here:
  // well inside the wait, and well past it.
  await page.waitForTimeout(Math.round(HINT_DELAY_MS * 0.6))
  const early = await readTooltip(page)
  await page.waitForTimeout(Math.round(HINT_DELAY_MS * 0.4) + 1500)
  const late = await readTooltip(page)
  return { early, late }
}

// GOES RED IF: nothing is put up when the pointer rests on a bar's body, or
// something is put up before `S-124` is over, or what is put up is not the
// task's name with its two dates in the shape `FR-092` row `EZ-6` (MUST) asks
// for, or it does not go away when the pointer moves, or two different tasks
// are told the same thing. Table T-212 row `S-124` (2000 ms as this is written)
// drives both waits: raise it in the manuscript and the case waits longer.
test('D-45: resting on a task bar tells the task name and its two dates, and moving clears it', async ({
  baseURL,
}) => {
  test.setTimeout(240_000)
  const app = await openTheApp(baseURL)
  try {
    const bars = await readBarsOnScreen(app.page)
    expect(bars.length, 'no task bar is wholly on the screen to rest a pointer on').toBeGreaterThan(1)

    const first = bars[0]
    if (first === undefined) return
    // ⛔ A SECOND BAR IN ANOTHER ROW BAND, not simply the next bar. Two bars of
    // one band can belong to one task, and then telling them apart proves
    // nothing about the name coming from the task under the pointer.
    const second = bars.find((one) => Math.abs(one.y - first.y) > first.height * 2)
    expect(second, 'only one row band has a bar wholly on the screen').not.toBeUndefined()
    if (second === undefined) return

    const one = await restOnBar(app.page, first)
    expect(
      one.early,
      `something was put up after only ${Math.round(HINT_DELAY_MS * 0.6)}ms, and table T-212 row ` +
        `S-124 gives the wait as ${HINT_DELAY_MS}ms`,
    ).toBe('')
    const told = tellingIn(one.late)
    expect(
      told,
      `resting on the bar at (${first.x}, ${first.y}) said ${JSON.stringify(one.late)}, which is ` +
        'not a name followed by start and finish as YYYY-MM-DD with a / between them (EZ-6)',
    ).not.toBeNull()
    if (told === null) return
    expect(told.name, 'the telling carries no name at all').not.toBe('')
    // `EZ-6` (MUST): the name is given whole, because the label on the canvas is
    // the one that gets cut and this is the only way to read the rest of it.
    expect(
      told.name.includes(ELLIPSIS),
      `the name in the telling is cut short (${JSON.stringify(told.name)}), and EZ-6 asks for the whole of it`,
    ).toBe(false)

    // `EZ-6` (MUST): the pointer moves and it goes.
    await app.page.mouse.move(first.x - 120, first.y + 140)
    await app.page.waitForTimeout(800)
    expect(await readTooltip(app.page), 'the telling stayed up after the pointer moved').toBe('')

    const other = await restOnBar(app.page, second)
    const otherTold = tellingIn(other.late)
    expect(
      otherTold,
      `resting on the bar at (${second.x}, ${second.y}) said ${JSON.stringify(other.late)}`,
    ).not.toBeNull()
    if (otherTold === null) return
    expect(
      otherTold.name,
      'two bars in different row bands were told the same name, so the name is not read from the ' +
        'task the pointer is over',
    ).not.toBe(told.name)
  } finally {
    await app.close()
  }
})

// ---------------------------------------------------------------------------
// D-72 -- switching the guide cursor
// ---------------------------------------------------------------------------

/** The cell of table T-202 row `S-66` that lists the modes `CU-3` allows. */
const GUIDE_MODE_CELL = cellOf(T202, 'S-66', 1, 4)

/** A guide cursor mode, refused unless table T-202 row `S-66` offers it. @purity pure */
function guideMode(name: string): string {
  if (!GUIDE_MODE_CELL.includes(`'${name}'`)) {
    throw new Error(`table T-202 row S-66 does not offer a guide cursor mode called ${name}`)
  }
  return name
}

// ⭐ Table T-029 row `CU-3` (MUST) has four modes and lets the reader choose
// between them, and names them in the same words `S-66` spells: none, a
// crosshair, one vertical line, two vertical lines. Three of the four are
// asked here.
//
// ⛔ THE FOURTH IS NOT ASKED. `docs/development-records/defects.md` row D-72
// records that two vertical lines were deliberately left out, because nothing
// in tables T-029 / T-202 / T-206 / T-236 fixes the distance between the two
// and `FR-048` (MUST) also wants them told apart from `CU-2` with no means
// given (pending decision PD-343). A case here would have to invent both.
const GUIDE_NONE = guideMode('none')
const GUIDE_CROSSHAIR = guideMode('crosshair')
const GUIDE_SINGLE_VERTICAL = guideMode('single-vertical')

/**
 * The lines the drawing has standing through a point, as
 * `CU-3` puts them: a vertical one at the pointer's own x, a horizontal one at
 * the pointer's own y.
 *
 * ⭐ Found by where they are rather than by how they look. `CU-3` calls the
 * guide cursor a line that follows the pointer, so standing exactly on the
 * pointer IS the thing being looked for; its colour and thickness are still
 * pending decisions (PD-341 / PD-342) and nothing here reads them.
 *
 * @purity semi-pure-b
 */
async function readLinesThroughPointer(
  page: Page,
  at: { x: number; y: number },
): Promise<{ vertical: number; horizontal: number }> {
  return page.evaluate(
    (asked: { canvas: string; x: number; y: number }) => {
      const svg = document.querySelector(asked.canvas)
      let vertical = 0
      let horizontal = 0
      if (svg === null) return { vertical, horizontal }
      for (const line of Array.from(svg.querySelectorAll('line'))) {
        const x1 = Number(line.getAttribute('x1'))
        const x2 = Number(line.getAttribute('x2'))
        const y1 = Number(line.getAttribute('y1'))
        const y2 = Number(line.getAttribute('y2'))
        if (x1 === asked.x && x2 === asked.x && y1 !== y2) vertical += 1
        else if (y1 === asked.y && y2 === asked.y && x1 !== x2) horizontal += 1
      }
      return { vertical, horizontal }
    },
    { canvas: CANVAS, x: at.x, y: at.y },
  )
}

/**
 * Put the pointer somewhere and let the drawing settle.
 *
 * ⚠️ Settled, not slept on. `FR-048` has the drawing redone when the pointer
 * moves and a guide line follows it, so a fixed pause is a guess about how long
 * that takes; `readSettledDrawnSvg` waits for two identical readings instead
 * and gives up loudly. Measured once with a fixed pause: the reading below came
 * back empty on a loaded machine.
 *
 * @purity non-pure
 */
async function movePointerTo(page: Page, at: { x: number; y: number }): Promise<void> {
  await page.mouse.move(at.x - 7, at.y - 7)
  await page.waitForTimeout(150)
  await page.mouse.move(at.x, at.y)
  await readSettledDrawnSvg(page)
}

// GOES RED IF: pressing the entrance table T-109 gives the crosshair stops
// drawing two lines through the pointer, or the entrance for one vertical line
// stops drawing exactly one, or either stops following the pointer, or the mode
// the application starts in already draws one. The counts are table T-029 row
// `CU-3`'s own words -- a crosshair is two lines and one vertical line is one --
// and the three entrances are looked up in table T-109 by the value of `S-66`
// each one sets, so renaming or renumbering them moves the case.
test('D-72: the guide cursor can be switched to a crosshair and to a single vertical line', async ({
  baseURL,
}) => {
  test.setTimeout(180_000)
  const app = await openTheApp(baseURL)
  try {
    // ⚠️ Two points, neither of them where the rulers put a tick: the reading
    // below counts every line standing on the pointer, so a tick that happened
    // to be there would be counted too. The first assertion is what catches
    // that -- in the mode the application starts in there must be none.
    const here = { x: Math.round(BASE_SCREEN.width * 0.47) + 3, y: Math.round(BASE_SCREEN.height * 0.46) + 3 }
    const there = { x: Math.round(BASE_SCREEN.width * 0.63) + 7, y: Math.round(BASE_SCREEN.height * 0.65) + 1 }

    await movePointerTo(app.page, here)
    expect(
      await readLinesThroughPointer(app.page, here),
      `before any entrance is pressed the drawing already has a line standing on the pointer, so ` +
        'the counts below would be measuring something else',
    ).toEqual({ vertical: 0, horizontal: 0 })

    const crosshair = entranceNaming(`'${GUIDE_CROSSHAIR}'`)
    expect(await pressEntrance(app.page, crosshair), `${crosshair} is not on the screen`).toBe(true)
    await movePointerTo(app.page, here)
    expect(
      await readLinesThroughPointer(app.page, here),
      `${crosshair} sets the guide cursor to ${GUIDE_CROSSHAIR}, which table T-029 row CU-3 calls a ` +
        'crosshair: one line down and one across, both on the pointer',
    ).toEqual({ vertical: 1, horizontal: 1 })
    await movePointerTo(app.page, there)
    expect(
      await readLinesThroughPointer(app.page, there),
      'the crosshair did not follow the pointer to a second place, and CU-3 calls it a line that ' +
        'follows the pointer',
    ).toEqual({ vertical: 1, horizontal: 1 })

    const single = entranceNaming(`'${GUIDE_SINGLE_VERTICAL}'`)
    expect(await pressEntrance(app.page, single), `${single} is not on the screen`).toBe(true)
    await movePointerTo(app.page, there)
    expect(
      await readLinesThroughPointer(app.page, there),
      `${single} sets the guide cursor to ${GUIDE_SINGLE_VERTICAL}, which is one line down and ` +
        'nothing across',
    ).toEqual({ vertical: 1, horizontal: 0 })
    await movePointerTo(app.page, here)
    expect(
      await readLinesThroughPointer(app.page, here),
      'the single vertical line did not follow the pointer',
    ).toEqual({ vertical: 1, horizontal: 0 })

    // ⭐ And back. `CU-3` (MUST) has the four modes exclusive, so choosing one
    // has to put the one before it away -- otherwise the two counts above could
    // both be met by lines that simply pile up.
    const none = entranceNaming(`'${GUIDE_NONE}'`)
    expect(await pressEntrance(app.page, none), `${none} is not on the screen`).toBe(true)
    await movePointerTo(app.page, here)
    expect(
      await readLinesThroughPointer(app.page, here),
      `${none} sets the guide cursor to ${GUIDE_NONE}, and CU-3 has the four modes exclusive`,
    ).toEqual({ vertical: 0, horizontal: 0 })
  } finally {
    await app.close()
  }
})

// ---------------------------------------------------------------------------
// D-87 -- where the palette-visibility entrance stands in the header
// ---------------------------------------------------------------------------

// GOES RED IF: the entrance that shows and hides the command palette stops
// being the leftmost thing in the header, or the header's entrances stop
// standing in the order table T-109 lists them. That table's own preamble puts
// the ordering in its `group` column and nowhere else, and the row for that
// entrance says in as many words that it has a group of its own so as to stand
// at the left end of the `App Header` -- the user's instruction of 2026-08-27,
// "move it to the far left, to the left of the file reading and writing". So
// moving the row in the manuscript moves this case with it.
test('D-87: the header stands its entrances in the order of table T-109, palette first', async ({
  baseURL,
}) => {
  test.setTimeout(180_000)
  const app = await openTheApp(baseURL)
  try {
    const listed = entrancesOnSurface('App Header')
    const palette = entranceNaming('S-99e')
    expect(
      listed[0],
      'table T-109 no longer lists the palette-visibility entrance first among the header rows, so ' +
        'the manuscript and this case disagree about what D-87 asked for',
    ).toBe(palette)

    const boxes = await readEntranceBoxes(app.page, listed)
    expect(
      boxes.map((one) => one.entrance),
      'the header is missing entrances table T-109 puts on it',
    ).toEqual([...listed])

    const leftToRight = [...boxes].sort((one, two) => one.x - two.x).map((one) => one.entrance)
    expect(
      leftToRight,
      'the header draws its entrances in an order table T-109 does not list them in',
    ).toEqual([...listed])
    expect(
      leftToRight[0],
      `${palette} is not the leftmost entrance of the header`,
    ).toBe(palette)
  } finally {
    await app.close()
  }
})

// ---------------------------------------------------------------------------
// D-160 -- the entrances at the head of the row title panel
// ---------------------------------------------------------------------------

/**
 * The order table T-051 row `HF-10` (MUST) stands the panel head's entrances
 * in, left to right: open one level, close all, open all, add.
 *
 * ⭐ Written as the `HF` rows of table T-051 rather than as `IC-nn`, so that
 * table T-109 is the one that says which entrance carries which -- the same
 * split the manuscript itself keeps.
 */
const PANEL_HEAD_ORDER: readonly string[] = ['HF-16', 'HF-12', 'HF-10', 'HF-17']

/** Whether two boxes cover any of the same ground. @purity pure */
function doBoxesOverlap(one: Box, two: Box): boolean {
  return (
    one.x < two.x + two.width &&
    two.x < one.x + one.width &&
    one.y < two.y + two.height &&
    two.y < one.y + one.height
  )
}

// GOES RED IF: two of the entrances at the head of the row title panel cover any
// of the same ground, or one of them is drawn narrower than `FR-029` (MUST)
// allows -- a shape box of `S-138` a side with at least `S-141` of space on
// either side of it, which is 24px as the manuscript stands -- or the four stop
// standing in the order table T-051 row `HF-10` (MUST) gives them: open one
// level, close all, open all, add. What the user hit on 2026-08-30 was two of
// them 6px on top of each other, which is precisely what a pitch shorter than
// that width means.
test('D-160: the entrances at the head of the row title panel stand apart, in order', async ({
  baseURL,
}) => {
  test.setTimeout(180_000)
  const app = await openTheApp(baseURL)
  try {
    // ⛔ THE HEAD'S FOUR, NOT EVERY ENTRANCE TABLE T-109 PUTS ON THE PANEL.
    // Table T-051 (below `HF-18`) says the head holds four entrances and a row
    // holds seven, and names the four: `HF-16`, `HF-12`, `HF-10`, `HF-17`. The
    // seven a row holds are drawn beside each row's name and are not what D-160
    // is about.
    const head = PANEL_HEAD_ORDER.map(entranceRuledBy)
    const onPanel = entrancesOnSurface('Row Title Panel')
    for (const entrance of head) {
      expect(
        onPanel.includes(entrance),
        `table T-109 no longer puts ${entrance} on the Row Title Panel`,
      ).toBe(true)
    }

    const boxes = await readEntranceBoxes(app.page, head)
    expect(
      boxes.map((one) => one.entrance).sort(),
      'the head of the row title panel is missing entrances table T-051 puts on it',
    ).toEqual([...head].sort())

    for (const box of boxes) {
      expect(
        box.width,
        `${box.entrance} is drawn ${box.width}px wide, and FR-029 (MUST) has it hold a shape box of ` +
          `${ENTRANCE_SHAPE_PX}px with at least ${ENTRANCE_CLEAR_PX}px clear on either side`,
      ).toBeGreaterThanOrEqual(NARROWEST_ENTRANCE_PX)
    }

    const overlapping: string[] = []
    for (let i = 0; i < boxes.length; i += 1) {
      for (let j = i + 1; j < boxes.length; j += 1) {
        const one = boxes[i]
        const two = boxes[j]
        if (one === undefined || two === undefined) continue
        if (!doBoxesOverlap(one, two)) continue
        overlapping.push(
          `${one.entrance} (${one.x}..${one.x + one.width}) and ${two.entrance} ` +
            `(${two.x}..${two.x + two.width})`,
        )
      }
    }
    expect(overlapping, 'two entrances of the panel head cover the same ground').toEqual([])

    const drawnRules = [...boxes]
      .sort((one, two) => one.x - two.x)
      .map((one) => rowPanelRuleOf(one.entrance))
    expect(
      drawnRules,
      'the head of the row title panel does not stand its entrances in the order HF-10 gives',
    ).toEqual(PANEL_HEAD_ORDER)
  } finally {
    await app.close()
  }
})

// ---------------------------------------------------------------------------
// The rows themselves
// ---------------------------------------------------------------------------

/** The ledger rows the cases above hold down. */
const HELD: readonly string[] = ['D-34', 'D-45', 'D-72', 'D-87', 'D-160']

/**
 * The two files the ledger is kept in.
 *
 * ⛔ BOTH, AND `fixed-defects.md` IS NOT A SECOND LEDGER. Its own opening line
 * says it is the continuation of `defects.md` with the same nine columns, that
 * a row moves across once it has been measured, and that a tool reading only
 * one of the two measures the emptiness it harvested and comes out green. Every
 * row this file holds down is a row that has been fixed, so every one of them
 * is on its way across.
 */
const LEDGERS: readonly string[] = ['defects.md', 'fixed-defects.md']

// GOES RED IF: one of the rows above is taken out of the ledger altogether, or
// two entries here name the same row. A row that has left both files is a row
// whose case here no longer holds anything down.
test('every ledger row this file holds down is still a row of the ledger', () => {
  const written = LEDGERS.map((file) =>
    readFileSync(join(process.cwd(), 'docs', 'development-records', file), 'utf8'),
  )
  for (const row of HELD) {
    expect(
      written.some((ledger) => ledger.includes(`| ${row} |`)),
      `${row} has a case in this file but is a row of neither ${LEDGERS.join(' nor ')} under ` +
        'docs/development-records/',
    ).toBe(true)
  }
  expect(new Set(HELD).size, 'two entries name the same ledger row').toBe(HELD.length)
})
