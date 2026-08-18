// SingleHtmlShell -- the frame loop.
//
// @unit      UF-48   (docs/spec/05-07-design.md, table T-075)
// @component SingleHtmlShell, layer Framework (table T-062)
// @purity    non-pure
//
// Holds the current values, watches what table T-078 says may wake a frame,
// and computes table T-068 once at the head of each one before handing the
// result to everyone who draws (ADR-001).
//
// ⭐ Why this is not in single-html-shell.ts: table T-063 UT-6. Booting is what
// FR-067 and FR-065 constrain; running frames is what LY-5 and ADR-001
// constrain. Two reasons to change, so two files.
//
// ⛔ This is the ONLY layer allowed to hold a current value (table T-060
// LY-5). Everything inward takes what it needs as an argument.

import type { Document } from '../../entity/document-model/document/document'
import type { DocumentSettings } from '../../entity/document-model/document-settings/document-settings'
import { emptySelection } from '../../entity/document-model/selection/selection'
import type { Selection } from '../../entity/document-model/selection/selection'
import {
  geometryFromLayout,
  type ScheduleGeometry,
} from '../../entity/layout-engine/schedule-geometry/schedule-geometry'
import {
  fitZoom,
  layoutFromSchedule,
  type ScheduleLayout,
} from '../../entity/layout-engine/schedule-layout/schedule-layout'
import {
  regionsFromScreen,
  type ScreenEnvironment,
  type ScreenRegions,
} from '../../entity/layout-engine/screen-regions/screen-regions'
import { svgFromSchedule, type SvgSurface } from '../../adapter/svg-renderer/svg-renderer'

/**
 * What the shell measured about the window this frame. `regionsFromScreen`
 * takes it as an argument because FR-051 forbids a setting to hold the last
 * two -- they differ from one machine to the next.
 */
export interface FrameEnvironment {
  readonly width: number
  readonly height: number
  readonly appHeaderHeight: number
  readonly scrollbarThickness: number
}

/** What one frame computed, kept together so nothing recomputes it. */
export interface FrameValues {
  readonly regions: ScreenRegions
  readonly layout: ScheduleLayout
  readonly geometry: ScheduleGeometry
}

export interface FrameLoop {
  /** FT-2: the current value was replaced, so a frame is owed. */
  replaceDocument(next: Document): void
  /** FT-3: the window changed size. */
  resize(env: FrameEnvironment): void
  /** What the last frame computed, for a caller that needs to ask. */
  current(): FrameValues | null
  document(): Document
}

/**
 * OP-10 of table T-024a -- what to draw when the stored place is `null` or
 * points at a row that is gone.
 *
 * ⛔ `null` is not a missing value, it is "the person has not chosen a place
 * yet", and the row says to show what FR-055's fit-to-screen would choose
 * (MUST). ⚠️ It also forbids HF-8 here (MUST NOT), so the collapse state
 * FR-004 saved is left exactly as it is -- this only decides the view.
 *
 * ⭐ The document is NOT edited. OP-10 sits on the reading side ("読む側の規則
 * は表 T-024a の `OP-10` が持つ", FR-051), so the stored settings keep saying
 * `null` and every frame decides again.
 *
 * ⚠️ Runs table T-068 at most twice, which is what the rule after that table
 * allows: once to measure, once at the chosen zoom. ⛔ A third pass is
 * forbidden -- the level of detail can oscillate and the loop would not be
 * guaranteed to end.
 *
 * @purity pure
 */
function viewSettings(
  held: Document,
  stored: DocumentSettings,
  regions: ScreenRegions,
): DocumentSettings {
  const groupIds = new Set(held.schedule.taskGroups.map((one) => one.id))
  const placed = stored.scrollDate !== null && groupIds.has(stored.scrollGroupId ?? '')
  if (placed) return stored

  // Where the fit starts from: the earliest day anything is drawn on, and the
  // first row in the document's own order. Nothing in table T-064 publishes
  // this, so it is decided here -- and it is a view, not a stored value.
  const starts = held.schedule.tasks
    .map((one) => one.start)
    .filter((one): one is string => one !== null)
    .sort()
  const firstRow = [...held.schedule.taskGroups].sort((a, b) => a.order - b.order)[0]
  const anchored: DocumentSettings = {
    ...stored,
    scrollDate: starts[0] ?? held.schedule.project.startDate,
    scrollGroupId: firstRow === undefined ? stored.scrollGroupId : firstRow.id,
  }

  const measured = layoutFromSchedule(held.schedule, anchored, regions)
  const fitted = fitZoom(measured, anchored, regions)
  return { ...anchored, zoomX: fitted.zoomX, zoomY: fitted.zoomY }
}

/**
 * ADR-001 -- the screen rectangles, the layout and the geometry are computed
 * ONCE at the head of a frame and handed out.
 *
 * ⚠️ Four paths need the layout, and MN-6 measured what happens without this:
 * table T-068's eleven stages run four times for one pointer move, which does
 * not fit the budget NFR-002 and NFR-003 set.
 *
 * @purity non-pure
 */
export function frameLoop(surface: SvgSurface, first: Document, env: FrameEnvironment): FrameLoop {
  let document = first
  let environment = env
  let selection: Selection = emptySelection()
  let values: FrameValues | null = null
  let owed = false

  // CA-2: invalidation happens at the head of a frame, and nothing is rebuilt
  // again for the rest of it. NFR-010 means a frame with no trigger never runs
  // at all, so there is no idle path to guard against.
  function runFrame(): void {
    owed = false
    const stored = document.documentSettings
    const environmentForRegions: ScreenEnvironment = {
      width: environment.width,
      height: environment.height,
      appHeaderHeight: environment.appHeaderHeight,
      scrollbarThickness: environment.scrollbarThickness,
    }
    // BO-1, then BO-3, then BO-4, in the order table T-077 fixes (MUST).
    const regions = regionsFromScreen(environmentForRegions, stored)
    const settings = viewSettings(document, stored, regions)
    const layout = layoutFromSchedule(document.schedule, settings, regions)
    const geometry = geometryFromLayout(document.schedule, settings, layout, regions)
    values = { regions, layout, geometry }
    surface.showSvg(
      svgFromSchedule(document.schedule, settings, geometry, regions, selection),
    )
  }

  function ask(): void {
    if (owed) return
    owed = true
    // ⚠️ A frame is asked for, never run inline: two triggers landing in one
    // task would otherwise run table T-068 twice for one painted frame.
    const raf = globalThis.requestAnimationFrame
    if (typeof raf === 'function') raf(() => runFrame())
    else runFrame()
  }

  runFrame() // BO-5 -- the first frame, which table T-078's note excludes from FT-1.

  return {
    replaceDocument(next: Document): void {
      document = next
      ask()
    },
    resize(next: FrameEnvironment): void {
      environment = next
      ask()
    },
    current: () => values,
    document: () => document,
  }
}
