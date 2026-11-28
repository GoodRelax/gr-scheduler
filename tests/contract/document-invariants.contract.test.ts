// Contract tests: the document invariants of table T-220.

import { describe, expect, it } from 'vitest'

import { bare, specTable, type SpecRow } from './spec-table'
import { spansOf } from './cr-710-w1-stage'
import {
  DEFAULT_CALENDAR_VALUES,
  scheduleViolations,
  type Assignment,
  type BaselineTask,
  type Calendar,
  type CarryElement,
  type CommentBox,
  type Exception,
  type HighlightBox,
  type InvariantKind,
  type Project,
  type Resource,
  type Schedule,
  type ScheduleViolation,
  type Task,
  type TaskGroup,
  type TaskGroupMember,
  type TaskOrigin,
  type TaskVisual,
  type WeekDay,
} from '../../src/entity/document-model/schedule/schedule'
import {
  SETTINGS_CONSTANTS,
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'

const T220 = specTable('T-220')

// Why: a kind the table grows is absent from this map and kindOf throws, so the table cannot
// gain a kind without this file saying so.
const KIND_BY_COLUMN: Readonly<Record<string, InvariantKind>> = {
  '一意': 'unique',
  '参照': 'reference',
  '構造': 'structure',
  '組合せ': 'combination',
  '範囲': 'range',
}

/** @purity pure */
const kindOf = (column: string): InvariantKind => {
  const kind = KIND_BY_COLUMN[column]
  if (kind === undefined) {
    throw new Error(`table T-220 states a kind this test cannot read: ${JSON.stringify(column)}`)
  }
  return kind
}

interface Invariant {
  readonly id: string
  readonly kind: InvariantKind
}

const INVARIANTS: readonly Invariant[] = T220.rows.map((row) => ({
  id: row.id,
  kind: kindOf(row.by['種別'] ?? ''),
}))

const KIND_BY_ROW: Readonly<Record<string, InvariantKind>> = INVARIANTS.reduce<
  Record<string, InvariantKind>
>((all, one) => {
  all[one.id] = one.kind
  return all
}, {})

// Why: IV-1 and IV-2 reach their material through the key column of T-058, so the sweeps below
// break every column the table marks; one broken column proves only that column.
const T058 = specTable('T-058')

const HEADING_ENTITY = 'エンティティ'
const HEADING_COLUMN = '列'
const HEADING_KEY = '鍵'

/** @purity pure */
const memberOf = (row: SpecRow): string =>
  `${bare(row.by[HEADING_ENTITY] ?? '')}.${bare(row.by[HEADING_COLUMN] ?? '')}`

// Why: two separators are accepted because T-220 and T-058 punctuate the compound key differently.
/** @purity pure */
const keyMarksOf = (row: SpecRow): readonly string[] =>
  bare(row.by[HEADING_KEY] ?? '')
    .split(/[,/]/)
    .map((mark) => mark.trim())

/** @purity pure */
const columnsMarked = (mark: string): readonly string[] =>
  T058.rows.filter((row) => keyMarksOf(row).includes(mark)).map(memberOf)

const PRIMARY_KEY_COLUMNS = columnsMarked('PK')
const FOREIGN_KEY_COLUMNS = columnsMarked('FK')

// Why: DR-1 binds three groups into a Document, but the signature takes the schedule and the
// presentation group separately, so the cases carry the same two.
interface DocumentUnderTest {
  readonly schedule: Schedule
  readonly settings: DocumentSettings
}

// Why: AT-51 types the column as a UUID, so the cases use one; the number only keeps them apart.
/** @purity pure */
const uuidOf = (n: number): string => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

/** @purity pure */
const settingsOf = (over: Readonly<Record<string, unknown>> = {}): DocumentSettings => {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries({ ...SETTINGS_DEFAULTS, ...over })) {
    const dot = key.indexOf('.')
    if (dot < 0) {
      out[key] = value
      continue
    }
    const head = key.slice(0, dot)
    const nest = { ...((out[head] as Record<string, unknown>) ?? {}) }
    nest[key.slice(dot + 1)] = value
    out[head] = nest
  }
  return out as unknown as DocumentSettings
}

const SETTINGS = settingsOf()

// Why: the ordinal is the key of AT-72 and only has to be unique inside this array (IV-1),
// so the position in the roster is enough.
/** @purity pure */
const workedWeekDays = (): readonly WeekDay[] =>
  DEFAULT_CALENDAR_VALUES['S-106'].map((dayType, i) => ({
    ordinal: i + 1,
    dayType,
    dayWorking: true,
    workingTimes: [],
    carry: {},
    carryElements: [],
  }))

