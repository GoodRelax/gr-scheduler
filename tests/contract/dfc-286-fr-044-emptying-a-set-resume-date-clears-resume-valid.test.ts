// Contract tests: erasing a resume date that was put sends resumeValid back to false (FR-044).

import { readRepoFile } from '../spec-files'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  commandFromFieldCommit,
  type InputContext,
} from '../../src/adapter/input-command-translator/input-command-translator'
import { propertiesPanelFromSelection } from '../../src/adapter/screen-renderer/properties-panel'
import type {
  FieldCommit,
  PropertiesPanel,
  PropertyControl,
  PropertyField,
  ScreenViewReadings,
} from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule, Task, TaskGroup } from '../../src/entity/document-model/schedule/schedule'
import {
  emptySelection,
  selectionWith,
  type ItemRef,
  type Selection,
} from '../../src/entity/document-model/selection/selection'
import {
  emptyScreenSession,
  type ScreenSession,
} from '../../src/use-case/advance-screen-session/advance-screen-session'
import {
  geometryFromLayout,
  type ScheduleGeometry,
} from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import { layoutFromSchedule } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import {
  regionsFromScreen,
  type ScreenEnvironment,
} from '../../src/entity/layout-engine/screen-regions/screen-regions'
import {
  NOT_STORED_ZOOM_BOUNDS,
  editTask,
  type DocumentCommand,
  type TaskCommand,
} from '../../src/use-case/edit-document/edit-document'
import { bare, specTable, type SpecRow, type SpecTable, unbroken } from './spec-table'

const DEFAULT_TASK_GROUP_NAME_FIXTURE = 'fixture default task group name'

/* eslint-disable @typescript-eslint/no-explicit-any -- the fixture reads untyped document JSON */

const REQUIREMENTS = unbroken(readRepoFile(
  join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
  'utf8',
))

const FR_044_ERASING_SENDS_IT_BACK =
  '置いた再開日を消したとき、`GRS` は、`resumeValid` を `false` に戻すこと。'

const FR_044_PUTTING_ONE_SETS_IT =
  '再開予定日を置いたとき、`GRS` は、`resumeValid` を `true` にすること。'

const FR_044_THE_NAMED_FAILURE = '`IMPS-455` —— `resumeValid` を `false` に戻さないと表 T-019a の `PS-5` に落ち、日付を消しただけで中断が黙って解ける。'

const T_016: SpecTable = specTable('T-016')
const T_019: SpecTable = specTable('T-019')
const T_019A: SpecTable = specTable('T-019a')

