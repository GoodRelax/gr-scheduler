// Copying, pasting and the two cursors (FR-033, SK-4/SK-5, FR-048, table T-029a).

import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { specTable, type SpecTable } from '../contract/spec-table'
import { CLEARING_UP_MS, launchReferenceBrowser, readSettledDrawnSvg, screenOf } from './live-app'
import { rowOf } from './sws-case'

const T025: SpecTable = specTable('T-025')
const T036: SpecTable = specTable('T-036')
const T109: SpecTable = specTable('T-109')
const T202: SpecTable = specTable('T-202')
const T211: SpecTable = specTable('T-211')

const BASE_SCREEN = screenOf(rowOf(T025, 'MC-6'))

// WHY: by position, not heading -- these headings are Japanese (rule 03
// section 5 keeps this tree ASCII), so a changed column fails loudly here.
/** @purity pure */
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

// WHY: table T-036 holds three cells after the row ID -- what the key does,
// the assignment, and the entrance the assignment moves.
const T036_COLUMNS = 3
const T036_ASSIGNMENT = 1

// WHY: table T-036 writes the modifier as Ctrl (what a keyboard prints on
// itself); the driver's own name for the same key is Control.
/** @purity pure */
function asDriven(spelling: string): string {
  return spelling
    .replace(/\s*\+\s*/g, '+')
    .split('+')
    .map((part) => (part === 'Ctrl' ? 'Control' : part))
    .join('+')
}

/** @purity pure */
function keyOf(id: string): string {
  const said = cellOf(T036, id, T036_ASSIGNMENT, T036_COLUMNS)
  const found = /`([^`]+)`/.exec(said)
  if (found === null) {
    throw new Error(`table T-036 row ${id} names no key this file can read: ${JSON.stringify(said)}`)
  }
  return asDriven(found[1] ?? '')
}

// see SK-4
const COPY_KEY = keyOf('SK-4')
// see SK-5
const PASTE_KEY = keyOf('SK-5')

// WHY: table T-109 holds five cells after the row ID -- the surface, the
// group, what the entrance is for, the requirement it answers to, and a note.
const T109_COLUMNS = 5
const T109_PURPOSE = 2
const T109_SOURCE = 3

// WHY: anchored so FR-04 cannot be found by asking for FR-048, and a
// three-digit neighbour cannot answer for a two-digit one.
/** @purity pure */
function entrancesServing(requirement: string): readonly string[] {
  const wanted = new RegExp(`${requirement}(?![0-9])`)
  return T109.rows
    .filter((row) => wanted.test(row.cells[T109_SOURCE] ?? ''))
    .map((row) => row.id)
}

/** @purity pure */
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

// see FR-065
const AGENT_API_ENTRANCE = theEntranceServing('FR-065')

// see FR-082
const DUAL_CURSOR_ENTRANCE = theEntranceServing('FR-082')

// WHY: table T-202 holds four cells after the row ID -- the key, the type,
// the default, and what it means.
const T202_COLUMNS = 4
const T202_KEY = 0
const T202_TYPE = 1

/** @purity pure */
function settingKeyOf(id: string): string {
  const found = /`([A-Za-z][A-Za-z0-9]*)`/.exec(cellOf(T202, id, T202_KEY, T202_COLUMNS))
  if (found === null) throw new Error(`table T-202 row ${id} names no key this file can read`)
  return found[1] ?? ''
}

// see S-65
const DUAL_CURSOR_SETTING = settingKeyOf('S-65')
// see S-66
const GUIDE_CURSOR_SETTING = settingKeyOf('S-66')

// WHY: read out of the type cell so a value retired there leaves this file
// without being edited.
/** @purity pure */
const GUIDE_CURSOR_VALUES: readonly string[] = (() => {
  const said = cellOf(T202, 'S-66', T202_TYPE, T202_COLUMNS)
  const found = [...said.matchAll(/`'([a-z-]+)'`/g)].map((one) => one[1] ?? '')
  if (found.length < 2) {
    throw new Error(`table T-202 row S-66 names ${found.length} modes, and this file needs two`)
  }
  return found
})()

const GUIDE_CURSOR_NONE = GUIDE_CURSOR_VALUES[0] ?? ''

// WHY: not written out here -- table T-109's purpose column is the one home
// of the pairing, so a retired entrance drops out without this file changing.
/** @purity pure */
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

// WHY: table T-211 holds five cells after the row ID -- the name, the
// value, the floor, the ceiling, and a note.
const T211_COLUMNS = 5
const T211_VALUE = 1

// see S-125
const MAX_GROUP_DEPTH = (() => {
  const said = cellOf(T211, 'S-125', T211_VALUE, T211_COLUMNS)
  const found = /-?\d+/.exec(said.replace(/`/g, ''))
  const value = Number(found?.[0] ?? '')
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`table T-211 row S-125 states no depth this file can read: ${said}`)
  }
  return value
})()

