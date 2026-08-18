// SvgRenderer -- public entry of this folder.
//
// @unit      UF-32   (docs/spec/05-07-design.md, table T-075)
// @component SvgRenderer, layer Adapter (table T-062)
// @purity    pure
// @publishes table T-064 row PI-19
//
// Turns the geometry into an SVG string (FR-080). CP-19 names the component's
// responsibility; the shapes themselves are ScheduleGeometry's and are not
// recomputed here -- 表 T-068 LC-11 already made every vertex.
//
// ⭐ This unit reads `Schedule` as well as the geometry, and that edge is
// CR-185's: colour lives in the schedule-data group (themeHue is AT-19, which
// DR-5 keeps out of the presentation group) and the geometry carries none of
// it. 5.1 puts drawing on this side of the line -- "layoutEngine holds nothing
// past coordinates".
//
// Nothing outside this folder may import any other file in it
// (Chapter 5.3, MUST NOT), so every name the component publishes
// leaves through here.
//
// The seam declared in this folder is re-exported here because
// the layer that implements it may not reach past this file
// (Chapter 5.3, MUST).

import type { DocumentSettings } from '../../entity/document-model/document-settings/document-settings'
import type { Schedule } from '../../entity/document-model/schedule/schedule'
import type { Selection } from '../../entity/document-model/selection/selection'
import type {
  BarGeometry,
  Path,
  ScheduleGeometry,
} from '../../entity/layout-engine/schedule-geometry/schedule-geometry'
import type { ScreenRegions } from '../../entity/layout-engine/screen-regions/screen-regions'

export type { SvgSurface } from './svg-surface'

/**
 * How one bar is painted, once every override and the theme have been
 * resolved. Nothing here is stored: FR-041 forbids saving a derived colour.
 */
interface Paint {
  readonly stroke: string
  readonly fill: string
  readonly strokeWidth: number
}

/**
 * The saturation and lightness a hue is drawn at.
 *
 * ⛔ NOT in the specification. `_assets/tbl-settings.md` §5 states the rule in
 * words -- "for each hue, a ground as dark as it goes before the contrast rule
 * breaks" -- and gives no numbers, and FR-041 forbids storing what is derived.
 * So the pair below is this unit's, chosen to sit near the measured hue 214
 * without claiming to be the measurement.
 *
 * ⭐ Class C of docs/development-rules/06-pending-decisions.md: display only,
 * no trace in the saved form, so the cost of overturning it is this one file.
 *
 * @provisional PD-1
 */
const PLAN_SATURATION = 62
const PLAN_LIGHTNESS = 46
const ACTUAL_LIGHTNESS = 30

/**
 * The colours FR-041 fixes and forbids the document to hold: a dependency and
 * a progress line share one, and an annotation takes another that is kept away
 * from the hue, so the two never read as schedule content (FR-019).
 *
 * @provisional PD-1
 */
const LINK_COLOUR = '#6b7280'
const ANNOTATION_COLOUR = '#b45309'

