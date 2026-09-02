// Schedule -- public entry of this folder.
//
// @unit      UF-1   (docs/spec/05-07-design.md, table T-075)
// @component Schedule, layer documentModel (table T-062)
// @purity    pure
// @publishes table T-064 row PI-1
//
// Generated as an empty unit by tools/generate_unit_tree.py. Fill it in; the
// generator never rewrites a file that exists.
//
// The signature of what this file publishes is owned here, not in the
// specification (CR-146). Chapter 6.1 owns the boundary values, and the rule a
// member obeys stays with the requirement that states it.

// Nothing outside this folder may import any other file in it
// (Chapter 5.3, MUST NOT), so every name the component publishes
// leaves through here.

// The presentation group through ITS public entry, the only route Chapter 5.3
// leaves open. `scheduleViolations` needs it: five rows of table T-220 are
// judged partly by a settings row, and IV-16 needs the bounds roster itself,
// so a value crosses here as well as a type. ⚠️ Not a cycle inside the layer
// (LR-3 of table T-061): document-settings.ts imports nothing at all.
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
 * What each column of the four edited entities accepts, as the 型 column
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
  readonly TaskVisual: {
    readonly milestoneGlyph: NonNullable<TaskVisual['milestoneGlyph']>
  }
} = {
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
 * The five states of table T-019a. The spellings are this file's own: the
 * state is derived, never stored and never exchanged, so no table names it.
 * Each is tied to the row it comes from so a failing test can name one line.
 */
export type PlanActualState =
  /** PS-1 */ | 'notStarted'
  /** PS-2 */ | 'finished'
  /** PS-3 */ | 'suspendedResumeUnknown'
  /** PS-4 */ | 'suspendedResumePlanned'
  /** PS-5 */ | 'inProgress'

/**
 * Which of the five a task is in. Table T-019a is a decision list read in the
 * order of its rank column, and it is total: PS-5 catches whatever the first
 * four did not, which is what made the table replace a set of conditions that
 * left a real task -- one suspended and then finished -- matching no row.
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

/** Look one task up by its UID. FR-022 matches on it. @purity pure */
export function taskByUid(schedule: Schedule, uid: number): Task | null {
  return schedule.tasks.find((task) => task.uid === uid) ?? null
}

// `scheduleViolations` is at the FOOT of this file, under "document
// invariants". It is last because it is the one member that reads every other
// one -- the days, the calendar and the resolution FR-054 states -- and putting
// it there keeps the roster it walks next to nothing it has to be read against.

// ---------------------------------------------------------------- dates ----
//
// GRS does not handle time: the smallest unit is the day (FR-054). A date
// column keeps the exchange partner's own text -- every one of them is `Own`,
// so EX-2 and FR-021 require the untouched value to go back unchanged -- and
// the day is derived from it here, in one place, rather than parsed wherever
// somebody happens to need it.
//
// The day is the LEXICAL date part. No time zone is converted (FR-054): doing
// so would move the day by one on some machines and not others.

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
 * ⚠️ `Date.UTC` maps a year of 0 .. 99 onto 1900 .. 1999, so a day whose year
 * is below 100 lands on the wrong serial. `dayOf` admits one -- its regular
 * expression takes any four digits -- and table T-214 forbids one from ever
 * being stored (`FR-023`), but `ValidateImportedDocument` (`PI-13`) is still an
 * empty unit, so nothing enforces that yet. Left as it is on purpose: the same
 * mapping sits in `dayOf`'s round-trip check, so the fix moves both together
 * and changes what they answer for years 1 .. 99. It is not part of this change
 * and it is reported.
 *
 * @purity pure
 */
function serial(day: CalendarDay): number {
  return Date.UTC(day.year, day.month - 1, day.day) / 86400000
}

/**
 * The span between two days in CALENDAR days, half-open the way
 * `workingDaysBetween` is -- so a plan that starts and finishes on one day
 * spans 0, and the two counts can be compared against the same figure.
 *
 * ⭐ FD-6 of table T-012a fixes this as the unit a fade is measured in
 * (本表の「期間」は暦日で数えること（MUST）), and the same row binds IV-12 of
 * table T-220 to it. ⛔ It is NOT FR-012's span, which is worked days and
 * answers a different requirement.
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

/**
 * One `Exception`'s days, as serials. Both ends are INCLUSIVE -- AT-79 and
 * AT-80 name the first and the last day the exception covers -- which is why
 * the field says so (`R3.4`: a closed interval is shown by its name).
 */
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
 * Read the calendar once, so that a walk does not read it once per day.
 *
 * ⭐ Both walks below call this BEFORE their loop, never inside it (`R5`, code
 * level -- loop-invariant work does not belong in the loop): `dayOf` runs a
 * regular expression and builds a `Date` for every exception, and
 * `layoutFromSchedule` reaches `dateFromWorkingDays` once per `Task` per frame,
 * where `NFR-002` fixes the budget.
 *
 * ⚠️ The index is built per call, never held between calls. Holding one would
 * be a cache, and `R2.20` requires Chapter 5.6 to record what is cached, what
 * invalidates it, and what staleness is allowed. Chapter 5.6 records none of
 * that for this, so this file does not invent it -- a short walk therefore
 * still pays one pass over the exceptions, the same pass its first day used to
 * pay on its own.
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
    // The FIRST row for a day type decides it, which is what the `find` this
    // replaced did. A weekday with no row at all is not worked.
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
 * Whether a day is worked. WeekDay.dayType is 1..7 with 1 = Sunday, the coding
 * of the exchange partner (AT-73); an exception that covers the day wins over
 * the weekly pattern, which is what recurrenceKind exists to bound. Only the
 * exceptions this software interprets are considered -- a recurring one it did
 * not interpret stays in carry and is not read here.
 *
 * One day at a time. A walk over many asks `isWorkingDayAt` against an index it
 * built once, so the answer is the same and the calendar is read once.
 *
 * ⚠️ The whole `WorkingCalendar` is the argument, not its three fields spread
 * out. Every caller held one anyway and had to reach through it (`R2.12`), and
 * the `calendar` field was accepted only to be discarded (`R2.9`).
 *
 * @purity pure
 */
export function isWorkingDay(within: WorkingCalendar, day: CalendarDay): boolean {
  return isWorkingDayAt(indexOfCalendar(within), serial(day))
}

/**
 * Table T-209's default: Monday to Friday worked, no exception days.
 *
 * ⚠️ This calendar is NOT in the document. It is built to count by when the
 * document names none, so its `uid` stands for nothing and is never written --
 * FR-054 requires an unimported document to have a calendar all the same.
 */
const DEFAULT_WEEK_DAYS: readonly WeekDay[] = [1, 2, 3, 4, 5, 6, 7].map((dayType, ordinal) => ({
  ordinal,
  dayType,
  // ⭐ S-106 itself, in the dayType numbering AT-73 states, generated from the
  // manuscript. This line used to read `dayType >= 2 && dayType <= 6` with a
  // comment explaining the mapping -- and that comment was the ONLY place the
  // mapping was written down anywhere: the specification did not state it
  // until CR-180. Changing 表 T-209 now changes this (CR-180).
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
 * The one calendar the document counts working days by.
 *
 * FR-054 says "文書が持つ暦" and then "同じ暦", singular both times, and fixes
 * the order: what `Project.calendarUid` names, else the lowest-ordinal base
 * calendar, else table T-209's default.
 *
 * ⚠️ `Task.calendarUid` and `Resource.calendarUid` are NOT read here (MUST
 * NOT). They are held to send the exchange partner's value back. Counting two
 * Tasks of one row by different calendars would leave the progress line's
 * vertices (table T-022) and the days late (FR-047) incomparable inside that
 * row, which is the one comparison UC-006 exists to make.
 *
 * ⚠️ `Calendar.baseCalendarUid` is NOT walked -- resolving that inheritance is
 * the import's job (FR-023), and doing it here would rebuild the same answer
 * every frame.
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
 * The two ends of table T-214, as rows S-119 and S-120 write them.
 *
 * ⚠️ These are the DEFAULT values of two settings, not constants of the domain:
 * `DocumentSettings` publishes `importMinDate` (S-119) and `importMaxDate`
 * (S-120) per document, and both rows carry 🔎 -- the values may yet be
 * re-chosen. Reading them from the settings was the alternative and was not
 * taken: this file is handed the schedule group (DR-2 of table T-052) and never
 * the presentation group (DR-3), so the settings would have to be added to the
 * two signatures below and threaded through five call sites in three
 * components -- to size a safety valve, not to decide an answer. If the two
 * rows move, move these two with them.
 */
const IMPORT_MIN_DAY: CalendarDay = { year: 1970, month: 1, day: 1 }
const IMPORT_MAX_DAY: CalendarDay = { year: 2200, month: 12, day: 31 }

/**
 * The most days a walk can cross and still be inside the range table T-214
 * accepts. A walk that passes this has left the range no input may hold, which
 * is what a calendar working none of its days does -- and the alternative is a
 * loop that never ends.
 *
 * ⚠️ Derived from the two rows above, not chosen. It was written as the bare
 * literal 85000, which is this span plus 630 days that no row asks for.
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
 * ST-7's shape again, for the counting walk. What that walk needs a valve for
 * is cost rather than a spin -- it always ends -- and the cost is not bounded
 * by anything else: `dayOf` admits any four-digit year, `FR-023` is the MUST
 * NOT that keeps a date outside table T-214 out of the document, and
 * `ValidateImportedDocument` (`PI-13`) is the unit that enforces it and is
 * still empty. Until it is written a document can hold 0001-01-01 and ask for
 * millions of steps on one command.
 *
 * ⚠️ A separate class from `NoWorkingDayReached` on purpose: there the calendar
 * is what is wrong, here the two ends are, and one message cannot say both.
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
  // The same bound `dateFromWorkingDays` walks under, for the same reason:
  // table T-214 bounds every date an input may hold, so a wider span is
  // counting days no document may name. Here the number of steps is known
  // before the walk, so the valve costs one subtraction instead of a counter.
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
 * Both of these count a half-open span, and that is what makes them a pair: a
 * task that starts on a Monday with an actualDuration of one worked day covers
 * the Monday alone (S-129, and the ruling of version 0.38), so the end it
 * reaches is the Tuesday. The end is a bound, not the last day worked -- more
 * than one day satisfies the count when a weekend follows, and taking the
 * earliest is what makes the answer single.
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
    // A calendar that works none of its days would spin here forever, and
    // nothing in the specification forbids one arriving. Table T-214 bounds
    // every date an input may hold, so a walk past that span cannot be real.
    // Unlike the count above, how far a day of work lies is not known before
    // the walk -- it depends on the calendar -- so this valve has to count.
    if (walked++ > ACCEPTED_DAY_SPAN) throw new NoWorkingDayReached(within.calendar.uid)
    const covered = step > 0 ? at : at - 1
    at += step
    if (isWorkingDayAt(index, covered)) remaining -= 1
  }
  return dayFromSerial(at)
}

/**
 * The first working day strictly after `from`.
 *
 * ⭐ FR-043 (MUST) puts the actual-start dummy on 「予定の開始日の翌稼働日」, and
 * FR-054 makes that reading the calendar's. ⛔ NOT `dateFromWorkingDays(from,
 * 1)`: that answers a half-open END BOUND -- the day a one-day span reaches --
 * so for a Friday start it lands on the Saturday, which is a day nobody works
 * and which FR-043 refuses to put a handle on.
 *
 * ⚠️ `from` ITSELF IS NEVER THE ANSWER, whether or not it is worked. The two
 * handles either side of it are what the rule exists for (GR-3 to the left,
 * GR-9 to the right), so an answer equal to `from` would put them back on one
 * another.
 *
 * @purity pure
 */
export function nextWorkingDay(within: WorkingCalendar, from: CalendarDay): CalendarDay {
  const index = indexOfCalendar(within)
  let at = serial(from) + 1
  let walked = 0
  while (!isWorkingDayAt(index, at)) {
    // The same valve `dateFromWorkingDays` carries, for the same reason: a
    // calendar that works none of its days would spin here forever, and table
    // T-214 bounds every date an input may hold.
    if (walked++ > ACCEPTED_DAY_SPAN) throw new NoWorkingDayReached(within.calendar.uid)
    at += 1
  }
  return dayFromSerial(at)
}

/**
 * Whether a task is behind, and by how much. Table T-021b holds all three
 * cases, and each names the start it counts from; the end is always the status
 * date. A task in none of the three is not behind.
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
 * The delay in worked days, counted from the day table T-021b names to the
 * status date. Zero when the task is not behind.
 *
 * ⚠️ Raises `DaySpanTooWide` when the two ends are further apart than table
 * T-214 accepts. It counts dates the document already holds, and nothing has
 * range-checked them yet (`FR-023` / `PI-13`), so the valve is reachable here.
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
// Table T-220 is the whole census of the document's invariants, and Chapter 6.1
// requires `scheduleViolations` to be DRIVEN by that table (MUST) rather than to
// write its rows out one condition at a time (MUST NOT). So the table is
// transcribed below as fixed data -- one entry per row, carrying that row's ID
// and its kind column -- and `scheduleViolations` is a single walk over the
// roster. 1.9 asks for the same shape of a test that verifies a requirement
// pointing at a table: one walk over every row, never one branch per row.
//
// ⚠️ The table holds only the conditions the generated schema CANNOT hold.
// Chapter 6.1 keeps every single-column condition out of it -- type,
// nullability, string length, numeric range and a spelled enumeration are
// already forced by `_source/grs-document.schema.json` -- so none is repeated
// here either.
//
// ⭐ Every row of the table is answered. IV-1, IV-2 and IV-16 used to answer
// nothing because the columns they are judged against reached no generated
// artifact; `ENTITY_ROWS` and `SETTINGS_BOUNDS` are now those rosters, so the
// three are driven the same way IV-14 is driven by `DATE_COLUMNS`.
//
// ⛔ Where a row is answered only in part, its own entry says so. `ENTITY_ROWS`
// is the only census of them, and a row that reaches past it -- IV-16's bounds
// over a value the presentation group does not hold -- is listed there, not
// guessed at here.

/**
 * The kind column of table T-220, romanised.
 *
 * ⚠️ The table spells these five in Japanese and code is ASCII (rule 03
 * section 5), so the spellings below are this file's. The table stays the
 * source: every entry of the roster names its row ID beside its kind, so the
 * two can be lined up without reading any of the code between them.
 */
export type InvariantKind =
  | 'unique'
  | 'reference'
  | 'structure'
  | 'combination'
  | 'range'

/**
 * One place a document breaks one invariant.
 *
 * ⚠️ The same three fields `DocumentViolation` (PI-34) carries, plus the kind,
 * so that a caller holding both lists reads them the same way. `at` points into
 * the DOCUMENT and not into either group: IV-3, IV-13 and IV-14 can all break
 * inside `/documentSettings`, which a pointer rooted at the schedule could not
 * say.
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
 * What every invariant is judged against.
 *
 * ⚠️ The two groups arrive separately rather than as one `Document`. DR-1 of
 * table T-052 binds the three groups and `Document` (PI-34) is what holds them
 * -- but that component already reaches THIS one, so taking a `Document` here
 * would close a cycle inside the layer, which LR-3 of table T-061 forbids.
 *
 * ⚠️ The presentation group is needed all the same: IV-3, IV-5, IV-13, IV-14
 * and IV-16 each state a settings row among what they are judged by.
 */
interface DocumentUnderTest {
  readonly schedule: Schedule
  readonly settings: DocumentSettings
}

/**
 * Where one invariant is broken, before the row it belongs to is stamped on.
 *
 * ⚠️ A finder does NOT name its own row. The roster entry already carries it
 * and the walk copies it onto every breach, so an entry cannot disagree with
 * itself about which row of table T-220 it is answering for.
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
 * The depth of every row under its own parent column, and the rings that stop a
 * depth being settled. Both come out of one climb because neither can be had
 * without the other: a walk that did not watch for a ring would never return.
 *
 * ⚠️ Written once over any key type because IV-4, IV-5 and IV-18 climb the same
 * shape -- `Task` by `wbsParentUid`, `TaskGroup` by `parentId` -- and S-115 and
 * S-125 both start their count at 1 for a row whose parent is absent. Two
 * copies of this walk would be two chances to count the root differently, and
 * two answers to what a ring is.
 *
 * ⭐ Indexed once with a `Map` (R5 / NFR-013). A search inside the climb would
 * make this quadratic over an array S-114 still lets reach six figures. Each row
 * is climbed past once and answered from the memo after that.
 *
 * ⚠️ A parent naming no row ends the climb as though the row were a root. That
 * dangling reference is IV-2's to report, and inventing a second answer for it
 * here would put one rule in two places.
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
 * The place every row takes in the document's own order, top to bottom: a
 * preorder walk of `parentId`, siblings by AT-55's `order`.
 *
 * ⭐ WHAT 「下」 MEANS TO IV-19, AND THE ONLY THING THIS ANSWERS. It is a rank
 * and not a `y`: a document at rest has no picture, and the row an invariant
 * calls lower is the one that stands later in this walk.
 * ⛔ NOT LC-1's WALK, WHICH ORDERS A DIFFERENT SET. That one puts the rows the
 * picture DREW in order and drops what HR-6 hid or HR-1a folded away; a row
 * left out of the picture still holds its place between its siblings in the
 * document, so an invariant measured on the drawn set would answer differently
 * on two screens showing the same file.
 * ⚠️ A row whose parent is missing is a root here, and a row a `parentId` ring
 * makes unreachable is appended rather than dropped -- IV-2 and IV-18 are the
 * rows that report those two, and this walk is not a second place they are
 * judged. Every row therefore has a rank, so IV-19 never has to say 「no order」.
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
 * Every date column of one row that IV-14 turns down.
 *
 * ⚠️ It ANSWERS with the breaches rather than writing into an array it was
 * handed. Rewriting an argument is an effect, so a helper that did it could not
 * call itself pure below and be telling the truth -- and the tag has to be
 * true, not merely present. The array is built only once there is something to
 * put in it, so a row entirely inside the range costs nothing over the walk it
 * already needs.
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
      // ⚠️ The empty string is HERE and not waved through as absence. IV-14's
      // own remark puts it on the unreadable side, because a column that admits
      // absence spells it `null`.
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
 *
 * ⚠️ A member that is not a row is skipped rather than reported. Shape is what
 * the generated schema forces, and Chapter 6.1 keeps every condition one column
 * settles on its own out of table T-220.
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
 * Every row the schedule group holds, walked through `ENTITY_ROWS`.
 *
 * ⭐ Driven by the roster, not by the keys of `Schedule` written out here: a
 * key added to DR-2 of table T-052, or a column that starts holding rows of
 * another entity, is walked without anybody remembering to add it. IV-1 and
 * IV-2 both reach every row of the document this way, nested rows included.
 *
 * ⚠️ The walk is a growing list read with a cursor, not a recursion. A row
 * appended below is reached in its turn, so a `CarryElement` tree as deep as
 * S-133 allows costs no stack -- and pushing one row at a time rather than
 * spreading an array keeps an array as long as S-114 allows from blowing the
 * argument limit.
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
 * One value of a settings key, as the number IV-16 weighs.
 *
 * ⚠️ A list is read as HOW MANY it holds. S-126 is the one bounded key that
 * holds a list, its ceiling names S-127, and its floor is written as a count --
 * so the count is what its bound bounds. The same reading is taken where the
 * startup document is written (tools/generate_startup_template.py).
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

/**
 * Table T-220, as fixed data. One entry per row, in the order the table prints
 * them -- which is why IV-17 stands between IV-7 and IV-8 and IV-18 last.
 */
const INVARIANTS: readonly Invariant[] = [
  {
    row: 'IV-1',
    kind: 'unique',
    /**
     * ⭐ Driven by `ENTITY_ROWS`, which carries the columns the key column of
     * table T-058 marks a primary key. The row reaches them by pointing at that
     * column instead of naming them, and the closing remark of table T-220
     * refuses to list them for the same reason -- so this reaches them the same
     * way, and a column the manuscript marks tomorrow is judged without anybody
     * remembering it here.
     *
     * ⚠️ The span is ONE ARRAY, which the row says: a value has to be unique
     * where it is listed, not across the document. Two `WeekDay` rows in two
     * different calendars may hold the same ordinal.
     *
     * ⚠️ The whole tuple is compared, not a single column, because the key
     * column of table T-058 may mark more than one column of one entity. The
     * roster carries however many there are, so nothing here has to change if
     * a second one appears.
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
          // ⚠️ Stamped rather than compared row by row (R5 / NFR-013). A search
          // inside the loop would be quadratic over an array S-114 still lets
          // reach six figures.
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
     * ⭐ Driven by `ENTITY_ROWS` as well: the key column of table T-058 says
     * which columns hold a reference and the relations of table T-057 say where
     * each lands, and the generator refuses to emit one without the other. So
     * neither the column nor its target is read off a spelling here.
     *
     * ⚠️ Only a non-`null` reference is judged, which the row says. A column the
     * document does not carry at all is passed over too -- a missing column is
     * what the generated schema refuses, not this.
     *
     * @purity pure
     */
    find: ({ schedule }) => {
      const rows = documentRowsOf(schedule)
      // ⭐ Indexed once (R5 / NFR-013): a search per reference would be
      // quadratic over arrays S-114 still lets reach six figures.
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
     * ⚠️ Only that the pinned row EXISTS. Where a pinned row is drawn is
     * OP-10's, which the row says in as many words.
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
     * ⚠️ The WBS is outside this one, which the row says: its depth has no
     * bound at all, and S-115 bounds it only at the moment an import is judged.
     *
     * ⚠️ A row sitting ON a ring in `parentId` has no settled depth, so it is
     * not reported here: this row states a depth and not a shape. IV-18 is the
     * row that covers that ring, and it does.
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
     * ⚠️ Both ways of missing "exactly one" are reported, and the count is said
     * out loud. Two rows naming the same `Task` is IV-1's business as well --
     * the key column makes `TaskGroupMember.taskUid` a primary key -- but one
     * cannot stand in for the other while IV-1 answers nothing.
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
    row: 'IV-17',
    kind: 'structure',
    /**
     * ⚠️ Only the calendar FR-054 resolves, which the row says: a calendar the
     * document carries but never counts by may work no day at all.
     * `workingCalendarOf` IS that resolution, so asking it is what keeps this
     * row and FR-054 from disagreeing about which calendar is meant.
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
     * ⚠️ `null` is not transparent. P-19 keeps the two apart -- one is a chosen
     * value, the other is nothing chosen -- so a row holding `null` in both
     * columns does not break this.
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
     * ⚠️ Both ends have to be readable days before there is an order to check.
     * A column holding a string that names no day is IV-14's, and a `Task`
     * missing one end is FR-012's at the moment an input is judged.
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
     * ⚠️ Either column is enough to require the third. AT-40 and AT-41 keep
     * `null` and `0` apart, so a fade of zero days is still a fade somebody put
     * there, and it still needs an end to be measured from.
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
     * ⚠️ The span is the DIFFERENCE between the two days, never the count of
     * days with both ends included. FR-012 states which of the two it is and
     * what breaks when they are swapped, so a `Task` whose start and finish name
     * the same day has a span of zero and may carry no fade at all.
     *
     * ⚠️ A missing or unreadable end is passed over rather than counted as a
     * span of zero. IV-11 and IV-14 report those, and reading an absent end as
     * zero would report one document twice under a row that is about the sum,
     * not about the ends.
     *
     * ⚠️ A `Task` carrying NEITHER column is passed over as well, and not read
     * as a sum of zero. A span can come out negative -- that is IV-10's to
     * report -- and a sum of zero is over a negative span, so counting one here
     * would put every task IV-10 already names under this row too.
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
     * S-65 spells the two columns the dual cursor holds.
     *
     * ⭐ READ THROUGH THE TYPE. ⛔ The note that stood here said the generated
     * `DocumentSettings.dualCursor` was `object | null` and narrowed through
     * `unknown` to get at the members; both members are in the type now, so the
     * narrowing is gone with the note that explained it.
     *
     * ⚠️ THE CHECK IS NOT THEREBY EMPTY. The type says a document built inside
     * `src/` cannot breach IV-13; this judges a document that arrived from
     * OUTSIDE, where a key may be absent or null however the type reads.
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
     * ⭐ Driven by `DATE_COLUMNS`, which is generated from the same marks in the
     * manuscript that print the type column. The row reaches its columns by
     * pointing at that column instead of naming them, and this reaches them the
     * same way -- so a column added to the manuscript is judged here without
     * anybody remembering to add it.
     *
     * ⚠️ What is walked below is the ENTITIES, not their columns. The six arrays
     * are where the document puts its rows; which of their columns hold a day is
     * `DATE_COLUMNS`'s answer, not this file's.
     *
     * ⚠️ The two ends come from the settings in force, never from a constant
     * here. They are per-document values (S-119, S-120), and judging by a copy
     * would let this row and the import disagree about one range.
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
     * ⭐ Driven by `SETTINGS_BOUNDS` (PI-2), which now carries a bound stated
     * over other keys as its expression. Only those are judged, which the row
     * says: a bound that is a number of its own settles on one column, and the
     * preamble of table T-220 keeps those out of the table entirely because the
     * generated schema already forces them.
     *
     * ⚠️ What is outside this row is decided in the roster, not here. A field
     * pointing at a screen dimension is prose in the manuscript and reaches no
     * expression at all, and a field naming a key the presentation group does
     * not hold is left out and listed with its reason beside the roster -- a
     * document at rest carries neither operand. So this file states no
     * exclusion of its own and cannot come to hold a second list of them.
     *
     * ⚠️ Sitting exactly ON the bound is not a breach. The field states a floor
     * or a ceiling, and the two keys of a pair name each other, so a document
     * that sets them equal satisfies both.
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
     * ⭐ IV-10's SHAPE OVER FOUR COLUMNS, which is what the row says of itself:
     * 「`IV-10` が `Task` の 2 列について定めるものを、注記の 4 列について定める」.
     * Both ends of each pair have to be readable before there is an order to
     * check, so a box holding `null` -- or a day IV-14 already reports -- is not
     * this row's.
     *
     * ⛔ A DRAGGED BOX CANNOT REACH HERE AND THE ROW SAYS SO: 「ドラッグから来た
     * 値は本行の対象ではない —— `FR-019` が離した時点で正規化すると定めており、
     * 正規化された値は本行を必ず満たす」. What this row is for is the other two
     * roads -- 「打ち込みと取り込みから来た値には効かせること（MUST）」 -- and
     * those carry no direction to normalise.
     *
     * ⭐ 「下」 IS THE ORDER THE ROWS STAND IN, which is the document's own tree
     * and not the picture's: a row hidden by HR-6 or dropped by FR-018 still
     * holds a place between its siblings, and an invariant of a document at rest
     * cannot be measured against a screen. `taskGroupRankById` is that walk.
     * ⚠️ A pair naming a row the document does not hold is IV-2's (the foreign
     * key) and is left alone here: an order cannot be read off a row that is not
     * there, and reporting it twice would put every dangling identifier under
     * this row too.
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
     * ⚠️ The second tree, and only it. IV-4 climbs `Task.wbsParentUid`; this
     * one climbs `TaskGroup.parentId`, and the row says why neither HM-4 nor
     * FR-023 already catches it. `nestingOf` is the one climb both use, so the
     * two rows cannot come to disagree about what a ring is.
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
 * Every place the document breaks an invariant of table T-220, in the order the
 * table lists its rows.
 *
 * ⚠️ It ANSWERS, and refuses nothing: a violation is a value, never a throw
 * (AG-8 of table T-035, R7.10). Whether one stops a load, a save or an edit is
 * the caller's to decide, and the three moments decide it differently.
 *
 * ⚠️ It is NOT the import check. `validateImportedDocument` (PI-13) judges
 * untrusted input while the current document is still standing (OP-5), and
 * three of its refusals restate a condition this holds too. The rule is one;
 * the moment is two.
 *
 * ⚠️ An empty answer means every row of table T-220 was asked and none of them
 * answered -- not that nothing about the document could be wrong. What one row
 * leaves outside itself, it says so above; the generated rosters list what the
 * manuscript does not reach.
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
