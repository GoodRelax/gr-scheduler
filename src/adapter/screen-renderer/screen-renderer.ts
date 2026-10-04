// ScreenRenderer: describes the UI parts outside the schedule for the screen surface.
// @unit      UF-60   (docs/spec/05-07-design.md, table T-075)
// @component ScreenRenderer, layer Adapter (table T-062)
// @purity    pure
// @publishes table T-064 row PI-37

import displayWords from './display-words.json'
import type { DialogueLog, DialogueMessage } from '../../entity/document-model/dialogue-log/dialogue-log'
import type { DocumentSettings } from '../../entity/document-model/document-settings/document-settings'
import type { DelayDiagnosticsReport, Exception, Schedule, WeekDay } from '../../entity/document-model/schedule/schedule'
import type { Selection } from '../../entity/document-model/selection/selection'
import type {
  ScreenRect,
  ScreenRegions,
} from '../../entity/layout-engine/screen-regions/screen-regions'
import type { RowPlacement } from '../../entity/layout-engine/schedule-layout/schedule-layout'
import type { SettledUtterance } from '../../use-case/post-dialogue-message/post-dialogue-message'
import {
  emptySearchPanelSession,
  type ScreenSession,
  type SearchPanelSession,
} from '../../use-case/advance-screen-session/advance-screen-session'
import { appHeaderItemsFromDocument, displayScaleMessageText } from './app-header-items'
import { commandPaletteFromSession } from './command-palette'
import { dialogueFieldFromLog } from './dialogue-field'
import { confirmationFromSession, dismissKeyOf, noticesFromSession } from './notices'

// TRAP: the shell must use this key, not rebuild it, or the two spellings drift apart.
export { dismissKeyOf }

// see HF-14
// WHY: the en cell, not the display language; the row label is document data (FR-038).
const DEFAULT_ROW_NAME_ENTRY = displayWords.defaultNames.find((one) => one.use === 'row')
export const DEFAULT_ROW_NAME: string =
  DEFAULT_ROW_NAME_ENTRY === undefined ? '' : DEFAULT_ROW_NAME_ENTRY.text.en
import { helpModalFromSession, openModalFromSession } from './open-modals'
import { propertiesPanelFromSelection } from './properties-panel'
import { rowTitlePanelFromSchedule, rowTitleFontPxOf } from './row-title-panel'
import { searchPanelFromSession, type SearchPanelView } from './search-panel'
import {
  delayDiagnosticsReportFromWindow,
  type DelayDiagnosticsReportView,
  type DelayDiagnosticsReportWindow,
} from './delay-diagnostics-report'
import { DEFAULT_WINDOW_PLACE, type WindowPlace, type WindowShown } from './window-box'
export {
  nextSearchPanelTextSizeStep,
  searchPanelAfterFilterChange,
  searchPanelAfterFilterEntry,
  searchPanelFromSession,
  searchPanelWithColumnWidth,
  searchPanelWithFilterClosed,
  searchPanelWithFilterOpened,
} from './search-panel'
export { DEFAULT_WINDOW_PLACE, windowBoxAfterGrab, windowBoxOf, windowEdgeAt, windowNormalBoxOf, windowPlaceOf } from './window-box'
export type { WindowPlace, WindowShown } from './window-box'
export { imageToJsonPromptText } from './app-header-items'
export { exportFileNameOf } from './open-modals'
export type { SearchFilterChange, SearchPanelShown, SearchPanelView } from './search-panel'
export { MARK_COLOUR_ROWS, isFilterValueListed, markColourVariableOf, statusGlyphSvg } from './table-window'
export type { MarkGlyph } from './table-window'
export {
  OPENED_DELAY_DIAGNOSTICS_REPORT,
  delayDiagnosticsReportAfterEntry,
  delayDiagnosticsReportAfterFilterChange,
  delayDiagnosticsReportFileNameOf,
  delayDiagnosticsReportMarkdownOf,
  delayDiagnosticsReportWithColumnWidth,
  delayDiagnosticsReportWithFilterClosed,
} from './delay-diagnostics-report'
export type { DelayDiagnosticsReportView, DelayDiagnosticsReportWindow } from './delay-diagnostics-report'

