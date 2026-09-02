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
//   FR-025      the output size is never asked for (MUST NOT); the width is
//               fixed at S-81's (MUST) and the height grows until the picture
//               fits (MUST), as far as S-217 and no further (MUST); the PNG's
//               pixels are that size times S-82; the ratio is never changed to
//               make the picture fit (MUST NOT); a picture shorter than S-81
//               leaves the rest blank (MUST) and no row is added to fill it
//               (MUST NOT); and -- CR-337 -- a picture that will not fit UNDER
//               S-217 even once grown is NOT WRITTEN AT ALL (MUST), no part of
//               it may be drawn (MUST NOT), and a reason is told (MUST)
//   CR-337      the reader's ruling of 2026-09-02: 「その場合は、1600x4096 の
//               サイズに収まらなかったエラーにして、png, svg の出力を止めろ」.
//               ⛔ EVERY ASSERTION ABOUT WHICH `TaskGroup`s WERE KEPT AND WHICH
//               WERE DROPPED WAS DELETED FROM THIS FILE, not translated: the
//               rule they measured is withdrawn, and FR-025 now says in as many
//               words 「書き出さないと決めた以上、落とす規則は無くなった」. The
//               `AT_CEILING` fixture went with them -- it existed only to make
//               the drop happen at S-81's height, and at the shipped ceiling
//               (S-217) every scene in this file fits
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
  type ImageExport,
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

/**
 * The half of each answer that carries a picture.
 *
 * ⭐⭐ CR-337 MADE THESE NECESSARY. FR-025 reads 「伸ばしても `S-217` に収まらな
 * いときは、画像を書き出さないこと（MUST）。一部だけを描いてはならない（MUST
 * NOT）」, so neither entry answers with a picture unconditionally any more: the
 * answer is either a picture or a refusal. Every case that is ABOUT the picture
 * unwraps through `fitOrThrow`, and the refusal itself is measured on its own,
 * in the last two describes of this file.
 */
type Picture = Extract<SvgExport, { readonly ok: true }>
type PictureAndPng = Extract<ImageExport, { readonly ok: true }>

/**
 * ⛔ NOT A SOFTENING OF THE RULE. Every scene this helper is used on is one the
 * ceiling is nowhere near -- a screen 800 tall shrinks to 1280 against S-217's
 * 4096 -- so a refusal here is a fixture that drifted, and it has to stop the
 * case rather than be quietly asserted around.
 */
const fitOrThrow = <T extends { readonly ok: boolean }>(
  answer: T,
): Extract<T, { readonly ok: true }> => {
  if (!answer.ok) {
    throw new Error(
      'FR-025 refused a picture this fixture is far under S-217 for -- the fixture, not the rule',
    )
  }
  return answer as Extract<T, { readonly ok: true }>
}

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
  // FR-053: the entrance is not armed. ⛔ A separate member from `isPressed`,
  // because IC-54 says the palette entry is not a button and FR-053 (MUST NOT)
  // bars the pressed form -- so an arm may not travel on the toggle.
  isArmed: false,
  label,
})

const HEADER_COMMAND_LABEL = 'EP-1 header command, U-35, not drawn'
const AUTOSAVE_AT = '2026-08-19T09:00:00Z'
const DOCUMENT_TITLE = 'EP-1 document title, U-27'

const APP_HEADER_ITEMS: AppHeaderItems = {
  documentTitle: DOCUMENT_TITLE,
  openedFileName: null,
  fileSavedAt: null,
  fileNeverSavedText: '',
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

// ⛔ THERE IS NO PROPERTIES HEADING TO KEEP OUT ANY MORE. FR-072 (MUST NOT):
// 「⛔ **パネルの先頭に見出しの行を置いてはならない（MUST NOT）**（利用者の指示
// 2026-08-27）」 (CR-272). EP-8's claim is unweakened -- the panel still reaches
// this component carrying a field, and that field's value is what must not
// arrive in the picture.
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
  // S-37 of table T-201 (K-37) is the indent of ONE level of depth, and FR-085
  // takes 「その行の深さぶんのインデント」 off the usable width.
  indentPx: depth * SETTINGS.rowTitleIndent,
  // Nothing is cut here, and the `RowTitle` contract fixes that case as
  // `wholeLabel === label` with `isLabelTruncated` false.
  wholeLabel: label,
  isLabelTruncated: false,
  expander: { canOpen: true, canClose: true, canCloseBelow: false },
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
  // ⛔ NO HEADING: FR-072 (MUST NOT) leaves the panel no heading row (CR-272).
  // ⚠️ THE CAST IS DELIBERATE AND NARROW -- whether the published description
  // still declares a member for one is the implementation's answer, and turning
  // either answer into a COMPILE error here would take this whole file down.
  // Rule 04 section 1 asks a disagreement to arrive as a test that falls, and
  // tests/unit/uf-64.test.ts is where that one falls.
  propertiesPanel: {
    showing: 'selection',
    isSubjectGone: false,
    fields: [{ row: 'PR-1', name: 'name', text: PROPERTY_FIELD_TEXT, isEditable: true, controls: [] }],
    // ⚠️ EMPTY ON PURPOSE: this bench is about another subject, and the
    // entrance table T-109 places on the panel (IC-52) is asserted in
    // tests/unit/fr-006-panel-close-entrance.test.ts.
    commands: [],
  } as ScreenView['propertiesPanel'],
  commandPalette: {
    // ⭐ A CORNER, NOT A RECTANGLE: FR-053 (MUST) makes the palette's size
    // follow its contents and (MUST NOT) lets the settings table hold one.
    at: { x: 300, y: 300 },
    // ⚠️ INERT HERE. GR-19 of table T-023d lays a band along the palette's top
    // edge and table T-206 states how far down it reaches; EP-11 of table T-076
    // drops the whole palette from the picture, so no case in this file means
    // the number. ⛔ The value that row holds is deliberately NOT copied here --
    // rule 03 section 1 keeps it in one place, and `tests/unit/uf-65.test.ts` is
    // the bench that holds the described band to the manuscript.
    grabBandHeight: 7,
    minimise: {
      icon: 'IC-75',
      label: 'IC-75',
      isEnabled: true,
      isPressed: false,
      isArmed: false,
    },
    isMinimised: false,
    groups: [{ name: PALETTE_GROUP_NAME, commands: [commandOf('EP-11 palette command')] }],
    armedText: PALETTE_ARMED_TEXT,
  },
  openModal: { surface: 'Help Modal', heading: MODAL_HEADING, commands: [] },
  notices: [
    {
      manner: 'NT-3a',
      mannerText: '',
      text: NOTICE_TEXT,
      nextSteps: ['retry'],
      affectedCount: null,
      // NT-8 (MUST): the entrance a person puts this telling away by.
      dismissText: 'OK',
      dismissKey: 'NT-3a',
    },
  ],
  // NT-7 of table T-037: `null` while nothing is waiting to be answered.
  confirmation: null,
  dialogueField: {
    messages: [
      { sequence: 1, author: 'someone', text: DIALOGUE_TEXT, settledAt: '2026-08-19T09:00:00Z' },
    ],
  },
  // ⭐ `EZ-2` of 表 T-040 (MUST) puts the row's assignment behind the words, so
  // every tooltip carries the member. `FR-036`: 「どちらも持たない行は、その
  // 場所を空ける」 -- a row title has neither key nor mouse operation.
  tooltips: [{ anchor: { kind: 'rowTitle', groupId: 'g1' }, text: TOOLTIP_TEXT, assignment: null }],
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
  readonly result: Picture
  readonly scene: ExportScene
  readonly ratio: number
  /** How many times the picture that ARRIVED appears, verbatim. */
  readonly pictureCount: number
  /** Everything the component itself wrote: the received picture is taken out first. */
  readonly own: readonly Drawn[]
  readonly rects: readonly Drawn[]
  readonly texts: readonly DrawnText[]
  /**
   * A `clipPath` the picture is drawn under, or `null` if there is none.
   * ⛔ NOTHING ASSERTS ITS SHAPE ANY MORE: it was FR-025's fit clip, and CR-337
   * withdrew the fit. It is still parsed out so that a rectangle inside a
   * `clipPath` is not counted among the rectangles the component drew.
   */
  readonly clip: ScreenRect | null
  readonly root: Drawn
  /** The single scale factor the received picture is placed under. */
  readonly pictureScales: readonly string[]
}

