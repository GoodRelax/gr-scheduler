// Schedule -- the Delay Diagnostics report, built from the progress checks, bottlenecks, unstated parents and milestones.
// @unit      UF-184  (docs/spec/05-07-design.md, table T-075)
// @component Schedule, layer documentModel (table T-062)
// @purity    pure
// Generated region at the end: docs/spec/_source/settings.json (table T-206). Do not edit by hand; npm run gen.

import { SETTINGS_CONSTANTS } from '../document-settings/document-settings'
import {
  MINUTES_PER_CALENDAR_DAY,
  calendarDaysBetween,
  compareDays,
  dayOf,
  finishSideDayOf,
  serial,
  textOfDay,
  type CalendarDay,
} from './calendar-day'
import { planActualState, progressPointDayOf } from './plan-actual-state'
import type { Dependency, Schedule, Task } from './schedule-entities'
import { delayStart, delayWorkingDays, isDelayed } from './task-delay'
import {
  NoWorkingDayReached,
  TENTHS_OF_A_MINUTE,
  actualMinutesOf,
  instantAfterWorkingMinutes,
  instantOnSideReader,
  minutesPerWorkingDayOf,
  plannedLengthMinutesOf,
  startSideOf,
  workingMinutesBetween,
  workingSpansReader,
  type DateTimeSide,
  type InstantOnSide,
  type WorkingCalendar,
} from './working-calendar'

export type DelayMarkerRow = 'DG-1' | 'DG-2' | 'DG-3' | 'DG-4'
export type FindingKind = 'contradiction' | 'suspicion' | 'omission'
export type FindingValue = string | number | boolean | null | readonly number[]

export interface DelayFinding {
  readonly row: string
  readonly kind: FindingKind
  readonly layer: number | null
  readonly uid: number
  readonly name: string | null
  readonly values: Readonly<Record<string, FindingValue>>
  readonly proposedActualFinish: string | null
}

// see T-314, DQ-2, DQ-3, DQ-4
export interface DelayQuantities {
  readonly uid: number
  readonly name: string | null
  readonly inheritedDelayMinutes: number
  readonly selfDelayMinutes: number
  readonly pushOutMinutes: number
  readonly terminalsReached: number
}

export interface Bottleneck extends DelayQuantities {
  readonly path: readonly number[]
}

// see DX-5, BD-4
export interface TerminalPushOut {
  readonly uid: number
  readonly name: string | null
  readonly terminalDelayMinutes: number
  readonly givenTo: readonly { readonly uid: number; readonly minutes: number }[]
}

export interface AnalysisWall {
  readonly row: 'DW-1' | 'DW-2' | 'DW-3'
  readonly causeUid: number
  readonly stoppedCount: number
  readonly stoppedUids: readonly number[]
}

export interface DelayMarkerState {
  readonly uid: number
  readonly row: DelayMarkerRow
}

export interface DerivedParentTask {
  readonly uid: number
  readonly parentUid: number
}

// see DX-10, T-021b
export interface LateDays {
  readonly uid: number
  readonly row: string
  readonly days: number
}

// see T-317, FR-135
export interface DelayDiagnosticsReport {
  readonly outcome: 'diagnosed' | 'notDiagnosed'
  readonly statusDate: string | null
  readonly findings: readonly DelayFinding[]
  readonly bottlenecks: readonly Bottleneck[]
  readonly terminalPushOuts: readonly TerminalPushOut[]
  readonly walls: readonly AnalysisWall[]
  readonly unreliableCount: number
  readonly markerStates: readonly DelayMarkerState[]
  readonly settledPushOuts: readonly DelayQuantities[]
  readonly derivedParentTasks: readonly DerivedParentTask[]
  readonly lateDays: readonly LateDays[]
}

// see T-018
const FINISH_TO_FINISH = 0
const FINISH_TO_START = 1
const START_TO_FINISH = 2
const START_TO_START = 3

type ScalarColumn = {
  [K in keyof Task]: Task[K] extends string | number | boolean | null ? K : never
}[keyof Task]

// WHY: the two groups the report reads, not a Document, whose component imports this one and would close a cycle.
interface DiagnosedDocument {
  readonly schedule: Schedule
}

// WHY: lagMinutes is null for a lag whose format FR-009 does not read; VC-15 skips it, BD-2 flows it as 0.
interface Link {
  readonly predecessorUid: number
  readonly linkType: number
  readonly lagMinutes: number | null
}

interface Ends {
  readonly start: CalendarDay | null
  readonly finish: CalendarDay | null
}

interface EndOfChildren {
  readonly text: string | null
  readonly day: CalendarDay | null
}

// see FR-054
interface Instants {
  readonly start: number | null
  readonly finish: number | null
}

interface ParentDerivation {
  readonly parentUid: number | null
  readonly candidates: readonly number[]
}

interface Structure {
  readonly tasks: readonly Task[]
  readonly byUid: ReadonlyMap<number, Task>
  readonly taskGroupDepthOf: ReadonlyMap<number, number>
  readonly tasksAtDepth: ReadonlyMap<number, readonly Task[]>
  readonly derivations: ReadonlyMap<number, ParentDerivation>
  readonly parentOf: ReadonlyMap<number, number>
}

// see BD-1, BD-2, VC-15
export type WorkingTimeWalk = (from: number, minutes: number) => number

interface Facts extends Structure {
  readonly calendar: WorkingCalendar
  // see FR-054, T-350
  readonly onSide: InstantOnSide
  readonly walk: WorkingTimeWalk
  readonly minutesPerDay: number
  readonly statusDate: CalendarDay
  // WHY: the day VS-5, VO-1 and VO-2 compare by (FR-054, WT-4); the delay days still count from statusDate.
  readonly statusDayOnSide: CalendarDay
  readonly statusInstant: number
  readonly explicitChildrenOf: ReadonlyMap<number, readonly Task[]>
  readonly childrenOf: ReadonlyMap<number, readonly Task[]>
  readonly linksOf: ReadonlyMap<number, readonly Link[]>
  readonly successorsOf: ReadonlyMap<number, readonly number[]>
  readonly achievedOnOf: ReadonlyMap<number, string>
}

// see BD-1, BD-2, T-314
// WHY: instants and working minutes (FR-054); the quantities are counted in minutes, never in days.
interface Flow {
  readonly earliestStart: number
  readonly projectedFinish: number
  readonly inheritedDelayMinutes: number
  readonly selfDelayMinutes: number
  readonly drivers: readonly number[]
}

interface Walls {
  readonly walls: readonly AnalysisWall[]
  readonly unreliable: ReadonlySet<number>
  readonly cut: ReadonlySet<number>
  readonly undiagnosable: ReadonlySet<number>
}

interface PushOuts {
  readonly terminals: readonly TerminalPushOut[]
  readonly quantities: readonly DelayQuantities[]
}

/** @purity pure */
function isFinished(task: Task): boolean {
  return planActualState(task) === 'finished'
}

/** @purity pure */
function isStarted(task: Task): boolean {
  return planActualState(task) !== 'notStarted'
}

// see VC-13, VO-1, T-018
// WHY: a link binds one end of the predecessor to one end of the successor; SS and SF bind the predecessor's start.
/** @purity pure */
function hasBindingEndHappened(predecessor: Task, linkType: number): boolean {
  const bindsByStart = linkType === START_TO_START || linkType === START_TO_FINISH
  return bindsByStart ? isStarted(predecessor) : isFinished(predecessor)
}

// see VS-3, VO-1, BD-2
/** @purity pure */
function bindsSuccessorStart(linkType: number): boolean {
  return linkType === FINISH_TO_START || linkType === START_TO_START
}

/** @purity pure */
function isBefore(a: CalendarDay | null, b: CalendarDay | null): boolean {
  return a !== null && b !== null && compareDays(a, b) < 0
}

/** @purity pure */
function sameDay(a: CalendarDay | null, b: CalendarDay | null): boolean {
  if (a === null || b === null) return a === b
  return compareDays(a, b) === 0
}

