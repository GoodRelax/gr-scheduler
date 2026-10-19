// ScreenRenderer: describes the UI parts outside the schedule for the screen surface.
// @unit      UF-60   (docs/spec/05-07-design.md, table T-075)
// @component ScreenRenderer, layer Adapter (table T-062)
// @purity    pure
// @publishes table T-064 row PI-37

import displayWords from './display-words.json'
import type { DocumentSettings } from '../../entity/document-model/document-settings/document-settings'
import type { DelayDiagnosticsReport, Schedule } from '../../entity/document-model/schedule/schedule'
import type { Selection } from '../../entity/document-model/selection/selection'
import type {
  ScreenRect,
  ScreenRegions,
} from '../../entity/layout-engine/screen-regions/screen-regions'
import type { TaskGroupPlacement } from '../../entity/layout-engine/schedule-layout/schedule-layout'
import {
  VISIBILITY_TABLES,
  emptySearchPanelSession,
  tableViewOf,
  type ScreenSession,
  type SearchPanelSession,
  type VisibilityTable,
} from '../../use-case/advance-screen-session/advance-screen-session'
import { appHeaderItemsFromDocument, displayScaleMessageText } from './app-header-items'
import { commandPaletteFromSession } from './command-palette'
import { confirmationFromSession, dismissKeyOf, noticesFromSession } from './notices'
export { shiftAmountText, timeShiftQuestionItems, wholeScheduleShiftQuestionItems } from './notices'
export type { TimeShiftPreview, WholeScheduleShiftPreview } from './notices'
import type { HolidaySettings, HolidaySettingsFieldColumn } from './holiday-settings'
export type {
  HolidayExceptionLine,
  HolidaySettings,
  HolidaySettingsBody,
  HolidaySettingsCell,
  HolidaySettingsEntry,
  HolidaySettingsFieldColumn,
  HolidayWorkingTimeLine,
} from './holiday-settings'

// TRAP: the shell must use this key, not rebuild it, or the two spellings drift apart.
export { dismissKeyOf }

// see HF-14
// WHY: the en cell, not the display language; the task group label is document data (FR-038).
const DEFAULT_TASK_GROUP_NAME_ENTRY = displayWords.defaultNames.find((one) => one.use === 'taskGroup')
export const DEFAULT_TASK_GROUP_NAME: string =
  DEFAULT_TASK_GROUP_NAME_ENTRY === undefined ? '' : DEFAULT_TASK_GROUP_NAME_ENTRY.text.en

// WHY: FX-7's copy entrance commits this; no date reads this way, so the span row's commits never meet it.
export const FIT_SPAN_COPY_TEXT = 'copyCurrent'

export const DISPLAY_TIME_ZONE_SLOT_SEPARATOR = '|'

