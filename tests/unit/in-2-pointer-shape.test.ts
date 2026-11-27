// Unit tests: what shape the pointer takes where it stands, as relations between the places IN-2 names.

/* eslint-disable @typescript-eslint/no-explicit-any -- the fixture edits a cloned template and the host fakes browser globals */

import { readRepoFile } from '../spec-files'
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
import { SETTINGS_CONSTANTS } from '../../src/entity/document-model/document-settings/document-settings'

const rowOf = (table: string, id: string) => {
  const found = specTable(table).rows.find((row) => row.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

const IN_2 = rowOf('T-028', 'IN-2').cells.join(' ')

// Why: the places are read, not counted, so a ruling that adds one reaches these cases; the list is bounded
// by its parenthesis and the dash that opens the trailing MUST NOT clause, not by bold.
function placesNamedByIn2(): readonly string[] {
  const open = IN_2.indexOf('（')
  const stop = IN_2.indexOf('——', open)
  if (open < 0 || stop <= open) {
    throw new Error(`IN-2 no longer writes its places in one parenthesis: ${IN_2}`)
  }
  return IN_2.slice(open + 1, stop)
    .split('、')
    .map((one) => one.trim())
    .filter((one) => one.length > 0)
}

const allowanceOf = (settingRow: string): number => {
  const cell = rowOf('T-206', settingRow).cells.join(' ')
  const found = /(\d+(?:\.\d+)?)px/.exec(cell)
  if (found === null) throw new Error(`table T-206 row ${settingRow} writes no px: ${cell}`)
  return Number(found[1])
}

// Spec: S-250, S-257
const PLAN_END_ALLOWANCE = allowanceOf('S-250')
const ACTUAL_END_ALLOWANCE = allowanceOf('S-257')

// Why: SK-1 leaves no keyboard route to placing a figure, so arming is reached by a palette entry only.
const ARMING_ENTRY: IconId = ((): string => {
  const found = specTable('T-109').rows.find((one) => (one.by['構え'] ?? '').includes('AR-2'))
  if (found === undefined) throw new Error('table T-109 has no entry whose 構え is AR-2')
  return found.id
})()

// Why: the calendar, project and settings come from BT-4 (FR-027); the task groups and Tasks are written
// out here so that what is drawn can be named.
const TEMPLATE_PATH = join(
  process.cwd(),
  'src',
  'framework',
  'single-html-shell',
  'startup-template.json',
)
const TEMPLATE = JSON.parse(readRepoFile(TEMPLATE_PATH, 'utf8')) as Record<string, unknown>

const BAR_TASK_GROUP = '11111111-1111-4111-8111-111111111111'
const STONE_TASK_GROUP = '22222222-2222-4222-8222-222222222222'
const NEW_STONE_TASK_GROUP = '33333333-3333-4333-8333-333333333333'

// Why: started on purpose, as FR-043 puts the GA-5 and GA-6 dummies above GA-9 on a not-started Task;
// and nameless, so GR-10 and GR-11, drawn inside the shape, are not in the way.
const BAR_UID = 1
const BAR_START = '2026-04-06'
const BAR_FINISH = '2026-04-24'
const BAR_ACTUAL_START = '2026-04-08'
// Why: a fixture choice, not a settings value: any short actual leaves a long body.
const BAR_ACTUAL_STOP = '2026-04-10'

// Why: started, so the actual figure (GA-16) stands on it.
const STONE_UID = 2
const STONE_DAY = '2026-04-15'

// Why: past BAR_FINISH on purpose: the fitted view puts the last thing on the area's half-open right edge, and
// a plan end grabs only outside itself (GA-1, GA-2), so this milestone ends the schedule instead of the bar.
const NEW_STONE_UID = 3
const NEW_STONE_DAY = '2026-04-28'

// Why: wide, so a day is legible to the probes.
const PX_PER_DAY_AT_1X = 20

const task = (over: Partial<Task> & { readonly uid: number }): Task =>
  ({
    parentTaskUid: null,
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

// Spec: SH-5
const milestoneVisual = (taskUid: number): TaskVisual =>
  ({
    taskUid,
    shapeKind: 'milestone',
    milestoneGlyph: 'diamond',
    fillColor: null,
    strokeColor: null,
    strokeWidthPx: null,
  }) as unknown as TaskVisual

const taskGroupOfSchedule = (id: string, order: number) => ({
  id,
  parentId: null,
  name: `row ${order}`,
  derivedFromTaskUid: null,
  order,
  treeState: 'auto', color: null,
  minHeightPx: null,
})

function fixtureDocument(): Document {
  const template = structuredClone(TEMPLATE) as any
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
        task({
          uid: NEW_STONE_UID,
          start: NEW_STONE_DAY,
          finish: NEW_STONE_DAY,
          milestone: true,
        }),
      ],
      resources: [],
      assignments: [],
      taskGroups: [
        taskGroupOfSchedule(BAR_TASK_GROUP, 0),
        taskGroupOfSchedule(STONE_TASK_GROUP, 1),
        taskGroupOfSchedule(NEW_STONE_TASK_GROUP, 2),
      ],
      taskGroupMembers: [
        { taskUid: BAR_UID, taskGroupId: BAR_TASK_GROUP },
        { taskUid: STONE_UID, taskGroupId: STONE_TASK_GROUP },
        { taskUid: NEW_STONE_UID, taskGroupId: NEW_STONE_TASK_GROUP },
      ],
      taskVisuals: [milestoneVisual(STONE_UID), milestoneVisual(NEW_STONE_UID)],
      commentBoxes: [],
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
    },
    documentSettings: {
      ...structuredClone(template.documentSettings),
      // Why: S-1 is a constant; the stored zoomX (S-75) carries the day width this fixture draws at.
      zoomX: PX_PER_DAY_AT_1X / SETTINGS_CONSTANTS.pxPerDayAt1x,
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

// Why: a rectangle this file chooses, since ScreenRegions holds none for the floating palette (FR-053);
// it sits in a corner no probe touches, and a premise measures that.
const PALETTE_BOX: ScreenRect = { x: 8, y: SCREEN.height - 56, width: 120, height: 48 }

const inside = (box: ScreenRect, at: Point): boolean =>
  at.x >= box.x && at.x < box.x + box.width && at.y >= box.y && at.y < box.y + box.height

const realRaf = (globalThis as any).requestAnimationFrame

interface Host {
  readonly surface: { showSvg(svg: string): void }
  runAnimationFrames(): void
}

// Summary: the fake host drains the animation-frame queue and decides nothing about places or shapes.
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
      // Why: bounded, so a loop that asks for a frame from inside a frame (NFR-010 forbids it) ends the test instead of hanging.
      for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) {
        for (const callback of waiting.splice(0, waiting.length)) callback(turn)
      }
      expect(waiting.length, 'the loop kept asking for animation frames with nothing to draw').toBe(
        0,
      )
    },
  }
}

