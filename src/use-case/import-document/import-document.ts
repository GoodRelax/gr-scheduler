// ImportDocument -- public entry of this folder.
//
// @unit      UF-19   (docs/spec/05-07-design.md, table T-075)
// @component ImportDocument, layer UseCase (table T-062)
// @purity    pure
// @publishes table T-064 row PI-10
//
// Opening a file, and merging one into the document (CP-10). Table T-024a of
// FR-087 is the whole of the entrance -- OP-1 to OP-10 -- and table T-032 of
// FR-056 is the whole of the merge.
//
// ⭐ The file is already decoded and already validated when it arrives here:
//   * `DocumentCodec` (CP-20) turned `GRS JSON` or MSPDI XML into a `Document`,
//     so `incoming` is a document and not bytes (OP-1; OP-7's format version is
//     FR-073's, decided where the bytes are read).
//   * `ValidateImportedDocument` (CP-13) ran FR-023. OP-5 makes that a MUST
//     BEFORE OP-3 is even asked -- ask first and the current document is thrown
//     away for input the validation then rejects, which breaks FR-023's
//     「部分的に適用してはならない」. This unit is TOLD whether it passed
//     (`validationPassed`) and refuses rather than assume.
//
// ⚠️ Nothing here is settled. It answers with a new document or a refusal;
// replacing the current value is WS-6, and that belongs to CP-8 alone.
//
// ⚠️ GRS may not choose what becomes of the current document (OP-3, MUST NOT)
// and may not decide whether two tasks are the same one (FR-022, MUST NOT).
// Every such answer arrives as an argument. When one is missing, the answer
// comes back as a REFUSAL CARRYING the material the person must be asked with,
// so the caller asks and then calls again. That is also how MG-10 is served:
// the warning it owes before 「別のものとして取り込む」 is chosen needs the
// candidate list, and the refusal is where the list is.
//
// What the document does not hold, and where each argument comes from:
//
//     validationPassed             `validateImportedDocument` (PI-13), OP-5
//     anotherOpenInProgress        the shell: another open or import is running
//                                  (OP-8). A pure function cannot see it.
//     unsavedEditsDiscardConfirmed the person answered OP-4's confirmation, or
//                                  there was nothing unsaved (`AutosaveGateway`
//                                  (CP-23) is what knows which)
//     format                       which of OP-1's two formats was read. MG-8
//                                  and MG-8a differ ONLY by this.
//     defaultSettings              the defaults of `_assets/tbl-settings.md`,
//                                  for OP-6's 「欠けている設定値は既定値で補い」.
//                                  No component publishes them yet, so they are
//                                  handed in the way `HistoryLimits` is -- this
//                                  file never re-types a settings value.
//     importSessionId              AT-109. One import's identifier; minting one
//                                  is not a pure act (CS-1 / LY-5).
//     merge                        the person's answers to FR-022, MG-4, MG-12.
//
// ⭐ What the caller must then do about the undo history (this unit only says
// which case it is):
//     replace  -- the history is NOT carried over (OP-4), and the import itself
//                 is not undoable (UN-6 says so in as many words).
//     merge    -- ONE undoable step: UN-6 for the overwrite, UN-1 for the tasks
//                 it adds, UN-6a for the dependencies that come with them.
//     baseline -- ⛔ NOT DECIDED. Table T-027 has no row for 重ね at all, so
//                 `undo` answers `'notDecided'` rather than guess.
//
// ⭐ HOW THE ANSWER REACHES THE CURRENT VALUE IS SETTLED, and this unit is on
// the called side of it: `replaceDocument` (PI-8) reads the pair once, calls
// this unit at WS-3 for RD-3 and RD-4 of table T-230, and runs WS-4 to WS-7
// over the answer. The `current` document therefore arrives from that one read.
// ⚠️ `report.undo` and `report.discardsHistory` still say which case this was;
// what the caller does with them is T-230's two columns and no longer a habit.
//
// ⛔ MISSING, reported rather than chosen:
//   * Whether 重ね (OP-9 / FR-015) is undoable -- see `undo` above. ⚠️ RD-3
//     delegates that column to table T-027, so the hole is now load-bearing on
//     the write path: `'notDecided'` pushes no step.
//   * Whether a REPLACE advances `importSeq` and writes `TaskOrigin`. MG-13
//     sits in table T-032, which FR-056 scopes to 合流, so the counter is
//     advanced on the merge path only and a replace keeps what the file held.
//   * Whose presentation group a REPLACED-IN MSPDI takes. OP-6 covers
//     「置き換えを選んで `GRS JSON` を読んだとき」 and no other case; this file
//     shapes both formats the same way (the file's own values over the
//     defaults), because that is the only rule written down.
//   * What happens when a `TaskGroup` id is held by both sides of a merge with
//     a different label / colour / height. MG-4 decides the project profile and
//     MG-12 decides `documentSettings`; no row decides a row. The current
//     document's group is kept (MG-1's 安全側) and nothing is destroyed.
//   * What happens when two incoming tasks land on ONE current task -- one
//     through MG-3's recorded origin, the other through the uid it carries now.
//     See the ⛔ beside the mapping below.
//
// Nothing outside this folder may import any other file in it
// (Chapter 5.3, MUST NOT), so every name the component publishes
// leaves through here.

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

