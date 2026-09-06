// Copying, pasting and the two cursors, measured on the shipped build by a
// reader who was allowed `docs/spec/` and nothing else.
//
//   FR-033  (`01-04-requirements.md`) -- what a copy carries, where a paste
//           lands, which UID it may not reuse, and the store it is allowed to
//           read. Table T-223 (`DU-1` / `DU-2`) is the cascade it points at.
//
//   SK-4 / SK-5  (table T-036) -- the two key assignments whose governing
//           requirement is FR-033.
//
//   FR-048 / table T-029a  (`01-04-requirements.md`) -- the three cursors are
//           armed independently; the entrance that put one up takes it down
//           again; and one entrance may not take two down (`DC-4`, `DC-7`).
//
// ⛔ NO SENTENCE OF THE MANUSCRIPT IS QUOTED OR TRANSLATED HERE. Rule 03
// section 5 asks for the row ID instead, so every claim below cites the row
// that carries it and the reader goes to `docs/spec` for the wording.
//
// ⭐ EVERY ROW ID, KEY AND NUMBER ASSERTED IS READ OUT OF `docs/spec` AT READ
// TIME -- the two key assignments, the three entrances of table T-109, the
// depth ceiling `S-125` and the screen of `MC-6`. Chapter 1.9 asks that of a
// case verifying a requirement that points at a table. Nothing here is a
// number read off the running application.
//
// ⛔ NO `swsCase` IS DECLARED. Table T-219 row `TW-2` has Chapter 9's declared
// cases hung from an `SWS-xxx` node of Chapter 6.1, and no `SWS-` node today is
// about a paste or a cursor. The rows each case leans on are named in prose at
// the case instead, the way `tests/system/user-reported-fixes.test.ts` does.
//
// ⛔ WHAT IS PRESSED IS THE SHIPPED BUILD -- `dist/index.html` over `file://`,
// as `tests/system/three-rows-read-from-the-spec-alone.test.ts` presses it.
//
// ⭐ ONE VISIT, MANY READINGS. Opening the reference browser is the expensive
// part (`CLEARING_UP_MS` of `./live-app` carries the measurement), so the whole
// experiment runs once in `beforeAll` and the cases below judge what it wrote
// down. A case therefore never presses anything itself.
//
// ⚠️ WHAT THIS FILE DOES NOT COVER, MEASURED 2026-09-07 AND LEFT OUT ON
// PURPOSE:
//   * `DC-4`'s OTHER way out of the mode -- `Esc` -- does not clear the placed
//     pair on this build, which `DC-7` (MUST) requires of leaving the mode. It
//     is a defect in the shell, not in this file, so no red case is left behind
//     for it; the reading and the place to fix are in the round's report.
//   * FR-033's MUST NOT about `TaskOrigin` cannot be judged from the bundled
//     startup document, which carries no `TaskOrigin` at all -- there is
//     nothing for a copy to wrongly carry.

import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test'
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
const T036: SpecTable = specTable('T-036')
const T109: SpecTable = specTable('T-109')
const T202: SpecTable = specTable('T-202')
const T211: SpecTable = specTable('T-211')

/** The screen of the base environment: table T-025, row `MC-6`. */
const BASE_SCREEN = screenOf(rowOf(T025, 'MC-6'))

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

// Table T-036 holds three cells after the row ID -- what the key does, the
// assignment, and the entrance the assignment moves.
const T036_COLUMNS = 3
const T036_ASSIGNMENT = 1

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

