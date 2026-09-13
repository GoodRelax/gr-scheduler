// Schedule: the schedule group's types, working-day arithmetic, and the document invariants.
// @unit      UF-1   (docs/spec/05-07-design.md, table T-075)
// @component Schedule, layer documentModel (table T-062)
// @purity    pure
// @publishes table T-064 row PI-1

import {
  SETTINGS_BOUNDS,
  type DocumentSettings,
  type SettingsBoundToken,
} from '../document-settings/document-settings'

// <generated -- do not edit by hand>
// Single source of truth:
//   docs/spec/_source/erd.json
//   docs/spec/_source/settings.json (table T-209)
// Rebuild: npm run gen   ||   npm run gen:check fails on drift.
/** ET-1 of table T-056. */
export interface Project {
  /** AT-1 */
  readonly id: string | null
  /** AT-2 */
  readonly name: string | null
  /** AT-3 */
  readonly title: string | null
  /** AT-4 */
  readonly subject: string | null
  /** AT-5 */
  readonly category: string | null
  /** AT-6 */
  readonly company: string | null
  /** AT-7 */
  readonly manager: string | null
  /** AT-8 */
  readonly author: string | null
  /** AT-9 */
  readonly created: string | null
  /** AT-10 */
  readonly revision: number | null
  /** AT-11 */
  readonly lastSaved: string | null
  /** AT-12 */
  readonly startDate: string | null
  /** AT-13 */
  readonly statusDate: string | null
  /** AT-14 */
  readonly minutesPerDay: number | null
  /** AT-15 */
  readonly minutesPerWeek: number | null
  /** AT-16 */
  readonly daysPerMonth: number | null
  /** AT-17 */
  readonly weekStartDay: number | null
  /** AT-18 */
  readonly calendarUid: number | null
  /** AT-19 */
  readonly themeHue: number
  /** AT-20 */
  readonly uidHighWaterMark: number
  /** AT-21 */
  readonly importSeq: number
  /** AT-22 */
  readonly carry: Readonly<Record<string, string>>
  /** AT-23 */
  readonly carryElements: readonly CarryElement[]
  /** AT-139 */
  readonly outlineBase: number
}

/** ET-2 of table T-056. */
export interface Task {
  /** AT-24 */
  readonly uid: number
  /** AT-25 */
  readonly wbsParentUid: number | null
  /** AT-26 */
  readonly wbsOrder: number | null
  /** AT-27 */
  readonly name: string | null
  /** AT-28 */
  readonly start: string | null
  /** AT-29 */
  readonly finish: string | null
  /** AT-30 */
  readonly milestone: boolean | null
  /** AT-31 */
  readonly deadline: string | null
  /** AT-32 */
  readonly notes: string | null
  /** AT-33 */
  readonly calendarUid: number | null
  /** AT-34 */
  readonly actualStart: string | null
  /** AT-35 */
  readonly actualDuration: number | null
  /** AT-36 */
  readonly actualFinish: string | null
  /** AT-37 */
  readonly resume: string | null
  /** AT-38 */
  readonly resumeValid: boolean | null
  /** AT-39 */
  readonly percentComplete: number | null
  /** AT-40 */
  readonly fadeInDays: number | null
  /** AT-41 */
  readonly fadeOutDays: number | null
  /** AT-42 */
  readonly dependencies: readonly Dependency[]
  /** AT-43 */
  readonly carry: Readonly<Record<string, string>>
  /** AT-44 */
  readonly carryElements: readonly CarryElement[]
}

/** ET-3 of table T-056. */
export interface Dependency {
  /** AT-45 */
  readonly predecessorUid: number
  /** AT-46 */
  readonly linkType: number
  /** AT-47 */
  readonly lag: number | null
  /** AT-48 */
  readonly lagFormat: number | null
  /** AT-49 */
  readonly carry: Readonly<Record<string, string>>
  /** AT-50 */
  readonly carryElements: readonly CarryElement[]
}

/** ET-4 of table T-056. */
export interface TaskGroup {
  /** AT-51 */
  readonly id: string
  /** AT-52 */
  readonly parentId: string | null
  /** AT-53 */
  readonly label: string | null
  /** AT-54 */
  readonly derivedFromTaskUid: number | null
  /** AT-55 */
  readonly order: number
  /** AT-56 */
  readonly isCollapsed: boolean | null
  /** AT-57 */
  readonly isHidden: boolean | null
  /** AT-58 */
  readonly color: string | null
  /** AT-59 */
  readonly height: number | null
}

/** ET-5 of table T-056. */
export interface TaskGroupMember {
  /** AT-60 */
  readonly taskUid: number
  /** AT-61 */
  readonly groupId: string
  /** AT-62 */
  readonly stackOrder: number | null
}

/** ET-6 of table T-056. */
export interface Calendar {
  /** AT-63 */
  readonly uid: number
  /** AT-64 */
  readonly name: string | null
  /** AT-65 */
  readonly isBaseCalendar: boolean | null
  /** AT-66 */
  readonly baseCalendarUid: number | null
  /** AT-67 */
  readonly ordinal: number
  /** AT-68 */
  readonly carry: Readonly<Record<string, string>>
  /** AT-69 */
  readonly carryElements: readonly CarryElement[]
  /** AT-70 */
  readonly weekDays: readonly WeekDay[]
  /** AT-71 */
  readonly exceptions: readonly Exception[]
}

/** ET-7 of table T-056. */
export interface WeekDay {
  /** AT-72 */
  readonly ordinal: number
  /** AT-73 */
  readonly dayType: number | null
  /** AT-74 */
  readonly dayWorking: boolean | null
  /** AT-75 */
  readonly carry: Readonly<Record<string, string>>
  /** AT-76 */
  readonly carryElements: readonly CarryElement[]
}

/** ET-8 of table T-056. */
export interface Exception {
  /** AT-77 */
  readonly ordinal: number
  /** AT-78 */
  readonly name: string | null
  /** AT-79 */
  readonly fromDate: string | null
  /** AT-80 */
  readonly toDate: string | null
  /** AT-81 */
  readonly dayWorking: boolean | null
  /** AT-82 */
  readonly recurrenceKind: number | null
  /** AT-83 */
  readonly carry: Readonly<Record<string, string>>
  /** AT-84 */
  readonly carryElements: readonly CarryElement[]
}

/** ET-9 of table T-056. */
export interface Resource {
  /** AT-85 */
  readonly uid: number
  /** AT-86 */
  readonly name: string | null
  /** AT-87 */
  readonly resourceKind: number | null
  /** AT-88 */
  readonly isCostResource: boolean | null
  /** AT-89 */
  readonly calendarUid: number | null
  /** AT-90 */
  readonly carry: Readonly<Record<string, string>>
  /** AT-91 */
  readonly carryElements: readonly CarryElement[]
}

/** ET-10 of table T-056. */
export interface Assignment {
  /** AT-92 */
  readonly uid: number
  /** AT-93 */
  readonly taskUid: number | null
  /** AT-94 */
  readonly resourceUid: number | null
  /** AT-95 */
  readonly carry: Readonly<Record<string, string>>
  /** AT-96 */
  readonly carryElements: readonly CarryElement[]
}

