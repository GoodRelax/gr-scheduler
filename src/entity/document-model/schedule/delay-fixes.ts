// Schedule -- the Delay Diagnostics fix proposals (table T-373), the bundle they issue and the log of what was fixed.
// @unit      UF-201  (docs/spec/05-07-design.md, table T-075)
// @component Schedule, layer documentModel (table T-062)
// @purity    pure

import { compareDays, dayOf, isSameDay, textOfDay, type CalendarDay } from './calendar-day'
import { diagnoseDelay, extremeText, type DelayDiagnosticsReport, type DelayFinding } from './delay-diagnostics'
import type { Dependency, Schedule, Task } from './schedule-entities'
import { compareDates } from './schedule-search'
import {
  actualLengthOf,
  dateFromWorkingDays,
  lagWorkingDaysOf,
  lastDayForLength,
  minutesPerWorkingDayOf,
  textOfFinishSide,
  textOfStartSide,
  workingCalendarOf,
  type WorkingCalendar,
} from './working-calendar'

// see T-373, FM-3
export type DelayFixType = 'automatic' | 'choose' | 'suggestedDate' | 'byHand'

// see T-374, FM-3
export const DELAY_FIX_TYPES: readonly DelayFixType[] = ['automatic', 'choose', 'suggestedDate', 'byHand']

// see T-373, GP-1
export type DelayFixRefusal = 'readOnly'

// see FM-7, T-018
export interface DelayFixLink {
  readonly predecessorUid: number
  readonly successorUid: number
  readonly linkType: number
  readonly lag: number | null
}

// see FM-7, FM-8
export type DelayFixValue =
  | { readonly kind: 'empty' }
  | { readonly kind: 'date'; readonly text: string }
  | { readonly kind: 'dates'; readonly texts: readonly (string | null)[] }
  | { readonly kind: 'flag'; readonly value: boolean }
  | { readonly kind: 'links'; readonly links: readonly DelayFixLink[] }

// see T-019, CM-13
// WHY: the same shape as the placement CM-13 takes, so a bundle reaches the edit with no conversion.
export type DelayFixPlacement =
  | { readonly row: 'PA-1' }
  | ({ readonly row: 'PA-2' | 'PA-4'; readonly stop: string } & StartedPlacement)
  | ({ readonly row: 'PA-3'; readonly stop: string; readonly resume: string } & StartedPlacement)
  | ({ readonly row: 'PA-5'; readonly actualFinish: string } & StartedPlacement)

interface StartedPlacement {
  readonly actualStart: string
}

// see T-373, CM-3, CM-11, CM-13, CM-37
// WHY: each member has the shape of the command of table T-108 it names, so a bundle is a list of document commands.
export type DelayFixCommand =
  | { readonly kind: 'deleteDependency'; readonly predecessorUid: number; readonly successorUid: number }
  | { readonly kind: 'setTaskPlanDates'; readonly uid: number; readonly start: string; readonly finish: string }
  | { readonly kind: 'setTaskPlanActualState'; readonly uid: number; readonly place: DelayFixPlacement }
  | { readonly kind: 'setStatusDate'; readonly date: string }

// see T-373
export type DelayFixChoiceWord =
  | 'deleteLinkBetween'
  | 'deleteLink'
  | 'keepThisLink'
  | 'setPlannedDate'
  | 'clearPauseValues'
  | 'markAsStarted'
  | 'clearParentActualFinish'
  | 'finishChildrenOnParentFinish'
  | 'clearMilestoneActuals'
  | 'finishPredecessorsOnMilestoneDate'
  | 'moveSuccessorToEarliestDate'
  | 'moveStatusDateToActual'
  | 'markAsFinished'
  | 'markAsStillInProgress'

// see T-373, FM-8
// WHY: predecessorUid, successorUid and date fill the placeholders of the choice's words.
export interface DelayFixChoice {
  readonly key: string
  readonly word: DelayFixChoiceWord
  readonly predecessorUid: number | null
  readonly successorUid: number | null
  readonly date: string | null
  readonly after: DelayFixValue
  readonly commands: readonly DelayFixCommand[]
}

// see RW-13, T-016
export interface DelayFixOpenField {
  readonly taskUid: number
  readonly field: string
}

// see T-374, FM-4, FM-5, FM-6, FM-7
export interface DelayFixSubject {
  readonly fixRow: string
  readonly findingRow: string
  readonly taskUid: number
  readonly taskName: string | null
  readonly column: string | null
  readonly before: DelayFixValue
}

// see DX-11, T-374, RW-13, RW-16
export interface DelayFixRow extends DelayFixSubject {
  readonly key: string
  readonly after: DelayFixValue | null
  readonly fixType: DelayFixType
  readonly choices: readonly DelayFixChoice[]
  readonly chosen: string | null
  readonly suggested: string | null
  readonly checked: boolean
  readonly isCheckable: boolean
  readonly causedBy: string | null
  readonly refusal: DelayFixRefusal | null
  readonly openField: DelayFixOpenField | null
  readonly relatedTaskUids: readonly number[]
  readonly layer: number | null
  readonly depth: number
  readonly applyOrder: number
  readonly commands: readonly DelayFixCommand[]
}

// see RW-16
// WHY: what the person did to one row, held by the row's key; null keeps the row's default.
export interface DelayFixCheck {
  readonly key: string
  readonly checked: boolean | null
  readonly choice: string | null
  readonly date: string | null
}

// see DX-12, T-374
export interface DelayFixLogRow extends DelayFixSubject {
  readonly fixedAt: string
  readonly order: number
  readonly after: DelayFixValue
  readonly isCascade: boolean
}

// see T-018
const FINISH_TO_START = 1
const START_TO_FINISH = 2
const START_TO_START = 3

const DATE_LENGTH = 'yyyy-mm-dd'.length

const EMPTY: DelayFixValue = { kind: 'empty' }

const NO_UIDS: readonly number[] = []

type Actuals = Pick<Task, 'actualStart' | 'stop' | 'actualFinish' | 'resume' | 'resumeValid'>

interface FixOutcome {
  readonly after: DelayFixValue
  readonly commands: readonly DelayFixCommand[]
}

interface FixDraft {
  readonly fixType: DelayFixType
  readonly column: string | null
  readonly other: number | null
  readonly before: DelayFixValue
  readonly outcome: FixOutcome | null
  readonly choices: readonly DelayFixChoice[]
  readonly suggested: CalendarDay | null
  readonly outcomeOn: ((day: CalendarDay) => FixOutcome | null) | null
  readonly openField: DelayFixOpenField | null
  readonly related: readonly number[]
}

interface FixContext {
  readonly schedule: Schedule
  readonly calendar: WorkingCalendar
  readonly byUid: ReadonlyMap<number, Task>
  readonly childrenOf: ReadonlyMap<number, readonly Task[]>
  readonly successorsOf: ReadonlyMap<number, readonly number[]>
  readonly readOnlyUids: ReadonlySet<number>
}

interface Seed {
  readonly finding: DelayFinding
  readonly causedBy: string | null
}

type FixBuilder = (context: FixContext, finding: DelayFinding) => readonly FixDraft[]

type AppliesRow = (row: DelayFixRow) => boolean

interface SettleRules {
  readonly original: Schedule
  readonly calendar: WorkingCalendar
  readonly checks: ReadonlyMap<string, DelayFixCheck>
  readonly applies: AppliesRow
}

interface Settled {
  readonly schedule: Schedule
  readonly rows: readonly DelayFixRow[]
  readonly applied: readonly DelayFixRow[]
}

