// ImageExporter -- public entry of this folder.
//
// @unit      UF-39   (docs/spec/05-07-design.md, table T-075)
// @component ImageExporter, layer Adapter (table T-062)
// @purity    semi-pure-b
// @publishes table T-064 row PI-21
//
// CP-21: assemble the parts table T-076 draws around the received picture,
// shrink it by one ratio (FR-080), refuse the whole picture when it will not fit
// (FR-025), and declare `Rasterizer`.
//
// Every route that sends the screen out is assembled here and nowhere else: WY-2
// of table T-041 and FR-025 treat the SVG, the PNG and the clipboard as one
// drawing, so a second assembly would be a second answer. What still stands
// between AM-13 of table T-107 and `exportSvg` is recorded in `agent-api-members.ts`.
//
// The picture is supplied, not called for: `svgFromSchedule` needs a schedule,
// layout, geometry, selection and regions this component has no edge to, and
// ADR-001 has the shell compute the frame once so the export cannot drift from
// the screen. `colourOf` is the one call. The theme hue is handed in with the
// request (`ExportScene.themeHue`), since no edge here reaches `Project`.
//
// The received picture already carries EP-2, EP-5, EP-6 and EP-7 (the watermark,
// laid by `watermarkSvg` in `svg-renderer.ts`); this component could not draw the
// watermark anyway -- it has no schedule, reader's name or clock.
//
// ⛔ What table T-076 excludes and reaches this file in `ScreenView` is left out
// below. ⚠️ What SvgRenderer already drew into the opaque SVG cannot be removed,
// so the caller must render it for the export: FR-080's base environment, no
// pointer (CU-3 of table T-029), and SvgRenderer told it is making an export
// (EP-12, EP-14). Not checkable here.
//
// ⚠️ Two imports have no edge in the manuscript: `ScreenRegions` (PI-35) for the
// EP-1 / EP-3 rectangles and `DocumentSettings` (PI-2) for S-81. Both are frame
// values ADR-001 hands out, adding no source of truth. Reported.
//
// Notices and tooltips have no row in table T-076 or table T-103; they are not
// drawn, by EP-11's reason (a tool's own surfaces are not the schedule).
//
// The seam declared in this folder is re-exported here because the layer that
// implements it may not reach past this file (Chapter 5.3, MUST).

import type { DocumentSettings } from '../../entity/document-model/document-settings/document-settings'
import type { ScreenRect, ScreenRegions } from '../../entity/layout-engine/screen-regions/screen-regions'
import type { RowTitle, ScreenView } from '../screen-renderer/screen-renderer'
import { colourOf } from '../svg-renderer/svg-renderer'
import type { Rastering, Rasterizer } from './rasterizer'

export type {
  RasterFault,
  RasterFaultReason,
  RasterSizePx,
  Rastering,
  Rasterizer,
} from './rasterizer'

/**
 * Everything one export is made from. No format or size among them: FR-025 fixes
 * the size at S-81 and forbids asking for it (MUST NOT).
 */
export interface ExportScene {
  /**
   * The screen's picture, exactly as SvgRenderer made it (PI-19).
   *
   * ⛔ Not re-rendered or read into (5.3, FR-080). Not judged either: a sibling
   * component's return value is not one of FR-023's untrusted intakes.
   */
  readonly svg: string
  /**
   * The screen's rectangles (PI-35), as they hold with the properties panel and
   * command palette closed (FR-080).
   */
  readonly regions: ScreenRegions
  /** The parts outside the schedule (PI-37). Table T-076 decides which survive. */
  readonly screenView: ScreenView
  /** The presentation group: `exportCanvas` (S-81) and the row-name values FR-085 uses. */
  readonly settings: DocumentSettings
  /**
   * The document's theme hue (`Project.themeHue`, AT-19), table T-236's `H`.
   *
   * ⛔ Handed in because it cannot be read here: DR-5 of table T-052 keeps it at
   * `Project`, outside `DocumentSettings` and `ScreenView`. ⛔ No default -- a
   * fallback would be a second answer to table T-236.
   */
  readonly themeHue: number
}

/**
 * Why `exportSvg` (and so `exportPng`) answers with no picture: FR-025 admits
 * only one reason.
 *
 * `frame-loop.ts` maps it to `RS-43` of table T-233; this folder answers in a
 * classification (AG-8), never in words.
 */
export interface ImageExportFault {
  readonly reason: 'tooTall'
}

/**
 * The picture itself, once FR-025 allows one.
 */
