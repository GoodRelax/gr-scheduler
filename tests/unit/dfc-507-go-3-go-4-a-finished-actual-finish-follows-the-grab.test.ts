// DFC-507: GO-3 and GO-4 of table T-245 (FR-103) move actualFinish on a finished Task or milestone.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import {
  commandFromFieldCommit,
  type HumanInput,
  type InputContext,
  type InputModifiers,
  type PointerInput,
  type PointerPhase,
} from '../../src/adapter/input-command-translator/input-command-translator'
import type {
  FieldCommit,
  ScreenPart,
  ScreenSurface,
} from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import { textOfDay, type Task } from '../../src/entity/document-model/schedule/schedule'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import { emptyScreenSession } from '../../src/use-case/advance-screen-session/advance-screen-session'
import { NOT_STORED_SIZES } from '../../src/entity/layout-engine/item-hit-area/item-hit-area'
import type {
  BarGeometry,
  Point,
  TaskGeometry,
} from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import { dateAtX } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import {
  frameLoop,
  type FrameEnvironment,
  type FrameLoop,
  type ScreenWiring,
} from '../../src/framework/single-html-shell/frame-loop'
import {
  NOT_STORED_ZOOM_BOUNDS,
  editTask,
  type DocumentCommand,
  type TaskCommand,
} from '../../src/use-case/edit-document/edit-document'
import { bare, specTable, unbroken } from '../contract/spec-table'
import { validateDocument } from '../fixtures/grs-document'
import { DEFAULT_DISPLAY_RATIO } from '../fixtures/display-scale'

const DEFAULT_ROW_NAME_FIXTURE = 'fixture default row name'

const REQUIREMENTS = unbroken(
  readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'),
)

const FR_011_RIGHT_END_IS_A_POSITION =
  '⭐ **本要求の「実績バーの右端」は位置であって終了日ではない** —— 実績の最後の日の翌暦日の列の左端であり、実績の終了日は最後の日そのものである。'

const FR_011_MILESTONE_READING =
  '⚠️ マイルストーンにはこの読みを当てない —— 長さを持たない点なので（`S-130`、表 T-012 の `SH-5`）、実績の終了日は `actualStart` と同じ日である。'

const FR_011_NOT_THE_FINISH_DAY = '⚠️ **「右端」を終了日と読んではならない（MUST NOT）**'

const FR_011_PANEL_IS_ANOTHER_FACE =
  '⚠️ プロパティパネル（`FR-006` の表 T-016）と `Agent API`（`FR-028`）は値として編集する別の面であり、この禁止の対象ではない —— 禁じているのは**掴んだつもりが実績を動かす**事故であって、値を明示して入れる操作ではない。'

const FR_006_STATEMENT =
  'プロパティパネルが選択を出しているとき、`GRS` は、**表 T-016 の項目**をプロパティパネルに出し、**同表が読み取り専用と記した項目を除いて**編集できるようにすること。'

const GO_3_WHICH_COLUMN =
  '`actualFinish` を持つとき（表 T-019 の `PA-5`）は `actualFinish`、持たないときは `stop` に置く。'

const GO_4_LAST_DAY = '持っているほうの最後の日（`actualFinish` または `stop`）も、置き直した `actualStart` と同じ日とする'

const T_245 = specTable('T-245')
const T_021A = specTable('T-021a')
const T_016 = specTable('T-016')

