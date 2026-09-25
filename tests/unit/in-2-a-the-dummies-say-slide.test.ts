// T-028 IN-2 -- the pointer shape on the actual dummies GA-5 / GA-6 / GA-17.

// see IN-2, GA-5, GA-6, GA-17, GA-16, FR-043, CR-388

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
import type {
  BarGeometry,
  Point,
} from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import {
  frameLoop,
  type FrameEnvironment,
  type FrameLoop,
  type PointerShape,
  type ScreenWiring,
} from '../../src/framework/single-html-shell/frame-loop'
import { specTable } from '../contract/spec-table'

// see IN-2
const IN_2_GRAB_MARGIN_MUST = '掴み代の上は `FR-106` の 表 T-269 の形'

// see T-266
const GA_5_POINTER = '箱の矢印 ← 黒（`PK-1`）'
const GA_6_POINTER = '箱の矢印 → 黒（`PK-1`）'

// see T-266
const GA_17_POINTER = '円 ●（`PK-5`）'

const IN_2_ROW = specTable('T-028').rows.find((row) => row.id === 'IN-2')
if (IN_2_ROW === undefined) throw new Error('table T-028 has no row IN-2')

it('T-028 IN-2 -- the manuscript still sends every grab margin to table T-269', () => {
  expect(IN_2_ROW.cells.join(' '), IN_2_GRAB_MARGIN_MUST).toContain(IN_2_GRAB_MARGIN_MUST)
})

it('T-266 -- the manuscript still gives the two rectangle dummy ends their filled arrows, and the milestone dummy its disc', () => {
  const requirements = readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8')
  expect(requirements, GA_5_POINTER).toContain(GA_5_POINTER)
  expect(requirements, GA_6_POINTER).toContain(GA_6_POINTER)
  expect(requirements, GA_17_POINTER).toContain(GA_17_POINTER)
})

// see BT-4, FR-043
const TEMPLATE_PATH = join(
  process.cwd(),
  'src',
  'framework',
  'single-html-shell',
  'startup-template.json',
)

interface Template {
  readonly schemaVersion: unknown
  readonly schedule: { readonly project: object; readonly calendars: unknown }
  readonly documentSettings: object
  readonly documentStamp: unknown
}

const TEMPLATE = JSON.parse(readFileSync(TEMPLATE_PATH, 'utf8')) as Template

const BAR_ROW = '11111111-1111-4111-8111-111111111111'
const STONE_ROW = '22222222-2222-4222-8222-222222222222'
const STARTED_STONE_ROW = '33333333-3333-4333-8333-333333333333'
const STARTED_BAR_ROW = '44444444-4444-4444-8444-444444444444'

const BAR_UID = 1
const BAR_START = '2026-04-06'
const BAR_FINISH = '2026-04-24'

// see GA-3, GA-4
const STARTED_BAR_UID = 4
const STARTED_BAR_FINISH = '2026-04-20'
const STARTED_BAR_ACTUAL_START = '2026-04-08'
const STARTED_BAR_ACTUAL_STOP = '2026-04-14'

const STONE_UID = 2
const STONE_DAY = '2026-04-15'

// see GA-16
const STARTED_STONE_UID = 3

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
    ...over,
  }) as unknown as Task

// see SH-5
const milestoneVisual = (taskUid: number): TaskVisual =>
  ({
    taskUid,
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
  treeState: 'auto', color: null,
  height: null,
})

