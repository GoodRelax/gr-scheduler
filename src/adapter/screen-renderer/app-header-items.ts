// Fills the App Header's entries: whether each can be used and whether it is on.
// @unit      UF-62   (docs/spec/05-07-design.md, table T-075)
// @component ScreenRenderer, layer Adapter (table T-062)
// @purity    pure
// Generated region at the end: docs/spec/_assets/tbl-glossary.md (table T-109). Do not edit by hand; npm run gen.

import {
  DISPLAY_SCALE_STEPS,
  type DocumentSettings,
} from '../../entity/document-model/document-settings/document-settings'
import type { Schedule } from '../../entity/document-model/schedule/schedule'
import type { ScreenSession } from '../../use-case/advance-screen-session/advance-screen-session'
import type {
  AppHeaderItems,
  CommandItem,
  DisplayLanguage,
  IconId,
  ScreenViewReadings,
} from './screen-renderer'
import { displayLanguageOf } from './screen-renderer'
import iconRoster from './icon-roster.json'
import displayWords from './display-words.json'
import imageToJsonPrompt from './image-to-grs-json-prompt.json'

const FILE_STATUS_BY_STATE = new Map(
  displayWords.fileStatus.map((entry) => [entry.state, entry]),
)

// see BR-1
const BRANDING_LOGO = displayWords.branding.find((entry) => entry.part === 'logo')

const APP_HEADER = 'App Header'

const COMMAND_PALETTE_ENTRY: IconId = 'IC-7'
const UNDO_ENTRY: IconId = 'IC-5'
const REDO_ENTRY: IconId = 'IC-6'
const FULL_SCREEN_ENTRY: IconId = 'IC-11'
const DISPLAY_SCALE_DOWN_ENTRY: IconId = 'IC-104'
const DISPLAY_SCALE_UP_ENTRY: IconId = 'IC-105'
const DOCUMENT_SETTINGS_ENTRY: IconId = 'IC-17'
const DIALOGUE_FIELD_ENTRY: IconId = 'IC-18'
const AGENT_API_ENTRY: IconId = 'IC-20'
const DELAY_DIAGNOSTICS_ENTRY: IconId = 'IC-107'

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

// DEVIATION: spec says an entry that can change nothing is drawn faint (FR-029); here IC-1, IC-2, IC-12..IC-15 never are (DFC-567)
const USABLE_AND_OFF: CommandState = { isEnabled: true, isPressed: false }

// see FR-072, T-280
/** @purity pure */
function isShowingSettings(session: ScreenSession): boolean {
  return session.screen.propertiesPanelContentState.kind === 'documentSettingsDisplayed'
}

// see FR-066, T-280
/** @purity pure */
function isDialogueFieldShown(session: ScreenSession): boolean {
  return session.screen.dialogueFieldDisplayState.kind === 'shown'
}

// see FR-029, T-109
/** @purity pure */
function commandStateOf(
  icon: IconId,
  settings: DocumentSettings,
  session: ScreenSession,
  readings: ScreenViewReadings,
): CommandState {
  if (Object.prototype.hasOwnProperty.call(VISIBLE_ELEMENT_BY_ENTRY, icon)) {
    const key = VISIBLE_ELEMENT_BY_ENTRY[icon]
    if (key !== undefined) return { isEnabled: true, isPressed: settings[key] }
  }
  switch (icon) {
    case COMMAND_PALETTE_ENTRY:
      return { isEnabled: true, isPressed: session.screen.paletteDisplayState.kind === 'shown' }

    case UNDO_ENTRY:
      // WHY: !== false, not === true, so an absent answer leaves the entry usable.
      return { isEnabled: readings.canUndo !== false, isPressed: false }

    case REDO_ENTRY:
      return { isEnabled: readings.canRedo !== false, isPressed: false }

    case FULL_SCREEN_ENTRY:
      return { isEnabled: true, isPressed: session.screen.fullScreenModeState.kind === 'full' }

    // see FR-029, FR-039
    case DISPLAY_SCALE_DOWN_ENTRY:
      return { isEnabled: settings.displayScale !== DISPLAY_SCALE_STEPS[0], isPressed: false }

    case DISPLAY_SCALE_UP_ENTRY:
      return {
        isEnabled:
          settings.displayScale !== DISPLAY_SCALE_STEPS[DISPLAY_SCALE_STEPS.length - 1],
        isPressed: false,
      }

    case DOCUMENT_SETTINGS_ENTRY:
      return { isEnabled: true, isPressed: isShowingSettings(session) }

    // WHY: never faint; a press while Agent API is off enables it and shows the field (FR-066).
    case DIALOGUE_FIELD_ENTRY:
      return {
        isEnabled: true,
        isPressed: readings.isAgentApiEnabled && isDialogueFieldShown(session),
      }

    case AGENT_API_ENTRY:
      return { isEnabled: true, isPressed: readings.isAgentApiEnabled }

    case DELAY_DIAGNOSTICS_ENTRY:
      return { isEnabled: true, isPressed: readings.isDelayDiagnosticsShown === true }

    default:
      return USABLE_AND_OFF
  }
}

