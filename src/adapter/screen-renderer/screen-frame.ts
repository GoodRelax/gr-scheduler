// ScreenRenderer -- the `frame` member of ScreenView: the panel dividers and the
// two scrollbar lanes that sit between the rectangles ScreenRegions (PI-35) settled.
//
// @unit      UF-61   (docs/spec/05-07-design.md, table T-075)
// @component ScreenRenderer, layer Adapter (table T-062)
// @purity    pure
//
// ⚠️ PART of this file is generated. The marked region at the bottom -- search
// for NOT_STORED_PANEL_DIVIDER_SIZES, and the scrollbar constant beside it --
// comes from
// docs/spec/_source/settings.json (table T-206) and is overwritten by
// `npm run gen`; `npm run gen:check` fails if it has drifted. Everything above
// the marker is hand written. Do not edit by hand inside that region: edit the
// manuscript instead.
// ⛔ This note does NOT quote the marker itself -- writing the opening marker in
// a comment makes the generator treat the comment as the region and inject the
// block into the middle of it (the mark item-hit-area.ts carries for the same
// reason). The marker must occur exactly once per file.
//
// Every number is read back off the rectangles handed in rather than measured
// again: this component has no edge to ScheduleLayout or ScheduleGeometry
// (chapter 5.3), so a second computation would have nothing to check itself
// against. Only `scrollExtent` is read off `session` (GR-21 of table T-023d).
//
// The lane's thickness is derived, not an argument: BO-1 of table T-077 settles
// it at startup (FR-051), and FR-052's Row Area width read backwards gives it --
// the gap right of the Row Area is the lane plus `canvasPadding` (S-56). An
// argument would put one number in two places.

import type { DocumentSettings } from '../../entity/document-model/document-settings/document-settings'
import type { ScreenState } from '../../entity/document-model/screen-state/screen-state'
import type {
  ScreenRect,
  ScreenRegions,
} from '../../entity/layout-engine/screen-regions/screen-regions'
// EP-9's one place for the rule's thickness, through SvgRenderer's public entry
// (LR-2). No cycle: SvgRenderer imports no other adapter.
import { GROUP_GRID_LINE_WIDTH_PX } from '../svg-renderer/svg-renderer'
import type {
  PanelDivider,
  ScreenFrame,
  ScreenSession,
  Scrollbar,
} from './screen-renderer'

/**
 * The boundary of one panel: the line EP-9 of table T-076 keeps in the export
 * and the band FR-052 has the person drag.
 *
 * The band (S-134) is centred over the boundary line, so it takes no width from
 * the Row Area (FR-051). The line's thickness is `GROUP_GRID_LINE_WIDTH_PX`
 * (EP-9): the screen and the export both size the line from this member, so no
 * number is written here.
 *
 * @purity pure
 */
function dividerAt(
  panel: PanelDivider['panel'],
  panelBox: ScreenRect,
  boundaryX: number,
): PanelDivider {
  const bandWidth = NOT_STORED_PANEL_DIVIDER_SIZES['S-134']
  return {
    panel,
    band: {
      x: boundaryX - bandWidth / 2,
      y: panelBox.y,
      width: bandWidth,
      height: panelBox.height,
    },
    line: {
      x: boundaryX,
      y: panelBox.y,
      width: GROUP_GRID_LINE_WIDTH_PX,
      height: panelBox.height,
    },
  }
}

/**
 * One lane and its grip, per GR-21 of table T-023d: length and start are the
 * visible / whole fraction on the same denominator, the length floored at S-205.
 *
 * - The whole and the offset arrive on `ScreenSession.scrollExtent`: this
 *   component may not measure ScheduleLayout again (ADR-001), and the layout's
 *   rows arrive already slid.
 * - Sideways the visible range is the lane's length. ⚠️ Downwards it is
 *   `scrollExtent.visibleHeight`: the pinned band (FR-098) sits inside the Row
 *   Area, so the lane's height would grow the grip as rows are pinned.
 * - ⛔ The floor is S-205, not the lane's thickness, which is usually larger and
 *   would lengthen the grip past its fraction where the host's bars are wide.
 *   S-205 is generated into this file and into frame-loop.ts because an Adapter
 *   may not import the Framework file (chapter 5.3).
 *
 * @purity pure
 */
function scrollbarIn(
  axis: Scrollbar['axis'],
  track: ScreenRect,
  visible: number,
  whole: number,
  offset: number,
): Scrollbar {
  const along = axis === 'horizontal' ? track.width : track.height
  // At most one: SC-4 draws the bar even when everything fits, and a share above
  // one would run the grip past the end of its lane.
  const share = whole > 0 ? Math.min(1, visible / whole) : 1
  // ⚠️ The floor is held to the lane too, or a short lane would carry a grip
  // hanging out of it.
  const least = Math.min(along, NOT_STORED_SCROLLBAR_SIZES['S-205'])
  const length = Math.max(least, along * share)
  // ⛔ Held inside the lane at both ends: a grip lengthened to S-205 is longer
  // than its share, so the unclamped start would push it past the far end.
  const start = Math.max(0, Math.min(along - length, whole > 0 ? (along * offset) / whole : 0))
  return {
    axis,
    track,
    thumb:
      axis === 'horizontal'
        ? { x: track.x + start, y: track.y, width: length, height: track.height }
        : { x: track.x, y: track.y + start, width: track.width, height: length },
  }
}

