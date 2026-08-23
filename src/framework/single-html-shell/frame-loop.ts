// SingleHtmlShell -- the frame loop.
//
// @unit      UF-48   (docs/spec/05-07-design.md, table T-075)
// @component SingleHtmlShell, layer Framework (table T-062)
// @purity    non-pure
//
// Holds the current values, watches what table T-078 says may wake a frame,
// and computes table T-068 once at the head of each one before handing the
// result to everyone who draws (ADR-001).
//
// ⭐ Why this is not in single-html-shell.ts: table T-063 UT-6. Booting is what
// FR-067 and FR-065 constrain; running frames is what LY-5 and ADR-001
// constrain. Two reasons to change, so two files.
//
// ⛔ This is the ONLY layer allowed to hold a current value (table T-060
// LY-5). Everything inward takes what it needs as an argument.
//
// ⭐ TWO SURFACES, ONE FRAME. `SvgSurface` (IF-1) takes the schedule and
// `ScreenSurface` (IF-9) takes every UI part outside it, and both are filled
// from the SAME `ScreenRegions` / `ScheduleLayout` / `ScheduleGeometry` that
// ADR-001 has this file compute once at the head of the frame. ⛔ Drawing one
// of them on values from a different frame is what CA-4 forbids.
//
// ⭐ FT-1 OF TABLE T-078 IS WIRED HERE, and it belongs here rather than in the
// boot file for the reason LY-5 of table T-060 gives: the three members of
// PI-18 that read a happening are `pure`, so the press, the selection, the
// screen state and this frame's values all have to be HANDED to them, and this
// is the file that holds every one of those. `DomInputSource` (PI-27) supplies
// the happening over IF-2, and `single-html-shell.ts` starts it.
//
// ⚠️ ONE HAPPENING BUILDS THE CONTEXT TWICE, and the two cannot be shared.
// MK-10 is asked BEFORE the watcher hears the happening
// (`isBrowserDefaultStopped`, which PI-27 takes as a factory argument) and the
// rest is decided after it (`receiveInput`), so the two calls arrive at
// different moments -- and on a `down` the second one sees a press the first
// one could not: recording the press is a change, and MK-10's question must
// change nothing.
//
// ⭐ CS-4 OF TABLE T-066 LIVES HERE TOO, and it is the one unit of consistency
// that is not nested inside a frame. `saveHeldDocumentToFile` and
// `openDocumentIntoHold` are its whole shape: what the operation needs from the
// current values is taken before the first `await`, nothing reads them again
// while the person is answering (MUST NOT), and frames keep running throughout
// -- FT-3 in particular, which NFR-011 will not let stop. ⛔ Nothing is drawn
// to say that a wait is on: CS-4 forbids it (MUST NOT) and table T-078 has no
// trigger for it.
//
// ⭐ THE FRAME THAT PAINTS A QUESTION RAISED AFTER A WAIT IS FT-1's, and the
// table says so itself: FT-1 now covers the continuation of one input across a
// wait, and its own note leaves raising that continuation to the shell while
// keeping IF-2's supply as narrow as it was. So `askHowToOpen` and the two
// confirmations ask for a frame without any trigger of their own being minted
// (NFR-010, MUST NOT).

import type { Document } from '../../entity/document-model/document/document'
import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../entity/document-model/document-settings/document-settings'
import { emptyDialogueLog } from '../../entity/document-model/dialogue-log/dialogue-log'
import type { DialogueLog } from '../../entity/document-model/dialogue-log/dialogue-log'
import {
  emptyScreenState,
  escapeTarget,
  screenStateWithPalette,
  screenStateWithSurface,
  type EscapeTarget,
  type ScreenState,
} from '../../entity/document-model/screen-state/screen-state'
import { emptySelection } from '../../entity/document-model/selection/selection'
import type { Selection } from '../../entity/document-model/selection/selection'
import {
  emptyHistory,
  NOT_STORED_LIMITS,
  type HistoryLimits,
} from '../../entity/document-model/edit-history/edit-history'
import {
  textOfDay,
  type CalendarDay,
  type Project,
  type Task,
  type TaskGroup,
} from '../../entity/document-model/schedule/schedule'
import {
  itemAtPointer,
  NOT_STORED_SIZES,
  type PointerSlop,
} from '../../entity/layout-engine/item-hit-area/item-hit-area'
import {
  geometryFromLayout,
  type ScheduleGeometry,
} from '../../entity/layout-engine/schedule-geometry/schedule-geometry'
import {
  fitZoom,
  layoutFromSchedule,
  type ScheduleLayout,
} from '../../entity/layout-engine/schedule-layout/schedule-layout'
import {
  regionsFromScreen,
  type ScreenEnvironment,
  type ScreenRegions,
} from '../../entity/layout-engine/screen-regions/screen-regions'
import {
  applyDocumentChange,
  replaceDocument,
  type ChangeAudience,
  type DocumentCommand,
  type DocumentHolder,
  type HeldDocument,
  type ReplacementCall,
  type WriteMoment,
} from '../../use-case/apply-document-change/apply-document-change'
import {
  NOT_STORED_ZOOM_BOUNDS,
  type SettingsLimits,
} from '../../use-case/edit-document/edit-document'
import type { OpenChoice } from '../../use-case/import-document/import-document'
import { notifyChangeWatchers } from '../../use-case/notify-change-watchers/notify-change-watchers'
import {
  validateImportedDocument,
  type ImportBounds,
} from '../../use-case/validate-imported-document/validate-imported-document'
import {
  documentFromJson,
  documentFromMspdi,
  formatFromFile,
  jsonFromDocument,
  type ExchangeFormat,
} from '../../adapter/document-codec/document-codec'
// ⭐ TABLE T-024's EXTENSION COLUMN, AND NOTHING ELSE, reached the way
// `dom-screen-surface.ts` reaches `icon-glyphs.json`: a generated roster is
// data compiled into the program, not a reach into the component whose folder
// it sits in, which is the reading `tools/check_layer_rules.py` states in as
// many words. ⛔ It is read here because PI-20 of table T-064 -- the whole of
// what DocumentCodec may be asked for -- publishes no name that answers which
// extension table T-024 gives a form, and FR-096 (MUST NOT) forbids the value
// being written anywhere but that table.
import exchangeFormats from '../../adapter/document-codec/exchange-formats.json'
import {
  openDocumentFile,
  saveDocumentFile,
  type ChosenFileSaveRequest,
  type DocumentFileSaving,
  type FileStore,
  type OpenRoute,
  type ProjectIdentity,
  type SaveFileForm,
} from '../../adapter/file-gateway/file-gateway'
// ⭐ The type only. What an export IS belongs to PI-21 (CP-21), and this file
// hands that component the four values it says a scene is made of -- ADR-001
// has the side that computes a frame do the computing, and none of the four can
// be measured from inside an Adapter.
import type { ExportScene } from '../../adapter/image-exporter/image-exporter'
import {
  commandFromInput,
  pressRowOf,
  screenStateFromInput,
  selectionFromInput,
  NOT_STORED_ZOOM_STEP,
  type HumanInput,
  type InputAction,
  type InputContext,
  type PointerInput,
  type PointerPress,
  type PressRow,
} from '../../adapter/input-command-translator/input-command-translator'
import {
  screenViewFromRegions,
  type AutosaveStatus,
  type ConfirmationItem,
  type DisplayLanguage,
  type IconId,
  type RaisedConfirmation,
  type ScreenPart,
  type ScreenSession,
  type ScreenSurface,
} from '../../adapter/screen-renderer/screen-renderer'
import { svgFromSchedule, type SvgSurface } from '../../adapter/svg-renderer/svg-renderer'
import { WEB_STORAGE_KEY_PREFIX } from '../local-storage-document-store/local-storage-document-store'

/**
 * What the shell measured about the window this frame. `regionsFromScreen`
 * takes it as an argument because FR-051 forbids a setting to hold the last
 * two -- they differ from one machine to the next.
 */
export interface FrameEnvironment {
  readonly width: number
  readonly height: number
  readonly appHeaderHeight: number
  readonly scrollbarThickness: number
}

/** What one frame computed, kept together so nothing recomputes it. */
export interface FrameValues {
  readonly regions: ScreenRegions
  readonly layout: ScheduleLayout
  readonly geometry: ScheduleGeometry
}

/**
 * The rows of table T-230 a caller outside this loop may stand in: the two
 * whose `WS-3` column says the caller brings the document itself.
 *
 * ⛔ NARROWED OUT OF `ReplacementCall`, NEVER WRITTEN AGAIN. What each row
 * carries is PI-8's to say (rule 03 section 1), and the other four rows are not
 * this member's to offer: all four are reached from inside this file -- RD-1
 * and RD-2 from the undo entries, RD-3 and RD-4 from the read OP-2 begins, and
 * an outside caller has no `ImportDocument` call to bring.
 */
export type HeldDocumentCall = Extract<ReplacementCall, { readonly row: 'RD-5' | 'RD-6' }>

export interface FrameLoop {
  /**
   * FT-2: the current value was replaced, so a frame is owed.
   *
   * ⭐ THE CALLER NAMES ITS ROW OF TABLE T-230 AND BRINGS NOTHING ELSE. That
   * table requires it (MUST) and forbids a replacement that names none (MUST
   * NOT), so the history, the stamp and the undo step are settled by the row on
   * the `replaceDocument` road (PI-8) -- the same road RD-1 and RD-2 take -- and
   * not by any habit of this file's.
   * ⚠️ The name is not `replaceDocument` because R2.1 asks it to say the role:
   * `hold` is LY-5's own word for the one thing this layer does that no other
   * may, and the pair this loop keeps is already `held` (`HeldDocument`).
   * ⚠️ Nothing in `src/` calls it today.
   */
  holdDocument(call: HeldDocumentCall): void
  /** FT-3: the window changed size. */
  resize(env: FrameEnvironment): void
  /**
   * MK-10's answer for one happening: `TranslatedInput.isBrowserDefaultStopped`
   * and nothing else.
   *
   * ⛔ Asked BEFORE the watcher hears the happening, which is what PI-27's
   * factory argument is for, so it must change nothing -- the answer decides
   * whether `preventDefault` is called, and IN-4a would read a screen that had
   * already moved on.
   *
   * @purity non-pure
   */
  isBrowserDefaultStopped(input: HumanInput): boolean
  /**
   * FT-1 of table T-078: one happening arrived over IF-2.
   *
   * @purity non-pure
   */
  receiveInput(input: HumanInput): void
  /** What the last frame computed, for a caller that needs to ask. */
  current(): FrameValues | null
  document(): Document
  /**
   * What one export is assembled from (PI-21), for the base environment FR-080
   * names -- or `null` while BO-1 has settled no size.
   *
   * ⭐ THE ONE PLACE THE PANELS ARE CLOSED. FR-080's environment is not the one
   * a person is looking at, and the difference is a whole run of table T-068,
   * so this is the loop's to answer and nobody else's (LY-5 of table T-060,
   * ADR-001). ⛔ It is NOT run at the head of a frame -- see the member.
   * ⚠️ This is what an implementor of IF-7 puts in `AgentSnapshot.exportScene`,
   * and it is also the road IO-3 of table T-024 takes for a person.
   *
   * @purity semi-pure-b
   */
  exportScene(): ExportScene | null
}

/**
 * The far side of IF-9, and the one thing about this reading session that only
 * the host can answer.
 *
 * ⭐ OPTIONAL ON PURPOSE. Table T-077's boot order and table T-078's triggers
 * govern the schedule as much as the parts around it, so the loop runs whether
 * or not the caller had a browser to build a `ScreenSurface` on.
 */
export interface ScreenWiring {
  /** IF-9's implementation -- the one unit that turns a `ScreenView` into nodes. */
  readonly surface: ScreenSurface
  /**
   * FR-038's answer for this session. ⛔ Settled by the shell and never by the
   * document: FR-038 keeps the chosen language out of it (MUST NOT).
   */
  readonly language: DisplayLanguage
}

/**
 * The reach table T-023d's rows are grabbed by (`itemAtPointer`, PI-7).
 *
 * ⛔ Not one figure is typed here: every value arrives from `NOT_STORED_SIZES`,
 * which `tools/generate_entity_types.py` prints from the manuscript, so a
 * change to table T-206 reaches this file rather than being silently ignored
 * (rule 03 section 1).
 * ⚠️ `S-92` and `S-93` are each stated as a width and a height, while
 * `PointerSlop.fadeHandle` is documented as a HALF-width -- which is why S-92's
 * width is halved here and S-93's pair is passed through as it stands.
 */
const POINTER_SLOP: PointerSlop = {
  planEndpoint: NOT_STORED_SIZES['S-90'],
  actualEndpoint: NOT_STORED_SIZES['S-91'],
  fadeHandle: NOT_STORED_SIZES['S-92'][0] / 2,
  dummyWidth: NOT_STORED_SIZES['S-93'][0],
  dummyHeight: NOT_STORED_SIZES['S-93'][1],
  line: NOT_STORED_SIZES['S-137'],
}

/** The factor S-95's remark states: 1 MB = 1024 * 1024 bytes (same as S-113). */
const BYTES_PER_MEGABYTE = 1024 * 1024

/**
 * FR-031's two bounds on the undo history, by the rows table T-206 states them
 * at.
 *
 * ⭐ S-95 IS PRINTED IN MEGABYTES and FR-031 measures a step in BYTES -- 「1 段
 * の大きさは、その段の保存形を UTF-8 で符号化した長さ（バイト）で測ること
 * （MUST）」 -- so the two have to be brought into one unit before
 * `historyWithStep` compares them. ⛔ The factor is not chosen here: S-95's own
 * remark states it, and CR-173 already put the same one beside the same shape of
 * bound in `validate-imported-document.ts` (S-113). ⚠️ Left unconverted the
 * bound was 64 BYTES, which is smaller than any document, so every write
 * collapsed the history to a single step and S-94's fifty were unreachable.
 * ⛔ The generated constant carries the number and the unit exactly as the
 * published cell prints them (CR-178), so the conversion belongs in the unit
 * that applies the bound and nowhere upstream.
 */
