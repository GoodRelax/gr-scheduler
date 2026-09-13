// Schedule -- public entry of this folder.
//
// @unit      UF-1   (docs/spec/05-07-design.md, table T-075)
// @component Schedule, layer documentModel (table T-062)
// @purity    pure
// @publishes table T-064 row PI-1

// `scheduleViolations` judges some rows of table T-220 by settings, so a value
// (`SETTINGS_BOUNDS`) crosses from the presentation group as well as a type. No
// cycle inside the layer (LR-3 of table T-061): document-settings.ts imports
// nothing.
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

/** The schedule group. Its keys are DR-2 of table T-052. */
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

/**
 * Every column table T-058 gives a date or a datetime type, by entity.
 *
 * ⭐ IV-14 reaches these as "表 T-058 の型の欄が日付または日時とする列"
 * rather than naming them, so a hand-written roster goes stale the moment
 * a column is added and nothing says so (F-3). erd.json marks them, so
 * this is the roster, not a copy of it.
 */
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

/** What one column accepts. `null` in a bound means the manuscript states none. */
export interface ColumnShape {
  /** The 型 column's own word: `integer`, `string`, `enum`, `boolean`, and so on. */
  readonly kind: string
  /** The values a column of kind `enum` admits. */
  readonly choices: readonly string[] | null
  readonly min: number | null
  readonly max: number | null
  /** Whether the 空を許すか column admits an empty value. */
  readonly isNullable: boolean
}

/**
 * What each column of the edited entities accepts, as the 型 column
 * of table T-058 states it.
 *
 * ⭐ THE PARAGRAPH UNDER TABLE T-016 (MUST NOT) forbids the choices,
 * the numeric bounds and the date columns to be copied into that
 * table, on the ground that the schema and DATE_COLUMNS already hold
 * them. This is how they reach src/: a surface that offers a choice
 * reads the roster instead of re-typing it, and a value the
 * manuscript adds appears without anyone editing a list.
 *
 * ⛔ `kind` IS THE MANUSCRIPT'S OWN WORD (`integer`, `string`, `enum`,
 * `boolean`, `map`, `array`, `object`, `number`), not a name minted
 * here. ⚠️ Which columns are DATES is NOT among them -- DATE_COLUMNS
 * above is where that is answered, and asking twice would be two
 * rosters to keep in step.
 */
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

/** One foreign key of an entity, and the row of table T-057 it lands on. */
export interface ForeignKeyColumn {
  /** The column of this entity that holds the reference. */
  readonly fromColumn: string
  /** The entity whose rows it names. */
  readonly child: string
  /** The column of that entity it lands on. */
  readonly toColumn: string
}

/** One column of a row that holds rows of another entity. */
export interface NestedRows {
  readonly column: string
  readonly entity: string
}

/** One entity of table T-056, as IV-1 and IV-2 need it. */
export interface EntityRows {
  readonly entity: string
  /** The key of `Schedule` its rows sit in, or `null` when they sit in a row. */
  readonly scheduleKey: string | null
  /** Whether that key holds many rows or one. */
  readonly many: boolean
  /** The columns the key column of table T-058 marks a primary key. */
  readonly primaryKey: readonly string[]
  /** The columns it marks a foreign key, each with where it lands. */
  readonly foreignKeys: readonly ForeignKeyColumn[]
  /** The columns of one row that hold rows of another entity. */
  readonly nested: readonly NestedRows[]
}

/**
 * Where the schedule group puts the rows of each entity, and what the key
 * column of table T-058 and the relations of table T-057 say about them.
 *
 * ⭐ IV-1 and IV-2 reach their columns by pointing at those two columns of
 * the manuscript rather than by naming them, and the closing remark of
 * table T-220 refuses to list the columns for exactly that reason. So this
 * is the roster, generated the way DATE_COLUMNS is, and not a second copy
 * of it that would go stale the moment a column is added (F-3).
 *
 * ⚠️ The entity and column names are strings and not `keyof`, because the
 * walk that reads them is driven by the roster itself. What keeps them
 * honest is the manuscript: every name below is spelled by erd.json, and
 * the generator refuses to write a foreign key whose target is not a
 * column of the entity it lands on.
 */
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

