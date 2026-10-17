// ScreenValues: the screen-values region of the session and its transitions.
// @unit      UF-86   (docs/spec/05-07-design.md, table T-075)
// @component AdvanceScreenSession, layer UseCase (table T-062)
// @purity    pure
// Generated region below the carried-value types: docs/spec/_source/state-machines.json. Do not edit by hand; npm run gen.

import {
  NOT_STORED_SEARCH_PANEL_FONT_SIZES,
  type EscapeTarget,
  type RememberedActual,
} from '../../entity/document-model/screen-state/screen-state'
import type { Selection } from '../../entity/document-model/selection/selection'
import {
  tableViewOf,
  type DocumentCommand,
  type SearchJumpTarget,
  type TableView,
} from '../edit-document/edit-document'
import { hasCalendarDraftRefusal, type CalendarDraft } from './calendar-draft'
import { assertNever, NO_EFFECTS, unchanged, type Step } from './session-step'

// see FR-072
export interface PropertiesSubject {
  readonly selection: Selection
  readonly taskGroupIds: readonly string[]
}

export type ArmKind = Exclude<ArmModeState['kind'], 'notArmed'>

type DisplayLanguage = 'ja' | 'en'

type ScaleEnd = 'max' | 'min' | null

// see FR-156, FO-14
export type BaseChangeWay = 'keepGlobalTime' | 'keepLocalTime'

// see S-72, FR-039
type ThemePreference = 'light' | 'dark'

// see S-66, FR-048
type GuideCursorMode = 'none' | 'crosshair' | 'single-vertical'

// see DC-9, S-66
type GuideCursor = Exclude<GuideCursorMode, 'none'>

// see S-65, DC-6
interface DualCursorDates {
  readonly cursorADate: string
  readonly cursorBDate: string
}

interface LandedLink {
  readonly predecessorUid: number
  readonly successorUid: number
}

type LandedBy = 'continuationMark' | 'jump'

export type SearchTable = 'tasks' | 'commentBoxes'

// see T-331
export type SearchColumn = string

export interface SearchFilters {
  readonly open: SearchColumn | null
}

export { tableViewOf }
export type { TableView }

export type TableVisibility = TableView['visibility']

export type VisibilityTable = Extract<DocumentCommand, { readonly kind: 'setTableView' }>['table']

export const EVERY_ROW_SHOWN: TableVisibility = {
  hiddenTaskUids: [],
  hiddenResourceUids: [],
  isUnassignedHidden: false,
  isScheduleFilterApplied: false,
}

// see TV-11, IC-143
const TABLE_RANKS: Readonly<Record<VisibilityTable, number>> = {
  searchPanel: 0,
  delayDiagnosticsReport: 1,
  resourceList: 2,
}

export const VISIBILITY_TABLES: readonly VisibilityTable[] = (Object.keys(TABLE_RANKS) as VisibilityTable[]).sort(
  (a, b) => TABLE_RANKS[a] - TABLE_RANKS[b],
)

// see S-419, S-420, S-429, SV-7, SV-18
export interface SearchPanelSession {
  readonly word: string
  readonly table: SearchTable
  readonly filters: SearchFilters
  readonly at: { readonly x: number; readonly y: number } | null
  readonly size: { readonly width: number; readonly height: number } | null
  readonly textSizeStep: number
  readonly columnWidths: Readonly<Record<SearchColumn, number>>
}

export type SearchPanelTextSizeRow = keyof typeof NOT_STORED_SEARCH_PANEL_FONT_SIZES

// see T-333, S-429
// WHY: a step is a row's place in table T-333, so the rows are read in the table's order.
export const SEARCH_PANEL_TEXT_SIZE_ROWS = Object.keys(
  NOT_STORED_SEARCH_PANEL_FONT_SIZES,
) as readonly SearchPanelTextSizeRow[]

const DEFAULT_TEXT_SIZE_ROW: SearchPanelTextSizeRow = 'S-430'

export const emptySearchPanelSession: SearchPanelSession = {
  word: '',
  table: 'tasks',
  filters: { open: null },
  at: null,
  size: null,
  textSizeStep: SEARCH_PANEL_TEXT_SIZE_ROWS.indexOf(DEFAULT_TEXT_SIZE_ROW),
  columnWidths: {},
}

export interface ScreenValuesStateCarried {
  readonly screenLanguage: DisplayLanguage | null
  readonly helpLanguage: DisplayLanguage | null
  readonly rememberedActuals: Readonly<Record<number, RememberedActual>>
  readonly themePreference: ThemePreference
  readonly guideCursorMode: GuideCursorMode
  readonly dualCursor: DualCursorDates | null
  // WHY: null until the shell seats S-171 at startup, as it seats the language; the value is generated there.
  readonly propertyPanelWidth: number | null
  readonly shapeKind: string
  readonly glyph: string
  readonly surfaceName: string
  readonly subject: PropertiesSubject
  readonly percent: number
  readonly end: ScaleEnd
  readonly landedLink: LandedLink | null
  readonly landedBy: LandedBy
  readonly landedTarget: SearchJumpTarget
  readonly landedRelatedTasks: readonly number[]
  readonly chosenRegion: string
  readonly shiftMinutes: number
  readonly newStartDate: string
  readonly calendarDraft: CalendarDraft
}

export interface ScreenValuesEventCarried {
  readonly isFullScreen: boolean
  readonly surfaceName: string
  readonly target: 'surface' | 'panel' | 'helpModal'
  readonly rung: EscapeTarget
  readonly armKind: ArmKind
  readonly shapeKind: string | null
  readonly glyph: string | null
  readonly isProceeding: boolean
  readonly subject: PropertiesSubject
  readonly hasSurfaceOrConfirmation: boolean
  readonly hasUnsettledEntry: boolean
  readonly isAgentApiEnabled: boolean
  readonly date: string
  readonly hasDaysToPlace: boolean
  readonly guideCursor: GuideCursor
  readonly percent: number
  readonly end: ScaleEnd
  readonly screenLanguage: DisplayLanguage
  readonly helpLanguage: DisplayLanguage
  readonly themePreference: ThemePreference
  readonly propertyPanelWidth: number
  readonly taskUid: number
  readonly rememberedActual: RememberedActual | null
  readonly writes: readonly DocumentCommand[]
  readonly landedLink: LandedLink
  readonly landedTarget: SearchJumpTarget
  readonly landedRelatedTasks: readonly number[]
  readonly isOpenAccepted: boolean
  readonly chosenRegion: string
  readonly isOtherThanShownBase: boolean
  readonly chosenWay: BaseChangeWay
  readonly shiftMinutes: number
  readonly newStartDate: string
  readonly calendarDraft: CalendarDraft
}

type NoPayload = Readonly<Record<never, never>>

type Carried = Pick<ScreenValuesEventCarried, 'writes'>

interface ScreenValuesEffectPayloads {
  readonly askBrowserForFullScreen: NoPayload
  readonly tellFlowSurfaceClosed: { readonly surfaceName: string }
  readonly matchWatermarkUnlock: NoPayload
  readonly raiseNotice: { readonly reason: 'RS-41' | 'RS-27' }
  readonly clearSelection: NoPayload
  readonly storePlacedDualCursorClearingGuide: { readonly date: string }
  readonly storeFixedCursorADate: { readonly date: string }
  readonly storeFixedCursorBDate: { readonly date: string }
  readonly storeClearedDualCursor: NoPayload
  readonly storeGuideCursorMode: { readonly guideCursorMode: GuideCursorMode }
  readonly storeThemePreference: { readonly themePreference: ThemePreference }
  readonly storePropertyPanelWidth: { readonly propertyPanelWidth: number }
  readonly startScaleMessageTimer: NoPayload
  readonly restartScaleMessageTimer: NoPayload
  readonly storeScreenLanguage: { readonly screenLanguage: DisplayLanguage }
  readonly writeHelpLanguage: { readonly helpLanguage: DisplayLanguage }
  readonly seedHelpLanguage: NoPayload
  readonly focusSearchWord: NoPayload
  readonly writeProgressStep: { readonly taskUid: number } & Carried
  readonly issueBaseChangeCommand: Pick<ScreenValuesStateCarried, 'chosenRegion'> & Pick<ScreenValuesEventCarried, 'chosenWay'>
  readonly raiseTimeShiftQuestion: Pick<ScreenValuesStateCarried, 'shiftMinutes'>
  readonly raiseWholeScheduleShiftQuestion: Pick<ScreenValuesStateCarried, 'newStartDate'>
  readonly issueCalendarCommand: Pick<ScreenValuesStateCarried, 'calendarDraft'>
}

