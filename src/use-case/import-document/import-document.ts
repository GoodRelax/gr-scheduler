// ImportDocument -- public entry of this folder.
//
// @unit      UF-19   (docs/spec/05-07-design.md, table T-075)
// @component ImportDocument, layer UseCase (table T-062)
// @purity    pure
// @publishes table T-064 row PI-10
//
// Opening a file, and merging one into the document (CP-10): table T-024a of
// FR-087 is the entrance and table T-032 of FR-056 is the merge.
//
// The file arrives already decoded (CP-20) and validated (CP-13, which OP-5
// requires before OP-3 is asked); this unit is told whether validation passed
// and refuses rather than assume.
//
// GRS may not choose what becomes of the current document (OP-3) or whether two
// tasks are the same one (FR-022), so every such answer arrives as an argument.
// A missing one comes back as a refusal carrying what the person must be asked
// with (MG-10's warning needs the candidate list), and the caller asks and calls
// again.
//
// What the document does not hold, and where each argument comes from:
//
//     validationPassed             `validateImportedDocument` (PI-13), OP-5
//     anotherOpenInProgress        the shell (OP-8); a pure function cannot see it
//     unsavedEditsDiscardConfirmed the person answered OP-4's confirmation, or
//                                  there was nothing unsaved
//     format                       which of OP-1's two formats was read; MG-8
//                                  and MG-8a differ only by this
//     defaultSettings              OP-6's defaults, handed in so this file never
//                                  re-types a settings value
//     importSessionId              AT-109; minting one is not a pure act (LY-5)
//     merge                        the person's answers to FR-022, MG-4, MG-12
//
// The caller (RD-3 / RD-4 of table T-230) acts on `report.undo`:
//     replace  -- not undoable, the history is not carried over (OP-4, UN-6)
//     merge    -- one undoable step (UN-6, UN-1, UN-6a)
//     baseline -- `'notDecided'`, which pushes no step
//
// MISSING, reported rather than chosen:
//   * Whether 重ね (OP-9 / FR-015) is undoable: table T-027 has no row for it,
//     and RD-3 defers to that table.
//   * Whether a REPLACE advances `importSeq` and writes `TaskOrigin`: MG-13 sits
//     in table T-032, which FR-056 scopes to 合流, so only a merge advances it.
//   * Whose presentation group a REPLACED-IN MSPDI takes: OP-6 covers only
//     `GRS JSON`, and both formats are shaped the same way here.
//   * A `TaskGroup` id held by both sides of a merge with different fields: MG-4
//     and MG-12 decide no row, so the current document's row is kept (MG-1's
//     安全側).
//   * Two incoming tasks landing on ONE current task -- see the note beside the
//     mapping below.

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

// ------------------------------------------------------------ what is asked ----

/** OP-1: the two formats table T-024's `IO-1` / `IO-2` admit. */
export type ImportFormat = 'grsJson' | 'mspdi'

/** OP-3's three. `baseline` is 重ね (`Schedule.baselineTasks`). */
export type OpenChoice = 'replace' | 'merge' | 'baseline'

/** MG-4's three. MG-12 asks the same three about `documentSettings`. */
export type ConflictChoice = 'overwrite' | 'keepExisting' | 'cancelImport'

/** What MM-3 asks about one candidate: 同じ or 別. */
export type TaskMapping = 'same' | 'different'

export interface TaskMappingDecision {
  readonly incomingTaskUid: number
  readonly mapping: TaskMapping
}

/**
 * The choices of table T-032a. MM-3's 以降すべて同じ / 別 is `rest`, the answer
 * for every candidate `decisions` does not name, so this unit needs no
 * presentation order to give 以降 a meaning. `kind` carries the answer because
 * MG-9 makes 一括 the default.
 */
export type MergeMapping =
  /** MM-1 */
  | { readonly kind: 'allSame' }
  /** MM-2 -- MG-10's warning is owed before this is chosen. */
  | { readonly kind: 'allDifferent' }
  /** MM-3 */
  | {
      readonly kind: 'eachCandidate'
      readonly decisions: readonly TaskMappingDecision[]
      readonly rest: TaskMapping | null
    }
  /** MM-4 -- MG-6 puts the document back as it was. */
  | { readonly kind: 'cancelImport' }

