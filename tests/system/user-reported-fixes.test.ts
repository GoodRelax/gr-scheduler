// One System case for each of eleven rows of the defect ledger
// (`docs/development-records/defects.md` and, once a row has been measured,
// `docs/development-records/fixed-defects.md`) -- rows that are fixed in the
// tree and were measured by hand, and that had nothing holding the fix down.
//
// The first five the user reported, and all five are visible on the screen:
//
//   D-34   the retired word for a notice is gone from every word the screen prints
//   D-45   resting on a task bar tells its name and its two dates
//   D-72   the guide cursor can be switched to a crosshair and to one vertical line
//   D-87   the palette-visibility entrance stands at the left end of the header
//   D-160  the entrances at the head of the row title panel do not sit on top of each other
//
// The last three stood at 「試験待ち」 on 2026-09-07 -- the build had landed and
// been measured by hand, and the anchor was the only thing missing:
//
//   D-277  the `Panel Divider` line is one colour, on the screen and in the picture
//   D-282  a loaded document's format version is compared with the greatest one known
//   D-297  a zoom holds the date under the pointer, and the middle date without one
//
// The last three were written against clauses of `FR-016` that were settled on
// 2026-09-07, one for each axis of the zoom and one for the row anchor:
//
//   D-375  magnifying the date axis stops with `S-229` days still on the screen
//   D-374  magnifying the row axis stops before one row fills the `Row Area`
//   D-366  a row-axis zoom leaves the row under the pointer where it was
//
// ⚠️ D-277 HAS NO CASE IN THE FILE THAT NAMES IT.
// `tests/system/divider-colour-corner-and-sticky-field.test.ts` judges the
// SCREEN half of that row and declines the two-sided one in its own header,
// citing a line of `image-exporter.ts` that has since moved: the hue now
// travels to the exporter with the request. The two-sided case is here.
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
// ⭐ THE LAST THREE CASES ASSERT NO NUMBER AT ALL, which is why none of them
// reads the manuscript for one. Each of the three requirements they lean on
// asks that two readings of the SAME running document AGREE -- the picture with
// the screen (`FR-080`, row `WY-2` of table T-041), the version of a document
// with the greatest version the build knows (`FR-073`), the date under a point
// before a zoom with the date under it after (`FR-016`) -- so both sides of
// every comparison are read off the application, and a value written here would
// be a third party to an agreement between two.
//
// ⭐ EACH CASE SAYS WHAT WOULD MAKE IT GO RED, in the sentence above its body.

