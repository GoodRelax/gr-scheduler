// ImageExporter -- public entry of this folder.
//
// @unit      UF-39   (docs/spec/05-07-design.md, table T-075)
// @component ImageExporter, layer Adapter (table T-062)
// @purity    semi-pure-b
// @publishes table T-064 row PI-21
//
// The signature of what this file publishes is owned here, not in the
// specification (CR-146). Chapter 6.1 owns the boundary values, and the rule a
// member obeys stays with the requirement that states it.
//
// ⭐ WHAT THE COMPONENT IS FOR. CP-21 in one line: assemble the UI parts table
// T-076 says to draw, drop the `TaskGroup`s that do not fit down the page, and
// declare `Rasterizer`. FR-080 fixes the picture -- the whole screen GRS
// occupies, shrunk by `exportCanvas`'s width divided by the screen's width, the
// SAME ratio on both axes (MUST NOT: two ratios) -- and FR-025 fixes what
// becomes of what will not fit.
//
// ⭐ EVERY ROUTE THAT SENDS THE SCREEN OUT IS ASSEMBLED HERE, AND NOWHERE
// ELSE. WY-2 of table T-041 judges the SVG and the PNG of one state to be the
// same drawing once the watermark layer is set aside, and FR-025 (:3136) says
// the clipboard route differs from the download only in the dialogue it skips
// -- so a second assembly anywhere is a second answer to a question the
// specification says has one. `_source/components.json` draws the picture edge
// of ClipboardGateway (IO-6) to this component rather than to SvgRenderer for
// that reason, and AM-13 of table T-107 is to answer with what `exportSvg`
// returns. ⚠️ What still stands between AM-13 and that call is recorded at the
// member itself, in `agent-api-members.ts`.
//
// ⭐ WHAT ARRIVES, AND WHY NOTHING IS CALLED FOR IT. `_source/components.json`
// draws this component exactly two outgoing edges: to SvgRenderer ("takes the
// SVG string") and to ScreenRenderer ("takes the parts table T-076 lets into
// the export (EP-1 / EP-3)"). ⛔ Both are edges of SUPPLY, not of call.
// `svgFromSchedule` could not be called from here even though 5.3 would allow
// the import: it takes a `Schedule`, a layout, a geometry, a selection and the
// regions, and this component has an edge to none of those. ⚠️ ADR-001 has the
// shell compute the frame once and hand it to everyone who needs it, so asking
// again would repeat the work AND let the exported picture drift from the one
// on the screen -- and sameness is the whole of FR-080.
//
// ⭐ WHAT THE RECEIVED PICTURE ALREADY CARRIES, so that nothing here draws it a
// second time: EP-2 the `Time Ruler`, EP-5 the `Row Area`'s contents, EP-6's
// `Status Line` and `Dual Cursor`, EP-7 the `Watermark`. All four are drawn by
// SvgRenderer from what ScheduleGeometry (CP-6) measured. ⚠️ Whether FR-020's
// question about the watermark was put to the person cannot be seen from here;
// it belongs where the picture is made.
//
// ⛔ WHAT THE EXPORT MUST NOT CONTAIN -- and the half of it this component
// cannot enforce. Table T-076 keeps out the row controls (EP-4), the
// `Properties Panel` (EP-8), the `Scrollbars` (EP-10), the overlaid surfaces
// (EP-11), the pointer, the armed shape, the selection and the marquee (EP-12),
// the dummies (EP-14) and the `Guide Cursor` (EP-6). ⭐ Every one of those that
// reaches this file inside `ScreenView` is left out below -- that IS the
// assembly. ⚠️ But the received SVG is one opaque string: what SvgRenderer
// already drew into it cannot be taken out again. Today that file draws the
// selection outline (FR-030), and ScheduleGeometry carries no cursors yet.
// ⛔ So the picture handed to an export MUST be one rendered for the export:
// the base environment FR-080 defines (table T-025's MC-6 with the properties
// panel and the command palette closed), an empty `Selection`, and no pointer
// -- CU-3 of table T-029 has the `Guide Cursor` follow the pointer, and an
// export has none. That is a fact about the caller. It is reported, not
// checked here, because nothing in a finished string says how it was made.
//
// ⚠️ TWO IMPORTS THE MANUSCRIPT DRAWS NO EDGE FOR: `ScreenRegions` (PI-35) and
// `DocumentSettings` (PI-2). EP-1 needs the `App Header` band's rectangle and
// EP-3 needs the `Row Title Panel`'s, and `ScreenView` carries neither on
// purpose -- "the rectangles of the parts themselves are ScreenRegions' and are
// NOT repeated here" -- while S-81 and S-82 are the export's own size and scale
// and live in the presentation group. ⛔ Neither import adds a source of truth:
// both are the frame values ADR-001 already has the shell compute once and hand
// out, and SvgRenderer and ScreenRenderer each hold both edges. The edge list
// is short by two; that is reported rather than edited from here.
//
// ⚠️ NOTICES AND TOOLTIPS have no row in table T-076 and no row in table T-103
// either, so the table cannot name them. They are not drawn: EP-11's reason --
// a tool's own surfaces are not the schedule -- reaches them, and nothing
// admits them. Recorded because it is a reading, not a quotation.
//
// Nothing outside this folder may import any other file in it
// (Chapter 5.3, MUST NOT), so every name the component publishes
// leaves through here.
//
// The seam declared in this folder is re-exported here because
// the layer that implements it may not reach past this file
// (Chapter 5.3, MUST).

