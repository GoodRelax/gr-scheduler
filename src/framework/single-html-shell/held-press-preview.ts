// SingleHtmlShell frame loop -- while a grab is held, builds the document and dependency line a release would give.
// @unit      UF-158  (docs/spec/05-07-design.md, table T-075)
// @component SingleHtmlShell, layer Framework (table T-062)
// @purity    semi-pure-b

import type { Document } from '../../entity/document-model/document/document'
import type { DocumentSettings } from '../../entity/document-model/document-settings/document-settings'
import { emptySelection } from '../../entity/document-model/selection/selection'
import { taskByUid } from '../../entity/document-model/schedule/schedule'
import {
  dependencyEndAtPointer,
  dependencyStartOfHit,
} from '../../entity/layout-engine/item-hit-area/item-hit-area'
import {
  geometryFromLayout,
  type Point,
  type ScheduleGeometry,
} from '../../entity/layout-engine/schedule-geometry/schedule-geometry'
import type { ScheduleLayout } from '../../entity/layout-engine/schedule-layout/schedule-layout'
import type { ScreenRect, ScreenRegions } from '../../entity/layout-engine/screen-regions/screen-regions'
import { editDocument } from '../../use-case/edit-document/edit-document'
import {
  commandFromInput,
  type InputContext,
  type PointerInput,
  type PointerPress,
} from '../../adapter/input-command-translator/input-command-translator'
import { DEFAULT_ROW_NAME } from '../../adapter/screen-renderer/screen-renderer'
import type { FrameLoopHands, FrameValues } from './frame-loop'
import type { GrabbedArea } from './pointer-shape'

// STOP: spec does not decide which T-023d rows draw while held beyond its two
// closing rules. Looked in T-023d, FR-052, IN-1
// @provisional PND-250
const PREVIEWED_GRABS: Readonly<Record<GrabbedArea, boolean>> = {
  'GA-1': true,
  'GA-2': true,
  'GA-3': true,
  'GA-4': true,
  'GA-5': true,
  'GA-6': true,
  'GA-7': true,
  'GA-8': true,
  'GA-9': true,
  'GA-10': true,
  'GA-11': true,
  'GA-12': true,
  'GA-13': true,
  'GA-14': true,
  'GA-15': true,
  'GA-16': true,
  'GA-17': true,
  'GA-18': true,
  'GA-19': false,
  'GA-20': true,
  'GA-21': true,
  'GA-22': true,
  'GR-10': false,
  'GR-11': false,
  'GR-14': true,
  'GR-16': true,
}

// see PTD-5
/** @purity pure */
export function marqueeRect(
  press: PointerPress | null,
  at: Point | null,
): ScreenRect | null {
  if (press === null || at === null) return null
  if (press.on !== null || press.pressRow !== 'PTD-5') return null
  const width = Math.abs(at.x - press.at.x)
  const height = Math.abs(at.y - press.at.y)
  if (width === 0 && height === 0) return null
  return { x: Math.min(press.at.x, at.x), y: Math.min(press.at.y, at.y), width, height }
}

// see T-023d, PTD-3, FR-009
/** @purity pure */
function isPreviewedPress(press: PointerPress | null, isDependencyArmed: boolean): boolean {
  if (press === null) return false
  if (press.on !== null) return press.on.dividerPanel !== null
  // WHY: the one tentative line belongs to FR-009, so a previewed createDependency would draw it twice.
  if (press.pressRow === 'PTD-3' && isDependencyArmed) return false
  // WHY: PTD-1 is not previewed: scrolledAnchor measures the travel against the
  // previewed layout, so the picture would run away.
  if (press.pressRow === 'PTD-4') return true
  return press.hit !== null && PREVIEWED_GRABS[press.hit.grab]
}

export type HeldPressPreviewHands = Pick<FrameLoopHands, 'readSession' | 'readHeld' | 'readValues' | 'settingsLimitsOf'>

