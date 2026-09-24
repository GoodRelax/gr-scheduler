// H10 spec-only cases: the assignee field holds one line per seated person plus one empty line (CR-547, AS-12).

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
import { layoutFromSchedule } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
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
import type {
  FieldCommit,
  PropertiesPanel,
  PropertyControl,
  PropertyField,
  PropertyFieldKey,
  ScreenSurface,
  ScreenView,
  ScreenViewReadings,
} from '../../src/adapter/screen-renderer/screen-renderer'
import { propertiesPanelFromSelection } from '../../src/adapter/screen-renderer/properties-panel'
import {
  commandFromFieldCommit,
  type InputContext,
} from '../../src/adapter/input-command-translator/input-command-translator'
import { domScreenSurface } from '../../src/framework/dom-screen-surface/dom-screen-surface'
import { bare, specTable, unbroken } from '../contract/spec-table'
import { selfAndDescendants, stage, wiringOf, type FakeElement, type World } from '../fixtures/fake-browser'

const AS_1_FOCUS_LINE =
  '焦点を置くのは、押した担当ラベルが名を出している担当者の欄（`FR-059`）とし、ラベルが `-` を出しているとき（`AS-2`）は空の欄とすること（MUST）'
const AS_3_ONLY_THAT_LINE =
  '⭐ 解くのは、押した・確定した担当者の欄（`AS-5`）の担当者の割当だけであり、ほかの欄の割当を解いてはならない（MUST NOT）'
const AS_3_EMPTY_LINE_WRITES_NOTHING = '空の欄では何も書かない —— 解く割当が無い。'
const AS_5_ONE_LINE_EACH_AND_ONE_EMPTY =
  '⭐ 担当者の欄は、そのタスクに就いている担当者 1 人につき 1 つ出し、その下に空の欄を常に 1 つ出すこと（MUST）'
const AS_5_SAME_ORDER_AS_FR_059 = '欄の並びは、`FR-059` が担当ラベルに定める順と同じとすること（MUST）'
const AS_5_NO_KIND_FILTER = '⭐ 欄に出す担当者は、資源の種類で絞らない'
const AS_7_ON_A_SEATED_LINE_TOO = '⛔ 就いている担当者の欄で受け取っても、同じように振る舞うこと（MUST）'
const AS_7_THE_LINE_DECIDES =
  '⭐ 差し替えるか足すかは、受け取った欄が決める（`AS-12`） —— 就いている担当者の欄ならその人の割当を解き（表 T-108 の `CM-45`、`AS-3` と同じ語）、空の欄なら解かない'
const AS_12_SEATED_LINE_REPLACES =
  '就いている担当者の欄で受け取ったときは、受け取った担当者を就け（表 T-108 の `CM-44`）、その欄の担当者の割当を解くことを、1 回の呼び出しで行うこと（MUST）'
const AS_12_EMPTY_LINE_ONLY_SEATS =
  '空の欄で受け取ったときは就けるだけとし、ほかの欄の割当を解いてはならない（MUST NOT）'
const AS_12_ALREADY_SEATED_WRITES_NOTHING =
  '⭐ 受け取った担当者がそのタスクに既に就いていれば、何も書かない（`AS-10`） —— 受け取った欄の担当者そのものでも、別の欄の担当者でも同じである'
const T_225_NEW_NAME_COUNTS =
  '名簿に無い名前を空の欄で受け取れば `CM-40` と `CM-44` の 2 つ、就いている担当者の欄で受け取ればそれに `CM-45` が加わって 3 つである。'
const T_225_ROSTER_COUNTS =
  '名簿の人を空の欄で受け取れば `CM-44` の 1 つ、就いている担当者の欄で受け取れば `CM-44` と `CM-45` の 2 つである。'
const FR_059_ORDER = '複数が割り当てられているときは、**資源名の昇順で先頭 1 名と残りの人数**で示すこと（同名は `UID` の昇順）。'
const FR_059_WORK_ONLY =
  '担当ラベルを描くとき、`GRS` は、**作業資源だけ**を対象とし、材料資源・費用資源・名前が空の資源を出さないこと。'