export type ScreenValuesEffect = {
  readonly [N in ScreenValuesEffectName]: { readonly type: N } & ScreenValuesEffectPayloads[N]
}[ScreenValuesEffectName]

// <generated -- do not edit by hand>
// From docs/spec/_source/state-machines.json, region screen (table T-280).
// Rebuild: npm run gen (tools/generate_state_machine_types.py).

export type ScreenValuesKey =
  | 'screen'
  | 'armModeStateMachine.notArmed'
  | 'armModeStateMachine.taskShapeArmed'
  | 'armModeStateMachine.milestoneShapeArmed'
  | 'armModeStateMachine.dependencyArmed'
  | 'armModeStateMachine.commentBoxArmed'
  | 'armModeStateMachine.highlightBoxArmed'
  | 'armModeStateMachine.parentTaskArmed'
  | 'paletteDisplayStateMachine.shown'
  | 'paletteDisplayStateMachine.shown.expanded'
  | 'paletteDisplayStateMachine.shown.minimized'
  | 'paletteDisplayStateMachine.hidden'
  | 'milestoneListDisplayStateMachine.closed'
  | 'milestoneListDisplayStateMachine.open'
  | 'fullScreenModeStateMachine.normal'
  | 'fullScreenModeStateMachine.full'
  | 'openSurfaceStateMachine.closed'
  | 'openSurfaceStateMachine.open'
  | 'watermarkDisplayStateMachine.shown'
  | 'watermarkDisplayStateMachine.hidden'
  | 'propertiesPanelContentStateMachine.hidden'
  | 'propertiesPanelContentStateMachine.selectionDisplayed'
  | 'propertiesPanelContentStateMachine.documentSettingsDisplayed'
  | 'dialogueFieldDisplayStateMachine.hidden'
  | 'dialogueFieldDisplayStateMachine.shown'
  | 'dialogueFieldDisplayStateMachine.shown.normal'
  | 'dialogueFieldDisplayStateMachine.shown.minimized'
  | 'dialogueFieldDisplayStateMachine.shown.maximized'
  | 'dualCursorModeStateMachine.off'
  | 'dualCursorModeStateMachine.on'
  | 'dualCursorModeStateMachine.on.placingCursorA'
  | 'dualCursorModeStateMachine.on.placingCursorB'
  | 'scaleMessageDisplayStateMachine.hidden'
  | 'scaleMessageDisplayStateMachine.shown'
  | 'tooltipDisplayStateMachine.allowed'
  | 'tooltipDisplayStateMachine.dismissed'
  | 'searchPanelDisplayStateMachine.hidden'
  | 'searchPanelDisplayStateMachine.shown'
  | 'searchPanelDisplayStateMachine.shown.normal'
  | 'searchPanelDisplayStateMachine.shown.minimized'
  | 'searchPanelDisplayStateMachine.shown.maximized'
  | 'helpDisplayStateMachine.hidden'
  | 'helpDisplayStateMachine.shown'
  | 'helpDisplayStateMachine.shown.normal'
  | 'helpDisplayStateMachine.shown.minimized'
  | 'helpDisplayStateMachine.shown.maximized'
  | 'landingMarkDisplayStateMachine.hidden'
  | 'landingMarkDisplayStateMachine.shown'
  | 'dropCueDisplayStateMachine.hidden'
  | 'dropCueDisplayStateMachine.shown'
  | 'baseTimeZoneDraftStateMachine.untouched'
  | 'baseTimeZoneDraftStateMachine.drafted'
  | 'timeShiftDraftStateMachine.empty'
  | 'timeShiftDraftStateMachine.amountHeld'
  | 'wholeScheduleShiftDraftStateMachine.empty'
  | 'wholeScheduleShiftDraftStateMachine.dateHeld'
  | 'calendarDraftStateMachine.untouched'
  | 'calendarDraftStateMachine.drafted'

export type PaletteDisplayShownState =
  | { readonly kind: 'expanded' }
  | { readonly kind: 'minimized' }

export type DialogueFieldDisplayShownState =
  | { readonly kind: 'normal' }
  | { readonly kind: 'minimized' }
  | { readonly kind: 'maximized' }

export type DualCursorModeOnState =
  | { readonly kind: 'placingCursorA' }
  | { readonly kind: 'placingCursorB' }

export type SearchPanelDisplayShownState =
  | { readonly kind: 'normal' }
  | { readonly kind: 'minimized' }
  | { readonly kind: 'maximized' }

export type HelpDisplayShownState =
  | { readonly kind: 'normal' }
  | { readonly kind: 'minimized' }
  | { readonly kind: 'maximized' }

export type ArmModeState =
  | { readonly kind: 'notArmed' }
  | { readonly kind: 'taskShapeArmed'; readonly shapeKind: ScreenValuesStateCarried['shapeKind'] }
  | { readonly kind: 'milestoneShapeArmed'; readonly glyph: ScreenValuesStateCarried['glyph'] }
  | { readonly kind: 'dependencyArmed' }
  | { readonly kind: 'commentBoxArmed' }
  | { readonly kind: 'highlightBoxArmed' }
  | { readonly kind: 'parentTaskArmed' }

export type PaletteDisplayState =
  | { readonly kind: 'shown'; readonly child: PaletteDisplayShownState }
  | { readonly kind: 'hidden' }

export type MilestoneListDisplayState =
  | { readonly kind: 'closed' }
  | { readonly kind: 'open' }

export type FullScreenModeState =
  | { readonly kind: 'normal' }
  | { readonly kind: 'full' }

export type OpenSurfaceState =
  | { readonly kind: 'closed' }
  | { readonly kind: 'open'; readonly surfaceName: ScreenValuesStateCarried['surfaceName'] }

export type WatermarkDisplayState =
  | { readonly kind: 'shown' }
  | { readonly kind: 'hidden' }

export type PropertiesPanelContentState =
  | { readonly kind: 'hidden' }
  | { readonly kind: 'selectionDisplayed'; readonly subject: ScreenValuesStateCarried['subject'] }
  | { readonly kind: 'documentSettingsDisplayed' }

export type DialogueFieldDisplayState =
  | { readonly kind: 'hidden' }
  | { readonly kind: 'shown'; readonly child: DialogueFieldDisplayShownState }

export type DualCursorModeState =
  | { readonly kind: 'off' }
  | { readonly kind: 'on'; readonly child: DualCursorModeOnState }

export type ScaleMessageDisplayState =
  | { readonly kind: 'hidden' }
  | { readonly kind: 'shown'; readonly percent: ScreenValuesStateCarried['percent']; readonly end: ScreenValuesStateCarried['end'] }

export type TooltipDisplayState =
  | { readonly kind: 'allowed' }
  | { readonly kind: 'dismissed' }

export type SearchPanelDisplayState =
  | { readonly kind: 'hidden' }
  | { readonly kind: 'shown'; readonly child: SearchPanelDisplayShownState }

export type HelpDisplayState =
  | { readonly kind: 'hidden' }
  | { readonly kind: 'shown'; readonly child: HelpDisplayShownState }

export type LandingMarkDisplayState =
  | { readonly kind: 'hidden' }
  | { readonly kind: 'shown'; readonly landedBy: ScreenValuesStateCarried['landedBy']; readonly landedLink: ScreenValuesStateCarried['landedLink']; readonly landedTarget: ScreenValuesStateCarried['landedTarget']; readonly landedRelatedTasks: ScreenValuesStateCarried['landedRelatedTasks'] }

export type DropCueDisplayState =
  | { readonly kind: 'hidden' }
  | { readonly kind: 'shown' }

export type BaseTimeZoneDraftState =
  | { readonly kind: 'untouched' }
  | { readonly kind: 'drafted'; readonly chosenRegion: ScreenValuesStateCarried['chosenRegion'] }

export type TimeShiftDraftState =
  | { readonly kind: 'empty' }
  | { readonly kind: 'amountHeld'; readonly shiftMinutes: ScreenValuesStateCarried['shiftMinutes'] }

export type WholeScheduleShiftDraftState =
  | { readonly kind: 'empty' }
  | { readonly kind: 'dateHeld'; readonly newStartDate: ScreenValuesStateCarried['newStartDate'] }

export type CalendarDraftState =
  | { readonly kind: 'untouched' }
  | { readonly kind: 'drafted'; readonly calendarDraft: ScreenValuesStateCarried['calendarDraft'] }

