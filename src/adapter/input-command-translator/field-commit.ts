// InputCommandTranslator -- a value committed in the properties panel into a command (table T-016).
// @unit      UF-100  (docs/spec/05-07-design.md, table T-075)
// @component InputCommandTranslator, layer Adapter (table T-062)
// @purity    pure

import {
  DATE_COLUMNS,
  customColorChosen,
  dataWallOfViewWall,
  dayOf,
  instantAfterWorkingMinutes,
  instantOf,
  instantOnSide,
  sideOfTaskColumn,
  startSideOf,
  viewRegionOf,
  zoneClockOf,
  lastDayForLength,
  minutesPerWorkingDayOf,
  planActualState,
  taskByUid,
  textOfDayEnd,
  textOfDayStart,
  textOfFinishSide,
  textOfInstant,
  textOfStartSide,
  workingCalendarOf,
  type CalendarDay,
  type Project,
  type Schedule,
  type Task,
} from '../../entity/document-model/schedule/schedule'
import {
  DISPLAY_SCALE_STEPS,
  SETTINGS_CONSTANTS,
  type DocumentSettings,
} from '../../entity/document-model/document-settings/document-settings'
import { displayScaleFractionOf } from '../../entity/layout-engine/screen-regions/screen-regions'
import { shownSpanOf } from '../../entity/layout-engine/schedule-layout/schedule-layout'
import { DISPLAY_TIME_ZONE_SLOT_SEPARATOR, FIT_SPAN_COPY_TEXT, type FieldCommit } from '../screen-renderer/screen-renderer'
import type { DocumentCommand } from '../../use-case/edit-document/edit-document'
import {
  milestoneGlyphOf,
  nextIssuedUid,
  placementAt,
  type InputContext,
  type PlacedPlanActual,
} from './input-command-translator'
import { statusLineCentered, zoomXCeiling } from './zoom-and-fit'

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

// see FR-009, TX-3, TX-10
const TYPED_LENGTH = /^([-+])?\s*(?:(\d+)\s*d)?\s*(?:(\d+)\s*h)?\s*(?:(\d+)\s*m)?$/i
const BARE_WORKING_DAYS = /^[-+]?\d+$/
const MINUTES_PER_HOUR = 60

type TypedLagUnit = Extract<DocumentCommand, { readonly lagUnit: unknown }>['lagUnit']

interface TypedLength {
  readonly minutes: number
  readonly unit: TypedLagUnit
}

// see FR-009, TX-3, TX-10, PR-5, PR-42
// WHY: the unit is the finest one typed, so the length is a whole count of it (FR-009 writes the typed unit's format).
/** @purity pure */
function typedLengthOf(text: string, minutesPerDay: number): TypedLength | null | undefined {
  const held = settledText(text)
  if (held === null) return null
  if (BARE_WORKING_DAYS.test(held)) return { minutes: Math.round(Number(held) * minutesPerDay), unit: 'd' }
  const hit = TYPED_LENGTH.exec(held)
  const [sign, days, hours, minutes] = [hit?.[1], hit?.[2], hit?.[3], hit?.[4]]
  if (hit === null || (days ?? hours ?? minutes) === undefined) return undefined
  const total = Number(days ?? 0) * minutesPerDay + Number(hours ?? 0) * MINUTES_PER_HOUR + Number(minutes ?? 0)
  const unit: TypedLagUnit = minutes !== undefined ? 'm' : hours !== undefined ? 'h' : 'd'
  return { minutes: Math.round(sign === '-' ? -total : total), unit }
}

type SideText = (day: CalendarDay) => string

// see T-350
/** @purity pure */
function sideTextOf(project: Project, task: Task, column: string): SideText {
  return sideOfTaskColumn(task, column) === 'start'
    ? (day) => textOfStartSide(day, project, false)
    : (day) => textOfFinishSide(day, project)
}

const DATE_AND_TIME = /^(\d{4}-\d{2}-\d{2}[T ])(\d{1,2})(:\d{2}.*)$/

const HOUR_DIGITS = 2