const PR_16_POINTS_AT_T_225 = '入口と選び方は `FR-008` の表 T-225 が持つ。'
const UN_15_TARGET = '**担当者（資源）と割当の追加・改名・解除**（`FR-008`）'
const JDG_527_LANDING = '就いている人の欄で選び直すと、その人を替える（`AS-7`）'

const readText = (...parts: string[]): string =>
  readFileSync(join(process.cwd(), ...parts), 'utf8').replace(/\r\n/g, '\n')
const REQUIREMENTS = unbroken(readText('docs', 'spec', '01-04-requirements.md'))
const PROPERTY_ITEMS = unbroken(readText('docs', 'spec', '_assets', 'tbl-property-items.md'))
const RULINGS = readText('docs', 'development-records', 'rulings.md')

describe('the clauses this file is driven by still stand (T-225, FR-059, T-016, T-027, JDG-527)', () => {
  it.each([
    ['AS-1 focus line', AS_1_FOCUS_LINE],
    ['AS-3 only that line', AS_3_ONLY_THAT_LINE],
    ['AS-3 empty line writes nothing', AS_3_EMPTY_LINE_WRITES_NOTHING],
    ['AS-5 one line each and one empty', AS_5_ONE_LINE_EACH_AND_ONE_EMPTY],
    ['AS-5 same order as FR-059', AS_5_SAME_ORDER_AS_FR_059],
    ['AS-5 no kind filter', AS_5_NO_KIND_FILTER],
    ['AS-7 on a seated line too', AS_7_ON_A_SEATED_LINE_TOO],
    ['AS-7 the line decides', AS_7_THE_LINE_DECIDES],
    ['AS-12 seated line replaces', AS_12_SEATED_LINE_REPLACES],
    ['AS-12 empty line only seats', AS_12_EMPTY_LINE_ONLY_SEATS],
    ['AS-12 already seated writes nothing', AS_12_ALREADY_SEATED_WRITES_NOTHING],
    ['T-225 paragraph: new-name counts', T_225_NEW_NAME_COUNTS],
    ['T-225 paragraph: roster counts', T_225_ROSTER_COUNTS],
    ['FR-059 order', FR_059_ORDER],
    ['FR-059 work resources only', FR_059_WORK_ONLY],
    ['UN-15 target', UN_15_TARGET],
  ])('01-04 holds %s', (_name, clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })

  it('T-016 PR-16 still points at T-225 for how the assignee is chosen', () => {
    expect(PROPERTY_ITEMS).toContain(PR_16_POINTS_AT_T_225)
  })

  it('JDG-527 lands as "re-choosing on a seated line replaces that person"', () => {
    expect(RULINGS).toContain(JDG_527_LANDING)
  })

  it('T-225 carries AS-12 right after AS-10', () => {
    const ids = specTable('T-225').rows.map((row) => row.id)
    expect(ids.slice(-2)).toEqual(['AS-10', 'AS-12'])
  })
})

const CM_40 = 'createResource'
const CM_44 = 'createAssignment'
const CM_45 = 'unassignResource'
const UNASSIGN_TOKEN = '-'
const ASSIGNEE_ROW = 'PR-16'

const WORK = 1
const MATERIAL = 0

const S_73 = specTable('T-216').rows.find((row) => row.id === 'S-73')
if (S_73 === undefined) throw new Error('table T-216 no longer has row S-73')
const THEME_HUE = Number(bare(S_73.by['既定'] ?? ''))

const SETTINGS = {
  ...SETTINGS_DEFAULTS,
  exportCanvas: { width: 1600, height: 900 },
  fontScaleSizes: { L: 16, M: 14, S: 12 },
  planActualGuidePattern: { off: 2, on: 2 },
  shapeHeightOf: { arrow: 0.5, chevron: 1, endpointSpan: 0.5, milestone: 1.5, rectangle: 1 },
  scrollDate: '2026-01-01',
  scrollGroupId: 'g1',
  stackDirection: 'down',
  assigneeVisible: true,
} as unknown as DocumentSettings

