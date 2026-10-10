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
  // WHY: optional so a snapshot built by hand need not carry it; absent or null is the stored zoom.
  readonly unstoredZoom?: Pick<Document['documentSettings'], 'zoomX' | 'zoomY'> | null
}

export interface AgentSnapshot {
  readonly document: Document
  // see HS-11, AM-15
  // WHY: the document as bytes written now carry it -- AT-140 is the time the lower line shows, never the held one's.
  readonly documentAsWritten: Document
  readonly selection: Selection
  readonly dialogue: DialogueLog
  readonly frame: FrameSnapshot | null
  readonly exportScene: ExportArguments[0] | null
  readonly isGestureInFlight: boolean
  readonly isEditingInPlace: boolean
  // see WS-2, NT-7, RS-74
  readonly isQuestionAsked: boolean
  // see WS-2, T-286
  readonly isDeliveringNotices: boolean
  readonly historyLimits: PlanInput['historyLimits']
  readonly settingsLimits: SettingsLimits
  readonly defaultTaskGroupName: PlanInput['defaultTaskGroupName']
  readonly readAt: string
  // WHY: an MSPDI export writes this as LastSaved (DV-12), which is the place's wall time, not readAt's UTC.
  readonly localReadAt: string
}

// see IF-7
export interface SnapshotSource {
  /** @purity semi-pure-b */
  readSnapshot(): AgentSnapshot
}
