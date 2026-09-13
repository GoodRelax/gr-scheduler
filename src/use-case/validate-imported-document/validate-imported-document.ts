// ValidateImportedDocument -- public entry of this folder.
//
// @unit      UF-22   (docs/spec/05-07-design.md, table T-075)
// @component ValidateImportedDocument, layer UseCase (table T-062)
// @purity    pure
// @publishes table T-064 row PI-13
//
// FR-023 / NFR-009: the one strict check the untrusted routes share (CP-13;
// CHN-1, CHN-3 and CHN-5 of table T-008). OP-5 runs it BEFORE OP-3 asks what to
// do with the current document -- asking first would discard that document for
// an input that is then refused.
//
// All or nothing: a yes or no about the whole candidate, never a mended row,
// and a refusal is a value, not a throw (R7.10).
//
// The ring (IV-4), the date range (IV-14) and finish-before-start (IV-10) are
// also invariants `scheduleViolations` (PI-1) answers. They are checked here too
// because this asks whether untrusted input may become the document at all,
// while the current one still stands. The ring check is not optional: the depth
// walk cannot end on a ring.
//
// ---- what it does NOT check ------------------------------------------------
//
//   - The rest of table T-220: `scheduleViolations` (PI-1) owns it, and
//     `frame-loop.ts` runs it on the arriving document right after this
//     verdict. Folding it in here would change CP-13's scope.
//   - `TaskGroup` depth (S-125): FR-058 forbids refusing an import on it.
//   - Single-column type, nullability, length, range and enumerations: the
//     generated schema forces those (Chapter 6.1), and only DocumentCodec
//     (PI-20) can refuse a parsed value that is not a `Document`.
//     ⛔ docs/spec does not say where that schema check runs. Reported.
//   - FR-023's XML-entity and `innerHTML` rules: DocumentCodec (PI-20) and the
//     renderers hold the parser and the DOM.
//   - The document format version: OP-7 sends that to FR-073.
//   - How deeply `CarryElement.children` (AT-126) nests. ⚠️ S-133
//     (`carryMaxDepth`) bounds it, and `ImportBounds` does not carry it yet.
//     Reported.
//   - Whether the bounds themselves are sane: `clampedSettings` (PI-2).
//
// A date column naming no day is refused like one out of range (FR-023); the
// caller, not this unit, offers to drop those rows (CD-1) or stop the load.

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
 * The rows of tables T-211 and T-214 this unit judges by, picked from
 * `DocumentSettings` so a renamed key breaks the build.
 *
 * ⛔ The RECEIVING document's settings, never the input's own -- or an untrusted
 * file could raise its own ceiling (NFR-009). OP-6 restores an arriving
 * `documentSettings` only after OP-3, so at OP-5 these are the current ones.
 */
export type ImportBounds = Pick<
  DocumentSettings,
  'importMaxBytes' | 'importMaxItems' | 'importMaxDepth' | 'importMinDate' | 'importMaxDate'
>

/** What is being judged: the parsed input, plus the two things it cannot hold. */
export interface ImportCandidate {
  /** The document the input parsed to; nothing is adopted yet (OP-5). */
  readonly document: Document
  /**
   * How many BYTES the source occupied as it arrived (CHN-1 / CHN-3 / CHN-5 of
   * table T-008). A pure function cannot measure it, so the caller states it.
   *
   * ⚠️ Bytes, although S-113 (`importMaxBytes`) is stated in megabytes.
   */
  readonly byteLength: number
  /**
   * The `Task` rows that are EX-5's empty rows, which FR-012 exempts from its
   * start/finish rule.
   *
   * ⛔ Only the parser can know them: docs/spec says neither how an empty row
   * is recognised nor where it is held. Reported. (On the previous project's
   * reading -- MSPDI `Task/IsNull = 1`, carried whole in Carry -- this list is
   * always empty.)
   */
  readonly emptyRowTaskUids: readonly number[]
}

/**
 * One reason the input was refused.
 *
 * Names the item and the rule, not prose alone: NT-1 of table T-037 has the
 * notice say which item is wrong and why.
 */
export interface ImportRefusal {
  /** The requirement, table row or settings row doing the refusing, e.g. `S-113`. */
  readonly rule: string
  /** Where, as a JSON pointer into the candidate. `''` is the input as a whole. */
  readonly at: string
  readonly what: string
  /**
   * Which row of table T-037 the notice follows: table T-211's resource bounds
   * are NT-6, everything else NT-1. Only this file knows which a refusal is.
   */
  readonly notice: 'NT-1' | 'NT-6'
}