// see FR-054, T-350, WT-5
// WHY: the day an instant falls on; a finish side reads the minute before, so 00:00 is the day before.
/** @purity pure */
function dayOnSide(text: string | null, side: DateTimeSide): CalendarDay | null {
  return side === 'start' ? dayOf(text) : finishSideDayOf(text)
}

// see FR-054, T-310, IP-1
/** @purity pure */
function plannedEnds(task: Task): Ends {
  return { start: dayOnSide(task.start, startSideOf(task)), finish: dayOnSide(task.finish, 'finish') }
}

/** @purity pure */
function actualEnds(task: Task): Ends {
  return { start: dayOnSide(task.actualStart, startSideOf(task)), finish: dayOnSide(task.actualFinish, 'finish') }
}

// see VC-11, VC-12, FR-054
/** @purity pure */
function extremeEnd(children: readonly Task[], endsOf: (task: Task) => Ends, side: keyof Ends,
                    column: 'start' | 'finish' | 'actualStart' | 'actualFinish', latest: boolean): EndOfChildren {
  let best: EndOfChildren = { text: null, day: null }
  for (const child of children) {
    const day = endsOf(child)[side]
    if (day === null) continue
    if (best.day === null || (latest ? compareDays(day, best.day) > 0 : compareDays(day, best.day) < 0)) {
      best = { text: child[column], day }
    }
  }
  return best
}

// see VC-15, FR-054
/** @purity pure */
function plannedInstants(facts: Facts, task: Task): Instants {
  return { start: facts.onSide(task.start, startSideOf(task)), finish: facts.onSide(task.finish, 'finish') }
}

// see VS-4, FR-054
/** @purity pure */
function actualInstants(facts: Facts, task: Task): Instants {
  return { start: facts.onSide(task.actualStart, startSideOf(task)), finish: facts.onSide(task.actualFinish, 'finish') }
}

// see VC-15, T-018
// WHY: the successor's side first, then the predecessor's, as the four formulas of VC-15 read.
/** @purity pure */
function boundSides<T>(linkType: number, predecessor: { readonly start: T; readonly finish: T },
                       successor: { readonly start: T; readonly finish: T }): readonly [T, T] | null {
  switch (linkType) {
    case FINISH_TO_START: return [successor.start, predecessor.finish]
    case START_TO_START: return [successor.start, predecessor.start]
    case FINISH_TO_FINISH: return [successor.finish, predecessor.finish]
    case START_TO_FINISH: return [successor.finish, predecessor.start]
    default: return null
  }
}

/** @purity pure */
export function extremeText(texts: readonly (string | null)[], latest: boolean): string | null {
  let best: string | null = null
  for (const text of texts) {
    const day = dayOf(text)
    if (day === null) continue
    const held = dayOf(best)
    if (held === null || (latest ? compareDays(day, held) > 0 : compareDays(day, held) < 0)) best = text
  }
  return best
}

/** @purity pure */
function groupBy<TKey, TValue>(
  values: readonly TValue[],
  keyOf: (value: TValue) => TKey | undefined,
): ReadonlyMap<TKey, readonly TValue[]> {
  const grouped = new Map<TKey, TValue[]>()
  for (const value of values) {
    const key = keyOf(value)
    if (key === undefined) continue
    const held = grouped.get(key)
    if (held === undefined) grouped.set(key, [value])
    else held.push(value)
  }
  return grouped
}

/** @purity pure */
function columnsOf(task: Task, names: readonly ScalarColumn[]): Record<string, FindingValue> {
  const values: Record<string, FindingValue> = {}
  for (const name of names) values[name] = task[name]
  return values
}

/** @purity pure */
function findingOf(row: string, task: Task, values: Record<string, FindingValue>,
                   proposedActualFinish: string | null = null): DelayFinding {
  const kind: FindingKind = row.startsWith('VC') ? 'contradiction'
    : row.startsWith('VS') ? 'suspicion' : 'omission'
  const layer = FINDING_LAYERS[row] ?? null
  return { row, kind, layer, uid: task.uid, name: task.name, values, proposedActualFinish }
}

// see IP-1, MP-1
/** @purity pure */
function taskGroupDepthByTask(schedule: Schedule): ReadonlyMap<number, number> {
  const parentOf = new Map(schedule.taskGroups.map((group) => [group.id, group.parentId]))
  const depthOf = (groupId: string): number => {
    let depth = 0
    for (let at = parentOf.get(groupId) ?? null; at !== null && depth < parentOf.size; depth += 1) {
      at = parentOf.get(at) ?? null
    }
    return depth
  }
  return new Map(schedule.taskGroupMembers.map((member) => [member.taskUid, depthOf(member.groupId)]))
}

// see IP-1
/** @purity pure */
function encloses(parent: Task, child: Task): boolean {
  const outer = plannedEnds(parent)
  const inner = plannedEnds(child)
  if (parent.milestone === true || outer.start === null || outer.finish === null) return false
  if (inner.start === null || inner.finish === null) return false
  return compareDays(outer.start, inner.start) <= 0 && compareDays(inner.finish, outer.finish) <= 0
}

// see FR-135
// WHY: a point holds no span, so a stated parent that is a milestone is read as no parent and the child is derived.
/** @purity pure */
function statedParentUidOf(task: Task, byUid: ReadonlyMap<number, Task>): number | null {
  const parent = task.parentTaskUid === null ? undefined : byUid.get(task.parentTaskUid)
  return parent?.milestone === true ? null : task.parentTaskUid
}

// see FR-135, IP-2, IP-3
/** @purity pure */
function derivedParentsOf(tasks: readonly Task[], byUid: ReadonlyMap<number, Task>, taskGroupDepthOf: ReadonlyMap<number, number>,
                          tasksAtDepth: ReadonlyMap<number, readonly Task[]>): ReadonlyMap<number, ParentDerivation> {
  const derived = new Map<number, ParentDerivation>()
  for (const task of tasks) {
    const depth = taskGroupDepthOf.get(task.uid)
    if (statedParentUidOf(task, byUid) !== null || depth === undefined) continue
    // WHY: a task on a top task group has no task group above it, so no parent is derived (PND-605, JDG-823).
    if (depth === 0) continue
    const candidates = (tasksAtDepth.get(depth - 1) ?? [])
      .filter((bar) => encloses(bar, task))
      .map((bar) => bar.uid)
    derived.set(task.uid, { parentUid: candidates.length === 1 ? (candidates[0] ?? null) : null, candidates })
  }
  return derived
}

/** @purity pure */
function parentTasksOf(tasks: readonly Task[], byUid: ReadonlyMap<number, Task>,
                      derivations: ReadonlyMap<number, ParentDerivation>): ReadonlyMap<number, number> {
  const parents = new Map<number, number>()
  for (const task of tasks) {
    const parent = statedParentUidOf(task, byUid) ?? derivations.get(task.uid)?.parentUid ?? null
    if (parent !== null && byUid.has(parent)) parents.set(task.uid, parent)
  }
  return parents
}

// see DG-3, DX-4
/** @purity pure */
function ancestorsOf(uid: number, parentOf: ReadonlyMap<number, number>): readonly number[] {
  const chain: number[] = []
  const seen = new Set([uid])
  for (let at = parentOf.get(uid); at !== undefined && !seen.has(at); at = parentOf.get(at)) {
    seen.add(at)
    chain.unshift(at)
  }
  return chain
}

// see MP-1, FR-054
/** @purity pure */
function latestMilestones(tasks: readonly Task[]): readonly Task[] {
  const milestones = tasks.filter((task) => task.milestone === true)
  const latest = extremeEnd(milestones, plannedEnds, 'finish', 'finish', true)
  return milestones.filter((task) => sameDay(plannedEnds(task).finish, latest.day))
}

