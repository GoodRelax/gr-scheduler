// Assembles the exported picture of the screen and declares the Rasterizer seam.
// @unit      UF-39   (docs/spec/05-07-design.md, table T-075)
// @component ImageExporter, layer Adapter (table T-062)
// @purity    semi-pure-b
// @publishes table T-064 row PI-21

import {
  SETTINGS_CONSTANTS,
  type DocumentSettings,
  type DrawnSettings,
} from '../../entity/document-model/document-settings/document-settings'
import {
  drawnSettingsOf,
  type ScreenRect,
  type ScreenRegions,
} from '../../entity/layout-engine/screen-regions/screen-regions'
import { rowTitleFontPxOf, type RowTitle, type ScreenView } from '../screen-renderer/screen-renderer'
import { colourOf, type ViewerValues } from '../svg-renderer/svg-renderer'
import type { Rastering, Rasterizer } from './rasterizer'

export type {
  RasterFault,
  RasterFaultReason,
  RasterSizePx,
  Rastering,
  Rasterizer,
} from './rasterizer'

export interface ExportScene {
  readonly svg: string
  readonly regions: ScreenRegions
  readonly screenView: ScreenView
  readonly settings: DocumentSettings
  readonly themePreference: ViewerValues['themePreference']
  readonly themeHue: number
}

export interface ImageExportFault {
  readonly reason: 'tooTall'
}

interface SvgPicture {
  readonly svg: string
  readonly heightPx: number
}

export type SvgExport =
  | ({ readonly ok: true } & SvgPicture)
  | { readonly ok: false; readonly fault: ImageExportFault }

export type ImageExport =
  | ({ readonly ok: true } & SvgPicture & { readonly png: Rastering })
  | { readonly ok: false; readonly fault: ImageExportFault }

/** @purity pure */
function isDarkIn(scene: ExportScene): boolean {
  return scene.themePreference === 'dark'
}

// see EP-1, EP-3
/** @purity pure */
function chromeGround(scene: ExportScene): string {
  return colourOf('S-150', scene.themeHue, isDarkIn(scene), scene.settings.themeMonochrome)
}

/** @purity pure */
function pictureGround(scene: ExportScene): string {
  return colourOf('S-146', scene.themeHue, isDarkIn(scene), scene.settings.themeMonochrome)
}

// see EP-1, EP-3
/** @purity pure */
function chromeInk(scene: ExportScene): string {
  return colourOf('S-147', scene.themeHue, isDarkIn(scene), scene.settings.themeMonochrome)
}

// TRAP: must not collide with an id inside the received picture it clips.
const FIT_CLIP_ID = 'grs-export-fit'

// TRAP: rounds as svg-renderer.ts does; change both together.
/** @purity pure */
function rounded(value: number): string {
  return (Math.round(value * 100) / 100).toString()
}

// TRAP: never round a ratio; the far edge of a wide screen moves by pixels.
/** @purity pure */
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

/** @purity pure */
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
function textSvg(
  x: number, y: number, fontSizePx: number, text: string, ink: string, weight: number | null = null,
): string {
  const weighted = weight === null ? '' : ` font-weight="${weight}"`
  return (
    `<text x="${rounded(x)}" y="${rounded(y)}" font-size="${rounded(fontSizePx)}"${weighted}` +
    ` font-family="${escaped(NOT_STORED_TYPEFACES['S-246'])}"` +
    ` fill="${ink}" xml:space="preserve">${escaped(text)}</text>`
  )
}

const DIVIDER_SIDES = 2

