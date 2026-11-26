// Unit tests: the frame loop refuses a write while a gesture is in flight, and the display entrances write their settings.

/* eslint-disable @typescript-eslint/no-explicit-any -- the fixture edits the template JSON loosely */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import type {
  HumanInput,
  InputModifiers,
  KeyInput,
  PointerButton,
  PointerInput,
  PointerPhase,
} from '../../src/adapter/input-command-translator/input-command-translator'
import type {
  DisplayLanguage,
  ScreenPart,
  ScreenSurface,
  ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import type { Task } from '../../src/entity/document-model/schedule/schedule'
import type {
  BarGeometry,
  Point,
} from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import {
  frameLoop,
  type FrameEnvironment,
  type FrameLoop,
  type ScreenWiring,
} from '../../src/framework/single-html-shell/frame-loop'
import { bare, specTable, unbroken } from '../contract/spec-table'
import { validateDocument } from '../fixtures/grs-document'

const rowOf = (table: string, id: string) => {
  const found = specTable(table).rows.find((row) => row.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

// Why: read by heading rather than by position, so a column moving in the manuscript cannot make this
// file compare the wrong cell.
const ASSIGNMENT_COLUMN = '割当'

const FULLWIDTH_PLUS = '＋'

const sameSpelling = (cell: string): string =>
  cell.replace(/[`*]/g, '').split(FULLWIDTH_PLUS).join('+').replace(/\s+/g, '')

// Why: a cell holds its assignments split by the full-width slash FR-036 puts between them; SK-7 offers two.
const spellingsOf = (row: string): string[] =>
  sameSpelling(rowOf('T-036', row).by[ASSIGNMENT_COLUMN] ?? '').split('\uff0f')

// Spec: BT-4, FR-027
// Why: the calendar, project and settings come from the template; the task groups and Tasks are
// written here so that what is drawn can be named task group by task group.
const TEMPLATE_PATH = join(
  process.cwd(),
  'src',
  'framework',
  'single-html-shell',
  'startup-template.json',
)
const TEMPLATE = JSON.parse(readFileSync(TEMPLATE_PATH, 'utf8')) as Record<string, unknown>

const ALPHA = '11111111-1111-4111-8111-111111111111'
const BETA = '22222222-2222-4222-8222-222222222222'

// Why: statusDate is null so SK-20 drives FR-046's writing half; a document already holding a status
// date would drive the clearing half instead.
function twoTaskGroupDocument(): Document {
  const template = structuredClone(TEMPLATE) as any
  const task = (uid: number, start: string, finish: string, name: string): Task => ({
    uid,
    parentTaskUid: null,
    wbsOrder: uid,
    name,
    start,
    finish,
    milestone: false,
    deadline: null,
    notes: null,
    calendarUid: null,
    actualStart: null,
    stop: null,
    actualFinish: null,
    resume: null,
    resumeValid: null,
    percentComplete: 0,
    fadeInDays: null,
    fadeOutDays: null,
    dependencies: [],
    carry: {},
    carryElements: [],
  })
  const row = (id: string, parentId: string | null, label: string) => ({
    id,
    parentId,
    name: label,
    derivedFromTaskUid: null,
    order: 0,
    treeState: 'auto', editPermission: null,
    color: null,
    minHeightPx: null,
  })
  const draft = {
    '$schema': template['$schema'],
    schemaVersion: template.schemaVersion,
    schedule: {
      project: {
        ...structuredClone(template.schedule.project),
        uidHighWaterMark: 100,
        statusDate: null,
      },
      calendars: structuredClone(template.schedule.calendars),
      tasks: [
        task(1, '2026-04-01T00:00:00', '2026-04-10T00:00:00', 'One'),
        task(2, '2026-05-06T00:00:00', '2026-05-20T00:00:00', 'Two'),
      ],
      resources: [],
      assignments: [],
      taskGroups: [row(ALPHA, null, 'Alpha'), row(BETA, ALPHA, 'Beta')],
      taskGroupMembers: [
        { taskUid: 1, taskGroupId: ALPHA },
        { taskUid: 2, taskGroupId: BETA },
      ],
      taskVisuals: [],
      commentBoxes: [],
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
    },
    documentSettings: structuredClone(template.documentSettings),
    documentStamp: structuredClone(template.documentStamp),
    changeLog: [],
  }
  return draft as unknown as Document
}

const projectOf = (document: Document): any => (document as any).schedule.project
const statusDateOf = (loop: FrameLoop): string | null => projectOf(loop.document()).statusDate

const SCREEN: FrameEnvironment = {
  width: 1000,
  height: 700,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
}

interface Host {
  readonly surface: { showSvg(svg: string): void; showMarqueeOverlaySvg(svg: string): void }
  runAnimationFrames(): void
}

const realRaf = (globalThis as any).requestAnimationFrame

// Why: node has no requestAnimationFrame, so the host is a fake; it only counts pictures and drains
// the queue, and decides nothing about presses or writes.
function host(): Host {
  const drawn: string[] = []
  const waiting: ((time: number) => void)[] = []
  let handle = 0
  ;(globalThis as any).requestAnimationFrame = (callback: (time: number) => void): number => {
    waiting.push(callback)
    return ++handle
  }
  return {
    surface: {
      showMarqueeOverlaySvg: () => undefined,
      showSvg: (svg: string) => {
        drawn.push(svg)
      },
    },
    runAnimationFrames: () => {
      // Why: bounded, so a loop that asks for a frame from inside a frame, which NFR-010 forbids, ends the
      // test instead of hanging it.
      for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) {
        for (const callback of waiting.splice(0, waiting.length)) callback(turn)
      }
      expect(waiting.length, 'the loop kept asking for animation frames with nothing to draw').toBe(
        0,
      )
    },
  }
}

afterEach(() => {
  if (realRaf === undefined) delete (globalThis as any).requestAnimationFrame
  else (globalThis as any).requestAnimationFrame = realRaf
})

const NO_MODIFIERS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }

const key = (which: string, modifiers: Partial<InputModifiers> = {}): KeyInput => ({
  kind: 'key',
  key: which,
  modifiers: { ...NO_MODIFIERS, ...modifiers },
})

const pointer = (
  phase: PointerPhase,
  x: number,
  y: number,
  options: {
    readonly button?: PointerButton
    readonly modifiers?: Partial<InputModifiers>
    readonly clickCount?: number
  } = {},
): PointerInput => ({
  kind: 'pointer',
  phase,
  button: options.button ?? 'left',
  x,
  y,
  modifiers: { ...NO_MODIFIERS, ...(options.modifiers ?? {}) },
  clickCount: options.clickCount ?? 1,
})

// Why: SK-20 is the write driven, because it needs no selection and writes Project.statusDate from
// the keyboard alone, so a refusal cannot be mistaken for nothing selected.
const BASE_DATE_LINE = (): HumanInput => key('D', { ctrl: true, shift: true })
const UNDO = (): HumanInput => key('Z', { ctrl: true })
const REDO = (): HumanInput => key('Y', { ctrl: true })
const ESCAPE = (): HumanInput => key('Esc')

function planCenter(loop: FrameLoop, uid: number): { x: number; y: number } {
  const values = loop.current()
  if (values === null) throw new Error('the loop has run no frame, so it has drawn no bar')
  const drawn = values.geometry.tasks.find((one) => one.taskUid === uid)
  if (drawn === undefined || drawn.plan === null) {
    throw new Error(`Task ${uid} has no plan bar in this frame`)
  }
  if (drawn.plan.form !== 'outline') {
    throw new Error(`Task ${uid} is drawn as a ${drawn.plan.form}, which has no body to grab`)
  }
  const xs = drawn.plan.points.map((onePoint) => onePoint.x)
  const ys = drawn.plan.points.map((onePoint) => onePoint.y)
  return {
    x: (Math.min(...xs) + Math.max(...xs)) / 2,
    y: (Math.min(...ys) + Math.max(...ys)) / 2,
  }
}

const pointsOfBar = (bar: BarGeometry | null): Point[] => {
  if (bar === null) return []
  if (bar.form === 'outline') return [...bar.points]
  return [bar.from, bar.to, ...(bar.head ?? []), ...bar.dots.map((dot) => dot.at)]
}

// Why: a press there is PTD-5, a range selection, only if it misses everything drawn; a premise case
// below asserts that it does.
function emptySpot(loop: FrameLoop): { x: number; y: number } {
  const values = loop.current()
  if (values === null) throw new Error('the loop has run no frame')
  const area = values.regions.taskGroupArea
  return { x: area.x + area.width / 2, y: area.y + area.height - 2 }
}

// Why: a distance, not a plain hit test, because T-023d gives every grab a reach around the ink.
function clearanceFrom(loop: FrameLoop, spot: { x: number; y: number }): number {
  const values = loop.current()
  if (values === null) throw new Error('the loop has run no frame')
  let nearest = Number.POSITIVE_INFINITY
  for (const drawn of values.geometry.tasks) {
    const points = [
      ...pointsOfBar(drawn.plan),
      ...pointsOfBar(drawn.actual),
      ...drawn.dummies.map((one) => one.at),
      ...drawn.fadeHandles,
      ...(drawn.marker === null ? [] : [drawn.marker.center]),
    ]
    for (const point of points) nearest = Math.min(nearest, Math.abs(point.y - spot.y))
    const label = drawn.label
    if (label !== null) {
      const above = label.y - spot.y
      const below = spot.y - (label.y + label.height)
      nearest = Math.min(nearest, Math.max(above, below, 0))
    }
  }
  return nearest
}

// Trap: this says whether Esc has any IN-4 rung left, not that a gesture is over; a standing selection
// is a rung, so use it only where nothing below the drag rung can stand.
const pressIsInFlight = (loop: FrameLoop): boolean => loop.isBrowserDefaultStopped(ESCAPE())

// Why: WS-6 is the only step that replaces the held value, as one reference, so a refusal at WS-2
// leaves the very reference the loop held.
function expectDocumentUntouched(loop: FrameLoop, before: Document, why: string): void {
  expect(statusDateOf(loop), why).toBeNull()
  expect(loop.document(), `${why} -- WS-6 is the only step that replaces the held value`).toBe(
    before,
  )
}

// Spec: SK-20, SK-6, SK-7, T-036, FR-046, PTD-5, T-023d
describe('the premises these cases rest on', () => {
  it('the document is a valid GRS JSON document', () => {
    const report = validateDocument(twoTaskGroupDocument())
    expect(report.errors).toEqual([])
    expect(report.valid).toBe(true)
  })

  it('it carries no base date line, so SK-20 drives the WRITING half of FR-046', () => {
    expect(projectOf(twoTaskGroupDocument()).statusDate).toBeNull()
  })

  it('a plain press is in flight until it ends, which is what IN-4 / IN-4a report', () => {
    // Why: a premise of every case below: before a press IN-4a hands Esc to the browser, after one the
    // drag rung of IN-4 takes it, so the in-flight reading is sound.
    const pane = host()
    const loop = frameLoop(pane.surface, twoTaskGroupDocument(), SCREEN)
    const center = planCenter(loop, 1)

    expect(pressIsInFlight(loop), 'IN-4a: nothing to consume, so Esc goes to the browser').toBe(
      false,
    )
    loop.receiveInput(pointer('down', center.x, center.y))
    expect(pressIsInFlight(loop), 'IN-4 level 2: a drag in flight is something to consume').toBe(
      true,
    )
    pane.runAnimationFrames()
  })

  it('the spot the range-selection case presses on is clear of everything drawn', () => {
    // Why: the point must miss everything or the case drives PTD-3; T-023d gives every grab a reach, so
    // this asks for more than twice the widest of them (S-250 / S-257's 12px).
    const pane = host()
    const loop = frameLoop(pane.surface, twoTaskGroupDocument(), SCREEN)

    expect(clearanceFrom(loop, emptySpot(loop))).toBeGreaterThan(32)
    pane.runAnimationFrames()
  })

  it('the assignments this file drives are the manuscript table T-036 own', () => {
    // Why: the copy of the table is made at read time, so re-deciding a row fails here instead of
    // leaving a stale literal.
    expect(spellingsOf('SK-20')).toContain('Ctrl+Shift+D')
    expect(spellingsOf('SK-6')).toContain('Ctrl+Z')
    expect(spellingsOf('SK-7')).toContain('Ctrl+Y')
    expect(spellingsOf('SK-8')[0]?.startsWith('Esc')).toBe(true)
  })
})

// Spec: UF-48, AG-9, T-035, WS-2, T-067, WS-6, IN-1, IN-1a, IN-4, IN-4a, FR-046
// Why: only the document is read, since receiveInput returns void and a refusal (AG-9a) has nobody to be
// handed to; whether a refused input still owes a frame is decided nowhere.
describe('AG-9 of table T-035 / WS-2 of table T-067 -- a write while a gesture is in flight', () => {
  it('a press on a plan bar is in flight -> SK-20 arrives from the keyboard -> the document is unchanged', () => {
    const pane = host()
    const loop = frameLoop(pane.surface, twoTaskGroupDocument(), SCREEN)
    const center = planCenter(loop, 1)

    loop.receiveInput(pointer('down', center.x, center.y))
    expect(pressIsInFlight(loop)).toBe(true)
    const before = loop.document()

    loop.receiveInput(BASE_DATE_LINE())

    expectDocumentUntouched(loop, before, 'AG-9 (MUST): a write mid-gesture is refused')
    pane.runAnimationFrames()
  })

  it('the press has been released -> the same key arrives -> the write lands', () => {
    // Why: the control: the same write is driven with the button down and after it came up, so the release
    // is what ended the refusal; it is read through AG-9's gate, as Esc's rungs include a selection.
    const pane = host()
    const loop = frameLoop(pane.surface, twoTaskGroupDocument(), SCREEN)
    const center = planCenter(loop, 1)

    loop.receiveInput(pointer('down', center.x, center.y))
    const before = loop.document()
    loop.receiveInput(BASE_DATE_LINE())
    expectDocumentUntouched(loop, before, 'AG-9 (MUST): the press is still down, so the write is refused')

    loop.receiveInput(pointer('up', center.x, center.y))

    loop.receiveInput(BASE_DATE_LINE())

    expect(statusDateOf(loop), 'with no gesture in flight AG-9 refuses nothing').not.toBeNull()
    pane.runAnimationFrames()
  })

  it('the press was interrupted by Esc -> the same key arrives -> the write lands', () => {
    // Why: IN-1 names two ends of a pointer operation; with no surface open the first Esc takes the drag
    // rung, after which AG-9 has no gesture to refuse for.
    const pane = host()
    const loop = frameLoop(pane.surface, twoTaskGroupDocument(), SCREEN)
    const center = planCenter(loop, 1)

    loop.receiveInput(pointer('down', center.x, center.y))
    loop.receiveInput(ESCAPE())
    expect(pressIsInFlight(loop), 'IN-4 level 2: the Esc consumed the drag in flight').toBe(false)

    loop.receiveInput(BASE_DATE_LINE())

    expect(statusDateOf(loop), 'the interrupted gesture is over, so WS-2 lets the write by').not
      .toBeNull()
    pane.runAnimationFrames()
  })

  it('the pointer was lost outside the window -> the same key arrives -> the write lands', () => {
    const pane = host()
    const loop = frameLoop(pane.surface, twoTaskGroupDocument(), SCREEN)
    const center = planCenter(loop, 1)

    loop.receiveInput(pointer('down', center.x, center.y))
    loop.receiveInput(pointer('lost', center.x, center.y))
    expect(pressIsInFlight(loop), 'IN-1a ended the drag as an interruption').toBe(false)

    loop.receiveInput(BASE_DATE_LINE())

    expect(statusDateOf(loop), 'IN-1a exists so that AG-9 stops refusing').not.toBeNull()
    pane.runAnimationFrames()
  })
})

// Spec: T-230, RD-1, RD-2, SK-6, SK-7, UN-13
describe('table T-230 -- undo and redo walk the same seven steps, so WS-2 gates them too', () => {
  // Why: undo and redo reach WS-6 by the same seven steps as a keyboard write, and WS-2 is not among
  // the three things that differ, so it gates them unchanged.

  it('a base date line has been written and a press is in flight -> Ctrl+Z arrives -> the document is unchanged', () => {
    const pane = host()
    const loop = frameLoop(pane.surface, twoTaskGroupDocument(), SCREEN)
    const center = planCenter(loop, 1)

    loop.receiveInput(BASE_DATE_LINE())
    const written = statusDateOf(loop)
    expect(written, 'the premise: there is now something to undo').not.toBeNull()

    loop.receiveInput(pointer('down', center.x, center.y))
    expect(pressIsInFlight(loop)).toBe(true)
    const before = loop.document()

    loop.receiveInput(UNDO())

    expect(statusDateOf(loop), 'AG-9 (MUST): the undo road is refused mid-gesture too').toBe(written)
    expect(loop.document(), 'WS-6 is the only step that replaces the held value').toBe(before)
    pane.runAnimationFrames()
  })

  it('the press has been interrupted -> Ctrl+Z arrives -> the undo lands', () => {
    // Why: the press is ended by Esc, not a release, so nothing the release would settle can add a second
    // undo step and change what Ctrl+Z undoes.
    const pane = host()
    const loop = frameLoop(pane.surface, twoTaskGroupDocument(), SCREEN)
    const center = planCenter(loop, 1)

    loop.receiveInput(BASE_DATE_LINE())
    expect(statusDateOf(loop)).not.toBeNull()

    loop.receiveInput(pointer('down', center.x, center.y))
    loop.receiveInput(ESCAPE())
    expect(pressIsInFlight(loop)).toBe(false)

    loop.receiveInput(UNDO())

    expect(statusDateOf(loop), 'RD-1: the undo put the previous document back').toBeNull()
    pane.runAnimationFrames()
  })

  it('an undo has been made and a press is in flight -> Ctrl+Y arrives -> the document is unchanged', () => {
    const pane = host()
    const loop = frameLoop(pane.surface, twoTaskGroupDocument(), SCREEN)
    const center = planCenter(loop, 1)

    loop.receiveInput(BASE_DATE_LINE())
    loop.receiveInput(UNDO())
    expect(statusDateOf(loop), 'the premise: there is now something to redo').toBeNull()

    loop.receiveInput(pointer('down', center.x, center.y))
    expect(pressIsInFlight(loop)).toBe(true)
    const before = loop.document()

    loop.receiveInput(REDO())

    expectDocumentUntouched(loop, before, 'AG-9 (MUST): the redo road is refused mid-gesture too')
    pane.runAnimationFrames()
  })

  it('the press has been interrupted -> Ctrl+Y arrives -> the redo lands', () => {
    const pane = host()
    const loop = frameLoop(pane.surface, twoTaskGroupDocument(), SCREEN)
    const center = planCenter(loop, 1)

    loop.receiveInput(BASE_DATE_LINE())
    const written = statusDateOf(loop)
    loop.receiveInput(UNDO())
    expect(statusDateOf(loop)).toBeNull()

    loop.receiveInput(pointer('down', center.x, center.y))
    loop.receiveInput(ESCAPE())
    expect(pressIsInFlight(loop)).toBe(false)

    loop.receiveInput(REDO())

    expect(statusDateOf(loop), 'RD-2: the redo put the undone document back').toBe(written)
    pane.runAnimationFrames()
  })
})

// Spec: AG-9, T-027, UN-8, UN-9, PTD-1, PTD-5, FR-028
describe('AG-9 exempts the two gestures table T-027 leaves outside the undo record', () => {
  it('a pan press (PTD-1) is in flight -> SK-20 arrives -> the write lands', () => {
    // Why: PTD-1 takes precedence over what the press landed on, so this press on a plan bar is a pan.
    const pane = host()
    const loop = frameLoop(pane.surface, twoTaskGroupDocument(), SCREEN)
    const center = planCenter(loop, 1)

    loop.receiveInput(pointer('down', center.x, center.y, { modifiers: { ctrl: true } }))

    loop.receiveInput(BASE_DATE_LINE())

    expect(
      statusDateOf(loop),
      'AG-9: a pan does not change the document, so the write must not be refused',
    ).not.toBeNull()
    pane.runAnimationFrames()
  })

  it('a range-selection press (PTD-5) is in flight -> SK-20 arrives -> the write lands', () => {
    const pane = host()
    const loop = frameLoop(pane.surface, twoTaskGroupDocument(), SCREEN)
    const spot = emptySpot(loop)

    loop.receiveInput(pointer('down', spot.x, spot.y))

    loop.receiveInput(BASE_DATE_LINE())

    expect(
      statusDateOf(loop),
      'AG-9: a range selection does not change the document, so the write must not be refused',
    ).not.toBeNull()
    pane.runAnimationFrames()
  })
})

// Why: the entrance cases share this file because the currency is the same: take an entry, then read
// loop.document(), the only readable output of the shell.
// Why: whether these presses leave an undo step (UN-7, UN-13) is not asserted, since no FrameLoop member publishes
// the history to read it from.

const SETTING_KEY = 0
const SETTING_TYPE = 1
const SETTING_DEFAULT = 2
const T_109_SURFACE = 0
const T_109_ENTRANCE = 2
// Why: read by heading; the column stands mid-table, so a position would shift with the next insert.
const T_109_SWITCH = '切り替える設定値'
const T_103_NAME = 0

// Why: by position, not heading, because every heading is Japanese prose kept out of the tree; a guard
// case below pins each table's column count.
/** @purity pure */
const cellAt = (table: string, id: string, at: number): string => {
  const cell = rowOf(table, id).cells[at]
  if (cell === undefined) throw new Error(`table ${table} row ${id} has no cell ${at}`)
  return cell
}

const enumeratedValues = (cell: string): string[] =>
  [...cell.matchAll(/`'([^']+)'`/g)].map((found) => found[1] as string)

const T_202_KEYS: readonly string[] = specTable('T-202').rows.map((row) =>
  bare(row.cells[SETTING_KEY] ?? ''),
)

// Why: taken from S-62 rather than typed, so the boolean rows are found by comparing the manuscript
// with itself.
const BOOLEAN_TYPE = cellAt('T-202', 'S-62', SETTING_TYPE)

const BOOLEAN_KEYS: readonly string[] = specTable('T-202')
  .rows.filter((row) => row.cells[SETTING_TYPE] === BOOLEAN_TYPE)
  .map((row) => bare(row.cells[SETTING_KEY] ?? ''))

const DEFAULT_OF = new Map(
  specTable('T-202').rows.map((row) => [
    bare(row.cells[SETTING_KEY] ?? ''),
    bare(row.cells[SETTING_DEFAULT] ?? ''),
  ]),
)

// Trap: watermarkVisible (S-144) must not join this list: it left T-202 for T-206, and a plain FR-049
// toggle would walk past the password gate FR-020 puts on hiding the watermark.
const EXPECTED_BOOLEAN_KEYS = [
  'isPlanVisible',
  'isActualVisible',
  'isAssigneeVisible',
  'isPercentCompleteVisible',
  'isDependencyVisible',
  'isProgressMarkerVisible',
  'isProgressLineVisible',
  'isDateGridLinesVisible',
  'isGroupGridLinesVisible',
  'isBaselineVisible',
  'isPlanDatesVisible',
  'isTimeOfDayVisible',
]

const T_206_VALUE = 0

// Why: table T-206 has no key column; its value cell spells the key first.
const keyOfRow = (table: string, id: string): string =>
  table === 'T-206'
    ? (/`([A-Za-z]+)`/.exec(cellAt(table, id, T_206_VALUE))?.[1] ?? '')
    : bare(cellAt(table, id, SETTING_KEY))

const GUIDE_VALUES = enumeratedValues(cellAt('T-206', 'S-66', T_206_VALUE))
const THEME_VALUES = enumeratedValues(cellAt('T-206', 'S-72', T_206_VALUE))

const APP_HEADER = bare(cellAt('T-103', 'U-31', T_103_NAME))
const COMMAND_PALETTE = bare(cellAt('T-103', 'U-26', T_103_NAME))


interface Entrance {
  readonly entry: string
  readonly part: string
  readonly table: string
  readonly row: string
  readonly key: string
}

const ENTRANCES: readonly Entrance[] = [
  { entry: 'IC-4', part: APP_HEADER, table: 'T-202', row: 'S-69', key: 'isBaselineVisible' },
  { entry: 'IC-8', part: APP_HEADER, table: 'T-202', row: 'S-227', key: 'isPlanVisible' },
  { entry: 'IC-9', part: APP_HEADER, table: 'T-202', row: 'S-228', key: 'isActualVisible' },
  { entry: 'IC-16', part: APP_HEADER, table: 'T-206', row: 'S-72', key: 'themePreference' },
  {
    entry: 'IC-39',
    part: COMMAND_PALETTE,
    table: 'T-202',
    row: 'S-64',
    key: 'isProgressLineVisible',
  },
  {
    entry: 'IC-40',
    part: COMMAND_PALETTE,
    table: 'T-202',
    row: 'S-63',
    key: 'isProgressMarkerVisible',
  },
  {
    entry: 'IC-42',
    part: COMMAND_PALETTE,
    table: 'T-202',
    row: 'S-67',
    key: 'isDateGridLinesVisible',
  },
  {
    entry: 'IC-43',
    part: COMMAND_PALETTE,
    table: 'T-202',
    row: 'S-68',
    key: 'isGroupGridLinesVisible',
  },
  // Why: the retired IC-46 and IC-49 seats are left empty here, as the manuscript leaves them.
  { entry: 'IC-47', part: COMMAND_PALETTE, table: 'T-206', row: 'S-66', key: 'guideCursorMode' },
  { entry: 'IC-48', part: COMMAND_PALETTE, table: 'T-206', row: 'S-66', key: 'guideCursorMode' },
]

const THEME_ENTRY = 'IC-16'

// Why: kept out of ENTRANCES so the press cases over the ten stay as they were.
const PALETTE_SWITCHES_NOT_PRESSED: readonly Entrance[] = [
  { entry: 'IC-79', part: COMMAND_PALETTE, table: 'T-202', row: 'S-60', key: 'isAssigneeVisible' },
  { entry: 'IC-80', part: COMMAND_PALETTE, table: 'T-202', row: 'S-61', key: 'isPercentCompleteVisible' },
  { entry: 'IC-81', part: COMMAND_PALETTE, table: 'T-202', row: 'S-62', key: 'isDependencyVisible' },
  { entry: 'IC-103', part: COMMAND_PALETTE, table: 'T-202', row: 'S-232', key: 'isPlanDatesVisible' },
]

const NAMED_IN_THE_SWITCH_COLUMN: readonly Entrance[] = [
  ...ENTRANCES.filter((one) => one.entry !== THEME_ENTRY),
  ...PALETTE_SWITCHES_NOT_PRESSED,
]

const BOOLEAN_ENTRANCES = ENTRANCES.filter((one) => BOOLEAN_KEYS.includes(one.key))

// Why: the sentence of IC-47 also spells the 'none' a re-press returns to; the column spells one value.
const GUIDE_ENTRANCES = ENTRANCES.filter((one) => one.row === 'S-66').map((one) => ({
  ...one,
  value: enumeratedValues(rowOf('T-109', one.entry).by[T_109_SWITCH] ?? '')[0] ?? '',
}))

/** @purity pure */
function documentWithSettings(overrides: Record<string, unknown>): Document {
  const draft = twoTaskGroupDocument() as any
  return {
    ...draft,
    documentSettings: { ...draft.documentSettings, ...overrides },
  } as unknown as Document
}

// Why: every display row starts away from its default, so a shell that kept its own switch from the
// default would fail; FR-049's toggles are read off the document.
const CONTRARY: Record<string, unknown> = {
  ...Object.fromEntries(BOOLEAN_KEYS.map((key) => [key, DEFAULT_OF.get(key) !== 'true'])),
  stackDirection: 'down',
  fontSizeStep: 'L',
}

interface Pane {
  readonly wiring: ScreenWiring
  drawAt(part: ScreenPart | null): void
  shown(): ScreenView | null
}

// Why: the side that drew an entry says where it is (T-065), so a case names the entry a press lands
// on here rather than aiming at a pixel.
/** @purity non-pure */
function screenPane(language: DisplayLanguage = 'ja', themePreference: 'light' | 'dark' = 'light'): Pane {
  let part: ScreenPart | null = null
  let last: ScreenView | null = null
  const surface: ScreenSurface = {
    showScreenView: (view) => {
      last = view
    },
    readFieldCommit: () => null,
    readScreenPartAt: () => part,
  }
  return {
    wiring: { surface, language, themePreference },
    drawAt: (next) => {
      part = next
    },
    shown: () => last,
  }
}

// Why: CS-2 settles a gesture on what was drawn at the press, so the surface is told what it drew
// before the button goes down; IN-1 settles the operation on the release.
/** @purity non-pure */
function takeEntry(loop: FrameLoop, pane: Pane, part: string, entry: string): void {
  pane.drawAt({ part, entry, format: null, taskGroupId: null, resourceUid: null, dividerPanel: null, noticeDismissKey: null })
  loop.receiveInput(pointer('down', 500, 300))
  loop.receiveInput(pointer('up', 500, 300))
  pane.drawAt(null)
}

interface Standing {
  readonly frames: Host
  readonly screen: Pane
  readonly loop: FrameLoop
}

/** @purity non-pure */
function standing(overrides: Record<string, unknown>, themePreference: 'light' | 'dark' = 'light'): Standing {
  const frames = host()
  const screen = screenPane('ja', themePreference)
  const loop = frameLoop(frames.surface, documentWithSettings(overrides), SCREEN, screen.wiring)
  frames.runAnimationFrames()
  return { frames, screen, loop }
}

// Why: S-66 is a screen value; the palette's chosen mark is where the screen shows it.
const guideShown = (run: Standing): string => {
  run.frames.runAnimationFrames()
  const commands = (run.screen.shown()?.commandPalette?.groups ?? []).flatMap((group) => group.commands)
  const chosen = GUIDE_ENTRANCES.filter((one) => commands.find((item) => item.icon === one.entry)?.isChosen === true)
  if (chosen.length > 1) throw new Error('FR-048: two guide cursor values are marked at once')
  return chosen[0]?.value ?? (GUIDE_VALUES[0] as string)
}

const guideAt = (run: Standing, value: string): void => {
  const entrance = GUIDE_ENTRANCES.find((one) => one.value === value)
  if (entrance !== undefined) takeEntry(run.loop, run.screen, entrance.part, entrance.entry)
}

const settingsOf = (loop: FrameLoop): any => (loop.document() as any).documentSettings

const displayRowsExcept = (loop: FrameLoop, key: string): Record<string, unknown> => {
  const settings = settingsOf(loop)
  return Object.fromEntries(
    T_202_KEYS.filter((one) => one !== key).map((one) => [one, settings[one]]),
  )
}

const settingsExcept = (loop: FrameLoop, key: string): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(settingsOf(loop) as Record<string, unknown>).filter(([one]) => one !== key),
  )

describe('FR-018 -- holding a zoom entrance down', () => {
  const msOf = (id: string): number => {
    const cell = rowOf('T-206', id).by['既定'] ?? ''
    const found = /(\d+(?:\.\d+)?)\s*ms/.exec(cell)
    if (found === null) throw new Error(`表 T-206 row ${id} states no ms value: ${cell}`)
    return Number(found[1])
  }

  it('表 T-206 holds the wait and the tick, and the wait is the longer of the two', () => {
    expect(msOf('S-172')).toBeGreaterThan(msOf('S-173'))
  })

  it('⛔ the pair is kept OUT of the document, in 表 T-206 and not 表 T-212', () => {
    expect(specTable('T-206').caption).toContain('保存しないもの')
    expect(specTable('T-212').rows.map((row) => row.id)).not.toContain('S-172')
    expect(specTable('T-212').rows.map((row) => row.id)).not.toContain('S-173')
  })

  it('the requirement names the four entrances that repeat, and no others', () => {
    const requirements = unbroken(readFileSync(
      join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
      'utf8',
    ))
    expect(requirements).toContain('`GRS` は、繰り返す入口を')
    expect(requirements).toContain('S-172')
    expect(requirements).toContain('S-173')
    for (const row of ['IC-12', 'IC-13', 'IC-14', 'IC-15']) {
      expect(specTable('T-109').rows.map((one) => one.id)).toContain(row)
    }
  })

  const FR_018_REPEATS =
    '入口を押し続けたとき、`GRS` は、`_assets/tbl-settings.md` の 表 T-206 の `S-172` が定める待ち時間ののち、表 T-206 の `S-173` が定める間隔で倍率を刻み続けること。'
  const FR_018_NOT_ONCE = '`GRS` は、入口を押し続けても 1 度しか刻まない形にしないこと'
  const FR_018_ONLY_FOUR =
    '`GRS` は、繰り返す入口を `_assets/tbl-glossary.md` の 表 T-109 の `IC-12` 〜 `IC-15` に限ること'
  const FT_4_HOLD = '`FR-018` の押し続け（`S-172` / `S-173`）'

  it('the manuscript still says it, word for word: FR-018 and FT-4 of table T-078', () => {
    const requirements = unbroken(
      readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'),
    )
    const design = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '05-07-design.md'), 'utf8'))
    expect(requirements).toContain(FR_018_REPEATS)
    expect(requirements).toContain(FR_018_NOT_ONCE)
    expect(requirements).toContain(FR_018_ONLY_FOUR)
    expect(design).toContain(FT_4_HOLD)
  })

  // Spec: FR-018, FT-4, S-172, S-173
  const holding = async (entry: string, overrides: Record<string, unknown>) => {
    // Why: the import line stays untouched; this is the same vitest instance.
    const { vi } = await import('vitest')
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date', 'performance'] })
    const run = standing(overrides)
    let asked = 0
    const pump = (globalThis as any).requestAnimationFrame as (callback: (time: number) => void) => number
    ;(globalThis as any).requestAnimationFrame = (callback: (time: number) => void): number => {
      asked += 1
      return pump(callback)
    }
    run.screen.drawAt({ part: APP_HEADER, entry, format: null, taskGroupId: null, resourceUid: null, dividerPanel: null, noticeDismissKey: null })
    run.loop.receiveInput(pointer('down', 500, 300))
    run.frames.runAnimationFrames()
    return {
      run,
      asked: () => asked,
      wait: (ms: number) => vi.advanceTimersByTime(ms),
      release: () => {
        run.loop.receiveInput(pointer('up', 500, 300))
        run.screen.drawAt(null)
        run.frames.runAnimationFrames()
      },
      done: () => vi.useRealTimers(),
    }
  }

  it('FR-018 (MUST): holding IC-13 steps after S-172, then at S-173, each step wakes a frame, release stops it', async () => {
    const held = await holding('IC-13', {})
    try {
      const zoom = (): number => settingsOf(held.run.loop).zoomX as number
      const pressed = zoom()
      held.wait(msOf('S-172') - 1)
      held.run.frames.runAnimationFrames()
      expect(zoom(), 'FR-018: a step before the wait of S-172 is over').toBe(pressed)

      const seen = [pressed]
      for (const [index, ms] of [1, msOf('S-173'), msOf('S-173')].entries()) {
        if (index === 2) {
          held.wait(ms - 1)
          held.run.frames.runAnimationFrames()
          expect(zoom(), 'FR-018: a step before the interval of S-173 is over').toBe(seen[seen.length - 1])
        }
        const before = held.asked()
        held.wait(index === 2 ? 1 : ms)
        expect(held.asked() - before, `FT-4: repeat ${index + 1} woke no frame`).toBeGreaterThanOrEqual(1)
        held.run.frames.runAnimationFrames()
        expect(zoom(), `FR-018 (MUST NOT): repeat ${index + 1} did not step`).toBeGreaterThan(seen[seen.length - 1] as number)
        seen.push(zoom())
      }

      held.release()
      const released = zoom()
      held.wait(msOf('S-172') + 3 * msOf('S-173'))
      held.run.frames.runAnimationFrames()
      expect(zoom(), 'FR-018: the zoom kept stepping after the release').toBe(released)
    } finally {
      held.done()
    }
  })

  it('control (FR-018 MUST): holding IC-16, which is not one of IC-12 .. IC-15, does not repeat', async () => {
    const held = await holding('IC-16', CONTRARY)
    try {
      const theme = (): unknown => held.run.loop.themePreference()
      const pressed = theme()
      held.wait(msOf('S-172') + 3 * msOf('S-173'))
      held.run.frames.runAnimationFrames()
      expect(theme(), 'FR-018: an entrance outside IC-12 .. IC-15 repeated').toBe(pressed)
      held.release()
    } finally {
      held.done()
    }
  })
})