// WHY: the deliverable, not sources or the dev server -- NFR-004 row CN-1
// has dist/ hold one .html file, which tests/nfr/ assembles and judges.
const SHIPPED_BUILD = join(process.cwd(), 'dist', 'index.html')

// WHY: not decided by the specification, but the same two markings the
// neighbouring System files lean on, and no others.
const ROW_PANEL = '[data-role="Row Title Panel"]'
const CANVAS_PART = '[data-role="Schedule Canvas"]'

interface DocGroup {
  readonly id: string
  readonly parentId: string | null
  readonly label: string | null
}

interface DocTask {
  readonly uid: number
  readonly wbsParentUid: number | null
}

interface DocShot {
  readonly taskUids: readonly number[]
  readonly tasks: readonly DocTask[]
  readonly names: Readonly<Record<string, string>>
  readonly groups: readonly DocGroup[]
  readonly members: ReadonlyArray<{ readonly taskUid: number; readonly groupId: string }>
  readonly dualCursor: unknown
  readonly guideCursorMode: string
}

interface RowPaste {
  readonly sourceId: string
  readonly chosenIds: readonly string[]
  readonly before: DocShot
  readonly after: DocShot
}

interface Measured {
  readonly pickedTaskUid: number
  readonly pickedTaskRowId: string
  readonly beforeTaskPaste: DocShot
  readonly afterTaskPaste: DocShot
  readonly intoChosenRow: RowPaste
  readonly atTopLevel: RowPaste
  readonly pastTheDepthCeiling: RowPaste
  readonly depthThatWasRefused: number
  readonly clipboardReads: number
  readonly dualCursorWhileDown: unknown
  readonly dualCursorAfterFirstPress: unknown
  readonly dualCursorAfterSecondPress: unknown
  readonly guideCursorRuns: ReadonlyArray<{
    readonly icon: string
    readonly modeWanted: string
    readonly modeAfterFirstPress: string
    readonly modeAfterSecondPress: string
    readonly dualCursorAfterFirstPress: unknown
    readonly dualCursorAfterSecondPress: unknown
  }>
  readonly beforeEmptyPaste: DocShot
  readonly afterEmptyPaste: DocShot
}

let browser: Browser | null = null
let measured: Measured | null = null
let sweepFailed: Error | null = null

test.beforeAll(async () => {
  // WHY: the sweep opens two contexts, loads the deliverable twice and
  // drives hundreds of pointer presses -- see CLEARING_UP_MS in ./live-app.
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

// WHY: a counter in front of navigator.clipboard is the only way to judge
// FR-033's MUST NOT -- a working paste alone does not prove the store is the app's own.
/** @purity non-pure */
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
      // WHY: a browser that refuses this leaves the count at zero, and the
      // case that reads it says so.
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

// WHY: a real pointer, not element.click() -- the shell builds its input
// from pointer events, and a synthetic click has reached nothing here before.
/** @purity non-pure */
async function pressAt(page: Page, at: { x: number; y: number }): Promise<void> {
  await page.mouse.move(at.x, at.y)
  await page.mouse.down()
  await page.mouse.up()
}

/** @purity non-pure */
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

// see AM-3
/** @purity semi-pure-b */
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

// see AM-5
/** @purity semi-pure-b */
async function readSelection(page: Page): Promise<{ kind: string; uid?: number }[]> {
  return page.evaluate(() => {
    const api = (window as unknown as { grSchedulerAgentApi: { readSelection(): unknown } })
      .grSchedulerAgentApi
    return (api.readSelection() as { items: { kind: string; uid?: number }[] }).items
  })
}

/** @purity semi-pure-b */
async function drawnRowIds(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('[data-depth]')).map(
      (row) => row.getAttribute('data-group-id') ?? '',
    ),
  )
}

/** @purity semi-pure-b */
async function chosenRowIds(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('[data-depth][data-selected="true"]')).map(
      (row) => row.getAttribute('data-group-id') ?? '',
    ),
  )
}

// WHY: the pointer goes on the row first, then the point is chosen -- HF-6
// hides a row's own controls (GR-20's grab strip too) until hovered.
/** @purity non-pure */
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

// WHY: there is no handle to aim at, so the only honest way to pick one is
// to press and read AM-5 back; every point is checked to be on the drawing.
/** @purity non-pure */
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

/** @purity pure */
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

/** @purity pure */
function spanOf(groups: readonly DocGroup[], id: string): number {
  const children = groups.filter((one) => one.parentId === id)
  return children.length === 0 ? 1 : 1 + Math.max(...children.map((one) => spanOf(groups, one.id)))
}

