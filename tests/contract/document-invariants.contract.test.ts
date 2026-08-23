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

import { describe, expect, it } from 'vitest'

import { specTable } from './spec-table'
import {
  DEFAULT_CALENDAR_VALUES,
  scheduleViolations,
  type Assignment,
  type Calendar,
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
    for (const invariant of INVARIANTS) {
      const broken = breachOf(invariant.id)
      for (const one of scheduleViolations(broken.schedule, broken.settings)) {
        expect(
          KIND_BY_ROW[one.row],
          `the case for ${invariant.id} answered ${one.row}/${one.kind}`,
        ).toBe(one.kind)
      }
    }
  })
})