export interface ScreenValues {
  readonly screenLanguage: ScreenValuesStateCarried['screenLanguage']
  readonly helpLanguage: ScreenValuesStateCarried['helpLanguage']
  readonly rememberedActuals: ScreenValuesStateCarried['rememberedActuals']
  readonly themePreference: ScreenValuesStateCarried['themePreference']
  readonly guideCursorMode: ScreenValuesStateCarried['guideCursorMode']
  readonly dualCursor: ScreenValuesStateCarried['dualCursor']
  readonly propertyPanelWidth: ScreenValuesStateCarried['propertyPanelWidth']
  readonly armModeState: ArmModeState
  readonly paletteDisplayState: PaletteDisplayState
  readonly milestoneListDisplayState: MilestoneListDisplayState
  readonly fullScreenModeState: FullScreenModeState
  readonly openSurfaceState: OpenSurfaceState
  readonly watermarkDisplayState: WatermarkDisplayState
  readonly propertiesPanelContentState: PropertiesPanelContentState
  readonly dialogueFieldDisplayState: DialogueFieldDisplayState
  readonly dualCursorModeState: DualCursorModeState
  readonly scaleMessageDisplayState: ScaleMessageDisplayState
  readonly tooltipDisplayState: TooltipDisplayState
  readonly searchPanelDisplayState: SearchPanelDisplayState
  readonly helpDisplayState: HelpDisplayState
  readonly landingMarkDisplayState: LandingMarkDisplayState
  readonly dropCueDisplayState: DropCueDisplayState
  readonly baseTimeZoneDraftState: BaseTimeZoneDraftState
  readonly timeShiftDraftState: TimeShiftDraftState
  readonly wholeScheduleShiftDraftState: WholeScheduleShiftDraftState
  readonly calendarDraftState: CalendarDraftState
}

export type ScreenValuesAxes = Omit<ScreenValues, 'screenLanguage' | 'helpLanguage' | 'rememberedActuals' | 'themePreference' | 'guideCursorMode' | 'dualCursor' | 'propertyPanelWidth'>

export type ScreenValuesEvent =
  | { readonly type: 'paletteToggled' }
  | { readonly type: 'paletteMinimizeToggled' }
  | { readonly type: 'milestoneListToggled' }
  | { readonly type: 'fullScreenEntryPressed' }
  | { readonly type: 'fullScreenChanged'; readonly isFullScreen: ScreenValuesEventCarried['isFullScreen'] }
  | { readonly type: 'surfaceEntryPressed'; readonly surfaceName: ScreenValuesEventCarried['surfaceName'] }
  | { readonly type: 'surfaceRaisedByFlow'; readonly surfaceName: ScreenValuesEventCarried['surfaceName'] }
  | { readonly type: 'flowSurfaceAnswered'; readonly surfaceName: ScreenValuesEventCarried['surfaceName'] }
  | { readonly type: 'surfaceCloseAsked'; readonly target: ScreenValuesEventCarried['target'] }
  | { readonly type: 'escapePressed'; readonly rung: ScreenValuesEventCarried['rung'] }
  | { readonly type: 'armEntryPressed'; readonly armKind: ScreenValuesEventCarried['armKind']; readonly shapeKind: ScreenValuesEventCarried['shapeKind']; readonly glyph: ScreenValuesEventCarried['glyph'] }
  | { readonly type: 'watermarkEntryPressed' }
  | { readonly type: 'watermarkUnlockAnswered'; readonly isProceeding: ScreenValuesEventCarried['isProceeding'] }
  | { readonly type: 'watermarkUnlockMatched' }
  | { readonly type: 'watermarkUnlockMismatched' }
  | { readonly type: 'settingsEntryPressed' }
  | { readonly type: 'propertiesOfChoiceAsked'; readonly subject: ScreenValuesEventCarried['subject'] }
  | { readonly type: 'selectionMoved'; readonly subject: ScreenValuesEventCarried['subject'] }
  | { readonly type: 'createdNameSettled' }
  | { readonly type: 'settleKeyPressed'; readonly hasSurfaceOrConfirmation: ScreenValuesEventCarried['hasSurfaceOrConfirmation']; readonly hasUnsettledEntry: ScreenValuesEventCarried['hasUnsettledEntry'] }
  | { readonly type: 'dialogueFieldEntryPressed'; readonly isAgentApiEnabled: ScreenValuesEventCarried['isAgentApiEnabled'] }
  | { readonly type: 'dialogueFieldMinimizeToggled' }
  | { readonly type: 'dialogueFieldMaximizeToggled' }
  | { readonly type: 'dialogueFieldClosePressed' }
  | { readonly type: 'dualCursorEntryPressed'; readonly date: ScreenValuesEventCarried['date']; readonly hasDaysToPlace: ScreenValuesEventCarried['hasDaysToPlace'] }
  | { readonly type: 'guideCursorEntryPressed'; readonly guideCursor: ScreenValuesEventCarried['guideCursor'] }
  | { readonly type: 'dualCursorPlaced'; readonly date: ScreenValuesEventCarried['date'] }
  | { readonly type: 'displayScaleStepped'; readonly percent: ScreenValuesEventCarried['percent']; readonly end: ScreenValuesEventCarried['end'] }
  | { readonly type: 'verticalZoomEndReached'; readonly percent: ScreenValuesEventCarried['percent']; readonly end: ScreenValuesEventCarried['end'] }
  | { readonly type: 'scaleMessageTimeElapsed' }
  | { readonly type: 'screenLanguageChosen'; readonly screenLanguage: ScreenValuesEventCarried['screenLanguage'] }
  | { readonly type: 'helpLanguageChosen'; readonly helpLanguage: ScreenValuesEventCarried['helpLanguage'] }
  | { readonly type: 'themePreferenceChosen'; readonly themePreference: ScreenValuesEventCarried['themePreference'] }
  | { readonly type: 'propertyPanelWidthSettled'; readonly propertyPanelWidth: ScreenValuesEventCarried['propertyPanelWidth'] }
  | { readonly type: 'progressMarkerPressed'; readonly taskUid: ScreenValuesEventCarried['taskUid']; readonly rememberedActual: ScreenValuesEventCarried['rememberedActual']; readonly writes: ScreenValuesEventCarried['writes'] }
  | { readonly type: 'hintTargetChanged' }
  | { readonly type: 'searchEntryPressed' }
  | { readonly type: 'searchPanelMinimizeToggled' }
  | { readonly type: 'searchPanelMaximizeToggled' }
  | { readonly type: 'searchPanelClosePressed' }
  | { readonly type: 'searchHitJumped' }
  | { readonly type: 'helpEntryPressed' }
  | { readonly type: 'helpMinimizeToggled' }
  | { readonly type: 'helpMaximizeToggled' }
  | { readonly type: 'continuationMarkClicked'; readonly landedLink: ScreenValuesEventCarried['landedLink']; readonly landedTarget: ScreenValuesEventCarried['landedTarget'] }
  | { readonly type: 'landingMarkClearAsked' }
  | { readonly type: 'searchJumpLanded'; readonly landedTarget: ScreenValuesEventCarried['landedTarget']; readonly landedRelatedTasks: ScreenValuesEventCarried['landedRelatedTasks'] }
  | { readonly type: 'fileDragEntered'; readonly isOpenAccepted: ScreenValuesEventCarried['isOpenAccepted'] }
  | { readonly type: 'fileDragLeft' }
  | { readonly type: 'baseTimeZoneChosen'; readonly chosenRegion: ScreenValuesEventCarried['chosenRegion']; readonly isOtherThanShownBase: ScreenValuesEventCarried['isOtherThanShownBase'] }
  | { readonly type: 'baseChangeEntryPressed'; readonly chosenWay: ScreenValuesEventCarried['chosenWay'] }
  | { readonly type: 'baseChangeCancelPressed' }
  | { readonly type: 'timeShiftAmountSettled'; readonly shiftMinutes: ScreenValuesEventCarried['shiftMinutes'] }
  | { readonly type: 'timeShiftEntryPressed' }
  | { readonly type: 'timeShiftLanded' }
  | { readonly type: 'wholeScheduleShiftDateSettled'; readonly newStartDate: ScreenValuesEventCarried['newStartDate'] }
  | { readonly type: 'wholeScheduleShiftEntryPressed' }
  | { readonly type: 'wholeScheduleShiftLanded' }
  | { readonly type: 'calendarDraftEdited'; readonly calendarDraft: ScreenValuesEventCarried['calendarDraft'] }
  | { readonly type: 'calendarApplyEntryPressed' }
  | { readonly type: 'documentReplacedByOpenOrNew' }