import type { DocumentSettings } from '../../entity/document-model/document-settings/document-settings'
import type { ScreenRect, ScreenRegions } from '../../entity/layout-engine/screen-regions/screen-regions'
import type { RowTitle, ScreenView } from '../screen-renderer/screen-renderer'
import type { Rastering, Rasterizer } from './rasterizer'

export type {
  RasterFault,
  RasterFaultReason,
  RasterSizePx,
  Rastering,
  Rasterizer,
} from './rasterizer'

/**
 * Everything one export is made from.
 *
 * ⭐ Four values, one per thing the export needs to exist: the picture, the
 * rectangles the screen was carved into, the parts drawn around that picture,
 * and the presentation group that sizes the output. ⛔ There is no "which
 * format" and no "which size" among them -- FR-025 forbids asking a person for
 * the size at each export (MUST NOT) and fixes it at S-81.
 */
export interface ExportScene {
  /**
   * The screen's picture, exactly as SvgRenderer made it (PI-19).
   *
   * ⛔ Not re-rendered and not read into: 5.3 forbids reaching inside another
   * component, and FR-080 wants the same picture rather than a second one.
   * ⚠️ Nothing here judges the string. FR-023's untrusted intakes are files,
   * the clipboard and the recovered snapshot; a sibling component's return
   * value is none of them, and inventing a boundary between accepting and
   * refusing it would settle a question no requirement asks.
   */
  readonly svg: string
  /**
   * The rectangles the screen is carved into (PI-35), for the export's base
   * environment: FR-080 (MUST) writes the properties panel and the command
   * palette as CLOSED and gives their room to the schedule, so the regions
   * handed in are the ones that hold with them closed.
   */
  readonly regions: ScreenRegions
  /** The parts outside the schedule (PI-37). Table T-076 decides which survive. */
  readonly screenView: ScreenView
  /** The presentation group: `exportCanvas` (S-81), `exportPngScale` (S-82) and the row-name values FR-085 uses. */
  readonly settings: DocumentSettings
}

/**
 * The assembled picture, and what FR-025 kept out of it.
 *
 * ⭐ Two fields rather than one string, because FR-025 (MUST) has an export
 * tell a person what went undrawn, and that is as true of the route that ends
 * in an SVG as of the one that ends in a PNG.
 */
export interface SvgExport {
  /** IO-3's output: `exportCanvas` wide, `exportCanvas` tall, and what the rasterizer is given. */
  readonly svg: string
  /**
   * The `TaskGroup`s FR-025 kept out, top-most first.
   *
   * ⭐ Ids, not counts. FR-025 (MUST) has the export tell a person how many
   * `TaskGroup`s AND how many `Task`s went undrawn; this component knows which
   * rows it dropped and has no edge to `Schedule`, so it answers with the rows
   * and the count of `Task`s is taken by the side that holds the document.
   * ⚠️ Empty is the ordinary case: FR-025 also fixes that a picture shorter
   * than S-81 leaves the remainder blank (MUST) rather than filling it.
   */
  readonly droppedGroupIds: readonly string[]
}

/**
 * What one export produced.
 *
 * ⭐ The SVG is always here and the PNG may not be, because the two fail
 * differently: assembling the picture is arithmetic over values and cannot
 * fail, while painting it needs a machine. IO-3 (SVG) and IO-4 (PNG) are two
 * rows of table T-024 and FR-025 sends the export to both, so `exportPng`
 * answering with both is one operation and not two: a second assembly would be
 * the way the two outputs come to differ.
 *
 * ⭐ It extends `SvgExport` rather than restating it, so that the string a
 * caller of `exportSvg` receives and the one the rasterizer is handed cannot
 * become two different shapes -- WY-2 of table T-041 compares exactly those two
 * against each other.
 *
 * ⚠️ It is also the next step NT-3a (MUST) owes a person when
 * `RasterFaultReason` is `unsupported`: the picture they asked for exists, and
 * only the raster of it does not.
 */
