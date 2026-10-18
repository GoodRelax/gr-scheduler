// Runs the presentation-group commands against the document.
// @unit      UF-18  (docs/spec/05-07-design.md, table T-075)
// @component EditDocument, layer UseCase (table T-062)
// @purity    pure

import type { Document } from '../../entity/document-model/document/document'
import {
  SETTINGS_CONSTANTS,
  SETTINGS_DERIVED,
  type DocumentSettings,
  type TableViews,
} from '../../entity/document-model/document-settings/document-settings'
import {
  compareDays,
  dayOf,
  isStandardTimeZoneKey,
  isTimeZoneKey,
  textOfDayEnd,
  textOfDayStart,
  type Schedule,
  type TaskGroup,
} from '../../entity/document-model/schedule/schedule'
import { displayRatioOf } from '../../entity/layout-engine/screen-regions/screen-regions'
import type { EditResult } from './edit-document'
import { refused, edited, reject } from './edit-document'
import type { ProjectCommand } from './edit-project'

// see FR-016, FR-052, T-206
export interface SettingsLimits {
  readonly zoomMin: number
  readonly zoomMax: number
  // TRAP: never rebuild this from a window width here; regionsFromScreen owns that arithmetic.
  readonly taskGroupAreaWidthWithoutPanels: number
}

// <generated -- do not edit by hand>
// From docs/spec/_source/document-commands.json (table T-108, DocumentSettingsCommand).
// see T-108
export interface TableView {
  readonly visibility: { readonly shownTaskUids: readonly number[]; readonly shownResourceUids: readonly number[]; readonly isUnassignedShown: boolean; readonly isScheduleFilterApplied: boolean }
  readonly columnFilters: readonly ColumnFilter[]
  readonly sort: ColumnSort | null
}

// see T-108
export type DocumentSettingsCommand =
  | { readonly kind: 'setStackDirection'; readonly stackDirection: DocumentSettings['stackDirection'] }
  | {
      readonly kind: 'setVisibilitySetting'
      readonly setting: 'isBaselineVisible' | 'isPlanVisible' | 'isActualVisible' | 'isProgressLineVisible' | 'isProgressMarkerVisible' | 'isDateGridLinesVisible' | 'isGroupGridLinesVisible' | 'isAssigneeVisible' | 'isPercentCompleteVisible' | 'isDependencyVisible' | 'isPlanDatesVisible'
      readonly isVisible: boolean
    }
  | { readonly kind: 'setFontSizeStep'; readonly fontSizeStep: DocumentSettings['fontSizeStep'] }
  | { readonly kind: 'setThemeMonochrome'; readonly isThemeMonochrome: DocumentSettings['isThemeMonochrome'] }
  | {
      readonly kind: 'setZoom'
      readonly zoomX: DocumentSettings['zoomX']
      readonly zoomY: DocumentSettings['zoomY']
    }
  | {
      readonly kind: 'setScrollPosition'
      readonly scrollDate: DocumentSettings['scrollDate']
      readonly scrollTaskGroupId: DocumentSettings['scrollTaskGroupId']
      readonly scrollDateFraction: DocumentSettings['scrollDateFraction']
      readonly scrollTaskGroupFraction: DocumentSettings['scrollTaskGroupFraction']
    }
  | {
      readonly kind: 'setTaskGroupPanelWidthPx'
      readonly taskGroupPanelWidthPx: DocumentSettings['taskGroupPanelWidthPx']
    }
  | { readonly kind: 'pinTaskGroup'; readonly taskGroupId: TaskGroup['id'] }
  | { readonly kind: 'unpinTaskGroup'; readonly taskGroupId: TaskGroup['id'] }
  | {
      readonly kind: 'fitScheduleToScreen'
      readonly zoomX: DocumentSettings['zoomX']
      readonly zoomY: DocumentSettings['zoomY']
      readonly scrollDate: DocumentSettings['scrollDate']
      readonly scrollTaskGroupId: DocumentSettings['scrollTaskGroupId']
      readonly scrollDateFraction: DocumentSettings['scrollDateFraction']
      readonly scrollTaskGroupFraction: DocumentSettings['scrollTaskGroupFraction']
    }
  | { readonly kind: 'setDisplayScale'; readonly displayScale: DocumentSettings['displayScale'] }
  | {
      readonly kind: 'setFitSpan'
      readonly fitSpanStart: DocumentSettings['fitSpanStart']
      readonly fitSpanFinish: DocumentSettings['fitSpanFinish']
    }
  | { readonly kind: 'clearFitSpan' }
  | {
      readonly kind: 'setFitSpanFixed'
      readonly isFitSpanFixed: DocumentSettings['isFitSpanFixed']
      readonly shownStart: string | null
      readonly shownFinish: string | null
    }
  | {
      readonly kind: 'setTaskGroupPanelWidthFixed'
      readonly isTaskGroupPanelWidthFixed: DocumentSettings['isTaskGroupPanelWidthFixed']
    }
  | {
      readonly kind: 'setTableView'
      readonly table: 'searchPanel' | 'delayDiagnosticsReport' | 'resourceList'
      readonly view: TableView
    }
  | { readonly kind: 'setViewTimeZone'; readonly viewTimeZone: string | null }
  | { readonly kind: 'setDisplayTimeZones'; readonly displayTimeZones: DocumentSettings['displayTimeZones'] }
  | {
      readonly kind: 'setTimeOfDayVisible'
      readonly isTimeOfDayVisible: DocumentSettings['isTimeOfDayVisible']
    }
  | {
      readonly kind: 'setLevelZeroTreeState'
      readonly levelZeroTreeState: DocumentSettings['levelZeroTreeState']
    }
