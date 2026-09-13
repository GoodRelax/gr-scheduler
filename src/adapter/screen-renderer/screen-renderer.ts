// ScreenRenderer -- public entry of this folder.
//
// @unit      UF-60   (docs/spec/05-07-design.md, table T-075)
// @component ScreenRenderer, layer Adapter (table T-062)
// @purity    pure
// @publishes table T-064 row PI-37
//
// Builds the description (not the page) of the UI parts outside the schedule;
// DomScreenSurface (PI-38) turns it into nodes across IF-9.
//
// The `Time Ruler` (U-19) is not described here: `_source/components.json` gives
// it to SvgRenderer and gives this component no edge to ScheduleLayout or
// ScheduleGeometry, so what only they measure arrives as rectangles in `ScreenSession`.
// A part carries a rectangle only where a requirement fixes its geometry
// (dividers, scrollbars, row boxes); the rest leave placing to the surface.
//
// Chapter 5.3 (MUST NOT) keeps the folder's other files unimportable, so every
// published name, the seam and the part types included, is exported here.

// Only the ruler's weekdays are read here; each sub-unit imports its own words.
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

// PI-37: the shell owns the raised tellings (LY-5) and must name the one a press
// put away; it may not rebuild the key, or the two spellings drift (NT-4).
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
 * A row of table T-109, e.g. `IC-7`. Never a name minted here: the table has no
 * English column, so a minted name would settle one the glossary has not.
 */
export type IconId = string

/**
 * A row of table T-024, e.g. `IO-2`. Not `IconId`: the tables number rows
 * independently, so one type would let `IO-1` pass for a table T-109 row.
 */
export type ExportFormatId = string

/** `language` (S-99, FR-038). */
export type DisplayLanguage = 'ja' | 'en'

/**
 * One entry a person can press (table T-109). Rows that are not buttons (IC-53,
 * IC-54) are not `CommandItem`s; a state they show arrives as the state itself.
 */
export interface CommandItem {
  readonly icon: IconId
  /** FR-029 */
  readonly isEnabled: boolean
  /** A toggle that is on (e.g. IC-20 for FR-065, IC-17 for FR-072). */
  readonly isPressed: boolean
  /**
   * The armed entry (FR-053). Not `isPressed`, which writes `aria-pressed` and
   * would announce an arm as a pressed button.
   * UF-65 joins on `icon-roster.json`'s `arms` AND `armsShape`: `arms` alone
   * names a table T-023b row several entrances share. Non-palette entries: `false`.
   */
  readonly isArmed: boolean
  /**
   * Accessible name in the display language, from `display-words.json` by row.
   * EZ-2's explanation is the separate `hint` word, read by UF-69.
   */
  readonly label: string
}

// ------------------------------------------------------------ UF-61 ---------

/**
 * How the screen is carved up around the schedule (UF-61): the bands and lanes
 * between the part rectangles, which stay ScreenRegions' (PI-35).
 */
export interface ScreenFrame {
  /** S-99f (FR-071, IN-4a). */
  readonly isFullScreen: boolean
  /** U-24 `Panel Divider`, one per panel boundary. */
  readonly dividers: readonly PanelDivider[]
  /** U-21 `Scrollbars` (SC-4). */
  readonly scrollbars: readonly Scrollbar[]
}

export interface PanelDivider {
  /** Which panel's width a drag on this band changes (FR-052). */
  readonly panel: 'rowTitlePanel' | 'propertiesPanel'
  /** The band the pointer grabs (FR-051). */
  readonly band: ScreenRect
  /** The boundary line (EP-9 of table T-076). */
  readonly line: ScreenRect
}

export interface Scrollbar {
  readonly axis: 'horizontal' | 'vertical'
  /** The lane (FR-051, SC-4). */
  readonly track: ScreenRect
  /** Where the grip sits inside the lane (SC-4). */
  readonly thumb: ScreenRect
}

/**
 * What GR-21 of table T-023d divides for the grip, per axis: read off the
 * shell's `ScheduleLayout`, not measured (see `ScreenSession.scrollExtent`).
 */
export interface ScrollExtent {
  /** `ScheduleLayout.contentWidth` (table T-038). */
  readonly contentWidth: number
  /**
   * `ScheduleLayout.contentHeight`: the scrolling rows alone, since pinned rows
   * stand in a non-scrolling band (FR-098, LF-14 of table T-221).
   */
  readonly contentHeight: number
  /**
   * The scrolling remainder's height: the `Row Area`'s foot less LF-14's top edge.
   * No `visibleWidth`: that is the `Row Area` width UF-61 already has. The height
   * differs because FR-098's pinned band sits inside the `Row Area`.
   */
  readonly visibleHeight: number
  /**
   * Where in the content the visible range starts (GR-21's grip is an interval).
   * UF-61 cannot derive it: layout rows arrive already slid, and S-77 / S-78 /
   * S-176 / S-177 of table T-203 are days and rows it cannot convert.
   * Absent means not scrolled, the same as zero.
   */
  readonly offsetX?: number
  /** The downwards half of `offsetX`. */
  readonly offsetY?: number
}

// ------------------------------------------------------------ UF-62 ---------

