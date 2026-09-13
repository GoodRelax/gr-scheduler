// ScreenRenderer -- internal unit of the component.
//
// @unit      UF-62   (docs/spec/05-07-design.md, table T-075)
// @component ScreenRenderer, layer Adapter (table T-062)
// @purity    pure
//
// Fills `ScreenView.appHeaderItems`. Only `commands` is worked out here -- of
// each entry, whether it can be used and whether it is on; the title, the file
// cues and the language are carried across untouched.
//
// Entries come from `icon-roster.json` (table T-109 generated), so membership,
// order and count are never written here (rule 03 section 1). Only rows a
// requirement keys a state on are named; the rest share one default, so a new
// row reaches the header with no edit.
//
// `isEnabled: false` claims a press would do nothing (FR-029). Where the four
// arguments cannot settle that, the entry stays usable: a false faint reads as
// a broken entry. The STOP notes below name those entries.
//
// U-35's `Branding` has no member in `AppHeaderItems`, so none is invented.

import type { DocumentSettings } from '../../entity/document-model/document-settings/document-settings'
import type { Schedule } from '../../entity/document-model/schedule/schedule'
import type { ScreenState } from '../../entity/document-model/screen-state/screen-state'
import type {
  AppHeaderItems,
  CommandItem,
  DisplayLanguage,
  IconId,
  ScreenSession,
} from './screen-renderer'
import iconRoster from './icon-roster.json'
import displayWords from './display-words.json'

/**
 * FR-101's substitute for a time, by the state it stands for.
 *
 * Keyed rather than indexed: the section's length is the dictionary's.
 */
const FILE_STATUS_BY_STATE = new Map(
  displayWords.fileStatus.map((entry) => [entry.state, entry]),
)

/**
 * The value table T-109's surface column carries for the `App Header` (U-31 of
 * table T-103), spelled as the generated roster spells it (rule 03 section 1).
 */
const APP_HEADER = 'App Header'

// The rows of table T-109 whose `isEnabled` or `isPressed` a requirement
// settles. Join keys, not names for the icons (table T-109 has no English
// column), and not a roster of the header.

/** S-99e (FR-053). First because table T-109 prints it first. */
const COMMAND_PALETTE_ENTRY: IconId = 'IC-7'
/** S-69, the overlay FR-015 draws. Its toggle is FR-049's. */
const BASELINE_OVERLAY_ENTRY: IconId = 'IC-4'
/**
 * FR-031's two entrances -- RD-1 and RD-2 of table T-230. Answered from
 * `ScreenSession.canUndo` / `canRedo`; see those members.
 */
const UNDO_ENTRY: IconId = 'IC-5'
/** The forward half of `UNDO_ENTRY`; that note holds both. */
const REDO_ENTRY: IconId = 'IC-6'
/** S-227 (FR-049). */
const PLAN_DISPLAY_ENTRY: IconId = 'IC-8'
/** S-228 (FR-049). */
const ACTUAL_DISPLAY_ENTRY: IconId = 'IC-9'
/** S-99f (FR-071). */
const FULL_SCREEN_ENTRY: IconId = 'IC-11'
/** The settings half of the properties panel (FR-072). */
const DOCUMENT_SETTINGS_ENTRY: IconId = 'IC-17'
/** U-44 `Dialogue Field` (FR-066). */
const DIALOGUE_FIELD_ENTRY: IconId = 'IC-18'
/** U-36 `Agent API` (FR-065). */
const AGENT_API_ENTRY: IconId = 'IC-20'

/**
 * What an entry says while the dictionary holds no word for its row.
 *
 * An empty cell means no word is settled yet, not "print nothing"; here the
 * stand-in happens to be the same empty string. Other readers stand in with a
 * word of their own (`tooltips.ts` uses the label).
 *
 * Class C of rule 06: display-only, and FR-038 keeps even the language out of
 * the saved document.
 */
const NO_WORDS = ''

/**
 * The words of table T-109's rows, keyed by the row id.
 *
 * A `Map` rather than a scan per entry: a description is built every frame
 * (R5 of docs/development-rules/07-review-standards.md, NFR-013).
 * `displayWords` and `iconRoster` are module constants compiled into the
 * program, so reading them keeps this unit `pure`.
 */