/** The one assignment a row of table T-036 names. @purity pure */
function keyOf(id: string): string {
  const said = cellOf(T036, id, T036_ASSIGNMENT, T036_COLUMNS)
  const found = /`([^`]+)`/.exec(said)
  if (found === null) {
    throw new Error(`table T-036 row ${id} names no key this file can read: ${JSON.stringify(said)}`)
  }
  return asDriven(found[1] ?? '')
}

/** `SK-4` -- the copy of FR-033. */
const COPY_KEY = keyOf('SK-4')
/** `SK-5` -- the paste of FR-033. */
const PASTE_KEY = keyOf('SK-5')

// Table T-109 holds five cells after the row ID -- the surface, the group, what
// the entrance is for, the requirement that governs it, and a note.
const T109_COLUMNS = 5
const T109_PURPOSE = 2
const T109_SOURCE = 3

/**
 * Every entrance of table T-109 that this requirement governs.
 *
 * ⚠️ The column read is table T-109's fourth, the one naming the requirement
 * an entrance answers to. Its heading is Japanese, so it is read by position
 * (see `cellOf`) rather than spelled here.
 *
 * ⛔ ANCHORED so that `FR-04` cannot be found by asking for `FR-048`, and so
 * that a three-digit neighbour cannot answer for a two-digit one.
 *
 * @purity pure
 */
function entrancesServing(requirement: string): readonly string[] {
  const wanted = new RegExp(`${requirement}(?![0-9])`)
  return T109.rows
    .filter((row) => wanted.test(row.cells[T109_SOURCE] ?? ''))
    .map((row) => row.id)
}

/** The one entrance this requirement governs. @purity pure */
function theEntranceServing(requirement: string): string {
  const found = entrancesServing(requirement)
  if (found.length !== 1) {
    throw new Error(
      `table T-109 has ${found.length} entrances governed by ${requirement}, and this file ` +
        'needs one',
    )
  }
  return found[0] ?? ''
}

/** `IC-20` -- the header entrance `FR-065` gives for opening the `Agent API`. */
const AGENT_API_ENTRANCE = theEntranceServing('FR-065')

/** `IC-45` -- the one entrance `FR-082` governs, the `Dual Cursor`. */
const DUAL_CURSOR_ENTRANCE = theEntranceServing('FR-082')

// Table T-202 holds four cells after the row ID -- the key, the type, the
// default, and what it means.
const T202_COLUMNS = 4
const T202_KEY = 0
const T202_TYPE = 1

/** The settled name a row of table T-202 gives a saved value. @purity pure */
function settingKeyOf(id: string): string {
  const found = /`([A-Za-z][A-Za-z0-9]*)`/.exec(cellOf(T202, id, T202_KEY, T202_COLUMNS))
  if (found === null) throw new Error(`table T-202 row ${id} names no key this file can read`)
  return found[1] ?? ''
}

/** `S-65` -- the two dates `CU-2` measures between, or nothing. */
const DUAL_CURSOR_SETTING = settingKeyOf('S-65')
/** `S-66` -- the mode `CU-3` stands in. */
const GUIDE_CURSOR_SETTING = settingKeyOf('S-66')

/**
 * The values `S-66` admits, in the order table T-202 writes them.
 *
 * ⭐ Read out of the type cell so that a value retired there (as
 * `'double-vertical'` was) leaves this file without being edited.
 *
 * @purity pure
 */
const GUIDE_CURSOR_VALUES: readonly string[] = (() => {
  const said = cellOf(T202, 'S-66', T202_TYPE, T202_COLUMNS)
  const found = [...said.matchAll(/`'([a-z-]+)'`/g)].map((one) => one[1] ?? '')
  if (found.length < 2) {
    throw new Error(`table T-202 row S-66 names ${found.length} modes, and this file needs two`)
  }
  return found
})()

/** The mode `S-66` calls nothing at all -- `FR-048` makes it the road out. */
const GUIDE_CURSOR_NONE = GUIDE_CURSOR_VALUES[0] ?? ''

/**
 * The entrances of `FR-048` that arm a guide cursor, paired with the mode each
 * one puts up.
 *
 * ⛔ NOT WRITTEN OUT HERE. Table T-109's purpose column is the one home of the
 * pairing, so an entrance retired there (as `IC-46` was) drops out of this run
 * without this file being touched.
 *
 * @purity pure
 */
const GUIDE_CURSOR_ENTRANCES: readonly { readonly icon: string; readonly mode: string }[] = (() => {
  const armed = GUIDE_CURSOR_VALUES.filter((mode) => mode !== GUIDE_CURSOR_NONE)
  const found = entrancesServing('FR-048').flatMap((icon) => {
    const said = cellOf(T109, icon, T109_PURPOSE, T109_COLUMNS)
    const mode = armed.find((one) => said.includes(`'${one}'`))
    return mode === undefined ? [] : [{ icon, mode }]
  })
  if (found.length !== armed.length) {
    throw new Error(
      `table T-202 row S-66 has ${armed.length} modes to arm and table T-109 names ` +
        `${found.length} entrances arming one`,
    )
  }
  return found
})()

// Table T-211 holds five cells after the row ID -- the name, the value, the
// floor, the ceiling, and a note.
const T211_COLUMNS = 5
const T211_VALUE = 1

/** `S-125` -- the depth a row tree may not be pushed past (`FR-004`). */
const MAX_GROUP_DEPTH = (() => {
  const said = cellOf(T211, 'S-125', T211_VALUE, T211_COLUMNS)
  const found = /-?\d+/.exec(said.replace(/`/g, ''))
  const value = Number(found?.[0] ?? '')
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`table T-211 row S-125 states no depth this file can read: ${said}`)
  }
  return value
})()

// ---------------------------------------------------------------------------
// Driving the shipped build
// ---------------------------------------------------------------------------

/**
 * ⛔ THE DELIVERABLE, not the sources and not the dev server. `NFR-004` row
 * `CN-1` has `dist/` hold exactly one file and that file be the `.html`;
 * `tests/nfr/` is what assembles and judges it. This file only opens it.
 */
const SHIPPED_BUILD = join(process.cwd(), 'dist', 'index.html')

/**
 * ⛔ NOT DECIDED BY THE SPECIFICATION: nothing says how a UI part is marked in
 * the page. The shell writes the part's settled name of
 * `_assets/tbl-glossary.md` onto `data-role`, which is what the neighbouring
 * System files lean on, and this file leans on the same two markings and no
 * others.
 */
const ROW_PANEL = '[data-role="Row Title Panel"]'
const CANVAS_PART = '[data-role="Schedule Canvas"]'

/** One row of the document, as `AM-3` of table T-107 hands it over. */
interface DocGroup {
  readonly id: string
  readonly parentId: string | null
  readonly label: string | null
}

/** One `Task`, in the two columns this file reads. */
interface DocTask {
  readonly uid: number
  readonly wbsParentUid: number | null
}

/** What one reading of the document records. */
interface DocShot {
  readonly taskUids: readonly number[]
  readonly tasks: readonly DocTask[]
  readonly names: Readonly<Record<string, string>>
  readonly groups: readonly DocGroup[]
  readonly members: ReadonlyArray<{ readonly taskUid: number; readonly groupId: string }>
  readonly dualCursor: unknown
  readonly guideCursorMode: string
}