/** ET-11 of table T-056. */
export interface TaskVisual {
  /** AT-97 */
  readonly taskUid: number
  /** AT-98 */
  readonly nameAnchor: number | null
  /** AT-99 */
  readonly nameAlign: 'left' | 'center' | 'right' | null
  /** AT-100 */
  readonly shapeKind: 'rectangle' | 'chevron' | 'arrow' | 'endpointSpan' | 'milestone' | null
  /** AT-101 */
  readonly milestoneGlyph: 'circle' | 'hexagon' | 'pentagon' | 'diamond' | 'square' | 'star' | 'triangleUp' | 'triangleDown' | 'file' | 'box' | 'floppyDisk' | 'cylinder' | 'person' | 'smile' | 'beerMug' | null
  /** AT-102 */
  readonly fillColor: string | null
  /** AT-103 */
  readonly strokeColor: string | null
  /** AT-104 */
  readonly lineWeight: 'thin' | 'medium' | 'thick' | null
}

/** ET-12 of table T-056. */
export interface TaskOrigin {
  /** AT-105 */
  readonly taskUid: number
  /** AT-106 */
  readonly sourceProjectUid: string | null
  /** AT-107 */
  readonly sourceUid: number
  /** AT-108 */
  readonly lastSeenImportSeq: number
  /** AT-109 */
  readonly importSessionId: string | null
}

/** ET-13 of table T-056. */
export interface CommentBox {
  /** AT-110 */
  readonly id: string
  /** AT-111 */
  readonly leaderShapeKind: 'calloutBox' | 'polyline' | null
  /** AT-112 */
  readonly text: string | null
  /** AT-113 */
  readonly anchorDate: string | null
  /** AT-114 */
  readonly anchorGroupId: string | null
  /** AT-115 */
  readonly bodyOffsetPx: { readonly dx: number, readonly dy: number } | null
}

/** ET-14 of table T-056. */
export interface HighlightBox {
  /** AT-116 */
  readonly id: string
  /** AT-117 */
  readonly startDate: string | null
  /** AT-118 */
  readonly endDate: string | null
  /** AT-119 */
  readonly topGroupId: string | null
  /** AT-120 */
  readonly bottomGroupId: string | null
  /** AT-121 */
  readonly strokeColor: string | null
  /** AT-122 */
  readonly cornerRadiusPx: number | null
}

/** ET-15 of table T-056. */
export interface CarryElement {
  /** AT-123 */
  readonly ordinal: number
  /** AT-124 */
  readonly name: string
  /** AT-125 */
  readonly fields: Readonly<Record<string, string>>
  /** AT-126 */
  readonly children: readonly CarryElement[]
}

/** ET-18 of table T-056. */
export interface BaselineTask {
  /** AT-134 */
  readonly uid: number
  /** AT-135 */
  readonly name: string | null
  /** AT-136 */
  readonly start: string | null
  /** AT-137 */
  readonly finish: string | null
  /** AT-138 */
  readonly milestone: boolean | null
}

// see DR-2
export interface Schedule {
  readonly project: Project
  readonly calendars: readonly Calendar[]
  readonly tasks: readonly Task[]
  readonly resources: readonly Resource[]
  readonly assignments: readonly Assignment[]
  readonly taskGroups: readonly TaskGroup[]
  readonly taskGroupMembers: readonly TaskGroupMember[]
  readonly taskVisuals: readonly TaskVisual[]
  readonly commentBoxes: readonly CommentBox[]
  readonly highlightBoxes: readonly HighlightBox[]
  readonly taskOrigins: readonly TaskOrigin[]
  readonly baselineTasks: readonly BaselineTask[]
}

// see T-058, IV-14
export const DATE_COLUMNS: {
  readonly Project: readonly (keyof Project & string)[]
  readonly Task: readonly (keyof Task & string)[]
  readonly Exception: readonly (keyof Exception & string)[]
  readonly CommentBox: readonly (keyof CommentBox & string)[]
  readonly HighlightBox: readonly (keyof HighlightBox & string)[]
  readonly BaselineTask: readonly (keyof BaselineTask & string)[]
} = {
  Project: ['created', 'lastSaved', 'startDate', 'statusDate'],
  Task: ['start', 'finish', 'deadline', 'actualStart', 'actualFinish', 'resume'],
  Exception: ['fromDate', 'toDate'],
  CommentBox: ['anchorDate'],
  HighlightBox: ['startDate', 'endDate'],
  BaselineTask: ['start', 'finish'],
}

// see T-058
export interface ColumnShape {
  readonly kind: string
  readonly choices: readonly string[] | null
  readonly min: number | null
  readonly max: number | null
  readonly isNullable: boolean
}

