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
//
// ⭐ WHY THE EXPANDER PAIR IS READ OFF `TaskGroup.isCollapsed` (AT-56) AND NOT
// OFF THE DRAWN ROWS. The pair's two controls write that column and nothing
// else -- HF-2 of table T-051 sends the opening one to HR-3 of table T-015 and
// HF-3 sends the closing one to HR-5 -- so what each half has left to do is a
// question about AT-56, not about this frame. ⛔ The drawn rows answer a
// DIFFERENT question: FR-018 stops drawing a row's children as the vertical
// zoom falls WITHOUT writing AT-56, and HF-7 (MUST NOT) holds the two apart by
// ranking the person's fold above that zoom. Asking the boxes therefore armed
// the opening control on rows where HF-2 writes nothing and disarmed the
// closing control on rows that HF-3 can still fold -- which is every row of a
// document nobody has folded.
// ⚠️ HR-1a's "the same picture as the group level of detail" (MUST) survives
// this: HF-6 draws the controls only while the pointer is on the row's name, so
// two rows folded by the two different means look the same at rest, and even
// under the pointer the pair changes no pixel today -- dom-screen-surface.ts
// puts the two flags on the DOM under their own names and dims neither half,
// behind a STOP saying no row settles how a spent half is drawn.
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
   * ⚠️ A SET AND NOT THE CHILDREN THEMSELVES. Nothing here asks a child
   * anything any more: the two flags read AT-56 (see `expanderOf`), so keeping
   * an array per parent would build, every frame, a roster no one reads.
   */
  readonly groupIdsWithChildren: ReadonlySet<string>
  readonly boxByGroupId: ReadonlyMap<string, ScreenRect>
  /**
   * The rows with at least one folded row (AT-56) somewhere under them -- the
   * exact set on which HF-2's opening control still has something to write,
   * since HR-3 of table T-015 reaches everything below a row and not the row.
   *
   * ⚠️ Marked once for the frame rather than climbed per row: this runs every
   * frame, and NFR-013 (MUST NOT) refuses an O(n^2) algorithm outright.
   */
  readonly groupIdsWithCollapsedBelow: ReadonlySet<string>
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
  for (const ch of text) units += charUnits(ch)
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
  for (const ch of text) {
    const grown = units + charUnits(ch)
    if (grown * unitWidthPx > widthForKeptPx) break
    units = grown
    kept += ch
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

/**
 * HF-1 of table T-051: a row with something under it carries an opening control
 * AND a closing one. ⚠️ They are not one control in two states -- HF-2 opens the
 * row's WHOLE subtree (HR-3 of table T-015) and HF-3 collapses the row ITSELF
 * (HR-5) -- so the two are judged apart and one can be spent while the other is
 * not.
 *
 * ⭐ BOTH HALVES ANSWER WHAT THEIR OPERATION WOULD WRITE, which is the only
 * reading under which an armed half has something to do and a half with nothing
 * to do is not armed. `canClose` is HF-3 folding THIS row, so it is spent
 * exactly where AT-56 already says the row is folded. `canOpen` is HF-2
 * unfolding every row UNDER this one and not the row itself, so it is spent
 * exactly where no row under this one is folded.
 *
 * ⛔ NEITHER HALF ASKS WHETHER THE CHILDREN WERE DRAWN, and the header of this
 * file says why: FR-018 and HF-7 make "drawn" and "folded" two states, and only
 * the second is the one these controls write.
 *
 * ⚠️ A HIDDEN ROW IS COUNTED. HR-6 of table T-015 hides a row and its
 * descendants, but HF-2 unfolds them with the rest, so leaving them out would
 * disarm a control whose press does write -- the same disagreement as above,
 * facing the other way. ⛔ The note that stood here ruled them out on the
 * ground that opening a hidden row draws nothing; what a press WRITES is the
 * question, and HR-6 keeps the fold when it brings the row back.
 *
 * ⚠️ `RowExpander` in screen-renderer.ts still spells `canOpen` as "there is a
 * level below that is not open" and `canClose` as "something below is open",
 * and repeats above them the reading of HF-2 / HF-3 that stood before
 * 2026-08-25. Chapter 5.3 fixes that contract outside this folder, so ⛔ both
 * sides must move together, or the seam means two things.
 *
 * @purity pure
 */
function expanderOf(group: TaskGroup, index: PanelIndex): RowExpander | null {
  // HF-1 places the pair on a row that has something under it, and a row with
  // no children at all carries neither half.
  if (!index.groupIdsWithChildren.has(group.id)) return null

  return {
    canOpen: index.groupIdsWithCollapsedBelow.has(group.id),
    canClose: group.isCollapsed !== true,
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

/** @purity pure */
function panelIndexOf(schedule: Schedule, session: ScreenSession): PanelIndex {
  const groupsById = new Map<string, TaskGroup>()
  const groupIdsWithChildren = new Set<string>()
  for (const group of schedule.taskGroups) {
    groupsById.set(group.id, group)
    if (group.parentId !== null) groupIdsWithChildren.add(group.parentId)
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
  for (const group of schedule.taskGroups) {
    if (group.isCollapsed !== true) continue
    let ancestorId = group.parentId
    while (ancestorId !== null && !groupIdsWithCollapsedBelow.has(ancestorId)) {
      groupIdsWithCollapsedBelow.add(ancestorId)
      const ancestor = groupsById.get(ancestorId)
      ancestorId = ancestor === undefined ? null : ancestor.parentId
    }
  }

  const boxByGroupId = new Map<string, ScreenRect>()
  for (const placed of session.rowBoxes) {
    if (boxByGroupId.has(placed.groupId)) continue
    boxByGroupId.set(placed.groupId, placed.box)
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
    boxByGroupId,
    groupIdsWithCollapsedBelow,
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

  return { pinnedTitles, titles }
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
