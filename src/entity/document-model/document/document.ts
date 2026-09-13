// Document -- public entry of this folder.
//
// @unit      UF-57   (docs/spec/05-07-design.md, table T-075)
// @component Document, layer documentModel (table T-062)
// @purity    pure
// @publishes table T-064 row PI-34
//
// The document root: DR-1 of table T-052 binds all three groups at once, and no
// single group can see the others, so none of them could own it.

import type { DocumentSettings } from '../document-settings/document-settings'
import type { ChangeLogEntry, DocumentStamp } from '../document-stamp/document-stamp'
import type { Schedule } from '../schedule/schedule'

/** The five root keys, DR-1 to DR-4 of table T-052. */
export interface Document {
  /** DR-4, FR-024 */
  readonly schemaVersion: string
  /** DR-2 */
  readonly schedule: Schedule
  /** DR-3 */
  readonly documentSettings: DocumentSettings
  /** DR-4 */
  readonly documentStamp: DocumentStamp
  /** DR-4 */
  readonly changeLog: readonly ChangeLogEntry[]
}

/** The five, in the order table T-052 lists them. */
export const ROOT_KEYS = [
  'schemaVersion',
  'schedule',
  'documentSettings',
  'documentStamp',
  'changeLog',
] as const

export interface DocumentViolation {
  /** The row of table T-052 that is broken, e.g. DR-1. */
  readonly row: string
  /** Where it is broken, as a JSON pointer. */
  readonly at: string
  readonly what: string
}

/**
 * Where a value breaks the rules table T-052 puts on the root.
 *
 * Only rules on the root as a whole: a group's contents are that group's to
 * check, and the shape is the schema's.
 *
 * @purity pure
 */
export function documentViolations(value: unknown): readonly DocumentViolation[] {
  const found: DocumentViolation[] = []

  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return [{ row: 'DR-1', at: '/', what: 'the root is not an object' }]
  }
  const root = value as Record<string, unknown>

  // DR-1
  for (const key of Object.keys(root)) {
    if (!(ROOT_KEYS as readonly string[]).includes(key)) {
      found.push({
        row: 'DR-1',
        at: `/${key}`,
        what: 'sits on the root without belonging to one of the three groups',
      })
    }
  }
  for (const key of ROOT_KEYS) {
    if (!(key in root)) {
      found.push({ row: 'DR-4', at: `/${key}`, what: 'is missing from the root' })
    }
  }

  // DR-5
  const settings = root['documentSettings']
  if (settings !== null && typeof settings === 'object' && 'themeHue' in settings) {
    found.push({
      row: 'DR-5',
      at: '/documentSettings/themeHue',
      what: 'belongs to the project, not to the presentation group',
    })
  }

  return found
}
