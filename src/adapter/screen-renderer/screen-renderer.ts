// ScreenRenderer -- public entry of this folder.
//
// @unit      UF-60   (docs/spec/05-07-design.md, table T-075)
// @component ScreenRenderer, layer Adapter (table T-062)
// @purity    pure
// @publishes table T-064 row PI-37
//
// CP-37 in one line: build the description of the UI parts OUTSIDE the
// schedule, and pass on the utterance a person settled in the dialogue field.
//
// ⭐ A DESCRIPTION, NOT A PAGE. UF-60 is `pure` in table T-075, so everything
// here is a value: rectangles, strings, booleans, and the row ids of the tables
// that hold the rules. The unit that turns it into nodes is DomScreenSurface
// (PI-38), on the far side of IF-9.
//
// ⭐ WHICH PARTS COUNT AS "OUTSIDE THE SCHEDULE". Table T-075's UF-61 .. UF-69
// is the roster, and MN-8 of table T-070 says this component was stood up to
// receive exactly the requirements those nine rows carry. ⛔ The `Time Ruler`
// (U-19) is NOT one of them, although it sits outside the `Row Area`:
// `_source/components.json` draws the edge "ruler and rows" from SvgRenderer to
// ScheduleLayout and gives this component no edge to ScheduleLayout at all. The
// same file is why `Rows` (U-1) and everything inside them are absent here.
//
// ⭐ WHAT MAY ARRIVE AS AN ARGUMENT is fixed by that same file: one import
// per outgoing edge, and the nine beside them are this folder's own units.
// ⛔ Nothing here may reach ScheduleLayout or ScheduleGeometry, which is why
// what only they can measure arrives as plain rectangles in `ScreenSession`.
//
// ⭐ WHERE A RECTANGLE APPEARS. A part carries one only where a requirement
// fixes its geometry; every other part names itself and its state and leaves
// the placing to the surface. ⛔ Whichever side judges a width does it with
// FR-093's estimate (FR-085, MUST) and never by measuring the glyphs.
//
// Chapter 5.3 (MUST NOT) keeps every other file in this folder unimportable
// from outside, so every published name -- the seam included -- leaves here.
//
// ⚠️ Table T-064 names four members for PI-37. The other names below are the
// parts of `ScreenView` and the arguments of its two functions: 5.3 puts the
// arguments and return values in `src/`, and its own MUST NOT means a caller
// cannot reach them anywhere but here.

// The one generated destination Chapter 6.2 (MUST) allows the words the screen
// prints. ⚠️ Read here for the ruler's seven weekdays alone; every other word
// reaches its own drawing unit, which is why this import is not shared.
import displayWords from './display-words.json'
import type { DialogueLog, DialogueMessage } from '../../entity/document-model/dialogue-log/dialogue-log'
import type { DocumentSettings } from '../../entity/document-model/document-settings/document-settings'
import type { Exception, Schedule, Task, WeekDay } from '../../entity/document-model/schedule/schedule'
import type {
  DualCursorSide,
  ScreenState,
} from '../../entity/document-model/screen-state/screen-state'
import type { Selection } from '../../entity/document-model/selection/selection'
import type {
  ScreenRect,
  ScreenRegions,
} from '../../entity/layout-engine/screen-regions/screen-regions'
import type { SettledUtterance } from '../../use-case/post-dialogue-message/post-dialogue-message'
import { appHeaderItemsFromDocument } from './app-header-items'
import { commandPaletteFromScreenState } from './command-palette'
import { dialogueFieldFromLog } from './dialogue-field'
import { confirmationFromSession, dismissKeyOf, noticesFromSession } from './notices'

// ⭐ NT-8's KEY CROSSES HERE AND NOWHERE ELSE. Table T-037 (MUST) lets a person
// put a telling away, and the side that OWNS the list of raised tellings is the
// shell (LY-5 of table T-060) -- so the shell has to be able to say which raised
// telling the key on the pressed entrance names. ⛔ It may not rebuild the key
// itself: that would be the same arithmetic in two places (rule 03 section 4),
// and the two spellings would drift the day NT-4's gathering changes.
// ⚠️ Named by table T-064's PI-37.
export { dismissKeyOf }
import { openModalFromScreenState } from './open-modals'
import { propertiesPanelFromSelection } from './properties-panel'
import { rowTitlePanelFromSchedule } from './row-title-panel'
import { screenFrameFromRegions } from './screen-frame'
import type { DialogueInput } from './screen-surface'
import { tooltipsFromScreenView } from './tooltips'

export type { DialogueInput, FieldCommit, ScreenPart, ScreenSurface } from './screen-surface'

// ---------------------------------------------------------------- shared ----

/**
 * A row of table T-109, e.g. `IC-7`.
 *
 * ⛔ AN ICON IS CARRIED BY ITS ROW ID AND NEVER BY A NAME INVENTED HERE.
 * Table T-109 deliberately has no English column, so a name minted here would
 * settle one the glossary has not.
 */
export type IconId = string

/**
 * A row of table T-024, e.g. `IO-2`.
 *
 * ⛔ NOT `IconId` UNDER A SECOND NAME. An entry is a row of table T-109 and
 * a format is a row of table T-024; the two tables number their rows
 * independently, so one type for both would let `IO-1` be passed where a table
 * T-109 row is meant and neither side could tell.
 */
export type ExportFormatId = string

/** `language` (S-99). FR-038 keeps it out of the document and admits two. */
export type DisplayLanguage = 'ja' | 'en'

/**
 * One entry a person can press, wherever table T-109 places it.
 *
 * ⚠️ Table T-109 also holds rows that are NOT buttons (IC-53, IC-54). Those
 * are not `CommandItem`s -- the ones that show a state reach the screen as the
 * state itself, such as `AppHeaderItems.openedFileName`.
 */
export interface CommandItem {
  readonly icon: IconId
  /** FR-029 (MUST): what cannot be used is drawn faint, not made quiet. */
  readonly isEnabled: boolean
  /**
   * A toggle that is on. FR-065 shows that the `Agent API` is open this way
   * (IC-20), and FR-072 shows which of its two contents the properties panel is
   * on (IC-17).
   */
  readonly isPressed: boolean
  /**
   * Whether this entry is the one that is ARMED (FR-053, MUST).
   *
   * ⛔ A MEMBER OF ITS OWN AND NEVER `isPressed`, which FR-053 (MUST NOT)
   * refuses in as many words. `isPressed` is a toggle that is on and is what
   * writes `aria-pressed`; an arm announced through it would be announced as a
   * pressed button, which is the very thing the requirement forbids.
   *
   * ⭐ WHICH ENTRY IS WHICH ARM IS TABLE T-109'S OWN FACT, and FR-053 says
   * so. That column reaches `src/` as the `arms` field of `icon-roster.json`,
   * so the join is the generated roster and nothing is minted here.
   *
   * ⚠️ ONLY A PALETTE ENTRY CAN EVER BE ARMED, and that is the table's fact
   * too -- its arm column holds an em dash for every row of every other
   * surface. The entries the other builders describe carry `false`.
   *
   * ⛔ THE COLUMN IS HALF THE JOIN, AND THE OTHER HALF IS DERIVED BESIDE IT.
   * The column names a ROW of table T-023b, and AR-2 stands against four
   * entries (IC-23 .. IC-26) and AR-3 against eight (IC-27 .. IC-34) -- so on
   * that column alone, arming one task shape marks all four and one milestone
   * glyph all eight, which is not the one entrance the MUST above asks for.
   * ⭐ `icon-roster.json` carries `armsShape` as well: which shape of the
   * kind an entrance arms, derived from table T-012 and from the spellings
   * `_source/erd.json` settles for `TaskVisual.shapeKind` and
   * `TaskVisual.milestoneGlyph`. UF-65 joins on the pair, so exactly one
   * entrance is armed.
   *
   * ⚠️ `CommandPalette.armedText` IS still no finer, and that one is the
   * table's own doing rather than a gap: the dictionary holds a word per ROW of
   * table T-023b, and those rows are the kinds of arm.
   */
  readonly isArmed: boolean
  /**
   * The accessible name of the entry, in the display language already.
   *
   * ⭐ WHERE THE WORD COMES FROM. FR-038 (MUST) now puts every word the screen
   * prints in one per-language dictionary, and Chapter 6.2 fixes its manuscript
   * as `_source/display-words.json`; `display-words.json` beside this file is
   * that dictionary generated into `src/`, keyed by the row of table T-109.
   * ⛔ THE WORDS ARE NOT WRITTEN YET -- every entry is empty, and the
   * unit that fills this member falls back to the empty string while it is.
   * ⚠️ The explanation EZ-2 shows is a SECOND word (`hint` of that dictionary),
   * not this one: UF-69 raises it and reads it for itself.
   */
  readonly label: string
}

// ------------------------------------------------------------ UF-61 ---------

/**
 * How the screen is carved up around the schedule (UF-61).
 *
 * ⚠️ The rectangles of the parts themselves are ScreenRegions' (PI-35) and are
 * NOT repeated here. What this adds is what only this component decides: the
 * bands and lanes that sit between those rectangles.
 */
export interface ScreenFrame {
  /** S-99f. FR-071 leaves by the entry it entered by, and IN-4a lets Esc through to the browser. */
  readonly isFullScreen: boolean
  /** U-24 `Panel Divider`, one per panel boundary. */
  readonly dividers: readonly PanelDivider[]
  /** U-21 `Scrollbars`. SC-4 (MUST): both of them, always, fitted or not. */
  readonly scrollbars: readonly Scrollbar[]
}

export interface PanelDivider {
  /** Which panel's width a drag on this band changes (FR-052). */
  readonly panel: 'rowTitlePanel' | 'propertiesPanel'
  /**
   * The band the pointer grabs. ⛔ FR-051 (MUST NOT): it takes no width from
   * the `Row Area` -- widening it for the sake of the hand would otherwise eat
   * the drawing area.
   */
  readonly band: ScreenRect
  /**
   * The boundary line. EP-9 of table T-076 keeps this in the export although the
   * control does not go, and makes it the same one line as `Group Grid Lines`
   * (MUST) -- ⛔ no new settled name and no new settings key for it.
   */
  readonly line: ScreenRect
}

export interface Scrollbar {
  readonly axis: 'horizontal' | 'vertical'
  /**
   * The lane. ⚠️ FR-051 (MUST) has it take its place from the `Row Area`, and
   * SC-4 is the reason: a bar that came and went would change the canvas width
   * and re-run the layout.
   */
  readonly track: ScreenRect
  /** Where the grip sits inside the lane. SC-4 keeps it drawn even when everything fits. */
  readonly thumb: ScreenRect
}

/**
 * What GR-21 of table T-023d divides to get the grip's length, per axis.
 *
 * ⭐ THE SHELL'S NUMBERS, CARRIED AND NOT MEASURED. All three are read
 * straight off the `ScheduleLayout` the loop already built this frame -- see
 * `ScreenSession.scrollExtent` for why they travel rather than being computed
 * where they are used. ⛔ Nothing here is a settings row and none may become
 * one: GR-21 (MUST NOT) refuses a new one, the ratio being derivable.
 */
export interface ScrollExtent {
  /** `ScheduleLayout.contentWidth` -- everything drawn, by table T-038's occupancy. */
  readonly contentWidth: number
  /**
   * `ScheduleLayout.contentHeight` -- ⚠️ THE SCROLLING ROWS ALONE.
   *
   * FR-098 lifts the pinned rows into a band that does not scroll, and LF-14 of
   * table T-221 leaves the rest of the `Row Area` to the ones that do, so the
   * layout measures this against that remainder and not against the whole
   * rectangle. `visibleHeight` beside it is that remainder.
   */
  readonly contentHeight: number
  /**
   * The height `contentHeight` is seen through: the scrolling remainder's, which
   * is the `Row Area`'s foot less the top edge LF-14 leaves the scrolling rows.
   *
   * ⛔ THERE IS NO `visibleWidth` BESIDE IT, and the absence is deliberate: the
   * horizontal counterpart is the `Row Area`'s own width, which UF-61 is handed
   * in `ScreenRegions` already. Carrying it here would put one number in two
   * places, which is what the lane's thickness is derived rather than passed for
   * (see the head of `screen-frame.ts`). ⚠️ The vertical one is NOT the `Row
   * Area`'s height, which is why it is here at all -- the pinned band stands
   * inside that rectangle and outside this measurement.
   */
  readonly visibleHeight: number
  /**
   * How far INTO the content the visible range begins, sideways then downwards.
   *
   * ⭐⭐ WHY THE PAIR IS HERE. GR-21 of table T-023d calls the grip an
   * INTERVAL inside the lane, and an interval has a start as well as a length:
   * the two members above answer how much of the whole is visible and say
   * nothing about WHERE in the whole that range stands. ⛔ UF-61 cannot work
   * it out for itself -- `ScheduleLayout.rows` and `placements` arrive already
   * slid while `contentWidth` / `contentHeight` / `contentX0` are measured
   * before the slide, and S-77 / S-78 / S-176 / S-177 of table T-203 name the
   * place in DAYS and ROWS, which that component has neither a calendar nor a
   * row list to turn into a fraction.
   *
   * ⭐ READ BACK OFF THE LAYOUT THE SHELL ALREADY BUILT, never measured
   * again -- the same bargain the three members above are carried by (ADR-001
   * runs table T-068 once a frame). ⛔ NO SETTINGS ROW IS OWED: GR-21
   * (MUST NOT) refuses one, and both are a difference between two numbers the
   * layout publishes.
   *
   * ⛔⛔ OPTIONAL, AND THE READING IS FIXED HERE: absent means NOT
   * SCROLLED, and zero is the same answer -- a document at its content's top
   * left corner puts the grip at its lane's start. ⚠️ So a caller that fills
   * neither gets exactly that picture rather than a wrong one.
   */
  readonly offsetX?: number
  /** The downwards half of `offsetX`; that member's note holds both. */
  readonly offsetY?: number
}

// ------------------------------------------------------------ UF-62 ---------

/** What stands in the `App Header` (U-31), which is UF-62's row of table T-075. */
export interface AppHeaderItems {
  /**
   * U-27 `Document Title` -- `Project.title` (AT-3), which FR-035 edits in
   * place. `null` is a document that has none.
   *
   * ⚠️ Never translated: it is the document's own value (FR-038). ⛔ FR-035
   * fixes `Untitled` for the BROWSER TAB and says nothing about what the header
   * shows for a null title, so nothing is substituted here.
   */
  readonly documentTitle: string | null
  /**
   * U-58 `Opened File Name` (FR-101) -- the name of the file the document is
   * open from. `null` is a document that has never been written to one.
   *
   * ⚠️ NOT `documentTitle` above (MUST NOT, FR-101): that is the document's
   * own value and this is the file's name, and the two differing is normal.
   */
  readonly openedFileName: string | null
  /**
   * U-59 `File Saved At` (FR-101) -- when that file was last written to.
   * `null` when it never has been, which FR-101 (MUST) has the drawing side
   * say in words rather than leave blank.
   */
  readonly fileSavedAt: string | null
  /**
   * What FR-101 (MUST) has the header say in place of a time when
   * `fileSavedAt` is `null`. ⛔ Resolved here rather than in the Framework
   * because FR-038 (MUST NOT) keeps printed words in the dictionary, which
   * this layer reads and `dom-screen-surface.ts` may not.
   */
  readonly fileNeverSavedText: string
  /**
   * U-35 `Header Commands` -- the rows of table T-109 whose surface column
   * reads `App Header`, in that table's own order.
   *
   * ⛔ WHICH ROWS THOSE ARE IS NOT DECIDED HERE and must not be typed out in
   * UF-62 either: table T-109 counts itself (FR-029 forbids the requirement to
   * state the number), and rule 03 forbids copying a value the specification
   * holds. ⭐ THE GAP IS CLOSED: `icon-roster.json` beside this file is table
   * T-109 generated into `src/`, the way `settings.json` reaches
   * `SETTINGS_DEFAULTS`, and UF-62 walks it -- so membership, print order and
   * count all arrive from where they live and no copy can go stale in silence.
   */
  readonly commands: readonly CommandItem[]
  /**
   * FR-038 (MUST): which language is on NOW, readable BEFORE the entry at the
   * top of the screen is pressed -- the header's half of the same MUST
   * `HelpModal.language` carries for the help, and declared the same way.
   *
   * ⛔ `CommandItem` cannot carry it. `isPressed` is a toggle that is ON, and a
   * choice between two languages has no off; `label` is the entry's accessible
   * NAME, printed IN the language rather than saying WHICH one is on. The entry
   * itself (IC-21) stands in `commands`, which is where FR-038 puts the first of
   * its two entrances.
   *
   * ⚠️ Carried, never chosen here: it arrives in `ScreenSession.language`
   * (S-99), the same value UF-60 puts in `ScreenView.language`.
   * ⭐ It is also what makes the header REDRAW on a switch: the header is
   * rebuilt from this member's description alone, and while every word is empty
   * a switch moves no label.
   */
  readonly language: DisplayLanguage
}

// ------------------------------------------------------------ UF-63 ---------

