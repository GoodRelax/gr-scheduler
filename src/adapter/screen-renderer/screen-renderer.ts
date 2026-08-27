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
// ⭐ WHAT MAY ARRIVE AS AN ARGUMENT is fixed by that same file. This component's
// outgoing edges are ScreenRegions, ScreenState, Schedule, DocumentSettings,
// Selection, DialogueLog and PostDialogueMessage, and the imports from outside
// this folder are one per edge -- the nine beside them are this folder's own
// units, which are not edges. ⛔ Nothing here may reach ScheduleLayout or
// ScheduleGeometry, which is why what only they can measure arrives as plain
// rectangles in `ScreenSession`.
//
// ⭐ WHERE A RECTANGLE APPEARS. A part carries one only where a requirement
// fixes its geometry: the scrollbar lanes and the divider bands (FR-051 /
// FR-052 / SC-4 of table T-031), the row titles SC-1 keeps in step with the
// drawn rows, and the palette the person drags (FR-053). Every other part names
// itself and its state and leaves the placing to the surface. ⛔ Whichever side
// judges a width does it with FR-093's estimate (FR-085 makes that a MUST) --
// measuring the glyphs is forbidden there in as many words.
//
// Nothing outside this folder may import any other file in it
// (Chapter 5.3, MUST NOT), so every name the component publishes
// leaves through here.
//
// The seam declared in this folder is re-exported here because
// the layer that implements it may not reach past this file
// (Chapter 5.3, MUST).
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
import type { Exception, Schedule, WeekDay } from '../../entity/document-model/schedule/schedule'
import type { ScreenState } from '../../entity/document-model/screen-state/screen-state'
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
// ⚠️ Published through this entry rather than reached into `notices.ts`, and
// named by table T-064's PI-37 accordingly.
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
 * ⭐ The row id is the only join that table admits: it says in as many words
 * that the figure lives in figure F-019 and that the table never writes one out
 * in words. ⛔ So an icon is carried by its row id and never by a name invented
 * here -- table T-109 deliberately has no English column, because having one
 * would mint dozens of settled names that the glossary has not settled.
 *
 * ⛔ NOT A ROSTER. Nothing below enumerates the rows of table T-109. Rule 03 of
 * docs/development-rules forbids re-typing a value the specification holds, and
 * that table is not generated into `src/` the way `settings.json` is -- see the
 * note on `AppHeaderItems.commands` for what that leaves open.
 */
export type IconId = string

/**
 * A row of table T-024, e.g. `IO-2`.
 *
 * ⭐ THE ROW ID IS THE ONLY JOIN THAT TABLE ADMITS EITHER, for the reason
 * `IconId` is a row id: table T-024 has no English column, so a format named
 * here would settle a name the glossary has not.
 * `src/adapter/document-codec/exchange-formats.json` -- that table generated
 * into `src/` -- keeps the same bargain, and its banner says so.
 *
 * ⛔ NOT A ROSTER, and NOT `IconId` under a second name. An entry is a row of
 * table T-109 and a format is a row of table T-024; the two tables number their
 * rows independently, so one type for both would let `IO-1` be passed where a
 * table T-109 row is meant and neither side could tell.
 */
export type ExportFormatId = string

/** `language` (S-99). FR-038 keeps it out of the document and admits two. */
export type DisplayLanguage = 'ja' | 'en'

/**
 * The three states FR-061 requires to be told apart (MUST). ⛔ Two would put
 * "saving" and "failed" behind one look, and then a reader cannot tell waiting
 * from acting. IC-55 / IC-56 / IC-57 are their icons.
 */
export type AutosaveStatus =
  /** IC-55. FR-061 (MUST): the time is shown with it. */
  | { readonly kind: 'saved'; readonly at: string }
  /** IC-56. ⚠️ Table T-109 says its icon does not spin. */
  | { readonly kind: 'saving' }
  /** IC-57. FR-061 also raises a notice, whose manner is NT-3a. */
  | { readonly kind: 'failed' }

