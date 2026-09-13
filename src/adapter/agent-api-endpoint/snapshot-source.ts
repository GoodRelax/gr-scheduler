// The SnapshotSource seam the Agent API reads one consistent snapshot through.
// @unit      UF-29   (docs/spec/05-07-design.md, table T-075)
// @component AgentApiEndpoint, layer Adapter (table T-062)
// @purity    n/a
// @seam      SnapshotSource, implemented in another layer (LR-5)

import type { Document } from '../../entity/document-model/document/document'
import type { DialogueLog } from '../../entity/document-model/dialogue-log/dialogue-log'
import type { Selection } from '../../entity/document-model/selection/selection'
import type { ScheduleLayout } from '../../entity/layout-engine/schedule-layout/schedule-layout'
import type { PlanInput, SettingsLimits } from '../../use-case/apply-document-change/apply-document-change'
import type { svgFromSchedule } from '../svg-renderer/svg-renderer'
import type { exportSvg } from '../image-exporter/image-exporter'

type PictureArguments = Parameters<typeof svgFromSchedule>

type ExportArguments = Parameters<typeof exportSvg>

export interface FrameSnapshot {
  readonly layout: ScheduleLayout
  readonly geometry: PictureArguments[3]
  readonly regions: PictureArguments[4]
}

export interface AgentSnapshot {
  readonly document: Document
  readonly selection: Selection
  readonly dialogue: DialogueLog
  readonly frame: FrameSnapshot | null
  readonly exportScene: ExportArguments[0] | null
  readonly isGestureInFlight: boolean
  readonly isEditingInPlace: boolean
  readonly historyLimits: PlanInput['historyLimits']
  readonly settingsLimits: SettingsLimits
  readonly readAt: string
}

// see IF-7
export interface SnapshotSource {
  /** @purity semi-pure-b */
  readSnapshot(): AgentSnapshot
}
