// H2 spec-only cases: an undrawn task cannot be selected (FR-081, table T-023c closing, JDG-288).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import type { Document } from '../../src/entity/document-model/document/document'
import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule, Task } from '../../src/entity/document-model/schedule/schedule'
import {
  emptySelection,
  lastPicked,
  selectionOfAll,
  selectionWith,
  type ItemRef,
  type Selection,
} from '../../src/entity/document-model/selection/selection'
import {
  grabSizesOf,
  isTaskDrawn,
  itemAtPointer,
  itemsInMarquee,
  selectionWithinDrawn,
} from '../../src/entity/layout-engine/item-hit-area/item-hit-area'
import {
  geometryFromLayout,
  type BarGeometry,
  type DummyGeometry,
  type ScheduleGeometry,
  type TaskGeometry,
} from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import { layoutFromSchedule } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import {
  regionsFromScreen,
  type ScreenEnvironment,
  type ScreenRect,
} from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { NOT_STORED_ZOOM_BOUNDS } from '../../src/use-case/edit-document/edit-document'
import {
  pressRowOf,
  selectionFromInput,
  type InputContext,
  type InputModifiers,
  type KeyInput,
  type PointerInput,
} from '../../src/adapter/input-command-translator/input-command-translator'
import { emptyScreenSession } from '../../src/use-case/advance-screen-session/advance-screen-session'

import { unbroken } from '../contract/spec-table'

const DRAWN_ONLY = '選択は、描かれている対象だけを指すこと（MUST）。'

const UNDRAWN_DEFINITION =
  '描かれていないタスクとは、表 T-202 の表示の可否（`FR-049`）によって、予定・実績・実績のダミー（表 T-240）のどれも描かれていないタスクと、描かれていない行に載るタスクである'

const UNDRAWN_ROWS =
  '描かれていない行とは、人が畳んだ行・隠した行の配下（表 T-015 の `HR-1a` / `HR-6`）と、行の軸の倍率（`FR-018`）で描かれていない行である。'

const NO_WAY_OF_PICKING =
  'そのタスクは、`SL-2` 〜 `SL-5` のどの選び方でも取らない —— 全選択（`SL-5`）も範囲選択（`SL-3`）も取らない。'

const PRUNED_AT_ONCE =
  'その時点で選択から外し、`SL-7b` の順序からも除く —— 除かないと、`FR-034` の「最後に選んだタスク」が見えないタスクになり、見えない日付へ揃う。'

const ONE_SIDE_HIDDEN = '予定と実績の片方だけを隠したタスクは、見えている図形で選べる。'

const SL_7B_KEEPS_ORDER = '| SL-7b | 順序 | **選んだ順序を保つこと（MUST）'

const SL_3_ENCLOSED_ONLY =
  '何にも当たらない場所からドラッグし、**矩形に完全に囲まれた対象だけを取ること（MUST）'

const JDG_288_USER_WORDS = '非表示にしたものは選択できないよね？'

const REQUIREMENTS = unbroken(
  readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8').replace(/\r\n/g, '\n'),
)

const RULINGS = readFileSync(
  join(process.cwd(), 'docs', 'development-records', 'rulings.md'),
  'utf8',
)

describe('the clauses are still written (FR-081, table T-023c, JDG-288)', () => {
  it.each([
    ['FR-081 T-023c closing: drawn objects only', DRAWN_ONLY],
    ['FR-081 T-023c closing: what an undrawn task is', UNDRAWN_DEFINITION],
    ['FR-081 T-023c closing: what an undrawn row is', UNDRAWN_ROWS],
    ['FR-081 T-023c closing: SL-2 .. SL-5 do not take it', NO_WAY_OF_PICKING],
    ['FR-081 T-023c closing: pruned at once, from the SL-7b order too', PRUNED_AT_ONCE],
    ['FR-081 T-023c closing: one side hidden still picks', ONE_SIDE_HIDDEN],
    ['SL-7b keeps the pick order', SL_7B_KEEPS_ORDER],
    ['SL-3 takes only what the rectangle fully encloses', SL_3_ENCLOSED_ONLY],
  ])('%s', (_title, clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })

  it('JDG-288 (1) still carries the user\'s own words', () => {
    expect(RULINGS).toContain(JDG_288_USER_WORDS)
  })
})

