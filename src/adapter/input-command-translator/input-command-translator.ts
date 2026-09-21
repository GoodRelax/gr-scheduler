// InputCommandTranslator -- public entry of this folder.
// @unit      UF-30   (docs/spec/05-07-design.md, table T-075)
// @component InputCommandTranslator, layer Adapter (table T-062)
// @purity    pure
// @publishes table T-064 row PI-18
// The marked region at the bottom is generated from docs/spec/_source/settings.json:
// do not edit by hand, rebuild with `npm run gen`.

import type { Document } from '../../entity/document-model/document/document'
import type {
  DualCursorSide,
  EscapeContext,
  RememberedActual,
} from '../../entity/document-model/screen-state/screen-state'
import {
  dayOf,
  planActualState,
  taskByUid,
  textOfDay,
  type CalendarDay,
  type Schedule,
  type Task,
  type TaskGroup,
} from '../../entity/document-model/schedule/schedule'
import type { Selection } from '../../entity/document-model/selection/selection'
import type {
  GrabArea,
  Hit,
} from '../../entity/layout-engine/item-hit-area/item-hit-area'
import type { ScheduleGeometry } from '../../entity/layout-engine/schedule-geometry/schedule-geometry'
import {
  dateAtX,
  rowPlacesAtZoomY,
  xFromDay,
  zoomYAtRectangleLabelFont,
  type RowPlacement,
  type ScheduleLayout,
} from '../../entity/layout-engine/schedule-layout/schedule-layout'
import {
  regionAtPointer,
  type ScreenRect,
  type ScreenRegions,
} from '../../entity/layout-engine/screen-regions/screen-regions'
import type { DocumentSettings } from '../../entity/document-model/document-settings/document-settings'
import {
  rowTitleFontPxOf,
  type ScreenPart,
} from '../screen-renderer/screen-renderer'
import type {
  DocumentCommand,
  TaskMilestoneGlyph,
  TaskShapeKind,
} from '../../use-case/edit-document/edit-document'
import type { ScreenValues } from '../../use-case/advance-screen-session/advance-screen-session'
import type {
  HumanInput,
  InputModifiers,
  PointerInput,
} from './input-source'
import {
  commandFromArmed,
  commandFromArmingEntry,
  commandFromDependencyDrag,
} from './armed-placement'
import { displayScaleStep } from './display-scale-steps'
import {
  commandFromDualCursorEntry,
  commandFromDualCursorPress,
} from './dual-cursor-input'
import {
  commandFromPanelDivider,
  commandFromScrollbar,
  paletteFollow,
  scrollbarFollow,
} from './frame-drags'
import { commandFromGrab } from './item-grab'
import {
  commandFromRowGrab,
  grabbedRowGroupId,
  rowGrabFollow,
} from './row-grab'
import {
  commandFromRowEntry,
  commandFromRowExpanderCloseAll,
  commandFromRowExpanderOpenAll,
  commandFromRowExpanderOpenLevelZero,
  rowStoodUp,
} from './row-tree-entrances'
import { commandFromKey } from './shortcut-keys'
import { commandFromWheel } from './wheel-input'
import {
  fitWrites,
  keyZoomFactor,
  rowZoomAnswer,
  zoomTimes,
  zoomWrites,
} from './zoom-and-fit'

export type {
  HumanInput,
  InputModifiers,
  InputSource,
  InputWatcher,
  KeyInput,
  PointerButton,
  PointerInput,
  PointerPhase,
  WheelInput,
} from './input-source'
export { commandFromFieldCommit } from './field-commit'
export { screenEventFromInput } from './screen-state-input'
export { selectionFromInput } from './selection-input'
export { rowBandCeilingOf } from './zoom-and-fit'


export type PressRow = 'PTD-1' | 'PTD-2' | 'PTD-3' | 'PTD-4' | 'PTD-4a' | 'PTD-5'

export type ScrollbarAxis = NonNullable<ScreenPart['scrollbarAxis']>

export type RowGrabAxis = 'position' | 'depth'

export interface PointerPress {
  readonly at: PointerInput
  // TRAP: pick the hit's reading by at.clickCount; a plain reading on a second click misses MK-13.
  readonly hit: Hit | null
  readonly on: ScreenPart | null
  readonly pressRow: PressRow
  readonly followedTo?: { readonly x: number; readonly y: number }
  // TRAP: never default an absent axis to 'position'; a still click would stop choosing the row.
  readonly rowGrabAxis?: RowGrabAxis | null
  // see FR-052
  // TRAP: the width DRAWN when the press began, taken then: the context's regions follow the held
  // picture, so reading them at release counts the travel twice.
  readonly propertyPanelWidthAtPress?: number
}

export interface InputContext {
  readonly document: Document
  readonly layout: ScheduleLayout
  readonly geometry: ScheduleGeometry
  readonly regions: ScreenRegions
  readonly screen: ScreenValues
  readonly selection: Selection
  readonly zoomStep: number
  readonly zoomMin: number
  readonly zoomMax: number
  readonly isPictureAtStoredZoom?: boolean
  readonly rowControlsHeightPx?: number
  // see FR-016
  // TRAP: the caller's remembered rowBandCeilingOf(context, upTo) at drawnZoomX, asked again
  // once upTo grows past what it holds; absent, every notch walks T-253 again (DFC-610).
  readonly rowBandCeiling?: (drawnZoomX: number, upTo: number) => number
  // TRAP: on a down this must already be that press; left null, every drawn entry reads unassigned.
  readonly pressed: PointerPress | null
  readonly isTextEntryUnsettled: boolean
  // see IN-5a, MK-13, HF-14
  // TRAP: kept apart from isTextEntryUnsettled, which AG-9 and WS-2 read; this state is not AG-9's.
  readonly isTextFieldFocusWanted?: boolean
  readonly isSurfaceStanding: boolean
  readonly dualCursorFollowing: DualCursorSide | null
  readonly today: string
  readonly newGroupId: string
  readonly newCommentBoxId: string
  readonly newHighlightBoxId: string
  readonly isPropertiesPanelShowing?: boolean
  readonly isNoticeStanding?: boolean
  readonly drawnRowGroupIds?: readonly string[]
  readonly drawnRowBoxes?: readonly { readonly groupId: string; readonly box: ScreenRect }[]
  readonly isLevelZeroFolded?: boolean
}


export type InPlaceTarget =
  | { readonly kind: 'documentTitle' }
  | { readonly kind: 'taskName'; readonly uid: number }
  | { readonly kind: 'assignee'; readonly uid: number }
  | { readonly kind: 'rowName'; readonly groupId: string }
  | { readonly kind: 'commentBoxText'; readonly id: string }

export type SetDualCursor = Extract<DocumentCommand, { readonly kind: 'setDualCursor' }>

