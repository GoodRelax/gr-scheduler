// ScreenRenderer -- internal unit of the component.
//
// @unit      UF-62   (docs/spec/05-07-design.md, table T-075)
// @component ScreenRenderer, layer Adapter (table T-062)
// @purity    pure
//
// UF-62 fills exactly one member of `ScreenView` -- `appHeaderItems` -- and
// reads none of the others. The signature is the one the "nine unit contracts"
// section of `screen-renderer.ts` fixes; this file does not own it.
//
// ⭐ FOUR MEMBERS, FOUR OWNERS, AND ONLY ONE OF THEM IS DECIDED HERE.
// `documentTitle` is the document's own value (AT-3), `autosaveStatus` is the
// shell's reading (FR-061) and `language` is the session's (S-99); all three
// are carried across untouched. What this unit works out is `commands` -- and
// of each entry, only whether it can be used and whether it is on.
//
// ⭐ WHY THE ENTRIES ARE READ FROM THE GENERATED ROSTER RATHER THAN LISTED.
// FR-029 (MUST) makes the roster of icons AND the placement of each follow
// table T-109, and that table's surface column IS the placement.
// `icon-roster.json` is that table generated into `src/`, so the membership,
// the print order and the number of entries all reach this file from where
// they live. ⛔ None of the three is written down here: table T-109 counts
// itself (FR-029 forbids even the requirement to state the number), and rule
// 03 section 1 of docs/development-rules forbids re-typing a value the
// specification holds -- which is the drift `screen-renderer.ts` warns about on
// `AppHeaderItems.commands` in as many words.
// ⚠️ Only the rows a requirement keys a STATE on are named below. Every other
// row falls through to one default, so a row added to table T-109 reaches the
// header with no edit to this file.
//
// ⛔ WHAT A FAINT ENTRY CLAIMS. FR-029 (MUST) draws what cannot be used faint
// and gives its reason through a tooltip rather than letting it go quiet, so
// `isEnabled: false` is a claim that pressing the entry would achieve nothing.
// Where the four arguments cannot settle that claim the entry is left usable:
// a false faint tells the reader an entry is broken, which is the very reading
// FR-029 exists to prevent. The STOP notes below say which entries those are,
// and what would settle each.
//
// ⭐ U-35 of table T-103 names two things, `Header Commands` and `Branding`.
// `AppHeaderItems` holds a member for the first only, so the second is not
// described here and no member is invented for it.

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
 * The value table T-109's surface column carries for the `App Header` (U-31 of
 * table T-103).
 *
 * ⭐ A settled name copied spelling and all (rule 03 section 1), not a value
 * invented here: it is the join between this unit and the generated roster, and
 * the same spelling `icon-roster.json` prints in that column.
 */
const APP_HEADER = 'App Header'

// ⭐ The rows of table T-109 whose `isEnabled` or `isPressed` a requirement
// settles. ⛔ These identifiers are join keys, NOT names for the icons: table
// T-109 has no English column on purpose (naming one would settle a word the
// glossary has not), so each says which requirement's state the row carries and
// never stands in for a word on the screen. ⚠️ They are also not a roster of
// the header -- which rows the header holds is the generated roster's to say.

/** S-69, the overlay FR-015 draws. Its toggle is FR-049's. */
const BASELINE_OVERLAY_ENTRY: IconId = 'IC-4'
/** S-99e (FR-053). */
const COMMAND_PALETTE_ENTRY: IconId = 'IC-7'
/** S-59, the plan half (FR-049). */
const PLAN_DISPLAY_ENTRY: IconId = 'IC-8'
/** S-59, the actual half (FR-049). */
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
 * ⛔ NOT "PRINT NOTHING". An empty cell of `display-words.json` says that no
 * word has been SETTLED for that row yet (PD-160) -- which is true of all 176
 * of them today -- and this is exactly what UF-62 printed before the dictionary
 * was wired, so opening the road moved nothing on the screen.
 * ⚠️ Here the stand-in and an unwritten word are the same string, and that is a
 * coincidence of this member rather than the rule: `command-palette.ts` stands
 * in with the roster's own group word and `tooltips.ts` with the label, because
 * an empty string would be worse than what each printed before.
 *
 * Class C of rule 06: the words are display-only and leave no trace in the
 * saved form -- FR-038 (MUST NOT) keeps even the language out of the document,
 * so reversing this costs the one place that draws them.
 */