const CLIP_BLOCK = /<clipPath((?:[^<>"]|"[^"]*")*)>([\s\S]*?)<\/clipPath>/

const assembledOf = (result: Picture, scene: ExportScene): Assembled => {
  const parts = result.svg.split(scene.svg)
  const withoutPicture = parts.join('')
  const clipHit = CLIP_BLOCK.exec(withoutPicture)
  const clipRects =
    clipHit === null ? [] : elementsOf(clipHit[2] ?? '').filter((drawn) => drawn.tag === 'rect')
  const body = clipHit === null ? withoutPicture : withoutPicture.replace(CLIP_BLOCK, '')
  const own = elementsOf(body)
  const screenWidth = scene.regions.scheduleCanvas.x + scene.regions.scheduleCanvas.width
  return {
    result,
    scene,
    ratio: scene.settings.exportCanvas.width / screenWidth,
    pictureCount: parts.length - 1,
    own,
    rects: own.filter((drawn) => drawn.tag === 'rect'),
    texts: textsOf(body),
    clip: clipRects[0] !== undefined && clipRects.length === 1 ? rectOf(clipRects[0]) : null,
    root: own[0] ?? { tag: 'nothing was assembled', attrs: {} },
    // ⭐ `scale(a)` and not `scale(a,b)`: FR-080 (MUST NOT) forbids one ratio
    // per axis, and the received picture is the one thing that cannot carry the
    // ratio in its own numbers, so the transform is where it has to show.
    pictureScales: [...result.svg.matchAll(/scale\(([^)]*)\)/g)].map((oneMatch) => (oneMatch[1] ?? '').trim()),
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
  // ⚠️ THE SHIPPED CEILING, since CR-337. There is no lowered-ceiling fixture
  // any more: at S-217's own 4096 this bench's screen makes a picture 1280
  // tall, which fits, and the scenes that do NOT fit are built on purpose in
  // the last two describes.
  settings: SETTINGS,
  ...part,
})

const exportedOf = async (scene: ExportScene): Promise<Assembled> => {
  const { rasterizer } = watchedRasterizer()
  return assembledOf(fitOrThrow(await exportPng(rasterizer, scene)), scene)
}

/** `exportPng`'s answer, unwrapped to the half that carries a picture. */
const pngOf = async (
  rasterizer: Rasterizer,
  scene: ExportScene,
): Promise<PictureAndPng> => fitOrThrow(await exportPng(rasterizer, scene))

/**
 * The same reading, taken off IO-3's own entry.
 *
 * ⭐ PI-21 publishes `exportSvg` as well since CR-196, and WY-2 of table T-041
 * judges the SVG and the PNG of one state to be the same drawing -- so every
 * reading `exportedOf` supports has to hold of this one too.
 */
const svgOnlyOf = (scene: ExportScene): Assembled =>
  assembledOf(fitOrThrow(exportSvg(scene)), scene)

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
  assembled.rects.some((drawn) => sameRect(rectOf(drawn), scaledRect(screenRect, assembled.ratio)))

const saysAnyOf = (assembled: Assembled, words: readonly string[]): boolean =>
  words.some((word) => assembled.result.svg.includes(word))

// ---------------------------------------------------------------------------
// The rows.
//
// ⭐ FR-025 measures the fit against the SCREEN: the shrunk picture is the
// whole screen times the ratio, so the picture's height is the screen's height
// times that ratio, floored at S-81's height and refused above S-217.
// ⛔ THE `DRAWN_ROW_IDS` / `TALL_DROPPED` / `TALL_CUT_AT` SPLIT WAS DELETED HERE.
// It named which of these six rows FR-025 used to drop off the bottom of a
// 900-tall frame. CR-337 withdrew that rule outright -- 「書き出さないと決めた
// 以上、落とす規則は無くなった」 -- so there is nothing left for the split to
// mean, and every one of the six now reaches the picture.
// ---------------------------------------------------------------------------

const RATIO = SETTINGS.exportCanvas.width / SCREEN.width

/**
 * The height the picture of `SCREEN` grows to: the screen times the ratio,
 * never below S-81's own height (「`S-81` の高さに満たないときは、余りを空白のま
 * まとすること（MUST）」). ⛔ Derived, never typed: S-81 and the screen are the
 * only two numbers it may be made of.
 */
const GROWN_HEIGHT = Math.max(SETTINGS.exportCanvas.height, SCREEN.height * RATIO)

/** Six rows, spread down a screen 800 tall. Every one of them is drawn. */
const TALL_ROWS: readonly RowTitle[] = [
  rowOf('g1', 1, { x: 0, y: 100, width: SETTINGS.rowTitlePanelWidth, height: 100 }),
  rowOf('g2', 2, { x: 0, y: 200, width: SETTINGS.rowTitlePanelWidth, height: 100 }),
  rowOf('g3', 3, { x: 0, y: 300, width: SETTINGS.rowTitlePanelWidth, height: 100 }),
  rowOf('g4', 1, { x: 0, y: 400, width: SETTINGS.rowTitlePanelWidth, height: 100 }),
  rowOf('g5', 2, { x: 0, y: 500, width: SETTINGS.rowTitlePanelWidth, height: 100 }),
  rowOf('g6', 2, { x: 0, y: 600, width: SETTINGS.rowTitlePanelWidth, height: 100 }),
]
const DRAWN_ROW_IDS = ['g1', 'g2', 'g3', 'g4', 'g5', 'g6']

const TALL_SCENE = sceneOf(viewOf(TALL_ROWS))

// ---------------------------------------------------------------------------
// FR-080 and WY-3 -- the ratio, and what it is multiplied into
// ---------------------------------------------------------------------------

describe('FR-080 -- one ratio, both axes, over the whole screen', () => {
  it('sizes the output at S-81\'s width and starts it at the screen\'s own origin', async () => {
    const assembled = await exportedOf(TALL_SCENE)
    // FR-025 (MUST): 「幅は `S-81` の幅に固定すること（MUST）。高さは、絵が収ま
    // るところまで伸ばすこと（MUST）」 -- so the width is S-81's and the height
    // is the grown one.
    expect(assembled.root.tag).toBe('svg')
    expect(num(assembled.root.attrs, 'width')).toBe(SETTINGS.exportCanvas.width)
    expect(num(assembled.root.attrs, 'height')).toBeCloseTo(GROWN_HEIGHT, 6)
    // FR-080 (MUST NOT): no margin is added at the edge, because a margin
    // would take the ratio off S-81's width over the screen's width. The box
    // starts at the origin, so nothing was inset.
    expect(assembled.root.attrs['viewBox']).toBe(
      `0 0 ${SETTINGS.exportCanvas.width} ${GROWN_HEIGHT}`,
    )
  })

  it('multiplies the SAME ratio into both axes (MUST NOT: one per axis)', async () => {
    const assembled = await exportedOf(TALL_SCENE)
    const band = assembled.rects.find((drawn) =>
      near(num(drawn.attrs, 'width'), REGIONS.appHeader.width * RATIO),
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
    const band = assembled.rects.find((drawn) => near(rectOf(drawn).x, 0) && near(rectOf(drawn).y, 0))
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
    holds: (assembledSvg) =>
      hasRect(assembledSvg, assembledSvg.scene.regions.appHeader) &&
      assembledSvg.texts.some((drawnText) => drawnText.content === DOCUMENT_TITLE) &&
      !assembledSvg.result.svg.includes(HEADER_COMMAND_LABEL) &&
      !assembledSvg.result.svg.includes(AUTOSAVE_AT),
  },
  {
    id: 'EP-2',
    part: 'Time Ruler (U-19)',
    expectation: 'arrives',
    holds: (assembledSvg) => assembledSvg.pictureCount === 1 && !hasRect(assembledSvg, assembledSvg.scene.regions.timeRuler),
  },
  {
    id: 'EP-3',
    part: 'Row Title Panel (U-22) and Row Title Tree (U-23)',
    expectation: 'draw',
    holds: (assembledSvg) =>
      hasRect(assembledSvg, assembledSvg.scene.regions.rowTitlePanel) &&
      DRAWN_ROW_IDS.every((id) => assembledSvg.texts.some((drawnText) => drawnText.content === `name of ${id}`)),
  },
  {
    id: 'EP-4',
    part: 'Row Expander (U-47) / Row Pin (U-48) / Hidden Group Tab (U-29)',
    expectation: 'no',
    holds: (assembledSvg) => nothingBeyondTheAccounted(assembledSvg),
  },
  {
    id: 'EP-5',
    part: "Row Area's contents (U-1 .. U-46)",
    expectation: 'arrives',
    holds: (assembledSvg) => assembledSvg.pictureCount === 1 && !hasRect(assembledSvg, assembledSvg.scene.regions.rowArea),
  },
  {
    id: 'EP-6',
    part: 'Cursors (U-10): Status Line and Dual Cursor yes, Guide Cursor no',
    expectation: 'arrives',
    holds: (assembledSvg) => assembledSvg.pictureCount === 1 && nothingBeyondTheAccounted(assembledSvg),
  },
  {
    id: 'EP-7',
    part: 'Watermark (U-20), inside the Row Area only',
    expectation: 'arrives',
    holds: (assembledSvg) => assembledSvg.pictureCount === 1 && nothingBeyondTheAccounted(assembledSvg),
  },
  {
    id: 'EP-8',
    part: 'Properties Panel (U-25)',
    expectation: 'no',
    holds: (assembledSvg) =>
      !hasRect(assembledSvg, assembledSvg.scene.regions.propertiesPanel) &&
      !assembledSvg.result.svg.includes(PROPERTY_FIELD_TEXT),
  },
  {
    id: 'EP-9',
    part: 'Panel Divider (U-24): the line, not the control',
    expectation: 'partly',
    holds: (assembledSvg) =>
      assembledSvg.scene.screenView.frame.dividers.every((oneDivider) => hasRect(assembledSvg, oneDivider.line)) &&
      assembledSvg.scene.screenView.frame.dividers.every((oneDivider) => !hasRect(assembledSvg, oneDivider.band)),
  },
  {
    id: 'EP-10',
    part: 'Scrollbars (U-21)',
    expectation: 'no',
    holds: (assembledSvg) =>
      assembledSvg.scene.screenView.frame.scrollbars.every(
        (oneBar) => !hasRect(assembledSvg, oneBar.track) && !hasRect(assembledSvg, oneBar.thumb),
      ),
  },
  {
    id: 'EP-11',
    part: 'Command Palette (U-26) / modals (U-30) / Dialogue Field (U-44) / Resource Roster (U-49)',
    expectation: 'no',
    holds: (assembledSvg) =>
      !saysAnyOf(assembledSvg, [PALETTE_GROUP_NAME, PALETTE_ARMED_TEXT, MODAL_HEADING, DIALOGUE_TEXT]),
  },
  {
    id: 'EP-12',
    part: 'Pointer (U-42) / ArmedShape (U-38) / Selection (U-39) / Marquee (U-40) / Grab (U-43)',
    expectation: 'no',
    holds: (assembledSvg) => nothingBeyondTheAccounted(assembledSvg),
  },
  {
    id: 'EP-13',
    part: 'Schedule Canvas (U-32) / Canvas Overlays (U-33) -- the containers themselves',
    expectation: 'no',
    holds: (assembledSvg) => !hasRect(assembledSvg, assembledSvg.scene.regions.scheduleCanvas),
  },
  {
    id: 'EP-14',
    part: 'Actual Operation Dummy (U-52)',
    expectation: 'no',
    holds: (assembledSvg) => nothingBeyondTheAccounted(assembledSvg),
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
  // ⛔ NO `droppedGroupIds` TERM ANY MORE (CR-337): a picture that is written
  // holds every row, and one that is not written is not read at all.
  const withLabel = rows.filter((row) => row.label !== null)
  const expectedTexts =
    withLabel.length +
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
    const band = assembled.rects.find((drawn) => near(rectOf(drawn).y, 0))
    expect(band).toBeDefined()
    expect(rectOf(band as Drawn).height).toBeCloseTo(REGIONS.appHeader.height * RATIO, 1)
  })

  it('draws the same geometry whether or not the parts it leaves out are there', async () => {
    // ⭐ This IS the MUST NOT: the room of the scrollbars, the row's controls, the
    // properties panel and the palette is the screen's own, so taking them out
    // of `ScreenView` may not move one drawn rectangle.
    //
    // ⚠️ THE ROW'S CONTROLS ARE TAKEN OUT BY SPENDING THEM, NOT BY REMOVING THEM.
    // Until 2026-08-30 this line read `expander: null`, and that is a state the
    // manuscript does not admit: 表 T-051 の `HF-1` places the three on 「各行」,
    // so `RowTitle.expander` is no longer nullable. ⭐ THE VARIABLE THE MANUSCRIPT
    // DOES NAME is whether each control is armed or spent -- `FR-029` (MUST)
    // draws a spent one 薄く, a different drawing of the same control -- together
    // with whether the row is pinned, which `HF-6` (MUST) draws when the others
    // are not drawn at all. ⛔ AND THE RULE UNDER TEST IS UNTOUCHED, because
    // `FR-085` (MUST NOT) already says the room may not follow any of it:
    // 「**確保する場所を、操作子を描くかどうかで変えてはならない（MUST NOT）**」,
    // and 表 T-076 の `EP-4` draws none of them in the export in any case.
    const withEverything = await exportedOf(TALL_SCENE)
    const bare = await exportedOf(
      sceneOf(
        viewOf(
          TALL_ROWS.map((row) => ({
            ...row,
            expander: { canOpen: false, canClose: false, canCloseBelow: false },
            canOpenOneLevel: false,
            canAddChildRow: false,
            isPinned: false,
          })),
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
        .map((drawn) => rectOf(drawn))
        .map((oneRect) => [oneRect.x, oneRect.y, oneRect.width, oneRect.height].map((oneValue) => oneValue.toFixed(2)).join(','))
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
            openedFileName: null,
            fileSavedAt: null,
            fileNeverSavedText: '',
            commands: [],
            language: 'ja',
          },
        }),
      ),
    )
    const titleOf = (a: Assembled): DrawnText | undefined =>
      a.texts.find((drawnText) => drawnText.content === DOCUMENT_TITLE)
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
    const title = assembled.texts.find((drawnText) => drawnText.content === DOCUMENT_TITLE)
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
    const panel = assembled.rects.find((drawn) =>
      near(num(drawn.attrs, 'height'), REGIONS.rowTitlePanel.height * RATIO),
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
    expect(assembled.texts.map((drawnText) => drawnText.content)).toContain(cut)
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
      const found = assembled.texts.find((drawnText) => drawnText.content === `name of ${id}`)
      expect(found, id).toBeDefined()
      return num((found as DrawnText).attrs, 'y')
    }
    const boxOf = (id: string): ScreenRect =>
      (TALL_ROWS.find((row) => row.groupId === id) as RowTitle).box
    for (const id of DRAWN_ROW_IDS) {
      const band = scaledRect(boxOf(id), RATIO)
      expect(yOf(id), id).toBeGreaterThan(band.y)
      expect(yOf(id), id).toBeLessThanOrEqual(band.y + band.height)
    }
    const drawnOrder = DRAWN_ROW_IDS.map((id) => yOf(id))
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
        (assembled.texts.find((drawnText) => drawnText.content === `name of ${id}`) as DrawnText).attrs,
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
      const found = assembled.texts.find((drawnText) => drawnText.content === `name of ${id}`)
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
      const found = assembled.texts.find((drawnText) => drawnText.content === `name of ${id}`)
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
    expect(assembled.texts.map((drawnText) => drawnText.content)).toContain('a pinned row name')
  })
})