const BAND_TOP = 100
const BAND_HEIGHT = 20
const BAND_BOTTOM = BAND_TOP + BAND_HEIGHT
const BAR_LEFT = 200
const BAR_RIGHT = 300
const DUMMY_SIDE = 10
const MARKER_RADIUS = 4
const LABEL_WIDTH = 40

const BAR: BarGeometry = {
  form: 'outline',
  points: [
    { x: BAR_LEFT, y: BAND_TOP },
    { x: BAR_RIGHT, y: BAND_TOP },
    { x: BAR_RIGHT, y: BAND_BOTTOM },
    { x: BAR_LEFT, y: BAND_BOTTOM },
  ],
}

const DUMMY: DummyGeometry = {
  grab: 'GA-5',
  at: { x: BAR_LEFT, y: BAND_TOP },
  ink: { x: BAR_LEFT, y: BAND_TOP, width: DUMMY_SIDE, height: DUMMY_SIDE },
}

const taskGeometryOf = (taskUid: number, part: Partial<TaskGeometry> = {}): TaskGeometry => ({
  taskUid,
  shapeKind: 'rectangle',
  plan: null,
  actual: null,
  milestoneFigure: null,
  planEndsStandOnOneDay: false,
  guides: [],
  marker: null,
  resume: null,
  dummies: [],
  fadeHandles: [],
  label: null,
  assigneeLabel: null,
  ...part,
})

const drawnTask = (taskUid: number): TaskGeometry => taskGeometryOf(taskUid, { plan: BAR })

const geometryOf = (tasks: readonly TaskGeometry[], rest: Partial<ScheduleGeometry> = {}): ScheduleGeometry => ({
  tasks,
  dependencies: [],
  progressLine: [],
  statusLine: null,
  dualCursor: null,
  highlightBoxes: [],
  commentBoxes: [],
  ...rest,
})

const taskRef = (uid: number): ItemRef => ({ kind: 'task', uid })

const picked = (...items: readonly ItemRef[]): Selection =>
  items.reduce<Selection>((held, item) => selectionWith(held, item), emptySelection())

describe('FR-081 T-023c closing -- isTaskDrawn reads plan, actual and the actual dummy', () => {
  it('FR-081: a task with none of plan / actual / dummy drawn is not drawn', () => {
    expect(isTaskDrawn(taskGeometryOf(1))).toBe(false)
  })

  it('FR-081: labels and a marker alone do not make a task drawn (the definition names plan, actual, dummy)', () => {
    const labelsOnly = taskGeometryOf(1, {
      label: { x: BAR_RIGHT, y: BAND_TOP, width: LABEL_WIDTH, height: BAND_HEIGHT },
      assigneeLabel: { x: BAR_RIGHT, y: BAND_BOTTOM, width: LABEL_WIDTH, height: BAND_HEIGHT },
      marker: { symbol: 'PM-1', centre: { x: BAR_RIGHT, y: BAND_TOP }, radius: MARKER_RADIUS },
    })
    expect(isTaskDrawn(labelsOnly)).toBe(false)
  })

  it('FR-081 control: a drawn plan bar makes the task drawn', () => {
    expect(isTaskDrawn(taskGeometryOf(1, { plan: BAR }))).toBe(true)
  })

  it('FR-081 / FR-049: plan hidden, actual drawn -- the task is drawn and picked by the actual', () => {
    expect(isTaskDrawn(taskGeometryOf(1, { actual: BAR }))).toBe(true)
  })

  it('FR-081 / JDG-288: plan hidden with no actual still draws the dummy, so the task is drawn', () => {
    expect(isTaskDrawn(taskGeometryOf(1, { dummies: [DUMMY] }))).toBe(true)
  })
})

