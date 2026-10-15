// CR-775 spec-only cases: Alt (SG-4) is read at release (FR-103, T-378); a Shift-only body drag keeps the dates on the hour,
// 30-minute and 1-minute snaps (MK-16, FR-107); Ctrl+Shift copies with amount 0 even with Alt at release (CY-5, CY-11, MK-15, MK-12);
// the dark S-587 holds 3:1 on the planned bar fill S-155 at hue 60 (NFR-007, T-366).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import {
  commandFromInput,
  pressedRowOf,
  type HumanInput,
  type InputContext,
  type InputModifiers,
  type PointerInput,
  type PointerPhase,
  type PointerPress,
} from '../../src/adapter/input-command-translator/input-command-translator'
import type { ScreenPart, ScreenSurface } from '../../src/adapter/screen-renderer/screen-renderer'
import { colorOf } from '../../src/adapter/svg-renderer/svg-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import { SETTINGS_DEFAULTS, type DocumentSettings } from '../../src/entity/document-model/document-settings/document-settings'
import type { Task } from '../../src/entity/document-model/schedule/schedule'
import type { Selection } from '../../src/entity/document-model/selection/selection'
import { grabSizesOf, itemAtPointer, type Hit } from '../../src/entity/layout-engine/item-hit-area/item-hit-area'
import type { BarGeometry, Point } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import { snapMinutesOf } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import type { ScreenRect } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { frameLoop, type FrameEnvironment, type FrameLoop, type ScreenWiring } from '../../src/framework/single-html-shell/frame-loop'
import { emptyScreenSession } from '../../src/use-case/advance-screen-session/advance-screen-session'
import { NOT_STORED_ZOOM_BOUNDS, type DocumentCommand } from '../../src/use-case/edit-document/edit-document'
import { bare, specTable } from './spec-table'

const rowOf = (table: string, id: string) => {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

// WHY: the column headings of the settings tables are Japanese; they are written as escapes to keep this file ASCII.
const HEADING_DEFAULT_VALUE = '既定値'
const HEADING_DEFAULT = '既定'

const numberOf = (table: string, id: string, heading: string): number => {
  const numbers = bare(rowOf(table, id).by[heading] ?? '').match(/\d+(?:\.\d+)?/g) ?? []
  if (numbers.length !== 1) throw new Error(`${id} of table ${table} does not hold one number`)
  return Number(numbers[0])
}

// WHY: every number below is read from the settings tables, never held here.
const S_1 = numberOf('T-201', 'S-1', HEADING_DEFAULT_VALUE)
const S_8 = numberOf('T-201', 'S-8', HEADING_DEFAULT_VALUE)
const S_577 = numberOf('T-205', 'S-577', HEADING_DEFAULT)
const S_578 = numberOf('T-205', 'S-578', HEADING_DEFAULT)
const S_208 = numberOf('T-206', 'S-208', HEADING_DEFAULT)

// WHY: two task groups, one task in the first; 2026-10-12 is a Monday, 10/14 a Wednesday, 10/15 a Thursday.

const TASK_GROUP_A = '75300000-0000-4000-8000-00000000000a'
const TASK_GROUP_B = '75300000-0000-4000-8000-00000000000b'
const SOURCE = 1
const SOURCE_NAME = 'Source'

const TEMPLATE = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
) as Record<string, Record<string, unknown>>

const RULER_FONT = SETTINGS_DEFAULTS['rulerFontSizePx'] as number

// WHY: FR-017 judges pxPerDay / (rulerFontSizePx * ratio / S-8) and pxPerDay = S-1 * ratio * zoomX, so the ratio cancels:
// a zoomX for a wanted judged width is judged * rulerFontSizePx / (S-1 * S-8).
const zoomXFor = (judged: number): number => (judged * RULER_FONT) / (S_1 * S_8)