// WHY: the panel shows and takes H:MM (TX-3); a stored text has two hour digits (FR-054), so one is padded here.
/** @purity pure */
function typedInstantOf(held: string): number | null {
  const hit = DATE_AND_TIME.exec(held)
  if (hit === null) return null
  return instantOf(`${hit[1]}${(hit[2] ?? '').padStart(HOUR_DIGITS, '0')}${hit[3]}`)
}

/** @purity pure */
function settledDay(text: string, sideText: SideText): string | null | undefined {
  const held = settledText(text)
  if (held === null) return null
  const instant = typedInstantOf(held)
  if (instant !== null) return textOfInstant(instant)
  const day = dayOf(held)
  return day === null ? undefined : sideText(day)
}

// see CV-4, CV-5
// WHY: the color field commits a palette name, an empty text (back to the theme) or one #rrggbb
// from its custom entrance; only the last is folded into the side of the theme being drawn.
/** @purity pure */
function settledColor(text: string, previous: string | null, dark: boolean): string | null {
  const held = settledText(text)
  return held === null ? null : (customColorChosen(previous, held, dark) ?? held)
}

/** @purity pure */
function settledTruth(text: string): boolean {
  return text.trim() === String(true)
}

// see PR-5, P-5
// WHY: the name of PR-5's row, not a Task column; the length is counted from the dates (FR-011).
const ACTUAL_LENGTH_ITEM = 'actualDuration'

// see CM-13, T-019, T-019a, FR-044, PR-5
/** @purity pure */
function planActualWithColumn(
  schedule: Schedule,
  task: Task,
  column: string,
  text: string,
  isTimeOfDayVisible: boolean,
): PlacedPlanActual | null {
  const next: Task = { ...task }
  // WHY: written by name; five typed arms would repeat the classification below five times.
  const written = next as unknown as { [key: string]: unknown }
  if (column === 'resumeValid') {
    written[column] = settledTruth(text)
  } else if (column === ACTUAL_LENGTH_ITEM) {
    const end = actualEndForLength(schedule, task, text, isTimeOfDayVisible)
    if (end === null) return null
    written[planActualState(task) === 'finished' ? 'actualFinish' : 'stop'] = end
  } else {
    const day = settledDay(text, sideTextOf(schedule.project, task, column))
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
    // WHY: a cleared actualFinish hands its day to stop as PV-3 does, or the actual loses its right end.
    if (column === 'actualFinish' && day === null && task.actualFinish !== null && next.stop === null) {
      written['stop'] = task.actualFinish
    }
  }

  if (planActualState(next) === 'notStarted') return { row: 'PA-1' }
  return placementAt(next)
}

// see PR-5, FR-011, TX-3
/** @purity pure */
function actualEndForLength(schedule: Schedule, task: Task, text: string, isTimeOfDayVisible: boolean): string | null {
  if (isTimeOfDayVisible) {
    const typed = typedLengthOf(text, minutesPerWorkingDayOf(schedule.project))
    const within = workingCalendarOf(schedule)
    const from = instantOnSide(within, task.actualStart, startSideOf(task))
    if (typed === undefined || typed === null || from === null) return null
    return textOfInstant(instantAfterWorkingMinutes(within, from, typed.minutes))
  }
  const days = settledNumber(text)
  const from = dayOf(task.actualStart)
  if (days === undefined || days === null || from === null) return null
  return sideTextOf(schedule.project, task, 'stop')(lastDayForLength(workingCalendarOf(schedule), from, days))
}

const PLAN_ACTUAL_COLUMNS: readonly string[] = [
  'actualStart',
  ACTUAL_LENGTH_ITEM,
  'actualFinish',
  'resume',
  'resumeValid',
]

// see PR-35, PR-36, CM-11, CM-13
/** @purity pure */
function commandFromMilestoneDay(task: Task, column: keyof Task, text: string, project: Project): readonly DocumentCommand[] | null {
  const uid = task.uid
  const isPlan = column === 'start' || column === 'finish'
  if (!isPlan && column !== 'actualStart' && column !== 'actualFinish') return null
  const typed = settledDay(text, sideTextOf(project, task, column))
  if (typed === undefined) return []
  if (isPlan) return typed === null ? [] : [{ kind: 'setTaskPlanDates', uid, start: typed, finish: typed }]
  const place: PlacedPlanActual =
    typed === null ? { row: 'PA-1' } : { row: 'PA-5', actualStart: typed, actualFinish: typed }
  return [{ kind: 'setTaskPlanActualState', uid, place }]
}