export { rowTitleFontPxOf }
import { screenFrameFromRegions } from './screen-frame'
export { horizontalWholeOf, scrollExtentOf, verticalWholeOf } from './screen-frame'
export type { HorizontalWhole, VerticalWhole } from './screen-frame'
export { achromatic } from '../svg-renderer/svg-renderer'
import type { DialogueInput } from './screen-surface'
import { dualCursorReadoutOf, guideCursorLabelOf, tooltipsFromScreenView } from './tooltips'

export type { DialogueInput, FieldCommit, FieldEditNotice, ScreenPart, ScreenSurface } from './screen-surface'
export type { WindowName } from '../../use-case/advance-screen-session/advance-screen-session'

export type IconId = string

export type ExportFormatId = string

export type DisplayLanguage = 'ja' | 'en'

export interface CommandItem {
  readonly icon: IconId
  readonly isEnabled: boolean
  readonly isPressed: boolean
  // WHY: not isPressed, which writes aria-pressed and would announce an arm as a pressed button.
  readonly isArmed: boolean
  // WHY: not isPressed: a chosen exclusive entry is EN-6 of T-237, not a toggle that is on (EN-2).
  readonly isChosen: boolean
  readonly label: string
}

export interface ScreenFrame {
  readonly isFullScreen: boolean
  readonly dividers: readonly PanelDivider[]
  readonly scrollbars: readonly Scrollbar[]
}

export interface PanelDivider {
  readonly panel: 'rowTitlePanel' | 'propertiesPanel'
  readonly band: ScreenRect
  readonly line: ScreenRect
}

export interface Scrollbar {
  readonly axis: 'horizontal' | 'vertical'
  readonly track: ScreenRect
  readonly thumb: ScreenRect
}

export interface ScrollExtent {
  readonly contentWidth: number
  readonly contentHeight: number
  readonly visibleHeight: number
  readonly offsetX?: number
  readonly offsetY?: number
}

export interface AppHeaderItems {
  readonly brandingText?: string
  readonly documentTitle: string | null
  readonly openedFileName: string | null
  readonly fileSavedAt: string | null
  readonly fileSavedByteLength: number | null
  readonly fileNeverSavedText: string
  readonly commands: readonly CommandItem[]
  readonly language: DisplayLanguage
}

export interface RowTitlePanel {
  readonly pinnedTitles: readonly RowTitle[]
  readonly titles: readonly RowTitle[]
  // TRAP: optional so literals compile; a builder that forgets it leaves the entrance drawn usable, silently.
  readonly canOpenEveryRow?: boolean
  readonly canCloseEveryRow?: boolean
  readonly canOpenLevelZero?: boolean
  readonly foldedRowCount?: number
  readonly groupGridLines?: readonly ScreenRect[]
}

export interface RowTitle {
  readonly groupId: string
  readonly depth: number
  readonly box: ScreenRect
  readonly indentPx: number
  readonly fontPx: number
  readonly label: string | null
  readonly wholeLabel: string | null
  readonly isLabelTruncated: boolean
  readonly expander: RowExpander
  readonly canOpenOneLevel?: boolean
  readonly canAddChildRow?: boolean
  readonly foldedRowCount?: number
  readonly heldOnAxis?: 'position' | 'depth' | null
  readonly isPinned: boolean
  readonly isSelected: boolean
}

export interface RowExpander {
  readonly canOpen: boolean
  readonly canClose: boolean
  readonly canCloseBelow: boolean
}

export interface PropertiesPanel {
  readonly showing: 'selection' | 'documentSettings'
  readonly isSubjectGone: boolean
  readonly fields: readonly PropertyField[]
  readonly commands: readonly CommandItem[]
  readonly headEntry?: CommandItem
}