describe('FR-081 T-023c closing -- selectionWithinDrawn prunes undrawn tasks', () => {
  it('FR-081 control: nothing undrawn is selected -> the same selection comes back', () => {
    const selection = picked(taskRef(1), taskRef(2))
    const geometry = geometryOf([drawnTask(1), drawnTask(2)])
    expect(selectionWithinDrawn(selection, geometry)).toBe(selection)
  })

  it('FR-081 control: the empty selection comes back as it is', () => {
    const selection = emptySelection()
    expect(selectionWithinDrawn(selection, geometryOf([drawnTask(1)]))).toBe(selection)
  })

  it('FR-081 / FR-049: a selected task whose shapes are all hidden leaves the selection', () => {
    const selection = picked(taskRef(1), taskRef(2))
    const geometry = geometryOf([drawnTask(1), taskGeometryOf(2)])
    expect(selectionWithinDrawn(selection, geometry).items).toEqual([taskRef(1)])
  })

  it('FR-081 / HR-1a / HR-6 / FR-018: a selected task absent from the geometry (its row not drawn) leaves', () => {
    const selection = picked(taskRef(1), taskRef(3))
    const geometry = geometryOf([drawnTask(1)])
    expect(selectionWithinDrawn(selection, geometry).items).toEqual([taskRef(1)])
  })

  it('FR-081: when every selected task is undrawn, no task is left', () => {
    const selection = picked(taskRef(2), taskRef(3))
    const geometry = geometryOf([taskGeometryOf(2)])
    expect(selectionWithinDrawn(selection, geometry).items).toEqual([])
  })

  it('FR-081 / SL-7b: the tasks that stay keep the order they were picked in', () => {
    const selection = picked(taskRef(4), taskRef(2), taskRef(3), taskRef(1))
    const geometry = geometryOf([drawnTask(1), taskGeometryOf(2), drawnTask(4)])
    const kept = selectionWithinDrawn(selection, geometry)
    expect(kept.items).toEqual([taskRef(4), taskRef(1)])
    expect(kept.ordered).toBe(selection.ordered)
  })

  it('FR-081 / FR-034: the last-picked task, once undrawn, is not the task alignment reads', () => {
    const selection = picked(taskRef(1), taskRef(2))
    const geometry = geometryOf([drawnTask(1), taskGeometryOf(2)])
    expect(lastPicked(selection)).toEqual(taskRef(2))
    expect(lastPicked(selectionWithinDrawn(selection, geometry))).toEqual(taskRef(1))
  })

  it('FR-081 / SL-7b: pruning a selection that made no order (SL-3 / SL-5) does not make one', () => {
    const selection = selectionOfAll([taskRef(1), taskRef(2)])
    const kept = selectionWithinDrawn(selection, geometryOf([drawnTask(1), taskGeometryOf(2)]))
    expect(kept.items).toEqual([taskRef(1)])
    expect(kept.ordered).toBe(selection.ordered)
  })

  it('FR-081 / SL-1: drawn items of the other kinds stay, in their place, beside a pruned task', () => {
    const dependency: ItemRef = { kind: 'dependency', successorUid: 1, ordinal: 0 }
    const highlight: ItemRef = { kind: 'highlightBox', id: 'h1' }
    const comment: ItemRef = { kind: 'commentBox', id: 'c1' }
    const statusLine: ItemRef = { kind: 'statusLine' }
    const selection = picked(highlight, taskRef(2), dependency, comment, statusLine)
    const geometry = geometryOf([drawnTask(1), taskGeometryOf(2)], {
      dependencies: [{ predecessorUid: 1, successorUid: 1, linkType: 1, pattern: 'RP-1', points: [] }],
      statusLine: { x: BAR_LEFT, top: BAND_TOP, bottom: BAND_BOTTOM },
      highlightBoxes: [{ id: 'h1', box: { x: BAR_LEFT, y: BAND_TOP, width: DUMMY_SIDE, height: DUMMY_SIDE }, cornerRadiusPx: null }],
      commentBoxes: [{
        id: 'c1',
        anchor: { x: BAR_LEFT, y: BAND_TOP },
        body: { x: BAR_LEFT, y: BAND_TOP, width: DUMMY_SIDE, height: DUMMY_SIDE },
        lines: [],
        fontSize: DUMMY_SIDE,
      }],
    })
    expect(selectionWithinDrawn(selection, geometry).items).toEqual([highlight, dependency, comment, statusLine])
  })
})

const WHOLE_PLANE = 1_000_000
const EVERYWHERE: ScreenRect = { x: -WHOLE_PLANE, y: -WHOLE_PLANE, width: 2 * WHOLE_PLANE, height: 2 * WHOLE_PLANE }

const tasksIn = (items: readonly { readonly kind: string }[]): readonly unknown[] =>
  items.filter((one) => one.kind === 'task')