export type ScreenValuesEffectName =
  | 'storeScreenLanguage'
  | 'writeHelpLanguage'
  | 'writeProgressStep'
  | 'storeThemePreference'
  | 'storeGuideCursorMode'
  | 'storePropertyPanelWidth'
  | 'askBrowserForFullScreen'
  | 'tellFlowSurfaceClosed'
  | 'raiseNotice'
  | 'matchWatermarkUnlock'
  | 'clearSelection'
  | 'storeClearedDualCursor'
  | 'storePlacedDualCursorClearingGuide'
  | 'storeFixedCursorADate'
  | 'storeFixedCursorBDate'
  | 'startScaleMessageTimer'
  | 'restartScaleMessageTimer'
  | 'focusSearchWord'
  | 'seedHelpLanguage'
  | 'issueBaseChangeCommand'
  | 'raiseTimeShiftQuestion'
  | 'raiseWholeScheduleShiftQuestion'
  | 'issueCalendarCommand'

const SCREEN_VALUES_INITIAL_CHILDREN: {
  readonly 'paletteDisplayStateMachine.shown': PaletteDisplayShownState
  readonly 'dialogueFieldDisplayStateMachine.shown': DialogueFieldDisplayShownState
  readonly 'dualCursorModeStateMachine.on': DualCursorModeOnState
  readonly 'searchPanelDisplayStateMachine.shown': SearchPanelDisplayShownState
  readonly 'helpDisplayStateMachine.shown': HelpDisplayShownState
} = {
  'paletteDisplayStateMachine.shown': { kind: 'expanded' },
  'dialogueFieldDisplayStateMachine.shown': { kind: 'normal' },
  'dualCursorModeStateMachine.on': { kind: 'placingCursorA' },
  'searchPanelDisplayStateMachine.shown': { kind: 'normal' },
  'helpDisplayStateMachine.shown': { kind: 'normal' },
}

const SCREEN_VALUES_INITIAL_AXES: ScreenValuesAxes = {
  armModeState: { kind: 'notArmed' },
  paletteDisplayState: { kind: 'shown', child: SCREEN_VALUES_INITIAL_CHILDREN['paletteDisplayStateMachine.shown'] },
  milestoneListDisplayState: { kind: 'closed' },
  fullScreenModeState: { kind: 'normal' },
  openSurfaceState: { kind: 'closed' },
  watermarkDisplayState: { kind: 'shown' },
  propertiesPanelContentState: { kind: 'hidden' },
  dialogueFieldDisplayState: { kind: 'hidden' },
  dualCursorModeState: { kind: 'off' },
  scaleMessageDisplayState: { kind: 'hidden' },
  tooltipDisplayState: { kind: 'allowed' },
  searchPanelDisplayState: { kind: 'hidden' },
  helpDisplayState: { kind: 'hidden' },
  landingMarkDisplayState: { kind: 'hidden' },
  dropCueDisplayState: { kind: 'hidden' },
  baseTimeZoneDraftState: { kind: 'untouched' },
  timeShiftDraftState: { kind: 'empty' },
  wholeScheduleShiftDraftState: { kind: 'empty' },
  calendarDraftState: { kind: 'untouched' },
}
// </generated>

type ScreenStep = Step<ScreenValues, ScreenValuesEffect>

type EventOf<T extends ScreenValuesEvent['type']> = Extract<ScreenValuesEvent, { readonly type: T }>

const WATERMARK_UNLOCK_SURFACE = 'U-60'

// WHY: the two surfaces flowSurfaceAnswered answers (T-280); the open road stands still until one is answered.
const FLOW_SURFACES_AWAITING_ANSWER: ReadonlySet<string> = new Set(['U-56', 'U-61'])

const NO_REMEMBERED_ACTUALS: Readonly<Record<number, RememberedActual>> = Object.freeze({})

// see T-280, T-206, S-72
export const emptyScreenValues: ScreenValues = {
  ...SCREEN_VALUES_INITIAL_AXES,
  screenLanguage: null,
  helpLanguage: null,
  rememberedActuals: NO_REMEMBERED_ACTUALS,
  themePreference: 'light',
  guideCursorMode: 'none',
  dualCursor: null,
  propertyPanelWidth: null,
}

/** @purity pure */
function moved(
  values: ScreenValues,
  patch: Partial<ScreenValues>,
  effects: readonly ScreenValuesEffect[] = NO_EFFECTS,
): ScreenStep {
  return { state: { ...values, ...patch }, effects }
}

/** @purity pure */
function stayed(values: ScreenValues, effects: readonly ScreenValuesEffect[]): ScreenStep {
  return { state: values, effects }
}

// see T-280
/** @purity pure */
function onPaletteToggled(values: ScreenValues): ScreenStep {
  if (values.paletteDisplayState.kind === 'hidden') {
    const child = SCREEN_VALUES_INITIAL_CHILDREN['paletteDisplayStateMachine.shown']
    return moved(values, { paletteDisplayState: { kind: 'shown', child } })
  }
  return moved(values, { paletteDisplayState: { kind: 'hidden' } })
}

// see T-280
/** @purity pure */
function onPaletteMinimizeToggled(values: ScreenValues): ScreenStep {
  const palette = values.paletteDisplayState
  if (palette.kind === 'hidden') return unchanged(values)
  const kind = palette.child.kind === 'expanded' ? 'minimized' : 'expanded'
  return moved(values, { paletteDisplayState: { kind: 'shown', child: { kind } } })
}

// see T-280
/** @purity pure */
function onMilestoneListToggled(values: ScreenValues): ScreenStep {
  const kind = values.milestoneListDisplayState.kind === 'closed' ? 'open' : 'closed'
  return moved(values, { milestoneListDisplayState: { kind } })
}

// see T-280
/** @purity pure */
function onFullScreenEntryPressed(values: ScreenValues): ScreenStep {
  return stayed(values, [{ type: 'askBrowserForFullScreen' }])
}

// see T-280
/** @purity pure */
function onFullScreenChanged(values: ScreenValues, event: EventOf<'fullScreenChanged'>): ScreenStep {
  const isFull = values.fullScreenModeState.kind === 'full'
  if (isFull === event.isFullScreen) return unchanged(values)
  return moved(values, { fullScreenModeState: { kind: event.isFullScreen ? 'full' : 'normal' } })
}

/** @purity pure */
function isAnotherSurface(values: ScreenValues, surfaceName: string): boolean {
  return values.openSurfaceState.kind === 'open' && values.openSurfaceState.surfaceName !== surfaceName
}

/** @purity pure */
function isFlowAwaitingAnswer(values: ScreenValues): boolean {
  const surface = values.openSurfaceState
  return surface.kind === 'open' && FLOW_SURFACES_AWAITING_ANSWER.has(surface.surfaceName)
}

// see T-280, S-99g, RS-27
// WHY: an entrance pressed over a surface awaiting its answer is told; one raised by the flow is not.
/** @purity pure */
function surfaceOpenedOver(values: ScreenValues, surfaceName: string, isPressed: boolean): ScreenStep {
  const surface = values.openSurfaceState
  if (surface.kind === 'closed') return moved(values, { openSurfaceState: { kind: 'open', surfaceName } })
  if (!isAnotherSurface(values, surfaceName)) return unchanged(values)
  if (isFlowAwaitingAnswer(values)) {
    return isPressed ? stayed(values, [{ type: 'raiseNotice', reason: 'RS-27' }]) : unchanged(values)
  }
  return moved(values, { openSurfaceState: { kind: 'open', surfaceName } }, [
    { type: 'tellFlowSurfaceClosed', surfaceName: surface.surfaceName },
  ])
}

// see T-280
/** @purity pure */
function onSurfaceOpened(
  values: ScreenValues,
  event: EventOf<'surfaceEntryPressed'> | EventOf<'surfaceRaisedByFlow'>,
): ScreenStep {
  return surfaceOpenedOver(values, event.surfaceName, event.type === 'surfaceEntryPressed')
}

// WHY: no tellFlowSurfaceClosed; the answer already reached the file-flow region (OP-3, FR-022).
/** @purity pure */
function onFlowSurfaceAnswered(values: ScreenValues): ScreenStep {
  if (values.openSurfaceState.kind === 'closed') return unchanged(values)
  return moved(values, { openSurfaceState: { kind: 'closed' } })
}

// see T-280
/** @purity pure */
function surfaceClosed(values: ScreenValues): ScreenStep {
  const surface = values.openSurfaceState
  if (surface.kind === 'closed') return unchanged(values)
  return moved(values, { openSurfaceState: { kind: 'closed' } }, [
    { type: 'tellFlowSurfaceClosed', surfaceName: surface.surfaceName },
  ])
}