/**
 * Every column the specification gives a default, by entity.
 *
 * ⭐ A default is only here when the specification HAS decided one: the
 * value comes from erd.json, is printed beside the column in table T-058,
 * and reaches the GRS JSON schema as its "default" annotation. So the
 * number of places holding it is one.
 *
 * ⚠️ The value type is read off the generated interface, so a default that
 * is not a member of its own column fails to compile rather than shipping.
 */
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

/**
 * Table T-209 -- the values a document starts its calendar from,
 * by row ID. `DEFAULT_CALENDAR` below is built out of them.
 *
 * ⭐ FR-054 resolves the document's calendar to these when nothing
 * was imported, or when what was imported left the value empty.
 *
 * ⛔ The two weekday rows do NOT share a numbering. S-106 is in the
 * dayType encoding and S-108 in the weekStartDay one, which differ
 * by one -- so Monday is 2 in the first and 1 in the second. Each
 * row says which below; converting between them is the reader's
 * job and the specification states both (AT-73, AT-17).
 */
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

/**
 * The states of table T-019a. The spellings are this file's: the state is
 * derived, never stored or exchanged, so no table names it.
 */
export type PlanActualState =
  /** PS-1 */ | 'notStarted'
  /** PS-2 */ | 'finished'
  /** PS-3 */ | 'suspendedResumeUnknown'
  /** PS-4 */ | 'suspendedResumePlanned'
  /** PS-5 */ | 'inProgress'

/**
 * Which state a task is in: table T-019a read in rank order, PS-5 catching the rest.
 *
 * @purity pure
 */
export function planActualState(task: Task): PlanActualState {
  if (task.actualStart === null) return 'notStarted'            // PS-1
  if (task.actualFinish !== null) return 'finished'             // PS-2
  if (task.resumeValid === false) return 'suspendedResumeUnknown' // PS-3
  if (task.resume !== null) return 'suspendedResumePlanned'     // PS-4
  return 'inProgress'                                           // PS-5
}

/** FR-022 matches on the UID. @purity pure */
export function taskByUid(schedule: Schedule, uid: number): Task | null {
  return schedule.tasks.find((task) => task.uid === uid) ?? null
}

// ---------------------------------------------------------------- dates ----
//
// A date column keeps the exchange partner's own text (EX-2, FR-021), and the
// day is derived from it here, in one place. The day is the LEXICAL date part:
// converting a time zone would move it by one on some machines (FR-054).

/** A day on the calendar. No time, no zone -- FR-054. */
export interface CalendarDay {
  readonly year: number
  readonly month: number
  readonly day: number
}

const DATE_HEAD = /^(\d{4})-(\d{2})-(\d{2})(?:[T ].*)?$/

/**
 * The day a stored date column names, or null when it holds none.
 *
 * @purity pure
 */
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

/**
 * The text GRS writes for a day it decided itself: the exchange partner's own
 * type, at midnight (EX-7 of table T-033). A value GRS did not touch is never
 * passed through here -- it keeps the text it arrived with.
 *
 * @purity pure
 */
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

/**
 * `Date.UTC` maps years 0 .. 99 onto 1900 .. 1999, so such a day lands on the
 * wrong serial. `dayOf`'s round-trip check shares the mapping, so a fix must move
 * both.
 *
 * @purity pure
 */
function serial(day: CalendarDay): number {
  return Date.UTC(day.year, day.month - 1, day.day) / 86400000
}

/**
 * The span between two days in CALENDAR days, half-open like
 * `workingDaysBetween`, so a one-day plan spans 0.
 *
 * FD-6 of table T-012a (fades, and IV-12 of table T-220). Not FR-012's span,
 * which counts worked days.
 *
 * @purity pure
 */
