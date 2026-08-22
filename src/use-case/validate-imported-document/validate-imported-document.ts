// ValidateImportedDocument -- public entry of this folder.
//
// @unit      UF-22   (docs/spec/05-07-design.md, table T-075)
// @component ValidateImportedDocument, layer UseCase (table T-062)
// @purity    pure
// @publishes table T-064 row PI-13
//
// FR-023 / NFR-009: the strict check of untrusted input, and the one place the
// three import routes share (CP-13). Table T-008 marks R-1 (a file), R-3 (what
// came back out of Web Storage) and R-5 (the Agent API) untrusted, and OP-5 of
// table T-024a sends every one of them through this BEFORE OP-3 asks the person
// what to do with the document they already have -- asking first would throw
// that document away for an input that is then refused, which is the partial
// application FR-023 forbids.
//
// ⭐ ALL OR NOTHING. FR-023: "超えた入力は取り込まずに知らせること（MUST）。部分的
// に適用してはならない（MUST NOT）". This unit only ever answers yes or no about
// the WHOLE candidate. It never edits, drops or clamps a row to make one fit,
// and it returns nothing that could be mistaken for a repaired document.
// ⚠️ A refusal is a VALUE, never a throw (AG-8 of table T-035, R7.10).
//
// ---- what it refuses -------------------------------------------------------
//
//   rule           what                                        also stated as
//   S-113  T-211   the source is bigger than importMaxBytes         --
//   S-114  T-211   more `Task` rows than importMaxItems             --
//   S-115  T-211   the WBS nests deeper than importMaxDepth         --
//   FR-023         `Task.wbsParentUid` closes a ring              IV-4
//   S-119/S-120    a date column outside table T-214              IV-14
//   FR-012         a `Task` with no `start` or no `finish`          --
//   FR-012         `finish` before `start`                        IV-10
//
// The three rows in the last column are conditions table T-220 also states as
// document invariants, and `scheduleViolations` (PI-1) answers those for a
// document already in hand. They are checked HERE as well because the moment is
// different, not because the rule is: T-220 asks "is this document sound", and
// FR-023 asks "may this untrusted thing become the document at all", which has
// to be answered while the current document is still standing (OP-5). FR-023
// names the ring and the date range in as many words, and FR-012 sends both of
// its own rules here ("取り込む入力は `FR-023` の検証で弾く"). The ring is not
// optional either way: the depth walk cannot terminate on a ring, which is why
// FR-023 records that the depth bound "循環では…検出できない".
//
// ---- what it does NOT check ------------------------------------------------
//
//   - The other fourteen invariants of table T-220 (IV-1 to IV-3, IV-5 to IV-9,
//     IV-11 to IV-13, IV-15 to IV-17). `scheduleViolations` (PI-1) owns them and
//     Chapter 6.1 requires it to be driven by the table rather than written out
//     row by row (MUST). ⛔ It is not written yet -- schedule.ts says so in as
//     many words -- so nothing runs them today. Whoever imports must run it
//     beside this call; folding it into this unit is a change to CP-13's scope,
//     not an implementation choice. Reported.
//   - `TaskGroup` depth (S-125 / IV-5). FR-058: "取り込みでは `TaskGroup` の深さ
//     上限で受け付けを拒んではならない（MUST NOT）". S-115 bounds the WBS depth
//     and S-125 is a different value for a different tree.
//   - Per-column type, nullability, string length, numeric range and spelled
//     enumerations. The generated schema (`_assets/grs-document.schema.json`)
//     already forces those, which is why Chapter 6.1 keeps single-column
//     conditions out of table T-220. The candidate arrives typed as `Document`
//     for the same reason: whoever built it (DocumentCodec, PI-20) is the only
//     place that can turn a parsed value that is NOT one into a refusal.
//     ⛔ docs/spec does not say where that schema check runs. Reported.
//   - FR-023's other two MUSTs -- disabling XML external entities and never
//     assigning to `innerHTML`. A pure unit holds neither a parser nor a DOM;
//     they belong to DocumentCodec (PI-20) and to the renderers.
//   - The document format version. OP-7 sends that to FR-073.
//   - How deeply `CarryElement.children` (AT-126) nests. ⛔ It is the second
//     unbounded nesting an untrusted file can carry, and no row bounds it:
//     S-115 says WBS in as many words, and FR-023 lists "ネストの深さ" once.
//     Not guessed at here. Reported.
//   - Whether the bounds themselves are sane. `clampedSettings` (PI-2) holds
//     every settings row to its own limits.
//
// ---- the two numbers this file reads, and where the specification states
// ---- how to read them (CR-173) ----------------------------------------------
//
// The megabyte. S-113 is named `importMaxBytes` but holds a COUNT OF MEGABYTES
// -- its value column reads "`32` MB" and its bounds (1 and 256) are megabytes
// too -- so the byte count has to be converted. The row states the factor:
// 1 MB = 1024 * 1024 bytes. A file of 32,000,001 bytes is accepted; one of
// 33,554,433 bytes is refused.
//
// Where depth starts counting. S-115 gives the WBS a maximum depth of 64 and
// states that a root row -- a `Task` whose `wbsParentUid` is `null` -- is at
// depth 1. That agrees with FR-004, where a depth of 3 is the three levels a
// person would have called 大 / 中 / 小.
//
// ✅ STOP 3 is closed (CR-179). A date column naming no day used to pass
// THROUGH here, because table T-214 bounded the range and nobody had said what
// an unreadable value was. FR-023 now names both as one thing -- "文書が使えな
// い日付" -- and refuses to take either in silence. ⚠️ The remedy is not this
// file's to apply: it reports, and FR-023 makes whoever called it offer the
// person two choices (drop those rows per CD-1, or stop the load). ⭐ The empty
// string is refused too: a column that allows absence spells it `null`.
//
// Nothing outside this folder may import any other file in it
// (Chapter 5.3, MUST NOT), so every name the component publishes
// leaves through here.

