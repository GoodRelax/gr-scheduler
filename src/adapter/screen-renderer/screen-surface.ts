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

import type {
  ExportFormatId,
  IconId,
  PanelDivider,
  PropertyFieldKey,
  ScreenView,
} from './screen-renderer'

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
  /**
   * Whether the point is on the grab strip GR-20 of table T-023d lays along a
   * row's left edge -- the strip HF-15's drag is taken on.
   *
   * ⛔ WITHOUT IT, HF-15's DRAG HAS NO ROAD IN, which is exactly the absence
   * `dividerPanel` above records for FR-052. GR-20 has no row of table T-109 --
   * that table holds no entrance for a grab strip -- so `entry` is `null` on it,
   * and a press on the strip would otherwise fall through as "on a row, on no
   * entry", which is FR-085's choosing of that row. ⇒ The row would be selected
   * and never moved.
   *
   * ⭐ A MEMBER OF ITS OWN AND NOT A SPELLING OF `entry`, for the reason
   * `format`, `rowGroupId` and `dividerPanel` all give: these are different
   * questions about one point, and one member carrying two of them leaves the
   * reading side unable to say which it was handed.
   *
   * ⭐ A TRUTH VALUE AND NOT A KEY, WHICH IS WHERE IT PARTS FROM `dividerPanel`.
   * That member has to say WHICH band because `setPanelWidths` takes both widths
   * at once; this one has nothing left to say -- `rowGroupId` already answers
   * WHICH row the strip belongs to, and a copy of the key here would state one
   * row's key in two places.
   *
   * ⛔ `false` ON A PINNED ROW, AND THAT IS A MUST NOT RATHER THAN AN OMISSION.
   * GR-20: 「ピン止めしている行は掴めないこと（MUST NOT）」 -- FR-098 lifts a
   * pinned row to the head of the panel, so 「上げられた位置で掴むと、木の順では
   * なく描く順を触ることになる」. The side that DREW the panel is the side that
   * knows a row was lifted, so it draws no strip there and this answers `false`.
   *
   * ⚠️ `false` WHEREVER THE POINT IS NOT ON A STRIP, the row's own name and its
   * controls included. It does not stand in for "this panel draws no rows".
   *
   * ⛔⛔ OPTIONAL, AND ABSENT READS AS `false`. It is declared optional so that
   * the `ScreenPart` literals already written go on compiling; a description
   * that does not carry it comes from a side that has not been taught to answer
   * yet, and the reading side treats that as "not on a strip". ⭐ THAT IS THE
   * SAFE DIRECTION and not merely the convenient one: a missing answer costs a
   * drag HF-15 would have allowed, and the press still chooses the row (FR-085),
   * where a wrongly TRUE answer would move a row nobody grabbed.
   */
  readonly isRowGrabStrip?: boolean
  /**
   * The telling a press would put away -- `Notice.dismissKey` -- or `null`
   * where the point is on no such entrance.
   *
   * ⛔ A SIXTH MEMBER AND NOT A SPELLING OF `entry`, for the reason `format`
   * and `rowGroupId` both give: these are different questions about one point,
   * and one member carrying both would leave the reading side unable to say
   * which it had been handed. ⚠️ Here the difference is sharper still --
   * `entry` names a row of table T-109, and NT-8 of table T-037 deliberately
   * has NO row there: its entrance is a WORD, the way NT-7's two answers are,
   * so answering it as an `IconId` would name a row that does not exist.
   *
   * ⚠️ `null` ON EVERY OTHER PART, a confirmation included -- NT-8 (MUST NOT)
   * keeps the way out off `NT-7`, whose two answers travel on the member below.
   */
  readonly noticeDismissKey: string | null
  /**
   * Which of NT-7's two answers a press would give --
   * `ConfirmationAnswer.answer` -- and absent where the point is on neither.
   *
   * ⛔ A MEMBER OF ITS OWN AND NOT A SPELLING OF `entry`, for the reason
   * `noticeDismissKey` above gives and with the same requirement behind it:
   * NT-7 (MUST NOT) refuses these two answers a row of table T-109, so
   * answering one as an `IconId` would name a row that does not exist.
   * ⚠️ It DID travel as one until 2026-09-02, while table T-109 still held
   * IC-69 and IC-70 (CR-327).
   *
   * ⛔⛔ OPTIONAL, AND ABSENT READS AS 「on neither answer」, the same bargain
   * `isRowGrabStrip` above keeps and for the same reason: a `ScreenPart` literal
   * written before this member existed goes on compiling, and a description that
   * does not carry it comes from a side that has not been taught to answer yet.
   * ⭐ THAT IS THE SAFE DIRECTION and not merely the convenient one -- a missing
   * answer costs a press the person has to make again, where a wrongly filled
   * one would settle a question nobody answered.
   */
  readonly confirmationAnswer?: string
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

