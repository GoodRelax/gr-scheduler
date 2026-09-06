// System cases for two rows of `docs/development-records/defects.md` that stood
// at 「試験待ち」 on 2026-09-07: the fix is in and was measured by hand on the
// shipped build, and nothing automated holds it down.
//
//   D-318  a document with no row drawn at all -- pressing the head's entrance
//          that adds a row at the shallowest tier put the row in the document
//          and drew nothing, and told nobody
//   D-319  the watermark unlock field -- one `Esc` took the edit back but did
//          not let the field go, so the field went on taking what was typed
//          after the tier that owned it had been consumed
//
// ⛔⛔ D-306 IS NOT HERE, AND THAT IS A FINDING RATHER THAN AN OMISSION. The
// row asked for the pinned band, and it is already held down:
// `tests/unit/fr-098-the-band-does-not-scroll.test.ts` carries seventeen cases
// over `FR-098`'s two clauses of 2026-09-06 -- the band staying inside the
// `Row Area`, the pinned row the band cannot hold not being drawn, the
// survivors being a prefix of the pin order, and taking a pin out bringing the
// row back -- and the ledger row itself records them. Measured 2026-09-07:
// 17 passed. A second file over the same clauses would be a second copy to keep
// in step, which is the one thing rule 03 forbids of a rule with two homes.
//
// ⛔ NO SENTENCE OF THE MANUSCRIPT IS QUOTED OR TRANSLATED HERE. Rule 03
// section 5 asks for the row ID instead, so every claim below cites the row
// that carries it and the reader goes to `docs/spec` for the wording.
//
// ⭐ EVERY ROW ID AND EVERY PART NAME ASSERTED IS READ OUT OF `docs/spec` AT
// READ TIME -- which entrance adds a row at the shallowest tier, which one
// folds every row, which one unfolds every row, which entrance raises the
// watermark unlock face, what that face is called, which column of table T-058
// is a row's name, and where `Esc`'s tiers stand relative to one another. A row
// that is renumbered moves this file with it. Nothing below is a number or an
// identifier read off the running application.
//
// ⛔ NO `swsCase` IS DECLARED, for the reason
// `tests/system/user-reported-fixes.test.ts` gives: table T-219 row `TW-2` has
// Chapter 9's cases generated from those declarations and hung from an
// `SWS-xxx` node of Chapter 6.1, and none of today's nodes is about the head's
// add entrance or the watermark unlock field. The rows each case leans on are
// named in prose, at the case.
//
// ⛔ WHAT IS PRESSED IS THE SHIPPED BUILD -- `dist/index.html` over `file://`,
// as `tests/system/three-rows-read-from-the-spec-alone.test.ts` presses it.
//
// ⛔ WHAT WAS READ OF `src/`: nothing. Every handle used here (`[data-role]`,
// `[data-icon]`, `[data-depth]`, `[data-field-row]`, `[data-field-kind]`) is
// one the neighbouring System files already lean on, and the specification
// settles none of them -- see `tests/system/live-app.ts`, which says so of
// `DRAWN_SVG`.
//
// ⭐ EACH CASE SAYS WHAT WOULD MAKE IT GO RED, in the sentence above its body.
//
// ⭐⭐ AND EACH OF THE TWO WAS WATCHED GOING RED, which rule 04 section 2 asks
// for before a check counts as holding anything (2026-09-07, without touching
// `src/`: the tree was taken out with `git archive` and built beside this one).
//   D-318  `frame-loop.ts` as it stood at `1024dbd`, the commit before the fix:
//          folding every row then pressing the head's add entrance drew 0 rows
//          and raised 0 notices, and the properties panel carried no name
//          field. Two readings below go red on that build.
//   D-319  the whole tree at `82b69d8`, the commit before the fix: the face
//          still closed on the second `Esc`, so THAT reading tells the builds
//          apart not at all. What does is the character typed after the first
//          `Esc` -- 「z」 landed in the field on the broken build and nowhere on
//          the fixed one. The case reads that, and says so at its body.

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