// Spec: IMPS-858
describe('the tables these ten entrances are driven by', () => {
  it('the four tables print the columns this file reads by position', () => {
    expect(specTable('T-202').headings.length).toBe(7)
    expect(bare(cellAt('T-202', 'S-62', SETTING_KEY))).toBe('isDependencyVisible')
    expect(specTable('T-206').headings.length).toBe(4)
    expect(keyOfRow('T-206', 'S-72')).toBe('themePreference')
    // Why: a count misses one column inserted while another is dropped, so the positions read are pinned too.
    expect(specTable('T-109').headings.length).toBe(7)
    expect(bare(cellAt('T-109', THEME_ENTRY, T_109_SURFACE))).toBe(APP_HEADER)
    expect(cellAt('T-109', THEME_ENTRY, T_109_ENTRANCE)).toContain('`S-72`')
    expect(specTable('T-109').headings, 'the column this file reads by heading').toContain(T_109_SWITCH)
    expect(specTable('T-103').headings.length).toBe(3)
  })

  it('table T-202 gives exactly eleven of its eighteen rows a boolean type (CR-394 added S-234 displayScale, 多値; CR-677 the dates S-518 / S-519)', () => {
    // Why: the set FR-049 names is read from T-202, so a row added or retyped upstream reaches this file;
    // S-144's leaving is guarded by EXPECTED_BOOLEAN_KEYS.
    expect([...BOOLEAN_KEYS].sort()).toEqual([...EXPECTED_BOOLEAN_KEYS].sort())
    expect(T_202_KEYS.length).toBe(21)
  })

  it('the multi-valued rows spell the values these cases drive', () => {
    expect(GUIDE_VALUES).toEqual(['none', 'crosshair', 'single-vertical'])
    expect(THEME_VALUES).toEqual(['light', 'dark'])
  })

  it('each of the ten stands on the surface table T-109 puts it on', () => {
    expect(APP_HEADER).toBe('App Header')
    expect(COMMAND_PALETTE).toBe('Command Palette')
    expect(ENTRANCES.length, 'IC-46 and IC-49 retired on 2026-09-06').toBe(10)
    for (const one of ENTRANCES) {
      expect(bare(cellAt('T-109', one.entry, T_109_SURFACE)), one.entry).toBe(one.part)
    }
  })

  it('each of the thirteen names, in its 切り替える設定値 cell, the settings row this file pairs it with', () => {
    expect(NAMED_IN_THE_SWITCH_COLUMN.length).toBe(13)
    for (const one of NAMED_IN_THE_SWITCH_COLUMN) {
      const cell = rowOf('T-109', one.entry).by[T_109_SWITCH] ?? ''
      expect(cell, `${one.entry} no longer names ${one.row} in the column`).toMatch(
        new RegExp('^`' + one.row + "`(?:（`'[^']+'`）)?$"),
      )
      expect(keyOfRow(one.table, one.row), one.row).toBe(one.key)
    }
  })

  it('IC-48 names S-66 and the value it writes in the column, not 「同・」 off IC-47', () => {
    expect(rowOf('T-109', 'IC-48').by[T_109_SWITCH]).toBe("`S-66`（`'single-vertical'`）")
    expect(rowOf('T-109', 'IC-47').by[T_109_SWITCH]).toBe("`S-66`（`'crosshair'`）")
  })

  it('IC-16 stays outside the column: its cell is an em dash and its sentence names S-72', () => {
    expect(rowOf('T-109', THEME_ENTRY).by[T_109_SWITCH]).toBe('—')
    expect(cellAt('T-109', THEME_ENTRY, T_109_ENTRANCE)).toContain('`S-72`')
    expect(keyOfRow('T-206', 'S-72')).toBe('themePreference')
  })

  it('the two guide-cursor entrances spell the two values of S-66 that have one', () => {
    // Why: 'none' keeps its place as a value but has no entrance, since FR-048 reaches it by a re-press.
    const [NONE, ...WITH_AN_ENTRANCE] = GUIDE_VALUES
    expect(NONE, 'S-66 still defaults to and still holds `none`').toBe('none')
    expect(GUIDE_ENTRANCES.map((one) => one.value)).toEqual(WITH_AN_ENTRANCE)
  })

  it('⛔ table T-109 holds neither IC-46 nor IC-49, and the seats are left empty', () => {
    const ids = specTable('T-109').rows.map((one) => one.id)
    expect(ids, 'IC-46 was the entrance to `none`, which FR-048 now reaches by a re-press').not.toContain('IC-46')
    expect(ids, 'IC-49 was the entrance to the retired `double-vertical`').not.toContain('IC-49')
    expect(ids, 'the seats are left empty, so the rows around them stayed').toContain('IC-45')
    // Step: read the height the glossary states above table T-109
    const glossary = readFileSync(join(process.cwd(), 'docs', 'spec', '_assets', 'tbl-glossary.md'), 'utf8')
    const stated = /\*\*(\d+) 行ある。\*\*/.exec(glossary.slice(glossary.indexOf('T-109')))
    expect(stated, 'the glossary no longer states the height of table T-109').not.toBeNull()
    expect(ids.length, 'table T-109 stands at the height its preamble states').toBe(Number((stated as RegExpExecArray)[1]))
  })

  it('⛔ FR-048 places no second entrance for putting a cursor away', () => {
    // Why: the whole of T-109 is read, not the guide-cursor group alone, because the MUST covers all
    // three cursors.
    const requirements = unbroken(readFileSync(
      join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
      'utf8',
    ))
    expect(requirements).toContain('閲覧者がカーソル 3 種のどれかを出した入口をもう一度押したとき、`GRS` は、押した入口が出したカーソルを消すこと。')
    expect(requirements).toContain('`GRS` は、カーソルを消すための別の入口を置かないこと。')
    for (const one of specTable('T-109').rows) {
      const cell = one.cells[T_109_ENTRANCE] ?? ''
      expect(
        enumeratedValues(cell)[0],
        `${one.id} would be a second entrance whose whole job is to reach 'none'`,
      ).not.toBe('none')
    }
  })

  it('the contrary document is a valid GRS JSON document', () => {
    const report = validateDocument(documentWithSettings(CONTRARY))
    expect(report.errors).toEqual([])
    expect(report.valid).toBe(true)
  })

  it('the contrary document really does begin away from every default', () => {
    // Why: a premise: a starting value equal to the default would stop telling a document value from one
    // the shell held itself.
    const run = standing(CONTRARY)
    const settings = settingsOf(run.loop)
    for (const key of BOOLEAN_KEYS) {
      expect(String(settings[key]), key).not.toBe(DEFAULT_OF.get(key))
    }
    run.frames.runAnimationFrames()
  })
})