export interface ImageExport extends SvgExport {
  /** IO-4's output, or the reason there is none. AG-8 of table T-035. */
  readonly png: Rastering
}

/**
 * The ground and the ink the export paints EP-1's band, EP-3's panel and their
 * text with.
 *
 * ⛔ NOT IN THE SPECIFICATION. The screen's own colours for these are the
 * surface's (CP-38) and reach it through a stylesheet, not through a settings
 * key; `_assets/tbl-settings.md` holds no colour for either part, and table
 * T-076 fixes only THAT they are drawn. ⭐ Class C of
 * docs/development-rules/06-pending-decisions.md: display only, no trace in the
 * saved form, and the cost of overturning it is these two lines -- WY-3
 * compares rectangles, and WY-2 compares one export against another, so no
 * judgeable rule reads a colour.
 *
 * ⚠️ The ground is opaque on purpose. The panel is drawn over the received
 * picture, so a bar scrolled past the `Row Area`'s left edge cannot show
 * through the row names.
 *
 * @provisional PD-50
 */
const CHROME_GROUND = '#f3f4f6'
const CHROME_INK = '#111111'

/**
 * The line EP-9 keeps in the export although the control is not kept.
 *
 * ⛔ NOT IN THE SPECIFICATION, and it may not be invented twice. EP-9 (MUST)
 * makes this the SAME one line as `Group Grid Lines` (U-18) and forbids a new
 * settled name and a new settings key for it; FR-042 makes drawing that line a
 * MUST but no table gives its colour, and nothing has drawn one yet. ⭐ When
 * SvgRenderer draws `Group Grid Lines`, this constant is the place that has to
 * be made to agree with it -- one grep for EP-9 finds both.
 *
 * @provisional PD-51
 */
const GRID_LINE_INK = '#d1d5db'

/**
 * Where the `Document Title` sits inside the band: its size and its left inset,
 * each as a fraction of the band's own height.
 *
 * ⛔ NOT IN THE SPECIFICATION. EP-1 (MUST NOT) forbids MOVING the title but no
 * table says where it stands, and `AppHeaderItems` carries the string without a
 * rectangle -- unlike `RowTitle`, which carries its `box`. ⚠️ WY-3 compares the
 * title's bounding rectangle between the screen and the export, so the two
 * sides have to read ONE rectangle in the end; until one exists, this places it
 * from the only measured value the band has (FR-051 measures the header's
 * height; S-116 only caps it), so nothing here is a number a table might be
 * thought to have chosen.
 *
 * @provisional PD-52
 */
const TITLE_FONT_OF_BAND = 0.4
const TITLE_INSET_OF_BAND = 0.5

/** ⚠️ Distinctive because an exported picture may be inlined beside another SVG. */
const FIT_CLIP_ID = 'grs-export-fit'

/**
 * Two places, the rule `svg-renderer.ts` states for the same reason: WY-3
 * (MUST) compares the screen and the export only after ONE rounding rule has
 * been applied to both sides, so the two halves of one picture may not round
 * differently.
 *
 * The grid is NS-3 of table T-231. ⚠️ It is stated in both places rather than
 * shared: `svg-renderer` and `image-exporter` are separate components of table
 * T-062, and folding them together would be an edge neither declares.
 *
 * @purity pure
 */
function rounded(value: number): string {
  return (Math.round(value * 100) / 100).toString()
}

/**
 * ⚠️ A ratio is NOT rounded by the rule above. A coordinate moved by 0.005 has
 * moved by 0.005; a ratio moved by 0.005 moves everything at the far edge of a
 * wide screen by several pixels, which is exactly the difference WY-3 measures.
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
 * ⭐ The ratio is multiplied into what this component draws rather than left to
 * a `transform`, so that the numbers in the finished picture are the ones WY-3
 * compares: "the bounding rectangle on the screen times the ratio". ⚠️ The
 * received picture cannot be treated that way -- see `exportSvg`.
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
 * EP-1: the band and the `Document Title`, and nothing else of the header.
 *
 * ⛔ `Branding`, `Header Commands` (U-35) and `Autosave Status` (U-28) are not
 * drawn -- an image has no hands to press them and no state left to report.
 * ⭐ The band keeps the height it has on the screen (MUST) because the
 * rectangle is the screen's own: everything below it would rise if this drew a
 * shorter one.
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
  const fontSizePx = band.height * TITLE_FONT_OF_BAND * ratio
  const x = (band.x + band.height * TITLE_INSET_OF_BAND) * ratio
  // S-33's baseline correction, applied to the band exactly as
  // `svg-renderer.ts` applies it to a one-line label box.
  const y = (band.y + band.height * settings.labelBaseline) * ratio
  return ground + textSvg(x, y, fontSizePx, documentTitle)
}

/**
 * S-36 is the size a row's name is drawn at, and S-38 enlarges it for a root
 * row (K-38 of table T-104 settles that key as the depth-1 row name's scale).
 *
 * ⚠️ The same rule stands in `row-title-panel.ts`, which cuts the name to the
 * width this size implies (FR-085). Both read S-36 and S-38 from the generated
 * settings; neither holds a number.
 *
 * @purity pure
 */