// </generated>

type VisibilityTable = keyof TableViews

type ColumnFilter = TableViews[VisibilityTable]['columnFilters'][number]

type ColumnSort = NonNullable<TableViews[VisibilityTable]['sort']>

type TableVisibility = TableView['visibility']

const DEFAULT_TABLE_VIEW: TableView = {
  visibility: { shownTaskUids: [], shownResourceUids: [], isUnassignedShown: false, isScheduleFilterApplied: false },
  columnFilters: [],
  sort: null,
}

const TABLE_NAMES: Readonly<Record<VisibilityTable, true>> = {
  searchPanel: true,
  delayDiagnosticsReport: true,
  resourceList: true,
}

const SORT_DIRECTIONS: Readonly<Record<ColumnSort['direction'], true>> = { ascending: true, descending: true }

type HeldTableView = TableViews[VisibilityTable]

/** @purity pure */
function visibilityOf(held: HeldTableView): TableVisibility {
  if ('shownResourceUids' in held) {
    return { shownTaskUids: [], shownResourceUids: held.shownResourceUids, isUnassignedShown: held.isUnassignedShown, isScheduleFilterApplied: held.isScheduleFilterApplied }
  }
  return { shownTaskUids: held.shownTaskUids, shownResourceUids: [], isUnassignedShown: false, isScheduleFilterApplied: held.isScheduleFilterApplied }
}

// see FR-151, TV-2, S-560
// TRAP: a document read before OP-6 fills the group may lack tableViews; it reads as the defaults.
/** @purity pure */
export function tableViewOf(settings: DocumentSettings, table: VisibilityTable): TableView {
  const views = settings.tableViews as TableViews | undefined
  const held = views?.[table]
  if (held === undefined) return DEFAULT_TABLE_VIEW
  return { visibility: visibilityOf(held), columnFilters: held.columnFilters, sort: held.sort }
}

// WHY: rebuilt field by field, so a caller's extra keys never reach the document and two equal views print alike.
/** @purity pure */
function heldColumnFilter(filter: ColumnFilter): ColumnFilter {
  return { column: filter.column, hiddenValues: [...filter.hiddenValues], fromDate: filter.fromDate, toDate: filter.toDate }
}

/** @purity pure */
function heldViewOf(table: VisibilityTable, view: TableView): HeldTableView {
  const columnFilters = view.columnFilters.map(heldColumnFilter)
  const sort = view.sort === null ? null : { column: view.sort.column, direction: view.sort.direction }
  const isScheduleFilterApplied = view.visibility.isScheduleFilterApplied
  if (table !== 'resourceList') {
    return { columnFilters, shownTaskUids: [...view.visibility.shownTaskUids], isScheduleFilterApplied, sort }
  }
  const isUnassignedShown = view.visibility.isUnassignedShown
  return { columnFilters, shownResourceUids: [...view.visibility.shownResourceUids], isScheduleFilterApplied, isUnassignedShown, sort }
}

