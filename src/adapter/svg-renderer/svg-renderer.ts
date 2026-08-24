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
// ⭐ FR-042's band is drawn HERE and nowhere else, and that is not a choice
// this file made. `_source/components.json` gives this component the edge to
// ScheduleLayout ("the ruler and the row placement") and the edge to Schedule
// that names "the row colour"; ScreenRenderer's own head note says in as many
// words that it may reach neither layout nor geometry, and that `Rows` (U-1)
// and everything in them are absent from it. ⛔ Until this round nothing drew
// a band at all -- `layout.rows` reached no renderer.
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
 * The one colour FR-019 (MUST) asks for that no table holds: the line an
 * annotation takes when the author named none.
 *
 * ⛔ NOT IN TABLE T-236. That table settles S-146 .. S-170, and the annotation
 * is not among them although FR-041 names it in the same breath as the two
 * lines it does settle. This is the last colour typed in this file; every
 * other one arrives generated.
 *
 * ⛔ AND THIS VALUE IS MEASURABLY WRONG. FR-019 wants it kept away from the
 * theme hue, the dependency line AND the progress line. It is hue 26, which is
 * the hue S-159 gives the dependency line in the light theme. Correcting it
 * means choosing a colour, which this unit may not do -- so it stands, and the
 * gap is reported instead of papered over.
 *
 * @provisional PD-1
 */
const ANNOTATION_COLOUR = '#b45309'

/**
 * The dashes a selected Task gains, so FR-030 is met without colour carrying
 * the meaning alone (SL-8 of table T-023c).
 *
 * ⛔ S-151 is the row this wants -- table T-236 gives it selection as its very
 * use -- but `tools/generate_entity_types.py` sends S-151 to SCREEN_COLOURS,
 * which lands in the unit that may not reach the schedule. Nothing carries it
 * here, so the colour stays typed.
 *
 * @provisional PD-1
 */
const SELECTION_OUTLINE_COLOUR = '#6b7280'

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
  // Two places. The grid is NS-3 of table T-231, which requires ONE rounding
  // rule on both sides of WY-3's comparison -- so the two halves of one
  // picture may not round differently.
  return (Math.round(value * 100) / 100).toString()
}

/** @purity pure */
function pointsOf(path: Path): string {
  return path.map((one) => `${rounded(one.x)},${rounded(one.y)}`).join(' ')
}

/**
 * The same colour with the hue taken out, for FR-041's monochrome. Applied
 * when drawing and never to the stored value -- `themeMonochrome` "does not
 * change what is saved" (tbl-settings.md §5).
 *
 * ⚠️ What survives is HSL's lightness, not WCAG's luminance. Monochrome shows
 * the same picture without hue, so the value kept is the one the colour was
 * WRITTEN with; luminance is the measure NFR-007 judges by, which is a
 * different question from how to draw.
 *
 * ⛔ A colour this cannot read comes back unchanged. Guessing at one would be
 * worse than leaving a single shape coloured, which a reader can see and say.
 *
 * @purity pure
 */