function rowOf(table: SpecTable, id: string): SpecRow {
  const found = table.rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table.id} has no row ${id}`)
  return found
}

const columnOf = (id: string): string => bare(rowOf(T_016, id).by['列（`GRS JSON`）'] ?? '')

// Spec: PR-7
const RESUME_COLUMN = columnOf('PR-7')
// Spec: PR-8
const RESUME_VALID_COLUMN = columnOf('PR-8')

const stateNameOf = (id: string): string => bare(rowOf(T_019, id).by['状態'] ?? '')

const nested = (flat: Readonly<Record<string, unknown>>): Record<string, unknown> => {
  const out: Record<string, unknown> = {}
  for (const key of Object.keys(flat)) {
    const path = key.split('.')
    const last = path[path.length - 1] as string
    let at = out
    for (const step of path.slice(0, -1)) {
      if (typeof at[step] !== 'object' || at[step] === null) at[step] = {}
      at = at[step] as Record<string, unknown>
    }
    at[last] = flat[key]
  }
  return out
}

const SETTINGS = nested({
  ...SETTINGS_DEFAULTS,
  scrollDate: '2026-01-01',
  scrollTaskGroupId: 'g1',
}) as unknown as DocumentSettings

const THEME_HUE = Number(bare(rowOf(specTable('T-216'), 'S-73').by['既定'] ?? ''))

const ENV: ScreenEnvironment = {
  width: 1000,
  height: 700,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
  propertyPanelWidth: 0,
}

const ZOOM_STEP = 3
const TODAY = '2026-03-01T00:00:00'

const THE_TASK = 1

// Trap: spell out every nullable column; one left undefined reads as set.
const taskOf = (part: Record<string, unknown>): Task =>
  ({
    uid: THE_TASK,
    parentTaskUid: null,
    wbsOrder: 1,
    name: 'the one task',
    start: '2026-04-06',
    finish: '2026-04-24',
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
    ...part,
  }) as unknown as Task

const groupOf = (): TaskGroup =>
  ({
    id: 'g1',
    parentId: null,
    name: 'row',
    derivedFromTaskUid: null,
    order: 0,
    treeState: 'auto', color: null,
    minHeightPx: null,
  }) as unknown as TaskGroup

const scheduleWith = (task: Task): Schedule =>
  ({
    project: {
      title: 'A',
      calendarUid: null,
      statusDate: null,
      startDate: null,
      themeHue: THEME_HUE,
      uidHighWaterMark: 100,
      importSequence: 0,
      revision: 1,
      carry: {},
      carryElements: [],
    },
    calendars: [],
    tasks: [task],
    resources: [],
    assignments: [],
    taskGroups: [groupOf()],
    taskGroupMembers: [{ taskUid: THE_TASK, taskGroupId: 'g1' }],
    taskVisuals: [],
    commentBoxes: [],
    highlightBoxes: [],
    taskOrigins: [],
    baselineTasks: [],
  }) as unknown as Schedule

const documentOf = (schedule: Schedule): Document =>
  ({
    schemaVersion: '2026-01-01',
    schedule,
    documentSettings: SETTINGS,
    documentStamp: {
      scheduleUpdatedAt: '2026-01-01T00:00:00Z',
      lastEditedBy: 'test',
      settingsUpdatedAt: '2026-01-01T00:00:00Z',
    },
    changeLog: [],
  }) as unknown as Document

const READINGS: ScreenViewReadings = {
  openedFileName: null,
  fileSavedAt: null,
  fileSavedByteLength: null,
  isAgentApiEnabled: false,
  pointer: null,
  pointerRestedMs: 0,
  hintTargetDwellMs: 0,
  commandPaletteAt: { x: 0, y: 0 },
  iconUnderPointer: null,
  themePreference: 'light',
  themeHue: THEME_HUE,
  selectedTaskGroupIds: [],
  selectedResourceUids: [],
  notices: [],
  confirmation: null,
  taskGroupBoxes: [],
} as unknown as ScreenViewReadings

const ROOT: ScreenSession = {
  ...emptyScreenSession,
  screen: {
    ...emptyScreenSession.screen,
    screenLanguage: 'ja', helpLanguage: 'ja',
    propertiesPanelContentState: {
      kind: 'selectionDisplayed',
      subject: { selection: emptySelection(), taskGroupIds: [] },
    },
  },
}

const holding = (...items: readonly ItemRef[]): Selection =>
  items.reduce((selection, item) => selectionWith(selection, item), emptySelection())

const STARTED = { actualStart: '2026-04-06', stop: '2026-04-10' }

// Spec: PA-3
const THE_RESUME_DAY = '2026-05-11'
// Why: a different day, so a case that moves the date cannot pass on the old one.
const A_LATER_RESUME_DAY = '2026-06-15'
const PA_3 = (): Task => taskOf({ ...STARTED, resume: THE_RESUME_DAY, resumeValid: true })

// Spec: PA-4
const PA_4 = (): Task => taskOf({ ...STARTED, resume: null, resumeValid: false })

// Spec: PA-2
// Why: the control: it has nothing to erase, so a build that wrote false for every empty
// commit would suspend it.
const PA_2 = (): Task => taskOf({ ...STARTED, resume: null, resumeValid: true })

const contextFor = (schedule: Schedule): InputContext => {
  const regions = regionsFromScreen(ENV, SETTINGS)
  const layout = layoutFromSchedule(schedule, SETTINGS, regions)
  const geometry: ScheduleGeometry = geometryFromLayout(
    schedule,
    SETTINGS,
    layout,
    regions,
    emptySelection(),
    null,
  )
  return {
    document: documentOf(schedule),
    layout,
    geometry,
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
    today: TODAY,
    newTaskGroupId: 'task-group-minted-outside',
    newCommentBoxId: 'comment-box-minted-outside',
    newHighlightBoxId: 'highlight-box-minted-outside',
  } as unknown as InputContext
}

const panelOf = (schedule: Schedule): PropertiesPanel | null =>
  propertiesPanelFromSelection(
    schedule,
    SETTINGS,
    holding({ kind: 'task', uid: THE_TASK } as ItemRef),
    ROOT,
    READINGS,
  )

const fieldFor = (schedule: Schedule, row: string): PropertyField | null =>
  panelOf(schedule)?.fields.find((field) => field.row === row) ?? null

// Spec: T-016, PR-7
// Why: built rather than taken off the panel, since PR-7 is offered only on a suspended task
// and the control case is about a running one.
const commitOf = (text: string): FieldCommit =>
  ({
    row: 'PR-7',
    key: { holder: 'task', uid: THE_TASK, column: RESUME_COLUMN },
    text,
  }) as unknown as FieldCommit

// Why: the command is not asserted: FR-044 rules on the values, so whatever the translator
// answers runs through editTask and the columns are read back.
function afterSettling(task: Task, text: string): Document {
  const schedule = scheduleWith(task)
  const commands: readonly DocumentCommand[] = commandFromFieldCommit(
    commitOf(text),
    contextFor(schedule),
  )
  let document = documentOf(schedule)
  for (const command of commands) {
    const result = editTask(document, command as TaskCommand, DEFAULT_TASK_GROUP_NAME_FIXTURE)
    if (!result.ok) {
      throw new Error(
        `the settled value was refused: ${result.refusals
          .map((one) => `${one.command} ${one.rule} ${one.what}`)
          .join('; ')}`,
      )
    }
    document = result.document
  }
  return document
}

const theTask = (document: Document): Record<string, unknown> =>
  (document as any).schedule.tasks.find((one: any) => one.uid === THE_TASK) as Record<
    string,
    unknown
  >

// Spec: T-019a
// Why: each condition is this file's reading of a cell, asserted against that cell below
// before any case leans on it.
function stateOf(task: Record<string, unknown>): string {
  const order = ['PS-1', 'PS-2', 'PS-3', 'PS-4', 'PS-5']
  const holds: Record<string, (one: Record<string, unknown>) => boolean> = {
    'PS-1': (one) => one[columnOf('PR-4')] === null || one[columnOf('PR-4')] === undefined,
    'PS-2': (one) => one[columnOf('PR-6')] !== null && one[columnOf('PR-6')] !== undefined,
    'PS-3': (one) => one[RESUME_VALID_COLUMN] === false,
    'PS-4': (one) => one[RESUME_COLUMN] !== null && one[RESUME_COLUMN] !== undefined,
    'PS-5': () => true,
  }
  for (const id of order) {
    if ((holds[id] as (one: Record<string, unknown>) => boolean)(task)) {
      return bare(rowOf(T_019A, id).by['状態'] ?? '')
    }
  }
  throw new Error('表 T-019a is 全域 and this walk fell off the end of it')
}

describe('FR-044 -- the manuscript this file is driven by', () => {
  it('still carries both halves of the pair, each ending at its own （MUST）', () => {
    expect(REQUIREMENTS).toContain(FR_044_PUTTING_ONE_SETS_IT)
    expect(REQUIREMENTS).toContain(FR_044_ERASING_SENDS_IT_BACK)
    expect(REQUIREMENTS).toContain(FR_044_THE_NAMED_FAILURE)
  })

  it('表 T-016 still holds the two columns this file drives', () => {
    expect(RESUME_COLUMN).toBe('resume')
    expect(RESUME_VALID_COLUMN).toBe('resumeValid')
    // Why: neither is read-only, or FR-006 would offer no control to settle.
    expect(rowOf(T_016, 'PR-7').cells.some((cell) => cell.includes('読み取り専用'))).toBe(false)
  })

  it('表 T-019 still separates the three rows this file stands between', () => {
    // Why: without this, the pairing below could pass on a table that had merged the rows.
    const pa3 = rowOf(T_019, 'PA-3').cells.join(' ')
    const pa4 = rowOf(T_019, 'PA-4').cells.join(' ')
    const pa2 = rowOf(T_019, 'PA-2').cells.join(' ')
    expect(stateNameOf('PA-3')).toContain('中断')
    expect(stateNameOf('PA-4')).toContain('中断')
    expect(stateNameOf('PA-2')).toContain('進行中')
    expect(pa3).toContain('`true`')
    expect(pa4).toContain('`false`')
    expect(pa2).toContain('`true`')
  })

  it('表 T-019a still discriminates the way this file walks it', () => {
    // Why: the raw cell, not bare: bare answers with the first backticked token, which here is
    // the column name alone.
    expect(rowOf(T_019A, 'PS-3').by['条件'] ?? '').toContain('`resumeValid` が `false`')
    expect(rowOf(T_019A, 'PS-4').by['条件'] ?? '').toContain('`resume` に日付がある')
    expect(rowOf(T_019A, 'PS-5').by['条件'] ?? '').toContain('上のどれにも当たらない')
    expect(rowOf(T_019A, 'PS-5').by['状態'] ?? '').toContain('進行中')
    expect(stateOf(PA_3() as unknown as Record<string, unknown>)).toBe(stateNameOf('PA-3'))
    expect(stateOf(PA_4() as unknown as Record<string, unknown>)).toBe(stateNameOf('PA-4'))
    expect(stateOf(PA_2() as unknown as Record<string, unknown>)).toBe(stateNameOf('PA-2'))
  })

  it('FR-006 really does offer a control for PR-7 on a suspended task', () => {
    // Why: PR-7 is offered only on a suspended task; without a field here the cases below would
    // be about a seam nobody can reach.
    const field = fieldFor(scheduleWith(PA_3()), 'PR-7')
    expect(field, '表 T-016 PR-7 has no field on a suspended task').not.toBeNull()
    expect((field?.controls ?? []).length, 'PR-7 is not read-only, so it has a control').toBe(1)
    expect((field?.controls[0] as PropertyControl | undefined)?.kind).toBe('date')
  })
})

describe('FR-044 (MUST) -- erasing a resume date that was put', () => {
  it('sends `resumeValid` back to false', () => {
    const after = theTask(afterSettling(PA_3(), ''))

    expect(
      after[RESUME_VALID_COLUMN],
      'FR-044 (MUST): 「置いた再開日を消したときは、`resumeValid` を `false` に戻すこと」',
    ).toBe(false)
  })

  // Spec: IMPS-454
  it('leaves the task on 表 T-019 の `PA-4`, not on `PA-2`', () => {
    const after = theTask(afterSettling(PA_3(), ''))

    // Why: the state, not the column, is what the failure FR-044 names (falling to PS-5) is about.
    expect(after[RESUME_COLUMN], '表 T-019 `PA-4` gives `resume` 空').toBeNull()
    expect(stateOf(after), 'the suspension came undone from erasing a date alone').toBe(
      stateNameOf('PA-4'),
    )
  })

  it('⭐ the control: MOVING the date on the same field leaves `resumeValid` true', () => {
    // Why: without this control, the cases above would pass on a build that wrote false for every
    // commit on PR-7; same task, same field, only the text differs.
    const after = theTask(afterSettling(PA_3(), A_LATER_RESUME_DAY))

    expect(after[RESUME_VALID_COLUMN]).toBe(true)
    expect(String(after[RESUME_COLUMN] ?? '')).toContain(A_LATER_RESUME_DAY)
    expect(stateOf(after)).toBe(stateNameOf('PA-3'))
  })
})

// Spec: FR-044
// Why: PA-4 is the one state where putting a resume date is a new act; from PA-3 it is a move,
// and from PA-2 a suspension nobody asked for.
describe('⛔ RED ON PURPOSE -- FR-044 (MUST): putting a resume date sets `resumeValid` true', () => {
  it('⛔ a task that is 中断・再開日未定 cannot be given a resume date at all', () => {
    const after = theTask(afterSettling(PA_4(), THE_RESUME_DAY))

    expect(
      String(after[RESUME_COLUMN] ?? ''),
      'the settled date never reached the document -- FR-044 (MUST): 「再開予定日を置いたとき、' +
        '`resumeValid` を `true` にすること」, and 表 T-019a の `PS-3` は先に当たっている',
    ).toContain(THE_RESUME_DAY)
    expect(after[RESUME_VALID_COLUMN]).toBe(true)
    expect(stateOf(after)).toBe(stateNameOf('PA-3'))
  })
})

describe('FR-044 -- a task that had no resume date is not suspended by an empty commit', () => {
  it('⛔ a running task stays running', () => {
    // Spec: PA-2
    // Why: writing false unconditionally would put a running task, which has no date to erase,
    // into a suspension nobody asked for.
    const after = theTask(afterSettling(PA_2(), ''))

    expect(
      after[RESUME_VALID_COLUMN],
      'an empty commit suspended a running task -- FR-044 releases `resumeValid` only for a date ' +
        'that was PUT',
    ).not.toBe(false)
    expect(stateOf(after), '表 T-019a `PS-3` caught a task nobody suspended').toBe(
      stateNameOf('PA-2'),
    )
  })

  it('⛔ a task already 中断・再開日未定 is left where it stands', () => {
    // Why: PA-4 already carries false, so this case cannot tell the two builds apart; it says only
    // that an empty commit on an empty field disturbs neither column.
    const after = theTask(afterSettling(PA_4(), ''))

    expect(after[RESUME_VALID_COLUMN]).toBe(false)
    expect(after[RESUME_COLUMN]).toBeNull()
    expect(stateOf(after)).toBe(stateNameOf('PA-4'))
  })

  it('⭐ the control: the two empty commits really do part company', () => {
    // Why: the one case that cannot pass on either broken build: same field and text, two tasks
    // that differ only in whether a date was put.
    const fromSuspended = stateOf(theTask(afterSettling(PA_3(), '')))
    const fromRunning = stateOf(theTask(afterSettling(PA_2(), '')))

    expect(
      fromRunning,
      'the same empty commit answered alike on both tasks, so 「置いた」 decided nothing',
    ).not.toBe(fromSuspended)
    expect(fromSuspended).toBe(stateNameOf('PA-4'))
    expect(fromRunning).toBe(stateNameOf('PA-2'))
  })
})
