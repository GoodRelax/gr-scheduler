// ScreenRenderer -- declares the interface ScreenSurface (table T-065 IF-9).
//
// @unit      UF-70   (docs/spec/05-07-design.md, table T-075)
// @component ScreenRenderer, layer Adapter (table T-062)
// @purity    n/a
// @seam      ScreenSurface, implemented in another layer (LR-5)
//
// The signature of what this file publishes is owned here, not in the
// specification (CR-146). Chapter 6.1 owns the boundary values, and the rule a
// member obeys stays with the requirement that states it.
//
// ⚠️ This file imports a type from the public entry, which imports this file
// back. Both edges are `import type`, so nothing survives into the built module
// graph and there is no cycle at run time. ⭐ No third file could hold
// `ScreenView` instead: table T-075 fixes this folder at eleven units, and the
// one that binds the nine descriptions together is UF-60.

import type { ExportFormatId, IconId, PanelDivider, ScreenView } from './screen-renderer'

/**
 * What this surface has drawn at one point on the screen.
 *
 * ⭐ WHY THE SURFACE IS ASKED AND NOT MEASURED FROM OUTSIDE. Chapter 5.3 states
 * it under table T-065 (MUST): the side that DREW an entry is the side that
 * answers where it is, and no one else may compute the same rectangle. Two
 * computations of one rectangle disagree the moment the drawing changes, and
 * nothing in `ScreenView` carries a rectangle for an entry -- the nine units
 * that build it have no way to measure one (LR-6 keeps the browser out of them).
 *
 * ⚠️ ONE ANSWER AND NOT ONE CALL PER MEMBER. Everything below is read at the
 * same instant because the screen can move between two calls (R7.4: the reading
 * is finished before the deciding starts).
 */