const rowCells = (table: ReturnType<typeof specTable>, id: string): string => {
  const found = table.rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table.id} has no row ${id}`)
  return found.cells.join(' | ')
}

const TEMPLATE = JSON.parse(
  readFileSync(
    join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'),
    'utf8',
  ),
) as Record<string, unknown>

const ROW_A = '5b000000-0000-4000-8000-000000000001'
const ROW_B = '5b000000-0000-4000-8000-000000000002'
const ROW_C = '5b000000-0000-4000-8000-000000000003'

const FINISHED_UID = 1
const FINISHED_MILESTONE_UID = 2
const RUNNING_UID = 3

const day = (d: number): string => `2026-04-${String(d).padStart(2, '0')}T00:00:00`

const dayPart = (value: string | null | undefined): string => {
  if (value === null || value === undefined) throw new Error('the column this case reads holds nothing')
  return value.slice(0, 10)
}

const S_91 = NOT_STORED_SIZES['S-257']

function task(over: Partial<Task> & { readonly uid: number }): Task {
  return {
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
  } as unknown as Task
}

const group = (id: string, order: number, label: string): unknown => ({
  id,
  parentId: null,
  label,
  derivedFromTaskUid: null,
  order,
  treeState: 'auto', editGroup: null,
  color: null,
  height: null,
})

function fixtureDocument(): Document {
  const template = structuredClone(TEMPLATE) as any
  return {
    schemaVersion: template.schemaVersion,
    schedule: {
      project: { ...structuredClone(template.schedule.project), uidHighWaterMark: 100, statusDate: null },
      calendars: structuredClone(template.schedule.calendars),
      tasks: [
        task({
          uid: FINISHED_UID,
          name: 'Alpha',
          start: day(6),
          finish: day(24),
          actualStart: day(9),
          actualFinish: day(14),
          resumeValid: false,
          percentComplete: 29,
        }),
        task({
          uid: FINISHED_MILESTONE_UID,
          name: 'Beta',
          start: day(13),
          finish: day(13),
          milestone: true,
          actualStart: day(17),
          actualFinish: day(17),
          resumeValid: false,
          percentComplete: 100,
        }),
        task({
          uid: RUNNING_UID,
          name: 'Gamma',
          start: day(6),
          finish: day(24),
          actualStart: day(9),
          stop: day(14),
          resumeValid: true,
          percentComplete: 29,
        }),
      ],
      resources: [],
      assignments: [],
      taskGroups: [group(ROW_A, 0, 'A'), group(ROW_B, 1, 'B'), group(ROW_C, 2, 'C')],
      taskGroupMembers: [
        { taskUid: FINISHED_UID, groupId: ROW_A, stackOrder: null },
        { taskUid: FINISHED_MILESTONE_UID, groupId: ROW_B, stackOrder: null },
        { taskUid: RUNNING_UID, groupId: ROW_C, stackOrder: null },
      ],
      taskVisuals: [],
      commentBoxes: [],
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
    },
    documentSettings: {
      ...structuredClone(template.documentSettings),
      pxPerDayAt1x: 20 / DEFAULT_DISPLAY_RATIO,
      scrollDate: day(1),
      scrollGroupId: ROW_A,
      scrollDayOffset: 0,
      scrollGroupOffset: 0,
    },
    documentStamp: structuredClone(template.documentStamp),
    changeLog: [],
  } as unknown as Document
}

// see FR-011, T-019
function lastDayOf(one: Task): string {
  return dayPart(one.actualFinish ?? one.stop)
}

const SCREEN: FrameEnvironment = { width: 1200, height: 700, appHeaderHeight: 0, scrollbarThickness: 0 }

const realRaf = (globalThis as any).requestAnimationFrame

function host(): { readonly surface: { showSvg(svg: string): void }; runAnimationFrames(): void } {
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
      expect(waiting.length, 'the loop kept asking for animation frames').toBe(0)
    },
  }
}

function screenPane(): ScreenWiring {
  const surface: ScreenSurface = {
    showScreenView: () => undefined,
    readDialogueInput: () => null,
    readFieldCommit: () => null,
    hasUnsettledTextEntry: () => false,
    readScreenPartAt: (): ScreenPart | null => null,
  }
  return { surface, language: 'en' }
}

afterEach(() => {
  if (realRaf === undefined) delete (globalThis as any).requestAnimationFrame
  else (globalThis as any).requestAnimationFrame = realRaf
})

const NO_MODIFIERS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }

const pointer = (phase: PointerPhase, x: number, y: number): PointerInput => ({
  kind: 'pointer',
  phase,
  button: 'left',
  x,
  y,
  modifiers: { ...NO_MODIFIERS },
  clickCount: 1,
})

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
  pen.runAnimationFrames()
  return { loop, send }
}

const frameOf = (loop: FrameLoop) => {
  const values = loop.current()
  if (values === null) throw new Error('the loop has run no frame')
  return values
}

const taskOf = (loop: FrameLoop, uid: number): Task => {
  const found = loop.document().schedule.tasks.find((one) => one.uid === uid)
  if (found === undefined) throw new Error(`the document has no Task ${uid}`)
  return found
}

const pxPerDay = (loop: FrameLoop): number => frameOf(loop).layout.pxPerDay

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

function actualBox(loop: FrameLoop, uid: number): Box {
  const bar: BarGeometry | null = drawnTask(loop, uid).actual
  if (bar === null) throw new Error(`Task ${uid}'s actual figure is not drawn`)
  const points: readonly Point[] =
    bar.form === 'outline'
      ? bar.points
      : [bar.from, bar.to, ...(bar.head ?? []), ...bar.dots.map((one) => one.at)]
  const xs = points.map((one) => one.x)
  const ys = points.map((one) => one.y)
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) }
}

