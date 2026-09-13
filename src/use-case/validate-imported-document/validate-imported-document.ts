// Judges whether an untrusted document may replace the current one, all or nothing.
// @unit      UF-22   (docs/spec/05-07-design.md, table T-075)
// @component ValidateImportedDocument, layer UseCase (table T-062)
// @purity    pure
// @publishes table T-064 row PI-13

import type { Document } from '../../entity/document-model/document/document'
import type { DocumentSettings } from '../../entity/document-model/document-settings/document-settings'
import {
  DATE_COLUMNS,
  compareDays,
  dayOf,
  type CalendarDay,
  type Task,
} from '../../entity/document-model/schedule/schedule'

export type ImportBounds = Pick<
  DocumentSettings,
  'importMaxBytes' | 'importMaxItems' | 'importMaxDepth' | 'importMinDate' | 'importMaxDate'
>

export interface ImportCandidate {
  readonly document: Document
  // TRAP: bytes; a length in megabytes (S-113's unit) would let any file through.
  readonly byteLength: number
  readonly emptyRowTaskUids: readonly number[]
}

export interface ImportRefusal {
  readonly rule: string
  readonly at: string
  readonly what: string
  readonly notice: 'NT-1' | 'NT-6'
}

export type ImportVerdict =
  | { readonly ok: true }
  | { readonly ok: false; readonly refusals: readonly ImportRefusal[] }

const BYTES_PER_MEGABYTE = 1024 * 1024

/** @purity pure */
function refusal(rule: string, at: string, what: string, notice: 'NT-1' | 'NT-6'): ImportRefusal {
  return { rule, at, what, notice }
}

interface AcceptedDays {
  readonly min: CalendarDay
  readonly max: CalendarDay
}

const NO_REFUSALS: readonly ImportRefusal[] = []

/** @purity pure */
function sweepDateColumns<TRow extends object>(
  row: TRow,
  columns: readonly (keyof TRow & string)[],
  at: string,
  accepted: AcceptedDays,
): readonly ImportRefusal[] {
  let found: ImportRefusal[] | null = null
  for (const column of columns) {
    const value: unknown = row[column]
    if (typeof value !== 'string') continue
    const day = dayOf(value)
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
      const parentUid: number | null = at.wbsParentUid
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
  bounds: ImportBounds,
): ImportVerdict {
  // TRAP: keep these two returns ahead of every walk below, which relies on the count being bounded.
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

  const found: ImportRefusal[] = []

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

  const min = dayOf(bounds.importMinDate)
  const max = dayOf(bounds.importMaxDate)
  if (min === null) {
    // WHY: refused rather than skipped: a range that cannot be read proves nothing about the input.
    found.push(refusal('S-119', '', `importMinDate names no day: ${bounds.importMinDate}`, 'NT-1'))
  }
  if (max === null) {
    found.push(refusal('S-120', '', `importMaxDate names no day: ${bounds.importMaxDate}`, 'NT-1'))
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
        refusal('FR-012', foundAt, `Task uid ${task.uid} has no start or no finish`, 'NT-1'),
      )
    }

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
