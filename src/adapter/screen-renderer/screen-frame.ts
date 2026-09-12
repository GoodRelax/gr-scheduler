// ScreenRenderer -- internal unit of the component.
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
// UF-61 fills one member of ScreenView -- `frame` -- and reads none of the
// others. Its row of table T-075 names FR-051, FR-052 and FR-071, and the
// signature published here is the one the "nine unit contracts" section of
// screen-renderer.ts fixes.
// ⚠️ IT IS FOUR ARGUMENTS SINCE DFC-298 (2026-09-08), and only `scrollExtent` is
// read off the fourth: GR-21 of table T-023d sizes the scrollbar grip as a
// fraction of an extent that is ScheduleLayout's, and this component has no edge
// to reach it by. ⛔ Nothing else on `ScreenSession` is touched here -- the
// other eight units are the readers of the rest.
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
// ⛔ ONE STOP NOTE IS LEFT BELOW, and it says what is open: which side of the
// gap the lane sits on. ⭐ Nothing of the divider is open any more -- the BAND
// was closed when table T-206 gained S-134, and the LINE'S THICKNESS by EP-9 of
// table T-076 on 2026-09-07 (DFC-363), which is read from
// `GROUP_GRID_LINE_WIDTH_PX` where the divider is built.
// ⭐⭐ AND GR-21 IS CLOSED WHOLE (DFC-298, 2026-09-08). Its LENGTH is 「見えている
// 範囲 ÷ 全体」 and its START is where that range stands in the same whole; both
// halves are the row's own arithmetic, and the three numbers they need travel on
// `ScreenSession.scrollExtent`. ⚠️ The STOP that stood here for the start was
// never a rule the manuscript lacked -- it was a number the wiring did not
// carry, which is a different kind of hole and was closed by opening the door.

