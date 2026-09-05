// One System sweep for the four clauses CR-354 put into the manuscript, none of
// which had a case before this file:
//
//   FR-019   what "below" means when a highlight box is normalised on release,
//            and what the DRAWING side must enclose instead
//   IV-19    table T-220 -- the same two orderings, as an invariant
//   HM-9     table T-015a -- where a Task's rank among its WBS siblings comes
//            from
//   HM-3     table T-015a -- moving a bar to another row, and what that does
//            and does not touch
//
// ⛔⛔ THE CLAUSES ARE NEWER THAN THE WORKING TREE. CR-354 is not committed, so
// `docs/spec` here still carries the pre-CR text of FR-019 and of rows `HM-3`
// and `HM-9`. This file therefore reads those rows only to prove they exist and
// to take `ST-2`'s three sort keys out of table T-014; the two orderings the CR
// settles are named by row ID in the messages, never transcribed. Rule 03
// section 5 forbids copying the manuscript's Japanese into code, and rule 04
// section 1 forbids reading `src/` to write a case -- nothing under `src/` was
// opened for this file.
//
// ⭐ WHY ONE CASE. Rule 04 section 3.5 asks for one launch that judges
// everything, and this project has measured that a failing Playwright case
// followed by another case leaves the run hanging. Every judgement below is
// therefore a soft expectation inside a single case: they all run, and every
// one that fails is reported together at the end.
//
// ⭐ WHAT MAKES THE PINNED SCENARIO THE WHOLE POINT. `FR-098` (MUST) lifts a
// pinned row out of the scrolling area and draws it at the top of `Row Area`,
// so a row that is LAST among the drawn rows in the row tree becomes the FIRST
// one on the screen. That is the only fixture in which "the row above" and "the
// row earlier in the tree" disagree, and it is exactly the disagreement CR-354
// settles -- in opposite directions for the stored value and for the drawing.
//
// ⛔ WHAT WAS READ OF `src/`: nothing. Every handle used here
// (`[data-role]`, `[data-icon]`, `[data-depth]`, `[data-group-id]`,
// `[data-pinned]`) is one the neighbouring System files already lean on, and
// the specification settles none of them -- `tests/system/live-app.ts` says so
// of `DRAWN_SVG`. The published identifier `grSchedulerAgentApi` IS settled:
// `_assets/tbl-glossary.md` names it above table T-107, and `AM-3` names the
// member this file reads the document through.
//
// ⛔ NO `swsCase` IS DECLARED HERE, for the reason the neighbouring System
// files give: table T-219 row `TW-2` has Chapter 9's cases generated from those
// declarations and hung from an `SWS-xxx` node, and none of Chapter 6.1's nodes
// is about these four rows.

import { expect, test, type Browser, type Page } from '@playwright/test'
import { specTable, type SpecTable } from '../contract/spec-table'
import { CLEARING_UP_MS, launchReferenceBrowser, readSettledDrawnSvg, screenOf } from './live-app'
import { lastCellOf, rowOf } from './sws-case'

// ---------------------------------------------------------------------------
// What the specification says, read at read time
// ---------------------------------------------------------------------------

const T014: SpecTable = specTable('T-014')
const T015A: SpecTable = specTable('T-015a')
const T023B: SpecTable = specTable('T-023b')
const T025: SpecTable = specTable('T-025')
const T109: SpecTable = specTable('T-109')
const T206: SpecTable = specTable('T-206')
const T220: SpecTable = specTable('T-220')

/** The screen of the base environment: table T-025, row `MC-6`. */
const BASE_SCREEN = screenOf(rowOf(T025, 'MC-6'))

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
 * `S-208` -- the travel that separates a press from a drag when a shape or an
 * annotation is placed. `FR-019` (MUST) makes a highlight box need a drag.
 */
const PRESS_OR_DRAG_PX = numberIn(
  rowOf(T206, 'S-208').cells[1] ?? '',
  'table T-206 row S-208',
)

/**
 * The three sort keys `ST-2` of table T-014 settles, in the order it writes
 * them, taken from the row rather than spelled here.
 *
 * ⭐ Chapter 1.9 asks a case that verifies a requirement pointing at a table to
 * be driven by fixed data copied from that table. `ST-2` is the tie-break
 * CR-354 sends `HM-9` to when two WBS siblings share one row, so the keys and
 * their directions are read, not written down.
 *
 * @purity pure
 */