interface Scene {
  readonly start: string
  readonly finish: string
  readonly isTimeOfDayVisible: boolean
  readonly zoomX: number
  readonly scrollDate: string
  readonly scrollDayOffset: number
}

function fixtureDocument(scene: Scene): Document {
  const template = structuredClone(TEMPLATE)
  const schedule = template['schedule'] as Record<string, unknown>
  const source = {
    uid: SOURCE,
    parentTaskUid: null,
    wbsOrder: 1,
    name: SOURCE_NAME,
    start: scene.start,
    finish: scene.finish,
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
  }
  return {
    '$schema': template['$schema'],
    schemaVersion: template['schemaVersion'],
    schedule: {
      project: {
        ...(schedule['project'] as Record<string, unknown>),
        startDate: '2026-10-12T08:00:00',
        statusDate: null,
        uidHighWaterMark: 100,
      },
      calendars: schedule['calendars'],
      tasks: [source],
      resources: [],
      assignments: [],
      taskGroups: [TASK_GROUP_A, TASK_GROUP_B].map((id, order) => ({
        id,
        parentId: null,
        name: `task group ${order}`,
        derivedFromTaskUid: null,
        order,
        treeState: 'auto',
        color: null,
        minHeightPx: null,
      })),
      taskGroupMembers: [{ taskUid: SOURCE, taskGroupId: TASK_GROUP_A }],
      taskVisuals: [],
      commentBoxes: [],
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
    },
    documentSettings: {
      ...(template['documentSettings'] as Record<string, unknown>),
      isTimeOfDayVisible: scene.isTimeOfDayVisible,
      // WHY: the progress marker (GA-18) of an unstarted task would cover the middle of a short body.
      isProgressMarkerVisible: false,
      zoomX: scene.zoomX,
      scrollDate: scene.scrollDate,
      scrollDayOffset: scene.scrollDayOffset,
      scrollTaskGroupId: TASK_GROUP_A,
      scrollGroupOffset: 0,
    },
    documentStamp: template['documentStamp'],
    changeLog: [],
  } as unknown as Document
}

// WHY: SG-2 -- judged between S-577 and S-578.
const HOUR_SNAP: Scene = {
  start: '2026-10-14T09:00:00',
  finish: '2026-10-14T12:00:00',
  isTimeOfDayVisible: true,
  zoomX: zoomXFor((S_577 + S_578) / 2),
  scrollDate: '2026-10-14',
  scrollDayOffset: 0.25,
}

// WHY: SG-3 -- judged over S-578, kept under the FR-016 zoomX ceiling S-55 by staying near S-578.
const HALF_HOUR_SNAP: Scene = {
  ...HOUR_SNAP,
  zoomX: zoomXFor(S_578 * 1.3),
}

const SCREEN: FrameEnvironment = { width: 1400, height: 700, appHeaderHeight: 0, scrollbarThickness: 0 }

const realRaf = (globalThis as Record<string, unknown>)['requestAnimationFrame']

afterEach(() => {
  if (realRaf === undefined) delete (globalThis as Record<string, unknown>)['requestAnimationFrame']
  else (globalThis as Record<string, unknown>)['requestAnimationFrame'] = realRaf
})

interface Stage {
  readonly loop: FrameLoop
  send(input: HumanInput): void
  selection(): Selection
  tasks(): readonly Task[]
}

function stage(scene: Scene): Stage {
  const waiting: ((time: number) => void)[] = []
  ;(globalThis as Record<string, unknown>)['requestAnimationFrame'] = (callback: (time: number) => void): number =>
    waiting.push(callback)
  const drain = (): void => {
    for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) {
      for (const callback of waiting.splice(0, waiting.length)) callback(turn)
    }
  }
  const surface: ScreenSurface = {
    showScreenView: () => undefined,
    readDialogueInput: () => null,
    readFieldCommit: () => null,
    readScreenPartAt: (): ScreenPart | null => null,
  }
  const wiring: ScreenWiring = { surface, language: 'en' }
  const loop = frameLoop({ showSvg: () => undefined } as never, fixtureDocument(scene), SCREEN, wiring, undefined, () => undefined)
  drain()
  return {
    loop,
    send: (input) => {
      loop.receiveInput(input)
      drain()
    },
    selection: () => loop.agentApiSeams().source.readSnapshot().selection as unknown as Selection,
    tasks: () => loop.document().schedule.tasks,
  }
}

