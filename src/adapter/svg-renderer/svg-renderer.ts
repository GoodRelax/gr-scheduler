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
import {
  DEFAULT_CALENDAR_VALUES,
  type CalendarDay,
  type Schedule,
} from '../../entity/document-model/schedule/schedule'
import type { Selection } from '../../entity/document-model/selection/selection'
import type {
  BarGeometry,
  MarkerGeometry,
  Path,
  ScheduleGeometry,
} from '../../entity/layout-engine/schedule-geometry/schedule-geometry'
import {
  dateAtX,
  tickStrideOf,
  xFromDay,
  type ScheduleLayout,
} from '../../entity/layout-engine/schedule-layout/schedule-layout'
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
 * lines it does settle. ⚠️ It is not the only colour still typed here -- the
 * fade grab point's pair below is the other, and for the same reason. Every
 * colour a row DOES hold arrives generated.
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
 * The square FR-075 (MUST) shows on the selected Task, and its outline.
 *
 * ⛔ STOP -- ⛔ NOT IN TABLE T-236. That table settles S-146 .. S-170 and no
 * row among them is the fade grab point: table T-210 gives the point its
 * half-side (S-109), its stroke (S-110) and the condition for showing it
 * (S-111), and stops there. Table T-236 is the table that would have to hold
 * the row -- one for the face and one for the outline, the way S-161 and
 * S-162 split the Progress Marker's ink from its backing.
 *
 * @provisional PD-1
 */
const FADE_HANDLE_FILL_COLOUR = '#ffffff'
/** The other half of the same missing row. See `FADE_HANDLE_FILL_COLOUR`. @provisional PD-1 */
const FADE_HANDLE_STROKE_COLOUR = '#374151'

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
 * The rectangle a run of vertices occupies.
 *
 * ⚠️ `ScreenRect` rather than a shape of this file's own: `HighlightGeometry`
 * already carries one of these for a drawn thing, and two names for the same
 * four numbers would only make them harder to put side by side.
 *
 * @purity pure
 */
function boxOfPoints(path: Path): ScreenRect | null {
  const first = path[0]
  if (first === undefined) return null
  let left = first.x
  let right = first.x
  let top = first.y
  let bottom = first.y
  for (const one of path) {
    left = Math.min(left, one.x)
    right = Math.max(right, one.x)
    top = Math.min(top, one.y)
    bottom = Math.max(bottom, one.y)
  }
  return { x: left, y: top, width: right - left, height: bottom - top }
}

/**
 * Every point one bar reaches, in whichever of table T-012's two forms it
 * takes.
 *
 * ⛔ Nothing is measured again here. SH-3's head is a path the geometry made
 * and SH-4's dots carry their own radius, and both reach past `from` and `to`
 * -- reading only the two ends would put the frame inside the figure.
 *
 * @purity pure
 */
function cornersOfBar(bar: BarGeometry): Path {
  if (bar.form === 'outline') return bar.points
  const out = [bar.from, bar.to, ...(bar.head ?? [])]
  for (const dot of bar.dots) {
    out.push({ x: dot.at.x - dot.radius, y: dot.at.y - dot.radius })
    out.push({ x: dot.at.x + dot.radius, y: dot.at.y + dot.radius })
  }
  return out
}

/**
 * SL-8 of table T-023c (MUST), the FRAMED half: a dashed rectangle on the
 * target's BOUNDING RECTANGLE.
 *
 * ⭐ SL-8 splits SL-1's five kinds in two. This is the half with an area to
 * enclose -- Task (both the shapes with a face and the thin-line ones),
 * highlight box, comment box. ⛔ 依存線 and 基準日線 are the other half and
 * MUST NOT be framed; `selectedLineWidth` is theirs.
 *
 * ⭐ FR-030 is why it is a dash and not a tint -- being selected may not be
 * carried by colour alone -- and S-151 is the colour table T-236 gives, whose
 * own use column reads 「選択と現在位置」.
 *
 * ⛔ The frame does NOT trace the target's own outline (SL-8, MUST NOT).
 * Drawing per shape is how the earlier code came to show the sign on the three
 * shapes with a face and on nothing else.
 *
 * ⛔ Neither the width nor the dash follows the zoom (SL-8, MUST NOT), which is
 * why S-174 and S-175 are read as they stand and no value off `layout` touches
 * them.
 *
 * ⚠️ A target with no extent in one axis gets that side widened to S-174, the
 * frame's own width. ⛔ A rectangle of zero height draws no outline at all, so
 * a figure that collapsed to a single run -- a zero-span SH-3, whose head
 * shrinks with the span, or a milestone drawn at side 0 -- would carry no sign
 * rather than a thin one.
 *
 * @purity pure
 */
