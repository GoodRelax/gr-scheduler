// ScreenRenderer -- declares the interface ScreenSurface (table T-065 IF-9).
//
// @unit      UF-70   (docs/spec/05-07-design.md, table T-075)
// @component ScreenRenderer, layer Adapter (table T-062)
// @purity    n/a
// @seam      ScreenSurface, implemented in another layer (LR-5)
//
// This file and the public entry import types from each other; both edges are
// `import type`, so no cycle survives into the built module graph. `ScreenView`
// cannot move to a third file: table T-075 fixes this folder's units.

import type {
  ExportFormatId,
  IconId,
  PanelDivider,
  PropertyFieldKey,
  Scrollbar,
  ScreenView,
} from './screen-renderer'

/**
 * What this surface has drawn at one point on the screen.
 *
 * The side that drew an entry answers where it is (Chapter 5.3, under table
 * T-065): nothing in `ScreenView` carries an entry's rectangle, and LR-6 keeps
 * the browser out of the units that build it.
 *
 * One answer rather than one call per member, because the screen can move
 * between two calls (R7.4).
 */
export interface ScreenPart {
  /**
   * The UI part the point is on, spelled as table T-103 spells it, or the
   * `ScreenView` member name for the two parts that table has no row for
   * (`notices`, `tooltips`).
   *
   * The outermost named part: table T-109's surface column names the containing
   * surface, not the grouping inside it. `Row Title Tree` (U-23) is answered as
   * `Row Title Panel` (U-22), where table T-109 puts IC-58 .. IC-60.
   */
  readonly part: string
  /**
   * The entry the point is on -- a row of table T-109 -- or `null` where the
   * point is on the part but on none of its entries.
   *
   * "On a part, on no entry" stops a press on the palette, an open surface, the
   * notices or the dialogue field from being read as a marquee on the schedule
   * underneath: table T-023a applies to the drawing area alone, and
   * `ScreenRegions` (PI-35) holds no rectangle for those.
   *
   * IC-53 is answered here although table T-109 makes it no button: it is the
   * only name the palette's grab band (GR-19 of table T-023d) has. It is not a
   * `CommandItem` (UF-65 keeps it out of `groups`); a press on it is FR-053's
   * drag of `ScreenSession.commandPaletteAt`.
   */
  readonly entry: IconId | null
  /**
   * The export format the point is on -- a row of table T-024 -- or `null`.
   *
   * Not folded into `entry`: FR-096 puts every format behind the one entrance
   * IC-52, so a press on U-54 names a row of table T-024, and one member holding
   * rows of two independently numbered tables could not say which it holds.
   *
   * `null` on every other part and elsewhere on the chooser; whether any format
   * exists is `ExportChooser.formats`'s answer.
   *
   * How the drawing side marks a format is not in the specification: table
   * T-006a's `data-role` reaches no format. Searched: tables T-006a, T-024,
   * T-065, T-103 and T-109, and FR-029 / FR-096.
   */
  readonly format: ExportFormatId | null
  /**
   * The row the point is on -- `TaskGroup.id` (AT-51) -- or `null`.
   *
   * IC-58, IC-59 and IC-60 are drawn once per row (HF-1 of table T-051, FR-098),
   * so `entry` says which control and only this says whose; the commands they
   * plan are keyed by the row. Separate from `entry` for the reason `format`
   * gives.
   *
   * `null` wherever the point is not on a row, the header's and the palette's
   * entrances included.
   */
  readonly rowGroupId: string | null
  /**
   * The resource the point is on -- `Resource.uid` (AT-85) -- or `null`.
   *
   * Needed for IC-67 and IC-68, drawn per person on the `Resource Roster` (U-49,
   * FR-099). IC-63 .. IC-66 are drawn once in the roster's header, so `entry`
   * alone answers them.
   */
  readonly resourceUid: number | null
  /**
   * Which panel a press on a `Panel Divider` would resize (FR-052), or `null`.
   *
   * The only road in for FR-052's drag: the note under table T-023a keeps that
   * table's order off the boundary, and U-24 has no row of table T-109, so
   * `entry` is `null` on the band. Which band, not merely that one, because
   * `setPanelWidths` (CM-67) takes both widths at once.
   *
   * `null` wherever the point is not on a band, the panels' bodies included; it
   * does not mean "no dividers" (`ScreenFrame.dividers` answers that).
   */
  readonly dividerPanel: PanelDivider['panel'] | null
  /**
   * Whether the point is on the grab strip GR-20 of table T-023d lays along a
   * row's left edge, where HF-15's drag is taken.
   *
   * GR-20 has no row of table T-109, so without this a press on the strip falls
   * through as FR-085's choosing of the row and the row is never moved. A truth
   * value, not a key: `rowGroupId` already says which row.
   *
   * `false` on a pinned row (GR-20, MUST NOT): only the side that drew the panel
   * knows the row was lifted (FR-098), so it draws no strip there.
   *
   * Optional, and absent reads as `false`, so `ScreenPart` literals written
   * before this member still compile. That is the safe direction: a missing
   * answer costs a drag, where a wrongly true one would move a row nobody
   * grabbed.
   */
  readonly isRowGrabStrip?: boolean
  /**
   * The telling a press would put away -- `Notice.dismissKey` -- or `null`.
   *
   * Not an `IconId`: NT-8 of table T-037 has no row in table T-109 (its entrance
   * is a word), so answering it as `entry` would name a row that does not exist.
   * `null` on every other part, a confirmation included (NT-8).
   */
  readonly noticeDismissKey: string | null
  /**
   * Which of NT-7's two answers a press would give -- `ConfirmationAnswer.answer`
   * -- and absent where the point is on neither.
   *
   * Not an `IconId`, for the reason `noticeDismissKey` gives (NT-7). Optional on
   * the terms `isRowGrabStrip` keeps: a missing answer costs a repeated press,
   * where a wrongly filled one would settle a question nobody answered.
   */
  readonly confirmationAnswer?: string
  /**
   * Whether the point is on U-62 `Import Report`'s one entrance (table T-103;
   * its word is NT-8 of table T-037).
   *
   * None of `entry`, `noticeDismissKey` or `confirmationAnswer` fits: no row of
   * table T-109 names U-62 (FR-029, RC-13 of table T-026), U-62 is not a notice,
   * and it asks no NT-7 question. `part` alone would close the surface on a press
   * anywhere on it, its list's scrollbar included (FR-023).
   *
   * Optional on the terms `isRowGrabStrip` keeps.
   */
  readonly isImportReportDismiss?: boolean
  /**
   * Which of the two `Scrollbars` (U-21) the point is on, and absent where it is
   * on neither.
   *
   * The only road in for GR-21's grab (FR-051): U-21 has no row of table T-109,
   * so `entry` is `null` on a lane, and the note under table T-023a keeps that
   * table's order off everything this surface drew. The axis rather than a truth
   * value, because the two lanes move different halves of the display position.
   *
   * One answer for the lane and its grip: what a press outside the grip owes is
   * undecided (GR-21), and `input-command-translator.ts` carries that STOP.
   *
   * Optional on the terms `isRowGrabStrip` keeps: a missing answer costs a scroll
   * by wheel, where a wrongly filled one would move the picture.
   */
  readonly scrollbarAxis?: Scrollbar['axis']
}

