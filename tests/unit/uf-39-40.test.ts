// Unit tests for UF-39 `image-exporter.ts` (the public entry, PI-21 of table
// T-064) and UF-40 `rasterizer.ts` (the seam `Rasterizer`, IF-6 of table
// T-065) -- component `ImageExporter` (CP-21 of table T-062), rows UF-39 /
// UF-40 of table T-075 in docs/spec/05-07-design.md.
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these have no node in
// the specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// ⛔ WRITTEN WITHOUT READING THE UNITS' FUNCTION BODIES
// (docs/development-rules/04-verification.md, section 1). What was read: docs/spec/
// for every rule below; the whole of `rasterizer.ts`, which declares types and
// no function; and of `image-exporter.ts` only its head comment, its three
// published interfaces (`ExportScene`, `SvgExport`, `ImageExport`) and the two
// signatures `exportSvg(scene)` and `exportPng(rasterizer, scene)`. Every
// expected value here comes from a requirement, a table or a generated
// constant -- never from the code.
//
// ⭐ SECOND PASS (CR-196). `exportSvg` is a public entry of PI-21 now, so
// IO-3's route is reachable on its own and the half of WY-2 that lives inside
// one unit -- the SVG and the PNG of ONE state being one drawing -- can be
// judged here. The cases added for it are gathered under
// "PI-21 exportSvg" and "boundaries of the SVG route" below; nothing above them
// was rewritten.
//
// The rules these cases answer to:
//   FR-080      the whole screen GRS occupies, shrunk by `exportCanvas`'s width
//               over the screen's width; the SAME ratio on both axes (MUST),
//               never one per axis (MUST NOT); no margin at the edge (MUST
//               NOT); a part that is not drawn leaves its room empty (MUST) and
//               its neighbours do not close up (MUST NOT)
//   table T-041  WY-3: for every part table T-076 draws, the screen's bounding
//               rectangle times the ratio IS the rectangle in the export
//   table T-076  EP-1 .. EP-14, which part of the screen reaches the picture
//   FR-025      the output size is fixed at S-81 and never asked for (MUST
//               NOT); the PNG's pixels are S-81 times S-82; what will not fit
//               goes from the bottom by whole `TaskGroup`s (MUST), never cut
//               through one (MUST NOT), never by changing the ratio (MUST
//               NOT); a picture shorter than S-81 leaves the rest blank (MUST)
//               and no row is added to fill it (MUST NOT); a `TaskGroup`
//               already cut at the TOP of the screen stays cut (MUST); what
//               went undrawn is reported (MUST)
//   table T-024  IO-3 (SVG) and IO-4 (PNG) are two outputs of ONE operation
//   table T-035  AG-8: a failed image comes back as a value
//   FR-028      nothing is thrown across this boundary (MUST NOT)
//   table T-037  NT-1 the notice has to be able to name WHICH item is wrong, so
//               the detail survives; NT-3a the three reasons are kept apart
//               because their next steps differ
//   FR-085      the row name arrives already cut, and is not cut again
//   5.3         the seam declared in UF-40 is re-published by the entry (MUST)
//
// ⭐ Chapter 1.9 (:275) asks a test of a requirement that points at a table to
// be driven by a fixed copy of that table, one case walking every row.
// T_076_ROWS, T_204_S82, T_037_REASONS and T_041_ROWS below are those copies.

import { describe, expect, it } from 'vitest'

import * as imageExporter from '../../src/adapter/image-exporter/image-exporter'
import {
  exportPng,
  exportSvg,
  type ExportScene,
  type SvgExport,
  type RasterFault,
  type RasterFaultReason,
  type RasterSizePx,
  type Rastering,
  type Rasterizer,
} from '../../src/adapter/image-exporter/image-exporter'
import type {
  AppHeaderItems,
  CommandItem,
  PanelDivider,
  RowTitle,
  ScreenFrame,
  ScreenView,
  Scrollbar,
} from '../../src/adapter/screen-renderer/screen-renderer'
import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type {
  ScreenRect,
  ScreenRegions,
} from '../../src/entity/layout-engine/screen-regions/screen-regions'

// ---------------------------------------------------------------------------
// Settings. ⛔ Rule 03 forbids re-typing a value the specification holds, so
// every number comes from SETTINGS_DEFAULTS, which `npm run gen` writes out of
// `docs/spec/_source/settings.json`. Four keys are held there under dotted
// names; the shape `DocumentSettings` publishes nests them.
// ---------------------------------------------------------------------------

const nestedFrom = (flat: Readonly<Record<string, unknown>>): Record<string, unknown> => {
  const built: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(flat)) {
    const dot = key.indexOf('.')
    if (dot < 0) {
      built[key] = value
      continue
    }
    const head = key.slice(0, dot)
    const existing = built[head]
    const group = (typeof existing === 'object' && existing !== null ? existing : {}) as Record<
      string,
      unknown
    >
    group[key.slice(dot + 1)] = value
    built[head] = group
  }
  return built
}

const SETTINGS_BASE = nestedFrom(SETTINGS_DEFAULTS)

const settingsOf = (part: Record<string, unknown> = {}): DocumentSettings =>
  ({ ...SETTINGS_BASE, ...part }) as unknown as DocumentSettings

const SETTINGS = settingsOf()

// ---------------------------------------------------------------------------
// The screen this component is handed. ⭐ Built here from FR-051's and
// FR-052's own arithmetic rather than through `regionsFromScreen` (UF-58):
// that unit's answer is this unit's INPUT, and driving the input from the
// other unit's code would hide a misreading shared by both.
//
// ⚠️ `appHeaderHeight` and `scrollbarThickness` are NOT specification values --
// FR-051 (MUST NOT) keeps both out of the settings and BO-1 of table T-077
// settles them from the environment. No case below asserts either of them.
// ---------------------------------------------------------------------------

interface MeasuredScreen {
  readonly width: number
  readonly height: number
  readonly appHeaderHeight: number
  readonly scrollbarThickness: number
}

/**
 * ⭐ 1000 x 800 on purpose. `exportCanvas` is 16:9 and this screen is 5:4, so a
 * component that used the height for the vertical ratio would answer 1.125
 * where FR-080 (MUST NOT) requires 1.6 on both axes -- the two cannot be told
 * apart on a screen of the export's own shape.
 */
const SCREEN: MeasuredScreen = {
  width: 1000,
  height: 800,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
}

const regionsOf = (
  screen: MeasuredScreen = SCREEN,
  settings: DocumentSettings = SETTINGS,
): ScreenRegions => {
  const header: ScreenRect = { x: 0, y: 0, width: screen.width, height: screen.appHeaderHeight }
  const canvas: ScreenRect = {
    x: 0,
    y: screen.appHeaderHeight,
    width: screen.width,
    height: screen.height - screen.appHeaderHeight,
  }
  // FR-052's expression, verbatim: the canvas less `canvasPadding` (S-56), the
  // two panel widths and the vertical bar is the `Row Area`'s width. U-50 takes
  // the ruler band and the padding off its height, and FR-051's bar after it.
  const rowAreaWidth =
    canvas.width -
    settings.canvasPadding -
    settings.rowTitlePanelWidth -
    settings.propertyPanelWidth -
    screen.scrollbarThickness
  const rowAreaHeight =
    canvas.height - settings.rulerHeight - settings.canvasPadding - screen.scrollbarThickness
  return {
    appHeader: header,
    scheduleCanvas: canvas,
    rowTitlePanel: {
      x: canvas.x,
      y: canvas.y,
      width: settings.rowTitlePanelWidth,
      height: canvas.height,
    },
    timeRuler: {
      x: canvas.x + settings.rowTitlePanelWidth,
      y: canvas.y,
      width: rowAreaWidth,
      height: settings.rulerHeight,
    },
    propertiesPanel: {
      x: canvas.x + canvas.width - settings.propertyPanelWidth,
      y: canvas.y,
      width: settings.propertyPanelWidth,
      height: canvas.height,
    },
    rowArea: {
      x: canvas.x + settings.rowTitlePanelWidth,
      y: canvas.y + settings.rulerHeight,
      width: rowAreaWidth,
      height: rowAreaHeight,
    },
  }
}

const REGIONS = regionsOf()

// ---------------------------------------------------------------------------
// The picture that ARRIVES (PI-19). ⭐ Opaque: nothing here is meant to be
// read, and its one element is a `circle` so that every `rect` and every `text`
// found in the finished export is one this component itself wrote.
// ---------------------------------------------------------------------------

const PICTURE =
  '<svg xmlns="http://www.w3.org/2000/svg" data-from="svg-renderer">' +
  '<circle cx="7" cy="11" r="3"/></svg>'

// ---------------------------------------------------------------------------
// Everything of `ScreenView` that table T-076 keeps OUT. ⭐ Handed in anyway,
// and in its OPEN state: a case can only show that the properties panel (EP-8)
// and the command palette (EP-11) do not reach the picture if they were there
// to be left out.
// ---------------------------------------------------------------------------

const commandOf = (label: string): CommandItem => ({
  icon: 'IC-3',
  isEnabled: true,
  isPressed: false,
  label,
})

const HEADER_COMMAND_LABEL = 'EP-1 header command, U-35, not drawn'
const AUTOSAVE_AT = '2026-08-19T09:00:00Z'
const DOCUMENT_TITLE = 'EP-1 document title, U-27'

const APP_HEADER_ITEMS: AppHeaderItems = {
  documentTitle: DOCUMENT_TITLE,
  autosaveStatus: { kind: 'saved', at: AUTOSAVE_AT },
  commands: [commandOf(HEADER_COMMAND_LABEL)],
  // FR-038 (MUST): the header says which language is on. The same value the
  // view carries -- `ScreenSession.language` (S-99) is where both come from.
  language: 'ja',
}

/**
 * EP-9. The `line` is drawn and the grab `band` is not, so the two are given
 * different rectangles. ⚠️ Taken from the regions rather than written out:
 * FR-051 (MUST NOT) has the band take no width from the `Row Area`, so it
 * straddles the boundary the line sits on.
 */