function selectionFrameSvg(box: ScreenRect, colour: string): string {
  const stroke = NOT_STORED_SELECTION_SIZES['S-174']
  const [on, off] = NOT_STORED_SELECTION_SIZES['S-175']
  const width = Math.max(box.width, stroke)
  const height = Math.max(box.height, stroke)
  return (
    `<rect x="${rounded(box.x - (width - box.width) / 2)}"` +
    ` y="${rounded(box.y - (height - box.height) / 2)}"` +
    ` width="${rounded(width)}" height="${rounded(height)}"` +
    ` fill="none" stroke="${colour}" stroke-width="${rounded(stroke)}"` +
    ` stroke-dasharray="${rounded(on)} ${rounded(off)}"/>`
  )
}

/**
 * SL-8's OTHER half: 依存線 and 基準日線 are shown as selected by being drawn
 * at S-178 times their own width, and MUST NOT be framed.
 *
 * ⭐ The row records why. A dependency route bends, so a rectangle around it
 * looks nothing like the line and is only harder to read; the status line runs
 * the height of the Row Area, so its rectangle is a tall thin frame that
 * strikes through every bar and milestone behind it.
 *
 * ⭐ The line is drawn thicker IN PLACE rather than over-painted. GD-6 (MUST)
 * keeps the arrowhead on the dependency line, and a second polyline laid on top
 * would leave that head at the thin line's weight.
 *
 * ⛔ THE COLOUR IS NOT CHANGED. SL-8 gives this half one value and it is a
 * multiplier; the thickness is already a sign that is not colour, which is all
 * FR-030 asks. ⚠️ Recolouring the dependency line would also need a SECOND
 * arrowhead marker in the selection colour, and no table holds it.
 *
 * ⛔ STOP -- ⛔ THE DUAL CURSOR'S FOLLOWING SIDE IS NOT COVERED HERE. Table
 * T-029a asks for the same treatment, but this unit cannot see the cursor:
 * `ScheduleGeometry` has no member for it, and its own head note says why --
 * `dualCursor`'s two dates hold `unknown` in the source, so there is nothing to
 * place. What this file would need is a member on `ScheduleGeometry` carrying
 * the two lines and which of them follows.
 *
 * @purity pure
 */