/**
 * One entry a person can press, wherever table T-109 places it.
 *
 * ⚠️ Table T-109 also holds rows that are NOT buttons (IC-53 to IC-57). Those
 * are not `CommandItem`s -- the ones that show a state reach the screen as the
 * state itself, such as `AppHeaderItems.autosaveStatus`.
 */
export interface CommandItem {
  readonly icon: IconId
  /**
   * FR-029 (MUST): what cannot be used is drawn faint and gives its reason
   * through a tooltip, rather than going quiet -- an entry that does nothing
   * reads as a fault.
   */
  readonly isEnabled: boolean
  /**
   * A toggle that is on. FR-065 shows that the `Agent API` is open this way
   * (IC-20), and FR-072 shows which of its two contents the properties panel is
   * on (IC-17).
   */
  readonly isPressed: boolean
  /**
   * Whether this entry is the one that is ARMED. FR-053 (MUST) requires the
   * armed entrance to be told apart from the entrances that are not.
   *
   * ⛔ A MEMBER OF ITS OWN AND NEVER `isPressed`, which FR-053 (MUST NOT)
   * refuses in as many words 「押されている形にしてはならない」 -- its ground is
   * that table T-109 says of IC-54 「ボタンではない」. `isPressed` is a toggle
   * that is on, and it is what writes `aria-pressed`; an arm announced through
   * it would be announced as a pressed button, which is the very thing the
   * requirement forbids.
   *
   * ⭐ WHICH ENTRY IS WHICH ARM IS TABLE T-109'S OWN FACT. FR-053 says so:
   * 「どの入口がどの構えかは 表 T-109 の `構え` の欄が持つ」. That column reaches
   * `src/` as the `arms` field of `icon-roster.json`, so the join is the
   * generated roster and nothing is minted here.
   *
   * ⚠️ ONLY A PALETTE ENTRY CAN EVER BE ARMED, and that is the table's fact
   * too -- its 構え column holds an em dash for every row of every other
   * surface. The entries the other builders describe carry `false`.
   *
   * ⛔ THE COLUMN IS HALF THE JOIN, AND THE OTHER HALF IS DERIVED BESIDE IT.
   * The column names a ROW of table T-023b, and AR-2 stands against four
   * entries (IC-23 .. IC-26) and AR-3 against eight (IC-27 .. IC-34) -- so on
   * that column alone, arming one task shape marks all four and one milestone
   * glyph all eight, which is not the one entrance the MUST above asks for.
   * ⭐ `icon-roster.json` carries `armsShape` as well: which shape of the kind
   * an entrance arms, derived from table T-012 and from the spellings
   * `_source/erd.json` settles for `TaskVisual.shapeKind` and
   * `TaskVisual.milestoneGlyph`. UF-65 joins on the pair, so exactly one
   * entrance is armed.
   * ⚠️ WHAT USED TO STAND HERE SAID NO FINER JOIN EXISTED, on the ground that
   * the spellings `Armed` carries for a shape and a glyph were unsettled
   * (CR-172). ⛔ MEASURED FALSE 2026-08-27: all thirteen stand in
   * `_source/erd.json`, and PD-291 records the ruling that one entrance and not
   * a group of them is what is to be marked.
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
   * ⛔ THE WORDS ARE NOT WRITTEN YET (PD-160) -- every entry is empty, and the
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
  /** U-28 `Autosave Status` (FR-061). */
  readonly autosaveStatus: AutosaveStatus
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
   * (PD-160) a switch moves no label.
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
  /** U-47 `Row Expander`. `null` where nothing sits under the row. */
  readonly expander: RowExpander | null
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
 * for a row to state. ⚠️ S-139 held that amount and is retired.
 */

/**
 * HF-1 of table T-051: every row that has something under it carries an opening
 * control AND a closing one. ⚠️ They are not one control in two states: HF-2
 * opens ONE level and HF-3 closes ALL of them, so one of the pair can be spent
 * while the other is not.
 */
export interface RowExpander {
  /** HF-2: there is a level below that is not open. */
  readonly canOpen: boolean
  /** HF-3: something below is open. */
  readonly canClose: boolean
}

// ------------------------------------------------------------ UF-64 ---------

/** U-25 `Properties Panel` (UF-64). `null` in `ScreenView` when it is closed. */
export interface PropertiesPanel {
  /**
   * FR-072: the LAST thing the person did decides which of the two the panel
   * shows. ⚠️ Clearing the selection does not move it to the settings (MUST
   * NOT).
   */
  readonly showing: 'selection' | 'documentSettings'
  /** FR-072 (MUST): the heading says which of the two is showing. */
  readonly heading: string
  /**
   * FR-072 (MUST): when the selection went away the panel KEEPS the fields it
   * had and says so in the heading. True is that state.
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
   * `Task`; FR-042 gives a selected ROW its band colour (AT-58) and its height
   * (AT-59), which table T-016 does not hold because that table is the `Task`
   * one; and the settings side is table T-104's keys. All three are `showing:
   * 'selection'` except the last -- FR-072 knows only two panels.
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
   * ⚠️ FR-042's two are named by their COLUMN rather than by a `PR-n`, because
   * table T-016 has no row for either and rule 03 forbids minting one here.
   */
  readonly row: string
  /**
   * Table T-016's own item name.
   *
   * ⚠️ FR-038 does NOT translate these (nor the task and row names), and table
   * T-016 says why it keeps them in English.
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
   * What a `choice` control offers, `null` for every other kind.
   *
   * ⛔ Read from `COLUMN_SHAPES`, never written out: the paragraph under table
   * T-016 (MUST NOT) forbids that table to hold them and names the schema as
   * where they are.
   */
  readonly choices: readonly string[] | null
  /** A `number` control's bounds, where the schema states them. */
  readonly min: number | null
  readonly max: number | null
}

/**
 * Which column of which thing one control edits.
 *
 * ⭐ THE SUBJECT RIDES ALONG, and it has to. IF-9 (「その欄が名乗る行 ID とともに
 * 返し」) fixes the row id as what comes back, and a row id alone says `PR-1`
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
   * along the palette's TOP EDGE, whose height is S-135a of table T-206. `null`
   * while that value has not reached `src/`.
   *
   * ⭐ A HEIGHT AND NOT A RECTANGLE, which is the whole of the shape decision.
   * GR-19 states WHERE the band goes -- along the top edge, and `at` is already
   * that edge's corner -- and S-135a states the one number GR-19 does not: how
   * far down it reaches. The remaining two numbers of a rectangle cannot be
   * stated on this side at all, because FR-053 (MUST) has the palette's size
   * follow its contents: how wide the entries came out is known only where they
   * were laid out, past IF-9. ⛔ So the band's WIDTH is the palette's own,
   * spread by the side that laid the contents out. A rectangle here would be
   * the second lie CR-235 took out of this very type -- the surface read the
   * zero extent it used to carry as an extent someone had measured, and drew a
   * box of that size.
   *
   * ⛔ NOT AN ENTRY, AND SO NOT IN `groups`. Table T-109 says of IC-53
   * 「掴んで動かせることを示す。ボタンではない」, which is why UF-65 keeps that
   * row out of the `CommandItem`s. It is a thing to SHOW and a thing to GRAB,
   * and this member is how both reach the screen.
   *
   * ⛔ ALWAYS A NUMBER, AND NEVER ONE TYPED HERE. GR-19 is a MUST and stands
   * FIRST in table T-023d, so a palette drawn without a band breaks that row --
   * there is no state in which this member has nothing to say. Table T-206
   * states the height at S-135a and it arrives generated, which is the road rule
   * 03 section 1 requires; ⛔ zero is not a value it may take, being a band no
   * one can grab, and GR-19 says in as many words that a palette that cannot be
   * grabbed can never be moved again.
   *
   * ⭐ WHAT THE DRAWING SIDE OWES IT. The band is drawn INSIDE the part that
   * carries the palette's own role and never beside it: FR-053 (MUST) judges
   * the faintness by which PART the pointer is on, and the band IS part of the
   * palette -- drawn as a sibling it would leave the palette faint at the very
   * moment it is being grabbed. And it is marked with IC-53 the way an entry is
   * marked, so that `ScreenSurface.readScreenPartAt` answers `IC-53` for a point
   * on it (see `ScreenPart.entry`) and a press on it has somewhere to arrive.
   * ⚠️ GR-19 also gives the band the topmost claim on a point 「帯の下に何が描か
   * れていても帯が勝つ」, which for a palette floating over the schedule is what
   * the topmost drawn node at that point already answers.
   */
  readonly grabBandHeight: number
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
   */
  readonly armedText: string
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
}

