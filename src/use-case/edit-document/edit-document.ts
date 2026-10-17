// EditDocument -- routes each document command to the aggregate that owns it.
// @unit      UF-10  (docs/spec/05-07-design.md, table T-075)
// @component EditDocument, layer UseCase (table T-062)
// @purity    pure
// @publishes table T-064 row PI-9
// The region at the foot is generated from docs/spec/_source/settings.json (table T-206);
// do not edit by hand inside it: rebuild with npm run gen.

import type { Document } from '../../entity/document-model/document/document'
import type { TaskGroup } from '../../entity/document-model/schedule/schedule'

export type {
  TaskCommand,
  TaskMilestoneGlyph,
  TaskShapeKind,
  PlanActualPlacement,
  ActualGrabHold,
  CycleSurroundings,
  CycledPlanActual,
} from './edit-task'
export { cycleTaskPlanActualState } from './edit-task'
export { recountedPercentComplete } from './percent-complete'
export type { TaskGroupCommand } from './edit-task-group'
export { wbsSubtreesOf } from './edit-task-group'
export { pastedUidsOf } from './task-paste'
export { levelZeroWritesFor, treeStateWritesFor } from './task-group-folding'
export type { TreeStateEvent } from './task-group-folding'
export { searchJumpCommands, searchJumpReachOf, searchJumpWrites, shownTasksRevealWrites } from './search-jump'
export type { SearchJumpPlan, SearchJumpTarget } from './search-jump'
export { confirmationOwedBy, confirmationOwedByResourceDeletion } from './deletion-confirmations'
export type { DeletionQuestion } from './deletion-confirmations'
export type { DependencyCommand, DependencyEdge } from './edit-dependency'
export type { AnnotationCommand, AnnotationAnchor, HighlightRange } from './edit-annotation'
export type { ResourceCommand } from './edit-resource'
export type { CalendarCommand } from './edit-calendar'
export type { ProjectCommand, ProjectProfileFields } from './edit-project'
export { timeShiftPreviewOf } from './edit-project'
export type { WholeScheduleShiftCommand } from './whole-schedule-shift'
export { wholeScheduleShiftPreviewOf } from './whole-schedule-shift'
export type {
  BaseChangeWay,
  BaseTimeZones,
  DocumentSettingsCommand,
  SettingsLimits,
  TableView,
  VisibleElement,
} from './edit-document-settings'
export { baseChangeCommandOf, baseTimeZonesAfterChange, tableViewOf, tableViewsKeptIn } from './edit-document-settings'

import { editTask, type TaskCommand } from './edit-task'
import { editTaskGroup, type TaskGroupCommand } from './edit-task-group'
import { editDependency, type DependencyCommand } from './edit-dependency'
import { editAnnotation, type AnnotationCommand } from './edit-annotation'
import { editResource, type ResourceCommand } from './edit-resource'
import { editCalendar, type CalendarCommand } from './edit-calendar'
import { editProject, type ProjectCommand } from './edit-project'
import { wholeScheduleShifted, type WholeScheduleShiftCommand } from './whole-schedule-shift'
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

// see AG-9a
export type Refusal = CommandRefusal | InvariantRefusal

// see AG-9a
export interface CommandRefusal {
  readonly command: string
  readonly rule: string
  readonly reasonCategory?: 'bothEndsAreOneTask'
  readonly what: string
}

// see T-220
export type InvariantRow = `IV-${number}`

