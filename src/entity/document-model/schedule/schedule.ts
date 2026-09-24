// Schedule: public entry; task delay, stored colours and the document invariants.
// @unit      UF-1   (docs/spec/05-07-design.md, table T-075)
// @component Schedule, layer documentModel (table T-062)
// @purity    pure
// @publishes table T-064 row PI-1

import {
  SETTINGS_BOUNDS,
  type DocumentSettings,
  type SettingsBoundToken,
} from '../document-settings/document-settings'
import {
  COLUMN_SHAPES,
  DATE_COLUMNS,
  ENTITY_ROWS,
  type EntityRows,
  type Schedule,
  type Task,
  type TaskGroup,
} from './schedule-entities'
import { planActualState } from './plan-actual-state'
import {
  compareDays,
  dayOf,
  serial,
  type CalendarDay,
} from './calendar-day'
import {
  actualLastDay,
  actualLengthOf,
  workingCalendarOf,
  workingDaysBetween,
  type WorkingCalendar,
} from './working-calendar'

export {
  COLUMN_DEFAULTS,
  COLUMN_SHAPES,
  DATE_COLUMNS,
  DEFAULT_CALENDAR_VALUES,
} from './schedule-entities'
export type {
  Assignment,
  BaselineTask,
  Calendar,
  CarryElement,
  ColumnShape,
  CommentBox,
  Dependency,
  EntityRows,
  Exception,
  ForeignKeyColumn,
  HighlightBox,
  NestedRows,
  Project,
  Resource,
  Schedule,
  Task,
  TaskGroup,
  TaskGroupMember,
  TaskOrigin,
  TaskVisual,
  WeekDay,
} from './schedule-entities'
export { planActualState } from './plan-actual-state'
export type { PlanActualState } from './plan-actual-state'
export {
  calendarDaysBetween,
  calendarSpanOf,
  compareDays,
  dayOf,
  textOfDay,
} from './calendar-day'
export type { CalendarDay, CalendarSpan } from './calendar-day'
export {
  actualLastDay,
  actualLengthOf,
  dateFromWorkingDays,
  DaySpanTooWide,
  isWorkingDay,
  lastDayForLength,
  nextWorkingDay,
  NoWorkingDayReached,
  workingCalendarOf,
  workingDaysBetween,
} from './working-calendar'
export type { WorkingCalendar } from './working-calendar'

/** @purity pure */
export function taskByUid(schedule: Schedule, uid: number): Task | null {
  return schedule.tasks.find((task) => task.uid === uid) ?? null
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

// see CV-2
export interface CustomColour {
  readonly light: string | null
  readonly dark: string | null
}

const SIDE_HEX = /^#[0-9a-fA-F]{6}$/

const CUSTOM_SIDES_CUT = '/'

// see CV-1, T-294
const PALETTE_SPELLINGS: readonly string[] = COLUMN_SHAPES.TaskVisual['fillColor']?.choices ?? []

// see CV-2
/** @purity pure */
export function customColourOf(stored: string): CustomColour | null {
  const sides = stored.split(CUSTOM_SIDES_CUT)
  if (sides.length !== 2) return null
  const [light = '', dark = ''] = sides
  if (light === '' && dark === '') return null
  if ((light !== '' && !SIDE_HEX.test(light)) || (dark !== '' && !SIDE_HEX.test(dark))) return null
  return {
    light: light === '' ? null : light.toLowerCase(),
    dark: dark === '' ? null : dark.toLowerCase(),
  }
}

// see CV-3
/** @purity pure */
export function customSideOf(colour: CustomColour, dark: boolean): string {
  const drawn = dark ? (colour.dark ?? colour.light) : (colour.light ?? colour.dark)
  return drawn ?? ''
}

// see CV-1, CV-2, FR-019
/** @purity pure */
export function isStoredColour(text: string, allowsTransparent: boolean): boolean {
  if (PALETTE_SPELLINGS.includes(text)) return allowsTransparent || text !== TRANSPARENT
  return customColourOf(text) !== null
}

// see CV-4
// WHY: null when chosen is not one #rrggbb, i.e. not a pick from the custom entrance.
/** @purity pure */
export function customColourChosen(previous: string | null, chosen: string, dark: boolean): string | null {
  if (!SIDE_HEX.test(chosen)) return null
  const kept = previous === null ? null : customColourOf(previous)
  const hex = chosen.toLowerCase()
  const light = dark ? (kept?.light ?? null) : hex
  const darkSide = dark ? hex : (kept?.dark ?? null)
  return `${light ?? ''}${CUSTOM_SIDES_CUT}${darkSide ?? ''}`
}

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
  {
    row: 'IV-21',
    kind: 'combination',
    /** @purity pure */
    find: ({ schedule }) => {
      const found: Breach[] = []
      const within = workingCalendarOf(schedule)
      for (const [index, task] of schedule.tasks.entries()) {
        const start = dayOf(task.actualStart)
        const last = actualLastDay(task)
        if (start === null || last === null || compareDays(last, start) >= 0) continue
        const length = actualLengthOf(within, start, last)
        if (length < 0) {
          found.push({
            at: `/schedule/tasks/${index}`,
            what: `Task uid ${task.uid} has an actual of ${length} worked days, ending before it starts`,
          })
        }
      }
      return found
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