/** U-22 `Row Title Panel` and U-23 `Row Title Tree` (UF-63). */
export interface RowTitlePanel {
  /**
   * U-46 `Pinned Row`. FR-098 (MUST) lifts these out of the scrolling list and
   * holds them at the top, and ⛔ forbids the same row to appear at its natural
   * place as well (MUST NOT) -- drawn twice, one row would be counted twice by
   * the lane assignment (FR-003) and by the fit (FR-055).
   */
  readonly pinnedTitles: readonly RowTitle[]
  /** The rest, in the order they are drawn. */
  readonly titles: readonly RowTitle[]
  /**
   * Whether IC-74 -- HF-10 of table T-051, HR-1 of table T-015 -- has anything
   * left to do: some row of the DOCUMENT is folded.
   *
   * ⭐ FR-029 (MUST) draws faint an entrance a press would change nothing
   * by, and says the rule reaches every row of table T-109 with no surface
   * exempt (MUST NOT) -- so the two entrances the PANEL draws for itself are
   * judged exactly as the three `RowExpander` draws per row are.
   * ⛔ THE DOCUMENT'S ROWS AND NOT THE DRAWN ONES. HR-1 opens every row
   * there is, however the display amount (FR-018) left the picture, and the
   * command it plans reaches the same set -- so a judgement made on what
   * happens to be drawn would call the entrance spent while rows it acts on
   * stand folded.
   *
   * ⛔⛔ ABSENT WHERE THIS PANEL DESCRIBES NO ROW AT ALL, and that is the
   * same shape the pair already has on the drawing side: `data-corner-band` is
   * left off then too, because there is no first row to measure the band from.
   * With no row on the screen there is nothing for either entrance to reach
   * that a person can see, and claiming either way would be a claim about a
   * picture with nothing in it.
   * ⚠️ ABSENT IS NOT "spent". A reader of this member draws the entrance as
   * usable when it is missing -- `commandStateOf` states the same rule for the
   * header: faint is a claim that pressing would achieve nothing, and a false
   * claim of that is the worse error.
   *
   * ⛔⛔ OPTIONAL, AND THE FORGETTING IS SILENT. It is declared optional
   * so that the `RowTitlePanel` literals already written go on compiling; the
   * cost is that a builder which never fills it leaves both entrances drawn as
   * usable with nothing to say so.
   */
  readonly canOpenEveryRow?: boolean
  /**
   * Whether IC-78 -- HF-12 of table T-051, HR-2 of table T-015 -- has anything
   * left to do: some row of the document is NOT folded.
   *
   * ⛔ NOT `canOpenEveryRow` INVERTED, for the reason `RowExpander` gives about
   * its own pair: a document whose rows are partly folded leaves BOTH entrances
   * with something to do, and one with no rows at all leaves NEITHER.
   *
   * ⚠️ IT NOW READS S-211 AS WELL. HR-2 of table T-015 (MUST) has this
   * entrance fold level 0 itself, so it is spent where level 0 is ALREADY
   * folded -- and, level 0 answering exactly as a row does, where the picture
   * holds no row of the shallowest level for the head to take away. ⭐ That
   * second half is `RowExpander.canCloseBelow` read one level up.
   */
  readonly canCloseEveryRow?: boolean
  /**
   * Whether IC-92 -- HF-16 of table T-051, HR-7 of table T-015 read at level 0
   * -- has anything left to do: the head is folded (S-211 of table T-206), or a
   * row of the shallowest level is hidden and would come back.
   *
   * ⭐ TWO THINGS ONE PRESS DOES, and both come from the rows that name it.
   * HR-2 (MUST) sends the head's one-level-open back to the shallowest level,
   * and HR-6 (MUST) makes it the way back for a top-level row with no parent --
   * so it undoes BOTH the head's fold and the hiding of such a row.
   * ⛔ IT IS NOT `canOpenEveryRow` NARROWED. HF-16 (MUST NOT) refuses to let
   * HF-10 carry it, for HF-13's reason: an entrance that opens a different
   * amount each press cannot be read before it is pressed.
   *
   * ⛔⛔ OPTIONAL AND SILENTLY FORGOTTEN, the same bargain the two above
   * take.
   */
  readonly canOpenLevelZero?: boolean
  /**
   * HF-12 of table T-051 (MUST): how many rows the head is holding folded away
   * right now.
   *
   * ⭐ WHY IT EXISTS, in that row's own words: without it a reader cannot
   * tell a row that went away from one that was folded. With level 0 folded the
   * panel can stand empty, and an empty panel and a document with no rows look
   * exactly alike.
   * ⛔ NOT SUBJECT TO HF-6 (MUST): the count is not a control and is not
   * drawn only while the pointer is on a row -- HF-18 states that exemption for
   * the row's own count and this is the same number one level up.
   * ⚠️ ZERO IS "nothing is folded away" and is not drawn as a count; the
   * drawing side decides that, and `undefined` is a description that did not
   * answer.
   */
  readonly foldedRowCount?: number
}

export interface RowTitle {
  /** `TaskGroup.id` (AT-51). */
  readonly groupId: string
  /** Depth 1 is a root row. FR-004 caps it at `maxGroupDepth` (S-125). */
  readonly depth: number
  /**
   * Where the row is drawn.
   *
   * ⭐ It comes from `ScreenSession.rowBoxes`, not from a measurement made
   * here: SC-1 slaves the panel to the body vertically, so the panel and the
   * `Row Area` have to be the SAME numbers rather than two computations of
   * them, and ScheduleLayout -- which holds them -- is not a component this one
   * may read.
   */
  readonly box: ScreenRect
  /**
   * How far the name is set in from the panel's left edge: `depth` x
   * `rowTitleIndent` (S-37), the same product FR-085 subtracts before cutting
   * the name.
   *
   * ⭐ CARRIED RATHER THAN RECOMPUTED. `DocumentSettings` does not cross IF-9,
   * so a surface that drew its own indent picked a number FR-085 had not cut
   * against -- the screen used one em where the cut used S-37, and the export
   * used S-37, so the same row was indented three ways. Answering it once, here,
   * where the cut is made, is what keeps the cut and the indent one number.
   *
   * ⚠️ The depth's own multiple, not one step fewer -- see
   * `availableLabelWidthPx`, and S-79's lower bound, which pays a root row one
   * indent rather than none.
   */
  readonly indentPx: number
  /**
   * The name the row is shown by, after FR-085's truncation, or `null` where
   * none could be resolved.
   *
   * ⭐ TWO COLUMNS CAN HOLD IT. `TaskGroup.label` (AT-53) where the row carries
   * one; where it does not, FR-058 (MUST) shows the name of the `Task` the row
   * was derived from (`derivedFromTaskUid`, AT-54). ⛔ FR-058 also forbids a row
   * with neither (MUST NOT), and AT-54 carries that same rule as a document
   * invariant -- so `null` here is either a document that broke one of them or a
   * derivation whose `Task` has no name of its own (AT-27).
   *
   * ⛔ FR-085 fixes the width it is cut to: `rowTitlePanelWidth` (S-79) less the
   * indent for its depth (`rowTitleIndent`, S-37) less the room kept for the
   * controls -- and that room does NOT change with whether the controls are
   * drawn (MUST NOT), because the export does not draw them (EP-4) and the cut
   * would then land in two places. ⛔ `truncateUnits` (S-35) is the wrong value
   * here; FR-085 says so in as many words.
   */
  readonly label: string | null
  /**
   * The same name BEFORE FR-085's cut -- the whole of it, which that
   * requirement (MUST) shows in a tooltip -- or `null` where none could be
   * resolved.
   *
   * ⭐ IT IS THE RESOLVED NAME, NOT `TaskGroup.label` (AT-53) AS STORED. Where
   * the row carries none, FR-058 (MUST) shows the name of the `Task` it was
   * derived from (AT-54, whose name is AT-27), and the whole of what a reader
   * was shown is the whole of THAT name. ⭐ It is resolved once, here, rather
   * than a second time by whoever raises the tooltip: FR-058's substitution
   * stated twice is a rule that can drift.
   *
   * ⭐ IT IS FILLED WHETHER OR NOT THE NAME WAS CUT, so no caller has to ask a
   * second question to learn the row's name. The three cases are:
   *
   * ```
   * no name resolved  wholeLabel null   label null          isLabelTruncated false
   * name that fits    wholeLabel === label                  isLabelTruncated false
   * name that was cut label is its leading part             isLabelTruncated true
   * ```
   *
   * ⛔ `isLabelTruncated` is exactly `wholeLabel !== null && wholeLabel !== label`.
   * The flag stays because it is the question a tooltip asks, not because it can
   * ever answer differently from these two.
   *
   * ⚠️ It is the WHOLE name and not the tail that was dropped. FR-085 asks for
   * the name shown in full, and a tooltip built from the tail alone would show
   * the end of a name whose beginning the reader cannot see beside it.
   */
  readonly wholeLabel: string | null
  /**
   * FR-085 (MUST): a name that did not fit is cut, and shown whole in a tooltip.
   * This is HALF of what that tooltip is raised on and `wholeLabel` above is
   * what it shows. ⛔ THE OTHER HALF IS THE POINTER. FR-085 now states the
   * condition in as many words -- the explanation stands only while the pointer
   * is on that row's name or the row has focus (MUST), and never merely because
   * the name was cut (MUST NOT) -- so a caller reading this member alone would
   * raise one per truncated row on the frame the document opens on, which is
   * exactly what was measured before that condition existed. UF-69 answers the
   * pointer half; the focus half has no member to read yet and carries a STOP
   * there.
   */
  readonly isLabelTruncated: boolean
  /**
   * U-47 `Row Expander` -- the three controls HF-1 of table T-051 (MUST) puts
   * on every row, every one of them, always.
   *
   * ⛔⛔ NON-NULLABLE, AND THE ABSENCE OF A NULL IS THE POINT. HF-1
   * places the three on every row with no exception; the closing paragraph
   * under table T-051 (MUST) reads an empty target as a STATE OF THE THREE and
   * not as their absence; FR-029 (MUST) then draws that state faint and
   * (MUST NOT) forbids disabling it, because the press is what raises `RS-28` /
   * `RS-29` / `RS-30` of table T-233; and FR-085 (MUST NOT) refuses to change
   * the room kept for them by whether they are drawn.
   * ⭐ A NULLABLE MEMBER COSTS A LIVE DEFECT: a leaf row draws no IC-58,
   * IC-59 or IC-77 at all, so `RS-28` -- whose whole situation IS that row --
   * can never be told to anybody.
   */
  readonly expander: RowExpander
  /**
   * Whether IC-90 -- HF-13 of table T-051, HR-7 of table T-015 -- has anything
   * left to do on this row: a DIRECT child of it is out of the picture, which
   * this press would put back. ⭐ HF-13 (MUST) words the spent side itself
   * and table T-233's RS-30 tells it in the same words.
   *
   * ⛔⛔ NOT A FOURTH MEMBER OF `RowExpander`, AND THE REASON IS THE ROW
   * IT COMES FROM. Those three are HF-1's and are written by HF-2 / HF-3 /
   * HF-11; this one is HF-13's, which (MUST) makes it a separate entrance from
   * HF-2 and (MUST NOT) lets one control be both. ⚠️ A leaf row carries
   * BOTH -- the three with none armed, and this one false.
   *
   * ⭐ ONE LEVEL AND NOT THE SUBTREE, which is the whole of why HF-13 (MUST)
   * is a separate entrance from HF-2: an entrance that opens a different amount
   * each press cannot be read before it is pressed. So this is not
   * `RowExpander.canOpen` narrowed -- the two answer different questions and a
   * row can leave one with work and the other without.
   *
   * ⛔ IT IS THE ROW'S OWN FOLD THAT COMES OFF, NOT ITS CHILDREN'S. HR-7
   * (MUST) unfolds the chosen `TaskGroup` alone and (MUST NOT) touches anything
   * below its grandchildren -- HR-1a has already left every descendant folded,
   * so one fold taken off reveals exactly one level.
   * ⛔⛔ A FOLDED ROW WITH NO CHILD AT ALL IS SPENT ALL THE SAME. Taking
   * the fold off it puts no row into the picture, and the closing rule under
   * table T-051 (MUST) counts the difference in drawn rows and not the flag.
   *
   * ⛔⛔ OPTIONAL, AND THE FORGETTING IS SILENT, the same bargain
   * `RowTitlePanel.canOpenEveryRow` takes and for the same reason: the
   * `RowTitle` literals already written go on compiling. ⚠️ ABSENT IS NOT
   * "spent" -- a reader draws the entrance as usable when it is missing,
   * because a false claim of faint is the worse error.
   */
  readonly canOpenOneLevel?: boolean
  /**
   * Whether IC-91 -- HF-14 of table T-051, HR-8 of table T-015 -- can add a row
   * under this one: the row is not already at the depth `maxGroupDepth` (S-125)
   * allows.
   *
   * ⭐ THE ONLY THING THAT SPENDS IT. FR-029 (MUST) draws an entrance faint
   * where a press would change neither the document nor the picture, and adding
   * a row always changes the DOCUMENT -- so this entrance is spent only where
   * the write itself is refused. FR-085 (MUST NOT) is the one such refusal, at
   * the depth cap, which `createTaskGroup` already answers on its own account.
   * ⛔ HR-8 (MUST NOT) forbids restating the cap here, so what is read is
   * FR-085's own value and no second rule.
   *
   * ⚠️ A FOLDED ROW STILL ARMS IT. The row added under a folded parent is
   * not drawn (HR-1a), but the document changed, and FR-029 spends an entrance
   * only where NEITHER moved. ⛔ So the closing rule under table T-051 does
   * not reach this one: that rule names the six entrances that move rows in and
   * out of the picture, and this one makes a row.
   *
   * ⛔⛔ OPTIONAL AND SILENTLY FORGOTTEN, exactly as `canOpenOneLevel` above.
   */
  readonly canAddChildRow?: boolean
  /**
   * HF-18 of table T-051 (MUST): how many rows this one is holding folded away.
   *
   * ⭐ THE SAME NUMBER `RowTitlePanel.foldedRowCount` HOLDS FOR LEVEL 0, and
   * HF-18 says so. ⭐ THE ROW IS ALSO MARKED, which that row makes a second
   * MUST -- a count alone leaves a reader searching for which row carries it --
   * and the colour is S-153 of table T-236. ⛔ Both are the drawing side's
   * to lay out; what crosses here is the count, and a count above zero IS the
   * row that carries the mark.
   * ⛔ NOT SUBJECT TO HF-6 (MUST NOT): drawn only under the pointer, the
   * count would have to be hunted for row by row.
   *
   * ⚠️ A ROW HR-6 HID IS NOT ONE OF THEM. HF-18 counts rows folded AWAY BY
   * THIS ROW, and hiding is the other operation -- a hidden row put itself
   * away.
   *
   * ⛔⛔ OPTIONAL AND SILENTLY FORGOTTEN, exactly as `canOpenOneLevel`
   * above.
   */
  readonly foldedRowCount?: number
  /**
   * Which axis GR-20's grab has settled on while THIS row is the one held, or
   * `null`/absent on every row that is not held.
   *
   * ⭐ WHAT IT IS FOR (HF-15, MUST): the held row is drawn with a band along
   * the two edges that say which axis is live -- S-151 for up and down, S-152
   * for left and right, both of table T-236. ⭐ The same row also lays a
   * ground under the held row (MUST), and this is what says which row that is.
   * ⛔ WHY IT IS DRAWN AT ALL: undrawn, a drag against an axis that cannot
   * move is indistinguishable from a broken control -- FR-029's rationale, read
   * on a drag.
   *
   * ⚠️ SPELLED OUT RATHER THAN IMPORTED. `RowGrabAxis` is the translator's
   * name and Chapter 5.3 keeps this component out of that one; the two
   * spellings are the same two words, and the seam that carries them
   * (`ScreenSession.rowGrabbedAt`) is where they meet.
   */
  readonly heldOnAxis?: 'position' | 'depth' | null
  /** U-48 `Row Pin` (FR-098). Its control sits on every row, and the same one lets go. */
  readonly isPinned: boolean
  /**
   * FR-085 (MUST): rows are selected in this panel. ⚠️ This is NOT the set table
   * T-023c governs -- SL-1 leaves rows out of the drawing area's selection on
   * purpose, so the two sets are separate.
   */
  readonly isSelected: boolean
}

/*
 * ⛔ NO MEMBER CARRIES A SET-DOWN, and none may be added. HF-5 of table T-051
 * (MUST) levels a row's controls WITH THE TOP OF ITS NAME and forbids both
 * centring them and setting them down (MUST NOT), so there is no amount left
 * for a row to state.
 */

/**
 * HF-1 of table T-051: every row carries a control that HIDES it, one that
 * opens everything under it, and one that closes everything under it.
 * ⚠️ They are not one control in three states: HF-2 opens the whole subtree
 * (HR-3 of table T-015), HF-3 hides the row ITSELF (HR-6) and HF-11 folds the
 * subtree (HR-4), so any of the three can be spent while the others are not.
 * ⚠️ HR-4 has no entrance of its own; HF-1 records why -- one press of HF-11
 * reaches the same picture.
 */
export interface RowExpander {
  /**
   * HF-2: this row is holding something folded away, or a row below it is
   * hidden -- HR-3 of table T-015 reaches the chosen `TaskGroup` and everything
   * under it, so the row's OWN fold counts.
   *
   * ⭐ HF-2 (MUST) TIES IT TO HF-18's NUMBER: a row holding nothing folded
   * is drawn faint, and the number HF-18 shows and the arm here stand on the
   * one same condition.
   */
  readonly canOpen: boolean
  /**
   * HF-3: this row can be hidden, which is HR-6 of table T-015.
   *
   * ⭐ TRUE ON EVERY ROW THE PANEL DRAWS, and that is not a member left
   * unfilled. Hiding a drawn row takes that row -- and everything under it --
   * out of the picture (HR-6, MUST NOT), so the closing rule under table T-051
   * counts at least one row of difference on any row that is drawn.
   */
  readonly canClose: boolean
  /**
   * HF-11: the picture holds a child of this row, so folding THIS row (HR-4)
   * would take one away.
   *
   * ⛔ ONE HOP AND NOT A SUBTREE. HR-4 (MUST) folds the chosen `TaskGroup`,
   * which stops its direct children and everything under them being drawn, so
   * the question is this row's own children and not the folds of the rows
   * below.
   * ⛔ NOT THE INVERSE OF `canOpen`. That one asks whether anything is folded
   * away at or below this row, and a row can hold a folded descendant and a
   * drawn child at once -- so on most rows the two are true together.
   */
  readonly canCloseBelow: boolean
}