/** What stands in the `App Header` (U-31), UF-62. */
export interface AppHeaderItems {
  /**
   * U-27 `Document Title` -- `Project.title` (AT-3), edited in place (FR-035).
   * `null` is shown as nothing: FR-035's `Untitled` is for the browser tab only.
   */
  readonly documentTitle: string | null
  /** U-58 `Opened File Name` (FR-101). `null` before any write. */
  readonly openedFileName: string | null
  /** U-59 `File Saved At` (FR-101). `null` before any write. */
  readonly fileSavedAt: string | null
  /**
   * FR-101's words for a null `fileSavedAt`; resolved here because the dictionary
   * (FR-038) is readable in this layer and not in `dom-screen-surface.ts`.
   */
  readonly fileNeverSavedText: string
  /**
   * U-35 `Header Commands`: table T-109's `App Header` rows in table order, walked
   * off `icon-roster.json` so no roster is typed out here.
   */
  readonly commands: readonly CommandItem[]
  /**
   * Which language is on (FR-038). Not a `CommandItem` field: `isPressed` needs an
   * off state and `label` is printed in the language rather than naming it.
   */
  readonly language: DisplayLanguage
}

// ------------------------------------------------------------ UF-63 ---------

/** U-22 `Row Title Panel` and U-23 `Row Title Tree` (UF-63). */
export interface RowTitlePanel {
  /** U-46 `Pinned Row` (FR-098). */
  readonly pinnedTitles: readonly RowTitle[]
  /** The rest, in the order they are drawn. */
  readonly titles: readonly RowTitle[]
  /**
   * Whether IC-74 (HF-10 of table T-051, HR-1 of table T-015) has work: some row
   * of the DOCUMENT, not just the drawn ones, is folded (HR-1 reaches them all).
   * Absent where the panel describes no row (as `data-corner-band` is), and
   * absent is drawn usable (as `commandStateOf` does): a false faint is worse.
   * Optional so existing literals compile; a builder that forgets it fails silently.
   */
  readonly canOpenEveryRow?: boolean
  /**
   * Whether IC-78 (HF-12 of table T-051, HR-2 of table T-015) has work: level 0
   * (S-211) is not folded and some shallowest-level row is drawn. Not `canOpenEveryRow`
   * inverted: partly folded leaves both work, no rows leaves neither.
   */
  readonly canCloseEveryRow?: boolean
  /**
   * Whether IC-92 (HF-16 of table T-051; HR-7, HR-2, HR-6 of table T-015) has
   * work: the head is folded (S-211) or a shallowest-level row is hidden.
   */
  readonly canOpenLevelZero?: boolean
  /**
   * HF-12 of table T-051: rows the head holds folded away. Zero is not drawn;
   * `undefined` means the description did not answer.
   */
  readonly foldedRowCount?: number
}

export interface RowTitle {
  /** `TaskGroup.id` (AT-51). */
  readonly groupId: string
  /** Depth 1 is a root row (FR-004, S-125). */
  readonly depth: number
  /**
   * From `ScreenSession.rowBoxes`, not measured: SC-1 needs the `Row Area`'s own
   * numbers, and ScheduleLayout is unreachable from here.
   */
  readonly box: ScreenRect
  /**
   * `depth` x `rowTitleIndent` (S-37), the product FR-085 cuts against. Carried
   * because `DocumentSettings` does not cross IF-9 (see `availableLabelWidthPx`).
   */
  readonly indentPx: number
  /**
   * The resolved name after FR-085's cut, or `null`: `TaskGroup.label` (AT-53),
   * else the derived-from Task's name (FR-058, AT-54, AT-27). Not `truncateUnits`.
   */
  readonly label: string | null
  /**
   * The same resolved name before the cut, resolved once here so FR-058's
   * substitution is not stated twice. Filled whether or not the name was cut:
   *
   * ```
   * no name resolved  wholeLabel null   label null          isLabelTruncated false
   * name that fits    wholeLabel === label                  isLabelTruncated false
   * name that was cut label is its leading part             isLabelTruncated true
   * ```
   */
  readonly wholeLabel: string | null
  /**
   * FR-085: the name was cut (`wholeLabel !== null && wholeLabel !== label`).
   * Only half the tooltip condition: UF-69 adds the pointer, or every cut row
   * would raise one on the first frame.
   */
  readonly isLabelTruncated: boolean
  /**
   * U-47 `Row Expander` (HF-1 of table T-051). Non-nullable: a leaf row without
   * IC-58 / IC-59 / IC-77 could never tell `RS-28`.
   */
  readonly expander: RowExpander
  /**
   * Whether IC-90 (HF-13 of table T-051, HR-7 of table T-015) has work: a DIRECT
   * child is out of the picture. A separate entrance from `RowExpander.canOpen`
   * (HF-13); a folded row with no child is spent, since no row would appear.
   */
  readonly canOpenOneLevel?: boolean
  /**
   * Whether IC-91 (HF-14 of table T-051, HR-8 of table T-015) can add a child row.
   * Spent only at `maxGroupDepth` (S-125), where `createTaskGroup` refuses; a
   * folded row still arms it, since the document changes.
   */
  readonly canAddChildRow?: boolean
  /**
   * HF-18 of table T-051: rows this one holds folded away (above zero marks the
   * row, S-153). Rows hidden by HR-6 are not counted.
   */
  readonly foldedRowCount?: number
  /**
   * The axis GR-20's grab settled on while THIS row is held (HF-15). Spelled out
   * because `RowGrabAxis` is the translator's, out of reach (Chapter 5.3).
   */
  readonly heldOnAxis?: 'position' | 'depth' | null
  /** U-48 `Row Pin` (FR-098). */
  readonly isPinned: boolean
  /** FR-085. Not the table T-023c set (SL-1). */
  readonly isSelected: boolean
}

/* No member carries a set-down, and none may be added: HF-5 of table T-051. */

/**
 * HF-1 of table T-051: three controls, not one in three states (HF-2 / HF-3 /
 * HF-11 act on different things, so each can be spent alone).
 */
