// EditDocument -- the Project aggregate.
//
// @unit      UF-17  (docs/spec/05-07-design.md, table T-075)
// @component EditDocument, layer UseCase (table T-062)
// @purity    pure
//
// The five commands table T-108 puts in the `Project` group: CM-1 to CM-5.
//
// ⚠️ This file VALIDATES and returns a new Document. It does not settle
// anything: CP-9 says the aggregates "検証して新しい文書を返すだけで、確定させ
// ない", and WS-6 of table T-067 makes replacing the current value the sole
// business of ApplyDocumentChange.
//
// ⚠️ It is not the public entry of its component. Nothing outside
// `edit-document/` may import it (Chapter 5.3, MUST NOT) -- `edit-document.ts`
// re-exports what leaves.

import { dayOf } from '../../entity/document-model/schedule/schedule'
import type { Document } from '../../entity/document-model/document/document'
import type { EditResult, Refusal } from './edit-document'
import { refused, edited } from './edit-document'

/**
 * The eight columns table T-224 marks editable, and no others.
 *
 * ⛔ `created` and `lastSaved` are shown but NOT editable (PF-9 / PF-10): both
 * carry the exchange partner's value straight back, so letting a person
 * rewrite them would empty FR-021's round trip of meaning. `title` is absent
 * because FR-074 excludes it in as many words -- CM-1 is its one entry.
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

/**
 * Runs one Project command against the document.
 *
 * @purity pure
 */
export function editProject(document: Document, command: ProjectCommand): EditResult {
  const project = document.schedule.project

  switch (command.kind) {
    case 'setProjectTitle': {
      // FR-035: "`title` に空文字を受け付けてはならない（MUST NOT）" -- holding
      // both an empty string and a null would mean two kinds of "absent", and
      // every round trip and merge would need a rule for which one wins.
      if (command.title === '') {
        return refused([reject('CM-1', 'FR-035', 'the document name may not be an empty string')])
      }
      return edited(withProject(document, { ...project, title: command.title }))
    }

    case 'setProjectProfile': {
      const refusals: Refusal[] = []
      const { startDate } = command.fields
      if (startDate !== undefined && startDate !== null && dayOf(startDate) === null) {
        refusals.push(reject('CM-2', 'PF-8', `startDate is not a date: ${startDate}`))
      }
      if (refusals.length > 0) return refused(refusals)
      // Only the keys table T-224 admits are spread, and the type admits no
      // others -- `title` is absent from ProjectProfileFields, so CM-2 cannot
      // reach the document name even by mistake (FR-074's MUST NOT).
      let held = project
      for (const key of PROFILE_KEYS) {
        const value = command.fields[key]
        if (value !== undefined) held = { ...held, [key]: value }
      }
      return edited(withProject(document, held))
    }

    case 'setStatusDate': {
      // FR-046 makes putting the line down "write today into statusDate", but
      // the day arrives as a value: CS-1 forbids reading the clock here, and
      // LY-5 leaves the outside to the Framework.
      if (dayOf(command.date) === null) {
        return refused([reject('CM-3', 'FR-046', `not a date: ${command.date}`)])
      }
      return edited(withProject(document, { ...project, statusDate: command.date }))
    }

    case 'clearStatusDate':
      // FR-046: erasing the line IS setting statusDate to null. There is no
      // separate visibility flag to clear (the requirement forbids one).
      return edited(withProject(document, { ...project, statusDate: null }))

    case 'setThemeHue': {
      // S-73 of table T-216: 0 to 359, an integer.
      if (!Number.isInteger(command.hue) || command.hue < 0 || command.hue > 359) {
        return refused([reject('CM-5', 'S-73', `hue outside 0..359: ${command.hue}`)])
      }
      return edited(withProject(document, { ...project, themeHue: command.hue }))
    }
  }
}

/** @purity pure */
function reject(command: string, rule: string, what: string): Refusal {
  return { command, rule, what }
}
