// H10 spec-only cases, moved to CR-788: the assignee field is one field over a checked list; the first seated is the primary.

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
  selectionWith,
  type ItemRef,
} from '../../src/entity/document-model/selection/selection'
import { geometryFromLayout } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import {
  MORE_ASSIGNEES_MARK,
  labeledAssigneeUidOf,
  layoutFromSchedule,
} from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import {
  regionsFromScreen,
  type ScreenEnvironment,
} from '../../src/entity/layout-engine/screen-regions/screen-regions'
import {
  NOT_STORED_ZOOM_BOUNDS,
  type DocumentCommand,
} from '../../src/use-case/edit-document/edit-document'
import {
  emptyScreenSession,
  type ScreenSession,
} from '../../src/use-case/advance-screen-session/advance-screen-session'
import {
  ASSIGNEE_LIST_SEPARATOR,
  type FieldCommit,
  type PropertiesPanel,
  type PropertyControl,
  type PropertyField,
  type PropertyFieldKey,
  type ScreenSurface,
  type ScreenView,
  type ScreenViewReadings,
} from '../../src/adapter/screen-renderer/screen-renderer'
import { propertiesPanelFromSelection } from '../../src/adapter/screen-renderer/properties-panel'
import {
  commandFromFieldCommit,
  type InputContext,
} from '../../src/adapter/input-command-translator/input-command-translator'
import { domScreenSurface } from '../../src/framework/dom-screen-surface/dom-screen-surface'
import { bare, specTable, unbroken } from '../contract/spec-table'
import { selfAndDescendants, stage, wiringOf, type FakeElement } from '../fixtures/fake-browser'

const AS_1_OPENS_AND_FOCUSES_THE_FILTER = '押したときは、その欄の一覧を開き、一覧の上の絞り込みの欄に焦点を置くこと（MUST）'
const AS_3_ONLY_THAT_ONE = '⭐ 解くのはチェックを外した担当の割当だけであり、ほかの割当を解いてはならない（MUST NOT）。'
const AS_5_ONE_FIELD =
  '⭐ 担当の欄はタスクに 1 つとし、閉じているあいだは主担当（`AS-13`）の名を出し、ほかにも就いているときはその後に `FR-059` の印「, …」を続けること（MUST）'
const AS_5_NOBODY = '就いている担当がいないときは何も出さない。'
const AS_5_NO_KIND_FILTER = '⭐ 一覧に出す担当は、資源の種類で絞らない'
const AS_12_ADDS = 'ほかの割当を解いてはならない（MUST NOT） —— チェックを付けるのは足すことである。'
const AS_12_AT_THE_TAIL = '⭐ 就けた割当は、そのタスクの割当の並びの末尾に入る（`AS-13`） —— 先に就いていた人の順も主担当も変わらない'
const AS_13_PRIMARY =
  '⭐ そのタスクの割当（`Assignment`）を文書の割当の並びの順に読み、先頭の割当の担当を主担当とすること（MUST）'
const AS_13_ORDER_KEPT =
  '⛔ 割当を就けるときは並びの末尾に足し、解くときは並びから除くだけとし、残る割当の順を変えてはならない（MUST NOT）'
const AS_13_LABEL = '担当ラベル（`FR-059`）は、並びで先頭の、ラベルに出せる担当の名を出す'
const AS_10_NO_SECOND = '**割当を増やさないこと（MUST）**'
const T_225_ALL_IN_ONE_CALL =
  '`AS-5` の `IC-125` と `IC-126` は、一覧に出ている人の数だけの `CM-44` か `CM-45` を 1 回の呼び出しで走らせること（MUST）。'
const FR_059_MARK =
  '複数が割り当てられているときは、**主担当の名に、半角コンマ・半角空白・三点リーダーの印「, …」を続けて**示すこと（利用者の判断）'
const FR_059_NO_COUNT = '残りの人数は出さない'
const FR_059_WORK_ONLY =
  '担当ラベルを描くとき、`GRS` は、**作業資源だけ**を対象とし、材料資源・費用資源・名前が空の資源を出さないこと。'