const ENV: ScreenEnvironment = { width: 1000, height: 700, appHeaderHeight: 56, scrollbarThickness: 8 }
const ZOOM_STEP = 3
const TODAY = '2026-03-01T00:00:00'

const taskOf = (uid: number): Task =>
  ({
    uid,
    wbsParentUid: null,
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

// WHY: uid order and insertion order both put BRAVO first, name order puts ALPHA first,
// so only the FR-059 order passes the two-person case.
const BRAVO = personOf(1, 'Bravo')
const ALPHA = personOf(2, 'Alpha')
const TWIN_LOW = personOf(3, 'Twin')
const TWIN_HIGH = personOf(4, 'Twin')
const STOCK = personOf(5, 'Material', MATERIAL)
const WORKER = personOf(6, 'Worker')
const CHARLIE = personOf(7, 'Charlie')
const NEW_NAME = 'Nobody'
const ROSTER = [BRAVO, ALPHA, TWIN_LOW, TWIN_HIGH, STOCK, WORKER, CHARLIE]

const T_NONE = 20
const T_ONE = 21
const T_TWO = 22
const T_TWINS = 23
const T_MIXED = 24
const T_STOCK_ONLY = 25
const T_DOUBLED = 26
const TASK_UIDS = [T_NONE, T_ONE, T_TWO, T_TWINS, T_MIXED, T_STOCK_ONLY, T_DOUBLED]

const HIGH_WATER_MARK = 40

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
  ],
  taskGroups: TASK_UIDS.map((_uid, index) => ({
    id: `g${index + 1}`,
    parentId: null,
    label: `row ${index + 1}`,
    order: index,
    height: null,
  })),
  taskGroupMembers: TASK_UIDS.map((taskUid, index) => ({ groupId: `g${index + 1}`, taskUid })),
  taskVisuals: [],
  commentBoxes: [],
  highlightBoxes: [],
  taskOrigins: [],
  baselineTasks: [],
} as unknown as Schedule

const REGIONS = regionsFromScreen(ENV, SETTINGS)
const LAYOUT = layoutFromSchedule(SCHEDULE, SETTINGS, REGIONS)
const GEOMETRY = geometryFromLayout(SCHEDULE, SETTINGS, LAYOUT, REGIONS, emptySelection())