const CALENDAR_UID = 1

const CALENDAR: Calendar = {
  uid: CALENDAR_UID,
  name: null,
  isBaseCalendar: true,
  baseCalendarUid: null,
  ordinal: 1,
  carry: {},
  carryElements: [],
  weekDays: workedWeekDays(),
  exceptions: [],
}

const SIX_SPANS = spansOf(
  ['01:00', '02:00'],
  ['03:00', '04:00'],
  ['05:00', '06:00'],
  ['07:00', '08:00'],
  ['09:00', '10:00'],
  ['11:00', '12:00'],
)

const calendarWithMonday = (workingTimes: ReturnType<typeof spansOf>): Calendar => ({
  ...CALENDAR,
  weekDays: workedWeekDays().map((day, i) => (i === 0 ? { ...day, workingTimes } : day)),
})

const calendarWithException = (workingTimes: ReturnType<typeof spansOf>): Calendar => ({
  ...CALENDAR,
  exceptions: [{ ...EXCEPTION_ONE, dayWorking: true, workingTimes }],
})

const PROJECT: Project = {
  id: null,
  name: null,
  title: null,
  subject: null,
  category: null,
  company: null,
  manager: null,
  author: null,
  creationDate: null,
  revision: null,
  startDate: null,
  statusDate: null,
  minutesPerDay: null,
  minutesPerWeek: null,
  daysPerMonth: null,
  weekStartDay: null,
  // Why: naming the calendar keeps the IV-17 case honest: it breaks the resolved one (FR-054).
  calendarUid: CALENDAR_UID,
  defaultStartTime: null,
  defaultFinishTime: null,
  // Why: T-220 judges nothing about the hue and AT-19 refuses null, so this is a placeholder
  // inside the column's range and not a reading of S-73.
  themeHue: 0,
  parentTaskProgressToleranceDays: 1,
  uidHighWaterMark: 400,
  importSequence: 3,
  outlineBase: 1,
  sourceFormat: 'grs',
  scheduleDataTimeZone: 'UTC+00:00',
  carry: {},
  carryElements: [],
}

const TASK_A_UID = 101
const TASK_B_UID = 102

const TASK_A: Task = {
  uid: TASK_A_UID,
  parentTaskUid: null,
  wbsOrder: 1,
  name: 'first',
  start: '2026-01-05',
  finish: '2026-01-09',
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
}

const TASK_B: Task = {
  ...TASK_A,
  uid: TASK_B_UID,
  parentTaskUid: TASK_A_UID,
  wbsOrder: 2,
  name: 'second',
  start: '2026-01-12',
  finish: '2026-01-16',
  dependencies: [
    // Why: T-220 judges nothing about the link kind and AT-46 refuses null, so this is a code
    // inside the range, not a choice of kind.
    { predecessorUid: TASK_A_UID, linkType: 1, linkLag: null, lagFormat: null, carry: {}, carryElements: [] },
  ],
}

const GROUP_ONE_ID = uuidOf(1)
const GROUP_TWO_ID = uuidOf(2)

const GROUP_ONE: TaskGroup = {
  id: GROUP_ONE_ID,
  parentId: null,
  name: 'task group one',
  derivedFromTaskUid: null,
  order: 1,
  treeState: 'auto', editPermission: null,
  color: null,
  minHeightPx: null,
}

const GROUP_TWO: TaskGroup = {
  ...GROUP_ONE,
  id: GROUP_TWO_ID,
  parentId: GROUP_ONE_ID,
  name: 'task group two',
  order: 2,
}

// Why: IV-6 asks for exactly one member per Task, so the sound document has two.
const MEMBER_A: TaskGroupMember = { taskUid: TASK_A_UID, taskGroupId: GROUP_ONE_ID }
const MEMBER_B: TaskGroupMember = { taskUid: TASK_B_UID, taskGroupId: GROUP_TWO_ID }

const RESOURCE_UID = 201

const RESOURCE: Resource = {
  uid: RESOURCE_UID,
  name: 'someone',
  resourceKind: null,
  isCostResource: null,
  calendarUid: null,
  carry: {},
  carryElements: [],
}

const ASSIGNMENT: Assignment = {
  uid: 301,
  taskUid: TASK_A_UID,
  resourceUid: RESOURCE_UID,
  carry: {},
  carryElements: [],
}

