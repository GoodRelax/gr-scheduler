// ScreenRenderer -- internal unit of the component.
//
// @unit      UF-63   (docs/spec/05-07-design.md, table T-075)
// @component ScreenRenderer, layer Adapter (table T-062)
// @purity    pure
//
// U-22 `Row Title Panel` and the U-23 `Row Title Tree` inside it. UF-63's row
// of table T-075 names FR-085, FR-005 and FR-098 as the requirements it carries.
//
// The signature below is not this file's to choose: the "nine unit contracts"
// section of screen-renderer.ts fixes it, and Chapter 5.3 (MUST NOT) lets
// nothing outside this folder reach this file at all.
//
// ⭐ THE DRAWN ROWS ARE `ScreenSession.rowBoxes`, NOT `Schedule.taskGroups`.
// SC-1 of table T-031 slaves the panel to the body vertically, so the panel and
// the `Row Area` have to be the SAME numbers rather than two computations of
// them -- and ScheduleLayout, which holds them, is not a component this one may
// read. So a `TaskGroup` the layout did not place carries no title here. That
// is how a collapsed row's descendants (HR-1a of table T-015), a hidden row's
// descendants (HR-6) and the rows the group level of detail dropped (FR-018)
// leave the panel without this unit judging any of them, and it is why `titles`
// keeps the order `rowBoxes` arrived in rather than sorting by `TaskGroup.order`
// (AT-55): a second ordering would be a second answer to the same question.
// ⚠️ WHICH ROWS CARRY A TITLE is what that says, and since 2026-08-30 it is no
// longer the only question the drawn rows answer here -- see below.
//
// ⭐⭐ WHY THE EXPANDER PAIR IS NOW READ OFF THE DRAWN ROWS AND NOT OFF
// `TaskGroup.isCollapsed` (AT-56) ALONE. The closing rule under table T-051
// states it outright since CR-307: 「`HF-2` / `HF-3` / `HF-10` / `HF-11` /
// `HF-12` が対象とするのは、いま描かれている行である（MUST）。描かれていない行の
// 畳みを数えてはならない（MUST NOT）」, and FR-029 says the same thing for every
// entrance at once -- 「その対象を、画面に描かれている側で数えること（MUST）。
// 描かれていないものの上に残る状態を数えてはならない（MUST NOT）」. A reader
// judges by the picture, so a control armed by a fold the picture does not hold
// is a control that answers a press with nothing anyone can see.
// ⛔ THE NOTE THAT STOOD HERE ARGUED THE OPPOSITE, and it was measured wrong on
// the shipped build (CR-307 §1(a), the user's own recording: a press wrote the
// document and the next frame was byte-identical to the one before it). It read
// the pair as a question about AT-56 alone, because HF-2 and HF-3 write that
// column and nothing else. That is still true of what a press WRITES; what the
// rows above narrow is what a press CHANGES, which is the question FR-029 asks.
// ⚠️ FR-018 AND HF-7 ARE NOT OVERTURNED BY THIS. The zoom still never writes
// AT-56 and the person's fold still outranks it; a row the zoom left out is
// simply one more row that is not in the picture, and the rule above counts the
// picture.
// ⚠️ `isHidden` (AT-57) IS NO LONGER READ HERE AT ALL. HR-6 refuses to draw a
// hidden row and everything under it (MUST NOT), so the shell measures no box
// for one -- the hiding reaches these answers through the drawn rows, which is
// one reading of it rather than two.
//
// ⚠️ The counting FR-093 estimates a width in lives twice in `src/`: once here
// and once in ScheduleLayout's LC-5. `_source/components.json` gives this
// component no edge to ScheduleLayout and Chapter 5.3 forbids reaching past a
// public entry, so the duplication is the boundary's price, not an oversight.
// ⛔ Both sides must move together if FR-093's estimate ever changes.
//
// ⭐ WHAT THE PANEL SHOWS AS CHOSEN IS `ScreenSession.selectedGroupIds`, NOT
// `Selection`. FR-085 (MUST) has rows chosen in this panel and says in as many
// words that this is NOT the set table T-023c governs, because SL-1 leaves rows
// out of the drawing area's selection -- and `Selection` (PI-32) could not hold
// them anyway, its `SelectableKind` being T-023c's five. ⚠️ A STOP stood here
// saying no argument carried the set and that every row was therefore described
// as not chosen; the shell holds it now and `isSelected` below reads it, so
// that note had become the reason a chosen row was drawn as unchosen.
// ⛔ Still nothing STORES it (PD-142) -- it is lost with the page.

import type { DocumentSettings } from '../../entity/document-model/document-settings/document-settings'
import type { Schedule, TaskGroup } from '../../entity/document-model/schedule/schedule'
import type { Selection } from '../../entity/document-model/selection/selection'
import type { ScreenRect } from '../../entity/layout-engine/screen-regions/screen-regions'
import type { RowExpander, RowTitle, RowTitlePanel, ScreenSession } from './screen-renderer'

/**
 * What one frame is read through, built once before any row is described.
 *
 * ⭐ `boxByGroupId` answers two questions with one map: where a row sits, and
 * whether it was drawn at all -- a row is drawn exactly when the shell measured
 * a box for it this frame.
 */