const BLANK_DRAFT: FixDraft = {
  fixType: 'byHand',
  column: null,
  other: null,
  before: EMPTY,
  outcome: null,
  choices: [],
  suggested: null,
  outcomeOn: null,
  openField: null,
  related: NO_UIDS,
}

/** @purity pure */
function dateValue(text: string | null): DelayFixValue {
  return text === null ? EMPTY : { kind: 'date', text }
}

/** @purity pure */
function datesValue(texts: readonly (string | null)[]): DelayFixValue {
  return { kind: 'dates', texts }
}

/** @purity pure */
function linksValue(links: readonly DelayFixLink[]): DelayFixValue {
  return links.length === 0 ? EMPTY : { kind: 'links', links }
}

// see T-373
// WHY: a column that already holds a value keeps its own time, so an MSPDI document keeps the times it carries.
/** @purity pure */
function onDay(held: string | null, day: CalendarDay, fallback: string): string {
  if (held === null || dayOf(held) === null) return fallback
  return `${textOfDay(day).slice(0, DATE_LENGTH)}${held.slice(DATE_LENGTH)}`
}

/** @purity pure */
function startSideOn(context: FixContext, task: Task, held: string | null, day: CalendarDay): string {
  return onDay(held, day, textOfStartSide(day, context.schedule.project, task.milestone === true))
}

/** @purity pure */
function finishSideOn(context: FixContext, held: string | null, day: CalendarDay): string {
  return onDay(held, day, textOfFinishSide(day, context.schedule.project))
}

/** @purity pure */
function earlierDay(a: CalendarDay | null, b: CalendarDay | null): CalendarDay | null {
  if (a === null || b === null) return a ?? b
  return compareDays(b, a) < 0 ? b : a
}

/** @purity pure */
function laterDay(a: CalendarDay | null, b: CalendarDay | null): CalendarDay | null {
  if (a === null || b === null) return a ?? b
  return compareDays(b, a) > 0 ? b : a
}

/** @purity pure */
function endOf(tasks: readonly Task[], column: 'start' | 'finish' | 'actualStart' | 'actualFinish', latest: boolean): string | null {
  return extremeText(tasks.map((task) => task[column]), latest)
}

/** @purity pure */
function numberIn(finding: DelayFinding, name: string): number | null {
  const value = finding.values[name]
  return typeof value === 'number' ? value : null
}

/** @purity pure */
function numbersIn(finding: DelayFinding, name: string): readonly number[] {
  const value = finding.values[name]
  return Array.isArray(value) ? value : NO_UIDS
}

/** @purity pure */
function isFinishedTask(task: Task): boolean {
  return task.actualStart !== null && task.actualFinish !== null
}

/** @purity pure */
function deleteLink(link: Pick<DelayFixLink, 'predecessorUid' | 'successorUid'>): DelayFixCommand {
  return { kind: 'deleteDependency', predecessorUid: link.predecessorUid, successorUid: link.successorUid }
}

// see T-019, CM-13
// WHY: CM-13 places the five columns as one of the PA rows; the in-progress rows need a last day, so a missing stop
// takes the actual start and the command settles it (FR-011).
/** @purity pure */
function placementOf(actuals: Actuals): DelayFixPlacement {
  const { actualStart, actualFinish, resume } = actuals
  if (actualStart === null) return { row: 'PA-1' }
  if (actualFinish !== null) return { row: 'PA-5', actualStart, actualFinish }
  const stop = actuals.stop ?? actualStart
  if (resume !== null) return { row: 'PA-3', actualStart, stop, resume }
  return { row: actuals.resumeValid === false ? 'PA-4' : 'PA-2', actualStart, stop }
}

// see CM-13
// WHY: a finish with no start has no PA row, so that outcome is not formed at all.
/** @purity pure */
function actualsOutcome(task: Task, changes: Partial<Actuals>, after: DelayFixValue): FixOutcome | null {
  const actuals: Actuals = { ...task, ...changes }
  if (actuals.actualStart === null && actuals.actualFinish !== null) return null
  return { after, commands: [{ kind: 'setTaskPlanActualState', uid: task.uid, place: placementOf(actuals) }] }
}

// see CM-11
/** @purity pure */
function planOutcome(uid: number, start: string | null, finish: string | null, after: DelayFixValue): FixOutcome | null {
  if (start === null || finish === null) return null
  return { after, commands: [{ kind: 'setTaskPlanDates', uid, start, finish }] }
}

// see T-019
/** @purity pure */
function taskAfterPlacement(task: Task, place: DelayFixPlacement): Task {
  const cleared = { ...task, stop: null, actualFinish: null, resume: null }
  switch (place.row) {
    case 'PA-1':
      return { ...cleared, actualStart: null, percentComplete: 0 }
    case 'PA-2':
      return { ...cleared, actualStart: place.actualStart, stop: place.stop, resumeValid: true }
    case 'PA-3':
      return { ...cleared, actualStart: place.actualStart, stop: place.stop, resume: place.resume, resumeValid: true }
    case 'PA-4':
      return { ...cleared, actualStart: place.actualStart, stop: place.stop, resumeValid: false }
    case 'PA-5':
      return { ...cleared, actualStart: place.actualStart, actualFinish: place.actualFinish, resumeValid: false, percentComplete: 100 }
  }
}

/** @purity pure */
function withTaskEdited(schedule: Schedule, uid: number, edit: (task: Task) => Task): Schedule {
  return { ...schedule, tasks: schedule.tasks.map((task) => (task.uid === uid ? edit(task) : task)) }
}

// see T-373
// WHY: applied to a simulated schedule, so the chain is found before anything is issued.
/** @purity pure */
function scheduleAfter(schedule: Schedule, command: DelayFixCommand): Schedule {
  switch (command.kind) {
    case 'setStatusDate':
      return { ...schedule, project: { ...schedule.project, statusDate: command.date } }
    case 'deleteDependency':
      return withTaskEdited(schedule, command.successorUid, (task) => ({
        ...task,
        dependencies: task.dependencies.filter((one) => one.predecessorUid !== command.predecessorUid),
      }))
    case 'setTaskPlanDates':
      return withTaskEdited(schedule, command.uid, (task) => ({ ...task, start: command.start, finish: command.finish }))
    case 'setTaskPlanActualState':
      return withTaskEdited(schedule, command.uid, (task) => taskAfterPlacement(task, command.place))
  }
}

/** @purity pure */
function writtenUidsOf(command: DelayFixCommand): readonly number[] {
  switch (command.kind) {
    case 'setStatusDate':
      return NO_UIDS
    case 'deleteDependency':
      return [command.successorUid]
    case 'setTaskPlanDates':
    case 'setTaskPlanActualState':
      return [command.uid]
  }
}

/** @purity pure */
function groupedBy(tasks: readonly Task[], keyOf: (task: Task) => number | null): ReadonlyMap<number, readonly Task[]> {
  const grouped = new Map<number, Task[]>()
  for (const task of tasks) {
    const key = keyOf(task)
    if (key === null) continue
    grouped.set(key, [...(grouped.get(key) ?? []), task])
  }
  return grouped
}

// see GP-1
/** @purity pure */
function readOnlyUidsOf(schedule: Schedule): ReadonlySet<number> {
  const closed = new Set(schedule.taskGroups.filter((group) => group.editGroup !== null).map((group) => group.id))
  return new Set(schedule.taskGroupMembers.filter((member) => closed.has(member.groupId)).map((member) => member.taskUid))
}