const NO_MODIFIERS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }
const CTRL_SHIFT: Partial<InputModifiers> = { ctrl: true, shift: true }
const PLAIN: Partial<InputModifiers> = {}

const pointer = (phase: PointerPhase, at: Point, modifiers: Partial<InputModifiers> = {}): PointerInput => ({
  kind: 'pointer',
  phase,
  button: 'left',
  x: at.x,
  y: at.y,
  modifiers: { ...NO_MODIFIERS, ...modifiers },
  clickCount: 1,
})

const frameOf = (loop: FrameLoop) => {
  const values = loop.current()
  if (values === null) throw new Error('the loop has run no frame')
  return values
}

function boxOf(bar: BarGeometry | null, what: string): ScreenRect {
  if (bar === null) throw new Error(`${what} was not drawn`)
  const points: readonly Point[] = bar.form === 'outline' ? bar.points : [bar.from, bar.to]
  const xs = points.map((one) => one.x)
  const ys = points.map((one) => one.y)
  const x = Math.min(...xs)
  const y = Math.min(...ys)
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y }
}

const planBox = (loop: FrameLoop, uid: number): ScreenRect => {
  const found = frameOf(loop).geometry.tasks.find((one) => one.taskUid === uid)
  if (found === undefined) throw new Error(`Task ${uid} is not drawn`)
  return boxOf(found.plan, `the plan of Task ${uid}`)
}

const hitAt = (loop: FrameLoop, at: Point): Hit | null => itemAtPointer(frameOf(loop).geometry, at.x, at.y, grabSizesOf())

// WHY: the three grabs of a task body -- table T-270 PE-1 / PE-6 through T-266 GA-9 / GA-14 / GA-15.
const BODY_GRABS = ['GA-9', 'GA-14', 'GA-15']

const bodyOf = (loop: FrameLoop, uid: number): Point => {
  const box = planBox(loop, uid)
  const at = { x: box.x + box.width / 2, y: box.y + box.height / 2 }
  const hit = hitAt(loop, at)
  expect(hit?.item.kind, `the body point of task ${uid} hits a task`).toBe('task')
  expect(BODY_GRABS, `the body point of task ${uid} is a body grab`).toContain(hit?.grab as string)
  return at
}

const pxPerDay = (loop: FrameLoop): number => frameOf(loop).layout.pxPerDay

const groupY = (loop: FrameLoop, taskGroupId: string): number => {
  const found = frameOf(loop).layout.taskGroups.find((one) => one.taskGroupId === taskGroupId)
  if (found === undefined) throw new Error(`the frame drew no task group ${taskGroupId}`)
  return found.y
}

// WHY: a travel of a number of calendar days (fractions allowed) across, and from task group A to `to` down.
const travel = (loop: FrameLoop, days: number, to: string = TASK_GROUP_A): Point => ({
  x: days * pxPerDay(loop),
  y: groupY(loop, to) - groupY(loop, TASK_GROUP_A),
})

const hours = (count: number): number => count / 24

const click = (built: Stage, at: Point): void => {
  built.send(pointer('move', at))
  built.send(pointer('down', at))
  built.send(pointer('up', at))
}

const taskOf = (built: Stage, uid: number): Task => {
  const found = built.tasks().find((one) => one.uid === uid)
  if (found === undefined) throw new Error(`no task ${uid}`)
  return found
}

const newTasks = (before: readonly Task[], after: readonly Task[]): readonly Task[] => {
  const old = new Set(before.map((one) => one.uid))
  return after.filter((one) => !old.has(one.uid))
}