/**
 * Yes or no about the whole candidate, never a mended document.
 *
 * FR-023 lets a PERSON drop the rows a date refusal names; the caller offers
 * that from `at`, since a pure function cannot ask anyone.
 */
export type ImportVerdict =
  | { readonly ok: true }
  | { readonly ok: false; readonly refusals: readonly ImportRefusal[] }

/** S-113 is stated in megabytes. */
const BYTES_PER_MEGABYTE = 1024 * 1024

/** @purity pure */
function refusal(rule: string, at: string, what: string, notice: 'NT-1' | 'NT-6'): ImportRefusal {
  return { rule, at, what, notice }
}

// ---- table T-058's date columns --------------------------------------------
//
// IV-14 names table T-058's date-typed columns by type, not by name, so
// `DATE_COLUMNS` is generated from erd.json's marks rather than listed here.
//
// ⚠️ Not in it: the stamp's instants and `changeLog.changedUtc` (AT-127, AT-129,
// AT-133 are typed 文字列 and are instants, FR-063), nor `scrollDate` or the
// dual cursor (presentation group, outside table T-058).

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
 * Every date column of one row that names no day or falls outside table T-214.
 *
 * Returns the refusals instead of pushing into an array it is handed: rewriting
 * an argument is an effect R7 names, and `@purity pure` would then be false.
 * The array is built only once something goes into it.
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
    // `null` is absence and carries no date to judge.
    if (typeof value !== 'string') continue
    const day = dayOf(value)
    // A string naming no day is refused like a date out of range (FR-023).
    // ⚠️ The empty string too: absence is spelled `null` (FR-024).
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
 * decided. One climb finds both: a walk that did not watch for a ring would
 * never return (FR-023).
 *
 * Indexed once with a `Map` and memoised rather than a `find` per step
 * (R5 / NFR-013).
 *
 * ⚠️ A `wbsParentUid` naming no `Task` ends the climb as a root: that dangling
 * reference is IV-2's, reported by `scheduleViolations`, not answered twice.
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
 * One refusal names the deepest row rather than one per row past the bound:
 * S-115 is a resource ceiling (NT-6), measured at the deepest point as HM-3a does.
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
 * `bounds` come from the document held now (see `ImportBounds`); `candidate`
 * adds what a parsed document cannot know about its own arrival.
 *
 * ⚠️ A caller that sees `ok: false` must adopt nothing.
 *
 * @purity pure
 */
export function validateImportedDocument(
  candidate: ImportCandidate,
  bounds: ImportBounds,
): ImportVerdict {
  // ---- table T-211, and before anything walks the rows ---------------------
  // These two return early, so a huge input is turned away before work in
  // proportion to its size; every sweep below is bounded by the count let through.
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
  // ⚠️ Counts EX-5's empty rows too, if the parser put any in `tasks`: S-114
  // bounds resources, and a row costs the same whether or not it is shown.
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

  // Collected from here on, since NT-1 asks the notice to name every wrong item.
  // No cap: the count above bounds the list, and docs/spec states no cap.
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
    // Refused rather than skipped: an input the range cannot be applied to has
    // not been shown to sit inside it.
    found.push(refusal('S-119', '', `importMinDate names no day: ${bounds.importMinDate}`, 'NT-1'))
  }
  if (max === null) {
    found.push(refusal('S-120', '', `importMaxDate names no day: ${bounds.importMaxDate}`, 'NT-1'))
  }
  const accepted: AcceptedDays | null = min !== null && max !== null ? { min, max } : null

  // EX-5's rows, indexed once (R5 / NFR-013).
  const emptyRowUids = new Set(candidate.emptyRowTaskUids)

  if (accepted !== null) {
    found.push(
      ...sweepDateColumns(schedule.project, DATE_COLUMNS.Project, '/schedule/project', accepted),
    )
  }

  for (const [index, task] of tasks.entries()) {
    const foundAt = `/schedule/tasks/${index}`
    if (accepted !== null) {
      found.push(...sweepDateColumns(task, DATE_COLUMNS.Task, foundAt, accepted))
    }

    // FR-012. ⚠️ EX-5's empty rows are exempt: they are never shown as tasks.
    if (!emptyRowUids.has(task.uid) && (task.start === null || task.finish === null)) {
      found.push(
        refusal('FR-012', foundAt, `Task uid ${task.uid} has no start or no finish`, 'NT-1'),
      )
    }

    // FR-012: refused, never mended by rounding finish up to start.
    const start = dayOf(task.start)
    const finish = dayOf(task.finish)
    if (start !== null && finish !== null && compareDays(finish, start) < 0) {
      found.push(
        refusal('FR-012', foundAt, `Task uid ${task.uid} finishes before it starts`, 'NT-1'),
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
