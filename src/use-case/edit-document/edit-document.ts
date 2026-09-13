// EditDocument -- public entry of this folder.
//
// @unit      UF-10  (docs/spec/05-07-design.md, table T-075)
// @component EditDocument, layer UseCase (table T-062)
// @purity    pure
// @publishes table T-064 row PI-9
//
// ⚠️ PART of this file is generated. The marked region at the bottom -- search
// for NOT_STORED_ZOOM_BOUNDS -- comes from docs/spec/_source/settings.json
// (table T-206's S-97 and S-98, which name S-54 and S-55 of table T-201) and is
// overwritten by `npm run gen`; `npm run gen:check` fails if it has drifted.
// Everything above the marker is hand written. Do not edit by hand inside that
// region: edit the manuscript instead.
// ⛔ This note does NOT quote the opening marker itself -- writing it in a
// comment makes the generator treat the comment as the region and inject the
// block into the middle of it. The marker must occur exactly once per file.
//
// Editing by aggregate: validate, return a new Document, settle nothing
// (CP-9). UT-2 of table T-063 splits the aggregates by their reason to change.
//
// Table T-108's groups, folded onto the aggregates that own them:
//
//     edit-task.ts               `Task` + `TaskVisual`
//     edit-task-group.ts         `TaskGroup`
//     edit-dependency.ts         `Dependency`
//     edit-annotation.ts         `CommentBox` + `HighlightBox`
//     edit-resource.ts           `Resource` + `Assignment`
//     edit-calendar.ts           `Calendar`
//     edit-project.ts            `Project`
//     edit-document-settings.ts  見せ方の群
//
// ⚠️ `DocumentCommand` is declared HERE and re-exported by ApplyDocumentChange
// (PI-8 of table T-064): declared there, EditDocument would import
// ApplyDocumentChange, which already imports EditDocument for WS-3 -- a cycle
// LR-3 forbids.
//
// Completeness is held by the compiler, not by a written count: `ROUTE_TABLE`
// is typed `Record<DocumentCommand['kind'], AggregateEdit>`, and each kind list
// `satisfies` its own aggregate's kinds.
//
// ⛔ edit-calendar.ts declares CM-39 without FR-088's exception days; see the
// note there.

import type { Document } from '../../entity/document-model/document/document'

export type {
  TaskCommand,
  TaskMilestoneGlyph,
  TaskShapeKind,
  PlanActualPlacement,
  ActualGrabHold,
} from './edit-task'
export type { TaskGroupCommand } from './edit-task-group'
export type { DependencyCommand, DependencyEdge } from './edit-dependency'
export type { AnnotationCommand, AnnotationAnchor, HighlightRange } from './edit-annotation'
export type { ResourceCommand } from './edit-resource'
export type { CalendarCommand } from './edit-calendar'
export type { ProjectCommand, ProjectProfileFields } from './edit-project'
export type {
  DocumentSettingsCommand,
  SettingsLimits,
  VisibleElement,
} from './edit-document-settings'

import { editTask, type TaskCommand } from './edit-task'
import { DEFAULT_ROW_NAME, editTaskGroup, type TaskGroupCommand } from './edit-task-group'
import { editDependency, type DependencyCommand } from './edit-dependency'
import { editAnnotation, type AnnotationCommand } from './edit-annotation'
import { editResource, type ResourceCommand } from './edit-resource'
import { editCalendar, type CalendarCommand } from './edit-calendar'
import { editProject, type ProjectCommand } from './edit-project'
import {
  editDocumentSettings,
  type DocumentSettingsCommand,
  type SettingsLimits,
} from './edit-document-settings'

/**
 * HF-14 of table T-051. Re-exported, not re-spelled: Chapter 6.2 gives the
 * words one destination in `src/`, and the party that plans CM-26 for IC-91 /
 * IC-93 lives outside this folder. ⛔ A second
 * `displayWords.defaultNames.find(...)` on the planning side is what Chapter
 * 6.2 forbids.
 */