// see EP-1, BR-2, BR-6, BR-7
/** @purity pure */
function appHeaderSvg(
  band: ScreenRect,
  documentTitle: string | null,
  scene: ExportScene,
  ratio: number,
): string {
  const ground = rectSvg(scaledRect(band, ratio), chromeGround(scene))
  if (documentTitle === null || documentTitle === '') return ground
  // see FR-051, EP-1
  const chrome = NOT_STORED_CHROME_SCALE['S-235']
  const titlePx = NOT_STORED_DOCUMENT_TITLE_SIZES['S-225'] * chrome
  // DEVIATION: spec says one function places the title for screen and export; here each side reads the T-206 rows (DFC-1786)
  const seatPx = NOT_STORED_DOCUMENT_TITLE_SIZES['S-490'] * NOT_STORED_DOCUMENT_TITLE_SIZES['S-462']
  const dividerGapsPx = DIVIDER_SIDES * NOT_STORED_DOCUMENT_TITLE_SIZES['S-226']
  const scaledInsetPx = (NOT_STORED_DOCUMENT_TITLE_SIZES['S-226'] + seatPx + dividerGapsPx) * chrome
  const x = (band.x + scaledInsetPx + NOT_STORED_DOCUMENT_TITLE_SIZES['S-492']) * ratio
  const y = (band.y + band.height / 2 + titlePx * SETTINGS_CONSTANTS.labelBaseline) * ratio
  const weight = NOT_STORED_DOCUMENT_TITLE_SIZES['S-463']
  return ground + textSvg(x, y, titlePx * ratio, documentTitle, chromeInk(scene), weight)
}

// see EP-3
/** @purity pure */
function rowTitleSvg(
  title: RowTitle,
  panel: ScreenRect,
  settings: DrawnSettings,
  ink: string,
  ratio: number,
): string {
  if (title.label === null || title.label === '') return ''
  const fontSizePx = rowTitleFontPxOf(title.depth, settings)
  const x = (panel.x + title.indentPx) * ratio
  const y = (title.box.y + fontSizePx) * ratio
  return textSvg(x, y, fontSizePx * ratio, title.label, ink)
}

// see EP-3, FR-042
/** @purity pure */
function groupGridLinesSvg(view: ScreenView, scene: ExportScene, ratio: number): string {
  const ink = colourOf('S-165', scene.themeHue, isDarkIn(scene), scene.settings.themeMonochrome)
  return (view.rowTitlePanel.groupGridLines ?? [])
    .map((line) => rectSvg(scaledRect(line, ratio), ink))
    .join('')
}

// see EP-9
/** @purity pure */
function dividerLinesSvg(view: ScreenView, scene: ExportScene, ratio: number): string {
  const ink = colourOf('S-149', scene.themeHue, isDarkIn(scene), scene.settings.themeMonochrome)
  return view.frame.dividers
    .map((divider) => rectSvg(scaledRect(divider.line, ratio), ink))
    .join('')
}

// see IX-11, S-498
/** @purity pure */
function filterCaptionSvg(band: ScreenRect, caption: string | null | undefined, scene: ExportScene, ratio: number): string {
  if (caption === null || caption === undefined || caption === '') return ''
  const fontPx = NOT_STORED_SHOW_ONLY_CHECKED_BAR_SIZES['S-498']
  const x = (band.x + band.width - NOT_STORED_DOCUMENT_TITLE_SIZES['S-226']) * ratio
  const y = (band.y + band.height / 2 + fontPx * SETTINGS_CONSTANTS.labelBaseline) * ratio
  return textSvg(x, y, fontPx * ratio, caption, chromeInk(scene)).replace('<text ', '<text text-anchor="end" ')
}

