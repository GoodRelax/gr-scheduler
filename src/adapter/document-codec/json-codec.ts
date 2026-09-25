// Converts between GRS JSON text and the document.
// @unit      UF-35   (docs/spec/05-07-design.md, table T-075)
// @component DocumentCodec, layer Adapter (table T-062)
// @purity    pure

import type { Document } from '../../entity/document-model/document/document'
import { clampedSettings } from '../../entity/document-model/document-settings/document-settings'
import {
  dayOf,
  lastDayForLength,
  textOfDay,
  workingCalendarOf,
} from '../../entity/document-model/schedule/schedule'
import {
  collectSchemaFaults,
  collectionNamesOfEntity,
  fault,
  isUnknownKeyFault,
  type JsonFault,
} from './grs-json-schema'
import { isObject, mspdiVersionOfCarried, withoutLeadingByteOrderMark } from './mspdi-codec'

export type { JsonFault } from './grs-json-schema'

export type JsonRefusalReason = 'RS-25'

export type FormatVersionReading = 'notCompared' | 'known' | 'newerThanKnown'

export type JsonDecoding =
  | {
      readonly ok: true
      readonly document: Document
      readonly clampedCount: number
      readonly formatVersion: FormatVersionReading
      readonly unreadColumns: readonly string[]
    }
  | {
      readonly ok: false
      readonly reason: JsonRefusalReason
      readonly faults: readonly JsonFault[]
    }

/** @purity pure */
function columnOf(at: string): string {
  const last = at.slice(at.lastIndexOf('/') + 1)
  return last.replace(/~1/g, '/').replace(/~0/g, '~')
}

/** @purity pure */
function refusal(faults: readonly JsonFault[]): JsonDecoding {
  return { ok: false, reason: 'RS-25', faults }
}

/** @purity pure */
function formatVersionReading(
  schemaVersion: string,
  greatestKnownSchemaVersion: string | undefined,
): FormatVersionReading {
  if (greatestKnownSchemaVersion === undefined) return 'notCompared'
  return schemaVersion > greatestKnownSchemaVersion ? 'newerThanKnown' : 'known'
}

interface OlderActualShape {
  readonly shaped: unknown
  readonly lengthByTaskIndex: ReadonlyMap<number, unknown>
}

// see FR-011, FR-073
/** @purity pure */
function withStopInPlaceOfActualDuration(parsed: unknown): OlderActualShape {
  const lengthByTaskIndex = new Map<number, unknown>()
  const schedule = isObject(parsed) ? parsed['schedule'] : undefined
  const tasks = isObject(schedule) ? schedule['tasks'] : undefined
  if (!isObject(parsed) || !isObject(schedule) || !Array.isArray(tasks)) {
    return { shaped: parsed, lengthByTaskIndex }
  }
  const shapedTasks = tasks.map((task: unknown, index: number): unknown => {
    if (!isObject(task) || !('actualDuration' in task) || 'stop' in task) return task
    lengthByTaskIndex.set(index, task['actualDuration'])
    return Object.fromEntries(Object.entries(task).map(([key, value]): [string, unknown] =>
      key === 'actualDuration' ? ['stop', null] : [key, value]))
  })
  if (lengthByTaskIndex.size === 0) return { shaped: parsed, lengthByTaskIndex }
  return { shaped: { ...parsed, schedule: { ...schedule, tasks: shapedTasks } }, lengthByTaskIndex }
}

const FIRST_SCHEMA_VERSION_WITH_KEPT_OPEN_MARK = '2026-09-17'

// see FR-018, FR-073, AT-142, GP-1
// WHY: only a version older than AT-142 has its kept-open mark filled; a current one without the key
// stays refused by the schema. GP-1's edit group is ungated, so any row without it is open to anyone.
/** @purity pure */
function withTaskGroupColumnsOfAnOlderVersion(parsed: unknown, declared: string): unknown {
  const fillsKeptOpenMark = declared < FIRST_SCHEMA_VERSION_WITH_KEPT_OPEN_MARK
  const schedule = isObject(parsed) ? parsed['schedule'] : undefined
  const rows = isObject(schedule) ? schedule['taskGroups'] : undefined
  if (!isObject(parsed) || !isObject(schedule) || !Array.isArray(rows)) return parsed
  const wants = (row: unknown): boolean =>
    isObject(row) && ((fillsKeptOpenMark && !('isKeptOpen' in row)) || !('editGroup' in row))
  if (!rows.some(wants)) return parsed
  const shapedRows = rows.map((row: unknown): unknown => {
    if (!isObject(row)) return row
    const withMark = fillsKeptOpenMark && !('isKeptOpen' in row) ? { ...row, isKeptOpen: false } : row
    return 'editGroup' in withMark ? withMark : { ...withMark, editGroup: null }
  })
  return { ...parsed, schedule: { ...schedule, taskGroups: shapedRows } }
}

// see AT-143
// WHY: not gated by schemaVersion (AT-143 reads any document without the column), and not in the
// generated schema, which can state a default but not one read from the document's own carry.
/** @purity pure */
function withSourceFormatOfAnOlderDocument(parsed: unknown): unknown {
  const schedule = isObject(parsed) ? parsed['schedule'] : undefined
  const project = isObject(schedule) ? schedule['project'] : undefined
  if (!isObject(parsed) || !isObject(schedule) || !isObject(project) || Object.hasOwn(project, 'sourceFormat')) {
    return parsed
  }
  const carry = project['carry']
  const sourceFormat = isObject(carry) && Object.hasOwn(carry, 'SaveVersion') ? mspdiVersionOfCarried(schedule) : 'grs'
  return { ...parsed, schedule: { ...schedule, project: { ...project, sourceFormat } } }
}