// see PR-3, PR-47, CM-11, FR-006
/** @purity pure */
function commandFromPlanDate(project: Project, task: Task, column: 'start' | 'finish', text: string): readonly DocumentCommand[] {
  const settled = settledDay(text, sideTextOf(project, task, column))
  if (settled === undefined || settled === null) return []
  const start = column === 'start' ? settled : task.start
  const finish = column === 'finish' ? settled : task.finish
  if (start === null || finish === null) return []
  return [{ kind: 'setTaskPlanDates', uid: task.uid, start, finish }]
}

// see T-016, PR-3, CM-11, FR-006
/** @purity pure */
function commandFromTaskColumn(
  schedule: Schedule,
  task: Task,
  column: keyof Task,
  text: string,
  isTimeOfDayVisible: boolean,
): readonly DocumentCommand[] {
  const uid = task.uid

  if (PLAN_ACTUAL_COLUMNS.includes(column)) {
    const place = planActualWithColumn(schedule, task, column, text, isTimeOfDayVisible)
    return place === null ? [] : [{ kind: 'setTaskPlanActualState', uid, place }]
  }

  switch (column) {
    case 'name':
      return [{ kind: 'setTaskName', uid, name: settledText(text) }]
    case 'notes':
      return [{ kind: 'setTaskNotes', uid, notes: settledText(text) }]
    case 'start':
    case 'finish':
      return commandFromPlanDate(schedule.project, task, column, text)
    case 'deadline': {
      const deadline = settledDay(text, sideTextOf(schedule.project, task, column))
      return deadline === undefined ? [] : [{ kind: 'setTaskDeadline', uid, deadline }]
    }
    case 'fadeInDays': {
      const days = settledNumber(text)
      return days === undefined ? [] : [{ kind: 'setTaskFadeInDays', uid, fadeInDays: days }]
    }
    case 'fadeOutDays': {
      const days = settledNumber(text)
      return days === undefined ? [] : [{ kind: 'setTaskFadeOutDays', uid, fadeOutDays: days }]
    }
    case 'parentTaskUid': {
      const parentUid = settledNumber(text)
      return parentUid === undefined ? [] : [{ kind: 'setTaskParentTask', uid, parentTaskUid: parentUid }]
    }
    default:
      return []
  }
}

// see FR-007, CM-22, CM-23, CV-4, CV-5
/** @purity pure */
function commandsFromVisualColor(
  visual: Schedule['taskVisuals'][number] | null,
  uid: number,
  isStroke: boolean,
  text: string | null,
  dark: boolean,
): readonly DocumentCommand[] {
  const held = (isStroke ? visual?.strokeColor : visual?.fillColor) ?? null
  const chosen = text === null ? null : settledColor(text, held, dark)
  const other = (isStroke ? visual?.fillColor : visual?.strokeColor) ?? null
  if (chosen === null && other === null) return [{ kind: 'resetTaskVisualColors', uid }]
  const strokeColor = isStroke ? chosen : other
  const fillColor = isStroke ? other : chosen
  return [{ kind: 'setTaskVisualColors', uid, fillColor, strokeColor }]
}

// see FR-007, FR-078, FR-002, CM-22, CM-23
/** @purity pure */
function commandFromVisualColumn(
  schedule: Schedule,
  uid: number,
  column: string,
  text: string,
  dark: boolean,
): readonly DocumentCommand[] {
  const visual = schedule.taskVisuals.find((held) => held.taskUid === uid) ?? null

  switch (column) {
    case 'milestoneGlyph': {
      const held = settledText(text)
      const glyph = held === null ? null : milestoneGlyphOf(held)
      if (held !== null && glyph === null) return []
      return [{ kind: 'setTaskVisualMilestoneGlyph', uid, milestoneGlyph: glyph }]
    }
    case 'strokeColor':
    case 'fillColor':
      return commandsFromVisualColor(visual, uid, column === 'strokeColor', settledText(text), dark)
    case 'strokeWidthPx': {
      const strokeWidthPx = settledNumber(text)
      return strokeWidthPx === undefined ? [] : [{ kind: 'setTaskVisualStrokeWidthPx', uid, strokeWidthPx }]
    }
    default:
      return []
  }
}

