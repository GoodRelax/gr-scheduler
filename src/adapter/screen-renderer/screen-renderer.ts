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
// Selection, DialogueLog and PostDialogueMessage, and the imports below are one
// per edge. ⛔ Nothing here may reach ScheduleLayout or ScheduleGeometry, which
// is why what only they can measure arrives as plain rectangles in
// `ScreenSession`.
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

import type { DialogueLog, DialogueMessage } from '../../entity/document-model/dialogue-log/dialogue-log'
import type { DocumentSettings } from '../../entity/document-model/document-settings/document-settings'
import type { Schedule } from '../../entity/document-model/schedule/schedule'
import type { ScreenState } from '../../entity/document-model/screen-state/screen-state'
import type { Selection } from '../../entity/document-model/selection/selection'
import type {
  ScreenRect,
  ScreenRegions,
} from '../../entity/layout-engine/screen-regions/screen-regions'
import type { SettledUtterance } from '../../use-case/post-dialogue-message/post-dialogue-message'
import type { DialogueInput } from './screen-surface'

export type { DialogueInput, ScreenSurface } from './screen-surface'

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
   * The words for the accessible name and for the explanation EZ-2 shows, in
   * the display language already.
   *
   * ⛔ WHERE THE WORDS COME FROM IS NOT SETTLED. FR-038 requires menus and
   * panels to be shown in the chosen language and names no store of translated
   * strings, and no table holds one. Until it does, the words arrive already
   * chosen and this unit only carries them.
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
   * holds. ⚠️ Nothing generates that table into `src/` today, the way
   * `settings.json` is generated -- so either the roster reaches the code the
   * way `SETTINGS_DEFAULTS` does, or a copy will go stale in silence. It is a
   * gap, not a decision.
   */
  readonly commands: readonly CommandItem[]
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
   * `TaskGroup.label` (AT-53) after FR-085's truncation, or `null` where the
   * row carries none.
   *
   * ⛔ FR-085 fixes the width it is cut to: `rowTitlePanelWidth` (S-79) less the
   * indent for its depth (`rowTitleIndent`, S-37) less the room kept for the
   * controls -- and that room does NOT change with whether the controls are
   * drawn (MUST NOT), because the export does not draw them (EP-4) and the cut
   * would then land in two places. ⛔ `truncateUnits` (S-35) is the wrong value
   * here; FR-085 says so in as many words.
   */
  readonly label: string | null
  /** FR-085 (MUST): what was cut is shown whole in a tooltip. */
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
   */
  readonly isSubjectGone: boolean
  /** Table T-016's items, or the drawing settings, according to `showing`. */
  readonly fields: readonly PropertyField[]
}

export interface PropertyField {
  /** The row that holds this item: `PR-n` of table T-016, or `K-n` of table T-104. */
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
}

// ------------------------------------------------------------ UF-65 ---------

