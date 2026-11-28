// Unit tests: a held pan carries the schedule with the pointer in both axes, one to one.

/* eslint-disable @typescript-eslint/no-explicit-any -- the host stubs an untyped global and the frame's layout is read past its type */

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
  ScreenPart,
  ScreenSurface,
  ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import type { Task } from '../../src/entity/document-model/schedule/schedule'
import type {
  BarGeometry,
  Point,
  TaskGeometry,
} from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import {
  frameLoop,
  type FrameEnvironment,
  type FrameLoop,
  type ScreenWiring,
} from '../../src/framework/single-html-shell/frame-loop'
import { specTable, unbroken } from '../contract/spec-table'
import { SETTINGS_CONSTANTS } from '../../src/entity/document-model/document-settings/document-settings'

const SPEC = join(process.cwd(), 'docs', 'spec')

const REQUIREMENTS = unbroken(readRepoFile(join(SPEC, '01-04-requirements.md'), 'utf8')).split('\n')

function resultOf(specTableRowId: string): string {
  const found = specTable('T-023a').rows.find((one) => one.id === specTableRowId)
  if (found === undefined) throw new Error(`table T-023a has no row ${specTableRowId}`)
  const cell = found.by['結果']
  if (cell === undefined || cell.length === 0) {
    throw new Error(`table T-023a row ${specTableRowId} states no 結果`)
  }
  return cell
}

function conditionOf(specTableRowId: string): string {
  const found = specTable('T-023a').rows.find((one) => one.id === specTableRowId)
  if (found === undefined) throw new Error(`table T-023a has no row ${specTableRowId}`)
  return found.by['条件'] ?? ''
}

function equalTravelLine(): string {
  // Why: only a line that does not start with | is the rule's own paragraph, so a table
  // row that names the same words is never read back to itself.
  // Why: not startsWith, as unbroken() joins the broken sentences back and the rule sits
  // inside its paragraph rather than at the head of a line.
  const found = REQUIREMENTS.find(
    (line) =>
      !line.trimStart().startsWith('|') &&
      line.includes('**パンは等倍とすること（MUST）**'),
  )
  if (found === undefined) {
    throw new Error('table T-023d no longer states that a pan travels 等倍')
  }
  return found
}

// Why: the calendar, project and settings come from the startup template;
// the task groups and Tasks are written here so that what is drawn can be named.
const TEMPLATE_PATH = join(
  process.cwd(),
  'src',
  'framework',
  'single-html-shell',
  'startup-template.json',
)
const TEMPLATE = JSON.parse(readRepoFile(TEMPLATE_PATH, 'utf8')) as Record<string, unknown>

// Why: the ids are UUIDs because AT-51 is one.
const TASK_GROUPS = [
  '3a000000-0000-4000-8000-000000000001',
  '3a000000-0000-4000-8000-000000000002',
  '3a000000-0000-4000-8000-000000000003',
  '3a000000-0000-4000-8000-000000000004',
  '3a000000-0000-4000-8000-000000000005',
  '3a000000-0000-4000-8000-000000000006',
] as const

const EMPTY_TASK_GROUP = TASK_GROUPS[4] as string

const NEAR_UID = 1
const FAR_UID = 2

const day = (d: number): string => `2026-04-${String(d).padStart(2, '0')}T00:00:00`

const PX_PER_DAY_AT_1X = 20

// Why: in the middle of the content on purpose, so no case has to know whether a pan
// stops at an edge, which the specification does not say.
const SCROLL_DATE = '2026-04-14'

const SCROLL_TASK_GROUP = TASK_GROUPS[3] as string

function task(over: Partial<Task> & { readonly uid: number }): Task {
  return {
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
  } as unknown as Task
}