const CONTEXT: InputContext = {
  document: {
    schemaVersion: '2026-01-01',
    schedule: SCHEDULE,
    documentSettings: SETTINGS,
    documentStamp: {
      scheduleUpdatedUtc: '2026-01-01T00:00:00Z',
      lastEditedBy: 'test',
      settingsUpdatedUtc: '2026-01-01T00:00:00Z',
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
  newGroupId: 'row-minted-outside',
  newCommentBoxId: 'comment-box-minted-outside',
  newHighlightBoxId: 'highlight-box-minted-outside',
}

const SESSION: ScreenSession = {
  ...emptyScreenSession,
  screen: {
    ...emptyScreenSession.screen,
    language: 'ja',
    dialogueFieldDisplayState: { kind: 'shown' },
    milestoneListDisplayState: { kind: 'closed' },
    paletteDisplayState: { kind: 'shown', child: { kind: 'expanded' } },
    dualCursorModeState: { kind: 'off' },
    propertiesPanelContentState: {
      kind: 'selectionDisplayed',
      subject: { selection: emptySelection(), groupIds: [] },
    },
  },
}

const READINGS: ScreenViewReadings = {
  openedFileName: null,
  fileSavedAt: null,
  isAgentApiEnabled: false,
  pointer: null,
  pointerRestedMs: 0,
  commandPaletteAt: { x: 0, y: 0 },
  iconUnderPointer: null,
  themePreference: 'light',
  themeHue: THEME_HUE,
  selectedGroupIds: [],
  selectedResourceUids: [],
  notices: [],
  confirmation: null,
  rowBoxes: [],
  scrollExtent: { contentWidth: 0, contentHeight: 0, visibleHeight: 0 },
}

const assigneeLinesOf = (taskUid: number): readonly PropertyControl[] => {
  const panel = propertiesPanelFromSelection(
    SCHEDULE,
    SETTINGS,
    selectionWith(emptySelection(), { kind: 'task', uid: taskUid } as ItemRef),
    SESSION,
    READINGS,
  ) as PropertiesPanel | null
  expect(panel).not.toBe(null)
  const fields = (panel as PropertiesPanel).fields.filter((field) => field.row === ASSIGNEE_ROW)
  expect(fields).toHaveLength(1)
  return (fields[0] as PropertyField).controls
}

const lineKey = (taskUid: number, resourceUid: number | null): PropertyFieldKey => ({
  holder: 'assignment',
  taskUid,
  resourceUid,
  column: 'resourceUid',
})

const lineUidsOf = (controls: readonly PropertyControl[]): readonly (number | null)[] =>
  controls.map((control) => (control.key as { resourceUid?: number | null }).resourceUid ?? null)

const focusUidsOf = (controls: readonly PropertyControl[]): readonly (number | null)[] =>
  lineUidsOf(controls.filter((control) => control.isFocusTarget === true))

type Shape = Readonly<Record<string, unknown>>

const shapeOf = (command: DocumentCommand): Shape => {
  const record = command as unknown as Record<string, unknown>
  if (record['kind'] === CM_40) return { kind: CM_40, name: record['name'] }
  return { kind: record['kind'], taskUid: record['taskUid'], resourceUid: record['resourceUid'] }
}

const make = (name: string): Shape => ({ kind: CM_40, name })
const seats = (taskUid: number, resourceUid: number): Shape => ({ kind: CM_44, taskUid, resourceUid })
const releases = (taskUid: number, resourceUid: number): Shape => ({ kind: CM_45, taskUid, resourceUid })

const committed = (taskUid: number, lineUid: number | null, text: string): readonly Shape[] => {
  const commit: FieldCommit = { row: ASSIGNEE_ROW, key: lineKey(taskUid, lineUid), text }
  return commandFromFieldCommit(commit, CONTEXT).map(shapeOf)
}

const NEW_PERSON_UID = HIGH_WATER_MARK + 1

describe('AS-5 -- one line per seated person, then one empty line', () => {
  it('AS_5_ONE_LINE_EACH_AND_ONE_EMPTY: nobody seated -> the empty line alone', () => {
    expect(lineUidsOf(assigneeLinesOf(T_NONE))).toEqual([null])
  })

  it('AS_5_ONE_LINE_EACH_AND_ONE_EMPTY: one seated -> that person, then the empty line', () => {
    expect(lineUidsOf(assigneeLinesOf(T_ONE))).toEqual([BRAVO.uid, null])
  })

  it('AS_5_SAME_ORDER_AS_FR_059: two seated -> name ascending (Alpha before Bravo), then empty', () => {
    expect(lineUidsOf(assigneeLinesOf(T_TWO))).toEqual([ALPHA.uid, BRAVO.uid, null])
  })

  it('AS_5_SAME_ORDER_AS_FR_059: same name -> uid ascending', () => {
    expect(lineUidsOf(assigneeLinesOf(T_TWINS))).toEqual([TWIN_LOW.uid, TWIN_HIGH.uid, null])
  })

  it('AS_5_NO_KIND_FILTER: a material resource keeps its line beside the work resource', () => {
    expect(lineUidsOf(assigneeLinesOf(T_MIXED))).toEqual([STOCK.uid, WORKER.uid, null])
  })

  it('AS-5 one per person: two assignments of one pair -> still one line for that person', () => {
    expect(lineUidsOf(assigneeLinesOf(T_DOUBLED))).toEqual([ALPHA.uid, null])
  })

  it('every line carries the S-1 key: holder assignment, the task, the resource uid or null', () => {
    const lines = assigneeLinesOf(T_TWO)
    expect(lines.map((control) => control.key)).toEqual([
      lineKey(T_TWO, ALPHA.uid),
      lineKey(T_TWO, BRAVO.uid),
      lineKey(T_TWO, null),
    ])
  })

  it('AS-5: every line is the same roster chooser with the same search words', () => {
    const lines = assigneeLinesOf(T_TWO)
    const first = lines[0] as PropertyControl
    expect(first.kind).toBe('choice')
    expect(first.choices ?? []).toHaveLength(ROSTER.length)
    expect(first.searchWords).not.toBe(undefined)
    for (const line of lines) {
      expect(line.kind).toBe('choice')
      expect(line.choices).toEqual(first.choices)
      expect(line.choiceValues).toEqual(first.choiceValues)
      expect(line.searchWords).toEqual(first.searchWords)
    }
  })
})

describe('AS-1 -- exactly one line is the focus target', () => {
  it.each([
    ['nobody seated -> the empty line', T_NONE, null],
    ['one seated -> that person', T_ONE, BRAVO.uid],
    ['two seated -> the one FR-059 names first', T_TWO, ALPHA.uid],
    ['same name -> the smaller uid', T_TWINS, TWIN_LOW.uid],
    ['material listed first -> the work resource the label names', T_MIXED, WORKER.uid],
    ['material only -> the label draws "-", so the empty line', T_STOCK_ONLY, null],
  ] as const)('AS_1_FOCUS_LINE: %s', (_name, taskUid, focused) => {
    expect(focusUidsOf(assigneeLinesOf(taskUid))).toEqual([focused])
  })
})

describe('AS-3 -- "-" releases the person of that line only', () => {
  it('AS_3_ONLY_THAT_LINE: "-" on Bravo\'s line -> releases Bravo alone', () => {
    expect(committed(T_TWO, BRAVO.uid, UNASSIGN_TOKEN)).toEqual([releases(T_TWO, BRAVO.uid)])
  })

  it('AS_3_ONLY_THAT_LINE: "-" on Alpha\'s line -> releases Alpha alone', () => {
    expect(committed(T_TWO, ALPHA.uid, UNASSIGN_TOKEN)).toEqual([releases(T_TWO, ALPHA.uid)])
  })

  it('AS_3_EMPTY_LINE_WRITES_NOTHING: "-" on the empty line of a seated task -> nothing', () => {
    expect(committed(T_TWO, null, UNASSIGN_TOKEN)).toEqual([])
  })

  it('AS_3_EMPTY_LINE_WRITES_NOTHING: "-" on the empty line of an unseated task -> nothing', () => {
    expect(committed(T_NONE, null, UNASSIGN_TOKEN)).toEqual([])
  })
})

describe('AS-12 -- a roster person arriving on a line', () => {
  it('AS_12_EMPTY_LINE_ONLY_SEATS: on the empty line of a two-person task -> seats, releases nobody', () => {
    expect(committed(T_TWO, null, CHARLIE.name as string)).toEqual([seats(T_TWO, CHARLIE.uid)])
  })

  it('AS_12_EMPTY_LINE_ONLY_SEATS: on the empty line of an unseated task -> seats', () => {
    expect(committed(T_NONE, null, CHARLIE.name as string)).toEqual([seats(T_NONE, CHARLIE.uid)])
  })

  it('AS_12_SEATED_LINE_REPLACES: on Bravo\'s line -> seat Charlie, then release Bravo, in one call', () => {
    expect(committed(T_TWO, BRAVO.uid, CHARLIE.name as string)).toEqual([
      seats(T_TWO, CHARLIE.uid),
      releases(T_TWO, BRAVO.uid),
    ])
  })

  it('AS_12_SEATED_LINE_REPLACES: on Alpha\'s line -> seat Charlie, then release Alpha', () => {
    expect(committed(T_TWO, ALPHA.uid, CHARLIE.name as string)).toEqual([
      seats(T_TWO, CHARLIE.uid),
      releases(T_TWO, ALPHA.uid),
    ])
  })

  it('AS_12_SEATED_LINE_REPLACES via AS-9: the value the chooser commits for Charlie replaces too', () => {
    const line = assigneeLinesOf(T_TWO)[1] as PropertyControl
    const words = line.choices ?? []
    const at = words.indexOf(CHARLIE.name as string)
    expect(at).toBeGreaterThanOrEqual(0)
    const picked = line.choiceValues?.[at] ?? (words[at] as string)
    expect(committed(T_TWO, BRAVO.uid, picked)).toEqual([
      seats(T_TWO, CHARLIE.uid),
      releases(T_TWO, BRAVO.uid),
    ])
  })

  it.each([
    ['its own line', ALPHA.uid],
    ['another seated line', BRAVO.uid],
    ['the empty line', null],
  ] as const)('AS_12_ALREADY_SEATED_WRITES_NOTHING: Alpha arriving on %s -> nothing', (_name, lineUid) => {
    expect(committed(T_TWO, lineUid, ALPHA.name as string)).toEqual([])
  })
})

describe('AS-7 / AS-12 -- a name the roster does not hold', () => {
  it('AS_7_ON_A_SEATED_LINE_TOO: on Bravo\'s line -> make, seat the new uid, release Bravo', () => {
    expect(committed(T_TWO, BRAVO.uid, NEW_NAME)).toEqual([
      make(NEW_NAME),
      seats(T_TWO, NEW_PERSON_UID),
      releases(T_TWO, BRAVO.uid),
    ])
  })

  it('AS_7_THE_LINE_DECIDES: on the empty line -> make and seat, release nobody', () => {
    expect(committed(T_TWO, null, NEW_NAME)).toEqual([make(NEW_NAME), seats(T_TWO, NEW_PERSON_UID)])
  })
})

describe('S-5 -- a line whose person left the task before the commit', () => {
  // WHY: S-5 of CR-547 is a seam, not a clause: CM-45 on a pair the task no longer holds would
  // be refused and AG-3 throws the whole call away, so the seam answers with nothing.
  it.each([
    ['"-"', UNASSIGN_TOKEN],
    ['a roster person not on the task', WORKER.name as string],
    ['a new name', NEW_NAME],
  ] as const)('stale line (Charlie, not seated) receiving %s -> nothing', (_name, text) => {
    expect(committed(T_TWO, CHARLIE.uid, text)).toEqual([])
  })
})

describe('controls -- what a do-nothing reading would still pass', () => {
  it('a seated line and the empty line both write something for a person not yet on the task', () => {
    expect(committed(T_ONE, BRAVO.uid, CHARLIE.name as string)).not.toEqual([])
    expect(committed(T_ONE, null, CHARLIE.name as string)).not.toEqual([])
    expect(committed(T_ONE, BRAVO.uid, UNASSIGN_TOKEN)).not.toEqual([])
  })

  it('one seated person: the empty line and the seated line tell add from replace', () => {
    expect(committed(T_ONE, null, CHARLIE.name as string)).toEqual([seats(T_ONE, CHARLIE.uid)])
    expect(committed(T_ONE, BRAVO.uid, CHARLIE.name as string)).toEqual([
      seats(T_ONE, CHARLIE.uid),
      releases(T_ONE, BRAVO.uid),
    ])
  })
})

const NAME_ROW = 'PR-1'
const THEME = { preference: 'light', hue: THEME_HUE } as const
const HEADER_HEIGHT = { 'App Header': 37 }

const viewOf = (panel: PropertiesPanel | null): ScreenView => ({
  language: 'ja',
  frame: { isFullScreen: false, dividers: [], scrollbars: [] },
  appHeaderItems: {
    documentTitle: null,
    openedFileName: null,
    fileSavedAt: null,
    fileNeverSavedText: '',
    commands: [],
    language: 'ja',
  },
  rowTitlePanel: { pinnedTitles: [], titles: [] },
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
  readonly lines: readonly PropertyControl[]
  readonly selects: readonly FakeElement[]
  readonly searches: readonly FakeElement[]
  focus(row: string): boolean
  active(): FakeElement | null
  readonly surface: ScreenSurface
  readonly world: World
}

// see S-3, S-6
// WHY: the real DOM surface draws the panel propertiesPanelFromSelection describes; the focus is
// asked through the seam the shell holds (holdFocusPropertyField), as dfc-806 does with realFocus.
function drawnAssigneeField(taskUid: number): DrawnField {
  const built = stage(HEADER_HEIGHT)
  let held: ((row: string) => boolean) | null = null
  built.surface = domScreenSurface({
    ...wiringOf(built, THEME),
    holdFocusPropertyField: (focus) => {
      held = focus
    },
  })
  const panel = propertiesPanelFromSelection(
    SCHEDULE,
    SETTINGS,
    selectionWith(emptySelection(), { kind: 'task', uid: taskUid } as ItemRef),
    SESSION,
    READINGS,
  ) as PropertiesPanel
  built.surface.showScreenView(viewOf(panel))
  const inRow = selfAndDescendants(built.root()).filter(
    (one) => one.getAttribute('data-field-row') === ASSIGNEE_ROW,
  )
  const field = panel.fields.find((one) => one.row === ASSIGNEE_ROW) as PropertyField
  return {
    root: built.root(),
    lines: field.controls,
    selects: inRow.filter((one) => one.tagName === 'SELECT'),
    searches: inRow.filter((one) => one.hasAttribute('list')),
    focus: (row) => {
      if (held === null) throw new Error('the surface handed over no focus seam')
      return (held as (row: string) => boolean)(row)
    },
    active: () => built.world.activeElement,
    surface: built.surface,
    world: built.world,
  }
}

const focusIndexOf = (lines: readonly PropertyControl[]): number =>
  lines.findIndex((control) => control.isFocusTarget === true)

describe('S-3 through the real DOM surface -- the PR-16 focus lands on the isFocusTarget line', () => {
  it.each([
    ['nobody seated -> the empty line', T_NONE],
    ['one seated -> that person', T_ONE],
    ['two seated -> the one FR-059 names first', T_TWO],
    ['material listed first -> the work resource the label names (line 2)', T_MIXED],
    ['material only -> the empty line (line 2)', T_STOCK_ONLY],
  ] as const)('AS_1_FOCUS_LINE: %s', (_name, taskUid) => {
    const drawn = drawnAssigneeField(taskUid)
    expect(drawn.selects, 'one drawn chooser per line').toHaveLength(drawn.lines.length)
    expect(drawn.searches, 'one drawn search box per line').toHaveLength(drawn.lines.length)
    const at = focusIndexOf(drawn.lines)
    expect(at).toBeGreaterThanOrEqual(0)
    expect(drawn.focus(ASSIGNEE_ROW)).toBe(true)
    expect([drawn.selects[at], drawn.searches[at]]).toContain(drawn.active())
  })

  it('premise: two of the fixtures put the focus line after the first line', () => {
    expect(focusIndexOf(drawnAssigneeField(T_MIXED).lines)).toBe(1)
    expect(focusIndexOf(drawnAssigneeField(T_STOCK_ONLY).lines)).toBe(1)
  })

  it('control: asking for the name row leaves every PR-16 line unfocused', () => {
    const drawn = drawnAssigneeField(T_MIXED)
    drawn.focus(NAME_ROW)
    expect([...drawn.selects, ...drawn.searches]).not.toContain(drawn.active())
  })
})

describe('S-6 through the real DOM surface -- one roster list for every line', () => {
  it.each([
    ['one line', T_NONE],
    ['three lines', T_TWO],
  ] as const)('%s: every search box points at the same single datalist', (_name, taskUid) => {
    const drawn = drawnAssigneeField(taskUid)
    const targets = new Set(drawn.searches.map((one) => one.getAttribute('list')))
    expect(targets.size).toBe(1)
    const target = [...targets][0] as string
    const lists = selfAndDescendants(drawn.root).filter(
      (one) => one.tagName === 'DATALIST' && one.getAttribute('id') === target,
    )
    expect(lists).toHaveLength(1)
  })

  it('no two elements of the drawn screen share an id', () => {
    const drawn = drawnAssigneeField(T_TWO)
    const ids = selfAndDescendants(drawn.root)
      .map((one) => one.getAttribute('id'))
      .filter((id): id is string => id !== null)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

const DELETE_KEY = 'Delete'

interface KeyOutcome {
  readonly commit: FieldCommit | null
  readonly propagated: boolean
}

// see AS-3
// WHY: a keydown bubbles from the target up through its ancestors; the listeners the surface
// registered on each node run in turn, and stopPropagation ends the walk as a browser would.
function pressKeyOn(drawn: DrawnField, target: FakeElement, ctrlKey = false): KeyOutcome {
  let stopped = false
  const event = {
    type: 'keydown',
    key: DELETE_KEY,
    code: DELETE_KEY,
    ctrlKey,
    shiftKey: false,
    altKey: false,
    metaKey: false,
    isComposing: false,
    repeat: false,
    target,
    currentTarget: null as FakeElement | null,
    defaultPrevented: false,
    preventDefault(): void {
      event.defaultPrevented = true
    },
    stopPropagation(): void {
      stopped = true
    },
    stopImmediatePropagation(): void {
      stopped = true
    },
  }
  for (let at: FakeElement | null = target; at !== null && !stopped; at = at.parentNode) {
    const node = at
    const listeners = drawn.world.registrations.filter((one) => one.node === node && one.type === 'keydown')
    event.currentTarget = node
    for (const one of listeners) one.listener(event)
  }
  return { commit: drawn.surface.readFieldCommit(), propagated: !stopped }
}

describe('AS-3 through the real DOM surface -- Del on a line releases that line only', () => {
  it.each([
    ['Alpha', 0, ALPHA.uid],
    ['Bravo', 1, BRAVO.uid],
  ] as const)('AS_3_ONLY_THAT_LINE: Del on %s\'s chooser -> "-" on that line, not propagated', (_name, at, uid) => {
    const drawn = drawnAssigneeField(T_TWO)
    const outcome = pressKeyOn(drawn, drawn.selects[at] as FakeElement)
    expect(outcome.commit).toEqual({ row: ASSIGNEE_ROW, key: lineKey(T_TWO, uid), text: UNASSIGN_TOKEN })
    expect(outcome.propagated, 'no Task delete may follow the key').toBe(false)
    expect(commandFromFieldCommit(outcome.commit as FieldCommit, CONTEXT).map(shapeOf)).toEqual([
      releases(T_TWO, uid),
    ])
  })

  it('AS_3_EMPTY_LINE_WRITES_NOTHING: Del on the empty line\'s chooser -> its commit writes nothing', () => {
    const drawn = drawnAssigneeField(T_TWO)
    const outcome = pressKeyOn(drawn, drawn.selects[2] as FakeElement)
    expect(outcome.commit).toEqual({ row: ASSIGNEE_ROW, key: lineKey(T_TWO, null), text: UNASSIGN_TOKEN })
    expect(outcome.propagated).toBe(false)
    expect(commandFromFieldCommit(outcome.commit as FieldCommit, CONTEXT)).toEqual([])
  })

  it('control: Del in a line\'s search box is text editing -- no commit, and the key goes on', () => {
    const drawn = drawnAssigneeField(T_TWO)
    const outcome = pressKeyOn(drawn, drawn.searches[1] as FakeElement)
    expect(outcome.commit).toBe(null)
    expect(outcome.propagated).toBe(true)
  })

  it('control: Ctrl+Del on a chooser commits nothing', () => {
    const drawn = drawnAssigneeField(T_TWO)
    expect(pressKeyOn(drawn, drawn.selects[1] as FakeElement, true).commit).toBe(null)
  })
})