export { DEFAULT_ROW_NAME }

export {
  editTask,
  editTaskGroup,
  editDependency,
  editAnnotation,
  editResource,
  editCalendar,
  editProject,
  editDocumentSettings,
}

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
  /**
   * AG-9a's reason category (table T-035), for a rule that refuses for more
   * than one reason without a row id for each.
   *
   * FR-009 forbids several dependencies under one rule, so `command` and `rule`
   * cannot tell "both ends are one task" (RS-56) from the rest, and the shell
   * would give RS-56's words to refusals that do not mean it (table T-037).
   * Optional: a single-reason rule is already told apart by `rule`.
   * Not a row of table T-233 -- this layer knows nothing of the screen (LY-4 of
   * table T-060), so the shell joins category to row. The spellings are this
   * layer's own (rule 03 section 2); AG-9a names none.
   */
  readonly reasonCategory?: 'bothEndsAreOneTask'
  readonly what: string
}

/**
 * What an aggregate answers.
 *
 * ⚠️ A refusal is a value, not an exception (FR-028, R7.10).
 */
export type EditResult =
  | { readonly ok: true; readonly document: Document; readonly report: EditReport }
  | { readonly ok: false; readonly refusals: readonly Refusal[] }

/**
 * What an accepted edit leaves for the caller to TELL, beside the document.
 *
 * Most edits have nothing to tell, which is why `acceptedEdit` defaults to the
 * empty report.
 */
export interface EditReport {
  /**
   * The `Task`s whose stored percent complete a calendar edit recounted, by
   * uid (FR-012).
   *
   * A list, not a length: a bundle may hold several calendar commands, and a
   * uid counted twice would be one `Task` reported as two. NT-3's count is the
   * length, taken where the notice (RS-52 of table T-233) is raised; no word is
   * composed here (FR-038).
   */
  readonly recountedTaskUids: readonly number[]
}

/**
 * The report of an edit that left nothing to tell.
 *
 * One shared value rather than a fresh one per accepted edit: an empty report
 * carries no identity for anyone to compare.
 */
const NOTHING_TO_TELL: EditReport = { recountedTaskUids: [] }

/**
 * The accepted edit: the document an aggregate answers with.
 *
 * A noun phrase, not `edited`: R2.1 keeps the past tense for events a receiver
 * may not refuse, and this value IS refusable (WS-3 drops a whole bundle when
 * one command is refused).
 *
 * @purity pure
 */
export function acceptedEdit(document: Document, report: EditReport = NOTHING_TO_TELL): EditResult {
  return { ok: true, document, report }
}

/**
 * The refused edit, carrying every reason it was refused.
 *
 * @purity pure
 */
export function refusedEdit(refusals: readonly Refusal[]): EditResult {
  return { ok: false, refusals }
}

// ⛔ MIGRATION SHIM -- delete these aliases once the aggregate files call the
// names above. `edited` / `refused` are the past-tense shape R2.1 reserves for
// events; nothing new may use them.
export { acceptedEdit as edited, refusedEdit as refused }

/** Every command table T-108 admits. Dispatch is by `kind`. */
export type DocumentCommand =
  | TaskCommand
  | TaskGroupCommand
  | DependencyCommand
  | AnnotationCommand
  | ResourceCommand
  | CalendarCommand
  | ProjectCommand
  | DocumentSettingsCommand

/**
 * One aggregate's edit function, with `limits` folded in.
 *
 * Only the presentation aggregate reads `limits`; the others ignore it, so one
 * shape serves every aggregate.
 */
type AggregateEdit = (
  document: Document,
  command: DocumentCommand,
  limits: SettingsLimits,
) => EditResult

/**
 * Spreads one aggregate's edit function across the kinds it owns.
 *
 * ⚠️ The cast loses the discriminant, soundly: the key IS `command.kind`, and
 * each list handed in `satisfies` its aggregate's own command type.
 *
 * @purity pure
 */