// see MP-1, MP-2, MP-3
/** @purity pure */
function milestoneLinksOf(milestone: Task, taskGroupDepthOf: ReadonlyMap<number, number>,
                          tasksAtDepth: ReadonlyMap<number, readonly Task[]>,
                          parentOf: ReadonlyMap<number, number>): readonly Link[] {
  const depth = taskGroupDepthOf.get(milestone.uid)
  const due = plannedEnds(milestone).finish
  if (depth === undefined || due === null) return []
  const before = (task: Task): boolean => isBefore(plannedEnds(task).finish, due)
  const peers = (tasksAtDepth.get(depth) ?? []).filter((task) => task.uid !== milestone.uid && before(task))
  const previous = latestMilestones(peers)
  const bound = previous[0] === undefined ? null : plannedEnds(previous[0]).finish
  const afterPrevious = (task: Task): boolean => bound === null || isBefore(bound, plannedEnds(task).finish)
  const unowned = (task: Task): boolean => {
    const parent = parentOf.get(task.uid)
    return parent === undefined || taskGroupDepthOf.get(parent) !== depth
  }
  const below = (tasksAtDepth.get(depth + 1) ?? []).filter((task) => before(task) && unowned(task))
  return [...previous, ...peers.filter(afterPrevious), ...below.filter(afterPrevious)]
    .map((task) => ({ predecessorUid: task.uid, linkType: FINISH_TO_START, lagMinutes: 0 }))
}

// see VC-15, BD-2, FR-009, AT-47
// WHY: 7, 5 and 3 are the d, h and m formats FR-009 reads (mspdi_pj12.xsd LagFormat); the value is always tenths of a minute.
const READ_LAG_FORMATS: ReadonlySet<number> = new Set([7, 5, 3])

// see VC-15, BD-2, FR-009, AT-47
// TRAP: null means the format is not read, never "no lag"; a zero lag is zero whatever its format.
// WHY: rounding down never makes a bound later, so a lag with a fraction of a minute cannot raise a contradiction.
/** @purity pure */
export function lagMinutesOf(dependency: Dependency): number | null {
  const lag = dependency.lag ?? 0
  if (lag === 0) return 0
  if (dependency.lagFormat === null || !READ_LAG_FORMATS.has(dependency.lagFormat)) return null
  return Math.floor(lag / TENTHS_OF_A_MINUTE)
}

// see T-214, S-119, S-120
/** @purity pure */
function acceptedSerialOf(text: string): number {
  const day = dayOf(text)
  if (day === null) throw new Error(`table T-214: ${text} is not a day`)
  return serial(day)
}

// see T-214, S-119, S-120
const ACCEPTED_SERIALS = {
  from: acceptedSerialOf(SETTINGS_CONSTANTS.importMinDate),
  to: acceptedSerialOf(SETTINGS_CONSTANTS.importMaxDate),
}

// see BD-1, BD-2, VC-15, FR-054
// WHY: BD-1, BD-2 and the lag advance by the document calendar's working time; FR-011 counts a non-working day an end
// stands on (instantAfterWorkingMinutes), and that rule belongs to the actual length alone.
// TRAP: the calendar is indexed once per walker; built per call it would parse the calendar again for every task.
/** @purity pure */
export function workingTimeWalkOf(calendar: WorkingCalendar): WorkingTimeWalk {
  const spansOf = workingSpansReader(calendar)
  return (from, minutes) => {
    if (minutes === 0) return from
    const forward = minutes > 0
    let remaining = Math.abs(minutes)
    for (let at = Math.floor((forward ? from : from - 1) / MINUTES_PER_CALENDAR_DAY);
      at >= ACCEPTED_SERIALS.from && at <= ACCEPTED_SERIALS.to; at += forward ? 1 : -1) {
      const base = at * MINUTES_PER_CALENDAR_DAY
      for (const span of forward ? spansOf(at) : [...spansOf(at)].reverse()) {
        const lo = forward ? Math.max(span.from, from - base) : span.from
        const hi = forward ? span.to : Math.min(span.to, from - base)
        if (hi <= lo) continue
        if (hi - lo >= remaining) return base + (forward ? lo + remaining : hi - remaining)
        remaining -= hi - lo
      }
    }
    throw new NoWorkingDayReached(calendar.calendar.uid)
  }
}

// see VC-15, BD-2
/** @purity pure */
export function laggedInstant(walk: WorkingTimeWalk, at: number, lagMinutes: number): number {
  return walk(at, lagMinutes)
}

/** @purity pure */
function statedLinksOf(task: Task, byUid: ReadonlyMap<number, Task>): readonly Link[] {
  return task.dependencies
    .filter((dependency) => byUid.has(dependency.predecessorUid))
    .map((dependency) => ({
      predecessorUid: dependency.predecessorUid,
      linkType: dependency.linkType,
      lagMinutes: lagMinutesOf(dependency),
    }))
}

// see MP-4
/** @purity pure */
function achievedOn(milestone: Task, links: readonly Link[], byUid: ReadonlyMap<number, Task>): string | null {
  if (milestone.milestone !== true || milestone.actualFinish !== null || links.length === 0) return null
  const predecessors = links.map((link) => byUid.get(link.predecessorUid))
  if (!predecessors.every((task) => task !== undefined && isFinished(task))) return null
  return extremeText(predecessors.map((task) => task?.actualFinish ?? null), true)
}

/** @purity pure */
function successorMapOf(edges: readonly { readonly from: number; readonly to: number }[]): ReadonlyMap<number, readonly number[]> {
  return new Map([...groupBy(edges, (edge) => edge.from)].map(([from, held]) => [from, held.map((edge) => edge.to)]))
}

/** @purity pure */
function structureOf(schedule: Schedule): Structure {
  const tasks = schedule.tasks
  const byUid = new Map(tasks.map((task) => [task.uid, task]))
  const taskGroupDepthOf = taskGroupDepthByTask(schedule)
  const tasksAtDepth = groupBy(tasks, (task) => taskGroupDepthOf.get(task.uid))
  const derivations = derivedParentsOf(tasks, byUid, taskGroupDepthOf, tasksAtDepth)
  return { tasks, byUid, taskGroupDepthOf, tasksAtDepth, derivations, parentOf: parentTasksOf(tasks, byUid, derivations) }
}

/** @purity pure */
function factsOf(schedule: Schedule, calendar: WorkingCalendar, statusDate: CalendarDay): Facts {
  const structure = structureOf(schedule)
  const minutesPerDay = minutesPerWorkingDayOf(schedule.project)
  const onSide = instantOnSideReader(calendar)
  // WHY: the status date is a finish-side column (WT-4); one whose time cannot be read is read at the start of its day.
  const statusInstant = onSide(schedule.project.statusDate, 'finish') ?? serial(statusDate) * MINUTES_PER_CALENDAR_DAY
  const statusDayOnSide = dayOnSide(schedule.project.statusDate, 'finish') ?? statusDate
  const { tasks, byUid, taskGroupDepthOf, tasksAtDepth, parentOf } = structure
  const explicitChildrenOf = groupBy(tasks, (task) => task.parentTaskUid ?? undefined)
  const childrenOf = groupBy(tasks, (task) => parentOf.get(task.uid))
  const linksOf = new Map<number, readonly Link[]>()
  const achievedOnOf = new Map<number, string>()
  for (const task of tasks) {
    const stated = statedLinksOf(task, byUid)
    const links = task.milestone === true && task.dependencies.length === 0
      ? milestoneLinksOf(task, taskGroupDepthOf, tasksAtDepth, parentOf) : stated
    linksOf.set(task.uid, links)
    const achieved = achievedOn(task, links, byUid)
    if (achieved !== null) achievedOnOf.set(task.uid, achieved)
  }
  const successorsOf = successorMapOf(tasks.flatMap((task) => (linksOf.get(task.uid) ?? [])
    .map((link) => ({ from: link.predecessorUid, to: task.uid }))))
  const walk = workingTimeWalkOf(calendar)
  return {
    ...structure, calendar, onSide, walk, minutesPerDay, statusDate, statusDayOnSide, statusInstant,
    explicitChildrenOf, childrenOf, linksOf, successorsOf, achievedOnOf,
  }
}