const theCopy = (before: readonly Task[], after: readonly Task[]): Task => {
  const found = newTasks(before, after)
  if (found.length !== 1) throw new Error(`expected one copy; found ${found.length}`)
  return found[0] as Task
}

const groupOf = (built: Stage, uid: number): string | undefined =>
  built.loop.document().schedule.taskGroupMembers.find((one) => one.taskUid === uid)?.taskGroupId

const planOf = (one: Task) => ({ start: one.start, finish: one.finish })

const selectedUids = (built: Stage): number[] =>
  (built.selection() as unknown as { readonly items: readonly { kind: string; uid: number }[] }).items
    .filter((one) => one.kind === 'task')
    .map((one) => one.uid)

const selectSource = (built: Stage): void => {
  click(built, bodyOf(built.loop, SOURCE))
  expect(selectedUids(built), 'SL-2: a click on the body picks the task').toEqual([SOURCE])
}

const PICKED_SOURCE: Selection = { items: [{ kind: 'task', uid: SOURCE }], isOrdered: true } as unknown as Selection

function contextOf(built: Stage): InputContext {
  const values = frameOf(built.loop)
  return {
    document: built.loop.document(),
    layout: values.layout,
    geometry: values.geometry,
    regions: values.regions,
    screen: emptyScreenSession.screen,
    selection: PICKED_SOURCE,
    zoomStep: 3,
    zoomMin: NOT_STORED_ZOOM_BOUNDS['S-97'],
    zoomMax: NOT_STORED_ZOOM_BOUNDS['S-98'],
    pressed: null,
    isTextEntryUnsettled: false,
    isSurfaceStanding: false,
    dualCursorFollowing: null,
    today: '2026-10-01',
    newTaskGroupId: 'task-group-minted-outside',
    newCommentBoxId: 'comment-box-minted-outside',
    newHighlightBoxId: 'highlight-box-minted-outside',
  } as unknown as InputContext
}

const CTRL_SHIFT_ALT: Partial<InputModifiers> = { ctrl: true, shift: true, alt: true }
const SHIFT: Partial<InputModifiers> = { shift: true }
const ALT: Partial<InputModifiers> = { alt: true }
const SHIFT_ALT: Partial<InputModifiers> = { shift: true, alt: true }

// WHY: the intermediate move carries the release-time keys by default, as a hand holding the key does.
function dragWith(
  built: Stage,
  from: Point,
  by: Point,
  pressed: Partial<InputModifiers>,
  released: Partial<InputModifiers>,
  moveCarriesRelease = true,
): void {
  const to = { x: from.x + by.x, y: from.y + by.y }
  built.send(pointer('move', from, pressed))
  built.send(pointer('down', from, pressed))
  built.send(pointer('move', to, moveCarriesRelease ? released : pressed))
  built.send(pointer('up', to, released))
}

const hasKind = (writes: readonly DocumentCommand[], kind: string): boolean =>
  writes.some((one) => (one as unknown as { kind: string }).kind === kind)

// WHY: the release is read through the translator with the press row the press gets -- no premise on which row that is.
function writesOfDrag(
  scene: Scene,
  days: number,
  to: string,
  pressed: Partial<InputModifiers>,
  released: Partial<InputModifiers>,
): readonly DocumentCommand[] {
  const built = stage(scene)
  const context = contextOf(built)
  const from = bodyOf(built.loop, SOURCE)
  const by = travel(built.loop, days, to)
  const down = pointer('down', from, pressed)
  const hit = hitAt(built.loop, from)
  const press: PointerPress = { at: down, hit, on: null, pressRow: pressedRowOf({ at: down, hit }, context) }
  const up = pointer('up', { x: from.x + by.x, y: from.y + by.y }, released) as HumanInput
  const action = commandFromInput(up, { ...context, pressed: press }).action as unknown as {
    kind?: string
    writes?: readonly (readonly DocumentCommand[])[]
  } | null
  return action?.kind === 'changeDocument' && action.writes !== undefined ? action.writes.flat() : []
}