// Why: IV-9 weighs two colors, so the sound document carries a row for it to weigh;
// both are unchosen, which P-19 says is not transparent.
const VISUAL: TaskVisual = {
  taskUid: TASK_A_UID,
  shapeKind: null,
  milestoneGlyph: null,
  fillColor: null,
  strokeColor: null,
  strokeWidthPx: null,
}

const VISUAL_B: TaskVisual = { ...VISUAL, taskUid: TASK_B_UID }

// Why: IV-15 weighs this against Project.importSequence, so the two are equal: the boundary the row admits.
const ORIGIN: TaskOrigin = {
  taskUid: TASK_A_UID,
  sourceProjectId: null,
  sourceUid: 7,
  lastSeenImportSequence: PROJECT.importSequence,
  importSessionId: null,
}

const SCHEDULE: Schedule = {
  project: PROJECT,
  calendars: [CALENDAR],
  tasks: [TASK_A, TASK_B],
  resources: [RESOURCE],
  assignments: [ASSIGNMENT],
  taskGroups: [GROUP_ONE, GROUP_TWO],
  taskGroupMembers: [MEMBER_A, MEMBER_B],
  taskVisuals: [VISUAL, VISUAL_B],
  commentBoxes: [],
  highlightBoxes: [],
  taskOrigins: [ORIGIN],
  baselineTasks: [],
}

const SOUND: DocumentUnderTest = { schedule: SCHEDULE, settings: SETTINGS }

/** @purity pure */
const withSchedule = (part: Partial<Schedule>): DocumentUnderTest => ({
  ...SOUND,
  schedule: { ...SCHEDULE, ...part },
})

/** @purity pure */
const withSettings = (part: Readonly<Record<string, unknown>>): DocumentUnderTest => ({
  ...SOUND,
  settings: settingsOf(part),
})

// Why: derived from the floor the settings carry rather than typed, so moving S-119 moves this case.
/** @purity pure */
const beforeAcceptedDates = (): string =>
  `${Number(SETTINGS_CONSTANTS.importMinDate.slice(0, 4)) - 1}-01-01`

// Why: S-125 counts the depth from the root, so the chain is one link longer than the bound;
// every link names itself so that IV-8 stays whole while IV-5 breaks.
/** @purity pure */
const overDeepGroups = (): readonly TaskGroup[] => {
  const links: TaskGroup[] = []
  for (let depth = 1; depth <= SETTINGS_CONSTANTS.maxGroupDepth + 1; depth += 1) {
    links.push({
      ...GROUP_ONE,
      id: uuidOf(100 + depth),
      parentId: depth === 1 ? null : uuidOf(100 + depth - 1),
      name: `link ${depth}`,
      order: 100 + depth,
    })
  }
  return links
}

// Why: these arrays are empty in the sound document, but T-058 marks a key column in each,
// so the sweeps need a row in them.

const EXCEPTION_ONE: Exception = {
  ordinal: 1,
  name: null,
  fromDate: null,
  toDate: null,
  dayWorking: null,
  recurrenceKind: null,
  workingTimes: [],
  carry: {},
  carryElements: [],
}

const COMMENT_BOX_ONE: CommentBox = {
  id: uuidOf(11),
  leaderShapeKind: null,
  text: null,
  anchorDate: null,
  anchorTaskGroupId: null,
  anchorBandFraction: null,
  anchorTaskUid: null,
  anchorTaskFigure: null,
  anchorHighlightBoxId: null,
  anchorSnapPoint: null,
  bodyOffsetPx: null,
  strokeColor: null,
  strokeWidthPx: null,
  fillColor: null,
  fillTransparencyPercent: null,
  textColor: null,
  fontSizePx: null,
}

const HIGHLIGHT_BOX_ONE: HighlightBox = {
  id: uuidOf(21),
  start: null,
  finish: null,
  topTaskGroupId: null,
  bottomTaskGroupId: null,
  strokeColor: null,
  cornerRadiusPx: null,
  strokeWidthPx: null,
  fillColor: null,
  fillTransparencyPercent: null,
}

// Why: W-9 keeps the partner's spelling inside carryElements, so the name is one of theirs;
// only the ordinal beside it is judged.
const CARRY_ONE: CarryElement = { ordinal: 1, name: 'Cost', fields: {}, children: [] }

const BASELINE_ONE: BaselineTask = {
  uid: TASK_A_UID,
  name: null,
  start: null,
  finish: null,
  milestone: null,
}

const MISSING_UID = 999