/** @purity pure */
function fieldOf(value: unknown, key: string): unknown {
  return value instanceof Object ? (value as Readonly<Record<string, unknown>>)[key] : undefined
}

/** @purity pure */
function isBoundDay(value: unknown): boolean {
  return value === null || (typeof value === 'string' && dayOf(value) !== null)
}

/** @purity pure */
function isListOf(value: unknown, isOne: (one: unknown) => boolean): boolean {
  return Array.isArray(value) && value.every(isOne)
}

/** @purity pure */
function isColumnFilter(value: unknown): boolean {
  const isHiddenList = isListOf(fieldOf(value, 'hiddenValues'), (one) => typeof one === 'string')
  const isBounded = isBoundDay(fieldOf(value, 'fromDate')) && isBoundDay(fieldOf(value, 'toDate'))
  return typeof fieldOf(value, 'column') === 'string' && isHiddenList && isBounded
}

/** @purity pure */
function isColumnSort(value: unknown): boolean {
  if (value === null) return true
  const direction = fieldOf(value, 'direction')
  return typeof fieldOf(value, 'column') === 'string' && typeof direction === 'string' && Object.hasOwn(SORT_DIRECTIONS, direction)
}

/** @purity pure */
function isTableVisibility(value: unknown): boolean {
  if (!isListOf(fieldOf(value, 'shownTaskUids'), Number.isInteger)) return false
  if (!isListOf(fieldOf(value, 'shownResourceUids'), Number.isInteger)) return false
  return typeof fieldOf(value, 'isUnassignedShown') === 'boolean' && typeof fieldOf(value, 'isScheduleFilterApplied') === 'boolean'
}

// see CM-92, AG-5, T-372
// WHY: judged at run time, not left to the type; the Agent API hands commands over as data (AG-5).
/** @purity pure */
function tableViewFaultOf(table: unknown, view: unknown): string | null {
  if (typeof table !== 'string' || !Object.hasOwn(TABLE_NAMES, table)) return `not a table tableViews holds: ${String(table)}`
  if (!isTableVisibility(fieldOf(view, 'visibility'))) return 'the view carries no visibility of the shape TV-2 gives'
  if (!isListOf(fieldOf(view, 'columnFilters'), isColumnFilter)) return 'a column filter is not of the shape table T-372 gives'
  return isColumnSort(fieldOf(view, 'sort')) ? null : 'the sort is neither null nor of the shape table T-372 gives'
}

// see CM-92, FR-151, UN-20
// WHY: an unchanged view writes nothing, so a repeated press adds no undo step.
/** @purity pure */
function tableViewEdited(
  settings: DocumentSettings,
  command: Extract<DocumentSettingsCommand, { readonly kind: 'setTableView' }>,
  put: SettingsPut,
): EditResult {
  const fault = tableViewFaultOf(command.table, command.view)
  if (fault !== null) return refused([reject('CM-92', 'FR-151', fault)])
  const held = heldViewOf(command.table, command.view)
  const before = heldViewOf(command.table, tableViewOf(settings, command.table))
  if (JSON.stringify(held) === JSON.stringify(before)) return put({})
  return put({ tableViews: { ...settings.tableViews, [command.table]: held } })
}

/** @purity pure */
function keptUids<V>(held: V | undefined, key: keyof V, present: ReadonlySet<number>): V | undefined {
  const uids = held?.[key]
  if (!Array.isArray(uids) || uids.every((uid) => present.has(uid))) return held
  return { ...(held as V), [key]: uids.filter((uid) => present.has(uid)) }
}

// see CD-1, CD-2, CD-5, OP-18, TV-2
// WHY: the same settings back when no hidden uid goes; a value not yet settled by OP-6 is passed through.
/** @purity pure */
export function tableViewsKeptIn(settings: DocumentSettings, schedule: Schedule): DocumentSettings {
  const views = settings.tableViews as Partial<TableViews> | undefined
  if (views === undefined) return settings
  const tasks = new Set(schedule.tasks.map((task) => task.uid))
  const resources = new Set(schedule.resources.map((resource) => resource.uid))
  const kept = {
    searchPanel: keptUids(views.searchPanel, 'shownTaskUids', tasks),
    delayDiagnosticsReport: keptUids(views.delayDiagnosticsReport, 'shownTaskUids', tasks),
    resourceList: keptUids(views.resourceList, 'shownResourceUids', resources),
  }
  const isSame = kept.searchPanel === views.searchPanel && kept.delayDiagnosticsReport === views.delayDiagnosticsReport
  if (isSame && kept.resourceList === views.resourceList) return settings
  return { ...settings, tableViews: { ...views, ...kept } as TableViews }
}