const settingsOf = (scene: Scene): DocumentSettings =>
  ({ ...SETTINGS_DEFAULTS, isTimeOfDayVisible: scene.isTimeOfDayVisible, zoomX: scene.zoomX }) as unknown as DocumentSettings

// WHY: a pull of 2 h 20 min makes the hour snap (11:00) and the 1-minute snap (11:20) differ.
const PULL_DAYS = hours(2 + 20 / 60)

describe('premise: the scenes sit on the T-378 rows they are named after', () => {
  it.each([
    ['SG-2', HOUR_SNAP, 60],
    ['SG-3', HALF_HOUR_SNAP, 30],
  ])('%s', (_name, scene, minutes) => {
    const built = stage(scene)
    expect(snapMinutesOf(pxPerDay(built.loop), settingsOf(scene), false)).toBe(minutes)
    expect(PULL_DAYS * pxPerDay(built.loop), 'premise: the pull is past S-208').toBeGreaterThan(S_208)
  })

  it('SG-4: Alt asks for the 1-minute unit', () => {
    const built = stage(HOUR_SNAP)
    expect(snapMinutesOf(pxPerDay(built.loop), settingsOf(HOUR_SNAP), true)).toBe(1)
  })
})

describe('FR-103 / T-378 SG-4 -- Alt is read at release, not at press', () => {
  it.each([true, false])('FR-103 -- pressed without Alt, released with Alt (move carries Alt: %s): the start lands on a 1-minute step', (carries) => {
    const built = stage(HOUR_SNAP)
    dragWith(built, bodyOf(built.loop, SOURCE), travel(built.loop, PULL_DAYS), PLAIN, ALT, carries)
    expect(planOf(taskOf(built, SOURCE))).toEqual({ start: '2026-10-14T11:20:00', finish: '2026-10-14T14:20:00' })
  })

  it.each([true, false])('FR-103 -- pressed with Alt, released without Alt (move carries Alt: %s): the start lands on the hour', (carries) => {
    const built = stage(HOUR_SNAP)
    dragWith(built, bodyOf(built.loop, SOURCE), travel(built.loop, PULL_DAYS), ALT, PLAIN, carries)
    expect(planOf(taskOf(built, SOURCE))).toEqual({ start: '2026-10-14T11:00:00', finish: '2026-10-14T14:00:00' })
  })

  it('FR-103 contrast -- pressed and released without Alt: the hour unit', () => {
    const built = stage(HOUR_SNAP)
    dragWith(built, bodyOf(built.loop, SOURCE), travel(built.loop, PULL_DAYS), PLAIN, PLAIN)
    expect(planOf(taskOf(built, SOURCE))).toEqual({ start: '2026-10-14T11:00:00', finish: '2026-10-14T14:00:00' })
  })

  it('FR-103 contrast -- pressed and released with Alt: the 1-minute unit (MK-17)', () => {
    const built = stage(HOUR_SNAP)
    dragWith(built, bodyOf(built.loop, SOURCE), travel(built.loop, PULL_DAYS), ALT, ALT)
    expect(planOf(taskOf(built, SOURCE))).toEqual({ start: '2026-10-14T11:20:00', finish: '2026-10-14T14:20:00' })
  })
})