interface PanelIndex {
  readonly groupsById: ReadonlyMap<string, TaskGroup>
  /**
   * The rows that are somebody's parent -- the rows HF-1 gives the pair of
   * controls to, since it places them on a row that has something under it.
   *
   * ⚠️ A SET AND NOT THE CHILDREN THEMSELVES. The one thing a child is asked
   * is whether HR-6 hides it, and the set below carries that answer already, so
   * keeping an array per parent would build, every frame, a roster no one
   * reads.
   */
  readonly groupIdsWithChildren: ReadonlySet<string>
  /**
   * The rows with at least one child HR-6 does not hide -- the rows whose own
   * fold, taken off, would put a row into the picture that is not in it now.
   *
   * ⭐⭐ WHY AT-57 IS READ AGAIN AFTER CR-307 RETIRED IT HERE. What that change
   * retired was reading the hiding to decide whether a row IS drawn -- the
   * drawn rows answer that already. This asks a different question: whether a
   * row that is NOT drawn WOULD be, once the fold above it came off. HR-6
   * (MUST NOT) is the one answer to it that lives in the document, because a
   * hidden row stays hidden however the folds above it move.
   * ⛔ THE DISPLAY AMOUNT (FR-018) IS NOT ANSWERED HERE AND CANNOT BE. Whether
   * the group level of detail would keep the revealed row is ScheduleLayout's
   * judgement, and Chapter 5.3 lets this component nowhere near it -- so a row
   * whose every child the zoom would drop still arms the opening control. That
   * is the one case left where the closing rule under table T-051 is answered
   * short. @provisional PD-319
   */
  readonly groupIdsWithUnhiddenChildren: ReadonlySet<string>
  /**
   * The rows with at least one child THIS FRAME DREW -- the rows whose own fold
   * still takes something out of the picture, which is the only thing HF-3's
   * closing control does.
   *
   * ⭐ DRAWN AND NOT MERELY UNHIDDEN, since the closing rule under table T-051
   * (MUST) makes 「いま描かれている行」 what these controls act on. HR-6's hiding
   * is one of the ways a child fails to be drawn and is no longer asked about
   * separately: the shell measures a box for a row exactly when the picture
   * holds it.
   */
  readonly groupIdsWithDrawnChildren: ReadonlySet<string>
  readonly boxByGroupId: ReadonlyMap<string, ScreenRect>
  /**
   * The rows with at least one DRAWN folded row (AT-56) somewhere under them
   * THAT WOULD REVEAL SOMETHING -- the exact set on which HF-2's opening
   * control still changes the picture, since HR-3 of table T-015 reaches
   * everything below a row and not the row.
   *
   * ⛔ A FOLDED ROW WITH NOTHING TO REVEAL IS NOT ONE OF THEM (CR-309). The
   * closing rule under table T-051 (MUST) counts 「その操作の前後で描かれる行の
   * 差」, so a folded row whose children are all hidden -- or which has no
   * children at all -- opens onto the same picture and is no reason to arm.
   *
   * ⚠️ Marked once for the frame rather than climbed per row: this runs every
   * frame, and NFR-013 (MUST NOT) refuses an O(n^2) algorithm outright.
   */
  readonly groupIdsWithCollapsedBelow: ReadonlySet<string>
  /**
   * The rows with at least one DRAWN row below them that is NOT folded AND
   * THAT WOULD HIDE SOMETHING IF IT FOLDED -- the exact set on which HF-11's
   * control still changes something, since HR-4 of table T-015 reaches
   * everything below a row and not the row.
   *
   * ⛔⛔ THIS IS THE VERY CASE CR-309 WAS OPENED FOR, measured on the shipped
   * build: a row whose children are all leaves had this control armed, and a
   * press folded every one of those leaves and left the frame byte-identical
   * -- folding a row with nothing under it takes no row out of the picture.
   * ⭐ So a row below counts only when the picture holds a child of ITS own.
   *
   * ⛔ NOT THE COMPLEMENT OF `groupIdsWithCollapsedBelow`. A subtree can hold a
   * folded row and an unfolded one at once, and then both sets carry the
   * ancestor -- which is right: HF-2 has something left to open and HF-11
   * something left to fold.
   * ⚠️ Marked in the same one pass and for the same reason (NFR-013).
   */
  readonly groupIdsWithUnfoldedBelow: ReadonlySet<string>
  /**
   * ⚠️ A map rather than a search of `Schedule.tasks` per row: this runs every
   * frame, and rule 05 of docs/development-rules/04-verification.md refuses a
   * linear scan on that path. A row whose name is its own never reads it.
   */
  readonly taskNameByUid: ReadonlyMap<number, string | null>
}

/**
 * The mark FR-085 (MUST) leaves where the tail was cut: U+2026 HORIZONTAL
 * ELLIPSIS.
 *
 * ⛔ NOT A DISPLAY WORD. FR-038 holds one dictionary per language, and this mark
 * is the same one character in every one of them -- an entry there would invite
 * a second answer per language to a question that has one.
 * ⚠️ Written as a code point rather than typed, which is what rule 03 section 5
 * of docs/development-rules asks of a string the program prints;
 * `BYTE_ORDER_MARK` of `mspdi-codec.ts` is the same choice. ⭐ It also cannot be
 * read as three periods in a diff, which the typed character can.
 */