/** What one pasted-row experiment recorded. */
interface RowPaste {
  /** The row that was copied, and the row that was chosen when the paste landed. */
  readonly sourceId: string
  readonly chosenIds: readonly string[]
  readonly before: DocShot
  readonly after: DocShot
}

interface Measured {
  /** The task that was picked with a real pointer, and the row it stood on. */
  readonly pickedTaskUid: number
  readonly pickedTaskRowId: string
  readonly beforeTaskPaste: DocShot
  readonly afterTaskPaste: DocShot
  /** A copied row pasted while one row was chosen (`FR-033`'s first MUST). */
  readonly intoChosenRow: RowPaste
  /** The same store pasted with nothing chosen (`FR-033`'s second MUST). */
  readonly atTopLevel: RowPaste
  /** A copied row whose landing would push the tree past `S-125`. */
  readonly pastTheDepthCeiling: RowPaste
  /** How deep the tree would have gone had that last paste been taken. */
  readonly depthThatWasRefused: number
  /** How many times the page asked the operating system for its clipboard. */
  readonly clipboardReads: number
  /** `S-65` as `IC-45` was pressed, let go, pressed again. */
  readonly dualCursorWhileDown: unknown
  readonly dualCursorAfterFirstPress: unknown
  readonly dualCursorAfterSecondPress: unknown
  /** What each guide-cursor entrance did, with a `Dual Cursor` standing. */
  readonly guideCursorRuns: ReadonlyArray<{
    readonly icon: string
    readonly modeWanted: string
    readonly modeAfterFirstPress: string
    readonly modeAfterSecondPress: string
    readonly dualCursorAfterFirstPress: unknown
    readonly dualCursorAfterSecondPress: unknown
  }>
  /** A page that has copied nothing, asked to paste. */
  readonly beforeEmptyPaste: DocShot
  readonly afterEmptyPaste: DocShot
}

let browser: Browser | null = null
let measured: Measured | null = null
let sweepFailed: Error | null = null

test.beforeAll(async () => {
  // ⛔ THE HOOK'S OWN ALLOWANCE. The sweep opens two contexts, loads the
  // deliverable twice and drives some hundreds of pointer presses looking for a
  // task bar; `CLEARING_UP_MS` of `./live-app` carries why a browser here is
  // slow at all.
  test.setTimeout(600_000)
  if (!existsSync(SHIPPED_BUILD)) {
    throw new Error(
      'the shipped build this file presses is not there; run `npx vite build` first ' +
        '(dist/index.html)',
    )
  }
  browser = await launchReferenceBrowser()
  try {
    measured = await sweep()
  } catch (thrown) {
    sweepFailed = thrown instanceof Error ? thrown : new Error(String(thrown))
  }
})

test.afterAll(async () => {
  test.setTimeout(CLEARING_UP_MS)
  await browser?.close()
})

/**
 * The deliverable, up and settled, with the `Agent API` opened and the page's
 * every request for the operating system's clipboard counted.
 *
 * ⭐ THE COUNTER IS THE ONLY WAY TO JUDGE FR-033's MUST NOT from outside. A
 * paste that works proves a store exists; it does not prove the store is the
 * one inside the application. Standing a counter in front of
 * `navigator.clipboard` before the page runs turns the prohibition into
 * something a case can read.
 *
 * @purity non-pure
 */
async function openTheApp(): Promise<{ context: BrowserContext; page: Page }> {
  if (browser === null) throw new Error('the reference browser was not opened')
  const context = await browser.newContext({ viewport: BASE_SCREEN })
  const page = await context.newPage()
  await page.addInitScript(() => {
    const held = window as unknown as { grsClipboardReads?: number }
    held.grsClipboardReads = 0
    const count = (): Promise<never> => {
      held.grsClipboardReads = (held.grsClipboardReads ?? 0) + 1
      return Promise.reject(new Error('this run does not hand over the host clipboard'))
    }
    try {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          read: count,
          readText: count,
          write: () => Promise.resolve(),
          writeText: () => Promise.resolve(),
        },
      })
    } catch {
      // A browser that will not let the member be stood in front of leaves the
      // count at zero, and the case that reads it says so.
    }
  })
  await page.goto(pathToFileURL(SHIPPED_BUILD).href)
  await readSettledDrawnSvg(page)
  await pressEntrance(page, AGENT_API_ENTRANCE)
  const opened = await page.evaluate(
    () => typeof (window as unknown as Record<string, unknown>).grSchedulerAgentApi,
  )
  if (opened !== 'object') {
    throw new Error(`pressing ${AGENT_API_ENTRANCE} did not publish the Agent API`)
  }
  return { context, page }
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
async function pressEntrance(page: Page, icon: string): Promise<void> {
  const at = await page.evaluate((wanted: string) => {
    const entry = document.querySelector(`[data-icon="${wanted}"]`)
    if (entry === null) return null
    const box = entry.getBoundingClientRect()
    if (box.width < 1 || box.height < 1) return null
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
  }, icon)
  if (at === null) throw new Error(`the entrance ${icon} of table T-109 is not on the screen`)
  await pressAt(page, at)
  await page.waitForTimeout(500)
}

