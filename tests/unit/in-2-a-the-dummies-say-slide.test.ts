// T-028 IN-2 -- the actual dummies now say the same thing the bar and actual
// ends say: a horizontal-resize cursor, not the arrow.
//
// The unit driven is UF-48 `single-html-shell` (CP-25 of table T-062), whose
// `frame-loop.ts` answers IN-2 through the sixth argument of `frameLoop`
// (`showPointerShape`). `tests/unit/in-2-pointer-shape.test.ts` already
// covers the five places IN-2 named before this round; this file is the one
// addition the ruling below asks for and does not restate that file's cases.
//
// Chapter 9 does not admit `Unit` as a TEST_LEVEL, so this case has no node
// in the specification. Table T-218 of Chapter 7 gives it its place: TS-6,
// tests/unit/.
//
// ---------------------------------------------------------------------------
// WHY THIS FILE EXISTS
// ---------------------------------------------------------------------------
//
// T-028 IN-2 named five places until 2026-09-10, and GR-9 / GR-17 / GR-18 --
// the three actual-dummy marks FR-043 draws on a Task that has not started --
// were not among them. The user's ruling of 2026-09-10, verbatim 「実績タスクを触れるならマウスカーソルの形状をスライドに変更しろ」,
// added a sixth clause that names them:
//
//   **掴めるものの上で形が変わらないと、選べるのかどうかを押してみるまで確かめられない**）。⭐⭐ **実績のダミー（表 T-023d の `GR-9` / `GR-17` / `GR-18`）の上も、横方向の伸縮の合図とすること（MUST）
//
// -- read out of the manuscript at read time below rather than typed a
// second place, so a further wording change moves this file's premise and
// not just its intent.
//
// `frame-loop.ts`'s `POINTER_SHAPE_BY_GRAB` gave all three `null` before this
// round, on the ground that IN-2 named no dummy -- the ground the ruling
// above removed. MEASURED BEFORE THE FIX (this file, red): the three cases
// in the second `describe` below failed, each dummy answering `null` while
// the bar's own plan end answered a shape.
//
// ---------------------------------------------------------------------------
// THE ROWS THESE CASES REST ON
// ---------------------------------------------------------------------------
//   T-028  IN-2   the sixth clause quoted verbatim above, and the existing
//                 clause it now shares a meaning with: the bar and actual
//                 ends' own horizontal-resize signal
//   T-023d GR-9 / GR-17   FR-043's two dummies on a Task not started
//   T-023d GR-18          the one dummy on a milestone not started -- that
//                 row's own text says it stands on GR-9's own place
//   FR-043        draws the dummies only while nothing is started
//                 (`placed.actualX === null` in `schedule-geometry.ts`)

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import type {
  HumanInput,
  InputModifiers,
  PointerInput,
} from '../../src/adapter/input-command-translator/input-command-translator'
import type { ScreenSurface } from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import type { Task, TaskVisual } from '../../src/entity/document-model/schedule/schedule'
import type { Point } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import {
  frameLoop,
  type FrameEnvironment,
  type FrameLoop,
  type PointerShape,
  type ScreenWiring,
} from '../../src/framework/single-html-shell/frame-loop'
import { specTable } from '../contract/spec-table'

/* eslint-disable @typescript-eslint/no-explicit-any */

// ---------------------------------------------------------------------------
// What the manuscript says, read at read time rather than copied a second
// place -- the same discipline `in-2-pointer-shape.test.ts` uses.
// ---------------------------------------------------------------------------

/**
 * The trailing slice of T-028 IN-2's own text that ends at its sixth
 * clause's `(MUST)` marker -- held verbatim so check 39
 * (`check-must-clause-coverage.py`) ties this clause to a test, and asserted
 * against the manuscript below so a further edit to IN-2 fails this file
 * instead of leaving a stale quote.
 */
const IN_2_DUMMY_MUST = '**掴めるものの上で形が変わらないと、選べるのかどうかを押してみるまで確かめられない**）。⭐⭐ **実績のダミー（表 T-023d の `GR-9` / `GR-17` / `GR-18`）の上も、横方向の伸縮の合図とすること（MUST）'

const IN_2_ROW = specTable('T-028').rows.find((row) => row.id === 'IN-2')
if (IN_2_ROW === undefined) throw new Error('table T-028 has no row IN-2')

it('T-028 IN-2 -- the manuscript still carries the dummy clause quoted above', () => {
  expect(IN_2_ROW.cells.join(' '), IN_2_DUMMY_MUST).toContain(IN_2_DUMMY_MUST)
})