const NO_WORDS = ''

/**
 * The words of table T-109's rows, keyed by the row id.
 *
 * ⭐ A `Map` rather than a scan per entry: a description is built for every
 * frame, and rule 05 of docs/development-rules forbids a linear search on that
 * path (NFR-013).
 *
 * ⚠️ Reading `displayWords` no more makes this unit `semi-pure-a` than reading
 * `iconRoster` does: both are module constants compiled into the program, the
 * way `DEFAULT_CALENDAR` is in `schedule.ts`, and not external state read while
 * running. Table T-075 fixes UF-62 as `pure`.
 */
const WORDS_BY_ROW = new Map(displayWords.icons.map((entry) => [entry.rowId, entry]))

/**
 * The accessible name of one entry, in the display language (FR-038).
 *
 * ⭐ WHERE THE WORD COMES FROM. FR-038 (MUST) holds every word the screen prints
 * as one dictionary per language, and Chapter 6.2 fixes its manuscript as
 * `_source/display-words.json`; `display-words.json` beside this file is that
 * manuscript generated into `src/`. ⛔ It is keyed by the row of table T-109 --
 * the only join that table admits, because it deliberately has no English
 * column -- so no name is minted here and none is read off any other column.
 *
 * ⛔ THE FALLBACK IS WRITTEN AS `=== ''` AND NEVER AS `||` OR `??`. Those read
 * "the dictionary holds no word yet" and "the word is the empty string" as one
 * thing, and PD-160 is precisely the difference: an empty cell is UNSETTLED, not
 * an instruction to print nothing. The day a word is written this line stops
 * standing in without being edited.
 * ⚠️ A row the dictionary does not hold AT ALL is a second condition and is
 * answered separately, although with the same stand-in. It cannot happen while
 * `npm run gen:check` passes -- the generator builds its roster from table T-109
 * every run and refuses to write on a mismatch -- so what is guarded is the run
 * where someone edited the generated file by hand.
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
 * ⭐ The order of the cases is table T-109's own (rule 03 section 4): reading
 * them against the table has to be a walk in one direction, or a reader cannot
 * tell an omission from a re-ordering.
 *
 * ⚠️ The spellings of S-59's three values are not copied so much as checked:
 * they are the generated `DocumentSettings` type's own, so a change to that row
 * fails the compiler here instead of going stale in silence.
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
    case BASELINE_OVERLAY_ENTRY:
      // FR-049 makes a toggle of every boolean row of table T-202, and S-69 is
      // the one FR-015 draws from. ⚠️ It stays usable in a document with
      // nothing to overlay: no requirement conditions the toggle on what the
      // overlay would hold, and FR-029 makes faint mean "cannot be used".
      return { isEnabled: true, isPressed: settings.baselineVisible }

    case COMMAND_PALETTE_ENTRY:
      // FR-053 (MUST) puts this entry OUTSIDE the palette, which is why the
      // header carries it at all: from inside, hiding the palette would take
      // away the face that brings it back.
      return { isEnabled: true, isPressed: state.paletteShown }

    case PLAN_DISPLAY_ENTRY:
      // ⛔ FR-049 (MUST NOT) refuses to let both halves be hidden, and S-59
      // holds three values with no fourth standing for "neither" -- so hiding
      // the plan has nowhere to go while the plan is the only half shown. That
      // is the one state of this entry FR-029 asks to be drawn faint.
      return {
        isEnabled: settings.planActualDisplay !== 'plan-only',
        isPressed: settings.planActualDisplay !== 'actual-only',
      }

    case ACTUAL_DISPLAY_ENTRY:
      // The same rule read from the other side. ⭐ Written to look like the
      // case above because it IS the same rule (rule 03 section 4): a reader
      // who has to spot the difference twice will read a difference in meaning
      // into it.
      return {
        isEnabled: settings.planActualDisplay !== 'actual-only',
        isPressed: settings.planActualDisplay !== 'plan-only',
      }

    case FULL_SCREEN_ENTRY:
      // FR-071: the same entry leaves full screen again, so what a second press
      // does is decided by this entry's own state rather than by a second entry
      // (which FR-029 would forbid).
      return { isEnabled: true, isPressed: state.fullScreen }

    case DOCUMENT_SETTINGS_ENTRY:
      // FR-072 (MUST) says in as many words that which of the panel's two
      // contents is up is shown in the pressed state of this entry. ⚠️ `null`
      // is the panel closed, which is not the settings.
      return { isEnabled: true, isPressed: session.propertiesShowing === 'documentSettings' }

    case DIALOGUE_FIELD_ENTRY:
      // FR-066 puts the field up only while the `Agent API` is on, so with the
      // API off there is nothing for this entry to show or hide -- and turning
      // the API on belongs to the entry below, which FR-029 (MUST NOT) forbids
      // this one to duplicate.
      // STOP -- ⚠️ NOTHING HOLDS THE FIELD'S OWN STATE: whether the field has
      // been put away while the `Agent API` is still on. Table T-206 has a row
      // for the palette (S-99e), one for full screen (S-99f) and one for the
      // open surface (S-99g), and none for the dialogue field; `ScreenState`
      // carries those same three and no more. Searched: FR-066, FR-065, S-99b,
      // `_assets/tbl-settings.md` (table T-206), `ScreenState` and
      // `ScreenSession`. ⭐ So the pressed state is read off the only condition
      // anything states for the field being up -- the same condition UF-68
      // returns `null` on -- because reporting the entry off while the field is
      // on the screen would be a plain untruth.
      return { isEnabled: session.isAgentApiEnabled, isPressed: session.isAgentApiEnabled }

    case AGENT_API_ENTRY:
      // FR-065 (MUST) requires that the API's being on be readable on the
      // screen, and table T-075 gives that display to this unit.
      return { isEnabled: true, isPressed: session.isAgentApiEnabled }

    default:
      // STOP -- ⚠️ NOT REACHABLE FROM THESE FOUR ARGUMENTS: whether four of the
      // remaining entries can be used. Each is left usable, because FR-029
      // makes faint a claim that the entry would do nothing and a false claim
      // of that is the worse error.
      //   IC-1, FR-087 (`OP-2` of table T-024a): OP-8 (MUST NOT) refuses an
      //     open while an import or another open is under way, and nothing
      //     among these four says one is.
      //   IC-2, FR-060: overwriting needs the file that was opened, and FR-060
      //     itself says that permission can be lost and is offered back at
      //     startup. Whether it is held now is the shell's to know.
      //   IC-5 / IC-6, FR-031: whether anything is on the undo or the redo
      //     stack. Table T-027 owns what goes on it and `EditHistory` holds it;
      //     it is neither an argument here nor a member of `ScreenSession`.
      // Searched: FR-087 (table T-024a), FR-060, FR-031 (table T-027),
      // `ScreenSession` and table T-206. ⭐ LY-5 of table T-060 is why they are
      // absent rather than forgotten -- only the Framework may hold a current
      // value, and `ScreenSession` is the list of what it hands over.
      //
      // STOP -- ⛔ NO CONSTANT HOLDS THE ZOOM BOUNDS: whether IC-12 .. IC-15
      // (FR-018) are already at the end of their travel. `zoomX` / `zoomY`
      // (S-75 / S-76) arrive in `DocumentSettings`, but their bounds are
      // written as `zoomMin` / `zoomMax` -- S-97 / S-98 of table T-206, whose
      // figures sit at S-54 / S-55 -- which table T-206 keeps OUT of the
      // document, and no generator puts them into `src/`: `NOT_STORED_SIZES`
      // and `NOT_STORED_LIMITS` carry other rows of that table and not these.
      // Rule 03 section 1 forbids re-typing the two figures, so the comparison
      // cannot be written at all and all four stay usable. Searched: FR-018,
      // `_assets/tbl-settings.md` rows S-54 / S-55 / S-75 / S-76 / S-97 / S-98,
      // both generated NOT_STORED constants, and `ScreenSession`.
      //
      // STOP -- ⚠️ ONE ENTRY HAS NO "OFF": IC-16 (FR-039, S-72) chooses between
      // two values, and `isPressed` is declared as "a toggle that is on".
      // `light`/`dark` has no off side, and picking one of the pair to call
      // "on" would settle a reading no requirement states -- so it is reported
      // not pressed.
      // ⭐ IC-21 (FR-038, S-99) is the same shape of thing and is answered
      // rather than left open: its reading now leaves through the `language`
      // member of `AppHeaderItems`, filled below from `session.language`, the
      // way `HelpModal.language` carries the other entrance's half. ⛔ Which is
      // why it still reports not pressed here -- the member is the carrier, not
      // `isPressed`.
      //
      // ⭐ IC-3 (FR-025), IC-10 (FR-055), IC-19 (FR-068) and IC-22 (FR-036)
      // need no case: none is a toggle -- what an open surface closes with is
      // IC-52 (IN-4 of table T-028), not a second press of the entry that
      // opened it -- and no requirement withholds any of them. FR-055 states
      // its own answer for a document with nothing to draw rather than taking
      // the entry away.
      return USABLE_AND_OFF
  }
}

/**
 * One row of table T-109 as an entry of the header.
 *
 * ⭐ The row id is the whole of what identifies it (`CommandItem.icon`): the
 * table admits no other join, and figure F-019 -- not this file -- is where its
 * shape lives.
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
    // ⛔ NOT A GAP: table T-109's 構え column, which FR-053 makes the authority
    // for which entrance is which arm, holds an em dash for every `App Header`
    // row. Nothing on this surface arms anything.
    isArmed: false,
    label: entryLabel(icon, session.language),
  }
}

/**
 * The entries table T-109 places in the `App Header`, in that table's own
 * order.
 *
 * ⭐ One pass over the generated roster rather than a list written here, so
 * membership, print order and count all come from the table (FR-029, MUST)
 * without this file holding any of the three.
 *
 * ⚠️ Reading `iconRoster` does not make this `semi-pure-a`: it is a module
 * constant compiled into the program, the way `DEFAULT_CALENDAR` is in
 * `schedule.ts`, not external state read while running. Table T-075 fixes
 * UF-62 as `pure`.
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
    // U-27 `Document Title` -- `Project.title` (AT-3), carried and never
    // chosen. ⛔ `null` is passed on as `null`: FR-035 fixes `Untitled` for the
    // BROWSER TAB and states nothing about the header, and the same substitute
    // would stand for every unnamed document -- which FR-035 itself says it
    // cannot tell apart. ⚠️ Not translated, because it is the document's own
    // value and FR-038 translates menus and panels, not content.
    // ⭐ Nothing is normalised on the way through, and nothing has to be:
    // FR-035 (MUST NOT) refuses the empty string as a title, so "no title" has
    // one spelling and no rule is needed for which of two wins. Whether a
    // document may hold one anyway is FR-023's boundary, not the renderer's.
    documentTitle: schedule.project.title,

    // U-28 `Autosave Status`. FR-061 (MUST) tells three states apart and shows
    // the time with "saved"; the type carries that time on that arm alone, so
    // the shell's reading is passed on whole rather than taken apart and rebuilt
    // here. ⛔ A `pure` unit has no clock (CS-1 of table T-066), so the time
    // could not be made here in any case.
    // ⚠️ FR-061 also raises a notice when saving failed (NT-3a of table T-037).
    // That is `ScreenView.notices` and UF-67's to fill -- each of the nine fills
    // one member and reads none of the others.
    autosaveStatus: session.autosave,

    commands: headerCommands(settings, state, session),

    // FR-038 (MUST): the entrance at the top of the screen is one of the two,
    // and which language is on has to be readable BEFORE it is pressed. ⛔ Not
    // chosen or normalised on the way through: S-99 is the session's, UF-60
    // puts the same value in `ScreenView.language`, and two places deciding it
    // would be two answers. ⚠️ The entry itself (IC-21) is already in
    // `commands` -- this is the reading beside it, not a second entrance, which
    // FR-029 (MUST NOT) would forbid.
    language: session.language,
  }
}
