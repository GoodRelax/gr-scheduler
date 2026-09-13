// Opens a file into the document or merges one in; a person's answers arrive as arguments.
// @unit      UF-19   (docs/spec/05-07-design.md, table T-075)
// @component ImportDocument, layer UseCase (table T-062)
// @purity    pure
// @publishes table T-064 row PI-10

import type { Document } from '../../entity/document-model/document/document'
import type { DocumentSettings } from '../../entity/document-model/document-settings/document-settings'
import type {
  Assignment,
  BaselineTask,
  Calendar,
  CommentBox,
  Dependency,
  HighlightBox,
  Project,
  Resource,
  Schedule,
  Task,
  TaskGroup,
  TaskOrigin,
} from '../../entity/document-model/schedule/schedule'

export type ImportFormat = 'grsJson' | 'mspdi'

export type OpenChoice = 'replace' | 'merge' | 'baseline'

export type ConflictChoice = 'overwrite' | 'keepExisting' | 'cancelImport'

export type TaskMapping = 'same' | 'different'

export interface TaskMappingDecision {
  readonly incomingTaskUid: number
  readonly mapping: TaskMapping
}

// see T-032a, MM-3, MG-9
export type MergeMapping =
  | { readonly kind: 'allSame' }
  | { readonly kind: 'allDifferent' }
  | {
      readonly kind: 'eachCandidate'
      readonly decisions: readonly TaskMappingDecision[]
      readonly rest: TaskMapping | null
    }
  | { readonly kind: 'cancelImport' }

// see FR-022, MG-4, MG-12
export interface MergeChoices {
  readonly mapping: MergeMapping | null
  readonly profileConflict: ConflictChoice | null
  readonly settingsConflict: ConflictChoice | null
}

// see T-024a, OP-4, OP-5, OP-8
export interface ImportRequest {
  readonly current: Document
  readonly incoming: Document
  readonly format: ImportFormat
  readonly choice: OpenChoice
  readonly validationPassed: boolean
  readonly anotherOpenInProgress: boolean
  readonly unsavedEditsDiscardConfirmed: boolean
  readonly merge: MergeChoices | null
  readonly defaultSettings: DocumentSettings
  readonly importSessionId: string
}

// see FR-022, MG-10
export interface MergeCandidate {
  readonly incomingTaskUid: number
  readonly incomingTaskName: string | null
  readonly currentTaskUid: number
  readonly currentTaskName: string | null
}

export type SourceJudgement = 'sameMaster' | 'differentMaster' | 'undecidable' | 'notJudged'

// see T-024a, T-032
export type ImportRefusal =
  | { readonly reason: 'openInProgress'; readonly rule: 'OP-8'; readonly what: string }
  | { readonly reason: 'notValidated'; readonly rule: 'OP-5'; readonly what: string }
  | { readonly reason: 'unsavedEditsNotConfirmed'; readonly rule: 'OP-4'; readonly what: string }
  | { readonly reason: 'importCancelled'; readonly rule: 'MG-6'; readonly what: string }
  | {
      readonly reason: 'mappingNotChosen'
      readonly rule: 'FR-022'
      readonly what: string
      readonly candidates: readonly MergeCandidate[]
    }
  | {
      readonly reason: 'candidateNotDecided'
      readonly rule: 'MM-3'
      readonly what: string
      readonly candidates: readonly MergeCandidate[]
    }
  | {
      readonly reason: 'profileConflictNotChosen'
      readonly rule: 'MG-4'
      readonly what: string
      readonly rows: readonly string[]
    }
  | {
      readonly reason: 'settingsConflictNotChosen'
      readonly rule: 'MG-12'
      readonly what: string
      readonly keys: readonly string[]
    }

export type UndoDisposition = 'oneStep' | 'notUndoable' | 'notDecided'

export interface AddedAsDifferent {
  readonly incomingTaskUid: number
  readonly taskUid: number
}

// see T-050, IV-2
export interface DroppedReference {
  readonly what:
    | 'dependency'
    | 'assignment'
    | 'commentBox'
    | 'highlightBox'
    | 'wbsParent'
    | 'calendar'
  readonly owner: string
  readonly missing: string
}

