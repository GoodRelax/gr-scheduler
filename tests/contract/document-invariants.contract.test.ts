// Contract test: table T-220 of Chapter 6.1 -- the document invariants.
//
// Table T-218 row TS-5 puts this here: a contract test is owned by neither side
// of the seam and is driven by a specification table, under tests/contract/ and
// run by Vitest. It is not TS-6 -- that row gives tests/unit/ to whoever
// implemented the unit, and rule 04 section 1 forbids that person writing them.
// It is not TS-2 or TS-3 either: both hang from an `SWS-xxx`, and Chapter 6.1
// declares no `SW_SPEC` node over table T-220.
//
// Chapter 6.1 requires `scheduleViolations` (table T-064's PI-1) to be DRIVEN by
// table T-220 and forbids writing the rows out one by one (MUST NOT). A test
// written out row by row would carry the very defect that MUST NOT names -- a
// second copy of the table, going stale in silence -- so this file walks the
// table instead. `specTable` reads T-220 out of docs/spec at run time, which is
// Chapter 1.9 (:275) taken literally, and the roster of breaches below is
// checked against the table's own row IDs in both directions: a row added to
// T-220 fails this file rather than slipping past it.
//
// ⚠️ Written from docs/spec alone (rule 04 section 1). Of the unit under test,
// only what its public entry declares was read -- the exported entity types, the
// generated rosters, `ScheduleViolation`, `InvariantKind` and the signature. The
// body of `scheduleViolations` was not opened, so a misreading inside it cannot
// have been copied into the expectations here.
//
// ⛔ WHAT IS DELIBERATELY NOT ASSERTED, and why:
//
//   - The order of the answer. Table T-220 prints its rows in an order, but
//     nothing in docs/spec says the answer follows it, and Chapter 1.9's rule
//     about keeping a table's printed order is addressed to code that reads a
//     ruling out of the order (rule 03 section 4), not to a list of findings.
//     ⛔ Missing: a sentence saying whether the answer is ordered at all.
//   - What `at` and `what` hold. Table T-220 names the invariant and its kind
//     and stops there; the two fields are the published type's, not the
//     table's. ⛔ Missing: any statement of what a violation reports beyond
//     which row broke. Only `row` and `kind` are asserted.
//   - How much a breach must be reported. One document can break one row in
//     several places, and docs/spec nowhere says whether all of them are
//     answered or the first. Each case asserts its row is present, never a
//     count.
//   - Whether a `Calendar` carrying no `WeekDay` row at all breaks IV-17.
//     ⛔ Missing: IV-17 asks the resolved calendar to hold at least one working
//     weekday, and version 0.52 of the revision history records that an
//     exchanged calendar may carry no weekday rows whatsoever -- which reads
//     both as "zero working weekdays, so a breach" and as "nothing was stated,
//     so nothing to judge". The IV-17 case below switches every weekday the
//     document HAS off instead, which FR-088 describes as a thing a person
//     reaches by hand, so it breaks under either reading.
//   - Where IV-12 measures the task's span from, and in which days. ⛔ Missing:
//     the row names `start` and `finish` as its material but not whether the
//     span is counted in calendar days or working days, nor whether both ends
//     count. The case below overshoots by two orders of magnitude so that every
//     reading of the row is broken.
//   - `changeLog.ordinal`, though table T-058 marks it a primary key and IV-1
//     therefore reaches it. ⛔ Missing: any way for this seam to be shown it.
//     DR-4 of table T-052 puts that array at the document root, outside both
//     groups the signature takes, so `scheduleViolations` is never handed the
//     column it is asked to judge. The sweep below files it as out of reach
//     rather than dropping it, so the roster still fails when table T-058
//     grows or loses a key column.
//   - Every settings row whose bound names another settings row. ⛔ Missing: a
//     grammar for that column. Some of its cells hold one key and some hold
//     arithmetic over several keys, and docs/spec nowhere says how the second
//     sort is to be read -- so IV-16 is probed from the cells that hold one
//     key and nothing else, and the arithmetic ones are left alone.

import { describe, expect, it } from 'vitest'