interface SvgPicture {
  /** IO-3's output: `exportCanvas` wide, and as tall as `heightPx`. */
  readonly svg: string
  /**
   * The height FR-025 grew the picture to: S-81's height at least, S-217 at most.
   * The width is always S-81's, so only the height is carried.
   *
   * ⛔ Published so `exportPng` paints at exactly this height; a second
   * arithmetic would let the raster and the picture differ in size.
   */
  readonly heightPx: number
}

/**
 * What `exportSvg` answers with: the whole picture or none. No partial shape --
 * FR-025 (MUST NOT) forbids drawing part of a picture.
 */
export type SvgExport =
  | ({ readonly ok: true } & SvgPicture)
  | { readonly ok: false; readonly fault: ImageExportFault }

/**
 * What one export produced.
 *
 * Two failures kept apart: `ok: false` is FR-025's refusal, and the rasterizer is
 * never asked; `ok: true` with `png.ok: false` is `RasterFault` (IF-6) -- the
 * picture exists, and AG-8 of table T-035 leaves IO-3 (`svg`) as the way out.
 *
 * The success branch reuses `SvgPicture` so the string `exportSvg` returns and
 * the one rasterized cannot diverge (WY-2 of table T-041).
 */
export type ImageExport =
  | ({ readonly ok: true } & SvgPicture & { readonly png: Rastering })
  | { readonly ok: false; readonly fault: ImageExportFault }

/**
 * The ground and ink of EP-1's band, EP-3's panel and their text.
 *
 * ⚠️ The ground is opaque so a bar the `Row Area` did not clip cannot show
 * through the row names.
 *
 * @provisional PND-50
 */
const CHROME_GROUND = '#f3f4f6'
const CHROME_INK = '#111111'

/** ⚠️ Distinctive because an exported picture may be inlined beside another SVG. */
const FIT_CLIP_ID = 'grs-export-fit'

/**
 * Two places, the rule `svg-renderer.ts` uses: WY-3 compares screen and export
 * after one rounding rule (NS-3 of table T-231). Stated in both files because
 * they are separate components of table T-062 with no edge between them.
 *
 * @purity pure
 */
function rounded(value: number): string {
  return (Math.round(value * 100) / 100).toString()
}

/**
 * ⚠️ A ratio is not rounded: 0.005 on a ratio moves the far edge of a wide screen
 * by several pixels, which is what WY-3 measures.
 *
 * @purity pure
 */
function ratioText(ratio: number): string {
  return ratio.toString()
}