// ------------------------------------------------------------ UF-64 ---------

/** U-25 `Properties Panel` (UF-64). `null` in `ScreenView` when it is closed. */
export interface PropertiesPanel {
  /**
   * FR-072: the LAST thing the person did decides which of the two the panel
   * shows. ⚠️ Clearing the selection does not move it to the settings (MUST
   * NOT).
   *
   * ⛔ AND IT IS THE ONLY MEMBER THAT SAYS WHICH OF THE TWO IS UP. FR-072
   * (MUST) has the pressed state of the entrance tell a reader that, and (MUST
   * NOT) forbids a heading row at the head of the panel -- so no word is
   * carried for one and the two entrances read this member instead.
   */
  readonly showing: 'selection' | 'documentSettings'
  /**
   * FR-072 (MUST): when the selection went away the panel KEEPS the fields it
   * had. True is that state.
   *
   * ⚠️ NOTHING ON THE SCREEN SAYS SO ANY MORE -- FR-072's RATIONALE records
   * that as the price knowingly paid: the panel goes on showing what it had
   * without marking it as the previous subject. This member stays because it
   * is still the state, and a check reads it back.
   *
   * ⭐ WHAT IS KEPT IS THE SUBJECT, NOT THE DRAWN FIELDS. FR-072 also says that
   * pressing the same entry again brings the panel back to what was selected
   * before, so the thing to remember is the subject; the fields are worked out
   * from the document each frame, and keeping the drawn ones would go on showing
   * values that an edit had already made untrue. `ScreenSession.propertiesSubject`
   * is that memory.
   */
  readonly isSubjectGone: boolean
  /**
   * The items of the subject `showing` names, or the drawing settings.
   *
   * ⚠️ THREE ROSTERS, NOT TWO. FR-006 gives table T-016's items for a selected
   * `Task`; FR-042 gives a selected ROW its name (AT-53), its band colour
   * (AT-58) and its height (AT-59); and the settings side is table T-104's keys.
   * All three are `showing: 'selection'` except the last -- FR-072 knows only
   * two panels.
   *
   * ⭐ THE FIRST TWO ARE BOTH TABLE T-016's. That table carries a subject
   * column and rows PR-18 .. PR-20 for a row's three, so FR-006 (MUST) prints
   * only the rows whose subject matches what is selected and (MUST NOT) forbids
   * the others -- which is what keeps a row's `height` off a task's panel now
   * that one table holds both.
   */
  readonly fields: readonly PropertyField[]
  /**
   * The entries table T-109 places on this surface, in that table's own order.
   *
   * ⭐ THE SAME MEMBER NAME `AppHeaderItems` AND `OpenModal` CARRY, and filled
   * the same way: FR-029 (MUST) makes that table's 面 column the whole of the
   * placement, so the roster generated into `src/` is read and no row is minted.
   * ⚠️ Today the column places exactly one row here -- the one that closes an
   * open surface, on IN-4's authority (table T-028) -- but the count is the
   * table's to change and nothing here holds it.
   *
   * ⛔ NOT A SECOND WAY TO CLOSE THE PANEL. FR-029 (MUST NOT) forbids one
   * operation two entrances on the screen, and `Esc` is a keystroke rather than
   * an entrance -- IN-4 is the authority BOTH of them answer to.
   */
  readonly commands: readonly CommandItem[]
}

export interface PropertyField {
  /**
   * The row that holds this item: `PR-n` of table T-016 (a `Task`, FR-006),
   * `AT-58` / `AT-59` of table T-058 (a row's colour and height, FR-042), or
   * `K-n` of table T-104 (the settings).
   *
   * ⚠️ FR-042's THREE NAME THEIR ATTRIBUTE ROW AND NOT THEIR `PR-n`. Table
   * T-016's own note for PR-18 settles it -- the item is the panel's way of
   * showing `AT-53`, and table T-023's `MK-13` names the attribute row -- and
   * FR-085 (MUST) calls the field by that row where it says the double click
   * focuses it. ⛔ The shell asks for a field BY THE ROW IT DECLARES (IF-9),
   * so declaring the `PR-n` would put that entrance's target out of reach.
   * ⚠️ THE `PR-n` IS STILL THE JOIN TO EVERYTHING ELSE about the item -- its
   * shown name, its print order, its subject and its read-only mark are all
   * keyed by it. Only what the FIELD declares is the attribute row.
   */
  readonly row: string
  /**
   * The name table T-016's row shows, which FR-038 (MUST NOT) keeps in the
   * dictionary under that row's id and NOT in the table.
   *
   * ⚠️ IT IS TRANSLATED (FR-038, MUST). ⛔ Task names and row names are
   * the document's own and are never translated.
   */
  readonly name: string
  /** The value written out for the screen. */
  readonly text: string
  /** ⛔ Table T-016 marks some read-only -- PR-9 `percentComplete` is derived (FR-012). */
  readonly isEditable: boolean
  /**
   * The controls this field is edited through -- one per COLUMN, where `name`
   * and `text` are one per ROW.
   *
   * ⭐ WHY THE TWO COUNTS DIFFER. Four rows of table T-016 hold several columns
   * and write their item names into ONE cell with " / " between them, so the
   * field stays the row (which is what the table's read-only mark is per) while
   * a person edits one column at a time. `PR-3` is `start` AND `finish`, and a
   * single control could not carry two dates.
   *
   * ⛔ EMPTY IS NOT "NOT EDITABLE". It means this side has no control to offer
   * for the item -- the settings roster and FR-074's surface are both drawn
   * from fields with none -- and the surface then writes the value out as text
   * the way it did before any control existed. `isEditable` is still table
   * T-016's own mark and is unaffected.
   */
  readonly controls: readonly PropertyControl[]
}

/**
 * The form one control takes, which is table T-016's 入力の型 column.
 *
 * ⛔ THE CHOICES, THE BOUNDS AND THE DATES ARE NOT HERE. The paragraph under
 * that table (MUST NOT) forbids copying them into it, saying that
 * `_source/grs-document.schema.json` and `DATE_COLUMNS` already hold them --
 * so `COLUMN_SHAPES` and `DATE_COLUMNS` are where a control's answer comes
 * from, and the same paragraph says table T-016 newly holds only two things:
 * which columns are colours and which are multi-line.
 */
export type PropertyControlKind =
  /** 文字 */
  | 'text'
  /** 複数行 -- the second of the two the table itself states (PR-2). */
  | 'multiline'
  /** 日付 -- `DATE_COLUMNS` is what says which columns these are. */
  | 'date'
  /** 数値 */
  | 'number'
  /** 真偽 */
  | 'boolean'
  /** 選択 -- `COLUMN_SHAPES` is what holds the candidates. */
  | 'choice'
  /** 色 -- the first of the two the table itself states (PR-12). */
  | 'color'

/**
 * One control of a field, and the column behind it.
 *
 * ⚠️ `text` here is the ONE column's value, where `PropertyField.text` is the
 * row's several joined -- so nothing has to be split back apart on the drawing
 * side, which would need to know the separator this component chose.
 */
export interface PropertyControl {
  /**
   * What the value committed in this control is about, which is how a commit
   * names the field it came from.
   *
   * ⭐ A VALUE AND NOT A SPELLED KEY. The surface hands it straight back on
   * `ScreenSurface.readFieldCommit`, so no string is parsed anywhere: a key
   * written as `PR-3:start` would have to be taken apart again by the side that
   * turns it into a command, and a row id that happened to hold the separator
   * would take it apart wrongly.
   */
  readonly key: PropertyFieldKey
  readonly kind: PropertyControlKind
  /** The one column's value, written out the way `PropertyField.text` is. */
  readonly text: string
  /**
   * The WORDS a `choice` control offers, `null` for every other kind.
   *
   * ⛔ Never written out here: the paragraph under table T-016 (MUST NOT)
   * forbids that table to hold a roster of candidates, so an enumeration's
   * candidates come from `COLUMN_SHAPES` and a roster that is the document's own
   * (PR-15's tasks, PR-16's people) is walked off the document.
   *
   * ⚠️ WHAT IS SHOWN, WHICH IS NOT ALWAYS WHAT IS COMMITTED. AS-6 of table
   * T-225 (MUST / MUST NOT) has the panel show a name and write a `uid`, so a
   * candidate's word and a candidate's value are two things -- `choiceValues`
   * carries the second where they differ.
   */
  readonly choices: readonly string[] | null
  /**
   * What each candidate of `choices` COMMITS, one per candidate and in the same
   * order -- absent where every candidate commits the word it shows.
   *
   * ⭐ AS-9 OF TABLE T-225 (MUST) IS WHERE IT CAME FROM: choosing a person
   * in the panel assigns to THAT `uid`, while AS-6 (MUST NOT) forbids making a
   * person read one -- so the value has to ride beside the word rather than
   * inside it. ⚠️ AS-8 (MUST NOT) forbids two same-named people to be
   * merged, and AS-9 calls this panel the only place they can be told apart, so
   * two candidates may legitimately show the same word while carrying different
   * values.
   *
   * ⭐ TWO ITEMS USE IT NOW, AND THE SECOND STANDS ON A DIFFERENT ROW. PR-15's
   * candidates are the document's own tasks, whose key AT-24 of table T-058
   * calls one 値から意味を読まない -- a chooser whose words were uids would ask a
   * person to pick a parent by a number the specification itself calls
   * meaningless, so the name is the word and the uid is the value there as
   * well. ⚠️ Two tasks of one name are two candidates for the same reason two
   * people of one name are: the key is what tells them apart.
   *
   * ⛔ ABSENT RATHER THAN `null` WHERE THERE IS NOTHING TO CARRY: a control
   * whose words are its values says so by not answering the question, and every
   * surface reads it as the words themselves.
   */
  readonly choiceValues?: readonly string[]
  /**
   * The words a PARTIAL-MATCH SEARCH standing beside this chooser offers --
   * absent on every control that has none.
   *
   * ⭐ AS-5 OF TABLE T-225 (MUST) IS THE WHOLE OF IT: the panel chooses from
   * a roster, with a dropdown and a partial-match search ATTACHED. The dropdown
   * is `choices`, and this is the second of the two -- attached, so it stands
   * BESIDE the chooser rather than replacing it.
   * take AS-9 (MUST) away: a search settles a NAME, and a name is what two
   * same-named people share, so the chooser carrying `choiceValues` is the only
   * surface that can still tell them apart.
   *
   * ⛔ NOT A KIND OF ITS OWN. FR-006 (MUST) has a control's form follow table
   * T-016's 入力の型 column, and PR-16's reads 選択 -- so the form stays the
   * chooser `PropertyControlKind` already names, and the search is an addition
   * hung on it rather than an eighth form invented beside the table's seven.
   *
   * ⛔ WORDS AND NOT VALUES, WHICH IS WHY THEY ARE HELD APART FROM `choices`.
   * What a person types is what they settle, so a search commits a NAME and the
   * write side reads it as AS-7 / AS-8 / AS-10 do -- AS-8 (MUST) is what settles
   * a name two people carry, and it is also why one word is offered once here
   * where `choices` offers a candidate per person.
   *
   * ⚠️ WHETHER THE MATCH IS ON A FRAGMENT IS THE HOST'S ANSWER, not this
   * component's: FR-029 has the drawing side follow the environment's own
   * conventions and reach for the host's roster control, and no rule of this
   * side could narrow a list it does not draw.
   */
  readonly searchWords?: readonly string[]
  /** A `number` control's bounds, where the schema states them. */
  readonly min: number | null
  readonly max: number | null
  /**
   * How much room this control needs, as a MULTIPLE OF ITS OWN FONT SIZE.
   *
   * ⭐ FR-006 (MUST NOT) forbids giving a control less room than its value
   * needs, and states that room as FR-093's estimate plus S-199 of table
   * T-206 -- FR-093's unit count times the font size times `labelCoef`, plus
   * what the frame, the padding and the host's own input aids take.
   *
   * ⛔ A MULTIPLE AND NEVER A PIXEL COUNT, which is the whole shape of this
   * member. Both terms of that sum are proportional to the font size, and
   * FR-006 (MUST NOT) refuses to let the room be held as a px constant for
   * WCAG 2.1's 1.4.4: a room that does not double when the reader doubles
   * their text leaves the panel behind. ⚠️ And the font size is not knowable
   * here at all -- FR-006 has it as S-197 times the size the HOST gives, which
   * lives past IF-9 -- so a px answer could not be reached even if it were
   * wanted.
   *
   * ⛔ CARRIED RATHER THAN RECOMPUTED. `labelCoef` (S-30) is a document
   * setting and the drawing side does not read the document (table T-061), so
   * FR-006 (MUST / MUST NOT) has the estimating side work this out and forbids
   * the drawing side a coefficient of its own -- two copies of one estimate
   * part company the moment S-30 moves, and FR-093 rests on that one value
   * deciding layout accuracy by itself.
   */
  readonly widthInFontSizes: number
}

/**
 * Which column of which thing one control edits.
 *
 * ⭐ THE SUBJECT RIDES ALONG, and it has to. IF-9 fixes the declared row id
 * as what comes back, and a row id alone says `PR-1`
 * without saying whose name it is -- the side that turns a commit into a
 * command would have to work the subject out a second time from the selection,
 * which is the rule FR-072 and table T-023c hold and which this component
 * already applied when it DREW the field. Two readings of one rule drift
 * (rule 03 section 4), so the answer is carried rather than recomputed.
 *
 * ⛔ NO MEMBER FOR THE SETTINGS. Table T-104's side has no control this round,
 * so no key names one; `properties-panel.ts` records why.
 */
export type PropertyFieldKey =
  | {
      readonly holder: 'task'
      readonly uid: number
      readonly column: keyof Schedule['tasks'][number] & string
    }
  | {
      readonly holder: 'taskVisual'
      readonly uid: number
      readonly column: keyof Schedule['taskVisuals'][number] & string
    }
  | {
      readonly holder: 'taskGroup'
      readonly groupId: string
      readonly column: keyof Schedule['taskGroups'][number] & string
    }
  | {
      /**
       * ⚠️ A `Dependency` is not a row of its own: it hangs off the task it
       * runs TO, which is why the far end and the position within that task's
       * list are what name it -- the same pair `ItemRef` names one by.
       */
      readonly holder: 'dependency'
      readonly successorUid: number
      readonly ordinal: number
      readonly column: keyof Schedule['tasks'][number]['dependencies'][number] & string
    }
  | {
      /**
       * The document's own `Project` -- the one holder that carries no id,
       * because a document holds exactly one of them.
       *
       * ⭐⭐ WHY THERE IS A FIFTH ARM AT ALL. IF-9 of table T-065 returns
       * the settled value with the ROW ID the field declares, and says that row
       * id is not confined to table T-016 -- the header's document-name field
       * declares `U-27` of table T-103. So a field that is NOT on the
       * `Properties Panel` settles on that seam, and the subject it names is
       * the document itself; FR-035 (MUST) is what draws it.
       * ⛔ NOT A ROW OF TABLE T-016, AND NO ROW IS ADDED TO IT. FR-074
       * (MUST NOT) keeps the document name out of the basic-information surface
       * in as many words, naming FR-035 as its one entrance -- so what names
       * this field is the row of table T-103 the header draws.
       */
      readonly holder: 'project'
      readonly column: keyof Schedule['project'] & string
    }
  | {
      /**
       * One `CommentBox`, named by the `string` id AT-110 of table T-058 makes
       * its primary key -- the same id `ItemRef` names a picked box by.
       *
       * ⭐⭐ WHY THERE IS A SIXTH ARM: `PR-21` of table T-016, whose
       * subject is `CommentBox` and whose column is `text`. `MK-13` of table
       * T-023 (MUST) sends a double click on a box to that field and (MUST NOT)
       * allows a typing box over the figure itself; FR-006 (MUST) then puts a
       * control of that input kind on the field, and a control carries this key
       * -- so without an arm that can name a box, the row could be drawn but
       * never typed into.
       * ⛔ AN `id` AND NOT A `uid`: a comment box has no integer key. AT-110
       * makes the id a `string`, which is why this arm is shaped like the
       * `taskGroup` one rather than like the `task` one.
       */
      readonly holder: 'commentBox'
      readonly id: string
      readonly column: keyof Schedule['commentBoxes'][number] & string
    }

// ------------------------------------------------------------ UF-65 ---------

/**
 * U-26 `Command Palette` (UF-65). `null` in `ScreenView` while S-99e says it is
 * hidden.
 *
 * ⛔ NO MEMBER SAYS WHETHER THE POINTER IS ON IT, and that absence is the
 * answer rather than a gap. FR-053 (MUST) has the faintness judged by WHICH
 * PART the pointer is on, and IF-9's fourth member is where that is answered --
 * on the far side of this seam, by the side that drew the parts (Chapter 5.3,
 * MUST, under table T-065). A member here would be a second answer to the same
 * question, computed by a unit that has no rectangle to compute it from.
 */