/**
 * Everything the person answers about one merge, one answer per subject (MG-9).
 * `null` is unanswered, which is not an error: a question with nothing to ask
 * about is never asked.
 */
export interface MergeChoices {
  /** FR-022 / table T-032a. */
  readonly mapping: MergeMapping | null
  /** MG-4: the project profile, asked apart from the tasks. */
  readonly profileConflict: ConflictChoice | null
  /** MG-12: `documentSettings` as a whole. */
  readonly settingsConflict: ConflictChoice | null
}

export interface ImportRequest {
  readonly current: Document
  /** Already decoded by CP-20 and already validated by CP-13 (OP-5). */
  readonly incoming: Document
  readonly format: ImportFormat
  readonly choice: OpenChoice
  /** OP-5: FR-023 passed. False refuses; this unit does not validate. */
  readonly validationPassed: boolean
  /** OP-8: an import or another open is already running. */
  readonly anotherOpenInProgress: boolean
  /** OP-4. Read on the `replace` path only -- a merge discards nothing. */
  readonly unsavedEditsDiscardConfirmed: boolean
  /** The answers to FR-022 / MG-4 / MG-12. `null` = none given yet. */
  readonly merge: MergeChoices | null
  /** OP-6's 既定値, from `_assets/tbl-settings.md`. Never re-typed here. */
  readonly defaultSettings: DocumentSettings
  /** AT-109, one per import. Minted outside; a pure function cannot. */
  readonly importSessionId: string
}

// --------------------------------------------------------- what is answered ----

/**
 * One pair the person has to rule on (FR-022). The names travel with the uids
 * because MG-10 has to show what stops being writable back to its master.
 */
export interface MergeCandidate {
  readonly incomingTaskUid: number
  readonly incomingTaskName: string | null
  readonly currentTaskUid: number
  readonly currentTaskName: string | null
}

/** MG-1's judgement, reported so the UI can preselect MM-2 when it is 安全側. */
export type SourceJudgement = 'sameMaster' | 'differentMaster' | 'undecidable' | 'notJudged'

/**
 * A refusal is a value (R7.10). Several of these are the questions OP-3 and
 * FR-022 forbid GRS from answering, carrying what must be shown to ask them.
 */
export type ImportRefusal =
  /** OP-8 */
  | { readonly reason: 'openInProgress'; readonly rule: 'OP-8'; readonly what: string }
  /** OP-5 */
  | { readonly reason: 'notValidated'; readonly rule: 'OP-5'; readonly what: string }
  /** OP-4 */
  | { readonly reason: 'unsavedEditsNotConfirmed'; readonly rule: 'OP-4'; readonly what: string }
  /** MM-4, or MG-4's third answer: the person withdrew. Nothing was changed. */
  | { readonly reason: 'importCancelled'; readonly rule: 'MG-6'; readonly what: string }
  /** FR-022: there are candidates and no mapping was chosen. */
  | {
      readonly reason: 'mappingNotChosen'
      readonly rule: 'FR-022'
      readonly what: string
      readonly candidates: readonly MergeCandidate[]
    }
  /** MM-3 was chosen and these candidates got neither an answer nor `rest`. */
  | {
      readonly reason: 'candidateNotDecided'
      readonly rule: 'MM-3'
      readonly what: string
      readonly candidates: readonly MergeCandidate[]
    }
  /** MG-4: the profile conflicts and the choice is missing. */
  | {
      readonly reason: 'profileConflictNotChosen'
      readonly rule: 'MG-4'
      readonly what: string
      /** The rows of table T-224 that hold two different values. */
      readonly rows: readonly string[]
    }
  /** MG-12: `documentSettings` conflicts and the choice is missing. */
  | {
      readonly reason: 'settingsConflictNotChosen'
      readonly rule: 'MG-12'
      readonly what: string
      /** The keys that differ. Shown together -- per key is forbidden. */
      readonly keys: readonly string[]
    }

/** What the caller must do with the undo history. See the header. */
export type UndoDisposition = 'oneStep' | 'notUndoable' | 'notDecided'

/** A row the merge added, under a uid that is not the one its master knows. */
export interface AddedAsDifferent {
  readonly incomingTaskUid: number
  readonly taskUid: number
}