import type { Document } from '../../entity/document-model/document/document'
import type { DocumentSettings } from '../../entity/document-model/document-settings/document-settings'
import {
  DATE_COLUMNS,
  compareDays,
  dayOf,
  type CalendarDay,
  type Task,
} from '../../entity/document-model/schedule/schedule'

/**
 * The five rows of tables T-211 and T-214 this unit judges by.
 *
 * ⚠️ They are TAKEN FROM the settings, never re-typed: `DocumentSettings`
 * publishes all five, and `Pick` keeps this list tied to that type so a renamed
 * key breaks the build instead of quietly widening a bound.
 *
 * ⛔ They must be the RECEIVING document's settings -- the ones in force before
 * the import -- and never the arriving input's own. OP-5 puts this check before
 * OP-3 is even asked, and OP-6 restores an arriving `documentSettings` only
 * after 置き換え has been chosen, so at this moment the settings in force are
 * necessarily the current document's. Reading the input's own bounds would let
 * an untrusted file raise its own ceiling, which empties NFR-009.
 */
export type ImportBounds = Pick<
  DocumentSettings,
  'importMaxBytes' | 'importMaxItems' | 'importMaxDepth' | 'importMinDate' | 'importMaxDate'
>

/** What is being judged: the parsed input, plus the two things it cannot hold. */
export interface ImportCandidate {
  /**
   * The document the input parsed to. Nothing has been adopted yet -- OP-5 is
   * reached before OP-3 chooses 置き換え / 合流 / 重ねる.
   */
  readonly document: Document
  /**
   * How many BYTES the source occupied as it arrived: the file's size (R-1 of
   * table T-008), the length of the stored text (R-3), or of the call's payload
   * (R-5). A pure function cannot measure it, so the caller states it, the way
   * `historyWithStep` is told the size of a step.
   *
   * ⚠️ Bytes. S-113 states its limit in megabytes, and states the factor that
   * converts it: 1 MB = 1024 * 1024 bytes (CR-173).
   */
  readonly byteLength: number
  /**
   * The `Task` rows that are EX-5's 中身のない行 -- rows the exchange partner
   * carries that are not tasks, kept so that export can put them back "元の位置
   * と形のまま". FR-012 puts them outside its own start/finish rule (MUST) and
   * forbids one of them failing the whole file (MUST NOT), which would take
   * FR-021's lossless round trip down with it.
   *
   * ⛔ Whoever parsed the input is the only one that can know, so it is told
   * here: docs/spec neither says how an empty row is recognised nor where it is
   * held. (The previous project's answer, kept as a reference and not as a
   * decision: MSPDI `Task/IsNull = 1`, the element carried whole in Carry with
   * no native row -- on which reading this list is simply always empty.)
   * Reported.
   */
  readonly emptyRowTaskUids: readonly number[]
}