// see AS-5, IC-125, IC-126
export const ASSIGNEE_LIST_SEPARATOR = ','
import { helpModalFromSession, openModalFromSession } from './open-modals'
import { propertiesPanelFromSelection } from './properties-panel'
export { dateEntryWidthOf, panelFacesOf } from './properties-panel'
export type { PanelFace } from './properties-panel'
import { drawnTaskGroupBoxesOf, rulerAbbreviationsOf, taskGroupPanelFromSchedule, taskGroupTitleFontPxOf } from './task-group-panel'
import { searchPanelFromSession, type SearchPanelView } from './search-panel'
import {
  delayDiagnosticsReportFromWindow,
  type DelayDiagnosticsReportView,
  type DelayDiagnosticsReportWindow,
  type DelayFixTables,
} from './delay-diagnostics-report'
import { resourceListFromWindow, type ResourceListView } from './resource-list'
import {
  isScheduleFilterAppliedIn,
  scheduleFilterBarOf,
  shownDateTimesOf,
  type ScheduleFilterBarView,
  type TableWindowState,
} from './table-window'
import { DEFAULT_WINDOW_PLACE, type WindowPlace } from './window-box'
export {
  nextSearchPanelTextSizeStep,
  searchPanelAfterFilterChange,
  searchPanelAfterFilterEntry,
  searchPanelFromSession,
  searchPanelWithColumnWidth,
  searchPanelWithFilterClosed,
  searchPanelWithFilterOpened,
  searchPanelWithTableViewsCleared,
} from './search-panel'
export { DEFAULT_WINDOW_PLACE, windowBoxAfterGrab, windowBoxOf, windowEdgeAt, windowNormalBoxOf, windowPlaceOf } from './window-box'
export type { WindowPlace, WindowShown } from './window-box'
export { imageToJsonPromptText } from './app-header-items'
export { delayFixBackupFileNameOf, delayFixLogFileNameOf, exportFileNameOf, UNTITLED_DOCUMENT_TITLE } from './open-modals'
export type { SearchFilterChange, SearchPanelShown, SearchPanelView } from './search-panel'
export { filteredSearchRows, taskSearchColumnHeadings } from './search-table-filters'
export type { SearchColumnHeading, TableRowCells } from './search-table-filters'
export {
  MARK_COLOR_ROWS,
  UNASSIGNED_ROW_KEY,
  isFilterValueListed,
  markColorVariableOf,
  scheduleFilterBarOf,
  statusGlyphSvg,
  tableAfterVisibilityChange,
  tableViewsOnTheirColumns,
  tableWithScheduleFilterOff,
  tableWithScheduleFilterToggled,
} from './table-window'
export type { MarkGlyph, ScheduleFilterBarView, TableWindowState, VisibilityKey, WindowStep } from './table-window'
export {
  OPENED_RESOURCE_LIST,
  resourceListAfterEntry,
  resourceListAfterFilterChange,
  resourceListColumnHeadings,
  resourceListFromWindow,
  resourceListListedUidsOf,
  resourceListTableRows,
  resourceListWithColumnWidth,
  resourceListWithFilterClosed,
} from './resource-list'
export type { ResourceListRowView, ResourceListView } from './resource-list'
export {
  DELAY_DIAGNOSTICS_REPORT_EXTENSION,
  DELAY_FIX_LOG_EXTENSION,
  OPENED_DELAY_DIAGNOSTICS_REPORT,
  delayDiagnosticsReportAfterEntry,
  delayDiagnosticsReportAfterFilterChange,
  delayDiagnosticsReportFileNameOf,
  delayDiagnosticsReportMarkdownOf,
  delayFixLogTsvOf,
  delayDiagnosticsReportShowingRow,
  delayDiagnosticsReportWithColumnWidth,
  delayDiagnosticsReportWithFilterClosed,
  delayDiagnosticsReportWithInput,
  delayFixColumnHeadings,
  delayFixLogTsvWhole,
  delayFixTableRows,
  delayReportColumnHeadings,
  delayReportTableRows,
} from './delay-diagnostics-report'
export type { DelayDiagnosticsReportView, DelayDiagnosticsReportWindow, DelayFixTelling } from './delay-diagnostics-report'

export { drawnTaskGroupBoxesOf, taskGroupTitleFontPxOf }
import { screenFrameFromRegions } from './screen-frame'
export { horizontalWholeOf, scrollExtentOf, verticalWholeOf } from './screen-frame'
export type { HorizontalWhole, VerticalWhole } from './screen-frame'
export { achromatic, colorOf, isScheduleColorRow } from '../svg-renderer/svg-renderer'
import { dualCursorReadoutOf, guideCursorLabelOf, tooltipsFromScreenView } from './tooltips'

export type { FieldCommit, FieldEditNotice, ScreenPart, ScreenSurface } from './screen-surface'
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
  // see TV-12, EN-8
  readonly isScheduleFilterApplied?: boolean
  readonly isLabelShown?: boolean
  // see FR-039, S-623
  readonly isLabelBold?: boolean
}

export interface ScreenFrame {
  readonly isFullScreen: boolean
  readonly dividers: readonly PanelDivider[]
  readonly scrollbars: readonly Scrollbar[]
}

export interface PanelDivider {
  readonly panel: 'taskGroupPanel' | 'propertiesPanel'
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
  readonly brandingSeatPx?: number
  readonly documentTitleLeftPx?: number
  readonly documentTitle: string | null
  readonly openedFileName: string | null
  readonly fileSavedAt: string | null
  readonly fileSavedByteLength: number | null
  readonly fileNeverSavedText: string
  readonly commands: readonly CommandItem[]
  readonly language: DisplayLanguage
}