export interface CommandPalette {
  /**
   * The CORNER it floats at. FR-053 has the person drag it, so its place is not
   * one of ScreenRegions' rectangles.
   *
   * ⭐ A POINT AND NOT A RECTANGLE. FR-053 (MUST) makes the palette's size
   * follow its contents and (MUST NOT) forbids the settings from holding one,
   * so no unit on this side of IF-9 has an extent to put in one: what the
   * entries measure out to is known only where they are laid out, which is past
   * this seam. ⚠️ A rectangle whose last two numbers were always zero was worse
   * than no rectangle -- it read as an extent that had been measured, and the
   * surface drew a box of that size.
   *
   * ⛔ NOTHING HOLDS THE CORNER. Table T-206 has no row for it and neither does
   * table T-203, so it arrives in `ScreenSession.commandPaletteAt` and is lost
   * when the page is left. That is a gap in the specification, not a decision
   * made here.
   */
  readonly at: { readonly x: number; readonly y: number }
  /**
   * How far down the grab band reaches -- the band GR-19 of table T-023d lays
   * along the palette's TOP EDGE, whose height is S-135a of table T-206.
   *
   * ⭐ A HEIGHT AND NOT A RECTANGLE, which is the whole of the shape
   * decision. GR-19 states WHERE the band goes -- along the top edge, and `at`
   * is already that edge's corner -- and S-135a states the one number GR-19
   * does not. The remaining two cannot be stated on this side at all, because
   * FR-053 (MUST) has the palette's size follow its contents: how wide the
   * entries came out is known only where they were laid out, past IF-9.
   * ⛔ So the band's WIDTH is the palette's own, spread by the side that
   * laid the contents out. A rectangle here would repeat the mistake `at`
   * records -- a zero extent read as one somebody had measured, and a box drawn
   * of that size.
   *
   * ⛔ NOT AN ENTRY, AND SO NOT IN `groups`. Table T-109 says of IC-53 that
   * it shows the palette can be dragged and is not a button, which is why UF-65
   * keeps that row out of the `CommandItem`s. It is a thing to SHOW and a thing
   * to GRAB, and this member is how both reach the screen.
   *
   * ⛔ ALWAYS A NUMBER, AND NEVER ONE TYPED HERE. GR-19 is a MUST and stands
   * FIRST in table T-023d, so a palette drawn without a band breaks that row --
   * there is no state in which this member has nothing to say. Table T-206
   * states the height at S-135a and it arrives generated, which is the road
   * rule 03 section 1 requires; ⛔ zero is not a value it may take, being a
   * band no one can grab, and GR-19 says a palette that cannot be grabbed can
   * never be moved again.
   *
   * ⭐ WHAT THE DRAWING SIDE OWES IT. The band is drawn INSIDE the part that
   * carries the palette's own role and never beside it: FR-053 (MUST) judges
   * the faintness by which PART the pointer is on, and the band IS part of the
   * palette -- drawn as a sibling it would leave the palette faint at the very
   * moment it is being grabbed. And it is marked with IC-53 the way an entry is
   * marked, so that `ScreenSurface.readScreenPartAt` answers `IC-53` for a
   * point on it (see `ScreenPart.entry`) and a press on it has somewhere to
   * arrive. ⚠️ GR-19 also gives the band the topmost claim on a point, which
   * for a palette floating over the schedule is what the topmost drawn node at
   * that point already answers.
   */
  readonly grabBandHeight: number
  /**
   * IC-75 of table T-109 -- the minimise toggle FR-053 (MUST) puts on the grab
   * band, to the right of IC-53.
   *
   * ⭐ A `CommandItem` AND NOT A FLAG, because it is an entrance like any other:
   * it carries the word FR-038's dictionary holds for its row and the row id
   * `ScreenSurface.readScreenPartAt` answers with, so a press on it arrives the
   * way a press on any entry does. ⛔ It is NOT in `groups` and cannot be:
   * table T-109 gives it no 群, and `groups` prints the table's groups.
   *
   * ⚠️ IT IS DRAWN IN BOTH STATES. FR-053 (MUST) keeps the grab band while the
   * palette is minimised -- without it the palette could never be moved again
   * (GR-19) -- and the band carries IC-53 and this entrance.
   * ⛔ MINIMISING WITHDRAWS `groups` AND `armedText`, and leaves the grab
   * band with IC-53 and this entrance standing -- FR-053 draws nothing else
   * while minimised.
   */
  readonly minimise: CommandItem
  /**
   * Whether the palette stands minimised (S-200 of table T-206).
   *
   * ⭐ CARRIED SEPARATELY FROM `groups` BEING EMPTY, although this side empties
   * that list when it is on: a palette whose groups came out empty for any
   * other reason is not minimised, and the drawing side owes the two different
   * pictures. ⚠️ `minimise` is the entrance that reverses it, and its word
   * already says which way it goes.
   */
  readonly isMinimised: boolean
  /** U-34 `Palette Groups`. FR-029 groups them because the number of choices sets the time to decide. */
  readonly groups: readonly PaletteGroup[]
  /**
   * FR-053 (MUST): what is armed has to be readable on the screen. Table T-023b
   * counts the arms, and its closing rule (MUST NOT) keeps their row ids off
   * the screen -- so this carries the word FR-038's dictionary holds for the
   * armed row, in the display language.
   * ⚠️ Words rather than a figure, because AR-4 (a dependency) is not a shape.
   * ⚠️ WHAT USED TO STAND HERE ALSO SAID IC-61 HAS NO FIGURE DRAWN YET. That
   * became false when RC-13's icons were raised: `icon-glyphs.json` draws that
   * row like every other one.
   *
   * ⛔ `null` IS THE ONE STATE THAT READS NOTHING, AND IT IS ONLY THE MINIMISED
   * ONE. FR-053 excepts a minimised palette from that MUST, so this is `null`
   * exactly when `isMinimised` is true and
   * a word in every other state. ⚠️ NOT AN EMPTY STRING: an empty reading is a
   * hole the drawing side would still lay out a box for, and the requirement's
   * MUST NOT is that nothing but the band is drawn there.
   */
  readonly armedText: string | null
}

export interface PaletteGroup {
  /** The group column of table T-109, for its `Command Palette` rows, in the display language. */
  readonly name: string
  /** U-34 `Palette Commands`. */
  readonly commands: readonly CommandItem[]
}

// ------------------------------------------------------------ UF-66 ---------

/**
 * What every surface carries, whichever one is open (UF-66). IN-4 of table
 * T-028 defines a surface as what the FIRST press of Esc closes, and S-99g
 * holds which one is open.
 *
 * ⚠️ Singular, although UF-70's file is named for the plural: `ScreenState`
 * carries ONE open surface (S-99g), so at most one is described at a time. The
 * plural in the file name is the set of surfaces that CAN be opened.
 *
 * ⚠️ Not exported and never held alone -- a value of this type is a surface with
 * no name. `OpenModal` is what a caller receives.
 */
interface OpenSurface {
  /** In the display language. */
  readonly heading: string
  /** IC-52 closes it, and Esc's first level does the same (IN-4). */
  readonly commands: readonly CommandItem[]
}

/** U-30 `Help Modal` of table T-103 -- the half of that row FR-036 opens. */
export interface HelpModal extends OpenSurface {
  readonly surface: 'Help Modal'
  /**
   * FR-036 (MUST): what the help has to show -- every row of tables T-023a,
   * T-023b, T-023c, T-023d, T-023 and T-036, and every entry of the `Command
   * Palette`.
   *
   * ⛔ NOT A ROSTER. FR-036 counts them itself and rule 03 forbids re-typing
   * what a table holds. ⚠️ None of those tables is generated into `src/` the way
   * `icon-roster.json` and `display-words.json` are, so either they reach the
   * code that way or a copy goes stale in silence. ⛔ This member is where that
   * gap now stands alone: the icon roster it used to be recorded beside has
   * since been generated.
   * ⚠️ Grouping and paging are the surface's: FR-036 asks the help to need no
   * scrolling at MC-6 of table T-025, and that is a layout, not a description.
   */
  readonly entries: readonly HelpEntry[]
  /**
   * FR-038 (MUST): which language is on NOW, readable BEFORE the toggle is
   * pressed. ⛔ `CommandItem` cannot carry it -- `isPressed` is a toggle that is
   * on, and a choice between two languages has no off. The entry itself (IC-21)
   * stands in `commands`, which is where FR-038 puts the second of its two.
   */
  readonly language: DisplayLanguage
  /** FR-069 (MUST): the whole licence text, which the help is where one reads. */
  readonly licenceText: string
  /** FR-069 (MUST): the copyright notice. */
  readonly copyrightNotice: string
  /** FR-069 (MUST): the third-party attributions, one per library. */
  readonly attributions: readonly string[]
}

/** One line the help shows. */
export interface HelpEntry {
  /** The table FR-036 names, e.g. `T-036`. */
  readonly table: string
  /**
   * Its row, e.g. `MK-1`.
   *
   * ⭐ A row id for the same reason `IconId` and `Notice.manner` are ones: it is
   * the join the specification prescribes, and it cannot go stale when the rule
   * it names changes.
   */
  readonly row: string
  /** In the display language. */
  readonly text: string
  /**
   * The mouse operation this row is assigned, in the display language, or
   * `null` where the row is not one of table T-023's.
   *
   * ⛔ A WORD, WHERE `keys` BELOW IS NOT (FR-036, MUST). 「ホイール」 needs
   * translating and `Ctrl+S` does not, so this one comes out of the dictionary
   * and the `操作` column of table T-023 is never printed (MUST NOT) -- that
   * column is the manuscript's own wording, in one language.
   */
  readonly press: string | null
  /**
   * The keys this row is assigned, spelled as table T-036 writes them, or
   * `null` where the row has none.
   *
   * ⛔ NOT A WORD OF THE DICTIONARY, AND THAT IS WHY IT RIDES HERE. `Ctrl+S`
   * and `F1` read the same in every language -- the reading
   * `_assets/tbl-settings.md` takes of a unit -- so FR-038's store has nothing
   * to say about them. ⚠️ The separators are the table's own (a slash between
   * alternatives, a full-width plus within one chord); a second spelling
   * invented on the way would put one assignment on the screen two ways.
   *
   * ⭐ ONLY TABLE T-036 HAS THE COLUMN. Every other row carries `null`, and
   * FR-036 (MUST) has the drawing side leave that place empty rather than fill
   * it with a dash -- a dash reads as an assignment deliberately withheld,
   * which is what SK-1 says in WORDS and no other row means.
   */
  readonly keys: string | null
  /**
   * The entrance of table T-109 that stands for this row, or `null`.
   *
   * ⛔ CARRIED ONLY WHERE THAT TABLE PLACES EXACTLY ONE, which FR-036 (MUST)
   * states and which is not a judgement made here: a `Command Palette` row is
   * its own entrance; an arm of table T-023b is carried by however many
   * entrances that table's 構え column points at it, and AR-2 has four while
   * AR-3 has eight. ⚠️ Choosing one of four would settle which shape stands
   * for an arm, and FR-029 (MUST) reserves that to figure F-019 and the table.
   */
  readonly icon: IconId | null
}

/** U-30 `AI Export Modal` of table T-103 -- the half of that row FR-068 opens. */
export interface AiExportModal extends OpenSurface {
  readonly surface: 'AI Export Modal'
  /**
   * FR-068: the document that would be handed to an AI. One value, because the
   * requirement shows and copies the same thing.
   *
   * ⭐ THE ENTRY FOR THE COPY IS ONE OF `commands` AND NOT A MEMBER OF ITS
   * OWN. FR-068 (MUST) settles which row it is -- `IC-52` of table T-109,
   * already on this surface -- and (MUST NOT) forbids adding a new one, so
   * `commandsOnSurface` already emits it and a `CommandItem` minted here would
   * be the second entrance FR-029 forbids.
   * ⚠️ What a press of it SPENDS is not this component's: R-9 of table T-008
   * puts the clipboard outside, and the shell owns that seam.
   */
  readonly documentText: string
}

/** U-49 `Resource Roster` of table T-103, which FR-099 opens. */
export interface ResourceRoster extends OpenSurface {
  readonly surface: 'Resource Roster'
  /** FR-099: the resources the document holds, in `Schedule.resources`' own order. */
  readonly resources: readonly RosterResource[]
}

/** One resource as the roster shows it. */
export interface RosterResource {
  /** `Resource.uid` (AT-85). */
  readonly uid: number
  /**
   * `Resource.name` (AT-86), or `null` where the resource carries none.
   * ⚠️ Never translated: FR-038 leaves the document's own values alone.
   */
  readonly name: string | null
  /**
   * FR-099 (MUST): one of the two ways of deleting takes every resource that no
   * assignment refers to, so which ones those are has to be readable.
   */
  readonly isReferenced: boolean
  /**
   * FR-099 (MUST): the other way takes the chosen ones, and the surface carries
   * a select-all and a clear-all beside them. Which are chosen arrives in
   * `ScreenSession.selectedResourceUids`.
   */
  readonly isSelected: boolean
  /**
   * FR-099 (MUST NOT): what a deletion would unassign is shown by NAME, and
   * reducing it to a count is forbidden in as many words.
   *
   * `Task.name` (AT-27) for every task the chain CD-5 of table T-050 would
   * reach, and `null` for a task that carries no name of its own.
   */
  readonly unassignedTaskNames: readonly (string | null)[]
}

/**
 * One format the `Export Chooser` offers (FR-096).
 *
 * ⭐ THE ROW ID IS STILL THE HANDLE, and the two beside it are for the reader:
 * a press carries the row back, because table T-024 has no English column and a
 * row id is a join rather than a value.
 */
export interface ExportFormatChoice {
  readonly row: ExportFormatId
  /**
   * FR-096 (MUST): the word `display-words.json` holds for the row, in the
   * language the session is on. ⛔ NEVER the row id (MUST NOT): printed, it
   * tells the reader nothing they can use.
   */
  readonly name: string
  /**
   * The extension table T-024 gives the row, which FR-096 (MUST) has the
   * chooser propose with the document name.
   *
   * ⛔ NOT TYPED OUT ANYWHERE IN `src/` (FR-096, MUST NOT keeps the extension
   * in table T-024 alone): `export-formats.json` beside this file is generated
   * from that table by the same script that writes DocumentCodec's copy, which
   * LR-2 of table T-061 forbids this component to read.
   */
  readonly extension: string
}

/** U-54 `Export Chooser` of table T-103, the surface FR-096 opens. */
export interface ExportChooser extends OpenSurface {
  readonly surface: 'Export Chooser'
  /**
   * FR-096 (MUST): every format table T-024 gives an out direction AND an
   * extension, in that table's own print order.
   *
   * ⭐ WHY THIS MEMBER HAS TO EXIST AT ALL, when U-56 `Open Chooser` needs
   * nothing but `commands`: FR-029 (MUST) makes table T-109 the whole of the
   * icons, and that table places nothing but IC-52 on this surface. IC-2 is the
   * one entrance the table gives FR-096, and it stands on the `App Header` and
   * OPENS the chooser -- an entrance per format is what the same requirement
   * forbids (MUST NOT). So the formats cannot arrive as `CommandItem`s without
   * minting rows, and they arrive as the rows table T-024 gives them instead.
   *
   * ⚠️ IO-6 IS NOT AMONG THEM. FR-096 (MUST NOT) keeps the clipboard off this
   * surface -- it does not come out as a file, so there is no name to propose --
   * and FR-025 carries it on IC-3 with no surface at all.
   */
  readonly formats: readonly ExportFormatChoice[]
}

/**
 * The surface open over the screen, described as the requirement that opens it
 * asks for (UF-66).
 *
 * ⭐ DISCRIMINATED ON THE SURFACE, so a reader can tell from the type which
 * one carries what, and the name of each is what `ScreenState.surface` carries
 * (S-99g).
 *
 * ⛔ FOUR NAMES ARE SETTLED AND TWO ARE NOT. Table T-103 spells `Help Modal`
 * and `AI Export Modal` (U-30), `Resource Roster` (U-49) and `Export Chooser`
 * (U-54), copied here spelling and all. FR-074's surface and FR-088's have no
 * row in that table, so ⛔ no name is minted for either: each is carried by
 * the one thing the specification does give it, its requirement's own UID --
 * the move `IconId` makes with `IC-7` and `Notice.manner` with `NT-1`.
 *
 * ⚠️ THE LAST MEMBER TAKES ANY OTHER NAME, and it is not a spare shape:
 * S-99g holds a name rather than a choice among six, so a name outside the six
 * has to stay describable. ⛔ It is also why this type cannot by itself
 * force the six payloads to be filled -- a bare `{ surface, heading, commands }`
 * lands there whatever its name. What requires them is the requirement, not the
 * type.
 * ⚠️ For the same reason, a caller narrows by what a member carries
 * (`'resources' in modal`) rather than by comparing the name: a `string`
 * discriminant is comparable to every literal, so TypeScript keeps the last
 * member in every comparison.
 *
 * @provisional PND-140
 */