// see T-280
/** @purity pure */
function propertiesPutAway(values: ScreenValues): ScreenStep {
  if (values.propertiesPanelContentState.kind === 'hidden') return unchanged(values)
  return moved(values, { propertiesPanelContentState: { kind: 'hidden' } })
}

/** @purity pure */
function onSurfaceCloseAsked(values: ScreenValues, event: EventOf<'surfaceCloseAsked'>): ScreenStep {
  if (event.target === 'helpModal') return helpHidden(values)
  if (values.openSurfaceState.kind === 'closed' && values.propertiesPanelContentState.kind === 'hidden') return unchanged(values)
  return event.target === 'surface' ? surfaceClosed(values) : propertiesPutAway(values)
}

/** @purity pure */
function surfaceRungConsumed(values: ScreenValues): ScreenStep {
  const isPanelTopmost = values.openSurfaceState.kind === 'closed'
  return isPanelTopmost ? propertiesPutAway(values) : surfaceClosed(values)
}

/** @purity pure */
function disarmed(values: ScreenValues): ScreenStep {
  if (values.armModeState.kind === 'notArmed') return unchanged(values)
  return moved(values, { armModeState: { kind: 'notArmed' } })
}

// see T-280
/** @purity pure */
function dualCursorCleared(values: ScreenValues): ScreenStep {
  if (values.dualCursorModeState.kind === 'off') return unchanged(values)
  return moved(values, { dualCursorModeState: { kind: 'off' }, dualCursor: null }, [{ type: 'storeClearedDualCursor' }])
}

/** @purity pure */
function tooltipDismissed(values: ScreenValues): ScreenStep {
  if (values.tooltipDisplayState.kind === 'dismissed') return unchanged(values)
  return moved(values, { tooltipDisplayState: { kind: 'dismissed' } })
}

export type ToggleableWindowKey = 'searchPanelDisplayState' | 'helpDisplayState' | 'dialogueFieldDisplayState'

// see RG-16, HN-2, T-335
/** @purity pure */
export function isWindowStandingIn(values: ScreenValues, key: ToggleableWindowKey): boolean {
  const display = values[key]
  return display.kind === 'shown' && display.child.kind !== 'minimized'
}

// see S-99g, HN-1, HN-2, HN-3
/** @purity pure */
export function isHelpStandingIn(values: ScreenValues): boolean {
  return isWindowStandingIn(values, 'helpDisplayState')
}

/** @purity pure */
function windowRungConsumed(values: ScreenValues, key: ToggleableWindowKey): ScreenStep {
  if (!isWindowStandingIn(values, key)) return unchanged(values)
  return moved(values, { [key]: { kind: 'hidden' } } as Partial<ScreenValues>)
}

// see T-280, IN-4, RG-16
/** @purity pure */
function onEscapePressed(values: ScreenValues, event: EventOf<'escapePressed'>): ScreenStep {
  if (event.rung === 'searchPanel') return windowRungConsumed(values, 'searchPanelDisplayState')
  if (event.rung === 'surface') return surfaceRungConsumed(values)
  if (event.rung === 'helpModal') return windowRungConsumed(values, 'helpDisplayState')
  if (event.rung === 'dialogueField') return windowRungConsumed(values, 'dialogueFieldDisplayState')
  if (event.rung === 'armed') return disarmed(values)
  if (event.rung === 'dualCursorMode') return dualCursorCleared(values)
  if (event.rung === 'tooltip') return tooltipDismissed(values)
  return unchanged(values)
}

/** @purity pure */
function required<T>(value: T | null, name: string): T {
  if (value === null) throw new RangeError(`armEntryPressed carries no ${name}`)
  return value
}

const ARMED_BY_KIND: {
  readonly [K in ArmKind]: (event: EventOf<'armEntryPressed'>) => ArmModeState
} = {
  taskShapeArmed: (event) => ({ kind: 'taskShapeArmed', shapeKind: required(event.shapeKind, 'shapeKind') }),
  milestoneShapeArmed: (event) => ({ kind: 'milestoneShapeArmed', glyph: required(event.glyph, 'glyph') }),
  dependencyArmed: () => ({ kind: 'dependencyArmed' }),
  commentBoxArmed: () => ({ kind: 'commentBoxArmed' }),
  highlightBoxArmed: () => ({ kind: 'highlightBoxArmed' }),
  parentTaskArmed: () => ({ kind: 'parentTaskArmed' }),
}

/** @purity pure */
function carriedArmOf(armed: ArmModeState): string | null {
  switch (armed.kind) {
    case 'taskShapeArmed':
      return armed.shapeKind
    case 'milestoneShapeArmed':
      return armed.glyph
    case 'notArmed':
    case 'dependencyArmed':
    case 'commentBoxArmed':
    case 'highlightBoxArmed':
    case 'parentTaskArmed':
      return null
    default:
      return assertNever(armed)
  }
}

// see T-280, FR-016
/** @purity pure */
function onArmEntryPressed(values: ScreenValues, event: EventOf<'armEntryPressed'>): ScreenStep {
  const entered = ARMED_BY_KIND[event.armKind](event)
  const current = values.armModeState
  const isSameArm = current.kind === entered.kind && carriedArmOf(current) === carriedArmOf(entered)
  return moved(values, { armModeState: isSameArm ? { kind: 'notArmed' } : entered })
}

// see T-280
/** @purity pure */
function onWatermarkEntryPressed(values: ScreenValues): ScreenStep {
  if (values.watermarkDisplayState.kind === 'hidden') return moved(values, { watermarkDisplayState: { kind: 'shown' } })
  return surfaceOpenedOver(values, WATERMARK_UNLOCK_SURFACE, true)
}

/** @purity pure */
function isWatermarkUnlockSurface(values: ScreenValues): boolean {
  return values.openSurfaceState.kind === 'open' && values.openSurfaceState.surfaceName === WATERMARK_UNLOCK_SURFACE
}

// see T-280
/** @purity pure */
function onWatermarkUnlockAnswered(
  values: ScreenValues,
  event: EventOf<'watermarkUnlockAnswered'>,
): ScreenStep {
  if (!isWatermarkUnlockSurface(values)) return unchanged(values)
  if (event.isProceeding) return stayed(values, [{ type: 'matchWatermarkUnlock' }])
  return moved(values, { openSurfaceState: { kind: 'closed' } })
}

// see T-280
/** @purity pure */
function onWatermarkUnlockMatched(values: ScreenValues): ScreenStep {
  if (values.watermarkDisplayState.kind === 'hidden' || !isWatermarkUnlockSurface(values)) {
    return unchanged(values)
  }
  return moved(values, { watermarkDisplayState: { kind: 'hidden' }, openSurfaceState: { kind: 'closed' } })
}

// see T-280
/** @purity pure */
function onWatermarkUnlockMismatched(values: ScreenValues): ScreenStep {
  if (!isWatermarkUnlockSurface(values)) return unchanged(values)
  return stayed(values, [{ type: 'raiseNotice', reason: 'RS-41' }])
}

// see T-280, FR-072, IC-17
/** @purity pure */
function onSettingsEntryPressed(values: ScreenValues): ScreenStep {
  const properties = values.propertiesPanelContentState
  if (properties.kind === 'documentSettingsDisplayed') {
    return moved(values, { propertiesPanelContentState: { kind: 'hidden' } })
  }
  return moved(values, { propertiesPanelContentState: { kind: 'documentSettingsDisplayed' } })
}

// see T-280
/** @purity pure */
function onPropertiesOfChoiceAsked(
  values: ScreenValues,
  event: EventOf<'propertiesOfChoiceAsked'>,
): ScreenStep {
  return moved(values, { propertiesPanelContentState: { kind: 'selectionDisplayed', subject: event.subject } })
}

// see T-280
/** @purity pure */
function onSelectionMoved(values: ScreenValues, event: EventOf<'selectionMoved'>): ScreenStep {
  if (values.propertiesPanelContentState.kind === 'hidden') return unchanged(values)
  const subject = event.subject
  const hasChoice = subject.selection.items.length > 0 || subject.taskGroupIds.length > 0
  if (!hasChoice) return unchanged(values)
  return moved(values, { propertiesPanelContentState: { kind: 'selectionDisplayed', subject } })
}

// see T-280
/** @purity pure */
function onCreatedNameSettled(values: ScreenValues): ScreenStep {
  const effects: readonly ScreenValuesEffect[] = [{ type: 'clearSelection' }]
  if (values.propertiesPanelContentState.kind === 'hidden') return stayed(values, effects)
  return moved(values, { propertiesPanelContentState: { kind: 'hidden' } }, effects)
}