const HISTORY_LIMITS: HistoryLimits = {
  maxSteps: NOT_STORED_LIMITS['S-94'],
  maxTotalSizeBytes: NOT_STORED_LIMITS['S-95'] * BYTES_PER_MEGABYTE,
}

/**
 * SK-8 of table T-036, spelled as that table's assignment column spells it.
 *
 * ⛔ THE SEAM DOES NOT PUBLISH THE SPELLING. `KeyInput.key` is a plain string,
 * so the name has to be written wherever a row of table T-036 is recognised:
 * `dom-input-source.ts` normalises the host's `Escape` to it, and
 * `input-command-translator.ts` keys its own rows on it. ⚠️ This is the THIRD
 * copy of it in `src/`; publishing one takes a change request, not a choice
 * here.
 */
const ESCAPE_KEY = 'Esc'

/**
 * CU-3 of table T-029 -- the guide cursor drawn for nobody. The key that holds
 * it is `S-66` of table T-202.
 *
 * ⭐ The manuscript's own spelling, and the compiler checks it: the member is a
 * literal union, so a value renamed in the manuscript fails type checking here
 * rather than quietly comparing false.
 */
const GUIDE_CURSOR_NONE = 'none'

/**
 * ED-1 of table T-229 -- the word a write made from the screen names itself by.
 *
 * ⭐ The specification's word, not this file's: table T-229 reserves it for
 * 「画面を操作する人」, and AG-6 of table T-035 tells one writer from another by
 * this string alone, so a different spelling here would make this side's writes
 * look like somebody else's.
 * ⚠️ NOTHING GENERATES IT. No target of `tools/generate_entity_types.py` carries
 * table T-229, so a change to that row has to be brought here by hand.
 */
const EDITED_BY_SCREEN = 'user'

/**
 * The rows of table T-109 that only THIS layer can answer.
 *
 * ⭐ WHY THE SHELL AND NOT THE TRANSLATOR. `input-command-translator.ts` lists
 * them among the rows it answers with nothing, and gives one reason for each:
 * what a press on them writes is a current value, and LY-5 of table T-060
 * leaves those with the Framework alone. IC-21 chooses the display language
 * (S-99); IC-69 and IC-70 are NT-7's two answers; IC-71 .. IC-73 are OP-3's
 * three, and what each of them settles is a whole-document replacement the
 * Framework is the only layer that may hold. ⛔ None of them is a
 * `DocumentCommand`, so there is no road through table T-108 for any of them.
 * ⚠️ The ids are the join to table T-109, the way `IconId` is everywhere else.
 */
const DISPLAY_LANGUAGE_ENTRY: IconId = 'IC-21'
const CONFIRMATION_PROCEED_ENTRY: IconId = 'IC-69'
const CONFIRMATION_CANCEL_ENTRY: IconId = 'IC-70'

/** The row of table T-037 a raised question follows -- `NT-7`. */
const CONFIRMATION_MANNER = 'NT-7'

/**
 * U-56 `Open Chooser` of table T-103 -- the surface OP-3 of table T-024a puts
 * its three-way question on.
 *
 * ⭐ A SETTLED NAME COPIED SPELLING AND ALL (rule 03 section 1), because three
 * sides have to agree on it: `ScreenState.surface` (S-99g) carries it,
 * `icon-roster.json` places IC-71 .. IC-73 on it out of table T-109's own
 * surface column, and `readScreenPartAt` answers with it. ⛔ Not minted here --
 * U-56 is what made this question askable at all.
 * ⚠️ NOT `Confirmation` (U-55): that surface is NT-7's two answers and holds no
 * third entry, which is what U-56's own remark says it is not.
 */
const OPEN_CHOOSER_SURFACE = 'Open Chooser'

/**
 * The three entries table T-109 places on that surface, each bound to the
 * answer `OpenChoice` (PI-10) spells for it.
 *
 * ⭐ A JOIN, NOT A TRANSLATION. Table T-109 has no English column on purpose,
 * so a row id is the only handle it admits; the three spellings on the right
 * are `import-document.ts`'s, and this states which row means which. ⛔ Nothing
 * of either side's wording is copied.
 * ⚠️ OP-9 is why the third one is not an entry of its own kind: that row says
 * the way to the overlay IS OP-3's third choice, and IC-4 of table T-109 warns
 * in as many words that its own entry is not a way of reading a file.
 */
const OPEN_CHOICE_OF_ENTRY: Readonly<Record<IconId, OpenChoice>> = {
  'IC-71': 'replace',
  'IC-72': 'merge',
  'IC-73': 'baseline',
}

/**
 * OP-2 of table T-024a -- which of its two routes this loop takes.
 *
 * STOP -- ⛔ THE OTHER ROUTE HAS NO TRIGGER. A drop is watched by the store
 * itself (PI-28 says why: the handle does not survive the event), so
 * `readFileToOpen('drop')` reads what it already took -- and table T-078 names
 * no happening for a file arriving that way, which NFR-010 (MUST NOT) forbids
 * this file from adding. ⚠️ The store therefore holds dropped files that
 * nothing asks it for.
 */
const OPEN_ROUTE_FROM_CHOOSER: OpenRoute = 'chooser'

/**
 * What SK-11 of table T-036 writes, whatever the document was opened from.
 *
 * ⭐ FR-096 (MUST) settles it and leaves the caller no choice, and carries a
 * MUST NOT against this route writing an MSPDI-opened document back as MSPDI.
 * ⛔ So the form is a constant of the SAVE path rather than something read off
 * the file that was opened -- reading it there is what that MUST NOT forbids,
 * and it is also why nothing here asks the store what it is holding.
 * ⚠️ The spelling is `SaveFileForm`'s, which `file-gateway.ts` owns (CR-146),
 * so a renamed member fails type checking here rather than comparing false.
 */
const SAVE_FORM: SaveFileForm = 'grsJson'

/**
 * The row of table T-024 that `SAVE_FORM` is, which is the join that table
 * admits and the only one it has.
 *
 * ⭐ ONE FACT STATED ONCE: the form `file-gateway.ts` spells and the row the
 * manuscript prints it at are the same format, and the pair stands here so that
 * the extension below is looked up rather than typed. Table T-024 carries no
 * English column, so nothing else could join the two.
 * ⚠️ `document-codec.ts` binds the same row to the same spelling for its own
 * `ExchangeFormat`. That map is private to that component and answers a
 * different question -- which decoder a file goes to (OP-12) -- so it cannot be
 * asked from here (LR-2).
 */
const SAVE_FORM_ROW = 'IO-2'

/**
 * The extension table T-024 gives that row.
 *
 * ⛔ READ, NEVER TYPED. FR-096 (MUST NOT) fixes the extension's one source as
 * table T-024, and `tools/generate_exchange_formats.py` is how that column
 * reaches `src/`; `npm run gen:check` is what fails when the two drift apart.
 * ⚠️ An empty answer means the roster no longer carries the row, and empty is
 * then the whole of what is known -- nothing is invented in its place.
 */
const SAVE_FORM_EXTENSION: string =
  exchangeFormats.formats.find((one) => one.rowId === SAVE_FORM_ROW)?.extension ?? ''

/**
 * The rows table T-206 keeps outside the document, in `localStorage`.
 *
 * ⭐ THE SET IS THE SPECIFICATION'S AND IS NOT CHOSEN HERE. LM-14 defines it
 * literally -- the rows of table T-206 marked as kept in `localStorage` -- and
 * it is exactly these four. ⛔ S-99e / S-99f / S-99g are NOT among them: those
 * are the screen's own state and `ScreenState` (PI-36) already owns them, which
 * is why they arrive here through `screenState` rather than through a key.
 *
 * ⚠️ THE PREFIX IS SHARED, NOT COPIED. FR-026's RATIONALE requires every key
 * this tool writes to carry one, because LM-6 says the store is shared by every
 * local page on the machine -- so the constant is imported from the unit that
 * already declares it (CP-29) rather than typed a second time (R4).
 *
 * ⛔ THE KEY SPELLINGS AFTER THE PREFIX ARE NOT IN THE SPECIFICATION. It names
 * the rows and the store and stops there, so these are this file's, chosen to
 * read as the row does. A change request would be needed to publish them.
 */
const BROWSER_STORED_KEY: Readonly<Record<BrowserStoredRow, string>> = {
  'S-99': `${WEB_STORAGE_KEY_PREFIX}language`,
  'S-99a': `${WEB_STORAGE_KEY_PREFIX}openedBy`,
  'S-99b': `${WEB_STORAGE_KEY_PREFIX}agentApiDocuments`,
  'S-99c': `${WEB_STORAGE_KEY_PREFIX}unlockPasswordSha256`,
}

/**
 * The four rows of table T-206 LM-14 counts, as a census the compiler keeps.
 *
 * STOP -- ⛔ ONLY `S-99` HAS A PRODUCER IN THIS BUILD. The other three are
 * named so the set is visible and so the next owner has one place to add to,
 * and nothing reads or writes them: S-99a is the watermark's opened-by name
 * (`single-html-shell.ts` records that nothing holds it), S-99b is the record
 * that turns the `Agent API` on per document (`sessionOf` records the same),
 * and S-99c is the unlock password's digest, which nothing asks a person for --
 * `input-command-translator.ts` records that table T-037 has no row for asking.
 * ⚠️ Writing a key nothing ever reads would only make the rule look kept.
 */
type BrowserStoredRow = 'S-99' | 'S-99a' | 'S-99b' | 'S-99c'

/** The two `DisplayLanguage` spellings FR-038 admits, as a census. */
const DISPLAY_LANGUAGES: Readonly<Record<DisplayLanguage, true>> = { ja: true, en: true }

/**
 * OP-6 of table T-024a asks for the defaults, and this is them: the value the
 * settings manuscript states for every key of the presentation group.
 *
 * ⛔ NOT ONE VALUE IS TYPED HERE. `SETTINGS_DEFAULTS` (PI-2 of table T-064) is
 * what `tools/generate_entity_types.py` prints out of that manuscript, keyed by
 * the dotted key the published table prints; all this does is put the dots back
 * into objects so that the shape is the one `DocumentSettings` declares.
 * ⚠️ THE CAST IS WHERE TWO GENERATED SHAPES MEET, and it is the same move
 * `documentFromJson` makes for the same reason. Both the record and the type
 * come out of ONE generator run, so a key in one and not the other is a
 * generator that has drifted from itself -- `npm run gen:check` is what says so,
 * and the only thing this function could do instead is invent a value.
 *
 * @purity pure
 */
function defaultDocumentSettings(): DocumentSettings {
  const built: Record<string, unknown> = {}
  for (const [dotted, value] of Object.entries(SETTINGS_DEFAULTS)) {
    const path = dotted.split('.')
    const leaf = path.pop()
    if (leaf === undefined) continue
    let at = built
    for (const step of path) {
      const standing = at[step]
      const group =
        typeof standing === 'object' && standing !== null
          ? (standing as Record<string, unknown>)
          : {}
      at[step] = group
      at = group
    }
    at[leaf] = value
  }
  return built as unknown as DocumentSettings
}

/**
 * ⭐ Built once. It never changes, and OP-6 asks the same question of every
 * import.
 */
const DEFAULT_DOCUMENT_SETTINGS: DocumentSettings = defaultDocumentSettings()

/**
 * FR-096 (MUST): what the chooser is offered as a name -- the document name
 * with the extension table T-024 gives, and the extension alone where the
 * document carries no name.
 *
 * ⭐ AT-3 IS THE DOCUMENT NAME. That column and U-27 of table T-103 are the
 * same value, and FR-074 states in as many words that `title` is the one
 * FR-035 owns -- so the name is read off the DOCUMENT and never off the file it
 * may happen to stand in.
 * ⚠️ `null` and an empty string reach the same answer, which is the case FR-096
 * writes out: FR-035 (MUST NOT) keeps `title` from ever holding an empty string,
 * so `null` is the only spelling of "no name" a document this build wrote can
 * carry -- and one that arrived carrying the other still suggests the extension
 * by itself rather than a name that begins with a dot.
 * ⚠️ A SUGGESTION AND NOT A DECISION, which FR-096 says and
 * `ChosenFileWrite.suggestedFileName` repeats from the store's side.
 *
 * @purity pure
 */
function suggestedFileNameOf(project: Project): string {
  return `${project.title ?? ''}${SAVE_FORM_EXTENSION}`
}

/**
 * OP-12's answer turned into a document, or `null` where the decoder refused.
 *
 * ⭐ UT-5 of table T-063 KEEPS EACH FORMAT IN A CODEC OF ITS OWN, so the answer
 * OP-12 gave is what picks one; nothing here reads the text a second time to
 * guess.
 * ⭐ `current` IS WHAT MSPDI DOES NOT CARRY. `documentFromMspdi` names the parts
 * it takes from there -- the presentation group, the stamp, the change log, the
 * format version -- and states that nothing of that document's SCHEDULE is
 * merged in, which is FR-056's business inside ImportDocument.
 *
 * ⛔ THE FAULTS ARE DROPPED HERE AND THAT IS THE ABSENCE `writeDocument`
 * RECORDS, not a decision: NT-1 of table T-037 (MUST) wants the item and the
 * reason said in words, FR-038 (MUST) keeps every such word in the one
 * generated dictionary, and it holds no row for a codec's fault.
 * ⚠️ The MSPDI road's notices (EX-3, EX-6) are dropped for the same reason.
 *
 * @purity pure
 */
function decodedDocument(
  format: ExchangeFormat,
  text: string,
  current: Document,
): Document | null {
  if (format === 'grsJson') {
    const read = documentFromJson(text)
    return read.ok ? read.document : null
  }
  const read = documentFromMspdi(text, current)
  return read.ok ? read.document : null
}

