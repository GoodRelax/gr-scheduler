// Assembles the exported picture of the screen and declares the Rasterizer seam.
// @unit      UF-39   (docs/spec/05-07-design.md, table T-075)
// @component ImageExporter, layer Adapter (table T-062)
// @purity    semi-pure-b
// @publishes table T-064 row PI-21

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

export interface ExportScene {
  readonly svg: string
  readonly regions: ScreenRegions
  readonly screenView: ScreenView
  readonly settings: DocumentSettings
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

// STOP: spec does not decide the colours of the export band and panel. Looked in EP-1, EP-3
// @provisional PND-50
const CHROME_GROUND = '#f3f4f6'
const CHROME_INK = '#111111'

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
function textSvg(x: number, y: number, fontSizePx: number, text: string): string {
  return (
    `<text x="${rounded(x)}" y="${rounded(y)}" font-size="${rounded(fontSizePx)}"` +
    ` fill="${CHROME_INK}" xml:space="preserve">${escaped(text)}</text>`
  )
}

// see EP-1
/** @purity pure */
function appHeaderSvg(
  band: ScreenRect,
  documentTitle: string | null,
  settings: DocumentSettings,
  ratio: number,
): string {
  const ground = rectSvg(scaledRect(band, ratio), CHROME_GROUND)
  if (documentTitle === null || documentTitle === '') return ground
  const fontSizePx = NOT_STORED_DOCUMENT_TITLE_SIZES['S-225'] * ratio
  const x = (band.x + NOT_STORED_DOCUMENT_TITLE_SIZES['S-226']) * ratio
  const y = (band.y + band.height * settings.labelBaseline) * ratio
  return ground + textSvg(x, y, fontSizePx, documentTitle)
}

// TRAP: row-title-panel.ts computes the same size; change both together.
/** @purity pure */
function rowTitleFontPx(depth: number, settings: DocumentSettings): number {
  return depth === 1 ? settings.rowTitleFont * settings.rowTitleTopScale : settings.rowTitleFont
}

// see EP-3
/** @purity pure */
function rowTitleSvg(
  title: RowTitle,
  panel: ScreenRect,
  settings: DocumentSettings,
  ratio: number,
): string {
  if (title.label === null || title.label === '') return ''
  const fontSizePx = rowTitleFontPx(title.depth, settings)
  const x = (panel.x + title.indentPx) * ratio
  const y = (title.box.y + fontSizePx) * ratio
  return textSvg(x, y, fontSizePx * ratio, title.label)
}

// see EP-9
/** @purity pure */
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

// see FR-025, FR-080
/** @purity pure */
export function exportSvg(scene: ExportScene): SvgExport {
  const { regions, screenView, settings } = scene
  const screenWidth = Math.max(1, regions.scheduleCanvas.x + regions.scheduleCanvas.width)
  const ratio = settings.exportCanvas.width / screenWidth
  const screenHeight = Math.max(1, regions.scheduleCanvas.y + regions.scheduleCanvas.height)
  const wantedHeight = Math.max(settings.exportCanvas.height, screenHeight * ratio)
  if (wantedHeight > settings.exportCanvasHeightCap) {
    return { ok: false, fault: { reason: 'tooTall' } }
  }
  const height = wantedHeight

  const titles = screenView.rowTitlePanel.titles
  const panel = regions.rowTitlePanel
  const pinned = screenView.rowTitlePanel.pinnedTitles
  const drawnHere =
    appHeaderSvg(regions.appHeader, screenView.appHeaderItems.documentTitle, settings, ratio) +
    rectSvg(scaledRect(panel, ratio), CHROME_GROUND) +
    pinned.map((title) => rowTitleSvg(title, panel, settings, ratio)).join('') +
    titles.map((title) => rowTitleSvg(title, panel, settings, ratio)).join('') +
    dividerLinesSvg(screenView, settings, scene.themeHue, ratio)

  const width = settings.exportCanvas.width
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
    widthPx: scene.settings.exportCanvas.width,
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
} = {
  'S-225': 16,
  'S-226': 12,
}
// </generated>