// ---------------------------------------------------------------------------
// FR-025 -- the frame the picture is written into
//
// ⛔⛔ FOUR CASES WERE DELETED FROM THIS DESCRIBE, NOT REWRITTEN (CR-337,
// 2026-09-02). They were 「drops the row that straddles S-81's bottom edge and
// every row below it」, 「reports the dropped rows top-most first」, 「cuts at
// the TOP of the first dropped row」 and 「leaves the fit clip open at the
// top」. All four measured 「超えた分を下端側から `TaskGroup` 単位で落とす」,
// which FR-025 no longer says -- 「書き出さないと決めた以上、落とす規則は無く
// なった」. A test whose premise is withdrawn has nothing to become.
// ⚠️ Two more went with them further down: 「keeps a row whose bottom lands
// exactly on the edge, and drops the next」 and 「drops every row when the very
// first one already straddles the edge」.
// ---------------------------------------------------------------------------

describe('FR-025 -- the frame the picture is written into', () => {
  it('writes every row of the scene, dropping none of them (CR-337)', async () => {
    // ⭐ FR-025 (MUST NOT): 「一部だけを描いてはならない」. A written picture is
    // a whole one, so every row of the scene is in it.
    // GOES RED IF: any row is left out of a picture that was written at all.
    const assembled = await exportedOf(TALL_SCENE)
    for (const id of DRAWN_ROW_IDS) {
      expect(assembled.texts.map((drawnText) => drawnText.content), id).toContain(`name of ${id}`)
    }
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
      Math.max(...a.rects.map((drawn) => num(drawn.attrs, 'width')))
    // ⭐ The two screens are the same width and different heights, and FR-080
    // takes the ratio off the WIDTH alone -- so the taller one may not be
    // squeezed to make it fit.
    expect(tall.result.heightPx).toBeGreaterThan(short.result.heightPx)
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
    expect(assembled.result.heightPx).toBe(SETTINGS.exportCanvas.height)
    for (const element of assembled.rects) {
      const rect = rectOf(element)
      expect(rect.y + rect.height, JSON.stringify(rect)).toBeLessThanOrEqual(
        screenBottom + TOLERANCE,
      )
    }
    expect(assembled.texts).toHaveLength(rows.length + 1)
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
    const result = await pngOf(rasterizer, TALL_SCENE)
    expect(calls).toHaveLength(1)
    expect(calls[0]?.svg).toBe(result.svg)
  })

  it('asks for S-81 times S-82 pixels (one case walks both values of S-82)', async () => {
    for (const scale of T_204_S82) {
      const settings = settingsOf({ exportPngScale: scale })
      const { rasterizer, calls } = watchedRasterizer()
      const scene = sceneOf(viewOf(TALL_ROWS), { settings })
      const result = await pngOf(rasterizer, scene)
      expect(calls[0]?.sizePx, `S-82 = ${scale}`).toEqual({
        widthPx: SETTINGS.exportCanvas.width * scale,
        heightPx: GROWN_HEIGHT * scale,
      })
      // ⚠️ The SVG itself stays at the picture's own size: S-82 multiplies the
      // PIXELS, not the picture (RasterSizePx says so in as many words).
      const root = assembledOf(result, scene).root
      expect(num(root.attrs, 'width'), `S-82 = ${scale}`).toBe(SETTINGS.exportCanvas.width)
      expect(num(root.attrs, 'height'), `S-82 = ${scale}`).toBeCloseTo(GROWN_HEIGHT, 6)
    }
  })

  it('gives back the bytes the seam answered with, untouched', async () => {
    const { rasterizer } = watchedRasterizer({ ok: true, pngBytes: PNG_BYTES })
    const result = await pngOf(rasterizer, TALL_SCENE)
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
      const result = await pngOf(rasterizer, TALL_SCENE)
      expect(result.png, `${reason} -- ${nextStep}`).toEqual({ ok: false, fault })
    }
  })

  it('turns a rejecting seam into a value, for every reason', async () => {
    for (const { why, reason } of EVERY_REASON) {
      const result = await pngOf(rejectingRasterizer(reason), TALL_SCENE)
      expect(result.png.ok, why).toBe(false)
      if (result.png.ok) continue
      expect(result.png.fault.reason, why).toBe('rasterFailed')
    }
  })

  it('turns a seam that throws before returning into a value too', async () => {
    for (const { why, reason } of EVERY_REASON) {
      const result = await pngOf(throwingRasterizer(reason), TALL_SCENE)
      expect(result.png.ok, why).toBe(false)
    }
  })

  it('never throws and never rejects, whatever the seam does', async () => {
    for (const { why, reason } of EVERY_REASON) {
      await expect(exportPng(rejectingRasterizer(reason), TALL_SCENE), why).resolves.toBeDefined()
      await expect(exportPng(throwingRasterizer(reason), TALL_SCENE), why).resolves.toBeDefined()
    }
  })

  it('still gives back IO-3\'s SVG when the PNG fails', async () => {
    // ⭐ Assembling the picture is arithmetic over values and cannot fail once
    // it fits; only painting it needs a machine. That is also the next step
    // NT-3a owes a person when the reason is `unsupported`.
    // ⛔ THE `droppedGroupIds` HALF OF THIS CASE WAS DELETED (CR-337).
    const { rasterizer } = watchedRasterizer({
      ok: false,
      fault: { reason: 'unsupported', what: 'no canvas in this host' },
    })
    const result = await pngOf(rasterizer, TALL_SCENE)
    expect(result.png.ok).toBe(false)
    expect(result.svg).toContain('<svg')
    expect(result.svg).toContain(PICTURE)
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
    const result = await pngOf(rasterizer, TALL_SCENE)
    expect(result.png.ok).toBe(false)
    if (result.png.ok) return
    expect(result.png.fault.what).toBe(what)
    expect(result.png.fault.reason).toBe('tooLarge')
  })

  it('NT-3a: the three reasons stay three, because their next steps differ', async () => {
    const answered: RasterFaultReason[] = []
    for (const { reason } of T_037_REASONS) {
      const { rasterizer } = watchedRasterizer({ ok: false, fault: { reason, what: 'detail' } })
      const result = await pngOf(rasterizer, TALL_SCENE)
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
    const result = await pngOf(rasterizer, TALL_SCENE)
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
    expect(assembled.result.svg).toContain(PICTURE)
    expect(assembled.texts.map((drawnText) => drawnText.content)).toEqual([DOCUMENT_TITLE])
    expect(hasRect(assembled, REGIONS.rowTitlePanel), 'EP-3 panel is still drawn').toBe(true)
  })

  it('answers for exactly one row', async () => {
    const assembled = await exportedOf(
      sceneOf(
        viewOf([rowOf('only', 1, { x: 0, y: 100, width: SETTINGS.rowTitlePanelWidth, height: 40 })]),
      ),
    )
    expect(assembled.texts.map((drawnText) => drawnText.content)).toContain('name of only')
  })

  it('writes no text for a row whose label is null', async () => {
    const assembled = await exportedOf(
      sceneOf(
        viewOf([
          rowOf('n1', 1, { x: 0, y: 100, width: SETTINGS.rowTitlePanelWidth, height: 40 }, null),
        ]),
      ),
    )
    expect(assembled.texts.map((drawnText) => drawnText.content)).toEqual([DOCUMENT_TITLE])
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
    expect(assembled.texts.map((drawnText) => drawnText.content)).toEqual(
      DRAWN_ROW_IDS.map((id) => `name of ${id}`),
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
    const result = await pngOf(rasterizer, sceneOf(viewOf(TALL_ROWS), { svg: '' }))
    expect(result.svg).toContain('<svg')
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
    const svgOnly = fitOrThrow(exportSvg(TALL_SCENE))
    const both = await pngOf(rasterizer, TALL_SCENE)
    // ⛔ Not "equal after normalisation" but the SAME string: FR-080 admits
    // normalisation because two DRAWERS spell a picture differently, and there
    // is only one drawer here. A difference of any kind would be a second
    // assembly, which is the thing CR-196 closed.
    expect(svgOnly.svg).toBe(both.svg)
    expect(svgOnly.heightPx).toBe(both.heightPx)
  })

  it('GIVEN one scene WHEN exportPng runs THEN the rasterizer is painted from exportSvg own string (IO-4 from IO-3)', async () => {
    const { rasterizer, calls } = watchedRasterizer()
    await exportPng(rasterizer, TALL_SCENE)
    expect(calls).toHaveLength(1)
    expect(calls[0]?.svg).toBe(fitOrThrow(exportSvg(TALL_SCENE)).svg)
  })

  it('GIVEN a scene WHEN exportSvg runs THEN the output is S-81 wide and as tall as the picture grew (IO-3 of table T-024, S-81)', () => {
    // Table T-024 IO-3: "SVG / write only / the screen's output / the output
    // size is S-81 of table T-204." FR-025 (MUST) fixes only the WIDTH there.
    const assembled = svgOnlyOf(TALL_SCENE)
    expect(assembled.root.tag).toBe('svg')
    expect(num(assembled.root.attrs, 'width')).toBe(SETTINGS.exportCanvas.width)
    expect(num(assembled.root.attrs, 'height')).toBeCloseTo(GROWN_HEIGHT, 6)
    expect(assembled.root.attrs['viewBox']).toBe(
      `0 0 ${SETTINGS.exportCanvas.width} ${GROWN_HEIGHT}`,
    )
  })

  it('GIVEN a screen taller than S-81 WHEN exportSvg runs THEN it writes every row, as the PNG route does (FR-025, CR-337)', () => {
    // ⭐ THE DEFECT CR-196 CLOSED, as a case: before the entry existed the SVG
    // route went through table T-076's assembly at all.
    // ⛔ WHAT THIS CASE USED TO SAY WAS 「it drops the same TaskGroups the PNG
    // route drops」, with the fit clip measured beside it. CR-337 withdrew the
    // drop, so there is no longer a cut for the two routes to agree on -- what
    // they agree on now is that both write the whole scene.
    // GOES RED IF: the SVG route leaves a row out that the PNG route draws.
    const assembled = svgOnlyOf(TALL_SCENE)
    for (const id of DRAWN_ROW_IDS) {
      expect(assembled.texts.map((drawnText) => drawnText.content), id).toContain(`name of ${id}`)
    }
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
    expect(fitOrThrow(exportSvg(TALL_SCENE)).svg).toBe(fitOrThrow(exportSvg(TALL_SCENE)).svg)
    expect(exportSvg(sceneOf(viewOf([])))).toEqual(exportSvg(sceneOf(viewOf([]))))
  })

  it('GIVEN a scene frozen through and through WHEN exportSvg runs THEN it writes into none of it (@purity pure)', () => {
    const frozen = deeplyFrozenCopy(TALL_SCENE)
    const before = JSON.stringify(frozen)
    const answer = fitOrThrow(exportSvg(frozen))
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
    const result = await pngOf(rasterizer, TALL_SCENE)
    expect(result.png.ok).toBe(false)
    expect(result.svg).toBe(fitOrThrow(exportSvg(TALL_SCENE)).svg)
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
  it('GIVEN a screen with no rows at all WHEN exportSvg runs THEN it still draws EP-1 and EP-3', () => {
    const assembled = svgOnlyOf(sceneOf(viewOf([])))
    expect(assembled.result.svg).toContain(PICTURE)
    expect(assembled.texts.map((drawnText) => drawnText.content)).toEqual([DOCUMENT_TITLE])
    expect(hasRect(assembled, REGIONS.appHeader), 'EP-1 band').toBe(true)
    expect(hasRect(assembled, REGIONS.rowTitlePanel), 'EP-3 panel').toBe(true)
  })

  it('GIVEN exactly one row WHEN exportSvg runs THEN its name is written', () => {
    const assembled = svgOnlyOf(
      sceneOf(
        viewOf([rowOf('only', 1, { x: 0, y: 100, width: SETTINGS.rowTitlePanelWidth, height: 40 })]),
      ),
    )
    expect(assembled.texts.map((drawnText) => drawnText.content)).toContain('name of only')
  })

  it('GIVEN a row whose label is null WHEN exportSvg runs THEN no name is written for it', () => {
    const assembled = svgOnlyOf(
      sceneOf(
        viewOf([
          rowOf('n1', 1, { x: 0, y: 100, width: SETTINGS.rowTitlePanelWidth, height: 40 }, null),
        ]),
      ),
    )
    expect(assembled.texts.map((drawnText) => drawnText.content)).toEqual([DOCUMENT_TITLE])
  })

  it('GIVEN a document with no title WHEN exportSvg runs THEN nothing is written in its place (FR-035 speaks of the tab)', () => {
    const assembled = svgOnlyOf(
      sceneOf(viewOf(TALL_ROWS, { appHeaderItems: { ...APP_HEADER_ITEMS, documentTitle: null } })),
    )
    expect(assembled.texts.map((drawnText) => drawnText.content)).toEqual(DRAWN_ROW_IDS.map((id) => `name of ${id}`))
    expect(hasRect(assembled, REGIONS.appHeader), 'the band is still drawn').toBe(true)
  })

  it('GIVEN an empty picture string WHEN exportSvg runs THEN the frame still comes back', () => {
    const answer = fitOrThrow(exportSvg(sceneOf(viewOf(TALL_ROWS), { svg: '' })))
    expect(answer.svg).toContain('<svg')
    expect(answer.heightPx).toBeCloseTo(GROWN_HEIGHT, 6)
  })

  // ⛔⛔ TWO CASES WERE DELETED HERE (CR-337), NOT REWRITTEN. They were 「GIVEN a
  // row whose bottom lands exactly on S-81 edge ... it is kept and the next is
  // dropped」 and 「GIVEN the very first row already straddles the edge ... every
  // row is reported dropped」. Both asked which `TaskGroup`s survived a cut at
  // S-81's lower edge. FR-025 no longer cuts: 「一部だけを描いてはならない
  // （MUST NOT）」, and the edge that decides anything now is S-217's, which the
  // last describe of this file measures.
})

// ===========================================================================
// FR-025 -- the picture grows downward to a ceiling, and stops being written
// past it (CR-333, then CR-337)
// ===========================================================================
//
// ⭐⭐ THE READER'S RULINGS OF 2026-09-02, VERBATIM: 「倍率の問題は出ない。見えて
// る範囲を 1600x900 に出力が原則だろ？収まらない場合は縦の 900 を延ばせ」,
// 「上限付きで延ばすが、16,384 は大きすぎるので、4000 程度でよく使う値にしろ」 and
// 「その場合は、1600x4096 のサイズに収まらなかったエラーにして、png, svg の出力を止めろ」.
//
// ⭐ FR-025 now reads 「幅は `S-81` の幅に固定すること（MUST）。高さは、絵が収ま
// るところまで伸ばすこと（MUST）」 and 「伸ばしてよいのはその `S-217` までとするこ
// と（MUST）」. S-81's height is the FLOOR -- 「縮めた絵の高さが `S-81` の高さに満た
// ないときは、余りを空白のままとすること（MUST）」 -- and S-217
// (`exportCanvasHeightCap`) is the ceiling.
describe('FR-025 -- the height grows to fit and stops at S-217', () => {
  const screenOf = (height: number): MeasuredScreen => ({ ...SCREEN, height })

  /** The answer, off IO-3's own entry, for a screen of this height. */
  const grownFor = (
    height: number,
    rows: readonly RowTitle[] = TALL_ROWS,
    settings: DocumentSettings = SETTINGS,
  ): SvgExport => {
    const screen = screenOf(height)
    const regions = regionsOf(screen, settings)
    return exportSvg(sceneOf(viewOf(rows), { settings }, regions))
  }

  it('grows the height to the shrunken screen when that is taller than S-81 (MUST)', () => {
    // The screen is 1000 wide, so the ratio is S-81's width over 1000. A screen
    // 800 tall is 800 x that ratio once shrunk, and the picture is that tall.
    // GOES RED IF: the height goes back to being read off `exportCanvas`.
    const picture = fitOrThrow(grownFor(800))
    expect(picture.heightPx).toBeCloseTo(800 * RATIO, 6)
    expect(picture.heightPx).toBeGreaterThan(SETTINGS.exportCanvas.height)
    const root = elementsOf(picture.svg.split(PICTURE).join(''))[0]
    expect(num((root as Drawn).attrs, 'width')).toBe(SETTINGS.exportCanvas.width)
    expect(num((root as Drawn).attrs, 'height')).toBeCloseTo(picture.heightPx, 6)
    expect((root as Drawn).attrs['viewBox']).toBe(
      `0 0 ${SETTINGS.exportCanvas.width} ${picture.heightPx}`,
    )
  })

  it('keeps the width at S-81\'s, whatever the height does (MUST)', () => {
    // FR-080 takes the ratio off S-81's WIDTH over the screen's width, and
    // FR-025 (MUST) fixes the width at S-81's -- so no height may move it.
    for (const height of [200, 800, 2000]) {
      const picture = fitOrThrow(grownFor(height))
      const root = elementsOf(picture.svg.split(PICTURE).join(''))[0]
      expect(num((root as Drawn).attrs, 'width'), `screen ${height} tall`).toBe(
        SETTINGS.exportCanvas.width,
      )
    }
  })

  it('never falls below S-81\'s height, and leaves the remainder blank (MUST NOT: fill it)', () => {
    // A screen 400 tall shrinks to well under S-81's height. FR-025 (MUST)
    // leaves the rest of the picture blank rather than shrinking the frame to
    // the drawing, so S-81's height is a floor.
    // ⚠️ Only the rows that fit ON a screen 400 tall: a row drawn below the
    // screen's own bottom edge is not a case about the picture's height.
    const picture = fitOrThrow(grownFor(400, TALL_ROWS.slice(0, 3)))
    expect(400 * RATIO).toBeLessThan(SETTINGS.exportCanvas.height)
    expect(picture.heightPx).toBe(SETTINGS.exportCanvas.height)
  })

  it('writes the whole scene while the picture still fits under the ceiling (MUST)', () => {
    // ⛔ THIS IS WHAT CR-333 CHANGED AND CR-337 SETTLED. The same rows on the
    // same screen used to lose `g5` and `g6` off the bottom, because the frame
    // stopped at S-81's height. Now the frame grows past them, and no row is
    // ever lost from a picture that is written at all.
    // GOES RED IF: the frame stops growing at S-81's height again.
    const answer = grownFor(800)
    expect(answer.ok).toBe(true)
    const picture = fitOrThrow(answer)
    expect(picture.heightPx).toBeLessThanOrEqual(SETTINGS.exportCanvasHeightCap)
    for (const id of DRAWN_ROW_IDS) {
      expect(picture.svg, id).toContain(`name of ${id}`)
    }
  })

  it('follows S-217 when the manuscript moves it (rule 04, section 2)', () => {
    // ⭐ The acceptance test of a value that travels from the manuscript is
    // 「change one value and the test fails」. A screen that fits under the
    // shipped ceiling has to stop fitting once the ceiling is halved.
    // GOES RED IF: the ceiling is read from anywhere but the settings.
    const halved = settingsOf({ exportCanvasHeightCap: SETTINGS.exportCanvasHeightCap / 2 })
    const tallScreen = Math.ceil(SETTINGS.exportCanvasHeightCap / RATIO) - 1
    expect(tallScreen * RATIO).toBeLessThanOrEqual(SETTINGS.exportCanvasHeightCap)
    expect(tallScreen * RATIO).toBeGreaterThan(SETTINGS.exportCanvasHeightCap / 2)
    expect(grownFor(tallScreen, TALL_ROWS).ok, 'under the shipped ceiling').toBe(true)
    expect(grownFor(tallScreen, TALL_ROWS, halved).ok, 'over the halved one').toBe(false)
  })

  it('asks the rasterizer for the GROWN height times S-82 (MUST)', async () => {
    // FR-025 (MUST): the pixels are the picture's size times S-82. ⛔ A route
    // that read `exportCanvas.height` again here would paint a 900-unit window
    // onto a picture 1280 tall.
    const { rasterizer, calls } = watchedRasterizer()
    const scene = sceneOf(viewOf(TALL_ROWS), { settings: SETTINGS }, regionsOf(screenOf(800)))
    const result = await pngOf(rasterizer, scene)
    expect(calls).toHaveLength(1)
    expect(calls[0]?.sizePx).toEqual({
      widthPx: SETTINGS.exportCanvas.width * SETTINGS.exportPngScale,
      heightPx: result.heightPx * SETTINGS.exportPngScale,
    })
    expect(result.heightPx).toBeGreaterThan(SETTINGS.exportCanvas.height)
  })
})

// ===========================================================================
// FR-025 (CR-337) -- a picture that does not fit is not written at all
// ===========================================================================
//
// ⭐⭐ THE RULE, VERBATIM (`docs/spec/01-04-requirements.md`, FR-025):
// 「伸ばしても `S-217` に収まらないときは、画像を書き出さないこと（MUST）。
// 一部だけを描いてはならない（MUST NOT）」 and 「理由を告げること（MUST）。
// 理由は 表 T-233 の `RS-43` とすること（MUST）」, scoped by 「止めるのは 表 T-024
// の `IO-3`（SVG）・`IO-4`（PNG）・`IO-6`（クリップボード）である —— `IO-1` /
// `IO-2` / `IO-7` は絵ではないので、高さの天井に当たらない」.
//
// ⚠️ WHAT THIS UNIT CAN AND CANNOT SAY ABOUT `RS-43`. Table T-233 is a table of
// REASONS A TELLING CARRIES, and the telling is composed where the display
// language is known (FR-038) -- not here. So what these cases hold this unit to
// is the half it owns: it refuses, it hands back no picture at all, and it
// carries ONE reason for every scene that is too tall, so that the row can be
// chosen from it downstream. ⛔ The row id `RS-43` itself is asserted where the
// notice is worded, in `tests/unit/uf-47-48-choosers.test.ts`.
describe('FR-025 -- a scene that will not fit is refused outright (CR-337)', () => {
  const screenOf = (height: number): MeasuredScreen => ({ ...SCREEN, height })

  const answerFor = (height: number, settings: DocumentSettings = SETTINGS): ExportScene =>
    sceneOf(viewOf(TALL_ROWS), { settings }, regionsOf(screenOf(height), settings))

  /**
   * The screen whose shrunk picture is EXACTLY S-217 tall, and the first one
   * past it. ⛔ Both are derived from S-81's width and S-217, never typed: the
   * ratio is S-81's width over the screen's width (FR-080), so the picture
   * reaches the ceiling where the screen reaches `S-217 / ratio`.
   */
  const SCREEN_AT_CEILING = SETTINGS.exportCanvasHeightCap / RATIO
  const SCREEN_OVER_CEILING = SCREEN_AT_CEILING + 1

  it('refuses IO-3 and writes nothing when the grown picture passes S-217 (MUST NOT: draw part of it)', () => {
    // GOES RED IF: `exportSvg` answers with a picture -- whole or cut -- for a
    // scene whose growth passes the ceiling.
    expect(SCREEN_OVER_CEILING * RATIO, 'the fixture is past the ceiling').toBeGreaterThan(
      SETTINGS.exportCanvasHeightCap,
    )
    const answer = exportSvg(answerFor(SCREEN_OVER_CEILING))
    expect(answer.ok).toBe(false)
    if (answer.ok) return
    // 「画像を書き出さないこと（MUST）」: there is no picture on the answer at
    // all, not an empty one and not a cut one.
    expect(Object.keys(answer).includes('svg'), 'no picture came back').toBe(false)
    expect(Object.keys(answer).includes('heightPx'), 'no size came back').toBe(false)
  })

  it('refuses IO-4 too, and never paints the seam (MUST NOT: draw part of it)', async () => {
    // ⛔ IO-4 is made FROM IO-3 (WY-2 of table T-041), so a refused SVG can
    // leave no PNG behind. Painting the seam at all would mean bytes existed.
    // GOES RED IF: the rasterizer is called for a scene that is refused.
    const { rasterizer, calls } = watchedRasterizer()
    const answer = await exportPng(rasterizer, answerFor(SCREEN_OVER_CEILING))
    expect(answer.ok).toBe(false)
    if (answer.ok) return
    expect(Object.keys(answer).includes('png'), 'no bytes came back').toBe(false)
    expect(Object.keys(answer).includes('svg'), 'no picture came back').toBe(false)
    expect(calls, 'the seam was never asked to paint').toHaveLength(0)
  })

  it('tells a reason, and the same one for every scene that is too tall (MUST: table T-233 RS-43)', () => {
    // FR-025 (MUST): 「理由を告げること（MUST）。理由は 表 T-233 の `RS-43`
    // とすること（MUST）」. Table T-233 holds ONE row for this, so this unit
    // may hand its caller only one classification for it, whatever the shape of
    // the scene that overflowed.
    // GOES RED IF: a refusal comes back with no reason on it, or two too-tall
    // scenes are classified apart -- either would leave the caller unable to
    // choose RS-43 and only RS-43.
    const refusals = [SCREEN_OVER_CEILING, SCREEN_OVER_CEILING * 2, SCREEN_OVER_CEILING * 10].map(
      (height) => exportSvg(answerFor(height)),
    )
    const reasons = new Set<string>()
    for (const answer of refusals) {
      expect(answer.ok, 'every one of these screens passes the ceiling').toBe(false)
      if (answer.ok) continue
      expect(typeof answer.fault.reason).toBe('string')
      expect(answer.fault.reason.length).toBeGreaterThan(0)
      reasons.add(answer.fault.reason)
    }
    expect(reasons.size, 'one reason, so one row of table T-233').toBe(1)
  })

  it('answers a picture, not a refusal, while the growth stays inside S-217 (MUST)', () => {
    // The other side of the same edge. FR-025 (MUST): 「高さは、絵が収まるとこ
    // ろまで伸ばすこと」 -- so a scene that fits is written in full.
    // GOES RED IF: the refusal reaches scenes that fit.
    const answer = exportSvg(answerFor(SCREEN_AT_CEILING - 1))
    expect(answer.ok).toBe(true)
    if (!answer.ok) return
    expect(answer.heightPx).toBeLessThanOrEqual(SETTINGS.exportCanvasHeightCap)
    for (const id of DRAWN_ROW_IDS) {
      expect(answer.svg, id).toContain(`name of ${id}`)
    }
  })

  it('writes the picture whose grown height is EXACTLY S-217 (MUST: 伸ばしてよいのはその S-217 まで)', () => {
    // ⭐ THE EDGE ITSELF. FR-025 states the ceiling twice and inclusively both
    // times: 「伸ばしてよいのはその `S-217` までとすること（MUST）」 --
    // 「まで」 includes its bound -- and the refusal is worded 「伸ばしても `S-217`
    // に収まらないとき」, and a picture of exactly S-217 does fit in S-217.
    // ⚠️ The specification states no comparison operator anywhere, so this case
    // rests on those two words. If a reader means the edge to be refused, this
    // is the case to overturn.
    // GOES RED IF: the ceiling is compared with `>=` instead of `>`.
    expect(SCREEN_AT_CEILING * RATIO).toBe(SETTINGS.exportCanvasHeightCap)
    const answer = exportSvg(answerFor(SCREEN_AT_CEILING))
    expect(answer.ok).toBe(true)
    if (!answer.ok) return
    expect(answer.heightPx).toBe(SETTINGS.exportCanvasHeightCap)
  })

  it('refuses on the SAME scene through both entries (WY-2 of table T-041)', async () => {
    // ⛔ IO-3 and IO-4 are two outputs of ONE assembly, so one of them may not
    // refuse while the other writes.
    // GOES RED IF: either entry keeps its own ceiling.
    const { rasterizer } = watchedRasterizer()
    for (const height of [SCREEN_AT_CEILING, SCREEN_OVER_CEILING]) {
      const scene = answerFor(height)
      const bySvg = exportSvg(scene)
      const byPng = await exportPng(rasterizer, scene)
      expect(byPng.ok, `screen ${height} tall`).toBe(bySvg.ok)
    }
  })

  it('follows the ceiling the settings hold, not a number of its own (rule 03)', () => {
    // ⭐ Rule 04, section 2: a value that travels from the manuscript is proved
    // by moving it. A screen that is written at the shipped S-217 has to be
    // refused once S-217 is halved, and written once it is doubled.
    // ⛔ `exportCanvasHeightCap` and `exportCanvas` are read from
    // SETTINGS_DEFAULTS, which `npm run gen` writes out of the manuscript --
    // no number in this file is typed from the table.
    // GOES RED IF: the ceiling is a literal in the unit.
    const scene = (settings: DocumentSettings): ExportScene =>
      sceneOf(
        viewOf(TALL_ROWS),
        { settings },
        regionsOf(screenOf(SCREEN_AT_CEILING), settings),
      )
    const halved = settingsOf({ exportCanvasHeightCap: SETTINGS.exportCanvasHeightCap / 2 })
    const doubled = settingsOf({ exportCanvasHeightCap: SETTINGS.exportCanvasHeightCap * 2 })
    expect(exportSvg(scene(halved)).ok, 'halved ceiling').toBe(false)
    expect(exportSvg(scene(doubled)).ok, 'doubled ceiling').toBe(true)
  })
})

// ===========================================================================
// FR-025 (CR-337) -- how far the refusal reaches, by table T-024
// ===========================================================================

/**
 * A fixed copy of the rows of table T-024 that FR-025 names, with the column
 * the requirement adds to them: 「止めるのは 表 T-024 の `IO-3`（SVG）・`IO-4`
 * （PNG）・`IO-6`（クリップボード）である —— `IO-1` / `IO-2` / `IO-7` は絵で
 * はないので、高さの天井に当たらない」.
 */
const T_024_CEILING_SCOPE = [
  { id: 'IO-1', form: 'MSPDI XML', isPicture: false },
  { id: 'IO-2', form: 'GRS JSON', isPicture: false },
  { id: 'IO-3', form: 'SVG', isPicture: true },
  { id: 'IO-4', form: 'PNG', isPicture: true },
  { id: 'IO-6', form: 'clipboard', isPicture: true },
  { id: 'IO-7', form: 'single .html', isPicture: false },
] as const

describe('table T-024 -- which routes the height ceiling reaches', () => {
  it('names three picture rows and three that are not pictures (one case walks the copy)', () => {
    // GOES RED IF: the copy stops matching FR-025's own list of three.
    expect(T_024_CEILING_SCOPE.filter((row) => row.isPicture).map((row) => row.id)).toEqual([
      'IO-3',
      'IO-4',
      'IO-6',
    ])
    expect(T_024_CEILING_SCOPE.filter((row) => !row.isPicture).map((row) => row.id)).toEqual([
      'IO-1',
      'IO-2',
      'IO-7',
    ])
  })

  it('makes the picture for all three picture rows here, and no non-picture route at all', () => {
    // ⭐ THIS IS THE WHOLE OF THE SCOPE THIS UNIT CAN BE HELD TO. `exportSvg`
    // is IO-3's own output and the string IO-6 sends (FR-025: 「`IO-6` の入口は
    // 表 T-109 の `IC-3`」, and the picture is the same one, FR-080);
    // `exportPng` is IO-4. ⛔ IO-1, IO-2 and IO-7 have no entry on this
    // component -- table T-064 gives PI-21 two names and these are they -- so
    // there is nothing here for the ceiling to reach them through, and nothing
    // here that could stop them.
    // ⚠️ THAT IO-1 / IO-2 / IO-7 STILL WRITE FOR A TOO-TALL SCENE IS NOT
    // MEASURABLE IN THIS FILE. It is measurable where those three are pressed,
    // which is `tests/unit/uf-47-48-choosers.test.ts`.
    // GOES RED IF: a third runtime name appears on this component.
    expect(Object.keys(imageExporter).sort()).toEqual(['exportPng', 'exportSvg'])
  })
})