export type OpenModal =
  | HelpModal
  | AiExportModal
  | ResourceRoster
  | ExportChooser
  // FR-074's surface, which table T-103 has not named.
  | (OpenSurface & {
      readonly surface: 'FR-074'
      /**
       * FR-074 (MUST): the rows of table T-224, each with the column it writes
       * and whether it may be edited -- PF-9 and PF-10 may not, because both are
       * written straight back to the exchange partner and FR-021's lossless
       * round trip would stop meaning anything if a person could change them.
       * ⛔ That table is the whole of what this surface writes, and the
       * document's title is not in it (FR-035 owns the one entry).
       */
      readonly fields: readonly PropertyField[]
    })
  // FR-088's surface, which table T-103 has not named either.
  // ⚠️ The number of `Task`s a change reaches is NOT a member, although FR-088
  // makes telling it a MUST: NT-3 of table T-037 already carries a count on a
  // notice, and `Notice.affectedCount` is it. Two places would be two answers.
  | (OpenSurface & {
      readonly surface: 'FR-088'
      /**
       * The `WeekDay` rows (AT-70) of the calendar FR-054 resolves for the
       * document -- FR-088's working weekdays.
       *
       * ⛔ Carried as the column holds them, and NOT renumbered.
       * `WeekDay.dayType` (AT-73) makes Sunday 1 and `Project.weekStartDay`
       * (AT-17) makes Sunday 0, so the two codings are ONE APART; converting
       * either here would put one weekday under two numbers on one surface.
       */
      readonly weekDays: readonly WeekDay[]
      /** Its `Exception` rows (AT-71) -- FR-088's exception days. */
      readonly exceptions: readonly Exception[]
      /**
       * `Project.weekStartDay` (AT-17), whose place FR-088 fixes as `Project`
       * rather than the calendar. `null` where the document carries none.
       */
      readonly weekStartDay: number | null
    })
  // U-60 `Watermark Unlock` of table T-103 -- the surface FR-020 (MUST) raises
  // before the watermark may be hidden.
  //
  // ⭐ A SURFACE AND NOT A `Confirmation`. U-55's answer is one of NT-7's
  // two and nothing else; this one is a password, and U-60's own row says so.
  // ⛔ So it is a name S-99g holds (FR-020, MUST), which is what puts it on
  // IN-4's surface rung.
  // ⚠️ THE GATE STANDS ON THE HIDING SIDE ALONE (FR-020, MUST NOT): a
  // symmetric toggle cannot tell the two directions apart and would slip past
  // the gate on the side that hides.
  | (OpenSurface & {
      readonly surface: 'Watermark Unlock'
      /**
       * QN-9 of table T-234 (MUST), in the display language (FR-038) -- or the
       * empty string while the dictionary holds no word for the row.
       *
       * ⭐ THE SHOWN HALF OF A ROW, exactly as `Confirmation.text` is: FR-076
       * (MUST) makes what a question shows a row of that table and (MUST NOT)
       * bars a question it does not hold, so the sentence is READ out of the
       * one dictionary FR-038 names and nothing mints one.
       */
      readonly question: string
      /**
       * The two answers, as WORD BUTTONS (MUST) -- FR-020 sends their manner to
       * `NT-7` of table T-037, so they are the very two `Confirmation.answers`
       * carries and are read out of the same
       * `confirmation` section of FR-038's dictionary.
       *
       * ⛔ NEITHER HAS A ROW OF TABLE T-109 (MUST NOT, FR-020 and NT-7 alike):
       * that table and figure F-019 hold the entrances that are SHAPES, and a
       * word button has no shape. ⚠️ Which is why they are not `commands`, the
       * member every other surface answers a press on.
       */
      readonly answers: readonly ConfirmationAnswer[]
    })
  // U-61 `Difference Review` of table T-103 -- the surface FR-022 (MUST) sends
  // the merge's question to, and FR-073 the newer-version one.
  //
  // ⭐ ITS THREE ANSWERS ARE `commands` AND NOTHING ELSE HAS TO BE DECLARED FOR
  // THEM: table T-109 places IC-95 .. IC-97 on this surface out of its own
  // surface column, so `commandsOnSurface` emits them the way it emits IC-71 ..
  // IC-73 on U-56. ⛔ Which of table T-032a's rows each entry means is the
  // shell's join, not this component's -- the same division `OPEN_CHOICE_OF_ENTRY`
  // already stands on.
  // ⛔ SO THE ONE MEMBER HERE IS THE HALF THAT IS NOT AN ENTRANCE. FR-022
  // (MUST NOT) forbids showing the choices alone and (MUST) has the tasks that
  // could correspond laid out before anyone is asked, and nothing in
  // `ScreenState`, `Schedule` or the entry roster carries them -- they are the
  // pairing PI-10 worked out for THIS import.
  | (OpenSurface & {
      readonly surface: 'Difference Review'
      /**
       * FR-022 (MUST): the tasks that could correspond, gathered by `UID` match
       * -- laid out before the choice is offered.
       *
       * ⛔ NOT A COUNT (FR-022, MUST NOT). A number would leave a person
       * unable to judge what they are about to lose, which is the reason that
       * MUST NOT gives for itself.
       * ⚠️ NAMES AND UIDS AND NOTHING TRANSLATED: a task's name is its own value
       * (AT-27) and FR-038 leaves a document's values alone, so these cross as
       * the document wrote them -- ⛔ a name it never carried is `null` and is
       * not filled in here.
       */
      readonly candidates: readonly MergeCandidateLine[]
      /**
       * FR-073 (MUST): the columns a document of a newer format version carried
       * that this build could not read, laid out one by one on `U-61` of table
       * T-103 before anyone is asked whether to go on.
       *
       * ⛔ NOT A COUNT, for the reason `candidates` above is not one: a
       * tally leaves a person unable to judge what they are about to accept.
       * ⚠️ UNTRANSLATED. A column this build has never heard of has no row
       * in any dictionary, and FR-038 (MUST NOT) leaves a document's own words
       * alone -- so these cross exactly as the file spelled them.
       * ⛔ CARRIED EVEN WHEN EMPTY, the same reading `candidates` takes: an
       * empty list is an intake with nothing unread rather than one this side
       * declined to fill.
       */
      readonly unreadColumns: readonly string[]
      /**
       * `RS-48` of table T-233, in the display language (FR-038) -- what the
       * surface says about the list above, or the empty string where this
       * intake read every column it was given.
       *
       * ⭐ A ROW READ, NEVER A SENTENCE WRITTEN, and the shape is U-62's
       * own: FR-073 names the surface and the reason in one breath, exactly as
       * FR-023 names U-62 and `RS-50`. ⛔ So it is not a notice beside the
       * surface.
       * ⚠️ EMPTY WHERE `unreadColumns` IS EMPTY: a merge of a document this
       * build reads in full still raises U-61, and a sentence about columns
       * that were all read would be a telling about nothing.
       */
      readonly unreadText: string
      /** NT-3a's next step for the same row, or the empty string where none. */
      readonly unreadNextStep: string
    })
  // U-62 `Import Report` of table T-103 -- the surface FR-023 (MUST) sends the
  // names of the `Task` rows an import dropped to.
  //
  // ⭐ A SURFACE AND NOT A TELLING, WHICH U-62's OWN ROW SETTLES: `NT-9` of
  // table T-037 holds a notice to one line, which a list of dropped names will
  // not fit. ⛔ AND NOT A `Confirmation` (U-55) either -- that row asks for
  // no answer and gives one way out -- so nothing here carries a second answer
  // for a person to weigh.
  // ⚠️ NO ROW OF TABLE T-109 NAMES IT, exactly as none names U-60: the way out
  // is a WORD and a word has no shape, so `commands` comes back empty and the
  // one entrance travels as `dismissText` below.
  | (OpenSurface & {
      readonly surface: 'Import Report'
      /**
       * The names of the `Task` rows the import dropped, in the order the file
       * carried them -- or `null` for one the file gave no name (AT-27).
       *
       * ⛔ NOT A COUNT (FR-023, MUST NOT), and that requirement gives its
       * own reason: without knowing WHICH rows fell out, a person cannot mend
       * the file they came from.
       * ⚠️ UNTRANSLATED (FR-023, MUST NOT -- a name is a document value),
       * which is why these cross as strings of the file rather than as rows of
       * any dictionary -- ⛔ and a name the file never carried stays `null`
       * rather than being filled in here.
       */
      readonly droppedTaskNames: readonly (string | null)[]
      /**
       * `RS-50` of table T-233, in the display language (FR-038) -- what the
       * surface says about the list below it.
       *
       * ⭐ A ROW READ, NEVER A SENTENCE WRITTEN. FR-023 names the row and FR-038
       * (MUST NOT) keeps the words in the one dictionary, exactly as
       * `Watermark Unlock.question` carries QN-9's.
       */
      readonly text: string
      /** NT-3a's next step for the same row, or the empty string where none. */
      readonly nextStep: string
      /**
       * The word on the one entrance, which FR-023 sends to NT-8 -- the same
       * word every told notice is put away with, read out of the same section
       * of the dictionary.
       */
      readonly dismissText: string
    })
  // Any other name S-99g carries. ⛔ Nothing beyond the three members every
  // surface has: with no settled name for FR-074's surface or FR-088's, a caller
  // that spelled either differently cannot be told from the other.
  | (OpenSurface & { readonly surface: string })

/**
 * One pair U-61 lays out -- a task of the document standing now and a task of
 * the file being merged in, which share a `UID` (FR-022, MUST).
 *
   * ⭐ BOTH SIDES, NEVER ONE. FR-022's three choices on `U-61` ask which file
   * the duplicated thing is taken from, and a person cannot answer that while
   * seeing only one of the two.
 */
export interface MergeCandidateLine {
  /**
   * `Task.uid` (AT-26) on the side of the document standing now.
   *
   * ⚠️ BOTH UIDS ARE CARRIED AND NOT ONE. FR-022 gathers the candidates by
   * `UID` match (MUST), which makes the two equal in the ordinary case -- but
   * MG-1 of table T-032 decides whether tasks whose `UID` does NOT match may
   * join them, and a single member would silently pick a side the moment it
   * does.
   */
  readonly currentUid: number
  /** `Task.uid` on the side of the file being read. */
  readonly incomingUid: number
  /** The name the document standing now carries, or `null` where it has none. */
  readonly currentName: string | null
  /** The name the file being read carries, or `null` where it has none. */
  readonly incomingName: string | null
}

// ------------------------------------------------------------ UF-67 ---------

/**
 * One thing RAISED to be told, before the words it is told in are read (UF-67).
 *
 * ⭐ NOT A `Notice`, for the reason `RaisedConfirmation` is not a
 * `Confirmation`: what the raiser knows is WHICH manner of table T-037 it is
 * following and WHY, and FR-038 (MUST) keeps the words themselves in the one
 * generated dictionary that this component -- and no raiser -- holds. A raiser
 * that had to supply the sentence would be the second store of translated
 * strings that same requirement forbids (MUST NOT).
 *
 * ⭐ WHY THE RAISER IS THE ONLY SIDE THAT CAN SAY `reason`. `file-store.ts`
 * writes the same boundary from the other end: the reasons are told apart by
 * what can be done next, only that side knows which one happened, and UF-67 is
 * where the reason becomes NT-3a's next step.
 */
export interface RaisedNotice {
  /**
   * The row of table T-037 this one follows, e.g. `NT-1`.
   *
   * ⭐ Carried rather than worked out here, for the reason `Notice.manner` is
   * carried: NT-5 (MUST) makes the accepted-with-a-warning row have to look
   * unlike NT-1's refusal, and only the raiser knows which of the two happened.
   */
  readonly manner: string
  /**
   * WHY, as a row of table T-233 and never as a sentence, e.g. `RS-4`. FR-076
   * (MUST) makes every reason a row of that table and (MUST NOT) bars one from
   * outside it.
   *
   * ⛔ A ROW ID, NOT PROSE. It joins this notice to FR-038's dictionary the way
   * `manner` above joins it to table T-037, and UF-67 reads NT-1's words and
   * NT-3a's next step out of it. ⚠️ A reason the table does not hold is not a
   * licence to write one here: that case has a row of its own, and UF-67 falls
   * to it.
   */
  readonly reason: string
  /**
   * NT-3: how many things a destructive result reaches. `null` where the row
   * does not ask for a count.
   */
  readonly affectedCount: number | null
}

/**
 * One thing told to the person (UF-67). The manner is table T-037's, which
 * FR-076 turns into a MUST.
 *
 * ⚠️ THE SHOWN HALF, not the raised one. `ScreenSession.notices` holds
 * `RaisedNotice`, and UF-67 reads the words out of the dictionary on the way
 * here -- so a member below that carries words is one no raiser filled in.
 */
export interface Notice {
  /**
   * The row of table T-037 this one follows, e.g. `NT-1`.
   *
   * ⭐ It travels with the notice because NT-5 (MUST) makes "accepted, with a
   * warning" have to look unlike NT-1's refusal: told apart by the row, the two
   * cannot end up wearing one look.
   */
  readonly manner: string
  /**
   * What that row of table T-037 is CALLED, in the display language (FR-038),
   * or the empty string while the dictionary holds no word for it.
   *
   * ⛔ NOT A SECOND SPELLING OF `manner`, and it does not replace it. That
   * member is the row id, which is the join and what NT-5 (MUST) is told apart
   * from NT-1 by; this is the word `display-words.json` holds under that row,
   * and a word cannot be a join -- FR-038 gives every row two of them.
   *
   * ⛔ COMPOSED ON THE WAY TO THE SCREEN AND NEVER ASKED OF THE RAISER, the move
   * `Confirmation.entries` makes: `RaisedNotice` carries no words at all,
   * because FR-038 (MUST NOT) makes a second store of translated strings out of
   * any raiser that supplied one.
   */
  readonly mannerText: string
  /**
   * NT-1 (MUST): which item, and why, in words. ⛔ Colour or a border alone is
   * forbidden (MUST NOT), so the words are not optional.
   */
  readonly text: string
  /**
   * NT-3a (MUST): what can be done next. ⛔ A failure told without one of these
   * is forbidden (MUST NOT).
   *
   * ⚠️ A LIST BECAUSE NT-4 GATHERS, not because one reason has several steps:
   * table T-233 gives a row one, so a notice standing on its own carries one and
   * the gathered surface carries what it gathered. Empty only while the
   * dictionary holds no step to read.
   */
  readonly nextSteps: readonly string[]
  /**
   * NT-3: how many things a destructive result reaches. `null` where the row
   * does not ask for a count.
   */
  readonly affectedCount: number | null
  /**
   * NT-8 (MUST): what the entrance that puts this telling away is CALLED, in
   * the display language (FR-038), or the empty string while the dictionary
   * holds no word for it.
   *
   * ⭐ A WORD AND NEVER A SHAPE, the bargain `Confirmation.shownOnAnotherRowMark`
   * already keeps: FR-029 (MUST) makes table T-109 the whole of the icons and
   * RC-13 of table T-026 keeps a new one the user's own decision, so nothing
   * here may raise one. ⚠️ NT-8 (MUST) has this one word spelled the same in
   * BOTH display languages -- not a translation this side may skip: the
   * dictionary still holds a cell per language, and both cells hold it.
   *
   * ⛔ READ ON THE WAY TO THE SCREEN AND NEVER ASKED OF THE RAISER, the move
   * `mannerText` makes above: `RaisedNotice` carries no words at all, because
   * FR-038 (MUST NOT) makes a second store of translated strings out of any
   * raiser that supplied one.
   */
  readonly dismissText: string
  /**
   * NT-8 (MUST): WHICH telling a press on that entrance put away.
   *
   * ⛔ A KIND CANNOT SAY WHICH. `ScreenView.notices` is a list, so several
   * tellings stand at once and `manner` is a row of table T-037 that any number
   * of them may wear -- a press answered by the manner alone would put away
   * the next, which is the whole of what NT-8 needs from the description: a
   * telling has to be removable where it stands.
   *
   * ⭐ MADE OF THE ROWS THE TELLING ALREADY CARRIES, and of nothing minted:
   * `RaisedNotice` hands over a row of table T-037 and a row of table T-233, so
   * a key can be built for a telling that already exists without either side of
   * the seam keeping a counter. ⚠️ It names MORE THAN ONE reason where NT-4
   * gathered several raised notices into one telling -- what a press puts away
   * is what was shown, and what was shown there is all of them.
   *
   * ⛔ NOT A POSITION IN THE LIST. The description is rebuilt every frame and
   * NT-4 collapses a run of it, so the shown position matches no raised one --
   * and a number that means "the third" names a different telling as soon as
   * the second is put away.
   *
   * ⚠️ TWO TELLINGS THAT MATCH IN BOTH ROWS SHARE A KEY, and they are put away
   * together. They carry one manner, one reason and therefore one set of words
   * (`text`, `nextSteps`), so nothing on the screen tells them apart; leaving
   * one of them standing would look to the person like the press did nothing.
   */
  readonly dismissKey: string
}

/**
 * One question as it is RAISED, before the surface it will stand on is
 * described (UF-67, NT-7 of table T-037).
 *
 * ⭐ NOT A `Notice`, although both follow table T-037. A notice is told and the
 * person carries on; this one stops until they answer, and NT-7 (MUST) is the
 * row that says so -- what is about to happen is shown and then continuing or
 * calling it off is CHOSEN. Two shapes rather than one, because a notice with a
 * pending answer bolted on would let a caller raise a question nobody can
 * answer.
 *
 * ⭐ WHY THE RAISED HALF IS ITS OWN TYPE. Everything here can only be known
 * where the question is raised, and the two answers on `Confirmation` can only
 * be known from table T-109 -- so an asker that had to supply them would be
 * writing the roster's answer. `ScreenSession` holds this half; UF-67 turns it
 * into the surface below.
 *
 * ⚠️ FR-031 states the class of the places that may ask (losing what undoing
 * cannot give back) and forbids enumerating them (MUST NOT); NT-7 (MUST) keeps
 * the same limit -- a confirmation stands only where a requirement asks for one.
 */