/**
 * One reason the input was refused.
 *
 * ⚠️ It names the item and the rule rather than describing the failure in
 * prose alone, because NT-1 of table T-037 requires the notice to say "どの項目
 * が、なぜ誤りか" (MUST).
 */
export interface ImportRefusal {
  /** The requirement, table row or settings row doing the refusing, e.g. `S-113`. */
  readonly rule: string
  /** Where, as a JSON pointer into the candidate. `''` is the input as a whole. */
  readonly at: string
  readonly what: string
  /**
   * Which row of table T-037 the notice follows. The three resource bounds of
   * table T-211 are NT-6 ("資源の上限に達したとき"); everything else is NT-1
   * ("入力を受け付けないとき"). The wording is the shell's, but only this file
   * knows which of the two a refusal is.
   */
  readonly notice: 'NT-1' | 'NT-6'
}

/**
 * Yes or no about the whole candidate. There is no third answer, and this file
 * never hands back a mended document.
 *
 * ⚠️ FR-023 does let a PERSON choose to drop the rows a date refusal names and
 * take the rest (the other choice being to stop the load). That choice is not
 * made here: a refusal carries the row and the column in `at`, which is what
 * the caller needs to offer it and to count what would go. ⛔ Mending here
 * would put the choice in a pure function that cannot ask anyone.
 */
export type ImportVerdict =
  | { readonly ok: true }
  | { readonly ok: false; readonly refusals: readonly ImportRefusal[] }

/** The factor S-113's remark states: 1 MB = 1024 * 1024 bytes (CR-173). */
const BYTES_PER_MEGABYTE = 1024 * 1024

/** @purity pure */
function refusal(rule: string, at: string, what: string, notice: 'NT-1' | 'NT-6'): ImportRefusal {
  return { rule, at, what, notice }
}

// ---- table T-058's date columns --------------------------------------------
//
// IV-14 points at "表 T-058 の型の欄が日付または日時とする列" rather than naming
// them, so that adding a column does not have to be remembered in two places.
//
// ⭐ CR-175 made that reachable: erd.json marks each such column, and
// `DATE_COLUMNS` is generated from those marks. Before it, six lists here were
// a COPY of the ERD -- `satisfies` caught a misspelling but nothing caught a
// column that had been added and never listed.
//
// ⚠️ The stamp's two instants (`documentStamp.scheduleUpdatedUtc` and
// `settingsUpdatedUtc`) and `changeLog.changedUtc` are NOT in it: AT-127,
// AT-129 and AT-133 give their type as 文字列, so table T-058 does not call
// them dates and IV-14 does not reach them. ⚠️ They are instants and not days
// on purpose (FR-063), so table T-214's two ends would not be the right bound
// for them either. Neither does `scrollDate` or the dual cursor --
// they are in the presentation group, which table T-058 does not describe.

/** The two ends of table T-214, once each string has been read as a day. */
interface AcceptedDays {
  /** S-119. */
  readonly min: CalendarDay
  /** S-120. */
  readonly max: CalendarDay
}

/** One allocation for every row whose date columns all sit inside table T-214. */
const NO_REFUSALS: readonly ImportRefusal[] = []

/**
 * Every date column of one row that falls outside table T-214.
 *
 * ⚠️ A column holding a string that names no day is passed over, not refused --
 * STOP 3 in the header says why, and says that the choice is not this file's to
 * make silently.
 *
 * ⚠️ It ANSWERS with the refusals rather than writing into an array handed to
 * it. Rewriting an argument is one of the six effects R7's table names, so a
 * helper that did it could not carry `@purity pure` truthfully -- and the tag
 * has to be true, not merely present. `anchorRefusals` in `edit-annotation.ts`
 * is shaped this way for the same reason. The array is built only once there is
 * something to put in it, so a row that is entirely inside the range costs
 * nothing over the walk it already needs.
 *
 * @purity pure
 */