// see FR-042, AT-53, CM-29, CM-30, CM-31
/** @purity pure */
function commandFromGroupColumn(
  group: Schedule['taskGroups'][number],
  column: string,
  text: string,
  dark: boolean,
): readonly DocumentCommand[] {
  const taskGroupId = group.id
  switch (column) {
    case 'name': {
      return [{ kind: 'setTaskGroupName', taskGroupId, name: settledText(text) }]
    }
    case 'color': {
      const color = settledColor(text, group.color, dark)
      return color === null
        ? [{ kind: 'resetTaskGroupColor', taskGroupId }]
        : [{ kind: 'setTaskGroupColor', taskGroupId, color }]
    }
    case 'minHeightPx': {
      const minHeight = settledNumber(text)
      return minHeight === undefined ? [] : [{ kind: 'setTaskGroupMinHeightPx', taskGroupId, minHeightPx: minHeight }]
    }
    default:
      return []
  }
}

const MIN_HEIGHT_COLUMN = 'minHeightPx'

const CHECK_TEXTS: readonly string[] = [String(true), String(false)]

// see MH-2, MH-1, MH-3, DS-13
/** @purity pure */
function minHeightTextOf(text: string, taskGroupId: string, context: InputContext): string | null {
  if (!CHECK_TEXTS.includes(text)) return text
  if (text === String(false)) return ''
  const placed = context.layout.taskGroups.find((taskGroup) => taskGroup.taskGroupId === taskGroupId)
  if (placed === undefined) return null
  return String(Math.round(placed.height / displayScaleFractionOf(context.document.documentSettings)))
}

type HighlightBox = Schedule['highlightBoxes'][number]

// see PR-22, PR-23, PR-24, PR-25, CM-55, CM-77, CM-78, CM-79
// WHY: a number the field cannot read writes nothing; an empty field writes null, which draws T-217's default.
/** @purity pure */
function commandFromHighlightBoxColumn(
  box: HighlightBox,
  column: string,
  text: string,
  dark: boolean,
): readonly DocumentCommand[] {
  const id = box.id
  const number = settledNumber(text)
  switch (column) {
    case 'strokeColor':
      return [{ kind: 'setHighlightBoxStrokeColor', id, strokeColor: settledColor(text, box.strokeColor, dark) }]
    case 'fillColor':
      return [{ kind: 'setHighlightBoxFillColor', id, fillColor: settledColor(text, box.fillColor, dark) }]
    case 'strokeWidthPx':
      return number === undefined ? [] : [{ kind: 'setHighlightBoxStrokeWidthPx', id, strokeWidthPx: number }]
    case 'fillTransparencyPercent':
      return number === undefined
        ? []
        : [{ kind: 'setHighlightBoxFillTransparencyPercent', id, fillTransparencyPercent: number }]
    default:
      return []
  }
}

type CommentBox = Schedule['commentBoxes'][number]

// see PR-21, PR-26, PR-27, PR-28, CM-48, CM-80, CM-81, CM-82, CM-83, CM-84
// WHY: dispatched by column: one field per column, and PR-28's three colors must not land in the text (S-7).
/** @purity pure */
function commandFromCommentBoxColumn(
  box: CommentBox,
  column: string,
  text: string,
  dark: boolean,
): readonly DocumentCommand[] {
  const id = box.id
  const number = settledNumber(text)
  switch (column) {
    case 'text':
      return [{ kind: 'setCommentBoxText', id, text: settledText(text) }]
    case 'strokeColor':
      return [{ kind: 'setCommentBoxStrokeColor', id, strokeColor: settledColor(text, box.strokeColor, dark) }]
    case 'fillColor':
      return [{ kind: 'setCommentBoxFillColor', id, fillColor: settledColor(text, box.fillColor, dark) }]
    case 'textColor':
      return [{ kind: 'setCommentBoxTextColor', id, textColor: settledColor(text, box.textColor, dark) }]
    case 'strokeWidthPx':
      return number === undefined ? [] : [{ kind: 'setCommentBoxStrokeWidthPx', id, strokeWidthPx: number }]
    case 'fillTransparencyPercent':
      return number === undefined
        ? []
        : [{ kind: 'setCommentBoxFillTransparencyPercent', id, fillTransparencyPercent: number }]
    default:
      return []
  }
}

