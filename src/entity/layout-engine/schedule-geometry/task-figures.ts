// ScheduleGeometry -- the figures of one task: its shapes, label boxes, marker, resume icon, dummies and fade handles (FR-043).
// @unit      UF-144  (docs/spec/05-07-design.md, table T-075)
// @component ScheduleGeometry, layer layoutEngine (table T-062)
// @purity    pure

import type { DocumentSettings } from '../../document-model/document-settings/document-settings'
import {
  dayOf,
  isDelayed,
  lastDayForLength,
  planActualState,
  textOfDay,
  type CalendarDay,
  type Task,
} from '../../document-model/schedule/schedule'
import {
  NOT_STORED_LABEL_SIZES,
  assigneeAnchorOf,
  dummyBandOf,
  labelLayoutOf,
  labelReferenceOf,
  markerDiameterOf,
  outwardStartOf,
  xFromDay,
  type LabelLayout,
  type LabelReference,
  type MilestoneGlyph,
  type ShapeKind,
  type TaskPlacement,
} from '../schedule-layout/schedule-layout'
import { displayRatioOf, type ScreenRect } from '../screen-regions/screen-regions'
import { guidesOf } from './plan-actual-guides'
import {
  point,
  type BarGeometry,
  type DummyGeometry,
  type GeometryInputs,
  type MarkerGeometry,
  type Path,
  type Point,
  type ProgressSymbol,
  type ResumeGeometry,
  type TaskGeometry,
} from './schedule-geometry'

// see T-012a
/** @purity pure */
function fadedOutline(x0: number, x1: number, top: number, height: number,
                      fadeIn: number, fadeOut: number): Path {
  const bottom = top + height
  return [
    point(x0, bottom),
    point(x1 - fadeOut, bottom),
    point(x1, top),
    point(x0 + fadeIn, top),
  ]
}

// see GA-7, GA-8, FD-4, FD-5
/** @purity pure */
function fadeHandlePoints(placed: TaskPlacement, planTop: number): readonly Point[] {
  return [
    point(placed.x + placed.fadeInPx, planTop),
    point(placed.x + placed.width - placed.fadeOutPx, planTop + placed.planHeight),
  ]
}

// see LF-6
/** @purity pure */
function chevronNotch(width: number, height: number, settings: DocumentSettings): number {
  return Math.min(width * settings.chevronNotchOfWidth, height * settings.chevronNotchOfHeight)
}

// see SH-2, FD-5
/** @purity pure */
function chevronOutline(x0: number, x1: number, top: number, height: number,
                        startNotch: number, endTip: number): Path {
  const middle = top + height / 2
  const bottom = top + height
  return [
    point(x0, top),
    point(x1 - endTip, top),
    point(x1, middle),
    point(x1 - endTip, bottom),
    point(x0, bottom),
    point(x0 + startNotch, middle),
  ]
}

// see FD-5, LF-6
// TRAP: each end from its own fade; one fade must never reshape the other end (FD-5 MUST NOT).
/** @purity pure */
function chevronBarOf(placed: TaskPlacement, x0: number, x1: number, top: number, height: number,
                      fade: { readonly fadeIn: number; readonly fadeOut: number },
                      isActual: boolean, settings: DocumentSettings): BarGeometry {
  const planNotch = chevronNotch(placed.width, placed.planHeight, settings)
  const unfaded = isActual ? planNotch * settings.actualOfPlan : planNotch
  const startNotch = fade.fadeIn > 0 ? fade.fadeIn : unfaded
  const endTip = fade.fadeOut > 0 ? fade.fadeOut : unfaded
  return { form: 'outline', points: chevronOutline(x0, x1, top, height, startNotch, endTip) }
}

/** @purity pure */
function regularCorners(
  centre: Point,
  radius: number,
  count: number,
  startTurn: number,
): Path {
  const out: Point[] = []
  for (let step = 0; step < count; step += 1) {
    const turn = startTurn + step / count
    const angle = turn * 2 * Math.PI
    out.push(point(centre.x + radius * Math.sin(angle), centre.y - radius * Math.cos(angle)))
  }
  return out
}

const CIRCLE_CORNERS = 24

/** @purity pure */
function share(centre: Point, half: number, u: number, v: number): Point {
  return point(centre.x + half * u, centre.y + half * v)
}