function rowTitleFontPx(depth: number, settings: DocumentSettings): number {
  return depth === 1 ? settings.rowTitleFont * settings.rowTitleTopScale : settings.rowTitleFont
}

/**
 * EP-3: one name of the `Row Title Tree`.
 *
 * ⛔ The name is NOT cut again here. It arrives already cut by FR-085's rule,
 * and FR-085 (MUST NOT) forbids the room kept for the controls to change with
 * whether they are drawn precisely so that the export and the screen cut in the
 * same place -- cutting twice is how they would stop doing so.
 *
 * ⭐ The vertical numbers are the row's and the horizontal ones are the panel's.
 * SC-1 of table T-031 slaves the panel to the body vertically, which is why
 * `box` holds the row's band; the indent is the panel's own (S-37), taken as
 * the depth's whole multiple the way FR-085 subtracts it.
 *
 * ⭐ The name is anchored to the top of the band rather than centred in it:
 * LF-2 of table T-221 grows a band downward as lanes are added, so a centred
 * name would move whenever a `Task` joined the row.
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
  const x = (panel.x + title.depth * settings.rowTitleIndent) * ratio
  const y = (title.box.y + fontSizePx) * ratio
  return textSvg(x, y, fontSizePx * ratio, title.label)
}

/**
 * EP-9: the boundary line of each `Panel Divider`, and none of the band a hand
 * grabs.
 *
 * ⚠️ Which dividers there are is settled by the frame handed in, not here:
 * FR-080 (MUST) writes the properties panel as closed and gives its room to the
 * schedule, so an export's frame is the one that holds with it closed.
 *
 * @purity pure
 */
function dividerLinesSvg(view: ScreenView, ratio: number): string {
  return view.frame.dividers
    .map((divider) => rectSvg(scaledRect(divider.line, ratio), GRID_LINE_INK))
    .join('')
}

/**
 * The whole picture: FR-080's shrunken screen with table T-076's parts on it,
 * cut down the page by FR-025.
 *
 * ⭐ THE ONE PLACE A PICTURE THAT GOES OUT IS ASSEMBLED, and the reason it is
 * published rather than kept inside `exportPng`: WY-2 of table T-041 judges the
 * SVG and the PNG of one state to be the same drawing once the watermark layer
 * is set aside, and two assemblies are how they would come to differ. FR-025
 * (:3136) says the same of the clipboard route -- only the download dialogue is
 * missing from it, not any part of the picture. Every route that sends the
 * screen out therefore ends here: AM-13 of table T-107, IO-6 of table T-024
 * through CP-24, and IO-3 through the shell.
 *
 * ⚠️ The name is table T-064's (PI-21) and table T-107's (AM-13), so the
 * parts-of-speech rule that would make a `pure` query a noun phrase does not
 * get to rename it; rule 03 section 1 has the specification's spelling win.
 *
 * ⭐ THE RATIO. `exportCanvas`'s width over the screen's width, multiplied into
 * both axes (FR-080, MUST; MUST NOT: one ratio per axis). The width is read
 * with the same expression `svg-renderer.ts` sizes its own picture with, so the
 * frame drawn around that picture cannot disagree with it about how wide the
 * screen was. ⚠️ The screen's HEIGHT is not part of the ratio: FR-080 divides
 * by the width alone, which is why an environment taller than S-81's aspect
 * overflows and FR-025 -- not a second ratio -- decides what happens then.
 * ⛔ Nothing narrower is cut out (MUST NOT) and no margin is added at the edge
 * (MUST NOT) -- either one would take the ratio away from S-81's width over the
 * screen's.
 *
 * ⭐ THE CUT. FR-025 (MUST) drops, from the bottom, the `TaskGroup` that
 * straddles S-81's lower edge and every `TaskGroup` below it, and forbids
 * cutting one in the middle (MUST NOT) or changing the ratio to make it fit
 * (MUST NOT). The rows' own bands are the boundaries the cut may land on, so
 * the clip is set to the top of the first dropped row. ⚠️ A `TaskGroup`
 * already cut off at the TOP of the screen stays cut as the screen has it
 * (MUST): the clip has no upper edge, so nothing here touches it.
 *
 * ⚠️ The received picture is the one thing NOT multiplied through: it is an
 * opaque string, so it goes inside a scaling group. Its own root carries the
 * screen's width and height, which makes it a nested viewport of exactly the
 * area being shrunk.
 *
 * @purity pure
 */