/** The document, through `AM-3` of table T-107. @purity semi-pure-b */
async function readShot(page: Page, dual: string, guide: string): Promise<DocShot> {
  return page.evaluate(
    (keys: { dual: string; guide: string }) => {
      const api = (window as unknown as { grSchedulerAgentApi: { readDocument(): unknown } })
        .grSchedulerAgentApi
      const held = api.readDocument() as {
        schedule: {
          tasks: { uid: number; name: string | null; wbsParentUid: number | null }[]
          taskGroups: { id: string; parentId: string | null; label: string | null }[]
          taskGroupMembers: { taskUid: number; groupId: string }[]
        }
        documentSettings: Record<string, unknown>
      }
      const names: Record<string, string> = {}
      for (const task of held.schedule.tasks) names[String(task.uid)] = task.name ?? ''
      return {
        taskUids: held.schedule.tasks.map((one) => one.uid),
        tasks: held.schedule.tasks.map((one) => ({
          uid: one.uid,
          wbsParentUid: one.wbsParentUid,
        })),
        names,
        groups: held.schedule.taskGroups.map((one) => ({
          id: one.id,
          parentId: one.parentId,
          label: one.label,
        })),
        members: held.schedule.taskGroupMembers.map((one) => ({
          taskUid: one.taskUid,
          groupId: one.groupId,
        })),
        dualCursor: held.documentSettings[keys.dual] ?? null,
        guideCursorMode: String(held.documentSettings[keys.guide] ?? ''),
      }
    },
    { dual, guide },
  )
}

/** What is selected, through `AM-5` of table T-107. @purity semi-pure-b */
async function readSelection(page: Page): Promise<{ kind: string; uid?: number }[]> {
  return page.evaluate(() => {
    const api = (window as unknown as { grSchedulerAgentApi: { readSelection(): unknown } })
      .grSchedulerAgentApi
    return (api.readSelection() as { items: { kind: string; uid?: number }[] }).items
  })
}

/** Every row the panel is drawing right now, in the order it drew them. @purity semi-pure-b */
async function drawnRowIds(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('[data-depth]')).map(
      (row) => row.getAttribute('data-group-id') ?? '',
    ),
  )
}

/** Which rows the panel is drawing as chosen. @purity semi-pure-b */
async function chosenRowIds(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('[data-depth][data-selected="true"]')).map(
      (row) => row.getAttribute('data-group-id') ?? '',
    ),
  )
}

/**
 * Press one row of the `Row Title Panel` where nothing else can take the press.
 *
 * ⚠️ THE POINTER GOES ON THE ROW FIRST AND THE POINT IS CHOSEN AFTERWARDS.
 * Table T-051 row `HF-6` keeps a row's own controls hidden until the pointer is
 * on that row, so a point measured before the hover lands on a control that was
 * not there when it was measured -- which is what happened here on the first
 * try: the press folded the row instead of choosing it. `GR-20` of table T-023d
 * lays a grab strip along the same row, and that is stepped over too.
 *
 * @purity non-pure
 */
async function chooseRow(page: Page, groupId: string, isExtending: boolean): Promise<void> {
  const hover = await page.evaluate((wanted: string) => {
    const row = document.querySelector(`[data-depth][data-group-id="${wanted}"]`)
    if (row === null) return null
    const box = row.getBoundingClientRect()
    return { x: Math.round(box.x + box.width / 2), y: Math.round(box.y + box.height / 2) }
  }, groupId)
  if (hover === null) throw new Error(`the panel is not drawing the row ${groupId}`)
  await page.mouse.move(hover.x, hover.y)
  await page.waitForTimeout(400)
  const at = await page.evaluate((wanted: string) => {
    const row = document.querySelector(`[data-depth][data-group-id="${wanted}"]`)
    if (row === null) return null
    const box = row.getBoundingClientRect()
    for (let x = Math.round(box.x) + 2; x < box.right - 2; x += 3) {
      for (const y of [Math.round(box.y) + 4, Math.round(box.y + box.height / 2)]) {
        const node = document.elementFromPoint(x, y)
        if (node === null) continue
        if (node.closest('[data-icon]') !== null) continue
        if (node.closest('[data-row-grab]') !== null) continue
        if (node.closest('[data-group-id]') !== row) continue
        return { x, y }
      }
    }
    return null
  }, groupId)
  if (at === null) {
    throw new Error(`every point of the row ${groupId} is covered by one of its own controls`)
  }
  if (isExtending) await page.keyboard.down('Shift')
  await pressAt(page, at)
  if (isExtending) await page.keyboard.up('Shift')
  await page.waitForTimeout(500)
}

/**
 * A `Task` picked with a real pointer, by pressing along a drawn row until the
 * selection holds exactly one.
 *
 * ⛔ THERE IS NO HANDLE TO AIM AT. Nothing in the specification says how a bar
 * is marked in the drawing and the renderer marks none, so the only honest way
 * to pick one from outside is to press and read `AM-5` back.
 *
 * ⛔⛔ EVERY POINT IS CHECKED TO BE ON THE DRAWING FIRST, and that is not
 * tidiness. Measured 2026-09-07: the `Command Palette` floats over the drawing,
 * so a plain walk across a row pressed its entrances on the way -- it armed a
 * task shape (which then made a `Task` on the next miss, `FR-030`) and it
 * pressed `IC-75`, after which `IC-45` was not on the screen for the cursor
 * runs below. ⭐ With the walk kept to the drawing, a miss selects nothing and
 * writes nothing.
 *
 * @purity non-pure
 */
