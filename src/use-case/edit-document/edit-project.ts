// EditDocument: the Project commands of table T-108.
// @unit      UF-17  (docs/spec/05-07-design.md, table T-075)
// @component EditDocument, layer UseCase (table T-062)
// @purity    pure

import { dayOf } from '../../entity/document-model/schedule/schedule'
import type { Document } from '../../entity/document-model/document/document'
import type { EditResult, Refusal } from './edit-document'
import { refused, edited } from './edit-document'

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

export type ProjectCommand =
  | { readonly kind: 'setProjectTitle'; readonly title: string | null }
  | { readonly kind: 'setProjectProfile'; readonly fields: ProjectProfileFields }
  | { readonly kind: 'setStatusDate'; readonly date: string }
  | { readonly kind: 'clearStatusDate' }
  | { readonly kind: 'setThemeHue'; readonly hue: number }

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

// see CM-1, CM-2, CM-3, CM-4, CM-5
/** @purity pure */
export function editProject(document: Document, command: ProjectCommand): EditResult {
  const project = document.schedule.project

  switch (command.kind) {
    case 'setProjectTitle': {
      if (command.title === '') {
        return refused([reject('CM-1', 'FR-035', 'the document name may not be an empty string')])
      }
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
      let held = project
      for (const key of PROFILE_KEYS) {
        const value = command.fields[key]
        if (value !== undefined && value !== held[key]) held = { ...held, [key]: value }
      }
      if (held === project) return edited(document)
      return edited(withProject(document, held))
    }

    case 'setStatusDate': {
      if (dayOf(command.date) === null) {
        return refused([reject('CM-3', 'FR-046', `not a date: ${command.date}`)])
      }
      if (project.statusDate === command.date) return edited(document)
      return edited(withProject(document, { ...project, statusDate: command.date }))
    }

    case 'clearStatusDate':
      if (project.statusDate === null) return edited(document)
      return edited(withProject(document, { ...project, statusDate: null }))

    case 'setThemeHue': {
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