export interface PropertyField {
  readonly row: string
  readonly name: string
  readonly text: string
  readonly isEditable: boolean
  readonly controls: readonly PropertyControl[]
  readonly unit?: string
  readonly readout?: string
  readonly isNameAbove?: true
}

export type PropertyControlKind =
  | 'text'
  | 'multiline'
  | 'date'
  | 'number'
  | 'boolean'
  | 'choice'
  | 'color'

// see CV-9, CV-7
export interface ColourSide {
  readonly word: string
  readonly paint: string
  readonly note: string
  // WHY: paint is greyed while monochrome is on, but the side's value still names the chosen colour.
  // Optional, so a description written before it still draws; absent, the value is read from paint.
  readonly value?: string
  readonly mark?: string
}

// see CV-9
// WHY: swatches run beside choiceValues; the custom entrance commits one #rrggbb (CV-4).
export interface ColourField {
  readonly swatches: readonly string[]
  readonly inks: readonly string[]
  readonly customWord: string
  readonly customValue: string
  readonly light: ColourSide
  readonly dark: ColourSide
  // WHY: optional, so a description written before it still draws; absent, only the offered names show.
  readonly names?: readonly ColourName[]
  // see CV-9, CV-5, FR-007
  // WHY: optional for the same reason; the entrance back to the theme is drawn either way.
  readonly theme?: ColourThemeEntry
  readonly transparentWord?: string
}

// see CV-9, CV-5
export interface ColourThemeEntry {
  readonly word: string
  readonly hint: string
  readonly paint?: string
}

// see AS-5, AS-6, IC-123, IC-124
export interface AssigneeCombo {
  readonly people: readonly { readonly name: string; readonly uid: number; readonly word: string }[]
  readonly addWord: string
  readonly sortEntries: readonly CommandItem[]
  readonly candidatesOf: (typed: string, isDescending: boolean) => readonly AssigneeCandidate[]
}

// see AS-5, AS-7
export interface AssigneeCandidate {
  readonly pick: 'candidate' | 'add'
  readonly value: string
  readonly word: string
}

// see CV-9, T-294
export interface ColourName {
  readonly name: string
  readonly isOffered: boolean
}

export interface PropertyControl {
  readonly key: PropertyFieldKey
  readonly kind: PropertyControlKind
  readonly text: string
  readonly choices: readonly string[] | null
  readonly choiceValues?: readonly string[]
  readonly colour?: ColourField
  // WHY: bare swatches beside choiceValues; ColourField brings entrances FR-041's hue field must not have.
  readonly swatches?: readonly string[]
  readonly assignee?: AssigneeCombo
  readonly min: number | null
  readonly max: number | null
  readonly widthInFontSizes: number
  readonly isFocusTarget?: true
  readonly placeholder?: string
}

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
      readonly holder: 'dependency'
      readonly successorUid: number
      readonly ordinal: number
      readonly column: keyof Schedule['tasks'][number]['dependencies'][number] & string
    }
  | {
      readonly holder: 'project'
      readonly column: keyof Schedule['project'] & string
    }
  | {
      readonly holder: 'commentBox'
      readonly id: string
      readonly column: keyof Schedule['commentBoxes'][number] & string
    }
  | {
      readonly holder: 'highlightBox'
      readonly id: string
      readonly column: keyof Schedule['highlightBoxes'][number] & string
    }
  | {
      readonly holder: 'assignment'
      readonly taskUid: number
      readonly resourceUid: number | null
      readonly column: 'resourceUid'
    }

export interface CommandPalette {
  readonly at: { readonly x: number; readonly y: number }
  // TRAP: the surface must draw the band inside the palette part, or the palette fades while grabbed.
  readonly grabBandHeight: number
  readonly minimise: CommandItem
  readonly isMinimised: boolean
  readonly groups: readonly PaletteGroup[]
  readonly armedText: string | null
}

export interface PaletteGroup {
  readonly name: string
  readonly commands: readonly CommandItem[]
}

interface OpenSurface {
  readonly heading: string
  readonly commands: readonly CommandItem[]
}