function fixtureDocument(): Document {
  const template = structuredClone(TEMPLATE)
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
        task({
          uid: STARTED_STONE_UID,
          start: STONE_DAY,
          finish: STONE_DAY,
          milestone: true,
          actualStart: STONE_DAY,
          stop: STONE_DAY,
        }),
        task({
          uid: STARTED_BAR_UID,
          start: BAR_START,
          finish: STARTED_BAR_FINISH,
          actualStart: STARTED_BAR_ACTUAL_START,
          stop: STARTED_BAR_ACTUAL_STOP,
        }),
      ],
      resources: [],
      assignments: [],
      taskGroups: [
        rowOfSchedule(BAR_ROW, 0),
        rowOfSchedule(STONE_ROW, 1),
        rowOfSchedule(STARTED_STONE_ROW, 2),
        rowOfSchedule(STARTED_BAR_ROW, 3),
      ],
      taskGroupMembers: [
        { taskUid: BAR_UID, groupId: BAR_ROW, stackOrder: null },
        { taskUid: STONE_UID, groupId: STONE_ROW, stackOrder: null },
        { taskUid: STARTED_STONE_UID, groupId: STARTED_STONE_ROW, stackOrder: null },
        { taskUid: STARTED_BAR_UID, groupId: STARTED_BAR_ROW, stackOrder: null },
      ],
      taskVisuals: [milestoneVisual(STONE_UID), milestoneVisual(STARTED_STONE_UID)],
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

const SCREEN: FrameEnvironment = {
  width: 1200,
  height: 700,
  appHeaderHeight: 0,
  scrollbarThickness: 0,
}

type AnimationFrame = (callback: (time: number) => void) => number
const GLOBAL = globalThis as unknown as { requestAnimationFrame?: AnimationFrame }
const realRaf = GLOBAL.requestAnimationFrame

interface Host {
  readonly surface: { showSvg(svg: string): void }
  runAnimationFrames(): void
}

