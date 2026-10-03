// CR-656 spec-only cases: a Shift-only body drag keeps the dates (MK-16, T-270); Ctrl + Shift copies with 0 days (PTD-7, CY-5).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import {
  commandFromInput,
  pressRowOf,
  selectionFromInput,
  type HumanInput,
  type InputContext,
  type InputModifiers,
  type PointerButton,
  type PointerInput,
  type PointerPhase,
  type PointerPress,
} from '../../src/adapter/input-command-translator/input-command-translator'
import type { ScreenPart, ScreenSurface } from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import { SETTINGS_CONSTANTS } from '../../src/entity/document-model/document-settings/document-settings'
import type { Task } from '../../src/entity/document-model/schedule/schedule'
import type { Selection } from '../../src/entity/document-model/selection/selection'
import { grabSizesOf, itemAtPointer, type Hit } from '../../src/entity/layout-engine/item-hit-area/item-hit-area'
import type { BarGeometry, Point } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import type { RowPlacement } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import type { ScreenRect } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { frameLoop, type FrameEnvironment, type FrameLoop, type ScreenWiring } from '../../src/framework/single-html-shell/frame-loop'
import { emptyScreenSession } from '../../src/use-case/advance-screen-session/advance-screen-session'
import { NOT_STORED_ZOOM_BOUNDS, type DocumentCommand } from '../../src/use-case/edit-document/edit-document'
import { specTable, unbroken } from '../contract/spec-table'

const SPEC = join(process.cwd(), 'docs', 'spec')
const REQUIREMENTS = unbroken(readFileSync(join(SPEC, '01-04-requirements.md'), 'utf8'))

const flat = (text: string): string => text.replace(/<br\s*\/?>/g, '').replace(/\*\*/g, '').replace(/\s*\n\s*/g, '')