export interface TaskGroupPanel {
  readonly pinnedTitles: readonly TaskGroupTitle[]
  readonly titles: readonly TaskGroupTitle[]
  // TRAP: optional so literals compile; a builder that forgets it leaves the entrance drawn usable, silently.
  readonly canOpenEveryTaskGroup?: boolean
  readonly canCloseEveryTaskGroup?: boolean
  readonly canOpenLevelZero?: boolean
  readonly foldedTaskGroupCount?: number
  readonly groupGridLines?: readonly ScreenRect[]
  // TRAP: optional so literals compile; absent prints no abbreviation (FR-017, FR-156).
  readonly rulerAbbreviations?: readonly RulerAbbreviation[]
  readonly dropCue?: TaskGroupDropCue | null
  readonly grabCopy?: TaskGroupGrabCopy | null
}

export interface TaskGroupDropCue {
  readonly lineY: number
  readonly lineIndentPx: number
  // see HF-15, QN-16
  readonly isPastDepthCap?: boolean
}

// see HF-15, S-599
export interface TaskGroupGrabCopy {
  readonly x: number
  readonly y: number
  readonly name: string
}

// see FR-017, FR-156, T-376, EP-3
export interface RulerAbbreviation {
  readonly text: string
  readonly box: ScreenRect
  readonly baseline: number
  readonly fontPx: number
}

export interface TaskGroupTitle {
  readonly taskGroupId: string
  readonly depth: number
  readonly box: ScreenRect
  readonly indentPx: number
  readonly fontPx: number
  readonly label: string | null
  readonly wholeLabel: string | null
  readonly isLabelTruncated: boolean
  readonly expander: TaskGroupExpander
  readonly canOpenOneLevel?: boolean
  readonly canAddChildTaskGroup?: boolean
  readonly foldedTaskGroupCount?: number
  readonly isHeld?: boolean
  readonly isPinned: boolean
  readonly isSelected: boolean
}

export interface TaskGroupExpander {
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
  readonly readOnlyHeading?: string
}

export interface PropertyField {
  readonly row: string
  readonly name: string
  readonly text: string
  readonly isEditable: boolean
  readonly controls: readonly PropertyControl[]
  readonly unit?: string
  readonly readout?: string
  readonly isSettledAsOne?: true
  readonly nameBreakSegments?: readonly string[]
  readonly readOnlyGroup?: PropertyFieldGroup
}

export interface PropertyFieldGroup {
  readonly key: string
  readonly name: string
  readonly section?: string
}

export type PropertyControlKind =
  | 'text'
  | 'multiline'
  | 'date'
  | 'number'
  | 'boolean'
  | 'choice'
  | 'color'
  | 'taskReference'

// see CV-9
// WHY: swatches run beside choiceValues; the custom entrance commits one #rrggbb (CV-4).
export interface ColorField {
  readonly swatches: readonly string[]
  readonly inks: readonly string[]
  readonly customWord: string
  readonly customValue: string
  // WHY: optional, so a description written before it still draws; absent, only the offered names show.
  readonly names?: readonly ColorName[]
  readonly theme: ColorEntrance
  readonly custom: ColorEntrance
  readonly transparentWord?: string
  // see PI-37, PI-1
  readonly transparentName: string
}

// see CV-9, CV-5, CV-7
export interface ColorEntrance {
  readonly glyph: string
  readonly hint: string
  readonly paint: string | null
  readonly ink: string
}

// see PR-37, PR-38, T-018
export interface PropertyBadge {
  readonly text: string
  readonly hint: string
}

// see AS-5, AS-6, IC-123, IC-124
export interface AssigneeCombo {
  readonly people: readonly { readonly name: string; readonly uid: number; readonly word: string }[]
  readonly addWord: string
  readonly sortEntries: readonly CommandItem[]
  readonly checkEntries: readonly CommandItem[]
  readonly seated: readonly number[]
  readonly fieldWord: string
  readonly candidatesOf: (typed: string, isDescending: boolean) => readonly AssigneeCandidate[]
}

