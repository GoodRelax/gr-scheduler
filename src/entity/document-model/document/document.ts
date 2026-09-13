// Document: the document root binding the three groups.
// @unit      UF-57   (docs/spec/05-07-design.md, table T-075)
// @component Document, layer documentModel (table T-062)
// @purity    pure
// @publishes table T-064 row PI-34

import type { DocumentSettings } from '../document-settings/document-settings'
import type { ChangeLogEntry, DocumentStamp } from '../document-stamp/document-stamp'
import type { Schedule } from '../schedule/schedule'

export interface Document {
  readonly schemaVersion: string
  readonly schedule: Schedule
  readonly documentSettings: DocumentSettings
  readonly documentStamp: DocumentStamp
  readonly changeLog: readonly ChangeLogEntry[]
}

export const ROOT_KEYS = [
  'schemaVersion',
  'schedule',
  'documentSettings',
  'documentStamp',
  'changeLog',
] as const

export interface DocumentViolation {
  readonly row: string
  readonly at: string
  readonly what: string
}

// see DR-1, DR-4, DR-5
/** @purity pure */
export function documentViolations(value: unknown): readonly DocumentViolation[] {
  const found: DocumentViolation[] = []

  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return [{ row: 'DR-1', at: '/', what: 'the root is not an object' }]
  }
  const root = value as Record<string, unknown>

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