export interface HelpModal extends OpenSurface {
  readonly surface: 'Help Modal'
  readonly entries: readonly HelpEntry[]
  readonly legend: IconId
  readonly helpLanguage: DisplayLanguage
  readonly windowState: 'normal' | 'minimised' | 'maximised'
  readonly licenceText: string
  readonly copyrightNotice: string
  readonly attributions: readonly string[]
  readonly footnotes: readonly HelpFootnote[]
  readonly helpLegal: { readonly licensedUnder: string; readonly fullText: string }
  readonly area: HelpWindowArea
  readonly place?: WindowPlace
}

// see WB-1, WB-3, FR-036
export interface HelpWindowArea {
  readonly belowAppHeader: ScreenRect
  readonly browserWindow: ScreenRect
}

// see OP-16, IC-71, IC-72, IC-73
export interface OpenChoiceLine {
  readonly entry: CommandItem
  readonly hint: string
}

// see OP-16, U-56
export interface OpenChooser extends OpenSurface {
  readonly surface: 'Open Chooser'
  readonly incomingFile: { readonly fileName: string | null; readonly byteLength: number; readonly documentTitle: string } | null
  readonly choices: readonly OpenChoiceLine[]
  readonly fileWord: string
  readonly documentTitleWord: string
  readonly cancelWord: string
}

// see FR-036, FR-069
// WHY: note *1 stands below the columns, above the licence line (CR-665), so it names no column.
export type HelpFootnote = LinkedWords

export interface HelpEntry {
  readonly table: string
  readonly row: string
  readonly text: string
  readonly press: string | null
  readonly keys: string | null
  readonly icon: IconId | null
  readonly kind: string
  // see T-256
  readonly column: string
  readonly block: string
  readonly segment: string | null
  readonly glyphs: readonly IconId[]
}

export interface ResourceRoster extends OpenSurface {
  readonly surface: 'Resource Roster'
  readonly resources: readonly RosterResource[]
}

export interface RosterResource {
  readonly uid: number
  readonly name: string | null
  readonly isReferenced: boolean
  readonly isSelected: boolean
  readonly unassignedTaskNames: readonly (string | null)[]
}

export interface ExportFormatChoice {
  readonly row: ExportFormatId
  readonly name: string
  readonly extension: string
}

export interface ExportChooser extends OpenSurface {
  readonly surface: 'Export Chooser'
  readonly formats: readonly ExportFormatChoice[]
}

// STOP: spec does not decide what each open surface carries, nor two of their names. Looked in T-103, FR-074, FR-088
// @provisional PND-140
export type OpenModal =
  | HelpModal
  | ResourceRoster
  | ExportChooser
  | OpenChooser
  | (OpenSurface & {
      readonly surface: 'FR-074'
      readonly fields: readonly PropertyField[]
    })
  | (OpenSurface & {
      readonly surface: 'FR-088'
      // TRAP: not renumbered: dayType counts Sunday as 1, weekStartDay counts it as 0.
      readonly weekDays: readonly WeekDay[]
      readonly exceptions: readonly Exception[]
      readonly weekStartDay: number | null
    })
  | (OpenSurface & {
      readonly surface: 'Watermark Unlock'
      readonly question: string
      readonly answers: readonly ConfirmationAnswer[]
    })
  | (OpenSurface & {
      readonly surface: 'Difference Review'
      readonly candidates: readonly MergeCandidateLine[]
      readonly unreadColumns: readonly string[]
      readonly unreadText: string
      readonly unreadNextStep: string
      readonly unreadNextStepLink?: LinkedWords
    })
  | (OpenSurface & {
      readonly surface: 'Import Report'
      readonly droppedTaskNames: readonly (string | null)[]
      readonly text: string
      readonly nextStep: string
      readonly dismissText: string
    })
  // TRAP: this string member never narrows and lets a misspelled name compile; narrow by a carried member.
  | (OpenSurface & { readonly surface: string })

export interface MergeCandidateLine {
  readonly currentUid: number
  readonly incomingUid: number
  readonly currentName: string | null
  readonly incomingName: string | null
}

