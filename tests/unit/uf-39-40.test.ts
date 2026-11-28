// Unit tests: the image exporter (UF-39) and its rasterizer seam (UF-40).

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
  TaskGroupTitle,
  ScreenFrame,
  ScreenView,
  Scrollbar,
} from '../../src/adapter/screen-renderer/screen-renderer'
import { colorOf } from '../../src/adapter/svg-renderer/svg-renderer'
import {
  SETTINGS_CONSTANTS,
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type {
  ScreenRect,
  ScreenRegions,
} from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { specTable } from '../contract/spec-table'
import { DEFAULT_DISPLAY_SCALE, displayRatioAt } from '../fixtures/display-scale'
import { taskGroupNameFont } from '../fixtures/task-group-name-font'

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

// Spec: FR-039, T-252
const DISPLAY_RATIO = displayRatioAt(DEFAULT_DISPLAY_SCALE)

const settingsOf = (part: Record<string, unknown> = {}): DocumentSettings =>
  ({ ...SETTINGS_BASE, ...part }) as unknown as DocumentSettings

const SETTINGS = settingsOf({ displayScale: DEFAULT_DISPLAY_SCALE })

// Spec: T-064
// Why: the roster is read from the table at run time, so a case cannot go
// on passing after the row gains or loses a member.
const PI_21_MEMBERS = ((): readonly { name: string; isType: boolean }[] => {
  const row = specTable('T-064').rows.find((one) => one.id === 'PI-21')
  if (row === undefined) throw new Error('table T-064 no longer holds PI-21')
  const cell = row.cells[row.cells.length - 1] ?? ''
  return cell
    .split(String.fromCharCode(0xff0f))
    .map((piece) => {
      const found = /^\s*`([A-Za-z][A-Za-z0-9_]*)`/.exec(piece)
      // Why: a piece that points at table T-065 is a cross-layer interface, which
      // is erased at run time, so it is marked a type.
      return found === null ? null : { name: found[1] as string, isType: piece.includes('T-065') }
    })
    .filter((one): one is { name: string; isType: boolean } => one !== null)
})()

const PI_21_ENTRIES = PI_21_MEMBERS.filter((one) => !one.isType).map((one) => one.name)

const PI_21_UNNAMED_RUNTIME_NAMES: readonly string[] = []

// Why: built from code points because the tree is kept ASCII; a literal
// would be invisible in a diff.
const DEFAULT_COLUMN = String.fromCharCode(0x65e2, 0x5b9a)

// Spec: S-73, DR-5
// Why: DR-5 keeps the hue on Project, outside DocumentSettings and
// ScreenView, so a scene has to state it.
const THEME_HUE = ((): number => {
  const row = specTable('T-216').rows.find((one) => one.id === 'S-73')
  if (row === undefined) throw new Error('table T-216 has no row S-73')
  const found = /-?\d+(?:\.\d+)?/.exec((row.by[DEFAULT_COLUMN] ?? '').replace(/`/g, ''))
  const value = Number(found?.[0] ?? '')
  if (!Number.isFinite(value)) throw new Error('table T-216 row S-73 states no number')
  return value
})()

type Picture = Extract<SvgExport, { readonly ok: true }>
type PictureAndPng = Extract<ImageExport, { readonly ok: true }>

// Why: every scene here is far under the S-217 ceiling, so a refusal means
// the fixture drifted and must stop the case, not be asserted around.
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

// Spec: FR-051, FR-052
// Why: built from the spec's arithmetic, not through regionsFromScreen
// (UF-58), so a misreading shared by both units cannot hide.

interface MeasuredScreen {
  readonly width: number
  readonly height: number
  readonly appHeaderHeight: number
  readonly scrollbarThickness: number
}

// Why: 5:4 against the export's 16:9, so a per-axis ratio (1.125) cannot
// pass for the single ratio of 1.6.
const SCREEN: MeasuredScreen = {
  width: 1000,
  height: 800,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
}

const PROPERTIES_PANEL_WIDTH = 0

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
  const taskGroupAreaWidth =
    canvas.width -
    SETTINGS_CONSTANTS.canvasPadding -
    settings.taskGroupPanelWidthPx -
    PROPERTIES_PANEL_WIDTH -
    screen.scrollbarThickness
  const taskGroupAreaHeight =
    canvas.height - settings.rulerHeightPx - SETTINGS_CONSTANTS.canvasPadding - screen.scrollbarThickness
  return {
    appHeader: header,
    scheduleCanvas: canvas,
    taskGroupPanel: {
      x: canvas.x,
      y: canvas.y,
      width: settings.taskGroupPanelWidthPx,
      height: canvas.height,
    },
    timeRuler: {
      x: canvas.x + settings.taskGroupPanelWidthPx,
      y: canvas.y,
      width: taskGroupAreaWidth,
      height: settings.rulerHeightPx,
    },
    propertiesPanel: {
      x: canvas.x + canvas.width - PROPERTIES_PANEL_WIDTH,
      y: canvas.y,
      width: PROPERTIES_PANEL_WIDTH,
      height: canvas.height,
    },
    taskGroupArea: {
      x: canvas.x + settings.taskGroupPanelWidthPx,
      y: canvas.y + settings.rulerHeightPx,
      width: taskGroupAreaWidth,
      height: taskGroupAreaHeight,
    },
  }
}

const REGIONS = regionsOf()

// Why: the arriving picture holds only a circle, so every rect and text in
// the export is one this component wrote.

const PICTURE =
  '<svg xmlns="http://www.w3.org/2000/svg" data-from="svg-renderer">' +
  '<circle cx="7" cy="11" r="3"/></svg>'

// Why: the parts table T-076 keeps out are handed in, and open, so a case
// can show they were left out rather than never there.

const commandOf = (label: string): CommandItem => ({
  icon: 'IC-3',
  isEnabled: true,
  isPressed: false,
  isArmed: false,
  isChosen: false,
  label,
})

const HEADER_COMMAND_LABEL = 'EP-1 header command, U-35, not drawn'
const AUTOSAVE_AT = '2026-08-19T09:00:00Z'
const DOCUMENT_TITLE = 'EP-1 document title, U-27'

const APP_HEADER_ITEMS: AppHeaderItems = {
  documentTitle: DOCUMENT_TITLE,
  openedFileName: null,
  fileSavedAt: null,
  fileSavedByteLength: null,
  fileNeverSavedText: '',
  commands: [commandOf(HEADER_COMMAND_LABEL)],
  language: 'ja',
}

// Why: EP-9 draws the line and not the grab band, so the two get different
// rectangles; the band straddles the line, so both come from the regions.
const dividersOf = (regions: ScreenRegions): readonly PanelDivider[] => {
  const lineAt = (x: number): ScreenRect => ({
    x,
    y: regions.scheduleCanvas.y,
    width: 1,
    height: regions.scheduleCanvas.height,
  })
  const bandAround = (line: ScreenRect): ScreenRect => ({ ...line, x: line.x - 4, width: 8 })
  const titleLine = lineAt(regions.taskGroupPanel.x + regions.taskGroupPanel.width - 1)
  const propsLine = lineAt(regions.propertiesPanel.x)
  return [
    { panel: 'taskGroupPanel', band: bandAround(titleLine), line: titleLine },
    { panel: 'propertiesPanel', band: bandAround(propsLine), line: propsLine },
  ]
}

// Spec: EP-10, SC-4
const scrollbarsOf = (regions: ScreenRegions): readonly Scrollbar[] => {
  const area = regions.taskGroupArea
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

const PROPERTY_FIELD_TEXT = 'EP-8 property value, not drawn'
const PALETTE_GROUP_NAME = 'EP-11 palette group, U-34, not drawn'
const PALETTE_ARMED_TEXT = 'EP-11 armed, not drawn'
const MODAL_HEADING = 'EP-11 modal heading, U-30, not drawn'
const NOTICE_TEXT = 'a notice, which table T-076 gives no row, not drawn'
const TOOLTIP_TEXT = 'a tooltip, which table T-076 gives no row, not drawn'

const NOT_DRAWN_WORDS: readonly string[] = [
  HEADER_COMMAND_LABEL,
  AUTOSAVE_AT,
  PROPERTY_FIELD_TEXT,
  PALETTE_GROUP_NAME,
  PALETTE_ARMED_TEXT,
  MODAL_HEADING,
  NOTICE_TEXT,
  TOOLTIP_TEXT,
]

const rowOf = (
  taskGroupId: string,
  depth: number,
  box: ScreenRect,
  label: string | null = `name of ${taskGroupId}`,
): TaskGroupTitle => ({
  taskGroupId,
  depth,
  box,
  label,
  indentPx: depth * SETTINGS_CONSTANTS.taskGroupTitleIndent * DISPLAY_RATIO,
  ...taskGroupNameFont(depth),
  wholeLabel: label,
  isLabelTruncated: false,
  expander: { canOpen: true, canClose: true, canCloseBelow: false },
  isPinned: false,
  isSelected: false,
})

const viewOf = (
  titles: readonly TaskGroupTitle[],
  part: Partial<ScreenView> = {},
  pinnedTitles: readonly TaskGroupTitle[] = [],
): ScreenView => ({
  // Why: this unit draws no words of its own, so the language cannot reach
  // the picture; it is filled only because ScreenView requires it.
  language: 'ja',
  frame: frameOf(),
  appHeaderItems: APP_HEADER_ITEMS,
  taskGroupPanel: { pinnedTitles, titles },
  // Why: the cast is narrow on purpose: whether the description still declares
  // a heading member is the implementation's answer, not a compile error here.
  propertiesPanel: {
    showing: 'selection',
    isSubjectGone: false,
    fields: [{ row: 'PR-1', name: 'name', text: PROPERTY_FIELD_TEXT, isEditable: true, controls: [] }],
    // Why: empty on purpose; the panel's own entrance (IC-52) is another
    // bench's subject.
    commands: [],
  } as ScreenView['propertiesPanel'],
  commandPalette: {
    // Why: a corner, not a rectangle: the palette's size follows its contents.
    at: { x: 300, y: 300 },
    // Why: inert here; EP-11 drops the palette from the picture, so the value
    // is deliberately not copied from table T-206.
    grabBandHeight: 7,
    minimize: {
      icon: 'IC-75',
      label: 'IC-75',
      isEnabled: true,
      isPressed: false,
      isArmed: false,
      isChosen: false,
    },
    isMinimized: false,
    groups: [{ name: PALETTE_GROUP_NAME, commands: [commandOf('EP-11 palette command')] }],
    armedText: PALETTE_ARMED_TEXT,
  },
  openModal: { surface: 'Help Window', heading: MODAL_HEADING, commands: [] },
  notices: [
    {
      manner: 'NT-3a',
      mannerText: '',
      text: NOTICE_TEXT,
      nextSteps: ['retry'],
      affectedCount: null,
      dismissText: 'OK',
      dismissKey: 'NT-3a',
      raisedNotices: [],
    },
  ],
  confirmation: null,
  tooltips: [{ anchor: { kind: 'taskGroupTitle', taskGroupId: 'g1' }, text: TOOLTIP_TEXT, assignment: null }],
  ...part,
})

// Why: Rasterizer is imported through the entry only, so `npm run typecheck`
// proves the entry re-publishes the seam (Chapter 5.3).

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

// Why: the seam's contract forbids rejecting, but its implementation (CP-31)
// lives in another layer, so FR-028 may not rest on it keeping its word.
const rejectingRasterizer = (reason: unknown): Rasterizer => ({
  rasterizePng: (): Promise<Rastering> => Promise.reject(reason),
})

const throwingRasterizer = (reason: unknown): Rasterizer => ({
  rasterizePng: (): Promise<Rastering> => {
    throw reason
  },
})

const EVERY_REASON: readonly { readonly why: string; readonly reason: unknown }[] = [
  { why: 'an Error', reason: new Error('SecurityError: tainted canvas') },
  { why: 'a string', reason: 'no canvas here' },
  { why: 'undefined', reason: undefined },
  { why: 'null', reason: null },
  { why: 'an object that is not an Error', reason: { name: 'SecurityError' } },
]

// Spec: NT-3a
const T_037_REASONS: readonly { readonly reason: RasterFaultReason; readonly nextStep: string }[] =
  [
    { reason: 'unsupported', nextStep: 'the SVG of IO-3 is still there' },
    { reason: 'tooLarge', nextStep: 'an exchange format instead of a picture' },
    { reason: 'rasterFailed', nextStep: 'try again' },
  ]

// Why: only WY-3 is inside one unit's reach; WY-1 and WY-2 are listed so
// that leaving them out is on purpose.
const T_041_ROWS = [
  { id: 'WY-1', reach: 'whole product -- write, initialize, read back' },
  { id: 'WY-2', reach: 'whole product -- two exports of one document' },
  { id: 'WY-3', reach: 'this unit -- the screen rectangle times the ratio' },
] as const

// Why: FR-080 bars a comparison from depending on attribute order, decimals
// or whitespace, so the numbers are parsed and compared as numbers.

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

// Why: FR-080's one rounding rule is not yet stated (Chapter 6.1), so cases
// assert agreement within 0.05 px, which no coordinate rounding can cross.
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

interface Assembled {
  readonly result: Picture
  readonly scene: ExportScene
  readonly ratio: number
  readonly pictureCount: number
  readonly own: readonly Drawn[]
  readonly rects: readonly Drawn[]
  readonly ground: Drawn | null
  readonly texts: readonly DrawnText[]
  // Why: nothing asserts the clip's shape any more; it is parsed out only so
  // a rect inside a clipPath is not counted as one the component drew.
  readonly clip: ScreenRect | null
  readonly root: Drawn
  readonly pictureScales: readonly string[]
}

const CLIP_BLOCK = /<clipPath((?:[^<>"]|"[^"]*")*)>([\s\S]*?)<\/clipPath>/

// Spec: IX-10, S-146
const isGroundOf = (scene: ExportScene, root: Drawn | undefined) => (drawn: Drawn): boolean =>
  root !== undefined &&
  drawn.tag === 'rect' &&
  num(drawn.attrs, 'x') === 0 &&
  num(drawn.attrs, 'y') === 0 &&
  num(drawn.attrs, 'width') === num(root.attrs, 'width') &&
  num(drawn.attrs, 'height') === num(root.attrs, 'height') &&
  drawn.attrs['fill'] === colorOf('S-146', scene.themeHue, scene.themePreference === 'dark', false)

const assembledOf = (result: Picture, scene: ExportScene): Assembled => {
  const parts = result.svg.split(scene.svg)
  const withoutPicture = parts.join('')
  const clipHit = CLIP_BLOCK.exec(withoutPicture)
  const clipRects =
    clipHit === null ? [] : elementsOf(clipHit[2] ?? '').filter((drawn) => drawn.tag === 'rect')
  const body = clipHit === null ? withoutPicture : withoutPicture.replace(CLIP_BLOCK, '')
  const own = elementsOf(body)
  const screenWidth = scene.regions.scheduleCanvas.x + scene.regions.scheduleCanvas.width
  const allRects = own.filter((drawn) => drawn.tag === 'rect')
  const groundAt = allRects.findIndex(isGroundOf(scene, own[0]))
  return {
    result,
    scene,
    ratio: SETTINGS_CONSTANTS.exportCanvas.width / screenWidth,
    pictureCount: parts.length - 1,
    own,
    rects: allRects.filter((_drawn, index) => index !== groundAt),
    ground: allRects[groundAt] ?? null,
    texts: textsOf(body),
    clip: clipRects[0] !== undefined && clipRects.length === 1 ? rectOf(clipRects[0]) : null,
    root: own[0] ?? { tag: 'nothing was assembled', attrs: {} },
    // Why: the received picture cannot carry the ratio in its own numbers, so
    // its transform is where one ratio, scale(a) not scale(a,b), must show.
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
  settings: SETTINGS,
  themePreference: 'light',
  themeHue: THEME_HUE,
  ...part,
})

const exportedOf = async (scene: ExportScene): Promise<Assembled> => {
  const { rasterizer } = watchedRasterizer()
  return assembledOf(fitOrThrow(await exportPng(rasterizer, scene)), scene)
}

const pngOf = async (
  rasterizer: Rasterizer,
  scene: ExportScene,
): Promise<PictureAndPng> => fitOrThrow(await exportPng(rasterizer, scene))

// Spec: IO-3, WY-2
const svgOnlyOf = (scene: ExportScene): Assembled =>
  assembledOf(fitOrThrow(exportSvg(scene)), scene)

// Why: a write into a frozen object throws in strict mode, so a unit that
// calls itself pure while rewriting an argument fails instead of passing.
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

const RATIO = SETTINGS_CONSTANTS.exportCanvas.width / SCREEN.width

const GROWN_HEIGHT = Math.max(SETTINGS_CONSTANTS.exportCanvas.height, SCREEN.height * RATIO)

const TALL_TASK_GROUPS: readonly TaskGroupTitle[] = [
  rowOf('g1', 1, { x: 0, y: 100, width: SETTINGS.taskGroupPanelWidthPx, height: 100 }),
  rowOf('g2', 2, { x: 0, y: 200, width: SETTINGS.taskGroupPanelWidthPx, height: 100 }),
  rowOf('g3', 3, { x: 0, y: 300, width: SETTINGS.taskGroupPanelWidthPx, height: 100 }),
  rowOf('g4', 1, { x: 0, y: 400, width: SETTINGS.taskGroupPanelWidthPx, height: 100 }),
  rowOf('g5', 2, { x: 0, y: 500, width: SETTINGS.taskGroupPanelWidthPx, height: 100 }),
  rowOf('g6', 2, { x: 0, y: 600, width: SETTINGS.taskGroupPanelWidthPx, height: 100 }),
]
const DRAWN_ROW_IDS = ['g1', 'g2', 'g3', 'g4', 'g5', 'g6']

const TALL_SCENE = sceneOf(viewOf(TALL_TASK_GROUPS))

// Spec: FR-080, WY-3
describe('FR-080 -- one ratio, both axes, over the whole screen', () => {
  it('sizes the output at S-81\'s width and starts it at the screen\'s own origin', async () => {
    const assembled = await exportedOf(TALL_SCENE)
    expect(assembled.root.tag).toBe('svg')
    expect(num(assembled.root.attrs, 'width')).toBe(SETTINGS_CONSTANTS.exportCanvas.width)
    expect(num(assembled.root.attrs, 'height')).toBeCloseTo(GROWN_HEIGHT, 6)
    expect(assembled.root.attrs['viewBox']).toBe(
      `0 0 ${SETTINGS_CONSTANTS.exportCanvas.width} ${GROWN_HEIGHT}`,
    )
  })

  it('multiplies the SAME ratio into both axes (MUST NOT: one per axis)', async () => {
    const assembled = await exportedOf(TALL_SCENE)
    const band = assembled.rects.find((drawn) =>
      near(num(drawn.attrs, 'width'), REGIONS.appHeader.width * RATIO),
    )
    expect(band, 'EP-1: the App Header band is drawn').toBeDefined()
    const drawn = rectOf(band as Drawn)
    expect(drawn.width / REGIONS.appHeader.width).toBeCloseTo(RATIO, 6)
    expect(drawn.height / REGIONS.appHeader.height).toBeCloseTo(RATIO, 6)
  })

  it('places the picture that arrived under ONE scale factor, the ratio', async () => {
    const assembled = await exportedOf(TALL_SCENE)
    expect(assembled.pictureCount, 'the received picture is embedded once').toBe(1)
    expect(assembled.pictureScales.length).toBeGreaterThan(0)
    for (const factor of assembled.pictureScales) {
      expect(factor, 'a single factor, not a pair').not.toContain(',')
      expect(Number.parseFloat(factor)).toBeCloseTo(RATIO, 6)
    }
  })

  it('reads the ratio off the WHOLE screen, never a narrower cut-out', async () => {
    const assembled = await exportedOf(TALL_SCENE)
    const screenWidth = REGIONS.scheduleCanvas.x + REGIONS.scheduleCanvas.width
    expect(screenWidth).toBe(SCREEN.width)
    expect(assembled.ratio).toBeCloseTo(SETTINGS_CONSTANTS.exportCanvas.width / screenWidth, 6)
    const band = assembled.rects.find((drawn) => near(rectOf(drawn).x, 0) && near(rectOf(drawn).y, 0))
    expect(band, 'the band starts at the screen origin').toBeDefined()
    expect(num((band as Drawn).attrs, 'width')).toBeCloseTo(SETTINGS_CONSTANTS.exportCanvas.width, 1)
  })
})

describe('table T-041 -- which rows of the WYSIWYG judgment one unit can answer', () => {
  it('names all three rows and says which is inside this unit (one case walks the table)', () => {
    expect(T_041_ROWS.map((row) => row.id)).toEqual(['WY-1', 'WY-2', 'WY-3'])
    const here = T_041_ROWS.filter((row) => row.reach.startsWith('this unit'))
    expect(here.map((row) => row.id)).toEqual(['WY-3'])
  })

  it('WY-3: every part table T-076 draws is its screen rectangle times the ratio', async () => {
    const assembled = await exportedOf(TALL_SCENE)
    expect(hasRect(assembled, REGIONS.appHeader), 'EP-1 band').toBe(true)
    expect(hasRect(assembled, REGIONS.taskGroupPanel), 'EP-3 panel').toBe(true)
    for (const divider of DIVIDERS) {
      expect(hasRect(assembled, divider.line), `EP-9 ${divider.panel} line`).toBe(true)
    }
  })
})

// Why: rows marked `arrives` are drawn by SvgRenderer into the received
// picture, so this unit owes them only that it neither adds nor removes them.
const T_076_ROWS: readonly {
  readonly id: string
  readonly part: string
  readonly expectation: 'draw' | 'partly' | 'no' | 'arrives'
  readonly holds: (assembled: Assembled) => boolean
}[] = [
  {
    id: 'EP-1',
    part: 'App Header (U-31): the band and the Project Title (U-27) only',
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
    part: 'Task Group Panel (U-22) and Task Group Title Tree (U-23)',
    expectation: 'draw',
    holds: (assembledSvg) =>
      hasRect(assembledSvg, assembledSvg.scene.regions.taskGroupPanel) &&
      DRAWN_ROW_IDS.every((id) => assembledSvg.texts.some((drawnText) => drawnText.content === `name of ${id}`)),
  },
  {
    id: 'EP-4',
    part: 'Task Group Buttons (U-47) / Pin Button (U-48) / Hidden Group Tab (U-29)',
    expectation: 'no',
    holds: (assembledSvg) => nothingBeyondTheAccounted(assembledSvg),
  },
  {
    id: 'EP-5',
    part: "Task Group Lanes's contents (U-1 .. U-46)",
    expectation: 'arrives',
    holds: (assembledSvg) => assembledSvg.pictureCount === 1 && !hasRect(assembledSvg, assembledSvg.scene.regions.taskGroupArea),
  },
  {
    id: 'EP-6',
    part: 'Cursors (U-10): Status Line and Dual Cursor yes, Guide Cursor no',
    expectation: 'arrives',
    holds: (assembledSvg) => assembledSvg.pictureCount === 1 && nothingBeyondTheAccounted(assembledSvg),
  },
  {
    id: 'EP-7',
    part: 'Watermark (U-20), inside the Task Group Lanes only',
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
    part: 'Command Palette (U-26) / modals (U-30) / Resource List (U-49)',
    expectation: 'no',
    holds: (assembledSvg) =>
      !saysAnyOf(assembledSvg, [PALETTE_GROUP_NAME, PALETTE_ARMED_TEXT, MODAL_HEADING]),
  },
  {
    id: 'EP-12',
    part: 'Pointer (U-42) / ArmedShape (U-38) / Selection (U-39) / Marquee (U-40) / Grab (U-43)',
    expectation: 'no',
    holds: (assembledSvg) => nothingBeyondTheAccounted(assembledSvg),
  },
  {
    id: 'EP-13',
    part: 'Schedule Canvas (U-32) -- the container itself',
    expectation: 'no',
    holds: (assembledSvg) => !hasRect(assembledSvg, assembledSvg.scene.regions.scheduleCanvas),
  },
  {
    id: 'EP-14',
    part: 'Actual Dummy (U-52)',
    expectation: 'no',
    holds: (assembledSvg) => nothingBeyondTheAccounted(assembledSvg),
  },
]

// Why: a part that is absent leaves nothing to look for, so the not-drawn
// rows are checked together by counting every rect and text that may be there.
const nothingBeyondTheAccounted = (assembled: Assembled): boolean => {
  const view = assembled.scene.screenView
  const bandAndPanel = 2
  const expectedRects = bandAndPanel + view.frame.dividers.length
  const rows = [...view.taskGroupPanel.pinnedTitles, ...view.taskGroupPanel.titles]
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
    // Why: a reading, not a quotation: neither has a row in table T-076, but
    // EP-11's reason (a tool's own surfaces are not the schedule) reaches them.
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

describe('FR-080 -- a part left out leaves a gap, it does not move its neighbors', () => {
  it('keeps the App Header band at its screen height (MUST NOT: squeeze it)', async () => {
    const assembled = await exportedOf(TALL_SCENE)
    const band = assembled.rects.find((drawn) => near(rectOf(drawn).y, 0))
    expect(band).toBeDefined()
    expect(rectOf(band as Drawn).height).toBeCloseTo(REGIONS.appHeader.height * RATIO, 1)
  })

  it('draws the same geometry whether or not the parts it leaves out are there', async () => {
    // Why: the controls are spent, not removed: HF-1 places them on every task
    // group, so the expander is not nullable; only armed or spent may vary.
    const withEverything = await exportedOf(TALL_SCENE)
    const bare = await exportedOf(
      sceneOf(
        viewOf(
          TALL_TASK_GROUPS.map((row) => ({
            ...row,
            expander: { canOpen: false, canClose: false, canCloseBelow: false },
            canOpenOneLevel: false,
            canAddChildTaskGroup: false,
            isPinned: false,
          })),
          {
            frame: { isFullScreen: false, dividers: DIVIDERS, scrollbars: [] },
            propertiesPanel: null,
            commandPalette: null,
            openModal: null,
            notices: [],
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

  it('does not move the Project Title when the items beside it go away', async () => {
    // Why: where the title stands is in no table, so this case asserts only
    // that it does not move.
    const withItems = await exportedOf(TALL_SCENE)
    const withoutItems = await exportedOf(
      sceneOf(
        viewOf(TALL_TASK_GROUPS, {
          appHeaderItems: {
            documentTitle: DOCUMENT_TITLE,
            openedFileName: null,
            fileSavedAt: null,
            fileSavedByteLength: null,
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
    expect(before, 'EP-1 draws the Project Title').toBeDefined()
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

  it('stands the Project Title inside the band it belongs to', async () => {
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

describe('table T-076 EP-3 -- the Task Group Panel and its names', () => {
  it('gives the panel the screen\'s width (MUST NOT: a width of its own)', async () => {
    // Why: a width of the export's own would put FR-085's truncation in another
    // place than the screen puts it.
    const assembled = await exportedOf(TALL_SCENE)
    const panel = assembled.rects.find((drawn) =>
      near(num(drawn.attrs, 'height'), REGIONS.taskGroupPanel.height * RATIO),
    )
    expect(panel).toBeDefined()
    expect(rectOf(panel as Drawn).width).toBeCloseTo(SETTINGS.taskGroupPanelWidthPx * RATIO, 1)
  })

  it('writes each name exactly as it arrived (FR-085 already cut it)', async () => {
    // Why: the room for the controls does not follow whether they are drawn
    // (FR-085), so the name arrives already cut and is not cut again.
    const cut = 'a name FR-085 already cut here'
    const assembled = await exportedOf(
      sceneOf(
        viewOf([
          rowOf('g1', 1, { x: 0, y: 100, width: SETTINGS.taskGroupPanelWidthPx, height: 40 }, cut),
        ]),
      ),
    )
    expect(assembled.texts.map((drawnText) => drawnText.content)).toContain(cut)
  })

  it('puts each name inside its own task group\'s band, in the task groups\' own order (SC-1)', async () => {
    // Why: where inside the band the baseline sits is not asserted; no
    // requirement says how S-33 is applied.
    const assembled = await exportedOf(TALL_SCENE)
    const yOf = (id: string): number => {
      const found = assembled.texts.find((drawnText) => drawnText.content === `name of ${id}`)
      expect(found, id).toBeDefined()
      return num((found as DrawnText).attrs, 'y')
    }
    const boxOf = (id: string): ScreenRect =>
      (TALL_TASK_GROUPS.find((row) => row.taskGroupId === id) as TaskGroupTitle).box
    for (const id of DRAWN_ROW_IDS) {
      const band = scaledRect(boxOf(id), RATIO)
      expect(yOf(id), id).toBeGreaterThan(band.y)
      expect(yOf(id), id).toBeLessThanOrEqual(band.y + band.height)
    }
    const drawnOrder = DRAWN_ROW_IDS.map((id) => yOf(id))
    expect(drawnOrder, 'the names run down the panel in the task groups\' order').toEqual(
      [...drawnOrder].sort((left, right) => left - right),
    )
  })

  it('keeps the box offset between two task groups the panel treats alike', async () => {
    // Why: g1 and g4 are both depth 1 and 100 high, so any baseline rule places
    // them alike, leaving only FR-080's ratio over SC-1's offset.
    const assembled = await exportedOf(TALL_SCENE)
    const yOf = (id: string): number =>
      num(
        (assembled.texts.find((drawnText) => drawnText.content === `name of ${id}`) as DrawnText).attrs,
        'y',
      )
    const boxOf = (id: string): ScreenRect =>
      (TALL_TASK_GROUPS.find((row) => row.taskGroupId === id) as TaskGroupTitle).box
    expect(boxOf('g4').height).toBe(boxOf('g1').height)
    expect(yOf('g4') - yOf('g1')).toBeCloseTo((boxOf('g4').y - boxOf('g1').y) * RATIO, 1)
  })

  it('indents one `taskGroupTitleIndent` per level of depth (S-37)', async () => {
    const assembled = await exportedOf(TALL_SCENE)
    const xOf = (id: string): number => {
      const found = assembled.texts.find((drawnText) => drawnText.content === `name of ${id}`)
      expect(found, id).toBeDefined()
      return num((found as DrawnText).attrs, 'x')
    }
    const step = SETTINGS_CONSTANTS.taskGroupTitleIndent * DISPLAY_RATIO * RATIO
    expect(xOf('g2') - xOf('g1')).toBeCloseTo(step, 1)
    expect(xOf('g3') - xOf('g1')).toBeCloseTo(step * 2, 1)
    expect(xOf('g4')).toBeCloseTo(xOf('g1'), 1)
    expect(xOf('g1')).toBeGreaterThanOrEqual(REGIONS.taskGroupPanel.x * RATIO)
  })

  it('writes a root task group larger by `taskGroupTitleTopScale` (S-36 and S-38)', async () => {
    const assembled = await exportedOf(TALL_SCENE)
    const sizeOf = (id: string): number => {
      const found = assembled.texts.find((drawnText) => drawnText.content === `name of ${id}`)
      expect(found, id).toBeDefined()
      return num((found as DrawnText).attrs, 'font-size')
    }
    expect(sizeOf('g2')).toBeCloseTo(SETTINGS_CONSTANTS.taskGroupTitleFont * DISPLAY_RATIO * RATIO, 1)
    expect(sizeOf('g3')).toBeCloseTo(SETTINGS_CONSTANTS.taskGroupTitleFont * DISPLAY_RATIO * RATIO, 1)
    expect(sizeOf('g1')).toBeCloseTo(
      SETTINGS_CONSTANTS.taskGroupTitleFont * SETTINGS_CONSTANTS.taskGroupTitleTopScale * DISPLAY_RATIO * RATIO,
      1,
    )
  })

  // Spec: FR-098, EP-3, EP-5
  it('writes the name of a pinned task group too (U-46 is drawn)', async () => {
    const pinned = rowOf(
      'p1',
      1,
      { x: 0, y: 110, width: SETTINGS.taskGroupPanelWidthPx, height: 40 },
      'a pinned task group name',
    )
    const assembled = await exportedOf(
      sceneOf(viewOf(TALL_TASK_GROUPS, {}, [{ ...pinned, isPinned: true }])),
    )
    expect(assembled.texts.map((drawnText) => drawnText.content)).toContain('a pinned task group name')
  })
})

describe('FR-025 -- the frame the picture is written into', () => {
  it('writes every task group of the scene, dropping none of them (CR-337)', async () => {
    const assembled = await exportedOf(TALL_SCENE)
    for (const id of DRAWN_ROW_IDS) {
      expect(assembled.texts.map((drawnText) => drawnText.content), id).toContain(`name of ${id}`)
    }
  })

  it('never changes the ratio to make the picture fit (MUST NOT)', async () => {
    const tall = await exportedOf(TALL_SCENE)
    const shortScreen: MeasuredScreen = { ...SCREEN, height: 500 }
    const shortRegions = regionsOf(shortScreen)
    const short = await exportedOf(
      sceneOf(
        viewOf(
          [rowOf('s1', 1, { x: 0, y: 120, width: SETTINGS.taskGroupPanelWidthPx, height: 60 })],
          { frame: frameOf(shortRegions) },
        ),
        {},
        shortRegions,
      ),
    )
    const bandWidth = (a: Assembled): number =>
      Math.max(...a.rects.map((drawn) => num(drawn.attrs, 'width')))
    expect(tall.result.heightPx).toBeGreaterThan(short.result.heightPx)
    expect(bandWidth(short)).toBeCloseTo(bandWidth(tall), 6)
  })

  it('leaves the remainder blank when the picture is shorter than S-81 (MUST NOT: add task groups)', async () => {
    const shortScreen: MeasuredScreen = { ...SCREEN, height: 500 }
    const shortRegions = regionsOf(shortScreen)
    const rows = [
      rowOf('s1', 1, { x: 0, y: 120, width: SETTINGS.taskGroupPanelWidthPx, height: 60 }),
      rowOf('s2', 2, { x: 0, y: 180, width: SETTINGS.taskGroupPanelWidthPx, height: 60 }),
    ]
    const assembled = await exportedOf(
      sceneOf(viewOf(rows, { frame: frameOf(shortRegions) }), {}, shortRegions),
    )
    const screenBottom = shortScreen.height * RATIO
    expect(screenBottom).toBeLessThan(SETTINGS_CONSTANTS.exportCanvas.height)
    expect(assembled.result.heightPx).toBe(SETTINGS_CONSTANTS.exportCanvas.height)
    expect(
      assembled.ground,
      'IX-10 (MUST) "paint the blanks in S-146" and (MUST NOT) "leave them transparent": the remainder is painted by one rect 0 0 width height, and it is the only full-canvas rect',
    ).not.toBeNull()
    expect(
      assembled.rects.filter(isGroundOf(assembled.scene, assembled.root)),
      'IX-10 (MUST NOT) "add task groups to fill it": beside the one ground, nothing else covers the remainder',
    ).toHaveLength(0)
    for (const element of assembled.rects) {
      const rect = rectOf(element)
      expect(rect.y + rect.height, JSON.stringify(rect)).toBeLessThanOrEqual(
        screenBottom + TOLERANCE,
      )
    }
    expect(assembled.texts).toHaveLength(rows.length + 1)
  })

  it('fixes the output size at S-81 and takes no size argument (MUST NOT: ask)', () => {
    expect(exportPng).toHaveLength(2)
  })
})

describe('table T-024 -- the SVG and the PNG come out of one assembly', () => {
  it('hands the rasterizer the very string it gives back as IO-3', async () => {
    // Why: a second assembly is how the two outputs would come to differ.
    const { rasterizer, calls } = watchedRasterizer()
    const result = await pngOf(rasterizer, TALL_SCENE)
    expect(calls).toHaveLength(1)
    expect(calls[0]?.svg).toBe(result.svg)
  })

  it('asks for exactly S-81 pixels -- FR-025 admits no scale (MUST NOT)', async () => {
    // Why: FR-025 forbids the export any scale, so this case walks no
    // multipliers: the pixels are the picture's own size.
    const { rasterizer, calls } = watchedRasterizer()
    const scene = sceneOf(viewOf(TALL_TASK_GROUPS), { settings: SETTINGS })
    const result = await pngOf(rasterizer, scene)
    expect(calls[0]?.sizePx).toEqual({
      widthPx: SETTINGS_CONSTANTS.exportCanvas.width,
      heightPx: GROWN_HEIGHT,
    })
    const root = assembledOf(result, scene).root
    expect(num(root.attrs, 'width')).toBe(SETTINGS_CONSTANTS.exportCanvas.width)
    expect(num(root.attrs, 'height')).toBeCloseTo(GROWN_HEIGHT, 6)
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
    // Why: assembling is arithmetic and cannot fail once it fits; only painting
    // needs a machine, so the SVG survives a failed PNG.
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
    // Why: the sentence depends on the display language, so this unit owes the
    // notice only the reason and the detail, intact.
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

describe('boundaries', () => {
  it('answers for a screen with no task groups at all', async () => {
    const assembled = await exportedOf(sceneOf(viewOf([])))
    expect(assembled.result.svg).toContain(PICTURE)
    expect(assembled.texts.map((drawnText) => drawnText.content)).toEqual([DOCUMENT_TITLE])
    expect(hasRect(assembled, REGIONS.taskGroupPanel), 'EP-3 panel is still drawn').toBe(true)
  })

  it('answers for exactly one task group', async () => {
    const assembled = await exportedOf(
      sceneOf(
        viewOf([rowOf('only', 1, { x: 0, y: 100, width: SETTINGS.taskGroupPanelWidthPx, height: 40 })]),
      ),
    )
    expect(assembled.texts.map((drawnText) => drawnText.content)).toContain('name of only')
  })

  it('writes no text for a task group whose label is null', async () => {
    const assembled = await exportedOf(
      sceneOf(
        viewOf([
          rowOf('n1', 1, { x: 0, y: 100, width: SETTINGS.taskGroupPanelWidthPx, height: 40 }, null),
        ]),
      ),
    )
    expect(assembled.texts.map((drawnText) => drawnText.content)).toEqual([DOCUMENT_TITLE])
  })

  it('writes no title when the document has none (`documentTitle` is null)', async () => {
    // Why: FR-035 fixes `Untitled` for the browser tab only, so nothing may be
    // substituted in the header here.
    const assembled = await exportedOf(
      sceneOf(
        viewOf(TALL_TASK_GROUPS, {
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
    const assembled = await exportedOf(TALL_SCENE)
    expect(assembled.pictureCount).toBe(1)
  })

  it('answers for an empty picture string without losing anything else', async () => {
    const { rasterizer } = watchedRasterizer()
    const result = await pngOf(rasterizer, sceneOf(viewOf(TALL_TASK_GROUPS), { svg: '' }))
    expect(result.svg).toContain('<svg')
    expect(result.png).toEqual({ ok: true, pngBytes: PNG_BYTES })
  })

  it('stays one SVG document when a name carries markup characters', async () => {
    // Why: a name is the document's own value, and a raw `<` would end the
    // element and make IO-3's output another picture.
    const wild = 'a & b < c > d "e"'
    const assembled = await exportedOf(
      sceneOf(
        viewOf(
          [rowOf('w1', 1, { x: 0, y: 100, width: SETTINGS.taskGroupPanelWidthPx, height: 40 }, wild)],
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

describe('Chapter 5.3 -- the seam is re-published by the public entry', () => {
  it('publishes every name of IF-6 through `image-exporter.ts` (MUST)', () => {
    // Why: types are erased at run time, so `npm run typecheck` is what proves
    // this: every name is imported from the entry and from nothing else.
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

describe('IF-6 -- the seam goes one way, so there is no round trip to test', () => {
  it('names IO-3 and IO-4 as write-only rows of table T-024', () => {
    // Why: the round trip is the codecs', not this unit's: IO-3 and IO-4 are
    // write only, and a read-back member would open an unvalidated intake.
    const writeOnly = ['IO-3', 'IO-4'] as const
    expect(writeOnly).toHaveLength(2)
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

// Spec: WY-2, IO-3, IO-4
// Why: a whole-product WY-2 run loads a JSON and fits it (FR-055) first; the
// half that fits one unit is both entries answering from one assembly.
describe('PI-21 exportSvg -- IO-3 and IO-4 are one assembly (WY-2 of table T-041)', () => {
  it('GIVEN one scene WHEN both entries run THEN the SVG route and the PNG route answer the same string (WY-2)', async () => {
    const { rasterizer } = watchedRasterizer()
    const svgOnly = fitOrThrow(exportSvg(TALL_SCENE))
    const both = await pngOf(rasterizer, TALL_SCENE)
    // Why: the same string, not equal after normalization: FR-080 normalizes
    // for two drawers, and there is only one drawer here.
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
    const assembled = svgOnlyOf(TALL_SCENE)
    expect(assembled.root.tag).toBe('svg')
    expect(num(assembled.root.attrs, 'width')).toBe(SETTINGS_CONSTANTS.exportCanvas.width)
    expect(num(assembled.root.attrs, 'height')).toBeCloseTo(GROWN_HEIGHT, 6)
    expect(assembled.root.attrs['viewBox']).toBe(
      `0 0 ${SETTINGS_CONSTANTS.exportCanvas.width} ${GROWN_HEIGHT}`,
    )
  })

  it('GIVEN a screen taller than S-81 WHEN exportSvg runs THEN it writes every task group, as the PNG route does (FR-025, CR-337)', () => {
    const assembled = svgOnlyOf(TALL_SCENE)
    for (const id of DRAWN_ROW_IDS) {
      expect(assembled.texts.map((drawnText) => drawnText.content), id).toContain(`name of ${id}`)
    }
  })

  it('GIVEN the fixed copy of table T-076 WHEN exportSvg assembles the picture THEN all fourteen rows hold', () => {
    const assembled = svgOnlyOf(TALL_SCENE)
    expect(T_076_ROWS).toHaveLength(14)
    for (const row of T_076_ROWS) {
      expect(row.holds(assembled), `${row.id} (${row.expectation}): ${row.part}`).toBe(true)
    }
  })

  it('GIVEN the same scene twice WHEN exportSvg runs THEN it answers the same string both times (@purity pure)', () => {
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
    expect(exportSvg).toHaveLength(1)
    expect(exportPng).toHaveLength(2)
  })

  it('GIVEN a rasterizer that fails WHEN exportPng runs THEN IO-3 picture is still exportSvg own (NT-3a next step)', async () => {
    // Why: for `unsupported` the next step is the SVG, which holds only if the
    // string handed back is the assembled one.
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
  it('GIVEN table T-064 WHEN PI-21 is read THEN it gives one seam type and two entries', () => {
    expect(PI_21_MEMBERS.map((one) => one.name)).toEqual([
      'Rasterizer',
      'exportSvg',
      'exportPng',
    ])
    expect(PI_21_MEMBERS.filter((one) => one.isType).map((one) => one.name)).toEqual(['Rasterizer'])
  })

  it('GIVEN the public entry WHEN its runtime names are read THEN every member T-064 gives it is a function there', () => {
    const published = Object.keys(imageExporter)
    for (const name of PI_21_ENTRIES) {
      expect(published, `table T-064 gives PI-21 \`${name}\``).toContain(name)
      expect(
        typeof (imageExporter as unknown as Record<string, unknown>)[name],
        `PI-21 \`${name}\``,
      ).toBe('function')
    }
    const callable = published.filter(
      (name) => typeof (imageExporter as unknown as Record<string, unknown>)[name] === 'function',
    )
    expect(callable.sort()).toEqual([...PI_21_ENTRIES].sort())
  })

  it('and publishes no runtime name table T-064 does not give it', () => {
    const unnamed = Object.keys(imageExporter).filter(
      (name) => !PI_21_ENTRIES.includes(name) && !PI_21_MEMBERS.some((one) => one.name === name),
    )
    expect(unnamed.sort(), 'runtime names of `image-exporter.ts` with no member in T-064').toEqual(
      [...PI_21_UNNAMED_RUNTIME_NAMES].sort(),
    )
  })
})

