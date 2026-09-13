// EditDocument -- the Project aggregate.
//
// @unit      UF-17  (docs/spec/05-07-design.md, table T-075)
// @component EditDocument, layer UseCase (table T-062)
// @purity    pure
//
// Validates and returns a new Document; settling it is not this file's (CP-9,
// WS-6 of table T-067).
//
// A command that writes the value already held returns the same Document:
// `document-change-plan.ts` reads FR-020's re-stamp and FR-063's schedule
// instant off the reference, so a rebuilt no-op would move both.
// Compared by value, one field at a time, never by walking the document: a deep
// comparison would undo the reference test NFR-013's every-frame road relies on.
//
// Not the component's public entry; `edit-document.ts` re-exports what leaves.

import { dayOf } from '../../entity/document-model/schedule/schedule'
import type { Document } from '../../entity/document-model/document/document'
import type { EditResult, Refusal } from './edit-document'
import { refused, edited } from './edit-document'

/**
 * The columns table T-224 marks editable, and no others: `created` and
 * `lastSaved` carry the exchange partner's value back (PF-9 / PF-10, FR-021),
 * and `title` has CM-1 as its one entry (FR-074).
 */
export interface ProjectProfileFields {
  readonly name?: string | null
  readonly subject?: string | null
  readonly category?: string | null
  readonly company?: string | null
  readonly manager?: string | null
  readonly author?: string | null
  readonly revision?: number | null
  readonly startDate?: string | null
}

/** CM-1 to CM-5 of table T-108. */
export type ProjectCommand =
  | { readonly kind: 'setProjectTitle'; readonly title: string | null }
  | { readonly kind: 'setProjectProfile'; readonly fields: ProjectProfileFields }
  | { readonly kind: 'setStatusDate'; readonly date: string }
  | { readonly kind: 'clearStatusDate' }
  | { readonly kind: 'setThemeHue'; readonly hue: number }

/** The keys table T-224 admits, in its own order, so the sweep is the table. */
const PROFILE_KEYS = [
  'name',
  'subject',
  'category',
  'company',
  'manager',
  'author',
  'revision',
  'startDate',
] as const

/** @purity pure */
function withProject(document: Document, project: Document['schedule']['project']): Document {
  return { ...document, schedule: { ...document.schedule, project } }
}

/** @purity pure */
export function editProject(document: Document, command: ProjectCommand): EditResult {
  const project = document.schedule.project

  switch (command.kind) {
    case 'setProjectTitle': {
      // FR-035 (MUST NOT)
      if (command.title === '') {
        return refused([reject('CM-1', 'FR-035', 'the document name may not be an empty string')])
      }
      // After the refusal, never before: a refused write and a no-op are
      // different answers, and FR-028 has the caller told which it got.
      if (project.title === command.title) return edited(document)
      return edited(withProject(document, { ...project, title: command.title }))
    }

    case 'setProjectProfile': {
      const refusals: Refusal[] = []
      const { startDate } = command.fields
      if (startDate !== undefined && startDate !== null && dayOf(startDate) === null) {
        refusals.push(reject('CM-2', 'PF-8', `startDate is not a date: ${startDate}`))
      }
      if (refusals.length > 0) return refused(refusals)
      // A column is spread only where it moves, so a bundle that changes
      // nothing leaves `held` the same object: the sweep is the per-field test.
      let held = project
      for (const key of PROFILE_KEYS) {
        const value = command.fields[key]
        if (value !== undefined && value !== held[key]) held = { ...held, [key]: value }
      }
      if (held === project) return edited(document)
      return edited(withProject(document, held))
    }

    case 'setStatusDate': {
      // FR-046's "today" arrives as a value: LY-5 leaves the outside to the
      // Framework.
      if (dayOf(command.date) === null) {
        return refused([reject('CM-3', 'FR-046', `not a date: ${command.date}`)])
      }
      if (project.statusDate === command.date) return edited(document)
      return edited(withProject(document, { ...project, statusDate: command.date }))
    }

    case 'clearStatusDate':
      // FR-046. Erasing a line that is not there is not refused: the document
      // already stands as asked, the answer CM-37 gives for the same shape.
      if (project.statusDate === null) return edited(document)
      return edited(withProject(document, { ...project, statusDate: null }))

    case 'setThemeHue': {
      // S-73 of table T-216
      if (!Number.isInteger(command.hue) || command.hue < 0 || command.hue > 359) {
        return refused([reject('CM-5', 'S-73', `hue outside 0..359: ${command.hue}`)])
      }
      if (project.themeHue === command.hue) return edited(document)
      return edited(withProject(document, { ...project, themeHue: command.hue }))
    }
  }
}

/** @purity pure */
function reject(command: string, rule: string, what: string): Refusal {
  return { command, rule, what }
}