/**
 * What the autosave status is before this session has written anything.
 *
 * STOP -- ⛔ NOT DECIDED BY THE SPECIFICATION: FR-061 requires three states to
 * be told apart (MUST) -- saved with a time, saving, failed -- and NONE of the
 * three describes a document that has just been opened and not yet autosaved.
 * ⚠️ `saved` is the nearest of the three, and the time it carries is the
 * document's own AT-129 -- the instant either group last moved at (FR-063) --
 * rather than a moment invented here: what is on the screen is what was last
 * written. ⛔ A ruling is owed, and so is the wiring of
 * FR-026's autosave -- nothing in this build performs one.
 *
 * @purity pure
 */
function autosaveAtStartup(held: Document): AutosaveStatus {
  return { kind: 'saved', at: held.documentStamp.settingsUpdatedUtc }
}

/**
 * What the shell answers about this reading session (`ScreenSession`, PI-37).
 *
 * ⭐ Every member is either a measurement only this layer can make or a value
 * table T-206 keeps out of the document, which is why LY-5 of table T-060
 * leaves them here.
 *
 * ⛔ TWO OF THEM WAIT ON FT-4 of table T-078 -- 「時間が来たこと」, which that
 * table leaves to the shell to measure and which this change does not wire.
 * `pointerRestedMs` is an elapsed time, and `iconUnderPointer` is what EZ-2 of
 * table T-040 shows once that time has passed, so neither can be answered until
 * there is a clock: 0 and `null` say that no rest has been measured.
 * ⚠️ `pointer` no longer waits on anything -- FT-1 is wired, and the caller
 * hands in the place the last pointer happening was reported from.
 *
 * ⛔ `selectedGroupIds` (PD-142) and `selectedResourceUids` (PD-143) stay empty
 * for a different reason: FR-085's row selection is made in the `Row Title
 * Panel`, which the note under table T-023a puts outside the decision order
 * `commandFromInput` applies, so no happening it reads names one.
 * `propertiesShowing` and `propertiesSubject` (PD-144) stay null because
 * nothing holds the panel's state -- `screen-renderer.ts` records that FR-072's
 * rule has no owner, which is why `openPropertiesPanel` reaches a STOP below.
 *
 * @purity pure
 */
function sessionOf(
  held: Document,
  regions: ScreenRegions,
  layout: ScheduleLayout,
  language: DisplayLanguage,
  pointer: { readonly x: number; readonly y: number } | null,
  confirmation: RaisedConfirmation | null,
): ScreenSession {
  return {
    language,
    autosave: autosaveAtStartup(held),
    // FR-065 / S-99b: the record that turns the `Agent API` on is kept per
    // document in `localStorage`, and ⛔ nothing in `src/` owns those rows yet
    // (`local-storage-document-store.ts` says so in as many words). No record
    // is 「not enabled」, which is the truth about this build.
    isAgentApiEnabled: false,
    pointer,
    pointerRestedMs: 0,
    iconUnderPointer: null,
    // STOP -- ⛔ NOT DECIDED BY THE SPECIFICATION: where the floating palette
    // stands before anyone has dragged it (FR-053). `command-palette.ts`
    // records the same absence -- neither table T-203 nor table T-206 has a row
    // for the place. ⚠️ The `Row Area`'s own corner is used rather than a pair
    // of numbers written here, so nothing is invented: U-50 is a rectangle the
    // specification does hold, and SC-6 keeps the palette off the schedule's
    // scrolling anyway.
    commandPaletteAt: { x: regions.rowArea.x, y: regions.rowArea.y },
    selectedGroupIds: [],
    selectedResourceUids: [],
    propertiesShowing: null,
    propertiesSubject: null,
    // FR-076's notices are raised by the paths that would report a fault, and
    // none of those paths runs in this build.
    notices: [],
    // FR-032 (MUST): the question standing in front of a delete, or none.
    // ⭐ Held by the loop, not built here -- LY-5 of table T-060 leaves a
    // current value with this layer and this function is handed it.
    confirmation,
    // SC-1 (MUST): the row titles keep step with the body vertically and do not
    // move sideways, so each row's band is this frame's own `RowPlacement`
    // taken across the width `regionsFromScreen` gave the panel. ⛔ Not
    // measured a second time -- ADR-001 has the layout computed once, and SC-1
    // means the panel has to use those very numbers.
    rowBoxes: layout.rows.map((row) => ({
      groupId: row.groupId,
      box: {
        x: regions.rowTitlePanel.x,
        y: row.y,
        width: regions.rowTitlePanel.width,
        height: row.height,
      },
    })),
  }
}

/**
 * OP-10 of table T-024a -- what to draw when the stored place is `null` or
 * points at a row that is gone.
 *
 * ⛔ `null` is not a missing value, it is "the person has not chosen a place
 * yet", and the row says to show what FR-055's fit-to-screen would choose
 * (MUST). ⚠️ It also forbids HF-8 here (MUST NOT), so the collapse state
 * FR-004 saved is left exactly as it is -- this only decides the view.
 *
 * ⭐ The document is NOT edited. OP-10 sits on the reading side ("読む側の規則
 * は表 T-024a の `OP-10` が持つ", FR-051), so the stored settings keep saying
 * `null` and every frame decides again.
 *
 * ⚠️ Runs table T-068 at most twice, which is what the rule after that table
 * allows: once to measure, once at the chosen zoom. ⛔ A third pass is
 * forbidden -- the level of detail can oscillate and the loop would not be
 * guaranteed to end.
 *
 * @purity pure
 */
function viewSettings(
  held: Document,
  stored: DocumentSettings,
  regions: ScreenRegions,
): DocumentSettings {
  const groupIds = new Set(held.schedule.taskGroups.map((one) => one.id))
  const placed = stored.scrollDate !== null && groupIds.has(stored.scrollGroupId ?? '')
  if (placed) return stored

  // ⭐ THE POSITION IS NO LONGER DECIDED HERE. OP-10 sends the zoom AND the
  // position to FR-055, and `fitZoom` (PI-5) now answers all four, so the two
  // values below are scaffolding rather than an answer: S-77 pins the time axis
  // and a layout cannot be measured until it is pinned to SOME day. Which day
  // does not matter -- the extent is a difference of two edges, so it comes out
  // the same wherever the axis starts, and the fit reads the real place off it.
  //
  // ⭐ This is what closed the harm FR-055's RATIONALE names: the earliest
  // planned start is NOT the earliest day anything is drawn on -- OC-5 of table
  // T-038 counts an `actualStart` that precedes it -- so as an answer it left
  // the overhang behind the Row Title panel, where no scroll position can
  // reach it.
  const starts = held.schedule.tasks
    .map((one) => one.start)
    .filter((one): one is string => one !== null)
    .sort()
  const firstRow = [...held.schedule.taskGroups].sort((a, b) => a.order - b.order)[0]
  const pinned: DocumentSettings = {
    ...stored,
    scrollDate: starts[0] ?? held.schedule.project.startDate,
    scrollGroupId: firstRow === undefined ? stored.scrollGroupId : firstRow.id,
  }

  const measured = layoutFromSchedule(held.schedule, pinned, regions)
  const fitted = fitZoom(measured, pinned, regions)
  return {
    ...pinned,
    zoomX: fitted.zoomX,
    zoomY: fitted.zoomY,
    scrollDate: fitted.scrollDate,
    scrollGroupId: fitted.scrollGroupId,
  }
}

/**
 * Whether this happening left no gesture in flight.
 *
 * ⭐ IN-1 settles a pointer operation on the RELEASE and IN-1a ends a lost one
 * as an abort (MUST), so those two are the ends. A `move` keeps the press: CS-2
 * of table T-066 makes the whole gesture about the moment it began.
 *
 * @purity pure
 */
function hasEndedGesture(input: HumanInput): boolean {
  return input.kind === 'pointer' && (input.phase === 'up' || input.phase === 'lost')
}

/**
 * IN-4 of table T-028 -- which level this `Esc` consumes, or null for a
 * happening that is not one and for one with nothing left to consume (IN-4a).
 *
 * ⛔ ASKED AGAINST THE STATE THE THREE MEMBERS WERE HANDED, never against what
 * they answered. `screenStateFromInput` has already consumed the two levels
 * that are ITS to consume -- the open surface and what is armed -- so a second
 * reckoning off the new state would take two levels for one press, and IN-4
 * allows 1 阶層 (MUST).
 * ⭐ THE OTHER TWO LEVELS ARE THE SHELL'S, because both are current values the
 * Framework holds (LY-5 of table T-060): the press in flight and the Dual
 * Cursor mode. `screen-state.ts` says so where `EscapeContext` is declared, and
 * that is the whole reason the seam takes one.
 *
 * @purity pure
 */
function escapeLevelOf(input: HumanInput, context: InputContext): EscapeTarget | null {
  if (input.kind !== 'key' || input.key !== ESCAPE_KEY) return null
  return escapeTarget(context.screenState, {
    gestureInFlight: context.pressed !== null,
    dualCursorMode: context.isDualCursorMode,
  })
}

/**
 * Whether two answers of `readScreenPartAt` name the same place.
 *
 * ⭐ Compared by value and not by identity: IF-9 builds its answer at the
 * moment it is asked, so two reads taken over one unmoved pointer are two
 * objects that mean the same thing.
 *
 * @purity pure
 */
function isSameScreenPart(a: ScreenPart | null, b: ScreenPart | null): boolean {
  if (a === null || b === null) return a === b
  return a.part === b.part && a.entry === b.entry
}

/**
 * Whether a press of each row of table T-023a changes the document as it runs.
 *
 * ⭐ WHY EXACTLY TWO ARE FALSE. Table T-027 keeps exactly two gestures outside
 * the undo history -- UN-8 the pan and UN-9 the range selection -- and keeps
 * them out because neither changes the document. AG-9's refusal is about
 * writing into a HALF-FINISHED document change, so a gesture with no such state
 * to be half-way through is one it spares.
 *
 * ⭐ A CENSUS THE COMPILER KEEPS, spelled the way `input-command-translator.ts`
 * spells its own: `Record<PressRow, boolean>` makes a row added to table T-023a
 * a compile error here, naming the row that has to be judged. ⛔ A bare `string`
 * key would let a new row default silently into 「spared」 or 「refused」 by
 * nothing but the shape of this lookup.
 */
const PRESS_CHANGES_DOCUMENT: Readonly<Record<PressRow, boolean>> = {
  // UN-8 -- the pan moves the viewport and no row of the file.
  'PD-1': false,
  'PD-2': true,
  'PD-3': true,
  'PD-4': true,
  'PD-4a': true,
  // UN-9 -- the range selection moves what is chosen, not what is written.
  'PD-5': false,
}

/**
 * Whether a press in flight is one AG-9 of table T-035 refuses a write during.
 *
 * ⛔ `on` IS THE FIRST QUESTION AND THE ROW IS THE SECOND. The note under table
 * T-023a binds that table's decision order to the schedule's drawing area
 * (MUST), so the row a press on a drawn entry carries says nothing about what
 * the press is: `commandFromInput` branches to `commandFromEntry` before it
 * ever looks at the row, and that road CAN change the document. A press the
 * screen surface answered for is therefore in flight whatever its row is.
 * ⚠️ A press falling on an entry lands on PD-5 for want of a hit, which is
 * precisely the row that would otherwise be spared -- so reading the row first
 * would take AG-9 off every palette press there is.
 *
 * @purity pure
 */
function isDocumentChangingPress(press: PointerPress | null): boolean {
  if (press === null) return false
  if (press.on !== null) return true
  return PRESS_CHANGES_DOCUMENT[press.pressRow]
}

/**
 * Which entry of table T-109 this happening settled on, or null for one that
 * settled on none.
 *
 * ⭐ THE RELEASE, AND FROM THE PRESS. IN-1 settles a pointer operation on the
 * release (MUST) and CS-2 of table T-066 makes the press its moment, which is
 * exactly the pair `commandFromEntry` is asked with -- so the shell's own three
 * entries are read the same way rather than on a rule of this file's.
 * ⛔ Read off the CONTEXT's press and not the loop's: the loop drops its press
 * before the action is carried out, and the context is the value the three
 * members of PI-18 were handed for this same happening.
 *
 * @purity pure
 */
function entrySettledOnRelease(input: HumanInput, context: InputContext): IconId | null {
  if (input.kind !== 'pointer' || input.phase !== 'up') return null
  const press = context.pressed
  if (press === null || press.on === null) return null
  return press.on.entry
}

/**
 * The rows CD-2 of table T-050 takes with one row -- it and everything below
 * it.
 *
 * ⛔ A SECOND READING OF TABLE T-050, AND IT IS ONE THIS FILE WOULD RATHER NOT
 * MAKE. FR-032 (MUST) requires the confirmation to name the `Task`s that would
 * go, so whoever raises the question has to know the chain -- and NOTHING
 * published answers 「what would this command take away」: `editTaskGroup`
 * computes the same set on the far side of a write that has already happened,
 * and `applyDocumentChange` (PI-8) publishes no way to ask without landing.
 * ⚠️ What would close it is a query on PI-8 that plans a command and answers
 * what it would remove; until then this is the duplication R2.7 warns about,
 * written here because the alternative is not asking at all.
 * ⚠️ `seen` is what stops a broken `parentId` (IV-5) from looping, the same
 * guard the aggregate's own walk keeps.
 *
 * @purity pure
 */
function rowsLostWith(groups: readonly TaskGroup[], rootId: string): ReadonlySet<string> | null {
  if (!groups.some((one) => one.id === rootId)) return null
  const seen = new Set<string>([rootId])
  for (let grew = true; grew; ) {
    grew = false
    for (const one of groups) {
      if (seen.has(one.id) || one.parentId === null) continue
      if (seen.has(one.parentId)) {
        seen.add(one.id)
        grew = true
      }
    }
  }
  return seen
}

/**
 * The seeds and every WBS descendant of them -- what CD-1 of table T-050
 * reaches from each `Task`.
 *
 * ⛔ The second reading `rowsLostWith` records; the same note covers this one.
 *
 * @purity pure
 */