const MISSING_GROUP_ID = uuidOf(999)

const BREACH: Readonly<Record<string, () => DocumentUnderTest>> = {
  // Why: Resource is used because no other invariant looks at it, so the breach is one row wide.
  'IV-1': () => withSchedule({ resources: [RESOURCE, { ...RESOURCE, name: 'another' }] }),

  'IV-2': () => withSchedule({ assignments: [{ ...ASSIGNMENT, resourceUid: 999 }] }),

  'IV-3': () => withSettings({ pinnedTaskGroupIds: [uuidOf(999)] }),

  'IV-4': () =>
    withSchedule({
      tasks: [{ ...TASK_A, parentTaskUid: TASK_B_UID }, TASK_B],
    }),

  'IV-5': () => withSchedule({ taskGroups: [GROUP_ONE, GROUP_TWO, ...overDeepGroups()] }),

  // Why: IV-5 may be answered alongside, since a ring has no depth to compare against S-125;
  // the assertion asks only that IV-18 is among the answers.
  'IV-18': () =>
    withSchedule({
      taskGroups: [{ ...GROUP_ONE, parentId: GROUP_TWO_ID }, GROUP_TWO],
    }),

  'IV-6': () => withSchedule({ taskGroupMembers: [MEMBER_A] }),

  'IV-23': () => withSchedule({ taskVisuals: [VISUAL] }),

  // Why: calendarUid is cleared too so IV-2 is not raised alongside; FR-054 then resolves the
  // default calendar of T-209, which is worked, so IV-17 is not raised either.
  'IV-7': () =>
    withSchedule({ calendars: [], project: { ...PROJECT, calendarUid: null } }),

  // Why: every weekday the calendar has is switched off (FR-088), not none carried: a calendar with
  // no weekday rows reads two ways under IV-17, and this breaks under either.
  'IV-17': () =>
    withSchedule({
      calendars: [
        { ...CALENDAR, weekDays: workedWeekDays().map((day) => ({ ...day, dayWorking: false })) },
      ],
    }),

  'IV-8': () =>
    withSchedule({
      taskGroups: [{ ...GROUP_ONE, name: null, derivedFromTaskUid: null }, GROUP_TWO],
    }),

  // Why: P-19 is the value that means transparent; null means unchosen.
  'IV-9': () =>
    withSchedule({
      taskVisuals: [{ ...VISUAL, fillColor: 'transparent', strokeColor: 'transparent' }, VISUAL_B],
    }),

  'IV-10': () =>
    withSchedule({
      tasks: [{ ...TASK_A, start: TASK_A.finish, finish: TASK_A.start }, TASK_B],
    }),

  'IV-11': () =>
    withSchedule({
      tasks: [{ ...TASK_A, finish: null, fadeInDays: 1 }, TASK_B],
    }),

  // Why: the fades overshoot the span by two orders of magnitude, so no reading of the span
  // (calendar or working days, ends counted or not) leaves them inside it.
  'IV-12': () =>
    withSchedule({
      tasks: [{ ...TASK_A, fadeInDays: 100, fadeOutDays: 100 }, TASK_B],
    }),

  'IV-14': () => withSchedule({ tasks: [{ ...TASK_A, start: beforeAcceptedDates() }, TASK_B] }),

  'IV-15': () =>
    withSchedule({
      taskOrigins: [{ ...ORIGIN, lastSeenImportSequence: PROJECT.importSequence + 1 }],
    }),

  // Why: this breaks the date half of IV-19 (REVERSED breaks the group half); the ids stay sound and the
  // dates inside T-214, so no IV-2 or IV-14 is raised; FR-019 leaves typed or imported values as the material.
  'IV-19': () =>
    withSchedule({
      highlightBoxes: [
        {
          ...HIGHLIGHT_BOX_ONE,
          start: TASK_A.finish,
          finish: TASK_A.start,
          topTaskGroupId: GROUP_ONE_ID,
          bottomTaskGroupId: GROUP_TWO_ID,
        },
      ],
    }),

  // Why: one whole unit under the floor S-3 names, so the bound breaks whether read inclusive or not.
  'IV-16': () => withSettings({ rulerFontSizePx: SETTINGS_CONSTANTS.fontMin - 1 }),

  // Why: every array that leans on a task group or a task is emptied too, or IV-2 and IV-6 would
  // be raised alongside; IV-20 is then the only row left to break.
  'IV-20': () =>
    withSchedule({
      taskGroups: [],
      taskGroupMembers: [],
      tasks: [],
      taskVisuals: [],
      taskOrigins: [],
      assignments: [],
    }),

  'IV-21': () =>
    withSchedule({
      tasks: [{ ...TASK_A, actualStart: TASK_A.start, stop: '2026-01-01' }, TASK_B],
    }),

  'IV-24': () => withSchedule({ calendars: [calendarWithMonday(SIX_SPANS)] }),

  'IV-22': () =>
    withSchedule({
      taskVisuals: [{ ...VISUAL, shapeKind: 'milestone' }, VISUAL_B],
    }),
}