type ClearDualCursor = Extract<DocumentCommand, { readonly kind: 'clearDualCursor' }>

export type SpentEntranceSituation =
  | 'noFoldedRowBelow'
  | 'noUnfoldedRowBelow'
  | 'rowIsOpenWithNoHiddenChild'
  | 'noFoldedRowAtAll'
  | 'noUnfoldedRowAtAll'
  | 'onlyOneOfPlanAndActualShown'
  | 'noTaskChosenToAlignWith'
  | 'noSiblingAboveToNestUnder'
  | 'rowIsAtTheShallowestLevel'
  | 'groupDepthLimitReached'
  | 'noPlaceLeftInThatDirection'
  | 'noRowToPutTheAnnotationOn'
  | 'rowIsAtTheDeepestLevel'
  | 'barShapeReleasedWithoutADrag'

export type CreatedSubject =
  | { readonly kind: 'task'; readonly uid: number }
  | { readonly kind: 'row'; readonly groupId: string }

export type InputAction =
  | {
      readonly kind: 'changeDocument'
      readonly writes: readonly (readonly DocumentCommand[])[]
      readonly created?: CreatedSubject
    }
  | {
      readonly kind: 'setLevelZeroFolded'
      readonly isFolded: boolean
      readonly writes: readonly DocumentCommand[]
    }
  | { readonly kind: 'undoEdit' }
  | { readonly kind: 'redoEdit' }
  | { readonly kind: 'copySelection' }
  | { readonly kind: 'pasteClipboard' }
  | { readonly kind: 'openDocumentFile' }
  | { readonly kind: 'saveDocumentFile' }
  | { readonly kind: 'reopenDocumentFile' }
  | { readonly kind: 'copyPictureToClipboard' }
  | { readonly kind: 'settleTextEntry' }
  | { readonly kind: 'dismissNotice' }
  | {
      readonly kind: 'tellEntryHasNothingToDo'
      readonly situation: SpentEntranceSituation | null
    }
  | { readonly kind: 'editInPlace'; readonly target: InPlaceTarget }
  | {
      readonly kind: 'moveCommandPalette'
      readonly by: { readonly dx: number; readonly dy: number }
    }
  | {
      readonly kind: 'followRowGrab'
      readonly groupId: string
      readonly axis: RowGrabAxis
      readonly atDepth: number
      readonly atY: number | null
      readonly resistedPx: number
    }
  // STOP: spec does not decide where the chosen rows are held. Looked in FR-085, SL-1, SL-4
  // @provisional PND-142
  | {
      readonly kind: 'chooseRow'
      readonly groupId: string
      readonly isExtending: boolean
    }
  // STOP: spec does not decide where the chosen resources are held. Looked in FR-099, SL-1
  // @provisional PND-143
  | { readonly kind: 'chooseResources'; readonly uids: readonly number[] }
  // STOP: spec does not decide where the chosen resources are held. Looked in FR-099, SL-1
  // @provisional PND-143
  | { readonly kind: 'toggleChosenResource'; readonly uid: number }
  // STOP: spec does not decide what the properties panel keeps when the selection goes.
  // Looked in FR-072, SL-1 @provisional PND-144
  | { readonly kind: 'toggleDocumentSettingsProperties' }
  | { readonly kind: 'toggleAgentApi' }
  | { readonly kind: 'toggleDialogueFieldVisible' }
  | { readonly kind: 'toggleMilestoneList' }
  | { readonly kind: 'togglePaletteMinimised' }
  | { readonly kind: 'toggleInteractionRecord' }
  | { readonly kind: 'toggleFullScreen' }
  | {
      readonly kind: 'setDualCursorFollowing'
      readonly following: DualCursorSide | null
      readonly placed: SetDualCursor | ClearDualCursor | null
    }

export interface TranslatedInput {
  readonly action: InputAction | null
  readonly isBrowserDefaultStopped: boolean
  // see FR-039, SE-1, SE-2
  // TRAP: present on every press of IC-104 / IC-105 / SK-22 / SK-23; end is set whenever the
  // step after the press is an end one, on the press that arrives there as well.
  readonly displayScaleShown?: { readonly end: 'max' | 'min' | null }
  // see ZE-2, ZE-3, ZE-5
  // TRAP: present only on a row-axis input that wrote nothing at an end; zoomY is the one drawn.
  readonly rowZoomEndShown?: { readonly end: 'max' | 'min'; readonly zoomY: number }
}

export const UNASSIGNED: TranslatedInput = { action: null, isBrowserDefaultStopped: false }

export const CONSUMED_ELSEWHERE: TranslatedInput = { action: null, isBrowserDefaultStopped: true }

// see T-266
export type GrabRow = GrabArea

// TRAP: the one place the hit's row is read as a T-266 row; widening it anywhere else would
// let a retired T-023d row through a branch that reads it as a grab margin of the new table.
/** @purity pure */
export function grabRowOf(hit: Hit): GrabRow {
  return hit.grab as GrabRow
}

/** @purity pure */
export function acted(action: InputAction): TranslatedInput {
  return { action, isBrowserDefaultStopped: true }
}

/** @purity pure */
export function changed(commands: readonly DocumentCommand[]): TranslatedInput {
  return commands.length === 0
    ? CONSUMED_ELSEWHERE
    : acted({ kind: 'changeDocument', writes: [commands] })
}

/** @purity pure */
export function changedAndCreated(
  writes: readonly (readonly DocumentCommand[])[],
  created: CreatedSubject,
): TranslatedInput {
  const owed = writes.filter((one) => one.length > 0)
  return owed.length === 0
    ? CONSUMED_ELSEWHERE
    : acted({ kind: 'changeDocument', writes: owed, created })
}

/** @purity pure */
export function nothingToDo(situation: SpentEntranceSituation | null): TranslatedInput {
  return acted({ kind: 'tellEntryHasNothingToDo', situation })
}

/** @purity pure */
export function foldsOrNothing(
  commands: readonly DocumentCommand[],
  situation: SpentEntranceSituation | null,
): TranslatedInput {
  return commands.length === 0 ? nothingToDo(situation) : changed(commands)
}

/** @purity pure */
export function changedInOrder(writes: readonly (readonly DocumentCommand[])[]): TranslatedInput {
  const owed = writes.filter((one) => one.length > 0)
  return owed.length === 0 ? CONSUMED_ELSEWHERE : acted({ kind: 'changeDocument', writes: owed })
}

/** @purity pure */
function browserKept(answer: TranslatedInput): TranslatedInput {
  return { action: answer.action, isBrowserDefaultStopped: false }
}


// STOP: spec does not decide whether Cmd reads as Ctrl. Looked in T-023, T-036, FR-070
// @provisional PND-10
/** @purity pure */
function isCtrlHeld(modifiers: InputModifiers): boolean {
  return modifiers.ctrl || modifiers.meta
}

