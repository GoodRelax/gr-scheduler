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
  MarkerGeometry,
  Path,
  ScheduleGeometry,
} from '../../entity/layout-engine/schedule-geometry/schedule-geometry'
import type { ScheduleLayout } from '../../entity/layout-engine/schedule-layout/schedule-layout'
import type { ScreenRect, ScreenRegions } from '../../entity/layout-engine/screen-regions/screen-regions'

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
 * The saturation, and the plan and actual lightness, per theme.
 *
 * ⛔ The NUMBERS are not in the specification: `_assets/tbl-settings.md` §5
 * states the rule in words -- "for each hue, a ground as dark as it goes
 * before the contrast rule breaks" -- and FR-041 forbids storing what is
 * derived. ⭐ But the CONSTRAINT is: table T-017a's CT-3 makes 実績 ÷ 予定 at
 * least 3 : 1, and FR-007 turns that table into a MUST.
 *
 * ⭐ These pairs were chosen by measuring: each meets CT-3 at every hue (worst
 * 3.94 : 1 light, 3.42 : 1 dark), and each lands on the ratio §5 records as
 * measured at hue 214 -- 4.81 : 1 light, 3.74 : 1 dark.
 *
 * ⚠️ The first pair written here did NOT meet CT-3 (1.79 : 1). It was caught by
 * a test written from the specification alone, which is what rule 04 of
 * docs/development-rules exists for.
 *
 * ⭐ Class C of 06-pending-decisions.md: display only, no trace in the saved
 * form, so the cost of overturning it is this one file.
 *
 * @provisional PD-1
 */
const PLAN_SATURATION = 62
const THEME_LIGHTNESS = {
  light: { plan: 72, actual: 27 },
  dark: { plan: 60, actual: 23 },
} as const

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