const TRUNCATION_MARK = '\u2026'

/**
 * Full-width counts two, half-width counts one (FR-093).
 *
 * ⚠️ WHERE THE TWO PART is not something FR-093 spells out. The boundary below
 * is the one ScheduleLayout's LC-5 already draws, taken so that one rule keeps
 * one answer (rule 03 of docs/development-rules) rather than because a table
 * chose it.
 *
 * @purity pure
 */
function charUnits(ch: string): number {
  return ch.charCodeAt(0) < 0x100 ? 1 : 2
}

/** @purity pure */
function labelUnits(text: string): number {
  let units = 0
  for (const character of text) units += charUnits(character)
  return units
}

/**
 * FR-093 (MUST NOT): the width is estimated from the unit count, never measured
 * off the glyphs and never kept from a measurement. FR-085 makes using this
 * estimate for the row name a MUST.
 *
 * @purity pure
 */
function labelWidthPx(text: string, fontSizePx: number, settings: DocumentSettings): number {
  return labelUnits(text) * fontSizePx * settings.labelCoef
}

/**
 * @provisional PD-396 -- HF-6 draws the pin only while the pointer is on the
 * row, so which rows are pinned can only be found by sweeping every one of
 * them. The user asked on 2026-08-30 for a pinned row to say so at rest; that
 * needs an exception to HF-6, and the colour question rides on it.
 *
 * ⚠️ PD-398 STOOD HERE AND IS SETTLED. CR-311 made an entrance in effect say
 * so by a FILL rather than a rim, and table T-237 of FR-029 now holds which
 * colour each of the four states takes. Nothing on this side is provisional
 * for it any more.
 *
 * @provisional PD-397 -- the whole set of row controls is up for
 * re-organising. ⭐ Measured from the user's own FR-102 record: forty seconds
 * of hovering across all seven, three presses. ⛔ THE PRESSES ALL WORKED --
 * what fails is reading them. ⭐ Four discrepancies were named on 2026-08-30:
 * one shape carrying two meanings, the head's order reversed against the row's,
 * the folding shapes split across three metaphors, and the count changing
 * between 2 and 5 on neighbouring rows.
 *
 * @provisional PD-399 -- and nothing here ADDS a row. UN-14 lists the addition
 * of a TaskGroup among the actions undo covers, and not one of table T-109's
 * 85 icons performs it. The user ruled on 2026-08-30 that the entrance is a
 * `+` paired with IC-82's `×` and that it adds a CHILD; where the child
 * lands and what it is named are still open.
 *
 * @provisional PD-400 -- and nothing here REORDERS one either. Table T-023d is
 * the full count of what can be grabbed and holds no row for a row of this
 * panel, so a drag would need a row of its own; two arrows would need two more
 * controls and could not change depth at all.
 *
 * @provisional PD-402 -- and nothing here HIDES a row either, which is the
 * third such hole. HR-6 states the hiding, AT-57 holds `TaskGroup.isHidden`,
 * U-29 names the tab that brings one back and UN-14 counts the change among
 * what undo covers -- and AT-57's own note says the entrance HR-6 has is the
 * one that RESTORES. ⭐ The user's answer on 2026-08-30 was to give that job to
 * the single chevron, which retires the tab along with it.
 *
 * @provisional PD-403 -- and how the folded state is HELD is not settled. ⛔
 * Measured in the prototype that day: folding a row without folding its subtree
 * left every descendant reading 「開いている」, invisible only because an
 * ancestor was, so restoring the ancestor opened every level at once. The
 * invariant proposed is that a folded row's descendants are folded too.
 *
 * @provisional PD-404 -- and whether the panel head's 「すべて畳む」 folds L1
 * with everything else. Table T-015 pairs HR-1/HR-3 and HR-2/HR-4 by SCOPE, so
 * the head is level 0; folding L1 too makes its four entrances read exactly as
 * a row's, at the cost of a panel that can stand empty.
 *
 * @provisional PD-401 -- and the folding shapes do not read as one family.
 * Table T-015 already pairs them by SCOPE (HR-1/HR-3, HR-2/HR-4), so the panel
 * head is level 0; figure F-019 draws that pair as `+` and `>`, which share
 * nothing. ⛔ The shapes are the user's ruling to make, not this file's.
 */

/**
 * The width FR-085 leaves the name: `rowTitlePanelWidth` (S-79) less the indent
 * for the row's depth (`rowTitleIndent`, S-37) less the room the row's controls
 * keep -- U-47 `Row Expander` and U-48 `Row Pin`, whose amount FR-085 puts at
 * S-140 of table T-206.
 *
 * ⛔ THE ROOM DOES NOT FOLLOW WHETHER THE CONTROLS ARE DRAWN (FR-085, MUST
 * NOT). The export draws none of them (EP-4 of table T-076) and HF-6 of table
 * T-051 draws them only while the pointer is on the row's name, so a room that
 * followed them would cut the name in a different place in each of those three
 * -- and would move the cut under the reader's own hand.
 * ⚠️ This subtracted a zero behind a STOP until S-140 reached `src/`, and
 * CR-245 records that the zero is what made the controls collide with the name.
 *
 * ⚠️ The indent is the depth's own multiple, not one step fewer. S-79's lower
 * bound is `rowTitleIndent` x `maxGroupDepth` -- the deepest row's indent -- so
 * a root row pays one indent rather than none.
 *
 * ⚠️ Read where the generated block stands, at the foot of this file, rather
 * than into a module constant above it -- that would read it before it is
 * assigned.
 *
 * @purity pure
 */