/** @purity pure */
export function isCombo(
  modifiers: InputModifiers,
  ctrl: boolean,
  shift: boolean,
  alt: boolean,
): boolean {
  return isCtrlHeld(modifiers) === ctrl && modifiers.shift === shift && modifiers.alt === alt
}

/** @purity pure */
function isAssignedPointerCombo(modifiers: InputModifiers): boolean {
  return (
    isCombo(modifiers, false, false, false) ||
    isCombo(modifiers, true, false, false) ||
    isCombo(modifiers, false, true, false)
  )
}

/** @purity pure */
function gestureModifiers(input: PointerInput, context: InputContext): InputModifiers {
  const press = context.pressed
  return input.phase === 'down' || press === null ? input.modifiers : press.at.modifiers
}

export const KEY = {
  enter: 'Enter',
  escape: 'Esc',
  del: 'Delete',
  backspace: 'Backspace',
  f1: 'F1',
  f2: 'F2',
  f11: 'F11',
  a: 'A',
  c: 'C',
  d: 'D',
  e: 'E',
  f: 'F',
  o: 'O',
  p: 'P',
  r: 'R',
  s: 'S',
  v: 'V',
  y: 'Y',
  z: 'Z',
  plus: '+',
  minus: '-',
  zero: '0',
} as const

/** @purity pure */
export function isSingleCharacterKey(key: string): boolean {
  return key.length === 1
}


const MS_PER_DAY = 86400000

/** @purity pure */
export function serialOfDay(day: CalendarDay): number {
  return Math.floor(Date.UTC(day.year, day.month - 1, day.day) / MS_PER_DAY)
}

/** @purity pure */
export function dayFromSerial(serial: number): CalendarDay {
  const at = new Date(serial * MS_PER_DAY)
  return { year: at.getUTCFullYear(), month: at.getUTCMonth() + 1, day: at.getUTCDate() }
}

/** @purity pure */
export function dayShifted(day: CalendarDay, days: number): CalendarDay {
  return dayFromSerial(serialOfDay(day) + days)
}

// TRAP: keep this per axis as rowGrabAxisAt reads it; a diagonal gives one hand two answers.
/** @purity pure */
export function hasDraggedPastThreshold(press: PointerPress, at: { readonly x: number; readonly y: number }): boolean {
  const threshold = NOT_STORED_ROW_GRAB_SIZES['S-208']
  return Math.abs(at.x - press.at.x) > threshold || Math.abs(at.y - press.at.y) > threshold
}

/** @purity pure */
export function dayAtX(layout: ScheduleLayout, x: number): CalendarDay | null {
  return dateAtX(layout, x)
}

/** @purity pure */
export function scrollingRowsOf(layout: ScheduleLayout): readonly RowPlacement[] {
  return layout.rows.filter((row) => row.isPinned !== true)
}

/** @purity pure */
export function scrollAreaTopOf(context: InputContext): number {
  return context.layout.scrollAreaY ?? context.regions.rowArea.y
}

/** @purity pure */
export function rowAtY(layout: ScheduleLayout, y: number): RowPlacement | null {
  for (const row of layout.rows) {
    if (y >= row.y && y < row.y + row.height) return row
  }
  return null
}

// see GR-14, FR-019, RS-44
// WHY: not the drag amount for a move: a moved anchor would land where creating it at that point would not.
/** @purity pure */
export function commentAnchorAt(
  layout: ScheduleLayout,
  x: number,
  y: number,
): { readonly date: string; readonly groupId: string } | TranslatedInput {
  const day = dayAtX(layout, x)
  if (day === null) return CONSUMED_ELSEWHERE
  const row = rowAtY(layout, y)
  if (row === null) return nothingToDo('noRowToPutTheAnnotationOn')
  return { date: textOfDay(day), groupId: row.groupId }
}

/** @purity pure */
export function rowIndexAtTopEdge(rows: readonly RowPlacement[], y: number): number | null {
  for (let at = 0; at < rows.length; at++) {
    const row = rows[at]
    if (row === undefined) continue
    const next = rows[at + 1]
    const end = next === undefined ? row.y + row.height : next.y
    if (y >= row.y && y < end) return at
  }
  return null
}

export interface ScrollAnchor {
  readonly scrollDate: string | null
  readonly scrollDayOffset: number
  readonly scrollGroupId: string | null
  readonly scrollGroupOffset: number
}

/** @purity pure */
function unitFraction(value: number): number {
  if (!Number.isFinite(value)) return 0
  // WHY: dateAtX snaps a boundary within 1e-9 to the day it opens, so -1e-15 here is that edge, not 0.999... of a day.
  if (value < 0 && value > -1e-9) return 0
  const dropped = value - Math.floor(value)
  return dropped < 1 ? dropped : 0
}

// see GA-7, GA-8, HB-4
/** @purity pure */
export function pointerDaySerial(layout: ScheduleLayout, x: number): number | null {
  const day = dayAtX(layout, x)
  if (day === null) return null
  return serialOfDay(day) + unitFraction((x - xFromDay(layout, day)) / layout.pxPerDay)
}

/** @purity pure */
export function dayAnchorAt(
  context: InputContext,
  x: number,
): Pick<ScrollAnchor, 'scrollDate' | 'scrollDayOffset'> {
  const settings = context.document.documentSettings
  const layout = context.layout
  const day = dayAtX(layout, x)
  if (day === null || !(layout.pxPerDay > 0)) {
    return { scrollDate: settings.scrollDate, scrollDayOffset: settings.scrollDayOffset }
  }
  return {
    scrollDate: textOfDay(day),
    scrollDayOffset: unitFraction((x - xFromDay(layout, day)) / layout.pxPerDay),
  }
}

/** @purity pure */
function rowAnchorAt(
  context: InputContext,
  y: number,
): Pick<ScrollAnchor, 'scrollGroupId' | 'scrollGroupOffset'> {
  const settings = context.document.documentSettings
  return rowAnchorIn(scrollingRowsOf(context.layout), y, {
    scrollGroupId: settings.scrollGroupId,
    scrollGroupOffset: settings.scrollGroupOffset,
  })
}

/** @purity pure */
export function rowAnchorIn(
  rows: readonly RowPlacement[],
  y: number,
  held: Pick<ScrollAnchor, 'scrollGroupId' | 'scrollGroupOffset'>,
): Pick<ScrollAnchor, 'scrollGroupId' | 'scrollGroupOffset'> {
  const at = rowIndexAtTopEdge(rows, y)
  if (at === null) return held
  const row = rows[at]
  const below = rows[at + 1]
  if (row === undefined) return held
  // TRAP: scrollOffsetOf (schedule-layout.ts) inverts this; both must divide by the slab.
  const slab = below === undefined ? row.height : below.y - row.y
  if (slab <= 0) return held
  const into = y - row.y
  if (into >= slab && below !== undefined) {
    return { scrollGroupId: below.groupId, scrollGroupOffset: 0 }
  }
  return { scrollGroupId: row.groupId, scrollGroupOffset: unitFraction(into / slab) }
}