/** @purity pure */
function escaped(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * The same rectangle in the export's coordinates.
 *
 * Multiplied in rather than left to a `transform`, so the numbers in the picture
 * are the ones WY-3 compares. The received picture cannot be -- see `exportSvg`.
 *
 * @purity pure
 */
function scaledRect(rect: ScreenRect, ratio: number): ScreenRect {
  return {
    x: rect.x * ratio,
    y: rect.y * ratio,
    width: rect.width * ratio,
    height: rect.height * ratio,
  }
}

/** @purity pure */
function rectSvg(rect: ScreenRect, fill: string): string {
  return (
    `<rect x="${rounded(rect.x)}" y="${rounded(rect.y)}"` +
    ` width="${rounded(rect.width)}" height="${rounded(rect.height)}" fill="${fill}"/>`
  )
}

/** @purity pure */
function textSvg(x: number, y: number, fontSizePx: number, text: string): string {
  return (
    `<text x="${rounded(x)}" y="${rounded(y)}" font-size="${rounded(fontSizePx)}"` +
    ` fill="${CHROME_INK}" xml:space="preserve">${escaped(text)}</text>`
  )
}

/**
 * EP-1: the band and the `Document Title` only; the header's controls and file
 * name are not drawn. The band is the screen's own rectangle, so everything
 * below stays where the screen has it.
 *
 * @purity pure
 */
function appHeaderSvg(
  band: ScreenRect,
  documentTitle: string | null,
  settings: DocumentSettings,
  ratio: number,
): string {
  const ground = rectSvg(scaledRect(band, ratio), CHROME_GROUND)
  // FR-035 fixes a substitute for the BROWSER TAB and says nothing about a
  // header with no title, so a document without one shows none.
  if (documentTitle === null || documentTitle === '') return ground
  // Size and inset are the screen's rows S-225 / S-226 (EP-1 of table T-076),
  // multiplied by the ratio only (WY-3). ⛔ The band's height must not enter
  // either number (FR-051; S-226's note).
  const fontSizePx = NOT_STORED_DOCUMENT_TITLE_SIZES['S-225'] * ratio
  const x = (band.x + NOT_STORED_DOCUMENT_TITLE_SIZES['S-226']) * ratio
  // S-33's correction taken against the BAND, unlike `svg-renderer.ts`, which
  // applies it to the font: no requirement fixes where in the band the title
  // stands, so changing it would invent a value. Reported.
  const y = (band.y + band.height * settings.labelBaseline) * ratio
  return ground + textSvg(x, y, fontSizePx, documentTitle)
}

/**
 * S-36 enlarged by S-38 for a root row (K-38 of table T-104). The same rule is in
 * `row-title-panel.ts`, which cuts the name to this size (FR-085).
 *
 * @purity pure
 */
function rowTitleFontPx(depth: number, settings: DocumentSettings): number {
  return depth === 1 ? settings.rowTitleFont * settings.rowTitleTopScale : settings.rowTitleFont
}

/**
 * EP-3: one name of the `Row Title Tree`.
 *
 * ⛔ Not cut again: it arrives cut by FR-085, and cutting twice would make export
 * and screen cut in different places.
 *
 * Vertical numbers are the row's (SC-1 of table T-031), horizontal the panel's.
 * Anchored to the band's top because LF-2 of table T-221 grows a band downward,
 * so a centred name would move when a `Task` joined the row.
 *
 * @purity pure
 */
function rowTitleSvg(
  title: RowTitle,
  panel: ScreenRect,
  settings: DocumentSettings,
  ratio: number,
): string {
  if (title.label === null || title.label === '') return ''
  const fontSizePx = rowTitleFontPx(title.depth, settings)
  // The indent `RowTitle` carries -- the number FR-085 subtracted and the screen
  // draws -- not a product worked out again here.
  const x = (panel.x + title.indentPx) * ratio
  const y = (title.box.y + fontSizePx) * ratio
  return textSvg(x, y, fontSizePx * ratio, title.label)
}

/**
 * EP-9: each `Panel Divider`'s boundary line, not its grab band. Which dividers
 * exist is the handed-in frame's (FR-080).
 *
 * Coloured S-149 of table T-236 at the document's hue, as `dom-screen-surface.ts`
 * paints the same divider (`PAINT.rule`). ⛔ Not S-165, which is `Group Grid
 * Lines`' colour.
 *
 * @purity pure
 */
function dividerLinesSvg(
  view: ScreenView,
  settings: DocumentSettings,
  themeHue: number,
  ratio: number,
): string {
  const dark = settings.themePreference === 'dark'
  const ink = colourOf('S-149', themeHue, dark, settings.themeMonochrome)
  return view.frame.dividers
    .map((divider) => rectSvg(scaledRect(divider.line, ratio), ink))
    .join('')
}

/**
 * The whole picture: FR-080's shrunken screen with table T-076's parts on it, or
 * none once FR-025's ceiling is passed.
 *
 * Published rather than kept inside `exportPng` so that every route (AM-13 of
 * table T-107, IO-6 of table T-024 through CP-24, IO-3 through the shell) uses one
 * assembly (WY-2 of table T-041). The name is table T-064's and table T-107's,
 * so rule 03 section 1 lets it override the noun-phrase naming rule.
 *
 * The ratio is S-81's width over the screen's width, on both axes (FR-080); the
 * width is measured as `svg-renderer.ts` sizes its picture. The height is not in
 * the ratio, so a tall screen overflows and FR-025 decides.
 *
 * The height grows from S-81's height up to S-217 (FR-025); a shorter picture
 * leaves the rest blank. Past S-217 nothing is drawn (FR-025, MUST NOT).
 *
 * ⚠️ The received picture is an opaque string, so it is scaled by a group; its
 * own root carries the screen's size, making it a nested viewport of that area.
 *
 * @purity pure
 */
export function exportSvg(scene: ExportScene): SvgExport {
  const { regions, screenView, settings } = scene
  const screenWidth = Math.max(1, regions.scheduleCanvas.x + regions.scheduleCanvas.width)
  const ratio = settings.exportCanvas.width / screenWidth
  // Measured like the width, so the two axes agree where the screen ends.
  const screenHeight = Math.max(1, regions.scheduleCanvas.y + regions.scheduleCanvas.height)
  // FR-025 (MUST): S-81's height is the floor and the shrunken screen is what
  // the picture wants to grow to.
  const wantedHeight = Math.max(settings.exportCanvas.height, screenHeight * ratio)
  // FR-025 (MUST): past S-217 there is no picture, not a shorter one.
  if (wantedHeight > settings.exportCanvasHeightCap) {
    return { ok: false, fault: { reason: 'tooTall' } }
  }
  const height = wantedHeight

  const titles = screenView.rowTitlePanel.titles
  const panel = regions.rowTitlePanel
  // FR-098 holds the pinned rows at the top; both groups are drawn in full.
  const pinned = screenView.rowTitlePanel.pinnedTitles
  // Painted over the received picture in this order: band and panel cover what
  // the `Row Area` did not clip, and the divider closes their boundary.
  const drawnHere =
    appHeaderSvg(regions.appHeader, screenView.appHeaderItems.documentTitle, settings, ratio) +
    rectSvg(scaledRect(panel, ratio), CHROME_GROUND) +
    pinned.map((title) => rowTitleSvg(title, panel, settings, ratio)).join('') +
    titles.map((title) => rowTitleSvg(title, panel, settings, ratio)).join('') +
    dividerLinesSvg(screenView, settings, scene.themeHue, ratio)

  const width = settings.exportCanvas.width
  // The clip bounds the unmeasured received picture to the canvas, so it never
  // paints past `height`.
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${rounded(width)}"` +
    ` height="${rounded(height)}" viewBox="0 0 ${rounded(width)} ${rounded(height)}">` +
    `<defs><clipPath id="${FIT_CLIP_ID}">` +
    `<rect x="0" y="0" width="${rounded(width)}" height="${rounded(height)}"/>` +
    '</clipPath></defs>' +
    `<g clip-path="url(#${FIT_CLIP_ID})">` +
    `<g transform="scale(${ratioText(ratio)})">${scene.svg}</g>` +
    drawnHere +
    '</g></svg>'

  return { ok: true, svg, heightPx: height }
}

/**
 * Export the screen as an image (FR-025, FR-080).
 *
 * Failure is a value (FR-028, AG-8 of table T-035), and this is the last place
 * that can turn a rejected promise back into one, so callers may rely on it.
 *
 * Two failures: `exportSvg`'s refusal, before `Rasterizer` is asked; then
 * `RasterFault` (IF-6).
 *
 * The pixel size is the picture's own -- S-81's width and `heightPx` -- with no
 * multiplier (FR-025, MUST NOT).
 *
 * The seam comes first because the shell supplies it once at wiring time.
 *
 * @purity semi-pure-b
 */
export async function exportPng(
  rasterizer: Rasterizer,
  scene: ExportScene,
): Promise<ImageExport> {
  const picture = exportSvg(scene)
  if (!picture.ok) return picture
  // ⛔ The picture's own height, not S-81's: reading the setting would paint a
  // shorter window onto a taller picture.
  const sizePx = {
    widthPx: scene.settings.exportCanvas.width,
    heightPx: picture.heightPx,
  }
  try {
    return { ...picture, png: await rasterizer.rasterizePng(picture.svg, sizePx) }
  } catch {
    // A rasterizer that rejects has already broken FR-028's MUST NOT. Which of
    // the three reasons it meant cannot be recovered without reading its
    // message -- the very thing that requirement forbids -- so the one that
    // claims least is reported.
    return {
      ...picture,
      png: {
        ok: false,
        fault: { reason: 'rasterFailed', what: 'the rasterizer rejected instead of answering' },
      },
    }
  }
}

// <generated -- do not edit by hand>
// Single source of truth:
//   docs/spec/_source/settings.json (table T-206)
// Rebuild: npm run gen   ||   npm run gen:check fails on drift.
/**
 * The values table T-206 states that this unit needs, by row ID.
 *
 * ⭐ Table T-206 holds what the document does NOT store, so these
 * are not document settings and are not in SETTINGS_DEFAULTS. They
 * are reached by row ID because most rows of that table have no key
 * column -- the row ID is the specification's own name for them.
 *
 * ⚠️ This unit reads the row where it stands: `AppHeaderItems`
 * carries the title as a string and no rectangle -- unlike
 * `RowTitle`, which carries its `box` -- so there is no door to pass
 * it through. ⛔ It is not a document setting and may not become one:
 * table T-206 is where the specification records that the document
 * does not keep it. ⭐ AND THE SCREEN READS THE SAME ROW -- EP-1 of
 * table T-076 (MUST) has the size and the inset come from one row on
 * both sides and (MUST NOT) lets an export hold a value of its own,
 * so what makes this the reader's own is not that the title is
 * hidden but that the document keeps its TEXT (`Project.title`,
 * U-27) and neither of the two numbers it is written with.
 */
export const NOT_STORED_DOCUMENT_TITLE_SIZES: {
  /** S-225, in px */
  readonly 'S-225': number
  /** S-226, in px */
  readonly 'S-226': number
} = {
  'S-225': 16,
  'S-226': 12,
}
// </generated>
