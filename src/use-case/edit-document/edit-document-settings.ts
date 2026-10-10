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
  textOfDayEnd,
  textOfDayStart,
  type Schedule,
} from '../../entity/document-model/schedule/schedule'
import { displayRatioOf } from '../../entity/layout-engine/screen-regions/screen-regions'
import type { EditResult } from './edit-document'
import { refused, edited, reject } from './edit-document'

// see FR-016, FR-052, T-206
export interface SettingsLimits {
  readonly zoomMin: number
  readonly zoomMax: number
  // TRAP: never rebuild this from a window width here; regionsFromScreen owns that arithmetic.
  readonly taskGroupAreaWidthWithoutPanels: number
}

// see T-108
export type DocumentSettingsCommand =
  | { readonly kind: 'setStackDirection'; readonly direction: 'up' | 'down' }
  | { readonly kind: 'setElementVisible'; readonly element: VisibleElement; readonly visible: boolean }
  | { readonly kind: 'setFontScale'; readonly scale: 'S' | 'M' | 'L' }
  | { readonly kind: 'setDisplayScale'; readonly scale: DocumentSettings['displayScale'] }
  | { readonly kind: 'setThemeMonochrome'; readonly monochrome: boolean }
  | { readonly kind: 'setZoom'; readonly zoomX: number; readonly zoomY: number }
  | {
      readonly kind: 'setScrollPosition'
      readonly scrollDate: string | null
      readonly scrollGroupId: string | null
      readonly scrollDayOffset: number
      readonly scrollGroupOffset: number
    }
  | { readonly kind: 'setTaskGroupPanelWidth'; readonly taskGroupPanelWidth: number }
  | { readonly kind: 'pinTaskGroup'; readonly groupId: string }
  | { readonly kind: 'unpinTaskGroup'; readonly groupId: string }
  | {
      readonly kind: 'fitScheduleToScreen'
      readonly zoomX: number
      readonly zoomY: number
      readonly scrollDate: string | null
      readonly scrollGroupId: string | null
      readonly scrollDayOffset: number
      readonly scrollGroupOffset: number
    }
  | {
      readonly kind: 'setLevelZeroTreeState'
      readonly levelZeroTreeState: DocumentSettings['levelZeroTreeState']
    }
  // see CM-88, CM-89, CM-90, FX-1, FX-4, FX-5
  | {
      readonly kind: 'setFitSpan'
      readonly fitSpanStart: string | null
      readonly fitSpanFinish: string | null
    }
  | { readonly kind: 'clearFitSpan' }
  // WHY: carries the shown span, so a fix entered over an empty span copies it in the same one step (FX-4).
  | {
      readonly kind: 'setFitSpanFixed'
      readonly fitSpanFixed: boolean
      readonly shownStart: string | null
      readonly shownFinish: string | null
    }
  // see CM-91, WF-1
  | { readonly kind: 'setTaskGroupPanelWidthFixed'; readonly taskGroupPanelWidthFixed: boolean }
  // see CM-92, FR-151, UN-20
  | { readonly kind: 'setTableView'; readonly table: VisibilityTable; readonly view: TableView }

type VisibilityTable = keyof TableViews

type ColumnFilter = TableViews[VisibilityTable]['columnFilters'][number]

type ColumnSort = NonNullable<TableViews[VisibilityTable]['sort']>

// see CM-92, FR-151, T-372, TV-2, RO-5, S-560
// WHY: hiddenKeys are Task.uid, or Resource.uid in the resource list, whose (Unassigned) row isUnassignedHidden is (TV-2).
export interface TableView {
  readonly visibility: {
    readonly hiddenKeys: readonly number[]
    readonly isUnassignedHidden: boolean
    readonly isApplied: boolean
  }
  readonly columnFilters: readonly ColumnFilter[]
  readonly sort: ColumnSort | null
}

type TableVisibility = TableView['visibility']