/** @purity pure */
function shares(centre: Point, half: number, pairs: readonly (readonly [number, number])[]): Path {
  return pairs.map(([u, v]) => share(centre, half, u, v))
}

const PICTORIAL: Readonly<Record<string, {
  readonly body: readonly (readonly [number, number])[]
  readonly marks: readonly (readonly (readonly [number, number])[])[]
}>> = {
  file: {
    body: [[-0.62, -1], [0.24, -1], [0.62, -0.6], [0.62, 1], [-0.62, 1]],
    marks: [[[0.24, -1], [0.62, -0.6], [0.24, -0.6]]],
  },
  box: {
    body: [[-0.8, -0.45], [0, -0.9], [0.8, -0.45], [0.8, 0.55], [0, 1], [-0.8, 0.55]],
    marks: [[[-0.8, -0.45], [0, -0.9], [0.8, -0.45], [0, 0]]],
  },
  floppyDisk: {
    body: [[-0.85, -0.85], [0.55, -0.85], [0.85, -0.55], [0.85, 0.85], [-0.85, 0.85]],
    marks: [
      [[-0.35, -0.85], [0.25, -0.85], [0.25, -0.3], [-0.35, -0.3]],
      [[-0.55, 0.2], [0.55, 0.2], [0.55, 0.85], [-0.55, 0.85]],
    ],
  },
  cylinder: {
    body: [
      [-0.7, -0.75], [-0.35, -0.95], [0.35, -0.95], [0.7, -0.75],
      [0.7, 0.75], [0.35, 0.95], [-0.35, 0.95], [-0.7, 0.75],
    ],
    marks: [],
  },
  person: {
    body: [
      [-0.85, 1], [-0.85, 0.45], [-0.6, 0.05], [-0.25, -0.1],
      [-0.36, -0.3], [-0.36, -0.62], [0, -0.95], [0.36, -0.62],
      [0.36, -0.3], [0.25, -0.1], [0.6, 0.05], [0.85, 0.45], [0.85, 1],
    ],
    marks: [],
  },
  smile: {
    body: [],
    marks: [
      [[-0.46, -0.3], [-0.24, -0.3], [-0.24, -0.02], [-0.46, -0.02]],
      [[0.24, -0.3], [0.46, -0.3], [0.46, -0.02], [0.24, -0.02]],
      [[-0.52, 0.18], [0, 0.62], [0.52, 0.18], [0.52, 0.38], [0, 0.82], [-0.52, 0.38]],
    ],
  },
  beerMug: {
    body: [
      [-0.8, -0.7], [0.3, -0.7], [0.3, -0.35], [0.8, -0.35],
      [0.8, 0.35], [0.3, 0.35], [0.3, 0.95], [-0.8, 0.95],
    ],
    marks: [[[0.44, -0.18], [0.66, -0.18], [0.66, 0.18], [0.44, 0.18]]],
  },
}

/** @purity pure */
function milestoneMarks(centre: Point, side: number, glyph: MilestoneGlyph): readonly Path[] {
  const drawn = PICTORIAL[glyph]
  if (drawn === undefined) return []
  return drawn.marks.map((one) => shares(centre, side / 2, one))
}

/** @purity pure */
function milestoneOutline(
  centre: Point,
  side: number,
  glyph: MilestoneGlyph,
  starInnerOfOuter: number,
): Path {
  const half = side / 2
  const drawn = PICTORIAL[glyph]
  if (drawn !== undefined) {
    return drawn.body.length === 0
      ? regularCorners(centre, half, CIRCLE_CORNERS, 0)
      : shares(centre, half, drawn.body)
  }
  switch (glyph) {
    case 'circle':
      return regularCorners(centre, half, CIRCLE_CORNERS, 0)
    case 'hexagon':
      return regularCorners(centre, half, 6, 0)
    case 'pentagon':
      return regularCorners(centre, half, 5, 0)
    case 'square':
      return regularCorners(centre, half, 4, 0.125)
    case 'triangleUp':
      return regularCorners(centre, half, 3, 0)
    case 'triangleDown':
      return regularCorners(centre, half, 3, 0.5)
    case 'star': {
      const inner = half * starInnerOfOuter
      const outer = regularCorners(centre, half, 5, 0)
      const waist = regularCorners(centre, inner, 5, 0.1)
      const out: Point[] = []
      for (let step = 0; step < 5; step += 1) {
        out.push(outer[step]!, waist[step]!)
      }
      return out
    }
    case 'diamond':
    default:
      return regularCorners(centre, half, 4, 0)
  }
}