/** U-30 `AI Export Modal` of table T-103 -- the half of that row FR-068 opens. */
export interface AiExportModal extends OpenSurface {
  readonly surface: 'AI Export Modal'
  /**
   * FR-068: the document that would be handed to an AI. One value, because the
   * requirement shows and copies the same thing.
   *
   * ⛔ NO ENTRY FOR THE COPY. FR-068 asks for a way to put it on the clipboard,
   * and table T-109 -- which FR-029 makes the whole of the icons (MUST) -- holds
   * no row for one, so a `CommandItem` for it would mint an icon. The text is
   * carried; the control is a gap in table T-109.
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

/** U-54 `Export Chooser` of table T-103, the surface FR-096 opens. */
export interface ExportChooser extends OpenSurface {
  readonly surface: 'Export Chooser'
  /**
   * FR-096 (MUST): every format table T-024 gives an out direction, in that
   * table's own print order.
   *
   * ⭐ WHY THIS MEMBER HAS TO EXIST AT ALL, when U-56 `Open Chooser` needs
   * nothing but `commands`: FR-029 (MUST) makes table T-109 the whole of the
   * icons, and that table places nothing but IC-52 on this surface. IC-3 is the
   * one entrance the table gives FR-096, and it stands on the `App Header` and
   * OPENS the chooser -- an entrance per format is what the same requirement
   * forbids (MUST NOT). So the formats cannot arrive as `CommandItem`s without
   * minting rows, and they arrive as the rows table T-024 gives them instead.
   *
   * ⛔ NO WORDS TRAVEL WITH THEM. `display-words.json` has no section keyed on a
   * row of table T-024, so there is nothing to read and FR-038 (MUST NOT)
   * forbids writing one here.
   * ⛔ NO PROPOSED NAME TRAVELS WITH THEM EITHER, although FR-096 makes the name
   * the chooser proposes a MUST: it is the document name with the extension
   * table T-024 gives the chosen row, and that column reaches
   * `src/adapter/document-codec/exchange-formats.json` -- another component's,
   * which `_source/components.json` gives this one no edge to. So the name is
   * built where the file is written and never here.
   */
  readonly formats: readonly ExportFormatId[]
}

/**
 * The surface open over the screen, described as the requirement that opens it
 * asks for (UF-66).
 *
 * ⭐ DISCRIMINATED ON THE SURFACE, so a reader can tell from the type which one
 * carries what. Five requirements open one -- FR-036, FR-074, FR-099, FR-088 and
 * FR-068, the UF-66 row of table T-075 -- and the name of each is what
 * `ScreenState.surface` carries (S-99g).
 *
 * ⛔ THE UF-66 ROW OF TABLE T-075 IS SHORT BY TWO, and the two are named
 * surfaces: FR-096 opens U-54 `Export Chooser` and OP-3 of table T-024a opens
 * U-56 `Open Chooser`, both of which S-99g holds and IN-4's first level closes.
 * The row's roster of requirements has not been widened to say so. ⛔ Nothing
 * here reads that row, so the omission costs this file nothing; it is recorded
 * because the row is what a reader counts the surfaces from.
 *
 * ⛔ FOUR NAMES ARE SETTLED AND TWO ARE NOT. Table T-103 spells `Help Modal`
 * and `AI Export Modal` (U-30), `Resource Roster` (U-49) and `Export Chooser`
 * (U-54), copied here spelling and all. FR-074's surface and FR-088's have no
 * row in that table, so
 * ⛔ no name is minted for either: each is carried by the one thing the
 * specification does give it, its requirement's own UID -- the move `IconId`
 * makes with `IC-7` and `Notice.manner` with `NT-1`.
 *
 * ⚠️ THE LAST MEMBER TAKES ANY OTHER NAME, and it is not a spare shape: S-99g
 * holds a name rather than a choice among six, so a name outside the six has
 * to stay describable. ⛔ It is also why this type cannot by itself force the
 * six payloads to be filled -- a bare `{ surface, heading, commands }` lands
 * there whatever its name. What requires them is the requirement, not the type.
 * ⚠️ For the same reason, a caller narrows by what a member carries
 * (`'resources' in modal`) rather than by comparing the name: a `string`
 * discriminant is comparable to every literal, so TypeScript keeps the last
 * member in every comparison.
 *
 * @provisional PD-140
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
  // Any other name S-99g carries. ⛔ Nothing beyond the three members every
  // surface has: with no settled name for FR-074's surface or FR-088's, a caller
  // that spelled either differently cannot be told from the other.
  | (OpenSurface & { readonly surface: string })

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
   * or the empty string while the dictionary holds no word for it (PD-160).
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
   * dictionary holds no step to read (PD-160).
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
   * holds no word for it (PD-160).
   *
   * ⭐ A WORD AND NEVER A SHAPE, the bargain `Confirmation.shownOnAnotherRowMark`
   * already keeps: FR-029 (MUST) makes table T-109 the whole of the icons and
   * RC-13 of table T-026 keeps a new one the user's own decision, so nothing
   * here may raise one. ⚠️ NT-8 (MUST) has this one word spelled the same in
   * BOTH display languages, which is the user's ruling of 2026-08-25 and not a
   * translation this side may skip: the dictionary still holds a cell per
   * language, and both cells hold it.
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
   * every telling wearing it. This member is what tells one of the list from
   * the next, which is the whole of what NT-8's 「その場で消せること」 needs
   * from the description.
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
   * something that takes nothing with it -- overwriting a file is the case the
   * user settled on 2026-08-21 -- and NT-7 asks for names only "where there is
   * something that goes".
   */
  readonly items: readonly ConfirmationItem[]
}