type BoxKey = Extract<FieldCommit['key'], { holder: 'commentBox' | 'highlightBox' }>

// see PR-21, PR-22, PR-23, PR-24, PR-25, PR-26, PR-27, PR-28, FR-019
/** @purity pure */
function commandFromBoxColumn(schedule: Schedule, key: BoxKey, text: string, dark: boolean): readonly DocumentCommand[] {
  const id = key.id
  if (key.holder === 'commentBox') {
    const held = schedule.commentBoxes.find((one) => one.id === id)
    return held === undefined ? [] : commandFromCommentBoxColumn(held, key.column, text, dark)
  }
  const box = schedule.highlightBoxes.find((held) => held.id === id)
  return box === undefined ? [] : commandFromHighlightBoxColumn(box, key.column, text, dark)
}

// see FR-009, CM-38, S-118, TX-3
// WHY: working days, or d / h / m with time of day; EditDocument turns them into the stored tenths of a minute (FR-009).
/** @purity pure */
function commandFromDependencyColumn(
  link: { readonly predecessorUid: number; readonly successorUid: number },
  column: string,
  text: string,
  context: InputContext,
): readonly DocumentCommand[] {
  if (column !== 'linkLag') return []
  const { predecessorUid, successorUid } = link
  if (context.document.documentSettings.isTimeOfDayVisible) {
    const typed = typedLengthOf(text, minutesPerWorkingDayOf(context.document.schedule.project))
    if (typed === undefined || typed === null) return []
    return [{ kind: 'setDependencyLag', predecessorUid, successorUid, lagMinutes: typed.minutes, lagUnit: typed.unit }]
  }
  const lagWorkingDays = settledNumber(text)
  if (lagWorkingDays === undefined || lagWorkingDays === null) return []
  return [{ kind: 'setDependencyLag', predecessorUid, successorUid, lagWorkingDays }]
}

type DependencyKey = Extract<FieldCommit['key'], { readonly holder: 'dependency' }>

/** @purity pure */
function commandFromDependencyField(key: DependencyKey, text: string, context: InputContext): readonly DocumentCommand[] {
  const dependency = taskByUid(context.document.schedule, key.successorUid)?.dependencies[key.ordinal]
  if (dependency === undefined) return []
  const link = { predecessorUid: dependency.predecessorUid, successorUid: key.successorUid }
  return commandFromDependencyColumn(link, key.column, text, context)
}

// TRAP: change with setThemeHue's range check in edit-project.ts; no generated bound of S-73 reaches here.
const LOWEST_HUE = 0
const HIGHEST_HUE = 359

const DECIMAL_DIGITS = /^[0-9]+$/

// see FR-041, CM-5, S-73
/** @purity pure */
function commandFromThemeHue(text: string): readonly DocumentCommand[] {
  if (!DECIMAL_DIGITS.test(text)) return []
  const hue = Number(text)
  if (hue < LOWEST_HUE || hue > HIGHEST_HUE) return []
  return [{ kind: 'setThemeHue', themeHue: hue }]
}

// see FR-131, CM-87
/** @purity pure */
function commandFromParentProgressTolerance(text: string): readonly DocumentCommand[] {
  const workingDays = settledNumber(text)
  if (workingDays === undefined || workingDays === null) return []
  return [{ kind: 'setParentProgressToleranceDays', parentProgressToleranceDays: workingDays }]
}

