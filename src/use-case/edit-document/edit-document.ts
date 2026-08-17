// EditDocument -- public entry of this folder.
//
// @unit      UF-10  (docs/spec/05-07-design.md, table T-075)
// @component EditDocument, layer UseCase (table T-062)
// @purity    pure
// @publishes table T-064 row PI-9
//
// Editing by aggregate: validate, return a new Document, settle nothing
// (CP-9). Table T-063's UT-2 splits the eight aggregate files apart NOT by
// purity -- all nine are pure -- but because the reason each changes is
// different: a rule about Tasks moving does not move the rules about
// calendars.
//
// ⭐ The eight files are exactly table T-108's eleven groups, folded onto the
// aggregates that own them, and the counts add up to its 71 commands:
//
//     edit-task.ts             `Task` 14 + `TaskVisual` 6      = 20
//     edit-task-group.ts       `TaskGroup` 10                  = 10
//     edit-dependency.ts       `Dependency` 3                  =  3
//     edit-annotation.ts       `CommentBox` 6 + `HighlightBox` 4 = 10
//     edit-resource.ts         `Resource` 4 + `Assignment` 2   =  6
//     edit-calendar.ts         `Calendar` 1                    =  1
//     edit-project.ts          `Project` 5                     =  5
//     edit-document-settings.ts 見せ方の群 16                    = 16
//
// ⚠️ `DocumentCommand` is declared HERE and re-exported by
// ApplyDocumentChange, not the other way round. Table T-064 lists the type
// under PI-8, and Chapter 5.3 lets a public entry re-export what it received
// -- but declaring it there would make EditDocument import
// ApplyDocumentChange while ApplyDocumentChange already imports EditDocument
// for WS-3, and LR-3 forbids a cycle inside a layer.
//
// ⛔ INCOMPLETE: two of the eight aggregates are written. The other six are
// listed above with their command counts and are not yet declared, so
// `DocumentCommand` is not yet the full 71. Nothing below assumes a count --
// the dispatch is by `kind` -- so the union grows without the plan changing.
//
// Nothing outside this folder may import any other file in it
// (Chapter 5.3, MUST NOT), so every name the component publishes
// leaves through here.

import type { Document } from '../../entity/document-model/document/document'

export type { ProjectCommand, ProjectProfileFields } from './edit-project'
export type { DocumentSettingsCommand, SettingsLimits } from './edit-document-settings'

import { editProject, type ProjectCommand } from './edit-project'
import {
  editDocumentSettings,
  type DocumentSettingsCommand,
  type SettingsLimits,
} from './edit-document-settings'

export { editProject, editDocumentSettings }

/**
 * One reason a command was refused.
 *
 * ⚠️ It names the row of table T-108 that was refused and the rule that
 * refused it. AG-9a decides what a refusal carries back to a caller; this is
 * the value that answer is built from, so it points at the specification
 * rather than describing the failure in prose alone.
 */
export interface Refusal {
  /** The row of table T-108, e.g. `CM-1`. */
  readonly command: string
  /** The requirement, table row or settings row doing the refusing. */
  readonly rule: string
  readonly what: string
}

/**
 * What an aggregate answers.
 *
 * ⚠️ A refusal is a VALUE, not an exception. FR-028 requires the caller to be
 * told whether the change was accepted, and AG-8 has failures come back as
 * values so the Agent API can report them.
 */
export type EditResult =
  | { readonly ok: true; readonly document: Document }
  | { readonly ok: false; readonly refusals: readonly Refusal[] }

/** @purity pure */
export function edited(document: Document): EditResult {
  return { ok: true, document }
}

/** @purity pure */
export function refused(refusals: readonly Refusal[]): EditResult {
  return { ok: false, refusals }
}

/** Every command table T-108 admits. Dispatch is by `kind`. */
export type DocumentCommand = ProjectCommand | DocumentSettingsCommand

/**
 * Which aggregate owns a command, resolved from `kind` alone.
 *
 * ⚠️ Kept as one list rather than a `switch` per aggregate: table T-108 is the
 * full count, and a command whose kind reaches no aggregate must be a visible
 * refusal rather than a silent no-op.
 *
 * @purity pure
 */
const PROJECT_KINDS = new Set<string>([
  'setProjectTitle',
  'setProjectProfile',
  'setStatusDate',
  'clearStatusDate',
  'setThemeHue',
])

/**
 * Runs one command against the document, whichever aggregate owns it.
 *
 * `limits` carries what the document does NOT hold: table T-206 keeps
 * `zoomMin` / `zoomMax` out of it on purpose, and the Row Area test FR-052
 * states needs the screen. Only the presentation aggregate reads them.
 *
 * @purity pure
 */
export function editDocument(
  document: Document,
  command: DocumentCommand,
  limits: SettingsLimits,
): EditResult {
  if (PROJECT_KINDS.has(command.kind)) {
    return editProject(document, command as ProjectCommand)
  }
  return editDocumentSettings(document, command as DocumentSettingsCommand, limits)
}