const T025: SpecTable = specTable('T-025')
const T028: SpecTable = specTable('T-028')
const T051: SpecTable = specTable('T-051')
const T058: SpecTable = specTable('T-058')
const T103: SpecTable = specTable('T-103')
const T109: SpecTable = specTable('T-109')
const T206: SpecTable = specTable('T-206')

/** The screen of the base environment: table T-025, row `MC-6`. */
const BASE_SCREEN = screenOf(rowOf(T025, 'MC-6'))

/**
 * The one entrance of table T-109 whose rule is this row of table T-051.
 *
 * ⚠️ Anchored on the digits, so that asking for `HF-1` cannot be answered by
 * `HF-12`, and asking for `HF-12` cannot be answered by `HF-120`. The
 * neighbouring System file gives the same reason for the same guard.
 *
 * @purity pure
 */
function entranceRuledBy(rule: string): string {
  const wanted = new RegExp(`${rule}(?![0-9])`)
  const found = T109.rows.filter((row) => row.cells.some((cell) => wanted.test(cell)))
  if (found.length !== 1) {
    throw new Error(
      `table T-109 has ${found.length} entrances whose rule is ${rule}, and this file needs one`,
    )
  }
  return found[0]?.id ?? ''
}

/** `IC-93` -- table T-051 row `HF-17`: adds one row at the shallowest tier. */
const ADD_AT_SHALLOWEST = entranceRuledBy('HF-17')
/** `IC-78` -- table T-051 row `HF-12`: folds every row, the shallowest tier too. */
const FOLD_EVERY_ROW = entranceRuledBy('HF-12')
/** `IC-74` -- table T-051 row `HF-10`: unfolds every row. */
const UNFOLD_EVERY_ROW = entranceRuledBy('HF-10')

/**
 * The `AT-nn` of table T-058 that is one column of one entity.
 *
 * ⭐ Resolved rather than written: the shell marks a field of the properties
 * panel with the row of table T-058 it edits, so naming the entity and the
 * column here means the case follows the manuscript if a row is renumbered.
 *
 * @purity pure
 */
function columnRowOf(entity: string, column: string): string {
  const found = T058.rows.filter(
    (row) => (row.cells[0] ?? '').includes(entity) && (row.cells[1] ?? '').includes(`\`${column}\``),
  )
  if (found.length !== 1) {
    throw new Error(
      `table T-058 has ${found.length} rows for ${entity}.${column}, and this file needs one`,
    )
  }
  return found[0]?.id ?? ''
}

/** `AT-53` -- `TaskGroup.label`, the field table T-051 row `HF-14` names a row in. */
const ROW_NAME_COLUMN = columnRowOf('TaskGroup', 'label')

/**
 * A row of a table, as one string, so that a clause can be looked for wherever
 * in the row it was written.
 *
 * @purity pure
 */
function wholeRow(table: SpecTable, id: string): string {
  return rowOf(table, id).cells.join(' ')
}