import type { DocumentSettings } from '../../entity/document-model/document-settings/document-settings'
import type { ScreenState } from '../../entity/document-model/screen-state/screen-state'
import type {
  ScreenRect,
  ScreenRegions,
} from '../../entity/layout-engine/screen-regions/screen-regions'
// ⭐ DFC-363: EP-9's one place for the rule's thickness. The import lands on the
// public entry of the component that draws `Group Grid Lines` (LR-2), and adds
// no cycle -- SvgRenderer imports no other adapter.
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
 * ⛔ FR-051 (MUST NOT) is about the LAYOUT: the band takes no width from the
 * `Row Area`. It cannot here, whatever its size -- the Row Area's rectangle is
 * handed in already settled and nothing in this file feeds back into it. What
 * the requirement forbids is a band that widens the arithmetic, which is why
 * the band is placed rather than allowed for.
 *
 * ⭐ THE BAND'S WIDTH IS ROW S-134 of table T-206, which the region at the foot
 * of this file carries. ⛔ This note names the ROW and not the number: a figure
 * written here a second time goes on stating the old one after the manuscript
 * moves (rule 03 section 3). The band is CENTRED on the boundary because S-134
 * lays it OVER the boundary line rather than beside it -- which is the same
 * thing the MUST NOT above asks for, and the reason the width may be spent
 * without asking the `Row Area` for any of it.
 *
 * ⭐⭐ THE LINE'S THICKNESS IS SETTLED, AND THE STOP THAT STOOD HERE IS GONE
 * (DFC-363). What it said -- that no clause sizes the line, so zero was chosen --
 * was measured true on the screen AND in the export: nothing was drawn at all.
 * EP-9 of table T-076 now says 「同じ線とは太さも同じであるということである
 * （MUST）」 and ⛔ 「太さを 0 で描いてはならない（MUST NOT）」, and it says where
 * the number lives: 「描く側は、罫の太さを 1 か所から読むこと（MUST）。番号を 2
 * か所に置いてはならない（MUST NOT）」 and 「画面と書き出しも同じ 1 か所を読む
 * こと（MUST）」.
 *
 * ⛔ SO NO NUMBER IS WRITTEN HERE. `GROUP_GRID_LINE_WIDTH_PX` is the one place,
 * and it stands in the component that draws U-18 itself (LR-2: through
 * `svg-renderer.ts`, that component's public entry). Both readers of the
 * rectangle built below -- `dom-screen-surface.ts` on the screen and
 * `image-exporter.ts` in the exported picture -- size it from this one member,
 * which is EP-9's last sentence discharged rather than restated.
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
 * One lane and its grip.
 *
 * ⭐⭐ THE GRAB IS OPEN, AND SO IS THE LENGTH (DFC-298 closed on 2026-09-08).
 * `ScreenPart.scrollbarAxis` reports a press on a lane and
 * `input-command-translator.ts` turns a drag on it into FR-051's change of the
 * display position -- measured on the shipped build, a 100px drag on each lane
 * moves the picture, and moved nothing before it.
 *
 * ⭐⭐ THE LENGTH IS GR-21's, WRITTEN OUT AND NOT CHOSEN. GR-21 of table T-023d
 * (MUST) says 「長さは、帯の長さに対する『見えている範囲 ÷ 全体』の割合とすること」
 * and (MUST) 「長さの下限を `S-205` とすること」. Both halves stand below:
 *   - 「全体」 is `ScheduleLayout`'s, which this component has no edge to and may
 *     NOT measure again (chapter 5.3, and ADR-001 runs the layout once a frame).
 *     ⭐ IT ARRIVES INSTEAD, as `ScreenSession.scrollExtent` -- the door that
 *     was missing when this note was a STOP, opened the way `rowBoxes` was.
 *     That member's own note carries why `ScreenState` and `ScreenRegions` were
 *     refuted, and why no edge was added to `_source/components.json`.
 *   - 「見えている範囲」 sideways is the lane's own length, which is the `Row
 *     Area`'s width and is already in hand. ⚠️ DOWNWARDS IT IS NOT: FR-098 puts
 *     the pinned band inside the `Row Area` and LF-14 leaves the scrolling rows
 *     the remainder, and `contentHeight` measures against that remainder -- so
 *     `scrollExtent.visibleHeight` carries it and the lane's height does not
 *     stand in for it. ⛔ Using the lane's height there would overstate the
 *     fraction by exactly the band, and grow the grip as rows are pinned.
 *
 * ⛔ NO NEW NUMBER IS MINTED. GR-21 (MUST NOT) says 「新しい設定値を立てない
 * （割合は既にある値から導ける）」, and the floor is S-205 -- the row that is
 * already the LANE'S THICKNESS floor, reused on purpose 「最小のつまみを正方形に
 * するため」. ⛔ The lane's thickness may not be substituted for it: that
 * thickness is at least S-205 and usually more, so flooring at it would make the
 * grip longer than the fraction GR-21 fixes wherever the host's bars are wider.
 * ⭐ S-205 reaches this Adapter through the generated block at the foot of this
 * file. It stands in `frame-loop.ts` too, and chapter 5.3 is why it stands
 * twice rather than being imported.
 *
 * ⭐⭐ AND THE START IS GR-21's TOO, WHICH IS THE HALF THE STOP HERE USED TO
 * HOLD (DFC-298, closed 2026-09-08). That row calls the grip 「帯の中の、いま見え
 * ている範囲を表す区間」, and a 区間 has a start as well as a length -- so the
 * same 「見えている範囲 ÷ 全体」 that fixes the length fixes where the interval
 * begins, measured with the SAME denominator. ⛔ What was missing was never the
 * rule but the number: `ScheduleLayout` publishes no offset -- `rows` and
 * `placements` arrive ALREADY slid while `contentWidth` / `contentHeight` /
 * `contentX0` are measured BEFORE the slide, and S-77 / S-78 / S-176 / S-177 of
 * table T-203 name the place in DAYS and ROWS, which this unit has neither a
 * calendar nor a row list to turn into a fraction. ⭐ IT ARRIVES INSTEAD, as
 * `ScreenSession.scrollExtent`'s `offsetX` / `offsetY`, read back off the
 * layout by the shell exactly as the two extents beside them are.
 * ⛔ NO NEW SETTINGS ROW FOR IT EITHER, for the reason the paragraph above
 * gives: a fraction of numbers that already exist.
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
  // GR-21 (MUST): 「見えている範囲 ÷ 全体」. ⚠️ Never more than one -- SC-4 of
  // table T-031 draws the bar when everything fits, and a fraction above one
  // would run the grip past the end of its lane. ⭐ A content of zero is that
  // same "everything fits": nothing was placed, so all of it is on screen.
  const share = whole > 0 ? Math.min(1, visible / whole) : 1
  // GR-21 (MUST): the floor. ⚠️ Held to the lane as well, because a lane
  // shorter than S-205 would otherwise carry a grip hanging out of it -- the
  // floor exists so the grip can be grabbed, and one drawn outside cannot be.
  const least = Math.min(along, NOT_STORED_SCROLLBAR_SIZES['S-205'])
  const length = Math.max(least, along * share)
  // GR-21 (MUST): where the 区間 begins, on the same denominator as its length.
  // ⛔ HELD INSIDE THE LANE AT BOTH ENDS. A grip drawn past the lane's foot
  // cannot be grabbed, which is the very thing the floor above exists to
  // prevent -- and the floor is what makes the clamp necessary: a grip lengthened
  // to S-205 is longer than its share, so the share's own start would hang it
  // out by the difference at the far end of the travel.
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
      // GR-21's two fractions, each with the place its 区間 begins. ⚠️ The
      // sideways range is seen through the lane itself (the `Row Area`'s
      // width); the downwards one through the scrolling remainder, which the
      // pinned band shortens -- see `scrollbarIn` and
      // `ScrollExtent.visibleHeight`.
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