import { expect, test, type Browser, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { bareAll, specTable, type SpecTable } from '../contract/spec-table'
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

/**
 * Row IDs of table T-109 that sit on one surface, in the table's own order.
 *
 * ⛔ THE WHOLE CELL IS READ, NOT ITS FIRST SPAN. An entrance may stand on
 * SEVERAL surfaces -- table T-109 has one row naming six of them -- and `bare`
 * refuses such a cell on purpose (`D-351`), which is what turned the two cases
 * below red once that row grew its sixth surface. ⭐ Membership is the right
 * reading: the row belongs to every surface its cell names.
 *
 * @purity pure
 */
function entrancesOnSurface(surface: string): readonly string[] {
  const found = T109.rows
    .filter((row) => row.cells.length === T109_COLUMNS)
    .filter((row) => bareAll(row.cells[SURFACE_COLUMN] ?? '').includes(surface))
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

// ⭐ Table T-029 row `CU-3` (MUST) has three modes and lets the reader choose
// between them, and names them in the same words `S-66` spells: none, a
// crosshair, one vertical line. All three are asked here.
//
// ⚠️ A FOURTH USED TO STAND. `S-66` records that `'double-vertical'` was
// retired on 2026-09-06 by the user's ruling, and `CU-3` now forbids it (MUST
// NOT) for the reason `docs/development-records/defects.md` row D-72 had
// already given: nothing told it apart from `CU-2`. `guideMode` above is what
// keeps this file honest -- a mode `S-66` does not offer cannot be named here.
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
// the application starts in already draws one, or a second press of the
// entrance that is standing stops putting the guide cursor away. The counts are
// table T-029 row `CU-3`'s own words -- a crosshair is two lines and one
// vertical line is one -- and the two entrances are looked up in table T-109 by
// the value of `S-66` each one sets, so renaming or renumbering them moves the
// case.
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

    // ⭐ And back. `CU-3` (MUST) has the three modes exclusive, so choosing one
    // has to put the one before it away -- otherwise the two counts above could
    // both be met by lines that simply pile up.
    //
    // ⛔ THE WAY BACK IS THE ENTRANCE THAT IS STANDING, PRESSED AGAIN, and that
    // is not a convenience: `FR-048` (MUST) has each of the three cursors put
    // away by pressing the entrance that brought it out, and (MUST NOT) forbids
    // an entrance whose job is to put one away -- so `'none'` stays a value of
    // `S-66` with no entrance of its own, as `S-66` says in as many words.
    // ⚠️ MEASURED, 2026-09-07: asking table T-109 for the entrance whose purpose
    // names `'none'` finds exactly one row, and it is the CROSSHAIR's own -- that
    // row spells `'none'` only to record that pressing IT again is the way back.
    // Pressing it from one vertical line therefore puts the crosshair up, and
    // this case read those two lines as a failure to put the cursor away.
    expect(await pressEntrance(app.page, single), `${single} is not on the screen`).toBe(true)
    await movePointerTo(app.page, here)
    expect(
      await readLinesThroughPointer(app.page, here),
      `pressing ${single} a second time puts the guide cursor back to ${GUIDE_NONE}, which is what ` +
        'FR-048 gives instead of an entrance of its own',
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
// The Agent API, which the last three cases read the running document through
// ---------------------------------------------------------------------------

/** `IC-20` of table T-109 -- `FR-065` keeps the `Agent API` shut until a person opens it. */
const AGENT_API_ENTRANCE = 'IC-20'

/** `AM-2` of table T-107 -- the greatest document format version this build knows. */
const AM_2 = 'schemaVersion'
/** `AM-3` of table T-107 -- a frozen copy of the whole document. */
const AM_3 = 'readDocument'
/** `AM-11` of table T-107 -- the open document's `GRS JSON`, as a value. */
const AM_11 = 'exportJson'
/** `AM-13` of table T-107 -- the picture, as a value. */
const AM_13 = 'exportSvg'

/**
 * Open the `Agent API` and fail by name when the entrance does not publish it.
 *
 * ⭐ The same helper `tests/system/divider-colour-corner-and-sticky-field.test.ts`
 * carries, word for word and for the same reason: what the three cases below
 * judge is the open document and what it writes out, and `FR-065` puts both
 * behind that one entrance.
 *
 * @purity non-pure
 */
async function openTheAgentApi(page: Page): Promise<void> {
  expect(
    await pressEntrance(page, AGENT_API_ENTRANCE),
    `the entrance ${AGENT_API_ENTRANCE} that FR-065 has open the Agent API is on the screen`,
  ).toBe(true)
  expect(
    await page.evaluate(
      /** @purity semi-pure-b */
      () => typeof (window as unknown as Record<string, unknown>).grSchedulerAgentApi,
    ),
    `pressing ${AGENT_API_ENTRANCE} published the Agent API`,
  ).toBe('object')
}

// ---------------------------------------------------------------------------
// D-277 -- the Panel Divider's line is ONE colour, screen and picture alike
// ---------------------------------------------------------------------------

/** One `Panel Divider` line, as the screen paints it and as the picture paints it. */
interface DividerPair {
  readonly at: string
  readonly screen: string
  readonly exported: string
}

/** What the reading below came back with. */
interface DividerReading {
  readonly refusal: string | null
  readonly hue: number | null
  readonly ratio: number
  readonly pairs: readonly DividerPair[]
  readonly unmatched: readonly string[]
}

/**
 * Every `Panel Divider` line on the screen, paired with the shape the picture
 * `AM-13` writes out puts in the same place.
 *
 * ⛔ BOTH SIDES ARE THE RUNNING DOCUMENT'S OWN, and no colour is written here.
 * The screen's line is asked what it is painted with; the picture's shape is
 * asked what it is filled with; the browser resolves both through one probe
 * element, so no rounding rule of this file can disagree with the one the page
 * used. `AT-19` is read only to say what hue the two were resolved at.
 *
 * ⛔ THE LINE ON THE SCREEN IS FOUND BY GEOMETRY, not by a name of the tree,
 * for the reason `tests/system/divider-colour-corner-and-sticky-field.test.ts`
 * gives: the specification settles the part's name (`Panel Divider`) and the
 * shell marks the band with it, but the line the band straddles carries no mark
 * of its own.
 *
 * ⭐ THE SHAPE IN THE PICTURE IS FOUND BY THE SAME GEOMETRY, SHRUNK. `FR-080`
 * (MUST) states the ratio as `exportCanvas`'s width over the screen's width, so
 * the picture's own root width over the screen's width IS that ratio and no
 * number of table T-204 has to be read here. A tolerance of one picture pixel
 * is allowed on each of the four terms, which is the rounding `WY-3` sets aside
 * in as many words.
 *
 * @purity semi-pure-b
 */
async function dividerColoursOnBothSides(
  page: Page,
  names: { readonly read: string; readonly picture: string; readonly divider: string; readonly canvas: string },
): Promise<DividerReading> {
  return page.evaluate((asked: { read: string; picture: string; divider: string; canvas: string }) => {
    const empty = { hue: null, ratio: 0, pairs: [], unmatched: [] }
    const api = (window as unknown as Record<string, Record<string, unknown> | undefined>)
      .grSchedulerAgentApi
    const read = api?.[asked.read]
    const picture = api?.[asked.picture]
    if (typeof read !== 'function' || typeof picture !== 'function') {
      return { refusal: `the Agent API published neither ${asked.read} nor ${asked.picture}`, ...empty }
    }
    const opened = (read as () => unknown).call(api) as {
      schedule?: { project?: { themeHue?: unknown } }
    }
    const hue = typeof opened.schedule?.project?.themeHue === 'number'
      ? opened.schedule.project.themeHue
      : null
    const written = (picture as () => unknown).call(api) as
      | { ok: true; value: string }
      | { ok: false; refusal: unknown }
    if (!written.ok) {
      return { refusal: `${asked.picture} refused: ${JSON.stringify(written.refusal)}`, ...empty }
    }

    const canvas = window.document.querySelector(asked.canvas)
    if (canvas === null) return { refusal: `no ${asked.canvas} on the screen`, ...empty }
    const canvasBox = canvas.getBoundingClientRect()
    const screenWidth = Math.max(1, canvasBox.x + canvasBox.width)
    const drawn = new DOMParser().parseFromString(written.value, 'image/svg+xml')
    const ratio = Number(drawn.documentElement.getAttribute('width')) / screenWidth
    if (!Number.isFinite(ratio) || ratio <= 0) {
      return { refusal: `the picture states no width this case can shrink by`, ...empty }
    }
    const shapes = Array.from(drawn.querySelectorAll('rect'))

    // One probe, asked what each colour computes to. ⭐ A sentinel is written
    // first, so a colour the browser refuses shows up as the sentinel rather
    // than as whatever the probe was last given.
    const probe = window.document.createElement('div')
    window.document.body.appendChild(probe)
    const resolved = (colour: string): string => {
      probe.style.color = 'rgb(1, 2, 3)'
      probe.style.color = colour
      return window.getComputedStyle(probe).color
    }

    const pairs: { at: string; screen: string; exported: string }[] = []
    const unmatched: string[] = []
    for (const band of Array.from(window.document.querySelectorAll(asked.divider))) {
      const over = band.getBoundingClientRect()
      for (const one of Array.from(window.document.querySelectorAll('*'))) {
        if (one === band) continue
        const box = one.getBoundingClientRect()
        const inside =
          box.x >= over.x - 1 &&
          box.x + box.width <= over.x + over.width + 1 &&
          Math.abs(box.y - over.y) <= 1 &&
          Math.abs(box.height - over.height) <= 1
        if (!inside) continue
        const background = window.getComputedStyle(one).backgroundColor
        if (background === 'rgba(0, 0, 0, 0)' || background === 'transparent') continue
        const at = `x=${String(Math.round(box.x))} y=${String(Math.round(box.y))} ` +
          `w=${String(Math.round(box.width * 100) / 100)} h=${String(Math.round(box.height))}`
        const near = shapes.filter(
          (shape) =>
            Math.abs(Number(shape.getAttribute('x')) - box.x * ratio) <= 1 &&
            Math.abs(Number(shape.getAttribute('y')) - box.y * ratio) <= 1 &&
            Math.abs(Number(shape.getAttribute('width')) - box.width * ratio) <= 1 &&
            Math.abs(Number(shape.getAttribute('height')) - box.height * ratio) <= 1,
        )
        if (near.length === 0) {
          unmatched.push(at)
          continue
        }
        for (const shape of near) {
          pairs.push({
            at,
            screen: resolved(background),
            exported: resolved(shape.getAttribute('fill') ?? ''),
          })
        }
      }
    }
    probe.remove()
    return { refusal: null, hue, ratio, pairs, unmatched }
  }, names)
}

// GOES RED IF: the shape the exported picture draws where the screen draws a
// `Panel Divider` line is filled with anything but the colour the screen paints
// that same line with, for the SAME open document -- which is what D-277 was:
// measured 2026-09-07 through `AM-13`, the screen painted `rgb(217, 221, 226)`
// and the picture filled `hsl(0 14% 87%)`, because the hue never reached the
// exporter. It also goes red if the picture holds no shape at all where the
// screen holds a line.
//
// ⭐ NEITHER COLOUR IS WRITTEN HERE. Both are read off the running application
// for the one document it has open, and the browser resolves both, so the case
// says only that the two are ONE -- which is what `FR-080` (MUST) and row
// `WY-2` of table T-041 ask of a written picture.
//
// ⛔ THE CASE REFUSES TO RUN AT A HUE OF 0, and that is deliberate: the whole of
// D-277 was a zero standing in for `AT-19`, so at a document whose own hue is 0
// the broken build and the fixed one paint the same thing and this case would
// pass on either.
//
// ⚠️ THE LINE'S THICKNESS IS A DIFFERENT ROW (`D-363`) and nothing here reads
// it: the shapes are paired by geometry, so a thickness the two sides agree on
// is all this case needs of it.
test('D-277: the picture fills the Panel Divider line with the colour the screen paints it', async ({
  baseURL,
}) => {
  test.setTimeout(240_000)
  const app = await openTheApp(baseURL)
  try {
    await openTheAgentApi(app.page)
    const reading = await dividerColoursOnBothSides(app.page, {
      read: AM_3,
      picture: AM_13,
      divider: '[data-role="Panel Divider"]',
      canvas: '[data-role="Schedule Canvas"]',
    })
    expect(reading.refusal, 'the picture could not be read').toBeNull()
    expect(
      reading.hue,
      'AM-3 handed back no number for the hue DR-5 of table T-052 puts on the project, so there ' +
        'is nothing to resolve either side at',
    ).not.toBeNull()
    expect(
      reading.hue,
      'the open document carries a hue of 0, and at that hue the build that dropped AT-19 on the ' +
        'way to the exporter paints exactly what the fixed one paints -- this case would pass on ' +
        'either, so it refuses to stand as an anchor for D-277',
    ).not.toBe(0)
    expect(
      reading.pairs.length,
      `no Panel Divider line on the screen was matched to a shape in the picture (ratio ` +
        `${String(reading.ratio)}), so there is nothing to compare`,
    ).toBeGreaterThan(0)
    expect(
      reading.unmatched,
      'the picture holds no shape where the screen holds a Panel Divider line, and EP-9 of table ' +
        'T-076 has the boundary line drawn in it',
    ).toEqual([])
    expect(
      reading.pairs.map((one) => `${one.at} exported=${one.exported}`),
      `FR-080 with WY-2 of table T-041: the picture is the screen shrunk, so each divider line is ` +
        `filled with the colour the screen paints it. Resolved at the open document's own hue ` +
        `${String(reading.hue)}`,
    ).toEqual(reading.pairs.map((one) => `${one.at} exported=${one.screen}`))
  } finally {
    await app.close()
  }
})

// ---------------------------------------------------------------------------
// D-282 -- a loaded document's schemaVersion is compared with something
// ---------------------------------------------------------------------------

/** The bundled startup template, whose own `schemaVersion` is the greatest version this build knows. */
const STARTUP_TEMPLATE = join(
  process.cwd(),
  'src',
  'framework',
  'single-html-shell',
  'startup-template.json',
)

/**
 * The one module `FR-073`'s comparison lives in, as the dev server serves it.
 *
 * ⛔ REACHED THROUGH THE PAGE AND NOT IMPORTED HERE, and that is not a
 * convenience. What D-282 built is a road with two ends -- the version the
 * build knows, which only the running application can hand over (`AM-2`), and
 * the reading the codec answers with -- and pressing the codec from Node would
 * judge one end against a version this file chose. The dev server serves the
 * very module the running application is built from, so both ends come from the
 * one build.
 *
 * ⚠️ WHAT THE SHELL DOES WITH THE READING IS NOT JUDGED HERE. The reading is
 * carried on the decoding and nothing consumes it yet; `U-61`'s telling is a
 * different wave and a different row.
 */
const JSON_CODEC_MODULE = '/src/adapter/document-codec/json-codec.ts'

/** What one document's version was read as, and the two versions it was read against. */
interface VersionReading {
  readonly refusal: string | null
  readonly greatest: string
  readonly own: string
  readonly later: string
  readonly asWritten: string
  readonly ahead: string
}

/**
 * Read the open document's own `GRS JSON` back through the codec twice: once as
 * it stands, and once with its version moved one year on.
 *
 * ⭐ THE DOCUMENT IS THE RUNNING ONE (`AM-11`), so nothing about its shape is
 * invented here; the only thing changed between the two readings is the one
 * value `FR-073` compares.
 *
 * ⭐ A YEAR IS ADDED RATHER THAN A DATE BEING WRITTEN DOWN. `FR-073` (MUST)
 * fixes the version as `YYYY-MM-DD` and (MUST) has the comparison made by
 * string order, so the same date a year on is later by that very rule and is
 * still of the form the requirement allows.
 *
 * @purity semi-pure-b
 */
async function versionReadings(
  page: Page,
  names: { readonly greatest: string; readonly json: string; readonly module: string },
): Promise<VersionReading> {
  return page.evaluate(
    async (asked: { greatest: string; json: string; module: string }) => {
      const empty = { greatest: '', own: '', later: '', asWritten: '', ahead: '' }
      const api = (window as unknown as Record<string, Record<string, unknown> | undefined>)
        .grSchedulerAgentApi
      const greatest = api?.[asked.greatest]
      const json = api?.[asked.json]
      if (typeof greatest !== 'string' || typeof json !== 'function') {
        return { refusal: `the Agent API published neither ${asked.greatest} nor ${asked.json}`, ...empty }
      }
      const written = (json as () => unknown).call(api) as
        | { ok: true; value: string }
        | { ok: false; refusal: unknown }
      if (!written.ok) {
        return { refusal: `${asked.json} refused: ${JSON.stringify(written.refusal)}`, ...empty }
      }
      const codec = (await import(asked.module)) as {
        documentFromJson: (
          text: string,
          greatestKnownSchemaVersion?: string,
        ) => { ok: boolean; formatVersion?: string; reason?: string }
      }
      if (typeof codec.documentFromJson !== 'function') {
        return { refusal: `${asked.module} publishes no documentFromJson`, ...empty, greatest }
      }
      const parsed = JSON.parse(written.value) as Record<string, unknown>
      const own = typeof parsed.schemaVersion === 'string' ? parsed.schemaVersion : ''
      const later = `${String(Number(greatest.slice(0, 4)) + 1)}${greatest.slice(4)}`
      const reading = (text: string): string => {
        const out = codec.documentFromJson(text, greatest)
        return out.ok ? (out.formatVersion ?? 'no reading at all') : `refused: ${String(out.reason)}`
      }
      return {
        refusal: null,
        greatest,
        own,
        later,
        asWritten: reading(written.value),
        ahead: reading(JSON.stringify({ ...parsed, schemaVersion: later })),
      }
    },
    names,
  )
}

// GOES RED IF: a document whose format version is later than the greatest one
// this build knows is read as anything but `newerThanKnown`, or one that is not
// later is read as anything but `known` -- which is what D-282 was: nothing
// under `tests/` pressed any of it, and until 2026-09-07 all four callers left
// the version out altogether, so every road answered `notCompared`. It also
// goes red if `AM-2` stops answering with the bundled startup template's own
// `schemaVersion`, which is the road that keeps the number from being retyped.
//
// ⛔ NOTHING IS ASSERTED ABOUT WHAT IS TOLD TO THE READER. `FR-073` (MUST) also
// has the columns that could not be read shown and the reader asked whether to
// go on; nothing counts those columns yet, and that is a different wave and a
// different row of the ledger.
test('D-282: a document later than the build reads as newerThanKnown, and one that is not reads as known', async ({
  baseURL,
}) => {
  test.setTimeout(240_000)

  const bundled = JSON.parse(readFileSync(STARTUP_TEMPLATE, 'utf8')) as { schemaVersion?: unknown }
  expect(
    typeof bundled.schemaVersion,
    `${STARTUP_TEMPLATE} carries no schemaVersion, and it is the one FR-073 calls the greatest ` +
      'version this build knows',
  ).toBe('string')

  const app = await openTheApp(baseURL)
  try {
    await openTheAgentApi(app.page)
    const read = await versionReadings(app.page, {
      greatest: AM_2,
      json: AM_11,
      module: JSON_CODEC_MODULE,
    })
    expect(read.refusal, 'the open document could not be read back through the codec').toBeNull()
    expect(
      read.greatest,
      `AM-2 of table T-107 answers with the greatest version this build knows, and the bundled ` +
        `startup template is where it is read off -- a second copy of that value is what rule 03 ` +
        'forbids',
    ).toBe(bundled.schemaVersion)
    expect(
      read.own <= read.greatest,
      `the open document states ${read.own}, which is later than the ${read.greatest} the build ` +
        'knows, so the first reading below would not be the one this case means to press',
    ).toBe(true)
    expect(
      read.asWritten,
      `the open document states ${read.own} against the ${read.greatest} this build knows, and ` +
        'FR-073 (MUST) makes only a LATER version unreadable',
    ).toBe('known')
    expect(
      read.ahead,
      `a document stating ${read.later} is later than the ${read.greatest} this build knows, ` +
        'which is what FR-073 (MUST) settles as the unreadable case',
    ).toBe('newerThanKnown')
  } finally {
    await app.close()
  }
})

// ---------------------------------------------------------------------------
// D-297 -- the centre a zoom is taken about
// ---------------------------------------------------------------------------

/** One tick of the time ruler: the day it stands on, and where it stands. */
interface Tick {
  readonly row: string
  readonly serial: number
  readonly x: number
}

/** The ruler's ticks and the band they stand in, as the page has them right now. */
interface RulerReading {
  readonly ticks: readonly Tick[]
  readonly band: { readonly x: number; readonly width: number }
}

/**
 * The time ruler as the drawing marks it.
 *
 * ⛔ THE HANDLES ARE THE DRAWING'S OWN AND THE SPECIFICATION SETTLES NEITHER --
 * see `tests/system/live-app.ts`. `SvgRenderer` names each tick by the row of
 * the tier and by the day it stands on, and names the band's ground; a change
 * to either marking breaks this case, as it should.
 *
 * ⭐ THE BAND IS WHERE THE `Row Area` IS. The two regions are laid with one x
 * and one width, so the ground of the ruler is what says where the `Row Area`'s
 * middle is on the screen -- which is the point `FR-016` (MUST) names for every
 * route that carries no pointer.
 *
 * @purity semi-pure-b
 */
async function readRuler(page: Page, canvas: string): Promise<RulerReading> {
  return page.evaluate((selector: string) => {
    const svg = window.document.querySelector(selector)
    const ticks: { row: string; serial: number; x: number }[] = []
    let band = { x: 0, width: 0 }
    if (svg === null) return { ticks, band }
    for (const element of Array.from(svg.querySelectorAll('[data-figure]'))) {
      const key = element.getAttribute('data-figure') ?? ''
      if (key === 'ruler-ground') {
        const ground = element.getBoundingClientRect()
        band = { x: ground.x, width: ground.width }
        continue
      }
      const found = /^ruler-([A-Za-z]+)-tick-(-?\d+)$/.exec(key)
      if (found === null) continue
      const box = element.getBoundingClientRect()
      ticks.push({ row: found[1] ?? '', serial: Number(found[2]), x: box.x })
    }
    return { ticks, band }
  }, canvas)
}

/** The time axis the ruler's ticks describe: where a day stands and how wide one is. */
interface TimeAxis {
  readonly pxPerDay: number
  readonly serialAtX: (x: number) => number
}

/**
 * The time axis, read off the ruler's own ticks.
 *
 * ⭐ TWO TICKS OF ONE ROW ARE ENOUGH, because the time axis is linear in the
 * zoom and every tick of a row stands on a day: the pixels between the first
 * tick and the last, over the days between them, is the width of one day, and
 * the day standing at any x follows. ⛔ Nothing about the layout is read from
 * `src/` and no number is written here.
 *
 * @purity pure
 */
function timeAxisOf(reading: RulerReading, what: string): TimeAxis {
  const rows = new Map<string, Tick[]>()
  for (const tick of reading.ticks) {
    const held = rows.get(tick.row) ?? []
    held.push(tick)
    rows.set(tick.row, held)
  }
  let best: Tick[] = []
  for (const held of rows.values()) if (held.length > best.length) best = held
  const sorted = [...best].sort((one, two) => one.serial - two.serial)
  const first = sorted[0]
  const last = sorted[sorted.length - 1]
  if (first === undefined || last === undefined || first.serial === last.serial) {
    throw new Error(`${what}: the time ruler shows fewer than two ticks of any one row`)
  }
  const pxPerDay = (last.x - first.x) / (last.serial - first.serial)
  if (!Number.isFinite(pxPerDay) || pxPerDay <= 0) {
    throw new Error(`${what}: the time ruler's ticks describe no time axis (${String(pxPerDay)})`)
  }
  return {
    pxPerDay,
    /** @purity pure */
    serialAtX: (x: number): number => first.serial + (x - first.x) / pxPerDay,
  }
}

/** The day a serial names, written the way `EZ-6` writes a date. @purity pure */
function dateOfSerial(serial: number): string {
  return new Date(serial * 86_400_000).toISOString().slice(0, 10)
}

/** The day standing under an x. @purity pure */
function dayUnder(axis: TimeAxis, x: number): string {
  return dateOfSerial(Math.floor(axis.serialAtX(x)))
}

// GOES RED IF: one notch of the wheel moves the date under the pointer, or one
// keyboard zoom -- a route that carries no pointer at all -- moves the date at
// the middle of the `Row Area`, or either of the two fails to change the width
// of a day (a zoom that did nothing would hold every date still by doing
// nothing). Measured on this build 2026-09-07 BEFORE the fix: the wheel moved
// the date under the pointer four days and the key moved the middle's date two.
//
// ⛔ ONLY THE DATE AXIS IS ASSERTED, AND THAT IS DELIBERATE. `FR-016` (MUST)
// names the row under the cursor as well, and the row axis is not written: it
// is not linear in the zoom, so the row a zoom lands on cannot be had without
// running the placement again, which table T-068 allows only for `FR-055`. That
// half is `D-366` of the ledger and is waiting on a ruling.
//
// ⚠️ THE POINTER IS PARKED AWAY FROM THE MIDDLE for the keyboard half, so that
// a build which centred every zoom on the pointer would move the middle's date
// and be caught. The wheel half asks for the opposite: its x is a day's middle
// well away from the `Row Area`'s own middle.
test('D-297: a zoom holds the date under the pointer, and the middle date when there is no pointer', async ({
  baseURL,
}) => {
  test.setTimeout(240_000)
  const app = await openTheApp(baseURL)
  const canvas = '[data-role="Schedule Canvas"] svg'
  try {
    const canvasBox = await app.page.evaluate((selector: string) => {
      const box = window.document.querySelector(selector)?.getBoundingClientRect()
      return box === undefined ? null : { x: box.x, y: box.y, width: box.width, height: box.height }
    }, canvas)
    expect(canvasBox, 'the Schedule Canvas is not on the screen').not.toBeNull()
    if (canvasBox === null) return

    // ---- the wheel, which carries a pointer (`MK-3`) --------------------
    const before = timeAxisOf(await readRuler(app.page, canvas), 'before the wheel')
    const band = (await readRuler(app.page, canvas)).band
    expect(band.width, 'the time ruler draws no ground, so the Row Area cannot be located').toBeGreaterThan(0)
    // ⭐ The middle of a day column, a quarter of the way in from the band's
    // left edge: away from the middle the keyboard half uses, and away from a
    // day boundary, so that which day stands under it does not turn on a
    // fraction of a pixel.
    const roughly = band.x + band.width * 0.25
    const at = Math.round(
      band.x + (Math.floor((roughly - band.x) / before.pxPerDay) + 0.5) * before.pxPerDay,
    )
    const middle = band.x + band.width / 2
    expect(
      Math.abs(at - middle),
      `the point the wheel is turned at (${String(at)}) is the middle of the Row Area, so this ` +
        'case could not tell a pointer-centred zoom from a middle-centred one',
    ).toBeGreaterThan(before.pxPerDay)
    const heldByPointer = dayUnder(before, at)

    await app.page.mouse.move(at, Math.round(canvasBox.y + canvasBox.height / 2))
    await app.page.keyboard.down('Shift')
    await app.page.mouse.wheel(0, -120)
    await app.page.keyboard.up('Shift')
    await readSettledDrawnSvg(app.page)

    const afterWheel = timeAxisOf(await readRuler(app.page, canvas), 'after the wheel')
    expect(
      afterWheel.pxPerDay,
      `one notch of the wheel left a day ${String(before.pxPerDay)}px wide, so nothing was zoomed ` +
        'and holding the date still proves nothing',
    ).not.toBe(before.pxPerDay)
    expect(
      dayUnder(afterWheel, at),
      `FR-016 (MUST): the date under the pointer does not move. The wheel was turned at x=` +
        `${String(at)}, where a day was ${String(before.pxPerDay)}px wide and is now ` +
        `${String(afterWheel.pxPerDay)}px`,
    ).toBe(heldByPointer)

    // ---- the keyboard, which carries none (`SK-16`) ---------------------
    // ⛔ THE POINTER IS TAKEN OFF THE MIDDLE FIRST. `FR-016` gives the middle
    // of the `Row Area` to routes with no pointer, and a pointer that happened
    // to be there would let a pointer-centred build pass.
    await app.page.mouse.move(Math.round(band.x + band.width * 0.1), Math.round(canvasBox.y + canvasBox.height / 2))
    const beforeKey = timeAxisOf(await readRuler(app.page, canvas), 'before the key')
    const heldByMiddle = dayUnder(beforeKey, middle)
    await app.page.keyboard.press('Shift+Equal')
    await readSettledDrawnSvg(app.page)

    const afterKey = timeAxisOf(await readRuler(app.page, canvas), 'after the key')
    expect(
      afterKey.pxPerDay,
      `the keyboard zoom left a day ${String(beforeKey.pxPerDay)}px wide, so nothing was zoomed`,
    ).not.toBe(beforeKey.pxPerDay)
    expect(
      dayUnder(afterKey, middle),
      `FR-016 (MUST): a route that carries no pointer takes the middle of the Row Area as the ` +
        `centre, so the date at x=${String(Math.round(middle))} does not move. The pointer was ` +
        `parked at x=${String(Math.round(band.x + band.width * 0.1))}, where the date was ` +
        `${dayUnder(beforeKey, band.x + band.width * 0.1)}`,
    ).toBe(heldByMiddle)
  } finally {
    await app.close()
  }
})

/**
 * The number of days `FR-016` (MUST) keeps on the screen, read out of the
 * manuscript at read time.
 *
 * ⭐ THE VALUE IS THE SPECIFICATION'S AND NOT THIS FILE'S -- the row is `S-229`
 * of table T-206, and its own note (MUST NOT) keeps the number out of `src/`
 * for the same reason it is kept out of here: 「`src/` に 10 を打ち込んではならな
 * い」. Moving the row moves this case with it.
 */
const VISIBLE_DAY_FLOOR = numberIn(cellOf(T206, 'S-229', 1, 3), 'table T-206 row S-229')

/**
 * How many days the ruler shows across the whole `Row Area`.
 *
 * ⭐ BOTH TERMS ARE READ OFF THE RUNNING APPLICATION: the ground of the ruler is
 * laid with the `Row Area`'s own x and width, and the width of one day comes
 * from the ticks. Nothing about the layout is taken from `src/`.
 *
 * @purity semi-pure-b
 */
async function visibleDaysNow(page: Page, canvas: string, what: string): Promise<number> {
  const reading = await readRuler(page, canvas)
  return reading.band.width / timeAxisOf(reading, what).pxPerDay
}

// GOES RED IF: turning the wheel towards magnification goes on making a day
// wider after the visible span has reached `S-229` days, or if the span it
// stops at is the same number of PIXELS PER DAY on two windows of different
// widths -- which is the fixed magnification the requirement forbids outright.
// Measured on this build 2026-09-07 BEFORE the fix, at the screen of table
// T-025 row `MC-6`: thirty notches of `MK-3` took a day to 384px wide and the
// screen to 4.43 days, and every further notch left it there because `S-76`'s
// own end was the only thing stopping it.
//
// ⭐ THE SECOND WINDOW IS WHAT SEPARATES A DERIVED CEILING FROM A STORED ONE.
// A build that had simply lowered `zoomMax` would stop at one magnification on
// both windows and show FEWER than `S-229` days on the narrower one.
//
// ⭐⭐ THE CLAUSES THIS CASE HOLDS, IN THE MANUSCRIPT'S OWN CHARACTERS. `FR-016`
// gained them on 2026-09-07 and the ledger row `D-377` booked the debt of
// having written them with no test carrying their words; each line below is the
// text of `docs/spec/01-04-requirements.md` ending at the marker, copied and
// not paraphrased, so that moving any of them moves this file too:
//
//   -203 の `S-75` / `S-76` が持つ範囲へ収めること（MUST）
//   拡大の側には、軸ごとに導かれる上限を置くこと（MUST）
//   無いところで止まる。**⛔ **固定の倍率で止めてはならない（MUST NOT）
//   の 表 T-206 の `S-229` 日を下回らない倍率とすること（MUST）
//   る。**⛔ **日数を `src/` に打ち込んではならない（MUST NOT）
//
// ⛔ THE ROW AXIS'S OWN CEILING IS NOT AMONG THEM AND MUST NOT BE ADDED UNTIL IT
// IS BUILT: `D-374` is not fixed in this tree, and a clause quoted by a test
// that does not exercise it is the debt this check was raised against, paid in
// appearance only.
test('D-375: magnifying the date axis stops with S-229 days still on the screen', async ({
  baseURL,
}) => {
  test.setTimeout(240_000)
  const app = await openTheApp(baseURL)
  const canvas = '[data-role="Schedule Canvas"] svg'
  const wheelAway = async (times: number): Promise<void> => {
    for (let turn = 0; turn < times; turn++) {
      await app.page.keyboard.down('Shift')
      await app.page.mouse.wheel(0, -120)
      await app.page.keyboard.up('Shift')
      await app.page.waitForTimeout(40)
    }
    await readSettledDrawnSvg(app.page)
  }
  try {
    const canvasBox = await app.page.evaluate((selector: string) => {
      const box = window.document.querySelector(selector)?.getBoundingClientRect()
      return box === undefined ? null : { x: box.x, y: box.y, width: box.width, height: box.height }
    }, canvas)
    expect(canvasBox, 'the Schedule Canvas is not on the screen').not.toBeNull()
    if (canvasBox === null) return
    await app.page.mouse.move(
      Math.round(canvasBox.x + canvasBox.width / 2),
      Math.round(canvasBox.y + canvasBox.height / 2),
    )

    // ---- the wide window ------------------------------------------------
    const before = await visibleDaysNow(app.page, canvas, 'before magnifying')
    expect(
      before,
      'the document opens with fewer days on the screen than the ceiling keeps, so magnifying ' +
        'it proves nothing',
    ).toBeGreaterThan(VISIBLE_DAY_FLOOR)
    // ⭐ Far more notches than it takes to reach the ceiling, so that a build
    // which only SLOWED the magnification is caught as well as one that never
    // stopped: at `S-53` = 1.1 a notch, thirty notches multiply the axis by
    // more than seventeen.
    await wheelAway(50)
    const wide = await readRuler(app.page, canvas)
    const wideDays = wide.band.width / timeAxisOf(wide, 'at the ceiling, wide window').pxPerDay
    expect(
      wideDays,
      `FR-016 (MUST): 「日付の軸（\`zoomX\`）の上限は、見えている範囲が ... 表 T-206 の ` +
        `\`S-229\` 日を下回らない倍率とすること（MUST）」. The Row Area is ` +
        `${String(Math.round(wide.band.width))}px wide and shows ${wideDays.toFixed(2)} days`,
    ).toBeGreaterThanOrEqual(VISIBLE_DAY_FLOOR - 0.01)
    // ⛔ AND IT REALLY STOPPED THERE. A ceiling that let the span keep falling
    // by a fraction of a day per notch would pass the line above on the first
    // reading and fail the person turning the wheel.
    await wheelAway(10)
    const further = await visibleDaysNow(app.page, canvas, 'past the ceiling, wide window')
    expect(
      further,
      `ten more notches took the screen from ${wideDays.toFixed(2)} days to ` +
        `${further.toFixed(2)}, so the magnification has no ceiling at all`,
    ).toBeGreaterThanOrEqual(VISIBLE_DAY_FLOOR - 0.01)

    // ---- the narrow window ----------------------------------------------
    // ⛔ FR-016 (MUST NOT): 「固定の倍率で止めてはならない（MUST NOT）」 ——
    // 「画面の広さも行の中身も環境で変わるので、倍率の直値はそのどちらにも合わない。」
    await app.page.setViewportSize({ width: 1280, height: 900 })
    await readSettledDrawnSvg(app.page)
    await wheelAway(20)
    const narrow = await readRuler(app.page, canvas)
    const narrowAxis = timeAxisOf(narrow, 'at the ceiling, narrow window')
    const narrowDays = narrow.band.width / narrowAxis.pxPerDay
    expect(
      narrow.band.width,
      'the narrower window did not narrow the Row Area, so the two readings are one reading',
    ).toBeLessThan(wide.band.width)
    expect(
      narrowDays,
      `FR-016 (MUST): the promise is a number of DAYS and not a magnification. The Row Area is ` +
        `now ${String(Math.round(narrow.band.width))}px wide and shows ${narrowDays.toFixed(2)} days`,
    ).toBeGreaterThanOrEqual(VISIBLE_DAY_FLOOR - 0.01)
    expect(
      narrowAxis.pxPerDay,
      `FR-016 (MUST NOT): 「固定の倍率で止めてはならない」. A day is ` +
        `${narrowAxis.pxPerDay.toFixed(2)}px wide at the ceiling of the ` +
        `${String(Math.round(narrow.band.width))}px window and was ` +
        `${timeAxisOf(wide, 'wide').pxPerDay.toFixed(2)}px at the ceiling of the ` +
        `${String(Math.round(wide.band.width))}px one -- one magnification for both widths is ` +
        'the fixed ceiling the requirement forbids',
    ).toBeLessThan(timeAxisOf(wide, 'wide').pxPerDay)
  } finally {
    await app.close()
  }
})

/**
 * Every row the panel drew, top first, with the band each stands in.
 *
 * ⭐ THE PANEL AND NOT THE PICTURE. `FR-098` raises a pinned row on both sides
 * at once, so the panel's boxes and the schedule's bands are cut from one
 * `RowPlacement` -- and the panel is the side that carries the row's identity
 * (`data-group-id`) and whether its name was cut (`data-truncated`), which is
 * what the two cases below have to follow across a zoom.
 *
 * @purity semi-pure-b
 */
async function rowBandsNow(page: Page): Promise<
  readonly { readonly id: string; readonly y: number; readonly height: number;
             readonly isCut: boolean }[]
> {
  return page.evaluate(() =>
    [...window.document.querySelectorAll('[data-group-id][data-depth]')]
      .map((row) => {
        const box = row.getBoundingClientRect()
        return {
          id: row.getAttribute('data-group-id') ?? '',
          y: box.y,
          height: box.height,
          isCut: row.getAttribute('data-truncated') === 'true',
        }
      })
      .sort((first, second) => first.y - second.y))
}

/**
 * The Schedule Canvas's own box, or null while it is not on the screen.
 *
 * @purity semi-pure-b
 */
async function canvasBoxNow(page: Page): Promise<
  { readonly x: number; readonly y: number; readonly width: number;
    readonly height: number } | null
> {
  return page.evaluate((selector: string) => {
    const box = window.document.querySelector(selector)?.getBoundingClientRect()
    return box === undefined ? null : { x: box.x, y: box.y, width: box.width, height: box.height }
  }, CANVAS)
}

/**
 * The tallest band on the screen.
 *
 * ⛔⛔ THIS SATURATES AND MAY NOT BE ASSERTED ON ALONE. Measured 2026-09-07: the
 * panel cuts a box at its own bottom edge, so a band taller than the panel reads
 * as the panel's remaining height and stops moving -- 977px on a 1080px window
 * and 597px on a 700px one, on a build with NO ceiling at all. A case built on
 * this number is green against the very defect it was written for, which is how
 * the first draft of `D-374`'s case passed against the unfixed tree.
 *
 * @purity pure
 */
function tallestBandOf(
  bands: readonly { readonly height: number }[],
): number {
  return bands.reduce((most, band) => (band.height > most ? band.height : most), 0)
}

/**
 * The distance from one band's top to the next one's -- the row PITCH, which is
 * what `LF-3` of table T-221 makes the band plus one `rowGap`.
 *
 * ⭐ IT IS THE READING THAT DOES NOT SATURATE, because it is a difference of two
 * tops rather than a height the panel may cut. Null while fewer than two rows
 * are drawn, which is itself the state a missing ceiling ends in.
 *
 * @purity pure
 */
function rowPitchOf(
  bands: readonly { readonly y: number }[],
): number | null {
  const first = bands[0]
  const second = bands[1]
  return first === undefined || second === undefined ? null : second.y - first.y
}

// GOES RED IF: turning the wheel towards magnification on the ROW axis goes on
// until one row fills the screen by itself, or settles at the same row pitch on
// two windows of different HEIGHTS -- which is the fixed magnification the
// requirement forbids outright -- or stops as soon as the last cut row name
// stops being cut, which the requirement forbids by name and by measurement.
//
// ⛔⛔ THE BAND HEIGHT IS DELIBERATELY NOT THE READING, AND THE FIRST DRAFT OF
// THIS CASE WAS RETIRED FOR TAKING IT. The panel cuts a box at its own bottom
// edge, so `tallestBandOf` saturates at the panel's remaining height and stops
// moving; MEASURED 2026-09-07 against the tree with NO ceiling at all, forty-
// five notches of `MK-4` left it reading 977.0px on a 1080px window and 597.0px
// on a 700px one -- two different numbers, unmoved by further notches, which
// passed both halves of the draft. The PITCH between two bands is a difference
// of two tops and cannot be cut, and the COUNT of rows drawn is what the
// requirement's own rationale is about.
//
// Measured 2026-09-07, forty-five notches of `MK-4` from the document of table
// T-025 row `MC-6`, BEFORE the fix and after it:
//
//                     rows drawn   pitch      widest label
//   1920x1080  before      1       (none)     13164px
//              after       2       600.6px     1168px
//   1920x700   before      1       (none)     13164px
//              after       3       153.7px      839px
//
// ⭐ BEFORE THE FIX THE TWO WINDOWS STOPPED AT ONE MAGNIFICATION -- the same
// 13164px label on both -- because `S-76`'s own end was the only thing that ever
// stopped it. That is the fixed ceiling the requirement forbids, arrived at by
// having no ceiling.
//
// ⭐⭐ AND THE CUT-NAME MARK IS RULED OUT BY MEASUREMENT, not by reading the
// source. A build that stopped when no row name was cut any longer would stop
// where `[data-truncated]` last read false anywhere on the screen; measured on
// this build that moment comes with the tallest band at 434.1px, and the
// magnifying goes on well past it. ⚠️ THIS HALF GOES RED FOR ONE PARTICULAR
// WRONG BUILD -- the one the ledger's own recommendation would have produced --
// and not for the unfixed tree, which overshoots rather than stopping early.
//
// ⭐⭐ THE CLAUSES THIS CASE HOLDS, IN THE MANUSCRIPT'S OWN CHARACTERS, each
// line being the text of `docs/spec/01-04-requirements.md` ending at the
// marker, copied and not paraphrased:
//
//   行の軸（`zoomY`）の上限は、いちばん高い行の帯が `Row Area` の高さに達する倍率とすること（MUST）
//   このために新しい設定値の行を立ててはならない（MUST NOT）
//   切られた名前の印を、この上限の信号にしてはならない（MUST NOT）
//
// ⛔ THE CLAUSES THIS CASE DOES NOT REACH ARE NOT QUOTED: 「字の大きさを 2 つ比べ
// て決めてはならない」 cannot be told apart from any other formula by what reaches
// the screen, and the ROW-anchor clauses belong to `D-366` below.
test('D-374: magnifying the row axis stops before one row fills the Row Area', async ({
  baseURL,
}) => {
  test.setTimeout(240_000)
  const app = await openTheApp(baseURL)
  const wheelAway = async (times: number): Promise<void> => {
    for (let turn = 0; turn < times; turn++) {
      await app.page.keyboard.down('Alt')
      await app.page.mouse.wheel(0, -120)
      await app.page.keyboard.up('Alt')
      await app.page.waitForTimeout(35)
    }
    await readSettledDrawnSvg(app.page)
  }
  try {
    const canvasBox = await canvasBoxNow(app.page)
    expect(canvasBox, 'the Schedule Canvas is not on the screen').not.toBeNull()
    if (canvasBox === null) return
    await app.page.mouse.move(
      Math.round(canvasBox.x + canvasBox.width / 2),
      Math.round(canvasBox.y + canvasBox.height / 2),
    )

    // ---- the tall window ------------------------------------------------
    const opened = await rowBandsNow(app.page)
    expect(opened.length, 'the document opens drawing fewer than three rows').toBeGreaterThan(2)
    // ⭐ The moment the last cut name stops being cut is caught DURING the
    // sweep, because after it the mark never comes back -- FR-016 records the
    // same shape: the count of cut names is non-decreasing in `zoomY`.
    let whenNoNameWasCut: number | null = null
    for (let turn = 0; turn < 45; turn++) {
      const bands = await rowBandsNow(app.page)
      if (whenNoNameWasCut === null && bands.every((band) => !band.isCut)) {
        whenNoNameWasCut = tallestBandOf(bands)
      }
      await wheelAway(1)
    }
    const tall = await rowBandsNow(app.page)
    const tallPitch = rowPitchOf(tall)
    expect(
      tallestBandOf(tall),
      `forty-five notches of MK-4 left the tallest band at ${tallestBandOf(opened).toFixed(1)}px, ` +
        'so nothing was zoomed and a ceiling proves nothing',
    ).toBeGreaterThan(tallestBandOf(opened))
    // ⭐⭐ THE REQUIREMENT'S OWN PICTURE OF WHERE THE MAGNIFYING ENDS: 「1 つの行が
    // 画面をちょうど埋めた先には、見せられるものが残っていない。」 A ceiling placed
    // where the tallest band REACHES the Row Area's height leaves the screen
    // holding more than that one row; one that never fires leaves exactly it.
    expect(
      tall.length,
      `FR-016 (MUST): 「行の軸（\`zoomY\`）の上限は、いちばん高い行の帯が \`Row Area\` の高さに` +
        `達する倍率とすること（MUST）」. Forty-five notches of MK-4 left ${String(tall.length)} ` +
        `row(s) on a ${String(canvasBox.height)}px canvas, the tallest reading ` +
        `${tallestBandOf(tall).toFixed(1)}px -- past the ceiling the magnifying goes on until ` +
        'one row fills the screen alone',
    ).toBeGreaterThan(1)
    // ⛔ AND IT REALLY STOPPED THERE. A ceiling that let the bands go on growing
    // by a few px a notch would pass a single reading and fail the person
    // turning the wheel.
    await wheelAway(10)
    const further = rowPitchOf(await rowBandsNow(app.page))
    expect(tallPitch, 'two bands are needed to measure a pitch and only one was drawn')
      .not.toBeNull()
    expect(
      further,
      `ten more notches took the row pitch from ${String(tallPitch)} to ${String(further)}, so ` +
        'the magnification has no ceiling at all',
    ).toBeCloseTo(tallPitch ?? 0, 0)

    // ⛔⛔ FR-016 (MUST NOT): 「切られた名前の印を、この上限の信号にしてはならない
    // （MUST NOT）」 —— the requirement's own measurement is that the mark does not
    // move with `zoomY` at all, so a build reading it would stop at the first
    // moment below rather than at the ceiling.
    expect(
      whenNoNameWasCut,
      'no cut row name was ever cleared during the sweep, so this build cannot be told apart ' +
        'from one that stopped on the mark',
    ).not.toBeNull()
    expect(
      tallestBandOf(tall),
      `FR-016 (MUST NOT): 「切られた名前の印を、この上限の信号にしてはならない（MUST NOT）」. ` +
        `The last cut row name cleared while the tallest band stood at ` +
        `${(whenNoNameWasCut ?? 0).toFixed(1)}px and the magnifying settled at ` +
        `${tallestBandOf(tall).toFixed(1)}px -- a build that stopped on the mark would have ` +
        'stopped at the first of the two',
    ).toBeGreaterThan((whenNoNameWasCut ?? 0) + 1)

    // ---- the short window -----------------------------------------------
    // ⛔ FR-016 (MUST NOT): 「このために新しい設定値の行を立ててはならない（MUST
    // NOT）」 —— 「画面の高さから導く。」 A stored magnification would settle at the
    // same pitch whatever the window is; this one is derived from a height, so a
    // shorter window has to settle lower.
    await app.page.setViewportSize({ width: 1920, height: 700 })
    await readSettledDrawnSvg(app.page)
    await wheelAway(25)
    const short = await rowBandsNow(app.page)
    const shortPitch = rowPitchOf(short)
    expect(
      short.length,
      `the short window settled with ${String(short.length)} row(s), so no pitch can be read ` +
        'and the ceiling did not fire there either',
    ).toBeGreaterThan(1)
    expect(
      shortPitch,
      `FR-016 (MUST NOT): 「このために新しい設定値の行を立ててはならない（MUST NOT）」 —— ` +
        `「画面の高さから導く。」 The row pitch settles at ${String(shortPitch)}px on a 700px ` +
        `window and at ${String(tallPitch)}px on a 1080px one; one pitch for both windows is ` +
        'the ceiling read off a stored number rather than off the screen',
    ).toBeLessThan(tallPitch ?? 0)
  } finally {
    await app.close()
  }
})

/**
 * The one file `MN-6` of table T-070 is about, read as text.
 *
 * ⛔ THE SOURCE AND NOT THE BUILD. What the case below asks is whether a
 * COMPONENT lays the schedule out for itself, and that is a fact about the
 * component's own file; a bundle has every unit in it and could not answer.
 */
const TRANSLATOR_SOURCE = join(
  process.cwd(), 'src', 'adapter', 'input-command-translator', 'input-command-translator.ts',
)

// GOES RED IF: one notch of the row-axis zoom (`MK-4`) moves the row under the
// pointer, or fails to change the height of that row's band at all (a zoom that
// did nothing would hold every row still by doing nothing), or if the Adapter
// starts running the placement itself. Measured on this build 2026-09-07 BEFORE
// the fix, at the screen of table T-025 row `MC-6`: one notch took a band from
// 148px to 205px and carried the point under the pointer 52.2px down the
// screen, because the display position was left naming the top edge. AFTER the
// fix the same notch moves it 1.45px, and four other rows of the same document
// move 0.33px to 0.38px.
//
// ⭐ THE ROW IS FOLLOWED BY ITS OWN IDENTITY (`data-group-id`) AND NOT BY ITS
// PLACE IN THE LIST. `FR-018` draws deeper rows as `zoomY` rises, so the third
// row on the screen before a notch need not be the third one after it.
//
// ⭐⭐ THE CLAUSES THIS CASE HOLDS, IN THE MANUSCRIPT'S OWN CHARACTERS:
//
//   ズームはポインタ位置を中心とし、カーソル下の日付と行が動かないこと（MUST）
//   倍率を変えたとき、行の軸でも掴んだ行を留めること（MUST）
//   Adapter に自前の割付けをさせてはならない（MUST NOT）
//
// ⛔ AND ONE IT DOES NOT: 「その倍率での行の位置を答えるメンバを、表 T-064 の
// `PI-5` に置くこと（MUST）」 says WHERE a member sits, and nothing that reaches
// this case can see a table of published names. Check 26b is what holds it.
test('D-366: one notch of the row-axis zoom leaves the row under the pointer where it was', async ({
  baseURL,
}) => {
  test.setTimeout(240_000)
  const app = await openTheApp(baseURL)
  try {
    const canvasBox = await canvasBoxNow(app.page)
    expect(canvasBox, 'the Schedule Canvas is not on the screen').not.toBeNull()
    if (canvasBox === null) return
    const before = await rowBandsNow(app.page)
    expect(before.length, 'the document draws fewer than four rows to choose from')
      .toBeGreaterThan(3)
    // ⭐ A row well down the picture and not the first: the top edge is where a
    // build that never moved the anchor happens to be right, so a case taken
    // there could not tell the two builds apart.
    const held = before[3]
    expect(held, 'the fourth row is not on the screen').not.toBeUndefined()
    if (held === undefined) return
    const at = Math.round(held.y + held.height / 2)

    await app.page.mouse.move(Math.round(canvasBox.x + canvasBox.width * 0.6), at)
    await app.page.keyboard.down('Alt')
    await app.page.mouse.wheel(0, -120)
    await app.page.keyboard.up('Alt')
    await readSettledDrawnSvg(app.page)

    const after = await rowBandsNow(app.page)
    const sameRow = after.find((band) => band.id === held.id)
    expect(
      sameRow,
      `the row the pointer was over (${held.id}) is no longer drawn after one notch`,
    ).not.toBeUndefined()
    if (sameRow === undefined) return
    expect(
      sameRow.height,
      `one notch of MK-4 left the band ${held.height.toFixed(1)}px tall, so nothing was zoomed ` +
        'and holding the row still proves nothing',
    ).not.toBe(held.height)
    // The same point of the same row, measured as a fraction of its band so that
    // a band which grew is followed rather than its top edge.
    const into = (at - held.y) / held.height
    const nowAt = sameRow.y + into * sameRow.height
    expect(
      Math.abs(nowAt - at),
      `FR-016 (MUST): 「ズームはポインタ位置を中心とし、カーソル下の日付と行が動かないこと` +
        `（MUST）」 and 「倍率を変えたとき、行の軸でも掴んだ行を留めること（MUST）」. The wheel ` +
        `was turned at y=${String(at)}, where the band was ${held.height.toFixed(1)}px and is ` +
        `now ${sameRow.height.toFixed(1)}px; the point under the pointer has moved to ` +
        `y=${nowAt.toFixed(1)}`,
    ).toBeLessThanOrEqual(4)

    // ⛔ FR-016 (MUST NOT): 「Adapter に自前の割付けをさせてはならない（MUST NOT）」.
    // ⚠️ WHAT THIS REACHES AND WHAT IT DOES NOT: it shows that the one component
    // MN-6 of table T-070 was written about does not call the placement, which
    // is the half a test can see. It does NOT show that every second run stays
    // inside `layoutEngine` -- other components would each need their own line,
    // and check 19 is what reads the tree's edges.
    // ⛔ THE CODE AND NOT THE COMMENTS. That file explains WHY it does not lay
    // the schedule out, and naming the placement in order to say so is not
    // doing it -- a bare `includes` reads the explanation as the offence.
    const translator = readFileSync(TRANSLATOR_SOURCE, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/(^|\n)[ \t]*\/\/[^\n]*/g, '$1')
    expect(
      /\blayoutFromSchedule\b/.test(translator),
      `FR-016 (MUST NOT): 「Adapter に自前の割付けをさせてはならない（MUST NOT）」. ` +
        'input-command-translator.ts names layoutFromSchedule outside its comments, so the ' +
        'Adapter is laying the schedule out for itself instead of asking PI-5 where the rows ' +
        'will be',
    ).toBe(false)
  } finally {
    await app.close()
  }
})

// ---------------------------------------------------------------------------
// The rows themselves
// ---------------------------------------------------------------------------

/** The ledger rows the cases above hold down. */
const HELD: readonly string[] = [
  'D-34',
  'D-45',
  'D-72',
  'D-87',
  'D-160',
  'D-277',
  'D-282',
  'D-297',
  'D-366',
  'D-374',
  'D-375',
]

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