// Spec: FR-048, S-66, CU-3, T-109
describe('IC-47 / IC-48 -- each guide-cursor entrance sets the value table T-109 spells', () => {
  // Why: an entrance sets its value rather than cycling, except that a re-press of the value it set lands
  // on 'none' (FR-048); those two re-presses are the only road to 'none' here.
  const IS_A_REPRESS = (entrance: { value: string }, from: string): boolean =>
    from === entrance.value
  const NONE = GUIDE_VALUES[0] as string

  for (const entrance of GUIDE_ENTRANCES) {
    for (const from of GUIDE_VALUES) {
      const lands = IS_A_REPRESS(entrance, from) ? NONE : entrance.value
      const what = IS_A_REPRESS(entrance, from)
        ? `FR-048 (MUST): a re-press of ${entrance.entry} puts the cursor away`
        : `table T-109 ${entrance.entry}: this entrance sets ${entrance.value}`
      it(`${entrance.entry} puts guideCursorMode at ${lands}, starting from ${from}`, () => {
        const run = standing(CONTRARY)
        guideAt(run, from)
        expect(guideShown(run), 'the premise').toBe(from)

        takeEntry(run.loop, run.screen, entrance.part, entrance.entry)

        expect(guideShown(run), what).toBe(lands)
        expect(settingsOf(run.loop), 'CR-572: S-66 is never written to the document').not.toHaveProperty('guideCursorMode')
      })
    }
  }

  // Spec: DC-9, DC-4
  // Why: the exclusive choice acts only while the Dual Cursor mode is on; a re-press of a guide
  // cursor entrance outside it leaves dualCursor (S-65, CU-2) exactly where it stood.
  it('⛔ a guide cursor re-press outside the Dual Cursor mode leaves the dual cursor alone (DC-9)', () => {
    const run = standing(CONTRARY)
    guideAt(run, 'crosshair')
    const dualOf = (): boolean | undefined =>
      (run.screen.shown()?.commandPalette?.groups ?? []).flatMap((group) => group.commands).find((one) => one.icon === 'IC-45')?.isChosen
    const before = dualOf()

    takeEntry(run.loop, run.screen, COMMAND_PALETTE, 'IC-47')

    expect(guideShown(run), 'the premise: the re-press landed').toBe(NONE)
    expect(dualOf(), 'DC-9: only the Dual Cursor mode is left by a guide cursor entrance').toBe(before)
  })
})