function sortKeysOfSt2(): ReadonlyArray<{ readonly key: string; readonly ascending: boolean }> {
  const cell = lastCellOf(rowOf(T014, 'ST-2'))
  // ⚠️ Matching the manuscript's own words. Rule 03 section 5 admits handling
  // Japanese as the exception, and `tests/contract/spec-table.ts` takes the
  // same exception for the row-ID heading. Given as code points so that the
  // characters stay out of the source, as `rows-fixed-with-nothing-holding-them`
  // does. U+6607 U+9806 -- ascending; U+964D U+9806 -- descending.
  const ASCENDING = String.fromCharCode(0x6607, 0x9806)
  const DESCENDING = String.fromCharCode(0x964d, 0x9806)
  const found: Array<{ key: string; ascending: boolean }> = []
  const pattern = /`([A-Za-z]+)`\s*(.)(.)/g
  let hit = pattern.exec(cell)
  while (hit !== null) {
    const key = hit[1] ?? ''
    const word = `${hit[2] ?? ''}${hit[3] ?? ''}`
    if (word === ASCENDING) found.push({ key, ascending: true })
    else if (word === DESCENDING) found.push({ key, ascending: false })
    hit = pattern.exec(cell)
  }
  if (found.length !== 3) {
    throw new Error(
      `table T-014 row ST-2 states ${found.length} ordered keys this file can read, and it needs 3`,
    )
  }
  return found
}

const ST2_KEYS = sortKeysOfSt2()

/**
 * The one entrance of table T-109 that arms a holding of table T-023b.
 *
 * ⭐ Resolved through the tables rather than spelled, the way
 * `tests/system/rows-fixed-with-nothing-holding-them.test.ts` resolves it: the
 * last column of table T-109 names the `AR-n` an entrance arms.
 *
 * @purity pure
 */
function entranceArming(holding: string): string {
  const wanted = new RegExp(`${holding}(?![0-9])`)
  const found = T109.rows.filter((row) => wanted.test(lastCellOf(row)))
  if (found.length !== 1) {
    throw new Error(`table T-109 has ${found.length} entrances arming ${holding}, and it needs one`)
  }
  return found[0]?.id ?? ''
}

/** `IC-36` -- the entrance that arms table T-023b's `AR-6`, the highlight box. */
const HIGHLIGHT_BOX_ENTRANCE = entranceArming(rowOf(T023B, 'AR-6').id)

/**
 * The one entrance of table T-109 whose 正 column names this requirement and
 * whose place is the row title panel or the app header.
 *
 * ⭐ Found by the requirement it serves, so that no `IC-nn` is spelled here.
 *
 * @purity pure
 */
function entranceServing(requirement: string, place: string): string {
  const wanted = new RegExp(`${requirement}(?![0-9])`)
  const found = T109.rows.filter(
    (row) => wanted.test(row.cells[3] ?? '') && (row.cells[0] ?? '').includes(place),
  )
  if (found.length !== 1) {
    throw new Error(
      `table T-109 has ${found.length} entrances of ${place} serving ${requirement}, and it needs one`,
    )
  }
  return found[0]?.id ?? ''
}

/** `IC-60` -- the `Row Pin` of `FR-098`, one per row of the row title panel. */
const ROW_PIN_ENTRANCE = entranceServing('FR-098', 'Row Title Panel')
/** `IC-20` -- the header entrance `FR-065` gives for opening the `Agent API`. */
const AGENT_API_ENTRANCE = entranceServing('FR-065', 'App Header')

// ⭐ The rows this file is about have to exist before it can name them.
const HM_3 = rowOf(T015A, 'HM-3').id
const HM_8 = rowOf(T015A, 'HM-8').id
const HM_9 = rowOf(T015A, 'HM-9').id
const IV_19 = rowOf(T220, 'IV-19').id

// ---------------------------------------------------------------------------
// The document, as `AM-3` of table T-107 hands it over
// ---------------------------------------------------------------------------

interface DocGroup {
  readonly id: string
  readonly parentId: string | null
  readonly order: number
  readonly label: string | null
  readonly derivedFromTaskUid: number | null
}

interface DocTask {
  readonly uid: number
  readonly wbsParentUid: number | null
  readonly wbsOrder: number | null
  readonly start: string | null
  readonly finish: string | null
}

interface DocBox {
  readonly id: string
  readonly startDate: string | null
  readonly endDate: string | null
  readonly topGroupId: string | null
  readonly bottomGroupId: string | null
}