// see T-280
/** @purity pure */
function onSettleKeyPressed(values: ScreenValues, event: EventOf<'settleKeyPressed'>): ScreenStep {
  if (values.propertiesPanelContentState.kind === 'hidden') return unchanged(values)
  if (event.hasSurfaceOrConfirmation || event.hasUnsettledEntry) return unchanged(values)
  return propertiesPutAway(values)
}

// see T-280
/** @purity pure */
function onDialogueFieldEntryPressed(
  values: ScreenValues,
  event: EventOf<'dialogueFieldEntryPressed'>,
): ScreenStep {
  const field = values.dialogueFieldDisplayState
  if (field.kind === 'shown' && event.isAgentApiEnabled) return dialogueFieldHidden(values)
  // WHY: while Agent API is off the same press enables it (FR-066), so a shown field is shown again in WB-1.
  if (field.kind === 'shown' && field.child.kind === 'normal') return unchanged(values)
  const child = SCREEN_VALUES_INITIAL_CHILDREN['dialogueFieldDisplayStateMachine.shown']
  return moved(values, { dialogueFieldDisplayState: { kind: 'shown', child } })
}

// see T-280, FR-066
/** @purity pure */
function dialogueFieldHidden(values: ScreenValues): ScreenStep {
  if (values.dialogueFieldDisplayState.kind === 'hidden') return unchanged(values)
  return moved(values, { dialogueFieldDisplayState: { kind: 'hidden' } })
}

// see T-280, FR-016
/** @purity pure */
function onDualCursorEntryPressed(
  values: ScreenValues,
  event: EventOf<'dualCursorEntryPressed'>,
): ScreenStep {
  if (values.dualCursorModeState.kind === 'on') return dualCursorCleared(values)
  if (!event.hasDaysToPlace) return unchanged(values)
  const child = SCREEN_VALUES_INITIAL_CHILDREN['dualCursorModeStateMachine.on']
  const armed = values.armModeState.kind === 'notArmed' ? values.armModeState : ({ kind: 'notArmed' } as const)
  // WHY: the event carries the one date DC-1 places; cursorADate follows the pointer until DC-2 fixes it.
  const dualCursor = { cursorADate: event.date, cursorBDate: event.date }
  return moved(
    values,
    { dualCursorModeState: { kind: 'on', child }, armModeState: armed, dualCursor, guideCursorMode: 'none' },
    [{ type: 'storePlacedDualCursorClearingGuide', date: event.date }],
  )
}

// see DC-9, FR-048, T-280
/** @purity pure */
function onGuideCursorEntryPressed(
  values: ScreenValues,
  event: EventOf<'guideCursorEntryPressed'>,
): ScreenStep {
  const guideCursorMode = values.guideCursorMode === event.guideCursor ? 'none' : event.guideCursor
  const stored: ScreenValuesEffect = { type: 'storeGuideCursorMode', guideCursorMode }
  if (values.dualCursorModeState.kind === 'off') return moved(values, { guideCursorMode }, [stored])
  return moved(values, { dualCursorModeState: { kind: 'off' }, dualCursor: null, guideCursorMode }, [
    { type: 'storeClearedDualCursor' },
    stored,
  ])
}

// see DC-2, T-280
/** @purity pure */
function onDualCursorPlaced(values: ScreenValues, event: EventOf<'dualCursorPlaced'>): ScreenStep {
  const mode = values.dualCursorModeState
  if (mode.kind === 'off') return unchanged(values)
  const held = values.dualCursor ?? { cursorADate: event.date, cursorBDate: event.date }
  if (mode.child.kind === 'placingCursorA') {
    const child = { kind: 'placingCursorB' } as const
    return moved(values, { dualCursorModeState: { kind: 'on', child }, dualCursor: { ...held, cursorADate: event.date } }, [
      { type: 'storeFixedCursorADate', date: event.date },
    ])
  }
  const child = { kind: 'placingCursorA' } as const
  return moved(values, { dualCursorModeState: { kind: 'on', child }, dualCursor: { ...held, cursorBDate: event.date } }, [
    { type: 'storeFixedCursorBDate', date: event.date },
  ])
}

// see T-280
/** @purity pure */
function onScaleMessageRaised(
  values: ScreenValues,
  event: EventOf<'displayScaleStepped'> | EventOf<'verticalZoomEndReached'>,
): ScreenStep {
  const timer = values.scaleMessageDisplayState.kind === 'hidden' ? 'startScaleMessageTimer' : 'restartScaleMessageTimer'
  const scaleMessage = { kind: 'shown', percent: event.percent, end: event.end } as const
  return moved(values, { scaleMessageDisplayState: scaleMessage }, [{ type: timer }])
}

// see T-280
/** @purity pure */
function onScaleMessageTimeElapsed(values: ScreenValues): ScreenStep {
  if (values.scaleMessageDisplayState.kind === 'hidden') return unchanged(values)
  return moved(values, { scaleMessageDisplayState: { kind: 'hidden' } })
}

// see T-280
/** @purity pure */
function onScreenLanguageChosen(
  values: ScreenValues,
  event: EventOf<'screenLanguageChosen'>,
): ScreenStep {
  const screenLanguage = event.screenLanguage
  return moved(values, { screenLanguage }, [{ type: 'storeScreenLanguage', screenLanguage }])
}

// see S-434, FR-038, T-280
/** @purity pure */
function onHelpLanguageChosen(values: ScreenValues, event: EventOf<'helpLanguageChosen'>): ScreenStep {
  const helpLanguage = event.helpLanguage
  return moved(values, { helpLanguage }, [{ type: 'writeHelpLanguage', helpLanguage }])
}

// see S-72, FR-039, T-280
/** @purity pure */
function onThemePreferenceChosen(
  values: ScreenValues,
  event: EventOf<'themePreferenceChosen'>,
): ScreenStep {
  const themePreference = event.themePreference
  return moved(values, { themePreference }, [{ type: 'storeThemePreference', themePreference }])
}

// see S-171, FR-052, T-280
/** @purity pure */
function onPropertyPanelWidthSettled(
  values: ScreenValues,
  event: EventOf<'propertyPanelWidthSettled'>,
): ScreenStep {
  const propertyPanelWidth = event.propertyPanelWidth
  return moved(values, { propertyPanelWidth }, [{ type: 'storePropertyPanelWidth', propertyPanelWidth }])
}

// see T-280, PV-4
/** @purity pure */
function onProgressMarkerPressed(
  values: ScreenValues,
  event: EventOf<'progressMarkerPressed'>,
): ScreenStep {
  const held = values.rememberedActuals
  const kept = Object.entries(held).filter(([uid]) => Number(uid) !== event.taskUid)
  const remembered = event.rememberedActual
  const rememberedActuals =
    remembered === null ? Object.fromEntries(kept) : { ...held, [event.taskUid]: remembered }
  return moved(values, { rememberedActuals }, [
    { type: 'writeProgressStep', taskUid: event.taskUid, writes: event.writes },
  ])
}

// see T-280
/** @purity pure */
function onHintTargetChanged(values: ScreenValues): ScreenStep {
  if (values.tooltipDisplayState.kind === 'allowed') return unchanged(values)
  return moved(values, { tooltipDisplayState: { kind: 'allowed' } })
}

// see T-280, EL-16
/** @purity pure */
function onContinuationMarkClicked(
  values: ScreenValues,
  event: EventOf<'continuationMarkClicked'>,
): ScreenStep {
  const { landedLink, landedTarget } = event
  return moved(values, { landingMarkDisplayState: { kind: 'shown', landedBy: 'continuationMark', landedLink, landedTarget, landedRelatedTasks: [] } })
}

// see T-280, SJ-10
/** @purity pure */
function onSearchJumpLanded(values: ScreenValues, event: EventOf<'searchJumpLanded'>): ScreenStep {
  const { landedTarget, landedRelatedTasks } = event
  return moved(values, { landingMarkDisplayState: { kind: 'shown', landedBy: 'jump', landedLink: null, landedTarget, landedRelatedTasks } })
}

// see T-280, EL-17
/** @purity pure */
function onLandingMarkClearAsked(values: ScreenValues): ScreenStep {
  if (values.landingMarkDisplayState.kind === 'hidden') return unchanged(values)
  return moved(values, { landingMarkDisplayState: { kind: 'hidden' } })
}

// see T-280, OP-17
/** @purity pure */
function onFileDragEntered(values: ScreenValues, event: EventOf<'fileDragEntered'>): ScreenStep {
  if (!event.isOpenAccepted || values.dropCueDisplayState.kind === 'shown') return unchanged(values)
  return moved(values, { dropCueDisplayState: { kind: 'shown' } })
}