/** @purity pure */
function escaped(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** @purity pure */
function rounded(value: number): string {
  // Two places. FR-080's WY-3 compares the picture against the screen after a
  // rounding rule is applied to BOTH sides, so what matters is that this one
  // is stated somewhere rather than which one it is.
  return (Math.round(value * 100) / 100).toString()
}

/** @purity pure */
function pointsOf(path: Path): string {
  return path.map((one) => `${rounded(one.x)},${rounded(one.y)}`).join(' ')
}

/**
 * Grey of the same lightness, for FR-041's monochrome. Applied when drawing
 * and never to the stored value -- `themeMonochrome` "does not change what is
 * saved" (tbl-settings.md §5).
 *
 * @purity pure
 */
function greyOf(lightness: number): string {
  return `hsl(0 0% ${lightness}%)`
}

/** @purity pure */
function hueColour(hue: number, lightness: number, monochrome: boolean): string {
  return monochrome ? greyOf(lightness) : `hsl(${hue} ${PLAN_SATURATION}% ${lightness}%)`
}

/**
 * FR-007: what the author chose wins over the theme, and what they left alone
 * follows it (FR-041). ⚠️ A chosen colour is NOT greyed away -- the requirement
 * says monochrome takes effect when drawing, so it applies to both.
 *
 * @purity pure
 */
function paintOf(
  chosenStroke: string | null,
  chosenFill: string | null,
  hue: number,
  lightness: number,
  monochrome: boolean,
  strokeWidth: number,
): Paint {
  const themed = hueColour(hue, lightness, monochrome)
  const stroke = chosenStroke === null ? themed : chosenStroke
  const fill = chosenFill === null ? themed : chosenFill
  return {
    stroke: monochrome && chosenStroke !== null ? greyOf(lightness) : stroke,
    fill: monochrome && chosenFill !== null ? greyOf(lightness) : fill,
    strokeWidth,
  }
}

/** @purity pure */
function barSvg(bar: BarGeometry, paint: Paint): string {
  if (bar.form === 'outline') {
    return (
      `<polygon points="${pointsOf(bar.points)}" fill="${paint.fill}"` +
      ` stroke="${paint.stroke}" stroke-width="${rounded(paint.strokeWidth)}"/>`
    )
  }
  const line =
    `<line x1="${rounded(bar.from.x)}" y1="${rounded(bar.from.y)}"` +
    ` x2="${rounded(bar.to.x)}" y2="${rounded(bar.to.y)}"` +
    ` stroke="${paint.stroke}" stroke-width="${rounded(bar.strokeWidth)}"/>`
  const head =
    bar.head === null
      ? ''
      : `<polygon points="${pointsOf(bar.head)}" fill="${paint.stroke}"/>`
  const dots = bar.dots
    .map(
      (dot) =>
        `<circle cx="${rounded(dot.at.x)}" cy="${rounded(dot.at.y)}"` +
        ` r="${rounded(dot.radius)}" fill="${paint.stroke}"/>`,
    )
    .join('')
  return line + head + dots
}

/**
 * The SVG for one frame (FR-080).
 *
 * ⭐ Every coordinate arrives already computed: ADR-001 has the shell run
 * table T-068 once per frame and hand the result to everyone who needs it, so
 * this unit measures nothing. ⚠️ That is why the layout itself is not an
 * argument -- everything this file draws is a vertex ScheduleGeometry made,
 * and the only size it needs is the screen's.
 *
 * @purity pure
 */
export function svgFromSchedule(
  schedule: Schedule,
  settings: DocumentSettings,
  geometry: ScheduleGeometry,
  regions: ScreenRegions,
  selection: Selection,
): string {
  const hue = schedule.project.themeHue
  const monochrome = settings.themeMonochrome
  const visualOf = new Map(schedule.taskVisuals.map((one) => [one.taskUid, one]))
  const selected = new Set(
    selection.items.filter((one) => one.kind === 'task').map((one) => one.uid),
  )

  const parts: string[] = []

  // Dependencies first: ZO-4 of table T-020 puts them under the bars, and the
  // order things are written in an SVG IS the stacking order.
  for (const link of geometry.dependencies) {
    parts.push(
      `<polyline points="${pointsOf(link.points)}" fill="none"` +
        ` stroke="${LINK_COLOUR}" stroke-width="${rounded(settings.dependencyWidth)}"/>`,
    )
  }

  for (const task of geometry.tasks) {
    const visual = visualOf.get(task.taskUid)
    const plan = paintOf(
      visual?.strokeColor ?? null,
      visual?.fillColor ?? null,
      hue,
      PLAN_LIGHTNESS,
      monochrome,
      settings.planStroke,
    )
    // The actual bar takes the same hue a step darker, so plan and actual read
    // as one task. Table T-019a's five states are the geometry's business, not
    // this unit's -- it is handed whichever bars exist.
    const actual = paintOf(
      visual?.strokeColor ?? null,
      visual?.fillColor ?? null,
      hue,
      ACTUAL_LIGHTNESS,
      monochrome,
      settings.planStroke,
    )
    if (task.plan !== null) parts.push(barSvg(task.plan, plan))
    if (task.actual !== null) parts.push(barSvg(task.actual, actual))
    if (selected.has(task.taskUid) && task.plan?.form === 'outline') {
      // FR-030: never carry meaning by colour alone, so the selected task
      // gains an outline of its own rather than a different fill.
      parts.push(
        `<polygon points="${pointsOf(task.plan.points)}" fill="none"` +
          ` stroke="${LINK_COLOUR}" stroke-width="2" stroke-dasharray="3 2"/>`,
      )
    }
  }

  if (geometry.progressLine.length > 0) {
    parts.push(
      `<polyline points="${pointsOf(geometry.progressLine)}" fill="none"` +
        ` stroke="${LINK_COLOUR}" stroke-width="${rounded(settings.progressLineWidth)}"/>`,
    )
  }

  const status = geometry.statusLine
  if (status !== null) {
    parts.push(
      `<line x1="${rounded(status.x)}" y1="${rounded(status.top)}"` +
        ` x2="${rounded(status.x)}" y2="${rounded(status.bottom)}"` +
        ` stroke="${LINK_COLOUR}" stroke-width="1"/>`,
    )
  }

  for (const box of geometry.highlightBoxes) {
    parts.push(
      `<rect x="${rounded(box.box.x)}" y="${rounded(box.box.y)}"` +
        ` width="${rounded(box.box.width)}" height="${rounded(box.box.height)}"` +
        ` fill="none" stroke="${ANNOTATION_COLOUR}" stroke-width="1"/>`,
    )
  }

  // FR-080 makes the picture "the whole screen GRS occupies" -- not the
  // content. Sizing it to layout.contentWidth put every shape outside the box,
  // because the coordinates ScheduleGeometry hands over are screen ones and
  // start at the Row Area's own x. ⚠️ Found by looking at the real DOM; the
  // types and the tests were both happy with the wrong size.
  const width = Math.max(1, regions.scheduleCanvas.x + regions.scheduleCanvas.width)
  const height = Math.max(1, regions.scheduleCanvas.y + regions.scheduleCanvas.height)
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${rounded(width)}"` +
    ` height="${rounded(height)}" viewBox="0 0 ${rounded(width)} ${rounded(height)}"` +
    ` role="img" aria-label="${escaped(schedule.project.title ?? '')}">` +
    parts.join('') +
    '</svg>'
  )
}