/** @purity semi-pure-b */
export function previewOfHeldPress(
  hands: HeldPressPreviewHands,
  press: PointerPress | null,
  at: Point | null,
  context: InputContext,
  frame: FrameValues,
): Document | null {
  const isDependencyArmed = hands.readSession().screen.armModeState.kind === 'dependencyArmed'
  if (press === null || at === null || !isPreviewedPress(press, isDependencyArmed)) return null
  const release: PointerInput = { ...press.at, phase: 'up', x: at.x, y: at.y }
  const action = commandFromInput(release, context).action
  if (action === null || action.kind !== 'changeDocument') return null
  const limits = hands.settingsLimitsOf(frame)
  let drawn = hands.readHeld().document
  for (const commands of action.writes) {
    for (const command of commands) {
      const result = editDocument(drawn, command, limits, DEFAULT_ROW_NAME)
      // STOP: spec does not decide what a refused drag draws.
      // Looked in FR-052, WS-3, FD-6, IV-12
      // @provisional PND-253
      if (!result.ok) return null
      drawn = result.document
    }
  }
  return drawn
}

// see FR-009, PTD-3, T-018, T-018a
/** @purity semi-pure-b */
export function tentativeDependencyOf(
  hands: HeldPressPreviewHands, press: PointerPress | null,
  at: Point | null,
  document: Document,
  settings: DocumentSettings,
  layout: ScheduleLayout,
  geometry: ScheduleGeometry,
  regions: ScreenRegions,
): ScheduleGeometry['dependencies'][number] | null {
  if (press === null || at === null || press.on !== null) return null
  if (press.pressRow !== 'PTD-3' || hands.readSession().screen.armModeState.kind !== 'dependencyArmed') return null
  const from = dependencyStartOfHit(geometry, press.at.x, press.at.y, press.hit)
  if (from === null) return null
  const schedule = document.schedule
  const fromTask = taskByUid(schedule, from.taskUid)
  const fromPlaced = layout.placements.find((one) => one.taskUid === from.taskUid)
  if (fromTask === null || fromPlaced === undefined) return null

  const into = dependencyEndAtPointer(geometry, at.x, at.y, null)
  // WHY: the Task drawn from is no partner (DN-1), so over itself the line still enters from the pointer's left.
  const intoTask = into === null || into.taskUid === from.taskUid ? null : taskByUid(schedule, into.taskUid)
  const intoPlaced =
    intoTask === null ? undefined : layout.placements.find((one) => one.taskUid === intoTask.uid)
  const partner = into !== null && intoTask !== null && intoPlaced !== undefined
    ? { task: intoTask, placed: intoPlaced, edge: into.edge }
    : null
  const pointerUid = fromTask.uid + 1
  const successor = partner === null ? { ...fromTask, uid: pointerUid } : partner.task
  const successorPlaced =
    partner === null
      ? { ...fromPlaced, taskUid: pointerUid, x: at.x, width: 0, y: at.y, planHeight: 0,
          actualX: null, actualWidth: 0 }
      : partner.placed

  const pair: Document = {
    ...document,
    schedule: {
      ...schedule,
      tasks: [{ ...fromTask, dependencies: [] }, { ...successor, dependencies: [] }],
    },
  }
  const made = editDocument(
    pair,
    {
      kind: 'createDependency',
      predecessorUid: fromTask.uid,
      successorUid: successor.uid,
      predecessorEdge: from.edge,
      successorEdge: partner === null ? 'start' : partner.edge,
    },
    hands.settingsLimitsOf(hands.readValues()),
    DEFAULT_ROW_NAME,
  )
  if (!made.ok) return null
  // WHY: FR-009 asks for the line with no exception for IC-81's toggle, so the copy draws it whatever the toggle says.
  const drawn = geometryFromLayout(
    { ...made.document.schedule, highlightBoxes: [], commentBoxes: [] },
    { ...settings, dependencyVisible: true },
    { ...layout, placements: [fromPlaced, successorPlaced] },
    regions,
    emptySelection(),
  )
  return drawn.dependencies[0] ?? null
}
