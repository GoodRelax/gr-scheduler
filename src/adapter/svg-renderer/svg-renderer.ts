// SvgRenderer -- turns the schedule geometry into one SVG string.
// @unit      UF-32   (docs/spec/05-07-design.md, table T-075)
// @component SvgRenderer, layer Adapter (table T-062)
// @purity    pure
// @publishes table T-064 row PI-19

import type { DocumentSettings } from '../../entity/document-model/document-settings/document-settings'
import {
  DEFAULT_CALENDAR_VALUES,
  type Schedule,
} from '../../entity/document-model/schedule/schedule'
import type { ItemRef, Selection } from '../../entity/document-model/selection/selection'
import type { Hit } from '../../entity/layout-engine/item-hit-area/item-hit-area'
import type {
  Path,
  Point,
  ScheduleGeometry,
} from '../../entity/layout-engine/schedule-geometry/schedule-geometry'
import type { ScheduleLayout } from '../../entity/layout-engine/schedule-layout/schedule-layout'
import {
  drawnSettingsOf,
  type ScreenRect,
  type ScreenRegions,
} from '../../entity/layout-engine/screen-regions/screen-regions'
import { gridParts, rulerSvg } from './schedule-grid'
import { overlayParts, watermarkSvg } from './schedule-overlays'
import {
  dependencyArrowSvg,
  dependencyLinkParts,
  taskFigureParts,
} from './schedule-task-figures'

export type { SvgSurface } from './svg-surface'

// STOP: spec does not decide how the export road says not to draw dummies. Looked in EP-14, T-076 @provisional PND-210
export type SchedulePicture = 'screen' | 'export'

// see DC-2, DC-8
export interface DualCursorFollow {
  readonly side: 'date1' | 'date2'
  // STOP: spec does not decide whether the following line snaps to a day, nor where it stands with no pointer. Looked in DC-2, DC-8 @provisional PND-310 @provisional PND-311
  readonly x: number | null
}

// see FR-020
export interface Watermark {
  readonly openedBy: string
  readonly stampedAt: string
}

// STOP: spec does not decide how far past the Row Area a Task is still drawn. Looked in T-202, T-203, T-206, PG-6 @provisional PND-475
const OFF_SCREEN_SIDE_MARGIN = 0.25

// see PE-0, FR-105
// WHY: the chart's own surface, not a stopped default: MK-12 leaves the browser its defaults, and PE-0 takes out the one of them that starts a text selection.
// TRAP: the prefixed spelling first, so a viewer that reads only that one still obeys PE-0.
const NO_TEXT_SELECTION_STYLE = '-webkit-user-select:none;user-select:none'