const PR_16_POINTS_AT_T_225 = '入口と選び方は `FR-008` の表 T-225 が持つ。'
const UN_15_TARGET = '**担当（資源）と割当の追加・改名・解除**（`FR-008`）'
const SK_3_ROW =
  '| SK-3 | 選択しているものを削除する（対象の全数は表 T-023c の SL-1） | `Delete` ／ `Backspace` | — |'

const readText = (...parts: string[]): string =>
  readFileSync(join(process.cwd(), ...parts), 'utf8').replace(/\r\n/g, '\n')
const REQUIREMENTS = unbroken(readText('docs', 'spec', '01-04-requirements.md'))
const PROPERTY_ITEMS = unbroken(readText('docs', 'spec', '_assets', 'tbl-property-items.md'))

describe('the clauses this file is driven by still stand (T-225, FR-059, T-016, T-027, SK-3)', () => {
  it.each([
    ['AS-1 opens the list and focuses the filter', AS_1_OPENS_AND_FOCUSES_THE_FILTER],
    ['AS-3 only that one', AS_3_ONLY_THAT_ONE],
    ['AS-5 one field', AS_5_ONE_FIELD],
    ['AS-5 nobody', AS_5_NOBODY],
    ['AS-5 no kind filter', AS_5_NO_KIND_FILTER],
    ['AS-10 no second', AS_10_NO_SECOND],
    ['AS-12 adds', AS_12_ADDS],
    ['AS-12 at the tail', AS_12_AT_THE_TAIL],
    ['AS-13 primary', AS_13_PRIMARY],
    ['AS-13 order kept', AS_13_ORDER_KEPT],
    ['AS-13 label', AS_13_LABEL],
    ['T-225 paragraph: IC-125 / IC-126 in one call', T_225_ALL_IN_ONE_CALL],
    ['FR-059 mark', FR_059_MARK],
    ['FR-059 no count', FR_059_NO_COUNT],
    ['FR-059 work resources only', FR_059_WORK_ONLY],
    ['UN-15 target', UN_15_TARGET],
    ['SK-3 row', SK_3_ROW],
  ])('01-04 holds %s', (_name, clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })

  it('T-016 PR-16 still points at T-225 for how the assignee is chosen', () => {
    expect(PROPERTY_ITEMS).toContain(PR_16_POINTS_AT_T_225)
  })

  it('T-225 ends with AS-10, AS-12 and the new AS-13', () => {
    const ids = specTable('T-225').rows.map((row) => row.id)
    expect(ids.slice(-3)).toEqual(['AS-10', 'AS-12', 'AS-13'])
  })
})

const CM_40 = 'createResource'
const CM_44 = 'createAssignment'
const CM_45 = 'deleteAssignment'
const UNCHECK_TEXT = '-'
const ASSIGNEE_ROW = 'PR-16'

const WORK = 1
const MATERIAL = 0

const S_73 = specTable('T-216').rows.find((row) => row.id === 'S-73')
if (S_73 === undefined) throw new Error('table T-216 no longer has row S-73')
const THEME_HUE = Number(bare(S_73.by['既定'] ?? ''))

const SETTINGS = {
  ...SETTINGS_DEFAULTS,
  exportCanvas: { width: 1600, height: 900 },
  fontSizeStepSizes: { L: 16, M: 14, S: 12 },
  planActualGuidePattern: { off: 2, on: 2 },
  shapeHeightOf: { arrow: 0.5, chevron: 1, endpointSpan: 0.5, milestone: 1.5, rectangle: 1 },
  scrollDate: '2026-01-01',
  scrollTaskGroupId: 'g1',
  stackDirection: 'down',
  isAssigneeVisible: true,
  isPercentCompleteVisible: false,
} as unknown as DocumentSettings

const ENV: ScreenEnvironment = { width: 1000, height: 700, appHeaderHeight: 56, scrollbarThickness: 8, propertyPanelWidth: 0 }
const ZOOM_STEP = 3
const TODAY = '2026-03-01T00:00:00'

const taskOf = (uid: number): Task =>
  ({
    uid,
    parentTaskUid: null,
    wbsOrder: null,
    name: `t${uid}`,
    start: '2026-01-05',
    finish: '2026-02-05',
    milestone: null,
    deadline: null,
    notes: null,
    calendarUid: null,
    actualStart: null,
    stop: null,
    actualFinish: null,
    resume: null,
    resumeValid: null,
    percentComplete: null,
    fadeInDays: null,
    fadeOutDays: null,
    dependencies: [],
    carry: {},
    carryElements: [],
  }) as unknown as Task