const dividersOf = (regions: ScreenRegions): readonly PanelDivider[] => {
  const lineAt = (x: number): ScreenRect => ({
    x,
    y: regions.scheduleCanvas.y,
    width: 1,
    height: regions.scheduleCanvas.height,
  })
  const bandAround = (line: ScreenRect): ScreenRect => ({ ...line, x: line.x - 4, width: 8 })
  const titleLine = lineAt(regions.rowTitlePanel.x + regions.rowTitlePanel.width - 1)
  const propsLine = lineAt(regions.propertiesPanel.x)
  return [
    { panel: 'rowTitlePanel', band: bandAround(titleLine), line: titleLine },
    { panel: 'propertiesPanel', band: bandAround(propsLine), line: propsLine },
  ]
}

/** EP-10. SC-4 keeps both on the screen at all times; neither reaches the export. */
const scrollbarsOf = (regions: ScreenRegions): readonly Scrollbar[] => {
  const area = regions.rowArea
  const bar = SCREEN.scrollbarThickness
  return [
    {
      axis: 'horizontal',
      track: { x: area.x, y: area.y + area.height, width: area.width, height: bar },
      thumb: { x: area.x + 30, y: area.y + area.height, width: area.width / 4, height: bar },
    },
    {
      axis: 'vertical',
      track: { x: area.x + area.width, y: area.y, width: bar, height: area.height },
      thumb: { x: area.x + area.width, y: area.y + 30, width: bar, height: area.height / 4 },
    },
  ]
}

const frameOf = (regions: ScreenRegions = REGIONS): ScreenFrame => ({
  isFullScreen: false,
  dividers: dividersOf(regions),
  scrollbars: scrollbarsOf(regions),
})

const DIVIDERS = dividersOf(REGIONS)

const PROPERTIES_HEADING = 'EP-8 properties heading, U-25, not drawn'
const PROPERTY_FIELD_TEXT = 'EP-8 property value, not drawn'
const PALETTE_GROUP_NAME = 'EP-11 palette group, U-34, not drawn'
const PALETTE_ARMED_TEXT = 'EP-11 armed, not drawn'
const MODAL_HEADING = 'EP-11 modal heading, U-30, not drawn'
const DIALOGUE_TEXT = 'EP-11 dialogue message, U-44, not drawn'
const NOTICE_TEXT = 'a notice, which table T-076 gives no row, not drawn'
const TOOLTIP_TEXT = 'a tooltip, which table T-076 gives no row, not drawn'

/** Every string that reaches this component inside a part table T-076 keeps out. */
const NOT_DRAWN_WORDS: readonly string[] = [
  HEADER_COMMAND_LABEL,
  AUTOSAVE_AT,
  PROPERTIES_HEADING,
  PROPERTY_FIELD_TEXT,
  PALETTE_GROUP_NAME,
  PALETTE_ARMED_TEXT,
  MODAL_HEADING,
  DIALOGUE_TEXT,
  NOTICE_TEXT,
  TOOLTIP_TEXT,
]

const rowOf = (
  groupId: string,
  depth: number,
  box: ScreenRect,
  label: string | null = `name of ${groupId}`,
): RowTitle => ({
  groupId,
  depth,
  box,
  label,
  // Nothing is cut here, and the `RowTitle` contract fixes that case as
  // `wholeLabel === label` with `isLabelTruncated` false.
  wholeLabel: label,
  isLabelTruncated: false,
  expander: { canOpen: true, canClose: true },
  isPinned: false,
  isSelected: false,
})

const viewOf = (
  titles: readonly RowTitle[],
  part: Partial<ScreenView> = {},
  pinnedTitles: readonly RowTitle[] = [],
): ScreenView => ({
  // S-99. UF-39 draws no words of its own, so which of the two it is cannot
  // reach the picture; the member is filled because `ScreenView` requires it.
  language: 'ja',
  frame: frameOf(),
  appHeaderItems: APP_HEADER_ITEMS,
  rowTitlePanel: { pinnedTitles, titles },
  propertiesPanel: {
    showing: 'selection',
    heading: PROPERTIES_HEADING,
    isSubjectGone: false,
    fields: [{ row: 'PR-1', name: 'name', text: PROPERTY_FIELD_TEXT, isEditable: true }],
  },
  commandPalette: {
    box: { x: 300, y: 300, width: 240, height: 320 },
    isPointerOver: false,
    groups: [{ name: PALETTE_GROUP_NAME, commands: [commandOf('EP-11 palette command')] }],
    armedText: PALETTE_ARMED_TEXT,
  },
  openModal: { surface: 'Help Modal', heading: MODAL_HEADING, commands: [] },
  notices: [{ manner: 'NT-3a', mannerText: '', text: NOTICE_TEXT, nextSteps: ['retry'], affectedCount: null }],
  // NT-7 of table T-037: `null` while nothing is waiting to be answered.
  confirmation: null,
  dialogueField: {
    messages: [
      { sequence: 1, author: 'someone', text: DIALOGUE_TEXT, settledAt: '2026-08-19T09:00:00Z' },
    ],
  },
  tooltips: [{ anchor: { kind: 'rowTitle', groupId: 'g1' }, text: TOOLTIP_TEXT }],
  ...part,
})

// ---------------------------------------------------------------------------
// The seam. ⛔ `Rasterizer` is used through the ENTRY here and nowhere else:
// Chapter 5.3 (MUST) has the entry re-publish the interface declared in UF-40,
// precisely so that the outside never reaches past `image-exporter.ts`. These
// declarations are what `npm run typecheck` reads that MUST off.
// ---------------------------------------------------------------------------

const PNG_BYTES = Uint8Array.from([0x89, 0x50, 0x4e, 0x47])

interface Watched {
  readonly rasterizer: Rasterizer
  readonly calls: { svg: string; sizePx: RasterSizePx }[]
}

const watchedRasterizer = (answer: Rastering = { ok: true, pngBytes: PNG_BYTES }): Watched => {
  const calls: { svg: string; sizePx: RasterSizePx }[] = []
  return {
    calls,
    rasterizer: {
      rasterizePng: (svg: string, sizePx: RasterSizePx): Promise<Rastering> => {
        calls.push({ svg, sizePx })
        return Promise.resolve(answer)
      },
    },
  }
}

/**
 * A seam whose promise rejects. ⛔ Its own contract forbids that, but LR-5 puts
 * the implementation (CP-31) in another layer, so FR-028's guarantee may not
 * rest on the far side keeping its word.
 */
const rejectingRasterizer = (reason: unknown): Rasterizer => ({
  rasterizePng: (): Promise<Rastering> => Promise.reject(reason),
})

/** A seam that throws before it ever returns a promise. */
const throwingRasterizer = (reason: unknown): Rasterizer => ({
  rasterizePng: (): Promise<Rastering> => {
    throw reason
  },
})

/** Every reason a seam in another layer might reject or throw with. */
const EVERY_REASON: readonly { readonly why: string; readonly reason: unknown }[] = [
  { why: 'an Error', reason: new Error('SecurityError: tainted canvas') },
  { why: 'a string', reason: 'no canvas here' },
  { why: 'undefined', reason: undefined },
  { why: 'null', reason: null },
  { why: 'an object that is not an Error', reason: { name: 'SecurityError' } },
]

// ---------------------------------------------------------------------------
// Fixed copies of the tables these cases are driven by.
// ---------------------------------------------------------------------------

/**
 * Table T-204's row `S-82` -- the two values `exportPngScale` admits, in the
 * table's own order. FR-025 (MUST) lets the scale be chosen from these and
 * no others.
 */
const T_204_S82 = [1, 2] as const

/**
 * `RasterFaultReason`'s three values with the next step each one leaves, which
 * is WHY there are three: NT-3a of table T-037 (MUST) makes a failure notice
 * carry what can be done next, and these three do not share one.
 */
const T_037_REASONS: readonly { readonly reason: RasterFaultReason; readonly nextStep: string }[] =
  [
    { reason: 'unsupported', nextStep: 'the SVG of IO-3 is still there' },
    { reason: 'tooLarge', nextStep: "the smaller of exportPngScale's two values" },
    { reason: 'rasterFailed', nextStep: 'try again' },
  ]

/**
 * Table T-041 -- the three judgements of WYSIWYG. ⚠️ Only `WY-3` is inside one
 * unit's reach: `WY-1` runs a write, an initialisation and a read, and `WY-2`
 * compares two whole exports made in one environment. Both are named here so
 * that the two left out are left out on purpose.
 */
const T_041_ROWS = [
  { id: 'WY-1', reach: 'whole product -- write, initialise, read back' },
  { id: 'WY-2', reach: 'whole product -- two exports of one document' },
  { id: 'WY-3', reach: 'this unit -- the screen rectangle times the ratio' },
] as const

// ---------------------------------------------------------------------------
// Reading the assembled picture back. ⚠️ Attribute order, decimal places and
// whitespace are exactly what FR-080 says a comparison may not depend on, so
// nothing below matches on the text of an element; the numbers are parsed and
// compared as numbers.
// ---------------------------------------------------------------------------

interface Drawn {
  readonly tag: string
  readonly attrs: Readonly<Record<string, string>>
}

const attrsOf = (source: string): Record<string, string> => {
  const attrs: Record<string, string> = {}
  const pattern = /([A-Za-z_:][-A-Za-z0-9_:.]*)="([^"]*)"/g
  let found = pattern.exec(source)
  while (found !== null) {
    attrs[found[1] ?? ''] = found[2] ?? ''
    found = pattern.exec(source)
  }
  return attrs
}