interface DocShot {
  readonly groups: readonly DocGroup[]
  readonly tasks: readonly DocTask[]
  readonly boxes: readonly DocBox[]
  readonly members: ReadonlyArray<{ readonly taskUid: number; readonly groupId: string }>
}

/** One row of the row title panel, as the page drew it. */
interface DrawnRow {
  readonly id: string
  readonly depth: number
  readonly pinned: boolean
  readonly label: string
  readonly y: number
  readonly height: number
}

/**
 * Every row's place in the ROW TREE: a depth-first walk of `TaskGroup.parentId`
 * taking siblings in `order` (`AT-52` and `AT-55` of table T-058).
 *
 * ⭐ This is the ordering CR-354 makes `FR-019` and `HM-9` judge by, and it is
 * built from the document alone -- no screen coordinate goes into it.
 *
 * @purity pure
 */
function rankInRowTree(groups: readonly DocGroup[]): ReadonlyMap<string, number> {
  const children = new Map<string | null, DocGroup[]>()
  for (const group of groups) {
    const kin = children.get(group.parentId) ?? []
    kin.push(group)
    children.set(group.parentId, kin)
  }
  for (const kin of children.values()) kin.sort((a, b) => a.order - b.order)
  const rank = new Map<string, number>()
  const walk = (parent: string | null): void => {
    for (const group of children.get(parent) ?? []) {
      rank.set(group.id, rank.size)
      walk(group.id)
    }
  }
  walk(null)
  return rank
}

/** A short, quotable name for one row. @purity pure */
function nameOf(groups: readonly DocGroup[], id: string | null): string {
  const group = groups.find((one) => one.id === id)
  return `${group?.label ?? '(no label)'} <${String(id).slice(0, 8)}>`
}

// ---------------------------------------------------------------------------
// Driving the running application
// ---------------------------------------------------------------------------

let browser: Browser | null = null

test.beforeAll(async () => {
  browser = await launchReferenceBrowser()
})

test.afterAll(async () => {
  // ⛔ The hook's own allowance, not an assertion's; `CLEARING_UP_MS` of
  // `./live-app` carries the measurements and the reason.
  test.setTimeout(CLEARING_UP_MS)
  await browser?.close()
})

const CANVAS_PART = '[data-role="Schedule Canvas"]'
const CANVAS_SVG = '[data-role="Schedule Canvas"] svg'
const ROW_PANEL = '[data-role="Row Title Panel"]'

interface Opened {
  readonly page: Page
  close(): Promise<void>
}

/** The application, up and settled, on the screen of the base environment. @purity non-pure */
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
 * Press with a real pointer.
 *
 * ⛔ A REAL POINTER, not `element.click()`: the shell reads the pointer, and a
 * synthetic click has reached nothing in this project before.
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
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
  }, icon)
  if (at === null) return false
  await pressAt(page, at)
  await page.waitForTimeout(500)
  return true
}

/**
 * Press an entrance drawn inside one row of the panel.
 *
 * ⚠️ The pointer is put on the row's NAME first. Table T-051 row `HF-6` keeps a
 * row's own controls hidden until the pointer is on that row, and measured
 * 2026-09-05 the control has a zero-sized box until then.
 *
 * @purity non-pure
 */
async function pressEntranceInRow(page: Page, index: number, icon: string): Promise<boolean> {
  const hover = await page.evaluate((wanted: number) => {
    const row = Array.from(document.querySelectorAll('[data-depth]'))[wanted]
    const name = row?.querySelector('span')
    if (name === null || name === undefined) return null
    const box = name.getBoundingClientRect()
    return { x: box.x + 4, y: box.y + box.height / 2 }
  }, index)
  if (hover === null) return false
  await page.mouse.move(hover.x, hover.y)
  await page.waitForTimeout(400)
  const at = await page.evaluate(
    (asked: { index: number; icon: string }) => {
      const row = Array.from(document.querySelectorAll('[data-depth]'))[asked.index]
      const entry = row?.querySelector(`[data-icon="${asked.icon}"]`)
      if (entry === null || entry === undefined) return null
      const box = entry.getBoundingClientRect()
      if (box.width === 0 || box.height === 0) return null
      return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
    },
    { index, icon },
  )
  if (at === null) return false
  await pressAt(page, at)
  await page.waitForTimeout(700)
  return true
}