/** @purity pure */
function successorMapOf(tasks: readonly Task[]): ReadonlyMap<number, readonly number[]> {
  const successors = new Map<number, number[]>()
  for (const task of tasks) {
    for (const dependency of task.dependencies) {
      successors.set(dependency.predecessorUid, [...(successors.get(dependency.predecessorUid) ?? []), task.uid])
    }
  }
  return successors
}

/** @purity pure */
function contextOf(schedule: Schedule, calendar: WorkingCalendar): FixContext {
  return {
    schedule,
    calendar,
    byUid: new Map(schedule.tasks.map((task) => [task.uid, task])),
    childrenOf: groupedBy(schedule.tasks, (task) => task.parentTaskUid),
    successorsOf: successorMapOf(schedule.tasks),
    readOnlyUids: readOnlyUidsOf(schedule),
  }
}

/** @purity pure */
function field(taskUid: number, rowId: string): DelayFixOpenField {
  return { taskUid, field: rowId }
}

/** @purity pure */
function choiceOf(
  key: string,
  word: DelayFixChoiceWord,
  fill: { readonly predecessorUid?: number; readonly successorUid?: number; readonly date?: string | null },
  outcome: FixOutcome,
): DelayFixChoice {
  return {
    key,
    word,
    predecessorUid: fill.predecessorUid ?? null,
    successorUid: fill.successorUid ?? null,
    date: fill.date ?? null,
    after: outcome.after,
    commands: outcome.commands,
  }
}

// see T-373
// WHY: a fix whose outcome cannot be formed is left to the person, so no row offers a fix it cannot issue.
/** @purity pure */
function hasOutcome(draft: FixDraft): boolean {
  switch (draft.fixType) {
    case 'automatic':
      return draft.outcome !== null
    case 'choose':
      return draft.choices.length > 0
    case 'suggestedDate':
      return draft.suggested !== null && (draft.outcomeOn?.(draft.suggested) ?? null) !== null
    case 'byHand':
      return true
  }
}

/** @purity pure */
function draftOf(parts: Partial<FixDraft>): FixDraft {
  const draft: FixDraft = { ...BLANK_DRAFT, ...parts }
  return hasOutcome(draft) ? draft : { ...draft, fixType: 'byHand', outcome: null, choices: [], outcomeOn: null }
}

/** @purity pure */
function linkOf(successorUid: number, dependency: Dependency): DelayFixLink {
  return { predecessorUid: dependency.predecessorUid, successorUid, linkType: dependency.linkType, lag: dependency.lag }
}

/** @purity pure */
function lineKeyOf(link: Pick<DelayFixLink, 'predecessorUid' | 'successorUid'>): string {
  return `${link.predecessorUid}>${link.successorUid}`
}