export interface RaisedConfirmation {
  /**
   * The row of table T-037 this one follows -- `NT-7`.
   *
   * ⭐ Carried rather than assumed, for the reason `Notice.manner` is: the row
   * is the join to the table, and a reader of one value can tell which manner it
   * is written against without being told separately.
   */
  readonly manner: string
  /**
   * WHICH QUESTION THIS IS, as a row of table T-234 and never as a sentence,
   * e.g. `QN-1`. FR-076 (MUST) makes what a question shows a row of that table
   * and (MUST NOT) bars a question it does not hold.
   *
   * ⛔ A ROW ID, NOT PROSE, exactly as `RaisedNotice.reason` is one. It joins
   * this question to FR-038's dictionary the way `manner` above joins it to
   * table T-037, and UF-67 reads NT-7's sentence out of it -- so a raiser that
   * supplied the sentence would be the second store of translated strings
   * FR-038 forbids (MUST NOT). ⚠️ A question the table does not hold is not a
   * licence to write one here: that case has a row of its own, and UF-67 falls
   * to it.
   */
  readonly question: string
  /**
   * NT-7 (MUST): what would go, BY NAME. Empty where nothing goes.
   *
   * ⛔ A COUNT MAY NOT STAND IN FOR THIS. FR-032 and FR-099 each forbid showing
   * only a number in as many words (MUST NOT), and NT-7 points at both. That is
   * also why the list is here rather than a length: `Notice.affectedCount` is
   * the one place a count lives (NT-3), and NT-3's count sits BESIDE these names
   * rather than instead of them.
   *
   * ⚠️ EMPTY IS A REAL ANSWER, not a missing one. A question can be asked about
   * something that takes nothing with it -- table T-227's DI-4 (overwrite) is
   * that case -- and NT-7 asks for names only "where there is something that
   * goes".
   */
  readonly items: readonly ConfirmationItem[]
}

/**
 * U-55 `Confirmation` of table T-103 -- the raised question WITH the surface it
 * stands on (UF-67).
 *
 * ⭐ THE TWO ANSWERS ARE THE DICTIONARY'S, NOT THE ASKER'S. NT-7 (MUST) makes
 * them WORD BUTTONS and names where the words come from -- the `confirmation`
 * section of FR-038's dictionary -- so UF-67 reads them there and this type is
 * not what a caller raises: `ScreenSession.confirmation` takes
 * `RaisedConfirmation`, and the answers are added on the way to the screen.
 * ⛔ NEITHER ANSWER HAS A ROW OF TABLE T-109 (MUST NOT, NT-7): that table
 * and figure F-019 hold the entrances that are SHAPES, and a word button has no
 * shape, so nothing on this surface is a `CommandItem`.
 *
 * ⛔ NT-8's ENTRANCE MAY NOT STAND HERE (MUST NOT), which is why this type does
 * not extend `Notice` and carries neither `dismissText` nor `dismissKey`. That
 * row lets a person put a TELLING away; this surface asks a question, and a
 * third way out of it would be an answer that is neither of `answers` -- the
 * two NT-7 (MUST) makes the whole of the choice. ⚠️ The reading `Esc` gives is
 * not a third one either: IN-4 of table T-028 spends it as calling the question
 * off, which is the cancelling answer arriving by another road.
 */
export interface Confirmation extends RaisedConfirmation {
  /**
   * What NT-7 is CALLED, in the display language (FR-038), or the empty string
   * while the dictionary holds no word for it.
   *
   * ⭐ THE ONE WORD THAT NAMES THIS SURFACE. U-55 is a row of table T-103, but
   * the `surfaces` section of `display-words.json` holds no heading for it --
   * the `notices` section holds a word per row of table T-037 instead, and NT-7
   * is the row this surface follows. So the manner is where its name comes from.
   *
   * ⛔ Read here and never asked of the raiser, the move `entries` and
   * `shownOnAnotherRowMark` both make: FR-038 (MUST) keeps the one store of
   * translated strings in this component.
   */
  readonly mannerText: string
  /**
   * NT-7 (MUST): what is about to happen, in words, in the display language
   * (FR-038) -- or the empty string while the dictionary holds no word for the
   * row.
   *
   * ⭐ THE SHOWN HALF OF `question`, the way `Notice.text` is the shown half of
   * `RaisedNotice.reason` -- and named the same, because it is the same thing:
   * the sentence read out of the one dictionary FR-038 names, keyed by the row
   * the raiser carried. ⛔ NOT A SECOND SPELLING OF `question`: that member is
   * the row id, which is the join; this is a word, and a word cannot be a join
   * -- FR-038 gives every row two of them.
   *
   * ⚠️ THE NAMES OF WHAT WOULD GO ARE NOT IN HERE. NT-7 (MUST) asks for them
   * too, and they are `items` -- values of the document rather than words of
   * the screen, which is why the dictionary holds a sentence and not a name.
   */
  readonly text: string
  /**
   * NT-7's two answers as WORD BUTTONS (MUST), in the print order the
   * `confirmation` section of FR-038's dictionary holds them in.
   *
   * ⭐ NT-7 (MUST) makes choosing between the two the whole of this surface, so
   * neither can be spent and neither is a toggle -- which is why nothing here
   * carries `isEnabled`, `isPressed` or `isArmed`: a `CommandItem` says which of
   * those states an entrance is in, and on this surface there is only one.
   * ⛔ AND NOT A `CommandItem` FOR A SECOND REASON: that type is keyed by a row
   * of table T-109, and NT-7 (MUST NOT) refuses these answers a row there.
   */
  readonly answers: readonly ConfirmationAnswer[]
  /**
   * What an item whose `isShownOnAnotherRow` is true is marked WITH, in the
   * display language (FR-038), or the empty string while the dictionary holds
   * no word for it.
   *
   * ⭐ A WORD, NEVER A SHAPE. FR-032 (MUST) asks for the mark, and what it
   * is made of follows: table T-109 is the whole of the icons and RC-13 of
   * table
   * T-026 keeps a new one the user's own decision, so the mark is read out of
   * the one dictionary FR-038 names, the way every other word on the screen is.
   *
   * ⭐ ONE FOR THE SURFACE AND NOT ONE PER ITEM: `ConfirmationItem` says WHICH
   * items wear it and they all wear the same word, so a copy on each would be
   * one string carried as many times as there are items.
   *
   * ⛔ Composed on the way to the screen and never asked of the raiser, for the
   * reason `entries` is: the raiser knows what is about to happen, the
   * dictionary knows what to call it, and the surface that draws it may write
   * no word of its own.
   */
  readonly shownOnAnotherRowMark: string
}

/** One thing a confirmation says would go. */
export interface ConfirmationItem {
  /**
   * Its name, or `null` where it carries none.
   *
   * ⭐ Same shape as `RosterResource.unassignedTaskNames`, which is FR-099's
   * half of this: `Task.name` (AT-27) is optional in the document, so a nameless
   * task has to stay describable rather than be dropped from the list.
   */
  readonly name: string | null
  /**
   * FR-032 (MUST): a `Task` that goes with a row but is DRAWN on another row is
   * shown as such, because it is not visible on the row being deleted. Which
   * ones those are is HM-10 of table T-015a.
   *
   * ⚠️ `false` wherever FR-032 is not the one asking -- FR-099's list is of the
   * tasks an unassignment reaches, and rows have nothing to do with it.
   */
  readonly isShownOnAnotherRow: boolean
}

/**
 * One of NT-7's two answers -- a word button, and never a shape (MUST NOT).
 *
 * ⭐ THE ROW OF THE DICTIONARY IS THE JOIN, the way a row of table T-109 was
 * while these two were entrances: `answer` is the key the `confirmation` section
 * of FR-038's dictionary spells, `text` is what that section holds for the
 * display language in force, and nothing else names them.
 */
export interface ConfirmationAnswer {
  /**
   * Which of NT-7's two this is, spelled the way the `confirmation` section of
   * `display-words.json` spells it (`proceed` / `cancel`).
   *
   * ⛔ NOT A WORD OF THE SCREEN and never drawn: it is the join, carried so that
   * the side which spends a press can say WHICH answer was given. ⚠️ The word
   * the person reads is `text`, and FR-038 (MUST) keeps that the dictionary's.
   */
  readonly answer: string
  /**
   * The word on the button, in the display language (FR-038) -- or the empty
   * string while the dictionary holds no word for the row.
   *
   * ⭐ SPELLED THE SAME IN EVERY DISPLAY LANGUAGE, which NT-7 (MUST) states
   * and (MUST NOT) forbids translating -- translated, the first letter would
   * stop naming the key below it. ⛔ So that first character is not
   * decoration: it is what names the key that answers, and the drawing side is
   * what draws it bold (NT-7, MUST).
   */
  readonly text: string
}

// ------------------------------------------------------------ UF-68 ---------

/**
 * U-44 `Dialogue Field` (UF-68). `null` in `ScreenView` while the `Agent API`
 * is off, because FR-066 puts the field up only while it is on.
 *
 * ⛔ The half-typed line is NOT here. AG-11 forbids anything to read what has
 * not been settled (MUST NOT), and the entry's live contents belong to the
 * surface -- what crosses this way is what has been settled.
 */
export interface DialogueField {
  /**
   * The settled utterances, oldest first.
   *
   * ⚠️ Ordered by `DialogueMessage.sequence`, which AG-11 makes an order of its
   * own BECAUSE an utterance does not move the schedule instant (FR-063).
   * ⛔ Do not order these by the stamp or by `settledAt`: the first cannot see
   * them -- and FR-063 forbids reading it as an order at all (MUST NOT) -- and
   * the second is a clock reading from whatever machine settled it.
   */
  readonly messages: readonly DialogueMessage[]
}

// ------------------------------------------------------------ UF-69 ---------

/**
 * One explanation shown against something (UF-69).
 *
 * ⚠️ IN-3 governs every one of them: it can be dismissed, it can be pointed at,
 * and it does not go away by itself. Those hold for all, so none of them is a
 * member here.
 */
export interface Tooltip {
  readonly anchor: TooltipAnchor
  /** In the display language. */
  readonly text: string
  /**
   * EZ-2 of table T-040 (MUST): the assignment shown after the explanation,
   * or `null` where the entry has none.
   *
   * ⛔ BESIDE `text` AND NOT INSIDE IT. The explanation is the word FR-038
   * keeps in the dictionary, and a reader holding this description to that
   * word has to find the word ITSELF here -- glued together, the two make every
   * such reading fail, and rightly.
   * ⚠️ A key is not a word (`Ctrl+S` reads the same in every language) and a
   * mouse gesture is; which of the two this is has already been resolved by
   * the side that filled it.
   */
  readonly assignment: string | null
  /**
   * Where this explanation stands, for an anchor the screen surface DREW
   * NOTHING FOR. EZ-6 of table T-040 puts one on a `Task`, and a Task is drawn
   * into the schedule's own picture across IF-1 -- so the side that places
   * this description has no element of its own to put it against, the way it
   * has for an icon (EZ-2) and for a lane (FR-037).
   *
   * ⛔ ABSENT ON THOSE TWO, NOT `null` ON THEM. They are anchored to an element
   * that was drawn, and a point beside it would be a second answer to where
   * they stand -- the very thing `ScreenSession.iconUnderPointer`'s note
   * refuses. This member is present only where no element can be found.
   *
   * ⚠️ NO ROW GIVES THE PLACE. Searched: FR-092 (table T-040, EZ-6), table
   * T-028 (IN-3), table T-076 (EP-15), table T-206. EP-15 says only that the
   * explanation is raised by the pointer having stopped; where it is then
   * drawn is settled nowhere, so the pointer's own point is used and marked.
   *
   * @provisional PND-391
   */
  readonly at?: { readonly x: number; readonly y: number }
}

/**
 * What a tooltip explains.
 *
 * ⛔ FR-029 also puts one on an endpoint that cannot be grabbed. That endpoint is
 * inside the `Row Area`, which this component does not describe, so no case for
 * it is invented here -- which side draws it is unsettled.
 */
export type TooltipAnchor =
  /** EZ-2 of table T-040 (MUST): the explanation of an icon, after `iconHintDelayMs` (S-124). */
  | { readonly kind: 'icon'; readonly icon: IconId }
  /**
   * EZ-6 of table T-040 (MUST): the name of the `Task` the pointer has rested
   * on for `iconHintDelayMs` (S-124), and its two dates.
   *
   * ⛔ WHICH Task IS NOT DECIDED HERE (MUST NOT). EZ-6 sends that question to
   * table T-023d's order of priority and forbids a second hit test, so the
   * answer arrives as `ScreenSession.taskUnderPointer` from the side that
   * already walks that table.
   */
  | { readonly kind: 'task'; readonly taskUid: number }
  /** FR-085 (MUST): the whole of a row name that was cut. */
  | { readonly kind: 'rowTitle'; readonly groupId: string }
  /** FR-037: the faster way of doing the same thing, shown while the pointer rests on a scrollbar and taken away when it leaves. ⛔ Never shown all the time (MUST NOT). */
  | { readonly kind: 'scrollbar'; readonly axis: 'horizontal' | 'vertical' }

// ------------------------------------------------------------- the view ----

/**
 * The description of the UI parts outside the schedule. PI-37 publishes it, and
 * `ScreenSurface.showScreenView` is what carries it to the page.
 *
 * ⭐ Ten members over the nine units of table T-075 -- UF-61 to UF-69 in that
 * order, with UF-67 filling two -- and ONE member of UF-60's own, which stands
 * first. Each of the nine units reads none of the others' members, which is the
 * whole reason the shape is what it is: the nine can be written at once.
 *
 * ⚠️ WHY UF-67 FILLS TWO. Its row of table T-075 gives it both notices and
 * confirmations, and NT-7 -- the row that says how a question is put -- is
 * a row of that same table. ⛔ A tenth FILE would need a tenth row in table
 * T-075 (check 18 holds `src/` against it); one more manner asked for one more
 * member, not one more unit.
 *
 * ⭐ WHY `language` IS NOT ONE OF THE NINE. It is not a UI part: UF-60's own row
 * of table T-075 is what carries it, in that row's own words. So no unit fills
 * it and `screenViewFromRegions` carries it across itself -- which is also why
 * it is the one member of this type that names no `UF-6n` below.
 */
export interface ScreenView {
  /**
   * UF-60. FR-038 (MUST): the language state is ONE and reaches the WHOLE
   * screen -- ⛔ the help may not stand in a different one (MUST NOT), which is
   * the reading a per-surface answer would allow.
   *
   * ⚠️ Carried, never chosen here: it arrives in `ScreenSession.language`,
   * because LY-5 of table T-060 leaves the Framework as the only layer that may
   * hold a current value, and FR-038 (MUST NOT) keeps it out of the document.
   * ⭐ `HelpModal.language` is THIS value seen from inside the help, not a
   * second state: FR-038 puts the second toggle there and requires the current
   * language to be readable beside it.
   */
  readonly language: DisplayLanguage
  /** UF-61 */
  readonly frame: ScreenFrame
  /** UF-62 */
  readonly appHeaderItems: AppHeaderItems
  /** UF-63 */
  readonly rowTitlePanel: RowTitlePanel
  /** UF-64. `null` when the panel is closed -- which is also how it goes into an export (EP-8). */
  readonly propertiesPanel: PropertiesPanel | null
  /** UF-65. `null` while S-99e says it is hidden; EP-11 exports it closed as well. */
  readonly commandPalette: CommandPalette | null
  /** UF-66. `null` while S-99g says none is open. */
  readonly openModal: OpenModal | null
  /** UF-67, in the order they are shown. */
  readonly notices: readonly Notice[]
  /**
   * UF-67. U-55 of table T-103, or `null` while nothing is waiting to be
   * answered (NT-7). ⚠️ Wider than what was raised: `entries` is added here.
   */
  readonly confirmation: Confirmation | null
  /** UF-68. `null` while the `Agent API` is off (FR-066). */
  readonly dialogueField: DialogueField | null
  /** UF-69 */
  readonly tooltips: readonly Tooltip[]
}

/**
 * What the properties panel is pinned to (FR-072).
 *
 * ⭐ TWO SETS, because rows are selected apart from everything else: SL-1 of
 * table T-023c leaves them out of the drawing area's selection and FR-085 gives
 * them their own. A subject can hold one, the other, or both -- the panel shows
 * the properties of whatever the last operation picked.
 */
export interface PropertiesSubject {
  /** The table T-023c selection as it stood when the last operation chose it. */
  readonly selection: Selection
  /** The rows FR-085 had selected then, by `TaskGroup.id` (AT-51). */
  readonly groupIds: readonly string[]
}

/**
 * What the shell holds for this reading session and hands over each frame.
 *
 * ⭐ Why any of this is an argument at all: LY-5 of table T-060 leaves the
 * Framework as the only layer that may hold a current value, and every one of
 * these is either a value table T-206 keeps out of the document or a
 * measurement only the shell can make. ⚠️ They are NOT reachable through a
 * component, which is why they arrive as plain values rather than as a type
 * imported from one.
 */
