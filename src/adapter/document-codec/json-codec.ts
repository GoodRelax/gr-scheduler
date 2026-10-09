// Converts between GRS JSON text and the document.
// @unit      UF-35   (docs/spec/05-07-design.md, table T-075)
// @component DocumentCodec, layer Adapter (table T-062)
// @purity    pure

import type { Document } from '../../entity/document-model/document/document'
import {
  SETTINGS_DEFAULTS,
  clampedSettings,
  type DocumentSettings,
} from '../../entity/document-model/document-settings/document-settings'
import {
  compareDays,
  dayOf,
  lastDayForLength,
  textOfDayEnd,
  textOfDayStart,
  textOfFinishSide,
  workingCalendarOf,
} from '../../entity/document-model/schedule/schedule'
import { recountedPercentComplete } from '../../use-case/edit-document/edit-document'
import {
  collectSchemaFaults,
  collectionNamesOfEntity,
  fault,
  isMissingKeyFault,
  isUnknownKeyFault,
  type JsonFault,
} from './grs-json-schema'
import { isObject, mspdiVersionOfCarried, withoutLeadingByteOrderMark } from './mspdi-codec'

export type { JsonFault } from './grs-json-schema'

export type JsonRefusalReason = 'RS-25' | 'RS-64'

export type FormatVersionReading = 'notCompared' | 'known' | 'newerThanKnown'

const SCHEMA_REFUSAL_REASON: JsonRefusalReason = 'RS-25'

const NEWER_SCHEMA_REFUSAL_REASON: JsonRefusalReason = 'RS-64'

const SETTINGS_GROUP = 'documentSettings'

const SCHEMA_ADDRESS_KEY = '$schema'

export type JsonDecoding =
  | {
      readonly ok: true
      readonly document: Document
      readonly clampedCount: number
      // see FR-012, RS-52
      readonly recountedCount: number
      readonly formatVersion: FormatVersionReading
      readonly unreadColumns: readonly string[]
    }
  | {
      readonly ok: false
      readonly reason: JsonRefusalReason
      readonly faults: readonly JsonFault[]
    }

/** @purity pure */
function unescapedSegment(segment: string): string {
  return segment.replace(/~1/g, '/').replace(/~0/g, '~')
}

/** @purity pure */
function segmentsOf(at: string): readonly string[] {
  return at.split('/').slice(1).map(unescapedSegment)
}

/** @purity pure */
function columnOf(at: string): string {
  return unescapedSegment(at.slice(at.lastIndexOf('/') + 1))
}

/** @purity pure */
function refusal(faults: readonly JsonFault[], reason: JsonRefusalReason = SCHEMA_REFUSAL_REASON): JsonDecoding {
  return { ok: false, reason, faults }
}

/** @purity pure */
function withoutKeyAt(value: unknown, segments: readonly string[]): unknown {
  const [head, ...rest] = segments
  if (head === undefined) return value
  if (Array.isArray(value)) {
    const index = Number(head)
    if (!Number.isInteger(index) || index < 0 || index >= value.length || rest.length === 0) return value
    return value.map((element, at) => (at === index ? withoutKeyAt(element, rest) : element))
  }
  if (!isObject(value) || !Object.hasOwn(value, head)) return value
  if (rest.length === 0) return Object.fromEntries(Object.entries(value).filter(([key]) => key !== head))
  return { ...value, [head]: withoutKeyAt(value[head], rest) }
}

/** @purity pure */
function settingDefaultOf(key: string): unknown {
  if (Object.hasOwn(SETTINGS_DEFAULTS, key)) return SETTINGS_DEFAULTS[key]
  const prefix = `${key}.`
  const members = Object.entries(SETTINGS_DEFAULTS).filter(([dotted]) => dotted.startsWith(prefix))
  if (members.length === 0) return undefined
  return Object.fromEntries(members.map(([dotted, value]) => [dotted.slice(prefix.length), value]))
}