function availableLabelWidthPx(depth: number, settings: DocumentSettings): number {
  const roomForControlsPx = NOT_STORED_ROW_CONTROL_SIZES['S-140']
  const available =
    settings.rowTitlePanelWidth - depth * settings.rowTitleIndent - roomForControlsPx
  return Math.max(0, available)
}

/**
 * The size the row's name is drawn at: `rowTitleFont` (S-36), which
 * `rowTitleTopScale` (S-38) enlarges for a root row -- K-38 of table T-104 is
 * what settles that key as the depth-1 row name's scale.
 *
 * ⚠️ `fontScale` (S-70) does NOT reach the row name. FR-039 carries the reader's
 * font size to the ruler and names the two keys it rewrites (S-3 / S-2), and
 * S-3 says it follows where S-36 does not -- so applying it here would enlarge
 * text no requirement asked to enlarge, and would move every cut in the panel.
 *
 * @purity pure
 */
function rowTitleFontPx(depth: number, settings: DocumentSettings): number {
  return depth === 1 ? settings.rowTitleFont * settings.rowTitleTopScale : settings.rowTitleFont
}

/**
 * The name cut to what fits, tail first, closing with `TRUNCATION_MARK`
 * (FR-085, MUST).
 *
 * ⛔ `truncateUnits` (S-35) is NOT the bound: FR-085 says so in as many words,
 * because that value is FR-002's preparation for a name that will not fit a
 * task's own width, and this cut is decided by the panel's width instead.
 *
 * ⭐ THE MARK IS PAID FOR OUT OF THE SAME WIDTH. FR-085 sends the judgement to
 * FR-093's estimate, under which the mark counts like any other character, so
 * the kept part is measured against the width LESS the mark. ⛔ Appending it
 * after a cut judged on the full width would overflow the panel S-79 sizes by
 * exactly the mark -- and S-79 is stored in the document, so the reader handed
 * it would see the same overflow.
 * ⚠️ A width too small to hold even the mark still gets the mark and no
 * characters: FR-085 states no exception, and dropping it there would hide the
 * cut precisely on the narrowest panels, where cutting is likeliest.
 * ⚠️ THE NOTE THAT STOOD HERE SAID NOTHING WAS APPENDED, on the reading that no
 * row spelled a mark and the whole name was reachable in a tooltip instead.
 * CR-257 took that tooltip away and spelled the mark into FR-085 itself.
 *
 * @purity pure
 */
function labelCutToFit(
  text: string,
  availableWidthPx: number,
  fontSizePx: number,
  settings: DocumentSettings,
): string {
  if (labelWidthPx(text, fontSizePx, settings) <= availableWidthPx) return text

  const unitWidthPx = fontSizePx * settings.labelCoef
  const widthForKeptPx = availableWidthPx - labelWidthPx(TRUNCATION_MARK, fontSizePx, settings)
  let units = 0
  let kept = ''
  for (const character of text) {
    const grown = units + charUnits(character)
    if (grown * unitWidthPx > widthForKeptPx) break
    units = grown
    kept += character
  }
  return kept + TRUNCATION_MARK
}

/**
 * Depth 1 is a root row. FR-004 caps the depth at `maxGroupDepth` (S-125).
 *
 * ⚠️ That cap is also what bounds the climb, which is why no visited set is
 * needed here: HM-4 of table T-015a refuses a move that would make a row its own
 * ancestor and FR-023 refuses a cycle that arrived from outside, but a document
 * that carried one anyway would otherwise spin here for ever.
 *
 * @purity pure
 */
function rowDepth(
  group: TaskGroup,
  groupsById: ReadonlyMap<string, TaskGroup>,
  settings: DocumentSettings,
): number {
  let depth = 1
  let parentId = group.parentId
  while (parentId !== null && depth < settings.maxGroupDepth) {
    const parent = groupsById.get(parentId)
    if (parent === undefined) return depth
    depth += 1
    parentId = parent.parentId
  }
  return depth
}

// ⛔ `isRowHidden` STOOD HERE AND IS GONE, WITH NOTHING PUT IN ITS PLACE. It
// climbed a row's parents for AT-57 so that the expander pair could keep HR-6's
// rows out of its own two counts, back when the counts were taken over the
// document's whole roster. Since CR-307 those counts are taken over the rows
// this frame DREW, and HR-6 (MUST NOT) is one of the reasons a row is not among
// them -- so reading AT-57 here as well would be the same rule answered twice,
// which rule 03 section 1 of docs/development-rules refuses.
// ⚠️ AT-57 IS STILL READ IN `src/`, on the side that decides what is drawn.