describe('FR-107 / MK-16 -- a Shift-only body drag keeps the dates whatever the snap unit', () => {
  const RELEASES: readonly [string, Partial<InputModifiers>][] = [
    ['Shift held', SHIFT],
    ['Shift and Alt held (1-minute snap)', SHIFT_ALT],
    ['only Alt held', ALT],
    ['nothing held', PLAIN],
  ]
  const SCENES: readonly [string, Scene][] = [
    ['SG-2 hour tier', HOUR_SNAP],
    ['SG-3 30-minute tier', HALF_HOUR_SNAP],
  ]

  describe.each(SCENES)('%s', (_tier, scene) => {
    it.each(RELEASES)('MK-16 -- pulled across and one task group down, released with %s: the dates stay, the task group changes', (_name, released) => {
      const built = stage(scene)
      const before = taskOf(built, SOURCE)
      dragWith(built, bodyOf(built.loop, SOURCE), travel(built.loop, PULL_DAYS, TASK_GROUP_B), SHIFT, released)
      expect(planOf(taskOf(built, SOURCE))).toEqual({ start: before.start, finish: before.finish })
      expect(groupOf(built, SOURCE), 'FR-107: only the task group moves').toBe(TASK_GROUP_B)
    })

    it.each(RELEASES)('MK-16 -- pulled across only, released with %s: nothing in the document changes', (_name, released) => {
      const built = stage(scene)
      const before = built.tasks()
      dragWith(built, bodyOf(built.loop, SOURCE), travel(built.loop, PULL_DAYS), SHIFT, released)
      expect(built.tasks()).toEqual(before)
      expect(groupOf(built, SOURCE)).toBe(TASK_GROUP_A)
    })
  })

  it('MK-16 -- the same holds for a selected task', () => {
    const built = stage(HOUR_SNAP)
    selectSource(built)
    const before = taskOf(built, SOURCE)
    dragWith(built, bodyOf(built.loop, SOURCE), travel(built.loop, PULL_DAYS, TASK_GROUP_B), SHIFT, SHIFT_ALT)
    expect(planOf(taskOf(built, SOURCE))).toEqual({ start: before.start, finish: before.finish })
    expect(groupOf(built, SOURCE)).toBe(TASK_GROUP_B)
  })
})

describe('CY-5 / CY-11 / MK-15 -- a Ctrl+Shift copy keeps the dates; Alt at release does not change that', () => {
  it.each([
    ['Ctrl+Shift', CTRL_SHIFT],
    ['Ctrl+Shift+Alt', CTRL_SHIFT_ALT],
  ])('CY-5 -- pressed with Ctrl+Shift, released with %s at the hour tier: the copy has the original start and finish', (_name, released) => {
    const built = stage(HOUR_SNAP)
    selectSource(built)
    const before = built.tasks()
    dragWith(built, bodyOf(built.loop, SOURCE), travel(built.loop, PULL_DAYS, TASK_GROUP_B), CTRL_SHIFT, released)
    const copy = theCopy(before, built.tasks())
    expect(planOf(copy)).toEqual({ start: HOUR_SNAP.start, finish: HOUR_SNAP.finish })
    expect(groupOf(built, copy.uid), 'CY-6: the copy sits in the task group pulled to').toBe(TASK_GROUP_B)
    expect(planOf(taskOf(built, SOURCE)), 'the original stays').toEqual({ start: HOUR_SNAP.start, finish: HOUR_SNAP.finish })
  })

  it('CY-5 -- the Alt-at-release copy writes one pasteTasks with an amount of 0', () => {
    const writes = writesOfDrag(HOUR_SNAP, PULL_DAYS, TASK_GROUP_B, CTRL_SHIFT, CTRL_SHIFT_ALT)
    const pastes = writes.filter((one) => (one as unknown as { kind: string }).kind === 'pasteTasks')
    expect(pastes.length).toBe(1)
    expect((pastes[0] as unknown as { landing: { shiftMinutes: number } }).landing.shiftMinutes).toBe(0)
  })

  it('CY-11 -- Alt held at the release only (no task group change) copies nothing, as CY-9 says for amount 0', () => {
    const built = stage(HOUR_SNAP)
    selectSource(built)
    const before = built.tasks()
    dragWith(built, bodyOf(built.loop, SOURCE), travel(built.loop, PULL_DAYS), CTRL_SHIFT, CTRL_SHIFT_ALT)
    expect(built.tasks()).toEqual(before)
  })
})