/** @purity pure */
function withSettingsReplaced(parsed: unknown, defaultsByKey: ReadonlyMap<string, unknown>): unknown {
  if (defaultsByKey.size === 0 || !isObject(parsed)) return parsed
  const settings = parsed[SETTINGS_GROUP]
  if (!isObject(settings)) return parsed
  return { ...parsed, [SETTINGS_GROUP]: { ...settings, ...Object.fromEntries(defaultsByKey) } }
}

interface SettingsReading {
  readonly shaped: unknown
  readonly dropped: readonly string[]
  readonly defaulted: readonly string[]
  readonly rest: readonly JsonFault[]
}

// see OP-6, T-220
// WHY: a nested key has one default only, so any fault inside it sets the whole top key back;
// a missing top key is left for restoredSettings, which fills it on replace and not on merge.
/** @purity pure */
function readSettingsFaults(parsed: unknown, faults: readonly JsonFault[]): SettingsReading {
  const prefix = `/${SETTINGS_GROUP}/`
  const rest: JsonFault[] = []
  const dropped: string[] = []
  const defaults = new Map<string, unknown>()
  let shaped = parsed
  for (const one of faults) {
    if (!one.at.startsWith(prefix)) {
      rest.push(one)
      continue
    }
    const segments = segmentsOf(one.at)
    const key = segments[1] ?? ''
    if (isUnknownKeyFault(one)) {
      shaped = withoutKeyAt(shaped, segments)
      dropped.push(one.at)
      continue
    }
    if (segments.length === 2 && isMissingKeyFault(one)) continue
    const fallback = settingDefaultOf(key)
    if (fallback !== undefined) defaults.set(key, fallback)
  }
  return {
    shaped: withSettingsReplaced(shaped, defaults),
    dropped,
    defaulted: [...defaults.keys()],
    rest,
  }
}

interface SortedFaults {
  readonly refusing: readonly JsonFault[]
  readonly shaped: unknown
  readonly unreadColumns: readonly string[]
}

// see OP-6, FR-073
/** @purity pure */
function sortedFaults(parsed: unknown, faults: readonly JsonFault[], isNewer: boolean): SortedFaults {
  const settings = readSettingsFaults(parsed, faults)
  const unreadFaults = isNewer ? settings.rest.filter(isUnknownKeyFault) : []
  const shaped = unreadFaults.reduce((value, one) => withoutKeyAt(value, segmentsOf(one.at)), settings.shaped)
  const unreadColumns = isNewer
    ? [...new Set([
        ...settings.dropped.map(columnOf),
        ...settings.defaulted,
        ...unreadFaults.map((one) => columnOf(one.at)),
      ])]
    : []
  return { refusing: settings.rest.filter((one) => !unreadFaults.includes(one)), shaped, unreadColumns }
}

/** @purity pure */
function formatVersionReading(
  schemaVersion: string,
  greatestKnownSchemaVersion: string | undefined,
): FormatVersionReading {
  if (greatestKnownSchemaVersion === undefined) return 'notCompared'
  return schemaVersion > greatestKnownSchemaVersion ? 'newerThanKnown' : 'known'
}

