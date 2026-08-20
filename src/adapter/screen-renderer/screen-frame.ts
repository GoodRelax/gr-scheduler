// ScreenRenderer -- internal unit of the component.
//
// @unit      UF-61   (docs/spec/05-07-design.md, table T-075)
// @component ScreenRenderer, layer Adapter (table T-062)
// @purity    pure
//
// UF-61 fills one member of ScreenView -- `frame` -- and reads none of the
// others. Its row of table T-075 names FR-051, FR-052 and FR-071, and the
// signature published here is the one the "nine unit contracts" section of
// screen-renderer.ts fixes.
//
// ⭐ WHAT THIS UNIT ADDS TO ScreenRegions. The rectangles of the parts
// themselves are PI-35's and are not repeated. What is decided here is what
// sits BETWEEN them: the bands and lines at the two panel boundaries and the
// two scrollbar lanes. That is why every number below is read back off the
// rectangles this unit is handed instead of being measured again -- ⛔ chapter
// 5.3 (MUST NOT) keeps this component away from ScheduleLayout and
// ScheduleGeometry, so a second computation would have nothing to check itself
// against.
//
// ⭐ WHY THE LANE'S THICKNESS IS DERIVED RATHER THAN TAKEN. FR-051 (MUST NOT)
// forbids any setting to hold it, and BO-1 of table T-077 settles it from the
// environment at startup -- far from here, and unreachable from a `pure` unit.
// ⚠️ Adding it as an argument would put one number in two places, and two
// places part. FR-052 spells the Row Area's width out WITH the lane inside it,
// so the same arithmetic read backwards gives the lane: what FR-052 leaves on
// the Row Area's right is the lane plus `canvasPadding` (S-56).
//
// ⭐ WHY THERE ARE ALWAYS TWO BARS. SC-4 of table T-031 (MUST) draws both
// whether the content fits or not, and the rule after that table gives the
// reason -- one that came and went would change the canvas width and re-run the
// layout. So `scrollbars` has no case in which it is short of two, and the lane
// is the very width FR-052 already subtracted.
//
// ⛔ Three STOP notes below say what the specification leaves open: the
// divider's two thicknesses, which side of the gap the lane sits on, and the
// grip.

import type { DocumentSettings } from '../../entity/document-model/document-settings/document-settings'
import type { ScreenState } from '../../entity/document-model/screen-state/screen-state'
import type {
  ScreenRect,
  ScreenRegions,
} from '../../entity/layout-engine/screen-regions/screen-regions'
import type { PanelDivider, ScreenFrame, Scrollbar } from './screen-renderer'

/**
 * The boundary of one panel: the line EP-9 of table T-076 keeps in the export
 * and the band FR-052 has the person drag.
 *
 * ⛔ FR-051 (MUST NOT) is about the LAYOUT: the band takes no width from the
 * `Row Area`. It cannot here, whatever its size -- the Row Area's rectangle is
 * handed in already settled and nothing in this file feeds back into it. What
 * the requirement forbids is a band that widens the arithmetic, which is why
 * the band is placed rather than allowed for.
 *
 * STOP -- ⛔ NOT DECIDED BY THE SPECIFICATION: how wide the band is, and how
 * thick the line is. Looked in FR-051 and FR-052 (both state where the boundary
 * is and what a drag does, neither gives it a size), in table T-206, which holds
 * every grab margin that HAS been settled (S-90 to S-93) and has no row for this
 * one, in table T-023d, which counts the grab areas and does not list it, in
 * tables T-201 / T-203 / T-212, and -- for the line -- in EP-9 of table T-076,
 * which makes it the same one line as `Group Grid Lines` (U-18) and ⛔ forbids
 * a new settings key for it, while FR-042, FR-089 and S-68 give that line a
 * rule, a colour and a visibility and never a width. Chose the boundary segment
 * itself for both: zero width is the one value that cannot claim room no row
 * grants, it keeps the pair honest about being the SAME boundary, and it leaves
 * the stroke to the surface -- which EP-9 has already tied to U-18's.
 *
 * @purity pure
 */
function dividerAt(
  panel: PanelDivider['panel'],
  panelBox: ScreenRect,
  boundaryX: number,
): PanelDivider {
  const boundary: ScreenRect = { x: boundaryX, y: panelBox.y, width: 0, height: panelBox.height }
  return { panel, band: boundary, line: boundary }
}

/**
 * One lane and its grip.
 *
 * STOP -- ⛔ NOT DECIDED BY THE SPECIFICATION: how long the grip is and where in
 * the lane it sits. Looked in SC-4 of table T-031 (it keeps the bar drawn
 * "fitted or not" and says nothing of the grip), in FR-051 and FR-037, and in
 * table T-203, whose S-77 and S-78 hold the display position as a date and a row
 * id rather than as a fraction -- and neither reaches this function. ⛔ The
 * numbers a grip needs are how much there is against how much is shown, and
 * those are ScheduleLayout's, which chapter 5.3 (MUST NOT) forbids this
 * component to read. Chose the grip that fills its lane: that is exactly the
 * "everything fits" state SC-4 names, and it is the only one that claims no
 * display position the arguments do not carry.
 *
 * @purity pure
 */
function scrollbarIn(axis: Scrollbar['axis'], track: ScreenRect): Scrollbar {
  return { axis, track, thumb: track }
}

/**
 * How the screen is carved up around the schedule, for one frame.
 *
 * ⚠️ BOTH BOUNDARIES ARE DESCRIBED EVERY FRAME, the `Properties Panel`'s
 * included while the panel is closed. Whether it is open is
 * `ScreenSession.propertiesShowing`, which UF-64 is handed and this unit is not,
 * and ScreenRegions gives the panel a rectangle either way. The order is
 * FR-052's own -- the row title panel, then the properties panel -- and the
 * scrollbars are in SC-4's, which writes the horizontal one first.
 *
 * STOP -- ⛔ NOT DECIDED BY THE SPECIFICATION: which of the two strips the Row
 * Area gives up on its right -- the lane or `canvasPadding` (S-56) -- touches
 * it. Looked in FR-051, FR-052, U-50 and table T-031: FR-052 subtracts both in
 * one expression and fixes no order between them. Chose the lane against the Row
 * Area, because FR-051 (MUST) has the bar take its place FROM the Row Area, and
 * a lane held off by the padding would be sitting in the canvas's margin
 * instead. The same reading puts the horizontal lane against the Row Area's
 * foot, where U-50's height leaves the matching gap.
 *
 * @purity pure
 */
export function screenFrameFromRegions(
  regions: ScreenRegions,
  settings: DocumentSettings,
  state: ScreenState,
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
    // S-99f, carried across. FR-071 leaves by the entry it entered by, so
    // nothing here decides it.
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
      scrollbarIn('horizontal', horizontalTrack),
      scrollbarIn('vertical', verticalTrack),
    ],
  }
}