// WHY: every document compares instants; the same instant never breaks a link, a minute earlier does (VC-15).
// see VC-15, VS-4, FR-009, FR-054
/** @purity pure */
function linkHolds(facts: Facts, dependency: Dependency, predecessor: Instants, successor: Instants): boolean | null {
  const sides = boundSides(dependency.linkType, predecessor, successor)
  const lagMinutes = lagMinutesOf(dependency)
  if (sides === null || sides[0] === null || sides[1] === null || lagMinutes === null) return null
  return sides[0] >= laggedInstant(facts.walk, sides[1], lagMinutes)
}

// see VC-1
/** @purity pure */
function ringMembersOf(tasks: readonly Task[], successorsOf: ReadonlyMap<number, readonly number[]>): ReadonlySet<number> {
  const indexOf = new Map<number, number>()
  const lowOf = new Map<number, number>()
  const stack: number[] = []
  const onStack = new Set<number>()
  const members = new Set<number>()
  const enter = (uid: number): void => {
    indexOf.set(uid, indexOf.size)
    lowOf.set(uid, indexOf.size - 1)
    stack.push(uid)
    onStack.add(uid)
  }
  const lower = (uid: number, to: number): void => {
    lowOf.set(uid, Math.min(lowOf.get(uid) ?? 0, to))
  }
  const close = (uid: number): void => {
    if (lowOf.get(uid) !== indexOf.get(uid)) return
    const component: number[] = []
    for (let at = stack.pop(); at !== undefined; at = at === uid ? undefined : stack.pop()) {
      onStack.delete(at)
      component.push(at)
    }
    if (component.length > 1) for (const one of component) members.add(one)
  }
  for (const root of tasks) {
    if (indexOf.has(root.uid)) continue
    enter(root.uid)
    const walk: { readonly uid: number; next: number }[] = [{ uid: root.uid, next: 0 }]
    for (let frame = walk.at(-1); frame !== undefined; frame = walk.at(-1)) {
      const to = (successorsOf.get(frame.uid) ?? []).filter((one) => one !== frame.uid)[frame.next]
      frame.next += 1
      if (to !== undefined && !indexOf.has(to)) {
        enter(to)
        walk.push({ uid: to, next: 0 })
      } else if (to !== undefined) {
        if (onStack.has(to)) lower(frame.uid, indexOf.get(to) ?? 0)
      } else {
        walk.pop()
        const parent = walk.at(-1)
        if (parent !== undefined) lower(parent.uid, lowOf.get(frame.uid) ?? 0)
        close(frame.uid)
      }
    }
  }
  return members
}

// see VC-1, VC-2, VC-3
/** @purity pure */
function dependencyShapeContradictions(facts: Facts): readonly DelayFinding[] {
  const successorsOf = successorMapOf(facts.tasks
    .flatMap((task) => task.dependencies.map((dependency) => ({ from: dependency.predecessorUid, to: task.uid }))))
  const rings = ringMembersOf(facts.tasks, successorsOf)
  const found: DelayFinding[] = []
  for (const task of facts.tasks) {
    const inRing = task.dependencies.map((one) => one.predecessorUid).filter((uid) => uid !== task.uid && rings.has(uid))
    if (rings.has(task.uid)) found.push(findingOf('VC-1', task, { predecessorUids: inRing }))
    // WHY: VC-3 counts the lines of one direction only, and they all stand in the successor's own list (JDG-1972).
    const linesFrom = (other: number): number => task.dependencies.filter((one) => one.predecessorUid === other).length
    const reported = new Set<number>()
    for (const dependency of task.dependencies) {
      const other = dependency.predecessorUid
      if (other === task.uid) found.push(findingOf('VC-2', task, { predecessorUid: other }))
      else if (!reported.has(other) && linesFrom(other) > 1) {
        reported.add(other)
        found.push(findingOf('VC-3', task, { predecessorUid: other }))
      }
    }
  }
  return found
}

// see VC-4, VC-5, VC-6, VC-7, VC-8
/** @purity pure */
function columnContradictions(task: Task): readonly DelayFinding[] {
  const found: DelayFinding[] = []
  const ends = plannedEnds(task)
  if (task.milestone === true && ends.start !== null && ends.finish !== null && !sameDay(ends.start, ends.finish)) {
    found.push(findingOf('VC-4', task, columnsOf(task, ['milestone', 'start', 'finish'])))
  }
  const progress = task.percentComplete ?? 0
  if (progress > 0 && task.actualStart === null) {
    found.push(findingOf('VC-5', task, columnsOf(task, ['percentComplete', 'actualStart'])))
  }
  if (task.actualFinish !== null && task.actualStart === null) {
    found.push(findingOf('VC-6', task, columnsOf(task, ['actualFinish', 'actualStart'])))
  }
  if (progress === 0 && task.actualStart === null && (task.stop !== null || task.resume !== null)) {
    found.push(findingOf('VC-7', task, columnsOf(task, ['percentComplete', 'actualStart', 'stop', 'resume'])))
  }
  if (task.actualFinish !== null && task.resumeValid === true) {
    found.push(findingOf('VC-8', task, columnsOf(task, ['actualFinish', 'resumeValid'])))
  }
  return found
}

// see VC-9, VC-10, VC-11, VC-12, FR-054
/** @purity pure */
function parentContradictions(parent: Task, children: readonly Task[]): readonly DelayFinding[] {
  if (children.length === 0) return []
  const found: DelayFinding[] = []
  const childUids = children.map((child) => child.uid)
  const open = children.filter((child) => !isFinished(child)).map((child) => child.uid)
  if (isFinished(parent) && open.length > 0) {
    found.push(findingOf('VC-9', parent, { ...columnsOf(parent, ['actualFinish']), childUids: open }))
  }
  if (open.length === 0 && !isFinished(parent)) {
    found.push(findingOf('VC-10', parent, { ...columnsOf(parent, ['actualFinish']), childUids }))
  }
  found.push(...plannedSpanContradictions(parent, children), ...actualSpanContradictions(parent, children, open.length === 0))
  return found
}

// see VC-11, FR-054
/** @purity pure */
function plannedSpanContradictions(parent: Task, children: readonly Task[]): readonly DelayFinding[] {
  const childStart = extremeEnd(children, plannedEnds, 'start', 'start', false)
  const childFinish = extremeEnd(children, plannedEnds, 'finish', 'finish', true)
  const planned = plannedEnds(parent)
  if (childStart.text === null && childFinish.text === null) return []
  if (sameDay(planned.start, childStart.day) && sameDay(planned.finish, childFinish.day)) return []
  return [findingOf('VC-11', parent, {
    ...columnsOf(parent, ['start', 'finish']), childStart: childStart.text, childFinish: childFinish.text,
  })]
}

// see VC-12, FR-054
/** @purity pure */
function actualSpanContradictions(parent: Task, children: readonly Task[], isEveryChildFinished: boolean): readonly DelayFinding[] {
  const childActualStart = extremeEnd(children, actualEnds, 'start', 'actualStart', false)
  const childActualFinish = isEveryChildFinished
    ? extremeEnd(children, actualEnds, 'finish', 'actualFinish', true) : { text: null, day: null }
  const actual = actualEnds(parent)
  if (sameDay(actual.start, childActualStart.day) && sameDay(actual.finish, childActualFinish.day)) return []
  return [findingOf('VC-12', parent, {
    ...columnsOf(parent, ['actualStart', 'actualFinish']),
    childActualStart: childActualStart.text, childActualFinish: childActualFinish.text,
  })]
}