/**
 * What stands in the `Dialogue Field` (U-44), as the surface read it.
 *
 * `author` and `settledAt` are values handed in: the speaker and the clock
 * belong to the Framework (LY-5 of table T-060, CS-1 of table T-066), which
 * implements this seam.
 *
 * No sequence here: `logWithMessage` (PI-33) assigns it, and two callers
 * choosing a number would lose a message from AG-6's selection.
 */
export interface DialogueInput {
  /** What the person has typed. */
  readonly text: string
  /**
   * Whether the person settled it.
   *
   * The flag travels with the text (AG-11) because `dialogueMessageFromInput`
   * (PI-37) is the one place that turns the pair into an utterance.
   */
  readonly isSettled: boolean
  /** Compared by AG-6 against the watcher's own name. */
  readonly author: string
  /** ISO 8601, UTC, to the second -- the spelling AT-129 uses for the stamp. */
  readonly settledAt: string
}

/**
 * A value a person settled in one editable field, as the surface read it.
 * The row ID is a row of table T-016, or U-27 of table T-103 for the header's
 * document name field (IF-9).
 *
 * Settled, not typed: FR-031 (with UN-3 of table T-027) makes one property
 * change one undo step, so a value per keystroke would be taken back a letter at
 * a time.
 *
 * `key` stands beside the row ID because `PR-3` names the pair `start` /
 * `finish` without saying which was settled, and no row ID says whose.
 */
