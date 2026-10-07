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
import { iconLabel } from './tooltips'
import displayWords from './display-words.json'
import imageToJsonPrompt from './image-to-grs-json-prompt.json'

const FILE_STATUS_BY_STATE = new Map(
  displayWords.fileStatus.map((entry) => [entry.state, entry]),
)

// see BR-1
const BRANDING_LOGO = displayWords.branding.find((entry) => entry.part === 'logo')

const APP_HEADER = 'App Header'

const OPEN_DOCUMENT_ENTRY: IconId = 'IC-1'
const EXPORT_CHOOSER_ENTRY: IconId = 'IC-2'
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

interface CommandState {
  readonly isEnabled: boolean
  readonly isPressed: boolean
}

// DEVIATION: spec says an entry that can change nothing is drawn faint (FR-029); here IC-12..IC-15 never are (DFC-567)
const USABLE_AND_OFF: CommandState = { isEnabled: true, isPressed: false }

// see FR-072, T-280
/** @purity pure */
function isShowingSettings(session: ScreenSession): boolean {
  return session.screen.propertiesPanelContentState.kind === 'documentSettingsDisplayed'
}

const FILE_FLOW_ASKING_STATES: ReadonlySet<string> = new Set(['awaitingOpenChoice', 'awaitingDiscardAnswer', 'awaitingMergeMapping'])

/** @purity pure */
function isFileFlowAskingTheAuthor(session: ScreenSession): boolean {
  const flow = session.fileFlow
  return FILE_FLOW_ASKING_STATES.has(flow.fileOperationState.kind) || flow.confirmationState.kind === 'questionAsked'
}

const FLOW_SURFACE_AWAITING_STATES: ReadonlySet<string> = new Set(['awaitingOpenChoice', 'awaitingMergeMapping'])

// see FR-029, OP-8, CS-4, T-280, RS-27
/** @purity pure */
function fileEntryStateOf(icon: IconId, session: ScreenSession): CommandState | null {
  if (icon === OPEN_DOCUMENT_ENTRY) return { isEnabled: !isFileFlowAskingTheAuthor(session), isPressed: false }
  if (icon !== EXPORT_CHOOSER_ENTRY) return null
  return { isEnabled: !FLOW_SURFACE_AWAITING_STATES.has(session.fileFlow.fileOperationState.kind), isPressed: false }
}

// see FR-029, FR-039
/** @purity pure */
function displayScaleStateOf(icon: IconId, settings: DocumentSettings): CommandState | null {
  const lowest = DISPLAY_SCALE_STEPS[0]
  const highest = DISPLAY_SCALE_STEPS[DISPLAY_SCALE_STEPS.length - 1]
  const end = icon === DISPLAY_SCALE_DOWN_ENTRY ? lowest : icon === DISPLAY_SCALE_UP_ENTRY ? highest : null
  return end === null ? null : { isEnabled: settings.displayScale !== end, isPressed: false }
}

// see FR-066, T-280
/** @purity pure */
function isDialogueFieldShown(session: ScreenSession): boolean {
  return session.screen.dialogueFieldDisplayState.kind === 'shown'
}

// see FR-029, T-109, OP-8, CS-4
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
  const scaleOrFileState = displayScaleStateOf(icon, settings) ?? fileEntryStateOf(icon, session)
  if (scaleOrFileState !== null) return scaleOrFileState
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
    label: iconLabel(icon, displayLanguageOf(session)),
  }
}

// see T-109, BR-5
/** @purity pure */
function inGroupBlocks<Row extends { readonly group: string | null }>(rows: readonly Row[]): readonly Row[] {
  // WHY: a row with no group is a block of its own, so it keeps its place.
  const blocks = new Map<string | Row, Row[]>()
  for (const row of rows) {
    const key = row.group ?? row
    const block = blocks.get(key)
    if (block === undefined) blocks.set(key, [row])
    else block.push(row)
  }
  return [...blocks.values()].flat()
}

/** @purity pure */
function headerCommands(
  settings: DocumentSettings,
  session: ScreenSession,
  readings: ScreenViewReadings,
): readonly CommandItem[] {
  return inGroupBlocks(iconRoster.icons.filter((row) => row.surfaces.includes(APP_HEADER)))
    .map((row) => commandItemFor(row.rowId, settings, session, readings))
}

const DIVIDER_SIDES = 2

export interface BrandingPlace {
  readonly brandingSeatPx: number
  readonly documentTitleLeftPx: number
}

// see BR-2, BR-7, EP-1, FR-051
/** @purity pure */
export function brandingPlaceOf(): BrandingPlace {
  const chrome = NOT_STORED_CHROME_SCALE['S-235']
  const brandingSeatPx = NOT_STORED_DOCUMENT_TITLE_SIZES['S-490'] * NOT_STORED_DOCUMENT_TITLE_SIZES['S-462'] * chrome
  const insetsPx = (1 + DIVIDER_SIDES) * NOT_STORED_DOCUMENT_TITLE_SIZES['S-226'] * chrome
  return { brandingSeatPx, documentTitleLeftPx: insetsPx + brandingSeatPx + NOT_STORED_DOCUMENT_TITLE_SIZES['S-492'] }
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
    ...brandingPlaceOf(),
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
//   docs/spec/_source/settings.json (tables T-202 and T-206)
// Rebuild: npm run gen   ||   npm run gen:check fails on drift.
// see T-206
const NOT_STORED_DOCUMENT_TITLE_SIZES: {
  readonly 'S-225': number
  readonly 'S-226': number
  readonly 'S-461': number
  readonly 'S-462': number
  readonly 'S-463': number
  readonly 'S-490': number
  readonly 'S-491': number
  readonly 'S-492': number
} = {
  'S-225': 20,
  'S-226': 12,
  'S-461': 0.05,
  'S-462': 1.92,
  'S-463': 700,
  'S-490': 16.5,
  'S-491': 18,
  'S-492': 1,
}

// see T-206
const NOT_STORED_CHROME_SCALE: {
  readonly 'S-235': number
} = {
  'S-235': 0.6667,
}

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