/** @purity pure */
export function panTo(context: InputContext, dx: number, dy: number): TranslatedInput {
  const moved = scrolledAnchor(context, dx, dy)
  return changed([
    {
      kind: 'setScrollPosition',
      scrollDate: moved.scrollDate,
      scrollDayOffset: moved.scrollDayOffset,
      scrollGroupId: moved.scrollGroupId,
      scrollGroupOffset: moved.scrollGroupOffset,
    },
  ])
}

/** @purity pure */
export function scrolledAnchor(context: InputContext, dx: number, dy: number): ScrollAnchor {
  const area = context.regions.rowArea
  return {
    ...dayAnchorAt(context, area.x + dx),
    ...rowAnchorAt(context, area.y + dy),
  }
}

// see PV-4, PV-5
/** @purity pure */
export function rememberedActualIn(context: InputContext, taskUid: number): RememberedActual | null {
  return context.screen.rememberedActuals[taskUid] ?? null
}

/** @purity pure */
export function isOnRowArea(context: InputContext, x: number, y: number): boolean {
  return regionAtPointer(context.regions, x, y) === 'rowArea'
}

// see T-023a
/** @purity pure */
export function pressRowOf(
  press: Pick<PointerPress, 'at' | 'hit'>,
  context: Pick<InputContext, 'screen' | 'dualCursorFollowing'>,
): PressRow {
  const modifiers = press.at.modifiers
  if (press.at.button === 'middle') return 'PTD-1'
  if (press.at.button === 'left' && isCombo(modifiers, true, false, false)) return 'PTD-1'
  if (context.dualCursorFollowing !== null) return 'PTD-2'
  if (press.hit !== null) return 'PTD-3'
  const armed = context.screen.armModeState
  if (armed.kind === 'dependencyArmed') return 'PTD-4a'
  if (armed.kind !== 'notArmed') return 'PTD-4'
  return 'PTD-5'
}


const TASK_SHAPE_KINDS: Readonly<Record<TaskShapeKind, true>> = {
  rectangle: true,
  chevron: true,
  arrow: true,
  endpointSpan: true,
  milestone: true,
}

/** @purity pure */
export function taskShapeKindOf(name: string): TaskShapeKind | null {
  return Object.prototype.hasOwnProperty.call(TASK_SHAPE_KINDS, name)
    ? (name as TaskShapeKind)
    : null
}

const TASK_MILESTONE_GLYPHS: Readonly<Record<TaskMilestoneGlyph, true>> = {
  circle: true,
  hexagon: true,
  pentagon: true,
  diamond: true,
  square: true,
  star: true,
  triangleUp: true,
  triangleDown: true,
  file: true,
  box: true,
  floppyDisk: true,
  cylinder: true,
  person: true,
  smile: true,
  beerMug: true,
}

/** @purity pure */
export function milestoneGlyphOf(name: string): TaskMilestoneGlyph | null {
  return Object.prototype.hasOwnProperty.call(TASK_MILESTONE_GLYPHS, name)
    ? (name as TaskMilestoneGlyph)
    : null
}

// TRAP: one creation per bundle; a second createTask would take mark + 2 while this answers mark + 1.
/** @purity pure */
export function nextIssuedUid(schedule: Schedule): number {
  return schedule.project.uidHighWaterMark + 1
}


export const ENTRY = {
  openDocument: 'IC-1',
  exportChooser: 'IC-2',
  copyPicture: 'IC-3',
  baselineVisible: 'IC-4',
  undo: 'IC-5',
  redo: 'IC-6',
  palette: 'IC-7',
  planDisplay: 'IC-8',
  actualDisplay: 'IC-9',
  fitToScreen: 'IC-10',
  fullScreen: 'IC-11',
  zoomTimeOut: 'IC-12',
  zoomTimeIn: 'IC-13',
  zoomRowOut: 'IC-14',
  zoomRowIn: 'IC-15',
  displayScaleDown: 'IC-104',
  displayScaleUp: 'IC-105',
  themePreference: 'IC-16',
  documentSettingsProperties: 'IC-17',
  agentApi: 'IC-20',
  dialogueFieldVisible: 'IC-18',
  aiExportModal: 'IC-19',
  help: 'IC-22',
  progressLineVisible: 'IC-39',
  progressMarkerVisible: 'IC-40',
  dateGridLinesVisible: 'IC-42',
  groupGridLinesVisible: 'IC-43',
  assigneeVisible: 'IC-79',
  percentCompleteVisible: 'IC-80',
  dependencyVisible: 'IC-81',
  planDatesVisible: 'IC-103',
  fontScale: 'IC-99',
  themeMonochrome: 'IC-100',
  stackDirection: 'IC-101',
  // DEVIATION: spec says EN-5 paints this entrance while shown; here it is not painted (DFC-724)
  watermark: 'IC-41',
  statusLine: 'IC-44',
  alignStart: 'IC-37',
  alignFinish: 'IC-38',
  dualCursor: 'IC-45',
  guideCursorCrosshair: 'IC-47',
  guideCursorSingleVertical: 'IC-48',
  milestoneList: 'IC-50',
  paletteMinimise: 'IC-75',
  interactionRecord: 'IC-76',
  closeSurface: 'IC-52',
  paletteGrabBand: 'IC-53',
  rowExpanderOpen: 'IC-58',
  rowExpanderClose: 'IC-59',
  rowExpanderCloseBelow: 'IC-77',
  rowExpanderOpenOneLevel: 'IC-90',
  rowAddChild: 'IC-91',
  rowExpanderOpenAll: 'IC-74',
  rowExpanderCloseAll: 'IC-78',
  rowExpanderOpenLevelZero: 'IC-92',
  rowAddTopRow: 'IC-93',
  rowPin: 'IC-60',
  rowDelete: 'IC-82',
  resourceRoster: 'IC-62',
  rosterChooseAll: 'IC-63',
  rosterClearChosen: 'IC-64',
  rosterChooseUnreferenced: 'IC-65',
  rosterChosen: 'IC-67',
  rosterUnchosen: 'IC-68',
} as const

type VisibleElement = Extract<DocumentCommand, { kind: 'setElementVisible' }>['element']