/** U-26 `Command Palette` (UF-65). `null` in `ScreenView` while S-99e says it is hidden. */
export interface CommandPalette {
  /**
   * Where it floats. FR-053 has the person drag it, so its place is not one of
   * ScreenRegions' rectangles.
   *
   * ⛔ NOTHING HOLDS THAT PLACE. Table T-206 has no row for it and neither does
   * table T-203, so it arrives in `ScreenSession` and is lost when the page is
   * left. That is a gap in the specification, not a decision made here.
   */
  readonly box: ScreenRect
  /** FR-053: drawn faintly while the pointer is off it. */
  readonly isPointerOver: boolean
  /** U-34 `Palette Groups`. FR-029 groups them because the number of choices sets the time to decide. */
  readonly groups: readonly PaletteGroup[]
  /**
   * FR-053 (MUST): what is armed has to be readable on the screen. Table T-023b
   * counts the arms. ⚠️ Words rather than a figure, because AR-4 (a dependency)
   * is not a shape and IC-61 has no figure drawn yet.
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
 * A surface opened over the screen (UF-66). IN-4 of table T-028 defines it as
 * what the first press of Esc closes, and S-99g holds which one is open.
 *
 * ⚠️ Singular, although UF-70's file is named for the plural: `ScreenState`
 * carries ONE open surface (S-99g), so at most one is described at a time. The
 * plural in the file name is the set of surfaces that CAN be opened.
 *
 * ⛔ WHAT EACH SURFACE SHOWS IS NOT MODELLED HERE. The five that FR-036 /
 * FR-074 / FR-099 / FR-088 / FR-068 open show unlike things -- a roster with a
 * selection, a calendar, a form, a copyable document. UF-66 declares the shape
 * of each as it writes them and adds them to this type; putting a general
 * container here first would be a guess with nothing behind it.
 */
export interface OpenModal {
  /**
   * The name `ScreenState.surface` carries (S-99g).
   *
   * ⛔ Table T-103 has settled only two of them -- `Help Modal` / `AI Export
   * Modal` (U-30) and `Resource Roster` (U-49). The surfaces FR-074 and FR-088
   * open have no settled name, so no name is minted here for them.
   */
  readonly surface: string
  /** In the display language. */
  readonly heading: string
  /** IC-52 closes it, and Esc's first level does the same (IN-4). */
  readonly commands: readonly CommandItem[]
}

// ------------------------------------------------------------ UF-67 ---------

/**
 * One thing told to the person (UF-67). The manner is table T-037's, which
 * FR-076 turns into a MUST.
 *
 * ⚠️ The same type stands on both sides: `ScreenSession.notices` is what has
 * been raised, and `ScreenView.notices` is what is showing and in what order.
 * ⭐ One type rather than two, because the difference between them is which
 * ones and in which order -- not what a notice is.
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
   * NT-1 (MUST): which item, and why, in words. ⛔ Colour or a border alone is
   * forbidden (MUST NOT), so the words are not optional.
   */
  readonly text: string
  /**
   * NT-3a (MUST): what can be done next. ⛔ A failure told without one of these
   * is forbidden (MUST NOT). Empty for the rows that do not ask for it.
   */
  readonly nextSteps: readonly string[]
  /**
   * NT-3: how many things a destructive result reaches. `null` where the row
   * does not ask for a count.
   */
  readonly affectedCount: number | null
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
   * own BECAUSE an utterance does not raise the revision (FR-063). ⛔ Do not
   * order these by the revision or by `settledAt`: the first cannot see them and
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
 * ⭐ Nine members, one per unit of table T-075 -- UF-61 to UF-69 in that order.
 * That is the whole reason the shape is what it is: each unit fills exactly one
 * member and reads none of the others, so the nine can be written at once.
 */
export interface ScreenView {
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
  /** UF-68. `null` while the `Agent API` is off (FR-066). */
  readonly dialogueField: DialogueField | null
  /** UF-69 */
  readonly tooltips: readonly Tooltip[]
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
   * hint, HF-6's controls and FR-053's faint palette.
   */
  readonly pointer: { readonly x: number; readonly y: number } | null
  /**
   * How long the pointer has rested where it is. EZ-2 of table T-040 shows an
   * icon's explanation once this passes `iconHintDelayMs` (S-124) -- ⛔ the
   * number is in the settings, not here.
   */
  readonly pointerRestedMs: number
  /** Where the person dragged the palette to (FR-053). See `CommandPalette.box`. */
  readonly commandPaletteAt: { readonly x: number; readonly y: number }
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
  /** What has been raised to tell (FR-076). UF-67 decides which are shown, and in what order. */
  readonly notices: readonly Notice[]
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
// ⭐ THE CONTRACT THE NINE INTERNAL UNITS ARE WRITTEN AGAINST. Each fills one
// member of `ScreenView` and reads none of the others. ⛔ None of them is
// written yet, and nothing below calls them.
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
//     clears it. `isPointerOver` is the condition it does state.
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
//     ⚠️ NT-4 (MUST) gathers what is pending at startup into ONE surface rather
//     than showing them one after another, so this is where several become one.
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
//     ⭐ Takes the eight already built, because what a tooltip explains is one of
//     the parts they hold. That fixes the order `screenViewFromRegions` builds
//     in: the eight, then this one.

/**
 * The description of one frame's UI parts outside the schedule.
 *
 * ⛔ NOT THE FINISHED VIEW. UF-61 to UF-69 are not written, so nothing is
 * described: every list is empty and every surface that can be absent is
 * absent. ⚠️ Three members do carry a value, and each is carried across rather
 * than computed -- `isFullScreen` off S-99f, `documentTitle` off `Project.title`
 * and `autosaveStatus` off the session. Nothing here stands in for a value that
 * has still to be worked out: an empty `commands` says the header draws no
 * entries, which is what is true of this build.
 *
 * ⚠️ The arguments nothing reads yet carry a leading underscore, which is what
 * keeps `noUnusedParameters` green AND says at a glance which of them the body
 * has begun to use. They lose it as the nine units are wired in.
 *
 * @purity pure
 */
export function screenViewFromRegions(
  _regions: ScreenRegions,
  schedule: Schedule,
  _settings: DocumentSettings,
  _selection: Selection,
  state: ScreenState,
  _dialogueLog: DialogueLog,
  session: ScreenSession,
): ScreenView {
  return {
    frame: { isFullScreen: state.fullScreen, dividers: [], scrollbars: [] },
    appHeaderItems: {
      documentTitle: schedule.project.title,
      autosaveStatus: session.autosave,
      commands: [],
    },
    rowTitlePanel: { pinnedTitles: [], titles: [] },
    propertiesPanel: null,
    commandPalette: null,
    openModal: null,
    notices: [],
    dialogueField: null,
    tooltips: [],
  }
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