async function pickATask(
  page: Page,
  rowId: string,
  acceptable: ReadonlySet<number>,
): Promise<number | null> {
  const points = await page.evaluate(
    (asked: { row: string; panel: string; canvas: string; right: number }) => {
      const row = document.querySelector(`[data-depth][data-group-id="${asked.row}"]`)
      const panel = document.querySelector(asked.panel)
      if (row === null || panel === null) return null
      const box = row.getBoundingClientRect()
      const left = Math.round(panel.getBoundingClientRect().right) + 10
      const found: { x: number; y: number }[] = []
      for (let y = Math.round(box.y) + 2; y <= Math.round(box.bottom) - 2; y += 6) {
        for (let x = left; x < asked.right; x += 6) {
          if (document.elementFromPoint(x, y)?.closest(asked.canvas) != null) found.push({ x, y })
        }
      }
      return found
    },
    {
      row: rowId,
      panel: ROW_PANEL,
      canvas: CANVAS_PART,
      right: BASE_SCREEN.width - 5,
    },
  )
  if (points === null) throw new Error(`the panel is not drawing the row ${rowId}`)
  for (const at of points) {
    await pressAt(page, at)
    const items = await readSelection(page)
    const only = items.length === 1 ? items[0] : undefined
    if (only?.kind === 'task' && typeof only.uid === 'number' && acceptable.has(only.uid)) {
      return only.uid
    }
  }
  return null
}

/** How deep a row stands, counting a top-level row as 1. @purity pure */
function depthOf(groups: readonly DocGroup[], id: string): number {
  const byId = new Map(groups.map((one) => [one.id, one]))
  let depth = 1
  let at = byId.get(id)
  while (at !== undefined && at.parentId !== null) {
    depth += 1
    at = byId.get(at.parentId)
  }
  return depth
}

/** How many levels a row's own subtree spans, itself counted. @purity pure */
function spanOf(groups: readonly DocGroup[], id: string): number {
  const children = groups.filter((one) => one.parentId === id)
  return children.length === 0 ? 1 : 1 + Math.max(...children.map((one) => spanOf(groups, one.id)))
}

/**
 * The whole experiment, in one visit.
 *
 * @purity non-pure
 */