// Spec: FR-049, T-202, FR-039
describe('IC-4 / IC-39 / IC-40 / IC-42 / IC-43 -- the boolean entrances flip the DOCUMENT value', () => {
  // Why: what a press flips is what the document holds, never a value the shell began at; FR-039 makes
  // the saved value the starting value.
  // Why: OP-15 (T-024a) -- IC-4 only toggles S-69 while a pre-change plan (a BaselineTask, ET-18) is held; with none
  // held it asks for the file instead (FR-015), tested elsewhere, so the IC-4 cases stand on a document holding one.
  const HELD_BASELINE = [{ uid: 1, name: 'One', start: '2026-03-25T00:00:00', finish: '2026-04-03T00:00:00', milestone: false }]
  const standingToToggle = (entry: string, overrides: Record<string, unknown>): Standing => {
    if (entry !== 'IC-4') return standing(overrides)
    const draft = documentWithSettings(overrides) as any
    const document = { ...draft, schedule: { ...draft.schedule, baselineTasks: HELD_BASELINE } } as unknown as Document
    const frames = host()
    const screen = screenPane('ja', 'light')
    const loop = frameLoop(frames.surface, document, SCREEN, screen.wiring)
    frames.runAnimationFrames()
    return { frames, screen, loop }
  }
  for (const entrance of BOOLEAN_ENTRANCES) {
    for (const from of [false, true]) {
      it(`${entrance.entry} turns ${entrance.key} to ${!from} when the document holds ${from}`, () => {
        const run = standingToToggle(entrance.entry, { ...CONTRARY, [entrance.key]: from })
        expect(settingsOf(run.loop)[entrance.key], 'the premise').toBe(from)

        takeEntry(run.loop, run.screen, entrance.part, entrance.entry)

        expect(
          settingsOf(run.loop)[entrance.key],
          `table T-109 ${entrance.entry} shows and hides ${entrance.row}, read from the document`,
        ).toBe(!from)
        run.frames.runAnimationFrames()
      })
    }

    it(`${entrance.entry} taken twice leaves ${entrance.key} where it began`, () => {
      const run = standing(CONTRARY)
      const began = settingsOf(run.loop)[entrance.key]

      takeEntry(run.loop, run.screen, entrance.part, entrance.entry)
      takeEntry(run.loop, run.screen, entrance.part, entrance.entry)

      expect(settingsOf(run.loop)[entrance.key], 'a switch is its own inverse').toBe(began)
      run.frames.runAnimationFrames()
    })
  }
})