export interface ScreenSession {
  /** S-99. ⛔ FR-038 (MUST NOT) keeps the chosen language out of the document. */
  readonly language: DisplayLanguage
  /**
   * FR-101. The file the document is open from, and when it was last written
   * to -- both `null` before it has ever been written to one.
   *
   * ⚠️ Neither is a value of the document (LY-5): the shell holds them,
   * because only it knows which handle the last write went through.
   */
  readonly openedFileName: string | null
  readonly fileSavedAt: string | null
  /**
   * FR-065. ⚠️ S-99b (MUST) keeps the record in the environment and
   * remembers it PER BROWSER ORIGIN. Turning the API on is the reader's
   * judgement about their own tooling, not the document's content.
   * ⛔ A PER-DOCUMENT SCOPE CANNOT BE BUILT: nothing in the specification
   * points at one document -- AT-1 (`Project.id`) admits `null` and is no
   * primary key. ⚠️ The requirement calls the wider scope a price knowingly
   * paid, which is why the MUST above it -- showing on screen that the API is
   * on -- carries more weight, not less.
   */
  readonly isAgentApiEnabled: boolean
  /**
   * S-99i of table T-206 (FR-066) -- whether the reader has put the `Dialogue
   * Field` (U-44) away while the `Agent API` stays on.
   *
   * ⭐ A SEPARATE VALUE FROM `isAgentApiEnabled`, which S-99i (MUST NOT)
   * refuses to let one value carry: that one is a capability and this one is a
   * way of appearing. `dialogue-field.ts` reads both -- the field is up only
   * while the API is on AND this stays true -- and IC-18 (table T-109) moves
   * only this one; IC-20 moves only `isAgentApiEnabled`, above.
   *
   * ⭐ DEFAULT `true`, which is S-99i's own default. ⚠️ Not in the
   * document, the same as `isAgentApiEnabled` just above and for the same
   * reason: table T-206 keeps this in the environment, not in `Schedule`.
   */
  readonly isDialogueFieldVisible: boolean
  /**
   * FR-068 -- the document that would be handed to an AI, for the `AI Export
   * Modal` (U-30) to show. `undefined` while that surface is not standing.
   *
   * ⭐ HANDED IN AND NOT BUILT HERE. FR-068 (MUST) names table T-024's
   * `GRS JSON` as the document handed over, and (MUST NOT) forbids a new
   * exchange format for this face. That format is DocumentCodec's (IO-2), a
   * component chapter 5.3 gives ScreenRenderer no edge to, and `Schedule` alone
   * is not the document that codec writes. So the shell that holds the whole
   * `Document` fills this, the way it fills `openedFileName` and
   * `isAgentApiEnabled` beside it.
   *
   * ⚠️ OPTIONAL, AND THAT IS THE COST OF THE SURFACE BEING ONE OF SIX. A caller
   * that never opens U-30 has nothing to put here, and the surface cannot be
   * open without the shell having filled it -- `openModalFromScreenState` says
   * what it does with an absence.
   */
  readonly aiExportDocument?: string
  /**
   * U-42 `Pointer`, or `null` while it is outside the window. Read by FR-037's
   * hint and by EZ-2's wait (table T-040).
   *
   * ⛔ NOT BY FR-053'S FAINT PALETTE, which used to be the third reader. That
   * requirement (MUST) judges the faintness by which PART the pointer is on,
   * and a point alone cannot answer that -- see `CommandPalette`. ⚠️ HF-6's
   * controls of table T-051 are answered the same way, by the side that drew
   * them.
   */
  readonly pointer: { readonly x: number; readonly y: number } | null
  /**
   * How long the pointer has rested where it is. EZ-2 of table T-040 shows an
   * icon's explanation once this passes `iconHintDelayMs` (S-124) -- ⛔ the
   * number is in the settings, not here.
   */
  readonly pointerRestedMs: number
  /**
   * EZ-2 of table T-040 (MUST): the icon the pointer is resting ON, or `null`
   * while it rests on none. The explanation EZ-2 shows is THAT icon's.
   *
   * ⭐ WHY THE ANSWER COMES FROM THE SHELL. EZ-2 states a TIME condition, which
   * `pointerRestedMs` answers, and a PLACE condition, which nothing this
   * component may reach can: no part of `ScreenView` carries an entry's
   * rectangle, PI-35's rectangles are the regions and not the entries inside
   * them, and `_source/components.json` gives this component no edge to
   * ScheduleLayout. The unit that DREW the entries is DomScreenSurface (PI-38),
   * so the shell is the one side that knows -- which is what this whole type is
   * for.
   *
   * ⛔ NO TABLE HOLDS IT. Searched: FR-092 (table T-040), FR-029, table T-109,
   * table T-203 and table T-206. Recommended because the alternative -- an
   * `IconId` keyed to a rectangle inside `ScreenView` -- would make every unit
   * that emits a `CommandItem` invent a layout it cannot measure.
   *
   * ⭐ WHERE THE SHELL GETS IT FROM IS NOW SETTLED, although WHO KEEPS IT still
   * is not: `ScreenSurface.readScreenPartAt` (IF-9) answers which entry a point
   * is on, so the shell asks the surface rather than reading its markup. The
   * rule Chapter 5.3 states under table T-065 is the same one this note argues
   * from -- the side that drew the entry is the side that answers.
   *
   * @provisional PND-141
   */
  readonly iconUnderPointer: IconId | null
  /**
   * EZ-6 of table T-040 (MUST): the `Task` the pointer is resting ON, or
   * `null` while it rests on none. The name and the two dates EZ-6 shows are
   * THAT Task's.
   *
   * ⭐ WHY THE ANSWER COMES FROM THE SHELL, AND WHY IT IS THE WHOLE `Task`.
   * EZ-6 (MUST) sends 「どのタスクの上か」 to table T-023d's order of priority
   * and (MUST NOT) forbids raising a second hit test -- and the one walk of
   * that table is `itemAtPointer` (PI-7), read against a `ScheduleGeometry`
   * this component may not reach. So the side that already asks it is the one
   * side that may answer, exactly as `iconUnderPointer` above. ⚠️ The Task
   * itself and not its `uid`: this component is handed no `Schedule` in the
   * unit that builds the tooltips, and a lookup here would need one.
   *
   * ⚠️ OPTIONAL, WHICH THE MEMBERS ABOVE ARE NOT. A description that does not
   * carry it is one from a side that has not been taught to answer yet, and it
   * reads the same as a pointer resting on no Task -- ⛔ never as a Task whose
   * explanation may be invented here.
   */
  readonly taskUnderPointer?: Task | null
  /**
   * Whether the reader has put the standing explanation away -- IN-3 of table
   * T-028's dismissal, spent through the last rung of IN-4's ladder.
   *
   * ⛔ WITHOUT THIS MEMBER THE RUNG CANNOT BE SPENT AT ALL. EZ-2 and EZ-6 of
   * table T-040 raise an explanation purely from the rest (`pointerRestedMs`)
   * and the place (`iconUnderPointer`, `taskUnderPointer`), so a press taken on
   * the far side is undone by the very next frame -- it raises the same
   * explanation from the same two unchanged answers, and `Esc` leaves the
   * explanation standing however often it is pressed.
   *
   * ⭐ THE SIDE THAT HOLDS IT IS THE SHELL, for the reason every member of this
   * type is here: LY-5 of table T-060 leaves a current value with the
   * Framework, and `escapeTarget` reports the rung to the one holder that can
   * see whether an explanation stands.
   *
   * ⭐ CLEARED BY THE NEXT POINTER MOVE, which is IN-3's own 「引き金が外れる
   * まで」 read forwards: a move begins EZ-2's wait again, so the next
   * explanation is raised on its own terms rather than blocked by a dismissal
   * that belonged to the place the pointer has left.
   *
   * ⚠️ OPTIONAL, AND THE SAME PRICE `taskUnderPointer` PAYS: a description from
   * a side that has not been taught to answer carries no dismissal, which reads
   * the same as one nobody has made -- ⛔ never as an explanation that may be
   * withheld here for a reason this unit invented.
   */
  readonly isTooltipDismissed?: boolean
  /** Where the person dragged the palette to (FR-053). See `CommandPalette.at`. */
  readonly commandPaletteAt: { readonly x: number; readonly y: number }
  /**
   * The light/dark the reader chose (S-72), and the hue the document carries
   * (S-73, held at `Project` by DR-5 of table T-052).
   *
   * ⛔ WITHOUT THESE THE THEME CANNOT BE PAINTED AT ALL. FR-041 (MUST) has the
   * ground painted and forbids (MUST NOT) leaving it to the environment's own
   * system colours, which follow the OPERATING SYSTEM rather than the reader's
   * choice -- and the side that paints is across IF-9 from every unit that can
   * read a setting. Carried nowhere else, a reader could choose dark and the
   * screen would stay light.
   *
   * ⭐ THE HUE TRAVELS AS A NUMBER, ONCE. Table T-236 writes `H` wherever a
   * colour follows the theme, so the painting side substitutes this one value
   * rather than each row restating it.
   */
  readonly themePreference: 'light' | 'dark'
  /** See `themePreference`. S-73, and the value table T-236's `H` stands for. */
  readonly themeHue: number
  /**
   * Whether the milestone glyph list is open (S-142 of table T-206).
   *
   * ⛔ FR-053 (MUST) keeps the eight milestone shapes out of the palette until
   * this is on, so that the entrances a person rarely uses do not hide the
   * schedule underneath (GL-002). IC-50 both opens and folds it -- one entrance
   * in two states, and FR-053 (MUST NOT) refuses a second one.
   *
   * ⭐ HELD BY THE SHELL, like every other member here: it is the way the
   * screen is being used and not part of the document, which is why table
   * T-206 is where the specification records it (LY-5 of table T-060).
   * ⛔ NOT a 面 -- `Esc` must not close it (FR-053), because nothing is drawn
   * over anything: the palette's own list simply grows.
   */
  readonly isMilestoneListOpen: boolean
  /**
   * Whether the palette is minimised (S-200 of table T-206).
   *
   * ⛔ NOT `S-99e`, WHICH IS A DIFFERENT STATE. That row says whether the
   * palette is SHOWN at all, and FR-053 (MUST) puts its entrance outside the
   * palette so a hidden palette can be brought back; minimising is one of the
   * shapes of being shown, and its entrance rides on the palette itself
   * (IC-75). A palette that is not shown is not minimised, it is absent.
   *
   * ⭐ HELD BY THE SHELL for the reason `isMilestoneListOpen` gives -- table
   * T-206 keeps it out of the document (LY-5 of table T-060).
   * ⛔ NOT a 面 -- FR-053 (MUST NOT) refuses to let `Esc` restore it, for the
   * same reason it refuses `Esc` for the glyph list: nothing is drawn over
   * anything, so IN-4 of table T-028 gains no level.
   */
  readonly isPaletteMinimised: boolean
  /**
   * Whether the record of the happenings and the frames is running (S-206 of
   * table T-206).
   *
   * ⭐ FR-102 (MUST) requires this to be readable on the screen -- otherwise a
   * person stops it in their head while it goes on running -- and IC-76 is the
   * one entrance that both starts and stops it, so the entrance itself is where
   * it is read: `CommandItem.isPressed`, which is the member FR-065 and FR-072
   * already show a toggle's state through.
   * ⛔ NOT `isArmed`. FR-053 (MUST NOT) keeps an ARM off the pressed shape, and
   * this is the other thing: an ordinary toggle that is on.
   *
   * ⭐ HELD BY THE SHELL for the reason `isMilestoneListOpen` gives -- FR-102
   * (MUST NOT) keeps the record out of the document and table T-206 is where
   * the specification records it (LY-5 of table T-060).
   *
   * ⚠️ OPTIONAL, WHICH NO OTHER MEMBER OF THIS TYPE IS, and the reading is
   * fixed here rather than left to the caller: absent means NOT recording. A
   * session assembled before FR-102 existed -- `exportScene`'s among them --
   * has nothing to report and is not a session in which a record is running,
   * so the two readings coincide and no caller has to be changed to say so.
   * ⛔ It may not grow a second absent meaning: `undefined` and `false` are
   * one answer here, and anything that needed to tell them apart would be a
   * third state table T-206 does not hold.
   */
  readonly isRecordingInteractions?: boolean
  /**
   * The row GR-20's strip is being held by and the depth it is to be DRAWN at
   * while held, or `null` while no row is held.
   *
   * ⭐ WHAT IT IS FOR (HF-15, MUST): while the row is held it follows the
   * pointer, and the step on the depth axis is `S-37` of table T-201. A row's
   * place on that axis IS its depth, and the panel already draws a depth as
   * `depth x rowTitleIndent` (`RowTitle.indentPx`) -- so the follow is this one
   * number and the pixels are the ones the panel was indenting by all along.
   * ⛔⛔ NOT A TRAVEL IN PIXELS, WHICH IS A MUST NOT: a step of its own
   * is forbidden, and one that differs from the indent leaves the row drifting
   * further from the tree with every level.
   *
   * ⛔ A PICTURE AND NEVER A WRITE. Table T-023d (MUST NOT) forbids writing
   * to the document while the row is held -- the follow is a picture and not an
   * edit -- so this member is what a held row LOOKS like and
   * `TaskGroup.parentId` is untouched until the release settles CM-73 (IN-1 of
   * table T-028).
   *
   * ⭐ HELD BY THE SHELL, for the reason `commandPaletteAt` gives: it is a
   * current value and LY-5 of table T-060 leaves those with the Framework. No
   * row of table T-203 or T-206 keeps it, and none should -- the grab does not
   * outlive the hand.
   *
   * ⚠️ OPTIONAL, and absent reads exactly as `null`: no row is held. A session
   * assembled by a side that does not follow -- `exportScene`'s among them --
   * has no held row to report, and EP-3 of table T-076 draws the panel of a
   * document rather than of a gesture.
   */
  readonly rowGrabbedAt?: {
    readonly groupId: string
    readonly depth: number
    /**
     * Which axis HF-15 (MUST) settled on -- the first direction past the
     * threshold after the grab, held until the release -- so that the held row
     * can be drawn with the band that says which one is live. See
     * `RowTitle.heldOnAxis`.
     */
    readonly axis: 'position' | 'depth'
    /**
     * How far the row still follows the hand on the axis that was REFUSED, in
     * pixels, signed the way the hand went.
     *
     * ⭐ HF-15 (MUST) stops the follow part way on the refused axis, at the
     * ratio `S-212` names, and (MUST NOT) lets the row go on following the
     * pointer after a refusal -- with no resistance the row reads as sliding
     * free of the tree. So it moves a little that way and no further: the hand
     * is answered, and the refusal is still legible.
     * ⛔ THE RATIO IS NOT APPLIED HERE. S-212 multiplies one step of that
     * axis and the translator is where both the ratio and the step stand; this
     * member is the product, in the pixels the panel draws in.
     */
    readonly resistedPx: number
    /**
     * Where the row is drawn while it is held on the position axis -- the top
     * of the place the hand stands at -- or `null` while the grab is the depth
     * axis's and the row keeps the y the layout gave it.
     *
     * ⭐ A PLACE'S OWN EDGE. HF-15 (MUST) walks up and down through the
     * places the row can take at that level, in drawing order, so the row
     * follows the hand ONTO a place; drawn at that place's edge, the picture
     * says where it lands.
     * ⛔ NOT A GAP OPENED FOR IT, AND NOT A MARK BESIDE IT. No row of table
     * T-103 gives a part for a place-to-land and no row of table T-109 an
     * entrance, so nothing of the sort is invented -- the held row is simply
     * drawn there. Searched: HF-15, GR-20 and the preamble of table T-023d,
     * FR-085, FR-029, tables T-103, T-109 and T-221.
     */
    readonly atY: number | null
  } | null
  /**
   * S-211 of table T-206 -- whether level 0, the head of the row title panel,
   * is folded.
   *
   * ⭐⭐ WHY LEVEL 0 HAS A STATE OF ITS OWN. HR-2 of table T-015 (MUST)
   * folds the shallowest level as well, and says why no row's own column can
   * carry it: a row's fold hides what is UNDER it, and the shallowest rows have
   * no parent to hide them -- so level 0 itself has to be foldable for a state
   * with no row drawn to exist at all. ⛔ AT-56 AND AT-57 ARE NOT MOVED FOR
   * IT (MUST NOT), because a column either way changes the shape of the saved
   * document.
   * ⛔ NOT SAVED, which S-211 states outright: it stands where `S-99g` does,
   * screen state and not schedule content -- so the shell holds it and it is
   * lost with the page. ⭐ Two roads back, and that row names both: HF-16
   * (IC-92, one level) and HF-10 (IC-74, everything).
   *
   * ⚠️ OPTIONAL, and absent reads as NOT folded, which is that row's
   * default.
   */
  readonly isLevelZeroFolded?: boolean
  /**
   * Which of `dualCursor`'s two dates (S-65) is following the pointer, or
   * `null` while table T-029a's mode is not up.
   *
   * ⭐ HERE BECAUSE `DC-2` OF TABLE T-029a NAMES THIS TYPE, and PI-36 of table
   * T-064 publishes it under that name.
   * ⛔ IT IS NOT A THIRD KEY OF `documentSettings`, which is the other half of
   * the same ruling: FR-021 round-trips those keys, and which side is following
   * is a passing state of one reading -- DC-8 (MUST NOT) keeps its very mark out
   * of an export, and EP-12 of table T-076 is the row that says why.
   *
   * ⭐ `null` MEANS "NOT IN THE MODE", so the mode is this one value and cannot
   * disagree with itself. DC-1 starts a side following the moment the mode is
   * entered and DC-2 always hands the following over, so "in the mode with
   * nobody following" is a state table T-029a leaves nowhere to be in.
   *
   * ⛔ NO UNIT OF THIS COMPONENT READS IT YET, AND THAT IS THE SPECIFICATION'S
   * DOING RATHER THAN AN OVERSIGHT. Searched for a row that would have one of
   * the nine draw the mode: table T-109 (IC-45's row names the entrance and no
   * pressed state), FR-053 (which settles how an ARMED entrance is told apart
   * and forbids drawing it pressed), FR-029, table T-023b, table T-202 and table
   * T-206. None asks for it. The two lines themselves and DC-8's mark are
   * SvgRenderer's, drawn from `svgFromSchedule`'s own `follow` parameter, and
   * `_source/components.json` gives this component no edge to ScheduleGeometry.
   * ⚠️ WHAT USED TO STAND IN THE SHELL SAID THE MEMBER WOULD BE READ BY NOBODY
   * AND SO DECLINED TO ADD IT. Half of that is measured true -- no unit reads it
   * today -- and the conclusion still does not follow: UF-65 is already handed
   * this whole type, so the fact now ARRIVES where a row could use it, which is
   * what the ruling asked for. Reported rather than answered here.
   */
  readonly dualCursorFollowing: DualCursorSide | null
  /**
   * FR-085 (MUST): the rows selected in the `Row Title Panel`, by
   * `TaskGroup.id` (AT-51). FR-042 reads the same set -- the row whose band
   * colour (AT-58) and height (AT-59) the properties panel puts up is the row
   * selected here.
   *
   * ⚠️ NOT the set table T-023c governs. SL-1 leaves rows out of the drawing
   * area's selection in as many words, and FR-085 says the two are separate, so
   * `Selection` (PI-32) cannot hold them: its `SelectableKind` is SL-1's five.
   *
   * ⛔ NOTHING IN THE SPECIFICATION HOLDS THE SET. Searched: `Selection`,
   * `ScreenState` (S-99e / S-99f / S-99g), table T-203 and table T-206. It sits
   * here for the reason `propertiesShowing` does -- LY-5 of table T-060 leaves
   * the Framework as the only layer that may hold a current value, and a
   * selection is not part of the document (UN-9 of table T-027). ⚠️ It is lost
   * with the page.
   *
   * @provisional PND-142
   */
  readonly selectedGroupIds: readonly string[]
  /**
   * FR-099 (MUST): the resources chosen in the `Resource Roster` (U-49), by
   * `Resource.uid` (AT-85) -- what its select-all and clear-all operate on and
   * what its second way of deleting takes.
   *
   * ⛔ NOTHING HOLDS THIS EITHER, and SL-1 does not admit a resource. Searched
   * as above. Empty is "none chosen"; a roster that is not open leaves it empty
   * too, because S-99g already says which surface is up.
   *
   * @provisional PND-143
   */
  readonly selectedResourceUids: readonly number[]
  /**
   * FR-022 (MUST): the tasks that could correspond in the merge U-61 is asking
   * about -- laid out BEFORE the three answers are offered, which the same
   * requirement's MUST NOT forbids skipping.
   *
   * ⭐ HELD HERE FOR THE REASON `selectedResourceUids` ABOVE IS. LY-5 of table
   * T-060 leaves the Framework as the only layer that may hold a current value,
   * and a pairing worked out for an import that is waiting on an answer is one.
   * ⛔ NOTHING IN THE SPECIFICATION HOLDS IT. Searched: `ScreenState` (S-99g),
   * table T-203, table T-206 and table T-058 -- S-99g carries the surface's NAME
   * and no payload, and the pairing is not part of any document.
   *
   * ⚠️ OPTIONAL, AND ABSENT MEANS NONE -- the same reading `isRecordingInteractions`
   * takes. Every road that is not the merge has nothing to lay out, and a
   * required member would have each of them write an empty list to say so.
   */
  readonly mergeCandidates?: readonly MergeCandidateLine[]
  /**
   * FR-073 (MUST): the columns the intake U-61 is asking about could not be
   * read, because it declares a format version newer than the greatest this
   * build knows -- laid out one by one before anyone is asked to go on.
   *
   * ⭐ HELD HERE FOR THE REASON `mergeCandidates` ABOVE IS. The names are keys
   * of the file being read and of no document this build holds -- nothing in
   * `Schedule` or `DocumentSettings` can answer for them -- and LY-5 of table
   * T-060 leaves the Framework as the only layer that may hold a current value.
   * ⚠️ OPTIONAL, AND ABSENT MEANS NONE, the same reading `mergeCandidates`
   * takes: every intake of a version this build knows has nothing to lay out.
   */
  readonly unreadColumns?: readonly string[]
  /**
   * FR-023 (MUST): the names of the `Task` rows the last import dropped -- what
   * U-62 `Import Report` lays out, and what that requirement (MUST NOT) forbids
   * reducing to a count.
   *
   * ⭐ HELD HERE FOR THE REASON `mergeCandidates` ABOVE IS. The rows are gone
   * from the document by the time the surface stands, so nothing in `Schedule`
   * can answer for them, and LY-5 of table T-060 leaves the Framework as the
   * only layer that may hold a current value.
   * ⚠️ OPTIONAL, AND ABSENT MEANS NONE -- an import that dropped nothing raises
   * no surface at all (FR-023 tells only 「落としたものは」).
   */
  readonly droppedTaskNames?: readonly (string | null)[]
  /**
   * FR-072: which of the two the LAST operation chose, or `null` while the
   * properties panel is closed.
   *
   * ⛔ NOTHING HOLDS THIS EITHER. Table T-203 keeps a width for the panel (S-80)
   * and no key for what it shows, and table T-206 has no row for it -- so the
   * answer lives in the session and is lost with the page, although FR-072
   * states the rule as a MUST.
   */
  readonly propertiesShowing: 'selection' | 'documentSettings' | null
  /**
   * FR-072 (MUST): what the panel was showing when the selection went away, so
   * that it can go on showing it. `null` while no operation has chosen a subject
   * yet. ⚠️ It is no longer SAID that this is the previous subject: FR-072
   * (MUST NOT) forbids the heading row, and its RATIONALE records that as the
   * price.
   *
   * ⭐ THE SUBJECT, NOT THE DRAWN FIELDS. FR-072 also requires a second press of
   * the same entry to bring the panel back to what was selected before, so what
   * has to be remembered is the subject. Keeping the fields instead would go on
   * showing values that an edit had already made untrue, and `PropertyField`
   * carries no way to say a value has stopped being current.
   *
   * ⛔ NOTHING HOLDS IT, for the same reason `propertiesShowing` is not held:
   * table T-203 keeps a width for the panel (S-80) and no key for its subject,
   * and table T-206 has no row for one.
   *
   * @provisional PND-144
   */
  readonly propertiesSubject: PropertiesSubject | null
  /**
   * What has been raised to tell (FR-076). UF-67 decides which are shown, in
   * what order, and in what words.
   *
   * ⭐ HELD BY THE SHELL, like the question beside it: LY-5 of table T-060
   * leaves the Framework as the only layer that may hold a current value, and
   * FR-028 (MUST NOT) makes a refusal a value the caller receives rather than
   * something thrown -- so the side that received it is the side that holds it
   * until it has been told.
   *
   * ⛔ THE RAISED HALF ONLY. FR-038 (MUST) keeps every word the screen prints
   * in the one generated dictionary, which this component holds and the shell
   * does not, so a raiser hands over the manner and the reason and nothing that
   * reads as a sentence.
   */
  readonly notices: readonly RaisedNotice[]
  /**
   * The question waiting to be answered (NT-7 of table T-037), or `null` while
   * none is.
   *
   * ⭐ HELD BY THE SHELL, like the notices beside it: LY-5 of table T-060 leaves
   * the Framework as the only layer that may hold a current value, and a
   * question that is waiting is exactly that. ⛔ Nothing in table T-203 or table
   * T-206 holds it either, so it does not travel in `ScreenState`.
   *
   * ⛔ THE RAISED HALF ONLY. The two answers are the dictionary's word buttons
   * (NT-7, MUST) and UF-67 reads them out of it, so a shell that had to name
   * them here would be the second store of translated strings FR-038 forbids.
   *
   * ⚠️ TWO OF THE THREE ASKING SITES RAISE ONE. See the STOP note in
   * `notices.ts` for the third.
   */
  readonly confirmation: RaisedConfirmation | null
  /**
   * Where each drawn row sits, as the shell measured it this frame.
   *
   * ⭐ ADR-001 has the shell run table T-068 once per frame and hand the result
   * to everyone who draws, so these are already computed. They arrive as bare
   * rectangles because `_source/components.json` gives this component no edge to
   * ScheduleLayout, where `RowPlacement` holds them -- and SC-1 means the panel
   * has to use those very numbers rather than derive its own.
   *
   * ⛔ A gap the specification leaves: EP-3 puts the `Row Title Tree` into the
   * export and WY-3 compares its box against the screen's, while the edge from
   * ImageExporter to this component is what carries it -- so both sides depend
   * on numbers this component cannot read for itself.
   */
  readonly rowBoxes: readonly { readonly groupId: string; readonly box: ScreenRect }[]
  /**
   * How much there is to scroll through, and how much of it is on screen.
   *
   * ⭐⭐ WHY IT IS HERE. GR-21 of table T-023d (MUST) fixes the scrollbar
   * grip's length as the visible range over the whole, and the whole is
   * `ScheduleLayout`'s -- which UF-61 cannot read for itself, because
   * `_source/components.json` gives ScreenRenderer no edge to ScheduleLayout.
   * ⛔ It may not be measured again here either: ADR-001 has the shell run
   * the layout once a frame, and a second computation of an extent this
   * component cannot see would be the duplication chapter 5.3 refuses.
   * ⇒ It arrives the way `rowBoxes` does, as bare numbers the shell reads
   * off the layout it already built.
   *
   * ⚠️ NOT ON `ScreenState`. LY-1 replaces that value whole through the
   * `screenStateWith*` writers PI-36 of table T-064 enumerates, so a new writer
   * could not be called from the shell until that cell named it; and the loop
   * decides whether a wheel or a move owes a picture by
   * `screenState !== before.screenState`, so an extent rewritten every frame
   * makes that test answer true forever and costs a redraw every frame.
   * ⚠️ NOT ON `ScreenRegions` either: the shell builds the regions FIRST and
   * hands them to `layoutFromSchedule`, so the layout is computed FROM them and
   * its extents cannot be inside them.
   *
   * ⛔ NO SETTINGS ROW IS OWED FOR ANY OF THIS: GR-21 refuses one, the ratio
   * being derivable from values that already exist.
   */
  readonly scrollExtent: ScrollExtent
  /**
   * Whether the history holds a step to go back to, and one to come forward to
   * (FR-031, and RD-1 / RD-2 of table T-230).
   *
   * ⭐⭐ WHY THEY ARE HERE AT ALL. FR-029 (MUST) draws faint an entrance
   * a press would change nothing by, and (MUST NOT) allows any surface to hold
   * an entrance out of that rule -- it reaches every row of table T-109. IC-5
   * and IC-6 are two of those rows, and with an empty history a press on either
   * moves no row, no glyph and no label, and raises no telling. ⛔ Without
   * these two members the history is neither an argument here nor a member of
   * `ScreenSession`, which is what the header's STOP note says.
   *
   * ⭐ HELD BY THE SHELL, for the reason every value beside them is: LY-5 of
   * table T-060 leaves the Framework as the only layer that may hold a current
   * value, and `EditHistory` is one. ⛔ A COUNT IS NOT CARRIED, only the two
   * questions FR-029 asks: nothing on the screen prints how deep the history
   * is, and a number would be a second thing to keep in step.
   *
   * ⚠️ OPTIONAL, AND THE READING IS FIXED HERE: absent means NOT KNOWN, and an
   * entrance whose answer is not known stays usable. ⛔ Absent may not be read
   * as 「nothing to undo」 -- a false faint tells the reader an entrance is
   * broken, which is the very reading FR-029 exists to prevent, and the head of
   * `app-header-items.ts` states that discipline for all four of its STOPs.
   * ⚠️ SO THIS IS THE DRAWING HALF ALONE. FR-029's second MUST -- telling
   * the reason only when the entrance is pressed, with `RS-27` of table T-233
   * as the fall-back where no row fits -- is owed by the side that receives the
   * press, and neither this component nor this type can discharge it.
   */
  readonly canUndo?: boolean
  /** The forward half of `canUndo`; that member's note holds both. */
  readonly canRedo?: boolean
}