export interface RaisedNotice {
  readonly manner: string
  readonly reason: string
  readonly affectedCount: number | null
}

// see FR-073
export interface LinkedWords {
  readonly before: string
  readonly address: string
  readonly after: string
}

export interface Notice {
  readonly manner: string
  readonly mannerText: string
  readonly text: string
  readonly nextSteps: readonly string[]
  readonly nextStepLinks?: readonly (LinkedWords | null)[]
  readonly affectedCount: number | null
  readonly dismissText: string
  readonly dismissKey: string
}

export interface RaisedConfirmation {
  readonly manner: string
  readonly question: string
  readonly items: readonly ConfirmationItem[]
  readonly days?: readonly string[]
}

export interface Confirmation extends RaisedConfirmation {
  readonly mannerText: string
  readonly text: string
  readonly answers: readonly ConfirmationAnswer[]
  readonly shownOnAnotherRowMark: string
  readonly at?: { readonly x: number; readonly y: number }
}

// see QN-12, WL-13, JDG-1142
export interface WbsParentChoice {
  readonly at: { readonly x: number; readonly y: number }
  readonly isArmed: boolean
}

export interface ConfirmationItem {
  readonly name: string | null
  readonly isShownOnAnotherRow: boolean
}

export interface ConfirmationAnswer {
  readonly answer: string
  readonly text: string
}

// see FR-066, T-335
export interface DialogueField {
  readonly messages: readonly DialogueMessage[]
  readonly heading: string
  readonly shown: WindowShown
  readonly titleEntries: readonly CommandItem[]
  readonly place: WindowPlace
  readonly canvas: ScreenRect
}

export interface Tooltip {
  readonly anchor: TooltipAnchor
  readonly text: string
  readonly assignment: string | null
  readonly at?: { readonly x: number; readonly y: number }
}

export type TooltipAnchor =
  | { readonly kind: 'icon'; readonly icon: IconId; readonly surface?: string; readonly groupId?: string }
  | { readonly kind: 'task'; readonly taskUid: number }
  | { readonly kind: 'deadline'; readonly taskUid: number }
  | { readonly kind: 'baseline'; readonly taskUid: number }
  | { readonly kind: 'rowTitle'; readonly groupId: string }
  | { readonly kind: 'scrollbar'; readonly axis: 'horizontal' | 'vertical' }

export interface ScreenView {
  readonly language: DisplayLanguage
  readonly frame: ScreenFrame
  readonly appHeaderItems: AppHeaderItems
  readonly rowTitlePanel: RowTitlePanel
  readonly propertiesPanel: PropertiesPanel | null
  readonly commandPalette: CommandPalette | null
  readonly openModal: OpenModal | null
  readonly helpModal?: HelpModal | null
  readonly notices: readonly Notice[]
  readonly confirmation: Confirmation | null
  readonly dialogueField: DialogueField | null
  readonly tooltips: readonly Tooltip[]
  // TRAP: optional so literals compile; absent draws no panel (FR-151), the same as null.
  readonly searchPanel?: SearchPanelView | null
  readonly delayDiagnosticsReport?: DelayDiagnosticsReportView | null
  // see FR-039, SE-2, SE-5
  // TRAP: kept out of notices, so the notice count and the Esc / Enter levels never see it;
  // absent while no message stands.
  readonly scaleMessage?: string
  // see DC-3
  // TRAP: never a Tooltip: it neither waits for S-124 nor sits in the tooltip count the shell reads.
  readonly dualCursorReadout?: DualCursorReadout
  readonly guideCursorLabel?: GuideCursorLabel
}

// see DC-3, IN-3
export interface DualCursorReadout {
  readonly lines: readonly string[]
  readonly at: { readonly x: number; readonly y: number }
}

export interface GuideCursorLabel {
  readonly text: string
  readonly at: { readonly x: number; readonly y: number }
}