// see VC-13, VC-14, VC-15
/** @purity pure */
function orderContradictions(facts: Facts, task: Task): readonly DelayFinding[] {
  const found: DelayFinding[] = []
  for (const dependency of task.dependencies) {
    const predecessor = facts.byUid.get(dependency.predecessorUid)
    if (predecessor === undefined || predecessor === task) continue
    const predecessorUid = predecessor.uid
    if (isFinished(task) && !hasBindingEndHappened(predecessor, dependency.linkType)) {
      found.push(findingOf('VC-13', task, {
        predecessorUid, linkType: dependency.linkType, predecessorActualStart: predecessor.actualStart,
        predecessorActualFinish: predecessor.actualFinish, ...columnsOf(task, ['actualFinish']),
      }))
    }
    if (linkHolds(facts, dependency, plannedInstants(facts, predecessor), plannedInstants(facts, task)) === false) {
      found.push(findingOf('VC-15', task, {
        predecessorUid, linkType: dependency.linkType, lag: dependency.lag, ...columnsOf(task, ['start', 'finish']),
        predecessorStart: predecessor.start, predecessorFinish: predecessor.finish,
      }))
    }
  }
  if (task.milestone === true && task.actualFinish !== null) {
    const open = (facts.linksOf.get(task.uid) ?? []).map((link) => facts.byUid.get(link.predecessorUid))
      .filter((one): one is Task => one !== undefined && !isFinished(one)).map((one) => one.uid)
    if (open.length > 0) found.push(findingOf('VC-14', task, { ...columnsOf(task, ['actualFinish']), predecessorUids: open }))
  }
  return found
}

// see T-310
/** @purity pure */
function contradictionsOf(facts: Facts): readonly DelayFinding[] {
  return [
    ...dependencyShapeContradictions(facts),
    ...facts.tasks.flatMap((task) => columnContradictions(task)),
    // WHY: FR-135 reads no milestone as a parent; VS-2 alone tells that pair.
    ...facts.tasks.filter((task) => task.milestone !== true)
      .flatMap((task) => parentContradictions(task, facts.explicitChildrenOf.get(task.uid) ?? [])),
    ...facts.tasks.flatMap((task) => orderContradictions(facts, task)),
  ]
}

// see VS-1, VS-3, VS-4
/** @purity pure */
function linkSuspicions(facts: Facts, task: Task): readonly DelayFinding[] {
  const found: DelayFinding[] = []
  for (const dependency of task.dependencies) {
    const predecessor = facts.byUid.get(dependency.predecessorUid)
    if (predecessor === undefined || predecessor === task) continue
    const predecessorUid = predecessor.uid
    if (predecessor.parentTaskUid === task.uid || task.parentTaskUid === predecessorUid) {
      found.push(findingOf('VS-1', task, { predecessorUid, ...columnsOf(task, ['parentTaskUid']) }))
    }
    if (bindsSuccessorStart(dependency.linkType) && !isStarted(predecessor) && isStarted(task)) {
      found.push(findingOf('VS-3', task, { predecessorUid, ...columnsOf(task, ['actualStart']) }))
    }
    if (linkHolds(facts, dependency, actualInstants(facts, predecessor), actualInstants(facts, task)) === false) {
      found.push(findingOf('VS-4', task, {
        predecessorUid, linkType: dependency.linkType, ...columnsOf(task, ['actualStart', 'actualFinish']),
        predecessorActualStart: predecessor.actualStart, predecessorActualFinish: predecessor.actualFinish,
      }))
    }
  }
  return found
}

// see VS-6
// WHY: only descendants with no child count: a middle parent's own stray point would hide its ancestor's (CR-651).
/** @purity pure */
function leafDescendantsOf(facts: Facts, parentUid: number): readonly Task[] {
  const leaves: Task[] = []
  const queued = new Set([parentUid])
  const pending: Task[] = []
  const enqueueChildrenOf = (uid: number): readonly Task[] => {
    const children = facts.explicitChildrenOf.get(uid) ?? []
    pending.push(...children.filter((child) => !queued.has(child.uid)))
    for (const child of children) queued.add(child.uid)
    return children
  }
  enqueueChildrenOf(parentUid)
  for (let task = pending.pop(); task !== undefined; task = pending.pop()) {
    if (enqueueChildrenOf(task.uid).length === 0) leaves.push(task)
  }
  return leaves
}

interface PointOfTask {
  readonly uid: number
  readonly day: CalendarDay
}

// see VS-6, T-022, FR-014, S-487
// WHY: a leaf with no vertex is read at the status date, as the progress line passes there (FR-014).
/** @purity pure */
function progressSpreadSuspicion(facts: Facts, parent: Task, toleranceDays: number): readonly DelayFinding[] {
  const children = facts.explicitChildrenOf.get(parent.uid) ?? []
  if (parent.milestone === true || children.length === 0) return []
  const parentPoint = progressPointDayOf(parent, facts.statusDate)
  if (parentPoint === null) return []
  let leftmost: PointOfTask | null = null
  let rightmost: PointOfTask | null = null
  for (const leaf of leafDescendantsOf(facts, parent.uid)) {
    const one = { uid: leaf.uid, day: progressPointDayOf(leaf, facts.statusDate) ?? facts.statusDate }
    if (leftmost === null || compareDays(one.day, leftmost.day) < 0) leftmost = one
    if (rightmost === null || compareDays(one.day, rightmost.day) > 0) rightmost = one
  }
  if (leftmost === null || rightmost === null) return []
  const left = workingMinutesBetweenDays(facts.calendar, parentPoint, leftmost.day)
  const right = workingMinutesBetweenDays(facts.calendar, rightmost.day, parentPoint)
  const tolerance = toleranceDays * facts.minutesPerDay
  if (left <= tolerance && right <= tolerance) return []
  return [findingOf('VS-6', parent, {
    parentPoint: textOfDay(parentPoint),
    leftmostPoint: textOfDay(leftmost.day),
    leftmostUid: leftmost.uid,
    rightmostPoint: textOfDay(rightmost.day),
    rightmostUid: rightmost.uid,
    outsideMinutes: Math.max(left, right),
    parentProgressToleranceDays: toleranceDays,
  })]
}

// see VS-6, T-022
// WHY: a progress point is a day (RV-1's day), so the minutes run from the start of one day to the start of the other.
/** @purity pure */
function workingMinutesBetweenDays(calendar: WorkingCalendar, from: CalendarDay, to: CalendarDay): number {
  return workingMinutesBetween(calendar, serial(from) * MINUTES_PER_CALENDAR_DAY, serial(to) * MINUTES_PER_CALENDAR_DAY)
}

// see T-311
/** @purity pure */
function suspicionsOf(facts: Facts, toleranceDays: number): readonly DelayFinding[] {
  const found: DelayFinding[] = []
  for (const task of facts.tasks) {
    found.push(...linkSuspicions(facts, task))
    const children = facts.explicitChildrenOf.get(task.uid) ?? []
    if (task.milestone === true && children.length > 0) {
      found.push(findingOf('VS-2', task, { ...columnsOf(task, ['milestone']), childUids: children.map((one) => one.uid) }))
    }
    const actualDays = [actualEnds(task).start, dayOnSide(task.stop, 'finish'), actualEnds(task).finish]
    if (actualDays.some((day) => isBefore(facts.statusDayOnSide, day))) {
      found.push(findingOf('VS-5', task, columnsOf(task, ['actualStart', 'stop', 'actualFinish'])))
    }
    found.push(...progressSpreadSuspicion(facts, task, toleranceDays))
  }
  return found
}

// see VO-1, VO-2, FR-054
/** @purity pure */
function rowOmissions(facts: Facts, task: Task): readonly DelayFinding[] {
  const found: DelayFinding[] = []
  const isStartFree = (facts.linksOf.get(task.uid) ?? []).filter((link) => bindsSuccessorStart(link.linkType))
    .every((link) => {
      const predecessor = facts.byUid.get(link.predecessorUid)
      return predecessor !== undefined && hasBindingEndHappened(predecessor, link.linkType)
    })
  const ends = plannedEnds(task)
  if (isBefore(ends.start, facts.statusDayOnSide) && task.actualStart === null && isStartFree) {
    found.push(findingOf('VO-1', task, columnsOf(task, ['start', 'actualStart'])))
  }
  if (isBefore(ends.finish, facts.statusDayOnSide) && task.actualStart !== null
    && task.actualFinish === null && task.stop === null) {
    found.push(findingOf('VO-2', task, columnsOf(task, ['finish', 'actualStart', 'actualFinish', 'stop'])))
  }
  return found
}