/** @purity pure */
export function documentWithTableViewsKept(document: Document): Document {
  const settings = tableViewsKeptIn(document.documentSettings, document.schedule)
  return settings === document.documentSettings ? document : withSettings(document, settings)
}

// WHY: a Record over the type, so a value added to S-418 fails to compile here.
const LEVEL_ZERO_TREE_STATES: Readonly<Record<DocumentSettings['levelZeroTreeState'], true>> = {
  auto: true,
  collapsed: true,
}

/** @purity pure */
function withSettings(document: Document, settings: DocumentSettings): Document {
  return { ...document, documentSettings: settings }
}

type SettingsPut = (part: Partial<DocumentSettings>) => EditResult

// see CM-67, FR-052
/** @purity pure */
function taskGroupPanelWidthEdited(
  settings: DocumentSettings,
  command: Extract<DocumentSettingsCommand, { readonly kind: 'setTaskGroupPanelWidthPx' }>,
  limits: SettingsLimits,
  put: SettingsPut,
): EditResult {
  // TRAP: test as !(w > 0), not w <= 0; AG-8 hands commands over as data and NaN fails both.
  if (!(command.taskGroupPanelWidthPx > 0)) {
    // WHY: S-79's formula floor is not applied; applying it here would own a second copy of that row.
    return refused([reject('CM-67', 'FR-052', 'the task group panel must be wider than zero')])
  }
  // TRAP: the limit is measured off the DRAWN regions, so the stored width has to be scaled to meet it.
  const taskGroupArea = limits.taskGroupAreaWidthWithoutPanels - command.taskGroupPanelWidthPx * displayRatioOf(settings)
  if (!(taskGroupArea > 0)) {
    return refused([reject('CM-67', 'FR-052', 'the width would leave the Task Group Area at or below zero')])
  }
  return put({ taskGroupPanelWidthPx: command.taskGroupPanelWidthPx })
}

// see CM-86, S-418, T-328
/** @purity pure */
function levelZeroTreeStateEdited(
  command: Extract<DocumentSettingsCommand, { readonly kind: 'setLevelZeroTreeState' }>,
  put: SettingsPut,
): EditResult {
  // WHY: judged at run time, not left to the type; the Agent API hands commands over as data (AG-5).
  if (!Object.prototype.hasOwnProperty.call(LEVEL_ZERO_TREE_STATES, command.levelZeroTreeState)) {
    return refused([
      reject('CM-86', 'FR-004', `not a level zero tree state S-418 names: ${command.levelZeroTreeState}`),
    ])
  }
  return put({ levelZeroTreeState: command.levelZeroTreeState })
}

// see CM-62, FR-039, S-70
/** @purity pure */
function fontSizeStepEdited(
  settings: DocumentSettings,
  command: Extract<DocumentSettingsCommand, { readonly kind: 'setFontSizeStep' }>,
  put: SettingsPut,
): EditResult {
  const ruler = SETTINGS_DERIVED.rulerFontSizePx
  const rulerFontSizePx = SETTINGS_CONSTANTS[ruler.index][command.fontSizeStep] * ruler.times
  const band = SETTINGS_DERIVED.rulerHeightPx
  const padded = { ...settings, rulerFontSizePx }
  return put({
    fontSizeStep: command.fontSizeStep,
    rulerFontSizePx,
    rulerHeightPx:
      padded[band.from] * band.times +
      band.plus +
      SETTINGS_CONSTANTS[band.plusFrom] * band.plusTimes,
  })
}

// see CM-68, FR-098
/** @purity pure */
function pinEdited(
  settings: DocumentSettings,
  command: Extract<DocumentSettingsCommand, { readonly kind: 'pinTaskGroup' }>,
  put: SettingsPut,
): EditResult {
  const held = settings.pinnedTaskGroupIds
  if (held.includes(command.taskGroupId)) return put({ pinnedTaskGroupIds: held })
  if (held.length >= SETTINGS_CONSTANTS.pinnedTaskGroupMax) {
    return refused([
      reject('CM-68', 'FR-098', `already holding ${SETTINGS_CONSTANTS.pinnedTaskGroupMax} pinned task groups`),
    ])
  }
  return put({ pinnedTaskGroupIds: [...held, command.taskGroupId] })
}

