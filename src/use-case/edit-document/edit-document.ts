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
// ✅ COMPLETE: all eight aggregates are written, and `DocumentCommand` is the
// full 71 commands of table T-108 -- 20 + 10 + 3 + 10 + 6 + 1 + 5 + 16. The
// count is not a claim made in prose: `ROUTE_TABLE` below is annotated
// `Record<DocumentCommand['kind'], AggregateEdit>`, so a row of table T-108
// that no aggregate lists is a missing property the compiler NAMES, and a
// listed kind that belongs to no command is rejected by the `satisfies` on the
// list that holds it. Neither can pass review by being overlooked.
//
// ⛔ One aggregate still reports a gap of its own, and it is a gap INSIDE a
// command rather than a command left out: edit-calendar.ts declares CM-39
// without a field for FR-088's exception days (例外日（休業日）), because
// `Exception.recurrenceKind` (AT-82) has no coded value standing for "does not
// recur" and nothing says what becomes of the exception rows already held.
// The other seven declare every row of their groups; the ⛔ marks inside them
// are points the specification leaves undecided WITHIN a command -- where a
// created row lands among its siblings, what ST-7's cap counts -- not commands
// that are absent.
//
// Nothing outside this folder may import any other file in it
// (Chapter 5.3, MUST NOT), so every name the component publishes
// leaves through here.

import type { Document } from '../../entity/document-model/document/document'

export type {
  TaskCommand,
  TaskMilestoneGlyph,
  TaskShapeKind,
  PlanActualPlacement,
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
import { editTaskGroup, type TaskGroupCommand } from './edit-task-group'
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

/**
 * The accepted edit: the document an aggregate answers with.
 *
 * ⚠️ A noun phrase, not `edited`. R2.1's parts-of-speech table keeps the past
 * tense for events -- notice of something already done, which a receiver may
 * not refuse -- and reads a noun phrase as a pure query. These two build the
 * VALUE an aggregate returns, and that value IS refusable: WS-3 throws a whole
 * bundle away when one command comes back refused. The participle still reads
 * once a noun follows it, as it does in `advancedStamp` and `clampedSettings`.
 *
 * @purity pure
 */
export function acceptedEdit(document: Document): EditResult {
  return { ok: true, document }
}

/**
 * The refused edit, carrying every reason it was refused.
 *
 * @purity pure
 */
export function refusedEdit(refusals: readonly Refusal[]): EditResult {
  return { ok: false, refusals }
}

// ⛔ MIGRATION SHIM -- delete these two aliases once the eight aggregate files
// call the names above. `edited` / `refused` are the past-tense shape R2.1
// reserves for events, so they are a defect wherever they appear; they survive
// here only because every call site is in the other eight files of this
// folder, which this pass is not permitted to touch. Nothing new may use them.
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
 * ⚠️ Only the presentation aggregate reads `limits`; the other seven declare
 * two parameters and ignore the third, which is what makes one shape enough
 * for all eight.
 */
type AggregateEdit = (
  document: Document,
  command: DocumentCommand,
  limits: SettingsLimits,
) => EditResult

/**
 * Spreads one aggregate's edit function across the kinds it owns.
 *
 * ⚠️ The cast is the one place the discriminant is lost. It is sound because
 * the key IS `command.kind` and the list handed in is checked against that
 * aggregate's own command type -- a kind that is not the aggregate's cannot be
 * in the list at all.
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
// ⚠️ Each list is `satisfies` its own aggregate's `kind`, so a name that is not
// a command of that aggregate is a compile error naming the string. Together
// with `ROUTE_TABLE`'s annotation this pins the routing from both sides: no
// stray kinds, and no command left unrouted. An eight-way `if`/`else` could do
// neither -- the last branch would swallow whatever the earlier ones missed.

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

/** CM-26 to CM-35. */
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

/** CM-56 to CM-71, the 見せ方の群. */
const SETTINGS_KINDS = [
  'setStackDirection',
  'setPlanActualDisplay',
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
  'setExportPngScale',
  'fitScheduleToScreen',
] as const satisfies readonly DocumentSettingsCommand['kind'][]

/**
 * Which aggregate owns a command, resolved from `kind` alone.
 *
 * ⭐ The annotation is the census. `Record<DocumentCommand['kind'], ...>`
 * demands a property for every one of table T-108's 71 rows, so an aggregate
 * whose list forgets one of its own commands does not build, and the compiler
 * says which name is missing. That is the whole reason the routing is a table
 * derived from eight lists rather than a chain of branches.
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
 * ⚠️ `ROUTE_TABLE` is typed by the 71 kinds, so reading it never admits a
 * miss. A command can still arrive from outside TypeScript -- AG-8's Agent API
 * hands one over as data -- and that miss must be VISIBLE. The map answers
 * `undefined`, which the dispatch below turns into a refusal.
 */
const ROUTES: ReadonlyMap<string, AggregateEdit> = new Map(Object.entries(ROUTE_TABLE))

/**
 * Runs one command against the document, whichever aggregate owns it.
 *
 * `limits` carries what the document does NOT hold: table T-206 keeps
 * `zoomMin` / `zoomMax` out of it on purpose, and the Row Area test FR-052
 * states needs the screen. Only the presentation aggregate reads them.
 *
 * ⚠️ A kind no aggregate owns comes back as a refusal, not as a throw (AG-8)
 * and not as a silent no-op -- returning the document untouched would tell the
 * caller the change was applied. `Refusal.command` carries the kind itself
 * here, because a kind reaching this branch names no row of table T-108.
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