describe('IC-16 -- the theme entrance flips the screen value and writes nothing (FR-039)', () => {
  // Why: S-72 starts from the browser and a press is written nowhere; its one entrance
  // (table T-109) has to reach either value from the other.
  for (const [index, from] of THEME_VALUES.entries()) {
    const to = THEME_VALUES[1 - index] as 'light' | 'dark'
    it(`takes a screen that started ${from} to ${to}, and leaves the document untouched`, () => {
      const run = standing(CONTRARY, from as 'light' | 'dark')
      expect(run.loop.themePreference(), 'the premise: the start the browser gave').toBe(from)
      const before = settingsOf(run.loop)

      takeEntry(run.loop, run.screen, APP_HEADER, 'IC-16')

      expect(run.loop.themePreference(), 'IC-16 turns S-72').toBe(to)
      expect(settingsOf(run.loop), 'CR-572: S-72 is never written to the document').toBe(before)
      expect(run.loop.hasUnsavedEdits(), 'CR-572: S-72 raises no unsaved mark').toBe(false)
      run.frames.runAnimationFrames()
    })
  }
})

const FONT_SIZE_STEPS: readonly string[] = specTable('T-215').rows.map((row) =>
  bare(row.cells[SETTING_KEY] ?? '').replace('fontSizeStepSizes.', ''),
)
const STACK_VALUES = enumeratedValues(cellAt('T-202', 'S-58', SETTING_TYPE))