// see FR-046, CM-3, CM-4, WT-4
/** @purity pure */
function commandsFromStatusDate(text: string, context: InputContext): readonly DocumentCommand[] {
  const date = settledDay(text, (day) => textOfFinishSide(day, context.document.schedule.project))
  if (date === undefined) return []
  if (date === null) return [{ kind: 'clearStatusDate' }]
  return [{ kind: 'setStatusDate', statusDate: date }, ...statusLineCentered(context, date)]
}

// see FR-035, CM-1, FR-041, FR-131, FR-046
/** @purity pure */
function commandFromProjectColumn(column: string, text: string, context: InputContext): readonly DocumentCommand[] {
  if (column === 'themeHue') return commandFromThemeHue(text)
  if (column === 'parentProgressToleranceDays') return commandFromParentProgressTolerance(text)
  if (column === 'statusDate') return commandsFromStatusDate(text, context)
  if (column !== 'title') return []
  return [{ kind: 'setProjectTitle', title: text }]
}

type FitSpanColumn = 'fitSpanStart' | 'fitSpanFinish'

/** @purity pure */
function fitSpanTextOf(commit: FieldCommit, side: FitSpanColumn, settings: DocumentSettings): string {
  const isSide = (key: FieldCommit['key']): boolean => key.holder === 'documentSettings' && key.column === side
  const entrance = commit.entrances?.find((one) => isSide(one.key))
  if (entrance !== undefined) return entrance.text
  return isSide(commit.key) ? commit.text : (settings[side] ?? '')
}

// see FX-1, FX-5, CM-88, CM-89, UN-13
// WHY: one settle of the row is one command (DFC-2223); an emptied end clears the span (JDG-1626).
/** @purity pure */
function commandsFromFitSpan(commit: FieldCommit, settings: DocumentSettings): readonly DocumentCommand[] {
  const start = settledText(fitSpanTextOf(commit, 'fitSpanStart', settings))
  const finish = settledText(fitSpanTextOf(commit, 'fitSpanFinish', settings))
  if (start === null || finish === null) return [{ kind: 'clearFitSpan' }]
  if ([start, finish].some((one) => dayOf(one) === null)) return []
  return [{ kind: 'setFitSpan', fitSpanStart: start, fitSpanFinish: finish }]
}

/** @purity pure */
function shownSpanTextsOf(context: InputContext): { readonly start: string | null; readonly finish: string | null } {
  const shown = shownSpanOf(context.layout, context.regions.taskGroupArea)
  if (shown === null) return { start: null, finish: null }
  return { start: textOfDayStart(shown.start), finish: textOfDayEnd(shown.finish) }
}

// see CM-90, FX-4
/** @purity pure */
function commandsFromFitSpanFixed(text: string, context: InputContext): readonly DocumentCommand[] {
  const shown = shownSpanTextsOf(context)
  return [{ kind: 'setFitSpanFixed', isFitSpanFixed: settledTruth(text), shownStart: shown.start, shownFinish: shown.finish }]
}

// see CM-88, FX-7
/** @purity pure */
function commandsFromShownSpanCopy(context: InputContext): readonly DocumentCommand[] {
  const shown = shownSpanTextsOf(context)
  if (shown.start === null || shown.finish === null) return []
  return [{ kind: 'setFitSpan', fitSpanStart: shown.start, fitSpanFinish: shown.finish }]
}

const TASK_GROUP_TITLE_WIDTH_FLOOR = SETTINGS_CONSTANTS.taskGroupTitleIndent * SETTINGS_CONSTANTS.maxGroupDepth

// see WF-2, CM-67
// WHY: a value below S-79's floor or not whole writes nothing, so the field goes back to the stored width.
/** @purity pure */
function commandsFromTaskGroupTitleWidth(text: string): readonly DocumentCommand[] {
  const width = settledNumber(text)
  if (width === undefined || width === null || !Number.isInteger(width) || width < TASK_GROUP_TITLE_WIDTH_FLOOR) return []
  return [{ kind: 'setTaskGroupPanelWidthPx', taskGroupPanelWidthPx: width }]
}