const WORDS_BY_ROW = new Map(displayWords.icons.map((entry) => [entry.rowId, entry]))

/**
 * The accessible name of one entry, in the display language (FR-038).
 *
 * Keyed by the row of table T-109, the only join that table admits.
 * `=== ''` rather than `||` / `??`: an empty cell means "no word settled yet",
 * so a word written later takes over without this line being edited.
 * A row missing from the dictionary cannot happen while `npm run gen:check`
 * passes; the guard covers a hand-edited generated file.
 *
 * @purity pure
 */
function entryLabel(icon: IconId, language: DisplayLanguage): string {
  const word = WORDS_BY_ROW.get(icon)?.label[language]
  if (word === undefined) return NO_WORDS
  return word === '' ? NO_WORDS : word
}

/** The two members of `CommandItem` this unit works out. */
interface CommandState {
  readonly isEnabled: boolean
  readonly isPressed: boolean
}

/**
 * What an entry is when no requirement keys a state on it: it can be used, and
 * it is not a toggle that is on.
 */
const USABLE_AND_OFF: CommandState = { isEnabled: true, isPressed: false }

/**
 * Whether one entry of the header can be used, and whether it is on.
 *
 * The cases follow table T-109's order (rule 03 section 4), so an omission
 * cannot pass for a re-ordering.
 *
 * @purity pure
 */
function commandStateOf(
  icon: IconId,
  settings: DocumentSettings,
  state: ScreenState,
  session: ScreenSession,
): CommandState {
  switch (icon) {
    case COMMAND_PALETTE_ENTRY:
      // FR-053 keeps this entry outside the palette: from inside, hiding the
      // palette would take away the face that brings it back.
      return { isEnabled: true, isPressed: state.paletteShown }

    case BASELINE_OVERLAY_ENTRY:
      // FR-049 / FR-015. Usable even with nothing to overlay: no requirement
      // conditions the toggle on the overlay's content.
      return { isEnabled: true, isPressed: settings.baselineVisible }

    case UNDO_ENTRY:
      // FR-029: faint when the history (FR-031, RD-1) is empty. The history
      // not being drawn does not exempt it -- FR-029 reaches every row of
      // table T-109.
      // `!== false`, not `=== true`: an absent answer leaves the entry usable.
      return { isEnabled: session.canUndo !== false, isPressed: false }

    case REDO_ENTRY:
      // The same rule read forward (RD-2).
      return { isEnabled: session.canRedo !== false, isPressed: false }

    case PLAN_DISPLAY_ENTRY:
      // FR-049: S-227 and S-228 are independent and both may be off, so this
      // entry is never faint and never reads the other half.
      return { isEnabled: true, isPressed: settings.planVisible }

    case ACTUAL_DISPLAY_ENTRY:
      // The same rule read from the other side.
      return { isEnabled: true, isPressed: settings.actualVisible }

    case FULL_SCREEN_ENTRY:
      // FR-071: the same entry leaves full screen again.
      return { isEnabled: true, isPressed: state.fullScreen }

    case DOCUMENT_SETTINGS_ENTRY:
      // FR-072. `null` is the panel closed, which is not the settings.
      return { isEnabled: true, isPressed: session.propertiesShowing === 'documentSettings' }

    case DIALOGUE_FIELD_ENTRY:
      // FR-066: the field exists only while the `Agent API` is on, so the entry
      // is faint while it is off (a press is told RS-35 of table T-233).
      // `isPressed` reads S-99i AND the API (EN-5 of table T-237): S-99i alone
      // would draw the entry faint and filled at once, which FR-029 forbids.
      // S-99i is kept while the API is off, so turning it back on restores it.
      return {
        isEnabled: session.isAgentApiEnabled,
        isPressed: session.isAgentApiEnabled && session.isDialogueFieldVisible,
      }

    case AGENT_API_ENTRY:
      // FR-065; table T-075 gives that display to this unit.
      return { isEnabled: true, isPressed: session.isAgentApiEnabled }

    default:
      // STOP -- NOT REACHABLE FROM THESE FOUR ARGUMENTS: whether two of the
      // remaining entries can be used, so each stays usable.
      //   IC-1, FR-087: OP-8 of table T-024a refuses an open while another
      //     is under way, and nothing among these four says one is.
      //   IC-2, FR-060: overwriting needs a file opened in this run, and
      //     whether one is held is the shell's to know.
      // Searched: FR-087 (table T-024a), FR-060, `ScreenSession` and table
      // T-206. Absent rather than forgotten: only the Framework holds a current
      // value (LY-5 of table T-060), and `ScreenSession` is what it hands over.
      //
      // STOP -- ZOOM BOUNDS NOT READ: whether IC-12 .. IC-15 (FR-018) are at
      // the end of their travel. `zoomX` / `zoomY` (S-75 / S-76) arrive in
      // `DocumentSettings`; their bounds S-97 / S-98 of table T-206 (figures at
      // S-54 / S-55) stay out of the document and are not an argument here,
      // so all four stay usable. Searched: FR-018, `_assets/tbl-settings.md`
      // rows S-54 / S-55 / S-75 / S-76 / S-97 / S-98, and `ScreenSession`.
      // ⚠️ The figures ARE generated into `src/` as `NOT_STORED_ZOOM_BOUNDS`
      // (edit-document.ts); this unit does not read them.
      //
      // STOP -- ONE ENTRY HAS NO "OFF": IC-16 (FR-039, S-72) chooses between
      // `light` and `dark`, and calling either "on" would settle a reading no
      // requirement states, so it is reported not pressed.
      // IC-21 (FR-038, S-99) is the same shape; its reading leaves through
      // `AppHeaderItems.language` instead of `isPressed`.
      //
      // IC-3, IC-10, IC-19 and IC-22 need no case: none is a toggle (an open
      // surface closes with IC-52, IN-4 of table T-028) and no requirement
      // withholds any of them.
      return USABLE_AND_OFF
  }
}