const DEFAULT_TABLE_VIEW: TableView = {
  visibility: { hiddenKeys: [], isUnassignedHidden: false, isApplied: false },
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
  if ('hiddenResourceUids' in held) {
    return { hiddenKeys: held.hiddenResourceUids, isUnassignedHidden: held.isUnassignedHidden, isApplied: held.isScheduleFilterApplied }
  }
  return { hiddenKeys: held.hiddenTaskUids, isUnassignedHidden: false, isApplied: held.isScheduleFilterApplied }
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
  const isScheduleFilterApplied = view.visibility.isApplied
  const hiddenKeys = [...view.visibility.hiddenKeys]
  if (table !== 'resourceList') return { columnFilters, hiddenTaskUids: hiddenKeys, isScheduleFilterApplied, sort }
  const isUnassignedHidden = view.visibility.isUnassignedHidden
  return { columnFilters, hiddenResourceUids: hiddenKeys, isScheduleFilterApplied, isUnassignedHidden, sort }
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
  if (!isListOf(fieldOf(value, 'hiddenKeys'), Number.isInteger)) return false
  return typeof fieldOf(value, 'isUnassignedHidden') === 'boolean' && typeof fieldOf(value, 'isApplied') === 'boolean'
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
    searchPanel: keptUids(views.searchPanel, 'hiddenTaskUids', tasks),
    delayDiagnosticsReport: keptUids(views.delayDiagnosticsReport, 'hiddenTaskUids', tasks),
    resourceList: keptUids(views.resourceList, 'hiddenResourceUids', resources),
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
  command: Extract<DocumentSettingsCommand, { readonly kind: 'setTaskGroupPanelWidth' }>,
  limits: SettingsLimits,
  put: SettingsPut,
): EditResult {
  // TRAP: test as !(w > 0), not w <= 0; AG-8 hands commands over as data and NaN fails both.
  if (!(command.taskGroupPanelWidth > 0)) {
    // WHY: S-79's formula floor is not applied; applying it here would own a second copy of that row.
    return refused([reject('CM-67', 'FR-052', 'the task group panel must be wider than zero')])
  }
  // TRAP: the limit is measured off the DRAWN regions, so the stored width has to be scaled to meet it.
  const taskGroupArea = limits.taskGroupAreaWidthWithoutPanels - command.taskGroupPanelWidth * displayRatioOf(settings)
  if (!(taskGroupArea > 0)) {
    return refused([reject('CM-67', 'FR-052', 'the width would leave the Task Group Area at or below zero')])
  }
  return put({ taskGroupPanelWidth: command.taskGroupPanelWidth })
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
function fontScaleEdited(
  settings: DocumentSettings,
  command: Extract<DocumentSettingsCommand, { readonly kind: 'setFontScale' }>,
  put: SettingsPut,
): EditResult {
  const ruler = SETTINGS_DERIVED.rulerFont
  const rulerFont = SETTINGS_CONSTANTS[ruler.index][command.scale] * ruler.times
  const band = SETTINGS_DERIVED.rulerHeight
  const padded = { ...settings, rulerFont }
  return put({
    fontScale: command.scale,
    rulerFont,
    rulerHeight:
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
  const held = settings.pinnedGroupIds
  if (held.includes(command.groupId)) return put({ pinnedGroupIds: held })
  if (held.length >= SETTINGS_CONSTANTS.pinnedTaskGroupMax) {
    return refused([
      reject('CM-68', 'FR-098', `already holding ${SETTINGS_CONSTANTS.pinnedTaskGroupMax} pinned task groups`),
    ])
  }
  return put({ pinnedGroupIds: [...held, command.groupId] })
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
  if (!command.fitSpanFixed || hasSpan) return put({ fitSpanFixed: command.fitSpanFixed })
  const pair = fitSpanPairOf('CM-90', command.shownStart, command.shownFinish)
  return 'refusal' in pair ? pair.refusal : put({ ...pair.span, fitSpanFixed: true })
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
  return put({ fitSpanStart: null, fitSpanFinish: null, fitSpanFixed: false })
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

  switch (command.kind) {
    case 'setStackDirection':
      return put({ stackDirection: command.direction })

    case 'setElementVisible':
      return put({ [command.element]: command.visible } as Partial<DocumentSettings>)

    case 'setFontScale':
      return fontScaleEdited(settings, command, put)

    // see CM-74, FR-039
    case 'setDisplayScale':
      return put({ displayScale: command.scale })

    case 'setThemeMonochrome':
      return put({ themeMonochrome: command.monochrome })

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
        scrollGroupId: command.scrollGroupId,
        scrollDayOffset: command.scrollDayOffset,
        scrollGroupOffset: command.scrollGroupOffset,
      })
    }

    case 'setTaskGroupPanelWidth':
      return taskGroupPanelWidthEdited(settings, command, limits, put)

    case 'pinTaskGroup':
      return pinEdited(settings, command, put)

    case 'unpinTaskGroup': {
      const held = settings.pinnedGroupIds
      if (!held.includes(command.groupId)) return edited(document)
      return put({ pinnedGroupIds: held.filter((one) => one !== command.groupId) })
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
        scrollGroupId: command.scrollGroupId,
        scrollDayOffset: command.scrollDayOffset,
        scrollGroupOffset: command.scrollGroupOffset,
      })
    }

    case 'setLevelZeroTreeState':
      return levelZeroTreeStateEdited(command, put)

    case 'setTaskGroupPanelWidthFixed':
      return put({ taskGroupPanelWidthFixed: command.taskGroupPanelWidthFixed })

  }
}

// <generated -- do not edit by hand>
// Single source of truth:
//   docs/spec/_assets/tbl-glossary.md (table T-109)
//   docs/spec/_source/settings.json (table T-202)
// Rebuild: npm run gen   ||   npm run gen:check fails on drift.
// see T-109, T-202, FR-049
export type VisibleElement =
  | 'baselineVisible'
  | 'planVisible'
  | 'actualVisible'
  | 'progressLineVisible'
  | 'progressMarkerVisible'
  | 'dateGridLinesVisible'
  | 'groupGridLinesVisible'
  | 'assigneeVisible'
  | 'percentCompleteVisible'
  | 'dependencyVisible'
  | 'planDatesVisible'
// </generated>