/** @purity pure */
export function escaped(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// see NS-3
/** @purity pure */
export function rounded(value: number): string {
  return (Math.round(value * 100) / 100).toString()
}

// TRAP: key by the document's id, never an array index: a delete or a sideways scroll moves an index.
/** @purity pure */
export function figureKey(key: string): string {
  return ` data-figure="${escaped(key)}"`
}

/** @purity pure */
export function pointsOf(path: Path): string {
  return path.map((one) => `${rounded(one.x)},${rounded(one.y)}`).join(' ')
}

/** @purity pure */
export function boxOfPoints(path: Path): ScreenRect | null {
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

// see SL-8
/** @purity pure */
export function selectionFrameSvg(box: ScreenRect, colour: string, key: string): string {
  const stroke = NOT_STORED_SELECTION_SIZES['S-174']
  const [on, off] = NOT_STORED_SELECTION_SIZES['S-175']
  const width = Math.max(box.width, stroke)
  const height = Math.max(box.height, stroke)
  return (
    `<rect x="${rounded(box.x - (width - box.width) / 2)}"` +
    ` y="${rounded(box.y - (height - box.height) / 2)}"` +
    ` width="${rounded(width)}" height="${rounded(height)}"` +
    ` fill="none" stroke="${colour}" stroke-width="${rounded(stroke)}"` +
    ` stroke-dasharray="${rounded(on)} ${rounded(off)}"${figureKey(key)}/>`
  )
}

// see SL-8, DC-8
/** @purity pure */
export function selectedLineWidth(own: number, selected: boolean): number {
  return selected ? own * NOT_STORED_SELECTION_SIZES['S-178'] : own
}

// see FR-041
/** @purity pure */
export function achromatic(colour: string): string {
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

// see T-236, FR-041
/** @purity pure */
export function colourOf(rowId: string, hue: number, dark: boolean, monochrome: boolean): string {
  const row = SCHEDULE_COLOURS[rowId]
  if (row === undefined) throw new Error(`table T-236 does not reach this unit with ${rowId}`)
  const written = dark ? row.dark : row.light
  if (!row.followsHue) return written
  const substituted = written.replace(/\bH\b/g, rounded(hue))
  return monochrome ? achromatic(substituted) : substituted
}

export const GROUP_GRID_LINE_WIDTH_PX = 1

/** @purity pure */
function isDarkTheme(settings: DocumentSettings): boolean {
  return settings.themePreference === 'dark'
}

// see FR-039, S-246
/** @purity pure */
export function typefaceAttribute(): string {
  return ` font-family="${escaped(NOT_STORED_TYPEFACES['S-246'])}"`
}

// TRAP: SVG ids are document-wide; an id not unique to the picture collides when an export is drawn into the screen's document.
/** @purity pure */
function pictureId(seed: string): string {
  let hash = 0x811c9dc5
  for (const ch of seed) {
    hash ^= ch.charCodeAt(0)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(36)
}

// see FR-080, T-020, T-076, DC-3
// WHY: dualCursorSpanWord is DC-3's word in the display language, from the caller; null draws no count.
// TRAP: snapshot-source.ts reads Parameters<typeof svgFromSchedule>[3] and [4] by position; insert no parameter ahead of regions.
/** @purity pure */
export function svgFromSchedule(
  schedule: Schedule,
  storedSettings: DocumentSettings,
  layout: ScheduleLayout,
  geometry: ScheduleGeometry,
  regions: ScreenRegions,
  selection: Selection,
  // TRAP: no default: a forgotten export would draw FR-043's dummies into a reader's file (EP-14).
  picture: SchedulePicture,
  follow: DualCursorFollow | null = null,
  weekdayWords: readonly string[] = [],
  pointer: Point | null = null,
  hovered: Hit | null = null,
  marquee: ScreenRect | null = null,
  watermark: Watermark | null = null,
  tentativeLink: ScheduleGeometry['dependencies'][number] | null = null,
  dualCursorSpanWord: string | null = null,
): string {
  const settings = drawnSettingsOf(storedSettings)
  const hue = schedule.project.themeHue
  const monochrome = settings.themeMonochrome
  const dark = isDarkTheme(settings)
  const themed = (rowId: string): string => colourOf(rowId, hue, dark, monochrome)
  const placedOf = new Map(layout.placements.map((one) => [one.taskUid, one]))
  const visualOf = new Map(schedule.taskVisuals.map((one) => [one.taskUid, one]))
  const strokeOfBox = new Map(
    schedule.highlightBoxes.map((one) => [one.id, one.strokeColor]),
  )
  const colourOfGroup = new Map(schedule.taskGroups.map((one) => [one.id, one.color]))
  // TRAP: gate every operation mark on drawsOperationState, or it leaks into an export (EP-12, DC-8); marquee is ungated and relies on the export call passing null.
  const drawsOperationState = picture === 'screen'
  const marks: readonly ItemRef[] = drawsOperationState ? selection.items : []
  const following = drawsOperationState ? follow : null
  const hover = drawsOperationState ? hovered : null
  const hand = drawsOperationState ? pointer : null
  const selected = new Set(marks.filter((one) => one.kind === 'task').map((one) => one.uid))
  const selectedBoxes = new Set(
    marks.filter((one) => one.kind === 'highlightBox').map((one) => one.id),
  )
  const selectedComments = new Set(
    marks.filter((one) => one.kind === 'commentBox').map((one) => one.id),
  )
  const selectedStatusLine = marks.some((one) => one.kind === 'statusLine')
  const selectedLinks = new Set<string>()
  const linksOfTask = new Map(schedule.tasks.map((one) => [one.uid, one.dependencies]))
  // TRAP: the ordinal is not the index in geometry.dependencies: RT-4a drops undrawn links.
  for (const item of marks) {
    if (item.kind !== 'dependency') continue
    const link = linksOfTask.get(item.successorUid)?.[item.ordinal]
    if (link !== undefined) selectedLinks.add(`${link.predecessorUid}>${item.successorUid}`)
  }

  const area = regions.rowArea
  const areaBottom = area.y + area.height
  const scrollTop = layout.scrollAreaY ?? area.y
  const pinnedGroupIds = new Set(
    layout.rows.filter((row) => row.isPinned === true).map((row) => row.groupId),
  )
  const hasPinnedRows = pinnedGroupIds.size > 0
  const skipsOffScreen = picture === 'screen'
  const drawnFrom = area.y - area.height
  const drawnTo = areaBottom + area.height
  const sideMargin = area.width * OFF_SCREEN_SIDE_MARGIN
  const drawnLeftOf = area.x - sideMargin
  const drawnRightOf = area.x + area.width + sideMargin

  const drawing = {
    schedule,
    layout,
    geometry,
    regions,
    area,
    areaBottom,
    scrollTop,
    settings,
    picture,
    drawsOperationState,
    monochrome,
    themed,
    colourOfGroup,
    visualOf,
    placedOf,
    pinnedGroupIds,
    strokeOfBox,
    selected,
    selectedBoxes,
    selectedComments,
    selectedStatusLine,
    selectedLinks,
    following,
    hover,
    hand,
    pointer,
    skipsOffScreen,
    drawnFrom, drawnTo, drawnLeftOf, drawnRightOf,
  }
  const grid = gridParts(drawing)
  const figures = taskFigureParts(drawing)

  const width = Math.max(1, regions.scheduleCanvas.x + regions.scheduleCanvas.width)
  const height = Math.max(1, regions.scheduleCanvas.y + regions.scheduleCanvas.height)
  const arrowId = `grs-dependency-arrow-${pictureId(
    `${rounded(width)}x${rounded(height)}|${geometry.tasks.length}` +
      `|${geometry.dependencies.length}|${selected.size}|${schedule.project.title ?? ''}`,
  )}`
  const dependencyHaloMaskId = `grs-dependency-halo-mask-${pictureId(
    `${rounded(width)}x${rounded(height)}|${figures.barMaskParts.length}`,
  )}`
  const defsParts: string[] = []

  const scrollClipId = `grs-scroll-clip-${pictureId(
    `${rounded(area.x)}x${rounded(scrollTop)}|${rounded(area.width)}x${rounded(
      areaBottom - scrollTop,
    )}`,
  )}`
  if (hasPinnedRows) {
    defsParts.push(
      `<clipPath id="${scrollClipId}"><rect x="${rounded(area.x)}" y="${rounded(scrollTop)}"` +
        ` width="${rounded(area.width)}" height="${rounded(areaBottom - scrollTop)}"/></clipPath>`,
    )
  }

  const links = dependencyLinkParts({
    ...drawing,
    barMaskParts: figures.barMaskParts,
    arrowId,
    dependencyHaloMaskId,
    width,
    height,
  })
  defsParts.push(...links.defsParts)
  const overlays = overlayParts({ ...drawing, dualCursorSpanWord })

  // WHY: the scrolling half of a layer is clipped to the scroll area so it cannot run over a pinned row.
  /** @purity pure */
  const scrolling = (drawn: readonly string[]): string => {
    const inner = drawn.join('')
    if (inner === '' || !hasPinnedRows) return inner
    return `<g clip-path="url(#${scrollClipId})">${inner}</g>`
  }
  // see T-020
  // TRAP: one group per row of table T-020, pinned half first: the seam reads the order off this string.
  /** @purity pure */
  const zoLayer = (row: string, drawn: readonly string[]): readonly string[] => {
    const inner = drawn.join('')
    if (inner === '') return []
    return [`<g data-zo="${row}">${inner}</g>`]
  }

  const watermarkClipId = `grs-watermark-clip-${pictureId(
    `${rounded(area.x)}x${rounded(area.y)}|${rounded(area.width)}x${rounded(area.height)}`,
  )}`
  if (watermark !== null) {
    defsParts.push(
      `<clipPath id="${watermarkClipId}"><rect x="${rounded(area.x)}" y="${rounded(area.y)}"` +
        ` width="${rounded(area.width)}" height="${rounded(area.height)}"/></clipPath>`,
    )
  }

  // see FR-009
  // WHY: FR-009 calls it a tentative dependency line, so it takes the line's own colour, width and head.
  const tentative = drawsOperationState ? tentativeLink : null
  const tentativeArrowId = `grs-tentative-arrow-${pictureId(`${rounded(width)}x${rounded(height)}`)}`
  // TRAP: the head is a definition, not ink: inside ZO-11's group it would sit in a drawn layer.
  if (tentative !== null) {
    defsParts.push(
      dependencyArrowSvg(tentativeArrowId, settings.dependencyArrowLength, themed('S-159')),
    )
  }
  const tentativeParts =
    tentative === null
      ? []
      : [
          `<polyline points="${pointsOf(tentative.points)}" fill="none"` +
            ` stroke="${themed('S-159')}" stroke-width="${rounded(settings.dependencyWidth)}"` +
            ` marker-end="url(#${tentativeArrowId})"/>`,
        ]

  // see T-020
  // TRAP: the rows run back to front in the order the table prints them, not in row-ID order.
  const parts = [
    ...defsParts,
    ...zoLayer('ZO-7', grid.bandParts),
    ...zoLayer('ZO-1', [...figures.planPartsPinned, scrolling(figures.planParts)]),
    ...zoLayer('ZO-1a', [...figures.guidePartsPinned, scrolling(figures.guideParts)]),
    ...zoLayer('ZO-2', [...figures.actualPartsPinned, scrolling(figures.actualParts)]),
    ...zoLayer('ZO-4', [...links.depLinkPartsPinned, scrolling(links.depLinkParts)]),
    ...zoLayer('ZO-8', overlays.linkParts),
    ...zoLayer('ZO-3', [...figures.markerPartsPinned, scrolling(figures.markerParts)]),
    ...zoLayer('ZO-5', [...figures.labelPartsPinned, scrolling(figures.labelParts)]),
    ...zoLayer('ZO-9', overlays.annotationParts),
    ...zoLayer('ZO-10', [
      ...figures.selectionParts,
      ...overlays.selectionParts,
      ...figures.handleParts,
    ]),
    ...zoLayer('ZO-11', tentativeParts),
    ...zoLayer(
      'ZO-12',
      watermark === null
        ? []
        : [watermarkSvg(area, width, watermark, themed('S-223'), watermarkClipId)],
    ),
    ...zoLayer(
      'ZO-6',
      marquee === null ? [] : [selectionFrameSvg(marquee, themed('S-151'), 'marquee')],
    ),
    // WHY: the ruler draws in its own band, so table T-020 holds no row for it (the table's closing note).
    ...rulerSvg(
      layout,
      settings,
      regions.timeRuler,
      schedule.project.weekStartDay ?? DEFAULT_CALENDAR_VALUES['S-108'],
      themed('S-146'),
      themed('S-147'),
      themed('S-149'),
      weekdayWords,
    ),
    ...overlays.rulerParts,
  ]

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${rounded(width)}"` +
    ` height="${rounded(height)}" viewBox="0 0 ${rounded(width)} ${rounded(height)}"` +
    (drawsOperationState ? ` style="${NO_TEXT_SELECTION_STYLE}"` : '') +
    ` role="img" aria-label="${escaped(schedule.project.title ?? '')}">` +
    parts.join('') +
    '</svg>'
  )
}

// <generated -- do not edit by hand>
// Single source of truth:
//   docs/spec/_source/settings.json (tables T-206, T-207, T-236 and T-294)
// Rebuild: npm run gen   ||   npm run gen:check fails on drift.
// see T-206
export const NOT_STORED_SELECTION_SIZES: {
  readonly 'S-174': number
  readonly 'S-175': readonly [number, number]
  readonly 'S-178': number
} = {
  'S-174': 1,
  'S-175': [2, 1],
  'S-178': 2,
}

// see T-206
export const NOT_STORED_DEPENDENCY_SIZES: {
  readonly 'S-224': number
} = {
  'S-224': 3,
}

// see T-206
export const NOT_STORED_DUMMY_SIZES: {
  readonly 'S-180': number
  readonly 'S-247': number
} = {
  'S-180': 30,
  'S-247': 0.5,
}

// see T-206
export const NOT_STORED_DUAL_CURSOR_SIZES: {
  readonly 'S-194': number
} = {
  'S-194': 1,
}

// see T-206
export const NOT_STORED_RULER_WEEKDAY_SIZES: {
  readonly 'S-219': number
} = {
  'S-219': 0.6,
}

// see T-206
const NOT_STORED_TYPEFACES: {
  readonly 'S-246': string
} = {
  'S-246': '"Yu Gothic UI", "Yu Gothic", YuGothic, "BIZ UDPGothic", sans-serif',
}

// see T-206
export const NOT_STORED_NAME_LABEL_WEIGHT: {
  readonly 'S-245': number
} = {
  'S-245': 600,
}

// see T-236, S-73
export const SCHEDULE_COLOURS: {
  readonly [rowId: string]: {
    readonly light: string
    readonly dark: string
    readonly followsHue: boolean
  }
} = {
  'S-146': { light: '#ffffff', dark: 'hsl(H 12% 9%)', followsHue: true },
  'S-147': { light: '#16181d', dark: '#e8eaee', followsHue: false },
  'S-148': { light: '#5b6068', dark: '#9aa1ab', followsHue: false },
  'S-149': { light: 'hsl(H 14% 87%)', dark: 'hsl(H 12% 23%)', followsHue: true },
  'S-150': { light: 'hsl(H 20% 97%)', dark: 'hsl(H 14% 13%)', followsHue: true },
  'S-151': { light: 'hsl(H 59% 32%)', dark: 'hsl(H 62% 68%)', followsHue: true },
  'S-155': { light: 'hsl(H 46% 80%)', dark: 'hsl(H 32% 26%)', followsHue: true },
  'S-156': { light: 'hsl(H 44% 46%)', dark: 'hsl(H 46% 66%)', followsHue: true },
  'S-157': { light: 'hsl(H 62% 34%)', dark: 'hsl(H 62% 64%)', followsHue: true },
  'S-158': { light: 'hsl(H 66% 22%)', dark: 'hsl(H 70% 80%)', followsHue: true },
  'S-159': { light: 'hsl(26 88% 44%)', dark: 'hsl(30 92% 60%)', followsHue: false },
  'S-160': { light: 'hsl(354 62% 42%)', dark: 'hsl(354 70% 64%)', followsHue: false },
  'S-312': { light: '#b45309', dark: '#b45309', followsHue: false },
  'S-161': { light: '#16181d', dark: '#e8eaee', followsHue: false },
  'S-162': { light: '#ffffff', dark: 'hsl(H 12% 9%)', followsHue: true },
  'S-163': { light: '#8b9099', dark: '#767c86', followsHue: false },
  'S-164': { light: 'hsl(H 42% 96%)', dark: 'hsl(H 18% 20%)', followsHue: true },
  'S-165': { light: 'hsl(H 34% 88%)', dark: 'hsl(H 16% 28%)', followsHue: true },
  'S-166': { light: 'hsl(H 40% 97%)', dark: 'hsl(H 20% 17%)', followsHue: true },
  'S-167': { light: 'hsl(H 20% 99%)', dark: 'hsl(H 14% 11%)', followsHue: true },
  'S-168': { light: '#000000', dark: '#ffffff', followsHue: false },
  'S-169': { light: '#ffffff', dark: 'hsl(H 12% 9%)', followsHue: true },
  'S-195': { light: 'hsl(H 59% 32%)', dark: 'hsl(H 62% 68%)', followsHue: true },
  'S-223': { light: '#5b6068', dark: '#9aa1ab', followsHue: false },
}

// see T-294, T-017b
export type PaletteCell = string | null | { readonly sameAs: string }
export interface PaletteForms {
  readonly fill: PaletteCell
  readonly outline: PaletteCell
  readonly actual: PaletteCell
  readonly band: PaletteCell
}
const COLOUR_NAME_VALUES: {
  readonly [spelling: string]: {
    readonly rowId: string
    readonly light: PaletteForms
    readonly dark: PaletteForms
  }
} = {
  white: {
    rowId: 'S-314',
    light: { fill: '#ffffff', outline: '#ffffff', actual: { sameAs: 'S-157' }, band: { sameAs: 'S-146' } },
    dark: { fill: '#14161a', outline: '#14161a', actual: { sameAs: 'S-157' }, band: { sameAs: 'S-146' } },
  },
  black: {
    rowId: 'S-315',
    light: { fill: '#000000', outline: '#000000', actual: { sameAs: 'S-157' }, band: null },
    dark: { fill: '#ffffff', outline: '#ffffff', actual: { sameAs: 'S-157' }, band: null },
  },
  dimgray: {
    rowId: 'S-316',
    light: { fill: '#575757', outline: '#383838', actual: { sameAs: 'S-157' }, band: '#e0e0e0' },
    dark: { fill: '#a3a3a3', outline: '#cccccc', actual: { sameAs: 'S-157' }, band: '#474747' },
  },
  lightgray: {
    rowId: 'S-317',
    light: { fill: '#cccccc', outline: '#757575', actual: '#575757', band: '#f5f5f5' },
    dark: { fill: '#424242', outline: '#a8a8a8', actual: '#a3a3a3', band: '#333333' },
  },
  red: {
    rowId: 'S-318',
    light: { fill: '#e3b9b5', outline: '#a94c42', actual: '#8c2c21', band: '#f9f1f1' },
    dark: { fill: '#58312d', outline: '#d08880', actual: '#dc766a', band: '#3c2c2a' },
  },
  blue: {
    rowId: 'S-319',
    light: { fill: '#b5c9e3', outline: '#426ea9', actual: '#21508c', band: '#f1f4f9' },
    dark: { fill: '#2d3f58', outline: '#80a3d0', actual: '#6a9cdc', band: '#2a323c' },
  },
  yellow: {
    rowId: 'S-320',
    light: { fill: '#dfd6a9', outline: '#8c7d36', actual: '#79691c', band: '#f9f8f1' },
    dark: { fill: '#58502d', outline: '#d0c380', actual: '#dcc96a', band: '#3c392a' },
  },
  green: {
    rowId: 'S-321',
    light: { fill: '#afe1bf', outline: '#3c9a5b', actual: '#1f8340', band: '#f1f9f3' },
    dark: { fill: '#2d583b', outline: '#80d09b', actual: '#6adc90', band: '#2a3c30' },
  },
  orange: {
    rowId: 'S-322',
    light: { fill: '#e3cab5', outline: '#a97242', actual: '#8c5321', band: '#f9f5f1' },
    dark: { fill: '#58412d', outline: '#d0a680', actual: '#dc9f6a', band: '#3c322a' },
  },
  purple: {
    rowId: 'S-323',
    light: { fill: '#d8b5e3', outline: '#8f42a9', actual: '#72218c', band: '#f7f1f9' },
    dark: { fill: '#4d2d58', outline: '#bc80d0', actual: '#c06adc', band: '#382a3c' },
  },
  transparent: {
    rowId: 'S-324',
    light: { fill: null, outline: null, actual: null, band: null },
    dark: { fill: null, outline: null, actual: null, band: null },
  },
}

// see T-207, FR-020
export const WATERMARK_MARKS: {
  readonly 'S-220': string
  readonly 'S-221': string
  readonly 'S-222': string
  readonly 'S-102': string
} = {
  'S-220': '-30',
  'S-221': '0.01125',
  'S-222': '14.44',
  'S-102': '0.06',
}
// </generated>