const VISIBLE_ELEMENT_BY_ENTRY: Readonly<Record<string, VisibleElement>> = {
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

/** @purity pure */
function visibleElementOfEntry(entry: string): VisibleElement | null {
  return Object.prototype.hasOwnProperty.call(VISIBLE_ELEMENT_BY_ENTRY, entry)
    ? (VISIBLE_ELEMENT_BY_ENTRY[entry] as VisibleElement)
    : null
}

type GuideCursorMode = Extract<DocumentCommand, { kind: 'setGuideCursorMode' }>['mode']

const GUIDE_CURSOR_MODE_BY_ENTRY: Readonly<Record<string, GuideCursorMode>> = {
  'IC-47': 'crosshair',
  'IC-48': 'single-vertical',
}

/** @purity pure */
function guideCursorModeOfEntry(entry: string): GuideCursorMode | null {
  return Object.prototype.hasOwnProperty.call(GUIDE_CURSOR_MODE_BY_ENTRY, entry)
    ? (GUIDE_CURSOR_MODE_BY_ENTRY[entry] as GuideCursorMode)
    : null
}

type FontScale = Extract<DocumentCommand, { kind: 'setFontScale' }>['scale']

const FONT_SCALE_STEPS: readonly FontScale[] = ['S', 'M', 'L']

/** @purity pure */
function nextFontScale(current: FontScale): FontScale {
  const at = FONT_SCALE_STEPS.indexOf(current)
  return FONT_SCALE_STEPS[(at + 1) % FONT_SCALE_STEPS.length] as FontScale
}

export type Armed = Exclude<ScreenValues['armModeState'], { readonly kind: 'notArmed' }>

// TRAP: the arm types shapeKind and glyph as bare strings; a misspelling here compiles and arms nothing.
const ARMED_BY_ENTRY: Readonly<Record<string, Armed>> = {
  'IC-23': { kind: 'taskShapeArmed', shapeKind: 'rectangle' },
  'IC-24': { kind: 'taskShapeArmed', shapeKind: 'chevron' },
  'IC-25': { kind: 'taskShapeArmed', shapeKind: 'arrow' },
  'IC-26': { kind: 'taskShapeArmed', shapeKind: 'endpointSpan' },
  'IC-27': { kind: 'milestoneShapeArmed', glyph: 'circle' },
  'IC-28': { kind: 'milestoneShapeArmed', glyph: 'hexagon' },
  'IC-29': { kind: 'milestoneShapeArmed', glyph: 'pentagon' },
  'IC-30': { kind: 'milestoneShapeArmed', glyph: 'diamond' },
  'IC-31': { kind: 'milestoneShapeArmed', glyph: 'square' },
  'IC-32': { kind: 'milestoneShapeArmed', glyph: 'star' },
  'IC-33': { kind: 'milestoneShapeArmed', glyph: 'triangleUp' },
  'IC-34': { kind: 'milestoneShapeArmed', glyph: 'triangleDown' },
  'IC-83': { kind: 'milestoneShapeArmed', glyph: 'file' },
  'IC-84': { kind: 'milestoneShapeArmed', glyph: 'box' },
  'IC-85': { kind: 'milestoneShapeArmed', glyph: 'floppyDisk' },
  'IC-86': { kind: 'milestoneShapeArmed', glyph: 'cylinder' },
  'IC-87': { kind: 'milestoneShapeArmed', glyph: 'person' },
  'IC-88': { kind: 'milestoneShapeArmed', glyph: 'smile' },
  'IC-89': { kind: 'milestoneShapeArmed', glyph: 'beerMug' },
  'IC-35': { kind: 'commentBoxArmed' },
  'IC-36': { kind: 'highlightBoxArmed' },
  'IC-61': { kind: 'dependencyArmed' },
}

/** @purity pure */
export function armedByEntry(entry: string): Armed | null {
  return Object.prototype.hasOwnProperty.call(ARMED_BY_ENTRY, entry)
    ? (ARMED_BY_ENTRY[entry] as Armed)
    : null
}



// see PI-18, T-023, T-036
/** @purity pure */
export function commandFromInput(input: HumanInput, context: InputContext): TranslatedInput {
  switch (input.kind) {
    case 'key':
      return commandFromKey(input, context)
    case 'wheel':
      return commandFromWheel(input, context)
    case 'pointer':
      return commandFromPointer(input, context)
  }
}

// see T-019, T-019a
// TRAP: write back the row the Task already stands at; choosing one lets an end drag finish it.
/** @purity pure */
export function placementAt(task: Task): PlacedPlanActual | null {
  const actualStart = task.actualStart
  if (actualStart === null) return null
  switch (planActualState(task)) {
    case 'notStarted':
      return null
    case 'inProgress':
      return task.stop === null ? null : { row: 'PA-2', actualStart, stop: task.stop }
    case 'suspendedResumePlanned':
      return task.stop === null || task.resume === null
        ? null
        : { row: 'PA-3', actualStart, stop: task.stop, resume: task.resume }
    case 'suspendedResumeUnknown':
      return task.stop === null ? null : { row: 'PA-4', actualStart, stop: task.stop }
    case 'finished':
      return task.actualFinish === null
        ? null
        : { row: 'PA-5', actualStart, actualFinish: task.actualFinish }
  }
}

// see CM-66
/** @purity pure */
export function isScrollPositionInForce(
  context: InputContext,
  to: Extract<DocumentCommand, { kind: 'setScrollPosition' }>,
): boolean {
  const settings = context.document.documentSettings
  // TRAP: compare every member CM-66 writes; one left out reads a real movement as none.
  return (
    to.scrollDate === settings.scrollDate &&
    to.scrollGroupId === settings.scrollGroupId &&
    to.scrollDayOffset === settings.scrollDayOffset &&
    to.scrollGroupOffset === settings.scrollGroupOffset
  )
}

// see MK-12, T-023a
/** @purity pure */
function commandFromPointer(input: PointerInput, context: InputContext): TranslatedInput {
  const assigned = pointerAssignment(input, context)
  // TRAP: read MK-12 after table T-023a has decided; read before, it makes the gesture inert.
  if (isAssignedPointerCombo(gestureModifiers(input, context))) return assigned
  return isOnTheChart(context, input) ? browserStopped(assigned) : browserKept(assigned)
}

// see PE-0
// WHY: the press point alone is not enough; a gesture that began on the chart keeps the browser
// off for the whole drag, or the text under the pointer is taken once it leaves the row area.
/** @purity pure */
function isOnTheChart(context: InputContext, input: PointerInput): boolean {
  const press = context.pressed
  const at = press === null || press.on !== null ? input : press.at
  // WHY: the right button is left alone; stopping it would take the context menu, which is
  // not what PE-0 asks for -- the row that names text selection, not the browser's own menus.
  if (at.button === 'right') return false
  const region = regionAtPointer(context.regions, at.x, at.y)
  return region === 'rowArea' || region === 'timeRuler'
}

// see PE-0
/** @purity pure */
function browserStopped(answer: TranslatedInput): TranslatedInput {
  return { action: answer.action, isBrowserDefaultStopped: true }
}

// see T-023a, IN-1, IN-1a, MK-10
/** @purity pure */
function pointerAssignment(input: PointerInput, context: InputContext): TranslatedInput {
  if (input.phase === 'down') {
    if (input.button === 'right') return UNASSIGNED
    const press = context.pressed
    if (press !== null && press.on !== null) return CONSUMED_ELSEWHERE
    return isOnRowArea(context, input.x, input.y) ? CONSUMED_ELSEWHERE : UNASSIGNED
  }
  if (input.phase === 'move') {
    const panning = panFollow(input, context)
    if (panning !== UNASSIGNED) return panning
    const scrolling = scrollbarFollow(input, context)
    if (scrolling !== UNASSIGNED) return scrolling
    const palette = paletteFollow(input, context)
    return palette === UNASSIGNED ? rowGrabFollow(input, context) : palette
  }
  // TRAP: consumed so the shell drops the press; one left standing makes AG-9 refuse later writes.
  if (input.phase === 'lost') return CONSUMED_ELSEWHERE

  const press = context.pressed
  if (press === null) return UNASSIGNED
  if (press.on !== null) return commandFromEntry(input, press, context)
  // TRAP: judge the region only for a press with no hit; judged by coordinates, AS-1's double
  // click on an assignee label is lost.
  if (press.hit === null && !isOnRowArea(context, press.at.x, press.at.y)) return UNASSIGNED

  switch (pressRowOf(press, context)) {
    case 'PTD-1': {
      const by = followingTravel(input, press)
      return panTo(context, -by.dx, -by.dy)
    }
    case 'PTD-2':
      return commandFromDualCursorPress(press, context)
    case 'PTD-3':
      return context.screen.armModeState.kind === 'dependencyArmed'
        ? commandFromDependencyDrag(input, press, context)
        : commandFromGrab(input, press, context)
    case 'PTD-4':
      return commandFromArmed(input, press, context)
    case 'PTD-4a':
      return CONSUMED_ELSEWHERE
    case 'PTD-5':
      return CONSUMED_ELSEWHERE
  }
}

/** @purity pure */
export function followingTravel(
  at: PointerInput,
  press: PointerPress,
): { readonly dx: number; readonly dy: number } {
  // TRAP: measure from followedTo: a piece measured from the press overshoots after the first.
  const from = press.followedTo ?? press.at
  return { dx: at.x - from.x, dy: at.y - from.y }
}

// see PTD-1, UN-8
/** @purity pure */
function panFollow(input: PointerInput, context: InputContext): TranslatedInput {
  const press = context.pressed
  if (press === null) return UNASSIGNED
  if (press.on !== null) return UNASSIGNED
  if (press.pressRow !== 'PTD-1') return UNASSIGNED
  // TRAP: without followedTo the caller records no piece, so travels from the press add up.
  if (press.followedTo === undefined) return UNASSIGNED
  // WHY: a write per move, not a preview settled on release: the anchor is read from the
  // layout the preview drew, so the whole travel would be applied again each frame.
  const by = followingTravel(input, press)
  return panTo(context, -by.dx, -by.dy)
}

// see T-109, IN-1, FR-085
/** @purity pure */
function commandFromEntry(
  release: PointerInput,
  press: PointerPress,
  context: InputContext,
): TranslatedInput {
  const on = press.on
  if (on === null) return CONSUMED_ELSEWHERE
  // TRAP: before the entry === null branch: divider, scrollbar and GR-20 presses carry no entry.
  if (on.dividerPanel !== null) return commandFromPanelDivider(on.dividerPanel, release, press, context)
  if (on.scrollbarAxis !== undefined) {
    return commandFromScrollbar(on.scrollbarAxis, release, press, context)
  }
  const grabbed = grabbedRowGroupId(press)
  if (grabbed !== null) return commandFromRowGrab(release, press, context, grabbed)
  if (on.entry === null) {
    if (on.rowGroupId !== null) {
      if (press.at.clickCount >= 2) {
        return acted({ kind: 'editInPlace', target: { kind: 'rowName', groupId: on.rowGroupId } })
      }
      return acted({
        kind: 'chooseRow',
        groupId: on.rowGroupId,
        isExtending: press.at.modifiers.shift,
      })
    }
    // TRAP: consuming this breaks caret placement in FR-035's name field, settled on pointerup.
    return UNASSIGNED
  }
  const entry = on.entry

  switch (entry) {
    case ENTRY.openDocument:
      return acted({ kind: 'openDocumentFile' })
    case ENTRY.copyPicture:
      return acted({ kind: 'copyPictureToClipboard' })
    case ENTRY.undo:
      return acted({ kind: 'undoEdit' })
    case ENTRY.redo:
      return acted({ kind: 'redoEdit' })
    case ENTRY.fitToScreen:
      return changedInOrder(fitWrites(context))
    // TRAP: while held, the same press is answered again; these arms must not read the release.
    case ENTRY.zoomTimeIn:
    case ENTRY.zoomTimeOut: {
      const factor = keyZoomFactor(context, entry === ENTRY.zoomTimeIn)
      return changed(zoomWrites(context, zoomTimes(context, factor, 'x'), null, null, null))
    }
    // see ZE-2, ZE-3, ZE-5, SE-5
    // TRAP: at an end the message alone tells it; an FR-029 notice beside it is forbidden.
    case ENTRY.zoomRowIn:
    case ENTRY.zoomRowOut:
      return rowZoomAnswer(context, keyZoomFactor(context, entry === ENTRY.zoomRowIn), null, null)
    case ENTRY.baselineVisible:
    case ENTRY.progressLineVisible:
    case ENTRY.progressMarkerVisible:
    case ENTRY.dateGridLinesVisible:
    case ENTRY.groupGridLinesVisible:
    case ENTRY.assigneeVisible:
    case ENTRY.percentCompleteVisible:
    case ENTRY.dependencyVisible:
    case ENTRY.planDatesVisible:
      return commandFromVisibleElementEntry(entry, context)
    case ENTRY.planDisplay:
    case ENTRY.actualDisplay:
      return commandFromVisibleElementEntry(entry, context)
    case ENTRY.themePreference: {
      const isDarkNow = context.document.documentSettings.themePreference === 'dark'
      return changed([{ kind: 'setThemePreference', preference: isDarkNow ? 'light' : 'dark' }])
    }
    // see FR-039, CM-74, SE-5
    case ENTRY.displayScaleDown:
    case ENTRY.displayScaleUp:
      return displayScaleStep(context, entry === ENTRY.displayScaleUp ? 1 : -1)
    case ENTRY.fontScale:
      return changed([
        {
          kind: 'setFontScale',
          scale: nextFontScale(context.document.documentSettings.fontScale),
        },
      ])
    case ENTRY.themeMonochrome:
      return changed([
        {
          kind: 'setThemeMonochrome',
          monochrome: !context.document.documentSettings.themeMonochrome,
        },
      ])
    case ENTRY.stackDirection: {
      const isUpNow = context.document.documentSettings.stackDirection === 'up'
      return changed([{ kind: 'setStackDirection', direction: isUpNow ? 'down' : 'up' }])
    }
    case ENTRY.statusLine:
      return changed([
        context.document.schedule.project.statusDate === null
          ? { kind: 'setStatusDate', date: context.today }
          : { kind: 'clearStatusDate' },
      ])
    case ENTRY.dualCursor:
      return commandFromDualCursorEntry(press, context)
    case ENTRY.guideCursorCrosshair:
    case ENTRY.guideCursorSingleVertical:
      return commandFromGuideCursorEntry(entry, context)
    case ENTRY.paletteMinimise:
      return acted({ kind: 'togglePaletteMinimised' })
    case ENTRY.interactionRecord:
      return acted({ kind: 'toggleInteractionRecord' })
    case ENTRY.fullScreen:
      return acted({ kind: 'toggleFullScreen' })
    case ENTRY.milestoneList:
      return acted({ kind: 'toggleMilestoneList' })
    case ENTRY.paletteGrabBand:
      return acted({ kind: 'moveCommandPalette', by: followingTravel(release, press) })
    case ENTRY.rowExpanderOpen:
    case ENTRY.rowExpanderClose:
    case ENTRY.rowExpanderCloseBelow:
    case ENTRY.rowExpanderOpenOneLevel:
    case ENTRY.rowAddChild:
    case ENTRY.rowPin:
    case ENTRY.rowDelete:
      return commandFromRowEntry(entry, on.rowGroupId, context)
    case ENTRY.rowExpanderOpenAll:
      return commandFromRowExpanderOpenAll(context)
    case ENTRY.alignStart:
    case ENTRY.alignFinish:
      // TRAP: count chosen Tasks among drawn rows (a fold hides one without changing Selection),
      // and read Selection, not the drawn palette, which can be a skipped paint old.
      if (context.selection.ordered && chosenDrawnTaskCount(context) >= 2) {
        return changed(alignWrites(context, entry === ENTRY.alignStart))
      }
      return nothingToDo('noTaskChosenToAlignWith')
    case ENTRY.rowExpanderCloseAll:
      return commandFromRowExpanderCloseAll(context)
    case ENTRY.rowExpanderOpenLevelZero:
      return commandFromRowExpanderOpenLevelZero(context)
    case ENTRY.rowAddTopRow:
      return rowStoodUp(context, null, 1)
    case ENTRY.documentSettingsProperties:
      return acted({ kind: 'toggleDocumentSettingsProperties' })
    case ENTRY.agentApi:
      return acted({ kind: 'toggleAgentApi' })
    case ENTRY.dialogueFieldVisible:
      return acted({ kind: 'toggleDialogueFieldVisible' })
    case ENTRY.rosterChooseAll:
    case ENTRY.rosterClearChosen:
    case ENTRY.rosterChooseUnreferenced:
      return acted({
        kind: 'chooseResources',
        uids: rosterChoiceOfEntry(entry, context.document.schedule),
      })
    case ENTRY.rosterChosen:
    case ENTRY.rosterUnchosen: {
      if (on.resourceUid === null) return CONSUMED_ELSEWHERE
      return acted({ kind: 'toggleChosenResource', uid: on.resourceUid })
    }
    default:
      return commandFromArmingEntry(entry, context)
  }
}

// see FR-049, CM-58
/** @purity pure */
function commandFromVisibleElementEntry(entry: string, context: InputContext): TranslatedInput {
  const element = visibleElementOfEntry(entry)
  if (element === null) return CONSUMED_ELSEWHERE
  // TRAP: read the document, not the drawn entry: a skipped paint leaves it stale and stuck.
  const isVisibleNow = context.document.documentSettings[element]
  return changed([{ kind: 'setElementVisible', element, visible: !isVisibleNow }])
}

// see FR-048, CM-59
/** @purity pure */
function commandFromGuideCursorEntry(entry: string, context: InputContext): TranslatedInput {
  const mode = guideCursorModeOfEntry(entry)
  if (mode === null) return CONSUMED_ELSEWHERE
  const standing = context.document.documentSettings.guideCursorMode
  return changed([{ kind: 'setGuideCursorMode', mode: standing === mode ? 'none' : mode }])
}

// see IC-63, IC-64, IC-65
/** @purity pure */
function rosterChoiceOfEntry(entry: string, schedule: Schedule): readonly number[] {
  if (entry === ENTRY.rosterClearChosen) return []
  if (entry === ENTRY.rosterChooseAll) return schedule.resources.map((one) => one.uid)
  const referred = new Set<number>()
  for (const assignment of schedule.assignments) {
    if (assignment.resourceUid !== null) referred.add(assignment.resourceUid)
  }
  return schedule.resources.filter((one) => !referred.has(one.uid)).map((one) => one.uid)
}

/** @purity pure */
export function rowGrabDepthOf(byId: ReadonlyMap<string, TaskGroup>, row: TaskGroup): number {
  let depth = 1
  let foundAt = row.parentId
  for (let guard = 0; foundAt !== null && guard <= byId.size; guard++) {
    const parent = byId.get(foundAt)
    if (parent === undefined) break
    depth += 1
    foundAt = parent.parentId
  }
  return depth
}

/** @purity pure */
export function rowDepthOfGroup(context: InputContext, groupId: string): number {
  const rows = context.document.schedule.taskGroups
  const byId = new Map(rows.map((one) => [one.id, one]))
  const found = byId.get(groupId)
  return found === undefined ? 1 : rowGrabDepthOf(byId, found)
}

// see GR-14
/** @purity pure */
export function boxById<Box extends { readonly id: string }>(boxes: readonly Box[], id: string): Box | undefined {
  return boxes.find((one) => one.id === id)
}

// see HB-3, GA-9
// TRAP: sort by y, not layout order: FR-098 lifts pinned rows, so layout order is not what is drawn.
/** @purity pure */
export function drawnRowsOf(layout: ScheduleLayout): readonly RowPlacement[] {
  return [...layout.rows].sort((a, b) => a.y - b.y)
}

// see HB-3
// WHY: counts the row tops crossed, so a press on a box's edge and one inside the row move by the same rows.
/** @purity pure */
export function drawnRowsCrossed(rows: readonly RowPlacement[], fromY: number, toY: number): number {
  const topsAtOrAbove = (y: number): number => rows.filter((row) => row.y <= y).length
  return topsAtOrAbove(toY) - topsAtOrAbove(fromY)
}

// see FR-029, FR-034
/** @purity pure */
function chosenDrawnTaskCount(context: InputContext): number {
  const chosen = context.selection.items.filter((one) => one.kind === 'task')
  const drawnIds = context.drawnRowGroupIds
  // TRAP: absent means no picture was handed over (keep the wider count); an empty array is honoured.
  if (drawnIds === undefined) return chosen.length
  const drawn = new Set(drawnIds)
  const drawnTaskUids = new Set<number>()
  for (const member of context.document.schedule.taskGroupMembers) {
    if (drawn.has(member.groupId)) drawnTaskUids.add(member.taskUid)
  }
  return chosen.filter((one) => one.kind === 'task' && drawnTaskUids.has(one.uid)).length
}

// see FR-034, SL-7b
// STOP: spec does not decide whether the unaligned end follows or holds still. Looked in FR-034, CM-11, IV-10
// @provisional PND-406
/** @purity pure */
function alignWrites(context: InputContext, byStart: boolean): readonly DocumentCommand[] {
  const chosen = context.selection.items.filter((one) => one.kind === 'task')
  const anchorRef = chosen[chosen.length - 1]
  if (anchorRef === undefined || anchorRef.kind !== 'task') return []
  const anchor = taskByUid(context.document.schedule, anchorRef.uid)
  const anchorDay = anchor === null ? null : dayOf(byStart ? anchor.start : anchor.finish)
  if (anchorDay === null) return []

  const commands: DocumentCommand[] = []
  for (const one of chosen) {
    if (one.kind !== 'task' || one.uid === anchorRef.uid) continue
    const task = taskByUid(context.document.schedule, one.uid)
    if (task === null) continue
    const start = dayOf(task.start)
    const finish = dayOf(task.finish)
    if (start === null || finish === null) continue
    const shift = serialOfDay(anchorDay) - serialOfDay(byStart ? start : finish)
    if (shift === 0) continue
    commands.push({
      kind: 'setTaskPlanDates',
      uid: one.uid,
      start: textOfDay(dayShifted(start, shift)),
      finish: textOfDay(dayShifted(finish, shift)),
    })
  }
  return commands
}

export type PlacedPlanActual = Extract<DocumentCommand, { kind: 'setTaskPlanActualState' }>['place']

export type ActualEndHold = 'GA-3' | 'GA-4' | 'GA-12' | 'GA-13' | 'GA-16'

// TRAP: schedule.ts holds the same walk under the same name; change both together.
// see IV-19
/** @purity pure */
export function taskGroupRankById(groups: readonly TaskGroup[]): ReadonlyMap<string, number> {
  const childrenOf = new Map<string | null, TaskGroup[]>()
  const holds = new Set(groups.map((group) => group.id))
  for (const group of groups) {
    const parent = group.parentId !== null && holds.has(group.parentId) ? group.parentId : null
    const siblings = childrenOf.get(parent)
    if (siblings === undefined) childrenOf.set(parent, [group])
    else siblings.push(group)
  }
  for (const siblings of childrenOf.values()) siblings.sort((a, b) => a.order - b.order)

  const rankById = new Map<string, number>()
  const walk = (parent: string | null): void => {
    for (const group of childrenOf.get(parent) ?? []) {
      if (rankById.has(group.id)) continue
      rankById.set(group.id, rankById.size)
      walk(group.id)
    }
  }
  walk(null)
  for (const group of groups) if (!rankById.has(group.id)) rankById.set(group.id, rankById.size)
  return rankById
}

/** @purity pure */
export function dayShift(context: InputContext, fromX: number, toX: number): number {
  const from = dayAtX(context.layout, fromX)
  const to = dayAtX(context.layout, toX)
  if (from === null || to === null) return 0
  return serialOfDay(to) - serialOfDay(from)
}

/** @purity pure */
export function compareDay(a: CalendarDay, b: CalendarDay): number {
  return serialOfDay(a) - serialOfDay(b)
}

const TOP_ROW_DEPTH = 1

// see FR-016, S-36, S-38, S-13
/** @purity pure */
export function zoomYCeiling(context: InputContext): number | null {
  const settings = context.document.documentSettings
  const ceiling = zoomYAtRectangleLabelFont(rowTitleFontPxOf(TOP_ROW_DEPTH, settings), settings)
  if (!Number.isFinite(ceiling) || ceiling <= 0) return null
  return ceiling
}

// see FR-016, ZE-1, PI-5
/** @purity pure */
export function rowsAtZoomY(
  context: InputContext,
  measuredWith: DocumentSettings,
  zoomY: number,
): readonly RowPlacement[] {
  return rowPlacesAtZoomY(
    context.document.schedule,
    measuredWith,
    context.regions,
    zoomY,
    context.isLevelZeroFolded,
    context.rowControlsHeightPx,
  )
}

// see IN-4
/** @purity pure */
export function escapeContextOf(context: InputContext): EscapeContext {
  return {
    isNoticeStanding: context.isNoticeStanding === true,
    isTextEntryUnsettled: context.isTextEntryUnsettled,
    isSurfaceOpen: context.screen.openSurfaceState.kind === 'open',
    gestureInFlight: context.pressed !== null,
    isArmed: context.screen.armModeState.kind !== 'notArmed',
    isPropertiesPanelOpen: context.isPropertiesPanelShowing === true,
    isSelectionStanding: context.selection.items.length > 0,
    dualCursorMode: context.dualCursorFollowing !== null,
  }
}

// <generated -- do not edit by hand>
// Single source of truth:
//   docs/spec/_source/settings.json (table T-206, which names table T-201)
// Rebuild: npm run gen   ||   npm run gen:check fails on drift.
// see T-206
export const NOT_STORED_ZOOM_STEP: {
  readonly 'S-96': number
} = {
  'S-96': 1.1,
}

// see T-206
export const NOT_STORED_ROW_GRAB_SIZES: {
  readonly 'S-208': number
  readonly 'S-212': number
} = {
  'S-208': 6,
  'S-212': 0.4,
}

// see T-206
export const NOT_STORED_VISIBLE_DAY_FLOOR: {
  readonly 'S-229': number
} = {
  'S-229': 10,
}

// see T-206
export const NOT_STORED_ROW_BAND_CEILING_SEARCH: {
  readonly 'S-238': number
  readonly 'S-239': number
} = {
  'S-238': 1.1,
  'S-239': 0.000001,
}

// see T-206
export const NOT_STORED_PROPERTIES_PANEL_FLOOR: {
  readonly 'S-248': number
} = {
  'S-248': 160,
}
// </generated>