function sweepDateColumns<TRow extends object>(
  row: TRow,
  columns: readonly (keyof TRow & string)[],
  at: string,
  accepted: AcceptedDays,
): readonly ImportRefusal[] {
  let found: ImportRefusal[] | null = null
  for (const column of columns) {
    const value: unknown = row[column]
    // `null` is every one of these columns' own value for "absent" and carries
    // no date to judge.
    if (typeof value !== 'string') continue
    const day = dayOf(value)
    // A string that names no day. FR-023 puts it in the same class as a date
    // outside table T-214 -- both are "a date the document cannot use" -- and
    // refuses to take either in silence. ⚠️ The empty string is HERE, not
    // waved through as "absent": a column that allows absence spells it `null`
    // (FR-024's contract), so an empty string is already outside the contract.
    if (day === null) {
      found ??= []
      found.push(refusal('IV-14', `${at}/${column}`,
                         `${JSON.stringify(value)} names no day`, 'NT-1'))
      continue
    }
    if (compareDays(day, accepted.min) < 0) {
      found ??= []
      found.push(refusal('S-119', `${at}/${column}`, `${value} is before importMinDate`, 'NT-1'))
    } else if (compareDays(day, accepted.max) > 0) {
      found ??= []
      found.push(refusal('S-120', `${at}/${column}`, `${value} is after importMaxDate`, 'NT-1'))
    }
  }
  return found ?? NO_REFUSALS
}

/** What the climb up `wbsParentUid` found. */
interface WbsShape {
  /** Every `Task` whose depth is settled. A row with no parent is depth 1. */
  readonly depthByUid: ReadonlyMap<number, number>
  /** One entry per ring, holding the uids that close it. */
  readonly rings: readonly (readonly number[])[]
}

/**
 * The depth of every `Task` in the WBS, and the rings that stop one being
 * decided. Both come out of the same climb because FR-023 says they must: "循環
 * では深さが確定しないので、ネストの深さの上限でも検出できない" -- a walk that did
 * not watch for the ring would never come back.
 *
 * ⭐ Indexed once with a `Map` (R5 / NFR-013). A `find` inside the climb would
 * make this O(n^2) over an array the bound above still lets reach 200,000 rows.
 * Each `Task` is climbed past once and then answered from the memo, so the whole
 * pass is O(n).
 *
 * ⚠️ A `wbsParentUid` naming no `Task` ends the climb as if the row were a root.
 * That dangling reference is IV-2's business and `scheduleViolations` reports it;
 * inventing a second answer here would put the same rule in two places.
 *
 * @purity pure
 */
function wbsShapeOf(tasks: readonly Task[]): WbsShape {
  const byUid = new Map<number, Task>()
  for (const task of tasks) byUid.set(task.uid, task)

  const depthByUid = new Map<number, number>()
  /** Uids whose depth cannot be settled: on a ring, or hanging under one. */
  const broken = new Set<number>()
  const rings: (readonly number[])[] = []

  for (const task of tasks) {
    if (depthByUid.has(task.uid) || broken.has(task.uid)) continue

    // Deepest first: `chain[0]` is where the climb started.
    const chain: number[] = []
    const positionOnChain = new Map<number, number>()
    let base = 0
    let ring: readonly number[] | null = null
    let underRing = false
    let at: Task | undefined = task

    while (at !== undefined) {
      if (broken.has(at.uid)) {
        underRing = true
        break
      }
      const repeated = positionOnChain.get(at.uid)
      if (repeated !== undefined) {
        ring = chain.slice(repeated)
        break
      }
      const settled = depthByUid.get(at.uid)
      if (settled !== undefined) {
        base = settled
        break
      }
      positionOnChain.set(at.uid, chain.length)
      chain.push(at.uid)
      const parentUid: number | null = at.wbsParentUid
      at = parentUid === null ? undefined : byUid.get(parentUid)
    }

    if (ring !== null) {
      rings.push(ring)
      for (const uid of chain) broken.add(uid)
    } else if (underRing) {
      // The ring itself was already reported; a row hanging under it adds no
      // second reason and the whole input is refused either way.
      for (const uid of chain) broken.add(uid)
    } else {
      // `base` is where the climb stopped: 0 for a root, otherwise the depth
      // already settled for that ancestor.
      let depth = base + chain.length
      for (const uid of chain) {
        depthByUid.set(uid, depth)
        depth -= 1
      }
    }
  }

  return { depthByUid, rings }
}