// see S-9, T-297
const RETIRED_COLUMNS: readonly { readonly entity: string; readonly key: string }[] = [
  { entity: 'TaskVisual', key: 'nameAnchor' },
  { entity: 'TaskVisual', key: 'nameAlign' },
]

// see S-9, T-297
// WHY: an older document still carries these keys, often null; the schema no longer lists them,
// so validating without this step would refuse every such document.
/** @purity pure */
function withoutRetiredColumns(parsed: unknown): unknown {
  const schedule = isObject(parsed) ? parsed['schedule'] : undefined
  if (!isObject(parsed) || !isObject(schedule)) return parsed
  const keysByCollection = new Map<string, Set<string>>()
  for (const { entity, key } of RETIRED_COLUMNS) {
    for (const collection of collectionNamesOfEntity(entity)) {
      const keys = keysByCollection.get(collection) ?? new Set<string>()
      keys.add(key)
      keysByCollection.set(collection, keys)
    }
  }
  let changedSchedule = schedule
  for (const [collection, keys] of keysByCollection) {
    const rows = schedule[collection]
    if (!Array.isArray(rows)) continue
    if (!rows.some((row) => isObject(row) && [...keys].some((key) => key in row))) continue
    const stripped = rows.map((row: unknown): unknown => {
      if (!isObject(row)) return row
      return Object.fromEntries(Object.entries(row).filter(([key]) => !keys.has(key)))
    })
    changedSchedule = { ...changedSchedule, [collection]: stripped }
  }
  return changedSchedule === schedule ? parsed : { ...parsed, schedule: changedSchedule }
}

/** @purity pure */
function olderLengthFaults(lengthByTaskIndex: ReadonlyMap<number, unknown>): JsonFault[] {
  const out: JsonFault[] = []
  for (const [index, length] of lengthByTaskIndex) {
    if (length === null || (typeof length === 'number' && Number.isInteger(length))) continue
    out.push(fault(`/schedule/tasks/${index}/actualDuration`, 'is not a whole number of working days'))
  }
  return out
}

// see FR-011, AT-141
/** @purity pure */
function withStopsFromOlderLengths(
  document: Document,
  lengthByTaskIndex: ReadonlyMap<number, unknown>,
): Document {
  if (lengthByTaskIndex.size === 0) return document
  const within = workingCalendarOf(document.schedule)
  const tasks = document.schedule.tasks.map((task, index) => {
    if (!lengthByTaskIndex.has(index)) return task
    // WHY: an older document carried the file's own Stop; it is the day the partner wrote, so it wins over the length.
    const carriedStop = task.carry['Stop']
    if (carriedStop !== undefined) {
      const carry = Object.fromEntries(Object.entries(task.carry).filter(([name]) => name !== 'Stop'))
      return { ...task, stop: carriedStop, carry }
    }
    const start = dayOf(task.actualStart)
    const length = lengthByTaskIndex.get(index)
    if (task.actualFinish !== null || start === null || typeof length !== 'number') return task
    return { ...task, stop: textOfDay(lastDayForLength(within, start, length)) }
  })
  return { ...document, schedule: { ...document.schedule, tasks } }
}

// see FR-023, FR-073, OP-7
/** @purity pure */
export function documentFromJson(
  text: string,
  greatestKnownSchemaVersion?: string,
): JsonDecoding {
  let parsed: unknown
  try {
    parsed = withoutRetiredColumns(JSON.parse(withoutLeadingByteOrderMark(text)))
  } catch (why) {
    return refusal([
      fault('', `not JSON: ${why instanceof Error ? why.message : String(why)}`),
    ])
  }

  const declared = isObject(parsed) ? parsed['schemaVersion'] : undefined
  const formatVersion = formatVersionReading(
    typeof declared === 'string' ? declared : '',
    greatestKnownSchemaVersion,
  )

  const older = withStopInPlaceOfActualDuration(withSourceFormatOfAnOlderDocument(
    withTaskGroupColumnsOfAnOlderVersion(parsed, typeof declared === 'string' ? declared : ''),
  ))
  const faults: JsonFault[] = olderLengthFaults(older.lengthByTaskIndex)
  collectSchemaFaults(older.shaped, faults)
  const isNewer = formatVersion === 'newerThanKnown'
  const refusing = isNewer ? faults.filter((one) => !isUnknownKeyFault(one)) : faults
  if (refusing.length > 0) return refusal(refusing)
  const unreadColumns = isNewer
    ? [...new Set(faults.filter(isUnknownKeyFault).map((one) => columnOf(one.at)))]
    : []

  let read: Document
  try {
    // TRAP: a reader before OP-6 may find documentSettings keys missing despite this cast.
    read = withStopsFromOlderLengths(older.shaped as unknown as Document, older.lengthByTaskIndex)
  } catch (why) {
    return refusal([
      fault('/schedule/tasks', `an actual length could not be placed as a day: ${
        why instanceof Error ? why.message : String(why)}`),
    ])
  }

  const clamp = clampedSettings(read.documentSettings)
  if (clamp.clamped.length === 0) {
    return { ok: true, document: read, clampedCount: 0, formatVersion, unreadColumns }
  }
  // WHY: rowGap clamps stay silent (CR-384, JDG-113) -- clamp.settings still zeroes
  // it, but it is left out of the count RS-51 tells.
  const toldClamped = clamp.clamped.filter((one) => one.key !== 'rowGap')
  return {
    ok: true,
    document: { ...read, documentSettings: clamp.settings },
    clampedCount: toldClamped.length,
    formatVersion,
    unreadColumns,
  }
}

// see FR-024
/** @purity pure */
export function jsonFromDocument(document: Document): string {
  return JSON.stringify(document, null, 1) + '\n'
}