// see T-058, T-016
export const COLUMN_SHAPES: {
  readonly Task: {
    readonly [column: string]: ColumnShape
  }
  readonly TaskVisual: {
    readonly [column: string]: ColumnShape
  }
  readonly TaskGroup: {
    readonly [column: string]: ColumnShape
  }
  readonly Dependency: {
    readonly [column: string]: ColumnShape
  }
  readonly CommentBox: {
    readonly [column: string]: ColumnShape
  }
} = {
  Task: {
    uid: { kind: 'integer', choices: null, min: null, max: null, isNullable: false },
    wbsParentUid: { kind: 'integer', choices: null, min: null, max: null, isNullable: true },
    wbsOrder: { kind: 'integer', choices: null, min: null, max: null, isNullable: true },
    name: { kind: 'string', choices: null, min: null, max: null, isNullable: true },
    start: { kind: 'string', choices: null, min: null, max: null, isNullable: true },
    finish: { kind: 'string', choices: null, min: null, max: null, isNullable: true },
    milestone: { kind: 'boolean', choices: null, min: null, max: null, isNullable: true },
    deadline: { kind: 'string', choices: null, min: null, max: null, isNullable: true },
    notes: { kind: 'string', choices: null, min: null, max: null, isNullable: true },
    calendarUid: { kind: 'integer', choices: null, min: null, max: null, isNullable: true },
    actualStart: { kind: 'string', choices: null, min: null, max: null, isNullable: true },
    actualDuration: { kind: 'integer', choices: null, min: null, max: null, isNullable: true },
    actualFinish: { kind: 'string', choices: null, min: null, max: null, isNullable: true },
    resume: { kind: 'string', choices: null, min: null, max: null, isNullable: true },
    resumeValid: { kind: 'boolean', choices: null, min: null, max: null, isNullable: true },
    percentComplete: { kind: 'integer', choices: null, min: 0, max: null, isNullable: true },
    fadeInDays: { kind: 'integer', choices: null, min: 0, max: null, isNullable: true },
    fadeOutDays: { kind: 'integer', choices: null, min: 0, max: null, isNullable: true },
    dependencies: { kind: 'array', choices: null, min: null, max: null, isNullable: false },
    carry: { kind: 'map', choices: null, min: null, max: null, isNullable: false },
    carryElements: { kind: 'array', choices: null, min: null, max: null, isNullable: false },
  },
  TaskVisual: {
    taskUid: { kind: 'integer', choices: null, min: null, max: null, isNullable: false },
    nameAnchor: { kind: 'integer', choices: null, min: 0, max: 8, isNullable: true },
    nameAlign: { kind: 'enum', choices: ['left', 'center', 'right'], min: null, max: null, isNullable: true },
    shapeKind: { kind: 'enum', choices: ['rectangle', 'chevron', 'arrow', 'endpointSpan', 'milestone'], min: null, max: null, isNullable: true },
    milestoneGlyph: { kind: 'enum', choices: ['circle', 'hexagon', 'pentagon', 'diamond', 'square', 'star', 'triangleUp', 'triangleDown', 'file', 'box', 'floppyDisk', 'cylinder', 'person', 'smile', 'beerMug'], min: null, max: null, isNullable: true },
    fillColor: { kind: 'string', choices: null, min: null, max: null, isNullable: true },
    strokeColor: { kind: 'string', choices: null, min: null, max: null, isNullable: true },
    lineWeight: { kind: 'enum', choices: ['thin', 'medium', 'thick'], min: null, max: null, isNullable: true },
  },
  TaskGroup: {
    id: { kind: 'string', choices: null, min: null, max: null, isNullable: false },
    parentId: { kind: 'string', choices: null, min: null, max: null, isNullable: true },
    label: { kind: 'string', choices: null, min: null, max: null, isNullable: true },
    derivedFromTaskUid: { kind: 'integer', choices: null, min: null, max: null, isNullable: true },
    order: { kind: 'integer', choices: null, min: null, max: null, isNullable: false },
    isCollapsed: { kind: 'boolean', choices: null, min: null, max: null, isNullable: true },
    isHidden: { kind: 'boolean', choices: null, min: null, max: null, isNullable: true },
    color: { kind: 'string', choices: null, min: null, max: null, isNullable: true },
    height: { kind: 'integer', choices: null, min: null, max: null, isNullable: true },
  },
  Dependency: {
    predecessorUid: { kind: 'integer', choices: null, min: null, max: null, isNullable: false },
    linkType: { kind: 'integer', choices: null, min: 0, max: 3, isNullable: false },
    lag: { kind: 'integer', choices: null, min: null, max: null, isNullable: true },
    lagFormat: { kind: 'integer', choices: null, min: null, max: null, isNullable: true },
    carry: { kind: 'map', choices: null, min: null, max: null, isNullable: false },
    carryElements: { kind: 'array', choices: null, min: null, max: null, isNullable: false },
  },
  CommentBox: {
    id: { kind: 'string', choices: null, min: null, max: null, isNullable: false },
    leaderShapeKind: { kind: 'enum', choices: ['calloutBox', 'polyline'], min: null, max: null, isNullable: true },
    text: { kind: 'string', choices: null, min: null, max: null, isNullable: true },
    anchorDate: { kind: 'string', choices: null, min: null, max: null, isNullable: true },
    anchorGroupId: { kind: 'string', choices: null, min: null, max: null, isNullable: true },
    bodyOffsetPx: { kind: 'object', choices: null, min: null, max: null, isNullable: true },
  },
}

// see T-057
export interface ForeignKeyColumn {
  readonly fromColumn: string
  readonly child: string
  readonly toColumn: string
}

export interface NestedRows {
  readonly column: string
  readonly entity: string
}

// see T-056, T-058
export interface EntityRows {
  readonly entity: string
  readonly scheduleKey: string | null
  readonly many: boolean
  readonly primaryKey: readonly string[]
  readonly foreignKeys: readonly ForeignKeyColumn[]
  readonly nested: readonly NestedRows[]
}

// see IV-1, IV-2
export const ENTITY_ROWS: readonly EntityRows[] = [
  {
    entity: 'Project',
    scheduleKey: 'project',
    many: false,
    primaryKey: [],
    foreignKeys: [{ fromColumn: 'calendarUid', child: 'Calendar', toColumn: 'uid' }],
    nested: [{ column: 'carryElements', entity: 'CarryElement' }],
  },
  {
    entity: 'Task',
    scheduleKey: 'tasks',
    many: true,
    primaryKey: ['uid'],
    foreignKeys: [
      { fromColumn: 'wbsParentUid', child: 'Task', toColumn: 'uid' },
      { fromColumn: 'calendarUid', child: 'Calendar', toColumn: 'uid' },
    ],
    nested: [
      { column: 'dependencies', entity: 'Dependency' },
      { column: 'carryElements', entity: 'CarryElement' },
    ],
  },
  {
    entity: 'Dependency',
    scheduleKey: null,
    many: false,
    primaryKey: [],
    foreignKeys: [{ fromColumn: 'predecessorUid', child: 'Task', toColumn: 'uid' }],
    nested: [{ column: 'carryElements', entity: 'CarryElement' }],
  },
  {
    entity: 'TaskGroup',
    scheduleKey: 'taskGroups',
    many: true,
    primaryKey: ['id'],
    foreignKeys: [
      { fromColumn: 'parentId', child: 'TaskGroup', toColumn: 'id' },
      { fromColumn: 'derivedFromTaskUid', child: 'Task', toColumn: 'uid' },
    ],
    nested: [],
  },
  {
    entity: 'TaskGroupMember',
    scheduleKey: 'taskGroupMembers',
    many: true,
    primaryKey: ['taskUid'],
    foreignKeys: [
      { fromColumn: 'taskUid', child: 'Task', toColumn: 'uid' },
      { fromColumn: 'groupId', child: 'TaskGroup', toColumn: 'id' },
    ],
    nested: [],
  },
  {
    entity: 'Calendar',
    scheduleKey: 'calendars',
    many: true,
    primaryKey: ['uid'],
    foreignKeys: [{ fromColumn: 'baseCalendarUid', child: 'Calendar', toColumn: 'uid' }],
    nested: [
      { column: 'carryElements', entity: 'CarryElement' },
      { column: 'weekDays', entity: 'WeekDay' },
      { column: 'exceptions', entity: 'Exception' },
    ],
  },
  {
    entity: 'WeekDay',
    scheduleKey: null,
    many: false,
    primaryKey: ['ordinal'],
    foreignKeys: [],
    nested: [{ column: 'carryElements', entity: 'CarryElement' }],
  },
  {
    entity: 'Exception',
    scheduleKey: null,
    many: false,
    primaryKey: ['ordinal'],
    foreignKeys: [],
    nested: [{ column: 'carryElements', entity: 'CarryElement' }],
  },
  {
    entity: 'Resource',
    scheduleKey: 'resources',
    many: true,
    primaryKey: ['uid'],
    foreignKeys: [{ fromColumn: 'calendarUid', child: 'Calendar', toColumn: 'uid' }],
    nested: [{ column: 'carryElements', entity: 'CarryElement' }],
  },
  {
    entity: 'Assignment',
    scheduleKey: 'assignments',
    many: true,
    primaryKey: ['uid'],
    foreignKeys: [
      { fromColumn: 'taskUid', child: 'Task', toColumn: 'uid' },
      { fromColumn: 'resourceUid', child: 'Resource', toColumn: 'uid' },
    ],
    nested: [{ column: 'carryElements', entity: 'CarryElement' }],
  },
  {
    entity: 'TaskVisual',
    scheduleKey: 'taskVisuals',
    many: true,
    primaryKey: ['taskUid'],
    foreignKeys: [{ fromColumn: 'taskUid', child: 'Task', toColumn: 'uid' }],
    nested: [],
  },
  {
    entity: 'TaskOrigin',
    scheduleKey: 'taskOrigins',
    many: true,
    primaryKey: ['taskUid'],
    foreignKeys: [{ fromColumn: 'taskUid', child: 'Task', toColumn: 'uid' }],
    nested: [],
  },
  {
    entity: 'CommentBox',
    scheduleKey: 'commentBoxes',
    many: true,
    primaryKey: ['id'],
    foreignKeys: [{ fromColumn: 'anchorGroupId', child: 'TaskGroup', toColumn: 'id' }],
    nested: [],
  },
  {
    entity: 'HighlightBox',
    scheduleKey: 'highlightBoxes',
    many: true,
    primaryKey: ['id'],
    foreignKeys: [
      { fromColumn: 'topGroupId', child: 'TaskGroup', toColumn: 'id' },
      { fromColumn: 'bottomGroupId', child: 'TaskGroup', toColumn: 'id' },
    ],
    nested: [],
  },
  {
    entity: 'CarryElement',
    scheduleKey: null,
    many: false,
    primaryKey: ['ordinal'],
    foreignKeys: [],
    nested: [{ column: 'children', entity: 'CarryElement' }],
  },
  {
    entity: 'BaselineTask',
    scheduleKey: 'baselineTasks',
    many: true,
    primaryKey: ['uid'],
    foreignKeys: [],
    nested: [],
  },
]