/** @purity non-pure */
async function sweep(): Promise<Measured> {
  const { context, page } = await openTheApp()
  try {
    const shot = (): Promise<DocShot> => readShot(page, DUAL_CURSOR_SETTING, GUIDE_CURSOR_SETTING)

    const atStart = await shot()
    // WHY: only a Task with no WBS descendants will do, so DU-1 has exactly
    // one thing to carry and this case can count it.
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
    // WHY: read after the walk, not before -- picking a Task takes many
    // presses, so the paste is measured against the state the walk left.
    const beforeTaskPaste = await shot()
    const pickedTaskRowId =
      beforeTaskPaste.members.find((one) => one.taskUid === pickedTaskUid)?.groupId ?? ''
    await page.keyboard.press(COPY_KEY)
    await page.waitForTimeout(400)
    await page.keyboard.press(PASTE_KEY)
    await page.waitForTimeout(1500)
    const afterTaskPaste = await shot()

    // WHY: this run comes first of the three row runs -- only a drawn row
    // can be pressed, and the two runs below add rows that could hide a deep one.
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

    // WHY: a row with no children of its own, so its landing cannot be the
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

    // WHY: SL-4's letting-go half -- the chosen row is pressed again with
    // the extending key, which takes it back out of the set.
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

    const dualCursorWhileDown = (await shot()).dualCursor
    await pressEntrance(page, DUAL_CURSOR_ENTRANCE)
    const dualCursorAfterFirstPress = (await shot()).dualCursor
    await pressEntrance(page, DUAL_CURSOR_ENTRANCE)
    const dualCursorAfterSecondPress = (await shot()).dualCursor

    const guideCursorRuns: Measured['guideCursorRuns'][number][] = []
    for (const armed of GUIDE_CURSOR_ENTRANCES) {
      // WHY: a Dual Cursor stands throughout -- DC-4 and FR-048 (MUST NOT)
      // forbid one entrance taking two cursors down.
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

    // WHY: its own visit -- "nothing has been copied" is a state only a
    // page that has never been asked to copy can be in.
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

/** @purity pure */
function readingsOfTheSweep(): Measured {
  if (sweepFailed !== null) throw sweepFailed
  if (measured === null) throw new Error('the sweep recorded nothing')
  return measured
}

/** @purity pure */
function rowsAdded(run: RowPaste): readonly DocGroup[] {
  return run.after.groups.filter((one) => !run.before.groups.some((was) => was.id === one.id))
}

/** @purity pure */
function tasksAdded(run: RowPaste): readonly number[] {
  return run.after.taskUids.filter((one) => !run.before.taskUids.includes(one))
}

test.describe(`FR-033, driven by ${COPY_KEY} and ${PASTE_KEY} of table T-036`, () => {
  // WHY: goes red if a copy of a Task lands as no Task, or as more than the
  // one subtree picked out of the drawing.
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

  // WHY: goes red if the duplicate reuses the UID FR-033 (MUST NOT)
  // reserves -- the failure that makes a redo hand out one UID twice.
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

  // WHY: goes red if the duplicate lands off the row it was copied from --
  // table T-050 row CD-2 leans on this to know what a deletion reaches.
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

  // WHY: goes red if a copied row lands anywhere but under the chosen row.
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

  // WHY: goes red if a row arrives without the Tasks standing on it --
  // DU-2's whole point, and why FR-033 does not apply DU-1's same-row rule.
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

  // WHY: goes red if a paste with no row chosen buries the new row somewhere.
  test('a copied row pasted with no row chosen lands at the top level', () => {
    const seen = readingsOfTheSweep()
    const added = rowsAdded(seen.atTopLevel)
    expect(added.length, `${PASTE_KEY} with nothing chosen should add rows`).toBeGreaterThan(0)
    const roots = added.filter((one) => !added.some((kin) => kin.id === one.parentId))
    expect(roots, 'one subtree comes in, so one row comes in at the top').toHaveLength(1)
    expect(roots[0]?.parentId, 'FR-033 (MUST) puts it at the top level when nothing is chosen').toBeNull()
  })

  // WHY: goes red if a paste is taken past S-125's depth -- the MUST NOT
  // FR-033 states, with FR-004 owning the ceiling.
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

  // WHY: goes red if a paste on a page that has copied nothing writes anything.
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

  // WHY: goes red if the application ever asks the host for its clipboard
  // -- the MUST NOT FR-033 states, and why table T-008 row CHN-9's route is outward only.
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

test.describe(`FR-048 and table T-029a, driven by ${DUAL_CURSOR_ENTRANCE} of table T-109`, () => {
  // WHY: goes red if the entrance puts up no pair, or half of one -- DC-1
  // places both dates and IV-13 admits no half-placed pair.
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

  // WHY: goes red if the pair outlives the mode -- FR-048 has the entrance
  // that put it up take it down, and DC-7 clears it on leaving the mode.
  test(`pressing ${DUAL_CURSOR_ENTRANCE} again clears ${DUAL_CURSOR_SETTING}`, () => {
    const seen = readingsOfTheSweep()
    expect(
      seen.dualCursorAfterSecondPress,
      'FR-048 (MUST) and DC-7 of table T-029a take the pair down with the mode',
    ).toBeNull()
  })

  // WHY: goes red if a guide-cursor entrance does not come back to its own
  // way out -- FR-048 forbids a second entrance for taking one down.
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

  // WHY: goes red if a guide-cursor entrance takes the measuring pair down
  // with it -- the MUST NOT DC-4 and FR-048 both state.
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