function host(): Host {
  const waiting: ((time: number) => void)[] = []
  let handle = 0
  GLOBAL.requestAnimationFrame = (callback: (time: number) => void): number => {
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

// see IF-9
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
  if (realRaf === undefined) delete GLOBAL.requestAnimationFrame
  else GLOBAL.requestAnimationFrame = realRaf
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
    pen.surface as never,
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

const pointsOf = (bar: BarGeometry): readonly Point[] =>
  bar.form === 'outline' ? bar.points : [bar.from, bar.to]

// see GA-5, GA-6, GA-17
function dummyProbe(loop: FrameLoop, taskUid: number, grab: 'GA-5' | 'GA-6' | 'GA-17'): Point {
  const found = drawnTask(loop, taskUid).dummies.find((one) => one.grab === grab)
  if (found === undefined) throw new Error(`Task ${taskUid} drew no ${grab} dummy`)
  const ink = found.ink
  const y = ink.y + ink.height / 2
  // WHY: T-023d's closing rule gives the dummy only strictly right of the plan start, where its ink begins;
  // the ink's own left edge is that boundary and belongs to GA-1, so probe inside the left half instead.
  if (grab === 'GA-5') return { x: ink.x + ink.width / 4, y }
  if (grab === 'GA-6') return { x: ink.x + ink.width - 1, y }
  return { x: ink.x + ink.width / 2, y }
}

// see GA-1
function planStart(loop: FrameLoop): Point {
  const plan = drawnTask(loop, BAR_UID).plan
  if (plan === null) throw new Error("the bar Task's plan bar was not drawn")
  const points = pointsOf(plan)
  const xs = points.map((one) => one.x)
  const ys = points.map((one) => one.y)
  return { x: Math.min(...xs), y: (Math.min(...ys) + Math.max(...ys)) / 2 }
}

// see GA-1, DM-1
// WHY: on a Task with no actual the dummy's mark begins on the plan's own left edge
// (`DM-1`), so only the STARTED bar has a plan start `GA-1` can answer at.
function startedPlanStart(loop: FrameLoop): Point {
  const plan = drawnTask(loop, STARTED_BAR_UID).plan
  if (plan === null) throw new Error("the started bar Task's plan bar was not drawn")
  const points = pointsOf(plan)
  const xs = points.map((one) => one.x)
  const ys = points.map((one) => one.y)
  return { x: Math.min(...xs), y: (Math.min(...ys) + Math.max(...ys)) / 2 }
}

// see GA-9
function barBody(loop: FrameLoop): Point {
  const plan = drawnTask(loop, BAR_UID).plan
  if (plan === null) throw new Error("the bar Task's plan bar was not drawn")
  const points = pointsOf(plan)
  const xs = points.map((one) => one.x)
  const ys = points.map((one) => one.y)
  const x0 = Math.min(...xs)
  const x1 = Math.max(...xs)
  return { x: (x0 + x1) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 }
}

// see GA-3, GA-4, S-257, S-260
function actualEnd(loop: FrameLoop, grab: 'GA-3' | 'GA-4'): Point {
  const actual = drawnTask(loop, STARTED_BAR_UID).actual
  if (actual === null) throw new Error("the started bar Task's actual bar was not drawn")
  const points = pointsOf(actual)
  const xs = points.map((one) => one.x)
  const ys = points.map((one) => one.y)
  const y = (Math.min(...ys) + Math.max(...ys)) / 2
  // WHY: not the end pixel itself -- the grab is inside the end and the marker touches it from outside.
  return grab === 'GA-3' ? { x: Math.min(...xs) + 1, y } : { x: Math.max(...xs) - 1, y }
}

// see GA-16
function startedMilestoneFigure(loop: FrameLoop): Point {
  const plan = drawnTask(loop, STARTED_STONE_UID).plan
  if (plan === null) throw new Error("the started milestone's figure was not drawn")
  const points = pointsOf(plan)
  const xs = points.map((one) => one.x)
  const ys = points.map((one) => one.y)
  return {
    x: (Math.min(...xs) + Math.max(...xs)) / 2,
    y: (Math.min(...ys) + Math.max(...ys)) / 2,
  }
}

// see PTD-5
function emptyCanvas(loop: FrameLoop): Point {
  const area = frameOf(loop).regions.rowArea
  return { x: area.x + area.width - 4, y: area.y + area.height - 4 }
}

function shapeAt(built: Stage, at: Point): PointerShape | null {
  built.send(move(at))
  return built.latest()
}

describe('the fixture draws what FR-043 says it should', () => {
  it('draws the not-started bar with exactly GA-5 and GA-6, and no actual bar', () => {
    const built = stage()
    const bar = drawnTask(built.loop, BAR_UID)
    expect(
      bar.actual,
      'the bar Task must NOT be started, or its dummies would not draw',
    ).toBeNull()
    expect(bar.dummies.map((one) => one.grab).sort()).toEqual(['GA-5', 'GA-6'])
  })

  it('draws the not-started milestone with exactly GA-17, and no actual figure', () => {
    const built = stage()
    const stone = drawnTask(built.loop, STONE_UID)
    expect(stone.dummies.map((one) => one.grab)).toEqual(['GA-17'])
  })

  it('draws the started milestone with a figure and no dummy', () => {
    const built = stage()
    const stone = drawnTask(built.loop, STARTED_STONE_UID)
    expect(stone.plan).not.toBeNull()
    expect(stone.dummies).toHaveLength(0)
  })

  it('keeps the body probe clear of the plan start, so the two controls differ', () => {
    const built = stage()
    expect(barBody(built.loop).x).not.toBe(planStart(built.loop).x)
  })

  it('draws the started bar with an actual bar and no dummy, its actual wide enough for two probes', () => {
    const built = stage()
    const started = drawnTask(built.loop, STARTED_BAR_UID)
    expect(started.actual).not.toBeNull()
    expect(started.dummies).toHaveLength(0)
    expect(actualEnd(built.loop, 'GA-4').x).toBeGreaterThan(actualEnd(built.loop, 'GA-3').x)
  })
})

describe('T-028 IN-2 -- the task dummies (GA-5 / GA-6) say what the actual ends say (T-269)', () => {
  it('answers a shape on both task dummies (MUST) -- neither is null', () => {
    const built = stage()
    expect(shapeAt(built, dummyProbe(built.loop, BAR_UID, 'GA-5')), IN_2_GRAB_MARGIN_MUST).not.toBeNull()
    expect(shapeAt(built, dummyProbe(built.loop, BAR_UID, 'GA-6')), IN_2_GRAB_MARGIN_MUST).not.toBeNull()
  })

  it('PK-1 black ←: answers the SAME shape on the start dummy (GA-5) as on an actual start (GA-3)', () => {
    const built = stage()
    const start = shapeAt(built, actualEnd(built.loop, 'GA-3'))
    expect(start).not.toBeNull()
    expect(shapeAt(built, dummyProbe(built.loop, BAR_UID, 'GA-5')), GA_5_POINTER).toBe(start)
  })

  it('PK-1 black →: answers the SAME shape on the end dummy (GA-6) as on an actual end (GA-4)', () => {
    const built = stage()
    const end = shapeAt(built, actualEnd(built.loop, 'GA-4'))
    expect(end).not.toBeNull()
    expect(shapeAt(built, dummyProbe(built.loop, BAR_UID, 'GA-6')), GA_6_POINTER).toBe(end)
  })

  it('PK-1 black ← / →: the left arrow on GA-5 and the right arrow on GA-6 are two different shapes', () => {
    const built = stage()
    const left = shapeAt(built, dummyProbe(built.loop, BAR_UID, 'GA-5'))
    expect(shapeAt(built, dummyProbe(built.loop, BAR_UID, 'GA-6')), `${GA_5_POINTER} / ${GA_6_POINTER}`).not.toBe(left)
  })

  it("PK-1 white / black: a filled dummy arrow is not the hollow arrow of the bar's plan start (GA-1)", () => {
    const built = stage()
    const planEnd = shapeAt(built, startedPlanStart(built.loop))
    expect(planEnd).not.toBeNull()
    expect(shapeAt(built, dummyProbe(built.loop, BAR_UID, 'GA-5')), IN_2_GRAB_MARGIN_MUST).not.toBe(planEnd)
    expect(shapeAt(built, dummyProbe(built.loop, BAR_UID, 'GA-6')), IN_2_GRAB_MARGIN_MUST).not.toBe(planEnd)
  })

  it('answers something OTHER than the grabbable body meaning (GA-9)', () => {
    const built = stage()
    const body = shapeAt(built, barBody(built.loop))
    expect(shapeAt(built, dummyProbe(built.loop, BAR_UID, 'GA-5'))).not.toBe(body)
    expect(shapeAt(built, dummyProbe(built.loop, BAR_UID, 'GA-6'))).not.toBe(body)
  })

  it('answers something OTHER than the empty-canvas meaning (PTD-5)', () => {
    const built = stage()
    const empty = shapeAt(built, emptyCanvas(built.loop))
    expect(shapeAt(built, dummyProbe(built.loop, BAR_UID, 'GA-5'))).not.toBe(empty)
    expect(shapeAt(built, dummyProbe(built.loop, BAR_UID, 'GA-6'))).not.toBe(empty)
  })

  it('answers the same shape every time the pointer returns to a dummy', () => {
    const built = stage()
    const first = shapeAt(built, dummyProbe(built.loop, BAR_UID, 'GA-5'))
    shapeAt(built, emptyCanvas(built.loop))
    expect(shapeAt(built, dummyProbe(built.loop, BAR_UID, 'GA-5'))).toBe(first)
  })
})

describe('T-028 IN-2 -- the milestone dummy (GA-17) says what the GA-16 figure says', () => {
  it('answers a shape on GA-17 (MUST) -- it is not null', () => {
    const built = stage()
    expect(
      shapeAt(built, dummyProbe(built.loop, STONE_UID, 'GA-17')),
      GA_17_POINTER,
    ).not.toBeNull()
  })

  it('answers the SAME shape on GA-17 as on a started milestone figure (GA-16)', () => {
    const built = stage()
    const figure = shapeAt(built, startedMilestoneFigure(built.loop))
    expect(shapeAt(built, dummyProbe(built.loop, STONE_UID, 'GA-17')), GA_17_POINTER).toBe(
      figure,
    )
  })

  it("answers something OTHER than the bar's own plan end (GA-1)", () => {
    const built = stage()
    const end = shapeAt(built, startedPlanStart(built.loop))
    expect(shapeAt(built, dummyProbe(built.loop, STONE_UID, 'GA-17')), GA_17_POINTER).not.toBe(
      end,
    )
  })

  it('answers something OTHER than the empty-canvas meaning (PTD-5)', () => {
    const built = stage()
    const empty = shapeAt(built, emptyCanvas(built.loop))
    expect(shapeAt(built, dummyProbe(built.loop, STONE_UID, 'GA-17'))).not.toBe(empty)
  })
})
