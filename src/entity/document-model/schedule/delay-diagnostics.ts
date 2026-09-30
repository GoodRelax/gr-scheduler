// Schedule -- the Delay Diagnostics report, built from the progress checks, bottlenecks, unstated parents and milestones.
// @unit      UF-184  (docs/spec/05-07-design.md, table T-075)
// @component Schedule, layer documentModel (table T-062)
// @purity    pure

import { calendarDaysBetween, compareDays, dayOf, type CalendarDay } from './calendar-day'
import { planActualState } from './plan-actual-state'
import type { Schedule, Task } from './schedule-entities'
import { isDelayed } from './task-delay'
import {
  actualLengthOf,
  dateFromWorkingDays,
  lastDayForLength,
  nextWorkingDay,
  workingDaysBetween,
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

export interface DelayQuantities {
  readonly uid: number
  readonly name: string | null
  readonly inheritedDelayDays: number
  readonly selfDelayDays: number
  readonly pushOutDays: number
  readonly terminalsReached: number
}

export interface Bottleneck extends DelayQuantities {
  readonly path: readonly number[]
}

export interface TerminalPushOut {
  readonly uid: number
  readonly name: string | null
  readonly terminalDelayDays: number
  readonly givenTo: readonly { readonly uid: number; readonly days: number }[]
}

export interface AnalysisWall {
  readonly row: 'DW-1' | 'DW-2' | 'DW-3'
  readonly causeUid: number
  readonly stoppedCount: number
}

export interface DelayMarkerState {
  readonly uid: number
  readonly row: DelayMarkerRow
}

export interface DerivedWbsParent {
  readonly uid: number
  readonly parentUid: number
}

// see T-317, FR-135
export interface DelayDiagnosticsReport {
  readonly outcome: 'diagnosed' | 'notDiagnosed'
  readonly statusDate: string | null
  readonly findings: readonly DelayFinding[]
  readonly bottlenecks: readonly Bottleneck[]
  readonly terminalPushOuts: readonly TerminalPushOut[]
  readonly walls: readonly AnalysisWall[]
  readonly unanalysedCount: number
  readonly markerStates: readonly DelayMarkerState[]
  readonly settledPushOuts: readonly DelayQuantities[]
  readonly derivedWbsParents: readonly DerivedWbsParent[]
}

// TRAP: a hand copy of S-397; the generator prints that row only into the adapter, so change both together.
const BOTTLENECK_MIN_PUSH_OUT_DAYS = 1

// see T-018
const FINISH_TO_FINISH = 0
const FINISH_TO_START = 1
const START_TO_FINISH = 2
const START_TO_START = 3

// see T-310, T-311
const FINDING_LAYERS: Readonly<Record<string, number>> = {
  'VC-1': 1, 'VC-2': 1, 'VC-3': 1, 'VC-4': 2, 'VC-5': 3, 'VC-6': 3, 'VC-7': 3, 'VC-8': 3,
  'VC-9': 4, 'VC-10': 4, 'VC-11': 4, 'VC-12': 4, 'VC-13': 5, 'VC-14': 5, 'VC-15': 5,
  'VS-1': 1, 'VS-2': 2, 'VS-3': 5, 'VS-4': 5, 'VS-5': 6,
}

type ScalarColumn = {
  [K in keyof Task]: Task[K] extends string | number | boolean | null ? K : never
}[keyof Task]

// WHY: the two groups the report reads, not a Document, whose component imports this one and would close a cycle.
interface DiagnosedDocument {
  readonly schedule: Schedule
}

interface Link {
  readonly predecessorUid: number
  readonly linkType: number
}

interface Ends {
  readonly start: CalendarDay | null
  readonly finish: CalendarDay | null
}

interface ParentDerivation {
  readonly parentUid: number | null
  readonly candidates: readonly number[]
}

interface Structure {
  readonly tasks: readonly Task[]
  readonly byUid: ReadonlyMap<number, Task>
  readonly rowDepthOf: ReadonlyMap<number, number>
  readonly tasksAtDepth: ReadonlyMap<number, readonly Task[]>
  readonly derivations: ReadonlyMap<number, ParentDerivation>
  readonly parentOf: ReadonlyMap<number, number>
}

interface Facts extends Structure {
  readonly calendar: WorkingCalendar
  readonly statusDate: CalendarDay
  readonly explicitChildrenOf: ReadonlyMap<number, readonly Task[]>
  readonly childrenOf: ReadonlyMap<number, readonly Task[]>
  readonly linksOf: ReadonlyMap<number, readonly Link[]>
  readonly successorsOf: ReadonlyMap<number, readonly number[]>
  readonly achievedOnOf: ReadonlyMap<number, string>
}

interface Flow {
  readonly earliestStart: CalendarDay
  readonly projectedFinish: CalendarDay
  readonly inheritedDelayDays: number
  readonly selfDelayDays: number
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

/** @purity pure */
function laterOf(a: CalendarDay, b: CalendarDay): CalendarDay {
  return compareDays(a, b) >= 0 ? a : b
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

/** @purity pure */
function plannedEnds(task: Task): Ends {
  return { start: dayOf(task.start), finish: dayOf(task.finish) }
}

/** @purity pure */
function actualEnds(task: Task): Ends {
  return { start: dayOf(task.actualStart), finish: dayOf(task.actualFinish) }
}

/** @purity pure */
function extremeText(texts: readonly (string | null)[], latest: boolean): string | null {
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
function rowDepthByTask(schedule: Schedule): ReadonlyMap<number, number> {
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

// see FR-135, IP-2, IP-3
/** @purity pure */
function derivedParentsOf(tasks: readonly Task[], rowDepthOf: ReadonlyMap<number, number>,
                          tasksAtDepth: ReadonlyMap<number, readonly Task[]>): ReadonlyMap<number, ParentDerivation> {
  const derived = new Map<number, ParentDerivation>()
  for (const task of tasks) {
    const depth = rowDepthOf.get(task.uid)
    if (task.wbsParentUid !== null || depth === undefined) continue
    // STOP: spec does not decide whether a task on a top row, with no row above it, needs a parent.
    // Looked in IP-1, IP-3, VO-4, DW-2
    // @provisional PND-605
    if (depth === 0) continue
    const candidates = (tasksAtDepth.get(depth - 1) ?? [])
      .filter((bar) => encloses(bar, task))
      .map((bar) => bar.uid)
    derived.set(task.uid, { parentUid: candidates.length === 1 ? (candidates[0] ?? null) : null, candidates })
  }
  return derived
}

/** @purity pure */
function wbsParentsOf(tasks: readonly Task[], byUid: ReadonlyMap<number, Task>,
                      derivations: ReadonlyMap<number, ParentDerivation>): ReadonlyMap<number, number> {
  const parents = new Map<number, number>()
  for (const task of tasks) {
    const parent = task.wbsParentUid ?? derivations.get(task.uid)?.parentUid ?? null
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

/** @purity pure */
function latestMilestones(tasks: readonly Task[]): readonly Task[] {
  const milestones = tasks.filter((task) => task.milestone === true)
  const latest = extremeText(milestones.map((task) => task.finish), true)
  return milestones.filter((task) => sameDay(dayOf(task.finish), dayOf(latest)))
}

// see MP-1, MP-2, MP-3
/** @purity pure */
function milestoneLinksOf(milestone: Task, rowDepthOf: ReadonlyMap<number, number>,
                          tasksAtDepth: ReadonlyMap<number, readonly Task[]>,
                          parentOf: ReadonlyMap<number, number>): readonly Link[] {
  const depth = rowDepthOf.get(milestone.uid)
  const due = dayOf(milestone.finish)
  if (depth === undefined || due === null) return []
  const before = (task: Task): boolean => isBefore(dayOf(task.finish), due)
  const peers = (tasksAtDepth.get(depth) ?? []).filter((task) => task.uid !== milestone.uid && before(task))
  const previous = latestMilestones(peers)
  const bound = previous[0] === undefined ? null : dayOf(previous[0].finish)
  const afterPrevious = (task: Task): boolean => bound === null || isBefore(bound, dayOf(task.finish))
  const unowned = (task: Task): boolean => {
    const parent = parentOf.get(task.uid)
    return parent === undefined || rowDepthOf.get(parent) !== depth
  }
  const below = (tasksAtDepth.get(depth + 1) ?? []).filter((task) => before(task) && unowned(task))
  return [...previous, ...peers.filter(afterPrevious), ...below.filter(afterPrevious)]
    .map((task) => ({ predecessorUid: task.uid, linkType: FINISH_TO_START }))
}

// STOP: spec does not decide the unit of Dependency.lag, which follows lagFormat; every link is read with no lag.
// Looked in AT-47, AT-48, VC-15, BD-2, T-213
// @provisional PND-606
/** @purity pure */
function statedLinksOf(task: Task, byUid: ReadonlyMap<number, Task>): readonly Link[] {
  return task.dependencies
    .filter((dependency) => byUid.has(dependency.predecessorUid))
    .map((dependency) => ({ predecessorUid: dependency.predecessorUid, linkType: dependency.linkType }))
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
  const rowDepthOf = rowDepthByTask(schedule)
  const tasksAtDepth = groupBy(tasks, (task) => rowDepthOf.get(task.uid))
  const derivations = derivedParentsOf(tasks, rowDepthOf, tasksAtDepth)
  return { tasks, byUid, rowDepthOf, tasksAtDepth, derivations, parentOf: wbsParentsOf(tasks, byUid, derivations) }
}

/** @purity pure */
function factsOf(schedule: Schedule, calendar: WorkingCalendar, statusDate: CalendarDay): Facts {
  const structure = structureOf(schedule)
  const { tasks, byUid, rowDepthOf, tasksAtDepth, parentOf } = structure
  const explicitChildrenOf = groupBy(tasks, (task) => task.wbsParentUid ?? undefined)
  const childrenOf = groupBy(tasks, (task) => parentOf.get(task.uid))
  const linksOf = new Map<number, readonly Link[]>()
  const achievedOnOf = new Map<number, string>()
  for (const task of tasks) {
    const stated = statedLinksOf(task, byUid)
    const links = task.milestone === true && task.dependencies.length === 0
      ? milestoneLinksOf(task, rowDepthOf, tasksAtDepth, parentOf) : stated
    linksOf.set(task.uid, links)
    const achieved = achievedOn(task, links, byUid)
    if (achieved !== null) achievedOnOf.set(task.uid, achieved)
  }
  const successorsOf = successorMapOf(tasks.flatMap((task) => (linksOf.get(task.uid) ?? [])
    .map((link) => ({ from: link.predecessorUid, to: task.uid }))))
  return { ...structure, calendar, statusDate, explicitChildrenOf, childrenOf, linksOf, successorsOf, achievedOnOf }
}

// WHY: a start opens its day and a finish closes it (ND-3), so FS needs the next day and SF allows the day before.
// see VC-15, VS-4
/** @purity pure */
function linkHolds(linkType: number, predecessor: Ends, successor: Ends): boolean | null {
  const [later, earlier, least] = linkType === FINISH_TO_START ? [successor.start, predecessor.finish, 1]
    : linkType === START_TO_START ? [successor.start, predecessor.start, 0]
      : linkType === FINISH_TO_FINISH ? [successor.finish, predecessor.finish, 0]
        : linkType === START_TO_FINISH ? [successor.finish, predecessor.start, -1] : [null, null, 0]
  if (later === null || earlier === null) return null
  return calendarDaysBetween(earlier, later) >= least
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
  const pairCount = new Map<string, number>()
  const pairOf = (a: number, b: number): string => `${Math.min(a, b)}:${Math.max(a, b)}`
  for (const task of facts.tasks) {
    for (const dependency of task.dependencies) {
      const key = pairOf(dependency.predecessorUid, task.uid)
      pairCount.set(key, (pairCount.get(key) ?? 0) + 1)
    }
  }
  const found: DelayFinding[] = []
  for (const task of facts.tasks) {
    const inRing = task.dependencies.map((one) => one.predecessorUid).filter((uid) => uid !== task.uid && rings.has(uid))
    if (rings.has(task.uid)) found.push(findingOf('VC-1', task, { predecessorUids: inRing }))
    const reported = new Set<number>()
    for (const dependency of task.dependencies) {
      const other = dependency.predecessorUid
      if (other === task.uid) found.push(findingOf('VC-2', task, { predecessorUid: other }))
      else if ((pairCount.get(pairOf(other, task.uid)) ?? 0) > 1 && !reported.has(other)) {
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

// see VC-9, VC-10, VC-11, VC-12
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
  const childStart = extremeText(children.map((child) => child.start), false)
  const childFinish = extremeText(children.map((child) => child.finish), true)
  const planned = plannedEnds(parent)
  if ((childStart !== null || childFinish !== null)
    && (!sameDay(planned.start, dayOf(childStart)) || !sameDay(planned.finish, dayOf(childFinish)))) {
    found.push(findingOf('VC-11', parent, { ...columnsOf(parent, ['start', 'finish']), childStart, childFinish }))
  }
  const childActualStart = extremeText(children.map((child) => child.actualStart), false)
  const childActualFinish = open.length === 0 ? extremeText(children.map((child) => child.actualFinish), true) : null
  const actual = actualEnds(parent)
  if (!sameDay(actual.start, dayOf(childActualStart)) || !sameDay(actual.finish, dayOf(childActualFinish))) {
    found.push(findingOf('VC-12', parent, {
      ...columnsOf(parent, ['actualStart', 'actualFinish']), childActualStart, childActualFinish,
    }))
  }
  return found
}

// see VC-13, VC-14, VC-15
/** @purity pure */
function orderContradictions(facts: Facts, task: Task): readonly DelayFinding[] {
  const found: DelayFinding[] = []
  for (const dependency of task.dependencies) {
    const predecessor = facts.byUid.get(dependency.predecessorUid)
    if (predecessor === undefined || predecessor === task) continue
    const predecessorUid = predecessor.uid
    if (!isFinished(predecessor) && isFinished(task)) {
      found.push(findingOf('VC-13', task, {
        predecessorUid, predecessorActualFinish: predecessor.actualFinish, ...columnsOf(task, ['actualFinish']),
      }))
    }
    if (linkHolds(dependency.linkType, plannedEnds(predecessor), plannedEnds(task)) === false) {
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
    ...facts.tasks.flatMap((task) => parentContradictions(task, facts.explicitChildrenOf.get(task.uid) ?? [])),
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
    if (predecessor.wbsParentUid === task.uid || task.wbsParentUid === predecessorUid) {
      found.push(findingOf('VS-1', task, { predecessorUid, ...columnsOf(task, ['wbsParentUid']) }))
    }
    if (!isStarted(predecessor) && isStarted(task)) {
      found.push(findingOf('VS-3', task, { predecessorUid, ...columnsOf(task, ['actualStart']) }))
    }
    if (linkHolds(dependency.linkType, actualEnds(predecessor), actualEnds(task)) === false) {
      found.push(findingOf('VS-4', task, {
        predecessorUid, linkType: dependency.linkType, ...columnsOf(task, ['actualStart', 'actualFinish']),
        predecessorActualStart: predecessor.actualStart, predecessorActualFinish: predecessor.actualFinish,
      }))
    }
  }
  return found
}

// see T-311
/** @purity pure */
function suspicionsOf(facts: Facts): readonly DelayFinding[] {
  const found: DelayFinding[] = []
  for (const task of facts.tasks) {
    found.push(...linkSuspicions(facts, task))
    const children = facts.explicitChildrenOf.get(task.uid) ?? []
    if (task.milestone === true && children.length > 0) {
      found.push(findingOf('VS-2', task, { ...columnsOf(task, ['milestone']), childUids: children.map((one) => one.uid) }))
    }
    const actualDays = [task.actualStart, task.stop, task.actualFinish].map((text) => dayOf(text))
    if (actualDays.some((day) => isBefore(facts.statusDate, day))) {
      found.push(findingOf('VS-5', task, columnsOf(task, ['actualStart', 'stop', 'actualFinish'])))
    }
  }
  return found
}

// see VO-1, VO-2
/** @purity pure */
function rowOmissions(facts: Facts, task: Task): readonly DelayFinding[] {
  const found: DelayFinding[] = []
  const predecessors = (facts.linksOf.get(task.uid) ?? []).map((link) => facts.byUid.get(link.predecessorUid))
  const ends = plannedEnds(task)
  if (isBefore(ends.start, facts.statusDate) && task.actualStart === null
    && predecessors.every((one) => one !== undefined && isFinished(one))) {
    found.push(findingOf('VO-1', task, columnsOf(task, ['start', 'actualStart'])))
  }
  if (isBefore(ends.finish, facts.statusDate) && task.actualStart !== null
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
      found.push(findingOf('VO-4', task, { ...columnsOf(task, ['wbsParentUid']), candidateUids: derivation.candidates }))
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
    walls.push({ row, causeUid, stoppedCount: range.length })
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

// see BD-2
/** @purity pure */
function boundOf(facts: Facts, link: Link, flows: ReadonlyMap<number, Flow>, length: number): CalendarDay | null {
  const predecessor = facts.byUid.get(link.predecessorUid)
  const flow = flows.get(link.predecessorUid)
  if (predecessor === undefined || flow === undefined) return null
  const began = isStarted(predecessor) ? (dayOf(predecessor.actualStart) ?? flow.earliestStart) : flow.earliestStart
  const startFor = (last: CalendarDay): CalendarDay =>
    length > 1 ? dateFromWorkingDays(facts.calendar, last, 1 - length) : last
  switch (link.linkType) {
    case FINISH_TO_START: return nextWorkingDay(facts.calendar, flow.projectedFinish)
    case START_TO_START: return began
    case FINISH_TO_FINISH: return startFor(flow.projectedFinish)
    case START_TO_FINISH: return startFor(dateFromWorkingDays(facts.calendar, began, -1))
    default: return null
  }
}

// see BD-1, BD-2
/** @purity pure */
function projectedFinishOf(facts: Facts, task: Task, children: readonly Flow[],
                           earliestStart: CalendarDay, finish: CalendarDay, length: number): CalendarDay {
  const childFinishes = children.map((flow) => flow.projectedFinish)
  if (childFinishes.length > 0) return childFinishes.reduce(laterOf)
  const actualFinish = isFinished(task) ? dayOf(task.actualFinish) : null
  if (actualFinish !== null) return actualFinish
  const achieved = dayOf(facts.achievedOnOf.get(task.uid) ?? null)
  if (achieved !== null) return achieved
  if (isStarted(task)) return laterOf(finish, facts.statusDate)
  return lastDayForLength(facts.calendar, earliestStart, length)
}

// see BD-2, BD-3, T-314
/** @purity pure */
function flowOf(facts: Facts, task: Task, flows: ReadonlyMap<number, Flow>): Flow | null {
  const { start, finish } = plannedEnds(task)
  if (start === null || finish === null) return null
  const length = actualLengthOf(facts.calendar, start, finish)
  const bounds = (facts.linksOf.get(task.uid) ?? [])
    .map((link) => ({ uid: link.predecessorUid, day: boundOf(facts, link, flows, length) }))
  let earliestStart = isStarted(task) ? start : laterOf(start, facts.statusDate)
  for (const bound of bounds) if (bound.day !== null) earliestStart = laterOf(earliestStart, bound.day)
  const drivers = compareDays(earliestStart, start) > 0
    ? bounds.filter((bound) => sameDay(bound.day, earliestStart)).map((bound) => bound.uid) : []
  const children = facts.childrenOf.get(task.uid) ?? []
  const childFlows = children.map((child) => flows.get(child.uid)).filter((flow): flow is Flow => flow !== undefined)
  const projectedFinish = projectedFinishOf(facts, task, childFlows, earliestStart, finish, length)
  const expected = lastDayForLength(facts.calendar, earliestStart, length)
  return {
    earliestStart,
    projectedFinish,
    inheritedDelayDays: workingDaysBetween(facts.calendar, start, earliestStart),
    selfDelayDays: children.length > 0 ? 0 : Math.max(0, workingDaysBetween(facts.calendar, expected, projectedFinish)),
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
    const share = Math.min(flow.selfDelayDays, at.left)
    given.set(at.uid, share)
    for (const driver of flow.drivers) pending.push({ uid: driver, left: at.left - share })
  }
  return given
}

// see BD-4, DQ-4, DX-5
/** @purity pure */
function pushOutsOf(facts: Facts, flows: ReadonlyMap<number, Flow>, undiagnosable: ReadonlySet<number>): PushOuts {
  const terminals: TerminalPushOut[] = []
  const totals = new Map<number, { days: number; reached: number }>()
  for (const task of facts.tasks) {
    const flow = flows.get(task.uid)
    const finish = dayOf(task.finish)
    const isTerminal = task.milestone === true || (facts.successorsOf.get(task.uid) ?? []).length === 0
    if (flow === undefined || finish === null || undiagnosable.has(task.uid) || !isTerminal) continue
    const delay = Math.max(0, workingDaysBetween(facts.calendar, finish, flow.projectedFinish))
    const givenTo = [...spreadFrom(task.uid, delay, flows)]
      .filter(([, days]) => days > 0).map(([uid, days]) => ({ uid, days }))
    for (const share of givenTo) {
      const held = totals.get(share.uid) ?? { days: 0, reached: 0 }
      totals.set(share.uid, { days: held.days + share.days, reached: held.reached + 1 })
    }
    terminals.push({ uid: task.uid, name: task.name, terminalDelayDays: delay, givenTo })
  }
  const quantities = facts.tasks.flatMap((task) => {
    const flow = flows.get(task.uid)
    if (flow === undefined || undiagnosable.has(task.uid)) return []
    const total = totals.get(task.uid) ?? { days: 0, reached: 0 }
    return [{
      uid: task.uid, name: task.name, inheritedDelayDays: flow.inheritedDelayDays, selfDelayDays: flow.selfDelayDays,
      pushOutDays: total.days, terminalsReached: total.reached,
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

/** @purity pure */
function emptyReport(statusDate: string | null): DelayDiagnosticsReport {
  return {
    outcome: 'notDiagnosed', statusDate, findings: [], bottlenecks: [], terminalPushOuts: [], walls: [],
    unanalysedCount: 0, markerStates: [], settledPushOuts: [], derivedWbsParents: [],
  }
}

// see FR-130, FR-131, FR-132, FR-133, FR-134
/** @purity pure */
export function diagnoseDelay(document: DiagnosedDocument, calendar: WorkingCalendar,
                              bottleneckMinPushOutDays = BOTTLENECK_MIN_PUSH_OUT_DAYS): DelayDiagnosticsReport {
  const project = document.schedule.project
  const statusDate = dayOf(project.statusDate)
  if (statusDate === null) return emptyReport(project.statusDate)
  const facts = factsOf(document.schedule, calendar, statusDate)
  const contradictions = contradictionsOf(facts)
  const { walls, unreliable, cut, undiagnosable } = wallsOf(facts, contradictions)
  const flows = flowsOf(facts, cut)
  const { terminals, quantities } = pushOutsOf(facts, flows, undiagnosable)
  const pushing = quantities.filter((one) => one.pushOutDays >= bottleneckMinPushOutDays)
  const isOpen = (uid: number): boolean => {
    const task = facts.byUid.get(uid)
    return task !== undefined && !isFinished(task)
  }
  const bottlenecks = pushing.filter((one) => isOpen(one.uid))
    .map((one) => ({ ...one, path: ancestorsOf(one.uid, facts.parentOf) }))
  return {
    outcome: 'diagnosed',
    statusDate: project.statusDate,
    findings: [...contradictions, ...suspicionsOf(facts), ...omissionsOf(facts)],
    bottlenecks,
    terminalPushOuts: terminals,
    walls,
    unanalysedCount: facts.tasks.filter((task) => unreliable.has(task.uid)).length,
    markerStates: markerStatesOf(facts, unreliable, bottlenecks),
    settledPushOuts: pushing.filter((one) => !isOpen(one.uid)),
    derivedWbsParents: [...facts.derivations]
      .flatMap(([uid, one]) => (one.parentUid === null ? [] : [{ uid, parentUid: one.parentUid }])),
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
  const { byUid, rowDepthOf, tasksAtDepth, parentOf } = structureOf(document.schedule)
  const child = byUid.get(taskUid)
  const depth = rowDepthOf.get(taskUid)
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