// see PI-37, SF-5, SF-10
export interface ScreenViewReadings {
  readonly openedFileName: string | null
  readonly fileSavedAt: string | null
  readonly fileSavedByteLength: number | null
  readonly isAgentApiEnabled: boolean
  readonly pointer: { readonly x: number; readonly y: number } | null
  readonly pointerRestedMs: number
  readonly hintTargetDwellMs: number
  // STOP: spec does not decide what answers which icon is under the pointer. Looked in EZ-2, FR-092, FR-029, T-109, T-206
  // @provisional PND-141
  readonly iconUnderPointer: IconId | null
  readonly isPointerOnHelp?: boolean
  readonly hintHolderUnderPointer?: Extract<TooltipAnchor, { readonly taskUid: number }> | null
  readonly iconRowUnderPointer?: string | null
  readonly commandPaletteAt: { readonly x: number; readonly y: number }
  readonly themePreference: 'light' | 'dark'
  readonly themeHue: number
  readonly isRecordingInteractions?: boolean
  readonly rowGrabbedAt?: {
    readonly groupId: string
    readonly depth: number
    readonly axis: 'position' | 'depth'
    readonly resistedPx: number
    readonly atY: number | null
  } | null
  // STOP: spec does not decide where the selected rows are held. Looked in FR-085, FR-042, SL-1, T-203, T-206
  // @provisional PND-142
  readonly selectedGroupIds: readonly string[]
  // STOP: spec does not decide where the chosen resources are held. Looked in FR-099, SL-1, T-203, T-206
  // @provisional PND-143
  readonly selectedResourceUids: readonly number[]
  readonly mergeCandidates?: readonly MergeCandidateLine[]
  readonly unreadColumns?: readonly string[]
  readonly droppedTaskNames?: readonly (string | null)[]
  readonly notices: readonly RaisedNotice[]
  readonly confirmation: RaisedConfirmation | null
  readonly rowBoxes: readonly { readonly groupId: string; readonly box: ScreenRect }[]
  readonly placedRowGroupIds?: readonly string[]
  readonly placedRows?: readonly RowPlacement[]
  // TRAP: not on ScreenState: a per-frame change there fails the loop's identity test and redraws every frame.
  readonly scrollExtent: ScrollExtent
  readonly canUndo?: boolean
  readonly canRedo?: boolean
  // WHY: held by the frame loop, never saved (S-419, S-420, S-429); absent reads as the initial values.
  readonly searchPanel?: SearchPanelSession
  // see WB-6, S-455, S-456
  readonly windowPlaces?: { readonly helpModal: WindowPlace; readonly dialogueField: WindowPlace }
  readonly isDelayDiagnosticsShown?: boolean
  readonly isWbsParentLinksShown?: boolean
  readonly wbsParentChoice?: WbsParentChoice | null
  // see RW-1, S-451
  readonly delayDiagnosticsReport?: {
    readonly window: DelayDiagnosticsReportWindow
    readonly report: DelayDiagnosticsReport
  } | null
  // see SQ-5, S-445
  readonly bottleneckUids?: ReadonlySet<number>
}

// WHY: the shell seats the startup language before the first frame (FR-038); only a root built
// elsewhere, as a picture's, reaches this.
const DEFAULT_DISPLAY_LANGUAGE: DisplayLanguage = 'en'

// see PI-37, T-280
/** @purity pure */
export function displayLanguageOf(session: ScreenSession): DisplayLanguage {
  return session.screen.screenLanguage ?? DEFAULT_DISPLAY_LANGUAGE
}

// see RW-1, RW-5, S-451
/** @purity pure */
function delayDiagnosticsReportOf(
  session: ScreenSession,
  readings: ScreenViewReadings,
  schedule: Schedule,
  canvas: ScreenRect,
): DelayDiagnosticsReportView | null {
  const held = readings.delayDiagnosticsReport ?? null
  const textSizeStep = (readings.searchPanel ?? emptySearchPanelSession).textSizeStep
  return delayDiagnosticsReportFromWindow(session, held?.window ?? null, held?.report ?? null, schedule, { canvas, textSizeStep })
}