/**
 * HF-1 of table T-051: a row with something under it carries an opening control
 * AND a closing one. ⚠️ They are not one control in two states -- HF-2 opens the
 * row's WHOLE subtree (HR-3 of table T-015) and HF-3 collapses the row ITSELF
 * (HR-5) -- so the two are judged apart and one can be spent while the other is
 * not.
 *
 * ⭐ ALL THREE HALVES ANSWER WHAT THEIR OPERATION WOULD CHANGE IN THE PICTURE,
 * which is what FR-029 (MUST) asks of every entrance and what the closing rule
 * under table T-051 (MUST) states for these five controls by name. `canClose`
 * is HF-3 folding THIS row, so it is spent where AT-56 already says the row is
 * folded AND where the fold would take no drawn row away. `canOpen` is HF-2
 * unfolding every row UNDER this one and not the row itself, so it is spent
 * where no DRAWN row under this one is folded. `canCloseBelow` is HF-11's
 * mirror of that.
 *
 * ⛔⛔ AND A ROW BELOW ONLY COUNTS WHEN THE OPERATION WOULD MOVE IT (CR-309).
 * The closing rule under table T-051 (MUST) finishes 「その操作で、描かれる行が
 * 1 行も増減しないときは、対象が 1 つも無いものとして扱うこと」 and says what to
 * count: 「配下の行の数ではなく、その操作の前後で描かれる行の差」. ⛔ THE NOTE
 * THAT STOOD HERE STOPPED AT 「描かれている行」, which is a narrower question,
 * and the user's own case survived it: `Whole Product` holds two drawn leaves,
 * so IC-77 was armed, and the press folded two rows that hide nothing while
 * the frame stayed byte-identical (CR-309 §1(a), measured on the shipped
 * build). ⭐ The difference is one hop: the row below must itself have a child
 * the operation would move.
 *
 * ⛔ A ROW THE PICTURE DOES NOT HOLD IS COUNTED ON NO HALF (MUST NOT). HR-1a of
 * table T-015 refuses to draw a folded row's descendants and HR-6 refuses to
 * draw a hidden row's, so the fold that remains on those rows is a fold no
 * reader can see undone -- and an armed half that moves no pixel reproduces the
 * very complaint D-76 was opened with: that none of the row panel's controls do
 * anything. ⚠️ The grounds are FR-029, whose RATIONALE opens by saying that a
 * thing which does not respond looks broken, and the user's ruling of
 * 2026-08-30, taken after watching a press write the document and leave the
 * frame byte-identical.
 * ⛔ THE NOTE THAT STOOD HERE COUNTED THOSE ROWS IN, on the ground that HF-2
 * unfolds them with the rest -- and it kept HR-6 out by a reading of its own,
 * which is the narrowing PD-319 was opened for. ⭐ THAT DECISION IS SETTLED
 * (2026-08-30) AND WIDENED: the rule is no longer about who hid the row but
 * about whether the picture holds it, so one test answers HR-1a, HR-6 and the
 * display amount at once.
 *
 * ⚠️ `RowExpander` in screen-renderer.ts still spells `canOpen` as "there is a
 * level below that is not open" and `canClose` as "something below is open",
 * and repeats above them the reading of HF-2 / HF-3 that stood before
 * 2026-08-25. Chapter 5.3 fixes that contract outside this folder, so ⛔ both
 * sides must move together, or the seam means two things.
 * ⚠️ MEASURED AGAIN ON 2026-08-27 AND STILL TRUE: `RowExpander` there says
 * "HF-2 opens ONE level and HF-3 closes ALL of them", which is the reading both
 * rows retired. ⛔ The narrowing below is a THIRD thing that seam does not say.
 *
 * @purity pure
 */
function expanderOf(group: TaskGroup, index: PanelIndex): RowExpander | null {
  // HF-1 places the pair on a row that has something under it, and a row with
  // no children at all carries neither half.
  if (!index.groupIdsWithChildren.has(group.id)) return null

  // ⭐ THE PICTURE NARROWS ALL THREE, each where its own answer is built:
  // `groupIdsWithCollapsedBelow` and `groupIdsWithUnfoldedBelow` are marked
  // from the DRAWN rows alone, and the closing half asks for a child this frame
  // drew. ⚠️ A row none of whose children the picture holds therefore carries
  // the pair with neither half armed -- HF-1 still places the pair, since the
  // row does have something under it.
  return {
    canOpen: index.groupIdsWithCollapsedBelow.has(group.id),
    canClose: group.isCollapsed !== true && index.groupIdsWithDrawnChildren.has(group.id),
    // HF-11 folds everything BELOW the row and not the row, so this half is
    // spent exactly where no DRAWN row under this one is left unfolded -- the
    // mirror of `canOpen`, narrowed by the picture in the same place.
    canCloseBelow: index.groupIdsWithUnfoldedBelow.has(group.id),
  }
}