/** Every row the panel is drawing right now, in the order it drew them. @purity semi-pure-b */
async function drawnRows(page: Page): Promise<DrawnRow[]> {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('[data-depth]')).map((row) => {
      const box = row.getBoundingClientRect()
      return {
        id: row.getAttribute('data-group-id') ?? '',
        depth: Number(row.getAttribute('data-depth')),
        pinned: row.getAttribute('data-pinned') === 'true',
        label: (row.querySelector('span')?.textContent ?? '').trim(),
        y: Math.round(box.y),
        height: Math.round(box.height),
      }
    }),
  )
}

/**
 * The document, through the `Agent API`.
 *
 * ⭐ `AM-3` of table T-107 is the member that hands over a frozen copy of the
 * whole document (`AG-4`), and `FR-065` (MUST) keeps the API shut until a
 * person opens it -- which is what the header entrance above is pressed for.
 *
 * @purity semi-pure-b
 */
async function readDocumentShot(page: Page): Promise<DocShot | null> {
  return page.evaluate(() => {
    const api = (window as unknown as { grSchedulerAgentApi?: { readDocument(): unknown } })
      .grSchedulerAgentApi
    if (api === undefined) return null
    const schedule = (api.readDocument() as { schedule: Record<string, unknown> }).schedule
    return {
      groups: schedule.taskGroups,
      tasks: schedule.tasks,
      boxes: schedule.highlightBoxes,
      members: schedule.taskGroupMembers,
    } as unknown as DocShot
  })
}

/** The shape the canvas shows at a point -- `IN-2` of table T-028. @purity non-pure */
async function cursorAt(page: Page, x: number, y: number): Promise<string> {
  await page.mouse.move(x, y)
  return page.evaluate((part: string) => {
    const surface = document.querySelector(part)
    return surface instanceof HTMLElement ? surface.style.cursor : ''
  }, CANVAS_PART)
}

/** How far a drag runs along the time axis. @purity pure */
const REACH_PX = 160

/**
 * A column of empty ground that crosses the middles of both named rows.
 *
 * ⛔ Emptiness is the PRODUCT's own answer, not this file's: `PD-5` of table
 * T-023a gives ground that hit nothing the plain arrow, so a point whose cursor
 * is the plain arrow is ground no item covers. A drag that starts on an item
 * would be that item's default operation instead (`AR-6`'s last column).
 *
 * @purity non-pure
 */
async function emptyColumnAcross(
  page: Page,
  first: DrawnRow,
  second: DrawnRow,
): Promise<number | null> {
  const left = Math.round(
    await page.evaluate(
      (panel: string) => document.querySelector(panel)?.getBoundingClientRect().right ?? 0,
      ROW_PANEL,
    ),
  )
  const yFirst = first.y + Math.round(first.height / 2)
  const ySecond = second.y + Math.round(second.height / 2)
  for (let x = left + 80; x < BASE_SCREEN.width - 260 - REACH_PX; x += 24) {
    if ((await cursorAt(page, x, yFirst)) !== 'default') continue
    if ((await cursorAt(page, x, ySecond)) !== 'default') continue
    if ((await cursorAt(page, x + REACH_PX, yFirst)) !== 'default') continue
    if ((await cursorAt(page, x + REACH_PX, ySecond)) !== 'default') continue
    return x
  }
  return null
}

/** Drag with a real pointer, in enough steps that the shell sees the travel. @purity non-pure */
async function dragBetween(
  page: Page,
  from: { x: number; y: number },
  to: { x: number; y: number },
): Promise<void> {
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(
    from.x + Math.sign(to.x - from.x) * 40,
    from.y + Math.sign(to.y - from.y) * 15,
    { steps: 5 },
  )
  await page.mouse.move(to.x, to.y, { steps: 12 })
  await page.mouse.up()
  await page.waitForTimeout(900)
}

/** The outlines the drawing holds: a rounded, unfilled rectangle. @purity semi-pure-b */
async function drawnOutlines(
  page: Page,
): Promise<Array<{ y: number; height: number; x: number; width: number }>> {
  return page.evaluate(
    (selector: string) =>
      Array.from(document.querySelector(selector)?.querySelectorAll('rect') ?? [])
        .filter((one) => one.getAttribute('fill') === 'none' && one.getAttribute('rx') !== null)
        .map((one) => ({
          x: Number(one.getAttribute('x')),
          y: Number(one.getAttribute('y')),
          width: Number(one.getAttribute('width')),
          height: Number(one.getAttribute('height')),
        })),
    CANVAS_SVG,
  )
}