// see XS-5, XS-6
// TRAP: repeats lineBar's XS-5 head height and XS-5 dot size; change both together.
/** @purity pure */
function lineEndHalfHeight(kind: 'arrow' | 'endpointSpan', settings: DocumentSettings): number {
  return (kind === 'arrow' ? settings.thinArrowHeadHeight : settings.spanDotSize) / 2
}

// see LF-7, LF-8, XS-5
/** @purity pure */
function lineBar(kind: ShapeKind, x0: number, x1: number, middle: number,
                 settings: DocumentSettings): BarGeometry {
  const stroke = settings.thinStrokeWidth
  if (kind === 'arrow') {
    // TRAP: the head's length is capped by the span, its height never is: XS-5 holds the tiers still.
    const length = Math.min(settings.thinArrowHeadLength, (x1 - x0) * settings.arrowHeadOfSpan)
    const half = lineEndHalfHeight('arrow', settings)
    return {
      form: 'line',
      from: point(x0, middle),
      to: point(x1 - length, middle),
      strokeWidth: stroke,
      head: [
        point(x1, middle),
        point(x1 - length, middle - half),
        point(x1 - length, middle + half),
      ],
      dots: [],
    }
  }
  const radius = lineEndHalfHeight('endpointSpan', settings)
  return {
    form: 'line',
    from: point(x0, middle),
    to: point(x1, middle),
    strokeWidth: stroke,
    head: null,
    dots: [{ at: point(x0, middle), radius }, { at: point(x1, middle), radius }],
  }
}

// see T-012
/** @purity pure */
export function isThinShape(shapeKind: ShapeKind): boolean {
  return shapeKind === 'arrow' || shapeKind === 'endpointSpan'
}

// see XS-4, XS-5, XS-6, XS-7
// TRAP: shape-cross-sections.ts reserves the same three tiers (shapeHeightOf, labelLiftOf); change them together.
/** @purity pure */
export function thinTierMiddle(placed: TaskPlacement, settings: DocumentSettings,
                        isActual: boolean): number {
  const stroke = settings.thinStrokeWidth
  const planMiddle = placed.y + stroke / 2
  return isActual ? planMiddle + stroke + settings.actualGap : planMiddle
}

/** @purity pure */
function barOf(inputs: GeometryInputs, placed: TaskPlacement, x0: number, x1: number,
               top: number, height: number, isActual: boolean): BarGeometry {
  const settings = inputs.settings
  const kind = placed.shapeKind
  if (kind === 'milestone') {
    const glyph = placed.milestoneGlyph
    return {
      form: 'outline',
      points: milestoneOutline(
        point((x0 + x1) / 2, top + height / 2),
        height,
        glyph,
        settings.starInnerOfOuter,
      ),
      marks: milestoneMarks(point((x0 + x1) / 2, top + height / 2), height, glyph),
    }
  }
  if (kind === 'arrow' || kind === 'endpointSpan') {
    // TRAP: the tier, never top + height / 2: XS-5 and XS-6 stack the two lines by their own edges.
    return lineBar(kind, x0, x1, thinTierMiddle(placed, settings, isActual), settings)
  }
  // TRAP: read the plan's fades off the placement, never clamp again: LC-6 judged the fit with these numbers.
  const fade = isActual
    ? { fadeIn: 0, fadeOut: 0 }
    : { fadeIn: placed.fadeInPx, fadeOut: placed.fadeOutPx }
  if (kind === 'chevron') return chevronBarOf(placed, x0, x1, top, height, fade, isActual, settings)
  return { form: 'outline', points: fadedOutline(x0, x1, top, height, fade.fadeIn, fade.fadeOut) }
}

// see RV-5
/** @purity pure */
function progressSymbolOf(task: Task, statusDate: CalendarDay | null): ProgressSymbol {
  if (isDelayed(task, statusDate)) return 'PM-4'
  switch (planActualState(task)) {
    case 'finished':
      return 'PM-2'
    case 'suspendedResumeUnknown':
    case 'suspendedResumePlanned':
      return 'PM-3'
    case 'notStarted':
      return 'PM-1a'
    case 'inProgress':
      return 'PM-1'
  }
}