// see FR-024
/** @purity pure */
function withOwnSchemaVersion(parsed: unknown, greatestKnownSchemaVersion: string | undefined): unknown {
  if (greatestKnownSchemaVersion === undefined || !isObject(parsed)) return parsed
  return { ...parsed, schemaVersion: greatestKnownSchemaVersion }
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

// see FR-073, GP-1
// WHY: GP-1's edit group is ungated, so any task group without it is open to anyone. The task group's tree
// state (AT-153) is never filled: an older document is not read over (JDG-601).
/** @purity pure */
function withTaskGroupColumnsOfAnOlderVersion(parsed: unknown): unknown {
  const schedule = isObject(parsed) ? parsed['schedule'] : undefined
  const taskGroups = isObject(schedule) ? schedule['taskGroups'] : undefined
  if (!isObject(parsed) || !isObject(schedule) || !Array.isArray(taskGroups)) return parsed
  const wants = (taskGroup: unknown): boolean => isObject(taskGroup) && !('editGroup' in taskGroup)
  if (!taskGroups.some(wants)) return parsed
  const shapedTaskGroups = taskGroups.map((taskGroup: unknown): unknown =>
    !isObject(taskGroup) || 'editGroup' in taskGroup ? taskGroup : { ...taskGroup, editGroup: null })
  return { ...parsed, schedule: { ...schedule, taskGroups: shapedTaskGroups } }
}

// see AT-145, AT-146, AT-147, AT-148, AT-149, AT-150, AT-151, AT-152
const ANNOTATION_LOOK_COLUMNS: readonly { readonly collection: string; readonly keys: readonly string[] }[] = [
  { collection: 'highlightBoxes', keys: ['strokeWidthPx', 'fillColor', 'fillTransparencyPercent'] },
  {
    collection: 'commentBoxes',
    keys: ['strokeColor', 'strokeWidthPx', 'fillColor', 'fillTransparencyPercent', 'textColor'],
  },
]

// see FR-019, CP-20
// WHY: not gated by schemaVersion and not told: null draws what a box drew before the columns existed, so no
// document of any version looks different and the reader has nothing to correct.
/** @purity pure */
function withAnnotationLookColumns(parsed: unknown): unknown {
  const schedule = isObject(parsed) ? parsed['schedule'] : undefined
  if (!isObject(parsed) || !isObject(schedule)) return parsed
  let changedSchedule = schedule
  for (const { collection, keys } of ANNOTATION_LOOK_COLUMNS) {
    const rows = schedule[collection]
    const lacks = (row: unknown): boolean => isObject(row) && keys.some((key) => !(key in row))
    if (!Array.isArray(rows) || !rows.some(lacks)) continue
    const filled = rows.map((row: unknown): unknown =>
      lacks(row) && isObject(row) ? { ...Object.fromEntries(keys.map((key) => [key, null])), ...row } : row)
    changedSchedule = { ...changedSchedule, [collection]: filled }
  }
  return changedSchedule === schedule ? parsed : { ...parsed, schedule: changedSchedule }
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
    const lastDay = lastDayForLength(within, start, length)
    return { ...task, stop: textOfFinishSide(lastDay, document.schedule.project) }
  })
  return { ...document, schedule: { ...document.schedule, tasks } }
}

// see DR-4, S-540
/** @purity pure */
function withOwnAddress(parsed: unknown): unknown {
  if (!isObject(parsed) || !Object.hasOwn(parsed, SCHEMA_ADDRESS_KEY)) return parsed
  return { ...parsed, [SCHEMA_ADDRESS_KEY]: NOT_STORED_SCHEMA_ADDRESS['S-540'] }
}

/** @purity pure */
function documentWithoutAddress(shaped: unknown): Document {
  return withoutKeyAt(shaped, [SCHEMA_ADDRESS_KEY]) as unknown as Document
}

// see FR-023, FR-073, OP-7, FR-012
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

  const declaredValue = isObject(parsed) ? parsed['schemaVersion'] : undefined
  const declared = typeof declaredValue === 'string' ? declaredValue : ''
  const formatVersion = formatVersionReading(declared, greatestKnownSchemaVersion)

  const older = withStopInPlaceOfActualDuration(withSourceFormatOfAnOlderDocument(withAnnotationLookColumns(
    withTaskGroupColumnsOfAnOlderVersion(withOwnSchemaVersion(withOwnAddress(parsed), greatestKnownSchemaVersion)),
  )))
  const faults: JsonFault[] = olderLengthFaults(older.lengthByTaskIndex)
  collectSchemaFaults(older.shaped, faults)
  const isNewer = formatVersion === 'newerThanKnown'
  const refusedWith = isNewer ? NEWER_SCHEMA_REFUSAL_REASON : SCHEMA_REFUSAL_REASON
  const { refusing, shaped, unreadColumns } = sortedFaults(older.shaped, faults, isNewer)
  if (refusing.length > 0) return refusal(refusing, refusedWith)

  let read: Document
  try {
    // TRAP: a reader before OP-6 may find documentSettings keys missing despite this cast.
    read = withStopsFromOlderLengths(documentWithoutAddress(shaped), older.lengthByTaskIndex)
  } catch (why) {
    return refusal([
      fault('/schedule/tasks', `an actual length could not be placed as a day: ${
        why instanceof Error ? why.message : String(why)}`),
    ], refusedWith)
  }

  return settledReading(read, formatVersion, unreadColumns)
}