/** The lightness pair the saved theme asks for. @purity pure */
function lightnessOf(settings: DocumentSettings): { plan: number; actual: number } {
  return THEME_LIGHTNESS[settings.themePreference === 'dark' ? 'dark' : 'light']
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

/**
 * ZO-3's marker. ⭐ Table T-020 says it carries an opaque backing, so the
 * circle is filled rather than hollow -- it sits over the bars and a hollow
 * one would read as part of whatever shows through.
 *
 * ⚠️ The five symbols of table T-021 are drawn as strokes inside that circle.
 * ⛔ Their exact figures are not in the specification, the way the milestone
 * figures are not; PD-2 covers the same kind of gap.
 *
 * @purity pure
 */
function markerSvg(marker: MarkerGeometry, ink: string): string {
  const { centre, radius } = marker
  const disc =
    `<circle cx="${rounded(centre.x)}" cy="${rounded(centre.y)}" r="${rounded(radius)}"` +
    ` fill="#ffffff" stroke="${ink}" stroke-width="1"/>`
  const r = radius * 0.5
  const mark =
    marker.symbol === 'PM-1a'
      ? `<circle cx="${rounded(centre.x)}" cy="${rounded(centre.y)}" r="${rounded(radius * 0.18)}" fill="${ink}"/>`
      : marker.symbol === 'PM-2'
        ? `<polyline points="${rounded(centre.x - r)},${rounded(centre.y)}` +
          ` ${rounded(centre.x - r * 0.2)},${rounded(centre.y + r * 0.7)}` +
          ` ${rounded(centre.x + r)},${rounded(centre.y - r * 0.7)}"` +
          ` fill="none" stroke="${ink}" stroke-width="1.5"/>`
        : marker.symbol === 'PM-3'
          ? `<line x1="${rounded(centre.x - r * 0.6)}" y1="${rounded(centre.y + r)}` +
            `" x2="${rounded(centre.x + r * 0.6)}" y2="${rounded(centre.y - r)}"` +
            ` stroke="${ink}" stroke-width="1.5"/>`
          : marker.symbol === 'PM-4'
            ? `<line x1="${rounded(centre.x)}" y1="${rounded(centre.y - r)}` +
              `" x2="${rounded(centre.x)}" y2="${rounded(centre.y + r * 0.35)}"` +
              ` stroke="${ink}" stroke-width="1.5"/>` +
              `<circle cx="${rounded(centre.x)}" cy="${rounded(centre.y + r * 0.8)}"` +
              ` r="${rounded(radius * 0.12)}" fill="${ink}"/>`
            : ''
  return disc + mark
}

/**
 * ZO-5's name label, at the rectangle LC-6 placed and the size LC-5 measured
 * it with. ⭐ The size is read off the placement rather than derived again:
 * writing FR-077's formula a second time is how the measured width stops
 * matching the glyphs.
 *
 * ⚠️ `labelHaloOfFont` is the outline table T-017a's note reaches for when a
 * hue cannot meet CT-1 and CT-2. It is drawn always, which is the safe side of
 * that note rather than a reading of it.
 *
 * @purity pure
 */
function labelSvg(
  box: ScreenRect,
  text: string,
  fontSize: number,
  settings: DocumentSettings,
): string {
  const x = box.x + settings.labelPad
  const y = box.y + box.height * settings.labelBaseline
  const halo = fontSize * settings.labelHaloOfFont
  return (
    `<text x="${rounded(x)}" y="${rounded(y)}" font-size="${rounded(fontSize)}"` +
    ` fill="#111111" stroke="#ffffff" stroke-width="${rounded(halo)}"` +
    ` paint-order="stroke" xml:space="preserve">${escaped(text)}</text>`
  )
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
  layout: ScheduleLayout,
  geometry: ScheduleGeometry,
  regions: ScreenRegions,
  selection: Selection,
): string {
  const hue = schedule.project.themeHue
  const monochrome = settings.themeMonochrome
  const lightness = lightnessOf(settings)
  // ZO-5's label needs the string and the size LC-5 measured it at, and both
  // travel with the placement rather than the geometry.
  const placedOf = new Map(layout.placements.map((one) => [one.taskUid, one]))
  const visualOf = new Map(schedule.taskVisuals.map((one) => [one.taskUid, one]))
  // FR-019: 「線色を指定でき、指定が無ければ注記用の固定色で描く」. Both halves.
  const strokeOfBox = new Map(
    schedule.highlightBoxes.map((one) => [one.id, one.strokeColor]),
  )
  const selected = new Set(
    selection.items.filter((one) => one.kind === 'task').map((one) => one.uid),
  )

  // ⛔ Table T-020 is the paint order, back to front, and in an SVG the
  // document order IS that order. ZO-1 予定バー, ZO-1a 補助線, ZO-2 実績バー,
  // ZO-3 進捗マーカー, ZO-4 依存線, ZO-5 名称ラベル. ⚠️ The first version of
  // this file wrote the dependencies FIRST, which put them at the back -- the
  // one arrangement the table's prose forbids in as many words.
  const planParts: string[] = []
  const guideParts: string[] = []
  const actualParts: string[] = []
  const markerParts: string[] = []
  const linkParts: string[] = []
  const labelParts: string[] = []

  for (const task of geometry.tasks) {
    const visual = visualOf.get(task.taskUid)
    const plan = paintOf(
      visual?.strokeColor ?? null,
      visual?.fillColor ?? null,
      hue,
      lightness.plan,
      monochrome,
      settings.planStroke,
    )
    const actual = paintOf(
      visual?.strokeColor ?? null,
      visual?.fillColor ?? null,
      hue,
      lightness.actual,
      monochrome,
      settings.planStroke,
    )
    if (task.plan !== null) planParts.push(barSvg(task.plan, plan))
    for (const guide of task.guides) {
      guideParts.push(
        `<polyline points="${pointsOf(guide)}" fill="none" stroke="${LINK_COLOUR}"` +
          ` stroke-width="${rounded(settings.planActualGuideWeight)}"` +
          ` stroke-dasharray="${rounded(settings.planActualGuidePattern.on)}` +
          ` ${rounded(settings.planActualGuidePattern.off)}"/>`,
      )
    }
    if (task.actual !== null) actualParts.push(barSvg(task.actual, actual))
    if (selected.has(task.taskUid) && task.plan?.form === 'outline') {
      // FR-030: never carry meaning by colour alone, so the selected task
      // gains an outline of its own rather than a different fill.
      actualParts.push(
        `<polygon points="${pointsOf(task.plan.points)}" fill="none"` +
          ` stroke="${LINK_COLOUR}" stroke-width="2" stroke-dasharray="3 2"/>`,
      )
    }
    if (task.marker !== null && settings.progressMarkerVisible) {
      markerParts.push(markerSvg(task.marker, plan.stroke))
    }
    const placed = placedOf.get(task.taskUid)
    if (task.label !== null && placed !== undefined && placed.label !== '') {
      labelParts.push(labelSvg(task.label, placed.label, placed.labelFontSize, settings))
    }
  }

  for (const link of geometry.dependencies) {
    if (!settings.dependencyVisible) break
    linkParts.push(
      `<polyline points="${pointsOf(link.points)}" fill="none"` +
        ` stroke="${LINK_COLOUR}" stroke-width="${rounded(settings.dependencyWidth)}"/>`,
    )
  }

  if (geometry.progressLine.length > 0 && settings.progressLineVisible) {
    linkParts.push(
      `<polyline points="${pointsOf(geometry.progressLine)}" fill="none"` +
        ` stroke="${LINK_COLOUR}" stroke-width="${rounded(settings.progressLineWidth)}"/>`,
    )
  }

  const status = geometry.statusLine
  if (status !== null) {
    linkParts.push(
      `<line x1="${rounded(status.x)}" y1="${rounded(status.top)}"` +
        ` x2="${rounded(status.x)}" y2="${rounded(status.bottom)}"` +
        ` stroke="${LINK_COLOUR}" stroke-width="1"/>`,
    )
  }

  for (const box of geometry.highlightBoxes) {
    // FR-019: the author's line colour, and the annotation's fixed one only
    // when they named none.
    linkParts.push(
      `<rect x="${rounded(box.box.x)}" y="${rounded(box.box.y)}"` +
        ` width="${rounded(box.box.width)}" height="${rounded(box.box.height)}"` +
        ` fill="none" stroke="${strokeOfBox.get(box.id) ?? ANNOTATION_COLOUR}"` +
        ' stroke-width="1"/>',
    )
  }

  const parts = [
    ...planParts,
    ...guideParts,
    ...actualParts,
    ...markerParts,
    ...linkParts,
    ...labelParts,
  ]

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