const midY = (box: Box): number => (box.y0 + box.y1) / 2
const midX = (box: Box): number => (box.x0 + box.x1) / 2

const dayUnder = (loop: FrameLoop, x: number): string => {
  const found = dateAtX(frameOf(loop).layout, x)
  if (found === null) throw new Error('the frame drew no time axis under that point')
  return dayPart(textOfDay(found))
}

function grab(built: Stage, at: Point, releaseX: number): void {
  built.send(pointer('down', at.x, at.y))
  built.send(pointer('move', releaseX, at.y))
  built.send(pointer('up', releaseX, at.y))
}

// see GA-4
function actualEndReleasedAt(uid: number, k: number): { readonly released: string; readonly before: Task; readonly after: Task } {
  const built = stage()
  const before = structuredClone(taskOf(built.loop, uid))
  const actual = actualBox(built.loop, uid)
  const releaseX = actual.x1 + (k + 0.5) * pxPerDay(built.loop)
  const released = dayUnder(built.loop, releaseX)
  grab(built, { x: actual.x1 - S_91 / 2, y: midY(actual) }, releaseX)
  return { released, before, after: taskOf(built.loop, uid) }
}

// see GA-3
function actualStartReleasedAt(uid: number, k: number): { readonly before: Task; readonly after: Task } {
  const built = stage()
  const before = structuredClone(taskOf(built.loop, uid))
  const actual = actualBox(built.loop, uid)
  const releaseX = actual.x0 + (k + 0.5) * pxPerDay(built.loop)
  grab(built, { x: actual.x0 + S_91 / 2, y: midY(actual) }, releaseX)
  return { before, after: taskOf(built.loop, uid) }
}

// see GA-16
function milestoneReleasedAt(k: number): { readonly released: string; readonly before: Task; readonly after: Task } {
  const built = stage()
  const before = structuredClone(taskOf(built.loop, FINISHED_MILESTONE_UID))
  const figure = actualBox(built.loop, FINISHED_MILESTONE_UID)
  const releaseX = midX(figure) + (k + 0.25) * pxPerDay(built.loop)
  const released = dayUnder(built.loop, releaseX)
  grab(built, { x: midX(figure), y: midY(figure) }, releaseX)
  return { released, before, after: taskOf(built.loop, FINISHED_MILESTONE_UID) }
}