// ------------------------------------------------- the nine unit contracts ---
//
// ⭐ EACH OF THE NINE READS NONE OF THE OTHER UNITS' MEMBERS -- except
// UF-69, which is handed the nine members built before it. That is the whole
// reason the shape is what it is: the nine can be written at once, and it is
// what fixes the order `screenViewFromRegions` builds in.
// ⚠️ UF-67 fills TWO members, one per manner of table T-037 it answers to;
// every other unit fills one.
// ⛔ The signatures are not restated here: each unit file holds its own, and
// so does the type checker.

/**
 * The description of one frame's UI parts outside the schedule.
 *
 * ⭐ EVERYTHING ELSE, THEN UF-69. The other members are built first and handed
 * to `tooltipsFromScreenView` as one value, because what a tooltip explains is
 * one of the parts they described. That is the only order this function chooses:
 * the units read none of each other, so among themselves the members stand in
 * the order `ScreenView` prints them.
 *
 * ⚠️ ONE RULE OF ITS OWN LIVES HERE, and only because table T-075 puts it here:
 * `language` is UF-60's own cell, so it is carried across from the session by
 * this function rather than by one of the nine. Every OTHER requirement is
 * answered by the unit that owns it, and this function only hands each one the
 * arguments its contract asks for. ⭐ So a rule that looks missing from the
 * screen is missing from that unit, and its STOP note there says why -- looking
 * for it in this file will find nothing.
 *
 * @purity pure
 */
export function screenViewFromRegions(
  regions: ScreenRegions,
  schedule: Schedule,
  settings: DocumentSettings,
  selection: Selection,
  state: ScreenState,
  dialogueLog: DialogueLog,
  session: ScreenSession,
): ScreenView {
  const shown: Omit<ScreenView, 'tooltips'> = {
    // FR-038 (MUST): one language for the whole screen. ⛔ Nothing is chosen or
    // normalised on the way through -- `DisplayLanguage` admits the two FR-038
    // admits and no third, so there is no state to fall back from.
    language: session.language,
    frame: screenFrameFromRegions(regions, settings, state, session),
    appHeaderItems: appHeaderItemsFromDocument(schedule, settings, state, session),
    rowTitlePanel: rowTitlePanelFromSchedule(schedule, settings, selection, session),
    propertiesPanel: propertiesPanelFromSelection(schedule, settings, selection, session),
    commandPalette: commandPaletteFromScreenState(
      state,
      settings,
      selection,
      session,
      // FR-029 (MUST): the target is counted on the side that is DRAWN, and
      // ET-5's member rows are the half of that reading `ScreenSession.rowBoxes`
      // does not carry. ⛔ Never omitted here -- `command-palette.ts` says
      // what omitting it would mean.
      schedule,
    ),
    openModal: openModalFromScreenState(state, schedule, session),
    notices: noticesFromSession(session),
    confirmation: confirmationFromSession(session),
    dialogueField: dialogueFieldFromLog(dialogueLog, session),
  }

  return { ...shown, tooltips: tooltipsFromScreenView(shown, settings, session) }
}

/**
 * The utterance a person settled in the dialogue field, or `null` while they
 * have settled nothing.
 *
 * ⛔ AG-11 (MUST NOT): what has not been settled may not be read as an
 * utterance. That refusal is this function's whole reason for standing between
 * the seam and `postDialogueMessage` -- the half-typed line reaches here and
 * stops.
 *
 * ⚠️ The order AG-11 speaks of is NOT set here. The sequence belongs to
 * `logWithMessage` (PI-33), which is what keeps two writers from choosing the
 * same number and losing a message from AG-6's selection.
 *
 * ⚠️ `author` and `settledAt` are carried, not read: a `pure` unit has no clock
 * and no name to give (CS-1 of table T-066).
 *
 * @purity pure
 */
export function dialogueMessageFromInput(input: DialogueInput): SettledUtterance | null {
  if (!input.isSettled) return null

  // STOP -- ⚠️ NOT DECIDED BY THE SPECIFICATION: whether an empty or
  // whitespace-only utterance is refused, and whether the text has a bound.
  // AG-11 and FR-066 state no rule on the text, AM-18 of table T-107 says only
  // that a settled one is posted, and `_assets/tbl-settings.md` holds no
  // dialogue row -- so there is no value to take and none to receive. The same
  // STOP note stands in `post-dialogue-message.ts`, and neither file may invent
  // the rule the other is missing.
  return { author: input.author, text: input.text, settledAt: input.settledAt }
}

/**
 * The seven weekday words the fourth ruler tier prints beside the day number
 * (`FR-017`, MUST), in the order `AT-17` fixes -- index 0 is Sunday, rising to
 * 6 for Saturday.
 *
 * ⭐ THE ORDER IS THE MODEL'S AND NOT A CHOICE MADE HERE. `AT-17` numbers
 * the weekdays that way and `Project.weekStartDay` (`S-108`) is stored against
 * that numbering, so a caller may index this list with a weekday number and no
 * second table is needed to say how the two line up.
 *
 * ⛔ WHY IT STANDS IN THIS FILE. Chapter 6.2 (MUST) allows the words ONE
 * generated destination in `src/`, and it is `display-words.json` beside this
 * one; UF-60's row already carries the display language, so the language and
 * the dictionary meet here and nowhere else. ⚠️ A second file for the seven
 * would have been a 72nd unit table T-075 does not hold.
 *
 * ⛔ WHY A FUNCTION AND NOT A CONSTANT: `FR-038` (MUST) keeps the display
 * language out of the document, so which column to read is a question about the
 * reader and not about the schedule, and the answer changes under the same
 * document.
 *
 * @purity pure
 */
export function rulerWeekdayWords(language: DisplayLanguage): readonly string[] {
  return displayWords.weekdays.map((one) => one.text[language])
}
