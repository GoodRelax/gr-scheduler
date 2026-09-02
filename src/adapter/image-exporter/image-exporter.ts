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
// T-076 says to draw, refuse the whole picture when it will not fit down the
// page, and declare `Rasterizer`. FR-080 fixes the picture -- the whole screen
// GRS occupies, shrunk by `exportCanvas`'s width divided by the screen's
// width, the SAME ratio on both axes (MUST NOT: two ratios) -- and FR-025
// fixes what becomes of what will not fit: nothing is drawn at all (CR-337,
// 2026-09-02), where until then the `TaskGroup`s that did not fit were dropped
// down the page.
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
// already drew into it cannot be taken out again. ⭐ EP-12's own marks are no
// longer among the things that could arrive: told which picture it is making,
// that file now refuses both the selection outline (FR-030) and DC-8's mark
// for the side of the `Dual Cursor` that is following, whatever it is handed
// (D-52). ⚠️ ScheduleGeometry now carries CU-2's two lines, which is a gain
// rather than a loss: EP-6 (MUST) wants them IN the export. CU-3's guide
// cursor is still not carried at all.
// ⛔ So the picture handed to an export MUST STILL be one rendered for the
// export: the base environment FR-080 defines (table T-025's MC-6 with the
// properties panel and the command palette closed), no pointer -- CU-3 of
// table T-029 has the `Guide Cursor` follow the pointer, and an export has
// none -- and SvgRenderer told which picture it is making, since EP-14's
// dummies hang on the Task being unstarted and no other argument can suppress
// them. That is a fact about the caller. It is reported, not checked here,
// because nothing in a finished string says how it was made.
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
 * Why `exportSvg` (and therefore `exportPng`) answers with no picture at all.
 *
 * ⭐ ONE REASON, BECAUSE FR-025 NOW ADMITS ONLY ONE. Grown to `S-81`'s width and
 * however tall the screen wants, the picture either fits inside `S-217`'s
 * ceiling or it does not; there is no second way this component refuses one
 * (CR-337, the reader's ruling of 2026-09-02 「1600x4096 のサイズに収まらなかっ
 * たエラーにして、png, svg の出力を止めろ」). ⚠️ The row of table T-233 this
 * reads as is `RS-43` -- `frame-loop.ts` is where that mapping is made, not
 * here: this folder answers in a classification (AG-8's own shape), never in
 * the words NT-1 and NT-3a compose.
 */
export interface ImageExportFault {
  readonly reason: 'tooTall'
}

/**
 * The picture itself, once FR-025 has decided one may be drawn.
 *
 * ⭐ Two fields rather than one string, because `exportPng` paints from the
 * height this settled on (see `heightPx`) and a second arithmetic on the far
 * side is how the raster and the picture would come to be different sizes.
 */
interface SvgPicture {
  /** IO-3's output: `exportCanvas` wide, and as tall as `heightPx`. */
  readonly svg: string
  /**
   * The height FR-025 grew the picture to.
   *
   * ⭐ `S-81`'s height at the least and `S-217`'s ceiling at the most. FR-025
   * (MUST) fixes the WIDTH at `S-81`'s and lets the height grow until the
   * picture fits, so the width is still the settings' own value and needs no
   * member -- this is the one of the two that varies (the reader's ruling of
   * 2026-09-02, 「収まらない場合は縦の 900 を延ばせ」).
   * ⛔ Published rather than worked out again by the caller: `exportPng` paints
   * at this height times `S-82`, and a second arithmetic is how the raster and
   * the picture would come to be different sizes.
   */
  readonly heightPx: number
}

/**
 * What `exportSvg` answers with: the picture FR-080 shrinks and table T-076
 * assembles, or the one reason CR-337 lets it refuse to draw at all.
 *
 * ⭐ A DISCRIMINATED UNION, AND NOT A THIRD "PARTIAL" SHAPE. FR-025 (MUST NOT)
 * forbids drawing part of a picture, so there is no member here for a dropped
 * row or a cut height any more -- either the whole screen is in the picture, or
 * there is no picture. ⛔ Until CR-337 this carried `droppedGroupIds`, the rows
 * FR-025 cut from the bottom; that rule is gone (2026-09-02) and so is the
 * field it existed for. D-201 ("落とした件数を 2 つ運べない") closes for the
 * same reason: nothing is dropped, so there is no count left to carry.
 */
export type SvgExport =
  | ({ readonly ok: true } & SvgPicture)
  | { readonly ok: false; readonly fault: ImageExportFault }

/**
 * What one export produced.
 *
 * ⭐ The SVG and the PNG fail differently, and this type keeps the two apart.
 * `ok: false` at the top is FR-025's own refusal (CR-337): the picture does not
 * fit `S-217` and neither IO-3 nor IO-4 has anything to show, so the rasterizer
 * is never even asked. ⚠️ `ok: true` with `png.ok: false` is the OTHER failure,
 * `RasterFault` (IF-6): the picture exists and only painting it did not
 * succeed -- AG-8 of table T-035 is the next step NT-3a owes a person then,
 * with IO-3 (`svg`) left as the way out.
 *
 * ⭐ The success branch carries `SvgPicture` rather than restating it, so that
 * the string a caller of `exportSvg` receives and the one the rasterizer is
 * handed cannot become two different shapes -- WY-2 of table T-041 compares
 * exactly those two against each other.
 */
export type ImageExport =
  | ({ readonly ok: true } & SvgPicture & { readonly png: Rastering })
  | { readonly ok: false; readonly fault: ImageExportFault }

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
  // S-33's baseline correction, taken against the BAND. ⚠️ No longer the way
  // `svg-renderer.ts` anchors a name label: table T-012's closing paragraph
  // calls S-33 「字形の中でのずれ」, so that file now multiplies the FONT by it
  // and measures from the middle of a box one line high. ⛔ The same reading
  // is not carried over here on its own, because no requirement says where in
  // this band the title stands -- the case that measures it asserts only that
  // it is inside the band, and says in as many words that the specification
  // fixes no offset. Changing it would be a value invented here. Reported.
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
  // ⭐ THE INDENT `RowTitle` CARRIES, not the product worked out again here.
  // It is the same number FR-085 subtracted before cutting the name, and it
  // is what the screen draws (CR-290) -- the three used to be three sums.
  const x = (panel.x + title.indentPx) * ratio
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
 * or no picture at all once FR-025's ceiling is passed (CR-337).
 *
 * ⭐ THE ONE PLACE A PICTURE THAT GOES OUT IS ASSEMBLED, and the reason it is
 * published rather than kept inside `exportPng`: WY-2 of table T-041 judges the
 * SVG and the PNG of one state to be the same drawing once the watermark layer
 * is set aside, and two assemblies are how they would come to differ. FR-025
 * (:3136) says the same of the clipboard route -- only the download dialogue is
 * missing from it, not any part of the picture. Every route that sends the
 * screen out therefore ends here: AM-13 of table T-107, IO-6 of table T-024
 * through CP-24, and IO-3 through the shell -- and the refusal below reaches
 * all three the same way, by reaching every one of them.
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
 * ⭐⭐ THE HEIGHT GROWS DOWNWARD TO A CEILING (CR-333, the reader's ruling of
 * 2026-09-02 「収まらない場合は縦の 900 を延ばせ」). FR-025 (MUST) fixes the
 * WIDTH at S-81's and has the height grow until the picture fits -- S-81's
 * height is the floor rather than the ceiling -- and lets it grow no further
 * than S-217 (`exportCanvasHeightCap`, MUST). ⚠️ A picture shorter than S-81's
 * height still leaves the rest blank (MUST) and no row is added to fill it
 * (MUST NOT), which is why the floor is a floor and not simply the fit.
 * ⚠️ The ceiling is not a taste: the picture grows with the screen, and a
 * screen tall enough to reach 28,000px is where a machine stops painting.
 *
 * ⭐⭐ PAST THE CEILING, NOTHING IS DRAWN AT ALL (CR-337, the reader's ruling of
 * 2026-09-02 「1600x4096 のサイズに収まらなかったエラーにして、png, svg の出力
 * を止めろ」). ⛔ UNTIL 2026-09-02 THE PICTURE WAS STILL DRAWN, cut down the page
 * by dropping, from the bottom, the `TaskGroup` that straddled the lower edge
 * and every `TaskGroup` below it -- FR-025 now forbids drawing any part of a
 * picture that does not fit (MUST NOT), so that rule and the row it needed
 * (`SvgExport.droppedGroupIds`) are both gone: there is nothing left to cut a
 * clip around, because there is no picture. ⚠️ A `TaskGroup` already cut off at
 * the TOP of the screen still stays cut as the screen has it (MUST) -- that is
 * the screen's own doing, not a fit this function judges.
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
  // ⭐ The whole screen, measured the way the width above is measured, so the
  // two axes cannot disagree about where the screen ends.
  const screenHeight = Math.max(1, regions.scheduleCanvas.y + regions.scheduleCanvas.height)
  // FR-025 (MUST): S-81's height is the floor and the shrunken screen is what
  // the picture wants to grow to.
  const wantedHeight = Math.max(settings.exportCanvas.height, screenHeight * ratio)
  // FR-025 (MUST, CR-337): past S-217 there is no picture, not a shorter one.
  if (wantedHeight > settings.exportCanvasHeightCap) {
    return { ok: false, fault: { reason: 'tooTall' } }
  }
  const height = wantedHeight

  const titles = screenView.rowTitlePanel.titles
  const panel = regions.rowTitlePanel
  // ⚠️ FR-098 lifts the pinned rows out of the scrolling list and holds them at
  // the top; both groups are drawn in full now that nothing is dropped.
  const pinned = screenView.rowTitlePanel.pinnedTitles
  // ⭐ Painted over the received picture, in this order: the band and the panel
  // cover what the `Row Area` did not clip, and the divider line closes the
  // boundary between them.
  const drawnHere =
    appHeaderSvg(regions.appHeader, screenView.appHeaderItems.documentTitle, settings, ratio) +
    rectSvg(scaledRect(panel, ratio), CHROME_GROUND) +
    pinned.map((title) => rowTitleSvg(title, panel, settings, ratio)).join('') +
    titles.map((title) => rowTitleSvg(title, panel, settings, ratio)).join('') +
    dividerLinesSvg(screenView, ratio)

  const width = settings.exportCanvas.width
  // ⭐ THE CLIP STAYS, although nothing is dropped any more: it bounds the
  // received picture (an opaque string this function does not measure) to the
  // canvas FR-080 fixed, which is what keeps a screen shorter than the ratio
  // implies from ever painting past `height`. ⚠️ NOT FR-025's cut -- that rule
  // is gone (CR-337) -- this is the ordinary edge of the canvas itself.
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
 * Export the screen as an image (FR-025, and the picture FR-080 defines).
 *
 * ⭐ Why the failure is a value and not a throw: FR-028 forbids the exception
 * (MUST NOT) and AG-8 of table T-035 requires a caller to receive a failed
 * image AS a value. This is the last place inside the app that can turn a
 * rejected promise back into one, so it does, and every caller may rely on it.
 * ⚠️ Trusting the seam's own promise instead would leave a requirement's
 * guarantee in a file this component does not own.
 *
 * ⭐ THE FIRST FAILURE IS `exportSvg`'s OWN (CR-337). When the picture does not
 * fit `S-217`, there is nothing to paint and no seam is asked at all -- IO-4 is
 * refused on exactly the geometry that would have refused IO-3, without ever
 * reaching `Rasterizer`. ⚠️ The SECOND failure is `RasterFault` (IF-6): the
 * picture exists and only painting it did not succeed.
 *
 * ⭐ The pixel size is the picture's own size multiplied by S-82 (MUST: the
 * scale is chosen from S-82's values; MUST NOT: the size is not chosen at each
 * export). The width is S-81's and the height is the one `exportSvg` grew to
 * within S-217 (CR-333). Both settings come from the document, so the same
 * JSON in the same screen gives the same output -- which is the reason
 * FR-025's RATIONALE gives for saving them at all.
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
  if (!picture.ok) return picture
  const scale = scene.settings.exportPngScale
  // ⭐ THE PICTURE'S OWN HEIGHT, NOT S-81's. FR-025 (MUST) grows the height to
  // fit and stops at S-217, so the raster is painted at what `exportSvg`
  // actually drew -- reading the setting again here would paint a 900-unit
  // window onto a picture that is taller than that (CR-333).
  const sizePx = {
    widthPx: scene.settings.exportCanvas.width * scale,
    heightPx: picture.heightPx * scale,
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