/** A grab point on a plan bar's body -- `GR-12` of table T-023d. @purity non-pure */
async function barBodyOn(page: Page, row: DrawnRow): Promise<{ x: number; y: number } | null> {
  const left = Math.round(
    await page.evaluate(
      (panel: string) => document.querySelector(panel)?.getBoundingClientRect().right ?? 0,
      ROW_PANEL,
    ),
  )
  for (let x = left + 100; x < BASE_SCREEN.width - 260; x += 8) {
    for (const offset of [-20, 0, 20, 40]) {
      const y = row.y + Math.round(row.height / 2) + offset
      if (y < row.y + 6 || y > row.y + row.height - 6) continue
      // ⭐ `IN-2` of table T-028 gives a grabbable thing the grabbing shape, so
      // the product itself says where a bar body is.
      if ((await cursorAt(page, x, y)) === 'grab') return { x, y }
    }
  }
  return null
}

/**
 * Whether one task sorts before another under the three keys of `ST-2`.
 *
 * ⭐ Driven by the keys read out of table T-014, not by three names written
 * here.
 *
 * @purity pure
 */
function beforeUnderSt2(left: DocTask, right: DocTask): number {
  const cellOf = (task: DocTask, key: string): string | number | null =>
    (task as unknown as Record<string, string | number | null>)[key] ?? null
  for (const { key, ascending } of ST2_KEYS) {
    const a = cellOf(left, key)
    const b = cellOf(right, key)
    if (a === null || b === null || a === b) continue
    const order =
      typeof a === 'number' && typeof b === 'number'
        ? a < b
          ? -1
          : 1
        : String(a) < String(b)
          ? -1
          : 1
    return ascending ? order : -order
  }
  return 0
}

// ---------------------------------------------------------------------------
// The sweep
// ---------------------------------------------------------------------------