// see VO-3
/** @purity pure */
function successorOmissions(facts: Facts, task: Task): readonly DelayFinding[] {
  if (task.actualFinish !== null) return []
  return [...new Set(facts.successorsOf.get(task.uid) ?? [])].flatMap((successorUid) => {
    const successor = facts.byUid.get(successorUid)
    const byFinishToStart = (facts.linksOf.get(successorUid) ?? [])
      .some((one) => one.predecessorUid === task.uid && one.linkType === FINISH_TO_START)
    return successor !== undefined && byFinishToStart && isStarted(successor)
      ? [findingOf('VO-3', task, { ...columnsOf(task, ['actualFinish']), successorUid })] : []
  })
}

// see T-312
/** @purity pure */
function omissionsOf(facts: Facts): readonly DelayFinding[] {
  const found: DelayFinding[] = []
  for (const task of facts.tasks) {
    found.push(...rowOmissions(facts, task), ...successorOmissions(facts, task))
    const derivation = facts.derivations.get(task.uid)
    if (derivation !== undefined && derivation.parentUid === null) {
      found.push(findingOf('VO-4', task, { ...columnsOf(task, ['parentTaskUid']), candidateUids: derivation.candidates }))
    }
    const achieved = facts.achievedOnOf.get(task.uid)
    if (achieved !== undefined) found.push(findingOf('VO-5', task, columnsOf(task, ['actualFinish']), achieved))
  }
  return found
}

/** @purity pure */
function downstreamOf(uid: number, successorsOf: ReadonlyMap<number, readonly number[]>): readonly number[] {
  const seen = new Set([uid])
  const reached: number[] = []
  const reach = (from: number): void => {
    for (const next of successorsOf.get(from) ?? []) {
      if (seen.has(next)) continue
      seen.add(next)
      reached.push(next)
    }
  }
  reach(uid)
  for (let index = 0; index < reached.length; index += 1) reach(reached[index] ?? uid)
  return reached
}

// see T-316
/** @purity pure */
function wallsOf(facts: Facts, contradictions: readonly DelayFinding[]): Walls {
  const walls: AnalysisWall[] = []
  const unreliable = new Set<number>()
  const cut = new Set<number>()
  const undiagnosable = new Set<number>()
  const mark = (row: AnalysisWall['row'], causeUid: number, reach: readonly number[]): void => {
    const range = [causeUid, ...reach]
    for (const uid of range) unreliable.add(uid)
    walls.push({ row, causeUid, stoppedCount: range.length, stoppedUids: range })
  }
  for (const causeUid of new Set(contradictions.map((finding) => finding.uid))) {
    const reach = downstreamOf(causeUid, facts.successorsOf)
    for (const uid of [causeUid, ...reach]) cut.add(uid)
    mark('DW-1', causeUid, reach)
  }
  for (const [uid, derivation] of facts.derivations) {
    if (derivation.parentUid === null) mark('DW-2', uid, derivation.candidates)
  }
  for (const task of facts.tasks) {
    if (task.milestone !== true || (facts.linksOf.get(task.uid) ?? []).length > 0) continue
    undiagnosable.add(task.uid)
    mark('DW-3', task.uid, [])
  }
  return { walls, unreliable, cut, undiagnosable }
}

/** @purity pure */
function flowOrder(facts: Facts, nodes: ReadonlySet<number>): readonly number[] {
  const into = new Map<number, number>()
  const out = new Map<number, number[]>()
  const edge = (from: number, to: number): void => {
    if (from === to || !nodes.has(from) || !nodes.has(to)) return
    into.set(to, (into.get(to) ?? 0) + 1)
    out.set(from, [...(out.get(from) ?? []), to])
  }
  for (const uid of nodes) {
    for (const link of facts.linksOf.get(uid) ?? []) edge(link.predecessorUid, uid)
    const parent = facts.parentOf.get(uid)
    if (parent !== undefined) edge(uid, parent)
  }
  const order: number[] = []
  const ready = [...nodes].filter((uid) => (into.get(uid) ?? 0) === 0)
  for (let at = ready.shift(); at !== undefined; at = ready.shift()) {
    order.push(at)
    for (const to of out.get(at) ?? []) {
      const left = (into.get(to) ?? 0) - 1
      into.set(to, left)
      if (left === 0) ready.push(to)
    }
  }
  return order
}

// see BD-1, BD-2
/** @purity pure */
function laterInstant(a: number, b: number): number {
  return Math.max(a, b)
}

// see BD-1, BD-2
/** @purity pure */
function afterMinutes(facts: Facts, from: number, minutes: number): number {
  return facts.walk(from, minutes)
}

// see BD-2
// WHY: the predecessor's start is actualStart's once started, else its earliest start; its finish is BD-1's.
/** @purity pure */
function boundOf(facts: Facts, link: Link, flows: ReadonlyMap<number, Flow>, length: number): number | null {
  const predecessor = facts.byUid.get(link.predecessorUid)
  const flow = flows.get(link.predecessorUid)
  if (predecessor === undefined || flow === undefined) return null
  const began = isStarted(predecessor)
    ? (facts.onSide(predecessor.actualStart, startSideOf(predecessor)) ?? flow.earliestStart) : flow.earliestStart
  // WHY: BD-2 flows a lag whose format FR-009 does not read as zero; the diagnostics never count that unit.
  const lagged = (at: number): number => laggedInstant(facts.walk, at, link.lagMinutes ?? 0)
  const startFor = (last: number): number => afterMinutes(facts, last, -length)
  switch (link.linkType) {
    case FINISH_TO_START: return lagged(flow.projectedFinish)
    case START_TO_START: return lagged(began)
    case FINISH_TO_FINISH: return startFor(lagged(flow.projectedFinish))
    case START_TO_FINISH: return startFor(lagged(began))
    default: return null
  }
}

// see BD-1, FR-011
// WHY: a started task without a stop has worked at least up to the FR-011 floor (S-129 working days).
/** @purity pure */
function remainingMinutesOf(facts: Facts, task: Task, actualStart: number, length: number): number {
  const floorEnd = task.milestone === true ? actualStart
    : instantAfterWorkingMinutes(facts.calendar, actualStart, SETTINGS_CONSTANTS.actualInitialDuration * facts.minutesPerDay)
  const actualLength = actualMinutesOf(facts.calendar, actualStart, facts.onSide(task.stop, 'finish') ?? floorEnd)
  // WHY: a task that used up its planned minutes is still not finished, so at least one day (1d, FR-054) is left.
  return Math.max(facts.minutesPerDay, length - actualLength)
}

// see BD-1, PS-4
// WHY: the work up to the status date's instant is already in the actual, so the remaining minutes run from it.
/** @purity pure */
function startedFinishOf(facts: Facts, task: Task, actualStart: number, finish: number, length: number): number {
  const remaining = remainingMinutesOf(facts, task, actualStart, length)
  const projected = afterMinutes(facts, facts.statusInstant, remaining)
  const resume = planActualState(task) === 'suspendedResumePlanned' ? facts.onSide(task.resume, 'start') : null
  const resumed = resume !== null && resume > facts.statusInstant
    ? laterInstant(projected, afterMinutes(facts, resume, remaining)) : projected
  return laterInstant(finish, resumed)
}