// see WB-1, WB-3
/** @purity pure */
function helpWindowAreaOf(regions: ScreenRegions): HelpWindowArea {
  const below = regions.scheduleCanvas
  return { belowAppHeader: below, browserWindow: { x: 0, y: 0, width: regions.appHeader.width, height: below.y + below.height } }
}

// see EZ-6, DC-3, CU-3, DC-9
/** @purity pure */
function pointerWordsOf(
  shown: Omit<ScreenView, 'tooltips'>,
  regions: ScreenRegions,
  schedule: Schedule,
  settings: DocumentSettings,
  session: ScreenSession,
  readings: ScreenViewReadings,
): Pick<ScreenView, 'tooltips' | 'dualCursorReadout' | 'guideCursorLabel'> {
  const readout = dualCursorReadoutOf(regions, settings, session, readings)
  const tooltips = tooltipsFromScreenView(shown, settings, session, readings, schedule)
  const label = guideCursorLabelOf(regions, settings, session, readings, tooltips)
  return {
    tooltips,
    ...(readout === null ? {} : { dualCursorReadout: readout }),
    ...(label === null ? {} : { guideCursorLabel: label }),
  }
}

// see PI-37, SF-5
/** @purity pure */
export function screenViewFromRegions(
  regions: ScreenRegions,
  schedule: Schedule,
  settings: DocumentSettings,
  selection: Selection,
  session: ScreenSession,
  dialogueLog: DialogueLog,
  readings: ScreenViewReadings,
): ScreenView {
  const language = displayLanguageOf(session)
  const help = helpModalFromSession(session, helpWindowAreaOf(regions))
  const shown: Omit<ScreenView, 'tooltips'> = {
    language,
    frame: screenFrameFromRegions(regions, settings, session, readings),
    appHeaderItems: appHeaderItemsFromDocument(schedule, settings, session, readings),
    rowTitlePanel: rowTitlePanelFromSchedule(schedule, settings, selection, session, readings),
    propertiesPanel: propertiesPanelFromSelection(schedule, settings, selection, session, readings),
    commandPalette: commandPaletteFromSession(
      session,
      settings,
      selection,
      readings,
      // TRAP: never omit schedule, or the palette counts tasks no row draws.
      schedule,
    ),
    openModal: openModalFromSession(session, schedule, readings),
    helpModal: help === null ? null : { ...help, place: readings.windowPlaces?.helpModal ?? DEFAULT_WINDOW_PLACE },
    notices: noticesFromSession(session, readings),
    confirmation: confirmationFromSession(session, readings, schedule),
    dialogueField: dialogueFieldFromLog(dialogueLog, session, readings, regions.scheduleCanvas),
    searchPanel: searchPanelFromSession(
      session,
      readings.searchPanel ?? emptySearchPanelSession,
      schedule,
      regions.scheduleCanvas,
      readings.bottleneckUids,
    ),
    delayDiagnosticsReport: delayDiagnosticsReportOf(session, readings, schedule, regions.scheduleCanvas),
  }

  const echo = session.screen.scaleMessageDisplayState
  return {
    ...shown,
    ...pointerWordsOf(shown, regions, schedule, settings, session, readings),
    ...(echo.kind === 'hidden'
      ? {}
      : { scaleMessage: displayScaleMessageText(echo.percent, echo.end, language) }),
  }
}

// see AG-11
/** @purity pure */
export function dialogueMessageFromInput(input: DialogueInput): SettledUtterance | null {
  if (!input.isSettled) return null

  // STOP: spec does not decide whether an empty, blank or long utterance is refused. Looked in AG-11, FR-066, AM-18 (PND-455)
  return { author: input.author, text: input.text, settledAt: input.settledAt }
}

// TRAP: index 0 is Sunday and callers index by weekday number; never rotate by weekStartDay.
// see FR-017
/** @purity pure */
export function rulerWeekdayWords(language: DisplayLanguage): readonly string[] {
  return displayWords.weekdays.map((one) => one.text[language])
}