const IV_21_OUTSIDE: Readonly<Record<string, () => DocumentUnderTest>> = {
  'a last day whose counted length is 0': () =>
    withSchedule({
      tasks: [{ ...TASK_A, actualStart: TASK_A.start, stop: '2026-01-04' }, TASK_B],
    }),

  'actualStart of null': () =>
    withSchedule({
      tasks: [{ ...TASK_A, actualStart: null, stop: '2026-01-02' }, TASK_B],
    }),
}

/** @purity pure */
const breachOf = (id: string): DocumentUnderTest => {
  const build = BREACH[id]
  if (build === undefined) throw new Error(`no case breaks table T-220 row ${id}`)
  return build()
}

/** @purity pure */
const listed = (found: readonly ScheduleViolation[]): string =>
  found.length === 0 ? 'nothing' : found.map((one) => `${one.row}/${one.kind}`).join(', ')

// Why: IV-1 and IV-2 point at the key column of T-058, and one case per row passes an answer that
// hard-codes that column; these sweeps break every column that table marks.

interface Probe {
  readonly row: string
  readonly member: string
  readonly document: () => DocumentUnderTest
}

// Why: DR-4 puts this array at the document root, outside both groups the signature takes;
// it is listed rather than dropped so that the roster still counts.
const OUT_OF_REACH: readonly string[] = ['changeLog.ordinal']

// Why: keyed the way memberOf spells the rows of T-058, so the roster is checked against the table.
const REPEATED: Readonly<Record<string, () => DocumentUnderTest>> = {
  'Task.uid': () => withSchedule({ tasks: [TASK_A, TASK_B, { ...TASK_B, name: 'copy' }] }),

  'TaskGroup.id': () =>
    withSchedule({ taskGroups: [GROUP_ONE, GROUP_TWO, { ...GROUP_TWO, order: 3 }] }),

  'TaskGroupMember.taskUid': () =>
    withSchedule({ taskGroupMembers: [MEMBER_A, MEMBER_B, { ...MEMBER_B }] }),

  'Calendar.uid': () =>
    withSchedule({ calendars: [CALENDAR, { ...CALENDAR, ordinal: 2, isBaseCalendar: false }] }),

  'WeekDay.ordinal': () =>
    withSchedule({
      calendars: [{ ...CALENDAR, weekDays: [...workedWeekDays(), ...workedWeekDays().slice(0, 1)] }],
    }),

  'Exception.ordinal': () =>
    withSchedule({
      calendars: [{ ...CALENDAR, exceptions: [EXCEPTION_ONE, { ...EXCEPTION_ONE }] }],
    }),

  'WorkingTime.ordinal': () =>
    withSchedule({
      calendars: [
        calendarWithMonday([
          { ordinal: 1, fromTime: '08:00:00', toTime: '12:00:00' },
          { ordinal: 1, fromTime: '13:00:00', toTime: '17:00:00' },
        ]),
      ],
    }),

  'Resource.uid': () => withSchedule({ resources: [RESOURCE, { ...RESOURCE, name: 'another' }] }),

  'Assignment.uid': () =>
    withSchedule({ assignments: [ASSIGNMENT, { ...ASSIGNMENT, taskUid: TASK_B_UID }] }),

  'TaskVisual.taskUid': () => withSchedule({ taskVisuals: [VISUAL, { ...VISUAL }] }),

  'TaskOrigin.taskUid': () => withSchedule({ taskOrigins: [ORIGIN, { ...ORIGIN, sourceUid: 8 }] }),

  'CommentBox.id': () =>
    withSchedule({ commentBoxes: [COMMENT_BOX_ONE, { ...COMMENT_BOX_ONE }] }),

  'HighlightBox.id': () =>
    withSchedule({ highlightBoxes: [HIGHLIGHT_BOX_ONE, { ...HIGHLIGHT_BOX_ONE }] }),

  // Why: AT-123 identifies one by the owner and the ordinal together, so both rows share one owner.
  'CarryElement.ordinal': () =>
    withSchedule({
      project: { ...PROJECT, carryElements: [CARRY_ONE, { ...CARRY_ONE, name: 'Other' }] },
    }),

  'BaselineTask.uid': () =>
    withSchedule({ baselineTasks: [BASELINE_ONE, { ...BASELINE_ONE, name: 'copy' }] }),
}