async function sweep(): Promise<Measured> {
  const { context, page } = await openTheApp()
  try {
    const shot = (): Promise<DocShot> => readShot(page, DUAL_CURSOR_SETTING, GUIDE_CURSOR_SETTING)

    // ---- SK-4 and SK-5 on one Task ----------------------------------------
    const atStart = await shot()
    // ⭐ ONLY A `Task` WITH NO WBS DESCENDANTS WILL DO, so that `DU-1` of table
    // T-223 has exactly one thing to carry and the case below can count. A
    // `Task` with a subtree is copied whole, which is `DU-1` too and no less
    // true -- it is simply not what a counting case can read.
    const wbsParents = new Set(
      atStart.tasks.flatMap((one) => (one.wbsParentUid === null ? [] : [one.wbsParentUid])),
    )
    const wbsLeaves = new Set(
      atStart.tasks.flatMap((one) => (wbsParents.has(one.uid) ? [] : [one.uid])),
    )
    let picked: number | null = null
    for (const rowId of await drawnRowIds(page)) {
      const carries = atStart.members.some(
        (one) => one.groupId === rowId && wbsLeaves.has(one.taskUid),
      )
      if (!carries) continue
      picked = await pickATask(page, rowId, wbsLeaves)
      if (picked !== null) break
    }
    if (picked === null) {
      throw new Error('no press on the drawing picked a Task that has no WBS descendants')
    }
    const pickedTaskUid = picked
    // ⭐ READ AFTER THE WALK AND NOT BEFORE IT. Picking a `Task` takes many
    // presses, and the case below judges what ONE paste added -- so the state
    // the paste is measured against is the state the walk left behind.
    const beforeTaskPaste = await shot()
    const pickedTaskRowId =
      beforeTaskPaste.members.find((one) => one.taskUid === pickedTaskUid)?.groupId ?? ''
    await page.keyboard.press(COPY_KEY)
    await page.waitForTimeout(400)
    await page.keyboard.press(PASTE_KEY)
    await page.waitForTimeout(1500)
    const afterTaskPaste = await shot()

    // ---- a landing that would push the tree past S-125 ---------------------
    // ⛔ THIS RUN COMES FIRST OF THE THREE ROW RUNS, and that is not a taste.
    // Only a row the panel is DRAWING can be pressed, table T-051 draws a
    // folded row's descendants nowhere, and the two runs below add rows -- so a
    // deep row that is on the screen now may not be on it afterwards. Measured
    // 2026-09-07: put last, this run found no deep row left drawn.
    const beforeDeep = await shot()
    const tooDeep = (await drawnRowIds(page)).find(
      (id) => depthOf(beforeDeep.groups, id) + spanOf(beforeDeep.groups, id) > MAX_GROUP_DEPTH,
    )
    if (tooDeep === undefined) {
      throw new Error(
        `the panel is drawing no row whose landing under itself would pass ${String(MAX_GROUP_DEPTH)}`,
      )
    }
    const depthThatWasRefused =
      depthOf(beforeDeep.groups, tooDeep) + spanOf(beforeDeep.groups, tooDeep)
    await chooseRow(page, tooDeep, false)
    await page.keyboard.press(COPY_KEY)
    await page.waitForTimeout(400)
    await page.keyboard.press(PASTE_KEY)
    await page.waitForTimeout(2500)
    const pastTheDepthCeiling: RowPaste = {
      sourceId: tooDeep,
      chosenIds: [tooDeep],
      before: beforeDeep,
      after: await shot(),
    }

    // ---- SK-4 and SK-5 on a row, landing under the chosen row -------------
    // ⭐ A row with no children of its own, so that its landing cannot be the
    // depth ceiling's business -- that refusal is the run above.
    const beforeIntoChosen = await shot()
    const leafWithTasks = (await drawnRowIds(page)).find(
      (id) =>
        spanOf(beforeIntoChosen.groups, id) === 1 &&
        beforeIntoChosen.members.some((one) => one.groupId === id),
    )
    if (leafWithTasks === undefined) {
      throw new Error('the panel is drawing no childless row that carries a Task')
    }
    await chooseRow(page, leafWithTasks, false)
    await page.keyboard.press(COPY_KEY)
    await page.waitForTimeout(400)
    await page.keyboard.press(PASTE_KEY)
    await page.waitForTimeout(2500)
    const intoChosenRow: RowPaste = {
      sourceId: leafWithTasks,
      chosenIds: [leafWithTasks],
      before: beforeIntoChosen,
      after: await shot(),
    }

    // ---- the same store, pasted with nothing chosen ------------------------
    // `SL-4`'s letting-go half: the chosen row is pressed again with the key
    // that extends, which takes it back out of the set.
    await chooseRow(page, leafWithTasks, true)
    const stillChosen = await chosenRowIds(page)
    if (stillChosen.length !== 0) {
      throw new Error(`letting the row go left ${stillChosen.length} rows chosen`)
    }
    const beforeTopLevel = await shot()
    await page.keyboard.press(PASTE_KEY)
    await page.waitForTimeout(2500)
    const atTopLevel: RowPaste = {
      sourceId: leafWithTasks,
      chosenIds: [],
      before: beforeTopLevel,
      after: await shot(),
    }

    const clipboardReads = await page.evaluate(
      () => (window as unknown as { grsClipboardReads?: number }).grsClipboardReads ?? -1,
    )

    // ---- IC-45, and the two guide-cursor entrances beside it ---------------
    const dualCursorWhileDown = (await shot()).dualCursor
    await pressEntrance(page, DUAL_CURSOR_ENTRANCE)
    const dualCursorAfterFirstPress = (await shot()).dualCursor
    await pressEntrance(page, DUAL_CURSOR_ENTRANCE)
    const dualCursorAfterSecondPress = (await shot()).dualCursor

    const guideCursorRuns: Measured['guideCursorRuns'][number][] = []
    for (const armed of GUIDE_CURSOR_ENTRANCES) {
      // ⭐ A `Dual Cursor` STANDS THROUGHOUT, which is the whole point: `DC-4`
      // (MUST NOT) and `FR-048` forbid one entrance taking two cursors down.
      if ((await shot()).dualCursor === null) {
        await pressEntrance(page, DUAL_CURSOR_ENTRANCE)
      }
      await pressEntrance(page, armed.icon)
      const first = await shot()
      await pressEntrance(page, armed.icon)
      const second = await shot()
      guideCursorRuns.push({
        icon: armed.icon,
        modeWanted: armed.mode,
        modeAfterFirstPress: first.guideCursorMode,
        modeAfterSecondPress: second.guideCursorMode,
        dualCursorAfterFirstPress: first.dualCursor,
        dualCursorAfterSecondPress: second.dualCursor,
      })
    }

    // ---- a page that has copied nothing, asked to paste --------------------
    // ⛔ ITS OWN VISIT. FR-033's store belongs to the running application, so
    // "nothing has been copied" is a state only a page that has never been
    // asked to copy can be in.
    const fresh = await openTheApp()
    try {
      const beforeEmptyPaste = await readShot(fresh.page, DUAL_CURSOR_SETTING, GUIDE_CURSOR_SETTING)
      await fresh.page.keyboard.press(PASTE_KEY)
      await fresh.page.waitForTimeout(1500)
      const afterEmptyPaste = await readShot(fresh.page, DUAL_CURSOR_SETTING, GUIDE_CURSOR_SETTING)
      return {
        pickedTaskUid,
        pickedTaskRowId,
        beforeTaskPaste,
        afterTaskPaste,
        intoChosenRow,
        atTopLevel,
        pastTheDepthCeiling,
        depthThatWasRefused,
        clipboardReads,
        dualCursorWhileDown,
        dualCursorAfterFirstPress,
        dualCursorAfterSecondPress,
        guideCursorRuns,
        beforeEmptyPaste,
        afterEmptyPaste,
      }
    } finally {
      await fresh.context.close()
    }
  } finally {
    await context.close()
  }
}

/** What the sweep wrote down, or the reason it never finished. @purity pure */
function readingsOfTheSweep(): Measured {
  if (sweepFailed !== null) throw sweepFailed
  if (measured === null) throw new Error('the sweep recorded nothing')
  return measured
}

/** The rows one paste added. @purity pure */
function rowsAdded(run: RowPaste): readonly DocGroup[] {
  return run.after.groups.filter((one) => !run.before.groups.some((was) => was.id === one.id))
}

/** The tasks one paste added. @purity pure */
function tasksAdded(run: RowPaste): readonly number[] {
  return run.after.taskUids.filter((one) => !run.before.taskUids.includes(one))
}

// ---------------------------------------------------------------------------
// FR-033 -- copying and pasting, which SK-4 and SK-5 of table T-036 assign
// ---------------------------------------------------------------------------