describe('IC-99 -- FR-039 (MUST) puts the font size on the Command Palette', () => {
  it('table T-109 places it there, and its 正 names CM-62', () => {
    expect(bare(cellAt('T-109', 'IC-99', T_109_SURFACE))).toBe(COMMAND_PALETTE)
    expect(cellAt('T-109', 'IC-99', T_109_ENTRANCE)).toContain('`S-70`')
    expect(rowOf('T-109', 'IC-99').cells[3] ?? '').toContain('`CM-62`')
  })

  for (const [index, from] of FONT_SIZE_STEPS.entries()) {
    const to = FONT_SIZE_STEPS[(index + 1) % FONT_SIZE_STEPS.length] as string
    it(`takes a document saved at ${from} to ${to}`, () => {
      const run = standing({ ...CONTRARY, fontSizeStep: from })
      expect(settingsOf(run.loop).fontSizeStep, 'the premise').toBe(from)

      takeEntry(run.loop, run.screen, COMMAND_PALETTE, 'IC-99')

      expect(
        settingsOf(run.loop).fontSizeStep,
        'IC-99 moves to the next step table T-215 prints, and wraps at the end',
      ).toBe(to)
      run.frames.runAnimationFrames()
    })
  }
})

// Spec: FR-041, IC-100
describe('IC-100 -- FR-041 (MUST) puts monochrome in the App Header', () => {
  it('table T-109 places it there, and its 正 names CM-64', () => {
    expect(bare(cellAt('T-109', 'IC-100', T_109_SURFACE))).toBe(APP_HEADER)
    expect(cellAt('T-109', 'IC-100', T_109_ENTRANCE)).toContain('`S-74`')
    expect(rowOf('T-109', 'IC-100').cells[3] ?? '').toContain('`CM-64`')
  })

  for (const from of [false, true]) {
    it(`takes a document saved as ${String(from)} to ${String(!from)}`, () => {
      const run = standing({ ...CONTRARY, isThemeMonochrome: from })
      expect(settingsOf(run.loop).isThemeMonochrome, 'the premise').toBe(from)

      takeEntry(run.loop, run.screen, APP_HEADER, 'IC-100')

      expect(settingsOf(run.loop).isThemeMonochrome, 'one entrance, two values').toBe(!from)
      run.frames.runAnimationFrames()
    })
  }
})