const DANGLING: Readonly<Record<string, () => DocumentUnderTest>> = {
  'Project.calendarUid': () => withSchedule({ project: { ...PROJECT, calendarUid: MISSING_UID } }),

  'Task.parentTaskUid': () =>
    withSchedule({ tasks: [TASK_A, { ...TASK_B, parentTaskUid: MISSING_UID }] }),

  'Task.calendarUid': () =>
    withSchedule({ tasks: [{ ...TASK_A, calendarUid: MISSING_UID }, TASK_B] }),

  // Why: a dependency is nested under its successor (DF-4), so the one the sound document carries is bent.
  'Dependency.predecessorUid': () =>
    withSchedule({
      tasks: [
        TASK_A,
        {
          ...TASK_B,
          dependencies: TASK_B.dependencies.map((one) => ({
            ...one,
            predecessorUid: MISSING_UID,
          })),
        },
      ],
    }),

  'TaskGroup.parentId': () =>
    withSchedule({ taskGroups: [GROUP_ONE, { ...GROUP_TWO, parentId: MISSING_GROUP_ID }] }),

  'TaskGroup.derivedFromTaskUid': () =>
    withSchedule({
      taskGroups: [{ ...GROUP_ONE, derivedFromTaskUid: MISSING_UID }, GROUP_TWO],
    }),

  'TaskGroupMember.taskUid': () =>
    withSchedule({ taskGroupMembers: [MEMBER_A, { ...MEMBER_B, taskUid: MISSING_UID }] }),

  'TaskGroupMember.taskGroupId': () =>
    withSchedule({ taskGroupMembers: [MEMBER_A, { ...MEMBER_B, taskGroupId: MISSING_GROUP_ID }] }),

  'Calendar.baseCalendarUid': () =>
    withSchedule({ calendars: [{ ...CALENDAR, baseCalendarUid: MISSING_UID }] }),

  'Resource.calendarUid': () =>
    withSchedule({ resources: [{ ...RESOURCE, calendarUid: MISSING_UID }] }),

  'Assignment.taskUid': () =>
    withSchedule({ assignments: [{ ...ASSIGNMENT, taskUid: MISSING_UID }] }),

  'Assignment.resourceUid': () =>
    withSchedule({ assignments: [{ ...ASSIGNMENT, resourceUid: MISSING_UID }] }),

  'TaskVisual.taskUid': () => withSchedule({ taskVisuals: [{ ...VISUAL, taskUid: MISSING_UID }] }),

  'TaskOrigin.taskUid': () => withSchedule({ taskOrigins: [{ ...ORIGIN, taskUid: MISSING_UID }] }),

  'CommentBox.anchorTaskGroupId': () =>
    withSchedule({ commentBoxes: [{ ...COMMENT_BOX_ONE, anchorTaskGroupId: MISSING_GROUP_ID }] }),

  'CommentBox.anchorTaskUid': () =>
    withSchedule({
      commentBoxes: [
        {
          ...COMMENT_BOX_ONE,
          anchorTaskUid: MISSING_UID,
          anchorTaskFigure: 'plannedBar',
          anchorSnapPoint: 'topMiddle',
        },
      ],
    }),

  'CommentBox.anchorHighlightBoxId': () =>
    withSchedule({
      commentBoxes: [
        { ...COMMENT_BOX_ONE, anchorHighlightBoxId: MISSING_GROUP_ID, anchorSnapPoint: 'topMiddle' },
      ],
    }),

  'HighlightBox.topTaskGroupId': () =>
    withSchedule({ highlightBoxes: [{ ...HIGHLIGHT_BOX_ONE, topTaskGroupId: MISSING_GROUP_ID }] }),

  'HighlightBox.bottomTaskGroupId': () =>
    withSchedule({ highlightBoxes: [{ ...HIGHLIGHT_BOX_ONE, bottomTaskGroupId: MISSING_GROUP_ID }] }),
}