/**
 * The name the row is described by: its own `label` (AT-53), and where it was
 * given none, the name of the `Task` it was derived from -- `derivedFromTaskUid`
 * (AT-54). FR-058 makes that substitution a MUST.
 *
 * ⭐ Table T-075 does not name FR-058 as one of UF-63's requirements, but this
 * unit is where it lands: U-22 / U-23 is the one place a row's name is shown, so
 * a row whose name lives on its `Task` is nameless everywhere unless it is
 * fetched here. The use case that settles such a name before deleting the
 * `Task` (FR-032) resolves it in the same order, `label` first.
 *
 * ⭐ The answer is a plain name and is cut by FR-085 like any other: a derived
 * name is a name, and a cut that skipped it would leave one row overflowing the
 * panel that S-79 sizes.
 *
 * ⚠️ WHY A UID THAT NAMES NO `Task` ANSWERS `null` RATHER THAN THROWING. It
 * should not arrive: AT-54 refuses `label` and `derivedFromTaskUid` both empty
 * (IV-8 of Chapter 6.1 carries it as a document invariant), and FR-032 (MUST)
 * settles the row's name and empties the column BEFORE the `Task` is deleted, so
 * the dangling reference has no way in. If a document broke that anyway, the
 * frame must still be drawable -- a renderer that refused would hide the very
 * row the person has to repair -- and this unit cannot report it: it answers a
 * `RowTitlePanel` and nothing else. ⛔ Inventing a stand-in name is worse than
 * `null`, which is the same nothing an unnamed `Task` (AT-27) already produces.
 *
 * @purity pure
 */
function rowNameOf(group: TaskGroup, index: PanelIndex): string | null {
  if (group.label !== null) return group.label
  if (group.derivedFromTaskUid === null) return null
  return index.taskNameByUid.get(group.derivedFromTaskUid) ?? null
}

/** @purity pure */
function rowTitleOf(
  group: TaskGroup,
  box: ScreenRect,
  isPinned: boolean,
  index: PanelIndex,
  settings: DocumentSettings,
  chosenGroupIds: ReadonlySet<string>,
): RowTitle {
  const depth = rowDepth(group, index.groupsById, settings)
  // ⚠️ Resolved once because two answers below need it, and a row whose name is
  // `null` still owes it: the width a name is judged against follows the size
  // the name WOULD be drawn at, not anything the name itself carries.
  const fontSizePx = rowTitleFontPx(depth, settings)
  const wholeLabel = rowNameOf(group, index)
  const shownLabel =
    wholeLabel === null
      ? null
      : labelCutToFit(wholeLabel, availableLabelWidthPx(depth, settings), fontSizePx, settings)

  return {
    groupId: group.id,
    depth,
    box,
    // The very product `availableLabelWidthPx` subtracts, so the indent drawn
    // and the indent the name was cut against cannot be two numbers.
    indentPx: depth * settings.rowTitleIndent,
    label: shownLabel,
    // ⛔ NO READER IN `src/` IS LEFT FOR THIS. The uncut name left this unit so
    // that UF-69 could put it in a tooltip without a `Schedule` to redo AT-53
    // and FR-058's substitution against; FR-085 (MUST NOT) ended that tooltip
    // (CR-257), and a reader who wants the rest widens the panel (FR-052).
    // ⛔ Still answered rather than dropped: `RowTitle` is declared in
    // screen-renderer.ts and Chapter 5.3 fixes that contract outside this
    // folder, so a member it states cannot stop being filled from here.
    // Retiring the member is that file's decision, not this one's.
    //
    // ⚠️ Carried whether or not the cut happened, which is what the contract on
    // `RowTitle.wholeLabel` states: a name that fit is its own whole, and a row
    // that resolved no name has no whole either.
    wholeLabel,
    // The fitting branch of the cut returns the name unchanged and every other
    // path appends the mark, so the two strings differ exactly when the name
    // did not fit -- no second measurement is made to answer this.
    // ⚠️ A name that itself ENDS in the mark cannot collide with its own cut:
    // a cut result is short enough to fit WITH the mark, and a name that
    // reached the cut at all was not.
    isLabelTruncated: shownLabel !== null && shownLabel !== wholeLabel,
    expander: expanderOf(group, index),
    isPinned,
    // FR-085 (MUST): rows are chosen in this panel, and the set is
    // `ScreenSession.selectedGroupIds` (PD-142).
    //
    // ⛔ THIS READ `false` UNCONDITIONALLY, behind a STOP saying no argument
    // carried the set. That was true when written; the shell began holding the
    // set on 2026-08-24 and the argument this unit already takes carries it, so
    // the note had quietly become the reason a chosen row would not be drawn as
    // chosen.
    //
    // ⚠️ A `Set` and not a scan: this runs once per row on every frame, and
    // rule 04 section 5 forbids a linear search on that path (NFR-013).
    //
    // @provisional PD-142
    isSelected: chosenGroupIds.has(group.id),
  }
}

/**
 * ⚠️ NO `DocumentSettings` IS TAKEN ANY MORE. The one thing this member read out
 * of them was `maxGroupDepth` (S-125), which bounded `isRowHidden`'s climb; that
 * climb went with the rows this index no longer counts (see where it stood).
 *
 * @purity pure
 */