export function calendarDaysBetween(from: CalendarDay, to: CalendarDay): number {
  return serial(to) - serial(from)
}

/** @purity pure */
function dayFromSerial(value: number): CalendarDay {
  const at = new Date(value * 86400000)
  return { year: at.getUTCFullYear(), month: at.getUTCMonth() + 1, day: at.getUTCDate() }
}

/** The one calendar a count runs by, in the three parts `workingCalendarOf` resolves. */
export interface WorkingCalendar {
  readonly calendar: Calendar
  readonly weekDays: readonly WeekDay[]
  readonly exceptions: readonly Exception[]
}

/** One `Exception`'s days as serials; both ends inclusive (AT-79, AT-80). */
interface ExceptionSpan {
  readonly from: number
  readonly toInclusive: number
  readonly isWorking: boolean
}

/**
 * The calendar in the shape one day-question wants: the exceptions as serial
 * spans, in the order the array holds them, and the weekly pattern laid out by
 * AT-73's coding. Building it reads the calendar once; asking it parses
 * nothing.
 */
interface CalendarIndex {
  readonly exceptionSpans: readonly ExceptionSpan[]
  /** Indexed by AT-73's 1..7 with 1 = Sunday. Index 0 is never asked. */
  readonly worksWeekday: readonly (boolean | undefined)[]
}

/**
 * Read the calendar once, so a walk does not read it once per day.
 *
 * Called before each loop, never inside it: `layoutFromSchedule` reaches
 * `dateFromWorkingDays` once per `Task` per frame (NFR-002). Built per call, not
 * held: a cache would need Chapter 5.6 to record its invalidation (R2.20), and it
 * records none.
 *
 * @purity pure
 */
function indexOfCalendar(within: WorkingCalendar): CalendarIndex {
  const exceptionSpans: ExceptionSpan[] = []
  for (const exception of within.exceptions) {
    const from = dayOf(exception.fromDate)
    if (from === null) continue
    // AT-80 may be absent: an exception of a single day names only its start.
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
    // The FIRST row for a day type decides it; a weekday with no row is not worked.
    if (worksWeekday[dayType] === undefined) worksWeekday[dayType] = weekDay.dayWorking === true
  }

  return { exceptionSpans, worksWeekday }
}

/**
 * Whether the day at a serial is worked. `exceptionSpans` is in the order of
 * the array it came from and the FIRST span that covers the day decides it --
 * that is what makes an exception beat the weekly pattern.
 *
 * @purity pure
 */
function isWorkingDayAt(index: CalendarIndex, atSerial: number): boolean {
  for (const span of index.exceptionSpans) {
    if (atSerial >= span.from && atSerial <= span.toInclusive) return span.isWorking
  }
  const weekday = new Date(atSerial * 86400000).getUTCDay() + 1
  return index.worksWeekday[weekday] === true
}

/**
 * Whether a day is worked. `dayType` is 1..7 with 1 = Sunday (AT-73); an
 * exception covering the day beats the weekly pattern. A recurring exception
 * this software does not interpret stays in carry and is not read.
 *
 * @purity pure
 */
export function isWorkingDay(within: WorkingCalendar, day: CalendarDay): boolean {
  return isWorkingDayAt(indexOfCalendar(within), serial(day))
}

/**
 * Table T-209's default week. Not in the document: built for counting when the
 * document names no calendar (FR-054), so its `uid` stands for nothing and is
 * never written.
 */