// ---------------------------------------------------------------------------
// The document these cases drive: one bar Task and one milestone, NEITHER
// started, so FR-043 draws GR-9 / GR-17 on the bar and GR-18 on the
// milestone (`dummiesOf` in `schedule-geometry.ts` returns nothing once
// `placed.actualX` is set).
// ---------------------------------------------------------------------------

const TEMPLATE_PATH = join(
  process.cwd(),
  'src',
  'framework',
  'single-html-shell',
  'startup-template.json',
)
const TEMPLATE = JSON.parse(readFileSync(TEMPLATE_PATH, 'utf8')) as Record<string, unknown>

const BAR_ROW = '11111111-1111-4111-8111-111111111111'
const STONE_ROW = '22222222-2222-4222-8222-222222222222'

/** Not started: no actual fields at all, so `dummiesOf` draws GR-9 / GR-17. */
const BAR_UID = 1
const BAR_START = '2026-04-06'
const BAR_FINISH = '2026-04-24'

/** Not started: a milestone with no actual, so `dummiesOf` draws GR-18. */
const STONE_UID = 2
const STONE_DAY = '2026-04-15'

/** 1 day is this many px -- wide enough that every probe below is unambiguous. */
const PX_PER_DAY_AT_1X = 20

const task = (over: Partial<Task> & { readonly uid: number }): Task =>
  ({
    wbsParentUid: null,
    wbsOrder: over.uid,
    name: null,
    start: null,
    finish: null,
    milestone: false,
    deadline: null,
    notes: null,
    calendarUid: null,
    actualStart: null,
    actualDuration: null,
    actualFinish: null,
    resume: null,
    resumeValid: null,
    percentComplete: 0,
    fadeInDays: null,
    fadeOutDays: null,
    dependencies: [],
    carry: {},
    carryElements: [],
    ...over,
  }) as unknown as Task

/** SH-5 of table T-012 -- a milestone, drawn with the default glyph. */
const milestoneVisual = (taskUid: number): TaskVisual =>
  ({
    taskUid,
    nameAnchor: null,
    nameAlign: null,
    shapeKind: 'milestone',
    milestoneGlyph: 'diamond',
    fillColor: null,
    strokeColor: null,
    lineWeight: null,
  }) as unknown as TaskVisual

const rowOfSchedule = (id: string, order: number) => ({
  id,
  parentId: null,
  label: `row ${order}`,
  derivedFromTaskUid: null,
  order,
  isCollapsed: false,
  isHidden: false,
  color: null,
  height: null,
})

function fixtureDocument(): Document {
  const template = structuredClone(TEMPLATE) as any
  const draft = {
    schemaVersion: template.schemaVersion,
    schedule: {
      project: {
        ...structuredClone(template.schedule.project),
        uidHighWaterMark: 100,
        statusDate: null,
      },
      calendars: structuredClone(template.schedule.calendars),
      tasks: [
        task({ uid: BAR_UID, start: BAR_START, finish: BAR_FINISH }),
        task({ uid: STONE_UID, start: STONE_DAY, finish: STONE_DAY, milestone: true }),
      ],
      resources: [],
      assignments: [],
      taskGroups: [rowOfSchedule(BAR_ROW, 0), rowOfSchedule(STONE_ROW, 1)],
      taskGroupMembers: [
        { taskUid: BAR_UID, groupId: BAR_ROW, stackOrder: null },
        { taskUid: STONE_UID, groupId: STONE_ROW, stackOrder: null },
      ],
      taskVisuals: [milestoneVisual(STONE_UID)],
      commentBoxes: [],
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
    },
    documentSettings: {
      ...structuredClone(template.documentSettings),
      pxPerDayAt1x: PX_PER_DAY_AT_1X,
    },
    documentStamp: structuredClone(template.documentStamp),
    changeLog: [],
  }
  return draft as unknown as Document
}

// ---------------------------------------------------------------------------
// The host UF-48 is given -- the same fake `in-2-pointer-shape.test.ts` uses,
// trimmed to what this file needs: nothing here arms a figure or reads the
// screen surface, so the fake answers no screen part at all.
// ---------------------------------------------------------------------------

const SCREEN: FrameEnvironment = {
  width: 1200,
  height: 700,
  appHeaderHeight: 0,
  scrollbarThickness: 0,
}

const realRaf = (globalThis as any).requestAnimationFrame

interface Host {
  readonly surface: { showSvg(svg: string): void }
  runAnimationFrames(): void
}

function host(): Host {
  const waiting: ((time: number) => void)[] = []
  let handle = 0
  ;(globalThis as any).requestAnimationFrame = (callback: (time: number) => void): number => {
    waiting.push(callback)
    return ++handle
  }
  return {
    surface: { showSvg: () => undefined },
    runAnimationFrames: () => {
      for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) {
        for (const callback of waiting.splice(0, waiting.length)) callback(turn)
      }
      expect(
        waiting.length,
        'the loop kept asking for animation frames with nothing to draw',
      ).toBe(0)
    },
  }
}