function selectedLineWidth(own: number, selected: boolean): number {
  return selected ? own * NOT_STORED_SELECTION_SIZES['S-178'] : own
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
 * ⭐ PM-1a IS DRAWN FAINT, and only PM-1a. FR-013 carries a MUST that the
 * not-started marker and FR-043's dummies are drawn faint and darkened only
 * while the pointer is on them, and names S-131 as the degree; the same
 * sentence holds the late marker OUT of it in as many words, and PM-4 wins
 * over PM-1a whenever it holds (table T-021), so keying on the symbol is what
 * that exemption reduces to. ⛔ PM-1, PM-2 and PM-3 are not faint: the MUST
 * names the not-started marker and no other, and FR-013's own (MUST NOT) --
 * faintness may not be what tells started from not started, the shape carries
 * that (FR-030) -- is met because PM-1a's own figure is what says it.
 *
 * ⭐ ONE GROUP RATHER THAN AN ATTRIBUTE ON EACH SHAPE. The backing and the ink
 * overlap, and two translucent shapes composite to a third value where they
 * meet -- so per-shape opacity would draw the symbol darker than its own disc
 * and S-131 would no longer be the degree of anything. ⚠️ The backing goes
 * translucent with the rest, which is a real loss against table T-020's opaque
 * backing; the MUST that says to draw it faint is the one that decides.
 *
 * ⛔ STOP -- THE HOVER HALF IS NOT DRAWN. The same MUST darkens the marker
 * while the pointer is on it, and this unit is handed no pointer: PI-19 of
 * table T-064 publishes `svgFromSchedule` over
 * (schedule, settings, layout, geometry, regions, selection) and none of the
 * six carries one. ⭐ The value EXISTS already: the Framework holds it and IF-2
 * of table T-065 carries it into this layer for InputCommandTranslator, so
 * what would have to move is PI-19's own signature and nothing else.
 * ⚠️ Being `pure` (table T-062) is no obstacle -- a pointer handed IN is an
 * argument like the other six. ⛔ Drawing it constantly faint is the safe half
 * of the MUST, not a reading of it: the mark is visible and legible, and only
 * the response to the hand is absent.
 *
 * @purity pure
 */
function markerSvg(
  marker: MarkerGeometry,
  ink: string,
  backing: string,
  faintness: number,
): string {
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
  const drawn = disc + mark
  if (marker.symbol !== 'PM-1a') return drawn
  return `<g opacity="${rounded(faintness)}">${drawn}</g>`
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
 * ⭐ S-168 is the ink and S-169 the halo, both of table T-236. ⚠️ Until this
 * round the pair was typed in as a black glyph on a white outline, which is
 * the LIGHT rendering -- so the dark theme drew black text on the dark ground
 * and only the halo kept it readable. Reading the theme fixes both at once.
 *
 * ⛔ The two are handed IN rather than read here, for the reason `rulerSvg`'s
 * call site states: `themed` is `svgFromSchedule`'s own closure over the hue
 * and the two flags, and reaching table T-236 a second time in this file is
 * the drift the generated block exists to stop.
 *
 * ⚠️ `paint-order="stroke"` puts the stroke UNDER the fill, so the fill is the
 * glyph (S-168) and the stroke is the halo behind it (S-169). Swapping the two
 * attributes paints the label in its own outline.
 *
 * @purity pure
 */
function labelSvg(
  box: ScreenRect,
  text: string,
  fontSize: number,
  settings: DocumentSettings,
  ink: string,
  halo: string,
): string {
  const x = box.x + settings.labelPad
  const y = box.y + box.height * settings.labelBaseline
  const haloWidth = fontSize * settings.labelHaloOfFont
  return (
    `<text x="${rounded(x)}" y="${rounded(y)}" font-size="${rounded(fontSize)}"` +
    ` fill="${ink}" stroke="${halo}" stroke-width="${rounded(haloWidth)}"` +
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
 * GD-6 of table T-020a (MUST): the dependency line is solid AND carries an
 * arrowhead, while the guide (補助線) is dotted and carries none. The line
 * itself already ends on the successor's edge -- LF-4 of table T-221 has the
 * geometry finish every route with a straight entry run -- so the head only
 * has to be put at the last vertex.
 *
 * ⭐ `markerUnits="userSpaceOnUse"` rather than the default `strokeWidth`,
 * because FR-094 (MUST NOT) keeps the dependency line's dimensions off the
 * zoom: the default would size the head by `dependencyWidth` instead of by
 * S-19, and the two are different keys.
 *
 * ⛔ STOP -- ⛔ THE HEAD'S BASE WIDTH IS IN NO ROW. The 依存線 group of
 * `_assets/tbl-settings.md` gives the head one figure, S-19, and the remark
 * column calls it a length; LF-7 of table T-221 sizes the arrow SHAPE's head
 * from `arrowHeadOfStroke` and `arrowHeadOfSpan` and does not reach this line.
 * The base is drawn at S-19 as well, so the head is isosceles and no second
 * number is invented -- table T-201 is the table that would have to hold that
 * row before the base can be anything else.
 *
 * @purity pure
 */
function dependencyArrowSvg(id: string, length: number, colour: string): string {
  const half = length / 2
  return (
    `<defs><marker id="${id}" viewBox="0 0 ${rounded(length)} ${rounded(length)}"` +
    ` refX="${rounded(length)}" refY="${rounded(half)}"` +
    ` markerWidth="${rounded(length)}" markerHeight="${rounded(length)}"` +
    ` markerUnits="userSpaceOnUse" orient="auto">` +
    `<path d="M0,0 L${rounded(length)},${rounded(half)} L0,${rounded(length)} Z"` +
    ` fill="${colour}"/></marker></defs>`
  )
}

/**
 * A name for one emitted picture, so two pictures on the same page do not
 * share a marker ID -- the export path (EP-12 of table T-076) draws a second
 * one into the document the screen is already showing, and an SVG ID is
 * document-wide.
 *
 * ⚠️ Derived from what the picture IS rather than from a counter, because this
 * unit is `pure` (table T-062) and a counter would make two calls with equal
 * arguments answer differently. Two pictures that agree on every part of the
 * seed are the same picture, and their markers would be identical.
 *
 * @purity pure
 */
function pictureId(seed: string): string {
  // FNV-1a over the seed. Any spread would do; this one is short and has no
  // dependency, and the value is a name, never a measurement.
  let hash = 0x811c9dc5
  for (const ch of seed) {
    hash ^= ch.charCodeAt(0)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(36)
}

/** Which row of the Time Ruler's band prints what -- table T-006b's ⑤. */
type RulerRow = 'year' | 'month' | 'week' | 'dayWeekday'

/**
 * L-1 of table T-005a spells the four steps 年 → 年 ＋ 月 → 年 ＋ 月 ＋ 週 →
 * 年 ＋ 月 ＋ 日 ＋ 曜日.
 *
 * ⚠️ The last step is THREE rows in the band, not four: S-2's remark says
 * 段階 4 は 3 段（年 / 月 / 日 ＋ 曜日）, so the day and the weekday share one
 * of table T-006b's ⑤. ⛔ The PoC splits them into four rows and grows the
 * band to fit -- the specification wins, and FR-017 (MUST) forbids the band's
 * height moving with the tier at all.
 */
const ROWS_OF_TIER: { readonly [tier in ScheduleLayout['tier']]: readonly RulerRow[] } = {
  year: ['year'],
  yearMonth: ['year', 'month'],
  yearMonthWeek: ['year', 'month', 'week'],
  yearMonthDayWeekday: ['year', 'month', 'dayWeekday'],
}

const MS_PER_DAY = 86400000

/** @purity pure */
function serialOf(day: CalendarDay): number {
  return Math.floor(Date.UTC(day.year, day.month - 1, day.day) / MS_PER_DAY)
}

/** @purity pure */
function dayOfSerial(serial: number): CalendarDay {
  const at = new Date(serial * MS_PER_DAY)
  return { year: at.getUTCFullYear(), month: at.getUTCMonth() + 1, day: at.getUTCDate() }
}

/** 0 is Sunday, the numbering `Project.weekStartDay` uses (AT-17 / S-108). @purity pure */
function weekdayOf(day: CalendarDay): number {
  return new Date(Date.UTC(day.year, day.month - 1, day.day)).getUTCDay()
}

/**
 * The days one row of the band puts a label on, left to right.
 *
 * ⛔ Only the day row is thinned, and the thinning is `tickStrideOf`'s (LF-1
 * of table T-221) -- FR-017 (MUST NOT) forbids thinning the year, month and
 * week rows, so those three walk their own unit and stop at the band's right
 * edge. ⚠️ The day row's stride is anchored on the day serial rather than on
 * whichever day the left edge happens to fall on, or every label would jump
 * one place to the side each time the view is panned by a day.
 *
 * @purity pure
 */
function ticksOfRow(
  row: RulerRow,
  layout: ScheduleLayout,
  stride: number,
  weekStart: number,
  from: CalendarDay,
  right: number,
  cap: number,
): readonly CalendarDay[] {
  const out: CalendarDay[] = []
  const firstSerial = serialOf(from)
  /** The day this row's first tick sits on, at or before the band's left edge. */
  let at: CalendarDay =
    row === 'year'
      ? { year: from.year, month: 1, day: 1 }
      : row === 'month'
        ? { year: from.year, month: from.month, day: 1 }
        : row === 'week'
          ? dayOfSerial(firstSerial - ((weekdayOf(from) - weekStart + 7) % 7))
          : dayOfSerial(Math.floor(firstSerial / stride) * stride)
  for (let step = 0; step <= cap; step++) {
    if (xFromDay(layout, at) >= right) break
    out.push(at)
    at =
      row === 'year'
        ? { year: at.year + 1, month: 1, day: 1 }
        : row === 'month'
          ? { year: at.month === 12 ? at.year + 1 : at.year, month: (at.month % 12) + 1, day: 1 }
          : dayOfSerial(serialOf(at) + (row === 'week' ? 7 : stride))
  }
  return out
}

/**
 * FR-017's band, drawn. The band `regions.timeRuler` reserves is S-2 tall and
 * is where the year, month, week and day rows go; until this round nothing put
 * a glyph in it and nothing in `src/` read that member at all -- EP-2 of table
 * T-076 calls the Time Ruler a MUST for the export, and a schedule whose dates
 * cannot be read is not a schedule.
 *
 * ⭐ The grain is `layout.tier`, which is what `rulerTierOf` already answered
 * for this frame, and the thinning is `tickStrideOf`. Neither is worked out a
 * second time here: FR-017 fixes one test and one arithmetic, and a copy of
 * either would part company with the layout the bars were placed by.
 *
 * ⛔ STOP -- ⛔ NOTHING SETTLES WHAT THE LABELS SAY. The rows print bare
 * numbers -- the year, the month, and the day of the month for the week and
 * day rows -- because no table and no dictionary holds a ruler label's
 * wording: `_source/display-words.json`, which FR-038 makes the source of
 * every word on screen, has no month name, no weekday name and no date
 * format in it. ⛔ SO THE WEEKDAY HALF OF THE FOURTH TIER IS NOT DRAWN: L-1
 * asks for 日 ＋ 曜日 and the seven weekday words are exactly what that
 * dictionary would have to gain a group for. ⛔ Nor is there a horizontal
 * inset between a tick and its label: S-135 is the gap BETWEEN labels (it is
 * LF-1's arithmetic and nothing else) and S-136 is the vertical pad, so the
 * label starts on its own rule until a row says otherwise.
 *
 * ⛔ STOP -- ⛔ NO GROUND IS PAINTED UNDER THE BAND, AND FR-041 IS NOT THE
 * AUTHORITY TO PAINT ONE. The rectangle in question is `regions.timeRuler` and
 * nothing else -- the Row Area's own x and width, the canvas's own top, and
 * the height S-2 gives. ⭐ What shows through it today is the PAGE element's
 * ground: `pageGroundStyle` resolves S-146 and SingleHtmlShell writes it on
 * `documentElement`, which is the one box lying behind both drawn layers. So
 * FR-041's MUST -- paint the ground yourself, do not leave it to the viewing
 * environment's system colours -- is already discharged, and S-146's own
 * remark, that an unpainted ground shows the OS default, cannot fire here.
 *
 * ⛔ A RECT HERE WOULD BE ABOUT OCCLUSION, WHICH NO ROW SETTLES. Its only
 * effect would be to hide what the Row Area lets past its own top edge --
 * LF-12's overhang, and a first-row label -- and that is a different question
 * from the ground colour. No requirement says the Time Ruler is opaque, and
 * table T-236 holds no ruler ground: S-150 is the panel ground and its use
 * column names the Row Title Panel, the Properties Panel and the palette, not
 * U-19. ⚠️ The row that would be needed is one saying that U-19's band is
 * painted, in which colour, and over which rectangle. Until it exists the band
 * stays unpainted rather than being given an extent this file chose.
 *
 * @purity pure
 */
function rulerSvg(
  layout: ScheduleLayout,
  settings: DocumentSettings,
  band: ScreenRect,
  weekStart: number,
  ink: string,
  rule: string,
): readonly string[] {
  if (band.width <= 0 || band.height <= 0) return []
  const from = dateAtX(layout, band.x)
  // No origin day means no axis to put a tick on -- OP-10 has FR-055 choose one.
  if (from === null) return []

  const rows = ROWS_OF_TIER[layout.tier]
  // ⛔ The band's height does NOT move with the tier (FR-017, MUST): the rows
  // share whatever S-2 gave the band, so a coarse tier gets taller rows rather
  // than a shorter band. S-2's own remark sizes the band for three of them.
  const rowHeight = band.height / rows.length
  const right = band.x + band.width
  const stride = tickStrideOf(layout, settings)
  // Every tick of every row sits at least one day after the one before it, so
  // the days the band spans bound the walk. ⚠️ This thins nothing -- it only
  // keeps the loop finite when pxPerDay is small enough to put thousands of
  // years behind one band.
  const cap = Math.ceil(band.width / Math.max(0.001, layout.pxPerDay)) + 1
  const out: string[] = []

  for (const [index, row] of rows.entries()) {
    const top = band.y + index * rowHeight
    // S-136 is the pad between the rule and the label, measured downwards.
    const baseline = top + settings.rulerLabelPad + settings.rulerFont
    if (index > 0) {
      out.push(
        `<line x1="${rounded(band.x)}" y1="${rounded(top)}"` +
          ` x2="${rounded(right)}" y2="${rounded(top)}"` +
          ` stroke="${rule}" stroke-width="1"/>`,
      )
    }
    for (const day of ticksOfRow(row, layout, stride, weekStart, from, right, cap)) {
      const x = xFromDay(layout, day)
      // ⭐ The rule is drawn only where the boundary really falls, but the
      // label is held at the band's edge when its boundary is off to the left.
      // ⚠️ Exactly one tick per row can be left of the edge -- every row starts
      // at the tick containing `from` -- so no two labels are pinned together.
      // ⛔ Dropping it instead leaves the year row EMPTY at most positions:
      // S-1's remark measures a year at roughly a screen width and a half at
      // 1x, so its boundary is off to the left nearly always, and "which year
      // is this" stops being answerable.
      if (x >= band.x) {
        out.push(
          `<line x1="${rounded(x)}" y1="${rounded(top)}"` +
            ` x2="${rounded(x)}" y2="${rounded(top + rowHeight)}"` +
            ` stroke="${rule}" stroke-width="1"/>`,
        )
      }
      const label = row === 'year' ? day.year : row === 'month' ? day.month : day.day
      out.push(
        `<text x="${rounded(Math.max(x, band.x))}" y="${rounded(baseline)}"` +
          ` font-size="${rounded(settings.rulerFont)}" fill="${ink}"` +
          ` xml:space="preserve">${escaped(String(label))}</text>`,
      )
    }
  }
  // U-50 starts where the band ends, so the band's foot is the one rule that
  // separates the ruler from the Rows.
  out.push(
    `<line x1="${rounded(band.x)}" y1="${rounded(band.y + band.height)}"` +
      ` x2="${rounded(right)}" y2="${rounded(band.y + band.height)}"` +
      ` stroke="${rule}" stroke-width="1"/>`,
  )
  return out
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
  const selectedBoxes = new Set(
    selection.items.filter((one) => one.kind === 'highlightBox').map((one) => one.id),
  )
  const selectedStatusLine = selection.items.some((one) => one.kind === 'statusLine')
  /**
   * The dependency routes SL-1 has selected, keyed by both ends.
   *
   * ⚠️ The two sides name a dependency differently: `ItemRef` names it by its
   * successor and its ORDINAL among that Task's links, while
   * `DependencyGeometry` names it by both UIDs. `Task.dependencies` is the only
   * place the two meet, and `input-command-translator.ts` resolves the same
   * mapping in the same direction when it makes the ref.
   * ⛔ The ordinal is NOT the route's index in `geometry.dependencies`: RT-4a
   * drops a link whose predecessor this zoom did not draw, so the two runs part
   * company the moment one is dropped.
   */
  const selectedLinks = new Set<string>()
  const linksOfTask = new Map(schedule.tasks.map((one) => [one.uid, one.dependencies]))
  for (const item of selection.items) {
    if (item.kind !== 'dependency') continue
    const link = linksOfTask.get(item.successorUid)?.[item.ordinal]
    if (link !== undefined) selectedLinks.add(`${link.predecessorUid}>${item.successorUid}`)
  }

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
  // ⭐ Neither of these is a row of table T-020, and neither is an omission
  // from it: the fade grab points are an overlay FR-075 puts on the SELECTED
  // Task, and the ruler is a different UI part (U-19, not U-50). Both go over
  // the table's six so that nothing painted in the Row Area can cover them.
  const handleParts: string[] = []
  // SL-8's frames, for the same reason: the sign that a thing is selected is
  // not one of the table's six elements, and a bar painted after it would hide
  // the sign on whatever sits underneath.
  //
  // ⭐ ONLY THE FRAMED HALF OF SL-1 ARRIVES HERE. 依存線 and 基準日線 MUST NOT
  // be framed; both are thickened where they are drawn, by `selectedLineWidth`,
  // and so stay in `linkParts` with their own paint order.
  //
  // ⛔ STOP -- ⛔ SL-1's COMMENT BOX GETS NO FRAME, because this unit cannot
  // see one. `ScheduleGeometry` has no member for comment boxes at all: its own
  // head note records that the source has no column for the box's size and
  // FR-093 forbids measuring the text, so nothing here has a rectangle to frame.
  // `item-hit-area.ts` and `everythingSelectable` record the same gap on their
  // side. What this file would need is a member on `ScheduleGeometry` carrying
  // the drawn box, the way `highlightBoxes` does.
  const selectionParts: string[] = []

  // ⛔ STOP -- ⛔ THERE IS NO DUMMY CATEGORY, AND FR-043's MUST IS UNMET.
  // FR-043 shows two faint grab handles on a Task not started (one point on a
  // milestone), and FR-013 adds that they are drawn faint at S-131 and take the
  // actual bar's own paint (FR-041). ⭐ THE GEOMETRY IS ALREADY HERE AND GOES
  // UNREAD: `TaskGeometry.dummies` carries GR-9 at the plan start day, GR-17 at
  // S-129 worked days along and GR-18 on a milestone, and empties itself once
  // the Task is started. `item-hit-area.ts` already answers all three, so a
  // person has a live hit target with nothing under the pointer to see -- which
  // is the reported symptom and is why this is recorded rather than left.
  //
  // ⛔ WHAT IS MISSING IS THE DRAWN FIGURE. Every mark this file draws takes
  // its size from a row -- the fade grab point from S-109 and S-110, the
  // marker's disc from the geometry, SH-4's ends from their own radius -- and
  // `DummyGeometry` carries a POINT and nothing else. The whole specification
  // gives the dummy four rows: S-129 and S-130 are durations, S-131 is the
  // faintness, and S-93 is the HIT AREA. ⛔ S-93 MAY NOT STAND IN FOR THE
  // DRAWN SIZE: its own table records it as a reader's accessibility value the
  // document may not force, and rule 03 section 1 routes S-90 to S-93 into
  // `item-hit-area.ts` alone so that no second unit carries them.
  // ⚠️ A row would have to say what figure U-52 is drawn as and how large --
  // whether GR-9 and GR-17 are two points or the two ends of one faint span,
  // and what GR-18's single point is drawn as. Table T-210 is where it would
  // sit, beside S-109 and S-110.
  //
  // ⚠️ AND EP-14 OF TABLE T-076 WOULD NEED A WAY IN AT THE SAME TIME. The
  // export MUST NOT draw the dummy, and this unit cannot tell an export frame
  // from a screen one; the empty selection the export hands in already erases
  // the frames and the fade grab points (EP-12), but the dummy hangs on the
  // Task being unstarted rather than on the selection, so it would reach the
  // exported picture too.

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
    if (selected.has(task.taskUid)) {
      // SL-8 (MUST): the frame goes on the Task's bounding rectangle, so all
      // five shapes of table T-012 get it and not only the three with an area.
      //
      // ⭐ The box is the BARS' extent -- what SL-2 clicks and SL-7 drags. ⛔
      // The name label is deliberately left out: LC-6 places it outside the bar
      // and FR-014's overhang runs it further still, so a frame that swallowed
      // it would stop reading as this Task's own extent and would overlap the
      // neighbouring rows'. ⚠️ The progress marker and the fade handles are
      // left out for the other reason -- neither is the thing SL-1 names, so
      // neither may decide how far the Task's own frame reaches.
      const box = boxOfPoints([
        ...(task.plan === null ? [] : cornersOfBar(task.plan)),
        ...(task.actual === null ? [] : cornersOfBar(task.actual)),
      ])
      // A Task neither half of which was drawn (S-59's plan-only / actual-only)
      // has no extent, and a frame around nothing would sit at the origin.
      if (box !== null) selectionParts.push(selectionFrameSvg(box, themed('S-151')))

      // FR-075 (MUST): the grab points show on the SELECTED Task and on no
      // other. S-92's hit area is already live in ItemHitArea, so until this
      // round a person could catch a point that was never drawn. S-109 is the
      // half-side of the square and S-110 its stroke; FD-5 already decided
      // which shapes get handles at all, so an empty list draws nothing.
      const half = settings.fadeHandleHalfPx
      for (const at of task.fadeHandles) {
        handleParts.push(
          `<rect x="${rounded(at.x - half)}" y="${rounded(at.y - half)}"` +
            ` width="${rounded(half * 2)}" height="${rounded(half * 2)}"` +
            ` fill="${FADE_HANDLE_FILL_COLOUR}" stroke="${FADE_HANDLE_STROKE_COLOUR}"` +
            ` stroke-width="${rounded(settings.fadeHandleStrokePx)}"/>`,
        )
      }
    }
    if (task.marker !== null && settings.progressMarkerVisible) {
      // S-131 is the degree FR-013's MUST names, and `markerSvg` is where the
      // one symbol it reaches is decided -- PM-4 wins over PM-1a and is
      // exempted there rather than by a second test on this side.
      markerParts.push(
        markerSvg(task.marker, themed('S-161'), themed('S-162'), settings.dummyOpacity),
      )
    }
    const placed = placedOf.get(task.taskUid)
    if (task.label !== null && placed !== undefined && placed.label !== '') {
      labelParts.push(
        labelSvg(
          task.label,
          placed.label,
          placed.labelFontSize,
          settings,
          themed('S-168'),
          themed('S-169'),
        ),
      )
    }
  }

  // ⛔ S-159 AND S-160 ARE TWO DIFFERENT COLOURS, and neither follows the
  // theme (FR-041, MUST NOT, rewritten 2026-08-25). ⚠️ They shared one grey
  // here until that day, because the earlier wording said "the same fixed
  // colour" in the very sentence that also listed both as following the theme.
  const width = Math.max(1, regions.scheduleCanvas.x + regions.scheduleCanvas.width)
  const height = Math.max(1, regions.scheduleCanvas.y + regions.scheduleCanvas.height)
  const arrowId = `grs-dependency-arrow-${pictureId(
    `${rounded(width)}x${rounded(height)}|${geometry.tasks.length}` +
      `|${geometry.dependencies.length}|${selected.size}|${schedule.project.title ?? ''}`,
  )}`
  const defsParts: string[] = []

  // ⛔ GD-6 of table T-020a (MUST) asks for the head here and NOT on the guide
  // above: 「依存線は実線で矢じりを持ち、補助線は点線で矢じりを持たない」.
  for (const link of geometry.dependencies) {
    if (!settings.dependencyVisible) break
    if (defsParts.length === 0) {
      defsParts.push(
        dependencyArrowSvg(arrowId, settings.dependencyArrowLength, themed('S-159')),
      )
    }
    // SL-8 (MUST NOT): a selected dependency is NOT framed. It is the same
    // polyline at S-178 times `dependencyWidth`.
    const linkWidth = selectedLineWidth(
      settings.dependencyWidth,
      selectedLinks.has(`${link.predecessorUid}>${link.successorUid}`),
    )
    linkParts.push(
      `<polyline points="${pointsOf(link.points)}" fill="none"` +
        ` stroke="${themed('S-159')}" stroke-width="${rounded(linkWidth)}"` +
        ` marker-end="url(#${arrowId})"/>`,
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
    // ⛔ SL-8 (MUST NOT): a selected status line is NOT framed either -- its
    // bounding rectangle runs the height of the Row Area and would strike
    // through everything behind it. It is drawn at S-178 times its own width.
    // ⛔ THAT OWN WIDTH IS THE TYPED 1, and it is in no row. It stood before
    // this change and is left where it stands rather than being made to look
    // like a value the specification holds.
    const statusWidth = selectedLineWidth(1, selectedStatusLine)
    linkParts.push(
      `<line x1="${rounded(status.x)}" y1="${rounded(status.top)}"` +
        ` x2="${rounded(status.x)}" y2="${rounded(status.bottom)}"` +
        ` stroke="${themed('S-163')}" stroke-width="${rounded(statusWidth)}"/>`,
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
    // SL-8. ⭐ The rectangle IS the bounding box here, so the frame lands on
    // the same four numbers the box was drawn from -- and it is still a
    // separate rect, because SL-8 (MUST NOT) forbids re-stroking the target's
    // own outline and the dash has to survive the author's own line colour.
    if (selectedBoxes.has(box.id)) {
      selectionParts.push(selectionFrameSvg(box.box, themed('S-151')))
    }
  }

  const parts = [
    ...defsParts,
    ...bandParts,
    ...planParts,
    ...guideParts,
    ...actualParts,
    ...markerParts,
    ...linkParts,
    ...labelParts,
    ...selectionParts,
    ...handleParts,
    // FR-017's band last of all. The Row Area's own paint is clipped to it,
    // but FR-014's overhang (LF-12) and a label that runs past the first row
    // are not, and the Time Ruler does not scroll down (SC-2) -- so it is
    // drawn over everything rather than trusting the rows to stay below it.
    ...rulerSvg(
      layout,
      settings,
      regions.timeRuler,
      // S-108 is the day the week starts on when the document names none.
      schedule.project.weekStartDay ?? DEFAULT_CALENDAR_VALUES['S-108'],
      // ⭐ S-147 and S-149, the ink and the rule, now that the generator sends
      // both to SCHEDULE_COLOURS as well as to the chrome's roster. ⛔ They are
      // handed IN rather than read here: `themed` is `svgFromSchedule`'s own
      // closure over the hue and the two flags, and reading table T-236 a
      // second time in this file is the drift the generated block exists to
      // stop.
      themed('S-147'),
      themed('S-149'),
    ),
  ]

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
//   docs/spec/_source/settings.json (tables T-206 and T-236)
// Rebuild: npm run gen   ||   npm run gen:check fails on drift.
/**
 * The values table T-206 states that this unit needs, by row ID.
 *
 * ⭐ Table T-206 holds what the document does NOT store, so these
 * are not document settings and are not in SETTINGS_DEFAULTS. They
 * are reached by row ID because most rows of that table have no key
 * column -- the row ID is the specification's own name for them.
 *
 * ⚠️ This unit reads the row where it stands. ⛔ Neither row is a
 * document setting and neither may become one: table T-206 is where
 * the specification records that the document does not keep them,
 * and the export draws no entrance at all (EP-1 and EP-4 of table
 * T-076), so a reader handed this document sees the same picture
 * whatever this value is.
 */
export const NOT_STORED_SELECTION_SIZES: {
  /** S-174, in px */
  readonly 'S-174': number
  /** S-175, in px */
  readonly 'S-175': readonly [number, number]
  /** S-178, in × */
  readonly 'S-178': number
} = {
  'S-174': 2,
  'S-175': [2, 2],
  'S-178': 2,
}

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
  /* S-146 */
  'S-146': { light: '#ffffff', dark: 'hsl(H 12% 9%)', followsHue: true },
  /* S-147 */
  'S-147': { light: '#16181d', dark: '#e8eaee', followsHue: false },
  /* S-149 */
  'S-149': { light: 'hsl(H 14% 87%)', dark: 'hsl(H 12% 23%)', followsHue: true },
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