export function exportSvg(scene: ExportScene): SvgExport {
  const { regions, screenView, settings } = scene
  const screenWidth = Math.max(1, regions.scheduleCanvas.x + regions.scheduleCanvas.width)
  const ratio = settings.exportCanvas.width / screenWidth
  // How much of the screen, in the screen's own units, the canvas can hold.
  const fitHeight = settings.exportCanvas.height / ratio

  const titles = screenView.rowTitlePanel.titles
  const firstDroppedAt = titles.findIndex((title) => title.box.y + title.box.height > fitHeight)
  const kept = firstDroppedAt === -1 ? titles : titles.slice(0, firstDroppedAt)
  const dropped = firstDroppedAt === -1 ? [] : titles.slice(firstDroppedAt)
  const firstDropped = dropped[0]
  const cutY = firstDropped === undefined ? fitHeight : Math.min(fitHeight, firstDropped.box.y)

  const panel = regions.rowTitlePanel
  // ⚠️ FR-098 lifts the pinned rows out of the scrolling list and holds them at
  // the top, so the bottom edge does not reach them and the cut above does not
  // count them.
  const pinned = screenView.rowTitlePanel.pinnedTitles
  // ⭐ Painted over the received picture, in this order: the band and the panel
  // cover what the `Row Area` did not clip, and the divider line closes the
  // boundary between them.
  const drawnHere =
    appHeaderSvg(regions.appHeader, screenView.appHeaderItems.documentTitle, settings, ratio) +
    rectSvg(scaledRect(panel, ratio), CHROME_GROUND) +
    pinned.map((title) => rowTitleSvg(title, panel, settings, ratio)).join('') +
    kept.map((title) => rowTitleSvg(title, panel, settings, ratio)).join('') +
    dividerLinesSvg(screenView, ratio)

  const width = settings.exportCanvas.width
  const height = settings.exportCanvas.height
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${rounded(width)}"` +
    ` height="${rounded(height)}" viewBox="0 0 ${rounded(width)} ${rounded(height)}">` +
    `<defs><clipPath id="${FIT_CLIP_ID}">` +
    `<rect x="0" y="0" width="${rounded(width)}" height="${rounded(cutY * ratio)}"/>` +
    '</clipPath></defs>' +
    `<g clip-path="url(#${FIT_CLIP_ID})">` +
    `<g transform="scale(${ratioText(ratio)})">${scene.svg}</g>` +
    drawnHere +
    '</g></svg>'

  return { svg, droppedGroupIds: dropped.map((title) => title.groupId) }
}

/**
 * Export the screen as an image (FR-025, and the picture FR-080 defines).
 *
 * ⭐ Why the failure is a value and not a throw: FR-028 forbids the exception
 * (MUST NOT) and AG-8 of table T-035 requires a caller to receive a failed
 * image AS a value. This is the last place inside the app that can turn a
 * rejected promise back into one, so it does, and every caller may rely on it.
 * ⚠️ Trusting the seam's own promise instead would leave a requirement's
 * guarantee in a file this component does not own.
 *
 * ⭐ The pixel size is S-81 multiplied by S-82 (MUST: the scale is chosen from
 * S-82's values; MUST NOT: the size is not chosen at each export). Both values
 * come from the document, so the same JSON gives the same output -- which is
 * the reason FR-025's RATIONALE gives for saving them at all.
 *
 * ⚠️ The seam comes first because it is what the shell supplies once at wiring
 * time, while the scene is what differs from call to call.
 *
 * @purity semi-pure-b
 */
export async function exportPng(
  rasterizer: Rasterizer,
  scene: ExportScene,
): Promise<ImageExport> {
  const picture = exportSvg(scene)
  const scale = scene.settings.exportPngScale
  const sizePx = {
    widthPx: scene.settings.exportCanvas.width * scale,
    heightPx: scene.settings.exportCanvas.height * scale,
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