/**
 * OP-3's three, and no fourth.
 *
 * ⚠️ `baseline` is 重ね. `previous-project-result/03-ui-naming` settles that
 * 変更前の予定 is `Baseline` in English, and the document and the settings
 * already say so (`Schedule.baselineTasks`, `baselineVisible`).
 */
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
 * The four choices of table T-032a.
 *
 * ⚠️ MM-3's 「以降すべて同じ / 以降すべて別」 is `rest`, not a fifth kind: those
 * two are what a person picks in order to stop being asked, so they are the
 * answer for every candidate `decisions` does not name. Modelling them that way
 * also keeps the value free of any presentation order this unit would otherwise
 * have to invent to give 以降 a meaning.
 * ⚠️ MG-9 makes 一括 the default and forbids 1 件ずつ from being one (MUST NOT),
 * which is why `kind` carries the answer instead of every import sending a full
 * list of decisions.
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
 * Everything the person answers about ONE merge. MG-9 allows one question per
 * import per subject, so each field is one answer -- never one per row or key.
 *
 * A field is `null` when it has not been answered. That is not an error by
 * itself: a question with nothing to ask about is not asked at all (MG-2 asks
 * only when there are candidates, MG-4 only when the profile conflicts, MG-12
 * only when the presentation group does).
 */