/**
 * U-55 `Confirmation` of table T-103 -- the raised question WITH the surface it
 * stands on (UF-67).
 *
 * ⭐ THE TWO ANSWERS ARE THE ROSTER'S, NOT THE ASKER'S. The preamble above table
 * T-109 fixes its 面 column as table T-103's settled names, so which entries
 * stand on this surface is that table's answer and UF-67 reads it out of
 * `icon-roster.json`. ⛔ That is why this type is not what a caller raises:
 * `ScreenSession.confirmation` takes `RaisedConfirmation`, and the entries are
 * added on the way to the screen.
 *
 * ⛔ NT-8's ENTRANCE MAY NOT STAND HERE (MUST NOT), which is why this type does
 * not extend `Notice` and carries neither `dismissText` nor `dismissKey`. That
 * row lets a person put a TELLING away; this surface asks a question, and a
 * third way out of it would be an answer that is neither of `entries` -- the
 * two NT-7 (MUST) makes the whole of the choice. ⚠️ The reading `Esc` gives is
 * not a third one either: IN-4 of table T-028 spends it as calling the question
 * off, which is IC-70's answer arriving by another road.
 */
export interface Confirmation extends RaisedConfirmation {
  /**
   * What NT-7 is CALLED, in the display language (FR-038), or the empty string
   * while the dictionary holds no word for it (PD-160).
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
   * row (PD-160).
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
   * IC-69 and IC-70 of table T-109, in that table's own print order.
   *
   * ⭐ NT-7 (MUST) makes choosing between the two the whole of this surface, so
   * neither can be spent and neither is a toggle: `isEnabled` is true and
   * `isPressed` is false on both.
   */
  readonly entries: readonly CommandItem[]
  /**
   * What an item whose `isShownOnAnotherRow` is true is marked WITH, in the
   * display language (FR-038), or the empty string while the dictionary holds
   * no word for it (PD-160).
   *
   * ⭐ A WORD, NEVER A SHAPE. FR-032 (MUST) asks for the mark and PD-175 settled
   * what it is made of: table T-109 is the whole of the icons and RC-13 of table
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
 * ⚠️ WHY UF-67 FILLS TWO. Its row of table T-075 reads 「通知と確認（FR-076。
 * 作法は 表 T-037）」, and NT-7 -- the row that says how a question is put -- is
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
  /** FR-061. */
  readonly autosave: AutosaveStatus
  /**
   * FR-065. ⚠️ S-99b remembers this per document but keeps the record in the
   * environment: turning the API on is the reader's judgement, not the
   * document's content.
   */
  readonly isAgentApiEnabled: boolean
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
   * @provisional PD-141
   */
  readonly iconUnderPointer: IconId | null
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
   * read a setting. Measured 2026-08-25: nothing carried either number across,
   * which is the whole reason a reader could choose dark and stay light.
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
   * schedule underneath (GL-002). IC-50 opens it and IC-51 closes it.
   *
   * ⭐ HELD BY THE SHELL, like every other member here: it is the way the
   * screen is being used and not part of the document, which is why table
   * T-206 is where the specification records it (LY-5 of table T-060).
   * ⛔ NOT a 面 -- `Esc` must not close it (FR-053), because nothing is drawn
   * over anything: the palette's own list simply grows.
   */
  readonly isMilestoneListOpen: boolean
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
   * @provisional PD-142
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
   * @provisional PD-143
   */
  readonly selectedResourceUids: readonly number[]
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
   * that it can go on showing it and say so in the heading. `null` while no
   * operation has chosen a subject yet.
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
   * @provisional PD-144
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
   * ⛔ THE RAISED HALF ONLY. The two answers are table T-109's (IC-69 / IC-70)
   * and UF-67 reads them out of the roster, so a shell that had to name them
   * here would be settling the placement that table already settles.
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
}

