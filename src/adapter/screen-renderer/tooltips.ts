// ScreenRenderer -- internal unit of the component.
//
// @unit      UF-69   (docs/spec/05-07-design.md, table T-075)
// @component ScreenRenderer, layer Adapter (table T-062)
// @purity    pure
//
// The explanations shown against the parts the other eight units described.
//
// ⭐ WHY THIS ONE IS HANDED THE OTHER EIGHT. What a tooltip explains is always
// a part somebody else already described -- an icon standing in the header, the
// palette or an open surface, a row name that was cut, a scrollbar lane.
// Reading those descriptions is cheaper and safer than describing the same
// things a second time, and it is why `screenViewFromRegions` builds this
// member last.
//
// ⭐ WHY NOTHING HERE SAYS "CAN BE DISMISSED". IN-3 of table T-028 grants that
// to every tooltip, along with being pointed at and not going away by itself.
// A member per tooltip would let a caller describe one that IN-3 forbids.
//
// ⭐ WHY ONE ANCHOR IS TESTED AGAINST THE POINTER AND TWO ARE NOT. The three do
// not share a trigger, and the difference is the specification's rather than a
// simplification made here:
//   scrollbar  FR-037 states the pointer condition in as many words and adds a
//              MUST NOT against showing it all the time, and `Scrollbar.track`
//              is a rectangle -- so the test is made in this file.
//   rowTitle   FR-085 states no pointer condition at all. What turns it on is
//              that the name was cut, which `RowTitle.isLabelTruncated` answers.
//              ⚠️ FR-048's roster of what redraws on a pointer move names EZ-2
//              and does not name this one, which reads the same way.
//   icon       EZ-2 of table T-040 states a TIME condition, which the session
//              can answer, and a PLACE condition, which nothing reachable from
//              here can -- see the first STOP note below.
//
// ⛔ FR-029 ALSO PUTS A TOOLTIP ON AN ENDPOINT THAT CANNOT BE GRABBED. That
// endpoint lives inside the `Row Area`, which this component does not describe,
// and `TooltipAnchor` carries no case for it. Nothing is invented for it here.
//
// ⚠️ FR-093's estimate is never called: no width is judged in this file. The cut
// FR-085 asks for was already made by UF-63, and this unit only reports it.

import type { DocumentSettings } from '../../entity/document-model/document-settings/document-settings'
import type { ScreenRect } from '../../entity/layout-engine/screen-regions/screen-regions'
import type { CommandItem, ScreenSession, ScreenView, Tooltip } from './screen-renderer'

/**
 * Which row of table T-023 assigns the faster way of scrolling that axis.
 *
 * STOP -- ⛔ NOT DECIDED BY THE SPECIFICATION: the WORDS FR-037 puts on the
 * screen. FR-038 requires the display language and names no store of translated
 * strings, and table T-023 -- which owns the assignments themselves -- is not
 * generated into `src/` the way `settings.json` is, so rule 03 section 1
 * forbids re-typing what those rows say as firmly as it forbids inventing
 * words for them. Searched: FR-037, FR-038, table T-023, table T-036,
 * `_assets/tbl-settings.md`, and `ScreenSession`.
 * ⭐ Smallest thing that cannot be wrong: carry the row id of the assignment.
 * It is the join the specification itself prescribes, it cannot go stale when
 * the assignment changes, and ⛔ it cannot be mistaken for a settled English
 * name the glossary has not settled.
 *
 * @provisional PD-3
 */
const FASTER_SCROLL_ASSIGNMENT_ROWS: Readonly<Record<'horizontal' | 'vertical', string>> = {
  horizontal: 'MK-5',
  vertical: 'MK-1',
}

/**
 * Half-open on both axes, as R3.4 asks: a point on the right or bottom edge
 * belongs to whatever comes next, so two lanes never both claim it.
 *
 * ⚠️ `screen-regions.ts` holds the same three lines and keeps them private --
 * PI-35 declares four members and this is not one of them, and Chapter 5.3 lets
 * nothing outside a folder read past its public entry. The copy is forced, not
 * chosen; R3.4 is what keeps the two from drifting apart in meaning.
 *
 * @purity pure
 */
function rectHoldsPoint(area: ScreenRect, x: number, y: number): boolean {
  return x >= area.x && x < area.x + area.width && y >= area.y && y < area.y + area.height
}

/**
 * Every entry a person can press that the eight parts hold, in the order
 * `ScreenView` prints them.
 *
 * ⚠️ Three of the eight are read and five are not: `PropertyField`, `Notice` and
 * `DialogueMessage` carry no icon, and UF-61's parts are lanes and bands rather
 * than entries. ⭐ Duplicates are not folded out -- FR-029 (MUST NOT) forbids
 * the same entry to stand in two places at once, so a repeated icon would be a
 * fault in the part that holds it and not something to paper over here.
 *
 * @purity pure
 */