export interface ScreenPart {
  /**
   * The UI part the point is on -- table T-103's settled name, spelled as that
   * table spells it, or the member name `ScreenView` publishes for the two
   * parts table T-103 has no row for (`notices`, `tooltips`).
   *
   * ⭐ THE OUTERMOST NAMED PART, not the innermost. Table T-109's surface column
   * is what an entry is joined to that table by, and it names the containing
   * surface (`App Header`, `Command Palette`, `Resource Roster`) rather than the
   * grouping inside it (`Header Commands`, `Palette Commands`, U-34 / U-35).
   * ⚠️ `Row Title Tree` (U-23) is answered as `Row Title Panel` (U-22): U-23
   * requires (MUST) an entrance for an operation to be named by the panel, and
   * table T-109 puts IC-58 .. IC-60 on the panel.
   */
  readonly part: string
  /**
   * The entry the point is on -- a row of table T-109, e.g. `IC-7` -- or `null`
   * where the point is on the part but on none of its entries.
   *
   * ⛔ THE THIRD ANSWER IS THE POINT OF IT. Table T-023a applies its decision
   * order to the schedule's drawing area ALONE (MUST), and the palette, the open
   * surface, the notices and the dialogue field are drawn OVER that area while
   * `ScreenRegions` (PI-35) holds a rectangle for none of them. So "on a part,
   * on no entry" is what stops a press on one of them from being read as a
   * marquee on the schedule underneath.
   *
   * ⚠️ IC-53 IS ANSWERED HERE TOO, ALTHOUGH TABLE T-109 CALLS IT NO BUTTON. This
   * member is the row of that table the point is ON, which is not the same
   * question as which entry can be pressed: GR-19 of table T-023d gives the
   * palette's grab band a claim on a point ahead of everything under it, and the
   * band carries no name of its own to be answered by -- IC-53 is what table
   * T-109 gives it. `CommandPalette.grabBandHeight` is the band this answer
   * belongs to. ⛔ It is still not a `CommandItem`: UF-65 keeps the row out of
   * `groups`, so a reader may not take this answer as an entry that was pressed
   * -- what a press on the band does is FR-053's drag, and the corner it moves is
   * `ScreenSession.commandPaletteAt`, which is the shell's.
   */
  readonly entry: IconId | null
  /**
   * The export format the point is on -- a row of table T-024, e.g. `IO-2` --
   * or `null` where the point is on none.
   *
   * ⛔ A SECOND MEMBER AND NOT A SECOND SPELLING OF `entry`. FR-096 (MUST) makes
   * the chooser offer every format table T-024 gives an out direction, and
   * FR-029 (MUST) makes table T-109 the whole of the icons -- which places
   * nothing but IC-52 on U-54, because FR-096 (MUST NOT) forbids an entrance per
   * format. So what a person presses there is a row of table T-024 and `entry`
   * cannot report it: that member is a row of table T-109, the two tables number
   * their rows independently, and one member carrying both would leave the
   * reading side unable to say which table it had been handed.
   *
   * ⚠️ `null` ON EVERY OTHER PART, including while a format is on screen but the
   * point is elsewhere on the chooser. ⛔ It does not stand in for "no format
   * exists": `ExportChooser.formats` is where that is answered.
   *
   * ⛔ HOW THE DRAWING SIDE MARKS A FORMAT IS NOT IN THE SPECIFICATION. Table
   * T-006a fixes `data-role` (W-4 / W-6) and the surface writes `data-icon` for
   * an entry, and neither row reaches a format. Searched: tables T-006a, T-024,
   * T-065, T-103 and T-109, and FR-029 / FR-096. The seam is declared all the
   * same, because the alternative is a press FR-096 requires that has no way to
   * arrive at all.
   */
  readonly format: ExportFormatId | null
  /**
   * The row the point is on -- `TaskGroup.id` (AT-51) -- or `null` where the
   * point is on no row.
   *
   * ⛔ WITHOUT IT, THREE ENTRANCES ARE DRAWN AND NONE OF THEM CAN ACT. Table
   * T-109 puts IC-58, IC-59 and IC-60 on the `Row Title Panel`, and HF-1 of
   * table T-051 (with FR-098 for the pin) draws them ONCE PER ROW -- so
   * `entry` alone says which KIND of control was pressed and never WHICH row's.
   * The commands they plan are keyed by the row (`setTaskGroupCollapsed`,
   * `pinTaskGroup`, `unpinTaskGroup`), so a press without this member cannot be
   * turned into one at all: FR-004's folding and FR-098's pinning were
   * unreachable by pointer while it was absent.
   *
   * ⛔ A THIRD MEMBER AND NOT A SPELLING OF `entry`, for the reason `format`
   * gives above: these are two different questions about one point, and one
   * member carrying both would leave the reading side unable to say which it
   * had been handed. ⚠️ Here the two are not even the same KIND of answer --
   * `entry` names a row of a table in the specification, this names a row of
   * the person's own document.
   *
   * ⚠️ `null` WHEREVER THE POINT IS NOT ON A ROW, including on an entrance of
   * the header or the palette. It does not stand in for "this document has no
   * rows".
   */
  readonly rowGroupId: string | null
  /**
   * The resource the point is on -- `Resource.uid` (AT-85) -- or `null` where
   * the point is on no resource.
   *
   * ⛔ THE SAME ABSENCE AS `rowGroupId`, one surface further out: table T-109
   * puts IC-67 and IC-68 on the `Resource Roster` (U-49) and FR-099 draws them
   * against a named person, so a press has to say WHICH.
   *
   * ⚠️ IT IS NOT NEEDED BY ALL SIX OF THAT SURFACE'S ROWS, and the count was
   * measured rather than assumed: IC-63, IC-64, IC-65 and IC-66 are drawn ONCE
   * in the roster's header, not once per person, so `entry` alone answers them.
   * Only IC-67 and IC-68 are per-person. ⛔ An earlier note claimed all six
   * needed a key; it was wrong.
   */
  readonly resourceUid: number | null
  /**
   * Which panel a press on a `Panel Divider` would resize (FR-052), or `null`.
   *
   * ⛔ WITHOUT IT, FR-052's DRAG HAS NO ROAD IN. The note under table T-023a
   * hands the boundary between the row title panel and the canvas to FR-052 and
   * keeps its own decision order off it (MUST), so no row of that table ever
   * names a press on the band -- the press reaches the reading side only
   * because this surface DREW the band and answers for the point. ⚠️ U-24 is
   * not in table T-109 either, so the band carries no `IconId` and `entry` is
   * `null` on it: with nothing else to go on, a press on the band fell through
   * as "on a part, on no entry" and the widths were never written.
   *
   * ⛔ A MEMBER OF ITS OWN, for the reason `format` and `rowGroupId` give above:
   * these are different questions about one point, and one member carrying two
   * of them leaves the reading side unable to say which it was handed. ⚠️ WHICH
   * band is what has to be answered rather than merely THAT one was pressed --
   * `setPanelWidths` (CM-67) takes both widths at once, so the reading side
   * cannot leave the other panel where it was without knowing which panel the
   * hand is on.
   *
   * ⭐ DERIVED FROM `PanelDivider['panel']`, NOT SPELLED AGAIN. That member is
   * where the two panels are named, and a second union written here would be a
   * second place the same pair is decided (rule 03 section 1).
   *
   * ⚠️ `null` WHEREVER THE POINT IS NOT ON A BAND, the panels' own bodies
   * included -- the band is only S-134 wide and FR-051 (MUST NOT) keeps it from
   * taking any of the `Row Area`. ⛔ It does not stand in for "this screen has
   * no dividers": `ScreenFrame.dividers` describes both boundaries every frame,
   * the properties panel's while that panel is closed.
   */
  readonly dividerPanel: PanelDivider['panel'] | null
}

