// Judges whether an untrusted document may replace the current one, all or nothing.
// @unit      UF-22   (docs/spec/05-07-design.md, table T-075)
// @component ValidateImportedDocument, layer UseCase (table T-062)
// @purity    pure
// @publishes table T-064 row PI-13

import type { Document } from '../../entity/document-model/document/document'
import { SETTINGS_CONSTANTS } from '../../entity/document-model/document-settings/document-settings'
import {
  DATE_COLUMNS,
  actualLastDay,
  actualLengthOf,
  compareDays,
  dayOf,
  scheduleViolations,
  workingCalendarOf,
  type CalendarDay,
  type Task,
} from '../../entity/document-model/schedule/schedule'

export interface ImportCandidate {
  readonly document: Document
  // TRAP: bytes; a length in megabytes (S-113's unit) would let any file through.
  readonly byteLength: number
  readonly emptyRowTaskUids: readonly number[]
}

export interface ValidationRefusal {
  readonly rule: string
  readonly at: string
  readonly what: string
  readonly notice: 'NT-1' | 'NT-6'
}

export type ImportVerdict =
  | { readonly ok: true }
  | { readonly ok: false; readonly refusals: readonly ValidationRefusal[] }

const BYTES_PER_MEGABYTE = 1024 * 1024

// see IV-4, T-233
// WHY: a ring is refused under the table T-220 row it breaks, so NT-1 tells the IV-4 words, not RS-15.
const PARENT_RING_ROW = 'IV-4'

// see IV-14, T-214, T-233
// WHY: a day outside S-119..S-120 breaks IV-14, so the refusal carries that row, not the setting (CR-718).
const UNUSABLE_DATE_ROW = 'IV-14'

// see IV-10, FR-012, T-233
const FINISH_BEFORE_START_ROW = 'IV-10'

// see FR-023, FR-076, T-211, T-233
// WHY: no T-220 row owns these refusals, so each carries its own T-233 row, never RS-15 (CR-719).
const OVER_MAX_BYTES_ROW = 'RS-78'

// see FR-023, FR-076, T-211, T-233
const OVER_MAX_ITEMS_ROW = 'RS-79'

// see FR-023, FR-076, T-211, T-233
const OVER_MAX_DEPTH_ROW = 'RS-80'

// see FR-012, FR-076, T-233
const UNDATED_TASK_ROW = 'RS-81'

/** @purity pure */
function refusal(rule: string, at: string, what: string, notice: 'NT-1' | 'NT-6'): ValidationRefusal {
  return { rule, at, what, notice }
}

interface AcceptedDays {
  readonly min: CalendarDay
  readonly max: CalendarDay
}

const NO_REFUSALS: readonly ValidationRefusal[] = []

/** @purity pure */
function sweepDateColumns<TRow extends object>(
  row: TRow,
  columns: readonly (keyof TRow & string)[],
  at: string,
  accepted: AcceptedDays,
): readonly ValidationRefusal[] {
  let found: ValidationRefusal[] | null = null
  for (const column of columns) {
    const value: unknown = row[column]
    if (typeof value !== 'string') continue
    const day = dayOf(value)
    if (day === null) {
      found ??= []
      found.push(refusal(UNUSABLE_DATE_ROW, `${at}/${column}`,
                         `${JSON.stringify(value)} names no day`, 'NT-1'))
      continue
    }
    if (compareDays(day, accepted.min) < 0) {
      found ??= []
      found.push(refusal(UNUSABLE_DATE_ROW, `${at}/${column}`, `${value} is before importMinDate`, 'NT-1'))
    } else if (compareDays(day, accepted.max) > 0) {
      found ??= []
      found.push(refusal(UNUSABLE_DATE_ROW, `${at}/${column}`, `${value} is after importMaxDate`, 'NT-1'))
    }
  }
  return found ?? NO_REFUSALS
}

interface WbsShape {
  readonly depthByUid: ReadonlyMap<number, number>
  readonly rings: readonly (readonly number[])[]
}

/** @purity pure */
function wbsShapeOf(tasks: readonly Task[]): WbsShape {
  const byUid = new Map<number, Task>()
  for (const task of tasks) byUid.set(task.uid, task)

  const depthByUid = new Map<number, number>()
  const broken = new Set<number>()
  const rings: (readonly number[])[] = []

  for (const task of tasks) {
    if (depthByUid.has(task.uid) || broken.has(task.uid)) continue

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
      const parentUid: number | null = at.parentTaskUid
      at = parentUid === null ? undefined : byUid.get(parentUid)
    }

    if (ring !== null) {
      rings.push(ring)
      for (const uid of chain) broken.add(uid)
    } else if (underRing) {
      for (const uid of chain) broken.add(uid)
    } else {
      let depth = base + chain.length
      for (const uid of chain) {
        depthByUid.set(uid, depth)
        depth -= 1
      }
    }
  }

  return { depthByUid, rings }
}