/**
 * A reference that resolved to nothing and was therefore not carried in:
 * carrying one half of a pair table T-050 keeps together (`CD-1`, `CD-2`) would
 * leave the dangling reference `IV-2` forbids.
 */
export interface DroppedReference {
  readonly what:
    | 'dependency'
    | 'assignment'
    | 'commentBox'
    | 'highlightBox'
    | 'wbsParent'
    | 'calendar'
  /** The row it belonged to: a task uid or an annotation id, as text. */
  readonly owner: string
  /** What it pointed at and could not find. */
  readonly missing: string
}

/** What the caller has to tell the person, and what it has to do next. */
export interface ImportReport {
  readonly choice: OpenChoice
  readonly undo: UndoDisposition
  /** OP-4. True on `replace` only. */
  readonly discardsHistory: boolean
  /**
   * OP-10: the display position is `null` or points at a missing row, so FR-055's
   * fit chooses zoom and position; `HF-8` must not run, so nothing here touches
   * `isCollapsed`. The fit needs the layout and is computed later (BO-3, BO-4).
   */
  readonly fitToScreenRequired: boolean
  /** MG-1. `notJudged` on the `replace` and `baseline` paths. */
  readonly source: SourceJudgement
  /** MG-13's counter as it stands in the answer. */
  readonly importSeq: number
  /** What was asked about. Empty when nothing had to be asked. */
  readonly candidates: readonly MergeCandidate[]
  /** Tasks the merge replaced in place (MG-8 / MG-8a). */
  readonly overwrittenTaskUids: readonly number[]
  /** Tasks the merge added, by the uid they now carry. */
  readonly addedTaskUids: readonly number[]
  /** MG-10's subjects: added under a new uid, so no longer their master's. */
  readonly addedAsDifferent: readonly AddedAsDifferent[]
  /** MG-7 / FR-022: not deleted (MUST NOT), only told. */
  readonly taskUidsOnlyInCurrent: readonly number[]
  /** MG-11: arrived last time, did not arrive now. 前回 is MG-13's counter. */
  readonly taskUidsMissingSinceLastImport: readonly number[]
  /**
   * Tasks with no `TaskGroupMember` (`IV-6`). FR-058 makes the container part of
   * the import, so this should be empty; reported rather than inventing a row.
   */
  readonly taskUidsWithoutRow: readonly number[]
  /** FR-015: on the overlay side with no counterpart. Not drawn, but told. */
  readonly baselineTaskUidsNotDrawn: readonly number[]
  readonly droppedReferences: readonly DroppedReference[]
}

export type ImportOutcome =
  | { readonly ok: false; readonly refusal: ImportRefusal }
  | { readonly ok: true; readonly document: Document; readonly report: ImportReport }

// ------------------------------------------------------------------ shared ----

/** The rows of table T-224, which MG-4 calls プロジェクトの基本情報. */
const PROFILE_COLUMNS: readonly { readonly row: string; readonly key: keyof Project }[] = [
  { row: 'PF-1', key: 'name' },
  { row: 'PF-2', key: 'subject' },
  { row: 'PF-3', key: 'category' },
  { row: 'PF-4', key: 'company' },
  { row: 'PF-5', key: 'manager' },
  { row: 'PF-6', key: 'author' },
  { row: 'PF-7', key: 'revision' },
  { row: 'PF-8', key: 'startDate' },
  // PF-9 and PF-10 are not editable but belong to table T-224 all the same
  // (FR-074), so MG-4 is asked on almost every merge; narrowing it to the
  // editable rows would be this file deciding.
  { row: 'PF-9', key: 'created' },
  { row: 'PF-10', key: 'lastSaved' },
]

/**
 * A value's text with object keys in a fixed order, so that two values built by
 * two codecs compare by content rather than by the order they were written in.
 *
 * @purity pure
 */
