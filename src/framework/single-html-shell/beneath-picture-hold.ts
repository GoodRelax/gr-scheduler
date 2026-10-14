// SingleHtmlShell -- holds the picture beneath while what it reads is the same (table T-071 CA-1, carry-over 3).
// @unit      UF-206  (docs/spec/05-07-design.md, table T-075)
// @component SingleHtmlShell, layer Framework (table T-062)
// @purity    non-pure

import type { DocumentSettings } from '../../entity/document-model/document-settings/document-settings'
import type { Schedule } from '../../entity/document-model/schedule/schedule'
import type { Selection } from '../../entity/document-model/selection/selection'
import type { ScheduleGeometry } from '../../entity/layout-engine/schedule-geometry/schedule-geometry'
import type { ScheduleLayout } from '../../entity/layout-engine/schedule-layout/schedule-layout'
import type { ScreenRegions } from '../../entity/layout-engine/screen-regions/screen-regions'
import {
  beneathPointerReadingOf,
  svgFromSchedule,
  type BeneathPointerReading,
  type ViewerValues,
} from '../../adapter/svg-renderer/svg-renderer'
import { isSameRecord, isSameScreenRegions } from './frame-loop'

type BeneathPictureInputs = Parameters<typeof svgFromSchedule>

// see CA-1
interface BeneathPictureKey {
  readonly schedule: Schedule
  readonly layout: ScheduleLayout
  readonly geometry: ScheduleGeometry
  readonly selection: Selection
  readonly tentativeLink: BeneathPictureInputs[13]
  readonly viewer: { readonly [Read in 'themePreference' | 'guideCursorMode' | 'landingMarkDisplayState']: ViewerValues[Read] }
  readonly follow: BeneathPictureInputs[8]
  readonly watermark: BeneathPictureInputs[12]
  readonly weekdayWords: BeneathPictureInputs[9]
  readonly settings: DocumentSettings
  readonly regions: ScreenRegions
  readonly reading: BeneathPointerReading
}

interface HeldBeneathPicture {
  readonly key: BeneathPictureKey
  readonly svg: string
}

/** @purity pure */
function isSameData(x: unknown, y: unknown): boolean {
  if (Object.is(x, y)) return true
  if (typeof x !== 'object' || typeof y !== 'object' || x === null || y === null) return false
  return Array.isArray(x) === Array.isArray(y) && isSameRecord(x, y, isSameData)
}

// see CA-1
// TRAP: no pointer field: the pointer moves every frame of a Range Selection, so a key holding it never hits (CA-1).
/** @purity pure */
function beneathPictureKeyOf(inputs: BeneathPictureInputs): BeneathPictureKey {
  const [schedule, settings, layout, geometry, regions, selection, , viewer, follow, weekdayWords, pointer, hovered,
    watermark, tentativeLink] = inputs
  const { themePreference, guideCursorMode, landingMarkDisplayState } = viewer
  return {
    schedule, layout, geometry, selection, tentativeLink,
    viewer: { themePreference, guideCursorMode, landingMarkDisplayState },
    follow, watermark, weekdayWords, settings, regions,
    reading: beneathPointerReadingOf(geometry, regions, viewer, pointer ?? null, hovered ?? null),
  }
}

// see CA-1
// WHY: the settings, the regions and the small values are new objects every frame; compared by identity, nothing is ever held.
/** @purity pure */
function isSameBeneathPictureKey(held: BeneathPictureKey, now: BeneathPictureKey): boolean {
  return (
    held.schedule === now.schedule &&
    held.layout === now.layout &&
    held.geometry === now.geometry &&
    held.selection === now.selection &&
    held.tentativeLink === now.tentativeLink &&
    isSameRecord(held.viewer, now.viewer, isSameData) &&
    isSameData(held.follow, now.follow) &&
    isSameData(held.watermark, now.watermark) &&
    isSameData(held.weekdayWords, now.weekdayWords) &&
    isSameRecord(held.settings, now.settings) &&
    isSameScreenRegions(held.regions, now.regions) &&
    isSameData(held.reading, now.reading)
  )
}

// see CA-1, IF-1, FR-080
/** @purity non-pure */
export function beneathPictureHoldOf(): (...inputs: BeneathPictureInputs) => string {
  let held: HeldBeneathPicture | null = null
  return (...inputs) => {
    const [, , , , , , picture] = inputs
    if (picture !== 'screen') return svgFromSchedule(...inputs)
    const key = beneathPictureKeyOf(inputs)
    if (held !== null && isSameBeneathPictureKey(held.key, key)) return held.svg
    const svg = svgFromSchedule(...inputs)
    held = { key, svg }
    return svg
  }
}