const rowOf = (table: string, id: string) => {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

const rowText = (table: string, id: string): string => flat(rowOf(table, id).cells.join(' | '))

// WHY: the boundary between a click and a drag is the settings row S-208 of table T-206, never a number held here.
const S_208 = ((): number => {
  const numbers = (rowOf('T-206', 'S-208').by['既定'] ?? '').match(/\d+(?:\.\d+)?/g) ?? []
  if (numbers.length !== 1) throw new Error('S-208 does not hold one number')
  return Number(numbers[0])
})()

describe('CR-656 -- the rows these cases are driven by', () => {
  it('MK-16: a Shift-only left drag from a task body is PTD-3, moves rows only, and adds an unselected task', () => {
    const text = rowText('T-023', 'MK-16')
    expect(text).toContain('タスクの本体の上から始める、`Shift` だけを伴う左ドラッグ')
    expect(text).toContain('表 T-023a の `PTD-3`')
    expect(text).toContain('日付を変えず、行だけを移す')
    expect(text).toContain('選択に含まれないタスクから始めれば、そのタスクを選択に足し、選択の全部を移す（表 T-023c の `SL-4`）')
  })

  it('MK-7 / MK-15: Ctrl alone or Ctrl + Shift; with Shift the copy keeps the dates (CY-5)', () => {
    expect(rowText('T-023', 'MK-7')).toContain('`Ctrl` だけか `Ctrl` ＋ `Shift` を伴うドラッグ')
    const mk15 = rowText('T-023', 'MK-15')
    expect(mk15).toContain('`Ctrl` だけか `Ctrl` ＋ `Shift` を伴う左ドラッグ')
    expect(mk15).toContain('`Shift` を伴えば日付を変えずに写す')
  })

  it('MK-12: only Alt + drag is unassigned; Ctrl + Shift + drag is assigned (MK-7, MK-15)', () => {
    const row = rowOf('T-023', 'MK-12')
    expect(flat(row.cells[0] ?? '')).toBe('割当の無い修飾キー付きドラッグ（`Alt` ＋ ドラッグ）')
    expect(rowText('T-023', 'MK-12')).toContain('`Ctrl` ＋ `Shift` ＋ ドラッグは割当を持つ（`MK-7` ・ `MK-15`）')
    expect(rowText('T-023', 'MK-12')).toContain('当たっていれば `PTD-3` によりそのものへの操作になる')
  })

  it('PTD-7 / PTD-1: Ctrl alone or Ctrl + Shift; the background and unselected things pan even with Shift', () => {
    expect(rowText('T-023a', 'PTD-7')).toContain('`Ctrl` だけか `Ctrl` ＋ `Shift` を伴う左ドラッグで、`Dual Cursor` モード中でなく')
    const ptd1 = rowText('T-023a', 'PTD-1')
    expect(ptd1).toContain('中ボタンドラッグ、または `Ctrl` だけか `Ctrl` ＋ `Shift` を伴う左ドラッグ')
    expect(ptd1).toContain('背景と、選択に含まれないものの上から始めた `Ctrl` ドラッグは、`Shift` を伴っても本行である')
  })

  it('PTD-3: a Shift-only drag from a task body keeps the dates and moves rows only', () => {
    expect(rowText('T-023a', 'PTD-3')).toContain('`Shift` だけを伴ってタスクの本体から引いたときは、日付を変えずに行だけを移す（表 T-023 の `MK-16`')
  })

  it('SL-4: a Shift body drag adds the pressed task and moves the whole selection; a click still adds or removes one', () => {
    const text = rowText('T-023c', 'SL-4')
    expect(text).toContain('クリックなら 1 つずつ増減し')
    expect(text).toContain('タスクの本体を引けば、押したタスクを選択に足し（含まれていれば選択はそのまま）、選択の全部を動かす（表 T-023 の `MK-16`）')
    expect(text).toContain('引いたときは増減しない')
    expect(text).toContain('`Shift` で引いたときは、`SL-7a` のとおり掴んだ 1 つに絞る')
  })

  it('T-270: a Shift-only body drag applies only the vertical part and reads Shift at the press', () => {
    expect(REQUIREMENTS).toContain(
      '`Shift` だけを伴って本体（`PE-1` ・ `PE-6`）を引いたときは、横の成分を当てず、縦だけを当てること（MUST） —— 選択の全部を、横は 0 日、縦は同じ行数だけ動かし、予定も実績も日付を変えない（表 T-023 の `MK-16`）。',
    )
    expect(REQUIREMENTS).toContain('押したタスクが選択に含まれないときは、それを選択に足してから全部を動かすこと（MUST）（表 T-023c の `SL-4`）。')
    expect(REQUIREMENTS).toContain('`Shift` は押した時点で読み、押しているあいだに押しても離しても変えないこと（MUST）')
  })

  it('CY-1 / CY-2 / CY-5 / CY-7 / CY-11: Ctrl + Shift copies with 0 days, unstarted, judged at the press', () => {
    expect(rowText('T-308', 'CY-1')).toContain('`Ctrl` だけか `Ctrl` ＋ `Shift` を伴って押した、選択に含まれるタスク（マイルストーンを含む）の本体')
    expect(rowText('T-308', 'CY-2')).toContain('表 T-023a の `PTD-1` のパンである')
    expect(rowText('T-308', 'CY-5')).toContain('`Shift` も伴って押したときは日数を 0 とし、写しの予定を写し元と同じ日付とすること（MUST）')
    expect(rowText('T-308', 'CY-7')).toContain('写しは実績を持たない')
    expect(rowText('T-308', 'CY-11')).toContain('押した時点の修飾キーで決め、押しているあいだに `Ctrl` や `Shift` を押しても離しても変えないこと（MUST）')
  })

  it('FR-036: the help lists MK-16 among the T-023 rows', () => {
    expect(REQUIREMENTS).toContain('表 T-023 の `MK-2` / `MK-5` / `MK-7` / `MK-15` / `MK-16` と')
  })

  it('S-208: the row of table T-206 is a positive number', () => {
    expect(S_208).toBeGreaterThan(0)
  })
})

// WHY: six rows, one task per row; ROOT is in progress and has a WBS child, so a kept actual is observable.
const ROW_A = '65600000-0000-4000-8000-00000000000a'
const ROW_B = '65600000-0000-4000-8000-00000000000b'
const ROW_C = '65600000-0000-4000-8000-00000000000c'
const ROW_D = '65600000-0000-4000-8000-00000000000d'
const ROW_E = '65600000-0000-4000-8000-00000000000e'
const ROW_F = '65600000-0000-4000-8000-00000000000f'
const ROWS = [ROW_A, ROW_B, ROW_C, ROW_D, ROW_E, ROW_F]

const ROOT = 1
const CHILD = 2
const OTHER = 3
const STONE = 4
const PAUSED = 5
const HALTED = 6

const ACTUAL_DURATION = 'ActualDuration'

const task = (over: Partial<Task> & { readonly uid: number }): Task =>
  ({
    wbsParentUid: null,
    wbsOrder: over.uid,
    name: `task ${over.uid}`,
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
    carry: { [ACTUAL_DURATION]: 'PT16H0M0S' },
    carryElements: [],
    ...over,
  }) as unknown as Task

const TEMPLATE = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
) as Record<string, Record<string, unknown>>