// see T-058
export const COLUMN_DEFAULTS: {
  readonly Project: {
    readonly outlineBase: NonNullable<Project['outlineBase']>
  }
  readonly TaskVisual: {
    readonly milestoneGlyph: NonNullable<TaskVisual['milestoneGlyph']>
  }
} = {
  Project: { outlineBase: 1 },
  TaskVisual: { milestoneGlyph: 'diamond' },
}

// see T-209, FR-054
export const DEFAULT_CALENDAR_VALUES: {
  /** S-106, as `WeekDay.dayType` (1 = Sunday) */
  readonly 'S-106': readonly number[]
  /** S-107, as `WeekDay.dayType` (1 = Sunday) */
  readonly 'S-107': readonly number[]
  /** S-108, as `Project.weekStartDay` (0 = Sunday) */
  readonly 'S-108': number
  /** S-128, the number the row states */
  readonly 'S-128': number
} = {
  'S-106': [2, 3, 4, 5, 6],
  'S-107': [],
  'S-108': 1,
  'S-128': 480,
}
// </generated>

export type PlanActualState =
  | 'notStarted'
  | 'finished'
  | 'suspendedResumeUnknown'
  | 'suspendedResumePlanned'
  | 'inProgress'

// see T-019a
/** @purity pure */
export function planActualState(task: Task): PlanActualState {
  if (task.actualStart === null) return 'notStarted'
  if (task.actualFinish !== null) return 'finished'
  if (task.resumeValid === false) return 'suspendedResumeUnknown'
  if (task.resume !== null) return 'suspendedResumePlanned'
  return 'inProgress'
}

/** @purity pure */
export function taskByUid(schedule: Schedule, uid: number): Task | null {
  return schedule.tasks.find((task) => task.uid === uid) ?? null
}

export interface CalendarDay {
  readonly year: number
  readonly month: number
  readonly day: number
}

// TRAP: the day is the lexical date part; converting through a time zone moves it by one on some machines.
const DATE_HEAD = /^(\d{4})-(\d{2})-(\d{2})(?:[T ].*)?$/

// see FR-054, EX-2
/** @purity pure */
export function dayOf(text: string | null): CalendarDay | null {
  if (text === null) return null
  const hit = DATE_HEAD.exec(text.trim())
  if (hit === null) return null
  const [year, month, day] = [Number(hit[1]), Number(hit[2]), Number(hit[3])]
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  const round = new Date(Date.UTC(year, month - 1, day))
  if (round.getUTCMonth() !== month - 1 || round.getUTCDate() !== day) return null
  return { year, month, day }
}

// see EX-7
/** @purity pure */
export function textOfDay(day: CalendarDay): string {
  const pad = (n: number, width: number): string => String(n).padStart(width, '0')
  return `${pad(day.year, 4)}-${pad(day.month, 2)}-${pad(day.day, 2)}T00:00:00`
}

/** @purity pure */
export function compareDays(a: CalendarDay, b: CalendarDay): number {
  if (a.year !== b.year) return a.year - b.year
  if (a.month !== b.month) return a.month - b.month
  return a.day - b.day
}

// TRAP: Date.UTC maps years 0 to 99 onto 1900 to 1999; dayOf's round-trip check shares
// the mapping, so a fix must change both.
/** @purity pure */
function serial(day: CalendarDay): number {
  return Date.UTC(day.year, day.month - 1, day.day) / 86400000
}

// see FD-6, IV-12
/** @purity pure */
export function calendarDaysBetween(from: CalendarDay, to: CalendarDay): number {
  return serial(to) - serial(from)
}

/** @purity pure */
function dayFromSerial(value: number): CalendarDay {
  const at = new Date(value * 86400000)
  return { year: at.getUTCFullYear(), month: at.getUTCMonth() + 1, day: at.getUTCDate() }
}

export interface WorkingCalendar {
  readonly calendar: Calendar
  readonly weekDays: readonly WeekDay[]
  readonly exceptions: readonly Exception[]
}

interface ExceptionSpan {
  readonly from: number
  readonly toInclusive: number
  readonly isWorking: boolean
}

interface CalendarIndex {
  readonly exceptionSpans: readonly ExceptionSpan[]
  readonly worksWeekday: readonly (boolean | undefined)[]
}

// TRAP: build it once per walk, never per day: the layout counts working days for every Task each frame.
/** @purity pure */
function indexOfCalendar(within: WorkingCalendar): CalendarIndex {
  const exceptionSpans: ExceptionSpan[] = []
  for (const exception of within.exceptions) {
    const from = dayOf(exception.fromDate)
    if (from === null) continue
    const toInclusive = dayOf(exception.toDate) ?? from
    exceptionSpans.push({
      from: serial(from),
      toInclusive: serial(toInclusive),
      isWorking: exception.dayWorking === true,
    })
  }

  const worksWeekday: (boolean | undefined)[] = new Array<boolean | undefined>(8)
  for (const weekDay of within.weekDays) {
    const dayType = weekDay.dayType
    if (dayType === null || dayType < 1 || dayType > 7) continue
    if (worksWeekday[dayType] === undefined) worksWeekday[dayType] = weekDay.dayWorking === true
  }

  return { exceptionSpans, worksWeekday }
}

/** @purity pure */
function isWorkingDayAt(index: CalendarIndex, atSerial: number): boolean {
  for (const span of index.exceptionSpans) {
    if (atSerial >= span.from && atSerial <= span.toInclusive) return span.isWorking
  }
  const weekday = new Date(atSerial * 86400000).getUTCDay() + 1
  return index.worksWeekday[weekday] === true
}

