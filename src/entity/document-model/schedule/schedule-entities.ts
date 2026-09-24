// Schedule -- the schedule group's entity types, their column tables and the default calendar.
// @unit      UF-126  (docs/spec/05-07-design.md, table T-075)
// @component Schedule, layer documentModel (table T-062)
// @purity    pure

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
  /** AT-143 */
  readonly sourceFormat: 'grs' | 'pj12' | 'pj15'
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
  /** AT-141 */
  readonly stop: string | null
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
  /** AT-142 */
  readonly isKeptOpen: boolean
  /** AT-144 */
  readonly editGroup: string | null
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
  Task: ['start', 'finish', 'deadline', 'actualStart', 'stop', 'actualFinish', 'resume'],
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
  readonly HighlightBox: {
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
    stop: { kind: 'string', choices: null, min: null, max: null, isNullable: true },
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
    shapeKind: { kind: 'enum', choices: ['rectangle', 'chevron', 'arrow', 'endpointSpan', 'milestone'], min: null, max: null, isNullable: true },
    milestoneGlyph: { kind: 'enum', choices: ['circle', 'hexagon', 'pentagon', 'diamond', 'square', 'star', 'triangleUp', 'triangleDown', 'file', 'box', 'floppyDisk', 'cylinder', 'person', 'smile', 'beerMug'], min: null, max: null, isNullable: true },
    fillColor: { kind: 'color', choices: ['white', 'black', 'dimgray', 'lightgray', 'red', 'blue', 'yellow', 'green', 'orange', 'purple', 'transparent'], min: null, max: null, isNullable: true },
    strokeColor: { kind: 'color', choices: ['white', 'black', 'dimgray', 'lightgray', 'red', 'blue', 'yellow', 'green', 'orange', 'purple', 'transparent'], min: null, max: null, isNullable: true },
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
    isKeptOpen: { kind: 'boolean', choices: null, min: null, max: null, isNullable: false },
    editGroup: { kind: 'string', choices: null, min: null, max: null, isNullable: true },
    color: { kind: 'color', choices: ['white', 'black', 'dimgray', 'lightgray', 'red', 'blue', 'yellow', 'green', 'orange', 'purple', 'transparent'], min: null, max: null, isNullable: true },
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
  HighlightBox: {
    id: { kind: 'string', choices: null, min: null, max: null, isNullable: false },
    startDate: { kind: 'string', choices: null, min: null, max: null, isNullable: true },
    endDate: { kind: 'string', choices: null, min: null, max: null, isNullable: true },
    topGroupId: { kind: 'string', choices: null, min: null, max: null, isNullable: true },
    bottomGroupId: { kind: 'string', choices: null, min: null, max: null, isNullable: true },
    strokeColor: { kind: 'color', choices: ['white', 'black', 'dimgray', 'lightgray', 'red', 'blue', 'yellow', 'green', 'orange', 'purple'], min: null, max: null, isNullable: true },
    cornerRadiusPx: { kind: 'number', choices: null, min: null, max: null, isNullable: true },
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
  readonly TaskGroup: {
    readonly isKeptOpen: NonNullable<TaskGroup['isKeptOpen']>
  }
  readonly TaskVisual: {
    readonly milestoneGlyph: NonNullable<TaskVisual['milestoneGlyph']>
  }
} = {
  Project: { outlineBase: 1 },
  TaskGroup: { isKeptOpen: false },
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