const PX_PER_DAY_AT_1X = 20

function fixtureDocument(): Document {
  const template = structuredClone(TEMPLATE)
  const schedule = template['schedule'] as Record<string, unknown>
  const inProgress = { actualStart: '2026-04-06', stop: '2026-04-07', resumeValid: true, percentComplete: 20 }
  return {
    schemaVersion: template['schemaVersion'],
    schedule: {
      project: { ...(schedule['project'] as Record<string, unknown>), uidHighWaterMark: 100, statusDate: null },
      calendars: schedule['calendars'],
      tasks: [
        task({ uid: ROOT, name: 'Root', start: '2026-04-06', finish: '2026-04-17', ...inProgress }),
        task({
          uid: CHILD,
          name: 'Child',
          wbsParentUid: ROOT,
          start: '2026-04-08',
          finish: '2026-04-10',
          actualStart: '2026-04-08',
          actualFinish: '2026-04-10',
          resumeValid: false,
          percentComplete: 100,
        }),
        task({ uid: OTHER, name: 'Other', start: '2026-04-06', finish: '2026-04-17', ...inProgress }),
        task({ uid: STONE, name: 'Stone', milestone: true, start: '2026-04-20', finish: '2026-04-20' }),
        task({ uid: PAUSED, name: 'Paused', start: '2026-04-21', finish: '2026-04-24' }),
        task({ uid: HALTED, name: 'Halted', start: '2026-04-21', finish: '2026-04-24' }),
      ],
      resources: [],
      assignments: [],
      taskGroups: ROWS.map((id, order) => ({
        id,
        parentId: null,
        label: `row ${order}`,
        derivedFromTaskUid: null,
        order,
        treeState: 'auto',
        color: null,
        minHeight: null,
      })),
      taskGroupMembers: [
        { taskUid: ROOT, groupId: ROW_A },
        { taskUid: PAUSED, groupId: ROW_B },
        { taskUid: CHILD, groupId: ROW_C },
        { taskUid: STONE, groupId: ROW_D },
        { taskUid: OTHER, groupId: ROW_E },
        { taskUid: HALTED, groupId: ROW_F },
      ],
      taskVisuals: [
        { taskUid: STONE, shapeKind: 'milestone', milestoneGlyph: 'diamond', fillColor: null, strokeColor: null, strokeWidthPx: null },
      ],
      commentBoxes: [],
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
    },
    documentSettings: {
      ...(template['documentSettings'] as Record<string, unknown>),
      zoomX: PX_PER_DAY_AT_1X / SETTINGS_CONSTANTS.pxPerDayAt1x,
    },
    documentStamp: template['documentStamp'],
    changeLog: [],
  } as unknown as Document
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

function stage(): Stage {
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
    hasUnsettledTextEntry: () => false,
    readScreenPartAt: (): ScreenPart | null => null,
  }
  const wiring: ScreenWiring = { surface, language: 'en' }
  const loop = frameLoop({ showSvg: () => undefined } as never, fixtureDocument(), SCREEN, wiring, undefined, () => undefined)
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
const CTRL: Partial<InputModifiers> = { ctrl: true }
const SHIFT: Partial<InputModifiers> = { shift: true }
const CTRL_SHIFT: Partial<InputModifiers> = { ctrl: true, shift: true }
const ALT: Partial<InputModifiers> = { alt: true }

const pointer = (
  phase: PointerPhase,
  at: Point,
  modifiers: Partial<InputModifiers> = {},
  button: PointerButton = 'left',
): PointerInput => ({
  kind: 'pointer',
  phase,
  button,
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
  const at = { x: box.x + box.width * 0.75, y: box.y + box.height / 2 }
  const hit = hitAt(loop, at)
  expect(hit?.item.kind, `the body point of task ${uid} hits a task`).toBe('task')
  expect(BODY_GRABS, `the body point of task ${uid} is a body grab`).toContain(hit?.grab as string)
  return at
}

const planEndOf = (loop: FrameLoop, uid: number): Point => {
  const box = planBox(loop, uid)
  const at = { x: box.x + box.width + 2, y: box.y + box.height / 2 }
  const hit = hitAt(loop, at)
  expect(BODY_GRABS, `the end point of task ${uid} is not a body grab`).not.toContain(hit?.grab as string)
  return at
}

const groundOf = (loop: FrameLoop): Point => {
  const area = frameOf(loop).regions.rowArea
  return { x: area.x + area.width - 4, y: area.y + area.height - 4 }
}

const drawnRow = (loop: FrameLoop, groupId: string): RowPlacement => {
  const found = frameOf(loop).layout.rows.find((one) => one.groupId === groupId)
  if (found === undefined) throw new Error(`the frame drew no row ${groupId}`)
  return found
}

const pxPerDay = (loop: FrameLoop): number => frameOf(loop).layout.pxPerDay

// WHY: a travel of whole days across, and from the row `from` down to the row `to` (both drawn rows).
const travel = (loop: FrameLoop, days: number, from: string, to: string): Point => ({
  x: days * pxPerDay(loop),
  y: drawnRow(loop, to).y - drawnRow(loop, from).y,
})

const click = (built: Stage, at: Point, modifiers: Partial<InputModifiers> = {}): void => {
  built.send(pointer('move', at, modifiers))
  built.send(pointer('down', at, modifiers))
  built.send(pointer('up', at, modifiers))
}

function drag(
  built: Stage,
  from: Point,
  by: Point,
  atPress: Partial<InputModifiers> = {},
  afterPress: Partial<InputModifiers> = atPress,
): void {
  const to = { x: from.x + by.x, y: from.y + by.y }
  built.send(pointer('move', from, atPress))
  built.send(pointer('down', from, atPress))
  built.send(pointer('move', to, afterPress))
  built.send(pointer('up', to, afterPress))
}

const taskRef = (uid: number) => ({ kind: 'task', uid })

const groupOf = (document: Document, uid: number): string | undefined =>
  document.schedule.taskGroupMembers.find((one) => one.taskUid === uid)?.groupId

const taskOf = (built: Stage, uid: number): Task => {
  const found = built.tasks().find((one) => one.uid === uid)
  if (found === undefined) throw new Error(`no task ${uid}`)
  return found
}

const day = (value: string | null): string | null => (value === null ? null : value.slice(0, 10))

const datesOf = (one: Task) => ({ start: day(one.start), finish: day(one.finish) })

const actualsOf = (one: Task) => ({
  actualStart: one.actualStart,
  stop: one.stop,
  actualFinish: one.actualFinish,
  resume: one.resume,
  resumeValid: one.resumeValid,
  percentComplete: one.percentComplete,
  hasActualDuration: Object.prototype.hasOwnProperty.call(one.carry, ACTUAL_DURATION),
})

const UNSTARTED = {
  actualStart: null,
  stop: null,
  actualFinish: null,
  resume: null,
  resumeValid: false,
  percentComplete: 0,
  hasActualDuration: false,
}

const newTasks = (before: readonly Task[], after: readonly Task[]): readonly Task[] => {
  const old = new Set(before.map((one) => one.uid))
  return after.filter((one) => !old.has(one.uid))
}

const copyNamed = (before: readonly Task[], after: readonly Task[], name: string): Task => {
  const found = newTasks(before, after).filter((one) => one.name === name)
  if (found.length !== 1) throw new Error(`expected one copy of ${name}; found ${found.length}`)
  return found[0] as Task
}

const uidsOf = (selection: Selection): number[] =>
  (selection as unknown as { readonly items: readonly { kind: string; uid: number }[] }).items
    .filter((one) => one.kind === 'task')
    .map((one) => one.uid)
    .sort((a, b) => a - b)

const selectRoot = (built: Stage): void => {
  click(built, bodyOf(built.loop, ROOT))
  expect(built.selection().items, 'SL-2: a click on the body picks the task').toEqual([taskRef(ROOT)])
}

const selectRootAndOther = (built: Stage): void => {
  selectRoot(built)
  click(built, bodyOf(built.loop, OTHER), SHIFT)
  expect(uidsOf(built.selection()), 'SL-4: a Shift click adds one').toEqual([ROOT, OTHER])
}

const PICKED_ROOT: Selection = { items: [taskRef(ROOT)], ordered: true } as unknown as Selection

function contextOf(built: Stage, selection: Selection): InputContext {
  const values = frameOf(built.loop)
  return {
    document: built.loop.document(),
    layout: values.layout,
    geometry: values.geometry,
    regions: values.regions,
    screen: emptyScreenSession.screen,
    selection,
    zoomStep: 3,
    zoomMin: NOT_STORED_ZOOM_BOUNDS['S-97'],
    zoomMax: NOT_STORED_ZOOM_BOUNDS['S-98'],
    pressed: null,
    isTextEntryUnsettled: false,
    isSurfaceStanding: false,
    dualCursorFollowing: null,
    today: '2026-04-01',
    newGroupId: 'row-minted-outside',
    newCommentBoxId: 'comment-box-minted-outside',
    newHighlightBoxId: 'highlight-box-minted-outside',
  } as unknown as InputContext
}

function pressAt(built: Stage, context: InputContext, at: Point, modifiers: Partial<InputModifiers>): PointerPress {
  const down = pointer('down', at, modifiers)
  const hit = hitAt(built.loop, at)
  return { at: down, hit, on: null, pressRow: pressRowOf({ at: down, hit }, context) }
}

interface Released {
  readonly writes: readonly DocumentCommand[]
  readonly selection: Selection
}

function release(
  built: Stage,
  selection: Selection,
  from: Point,
  by: Point,
  atPress: Partial<InputModifiers>,
  atRelease: Partial<InputModifiers> = atPress,
): Released {
  const context = contextOf(built, selection)
  const pressed = pressAt(built, context, from, atPress)
  const up = pointer('up', { x: from.x + by.x, y: from.y + by.y }, atRelease) as HumanInput
  const held = { ...context, pressed }
  const answer = commandFromInput(up, held)
  const action = answer.action as unknown as { kind?: string; writes?: readonly (readonly DocumentCommand[])[] } | null
  const writes = action?.kind === 'changeDocument' && action.writes !== undefined ? action.writes.flat() : []
  return { writes, selection: selectionFromInput(up, held) }
}

const kindsOf = (writes: readonly DocumentCommand[]): string[] => writes.map((one) => (one as unknown as { kind: string }).kind)

const loose = (one: DocumentCommand): Record<string, unknown> => one as unknown as Record<string, unknown>

describe('MK-16 / T-270: a Shift-only body drag moves rows and keeps the dates (translator)', () => {
  it('MK-16 / PTD-3: a Shift press on the body of a selected task is press row PTD-3', () => {
    const built = stage()
    const context = contextOf(built, PICKED_ROOT)
    expect(pressAt(built, context, bodyOf(built.loop, ROOT), SHIFT).pressRow).toBe('PTD-3')
  })

  it('MK-16 / T-270: 3 days right and 1 row down writes no setTaskPlanDates and moves the task to the next row', () => {
    const built = stage()
    const done = release(built, PICKED_ROOT, bodyOf(built.loop, ROOT), travel(built.loop, 3, ROW_A, ROW_B), SHIFT)
    expect(kindsOf(done.writes)).not.toContain('setTaskPlanDates')
    const moves = done.writes.filter((one) => loose(one)['kind'] === 'moveTaskToTaskGroup')
    expect(moves.length, 'MK-16: the row move is written').toBeGreaterThan(0)
    expect(JSON.stringify(moves)).toContain(ROW_B)
  })

  it('MK-16 / T-270 contrast: the same drag without Shift writes setTaskPlanDates', () => {
    const built = stage()
    const done = release(built, PICKED_ROOT, bodyOf(built.loop, ROOT), travel(built.loop, 3, ROW_A, ROW_B), {})
    expect(kindsOf(done.writes)).toContain('setTaskPlanDates')
  })

  it('MK-16 / SL-4: a Shift drag from an unselected task keeps both selected after the release', () => {
    const built = stage()
    const done = release(built, PICKED_ROOT, bodyOf(built.loop, OTHER), travel(built.loop, -2, ROW_E, ROW_F), SHIFT)
    expect(kindsOf(done.writes)).not.toContain('setTaskPlanDates')
    expect(uidsOf(done.selection)).toEqual([ROOT, OTHER])
  })
})

describe('MK-16 / T-270 / SL-4: a Shift-only body drag through the shell', () => {
  it('MK-16 / T-270: 3 days right and 1 row down moves the row, keeps plan and actual dates', () => {
    const built = stage()
    selectRoot(built)
    const before = taskOf(built, ROOT)
    drag(built, bodyOf(built.loop, ROOT), travel(built.loop, 3, ROW_A, ROW_B), SHIFT)
    const after = taskOf(built, ROOT)
    expect(groupOf(built.loop.document(), ROOT), 'MK-16: the task moves one row down').toBe(ROW_B)
    expect(datesOf(after), 'T-270: the plan dates do not change').toEqual(datesOf(before))
    expect(actualsOf(after), 'T-270: the actual does not change').toEqual(actualsOf(before))
    expect(groupOf(built.loop.document(), CHILD), 'CY-6: an unselected descendant does not move').toBe(ROW_C)
    expect(uidsOf(built.selection()), 'T-270: the selection stays').toEqual([ROOT])
  })

  it('MK-16 / T-270: 4 days left and 2 rows down still keeps every date', () => {
    const built = stage()
    selectRoot(built)
    const before = taskOf(built, ROOT)
    drag(built, bodyOf(built.loop, ROOT), travel(built.loop, -4, ROW_A, ROW_C), SHIFT)
    const after = taskOf(built, ROOT)
    expect(groupOf(built.loop.document(), ROOT)).toBe(ROW_C)
    expect(datesOf(after)).toEqual(datesOf(before))
    expect(actualsOf(after)).toEqual(actualsOf(before))
  })

  it('MK-16 / T-270 contrast: the same drag without Shift shifts the plan by the days dragged', () => {
    const built = stage()
    selectRoot(built)
    const before = taskOf(built, ROOT)
    drag(built, bodyOf(built.loop, ROOT), travel(built.loop, 3, ROW_A, ROW_B), {})
    const after = taskOf(built, ROOT)
    expect(groupOf(built.loop.document(), ROOT)).toBe(ROW_B)
    expect(day(after.start), 'PE-1: the plan moves without Shift').not.toBe(day(before.start))
  })

  it('MK-16 / SL-4 / T-270: a Shift drag from an unselected task adds it and moves both rows, dates kept', () => {
    const built = stage()
    selectRoot(built)
    const rootBefore = taskOf(built, ROOT)
    const otherBefore = taskOf(built, OTHER)
    drag(built, bodyOf(built.loop, OTHER), travel(built.loop, 2, ROW_E, ROW_F), SHIFT)
    const document = built.loop.document()
    expect(groupOf(document, OTHER), 'the pressed task moves one row').toBe(ROW_F)
    expect(groupOf(document, ROOT), 'the rest of the selection moves the same rows').toBe(ROW_B)
    expect(datesOf(taskOf(built, ROOT))).toEqual(datesOf(rootBefore))
    expect(datesOf(taskOf(built, OTHER))).toEqual(datesOf(otherBefore))
    expect(actualsOf(taskOf(built, OTHER))).toEqual(actualsOf(otherBefore))
    expect(uidsOf(built.selection()), 'SL-4: both are selected after the release').toEqual([ROOT, OTHER])
  })

  it('SL-4: a Shift click (no drag past S-208) on a selected task removes it and writes nothing', () => {
    const built = stage()
    selectRootAndOther(built)
    const before = built.tasks()
    click(built, bodyOf(built.loop, OTHER), SHIFT)
    expect(uidsOf(built.selection())).toEqual([ROOT])
    expect(built.tasks()).toEqual(before)
  })

  it('SL-4: a Shift press moved less than S-208 is still a click and toggles one', () => {
    const built = stage()
    selectRoot(built)
    const before = built.tasks()
    const half = Math.max(0, Math.floor(S_208 / 2))
    drag(built, bodyOf(built.loop, OTHER), { x: half, y: 0 }, SHIFT)
    expect(uidsOf(built.selection())).toEqual([ROOT, OTHER])
    expect(built.tasks()).toEqual(before)
  })
})

describe('SL-4 / SL-7a: a Shift drag of an end narrows and resizes, as before', () => {
  it('SL-7a: a Shift drag of the plan end of a selected task narrows to it and changes its finish', () => {
    const built = stage()
    selectRootAndOther(built)
    const rootBefore = taskOf(built, ROOT)
    const otherBefore = taskOf(built, OTHER)
    drag(built, planEndOf(built.loop, ROOT), travel(built.loop, 3, ROW_A, ROW_A), SHIFT)
    expect(uidsOf(built.selection()), 'SL-7a: narrowed to the grabbed one').toEqual([ROOT])
    expect(day(taskOf(built, ROOT).finish), 'PE-3: the end lands on the release day').not.toBe(day(rootBefore.finish))
    expect(groupOf(built.loop.document(), ROOT)).toBe(ROW_A)
    expect(taskOf(built, OTHER)).toEqual(otherBefore)
  })
})

describe('PTD-7 / CY-1 / CY-5 / MK-15: Ctrl + Shift on the selection copies with a day shift of 0', () => {
  it('PTD-7 / CY-1: a Ctrl + Shift left press on the body of a selected task is press row PTD-7', () => {
    const built = stage()
    const context = contextOf(built, PICKED_ROOT)
    expect(pressAt(built, context, bodyOf(built.loop, ROOT), CTRL_SHIFT).pressRow).toBe('PTD-7')
  })

  it('CY-5: a Ctrl + Shift drag 3 days right and 1 row down writes pasteTaskSubtree with dayShift 0', () => {
    const built = stage()
    const done = release(built, PICKED_ROOT, bodyOf(built.loop, ROOT), travel(built.loop, 3, ROW_A, ROW_B), CTRL_SHIFT)
    expect(kindsOf(done.writes)).toEqual(['pasteTaskSubtree'])
    const landing = loose(done.writes[0] as DocumentCommand)['landing'] as { dayShift: number; groupIdOf: Record<number, string> }
    expect(landing.dayShift).toBe(0)
    expect(landing.groupIdOf[ROOT], 'CY-6: the copy still lands one row down').toBe(ROW_B)
  })

  it('CY-5 contrast: a Ctrl-only drag of the same travel carries a day shift of 3', () => {
    const built = stage()
    const done = release(built, PICKED_ROOT, bodyOf(built.loop, ROOT), travel(built.loop, 3, ROW_A, ROW_B), CTRL)
    expect(kindsOf(done.writes)).toEqual(['pasteTaskSubtree'])
    const landing = loose(done.writes[0] as DocumentCommand)['landing'] as { dayShift: number }
    expect(landing.dayShift).toBe(3)
  })

  it('CY-5 / CY-7: through the shell the copy keeps the source plan dates and is unstarted; the source stays', () => {
    const built = stage()
    selectRoot(built)
    const before = built.tasks()
    drag(built, bodyOf(built.loop, ROOT), travel(built.loop, 3, ROW_A, ROW_B), CTRL_SHIFT)
    const after = built.tasks()
    expect(newTasks(before, after).map((one) => one.name).sort()).toEqual(['Child', 'Root'])
    const rootCopy = copyNamed(before, after, 'Root')
    const source = before.find((one) => one.uid === ROOT) as Task
    expect(datesOf(rootCopy), 'CY-5: the copy has the same dates as its source').toEqual(datesOf(source))
    expect(groupOf(built.loop.document(), rootCopy.uid)).toBe(ROW_B)
    expect(actualsOf(rootCopy), 'CY-7: the copy is unstarted').toEqual(UNSTARTED)
    expect(after.filter((one) => before.some((old) => old.uid === one.uid)), 'the sources do not move').toEqual(before)
  })
})

describe('PTD-1 / CY-2 / CY-1: Ctrl + Shift elsewhere is the pan', () => {
  it('PTD-1: a Ctrl + Shift left press on the background is PTD-1', () => {
    const built = stage()
    const context = contextOf(built, PICKED_ROOT)
    expect(pressAt(built, context, groundOf(built.loop), CTRL_SHIFT).pressRow).toBe('PTD-1')
  })

  it('PTD-1 / CY-2: a Ctrl + Shift left press on a task not in the selection is PTD-1', () => {
    const built = stage()
    const context = contextOf(built, PICKED_ROOT)
    expect(pressAt(built, context, bodyOf(built.loop, OTHER), CTRL_SHIFT).pressRow).toBe('PTD-1')
  })

  it('CY-1 / PTD-1: a Ctrl + Shift left press on an end of the selected task is PTD-1', () => {
    const built = stage()
    const context = contextOf(built, PICKED_ROOT)
    expect(pressAt(built, context, planEndOf(built.loop, ROOT), CTRL_SHIFT).pressRow).toBe('PTD-1')
  })

  it('CY-2: a Ctrl + Shift drag through the shell on an unselected task copies nothing and keeps the selection', () => {
    const built = stage()
    selectRoot(built)
    const before = built.tasks()
    drag(built, bodyOf(built.loop, OTHER), travel(built.loop, 3, ROW_E, ROW_F), CTRL_SHIFT)
    expect(built.tasks()).toEqual(before)
    expect(built.selection().items).toEqual([taskRef(ROOT)])
  })
})

describe('MK-12: Alt + drag has no assignment of its own', () => {
  it('MK-12 / PTD-3: an Alt press on a selected body is neither the copy nor the pan but PTD-3', () => {
    const built = stage()
    const context = contextOf(built, PICKED_ROOT)
    expect(pressAt(built, context, bodyOf(built.loop, ROOT), ALT).pressRow).toBe('PTD-3')
  })

  it('MK-12: an Alt drag on a selected body writes no copy', () => {
    const built = stage()
    const done = release(built, PICKED_ROOT, bodyOf(built.loop, ROOT), travel(built.loop, 3, ROW_A, ROW_B), ALT)
    expect(kindsOf(done.writes)).not.toContain('pasteTaskSubtree')
  })
})

describe('CY-11 / T-270: Shift is read at the press', () => {
  it('CY-11 / T-270: pressed with Shift, released without it -- the dates are kept (translator)', () => {
    const built = stage()
    const done = release(built, PICKED_ROOT, bodyOf(built.loop, ROOT), travel(built.loop, 3, ROW_A, ROW_B), SHIFT, {})
    expect(kindsOf(done.writes)).not.toContain('setTaskPlanDates')
    expect(kindsOf(done.writes)).toContain('moveTaskToTaskGroup')
  })

  it('CY-11 / T-270: pressed without Shift, released with it -- the dates move (translator)', () => {
    const built = stage()
    const done = release(built, PICKED_ROOT, bodyOf(built.loop, ROOT), travel(built.loop, 3, ROW_A, ROW_B), {}, SHIFT)
    expect(kindsOf(done.writes)).toContain('setTaskPlanDates')
  })

  it('CY-11 / T-270: through the shell, Shift let go while held still keeps the dates', () => {
    const built = stage()
    selectRoot(built)
    const before = taskOf(built, ROOT)
    drag(built, bodyOf(built.loop, ROOT), travel(built.loop, 3, ROW_A, ROW_B), SHIFT, {})
    expect(groupOf(built.loop.document(), ROOT)).toBe(ROW_B)
    expect(datesOf(taskOf(built, ROOT))).toEqual(datesOf(before))
  })

  it('CY-11 / T-270: through the shell, Shift pressed while held still moves the dates', () => {
    const built = stage()
    selectRoot(built)
    const before = taskOf(built, ROOT)
    drag(built, bodyOf(built.loop, ROOT), travel(built.loop, 3, ROW_A, ROW_B), {}, SHIFT)
    expect(groupOf(built.loop.document(), ROOT)).toBe(ROW_B)
    expect(day(taskOf(built, ROOT).start)).not.toBe(day(before.start))
  })

  it('CY-11 / CY-5: a Ctrl + Shift copy press released with Ctrl only still copies with dayShift 0', () => {
    const built = stage()
    const done = release(built, PICKED_ROOT, bodyOf(built.loop, ROOT), travel(built.loop, 3, ROW_A, ROW_B), CTRL_SHIFT, CTRL)
    expect(kindsOf(done.writes)).toEqual(['pasteTaskSubtree'])
    expect((loose(done.writes[0] as DocumentCommand)['landing'] as { dayShift: number }).dayShift).toBe(0)
  })
})
