// ScreenRenderer: describes the UI parts outside the schedule for the screen surface.
// @unit      UF-60   (docs/spec/05-07-design.md, table T-075)
// @component ScreenRenderer, layer Adapter (table T-062)
// @purity    pure
// @publishes table T-064 row PI-37

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

// TRAP: the shell must use this key, not rebuild it, or the two spellings drift apart.
export { dismissKeyOf }
import { openModalFromScreenState } from './open-modals'
import { propertiesPanelFromSelection } from './properties-panel'
import { rowTitlePanelFromSchedule } from './row-title-panel'
import { screenFrameFromRegions } from './screen-frame'
import type { DialogueInput } from './screen-surface'
import { tooltipsFromScreenView } from './tooltips'

export type { DialogueInput, FieldCommit, ScreenPart, ScreenSurface } from './screen-surface'

export type IconId = string

export type ExportFormatId = string

export type DisplayLanguage = 'ja' | 'en'

export interface CommandItem {
  readonly icon: IconId
  readonly isEnabled: boolean
  readonly isPressed: boolean
  // WHY: not isPressed, which writes aria-pressed and would announce an arm as a pressed button.
  readonly isArmed: boolean
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
  readonly documentTitle: string | null
  readonly openedFileName: string | null
  readonly fileSavedAt: string | null
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
}

export interface RowTitle {
  readonly groupId: string
  readonly depth: number
  readonly box: ScreenRect
  readonly indentPx: number
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
}

export interface PropertyField {
  readonly row: string
  readonly name: string
  readonly text: string
  readonly isEditable: boolean
  readonly controls: readonly PropertyControl[]
}

export type PropertyControlKind =
  | 'text'
  | 'multiline'
  | 'date'
  | 'number'
  | 'boolean'
  | 'choice'
  | 'color'

export interface PropertyControl {
  readonly key: PropertyFieldKey
  readonly kind: PropertyControlKind
  readonly text: string
  readonly choices: readonly string[] | null
  readonly choiceValues?: readonly string[]
  readonly searchWords?: readonly string[]
  readonly min: number | null
  readonly max: number | null
  readonly widthInFontSizes: number
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
  readonly language: DisplayLanguage
  readonly licenceText: string
  readonly copyrightNotice: string
  readonly attributions: readonly string[]
}

export interface HelpEntry {
  readonly table: string
  readonly row: string
  readonly text: string
  readonly press: string | null
  readonly keys: string | null
  readonly icon: IconId | null
}

export interface AiExportModal extends OpenSurface {
  readonly surface: 'AI Export Modal'
  readonly documentText: string
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
  | AiExportModal
  | ResourceRoster
  | ExportChooser
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

export interface Notice {
  readonly manner: string
  readonly mannerText: string
  readonly text: string
  readonly nextSteps: readonly string[]
  readonly affectedCount: number | null
  readonly dismissText: string
  readonly dismissKey: string
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
  readonly shownOnAnotherRowMark: string
}

export interface ConfirmationItem {
  readonly name: string | null
  readonly isShownOnAnotherRow: boolean
}

export interface ConfirmationAnswer {
  readonly answer: string
  readonly text: string
}

export interface DialogueField {
  readonly messages: readonly DialogueMessage[]
}

export interface Tooltip {
  readonly anchor: TooltipAnchor
  readonly text: string
  readonly assignment: string | null
  // STOP: spec does not decide where a Task tooltip stands; the pointer's point is used. Looked in T-040, IN-3, EP-15, T-206
  // @provisional PND-391
  readonly at?: { readonly x: number; readonly y: number }
}

export type TooltipAnchor =
  | { readonly kind: 'icon'; readonly icon: IconId }
  | { readonly kind: 'task'; readonly taskUid: number }
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
  readonly notices: readonly Notice[]
  readonly confirmation: Confirmation | null
  readonly dialogueField: DialogueField | null
  readonly tooltips: readonly Tooltip[]
}

export interface PropertiesSubject {
  readonly selection: Selection
  readonly groupIds: readonly string[]
}

export interface ScreenSession {
  readonly language: DisplayLanguage
  readonly openedFileName: string | null
  readonly fileSavedAt: string | null
  readonly isAgentApiEnabled: boolean
  readonly isDialogueFieldVisible: boolean
  readonly aiExportDocument?: string
  readonly pointer: { readonly x: number; readonly y: number } | null
  readonly pointerRestedMs: number
  // STOP: spec does not decide what answers which icon is under the pointer. Looked in EZ-2, FR-092, FR-029, T-109, T-206
  // @provisional PND-141
  readonly iconUnderPointer: IconId | null
  readonly taskUnderPointer?: Task | null
  readonly isTooltipDismissed?: boolean
  readonly commandPaletteAt: { readonly x: number; readonly y: number }
  readonly themePreference: 'light' | 'dark'
  readonly themeHue: number
  readonly isMilestoneListOpen: boolean
  readonly isPaletteMinimised: boolean
  readonly isRecordingInteractions?: boolean
  readonly rowGrabbedAt?: {
    readonly groupId: string
    readonly depth: number
    readonly axis: 'position' | 'depth'
    readonly resistedPx: number
    readonly atY: number | null
  } | null
  readonly isLevelZeroFolded?: boolean
  readonly dualCursorFollowing: DualCursorSide | null
  // STOP: spec does not decide where the selected rows are held. Looked in FR-085, FR-042, SL-1, T-203, T-206
  // @provisional PND-142
  readonly selectedGroupIds: readonly string[]
  // STOP: spec does not decide where the chosen resources are held. Looked in FR-099, SL-1, T-203, T-206
  // @provisional PND-143
  readonly selectedResourceUids: readonly number[]
  readonly mergeCandidates?: readonly MergeCandidateLine[]
  readonly unreadColumns?: readonly string[]
  readonly droppedTaskNames?: readonly (string | null)[]
  readonly propertiesShowing: 'selection' | 'documentSettings' | null
  // STOP: spec does not decide what the panel keeps once the selection is gone. Looked in FR-072, T-203, T-206
  // @provisional PND-144
  readonly propertiesSubject: PropertiesSubject | null
  readonly notices: readonly RaisedNotice[]
  readonly confirmation: RaisedConfirmation | null
  readonly rowBoxes: readonly { readonly groupId: string; readonly box: ScreenRect }[]
  // TRAP: not on ScreenState: a per-frame change there fails the loop's identity test and redraws every frame.
  readonly scrollExtent: ScrollExtent
  readonly canUndo?: boolean
  readonly canRedo?: boolean
}

/** @purity pure */
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
      // TRAP: never omit schedule, or the palette counts tasks no row draws.
      schedule,
    ),
    openModal: openModalFromScreenState(state, schedule, session),
    notices: noticesFromSession(session),
    confirmation: confirmationFromSession(session),
    dialogueField: dialogueFieldFromLog(dialogueLog, session),
  }

  return { ...shown, tooltips: tooltipsFromScreenView(shown, settings, session) }
}

// see AG-11
/** @purity pure */
export function dialogueMessageFromInput(input: DialogueInput): SettledUtterance | null {
  if (!input.isSettled) return null

  // STOP: spec does not decide whether an empty utterance is refused or its length bounded. Looked in AG-11, FR-066, AM-18
  return { author: input.author, text: input.text, settledAt: input.settledAt }
}

// TRAP: index 0 is Sunday and callers index by weekday number; never rotate by weekStartDay.
// see FR-017
/** @purity pure */
export function rulerWeekdayWords(language: DisplayLanguage): readonly string[] {
  return displayWords.weekdays.map((one) => one.text[language])
}