// Summary: a stand-in for IF-9's surface that answers Command Palette inside PALETTE_BOX and nothing elsewhere.
function screenPane(language: DisplayLanguage = 'en'): ScreenWiring {
  const surface: ScreenSurface = {
    // Why: nothing is kept, as IN-2's answer does not travel on IF-9: the host paints the pointer.
    showScreenView: () => undefined,
    readFieldCommit: () => null,
    readScreenPartAt: (x, y): ScreenPart | null => {
      if (!inside(PALETTE_BOX, { x, y })) return null
      return {
        part: 'Command Palette',
        entry: ARMING_ENTRY,
        format: null,
        taskGroupId: null,
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

// Spec: PTD-1
const CTRL_DRAG: HowPressed = { modifiers: { ctrl: true } }
const MIDDLE_DRAG: HowPressed = { button: 'middle' }

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
  // Why: the first frame is owed by making the loop, not by an input of FT-3, so drain it before any case reads current().
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

// Why: no form is required of any bar, since IN-2 says nothing of how a shape is built.
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
const center = (box: ScreenRect): Point => ({ x: box.x + box.width / 2, y: midY(box) })

function emptyCanvas(loop: FrameLoop): Point {
  const area = frameOf(loop).regions.taskGroupArea
  return { x: area.x + area.width - 4, y: area.y + area.height - 4 }
}

// Why: the Task Group Lanes is half-open at the right (R3.4), so a point on its right edge is on no region;
// the clamp is kept as a guard that holds a probe inside it, though no end of this fixture falls there.
function onEndpoint(loop: FrameLoop, x: number, y: number): Point {
  const area = frameOf(loop).regions.taskGroupArea
  return { x: Math.min(x, area.x + area.width - 1), y }
}

// Spec: GA-1, GA-2
function planEnds(loop: FrameLoop): readonly Point[] {
  const box = boxOf(drawnTask(loop, BAR_UID).plan, "the bar Task's plan bar")
  return [
    onEndpoint(loop, box.x, midY(box)),
    onEndpoint(loop, box.x + box.width, midY(box)),
  ]
}

// Spec: GA-3, GA-4
function actualEnds(loop: FrameLoop): readonly Point[] {
  const box = boxOf(drawnTask(loop, BAR_UID).actual, "the bar Task's actual bar")
  // Why: the end probe stands one px inside, where GA-4 grabs, not on the pixel a touching marker takes.
  return [
    onEndpoint(loop, box.x, midY(box)),
    onEndpoint(loop, box.x + box.width - 1, midY(box)),
  ]
}

// Spec: GA-9
// Why: halfway between the actual's right end and the plan's right end, the widest stretch with no end inside,
// so the probe clears both grab allowances by the largest margin; a premise measures both.
function barBody(loop: FrameLoop): Point {
  const plan = boxOf(drawnTask(loop, BAR_UID).plan, "the bar Task's plan bar")
  const actual = boxOf(drawnTask(loop, BAR_UID).actual, "the bar Task's actual bar")
  return { x: (actual.x + actual.width + plan.x + plan.width) / 2, y: midY(plan) }
}

// Spec: GA-16
const startedMilestone = (loop: FrameLoop): Point =>
  center(boxOf(drawnTask(loop, STONE_UID).plan, "the started milestone's figure"))

const newMilestone = (loop: FrameLoop): Point =>
  center(boxOf(drawnTask(loop, NEW_STONE_UID).plan, "the not-started milestone's figure"))

function timeRuler(loop: FrameLoop): Point {
  return center(frameOf(loop).regions.timeRuler)
}

function shapeAt(built: Stage, at: Point): PointerShape | null {
  built.send(pointer('move', at))
  return built.latest()
}

// Why: asked while the button is still down, since IN-1 settles on release; released where it began,
// so nothing pans and resting shapes may still be read from the same screen.
function shapeWhilePanning(built: Stage, at: Point, how: HowPressed): PointerShape | null {
  built.send(pointer('move', at))
  built.send(pointer('down', at, how))
  const held = built.latest()
  built.send(pointer('up', at, how))
  return held
}

function arm(built: Stage): void {
  const at = center(PALETTE_BOX)
  built.send(pointer('down', at))
  built.send(pointer('up', at))
}

// Spec: IN-2, FR-043, GA-5, GA-6, GA-7, GA-8, GR-10, GR-11, FR-075, SK-1, S-250, S-253, S-257, S-260
describe('the fixture draws what IN-2 names', () => {
  it('reads five places out of IN-2, one per meaning it gives', () => {
    expect(
      placesNamedByIn2(),
      'T-028 IN-2: 何にも当たらない場所 / パン中 / 選択をコピーして引いているあいだ / 構えているとき / 掴み代の上',
    ).toHaveLength(5)
  })

  it('draws the bar Task with both a plan bar and an actual bar', () => {
    const built = stage()
    expect(drawnTask(built.loop, BAR_UID).plan, 'IN-2: 予定バー').not.toBeNull()
    expect(drawnTask(built.loop, BAR_UID).actual, 'IN-2: 実績バー').not.toBeNull()
  })

  it('draws both milestones as milestones with a figure (SH-5 of table T-012)', () => {
    const built = stage()
    expect(drawnTask(built.loop, STONE_UID).shapeKind).toBe('milestone')
    expect(drawnTask(built.loop, NEW_STONE_UID).shapeKind).toBe('milestone')
    expect(drawnTask(built.loop, STONE_UID).plan).not.toBeNull()
    expect(drawnTask(built.loop, NEW_STONE_UID).plan).not.toBeNull()
  })

  it('draws no dummy on the started bar Task, so GA-5 / GA-6 cannot claim its body', () => {
    const built = stage()
    expect(
      drawnTask(built.loop, BAR_UID).dummies,
      'FR-043 puts the two dummies on a Task that is 未着手, and this one is not',
    ).toHaveLength(0)
  })

  it('draws no name label on the bar Task, so GR-10 is not in the way', () => {
    const built = stage()
    expect(drawnTask(built.loop, BAR_UID).label).toBeNull()
  })

  it('draws no fade grab point, so GA-7 / GA-8 do not outrank the ends', () => {
    const built = stage()
    expect(
      drawnTask(built.loop, BAR_UID).fadeHandles,
      'FR-075 (MUST): 掴み点は選択しているタスクにだけ出すこと',
    ).toHaveLength(0)
  })

  it('puts the body probe clear of every endpoint allowance (S-250 / S-253 and S-257 / S-260)', () => {
    const built = stage()
    const at = barBody(built.loop)
    for (const end of planEnds(built.loop)) {
      expect(
        Math.abs(at.x - end.x),
        'T-206 S-250 / S-253: the plan end reach, 6px outside the end',
      ).toBeGreaterThan(PLAN_END_ALLOWANCE)
    }
    for (const end of actualEnds(built.loop)) {
      expect(
        Math.abs(at.x - end.x),
        'T-206 S-257 / S-260: the actual end reach, 12px inside the end',
      ).toBeGreaterThan(ACTUAL_END_ALLOWANCE)
    }
  })

  it('keeps every probe out of the rectangle the fake calls the palette', () => {
    const built = stage()
    const probes = [
      emptyCanvas(built.loop),
      barBody(built.loop),
      startedMilestone(built.loop),
      newMilestone(built.loop),
      timeRuler(built.loop),
      ...planEnds(built.loop),
      ...actualEnds(built.loop),
    ]
    for (const at of probes) expect(inside(PALETTE_BOX, at)).toBe(false)
  })

  it('arms through the one entrance SK-1 leaves, and the arm reaches the shape', () => {
    const built = stage()
    const before = shapeAt(built, emptyCanvas(built.loop))
    arm(built)
    expect(
      shapeAt(built, emptyCanvas(built.loop)),
      'T-036 SK-1: キーボードだけで図形を置く経路は持たない -- so the palette press is the arm',
    ).not.toBe(before)
  })
})

// Why: one loop reads all five with the arm last, because an arm lasts and would change the answers after it.
function fiveAnswers(): Readonly<Record<string, PointerShape | null>> {
  const built = stage()
  const nothingHit = shapeAt(built, emptyCanvas(built.loop))
  const endpoint = shapeAt(built, planEnds(built.loop)[0] as Point)
  const grabbable = shapeAt(built, barBody(built.loop))
  const panning = shapeWhilePanning(built, emptyCanvas(built.loop), CTRL_DRAG)
  arm(built)
  const arming = shapeAt(built, emptyCanvas(built.loop))
  return { nothingHit, panning, arming, endpoint, grabbable }
}

// Spec: IN-2
describe('T-028 IN-2: the five places carry five different meanings', () => {
  it('answers a shape at every one of the five (「その場所で何ができるかを示すこと」)', () => {
    for (const [place, shape] of Object.entries(fiveAnswers())) {
      expect(shape, `T-028 IN-2 names ${place}, so a shape must stand there`).not.toBeNull()
    }
  })

  it('answers a DISTINCT shape at each of them', () => {
    // Why: IN-2 leaves the spelling of a shape to the viewing environment, so distinctness is asserted, not a keyword;
    // five meanings sharing one shape would not show what can be done there.
    const answers = Object.values(fiveAnswers())
    expect(
      new Set(answers).size,
      `two of IN-2's five places answered alike: ${answers.join(', ')}`,
    ).toBe(answers.length)
  })

  it('answers at least as many distinct shapes as IN-2 names places', () => {
    expect(new Set(Object.values(fiveAnswers())).size).toBeGreaterThanOrEqual(placesNamedByIn2().length)
  })
})

// Spec: IN-2, PTD-3, PTD-5
describe('T-028 IN-2: 何にも当たらない場所は範囲選択の合図', () => {
  it('answers a shape where nothing is hit and nothing is armed (PTD-5)', () => {
    const built = stage()
    expect(shapeAt(built, emptyCanvas(built.loop))).not.toBeNull()
  })

  it('answers the same one every time the pointer comes back to it', () => {
    const built = stage()
    const first = shapeAt(built, emptyCanvas(built.loop))
    shapeAt(built, barBody(built.loop))
    expect(
      shapeAt(built, emptyCanvas(built.loop)),
      'T-028 IN-2 fixes which place carries which meaning, so one place keeps one shape',
    ).toBe(first)
  })

  it('does not answer it on a bar body: PTD-3 is reached before PTD-5', () => {
    const built = stage()
    expect(shapeAt(built, barBody(built.loop))).not.toBe(shapeAt(built, emptyCanvas(built.loop)))
  })
})

// Spec: T-266
const T_266_ENDS = [
  '箱の矢印 ← 白（`PK-1`）',
  '箱の矢印 → 白（`PK-1`）',
  '箱の矢印 ← 黒（`PK-1`）',
  '箱の矢印 → 黒（`PK-1`）',
] as const

// Spec: FR-106
const FR_106_KEEPS = '押している間、`GRS` は、掴んだときの形を保つこと。'
const IN_2_T_269 = '掴み代の上は `FR-106` の 表 T-269 の形'

// Spec: IN-2, GA-1, GA-2, GA-3, GA-4, T-269
describe('T-028 IN-2: 予定バーと実績バーの端点の上は 表 T-269 の形', () => {
  it('the manuscript still holds the four end pointers of T-266, the FR-106 clause and the IN-2 sentence quoted here', () => {
    const requirements = readRepoFile(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8')
    for (const row of [...T_266_ENDS, FR_106_KEEPS, IN_2_T_269]) {
      expect(requirements, row).toContain(row)
    }
  })

  it('answers four DIFFERENT shapes at the four ends -- left and right, hollow and filled', () => {
    const built = stage()
    const ends = [...planEnds(built.loop), ...actualEnds(built.loop)]
    const answers = ends.map((at) => shapeAt(built, at))
    answers.forEach((shape, at) => expect(shape, T_266_ENDS[at]).not.toBeNull())
    expect(
      new Set(answers).size,
      `${IN_2_T_269}: ${answers.join(' | ')}`,
    ).toBe(T_266_ENDS.length)
  })

  it('answers it on the plan bar left end -- GA-1, 予定バーの左端', () => {
    const built = stage()
    const [left] = planEnds(built.loop)
    expect(shapeAt(built, left as Point)).not.toBe(shapeAt(built, emptyCanvas(built.loop)))
  })

  it('answers it on the actual bar right end -- GA-4, 実績バーの右端', () => {
    const built = stage()
    const ends = actualEnds(built.loop)
    const right = ends[ends.length - 1] as Point
    expect(shapeAt(built, right)).not.toBe(shapeAt(built, emptyCanvas(built.loop)))
  })

  it('answers the same one every time the pointer comes back to an end', () => {
    const built = stage()
    const [left] = planEnds(built.loop)
    const first = shapeAt(built, left as Point)
    shapeAt(built, emptyCanvas(built.loop))
    expect(shapeAt(built, left as Point)).toBe(first)
  })
})

// Spec: FR-106, IN-1
describe('FR-106: while pressed, the pointer keeps the shape it had when pressed', () => {
  it('a press on the plan end keeps its arrow while dragged off the end, over empty canvas', () => {
    const built = stage()
    const end = planEnds(built.loop)[1] as Point
    const away = emptyCanvas(built.loop)
    const restingAway = shapeAt(built, away)
    const atPress = shapeAt(built, end)
    expect(atPress, 'the premise: the end and the empty canvas answer apart').not.toBe(restingAway)
    // Step: press on the end, then drag to where the resting shape differs
    built.send(pointer('down', end))
    built.send(pointer('move', away))
    expect(built.latest(), FR_106_KEEPS).toBe(atPress)
  })

  it('a press on the bar body keeps the grab shape while dragged over empty canvas (not only ends)', () => {
    const built = stage()
    const body = barBody(built.loop)
    const away = emptyCanvas(built.loop)
    const restingAway = shapeAt(built, away)
    const atPress = shapeAt(built, body)
    expect(atPress).not.toBe(restingAway)
    // Step: press on the body, then drag to where the resting shape differs
    built.send(pointer('down', body))
    built.send(pointer('move', away))
    expect(built.latest(), FR_106_KEEPS).toBe(atPress)
  })
})

// Spec: IN-2, GA-9, GA-16, PK-5, T-269
describe('T-028 IN-2: タスクの本体とマイルストーンの図形の上は掴めることの合図', () => {
  it('answers a shape on the bar body -- GA-9, 端点を除いた中間', () => {
    const built = stage()
    expect(
      shapeAt(built, barBody(built.loop)),
      'T-028 IN-2 (⛔): 掴めるものの上で形が変わらないと、選べるのかどうかを押してみるまで確かめられない',
    ).not.toBeNull()
  })

  it('answers a shape on a milestone figure -- GA-16, 実績の図形の上', () => {
    const built = stage()
    expect(shapeAt(built, startedMilestone(built.loop))).not.toBeNull()
  })

  it('answers the milestone figure with its OWN circle, not the body\'s hand', () => {
    // Why: the closing rule of table T-269 replaces IN-2's grab sign on a
    // milestone with `PK-5`, so the figure answers with its own circle.
    const built = stage()
    expect(
      shapeAt(built, startedMilestone(built.loop)),
      "table T-269 gives a milestone's figure PK-5, not the body's grab hand",
    ).not.toBe(shapeAt(built, barBody(built.loop)))
  })

  it('⭐ answers something OTHER than the bars ends do', () => {
    const built = stage()
    const [left] = planEnds(built.loop)
    // Why: IN-2 gives the ends table T-269's shapes and the body its grab sign;
    // two meanings need two shapes, or one bar would promise the same end to end.
    expect(shapeAt(built, barBody(built.loop))).not.toBe(shapeAt(built, left as Point))
  })

  it('⭐ answers something OTHER than the bars ends do on a milestone too', () => {
    const built = stage()
    const [left] = planEnds(built.loop)
    expect(shapeAt(built, startedMilestone(built.loop))).not.toBe(shapeAt(built, left as Point))
  })

  it('answers the same one every time the pointer comes back to the body', () => {
    const built = stage()
    const first = shapeAt(built, barBody(built.loop))
    shapeAt(built, emptyCanvas(built.loop))
    expect(shapeAt(built, barBody(built.loop))).toBe(first)
  })
})

// Spec: IN-2, PTD-1, IN-1
describe('T-028 IN-2: `Ctrl` 併用と中ボタンのパン中は握った手', () => {
  it('answers a shape while a `Ctrl` drag is in flight', () => {
    const built = stage()
    expect(shapeWhilePanning(built, emptyCanvas(built.loop), CTRL_DRAG)).not.toBeNull()
  })

  it('answers the SAME shape for the middle button as for `Ctrl` (one place, one meaning)', () => {
    const built = stage()
    const byCtrl = shapeWhilePanning(built, emptyCanvas(built.loop), CTRL_DRAG)
    expect(
      shapeWhilePanning(built, emptyCanvas(built.loop), MIDDLE_DRAG),
      'T-028 IN-2 writes 「`Ctrl` 併用と中ボタンのパン中」 as ONE place',
    ).toBe(byCtrl)
  })

  it('answers something OTHER than the resting shape of the place under it', () => {
    const built = stage()
    const resting = shapeAt(built, emptyCanvas(built.loop))
    expect(shapeWhilePanning(built, emptyCanvas(built.loop), CTRL_DRAG)).not.toBe(resting)
  })

  it('answers it over a bar body too -- PTD-1 「構えと当たりによらず優先する」', () => {
    const built = stage()
    const overEmpty = shapeWhilePanning(built, emptyCanvas(built.loop), CTRL_DRAG)
    expect(shapeWhilePanning(built, barBody(built.loop), CTRL_DRAG)).toBe(overEmpty)
  })

  it('stops answering it once the button is released (IN-1: 離した時点で確定する)', () => {
    const built = stage()
    const at = emptyCanvas(built.loop)
    const resting = shapeAt(built, at)
    expect(shapeWhilePanning(built, at, CTRL_DRAG)).not.toBe(resting)
    expect(
      built.latest(),
      'T-028 IN-2 asks for the hand 「パン中」, and the release has ended the pan',
    ).toBe(resting)
  })
})

// Spec: IN-2, PTD-4, PTD-4a, AR-1, AR-2, AR-6
// Why: the armed cases arm AR-2, which PTD-4 settles without argument; the dependency arm (AR-4)
// and Dual Cursor mode (PTD-2), for which IN-2 names no place, are left out.
describe('T-028 IN-2: 構えているときは作図の合図', () => {
  it('answers a shape once a figure is armed (AR-2 of table T-023b)', () => {
    const built = stage()
    arm(built)
    expect(shapeAt(built, emptyCanvas(built.loop))).not.toBeNull()
  })

  it('answers something OTHER than the un-armed place answers', () => {
    const built = stage()
    const before = shapeAt(built, emptyCanvas(built.loop))
    arm(built)
    expect(
      shapeAt(built, emptyCanvas(built.loop)),
      'T-028 IN-2: 何にも当たらない場所は範囲選択の合図 / 構えているときは作図の合図',
    ).not.toBe(before)
  })

  it('goes on answering it while the arm lasts (表 T-023b: 構えは持続すること)', () => {
    const built = stage()
    arm(built)
    const first = shapeAt(built, emptyCanvas(built.loop))
    shapeAt(built, timeRuler(built.loop))
    expect(shapeAt(built, emptyCanvas(built.loop))).toBe(first)
  })

  it('does not answer it on a bar body: 当たったか is decided before 構えているか', () => {
    const built = stage()
    arm(built)
    expect(shapeAt(built, barBody(built.loop))).not.toBe(shapeAt(built, emptyCanvas(built.loop)))
  })
})

// Spec: IN-2, FR-053
describe('T-028 IN-2 names five places and no more', () => {
  it('answers nothing on the タイムルーラー', () => {
    const built = stage()
    // Why: the decision order applies only to the drawing area and the ruler has no pointer operation,
    // so a marquee signal there would promise what that row forbids.
    expect(
      shapeAt(built, timeRuler(built.loop)),
      'T-023a: 判定順序を適用するのは日程の描画領域だけとすること（MUST）',
    ).toBeNull()
  })

  it('answers nothing on the `Command Palette`, which floats over the drawing area', () => {
    const built = stage()
    expect(shapeAt(built, center(PALETTE_BOX))).toBeNull()
  })

  it('answers the ruler the same way every time the pointer comes back to it', () => {
    const built = stage()
    const first = shapeAt(built, timeRuler(built.loop))
    shapeAt(built, barBody(built.loop))
    expect(shapeAt(built, timeRuler(built.loop))).toBe(first)
  })
})

// Spec: GA-16, GA-17
const GR_18_GRABS_LIKE_GR_15 =
  '。⭐ **押したときは、予定と実績のマイルストーンが同じ日にあるときの `GA-16` と同じものを掴むこと（MUST）'

// Spec: IN-2, GA-16, GA-17
describe('T-028 IN-2 on a milestone that has not been started (CR-382, CR-388)', () => {
  it('answers a shape on its figure at all', () => {
    const built = stage()
    expect(
      shapeAt(built, newMilestone(built.loop)),
      'T-028 IN-2: マイルストーンの図形の上は掴めることの合図 -- 未着手 is not excepted',
    ).not.toBeNull()
  })

  it('answers the SAME grab shape a started milestone figure (GA-16) gets', () => {
    const built = stage()
    const grab = shapeAt(built, startedMilestone(built.loop))
    expect(shapeAt(built, newMilestone(built.loop)), GR_18_GRABS_LIKE_GR_15).toBe(grab)
  })

  it('answers something OTHER than the bar plan end (GA-1)', () => {
    const built = stage()
    const [left] = planEnds(built.loop)
    const resize = shapeAt(built, left as Point)
    expect(shapeAt(built, newMilestone(built.loop))).not.toBe(resize)
  })
})