export interface RowExpander {
  /** HF-2 (HR-3): something at or below this row is folded or hidden; its own fold counts. */
  readonly canOpen: boolean
  /** HF-3 (HR-6): true on every drawn row, since hiding it always removes that row. */
  readonly canClose: boolean
  /**
   * HF-11 (HR-4): the picture holds a direct child. Not the inverse of `canOpen`:
   * a folded descendant and a drawn child can coexist.
   */
  readonly canCloseBelow: boolean
}

// ------------------------------------------------------------ UF-64 ---------

/** U-25 `Properties Panel` (UF-64). `null` in `ScreenView` when it is closed. */
export interface PropertiesPanel {
  /** FR-072. The only member saying which is up, since FR-072 has no heading row. */
  readonly showing: 'selection' | 'documentSettings'
  /**
   * FR-072: the selection went away and the panel keeps its subject (see
   * `ScreenSession.propertiesSubject`). Not shown on screen; a check reads it.
   */
  readonly isSubjectGone: boolean
  /**
   * A selected Task's table T-016 items (FR-006), a selected row's PR-18 .. PR-20
   * (FR-042), or table T-104's keys; the subject column keeps them apart.
   */
  readonly fields: readonly PropertyField[]
  /** Table T-109's rows for this surface, read from the roster as `AppHeaderItems.commands`. */
  readonly commands: readonly CommandItem[]
}

export interface PropertyField {
  /**
   * `PR-n` of table T-016, `AT-58` / `AT-59` of table T-058 (FR-042), or `K-n` of
   * table T-104. FR-042's items declare the attribute row because IF-9 finds a
   * field by its declared row (FR-085's double click); `PR-n` stays the join.
   */
  readonly row: string
  /** The name table T-016's row shows, from the dictionary (FR-038). Translated. */
  readonly name: string
  /** The value written out for the screen. */
  readonly text: string
  /** Table T-016's read-only mark (e.g. PR-9, FR-012). */
  readonly isEditable: boolean
  /**
   * One control per COLUMN, where `name` / `text` are per ROW: a table T-016 cell
   * can join several columns (`PR-3` is `start` and `finish`).
   * Empty means no control for the item (settings, FR-074), not "not editable".
   */
  readonly controls: readonly PropertyControl[]
}

/**
 * Table T-016's 入力の型 column. Choices, bounds and dates live in `COLUMN_SHAPES`
 * and `DATE_COLUMNS` (the paragraph under table T-016), not here.
 */
export type PropertyControlKind =
  /** 文字 */
  | 'text'
  /** 複数行 (PR-2) */
  | 'multiline'
  /** 日付 -- `DATE_COLUMNS` says which columns these are. */
  | 'date'
  /** 数値 */
  | 'number'
  /** 真偽 */
  | 'boolean'
  /** 選択 -- `COLUMN_SHAPES` holds the candidates. */
  | 'choice'
  /** 色 (PR-12) */
  | 'color'

/**
 * One control of a field. `text` is the one column's value, so the drawing side
 * never splits `PropertyField.text` on a separator.
 */
export interface PropertyControl {
  /**
   * Handed back on `ScreenSurface.readFieldCommit` as a value, not a spelled key
   * like `PR-3:start` that would need parsing (and break on the separator).
   */
  readonly key: PropertyFieldKey
  readonly kind: PropertyControlKind
  /** The one column's value, written out the way `PropertyField.text` is. */
  readonly text: string
  /**
   * The words a `choice` control offers (`COLUMN_SHAPES`, or the document's own
   * roster for PR-15 / PR-16), `null` otherwise. Shown is not always committed (AS-6).
   */
  readonly choices: readonly string[] | null
  /**
   * What each candidate commits, same order; absent where each commits its word.
   * Same-named people (AS-8, AS-9) or tasks (PR-15, AT-24) show one word with
   * different uids.
   */
  readonly choiceValues?: readonly string[]
  /**
   * Words for a partial-match search beside the chooser (AS-5 of table T-225).
   * Not a kind of its own (PR-16 reads 選択); held apart from `choices` because a
   * search settles a name (AS-8), once per name. Matching is the host's (FR-029).
   */
  readonly searchWords?: readonly string[]
  /** A `number` control's bounds, where the schema states them. */
  readonly min: number | null
  readonly max: number | null
  /**
   * Room needed, in multiples of the control's own font size (FR-006, FR-093,
   * S-199). Not px: the font size (S-197) is the host's, past IF-9. Computed here
   * because the drawing side cannot read `labelCoef` (S-30, table T-061).
   */
  readonly widthInFontSizes: number
}

/**
 * Which column of which thing one control edits. The subject rides along
 * because a row id alone (IF-9) does not say whose; re-deriving it from the
 * selection would be a second reading of FR-072. No settings arm
 * (`properties-panel.ts`).
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
      /** A `Dependency` hangs off its successor, so successor + position name it (as `ItemRef` does). */
      readonly holder: 'dependency'
      readonly successorUid: number
      readonly ordinal: number
      readonly column: keyof Schedule['tasks'][number]['dependencies'][number] & string
    }
  | {
      /**
       * The document's one `Project`. Exists because IF-9's row id is not
       * confined to table T-016: the header's title field declares `U-27` (FR-035, FR-074).
       */
      readonly holder: 'project'
      readonly column: keyof Schedule['project'] & string
    }
  | {
      /**
       * One `CommentBox` by its `string` id (AT-110), as `ItemRef` names it. Exists
       * so `PR-21`'s control (MK-13, FR-006) can carry a key.
       */
      readonly holder: 'commentBox'
      readonly id: string
      readonly column: keyof Schedule['commentBoxes'][number] & string
    }