type FitSpanPair = { readonly span: Partial<DocumentSettings> } | { readonly refusal: EditResult }

// see FX-1, RS-58, WT-6, WT-7
/** @purity pure */
function fitSpanPairOf(command: 'CM-88' | 'CM-90', startIn: string | null, finishIn: string | null): FitSpanPair {
  const startText = startIn ?? finishIn
  const finishText = finishIn ?? startIn
  const start = dayOf(startText)
  const finish = dayOf(finishText)
  if (start === null || finish === null) {
    return { refusal: refused([reject(command, 'S-518', `not a pair of dates: ${startText} / ${finishText}`)]) }
  }
  // TRAP: refused, never pulled to the start; only a document read is settled that way (FX-1).
  if (compareDays(finish, start) < 0) {
    return { refusal: refused([reject(command, 'FX-1', 'the fit span finishes before it starts')]) }
  }
  return { span: { fitSpanStart: textOfDayStart(start), fitSpanFinish: textOfDayEnd(finish) } }
}

/** @purity pure */
function fitSpanEdited(
  command: Extract<DocumentSettingsCommand, { readonly kind: 'setFitSpan' }>,
  put: SettingsPut,
): EditResult {
  const pair = fitSpanPairOf('CM-88', command.fitSpanStart, command.fitSpanFinish)
  return 'refusal' in pair ? pair.refusal : put(pair.span)
}

// see CM-90, FX-1, FX-4
/** @purity pure */
function fitSpanFixedEdited(
  settings: DocumentSettings,
  command: Extract<DocumentSettingsCommand, { readonly kind: 'setFitSpanFixed' }>,
  put: SettingsPut,
): EditResult {
  const hasSpan = dayOf(settings.fitSpanStart) !== null && dayOf(settings.fitSpanFinish) !== null
  if (!command.isFitSpanFixed || hasSpan) return put({ isFitSpanFixed: command.isFitSpanFixed })
  const pair = fitSpanPairOf('CM-90', command.shownStart, command.shownFinish)
  return 'refusal' in pair ? pair.refusal : put({ ...pair.span, isFitSpanFixed: true })
}

type FitSpanCommand = Extract<DocumentSettingsCommand, { readonly kind: 'setFitSpan' | 'clearFitSpan' | 'setFitSpanFixed' }>

// WHY: the commands that write a group of columns under rules of their own, edited ahead of the switch below.
type ComposedCommand = FitSpanCommand | Extract<DocumentSettingsCommand, { readonly kind: 'setTableView' }>

const COMPOSED_KINDS: Readonly<Record<ComposedCommand['kind'], true>> = {
  setFitSpan: true,
  clearFitSpan: true,
  setFitSpanFixed: true,
  setTableView: true,
}

/** @purity pure */
function isComposedCommand(command: DocumentSettingsCommand): command is ComposedCommand {
  return Object.prototype.hasOwnProperty.call(COMPOSED_KINDS, command.kind)
}

type FlagCommand = Extract<DocumentSettingsCommand, { readonly kind: 'setThemeMonochrome' | 'setTaskGroupPanelWidthFixed' | 'setTimeOfDayVisible' }>

const FLAG_KINDS: Readonly<Record<FlagCommand['kind'], true>> = {
  setThemeMonochrome: true,
  setTaskGroupPanelWidthFixed: true,
  setTimeOfDayVisible: true,
}

/** @purity pure */
function isFlagCommand(command: DocumentSettingsCommand): command is FlagCommand {
  return Object.prototype.hasOwnProperty.call(FLAG_KINDS, command.kind)
}

type ZoneCommand = Extract<DocumentSettingsCommand, { readonly kind: 'setViewTimeZone' | 'setDisplayTimeZones' }>

const ZONE_KINDS: Readonly<Record<ZoneCommand['kind'], true>> = {
  setViewTimeZone: true,
  setDisplayTimeZones: true,
}