function routes<K extends readonly string[]>(
  kinds: K,
  run: AggregateEdit,
): Record<K[number], AggregateEdit> {
  const table: Record<string, AggregateEdit> = {}
  for (const kind of kinds) {
    table[kind] = run
  }
  return table as Record<K[number], AggregateEdit>
}

// ---- One list per aggregate ------------------------------------------------
//
// Each list `satisfies` its aggregate's `kind`, so a stray name is a compile
// error; with `ROUTE_TABLE`'s annotation no command is left unrouted either.
// An `if`/`else` chain could do neither -- its last branch swallows the misses.

/** CM-6 to CM-25. */
const TASK_KINDS = [
  'createTask',
  'deleteTask',
  'pasteTaskSubtree',
  'setTaskName',
  'setTaskNotes',
  'setTaskPlanDates',
  'setTaskDeadline',
  'setTaskPlanActualState',
  'beginTaskActual',
  'cycleTaskPlanActualState',
  'setTaskFadeInDays',
  'setTaskFadeOutDays',
  'setTaskWbsParent',
  'moveTaskToTaskGroup',
  'setTaskVisualShapeKind',
  'setTaskVisualMilestoneGlyph',
  'setTaskVisualColors',
  'resetTaskVisualColors',
  'setTaskVisualLineWeight',
  'setTaskVisualNamePlacement',
] as const satisfies readonly TaskCommand['kind'][]

/** CM-26 to CM-35, CM-72 -- half of one fit press (FR-031) -- and CM-73. */
const TASK_GROUP_KINDS = [
  'createTaskGroup',
  'deleteTaskGroup',
  'pasteTaskGroupSubtree',
  'setTaskGroupLabel',
  'setTaskGroupColor',
  'resetTaskGroupColor',
  'setTaskGroupHeight',
  'setTaskGroupCollapsed',
  'setTaskGroupHidden',
  'reorderTaskGroupSiblings',
  'expandAllTaskGroups',
  'moveTaskGroup',
] as const satisfies readonly TaskGroupCommand['kind'][]

/** CM-36 to CM-38. */
const DEPENDENCY_KINDS = [
  'createDependency',
  'deleteDependency',
  'setDependencyLag',
] as const satisfies readonly DependencyCommand['kind'][]

/** CM-46 to CM-55. */
const ANNOTATION_KINDS = [
  'createCommentBox',
  'deleteCommentBox',
  'setCommentBoxText',
  'setCommentBoxLeaderShapeKind',
  'setCommentBoxAnchor',
  'setCommentBoxBodyOffsetPx',
  'createHighlightBox',
  'deleteHighlightBox',
  'setHighlightBoxRange',
  'setHighlightBoxStrokeColor',
] as const satisfies readonly AnnotationCommand['kind'][]

/** CM-40 to CM-45. */
const RESOURCE_KINDS = [
  'createResource',
  'setResourceName',
  'deleteResource',
  'deleteUnreferencedResources',
  'createAssignment',
  'unassignResource',
] as const satisfies readonly ResourceCommand['kind'][]

/** CM-39. */
const CALENDAR_KINDS = ['setCalendar'] as const satisfies readonly CalendarCommand['kind'][]

/** CM-1 to CM-5. */
const PROJECT_KINDS = [
  'setProjectTitle',
  'setProjectProfile',
  'setStatusDate',
  'clearStatusDate',
  'setThemeHue',
] as const satisfies readonly ProjectCommand['kind'][]

/**
 * The 見せ方の群 of table T-108.
 *
 * ⚠️ Named as a group, not as a CM span: the group has retired rows inside its
 * span, which a span would still count.
 */
const SETTINGS_KINDS = [
  'setStackDirection',
  'setElementVisible',
  'setGuideCursorMode',
  'setDualCursor',
  'clearDualCursor',
  'setFontScale',
  'setThemePreference',
  'setThemeMonochrome',
  'setZoom',
  'setScrollPosition',
  'setPanelWidths',
  'pinTaskGroup',
  'unpinTaskGroup',
  'fitScheduleToScreen',
] as const satisfies readonly DocumentSettingsCommand['kind'][]