// see AS-5, AS-7
export interface AssigneeCandidate {
  readonly pick: 'candidate' | 'add'
  readonly value: string
  readonly word: string
}

// see CV-9, T-294
export interface ColorName {
  readonly name: string
  readonly isOffered: boolean
}

export interface PropertyControl {
  readonly key: PropertyFieldKey
  readonly kind: PropertyControlKind
  readonly text: string
  readonly choices: readonly string[] | null
  readonly choiceValues?: readonly string[]
  readonly choiceLines?: readonly (readonly [string, string])[]
  readonly color?: ColorField
  // WHY: bare swatches beside choiceValues; ColorField brings entrances FR-041's hue field must not have.
  readonly swatches?: readonly string[]
  readonly assignee?: AssigneeCombo
  readonly min: number | null
  readonly max: number | null
  readonly widthInFontSizes: number
  readonly isFocusTarget?: true
  readonly isDisabled?: true
  readonly isSizedAsDate?: true
  readonly isDateTime?: true
  readonly hint?: string
  // see FX-7
  // WHY: a word entrance committing `text` when pressed; it holds no value of its own.
  readonly press?: string
  // WHY: words with no entry, and a control on a line of its own: the base change answers (FO-14, FR-156).
  readonly words?: string
  readonly isOwnLine?: true
  readonly link?: PropertyLink
  readonly badge?: PropertyBadge
  readonly lag?: string
}

// see PTL-15, PTL-16, PTL-17
export interface PropertyLink {
  readonly taskUid: number
  readonly canUnlink: boolean
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
      readonly taskGroupId: string
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
  | {
      readonly holder: 'documentSettings'
      readonly column: keyof DocumentSettings & string
    }
  // see FO-16, FR-157, IC-162
  | {
      readonly holder: 'timeShift'
      readonly column: 'minutes' | 'entry'
    }
  | {
      readonly holder: 'wholeScheduleShift'
      readonly column: 'newStartDate' | 'entry'
    }
  | {
      readonly holder: 'baseTimeZoneDraft'
      readonly column: 'chosenRegion' | 'keepGlobalTime' | 'keepLocalTime' | 'cancel'
    }
  // see WC-3, WC-4, WC-8, IC-134, IC-165
  | {
      readonly holder: 'calendarDraft'
      readonly column: HolidaySettingsFieldColumn
      readonly index: number
    }

export interface CommandPalette {
  readonly at: { readonly x: number; readonly y: number }
  // TRAP: the surface must draw the band inside the palette part, or the palette fades while grabbed.
  readonly grabBandHeight: number
  readonly minimize: CommandItem
  readonly bandRecord?: CommandItem | null
  readonly isMinimized: boolean
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
  readonly windowState: 'normal' | 'minimized' | 'maximized'
  readonly licenseText: string
  readonly copyrightNotice: string
  readonly attributions: readonly string[]
  // see FR-036, S-350, S-583
  readonly downloadLink: HelpLink
  readonly aboutLink: HelpLink
  readonly helpLegal: { readonly licensedUnder: string; readonly fullText: string }
  readonly area: HelpWindowArea
  readonly place?: WindowPlace
}

// see WB-1, WB-3, WB-8, FR-036
export interface HelpWindowArea {
  readonly belowAppHeader: ScreenRect
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

// see FR-036, S-350, S-583
export interface HelpLink {
  readonly words: string
  readonly address: string
}

export interface HelpEntry {
  readonly table: string
  readonly row: string
  readonly text: string
  readonly press: string | null
  readonly keys: string | null
  // see FR-036, EZ-2
  readonly assignment: string | null
  readonly icon: IconId | null
  readonly kind: string
  // see T-256
  readonly column: string
  readonly block: string
  readonly segment: string | null
  readonly glyphs: readonly IconId[]
  // see FR-036, IC-20, S-350
  readonly link: HelpLink | null
}

export interface ExportFormatChoice {
  readonly row: ExportFormatId
  readonly name: string
  readonly extension: string
}

export interface ExportChooser extends OpenSurface {
  readonly surface: 'Export Chooser'
  readonly formats: readonly ExportFormatChoice[]
  readonly fitSpanLine: string | null
}

// STOP: spec does not decide what each open surface carries. Looked in T-103, T-280
// @provisional PND-140
export type OpenModal =
  | HelpModal
  | ExportChooser
  | OpenChooser
  | HolidaySettings
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
      readonly separateNote: string
    })
  | (OpenSurface & {
      readonly surface: 'Import Report'
      readonly droppedTaskNames: readonly (string | null)[]
      readonly text: string
      readonly nextStep: string
      readonly dismissText: string
      readonly missingTaskNames: readonly (string | null)[]
      readonly missingText: string
      readonly missingNextStep: string
      readonly reportLines: readonly ImportReportLine[]
    })
  // TRAP: this string member never narrows and lets a misspelled name compile; narrow by a carried member.
  | (OpenSurface & { readonly surface: string })