type Person = Schedule['resources'][number]

const personOf = (uid: number, name: string, resourceKind: number = WORK): Person =>
  ({
    uid,
    name,
    resourceKind,
    isCostResource: false,
    calendarUid: null,
    carry: {},
    carryElements: [],
  }) as unknown as Person

const seat = (uid: number, taskUid: number, person: Person): Schedule['assignments'][number] =>
  ({ uid, taskUid, resourceUid: person.uid, carry: {}, carryElements: [] }) as unknown as
    Schedule['assignments'][number]

// WHY: name order puts ALPHA first and uid order puts BRAVO first; the seat order differs per task below, so only
// the assignment order (AS-13) passes every case.
const BRAVO = personOf(1, 'Bravo')
const ALPHA = personOf(2, 'Alpha')
const TWIN_LOW = personOf(3, 'Twin')
const TWIN_HIGH = personOf(4, 'Twin')
const STOCK = personOf(5, 'Material', MATERIAL)
const WORKER = personOf(6, 'Worker')
const CHARLIE = personOf(7, 'Charlie')
const NEW_NAME = 'Nobody'
const ROSTER = [BRAVO, ALPHA, TWIN_LOW, TWIN_HIGH, STOCK, WORKER, CHARLIE]
// see AS-5
const ROSTER_BY_NAME = [ALPHA, BRAVO, CHARLIE, STOCK, TWIN_LOW, TWIN_HIGH, WORKER]

const T_NONE = 20
const T_ONE = 21
const T_TWO = 22
const T_TWINS = 23
const T_MIXED = 24
const T_STOCK_ONLY = 25
const T_DOUBLED = 26
const T_ALPHA_FIRST = 27
const T_STOCK_FIRST = 28
const TASK_UIDS = [T_NONE, T_ONE, T_TWO, T_TWINS, T_MIXED, T_STOCK_ONLY, T_DOUBLED, T_ALPHA_FIRST, T_STOCK_FIRST]

const HIGH_WATER_MARK = 60

const SCHEDULE = {
  project: {
    calendarUid: null,
    statusDate: null,
    themeHue: THEME_HUE,
    title: null,
    uidHighWaterMark: HIGH_WATER_MARK,
  },
  calendars: [],
  tasks: TASK_UIDS.map(taskOf),
  resources: ROSTER,
  assignments: [
    seat(30, T_ONE, BRAVO),
    seat(31, T_TWO, BRAVO),
    seat(32, T_TWO, ALPHA),
    seat(33, T_TWINS, TWIN_HIGH),
    seat(34, T_TWINS, TWIN_LOW),
    seat(35, T_MIXED, WORKER),
    seat(36, T_MIXED, STOCK),
    seat(37, T_STOCK_ONLY, STOCK),
    seat(38, T_DOUBLED, ALPHA),
    seat(39, T_DOUBLED, ALPHA),
    // WHY: the higher uid listed first -- the document order wins over the uid order (AS-13).
    seat(52, T_ALPHA_FIRST, ALPHA),
    seat(51, T_ALPHA_FIRST, BRAVO),
    seat(53, T_STOCK_FIRST, STOCK),
    seat(54, T_STOCK_FIRST, CHARLIE),
    seat(55, T_STOCK_FIRST, WORKER),
  ],
  taskGroups: TASK_UIDS.map((_uid, index) => ({
    id: `g${index + 1}`,
    parentId: null,
    label: `row ${index + 1}`,
    order: index,
    minHeight: null,
  })),
  taskGroupMembers: TASK_UIDS.map((taskUid, index) => ({ taskGroupId: `g${index + 1}`, taskUid })),
  taskVisuals: [],
  commentBoxes: [],
  highlightBoxes: [],
  taskOrigins: [],
  baselineTasks: [],
} as unknown as Schedule

const REGIONS = regionsFromScreen(ENV, SETTINGS)
const LAYOUT = layoutFromSchedule(SCHEDULE, SETTINGS, REGIONS)
const GEOMETRY = geometryFromLayout(SCHEDULE, SETTINGS, LAYOUT, REGIONS, emptySelection(), null)