// ------------------------------------------------- the nine unit contracts ---
//
// ⭐ THE CONTRACT THE NINE INTERNAL UNITS ARE WRITTEN AGAINST. Each reads none
// of the other units' members -- except UF-69, which is handed the nine members
// built before it. All nine are written, and `screenViewFromRegions` below
// calls them in the order the UF-69 note at the foot of this section fixes.
// ⚠️ UF-67 fills TWO members, one per manner of table T-037 it answers to; every
// other unit fills one.
//
//   UF-61  screen-frame.ts
//     export function screenFrameFromRegions(
//       regions: ScreenRegions,
//       settings: DocumentSettings,
//       state: ScreenState,
//     ): ScreenFrame
//     ⚠️ The scrollbar thickness is not an argument and must not become a
//     setting (FR-051, MUST NOT). It is the gap between the `Row Area`'s right
//     edge and the `Properties Panel`, less `canvasPadding` (S-56) -- which is
//     the same arithmetic FR-052 states, read backwards.
//
//   UF-62  app-header-items.ts
//     export function appHeaderItemsFromDocument(
//       schedule: Schedule,
//       settings: DocumentSettings,
//       state: ScreenState,
//       session: ScreenSession,
//     ): AppHeaderItems
//
//   UF-63  row-title-panel.ts
//     export function rowTitlePanelFromSchedule(
//       schedule: Schedule,
//       settings: DocumentSettings,
//       selection: Selection,
//       session: ScreenSession,
//     ): RowTitlePanel
//
//   UF-64  properties-panel.ts
//     export function propertiesPanelFromSelection(
//       schedule: Schedule,
//       settings: DocumentSettings,
//       selection: Selection,
//       session: ScreenSession,
//     ): PropertiesPanel | null
//     ⚠️ `showing` is NOT worked out here from what happened last -- nothing in
//     this component sees an operation. It arrives as
//     `ScreenSession.propertiesShowing`, whose note says where FR-072's answer
//     is meant to be kept and is not.
//
//   UF-65  command-palette.ts
//     export function commandPaletteFromScreenState(
//       state: ScreenState,
//       selection: Selection,
//       session: ScreenSession,
//     ): CommandPalette | null
//     ⚠️ Table T-023c's SL-1 does not admit the palette, so FR-053 warns against
//     writing its faintness as a selection -- there would be no state that
//     clears it.
//     ⛔ NOR IS THE FAINTNESS ANSWERED HERE AT ALL. FR-053 (MUST) judges it by
//     which PART the pointer is on, and the only side that can say is the one
//     that drew the parts (IF-9's fourth member). So `CommandPalette` carries a
//     corner and no extent, and this unit never asks where the pointer is.
//
//   UF-66  open-modals.ts
//     export function openModalFromScreenState(
//       state: ScreenState,
//       schedule: Schedule,
//       session: ScreenSession,
//     ): OpenModal | null
//
//   UF-67  notices.ts
//     export function noticesFromSession(session: ScreenSession): readonly Notice[]
//     export function confirmationFromSession(session: ScreenSession): Confirmation | null
//     ⚠️ NT-4 (MUST) gathers what is pending at startup into ONE surface rather
//     than showing them one after another, so this is where several become one.
//     ⭐ The second member is NT-7's -- the manner for ASKING, which table T-037
//     gained on 2026-08-21. Table T-075 gives this unit 「通知と確認」, so both
//     manners are one unit's, and neither reads the other's member.
//     ⚠️ BOTH WIDEN what they are given. The session holds a `RaisedNotice` and
//     a `RaisedConfirmation`; the answers are a `Notice` and a `Confirmation`,
//     because the words FR-038 (MUST) keeps in the one dictionary and the
//     entries table T-109 places on U-55 are both this component's to read and
//     neither is the raiser's to supply.
//
//   UF-68  dialogue-field.ts
//     export function dialogueFieldFromLog(
//       log: DialogueLog,
//       session: ScreenSession,
//     ): DialogueField | null
//
//   UF-69  tooltips.ts
//     export function tooltipsFromScreenView(
//       shown: Omit<ScreenView, 'tooltips'>,
//       settings: DocumentSettings,
//       session: ScreenSession,
//     ): readonly Tooltip[]
//     ⭐ Takes everything already built, because what a tooltip explains is one
//     of the parts those members hold. That fixes the order
//     `screenViewFromRegions` builds in: the rest, then this one.

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
    frame: screenFrameFromRegions(regions, settings, state),
    appHeaderItems: appHeaderItemsFromDocument(schedule, settings, state, session),
    rowTitlePanel: rowTitlePanelFromSchedule(schedule, settings, selection, session),
    propertiesPanel: propertiesPanelFromSelection(schedule, settings, selection, session),
    commandPalette: commandPaletteFromScreenState(state, selection, session),
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
 * ⭐ THE ORDER IS THE MODEL'S AND NOT A CHOICE MADE HERE. `AT-17` numbers the
 * weekdays that way and `Project.weekStartDay` (`S-108`) is stored against that
 * numbering, so a caller may index this list with a weekday number and no
 * second table is needed to say how the two line up. ⛔ The generator writes
 * the manuscript's entries in the same order for the same reason, and check 27
 * refuses to write when the two disagree.
 *
 * ⛔ WHY IT STANDS IN THIS FILE. Chapter 6.2 (MUST) allows the words ONE
 * generated destination in `src/`, and it is `display-words.json` beside this
 * one; UF-60's row already gives this unit 「画面全体に効く表示言語を運ぶ」, so
 * the language and the dictionary meet here and nowhere else. ⚠️ A second file
 * for the seven would have been a 72nd unit table T-075 does not hold.
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