function panelIndexOf(schedule: Schedule, session: ScreenSession): PanelIndex {
  const groupsById = new Map<string, TaskGroup>()
  const groupIdsWithChildren = new Set<string>()
  const groupIdsWithUnhiddenChildren = new Set<string>()
  for (const group of schedule.taskGroups) {
    groupsById.set(group.id, group)
    if (group.parentId === null) continue
    groupIdsWithChildren.add(group.parentId)
    // ⚠️ The child's OWN `isHidden` and not its ancestors'. A row under a
    // hidden one is unreachable from a drawn parent anyway, since HR-6 keeps
    // the whole subtree out; the one thing this answers is whether unfolding
    // the parent would put THIS child into the picture.
    if (group.isHidden !== true) groupIdsWithUnhiddenChildren.add(group.parentId)
  }

  // ⭐ THE PICTURE, BUILT BEFORE ANY OF THE THREE ANSWERS THAT READ IT. A row is
  // in it exactly when the shell measured a box for the row this frame, which is
  // the one place HR-1a, HR-6 and the display amount (FR-018) have already been
  // settled -- see the head of this file.
  const boxByGroupId = new Map<string, ScreenRect>()
  for (const placed of session.rowBoxes) {
    if (boxByGroupId.has(placed.groupId)) continue
    boxByGroupId.set(placed.groupId, placed.box)
  }

  // HF-3's reach: the rows whose own fold would take a drawn row out of the
  // picture. ⚠️ A second pass and not the one above, because a child may be
  // printed before its parent and the map has to be whole first.
  const groupIdsWithDrawnChildren = new Set<string>()
  for (const group of schedule.taskGroups) {
    if (group.parentId === null) continue
    if (!boxByGroupId.has(group.id)) continue
    groupIdsWithDrawnChildren.add(group.parentId)
  }

  // HF-2's reach, marked upward from the folded rows instead of walked downward
  // from each row: one pass over the document answers every row, where a walk
  // per row would be quadratic in the number of rows, and NFR-013 (MUST NOT)
  // refuses an O(n^2) algorithm outright.
  //
  // ⛔ THE SAME TEST IS THE MEMO AND THE RING GUARD. Stopping at a row already
  // marked is safe because that row's own ancestors were marked when it was, and
  // it is what keeps a ringed `parentId` from spinning here inside a frame --
  // `schedule.ts` REPORTS such a ring (IV-18) rather than refusing the document,
  // so this unit is handed one. The write side's own climb guards the same way.
  const groupIdsWithCollapsedBelow = new Set<string>()
  const groupIdsWithUnfoldedBelow = new Set<string>()
  for (const group of schedule.taskGroups) {
    // ⛔ THE ONE TEST BOTH WALKS BEGIN WITH (MUST NOT): a row the picture does
    // not hold carries a fold nobody can see undone, so neither walk climbs
    // from it. ⚠️ The climb above such a row is not lost with it -- HR-1a and
    // HR-6 both leave out a whole subtree, so an ancestor that IS drawn is
    // never reachable only through a row that is not.
    if (!boxByGroupId.has(group.id)) continue
    // HF-11's reach, marked upward from the rows that are NOT folded -- the
    // mirror of the walk below, sharing its one pass and its ring guard.
    if (group.isCollapsed !== true) {
      // ⛔ CR-309: a row that would hide nothing is no seed. Folding it takes
      // no row out of the picture, so an ancestor marked from it would arm a
      // control whose press draws the same frame again.
      if (!groupIdsWithDrawnChildren.has(group.id)) continue
      let unfoldedAncestorId = group.parentId
      while (
        unfoldedAncestorId !== null &&
        !groupIdsWithUnfoldedBelow.has(unfoldedAncestorId)
      ) {
        groupIdsWithUnfoldedBelow.add(unfoldedAncestorId)
        const ancestor = groupsById.get(unfoldedAncestorId)
        unfoldedAncestorId = ancestor === undefined ? null : ancestor.parentId
      }
      continue
    }
    // ⛔ CR-309, the mirror of the test above: a folded row that would reveal
    // nothing is no seed either. HR-6 is what makes an existing child fail to
    // arrive, which is why the set below is the unhidden children and not
    // `groupIdsWithChildren`.
    if (!groupIdsWithUnhiddenChildren.has(group.id)) continue
    let ancestorId = group.parentId
    while (ancestorId !== null && !groupIdsWithCollapsedBelow.has(ancestorId)) {
      groupIdsWithCollapsedBelow.add(ancestorId)
      const ancestor = groupsById.get(ancestorId)
      ancestorId = ancestor === undefined ? null : ancestor.parentId
    }
  }

  // The names FR-058 lends to the rows that were given none. AT-24 makes `uid`
  // the key of ET-2, so the last writer of a repeated one cannot be preferred to
  // the first without inventing a rule; `boxByGroupId` above keeps the first for
  // the same reason.
  const taskNameByUid = new Map<number, string | null>()
  for (const task of schedule.tasks) {
    if (taskNameByUid.has(task.uid)) continue
    taskNameByUid.set(task.uid, task.name)
  }

  return {
    groupsById,
    groupIdsWithChildren,
    groupIdsWithUnhiddenChildren,
    groupIdsWithDrawnChildren,
    boxByGroupId,
    groupIdsWithCollapsedBelow,
    groupIdsWithUnfoldedBelow,
    taskNameByUid,
  }
}

