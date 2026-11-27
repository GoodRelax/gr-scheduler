// File: LinkTasks: draws the dependency line that use case UC-004 shows from the predecessor's edge to the pointer.
// @unit      UF-211  (docs/spec/05-07-design.md, table T-075)
// @component LinkTasks, layer UseCase (table T-062)
// @purity    pure
// @publishes table T-064 row PI-45

import type { Document } from '../../entity/document-model/document/document'
import type { DocumentSettings } from '../../entity/document-model/document-settings/document-settings'
import { emptySelection } from '../../entity/document-model/selection/selection'
import { taskByUid, type Task } from '../../entity/document-model/schedule/schedule'
import { dependencyEndAtPointer, type DependencyEnd } from '../../entity/layout-engine/item-hit-area/item-hit-area'
import {
  geometryFromLayout,
  type Point,
  type ScheduleGeometry,
} from '../../entity/layout-engine/schedule-geometry/schedule-geometry'
import type { ScheduleLayout } from '../../entity/layout-engine/schedule-layout/schedule-layout'
import type { ScreenRegions } from '../../entity/layout-engine/screen-regions/screen-regions'
import { editDocument, type SettingsLimits } from '../edit-document/edit-document'

export interface TentativeDependencyPicture {
  readonly document: Document
  readonly settings: DocumentSettings
  readonly layout: ScheduleLayout
  readonly geometry: ScheduleGeometry
  readonly regions: ScreenRegions
}

export interface TentativeDependencyRules {
  readonly settingsLimits: SettingsLimits
  readonly defaultTaskGroupName: string
}

type TaskPlacement = ScheduleLayout['placements'][number]

interface SuccessorEnd {
  readonly task: Task
  readonly placed: TaskPlacement
  readonly edge: DependencyEnd['edge']
}

// Spec: FR-009, PTD-3
// Why: the Task drawn from is no partner (DN-1), so over itself the line still enters from the pointer's left.
/** @purity pure */
function successorEndAt(picture: TentativeDependencyPicture, from: DependencyEnd, fromTask: Task,
                        fromPlaced: TaskPlacement, at: Point): SuccessorEnd {
  const { document, layout, geometry } = picture
  const into = dependencyEndAtPointer(geometry, at.x, at.y, null)
  const intoTask = into === null || into.taskUid === from.taskUid ? null : taskByUid(document.schedule, into.taskUid)
  const intoPlaced =
    intoTask === null ? undefined : layout.placements.find((one) => one.taskUid === intoTask.uid)
  if (into !== null && intoTask !== null && intoPlaced !== undefined) {
    return { task: intoTask, placed: intoPlaced, edge: into.edge }
  }
  const pointerUid = fromTask.uid + 1
  return {
    task: { ...fromTask, uid: pointerUid },
    placed: { ...fromPlaced, taskUid: pointerUid, x: at.x, width: 0, y: at.y, planHeight: 0, actualX: null, actualWidth: 0 },
    edge: 'start',
  }
}

// Provisional: OPQ-26
// Spec: UC-004, FR-009, PTD-3, T-018, T-018a, IMPS-329, IMPS-330, IMPS-331, IMPS-332, IMPS-333, IMPS-334, IMPS-336, IMPS-335
/** @purity pure */
export function tentativeDependencyLine(
  picture: TentativeDependencyPicture,
  from: DependencyEnd,
  at: Point,
  rules: TentativeDependencyRules,
): ScheduleGeometry['dependencies'][number] | null {
  const { document, settings, layout, regions } = picture
  const schedule = document.schedule
  const fromTask = taskByUid(schedule, from.taskUid)
  const fromPlaced = layout.placements.find((one) => one.taskUid === from.taskUid)
  if (fromTask === null || fromPlaced === undefined) return null
  const successor = successorEndAt(picture, from, fromTask, fromPlaced, at)
  const pair: Document = {
    ...document,
    schedule: {
      ...schedule,
      tasks: [{ ...fromTask, dependencies: [] }, { ...successor.task, dependencies: [] }],
    },
  }
  const made = editDocument(
    pair,
    {
      kind: 'createDependency',
      predecessorUid: fromTask.uid,
      successorUid: successor.task.uid,
      predecessorEdge: from.edge,
      successorEdge: successor.edge,
    },
    rules.settingsLimits,
    rules.defaultTaskGroupName,
  )
  if (!made.ok) return null
  // Why: FR-009 asks for the line with no exception for IC-81's toggle, so the copy draws it whatever the toggle says.
  const drawn = geometryFromLayout(
    { ...made.document.schedule, highlightBoxes: [], commentBoxes: [] },
    { ...settings, isDependencyVisible: true },
    { ...layout, placements: [fromPlaced, successor.placed] },
    regions,
    emptySelection(),
    null,
  )
  return drawn.dependencies[0] ?? null
}
