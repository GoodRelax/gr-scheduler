// SingleHtmlShell frame loop -- decides the view place (OP-10): the stored place, else the fit (FR-055) solved once and held.
// @unit      UF-161  (docs/spec/05-07-design.md, table T-075)
// @component SingleHtmlShell, layer Framework (table T-062)
// @purity    non-pure

import type { Document } from '../../entity/document-model/document/document'
import type { DocumentSettings } from '../../entity/document-model/document-settings/document-settings'
import { fitZoom } from '../../entity/layout-engine/schedule-layout/schedule-layout'
import type { ScreenRegions } from '../../entity/layout-engine/screen-regions/screen-regions'
import { NOT_STORED_ZOOM_BOUNDS } from '../../use-case/edit-document/edit-document'
import { NOT_STORED_ZOOM_STEP } from '../../adapter/input-command-translator/input-command-translator'
import { isSameEnvironment, readToday, type FrameEnvironment, type FrameLoopHands } from './frame-loop'

interface ViewSettings {
  readonly settings: DocumentSettings
  readonly isAtStoredZoom: boolean
}

type ViewPlace = Pick<
  DocumentSettings,
  'zoomX' | 'zoomY' | 'scrollDate' | 'scrollGroupId' | 'scrollDayOffset' | 'scrollGroupOffset'
>

// TRAP: input-command-translator.ts names the same half of OP-10's condition in
// namesAPlace; change both together.
// see OP-10
/** @purity pure */
function storedNamesAPlace(held: Document, stored: ViewPlace): boolean {
  if (stored.scrollDate === null) return false
  return held.schedule.taskGroups.some((one) => one.id === stored.scrollGroupId)
}

// see OP-10
/** @purity pure */
function viewPlaceOf(settings: DocumentSettings): ViewPlace {
  return {
    zoomX: settings.zoomX,
    zoomY: settings.zoomY,
    scrollDate: settings.scrollDate,
    scrollGroupId: settings.scrollGroupId,
    scrollDayOffset: settings.scrollDayOffset,
    scrollGroupOffset: settings.scrollGroupOffset,
  }
}

// see OP-10, FR-055
/** @purity pure */
function viewSettings(
  held: Document,
  stored: DocumentSettings,
  regions: ScreenRegions,
  fromTemplate: boolean,
  runDay: string,
  rowControlsHeightPx: number | undefined,
): ViewSettings {
  if (storedNamesAPlace(held, stored)) return { settings: stored, isAtStoredZoom: true }

  const covered = held.schedule.tasks
    .flatMap((one) => [one.start, one.actualStart])
    .filter((one): one is string => one !== null)
    .sort()
  const firstRow = [...held.schedule.taskGroups].sort((a, b) => a.order - b.order)[0]
  const pinned: DocumentSettings = {
    ...stored,
    // TRAP: never null; dateAtX answers null without an origin day and OP-10 would
    // ask again forever.
    scrollDate: covered[0] ?? stored.scrollDate ?? runDay,
    scrollGroupId: firstRow === undefined ? stored.scrollGroupId : firstRow.id,
  }

  if (fromTemplate && covered.length > 0) {
    return {
      settings: { ...pinned, scrollDayOffset: 0, scrollGroupOffset: 0 },
      isAtStoredZoom: true,
    }
  }

  const fitted = fitZoom(
    held.schedule,
    pinned,
    regions,
    {
      step: NOT_STORED_ZOOM_STEP['S-96'],
      min: NOT_STORED_ZOOM_BOUNDS['S-97'],
      max: NOT_STORED_ZOOM_BOUNDS['S-98'],
    },
    rowControlsHeightPx,
  )
  return {
    settings: {
      ...pinned,
      zoomX: fitted.zoomX,
      zoomY: fitted.zoomY,
      scrollDate: fitted.scrollDate,
      scrollGroupId: fitted.scrollGroupId,
      scrollDayOffset: fitted.scrollDayOffset,
      scrollGroupOffset: 0,
    },
    isAtStoredZoom: false,
  }
}

export type ViewPlaceHands = Pick<FrameLoopHands, 'readEnvironment'>

/** @purity non-pure */
export function heldViewPlaceOf(
  hands: ViewPlaceHands,
  startedFromTemplate: boolean | undefined,
) {
  // WHY: not read off the document's template stamp, which the first write turns into
  // user, so the view would jump to the fit on typing.
  let fromStartupTemplate = startedFromTemplate === true
  let fitHeldForNoPlace:
    | {
        readonly environment: FrameEnvironment
        readonly place: ViewPlace
        readonly isAtStoredZoom: boolean
      }
    | null = null

  // see OP-10
  /** @purity non-pure */
  function viewSettingsOnce(
    document: Document,
    stored: DocumentSettings,
    regions: ScreenRegions,
  ): ViewSettings {
    if (storedNamesAPlace(document, stored)) {
      fitHeldForNoPlace = null
      return { settings: stored, isAtStoredZoom: true }
    }
    const taken = fitHeldForNoPlace
    if (
      taken !== null &&
      isSameEnvironment(taken.environment, hands.readEnvironment()) &&
      storedNamesAPlace(document, taken.place)
    ) {
      // TRAP: the place alone is laid over; the whole held object would freeze every other
      // setting the author switches while no place is seated.
      return { settings: { ...stored, ...taken.place }, isAtStoredZoom: taken.isAtStoredZoom }
    }
    const view = viewSettings(
      document,
      stored,
      regions,
      fromStartupTemplate,
      readToday(),
      hands.readEnvironment().rowControlsHeightPx,
    )
    fitHeldForNoPlace = {
      environment: hands.readEnvironment(),
      place: viewPlaceOf(view.settings),
      isAtStoredZoom: view.isAtStoredZoom,
    }
    return view
  }

  /** @purity non-pure */
  function forgetFitForNoPlace(): void {
    fitHeldForNoPlace = null
  }

  /** @purity non-pure */
  function leaveStartupTemplate(): void {
    fromStartupTemplate = false
  }

  /** @purity non-pure */
  function returnToStartupTemplate(): void {
    fromStartupTemplate = true
  }

  return { viewSettingsOnce, forgetFitForNoPlace, leaveStartupTemplate, returnToStartupTemplate }
}

export type HeldViewPlace = ReturnType<typeof heldViewPlaceOf>