describe('boundaries of the SVG route', () => {
  it('GIVEN a screen with no task groups at all WHEN exportSvg runs THEN it still draws EP-1 and EP-3', () => {
    const assembled = svgOnlyOf(sceneOf(viewOf([])))
    expect(assembled.result.svg).toContain(PICTURE)
    expect(assembled.texts.map((drawnText) => drawnText.content)).toEqual([DOCUMENT_TITLE])
    expect(hasRect(assembled, REGIONS.appHeader), 'EP-1 band').toBe(true)
    expect(hasRect(assembled, REGIONS.taskGroupPanel), 'EP-3 panel').toBe(true)
  })

  it('GIVEN exactly one task group WHEN exportSvg runs THEN its name is written', () => {
    const assembled = svgOnlyOf(
      sceneOf(
        viewOf([rowOf('only', 1, { x: 0, y: 100, width: SETTINGS.taskGroupPanelWidthPx, height: 40 })]),
      ),
    )
    expect(assembled.texts.map((drawnText) => drawnText.content)).toContain('name of only')
  })

  it('GIVEN a task group whose label is null WHEN exportSvg runs THEN no name is written for it', () => {
    const assembled = svgOnlyOf(
      sceneOf(
        viewOf([
          rowOf('n1', 1, { x: 0, y: 100, width: SETTINGS.taskGroupPanelWidthPx, height: 40 }, null),
        ]),
      ),
    )
    expect(assembled.texts.map((drawnText) => drawnText.content)).toEqual([DOCUMENT_TITLE])
  })

  it('GIVEN a document with no title WHEN exportSvg runs THEN nothing is written in its place (FR-035 speaks of the tab)', () => {
    const assembled = svgOnlyOf(
      sceneOf(viewOf(TALL_TASK_GROUPS, { appHeaderItems: { ...APP_HEADER_ITEMS, documentTitle: null } })),
    )
    expect(assembled.texts.map((drawnText) => drawnText.content)).toEqual(DRAWN_ROW_IDS.map((id) => `name of ${id}`))
    expect(hasRect(assembled, REGIONS.appHeader), 'the band is still drawn').toBe(true)
  })

  it('GIVEN an empty picture string WHEN exportSvg runs THEN the frame still comes back', () => {
    const answer = fitOrThrow(exportSvg(sceneOf(viewOf(TALL_TASK_GROUPS), { svg: '' })))
    expect(answer.svg).toContain('<svg')
    expect(answer.heightPx).toBeCloseTo(GROWN_HEIGHT, 6)
  })

})