describe('FR-081 T-023c closing / SL-3 -- a range selection does not take an undrawn task', () => {
  it('SL-3 control: a drawn task inside the rectangle is taken', () => {
    expect(tasksIn(itemsInMarquee(geometryOf([drawnTask(1)]), EVERYWHERE))).toEqual([{ kind: 'task', taskUid: 1 }])
  })

  it('SL-3 / FR-081: an undrawn task whose labels and marker lie inside the rectangle is not taken', () => {
    const labelsOnly = taskGeometryOf(2, {
      label: { x: BAR_RIGHT, y: BAND_TOP, width: LABEL_WIDTH, height: BAND_HEIGHT },
      marker: { symbol: 'PM-1', centre: { x: BAR_RIGHT, y: BAND_TOP }, radius: MARKER_RADIUS },
    })
    expect(tasksIn(itemsInMarquee(geometryOf([drawnTask(1), labelsOnly]), EVERYWHERE)))
      .toEqual([{ kind: 'task', taskUid: 1 }])
  })
})

const nestedFrom = (flat: Readonly<Record<string, unknown>>): Record<string, unknown> => {
  const built: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(flat)) {
    const dot = key.indexOf('.')
    if (dot < 0) {
      built[key] = value
      continue
    }
    const head = key.slice(0, dot)
    const held = built[head]
    const group = (typeof held === 'object' && held !== null ? held : {}) as Record<string, unknown>
    group[key.slice(dot + 1)] = value
    built[head] = group
  }
  return built
}

const settingsOf = (part: Record<string, unknown> = {}): DocumentSettings =>
  ({
    ...nestedFrom(SETTINGS_DEFAULTS),
    scrollDate: '2026-01-01',
    scrollGroupId: 'g1',
    stackDirection: 'down',
    ...part,
  }) as unknown as DocumentSettings

const SCREEN_WIDTH = 1000
const SCREEN_HEIGHT = 700
const APP_HEADER_HEIGHT = 56
const SCROLLBAR_THICKNESS = 8
const ENV: ScreenEnvironment = {
  width: SCREEN_WIDTH,
  height: SCREEN_HEIGHT,
  appHeaderHeight: APP_HEADER_HEIGHT,
  scrollbarThickness: SCROLLBAR_THICKNESS,
}

const taskOf = (uid: number, start: string, finish: string, part: Record<string, unknown> = {}): Task =>
  ({
    uid,
    name: `task ${uid}`,
    start,
    finish,
    milestone: null,
    percentComplete: null,
    actualStart: null,
    stop: null,
    actualFinish: null,
    resume: null,
    resumeValid: null,
    fadeInDays: null,
    fadeOutDays: null,
    dependencies: [],
    ...part,
  }) as unknown as Task

interface RowState {
  readonly isCollapsed: boolean
  readonly isHidden: boolean
}

const OPEN: RowState = { isCollapsed: false, isHidden: false }

const scheduleOf = (g1: RowState = OPEN, g1a: RowState = OPEN, g2: RowState = OPEN): Schedule =>
  ({
    project: { calendarUid: null, statusDate: null, themeHue: 214, title: null, uidHighWaterMark: 10 },
    calendars: [],
    tasks: [
      taskOf(1, '2026-01-05', '2026-01-09'),
      taskOf(2, '2026-01-12', '2026-01-16'),
      taskOf(3, '2026-01-06', '2026-01-08'),
    ],
    resources: [],
    assignments: [],
    taskGroups: [
      { id: 'g1', parentId: null, label: 'g1', derivedFromTaskUid: null, order: 0, isKeptOpen: false, editGroup: null, color: null, height: null, ...g1 },
      { id: 'g1a', parentId: 'g1', label: 'g1a', derivedFromTaskUid: null, order: 0, isKeptOpen: false, editGroup: null, color: null, height: null, ...g1a },
      { id: 'g2', parentId: null, label: 'g2', derivedFromTaskUid: null, order: 1, isKeptOpen: false, editGroup: null, color: null, height: null, ...g2 },
    ],
    taskGroupMembers: [
      { groupId: 'g1', taskUid: 1 },
      { groupId: 'g1a', taskUid: 3 },
      { groupId: 'g2', taskUid: 2 },
    ],
    taskVisuals: [],
    commentBoxes: [],
    highlightBoxes: [],
    taskOrigins: [],
    baselineTasks: [],
  }) as unknown as Schedule

const ONE_TASK_UID = 4

const oneTaskSchedule = (task: Task, shapeKind: string): Schedule =>
  ({
    project: { calendarUid: null, statusDate: null, themeHue: 214, title: null, uidHighWaterMark: 10 },
    calendars: [],
    tasks: [task],
    resources: [],
    assignments: [],
    taskGroups: [
      { id: 'g1', parentId: null, label: 'g1', derivedFromTaskUid: null, order: 0, isKeptOpen: false, editGroup: null, color: null, height: null, ...OPEN },
    ],
    taskGroupMembers: [{ groupId: 'g1', taskUid: task.uid }],
    taskVisuals: [{ taskUid: task.uid, shapeKind }],
    commentBoxes: [],
    highlightBoxes: [],
    taskOrigins: [],
    baselineTasks: [],
  }) as unknown as Schedule