// see BD-1, BD-2
/** @purity pure */
function projectedFinishOf(facts: Facts, task: Task, children: readonly Flow[],
                           earliestStart: number, finish: number, length: number): number {
  const childFinishes = children.map((flow) => flow.projectedFinish)
  if (childFinishes.length > 0) return childFinishes.reduce(laterInstant)
  const actualFinish = isFinished(task) ? facts.onSide(task.actualFinish, 'finish') : null
  if (actualFinish !== null) return actualFinish
  const achieved = facts.onSide(facts.achievedOnOf.get(task.uid) ?? null, 'finish')
  if (achieved !== null) return achieved
  const actualStart = facts.onSide(task.actualStart, startSideOf(task))
  if (actualStart !== null) return startedFinishOf(facts, task, actualStart, finish, length)
  // WHY: a task not started may start on the status date's own day (00:00), whose work is not in any actual yet.
  const statusDayStart = serial(facts.statusDate) * MINUTES_PER_CALENDAR_DAY
  return afterMinutes(facts, laterInstant(earliestStart, statusDayStart), length)
}

interface Bound {
  readonly link: Link
  readonly uid: number
  readonly at: number | null
}

// see BD-2
// WHY: a task that started was not held by an FS or SS bound later than its start; that wait is its own.
/** @purity pure */
function holdingBoundsOf(facts: Facts, task: Task, flows: ReadonlyMap<number, Flow>, length: number): readonly Bound[] {
  const actualStart = facts.onSide(task.actualStart, startSideOf(task))
  const isHeldBy = (bound: Bound): boolean =>
    actualStart === null || !bindsSuccessorStart(bound.link.linkType) || bound.at === null || actualStart >= bound.at
  return (facts.linksOf.get(task.uid) ?? [])
    .map((link) => ({ link, uid: link.predecessorUid, at: boundOf(facts, link, flows, length) }))
    .filter(isHeldBy)
}

// see BD-2, BD-3, T-314
/** @purity pure */
function flowOf(facts: Facts, task: Task, flows: ReadonlyMap<number, Flow>): Flow | null {
  const { start, finish } = plannedInstants(facts, task)
  const length = plannedLengthMinutesOf(facts.calendar, task)
  if (start === null || finish === null || length === null) return null
  const bounds = holdingBoundsOf(facts, task, flows, length)
  // WHY: a task not started is not pushed to the status date here; BD-1 counts that wait as its own delay.
  let earliestStart = start
  for (const bound of bounds) if (bound.at !== null) earliestStart = laterInstant(earliestStart, bound.at)
  const drivers = earliestStart > start ? bounds.filter((bound) => bound.at === earliestStart).map((bound) => bound.uid) : []
  const children = facts.childrenOf.get(task.uid) ?? []
  const childFlows = children.map((child) => flows.get(child.uid)).filter((flow): flow is Flow => flow !== undefined)
  const projectedFinish = projectedFinishOf(facts, task, childFlows, earliestStart, finish, length)
  const expected = afterMinutes(facts, earliestStart, length)
  return {
    earliestStart,
    projectedFinish,
    inheritedDelayMinutes: workingMinutesBetween(facts.calendar, start, earliestStart),
    selfDelayMinutes: children.length > 0 ? 0 : Math.max(0, workingMinutesBetween(facts.calendar, expected, projectedFinish)),
    drivers,
  }
}

/** @purity pure */
function flowsOf(facts: Facts, cut: ReadonlySet<number>): ReadonlyMap<number, Flow> {
  const nodes = new Set(facts.tasks.filter((task) => !cut.has(task.uid)).map((task) => task.uid))
  const flows = new Map<number, Flow>()
  for (const uid of flowOrder(facts, nodes)) {
    const task = facts.byUid.get(uid)
    const flow = task === undefined ? null : flowOf(facts, task, flows)
    if (flow !== null) flows.set(uid, flow)
  }
  return flows
}

// see BD-4
/** @purity pure */
function spreadFrom(terminalUid: number, delay: number, flows: ReadonlyMap<number, Flow>): ReadonlyMap<number, number> {
  const given = new Map<number, number>()
  const pending = [{ uid: terminalUid, left: delay }]
  for (let at = pending.pop(); at !== undefined; at = pending.pop()) {
    const flow = flows.get(at.uid)
    if (at.left <= 0 || given.has(at.uid) || flow === undefined) continue
    const share = Math.min(flow.selfDelayMinutes, at.left)
    given.set(at.uid, share)
    for (const driver of flow.drivers) pending.push({ uid: driver, left: at.left - share })
  }
  return given
}

// see BD-4, DQ-4, DX-5
/** @purity pure */
function pushOutsOf(facts: Facts, flows: ReadonlyMap<number, Flow>, undiagnosable: ReadonlySet<number>): PushOuts {
  const terminals: TerminalPushOut[] = []
  const totals = new Map<number, { minutes: number; reached: number }>()
  for (const task of facts.tasks) {
    const flow = flows.get(task.uid)
    const finish = facts.onSide(task.finish, 'finish')
    const isTerminal = task.milestone === true || (facts.successorsOf.get(task.uid) ?? []).length === 0
    if (flow === undefined || finish === null || undiagnosable.has(task.uid) || !isTerminal) continue
    const delay = Math.max(0, workingMinutesBetween(facts.calendar, finish, flow.projectedFinish))
    const givenTo = [...spreadFrom(task.uid, delay, flows)]
      .filter(([, minutes]) => minutes > 0).map(([uid, minutes]) => ({ uid, minutes }))
    for (const share of givenTo) {
      const held = totals.get(share.uid) ?? { minutes: 0, reached: 0 }
      totals.set(share.uid, { minutes: held.minutes + share.minutes, reached: held.reached + 1 })
    }
    terminals.push({ uid: task.uid, name: task.name, terminalDelayMinutes: delay, givenTo })
  }
  const quantities = facts.tasks.flatMap((task) => {
    const flow = flows.get(task.uid)
    if (flow === undefined || undiagnosable.has(task.uid)) return []
    const total = totals.get(task.uid) ?? { minutes: 0, reached: 0 }
    return [{
      uid: task.uid, name: task.name, inheritedDelayMinutes: flow.inheritedDelayMinutes, selfDelayMinutes: flow.selfDelayMinutes,
      pushOutMinutes: total.minutes, terminalsReached: total.reached,
    }]
  })
  return { terminals, quantities }
}

// see T-315
/** @purity pure */
function markerStatesOf(facts: Facts, unreliable: ReadonlySet<number>, bottlenecks: readonly Bottleneck[]): readonly DelayMarkerState[] {
  const red = new Set(bottlenecks.map((one) => one.uid))
  const pink = new Set(bottlenecks.flatMap((one) => one.path))
  return facts.tasks.flatMap((task): DelayMarkerState[] => {
    const row: DelayMarkerRow | null = unreliable.has(task.uid) ? 'DG-1'
      : red.has(task.uid) ? 'DG-2'
        : pink.has(task.uid) ? 'DG-3'
          : isDelayed(task, facts.statusDate) ? 'DG-4' : null
    return row === null ? [] : [{ uid: task.uid, row }]
  })
}

// see VO-3, VO-5, VS-6, DG-1
// WHY: the tasks these rows name are DG-1 but no wall; the doubt reaches only one recorded date, so the flow goes on.
/** @purity pure */
function uidsWith(findings: readonly DelayFinding[], row: 'VO-3' | 'VO-5' | 'VS-6'): ReadonlySet<number> {
  return new Set(findings.filter((one) => one.row === row).map((one) => one.uid))
}

/** @purity pure */
function emptyReport(statusDate: string | null): DelayDiagnosticsReport {
  return {
    outcome: 'notDiagnosed', statusDate, findings: [], bottlenecks: [], terminalPushOuts: [], walls: [],
    unreliableCount: 0, markerStates: [], settledPushOuts: [], derivedParentTasks: [], lateDays: [],
  }
}

// see DX-10, PM-4, T-021b
/** @purity pure */
function lateDaysOf(facts: Facts): readonly LateDays[] {
  return facts.tasks.flatMap((task): LateDays[] => {
    const start = delayStart(task)
    if (start === null || !isDelayed(task, facts.statusDate)) return []
    return [{ uid: task.uid, row: start.row, days: delayWorkingDays(facts.calendar, task, facts.statusDate) }]
  })
}