// Spec: FR-025, S-81, S-217, IX-15
describe('FR-025 -- the height grows to fit and stops at S-217', () => {
  const screenOf = (height: number): MeasuredScreen => ({ ...SCREEN, height })

  const grownFor = (
    height: number,
    rows: readonly TaskGroupTitle[] = TALL_TASK_GROUPS,
    settings: DocumentSettings = SETTINGS,
  ): SvgExport => {
    const screen = screenOf(height)
    const regions = regionsOf(screen, settings)
    return exportSvg(sceneOf(viewOf(rows), { settings }, regions))
  }

  it('grows the height to the shrunken screen when that is taller than S-81 (MUST)', () => {
    const picture = fitOrThrow(grownFor(800))
    expect(picture.heightPx).toBeCloseTo(800 * RATIO, 6)
    expect(picture.heightPx).toBeGreaterThan(SETTINGS_CONSTANTS.exportCanvas.height)
    const root = elementsOf(picture.svg.split(PICTURE).join(''))[0]
    expect(num((root as Drawn).attrs, 'width')).toBe(SETTINGS_CONSTANTS.exportCanvas.width)
    expect(num((root as Drawn).attrs, 'height')).toBeCloseTo(picture.heightPx, 6)
    expect((root as Drawn).attrs['viewBox']).toBe(
      `0 0 ${SETTINGS_CONSTANTS.exportCanvas.width} ${picture.heightPx}`,
    )
  })

  it('keeps the width at S-81\'s, whatever the height does (MUST)', () => {
    for (const height of [200, 800, 2000]) {
      const picture = fitOrThrow(grownFor(height))
      const root = elementsOf(picture.svg.split(PICTURE).join(''))[0]
      expect(num((root as Drawn).attrs, 'width'), `screen ${height} tall`).toBe(
        SETTINGS_CONSTANTS.exportCanvas.width,
      )
    }
  })

  it('never falls below S-81\'s height, and leaves the remainder blank (MUST NOT: fill it)', () => {
    // Why: only the task groups that fit on a screen 400 tall; one drawn below
    // its bottom edge would make this a case about something else.
    const picture = fitOrThrow(grownFor(400, TALL_TASK_GROUPS.slice(0, 3)))
    expect(400 * RATIO).toBeLessThan(SETTINGS_CONSTANTS.exportCanvas.height)
    expect(picture.heightPx).toBe(SETTINGS_CONSTANTS.exportCanvas.height)
  })

  it('writes the whole scene while the picture still fits under the ceiling (MUST)', () => {
    const answer = grownFor(800)
    expect(answer.ok).toBe(true)
    const picture = fitOrThrow(answer)
    expect(picture.heightPx).toBeLessThanOrEqual(SETTINGS_CONSTANTS.exportCanvasHeightCap)
    for (const id of DRAWN_ROW_IDS) {
      expect(picture.svg, id).toContain(`name of ${id}`)
    }
  })

  it('asks the rasterizer for the GROWN height (MUST)', async () => {
    const { rasterizer, calls } = watchedRasterizer()
    const scene = sceneOf(viewOf(TALL_TASK_GROUPS), { settings: SETTINGS }, regionsOf(screenOf(800)))
    const result = await pngOf(rasterizer, scene)
    expect(calls).toHaveLength(1)
    expect(calls[0]?.sizePx).toEqual({
      widthPx: SETTINGS_CONSTANTS.exportCanvas.width,
      heightPx: result.heightPx,
    })
    expect(result.heightPx).toBeGreaterThan(SETTINGS_CONSTANTS.exportCanvas.height)
  })
})