function canonicalText(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'undefined'
  if (Array.isArray(value)) return `[${value.map(canonicalText).join(',')}]`
  const held = value as Record<string, unknown>
  return `{${Object.keys(held)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalText(held[key])}`)
    .join(',')}}`
}

/**
 * Index a list once, by a key, so a merge over both documents is not quadratic
 * (`R5`). The first row for a key wins, as a `find` would; `IV-1` forbids a
 * second.
 *
 * @purity pure
 */
function indexBy<T, K>(rows: readonly T[], keyOf: (row: T) => K): Map<K, T> {
  const map = new Map<K, T>()
  for (const row of rows) {
    const key = keyOf(row)
    if (!map.has(key)) map.set(key, row)
  }
  return map
}

/**
 * A list held by its primary key, in order: replace-in-place, remove and append
 * each cost one step, where rebuilding an array would be quadratic (`R5`).
 *
 * @purity pure
 */
function keyedRows<T>(rows: readonly T[], keyOf: (row: T) => number): Map<number, T> {
  return indexBy(rows, keyOf)
}

/** The key MG-3 matches on: 取込元での出自. @purity pure */
function originKey(sourceProjectUid: string | null, sourceUid: number): string {
  return `${sourceProjectUid ?? ''} ${sourceUid}`
}

/** One assignment's 組 (MG-5). @purity pure */
function assignmentKey(taskUid: number | null, resourceUid: number | null): string {
  return `${taskUid ?? ''} ${resourceUid ?? ''}`
}

/**
 * A calendar's content, for MG-5. `uid` and `ordinal` are identity and position;
 * `carry` is compared too, because FR-021's round trip makes it content.
 *
 * @purity pure
 */
function calendarContentKey(calendar: Calendar): string {
  const { uid: _uid, ordinal: _ordinal, ...content } = calendar
  return canonicalText(content)
}

/**
 * OP-6's shaping of a presentation group that came out of a file: the spread
 * keeps the default for a missing key and keeps a key nobody knows.
 *
 * @purity pure
 */
function restoredSettings(fromFile: DocumentSettings, defaults: DocumentSettings): DocumentSettings {
  return { ...defaults, ...fromFile }
}

/**
 * OP-10. `null` means no place chosen yet, not a missing value, so OP-6's
 * defaulting must not fill it; hence a question asked of the finished document.
 *
 * @purity pure
 */
function fitToScreenRequired(document: Document): boolean {
  const { scrollDate, scrollGroupId } = document.documentSettings
  if (scrollDate === null || scrollGroupId === null) return true
  return !document.schedule.taskGroups.some((group) => group.id === scrollGroupId)
}

/** @purity pure */
function refuse(refusal: ImportRefusal): ImportOutcome {
  return { ok: false, refusal }
}

/**
 * The report with every list empty. Each path fills in what it did.
 *
 * @purity pure
 */
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

/** The answers, with the unanswered case spelled once. @purity pure */
function answersOf(request: ImportRequest): MergeChoices {
  return request.merge ?? { mapping: null, profileConflict: null, settingsConflict: null }
}

// --------------------------------------------------------------- the entry ----

/**
 * Read a file into the document the way table T-024a says, and answer with the
 * document that results or with the refusal that stopped it.
 *
 * @purity pure
 */
export function importDocument(request: ImportRequest): ImportOutcome {
  // ---- OP-8 --------------------------------------------------------------
  if (request.anotherOpenInProgress) {
    return refuse({
      reason: 'openInProgress',
      rule: 'OP-8',
      what: 'another open or import is still running',
    })
  }

  // ---- OP-5 --------------------------------------------------------------
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

// ------------------------------------------------------------ OP-3 置き換え ----

/**
 * 置き換える -- the current document is dropped for the file's.
 *
 * The stamp, change log and format version stay as the file wrote them, because
 * the document now IS that file (FR-021); WS-5 advances the stamp later.
 *
 * @purity pure
 */
function replacedDocument(request: ImportRequest): ImportOutcome {
  // ---- OP-4 --------------------------------------------------------------
  // A merge discards nothing, so only this branch reads the flag.
  if (!request.unsavedEditsDiscardConfirmed) {
    return refuse({
      reason: 'unsavedEditsNotConfirmed',
      rule: 'OP-4',
      what: 'the current document may not be discarded until the person has confirmed',
    })
  }

  // ---- OP-6 --------------------------------------------------------------
  const document: Document = {
    ...request.incoming,
    documentSettings: restoredSettings(request.incoming.documentSettings, request.defaultSettings),
  }

  return {
    ok: true,
    document,
    report: {
      ...emptyReport('replace', document.schedule.project.importSeq),
      // OP-4, UN-6
      undo: 'notUndoable',
      discardsHistory: true,
      fitToScreenRequired: fitToScreenRequired(document),
    },
  }
}

// ------------------------------------------------------------------ OP-9 重ね ----

/**
 * 重ねる -- FR-015's 変更前の予定, into `Schedule.baselineTasks` (`ET-18`).
 *
 * Only tasks whose `UID` matches the current document's go in (OP-9); every
 * unmatched one is told in `report.baselineTaskUidsNotDrawn` (FR-015), so none
 * is silently gone. An empty frame is an overlay that found nothing, answered
 * with the document rather than a refusal. The frame is replaced, not added
 * to: FR-015 overlays one file at a time.
 *
 * @purity pure
 */
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
      // Table T-027 has no row for 重ね (UN-6 covers the merge overwrite only).
      undo: 'notDecided',
      fitToScreenRequired: fitToScreenRequired(document),
      baselineTaskUidsNotDrawn: notDrawn,
    },
  }
}

// ------------------------------------------------------------------ OP-3 合流 ----

/** Everything of the current document a merge reads, indexed once. */
interface CurrentIndex {
  readonly taskByUid: ReadonlyMap<number, Task>
  /** MG-3: 取込元での出自 -> the task it became here. */
  readonly taskUidByOrigin: ReadonlyMap<string, number>
  readonly originByTaskUid: ReadonlyMap<number, TaskOrigin>
  /** Which masters this document already holds tasks from (MG-1). */
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
    // MG-5 unifies 同名の担当者. One with no name has no name to be matched on.
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

/**
 * MG-1, from the origins the document records (`ET-12`). A file with no
 * `Project.id` cannot be recognised, because its stand-in `importSessionId` is
 * minted per import (`AT-1`), so MG-1 sends it to the person; the caller reads
 * the preselection off `source`.
 *
 * @purity pure
 */
function judgedSource(incoming: Project, index: CurrentIndex): SourceJudgement {
  if (incoming.id === null) return 'undecidable'
  return index.sourceProjectUids.has(incoming.id) ? 'sameMaster' : 'differentMaster'
}

/** What one incoming task is, before the person has answered. */
type IncomingPlan =
  /** MG-3: the person decided this last time; deciding again would duplicate. */
  | { readonly kind: 'carried'; readonly currentTaskUid: number }
  /** FR-022 / MG-2: it might be the same task. Only the person may say. */
  | { readonly kind: 'candidate'; readonly currentTaskUid: number }
  /** Nothing here answers to it. */
  | { readonly kind: 'fresh' }

/**
 * Sort the incoming tasks into the three.
 *
 * The origin match comes first and takes a task out of the question: under MG-3
 * GRS carries the answer the person gave last time, so FR-022 is untouched. It
 * runs only for the same master (MG-1), or 別のマスタ could become a silent
 * identity.
 *
 * @purity pure
 */
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
    // FR-022
    if (index.taskByUid.has(task.uid)) {
      plans.set(task.uid, { kind: 'candidate', currentTaskUid: task.uid })
      continue
    }
    plans.set(task.uid, { kind: 'fresh' })
  }
  return plans
}

/** MM-4 is answered before this point, so it cannot reach the resolution. */
type ChosenMapping = Exclude<MergeMapping, { readonly kind: 'cancelImport' }>

/**
 * The mapping the person chose, spread over the candidates.
 *
 * @purity pure
 */
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
    // MM-1 / MM-2: 候補すべて.
    const one: TaskMapping = mapping.kind === 'allSame' ? 'same' : 'different'
    for (const candidate of candidates) decided.set(candidate.incomingTaskUid, one)
    return { decided, undecided }
  }

  const answers = indexBy(mapping.decisions, (decision) => decision.incomingTaskUid)
  for (const candidate of candidates) {
    const answer = answers.get(candidate.incomingTaskUid)?.mapping ?? mapping.rest
    if (answer === null) {
      // FR-022: an unanswered candidate is a question, not a default.
      undecided.push(candidate)
      continue
    }
    decided.set(candidate.incomingTaskUid, answer)
  }
  return { decided, undecided }
}

/**
 * The rows of table T-224 that hold two different values (MG-4). A column only
 * one side fills is not a conflict: 合流 adds, and filling an empty field adds.
 *
 * @purity pure
 */
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

/**
 * The keys of the presentation group that differ (MG-12), over the union of both
 * key sets because OP-6 keeps unknown keys. A key only one side carries is not a
 * conflict.
 *
 * @purity pure
 */
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

/**
 * The highest uid any row of either document carries, so a newly issued one
 * cannot collide (`IV-1`). Every row is looked at because an imported document
 * may carry a `uidHighWaterMark` (`AT-20`) its rows have outgrown; one counter
 * for all row kinds only skips numbers.
 *
 * @purity pure
 */
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

/**
 * 合流させる -- the questions of table T-032 first, then the merge itself.
 *
 * @purity pure
 */
function mergedDocument(request: ImportRequest): ImportOutcome {
  const current = request.current.schedule
  const incoming = request.incoming.schedule
  const answers = answersOf(request)
  const mapping = answers.mapping

  // MM-4 / MG-6: nothing to restore, because this unit only builds the answer.
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

  // ---- MG-2 / FR-022: what has to be asked -------------------------------
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

  // ---- MG-4: the profile, asked apart from the tasks ---------------------
  const profileRows = conflictingProfileRows(current.project, incoming.project)
  if (profileRows.length > 0 && answers.profileConflict === null) {
    return refuse({
      reason: 'profileConflictNotChosen',
      rule: 'MG-4',
      what: 'the project profile conflicts and MG-4 has not been answered',
      rows: profileRows,
    })
  }

  // ---- MG-12: the presentation group, as a whole -------------------------
  // Only `GRS JSON` reaches this: an MSPDI file states no presentation group.
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

/** Everything `mergedDocument` worked out, handed on in one value. */
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

/**
 * The merge itself, once every question of table T-032 has an answer.
 *
 * @purity pure
 */
function builtMerge(input: MergeInput): ImportOutcome {
  const { request, index, answers, source, plans, decided } = input
  const current = request.current.schedule
  const incoming = request.incoming.schedule
  const dropped: DroppedReference[] = []

  // MG-13 (`S-71`): MG-3 and MG-11 have no other way to tell which round was 前回.
  const previousSeq = current.project.importSeq
  const importSeq = previousSeq + 1

  let highWater = highWaterOf(current, incoming)
  /**
   * The next uid nobody holds. It closes over a counter local to this call, so
   * `builtMerge` stays pure.
   *
   * @purity non-pure
   */
  const nextUid = (): number => {
    highWater += 1
    return highWater
  }

  // ---- MG-5: 内容が同じ暦 ------------------------------------------------
  // A calendar not held yet is appended with an ordinal after every current one,
  // so FR-054's lowest-ordinal resolution answers as before. Re-issuing the
  // ordinal is this file's decision; MG-5 says nothing about where a new one sits.
  //
  // A uid the current document does not hold is kept: `AT-63`, `AT-85` and
  // `AT-92` are `Own`, and re-issuing them loses FR-021's round trip. A new
  // number is drawn only when the old one is taken (`IV-1`).
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

  // ---- MG-5: 同名の担当者 ------------------------------------------------
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

  // ---- MG-12 / FR-058: the rows the tasks sit on -------------------------
  // A row both documents hold keeps the current fields (see the header). A row
  // only the file holds is added, which gives an added task a row (`IV-6`);
  // FR-058 makes the container part of the import, MSPDI included.
  const taskGroups: TaskGroup[] = [...current.taskGroups]
  const groupIds = new Set(current.taskGroups.map((group) => group.id))
  for (const group of incoming.taskGroups) {
    if (groupIds.has(group.id)) continue
    groupIds.add(group.id)
    taskGroups.push(group)
  }

  // ---- Which uid each incoming task ends up as ---------------------------
  // Worked out before anything is written, because a dependency or a WBS parent
  // may point at a task that comes later in the file.
  //
  // MISSING: two incoming tasks can land on one current task (one by MG-3's
  // origin, one by its uid). Table T-032 does not rule on it, so the later one
  // wins and the uid appears twice among the overwritten in the report.
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
      // Every candidate is in `decided`: an unanswered one was refused above.
      if (decided.get(task.uid) === 'same') {
        mergedUidOf.set(task.uid, plan.currentTaskUid)
        overwritten.push(plan.currentTaskUid)
      } else {
        const uid = nextUid()
        mergedUidOf.set(task.uid, uid)
        added.push(uid)
        // MG-10's subject: this task no longer answers to its master.
        addedAsDifferent.push({ incomingTaskUid: task.uid, taskUid: uid })
      }
      continue
    }
    // Nothing here answers to that uid, so it keeps the exchange partner's
    // identifier (Chapter 5.4).
    mergedUidOf.set(task.uid, task.uid)
    added.push(task.uid)
  }

  // ---- The tasks and what table T-050 keeps with them --------------------
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

    // The `Task` row comes from the file in both formats: every column is the
    // exchange partner's (table T-058), so MG-8 leaves none behind.
    const dependencies: Dependency[] = []
    for (const dependency of task.dependencies) {
      const predecessor = mergedUidOf.get(dependency.predecessorUid)
      if (predecessor === undefined) {
        // Pointing it at whatever holds that uid here would decide 同じか別か
        // (FR-022); keeping it would dangle (`IV-2`).
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

    // MG-8 / MG-8a: MSPDI keeps the current look and row, `GRS JSON` replaces
    // them. A task the merge adds takes the file's in either format, or it would
    // have no row (`IV-6`).
    if (request.format === 'grsJson' || !wasHeld) {
      const visual = incomingVisualByTaskUid.get(task.uid)
      if (visual === undefined) visuals.delete(uid)
      else visuals.set(uid, { ...visual, taskUid: uid })

      const member = incomingMemberByTaskUid.get(task.uid)
      if (member !== undefined) members.set(uid, { ...member, taskUid: uid })
    }

    // MG-13: the file's own origins record ITS history and are not carried in.
    // `IV-15` holds because `Project.importSeq` is written the same value.
    origins.set(uid, {
      taskUid: uid,
      sourceProjectUid: incoming.project.id,
      sourceUid: task.uid,
      lastSeenImportSeq: importSeq,
      importSessionId: request.importSessionId,
    })
  }

  // ---- MG-5: 同じ組の割当 ------------------------------------------------
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
      // `CD-1` / `CD-5` read forward: its task or resource is not here.
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

  // ---- MG-12: the notes --------------------------------------------------
  // Added when the id is new, left alone when both hold one: no row lets a file
  // overwrite a note. One anchored to a missing row would dangle (`IV-2`), so it
  // is left out and named.
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

  // ---- MG-12: the presentation group -------------------------------------
  // 上書き takes only what the file states (MG-8's principle); OP-6's defaulting
  // is not run, because OP-6 excludes 合流.
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
    // FR-015's frame is filled by OP-9 alone.
    baselineTasks: current.baselineTasks,
  }

  const document: Document = { ...request.current, schedule, documentSettings }

  // ---- MG-7 and MG-11: what has to be said -------------------------------
  const touched = new Set([...overwritten, ...added])
  const onlyInCurrent: number[] = []
  const missingSinceLastImport: number[] = []
  for (const task of current.tasks) {
    if (touched.has(task.uid)) continue
    // MG-7 / FR-022
    onlyInCurrent.push(task.uid)
    // MG-11; 前回 is the round MG-13's counter names.
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
      // UN-6, UN-1, UN-6a; one import is one step (FR-031).
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

/**
 * MG-4 applied to the rows of table T-224, and MG-13 to the counter. The choice
 * answers every conflicting row at once (MG-9); a row empty here and filled
 * there is not a conflict and is taken.
 *
 * Every other column of `Project` stays the current document's: `themeHue`
 * (FR-041), `statusDate` (FR-046), `title` (FR-035, excluded by FR-074), the
 * calendar columns (FR-054), and `carry` (table T-053).
 *
 * @purity pure
 */
function mergedProject(input: MergeInput, importSeq: number, uidHighWaterMark: number): Project {
  const current = input.request.current.schedule.project
  const incoming = input.request.incoming.schedule.project
  const conflicting = new Set(input.profileRows)
  const overwrite = input.answers.profileConflict === 'overwrite'

  // Cast so table T-224 is not written out twice. Sound because every key is
  // `keyof Project` and every value is that column read off one of the two
  // documents.
  const held: Record<string, unknown> = { ...current }
  for (const column of PROFILE_COLUMNS) {
    const mine = current[column.key]
    const theirs = incoming[column.key]
    held[column.key] = conflicting.has(column.row) ? (overwrite ? theirs : mine) : (mine ?? theirs)
  }

  return { ...(held as unknown as Project), importSeq, uidHighWaterMark }
}