describe('IC-101 -- FR-003 (MUST) puts the stacking direction on the palette', () => {
  it('table T-109 places it there, and its 正 names CM-56', () => {
    expect(bare(cellAt('T-109', 'IC-101', T_109_SURFACE))).toBe(COMMAND_PALETTE)
    expect(cellAt('T-109', 'IC-101', T_109_ENTRANCE)).toContain('`S-58`')
    expect(rowOf('T-109', 'IC-101').cells[3] ?? '').toContain('`CM-56`')
  })

  for (const [index, from] of STACK_VALUES.entries()) {
    const to = STACK_VALUES[1 - index] as string
    it(`takes a document saved as ${from} to ${to}`, () => {
      const run = standing({ ...CONTRARY, stackDirection: from })
      expect(settingsOf(run.loop).stackDirection, 'the premise').toBe(from)

      takeEntry(run.loop, run.screen, COMMAND_PALETTE, 'IC-101')

      expect(settingsOf(run.loop).stackDirection, 'one entrance, two values').toBe(to)
      run.frames.runAnimationFrames()
    })
  }
})

// Spec: FR-049, S-227, S-228
describe('IC-8 / IC-9 -- each entrance flips its own row and leaves the other', () => {
  const spelled: readonly (readonly [string, 'isPlanVisible' | 'isActualVisible'])[] = [
    ['IC-8', 'isPlanVisible'],
    ['IC-9', 'isActualVisible'],
  ]

  for (const [entry, key] of spelled) {
    for (const from of [true, false]) {
      it(`${entry} takes ${key} from ${String(from)} to ${String(!from)}`, () => {
        const other = key === 'isPlanVisible' ? 'isActualVisible' : 'isPlanVisible'
        for (const otherFrom of [true, false]) {
          const run = standing({ ...CONTRARY, [key]: from, [other]: otherFrom })
          expect(settingsOf(run.loop)[key], 'the premise').toBe(from)

          takeEntry(run.loop, run.screen, APP_HEADER, entry)

          expect(
            settingsOf(run.loop)[key],
            `table T-109 ${entry} flips its own row`,
          ).toBe(!from)
          expect(
            settingsOf(run.loop)[other],
            `FR-049 (MUST NOT): ${entry} may not decide ${other}`,
          ).toBe(otherFrom)
          expect(
            validateDocument(run.loop.document()).valid,
            'the document the press left is still one the schema admits',
          ).toBe(true)
          run.frames.runAnimationFrames()
        }
      })
    }
  }
})