// GOES RED IF any of the following is untrue of the running application. Each
// judgement names the row it comes from, and every one of them is soft, so one
// red never hides the rest.
//
//   1  FR-019 -- a drag pulled up and to the left still stores start <= end
//   2  FR-019 / IV-19 -- and stores the row that is EARLIER IN THE ROW TREE as
//      the top one, in the fixture where the tree and the screen disagree
//      because FR-098 lifted a row out of the scrolling area
//   3  FR-019 -- while the DRAWING encloses the two rows as the screen has them
//   4  HM-3 -- moving a bar to another row leaves wbsParentUid alone
//   5  HM-3 / HM-9 -- and gives the moved bar the rank its NEW row has in the
//      row tree, so that it is not told apart from the bars already there
//   6  ST-2 -- two WBS siblings sharing one row fall in the table's own order
//   7  HM-8 -- the row title panel's drag actually reorders siblings, which is
//      the road HM-9 rides on
test('the row tree, and not the screen, decides what is below (FR-019 / IV-19 / HM-9 / HM-3)', async ({
  baseURL,
}) => {
  test.setTimeout(600_000)

  // -------------------------------------------------------------------------
  // 1. FR-019 with nothing pinned -- the control the rest leans on
  // -------------------------------------------------------------------------
  {
    const opened = await openTheApp(baseURL)
    const page = opened.page
    try {
      expect
        .soft(await pressEntrance(page, AGENT_API_ENTRANCE), `${AGENT_API_ENTRANCE} is on the screen`)
        .toBe(true)
      const before = await readDocumentShot(page)
      expect.soft(before, 'FR-065: pressing that entrance published the Agent API').not.toBeNull()

      const rows = await drawnRows(page)
      expect.soft(rows.length, 'the panel draws rows to work with').toBeGreaterThan(3)
      const rank = rankInRowTree(before?.groups ?? [])

      let placed = false
      for (let upper = 0; upper < rows.length - 1 && !placed; upper += 1) {
        for (let lower = upper + 1; lower < rows.length && !placed; lower += 1) {
          const x = await emptyColumnAcross(page, rows[upper] as DrawnRow, rows[lower] as DrawnRow)
          if (x === null) continue
          const high = rows[upper] as DrawnRow
          const low = rows[lower] as DrawnRow
          expect
            .soft(await pressEntrance(page, HIGHLIGHT_BOX_ENTRANCE), `${HIGHLIGHT_BOX_ENTRANCE} is on the screen`)
            .toBe(true)
          expect
            .soft(REACH_PX, 'the drag travels further than S-208, so it is a drag')
            .toBeGreaterThan(PRESS_OR_DRAG_PX)
          // Pulled UP and to the LEFT: both stored orderings arrive reversed.
          await dragBetween(
            page,
            { x: x + REACH_PX, y: low.y + Math.round(low.height / 2) },
            { x, y: high.y + Math.round(high.height / 2) },
          )
          const after = await readDocumentShot(page)
          const box = after?.boxes[0]
          expect.soft(after?.boxes.length ?? -1, 'FR-019: the drag placed one highlight box').toBe(1)
          if (box !== undefined) {
            placed = true
            expect
              .soft(
                String(box.startDate) <= String(box.endDate),
                `${IV_19} / FR-019: startDate ${box.startDate} is not after endDate ${box.endDate}`,
              )
              .toBe(true)
            expect
              .soft(
                (rank.get(String(box.topGroupId)) ?? -1) < (rank.get(String(box.bottomGroupId)) ?? -1),
                `${IV_19} / FR-019 (control, nothing pinned): the top row must rank earlier in the ` +
                  `row tree than the bottom one -- top ${nameOf(after?.groups ?? [], box.topGroupId)} ` +
                  `is at ${String(rank.get(String(box.topGroupId)))}, bottom ` +
                  `${nameOf(after?.groups ?? [], box.bottomGroupId)} at ` +
                  `${String(rank.get(String(box.bottomGroupId)))}`,
              )
              .toBe(true)
          }
        }
      }
      expect.soft(placed, 'a pair of drawn rows shares a column of empty ground').toBe(true)
    } finally {
      await opened.close()
    }
  }

  // -------------------------------------------------------------------------
  // 2 and 3. FR-098 lifts one row, so the screen and the row tree disagree
  // -------------------------------------------------------------------------
  {
    const opened = await openTheApp(baseURL)
    const page = opened.page
    try {
      await pressEntrance(page, AGENT_API_ENTRANCE)
      const before = await drawnRows(page)
      const last = before.length - 1
      expect
        .soft(
          await pressEntranceInRow(page, last, ROW_PIN_ENTRANCE),
          `FR-098: ${ROW_PIN_ENTRANCE} is drawn in every row of the panel`,
        )
        .toBe(true)

      const rows = await drawnRows(page)
      const shot = await readDocumentShot(page)
      const rank = rankInRowTree(shot?.groups ?? [])
      const pinnedIndex = rows.findIndex((one) => one.pinned)
      expect.soft(pinnedIndex, 'FR-098: the pinned row is drawn first, at the top of Row Area').toBe(0)

      // The fixture is only worth anything while the two orderings disagree.
      const pinned = rows[pinnedIndex < 0 ? 0 : pinnedIndex] as DrawnRow
      const others = rows.filter((one) => !one.pinned)
      const later = others.filter((one) => (rank.get(one.id) ?? 0) < (rank.get(pinned.id) ?? 0))
      expect
        .soft(
          later.length,
          'the fixture needs at least one drawn row that the row tree puts BEFORE the pinned one ' +
            'while the screen puts it after',
        )
        .toBeGreaterThan(0)

      let judged = false
      for (const other of later) {
        if (judged) break
        const x = await emptyColumnAcross(page, pinned, other)
        if (x === null) continue
        const outlinesBefore = (await drawnOutlines(page)).length
        await pressEntrance(page, HIGHLIGHT_BOX_ENTRANCE)
        // Pulled DOWN the screen: from the pinned band at the top to a row the
        // row tree puts EARLIER. Screen order and tree order disagree here.
        await dragBetween(
          page,
          { x, y: pinned.y + Math.round(pinned.height / 2) },
          { x: x + REACH_PX, y: other.y + Math.round(other.height / 2) },
        )
        const after = await readDocumentShot(page)
        const box = after?.boxes[0]
        expect.soft(after?.boxes.length ?? -1, 'FR-019: the drag placed one highlight box').toBe(1)
        if (box === undefined) continue
        judged = true

        // 2. The STORED value follows the row tree (CR-354's MUST / MUST NOT).
        expect
          .soft(
            (rank.get(String(box.topGroupId)) ?? -1) < (rank.get(String(box.bottomGroupId)) ?? -1),
            `${IV_19} / FR-019: with ${pinned.label} pinned to the top of the screen, "below" must ` +
              'still be read off the ROW TREE and never off the drawn position -- expected top ' +
              `${nameOf(after?.groups ?? [], other.id)} (tree rank ${String(rank.get(other.id))}), ` +
              `got top ${nameOf(after?.groups ?? [], box.topGroupId)} (tree rank ` +
              `${String(rank.get(String(box.topGroupId)))}) and bottom ` +
              `${nameOf(after?.groups ?? [], box.bottomGroupId)} (tree rank ` +
              `${String(rank.get(String(box.bottomGroupId)))})`,
          )
          .toBe(true)

        // 3. The DRAWING goes the other way: it encloses the two rows the
        //    screen is showing, pinned band included.
        const outlines = await drawnOutlines(page)
        expect
          .soft(outlines.length, 'FR-019: the placed highlight box is drawn as an outline')
          .toBeGreaterThan(outlinesBefore)
        const wantedTop = Math.min(pinned.y, other.y)
        const wantedBottom = Math.max(pinned.y + pinned.height, other.y + other.height)
        const enclosing = outlines.filter(
          (one) => one.y <= wantedTop + 2 && one.y + one.height >= wantedBottom - 2,
        )
        expect
          .soft(
            enclosing.length,
            `FR-019: the drawing must enclose the two rows AS THE SCREEN HAS THEM -- ` +
              `${wantedTop}..${wantedBottom}px covering ${pinned.label} and ${other.label}; ` +
              `outlines drawn: ${JSON.stringify(outlines)}`,
          )
          .toBeGreaterThan(0)
      }
      expect.soft(judged, 'the pinned row shares a column of empty ground with a tree-earlier row').toBe(true)
    } finally {
      await opened.close()
    }
  }

  // -------------------------------------------------------------------------
  // 4, 5 and 6. HM-3 and HM-9 -- moving bars between rows
  // -------------------------------------------------------------------------
  {
    const opened = await openTheApp(baseURL)
    const page = opened.page
    try {
      await pressEntrance(page, AGENT_API_ENTRANCE)
      const rows = await drawnRows(page)
      const before = await readDocumentShot(page)
      const rank = rankInRowTree(before?.groups ?? [])
      const homeOf = new Map((before?.members ?? []).map((one) => [one.taskUid, one.groupId]))

      // A source row whose tasks share a WBS parent, and a destination row the
      // row tree puts LATER than the source.
      const source = rows.find((one) => {
        const held = (before?.tasks ?? []).filter((task) => homeOf.get(task.uid) === one.id)
        return held.length >= 2 && held.every((task) => task.wbsParentUid === held[0]?.wbsParentUid)
      })
      const destination = rows.find(
        (one) => source !== undefined && (rank.get(one.id) ?? 0) > (rank.get(source.id) ?? 0),
      )
      expect.soft(source, 'one drawn row holds two or more WBS siblings').not.toBeUndefined()
      expect.soft(destination, 'another drawn row sits later in the row tree').not.toBeUndefined()

      if (source !== undefined && destination !== undefined) {
        const moved: number[] = []
        for (let attempt = 0; attempt < 2; attempt += 1) {
          const grab = await barBodyOn(page, source)
          if (grab === null) break
          await dragBetween(page, grab, {
            x: grab.x,
            y: destination.y + Math.round(destination.height / 2),
          })
          const now = await readDocumentShot(page)
          const nowHome = new Map((now?.members ?? []).map((one) => [one.taskUid, one.groupId]))
          for (const [uid, home] of nowHome) {
            if (home === destination.id && homeOf.get(uid) === source.id && !moved.includes(uid)) {
              moved.push(uid)
            }
          }
        }
        expect
          .soft(
            moved.length,
            `${HM_3} / GR-12 of table T-023d: dragging a plan bar down onto ${destination.label} ` +
              'puts it on that row',
          )
          .toBeGreaterThan(0)

        const after = await readDocumentShot(page)
        const afterHome = new Map((after?.members ?? []).map((one) => [one.taskUid, one.groupId]))

        // 4. HM-3's first MUST NOT -- the WBS parent is untouched.
        for (const uid of moved) {
          const was = (before?.tasks ?? []).find((one) => one.uid === uid)
          const is = (after?.tasks ?? []).find((one) => one.uid === uid)
          expect
            .soft(
              is?.wbsParentUid ?? null,
              `${HM_3} (MUST NOT): moving task ${uid} to another row must not change its WBS parent`,
            )
            .toBe(was?.wbsParentUid ?? null)
        }

        // 5. HM-3's new clause and HM-9 -- the moved bar takes the rank of the
        //    row it now sits on, so nothing tells it apart from the bars that
        //    were already there.
        for (const uid of moved) {
          const one = (after?.tasks ?? []).find((task) => task.uid === uid)
          if (one === undefined) continue
          const siblings = (after?.tasks ?? []).filter(
            (task) => task.wbsParentUid === one.wbsParentUid,
          )
          const wrong = siblings.filter((other) => {
            if (other.uid === one.uid) return false
            const here = rank.get(String(afterHome.get(one.uid))) ?? 0
            const there = rank.get(String(afterHome.get(other.uid))) ?? 0
            if (here === there) return false
            const byRow = here < there ? -1 : 1
            const byOrder = (one.wbsOrder ?? 0) < (other.wbsOrder ?? 0) ? -1 : 1
            return byRow !== byOrder
          })
          expect
            .soft(
              wrong.length,
              `${HM_9} / ${HM_3}: task ${uid} now sits on ${destination.label} (tree rank ` +
                `${String(rank.get(destination.id))}), so among its WBS siblings it must rank by ` +
                `that row's place in the row tree; ${wrong.length} of ${siblings.length - 1} ` +
                `siblings disagree (its wbsOrder is still ${String(one.wbsOrder)})`,
            )
            .toBe(0)
        }

        // 6. ST-2 -- two siblings that ended up on the SAME row.
        if (moved.length >= 2) {
          const pair = moved
            .map((uid) => (after?.tasks ?? []).find((task) => task.uid === uid))
            .filter((task): task is DocTask => task !== undefined)
          const [left, right] = [pair[0] as DocTask, pair[1] as DocTask]
          const expected = beforeUnderSt2(left, right)
          const actual = (left.wbsOrder ?? 0) < (right.wbsOrder ?? 0) ? -1 : 1
          expect
            .soft(
              expected === 0 || expected === actual,
              `${HM_9} -> ST-2 of table T-014: tasks ${left.uid} and ${right.uid} share one row, so ` +
                `the table's three keys settle their order; keys ` +
                `${JSON.stringify(ST2_KEYS)} want ${expected < 0 ? left.uid : right.uid} first, ` +
                `wbsOrder has ${actual < 0 ? left.uid : right.uid} first`,
            )
            .toBe(true)
        }
      }
    } finally {
      await opened.close()
    }
  }

  // -------------------------------------------------------------------------
  // 7. HM-8 -- the road HM-9 rides on
  // -------------------------------------------------------------------------
  {
    const opened = await openTheApp(baseURL)
    const page = opened.page
    try {
      await pressEntrance(page, AGENT_API_ENTRANCE)
      const rows = await drawnRows(page)
      const before = await readDocumentShot(page)
      const groups = before?.groups ?? []
      const pair = rows
        .map((row) => groups.find((group) => group.id === row.id))
        .filter((group): group is DocGroup => group !== undefined)
      const sibling = pair.find(
        (group, at) => at > 0 && pair[at - 1]?.parentId === group.parentId,
      )
      const above = pair[pair.indexOf(sibling as DocGroup) - 1]
      expect.soft(sibling, 'two drawn rows are siblings under one parent').not.toBeUndefined()

      if (sibling !== undefined && above !== undefined) {
        const from = rows.find((one) => one.id === sibling.id) as DrawnRow
        const to = rows.find((one) => one.id === above.id) as DrawnRow
        await dragBetween(
          page,
          { x: 60, y: from.y + Math.round(from.height / 2) },
          { x: 60, y: to.y + 8 },
        )
        const after = await readDocumentShot(page)
        const now = (after?.groups ?? []).find((one) => one.id === sibling.id)
        expect
          .soft(
            now?.order ?? sibling.order,
            `${HM_8} (MUST): a drag in the row title panel reorders siblings -- this is the only ` +
              `entrance ${HM_9} has, so nothing can carry a reordering into the WBS without it. ` +
              `Dragged ${sibling.label ?? ''} above ${above.label ?? ''}; its order was ` +
              `${sibling.order}`,
          )
          .toBeLessThan(sibling.order)
      }
    } finally {
      await opened.close()
    }
  }
})