/**
 * A value a person settled in one field of the `Properties Panel`, as the
 * surface read it. IF-9's 「プロパティパネルの欄で確定した値を、その欄が名乗る
 * 行 ID とともに返し」.
 *
 * ⭐ SETTLED, NOT TYPED. The reading side turns this into a row of table T-108
 * and FR-031 (with UN-3 of table T-027) makes one property change ONE step of
 * the undo history -- so a value that arrived per keystroke would put a step on
 * that history for every letter, and taking the name back would take back one
 * letter of it.
 *
 * ⛔ THE ROW ID IS NOT ENOUGH BY ITSELF, which is why `key` stands beside it:
 * `PR-3` names the pair `start` / `finish` without saying which of the two was
 * settled, and no row id says WHOSE. `PropertyFieldKey` carries both, and it is
 * the very value the drawing side was handed on `PropertyControl`.
 */
export interface FieldCommit {
  /** IF-9's 行 ID: `PropertyField.row`, carried back untouched. */
  readonly row: string
  /** Which control of that row, and what it is about. */
  readonly key: PropertyFieldKey
  /**
   * What stands in the control now.
   *
   * ⚠️ ALWAYS A STRING, whatever the control's kind. A truth value arrives as
   * the spelling `textOfValue` writes it in and a number as its digits, because
   * the side that turns this into a command is the side that knows the column's
   * type (`COLUMN_SHAPES`) -- a value already narrowed here would be narrowed
   * by the layer LR-6 keeps the rules out of.
   */
  readonly text: string
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
   * The value a person has settled in a field of the `Properties Panel` since
   * this was last asked, or `null` while none has been. The third of what IF-9
   * says this seam supplies, and the only one that carries a value BACK.
   *
   * ⭐ Pulled, like the two around it and for the same reason: UF-60 is `pure`
   * (table T-075), so it can neither register a listener nor remember one. The
   * shell asks once a frame, hands the answer to `commandFromFieldCommit`
   * (PI-18) and writes what comes back -- the same road a press takes.
   *
   * ⛔ READING IT TAKES IT. A commit answered twice would be written twice, and
   * FR-031 (with UN-3) makes one property change one undo step: the second
   * write would put a second step on the history for an edit nobody made.
   * ⚠️ So this is not a question about the state of the screen the way
   * `readScreenPartAt` is -- it is the one happening this seam holds until it
   * is collected.
   *
   * @purity semi-pure-b
   */
  readFieldCommit(): FieldCommit | null

  /**
   * What this surface has drawn at (x, y), or `null` where it has drawn nothing
   * there and the schedule below is exposed. The fourth of what IF-9 says this
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

  /**
   * Whether text stands in one of this surface's fields that the person has not
   * settled. The fifth of what IF-9 says this seam supplies --
   * 「まだ確定していない文字入力があるかを答え」.
   *
   * ⛔ ONE TRUTH VALUE, AND WHICH FIELD HOLDS IT IS NOT ANSWERED (MUST NOT,
   * under table T-065, 利用者の裁定 2026-08-27). The three rules that ask read
   * nothing but 「入力中か」 -- IN-4's first level, IN-5a of table T-028, and
   * WS-2 of table T-067 taking AG-9 of table T-035 -- and naming the field is
   * what would let a reader start using it and thicken the seam.
   *
   * ⭐ WHY THE SURFACE IS ASKED. It is the same bargain `readScreenPartAt`
   * rests on and Chapter 5.3 states under table T-065: the side that DREW the
   * fields is the side that answers about them. Nothing outside this seam can
   * see which control the person has hold of -- LR-6 keeps the browser out of
   * the inner layers -- and the shell had no value to answer with at all, which
   * is why it pinned `false` and all four rules stood inert.
   *
   * ⭐ Pulled, like the three above and for the same reason: UF-60 is `pure`
   * (table T-075), so it can neither register a listener nor remember one.
   *
   * ⚠️ Reads the screen as it stands now, so it is not deterministic: two calls
   * one focus change apart answer differently. ⛔ Asking it does not TAKE it,
   * unlike `readFieldCommit` -- it is a question about the state of the screen,
   * which the shell asks once per happening.
   *
   * @purity semi-pure-b
   */
  hasUnsettledTextEntry(): boolean

  // ⛔⛔ NO SIXTH MEMBER, AND MK-13's SECOND HALF IS WHERE THAT WAS MEASURED.
  // That row (MUST, CR-304) has a double click on a `Task` 「名称の欄（表 T-016
  // の `PR-1`）を編集できる状態にして焦点を置き、既にある文字をすべて選んだ状態に
  // する」, which only the side that DREW the field can carry out -- and every
  // member above is a QUESTION, so nothing here can ask for it. ⭐ IT IS NOT
  // ADDED HERE ALL THE SAME: the IF-9 cell of table T-065 names five supplies,
  // and a member that serves none of them is this seam claiming a duty the
  // specification did not give it. ⚠️ The same bargain FR-051's measured height
  // already takes -- it travels on the WIRING (`ScreenSurfaceWiring`), which is
  // the Framework's own arrangement between the shell and the surface it built,
  // and `holdFocusPropertyField` is where MK-13's half now travels too.
}