describe('FR-049 -- both halves may be hidden (the ruling of 2026-09-07)', () => {
  it('IC-8 pressed while the actual is already hidden leaves neither drawn', () => {
    const run = standing({ ...CONTRARY, isPlanVisible: true, isActualVisible: false })

    takeEntry(run.loop, run.screen, APP_HEADER, 'IC-8')

    expect(settingsOf(run.loop).isPlanVisible).toBe(false)
    expect(settingsOf(run.loop).isActualVisible).toBe(false)
    expect(
      validateDocument(run.loop.document()).valid,
      'the document with neither half drawn is still one the schema admits',
    ).toBe(true)
    run.frames.runAnimationFrames()
  })
})

describe('FR-049 (MUST) -- only a boolean row is a toggle, so nothing else in T-202 moves', () => {
  // Why: the row each entrance names is left out and every other T-202 row is compared, so IC-16 is
  // compared on every row, as S-72 is not a T-202 row.
  for (const entrance of ENTRANCES) {
    const spared = entrance.table === 'T-202' ? entrance.key : ''
    it(`${entrance.entry} moves no row of table T-202 other than ${entrance.row}`, () => {
      const run = standing(CONTRARY)
      const before = displayRowsExcept(run.loop, spared)

      takeEntry(run.loop, run.screen, entrance.part, entrance.entry)

      expect(
        displayRowsExcept(run.loop, spared),
        `FR-049 (MUST): ${entrance.entry} is an entrance to ${entrance.row} alone`,
      ).toEqual(before)
      run.frames.runAnimationFrames()
    })
  }
})

describe('an entrance moves its own key and no other key of the presentation group', () => {
  // Why: the same MUST asked of the whole presentation group (DR-3), since FR-041 forbids saving a
  // derived color, so IC-16 may move S-72 and nothing beside it.
  for (const entrance of ENTRANCES) {
    it(`${entrance.entry} leaves every settings key but ${entrance.key} where it stood`, () => {
      const run = standing(CONTRARY)
      const before = settingsExcept(run.loop, entrance.key)

      takeEntry(run.loop, run.screen, entrance.part, entrance.entry)

      expect(
        settingsExcept(run.loop, entrance.key),
        `${entrance.entry} wrote a key that is not ${entrance.key}`,
      ).toEqual(before)
      run.frames.runAnimationFrames()
    })
  }
})