const CONTEXT: InputContext = {
  document: {
    schemaVersion: '2026-01-01',
    schedule: SCHEDULE,
    documentSettings: SETTINGS,
    documentStamp: {
      scheduleUpdatedAt: '2026-01-01T00:00:00Z',
      lastEditedBy: 'test',
      settingsUpdatedAt: '2026-01-01T00:00:00Z',
    },
    changeLog: [],
  } as unknown as Document,
  layout: LAYOUT,
  geometry: GEOMETRY,
  regions: REGIONS,
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
}

const SESSION: ScreenSession = {
  ...emptyScreenSession,
  screen: {
    ...emptyScreenSession.screen,
    screenLanguage: 'ja',
    helpLanguage: 'ja',
    dialogueFieldDisplayState: { kind: 'shown', child: { kind: 'normal' } },
    milestoneListDisplayState: { kind: 'closed' },
    paletteDisplayState: { kind: 'shown', child: { kind: 'expanded' } },
    dualCursorModeState: { kind: 'off' },
    propertiesPanelContentState: {
      kind: 'selectionDisplayed',
      subject: { selection: emptySelection(), taskGroupIds: [] },
    },
  },
}

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
  scrollExtent: { contentWidth: 0, contentHeight: 0, visibleHeight: 0 },
}

const panelOf = (taskUid: number): PropertiesPanel => {
  const panel = propertiesPanelFromSelection(
    SCHEDULE,
    SETTINGS,
    selectionWith(emptySelection(), { kind: 'task', uid: taskUid } as ItemRef),
    SESSION,
    READINGS,
  ) as PropertiesPanel | null
  expect(panel).not.toBe(null)
  return panel as PropertiesPanel
}

const assigneeControlsOf = (taskUid: number): readonly PropertyControl[] => {
  const fields = panelOf(taskUid).fields.filter((field) => field.row === ASSIGNEE_ROW)
  expect(fields).toHaveLength(1)
  return (fields[0] as PropertyField).controls
}

const theControlOf = (taskUid: number): PropertyControl => {
  const controls = assigneeControlsOf(taskUid)
  expect(controls).toHaveLength(1)
  return controls[0] as PropertyControl
}

const fieldKey = (taskUid: number, resourceUid: number | null): PropertyFieldKey => ({
  holder: 'assignment',
  taskUid,
  resourceUid,
  column: 'resourceUid',
})

type Shape = Readonly<Record<string, unknown>>

const shapeOf = (command: DocumentCommand): Shape => {
  const record = command as unknown as Record<string, unknown>
  if (record['kind'] === CM_40) return { kind: CM_40, name: record['name'] }
  return { kind: record['kind'], taskUid: record['taskUid'], resourceUid: record['resourceUid'] }
}

const make = (name: string): Shape => ({ kind: CM_40, name })
const seats = (taskUid: number, resourceUid: number): Shape => ({ kind: CM_44, taskUid, resourceUid })
const releases = (taskUid: number, resourceUid: number): Shape => ({ kind: CM_45, taskUid, resourceUid })

const committed = (
  taskUid: number,
  keyUid: number | null,
  text: string,
  pick?: FieldCommit['pick'],
): readonly Shape[] => {
  const commit: FieldCommit = { row: ASSIGNEE_ROW, key: fieldKey(taskUid, keyUid), text, ...(pick === undefined ? {} : { pick }) }
  return commandFromFieldCommit(commit, CONTEXT).map(shapeOf)
}

const listOf = (...people: readonly Person[]): string => people.map((one) => String(one.uid)).join(ASSIGNEE_LIST_SEPARATOR)

const NEW_PERSON_UID = HIGH_WATER_MARK + 1