// see OP-6, S-518, S-519
// WHY: restoredSettings fills a missing key only at the replace (OP-6), so a missing end reads null here.
/** @purity pure */
function spanTextOf(settings: DocumentSettings, key: 'fitSpanStart' | 'fitSpanFinish'): string | null {
  const read = settings as unknown as Readonly<Record<string, unknown>>
  const value = read[key]
  return typeof value === 'string' ? value : null
}

// see FX-1, S-518, S-519, S-532
// WHY: a read never refuses a presentation value (T-220 preamble): one dated end is copied, a reversed
// finish is pulled to the start, a fix over no span reads unfixed; none counts toward RS-51.
/** @purity pure */
function pairedFitSpan(settings: DocumentSettings): DocumentSettings {
  const start = dayOf(spanTextOf(settings, 'fitSpanStart'))
  const finish = dayOf(spanTextOf(settings, 'fitSpanFinish'))
  const startDay = start ?? finish
  const finishDay = finish ?? start
  if (startDay === null || finishDay === null) {
    return settings.fitSpanFixed === true ? { ...settings, fitSpanFixed: false } : settings
  }
  if (start !== null && finish !== null && compareDays(finish, start) >= 0) return settings
  const pulled = compareDays(finishDay, startDay) < 0 ? startDay : finishDay
  return {
    ...settings,
    fitSpanStart: start === null ? textOfDayStart(startDay) : settings.fitSpanStart,
    fitSpanFinish: pulled === finish ? settings.fitSpanFinish : textOfDayEnd(pulled),
  }
}

// see FR-012, OP-6, RS-51, RS-52
/** @purity pure */
function settledReading(
  read: Document,
  formatVersion: FormatVersionReading,
  unreadColumns: readonly string[],
): JsonDecoding {
  const recount = recountedPercentComplete(read.schedule)
  const recounted = recount.schedule === read.schedule ? read : { ...read, schedule: recount.schedule }
  const recountedCount = recount.movedTaskUids.length

  const paired = pairedFitSpan(recounted.documentSettings)
  const clamp = clampedSettings(paired)
  if (clamp.clamped.length === 0) {
    const settled = paired === recounted.documentSettings ? recounted : { ...recounted, documentSettings: paired }
    return { ok: true, document: settled, clampedCount: 0, recountedCount, formatVersion, unreadColumns }
  }
  // WHY: taskGroupGap clamps stay silent (CR-384, JDG-113) -- clamp.settings still zeroes
  // it, but it is left out of the count RS-51 tells.
  const toldClamped = clamp.clamped.filter((one) => one.key !== 'taskGroupGap')
  return {
    ok: true,
    document: { ...recounted, documentSettings: clamp.settings },
    clampedCount: toldClamped.length,
    recountedCount,
    formatVersion,
    unreadColumns,
  }
}

// see FR-024, DR-4, S-540
/** @purity pure */
export function jsonFromDocument(document: Document): string {
  const addressed = Object.fromEntries([
    [SCHEMA_ADDRESS_KEY, NOT_STORED_SCHEMA_ADDRESS['S-540']],
    ...Object.entries(document).filter(([key]) => key !== SCHEMA_ADDRESS_KEY),
  ])
  return JSON.stringify(addressed, null, 1) + '\n'
}

// <generated -- do not edit by hand>
// Single source of truth:
//   docs/spec/_source/settings.json (table T-206)
// Rebuild: npm run gen   ||   npm run gen:check fails on drift.
// see T-206
const NOT_STORED_SCHEMA_ADDRESS: {
  readonly 'S-540': string
} = {
  'S-540': 'https://goodrelax.github.io/gr-scheduler/spec/_source/grs-document.schema.json',
}
// </generated>