// see U-62, FR-076
export interface ImportReportLine {
  readonly reason: string
  readonly text: string
  readonly nextStep: string
  readonly count: number | null
  readonly names: readonly (string | null)[]
}

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
  readonly raisedNotices: readonly RaisedNotice[]
}

export interface RaisedConfirmation {
  readonly manner: string
  readonly question: string
  readonly items: readonly ConfirmationItem[]
}

export interface Confirmation extends RaisedConfirmation {
  readonly mannerText: string
  readonly text: string
  readonly answers: readonly ConfirmationAnswer[]
  readonly shownOnAnotherTaskGroupMark: string
  readonly at?: { readonly x: number; readonly y: number }
}

// see QN-12, PTL-13, JDG-1142
export interface ParentTaskChoice {
  readonly at: { readonly x: number; readonly y: number }
  readonly isArmed: boolean
}

export interface ConfirmationItem {
  readonly name: string | null
  readonly isShownOnAnotherTaskGroup: boolean
}

export interface ConfirmationAnswer {
  readonly answer: string
  readonly text: string
}


export interface Tooltip {
  readonly anchor: TooltipAnchor
  readonly text: string
  readonly assignment: string | null
  readonly at?: { readonly x: number; readonly y: number }
  readonly rows?: readonly TooltipRow[]
}

export type TooltipRow =
  | { readonly kind: 'whole'; readonly text: string }
  | { readonly kind: 'labeled'; readonly label: string; readonly value: string; readonly parts?: readonly string[] }
  | { readonly kind: 'note'; readonly text: string }

export type TooltipAnchor =
  | { readonly kind: 'icon'; readonly icon: IconId; readonly surface?: string; readonly taskGroupId?: string }
  | { readonly kind: 'task'; readonly taskUid: number }
  | { readonly kind: 'deadline'; readonly taskUid: number }
  | { readonly kind: 'baseline'; readonly taskUid: number }
  | { readonly kind: 'taskGroupTitle'; readonly taskGroupId: string }
  | { readonly kind: 'scrollbar'; readonly axis: 'horizontal' | 'vertical' }

export interface ScreenView {
  readonly language: DisplayLanguage
  readonly frame: ScreenFrame
  readonly appHeaderItems: AppHeaderItems
  readonly taskGroupPanel: TaskGroupPanel
  readonly propertiesPanel: PropertiesPanel | null
  readonly commandPalette: CommandPalette | null
  readonly openModal: OpenModal | null
  // see WB-10
  readonly openModalAt?: { readonly x: number; readonly y: number } | null
  readonly helpModal?: HelpModal | null
  readonly notices: readonly Notice[]
  readonly confirmation: Confirmation | null
  readonly tooltips: readonly Tooltip[]
  // TRAP: optional so literals compile; absent draws no panel (FR-151), the same as null.
  readonly searchPanel?: SearchPanelView | null
  readonly delayDiagnosticsReport?: DelayDiagnosticsReportView | null
  readonly resourceList?: ResourceListView | null
  // see TV-11, U-67
  readonly scheduleFilterBar?: ScheduleFilterBarView | null
  // see FR-039, SE-2, SE-5
  // TRAP: kept out of notices, so the notice count and the Esc / Enter levels never see it;
  // absent while no message stands.
  readonly scaleMessage?: string
  // see DC-3
  // TRAP: never a Tooltip: it neither waits for S-124 nor sits in the tooltip count the shell reads.
  readonly dualCursorReadout?: DualCursorReadout
  readonly guideCursorLabel?: GuideCursorLabel
  readonly dropCue?: DropCue
  readonly jumpRipple?: JumpRipple
}