// Why: this breaks the group half of IV-19, so an answer that judged only the dates fails;
// GROUP_TWO is the child of GROUP_ONE, so naming it the top puts the top below the bottom.
const REVERSED: Readonly<Record<string, () => DocumentUnderTest>> = {
  'HighlightBox.topTaskGroupId': () =>
    withSchedule({
      highlightBoxes: [
        {
          ...HIGHLIGHT_BOX_ONE,
          start: TASK_A.start,
          finish: TASK_A.finish,
          topTaskGroupId: GROUP_TWO_ID,
          bottomTaskGroupId: GROUP_ONE_ID,
        },
      ],
    }),
}

// Spec: IV-24
const BAD_WORKING_TIMES: Readonly<Record<string, () => DocumentUnderTest>> = {
  'a weekday span that ends before it starts': () =>
    withSchedule({ calendars: [calendarWithMonday(spansOf(['17:00', '08:00']))] }),

  'a weekday span that starts where it ends': () =>
    withSchedule({ calendars: [calendarWithMonday(spansOf(['08:00', '08:00']))] }),

  'two weekday spans that overlap': () =>
    withSchedule({ calendars: [calendarWithMonday(spansOf(['08:00', '13:00'], ['12:00', '17:00']))] }),

  'an exception day with six spans': () => withSchedule({ calendars: [calendarWithException(SIX_SPANS)] }),

  'an exception day span that ends before it starts': () =>
    withSchedule({ calendars: [calendarWithException(spansOf(['17:00', '08:00']))] }),

  'two exception day spans that overlap': () =>
    withSchedule({ calendars: [calendarWithException(spansOf(['08:00', '13:00'], ['12:00', '17:00']))] }),
}

// Spec: IV-10
const REVERSED_BY_THE_CLOCK: Readonly<Record<string, () => DocumentUnderTest>> = {
  'the same day, finish at 08:00 and start at 17:00': () =>
    withSchedule({ tasks: [{ ...TASK_A, start: '2026-01-05T17:00:00', finish: '2026-01-05T08:00:00' }, TASK_B] }),

  'the same day, finish one minute before the start': () =>
    withSchedule({ tasks: [{ ...TASK_A, start: '2026-01-05T08:01:00', finish: '2026-01-05T08:00:00' }, TASK_B] }),
}

// Spec: IV-14
const UNREADABLE_TIMES: Readonly<Record<string, () => DocumentUnderTest>> = {
  'an hour that does not exist': () =>
    withSchedule({ tasks: [{ ...TASK_A, start: '2026-01-05T25:00:00' }, TASK_B] }),
}

// Spec: IV-24, IV-10, IV-14
const NOT_REPORTED: Readonly<Record<string, { readonly row: string; readonly document: () => DocumentUnderTest }>> = {
  'IV-24 for a weekday with no span': { row: 'IV-24', document: () => withSchedule({ calendars: [calendarWithMonday([])] }) },

  'IV-24 for five spans of one weekday': {
    row: 'IV-24',
    document: () =>
      withSchedule({
        calendars: [
          calendarWithMonday(spansOf(['01:00', '02:00'], ['03:00', '04:00'], ['05:00', '06:00'], ['07:00', '08:00'], ['09:00', '10:00'])),
        ],
      }),
  },

  'IV-24 for two spans that touch': {
    row: 'IV-24',
    document: () => withSchedule({ calendars: [calendarWithMonday(spansOf(['08:00', '12:00'], ['12:00', '17:00']))] }),
  },

  'IV-24 for a span that ends at 00:00:00, which is 24:00': {
    row: 'IV-24',
    document: () => withSchedule({ calendars: [calendarWithMonday(spansOf(['22:00', '00:00']))] }),
  },

  'IV-24 for a working exception day with a sound span': {
    row: 'IV-24',
    document: () => withSchedule({ calendars: [calendarWithException(spansOf(['09:00', '12:00']))] }),
  },

  'IV-10 for a finish that is the start': {
    row: 'IV-10',
    document: () =>
      withSchedule({ tasks: [{ ...TASK_A, start: '2026-01-05T17:00:00', finish: '2026-01-05T17:00:00' }, TASK_B] }),
  },

  'IV-10 for a finish later on the same day': {
    row: 'IV-10',
    document: () =>
      withSchedule({ tasks: [{ ...TASK_A, start: '2026-01-05T08:00:00', finish: '2026-01-05T17:00:00' }, TASK_B] }),
  },

  'IV-14 for a time on the minute': {
    row: 'IV-14',
    document: () => withSchedule({ tasks: [{ ...TASK_A, start: '2026-01-05T08:01:00' }, TASK_B] }),
  },
}