// see FO-13, CM-97, FR-016, FR-158
/** @purity pure */
function commandsFromShowsTimeOfDay(text: string, context: InputContext): readonly DocumentCommand[] {
  const isTimeOfDayVisible = settledTruth(text)
  const set: DocumentCommand = { kind: 'setTimeOfDayVisible', isTimeOfDayVisible }
  const settings = context.document.documentSettings
  const ceiling = isTimeOfDayVisible ? null : zoomXCeiling(context, false)
  if (ceiling === null || settings.zoomX <= ceiling) return [set]
  return [set, { kind: 'setZoom', zoomX: ceiling, zoomY: settings.zoomY }]
}

// see FR-039, CM-74, CM-62, S-234, S-70, T-369
/** @purity pure */
function commandFromDocumentSettingsColumn(
  column: string,
  commit: FieldCommit,
  context: InputContext,
): readonly DocumentCommand[] {
  const text = commit.text
  const settings = context.document.documentSettings
  if (column === 'fitSpanStart' && text === FIT_SPAN_COPY_TEXT) return commandsFromShownSpanCopy(context)
  if (column === 'fitSpanStart' || column === 'fitSpanFinish') return commandsFromFitSpan(commit, settings)
  if (column === 'isFitSpanFixed') return commandsFromFitSpanFixed(text, context)
  if (column === 'isTaskGroupPanelWidthFixed') return [{ kind: 'setTaskGroupPanelWidthFixed', isTaskGroupPanelWidthFixed: settledTruth(text) }]
  if (column === 'isTimeOfDayVisible') return commandsFromShowsTimeOfDay(text, context)
  if (column === 'displayTimeZones') return commandsFromDisplayTimeZone(text, settings)
  if (column === 'taskGroupPanelWidthPx') return commandsFromTaskGroupTitleWidth(text)
  if (column === 'displayScale') {
    const scale = DISPLAY_SCALE_STEPS.find((step) => String(step) === text)
    return scale === undefined ? [] : [{ kind: 'setDisplayScale', displayScale: scale }]
  }
  if (column !== 'fontScale') return []
  const scale = FONT_SCALE_STEPS.find((step) => step === text)
  return scale === undefined ? [] : [{ kind: 'setFontScale', fontScale: scale }]
}

const FONT_SCALE_STEPS = Object.keys(SETTINGS_CONSTANTS.fontScaleSizes) as readonly DocumentSettings['fontScale'][]

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
  // TRAP: ask the roster: a uid gone since the list was drawn writes nothing.
  return schedule.resources.some((one) => one.uid === uid) ? uid : null
}

// see AS-5, AS-8
/** @purity pure */
function resourceUidOfCommit(schedule: Schedule, text: string, pick: FieldCommit['pick']): number | null {
  return pick === 'candidate' ? resourceUidOfChoice(schedule, text) : resourceUidOfName(schedule, text)
}

// see AS-3, AS-5, AS-7, AS-8, AS-9, AS-10, AS-12, T-225
/** @purity pure */
function commandsFromAssigneeField(
  schedule: Schedule,
  taskUid: number,
  seatedUid: number | null,
  text: string,
  pick: FieldCommit['pick'],
): readonly DocumentCommand[] {
  const settled = settledText(text)
  const onTask = new Set<number | null>(
    schedule.assignments.filter((one) => one.taskUid === taskUid).map((one) => one.resourceUid),
  )
  // TRAP: a line drawn before its person was taken off (UN-15) must write nothing: CM-45 refuses
  // a pair not held, and AG-3 then throws the whole bundle away.
  if (settled === null || (seatedUid !== null && !onTask.has(seatedUid))) return []
  const unseat: readonly DocumentCommand[] =
    seatedUid === null ? [] : [{ kind: 'deleteAssignment', taskUid, resourceUid: seatedUid }]
  if (settled === UNASSIGN_TOKEN) return unseat

  const held = pick === 'add' ? null : resourceUidOfCommit(schedule, settled, pick)
  if (held !== null) {
    return onTask.has(held) ? [] : [{ kind: 'createAssignment', taskUid, resourceUid: held }, ...unseat]
  }
  if (pick !== 'add') return []

  return [
    { kind: 'createResource', name: settled },
    {
      kind: 'createAssignment',
      taskUid,
      // TRAP: read before the bundle runs; it names the resource CM-40 makes only while nothing
      // ahead of CM-44 in this bundle but CM-40 issues a uid.
      resourceUid: nextIssuedUid(schedule),
    },
    ...unseat,
  ]
}

