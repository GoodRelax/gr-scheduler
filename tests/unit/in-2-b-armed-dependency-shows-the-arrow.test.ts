// T-028 IN-2, CR-383: pointer shape while armed for a dependency line (AR-4).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import type {
  HumanInput,
  InputModifiers,
  PointerButton,
  PointerInput,
  PointerPhase,
} from '../../src/adapter/input-command-translator/input-command-translator'
import type {
  DisplayLanguage,
  IconId,
  ScreenPart,
  ScreenSurface,
} from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import type { Task, TaskVisual } from '../../src/entity/document-model/schedule/schedule'
import type {
  BarGeometry,
  Point,
  TaskGeometry,
} from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import type { ScreenRect } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import {
  frameLoop,
  type FrameEnvironment,
  type FrameLoop,
  type PointerShape,
  type ScreenWiring,
} from '../../src/framework/single-html-shell/frame-loop'
import { specTable } from '../contract/spec-table'

// see IN-2

const IN_2_DEPENDENCY_ARROW_MUST =
  '依存線を構えているあいだ（表 T-023b の `AR-4`）は 表 T-269 の形を当てず、作図の合図とすること（MUST）'

const IN_2_ARMED_EMPTY_MUST = '構えているときは作図の合図'

const rowOf = (table: string, id: string) => {
  const found = specTable(table).rows.find((row) => row.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

it('T-028 IN-2 -- the manuscript still carries the dependency-arm clause quoted above', () => {
  const cells = rowOf('T-028', 'IN-2').cells.join(' ')
  expect(cells, IN_2_DEPENDENCY_ARROW_MUST).toContain(IN_2_DEPENDENCY_ARROW_MUST)
  expect(cells, IN_2_ARMED_EMPTY_MUST).toContain(IN_2_ARMED_EMPTY_MUST)
})

// see AR-4
const DEPENDENCY_ARMING_ENTRY: IconId = ((): string => {
  const found = specTable('T-109').rows.find((one) => (one.by['構え'] ?? '').includes('AR-4'))
  if (found === undefined) throw new Error('table T-109 has no entry whose 構え is AR-4')
  return found.id
})()

// see CR-382, CR-383

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
const DUMMY_BAR_ROW = '33333333-3333-4333-8333-333333333333'
const DUMMY_STONE_ROW = '44444444-4444-4444-8444-444444444444'

const BAR_UID = 1
const BAR_START = '2026-04-06'
const BAR_FINISH = '2026-04-24'
const BAR_ACTUAL_START = '2026-04-08'
const BAR_ACTUAL_STOP = '2026-04-10'

const STONE_UID = 2
const STONE_DAY = '2026-04-15'

const DUMMY_BAR_UID = 3
const DUMMY_BAR_START = '2026-04-06'
const DUMMY_BAR_FINISH = '2026-04-24'

const DUMMY_STONE_UID = 4
const DUMMY_STONE_DAY = '2026-04-28'

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
        task({
          uid: BAR_UID,
          start: BAR_START,
          finish: BAR_FINISH,
          actualStart: BAR_ACTUAL_START,
          stop: BAR_ACTUAL_STOP,
          percentComplete: 40,
        }),
        task({
          uid: STONE_UID,
          start: STONE_DAY,
          finish: STONE_DAY,
          milestone: true,
          actualStart: STONE_DAY,
          stop: STONE_DAY,
        }),
        task({ uid: DUMMY_BAR_UID, start: DUMMY_BAR_START, finish: DUMMY_BAR_FINISH }),
        task({
          uid: DUMMY_STONE_UID,
          start: DUMMY_STONE_DAY,
          finish: DUMMY_STONE_DAY,
          milestone: true,
        }),
      ],
      resources: [],
      assignments: [],
      taskGroups: [
        rowOfSchedule(BAR_ROW, 0),
        rowOfSchedule(STONE_ROW, 1),
        rowOfSchedule(DUMMY_BAR_ROW, 2),
        rowOfSchedule(DUMMY_STONE_ROW, 3),
      ],
      taskGroupMembers: [
        { taskUid: BAR_UID, groupId: BAR_ROW, stackOrder: null },
        { taskUid: STONE_UID, groupId: STONE_ROW, stackOrder: null },
        { taskUid: DUMMY_BAR_UID, groupId: DUMMY_BAR_ROW, stackOrder: null },
        { taskUid: DUMMY_STONE_UID, groupId: DUMMY_STONE_ROW, stackOrder: null },
      ],
      taskVisuals: [milestoneVisual(STONE_UID), milestoneVisual(DUMMY_STONE_UID)],
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

const PALETTE_BOX: ScreenRect = { x: 8, y: SCREEN.height - 56, width: 120, height: 48 }

const inside = (box: ScreenRect, at: Point): boolean =>
  at.x >= box.x && at.x < box.x + box.width && at.y >= box.y && at.y < box.y + box.height

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
      expect(waiting.length, 'the loop kept asking for animation frames with nothing to draw').toBe(
        0,
      )
    },
  }
}