// see DG-2, DX-9, S-397, TX-8
// WHY: S-397 counts working days, and TX-8 shows a push-out rounded up to whole days (30 minutes is 1d),
// so a push-out counts against S-397 as the days it is shown with; any minute that pushes is at least 1d.
/** @purity pure */
function pushOutWorkingDaysOf(quantities: DelayQuantities, minutesPerDay: number): number {
  return Math.ceil(quantities.pushOutMinutes / minutesPerDay)
}

// see FR-130, FR-131, FR-132, FR-133, FR-134
/** @purity pure */
export function diagnoseDelay(document: DiagnosedDocument, calendar: WorkingCalendar,
                              bottleneckMinPushOutDays = NOT_STORED_BOTTLENECK_THRESHOLD['S-397']): DelayDiagnosticsReport {
  const project = document.schedule.project
  const statusDate = dayOf(project.statusDate)
  if (statusDate === null) return emptyReport(project.statusDate)
  const facts = factsOf(document.schedule, calendar, statusDate)
  const contradictions = contradictionsOf(facts)
  const { walls, unreliable, cut, undiagnosable } = wallsOf(facts, contradictions)
  const flows = flowsOf(facts, cut)
  const { terminals, quantities } = pushOutsOf(facts, flows, undiagnosable)
  const pushing = quantities.filter((one) => pushOutWorkingDaysOf(one, facts.minutesPerDay) >= bottleneckMinPushOutDays)
  const isOpen = (uid: number): boolean => {
    const task = facts.byUid.get(uid)
    return task !== undefined && !isFinished(task)
  }
  const omissions = omissionsOf(facts)
  const suspicions = suspicionsOf(facts, project.parentProgressToleranceDays)
  const omittedFinishUids = uidsWith(omissions, 'VO-3')
  // see DG-1, VS-6
  const doubted = new Set([
    ...unreliable, ...omittedFinishUids, ...uidsWith(omissions, 'VO-5'), ...uidsWith(suspicions, 'VS-6'),
  ])
  // see VO-3, DG-2
  const bottlenecks = pushing.filter((one) => isOpen(one.uid) && !omittedFinishUids.has(one.uid))
    .map((one) => ({ ...one, path: ancestorsOf(one.uid, facts.parentOf) }))
  return {
    outcome: 'diagnosed',
    statusDate: project.statusDate,
    findings: [...contradictions, ...suspicions, ...omissions],
    bottlenecks,
    terminalPushOuts: terminals,
    walls,
    unreliableCount: facts.tasks.filter((task) => doubted.has(task.uid)).length,
    markerStates: markerStatesOf(facts, doubted, bottlenecks),
    settledPushOuts: pushing.filter((one) => !isOpen(one.uid)),
    derivedParentTasks: [...facts.derivations]
      .flatMap(([uid, one]) => (one.parentUid === null ? [] : [{ uid, parentUid: one.parentUid }])),
    lateDays: lateDaysOf(facts),
  }
}

/** @purity pure */
function nearestEndDays(bar: Task, child: Task): number {
  const outer = plannedEnds(bar)
  const inner = plannedEnds(child)
  const gaps = [[inner.start, outer.finish], [inner.finish, outer.start]]
    .flatMap(([a, b]) => (a === null || a === undefined || b === null || b === undefined
      ? [] : [Math.abs(calendarDaysBetween(a, b))]))
  return gaps.length === 0 ? Number.POSITIVE_INFINITY : Math.min(...gaps)
}

// see IP-4
/** @purity pure */
export function parentCandidatesOf(document: DiagnosedDocument, taskUid: number): readonly number[] {
  const { byUid, taskGroupDepthOf, tasksAtDepth, parentOf } = structureOf(document.schedule)
  const child = byUid.get(taskUid)
  const depth = taskGroupDepthOf.get(taskUid)
  if (child === undefined || depth === undefined || depth === 0) return []
  const bars = (tasksAtDepth.get(depth - 1) ?? []).filter((bar) => bar.milestone !== true
    && plannedEnds(bar).start !== null && plannedEnds(bar).finish !== null
    && !ancestorsOf(bar.uid, parentOf).includes(taskUid))
  const overlaps = (bar: Task): boolean => {
    const outer = plannedEnds(bar)
    const inner = plannedEnds(child)
    return !isBefore(inner.finish, outer.start) && !isBefore(outer.finish, inner.start)
  }
  const rankOf = (bar: Task): number => (encloses(bar, child) ? 0 : overlaps(bar) ? 1 : 2)
  return bars
    .map((bar, order) => ({ bar, order, rank: rankOf(bar), near: nearestEndDays(bar, child) }))
    .sort((a, b) => a.rank - b.rank || (a.rank === 2 ? a.near - b.near : 0) || a.order - b.order)
    .map((one) => one.bar.uid)
}

// see FR-135, IP-2, IP-4, IP-5, VO-4
export type ParentTaskResolution =
  | { readonly kind: 'stated'; readonly parentUid: number }
  | { readonly kind: 'derived'; readonly parentUid: number }
  // WHY: enclosing is the IP-1 count (0 or 2 and up), the reason no parent is decided; candidates is IP-4's whole order.
  | { readonly kind: 'undecided'; readonly candidates: readonly number[]; readonly enclosing: number }
  | { readonly kind: 'root' }

// see FR-135, IP-2, IP-4, IP-5, VO-4
// WHY: read off the same derivation the report uses, so the arrows and the diagnosis never disagree on a parent.
// WHY: onlyTaskUid answers one Task (PTL-15), so a panel showing one child does not order every undecided child's candidates.
/** @purity pure */
export function parentTaskResolutionsOf(document: DiagnosedDocument, onlyTaskUid?: number): ReadonlyMap<number, ParentTaskResolution> {
  const { tasks, byUid, taskGroupDepthOf, derivations } = structureOf(document.schedule)
  const resolutions = new Map<number, ParentTaskResolution>()
  for (const task of onlyTaskUid === undefined ? tasks : tasks.filter((one) => one.uid === onlyTaskUid)) {
    // WHY: FR-135 reads a stated milestone parent as no parent, so that child falls through to the derivation.
    const statedUid = statedParentUidOf(task, byUid)
    if (statedUid !== null) {
      if (byUid.has(statedUid)) resolutions.set(task.uid, { kind: 'stated', parentUid: statedUid })
      continue
    }
    const derivation = derivations.get(task.uid)
    if (derivation === undefined) {
      if (taskGroupDepthOf.get(task.uid) === 0) resolutions.set(task.uid, { kind: 'root' })
      continue
    }
    resolutions.set(task.uid, derivation.parentUid === null
      ? { kind: 'undecided', candidates: parentCandidatesOf(document, task.uid), enclosing: derivation.candidates.length }
      : { kind: 'derived', parentUid: derivation.parentUid })
  }
  return resolutions
}

// <generated -- do not edit by hand>
// Single source of truth:
//   docs/spec/_source/settings.json (table T-206)
//   docs/spec/01-04-requirements.md (tables T-310, T-311)
// Rebuild: npm run gen   ||   npm run gen:check fails on drift.
// see T-206
const NOT_STORED_BOTTLENECK_THRESHOLD: {
  readonly 'S-397': number
} = {
  'S-397': 1,
}

// see T-310, T-311, DX-3
const FINDING_LAYERS: Readonly<Record<string, number>> = {
  'VC-1': 1,
  'VC-2': 1,
  'VC-3': 1,
  'VC-4': 2,
  'VC-5': 3,
  'VC-6': 3,
  'VC-7': 3,
  'VC-8': 3,
  'VC-9': 4,
  'VC-10': 4,
  'VC-11': 4,
  'VC-12': 4,
  'VC-13': 5,
  'VC-14': 5,
  'VC-15': 5,
  'VS-1': 1,
  'VS-2': 2,
  'VS-3': 5,
  'VS-4': 5,
  'VS-5': 6,
  'VS-6': 4,
}
// </generated>
