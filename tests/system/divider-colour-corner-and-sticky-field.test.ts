// Three rows of `docs/development-records/defects.md` that stood at
// 「試験待ち」 on 2026-09-06: the build landed and nothing automated holds it
// down.
//
//   DFC-277  the `Panel Divider`'s line colour. `PND-51` (2026-09-06) ruled that
//          no literal is laid down and `SvgRenderer` is asked instead, so what
//          is judged here is the colour table T-236 row `S-149` states.
//   DFC-314  the road from the manuscript's `S-132` (table T-217) into the tree.
//          The row asks that moving the manuscript move the drawn corner.
//   DFC-349  the comment box's body field, `PR-21` of table T-016, and the
//          control `FR-006` (MUST) gives it.
//
// ⛔ NO SENTENCE OF THE MANUSCRIPT IS QUOTED OR TRANSLATED HERE. Rule 03
// section 5 asks for the row ID instead, so every claim below cites the row
// that carries it.
//
// ⭐ EVERY NUMBER AND EVERY COLOUR ASSERTED IS READ OUT OF `docs/spec` AT READ
// TIME -- the corner radius, the saturation and lightness of the rule colour,
// the lines a multi-line field shows, and which rows of table T-016 belong to a
// comment box. Chapter 1.9 asks that of a case verifying a requirement that
// points at a table. Nothing below is a number read off the running
// application; the hue is the OPEN DOCUMENT's own value (`AT-19`), read from
// the document rather than written here.
//
// ⛔ NO `swsCase` IS DECLARED, for the reason
// `tests/system/user-reported-fixes.test.ts` gives: table T-219 row `TW-2` has
// Chapter 9's cases generated from those declarations and hung from an
// `SWS-xxx` node, and none of Chapter 6.1's nodes is about a divider colour, a
// corner radius or a comment box's field. The rows each case leans on are named
// in prose, at the case.
//
// ⛔ WHAT WAS READ OF `src/`: the GENERATED block that holds
// `NOT_STORED_ANNOTATION_SIZES`, which `tools/generate_entity_types.py` writes
// out of `_source/settings.json`, and nothing else. DFC-314 is about whether that
// road exists at all, so the constant IS the thing under judgement and not a
// source of expectations; its expected value comes from table T-217. ⚠️ Read as
// text rather than imported, the way
// `.claude/skills/spec-graph-check/check-generated-constants.py` reads it: the
// unit's module graph reaches a `.json` the test runner will not load, and
// nothing about this judgement needs the unit to run. Every DOM handle
// used here (`[data-role]`, `[data-icon]`, `[data-depth]`, `[data-field-row]`,
// `[data-field-kind]`) is one the neighbouring System files already lean on,
// and the specification settles none of them -- see `tests/system/live-app.ts`.
//
// ⛔ WHAT IS PRESSED IS THE DEV SERVER, as
// `tests/system/rows-fixed-with-nothing-holding-them.test.ts` presses it, and
// not `dist/index.html`: this checkout carries no build, and a file that throws
// in `beforeAll` holds nothing down.
//
// ⚠️⚠️ ONE CASE THIS FILE DELIBERATELY DOES NOT CARRY. DFC-277 asks that the
// screen, the exported picture and the grid lines read ONE colour. Measured
// 2026-09-07 on the dev server, through `AM-13` of table T-107: the screen
// resolves `S-149` at the open document's own hue and paints
// `rgb(217, 221, 226)`, while the exported picture paints its two divider rects
// `hsl(0 14% 87%)` -- the hue half of `S-149` is stood in for by a zero at
// `src/adapter/image-exporter/image-exporter.ts:455`, whose own note says a
// third outgoing edge in `_source/components.json` would be needed to reach
// `AT-19`. `S-149` is marked 色相追随 in table T-236 and `FR-080` (MUST) has the
// picture be the screen shrunk (table T-041, `WY-2`), so the two ARE required
// to agree. ⛔ The case that would judge that is therefore red today, and it is
// left OUT rather than written weaker: rule 04 section 1 forbids moving the
// expectation to meet the code, and rule 04's own instruction is to report the
// discrepancy instead. The screen half is judged below.
//
// ⭐ EACH CASE SAYS WHAT WOULD MAKE IT GO RED, in the sentence above its body.