/** @purity pure */
function isZoneCommand(command: DocumentSettingsCommand): command is ZoneCommand {
  return Object.prototype.hasOwnProperty.call(ZONE_KINDS, command.kind)
}

const MOST_DISPLAY_TIME_ZONES = 4

// see CM-95, CM-96, FR-156, T-376, S-574, S-575
/** @purity pure */
function zoneCommandEdited(settings: DocumentSettings, command: ZoneCommand, put: SettingsPut): EditResult {
  if (command.kind === 'setViewTimeZone') {
    if (command.viewTimeZone !== null && !isStandardTimeZoneKey(command.viewTimeZone)) {
      const what = `not a standard-time key of table T-376: ${String(command.viewTimeZone)}`
      return refused([reject('CM-95', 'FR-156', what)])
    }
    return put({ viewTimeZone: command.viewTimeZone })
  }
  const zones = command.displayTimeZones
  if (!Array.isArray(zones) || zones.length > MOST_DISPLAY_TIME_ZONES || !zones.every(isTimeZoneKey)) {
    return refused([reject('CM-96', 'FR-156', `not 0 to ${MOST_DISPLAY_TIME_ZONES} keys of table T-376`)])
  }
  const held = settings.displayTimeZones
  if (held.length === zones.length && held.every((one, at) => one === zones[at])) return put({})
  return put({ displayTimeZones: [...zones] })
}

// see CM-64, CM-91, CM-97
/** @purity pure */
function flagCommandEdited(command: FlagCommand, put: SettingsPut): EditResult {
  if (command.kind === 'setThemeMonochrome') return put({ isThemeMonochrome: command.isThemeMonochrome })
  if (command.kind === 'setTaskGroupPanelWidthFixed') return put({ isTaskGroupPanelWidthFixed: command.isTaskGroupPanelWidthFixed })
  return put({ isTimeOfDayVisible: command.isTimeOfDayVisible })
}

/** @purity pure */
function composedCommandEdited(settings: DocumentSettings, command: ComposedCommand, put: SettingsPut): EditResult {
  if (command.kind === 'setTableView') return tableViewEdited(settings, command, put)
  return fitSpanCommandEdited(settings, command, put)
}

// see CM-88, CM-89, CM-90, FX-1, FX-4, FX-5
/** @purity pure */
function fitSpanCommandEdited(settings: DocumentSettings, command: FitSpanCommand, put: SettingsPut): EditResult {
  if (command.kind === 'setFitSpan') return fitSpanEdited(command, put)
  if (command.kind === 'setFitSpanFixed') return fitSpanFixedEdited(settings, command, put)
  // WHY: a cleared span takes its fix with it in the same one step (FX-5).
  return put({ fitSpanStart: null, fitSpanFinish: null, isFitSpanFixed: false })
}