/**
 * The pinned titles and the rest, for one frame.
 *
 * ⛔ FR-098 (MUST NOT): a pinned row must not also appear at its natural place.
 * Drawn twice, one row would be counted twice by the lane assignment (FR-003)
 * and by the fit (FR-055). The two lists are therefore a partition -- a
 * `TaskGroup.id` reaches at most one of them, at most once.
 *
 * ⚠️ The pinned ones come out in the order `pinnedGroupIds` (S-126) holds them,
 * which is the order they were fixed in: FR-098 forbids ranking one pinned row
 * above another (MUST NOT) and lines them up from the top in that order. A Set
 * keeps first-insertion order, so it carries that order AND collapses an id that
 * the list happened to hold twice.
 *
 * ⛔ The pinned list is NOT trimmed to `pinnedRowMax` (S-127). FR-098 spends
 * that bound refusing a NEW pin, and forbids letting go of one already made
 * (MUST NOT) -- a view that trimmed would be the silent unpinning that
 * requirement was written against.
 *
 * ⚠️ A pinned row with no box is left out rather than placed: FR-098 admits that
 * the display amount (FR-018) may stop drawing a pinned row, and CD-2 of table
 * T-050 takes the pin away with the row it points at. Neither is a fault to
 * report from here.
 *
 * @purity pure
 */
export function rowTitlePanelFromSchedule(
  schedule: Schedule,
  settings: DocumentSettings,
  _selection: Selection,
  session: ScreenSession,
): RowTitlePanel {
  const index = panelIndexOf(schedule, session)
  const pinnedGroupIds = new Set(settings.pinnedGroupIds)
  // Built once for the whole panel rather than per row -- see `isSelected`.
  const chosenGroupIds: ReadonlySet<string> = new Set(session.selectedGroupIds)

  const pinnedTitles: RowTitle[] = []
  for (const groupId of pinnedGroupIds) {
    const group = index.groupsById.get(groupId)
    const box = index.boxByGroupId.get(groupId)
    if (group === undefined || box === undefined) continue
    pinnedTitles.push(rowTitleOf(group, box, true, index, settings, chosenGroupIds))
  }

  const describedGroupIds = new Set(pinnedGroupIds)
  const titles: RowTitle[] = []
  for (const placed of session.rowBoxes) {
    if (describedGroupIds.has(placed.groupId)) continue
    const group = index.groupsById.get(placed.groupId)
    if (group === undefined) continue
    describedGroupIds.add(placed.groupId)
    titles.push(rowTitleOf(group, placed.box, false, index, settings, chosenGroupIds))
  }

  // ⛔⛔ NOTHING IS CLAIMED ABOUT THE TWO PANEL-WIDE ENTRANCES WHERE THIS PANEL
  // DESCRIBES NO ROW. See the members' own declarations for why, and for what a
  // reader draws when they are absent.
  if (pinnedTitles.length === 0 && titles.length === 0) return { pinnedTitles, titles }

  return {
    pinnedTitles,
    titles,
    // ⭐ READ OFF `TaskGroup.isCollapsed` (AT-56) AND OFF THE ROWS THIS FRAME
    // DREW, the same discipline `expanderOf` keeps and for the same reason: the
    // closing rule under table T-051 (MUST) makes 「いま描かれている行」 what
    // HF-10 and HF-12 act on, and (MUST NOT) refuses to count the fold that
    // remains on a row the picture does not hold.
    // ⛔ THE NOTE THAT STOOD HERE READ THE DOCUMENT'S WHOLE ROSTER, on the
    // reading these entrances write AT-56 and nothing else. CR-307 overturned
    // it -- what a press writes is not what a reader sees.
    // ⛔ AND NARROWED AGAIN BY CR-309, in the same words the three halves of
    // `expanderOf` are: 「その操作で、描かれる行が 1 行も増減しないときは、対象
    // が 1 つも無いものとして扱うこと（MUST）」. A drawn folded row with nothing
    // to reveal opens onto the same picture, and a drawn unfolded row with no
    // drawn child hides nothing when it folds -- so neither is a reason to arm.
    canOpenEveryRow: schedule.taskGroups.some(
      (row) =>
        row.isCollapsed === true &&
        index.boxByGroupId.has(row.id) &&
        index.groupIdsWithUnhiddenChildren.has(row.id),
    ),
    canCloseEveryRow: schedule.taskGroups.some(
      (row) =>
        row.isCollapsed !== true &&
        index.boxByGroupId.has(row.id) &&
        index.groupIdsWithDrawnChildren.has(row.id),
    ),
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
 * ⚠️ This unit reads the row where it stands. ⛔ Neither row is a
 * document setting and neither may become one: table T-206 is where
 * the specification records that the document does not keep them,
 * and the export draws no entrance at all (EP-1 and EP-4 of table
 * T-076), so a reader handed this document sees the same picture
 * whatever this value is.
 */
export const NOT_STORED_ROW_CONTROL_SIZES: {
  /** S-140, in px */
  readonly 'S-140': number
} = {
  'S-140': 0,
}
// </generated>