/**
 * One row of table T-109 as an entry of the header.
 *
 * @purity pure
 */
function commandItemFor(
  icon: IconId,
  settings: DocumentSettings,
  state: ScreenState,
  session: ScreenSession,
): CommandItem {
  const commandState = commandStateOf(icon, settings, state, session)
  return {
    icon,
    isEnabled: commandState.isEnabled,
    isPressed: commandState.isPressed,
    // Table T-109's 構え column (FR-053) is empty for every `App Header` row.
    isArmed: false,
    label: entryLabel(icon, session.language),
  }
}

/**
 * The entries table T-109 places in the `App Header`, in that table's own
 * order.
 *
 * @purity pure
 */
function headerCommands(
  settings: DocumentSettings,
  state: ScreenState,
  session: ScreenSession,
): readonly CommandItem[] {
  return iconRoster.icons
    .filter((row) => row.surfaces.includes(APP_HEADER))
    .map((row) => commandItemFor(row.rowId, settings, state, session))
}

/**
 * What stands in the `App Header` (U-31) this frame.
 *
 * @purity pure
 */
export function appHeaderItemsFromDocument(
  schedule: Schedule,
  settings: DocumentSettings,
  state: ScreenState,
  session: ScreenSession,
): AppHeaderItems {
  return {
    // U-27 (AT-3). `null` stays `null`: FR-035's `Untitled` is for the browser
    // tab only. Not translated -- FR-038 translates the interface, not content.
    documentTitle: schedule.project.title,

    // U-58 / U-59 (FR-101): the shell's reading, since only it knows which
    // handle the last write went through. The file name is not the title.
    openedFileName: session.openedFileName,
    fileSavedAt: session.fileSavedAt,
    // FR-101, in the session's language (FR-038). An unwritten word is ''.
    fileNeverSavedText:
      FILE_STATUS_BY_STATE.get('neverSaved')?.text[session.language] ?? '',

    commands: headerCommands(settings, state, session),

    // FR-038: the language must be readable before IC-21 is pressed. Carried,
    // not decided -- UF-60 puts the same S-99 in `ScreenView.language`. This is
    // the reading beside IC-21, not a second entrance.
    language: session.language,
  }
}
