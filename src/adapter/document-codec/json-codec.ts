// DocumentCodec -- the GRS JSON half.
//
// @unit      UF-35   (docs/spec/05-07-design.md, table T-075)
// @component DocumentCodec, layer Adapter (table T-062)
// @purity    pure
//
// Converts between `GRS JSON` and the document (FR-024). Table T-063 UT-5
// splits the three formats apart because each answers to a different authority:
// this one to FR-024, MSPDI to the exchange partner's schema, and the single
// .html to FR-067.
//
// ⛔ What this file does NOT do: judge the content. FR-023 puts the rules --
// the ceilings, the dates, the counts -- in ValidateImportedDocument (CP-13),
// which the three intake paths share so that one of them cannot be laxer than
// another. This file answers one narrower question: is the text a GRS JSON
// document at all. A caller runs both, in that order, because the validator
// takes a `Document` and cannot be handed a shape that is not one.

import type { Document } from '../../entity/document-model/document/document'

/** Why a text could not be read as a document. */
export interface JsonFault {
  /**
   * Where, as a JSON pointer. `''` is the text as a whole -- NT-1 of table
   * T-037 requires a notice to say WHICH item is wrong, so a fault that cannot
   * name one says so by naming the whole.
   */
  readonly at: string
  readonly what: string
}

export type JsonDecoding =
  | { readonly ok: true; readonly document: Document }
  | { readonly ok: false; readonly faults: readonly JsonFault[] }

/**
 * The five keys table T-052 puts at the root, and nothing else. DR-1 forbids a
 * value of either group being placed directly beside them (MUST NOT), so a
 * root that carries a sixth key is not a document this build wrote.
 */
const ROOT_KEYS = [
  'schemaVersion',
  'schedule',
  'documentSettings',
  'revisionStamp',
  'changeLog',
] as const

/** The twelve arrays DR-2 puts in the schedule-data group. */
const SCHEDULE_ARRAYS = [
  'calendars',
  'tasks',
  'resources',
  'assignments',
  'taskGroups',
  'taskGroupMembers',
  'taskVisuals',
  'commentBoxes',
  'highlightBoxes',
  'taskOrigins',
  'baselineTasks',
] as const

/** @purity pure */
function fault(at: string, what: string): JsonFault {
  return { at, what }
}

/** @purity pure */
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Reads one `GRS JSON` text.
 *
 * ⭐ Pure, and it takes the TEXT rather than a parsed value: parsing is where a
 * malformed input announces itself, and a caller that had already parsed would
 * have swallowed that. FR-023 calls every intake untrusted.
 *
 * ⚠️ The shape is checked, not the content. See the block at the top.
 *
 * @purity pure
 */
export function documentFromJson(text: string): JsonDecoding {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch (why) {
    return {
      ok: false,
      faults: [fault('', `not JSON: ${why instanceof Error ? why.message : String(why)}`)],
    }
  }
  if (!isObject(parsed)) {
    return { ok: false, faults: [fault('', 'the root is not an object (table T-052 DR-1)')] }
  }

  const faults: JsonFault[] = []
  for (const key of ROOT_KEYS) {
    if (!(key in parsed)) faults.push(fault(`/${key}`, 'missing from the root (DR-1 / DR-4)'))
  }
  for (const key of Object.keys(parsed)) {
    if (!(ROOT_KEYS as readonly string[]).includes(key)) {
      // DR-1: only the three groups and the stamp live at the root.
      faults.push(fault(`/${key}`, 'is not one of the five keys table T-052 puts at the root'))
    }
  }
  if (typeof parsed['schemaVersion'] !== 'string') {
    // DR-4 says a string, and FR-073 compares it. A number would compare wrong
    // rather than fail, which is the kind of thing that is found much later.
    faults.push(fault('/schemaVersion', 'is not a string (table T-052 DR-4)'))
  }
  if (!isObject(parsed['schedule'])) {
    faults.push(fault('/schedule', 'is not an object (DR-2)'))
  } else {
    const schedule = parsed['schedule']
    if (!isObject(schedule['project'])) faults.push(fault('/schedule/project', 'is not an object'))
    for (const key of SCHEDULE_ARRAYS) {
      if (!Array.isArray(schedule[key])) {
        faults.push(fault(`/schedule/${key}`, 'is not an array (DR-2)'))
      }
    }
  }
  if (!isObject(parsed['documentSettings'])) {
    faults.push(fault('/documentSettings', 'is not an object (DR-3)'))
  }
  if (!isObject(parsed['revisionStamp'])) {
    faults.push(fault('/revisionStamp', 'is not an object (DR-4)'))
  }
  if (!Array.isArray(parsed['changeLog'])) {
    faults.push(fault('/changeLog', 'is not an array (DR-4)'))
  }

  if (faults.length > 0) return { ok: false, faults }
  return { ok: true, document: parsed as unknown as Document }
}

/**
 * Writes one `GRS JSON` text.
 *
 * ⛔ Writes every key of the presentation group even when it equals the
 * default, and every `null` column of the schedule-data group with its key
 * still there -- FR-024 states both as MUST. ⭐ Which is what `JSON.stringify`
 * of the document already does: the document type has no optional key, so
 * there is nothing here to leave out. ⚠️ Do not "tidy" this by dropping
 * defaults; the requirement's reason is that changing a default later must not
 * move the picture of a document written today.
 *
 * @purity pure
 */
export function jsonFromDocument(document: Document): string {
  return JSON.stringify(document, null, 1) + '\n'
}