const group = (id: string, order: number, label: string): unknown => ({
  id,
  parentId: null,
  name: label,
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
        // Why: no status date, as CU-1 would draw one more element across the area, which buys
        // nothing here and can only confuse a failure.
        statusDate: null,
      },
      calendars: structuredClone(template.schedule.calendars),
      tasks: [
        task({ uid: NEAR_UID, name: 'Alpha', start: day(2), finish: day(12) }),
        task({ uid: FAR_UID, name: 'Beta', start: day(18), finish: day(28) }),
      ],
      resources: [],
      assignments: [],
      taskGroups: TASK_GROUPS.map((id, i) => group(id, i, `R${i + 1}`)),
      taskGroupMembers: [
        { taskUid: NEAR_UID, taskGroupId: TASK_GROUPS[1] },
        { taskUid: FAR_UID, taskGroupId: TASK_GROUPS[2] },
      ],
      taskVisuals: [],
      commentBoxes: [],
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
    },
    documentSettings: {
      ...structuredClone(template.documentSettings),
      // Why: S-1 is a constant; the stored zoomX (S-75) carries the day width this fixture draws at.
      zoomX: PX_PER_DAY_AT_1X / SETTINGS_CONSTANTS.pxPerDayAt1x,
      // Why: pinned so every y below reads from the top of a band.
      stackDirection: 'down',
      scrollDate: SCROLL_DATE,
      scrollDateFraction: 0,
      scrollTaskGroupId: SCROLL_TASK_GROUP,
      scrollTaskGroupFraction: 0,
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

interface Host {
  readonly surface: { showSvg(svg: string): void }
  runAnimationFrames(): void
}

const realRaf = (globalThis as any).requestAnimationFrame

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
      // Why: bounded, so a loop that asks for a frame from inside a frame (NFR-010 forbids it)
      // ends the test instead of hanging it.
      for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) {
        for (const callback of waiting.splice(0, waiting.length)) callback(turn)
      }
      expect(waiting.length, 'the loop kept asking for animation frames with nothing to draw').toBe(
        0,
      )
    },
  }
}

// Why: it answers null everywhere, as a press the surface answers for is on an entry and
// none of table T-023a's gestures; every press here lands on the drawing area.
function screenPane(language: DisplayLanguage = 'en'): ScreenWiring {
  const views: ScreenView[] = []
  const surface: ScreenSurface = {
    showScreenView: (view) => {
      views.push(view)
    },
    readFieldCommit: () => null,
    readScreenPartAt: (): ScreenPart | null => null,
  }
  return { surface, language }
}

afterEach(() => {
  if (realRaf === undefined) delete (globalThis as any).requestAnimationFrame
  else (globalThis as any).requestAnimationFrame = realRaf
})

const NO_MODIFIERS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }

const pointer = (
  phase: PointerPhase,
  x: number,
  y: number,
  options: { readonly button?: PointerButton; readonly ctrl?: boolean } = {},
): PointerInput => ({
  kind: 'pointer',
  phase,
  button: options.button ?? 'left',
  x,
  y,
  modifiers: { ...NO_MODIFIERS, ctrl: options.ctrl ?? false },
  clickCount: 1,
})

// Why: the modifier travels on every happening, not only the press: a person holding
// Ctrl through a drag reports it on each move.
const GESTURES: readonly {
  readonly name: string
  readonly how: { readonly button?: PointerButton; readonly ctrl?: boolean }
}[] = [
  { name: '`Ctrl` だけを伴う**左ドラッグ', how: { button: 'left', ctrl: true } },
  { name: '中ボタンドラッグ', how: { button: 'middle' } },
]

interface Stage {
  readonly loop: FrameLoop
  send(input: HumanInput): void
}

function stage(): Stage {
  const pen = host()
  const loop = frameLoop(pen.surface as any, fixtureDocument(), SCREEN, screenPane())
  const send = (input: HumanInput): void => {
    loop.receiveInput(input)
    pen.runAnimationFrames()
  }
  // Why: the first frame is owed by the loop being made, not by FT-3, so it is drained
  // before any case reads current().
  pen.runAnimationFrames()
  return { loop, send }
}

const frameOf = (loop: FrameLoop) => {
  const values = loop.current()
  if (values === null) throw new Error('the loop has run no frame')
  return values
}

const pxPerDay = (loop: FrameLoop): number => (frameOf(loop).layout as any).pxPerDay as number

function bandOf(loop: FrameLoop, taskGroupId: string): { readonly y: number; readonly height: number } {
  const found = (frameOf(loop).layout as any).taskGroups.find((one: any) => one.taskGroupId === taskGroupId)
  if (found === undefined) throw new Error(`the frame drew no band for task group ${taskGroupId}`)
  return { y: found.y as number, height: found.height as number }
}