const DEFAULT_WEEK_DAYS: readonly WeekDay[] = [1, 2, 3, 4, 5, 6, 7].map((dayType, ordinal) => ({
  ordinal,
  dayType,
  // S-106 in AT-73's dayType numbering, generated from the manuscript.
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

/**
 * The one calendar the document counts working days by, in FR-054's order.
 *
 * `Task.calendarUid` and `Resource.calendarUid` are not read (FR-054): they are
 * held for the round trip only. `Calendar.baseCalendarUid` is not walked:
 * resolving inheritance is the import's job (FR-023), and doing it here would
 * repeat it every frame.
 *
 * @purity pure
 */
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

/**
 * The DEFAULT values of S-119 and S-120 (table T-214), used only to size the
 * walks' safety valve. The per-document settings are not read because this file
 * is handed the schedule group (DR-2 of table T-052), not the presentation group.
 * If the two rows move, move these with them.
 */
const IMPORT_MIN_DAY: CalendarDay = { year: 1970, month: 1, day: 1 }
const IMPORT_MAX_DAY: CalendarDay = { year: 2200, month: 12, day: 31 }

/**
 * The most days a walk can cross and stay inside table T-214's range. Passing it
 * means a calendar that works none of its days; the alternative is a loop that
 * never ends. Derived from the two rows above, not chosen.
 */
const ACCEPTED_DAY_SPAN = serial(IMPORT_MAX_DAY) - serial(IMPORT_MIN_DAY)

/** ST-7's shape: stop and say so, rather than answer with a wrong day. */
export class NoWorkingDayReached extends Error {
  /** @purity pure */
  constructor(readonly calendarUid: number) {
    super(`table T-214: calendar ${calendarUid} works no day inside the accepted range`)
    this.name = 'NoWorkingDayReached'
  }
}

/**
 * ST-7's shape for the counting walk, which always ends but whose cost is
 * unbounded: `dayOf` admits any four-digit year. A separate class because here
 * the two ends are wrong, not the calendar.
 */
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

/**
 * How many worked days lie in [from, to). Counting a half-open span is what
 * makes the count of a day against itself zero and keeps the two directions
 * symmetric; a negative span counts backwards.
 *
 * @purity pure
 */
export function workingDaysBetween(within: WorkingCalendar, from: CalendarDay,
                                   to: CalendarDay): number {
  const start = serial(from)
  const stop = serial(to)
  // The same bound as `dateFromWorkingDays`; here the step count is known before
  // the walk, so one subtraction replaces a counter.
  if (Math.abs(stop - start) > ACCEPTED_DAY_SPAN) throw new DaySpanTooWide(from, to)
  const index = indexOfCalendar(within)
  const step = stop < start ? -1 : 1
  let counted = 0
  for (let at = start; at !== stop; at += step) {
    if (isWorkingDayAt(index, step > 0 ? at : at - 1)) counted += step
  }
  return counted
}

/**
 * The EARLIEST day X for which `workingDaysBetween(from, X)` is `workingDays`.
 *
 * Both count a half-open span: a task starting on a Monday with one worked day
 * covers the Monday alone (S-129), so the bound reached is the Tuesday. More
 * than one day satisfies the count when a weekend follows; the earliest makes
 * the answer single.
 *
 * @purity pure
 */
export function dateFromWorkingDays(within: WorkingCalendar, from: CalendarDay,
                                    workingDays: number): CalendarDay {
  const index = indexOfCalendar(within)
  const step = workingDays < 0 ? -1 : 1
  let remaining = Math.abs(workingDays)
  let at = serial(from)
  let walked = 0
  while (remaining > 0) {
    // A calendar working none of its days would spin forever; unlike the count
    // above, the distance is not known before the walk, so this valve counts.
    if (walked++ > ACCEPTED_DAY_SPAN) throw new NoWorkingDayReached(within.calendar.uid)
    const covered = step > 0 ? at : at - 1
    at += step
    if (isWorkingDayAt(index, covered)) remaining -= 1
  }
  return dayFromSerial(at)
}

/**
 * The first working day strictly after `from` (FR-043, by FR-054's calendar).
 *
 * Not `dateFromWorkingDays(from, 1)`: that answers a half-open end bound, which
 * for a Friday start is the Saturday. `from` itself is never the answer, or GR-3
 * and GR-9 would sit on one another.
 *
 * @purity pure
 */
export function nextWorkingDay(within: WorkingCalendar, from: CalendarDay): CalendarDay {
  const index = indexOfCalendar(within)
  let at = serial(from) + 1
  let walked = 0
  while (!isWorkingDayAt(index, at)) {
    // The same valve as `dateFromWorkingDays`.
    if (walked++ > ACCEPTED_DAY_SPAN) throw new NoWorkingDayReached(within.calendar.uid)
    at += 1
  }
  return dayFromSerial(at)
}

/**
 * Whether a task is behind, and from which start: table T-021b.
 *
 * @purity pure
 */
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

/**
 * The delay in worked days from table T-021b's day to the status date; zero when
 * the task is not behind. Raises `DaySpanTooWide` for ends wider than table T-214.
 *
 * @purity pure
 */
export function delayWorkingDays(within: WorkingCalendar, task: Task,
                                 statusDate: CalendarDay | null): number {
  if (statusDate === null || !isDelayed(task, statusDate)) return 0
  const from = dayOf(delayStart(task)?.from ?? null)
  if (from === null) return 0
  return workingDaysBetween(within, from, statusDate)
}

// ------------------------------------------------- document invariants ----
//
// Chapter 6.1 requires `scheduleViolations` to be driven by table T-220, so the
// table is fixed data -- one entry per row with its ID and kind -- and the
// function is one walk over it. Single-column conditions are the generated
// schema's (`_source/grs-document.schema.json`) and are not repeated.
// A row answered only in part says so in its entry.

/** The kind column of table T-220, romanised (code is ASCII, rule 03 section 5). */
export type InvariantKind =
  | 'unique'
  | 'reference'
  | 'structure'
  | 'combination'
  | 'range'

/**
 * One place a document breaks one invariant: `DocumentViolation`'s (PI-34) three
 * fields plus the kind. `at` points into the DOCUMENT, since IV-3, IV-13 and
 * IV-14 can break inside `/documentSettings`.
 */
export interface ScheduleViolation {
  /** The row of table T-220 that is broken, e.g. `IV-1`. */
  readonly row: string
  /** That row's kind column. */
  readonly kind: InvariantKind
  /** Where it is broken, as a JSON pointer into the document. */
  readonly at: string
  readonly what: string
}

/**
 * What every invariant is judged against. Two groups, not a `Document`: that
 * component (PI-34) already imports this one, so taking it would close a cycle
 * inside the layer (LR-3 of table T-061).
 */
interface DocumentUnderTest {
  readonly schedule: Schedule
  readonly settings: DocumentSettings
}

/**
 * Where one invariant is broken. A finder does not name its row: the walk stamps
 * the roster entry's, so an entry cannot disagree with itself.
 */
interface Breach {
  readonly at: string
  readonly what: string
}

/** One allocation for every invariant that finds nothing, which is the usual case. */
const NONE: readonly Breach[] = []

/** One row of table T-220. */
interface Invariant {
  /** The row ID, the first column of the table. */
  readonly row: string
  /** The kind column. */
  readonly kind: InvariantKind
  /** Every place this row is broken. */
  readonly find: (subject: DocumentUnderTest) => readonly Breach[]
}

/** P-19 of table T-102 -- the one palette value the specification spells. */
const TRANSPARENT = 'transparent'

/** The two ends of table T-214, once each has been read as a day. */
interface AcceptedDays {
  /** S-119. */
  readonly min: CalendarDay
  /** S-120. */
  readonly max: CalendarDay
}

/** How deep each row of a self-nesting entity sits, and the rings that stop one. */
interface Nesting<TKey> {
  /** Every row whose depth is settled. A row whose parent is absent is at 1. */
  readonly depthByKey: ReadonlyMap<TKey, number>
  /** One entry per ring, holding the keys that close it. */
  readonly rings: readonly (readonly TKey[])[]
}

/**
 * The depth of every row under its parent column, and the rings that stop a
 * depth being settled -- one climb, since a walk that did not watch for rings
 * would never return.
 *
 * Shared by IV-4, IV-5 and IV-18 so the root is counted one way (S-115 and S-125
 * start at 1) and a ring means one thing. Indexed with a `Map` (R5 / NFR-013): a
 * search inside the climb would be quadratic over arrays S-114 lets reach six
 * figures. A parent naming no row ends the climb as a root; that dangling
 * reference is IV-2's to report.
 *
 * @purity pure
 */
function nestingOf<TKey, TRow>(
  rows: readonly TRow[],
  keyOf: (row: TRow) => TKey,
  parentOf: (row: TRow) => TKey | null,
): Nesting<TKey> {
  const byKey = new Map<TKey, TRow>()
  for (const row of rows) byKey.set(keyOf(row), row)

  const depthByKey = new Map<TKey, number>()
  /** Keys whose depth cannot be settled: on a ring, or hanging under one. */
  const unsettled = new Set<TKey>()
  const rings: (readonly TKey[])[] = []

  for (const row of rows) {
    const from = keyOf(row)
    if (depthByKey.has(from) || unsettled.has(from)) continue

    // Deepest first: `chain[0]` is where this climb started.
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
      // The ring itself is reported where it was found. A row hanging under it
      // closes no second ring and still has no depth to settle.
      for (const key of chain) unsettled.add(key)
    } else {
      // `base` is where the climb stopped: 0 for a root, otherwise the depth
      // already settled for that ancestor.
      let depth = base + chain.length
      for (const key of chain) {
        depthByKey.set(key, depth)
        depth -= 1
      }
    }
  }

  return { depthByKey, rings }
}

/**
 * Each row's rank in the document's own order: preorder over `parentId`,
 * siblings by AT-55's `order`. This is what "lower" means to IV-19.
 *
 * Not LC-1's walk, which orders only the rows the picture drew: a hidden or
 * folded row keeps its place in the document, and an invariant must not depend
 * on the screen. A row with a missing parent is a root, and one a ring makes
 * unreachable is appended, so every row has a rank (IV-2 and IV-18 report those).
 *
 * @purity pure
 */
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

/**
 * Every date column of one row that IV-14 turns down. Returns its breaches
 * rather than writing into a passed array, which would be an effect; the array
 * is allocated only once something is found.
 *
 * @purity pure
 */
function dateBreaches<TRow extends object>(
  row: TRow,
  columns: readonly (keyof TRow & string)[],
  at: string,
  accepted: AcceptedDays | null,
): readonly Breach[] {
  let found: Breach[] | null = null
  for (const column of columns) {
    const value: unknown = row[column]
    // `null` is every one of these columns' own value for absence and carries
    // no day to judge.
    if (typeof value !== 'string') continue
    const day = dayOf(value)
    if (day === null) {
      // The empty string is unreadable, not absence: absence is spelled `null` (IV-14).
      found ??= []
      found.push({ at: `${at}/${column}`, what: `${JSON.stringify(value)} names no day` })
      continue
    }
    // Nothing to measure against when the two ends of table T-214 could not be
    // read. That is said once by the entry below, not once per row here.
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

/** One row of the document, with the entity it is a row of and where it sits. */
interface DocumentRow {
  readonly entity: string
  /** A JSON pointer into the document. */
  readonly at: string
  readonly held: Readonly<Record<string, unknown>>
}

/** One array of rows. IV-1 judges each of these on its own. */
interface RowArray {
  readonly entity: string
  readonly at: string
  readonly rows: readonly DocumentRow[]
}

/** The rows of the schedule group, read the two ways the key rows need them. */
interface DocumentRows {
  /** Every array of rows, which is the span IV-1's uniqueness holds over. */
  readonly arrays: readonly RowArray[]
  /** Every row, arrays and the single `project` alike, for IV-2 to look up. */
  readonly all: readonly DocumentRow[]
}

/** `ENTITY_ROWS` by the entity it speaks for. */
const ROWS_OF_ENTITY: ReadonlyMap<string, EntityRows> =
  new Map(ENTITY_ROWS.map((one) => [one.entity, one]))

/**
 * One row, as the bag of columns a roster-driven walk can read, or `null` when
 * what the document holds there is not one.
 *
 * @purity pure
 */
function rowOf(held: unknown): Readonly<Record<string, unknown>> | null {
  if (held === null || typeof held !== 'object' || Array.isArray(held)) return null
  return held as Readonly<Record<string, unknown>>
}

/**
 * The rows one array of the document holds, or `null` when it holds no array.
 * A member that is not a row is skipped: shape is the generated schema's.
 *
 * @purity pure
 */
function rowsIn(held: unknown, entity: string, at: string): readonly DocumentRow[] | null {
  if (!Array.isArray(held)) return null
  const rows: DocumentRow[] = []
  for (const [index, one] of (held as readonly unknown[]).entries()) {
    const bag = rowOf(one)
    if (bag !== null) rows.push({ entity, at: `${at}/${index}`, held: bag })
  }
  return rows
}

/**
 * Every row the schedule group holds, nested rows included, walked through
 * `ENTITY_ROWS` so a new key or nesting is reached without editing this.
 *
 * A growing list read with a cursor, not recursion: a deep `CarryElement` tree
 * (S-133) costs no stack, and pushing one row at a time keeps a long array
 * (S-114) from exceeding the argument limit.
 *
 * @purity pure
 */
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

/**
 * One settings value as the number IV-16 weighs. A list counts as its length:
 * S-126 is the bounded key holding a list, and its bound is a count (read the
 * same way in tools/generate_startup_template.py).
 *
 * @purity pure
 */
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

/**
 * What a bound stated over other keys comes to, for this document.
 *
 * ⚠️ Postfix, so the operands are already in the order the manuscript wrote
 * them and nothing here has to know the precedence of × over +. `null` when a
 * key it names holds no number, which is a document this row cannot judge
 * rather than one that breaks it.
 *
 * @purity pure
 */
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

/** Table T-220 as fixed data, one entry per row. */
const INVARIANTS: readonly Invariant[] = [
  {
    row: 'IV-1',
    kind: 'unique',
    /**
     * Keys from `ENTITY_ROWS` (the key column of table T-058). Unique within ONE
     * array, not the document: two calendars may each hold `WeekDay` ordinal 1.
     * The whole key tuple is compared, since an entity may mark more than one
     * key column.
     *
     * @purity pure
     */
    find: ({ schedule }) => {
      const found: Breach[] = []
      for (const array of documentRowsOf(schedule).arrays) {
        const columns = ROWS_OF_ENTITY.get(array.entity)?.primaryKey ?? []
        if (columns.length === 0) continue
        const seen = new Set<string>()
        for (const row of array.rows) {
          // Stamped into a set, not compared pairwise (R5 / NFR-013).
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
    /**
     * Columns and targets from `ENTITY_ROWS` (tables T-058 and T-057). Only a
     * non-`null` reference is judged; a missing column is the schema's to refuse.
     *
     * @purity pure
     */
    find: ({ schedule }) => {
      const rows = documentRowsOf(schedule)
      // Indexed once (R5 / NFR-013).
      /** The columns of one entity that some reference lands on. */
      const landedOn = new Map<string, string[]>()
      /** Every value held there, by `entity/column`. */
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
    /**
     * Existence only; where a pinned row is drawn is OP-10's.
     *
     * @purity pure
     */
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
    /**
     * A row on a `parentId` ring has no settled depth and is not reported here;
     * IV-18 covers the ring.
     *
     * @purity pure
     */
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
    /**
     * Zero and several are both reported. A duplicate is IV-1's too
     * (`TaskGroupMember.taskUid` is a key), but neither row stands in for the other.
     *
     * @purity pure
     */
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
    /**
     * The rule sits under table T-050; table T-220 enumerates it so it can be walked.
     *
     * @purity pure
     */
    find: ({ schedule }) => {
      if (schedule.taskGroups.length > 0) return NONE
      return [{ at: '/schedule/taskGroups', what: 'the document holds no TaskGroup' }]
    },
  },
  {
    row: 'IV-17',
    kind: 'structure',
    /**
     * Only the calendar FR-054 resolves; asking `workingCalendarOf` keeps this row
     * and FR-054 agreeing on which calendar is meant.
     *
     * @purity pure
     */
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
    /**
     * `null` is not transparent (P-19): a row with `null` in both columns does
     * not break this.
     *
     * @purity pure
     */
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
    /**
     * Both ends must be readable days: an unreadable one is IV-14's, a missing one
     * FR-012's.
     *
     * @purity pure
     */
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
    /**
     * Either column requires the finish: `null` and `0` are distinct (AT-40,
     * AT-41), so a zero-day fade still needs an end to be measured from.
     *
     * @purity pure
     */
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
    /**
     * The span is the DIFFERENCE of the two days (FR-012), so a same-day `Task`
     * may carry no fade. A missing or unreadable end is skipped (IV-11 and IV-14
     * report it), and so is a `Task` with neither fade column: a negative span is
     * IV-10's, and a sum of zero over it would report that task twice.
     *
     * @purity pure
     */
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
    /**
     * S-65's two columns. The type says a document built in `src/` cannot breach
     * this; the check is for a document from OUTSIDE, where a key may be missing.
     *
     * @purity pure
     */
    find: ({ settings }) => {
      const cursor = settings.dualCursor
      if (cursor === null) return NONE
      const found: Breach[] = []
      for (const column of ['date1', 'date2'] as const) {
        const held: string | null | undefined = cursor[column]
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
    /**
     * Columns from `DATE_COLUMNS`, generated from the marks that print table
     * T-058's type column. The ends come from the settings in force (S-119,
     * S-120), not a constant, so this row and the import agree on one range.
     *
     * @purity pure
     */
    find: ({ schedule, settings }) => {
      const min = dayOf(settings.importMinDate)
      const max = dayOf(settings.importMaxDate)
      const accepted: AcceptedDays | null =
        min !== null && max !== null ? { min, max } : null

      const found: Breach[] = []
      // Said once, not once per row: a range that cannot be read leaves every
      // column below judged for BEING a day and none of them for being inside it.
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
    /**
     * Bounds from `SETTINGS_BOUNDS` (PI-2). Only those stated over other keys are
     * judged: a plain number bound is the schema's. What lies outside the row is
     * decided in the roster, so this file holds no exclusion list. Sitting
     * exactly on the bound is not a breach.
     *
     * @purity pure
     */
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
    /**
     * IV-10's shape over the box's dates and rows. A dragged box cannot breach it
     * (FR-019 normalizes on release); typed and imported values can. "Lower" is
     * the document's own order (`taskGroupRankById`), not the picture's. A pair
     * naming a missing row is IV-2's and is left alone.
     *
     * @purity pure
     */
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
    /**
     * `TaskGroup.parentId`'s rings; IV-4 climbs `Task.wbsParentUid`. Both use
     * `nestingOf`, so they agree on what a ring is.
     *
     * @purity pure
     */
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

/**
 * Every place the document breaks an invariant of table T-220.
 *
 * A violation is a value, never a throw (AG-8 of table T-035, R7.10); whether it
 * stops a load, a save or an edit is the caller's. Not the import check:
 * `validateImportedDocument` (PI-13) judges untrusted input before it replaces
 * the current document (OP-5) -- one rule, two moments.
 *
 * @purity pure
 */
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