describe('MK-15 / MK-12 -- a press with Ctrl+Shift+Alt on a selected task body does not copy', () => {
  it.each([
    ['across and one task group down', PULL_DAYS, TASK_GROUP_B],
    ['across only', PULL_DAYS, TASK_GROUP_A],
  ])('MK-15 -- %s: no new task appears', (_name, days, to) => {
    const built = stage(HOUR_SNAP)
    selectSource(built)
    const before = built.tasks()
    dragWith(built, bodyOf(built.loop, SOURCE), travel(built.loop, days, to), CTRL_SHIFT_ALT, CTRL_SHIFT_ALT)
    expect(newTasks(before, built.tasks())).toEqual([])
  })

  it('MK-12 -- the release writes no pasteTasks', () => {
    const writes = writesOfDrag(HOUR_SNAP, PULL_DAYS, TASK_GROUP_B, CTRL_SHIFT_ALT, CTRL_SHIFT_ALT)
    expect(hasKind(writes, 'pasteTasks')).toBe(false)
  })

  it('MK-12 -- releasing Alt before the end does not turn the press into a copy (CY-11)', () => {
    const writes = writesOfDrag(HOUR_SNAP, PULL_DAYS, TASK_GROUP_B, CTRL_SHIFT_ALT, CTRL_SHIFT)
    expect(hasKind(writes, 'pasteTasks')).toBe(false)
  })
})

// WHY: WCAG 2.1 contrast of two colors rounded to 8-bit sRGB (CF-6); the cells are #rrggbb or hsl(H S% L%).
function rgbOf(cell: string): readonly [number, number, number] {
  const hex = /^#([0-9a-f]{6})$/i.exec(cell.trim())
  if (hex !== null) {
    const value = parseInt(hex[1] as string, 16)
    return [(value >> 16) & 255, (value >> 8) & 255, value & 255]
  }
  const hsl = /^hsla?\(\s*([\d.]+)[\s,]+([\d.]+)%[\s,]+([\d.]+)%/.exec(cell.trim())
  if (hsl === null) throw new Error(`cannot read the color cell ${cell}`)
  const h = Number(hsl[1])
  const s = Number(hsl[2]) / 100
  const l = Number(hsl[3]) / 100
  const a = s * Math.min(l, 1 - l)
  const channel = (n: number): number => {
    const k = (n + h / 30) % 12
    return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))))
  }
  return [channel(0), channel(8), channel(4)]
}

function luminanceOf(cell: string): number {
  const [r, g, b] = rgbOf(cell).map((one) => {
    const unit = one / 255
    return unit <= 0.04045 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4
  }) as [number, number, number]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrastOf(first: string, second: string): number {
  const [light, dark] = [luminanceOf(first), luminanceOf(second)].sort((a, b) => b - a) as [number, number]
  return (light + 0.05) / (dark + 0.05)
}

describe('NFR-007 / T-236 S-587 -- the dark pointed-at mark holds 3:1 on the planned bar fill S-155', () => {
  it('S-587 -- dark theme, theme hue 60, not monochrome: ratio >= 3 (T-366 solves S-155 first)', () => {
    const fill = colorOf('S-155', 60, true, false)
    const mark = colorOf('S-587', 60, true, false)
    expect(contrastOf(mark, fill), `S-587 ${mark} on S-155 ${fill}`).toBeGreaterThanOrEqual(3)
  })

  it.each([58, 60, 62, 69])('S-587 -- dark theme, theme hue %i: ratio >= 3', (hue) => {
    const fill = colorOf('S-155', hue, true, false)
    const mark = colorOf('S-587', hue, true, false)
    expect(contrastOf(mark, fill), `S-587 ${mark} on S-155 ${fill}`).toBeGreaterThanOrEqual(3)
  })
})