function screenPane(language: DisplayLanguage = 'en'): ScreenWiring {
  const surface: ScreenSurface = {
    showScreenView: () => undefined,
    readDialogueInput: () => null,
    readFieldCommit: () => null,
    hasUnsettledTextEntry: () => false,
    readScreenPartAt: (x, y): ScreenPart | null => {
      if (!inside(PALETTE_BOX, { x, y })) return null
      return {
        part: 'Command Palette',
        entry: DEPENDENCY_ARMING_ENTRY,
        format: null,
        rowGroupId: null,
        resourceUid: null,
        dividerPanel: null,
        noticeDismissKey: null,
      }
    },
  }
  return { surface, language }
}

afterEach(() => {
  if (realRaf === undefined) delete (globalThis as any).requestAnimationFrame
  else (globalThis as any).requestAnimationFrame = realRaf
})

const NO_MODIFIERS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }

interface HowPressed {
  readonly button?: PointerButton
  readonly modifiers?: Partial<InputModifiers>
}

const pointer = (phase: PointerPhase, at: Point, how: HowPressed = {}): PointerInput => ({
  kind: 'pointer',
  phase,
  button: how.button ?? 'left',
  x: at.x,
  y: at.y,
  modifiers: { ...NO_MODIFIERS, ...(how.modifiers ?? {}) },
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

const drawnTask = (loop: FrameLoop, uid: number): TaskGeometry => {
  const found = frameOf(loop).geometry.tasks.find((one) => one.taskUid === uid)
  if (found === undefined) throw new Error(`Task ${uid} is not in this frame`)
  return found
}

function boxOf(bar: BarGeometry | null, what: string): ScreenRect {
  if (bar === null) throw new Error(`${what} was not drawn`)
  const points: readonly Point[] = bar.form === 'outline' ? bar.points : [bar.from, bar.to]
  if (points.length === 0) throw new Error(`${what} was drawn with no points`)
  const xs = points.map((one) => one.x)
  const ys = points.map((one) => one.y)
  const x = Math.min(...xs)
  const y = Math.min(...ys)
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y }
}

const midY = (box: ScreenRect): number => box.y + box.height / 2
const centre = (box: ScreenRect): Point => ({ x: box.x + box.width / 2, y: midY(box) })

function emptyCanvas(loop: FrameLoop): Point {
  const area = frameOf(loop).regions.rowArea
  return { x: area.x + area.width - 4, y: area.y + area.height - 4 }
}

function onEndpoint(loop: FrameLoop, x: number, y: number): Point {
  const area = frameOf(loop).regions.rowArea
  return { x: Math.min(x, area.x + area.width - 1), y }
}

function planEnds(loop: FrameLoop): readonly Point[] {
  const box = boxOf(drawnTask(loop, BAR_UID).plan, "the bar Task's plan bar")
  return [onEndpoint(loop, box.x, midY(box)), onEndpoint(loop, box.x + box.width, midY(box))]
}

function actualEnds(loop: FrameLoop): readonly Point[] {
  const box = boxOf(drawnTask(loop, BAR_UID).actual, "the bar Task's actual bar")
  // WHY: the end probe stands one px inside, where GA-4 grabs, not on the pixel a touching marker takes.
  return [onEndpoint(loop, box.x, midY(box)), onEndpoint(loop, box.x + box.width - 1, midY(box))]
}

function barBody(loop: FrameLoop): Point {
  const plan = boxOf(drawnTask(loop, BAR_UID).plan, "the bar Task's plan bar")
  const actual = boxOf(drawnTask(loop, BAR_UID).actual, "the bar Task's actual bar")
  return { x: (actual.x + actual.width + plan.x + plan.width) / 2, y: midY(plan) }
}

const startedMilestone = (loop: FrameLoop): Point =>
  centre(boxOf(drawnTask(loop, STONE_UID).plan, "the started milestone's figure"))

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

function shapeAt(built: Stage, at: Point): PointerShape | null {
  built.send(pointer('move', at))
  return built.latest()
}

// see AR-4
function armDependency(built: Stage): void {
  const at = centre(PALETTE_BOX)
  built.send(pointer('down', at))
  built.send(pointer('up', at))
}

describe('the fixture draws what T-023d and FR-043 say it should', () => {
  it('draws the started bar Task with both a plan bar and an actual bar', () => {
    const built = stage()
    expect(drawnTask(built.loop, BAR_UID).plan).not.toBeNull()
    expect(drawnTask(built.loop, BAR_UID).actual).not.toBeNull()
  })

  it('draws the started milestone with a figure and no dummy', () => {
    const built = stage()
    expect(drawnTask(built.loop, STONE_UID).plan).not.toBeNull()
    expect(drawnTask(built.loop, STONE_UID).dummies).toHaveLength(0)
  })

  it('draws the not-started bar with exactly GA-5 and GA-6, no actual bar', () => {
    const built = stage()
    const bar = drawnTask(built.loop, DUMMY_BAR_UID)
    expect(bar.actual).toBeNull()
    expect(bar.dummies.map((one) => one.grab).sort()).toEqual(['GA-5', 'GA-6'])
  })

  it('draws the not-started milestone with exactly GA-17', () => {
    const built = stage()
    const stone = drawnTask(built.loop, DUMMY_STONE_UID)
    expect(stone.dummies.map((one) => one.grab)).toEqual(['GA-17'])
  })

  it('keeps every probe out of the rectangle the fake calls the palette', () => {
    const built = stage()
    const probes = [
      emptyCanvas(built.loop),
      barBody(built.loop),
      startedMilestone(built.loop),
      ...planEnds(built.loop),
      ...actualEnds(built.loop),
      dummyProbe(built.loop, DUMMY_BAR_UID, 'GA-5'),
      dummyProbe(built.loop, DUMMY_BAR_UID, 'GA-6'),
      dummyProbe(built.loop, DUMMY_STONE_UID, 'GA-17'),
    ]
    for (const at of probes) expect(inside(PALETTE_BOX, at)).toBe(false)
  })

  it('arms through the one entrance SK-1 leaves, and the arm reaches the shape', () => {
    const built = stage()
    const before = shapeAt(built, emptyCanvas(built.loop))
    armDependency(built)
    expect(shapeAt(built, emptyCanvas(built.loop))).not.toBe(before)
  })
})

function armablePlaces(loop: FrameLoop): Readonly<Record<string, Point>> {
  const [planStart, planEnd] = planEnds(loop)
  const [actualStart, actualEnd] = actualEnds(loop)
  return {
    planStart: planStart as Point,
    planEnd: planEnd as Point,
    actualStart: actualStart as Point,
    actualEnd: actualEnd as Point,
    body: barBody(loop),
    startedMilestoneFigure: startedMilestone(loop),
    dummyGr9: dummyProbe(loop, DUMMY_BAR_UID, 'GA-5'),
    dummyGr17: dummyProbe(loop, DUMMY_BAR_UID, 'GA-6'),
    dummyGr18: dummyProbe(loop, DUMMY_STONE_UID, 'GA-17'),
  }
}

describe('T-028 IN-2 -- armed for a dependency line, every named place is the default arrow', () => {
  it('answers the SAME single shape at every place named by the sixth clause', () => {
    const built = stage()
    armDependency(built)
    const places = armablePlaces(built.loop)
    const answers = Object.entries(places).map(([name, at]) => [name, shapeAt(built, at)] as const)
    for (const [name, shape] of answers) {
      expect(shape, `${IN_2_DEPENDENCY_ARROW_MUST} -- ${name}`).not.toBeNull()
    }
    const distinct = new Set(answers.map(([, shape]) => shape))
    expect(distinct.size, IN_2_DEPENDENCY_ARROW_MUST).toBe(1)
  })

  it('differs, at every one of those places, from what the SAME point answers unarmed', () => {
    const built = stage()
    const places = armablePlaces(built.loop)
    const unarmed = Object.fromEntries(
      Object.entries(places).map(([name, at]) => [name, shapeAt(built, at)]),
    )
    armDependency(built)
    for (const [name, at] of Object.entries(places)) {
      expect(shapeAt(built, at), `${name}: armed AR-4 must override T-023d`).not.toBe(
        unarmed[name],
      )
    }
  })

  it('goes on answering the arrow while the arm lasts, moving from place to place', () => {
    const built = stage()
    armDependency(built)
    const first = shapeAt(built, barBody(built.loop))
    shapeAt(built, dummyProbe(built.loop, DUMMY_BAR_UID, 'GA-5'))
    expect(shapeAt(built, barBody(built.loop))).toBe(first)
  })
})

// see CR-388
describe('unarmed control -- T-023d places keep their own shapes, not the arrow', () => {
  it('T-269: answers four different arrows at the four ends, and the task dummies take the actual ends arrows', () => {
    const built = stage()
    const [planStart, planEnd] = planEnds(built.loop).map((at) => shapeAt(built, at))
    const [actualStart, actualEnd] = actualEnds(built.loop).map((at) => shapeAt(built, at))
    const ends = [planStart, planEnd, actualStart, actualEnd]
    for (const shape of ends) expect(shape).not.toBeNull()
    expect(new Set(ends).size, `PK-1 white and black, each ← and →: ${ends.join(' | ')}`).toBe(4)
    expect(shapeAt(built, dummyProbe(built.loop, DUMMY_BAR_UID, 'GA-5')), 'PK-1 black ←').toBe(actualStart)
    expect(shapeAt(built, dummyProbe(built.loop, DUMMY_BAR_UID, 'GA-6')), 'PK-1 black →').toBe(actualEnd)
  })

  it('gives the body its own grab shape, and the milestone and GA-17 the filled circle of PK-5, distinct from resize', () => {
    // WHY: table T-269's closing rule replaces IN-2's grab sign on a milestone
    // with `PK-5`, so `GA-16` and `GA-17` both take the filled circle.
    const built = stage()
    const grab = shapeAt(built, barBody(built.loop))
    const circle = shapeAt(built, startedMilestone(built.loop))
    expect(circle).not.toBeNull()
    expect(circle).not.toBe(grab)
    expect(shapeAt(built, dummyProbe(built.loop, DUMMY_STONE_UID, 'GA-17'))).toBe(circle)
    expect(grab).not.toBe(shapeAt(built, (planEnds(built.loop)[0] as Point)))
  })
})

describe('T-028 IN-2 -- armed for a dependency line, empty canvas keeps the draft shape', () => {
  it('answers something OTHER than the arrow the four named categories get', () => {
    const built = stage()
    armDependency(built)
    const arrow = shapeAt(built, barBody(built.loop))
    expect(shapeAt(built, emptyCanvas(built.loop)), IN_2_ARMED_EMPTY_MUST).not.toBe(arrow)
  })
})