// see OP-10, MG-7, MG-11, FR-015
export interface ImportReport {
  readonly choice: OpenChoice
  readonly undo: UndoDisposition
  readonly discardsHistory: boolean
  readonly fitToScreenRequired: boolean
  readonly source: SourceJudgement
  readonly importSeq: number
  readonly candidates: readonly MergeCandidate[]
  readonly overwrittenTaskUids: readonly number[]
  readonly addedTaskUids: readonly number[]
  readonly addedAsDifferent: readonly AddedAsDifferent[]
  readonly taskUidsOnlyInCurrent: readonly number[]
  readonly taskUidsMissingSinceLastImport: readonly number[]
  readonly taskUidsWithoutRow: readonly number[]
  readonly baselineTaskUidsNotDrawn: readonly number[]
  readonly droppedReferences: readonly DroppedReference[]
}

export type ImportOutcome =
  | { readonly ok: false; readonly refusal: ImportRefusal }
  | { readonly ok: true; readonly document: Document; readonly report: ImportReport }

// see T-224, MG-4
const PROFILE_COLUMNS: readonly { readonly row: string; readonly key: keyof Project }[] = [
  { row: 'PF-1', key: 'name' },
  { row: 'PF-2', key: 'subject' },
  { row: 'PF-3', key: 'category' },
  { row: 'PF-4', key: 'company' },
  { row: 'PF-5', key: 'manager' },
  { row: 'PF-6', key: 'author' },
  { row: 'PF-7', key: 'revision' },
  { row: 'PF-8', key: 'startDate' },
  // WHY: PF-9 and PF-10 are asked about too; narrowing to editable rows would be this file deciding.
  { row: 'PF-9', key: 'created' },
  { row: 'PF-10', key: 'lastSaved' },
]