/** @purity pure */
export function isWorkingDay(within: WorkingCalendar, day: CalendarDay): boolean {
  return isWorkingDayAt(indexOfCalendar(within), serial(day))
}

const DEFAULT_WEEK_DAYS: readonly WeekDay[] = [1, 2, 3, 4, 5, 6, 7].map((dayType, ordinal) => ({
  ordinal,
  dayType,
  // TRAP: S-106 is in dayType numbering (1 = Sunday), not weekStartDay's (0 = Sunday).
  dayWorking: DEFAULT_CALENDAR_VALUES['S-106'].includes(dayType),
  carry: {},
  carryElements: [],
}))

const DEFAULT_CALENDAR: Calendar = {
  uid: 0,
  name: null,
  isBaseCalendar: true,
  baseCalendarUid: null,
  ordinal: 0,
  carry: {},
  carryElements: [],
  weekDays: DEFAULT_WEEK_DAYS,
  exceptions: [],
}

// WHY: baseCalendarUid is not walked; the import resolves inheritance once instead of every frame.
// see FR-054
/** @purity pure */
export function workingCalendarOf(schedule: Schedule): WorkingCalendar {
  const named = schedule.project.calendarUid
  const held = named === null ? undefined : schedule.calendars.find((one) => one.uid === named)
  const base = schedule.calendars
    .filter((one) => one.isBaseCalendar === true)
    .reduce<Calendar | undefined>(
      (best, one) => (best === undefined || one.ordinal < best.ordinal ? one : best),
      undefined,
    )
  const calendar = held ?? base ?? DEFAULT_CALENDAR
  return { calendar, weekDays: calendar.weekDays, exceptions: calendar.exceptions }
}

const IMPORT_MIN_DAY: CalendarDay = { year: 1970, month: 1, day: 1 }
const IMPORT_MAX_DAY: CalendarDay = { year: 2200, month: 12, day: 31 }

const ACCEPTED_DAY_SPAN = serial(IMPORT_MAX_DAY) - serial(IMPORT_MIN_DAY)

// see T-214
export class NoWorkingDayReached extends Error {
  /** @purity pure */
  constructor(readonly calendarUid: number) {
    super(`table T-214: calendar ${calendarUid} works no day inside the accepted range`)
    this.name = 'NoWorkingDayReached'
  }
}

// see T-214
export class DaySpanTooWide extends Error {
  /** @purity pure */
  constructor(readonly from: CalendarDay, readonly to: CalendarDay) {
    super(
      `table T-214: ${textOfDay(from)} to ${textOfDay(to)} is wider than the `
      + `${ACCEPTED_DAY_SPAN} days the accepted range holds`,
    )
    this.name = 'DaySpanTooWide'
  }
}

/** @purity pure */
export function workingDaysBetween(within: WorkingCalendar, from: CalendarDay,
                                   to: CalendarDay): number {
  const start = serial(from)
  const stop = serial(to)
  if (Math.abs(stop - start) > ACCEPTED_DAY_SPAN) throw new DaySpanTooWide(from, to)
  const index = indexOfCalendar(within)
  const step = stop < start ? -1 : 1
  let counted = 0
  for (let at = start; at !== stop; at += step) {
    if (isWorkingDayAt(index, step > 0 ? at : at - 1)) counted += step
  }
  return counted
}

/** @purity pure */
export function dateFromWorkingDays(within: WorkingCalendar, from: CalendarDay,
                                    workingDays: number): CalendarDay {
  const index = indexOfCalendar(within)
  const step = workingDays < 0 ? -1 : 1
  let remaining = Math.abs(workingDays)
  let at = serial(from)
  let walked = 0
  while (remaining > 0) {
    if (walked++ > ACCEPTED_DAY_SPAN) throw new NoWorkingDayReached(within.calendar.uid)
    const covered = step > 0 ? at : at - 1
    at += step
    if (isWorkingDayAt(index, covered)) remaining -= 1
  }
  return dayFromSerial(at)
}

// WHY: not dateFromWorkingDays(from, 1), which answers a half-open end bound (Saturday for a Friday).
// see FR-043, FR-054
/** @purity pure */
export function nextWorkingDay(within: WorkingCalendar, from: CalendarDay): CalendarDay {
  const index = indexOfCalendar(within)
  let at = serial(from) + 1
  let walked = 0
  while (!isWorkingDayAt(index, at)) {
    if (walked++ > ACCEPTED_DAY_SPAN) throw new NoWorkingDayReached(within.calendar.uid)
    at += 1
  }
  return dayFromSerial(at)
}

// see T-021b
/** @purity pure */
export function delayStart(task: Task): { readonly row: string; readonly from: string | null } | null {
  switch (planActualState(task)) {
    case 'inProgress':
      return { row: 'DL-1', from: task.finish }
    case 'notStarted':
      return { row: 'DL-2', from: task.start }
    case 'suspendedResumeUnknown':
    case 'suspendedResumePlanned':
      return { row: 'DL-3', from: task.resume }
    case 'finished':
      return null
  }
}

/** @purity pure */
export function isDelayed(task: Task, statusDate: CalendarDay | null): boolean {
  if (statusDate === null) return false
  const start = delayStart(task)
  const from = dayOf(start?.from ?? null)
  if (from === null) return false
  return compareDays(statusDate, from) > 0
}

/** @purity pure */
export function delayWorkingDays(within: WorkingCalendar, task: Task,
                                 statusDate: CalendarDay | null): number {
  if (statusDate === null || !isDelayed(task, statusDate)) return 0
  const from = dayOf(delayStart(task)?.from ?? null)
  if (from === null) return 0
  return workingDaysBetween(within, from, statusDate)
}

export type InvariantKind =
  | 'unique'
  | 'reference'
  | 'structure'
  | 'combination'
  | 'range'

export interface ScheduleViolation {
  readonly row: string
  readonly kind: InvariantKind
  readonly at: string
  readonly what: string
}

// WHY: two groups, not a Document, whose component imports this one and would close a cycle.
interface DocumentUnderTest {
  readonly schedule: Schedule
  readonly settings: DocumentSettings
}

interface Breach {
  readonly at: string
  readonly what: string
}

const NONE: readonly Breach[] = []

interface Invariant {
  readonly row: string
  readonly kind: InvariantKind
  readonly find: (subject: DocumentUnderTest) => readonly Breach[]
}

const TRANSPARENT = 'transparent'

interface AcceptedDays {
  readonly min: CalendarDay
  readonly max: CalendarDay
}

interface Nesting<TKey> {
  readonly depthByKey: ReadonlyMap<TKey, number>
  readonly rings: readonly (readonly TKey[])[]
}