describe('AS-5 -- one field per task, closed on the primary', () => {
  it.each([T_NONE, T_ONE, T_TWO, T_MIXED, T_STOCK_ONLY])('AS_5_ONE_FIELD: task %s -> one control, keyed on the task alone', (taskUid) => {
    expect(theControlOf(taskUid).key).toEqual(fieldKey(taskUid, null))
    expect(theControlOf(taskUid).kind).toBe('choice')
  })

  it.each([
    ['nobody seated -> nothing', T_NONE, ''],
    ['one seated -> that name', T_ONE, 'Bravo'],
    ['Bravo seated before Alpha -> Bravo and the mark', T_TWO, `Bravo${MORE_ASSIGNEES_MARK}`],
    ['Alpha seated first, though of the higher uid -> Alpha and the mark', T_ALPHA_FIRST, `Alpha${MORE_ASSIGNEES_MARK}`],
    ['a material resource seated first -> its name and the mark (AS-5 does not filter by kind)', T_STOCK_FIRST, `Material${MORE_ASSIGNEES_MARK}`],
    ['a material resource alone -> its name', T_STOCK_ONLY, 'Material'],
    ['one person held by two assignments -> that name, no mark', T_DOUBLED, 'Alpha'],
  ] as const)('AS_5_ONE_FIELD / AS_5_NOBODY: %s', (_name, taskUid, word) => {
    expect(theControlOf(taskUid).assignee?.fieldWord).toBe(word)
  })

  it('AS-6: the higher twin seated first -> that twin, told apart by its uid word, and the mark', () => {
    const combo = theControlOf(T_TWINS).assignee
    const word = combo?.people.find((one) => one.uid === TWIN_HIGH.uid)?.word ?? ''
    expect(word).toContain('Twin')
    expect(combo?.fieldWord).toBe(`${word}${MORE_ASSIGNEES_MARK}`)
  })

  it('FR-059: the mark is a comma, a space and an ellipsis', () => {
    expect(MORE_ASSIGNEES_MARK).toBe(', …')
  })

  it.each([
    ['nobody', T_NONE, []],
    ['Bravo then Alpha', T_TWO, [BRAVO.uid, ALPHA.uid]],
    ['Alpha then Bravo (uid 52 before 51)', T_ALPHA_FIRST, [ALPHA.uid, BRAVO.uid]],
    ['the higher twin then the lower', T_TWINS, [TWIN_HIGH.uid, TWIN_LOW.uid]],
    ['Worker then the material resource', T_MIXED, [WORKER.uid, STOCK.uid]],
  ] as const)('AS_13_PRIMARY: seated is the document assignment order -- %s', (_name, taskUid, seated) => {
    expect(theControlOf(taskUid).assignee?.seated).toEqual(seated)
  })

  it('AS-10: one person held by two assignments is seated once', () => {
    expect([...new Set(theControlOf(T_DOUBLED).assignee?.seated ?? [])]).toEqual([ALPHA.uid])
  })

  it('AS_5_NO_KIND_FILTER: the list offers the whole roster, name ascending and the same name by uid', () => {
    expect(theControlOf(T_NONE).assignee?.people.map((one) => one.uid)).toEqual(ROSTER_BY_NAME.map((one) => one.uid))
  })

  it('AS-5: the field carries the two check entries and the two sort entries', () => {
    const combo = theControlOf(T_TWO).assignee
    expect(combo?.checkEntries.map((one) => one.icon)).toEqual(['IC-125', 'IC-126'])
    expect(combo?.sortEntries.map((one) => one.icon)).toEqual(['IC-123', 'IC-124'])
  })
})

describe('FR-059 / AS-13 -- the assignee label names the first labelable person of the assignment order', () => {
  const labelOf = (taskUid: number): string => LAYOUT.placements.find((one) => one.taskUid === taskUid)?.outsideLabel ?? ''

  it.each([
    ['Bravo seated before Alpha', T_TWO, BRAVO.uid, `Bravo${MORE_ASSIGNEES_MARK}`],
    ['Alpha seated first though of the higher uid', T_ALPHA_FIRST, ALPHA.uid, `Alpha${MORE_ASSIGNEES_MARK}`],
    ['a material resource seated first is skipped (FR-059 work only)', T_STOCK_FIRST, CHARLIE.uid, `Charlie${MORE_ASSIGNEES_MARK}`],
    ['the work resource beside a material one is alone on the label', T_MIXED, WORKER.uid, 'Worker'],
    ['one person', T_ONE, BRAVO.uid, 'Bravo'],
  ] as const)('FR_059_MARK / AS_13_LABEL: %s', (_name, taskUid, uid, label) => {
    expect(labeledAssigneeUidOf(SCHEDULE, taskUid)).toBe(uid)
    expect(labelOf(taskUid)).toBe(label)
  })

  it('FR_059_NO_COUNT: no label carries a count of the others', () => {
    for (const taskUid of TASK_UIDS) expect(labelOf(taskUid)).not.toMatch(/\+\s*\d/)
  })

  it('FR_059_WORK_ONLY: a material resource alone gives no labeled person', () => {
    expect(labeledAssigneeUidOf(SCHEDULE, T_STOCK_ONLY)).toBe(null)
    expect(labeledAssigneeUidOf(SCHEDULE, T_NONE)).toBe(null)
  })
})

