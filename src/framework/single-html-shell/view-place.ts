// SingleHtmlShell frame loop -- decides the view place (OP-10): the stored place, else the fit (FR-055) solved once and held.
// @unit      UF-161  (docs/spec/05-07-design.md, table T-075)
// @component SingleHtmlShell, layer Framework (table T-062)
// @purity    non-pure

import type { Document } from '../../entity/document-model/document/document'
import type { DocumentSettings } from '../../entity/document-model/document-settings/document-settings'
import { calendarDaysBetween, dayOf, textOfDayStart } from '../../entity/document-model/schedule/schedule'
import { dateAtX, fitZoom, timeAxisOf } from '../../entity/layout-engine/schedule-layout/schedule-layout'
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

// TRAP: input-command-translator.ts names the same half of OP-10's condition in namesAPlace; change both together.
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

/** @purity pure */
function firstCoveredDayOf(held: Document): string | null {
  const covered = held.schedule.tasks
    .flatMap((one) => [one.start, one.actualStart])
    .filter((one): one is string => one !== null)
    .sort()
  return covered[0] ?? null
}

/** @purity pure */
function firstRowIdOf(held: Document): string | null {
  const firstRow = [...held.schedule.taskGroups].sort((a, b) => a.order - b.order)[0]
  return firstRow === undefined ? null : firstRow.id
}

type ScrollPlace = Pick<ViewPlace, 'scrollDate' | 'scrollGroupId' | 'scrollDayOffset' | 'scrollGroupOffset'>

const HALF = 2

// see S-534
/** @purity pure */
function startupMarginPx(): number {
  return (
    NOT_STORED_STARTUP_MARGIN_TERMS['S-134'] / HALF + NOT_STORED_STARTUP_MARGIN_TERMS['S-268'] / HALF
  )
}

// see OP-10, S-534, S-177
// WHY: the day under the Row Area's left edge and the fraction into it, S-534 left of the first day.
/** @purity pure */
function dayLeftOfFirstDay(
  firstDay: string,
  settings: DocumentSettings,
  regions: ScreenRegions,
): Pick<ScrollPlace, 'scrollDate' | 'scrollDayOffset'> {
  const first = dayOf(firstDay)
  const axis = timeAxisOf({ ...settings, scrollDate: firstDay, scrollDayOffset: 0 }, regions)
  const edge = first === null ? null : dateAtX(axis, axis.originX - startupMarginPx())
  if (first === null || edge === null) return { scrollDate: firstDay, scrollDayOffset: 0 }
  const offset = calendarDaysBetween(edge, first) - startupMarginPx() / axis.pxPerDay
  return { scrollDate: textOfDayStart(edge), scrollDayOffset: offset > 0 && offset < 1 ? offset : 0 }
}

// see OP-10, FR-024
/** @purity pure */
function startupTemplatePlaceOf(
  held: Document,
  settings: DocumentSettings,
  regions: ScreenRegions,
): ScrollPlace | null {
  const firstDay = firstCoveredDayOf(held)
  const firstRowId = firstRowIdOf(held)
  if (firstDay === null || firstRowId === null) return null
  return { ...dayLeftOfFirstDay(firstDay, settings, regions), scrollGroupId: firstRowId, scrollGroupOffset: 0 }
}

// WHY: OP-10 puts the place on the written document alone; the open one keeps its null place.
/** @purity pure */
function writtenDocumentOf(document: Document, fromTemplate: boolean, regions: ScreenRegions | null): Document {
  if (!fromTemplate || regions === null) return document
  if (storedNamesAPlace(document, document.documentSettings)) return document
  const place = startupTemplatePlaceOf(document, document.documentSettings, regions)
  return place === null ? document : { ...document, documentSettings: { ...document.documentSettings, ...place } }
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

  const templatePlace = fromTemplate ? startupTemplatePlaceOf(held, stored, regions) : null
  if (templatePlace !== null) return { settings: { ...stored, ...templatePlace }, isAtStoredZoom: true }

  const pinned: DocumentSettings = {
    ...stored,
    // TRAP: never null; dateAtX answers null without an origin day and OP-10 would ask again forever.
    scrollDate: firstCoveredDayOf(held) ?? stored.scrollDate ?? runDay,
    scrollGroupId: firstRowIdOf(held) ?? stored.scrollGroupId,
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
  // WHY: not read off the template stamp, which the first write turns into user; the view would jump.
  let fromStartupTemplate = startedFromTemplate === true
  let regionsLastSeated: ScreenRegions | null = null
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
    regionsLastSeated = regions
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

  const documentToWrite = (document: Document): Document =>
    writtenDocumentOf(document, fromStartupTemplate, regionsLastSeated)
  return { viewSettingsOnce, documentToWrite, forgetFitForNoPlace, leaveStartupTemplate }
}

export type HeldViewPlace = ReturnType<typeof heldViewPlaceOf>

// <generated -- do not edit by hand>
// Single source of truth:
//   docs/spec/_source/settings.json (table T-206)
// Rebuild: npm run gen   ||   npm run gen:check fails on drift.
// see T-206
const NOT_STORED_STARTUP_MARGIN_TERMS: {
  readonly 'S-134': number
  readonly 'S-268': number
} = {
  'S-134': 8,
  'S-268': 8,
}
// </generated>