test.describe(`FR-033, driven by ${COPY_KEY} and ${PASTE_KEY} of table T-036`, () => {
  // Goes red if a copy of a Task lands as no Task at all, or as more than the
  // one subtree that was picked out of the drawing.
  test('copying one Task and pasting makes exactly one more Task', () => {
    const seen = readingsOfTheSweep()
    const added = seen.afterTaskPaste.taskUids.filter(
      (one) => !seen.beforeTaskPaste.taskUids.includes(one),
    )
    expect(
      added,
      `${COPY_KEY} then ${PASTE_KEY} on the Task ${String(seen.pickedTaskUid)}, which has no WBS ` +
        'descendants, should add the one Task of DU-1 in table T-223',
    ).toHaveLength(1)
  })

  // Goes red if the duplicate reuses the UID FR-033 (MUST NOT) reserves, which
  // is the failure that makes a redo hand out one UID twice.
  test('the pasted Task does not take the UID it was copied from', () => {
    const seen = readingsOfTheSweep()
    const added = seen.afterTaskPaste.taskUids.filter(
      (one) => !seen.beforeTaskPaste.taskUids.includes(one),
    )
    expect(added, 'the sweep recorded no pasted Task to judge').toHaveLength(1)
    expect(
      added[0],
      'FR-033 (MUST NOT) forbids the duplicate carrying the UID it was copied from',
    ).not.toBe(seen.pickedTaskUid)
  })

  // Goes red if the duplicate lands somewhere other than the row it was copied
  // from -- the MUST that table T-050 row `CD-2` leans on to know what a
  // deletion reaches.
  test('the pasted Task stands on the row it was copied from', () => {
    const seen = readingsOfTheSweep()
    const added = seen.afterTaskPaste.taskUids.filter(
      (one) => !seen.beforeTaskPaste.taskUids.includes(one),
    )
    expect(added, 'the sweep recorded no pasted Task to judge').toHaveLength(1)
    const landedOn = seen.afterTaskPaste.members.find((one) => one.taskUid === added[0])?.groupId
    expect(landedOn, 'FR-033 (MUST) puts the duplicate on the same row as its source').toBe(
      seen.pickedTaskRowId,
    )
    expect(
      seen.afterTaskPaste.names[String(added[0])],
      'the duplicate should carry the name of what was copied',
    ).toBe(seen.beforeTaskPaste.names[String(seen.pickedTaskUid)])
  })

  // Goes red if a copied row lands anywhere but under the one chosen row.
  test('a copied row lands as a child of the row that is chosen', () => {
    const seen = readingsOfTheSweep()
    const added = rowsAdded(seen.intoChosenRow)
    expect(
      added.length,
      `${PASTE_KEY} with the row ${seen.intoChosenRow.sourceId} copied and chosen should add rows`,
    ).toBeGreaterThan(0)
    const roots = added.filter((one) => !added.some((kin) => kin.id === one.parentId))
    expect(roots, 'DU-2 of table T-223 copies one subtree, so one row comes in at the top').toHaveLength(1)
    expect(
      roots[0]?.parentId,
      'FR-033 (MUST) makes the chosen row the parent of what is pasted',
    ).toBe(seen.intoChosenRow.chosenIds[0])
  })

  // Goes red if a row arrives without the Tasks standing on it -- DU-2's whole
  // point, and the reason FR-033 gives for not applying DU-1's same-row rule.
  test('a copied row brings the Tasks that stood on it', () => {
    const seen = readingsOfTheSweep()
    const stoodOnTheSource = seen.intoChosenRow.before.members.filter(
      (one) => one.groupId === seen.intoChosenRow.sourceId,
    ).length
    expect(stoodOnTheSource, 'the row that was copied carried no Task to judge').toBeGreaterThan(0)
    const added = tasksAdded(seen.intoChosenRow)
    expect(added, 'DU-2 of table T-223 copies every Task standing on the copied row').toHaveLength(
      stoodOnTheSource,
    )
    const addedRows = rowsAdded(seen.intoChosenRow).map((one) => one.id)
    const landedElsewhere = added.filter((uid) => {
      const on = seen.intoChosenRow.after.members.find((one) => one.taskUid === uid)?.groupId ?? ''
      return !addedRows.includes(on)
    })
    expect(
      landedElsewhere,
      'DU-2 puts the copied Tasks on the copied rows, not on the rows they came from',
    ).toHaveLength(0)
  })

  // Goes red if a paste with no row chosen buries the new row somewhere.
  test('a copied row pasted with no row chosen lands at the top level', () => {
    const seen = readingsOfTheSweep()
    const added = rowsAdded(seen.atTopLevel)
    expect(added.length, `${PASTE_KEY} with nothing chosen should add rows`).toBeGreaterThan(0)
    const roots = added.filter((one) => !added.some((kin) => kin.id === one.parentId))
    expect(roots, 'one subtree comes in, so one row comes in at the top').toHaveLength(1)
    expect(roots[0]?.parentId, 'FR-033 (MUST) puts it at the top level when nothing is chosen').toBeNull()
  })

  // Goes red if a paste is taken that pushes the row tree past S-125 -- the
  // MUST NOT FR-033 states and FR-004 owns the ceiling for.
  test(`a paste that would pass the depth of S-125 (${String(MAX_GROUP_DEPTH)}) is refused whole`, () => {
    const seen = readingsOfTheSweep()
    expect(
      seen.depthThatWasRefused,
      'the sweep should have chosen a landing that passes the ceiling',
    ).toBeGreaterThan(MAX_GROUP_DEPTH)
    expect(
      rowsAdded(seen.pastTheDepthCeiling),
      'FR-033 (MUST NOT) refuses the whole duplicate rather than trimming it',
    ).toHaveLength(0)
    expect(
      tasksAdded(seen.pastTheDepthCeiling),
      'a refused duplicate leaves no Task behind either',
    ).toHaveLength(0)
  })

  // Goes red if a paste on a page that has copied nothing writes anything.
  test('pasting with nothing copied leaves the document as it stood', () => {
    const seen = readingsOfTheSweep()
    expect(
      seen.afterEmptyPaste.taskUids,
      `${PASTE_KEY} on a page that has copied nothing must add no Task`,
    ).toEqual(seen.beforeEmptyPaste.taskUids)
    expect(
      seen.afterEmptyPaste.groups.map((one) => one.id),
      `${PASTE_KEY} on a page that has copied nothing must add no row`,
    ).toEqual(seen.beforeEmptyPaste.groups.map((one) => one.id))
  })

  // Goes red if the application ever asks the host for its clipboard -- the
  // MUST NOT FR-033 states, and the reason table T-008 row `R-9` gives for the
  // route being outward only.
  test('nothing in a copy or a paste reads the clipboard of the host', () => {
    const seen = readingsOfTheSweep()
    expect(
      seen.clipboardReads,
      'the counter was never stood up, so this run proves nothing about FR-033',
    ).toBeGreaterThanOrEqual(0)
    expect(
      seen.clipboardReads,
      'FR-033 (MUST NOT) forbids reading the OS clipboard, and the store is FR-033`s own',
    ).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// FR-048 and table T-029a -- the cursors, each armed and disarmed on its own
// ---------------------------------------------------------------------------

test.describe(`FR-048 and table T-029a, driven by ${DUAL_CURSOR_ENTRANCE} of table T-109`, () => {
  // Goes red if the entrance puts up no pair at all, or puts up half of one --
  // `DC-1` places both dates and `IV-13` admits no half-placed pair.
  test(`${DUAL_CURSOR_ENTRANCE} places both dates of ${DUAL_CURSOR_SETTING}`, () => {
    const seen = readingsOfTheSweep()
    expect(seen.dualCursorWhileDown, 'the run should begin with no pair placed').toBeNull()
    const placed = seen.dualCursorAfterFirstPress as Record<string, unknown> | null
    expect(placed, `${DUAL_CURSOR_ENTRANCE} should place a pair in ${DUAL_CURSOR_SETTING}`).not.toBeNull()
    expect(
      Object.values(placed ?? {}).filter((one) => typeof one === 'string' && one.length > 0),
      'DC-1 of table T-029a puts BOTH dates down on the way in',
    ).toHaveLength(2)
  })

  // Goes red if the pair outlives the mode. FR-048 (MUST) has the entrance that
  // put a cursor up take it down again, and DC-7 (MUST) has leaving the mode
  // clear the placed pair, back to nothing.
  test(`pressing ${DUAL_CURSOR_ENTRANCE} again clears ${DUAL_CURSOR_SETTING}`, () => {
    const seen = readingsOfTheSweep()
    expect(
      seen.dualCursorAfterSecondPress,
      'FR-048 (MUST) and DC-7 of table T-029a take the pair down with the mode',
    ).toBeNull()
  })

  // Goes red if a guide-cursor entrance does not come back to its own way out.
  // FR-048 (MUST) forbids a second entrance for taking one down.
  test('each guide-cursor entrance arms its mode and disarms it on the next press', () => {
    const seen = readingsOfTheSweep()
    expect(
      seen.guideCursorRuns.map((one) => one.icon),
      'table T-109 should still name an entrance for every mode S-66 admits',
    ).toEqual(GUIDE_CURSOR_ENTRANCES.map((one) => one.icon))
    for (const run of seen.guideCursorRuns) {
      expect(
        run.modeAfterFirstPress,
        `${run.icon} of table T-109 should put ${GUIDE_CURSOR_SETTING} into its own mode`,
      ).toBe(run.modeWanted)
      expect(
        run.modeAfterSecondPress,
        `FR-048 (MUST) has ${run.icon} take down what it put up, with no second entrance`,
      ).toBe(GUIDE_CURSOR_NONE)
    }
  })

  // Goes red the moment a guide-cursor entrance takes the measuring pair down
  // with it -- the MUST NOT `DC-4` states and FR-048 repeats, and the reason
  // table T-029 gives for CU-2 and CU-3 being two things.
  test('no guide-cursor entrance disturbs a Dual Cursor that is standing', () => {
    const seen = readingsOfTheSweep()
    expect(seen.guideCursorRuns.length, 'the sweep drove no guide-cursor entrance').toBeGreaterThan(0)
    for (const run of seen.guideCursorRuns) {
      expect(
        run.dualCursorAfterFirstPress,
        `DC-4 of table T-029a (MUST NOT) forbids ${run.icon} clearing the Dual Cursor`,
      ).not.toBeNull()
      expect(
        run.dualCursorAfterSecondPress,
        `and forbids it just as much when ${run.icon} goes back to ${GUIDE_CURSOR_NONE}`,
      ).not.toBeNull()
    }
  })
})