/** @purity pure */
function onFileDragLeft(values: ScreenValues): ScreenStep {
  if (values.dropCueDisplayState.kind === 'hidden') return unchanged(values)
  return moved(values, { dropCueDisplayState: { kind: 'hidden' } })
}

type WindowShownKind = SearchPanelDisplayShownState['kind'] &
  HelpDisplayShownState['kind'] &
  DialogueFieldDisplayShownState['kind']

const FOCUS_SEARCH_WORD: readonly ScreenValuesEffect[] = [{ type: 'focusSearchWord' }]

const MINIMIZE_TOGGLED_TO: { readonly [K in WindowShownKind]: WindowShownKind } = {
  normal: 'minimized',
  minimized: 'normal',
  maximized: 'minimized',
}

const MAXIMIZE_TOGGLED_TO: { readonly [K in WindowShownKind]: WindowShownKind } = {
  normal: 'maximized',
  minimized: 'maximized',
  maximized: 'normal',
}

// see T-280, SV-2
/** @purity pure */
function onSearchEntryPressed(values: ScreenValues): ScreenStep {
  const panel = values.searchPanelDisplayState
  if (panel.kind === 'shown' && panel.child.kind !== 'minimized') return stayed(values, FOCUS_SEARCH_WORD)
  const child = SCREEN_VALUES_INITIAL_CHILDREN['searchPanelDisplayStateMachine.shown']
  return moved(values, { searchPanelDisplayState: { kind: 'shown', child } }, FOCUS_SEARCH_WORD)
}

// see T-280, T-335
/** @purity pure */
function windowDisplayToggled(
  values: ScreenValues,
  key: ToggleableWindowKey,
  toggledTo: { readonly [K in WindowShownKind]: WindowShownKind },
): ScreenStep {
  const display = values[key]
  if (display.kind === 'hidden') return unchanged(values)
  const child = { kind: toggledTo[display.child.kind] }
  return moved(values, { [key]: { kind: 'shown', child } } as Partial<ScreenValues>)
}

// see T-280, SV-14
/** @purity pure */
function onSearchPanelClosePressed(values: ScreenValues): ScreenStep {
  if (values.searchPanelDisplayState.kind === 'hidden') return unchanged(values)
  return moved(values, { searchPanelDisplayState: { kind: 'hidden' } })
}

// see T-280, SJ-3
/** @purity pure */
function onSearchHitJumped(values: ScreenValues): ScreenStep {
  const panel = values.searchPanelDisplayState
  if (panel.kind === 'hidden' || panel.child.kind !== 'maximized') return unchanged(values)
  const child = SCREEN_VALUES_INITIAL_CHILDREN['searchPanelDisplayStateMachine.shown']
  return moved(values, { searchPanelDisplayState: { kind: 'shown', child } })
}

// see T-280, FR-036, FR-038, WB-1
/** @purity pure */
function onHelpEntryPressed(values: ScreenValues): ScreenStep {
  const help = values.helpDisplayState
  const child = SCREEN_VALUES_INITIAL_CHILDREN['helpDisplayStateMachine.shown']
  if (help.kind === 'hidden') {
    const seeded = { helpDisplayState: { kind: 'shown', child }, helpLanguage: values.screenLanguage } as const
    return moved(values, seeded, [{ type: 'seedHelpLanguage' }])
  }
  if (help.child.kind !== 'minimized') return unchanged(values)
  return moved(values, { helpDisplayState: { kind: 'shown', child } })
}

/** @purity pure */
function helpHidden(values: ScreenValues): ScreenStep {
  if (values.helpDisplayState.kind === 'hidden') return unchanged(values)
  return moved(values, { helpDisplayState: { kind: 'hidden' } })
}

const HOLIDAY_SETTINGS_SURFACE = 'U-65'

// see T-280, FR-156, FO-14
// WHY: choosing the shown base again drops the draft -- the answers show only for another time zone (X-j).
/** @purity pure */
function onBaseTimeZoneChosen(values: ScreenValues, event: EventOf<'baseTimeZoneChosen'>): ScreenStep {
  const held = values.baseTimeZoneDraftState
  if (!event.isOtherThanShownBase) {
    return held.kind === 'untouched' ? unchanged(values) : moved(values, { baseTimeZoneDraftState: { kind: 'untouched' } })
  }
  if (held.kind === 'drafted' && held.chosenRegion === event.chosenRegion) return unchanged(values)
  return moved(values, { baseTimeZoneDraftState: { kind: 'drafted', chosenRegion: event.chosenRegion } })
}

// see T-280, FR-156, FO-14, CM-94, CM-95
/** @purity pure */
function onBaseChangeEntryPressed(values: ScreenValues, event: EventOf<'baseChangeEntryPressed'>): ScreenStep {
  const held = values.baseTimeZoneDraftState
  if (held.kind === 'untouched') return unchanged(values)
  return moved(values, { baseTimeZoneDraftState: { kind: 'untouched' } }, [
    { type: 'issueBaseChangeCommand', chosenRegion: held.chosenRegion, chosenWay: event.chosenWay },
  ])
}

// see T-280, FR-156, FO-14
/** @purity pure */
function onBaseChangeCancelPressed(values: ScreenValues): ScreenStep {
  if (values.baseTimeZoneDraftState.kind === 'untouched') return unchanged(values)
  return moved(values, { baseTimeZoneDraftState: { kind: 'untouched' } })
}

// see T-280, FR-157, FO-16
/** @purity pure */
function onTimeShiftAmountSettled(values: ScreenValues, event: EventOf<'timeShiftAmountSettled'>): ScreenStep {
  const held = values.timeShiftDraftState
  const isShiftZero = event.shiftMinutes === 0
  if (isShiftZero) return held.kind === 'empty' ? unchanged(values) : moved(values, { timeShiftDraftState: { kind: 'empty' } })
  if (held.kind === 'amountHeld' && held.shiftMinutes === event.shiftMinutes) return unchanged(values)
  return moved(values, { timeShiftDraftState: { kind: 'amountHeld', shiftMinutes: event.shiftMinutes } })
}

// see T-280, FR-157, IC-162, QN-14
/** @purity pure */
function onTimeShiftEntryPressed(values: ScreenValues): ScreenStep {
  const held = values.timeShiftDraftState
  if (held.kind === 'empty') return unchanged(values)
  return stayed(values, [{ type: 'raiseTimeShiftQuestion', shiftMinutes: held.shiftMinutes }])
}

/** @purity pure */
function onTimeShiftLanded(values: ScreenValues): ScreenStep {
  if (values.timeShiftDraftState.kind === 'empty') return unchanged(values)
  return moved(values, { timeShiftDraftState: { kind: 'empty' } })
}

// see T-280, FR-159, FO-17
/** @purity pure */
function onWholeScheduleShiftDateSettled(values: ScreenValues, event: EventOf<'wholeScheduleShiftDateSettled'>): ScreenStep {
  const held = values.wholeScheduleShiftDraftState
  const isNewStartDateEmpty = event.newStartDate === ''
  if (isNewStartDateEmpty) return held.kind === 'empty' ? unchanged(values) : moved(values, { wholeScheduleShiftDraftState: { kind: 'empty' } })
  if (held.kind === 'dateHeld' && held.newStartDate === event.newStartDate) return unchanged(values)
  return moved(values, { wholeScheduleShiftDraftState: { kind: 'dateHeld', newStartDate: event.newStartDate } })
}

// see T-280, FR-159, WH-12, QN-15
/** @purity pure */
function onWholeScheduleShiftEntryPressed(values: ScreenValues): ScreenStep {
  const held = values.wholeScheduleShiftDraftState
  if (held.kind === 'empty') return unchanged(values)
  return stayed(values, [{ type: 'raiseWholeScheduleShiftQuestion', newStartDate: held.newStartDate }])
}

/** @purity pure */
function onWholeScheduleShiftLanded(values: ScreenValues): ScreenStep {
  if (values.wholeScheduleShiftDraftState.kind === 'empty') return unchanged(values)
  return moved(values, { wholeScheduleShiftDraftState: { kind: 'empty' } })
}

// see T-280, FR-088
/** @purity pure */
function onCalendarDraftEdited(values: ScreenValues, event: EventOf<'calendarDraftEdited'>): ScreenStep {
  const held = values.calendarDraftState
  if (held.kind === 'drafted' && held.calendarDraft === event.calendarDraft) return unchanged(values)
  return moved(values, { calendarDraftState: { kind: 'drafted', calendarDraft: event.calendarDraft } })
}