export interface MergeChoices {
  /** FR-022 / table T-032a. */
  readonly mapping: MergeMapping | null
  /** MG-4: the project profile, asked apart from the tasks. */
  readonly profileConflict: ConflictChoice | null
  /** MG-12: `documentSettings` AS A WHOLE -- never key by key (MUST NOT). */
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
 * One pair the person has to rule on. FR-022 gathers them by `UID` (MUST), and
 * MG-1 decides whether tasks whose `UID` does not match may join them.
 *
 * ⚠️ The names travel with the uids because MG-10 has to SHOW what is about to
 * stop being writable back to its master, and because the question is
 * unanswerable from a pair of integers.
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
 * ⚠️ A refusal is a VALUE (AG-8 / `R7.10`). Four of these are not GRS refusing
 * at all -- they are the questions OP-3 and FR-022 forbid GRS from answering,
 * and they carry what has to be shown in order to ask them.
 */
export type ImportRefusal =
  /** OP-8: 取込の最中は受け付けない (MUST NOT). */
  | { readonly reason: 'openInProgress'; readonly rule: 'OP-8'; readonly what: string }
  /** OP-5: FR-023 has to pass first (MUST). */
  | { readonly reason: 'notValidated'; readonly rule: 'OP-5'; readonly what: string }
  /** OP-4: 黙って捨ててはならない (MUST NOT). */
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
 * A reference that resolved to nothing and was therefore not carried in.
 *
 * ⚠️ Table T-050 read forward: `CD-1` says a `Task` takes its `TaskVisual`,
 * `TaskOrigin`, `TaskGroupMember`, the dependencies it is an endpoint of and
 * the assignments that point at it away with it, and `CD-2` says a row takes
 * the notes that point at it. A merge that carried in one half of any of those
 * pairs would leave exactly the dangling reference those rows exist to prevent
 * (`IV-2`), so the half that cannot be resolved is left out and named here.
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
  /** OP-4: 取り消しの履歴は引き継がない. True on `replace` only. */
  readonly discardsHistory: boolean
  /**
   * OP-10: the resulting 表示位置 is `null` or points at a row that is not
   * there, so FR-055's fit is what chooses the zoom and the position -- and
   * `HF-8` must NOT run (MUST NOT), which is why nothing here touches
   * `isCollapsed`.
   *
   * ⚠️ The fit itself is not computed here. It needs the laid-out extent (table
   * T-038) and the screen, which belong to `layoutEngine` and to the shell;
   * table T-077 has `BO-3` hand exactly this case on to `BO-4`.
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
   * ⚠️ Tasks that reached the document with no `TaskGroupMember` to put them on
   * a row. `IV-6` forbids it and FR-058 has the container made as part of the
   * import, so this should always be empty -- it is reported rather than
   * hidden, because the alternative is inventing a row to put them on.
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

/** The ten rows of table T-224. MG-4 calls these プロジェクトの基本情報. */
const PROFILE_COLUMNS: readonly { readonly row: string; readonly key: keyof Project }[] = [
  { row: 'PF-1', key: 'name' },
  { row: 'PF-2', key: 'subject' },
  { row: 'PF-3', key: 'category' },
  { row: 'PF-4', key: 'company' },
  { row: 'PF-5', key: 'manager' },
  { row: 'PF-6', key: 'author' },
  { row: 'PF-7', key: 'revision' },
  { row: 'PF-8', key: 'startDate' },
  // ⚠️ PF-9 and PF-10 are shown and NOT editable, and they are 基本情報 all the
  // same: FR-074's RATIONALE names table T-224 as the very set MG-4 speaks of.
  // Two files saved at different moments therefore conflict almost always, so
  // MG-4 will be asked on almost every merge. Nothing narrows MG-4 to the
  // editable eight, and narrowing it here would be this file deciding it.
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
 * Index a list once, by a key.
 *
 * ⭐ Every lookup below goes through one of these (`R5` / `NFR-013`): a merge
 * touches every row of both documents, and a `find` inside that walk would make
 * the cost the product of the two sizes. The FIRST row for a key wins, which is
 * what a `find` did; `IV-1` forbids a second one from existing at all.
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
 * A list held by its primary key, in order.
 *
 * ⭐ A `Map` is what makes replace-in-place, remove and append all cost the
 * same one step: setting a key it already holds keeps that key where it was,
 * setting a new one appends, and `delete` costs nothing extra. Rebuilding an
 * array on each of those would be quadratic over a document (`R5`).
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
 * A calendar's CONTENT, for MG-5's 「内容が同じ暦」.
 *
 * ⚠️ `uid` and `ordinal` are left out: the first is identity and the second is
 * where the calendar sits in its own document, and neither is content.
 * Everything else is compared, `carry` included -- what came from the exchange
 * partner is content too, and FR-021's round trip is what makes it so.
 *
 * @purity pure
 */
function calendarContentKey(calendar: Calendar): string {
  const { uid: _uid, ordinal: _ordinal, ...content } = calendar
  return canonicalText(content)
}

/**
 * OP-6's shaping of a presentation group that came out of a file: 欠けている
 * 設定値は既定値で補い、知らないキーは捨てずに保つ.
 *
 * ⚠️ The spread does both at once -- a key the file does not carry keeps the
 * default, and a key nobody knows survives because it is on the file's side of
 * the spread. No value is written here; every one comes from `defaults`.
 *
 * @purity pure
 */
function restoredSettings(fromFile: DocumentSettings, defaults: DocumentSettings): DocumentSettings {
  return { ...defaults, ...fromFile }
}

/**
 * OP-10: the 表示位置 is `null`, or it points at a row that is not there.
 *
 * ⚠️ `null` is 「人がまだ場所を決めていない」 and NOT a missing value, so OP-6's
 * defaulting must not fill it -- which is why this is a question asked of the
 * finished document rather than a repair made to it.
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
  // 取込または別の開く操作が進行中のあいだは受け付けないこと (MUST NOT). The
  // reason the row gives is MG-6: 「取込前の状態」 stops being a single state
  // once two imports overlap, and MG-6 is the row that has to restore it.
  if (request.anotherOpenInProgress) {
    return refuse({
      reason: 'openInProgress',
      rule: 'OP-8',
      what: 'another open or import is still running',
    })
  }

  // ---- OP-5 --------------------------------------------------------------
  // 経路によらず FR-023 の検証を通すこと (MUST), and before OP-3 is asked.
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
 * 置き換える -- the current document is dropped and the file's schedule is what
 * is shown.
 *
 * ⚠️ The stamp, the change log and the format version stay as the FILE wrote
 * them: after a replace the document IS that file, and FR-021's round trip is
 * what makes carrying them back the point. WS-5 advances the stamp when the
 * answer is settled, which is not this unit's step.
 *
 * @purity pure
 */
function replacedDocument(request: ImportRequest): ImportOutcome {
  // ---- OP-4 --------------------------------------------------------------
  // 置き換えを選んだときは、捨てる前に確認を求めること (MUST). 黙って捨てては
  // ならない (MUST NOT). A merge keeps the current document, so the row exempts
  // it and this branch is the only one that reads the flag.
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
      // OP-4: 取り消しの履歴は引き継がない -- and UN-6 says in as many words
      // that a replace cannot be undone, 戻せない, for that same reason.
      undo: 'notUndoable',
      discardsHistory: true,
      fitToScreenRequired: fitToScreenRequired(document),
    },
  }
}