// see T-016, PR-3
/** @purity pure */
function commandFromTaskField(schedule: Schedule, uid: number, column: keyof Task, text: string,
                             isTimeOfDayVisible: boolean): readonly DocumentCommand[] {
  const task = taskByUid(schedule, uid)
  if (task === null) return []
  const milestoneDay = task.milestone === true ? commandFromMilestoneDay(task, column, text, schedule.project) : null
  return milestoneDay ?? commandFromTaskColumn(schedule, task, column, text, isTimeOfDayVisible)
}

// see PI-18, T-016
/** @purity pure */
export function commandFromFieldCommit(
  commit: FieldCommit,
  context: InputContext,
): readonly DocumentCommand[] {
  const schedule = context.document.schedule
  // see CV-4
  const dark = context.screen.themePreference === 'dark'
  // WHY: the column is the key the panel drew, not worked out again here: the selection may
  // have changed between drawing and commit.
  const key = commit.key

  switch (key.holder) {
    case 'task':
      return commandFromTaskField(schedule, key.uid, key.column, dataWallTextOf(commit.text, key.column, context),
        context.document.documentSettings.isTimeOfDayVisible)
    case 'taskVisual':
      return taskByUid(schedule, key.uid) === null
        ? []
        : commandFromVisualColumn(schedule, key.uid, key.column, commit.text, dark)
    case 'taskGroup': {
      const group = schedule.taskGroups.find((held) => held.id === key.taskGroupId)
      const text = key.column === MIN_HEIGHT_COLUMN ? minHeightTextOf(commit.text, key.taskGroupId, context) : commit.text
      return group === undefined || text === null ? [] : commandFromGroupColumn(group, key.column, text, dark)
    }
    case 'commentBox':
    case 'highlightBox':
      return commandFromBoxColumn(schedule, key, commit.text, dark)
    case 'dependency':
      return commandFromDependencyField(key, commit.text, context)
    case 'assignment':
      return taskByUid(schedule, key.taskUid) === null
        ? []
        : commandsFromAssigneeField(schedule, key.taskUid, key.resourceUid, commit.text, commit.pick)
    case 'project':
      return commandFromProjectColumn(key.column, commit.text, context)
    case 'documentSettings':
      return commandFromDocumentSettingsColumn(key.column, commit, context)
    default:
      return []
  }
}

// see TX-3, FR-156, S-574
// WHY: the panel shows a Task's date-time in the view base (properties-panel.ts), so a typed one goes back to the data's clock.
/** @purity pure */
function dataWallTextOf(text: string, column: keyof Task, context: InputContext): string {
  const settings = context.document.documentSettings
  const held = text.trim()
  const instant = settings.isTimeOfDayVisible && DATE_COLUMNS.Task.includes(column) ? typedInstantOf(held) : null
  const data = context.document.schedule.project.scheduleDataTimeZone
  const view = viewRegionOf(data, settings.viewTimeZone)
  if (instant === null || view === data) return text
  return textOfInstant(dataWallOfViewWall(zoneClockOf(data), zoneClockOf(view), instant))
}

// see FO-15, CM-96, S-575
/** @purity pure */
function commandsFromDisplayTimeZone(text: string, settings: DocumentSettings): readonly DocumentCommand[] {
  const at = text.indexOf(DISPLAY_TIME_ZONE_SLOT_SEPARATOR)
  const slot = Number(text.slice(0, at))
  if (at < 0 || !Number.isInteger(slot)) return []
  const slots = [0, 1, 2, 3].map((one) => settings.displayTimeZones[one] ?? '')
  slots[slot] = text.slice(at + 1)
  return [{ kind: 'setDisplayTimeZones', displayTimeZones: slots.filter((one) => one !== '') }]
}