// see T-108, FR-063
/** @purity pure */
export function editDocumentSettings(
  document: Document,
  command: DocumentSettingsCommand,
  limits: SettingsLimits,
): EditResult {
  const settings = document.documentSettings
  const put: SettingsPut = (part) => {
    const keys = Object.keys(part) as readonly (keyof DocumentSettings)[]
    if (keys.every((key) => settings[key] === part[key])) return edited(document)
    return edited(withSettings(document, { ...settings, ...part }))
  }
  const clamp = (value: number): number =>
    Math.max(limits.zoomMin, Math.min(limits.zoomMax, value))
  if (isComposedCommand(command)) return composedCommandEdited(settings, command, put)
  if (isFlagCommand(command)) return flagCommandEdited(command, put)
  if (isZoneCommand(command)) return zoneCommandEdited(settings, command, put)

  switch (command.kind) {
    case 'setStackDirection':
      return put({ stackDirection: command.stackDirection })

    case 'setVisibilitySetting':
      return put({ [command.setting]: command.isVisible } as Partial<DocumentSettings>)

    case 'setFontSizeStep':
      return fontSizeStepEdited(settings, command, put)

    // see CM-74, FR-039
    case 'setDisplayScale':
      return put({ displayScale: command.displayScale })

    case 'setZoom': {
      // TRAP: refuse NaN here; it fails both comparisons, so the clamp alone would store it.
      if (!Number.isFinite(command.zoomX) || !Number.isFinite(command.zoomY)) {
        return refused([reject('CM-65', 'FR-016', 'zoom must be a finite number')])
      }
      return put({ zoomX: clamp(command.zoomX), zoomY: clamp(command.zoomY) })
    }

    case 'setScrollPosition': {
      if (command.scrollDate !== null && dayOf(command.scrollDate) === null) {
        return refused([reject('CM-66', 'S-77', `not a date: ${command.scrollDate}`)])
      }
      return put({
        scrollDate: command.scrollDate,
        scrollTaskGroupId: command.scrollTaskGroupId,
        scrollDateFraction: command.scrollDateFraction,
        scrollTaskGroupFraction: command.scrollTaskGroupFraction,
      })
    }

    case 'setTaskGroupPanelWidthPx':
      return taskGroupPanelWidthEdited(settings, command, limits, put)

    case 'pinTaskGroup':
      return pinEdited(settings, command, put)

    case 'unpinTaskGroup': {
      const held = settings.pinnedTaskGroupIds
      if (!held.includes(command.taskGroupId)) return edited(document)
      return put({ pinnedTaskGroupIds: held.filter((one) => one !== command.taskGroupId) })
    }

    case 'fitScheduleToScreen': {
      // TRAP: keep CM-71 and CM-72 two writes in this order, or an undo rewinds the zoom (UN-8, UN-17).
      if (!Number.isFinite(command.zoomX) || !Number.isFinite(command.zoomY)) {
        return refused([reject('CM-71', 'FR-016', 'zoom must be a finite number')])
      }
      return put({
        zoomX: clamp(command.zoomX),
        zoomY: clamp(command.zoomY),
        scrollDate: command.scrollDate,
        scrollTaskGroupId: command.scrollTaskGroupId,
        scrollDateFraction: command.scrollDateFraction,
        scrollTaskGroupFraction: command.scrollTaskGroupFraction,
      })
    }

    case 'setLevelZeroTreeState':
      return levelZeroTreeStateEdited(command, put)

  }
}

export type BaseChangeWay = 'keepGlobalTime' | 'keepLocalTime'

export interface BaseTimeZones {
  readonly scheduleDataTimeZone: string
  readonly viewTimeZone: string | null
}

/** @purity pure */
export function baseTimeZonesAfterChange(held: BaseTimeZones, chosenRegion: string, chosenWay: BaseChangeWay): BaseTimeZones {
  if (chosenWay === 'keepLocalTime') return { scheduleDataTimeZone: chosenRegion, viewTimeZone: null }
  return { ...held, viewTimeZone: chosenRegion === held.scheduleDataTimeZone ? null : chosenRegion }
}

// see FR-156, FO-14, CM-94, CM-95, UN-13
// WHY: one list written at once, so one undo takes it back (UN-13); held.viewTimeZone is the stored S-574.
/** @purity pure */
export function baseChangeCommandOf(
  held: BaseTimeZones,
  chosenRegion: string,
  chosenWay: BaseChangeWay,
): readonly (ProjectCommand | DocumentSettingsCommand)[] {
  const after = baseTimeZonesAfterChange(held, chosenRegion, chosenWay)
  const isDataMoved = after.scheduleDataTimeZone !== held.scheduleDataTimeZone
  const isViewMoved = after.viewTimeZone !== held.viewTimeZone
  return [
    ...(isDataMoved
      ? [{ kind: 'setScheduleDataTimeZone', scheduleDataTimeZone: after.scheduleDataTimeZone } as const]
      : []),
    ...(isViewMoved ? [{ kind: 'setViewTimeZone', viewTimeZone: after.viewTimeZone } as const] : []),
  ]
}

// <generated -- do not edit by hand>
// Single source of truth:
//   docs/spec/_assets/tbl-glossary.md (table T-109)
//   docs/spec/_source/settings.json (table T-202)
// Rebuild: npm run gen   ||   npm run gen:check fails on drift.
// see T-109, T-202, FR-049
export type VisibleElement =
  | 'isBaselineVisible'
  | 'isPlanVisible'
  | 'isActualVisible'
  | 'isProgressLineVisible'
  | 'isProgressMarkerVisible'
  | 'isDateGridLinesVisible'
  | 'isGroupGridLinesVisible'
  | 'isAssigneeVisible'
  | 'isPercentCompleteVisible'
  | 'isDependencyVisible'
  | 'isPlanDatesVisible'
// </generated>