// see SJ-10, S-556, S-557, S-558, S-559
export interface JumpRipple {
  readonly inner: ScreenRect
  readonly lineWidth: number
  readonly within: ScreenRect
  readonly landing: number
}

// see OP-17, U-68
export interface DropCue {
  readonly text: string
  readonly area: ScreenRect
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
  readonly jumpRipple?: JumpRipple | undefined
  readonly fileSavedByteLength: number | null
  readonly isAgentApiEnabled: boolean
  readonly pointer: { readonly x: number; readonly y: number } | null
  readonly pointerRestedMs: number
  readonly hintTargetDwellMs: number
  // STOP: spec does not decide what answers which icon is under the pointer. Looked in EZ-2, FR-092, FR-029, T-109, T-206
  // @provisional PND-141
  readonly iconUnderPointer: IconId | null
  readonly isPointerOnHelp?: boolean
  readonly isPointerOnSearchPanel?: boolean
  readonly tableWindowUnderPointer?: VisibilityTable | null
  readonly hintHolderUnderPointer?: Extract<TooltipAnchor, { readonly taskUid: number }> | null
  readonly iconRowUnderPointer?: string | null
  readonly commandPaletteAt: { readonly x: number; readonly y: number }
  readonly themePreference: 'light' | 'dark'
  readonly themeHue: number
  readonly isRecordingInteractions?: boolean
  readonly taskGroupGrabbedAt?: {
    readonly taskGroupId: string
    readonly landing: {
      readonly gapY: number
      readonly lineIndentPx: number
      readonly parentId: string | null
      readonly isPastDepthCap?: boolean
    } | null
  } | null
  // see FR-085, T-293
  readonly selectedTaskGroupIds: readonly string[]
  // STOP: spec does not decide where the chosen resources are held. Looked in FR-099, SL-1, T-203, T-206
  // @provisional PND-143
  readonly selectedResourceUids: readonly number[]
  readonly mergeCandidates?: readonly MergeCandidateLine[]
  readonly unreadColumns?: readonly string[]
  readonly droppedTaskNames?: readonly (string | null)[]
  readonly missingTaskNames?: readonly (string | null)[]
  readonly reportedCounts?: readonly { readonly reason: string; readonly count: number }[]
  readonly notices: readonly RaisedNotice[]
  readonly confirmation: RaisedConfirmation | null
  readonly taskGroupBoxes: readonly { readonly taskGroupId: string; readonly box: ScreenRect }[]
  readonly placedTaskGroupIds?: readonly string[]
  readonly placedTaskGroups?: readonly TaskGroupPlacement[]
  // see FX-6, WF-3
  // WHY: screen values the settings panel reads out; absent, the read-outs stay empty.
  readonly shownSpan?: { readonly start: string; readonly finish: string } | null
  readonly taskGroupPanelDrawnWidth?: number
  // TRAP: not on ScreenState: a per-frame change there fails the loop's identity test and redraws every frame.
  readonly scrollExtent: ScrollExtent
  readonly canUndo?: boolean
  readonly canRedo?: boolean
  // see FR-029, IC-12, IC-13, IC-14, IC-15
  readonly zoomEntranceEnds?: {
    readonly isTimeOutAtEnd: boolean
    readonly isTimeInAtEnd: boolean
    readonly isVerticalOutAtEnd: boolean
    readonly isVerticalInAtEnd: boolean
  }
  // WHY: held by the frame loop, never saved (S-419, S-420, S-429); absent reads as the initial values.
  readonly searchPanel?: SearchPanelSession
  // see WB-6, S-455
  readonly windowPlaces?: {
    readonly helpModal: WindowPlace
    readonly closeOnlyTitledSurface?: { readonly x: number; readonly y: number } | null
  }
  readonly isDelayDiagnosticsShown?: boolean
  readonly isDelayDiagnosticsReportOpen?: boolean
  readonly isParentTaskLinksShown?: boolean
  readonly parentTaskChoice?: ParentTaskChoice | null
  // see RW-1, S-451
  readonly delayDiagnosticsReport?: {
    readonly window: DelayDiagnosticsReportWindow
    readonly report: DelayDiagnosticsReport
    readonly fixTables?: DelayFixTables
  } | null
  // see SQ-5, S-445
  readonly diagnosedMarkers?: ReadonlyMap<number, 'DG-1' | 'DG-2' | 'DG-3'>
  readonly resourceList?: TableWindowState | null
  // WHY: the tasks the product draws (null while no Schedule Filter is on); the band counts them.
  readonly drawnTaskUids?: ReadonlySet<number> | null
}