describe('AS-12 -- checking a person who is not seated seats them, at the tail, releasing nobody', () => {
  it('AS_12_ADDS: Charlie checked on a two-person task -> one CM-44 and no CM-45', () => {
    expect(committed(T_TWO, null, String(CHARLIE.uid), 'candidate')).toEqual([seats(T_TWO, CHARLIE.uid)])
  })

  it('AS_12_ADDS: Charlie checked on an unseated task -> seats', () => {
    expect(committed(T_NONE, null, String(CHARLIE.uid), 'candidate')).toEqual([seats(T_NONE, CHARLIE.uid)])
  })

  it('AS-10: checking a person already seated writes nothing', () => {
    expect(committed(T_TWO, null, String(ALPHA.uid), 'candidate')).toEqual([])
  })
})

describe('AS-3 -- unchecking releases that person only', () => {
  it.each([
    ['Bravo', BRAVO.uid],
    ['Alpha', ALPHA.uid],
  ] as const)('AS_3_ONLY_THAT_ONE: %s unchecked -> releases that person alone', (_name, uid) => {
    expect(committed(T_TWO, uid, UNCHECK_TEXT)).toEqual([releases(T_TWO, uid)])
  })

  it('S-5: unchecking a person who left the task before the commit writes nothing', () => {
    expect(committed(T_TWO, CHARLIE.uid, UNCHECK_TEXT)).toEqual([])
  })
})

describe('AS-7 / AS-4 -- a name the roster does not hold, through the add item', () => {
  it('AS-7: the add item makes the person and seats the new uid, releasing nobody', () => {
    expect(committed(T_TWO, null, NEW_NAME, 'add')).toEqual([make(NEW_NAME), seats(T_TWO, NEW_PERSON_UID)])
  })

  it('AS-7: a name typed and committed with nothing chosen makes no one', () => {
    expect(committed(T_TWO, null, NEW_NAME)).toEqual([])
  })

  it('AS-4: "-" through the add item makes no resource', () => {
    expect(committed(T_TWO, null, UNCHECK_TEXT, 'add')).toEqual([])
  })
})

describe('T-225 paragraph -- IC-125 / IC-126 write every listed person in one call', () => {
  it('T_225_ALL_IN_ONE_CALL: IC-125 seats every listed person not yet seated, in the order listed', () => {
    expect(committed(T_TWO, null, listOf(ALPHA, BRAVO, CHARLIE, WORKER), 'all')).toEqual([
      seats(T_TWO, CHARLIE.uid),
      seats(T_TWO, WORKER.uid),
    ])
  })

  it('T_225_ALL_IN_ONE_CALL: IC-125 on an unseated task seats all listed, list order kept', () => {
    expect(committed(T_NONE, null, listOf(CHARLIE, ALPHA), 'all')).toEqual([seats(T_NONE, CHARLIE.uid), seats(T_NONE, ALPHA.uid)])
  })

  it('T_225_ALL_IN_ONE_CALL: IC-126 releases every listed person who is seated, and only those', () => {
    const shapes = committed(T_TWO, null, listOf(ALPHA, BRAVO, CHARLIE), 'none')
    expect(shapes).toHaveLength(2)
    expect(shapes).toEqual(expect.arrayContaining([releases(T_TWO, ALPHA.uid), releases(T_TWO, BRAVO.uid)]))
  })

  it('a person not listed is left alone: IC-126 listing Alpha only keeps Bravo', () => {
    expect(committed(T_TWO, null, listOf(ALPHA), 'none')).toEqual([releases(T_TWO, ALPHA.uid)])
  })

  it('nothing to change writes nothing', () => {
    expect(committed(T_TWO, null, listOf(ALPHA, BRAVO), 'all')).toEqual([])
    expect(committed(T_NONE, null, listOf(ALPHA, BRAVO), 'none')).toEqual([])
  })
})