const MILESTONE_DAY = '2026-01-07'
const milestoneSchedule = (): Schedule =>
  oneTaskSchedule(taskOf(ONE_TASK_UID, MILESTONE_DAY, MILESTONE_DAY, { milestone: true }), 'milestone')

const STARTED_PERCENT = 40
const startedSchedule = (): Schedule =>
  oneTaskSchedule(
    taskOf(ONE_TASK_UID, '2026-01-05', '2026-01-16', {
      percentComplete: STARTED_PERCENT,
      actualStart: '2026-01-05',
      stop: '2026-01-09',
      resumeValid: true,
    }),
    'rectangle',
  )

const documentOf = (schedule: Schedule, settings: DocumentSettings): Document =>
  ({
    schemaVersion: '2026-01-01',
    schedule,
    documentSettings: settings,
    documentStamp: {
      scheduleUpdatedUtc: '2026-01-01T00:00:00Z',
      lastEditedBy: 'test',
      settingsUpdatedUtc: '2026-01-01T00:00:00Z',
    },
    changeLog: [],
  }) as unknown as Document

const ZOOM_STEP = 1.5

const contextOf = (
  schedule: Schedule,
  settingsPart: Record<string, unknown> = {},
  part: Partial<InputContext> = {},
): InputContext => {
  const settings = settingsOf(settingsPart)
  const regions = regionsFromScreen(ENV, settings)
  const layout = layoutFromSchedule(schedule, settings, regions)
  return {
    document: documentOf(schedule, settings),
    layout,
    geometry: geometryFromLayout(schedule, settings, layout, regions, emptySelection()),
    regions,
    screen: emptyScreenSession.screen,
    selection: emptySelection(),
    zoomStep: ZOOM_STEP,
    zoomMin: NOT_STORED_ZOOM_BOUNDS['S-97'],
    zoomMax: NOT_STORED_ZOOM_BOUNDS['S-98'],
    pressed: null,
    isTextEntryUnsettled: false,
    isSurfaceStanding: false,
    dualCursorFollowing: null,
    today: '2026-03-01T00:00:00',
    newGroupId: 'row-minted-outside',
    newCommentBoxId: 'comment-box-minted-outside',
    newHighlightBoxId: 'highlight-box-minted-outside',
    ...part,
  }
}

const NO_MODS: InputModifiers = { ctrl: false, shift: false, alt: false, meta: false }
const CTRL_A: KeyInput = { kind: 'key', key: 'A', modifiers: { ...NO_MODS, ctrl: true } }

const selectedTaskUids = (context: InputContext): readonly number[] =>
  selectionFromInput(CTRL_A, context).items
    .flatMap((one) => (one.kind === 'task' ? [one.uid] : []))
    .slice()
    .sort((a, b) => a - b)

const FOLDED: RowState = { isCollapsed: true, isHidden: false }
const HIDDEN: RowState = { isCollapsed: true, isHidden: true }

describe('FR-081 T-023c closing / SL-5 -- select-all never takes an undrawn task', () => {
  it('SL-5 control: every row open and every shape shown -> all three tasks', () => {
    expect(selectedTaskUids(contextOf(scheduleOf()))).toEqual([1, 2, 3])
  })

  it('SL-5 / FR-049: plan and actual both hidden (S-227, S-228 false) -> no task at all', () => {
    const context = contextOf(scheduleOf(), { planVisible: false, actualVisible: false })
    expect(context.geometry.tasks.map((one) => [one.plan, one.actual, one.milestoneFigure, one.dummies.length]))
      .toEqual([[null, null, null, 0], [null, null, null, 0], [null, null, null, 0]])
    expect(selectedTaskUids(context)).toEqual([])
  })

  it('SL-5 / FR-049: only the plan hidden, no actual -> the dummy is drawn, so every task is still taken', () => {
    const context = contextOf(scheduleOf(), { planVisible: false })
    expect(context.geometry.tasks.map((one) => [one.plan, one.dummies.length > 0]))
      .toEqual([[null, true], [null, true], [null, true]])
    expect(selectedTaskUids(context)).toEqual([1, 2, 3])
  })

  it('SL-5 / HR-1a: a task on a row under a folded row is not taken; the folded row\'s own task is', () => {
    // WHY: g1a folded too, because HR-1a has folding write the state of every row beneath.
    const context = contextOf(scheduleOf(FOLDED, FOLDED))
    expect(selectedTaskUids(context)).toEqual([1, 2])
  })

  it('SL-5 / HR-6: a task on a hidden row, and on a row beneath it, is not taken', () => {
    // WHY: folded as well as hidden, because HR-6 folds the hidden row and every row beneath.
    const context = contextOf(scheduleOf(HIDDEN, FOLDED))
    expect(selectedTaskUids(context)).toEqual([2])
  })

  it('SL-5 / FR-018: a task absent from the drawn geometry (a row the row axis does not draw) is not taken', () => {
    const whole = contextOf(scheduleOf())
    const withoutTaskThree: ScheduleGeometry = {
      ...whole.geometry,
      tasks: whole.geometry.tasks.filter((one) => one.taskUid !== 3),
    }
    expect(selectedTaskUids({ ...whole, geometry: withoutTaskThree })).toEqual([1, 2])
  })
})