/** @purity pure */
function uniqueLines(links: readonly DelayFixLink[]): readonly DelayFixLink[] {
  const seen = new Set<string>()
  return links.filter((link) => {
    const key = lineKeyOf(link)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/** @purity pure */
function deleteChoiceOf(link: DelayFixLink, after: DelayFixValue, word: DelayFixChoiceWord = 'deleteLink'): DelayFixChoice {
  return choiceOf(`delete:${lineKeyOf(link)}`, word, link, { after, commands: [deleteLink(link)] })
}

/** @purity pure */
function linkFrom(successor: Task, predecessorUid: number | null): DelayFixLink | null {
  const dependency = successor.dependencies.find((one) => one.predecessorUid === predecessorUid)
  return dependency === undefined ? null : linkOf(successor.uid, dependency)
}

/** @purity pure */
function tasksOf(context: FixContext, uids: readonly number[]): readonly Task[] {
  return uids.flatMap((uid) => context.byUid.get(uid) ?? [])
}

/** @purity pure */
function openTaskOf(context: FixContext, uid: number): Task | null {
  const task = context.byUid.get(uid)
  return task === undefined || task.actualFinish !== null ? null : task
}

/** @purity pure */
function reachFrom(start: number, next: (uid: number) => readonly number[]): ReadonlySet<number> {
  const reached = new Set([start])
  const order = [start]
  for (const at of order) {
    const fresh = next(at).filter((uid) => !reached.has(uid))
    for (const uid of fresh) reached.add(uid)
    order.push(...fresh)
  }
  return reached
}

// see VC-1
/** @purity pure */
function ringOf(context: FixContext, uid: number): ReadonlySet<number> {
  const forward = reachFrom(uid, (at) => context.successorsOf.get(at) ?? NO_UIDS)
  const backward = reachFrom(uid, (at) => context.byUid.get(at)?.dependencies.map((one) => one.predecessorUid) ?? NO_UIDS)
  return new Set([...forward].filter((one) => backward.has(one)))
}

// see FA-1, VC-1
/** @purity pure */
function ringDrafts(context: FixContext, finding: DelayFinding): readonly FixDraft[] {
  const ring = ringOf(context, finding.uid)
  if (ring.size < 2) return []
  const links = context.schedule.tasks.filter((task) => ring.has(task.uid)).flatMap((task) => task.dependencies
    .filter((one) => one.predecessorUid !== task.uid && ring.has(one.predecessorUid)).map((one) => linkOf(task.uid, one)))
  const choices = uniqueLines(links).map((line) =>
    deleteChoiceOf(line, linksValue(links.filter((one) => lineKeyOf(one) !== lineKeyOf(line))), 'deleteLinkBetween'))
  const related = [...ring].filter((one) => one !== finding.uid)
  return [draftOf({ fixType: 'choose', before: linksValue(links), choices, related })]
}

// see FA-2, VC-2
/** @purity pure */
function selfLinkDrafts(context: FixContext, finding: DelayFinding): readonly FixDraft[] {
  const task = context.byUid.get(finding.uid)
  const links = (task?.dependencies ?? []).filter((one) => one.predecessorUid === finding.uid).map((one) => linkOf(finding.uid, one))
  const link = links[0]
  if (link === undefined) return []
  const outcome = { after: EMPTY, commands: [deleteLink(link)] }
  return [draftOf({ fixType: 'automatic', before: linksValue(links), outcome })]
}

// see VC-3
/** @purity pure */
function linksBetween(context: FixContext, a: number, b: number): readonly DelayFixLink[] {
  return context.schedule.tasks.flatMap((task) => {
    const other = task.uid === a ? b : task.uid === b ? a : null
    return task.dependencies.filter((one) => one.predecessorUid === other).map((one) => linkOf(task.uid, one))
  })
}

// see FA-3, CM-37
// TRAP: CM-37 deletes every line that runs one way between two tasks, so it cannot keep one of two lines
// running the same way; that outcome is not formed and the row is left to the person.
/** @purity pure */
function keepOutcome(links: readonly DelayFixLink[], kept: DelayFixLink): FixOutcome | null {
  const removed = links.filter((one) => one !== kept)
  if (removed.some((one) => lineKeyOf(one) === lineKeyOf(kept))) return null
  return { after: linksValue([kept]), commands: uniqueLines(removed).map(deleteLink) }
}

// see FA-3, VC-3
/** @purity pure */
function duplicateDrafts(context: FixContext, finding: DelayFinding): readonly FixDraft[] {
  const other = numberIn(finding, 'predecessorUid')
  if (other === null) return []
  const links = linksBetween(context, other, finding.uid)
  if (links.length < 2) return []
  const first = links[0]
  const base = { other, before: linksValue(links), related: [other] }
  if (first !== undefined && links.every((one) => one.linkType === first.linkType && one.lag === first.lag)) {
    return [draftOf({ ...base, fixType: 'automatic', outcome: keepOutcome(links, first) })]
  }
  const choices = links.flatMap((kept, at) => {
    const outcome = keepOutcome(links, kept)
    return outcome === null ? [] : [choiceOf(`keep:${at}`, 'keepThisLink', kept, outcome)]
  })
  return [draftOf({ ...base, fixType: 'choose', choices })]
}

// see FA-4, VC-4, PR-35
/** @purity pure */
function milestoneDateDrafts(context: FixContext, finding: DelayFinding): readonly FixDraft[] {
  const task = context.byUid.get(finding.uid)
  if (task === undefined || isSameDay(task.start, task.finish)) return []
  const choices = [task.start, task.finish].flatMap((text, at) => {
    const day = dayOf(text)
    if (day === null) return []
    const start = startSideOn(context, task, task.start, day)
    const finish = finishSideOn(context, task.finish, day)
    const outcome = planOutcome(task.uid, start, finish, datesValue([start, finish]))
    return outcome === null ? [] : [choiceOf(at === 0 ? 'start' : 'finish', 'setPlannedDate', { date: text }, outcome)]
  })
  const before = datesValue([task.start, task.finish])
  return [draftOf({ fixType: 'choose', column: 'PR-35', before, choices, openField: field(task.uid, 'PR-35') })]
}

// see FA-5, FA-6, FA-7, FA-18, FA-22, PR-4
/** @purity pure */
function actualStartOn(context: FixContext, task: Task, day: CalendarDay): FixOutcome | null {
  const actualStart = startSideOn(context, task, task.actualStart ?? task.start, day)
  return actualsOutcome(task, { actualStart }, dateValue(actualStart))
}

// see FA-13, FA-24, PR-6
// see FA-9, FA-13
// WHY: a task finished with no start of its own starts on its planned start, or on the finish day if that is earlier.
/** @purity pure */
function actualStartBy(context: FixContext, task: Task, finishDay: CalendarDay): string {
  return task.actualStart ?? startSideOn(context, task, task.start, earlierDay(dayOf(task.start), finishDay) ?? finishDay)
}

/** @purity pure */
function actualFinishOn(context: FixContext, task: Task, day: CalendarDay): FixOutcome | null {
  const actualFinish = finishSideOn(context, task.actualFinish ?? task.finish, day)
  return actualsOutcome(task, { actualStart: actualStartBy(context, task, day), actualFinish }, dateValue(actualFinish))
}

/** @purity pure */
function suggestedStartDraft(context: FixContext, task: Task, suggested: CalendarDay | null): FixDraft {
  return draftOf({
    fixType: 'suggestedDate',
    column: 'PR-4',
    before: dateValue(task.actualStart),
    suggested,
    outcomeOn: (day) => actualStartOn(context, task, day),
    openField: field(task.uid, 'PR-4'),
  })
}

// see FA-5, FA-6, VC-5, VC-6
/** @purity pure */
function actualStartDrafts(context: FixContext, finding: DelayFinding): readonly FixDraft[] {
  const task = context.byUid.get(finding.uid)
  if (task === undefined || task.actualStart !== null) return []
  return [suggestedStartDraft(context, task, earlierDay(dayOf(task.start), dayOf(task.actualFinish)))]
}

// see FA-22, VO-1
/** @purity pure */
function notStartedDrafts(context: FixContext, finding: DelayFinding): readonly FixDraft[] {
  const task = context.byUid.get(finding.uid)
  return task === undefined || task.actualStart !== null ? [] : [suggestedStartDraft(context, task, dayOf(task.start))]
}

// see FA-7, VC-7
/** @purity pure */
function pauseDrafts(context: FixContext, finding: DelayFinding): readonly FixDraft[] {
  const task = context.byUid.get(finding.uid)
  if (task === undefined || task.actualStart !== null || (task.stop === null && task.resume === null)) return []
  const cleared = actualsOutcome(task, { actualStart: null }, datesValue([null, null]))
  const day = earlierDay(dayOf(task.start), dayOf(task.stop))
  const started = day === null ? null : actualStartOn(context, task, day)
  const choices = [
    ...(cleared === null ? [] : [choiceOf('clearPauseValues', 'clearPauseValues', {}, cleared)]),
    ...(started === null ? [] : [choiceOf('markAsStarted', 'markAsStarted', {}, started)]),
  ]
  const before = datesValue([task.stop, task.resume])
  return [draftOf({ fixType: 'choose', column: 'PR-4', before, choices, openField: field(task.uid, 'PR-4') })]
}

// see FA-8, VC-8, PR-8
/** @purity pure */
function resumeValidDrafts(context: FixContext, finding: DelayFinding): readonly FixDraft[] {
  const task = context.byUid.get(finding.uid)
  if (task === undefined || task.actualFinish === null || task.resumeValid !== true) return []
  const outcome = actualsOutcome(task, { resumeValid: false }, { kind: 'flag', value: false })
  return [draftOf({ fixType: 'automatic', column: 'PR-8', before: { kind: 'flag', value: true }, outcome })]
}

// see FA-9, FA-14
/** @purity pure */
function finishOnCommands(context: FixContext, tasks: readonly Task[], finish: string, finishDay: CalendarDay): readonly DelayFixCommand[] {
  return tasks.flatMap((task) =>
    actualsOutcome(task, { actualStart: actualStartBy(context, task, finishDay), actualFinish: finish }, EMPTY)?.commands ?? [])
}

// see T-373, FR-135
// WHY: the stated children only; a parent known only from the derivation is a relation the document does not hold.
/** @purity pure */
function statedFamilyOf(context: FixContext, uid: number): { readonly parent: Task; readonly children: readonly Task[] } | null {
  const parent = context.byUid.get(uid)
  const children = context.childrenOf.get(uid) ?? []
  return parent === undefined || children.length === 0 ? null : { parent, children }
}

/** @purity pure */
function uidsOf(tasks: readonly Task[]): readonly number[] {
  return tasks.map((task) => task.uid)
}

// see FA-9, VC-9, PR-6
/** @purity pure */
function parentFinishedDrafts(context: FixContext, finding: DelayFinding): readonly FixDraft[] {
  const family = statedFamilyOf(context, finding.uid)
  if (family === null) return [BLANK_DRAFT]
  const { parent, children } = family
  const finish = parent.actualFinish
  const finishDay = dayOf(finish)
  const open = children.filter((child) => !isFinishedTask(child))
  if (!isFinishedTask(parent) || open.length === 0) return []
  const cleared = actualsOutcome(parent, { actualFinish: null, stop: finish, resume: null, resumeValid: true }, EMPTY)
  const choices = [
    ...(cleared === null ? [] : [choiceOf('clearParentActualFinish', 'clearParentActualFinish', {}, cleared)]),
    ...(finish === null || finishDay === null ? [] : [choiceOf('finishChildrenOnParentFinish', 'finishChildrenOnParentFinish', { date: finish }, {
      after: dateValue(finish), commands: finishOnCommands(context, open, finish, finishDay),
    })]),
  ]
  const openField = field(parent.uid, 'PR-6')
  return [draftOf({ fixType: 'choose', column: 'PR-6', before: dateValue(finish), choices, openField, related: uidsOf(children) })]
}

// see FA-10, VC-10
/** @purity pure */
function parentUnfinishedDrafts(context: FixContext, finding: DelayFinding): readonly FixDraft[] {
  const family = statedFamilyOf(context, finding.uid)
  if (family === null) return [BLANK_DRAFT]
  const { parent, children } = family
  if (isFinishedTask(parent) || !children.every(isFinishedTask)) return []
  const latest = endOf(children, 'actualFinish', true)
  const actualStart = parent.actualStart ?? endOf(children, 'actualStart', false)
  const outcome = latest === null ? null : actualsOutcome(parent, { actualStart, actualFinish: latest }, dateValue(latest))
  return [draftOf({ fixType: 'automatic', column: 'PR-6', before: dateValue(parent.actualFinish), outcome, related: uidsOf(children) })]
}

// see FA-11, VC-11, PR-3, PR-47
/** @purity pure */
function parentPlanDrafts(context: FixContext, finding: DelayFinding): readonly FixDraft[] {
  const family = statedFamilyOf(context, finding.uid)
  if (family === null) return [BLANK_DRAFT]
  const { parent, children } = family
  const start = endOf(children, 'start', false)
  const finish = endOf(children, 'finish', true)
  const related = uidsOf(children)
  const drafts: FixDraft[] = []
  if (start !== null && !isSameDay(parent.start, start)) {
    const outcome = planOutcome(parent.uid, start, parent.finish ?? finish, dateValue(start))
    drafts.push(draftOf({ fixType: 'automatic', column: 'PR-3', before: dateValue(parent.start), outcome, related }))
  }
  if (finish !== null && !isSameDay(parent.finish, finish)) {
    const outcome = planOutcome(parent.uid, parent.start ?? start, finish, dateValue(finish))
    drafts.push(draftOf({ fixType: 'automatic', column: 'PR-47', before: dateValue(parent.finish), outcome, related }))
  }
  return drafts
}

// see FA-12, VC-12, PR-4, PR-6
// WHY: the finish is set only when every child is finished; a finished parent with an open child is VC-9's (FA-9).
/** @purity pure */
function parentActualDrafts(context: FixContext, finding: DelayFinding): readonly FixDraft[] {
  const family = statedFamilyOf(context, finding.uid)
  if (family === null) return [BLANK_DRAFT]
  const { parent, children } = family
  const earliest = endOf(children, 'actualStart', false)
  const latest = children.every(isFinishedTask) ? endOf(children, 'actualFinish', true) : null
  const related = uidsOf(children)
  const drafts: FixDraft[] = []
  if (!isSameDay(parent.actualStart, earliest) && (earliest !== null || parent.actualFinish === null)) {
    const outcome = actualsOutcome(parent, { actualStart: earliest }, dateValue(earliest))
    drafts.push(draftOf({ fixType: 'automatic', column: 'PR-4', before: dateValue(parent.actualStart), outcome, related }))
  }
  if (latest !== null && !isSameDay(parent.actualFinish, latest)) {
    const outcome = actualsOutcome(parent, { actualStart: parent.actualStart ?? earliest, actualFinish: latest }, dateValue(latest))
    drafts.push(draftOf({ fixType: 'automatic', column: 'PR-6', before: dateValue(parent.actualFinish), outcome, related }))
  }
  return drafts
}

/** @purity pure */
function linkEndsOf(context: FixContext, finding: DelayFinding): { readonly predecessor: Task; readonly successor: Task } | null {
  const predecessor = context.byUid.get(numberIn(finding, 'predecessorUid') ?? Number.NaN)
  const successor = context.byUid.get(finding.uid)
  return predecessor === undefined || successor === undefined ? null : { predecessor, successor }
}

// see VC-13, VS-4, T-018
/** @purity pure */
function bindsSuccessorStart(linkType: number | null): boolean {
  return linkType === FINISH_TO_START || linkType === START_TO_START
}

// see VC-13, VC-15, T-018
/** @purity pure */
function bindsByPredecessorStart(linkType: number | null): boolean {
  return linkType === START_TO_START || linkType === START_TO_FINISH
}

// see FA-13, VC-13
/** @purity pure */
function bindingEndDrafts(context: FixContext, finding: DelayFinding): readonly FixDraft[] {
  const ends = linkEndsOf(context, finding)
  if (ends === null) return []
  const { predecessor, successor } = ends
  const linkType = numberIn(finding, 'linkType')
  const byStart = bindsByPredecessorStart(linkType)
  if (byStart ? predecessor.actualStart !== null : isFinishedTask(predecessor)) return []
  const column = byStart ? 'PR-4' : 'PR-6'
  return [draftOf({
    fixType: 'suggestedDate',
    column,
    other: predecessor.uid,
    before: dateValue(byStart ? predecessor.actualStart : predecessor.actualFinish),
    suggested: dayOf(bindsSuccessorStart(linkType) ? successor.actualStart : successor.actualFinish),
    outcomeOn: (day) => (byStart ? actualStartOn(context, predecessor, day) : actualFinishOn(context, predecessor, day)),
    openField: field(predecessor.uid, column),
    related: [predecessor.uid],
  })]
}

// see FA-14, VC-14, PR-36
/** @purity pure */
function milestoneActualDrafts(context: FixContext, finding: DelayFinding): readonly FixDraft[] {
  const milestone = context.byUid.get(finding.uid)
  if (milestone === undefined) return []
  const finish = milestone.actualFinish
  const finishDay = dayOf(finish)
  const open = tasksOf(context, numbersIn(finding, 'predecessorUids'))
    .filter((task) => !isFinishedTask(task))
  if (finish === null || open.length === 0) return []
  const cleared = actualsOutcome(milestone, { actualStart: null }, datesValue([null, null]))
  const choices = [
    ...(cleared === null ? [] : [choiceOf('clearMilestoneActuals', 'clearMilestoneActuals', {}, cleared)]),
    ...(finish === null || finishDay === null ? [] : [choiceOf('finishPredecessorsOnMilestoneDate', 'finishPredecessorsOnMilestoneDate', { date: finish }, {
      after: dateValue(finish), commands: finishOnCommands(context, open, finish, finishDay),
    })]),
  ]
  const before = datesValue([milestone.actualStart, finish])
  const openField = field(milestone.uid, 'PR-36')
  return [draftOf({ fixType: 'choose', column: 'PR-36', before, choices, openField, related: uidsOf(open) })]
}

// see VC-15, BD-2
// WHY: the lag is counted in whole working days, rounded down as the diagnosis counts it (VC-15).
/** @purity pure */
function boundDayOf(context: FixContext, predecessor: Task, dependency: Dependency): CalendarDay | null {
  const day = dayOf(bindsByPredecessorStart(dependency.linkType) ? predecessor.start : predecessor.finish)
  const lag = lagWorkingDaysOf(dependency, minutesPerWorkingDayOf(context.schedule.project))
  if (day === null || lag === null) return null
  const whole = Math.floor(lag)
  return whole === 0 ? day : dateFromWorkingDays(context.calendar, day, whole)
}

// see FA-15, VC-15
// WHY: the successor keeps its length in working days (FR-011's count), moved so its bound end meets the bound.
/** @purity pure */
function movedSuccessorOutcome(context: FixContext, predecessor: Task, successor: Task, dependency: Dependency): FixOutcome | null {
  const start = dayOf(successor.start)
  const finish = dayOf(successor.finish)
  const bound = boundDayOf(context, predecessor, dependency)
  if (start === null || finish === null || bound === null) return null
  const length = actualLengthOf(context.calendar, start, finish)
  const moved = bindsSuccessorStart(dependency.linkType)
    ? [bound, lastDayForLength(context.calendar, bound, length)] as const
    : [length > 1 ? dateFromWorkingDays(context.calendar, bound, 1 - length) : bound, bound] as const
  const startText = startSideOn(context, successor, successor.start, moved[0])
  const finishText = finishSideOn(context, successor.finish, moved[1])
  return planOutcome(successor.uid, startText, finishText, datesValue([startText, finishText]))
}

// see FA-15, VC-15
/** @purity pure */
function planLinkDrafts(context: FixContext, finding: DelayFinding): readonly FixDraft[] {
  const ends = linkEndsOf(context, finding)
  const linkType = numberIn(finding, 'linkType')
  const dependency = ends?.successor.dependencies
    .find((one) => one.predecessorUid === ends.predecessor.uid && one.linkType === linkType)
  if (ends === null || dependency === undefined) return []
  const link = linkOf(ends.successor.uid, dependency)
  const moved = movedSuccessorOutcome(context, ends.predecessor, ends.successor, dependency)
  const choices = [
    ...(moved === null ? [] : [choiceOf('moveSuccessorToEarliestDate', 'moveSuccessorToEarliestDate', link, moved)]),
    deleteChoiceOf(link, EMPTY),
  ]
  const openField = field(ends.successor.uid, 'PR-3')
  return [draftOf({ fixType: 'choose', other: link.predecessorUid, before: linksValue([link]), choices, openField, related: [link.predecessorUid] })]
}

// see FA-16, VS-1
/** @purity pure */
function parentChildLinkDrafts(context: FixContext, finding: DelayFinding): readonly FixDraft[] {
  const successor = context.byUid.get(finding.uid)
  const link = successor === undefined ? null : linkFrom(successor, numberIn(finding, 'predecessorUid'))
  if (link === null) return []
  const choices = [deleteChoiceOf(link, EMPTY)]
  return [draftOf({ fixType: 'choose', other: link.predecessorUid, before: linksValue([link]), choices, related: [link.predecessorUid] })]
}

// see FA-17, VS-2, PR-15
/** @purity pure */
function milestoneChildrenDrafts(_context: FixContext, finding: DelayFinding): readonly FixDraft[] {
  const children = numbersIn(finding, 'childUids')
  const only = children.length === 1 ? children[0] : undefined
  return [draftOf({ openField: only === undefined ? null : field(only, 'PR-15'), related: children })]
}

// see FA-18, VS-3
/** @purity pure */
function predecessorStartDrafts(context: FixContext, finding: DelayFinding): readonly FixDraft[] {
  const ends = linkEndsOf(context, finding)
  if (ends === null) return []
  const { predecessor, successor } = ends
  if (predecessor.actualStart !== null) return []
  const suggested = earlierDay(dayOf(successor.actualStart), dayOf(predecessor.start))
  return [{ ...suggestedStartDraft(context, predecessor, suggested), other: predecessor.uid, related: [predecessor.uid] }]
}

// see FA-19, VS-4
/** @purity pure */
function linkActualDrafts(_context: FixContext, finding: DelayFinding): readonly FixDraft[] {
  const predecessorUid = numberIn(finding, 'predecessorUid')
  const column = bindsSuccessorStart(numberIn(finding, 'linkType')) ? 'PR-4' : 'PR-6'
  const related = predecessorUid === null ? NO_UIDS : [predecessorUid]
  return [draftOf({ other: predecessorUid, openField: field(finding.uid, column), related })]
}

// see FA-20, VS-5, CM-3
/** @purity pure */
function statusDateDrafts(context: FixContext, finding: DelayFinding): readonly FixDraft[] {
  const task = context.byUid.get(finding.uid)
  const status = context.schedule.project.statusDate
  const day = task === undefined ? null : dayOf(extremeText([task.actualStart, task.stop, task.actualFinish], true))
  if (day === null || compareDates(textOfDay(day), status) <= 0) return []
  const date = onDay(status, day, textOfDay(day))
  const choices = [choiceOf('moveStatusDateToActual', 'moveStatusDateToActual', { date }, {
    after: dateValue(date), commands: [{ kind: 'setStatusDate', date }],
  })]
  return [draftOf({ fixType: 'choose', before: dateValue(status), choices })]
}

// see VS-6
/** @purity pure */
function descendantsOf(context: FixContext, uid: number): readonly number[] {
  const reached = reachFrom(uid, (at) => uidsOf(context.childrenOf.get(at) ?? []))
  return [...reached].filter((one) => one !== uid)
}

// see FA-21, VS-6
/** @purity pure */
function progressSpreadDrafts(context: FixContext, finding: DelayFinding): readonly FixDraft[] {
  return [draftOf({ related: descendantsOf(context, finding.uid) })]
}

// see FA-23, VO-2
/** @purity pure */
function unfinishedDrafts(context: FixContext, finding: DelayFinding): readonly FixDraft[] {
  const task = context.byUid.get(finding.uid)
  const statusDay = dayOf(context.schedule.project.statusDate)
  if (task === undefined || task.actualFinish !== null || task.stop !== null) return []
  const finished = actualsOutcome(task, { actualFinish: task.finish }, dateValue(task.finish))
  const stop = statusDay === null ? null : finishSideOn(context, task.stop ?? task.finish, statusDay)
  const working = stop === null ? null : actualsOutcome(task, { stop }, dateValue(stop))
  const choices = [
    ...(finished === null || task.finish === null ? [] : [choiceOf('markAsFinished', 'markAsFinished', {}, finished)]),
    ...(working === null ? [] : [choiceOf('markAsStillInProgress', 'markAsStillInProgress', {}, working)]),
  ]
  const openField = field(task.uid, 'PR-6')
  return [draftOf({ fixType: 'choose', column: 'PR-6', before: dateValue(task.actualFinish), choices, openField })]
}

// see FA-24, VO-3
/** @purity pure */
function finishOmissionDrafts(context: FixContext, finding: DelayFinding): readonly FixDraft[] {
  const task = openTaskOf(context, finding.uid)
  if (task === null) return []
  const started = tasksOf(context, context.successorsOf.get(task.uid) ?? NO_UIDS)
    .filter((one) => one.actualStart !== null && one.dependencies
      .some((link) => link.predecessorUid === task.uid && link.linkType === FINISH_TO_START))
  const earliest = dayOf(endOf(started, 'actualStart', false))
  const suggested = earliest === null ? null : laterDay(earliest, dayOf(task.actualStart))
  const successorUid = numberIn(finding, 'successorUid')
  return [draftOf({
    fixType: 'suggestedDate',
    column: 'PR-6',
    other: successorUid,
    before: dateValue(task.actualFinish),
    suggested,
    outcomeOn: (day) => actualFinishOn(context, task, day),
    openField: field(task.uid, 'PR-6'),
    related: successorUid === null ? NO_UIDS : [successorUid],
  })]
}

// see FA-25, VO-4, PR-15
/** @purity pure */
function undecidedParentDrafts(_context: FixContext, finding: DelayFinding): readonly FixDraft[] {
  return [draftOf({ openField: field(finding.uid, 'PR-15'), related: numbersIn(finding, 'candidateUids') })]
}

// see FA-26, VO-5, MP-4, PR-36
/** @purity pure */
function achievedDrafts(context: FixContext, finding: DelayFinding): readonly FixDraft[] {
  const task = openTaskOf(context, finding.uid)
  const achieved = finding.proposedActualFinish
  const day = dayOf(achieved)
  if (task === null) return []
  const outcome = day === null || achieved === null ? null
    : actualsOutcome(task, { actualStart: startSideOn(context, task, achieved, day), actualFinish: achieved }, dateValue(achieved))
  return [draftOf({ fixType: 'automatic', column: 'PR-36', before: dateValue(task.actualFinish), outcome })]
}

interface FixWay {
  readonly fixRow: string
  readonly build: FixBuilder
}

// see T-373, T-310
/** @purity pure */
function contradictionWayOf(findingRow: string): FixWay | null {
  switch (findingRow) {
    case 'VC-1': return { fixRow: 'FA-1', build: ringDrafts }
    case 'VC-2': return { fixRow: 'FA-2', build: selfLinkDrafts }
    case 'VC-3': return { fixRow: 'FA-3', build: duplicateDrafts }
    case 'VC-4': return { fixRow: 'FA-4', build: milestoneDateDrafts }
    case 'VC-5': return { fixRow: 'FA-5', build: actualStartDrafts }
    case 'VC-6': return { fixRow: 'FA-6', build: actualStartDrafts }
    case 'VC-7': return { fixRow: 'FA-7', build: pauseDrafts }
    case 'VC-8': return { fixRow: 'FA-8', build: resumeValidDrafts }
    case 'VC-9': return { fixRow: 'FA-9', build: parentFinishedDrafts }
    case 'VC-10': return { fixRow: 'FA-10', build: parentUnfinishedDrafts }
    case 'VC-11': return { fixRow: 'FA-11', build: parentPlanDrafts }
    case 'VC-12': return { fixRow: 'FA-12', build: parentActualDrafts }
    case 'VC-13': return { fixRow: 'FA-13', build: bindingEndDrafts }
    case 'VC-14': return { fixRow: 'FA-14', build: milestoneActualDrafts }
    case 'VC-15': return { fixRow: 'FA-15', build: planLinkDrafts }
    default: return null
  }
}

// see T-373, T-311, T-312
/** @purity pure */
function suspicionOrOmissionWayOf(findingRow: string): FixWay | null {
  switch (findingRow) {
    case 'VS-1': return { fixRow: 'FA-16', build: parentChildLinkDrafts }
    case 'VS-2': return { fixRow: 'FA-17', build: milestoneChildrenDrafts }
    case 'VS-3': return { fixRow: 'FA-18', build: predecessorStartDrafts }
    case 'VS-4': return { fixRow: 'FA-19', build: linkActualDrafts }
    case 'VS-5': return { fixRow: 'FA-20', build: statusDateDrafts }
    case 'VS-6': return { fixRow: 'FA-21', build: progressSpreadDrafts }
    case 'VO-1': return { fixRow: 'FA-22', build: notStartedDrafts }
    case 'VO-2': return { fixRow: 'FA-23', build: unfinishedDrafts }
    case 'VO-3': return { fixRow: 'FA-24', build: finishOmissionDrafts }
    case 'VO-4': return { fixRow: 'FA-25', build: undecidedParentDrafts }
    case 'VO-5': return { fixRow: 'FA-26', build: achievedDrafts }
    default: return null
  }
}

/** @purity pure */
function fixWayOf(findingRow: string): FixWay | null {
  return contradictionWayOf(findingRow) ?? suspicionOrOmissionWayOf(findingRow)
}

// see T-373
// WHY: only a finding whose fix can be 'automatic' joins a chain; the person fixes the rest after a new diagnosis.
const CHAINING_FINDING_ROWS: ReadonlySet<string> = new Set(['VC-2', 'VC-3', 'VC-8', 'VC-10', 'VC-11', 'VC-12', 'VO-5'])

/** @purity pure */
function otherEndOf(finding: DelayFinding): number | null {
  return numberIn(finding, 'predecessorUid') ?? numberIn(finding, 'successorUid')
}

/** @purity pure */
function findingKeyOf(finding: DelayFinding): string {
  return `${finding.row}:${finding.uid}:${otherEndOf(finding) ?? '-'}`
}

// see RW-16
/** @purity pure */
function rowKeyOf(finding: DelayFinding, draft: FixDraft): string {
  return `${finding.row}:${finding.uid}:${draft.column ?? '-'}:${draft.other ?? '-'}`
}

/** @purity pure */
function possibleOutcomesOf(draft: FixDraft): readonly FixOutcome[] {
  const suggested = draft.suggested === null ? null : draft.outcomeOn?.(draft.suggested) ?? null
  return [...(draft.outcome === null ? [] : [draft.outcome]), ...draft.choices, ...(suggested === null ? [] : [suggested])]
}

// see T-373, GP-1
/** @purity pure */
function isReadOnly(context: FixContext, draft: FixDraft): boolean {
  return possibleOutcomesOf(draft).some((outcome) => outcome.commands
    .some((command) => writtenUidsOf(command).some((uid) => context.readOnlyUids.has(uid))))
}

/** @purity pure */
function chosenOf(draft: FixDraft, check: DelayFixCheck | null): DelayFixChoice | null {
  return draft.fixType === 'choose' ? draft.choices.find((one) => one.key === check?.choice) ?? null : null
}

// see FM-8, RW-16
/** @purity pure */
function outcomeOf(draft: FixDraft, chosen: DelayFixChoice | null, check: DelayFixCheck | null): FixOutcome | null {
  switch (draft.fixType) {
    case 'automatic':
      return draft.outcome
    case 'choose':
      return chosen
    case 'suggestedDate': {
      const day = dayOf(check?.date ?? null) ?? draft.suggested
      return day === null ? null : draft.outcomeOn?.(day) ?? null
    }
    case 'byHand':
      return null
  }
}

/** @purity pure */
function depthOf(context: FixContext, uid: number): number {
  let depth = 0
  for (let at = context.byUid.get(uid)?.parentTaskUid ?? null; at !== null && depth < context.byUid.size; depth += 1) {
    at = context.byUid.get(at)?.parentTaskUid ?? null
  }
  return depth
}

// see T-373, FM-1, RW-16
/** @purity pure */
function rowOf(context: FixContext, seed: Seed, draft: FixDraft, check: DelayFixCheck | null): Omit<DelayFixRow, 'applyOrder'> {
  const { finding } = seed
  const chosen = chosenOf(draft, check)
  const outcome = outcomeOf(draft, chosen, check)
  const refusal: DelayFixRefusal | null = isReadOnly(context, draft) ? 'readOnly' : null
  const isCheckable = refusal === null && outcome !== null
  return {
    key: rowKeyOf(finding, draft),
    fixRow: fixWayOf(finding.row)?.fixRow ?? '',
    findingRow: finding.row,
    taskUid: finding.uid,
    taskName: context.byUid.get(finding.uid)?.name ?? null,
    column: draft.column,
    before: draft.before,
    after: outcome?.after ?? null,
    fixType: draft.fixType,
    choices: draft.choices,
    chosen: chosen?.key ?? null,
    suggested: draft.suggested === null ? null : textOfDay(draft.suggested),
    checked: isCheckable && (check?.checked ?? draft.fixType !== 'suggestedDate'),
    isCheckable,
    causedBy: seed.causedBy,
    refusal,
    openField: draft.openField,
    relatedTaskUids: draft.related,
    layer: finding.layer,
    depth: depthOf(context, finding.uid),
    commands: outcome?.commands ?? [],
  }
}

/** @purity pure */
function draftsOf(context: FixContext, seed: Seed): readonly FixDraft[] {
  return fixWayOf(seed.finding.row)?.build(context, seed.finding) ?? []
}

/** @purity pure */
function settleColumn(rules: SettleRules, settled: Settled, seed: Seed, column: string | null): Settled {
  const context = contextOf(settled.schedule, rules.calendar)
  const draft = draftsOf(context, seed).find((one) => one.column === column)
  if (draft === undefined || (seed.causedBy !== null && draft.fixType !== 'automatic')) return settled
  const resolved = rowOf(context, seed, draft, rules.checks.get(rowKeyOf(seed.finding, draft)) ?? null)
  const row: DelayFixRow = { ...resolved, applyOrder: settled.rows.length }
  if (!rules.applies(row)) return withRowShown(settled, row)
  const schedule = row.commands.reduce(scheduleAfter, settled.schedule)
  return { schedule, rows: [...settled.rows, row], applied: [...settled.applied, row] }
}

// WHY: a finding with two columns (FA-11, FA-12) is built again after its first column is applied, so the second
// command carries the first column's new value.
/** @purity pure */
function settleSeed(rules: SettleRules, settled: Settled, seed: Seed): Settled {
  const columns = draftsOf(contextOf(settled.schedule, rules.calendar), seed).map((draft) => draft.column)
  if (columns.length === 0) return settleCovered(rules, settled, seed)
  return columns.reduce((held, column) => settleColumn(rules, held, seed, column), settled)
}

// see FR-155, DX-3, T-373
// WHY: one row for each finding of the report: a machine finding an earlier applied row already mended (VC-12 after
// FA-10 on the same parent) keeps its row, under that row, checked with it and with no command of its own.
/** @purity pure */
function settleCovered(rules: SettleRules, settled: Settled, seed: Seed): Settled {
  const cause = causeOf(seed.finding, settled.applied)
  if (seed.causedBy !== null || settled.applied.length === 0 || cause === null) return settled
  const original = contextOf(rules.original, rules.calendar)
  const draft = draftsOf(original, seed)[0]
  if (draft === undefined || draft.fixType !== 'automatic') return settled
  const row = { ...rowOf(original, seed, draft, null), causedBy: cause, checked: true, isCheckable: false, commands: [] }
  return withRowShown(settled, { ...row, applyOrder: settled.rows.length })
}

/** @purity pure */
function withRowShown(settled: Settled, row: DelayFixRow): Settled {
  return { ...settled, rows: [...settled.rows, row] }
}

// see T-373
// WHY: table T-312 gives no layer, so those findings go last rather than first.
/** @purity pure */
function inApplyOrder(seeds: readonly Seed[], context: FixContext): readonly Seed[] {
  const layerOf = (seed: Seed): number => seed.finding.layer ?? Number.POSITIVE_INFINITY
  return seeds
    .map((seed) => ({ seed, depth: depthOf(context, seed.finding.uid) }))
    .sort((a, b) => layerOf(a.seed) - layerOf(b.seed) || b.depth - a.depth)
    .map((one) => one.seed)
}

/** @purity pure */
function touchedUidsOf(row: DelayFixRow): ReadonlySet<number> {
  return new Set(row.commands.flatMap((command) =>
    command.kind === 'deleteDependency' ? [command.predecessorUid, command.successorUid] : writtenUidsOf(command)))
}

// see FR-155
// WHY: the last applied row that wrote the finding's Task or one it names; else the last applied row.
/** @purity pure */
function causeOf(finding: DelayFinding, applied: readonly DelayFixRow[]): string | null {
  const named = new Set([finding.uid, ...numbersIn(finding, 'childUids'), ...numbersIn(finding, 'predecessorUids'),
    ...[otherEndOf(finding)].filter((one): one is number => one !== null)])
  const cause = [...applied].reverse().find((row) => [...touchedUidsOf(row)].some((uid) => named.has(uid)))
  return (cause ?? applied.at(-1))?.key ?? null
}

/** @purity pure */
function chainSeedsOf(rules: SettleRules, settled: Settled, seen: ReadonlySet<string>): readonly Seed[] {
  if (settled.applied.length === 0) return []
  const found = diagnoseDelay({ schedule: settled.schedule }, rules.calendar).findings
    .filter((finding) => CHAINING_FINDING_ROWS.has(finding.row) && !seen.has(findingKeyOf(finding)))
  const seeds = found.map((finding) => ({ finding, causedBy: causeOf(finding, settled.applied) }))
  return inApplyOrder(seeds, contextOf(settled.schedule, rules.calendar))
}

// see T-373
/** @purity pure */
function passLimitOf(schedule: Schedule): number {
  return schedule.tasks.reduce((sum, task) => sum + 1 + task.dependencies.length, 0)
}

/** @purity pure */
function settledRows(rules: SettleRules, schedule: Schedule, seeds: readonly Seed[]): readonly DelayFixRow[] {
  const seen = new Set(seeds.map((seed) => findingKeyOf(seed.finding)))
  let settled: Settled = { schedule, rows: [], applied: [] }
  let pass = inApplyOrder(seeds, contextOf(schedule, rules.calendar))
  for (let count = 0; pass.length > 0 && count <= passLimitOf(schedule); count += 1) {
    settled = pass.reduce<Settled>((held, seed) => settleSeed(rules, held, seed), { ...settled, applied: [] })
    pass = chainSeedsOf(rules, settled, seen)
    for (const seed of pass) seen.add(findingKeyOf(seed.finding))
  }
  return settled.rows
}

/** @purity pure */
function isIssued(row: DelayFixRow): boolean {
  return row.checked && row.isCheckable
}

// WHY: an 'automatic' row the person unchecked; its chain is found by applying it anyway, then shown unpressable.
/** @purity pure */
function isWithheld(row: DelayFixRow): boolean {
  return row.fixType === 'automatic' && row.isCheckable && !row.checked
}

// see RW-16
/** @purity pure */
function withheldChainsOf(settled: readonly DelayFixRow[], discovered: readonly DelayFixRow[]): readonly DelayFixRow[] {
  const keys = new Set(settled.map((row) => row.key))
  return discovered
    .filter((row) => row.causedBy !== null && !keys.has(row.key))
    .map((row, at) => ({ ...row, checked: false, isCheckable: false, commands: [], applyOrder: settled.length + at }))
}

// see FR-155, T-373, DX-11, RW-16
/** @purity pure */
export function proposeDelayFixes(
  document: { readonly schedule: Schedule },
  report: DelayDiagnosticsReport,
  checks: readonly DelayFixCheck[],
): readonly DelayFixRow[] {
  if (report.outcome !== 'diagnosed') return []
  const rules = {
    original: document.schedule,
    calendar: workingCalendarOf(document.schedule),
    checks: new Map(checks.map((one) => [one.key, one])),
  }
  const seeds = report.findings.map((finding) => ({ finding, causedBy: null }))
  const settled = settledRows({ ...rules, applies: isIssued }, document.schedule, seeds)
  if (!settled.some(isWithheld)) return settled
  const discovered = settledRows({ ...rules, applies: (row) => isIssued(row) || isWithheld(row) }, document.schedule, seeds)
  return [...settled, ...withheldChainsOf(settled, discovered)]
}

// see FR-155, UN-21
/** @purity pure */
export function delayFixCommands(rows: readonly DelayFixRow[]): readonly DelayFixCommand[] {
  return rows.filter(isIssued).sort((a, b) => a.applyOrder - b.applyOrder).flatMap((row) => row.commands)
}

// see DX-12, FM-2
/** @purity pure */
export function delayFixLogRowsOf(rows: readonly DelayFixRow[], fixedAt: string): readonly DelayFixLogRow[] {
  return rows.filter(isIssued).sort((a, b) => a.applyOrder - b.applyOrder).map((row, order) => ({
    fixedAt,
    order,
    fixRow: row.fixRow,
    findingRow: row.findingRow,
    taskUid: row.taskUid,
    taskName: row.taskName,
    column: row.column,
    before: row.before,
    after: row.after ?? EMPTY,
    isCascade: row.causedBy !== null,
  }))
}