// see FR-025, FR-080, IX-10, IX-11
/** @purity pure */
export function exportSvg(scene: ExportScene): SvgExport {
  const { regions, screenView, settings } = scene
  const screenWidth = Math.max(1, regions.scheduleCanvas.x + regions.scheduleCanvas.width)
  const canvas = SETTINGS_CONSTANTS.exportCanvas
  const ratio = canvas.width / screenWidth
  const screenHeight = Math.max(1, regions.scheduleCanvas.y + regions.scheduleCanvas.height)
  // TRAP: ceil the 0.01-rounded height; a raw ceil turns float noise into one more pixel row.
  const grownHeight = Math.ceil(Number(rounded(screenHeight * ratio)))
  const height = Math.max(canvas.height, grownHeight)
  if (height > SETTINGS_CONSTANTS.exportCanvasHeightCap) {
    return { ok: false, fault: { reason: 'tooTall' } }
  }

  const titles = screenView.rowTitlePanel.titles
  const panel = regions.rowTitlePanel
  const pinned = screenView.rowTitlePanel.pinnedTitles
  // see FR-039, T-252
  const drawn = drawnSettingsOf(settings)
  const ink = chromeInk(scene)
  const drawnHere =
    appHeaderSvg(regions.appHeader, screenView.appHeaderItems.documentTitle, scene, ratio) +
    filterCaptionSvg(regions.appHeader, screenView.showOnlyCheckedCaption, scene, ratio) +
    rectSvg(scaledRect(panel, ratio), chromeGround(scene)) +
    pinned.map((title) => rowTitleSvg(title, panel, drawn, ink, ratio)).join('') +
    titles.map((title) => rowTitleSvg(title, panel, drawn, ink, ratio)).join('') +
    groupGridLinesSvg(screenView, scene, ratio) +
    dividerLinesSvg(screenView, scene, ratio)

  const width = canvas.width
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${rounded(width)}"` +
    ` height="${rounded(height)}" viewBox="0 0 ${rounded(width)} ${rounded(height)}">` +
    `<defs><clipPath id="${FIT_CLIP_ID}">` +
    `<rect x="0" y="0" width="${rounded(width)}" height="${rounded(height)}"/>` +
    '</clipPath></defs>' +
    `<g clip-path="url(#${FIT_CLIP_ID})">` +
    rectSvg({ x: 0, y: 0, width, height }, pictureGround(scene)) +
    `<g transform="scale(${ratioText(ratio)})">${scene.svg}</g>` +
    drawnHere +
    '</g></svg>'

  return { ok: true, svg, heightPx: height }
}

// see FR-025, FR-028
/** @purity semi-pure-b */
export async function exportPng(
  rasterizer: Rasterizer,
  scene: ExportScene,
): Promise<ImageExport> {
  const picture = exportSvg(scene)
  if (!picture.ok) return picture
  // TRAP: paint at the picture's own height, not the export canvas setting's.
  const sizePx = {
    widthPx: SETTINGS_CONSTANTS.exportCanvas.width,
    heightPx: picture.heightPx,
  }
  try {
    return { ...picture, png: await rasterizer.rasterizePng(picture.svg, sizePx) }
  } catch {
    // WHY: a rejection's reason cannot be read without its message; report the least claim.
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
// see T-206
export const NOT_STORED_DOCUMENT_TITLE_SIZES: {
  readonly 'S-225': number
  readonly 'S-226': number
  readonly 'S-461': number
  readonly 'S-462': number
  readonly 'S-463': number
  readonly 'S-490': number
  readonly 'S-491': number
  readonly 'S-492': number
} = {
  'S-225': 20,
  'S-226': 12,
  'S-461': 0.05,
  'S-462': 1.92,
  'S-463': 700,
  'S-490': 16.5,
  'S-491': 18,
  'S-492': 1,
}

// see T-206
const NOT_STORED_CHROME_SCALE: {
  readonly 'S-235': number
} = {
  'S-235': 0.6667,
}

// see T-206
const NOT_STORED_TYPEFACES: {
  readonly 'S-246': string
} = {
  'S-246': '"Yu Gothic UI", "Yu Gothic", YuGothic, "BIZ UDPGothic", sans-serif',
}

// see T-206
const NOT_STORED_SHOW_ONLY_CHECKED_BAR_SIZES: {
  readonly 'S-497': number
  readonly 'S-498': number
} = {
  'S-497': 24,
  'S-498': 12,
}
// </generated>