// ------------------------------------------------------------------ OP-9 重ね ----

/**
 * 重ねる -- FR-015's 変更前の予定, drawn grey and dashed over the current one.
 *
 * OP-9 forbids this path from replacing or merging anything (MUST NOT) and
 * requires the file to land in the frame kept for it (MUST). That frame is
 * `Schedule.baselineTasks` (`ET-18`), five columns holding no dependency, no
 * calendar, no resource and no assignment -- exactly what FR-015 allows.
 *
 * ⚠️ Only the tasks that match a current one by `UID` are kept. FR-015 pairs by
 * `UID` (MUST), forbids drawing a task that exists on one side only (MUST NOT)
 * and requires telling about it (MUST); holding one that can never be drawn
 * would also work against the reason the requirement gives for five columns
 * instead of a whole schedule (成果物の大きさ). ⚠️ That the unmatched ones are
 * dropped rather than held and skipped is this file's decision.
 *
 * ⚠️ The frame is replaced, not added to: FR-015 speaks of 重ねる相手 in the
 * singular -- one 別ファイル at a time.
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
      // ⛔ Table T-027 has no row for 重ね: UN-6 covers 合流での上書き and names
      // 置き換え as its exception, and nothing anywhere covers this one.
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
 * MG-1 -- 同じ外部 WBS マスタの再取込か、別のマスタか.
 *
 * The document records where each imported task came from (`ET-12`: 取り込み元
 * の記録。合流の照合に使う), so a file that names its project can be
 * recognised. A file whose `Project.id` is absent cannot be: `AT-1` has
 * `TaskOrigin.importSessionId` stand in for it, and that identifier is minted
 * per import, so it never matches an earlier one. MG-1 sends exactly that case
 * to the person, and FR-022's question is the one they are asked -- with
 * 「別のものとして取り込む」 preselected, which the caller reads off `source`.
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
 * ⭐ The origin match comes first and takes the task out of the question
 * entirely. MG-3 forbids a task once taken 別のものとして from being duplicated
 * on re-import (MUST NOT) and says to match it 取込元での出自を保って -- so the
 * pairing is not GRS deciding 同じか別か, it is GRS carrying the answer the
 * person gave last time. FR-022's MUST NOT is untouched.
 *
 * ⚠️ Origin matching runs only when MG-1 judged the file the same master. When
 * it did not, the origin key cannot match anyway, and letting it try is what
 * would turn 別のマスタ into a silent identity.
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
    // FR-022: 対応の候補は `UID` の一致で集めること (MUST).
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
      // FR-022: 同じか別かを `GRS` が自動で確定してはならない (MUST NOT). An
      // unanswered candidate is a question, not a default.
      undecided.push(candidate)
      continue
    }
    decided.set(candidate.incomingTaskUid, answer)
  }
  return { decided, undecided }
}

/**
 * The rows of table T-224 that hold two different values (MG-4).
 *
 * ⚠️ A column only one side fills is not a conflict -- 合流 is 現在の文書へ足す,
 * and filling an empty field adds. Only two present and different values are
 * something to choose between.
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
 * The keys of the presentation group that differ (MG-12).
 *
 * ⚠️ Over the UNION of both key sets, because OP-6 keeps keys nobody knows and
 * a file may therefore carry one this build has never heard of. A key only one
 * side carries is not a conflict, for MG-4's reason: a file that does not state
 * a value is not disagreeing about it.
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
 * The highest uid any row of either document carries, so that a newly issued
 * one cannot collide (`IV-1`).
 *
 * ⚠️ `Project.uidHighWaterMark` (`AT-20`) is 発番済みの `uid` の最大値 and is
 * where the numbering starts, but a document that came from elsewhere may carry
 * a mark its own rows have outgrown, and `IV-1` is the condition that has to
 * hold -- so every row is looked at. `AT-20` names no kind of row, and one
 * counter shared by tasks, resources and assignments only ever skips numbers:
 * it cannot collide, because `IV-1` holds per array.
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

  // MM-4 / MG-6: 取込をやめた -- 文書が取込前と完全に同じ状態であること (MUST).
  // There is nothing to restore: this unit is pure and settles nothing, so
  // withdrawing IS the whole of MG-6 here. 暦や資源だけが統合済みで残る, which
  // the row forbids, cannot happen when the answer is the only thing built.
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
  // ⚠️ Only `GRS JSON` reaches this. MG-12 is the row written for it, and OP-6
  // says a merge does not restore a presentation group at all; an MSPDI file
  // states none of its own, so opening one disturbs nothing of the current view.
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

  // MG-13: 取込 1 回につき `importSeq` を 1 つ進め (`S-71`), and record it on
  // everything taken in this round. MG-3 and MG-11 have no other way of saying
  // which round was 前回.
  const previousSeq = current.project.importSeq
  const importSeq = previousSeq + 1

  let highWater = highWaterOf(current, incoming)
  /**
   * The next uid nobody holds.
   *
   * ⚠️ It closes over a counter, so it is the one member of this file that is
   * not a function of its arguments alone. The counter is a local of THIS call
   * and dies with it -- the standing a loop variable has -- so `builtMerge` is
   * still pure, which is what table T-075 says of this unit.
   *
   * @purity non-pure
   */
  const nextUid = (): number => {
    highWater += 1
    return highWater
  }

  // ---- MG-5: 内容が同じ暦 ------------------------------------------------
  // 利用者に問わず 1 つに統合する. A calendar whose content is not held yet is
  // appended -- with an ordinal after every current one, so that FR-054's
  // resolution (the lowest-ordinal base calendar) answers for this document
  // exactly as it did before the merge. ⚠️ That the ordinal is re-issued rather
  // than carried is this file's decision: MG-5 rules on the calendars that ARE
  // the same and says nothing about where a new one sits.
  //
  // ⭐ A uid the current document does not already hold is KEPT. `AT-63`,
  // `AT-85` and `AT-92` are all `Own` -- they are the exchange partner's own
  // identifiers, and 5.4 keeps them rather than mint surrogate keys, because
  // FR-021's round trip is what is lost when they are re-issued. A new number
  // is drawn only when the old one is taken, which `IV-1` requires.
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
  // A row both documents hold under one id keeps the current document's fields
  // -- see the ⛔ in the header. A row only the file holds is added, and that is
  // what gives a task the merge ADDS somewhere to sit (`IV-6`), MSPDI included:
  // FR-058 makes the container part of the import, so the decoded file already
  // carries one.
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
  // ⛔ Two incoming tasks CAN land on one current task: one reaching it through
  // MG-3's recorded origin and another through the uid it happens to carry now.
  // Nothing in table T-032 rules on that, so the later one wins and the earlier
  // one is lost -- and it shows in the report, where the uid appears twice among
  // the overwritten. Reported rather than settled here.
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
    // Nothing here answers to that uid, so it keeps it -- and the exchange
    // partner's identifier survives the merge (5.4: 識別子は交換相手のものを
    // そのまま使い、代理キーを作らない).
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

    // The `Task` row itself comes from the file in both formats. Every column
    // of it is the exchange partner's (table T-058 marks them Own, Consume or
    // Carry, the fade days included), so MG-8's 「置き換えるのは取込元が持つ値
    // だけ」 leaves none of them behind.
    const dependencies: Dependency[] = []
    for (const dependency of task.dependencies) {
      const predecessor = mergedUidOf.get(dependency.predecessorUid)
      if (predecessor === undefined) {
        // The predecessor is not in the file. Pointing it at whatever holds
        // that uid here would be GRS deciding 同じか別か (FR-022, MUST NOT),
        // and keeping it would leave the dangling reference `IV-2` forbids.
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

    // MG-8 / MG-8a -- the ONE place the two formats part.
    //   MSPDI    : 見た目と、どの行に載っているかを保つこと (MUST). MSPDI holds
    //              neither, and replacing the row wholesale is what loses the
    //              multi-bar placement on every import.
    //   GRS JSON : 見た目と行の所属も取込元の値で置き換えること (MUST).
    // A task the merge ADDS has nothing of its own to keep, so it takes the
    // file's in either format -- otherwise it would reach the document with no
    // row at all, which `IV-6` forbids.
    if (request.format === 'grsJson' || !wasHeld) {
      const visual = incomingVisualByTaskUid.get(task.uid)
      if (visual === undefined) visuals.delete(uid)
      else visuals.set(uid, { ...visual, taskUid: uid })

      const member = incomingMemberByTaskUid.get(task.uid)
      if (member !== undefined) members.set(uid, { ...member, taskUid: uid })
    }

    // MG-13 again: その回に取り込んだものへ記録する. The file's own origins are
    // not carried in -- they record ITS import history, and what this document
    // has to know is that the task came from this file, in this round. `IV-15`
    // holds because `Project.importSeq` below is written the same value.
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
      // `CD-1` and `CD-5` read forward: an assignment whose task or whose
      // resource is not here is the dangling reference they exist to prevent.
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
  // Added when the id is new, left alone when both sides hold one: a note is
  // what a person wrote, and no row says a file may overwrite it.
  // ⚠️ A note anchored to a row that is not in the merged document would be the
  // dangling reference `CD-2` removes on deletion (`IV-2`), so it is left out
  // and named.
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
  // ⚠️ 上書き takes what the FILE states and no more, which is MG-8's principle
  // applied to this group: a key the file does not carry is not a value it is
  // overwriting with. OP-6's defaulting is not run here -- the current group is
  // already complete, and OP-6 excludes 合流 in as many words.
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
    // A merge does not touch 変更前の予定: FR-015's frame is filled by OP-9 and
    // by nothing else.
    baselineTasks: current.baselineTasks,
  }

  const document: Document = { ...request.current, schedule, documentSettings }

  // ---- MG-7 and MG-11: what has to be said -------------------------------
  const touched = new Set([...overwritten, ...added])
  const onlyInCurrent: number[] = []
  const missingSinceLastImport: number[] = []
  for (const task of current.tasks) {
    if (touched.has(task.uid)) continue
    // MG-7: 消さずに残し、そのことを知らせるだけにする. FR-022 states the same
    // as a MUST NOT, so nothing above removes them.
    onlyInCurrent.push(task.uid)
    // MG-11: 前回は届いていて、今回届かなかったタスク. 前回 is the round MG-13's
    // counter names, and there is no other way to know it.
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
      // UN-6 makes 合流での上書き undoable, UN-1 the tasks it adds and UN-6a the
      // dependencies that arrive with them. FR-031 folds one operation into one
      // step, so one import is one step.
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
 * MG-4 applied to the ten rows of table T-224, and MG-13 to the counter.
 *
 * The choice answers every conflicting row at once -- MG-9's granularity, which
 * MG-12 states again for the settings and which MG-4's own 「タスクとは別に」
 * puts beside the task question rather than inside it. A row that is empty here
 * and filled there is not a conflict and is simply taken: 合流 は現在の文書へ
 * 足す.
 *
 * ⚠️ Every other column of `Project` stays the current document's. `themeHue`
 * is FR-041's, `statusDate` is FR-046's, `title` is FR-035's (which FR-074
 * excludes from this face in as many words), the four calendar columns are
 * FR-054's, and `carry` is what THIS document owes the exchange partner (table
 * T-053).
 *
 * @purity pure
 */
function mergedProject(input: MergeInput, importSeq: number, uidHighWaterMark: number): Project {
  const current = input.request.current.schedule.project
  const incoming = input.request.incoming.schedule.project
  const conflicting = new Set(input.profileRows)
  const overwrite = input.answers.profileConflict === 'overwrite'

  // ⚠️ The one cast in this file, and it buys the table: writing the ten rows
  // out by name would put table T-224 in two places, and the next row added to
  // it would land in one of them. It is sound because every key comes from
  // `keyof Project` and every value is that same column read off one of the two
  // documents, so no column can receive another column's type.
  const held: Record<string, unknown> = { ...current }
  for (const column of PROFILE_COLUMNS) {
    const mine = current[column.key]
    const theirs = incoming[column.key]
    held[column.key] = conflicting.has(column.row) ? (overwrite ? theirs : mine) : (mine ?? theirs)
  }

  return { ...(held as unknown as Project), importSeq, uidHighWaterMark }
}