// see AG-9a, FR-023, FR-076
export interface InvariantRefusal {
  readonly command?: never
  readonly rule: InvariantRow
  readonly reasonCategory?: never
  readonly at: string
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

/** @purity pure */
export function reject(
  command: string,
  rule: string,
  what: string,
  reasonCategory?: Refusal['reasonCategory'],
): Refusal {
  return reasonCategory === undefined
    ? { command, rule, what }
    : { command, rule, reasonCategory, what }
}

// WHY: deprecated aliases, kept until every caller uses acceptedEdit / refusedEdit.
export { acceptedEdit as edited, refusedEdit as refused }

// <generated -- do not edit by hand>
// From docs/spec/_source/document-commands.json (table T-108, DocumentCommand).
// see T-108, CM-76
// WHY: rows of table T-108 nothing implements yet; editDocument refuses them as no aggregate owns them.
export type UnimplementedDocumentCommand =
  | {
      readonly kind: 'setTaskGroupEditPermission'
      readonly taskGroupId: TaskGroup['id']
      readonly editPermission: TaskGroup['editPermission']
    }

// see T-108
export type DocumentCommand =
  | TaskCommand
  | TaskGroupCommand
  | DependencyCommand
  | AnnotationCommand
  | ResourceCommand
  | CalendarCommand
  | ProjectCommand
  | WholeScheduleShiftCommand
  | DocumentSettingsCommand
  | UnimplementedDocumentCommand

// see T-108
// WHY: the router reads the commands of each union here rather than a hand copy (check 69).
const COMMAND_KINDS_BY_UNION = {
  TaskCommand: [
    'createTask',
    'deleteTask',
    'pasteTasks',
    'setTaskName',
    'setTaskNotes',
    'setTaskPlanDates',
    'setTaskDeadline',
    'setTaskPlanActualState',
    'beginTaskActual',
    'cycleTaskPlanActualState',
    'setTaskFadeInDays',
    'setTaskFadeOutDays',
    'setTaskParentTask',
    'moveTaskToTaskGroup',
    'setTaskVisualShapeKind',
    'setTaskVisualMilestoneGlyph',
    'setTaskVisualColors',
    'resetTaskVisualColors',
    'setTaskVisualStrokeWidthPx',
  ],
  TaskGroupCommand: [
    'createTaskGroup',
    'deleteTaskGroup',
    'pasteTaskGroupSubtree',
    'setTaskGroupName',
    'setTaskGroupColor',
    'resetTaskGroupColor',
    'setTaskGroupMinHeightPx',
    'reorderTaskGroupSiblings',
    'resetTaskGroupTreeStates',
    'moveTaskGroup',
    'setTaskGroupTreeState',
  ],
  DependencyCommand: ['createDependency', 'deleteDependency', 'deleteDependencyAt', 'setDependencyLag'],
  AnnotationCommand: [
    'createCommentBox',
    'deleteCommentBox',
    'setCommentBoxText',
    'setCommentBoxLeaderShapeKind',
    'setCommentBoxAnchor',
    'setCommentBoxBodyOffsetPx',
    'setCommentBoxStrokeColor',
    'setCommentBoxStrokeWidthPx',
    'setCommentBoxFillColor',
    'setCommentBoxFillTransparencyPercent',
    'setCommentBoxTextColor',
    'bringCommentBoxToFront',
    'createHighlightBox',
    'deleteHighlightBox',
    'setHighlightBoxRange',
    'setHighlightBoxStrokeColor',
    'setHighlightBoxStrokeWidthPx',
    'setHighlightBoxFillColor',
    'setHighlightBoxFillTransparencyPercent',
    'bringHighlightBoxToFront',
  ],
  ResourceCommand: [
    'createResource',
    'setResourceName',
    'deleteResources',
    'deleteUnreferencedResources',
    'createAssignment',
    'deleteAssignment',
  ],
  CalendarCommand: ['setCalendar'],
  ProjectCommand: [
    'setProjectTitle',
    'setProjectProfile',
    'setStatusDate',
    'clearStatusDate',
    'setThemeHue',
    'setParentTaskProgressToleranceDays',
    'setScheduleDataTimeZone',
    'shiftScheduleTimes',
  ],
  WholeScheduleShiftCommand: ['shiftScheduleToStartDate'],
  DocumentSettingsCommand: [
    'setStackDirection',
    'setVisibilitySetting',
    'setFontSizeStep',
    'setThemeMonochrome',
    'setZoom',
    'setScrollPosition',
    'setTaskGroupPanelWidthPx',
    'pinTaskGroup',
    'unpinTaskGroup',
    'fitScheduleToScreen',
    'setDisplayScale',
    'setFitSpan',
    'clearFitSpan',
    'setFitSpanFixed',
    'setTaskGroupPanelWidthFixed',
    'setTableView',
    'setViewTimeZone',
    'setDisplayTimeZones',
    'setTimeOfDayVisible',
    'setLevelZeroTreeState',
  ],
} as const
// </generated>

type AggregateEdit = (
  document: Document,
  command: DocumentCommand,
  limits: SettingsLimits,
  defaultTaskGroupName: string,
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

// WHY: an unimplemented command has no aggregate; editDocument refuses it below.
const ROUTE_TABLE: Record<Exclude<DocumentCommand['kind'], UnimplementedDocumentCommand['kind']>, AggregateEdit> = {
  ...routes(COMMAND_KINDS_BY_UNION.TaskCommand, (document, command, _limits, defaultTaskGroupName) =>
    editTask(document, command as TaskCommand, defaultTaskGroupName),
  ),
  ...routes(COMMAND_KINDS_BY_UNION.TaskGroupCommand, (document, command, _limits, defaultTaskGroupName) =>
    editTaskGroup(document, command as TaskGroupCommand, defaultTaskGroupName),
  ),
  ...routes(COMMAND_KINDS_BY_UNION.DependencyCommand, (document, command) =>
    editDependency(document, command as DependencyCommand),
  ),
  ...routes(COMMAND_KINDS_BY_UNION.AnnotationCommand, (document, command) =>
    editAnnotation(document, command as AnnotationCommand),
  ),
  ...routes(COMMAND_KINDS_BY_UNION.ResourceCommand, (document, command) =>
    editResource(document, command as ResourceCommand),
  ),
  ...routes(COMMAND_KINDS_BY_UNION.CalendarCommand, (document, command) =>
    editCalendar(document, command as CalendarCommand),
  ),
  ...routes(COMMAND_KINDS_BY_UNION.ProjectCommand, (document, command) => editProject(document, command as ProjectCommand)),
  // see CM-99, UT-2
  ...routes(COMMAND_KINDS_BY_UNION.WholeScheduleShiftCommand, (document, command) => wholeScheduleShifted(document, command as WholeScheduleShiftCommand)),
  ...routes(COMMAND_KINDS_BY_UNION.DocumentSettingsCommand, (document, command, limits) =>
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
  defaultTaskGroupName: string,
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
  return run(document, command, limits, defaultTaskGroupName)
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
  'S-98': 240,
}
// </generated>