/** @purity pure */
function canonicalText(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'undefined'
  if (Array.isArray(value)) return `[${value.map(canonicalText).join(',')}]`
  const held = value as Record<string, unknown>
  return `{${Object.keys(held)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalText(held[key])}`)
    .join(',')}}`
}

/** @purity pure */
function indexBy<T, K>(rows: readonly T[], keyOf: (row: T) => K): Map<K, T> {
  const map = new Map<K, T>()
  for (const row of rows) {
    const key = keyOf(row)
    if (!map.has(key)) map.set(key, row)
  }
  return map
}

/** @purity pure */
function keyedRows<T>(rows: readonly T[], keyOf: (row: T) => number): Map<number, T> {
  return indexBy(rows, keyOf)
}

/** @purity pure */
function originKey(sourceProjectUid: string | null, sourceUid: number): string {
  return `${sourceProjectUid ?? ''} ${sourceUid}`
}

/** @purity pure */
function assignmentKey(taskUid: number | null, resourceUid: number | null): string {
  return `${taskUid ?? ''} ${resourceUid ?? ''}`
}

// see MG-5
// WHY: carry is compared too, because FR-021's round trip makes it content.
/** @purity pure */
function calendarContentKey(calendar: Calendar): string {
  const { uid: _uid, ordinal: _ordinal, ...content } = calendar
  return canonicalText(content)
}

// see OP-6
/** @purity pure */
function restoredSettings(fromFile: DocumentSettings, defaults: DocumentSettings): DocumentSettings {
  return { ...defaults, ...fromFile }
}

// see OP-10
// TRAP: null means no place chosen yet; OP-6's defaulting must not fill it.
/** @purity pure */
function fitToScreenRequired(document: Document): boolean {
  const { scrollDate, scrollGroupId } = document.documentSettings
  if (scrollDate === null || scrollGroupId === null) return true
  return !document.schedule.taskGroups.some((group) => group.id === scrollGroupId)
}

/** @purity pure */
function refuse(refusal: ImportRefusal): ImportOutcome {
  return { ok: false, refusal }
}

/** @purity pure */
function emptyReport(choice: OpenChoice, importSeq: number): ImportReport {
  return {
    choice,
    undo: 'notDecided',
    discardsHistory: false,
    fitToScreenRequired: false,
    source: 'notJudged',
    importSeq,
    candidates: [],
    overwrittenTaskUids: [],
    addedTaskUids: [],
    addedAsDifferent: [],
    taskUidsOnlyInCurrent: [],
    taskUidsMissingSinceLastImport: [],
    taskUidsWithoutRow: [],
    baselineTaskUidsNotDrawn: [],
    droppedReferences: [],
  }
}

/** @purity pure */
function answersOf(request: ImportRequest): MergeChoices {
  return request.merge ?? { mapping: null, profileConflict: null, settingsConflict: null }
}

// see T-024a, OP-3, OP-5, OP-8
/** @purity pure */
export function importDocument(request: ImportRequest): ImportOutcome {
  if (request.anotherOpenInProgress) {
    return refuse({
      reason: 'openInProgress',
      rule: 'OP-8',
      what: 'another open or import is still running',
    })
  }

  if (!request.validationPassed) {
    return refuse({
      reason: 'notValidated',
      rule: 'OP-5',
      what: "FR-023's validation has not passed; nothing may be applied, not even in part",
    })
  }

  switch (request.choice) {
    case 'replace':
      return replacedDocument(request)
    case 'merge':
      return mergedDocument(request)
    case 'baseline':
      return baselinedDocument(request)
  }
}

// see OP-3, OP-4, OP-6, FR-021
/** @purity pure */
function replacedDocument(request: ImportRequest): ImportOutcome {
  if (!request.unsavedEditsDiscardConfirmed) {
    return refuse({
      reason: 'unsavedEditsNotConfirmed',
      rule: 'OP-4',
      what: 'the current document may not be discarded until the person has confirmed',
    })
  }

  // STOP: spec does not decide whose presentation group a replaced-in MSPDI takes. Looked in OP-6
  const document: Document = {
    ...request.incoming,
    documentSettings: restoredSettings(request.incoming.documentSettings, request.defaultSettings),
  }

  // STOP: spec does not decide whether a replace advances importSeq. Looked in MG-13, T-032, FR-056
  return {
    ok: true,
    document,
    report: {
      ...emptyReport('replace', document.schedule.project.importSeq),
      undo: 'notUndoable',
      discardsHistory: true,
      fitToScreenRequired: fitToScreenRequired(document),
    },
  }
}

// see OP-9, FR-015
/** @purity pure */
function baselinedDocument(request: ImportRequest): ImportOutcome {
  const currentTaskUids = new Set(request.current.schedule.tasks.map((task) => task.uid))
  const baselineTasks: BaselineTask[] = []
  const notDrawn: number[] = []

  for (const task of request.incoming.schedule.tasks) {
    if (!currentTaskUids.has(task.uid)) {
      notDrawn.push(task.uid)
      continue
    }
    baselineTasks.push({
      uid: task.uid,
      name: task.name,
      start: task.start,
      finish: task.finish,
      milestone: task.milestone,
    })
  }

  const document: Document = {
    ...request.current,
    schedule: { ...request.current.schedule, baselineTasks },
  }

  return {
    ok: true,
    document,
    report: {
      ...emptyReport('baseline', document.schedule.project.importSeq),
      // STOP: spec does not decide whether an overlay import is undoable. Looked in T-027, UN-6
      undo: 'notDecided',
      fitToScreenRequired: fitToScreenRequired(document),
      baselineTaskUidsNotDrawn: notDrawn,
    },
  }
}

interface CurrentIndex {
  readonly taskByUid: ReadonlyMap<number, Task>
  readonly taskUidByOrigin: ReadonlyMap<string, number>
  readonly originByTaskUid: ReadonlyMap<number, TaskOrigin>
  readonly sourceProjectUids: ReadonlySet<string>
  readonly calendarUidByContent: ReadonlyMap<string, number>
  readonly resourceUidByName: ReadonlyMap<string, number>
  readonly commentBoxIds: ReadonlySet<string>
  readonly highlightBoxIds: ReadonlySet<string>
}

/** @purity pure */
function currentIndexOf(schedule: Schedule): CurrentIndex {
  const taskUidByOrigin = new Map<string, number>()
  const sourceProjectUids = new Set<string>()
  for (const origin of schedule.taskOrigins) {
    const key = originKey(origin.sourceProjectUid, origin.sourceUid)
    if (!taskUidByOrigin.has(key)) taskUidByOrigin.set(key, origin.taskUid)
    if (origin.sourceProjectUid !== null) sourceProjectUids.add(origin.sourceProjectUid)
  }

  const calendarUidByContent = new Map<string, number>()
  for (const calendar of schedule.calendars) {
    const key = calendarContentKey(calendar)
    if (!calendarUidByContent.has(key)) calendarUidByContent.set(key, calendar.uid)
  }

  const resourceUidByName = new Map<string, number>()
  for (const resource of schedule.resources) {
    if (resource.name === null) continue
    if (!resourceUidByName.has(resource.name)) resourceUidByName.set(resource.name, resource.uid)
  }

  return {
    taskByUid: indexBy(schedule.tasks, (task) => task.uid),
    taskUidByOrigin,
    originByTaskUid: indexBy(schedule.taskOrigins, (origin) => origin.taskUid),
    sourceProjectUids,
    calendarUidByContent,
    resourceUidByName,
    commentBoxIds: new Set(schedule.commentBoxes.map((box) => box.id)),
    highlightBoxIds: new Set(schedule.highlightBoxes.map((box) => box.id)),
  }
}

// see MG-1, AT-1
/** @purity pure */
function judgedSource(incoming: Project, index: CurrentIndex): SourceJudgement {
  if (incoming.id === null) return 'undecidable'
  return index.sourceProjectUids.has(incoming.id) ? 'sameMaster' : 'differentMaster'
}

type IncomingPlan =
  | { readonly kind: 'carried'; readonly currentTaskUid: number }
  | { readonly kind: 'candidate'; readonly currentTaskUid: number }
  | { readonly kind: 'fresh' }

// see MG-3, FR-022
// TRAP: match origins only for the same master, or a different master becomes a silent identity.
/** @purity pure */
function plannedIncomingTasks(
  incoming: Schedule,
  index: CurrentIndex,
  source: SourceJudgement,
): Map<number, IncomingPlan> {
  const plans = new Map<number, IncomingPlan>()
  for (const task of incoming.tasks) {
    if (source === 'sameMaster') {
      const carried = index.taskUidByOrigin.get(originKey(incoming.project.id, task.uid))
      if (carried !== undefined && index.taskByUid.has(carried)) {
        plans.set(task.uid, { kind: 'carried', currentTaskUid: carried })
        continue
      }
    }
    if (index.taskByUid.has(task.uid)) {
      plans.set(task.uid, { kind: 'candidate', currentTaskUid: task.uid })
      continue
    }
    plans.set(task.uid, { kind: 'fresh' })
  }
  return plans
}

type ChosenMapping = Exclude<MergeMapping, { readonly kind: 'cancelImport' }>

// see T-032a
/** @purity pure */
function resolvedMapping(
  mapping: ChosenMapping,
  candidates: readonly MergeCandidate[],
): {
  readonly decided: ReadonlyMap<number, TaskMapping>
  readonly undecided: readonly MergeCandidate[]
} {
  const decided = new Map<number, TaskMapping>()
  const undecided: MergeCandidate[] = []

  if (mapping.kind !== 'eachCandidate') {
    const one: TaskMapping = mapping.kind === 'allSame' ? 'same' : 'different'
    for (const candidate of candidates) decided.set(candidate.incomingTaskUid, one)
    return { decided, undecided }
  }

  const answers = indexBy(mapping.decisions, (decision) => decision.incomingTaskUid)
  for (const candidate of candidates) {
    const answer = answers.get(candidate.incomingTaskUid)?.mapping ?? mapping.rest
    if (answer === null) {
      undecided.push(candidate)
      continue
    }
    decided.set(candidate.incomingTaskUid, answer)
  }
  return { decided, undecided }
}

// see MG-4, T-224
/** @purity pure */
function conflictingProfileRows(current: Project, incoming: Project): readonly string[] {
  const rows: string[] = []
  for (const column of PROFILE_COLUMNS) {
    const mine = current[column.key]
    const theirs = incoming[column.key]
    if (mine === null || theirs === null) continue
    if (canonicalText(mine) !== canonicalText(theirs)) rows.push(column.row)
  }
  return rows
}

// see MG-12, OP-6
/** @purity pure */
function conflictingSettingsKeys(
  current: DocumentSettings,
  incoming: DocumentSettings,
): readonly string[] {
  const mine = current as unknown as Record<string, unknown>
  const theirs = incoming as unknown as Record<string, unknown>
  const differing: string[] = []
  for (const key of new Set([...Object.keys(mine), ...Object.keys(theirs)])) {
    if (!(key in mine) || !(key in theirs)) continue
    if (canonicalText(mine[key]) !== canonicalText(theirs[key])) differing.push(key)
  }
  return differing.sort()
}

// see IV-1, AT-20
// WHY: every row is scanned; an imported uidHighWaterMark may be lower than its rows.
/** @purity pure */
function highWaterOf(current: Schedule, incoming: Schedule): number {
  let top = Math.max(current.project.uidHighWaterMark, incoming.project.uidHighWaterMark)
  for (const schedule of [current, incoming]) {
    for (const task of schedule.tasks) top = Math.max(top, task.uid)
    for (const resource of schedule.resources) top = Math.max(top, resource.uid)
    for (const assignment of schedule.assignments) top = Math.max(top, assignment.uid)
    for (const calendar of schedule.calendars) top = Math.max(top, calendar.uid)
  }
  return top
}

// see T-032, MG-6
/** @purity pure */
function mergedDocument(request: ImportRequest): ImportOutcome {
  const current = request.current.schedule
  const incoming = request.incoming.schedule
  const answers = answersOf(request)
  const mapping = answers.mapping

  if (mapping !== null && mapping.kind === 'cancelImport') {
    return refuse({
      reason: 'importCancelled',
      rule: 'MG-6',
      what: 'MM-4: the person stopped the import',
    })
  }
  if (answers.profileConflict === 'cancelImport' || answers.settingsConflict === 'cancelImport') {
    return refuse({
      reason: 'importCancelled',
      rule: 'MG-6',
      what: 'MG-4: the person stopped the import',
    })
  }

  const index = currentIndexOf(current)
  const source = judgedSource(incoming.project, index)
  const plans = plannedIncomingTasks(incoming, index, source)

  const candidates: MergeCandidate[] = []
  for (const task of incoming.tasks) {
    const plan = plans.get(task.uid)
    if (plan === undefined || plan.kind !== 'candidate') continue
    candidates.push({
      incomingTaskUid: task.uid,
      incomingTaskName: task.name,
      currentTaskUid: plan.currentTaskUid,
      currentTaskName: index.taskByUid.get(plan.currentTaskUid)?.name ?? null,
    })
  }

  if (candidates.length > 0 && mapping === null) {
    return refuse({
      reason: 'mappingNotChosen',
      rule: 'FR-022',
      what: 'table T-032a has to be answered before these tasks can be merged',
      candidates,
    })
  }

  const resolution =
    mapping === null
      ? { decided: new Map<number, TaskMapping>(), undecided: [] as readonly MergeCandidate[] }
      : resolvedMapping(mapping, candidates)
  if (resolution.undecided.length > 0) {
    return refuse({
      reason: 'candidateNotDecided',
      rule: 'MM-3',
      what: 'MM-3 was chosen and these candidates have neither an answer nor 以降すべて',
      candidates: resolution.undecided,
    })
  }

  const profileRows = conflictingProfileRows(current.project, incoming.project)
  if (profileRows.length > 0 && answers.profileConflict === null) {
    return refuse({
      reason: 'profileConflictNotChosen',
      rule: 'MG-4',
      what: 'the project profile conflicts and MG-4 has not been answered',
      rows: profileRows,
    })
  }

  const settingsKeys =
    request.format === 'grsJson'
      ? conflictingSettingsKeys(request.current.documentSettings, request.incoming.documentSettings)
      : []
  if (settingsKeys.length > 0 && answers.settingsConflict === null) {
    return refuse({
      reason: 'settingsConflictNotChosen',
      rule: 'MG-12',
      what: 'documentSettings conflicts; MG-12 is answered for the whole group at once',
      keys: settingsKeys,
    })
  }

  return builtMerge({
    request,
    index,
    answers,
    source,
    plans,
    candidates,
    decided: resolution.decided,
    profileRows,
    settingsConflicted: settingsKeys.length > 0,
  })
}

interface MergeInput {
  readonly request: ImportRequest
  readonly index: CurrentIndex
  readonly answers: MergeChoices
  readonly source: SourceJudgement
  readonly plans: ReadonlyMap<number, IncomingPlan>
  readonly candidates: readonly MergeCandidate[]
  readonly decided: ReadonlyMap<number, TaskMapping>
  readonly profileRows: readonly string[]
  readonly settingsConflicted: boolean
}

// see T-032, MG-5, MG-8, MG-13
/** @purity pure */
function builtMerge(input: MergeInput): ImportOutcome {
  const { request, index, answers, source, plans, decided } = input
  const current = request.current.schedule
  const incoming = request.incoming.schedule
  const dropped: DroppedReference[] = []

  const previousSeq = current.project.importSeq
  const importSeq = previousSeq + 1

  let highWater = highWaterOf(current, incoming)
  /** @purity non-pure */
  const nextUid = (): number => {
    highWater += 1
    return highWater
  }

  // STOP: spec does not decide where a new calendar's ordinal sits. Looked in MG-5, FR-054
  // WHY: keep an incoming uid unless taken; re-issuing it would lose FR-021's round trip.
  const calendars: Calendar[] = [...current.calendars]
  const heldCalendarUids = new Set(current.calendars.map((one) => one.uid))
  let topOrdinal = current.calendars.reduce((top, one) => Math.max(top, one.ordinal), -1)
  const calendarUidOf = new Map<number, number>()
  for (const calendar of incoming.calendars) {
    const held = index.calendarUidByContent.get(calendarContentKey(calendar))
    if (held !== undefined) {
      calendarUidOf.set(calendar.uid, held)
      continue
    }
    topOrdinal += 1
    const uid = heldCalendarUids.has(calendar.uid) ? nextUid() : calendar.uid
    heldCalendarUids.add(uid)
    calendars.push({ ...calendar, uid, ordinal: topOrdinal })
    calendarUidOf.set(calendar.uid, uid)
  }

  const resources: Resource[] = [...current.resources]
  const heldResourceUids = new Set(current.resources.map((one) => one.uid))
  const resourceUidOf = new Map<number, number>()
  for (const resource of incoming.resources) {
    const held = resource.name === null ? undefined : index.resourceUidByName.get(resource.name)
    if (held !== undefined) {
      resourceUidOf.set(resource.uid, held)
      continue
    }
    const uid = heldResourceUids.has(resource.uid) ? nextUid() : resource.uid
    heldResourceUids.add(uid)
    const calendarUid =
      resource.calendarUid === null ? null : (calendarUidOf.get(resource.calendarUid) ?? null)
    resources.push({ ...resource, uid, calendarUid })
    resourceUidOf.set(resource.uid, uid)
  }

  // STOP: spec does not decide a TaskGroup id both sides hold with different fields. Looked in MG-4, MG-12
  const taskGroups: TaskGroup[] = [...current.taskGroups]
  const groupIds = new Set(current.taskGroups.map((group) => group.id))
  for (const group of incoming.taskGroups) {
    if (groupIds.has(group.id)) continue
    groupIds.add(group.id)
    taskGroups.push(group)
  }

  // WHY: resolved before writing, since a dependency or WBS parent may point at a later task.
  // STOP: spec does not decide two incoming tasks landing on one current task. Looked in T-032, MG-3
  const mergedUidOf = new Map<number, number>()
  const overwritten: number[] = []
  const added: number[] = []
  const addedAsDifferent: AddedAsDifferent[] = []
  for (const task of incoming.tasks) {
    const plan = plans.get(task.uid) ?? { kind: 'fresh' as const }
    if (plan.kind === 'carried') {
      mergedUidOf.set(task.uid, plan.currentTaskUid)
      overwritten.push(plan.currentTaskUid)
      continue
    }
    if (plan.kind === 'candidate') {
      // TRAP: every candidate is in decided only because mergedDocument refused unanswered ones.
      if (decided.get(task.uid) === 'same') {
        mergedUidOf.set(task.uid, plan.currentTaskUid)
        overwritten.push(plan.currentTaskUid)
      } else {
        const uid = nextUid()
        mergedUidOf.set(task.uid, uid)
        added.push(uid)
        addedAsDifferent.push({ incomingTaskUid: task.uid, taskUid: uid })
      }
      continue
    }
    mergedUidOf.set(task.uid, task.uid)
    added.push(task.uid)
  }

  const tasks = keyedRows(current.tasks, (task) => task.uid)
  const visuals = keyedRows(current.taskVisuals, (visual) => visual.taskUid)
  const members = keyedRows(current.taskGroupMembers, (member) => member.taskUid)
  const origins = keyedRows(current.taskOrigins, (origin) => origin.taskUid)
  const incomingVisualByTaskUid = indexBy(incoming.taskVisuals, (visual) => visual.taskUid)
  const incomingMemberByTaskUid = indexBy(incoming.taskGroupMembers, (member) => member.taskUid)

  for (const task of incoming.tasks) {
    const uid = mergedUidOf.get(task.uid)
    if (uid === undefined) continue
    const wasHeld = index.taskByUid.has(uid)

    const dependencies: Dependency[] = []
    for (const dependency of task.dependencies) {
      const predecessor = mergedUidOf.get(dependency.predecessorUid)
      if (predecessor === undefined) {
        // WHY: dropped, not redirected; pointing it at whatever holds that uid here would decide FR-022.
        dropped.push({
          what: 'dependency',
          owner: String(uid),
          missing: `predecessorUid ${dependency.predecessorUid}`,
        })
        continue
      }
      dependencies.push({ ...dependency, predecessorUid: predecessor })
    }

    let wbsParentUid: number | null = null
    if (task.wbsParentUid !== null) {
      const parent = mergedUidOf.get(task.wbsParentUid)
      if (parent === undefined) {
        dropped.push({
          what: 'wbsParent',
          owner: String(uid),
          missing: `wbsParentUid ${task.wbsParentUid}`,
        })
      } else {
        wbsParentUid = parent
      }
    }

    let calendarUid: number | null = null
    if (task.calendarUid !== null) {
      const held = calendarUidOf.get(task.calendarUid)
      if (held === undefined) {
        dropped.push({
          what: 'calendar',
          owner: String(uid),
          missing: `calendarUid ${task.calendarUid}`,
        })
      } else {
        calendarUid = held
      }
    }

    tasks.set(uid, { ...task, uid, wbsParentUid, calendarUid, dependencies })

    if (request.format === 'grsJson' || !wasHeld) {
      const visual = incomingVisualByTaskUid.get(task.uid)
      if (visual === undefined) visuals.delete(uid)
      else visuals.set(uid, { ...visual, taskUid: uid })

      const member = incomingMemberByTaskUid.get(task.uid)
      if (member !== undefined) members.set(uid, { ...member, taskUid: uid })
    }

    origins.set(uid, {
      taskUid: uid,
      sourceProjectUid: incoming.project.id,
      sourceUid: task.uid,
      lastSeenImportSeq: importSeq,
      importSessionId: request.importSessionId,
    })
  }

  const assignments: Assignment[] = [...current.assignments]
  const heldAssignmentUids = new Set(current.assignments.map((one) => one.uid))
  const assignmentPairs = new Set(
    current.assignments.map((one) => assignmentKey(one.taskUid, one.resourceUid)),
  )
  for (const assignment of incoming.assignments) {
    const taskUid =
      assignment.taskUid === null ? null : (mergedUidOf.get(assignment.taskUid) ?? null)
    const resourceUid =
      assignment.resourceUid === null ? null : (resourceUidOf.get(assignment.resourceUid) ?? null)
    if (
      (assignment.taskUid !== null && taskUid === null) ||
      (assignment.resourceUid !== null && resourceUid === null)
    ) {
      dropped.push({
        what: 'assignment',
        owner: String(assignment.uid),
        missing: `taskUid ${assignment.taskUid} / resourceUid ${assignment.resourceUid}`,
      })
      continue
    }
    const pair = assignmentKey(taskUid, resourceUid)
    if (assignmentPairs.has(pair)) continue
    assignmentPairs.add(pair)
    const uid = heldAssignmentUids.has(assignment.uid) ? nextUid() : assignment.uid
    heldAssignmentUids.add(uid)
    assignments.push({ ...assignment, uid, taskUid, resourceUid })
  }

  // STOP: spec does not decide whether a file may overwrite a note. Looked in MG-12
  const commentBoxes: CommentBox[] = [...current.commentBoxes]
  for (const box of incoming.commentBoxes) {
    if (index.commentBoxIds.has(box.id)) continue
    if (box.anchorGroupId !== null && !groupIds.has(box.anchorGroupId)) {
      dropped.push({
        what: 'commentBox',
        owner: box.id,
        missing: `anchorGroupId ${box.anchorGroupId}`,
      })
      continue
    }
    commentBoxes.push(box)
  }
  const highlightBoxes: HighlightBox[] = [...current.highlightBoxes]
  for (const box of incoming.highlightBoxes) {
    if (index.highlightBoxIds.has(box.id)) continue
    const missing = [box.topGroupId, box.bottomGroupId].find(
      (id) => id !== null && !groupIds.has(id),
    )
    if (missing !== undefined && missing !== null) {
      dropped.push({ what: 'highlightBox', owner: box.id, missing: `groupId ${missing}` })
      continue
    }
    highlightBoxes.push(box)
  }

  const project = mergedProject(input, importSeq, highWater)

  const documentSettings =
    input.settingsConflicted && answers.settingsConflict === 'overwrite'
      ? { ...request.current.documentSettings, ...request.incoming.documentSettings }
      : request.current.documentSettings

  const schedule: Schedule = {
    project,
    calendars,
    tasks: [...tasks.values()],
    resources,
    assignments,
    taskGroups,
    taskGroupMembers: [...members.values()],
    taskVisuals: [...visuals.values()],
    commentBoxes,
    highlightBoxes,
    taskOrigins: [...origins.values()],
    baselineTasks: current.baselineTasks,
  }

  const document: Document = { ...request.current, schedule, documentSettings }

  const touched = new Set([...overwritten, ...added])
  const onlyInCurrent: number[] = []
  const missingSinceLastImport: number[] = []
  for (const task of current.tasks) {
    if (touched.has(task.uid)) continue
    onlyInCurrent.push(task.uid)
    const origin = index.originByTaskUid.get(task.uid)
    if (previousSeq > 0 && origin !== undefined && origin.lastSeenImportSeq === previousSeq) {
      missingSinceLastImport.push(task.uid)
    }
  }

  const withoutRow: number[] = []
  for (const uid of tasks.keys()) {
    if (!members.has(uid)) withoutRow.push(uid)
  }

  return {
    ok: true,
    document,
    report: {
      ...emptyReport('merge', importSeq),
      undo: 'oneStep',
      fitToScreenRequired: fitToScreenRequired(document),
      source,
      candidates: input.candidates,
      overwrittenTaskUids: overwritten,
      addedTaskUids: added,
      addedAsDifferent,
      taskUidsOnlyInCurrent: onlyInCurrent,
      taskUidsMissingSinceLastImport: missingSinceLastImport,
      taskUidsWithoutRow: withoutRow,
      droppedReferences: dropped,
    },
  }
}

// see MG-4, MG-9, MG-13, T-224
/** @purity pure */
function mergedProject(input: MergeInput, importSeq: number, uidHighWaterMark: number): Project {
  const current = input.request.current.schedule.project
  const incoming = input.request.incoming.schedule.project
  const conflicting = new Set(input.profileRows)
  const overwrite = input.answers.profileConflict === 'overwrite'

  const held: Record<string, unknown> = { ...current }
  for (const column of PROFILE_COLUMNS) {
    const mine = current[column.key]
    const theirs = incoming[column.key]
    held[column.key] = conflicting.has(column.row) ? (overwrite ? theirs : mine) : (mine ?? theirs)
  }

  return { ...(held as unknown as Project), importSeq, uidHighWaterMark }
}