/** @purity pure */
function deepestOf(depthByUid: ReadonlyMap<number, number>):
  { readonly uid: number; readonly depth: number } | null {
  let deepest: { uid: number; depth: number } | null = null
  for (const [uid, depth] of depthByUid) {
    if (deepest === null || depth > deepest.depth) deepest = { uid, depth }
  }
  return deepest
}

// see FR-023, FR-012, NFR-009, T-211, T-214
/** @purity pure */
export function validateImportedDocument(
  candidate: ImportCandidate,
): ImportVerdict {
  const bounds = SETTINGS_CONSTANTS
  // TRAP: keep these two returns ahead of every walk below, which relies on the count being bounded.
  if (candidate.byteLength > bounds.importMaxBytes * BYTES_PER_MEGABYTE) {
    return {
      ok: false,
      refusals: [
        refusal(
          OVER_MAX_BYTES_ROW,
          '',
          `${candidate.byteLength} bytes is over importMaxBytes (${bounds.importMaxBytes} MB)`,
          'NT-6',
        ),
      ],
    }
  }

  const schedule = candidate.document.schedule
  const tasks = schedule.tasks
  if (tasks.length > bounds.importMaxItems) {
    return {
      ok: false,
      refusals: [
        refusal(
          OVER_MAX_ITEMS_ROW,
          '/schedule/tasks',
          `${tasks.length} Tasks is over importMaxItems (${bounds.importMaxItems})`,
          'NT-6',
        ),
      ],
    }
  }

  const found: ValidationRefusal[] = []

  const wbs = wbsShapeOf(tasks)
  for (const ring of wbs.rings) {
    found.push(
      refusal(
        PARENT_RING_ROW,
        '/schedule/tasks',
        `parentTaskUid closes a ring over Task uids ${ring.join(', ')}`,
        'NT-1',
      ),
    )
  }
  const deepest = deepestOf(wbs.depthByUid)
  if (deepest !== null && deepest.depth > bounds.importMaxDepth) {
    found.push(
      refusal(
        OVER_MAX_DEPTH_ROW,
        '/schedule/tasks',
        `Task uid ${deepest.uid} sits at WBS depth ${deepest.depth}, `
        + `over importMaxDepth (${bounds.importMaxDepth})`,
        'NT-6',
      ),
    )
  }

  const min = dayOf(bounds.importMinDate)
  const max = dayOf(bounds.importMaxDate)
  if (min === null) {
    // WHY: refused rather than skipped: a range that cannot be read proves nothing about the input.
    found.push(refusal(UNUSABLE_DATE_ROW, '', `importMinDate names no day: ${bounds.importMinDate}`, 'NT-1'))
  }
  if (max === null) {
    found.push(refusal(UNUSABLE_DATE_ROW, '', `importMaxDate names no day: ${bounds.importMaxDate}`, 'NT-1'))
  }
  const accepted: AcceptedDays | null = min !== null && max !== null ? { min, max } : null

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

    if (!emptyRowUids.has(task.uid) && (task.start === null || task.finish === null)) {
      found.push(
        refusal(UNDATED_TASK_ROW, foundAt, `Task uid ${task.uid} has no start or no finish`, 'NT-1'),
      )
    }

    const start = dayOf(task.start)
    const finish = dayOf(task.finish)
    if (start !== null && finish !== null && compareDays(finish, start) < 0) {
      found.push(
        refusal(FINISH_BEFORE_START_ROW, foundAt, `Task uid ${task.uid} finishes before it starts`, 'NT-1'),
      )
    }

    // see IV-21
    const actualStart = dayOf(task.actualStart)
    const lastDay = actualLastDay(task)
    const length = actualStart === null || lastDay === null || compareDays(lastDay, actualStart) >= 0
      ? 0
      : actualLengthOf(workingCalendarOf(schedule), actualStart, lastDay)
    if (length < 0) {
      found.push(
        refusal(
          'IV-21',
          foundAt,
          `Task uid ${task.uid} has an actual of ${length} worked days, `
          + 'ending before it starts',
          'NT-1',
        ),
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

  return verdictOf([...found, ...oneVisualRefusals(candidate.document)])
}

/** @purity pure */
function verdictOf(refusals: readonly ValidationRefusal[]): ImportVerdict {
  return refusals.length === 0 ? { ok: true } : { ok: false, refusals }
}

const ONE_VISUAL_PER_TASK = 'IV-23'

// see IV-23, NT-1
// WHY: the row is judged where table T-220 holds it, so the read refuses exactly what the invariant names.
/** @purity pure */
function oneVisualRefusals(document: Document): readonly ValidationRefusal[] {
  return scheduleViolations(document.schedule, document.documentSettings, [ONE_VISUAL_PER_TASK])
    .map((one) => refusal(one.row, one.at, one.what, 'NT-1'))
}