// see RF-1, RF-3
/** @purity pure */
function drawnReferenceOf(inputs: GeometryInputs, placed: TaskPlacement): LabelReference {
  const settings = inputs.settings
  const plan = { x: placed.x, width: placed.width }
  const fade = { fadeIn: placed.fadeInPx, fadeOut: placed.fadeOutPx }
  if (!inputs.showActual) return labelReferenceOf(placed.shapeKind, plan, fade, null, settings)
  const diameter = markerDiameterOf(placed.shapeKind, placed.labelFontSize, settings)
  const band = placed.actualX === null
    ? dummyBandOf(placed.shapeKind, plan, diameter)
    : { x: placed.actualX, width: placed.actualWidth }
  return labelReferenceOf(placed.shapeKind, plan, fade, band, settings)
}

// see LP-1, LP-2, LP-3, LP-4, LP-5, LP-6, LP-7, LP-8
/** @purity pure */
function drawnLabelLayoutOf(inputs: GeometryInputs, task: Task,
                            placed: TaskPlacement): LabelLayout {
  const settings = inputs.settings
  const reference = drawnReferenceOf(inputs, placed)
  const diameter = markerDiameterOf(placed.shapeKind, placed.labelFontSize, settings)
  return labelLayoutOf(
    placed.shapeKind,
    reference,
    placed.labelTextWidth,
    diameter,
    settings.progressMarkerVisible,
    outwardStartOf(reference.x + reference.width, task, placed.shapeKind, diameter),
    settings,
  )
}

// see XS-3, XS-4
/** @purity pure */
function labelTierMiddleOf(placed: TaskPlacement, settings: DocumentSettings): number {
  if (placed.shapeKind !== 'arrow' && placed.shapeKind !== 'endpointSpan') {
    return placed.y + placed.planHeight / 2
  }
  return labelTopOf(settings, placed, placed.labelFontSize) + placed.labelFontSize / 2
}

// see LF-11, XS-3, XS-4
/** @purity pure */
function markerOf(inputs: GeometryInputs, task: Task,
                  placed: TaskPlacement): MarkerGeometry | null {
  const settings = inputs.settings
  if (!settings.progressMarkerVisible) return null
  const markerLeft = drawnLabelLayoutOf(inputs, task, placed).markerLeft
  if (markerLeft === null) return null
  const radius = markerDiameterOf(placed.shapeKind, placed.labelFontSize, settings) / 2
  return {
    symbol: progressSymbolOf(task, inputs.statusDate),
    centre: point(markerLeft + radius, labelTierMiddleOf(placed, settings)),
    radius,
  }
}

// see LF-13, XS-10, XS-12, S-25
/** @purity pure */
function resumeOf(inputs: GeometryInputs, task: Task, placed: TaskPlacement,
                  settings: DocumentSettings): ResumeGeometry {
  const valid = task.resumeValid !== false
  const diameter = markerDiameterOf(placed.shapeKind, placed.labelFontSize, settings)
  const resumeDay = dayOf(task.resume)
  const undecided = resumeDay === null
  const side = diameter * (valid && !undecided ? 1 : settings.resumeScaleInvalid)
  const stopX = placed.actualX === null ? placed.x : placed.actualX + placed.actualWidth
  const x = resumeDay === null ? stopX : xFromDay(inputs.layout, resumeDay)
  const middle = isThinShape(placed.shapeKind)
    ? thinTierMiddle(placed, settings, true)
    : labelTierMiddleOf(placed, settings)
  const arm = side * settings.resumeArmOfMarker
  const head = side * settings.resumeHeadOfMarker
  return {
    // TRAP: the stem follows `side`, not the diameter; an undecided resume shrinks the
    // whole drawn icon by S-25, while GA-20 keeps `box` below at the marker's diameter.
    arm: [point(x, middle + side / 2), point(x, middle), point(x + arm, middle)],
    head: [
      point(x + arm, middle - head),
      point(x + arm + head, middle),
      point(x + arm, middle + head),
    ],
    valid,
    box: { x, y: middle - diameter / 2, width: diameter, height: diameter },
    dash: undecided ? [] : [point(stopX, middle), point(x, middle)],
    undecided,
  }
}

