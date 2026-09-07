// ScreenRenderer -- internal unit of the component.
//
// @unit      UF-61   (docs/spec/05-07-design.md, table T-075)
// @component ScreenRenderer, layer Adapter (table T-062)
// @purity    pure
//
// ⚠️ PART of this file is generated. The marked region at the bottom -- search
// for NOT_STORED_PANEL_DIVIDER_SIZES -- comes from
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
// ⛔ Two STOP notes below say what is open: which side of the gap the lane sits
// on, and the grip's length. ⭐ Neither belongs to the divider any more -- the
// BAND was closed when table T-206 gained S-134, and the LINE'S THICKNESS was
// closed by EP-9 of table T-076 on 2026-09-07 (D-363), which is read from
// `GROUP_GRID_LINE_WIDTH_PX` where the divider is built.
// ⚠️ THE TWO THAT REMAIN ARE NOT THE SAME KIND OF HOLE. The first is a rule no
// requirement states; the second is a rule GR-21 of table T-023d states in full,
// whose two numbers this unit's three arguments do not carry -- so it is closed
// in the manuscript and open in the wiring, and `scrollbarIn` says which wire.

import type { DocumentSettings } from '../../entity/document-model/document-settings/document-settings'
import type { ScreenState } from '../../entity/document-model/screen-state/screen-state'
import type {
  ScreenRect,
  ScreenRegions,
} from '../../entity/layout-engine/screen-regions/screen-regions'
// ⭐ D-363: EP-9's one place for the rule's thickness. The import lands on the
// public entry of the component that draws `Group Grid Lines` (LR-2), and adds
// no cycle -- SvgRenderer imports no other adapter.
import { GROUP_GRID_LINE_WIDTH_PX } from '../svg-renderer/svg-renderer'
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
 * ⭐ THE BAND'S WIDTH IS ROW S-134 of table T-206, which the region at the foot
 * of this file carries. ⛔ This note names the ROW and not the number: a figure
 * written here a second time goes on stating the old one after the manuscript
 * moves (rule 03 section 3). The band is CENTRED on the boundary because S-134
 * lays it OVER the boundary line rather than beside it -- which is the same
 * thing the MUST NOT above asks for, and the reason the width may be spent
 * without asking the `Row Area` for any of it.
 *
 * ⭐⭐ THE LINE'S THICKNESS IS SETTLED, AND THE STOP THAT STOOD HERE IS GONE
 * (D-363). What it said -- that no clause sizes the line, so zero was chosen --
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
 * ⭐⭐ THE GRAB IS OPEN AGAIN, AND THIS NOTE NO LONGER CLAIMS OTHERWISE. What
 * stood here said table T-023d had NO ROW for either lane, so a proportional
 * grip would be "a shape nothing presses". GR-21 of table T-023d was written on
 * 2026-09-07 and that ground is gone: `ScreenPart.scrollbarAxis` reports a press
 * on a lane and `input-command-translator.ts` turns a drag on it into FR-051's
 * change of the display position (D-298, measured on the shipped build --
 * a 100px drag on each lane moves the picture, and moved nothing before it).
 *
 * STOP -- ⛔ NOT REACHABLE FROM THIS UNIT'S ARGUMENTS: how long the grip is.
 * GR-21 (MUST) states the rule and leaves no room for a choice -- 「長さは、帯の
 * 長さに対する『見えている範囲 ÷ 全体』の割合とすること」, floored at S-205 of
 * table T-206 -- and both of its two numbers are ScheduleLayout's
 * (`contentWidth` / `contentHeight` against the `Row Area`). ⛔ UF-61 is handed
 * `ScreenRegions`, `DocumentSettings` and `ScreenState` and none of the three
 * carries either, `ScreenSession.rowBoxes` carries only the rows already CUT to
 * the `Row Area` (`drawnRowBoxesOf` in `frame-loop.ts`), and
 * `_source/components.json` gives ScreenRenderer no edge to ScheduleLayout --
 * which is the same absence `ScreenSession.rowBoxes` records of itself.
 * ⇒ ⛔ WHAT IS MISSING IS A WAY IN, NOT A RULE, AND THERE ARE TWO OF THEM.
 * ⛔ Neither may be minted here -- a second computation of an extent this
 * component cannot read would be the very duplication chapter 5.3 refuses.
 *
 * ⭐⭐ THE THREE CANDIDATE DOORS, MEASURED 2026-09-08 AGAINST 93699dc, SO THAT
 * THE NEXT ROUND ARGUES WITH NUMBERS RATHER THAN WITH THIS NOTE:
 *   1. A MEMBER ON `ScreenSession` the shell fills from `ScheduleLayout` -- the
 *      shape `rowBoxes` already has. ⭐ THE CHEAPEST OF THE THREE and the one
 *      to take: a FIELD is not a name that crosses a folder, so table T-064
 *      owes it no row and check 26b stays quiet, and `sessionOf` in
 *      `frame-loop.ts` is already handed `layout` at the call that builds the
 *      session. ⛔ It costs edits in TWO files this unit may not reach --
 *      `screen-renderer.ts` (the member, and a fourth argument in the contract
 *      of the nine) and `frame-loop.ts` (the fill).
 *   2. A MEMBER ON `ScreenState`. ⛔ REFUTED TWICE. LY-1 replaces that value
 *      whole through the `screenStateWith*` writers, and PI-36 of table T-064
 *      enumerates them -- so a new writer may not be called from the shell
 *      until that cell names it, which is exactly the wait
 *      `screenStateWithWatermark` sat out. ⚠️ AND THE FILL WOULD COST A FRAME:
 *      `frame-loop.ts` decides whether a wheel or a move owes a picture by
 *      `screenState !== before.screenState`, so an extent rewritten every frame
 *      makes that test answer true forever (D-329 measured 13.3ms a frame).
 *   3. A MEMBER ON `ScreenRegions`. ⛔ REFUTED BY BUILD ORDER, which is not a
 *      matter of taste: `frame-loop.ts` builds the regions FIRST and then hands
 *      them to `layoutFromSchedule`, so the layout is computed FROM the regions
 *      and its extents cannot be inside them.
 * ⚠️ AN EDGE IN `_source/components.json` WOULD ALSO OPEN IT, and it is a
 * change to the specification rather than to this tree -- so it is named here
 * and not taken.
 *
 * ⛔⛔ AND THE FLOOR IS SHUT BY A SECOND DOOR, WHICH THIS NOTE DID NOT SAY
 * BEFORE. GR-21 (MUST) puts the grip's minimum length at S-205, a row of table
 * T-206 that the document does not store -- and the only way a `pure` unit
 * reads such a row is the generated region at the foot of a file, whose keys
 * are chosen in `tools/generate_entity_types.py` (`NOT_STORED_SCROLLBAR_SIZES`
 * holds S-205 today, and that block is written into `frame-loop.ts`, a
 * Framework file no Adapter may import). ⇒ The block at the foot of THIS file
 * carries S-134 and not S-205, so even with the two extents in hand the floor
 * could not be honoured. ⭐ THE MEND IS ONE KEY IN THAT GENERATOR AND NOT A NEW
 * MECHANISM: one manuscript row generated into two units is a bargain the tree
 * already takes, and the generator says so itself where S-218 lands twice.
 * ⛔ AND IT MAY NOT BE SUBSTITUTED: the lane's own thickness is
 * always at least S-205 and usually more, so flooring at the thickness would
 * make the grip longer than the fraction GR-21 fixes for every environment
 * whose bars are wider than S-205 -- a rule invented where one already stands.
 * ⛔ NO SETTINGS ROW IS OWED EITHER: GR-21 says so in as many words
 * (「新しい設定値を立てない」), and S-205 -- which the floor names -- already
 * exists as the lane's THICKNESS floor and is deliberately reused so that the
 * smallest grip comes out square.
 * ⭐ Chose, meanwhile, the grip that fills its lane: that is exactly the
 * "everything fits" state SC-4 of table T-031 names, it claims no display
 * position the arguments do not carry, and the drag it is grabbed by is
 * geared off the extents rather than off this length, so the picture moves the
 * right distance whatever this comes out at (`scrollGearing` carries that
 * reading). Searched: GR-21 and the closing rules of table T-023d, FR-051,
 * FR-052, FR-037, SC-4 of table T-031, table T-203 (S-77 / S-78 / S-176 /
 * S-177), table T-206 (S-205), `_source/components.json` and the nine unit
 * contracts in `screen-renderer.ts`.
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
 * it: the contract in screen-renderer.ts fixes UF-61 at three
 * arguments, and FR-051 (MUST NOT) forbids a setting to hold the
 * value either -- so there is no door to pass it through. ⛔ It is
 * still not a document setting and must not become one.
 */
export const NOT_STORED_PANEL_DIVIDER_SIZES: {
  /** S-134, in px */
  readonly 'S-134': number
} = {
  'S-134': 8,
}
// </generated>