// see IV-4, IV-5, IV-18
/** @purity pure */
function nestingOf<TKey, TRow>(
  rows: readonly TRow[],
  keyOf: (row: TRow) => TKey,
  parentOf: (row: TRow) => TKey | null,
): Nesting<TKey> {
  const byKey = new Map<TKey, TRow>()
  for (const row of rows) byKey.set(keyOf(row), row)

  const depthByKey = new Map<TKey, number>()
  const unsettled = new Set<TKey>()
  const rings: (readonly TKey[])[] = []

  for (const row of rows) {
    const from = keyOf(row)
    if (depthByKey.has(from) || unsettled.has(from)) continue

    const chain: TKey[] = []
    const positionOnChain = new Map<TKey, number>()
    let base = 0
    let ring: readonly TKey[] | null = null
    let underRing = false
    let at: TRow | undefined = row

    while (at !== undefined) {
      const key = keyOf(at)
      if (unsettled.has(key)) {
        underRing = true
        break
      }
      const repeated = positionOnChain.get(key)
      if (repeated !== undefined) {
        ring = chain.slice(repeated)
        break
      }
      const settled = depthByKey.get(key)
      if (settled !== undefined) {
        base = settled
        break
      }
      positionOnChain.set(key, chain.length)
      chain.push(key)
      const parent = parentOf(at)
      at = parent === null ? undefined : byKey.get(parent)
    }

    if (ring !== null) {
      rings.push(ring)
      for (const key of chain) unsettled.add(key)
    } else if (underRing) {
      for (const key of chain) unsettled.add(key)
    } else {
      let depth = base + chain.length
      for (const key of chain) {
        depthByKey.set(key, depth)
        depth -= 1
      }
    }
  }

  return { depthByKey, rings }
}

// WHY: not the picture's row walk, which skips hidden and folded rows; an invariant must not depend on the screen.
// see IV-19
/** @purity pure */
function taskGroupRankById(groups: readonly TaskGroup[]): ReadonlyMap<string, number> {
  const childrenOf = new Map<string | null, TaskGroup[]>()
  const holds = new Set(groups.map((group) => group.id))
  for (const group of groups) {
    const parent = group.parentId !== null && holds.has(group.parentId) ? group.parentId : null
    const siblings = childrenOf.get(parent)
    if (siblings === undefined) childrenOf.set(parent, [group])
    else siblings.push(group)
  }
  for (const siblings of childrenOf.values()) siblings.sort((a, b) => a.order - b.order)

  const rankById = new Map<string, number>()
  const walk = (parent: string | null): void => {
    for (const group of childrenOf.get(parent) ?? []) {
      if (rankById.has(group.id)) continue
      rankById.set(group.id, rankById.size)
      walk(group.id)
    }
  }
  walk(null)
  for (const group of groups) if (!rankById.has(group.id)) rankById.set(group.id, rankById.size)
  return rankById
}

// see IV-14
/** @purity pure */
function dateBreaches<TRow extends object>(
  row: TRow,
  columns: readonly (keyof TRow & string)[],
  at: string,
  accepted: AcceptedDays | null,
): readonly Breach[] {
  let found: Breach[] | null = null
  for (const column of columns) {
    const value: unknown = row[column]
    if (typeof value !== 'string') continue
    const day = dayOf(value)
    if (day === null) {
      found ??= []
      found.push({ at: `${at}/${column}`, what: `${JSON.stringify(value)} names no day` })
      continue
    }
    if (accepted === null) continue
    if (compareDays(day, accepted.min) < 0) {
      found ??= []
      found.push({ at: `${at}/${column}`, what: `${value} is before importMinDate` })
    } else if (compareDays(day, accepted.max) > 0) {
      found ??= []
      found.push({ at: `${at}/${column}`, what: `${value} is after importMaxDate` })
    }
  }
  return found ?? NONE
}

interface DocumentRow {
  readonly entity: string
  readonly at: string
  readonly held: Readonly<Record<string, unknown>>
}

interface RowArray {
  readonly entity: string
  readonly at: string
  readonly rows: readonly DocumentRow[]
}

interface DocumentRows {
  readonly arrays: readonly RowArray[]
  readonly all: readonly DocumentRow[]
}

const ROWS_OF_ENTITY: ReadonlyMap<string, EntityRows> =
  new Map(ENTITY_ROWS.map((one) => [one.entity, one]))

/** @purity pure */
function rowOf(held: unknown): Readonly<Record<string, unknown>> | null {
  if (held === null || typeof held !== 'object' || Array.isArray(held)) return null
  return held as Readonly<Record<string, unknown>>
}

/** @purity pure */
function rowsIn(held: unknown, entity: string, at: string): readonly DocumentRow[] | null {
  if (!Array.isArray(held)) return null
  const rows: DocumentRow[] = []
  for (const [index, one] of (held as readonly unknown[]).entries()) {
    const bag = rowOf(one)
    if (bag !== null) rows.push({ entity, at: `${at}/${index}`, held: bag })
  }
  return rows
}

/** @purity pure */
function documentRowsOf(schedule: Schedule): DocumentRows {
  const arrays: RowArray[] = []
  const all: DocumentRow[] = []
  const group = schedule as unknown as Readonly<Record<string, unknown>>

  for (const entry of ENTITY_ROWS) {
    if (entry.scheduleKey === null) continue
    const at = `/schedule/${entry.scheduleKey}`
    if (entry.many) {
      const rows = rowsIn(group[entry.scheduleKey], entry.entity, at)
      if (rows === null) continue
      arrays.push({ entity: entry.entity, at, rows })
      // TRAP: push one row at a time; all.push(...rows) exceeds the argument limit on a long array.
      for (const row of rows) all.push(row)
      continue
    }
    const bag = rowOf(group[entry.scheduleKey])
    if (bag !== null) all.push({ entity: entry.entity, at, held: bag })
  }

  for (let cursor = 0; cursor < all.length; cursor += 1) {
    const row = all[cursor]
    if (row === undefined) continue
    for (const nest of ROWS_OF_ENTITY.get(row.entity)?.nested ?? []) {
      const at = `${row.at}/${nest.column}`
      const rows = rowsIn(row.held[nest.column], nest.entity, at)
      if (rows === null) continue
      arrays.push({ entity: nest.entity, at, rows })
      for (const one of rows) all.push(one)
    }
  }
  return { arrays, all }
}

// TRAP: a list counts as its length; tools/generate_startup_template.py must read it the same way.
/** @purity pure */
function settingNumberOf(settings: DocumentSettings, key: string): number | null {
  let at: unknown = settings
  for (const step of key.split('.')) {
    const bag = rowOf(at)
    if (bag === null) return null
    at = bag[step]
  }
  if (Array.isArray(at)) return (at as readonly unknown[]).length
  return typeof at === 'number' && Number.isFinite(at) ? at : null
}

/** @purity pure */
function boundValueOf(
  expression: readonly SettingsBoundToken[],
  settings: DocumentSettings,
): number | null {
  const stack: number[] = []
  for (const token of expression) {
    if ('key' in token) {
      const held = settingNumberOf(settings, token.key)
      if (held === null) return null
      stack.push(held)
      continue
    }
    if ('num' in token) {
      stack.push(token.num)
      continue
    }
    const right = stack.pop()
    const left = stack.pop()
    if (left === undefined || right === undefined) return null
    stack.push(token.op === '+' ? left + right
      : token.op === '-' ? left - right
        : token.op === '*' ? left * right
          : left / right)
  }
  const answer = stack.length === 1 ? stack[0] : undefined
  return answer === undefined || !Number.isFinite(answer) ? null : answer
}