// WHY: the shell seats the startup language before the first frame (FR-038); only a root built
// elsewhere, as a picture's, reaches this.
const DEFAULT_DISPLAY_LANGUAGE: DisplayLanguage = 'en'

// see PI-37, T-280
/** @purity pure */
export function displayLanguageOf(session: ScreenSession): DisplayLanguage {
  return session.screen.screenLanguage ?? DEFAULT_DISPLAY_LANGUAGE
}

interface TableWindowSource {
  readonly schedule: Schedule
  readonly settings: DocumentSettings
  readonly canvas: ScreenRect
}

// see RW-1, RW-5, S-451, S-564
/** @purity pure */
function delayDiagnosticsReportOf(session: ScreenSession, readings: ScreenViewReadings, source: TableWindowSource): DelayDiagnosticsReportView | null {
  const held = readings.delayDiagnosticsReport ?? null
  const textSizeStep = (readings.searchPanel ?? emptySearchPanelSession).textSizeStep
  const view = tableViewOf(source.settings, 'delayDiagnosticsReport')
  const layout = { canvas: source.canvas, textSizeStep }
  return delayDiagnosticsReportFromWindow(
    session, held?.window ?? null, view, held?.report ?? null, source.schedule, layout, held?.fixTables,
    source.settings.isTimeOfDayVisible, source.settings.viewTimeZone,
  )
}

/** @purity pure */
function resourceListOf(session: ScreenSession, readings: ScreenViewReadings, source: TableWindowSource): ResourceListView | null {
  const textSizeStep = (readings.searchPanel ?? emptySearchPanelSession).textSizeStep
  const layout = { canvas: source.canvas, textSizeStep }
  const view = tableViewOf(source.settings, 'resourceList')
  return resourceListFromWindow(session, readings.resourceList ?? null, view, source.schedule, readings.selectedResourceUids, layout)
}

// see TV-1, TV-8, TV-11, TV-12, S-560, S-564, S-568
/** @purity pure */
function scheduleFilterBarIn(source: TableWindowSource, readings: ScreenViewReadings, language: DisplayLanguage): ScheduleFilterBarView | null {
  const schedule = source.schedule
  const drawn = readings.drawnTaskUids ?? null
  const drawnCount = drawn === null ? schedule.tasks.length : schedule.tasks.filter((task) => drawn.has(task.uid)).length
  const tables = VISIBILITY_TABLES.filter((table) => isScheduleFilterAppliedIn(source.settings, table))
  return scheduleFilterBarOf(tables, schedule, drawnCount, language)
}

/** @purity pure */
function tableWindowsOf(
  session: ScreenSession,
  readings: ScreenViewReadings,
  source: TableWindowSource,
): Pick<ScreenView, VisibilityTable | 'scheduleFilterBar'> {
  const panel = readings.searchPanel ?? emptySearchPanelSession
  const view = tableViewOf(source.settings, 'searchPanel')
  return {
    searchPanel: searchPanelFromSession(
      session, panel, view, source.schedule, source.canvas, readings.diagnosedMarkers, shownDateTimesOf(source.schedule, source.settings),
    ),
    delayDiagnosticsReport: delayDiagnosticsReportOf(session, readings, source),
    resourceList: resourceListOf(session, readings, source),
    scheduleFilterBar: scheduleFilterBarIn(source, readings, displayLanguageOf(session)),
  }
}