// Spec: FR-025, T-233
// Why: the telling is worded where the language is known (FR-038), so this
// unit owes only the refusal and one reason for every too-tall scene.
describe('FR-025 -- a scene that will not fit is refused outright (CR-337)', () => {
  const screenOf = (height: number): MeasuredScreen => ({ ...SCREEN, height })

  const answerFor = (height: number, settings: DocumentSettings = SETTINGS): ExportScene =>
    sceneOf(viewOf(TALL_TASK_GROUPS), { settings }, regionsOf(screenOf(height), settings))

  const SCREEN_AT_CEILING = SETTINGS_CONSTANTS.exportCanvasHeightCap / RATIO
  const SCREEN_OVER_CEILING = SCREEN_AT_CEILING + 1

  it('refuses IO-3 and writes nothing when the grown picture passes S-217 (MUST NOT: draw part of it)', () => {
    expect(SCREEN_OVER_CEILING * RATIO, 'the fixture is past the ceiling').toBeGreaterThan(
      SETTINGS_CONSTANTS.exportCanvasHeightCap,
    )
    const answer = exportSvg(answerFor(SCREEN_OVER_CEILING))
    expect(answer.ok).toBe(false)
    if (answer.ok) return
    expect(Object.keys(answer).includes('svg'), 'no picture came back').toBe(false)
    expect(Object.keys(answer).includes('heightPx'), 'no size came back').toBe(false)
  })

  it('refuses IO-4 too, and never paints the seam (MUST NOT: draw part of it)', async () => {
    const { rasterizer, calls } = watchedRasterizer()
    const answer = await exportPng(rasterizer, answerFor(SCREEN_OVER_CEILING))
    expect(answer.ok).toBe(false)
    if (answer.ok) return
    expect(Object.keys(answer).includes('png'), 'no bytes came back').toBe(false)
    expect(Object.keys(answer).includes('svg'), 'no picture came back').toBe(false)
    expect(calls, 'the seam was never asked to paint').toHaveLength(0)
  })

  it('tells a reason, and the same one for every scene that is too tall (MUST: table T-233 RS-43)', () => {
    // Why: table T-233 holds one row for this, so every too-tall scene must
    // carry the same one reason for the caller to choose RS-43 from.
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
    const answer = exportSvg(answerFor(SCREEN_AT_CEILING - 1))
    expect(answer.ok).toBe(true)
    if (!answer.ok) return
    expect(answer.heightPx).toBeLessThanOrEqual(SETTINGS_CONSTANTS.exportCanvasHeightCap)
    for (const id of DRAWN_ROW_IDS) {
      expect(answer.svg, id).toContain(`name of ${id}`)
    }
  })

  it('writes the picture whose grown height is EXACTLY S-217 (MUST: 伸ばしてよいのはその S-217 まで)', () => {
    // Why: the spec states no comparison operator; FR-025's 'up to S-217'
    // includes its bound, so the exact edge is written. Overturn this if not.
    expect(SCREEN_AT_CEILING * RATIO).toBe(SETTINGS_CONSTANTS.exportCanvasHeightCap)
    const answer = exportSvg(answerFor(SCREEN_AT_CEILING))
    expect(answer.ok).toBe(true)
    if (!answer.ok) return
    expect(answer.heightPx).toBe(SETTINGS_CONSTANTS.exportCanvasHeightCap)
  })

  it('refuses on the SAME scene through both entries (WY-2 of table T-041)', async () => {
    const { rasterizer } = watchedRasterizer()
    for (const height of [SCREEN_AT_CEILING, SCREEN_OVER_CEILING]) {
      const scene = answerFor(height)
      const bySvg = exportSvg(scene)
      const byPng = await exportPng(rasterizer, scene)
      expect(byPng.ok, `screen ${height} tall`).toBe(bySvg.ok)
    }
  })
})

// Spec: FR-025, T-024
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
    // Why: IO-1, IO-2 and IO-7 have no entry on this component, so their
    // writing for a too-tall scene is measured where they are pressed.
    const callable = Object.keys(imageExporter).filter(
      (name) => typeof (imageExporter as unknown as Record<string, unknown>)[name] === 'function',
    )
    expect(callable.sort()).toEqual([...PI_21_ENTRIES].sort())
  })
})