// see T-220
const INVARIANTS: readonly Invariant[] = [
  {
    row: 'IV-1',
    kind: 'unique',
    /** @purity pure */
    find: ({ schedule }) => {
      const found: Breach[] = []
      for (const array of documentRowsOf(schedule).arrays) {
        const columns = ROWS_OF_ENTITY.get(array.entity)?.primaryKey ?? []
        if (columns.length === 0) continue
        const seen = new Set<string>()
        for (const row of array.rows) {
          const stamp = JSON.stringify(columns.map((column) => row.held[column] ?? null))
          if (seen.has(stamp)) {
            found.push({
              at: row.at,
              what: `${array.entity} repeats the key ${stamp} inside ${array.at}`,
            })
          }
          seen.add(stamp)
        }
      }
      return found
    },
  },
  {
    row: 'IV-2',
    kind: 'reference',
    /** @purity pure */
    find: ({ schedule }) => {
      const rows = documentRowsOf(schedule)
      const landedOn = new Map<string, string[]>()
      const landings = new Map<string, Set<unknown>>()
      for (const entry of ENTITY_ROWS) {
        for (const key of entry.foreignKeys) {
          const columns = landedOn.get(key.child) ?? []
          if (!columns.includes(key.toColumn)) columns.push(key.toColumn)
          landedOn.set(key.child, columns)
          landings.set(`${key.child}/${key.toColumn}`, new Set())
        }
      }
      for (const row of rows.all) {
        for (const column of landedOn.get(row.entity) ?? []) {
          landings.get(`${row.entity}/${column}`)?.add(row.held[column])
        }
      }

      const found: Breach[] = []
      for (const row of rows.all) {
        for (const key of ROWS_OF_ENTITY.get(row.entity)?.foreignKeys ?? []) {
          const value = row.held[key.fromColumn]
          if (value === null || value === undefined) continue
          if (landings.get(`${key.child}/${key.toColumn}`)?.has(value) === true) continue
          found.push({
            at: `${row.at}/${key.fromColumn}`,
            what: `no ${key.child} of this document holds ${key.toColumn} `
              + `${JSON.stringify(value)}`,
          })
        }
      }
      return found
    },
  },
  {
    row: 'IV-3',
    kind: 'reference',
    /** @purity pure */
    find: ({ schedule, settings }) => {
      const rows = new Set(schedule.taskGroups.map((one) => one.id))
      const found: Breach[] = []
      for (const [index, id] of settings.pinnedGroupIds.entries()) {
        if (!rows.has(id)) {
          found.push({
            at: `/documentSettings/pinnedGroupIds/${index}`,
            what: `no TaskGroup is here with id ${id}`,
          })
        }
      }
      return found
    },
  },
  {
    row: 'IV-4',
    kind: 'structure',
    /** @purity pure */
    find: ({ schedule }) => {
      const nesting = nestingOf(
        schedule.tasks,
        (task) => task.uid,
        (task) => task.wbsParentUid,
      )
      return nesting.rings.map((ring) => ({
        at: '/schedule/tasks',
        what: `wbsParentUid closes a ring over Task uids ${ring.join(', ')}`,
      }))
    },
  },
  {
    row: 'IV-5',
    kind: 'structure',
    /** @purity pure */
    find: ({ schedule, settings }) => {
      const nesting = nestingOf(
        schedule.taskGroups,
        (group) => group.id,
        (group) => group.parentId,
      )
      const found: Breach[] = []
      for (const [index, group] of schedule.taskGroups.entries()) {
        const depth = nesting.depthByKey.get(group.id)
        if (depth !== undefined && depth > settings.maxGroupDepth) {
          found.push({
            at: `/schedule/taskGroups/${index}`,
            what: `row ${group.id} sits at depth ${depth}, past maxGroupDepth `
              + `(${settings.maxGroupDepth})`,
          })
        }
      }
      return found
    },
  },
  {
    row: 'IV-6',
    kind: 'structure',
    /** @purity pure */
    find: ({ schedule }) => {
      const namedBy = new Map<number, number>()
      for (const member of schedule.taskGroupMembers) {
        namedBy.set(member.taskUid, (namedBy.get(member.taskUid) ?? 0) + 1)
      }
      const found: Breach[] = []
      for (const [index, task] of schedule.tasks.entries()) {
        const count = namedBy.get(task.uid) ?? 0
        if (count !== 1) {
          found.push({
            at: `/schedule/tasks/${index}`,
            what: `Task uid ${task.uid} is named by ${count} TaskGroupMember rows`,
          })
        }
      }
      return found
    },
  },
  {
    row: 'IV-7',
    kind: 'structure',
    /** @purity pure */
    find: ({ schedule }) => {
      if (schedule.calendars.length > 0) return NONE
      return [{ at: '/schedule/calendars', what: 'the document holds no Calendar' }]
    },
  },
  {
    row: 'IV-20',
    kind: 'structure',
    /** @purity pure */
    find: ({ schedule }) => {
      if (schedule.taskGroups.length > 0) return NONE
      return [{ at: '/schedule/taskGroups', what: 'the document holds no TaskGroup' }]
    },
  },
  {
    row: 'IV-17',
    kind: 'structure',
    /** @purity pure */
    find: ({ schedule }) => {
      const within = workingCalendarOf(schedule)
      if (within.weekDays.some((one) => one.dayWorking === true)) return NONE
      return [{
        at: '/schedule/calendars',
        what: `the resolved calendar ${within.calendar.uid} works no weekday`,
      }]
    },
  },
  {
    row: 'IV-8',
    kind: 'combination',
    /** @purity pure */
    find: ({ schedule }) => {
      const found: Breach[] = []
      for (const [index, group] of schedule.taskGroups.entries()) {
        if (group.label === null && group.derivedFromTaskUid === null) {
          found.push({
            at: `/schedule/taskGroups/${index}`,
            what: `row ${group.id} has neither a label nor a Task to take its name from`,
          })
        }
      }
      return found
    },
  },
  {
    row: 'IV-9',
    kind: 'combination',
    /** @purity pure */
    find: ({ schedule }) => {
      const found: Breach[] = []
      for (const [index, visual] of schedule.taskVisuals.entries()) {
        if (visual.fillColor === TRANSPARENT && visual.strokeColor === TRANSPARENT) {
          found.push({
            at: `/schedule/taskVisuals/${index}`,
            what: `Task uid ${visual.taskUid} is drawn with nothing at all`,
          })
        }
      }
      return found
    },
  },
  {
    row: 'IV-10',
    kind: 'combination',
    /** @purity pure */
    find: ({ schedule }) => {
      const found: Breach[] = []
      for (const [index, task] of schedule.tasks.entries()) {
        const start = dayOf(task.start)
        const finish = dayOf(task.finish)
        if (start === null || finish === null) continue
        if (compareDays(finish, start) < 0) {
          found.push({
            at: `/schedule/tasks/${index}`,
            what: `Task uid ${task.uid} finishes before it starts`,
          })
        }
      }
      return found
    },
  },
  {
    row: 'IV-11',
    kind: 'combination',
    /** @purity pure */
    find: ({ schedule }) => {
      const found: Breach[] = []
      for (const [index, task] of schedule.tasks.entries()) {
        const faded = task.fadeInDays !== null || task.fadeOutDays !== null
        if (faded && task.finish === null) {
          found.push({
            at: `/schedule/tasks/${index}`,
            what: `Task uid ${task.uid} fades but has no finish`,
          })
        }
      }
      return found
    },
  },
  {
    row: 'IV-12',
    kind: 'combination',
    /** @purity pure */
    find: ({ schedule }) => {
      const found: Breach[] = []
      for (const [index, task] of schedule.tasks.entries()) {
        if (task.fadeInDays === null && task.fadeOutDays === null) continue
        const fade = (task.fadeInDays ?? 0) + (task.fadeOutDays ?? 0)
        const start = dayOf(task.start)
        const finish = dayOf(task.finish)
        if (start === null || finish === null) continue
        const span = serial(finish) - serial(start)
        if (fade > span) {
          found.push({
            at: `/schedule/tasks/${index}`,
            what: `Task uid ${task.uid} fades ${fade} days over a span of ${span}`,
          })
        }
      }
      return found
    },
  },
  {
    row: 'IV-13',
    kind: 'combination',
    /** @purity pure */
    find: ({ settings }) => {
      const cursor = settings.dualCursor
      if (cursor === null) return NONE
      const found: Breach[] = []
      for (const column of ['date1', 'date2'] as const) {
        const held: string | null | undefined = cursor[column]
        // TRAP: the type rules out undefined, but a document from outside may lack the key; keep the check.
        if (held === null || held === undefined) {
          found.push({
            at: `/documentSettings/dualCursor/${column}`,
            what: 'is absent while the dual cursor is set',
          })
        }
      }
      return found
    },
  },
  {
    row: 'IV-14',
    kind: 'range',
    /** @purity pure */
    find: ({ schedule, settings }) => {
      const min = dayOf(settings.importMinDate)
      const max = dayOf(settings.importMaxDate)
      const accepted: AcceptedDays | null =
        min !== null && max !== null ? { min, max } : null

      const found: Breach[] = []
      if (min === null) {
        found.push({
          at: '/documentSettings/importMinDate',
          what: `${JSON.stringify(settings.importMinDate)} names no day, `
            + 'so the accepted range cannot be applied',
        })
      }
      if (max === null) {
        found.push({
          at: '/documentSettings/importMaxDate',
          what: `${JSON.stringify(settings.importMaxDate)} names no day, `
            + 'so the accepted range cannot be applied',
        })
      }

      found.push(...dateBreaches(
        schedule.project, DATE_COLUMNS.Project, '/schedule/project', accepted))
      for (const [index, task] of schedule.tasks.entries()) {
        found.push(...dateBreaches(
          task, DATE_COLUMNS.Task, `/schedule/tasks/${index}`, accepted))
      }
      for (const [calendarIndex, calendar] of schedule.calendars.entries()) {
        for (const [index, exception] of calendar.exceptions.entries()) {
          found.push(...dateBreaches(
            exception,
            DATE_COLUMNS.Exception,
            `/schedule/calendars/${calendarIndex}/exceptions/${index}`,
            accepted,
          ))
        }
      }
      for (const [index, box] of schedule.commentBoxes.entries()) {
        found.push(...dateBreaches(
          box, DATE_COLUMNS.CommentBox, `/schedule/commentBoxes/${index}`, accepted))
      }
      for (const [index, box] of schedule.highlightBoxes.entries()) {
        found.push(...dateBreaches(
          box, DATE_COLUMNS.HighlightBox, `/schedule/highlightBoxes/${index}`, accepted))
      }
      for (const [index, baseline] of schedule.baselineTasks.entries()) {
        found.push(...dateBreaches(
          baseline, DATE_COLUMNS.BaselineTask, `/schedule/baselineTasks/${index}`, accepted))
      }
      return found
    },
  },
  {
    row: 'IV-15',
    kind: 'range',
    /** @purity pure */
    find: ({ schedule }) => {
      const ceiling = schedule.project.importSeq
      const found: Breach[] = []
      for (const [index, origin] of schedule.taskOrigins.entries()) {
        if (origin.lastSeenImportSeq > ceiling) {
          found.push({
            at: `/schedule/taskOrigins/${index}`,
            what: `Task uid ${origin.taskUid} was last seen at import `
              + `${origin.lastSeenImportSeq}, past the project's ${ceiling}`,
          })
        }
      }
      return found
    },
  },
  {
    row: 'IV-16',
    kind: 'range',
    /** @purity pure */
    find: ({ settings }) => {
      const found: Breach[] = []
      for (const key of Object.keys(SETTINGS_BOUNDS)) {
        const bound = SETTINGS_BOUNDS[key]
        if (bound === undefined) continue
        const value = settingNumberOf(settings, key)
        if (value === null) continue
        const at = `/documentSettings/${key.split('.').join('/')}`
        const floor = bound.minExpression === undefined
          ? null : boundValueOf(bound.minExpression, settings)
        if (floor !== null && value < floor) {
          found.push({ at, what: `${key} is ${value}, under the floor its own row states (${floor})` })
        }
        const ceiling = bound.maxExpression === undefined
          ? null : boundValueOf(bound.maxExpression, settings)
        if (ceiling !== null && value > ceiling) {
          found.push({ at, what: `${key} is ${value}, over the ceiling its own row states (${ceiling})` })
        }
      }
      return found
    },
  },
  {
    row: 'IV-19',
    kind: 'combination',
    /** @purity pure */
    find: ({ schedule }) => {
      const found: Breach[] = []
      const rankById = taskGroupRankById(schedule.taskGroups)
      for (const [index, box] of schedule.highlightBoxes.entries()) {
        const at = `/schedule/highlightBoxes/${index}`
        const from = dayOf(box.startDate)
        const to = dayOf(box.endDate)
        if (from !== null && to !== null && compareDays(to, from) < 0) {
          found.push({ at, what: `HighlightBox ${box.id} ends before it starts` })
        }
        const top = box.topGroupId === null ? undefined : rankById.get(box.topGroupId)
        const bottom = box.bottomGroupId === null ? undefined : rankById.get(box.bottomGroupId)
        if (top !== undefined && bottom !== undefined && top > bottom) {
          found.push({ at, what: `HighlightBox ${box.id} has its top row below its bottom row` })
        }
      }
      return found
    },
  },
  {
    row: 'IV-18',
    kind: 'structure',
    /** @purity pure */
    find: ({ schedule }) => {
      const nesting = nestingOf(
        schedule.taskGroups,
        (group) => group.id,
        (group) => group.parentId,
      )
      return nesting.rings.map((ring) => ({
        at: '/schedule/taskGroups',
        what: `parentId closes a ring over TaskGroup ids ${ring.join(', ')}`,
      }))
    },
  },
]

// see T-220
/** @purity pure */
export function scheduleViolations(
  schedule: Schedule,
  settings: DocumentSettings,
): readonly ScheduleViolation[] {
  const subject: DocumentUnderTest = { schedule, settings }
  const found: ScheduleViolation[] = []
  for (const invariant of INVARIANTS) {
    for (const breach of invariant.find(subject)) {
      found.push({ row: invariant.row, kind: invariant.kind, at: breach.at, what: breach.what })
    }
  }
  return found
}