/** IF-9's stand-in. Nothing here arms through the Command Palette, so every
 * point answers no screen part at all. */
function screenPane(): ScreenWiring {
  const surface: ScreenSurface = {
    showScreenView: () => undefined,
    readDialogueInput: () => null,
    readFieldCommit: () => null,
    hasUnsettledTextEntry: () => false,
    readScreenPartAt: () => null,
  }
  return { surface, language: 'en' }
}

afterEach(() => {
  if (realRaf === undefined) delete (globalThis as any).requestAnimationFrame
  else (globalThis as any).requestAnimationFrame = realRaf
})

const NO_MODIFIERS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }

const move = (at: Point): PointerInput => ({
  kind: 'pointer',
  phase: 'move',
  button: 'left',
  x: at.x,
  y: at.y,
  modifiers: NO_MODIFIERS,
  clickCount: 1,
})

interface Stage {
  readonly loop: FrameLoop
  send(input: HumanInput): void
  readonly shown: readonly (PointerShape | null)[]
  latest(): PointerShape | null
}

function stage(): Stage {
  const pen = host()
  const shown: (PointerShape | null)[] = []
  const loop = frameLoop(
    pen.surface as any,
    fixtureDocument(),
    SCREEN,
    screenPane(),
    undefined,
    (shape) => {
      shown.push(shape)
    },
  )
  const send = (input: HumanInput): void => {
    loop.receiveInput(input)
    pen.runAnimationFrames()
  }
  // The first frame is owed by the loop being made, so drain it before any
  // case reads `current()`.
  pen.runAnimationFrames()
  return {
    loop,
    send,
    shown,
    latest: () => {
      if (shown.length === 0) {
        throw new Error('the loop was never asked what shape the pointer takes')
      }
      return shown[shown.length - 1] as PointerShape | null
    },
  }
}

const frameOf = (loop: FrameLoop) => {
  const values = loop.current()
  if (values === null) throw new Error('the loop has run no frame')
  return values
}

const drawnTask = (loop: FrameLoop, uid: number) => {
  const found = frameOf(loop).geometry.tasks.find((one) => one.taskUid === uid)
  if (found === undefined) throw new Error(`Task ${uid} is not in this frame`)
  return found
}

/**
 * A point inside FR-043's one drawn mark that the row named lands on.
 *
 * ⭐ NOT `DummyGeometry.at`. Since 2026-09-09 `item-hit-area.ts` no longer
 * gives GR-9 / GR-17 the day-column box S-93 used to: `isOnTheDrawnMarkHalf`
 * reads GR-9 and GR-17's SHARED `ink` rectangle (both carry the very same
 * object out of `dummiesOf` in `schedule-geometry.ts`) and splits it at its
 * own horizontal middle, left half GR-9 and right half GR-17 -- so GR-17's
 * `at` point (which stands a working day further along, past that shared
 * ink entirely) no longer falls on GR-17's own hit region. GR-18 keeps the
 * whole ink (`isOnTheDrawnMark`), so any point inside it answers.
 */
function dummyProbe(loop: FrameLoop, taskUid: number, grab: 'GR-9' | 'GR-17' | 'GR-18'): Point {
  const found = drawnTask(loop, taskUid).dummies.find((one) => one.grab === grab)
  if (found === undefined) throw new Error(`Task ${taskUid} drew no ${grab} dummy`)
  const ink = found.ink
  const y = ink.y + ink.height / 2
  if (grab === 'GR-9') return { x: ink.x, y }
  if (grab === 'GR-17') return { x: ink.x + ink.width - 1, y }
  return { x: ink.x + ink.width / 2, y }
}

/** The plan bar's left end -- GR-3, kept as this file's control for the SAME
 * meaning the ruling gives the dummies. */
function planStart(loop: FrameLoop): Point {
  const plan = drawnTask(loop, BAR_UID).plan
  if (plan === null) throw new Error("the bar Task's plan bar was not drawn")
  const points: readonly Point[] = plan.form === 'outline' ? plan.points : [plan.from, plan.to]
  const xs = points.map((one) => one.x)
  const ys = points.map((one) => one.y)
  return { x: Math.min(...xs), y: (Math.min(...ys) + Math.max(...ys)) / 2 }
}

/** The plan bar's own middle -- GR-12, the OTHER meaning IN-2 gives, kept as
 * this file's control for what the dummy shape must NOT equal. */