describe('DFC-507 -- the manuscript this file is driven by', () => {
  it('GO-3 still says: `actualFinish` を持つとき（表 T-019 の `PA-5`）は `actualFinish`、持たないときは `stop` に置く', () => {
    const go3 = rowCells(T_245, 'GO-3')
    expect(go3).toContain(GO_3_WHICH_COLUMN)
    expect(go3).toContain('長さの数え方と床（`S-129`）は `FR-011` が持ち、本行は独自の数え方を持たない')
  })

  it('GO-4 still says: 持っているほうの最後の日も、置き直した `actualStart` と同じ日とする', () => {
    expect(rowCells(T_245, 'GO-4')).toContain(GO_4_LAST_DAY)
  })

  it('PV-2 and FR-011 still read actualFinish as the last day, not the right end, and a milestone finish as its start', () => {
    expect(rowCells(T_021A, 'PV-2')).toContain('`actualFinish` ＝ `stop`、`stop` ＝ 空（`FR-011`。')
    expect(rowCells(T_021A, 'PV-2')).toContain('`actualFinish` は実績の最後の日そのものであり、実績バーの右端の位置ではない）')
    expect(REQUIREMENTS).toContain(FR_011_RIGHT_END_IS_A_POSITION)
    expect(REQUIREMENTS).toContain(FR_011_MILESTONE_READING)
    expect(REQUIREMENTS).toContain(FR_011_NOT_THE_FINISH_DAY)
  })

  it('FR-006 and PR-6 still let a person type `actualFinish`, and FR-011 still exempts that face', () => {
    expect(REQUIREMENTS).toContain(FR_006_STATEMENT)
    expect(REQUIREMENTS).toContain(FR_011_PANEL_IS_ANOTHER_FACE)
    const pr6 = T_016.rows.find((one) => one.id === 'PR-6')
    expect(pr6?.cells.map(bare)).toContain('actualFinish')
    expect(pr6?.cells.some((cell) => cell.includes('読み取り専用'))).toBe(false)
  })
})

describe('the fixture these cases stand on', () => {
  it('is a `GRS JSON` document', () => {
    expect(validateDocument(fixtureDocument()).errors).toEqual([])
  })

  it('holds the finished last days in actualFinish (Tue 14; the milestone Fri 17) and the running one in stop', () => {
    const built = stage()
    const finished = taskOf(built.loop, FINISHED_UID)
    const milestone = taskOf(built.loop, FINISHED_MILESTONE_UID)
    expect(lastDayOf(finished)).toBe('2026-04-14')
    expect(finished.stop).toBeNull()
    expect(dayPart(milestone.actualFinish)).toBe(dayPart(milestone.actualStart))
    expect(taskOf(built.loop, RUNNING_UID).actualFinish).toBeNull()
  })
})

describe('table T-245 GO-3 -- a finished Task, its actual end grabbed', () => {
  it('lengthened: `actualFinish` is the released day', () => {
    const { released, before, after } = actualEndReleasedAt(FINISHED_UID, 5)
    expect(released, 'premise').toBe('2026-04-20')
    expect(after.stop, 'GO-3: a finished Task holds its last day in actualFinish, not stop').toBeNull()
    expect(dayPart(after.actualFinish), GO_3_WHICH_COLUMN).toBe(released)
    expect(dayPart(after.actualFinish)).not.toBe(dayPart(before.actualFinish))
  })

  it('shortened: `actualFinish` is the released day', () => {
    const { released, before, after } = actualEndReleasedAt(FINISHED_UID, -2)
    expect(released, 'premise').toBe('2026-04-13')
    expect(dayPart(after.actualFinish) < dayPart(before.actualFinish), 'premise: the grab did land').toBe(true)
    expect(dayPart(after.actualFinish), GO_3_WHICH_COLUMN).toBe(released)
  })

  it('stays finished: `actualStart` stands, `actualFinish` is not emptied, `resumeValid` stays false', () => {
    const { before, after } = actualEndReleasedAt(FINISHED_UID, 5)
    expect(after.actualStart, 'GO-3 据え置く値: `actualStart`').toBe(before.actualStart)
    expect(after.actualFinish).not.toBeNull()
    expect(after.resumeValid).toBe(false)
  })

  it('control, GO-3 on a running Task: the released day goes to `stop` and `actualFinish` stays empty', () => {
    const { released, after } = actualEndReleasedAt(RUNNING_UID, 5)
    expect(dayPart(after.stop), GO_3_WHICH_COLUMN).toBe(released)
    expect(after.actualFinish).toBeNull()
  })

  it('control, GA-3 on the finished Task: the last day stands in `actualFinish`', () => {
    const { before, after } = actualStartReleasedAt(FINISHED_UID, -1)
    expect(after.actualStart, 'premise: the grab did land').not.toBe(before.actualStart)
    expect(dayPart(after.actualFinish)).toBe(dayPart(before.actualFinish))
    expect(after.stop).toBeNull()
  })
})