/** @purity pure */
function dummyFromOf(inputs: GeometryInputs, startText: string | null): CalendarDay | null {
  const key = startText ?? ''
  const held = inputs.dummyFromByStart.get(key)
  if (held !== undefined) return held
  // WHY: the plan start itself, not the working day after it: the mark stands where the actual would start (DM-1).
  const made = dayOf(startText)
  inputs.dummyFromByStart.set(key, made)
  return made
}

// TRAP: keyed by textOfDay, since two equal CalendarDay records are not one Map key.
/** @purity pure */
function dummyEndOf(inputs: GeometryInputs, from: CalendarDay): CalendarDay {
  const key = textOfDay(from)
  const held = inputs.dummyEndByFrom.get(key)
  if (held !== undefined) return held
  // WHY: the last day the writer puts (edit-task.ts), not the half-open end: a one-day dummy ends on its own day (JDG-15).
  const made = lastDayForLength(inputs.within, from, inputs.settings.actualInitialDuration)
  inputs.dummyEndByFrom.set(key, made)
  return made
}

// see FR-043, T-240
/** @purity pure */
function dummiesOf(inputs: GeometryInputs, task: Task, placed: TaskPlacement,
                   actualHeight: number): readonly DummyGeometry[] {
  // TRAP: empties only what is drawn and grabbed; the room stays in the layout's dummyReach (DM-14, FR-049).
  if (!inputs.showActual || placed.actualX !== null) return []
  const from = dummyFromOf(inputs, task.start)
  if (from === null) return []
  const fromX = xFromDay(inputs.layout, from)
  const planMiddle = placed.y + placed.planHeight / 2

  if (placed.actualPlacement === 'sideways') {
    // WHY: the same box and barOf call as a same-day actual milestone in taskGeometryOf (DM-12, FR-043).
    const side = actualHeight
    const ink: ScreenRect = {
      x: fromX - side / 2,
      y: planMiddle - side / 2,
      width: side,
      height: side,
    }
    const figure = barOf(inputs, placed, ink.x, ink.x + side, ink.y, side, true)
    return [{ grab: 'GA-17', at: point(fromX, planMiddle), ink, figure }]
  }

  // TRAP: schedule-layout.ts counts the same width into dummyReach (dummyInkWidthOf); change both together.
  const width = Math.min(
    markerDiameterOf(placed.shapeKind, placed.labelFontSize, inputs.settings) * NOT_STORED_DUMMY_SIZES['S-247'],
    NOT_STORED_DUMMY_SIZES['S-180'],
  )
  const thin = isThinShape(placed.shapeKind)
  const band = thin ? inputs.settings.thinStrokeWidth : actualHeight
  // TRAP: the band follows actualPlacement (LF-9); the plan's mid-line would put an SH-3 / SH-4 dummy on the plan line.
  const middle = thin
    ? thinTierMiddle(placed, inputs.settings, true)
    : planMiddle
  const top = middle - band / 2
  // TRAP: every dummy of one Task shares this ink; item-hit-area.ts reads the first one only.
  const ink: ScreenRect = { x: fromX, y: top, width, height: band }
  // WHY: one barOf call shared by both dummies: the mark is a one-day actual's shape (DM-2, DM-4).
  const figure = barOf(inputs, placed, fromX, fromX + width, top, band, true)
  const end = dummyEndOf(inputs, from)
  return [
    { grab: thin ? 'GA-21' : 'GA-5', at: point(fromX, middle), ink, figure },
    { grab: thin ? 'GA-22' : 'GA-6', at: point(xFromDay(inputs.layout, end), middle), ink, figure },
  ]
}

// see T-012, OC-10, XS-4
/** @purity pure */
function labelTopOf(settings: DocumentSettings, placed: TaskPlacement, height: number): number {
  if (!isThinShape(placed.shapeKind)) return placed.y + (placed.height - height) / 2
  // see DS-3
  const lift = NOT_STORED_LABEL_SIZES['S-196'] * displayRatioOf(settings)
  return placed.y - lift - height
}