/**
 * How the screen is carved up around the schedule, for one frame.
 *
 * Both dividers are built every frame, the Properties Panel's included while it
 * is closed: ScreenRegions gives it a rectangle either way, and UF-64 decides
 * whether it shows. Dividers follow FR-052's order, scrollbars SC-4's.
 *
 * STOP -- ⛔ NOT DECIDED BY THE SPECIFICATION: whether the lane or
 * `canvasPadding` (S-56) sits against the Row Area's right. Looked in FR-051,
 * FR-052, U-50 and table T-031: FR-052 subtracts both and fixes no order. Chose
 * the lane against the Row Area, because FR-051 (MUST) has the bar take its
 * place from the Row Area; the horizontal lane likewise sits at its foot.
 *
 * @purity pure
 */
export function screenFrameFromRegions(
  regions: ScreenRegions,
  settings: DocumentSettings,
  state: ScreenState,
  session: ScreenSession,
): ScreenFrame {
  const rowArea = regions.rowArea

  // FR-052's arithmetic, read backwards: what it leaves between the Row Area and
  // the Properties Panel is the lane plus the padding.
  const gapRightOfRowArea = regions.propertiesPanel.x - (rowArea.x + rowArea.width)
  // ⚠️ Regions this unit did not build could cross; a lane is never thinner
  // than nothing, and a negative one would put the grip outside the screen.
  const scrollbarThickness = Math.max(0, gapRightOfRowArea - settings.canvasPadding)

  const horizontalTrack: ScreenRect = {
    x: rowArea.x,
    y: rowArea.y + rowArea.height,
    width: rowArea.width,
    height: scrollbarThickness,
  }
  const verticalTrack: ScreenRect = {
    x: rowArea.x + rowArea.width,
    y: rowArea.y,
    width: scrollbarThickness,
    height: rowArea.height,
  }

  return {
    // S-99f.
    isFullScreen: state.fullScreen,
    dividers: [
      dividerAt(
        'rowTitlePanel',
        regions.rowTitlePanel,
        regions.rowTitlePanel.x + regions.rowTitlePanel.width,
      ),
      dividerAt('propertiesPanel', regions.propertiesPanel, regions.propertiesPanel.x),
    ],
    scrollbars: [
      // Downwards the visible range is the scrolling remainder; see `scrollbarIn`.
      scrollbarIn(
        'horizontal',
        horizontalTrack,
        horizontalTrack.width,
        session.scrollExtent.contentWidth,
        session.scrollExtent.offsetX ?? 0,
      ),
      scrollbarIn(
        'vertical',
        verticalTrack,
        session.scrollExtent.visibleHeight,
        session.scrollExtent.contentHeight,
        session.scrollExtent.offsetY ?? 0,
      ),
    ],
  }
}

// <generated -- do not edit by hand>
// Single source of truth:
//   docs/spec/_source/settings.json (table T-206)
// Rebuild: npm run gen   ||   npm run gen:check fails on drift.
/**
 * The values table T-206 states that this unit needs, by row ID.
 *
 * ⭐ Table T-206 holds what the document does NOT store, so these
 * are not document settings and are not in SETTINGS_DEFAULTS. They
 * are reached by row ID because most rows of that table have no key
 * column -- the row ID is the specification's own name for them.
 *
 * ⚠️ This unit reads the row where it stands instead of being handed
 * it: FR-051 (MUST NOT) forbids a setting to hold what these rows
 * bound, so there is no door to pass one through however many
 * arguments the contract in screen-renderer.ts fixes. ⭐ Where a row
 * stands in two units, Chapter 5.3 is the reason -- an Adapter may
 * not import the Framework file it also stands in, so the one
 * manuscript row is generated into both. ⛔ It is still not a
 * document setting and must not become one.
 */
export const NOT_STORED_PANEL_DIVIDER_SIZES: {
  /** S-134, in px */
  readonly 'S-134': number
} = {
  'S-134': 8,
}

/**
 * The values table T-206 states that this unit needs, by row ID.
 *
 * ⭐ Table T-206 holds what the document does NOT store, so these
 * are not document settings and are not in SETTINGS_DEFAULTS. They
 * are reached by row ID because most rows of that table have no key
 * column -- the row ID is the specification's own name for them.
 *
 * ⚠️ This unit reads the row where it stands instead of being handed
 * it: FR-051 (MUST NOT) forbids a setting to hold what these rows
 * bound, so there is no door to pass one through however many
 * arguments the contract in screen-renderer.ts fixes. ⭐ Where a row
 * stands in two units, Chapter 5.3 is the reason -- an Adapter may
 * not import the Framework file it also stands in, so the one
 * manuscript row is generated into both. ⛔ It is still not a
 * document setting and must not become one.
 */
export const NOT_STORED_SCROLLBAR_SIZES: {
  /** S-205, in px */
  readonly 'S-205': number
} = {
  'S-205': 8,
}
// </generated>