import { bare, specTable, type SpecRow } from './spec-table'
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
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'

// ---------------------------------------------------------------------------
// The table, read rather than copied
// ---------------------------------------------------------------------------

const T220 = specTable('T-220')

/**
 * The 種別 column of table T-220, paired with the spelling `InvariantKind`
 * publishes for it.
 *
 * ⚠️ Japanese literals on the left. Rule 03 section 5 keeps code in English and
 * ASCII and names one exception -- 日本語そのものを扱う処理（分類の欄を解析する
 * など）-- which is exactly this: the column being read is written in Japanese
 * and the published type is written in English, so something has to pair them.
 * Nothing else in the repository does, so it is here rather than duplicated.
 *
 * ⭐ A kind the table grows is absent from this map and `kindOf` throws, so the
 * table cannot gain a sixth kind without this file saying so.
 */
const KIND_BY_COLUMN: Readonly<Record<string, InvariantKind>> = {
  '一意': 'unique',
  '参照': 'reference',
  '構造': 'structure',
  '組合せ': 'combination',
  '範囲': 'range',
}

/**
 * The kind one row of table T-220 states.
 *
 * @purity pure
 */
const kindOf = (column: string): InvariantKind => {
  const kind = KIND_BY_COLUMN[column]
  if (kind === undefined) {
    throw new Error(`table T-220 states a kind this test cannot read: ${JSON.stringify(column)}`)
  }
  return kind
}

/** One row of table T-220, as this file needs it. */
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

/**
 * The columns table T-058 marks, read rather than copied.
 *
 * ⭐ IV-1 and IV-2 reach their material through the key column of that table
 * instead of naming columns, so a case that breaks one column proves only that
 * column. The two sweeps below break every column the table marks, which is
 * what makes them able to fail an answer that was written out by hand.
 */
const T058 = specTable('T-058')

/**
 * The headings of table T-058 this file reads.
 *
 * ⚠️ Japanese literals, for the reason KIND_BY_COLUMN gives above: the headings
 * being matched are written in Japanese, and rule 03 section 5 admits exactly
 * this case -- code whose subject is the Japanese itself.
 */
const HEADING_ENTITY = 'エンティティ'
const HEADING_COLUMN = '列'
const HEADING_KEY = '鍵'

/** One row of table T-058 as `Entity.column`, which is W-7's form. @purity pure */
const memberOf = (row: SpecRow): string =>
  `${bare(row.by[HEADING_ENTITY] ?? '')}.${bare(row.by[HEADING_COLUMN] ?? '')}`

/**
 * The marks one row of table T-058 carries in its key column.
 *
 * ⚠️ Two separators are accepted. Table T-220 and table T-058 punctuate the
 * compound key differently, and which of the two spellings a row happens to use
 * must not decide whether this file sees it.
 *
 * @purity pure
 */
const keyMarksOf = (row: SpecRow): readonly string[] =>
  bare(row.by[HEADING_KEY] ?? '')
    .split(/[,/]/)
    .map((mark) => mark.trim())

/** Every column of table T-058 whose key column carries one mark. @purity pure */
const columnsMarked = (mark: string): readonly string[] =>
  T058.rows.filter((row) => keyMarksOf(row).includes(mark)).map(memberOf)

const PRIMARY_KEY_COLUMNS = columnsMarked('PK')
const FOREIGN_KEY_COLUMNS = columnsMarked('FK')

// ---------------------------------------------------------------------------
// A document that breaks nothing, and the pieces every breach starts from
// ---------------------------------------------------------------------------

/**
 * The pair `scheduleViolations` is judged over. Table T-052's DR-1 binds the
 * three groups into a `Document`, but the signature takes the schedule group
 * and the presentation group separately, so the cases carry the same two.
 */
interface DocumentUnderTest {
  readonly schedule: Schedule
  readonly settings: DocumentSettings
}

/**
 * A `TaskGroup.id` -- AT-51 types the column as a UUID, so the cases use one
 * rather than a bare word. The number only keeps them apart.
 *
 * @purity pure
 */
const uuidOf = (n: number): string => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