// see WB-1, WB-3, WB-8
/** @purity pure */
function helpWindowAreaOf(regions: ScreenRegions): HelpWindowArea {
  const belowAppHeader = regions.scheduleCanvas
  return { belowAppHeader }
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
  // TRAP: read through ?.: views built from a partial schedule carry no project.
  const dataRegion = schedule.project?.scheduleDataTimeZone
  const readout = dualCursorReadoutOf(regions, settings, session, readings, dataRegion)
  const tooltips = tooltipsFromScreenView(shown, settings, session, readings, schedule)
  const label = guideCursorLabelOf(regions, settings, session, readings, tooltips, dataRegion)
  return {
    tooltips,
    ...(readout === null ? {} : { dualCursorReadout: readout }),
    ...(label === null ? {} : { guideCursorLabel: label }),
  }
}

// see WB-10
/** @purity pure */
function openModalPlaced(
  session: ScreenSession,
  schedule: Schedule,
  readings: ScreenViewReadings,
  settings: DocumentSettings,
): Pick<ScreenView, 'openModal' | 'openModalAt'> {
  const openModal = openModalFromSession(session, schedule, readings, settings)
  return { openModal, openModalAt: readings.windowPlaces?.closeOnlyTitledSurface ?? null }
}

const DROP_CUE_WORDS = displayWords.dropCue.find((one) => one.part === 'dropToOpen')

// see OP-17, U-68, U-32, T-280
/** @purity pure */
function dropCueOf(session: ScreenSession, canvas: ScreenRect, language: DisplayLanguage): Pick<ScreenView, 'dropCue'> {
  if (session.screen.dropCueDisplayState.kind === 'hidden' || DROP_CUE_WORDS === undefined) return {}
  return { dropCue: { text: DROP_CUE_WORDS.text[language], area: canvas } }
}

/** @purity pure */
function withRulerAbbreviations(panel: TaskGroupPanel, abbreviations: readonly RulerAbbreviation[]): TaskGroupPanel {
  return abbreviations.length === 0 ? panel : { ...panel, rulerAbbreviations: abbreviations }
}

// see PI-37, SF-5
/** @purity pure */
export function screenViewFromRegions(
  regions: ScreenRegions,
  schedule: Schedule,
  settings: DocumentSettings,
  selection: Selection,
  session: ScreenSession,
  readings: ScreenViewReadings,
): ScreenView {
  const language = displayLanguageOf(session)
  const help = helpModalFromSession(session, helpWindowAreaOf(regions))
  const shown: Omit<ScreenView, 'tooltips'> = {
    language,
    frame: screenFrameFromRegions(regions, settings, session, readings),
    appHeaderItems: appHeaderItemsFromDocument(schedule, settings, session, readings),
    taskGroupPanel: withRulerAbbreviations(
      taskGroupPanelFromSchedule(schedule, settings, selection, session, readings),
      rulerAbbreviationsOf(regions, schedule, settings, language),
    ),
    propertiesPanel: propertiesPanelFromSelection(schedule, settings, selection, session, readings),
    commandPalette: commandPaletteFromSession(
      session,
      settings,
      selection,
      readings,
      // TRAP: never omit schedule, or the palette counts tasks no task group draws.
      schedule,
    ),
    ...openModalPlaced(session, schedule, readings, settings),
    helpModal: help === null ? null : { ...help, place: readings.windowPlaces?.helpModal ?? DEFAULT_WINDOW_PLACE },
    notices: noticesFromSession(session, readings),
    confirmation: confirmationFromSession(session, readings),
    ...tableWindowsOf(session, readings, { schedule, settings, canvas: regions.scheduleCanvas }),
  }

  const echo = session.screen.scaleMessageDisplayState
  return {
    ...shown,
    ...pointerWordsOf(shown, regions, schedule, settings, session, readings),
    ...dropCueOf(session, regions.scheduleCanvas, language),
    ...(readings.jumpRipple === undefined ? {} : { jumpRipple: readings.jumpRipple }),
    ...(echo.kind === 'hidden'
      ? {}
      : { scaleMessage: displayScaleMessageText(echo.percent, echo.end, language) }),
  }
}

// TRAP: index 0 is Sunday and callers index by weekday number; never rotate by weekStartDay.
// see FR-017
/** @purity pure */
export function rulerWeekdayWords(language: DisplayLanguage): readonly string[] {
  return displayWords.weekdays.map((one) => one.text[language])
}
