// EditDocument -- routes each document command to the aggregate that owns it.
// @unit      UF-10  (docs/spec/05-07-design.md, table T-075)
// @component EditDocument, layer UseCase (table T-062)
// @purity    pure
// @publishes table T-064 row PI-9
// The region at the foot is generated from docs/spec/_source/settings.json (table T-206);
// do not edit by hand inside it: rebuild with npm run gen.

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

// see AG-9a
export interface Refusal {
  readonly command: string
  readonly rule: string
  readonly reasonCategory?: 'bothEndsAreOneTask'
  readonly what: string
}

// see FR-028
export type EditResult =
  | { readonly ok: true; readonly document: Document; readonly report: EditReport }
  | { readonly ok: false; readonly refusals: readonly Refusal[] }

// see FR-012
export interface EditReport {
  readonly recountedTaskUids: readonly number[]
}

const NOTHING_TO_TELL: EditReport = { recountedTaskUids: [] }

/** @purity pure */
export function acceptedEdit(document: Document, report: EditReport = NOTHING_TO_TELL): EditResult {
  return { ok: true, document, report }
}

/** @purity pure */
export function refusedEdit(refusals: readonly Refusal[]): EditResult {
  return { ok: false, refusals }
}

// WHY: deprecated aliases, kept until every caller uses acceptedEdit / refusedEdit.
export { acceptedEdit as edited, refusedEdit as refused }

// see T-108
export type DocumentCommand =
  | TaskCommand
  | TaskGroupCommand
  | DependencyCommand
  | AnnotationCommand
  | ResourceCommand
  | CalendarCommand
  | ProjectCommand
  | DocumentSettingsCommand

type AggregateEdit = (
  document: Document,
  command: DocumentCommand,
  limits: SettingsLimits,
) => EditResult

/** @purity pure */
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

const DEPENDENCY_KINDS = [
  'createDependency',
  'deleteDependency',
  'setDependencyLag',
] as const satisfies readonly DependencyCommand['kind'][]

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

const RESOURCE_KINDS = [
  'createResource',
  'setResourceName',
  'deleteResource',
  'deleteUnreferencedResources',
  'createAssignment',
  'unassignResource',
] as const satisfies readonly ResourceCommand['kind'][]

const CALENDAR_KINDS = ['setCalendar'] as const satisfies readonly CalendarCommand['kind'][]

const PROJECT_KINDS = [
  'setProjectTitle',
  'setProjectProfile',
  'setStatusDate',
  'clearStatusDate',
  'setThemeHue',
] as const satisfies readonly ProjectCommand['kind'][]

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

const ROUTES: ReadonlyMap<string, AggregateEdit> = new Map(Object.entries(ROUTE_TABLE))

// see CP-9, T-108
/** @purity pure */
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
// see T-206
export const NOT_STORED_ZOOM_BOUNDS: {
  readonly 'S-97': number
  readonly 'S-98': number
} = {
  'S-97': 0.02,
  'S-98': 64,
}
// </generated>