/** Expand SETTINGS_DEFAULTS' dotted keys into the nested shape the type has. @purity pure */
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

/** One number of the settings group, read as the number it is. @purity pure */
const settingNumber = (key: keyof DocumentSettings): number => {
  const value = SETTINGS[key]
  if (typeof value !== 'number') throw new Error(`the settings group has no number ${key}`)
  return value
}

/**
 * The same, for a key the manuscript writes with a dot in it.
 *
 * The dotted spelling is the one `SETTINGS_DEFAULTS` and the settings tables
 * both use, so a case can name the row the way the manuscript does instead of
 * walking into the nested shape by hand.
 *
 * @purity pure
 */
const settingNumberAt = (key: string): number => {
  let here: unknown = SETTINGS
  for (const step of key.split('.')) {
    here = (here as Record<string, unknown>)[step]
  }
  if (typeof here !== 'number') throw new Error(`the settings group has no number ${key}`)
  return here
}

/**
 * The weekdays of the document's calendar, worked on the days table T-209 says.
 *
 * ⭐ Built from `DEFAULT_CALENDAR_VALUES`, which is generated from the
 * manuscript, so no weekday number is typed here and none can go stale. The
 * ordinal is AT-72's primary key and only has to be unique inside this array
 * (IV-1), so the position in the roster is enough.
 *
 * @purity pure
 */