describe('FR-081 T-023c closing / SL-5 -- a milestone through the real pipeline', () => {
  it('SL-5 control: a milestone with its plan shown is taken by select-all', () => {
    expect(selectedTaskUids(contextOf(milestoneSchedule()))).toEqual([ONE_TASK_UID])
  })

  it('SL-5 / FR-049: a milestone with plan and actual both hidden is not taken', () => {
    const context = contextOf(milestoneSchedule(), { planVisible: false, actualVisible: false })
    expect(context.geometry.tasks.map((one) => [one.plan, one.actual, one.dummies.length])).toEqual([[null, null, 0]])
    expect(selectedTaskUids(context)).toEqual([])
  })
})

const clickAt = (context: InputContext, x: number, y: number): Selection => {
  const down: PointerInput = { kind: 'pointer', phase: 'down', button: 'left', x, y, modifiers: NO_MODS, clickCount: 1 }
  const up: PointerInput = { ...down, phase: 'up' }
  const hit = itemAtPointer(context.geometry, x, y, grabSizesOf())
  const pressed = { at: down, hit, on: null, pressRow: pressRowOf({ at: down, hit }, context) }
  return selectionFromInput(up, { ...context, pressed })
}

const markerCentreOf = (context: InputContext): { readonly x: number; readonly y: number } => {
  const marker = context.geometry.tasks.find((one) => one.taskUid === ONE_TASK_UID)?.marker
  if (marker === null || marker === undefined) throw new Error('premise: the progress marker is drawn')
  return marker.centre
}

const MARKER_SHOWN = { progressMarkerVisible: true }

describe('FR-081 T-023c closing / SL-2 -- a click does not take an undrawn task', () => {
  it('SL-2 control: plan hidden, actual shown -- a click on the progress marker takes the task', () => {
    const context = contextOf(startedSchedule(), { ...MARKER_SHOWN, planVisible: false })
    const at = markerCentreOf(context)
    expect(clickAt(context, at.x, at.y).items).toEqual([taskRef(ONE_TASK_UID)])
  })

  it('SL-2 / FR-049: plan and actual both hidden -- a click on the progress marker does not take the task', () => {
    const context = contextOf(startedSchedule(), { ...MARKER_SHOWN, planVisible: false, actualVisible: false })
    const at = markerCentreOf(context)
    expect(context.geometry.tasks.map((one) => [one.plan, one.actual, one.dummies.length])).toEqual([[null, null, 0]])
    expect(tasksIn(clickAt(context, at.x, at.y).items)).toEqual([])
  })
})

describe('FR-081 T-023c closing / SL-3 -- a task drawn only as its actual dummy is taken', () => {
  it('SL-3 / JDG-288: plan hidden, not started -- the rectangle enclosing the dummy takes the task', () => {
    const context = contextOf(oneTaskSchedule(taskOf(ONE_TASK_UID, '2026-01-05', '2026-01-09'), 'rectangle'), {
      planVisible: false,
    })
    expect(context.geometry.tasks.map((one) => [one.plan, one.actual, one.dummies.length > 0])).toEqual([[null, null, true]])
    expect(tasksIn(itemsInMarquee(context.geometry, EVERYWHERE))).toEqual([{ kind: 'task', taskUid: ONE_TASK_UID }])
  })
})