/** @purity pure */
function commandItemFor(
  icon: IconId,
  settings: DocumentSettings,
  session: ScreenSession,
  readings: ScreenViewReadings,
): CommandItem {
  const commandState = commandStateOf(icon, settings, session, readings)
  return {
    icon,
    isEnabled: commandState.isEnabled,
    isPressed: commandState.isPressed,
    isArmed: false,
    isChosen: false,
    label: entryLabel(icon, displayLanguageOf(session)),
  }
}

/** @purity pure */
function headerCommands(
  settings: DocumentSettings,
  session: ScreenSession,
  readings: ScreenViewReadings,
): readonly CommandItem[] {
  return iconRoster.icons
    .filter((row) => row.surfaces.includes(APP_HEADER))
    .map((row) => commandItemFor(row.rowId, settings, session, readings))
}

// see U-31, FR-101, FR-038
/** @purity pure */
export function appHeaderItemsFromDocument(
  schedule: Schedule,
  settings: DocumentSettings,
  session: ScreenSession,
  readings: ScreenViewReadings,
): AppHeaderItems {
  return {
    brandingText: BRANDING_LOGO?.text[displayLanguageOf(session)] ?? NO_WORDS,
    documentTitle: schedule.project.title,

    openedFileName: readings.openedFileName,
    fileSavedAt: readings.fileSavedAt,
    fileSavedByteLength: readings.fileSavedByteLength,
    fileNeverSavedText:
      FILE_STATUS_BY_STATE.get('neverSaved')?.text[displayLanguageOf(session)] ?? '',

    commands: headerCommands(settings, session, readings),

    language: displayLanguageOf(session),
  }
}

const SCALE_ECHO_BY_END = new Map(displayWords.scaleEcho.map((entry) => [entry.end, entry]))

const PERCENT_SIGN = '%'

// see FR-039, SE-2, FR-038
// WHY: the number and the percent sign are no words (CR-411 decision 4); only the end word
// comes from the dictionary.
/** @purity pure */
export function displayScaleMessageText(
  displayScale: number,
  end: 'max' | 'min' | null,
  language: DisplayLanguage,
): string {
  const word = end === null ? '' : (SCALE_ECHO_BY_END.get(end)?.text[language] ?? '')
  return `${displayScale}${PERCENT_SIGN}${word}`
}

const JSON_FENCE_OPEN = '```json\n'

const JSON_FENCE_CLOSE = '\n```'

// see FR-068, FR-027, FR-038
/** @purity pure */
export function imageToJsonPromptText(language: DisplayLanguage, schemaVersion: string): string {
  const versionLine = `schemaVersion: ${schemaVersion}`
  const schema = JSON_FENCE_OPEN + imageToJsonPrompt.schema + JSON_FENCE_CLOSE
  const emptyDocument = JSON_FENCE_OPEN + imageToJsonPrompt.emptyDocument + JSON_FENCE_CLOSE
  return [imageToJsonPrompt[language], versionLine, schema, emptyDocument].join('\n\n') + '\n'
}

// <generated -- do not edit by hand>
// Single source of truth:
//   docs/spec/_assets/tbl-glossary.md (table T-109)
//   docs/spec/_source/settings.json (table T-202)
// Rebuild: npm run gen   ||   npm run gen:check fails on drift.
// see T-109, FR-049
const VISIBLE_ELEMENT_BY_ENTRY: Readonly<Record<string, 'baselineVisible' | 'planVisible' | 'actualVisible' | 'progressLineVisible' | 'progressMarkerVisible' | 'dateGridLinesVisible' | 'groupGridLinesVisible' | 'assigneeVisible' | 'percentCompleteVisible' | 'dependencyVisible' | 'planDatesVisible'>> = {
  'IC-4': 'baselineVisible',
  'IC-8': 'planVisible',
  'IC-9': 'actualVisible',
  'IC-39': 'progressLineVisible',
  'IC-40': 'progressMarkerVisible',
  'IC-42': 'dateGridLinesVisible',
  'IC-43': 'groupGridLinesVisible',
  'IC-79': 'assigneeVisible',
  'IC-80': 'percentCompleteVisible',
  'IC-81': 'dependencyVisible',
  'IC-103': 'planDatesVisible',
}
// </generated>