/**
 * Which aggregate owns a command, resolved from `kind` alone.
 *
 * The annotation demands a property for every row of table T-108, so a kind a
 * list forgets does not build, and the compiler names it.
 */
const ROUTE_TABLE: Record<DocumentCommand['kind'], AggregateEdit> = {
  ...routes(TASK_KINDS, (document, command) => editTask(document, command as TaskCommand)),
  ...routes(TASK_GROUP_KINDS, (document, command) =>
    editTaskGroup(document, command as TaskGroupCommand),
  ),
  ...routes(DEPENDENCY_KINDS, (document, command) =>
    editDependency(document, command as DependencyCommand),
  ),
  ...routes(ANNOTATION_KINDS, (document, command) =>
    editAnnotation(document, command as AnnotationCommand),
  ),
  ...routes(RESOURCE_KINDS, (document, command) =>
    editResource(document, command as ResourceCommand),
  ),
  ...routes(CALENDAR_KINDS, (document, command) =>
    editCalendar(document, command as CalendarCommand),
  ),
  ...routes(PROJECT_KINDS, (document, command) => editProject(document, command as ProjectCommand)),
  ...routes(SETTINGS_KINDS, (document, command, limits) =>
    editDocumentSettings(document, command as DocumentSettingsCommand, limits),
  ),
}

/**
 * The same table, keyed by any string.
 *
 * ⚠️ A command can still arrive from outside TypeScript (the Agent API hands
 * one over as data), so a miss must be visible: the map answers `undefined`,
 * which the dispatch below turns into a refusal.
 */
const ROUTES: ReadonlyMap<string, AggregateEdit> = new Map(Object.entries(ROUTE_TABLE))

/**
 * Runs one command against the document, whichever aggregate owns it.
 *
 * `limits` carries what the document does not hold (table T-206's `zoomMin` /
 * `zoomMax`, and what FR-052's Row Area test needs from the screen).
 *
 * ⚠️ An unowned kind is refused, not thrown (R7.10) and not a silent no-op,
 * which would report the change as applied. `Refusal.command` then carries the
 * kind itself, since it names no row of table T-108.
 *
 * @purity pure
 */
export function editDocument(
  document: Document,
  command: DocumentCommand,
  limits: SettingsLimits,
): EditResult {
  const run = ROUTES.get(command.kind)
  if (run === undefined) {
    return refusedEdit([
      {
        command: command.kind,
        rule: 'T-108',
        what: `no aggregate owns the command kind '${command.kind}'`,
      },
    ])
  }
  return run(document, command, limits)
}

// <generated -- do not edit by hand>
// Single source of truth:
//   docs/spec/_source/settings.json (table T-206, which names table T-201)
// Rebuild: npm run gen   ||   npm run gen:check fails on drift.
/**
 * The values table T-206 states that this unit needs, by row ID.
 *
 * ⭐ Table T-206 holds what the document does NOT store, so these
 * are not document settings and are not in SETTINGS_DEFAULTS. They
 * are reached by row ID because most rows of that table have no key
 * column -- the row ID is the specification's own name for them.
 *
 * ⚠️ Reading this is NOT the same as taking it: the value still
 * arrives as an argument, because table T-206 keeps these out of the
 * document on purpose (the environment may hold a larger one). This
 * is what a caller passes when it has nothing better.
 *
 * ⚠️ Table T-206 states these by POINTING at table T-201 (S-96 names
 * S-53, and so on), so both row IDs appear below: the first is where
 * the specification says the document does not keep the value, and
 * the second is where the value itself stands.
 */
export const NOT_STORED_ZOOM_BOUNDS: {
  /** S-97, stated at S-54 */
  readonly 'S-97': number
  /** S-98, stated at S-55 */
  readonly 'S-98': number
} = {
  'S-97': 0.02,
  'S-98': 64,
}
// </generated>