// see T-280, FR-088, IC-138, WC-7, WC-10, CM-39
/** @purity pure */
function onCalendarApplyEntryPressed(values: ScreenValues): ScreenStep {
  const held = values.calendarDraftState
  if (held.kind === 'untouched' || hasCalendarDraftRefusal(held.calendarDraft)) return unchanged(values)
  return moved(values, { calendarDraftState: { kind: 'untouched' } }, [
    { type: 'issueCalendarCommand', calendarDraft: held.calendarDraft },
  ])
}

type DraftAxes = Pick<ScreenValues, 'baseTimeZoneDraftState' | 'timeShiftDraftState' | 'wholeScheduleShiftDraftState' | 'calendarDraftState'>

/** @purity pure */
function settingsDraftsDropped(values: ScreenValues): Partial<DraftAxes> {
  return {
    ...(values.baseTimeZoneDraftState.kind === 'untouched' ? {} : { baseTimeZoneDraftState: { kind: 'untouched' } }),
    ...(values.timeShiftDraftState.kind === 'empty' ? {} : { timeShiftDraftState: { kind: 'empty' } }),
    ...(values.wholeScheduleShiftDraftState.kind === 'empty' ? {} : { wholeScheduleShiftDraftState: { kind: 'empty' } }),
  }
}

/** @purity pure */
function calendarDraftDropped(values: ScreenValues): Partial<DraftAxes> {
  return values.calendarDraftState.kind === 'untouched' ? {} : { calendarDraftState: { kind: 'untouched' } }
}

/** @purity pure */
function isShowingDocumentSettings(values: ScreenValues): boolean {
  return values.propertiesPanelContentState.kind === 'documentSettingsDisplayed'
}

/** @purity pure */
function isShowingHolidaySettings(values: ScreenValues): boolean {
  const surface = values.openSurfaceState
  return surface.kind === 'open' && surface.surfaceName === HOLIDAY_SETTINGS_SURFACE
}

// see T-280, FR-156, FR-157, FR-159, FR-088
// WHY: isLeavingDocumentSettings and isLeavingHolidaySettings are read off the step the event already took.
/** @purity pure */
function draftsLeftBehind(before: ScreenValues, step: ScreenStep): ScreenStep {
  const after = step.state
  const isLeavingDocumentSettings = isShowingDocumentSettings(before) && !isShowingDocumentSettings(after)
  const isLeavingHolidaySettings = isShowingHolidaySettings(before) && !isShowingHolidaySettings(after)
  const patch: Partial<DraftAxes> = {
    ...(isLeavingDocumentSettings ? settingsDraftsDropped(after) : {}),
    ...(isLeavingHolidaySettings ? calendarDraftDropped(after) : {}),
  }
  return Object.keys(patch).length === 0 ? step : { state: { ...after, ...patch }, effects: step.effects }
}

/** @purity pure */
function leavingDrafts<E>(
  handler: (values: ScreenValues, event: E) => ScreenStep,
): (values: ScreenValues, event: E) => ScreenStep {
  return (values, event) => draftsLeftBehind(values, handler(values, event))
}

// see T-280, RD-4, RD-7
/** @purity pure */
function onDocumentReplacedByOpenOrNew(values: ScreenValues): ScreenStep {
  const patch = { ...settingsDraftsDropped(values), ...calendarDraftDropped(values) }
  return Object.keys(patch).length === 0 ? unchanged(values) : moved(values, patch)
}

// WHY: a table, not a switch that would cross the size band; the mapped type still refuses a missing event.
const HANDLERS: {
  readonly [T in ScreenValuesEvent['type']]: (values: ScreenValues, event: EventOf<T>) => ScreenStep
} = {
  paletteToggled: onPaletteToggled,
  paletteMinimizeToggled: onPaletteMinimizeToggled,
  milestoneListToggled: onMilestoneListToggled,
  fullScreenEntryPressed: onFullScreenEntryPressed,
  fullScreenChanged: onFullScreenChanged,
  surfaceEntryPressed: leavingDrafts(onSurfaceOpened),
  surfaceRaisedByFlow: leavingDrafts(onSurfaceOpened),
  flowSurfaceAnswered: onFlowSurfaceAnswered,
  surfaceCloseAsked: leavingDrafts(onSurfaceCloseAsked),
  escapePressed: leavingDrafts(onEscapePressed),
  armEntryPressed: onArmEntryPressed,
  watermarkEntryPressed: leavingDrafts(onWatermarkEntryPressed),
  watermarkUnlockAnswered: onWatermarkUnlockAnswered,
  watermarkUnlockMatched: onWatermarkUnlockMatched,
  watermarkUnlockMismatched: onWatermarkUnlockMismatched,
  settingsEntryPressed: leavingDrafts(onSettingsEntryPressed),
  propertiesOfChoiceAsked: leavingDrafts(onPropertiesOfChoiceAsked),
  selectionMoved: leavingDrafts(onSelectionMoved),
  createdNameSettled: leavingDrafts(onCreatedNameSettled),
  settleKeyPressed: leavingDrafts(onSettleKeyPressed),
  dialogueFieldEntryPressed: onDialogueFieldEntryPressed,
  dialogueFieldMinimizeToggled: (values) => windowDisplayToggled(values, 'dialogueFieldDisplayState', MINIMIZE_TOGGLED_TO),
  dialogueFieldMaximizeToggled: (values) => windowDisplayToggled(values, 'dialogueFieldDisplayState', MAXIMIZE_TOGGLED_TO),
  dialogueFieldClosePressed: dialogueFieldHidden,
  dualCursorEntryPressed: onDualCursorEntryPressed,
  guideCursorEntryPressed: onGuideCursorEntryPressed,
  dualCursorPlaced: onDualCursorPlaced,
  displayScaleStepped: onScaleMessageRaised,
  verticalZoomEndReached: onScaleMessageRaised,
  scaleMessageTimeElapsed: onScaleMessageTimeElapsed,
  screenLanguageChosen: onScreenLanguageChosen,
  helpLanguageChosen: onHelpLanguageChosen,
  themePreferenceChosen: onThemePreferenceChosen,
  propertyPanelWidthSettled: onPropertyPanelWidthSettled,
  progressMarkerPressed: onProgressMarkerPressed,
  hintTargetChanged: onHintTargetChanged,
  searchEntryPressed: onSearchEntryPressed,
  searchPanelMinimizeToggled: (values) => windowDisplayToggled(values, 'searchPanelDisplayState', MINIMIZE_TOGGLED_TO),
  searchPanelMaximizeToggled: (values) => windowDisplayToggled(values, 'searchPanelDisplayState', MAXIMIZE_TOGGLED_TO),
  searchPanelClosePressed: onSearchPanelClosePressed,
  searchHitJumped: onSearchHitJumped,
  helpEntryPressed: onHelpEntryPressed,
  helpMinimizeToggled: (values) => windowDisplayToggled(values, 'helpDisplayState', MINIMIZE_TOGGLED_TO),
  helpMaximizeToggled: (values) => windowDisplayToggled(values, 'helpDisplayState', MAXIMIZE_TOGGLED_TO),
  continuationMarkClicked: onContinuationMarkClicked,
  landingMarkClearAsked: onLandingMarkClearAsked,
  searchJumpLanded: onSearchJumpLanded,
  fileDragEntered: onFileDragEntered,
  fileDragLeft: onFileDragLeft,
  baseTimeZoneChosen: onBaseTimeZoneChosen,
  baseChangeEntryPressed: onBaseChangeEntryPressed,
  baseChangeCancelPressed: onBaseChangeCancelPressed,
  timeShiftAmountSettled: onTimeShiftAmountSettled,
  timeShiftEntryPressed: onTimeShiftEntryPressed,
  timeShiftLanded: onTimeShiftLanded,
  wholeScheduleShiftDateSettled: onWholeScheduleShiftDateSettled,
  wholeScheduleShiftEntryPressed: onWholeScheduleShiftEntryPressed,
  wholeScheduleShiftLanded: onWholeScheduleShiftLanded,
  calendarDraftEdited: onCalendarDraftEdited,
  calendarApplyEntryPressed: onCalendarApplyEntryPressed,
  documentReplacedByOpenOrNew: onDocumentReplacedByOpenOrNew,
}

// see SF-2, SF-8, T-280
/** @purity pure */
export function stepScreenValues(values: ScreenValues, event: ScreenValuesEvent): ScreenStep {
  const handler = HANDLERS[event.type] as (values: ScreenValues, event: ScreenValuesEvent) => ScreenStep
  return handler(values, event)
}