const drawnTask = (loop: FrameLoop, uid: number): TaskGeometry => {
  const found = frameOf(loop).geometry.tasks.find((one) => one.taskUid === uid)
  if (found === undefined) throw new Error(`Task ${uid} is not in this frame`)
  return found
}

interface Box {
  readonly x0: number
  readonly x1: number
  readonly y0: number
  readonly y1: number
}

function boxOfBar(bar: BarGeometry | null, what: string): Box {
  if (bar === null) throw new Error(`${what} is not drawn`)
  const points: readonly Point[] =
    bar.form === 'outline'
      ? bar.points
      : [bar.from, bar.to, ...(bar.head ?? []), ...bar.dots.map((one) => one.at)]
  if (points.length === 0) throw new Error(`${what} came out with no points`)
  const xs = points.map((one) => one.x)
  const ys = points.map((one) => one.y)
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) }
}

const planBox = (loop: FrameLoop, uid: number): Box =>
  boxOfBar(drawnTask(loop, uid).plan, `Task ${uid}'s plan bar`)

const midY = (box: Box): number => (box.y0 + box.y1) / 2

interface Where {
  readonly x: number
  readonly y: number
}

const whereIs = (loop: FrameLoop, uid: number): Where => {
  const box = planBox(loop, uid)
  return { x: box.x0, y: midY(box) }
}

const emptySpot = (loop: FrameLoop): Point => {
  const band = bandOf(loop, EMPTY_TASK_GROUP)
  const near = planBox(loop, NEAR_UID)
  return { x: (near.x0 + near.x1) / 2, y: band.y + band.height / 2 }
}

// Why: halves, not a whole day or task group: a pan that can land only on the lock moves
// by nothing for less than one, and halves make that visible.
const TRAVEL_DAYS = 2.5
const TRAVEL_TASK_GROUPS = 0.5

const travelOf = (loop: FrameLoop): Where => ({
  x: TRAVEL_DAYS * pxPerDay(loop),
  y: TRAVEL_TASK_GROUPS * bandOf(loop, EMPTY_TASK_GROUP).height,
})

// Why: half a pixel is this file's own number, as the specification states none; it is
// far below one day and one task group, which the fractions S-176 / S-177 (FR-080) carry.
const ONE_TO_ONE_PX = 0.5

