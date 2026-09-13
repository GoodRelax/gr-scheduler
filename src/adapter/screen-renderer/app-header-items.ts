// Fills the App Header's entries: whether each can be used and whether it is on.
// @unit      UF-62   (docs/spec/05-07-design.md, table T-075)
// @component ScreenRenderer, layer Adapter (table T-062)
// @purity    pure

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

const FILE_STATUS_BY_STATE = new Map(
  displayWords.fileStatus.map((entry) => [entry.state, entry]),
)

const APP_HEADER = 'App Header'

const COMMAND_PALETTE_ENTRY: IconId = 'IC-7'
const BASELINE_OVERLAY_ENTRY: IconId = 'IC-4'
const UNDO_ENTRY: IconId = 'IC-5'
const REDO_ENTRY: IconId = 'IC-6'
const PLAN_DISPLAY_ENTRY: IconId = 'IC-8'
const ACTUAL_DISPLAY_ENTRY: IconId = 'IC-9'
const FULL_SCREEN_ENTRY: IconId = 'IC-11'
const DOCUMENT_SETTINGS_ENTRY: IconId = 'IC-17'
const DIALOGUE_FIELD_ENTRY: IconId = 'IC-18'
const AGENT_API_ENTRY: IconId = 'IC-20'

const NO_WORDS = ''

const WORDS_BY_ROW = new Map(displayWords.icons.map((entry) => [entry.rowId, entry]))

/** @purity pure */
function entryLabel(icon: IconId, language: DisplayLanguage): string {
  const word = WORDS_BY_ROW.get(icon)?.label[language]
  if (word === undefined) return NO_WORDS
  return word === '' ? NO_WORDS : word
}

interface CommandState {
  readonly isEnabled: boolean
  readonly isPressed: boolean
}

const USABLE_AND_OFF: CommandState = { isEnabled: true, isPressed: false }

// see FR-029, T-109
/** @purity pure */
function commandStateOf(
  icon: IconId,
  settings: DocumentSettings,
  state: ScreenState,
  session: ScreenSession,
): CommandState {
  switch (icon) {
    case COMMAND_PALETTE_ENTRY:
      return { isEnabled: true, isPressed: state.paletteShown }

    case BASELINE_OVERLAY_ENTRY:
      return { isEnabled: true, isPressed: settings.baselineVisible }

    case UNDO_ENTRY:
      // WHY: !== false, not === true, so an absent answer leaves the entry usable.
      return { isEnabled: session.canUndo !== false, isPressed: false }

    case REDO_ENTRY:
      return { isEnabled: session.canRedo !== false, isPressed: false }

    case PLAN_DISPLAY_ENTRY:
      return { isEnabled: true, isPressed: settings.planVisible }

    case ACTUAL_DISPLAY_ENTRY:
      return { isEnabled: true, isPressed: settings.actualVisible }

    case FULL_SCREEN_ENTRY:
      return { isEnabled: true, isPressed: state.fullScreen }

    case DOCUMENT_SETTINGS_ENTRY:
      return { isEnabled: true, isPressed: session.propertiesShowing === 'documentSettings' }

    case DIALOGUE_FIELD_ENTRY:
      return {
        isEnabled: session.isAgentApiEnabled,
        isPressed: session.isAgentApiEnabled && session.isDialogueFieldVisible,
      }

    case AGENT_API_ENTRY:
      return { isEnabled: true, isPressed: session.isAgentApiEnabled }

    default:
      return USABLE_AND_OFF
  }
}

/** @purity pure */
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
    isArmed: false,
    label: entryLabel(icon, session.language),
  }
}

/** @purity pure */
function headerCommands(
  settings: DocumentSettings,
  state: ScreenState,
  session: ScreenSession,
): readonly CommandItem[] {
  return iconRoster.icons
    .filter((row) => row.surfaces.includes(APP_HEADER))
    .map((row) => commandItemFor(row.rowId, settings, state, session))
}

// see U-31, FR-101, FR-038
/** @purity pure */
export function appHeaderItemsFromDocument(
  schedule: Schedule,
  settings: DocumentSettings,
  state: ScreenState,
  session: ScreenSession,
): AppHeaderItems {
  return {
    documentTitle: schedule.project.title,

    openedFileName: session.openedFileName,
    fileSavedAt: session.fileSavedAt,
    fileNeverSavedText:
      FILE_STATUS_BY_STATE.get('neverSaved')?.text[session.language] ?? '',

    commands: headerCommands(settings, state, session),

    language: session.language,
  }
}