function tasksLostWith(tasks: readonly Task[], seeds: Iterable<number>): ReadonlySet<number> {
  const held = new Set<number>(seeds)
  for (let grew = true; grew; ) {
    grew = false
    for (const task of tasks) {
      if (task.wbsParentUid === null || held.has(task.uid)) continue
      if (held.has(task.wbsParentUid)) {
        held.add(task.uid)
        grew = true
      }
    }
  }
  return held
}

/**
 * The question FR-032 owes for one write, or null where it owes none.
 *
 * ⭐ THE TWO PLACES AND NO OTHERS. FR-032 (MUST) asks for a confirmation when a
 * ROW is deleted and when a `Task` WITH WBS DESCENDANTS is deleted, and FR-031
 * forbids adding a third place (MUST NOT) -- 「問うてよいのは、要求が確認を
 * 求めると定めた場面だけ」 is NT-7's own limit. ⛔ So the two `kind`s below are
 * the whole test: a delete of a `Task` that leads nothing is written straight
 * through, and undo is the only thing standing behind it, which is what
 * FR-031's RATIONALE intends.
 *
 * ⛔ THE SENTENCE CANNOT BE WRITTEN HERE, AND IS LEFT EMPTY. NT-7 (MUST) wants
 * what is about to happen said in words, and FR-038 (MUST) keeps every word the
 * screen prints in ONE per-language dictionary and forbids writing one anywhere
 * else (MUST NOT). That dictionary -- `display-words.json`, generated from the
 * manuscript Chapter 6.2 owns -- holds rows for NT-7's two answers and for the
 * `別の行` mark, and NO row for the question itself. ⚠️ Empty is the same answer
 * `shownOnAnotherRowMark` gives while its own row is unwritten (PD-160): a
 * missing word, not an invented one. A sentence typed here would be the second
 * dictionary FR-038 forbids.
 *
 * @purity pure
 */
function confirmationOwedBy(
  commands: readonly DocumentCommand[],
  held: Document,
): RaisedConfirmation | null {
  const schedule = held.schedule
  const lostRows = new Set<string>()
  const seeds = new Set<number>()
  let owed = false
  for (const command of commands) {
    if (command.kind === 'deleteTaskGroup') {
      const rows = rowsLostWith(schedule.taskGroups, command.groupId)
      // ⚠️ A row that is not there takes nothing with it, and CM-27 refuses the
      // command on its own account -- so there is nothing to ask about.
      if (rows === null) continue
      for (const id of rows) lostRows.add(id)
      owed = true
      continue
    }
    if (command.kind !== 'deleteTask') continue
    // FR-032 asks about a `Task` only where it LEADS something. A direct child
    // is what makes it so: descendants are reached through the same column.
    if (!schedule.tasks.some((one) => one.wbsParentUid === command.uid)) continue
    seeds.add(command.uid)
    owed = true
  }
  if (!owed) return null
  // CD-2 seeds CD-1 with every `Task` carried on any row that is going.
  for (const member of schedule.taskGroupMembers) {
    if (lostRows.has(member.groupId)) seeds.add(member.taskUid)
  }
  const lostTasks = tasksLostWith(schedule.tasks, seeds)
  const rowOfTask = new Map(schedule.taskGroupMembers.map((one) => [one.taskUid, one.groupId]))
  const items: ConfirmationItem[] = []
  for (const task of schedule.tasks) {
    if (!lostTasks.has(task.uid)) continue
    const drawnOn = rowOfTask.get(task.uid)
    items.push({
      name: task.name,
      // FR-032 (MUST): a `Task` that goes with a row but is DRAWN elsewhere is
      // shown as such, because it is not visible on the row being deleted --
      // HM-10 of table T-015a leaves the WBS children behind when a bar moves.
      // ⚠️ False where no row is going at all: 「another row」 means nothing when
      // FR-032's row half is not the one asking.
      isShownOnAnotherRow: drawnOn !== undefined && lostRows.size > 0 && !lostRows.has(drawnOn),
    })
  }
  return { manner: CONFIRMATION_MANNER, text: '', items }
}

/**
 * Whether a string is one of the two languages FR-038 admits.
 *
 * ⭐ A STORED VALUE IS UNTRUSTED INTAKE. FR-023 calls every intake untrusted,
 * and `localStorage` is shared by every local page on the machine (LM-6), so
 * what comes back is a string and nothing more until this has said otherwise.
 *
 * @purity pure
 */
function isDisplayLanguage(value: string): value is DisplayLanguage {
  return Object.prototype.hasOwnProperty.call(DISPLAY_LANGUAGES, value)
}

/**
 * DI-3 of table T-227, as `ChosenFileSaveRequest` asks for it: who owns the
 * characters already standing where a chosen write would land.
 *
 * ⭐ THE CODEC IS WIRED HERE BECAUSE ONLY THE CALLER MAY WIRE IT. FileGateway
 * (PI-22) takes this as a function and says why in as many words -- UT-5 of
 * table T-063 keeps each format in a codec of its own, and a gateway that
 * parsed `GRS JSON` would hold an authority FR-024 already owns.
 *
 * ⛔ `null` FOR EVERY WAY OF NOT KNOWING, which is the whole of DI-3 (MUST
 * NOT): characters that are not `GRS JSON` name no owner, and an unreadable
 * destination may not be called this same document. ⚠️ A destination that
 * decodes is NOT thereby accepted as intake -- nothing here is opened, and
 * FR-023's validation is not this act's.
 *
 * ⚠️ Only the two columns DI-1 compares leave this function. The document that
 * was decoded is dropped: it is somebody else's file, and nothing in this build
 * may show it or write from it.
 *
 * @purity pure
 */
function projectIdentityFromText(text: string): ProjectIdentity | null {
  const read = documentFromJson(text)
  if (!read.ok) return null
  const project = read.document.schedule.project
  return { projectName: project.name, projectId: project.id }
}

// ---- the outside is read from here on (R7.7) ------------------------------

/**
 * Today, spelled as a date column is (`textOfDay`).
 *
 * ⭐ FR-046 (MUST): 「読む人の機のローカルの暦の日とすること（MUST）。UTC の暦
 * の日を用いてはならない（MUST NOT）」. ⛔ So the day is built from the LOCAL
 * getters and never from `toISOString`, whose day is UTC's: SK-20 writes this
 * into `statusDate`, a column that carries no zone, and taking UTC would stand
 * the line a day early or a day late by exactly the offset.
 * ⚠️ The `+ 1` is the host's own numbering (`getMonth` counts from zero), not a
 * figure of the specification's.
 *
 * @purity semi-pure-b
 */
function readToday(): string {
  const now = new Date()
  const day: CalendarDay = {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
  }
  return textOfDay(day)
}

/**
 * The instant of one write, as FR-063 spells it: ISO 8601, UTC, to the second.
 *
 * ⚠️ THE WALL CLOCK, and rightly so: this is a MOMENT and not an elapsed time,
 * and R3.6 sends only elapsed time to a monotonic clock.
 * ⛔ `toISOString` carries milliseconds, which 「秒まで」 does not admit, so
 * they are cut rather than the text being assembled by hand -- nothing here can
 * then disagree with the spelling the document model already uses.
 *
 * @purity semi-pure-b
 */
function readInstantOfWrite(): string {
  return new Date().toISOString().replace(/\.\d+Z$/, 'Z')
}

/**
 * One row of table T-206's `localStorage` set, as the store has it, or null
 * where it has none and where the store cannot be reached at all.
 *
 * ⛔ EVERY READ SURVIVES A STORE THAT REFUSES. LM-14 says so in as many words:
 * a page opened over `file://` may have the store refused outright, and it is
 * for that case that FR-038 (MUST) carries a second half -- 「それを読み出せない
 * ときはブラウザの言語設定に従う」. ⚠️ A host refuses by THROWING on the
 * property itself, not by answering null, so the access is inside the guard and
 * not only the call.
 * ⚠️ NULL IS ONE ANSWER FOR TWO THINGS -- nothing stored, and no store -- and
 * that is enough: FR-038 gives both the same fallback, and no requirement tells
 * them apart.
 *
 * @purity semi-pure-b
 */
function readBrowserStored(row: BrowserStoredRow): string | null {
  try {
    return globalThis.localStorage?.getItem(BROWSER_STORED_KEY[row]) ?? null
  } catch {
    return null
  }
}

/**
 * Put one row of that set back, or let it go where the store refuses.
 *
 * ⚠️ A REFUSAL IS NOT A FAULT TO REPORT. LM-14 already places these rows outside
 * what NFR-004 counts as 「全機能が動く」 for a page opened over `file://`, so a
 * store that will not take them is a known environment and not a failure of
 * this tool. ⛔ Nothing is told: FR-076's notices have no owner in this build,
 * which `writeDocument` records for refusals that matter more than this one.
 *
 * @purity non-pure
 */
function writeBrowserStored(row: BrowserStoredRow, value: string): void {
  try {
    globalThis.localStorage?.setItem(BROWSER_STORED_KEY[row], value)
  } catch {
    // See above: the store refusing is one of LM-14's environments.
  }
}

/**
 * FR-038 (MUST): 「起動したときは前回選ばれた言語で開き、それを読み出せないとき
 * はブラウザの言語設定に従うこと」 -- both halves, in that order.
 *
 * ⭐ S-99 FIRST AND THE HOST SECOND. The stored choice is the person's own and
 * the host's setting is only what to do without one, so a store that answers
 * is never overridden by the environment.
 * ⚠️ A stored value that is neither spelling is treated as no value: FR-023
 * calls every intake untrusted, and the fallback is already the rule for having
 * nothing to read.
 * ⚠️ A host set to neither language is answered `en`: FR-038 admits exactly
 * two, so the one that is not `ja` is the only other.
 *
 * ⭐ PUBLISHED FOR THE BOOT FILE. 「起動したとき」 is table T-077's business and
 * `single-html-shell.ts` is the file that runs it, while the key and the store
 * belong with the current value this loop holds -- so the answer is computed
 * here and asked for there, rather than the keys being typed twice (R4).
 *
 * @purity semi-pure-b
 */
export function startupDisplayLanguage(): DisplayLanguage {
  const stored = readBrowserStored('S-99')
  if (stored !== null && isDisplayLanguage(stored)) return stored
  return globalThis.navigator?.language?.toLowerCase().startsWith('ja') === true ? 'ja' : 'en'
}

/**
 * ADR-001 -- the screen rectangles, the layout and the geometry are computed
 * ONCE at the head of a frame and handed out.
 *
 * ⚠️ Four paths need the layout, and MN-6 measured what happens without this:
 * table T-068's eleven stages run four times for one pointer move, which does
 * not fit the budget NFR-002 and NFR-003 set.
 *
 * ⭐ `files` IS IF-3's IMPLEMENTATION (PI-28), HANDED IN AND NOT REACHED FOR,
 * for the reason `screen` is: the loop is what holds the current values SK-11
 * writes out, and R7.3 wants the browser side injected so a test can stand in
 * for it. ⚠️ Optional on the same terms as `screen` -- the loop runs for the
 * paths that touch no file, and the entries that would touch one answer with
 * nothing when there is none.
 *
 * @purity non-pure
 */