// Spec: T-023a, PTD-1, PTD-3, PTD-7, MK-7, T-023d, S-176, S-177
describe('the manuscript still states the rule this file is about', () => {
  it('puts PTD-7 first and PTD-1 second in table T-023a, evaluated from the top', () => {
    const rows = specTable('T-023a').rows.map((one) => one.id)
    expect(rows[0], 'table T-023a: 上から評価し、最初に成立した行で確定すること（MUST）').toBe(
      'PTD-7',
    )
    expect(rows[1], 'table T-023a: PTD-1 follows PTD-7').toBe('PTD-1')
    expect(resultOf('PTD-1'), 'table T-023a PTD-1: ただし上の `PTD-7` ... が先に立つ').toContain(
      '`GRS` は、`PTD-7`（選択に含まれるタスクの本体から始めた `Ctrl` だけか `Ctrl` ＋ `Shift` の左ドラッグ）を `PTD-1` より先に立てること。',
    )
  })

  it('names the two gestures MK-7 sends to it', () => {
    const condition = conditionOf('PTD-1')
    expect(condition, 'table T-023a PTD-1: 中ボタンドラッグ').toContain('中ボタンドラッグ')
    expect(condition, 'table T-023a PTD-1: `Ctrl` だけを伴う左ドラッグ').toContain('左ドラッグ')
    expect(condition).toContain('Ctrl')
  })

  it('has the schedule follow the pointer in BOTH axes while it is held (MUST)', () => {
    const result = resultOf('PTD-1')
    expect(
      result,
      'table T-023a PTD-1: 握っているあいだ、縦横の両方向でポインターに追従させること（MUST）',
    ).toContain('握っている間、`GRS` は、`Schedule Canvas` を縦横の両方向でポインターに追従させること')
    expect(result, 'and the reason it gives').toContain(
      '離すまで動かないと、掴めていないのと見分けがつかない',
    )
  })

  it('outranks 構え and 当たり, and leaves the travel where table T-023d had it', () => {
    const result = resultOf('PTD-1')
    expect(result, 'table T-023a PTD-1: 構えと当たりによらず優先する').toContain(
      '構えと当たりによらず優先する',
    )
    // Why: PTD-1 points at the seat that states the travel rather than quoting it, so the
    // pair is read as a pair, and equalTravelLine() throws if that seat is gone.
    expect(result, 'table T-023a PTD-1: 距離は 表 T-023d の等倍の定めのままである').toContain(
      '`GRS` は、パンの距離を 表 T-023d の等倍の定めのままにすること',
    )
    expect(
      equalTravelLine(),
      'table T-023d, the seat PTD-1 points at: パンは等倍とすること（MUST）',
    ).toContain('パンは等倍とすること（MUST）')
    expect(result, 'and it says why: 追従は絵の話であって、距離の規則を変えるものではない').toContain(
      '追従は絵の話であって、距離の規則を変えるものではない',
    )
    expect(resultOf('PTD-3'), 'table T-023a PTD-3: そのものへの操作').toContain('`GRS` は、当たったものへの操作を行うこと。')
  })

  it('still states 等倍 where PTD-1 points, and forbids landing only on the lock', () => {
    const line = equalTravelLine()
    expect(line, 'table T-023d: ポインターが動いた距離だけ `Schedule Canvas` が動く。倍率を掛けない').toContain(
      'ポインターが動いた距離だけ `Schedule Canvas` が動く',
    )
    expect(line, 'table T-023d: 錠の上にしか着地できない形にしてはならない（MUST NOT）').toContain(
      '錠の上にしか着地できない形にしてはならない（MUST NOT）',
    )
    expect(line, 'table T-023d: 端数は同表の `S-176` と `S-177` が持つ（MUST）').toContain('S-176')
    expect(line).toContain('S-177')
  })
})

describe('the fixture puts the view where a pan has room in every direction', () => {
  it('draws both bars, on task groups the empty press point is clear of', () => {
    const built = stage()
    const near = planBox(built.loop, NEAR_UID)
    const far = planBox(built.loop, FAR_UID)
    expect(near.x1, 'Alpha is drawn').toBeGreaterThan(near.x0)
    expect(far.x1, 'Beta is drawn').toBeGreaterThan(far.x0)
    // Why: if the press point stood on a bar, a failure would not say whether PTD-1 was
    // ignored or PTD-3 (judged in MK-9a's order) was reached first.
    const at = emptySpot(built.loop)
    for (const uid of [NEAR_UID, FAR_UID]) {
      const box = planBox(built.loop, uid)
      const inside = at.x >= box.x0 && at.x <= box.x1 && at.y >= box.y0 && at.y <= box.y1
      expect(inside, `the empty press point stands on Task ${uid}`).toBe(false)
    }
  })

  it('starts with days and task groups on both sides of the view', () => {
    const built = stage()
    expect(planBox(built.loop, NEAR_UID).x0).toBeLessThan(planBox(built.loop, FAR_UID).x0)
    const first = bandOf(built.loop, TASK_GROUPS[0] as string)
    const last = bandOf(built.loop, TASK_GROUPS[5] as string)
    expect(last.y, 'the six task groups are drawn one below another').toBeGreaterThan(first.y)
  })
})