/** The settled name of a UI part, out of table T-103. @purity pure */
function partNamed(id: string): string {
  const found = /`([^`]+)`/.exec(rowOf(T103, id).cells[0] ?? '')
  if (found === null) throw new Error(`table T-103 row ${id} states no part name this file can read`)
  return found[1] ?? ''
}

/** `Watermark Unlock` -- the face `FR-020` raises before the watermark is put away. */
const WATERMARK_UNLOCK_PART = partNamed('U-60')

/**
 * The entrance table T-103 row `U-60` names as the way to that face.
 *
 * ⭐ Taken from `U-60` rather than written, so that the case follows the row
 * that owns the face rather than a copy of its entrance number.
 */
const WATERMARK_ENTRANCE = (() => {
  const found = [...wholeRow(T103, 'U-60').matchAll(/IC-\d+/g)].map((one) => one[0])
  const only = [...new Set(found)]
  if (only.length !== 1) {
    throw new Error(
      `table T-103 row U-60 names ${only.length} entrances (${only.join(', ')}), and this file ` +
        'needs exactly one',
    )
  }
  return only[0] ?? ''
})()

// The words of table T-028 row `IN-4` this file has to find its own tiers by,
// built from their code points.
// ⚠️ Given as escapes rather than as the characters themselves: rule 03 section
// 5 keeps this tree ASCII, and the neighbouring System file gives the same
// reason for the same three words.
/** U+305D U+306E U+5834 U+306E U+7DE8 U+96C6 -- an edit made where it stands. */
const IN_PLACE_EDIT_WORD = String.fromCharCode(0x305d, 0x306e, 0x5834, 0x306e, 0x7de8, 0x96c6)
/** U+958B U+3044 U+3066 U+3044 U+308B U+9762 -- an open face. */
const OPEN_FACE_WORD = String.fromCharCode(0x958b, 0x3044, 0x3066, 0x3044, 0x308b, 0x9762)
/** U+2026 -- the ellipsis `FR-085` ends a name with when it does not fit. */
const ELLIPSIS = String.fromCharCode(0x2026)

/**
 * Where a tier stands in the order table T-028 row `IN-4` writes.
 *
 * ⭐ Read out of the cell so that the ORDER asserted below is the manuscript's
 * and not one copied into this file.
 *
 * @purity pure
 */
function escOrderOf(word: string, what: string): number {
  const at = wholeRow(T028, 'IN-4').indexOf(word)
  if (at < 0) {
    throw new Error(`table T-028 row IN-4 no longer names the tier ${what}, so its order is unknown`)
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
const PROPERTIES = '[data-role="Properties Panel"]'

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
  // ⛔ THE HOOK'S OWN ALLOWANCE, NOT AN ASSERTION'S. `CLEARING_UP_MS` of
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
 * Press an entrance of table T-109 wherever it stands, with a real pointer.
 *
 * ⛔ A REAL POINTER, not `element.click()`. The shell builds its input from
 * pointer events, and a synthetic click has reached nothing in this project
 * before.
 *
 * @purity non-pure
 */
async function pressEntrance(page: Page, icon: string): Promise<boolean> {
  const at = await page.evaluate((wanted: string) => {
    const entry = document.querySelector(`[data-icon="${wanted}"]`)
    if (entry === null) return null
    const box = entry.getBoundingClientRect()
    if (box.width < 1 || box.height < 1) return null
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
  }, icon)
  if (at === null) return false
  await page.mouse.move(at.x, at.y)
  await page.mouse.down()
  await page.mouse.up()
  await page.waitForTimeout(700)
  return true
}

/** One row the Row Title Panel is drawing right now. */
interface DrawnRow {
  readonly depth: number
  readonly name: string
}

/**
 * Every row the Row Title Panel is drawing, in its own order.
 *
 * ⚠️ Names come back CUT: `FR-085` ends a name that does not fit with an
 * ellipsis, and that is the requirement working -- see `namesTheSameRow`.
 *
 * @purity semi-pure-b
 */
async function drawnRows(page: Page): Promise<DrawnRow[]> {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('[data-depth]')).map((row) => ({
      depth: Number(row.getAttribute('data-depth')),
      name: (row.querySelector('span')?.textContent ?? '').trim(),
    })),
  )
}

/** A short description of what was drawn, for a failure that has to say it. @purity pure */
function describe(some: readonly DrawnRow[]): string {
  return some.map((one) => `${String(one.depth)}:${one.name}`).join(' | ')
}

/**
 * Whether a name drawn in the panel is the name this text names.
 *
 * ⭐ Not a plain equality: `FR-085` (MUST) ends a name that does not fit the
 * panel with an ellipsis, so a drawn name is either the whole of it or a head
 * of it followed by that mark.
 *
 * @purity pure
 */
function namesTheSameRow(drawn: string, whole: string): boolean {
  if (drawn === whole) return true
  return drawn.endsWith(ELLIPSIS) && whole.startsWith(drawn.slice(0, -1))
}

/** What the properties panel is showing, and where its focus is. @purity semi-pure-b */
async function panelState(
  page: Page,
  column: string,
): Promise<{ width: number; hasField: boolean; focusedRow: string | null; value: string | null }> {
  return page.evaluate(
    (asked: { panel: string; column: string }) => {
      const shown = document.querySelector(asked.panel)
      const focused = document.activeElement
      const field = shown?.querySelector(`[data-field-row="${asked.column}"][data-field-kind]`)
      return {
        width: Math.round(shown?.getBoundingClientRect().width ?? 0),
        hasField: field !== null && field !== undefined,
        focusedRow: focused?.getAttribute('data-field-row') ?? null,
        value: field instanceof HTMLInputElement ? field.value : null,
      }
    },
    { panel: PROPERTIES, column },
  )
}

/**
 * Take the Row Title Panel as far towards the top as it goes.
 *
 * ⚠️ MEASURED 2026-09-07: a wheel over the panel moves nothing while a field of
 * the properties panel still holds the typing, which is why every caller
 * releases that field first. What is asked for here is far more travel than the
 * document has, so the panel settles at its own top rather than at a guess.
 *
 * @purity non-pure
 */
async function takeThePanelToTheTop(page: Page): Promise<void> {
  await page.mouse.move(BASE_SCREEN.width / 4, BASE_SCREEN.height / 2)
  for (let turns = 0; turns < 40; turns += 1) await page.mouse.wheel(0, -400)
  await page.waitForTimeout(900)
}

/** Whether the watermark unlock face is up. @purity semi-pure-b */
async function unlockFaceIsUp(page: Page): Promise<boolean> {
  return page.evaluate(
    (part: string) =>
      Array.from(document.querySelectorAll('[data-role]')).some((marked) =>
        (marked.getAttribute('data-role') ?? '').includes(part),
      ),
    WATERMARK_UNLOCK_PART,
  )
}

/** What the unlock field holds, or `null` while the face is not up. @purity semi-pure-b */
async function unlockFieldValue(page: Page): Promise<string | null> {
  return page.evaluate((part: string) => {
    const field = document.querySelector(`[data-role*="${part}"] input`)
    return field instanceof HTMLInputElement ? field.value : null
  }, WATERMARK_UNLOCK_PART)
}

/** Put the caret in the unlock field with a real pointer. @purity non-pure */
async function pressTheUnlockField(page: Page): Promise<boolean> {
  const at = await page.evaluate((part: string) => {
    const field = document.querySelector(`[data-role*="${part}"] input`)
    if (field === null) return null
    const box = field.getBoundingClientRect()
    if (box.width < 1 || box.height < 1) return null
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
  }, WATERMARK_UNLOCK_PART)
  if (at === null) return false
  await page.mouse.move(at.x, at.y)
  await page.mouse.down()
  await page.mouse.up()
  await page.waitForTimeout(400)
  return true
}

// ---------------------------------------------------------------------------
// The manuscript still says what these cases read
// ---------------------------------------------------------------------------

// GOES RED IF: the clauses these cases lean on leave the manuscript. Table
// T-051 row `HF-17` is what makes the head's add entrance open the shallowest
// tier's own fold, and it names the setting that fold lives in (`S-211` of
// table T-206) and the row it borrows the naming from (`HF-14`); `S-211` names
// `HF-17` back as one of the ways out of that fold. `FR-020` puts the watermark
// unlock face up, and table T-103 row `U-60` is the face.
test('the rows these cases are read from are still the rows that carry them', () => {
  const hf17 = wholeRow(T051, 'HF-17')
  expect(hf17, 'table T-051 row HF-17 still names the setting the fold lives in').toContain('S-211')
  expect(hf17, 'table T-051 row HF-17 still sends the naming to HF-14').toContain('HF-14')

  expect(
    wholeRow(T206, 'S-211'),
    'table T-206 row S-211 still names HF-17 as a way out of the fold',
  ).toContain('HF-17')

  expect(
    wholeRow(T103, 'U-60'),
    'table T-103 row U-60 is still the face FR-020 raises',
  ).toContain('FR-020')

  // ⭐ `IN-5a` is why 「入力中」 is a state with consequences of its own, which is
  // what the third reading of the watermark case leans on. Read for its
  // presence only -- the row's own wording is `docs/spec`'s to keep.
  expect(
    T028.rows.map((row) => row.id),
    'table T-028 still carries IN-5a, the row that gives 入力中 its consequences',
  ).toContain('IN-5a')

  expect(
    [ADD_AT_SHALLOWEST, FOLD_EVERY_ROW, UNFOLD_EVERY_ROW, WATERMARK_ENTRANCE],
    'the four entrances these cases press are four different rows of table T-109',
  ).toHaveLength(new Set([ADD_AT_SHALLOWEST, FOLD_EVERY_ROW, UNFOLD_EVERY_ROW, WATERMARK_ENTRANCE]).size)
})

// ---------------------------------------------------------------------------
// D-318 -- HF-17: a row added while nothing at all is drawn
// ---------------------------------------------------------------------------

// GOES RED IF: the entrance table T-051 row `HF-17` puts at the head adds a row
// to the document and draws nothing. `HF-17` (MUST) has the row that was raised
// brought into view, forbids (MUST NOT) sending the field alone, sends the
// naming to `HF-14` -- which (MUST) puts the properties panel up with the row's
// name field -- and (MUST) opens the shallowest tier's own fold (`S-211`) when
// it is closed. The state this case starts from is the one table T-051 row
// `HF-12` says it can leave behind: no row drawn at all.
test(`HF-17: with no row drawn at all, ${ADD_AT_SHALLOWEST} draws the row it raises`, async () => {
  test.setTimeout(180_000)
  const opened = await openTheApp()
  const page = opened.page
  try {
    expect(
      (await drawnRows(page)).length,
      'the build opens with rows drawn, so folding them away is a change',
    ).toBeGreaterThan(0)

    expect(
      await pressEntrance(page, FOLD_EVERY_ROW),
      `the entrance ${FOLD_EVERY_ROW} is on the screen`,
    ).toBe(true)
    const folded = await drawnRows(page)
    expect(
      folded.length,
      `HF-12: every row is folded, the shallowest tier too, so none is drawn; saw ` +
        `[${describe(folded)}]`,
    ).toBe(0)

    expect(
      await pressEntrance(page, ADD_AT_SHALLOWEST),
      `the entrance ${ADD_AT_SHALLOWEST} is on the screen`,
    ).toBe(true)

    const after = await drawnRows(page)
    expect(
      after.length,
      'HF-17 (MUST): the row that was raised is drawn, and not left in the document alone',
    ).toBeGreaterThan(0)

    const panel = await panelState(page, ROW_NAME_COLUMN)
    expect(panel.width, 'HF-14: the properties panel is put up').toBeGreaterThan(0)
    expect(panel.hasField, `HF-14: the panel carries the ${ROW_NAME_COLUMN} field`).toBe(true)
    expect(panel.focusedRow, `HF-14: the naming is asked for in ${ROW_NAME_COLUMN}`).toBe(
      ROW_NAME_COLUMN,
    )

    const named = panel.value ?? ''
    expect(
      after.some((row) => namesTheSameRow(row.name, named)),
      `HF-17 (MUST NOT): the field is not sent on its own -- the row it names is drawn. ` +
        `The field holds ${JSON.stringify(named)}; the panel drew [${describe(after)}]`,
    ).toBe(true)
  } finally {
    await opened.close()
  }
})

// GOES RED IF: adding a row at the shallowest tier opens every tier. Table
// T-051 row `HF-17` (MUST) opens ONE tier of the fold `S-211` holds and forbids
// (MUST NOT) opening them all, on the ruling of 2026-09-06. The guard at the
// head of the body is what stops this reading from being empty: the document
// this build opens really does have rows below the shallowest tier, so drawing
// none of them is a restriction and not an accident of the fixture.
//
// ⚠️ THE `Esc` IS NOT PART OF THE JUDGEMENT. It lets the name field go so that
// the wheel reaches the panel (table T-028 row `IN-4`, the tier above the
// face); what is read afterwards is which tiers were opened, not what `Esc` did.
test(`HF-17 (MUST NOT): ${ADD_AT_SHALLOWEST} opens one tier of the fold, not every tier`, async () => {
  test.setTimeout(180_000)
  const opened = await openTheApp()
  const page = opened.page
  try {
    const atOpening = await drawnRows(page)
    const shallowest = Math.min(...atOpening.map((row) => row.depth))
    expect(
      atOpening.some((row) => row.depth > shallowest),
      `THE GUARD: this document has rows below its shallowest tier, so "only the shallowest" ` +
        `is a restriction; saw [${describe(atOpening)}]`,
    ).toBe(true)

    await pressEntrance(page, FOLD_EVERY_ROW)
    expect((await drawnRows(page)).length, 'HF-12: nothing is drawn now').toBe(0)
    await pressEntrance(page, ADD_AT_SHALLOWEST)

    await page.keyboard.press('Escape')
    await page.waitForTimeout(600)
    await takeThePanelToTheTop(page)

    const after = await drawnRows(page)
    expect(after.length, 'the panel is drawing rows again').toBeGreaterThan(0)
    expect(
      after.filter((row) => row.depth !== shallowest),
      `HF-17 (MUST NOT): one tier was opened and no more, so nothing below the shallowest ` +
        `tier (${String(shallowest)}) is drawn; saw [${describe(after)}]`,
    ).toEqual([])
  } finally {
    await opened.close()
  }
})

// ⭐⭐ THE CONTROL for the case above: from the very same folded state, the
// entrance table T-051 row `HF-10` rules DOES open every tier. Without this the
// reading above would pass on a panel that simply could not draw a deep row.
//
// GOES RED IF: `HF-10` stops opening the tiers below the shallowest one.
test(`⭐ THE CONTROL: from the same folded state, ${UNFOLD_EVERY_ROW} opens every tier`, async () => {
  test.setTimeout(180_000)
  const opened = await openTheApp()
  const page = opened.page
  try {
    const atOpening = await drawnRows(page)
    const shallowest = Math.min(...atOpening.map((row) => row.depth))

    await pressEntrance(page, FOLD_EVERY_ROW)
    expect((await drawnRows(page)).length, 'HF-12: nothing is drawn now').toBe(0)

    await pressEntrance(page, UNFOLD_EVERY_ROW)
    const after = await drawnRows(page)
    expect(
      after.some((row) => row.depth > shallowest),
      `HF-10 opens every tier, so rows below the shallowest one (${String(shallowest)}) are ` +
        `drawn; saw [${describe(after)}]`,
    ).toBe(true)
  } finally {
    await opened.close()
  }
})

// ---------------------------------------------------------------------------
// D-319 -- IN-4: `Esc` in the watermark unlock field
// ---------------------------------------------------------------------------

// GOES RED IF: the first `Esc` in the unlock field takes the typing back but
// keeps hold of the field, so that the field goes on taking what is typed after
// the tier that owned it was consumed. Table T-028 row `IN-4` (MUST) has `Esc`
// consume ONE tier at a time and puts an edit made where it stands ahead of an
// open face, and (MUST) has the typing taken back leave the value as it was
// before the editing began; row `IN-5a` (MUST NOT) is what makes 「入力中」 a
// state with consequences of its own, so a field that keeps answering to it
// after its tier was consumed is a tier that was never really consumed.
// `FR-020` and table T-103 row `U-60` make the watermark unlock face one of
// `IN-4`'s faces. The order asserted is read out of `IN-4` itself.
//
// ⛔⛔ THE THIRD READING IS THE ONE THAT HOLDS `D-319` DOWN, AND THAT WAS
// MEASURED RATHER THAN REASONED. Built from the commit before the fix
// (`82b69d8`) and driven exactly as below, the face still closed on the second
// `Esc` -- so a case that read only the closing would have been green on the
// broken build. What told the two apart was what happened to a character typed
// AFTER that first `Esc`: it landed in the field on the broken build and landed
// nowhere on the fixed one.
test('IN-4: one Esc in the watermark unlock field takes the typing back AND lets the field go', async () => {
  test.setTimeout(180_000)
  expect(
    escOrderOf(IN_PLACE_EDIT_WORD, 'an edit made where it stands'),
    'table T-028 row IN-4 still puts an edit made where it stands ahead of an open face',
  ).toBeLessThan(escOrderOf(OPEN_FACE_WORD, 'an open face'))

  const opened = await openTheApp()
  const page = opened.page
  try {
    expect(
      await pressEntrance(page, WATERMARK_ENTRANCE),
      `the entrance ${WATERMARK_ENTRANCE} is on the screen`,
    ).toBe(true)
    expect(await unlockFaceIsUp(page), `FR-020: ${WATERMARK_ENTRANCE} put the face up`).toBe(true)

    const before = await unlockFieldValue(page)
    expect(before, `U-60 carries a field to type the answer into`).not.toBeNull()

    expect(await pressTheUnlockField(page), 'the field can be reached with a pointer').toBe(true)
    await page.keyboard.type('abc')
    await page.waitForTimeout(400)
    expect(await unlockFieldValue(page), 'the typing reached the field, so there is an edit').not.toBe(
      before,
    )

    await page.keyboard.press('Escape')
    await page.waitForTimeout(900)
    expect(
      await unlockFieldValue(page),
      'IN-4 (MUST): the first Esc took the typing back to the value before the editing began',
    ).toBe(before)
    expect(
      await unlockFaceIsUp(page),
      'IN-4: the first Esc consumed ONE tier -- the edit -- so the face is still up',
    ).toBe(true)

    await page.keyboard.type('z')
    await page.waitForTimeout(600)
    expect(
      await unlockFieldValue(page),
      'IN-4 / IN-5a: the edit tier was consumed, so the field is not taking the typing any ' +
        'more -- one Esc let it go, and it did not take a second one',
    ).toBe(before)
    expect(
      await unlockFaceIsUp(page),
      'nothing was pressed that could close the face, so it is still up',
    ).toBe(true)

    await page.keyboard.press('Escape')
    await page.waitForTimeout(900)
    expect(
      await unlockFaceIsUp(page),
      'IN-4: the next Esc consumed the next tier down, the face itself',
    ).toBe(false)
  } finally {
    await opened.close()
  }
})

// ⭐⭐ THE CONTROL for the case above: with nothing typed there is no edit to
// consume, and the FIRST `Esc` reaches the face. Without this, the reading
// above would pass on a face that simply took two `Esc`s to close under every
// condition.
//
// GOES RED IF: the face stops answering to `Esc` at all, or answers to it only
// after an edit has been made and taken back.
test('⭐ THE CONTROL: with nothing typed, the first Esc reaches the face itself', async () => {
  test.setTimeout(180_000)
  const opened = await openTheApp()
  const page = opened.page
  try {
    await pressEntrance(page, WATERMARK_ENTRANCE)
    expect(await unlockFaceIsUp(page), `FR-020: ${WATERMARK_ENTRANCE} put the face up`).toBe(true)

    await page.keyboard.press('Escape')
    await page.waitForTimeout(900)
    expect(
      await unlockFaceIsUp(page),
      'IN-4: with no edit standing, the first Esc consumed the face',
    ).toBe(false)
  } finally {
    await opened.close()
  }
})
