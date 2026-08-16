// Document -- public entry of this folder.
//
// @unit      UF-57   (docs/spec/05-07-design.md, table T-075)
// @component Document, layer documentModel (table T-062)
// @purity    pure
// @publishes table T-064 row PI-34
//
// The root of the document, and the only place from which the whole of it can
// be seen. CR-127 stood this component up for one reason: DR-1 of table T-052
// binds all three groups at once, and no single group can see the others, so
// no group could own it.
//
// It reaches the three groups through their public entries, which is the only
// route Chapter 5.3 leaves open, and it holds no rule any one group already
// holds -- what belongs to each group is FR-063's and DR-2's business, not
// this file's.

import type { DocumentSettings } from '../document-settings/document-settings'
import type { ChangeLogEntry, DocumentStamp } from '../document-stamp/document-stamp'
import type { Schedule } from '../schedule/schedule'

/** The five root keys, DR-1 to DR-4 of table T-052. */
export interface Document {
  /** DR-4: the version of the document format. A string (FR-024). */
  readonly schemaVersion: string
  /** DR-2 */
  readonly schedule: Schedule
  /** DR-3 */
  readonly documentSettings: DocumentSettings
  /** DR-4 */
  readonly revisionStamp: DocumentStamp
  /** DR-4 */
  readonly changeLog: readonly ChangeLogEntry[]
}

/** The five, in the order table T-052 lists them. */
export const ROOT_KEYS = [
  'schemaVersion',
  'schedule',
  'documentSettings',
  'revisionStamp',
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
 * Only the rules that bind the root AS A WHOLE are checked here -- that is what
 * this component exists for. Whether one group's contents are sound is that
 * group's own business, and whether the shape is valid at all is the schema's.
 *
 * @purity pure
 */
export function documentViolations(value: unknown): readonly DocumentViolation[] {
  const found: DocumentViolation[] = []

  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return [{ row: 'DR-1', at: '/', what: 'the root is not an object' }]
  }
  const root = value as Record<string, unknown>

  // DR-1: the root holds the three groups and nothing else. A value put
  // straight onto the root loses the one clue that says which group's rules it
  // follows, which is the reason the row gives.
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

  // DR-5: the theme hue is the project's, never the presentation group's. The
  // row's reason is that everything which follows it is schedule data, so a
  // split across the two groups would let a change that does not raise the
  // revision alter how one that does is seen.
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