/**
 * What stands in the `Dialogue Field` (U-44), as the surface read it.
 *
 * ⚠️ `author` and `settledAt` are VALUES, not something read on this side. Who
 * is speaking and what the clock says belong to the Framework (LY-5 of table
 * T-060, and CS-1 of table T-066 keeps the clock out of the inner layers), which
 * is the layer that implements this seam. AG-6 of table T-035 selects on the
 * writers other than the watcher itself, so `author` is the name it compares
 * against its own.
 *
 * ⛔ The sequence is NOT here. AG-11 makes the log count in an order of its own,
 * and `logWithMessage` (PI-33) is what assigns it -- two callers choosing a
 * number would lose a message from AG-6's selection.
 */
export interface DialogueInput {
  /** What the person has typed. */
  readonly text: string
  /**
   * Whether the person settled it.
   *
   * ⛔ AG-11 forbids anything to read the half-typed line as an utterance, which
   * is why the flag travels with the text instead of the surface deciding alone:
   * `dialogueMessageFromInput` (PI-37) is the one place that turns the pair into
   * an utterance, and it refuses this one while the flag is false.
   */
  readonly isSettled: boolean
  /** AG-6 selects on "settled by someone other than me". */
  readonly author: string
  /** ISO 8601, UTC, to the second -- the spelling AT-129 uses for the stamp. */
  readonly settledAt: string
}

// The members are not in the specification: table T-065 names the
// interface and what it supplies, nothing more. They are decided here,
// by the component that declares the seam.
export interface ScreenSurface {
  /**
   * Put the description on the screen. The first half of IF-9.
   *
   * ⭐ A value, not a node tree, for the reason SvgSurface takes a string:
   * ScreenRenderer is `pure` (table T-075 UF-60), so what crosses this seam has
   * to be a value, and building nodes needs the browser that LR-6 keeps out and
   * that 5.3 puts on the far side of this declaration.
   *
   * ⚠️ The whole description each time, not a patch. Table T-078 already limits
   * how often a frame runs, and a patch protocol would put the diffing rule --
   * which no requirement states -- inside a seam.
   *
   * @purity non-pure
   */
  showScreenView(view: ScreenView): void

  /**
   * What stands in the dialogue field, or `null` while the person has entered
   * nothing. The second half of what IF-9 says this seam supplies.
   *
   * ⭐ Pulled, not pushed. A push would mean this side holding a listener, and
   * UF-60 is `pure`: it can neither register one nor remember one. The shell
   * asks, hands the answer to `dialogueMessageFromInput`, and passes what comes
   * back to `postDialogueMessage` -- which is the edge
   * `_source/components.json` draws from ScreenRenderer to PostDialogueMessage.
   *
   * ⚠️ Reads the field as it stands now, so it is not deterministic: two calls
   * one keystroke apart answer differently.
   *
   * @purity semi-pure-b
   */
  readDialogueInput(): DialogueInput | null

  /**
   * What this surface has drawn at (x, y), or `null` where it has drawn nothing
   * there and the schedule below is exposed. The third of what IF-9 says this
   * seam supplies.
   *
   * ⭐ Pulled, like `readDialogueInput` and for the same reason: UF-60 is
   * `pure`, so it can neither hold a listener nor remember one. The shell asks
   * at the moment of a press and carries the answer into `InputContext`, which
   * is where CS-2 of table T-066 wants it -- a gesture is about what was under
   * the pointer when the button went down, not one frame later.
   *
   * ⚠️ The window's own coordinates, the frame of reference `ScreenRegions`
   * (PI-35) and `PointerInput` already speak in. ⛔ No conversion happens on
   * either side of this seam.
   *
   * ⚠️ Reads the page as it stands now, so it is not deterministic: the same
   * point answers differently after a redraw.
   *
   * @purity semi-pure-b
   */
  readScreenPartAt(x: number, y: number): ScreenPart | null
}