describe('table T-245 GO-4 -- a finished milestone, its actual figure grabbed', () => {
  it('moved later: `actualFinish` is the placed `actualStart`', () => {
    const { released, after } = milestoneReleasedAt(3)
    expect(released, 'premise').toBe('2026-04-20')
    expect(dayPart(after.actualStart), 'GO-4: `actualStart` ＝ 離した日').toBe(released)
    expect(dayPart(after.actualFinish), GO_4_LAST_DAY).toBe(
      dayPart(after.actualStart),
    )
    expect(after.stop, 'GO-4: the held last day is actualFinish, so stop stays empty').toBeNull()
  })

  it('moved earlier: `actualFinish` is the placed `actualStart`', () => {
    const { released, after } = milestoneReleasedAt(-2)
    expect(released, 'premise').toBe('2026-04-15')
    expect(dayPart(after.actualFinish), GO_4_LAST_DAY).toBe(dayPart(after.actualStart))
    expect(after.resumeValid).toBe(false)
  })
})

describe('FR-006 / PR-6 -- a finished Task whose actual finish is typed in the panel', () => {
  it('control: keeps the typed `actualFinish` -- 値を明示して入れる操作ではない (FR-011 exempts the panel from the grab rules)', () => {
    const built = stage()
    const values = frameOf(built.loop)
    const document = built.loop.document()
    const context = {
      document,
      layout: values.layout,
      geometry: values.geometry,
      regions: values.regions,
      screen: emptyScreenSession.screen,
      selection: emptySelection(),
      zoomStep: 3,
      zoomMin: NOT_STORED_ZOOM_BOUNDS['S-97'],
      zoomMax: NOT_STORED_ZOOM_BOUNDS['S-98'],
      pressed: null,
      isTextEntryUnsettled: false,
      isSurfaceStanding: false,
      dualCursorFollowing: null,
      today: '2026-04-30T00:00:00',
      newGroupId: 'row-minted-outside',
      newCommentBoxId: 'comment-box-minted-outside',
      newHighlightBoxId: 'highlight-box-minted-outside',
    } as unknown as InputContext
    const typed = '2026-04-16'
    expect(typed, 'premise: differs from the last day the fixture holds').not.toBe(
      lastDayOf(taskOf(built.loop, FINISHED_UID)),
    )
    const commit = {
      row: 'PR-6',
      key: { holder: 'task', uid: FINISHED_UID, column: 'actualFinish' },
      text: typed,
    } as unknown as FieldCommit

    const commands: readonly DocumentCommand[] = commandFromFieldCommit(commit, context)
    expect(commands.length, 'premise: the settled value became a command').toBeGreaterThan(0)
    let after = document
    for (const command of commands) {
      const result = editTask(after, command as TaskCommand, DEFAULT_ROW_NAME_FIXTURE)
      if (!result.ok) throw new Error(`the typed value was refused: ${JSON.stringify(result.refusals)}`)
      after = result.document
    }

    const finished = after.schedule.tasks.find((one) => one.uid === FINISHED_UID) as Task
    expect(dayPart(finished.actualFinish), 'FR-006: 同表が読み取り専用と記した項目を除いて編集できるようにすること').toBe(typed)
  })
})