import { expect, test, type Browser, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { specTable, type SpecTable } from '../contract/spec-table'
import { CLEARING_UP_MS, launchReferenceBrowser, readSettledDrawnSvg, screenOf } from './live-app'
import { rowOf } from './sws-case'

// ---------------------------------------------------------------------------
// What the specification says, read at read time
// ---------------------------------------------------------------------------

const T016: SpecTable = specTable('T-016')
const T023B: SpecTable = specTable('T-023b')
const T025: SpecTable = specTable('T-025')
const T109: SpecTable = specTable('T-109')
const T206: SpecTable = specTable('T-206')
const T217: SpecTable = specTable('T-217')
const T236: SpecTable = specTable('T-236')

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
 * `S-132` (`cornerRadiusPx`) of table T-217: the corner radius a `HighlightBox`
 * is given, which `FR-019` (MUST) holds steady across zoom.
 */
const CORNER_RADIUS_PX = numberIn(
  cellOf(T217, 'S-132', T217_DEFAULT, T217_COLUMNS),
  'table T-217 row S-132',
)

// Table T-206 holds three cells after the row ID -- what the value is, the
// default, and the note.
const T206_COLUMNS = 3
const T206_DEFAULT = 1

/** The default a row of table T-206 states. @purity pure */
function settingOf(id: string): number {
  return numberIn(cellOf(T206, id, T206_DEFAULT, T206_COLUMNS), `table T-206 row ${id}`)
}

/** `S-208` -- the travel that parts a press from a drag when a shape is placed. */
const PRESS_OR_DRAG_PX = settingOf('S-208')

/** `S-193` -- how many lines a multi-line field of `FR-006` shows. */
const MULTILINE_ROWS = settingOf('S-193')

// Table T-236 holds five cells after the row ID -- what the colour is, the
// light theme, the dark theme, whether it follows the hue, and the note.
const T236_COLUMNS = 5
const T236_LIGHT = 1
const T236_DARK = 2
const T236_FOLLOWS_HUE = 3

/** U+25CB -- the mark table T-236 puts in its 色相追随 column. */
const FOLLOWS_THE_HUE = String.fromCharCode(0x25cb)

/**
 * The saturation and the lightness `S-149` states for one theme, with its hue
 * left to the document.
 *
 * ⭐ The row writes its hue as a letter and its other two parts as percentages,
 * so the two percentages are what is taken; the hue comes from `AT-19` of the
 * open document. ⛔ Nothing here decides the numbers -- a manuscript that moves
 * 87% moves this file with it.
 *
 * @purity pure
 */
function ruleColourParts(dark: boolean): { saturation: number; lightness: number } {
  const said = cellOf(T236, 'S-149', dark ? T236_DARK : T236_LIGHT, T236_COLUMNS)
  const found = /(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%/.exec(said)
  if (found === null) {
    throw new Error(
      `table T-236 row S-149 states no saturation and lightness this file can read: ` +
        JSON.stringify(said),
    )
  }
  return { saturation: Number(found[1]), lightness: Number(found[2]) }
}

/**
 * Whether `S-149` still says its colour follows the document's hue.
 *
 * ⭐ A guard and not an assertion of its own: the case below resolves the
 * colour AT THE DOCUMENT'S HUE, and that is only the right expectation while
 * the row carries this mark.
 */
const RULE_COLOUR_FOLLOWS_THE_HUE = cellOf(
  T236,
  'S-149',
  T236_FOLLOWS_HUE,
  T236_COLUMNS,
).includes(FOLLOWS_THE_HUE)

// Table T-016 holds five cells after the row ID -- the column, the input form,
// what it belongs to, the note, and the MSPDI counterpart.
const T016_COLUMNS = 5
const T016_FORM = 1
const T016_SUBJECT = 2

/** U+8907 U+6570 U+884C -- the input form table T-016 writes for a multi-line field. */
const MULTILINE_FORM = String.fromCharCode(0x8907, 0x6570, 0x884c)

/**
 * The rows of table T-016 whose 対象 is one entity.
 *
 * ⛔ NOT WRITTEN OUT. `FR-006` (MUST) has the panel show the rows whose 対象
 * matches what is selected and (MUST NOT) show any other, and it (MUST NOT)
 * enumerate them in prose for the reason its own text gives -- so the roster is
 * taken from the table. A row added for a comment box adds itself to this case.
 *
 * @purity pure
 */
function rowsBelongingTo(entity: string): readonly string[] {
  const found = T016.rows.filter((row) => {
    if (row.cells.length !== T016_COLUMNS) {
      throw new Error(
        `table T-016 row ${row.id} has ${row.cells.length} cells after the row ID, not the ` +
          `${T016_COLUMNS} this file reads by position`,
      )
    }
    return (row.cells[T016_SUBJECT] ?? '').includes(entity)
  })
  if (found.length === 0) {
    throw new Error(`table T-016 has no row whose subject is ${entity}`)
  }
  return found.map((row) => row.id)
}

/** `CommentBox` -- spelled as `_assets/tbl-glossary.md` spells it. */
const COMMENT_BOX_ENTITY = 'CommentBox'

/** The rows of table T-016 a comment box owns. Today that is `PR-21` alone. */
const COMMENT_BOX_ROWS = rowsBelongingTo(COMMENT_BOX_ENTITY)

/** Whether one row of table T-016 asks for a multi-line control. @purity pure */
function isMultiline(id: string): boolean {
  return cellOf(T016, id, T016_FORM, T016_COLUMNS).includes(MULTILINE_FORM)
}

// The two Japanese words that name the holdings of table T-023b this file arms.
// ⚠️ Built from their code points rather than written out: rule 03 section 5
// keeps this tree ASCII, and `tests/system/three-rows-read-from-the-spec-alone
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
 * the purpose of two entrances. ⭐ The last column of table T-109 names the
 * `AR-nn` an entrance arms, so the holding is looked up in table T-023b first
 * and the entrance by that row ID.
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

/** The entrance arming the highlight box of table T-023b. */
const HIGHLIGHT_BOX_ENTRANCE = entranceArming(HIGHLIGHT_BOX_WORD)
/** The entrance arming the comment box of table T-023b. */
const COMMENT_BOX_ENTRANCE = entranceArming(COMMENT_BOX_WORD)

/** `IC-20` -- `FR-065` keeps the `Agent API` shut until a person opens it. */
const AGENT_API_ENTRANCE = 'IC-20'
/** `IC-17` -- the entrance `FR-072` gives the document's own drawing settings. */
const SETTINGS_ENTRANCE = 'IC-17'

/** `AM-3` of table T-107 -- the frozen copy of the whole document. */
const AM_3 = 'readDocument'

/**
 * The number the tree was generated with for one row, read out of the generated
 * block that names it.
 *
 * ⛔ ONLY THE GENERATED BLOCK IS READ, between the two markers
 * `tools/generate_entity_types.py` writes and
 * `.claude/skills/spec-graph-check/check-generated-constants.py` counts. Nothing
 * a person wrote is read, so this cannot pick up an expectation from the
 * implementation.
 *
 * @purity semi-pure-a
 */
function generatedNumber(file: string, constant: string, rowId: string): number {
  const said = readFileSync(join(process.cwd(), file), 'utf8')
  const blocks = [...said.matchAll(/\/\/ <generated[^\n]*\n([\s\S]*?)\/\/ <\/generated>/g)].map(
    (one) => one[1] ?? '',
  )
  const holding = blocks.filter((block) => block.includes(`export const ${constant}`))
  if (holding.length !== 1) {
    throw new Error(
      `${file} has ${holding.length} generated blocks declaring ${constant}, and this file ` +
        'needs exactly one -- the road DFC-314 is about is not there',
    )
  }
  const found = new RegExp(`'${rowId}':\\s*(-?\\d+(?:\\.\\d+)?)`).exec(holding[0] ?? '')
  if (found === null) {
    throw new Error(`${constant} carries no entry for ${rowId}`)
  }
  return Number(found[1])
}

/** Where the road from table T-217 lands. `AT-122` is a column of `HighlightBox`. */
const ANNOTATION_DEFAULTS_FILE = join('src', 'use-case', 'edit-document', 'edit-annotation.ts')

// ---------------------------------------------------------------------------
// Driving the running application
// ---------------------------------------------------------------------------

const CANVAS = '[data-role="Schedule Canvas"] svg'
const CANVAS_PART = '[data-role="Schedule Canvas"]'
const ROW_PANEL = '[data-role="Row Title Panel"]'
const PROPERTIES = '[data-role="Properties Panel"]'
const DIVIDER = '[data-role="Panel Divider"]'

let browser: Browser | null = null

test.beforeAll(async () => {
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
 * The application, up and settled, on the screen of the base environment.
 *
 * ⚠️ Not a fixed pause after the load. The shell may legitimately draw twice on
 * the way up, so what is waited for is two identical readings of the drawing.
 *
 * @purity non-pure
 */
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

/**
 * Press one entrance of table T-109 wherever it stands.
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

/** Arm a holding and say so loudly when the entrance is not reachable. @purity non-pure */
async function arm(page: Page, entrance: string): Promise<void> {
  expect(await pressEntrance(page, entrance), `the entrance ${entrance} is on the screen`).toBe(true)
  expect(await armingOf(page, entrance), `${entrance} stands armed`).toBe('true')
}

/** The shape the canvas shows at a point -- `IN-2` of table T-028. @purity non-pure */
async function cursorAt(page: Page, x: number, y: number): Promise<string> {
  await page.mouse.move(x, y)
  return page.evaluate((part: string) => {
    const surface = document.querySelector(part)
    return surface instanceof HTMLElement ? surface.style.cursor : ''
  }, CANVAS_PART)
}

/** How far the drag below runs along a row. */
const REACH_PX = 160

/**
 * Empty ground that one of the DRAWN ROWS covers, with room along the row.
 *
 * ⛔ Ground BELOW the last row is no good for placing: `FR-019` (MUST) holds an
 * annotation's position by a date and a row identifier, and ground no row
 * covers points at no row. ⭐ Emptiness is the PRODUCT's own answer: `PTD-5` of
 * table T-023a gives ground that hit nothing the plain arrow.
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

/** Open the `Agent API` and fail by name when the entrance does not publish it. @purity non-pure */
async function openTheAgentApi(page: Page): Promise<void> {
  expect(
    await pressEntrance(page, AGENT_API_ENTRANCE),
    `the entrance ${AGENT_API_ENTRANCE} that FR-065 has open the Agent API is on the screen`,
  ).toBe(true)
  expect(
    await page.evaluate(
      () => typeof (window as unknown as Record<string, unknown>).grSchedulerAgentApi,
    ),
    `pressing ${AGENT_API_ENTRANCE} published the Agent API`,
  ).toBe('object')
}

// ---------------------------------------------------------------------------
// DFC-314 -- the road from the manuscript's S-132 into the tree
// ---------------------------------------------------------------------------

// GOES RED IF: the corner radius the tree carries stops being the one table
// T-217 row `S-132` states -- which is what DFC-314 was. The row's own reading on
// 2026-09-05 was that `S-132` reached `src/` through no road at all and the
// number was a copy cut off from the manuscript, so this case judges the ROAD:
// the constant `tools/generate_entity_types.py` writes out of
// `_source/settings.json` against the table that manuscript prints.
//
// ⛔ NO BROWSER. What is judged is a value, and a value is judged where it is;
// the other half of the road -- that this number becomes the drawn `rx` -- is
// the case below.
test(`S-132: the tree carries the corner radius table T-217 states (${CORNER_RADIUS_PX})`, () => {
  expect(
    generatedNumber(ANNOTATION_DEFAULTS_FILE, 'NOT_STORED_ANNOTATION_SIZES', 'S-132'),
    'S-132 (table T-217): the generated constant holds what the manuscript states. A ' +
      'difference here means `npm run gen` has not been run since the manuscript moved, or ' +
      'that the number was typed into the tree again',
  ).toBe(CORNER_RADIUS_PX)
})

// GOES RED IF: a highlight box is drawn with any corner radius other than the
// one table T-217 row `S-132` states. `FR-019` (MUST) sends that radius to
// table T-217 and has it drawn the same at every zoom.
//
// ⭐ THIS IS THE SECOND HALF OF DFC-314's ROAD, and it is pressed on the DEV
// SERVER. `tests/system/three-rows-read-from-the-spec-alone.test.ts` judges the
// same requirement on `dist/index.html`, which a checkout without a build does
// not have -- and a case that cannot run holds nothing down (rule 04 section
// 3.8).
//
// ⚠️ WHAT IS COMPARED IS THE RESOLVED GEOMETRY, not the attribute text.
test(`S-132: a placed highlight box is drawn with a corner radius of ${CORNER_RADIUS_PX}`, async ({
  baseURL,
}) => {
  test.setTimeout(180_000)
  const opened = await openTheApp(baseURL)
  const page = opened.page
  try {
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
// DFC-277 -- the colour the Panel Divider's line is drawn with
// ---------------------------------------------------------------------------

/** What one element of the screen is painted with. */
interface Painted {
  readonly background: string
  readonly html: string
}

/**
 * The line inside one `Panel Divider`'s grab band.
 *
 * ⛔ FOUND BY GEOMETRY, NOT BY A NAME OF THE TREE. The specification settles
 * the part's name (`Panel Divider`, `_assets/tbl-glossary.md`) and the shell
 * marks the band with it, but the line the band straddles carries no mark of
 * its own -- so it is looked for where `S-134` says the band sits: inside the
 * band, the same height as it, and painted with something.
 *
 * @purity semi-pure-b
 */
async function dividerLines(page: Page): Promise<Painted[]> {
  return page.evaluate((divider: string) => {
    const out: { background: string; html: string }[] = []
    for (const band of Array.from(document.querySelectorAll(divider))) {
      const over = band.getBoundingClientRect()
      for (const one of Array.from(document.querySelectorAll('*'))) {
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
        out.push({ background, html: one.outerHTML.slice(0, 300) })
      }
    }
    return out
  }, DIVIDER)
}

// GOES RED IF: the screen paints a `Panel Divider`'s line with anything but the
// colour table T-236 row `S-149` states, resolved at the hue the OPEN DOCUMENT
// carries (`AT-19`). That row is marked 色相追随, which is guarded below, and
// DFC-277 was three different colours standing where that one row should be --
// `PND-51` (2026-09-06) ruled that no literal is laid down and the colour is
// asked for instead.
//
// ⚠️ THE HUE IS THE DOCUMENT'S AND NOT A NUMBER WRITTEN HERE, and the
// saturation and lightness are the manuscript's: moving 87% in
// `_source/settings.json` moves this case with it.
//
// ⚠️ THE EXPECTATION IS RESOLVED BY THE BROWSER ITSELF -- an element is given
// the colour the manuscript states and asked what that computes to -- so no
// rounding rule of this file can disagree with the one the page used.
test('S-149: the screen paints the Panel Divider line with the colour table T-236 states', async ({
  baseURL,
}) => {
  test.setTimeout(180_000)
  expect(
    RULE_COLOUR_FOLLOWS_THE_HUE,
    'table T-236 row S-149 still says its colour follows the document hue, which is what makes ' +
      "the document's own AT-19 the right hue to resolve it at",
  ).toBe(true)

  const opened = await openTheApp(baseURL)
  const page = opened.page
  try {
    await openTheAgentApi(page)
    const document_ = await page.evaluate((member: string) => {
      const api = (window as unknown as Record<string, Record<string, unknown> | undefined>)
        .grSchedulerAgentApi
      const read = api?.[member]
      if (typeof read !== 'function') return null
      const doc = (read as () => unknown).call(api) as {
        schedule?: { project?: { themeHue?: unknown } }
        documentSettings?: { themePreference?: unknown }
      }
      return {
        hue: doc.schedule?.project?.themeHue,
        preference: doc.documentSettings?.themePreference,
      }
    }, AM_3)

    expect(
      typeof document_?.hue,
      'AM-3 handed back the hue DR-5 of table T-052 (MUST) puts on the schedule group\'s ' +
        `project; it handed ${JSON.stringify(document_)}`,
    ).toBe('number')
    const dark = document_?.preference === 'dark'
    const parts = ruleColourParts(dark)
    const said = `hsl(${String(document_?.hue)} ${String(parts.saturation)}% ${String(parts.lightness)}%)`

    const wanted = await page.evaluate((colour: string) => {
      const probe = window.document.createElement('div')
      window.document.body.appendChild(probe)
      probe.style.color = colour
      const resolved = window.getComputedStyle(probe).color
      probe.remove()
      return resolved
    }, said)

    const lines = await dividerLines(page)
    expect(
      lines.length,
      'every Panel Divider band of table T-076 has a line painted inside it; the bands are ' +
        `sized by S-134 and this case found ${lines.length} painted lines`,
    ).toBeGreaterThan(0)
    expect(
      lines.map((one) => one.background),
      `S-149 (table T-236): every Panel Divider line is painted ${said} (${wanted}) -- the ` +
        `document's own hue with the manuscript's saturation and lightness. What was painted ` +
        `was:\n  ${lines.map((one) => `${one.background} ${one.html}`).join('\n  ')}`,
    ).toEqual(lines.map(() => wanted))
  } finally {
    await opened.close()
  }
})

// ---------------------------------------------------------------------------
// DFC-349 -- the comment box's body field, and the control FR-006 gives it
// ---------------------------------------------------------------------------

/** One field the Properties Panel is drawing, and the controls inside it. */
interface Field {
  readonly row: string
  readonly editable: string | null
  readonly controls: readonly {
    readonly tag: string
    readonly multiline: boolean
    readonly linesShown: number | null
  }[]
}

/**
 * The fields the Properties Panel is drawing right now.
 *
 * ⭐ A CONTROL IS `[data-field-kind]` INSIDE `[data-field-row]`, which is the
 * marking the neighbouring System files already lean on. DFC-349 was a field that
 * stood with none.
 *
 * ⭐ MULTI-LINE IS ASKED OF THE ELEMENT AND NOT OF ITS SPELLING: what table
 * T-016 asks for is a form, and the form the host has for more than one line is
 * a text area or an editable box. Nothing here reads the tree's own word for
 * the kind.
 *
 * @purity semi-pure-b
 */
async function panelFields(page: Page): Promise<Field[]> {
  return page.evaluate((panel: string) => {
    const shown = document.querySelector(panel)
    if (shown === null) return []
    const out: Field[] = []
    for (const field of Array.from(shown.querySelectorAll('[data-field-row]'))) {
      if (field.hasAttribute('data-field-kind')) continue
      out.push({
        row: field.getAttribute('data-field-row') ?? '',
        editable: field.getAttribute('data-editable'),
        controls: Array.from(field.querySelectorAll('[data-field-kind]')).map((control) => {
          const lines = control.getAttribute('rows')
          return {
            tag: control.tagName,
            multiline:
              control.tagName === 'TEXTAREA' || (control as HTMLElement).isContentEditable,
            linesShown: lines === null ? null : Number(lines),
          }
        }),
      })
    }
    return out
  }, PROPERTIES) as Promise<Field[]>
}

// GOES RED IF: the comment box's body field stands in the Properties Panel with
// no control, which is what DFC-349 was, or with a control of the wrong form.
// `FR-006` (MUST) has the panel show the rows of table T-016 whose 対象 matches
// what is selected, (MUST NOT) show any other, and (MUST) give each the form
// its 入力の型 column names; `S-193` of table T-206 fixes how many lines a
// multi-line one shows, and its own note (MUST) keeps that number to the rows
// table T-016 marks 複数行.
//
// ⭐ THE PANEL IS BROUGHT TO THE SELECTION BY `FR-072`'s OWN TOGGLE -- `IC-17`
// shows the document's drawing settings and (MUST) a second press goes back to
// what was last selected. ⚠️ NOT by a double click on the box: `MK-13` (MUST)
// makes that the route to this very field, and measured 2026-09-07 it leaves
// the Properties Panel at `display: none`. That is a second, separate failing
// of the same table and it has no ledger row yet; this case is about whether
// the FIELD carries a control, so it takes a route that works rather than
// going red over another row's business.
test(`PR-21 / FR-006: the comment box's field carries the control table T-016 names`, async ({
  baseURL,
}) => {
  test.setTimeout(180_000)
  const opened = await openTheApp(baseURL)
  const page = opened.page
  try {
    const spot = await groundOnADrawnRow(page)
    expect(spot, 'a drawn row covers empty ground').not.toBeNull()
    const at = spot as { x: number; y: number }

    await arm(page, COMMENT_BOX_ENTRANCE)
    await page.mouse.move(at.x, at.y)
    await page.mouse.down()
    await page.mouse.up()
    await page.waitForTimeout(900)

    // ⛔ THE ARMING STAYS UP (table T-023b's closing rule), so it is put down
    // before the box is picked -- a press with it still armed places a second
    // box instead of selecting the first.
    await page.keyboard.press('Escape')
    await page.waitForTimeout(400)
    await page.mouse.move(at.x, at.y)
    await page.mouse.down()
    await page.mouse.up()
    await page.waitForTimeout(700)

    expect(
      await pressEntrance(page, SETTINGS_ENTRANCE),
      `the entrance ${SETTINGS_ENTRANCE} is on the screen`,
    ).toBe(true)
    expect(
      await pressEntrance(page, SETTINGS_ENTRANCE),
      `FR-072: a second press on ${SETTINGS_ENTRANCE} goes back to the last selection`,
    ).toBe(true)
    await page.waitForTimeout(700)

    const fields = await panelFields(page)
    const shown = fields.map((one) => one.row)
    expect(
      shown,
      `FR-006: the panel shows the rows of table T-016 whose subject is ${COMMENT_BOX_ENTITY} ` +
        'and no other; what it showed was ' +
        JSON.stringify(fields),
    ).toEqual([...COMMENT_BOX_ROWS])

    for (const row of COMMENT_BOX_ROWS) {
      const field = fields.find((one) => one.row === row)
      expect(field, `the panel drew a field for table T-016 row ${row}`).toBeDefined()
      const drawn = field as Field
      expect(
        drawn.controls.length,
        `FR-006 / DFC-349: table T-016 row ${row} marks no read-only, so its field carries a ` +
          `control; what it carried was ${JSON.stringify(drawn)}`,
      ).toBeGreaterThan(0)

      if (!isMultiline(row)) continue
      expect(
        drawn.controls.map((one) => one.multiline),
        `FR-006: table T-016 marks row ${row} as a multi-line field, so its control takes more ` +
          `than one line; what it carried was ${JSON.stringify(drawn.controls)}`,
      ).toEqual(drawn.controls.map(() => true))
      expect(
        drawn.controls.map((one) => one.linesShown),
        `S-193 (table T-206): a multi-line field of FR-006 shows ${MULTILINE_ROWS} lines; row ` +
          `${row} showed ${JSON.stringify(drawn.controls.map((one) => one.linesShown))}`,
      ).toEqual(drawn.controls.map(() => MULTILINE_ROWS))
    }
  } finally {
    await opened.close()
  }
})