/** @purity pure */
const probesOf = (
  row: string,
  built: Readonly<Record<string, () => DocumentUnderTest>>,
): readonly Probe[] =>
  Object.entries(built).map(([member, document]) => ({ row, member, document }))

const PROBES: readonly Probe[] = [
  ...probesOf('IV-1', REPEATED),
  ...probesOf('IV-2', DANGLING),
  ...probesOf('IV-19', REVERSED),
  ...probesOf('IV-24', BAD_WORKING_TIMES),
  ...probesOf('IV-10', REVERSED_BY_THE_CLOCK),
  ...probesOf('IV-14', UNREADABLE_TIMES),
]

// Spec: T-220, PI-1
// Why: only row and kind are asserted, and presence rather than count or order: the table states
// no order, no count, and nothing of what `at` and `what` hold.
describe('table T-220 -- the document invariants, through scheduleViolations (PI-1)', () => {
  it('has a case for every row of the table, and no case for a row it does not have', () => {
    // Why: both directions, or a row added to T-220 passes unnoticed.
    expect(Object.keys(BREACH).sort()).toEqual(INVARIANTS.map((one) => one.id).sort())
  })

  it('answers nothing for a document that breaks no row', () => {
    const found = scheduleViolations(SOUND.schedule, SOUND.settings)
    expect(found, `the sound document was reported for ${listed(found)}`).toEqual([])
  })

  // Spec: IMPS-1300
  it.each(INVARIANTS)('$id is reported, and as a $kind', ({ id, kind }) => {
    const broken = breachOf(id)
    const found = scheduleViolations(broken.schedule, broken.settings)
    const mine = found.filter((one) => one.row === id)

    expect(mine.length, `${id} was not reported; the answer held ${listed(found)}`).toBeGreaterThan(0)
    for (const one of mine) expect(one.kind).toBe(kind)
  })

  it('names no row outside the table, and gives no row a kind the table does not', () => {
    const all = [
      ...INVARIANTS.map((invariant) => ({ named: invariant.id, built: () => breachOf(invariant.id) })),
      ...PROBES.map((probe) => ({ named: `${probe.row} over ${probe.member}`, built: probe.document })),
    ]
    for (const { named, built } of all) {
      const broken = built()
      for (const one of scheduleViolations(broken.schedule, broken.settings)) {
        expect(
          KIND_BY_ROW[one.row],
          `the case for ${named} answered ${one.row}/${one.kind}`,
        ).toBe(one.kind)
      }
    }
  })

  it('breaks every primary key column table T-058 marks, and no column it does not', () => {
    // Why: both directions, so a key column added to T-058 has to reach this file.
    expect([...Object.keys(REPEATED), ...OUT_OF_REACH].sort()).toEqual([...PRIMARY_KEY_COLUMNS].sort())
  })

  it('breaks every foreign key column table T-058 marks, and no column it does not', () => {
    expect(Object.keys(DANGLING).sort()).toEqual([...FOREIGN_KEY_COLUMNS].sort())
  })

  // Spec: IMPS-841
  it.each(PROBES)('$row is reported for $member too', ({ row, member, document }) => {
    const broken = document()
    const found = scheduleViolations(broken.schedule, broken.settings)
    const mine = found.filter((one) => one.row === row)

    expect(
      mine.length,
      `${row} was not reported for ${member}; the answer held ${listed(found)}`,
    ).toBeGreaterThan(0)
    for (const one of mine) expect(one.kind).toBe(KIND_BY_ROW[row])
  })

  it.each(Object.entries(IV_21_OUTSIDE))('IV-21 is not reported for %s', (_label, document) => {
    const broken = document()
    const found = scheduleViolations(broken.schedule, broken.settings)

    expect(found.filter((one) => one.row === 'IV-21'), listed(found)).toEqual([])
  })

  it.each(Object.entries(NOT_REPORTED))('%s', (_label, { row, document }) => {
    const broken = document()
    const found = scheduleViolations(broken.schedule, broken.settings)

    expect(found.filter((one) => one.row === row), listed(found)).toEqual([])
  })

  // Spec: IMPS-765
  it('IV-14 is not reported for a time with seconds: it reads truncated to the minute (DFC-2453, CR-741)', () => {
    const held = withSchedule({ tasks: [{ ...TASK_A, start: '2026-01-05T08:00:30' }, TASK_B] })
    const found = scheduleViolations(held.schedule, held.settings)

    expect(found.filter((one) => one.row === 'IV-14'), listed(found)).toEqual([])
  })
})