function barBody(loop: FrameLoop): Point {
  const plan = drawnTask(loop, BAR_UID).plan
  if (plan === null) throw new Error("the bar Task's plan bar was not drawn")
  const points: readonly Point[] = plan.form === 'outline' ? plan.points : [plan.from, plan.to]
  const xs = points.map((one) => one.x)
  const ys = points.map((one) => one.y)
  const x0 = Math.min(...xs)
  const x1 = Math.max(...xs)
  return { x: (x0 + x1) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 }
}

/** The place nothing is hit -- the far corner of the `Row Area`, past every
 * bar, so a plain press there answers PD-5's own meaning. */
function emptyCanvas(loop: FrameLoop): Point {
  const area = frameOf(loop).regions.rowArea
  return { x: area.x + area.width - 4, y: area.y + area.height - 4 }
}

function shapeAt(built: Stage, at: Point): PointerShape | null {
  built.send(move(at))
  return built.latest()
}

// ===========================================================================
// The premises these cases stand on
// ===========================================================================

describe('the fixture draws what FR-043 says it should', () => {
  it('draws the not-started bar with exactly GR-9 and GR-17, and no actual bar', () => {
    const built = stage()
    const bar = drawnTask(built.loop, BAR_UID)
    expect(
      bar.actual,
      'the bar Task must NOT be started, or its dummies would not draw',
    ).toBeNull()
    expect(bar.dummies.map((one) => one.grab).sort()).toEqual(['GR-17', 'GR-9'])
  })

  it('draws the not-started milestone with exactly GR-18, and no actual figure', () => {
    const built = stage()
    const stone = drawnTask(built.loop, STONE_UID)
    expect(stone.dummies.map((one) => one.grab)).toEqual(['GR-18'])
  })

  it('keeps the body probe clear of the plan start, so the two controls differ', () => {
    const built = stage()
    expect(barBody(built.loop).x).not.toBe(planStart(built.loop).x)
  })
})

// ===========================================================================
// T-028 IN-2's new clause: the dummies say the same horizontal-resize
// meaning as the bar's own plan end -- not `null`, and not GR-12's meaning.
// ===========================================================================

describe('T-028 IN-2 -- the dummies (GR-9 / GR-17 / GR-18) say the same thing the ends do', () => {
  it('answers a shape on all three dummies (MUST) -- none of them is null', () => {
    const built = stage()
    expect(shapeAt(built, dummyProbe(built.loop, BAR_UID, 'GR-9')), IN_2_DUMMY_MUST).not.toBeNull()
    expect(shapeAt(built, dummyProbe(built.loop, BAR_UID, 'GR-17')), IN_2_DUMMY_MUST).not.toBeNull()
    expect(
      shapeAt(built, dummyProbe(built.loop, STONE_UID, 'GR-18')),
      IN_2_DUMMY_MUST,
    ).not.toBeNull()
  })

  it('answers the SAME shape on a dummy as on the bar\'s own plan end (GR-3)', () => {
    const built = stage()
    const end = shapeAt(built, planStart(built.loop))
    expect(shapeAt(built, dummyProbe(built.loop, BAR_UID, 'GR-9'))).toBe(end)
    expect(shapeAt(built, dummyProbe(built.loop, BAR_UID, 'GR-17'))).toBe(end)
    expect(shapeAt(built, dummyProbe(built.loop, STONE_UID, 'GR-18'))).toBe(end)
  })

  it('answers something OTHER than the grabbable body meaning (GR-12)', () => {
    const built = stage()
    const body = shapeAt(built, barBody(built.loop))
    expect(shapeAt(built, dummyProbe(built.loop, BAR_UID, 'GR-9'))).not.toBe(body)
    expect(shapeAt(built, dummyProbe(built.loop, BAR_UID, 'GR-17'))).not.toBe(body)
    expect(shapeAt(built, dummyProbe(built.loop, STONE_UID, 'GR-18'))).not.toBe(body)
  })

  it('answers something OTHER than the empty-canvas meaning (PD-5)', () => {
    const built = stage()
    const empty = shapeAt(built, emptyCanvas(built.loop))
    expect(shapeAt(built, dummyProbe(built.loop, BAR_UID, 'GR-9'))).not.toBe(empty)
    expect(shapeAt(built, dummyProbe(built.loop, BAR_UID, 'GR-17'))).not.toBe(empty)
    expect(shapeAt(built, dummyProbe(built.loop, STONE_UID, 'GR-18'))).not.toBe(empty)
  })

  it('answers the same shape every time the pointer returns to a dummy', () => {
    const built = stage()
    const first = shapeAt(built, dummyProbe(built.loop, BAR_UID, 'GR-9'))
    shapeAt(built, emptyCanvas(built.loop))
    expect(shapeAt(built, dummyProbe(built.loop, BAR_UID, 'GR-9'))).toBe(first)
  })
})