// ------------------------------------------------------------ UF-65 ---------

/**
 * U-26 `Command Palette` (UF-65); `null` while S-99e hides it. No pointer-on-it
 * member: FR-053's part-based faintness is answered by IF-9's side (Chapter 5.3).
 */
export interface CommandPalette {
  /**
   * The corner it floats at (FR-053). A point, not a rectangle: the size is known
   * only past IF-9, and a zero-extent rectangle would be drawn as a box.
   * No row of table T-203 or T-206 holds it, so it is lost with the page (a spec gap).
   */
  readonly at: { readonly x: number; readonly y: number }
  /**
   * The grab band's height (GR-19 of table T-023d, S-135a); its width is the
   * palette's, for the reason `at` gives. Never zero: an ungrabbable palette
   * cannot move. Not in `groups`, since IC-53 is not a button.
   * The surface draws it INSIDE the palette part, or FR-053 fades the palette
   * while grabbed, and marks it IC-53 for `readScreenPartAt` (`ScreenPart.entry`).
   */
  readonly grabBandHeight: number
  /** IC-75, the minimise toggle (FR-053). A `CommandItem`; not in `groups` (no 群 in table T-109). */
  readonly minimise: CommandItem
  /**
   * S-200 of table T-206. Separate from `groups` being empty, which can happen
   * unminimised and needs a different picture.
   */
  readonly isMinimised: boolean
  /** U-34 `Palette Groups` (FR-029). */
  readonly groups: readonly PaletteGroup[]
  /**
   * The armed table T-023b row's word (FR-053); a word because AR-4 is not a shape.
   * `null` exactly when minimised, never `''`, which would still get a box.
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
 * What every surface carries (UF-66; IN-4 of table T-028, S-99g). Singular:
 * `ScreenState` holds one open surface. Unexported; `OpenModal` is the public shape.
 */
interface OpenSurface {
  /** In the display language. */
  readonly heading: string
  /** IC-52 (IN-4). */
  readonly commands: readonly CommandItem[]
}

/** U-30 `Help Modal` of table T-103 (FR-036). */
export interface HelpModal extends OpenSurface {
  readonly surface: 'Help Modal'
  /** FR-036, from `help-roster.json`. Grouping and paging are the surface's (MC-6). */
  readonly entries: readonly HelpEntry[]
  /** FR-038; see `AppHeaderItems.language`. */
  readonly language: DisplayLanguage
  /** FR-069 */
  readonly licenceText: string
  /** FR-069 */
  readonly copyrightNotice: string
  /** FR-069: one per library. */
  readonly attributions: readonly string[]
}

/** One line the help shows. */
export interface HelpEntry {
  /** The table FR-036 names, e.g. `T-036`. */
  readonly table: string
  /** Its row id, e.g. `MK-1`: a join that survives rule changes. */
  readonly row: string
  /** In the display language. */
  readonly text: string
  /** Table T-023's mouse operation as a dictionary word, or `null` (FR-036). */
  readonly press: string | null
  /**
   * Table T-036's keys as that table spells them, or `null` (FR-036). Not a
   * dictionary word, and no respelling, or one assignment shows two ways.
   */
  readonly keys: string | null
  /**
   * Table T-109's entrance for this row where it has exactly one, else `null`
   * (FR-036): picking one of an arm's several would settle FR-029's shape choice.
   */
  readonly icon: IconId | null
}

/** U-30 `AI Export Modal` of table T-103 (FR-068). */
export interface AiExportModal extends OpenSurface {
  readonly surface: 'AI Export Modal'
  /**
   * FR-068's document. The copy entrance is IC-52 in `commands`, not a second
   * entrance; the clipboard is the shell's (CHN-9 of table T-008).
   */
  readonly documentText: string
}

/** U-49 `Resource Roster` of table T-103 (FR-099). */
export interface ResourceRoster extends OpenSurface {
  readonly surface: 'Resource Roster'
  /** FR-099, in `Schedule.resources`' own order. */
  readonly resources: readonly RosterResource[]
}

/** One resource as the roster shows it. */
export interface RosterResource {
  /** `Resource.uid` (AT-85). */
  readonly uid: number
  /** `Resource.name` (AT-86), or `null`. Never translated (FR-038). */
  readonly name: string | null
  /** FR-099: whether any assignment refers to it. */
  readonly isReferenced: boolean
  /** FR-099, from `ScreenSession.selectedResourceUids`. */
  readonly isSelected: boolean
  /** FR-099: names of the tasks CD-5 of table T-050 would reach, `null` if nameless. */
  readonly unassignedTaskNames: readonly (string | null)[]
}

/** One `Export Chooser` format (FR-096); the row id is the handle a press returns. */
export interface ExportFormatChoice {
  readonly row: ExportFormatId
  /** FR-096: the word `display-words.json` holds for the row. */
  readonly name: string
  /**
   * Table T-024's extension (FR-096), from generated `export-formats.json`: a
   * separate copy because DocumentCodec's is unreadable here (LR-2 of table T-061).
   */
  readonly extension: string
}

/** U-54 `Export Chooser` of table T-103 (FR-096). */
export interface ExportChooser extends OpenSurface {
  readonly surface: 'Export Chooser'
  /**
   * FR-096's formats in table T-024 order (no IO-6). Not `CommandItem`s: table
   * T-109 places only IC-52 here and FR-096 forbids an entrance per format.
   */
  readonly formats: readonly ExportFormatChoice[]
}

/**
 * The open surface (UF-66), discriminated on `ScreenState.surface` (S-99g).
 * Only names table T-103 settles are spelled; FR-074's and FR-088's surfaces are
 * keyed by requirement UID. Nothing builds those two yet (STOP in `open-modals.ts`).
 * The last member takes any name S-99g holds, so narrow by a carried member
 * (`'resources' in modal`), not by name: a `string` discriminant never narrows.
 * ⚠️ The same member makes a misspelled name or a missing payload compile silently.
 *
 * @provisional PND-140
 */
export type OpenModal =
  | HelpModal
  | AiExportModal
  | ResourceRoster
  | ExportChooser
  // FR-074's surface (no table T-103 name).
  | (OpenSurface & {
      readonly surface: 'FR-074'
      /** FR-074: the rows of table T-224 (PF-9 and PF-10 not editable). */
      readonly fields: readonly PropertyField[]
    })
  // FR-088's surface (no table T-103 name). The reached-Task count is not a
  // member: it is `Notice.affectedCount` (NT-3).
  | (OpenSurface & {
      readonly surface: 'FR-088'
      /**
       * The `WeekDay` rows (AT-70) of FR-054's calendar, NOT renumbered: `dayType`
       * (AT-73) has Sunday 1 and `weekStartDay` (AT-17) Sunday 0.
       */
      readonly weekDays: readonly WeekDay[]
      /** Its `Exception` rows (AT-71), FR-088. */
      readonly exceptions: readonly Exception[]
      /** `Project.weekStartDay` (AT-17), FR-088. `null` where the document carries none. */
      readonly weekStartDay: number | null
    })
  // U-60 `Watermark Unlock` (FR-020): a surface, not a `Confirmation`, since the
  // answer is a password (U-60).
  | (OpenSurface & {
      readonly surface: 'Watermark Unlock'
      /** QN-9 of table T-234 from the dictionary (FR-076, FR-038), or `''`. */
      readonly question: string
      /** The two word buttons (FR-020, NT-7), as `Confirmation.answers`; not `commands` (no table T-109 row). */
      readonly answers: readonly ConfirmationAnswer[]
    })
  // U-61 `Difference Review` (FR-022, FR-073). Its answers IC-95 .. IC-97 are
  // `commands`; mapping them to table T-032a is the shell's (`OPEN_CHOICE_OF_ENTRY`).
  | (OpenSurface & {
      readonly surface: 'Difference Review'
      /** FR-022, untranslated (AT-27, FR-038); missing names stay `null`. */
      readonly candidates: readonly MergeCandidateLine[]
      /** FR-073, untranslated. Empty means nothing unread, not unfilled. */
      readonly unreadColumns: readonly string[]
      /** `RS-48` of table T-233 (FR-073, FR-038); `''` when `unreadColumns` is empty. */
      readonly unreadText: string
      /** NT-3a's next step for the same row, or the empty string where none. */
      readonly unreadNextStep: string
    })
  // U-62 `Import Report` (FR-023): not a telling (NT-9) or a `Confirmation`. Its
  // way out is a word with no table T-109 row, so it travels as `dismissText`.
  | (OpenSurface & {
      readonly surface: 'Import Report'
      /** FR-023: dropped Task names in file order, untranslated; missing stays `null`. */
      readonly droppedTaskNames: readonly (string | null)[]
      /** `RS-50` of table T-233 in the display language (FR-023, FR-038). */
      readonly text: string
      /** NT-3a's next step for the same row, or the empty string where none. */
      readonly nextStep: string
      /** The one entrance's word (FR-023, NT-8), as `Notice.dismissText`. */
      readonly dismissText: string
    })
  // Any other name S-99g carries: only the three members every surface has.
  | (OpenSurface & { readonly surface: string })

/** One U-61 pair sharing a `UID` (FR-022): the document's task and the incoming file's. */
export interface MergeCandidateLine {
  /**
   * `Task.uid` (AT-26) of the current document. Both uids are carried: MG-1 of
   * table T-032 can pair tasks whose `UID` differs.
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
 * A raised telling before its words are read (UF-67). Raisers carry row ids, never
 * words: the one dictionary is this component's (FR-038). The same holds for
 * `RaisedConfirmation`; `file-store.ts` states the reason boundary from its end.
 */
export interface RaisedNotice {
  /** Table T-037 row, e.g. `NT-1`; only the raiser knows refusal from warning (NT-5). */
  readonly manner: string
  /** Table T-233 row, e.g. `RS-4` (FR-076). Unknown reasons fall to that table's own row. */
  readonly reason: string
  /** NT-3. `null` where the row does not ask for a count. */
  readonly affectedCount: number | null
}

/** One shown telling (UF-67, table T-037, FR-076); its words come from the dictionary. */
export interface Notice {
  /** The row of table T-037, e.g. `NT-1` (see `RaisedNotice.manner`). */
  readonly manner: string
  /** The row's name in the display language, or `''`; `manner` stays the join. */
  readonly mannerText: string
  /** NT-1. */
  readonly text: string
  /** NT-3a. A list because NT-4 gathers; one reason has one step. */
  readonly nextSteps: readonly string[]
  /** NT-3. `null` where the row does not ask for a count. */
  readonly affectedCount: number | null
  /**
   * NT-8's put-away word, or `''`. A word, not a shape (FR-029, RC-13 of table
   * T-026); read per language although NT-8 spells it the same in both.
   */
  readonly dismissText: string
  /**
   * Which telling a press put away (NT-8), built from its table T-037 / T-233
   * rows. Not `manner` (several can share one), not a list position (NT-4
   * regroups every frame). Gathered tellings name all their reasons; identical
   * tellings share a key and go together, since they look the same.
   */
  readonly dismissKey: string
}

/**
 * A raised question before its surface is described (UF-67, NT-7 of table T-037).
 * Not a `Notice`: it blocks until answered, and its answers come from the
 * dictionary, not the asker.
 */
export interface RaisedConfirmation {
  /** `NT-7` of table T-037. */
  readonly manner: string
  /** Table T-234 row, e.g. `QN-1` (FR-076). Unknown questions fall to that table's own row. */
  readonly question: string
  /** NT-7: what would go, by name (FR-032, FR-099). Empty is a real answer (DI-4 of table T-227). */
  readonly items: readonly ConfirmationItem[]
}

/**
 * U-55 `Confirmation` (UF-67): `RaisedConfirmation` plus the words and answers
 * added on the way to the screen. No `CommandItem`s (NT-7). Not a `Notice` and
 * no `dismissKey`: NT-8's way out would be a third answer, and `Esc` already
 * means cancel (IN-4 of table T-028).
 */
export interface Confirmation extends RaisedConfirmation {
  /**
   * NT-7's name in the display language, or `''`. The surface's name comes from
   * the manner: `display-words.json`'s `surfaces` has no U-55 heading.
   */
  readonly mannerText: string
  /** NT-7: the sentence under `question`, or `''`. The names of what goes are `items`. */
  readonly text: string
  /** NT-7's two word buttons in dictionary order; never spent or toggled, so no states. */
  readonly answers: readonly ConfirmationAnswer[]
  /** FR-032's mark for `isShownOnAnotherRow` items, or `''`: one word for all, never a shape. */
  readonly shownOnAnotherRowMark: string
}

/** One thing a confirmation says would go. */
export interface ConfirmationItem {
  /** Its name, or `null` (AT-27 is optional), as in `RosterResource.unassignedTaskNames`. */
  readonly name: string | null
  /** FR-032 / HM-10 of table T-015a; `false` wherever FR-032 is not asking. */
  readonly isShownOnAnotherRow: boolean
}

/** One of NT-7's two word buttons, joined to the dictionary's `confirmation` section. */
export interface ConfirmationAnswer {
  /** `proceed` / `cancel`, as `display-words.json` spells them; never drawn. */
  readonly answer: string
  /**
   * The button word, or `''`. Untranslated (NT-7): its first character names the
   * answering key, which the drawing side draws bold.
   */
  readonly text: string
}

// ------------------------------------------------------------ UF-68 ---------

/**
 * U-44 `Dialogue Field` (UF-68); `null` while the `Agent API` is off (FR-066).
 * The half-typed line stays in the surface (AG-11).
 */
export interface DialogueField {
  /**
   * Settled utterances by `DialogueMessage.sequence` (AG-11). Never by the stamp
   * (FR-063) or `settledAt`, a clock reading from the settling machine.
   */
  readonly messages: readonly DialogueMessage[]
}

// ------------------------------------------------------------ UF-69 ---------

/** One explanation shown against something (UF-69); IN-3's rules are not members. */
export interface Tooltip {
  readonly anchor: TooltipAnchor
  /** In the display language. */
  readonly text: string
  /**
   * EZ-2 of table T-040: the assignment, or `null`. Kept out of `text` so `text`
   * stays exactly the dictionary word.
   */
  readonly assignment: string | null
  /**
   * The position, only for a Task anchor (EZ-6): Tasks are drawn across IF-1, so
   * there is no element to attach to. Absent for icons and lanes.
   * No row gives the place (searched FR-092 / EZ-6, IN-3, EP-15, table T-206), so
   * the pointer's point is used.
   *
   * @provisional PND-391
   */
  readonly at?: { readonly x: number; readonly y: number }
}

/**
 * What a tooltip explains. FR-029's tooltip on an ungrabbable endpoint is inside
 * the `Row Area` and not described here; which side draws it is unsettled.
 */
export type TooltipAnchor =
  /** EZ-2 of table T-040, after `iconHintDelayMs` (S-124). */
  | { readonly kind: 'icon'; readonly icon: IconId }
  /** EZ-6 of table T-040; the Task comes from `ScreenSession.taskUnderPointer` (no second hit test). */
  | { readonly kind: 'task'; readonly taskUid: number }
  /** FR-085 */
  | { readonly kind: 'rowTitle'; readonly groupId: string }
  /** FR-037 */
  | { readonly kind: 'scrollbar'; readonly axis: 'horizontal' | 'vertical' }

// ------------------------------------------------------------- the view ----

/**
 * The description of the UI parts outside the schedule (PI-37), carried by
 * `ScreenSurface.showScreenView`: UF-60's `language`, then UF-61 .. UF-69 in
 * table T-075 order. UF-67 fills two members: another unit would need a table
 * T-075 row (check 18).
 */
export interface ScreenView {
  /** UF-60 (FR-038): carried from the session; `HelpModal.language` is the same value. */
  readonly language: DisplayLanguage
  /** UF-61 */
  readonly frame: ScreenFrame
  /** UF-62 */
  readonly appHeaderItems: AppHeaderItems
  /** UF-63 */
  readonly rowTitlePanel: RowTitlePanel
  /** UF-64. `null` when the panel is closed (EP-8). */
  readonly propertiesPanel: PropertiesPanel | null
  /** UF-65. `null` while S-99e says it is hidden (EP-11). */
  readonly commandPalette: CommandPalette | null
  /** UF-66. `null` while S-99g says none is open. */
  readonly openModal: OpenModal | null
  /** UF-67, in the order they are shown. */
  readonly notices: readonly Notice[]
  /** UF-67. U-55 of table T-103, or `null` while nothing waits for an answer (NT-7). */
  readonly confirmation: Confirmation | null
  /** UF-68. `null` while the `Agent API` is off (FR-066). */
  readonly dialogueField: DialogueField | null
  /** UF-69 */
  readonly tooltips: readonly Tooltip[]
}

/** What the properties panel is pinned to (FR-072): rows are a separate set (SL-1, FR-085). */
export interface PropertiesSubject {
  /** The table T-023c selection as it stood when the last operation chose it. */
  readonly selection: Selection
  /** The rows FR-085 had selected then, by `TaskGroup.id` (AT-51). */
  readonly groupIds: readonly string[]
}

/**
 * What the shell holds for this session and hands over each frame. Only the
 * Framework may hold current values (LY-5 of table T-060), so each member is
 * outside the document (table T-206) or measurable only by the shell.
 */
export interface ScreenSession {
  /** S-99 (FR-038). */
  readonly language: DisplayLanguage
  /** FR-101: the open file and its last write, `null` before any; only the shell knows the handle. */
  readonly openedFileName: string | null
  readonly fileSavedAt: string | null
  /**
   * FR-065, S-99b (per browser origin). Not per document: no key identifies one,
   * because AT-1 (`Project.id`) is nullable.
   */
  readonly isAgentApiEnabled: boolean
  /**
   * S-99i of table T-206 (FR-066): the `Dialogue Field` (U-44) is shown. Separate
   * from `isAgentApiEnabled` (S-99i); IC-18 moves this, IC-20 that.
   */
  readonly isDialogueFieldVisible: boolean
  /**
   * FR-068's document for U-30, `undefined` while it is closed. The shell builds
   * it: `GRS JSON` (IO-2) is DocumentCodec's, which this component cannot reach.
   * For an absent value, see `openModalFromScreenState`.
   */
  readonly aiExportDocument?: string
  /**
   * U-42 `Pointer`, or `null` outside the window; read by FR-037 and EZ-2. Not by
   * FR-053's faintness, which needs the part under it (see `CommandPalette`).
   */
  readonly pointer: { readonly x: number; readonly y: number } | null
  /** How long the pointer has rested where it is (EZ-2, `iconHintDelayMs` S-124). */
  readonly pointerRestedMs: number
  /**
   * EZ-2 of table T-040: the icon under the pointer, or `null`. The shell asks
   * `ScreenSurface.readScreenPartAt` because only the drawing side knows entry
   * rectangles (Chapter 5.3, table T-065).
   * No table holds it (searched FR-092, FR-029, tables T-109 / T-203 / T-206).
   *
   * @provisional PND-141
   */
  readonly iconUnderPointer: IconId | null
  /**
   * EZ-6 of table T-040: the Task under the pointer, or `null`, from the shell's one
   * table T-023d walk (`itemAtPointer`, PI-7). The whole Task, because the tooltip
   * unit has no `Schedule`. Absent means none, never an invented Task.
   */
  readonly taskUnderPointer?: Task | null
  /**
   * The standing explanation was dismissed (IN-3, last rung of IN-4, via
   * `escapeTarget`). Without it the next frame re-raises it from unchanged
   * inputs. The next pointer move clears it; absent means not dismissed.
   */
  readonly isTooltipDismissed?: boolean
  /** Where the person dragged the palette to (FR-053). See `CommandPalette.at`. */
  readonly commandPaletteAt: { readonly x: number; readonly y: number }
  /**
   * S-72 light/dark and S-73 hue (DR-5 of table T-052), needed to paint the ground
   * (FR-041) across IF-9. The hue fills every `H` of table T-236.
   */
  readonly themePreference: 'light' | 'dark'
  /** See `themePreference`. S-73. */
  readonly themeHue: number
  /** S-142 of table T-206 (FR-053, IC-50). Not a 面: `Esc` must not close it. */
  readonly isMilestoneListOpen: boolean
  /**
   * S-200 of table T-206. Not `S-99e`, which is shown vs absent; minimised is a
   * shown shape (IC-75). Not a 面 either (FR-053, IN-4).
   */
  readonly isPaletteMinimised: boolean
  /**
   * S-206 of table T-206 (FR-102), shown through IC-76's `isPressed`, not `isArmed`
   * (FR-053). Absent means not recording, as `exportScene`'s session is.
   */
  readonly isRecordingInteractions?: boolean
  /**
   * The held row and its drawn depth (HF-15), or `null`/absent. A picture, not a
   * write (table T-023d): `TaskGroup.parentId` waits for CM-73 (IN-1). Depth moves
   * by `RowTitle.indentPx`, never a pixel travel. No table keeps it.
   */
  readonly rowGrabbedAt?: {
    readonly groupId: string
    readonly depth: number
    /** Which axis HF-15 settled on. See `RowTitle.heldOnAxis`. */
    readonly axis: 'position' | 'depth'
    /**
     * Pixels the row still follows on the REFUSED axis, signed with the hand
     * (HF-15, S-212). The translator has already applied the ratio.
     */
    readonly resistedPx: number
    /**
     * Top of the place the hand is at on the position axis, or `null` on the
     * depth axis. No gap or marker: no table T-103 / T-109 row gives one
     * (searched HF-15, GR-20, table T-023d, FR-085, FR-029, table T-221).
     */
    readonly atY: number | null
  } | null
  /**
   * S-211 of table T-206: level 0 is folded (HR-2 of table T-015). Not saved; ways
   * back are HF-16 (IC-92) and HF-10 (IC-74). Absent means not folded.
   */
  readonly isLevelZeroFolded?: boolean
  /**
   * Which `dualCursor` date (S-65) follows the pointer, or `null` outside table
   * T-029a's mode; one value, so the mode cannot contradict itself (DC-1, DC-2).
   * Here because DC-2 names the type (PI-36); not in `documentSettings`, which
   * FR-021 round-trips and DC-8 / EP-12 keep out of exports.
   * No unit reads it and no row asks one to (searched table T-109, FR-053, FR-029,
   * tables T-023b / T-202 / T-206); UF-65 already receives it.
   */
  readonly dualCursorFollowing: DualCursorSide | null
  /**
   * FR-085's selected rows by `TaskGroup.id` (AT-51), also read by FR-042. Not in
   * `Selection` (SL-1). No spec location holds it (searched `Selection`,
   * `ScreenState`, tables T-203 / T-206), so it is lost with the page (UN-9).
   *
   * @provisional PND-142
   */
  readonly selectedGroupIds: readonly string[]
  /**
   * FR-099's chosen resources by `Resource.uid` (AT-85); SL-1 admits no resource.
   * No spec location holds it (searched as above). Empty means none.
   *
   * @provisional PND-143
   */
  readonly selectedResourceUids: readonly number[]
  /**
   * FR-022's merge pairing for U-61. S-99g carries no payload and no spec location
   * holds it (searched `ScreenState`, tables T-203 / T-206 / T-058). Absent means none.
   */
  readonly mergeCandidates?: readonly MergeCandidateLine[]
  /** FR-073's unread columns for U-61: file keys no document holds. Absent means none. */
  readonly unreadColumns?: readonly string[]
  /** FR-023's dropped Task names for U-62, already gone from the document. Absent means none. */
  readonly droppedTaskNames?: readonly (string | null)[]
  /**
   * FR-072: what the last operation chose, or `null` when closed. Not stored:
   * table T-203 has only a width (S-80) and table T-206 no row.
   */
  readonly propertiesShowing: 'selection' | 'documentSettings' | null
  /**
   * FR-072: the subject kept after the selection went away, `null` before one.
   * The subject, not drawn fields: FR-072 re-selects it and fields go stale.
   * Not stored, as `propertiesShowing`.
   *
   * @provisional PND-144
   */
  readonly propertiesSubject: PropertiesSubject | null
  /**
   * Raised tellings (FR-076); UF-67 picks order and words. Held because FR-028
   * returns refusals as values. See `RaisedNotice`.
   */
  readonly notices: readonly RaisedNotice[]
  /**
   * The waiting question (NT-7), or `null`; no table T-203 / T-206 row holds it.
   * Not every site raises one yet: see the STOP note in `notices.ts`.
   */
  readonly confirmation: RaisedConfirmation | null
  /**
   * Row boxes from the shell's once-per-frame layout (ADR-001, table T-068),
   * passed raw because ScheduleLayout is unreachable and SC-1 needs its numbers.
   * Spec gap: EP-3 / WY-3 depend on these through ImageExporter too.
   */
  readonly rowBoxes: readonly { readonly groupId: string; readonly box: ScreenRect }[]
  /**
   * GR-21's extents, carried like `rowBoxes` rather than laid out again (ADR-001).
   * Not on `ScreenState`: a per-frame change would fail the loop's
   * `screenState !== before.screenState` test and redraw every frame. Not on
   * `ScreenRegions`: the layout is computed from them.
   */
  readonly scrollExtent: ScrollExtent
  /**
   * FR-031 / RD-1 of table T-230, for IC-5 under FR-029; flags, not a history count.
   * Absent means unknown and stays usable: a false faint looks broken
   * (`app-header-items.ts`). The reason on press (`RS-27`) belongs to the receiver.
   */
  readonly canUndo?: boolean
  /** The forward half of `canUndo` (RD-2, IC-6). */
  readonly canRedo?: boolean
}

// ------------------------------------------------- the nine unit contracts ---
//
// Signatures live in each unit file and the type checker, not here.

/**
 * One frame's outside-the-schedule description. UF-61 .. UF-68 are independent;
 * UF-69 goes last because tooltips explain parts already built.
 * `language` is UF-60's own cell; every other rule, and any STOP, is in its unit.
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
      // FR-029 counts drawn tasks, and ET-5's member rows are not in `rowBoxes`.
      // Never omit it: `command-palette.ts` would then count undrawn tasks too.
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
 * The utterance settled in the dialogue field, or `null`; unsettled text stops
 * here (AG-11). `logWithMessage` (PI-33) assigns the order, so writers cannot
 * collide. `author` / `settledAt` are carried: a `pure` unit has no clock (CS-1).
 *
 * @purity pure
 */
export function dialogueMessageFromInput(input: DialogueInput): SettledUtterance | null {
  if (!input.isSettled) return null

  // STOP -- NOT DECIDED BY THE SPECIFICATION: whether an empty or whitespace-only
  // utterance is refused, and whether the text has a bound. Looked in AG-11,
  // FR-066, AM-18 of table T-107 and `_assets/tbl-settings.md`: no rule. The same
  // STOP stands in `post-dialogue-message.ts`; neither file may invent it.
  return { author: input.author, text: input.text, settledAt: input.settledAt }
}

/**
 * The ruler's seven weekday words (`FR-017`), index 0 = Sunday per `AT-17`.
 * The order is a contract: callers index by weekday number, so do not rotate it
 * by `weekStartDay` (`S-108`). It lives here because the dictionary and the
 * display language meet here (Chapter 6.2); a function because the language is
 * not part of the document (`FR-038`).
 *
 * @purity pure
 */
export function rulerWeekdayWords(language: DisplayLanguage): readonly string[] {
  return displayWords.weekdays.map((one) => one.text[language])
}