/**
 * The deepest row the WBS holds, or null when there are no rows to measure.
 *
 * ⚠️ One refusal names the deepest row rather than one per row past the bound:
 * S-115 is a resource ceiling reported under NT-6, and HM-3a measures a subtree
 * the same way -- "部分木は移動後の最深部で測る".
 *
 * @purity pure
 */
function deepestOf(depthByUid: ReadonlyMap<number, number>):
  { readonly uid: number; readonly depth: number } | null {
  let deepest: { uid: number; depth: number } | null = null
  for (const [uid, depth] of depthByUid) {
    if (deepest === null || depth > deepest.depth) deepest = { uid, depth }
  }
  return deepest
}

/**
 * Whether this untrusted input may become the document, all of it or none.
 *
 * `bounds` carries what the candidate must NOT be allowed to state about
 * itself; the caller takes all five from the settings of the document it is
 * holding now (see `ImportBounds`). `candidate` carries the two things a parsed
 * document cannot know about its own arrival: how many bytes it took up, and
 * which of its rows are EX-5's empty rows.
 *
 * ⚠️ Refusals are collected rather than thrown, and the answer is about the
 * whole input: a caller that sees `ok: false` must adopt nothing.
 *
 * @purity pure
 */
export function validateImportedDocument(
  candidate: ImportCandidate,
  bounds: ImportBounds,
): ImportVerdict {
  // ---- table T-211, and before anything walks the rows ---------------------
  // ⭐ These two return early on purpose. They are the ceilings that exist so
  // that a huge input is turned away BEFORE work proportional to its size is
  // done, and every sweep below is bounded by the count this one lets through.
  if (candidate.byteLength > bounds.importMaxBytes * BYTES_PER_MEGABYTE) {
    return {
      ok: false,
      refusals: [
        refusal(
          'S-113',
          '',
          `${candidate.byteLength} bytes is over importMaxBytes (${bounds.importMaxBytes} MB)`,
          'NT-6',
        ),
      ],
    }
  }

  const schedule = candidate.document.schedule
  const tasks = schedule.tasks
  // ⚠️ The array as it stands, EX-5's empty rows included if the parser put any
  // there. S-114 bounds "取り込む `Task` の件数" so that the import stops before
  // resources run out, and a row costs what it costs whether or not it is shown
  // as a task. On the reference reading of EX-5 the question does not arise --
  // an empty row never reaches `tasks` at all.
  if (tasks.length > bounds.importMaxItems) {
    return {
      ok: false,
      refusals: [
        refusal(
          'S-114',
          '/schedule/tasks',
          `${tasks.length} Tasks is over importMaxItems (${bounds.importMaxItems})`,
          'NT-6',
        ),
      ],
    }
  }

  // ⚠️ Everything from here is collected, not returned one at a time. The whole
  // input is refused whatever the count, and NT-1 asks the notice to say WHICH
  // item is wrong -- so every offending row is named. Nothing caps the list:
  // the count above already bounds it, and a cap would be a number docs/spec
  // does not state.
  const found: ImportRefusal[] = []

  // ---- table T-211: the ring, then the depth -------------------------------
  const wbs = wbsShapeOf(tasks)
  for (const ring of wbs.rings) {
    found.push(
      refusal(
        'FR-023',
        '/schedule/tasks',
        `wbsParentUid closes a ring over Task uids ${ring.join(', ')}`,
        'NT-1',
      ),
    )
  }
  const deepest = deepestOf(wbs.depthByUid)
  if (deepest !== null && deepest.depth > bounds.importMaxDepth) {
    found.push(
      refusal(
        'S-115',
        '/schedule/tasks',
        `Task uid ${deepest.uid} sits at WBS depth ${deepest.depth}, `
        + `over importMaxDepth (${bounds.importMaxDepth})`,
        'NT-6',
      ),
    )
  }

  // ---- table T-214, and FR-012's two rules ---------------------------------
  const min = dayOf(bounds.importMinDate)
  const max = dayOf(bounds.importMaxDate)
  if (min === null) {
    // Refused rather than skipped: an input whose range cannot be applied has
    // not been shown to sit inside it, and FR-023 lets nothing in unshown.
    found.push(refusal('S-119', '', `importMinDate names no day: ${bounds.importMinDate}`, 'NT-1'))
  }
  if (max === null) {
    found.push(refusal('S-120', '', `importMaxDate names no day: ${bounds.importMaxDate}`, 'NT-1'))
  }
  const accepted: AcceptedDays | null = min !== null && max !== null ? { min, max } : null

  // EX-5's rows, indexed once so the sweep below stays O(n) (R5 / NFR-013).
  const emptyRowUids = new Set(candidate.emptyRowTaskUids)

  if (accepted !== null) {
    found.push(
      ...sweepDateColumns(schedule.project, DATE_COLUMNS.Project, '/schedule/project', accepted),
    )
  }

  for (const [index, task] of tasks.entries()) {
    const at = `/schedule/tasks/${index}`
    if (accepted !== null) {
      found.push(...sweepDateColumns(task, DATE_COLUMNS.Task, at, accepted))
    }

    // FR-012: "`start` または `finish` を持たない `Task` を、画面に出す `Task` と
    // して受け付けてはならない（MUST NOT）…取り込む入力は `FR-023` の検証で弾く".
    // The stacking order, the days late and the percent complete all assume both
    // are there.
    // ⚠️ EX-5's empty rows are outside this (MUST). They are not shown as tasks,
    // so none of those three ever runs for one, and refusing a file because it
    // holds one is forbidden in as many words (MUST NOT).
    if (!emptyRowUids.has(task.uid) && (task.start === null || task.finish === null)) {
      found.push(
        refusal('FR-012', at, `Task uid ${task.uid} has no start or no finish`, 'NT-1'),
      )
    }

    // FR-012 again: "`finish` が `start` より前の入力を受け付けてはならない（MUST
    // NOT）…外から来た入力は `FR-023` の検証で弾く". Refused, never mended --
    // rounding finish up to start is forbidden (MUST NOT), because it would
    // change the data without saying so.
    const start = dayOf(task.start)
    const finish = dayOf(task.finish)
    if (start !== null && finish !== null && compareDays(finish, start) < 0) {
      found.push(
        refusal('FR-012', at, `Task uid ${task.uid} finishes before it starts`, 'NT-1'),
      )
    }
  }

  if (accepted !== null) {
    for (const [calendarIndex, calendar] of schedule.calendars.entries()) {
      for (const [exceptionIndex, exception] of calendar.exceptions.entries()) {
        found.push(
          ...sweepDateColumns(
            exception,
            DATE_COLUMNS.Exception,
            `/schedule/calendars/${calendarIndex}/exceptions/${exceptionIndex}`,
            accepted,
          ),
        )
      }
    }
    for (const [index, box] of schedule.commentBoxes.entries()) {
      found.push(
        ...sweepDateColumns(box, DATE_COLUMNS.CommentBox, `/schedule/commentBoxes/${index}`, accepted),
      )
    }
    for (const [index, box] of schedule.highlightBoxes.entries()) {
      found.push(
        ...sweepDateColumns(box, DATE_COLUMNS.HighlightBox, `/schedule/highlightBoxes/${index}`, accepted),
      )
    }
    for (const [index, baseline] of schedule.baselineTasks.entries()) {
      found.push(
        ...sweepDateColumns(baseline, DATE_COLUMNS.BaselineTask, `/schedule/baselineTasks/${index}`, accepted),
      )
    }
  }

  return found.length === 0 ? { ok: true } : { ok: false, refusals: found }
}