function commandsOnScreen(shown: Omit<ScreenView, 'tooltips'>): readonly CommandItem[] {
  const palette = shown.commandPalette
  const modal = shown.openModal
  return [
    ...shown.appHeaderItems.commands,
    ...(palette === null ? [] : palette.groups.flatMap((group) => group.commands)),
    ...(modal === null ? [] : modal.commands),
  ]
}

/**
 * The explanations to show against this frame's parts.
 *
 * ⭐ The order is `TooltipAnchor`'s own: icons, then row names, then scrollbars.
 * Rule 03 keeps a printed order rather than re-sorting it.
 *
 * @purity pure
 */
export function tooltipsFromScreenView(
  shown: Omit<ScreenView, 'tooltips'>,
  settings: DocumentSettings,
  session: ScreenSession,
): readonly Tooltip[] {
  const pointer = session.pointer

  // STOP -- ⚠️ NOT STATED: whether resting for exactly `iconHintDelayMs` is
  // already "after" it. S-124 gives the wait and EZ-2 gives no boundary.
  // Searched: FR-092 (table T-040), `_assets/tbl-settings.md`, table T-206.
  // ⭐ The endpoint is included, which is what rule 03's min/max convention
  // means and is the shorter of the two waits a reader could be asked for.
  const isIconHintDue = pointer !== null && session.pointerRestedMs >= settings.iconHintDelayMs

  const tooltips: Tooltip[] = []

  // STOP -- ⛔ NOT DECIDED BY THE SPECIFICATION: which icon the pointer is
  // resting on. EZ-2 asks for the explanation of THAT icon, but no
  // `CommandItem` carries a rectangle and `ScreenRegions` is not an argument of
  // this unit, so the join from a point to an icon does not exist on this side
  // of the seam. Searched: FR-092 (table T-040), FR-029, table T-109 and figure
  // F-019 in `_assets/tbl-glossary.md`, table T-206, and `ScreenSession`.
  // ⭐ Smallest thing that cannot be wrong: answer the half that IS decidable --
  // the wait -- and offer every entry whose explanation has come due, leaving
  // the surface (PI-38), which drew them and therefore knows where they are, to
  // show the one under the pointer. Answering none would break EZ-2's MUST, and
  // guessing a rectangle would be an invented layout.
  //
  // STOP -- ⛔ NOT CARRIED: the REASON FR-029 wants on an entry that cannot be
  // used. `CommandItem.label` is the accessible name and EZ-2's explanation, and
  // nothing else on the entry says why it is spent. Searched: FR-029, table
  // T-109, table T-016. ⭐ The label stands in so the entry is not silent --
  // FR-029's RATIONALE is that an entry which does nothing reads as a fault.
  // ⚠️ That is also why a spent entry does not wait for the delay: FR-029 states
  // no time condition, EZ-2 does.
  for (const command of commandsOnScreen(shown)) {
    if (command.isEnabled && !isIconHintDue) continue
    tooltips.push({ anchor: { kind: 'icon', icon: command.icon }, text: command.label })
  }

  // FR-098 lifts the pinned rows out of the list, so they are walked first for
  // the same reason `RowTitlePanel` prints them first.
  const rowTitles = [...shown.rowTitlePanel.pinnedTitles, ...shown.rowTitlePanel.titles]

  // STOP -- ⛔ NOT REACHABLE: the whole of the name FR-085 asks to be shown.
  // `RowTitle.label` is the name AFTER the cut, and `Schedule`, which holds
  // `TaskGroup.label` (AT-53), is not an argument of this unit. Searched:
  // FR-085, the `RowTitle` contract and the nine unit contracts in
  // `screen-renderer.ts`. ⭐ What is carried stands in: the anchor -- WHICH row
  // was cut -- is right either way, and that is what the surface needs to place
  // the explanation. ⚠️ A row with no name has nothing to cut, so a truncation
  // claimed on a null label is dropped rather than shown as an empty tooltip.
  for (const title of rowTitles) {
    if (!title.isLabelTruncated || title.label === null) continue
    tooltips.push({ anchor: { kind: 'rowTitle', groupId: title.groupId }, text: title.label })
  }

  if (pointer === null) return tooltips

  // ⚠️ Every lane the pointer is in answers, and no priority is invented for the
  // corner where two lanes could meet: MK-9a demands a priority for grab targets
  // that overlap, but table T-023a limits that whole scheme to the schedule's
  // drawing area and lists the scrollbar as a surface FR-037 governs instead.
  for (const scrollbar of shown.frame.scrollbars) {
    if (!rectHoldsPoint(scrollbar.track, pointer.x, pointer.y)) continue
    tooltips.push({
      anchor: { kind: 'scrollbar', axis: scrollbar.axis },
      text: FASTER_SCROLL_ASSIGNMENT_ROWS[scrollbar.axis],
    })
  }

  return tooltips
}
