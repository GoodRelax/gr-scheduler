// InputCommandTranslator -- public entry of this folder.
// @unit      UF-30   (docs/spec/05-07-design.md, table T-075)
// @component InputCommandTranslator, layer Adapter (table T-062)
// @purity    pure
// @publishes table T-064 row PI-18
// The marked region at the bottom is generated from docs/spec/_source/settings.json:
// do not edit by hand, rebuild with `npm run gen`.

import type { Document } from '../../entity/document-model/document/document'
import {
  escapeTarget,
  screenStateWithArmed,
  screenStateWithFullScreen,
  screenStateWithPalette,
  screenStateWithSurface,
  screenStateWithWatermark,
  type Armed,
  type DualCursorSide,
  type EscapeContext,
  type ScreenState,
} from '../../entity/document-model/screen-state/screen-state'
import {
  COLUMN_SHAPES,
  dateFromWorkingDays,
  dayOf,
  planActualState,
  taskByUid,
  textOfDay,
  workingCalendarOf,
  workingDaysBetween,
  type CalendarDay,
  type Schedule,
  type Task,
  type TaskGroup,
} from '../../entity/document-model/schedule/schedule'
import {
  selectionOfAll,
  selectionWith,
  selectionWithout,
  emptySelection,
  isSelected,
  type ItemRef,
  type Selection,
} from '../../entity/document-model/selection/selection'
import {
  dependencyEndAtPointer,
  itemsInMarquee,
  type Hit,
  type Item,
} from '../../entity/layout-engine/item-hit-area/item-hit-area'
import type { ScheduleGeometry } from '../../entity/layout-engine/schedule-geometry/schedule-geometry'
import {
  dateAtX,
  fitZoom,
  groupDepthLimit,
  groupDepthThresholdOf,
  rowPlacesAtZoomY,
  xFromDay,
  type RowPlacement,
  type ScheduleLayout,
  type TaskPlacement,
} from '../../entity/layout-engine/schedule-layout/schedule-layout'
import {
  regionAtPointer,
  type ScreenRect,
  type ScreenRegions,
} from '../../entity/layout-engine/screen-regions/screen-regions'
import type { FieldCommit, ScreenPart } from '../screen-renderer/screen-renderer'
import { DEFAULT_ROW_NAME } from '../../use-case/edit-document/edit-document'
import type {
  DocumentCommand,
  TaskMilestoneGlyph,
  TaskShapeKind,
} from '../../use-case/edit-document/edit-document'
import type {
  HumanInput,
  InputModifiers,
  KeyInput,
  PointerInput,
  WheelInput,
} from './input-source'

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


export type PressRow = 'PTD-1' | 'PTD-2' | 'PTD-3' | 'PTD-4' | 'PTD-4a' | 'PTD-5'

type ScrollbarAxis = NonNullable<ScreenPart['scrollbarAxis']>

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
}