const elementsOf = (svg: string): Drawn[] => {
  const found: Drawn[] = []
  const pattern = /<([A-Za-z][-A-Za-z0-9]*)((?:[^<>"]|"[^"]*")*)\/?>/g
  let hit = pattern.exec(svg)
  while (hit !== null) {
    found.push({ tag: hit[1] ?? '', attrs: attrsOf(hit[2] ?? '') })
    hit = pattern.exec(svg)
  }
  return found
}

interface DrawnText {
  readonly attrs: Readonly<Record<string, string>>
  readonly content: string
}

const textsOf = (svg: string): DrawnText[] => {
  const found: DrawnText[] = []
  const pattern = /<text((?:[^<>"]|"[^"]*")*)>([\s\S]*?)<\/text>/g
  let hit = pattern.exec(svg)
  while (hit !== null) {
    found.push({ attrs: attrsOf(hit[1] ?? ''), content: hit[2] ?? '' })
    hit = pattern.exec(svg)
  }
  return found
}

const num = (attrs: Readonly<Record<string, string>>, name: string): number =>
  Number.parseFloat(attrs[name] ?? 'NaN')

const rectOf = (element: Drawn): ScreenRect => ({
  x: num(element.attrs, 'x'),
  y: num(element.attrs, 'y'),
  width: num(element.attrs, 'width'),
  height: num(element.attrs, 'height'),
})

/**
 * ⚠️ Two places, one tolerance. FR-080 (MUST) has WY-3 compare only after ONE
 * rounding rule is applied to both sides, and Chapter 6.1 -- which the
 * requirement hands the rule to -- does not yet state it. So a case may not
 * assert a number of decimal places; it asserts that the two sides agree to
 * inside a twentieth of a pixel, which no rounding of coordinates can cross.
 */
const TOLERANCE = 0.05

const near = (actual: number, expected: number): boolean =>
  Number.isFinite(actual) && Math.abs(actual - expected) <= TOLERANCE

const sameRect = (actual: ScreenRect, expected: ScreenRect): boolean =>
  near(actual.x, expected.x) &&
  near(actual.y, expected.y) &&
  near(actual.width, expected.width) &&
  near(actual.height, expected.height)

const scaledRect = (rect: ScreenRect, ratio: number): ScreenRect => ({
  x: rect.x * ratio,
  y: rect.y * ratio,
  width: rect.width * ratio,
  height: rect.height * ratio,
})

/** One finished export, with the scene it was made from, ready to be read. */
interface Assembled {
  readonly result: SvgExport
  readonly scene: ExportScene
  readonly ratio: number
  /** How many times the picture that ARRIVED appears, verbatim. */
  readonly pictureCount: number
  /** Everything the component itself wrote: the received picture is taken out first. */
  readonly own: readonly Drawn[]
  readonly rects: readonly Drawn[]
  readonly texts: readonly DrawnText[]
  /** The `clipPath` FR-025's fit is expressed with, or `null` if there is none. */
  readonly clip: ScreenRect | null
  readonly root: Drawn
  /** The single scale factor the received picture is placed under. */
  readonly pictureScales: readonly string[]
}

const CLIP_BLOCK = /<clipPath((?:[^<>"]|"[^"]*")*)>([\s\S]*?)<\/clipPath>/

const assembledOf = (result: SvgExport, scene: ExportScene): Assembled => {
  const parts = result.svg.split(scene.svg)
  const withoutPicture = parts.join('')
  const clipHit = CLIP_BLOCK.exec(withoutPicture)
  const clipRects =
    clipHit === null ? [] : elementsOf(clipHit[2] ?? '').filter((e) => e.tag === 'rect')
  const body = clipHit === null ? withoutPicture : withoutPicture.replace(CLIP_BLOCK, '')
  const own = elementsOf(body)
  const screenWidth = scene.regions.scheduleCanvas.x + scene.regions.scheduleCanvas.width
  return {
    result,
    scene,
    ratio: scene.settings.exportCanvas.width / screenWidth,
    pictureCount: parts.length - 1,
    own,
    rects: own.filter((e) => e.tag === 'rect'),
    texts: textsOf(body),
    clip: clipRects[0] !== undefined && clipRects.length === 1 ? rectOf(clipRects[0]) : null,
    root: own[0] ?? { tag: 'nothing was assembled', attrs: {} },
    // ⭐ `scale(a)` and not `scale(a,b)`: FR-080 (MUST NOT) forbids one ratio
    // per axis, and the received picture is the one thing that cannot carry the
    // ratio in its own numbers, so the transform is where it has to show.
    pictureScales: [...result.svg.matchAll(/scale\(([^)]*)\)/g)].map((m) => (m[1] ?? '').trim()),
  }
}

const sceneOf = (
  view: ScreenView,
  part: Partial<ExportScene> = {},
  regions: ScreenRegions = REGIONS,
): ExportScene => ({
  svg: PICTURE,
  regions,
  screenView: view,
  settings: SETTINGS,
  ...part,
})

const exportedOf = async (scene: ExportScene): Promise<Assembled> => {
  const { rasterizer } = watchedRasterizer()
  return assembledOf(await exportPng(rasterizer, scene), scene)
}

/**
 * The same reading, taken off IO-3's own entry.
 *
 * ⭐ PI-21 publishes `exportSvg` as well since CR-196, and WY-2 of table T-041
 * judges the SVG and the PNG of one state to be the same drawing -- so every
 * reading `exportedOf` supports has to hold of this one too.
 */
const svgOnlyOf = (scene: ExportScene): Assembled => assembledOf(exportSvg(scene), scene)

/**
 * A copy of a scene with every object in it frozen.
 *
 * ⭐ `@purity pure` (R7.1) says the output is decided by the arguments alone and
 * that nothing is written. ⚠️ Rule 04, section 1 records a function that named
 * itself `pure` while rewriting an argument, and a frozen copy is what turns
 * that into a failing case rather than a silent one: a write into a frozen
 * object throws under a module's strict mode.
 */
const deeplyFrozenCopy = (scene: ExportScene): ExportScene => {
  const seen = new Set<unknown>()
  const freeze = (one: unknown): void => {
    if (one === null || typeof one !== 'object' || seen.has(one)) return
    seen.add(one)
    Object.freeze(one)
    for (const inner of Object.values(one as Record<string, unknown>)) freeze(inner)
  }
  const copy = structuredClone(scene) as ExportScene
  freeze(copy)
  return copy
}

const hasRect = (assembled: Assembled, screenRect: ScreenRect): boolean =>
  assembled.rects.some((e) => sameRect(rectOf(e), scaledRect(screenRect, assembled.ratio)))

const saysAnyOf = (assembled: Assembled, words: readonly string[]): boolean =>
  words.some((word) => assembled.result.svg.includes(word))

// ---------------------------------------------------------------------------
// The rows, and where they fall against S-81's bottom edge.
//
// ⭐ FR-025 measures the fit against the SCREEN: the shrunk picture is the
// whole screen times the ratio, so it passes `exportCanvas`'s height exactly
// where the screen passes `exportCanvas.height / ratio`. Every y below is
// stated as a fraction of that limit so that no number here is a guess.
// ---------------------------------------------------------------------------

const RATIO = SETTINGS.exportCanvas.width / SCREEN.width
const FIT_LIMIT = SETTINGS.exportCanvas.height / RATIO

/** Four rows well above the limit, then one that straddles it, then one below. */
const TALL_ROWS: readonly RowTitle[] = [
  rowOf('g1', 1, { x: 0, y: 100, width: SETTINGS.rowTitlePanelWidth, height: 100 }),
  rowOf('g2', 2, { x: 0, y: 200, width: SETTINGS.rowTitlePanelWidth, height: 100 }),
  rowOf('g3', 3, { x: 0, y: 300, width: SETTINGS.rowTitlePanelWidth, height: 100 }),
  rowOf('g4', 1, { x: 0, y: 400, width: SETTINGS.rowTitlePanelWidth, height: 100 }),
  rowOf('g5', 2, { x: 0, y: 500, width: SETTINGS.rowTitlePanelWidth, height: 100 }),
  rowOf('g6', 2, { x: 0, y: 600, width: SETTINGS.rowTitlePanelWidth, height: 100 }),
]
const TALL_KEPT = ['g1', 'g2', 'g3', 'g4']
const TALL_DROPPED = ['g5', 'g6']
/** The top of the first dropped row -- where FR-025 (MUST NOT) puts the cut. */
const TALL_CUT_AT = 500

const TALL_SCENE = sceneOf(viewOf(TALL_ROWS))

// ---------------------------------------------------------------------------
// FR-080 and WY-3 -- the ratio, and what it is multiplied into
// ---------------------------------------------------------------------------

describe('FR-080 -- one ratio, both axes, over the whole screen', () => {
  it('sizes the output at S-81 and starts it at the screen\'s own origin', async () => {
    const assembled = await exportedOf(TALL_SCENE)
    // IO-3 of table T-024 names S-81 of table T-204 as the output's size.
    expect(assembled.root.tag).toBe('svg')
    expect(num(assembled.root.attrs, 'width')).toBe(SETTINGS.exportCanvas.width)
    expect(num(assembled.root.attrs, 'height')).toBe(SETTINGS.exportCanvas.height)
    // FR-080 (MUST NOT): no margin is added at the edge, because a margin
    // would take the ratio off S-81's width over the screen's width. The box
    // starts at the origin and is exactly S-81, so nothing was inset.
    expect(assembled.root.attrs['viewBox']).toBe(
      `0 0 ${SETTINGS.exportCanvas.width} ${SETTINGS.exportCanvas.height}`,
    )
  })

  it('multiplies the SAME ratio into both axes (MUST NOT: one per axis)', async () => {
    const assembled = await exportedOf(TALL_SCENE)
    const band = assembled.rects.find((e) =>
      near(num(e.attrs, 'width'), REGIONS.appHeader.width * RATIO),
    )
    expect(band, 'EP-1: the App Header band is drawn').toBeDefined()
    const drawn = rectOf(band as Drawn)
    // ⭐ The screen is 5:4 and `exportCanvas` is 16:9, so a per-axis ratio would
    // put the band's height at 1.125x its screen height rather than 1.6x.
    expect(drawn.width / REGIONS.appHeader.width).toBeCloseTo(RATIO, 6)
    expect(drawn.height / REGIONS.appHeader.height).toBeCloseTo(RATIO, 6)
  })

  it('places the picture that arrived under ONE scale factor, the ratio', async () => {
    const assembled = await exportedOf(TALL_SCENE)
    expect(assembled.pictureCount, 'the received picture is embedded once').toBe(1)
    expect(assembled.pictureScales.length).toBeGreaterThan(0)
    for (const factor of assembled.pictureScales) {
      // ⛔ `scale(a,b)` would be two ratios, which FR-080 forbids (MUST NOT).
      expect(factor, 'a single factor, not a pair').not.toContain(',')
      expect(Number.parseFloat(factor)).toBeCloseTo(RATIO, 6)
    }
  })

  it('reads the ratio off the WHOLE screen, never a narrower cut-out', async () => {
    // FR-080 (MUST / MUST NOT): what is cut out is the whole screen GRS
    // occupies, never a narrower rectangle. A denominator narrowed to the Row
    // Area, or to the canvas less the panels, would give a bigger ratio.
    const assembled = await exportedOf(TALL_SCENE)
    const screenWidth = REGIONS.scheduleCanvas.x + REGIONS.scheduleCanvas.width
    expect(screenWidth).toBe(SCREEN.width)
    expect(assembled.ratio).toBeCloseTo(SETTINGS.exportCanvas.width / screenWidth, 6)
    const band = assembled.rects.find((e) => near(rectOf(e).x, 0) && near(rectOf(e).y, 0))
    expect(band, 'the band starts at the screen origin').toBeDefined()
    expect(num((band as Drawn).attrs, 'width')).toBeCloseTo(SETTINGS.exportCanvas.width, 1)
  })

  it('changes with `exportCanvas`, which is the only thing that sets the size', async () => {
    // ⭐ Rule 04, section 2: the acceptance test of a value that travels from
    // manuscript is "change one value and the test fails". Halving S-81's width
    // has to halve the ratio, and with it every rectangle drawn.
    const narrow = settingsOf({
      exportCanvas: {
        width: SETTINGS.exportCanvas.width / 2,
        height: SETTINGS.exportCanvas.height,
      },
    })
    const assembled = await exportedOf(sceneOf(viewOf(TALL_ROWS), { settings: narrow }))
    expect(num(assembled.root.attrs, 'width')).toBe(SETTINGS.exportCanvas.width / 2)
    expect(
      hasRect(assembled, REGIONS.appHeader),
      'the band follows the halved ratio',
    ).toBe(true)
  })
})

describe('table T-041 -- which rows of the WYSIWYG judgement one unit can answer', () => {
  it('names all three rows and says which is inside this unit (one case walks the table)', () => {
    expect(T_041_ROWS.map((row) => row.id)).toEqual(['WY-1', 'WY-2', 'WY-3'])
    const here = T_041_ROWS.filter((row) => row.reach.startsWith('this unit'))
    expect(here.map((row) => row.id)).toEqual(['WY-3'])
  })

  it('WY-3: every part table T-076 draws is its screen rectangle times the ratio', async () => {
    const assembled = await exportedOf(TALL_SCENE)
    // EP-1's band and EP-3's panel are the two rectangles this component owns.
    expect(hasRect(assembled, REGIONS.appHeader), 'EP-1 band').toBe(true)
    expect(hasRect(assembled, REGIONS.rowTitlePanel), 'EP-3 panel').toBe(true)
    for (const divider of DIVIDERS) {
      expect(hasRect(assembled, divider.line), `EP-9 ${divider.panel} line`).toBe(true)
    }
  })
})

// ---------------------------------------------------------------------------
// Table T-076 -- one case walks every row (Chapter 1.9 :275)
// ---------------------------------------------------------------------------

/**
 * A fixed copy of table T-076, all fourteen rows in the table's own printed
 * order.
 *
 * `expectation` repeats the table's own "drawn?" column; `holds` is what the
 * finished export has to satisfy for that row to be true. ⭐ The rows whose
 * expectation is `arrives` are drawn by SvgRenderer into the picture this
 * component receives, so what they ask of THIS unit is that it neither add them
 * nor take them away.
 */
const T_076_ROWS: readonly {
  readonly id: string
  readonly part: string
  readonly expectation: 'draw' | 'partly' | 'no' | 'arrives'
  readonly holds: (assembled: Assembled) => boolean
}[] = [
  {
    id: 'EP-1',
    part: 'App Header (U-31): the band and the Document Title (U-27) only',
    expectation: 'partly',
    holds: (a) =>
      hasRect(a, a.scene.regions.appHeader) &&
      a.texts.some((t) => t.content === DOCUMENT_TITLE) &&
      !a.result.svg.includes(HEADER_COMMAND_LABEL) &&
      !a.result.svg.includes(AUTOSAVE_AT),
  },
  {
    id: 'EP-2',
    part: 'Time Ruler (U-19)',
    expectation: 'arrives',
    holds: (a) => a.pictureCount === 1 && !hasRect(a, a.scene.regions.timeRuler),
  },
  {
    id: 'EP-3',
    part: 'Row Title Panel (U-22) and Row Title Tree (U-23)',
    expectation: 'draw',
    holds: (a) =>
      hasRect(a, a.scene.regions.rowTitlePanel) &&
      TALL_KEPT.every((id) => a.texts.some((t) => t.content === `name of ${id}`)),
  },
  {
    id: 'EP-4',
    part: 'Row Expander (U-47) / Row Pin (U-48) / Hidden Group Tab (U-29)',
    expectation: 'no',
    holds: (a) => nothingBeyondTheAccounted(a),
  },
  {
    id: 'EP-5',
    part: "Row Area's contents (U-1 .. U-46)",
    expectation: 'arrives',
    holds: (a) => a.pictureCount === 1 && !hasRect(a, a.scene.regions.rowArea),
  },
  {
    id: 'EP-6',
    part: 'Cursors (U-10): Status Line and Dual Cursor yes, Guide Cursor no',
    expectation: 'arrives',
    holds: (a) => a.pictureCount === 1 && nothingBeyondTheAccounted(a),
  },
  {
    id: 'EP-7',
    part: 'Watermark (U-20), inside the Row Area only',
    expectation: 'arrives',
    holds: (a) => a.pictureCount === 1 && nothingBeyondTheAccounted(a),
  },
  {
    id: 'EP-8',
    part: 'Properties Panel (U-25)',
    expectation: 'no',
    holds: (a) =>
      !hasRect(a, a.scene.regions.propertiesPanel) &&
      !a.result.svg.includes(PROPERTIES_HEADING) &&
      !a.result.svg.includes(PROPERTY_FIELD_TEXT),
  },
  {
    id: 'EP-9',
    part: 'Panel Divider (U-24): the line, not the control',
    expectation: 'partly',
    holds: (a) =>
      a.scene.screenView.frame.dividers.every((d) => hasRect(a, d.line)) &&
      a.scene.screenView.frame.dividers.every((d) => !hasRect(a, d.band)),
  },
  {
    id: 'EP-10',
    part: 'Scrollbars (U-21)',
    expectation: 'no',
    holds: (a) =>
      a.scene.screenView.frame.scrollbars.every(
        (b) => !hasRect(a, b.track) && !hasRect(a, b.thumb),
      ),
  },
  {
    id: 'EP-11',
    part: 'Command Palette (U-26) / modals (U-30) / Dialogue Field (U-44) / Resource Roster (U-49)',
    expectation: 'no',
    holds: (a) =>
      !saysAnyOf(a, [PALETTE_GROUP_NAME, PALETTE_ARMED_TEXT, MODAL_HEADING, DIALOGUE_TEXT]),
  },
  {
    id: 'EP-12',
    part: 'Pointer (U-42) / ArmedShape (U-38) / Selection (U-39) / Marquee (U-40) / Grab (U-43)',
    expectation: 'no',
    holds: (a) => nothingBeyondTheAccounted(a),
  },
  {
    id: 'EP-13',
    part: 'Schedule Canvas (U-32) / Canvas Overlays (U-33) -- the containers themselves',
    expectation: 'no',
    holds: (a) => !hasRect(a, a.scene.regions.scheduleCanvas),
  },
  {
    id: 'EP-14',
    part: 'Actual Operation Dummy (U-52)',
    expectation: 'no',
    holds: (a) => nothingBeyondTheAccounted(a),
  },
]

/**
 * What table T-076 leaves in the picture, counted.
 *
 * ⭐ The rows that say NOT drawn cannot each be checked by naming a rectangle --
 * a part that is absent leaves nothing to look for. So they are checked
 * together: EP-1 contributes one band, EP-3 one panel ground, EP-9 one line per
 * divider, and no other rectangle may be there. Text is the same: the
 * `Document Title` and one name per kept row.
 */
const nothingBeyondTheAccounted = (assembled: Assembled): boolean => {
  const view = assembled.scene.screenView
  const bandAndPanel = 2
  const expectedRects = bandAndPanel + view.frame.dividers.length
  const rows = [...view.rowTitlePanel.pinnedTitles, ...view.rowTitlePanel.titles]
  const keptWithLabel = rows.filter(
    (row) => row.label !== null && !assembled.result.droppedGroupIds.includes(row.groupId),
  )
  const expectedTexts =
    keptWithLabel.length +
    (view.appHeaderItems.documentTitle !== null && view.appHeaderItems.documentTitle !== ''
      ? 1
      : 0)
  return assembled.rects.length === expectedRects && assembled.texts.length === expectedTexts
}

describe('table T-076 -- which UI parts reach the picture', () => {
  it('holds every row of the fixed copy (one case walks all fourteen)', async () => {
    const assembled = await exportedOf(TALL_SCENE)
    expect(T_076_ROWS).toHaveLength(14)
    for (const row of T_076_ROWS) {
      expect(row.holds(assembled), `${row.id} (${row.expectation}): ${row.part}`).toBe(true)
    }
  })

  it('draws nothing for a notice or a tooltip either', async () => {
    // ⚠️ A READING, not a quotation. Neither has a row in table T-076 and
    // neither has a row in table T-103, so the table cannot name them; EP-11's
    // reason -- a tool's own surfaces are not the schedule -- reaches them.
    const assembled = await exportedOf(TALL_SCENE)
    expect(assembled.result.svg).not.toContain(NOTICE_TEXT)
    expect(assembled.result.svg).not.toContain(TOOLTIP_TEXT)
  })

  it('lets no word of a part it does not draw into the picture at all', async () => {
    const assembled = await exportedOf(TALL_SCENE)
    for (const word of NOT_DRAWN_WORDS) {
      expect(assembled.result.svg.includes(word), word).toBe(false)
    }
  })
})

// ---------------------------------------------------------------------------
// FR-080 -- the room of a part that is not drawn stays empty (MUST) and its
// neighbours do not close up (MUST NOT)
// ---------------------------------------------------------------------------

describe('FR-080 -- a part left out leaves a gap, it does not move its neighbours', () => {
  it('keeps the App Header band at its screen height (MUST NOT: squeeze it)', async () => {
    const assembled = await exportedOf(TALL_SCENE)
    const band = assembled.rects.find((e) => near(rectOf(e).y, 0))
    expect(band).toBeDefined()
    expect(rectOf(band as Drawn).height).toBeCloseTo(REGIONS.appHeader.height * RATIO, 1)
  })

  it('draws the same geometry whether or not the parts it leaves out are there', async () => {
    // ⭐ This IS the MUST NOT: the room of the scrollbars, the expanders, the
    // properties panel and the palette is the screen's own, so taking them out
    // of `ScreenView` may not move one drawn rectangle.
    const withEverything = await exportedOf(TALL_SCENE)
    const bare = await exportedOf(
      sceneOf(
        viewOf(
          TALL_ROWS.map((row) => ({ ...row, expander: null, isPinned: false })),
          {
            frame: { isFullScreen: false, dividers: DIVIDERS, scrollbars: [] },
            propertiesPanel: null,
            commandPalette: null,
            openModal: null,
            notices: [],
            dialogueField: null,
            tooltips: [],
          },
        ),
      ),
    )
    const geometry = (a: Assembled): string =>
      a.rects
        .map((e) => rectOf(e))
        .map((r) => [r.x, r.y, r.width, r.height].map((v) => v.toFixed(2)).join(','))
        .sort()
        .join(' | ')
    expect(geometry(bare)).toBe(geometry(withEverything))
  })

  it('does not move the Document Title when the items beside it go away', async () => {
    // EP-1 of table T-076 (MUST NOT): the `Document Title` may not be moved,
    // and FR-080 forbids closing up the room of what is not drawn.
    // ⚠️ WHERE it stands is not in any table (recorded as PD-52), so this case
    // asserts only that it does not MOVE -- which is what the row states.
    const withItems = await exportedOf(TALL_SCENE)
    const withoutItems = await exportedOf(
      sceneOf(
        viewOf(TALL_ROWS, {
          appHeaderItems: {
            documentTitle: DOCUMENT_TITLE,
            autosaveStatus: { kind: 'saving' },
            commands: [],
            language: 'ja',
          },
        }),
      ),
    )
    const titleOf = (a: Assembled): DrawnText | undefined =>
      a.texts.find((t) => t.content === DOCUMENT_TITLE)
    const before = titleOf(withItems)
    const after = titleOf(withoutItems)
    expect(before, 'EP-1 draws the Document Title').toBeDefined()
    expect(after).toBeDefined()
    expect(num((after as DrawnText).attrs, 'x')).toBeCloseTo(
      num((before as DrawnText).attrs, 'x'),
      6,
    )
    expect(num((after as DrawnText).attrs, 'y')).toBeCloseTo(
      num((before as DrawnText).attrs, 'y'),
      6,
    )
  })

  it('stands the Document Title inside the band it belongs to', async () => {
    const assembled = await exportedOf(TALL_SCENE)
    const title = assembled.texts.find((t) => t.content === DOCUMENT_TITLE)
    expect(title).toBeDefined()
    const band = scaledRect(REGIONS.appHeader, RATIO)
    const x = num((title as DrawnText).attrs, 'x')
    const y = num((title as DrawnText).attrs, 'y')
    expect(x).toBeGreaterThanOrEqual(band.x)
    expect(x).toBeLessThan(band.x + band.width)
    expect(y).toBeGreaterThan(band.y)
    expect(y).toBeLessThanOrEqual(band.y + band.height)
  })
})

// ---------------------------------------------------------------------------
// EP-3 and FR-085 -- the Row Title Panel and the names on it
// ---------------------------------------------------------------------------

describe('table T-076 EP-3 -- the Row Title Panel and its names', () => {
  it('gives the panel the screen\'s width (MUST NOT: a width of its own)', async () => {
    // EP-3 (MUST NOT): no width of the export's own. One would put FR-085's
    // truncation in a different place than the screen puts it.
    const assembled = await exportedOf(TALL_SCENE)
    const panel = assembled.rects.find((e) =>
      near(num(e.attrs, 'height'), REGIONS.rowTitlePanel.height * RATIO),
    )
    expect(panel).toBeDefined()
    expect(rectOf(panel as Drawn).width).toBeCloseTo(SETTINGS.rowTitlePanelWidth * RATIO, 1)
  })

  it('writes each name exactly as it arrived (FR-085 already cut it)', async () => {
    // FR-085 (MUST NOT): the room kept for the row controls does not change
    // with whether they are drawn -- exactly because the export does not draw
    // them (EP-4). So the name arrives cut, and may not be cut again here.
    const cut = 'a name FR-085 already cut here'
    const assembled = await exportedOf(
      sceneOf(
        viewOf([
          rowOf('g1', 1, { x: 0, y: 100, width: SETTINGS.rowTitlePanelWidth, height: 40 }, cut),
        ]),
      ),
    )
    expect(assembled.texts.map((t) => t.content)).toContain(cut)
  })

  it('puts each name inside its own row\'s band, in the rows\' own order (SC-1)', async () => {
    // SC-1 slaves the panel to the body vertically, so a name belongs to the
    // band `RowTitle.box` gives it, shrunk by the ratio.
    //
    // ⚠️ WHERE INSIDE THE BAND the baseline sits is NOT asserted. `labelBaseline`
    // (S-33) is a baseline correction and no requirement says how
    // it is applied, so the specification does not fix the offset -- see the
    // case below, which asserts only what holds under any such rule.
    const assembled = await exportedOf(TALL_SCENE)
    const yOf = (id: string): number => {
      const found = assembled.texts.find((t) => t.content === `name of ${id}`)
      expect(found, id).toBeDefined()
      return num((found as DrawnText).attrs, 'y')
    }
    const boxOf = (id: string): ScreenRect =>
      (TALL_ROWS.find((row) => row.groupId === id) as RowTitle).box
    for (const id of TALL_KEPT) {
      const band = scaledRect(boxOf(id), RATIO)
      expect(yOf(id), id).toBeGreaterThan(band.y)
      expect(yOf(id), id).toBeLessThanOrEqual(band.y + band.height)
    }
    const drawnOrder = TALL_KEPT.map((id) => yOf(id))
    expect(drawnOrder, 'the names run down the panel in the rows\' order').toEqual(
      [...drawnOrder].sort((left, right) => left - right),
    )
  })

  it('keeps the box offset between two rows the panel treats alike', async () => {
    // ⭐ `g1` and `g4` are both depth 1 and both 100 high, so whatever rule
    // places the baseline inside a band places it the same way in each. What is
    // left is FR-080's ratio over SC-1's offset, and that IS fixed: 300 screen
    // pixels apart on the screen, 300 x 1.6 apart in the export.
    const assembled = await exportedOf(TALL_SCENE)
    const yOf = (id: string): number =>
      num(
        (assembled.texts.find((t) => t.content === `name of ${id}`) as DrawnText).attrs,
        'y',
      )
    const boxOf = (id: string): ScreenRect =>
      (TALL_ROWS.find((row) => row.groupId === id) as RowTitle).box
    expect(boxOf('g4').height).toBe(boxOf('g1').height)
    expect(yOf('g4') - yOf('g1')).toBeCloseTo((boxOf('g4').y - boxOf('g1').y) * RATIO, 1)
  })

  it('indents one `rowTitleIndent` per level of depth (S-37)', async () => {
    // K-37 of table T-104 names S-37 the indent of ONE level of depth, and
    // FR-085 takes the row's depth worth of it off the usable width.
    const assembled = await exportedOf(TALL_SCENE)
    const xOf = (id: string): number => {
      const found = assembled.texts.find((t) => t.content === `name of ${id}`)
      expect(found, id).toBeDefined()
      return num((found as DrawnText).attrs, 'x')
    }
    const step = SETTINGS.rowTitleIndent * RATIO
    expect(xOf('g2') - xOf('g1')).toBeCloseTo(step, 1)
    expect(xOf('g3') - xOf('g1')).toBeCloseTo(step * 2, 1)
    expect(xOf('g4')).toBeCloseTo(xOf('g1'), 1)
    expect(xOf('g1')).toBeGreaterThanOrEqual(REGIONS.rowTitlePanel.x * RATIO)
  })

  it('writes a root row larger by `rowTitleTopScale` (S-36 and S-38)', async () => {
    // K-38 of table T-104 names S-38 the scale a depth-1 row's name is written
    // at, over `rowTitleFont` (S-36). ⭐ Both reach this case from
    // SETTINGS_DEFAULTS, so a change in the manuscript lands here.
    const assembled = await exportedOf(TALL_SCENE)
    const sizeOf = (id: string): number => {
      const found = assembled.texts.find((t) => t.content === `name of ${id}`)
      expect(found, id).toBeDefined()
      return num((found as DrawnText).attrs, 'font-size')
    }
    expect(sizeOf('g2')).toBeCloseTo(SETTINGS.rowTitleFont * RATIO, 1)
    expect(sizeOf('g3')).toBeCloseTo(SETTINGS.rowTitleFont * RATIO, 1)
    expect(sizeOf('g1')).toBeCloseTo(
      SETTINGS.rowTitleFont * SETTINGS.rowTitleTopScale * RATIO,
      1,
    )
  })

  it('writes the name of a pinned row too (U-46 is drawn)', async () => {
    // FR-098 lifts a pinned row out of the scrolling list and holds it at the
    // top; EP-3 draws the tree and EP-5 draws `Pinned Row` (U-46).
    const pinned = rowOf(
      'p1',
      1,
      { x: 0, y: 110, width: SETTINGS.rowTitlePanelWidth, height: 40 },
      'a pinned row name',
    )
    const assembled = await exportedOf(
      sceneOf(viewOf(TALL_ROWS, {}, [{ ...pinned, isPinned: true }])),
    )
    expect(assembled.texts.map((t) => t.content)).toContain('a pinned row name')
  })
})

// ---------------------------------------------------------------------------
// FR-025 -- what will not fit down the page
// ---------------------------------------------------------------------------

describe('FR-025 -- the fit, and what is dropped to get it', () => {
  it('drops the row that straddles S-81\'s bottom edge and every row below it', async () => {
    const assembled = await exportedOf(TALL_SCENE)
    expect([...assembled.result.droppedGroupIds].sort()).toEqual([...TALL_DROPPED].sort())
    for (const id of TALL_KEPT) {
      expect(assembled.texts.map((t) => t.content), id).toContain(`name of ${id}`)
    }
    for (const id of TALL_DROPPED) {
      expect(assembled.texts.map((t) => t.content), id).not.toContain(`name of ${id}`)
    }
  })

  it('reports the dropped rows top-most first', async () => {
    const assembled = await exportedOf(TALL_SCENE)
    expect(assembled.result.droppedGroupIds).toEqual(TALL_DROPPED)
  })

  it('cuts at the TOP of the first dropped row (MUST NOT: through a TaskGroup)', async () => {
    // FR-025 (MUST NOT): a `TaskGroup` is never cut through the middle, so the
    // cut lands on the top edge of the first row that will not fit.
    const assembled = await exportedOf(TALL_SCENE)
    expect(assembled.clip, 'one fit clip rectangle').not.toBeNull()
    const clip = assembled.clip as ScreenRect
    expect(clip.y + clip.height).toBeCloseTo(TALL_CUT_AT * RATIO, 1)
  })

  it('leaves the fit clip open at the top (MUST: a row already cut stays cut)', async () => {
    // FR-025 (MUST): a `TaskGroup` already cut off at the TOP of the screen
    // stays cut as the screen has it -- that cut is the screen's, not this
    // rule's. So the fit clip has no upper edge of its own.
    const assembled = await exportedOf(TALL_SCENE)
    const clip = assembled.clip as ScreenRect
    expect(clip.y).toBeLessThanOrEqual(0)
    expect(clip.x).toBeLessThanOrEqual(0)
    expect(clip.x + clip.width).toBeGreaterThanOrEqual(SETTINGS.exportCanvas.width)
  })

  it('never changes the ratio to make the picture fit (MUST NOT)', async () => {
    // FR-025 (MUST NOT): the ratio is never changed to make the picture fit.
    // The tall screen overflows and the short one does not, and FR-080 gives
    // both the same ratio because both screens are the same width.
    const tall = await exportedOf(TALL_SCENE)
    const shortScreen: MeasuredScreen = { ...SCREEN, height: 500 }
    const shortRegions = regionsOf(shortScreen)
    const short = await exportedOf(
      sceneOf(
        viewOf(
          [rowOf('s1', 1, { x: 0, y: 120, width: SETTINGS.rowTitlePanelWidth, height: 60 })],
          { frame: frameOf(shortRegions) },
        ),
        {},
        shortRegions,
      ),
    )
    const bandWidth = (a: Assembled): number =>
      Math.max(...a.rects.map((e) => num(e.attrs, 'width')))
    expect(tall.result.droppedGroupIds.length).toBeGreaterThan(0)
    expect(short.result.droppedGroupIds).toEqual([])
    expect(bandWidth(short)).toBeCloseTo(bandWidth(tall), 6)
  })

  it('leaves the remainder blank when the picture is shorter than S-81 (MUST NOT: add rows)', async () => {
    // FR-025 (MUST / MUST NOT): the remainder is left blank and no row is
    // added to fill it. Nothing drawn may reach past where the screen ends.
    const shortScreen: MeasuredScreen = { ...SCREEN, height: 500 }
    const shortRegions = regionsOf(shortScreen)
    const rows = [
      rowOf('s1', 1, { x: 0, y: 120, width: SETTINGS.rowTitlePanelWidth, height: 60 }),
      rowOf('s2', 2, { x: 0, y: 180, width: SETTINGS.rowTitlePanelWidth, height: 60 }),
    ]
    const assembled = await exportedOf(
      sceneOf(viewOf(rows, { frame: frameOf(shortRegions) }), {}, shortRegions),
    )
    const screenBottom = shortScreen.height * RATIO
    expect(screenBottom).toBeLessThan(SETTINGS.exportCanvas.height)
    expect(assembled.result.droppedGroupIds).toEqual([])
    for (const element of assembled.rects) {
      const rect = rectOf(element)
      expect(rect.y + rect.height, JSON.stringify(rect)).toBeLessThanOrEqual(
        screenBottom + TOLERANCE,
      )
    }
    expect(assembled.texts).toHaveLength(rows.length + 1)
  })

  it('keeps a row whose bottom lands exactly on the edge, and drops the next', async () => {
    // ⭐ The cap. FR-025 drops the `TaskGroup` that STRADDLES S-81's bottom
    // edge -- and a row whose bottom IS the edge does not straddle it.
    const rows = [
      rowOf('e1', 1, { x: 0, y: 100, width: SETTINGS.rowTitlePanelWidth, height: FIT_LIMIT - 100 }),
      rowOf('e2', 1, { x: 0, y: FIT_LIMIT, width: SETTINGS.rowTitlePanelWidth, height: 40 }),
    ]
    const assembled = await exportedOf(sceneOf(viewOf(rows)))
    expect(assembled.result.droppedGroupIds).toEqual(['e2'])
    expect(assembled.texts.map((t) => t.content)).toContain('name of e1')
  })

  it('drops every row when the very first one already straddles the edge', async () => {
    const rows = [
      rowOf('a1', 1, { x: 0, y: 100, width: SETTINGS.rowTitlePanelWidth, height: 600 }),
      rowOf('a2', 1, { x: 0, y: 700, width: SETTINGS.rowTitlePanelWidth, height: 40 }),
    ]
    const assembled = await exportedOf(sceneOf(viewOf(rows)))
    expect(assembled.result.droppedGroupIds).toEqual(['a1', 'a2'])
    expect(assembled.texts.some((t) => t.content.startsWith('name of'))).toBe(false)
    expect((assembled.clip as ScreenRect).y + (assembled.clip as ScreenRect).height).toBeCloseTo(
      100 * RATIO,
      1,
    )
  })

  it('fixes the output size at S-81 and takes no size argument (MUST NOT: ask)', () => {
    // FR-025 (MUST NOT): the output size is fixed at S-81 and a person is
    // never asked for it at each export. The entry takes the seam and the
    // scene, and the scene carries no size of its own.
    expect(exportPng).toHaveLength(2)
  })
})

// ---------------------------------------------------------------------------
// Table T-024, IO-3 and IO-4 -- one operation, two outputs
// ---------------------------------------------------------------------------

describe('table T-024 -- the SVG and the PNG come out of one assembly', () => {
  it('hands the rasterizer the very string it gives back as IO-3', async () => {
    // ⭐ A second assembly would be the way the two outputs come to differ.
    const { rasterizer, calls } = watchedRasterizer()
    const result = await exportPng(rasterizer, TALL_SCENE)
    expect(calls).toHaveLength(1)
    expect(calls[0]?.svg).toBe(result.svg)
  })

  it('asks for S-81 times S-82 pixels (one case walks both values of S-82)', async () => {
    for (const scale of T_204_S82) {
      const settings = settingsOf({ exportPngScale: scale })
      const { rasterizer, calls } = watchedRasterizer()
      const scene = sceneOf(viewOf(TALL_ROWS), { settings })
      const result = await exportPng(rasterizer, scene)
      expect(calls[0]?.sizePx, `S-82 = ${scale}`).toEqual({
        widthPx: SETTINGS.exportCanvas.width * scale,
        heightPx: SETTINGS.exportCanvas.height * scale,
      })
      // ⚠️ The SVG itself stays `exportCanvas`-sized: S-82 multiplies the
      // PIXELS, not the picture (RasterSizePx says so in as many words).
      const root = assembledOf(result, scene).root
      expect(num(root.attrs, 'width'), `S-82 = ${scale}`).toBe(SETTINGS.exportCanvas.width)
      expect(num(root.attrs, 'height'), `S-82 = ${scale}`).toBe(SETTINGS.exportCanvas.height)
    }
  })

  it('gives back the bytes the seam answered with, untouched', async () => {
    const { rasterizer } = watchedRasterizer({ ok: true, pngBytes: PNG_BYTES })
    const result = await exportPng(rasterizer, TALL_SCENE)
    expect(result.png).toEqual({ ok: true, pngBytes: PNG_BYTES })
  })

  it('calls the seam exactly once for one export', async () => {
    const { rasterizer, calls } = watchedRasterizer()
    await exportPng(rasterizer, TALL_SCENE)
    expect(calls).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// FR-028 and AG-8 of table T-035 -- a failure is a VALUE
// ---------------------------------------------------------------------------

describe('FR-028 / AG-8 -- the failure comes back as a value, and nothing is thrown', () => {
  it('carries each of the three reasons through unchanged (one case walks them)', async () => {
    for (const { reason, nextStep } of T_037_REASONS) {
      const fault: RasterFault = { reason, what: `the item that failed: ${reason}` }
      const { rasterizer } = watchedRasterizer({ ok: false, fault })
      const result = await exportPng(rasterizer, TALL_SCENE)
      expect(result.png, `${reason} -- ${nextStep}`).toEqual({ ok: false, fault })
    }
  })

  it('turns a rejecting seam into a value, for every reason', async () => {
    for (const { why, reason } of EVERY_REASON) {
      const result = await exportPng(rejectingRasterizer(reason), TALL_SCENE)
      expect(result.png.ok, why).toBe(false)
      if (result.png.ok) continue
      expect(result.png.fault.reason, why).toBe('rasterFailed')
    }
  })

  it('turns a seam that throws before returning into a value too', async () => {
    for (const { why, reason } of EVERY_REASON) {
      const result = await exportPng(throwingRasterizer(reason), TALL_SCENE)
      expect(result.png.ok, why).toBe(false)
    }
  })

  it('never throws and never rejects, whatever the seam does', async () => {
    for (const { why, reason } of EVERY_REASON) {
      await expect(exportPng(rejectingRasterizer(reason), TALL_SCENE), why).resolves.toBeDefined()
      await expect(exportPng(throwingRasterizer(reason), TALL_SCENE), why).resolves.toBeDefined()
    }
  })

  it('still gives back IO-3\'s SVG and the dropped rows when the PNG fails', async () => {
    // ⭐ Assembling the picture is arithmetic over values and cannot fail; only
    // painting it needs a machine. That is also the next step NT-3a owes a
    // person when the reason is `unsupported`.
    const { rasterizer } = watchedRasterizer({
      ok: false,
      fault: { reason: 'unsupported', what: 'no canvas in this host' },
    })
    const result = await exportPng(rasterizer, TALL_SCENE)
    expect(result.png.ok).toBe(false)
    expect(result.svg).toContain('<svg')
    expect(result.svg).toContain(PICTURE)
    expect(result.droppedGroupIds).toEqual(TALL_DROPPED)
  })
})

describe('table T-037 -- what the notice is composed from', () => {
  it('NT-1: the detail naming WHICH item failed survives the entry', async () => {
    // NT-1 (MUST): a notice says WHICH item is wrong and why, in words. This
    // component composes
    // no wording -- FR-038 makes the sentence depend on the display language --
    // so what it owes the notice is the reason and the detail, both intact.
    const what = 'the 1600x900 canvas at scale 2 exceeds this machine'
    const { rasterizer } = watchedRasterizer({ ok: false, fault: { reason: 'tooLarge', what } })
    const result = await exportPng(rasterizer, TALL_SCENE)
    expect(result.png.ok).toBe(false)
    if (result.png.ok) return
    expect(result.png.fault.what).toBe(what)
    expect(result.png.fault.reason).toBe('tooLarge')
  })

  it('NT-3a: the three reasons stay three, because their next steps differ', async () => {
    const answered: RasterFaultReason[] = []
    for (const { reason } of T_037_REASONS) {
      const { rasterizer } = watchedRasterizer({ ok: false, fault: { reason, what: 'detail' } })
      const result = await exportPng(rasterizer, TALL_SCENE)
      if (!result.png.ok) answered.push(result.png.fault.reason)
    }
    expect(answered).toEqual(T_037_REASONS.map((row) => row.reason))
    expect(new Set(T_037_REASONS.map((row) => row.nextStep)).size).toBe(3)
  })

  it('composes no wording of its own', async () => {
    // ⛔ NT-1's sentence belongs where the display language is known (FR-038).
    const { rasterizer } = watchedRasterizer({
      ok: false,
      fault: { reason: 'rasterFailed', what: 'detail' },
    })
    const result = await exportPng(rasterizer, TALL_SCENE)
    if (result.png.ok) return
    expect(Object.keys(result.png.fault).sort()).toEqual(['reason', 'what'])
    expect(Object.keys(result.png).sort()).toEqual(['fault', 'ok'])
  })
})

// ---------------------------------------------------------------------------
// Boundaries: empty, null, one, and the picture that ARRIVES
// ---------------------------------------------------------------------------

describe('boundaries', () => {
  it('answers for a screen with no rows at all', async () => {
    const assembled = await exportedOf(sceneOf(viewOf([])))
    expect(assembled.result.droppedGroupIds).toEqual([])
    expect(assembled.result.svg).toContain(PICTURE)
    expect(assembled.texts.map((t) => t.content)).toEqual([DOCUMENT_TITLE])
    expect(hasRect(assembled, REGIONS.rowTitlePanel), 'EP-3 panel is still drawn').toBe(true)
  })

  it('answers for exactly one row', async () => {
    const assembled = await exportedOf(
      sceneOf(
        viewOf([rowOf('only', 1, { x: 0, y: 100, width: SETTINGS.rowTitlePanelWidth, height: 40 })]),
      ),
    )
    expect(assembled.result.droppedGroupIds).toEqual([])
    expect(assembled.texts.map((t) => t.content)).toContain('name of only')
  })

  it('writes no text for a row whose label is null', async () => {
    const assembled = await exportedOf(
      sceneOf(
        viewOf([
          rowOf('n1', 1, { x: 0, y: 100, width: SETTINGS.rowTitlePanelWidth, height: 40 }, null),
        ]),
      ),
    )
    expect(assembled.texts.map((t) => t.content)).toEqual([DOCUMENT_TITLE])
    expect(assembled.result.droppedGroupIds).toEqual([])
  })

  it('writes no title when the document has none (`documentTitle` is null)', async () => {
    // ⚠️ FR-035 fixes `Untitled` for the BROWSER TAB and says nothing about the
    // header of a document without a title, so nothing may be substituted here.
    const assembled = await exportedOf(
      sceneOf(
        viewOf(TALL_ROWS, {
          appHeaderItems: { ...APP_HEADER_ITEMS, documentTitle: null },
        }),
      ),
    )
    expect(assembled.texts.map((t) => t.content)).toEqual(
      TALL_KEPT.map((id) => `name of ${id}`),
    )
    expect(hasRect(assembled, REGIONS.appHeader), 'the band is still drawn').toBe(true)
  })

  it('keeps the picture that arrived intact and whole', async () => {
    // 5.3 draws this component two OUTGOING edges, both of supply. The picture
    // is not re-rendered here -- FR-080 wants the same picture, not a second one.
    const assembled = await exportedOf(TALL_SCENE)
    expect(assembled.pictureCount).toBe(1)
  })

  it('answers for an empty picture string without losing anything else', async () => {
    const { rasterizer } = watchedRasterizer()
    const result = await exportPng(rasterizer, sceneOf(viewOf(TALL_ROWS), { svg: '' }))
    expect(result.svg).toContain('<svg')
    expect(result.droppedGroupIds).toEqual(TALL_DROPPED)
    expect(result.png).toEqual({ ok: true, pngBytes: PNG_BYTES })
  })

  it('stays one SVG document when a name carries markup characters', async () => {
    // FR-035 lets a person write any title, and a row name is the document's own
    // value. A raw `<` would end the element and make IO-3's output another
    // picture than the one assembled.
    const wild = 'a & b < c > d "e"'
    const assembled = await exportedOf(
      sceneOf(
        viewOf(
          [rowOf('w1', 1, { x: 0, y: 100, width: SETTINGS.rowTitlePanelWidth, height: 40 }, wild)],
          { appHeaderItems: { ...APP_HEADER_ITEMS, documentTitle: wild } },
        ),
      ),
    )
    expect(assembled.texts).toHaveLength(2)
    for (const text of assembled.texts) {
      expect(text.content).not.toContain('<')
      expect(text.content).toContain('&amp;')
    }
    expect(assembled.result.svg.split('<svg').length - 1, 'one root plus the received one').toBe(2)
  })
})

// ---------------------------------------------------------------------------
// Chapter 5.3 -- the seam declared in UF-40 leaves through the entry
// ---------------------------------------------------------------------------

describe('Chapter 5.3 -- the seam is re-published by the public entry', () => {
  it('publishes every name of IF-6 through `image-exporter.ts` (MUST)', () => {
    // ⭐ Types are erased at run time, so what proves this is `npm run
    // typecheck`: every name below is imported from the ENTRY and from nothing
    // else, and 5.3 forbids the outside to read past it.
    const sizePx: RasterSizePx = { widthPx: 1, heightPx: 1 }
    const fault: RasterFault = { reason: 'unsupported', what: 'detail' }
    const reason: RasterFaultReason = fault.reason
    const rastering: Rastering = { ok: false, fault }
    const seam: Rasterizer = {
      rasterizePng: (): Promise<Rastering> => Promise.resolve(rastering),
    }
    expect(typeof seam.rasterizePng).toBe('function')
    expect(sizePx.widthPx).toBe(1)
    expect(reason).toBe('unsupported')
  })

  it('publishes `exportPng` as an asynchronous entry (PI-21)', () => {
    const answer = exportPng(watchedRasterizer().rasterizer, TALL_SCENE)
    expect(typeof answer.then).toBe('function')
    return answer
  })
})

// ---------------------------------------------------------------------------
// IF-6 -- one direction, and no read side
// ---------------------------------------------------------------------------

describe('IF-6 -- the seam goes one way, so there is no round trip to test', () => {
  it('names IO-3 and IO-4 as write-only rows of table T-024', () => {
    // ⚠️ FR-021's round trip is `DocumentCodec`'s and `MspdiCodec`'s, not this
    // unit's: table T-024 gives IO-3 and IO-4 the direction "write only", and a
    // member that read an image back would open an intake FR-023 would then
    // have to validate -- with nothing on this side to validate it with.
    const writeOnly = ['IO-3', 'IO-4'] as const
    expect(writeOnly).toHaveLength(2)
    // ⭐ What stands in for a round trip here is IO-3 against IO-4: the string
    // the seam was painted from IS the string the caller receives, checked
    // above, so the two outputs cannot describe different pictures.
    expect(exportPng).toHaveLength(2)
  })

  it('touches nothing on the seam but `rasterizePng`', async () => {
    const touched: string[] = []
    const inner: Rasterizer = {
      rasterizePng: (): Promise<Rastering> => Promise.resolve({ ok: true, pngBytes: PNG_BYTES }),
    }
    const watched = new Proxy(inner, {
      get(target, key, receiver): unknown {
        if (typeof key === 'string') touched.push(key)
        return Reflect.get(target, key, receiver) as unknown
      },
    })
    await exportPng(watched, TALL_SCENE)
    expect([...new Set(touched)]).toEqual(['rasterizePng'])
  })
})

// ---------------------------------------------------------------------------
// PI-21 `exportSvg` -- IO-3's own entry, and the half of WY-2 that fits in one
// unit
//
// ⭐ WHY THESE CASES EXIST. WY-2 of table T-041 judges "the drawing, once the
// watermark layer is set aside, to be the same SVG / PNG after normalisation".
// A whole-product run of that row is out of one unit's reach -- it loads a JSON
// and performs the fit of FR-055 first -- but the half that says the SVG and
// the PNG of ONE state are ONE drawing is not: it is exactly the two entries
// PI-21 publishes answering from one assembly. IO-3 and IO-4 of table T-024 are
// the two outputs, and IO-3's size is S-81 of table T-204.
// ---------------------------------------------------------------------------

describe('PI-21 exportSvg -- IO-3 and IO-4 are one assembly (WY-2 of table T-041)', () => {
  it('GIVEN one scene WHEN both entries run THEN the SVG route and the PNG route answer the same string (WY-2)', async () => {
    const { rasterizer } = watchedRasterizer()
    const svgOnly = exportSvg(TALL_SCENE)
    const both = await exportPng(rasterizer, TALL_SCENE)
    // ⛔ Not "equal after normalisation" but the SAME string: FR-080 admits
    // normalisation because two DRAWERS spell a picture differently, and there
    // is only one drawer here. A difference of any kind would be a second
    // assembly, which is the thing CR-196 closed.
    expect(svgOnly.svg).toBe(both.svg)
    expect(svgOnly.droppedGroupIds).toEqual(both.droppedGroupIds)
  })

  it('GIVEN one scene WHEN exportPng runs THEN the rasterizer is painted from exportSvg own string (IO-4 from IO-3)', async () => {
    const { rasterizer, calls } = watchedRasterizer()
    await exportPng(rasterizer, TALL_SCENE)
    expect(calls).toHaveLength(1)
    expect(calls[0]?.svg).toBe(exportSvg(TALL_SCENE).svg)
  })

  it('GIVEN a scene WHEN exportSvg runs THEN the output is exportCanvas wide and tall (IO-3 of table T-024, S-81)', () => {
    // Table T-024 IO-3: "SVG / write only / the screen's output / the output
    // size is S-81 of table T-204."
    const assembled = svgOnlyOf(TALL_SCENE)
    expect(assembled.root.tag).toBe('svg')
    expect(num(assembled.root.attrs, 'width')).toBe(SETTINGS.exportCanvas.width)
    expect(num(assembled.root.attrs, 'height')).toBe(SETTINGS.exportCanvas.height)
    expect(assembled.root.attrs['viewBox']).toBe(
      `0 0 ${SETTINGS.exportCanvas.width} ${SETTINGS.exportCanvas.height}`,
    )
  })

  it('GIVEN a screen taller than S-81 WHEN exportSvg runs THEN it drops the same TaskGroups the PNG route drops (FR-025)', () => {
    // ⭐ THE DEFECT CR-196 CLOSED, as a case: before the entry existed the SVG
    // route went through neither table T-076's assembly nor FR-025's cut.
    const assembled = svgOnlyOf(TALL_SCENE)
    expect(assembled.result.droppedGroupIds).toEqual(TALL_DROPPED)
    for (const id of TALL_KEPT) {
      expect(assembled.texts.map((t) => t.content), id).toContain(`name of ${id}`)
    }
    for (const id of TALL_DROPPED) {
      expect(assembled.texts.map((t) => t.content), id).not.toContain(`name of ${id}`)
    }
    expect(assembled.clip, 'the fit clip of FR-025').not.toBeNull()
    expect((assembled.clip as ScreenRect).y + (assembled.clip as ScreenRect).height).toBeCloseTo(
      TALL_CUT_AT * RATIO,
      1,
    )
  })

  it('GIVEN the fixed copy of table T-076 WHEN exportSvg assembles the picture THEN all fourteen rows hold', () => {
    // Chapter 1.9 (:275): a requirement that points at a table is tested from a
    // copy of that table. The same copy the PNG route is walked with, walked
    // again through IO-3's entry -- WY-2 leaves no room for the two to differ.
    const assembled = svgOnlyOf(TALL_SCENE)
    expect(T_076_ROWS).toHaveLength(14)
    for (const row of T_076_ROWS) {
      expect(row.holds(assembled), `${row.id} (${row.expectation}): ${row.part}`).toBe(true)
    }
  })

  it('GIVEN the same scene twice WHEN exportSvg runs THEN it answers the same string both times (@purity pure)', () => {
    // WY-2's premise: the same JSON in the same environment gives the same
    // picture. A pure entry may not read a clock, a random or a counter --
    // CS-1 of table T-066 (design :448) says in as many words that reading the
    // clock in the frame would break WY-2.
    expect(exportSvg(TALL_SCENE).svg).toBe(exportSvg(TALL_SCENE).svg)
    expect(exportSvg(sceneOf(viewOf([])))).toEqual(exportSvg(sceneOf(viewOf([]))))
  })

  it('GIVEN a scene frozen through and through WHEN exportSvg runs THEN it writes into none of it (@purity pure)', () => {
    const frozen = deeplyFrozenCopy(TALL_SCENE)
    const before = JSON.stringify(frozen)
    const answer = exportSvg(frozen)
    expect(answer.svg).toContain('<svg')
    expect(JSON.stringify(frozen), 'the scene came back as it went in').toBe(before)
  })

  it('GIVEN exportSvg WHEN its parameter list is read THEN it takes the scene alone and no output size (FR-025 MUST NOT)', () => {
    // FR-025 (MUST NOT): the output size is fixed at S-81 and a person is never
    // asked for it at each export. There is no size to pass, on either entry.
    expect(exportSvg).toHaveLength(1)
    expect(exportPng).toHaveLength(2)
  })

  it('GIVEN a rasterizer that fails WHEN exportPng runs THEN IO-3 picture is still exportSvg own (NT-3a next step)', async () => {
    // NT-3a of table T-037 (MUST): a failure notice carries what can be done
    // next, and for `unsupported` that next step is the SVG -- which is only
    // true if the string handed back is the assembled one.
    const { rasterizer } = watchedRasterizer({
      ok: false,
      fault: { reason: 'unsupported', what: 'no canvas in this host' },
    })
    const result = await exportPng(rasterizer, TALL_SCENE)
    expect(result.png.ok).toBe(false)
    expect(result.svg).toBe(exportSvg(TALL_SCENE).svg)
    expect(result.droppedGroupIds).toEqual(exportSvg(TALL_SCENE).droppedGroupIds)
  })
})

describe('PI-21 -- what leaves `image-exporter.ts` at run time (Chapter 5.3)', () => {
  it('GIVEN the public entry WHEN its runtime names are read THEN they are exactly exportSvg and exportPng', () => {
    // ⚠️ The types PI-21 re-publishes are erased, so only the two entries are
    // there to count. A third runtime name would be a member table T-064 does
    // not give this component.
    expect(Object.keys(imageExporter).sort()).toEqual(['exportPng', 'exportSvg'])
    expect(typeof exportSvg).toBe('function')
  })
})

// ---------------------------------------------------------------------------
// Boundaries of the SVG route: empty, one, null, and the edge of S-81
// ---------------------------------------------------------------------------

describe('boundaries of the SVG route', () => {
  it('GIVEN a screen with no rows at all WHEN exportSvg runs THEN it drops nothing and still draws EP-1 and EP-3', () => {
    const assembled = svgOnlyOf(sceneOf(viewOf([])))
    expect(assembled.result.droppedGroupIds).toEqual([])
    expect(assembled.result.svg).toContain(PICTURE)
    expect(assembled.texts.map((t) => t.content)).toEqual([DOCUMENT_TITLE])
    expect(hasRect(assembled, REGIONS.appHeader), 'EP-1 band').toBe(true)
    expect(hasRect(assembled, REGIONS.rowTitlePanel), 'EP-3 panel').toBe(true)
  })

  it('GIVEN exactly one row WHEN exportSvg runs THEN its name is written and nothing is dropped', () => {
    const assembled = svgOnlyOf(
      sceneOf(
        viewOf([rowOf('only', 1, { x: 0, y: 100, width: SETTINGS.rowTitlePanelWidth, height: 40 })]),
      ),
    )
    expect(assembled.result.droppedGroupIds).toEqual([])
    expect(assembled.texts.map((t) => t.content)).toContain('name of only')
  })

  it('GIVEN a row whose label is null WHEN exportSvg runs THEN no name is written for it', () => {
    const assembled = svgOnlyOf(
      sceneOf(
        viewOf([
          rowOf('n1', 1, { x: 0, y: 100, width: SETTINGS.rowTitlePanelWidth, height: 40 }, null),
        ]),
      ),
    )
    expect(assembled.texts.map((t) => t.content)).toEqual([DOCUMENT_TITLE])
    expect(assembled.result.droppedGroupIds).toEqual([])
  })

  it('GIVEN a document with no title WHEN exportSvg runs THEN nothing is written in its place (FR-035 speaks of the tab)', () => {
    const assembled = svgOnlyOf(
      sceneOf(viewOf(TALL_ROWS, { appHeaderItems: { ...APP_HEADER_ITEMS, documentTitle: null } })),
    )
    expect(assembled.texts.map((t) => t.content)).toEqual(TALL_KEPT.map((id) => `name of ${id}`))
    expect(hasRect(assembled, REGIONS.appHeader), 'the band is still drawn').toBe(true)
  })

  it('GIVEN an empty picture string WHEN exportSvg runs THEN the S-81 frame and the cut still come back', () => {
    const answer = exportSvg(sceneOf(viewOf(TALL_ROWS), { svg: '' }))
    expect(answer.svg).toContain('<svg')
    expect(answer.droppedGroupIds).toEqual(TALL_DROPPED)
  })

  it('GIVEN a row whose bottom lands exactly on S-81 edge WHEN exportSvg runs THEN it is kept and the next is dropped', () => {
    // FR-025 (MUST) drops the `TaskGroup` that STRADDLES the lower edge; a row
    // whose bottom IS the edge does not straddle it.
    const rows = [
      rowOf('e1', 1, { x: 0, y: 100, width: SETTINGS.rowTitlePanelWidth, height: FIT_LIMIT - 100 }),
      rowOf('e2', 1, { x: 0, y: FIT_LIMIT, width: SETTINGS.rowTitlePanelWidth, height: 40 }),
    ]
    const answer = exportSvg(sceneOf(viewOf(rows)))
    expect(answer.droppedGroupIds).toEqual(['e2'])
  })

  it('GIVEN the very first row already straddles the edge WHEN exportSvg runs THEN every row is reported dropped', () => {
    const rows = [
      rowOf('a1', 1, { x: 0, y: 100, width: SETTINGS.rowTitlePanelWidth, height: 600 }),
      rowOf('a2', 1, { x: 0, y: 700, width: SETTINGS.rowTitlePanelWidth, height: 40 }),
    ]
    const answer = exportSvg(sceneOf(viewOf(rows)))
    expect(answer.droppedGroupIds).toEqual(['a1', 'a2'])
  })
})