const THEME = { preference: 'light', hue: THEME_HUE } as const
const HEADER_HEIGHT = { 'App Header': 37 }

const viewOf = (panel: PropertiesPanel | null): ScreenView => ({
  language: 'ja',
  frame: { isFullScreen: false, dividers: [], scrollbars: [] },
  appHeaderItems: {
    documentTitle: null,
    openedFileName: null,
    fileSavedAt: null,
    fileSavedByteLength: null,
    fileNeverSavedText: '',
    commands: [],
    language: 'ja',
  },
  taskGroupPanel: { pinnedTitles: [], titles: [] },
  propertiesPanel: panel,
  commandPalette: null,
  openModal: null,
  notices: [],
  confirmation: null,
  dialogueField: null,
  tooltips: [],
})

interface DrawnField {
  readonly root: FakeElement
  focus(row: string): boolean
  active(): FakeElement | null
  readonly surface: ScreenSurface
}

// see S-3, S-6
// WHY: the real DOM surface draws the panel propertiesPanelFromSelection describes; the focus is asked through the
// seam the shell holds (holdFocusPropertyField), as dfc-806 does with realFocus.
function drawnAssigneeField(taskUid: number): DrawnField {
  const built = stage(HEADER_HEIGHT)
  let held: ((row: string) => boolean) | null = null
  built.surface = domScreenSurface({
    ...wiringOf(built, THEME),
    holdFocusPropertyField: (focus) => {
      held = focus
    },
  })
  built.surface.showScreenView(viewOf(panelOf(taskUid)))
  return {
    root: built.root(),
    focus: (row) => {
      if (held === null) throw new Error('the surface handed over no focus seam')
      return (held as (row: string) => boolean)(row)
    },
    active: () => built.world.activeElement,
    surface: built.surface,
  }
}

const fieldsDrawn = (drawn: DrawnField): readonly FakeElement[] =>
  selfAndDescendants(drawn.root).filter((one) => one.getAttribute('data-assignee-field') === ASSIGNEE_ROW)

describe('AS-1 through the real DOM surface -- the PR-16 focus opens the list and lands on its filter', () => {
  it.each([
    ['nobody seated', T_NONE],
    ['one seated', T_ONE],
    ['two seated', T_TWO],
    ['material only', T_STOCK_ONLY],
  ] as const)('AS_1_OPENS_AND_FOCUSES_THE_FILTER: %s', (_name, taskUid) => {
    const drawn = drawnAssigneeField(taskUid)
    expect(drawn.focus(ASSIGNEE_ROW)).toBe(true)
    const field = fieldsDrawn(drawn)[0] as FakeElement
    expect(selfAndDescendants(field).some((one) => one.hasAttribute('data-assignee-list')), 'the list is open').toBe(true)
    expect(drawn.active()?.getAttribute('data-assignee-filter')).toBe(ASSIGNEE_ROW)
    expect(selfAndDescendants(field)).toContain(drawn.active())
  })

  it('control: asking for the name row leaves the assignee list closed and unfocused', () => {
    const drawn = drawnAssigneeField(T_TWO)
    drawn.focus('PR-1')
    const field = fieldsDrawn(drawn)[0] as FakeElement
    expect(selfAndDescendants(field)).not.toContain(drawn.active())
    expect(selfAndDescendants(field).some((one) => one.hasAttribute('data-assignee-list'))).toBe(false)
  })
})

describe('S-6 through the real DOM surface -- one field, no host list', () => {
  it.each([
    ['nobody seated', T_NONE],
    ['two seated', T_TWO],
  ] as const)('%s: one assignee field and no datalist', (_name, taskUid) => {
    const drawn = drawnAssigneeField(taskUid)
    expect(fieldsDrawn(drawn)).toHaveLength(1)
    expect(selfAndDescendants(drawn.root).filter((one) => one.tagName === 'DATALIST')).toHaveLength(0)
  })

  it('no two elements of the drawn screen share an id, with the list open too', () => {
    const drawn = drawnAssigneeField(T_TWO)
    drawn.focus(ASSIGNEE_ROW)
    const ids = selfAndDescendants(drawn.root)
      .map((one) => one.getAttribute('id'))
      .filter((id): id is string => id !== null)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