// see GR-10, LC-6, LP-1, LP-3
// TRAP: use placed.labelFontSize, never a fresh formula: LC-5 measured with it, and FR-094's floors disagree.
/** @purity pure */
function labelBoxOf(inputs: GeometryInputs, task: Task, placed: TaskPlacement): ScreenRect | null {
  if (placed.label === '') return null
  const height = placed.labelFontSize
  return {
    x: drawnLabelLayoutOf(inputs, task, placed).nameX,
    y: labelTopOf(inputs.settings, placed, height),
    width: placed.labelTextWidth,
    height,
  }
}

// see OC-2, FR-090, XS-3, XS-4, XS-8, SH-5, F-024
/** @purity pure */
function outsideLabelBoxOf(inputs: GeometryInputs, placed: TaskPlacement): ScreenRect | null {
  if (placed.outsideLabel === '') return null
  const settings = inputs.settings
  const height = placed.labelFontSize
  const width = placed.outsideLabelWidth
  const drawnStart = inputs.showActual && placed.actualX !== null
    ? Math.min(placed.x, placed.actualX)
    : placed.x
  const anchor = assigneeAnchorOf(
    placed.shapeKind,
    drawnReferenceOf(inputs, placed),
    drawnStart,
    settings,
  )
  return {
    x: anchor - settings.assigneeLabelGap - width,
    y: labelTierMiddleOf(placed, settings) - height / 2,
    width,
    height,
  }
}

/** @purity pure */
export function taskGeometryOf(inputs: GeometryInputs, task: Task, placed: TaskPlacement): TaskGeometry {
  const settings = inputs.settings
  const actualHeight = placed.planHeight * settings.actualOfPlan
  const planTop = placed.y

  const plan = inputs.showPlan
    ? barOf(inputs, placed, placed.x, placed.x + placed.width, planTop, placed.planHeight, false)
    : null

  let actual: BarGeometry | null = null
  if (inputs.showActual && placed.actualX !== null) {
    const x0 = placed.actualX
    if (placed.actualPlacement === 'sideways') {
      const side = placed.planHeight * settings.actualOfPlan
      const top = planTop + (placed.planHeight - side) / 2
      actual = barOf(inputs, placed, x0 - side / 2, x0 + side / 2, top, side, true)
    } else {
      const top = placed.actualPlacement === 'inside'
        ? planTop + (placed.planHeight - actualHeight) / 2
        : planTop + placed.planHeight + settings.actualGap
      actual = barOf(inputs, placed, x0, x0 + placed.actualWidth, top, actualHeight, true)
    }
  }

  const dummies = dummiesOf(inputs, task, placed, actualHeight)
  const marker = markerOf(inputs, task, placed)
  const outsideLabel = outsideLabelBoxOf(inputs, placed)
  const state = planActualState(task)
  const suspended = state === 'suspendedResumePlanned' || state === 'suspendedResumeUnknown'

  return {
    taskUid: placed.taskUid,
    shapeKind: placed.shapeKind,
    plan,
    actual,
    milestoneFigure:
      placed.shapeKind === 'milestone'
        ? barOf(inputs, placed, placed.x, placed.x + placed.width, planTop, placed.planHeight, true)
        : null,
    planEndsStandOnOneDay: placed.planEndsStandOnOneDay,
    guides: guidesOf(inputs, task, placed, actualHeight),
    marker,
    // WHY: follows the state, not the symbol: a late suspended Task shows PM-4 and is still suspended.
    resume:
      marker !== null && suspended && inputs.showActual && placed.shapeKind !== 'milestone'
        ? resumeOf(inputs, task, placed, settings)
        : null,
    dummies,
    // TRAP: gate on the selection here, not only when drawing: itemAtPointer asks GA-7 / GA-8 of every Task
    // before GA-1 / GA-2, so handles on an unselected Task swallow a neighbour's plan-bar end.
    fadeHandles:
      placed.actualPlacement === 'inside' && inputs.selectedTaskUids.has(placed.taskUid)
        ? fadeHandlePoints(placed, planTop)
        : [],
    label: labelBoxOf(inputs, task, placed),
    assigneeLabel: outsideLabel,
  }
}

// <generated -- do not edit by hand>
// Single source of truth:
//   docs/spec/_source/settings.json (table T-206)
// Rebuild: npm run gen   ||   npm run gen:check fails on drift.
// see T-206
export const NOT_STORED_DUMMY_SIZES: {
  readonly 'S-180': number
  readonly 'S-247': number
} = {
  'S-180': 30,
  'S-247': 0.5,
}
// </generated>