export interface FieldCommit {
  /** IF-9's row ID: `PropertyField.row`, carried back untouched. */
  readonly row: string
  /** Which control of that row, and what it is about. */
  readonly key: PropertyFieldKey
  /**
   * What stands in the control now.
   *
   * Always a string: the side that turns it into a command knows the column's
   * type (`COLUMN_SHAPES`), and LR-6 keeps that rule out of this layer.
   */
  readonly text: string
}

export interface ScreenSurface {
  /**
   * Put the description on the screen (IF-9).
   *
   * A value, not a node tree: ScreenRenderer is `pure` (table T-075 UF-60), and
   * building nodes needs the browser LR-6 keeps out.
   *
   * The whole description each time, not a patch: a patch protocol would put a
   * diffing rule no requirement states inside the seam.
   *
   * @purity non-pure
   */
  showScreenView(view: ScreenView): void

  /**
   * What stands in the dialogue field, or `null` while the person has entered
   * nothing (IF-9).
   *
   * Pulled, not pushed: UF-60 is `pure` and can neither register a listener nor
   * remember one.
   *
   * @purity semi-pure-b
   */
  readDialogueInput(): DialogueInput | null

  /**
   * The value a person has settled in an editable field since this was last
   * asked, or `null` (IF-9). `FieldCommit.row` says which field.
   *
   * Pulled, for `readDialogueInput`'s reason; the shell asks once a frame and
   * hands the answer to `commandFromFieldCommit` (PI-18).
   *
   * Reading it takes it: a commit answered twice would be written twice, putting
   * a second undo step on the history (FR-031, UN-3).
   *
   * @purity semi-pure-b
   */
  readFieldCommit(): FieldCommit | null

  /**
   * What this surface has drawn at (x, y), or `null` where it has drawn nothing
   * there and the schedule below is exposed (IF-9).
   *
   * Pulled at the moment of a press and carried into `InputContext`, because a
   * gesture is about what was under the pointer when the button went down (CS-2
   * of table T-066).
   *
   * Window coordinates, as `ScreenRegions` (PI-35) and `PointerInput` use; no
   * conversion on either side of this seam.
   *
   * @purity semi-pure-b
   */
  readScreenPartAt(x: number, y: number): ScreenPart | null

  /**
   * Whether text stands in one of this surface's fields that the person has not
   * settled (IF-9). One truth value; which field holds it is not answered (MUST
   * NOT, under table T-065).
   *
   * Only the side that drew the fields can see which control the person holds
   * (LR-6). Pulled, for `readDialogueInput`'s reason. Asking does not take it,
   * unlike `readFieldCommit`.
   *
   * @purity semi-pure-b
   */
  hasUnsettledTextEntry(): boolean

  // No member asks the surface to focus a field for MK-13's double click: every
  // member answers a supply IF-9 names, and focusing is none of them. That half
  // travels on `ScreenSurfaceWiring` as `holdFocusPropertyField`.
}