const workedWeekDays = (): readonly WeekDay[] =>
  DEFAULT_CALENDAR_VALUES['S-106'].map((dayType, i) => ({
    ordinal: i + 1,
    dayType,
    dayWorking: true,
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

const PROJECT: Project = {
  id: null,
  name: null,
  title: null,
  subject: null,
  category: null,
  company: null,
  manager: null,
  author: null,
  created: null,
  revision: null,
  lastSaved: null,
  startDate: null,
  statusDate: null,
  minutesPerDay: null,
  minutesPerWeek: null,
  daysPerMonth: null,
  weekStartDay: null,
  // FR-054: the document's calendar is the one this names. Naming it keeps the
  // IV-17 case honest -- the calendar it breaks is the resolved one.
  calendarUid: CALENDAR_UID,
  // ⛔ Table T-220 judges nothing about the hue and AT-19 refuses `null`, so
  // this is a placeholder inside the column's range and not a reading of S-73,
  // whose value reaches no generated artifact this file can call.
  themeHue: 0,
  uidHighWaterMark: 400,
  importSeq: 3,
  carry: {},
  carryElements: [],
}

const TASK_A_UID = 101
const TASK_B_UID = 102

const TASK_A: Task = {
  uid: TASK_A_UID,
  wbsParentUid: null,
  wbsOrder: 1,
  name: 'first',
  start: '2026-01-05',
  finish: '2026-01-09',
  milestone: null,
  deadline: null,
  notes: null,
  calendarUid: null,
  actualStart: null,
  actualDuration: null,
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
  wbsParentUid: TASK_A_UID,
  wbsOrder: 2,
  name: 'second',
  start: '2026-01-12',
  finish: '2026-01-16',
  dependencies: [
    // ⛔ Table T-220 judges nothing about the link kind and AT-46 refuses
    // `null`, so this is a code inside that column's range, not a choice of
    // which kind the case is about.
    { predecessorUid: TASK_A_UID, linkType: 1, lag: null, lagFormat: null, carry: {}, carryElements: [] },
  ],
}

const GROUP_ONE_ID = uuidOf(1)
const GROUP_TWO_ID = uuidOf(2)

const GROUP_ONE: TaskGroup = {
  id: GROUP_ONE_ID,
  parentId: null,
  label: 'row one',
  derivedFromTaskUid: null,
  order: 1,
  isCollapsed: null,
  isHidden: null,
  color: null,
  height: null,
}

const GROUP_TWO: TaskGroup = {
  ...GROUP_ONE,
  id: GROUP_TWO_ID,
  parentId: GROUP_ONE_ID,
  label: 'row two',
  order: 2,
}

// IV-6 asks for exactly one of these per `Task`, so the sound document has two.
const MEMBER_A: TaskGroupMember = { taskUid: TASK_A_UID, groupId: GROUP_ONE_ID, stackOrder: 1 }
const MEMBER_B: TaskGroupMember = { taskUid: TASK_B_UID, groupId: GROUP_TWO_ID, stackOrder: 1 }

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

// IV-9 weighs two colours against each other, so the sound document carries a
// row for it to weigh. Both are unchosen, which P-19 says is not transparent.
const VISUAL: TaskVisual = {
  taskUid: TASK_A_UID,
  nameAnchor: null,
  nameAlign: null,
  shapeKind: null,
  milestoneGlyph: null,
  fillColor: null,
  strokeColor: null,
  lineWeight: null,
}

// IV-15 weighs this against `Project.importSeq`, so the sound document sets the
// two equal -- the boundary the row admits.
const ORIGIN: TaskOrigin = {
  taskUid: TASK_A_UID,
  sourceProjectUid: null,
  sourceUid: 7,
  lastSeenImportSeq: PROJECT.importSeq,
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
  taskVisuals: [VISUAL],
  commentBoxes: [],
  highlightBoxes: [],
  taskOrigins: [ORIGIN],
  baselineTasks: [],
}

const SOUND: DocumentUnderTest = { schedule: SCHEDULE, settings: SETTINGS }

/** The same document with some of the schedule group replaced. @purity pure */
const withSchedule = (part: Partial<Schedule>): DocumentUnderTest => ({
  ...SOUND,
  schedule: { ...SCHEDULE, ...part },
})

/** The same document with some of the presentation group replaced. @purity pure */
const withSettings = (part: Readonly<Record<string, unknown>>): DocumentUnderTest => ({
  ...SOUND,
  settings: settingsOf(part),
})

/**
 * A day one whole year below the floor of table T-214.
 *
 * ⭐ Derived from the floor the settings group carries rather than typed, so
 * moving S-119 moves this case with it instead of leaving a stale year that
 * happens to still be outside the range -- or, one day, inside it.
 *
 * @purity pure
 */
const beforeAcceptedDates = (): string =>
  `${Number(SETTINGS.importMinDate.slice(0, 4)) - 1}-01-01`

/**
 * A chain of rows nested one level deeper than S-125 allows.
 *
 * S-125 fixes where the depth count starts, and it starts at the root, so the
 * chain is one link longer than the bound. The bound itself is read off the
 * settings the case carries and is never typed here. Every link names itself so
 * that IV-8 stays whole while IV-5 breaks.
 *
 * @purity pure
 */
const overDeepGroups = (): readonly TaskGroup[] => {
  const links: TaskGroup[] = []
  for (let depth = 1; depth <= settingNumber('maxGroupDepth') + 1; depth += 1) {
    links.push({
      ...GROUP_ONE,
      id: uuidOf(100 + depth),
      parentId: depth === 1 ? null : uuidOf(100 + depth - 1),
      label: `link ${depth}`,
      order: 100 + depth,
    })
  }
  return links
}

// ---------------------------------------------------------------------------
// Rows the sound document does not need, but the sweeps below do
// ---------------------------------------------------------------------------
//
// Four arrays of the schedule group are empty in the sound document because no
// row of table T-220 needs them there. Table T-058 marks a key column inside
// each of them all the same, so the sweeps have to put a row in.

const EXCEPTION_ONE: Exception = {
  ordinal: 1,
  name: null,
  fromDate: null,
  toDate: null,
  dayWorking: null,
  recurrenceKind: null,
  carry: {},
  carryElements: [],
}

const COMMENT_BOX_ONE: CommentBox = {
  id: uuidOf(11),
  leaderShapeKind: null,
  text: null,
  anchorDate: null,
  anchorGroupId: null,
  bodyOffsetPx: null,
}

const HIGHLIGHT_BOX_ONE: HighlightBox = {
  id: uuidOf(21),
  startDate: null,
  endDate: null,
  topGroupId: null,
  bottomGroupId: null,
  strokeColor: null,
  cornerRadiusPx: null,
}

// ⛔ W-9 keeps the exchange partner's spelling inside `carryElements`, so the
// name is one of theirs and not a word coined here. Nothing in table T-220
// weighs it; only the ordinal beside it is judged.
const CARRY_ONE: CarryElement = { ordinal: 1, name: 'Cost', fields: {}, children: [] }

const BASELINE_ONE: BaselineTask = {
  uid: TASK_A_UID,
  name: null,
  start: null,
  finish: null,
  milestone: null,
}

/** An integer key no row of the sound document carries. */
const MISSING_UID = 999

/** A UUID key no row of the sound document carries. */
const MISSING_GROUP_ID = uuidOf(999)

// ---------------------------------------------------------------------------
// One breach per row of the table
// ---------------------------------------------------------------------------

/**
 * A document that breaks the row it is filed under, and as little else as the
 * row allows. Each is keyed by the row ID so the test can walk the table and
 * ask for them by name rather than listing them a second time.
 */
const BREACH: Readonly<Record<string, () => DocumentUnderTest>> = {
  // Two rows of the same primary key inside one array. `Resource` is used
  // because no other invariant of the table looks at it, so the breach is
  // exactly one row wide.
  'IV-1': () => withSchedule({ resources: [RESOURCE, { ...RESOURCE, name: 'another' }] }),

  // A non-null foreign key naming a row the document does not hold. RL-15 is
  // the pointer for this column.
  'IV-2': () => withSchedule({ assignments: [{ ...ASSIGNMENT, resourceUid: 999 }] }),

  // A pinned row (S-126) naming a `TaskGroup` that is not there.
  'IV-3': () => withSettings({ pinnedGroupIds: [uuidOf(999)] }),

  // The WBS parents close a ring: each of the two names the other.
  'IV-4': () =>
    withSchedule({
      tasks: [{ ...TASK_A, wbsParentUid: TASK_B_UID }, TASK_B],
    }),

  // A chain of rows nested past S-125.
  'IV-5': () => withSchedule({ taskGroups: [GROUP_ONE, GROUP_TWO, ...overDeepGroups()] }),

  // The row parents close a ring: each of the two names the other. The same
  // shape as the IV-4 case, one axis over.
  //
  // ⚠️ IV-5 may be answered alongside it and that is not a fault of the case:
  // a ring has no depth to compare against S-125, so whichever way an answer
  // counts one, it will not stop. The assertion below asks only that IV-18 is
  // among the answers.
  'IV-18': () =>
    withSchedule({
      taskGroups: [{ ...GROUP_ONE, parentId: GROUP_TWO_ID }, GROUP_TWO],
    }),

  // A `Task` no `TaskGroupMember` names.
  'IV-6': () => withSchedule({ taskGroupMembers: [MEMBER_A] }),

  // No calendar at all. `Project.calendarUid` is cleared with it, so the
  // dangling reference of IV-2 is not raised alongside; FR-054 then resolves
  // the document's calendar to table T-209's default, which is worked, so
  // IV-17 is not raised either.
  'IV-7': () =>
    withSchedule({ calendars: [], project: { ...PROJECT, calendarUid: null } }),

  // Every weekday of the resolved calendar switched off -- what FR-088 says a
  // person reaches by taking all seven away.
  'IV-17': () =>
    withSchedule({
      calendars: [
        { ...CALENDAR, weekDays: workedWeekDays().map((day) => ({ ...day, dayWorking: false })) },
      ],
    }),

  // A row with neither a name of its own nor a task to take one from.
  'IV-8': () =>
    withSchedule({
      taskGroups: [{ ...GROUP_ONE, label: null, derivedFromTaskUid: null }, GROUP_TWO],
    }),

  // Both colours transparent. P-19 is the value that means transparent, and it
  // is not `null`, which means unchosen.
  'IV-9': () =>
    withSchedule({
      taskVisuals: [{ ...VISUAL, fillColor: 'transparent', strokeColor: 'transparent' }],
    }),

  // `finish` before `start`, both present.
  'IV-10': () =>
    withSchedule({
      tasks: [{ ...TASK_A, start: TASK_A.finish, finish: TASK_A.start }, TASK_B],
    }),

  // A fade on a task with no `finish`.
  'IV-11': () =>
    withSchedule({
      tasks: [{ ...TASK_A, finish: null, fadeInDays: 1 }, TASK_B],
    }),

  // Fades that together overshoot the span by two orders of magnitude, so that
  // no reading of "the task's span" leaves them inside it.
  'IV-12': () =>
    withSchedule({
      tasks: [{ ...TASK_A, fadeInDays: 100, fadeOutDays: 100 }, TASK_B],
    }),

  // A dual cursor (S-65) holding one of its two days.
  'IV-13': () => withSettings({ dualCursor: { date1: TASK_A.start, date2: null } }),

  // A date column outside table T-214.
  'IV-14': () => withSchedule({ tasks: [{ ...TASK_A, start: beforeAcceptedDates() }, TASK_B] }),

  // An import sequence recorded on a task that is ahead of the document's own.
  'IV-15': () =>
    withSchedule({
      taskOrigins: [{ ...ORIGIN, lastSeenImportSeq: PROJECT.importSeq + 1 }],
    }),

  // A highlight box drawn backwards in time. Table T-220's IV-19 (CR-341,
  // ledger row D-211): 「ハイライトボックスの `startDate` が `endDate` より後で
  // ないこと、および `topGroupId` が `bottomGroupId` より下でないこと」, 対象 「その
  // 4 列」, 種別 「組合せ」 -- read off the table, never typed here.
  //
  // ⭐ THE ROW NAMES TWO CONDITIONS AND THIS CASE BREAKS ONE. The other half is
  // in REVERSED below, as a probe, for the same reason IV-1 and IV-2 have
  // sweeps: a case that broke only the dates proves only the dates.
  //
  // ⚠️ THE TWO GROUP IDS ARE LEFT SOUND HERE and both name rows the document
  // holds, so IV-2 is not raised alongside; the dates are inside table T-214,
  // so IV-14 is not either. ⛔ The row's own note says a value that came from a
  // drag is not its material -- 「`FR-019` が離した時点で正規化すると定めており、
  // 正規化された値は本行を必ず満たす」 -- and 「打ち込みと取り込みから来た値には
  // 効かせること（MUST）」 is the half this seam is on: `scheduleViolations` judges
  // a document, which is where a typed or imported value has arrived.
  'IV-19': () =>
    withSchedule({
      highlightBoxes: [
        {
          ...HIGHLIGHT_BOX_ONE,
          startDate: TASK_A.finish,
          endDate: TASK_A.start,
          topGroupId: GROUP_ONE_ID,
          bottomGroupId: GROUP_TWO_ID,
        },
      ],
    }),

  // A setting whose upper bound names another setting, put above it. S-41 and
  // S-42 name each other, so the pair below breaks whichever way the bound is
  // read -- inclusive or not.
  'IV-16': () => withSettings({ thinStrokeMin: settingNumber('thinStrokeMax') + 1 }),
}

/** The case filed under one row of table T-220. @purity pure */
const breachOf = (id: string): DocumentUnderTest => {
  const build = BREACH[id]
  if (build === undefined) throw new Error(`no case breaks table T-220 row ${id}`)
  return build()
}

/** A failure message that names what came back instead. @purity pure */
const listed = (found: readonly ScheduleViolation[]): string =>
  found.length === 0 ? 'nothing' : found.map((one) => `${one.row}/${one.kind}`).join(', ')

// ---------------------------------------------------------------------------
// The three rows that are judged over a whole column of another table
// ---------------------------------------------------------------------------
//
// IV-1, IV-2 and IV-16 do not name their material: the first two point at the
// key column of table T-058 and the third at the bound columns of
// _assets/tbl-settings.md. One case each proves one column, which an answer
// that hard-codes that column also passes. These sweeps break every column the
// pointed-at table marks, and the rosters are read from it, so an answer that
// covers only what somebody thought of fails here.

/** One document that must draw one row of table T-220. */
interface Probe {
  /** The row of table T-220 the answer must hold. */
  readonly row: string
  /** What is broken, as `Entity.column` (W-7) or a settings key. */
  readonly member: string
  readonly document: () => DocumentUnderTest
}

/**
 * Primary key columns of table T-058 that this seam is never handed.
 *
 * ⛔ See the head of this file: DR-4 of table T-052 puts this array at the
 * document root and the signature takes two groups, neither of which holds it.
 * It is listed rather than dropped so that the roster below still counts.
 */
const OUT_OF_REACH: readonly string[] = ['changeLog.ordinal']

/**
 * One document per primary key column of table T-058, each holding two rows of
 * the same key in one array. Keyed the way `memberOf` spells the table's rows,
 * so the roster is checked against the table and not against itself.
 */
const REPEATED: Readonly<Record<string, () => DocumentUnderTest>> = {
  'Task.uid': () => withSchedule({ tasks: [TASK_A, TASK_B, { ...TASK_B, name: 'copy' }] }),

  'TaskGroup.id': () =>
    withSchedule({ taskGroups: [GROUP_ONE, GROUP_TWO, { ...GROUP_TWO, order: 3 }] }),

  'TaskGroupMember.taskUid': () =>
    withSchedule({ taskGroupMembers: [MEMBER_A, MEMBER_B, { ...MEMBER_B, stackOrder: 2 }] }),

  'Calendar.uid': () =>
    withSchedule({ calendars: [CALENDAR, { ...CALENDAR, ordinal: 2, isBaseCalendar: false }] }),

  // The weak entities of RL-12 and RL-13 sit inside the calendar, so the two
  // rows of the same key are put in the array that holds them.
  'WeekDay.ordinal': () =>
    withSchedule({
      calendars: [{ ...CALENDAR, weekDays: [...workedWeekDays(), ...workedWeekDays().slice(0, 1)] }],
    }),

  'Exception.ordinal': () =>
    withSchedule({
      calendars: [{ ...CALENDAR, exceptions: [EXCEPTION_ONE, { ...EXCEPTION_ONE }] }],
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

  // AT-123 says the owner and the ordinal together are what identify one of
  // these, so both rows are put under the same owner.
  'CarryElement.ordinal': () =>
    withSchedule({
      project: { ...PROJECT, carryElements: [CARRY_ONE, { ...CARRY_ONE, name: 'Other' }] },
    }),

  'BaselineTask.uid': () =>
    withSchedule({ baselineTasks: [BASELINE_ONE, { ...BASELINE_ONE, name: 'copy' }] }),
}

/**
 * One document per foreign key column of table T-058, each holding a non-null
 * value in that column that names no row of the document.
 */
const DANGLING: Readonly<Record<string, () => DocumentUnderTest>> = {
  'Project.calendarUid': () => withSchedule({ project: { ...PROJECT, calendarUid: MISSING_UID } }),

  'Task.wbsParentUid': () =>
    withSchedule({ tasks: [TASK_A, { ...TASK_B, wbsParentUid: MISSING_UID }] }),

  'Task.calendarUid': () =>
    withSchedule({ tasks: [{ ...TASK_A, calendarUid: MISSING_UID }, TASK_B] }),

  // The dependency is nested under its successor (DF-4 of table T-053), so the
  // one the sound document already carries is the one bent.
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

  'TaskGroupMember.groupId': () =>
    withSchedule({ taskGroupMembers: [MEMBER_A, { ...MEMBER_B, groupId: MISSING_GROUP_ID }] }),

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

  'CommentBox.anchorGroupId': () =>
    withSchedule({ commentBoxes: [{ ...COMMENT_BOX_ONE, anchorGroupId: MISSING_GROUP_ID }] }),

  'HighlightBox.topGroupId': () =>
    withSchedule({ highlightBoxes: [{ ...HIGHLIGHT_BOX_ONE, topGroupId: MISSING_GROUP_ID }] }),

  'HighlightBox.bottomGroupId': () =>
    withSchedule({ highlightBoxes: [{ ...HIGHLIGHT_BOX_ONE, bottomGroupId: MISSING_GROUP_ID }] }),
}

/**
 * Settings rows whose bound is one other settings key and nothing else, each
 * put on the wrong side of that key.
 *
 * ⛔ Not a sweep of the bound columns: the head of this file records what is
 * missing before one can be written. These are the rows whose bound cell holds
 * a single key, so no reading of an expression is involved -- the four pairs
 * are S-121 / S-122, S-83 / S-84, S-22 with S-6, and the S-41 / S-42 pair the
 * case in BREACH already carries.
 *
 * ⚠️ Each is moved one whole unit past the key it is bounded by, so the case
 * breaks whether the bound is read as open or as closed. If the manuscript ever
 * writes one of these bounds as exclusive, the case still breaks it.
 */
const OFF_BOUND: Readonly<Record<string, () => DocumentUnderTest>> = {
  'fontScaleSizes.S': () =>
    withSettings({ 'fontScaleSizes.S': settingNumberAt('fontScaleSizes.M') + 1 }),

  'rulerTierPxPerDayMonth': () =>
    withSettings({ rulerTierPxPerDayMonth: settingNumber('rulerTierPxPerDayWeek') + 1 }),

  'markerSize': () => withSettings({ markerSize: settingNumber('fontMin') - 1 }),
}

/**
 * The OTHER half of IV-19 -- the two group columns, put the wrong way up.
 *
 * ⭐ IV-19 states two conditions over four columns and the case in BREACH breaks
 * the date pair. This one breaks the row pair, so an answer that judged only
 * the dates -- the half a reader thinks of first -- fails here.
 *
 * ⚠️ WHICH OF TWO ROWS IS 「下」 IS THE TREE'S ORDER AND NOT A NUMBER OF THIS
 * FILE'S. GROUP_TWO is GROUP_ONE's child, so the panel draws GROUP_ONE first
 * and GROUP_TWO under it; naming GROUP_TWO as the top and GROUP_ONE as the
 * bottom is 「`topGroupId` が `bottomGroupId` より下」 exactly.
 */
const REVERSED: Readonly<Record<string, () => DocumentUnderTest>> = {
  'HighlightBox.topGroupId': () =>
    withSchedule({
      highlightBoxes: [
        {
          ...HIGHLIGHT_BOX_ONE,
          startDate: TASK_A.start,
          endDate: TASK_A.finish,
          topGroupId: GROUP_TWO_ID,
          bottomGroupId: GROUP_ONE_ID,
        },
      ],
    }),
}

/** Every probe, with the row of table T-220 each one must draw. @purity pure */
const probesOf = (
  row: string,
  built: Readonly<Record<string, () => DocumentUnderTest>>,
): readonly Probe[] =>
  Object.entries(built).map(([member, document]) => ({ row, member, document }))

const PROBES: readonly Probe[] = [
  ...probesOf('IV-1', REPEATED),
  ...probesOf('IV-2', DANGLING),
  ...probesOf('IV-16', OFF_BOUND),
  ...probesOf('IV-19', REVERSED),
]

// ---------------------------------------------------------------------------
// The walk
// ---------------------------------------------------------------------------

describe('table T-220 -- the document invariants, through scheduleViolations (PI-1)', () => {
  it('has a case for every row of the table, and no case for a row it does not have', () => {
    // ⭐ Both directions. One way alone would let a row added to T-220 pass
    // unnoticed, which is the failure Chapter 6.1's MUST NOT is written against.
    expect(Object.keys(BREACH).sort()).toEqual(INVARIANTS.map((one) => one.id).sort())
  })

  it('answers nothing for a document that breaks no row', () => {
    const found = scheduleViolations(SOUND.schedule, SOUND.settings)
    expect(found, `the sound document was reported for ${listed(found)}`).toEqual([])
  })

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
    // ⭐ Both directions again, and the same reason: IV-1 is judged over the
    // key column of that table, so a column added there has to reach this file.
    expect([...Object.keys(REPEATED), ...OUT_OF_REACH].sort()).toEqual([...PRIMARY_KEY_COLUMNS].sort())
  })

  it('breaks every foreign key column table T-058 marks, and no column it does not', () => {
    expect(Object.keys(DANGLING).sort()).toEqual([...FOREIGN_KEY_COLUMNS].sort())
  })

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
})