export interface InputContext {
  readonly document: Document
  readonly layout: ScheduleLayout
  readonly geometry: ScheduleGeometry
  readonly regions: ScreenRegions
  readonly screenState: ScreenState
  readonly selection: Selection
  readonly zoomStep: number
  readonly zoomMin: number
  readonly zoomMax: number
  readonly isPictureAtStoredZoom?: boolean
  readonly rowControlsHeightPx?: number
  // TRAP: on a down this must already be that press; left null, every drawn entry reads unassigned.
  readonly pressed: PointerPress | null
  readonly isTextEntryUnsettled: boolean
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

type SetDualCursor = Extract<DocumentCommand, { readonly kind: 'setDualCursor' }>

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
  | {
      readonly kind: 'setDualCursorFollowing'
      readonly following: DualCursorSide | null
      readonly placed: SetDualCursor | ClearDualCursor | null
    }

export interface TranslatedInput {
  readonly action: InputAction | null
  readonly isBrowserDefaultStopped: boolean
}

const UNASSIGNED: TranslatedInput = { action: null, isBrowserDefaultStopped: false }

const CONSUMED_ELSEWHERE: TranslatedInput = { action: null, isBrowserDefaultStopped: true }

const MK_13_GRAB_ROWS: ReadonlySet<string> = new Set([
  'GR-5', 'GR-6', 'GR-9', 'GR-12', 'GR-14', 'GR-15', 'GR-17', 'GR-18',
])

/** @purity pure */
function acted(action: InputAction): TranslatedInput {
  return { action, isBrowserDefaultStopped: true }
}

/** @purity pure */
function changed(commands: readonly DocumentCommand[]): TranslatedInput {
  return commands.length === 0
    ? CONSUMED_ELSEWHERE
    : acted({ kind: 'changeDocument', writes: [commands] })
}

/** @purity pure */
function changedAndCreated(
  writes: readonly (readonly DocumentCommand[])[],
  created: CreatedSubject,
): TranslatedInput {
  const owed = writes.filter((one) => one.length > 0)
  return owed.length === 0
    ? CONSUMED_ELSEWHERE
    : acted({ kind: 'changeDocument', writes: owed, created })
}

/** @purity pure */
function nothingToDo(situation: SpentEntranceSituation | null): TranslatedInput {
  return acted({ kind: 'tellEntryHasNothingToDo', situation })
}

/** @purity pure */
function foldsOrNothing(
  commands: readonly DocumentCommand[],
  situation: SpentEntranceSituation | null,
): TranslatedInput {
  return commands.length === 0 ? nothingToDo(situation) : changed(commands)
}

/** @purity pure */
function changedInOrder(writes: readonly (readonly DocumentCommand[])[]): TranslatedInput {
  const owed = writes.filter((one) => one.length > 0)
  return owed.length === 0 ? CONSUMED_ELSEWHERE : acted({ kind: 'changeDocument', writes: owed })
}

/** @purity pure */
function fitWrites(context: InputContext): readonly (readonly DocumentCommand[])[] {
  return [[fitCommand(context)], [{ kind: 'expandAllTaskGroups' }]]
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
function isCombo(
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

const KEY = {
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

const HELP_MODAL = 'Help Modal'

const AI_EXPORT_MODAL = 'AI Export Modal'
const RESOURCE_ROSTER = 'Resource Roster'
const EXPORT_CHOOSER = 'Export Chooser'

const WATERMARK_UNLOCK = 'Watermark Unlock'

// TRAP: never put this in ScreenState.surface; the drawing side would draw the panel as a modal.
const PROPERTIES_PANEL = 'Properties Panel'

/** @purity pure */
function isSingleCharacterKey(key: string): boolean {
  return key.length === 1
}


const MS_PER_DAY = 86400000

/** @purity pure */
function serialOfDay(day: CalendarDay): number {
  return Math.floor(Date.UTC(day.year, day.month - 1, day.day) / MS_PER_DAY)
}

/** @purity pure */
function dayFromSerial(serial: number): CalendarDay {
  const at = new Date(serial * MS_PER_DAY)
  return { year: at.getUTCFullYear(), month: at.getUTCMonth() + 1, day: at.getUTCDate() }
}

/** @purity pure */
function dayShifted(day: CalendarDay, days: number): CalendarDay {
  return dayFromSerial(serialOfDay(day) + days)
}

// TRAP: keep this per axis as rowGrabAxisAt reads it; a diagonal gives one hand two answers.
/** @purity pure */
function hasDraggedPastThreshold(press: PointerPress, at: { readonly x: number; readonly y: number }): boolean {
  const threshold = NOT_STORED_ROW_GRAB_SIZES['S-208']
  return Math.abs(at.x - press.at.x) > threshold || Math.abs(at.y - press.at.y) > threshold
}

/** @purity pure */
function dayAtX(layout: ScheduleLayout, x: number): CalendarDay | null {
  return dateAtX(layout, x)
}

/** @purity pure */
function scrollingRowsOf(layout: ScheduleLayout): readonly RowPlacement[] {
  return layout.rows.filter((row) => row.isPinned !== true)
}

/** @purity pure */
function scrollAreaTopOf(context: InputContext): number {
  return context.layout.scrollAreaY ?? context.regions.rowArea.y
}

/** @purity pure */
function rowAtY(layout: ScheduleLayout, y: number): RowPlacement | null {
  for (const row of layout.rows) {
    if (y >= row.y && y < row.y + row.height) return row
  }
  return null
}

/** @purity pure */
function rowIndexAtTopEdge(rows: readonly RowPlacement[], y: number): number | null {
  for (let at = 0; at < rows.length; at++) {
    const row = rows[at]
    if (row === undefined) continue
    const next = rows[at + 1]
    const end = next === undefined ? row.y + row.height : next.y
    if (y >= row.y && y < end) return at
  }
  return null
}

interface ScrollAnchor {
  readonly scrollDate: string | null
  readonly scrollDayOffset: number
  readonly scrollGroupId: string | null
  readonly scrollGroupOffset: number
}

/** @purity pure */
function unitFraction(value: number): number {
  if (!Number.isFinite(value)) return 0
  const dropped = value - Math.floor(value)
  return dropped < 1 ? dropped : 0
}

/** @purity pure */
function dayAnchorAt(
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
function rowAnchorIn(
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
function panTo(context: InputContext, dx: number, dy: number): TranslatedInput {
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
function scrolledAnchor(context: InputContext, dx: number, dy: number): ScrollAnchor {
  const area = context.regions.rowArea
  return {
    ...dayAnchorAt(context, area.x + dx),
    ...rowAnchorAt(context, area.y + dy),
  }
}

// STOP: spec does not decide a one-row floor per detent, nor where a turn past an end lands.
// Looked in MK-1, S-78, S-176, OP-10. @provisional PND-176
// @provisional PND-177
/** @purity pure */
function rowTurnedTo(context: InputContext, dy: number): string | null {
  const settings = context.document.documentSettings
  const rows = scrollingRowsOf(context.layout)
  const areaTop = scrollAreaTopOf(context)
  const standing = rowIndexAtTopEdge(rows, areaTop)
  if (dy === 0 || standing === null) return settings.scrollGroupId
  const landed = rowIndexAtTopEdge(rows, areaTop + dy)
  if (landed === null) return dy < 0 ? (rows[0]?.groupId ?? null) : settings.scrollGroupId
  const at = landed === standing ? standing + (dy > 0 ? 1 : -1) : landed
  const held = Math.min(rows.length - 1, Math.max(0, at))
  return rows[held]?.groupId ?? settings.scrollGroupId
}

/** @purity pure */
function isOnRowArea(context: InputContext, x: number, y: number): boolean {
  return regionAtPointer(context.regions, x, y) === 'rowArea'
}

// STOP: spec does not decide which surfaces the wheel is read on. Looked in MK-1, T-023a, U-32
// @provisional PND-12
/** @purity pure */
function isWheelHere(context: InputContext, x: number, y: number): boolean {
  if (context.isSurfaceStanding) return false
  const region = regionAtPointer(context.regions, x, y)
  return region !== null && region !== 'appHeader'
}


/** @purity pure */
function itemRefOf(schedule: Schedule, item: Item): ItemRef | null {
  switch (item.kind) {
    case 'task':
      return { kind: 'task', uid: item.taskUid }
    case 'dependency': {
      const successor = taskByUid(schedule, item.successorUid)
      if (successor === null) return null
      const ordinal = successor.dependencies.findIndex(
        (one) => one.predecessorUid === item.predecessorUid,
      )
      return ordinal < 0 ? null : { kind: 'dependency', successorUid: item.successorUid, ordinal }
    }
    case 'highlightBox':
      return { kind: 'highlightBox', id: item.id }
    case 'commentBox':
      return { kind: 'commentBox', id: item.id }
    case 'statusLine':
      return { kind: 'statusLine' }
  }
}

/** @purity pure */
function everythingSelectable(context: InputContext): readonly ItemRef[] {
  const geometry = context.geometry
  const schedule = context.document.schedule
  const all: ItemRef[] = []
  for (const task of geometry.tasks) {
    all.push({ kind: 'task', uid: task.taskUid })
  }
  for (const line of geometry.dependencies) {
    const ref = itemRefOf(schedule, {
      kind: 'dependency',
      predecessorUid: line.predecessorUid,
      successorUid: line.successorUid,
    })
    if (ref !== null) all.push(ref)
  }
  for (const box of geometry.commentBoxes) {
    all.push({ kind: 'commentBox', id: box.id })
  }
  for (const box of geometry.highlightBoxes) {
    all.push({ kind: 'highlightBox', id: box.id })
  }
  if (geometry.statusLine !== null) all.push({ kind: 'statusLine' })
  return all
}

/** @purity pure */
function marqueeRect(from: PointerInput, to: PointerInput): ScreenRect {
  return {
    x: Math.min(from.x, to.x),
    y: Math.min(from.y, to.y),
    width: Math.abs(to.x - from.x),
    height: Math.abs(to.y - from.y),
  }
}


// see T-023a
/** @purity pure */
export function pressRowOf(
  press: Pick<PointerPress, 'at' | 'hit'>,
  context: Pick<InputContext, 'screenState' | 'dualCursorFollowing'>,
): PressRow {
  const modifiers = press.at.modifiers
  if (press.at.button === 'middle') return 'PTD-1'
  if (press.at.button === 'left' && isCombo(modifiers, true, false, false)) return 'PTD-1'
  if (context.dualCursorFollowing !== null) return 'PTD-2'
  if (press.hit !== null) return 'PTD-3'
  const armed = context.screenState.armed
  if (armed.kind === 'dependency') return 'PTD-4a'
  if (armed.kind !== 'none') return 'PTD-4'
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
function taskShapeKindOf(name: string): TaskShapeKind | null {
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
function milestoneGlyphOf(name: string): TaskMilestoneGlyph | null {
  return Object.prototype.hasOwnProperty.call(TASK_MILESTONE_GLYPHS, name)
    ? (name as TaskMilestoneGlyph)
    : null
}

// TRAP: one creation per bundle; a second createTask would take mark + 2 while this answers mark + 1.
/** @purity pure */
function nextIssuedUid(schedule: Schedule): number {
  return schedule.project.uidHighWaterMark + 1
}


const ENTRY = {
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
  fontScale: 'IC-99',
  themeMonochrome: 'IC-100',
  stackDirection: 'IC-101',
  // STOP: spec does not decide whether EN-2 paints this entrance while the watermark shows.
  // Looked in EN-2, T-237 @provisional PND-418
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

// TRAP: Armed types shapeKind and glyph as bare strings; a misspelling here compiles and arms nothing.
const ARMED_BY_ENTRY: Readonly<Record<string, Armed>> = {
  'IC-23': { kind: 'taskShape', shapeKind: 'rectangle' },
  'IC-24': { kind: 'taskShape', shapeKind: 'chevron' },
  'IC-25': { kind: 'taskShape', shapeKind: 'arrow' },
  'IC-26': { kind: 'taskShape', shapeKind: 'endpointSpan' },
  'IC-27': { kind: 'milestoneShape', glyph: 'circle' },
  'IC-28': { kind: 'milestoneShape', glyph: 'hexagon' },
  'IC-29': { kind: 'milestoneShape', glyph: 'pentagon' },
  'IC-30': { kind: 'milestoneShape', glyph: 'diamond' },
  'IC-31': { kind: 'milestoneShape', glyph: 'square' },
  'IC-32': { kind: 'milestoneShape', glyph: 'star' },
  'IC-33': { kind: 'milestoneShape', glyph: 'triangleUp' },
  'IC-34': { kind: 'milestoneShape', glyph: 'triangleDown' },
  'IC-83': { kind: 'milestoneShape', glyph: 'file' },
  'IC-84': { kind: 'milestoneShape', glyph: 'box' },
  'IC-85': { kind: 'milestoneShape', glyph: 'floppyDisk' },
  'IC-86': { kind: 'milestoneShape', glyph: 'cylinder' },
  'IC-87': { kind: 'milestoneShape', glyph: 'person' },
  'IC-88': { kind: 'milestoneShape', glyph: 'smile' },
  'IC-89': { kind: 'milestoneShape', glyph: 'beerMug' },
  'IC-35': { kind: 'commentBox' },
  'IC-36': { kind: 'highlightBox' },
  'IC-61': { kind: 'dependency' },
}

/** @purity pure */
function armedByEntry(entry: string): Armed | null {
  return Object.prototype.hasOwnProperty.call(ARMED_BY_ENTRY, entry)
    ? (ARMED_BY_ENTRY[entry] as Armed)
    : null
}

/** @purity pure */
function isSameArm(held: Armed, pressed: Armed): boolean {
  if (held.kind !== pressed.kind) return false
  if (held.kind === 'taskShape' && pressed.kind === 'taskShape') {
    return held.shapeKind === pressed.shapeKind
  }
  if (held.kind === 'milestoneShape' && pressed.kind === 'milestoneShape') {
    return held.glyph === pressed.glyph
  }
  return true
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

/** @purity pure */
function settledText(text: string): string | null {
  const trimmed = text.trim()
  return trimmed === '' ? null : trimmed
}

/** @purity pure */
function settledNumber(text: string): number | null | undefined {
  const held = settledText(text)
  if (held === null) return null
  const value = Number(held)
  return Number.isFinite(value) ? value : undefined
}

/** @purity pure */
function settledDay(text: string): string | null | undefined {
  const held = settledText(text)
  if (held === null) return null
  const day = dayOf(held)
  return day === null ? undefined : textOfDay(day)
}

/** @purity pure */
function settledTruth(text: string): boolean {
  return text.trim() === String(true)
}

type VisualColumn = keyof Schedule['taskVisuals'][number]

type TaskLineWeight = NonNullable<Schedule['taskVisuals'][number]['lineWeight']>
type TaskNameAlign = NonNullable<Schedule['taskVisuals'][number]['nameAlign']>

// see T-016
/** @purity pure */
function isVisualChoice(column: VisualColumn, value: string): boolean {
  return COLUMN_SHAPES.TaskVisual[column]?.choices?.includes(value) ?? false
}

// see CM-13, T-019, T-019a, FR-044
/** @purity pure */
function planActualWithColumn(task: Task, column: keyof Task, text: string): PlacedPlanActual | null {
  const next: Task = { ...task }
  // WHY: written by name; five typed arms would repeat the classification below five times.
  const written = next as unknown as { [key: string]: unknown }
  if (column === 'resumeValid') {
    written[column] = settledTruth(text)
  } else if (column === 'actualDuration') {
    const days = settledNumber(text)
    if (days === undefined) return null
    written[column] = days
  } else {
    const day = settledDay(text)
    if (day === undefined) return null
    written[column] = day
    // TRAP: set resumeValid with resume before the row is read: without true a date on PA-4 is
    // dropped, without false a cleared date ends the suspension; false only where a date stood.
    if (column === 'resume' && day !== null) {
      written['resumeValid'] = true
    }
    if (column === 'resume' && day === null && task.resume !== null) {
      written['resumeValid'] = false
    }
  }

  const state = planActualState(next)
  if (state === 'notStarted') return { row: 'PA-1' }

  const actualStart = next.actualStart
  const actualDuration = next.actualDuration
  if (actualStart === null || actualDuration === null) return null

  switch (state) {
    case 'inProgress':
      return { row: 'PA-2', actualStart, actualDuration }
    case 'suspendedResumePlanned':
      return next.resume === null
        ? null
        : { row: 'PA-3', actualStart, actualDuration, resume: next.resume }
    case 'suspendedResumeUnknown':
      return { row: 'PA-4', actualStart, actualDuration }
    case 'finished':
      return next.actualFinish === null
        ? null
        : { row: 'PA-5', actualStart, actualDuration, actualFinish: next.actualFinish }
  }
}

const PLAN_ACTUAL_COLUMNS: readonly (keyof Task)[] = [
  'actualStart',
  'actualDuration',
  'actualFinish',
  'resume',
  'resumeValid',
]

// see T-016, PR-3, CM-11, FR-006
/** @purity pure */
function commandFromTaskColumn(
  task: Task,
  column: keyof Task,
  text: string,
): readonly DocumentCommand[] {
  const uid = task.uid

  if (PLAN_ACTUAL_COLUMNS.includes(column)) {
    const place = planActualWithColumn(task, column, text)
    return place === null ? [] : [{ kind: 'setTaskPlanActualState', uid, place }]
  }

  switch (column) {
    case 'name':
      return [{ kind: 'setTaskName', uid, name: settledText(text) }]
    case 'notes':
      return [{ kind: 'setTaskNotes', uid, notes: settledText(text) }]
    case 'start':
    case 'finish': {
      const settled = settledDay(text)
      if (settled === undefined || settled === null) return []
      const start = column === 'start' ? settled : task.start
      const finish = column === 'finish' ? settled : task.finish
      if (start === null || finish === null) return []
      return [{ kind: 'setTaskPlanDates', uid, start, finish }]
    }
    case 'deadline': {
      const deadline = settledDay(text)
      return deadline === undefined ? [] : [{ kind: 'setTaskDeadline', uid, deadline }]
    }
    case 'fadeInDays': {
      const days = settledNumber(text)
      return days === undefined ? [] : [{ kind: 'setTaskFadeInDays', uid, days }]
    }
    case 'fadeOutDays': {
      const days = settledNumber(text)
      return days === undefined ? [] : [{ kind: 'setTaskFadeOutDays', uid, days }]
    }
    case 'wbsParentUid': {
      const parentUid = settledNumber(text)
      return parentUid === undefined ? [] : [{ kind: 'setTaskWbsParent', uid, parentUid }]
    }
    default:
      return []
  }
}

// see FR-007, FR-078, FR-002, CM-22, CM-23
/** @purity pure */
function commandFromVisualColumn(
  schedule: Schedule,
  uid: number,
  column: string,
  text: string,
): readonly DocumentCommand[] {
  const visual = schedule.taskVisuals.find((held) => held.taskUid === uid) ?? null

  switch (column) {
    case 'milestoneGlyph': {
      const held = settledText(text)
      const glyph = held === null ? null : milestoneGlyphOf(held)
      if (held !== null && glyph === null) return []
      return [{ kind: 'setTaskVisualMilestoneGlyph', uid, glyph }]
    }
    case 'strokeColor':
    case 'fillColor': {
      const chosen = settledText(text)
      const other =
        column === 'strokeColor' ? (visual?.fillColor ?? null) : (visual?.strokeColor ?? null)
      if (chosen === null && other === null) return [{ kind: 'resetTaskVisualColors', uid }]
      const strokeColor = column === 'strokeColor' ? chosen : other
      const fillColor = column === 'fillColor' ? chosen : other
      return [{ kind: 'setTaskVisualColors', uid, fillColor, strokeColor }]
    }
    case 'lineWeight': {
      const held = settledText(text)
      if (held !== null && !isVisualChoice('lineWeight', held)) return []
      const lineWeight = held as TaskLineWeight | null
      return [{ kind: 'setTaskVisualLineWeight', uid, lineWeight }]
    }
    case 'nameAnchor':
    case 'nameAlign': {
      const anchor = column === 'nameAnchor' ? settledNumber(text) : (visual?.nameAnchor ?? null)
      if (anchor === undefined) return []
      const chosen = column === 'nameAlign' ? settledText(text) : (visual?.nameAlign ?? null)
      if (chosen !== null && !isVisualChoice('nameAlign', chosen)) return []
      const nameAlign = chosen as TaskNameAlign | null
      return [{ kind: 'setTaskVisualNamePlacement', uid, nameAnchor: anchor, nameAlign }]
    }
    default:
      return []
  }
}

// see FR-042, AT-53, CM-29, CM-30, CM-31
/** @purity pure */
function commandFromGroupColumn(
  groupId: string,
  column: string,
  text: string,
): readonly DocumentCommand[] {
  switch (column) {
    case 'label': {
      return [{ kind: 'setTaskGroupLabel', groupId, label: settledText(text) }]
    }
    case 'color': {
      const color = settledText(text)
      return color === null
        ? [{ kind: 'resetTaskGroupColor', groupId }]
        : [{ kind: 'setTaskGroupColor', groupId, color }]
    }
    case 'height': {
      const height = settledNumber(text)
      return height === undefined ? [] : [{ kind: 'setTaskGroupHeight', groupId, height }]
    }
    default:
      return []
  }
}

// see FR-009, CM-38
/** @purity pure */
function commandFromDependencyColumn(
  predecessorUid: number,
  successorUid: number,
  column: string,
  text: string,
): readonly DocumentCommand[] {
  if (column !== 'lag') return []
  const lag = settledNumber(text)
  if (lag === undefined || lag === null) return []
  return [{ kind: 'setDependencyLag', predecessorUid, successorUid, lag }]
}

// see FR-035, CM-1
/** @purity pure */
function commandFromProjectColumn(column: string, text: string): readonly DocumentCommand[] {
  if (column !== 'title') return []
  return [{ kind: 'setProjectTitle', title: text }]
}

const ASSIGNEE_ROW = 'PR-16'

const UNASSIGN_TOKEN = '-'

// see AS-8
/** @purity pure */
function resourceUidOfName(schedule: Schedule, name: string): number | null {
  let found: number | null = null
  for (const resource of schedule.resources) {
    if (resource.name !== name) continue
    if (found === null || resource.uid < found) found = resource.uid
  }
  return found
}

// see AS-9
/** @purity pure */
function resourceUidOfChoice(schedule: Schedule, text: string): number | null {
  const uid = Number(text)
  if (!Number.isInteger(uid)) return null
  // TRAP: ask the roster, not the spelling: a name made of digits must still reach AS-7 / AS-8,
  // and a uid gone since the chooser was drawn is read as a name.
  return schedule.resources.some((one) => one.uid === uid) ? uid : null
}

// see AS-3, CM-45
/** @purity pure */
function commandsFromUnassign(schedule: Schedule, taskUid: number): readonly DocumentCommand[] {
  const held = new Set<number>()
  for (const assignment of schedule.assignments) {
    if (assignment.taskUid !== taskUid || assignment.resourceUid === null) continue
    held.add(assignment.resourceUid)
  }
  // WHY: the spec does not say which of several assignees AS-3 takes off, so none is.
  if (held.size !== 1) return []
  const [resourceUid] = [...held]
  if (resourceUid === undefined) return []
  return [{ kind: 'unassignResource', taskUid, resourceUid }]
}

// see AS-7, AS-8, AS-9, AS-10, T-225
/** @purity pure */
function commandsFromAssignee(
  schedule: Schedule,
  taskUid: number,
  text: string,
): readonly DocumentCommand[] {
  const settled = settledText(text)
  if (settled === null) return []
  if (settled === UNASSIGN_TOKEN) return commandsFromUnassign(schedule, taskUid)

  const held = resourceUidOfChoice(schedule, settled) ?? resourceUidOfName(schedule, settled)
  if (held !== null) {
    const already = schedule.assignments.some(
      (one) => one.taskUid === taskUid && one.resourceUid === held,
    )
    return already ? [] : [{ kind: 'createAssignment', taskUid, resourceUid: held }]
  }

  return [
    { kind: 'createResource', name: settled },
    {
      kind: 'createAssignment',
      taskUid,
      // TRAP: read before the bundle runs; it names the resource CM-40 makes only while nothing
      // ahead of CM-44 in this bundle but CM-40 issues a uid.
      resourceUid: nextIssuedUid(schedule),
    },
    ...commandsFromUnassign(schedule, taskUid),
  ]
}

// see PI-18, T-016
/** @purity pure */
export function commandFromFieldCommit(
  commit: FieldCommit,
  context: InputContext,
): readonly DocumentCommand[] {
  const schedule = context.document.schedule
  // WHY: the column is the key the panel drew, not worked out again here: the selection may
  // have changed between drawing and commit.
  const key = commit.key

  // TRAP: before the holder switch: PR-16's key has holder task and would reach the Task columns.
  if (commit.row === ASSIGNEE_ROW && key.holder === 'task') {
    return taskByUid(schedule, key.uid) === null
      ? []
      : commandsFromAssignee(schedule, key.uid, commit.text)
  }

  switch (key.holder) {
    case 'task': {
      const task = taskByUid(schedule, key.uid)
      return task === null ? [] : commandFromTaskColumn(task, key.column, commit.text)
    }
    case 'taskVisual':
      return taskByUid(schedule, key.uid) === null
        ? []
        : commandFromVisualColumn(schedule, key.uid, key.column, commit.text)
    case 'taskGroup':
      return schedule.taskGroups.some((held) => held.id === key.groupId)
        ? commandFromGroupColumn(key.groupId, key.column, commit.text)
        : []
    case 'commentBox':
      return schedule.commentBoxes.some((held) => held.id === key.id)
        ? [{ kind: 'setCommentBoxText', id: key.id, text: settledText(commit.text) }]
        : []
    case 'dependency': {
      const successor = taskByUid(schedule, key.successorUid)
      const dependency = successor?.dependencies[key.ordinal]
      if (dependency === undefined) return []
      return commandFromDependencyColumn(
        dependency.predecessorUid,
        key.successorUid,
        key.column,
        commit.text,
      )
    }
    case 'project':
      return commandFromProjectColumn(key.column, commit.text)
  }
}

// see T-036, IN-5a, IN-4, MK-10
/** @purity pure */
function commandFromKey(input: KeyInput, context: InputContext): TranslatedInput {
  const key = input.key
  const modifiers = input.modifiers
  const plain = isCombo(modifiers, false, false, false)
  const ctrl = isCombo(modifiers, true, false, false)
  const ctrlShift = isCombo(modifiers, true, true, false)
  const shiftOnly = isCombo(modifiers, false, true, false)
  const altOnly = isCombo(modifiers, false, false, true)

  if (context.isTextEntryUnsettled) {
    if (plain && isSingleCharacterKey(key)) return UNASSIGNED
    if (plain && (key === KEY.del || key === KEY.backspace)) return UNASSIGNED
    if (ctrl && (key === KEY.c || key === KEY.v)) return UNASSIGNED
  }

  if (plain && key === KEY.enter) {
    if (context.isNoticeStanding === true) return acted({ kind: 'dismissNotice' })
    if (context.isTextEntryUnsettled) return acted({ kind: 'settleTextEntry' })
    // WHY: same kind as the settle stage; only the shell knows whether its commit settled anything.
    if (context.isPropertiesPanelShowing === true) return acted({ kind: 'settleTextEntry' })
    // TRAP: with nothing to act on Enter stays unassigned, or tabbed-to controls lose activation.
    return context.selection.items.length > 0 ? CONSUMED_ELSEWHERE : UNASSIGNED
  }

  if (plain && key === KEY.escape) {
    return escapeTarget(context.screenState, escapeContextOf(context)) === null
      ? UNASSIGNED
      : CONSUMED_ELSEWHERE
  }

  if (ctrl && key === KEY.a) return CONSUMED_ELSEWHERE

  if (plain && (key === KEY.del || key === KEY.backspace)) {
    return changed(deleteCommandsFor(context))
  }

  if (ctrl && key === KEY.c) return acted({ kind: 'copySelection' })
  if (ctrl && key === KEY.v) return acted({ kind: 'pasteClipboard' })
  if (ctrl && key === KEY.z) return acted({ kind: 'undoEdit' })
  if (ctrl && key === KEY.y) return acted({ kind: 'redoEdit' })
  if (ctrlShift && key === KEY.z) return acted({ kind: 'redoEdit' })
  if (plain && key === KEY.f2) {
    return acted({ kind: 'editInPlace', target: { kind: 'documentTitle' } })
  }
  if (ctrl && key === KEY.o) return acted({ kind: 'openDocumentFile' })
  if (ctrl && key === KEY.s) return acted({ kind: 'saveDocumentFile' })
  if (ctrl && key === KEY.r) return acted({ kind: 'reopenDocumentFile' })

  if (ctrlShift && key === KEY.e) return CONSUMED_ELSEWHERE
  if (plain && (key === KEY.f1 || key === KEY.p || key === KEY.f11)) return CONSUMED_ELSEWHERE

  if (shiftOnly && (key === KEY.plus || key === KEY.minus)) {
    const factor = keyZoomFactor(context, key === KEY.plus)
    return changed(zoomWrites(context, zoomTimes(context, factor, 'x'), null, null, null))
  }
  if (altOnly && (key === KEY.plus || key === KEY.minus)) {
    const factor = keyZoomFactor(context, key === KEY.plus)
    return changed(zoomWrites(context, null, zoomTimes(context, factor, 'y'), null, null))
  }

  if (ctrl && key === KEY.zero) {
    return changed(zoomWrites(context, 1, 1, null, null))
  }

  if (plain && key === KEY.f) return changedInOrder(fitWrites(context))

  if (ctrlShift && key === KEY.d) {
    return changed([
      context.document.schedule.project.statusDate === null
        ? { kind: 'setStatusDate', date: context.today }
        : { kind: 'clearStatusDate' },
    ])
  }

  return UNASSIGNED
}

// see MK-1, MK-2, MK-3, MK-4, MK-5, MK-10, FR-016
/** @purity pure */
function commandFromWheel(input: WheelInput, context: InputContext): TranslatedInput {
  const modifiers = input.modifiers
  const plain = isCombo(modifiers, false, false, false)
  const ctrl = isCombo(modifiers, true, false, false)
  const shiftOnly = isCombo(modifiers, false, true, false)
  const altOnly = isCombo(modifiers, false, false, true)
  const ctrlShift = isCombo(modifiers, true, true, false)

  const assigned = plain || ctrl || shiftOnly || altOnly || ctrlShift
  if (!assigned) return UNASSIGNED
  if (!isWheelHere(context, input.x, input.y)) return UNASSIGNED
  if (context.pressed !== null) return CONSUMED_ELSEWHERE

  // STOP: spec does not decide which way a wheel turn magnifies. Looked in MK-2, S-53, S-96
  // @provisional PND-13
  const factor = Math.pow(context.zoomStep, -input.notches)

  if (ctrl) {
    return changed(
      zoomWrites(
        context,
        zoomTimes(context, factor, 'x'),
        zoomTimes(context, factor, 'y'),
        input.x,
        input.y,
      ),
    )
  }
  if (shiftOnly) {
    return changed(zoomWrites(context, zoomTimes(context, factor, 'x'), null, input.x, input.y))
  }
  if (altOnly) return changed(zoomWrites(context, null, zoomTimes(context, factor, 'y'), input.x, input.y))

  // TRAP: a wheel turn is reported on the vertical axis whatever keys are held, so x alone
  // reads zero for MK-5; a real sideways report is believed first.
  const sideways = input.scrollPx.x !== 0 ? input.scrollPx.x : input.scrollPx.y
  // TRAP: without this a plain turn with no vertical distance zeroes S-176.
  if (plain && input.scrollPx.y === 0) return UNASSIGNED
  const moved = plain
    ? scrolledAnchor(context, 0, input.scrollPx.y)
    : scrolledAnchor(context, sideways, 0)
  const to = {
    kind: 'setScrollPosition',
    scrollDate: moved.scrollDate,
    scrollDayOffset: moved.scrollDayOffset,
    scrollGroupId: plain ? rowTurnedTo(context, input.scrollPx.y) : moved.scrollGroupId,
    // TRAP: beside a floored row id, moved.scrollGroupOffset names a place nobody scrolled to.
    scrollGroupOffset: plain ? 0 : moved.scrollGroupOffset,
  } as const
  // WHY: the position in force is not written again: an accepted write marks unsaved edits even if nothing moved.
  return isScrollPositionInForce(context, to) ? CONSUMED_ELSEWHERE : changed([to])
}

// see CM-66
/** @purity pure */
function isScrollPositionInForce(
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
  return isAssignedPointerCombo(gestureModifiers(input, context))
    ? assigned
    : browserKept(assigned)
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
      return context.screenState.armed.kind === 'dependency'
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
function followingTravel(
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

// see FR-053, GR-19
/** @purity pure */
function paletteFollow(input: PointerInput, context: InputContext): TranslatedInput {
  const press = context.pressed
  if (press === null || press.on === null) return UNASSIGNED
  if (press.on.entry !== ENTRY.paletteGrabBand) return UNASSIGNED
  if (press.followedTo === undefined) return UNASSIGNED
  return acted({ kind: 'moveCommandPalette', by: followingTravel(input, press) })
}

// see GR-21, T-038
/** @purity pure */
function scrollGearing(context: InputContext, axis: ScrollbarAxis): number {
  const area = context.regions.rowArea
  const lane = axis === 'horizontal' ? area.width : area.height
  const whole = axis === 'horizontal' ? context.layout.contentWidth : context.layout.contentHeight
  if (!(lane > 0) || !(whole > lane)) return 0
  return whole / lane
}

/** @purity pure */
function scrollbarTravel(
  context: InputContext,
  axis: ScrollbarAxis,
  by: { readonly dx: number; readonly dy: number },
): { readonly dx: number; readonly dy: number } {
  const gearing = scrollGearing(context, axis)
  return axis === 'horizontal'
    ? { dx: by.dx * gearing, dy: 0 }
    : { dx: 0, dy: by.dy * gearing }
}

// see FR-051, GR-21
/** @purity pure */
function scrollbarFollow(input: PointerInput, context: InputContext): TranslatedInput {
  const press = context.pressed
  const axis = press?.on?.scrollbarAxis
  if (press === null || axis === undefined) return UNASSIGNED
  if (press.followedTo === undefined) return UNASSIGNED
  const by = scrollbarTravel(context, axis, followingTravel(input, press))
  // WHY: not negated as the pan is: a hand on the grip drags the marker, not the paper.
  return panTo(context, by.dx, by.dy)
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
    case ENTRY.zoomRowIn:
    case ENTRY.zoomRowOut: {
      const factor = keyZoomFactor(context, entry === ENTRY.zoomRowIn)
      return changed(zoomWrites(context, null, zoomTimes(context, factor, 'y'), null, null))
    }
    case ENTRY.baselineVisible:
    case ENTRY.progressLineVisible:
    case ENTRY.progressMarkerVisible:
    case ENTRY.dateGridLinesVisible:
    case ENTRY.groupGridLinesVisible:
    case ENTRY.assigneeVisible:
    case ENTRY.percentCompleteVisible:
    case ENTRY.dependencyVisible:
      return commandFromVisibleElementEntry(entry, context)
    case ENTRY.planDisplay:
    case ENTRY.actualDisplay:
      return commandFromVisibleElementEntry(entry, context)
    case ENTRY.themePreference: {
      const isDarkNow = context.document.documentSettings.themePreference === 'dark'
      return changed([{ kind: 'setThemePreference', preference: isDarkNow ? 'light' : 'dark' }])
    }
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
      // TRAP: judged here, not by the write: opening nothing is silent, and FR-029 wants the reason told.
      if (
        !(
          context.isLevelZeroFolded === true ||
          (wouldMoveARow(context, null, 'open') ??
            context.document.schedule.taskGroups.some(
              (row) => row.isCollapsed === true || row.isHidden === true,
            ))
        )
      ) {
        return nothingToDo('noFoldedRowAtAll')
      }
      return acted({
        kind: 'setLevelZeroFolded',
        isFolded: false,
        writes: [{ kind: 'expandAllTaskGroups' }, ...unhidesEveryRow(context.document.schedule)],
      })
    case ENTRY.alignStart:
    case ENTRY.alignFinish:
      // TRAP: count chosen Tasks among drawn rows (a fold hides one without changing Selection),
      // and read Selection, not the drawn palette, which can be a skipped paint old.
      if (context.selection.ordered && chosenDrawnTaskCount(context) >= 2) {
        return changed(alignWrites(context, entry === ENTRY.alignStart))
      }
      return nothingToDo('noTaskChosenToAlignWith')
    case ENTRY.rowExpanderCloseAll:
      if (
        context.isLevelZeroFolded === true ||
        isARowOfTheShallowestLevelDrawn(context) === false
      ) {
        return nothingToDo('noUnfoldedRowAtAll')
      }
      return acted({
        kind: 'setLevelZeroFolded',
        isFolded: true,
        writes: foldsEveryRow(context.document.schedule),
      })
    case ENTRY.rowExpanderOpenLevelZero: {
      const unhidden = opensLevelZeroHiddenRows(context.document.schedule)
      if (context.isLevelZeroFolded !== true && unhidden.length === 0) {
        return nothingToDo(null)
      }
      return acted({ kind: 'setLevelZeroFolded', isFolded: false, writes: unhidden })
    }
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

// see IC-45, DC-1, DC-4, DC-7
/** @purity pure */
function commandFromDualCursorEntry(
  press: PointerPress,
  context: InputContext,
): TranslatedInput {
  // TRAP: the Esc path in frame-loop.ts writes the same clearing; change both together.
  if (context.dualCursorFollowing !== null) {
    return acted({
      kind: 'setDualCursorFollowing',
      following: null,
      placed: { kind: 'clearDualCursor' },
    })
  }
  const standing = context.document.documentSettings.dualCursor
  if (standing !== null) {
    return acted({ kind: 'setDualCursorFollowing', following: 'date1', placed: null })
  }
  const rowArea = context.regions.rowArea
  const onPointer = dayAtX(context.layout, press.at.x)
  const atCentre = dayAtX(context.layout, rowArea.x + rowArea.width / 2)
  // STOP: spec does not decide IC-45 where the axis has no day. Looked in DC-1, IV-13, BO-1
  // @provisional PND-313
  if (onPointer === null || atCentre === null) return CONSUMED_ELSEWHERE
  return acted({
    kind: 'setDualCursorFollowing',
    following: 'date1',
    placed: {
      kind: 'setDualCursor',
      date1: textOfDay(onPointer),
      date2: textOfDay(atCentre),
    },
  })
}

// see PTD-2, DC-2
/** @purity pure */
function commandFromDualCursorPress(
  press: PointerPress,
  context: InputContext,
): TranslatedInput {
  const following = context.dualCursorFollowing
  const standing = context.document.documentSettings.dualCursor
  const day = dayAtX(context.layout, press.at.x)
  // STOP: spec does not decide a DC-2 click where the axis has no day. Looked in DC-2, PTD-2
  // @provisional PND-314
  if (following === null || standing === null || day === null) return CONSUMED_ELSEWHERE
  const fixed = textOfDay(day)
  const placed: SetDualCursor = {
    kind: 'setDualCursor',
    date1: following === 'date1' ? fixed : standing.date1,
    date2: following === 'date2' ? fixed : standing.date2,
  }
  return acted({
    kind: 'setDualCursorFollowing',
    following: following === 'date1' ? 'date2' : 'date1',
    placed,
  })
}

// see FR-052, CM-67
/** @purity pure */
function commandFromPanelDivider(
  panel: NonNullable<ScreenPart['dividerPanel']>,
  release: PointerInput,
  press: PointerPress,
  context: InputContext,
): TranslatedInput {
  const settings = context.document.documentSettings
  const travelled = release.x - press.at.x
  // WHY: not clamped here; the write side clamps, and a second clamp gives one drag two answers.
  return changed([
    {
      kind: 'setPanelWidths',
      rowTitlePanelWidth:
        panel === 'rowTitlePanel'
          ? settings.rowTitlePanelWidth + travelled
          : settings.rowTitlePanelWidth,
      propertyPanelWidth:
        panel === 'propertiesPanel'
          ? settings.propertyPanelWidth - travelled
          : settings.propertyPanelWidth,
    },
  ])
}

// see FR-051, GR-21
/** @purity pure */
function commandFromScrollbar(
  axis: ScrollbarAxis,
  release: PointerInput,
  press: PointerPress,
  context: InputContext,
): TranslatedInput {
  // WHY: GR-21 leaves a press on the lane outside the grip open; it is taken as a grip drag.
  const by = scrollbarTravel(context, axis, followingTravel(release, press))
  return panTo(context, by.dx, by.dy)
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

// see IC-58, IC-59, IC-60, IC-77, IC-82, IC-90, IC-91
/** @purity pure */
function commandFromRowEntry(
  entry: string,
  rowGroupId: string | null,
  context: InputContext,
): TranslatedInput {
  if (rowGroupId === null) return CONSUMED_ELSEWHERE

  if (entry === ENTRY.rowPin) {
    // TRAP: read the document, not the drawn row: against a stale picture the pin never comes off.
    const isPinned = context.document.documentSettings.pinnedGroupIds.includes(rowGroupId)
    return changed([
      isPinned
        ? { kind: 'unpinTaskGroup', groupId: rowGroupId }
        : { kind: 'pinTaskGroup', groupId: rowGroupId },
    ])
  }

  if (entry === ENTRY.rowDelete) {
    return changed([{ kind: 'deleteTaskGroup', groupId: rowGroupId }])
  }

  if (entry === ENTRY.rowExpanderCloseBelow) {
    if (wouldMoveARow(context, rowGroupId, 'fold') === false) {
      return nothingToDo('noUnfoldedRowBelow')
    }
    return foldsOrNothing(
      foldsRowAndBelow(context.document.schedule, rowGroupId),
      'noUnfoldedRowBelow',
    )
  }

  if (entry === ENTRY.rowExpanderOpenOneLevel) {
    if (wouldMoveARow(context, rowGroupId, 'openOneLevel') === false) {
      return nothingToDo('rowIsOpenWithNoHiddenChild')
    }
    return foldsOrNothing(
      opensRowAndUnhidesItsChildren(context.document.schedule, rowGroupId),
      'rowIsOpenWithNoHiddenChild',
    )
  }

  if (entry === ENTRY.rowAddChild) {
    const parentDepth = rowDepthOfGroup(context, rowGroupId)
    if (parentDepth >= context.document.documentSettings.maxGroupDepth) {
      return nothingToDo('rowIsAtTheDeepestLevel')
    }
    return rowStoodUp(context, rowGroupId, parentDepth + 1)
  }

  if (entry === ENTRY.rowExpanderOpen) {
    if (wouldMoveARow(context, rowGroupId, 'open') === false) {
      return nothingToDo('noFoldedRowBelow')
    }
    return foldsOrNothing(
      opensRowAndBelow(context.document.schedule, rowGroupId),
      'noFoldedRowBelow',
    )
  }

  const row = context.document.schedule.taskGroups.find((one) => one.id === rowGroupId)
  if (row === undefined || row.isHidden === true) return nothingToDo(null)
  return changed([
    { kind: 'setTaskGroupHidden', groupId: rowGroupId, hidden: true },
    ...foldsRowAndBelow(context.document.schedule, rowGroupId),
  ])
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

// see HR-3, HF-2
/** @purity pure */
function opensRowAndBelow(schedule: Schedule, rowId: string): readonly DocumentCommand[] {
  const parentOf = new Map(schedule.taskGroups.map((one) => [one.id, one.parentId] as const))
  const commands: DocumentCommand[] = []
  for (const row of schedule.taskGroups) {
    if (row.id !== rowId && !isRowUnder(parentOf, row.parentId, rowId)) continue
    // TRAP: write only what changes: foldsOrNothing tells the reason only when this list is empty.
    if (row.isHidden === true) {
      commands.push({ kind: 'setTaskGroupHidden', groupId: row.id, hidden: false })
    }
    if (row.isCollapsed !== true) continue
    commands.push({ kind: 'setTaskGroupCollapsed', groupId: row.id, collapsed: false })
  }
  return commands
}

// see HR-7, HF-13
/** @purity pure */
function opensRowAndUnhidesItsChildren(
  schedule: Schedule,
  rowId: string,
): readonly DocumentCommand[] {
  const commands: DocumentCommand[] = []
  const row = schedule.taskGroups.find((one) => one.id === rowId)
  if (row !== undefined && row.isCollapsed === true) {
    commands.push({ kind: 'setTaskGroupCollapsed', groupId: rowId, collapsed: false })
  }
  for (const child of schedule.taskGroups) {
    if (child.parentId !== rowId) continue
    if (child.isHidden !== true) continue
    commands.push({ kind: 'setTaskGroupHidden', groupId: child.id, hidden: false })
  }
  return commands
}

// see HF-16, HR-6
/** @purity pure */
function opensLevelZeroHiddenRows(schedule: Schedule): readonly DocumentCommand[] {
  return schedule.taskGroups
    .filter((row) => row.parentId === null && row.isHidden === true)
    .map((row) => ({ kind: 'setTaskGroupHidden', groupId: row.id, hidden: false }) as const)
}

// see HF-14
/** @purity pure */
function orderPastLastChild(schedule: Schedule, parentGroupId: string | null): number {
  // TRAP: one past the largest order, not the child count: orders may have gaps (AT-55).
  let lastOrder: number | null = null
  for (const row of schedule.taskGroups) {
    if (row.parentId !== parentGroupId) continue
    if (lastOrder === null || row.order > lastOrder) lastOrder = row.order
  }
  return lastOrder === null ? 0 : lastOrder + 1
}

/** @purity pure */
function rowGrabSiblings(
  rows: readonly TaskGroup[],
  parentId: string | null,
  heldGroupId: string,
): readonly TaskGroup[] {
  return rows
    .filter((one) => one.id !== heldGroupId && one.parentId === parentId)
    .sort((a, b) => a.order - b.order)
}

/** @purity pure */
function rowGrabDepthOf(byId: ReadonlyMap<string, TaskGroup>, row: TaskGroup): number {
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
function rowGrabSubtreeHeight(rows: readonly TaskGroup[], rootId: string): number {
  let height = 0
  let level: readonly string[] = [rootId]
  const seen = new Set<string>()
  while (level.length > 0) {
    height += 1
    for (const id of level) seen.add(id)
    const above = level
    level = rows
      .filter((one) => !seen.has(one.id) && one.parentId !== null && above.includes(one.parentId))
      .map((one) => one.id)
  }
  return height
}

interface RowGrabLanding {
  readonly parentId: string | null
  readonly order: number
  readonly depth: number
}

interface RowGrabStep {
  readonly landing: RowGrabLanding
  readonly situation: SpentEntranceSituation | null
}

// see HF-15, FR-085
/** @purity pure */
function rowGrabLandingOf(
  context: InputContext,
  heldGroupId: string,
  steps: number,
): RowGrabStep | null {
  const rows = context.document.schedule.taskGroups
  const byId = new Map(rows.map((one) => [one.id, one]))
  const held = byId.get(heldGroupId)
  if (held === undefined) return null

  const cap = context.document.documentSettings.maxGroupDepth
  const height = rowGrabSubtreeHeight(rows, heldGroupId)
  const startSiblings = rows
    .filter((one) => one.parentId === held.parentId)
    .sort((a, b) => a.order - b.order)
  // TRAP: CM-73 reads a rank among siblings, not the `order` column; orders 0, 2, 7 must answer 0, 1, 2.
  const startOrder = Math.max(
    0,
    startSiblings.findIndex((one) => one.id === heldGroupId),
  )
  let landing: RowGrabLanding = {
    parentId: held.parentId,
    order: startOrder,
    depth: rowGrabDepthOf(byId, held),
  }

  const taken = Math.abs(steps)
  const deeper = steps > 0
  for (let step = 0; step < taken; step++) {
    if (deeper) {
      const siblings = rowGrabSiblings(rows, landing.parentId, heldGroupId)
      const above = siblings[landing.order - 1]
      if (above === undefined) return { landing, situation: 'noSiblingAboveToNestUnder' }
      if (rowGrabDepthOf(byId, above) + height > cap) {
        return { landing, situation: 'groupDepthLimitReached' }
      }
      landing = {
        parentId: above.id,
        // TRAP: a count, not `orderPastLastChild` (largest plus one); CM-73 reads a rank.
        order: rowGrabSiblings(rows, above.id, heldGroupId).length,
        depth: landing.depth + 1,
      }
      continue
    }
    if (landing.parentId === null) return { landing, situation: 'rowIsAtTheShallowestLevel' }
    const parent = byId.get(landing.parentId)
    if (parent === undefined) return { landing, situation: null }
    const uncles = rowGrabSiblings(rows, parent.parentId, heldGroupId)
    landing = {
      parentId: parent.parentId,
      order: uncles.findIndex((one) => one.id === parent.id) + 1,
      depth: Math.max(1, landing.depth - 1),
    }
  }
  return { landing, situation: null }
}

interface RowGrabPlace {
  readonly parentId: string | null
  readonly order: number
  readonly atY: number
  readonly isOwn: boolean
}

// see HF-15
/** @purity pure */
function rowGrabPlacesInDrawingOrder(
  context: InputContext,
  heldGroupId: string,
): readonly RowGrabPlace[] {
  const drawn = context.drawnRowBoxes
  if (drawn === undefined) return []
  const rows = context.document.schedule.taskGroups
  const byId = new Map(rows.map((one) => [one.id, one]))
  const held = byId.get(heldGroupId)
  if (held === undefined) return []
  const depth = rowGrabDepthOf(byId, held)
  const parentsWithADrawnChild = new Set<string>()
  for (const entry of drawn) {
    const parentId = byId.get(entry.groupId)?.parentId
    if (parentId !== undefined && parentId !== null) parentsWithADrawnChild.add(parentId)
  }

  const placeOrderOf = (row: TaskGroup): number => {
    const among = rows
      .filter((one) => one.parentId === row.parentId)
      .sort((a, b) => a.order - b.order)
    const at = among.findIndex((one) => one.id === row.id)
    if (at < 0) return 0
    return among.slice(0, at).filter((one) => one.id !== heldGroupId).length
  }

  const places: RowGrabPlace[] = []
  // WHY: two consecutive places with the same landing are merged, or a drag between them never moves.
  const put = (place: RowGrabPlace): void => {
    const last = places[places.length - 1]
    if (last !== undefined && last.parentId === place.parentId && last.order === place.order) return
    places.push(place)
  }

  let runParentId: string | null | undefined = undefined
  let runOrderAfter = 0
  let runBottom = 0
  const closeRun = (): void => {
    if (runParentId === undefined) return
    put({ parentId: runParentId, order: runOrderAfter, atY: runBottom, isOwn: false })
    runParentId = undefined
  }

  for (const entry of drawn) {
    const row = byId.get(entry.groupId)
    if (row === undefined) continue
    const rowDepth = rowGrabDepthOf(byId, row)
    if (rowDepth > depth) continue
    if (rowDepth === depth) {
      if (runParentId !== undefined && runParentId !== row.parentId) closeRun()
      const order = placeOrderOf(row)
      const isOwn = row.id === heldGroupId
      put({ parentId: row.parentId, order, atY: entry.box.y, isOwn })
      runParentId = row.parentId
      // TRAP: not one past the held row; with it taken out, before and after it are one place,
      // and counting past it would hide the end RS-39 is told against.
      runOrderAfter = isOwn ? order : order + 1
      runBottom = entry.box.y + entry.box.height
      continue
    }
    closeRun()
    // TRAP: the one place `isCollapsed` must be read; a folded group has no drawn child to hide it.
    if (
      depth > 1 &&
      rowDepth === depth - 1 &&
      row.isCollapsed !== true &&
      !parentsWithADrawnChild.has(row.id)
    ) {
      put({ parentId: row.id, order: 0, atY: entry.box.y + entry.box.height, isOwn: false })
    }
  }
  closeRun()
  return places
}

// see HF-15, RS-39
/** @purity pure */
function rowGrabPositionOf(
  context: InputContext,
  heldGroupId: string,
  travelY: number,
): { readonly place: RowGrabPlace; readonly situation: SpentEntranceSituation | null } | null {
  const drawn = context.drawnRowBoxes
  if (drawn === undefined) return null
  const heldBox = drawn.find((one) => one.groupId === heldGroupId)?.box
  if (heldBox === undefined) return null
  const places = rowGrabPlacesInDrawingOrder(context, heldGroupId)
  const ownAt = places.findIndex((one) => one.isOwn)
  if (ownAt < 0) return null
  const own = places[ownAt]
  if (own === undefined) return null
  if (travelY < 0 && ownAt === 0) return { place: own, situation: 'noPlaceLeftInThatDirection' }
  if (travelY > 0 && ownAt === places.length - 1) {
    return { place: own, situation: 'noPlaceLeftInThatDirection' }
  }
  // WHY: the row's carried top edge, not the pointer's y, or the row jumps the instant it is touched.
  const carriedTo = heldBox.y + travelY
  let best = own
  for (const place of places) {
    const reach = Math.abs(place.atY - carriedTo)
    const standing = Math.abs(best.atY - carriedTo)
    if (reach < standing || (reach === standing && place.isOwn)) best = place
  }
  return { place: best, situation: null }
}

// see HF-15, S-37
/** @purity pure */
function rowGrabDepthSteps(context: InputContext, at: PointerInput, press: PointerPress): number {
  const indent = context.document.documentSettings.rowTitleIndent
  if (!(indent > 0)) return 0
  // WHY: truncated, not rounded; rounding moves the row half a step before the hand.
  return Math.trunc((at.x - press.at.x) / indent)
}

// see HF-15, S-208
/** @purity pure */
function rowGrabAxisAt(at: PointerInput, press: PointerPress): RowGrabAxis | null {
  const settled = press.rowGrabAxis
  if (settled !== null && settled !== undefined) return settled
  const across = Math.abs(at.x - press.at.x)
  const down = Math.abs(at.y - press.at.y)
  const threshold = NOT_STORED_ROW_GRAB_SIZES['S-208']
  if (across <= threshold && down <= threshold) return null
  // WHY: exactly diagonal travel passed neither threshold first, so it settles nothing yet.
  if (across === down) return null
  return across > down ? 'depth' : 'position'
}

// see GR-20
/** @purity pure */
function grabbedRowGroupId(press: PointerPress): string | null {
  const on = press.on
  // TRAP: a pinned row is refused only because the surface draws no strip on it.
  if (on === null || on.isRowGrabStrip !== true) return null
  return on.rowGroupId
}

// see HF-15
/** @purity pure */
function rowGrabFollow(input: PointerInput, context: InputContext): TranslatedInput {
  const press = context.pressed
  if (press === null) return UNASSIGNED
  const groupId = grabbedRowGroupId(press)
  if (groupId === null) return UNASSIGNED
  // WHY: a caller that does not record the axis cannot hold it (as `paletteFollow` refuses).
  if (press.rowGrabAxis === undefined) return UNASSIGNED
  const axis = rowGrabAxisAt(input, press)
  if (axis === null) return UNASSIGNED
  if (axis === 'position') {
    const found = rowGrabPositionOf(context, groupId, input.y - press.at.y)
    if (found === null) return UNASSIGNED
    return acted({
      kind: 'followRowGrab',
      groupId,
      axis,
      atDepth: rowDepthOfGroup(context, groupId),
      atY: found.place.atY,
      resistedPx: rowGrabResistedPx(
        input.x - press.at.x,
        context.document.documentSettings.rowTitleIndent,
      ),
    })
  }
  const step = rowGrabLandingOf(context, groupId, rowGrabDepthSteps(context, input, press))
  if (step === null) return UNASSIGNED
  return acted({
    kind: 'followRowGrab',
    groupId,
    axis,
    atDepth: step.landing.depth,
    atY: null,
    resistedPx: rowGrabResistedPx(input.y - press.at.y, rowGrabRowHeightOf(context, groupId)),
  })
}

// see HF-15, S-212
/** @purity pure */
function rowGrabResistedPx(travelPx: number, stepPx: number): number {
  const furthest = Math.abs(stepPx) * NOT_STORED_ROW_GRAB_SIZES['S-212']
  return Math.max(-furthest, Math.min(furthest, travelPx))
}

/** @purity pure */
function rowGrabRowHeightOf(context: InputContext, heldGroupId: string): number {
  const placed = (context.drawnRowBoxes ?? []).find((one) => one.groupId === heldGroupId)
  return placed === undefined ? 0 : placed.box.height
}

/** @purity pure */
function rowDepthOfGroup(context: InputContext, groupId: string): number {
  const rows = context.document.schedule.taskGroups
  const byId = new Map(rows.map((one) => [one.id, one]))
  const found = byId.get(groupId)
  return found === undefined ? 1 : rowGrabDepthOf(byId, found)
}

// see HF-14
/** @purity pure */
function parentFoldTakenOff(
  schedule: Schedule,
  parentGroupId: string | null,
): readonly DocumentCommand[] {
  if (parentGroupId === null) return []
  const parent = schedule.taskGroups.find((one) => one.id === parentGroupId)
  if (parent?.isCollapsed !== true) return []
  return [{ kind: 'setTaskGroupCollapsed', groupId: parentGroupId, collapsed: false }]
}

// see HF-14, HF-17
/** @purity pure */
function rowStoodUp(
  context: InputContext,
  parentGroupId: string | null,
  depth: number,
): TranslatedInput {
  const settings = context.document.documentSettings
  const opensTier = depth > groupDepthLimit(settings)
  const newGroupId = context.newGroupId
  // TRAP: keep the parent's fold in the row's bundle; a bundle of its own is a second undo step.
  return changedAndCreated(
    [
      opensTier
        ? [
            {
              kind: 'setZoom',
              zoomX: settings.zoomX,
              // TRAP: only `groupDepthThresholdOf`; any other route can differ by one ulp from `groupDepthLimit`.
              zoomY: groupDepthThresholdOf(depth, settings),
            } as const,
          ]
        : [],
      [
        ...parentFoldTakenOff(context.document.schedule, parentGroupId),
        {
          kind: 'createTaskGroup',
          id: newGroupId,
          parentId: parentGroupId,
          label: DEFAULT_ROW_NAME,
          derivedFromTaskUid: null,
          order: orderPastLastChild(context.document.schedule, parentGroupId),
        } as const,
      ],
    ],
    { kind: 'row', groupId: newGroupId },
  )
}

// see HF-15
/** @purity pure */
function commandFromRowGrab(
  release: PointerInput,
  press: PointerPress,
  context: InputContext,
  heldGroupId: string,
): TranslatedInput {
  const axis = rowGrabAxisAt(release, press)
  if (axis === null) {
    return acted({
      kind: 'chooseRow',
      groupId: heldGroupId,
      isExtending: press.at.modifiers.shift,
    })
  }
  const held = context.document.schedule.taskGroups.find((one) => one.id === heldGroupId)
  if (axis === 'position') {
    const found = rowGrabPositionOf(context, heldGroupId, release.y - press.at.y)
    if (found === null) return CONSUMED_ELSEWHERE
    if (found.situation !== null) return nothingToDo(found.situation)
    // WHY: not written: an accepted write marks unsaved edits even if nothing moved.
    if (found.place.isOwn) return CONSUMED_ELSEWHERE
    return changed([
      {
        kind: 'moveTaskGroup',
        groupId: heldGroupId,
        parentId: found.place.parentId,
        order: found.place.order,
      },
    ])
  }
  const steps = rowGrabDepthSteps(context, release, press)
  if (steps === 0) return CONSUMED_ELSEWHERE
  const step = rowGrabLandingOf(context, heldGroupId, steps)
  if (step === null) return CONSUMED_ELSEWHERE
  const landing = step.landing
  // WHY: judged by the parent, not the step count; every depth step changes the parent.
  if (held !== undefined && held.parentId === landing.parentId) {
    return step.situation === null ? CONSUMED_ELSEWHERE : nothingToDo(step.situation)
  }
  return changed([
    {
      kind: 'moveTaskGroup',
      groupId: heldGroupId,
      parentId: landing.parentId,
      order: landing.order,
    },
  ])
}

// see HR-4, HR-1a
/** @purity pure */
function foldsRowAndBelow(schedule: Schedule, rowId: string): readonly DocumentCommand[] {
  const parentOf = new Map(schedule.taskGroups.map((one) => [one.id, one.parentId] as const))
  const commands: DocumentCommand[] = []
  for (const row of schedule.taskGroups) {
    if (row.isCollapsed === true) continue
    // WHY: rows under an already-folded row are written too, or they spring open when that fold comes off.
    if (row.id !== rowId && !isRowUnder(parentOf, row.parentId, rowId)) continue
    commands.push({ kind: 'setTaskGroupCollapsed', groupId: row.id, collapsed: true })
  }
  return commands
}

// see HR-3, HR-4, HR-7, RS-30
/** @purity pure */
function wouldMoveARow(
  context: InputContext,
  ancestorId: string | null,
  operation: 'open' | 'fold' | 'openOneLevel',
): boolean | null {
  const drawnIds = context.drawnRowGroupIds
  if (drawnIds === undefined) return null
  const drawn = new Set(drawnIds)
  const schedule = context.document.schedule
  const parentOf = new Map(schedule.taskGroups.map((one) => [one.id, one.parentId] as const))

  const withDrawnChild = new Set<string>()
  const withUnhiddenChild = new Set<string>()
  // TRAP: must stay the set `row-title-panel.ts` builds as `groupIdsWithAChildOutOfThePicture`.
  const withAChildOutOfThePicture = new Set<string>()
  for (const row of schedule.taskGroups) {
    if (row.parentId === null) continue
    if (drawn.has(row.id)) withDrawnChild.add(row.parentId)
    else withAChildOutOfThePicture.add(row.parentId)
    if (row.isHidden !== true) withUnhiddenChild.add(row.parentId)
  }
  const pressedRow =
    ancestorId === null
      ? undefined
      : schedule.taskGroups.find((one) => one.id === ancestorId)

  if (ancestorId !== null && (pressedRow === undefined || !drawn.has(ancestorId))) return false

  if (operation === 'fold') return ancestorId !== null && withDrawnChild.has(ancestorId)

  if (operation === 'openOneLevel') {
    if (ancestorId === null) return false
    return withAChildOutOfThePicture.has(ancestorId)
  }

  if (
    ancestorId !== null &&
    pressedRow?.isCollapsed === true &&
    withUnhiddenChild.has(ancestorId)
  ) {
    return true
  }
  for (const row of schedule.taskGroups) {
    if (ancestorId !== null && !isRowUnder(parentOf, row.parentId, ancestorId)) continue
    // TRAP: the hidden test must precede the `drawn` test; HR-6 keeps hidden rows out of `drawn`,
    // so swapping them makes the all-below open do less than the one-level open.
    if (row.isHidden === true) return true
    if (!drawn.has(row.id)) continue
    if (row.isCollapsed === true && withUnhiddenChild.has(row.id)) return true
  }
  return false
}

/** @purity pure */
function isARowOfTheShallowestLevelDrawn(context: InputContext): boolean {
  const rootRows = context.document.schedule.taskGroups.filter((row) => row.parentId === null)
  const drawnIds = context.drawnRowGroupIds
  if (drawnIds === undefined) return rootRows.some((row) => row.isHidden !== true)
  const drawn = new Set(drawnIds)
  return rootRows.some((row) => drawn.has(row.id))
}

// see HR-1
/** @purity pure */
function unhidesEveryRow(schedule: Schedule): readonly DocumentCommand[] {
  return schedule.taskGroups
    .filter((row) => row.isHidden === true)
    .map((row) => ({ kind: 'setTaskGroupHidden', groupId: row.id, hidden: false }) as const)
}

// see HR-2
/** @purity pure */
function foldsEveryRow(schedule: Schedule): readonly DocumentCommand[] {
  return schedule.taskGroups
    .filter((row) => row.isCollapsed !== true)
    .map((row) => ({ kind: 'setTaskGroupCollapsed', groupId: row.id, collapsed: true }) as const)
}

/** @purity pure */
function isRowUnder(
  parentOf: ReadonlyMap<string, string | null>,
  parentId: string | null,
  ancestorId: string,
): boolean {
  const climbed = new Set<string>()
  let at = parentId
  while (at !== null && !climbed.has(at)) {
    if (at === ancestorId) return true
    climbed.add(at)
    at = parentOf.get(at) ?? null
  }
  return false
}

// see FR-083
/** @purity pure */
function commandFromArmingEntry(entry: string, context: InputContext): TranslatedInput {
  const armed = armedByEntry(entry)
  if (armed === null) return CONSUMED_ELSEWHERE
  if (context.selection.items.length === 0) return CONSUMED_ELSEWHERE

  // WHY: a mixed selection is not filtered; CM-20 refuses the crossing and AG-3 keeps the bundle
  // atomic, while filtering here would decide a question no row decides.
  const commands: DocumentCommand[] = []
  for (const one of context.selection.items) {
    if (one.kind !== 'task') continue
    if (armed.kind === 'taskShape') {
      const shapeKind = taskShapeKindOf(armed.shapeKind)
      if (shapeKind !== null) commands.push({ kind: 'setTaskVisualShapeKind', uid: one.uid, shapeKind })
      continue
    }
    if (armed.kind === 'milestoneShape') {
      const glyph = milestoneGlyphOf(armed.glyph)
      if (glyph === null) continue
      commands.push({ kind: 'setTaskVisualShapeKind', uid: one.uid, shapeKind: 'milestone' })
      commands.push({ kind: 'setTaskVisualMilestoneGlyph', uid: one.uid, glyph })
      continue
    }
  }
  return changed(commands)
}

// see UC-004, FR-009
/** @purity pure */
function commandFromDependencyDrag(
  release: PointerInput,
  press: PointerPress,
  context: InputContext,
): TranslatedInput {
  const hit = press.hit
  if (hit === null || hit.item.kind !== 'task') return CONSUMED_ELSEWHERE
  const from = dependencyEndAtPointer(context.geometry, press.at.x, press.at.y, hit.item.taskUid)
  if (from === null) return CONSUMED_ELSEWHERE
  const into = dependencyEndAtPointer(context.geometry, release.x, release.y, null)
  if (into === null) return CONSUMED_ELSEWHERE
  // WHY: no `linkType` here; `edit-dependency.ts` maps the edges through T-018, a second entrance FR-009 refuses.
  return changed([
    {
      kind: 'createDependency',
      predecessorUid: from.taskUid,
      successorUid: into.taskUid,
      predecessorEdge: from.edge,
      successorEdge: into.edge,
    },
  ])
}

// see T-023d, MK-13
/** @purity pure */
function commandFromGrab(
  release: PointerInput,
  press: PointerPress,
  context: InputContext,
): TranslatedInput {
  const hit = press.hit
  if (hit === null) return CONSUMED_ELSEWHERE
  const item = hit.item

  // TRAP: MK-13 must be read before the switch; GR-5 / GR-6 stand above GR-12 in T-023d,
  // so the switch would rewrite the same day instead of opening the name.
  if (release.clickCount >= 2 && item.kind === 'task') {
    const isNameEntrance =
      hit.grab === 'GR-10' ||
      hit.grab === 'GR-12' ||
      hit.grab === 'GR-15' ||
      hit.grab === 'GR-5' ||
      hit.grab === 'GR-6' ||
      hit.grab === 'GR-9' ||
      hit.grab === 'GR-17' ||
      hit.grab === 'GR-18'
    if (isNameEntrance) {
      return acted({ kind: 'editInPlace', target: { kind: 'taskName', uid: item.taskUid } })
    }
    if (hit.grab === 'GR-11') {
      return acted({ kind: 'editInPlace', target: { kind: 'assignee', uid: item.taskUid } })
    }
  }

  if (item.kind === 'statusLine' && hit.grab === 'GR-16') {
    const day = dayAtX(context.layout, release.x)
    return day === null ? CONSUMED_ELSEWHERE : changed([{ kind: 'setStatusDate', date: textOfDay(day) }])
  }

  // TRAP: must stay above GR-14's move below, or a double click and a drag on one place are one press.
  if (release.clickCount >= 2 && item.kind === 'commentBox' && hit.grab === 'GR-14') {
    return acted({ kind: 'editInPlace', target: { kind: 'commentBoxText', id: item.id } })
  }

  // TRAP: the first release of a double click has `clickCount` 1; without this arm it falls to the
  // switch and reaches a second destination (for GR-17, a 0px actual).
  if (MK_13_GRAB_ROWS.has(hit.grab) && !hasDraggedPastThreshold(press, release)) {
    return CONSUMED_ELSEWHERE
  }

  if (item.kind === 'commentBox' && hit.grab === 'GR-14') {
    // STOP: spec does not decide which command carries GR-14's move. Looked in T-023d, T-108, FR-019
    // @provisional PND-316
    const box = context.document.schedule.commentBoxes.find((one) => one.id === item.id)
    if (box === undefined) return CONSUMED_ELSEWHERE
    const stood = box.bodyOffsetPx ?? { dx: 0, dy: 0 }
    return changed([
      {
        kind: 'setCommentBoxBodyOffsetPx',
        id: item.id,
        dx: stood.dx + (release.x - press.at.x),
        dy: stood.dy + (release.y - press.at.y),
      },
    ])
  }

  if (item.kind !== 'task') return CONSUMED_ELSEWHERE

  const uid = item.taskUid
  switch (hit.grab) {
    case 'GR-7':
      return changed([{ kind: 'cycleTaskPlanActualState', uid }])
    case 'GR-1':
    case 'GR-2': {
      const task = taskByUid(context.document.schedule, uid)
      const start = dayOf(task === null ? null : task.start)
      const finish = dayOf(task === null ? null : task.finish)
      const day = dayAtX(context.layout, release.x)
      if (task === null || start === null || finish === null || day === null) {
        return CONSUMED_ELSEWHERE
      }
      const atPointer =
        serialOfDay(day) +
        unitFraction((release.x - xFromDay(context.layout, day)) / context.layout.pxPerDay)
      const pulled =
        hit.grab === 'GR-1'
          ? Math.round(atPointer - serialOfDay(start))
          : Math.round(serialOfDay(finish) - atPointer)
      const days = clampedFadeDays(task, hit.grab, pulled, serialOfDay(finish) - serialOfDay(start))
      return changed([
        hit.grab === 'GR-1'
          ? { kind: 'setTaskFadeInDays', uid, days }
          : { kind: 'setTaskFadeOutDays', uid, days },
      ])
    }
    case 'GR-3':
    case 'GR-4': {
      const task = taskByUid(context.document.schedule, uid)
      const start = dayOf(task === null ? null : task.start)
      const finish = dayOf(task === null ? null : task.finish)
      const day = dayAtX(context.layout, release.x)
      if (start === null || finish === null || day === null) return CONSUMED_ELSEWHERE
      const moved =
        hit.grab === 'GR-3'
          ? { start: day, finish }
          : { start, finish: day }
      // WHY: an end dragged past the other is not clamped; IV-2 is `editTask`'s, so every caller gets one answer.
      return changed([
        {
          kind: 'setTaskPlanDates',
          uid,
          start: textOfDay(moved.start),
          finish: textOfDay(moved.finish),
        },
      ])
    }
    case 'GR-5':
    case 'GR-15':
    case 'GR-6': {
      const task = taskByUid(context.document.schedule, uid)
      const dropped = dayAtX(context.layout, release.x)
      if (task === null || dropped === null) return CONSUMED_ELSEWHERE
      const place = actualEndPlacement(context.document.schedule, task, hit.grab, dropped)
      if (place === null) return CONSUMED_ELSEWHERE
      return changed([{ kind: 'setTaskPlanActualState', uid, place }])
    }
    case 'GR-9':
    case 'GR-17':
    case 'GR-18': {
      const dropped = dayAtX(context.layout, release.x)
      if (dropped === null) return CONSUMED_ELSEWHERE
      return changed([
        { kind: 'beginTaskActual', uid, grabbed: hit.grab, droppedDay: textOfDay(dropped) },
      ])
    }
    case 'GR-12': {
      const shift = dayShift(context, press.at.x, release.x)
      const row = rowAtY(context.layout, release.y)
      const movedRow = row === null ? null : row.groupId
      const moving = movedTaskUids(context, uid)
      const commands: DocumentCommand[] = []
      for (const each of moving) {
        const task = taskByUid(context.document.schedule, each)
        if (task === null) continue
        const start = dayOf(task.start)
        const finish = dayOf(task.finish)
        if (start !== null && finish !== null && shift !== 0) {
          commands.push({
            kind: 'setTaskPlanDates',
            uid: each,
            start: textOfDay(dayShifted(start, shift)),
            finish: textOfDay(dayShifted(finish, shift)),
          })
        }
      }
      // WHY: only the grabbed Task changes rows; a selection spread over rows has no single row to go to.
      if (movedRow !== null && movedRow !== rowOfTask(context, uid)) {
        commands.push({ kind: 'moveTaskToTaskGroup', uid, groupId: movedRow })
      }
      return changed(commands)
    }
    case 'GR-8': {
      const task = taskByUid(context.document.schedule, uid)
      const dropped = dayAtX(context.layout, release.x)
      if (task === null || dropped === null) return CONSUMED_ELSEWHERE
      // STOP: spec does not decide GR-8 on a suspended Task with no actual. Looked in T-023d, PA-3, FR-044
      // @provisional PND-318
      if (task.actualStart === null || task.actualDuration === null) return CONSUMED_ELSEWHERE
      return changed([
        {
          kind: 'setTaskPlanActualState',
          uid,
          place: {
            row: 'PA-3',
            actualStart: task.actualStart,
            actualDuration: task.actualDuration,
            resume: textOfDay(dropped),
          },
        },
      ])
    }
    default:
      // WHY: GR-10 / GR-11 arrive only as double clicks, GR-13 only selects, and no table sizes
      // GR-14's anchor or corners, so a highlight box press cannot tell which part it took.
      return CONSUMED_ELSEWHERE
  }
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

// see FD-6
/** @purity pure */
function clampedFadeDays(task: Task, grab: 'GR-1' | 'GR-2', pulled: number, span: number): number {
  const room = grab === 'GR-1' ? span : span - (task.fadeInDays ?? 0)
  return Math.min(Math.max(0, pulled), Math.max(0, room))
}

type PlacedPlanActual = Extract<DocumentCommand, { kind: 'setTaskPlanActualState' }>['place']

// see GR-5, GR-6, GR-15
/** @purity pure */
function actualEndPlacement(
  schedule: Schedule,
  task: Task,
  grab: 'GR-5' | 'GR-6' | 'GR-15',
  dropped: CalendarDay,
): PlacedPlanActual | null {
  const held = dayOf(task.actualStart)
  if (held === null) return null
  const calendar = workingCalendarOf(schedule)
  const heldFinish =
    task.actualDuration === null ? null : dateFromWorkingDays(calendar, held, task.actualDuration)
  const actualStart = grab === 'GR-6' ? textOfDay(held) : textOfDay(dropped)
  const actualDuration =
    grab === 'GR-6'
      ? workingDaysBetween(calendar, held, dropped)
      : grab === 'GR-5'
        ? heldFinish === null
          ? null
          : workingDaysBetween(calendar, dropped, heldFinish)
        : task.actualDuration
  if (actualDuration === null) return null

  // TRAP: write back the row the Task already stands at; choosing one lets an end drag finish it.
  switch (planActualState(task)) {
    case 'notStarted':
      return null
    case 'inProgress':
      return { row: 'PA-2', actualStart, actualDuration }
    case 'suspendedResumePlanned':
      return task.resume === null
        ? null
        : { row: 'PA-3', actualStart, actualDuration, resume: task.resume }
    case 'suspendedResumeUnknown':
      return { row: 'PA-4', actualStart, actualDuration }
    case 'finished':
      return task.actualFinish === null
        ? null
        : { row: 'PA-5', actualStart, actualDuration, actualFinish: task.actualFinish }
  }
}

// see PTD-4, FR-001, FR-019
/** @purity pure */
function commandFromArmed(
  release: PointerInput,
  press: PointerPress,
  context: InputContext,
): TranslatedInput {
  const armed = context.screenState.armed
  const from = dayAtX(context.layout, press.at.x)
  const to = dayAtX(context.layout, release.x)
  const row = rowAtY(context.layout, press.at.y)
  if (from === null || to === null) return CONSUMED_ELSEWHERE
  const groupId = row === null ? context.newGroupId : row.groupId
  const early = compareDay(from, to) <= 0 ? from : to
  const late = compareDay(from, to) <= 0 ? to : from
  const dragged = hasDraggedPastThreshold(press, release)

  if (armed.kind === 'taskShape' || armed.kind === 'milestoneShape') {
    const named = armed.kind === 'taskShape' ? armed.shapeKind : 'milestone'
    const shapeKind = taskShapeKindOf(named)
    if (shapeKind === null) return CONSUMED_ELSEWHERE
    const isMilestone = shapeKind === 'milestone'
    if (!isMilestone && !dragged) return nothingToDo('barShapeReleasedWithoutADrag')
    const start = isMilestone ? from : early
    const finish = isMilestone ? from : late
    const commands: DocumentCommand[] = [
      {
        kind: 'createTask',
        shapeKind,
        start: textOfDay(start),
        finish: textOfDay(finish),
        groupId,
      },
    ]
    if (armed.kind === 'milestoneShape') {
      const glyph = milestoneGlyphOf(armed.glyph)
      if (glyph !== null) {
        commands.push({
          kind: 'setTaskVisualMilestoneGlyph',
          uid: nextIssuedUid(context.document.schedule),
          glyph,
        })
      }
    }
    return changedAndCreated([commands], {
      kind: 'task',
      uid: nextIssuedUid(context.document.schedule),
    })
  }

  if (armed.kind === 'commentBox') {
    if (row === null) return nothingToDo('noRowToPutTheAnnotationOn')
    return changed([
      {
        kind: 'createCommentBox',
        id: context.newCommentBoxId,
        anchor: { date: textOfDay(from), groupId: row.groupId },
      },
    ])
  }

  if (armed.kind === 'highlightBox') {
    if (!dragged) return CONSUMED_ELSEWHERE

    const releaseRow = rowAtY(context.layout, release.y)
    if (row === null || releaseRow === null) return nothingToDo('noRowToPutTheAnnotationOn')

    // TRAP: rank rows by tree order, not RowPlacement.y: once FR-098 pins a row,
    // comparing y writes pairs IV-19 refuses.
    const rankById = taskGroupRankById(context.document.schedule.taskGroups)
    const pressRank = rankById.get(row.groupId) ?? 0
    const releaseRank = rankById.get(releaseRow.groupId) ?? 0
    const isPressAbove = pressRank <= releaseRank
    const top = isPressAbove ? row : releaseRow
    const bottom = isPressAbove ? releaseRow : row
    return changed([
      {
        kind: 'createHighlightBox',
        id: context.newHighlightBoxId,
        range: {
          startDate: textOfDay(early),
          endDate: textOfDay(late),
          topGroupId: top.groupId,
          bottomGroupId: bottom.groupId,
        },
      },
    ])
  }

  return CONSUMED_ELSEWHERE
}

// TRAP: schedule.ts holds the same walk under the same name; change both together.
// see IV-19
/** @purity pure */
function taskGroupRankById(groups: readonly TaskGroup[]): ReadonlyMap<string, number> {
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

// see SL-7
/** @purity pure */
function movedTaskUids(context: InputContext, grabbed: number): readonly number[] {
  const held: ItemRef = { kind: 'task', uid: grabbed }
  if (!isSelected(context.selection, held)) return [grabbed]
  const uids: number[] = []
  for (const one of context.selection.items) {
    if (one.kind === 'task') uids.push(one.uid)
  }
  return uids
}

// TRAP: reading ScheduleLayout.placements instead breaks a body drag: the layout already
// draws the Task under the pointer, so GR-12's guard cancels the move.
/** @purity pure */
function rowOfTask(context: InputContext, uid: number): string | null {
  const member = context.document.schedule.taskGroupMembers.find((one) => one.taskUid === uid)
  return member === undefined ? null : member.groupId
}

/** @purity pure */
function dayShift(context: InputContext, fromX: number, toX: number): number {
  const from = dayAtX(context.layout, fromX)
  const to = dayAtX(context.layout, toX)
  if (from === null || to === null) return 0
  return serialOfDay(to) - serialOfDay(from)
}

/** @purity pure */
function compareDay(a: CalendarDay, b: CalendarDay): number {
  return serialOfDay(a) - serialOfDay(b)
}

// STOP: spec does not decide the zoom step of one SK-16 / SK-16a press.
// Looked in S-53, S-75, S-76, FR-016. @provisional PND-11
/** @purity pure */
function keyZoomFactor(context: InputContext, isIn: boolean): number {
  const step = context.zoomStep
  return isIn ? step : 1 / step
}

// see FR-016, S-229
/** @purity pure */
function zoomXCeiling(context: InputContext): number | null {
  const width = context.regions.rowArea.width
  const drawnAt = zoomOnScreen(context).x
  const pxPerDayAt1x = context.layout.pxPerDay / drawnAt
  const ceiling = width / (NOT_STORED_VISIBLE_DAY_FLOOR['S-229'] * pxPerDayAt1x)
  if (!Number.isFinite(ceiling) || ceiling <= 0) return null
  return ceiling
}

/** @purity pure */
function tallestBandOf(rows: readonly RowPlacement[]): RowPlacement | null {
  let tallest: RowPlacement | null = null
  for (const row of rows) {
    if (tallest === null || row.height > tallest.height) tallest = row
  }
  return tallest
}

// WHY: the lane's tallest figure now stands for every zoom; off by one actualGap only
// where two shapes with different actualGap swap, a span no row covers.
// see LF-2
/** @purity pure */
function bandGrowthOf(
  context: InputContext,
  row: RowPlacement,
): { readonly grows: number; readonly fixed: number } {
  const settings = context.document.documentSettings
  const tallestOfLane = new Map<number, TaskPlacement>()
  for (const figure of context.layout.placements) {
    if (figure.groupId !== row.groupId) continue
    const held = tallestOfLane.get(figure.stack)
    if (held === undefined || figure.height > held.height) tallestOfLane.set(figure.stack, figure)
  }
  if (tallestOfLane.size === 0) return { grows: context.layout.rectangleHeight, fixed: 0 }
  let grows = 0
  let fixed = settings.stackGap * (tallestOfLane.size - 1)
  for (const figure of tallestOfLane.values()) {
    const gap = figure.actualPlacement === 'below' ? settings.actualGap : 0
    grows += Math.max(0, figure.height - gap)
    fixed += gap
  }
  return { grows, fixed }
}

// see FR-016
/** @purity pure */
function zoomYCeiling(context: InputContext): number | null {
  const settings = context.document.documentSettings
  const height = context.regions.rowArea.height
  const tallest = tallestBandOf(context.layout.rows)
  if (tallest === null || !(height > 0)) return null
  const { grows, fixed } = bandGrowthOf(context, tallest)
  if (!(grows > 0)) return null
  const shapeRatio = settings.shapeHeightOf.rectangle
  const drawnScale = context.layout.rectangleHeight / shapeRatio
  const ceiling = (drawnScale * ((height - fixed) / grows)) / settings.basePlanHeight
  if (!Number.isFinite(ceiling) || ceiling <= 0) return null
  return ceiling
}

// TRAP: rounding the stepped zoom breaks FR-018 silently (it can cross a detail threshold).
// see FR-016, FR-018
/** @purity pure */
function zoomTimes(context: InputContext, factor: number, axis: 'x' | 'y'): number {
  const on = zoomOnScreen(context)
  const stepped = (axis === 'x' ? on.x : on.y) * factor
  const ceiling = axis === 'x' ? zoomXCeiling(context) : zoomYCeiling(context)
  return ceiling === null ? stepped : Math.min(stepped, ceiling)
}

/** @purity pure */
function zoomCommand(
  context: InputContext,
  zoomX: number | null,
  zoomY: number | null,
): DocumentCommand {
  const on = zoomOnScreen(context)
  return {
    kind: 'setZoom',
    zoomX: zoomX === null ? on.x : zoomX,
    zoomY: zoomY === null ? on.y : zoomY,
  }
}

// TRAP: viewSettings in frame-loop.ts writes the same base half of OP-10's condition;
// change both together.
// see OP-10
/** @purity pure */
function namesAPlace(
  schedule: Schedule,
  scrollDate: string | null,
  scrollGroupId: string | null,
): boolean {
  if (scrollDate === null) return false
  return schedule.taskGroups.some((one) => one.id === scrollGroupId)
}

// see OP-10
/** @purity pure */
function placeSeated(context: InputContext): readonly DocumentCommand[] {
  const schedule = context.document.schedule
  const settings = context.document.documentSettings
  if (namesAPlace(schedule, settings.scrollDate, settings.scrollGroupId)) return []
  const at = scrolledAnchor(context, 0, 0)
  if (!namesAPlace(schedule, at.scrollDate, at.scrollGroupId)) return []
  return [
    {
      kind: 'setScrollPosition',
      scrollDate: at.scrollDate,
      scrollDayOffset: at.scrollDayOffset,
      scrollGroupId: at.scrollGroupId,
      scrollGroupOffset: at.scrollGroupOffset,
    },
  ]
}

/** @purity pure */
function zoomCentreX(context: InputContext, pointerX: number | null): number {
  const area = context.regions.rowArea
  return pointerX === null ? area.x + area.width / 2 : pointerX
}

/** @purity pure */
function zoomCentreY(context: InputContext, pointerY: number | null): number {
  const area = context.regions.rowArea
  return pointerY === null ? area.y + area.height / 2 : pointerY
}

// TRAP: rowAnchorIn and scrollOffsetOf measure the same slab; change all three together.
/** @purity pure */
function rowPointIn(
  rows: readonly RowPlacement[],
  anchor: Pick<ScrollAnchor, 'scrollGroupId' | 'scrollGroupOffset'>,
): number | null {
  const at = rows.findIndex((row) => row.groupId === anchor.scrollGroupId)
  if (at < 0) return null
  const row = rows[at]
  if (row === undefined) return null
  const below = rows[at + 1]
  const slab = below === undefined ? row.height : below.y - row.y
  const into = Number.isFinite(anchor.scrollGroupOffset) ? anchor.scrollGroupOffset : 0
  return row.y + into * slab
}

/** @purity pure */
function topEdgeIn(
  rows: readonly RowPlacement[],
  anchor: Pick<ScrollAnchor, 'scrollGroupId' | 'scrollGroupOffset'>,
): number | null {
  const marked = rowPointIn(rows, anchor)
  if (marked !== null) return marked
  const first = rows[0]
  return first === undefined ? null : first.y
}

// see S-75, S-76
/** @purity pure */
function zoomWithinBounds(context: InputContext, value: number): number {
  return Math.max(context.zoomMin, Math.min(context.zoomMax, value))
}

// see FR-016
/** @purity pure */
function dayHeldStill(
  context: InputContext,
  zoomX: number | null,
  centreX: number,
): Pick<ScrollAnchor, 'scrollDate' | 'scrollDayOffset'> | null {
  if (zoomX === null) return null
  const area = context.regions.rowArea
  const factor = zoomWithinBounds(context, zoomX) / zoomOnScreen(context).x
  if (!Number.isFinite(factor) || factor <= 0) return null
  // TRAP: holds only while both layouts start the day axis at regions.rowArea.x.
  return dayAnchorAt(context, centreX - (centreX - area.x) / factor)
}

// see FR-016, PI-5
/** @purity pure */
function rowHeldStill(
  context: InputContext,
  zoomX: number | null,
  zoomY: number | null,
  centreY: number,
): Pick<ScrollAnchor, 'scrollGroupId' | 'scrollGroupOffset'> | null {
  if (zoomY === null) return null
  const on = zoomOnScreen(context)
  const willBe = zoomWithinBounds(context, zoomY)
  if (!(willBe > 0) || willBe === on.y) return null
  const seat = scrolledAnchor(context, 0, 0)
  const held = rowAnchorIn(scrollingRowsOf(context.layout), centreY, seat)
  // TRAP: lay the candidate out at the new zoomX too: lanes follow horizontal overlap (ST-2, ST-3).
  const after = rowPlacesAtZoomY(
    context.document.schedule,
    {
      ...context.document.documentSettings,
      zoomX: zoomX === null ? on.x : zoomWithinBounds(context, zoomX),
      scrollDate: seat.scrollDate,
      scrollDayOffset: seat.scrollDayOffset,
      scrollGroupId: seat.scrollGroupId,
      scrollGroupOffset: seat.scrollGroupOffset,
    },
    context.regions,
    willBe,
    context.isLevelZeroFolded,
    context.rowControlsHeightPx,
  ).filter((row) => row.isPinned !== true)
  const landed = rowPointIn(after, held)
  const topEdge = topEdgeIn(after, seat)
  if (landed === null || topEdge === null) return null
  return rowAnchorIn(after, topEdge + (landed - centreY), seat)
}

// see FR-016, OP-10
/** @purity pure */
function placeHeldStill(
  context: InputContext,
  zoomX: number | null,
  zoomY: number | null,
  centreX: number,
  centreY: number,
): readonly DocumentCommand[] {
  const day = dayHeldStill(context, zoomX, centreX)
  const row = rowHeldStill(context, zoomX, zoomY, centreY)
  if (day === null && row === null) return placeSeated(context)
  const seat = scrolledAnchor(context, 0, 0)
  const heldDay = day ?? seat
  const heldRow = row ?? seat
  const to = {
    kind: 'setScrollPosition',
    scrollDate: heldDay.scrollDate,
    scrollDayOffset: heldDay.scrollDayOffset,
    scrollGroupId: heldRow.scrollGroupId,
    scrollGroupOffset: heldRow.scrollGroupOffset,
  } as const
  if (!namesAPlace(context.document.schedule, to.scrollDate, to.scrollGroupId)) {
    return placeSeated(context)
  }
  return isScrollPositionInForce(context, to) ? [] : [to]
}

// see FR-016
/** @purity pure */
function zoomWrites(
  context: InputContext,
  zoomX: number | null,
  zoomY: number | null,
  pointerX: number | null,
  pointerY: number | null,
): readonly DocumentCommand[] {
  return [
    ...placeHeldStill(
      context,
      zoomX,
      zoomY,
      zoomCentreX(context, pointerX),
      zoomCentreY(context, pointerY),
    ),
    zoomCommand(context, zoomX, zoomY),
  ]
}

// TRAP: CM-72 (expandAllTaskGroups) writes the same predicate; change both together.
// see HF-8
/** @purity pure */
function collapsesDiscarded(schedule: Schedule): Schedule {
  return {
    ...schedule,
    taskGroups: schedule.taskGroups.map((one) =>
      one.isCollapsed === true ? { ...one, isCollapsed: false } : one,
    ),
  }
}

// TRAP: do not move the discard into fitZoom: viewSettings in frame-loop.ts shares fitZoom,
// and HF-8 forbids the discard at startup.
// see FR-055, HF-8
/** @purity pure */
function fittedNow(context: InputContext) {
  return fitZoom(
    collapsesDiscarded(context.document.schedule),
    context.document.documentSettings,
    context.regions,
    { step: context.zoomStep, min: context.zoomMin, max: context.zoomMax },
    context.rowControlsHeightPx,
  )
}

// see OP-10, FR-055
/** @purity pure */
function zoomOnScreen(context: InputContext): { readonly x: number; readonly y: number } {
  const settings = context.document.documentSettings
  // TRAP: keep ?? and not === true: an absent flag falls back to OP-10's base half.
  const atStoredZoom =
    context.isPictureAtStoredZoom ??
    namesAPlace(context.document.schedule, settings.scrollDate, settings.scrollGroupId)
  if (atStoredZoom) {
    return { x: settings.zoomX, y: settings.zoomY }
  }
  const fitted = fittedNow(context)
  return { x: fitted.zoomX, y: Math.max(fitted.zoomY, fitted.floorZoomY) }
}

// see SK-18, FR-055
/** @purity pure */
function fitCommand(context: InputContext): DocumentCommand {
  const schedule = context.document.schedule
  const fitted = fittedNow(context)
  const at = scrolledAnchor(context, 0, 0)
  const place = namesAPlace(schedule, fitted.scrollDate, fitted.scrollGroupId)
    ? { scrollDate: fitted.scrollDate, scrollGroupId: fitted.scrollGroupId }
    : namesAPlace(schedule, at.scrollDate, at.scrollGroupId)
      ? { scrollDate: at.scrollDate, scrollGroupId: at.scrollGroupId }
      : { scrollDate: fitted.scrollDate, scrollGroupId: fitted.scrollGroupId }
  return {
    kind: 'fitScheduleToScreen',
    zoomX: fitted.zoomX,
    zoomY: fitted.zoomY,
    scrollDate: place.scrollDate,
    scrollGroupId: place.scrollGroupId,
    scrollDayOffset: 0,
    scrollGroupOffset: 0,
  }
}

// see SK-3, SL-1, FR-046
/** @purity pure */
function deleteCommandsFor(context: InputContext): readonly DocumentCommand[] {
  const schedule = context.document.schedule
  const commands: DocumentCommand[] = []
  for (const one of context.selection.items) {
    switch (one.kind) {
      case 'task':
        commands.push({ kind: 'deleteTask', uid: one.uid })
        break
      case 'dependency': {
        const successor = taskByUid(schedule, one.successorUid)
        const edge = successor === null ? undefined : successor.dependencies[one.ordinal]
        if (edge === undefined) break
        commands.push({
          kind: 'deleteDependency',
          predecessorUid: edge.predecessorUid,
          successorUid: one.successorUid,
        })
        break
      }
      case 'highlightBox':
        commands.push({ kind: 'deleteHighlightBox', id: one.id })
        break
      case 'commentBox':
        commands.push({ kind: 'deleteCommentBox', id: one.id })
        break
      case 'statusLine':
        commands.push({ kind: 'clearStatusDate' })
        break
    }
  }
  return commands
}

// see T-023c
/** @purity pure */
export function selectionFromInput(input: HumanInput, context: InputContext): Selection {
  const held = context.selection

  if (input.kind === 'key') {
    const isSelectAll = isCombo(input.modifiers, true, false, false) && input.key === KEY.a
    if (isSelectAll && !context.isTextEntryUnsettled) {
      return selectionOfAll(everythingSelectable(context))
    }
    if (
      isCombo(input.modifiers, false, false, false) &&
      input.key === KEY.escape &&
      escapeTarget(context.screenState, escapeContextOf(context)) === 'selection'
    ) {
      return emptySelection()
    }
    if (
      isCombo(input.modifiers, false, false, false) &&
      input.key === KEY.enter &&
      context.isNoticeStanding !== true &&
      !context.isTextEntryUnsettled &&
      context.isPropertiesPanelShowing !== true
    ) {
      return emptySelection()
    }
    return held
  }
  if (input.kind !== 'pointer' || input.phase !== 'up') return held

  const press = context.pressed
  if (press === null) return held
  if (press.on !== null) return held
  if (!isOnRowArea(context, press.at.x, press.at.y)) return held

  const isAdding = press.at.modifiers.shift

  switch (pressRowOf(press, context)) {
    case 'PTD-3': {
      const ref = press.hit === null ? null : itemRefOf(context.document.schedule, press.hit.item)
      if (ref === null) return held
      if (isAdding) {
        return isSelected(held, ref) ? selectionWithout(held, ref) : selectionWith(held, ref)
      }
      return selectionWith(emptySelection(), ref)
    }
    case 'PTD-5': {
      const rect = marqueeRect(press.at, input)
      if (rect.width === 0 && rect.height === 0) {
        return isAdding ? held : emptySelection()
      }
      const caught: ItemRef[] = []
      for (const item of itemsInMarquee(context.geometry, rect)) {
        const ref = itemRefOf(context.document.schedule, item)
        if (ref !== null) caught.push(ref)
      }
      return isAdding ? selectionOfAll([...held.items, ...caught]) : selectionOfAll(caught)
    }
    default:
      return held
  }
}

// see IN-4
/** @purity pure */
function escapeContextOf(context: InputContext): EscapeContext {
  return {
    isNoticeStanding: context.isNoticeStanding === true,
    isTextEntryUnsettled: context.isTextEntryUnsettled,
    gestureInFlight: context.pressed !== null,
    isPropertiesPanelOpen: context.isPropertiesPanelShowing === true,
    isSelectionStanding: context.selection.items.length > 0,
    dualCursorMode: context.dualCursorFollowing !== null,
  }
}

// see FR-083, T-023b
/** @purity pure */
function screenStateFromEntry(entry: string, context: InputContext): ScreenState {
  const state = context.screenState

  switch (entry) {
    case ENTRY.palette:
      return screenStateWithPalette(state, !state.paletteShown)
    case ENTRY.fullScreen:
      return screenStateWithFullScreen(state, !state.fullScreen)
    case ENTRY.help:
      return screenStateWithSurface(state, HELP_MODAL)
    case ENTRY.aiExportModal:
      return screenStateWithSurface(state, AI_EXPORT_MODAL)
    case ENTRY.resourceRoster:
      return screenStateWithSurface(state, RESOURCE_ROSTER)
    case ENTRY.dualCursor:
      // WHY: the arm drops even where PND-313 takes the press without raising the mode;
      // re-reading dayAtX here would put that rule in a second place.
      return context.dualCursorFollowing === null
        ? screenStateWithArmed(state, { kind: 'none' })
        : state
    case ENTRY.watermark:
      return state.watermarkVisible
        ? screenStateWithSurface(state, WATERMARK_UNLOCK)
        : screenStateWithWatermark(state, true)
    case ENTRY.exportChooser:
      return screenStateWithSurface(state, EXPORT_CHOOSER)
    case ENTRY.closeSurface:
      return context.pressed?.on?.part === PROPERTIES_PANEL
        ? state
        : screenStateWithSurface(state, null)
    default:
      break
  }

  const armed = armedByEntry(entry)
  if (armed === null) return state
  return screenStateWithArmed(state, isSameArm(state.armed, armed) ? { kind: 'none' } : armed)
}

// see CP-36, IN-4
/** @purity pure */
export function screenStateFromInput(input: HumanInput, context: InputContext): ScreenState {
  const state = context.screenState
  if (input.kind === 'pointer') {
    if (input.phase !== 'up') return state
    const on = context.pressed === null ? null : context.pressed.on
    if (on?.isImportReportDismiss === true) return screenStateWithSurface(state, null)
    return on === null || on.entry === null ? state : screenStateFromEntry(on.entry, context)
  }
  if (input.kind !== 'key') return state
  if (isCombo(input.modifiers, true, true, false) && input.key === KEY.e) {
    return screenStateWithSurface(state, EXPORT_CHOOSER)
  }
  const plain = isCombo(input.modifiers, false, false, false)
  if (!plain) return state
  if (context.isTextEntryUnsettled) {
    if (isSingleCharacterKey(input.key)) return state
  }

  if (input.key === KEY.escape) {
    // TRAP: escapeContextOf never reports a standing confirmation, so a caller holding one
    // must not ask this member (it would close the surface behind it); frame-loop.ts skips it.
    switch (escapeTarget(state, escapeContextOf(context))) {
      case 'surface':
        return screenStateWithSurface(state, null)
      case 'armed':
        return screenStateWithArmed(state, { kind: 'none' })
      case 'notice':
      case 'gesture':
      case 'dualCursorMode':
      case 'confirmation':
      case 'propertiesPanel':
      case 'selection':
      case null:
      default:
        return state
    }
  }

  if (input.key === KEY.f1) return screenStateWithSurface(state, HELP_MODAL)
  if (input.key === KEY.p) return screenStateWithPalette(state, !state.paletteShown)
  if (input.key === KEY.f11) return screenStateWithFullScreen(state, !state.fullScreen)

  return state
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
// </generated>