// Spec: PTD-1, T-023d, MK-7
// Why: only the picture is asserted: a pan writes no history, and the release, the pointer
// shape and the browser default are not what PTD-1 states.
describe.each(GESTURES.map((one) => [one.name, one.how] as const))(
  'table T-023a PTD-1 (%s): the schedule follows the pointer while it is held',
  (_name, how) => {
    it('carries the drawing sideways with the pointer (MUST)', () => {
      const built = stage()
      const at = emptySpot(built.loop)
      built.send(pointer('down', at.x, at.y, how))
      // Why: read after the press: PTD-1 speaks of holding, which starts at the press.
      const held = whereIs(built.loop, NEAR_UID)
      const travel = travelOf(built.loop)
      built.send(pointer('move', at.x + travel.x, at.y, how))
      const now = whereIs(built.loop, NEAR_UID)
      expect(
        now.x,
        'table T-023a PTD-1: 握っているあいだ、縦横の両方向でポインターに追従させること（MUST）',
      ).toBeGreaterThan(held.x)
      expect(
        Math.abs(now.x - held.x - travel.x),
        `table T-023d: パンは等倍とすること（MUST） -- the picture moved ${
          now.x - held.x
        } where the pointer moved ${travel.x}`,
      ).toBeLessThanOrEqual(ONE_TO_ONE_PX)
    })

    it('carries the drawing downwards with the pointer (MUST)', () => {
      const built = stage()
      const at = emptySpot(built.loop)
      built.send(pointer('down', at.x, at.y, how))
      const held = whereIs(built.loop, NEAR_UID)
      const travel = travelOf(built.loop)
      built.send(pointer('move', at.x, at.y + travel.y, how))
      const now = whereIs(built.loop, NEAR_UID)
      expect(
        now.y,
        'table T-023a PTD-1: 縦横の両方向で -- 縦を止めると、掴めていないのと見分けがつかない',
      ).toBeGreaterThan(held.y)
      expect(
        Math.abs(now.y - held.y - travel.y),
        `table T-023d: パンは等倍とすること（MUST） -- the picture moved ${
          now.y - held.y
        } where the pointer moved ${travel.y}`,
      ).toBeLessThanOrEqual(ONE_TO_ONE_PX)
    })

    it('carries it in both axes at once, by the travel in each (MUST)', () => {
      const built = stage()
      const at = emptySpot(built.loop)
      built.send(pointer('down', at.x, at.y, how))
      const held = whereIs(built.loop, NEAR_UID)
      const travel = travelOf(built.loop)
      built.send(pointer('move', at.x + travel.x, at.y + travel.y, how))
      const now = whereIs(built.loop, NEAR_UID)
      expect(Math.abs(now.x - held.x - travel.x), 'the sideways half').toBeLessThanOrEqual(
        ONE_TO_ONE_PX,
      )
      expect(Math.abs(now.y - held.y - travel.y), 'the downward half').toBeLessThanOrEqual(
        ONE_TO_ONE_PX,
      )
    })

    it('follows the other way too -- back and up', () => {
      // Why: both axes is not one direction each; a picture that moved only right and down
      // would answer every case above.
      const built = stage()
      const at = emptySpot(built.loop)
      built.send(pointer('down', at.x, at.y, how))
      const held = whereIs(built.loop, NEAR_UID)
      const travel = travelOf(built.loop)
      built.send(pointer('move', at.x - travel.x, at.y - travel.y, how))
      const now = whereIs(built.loop, NEAR_UID)
      expect(Math.abs(now.x - held.x + travel.x), 'leftwards, 等倍').toBeLessThanOrEqual(
        ONE_TO_ONE_PX,
      )
      expect(Math.abs(now.y - held.y + travel.y), 'upwards, 等倍').toBeLessThanOrEqual(ONE_TO_ONE_PX)
    })

    it('follows every sideways move, not only the last one', () => {
      // Why: a picture that caught up only at the release fails, and
      // T-023d states the distance of the whole gesture, so every step is one to one.
      const built = stage()
      const at = emptySpot(built.loop)
      built.send(pointer('down', at.x, at.y, how))
      const held = whereIs(built.loop, NEAR_UID)
      const travel = travelOf(built.loop)
      for (const step of [1, 2, 3, 4]) {
        built.send(pointer('move', at.x + step * travel.x, at.y, how))
        const now = whereIs(built.loop, NEAR_UID)
        expect(
          Math.abs(now.x - held.x - step * travel.x),
          `table T-023d: パンは等倍とすること（MUST） -- at move ${step} the pointer stood ${
            step * travel.x
          } from the press and the picture stood ${now.x - held.x}`,
        ).toBeLessThanOrEqual(ONE_TO_ONE_PX)
      }
    })

    it('follows every downward move, not only the last one', () => {
      // Why: the steps are halves of a band, as a picture that walks whole task groups
      // passes a case made of whole task groups.
      const built = stage()
      const at = emptySpot(built.loop)
      built.send(pointer('down', at.x, at.y, how))
      const held = whereIs(built.loop, NEAR_UID)
      const travel = travelOf(built.loop)
      for (const step of [1, 2, 3, 4]) {
        built.send(pointer('move', at.x, at.y + step * travel.y, how))
        const now = whereIs(built.loop, NEAR_UID)
        expect(
          Math.abs(now.y - held.y - step * travel.y),
          `table T-023d: パンは等倍とすること（MUST） -- at move ${step} the pointer stood ${
            step * travel.y
          } from the press and the picture stood ${now.y - held.y}`,
        ).toBeLessThanOrEqual(ONE_TO_ONE_PX)
      }
    })

    it('comes back exactly when the pointer comes back', () => {
      // Why: following is a picture of the pointer, so one that only ever ran away would
      // answer the cases above and still show a place no longer pointed at.
      const built = stage()
      const at = emptySpot(built.loop)
      built.send(pointer('down', at.x, at.y, how))
      const held = whereIs(built.loop, NEAR_UID)
      const travel = travelOf(built.loop)
      built.send(pointer('move', at.x + travel.x, at.y + travel.y, how))
      expect(whereIs(built.loop, NEAR_UID).x).toBeGreaterThan(held.x)
      built.send(pointer('move', at.x, at.y, how))
      const back = whereIs(built.loop, NEAR_UID)
      expect(
        back.x,
        'table T-023a PTD-1: 追従 means the picture belongs to the POINTER, so it comes back with it',
      ).toBeCloseTo(held.x, 6)
      expect(back.y).toBeCloseTo(held.y, 6)
    })

    it('moves the WHOLE schedule, not one figure of it', () => {
      // Why: the schedule moves, not a bar; the two Tasks stand on different task groups and
      // days, so a picture that moved only what was under the pointer fails.
      const built = stage()
      const at = emptySpot(built.loop)
      built.send(pointer('down', at.x, at.y, how))
      const near = whereIs(built.loop, NEAR_UID)
      const far = whereIs(built.loop, FAR_UID)
      const band = bandOf(built.loop, TASK_GROUPS[0] as string)
      const travel = travelOf(built.loop)
      built.send(pointer('move', at.x + travel.x, at.y + travel.y, how))
      expect(Math.abs(whereIs(built.loop, NEAR_UID).x - near.x - travel.x)).toBeLessThanOrEqual(
        ONE_TO_ONE_PX,
      )
      expect(
        Math.abs(whereIs(built.loop, FAR_UID).x - far.x - travel.x),
        'the far Task moved by a different amount from the near one',
      ).toBeLessThanOrEqual(ONE_TO_ONE_PX)
      expect(
        Math.abs(bandOf(built.loop, TASK_GROUPS[0] as string).y - band.y - travel.y),
        'the task group bands did not travel with the bars',
      ).toBeLessThanOrEqual(ONE_TO_ONE_PX)
    })

    it('pans even when the press lands on a Task (構えと当たりによらず優先する)', () => {
      // Why: PTD-1 is evaluated before PTD-3, and the proof is that the other Task moves too:
      // a grab (GA-9) would carry the pressed bar alone.
      const built = stage()
      const box = planBox(built.loop, NEAR_UID)
      const at: Point = { x: (box.x0 + box.x1) / 2, y: midY(box) }
      built.send(pointer('down', at.x, at.y, how))
      const far = whereIs(built.loop, FAR_UID)
      const travel = travelOf(built.loop)
      built.send(pointer('move', at.x + travel.x, at.y + travel.y, how))
      expect(
        Math.abs(whereIs(built.loop, FAR_UID).x - far.x - travel.x),
        'table T-023a PTD-1: パン。構えと当たりによらず優先する',
      ).toBeLessThanOrEqual(ONE_TO_ONE_PX)
      expect(
        Math.abs(whereIs(built.loop, FAR_UID).y - far.y - travel.y),
        'table T-023a PTD-1: 縦横の両方向で',
      ).toBeLessThanOrEqual(ONE_TO_ONE_PX)
    })
  },
)