function achromatic(colour: string): string {
  const asHsl = /^hsla?\(\s*[\d.]+\s*[, ]\s*[\d.]+%\s*[, ]\s*([\d.]+)%/.exec(colour.trim())
  if (asHsl !== null) return `hsl(0 0% ${asHsl[1] as string}%)`
  const asHex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(colour.trim())
  if (asHex === null) return colour
  const digits = asHex[1] as string
  const wide = digits.length === 3 ? digits.replace(/./g, (one) => one + one) : digits
  const channels = [0, 2, 4].map((at) => parseInt(wide.slice(at, at + 2), 16) / 255)
  const lightness = (Math.max(...channels) + Math.min(...channels)) / 2
  return `hsl(0 0% ${rounded(lightness * 100)}%)`
}

/**
 * One row of table T-236, resolved for the theme in force.
 *
 * ⭐ The `H` is substituted here rather than in the manuscript, for the reason
 * the generated block at the foot of this file states: S-73 holds themeHue
 * once, so the rows name it instead of repeating it.
 *
 * ⛔ Monochrome reaches only the rows that follow the theme. A row with
 * `followsHue` false is used exactly as written, and FR-041 (MUST NOT) is why:
 * the two lines are held off the theme, so letting the theme's own monochrome
 * switch move them would be following it after all.
 *
 * @purity pure
 */
function colourOf(rowId: string, hue: number, dark: boolean, monochrome: boolean): string {
  const row = SCHEDULE_COLOURS[rowId]
  // The generator raises on a row table T-236 has not, so this can only fire
  // when a row ID typed here is not one the block was asked for.
  if (row === undefined) throw new Error(`table T-236 does not reach this unit with ${rowId}`)
  const written = dark ? row.dark : row.light
  if (!row.followsHue) return written
  const substituted = written.replace(/\bH\b/g, rounded(hue))
  return monochrome ? achromatic(substituted) : substituted
}

/** Which column of table T-236 the saved theme asks for (S-72). @purity pure */
function isDarkTheme(settings: DocumentSettings): boolean {
  return settings.themePreference === 'dark'
}

/**
 * FR-042's band colour for a row the author gave none: S-166 at depth 1,
 * S-164 and S-167 alternating below it.
 *
 * ⛔ The stripe is counted by the row's POSITION, never by whether the rows
 * above carried an override -- FR-042 says so in as many words, because
 * counting only un-overridden rows flips every stripe below the moment one row
 * is given a colour.
 *
 * @purity pure
 */
function bandRowOf(depth: number, position: number): string {
  if (depth === 1) return 'S-166'
  return position % 2 === 0 ? 'S-164' : 'S-167'
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
  themedStroke: string,
  themedFill: string,
  monochrome: boolean,
  strokeWidth: number,
): Paint {
  const stroke = chosenStroke === null ? themedStroke : chosenStroke
  const fill = chosenFill === null ? themedFill : chosenFill
  // ⭐ One call for both halves. A themed colour arrives achromatic already
  // and `achromatic` is idempotent, so the chosen colour needs no branch of
  // its own -- which is what the earlier two-branch form got wrong: it threw
  // the author's colour away instead of draining it.
  return {
    stroke: monochrome ? achromatic(stroke) : stroke,
    fill: monochrome ? achromatic(fill) : fill,
    strokeWidth,
  }
}

/**
 * ZO-3's marker. ⭐ Table T-020 says it carries an opaque backing, so the
 * circle is filled rather than hollow -- it sits over the bars and a hollow
 * one would read as part of whatever shows through. S-162 is that backing and
 * S-161 the ink; S-162 inherits S-146 in the manuscript, which is why the
 * marker keeps reading as something floating on the ground.
 *
 * ⚠️ The five symbols of table T-021 are drawn as strokes inside that circle.
 * ⛔ Their exact figures are not in the specification, the way the milestone
 * figures are not; PD-2 covers the same kind of gap.
 *
 * @purity pure
 */
function markerSvg(marker: MarkerGeometry, ink: string, backing: string): string {
  const { centre, radius } = marker
  const disc =
    `<circle cx="${rounded(centre.x)}" cy="${rounded(centre.y)}" r="${rounded(radius)}"` +
    ` fill="${backing}" stroke="${ink}" stroke-width="1"/>`
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
 * ⛔ THE TWO COLOURS BELOW ARE STILL TYPED, and table T-236 already holds
 * them: S-168 is the ink on a bar and S-169 the halo. They do not reach this
 * unit -- `tools/generate_entity_types.py` puts both in SCREEN_COLOURS, which
 * goes to DomScreenSurface, and that unit draws no bar to put a label on.
 * ⛔ Not typed in from the table here: a copied colour goes stale in silence,
 * which is the whole reason the table is generated.
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
 * this unit measures nothing of its own.
 *
 * ⛔ THE NOTE THAT STOOD HERE WAS FALSE. It said the layout "is not an
 * argument"; `layout` has been the third parameter all along, and the label
 * has always read its placements. FR-042's band now reads `layout.rows` as
 * well, which is the edge `_source/components.json` draws from this component
 * to ScheduleLayout and calls "the ruler and the row placement".
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
  const dark = isDarkTheme(settings)
  /** One row of table T-236, under the theme this frame is drawn in. */
  const themed = (rowId: string): string => colourOf(rowId, hue, dark, monochrome)
  // ZO-5's label needs the string and the size LC-5 measured it at, and both
  // travel with the placement rather than the geometry.
  const placedOf = new Map(layout.placements.map((one) => [one.taskUid, one]))
  const visualOf = new Map(schedule.taskVisuals.map((one) => [one.taskUid, one]))
  // FR-019: 「線色を指定でき、指定が無ければ注記用の固定色で描く」. Both halves.
  const strokeOfBox = new Map(
    schedule.highlightBoxes.map((one) => [one.id, one.strokeColor]),
  )
  // FR-042's other half: the colour the author put on the row itself (AT-58).
  const colourOfGroup = new Map(schedule.taskGroups.map((one) => [one.id, one.color]))
  const selected = new Set(
    selection.items.filter((one) => one.kind === 'task').map((one) => one.uid),
  )

  // ⛔ Table T-020 is the paint order, back to front, and in an SVG the
  // document order IS that order. ZO-1 予定バー, ZO-1a 補助線, ZO-2 実績バー,
  // ZO-3 進捗マーカー, ZO-4 依存線, ZO-5 名称ラベル. ⚠️ The first version of
  // this file wrote the dependencies FIRST, which put them at the back -- the
  // one arrangement the table's prose forbids in as many words.
  // ⭐ The bands are not a row of that table. They are the ground the table's
  // six elements are painted on, so they go behind all of it (FR-042).
  const bandParts: string[] = []
  const planParts: string[] = []
  const guideParts: string[] = []
  const actualParts: string[] = []
  const markerParts: string[] = []
  const linkParts: string[] = []
  const labelParts: string[] = []

  // FR-042 (MUST): one band per drawn row, and a group grid line on its
  // boundary. ⛔ Clipped to the Row Area rather than drawn wherever the row
  // sits: S-78 slides the whole stack, so a scrolled row's band would
  // otherwise be painted over the Time Ruler and the app header above it.
  const area = regions.rowArea
  const areaBottom = area.y + area.height
  for (const [position, row] of layout.rows.entries()) {
    const top = Math.max(row.y, area.y)
    const bottom = Math.min(row.y + row.height, areaBottom)
    if (bottom <= top) continue
    const chosen = colourOfGroup.get(row.groupId) ?? null
    const band = chosen === null ? themed(bandRowOf(row.depth, position)) : chosen
    bandParts.push(
      `<rect x="${rounded(area.x)}" y="${rounded(top)}"` +
        ` width="${rounded(area.width)}" height="${rounded(bottom - top)}"` +
        ` fill="${monochrome ? achromatic(band) : band}"/>`,
    )
    // S-68 is whether the group grid line is drawn at all; S-165 is its
    // colour. FR-042's RATIONALE makes the line itself a MUST -- one row is
    // one target, and an invisible boundary leaves that unreadable.
    if (!settings.groupGridLinesVisible) continue
    bandParts.push(
      `<line x1="${rounded(area.x)}" y1="${rounded(bottom)}"` +
        ` x2="${rounded(area.x + area.width)}" y2="${rounded(bottom)}"` +
        ` stroke="${themed('S-165')}" stroke-width="1"/>`,
    )
  }

  for (const task of geometry.tasks) {
    const visual = visualOf.get(task.taskUid)
    const plan = paintOf(
      visual?.strokeColor ?? null,
      visual?.fillColor ?? null,
      themed('S-156'),
      themed('S-155'),
      monochrome,
      settings.planStroke,
    )
    const actual = paintOf(
      visual?.strokeColor ?? null,
      visual?.fillColor ?? null,
      themed('S-158'),
      themed('S-157'),
      monochrome,
      settings.planStroke,
    )
    if (task.plan !== null) planParts.push(barSvg(task.plan, plan))
    for (const guide of task.guides) {
      // S-105: the guide takes the ACTUAL bar's colour, because it is the line
      // that leaves the actual bar. ⛔ No key of its own -- FR-041 forbids
      // storing a derived colour, and a second constant would be one.
      guideParts.push(
        `<polyline points="${pointsOf(guide)}" fill="none" stroke="${actual.stroke}"` +
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
          ` stroke="${SELECTION_OUTLINE_COLOUR}" stroke-width="2" stroke-dasharray="3 2"/>`,
      )
    }
    if (task.marker !== null && settings.progressMarkerVisible) {
      markerParts.push(markerSvg(task.marker, themed('S-161'), themed('S-162')))
    }
    const placed = placedOf.get(task.taskUid)
    if (task.label !== null && placed !== undefined && placed.label !== '') {
      labelParts.push(labelSvg(task.label, placed.label, placed.labelFontSize, settings))
    }
  }

  // ⛔ S-159 AND S-160 ARE TWO DIFFERENT COLOURS, and neither follows the
  // theme (FR-041, MUST NOT, rewritten 2026-08-25). ⚠️ They shared one grey
  // here until that day, because the earlier wording said "the same fixed
  // colour" in the very sentence that also listed both as following the theme.
  for (const link of geometry.dependencies) {
    if (!settings.dependencyVisible) break
    linkParts.push(
      `<polyline points="${pointsOf(link.points)}" fill="none"` +
        ` stroke="${themed('S-159')}" stroke-width="${rounded(settings.dependencyWidth)}"/>`,
    )
  }

  if (geometry.progressLine.length > 0 && settings.progressLineVisible) {
    linkParts.push(
      `<polyline points="${pointsOf(geometry.progressLine)}" fill="none"` +
        ` stroke="${themed('S-160')}" stroke-width="${rounded(settings.progressLineWidth)}"/>`,
    )
  }

  const status = geometry.statusLine
  if (status !== null) {
    // CU-1's line. S-163 is its colour, and it names no hue of its own.
    linkParts.push(
      `<line x1="${rounded(status.x)}" y1="${rounded(status.top)}"` +
        ` x2="${rounded(status.x)}" y2="${rounded(status.bottom)}"` +
        ` stroke="${themed('S-163')}" stroke-width="1"/>`,
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
    ...bandParts,
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

// <generated -- do not edit by hand>
// Single source of truth:
//   docs/spec/_source/settings.json (table T-236)
// Rebuild: npm run gen   ||   npm run gen:check fails on drift.
/**
 * The colours of table T-236, by row ID, in both renderings.
 *
 * ⭐ Table T-236 holds constants baked into the artifact. FR-041 (MUST
 * NOT) forbids saving a derived colour, so none of these is a document
 * setting and none may become one.
 *
 * ⛔ `H` IN A HUE IS NOT A TYPO. Where `followsHue` is true the row
 * follows themeHue (S-73), and the manuscript writes the letter so that
 * S-73's value is stated once rather than copied into every row. Solve it
 * by putting the hue in before use. A row with `followsHue` false states
 * its own hue and is used exactly as written -- the dependency and
 * progress lines are the two of those (FR-041).
 */
export const SCHEDULE_COLOURS: {
  readonly [rowId: string]: {
    readonly light: string
    readonly dark: string
    readonly followsHue: boolean
  }
} = {
  /* S-151 */
  'S-151': { light: 'hsl(H 59% 42%)', dark: 'hsl(H 62% 68%)', followsHue: true },
  /* S-155 */
  'S-155': { light: 'hsl(H 46% 80%)', dark: 'hsl(H 32% 26%)', followsHue: true },
  /* S-156 */
  'S-156': { light: 'hsl(H 44% 46%)', dark: 'hsl(H 46% 66%)', followsHue: true },
  /* S-157 */
  'S-157': { light: 'hsl(H 62% 34%)', dark: 'hsl(H 62% 64%)', followsHue: true },
  /* S-158 */
  'S-158': { light: 'hsl(H 66% 22%)', dark: 'hsl(H 70% 80%)', followsHue: true },
  /* S-159 */
  'S-159': { light: 'hsl(26 88% 44%)', dark: 'hsl(30 92% 60%)', followsHue: false },
  /* S-160 */
  'S-160': { light: 'hsl(354 62% 42%)', dark: 'hsl(354 70% 64%)', followsHue: false },
  /* S-161 */
  'S-161': { light: '#16181d', dark: '#e8eaee', followsHue: false },
  /* S-162 */
  'S-162': { light: '#ffffff', dark: 'hsl(H 12% 9%)', followsHue: true },
  /* S-163 */
  'S-163': { light: '#8b9099', dark: '#767c86', followsHue: false },
  /* S-164 */
  'S-164': { light: 'hsl(H 42% 96%)', dark: 'hsl(H 18% 20%)', followsHue: true },
  /* S-165 */
  'S-165': { light: 'hsl(H 34% 88%)', dark: 'hsl(H 16% 28%)', followsHue: true },
  /* S-166 */
  'S-166': { light: 'hsl(H 40% 97%)', dark: 'hsl(H 20% 17%)', followsHue: true },
  /* S-167 */
  'S-167': { light: 'hsl(H 20% 99%)', dark: 'hsl(H 14% 11%)', followsHue: true },
  /* S-168 */
  'S-168': { light: '#000000', dark: '#ffffff', followsHue: false },
  /* S-169 */
  'S-169': { light: '#ffffff', dark: 'hsl(H 12% 9%)', followsHue: true },
}
// </generated>