export function frameLoop(
  surface: SvgSurface,
  first: Document,
  env: FrameEnvironment,
  screen?: ScreenWiring,
  files?: FileStore,
): FrameLoop {
  // ⭐ ONE PAIR, not a document beside a history. WS-6 of table T-067 is one
  // reference assignment (MUST), and `HeldDocument` says why: a document paired
  // with the previous history is exactly the mixture AG-4 forbids.
  // ⚠️ The history starts empty -- a document that has just been opened has
  // nothing to undo, and FR-031 counts steps from the first write.
  let held: HeldDocument = { document: first, history: emptyHistory() }
  let environment = env
  let selection: Selection = emptySelection()
  // ⭐ Held rather than rebuilt each frame so that one frame draws ONE
  // session's state. `screenStateFromInput` (PI-18) is what moves it, and FT-1
  // now reaches it.
  let screenState: ScreenState = emptyScreenState()
  let values: FrameValues | null = null
  let owed = false
  // CS-2 of table T-066 -- the press a gesture began with, kept until the
  // gesture ends, because IN-1 decides the whole gesture from it on release.
  let pressed: PointerPress | null = null
  // FR-038 (MUST): one language for the whole screen. `ScreenWiring` carries
  // what startup settled on -- S-99 if the store had it, the host otherwise --
  // and this carries what the person has chosen since.
  // ⛔ Never the document's: FR-038 keeps the choice out of it (MUST NOT).
  // ⚠️ `screen` is optional -- the loop runs without a `ScreenWiring` for the
  // paths that need no screen -- so FR-038's own rule answers when there is
  // none, rather than a second default being written here.
  let language: DisplayLanguage = screen?.language ?? startupDisplayLanguage()
  // FR-032 (MUST) -- the question NT-7 puts, and the writes it stands in front
  // of, until IC-69 or IC-70 answers it.
  //
  // ⭐ CS-4's DISCIPLINE, NOT ITS LANDING. Table T-066 wrote that row for a
  // file operation and its landing clause names `replaceDocument`, which is
  // wrong for a delete -- a delete lands through `applyDocumentChange`. What
  // carries over is the part that matters: nothing is read again while the
  // answer is awaited, so the writes below are the ones the question was asked
  // about and not a later document's.
  // ⛔ WHETHER THIS SURFACE IS A 「面」 IS NOT SETTLED. If it were, IN-4 of table
  // T-028 would spend `Esc` on it and that would be a second way to cancel
  // beside IC-70. Table T-109's 面 column does not name `Confirmation` and
  // S-99g defines a 面 as what `Esc` closes, so the specification says neither.
  // Nothing is decided here: `Esc` is left alone.
  //
  // ⭐ WHAT THE ANSWER DOES IS CARRIED WITH THE QUESTION, and is not a second
  // field the answering side has to know how to read. Two requirements raise
  // one now -- FR-032's delete and DI-4 of table T-227 -- and NT-7 gives both
  // the same two answers (IC-69 / IC-70), so `answerSettledEntry` spends the
  // entry and this settles what the entry meant. ⛔ A union of payloads would
  // put the deciding in the answering side, and FR-031 (MUST NOT) keeps the
  // places that may ask from growing: each raiser stating its own landing is
  // what makes a new one impossible to add by accident.
  let asking: {
    readonly question: RaisedConfirmation
    /** @purity non-pure */
    settle(isProceeding: boolean, frame: FrameValues): void
  } | null = null
  // OP-3 of table T-024a (MUST) -- the road back to the read that put the
  // `Open Chooser` (U-56) up, until one of IC-71 .. IC-73 answers it.
  //
  // ⛔ HELD BESIDE `asking` AND NOT INSIDE IT. NT-7 of table T-037 is a
  // two-answer manner and `ScreenSession.confirmation` carries exactly that;
  // U-56 says of itself that it is not `Confirmation` because OP-3 has three.
  // So the two cannot share a holder, and the surface is not the same surface.
  // ⚠️ WHICH IS ALSO WHY `Esc` REACHES THIS ONE AND NOT THE OTHER: this
  // question lives in `ScreenState.surface` (S-99g), and S-99g is what IN-4 of
  // table T-028 spends its first level on, whether this file wants it to or
  // not. `Confirmation` is not held there, which is the difference the note
  // beside `asking` records.
  // ⛔ NOTHING IS CHOSEN WHILE IT STANDS. OP-3 (MUST NOT) forbids GRS settling
  // the three-way question by itself, so a surface that goes away unanswered
  // abandons the open -- `null` is what the waiter is handed then, and an
  // abandoned open changes no document.
  let openChoosing: {
    /** @purity non-pure */
    settle(choice: OpenChoice | null): void
  } | null = null
  // Whether a file operation that waits for the person is running (CS-4 of
  // table T-066).
  //
  // ⭐ IT NOW ANSWERS OP-8 OF TABLE T-024a AS WELL, and the two reasons are
  // different. The shell's own: `ScreenSession.confirmation` and
  // `ScreenState.surface` each hold ONE, so a second operation that raised a
  // question would leave the first waiting on an answer nobody can give any
  // more. OP-8's (MUST NOT): while one open is running, a second one may not be
  // taken at all -- which is why the open path refuses at the entrance rather
  // than declaring the row true to `importDocument` and being refused there,
  // where nothing carries the refusal to anyone.
  // ⚠️ The store keeps a guard of its own for the first shape of reason, and
  // refuses with a fault; this one stops the operation before it can take the
  // question away.
  let isFileOperationWaiting = false
  // U-42 `Pointer` -- where one was last reported from.
  // ⛔ NEVER null again once one happening has arrived. IF-2 supplies 「ポインタ
  // とキーの出来事」 and has no happening for the pointer LEAVING the window,
  // and the note under table T-078 forbids widening that supply, so `null` here
  // means only that none has been reported yet.
  let pointerAt: { readonly x: number; readonly y: number } | null = null
  // What IF-9 answered where the pointer last was.
  // ⭐ Held because FR-048's exemption is about a CHANGE: a move that stays on
  // the same part draws the same picture, and only the previous answer can say
  // whether this one is a different one.
  let partUnderPointer: ScreenPart | null = null
  // STOP -- ⛔ NOTHING TURNS THIS ON. Table T-029a's Dual Cursor mode is
  // written by `setDualCursor` (CM-60), whose one entrance is IC-45 of table
  // T-109 -- and `input-command-translator.ts` records that IC-45 cannot be
  // written at all, because IV-13 demands both dates at once and one press
  // carries one. ⚠️ Held as a value of the loop rather than written as a
  // literal where the context is built, so that whoever closes IC-45 has the
  // one place to set it from.
  let isDualCursorMode = false
  // ⛔ Cannot change in this build, and is held for the same reason
  // `screenState` is: the only thing that moves it is `logWithMessage` (PI-33),
  // which sits behind FT-5 of table T-078 and is not wired.
  const dialogueLog: DialogueLog = emptyDialogueLog()

  /**
   * What table T-060's LY-5 lets `applyDocumentChange` replace.
   *
   * ⚠️ Two members and not four: the pair is read ONCE per write (CS-3 of table
   * T-066) and swapped as ONE reference (WS-6, MUST).
   */
  const holder: DocumentHolder = {
    /** @purity semi-pure-b */
    read(): HeldDocument {
      return held
    },
    /** @purity non-pure */
    replace(next: HeldDocument): void {
      held = next
    },
  }

  /**
   * WS-7 of table T-067 -- who is told once the swap has happened, for every
   * write this loop makes. Both roads of PI-8 take it: the command road
   * (`writeDocument`) and the whole-document road of table T-230
   * (`replaceHeldDocument`), so an undo and an ordinary edit reach the watchers
   * the same way an `Agent API` write does.
   *
   * ⭐ THE SHAPE IS PI-15's AND IS NOT INVENTED HERE. `NotifyChangeWatchers`
   * names its callers itself and states what the Framework hands over: the
   * confirmed document, the judgement that travelled with it, and the dialogue
   * log beside it -- the log because FR-066 keeps it out of the document (MUST
   * NOT) and LY-5 of table T-060 leaves current values with this layer alone.
   * ⛔ INSIDE THE LOOP, because `dialogueLog` is. A shared one at module scope
   * would have no log to hand over and no session to belong to.
   * ⛔ NOTHING IS DECIDED HERE. `hasMovedSchedule` is WS-5's judgement on the
   * command road and table T-230's equality of the two `scheduleUpdatedUtc` on
   * the replacement road; AG-6 of table T-035 requires it to be CARRIED, and
   * UT-3 of table T-063 puts the choosing in the pure half (UF-25 of table
   * T-075). This side neither derives it nor filters on it.
   * ⚠️ THE SCREEN'S OWN WRITES GO THROUGH IT TOO, and AG-6's MUST NOT about a
   * writer woken by its own write is still kept: this side signs with
   * `EDITED_BY_SCREEN`, the word table T-229 reserves at ED-1, so a subscriber
   * of that name is passed over by the selection rather than by a guard here.
   */
  const audience: ChangeAudience = {
    /** @purity non-pure */
    deliver(document: Document, hasMovedSchedule: boolean): void {
      notifyChangeWatchers({ document, hasMovedSchedule, dialogue: dialogueLog })
    },
  }

  // CA-2: invalidation happens at the head of a frame, and nothing is rebuilt
  // again for the rest of it. NFR-010 means a frame with no trigger never runs
  // at all, so there is no idle path to guard against.
  //
  // @purity non-pure
  function runFrame(): void {
    owed = false
    // CS-1 of table T-066: the frozen copy this frame is drawn from, taken
    // once at its head.
    const document = held.document
    const stored = document.documentSettings
    const environmentForRegions: ScreenEnvironment = {
      width: environment.width,
      height: environment.height,
      appHeaderHeight: environment.appHeaderHeight,
      scrollbarThickness: environment.scrollbarThickness,
    }
    // BO-1, then BO-3, then BO-4, in the order table T-077 fixes (MUST).
    const regions = regionsFromScreen(environmentForRegions, stored)
    const settings = viewSettings(document, stored, regions)
    const layout = layoutFromSchedule(document.schedule, settings, regions)
    const geometry = geometryFromLayout(document.schedule, settings, layout, regions)
    values = { regions, layout, geometry }
    surface.showSvg(
      svgFromSchedule(document.schedule, settings, layout, geometry, regions, selection),
    )
    if (screen === undefined) return
    // ⛔ AFTER the schedule, because the parts outside it are drawn OVER the
    // drawing area -- the note under table T-023a limits that table's decision
    // order to the schedule for exactly this reason.
    screen.surface.showScreenView(
      screenViewFromRegions(
        regions,
        document.schedule,
        settings,
        selection,
        screenState,
        dialogueLog,
        sessionOf(document, regions, layout, language, pointerAt, asking?.question ?? null),
      ),
    )
  }

  /** @purity non-pure */
  function ask(): void {
    if (owed) return
    owed = true
    // ⚠️ A frame is asked for, never run inline: two triggers landing in one
    // task would otherwise run table T-068 twice for one painted frame.
    const raf = globalThis.requestAnimationFrame
    if (typeof raf === 'function') raf(() => runFrame())
    else runFrame()
  }

  /**
   * BO-1 -- 「寸法が確定するまで 1 枚も描かない」. ⛔ NFR-011 makes it a MUST,
   * and a host really can hand over a 0 x 0 window: a preview pane that has
   * not been laid out yet does exactly that, and the frame drawn then is a
   * picture of nothing that the person sees before the real one.
   *
   * @purity pure
   */
  function settled(env: FrameEnvironment): boolean {
    return env.width > 0 && env.height > 0
  }

  // ---- The export's own environment ---------------------------------------

  /**
   * The scene PI-21 assembles an export from, for the base environment FR-080
   * names -- or `null` while BO-1 has settled no size to shrink from.
   *
   * ⭐ WHY IT IS A SECOND RUN OF TABLE T-068 AND NOT THE FRAME ON THE SCREEN.
   * FR-080's base environment closes two of the parts a person may have open,
   * and closing them gives their room to the schedule -- so the rectangles
   * change, and everything measured from them changes with. ⛔ Reusing the
   * frame the person is looking at would answer with a different picture from
   * the one that requirement defines, which is the very drift WY-2 and WY-3 of
   * table T-041 are there to catch.
   *
   * ⛔ NOT AT THE HEAD OF A FRAME. `runFrame` does not call this and must not:
   * MN-6 of table T-070 chose to run table T-068 once per frame and hand the
   * result round, and it chose that against NFR-002 and NFR-003. A second pass
   * on every frame is exactly the cost that decision refused. ⭐ This runs when
   * somebody asks for a picture, which is as often as an export is made.
   *
   * ⚠️ WHAT AN IF-7 IMPLEMENTOR DOES WITH IT. `AgentSnapshot.exportScene` is
   * where the answer goes, collected with the rest of the snapshot before the
   * Agent API member starts its work (R7.4, MUST). ⛔ Not handed over as
   * something for that member to call afterwards -- CS-3 of table T-066 makes
   * the whole call one consistency unit.
   *
   * @purity semi-pure-b
   */
  function exportScene(): ExportScene | null {
    if (!settled(environment)) return null
    const document = held.document
    // ⚠️ The width a closed panel takes is nothing, and taking nothing is the
    // only way PI-35 can be told a panel is not there: its rectangle is cut
    // from the stored width alone. ⛔ If the specification ever spells "closed"
    // some other way, this line is the one place that has to learn it.
    const withPanelsClosed: DocumentSettings = {
      ...document.documentSettings,
      propertyPanelWidth: 0,
    }
    const environmentForRegions: ScreenEnvironment = {
      width: environment.width,
      height: environment.height,
      appHeaderHeight: environment.appHeaderHeight,
      scrollbarThickness: environment.scrollbarThickness,
    }
    // The same three stages, in the same order table T-077 fixes for a frame.
    const regions = regionsFromScreen(environmentForRegions, withPanelsClosed)
    const settings = viewSettings(document, withPanelsClosed, regions)
    const layout = layoutFromSchedule(document.schedule, settings, regions)
    const geometry = geometryFromLayout(document.schedule, settings, layout, regions)
    // EP-12 of table T-076 keeps what is selected and what is armed out of an
    // export, and CU-3 of table T-029 has the guide cursor follow a pointer
    // that an export does not have -- so the picture is rendered with none of
    // the three rather than having them removed from a finished string.
    const nothingSelected = emptySelection()
    // S-99e says the palette shows by default; the export's environment is the
    // one where it does not. ⚠️ Started from an empty state rather than from
    // the session's, so nothing a person left open (S-99g) reaches the picture.
    const stateForExport = screenStateWithPalette(emptyScreenState(), false)
    return {
      svg: svgFromSchedule(
        document.schedule,
        settings,
        layout,
        geometry,
        regions,
        nothingSelected,
      ),
      regions,
      screenView: screenViewFromRegions(
        regions,
        document.schedule,
        settings,
        nothingSelected,
        stateForExport,
        dialogueLog,
        // ⛔ No pointer and no question: an export has no hand over it, and
        // FR-032's question stands in front of a write rather than a picture.
        sessionOf(document, regions, layout, language, null, null),
      ),
      settings,
    }
  }

  // ---- FT-1 of table T-078 ------------------------------------------------

  /**
   * CS-2 of table T-066 -- what the gesture is about, frozen at the press.
   *
   * ⭐ `on` IS HANDED IN rather than read here, which is what keeps ONE reading
   * of IF-9 per happening (R7.4): `receiveInput` asks the surface once, and both
   * this and FR-048's judgement are settled from that single answer. ⚠️ Asking
   * again here would be a second moment, and CS-2 wants the moment of the press.
   *
   * ⚠️ `semi-pure-b` AND NOT `pure`, because `pressRow` below reads the two
   * current values this loop holds (R7.1). They are read HERE rather than taken
   * as arguments so that all three members of the press are frozen at the one
   * moment CS-2 names; `collectInputContext` reads the same two right after and
   * carries the same tag for the same reason.
   *
   * @purity semi-pure-b
   */
  function collectPress(at: PointerInput, frame: FrameValues, on: ScreenPart | null): PointerPress {
    // ⭐ NO HIT WHEN THE SURFACE ANSWERED. The note under table T-023a limits
    // that table's decision order to the schedule's drawing area (MUST), and
    // the parts drawn over it hold no rectangle in `ScreenRegions` -- so a
    // press the surface claimed was not a press on the schedule at all.
    const hit = on === null ? itemAtPointer(frame.geometry, at.x, at.y, POINTER_SLOP) : null
    // ⭐ ASKED OF THE SIDE THAT OWNS TABLE T-023a, AND CARRIED FROM HERE ON.
    // `collectWriteMoment` needs to know a pan (PD-1) from a marquee (PD-5) to
    // keep AG-9's exemption, and R2.7 forbids it to read that table a second
    // time -- so the answer rides on the press, exactly as `hit` does.
    // ⚠️ NARROWED ARGUMENTS ON PURPOSE: this runs BEFORE `collectInputContext`,
    // and no whole `PointerPress` can exist until this call has answered,
    // because the row is one of the press's own members.
    const pressRow = pressRowOf({ at, hit }, { screenState, isDualCursorMode })
    return { at, hit, on, pressRow }
  }

  /**
   * Everything the three members of PI-18 read besides the happening itself.
   *
   * @purity semi-pure-b
   */
  function collectInputContext(frame: FrameValues): InputContext {
    return {
      // ADR-001's three, computed once at the head of this frame and handed
      // out rather than measured again.
      document: held.document,
      layout: frame.layout,
      geometry: frame.geometry,
      regions: frame.regions,
      screenState,
      selection,
      zoomStep: NOT_STORED_ZOOM_STEP['S-96'],
      pressed,
      // STOP -- ⛔ NO IN-PLACE ENTRY EXISTS IN THIS BUILD. IN-5a's state is
      // 「編集入力の確定前」, which only the field `editInPlace` opens can be
      // in, and that action has no owner here (`carryOutAction` records the same
      // absence). So nothing can be unsettled, and saying so is a fact rather
      // than a guess.
      isTextEntryUnsettled: false,
      isDualCursorMode,
      today: readToday(),
      // AT-51 is a UUID, and minting one is not a pure act -- which is why the
      // translator is handed the identifier instead of making it. ⚠️ One is
      // minted per context and therefore twice per happening; it is read only
      // where FR-001 has to make a row, so an unused one costs nothing.
      newGroupId: crypto.randomUUID(),
    }
  }

  /**
   * WS-2's three questions, answered from what this loop is holding at the
   * moment the write is asked for.
   *
   * ⛔ NOT A CONSTANT, AND THIS IS WHY. AG-9 of table T-035 makes refusing
   * mid-gesture a MUST, and the press that answers it is a value this loop
   * MOVES: `receiveInput` drops it on the release and on IN-1's abort, so a key
   * happening arriving mid-drag finds it still set. Frozen at false, SK-3 wrote
   * through the middle of a drag -- `commandFromInput` puts no guard of its own
   * on that row, because WS-2 is where the guard belongs.
   * ⭐ NARROWED TO WHAT AG-9 ACTUALLY ASKS. AG-9 refuses a write during a drag
   * that CHANGES THE DOCUMENT, and spares the two gestures table T-027 puts
   * outside the undo history because they change none of it -- the pan (UN-8)
   * and the range selection (UN-9). Those are rows PD-1 and PD-5 of table
   * T-023a, and the press now CARRIES which row it began (`pressRow`), so the
   * exemption is kept without reading that table a second time (R2.7).
   * ⛔ `on` IS READ FIRST, AND THE ROW ONLY WHERE IT IS NULL. The note under
   * table T-023a binds its decision order to the schedule's drawing area
   * (MUST), so a press the screen surface answered for is not one of the six
   * gestures at all -- it is a press on an entry, and `commandFromEntry` may
   * well change the document. Reading the row first would hand every palette
   * press PD-5's exemption and take AG-9's MUST off all of them.
   * ⛔ `editingInPlace` is false for the reason `isTextEntryUnsettled` is, and
   * the STOP on that member holds it: no in-place entry exists in this build,
   * so there is nothing that could be unsettled.
   * ⚠️ `deliveringNotices` is NOT this side's to answer. WS-7's own window is
   * owned by `apply-document-change.ts`, which ORs its flag with this one --
   * answering it here as well would count the same window twice.
   *
   * @purity semi-pure-b
   */
  function collectWriteMoment(): WriteMoment {
    return {
      gestureInFlight: isDocumentChangingPress(pressed),
      editingInPlace: false,
      deliveringNotices: false,
    }
  }

  /**
   * WS-6 and WS-7, through the one write path CP-8 allows. ⛔ MS-1 of table
   * T-042 forbids a second entrance -- with two, one of them ends up with
   * validation or history the other does not have.
   *
   * @purity non-pure
   */
  function writeDocument(commands: readonly DocumentCommand[], frame: FrameValues): void {
    const stored = held.document.documentSettings
    const settingsLimits: SettingsLimits = {
      zoomMin: NOT_STORED_ZOOM_BOUNDS['S-97'],
      zoomMax: NOT_STORED_ZOOM_BOUNDS['S-98'],
      // ⭐ The sum `edit-document-settings.ts` spells on this member: this
      // frame's own `Row Area` with the two panel widths added back on.
      // ⛔ NOT rebuilt from a window width -- the copy that did dropped
      // FR-052's scrollbar term, and FR-052 counts it.
      rowAreaWidthWithoutPanels:
        frame.regions.rowArea.width + stored.rowTitlePanelWidth + stored.propertyPanelWidth,
    }
    const outcome = applyDocumentChange(
      {
        commands,
        // WS-1 matches this against the stamp the document carries now. It is
        // the one just read, so it matches -- and it is passed rather than
        // skipped because AG-2 gives the `Agent API` the same gate through the
        // same argument, and one path may not have a weaker one.
        readStamp: held.document.documentStamp,
        moment: collectWriteMoment(),
        historyLimits: HISTORY_LIMITS,
        settingsLimits,
        editedBy: EDITED_BY_SCREEN,
        updatedUtc: readInstantOfWrite(),
      },
      holder,
      audience,
    )
    if (outcome.accepted) return
    // STOP -- ⛔ NOTHING CARRIES A REFUSAL TO THE PERSON. It is neither thrown
    // nor swallowed: FR-028 makes a refusal a VALUE, and `outcome.refusal`
    // names the step of table T-067 that turned the write away. Where it
    // should surface is FR-076's notices -- `ScreenSession.notices`, which has
    // no owner in this build (`sessionOf` above records the same absence).
    // ⚠️ Composing a message here would put a second reading of table T-067 on
    // the screen, so the refusal travels no further than this call today.
  }

  /**
   * One row of table T-230, taken through the same write path (`replaceDocument`
   * of PI-8) as any other write.
   *
   * ⭐ The shell names the row and brings nothing else. RD-1 and RD-2 ask
   * UndoEdit and RedoEdit at WS-3, and the history, the stamp and the undo step
   * are that road's business -- this side is left holding neither a rule of
   * table T-027 nor a stamp to mint.
   *
   * @purity non-pure
   */
  function replaceHeldDocument(call: ReplacementCall): void {
    const outcome = replaceDocument(
      {
        // WS-1 matches this against the stamp the document carries now, exactly
        // as `writeDocument` does and for the same reason: the declaration is
        // AG-2's gate, and this path may not have a weaker one than the
        // `Agent API`'s. ⛔ NOT the stamp of the document coming in -- table
        // T-230 forbids that comparison (MUST NOT) and it would refuse every
        // replacement there is.
        readStamp: held.document.documentStamp,
        moment: collectWriteMoment(),
        call,
      },
      holder,
      audience,
    )
    // FT-2 of table T-078: the current value was replaced, so a frame is owed.
    // ⚠️ `ask` coalesces with FT-1's, so the press still paints once.
    if (outcome.accepted) {
      if (settled(environment)) ask()
      return
    }
    // STOP -- ⛔ THE SAME ABSENCE `writeDocument` records: nothing carries a
    // refusal to the person, because `ScreenSession.notices` has no owner in
    // this build.
  }

  /**
   * DI-4 of table T-227 (MUST): the overwrite question, put up and waited on.
   *
   * ⭐ NT-7's TWO ANSWERS AND NOTHING ELSE: `Confirmation` (U-55 of table
   * T-103) stands on IC-69 and IC-70 and holds no third entry, which is exactly
   * what this row needs and exactly what OP-3 could not use -- OP-3's three
   * have a surface of their own now (U-56).
   *
   * ⭐ THE LIST OF WHAT WOULD GO IS EMPTY, AND THAT IS AN ANSWER. DI-4 states
   * in as many words that the duty to name what disappears is not on this row,
   * and `RaisedConfirmation.items` records the same ruling from the other side.
   *
   * ⛔ THE SENTENCE IS LEFT EMPTY for the reason `confirmationOwedBy` gives:
   * FR-038 (MUST) keeps every word the screen prints in the one generated
   * dictionary, and that dictionary holds no row for a question's own text. A
   * sentence typed here would be the second dictionary FR-038 forbids.
   *
   * ⭐ WHICH TRIGGER PAINTS IT IS FT-1 OF TABLE T-078, and that row says so
   * itself: it covers the continuation of one input across the wait CS-4 of
   * table T-066 governs, and its note leaves raising that continuation to the
   * shell. So the frame asked for below is the deferred rest of the press that
   * began the save, and NFR-010's MUST NOT is kept without a trigger of this
   * file's being minted.
   *
   * @purity non-pure
   */
  function askToWriteOverDestination(): Promise<boolean> {
    return new Promise<boolean>((answer) => {
      asking = {
        question: { manner: CONFIRMATION_MANNER, text: '', items: [] },
        /** @purity non-pure */
        settle(isProceeding) {
          answer(isProceeding)
        },
      }
      if (settled(environment)) ask()
    })
  }

  /**
   * OP-3 of table T-024a (MUST): put the three-way question up and wait for one
   * of the three to be taken.
   *
   * ⭐ THE SURFACE IS U-56 AND THE THREE ANSWERS ARE THE ROSTER'S. This side
   * names the surface and nothing else: table T-109's own surface column is
   * what places IC-71 .. IC-73 on it, `icon-roster.json` is that column
   * generated into `src/`, and UF-66 reads the placement off it -- so the three
   * entries appear without this file listing one.
   * ⛔ NO WORDS ARE WRITTEN HERE. FR-038 (MUST) keeps every word the screen
   * prints in the one generated dictionary; the heading and the three labels
   * are its rows, empty today (PD-160), and a sentence typed here would be the
   * second dictionary that requirement forbids.
   * ⚠️ S-99g HOLDS ONE SURFACE, so whatever stood open gives way to this one.
   * That is the value's own rule and not a choice made here.
   * ⭐ The frame is FT-1's continuation across the wait, the same road
   * `askToWriteOverDestination` takes.
   *
   * @purity non-pure
   */
  function askHowToOpen(): Promise<OpenChoice | null> {
    return new Promise<OpenChoice | null>((answer) => {
      openChoosing = {
        /** @purity non-pure */
        settle(choice) {
          answer(choice)
        },
      }
      screenState = screenStateWithSurface(screenState, OPEN_CHOOSER_SURFACE)
      if (settled(environment)) ask()
    })
  }

  /**
   * OP-4 of table T-024a (MUST): the confirmation owed before a replace throws
   * the current document away.
   *
   * ⭐ NT-7's MANNER, AND THE ONE THING THAT GOES IS NAMED. That row asks for
   * the names of what disappears where there is something that disappears, and
   * here there is exactly one: the document standing now. Its name is its own
   * value (AT-3) rather than a word of the screen's, which is why it can be
   * carried at all -- FR-038 leaves a document's values untranslated.
   * ⚠️ `isShownOnAnotherRow` is false because FR-032's row half is not what is
   * asking; the member says the same from `ConfirmationItem`'s side.
   * ⛔ THE SENTENCE IS LEFT EMPTY for the reason every other raiser leaves it
   * empty: the dictionary FR-038 names holds no row for a question's own text.
   * ⚠️ ASKED ABOUT THE DOCUMENT CS-4 COLLECTED, not about whatever the wait left
   * behind -- which is why the document is an argument rather than read here.
   *
   * @purity non-pure
   */
  function askToDiscardCurrentDocument(discarded: Document): Promise<boolean> {
    return new Promise<boolean>((answer) => {
      asking = {
        question: {
          manner: CONFIRMATION_MANNER,
          text: '',
          items: [{ name: discarded.schedule.project.title, isShownOnAnotherRow: false }],
        },
        /** @purity non-pure */
        settle(isProceeding) {
          answer(isProceeding)
        },
      }
      if (settled(environment)) ask()
    })
  }

  /**
   * OP-2 of table T-024a -- one file, taken along the road that table lays out:
   * OP-12 picks the decoder, OP-5 validates, OP-3 asks, OP-4 confirms a
   * replace, and table T-230 lands the answer.
   *
   * ⭐ CS-4 OF TABLE T-066 IS THE SHAPE OF THIS FUNCTION, the same shape
   * `saveHeldDocumentToFile` has: what the operation needs from the current
   * values is taken before the first `await`, and nothing after it reads `held`
   * again while the person is answering (MUST NOT). The bounds OP-5 judges
   * against and the document MSPDI borrows its presentation group from are
   * therefore the ones in force when the person asked to open, and not
   * whichever ones the two waits left behind.
   * ⛔ THE LANDING READS THE PAIR AGAIN, AND THAT IS CS-3 RATHER THAN A BREACH
   * OF CS-4: table T-230 puts `current` in `replaceDocument`'s hands, which
   * reads the holder ONCE inside the write -- a merge built on a document read
   * before the question would silently drop whatever was edited while it stood.
   *
   * ⭐ EVERY STEP THAT CANNOT GO ON RETURNS WITHOUT TOUCHING THE DOCUMENT, which
   * OP-5 requires in as many words: an input that is turned away must not have
   * been applied even in part, and the reading side is where that is cheapest to
   * keep -- nothing has been adopted until the last line.
   *
   * ⚠️ Nothing is caught. FR-028 (MUST NOT) forbids throwing, and IF-3 states
   * that a store which throws has broken its contract.
   *
   * @purity non-pure
   */
  async function openDocumentIntoHold(store: FileStore, route: OpenRoute): Promise<void> {
    // CS-4: collected at the moment the operation begins, and not read again.
    const current = held.document
    // ⛔ THE BOUNDS ARE THE ONES IN FORCE, NEVER THE ARRIVING FILE'S.
    // `ImportBounds` states the rule and the reason: OP-5 runs before OP-3, and
    // OP-6 restores an arriving presentation group only after a replace has
    // been chosen, so the settings in force are necessarily this document's --
    // and reading the input's own would let an untrusted file raise its own
    // ceiling, which empties NFR-009.
    const bounds: ImportBounds = current.documentSettings

    const opening = await openDocumentFile(store, route)
    if (!opening.ok) {
      // STOP -- ⛔ NOTHING CARRIES THE FAULT TO THE PERSON, which is the same
      // absence `saveHeldDocumentToFile` records one road over: NT-1 of table
      // T-037 (MUST) wants the item and the reason in words, and the one
      // dictionary FR-038 names holds no row for any reason
      // `DocumentFileFaultReason` gives.
      return
    }
    // STOP -- ⛔ OP-11's TELLING HAS NOWHERE TO GO. `opening.ignoredFileCount`
    // is the number that row (MUST) has said in the manner of NT-5, and
    // `ScreenSession.notices` has no owner in this build (`sessionOf` records
    // the same absence). ⚠️ The row is still KEPT in the half that matters most:
    // it forbids the act reading as refused (MUST NOT), and the first file goes
    // on being opened below.
    const file = opening.file

    // OP-12 (MUST): both the extension and the first non-blank character have
    // to name the same row of table T-024, and a file where either disagrees is
    // not read at all (MUST NOT).
    const reading = formatFromFile(file.fileName, file.text)
    if (!reading.ok) {
      // STOP -- ⛔ WHICH SIDE DISAGREED REACHES NOBODY. `reading.mismatch` is
      // carried precisely so NT-1 can say which item is wrong, and there is no
      // owner for that notice here.
      return
    }
    const incoming = decodedDocument(reading.format, file.text, current)
    if (incoming === null) return

    // OP-5 (MUST): FR-023's validation runs whatever the route, and BEFORE OP-3
    // is asked -- the row states the reason itself, that asking first would
    // have the current document thrown away for an input that is then refused.
    const verdict = validateImportedDocument(
      {
        document: incoming,
        // S-113 is stated in megabytes and measured in bytes, which is why the
        // gateway carries the file's byte length beside the decoded text.
        byteLength: file.byteLength,
        // STOP -- ⛔ NO CODEC ANSWERS THIS. `ImportCandidate.emptyRowTaskUids`
        // records that docs/spec says neither how such a row is recognised nor
        // where it is held, and PI-20 of table T-064 publishes nothing that
        // reports one -- so this build knows of none, which is a fact about the
        // build rather than a value guessed at here.
        emptyRowTaskUids: [],
      },
      bounds,
    )
    if (!verdict.ok) {
      // STOP -- ⛔ THE REFUSALS REACH NOBODY. Each one names the rule, the place
      // and whether NT-1 or NT-6 is its manner, which is exactly what a notice
      // needs -- and `ScreenSession.notices` has no owner. ⚠️ FR-023's other
      // half is missing with it: that requirement lets a person drop the rows a
      // date refusal names and take the rest, and there is no surface to offer
      // the choice on.
      return
    }

    const choice = await askHowToOpen()
    // ⛔ OP-3 (MUST NOT): nothing is chosen here. A question that went away
    // unanswered leaves the read where it was, and an abandoned open changes
    // no document -- which is the only outcome that does not decide for the
    // person.
    if (choice === null) return

    // OP-4 (MUST): the replace is the one choice that throws the current
    // document away, so it is the one choice that asks first. That row exempts
    // the other two in as many words, because neither discards anything.
    const isDiscardConfirmed =
      choice === 'replace' ? await askToDiscardCurrentDocument(current) : false
    if (choice === 'replace' && !isDiscardConfirmed) return

    // ⭐ WHAT PI-10 IS BROUGHT, minus the two fields table T-230 fills in for
    // this side: `current` is CS-3's one read, and the row fixes the choice.
    const importing = {
      incoming,
      format: reading.format,
      // OP-5 passed above, and this side never claims it did not run.
      validationPassed: true,
      // OP-8 (MUST NOT) is kept at the ENTRANCE, where a second open is refused
      // before it can begin, so by construction none is running but this one.
      // ⛔ Declaring the flag true here would refuse this very open.
      anotherOpenInProgress: false,
      unsavedEditsDiscardConfirmed: isDiscardConfirmed,
      // STOP -- ⛔ NOTHING PUTS FR-022's, MG-4's OR MG-12's QUESTION. Table
      // T-032a's four answers, the project profile's three and the presentation
      // group's three each need a surface, and table T-103 names none for any
      // of them -- table T-109 places no entry for one either. `null` is "not
      // answered", which `MergeChoices` declares as its own meaning, so a merge
      // that has candidates is refused by PI-10 rather than being decided here
      // (FR-022 MUST NOT). ⚠️ The refusal that comes back carries the
      // candidates, and it reaches nobody for the reason above.
      merge: null,
      defaultSettings: DEFAULT_DOCUMENT_SETTINGS,
      // AT-109 -- one per import, and minting one is not a pure act, which is
      // why PI-10 takes it rather than making it. ⚠️ The same member the
      // context mints `newGroupId` with, for the same reason.
      importSessionId: crypto.randomUUID(),
    }

    // RD-4 of table T-230 -- OP-3's replace. The history is dropped and the
    // stamp comes through as the file wrote it, and both are that row's to say.
    if (choice === 'replace') {
      replaceHeldDocument({ row: 'RD-4', importing: { ...importing, choice } })
      return
    }
    // RD-3 -- the merge and the overlay. It is the one row of table T-230 whose
    // stamp advances and whose WS-4 can owe a step, so it is the one row that
    // needs the two bounds and the two stamp fields.
    replaceHeldDocument({
      row: 'RD-3',
      importing: { ...importing, choice },
      historyLimits: HISTORY_LIMITS,
      editedBy: EDITED_BY_SCREEN,
      updatedUtc: readInstantOfWrite(),
    })
  }

  /**
   * SK-11 of table T-036 and IC-2 of table T-109 -- write the document that is
   * held out to a file.
   *
   * ⭐ CS-4 OF TABLE T-066 IS THE SHAPE OF THIS FUNCTION. Everything the
   * operation needs from the current values is taken before the first `await`,
   * and nothing after it reads `held` a second time (MUST NOT), so
   * what lands in the file is the document the person asked to save and not
   * whichever one the wait left behind.
   *
   * ⭐ WHICH OF THE TWO DESTINATIONS IS SETTLED BY THE STORE, NOT CHOSEN HERE.
   * FR-060 is the overwrite, and the same requirement's note on SK-11 in FR-096
   * says a document with no overwrite target is asked for a destination instead
   * -- so the state is asked for once and the road follows the answer. ⛔ This
   * is not the fallback `saveDocumentFile` refuses to make: that one would turn
   * a FAILED overwrite into a chooser, and this asks BEFORE anything starts.
   * ⚠️ `permissionLost` goes to the overwrite road on purpose -- FR-060's file
   * is still that file, and asking for the permission back is what
   * `overwriteOpenedFile` does.
   *
   * ⭐ DI-5 of table T-227 (MUST) is why only one road carries an identity: the
   * opened file is by definition this document's own, and nothing is asked.
   *
   * ⚠️ NOTHING LANDS IN THE DOCUMENT, so CS-4's landing clause has nothing to
   * do here: a save writes a file and leaves the current value alone. ⛔ Not an
   * omission -- no requirement makes SK-11 change the document it wrote.
   *
   * ⚠️ Nothing is caught. FR-028 (MUST NOT) forbids throwing and IF-3 states
   * that a store which throws has broken its contract, so a rejection here is a
   * broken store rather than a case to handle.
   *
   * @purity non-pure
   */
  async function saveHeldDocumentToFile(store: FileStore): Promise<void> {
    // CS-4: collected at the moment the operation begins, and not read again.
    const saved = held.document
    const text = jsonFromDocument(saved)
    const project = saved.schedule.project

    const openedFile = await store.readOpenedFileState()
    const saving: DocumentFileSaving =
      openedFile.kind === 'none'
        ? await saveDocumentFile(store, chosenFileSave(text, project))
        : await saveDocumentFile(store, {
            destination: 'openedFile',
            content: { text },
            form: SAVE_FORM,
          })

    if (saving.ok) return
    // STOP -- ⛔ NOTHING CARRIES THE FAULT TO THE PERSON, which is the same
    // absence `writeDocument` records one road over. NT-3a of table T-037
    // (MUST) wants the next step said in words and NT-1 forbids saying it with
    // anything but words (MUST NOT); FR-038 (MUST) keeps every such word in the
    // one generated dictionary, and it holds no row for any of the six reasons
    // `DocumentFileFaultReason` names. ⚠️ `cancelled` is owed nothing anyway --
    // IF-3 keeps it apart precisely so that it is not reported -- but the other
    // five are, and composing their sentences here would be the second
    // dictionary FR-038 forbids.
  }

  /**
   * FR-096's road: the file the person is about to point at.
   *
   * ⭐ DI-1's three columns, gathered where the document is. ⚠️ The file name is
   * `null` on this road and cannot be anything else: this road is taken only
   * when the store holds no opened file, so the document stands in no file yet.
   * By DI-2 and DI-1 that makes it match no destination, and DI-4's question is
   * therefore owed for every existing file -- which is the direction table
   * T-227 chooses throughout, an extra question against a file that cannot be
   * got back.
   *
   * @purity pure
   */
  function chosenFileSave(text: string, project: Project): ChosenFileSaveRequest {
    return {
      destination: 'chosenFile',
      content: { text },
      form: SAVE_FORM,
      suggestedFileName: suggestedFileNameOf(project),
      identity: { fileName: null, projectName: project.name, projectId: project.id },
      projectIdentityFromText,
      confirmOverwrite: askToWriteOverDestination,
    }
  }

  /**
   * What one happening was assigned to (table T-023 and table T-036, read by
   * `commandFromInput`).
   *
   * @purity non-pure
   */
  /**
   * The six entries of table T-109 this loop answers for, on the release that
   * settled on one. Returns whether the entry was spent here.
   *
   * ⭐ THE SHELL'S OWN, BECAUSE NONE OF THEM IS A `DocumentCommand`. IC-21
   * chooses the display language (S-99), IC-69 / IC-70 are NT-7's two answers,
   * and IC-71 .. IC-73 are OP-3's three; table T-108 has no row for any of the
   * six, and LY-5 of table T-060 leaves a current value with this layer.
   *
   * ⚠️ IC-69 writes what was HELD, not what the document says now: CS-4's
   * discipline is that the answer lands on the operation that was begun.
   *
   * @purity non-pure
   */
  function answerSettledEntry(entry: IconId, frame: FrameValues): boolean {
    if (entry === DISPLAY_LANGUAGE_ENTRY) {
      // FR-038 (MUST): exactly two languages, so one entry that shows the
      // current one is the whole switch (the header's half of the two entrances
      // the same requirement asks for).
      language = language === 'ja' ? 'en' : 'ja'
      writeBrowserStored('S-99', language)
      return true
    }
    if (entry === CONFIRMATION_PROCEED_ENTRY || entry === CONFIRMATION_CANCEL_ENTRY) {
      const asked = asking
      if (asked === null) return false
      // ⛔ Cleared BEFORE the answer is carried out, not after: `carryOutAction`
      // refuses to start anything while a question stands, and what follows is
      // the answer to this one rather than a new request.
      asking = null
      asked.settle(entry === CONFIRMATION_PROCEED_ENTRY, frame)
      return true
    }
    const openChoice = OPEN_CHOICE_OF_ENTRY[entry]
    if (openChoice !== undefined) {
      const choosing = openChoosing
      // ⚠️ Not spent when nothing is waiting: the three entries exist only while
      // the surface holding them is up, and a press that reached one with no
      // read behind it is a press this loop has no answer for.
      if (choosing === null) return false
      openChoosing = null
      // S-99g: the surface has answered its question, so it is no longer open.
      // ⛔ Closed HERE and not by `screenStateFromEntry`: table T-109 gives that
      // job to IC-52, and IC-52 is not placed on this surface -- so leaving it
      // to the translator would leave the surface standing over the document
      // with its question already answered.
      screenState = screenStateWithSurface(screenState, null)
      choosing.settle(openChoice)
      return true
    }
    return false
  }

  function carryOutAction(action: InputAction | null, frame: FrameValues): void {
    // MK-12: a combination this tool assigns nothing to produces nothing.
    if (action === null) return
    switch (action.kind) {
      case 'changeDocument': {
        // FR-032 (MUST): a row deletion, and a `Task` deletion that leads WBS
        // descendants, are asked about before they land. ⛔ The question is put
        // in front of the WHOLE action and not each bundle: NT-7 asks once
        // about what is going to happen, and a person answering twice for one
        // press is not what 「続けるか取りやめるかを選ばせること」 means.
        // ⚠️ While one question stands, a second write is not started -- the
        // answer would otherwise land on a document the question never saw.
        if (asking !== null) return
        const owedQuestion = confirmationOwedBy(action.writes.flat(), held.document)
        if (owedQuestion !== null) {
          const owedWrites = action.writes
          asking = {
            question: owedQuestion,
            /** @purity non-pure */
            settle(isProceeding, answeringFrame) {
              // FR-032 (MUST) -- 「取りやめる」 leaves the document untouched.
              // Nothing was written, so there is nothing to undo either.
              if (!isProceeding) return
              for (const bundle of owedWrites) writeDocument(bundle, answeringFrame)
            },
          }
          return
        }
        // ⭐ ONE PRESS MAY OWE MORE THAN ONE WRITE, AND THE ORDER IS THE
        // RULE. FR-031 (MUST) splits one fit press into two writes and forbids
        // swapping them (MUST NOT): CM-71 puts the zoom and the place and
        // pushes no step (UN-8), then CM-72 opens the collapsed rows and pushes
        // the one step UN-17 asks for.
        // ⛔ NOT FLATTENED INTO ONE CALL. WS-4 of table T-067 pushes the
        // document as it stood BEFORE the write, so a single bundle would push
        // a step carrying the OLD zoom -- and undoing it would rewind the zoom
        // that UN-8 keeps out of the history. Two calls leave the second step
        // already holding the new zoom, so undo brings the collapse back and
        // leaves the zoom where the fit put it.
        // ⛔ THIS DOES NOT WEAKEN AG-3's atomicity. Each write below is still
        // one bundle and one reference swap (WS-6, MUST); what FR-031 permits
        // is one GESTURE writing twice, not one write landing in halves.
        for (const bundle of action.writes) writeDocument(bundle, frame)
        return
      }
      // RD-1 and RD-2 of table T-230. ⭐ The shell asks neither UndoEdit nor
      // RedoEdit itself: the pair is replaced by the ONE write path, which is
      // what MS-1 of table T-042 is about.
      case 'undoEdit':
        replaceHeldDocument({ row: 'RD-1' })
        return
      case 'redoEdit':
        replaceHeldDocument({ row: 'RD-2' })
        return
      case 'copySelection':
      case 'pasteClipboard':
        // STOP -- ⛔ NO CLIPBOARD SEAM IS WIRED. SK-4 and SK-5 belong to
        // ClipboardGateway (PI-24 of table T-064), and nothing in this build
        // builds one or hands it to this loop. ⚠️ Doing nothing here is not
        // the behaviour: it is the absence of it.
        return
      case 'openDocumentFile': {
        // SK-10 of table T-036 and IC-1 of table T-109 -- OP-2's one entry,
        // which that row forbids import having a door beside (MUST NOT).
        // ⛔ NO STORE WAS HANDED IN, so there is no file to read. Doing nothing
        // then is the absence of the behaviour and not the behaviour.
        const store = files
        if (store === undefined) return
        // OP-8 (MUST NOT) and CS-4's one-at-a-time, which is the same guard the
        // save path keeps: a second read begun mid-wait would take away the one
        // question the screen can hold, and OP-8 refuses it on its own account.
        if (isFileOperationWaiting || asking !== null || openChoosing !== null) return
        isFileOperationWaiting = true
        // ⚠️ NOT AWAITED, AND NOTHING IS OWED TO THE PRESS -- the same shape the
        // save path has, and for the same reason CS-4 gives: the operation
        // spans frames, and the flag above is what keeps the next press from
        // starting a second one.
        void openDocumentIntoHold(store, OPEN_ROUTE_FROM_CHOOSER).finally(() => {
          isFileOperationWaiting = false
        })
        return
      }
      case 'saveDocumentFile': {
        // ⛔ NO STORE WAS HANDED IN, so there is nothing to write to. Doing
        // nothing then is the absence of the behaviour and not the behaviour.
        const store = files
        if (store === undefined) return
        // ⛔ ONE AT A TIME. CS-4 of table T-066 collects at the moment the
        // operation begins, and a second one begun mid-wait would take the one
        // question the screen can hold away from the first.
        if (isFileOperationWaiting || asking !== null || openChoosing !== null) return
        isFileOperationWaiting = true
        // ⚠️ NOT AWAITED, AND NOTHING IS OWED TO THE PRESS. The rest of this
        // happening is settled before the chooser has even opened -- CS-4 says
        // in as many words that the operation spans frames -- and the flag
        // above is what keeps the next press from starting a second one.
        void saveHeldDocumentToFile(store).finally(() => {
          isFileOperationWaiting = false
        })
        return
      }
      case 'settleTextEntry':
      case 'editInPlace':
        // STOP -- ⛔ NO IN-PLACE EDITOR EXISTS. SK-19, SK-9 and MK-13 open or
        // settle a field that nothing in this build draws, which is the same
        // absence `isTextEntryUnsettled` records above.
        return
      case 'openPropertiesPanel':
        // STOP -- ⛔ NOTHING HOLDS THE PANEL'S STATE. `ScreenSession`'s
        // `propertiesShowing` and `propertiesSubject` are the shell's (PD-144)
        // and `screen-renderer.ts` records that FR-072's rule -- which of the
        // two things the panel shows -- has no owner in any table.
        return
    }
  }

  /**
   * Whether this happening owes a frame.
   *
   * ⭐ FR-048 (MUST NOT): 「ポインタに追従する線が 1 本も無く、ほかに描く内容も
   * 変わらないとき、ポインタの移動で描き直してはならない」. ⛔ The judgement below is
   * written on WHAT IS DRAWN and never on whether the pointer moved, which that
   * requirement demands in as many words -- 「判定はポインタではなく描く内容に
   * 置くこと」 -- because a pan and a drag move the pointer AND change the
   * picture, and a test phrased on the pointer would forbid those too.
   * ⚠️ THE EXCEPTION IS A BARE MOVE AND NOTHING ELSE. Every other happening FT-1
   * names still owes a frame unconditionally; NFR-010 forbids widening the
   * triggers, and this narrows one rather than adding any.
   * ⚠️ NOT DRAWING IS NOT THE SAME AS NOT KNOWING: every move is still heard and
   * `pointerAt` still follows it, because FT-4's icon hint will need them.
   *
   * @purity semi-pure-b
   */
  function owesFrame(
    input: HumanInput,
    before: InputContext,
    partBefore: ScreenPart | null,
  ): boolean {
    if (input.kind !== 'pointer' || input.phase !== 'move') return true
    // 1. A gesture in flight. The drag, the pan and the marquee all draw
    //    something that follows the pointer, which is why FR-048's own ⚠️ warns
    //    against reading them as the thing it forbids.
    if (pressed !== null) return true
    // 2. Something follows the pointer. FR-048 names the whole set: the guide
    //    cursor (`S-66` of table T-202) and the side of the `Dual Cursor` that
    //    DC-1 of table T-029a has following it -- and while that mode is up,
    //    one side always is.
    if (before.document.documentSettings.guideCursorMode !== GUIDE_CURSOR_NONE) return true
    if (isDualCursorMode) return true
    // 3. What this happening actually changed, compared and not assumed.
    //    ⭐ The context IS the snapshot of what was held before the three
    //    members ran, so it is the thing they are compared against.
    if (selection !== before.selection) return true
    if (screenState !== before.screenState) return true
    if (held.document !== before.document) return true
    // 4. FR-048's ⚠️ exemption, which is not a hole in the MUST NOT but a list
    //    of things that DO change what is drawn: HF-6's row controls, FR-053's
    //    palette, FR-043's grab slop and EZ-2's icon hint all answer to the
    //    pointer. ⭐ Which part it is on may be asked only of the side that drew
    //    it (Chapter 5.3, under table T-065). ⚠️ With no `ScreenWiring` there
    //    are no parts at all, so both sides are null and this is false -- which
    //    is what makes a hover over a bare schedule draw nothing.
    return !isSameScreenPart(partUnderPointer, partBefore)
  }

  /**
   * FT-1 of table T-078 -- one happening arrived over IF-2.
   *
   * @purity non-pure
   */
  function receiveInput(input: HumanInput): void {
    const frame = values
    // ⛔ DROPPED WHILE NO FRAME HAS RUN. BO-1 has not settled the size, so
    // there is no frame of reference to read a coordinate against -- and
    // NFR-011 is what holds the first frame back until there is one.
    if (frame === null) return

    // ⭐ THE OUTSIDE IS READ ONCE, HERE, BEFORE ANYTHING IS DECIDED (R7.4). Two
    // rules want IF-9's answer for this happening -- CS-2 freezes it onto the
    // press, and FR-048 asks whether the pointer entered a different part -- and
    // a second read further down would be a second moment.
    const partBefore = partUnderPointer
    if (input.kind === 'pointer') {
      pointerAt = { x: input.x, y: input.y }
      partUnderPointer =
        screen === undefined ? null : screen.surface.readScreenPartAt(input.x, input.y)
      // ⭐ RECORDED BEFORE ANY OF THE THREE MEMBERS IS ASKED. IN-1 settles
      // nothing on the press, so the only thing `commandFromInput` answers for
      // a `down` is whether the tool took the gesture (MK-10) -- and
      // `InputContext.pressed` says in as many words that a caller which
      // leaves it null on the press leaves every entry the surface drew
      // unassigned.
      if (input.phase === 'down') pressed = collectPress(input, frame, partUnderPointer)
    }

    // ⭐ R7.4: collected first, then processed. ONE context is built and the
    // same value goes to all three members -- rebuilding it between them would
    // read the clock again (`semi-pure-b`), and the three would then be
    // answering about different moments.
    const context = collectInputContext(frame)
    selection = selectionFromInput(input, context)
    // ⚠️ SK-12 opens the `Export Chooser` (U-54) here, and nothing carries the
    // export out: ImageExporter (PI-21) is not built in this build either. The
    // surface going up is the whole of what happens.
    screenState = screenStateFromInput(input, context)
    const translated = commandFromInput(input, context)

    // IN-4 of table T-028 -- the two levels of the `Esc` ladder that are the
    // shell's, because LY-5 of table T-060 leaves it holding both of them.
    // ⛔ Read off `context`, which is the state the three members were handed:
    // the two levels above these are `screenStateFromInput`'s and it may have
    // just consumed one, so asking again off the new state would spend two
    // levels on one press.
    const escapeLevel = escapeLevelOf(input, context)
    // DC-4: `Esc` is one of the two ways out of the mode.
    if (escapeLevel === 'dualCursorMode') isDualCursorMode = false

    // ⛔ THE ORDER IS LOAD-BEARING. The press is dropped AFTER the translator
    // has read it -- a release is decided entirely from the press (CS-2) --
    // and BEFORE the write below, because WS-2 refuses a write while a gesture
    // is in flight (AG-9 of table T-035) and the gesture has in fact ended.
    // ⭐ IN-1's 「中断は `Esc` で行い」 ends one the same way. Without this the
    // press outlives the interruption, the release is still settled from it and
    // the drag is WRITTEN -- and `escapeTarget` would answer 'gesture' for ever
    // after, so IN-4a's MUST could never hand `Esc` back to the browser and
    // FR-071's way out of full screen would be unreachable.
    if (hasEndedGesture(input) || escapeLevel === 'gesture') pressed = null

    // FR-032 / FR-038 / OP-3: the six entries this loop answers for itself,
    // read off the press this release settled from (CS-2 of table T-066).
    // ⛔ BEFORE `carryOutAction`: an entry spent here is not also an edit, and
    // asking the other way round would let one press do both.
    const settled = entrySettledOnRelease(input, context)
    if (settled === null || !answerSettledEntry(settled, frame)) {
      carryOutAction(translated.action, frame)
    }

    // OP-3 (MUST NOT): the `Open Chooser` went away without one of its three
    // being taken, so the choice was never made and the read is abandoned.
    // ⛔ THIS IS THE ONLY WAY THE WAIT CAN END WITH NO ANSWER, and it exists
    // because the question stands in S-99g: that row holds one open surface and
    // IN-4 of table T-028 spends the first level of `Esc` on whatever it is
    // holding, so `screenStateFromInput` can close this one without asking.
    // ⚠️ Read AFTER the entry above, which clears both together on a real
    // answer.
    if (openChoosing !== null && screenState.surface !== OPEN_CHOOSER_SURFACE) {
      const abandoned = openChoosing
      openChoosing = null
      abandoned.settle(null)
    }

    // FT-1 owes a frame for every happening the row names, save the one FR-048
    // takes back. ⚠️ `ask` coalesces, so two triggers in one task still paint
    // once.
    if (owesFrame(input, context, partBefore)) ask()
  }

  // BO-5 -- the first frame, which table T-078's note excludes from FT-1.
  // ⚠️ Held back while BO-1 is unsettled; the first resize that settles the
  // size runs it.
  if (settled(environment)) runFrame()

  return {
    /** @purity non-pure */
    holdDocument(call: HeldDocumentCall): void {
      // ⭐ Straight onto the one road, carrying the caller's row and nothing
      // else: FT-2's frame is asked for there, along with WS-1 and WS-2.
      replaceHeldDocument(call)
    },
    /**
     * ⛔ CHANGES NOTHING, which PI-27's factory argument requires: this is
     * asked before the watcher hears the happening. ⚠️ It is therefore the
     * second build of the context for one happening -- see the note at the
     * head of this file for why the two cannot be shared.
     *
     * @purity non-pure
     */
    isBrowserDefaultStopped(input: HumanInput): boolean {
      const frame = values
      // ⛔ Nothing is this tool's before its first frame: MK-10 forbids
      // stopping the browser for a happening the tool did not assign (MUST
      // NOT), and with no frame of reference nothing can be assigned.
      if (frame === null) return false
      return commandFromInput(input, collectInputContext(frame)).isBrowserDefaultStopped
    },
    receiveInput,
    /** @purity non-pure */
    resize(next: FrameEnvironment): void {
      // ⛔ FT-3 is 「画面の寸法が変わったこと」. A resize event that carries the
      // size already in force did not change it, and NFR-010 forbids waking a
      // frame on anything table T-078 does not list (MUST NOT). ⚠️ A browser
      // fires resize for things that leave the window alone.
      const same =
        next.width === environment.width &&
        next.height === environment.height &&
        next.appHeaderHeight === environment.appHeaderHeight &&
        next.scrollbarThickness === environment.scrollbarThickness
      if (same) return
      const wasSettled = settled(environment)
      environment = next
      if (!settled(next)) return
      // The first settled size is BO-5's frame, not FT-3's: table T-077 runs
      // once, and until now it had not.
      if (!wasSettled) runFrame()
      else ask()
    },
    // ⚠️ Both read a value this loop holds and is free to replace, so neither is
    // deterministic: two calls a frame apart answer differently.
    /** @purity semi-pure-b */
    current: () => values,
    /** @purity semi-pure-b */
    document: () => held.document,
    exportScene,
  }
}
