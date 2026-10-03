// DomScreenSurface -- public entry of this folder.
// @unit      UF-71   (docs/spec/05-07-design.md, table T-075)
// @component DomScreenSurface, layer Framework (table T-062)
// @purity    non-pure
// @publishes table T-064 row PI-38

import {
  achromatic,
  type CommandItem,
  type ScreenFrame,
  type ScreenPart,
  type ScreenSurface,
  type ScreenView,
  type SearchFilterChange,
  type TooltipAnchor,
} from '../../adapter/screen-renderer/screen-renderer'
import type { WindowName } from '../../adapter/screen-renderer/screen-renderer'
import type { ScreenRect } from '../../entity/layout-engine/screen-regions/screen-regions'
import iconGlyphs from './icon-glyphs.json'
import { fillScreenFrame, horizontalScrollbar, panelEdge } from './screen-frame-drawing'
import { appHeaderStyle, fillAppHeader } from './app-header-drawing'
import { confirmationElement, noticeElement } from './notices-drawing'
import { PALETTE_GRAB_BAND_ENTRY, paletteElement } from './command-palette-drawing'
import { fieldEditingOf } from './field-editing'
import { keepTooltipsInside, showPointTip, tooltipAnchorTable, tooltipElement } from './tooltips-drawing'
import {
  fillPropertiesPanel,
  growWrappingFields,
  markPropertiesPanel,
  propertiesPanelKeyOf,
  propertiesPanelStyle,
  rewritePanelReadouts,
} from './properties-panel-drawing'
import {
  ADD_CHILD_ROW_ENTRY,
  DELETE_ROW_ENTRY,
  ROW_CONTROL_GROUND_MARK,
  fillRowTitleTree,
  foldedRowCountElement,
  headEntryElements,
  headFoldedRowCountRight,
  markFoldedRowCount,
  markHeadEntries,
  rowControlsHeightReporter,
  rowControlsMeasureKey,
  rowsTopPx,
} from './row-title-panel-drawing'
import { dialogueFieldPainter } from './dialogue-field-drawing'
import { ROSTER_SCROLLER, helpWindowPainter, keepRosterScroll, modalElement } from './open-modals-drawing'
import { SEARCH_WORD_ROW, searchPanelPainter } from './search-panel-drawing'
import type { PointAsked } from './window-frame-drawing'

const UNIT_ROW = 'UF-71'

// see T-337
const HELP_MODAL_SURFACE = 'Help Modal'

// see U-66, RW-5
const REPORT_IDENTITY = { window: 'delayDiagnosticsReport', role: 'Delay Diagnostics Report' } as const

export const ROLE = {
  appHeader: 'App Header',
  branding: 'Branding',
  documentTitle: 'Document Title',
  fileStatus: 'File Status',
  openedFileName: 'Opened File Name',
  fileSavedAt: 'File Saved At',
  headerCommands: 'Header Commands',
  panelDivider: 'Panel Divider',
  scrollbars: 'Scrollbars',
  rowTitlePanel: 'Row Title Panel',
  rowTitleTree: 'Row Title Tree',
  pinnedRow: 'Pinned Row',
  rowExpander: 'Row Expander',
  rowPin: 'Row Pin',
  propertiesPanel: 'Properties Panel',
  commandPalette: 'Command Palette',
  paletteGroups: 'Palette Groups',
  paletteCommands: 'Palette Commands',
  dialogueField: 'Dialogue Field',
  notices: 'Notification Area',
  confirmation: 'Confirmation',
  tooltips: 'Tooltip',
} as const

export const HOST_ENTER = 'Enter'

export const NOTICE_DISMISS_KEY_ATTRIBUTE = 'data-notice'

export const CONFIRMATION_ANSWER_ATTRIBUTE = 'data-confirmation-answer'

export const IMPORT_REPORT_DISMISS_ATTRIBUTE = 'data-import-report-dismiss'

// WHY: members that share a row stay apart; each follows its own rule and may be recoloured alone.
const PAINT_ROW = {
  ground: 'S-146',
  ink: 'S-147',
  quiet: 'S-148',
  rule: 'S-149',
  panel: 'S-150',
  grabStrip: 'S-231',
  shadow: 'S-170',
  armed: 'S-183',
  pressed: 'S-183',
  pinned: 'S-151',
  hoveredEntrance: 'S-147',
  pinnedRow: 'S-151',
  grabAxisPosition: 'S-151',
  grabAxisDepth: 'S-152',
  heldRow: 'S-151',
  caution: 'S-153',
  brandingRim: 'S-464',
} as const

/** @purity pure */
function painted(name: keyof typeof PAINT_ROW): string {
  return `var(--gr-${name})`
}

export const PAINT = {
  ground: painted('ground'),
  ink: painted('ink'),
  quiet: painted('quiet'),
  rule: painted('rule'),
  panel: painted('panel'),
  grabStrip: painted('grabStrip'),
  shadow: painted('shadow'),
  armed: painted('armed'),
  pressed: painted('pressed'),
  pinned: painted('pinned'),
  hoveredEntrance: painted('hoveredEntrance'),
  pinnedRow: painted('pinnedRow'),
  grabAxisPosition: painted('grabAxisPosition'),
  grabAxisDepth: painted('grabAxisDepth'),
  heldRow: painted('heldRow'),
  caution: painted('caution'),
  brandingRim: painted('brandingRim'),
} as const

/** @purity pure */
export function stateGround(paint: string, depthRow: 'S-214' | 'S-215'): string {
  // WHY: color-mix, not opacity, which would fade the row's name and controls with the ground.
  return `color-mix(in srgb, ${paint} ${NOT_STORED_STATE_GROUND_PERCENTS[depthRow]}%, transparent)`
}

// see FR-029, FR-051, FR-053
/** @purity pure */
export function chromeScaledPx(px: number): number {
  return px * NOT_STORED_CHROME_SCALE['S-235']
}

// see FR-029, S-243
// TRAP: S-243 on the Row Title Panel and S-141 on every other surface; the box and frame line never differ.
type EntranceGapRow = 'S-141' | 'S-243'

// see FR-029
/** @purity pure */
export function entranceGapPx(gapRow: EntranceGapRow = 'S-141'): number {
  return chromeScaledPx(NOT_STORED_ICON_SIZES[gapRow])
}

// see FR-029
/** @purity pure */
export function entranceBorderPx(): number {
  return chromeScaledPx(NOT_STORED_ICON_SIZES['S-237'])
}

// see FR-029
/** @purity pure */
export function entranceOuterWidthPx(gapRow: EntranceGapRow = 'S-141'): number {
  return chromeScaledPx(
    NOT_STORED_ICON_SIZES['S-138'] +
      (NOT_STORED_ICON_SIZES[gapRow] + NOT_STORED_ICON_SIZES['S-237']) * 2,
  )
}

// see FR-029, LF-16, HF-19
/** @purity pure */
export function entranceOuterHeightPx(gapRow: EntranceGapRow = 'S-141'): number {
  return chromeScaledPx(
    NOT_STORED_ICON_SIZES['S-138'] + NOT_STORED_ICON_SIZES[gapRow] * 2,
  )
}

// see FR-029
/** @purity pure */
function entryGlyphRoom(gapRow: EntranceGapRow = 'S-141'): string {
  return (
    'display:inline-flex;align-items:center;justify-content:center;' +
    'box-sizing:border-box;' +
    `min-width:${entranceOuterWidthPx(gapRow)}px;` +
    `padding:0 ${entranceGapPx(gapRow)}px;` +
    `min-height:${entranceOuterHeightPx(gapRow)}px;`
  )
}

const GLYPH_TOKEN = /\{(IC-\d+[a-z]?)\}/

// see FR-036, EZ-2
// TRAP: the dictionary embeds a glyph as {IC-nn}; printing the token as text shows the row id.
/** @purity non-pure */
export function appendAssignment(
  host: Document,
  target: HTMLElement,
  written: string,
  wrapsWords: boolean,
): void {
  const pieces = written.split(GLYPH_TOKEN)
  pieces.forEach((piece, at) => {
    if (at % 2 === 0) {
      if (piece === '') return
      if (!wrapsWords) {
        target.append(piece)
        return
      }
      const words = made(host, 'span', '')
      words.textContent = piece
      target.append(words)
      return
    }
    const glyph = made(host, 'span', STYLE.helpGlyph)
    fillEntry(host, glyph, piece)
    target.append(glyph)
  })
}

/** @purity pure */
export function entryStyle(gapRow: EntranceGapRow = 'S-141'): string {
  return (
    `font:inherit;background:${PAINT.panel};color:${PAINT.ink};` +
    `border:${entranceBorderPx()}px solid ${PAINT.rule};` +
    'border-radius:0.25em;cursor:pointer;' +
    entryGlyphRoom(gapRow)
  )
}

/** @purity pure */
export function entryFaintStyle(gapRow: EntranceGapRow = 'S-141'): string {
  return (
    `font:inherit;background:${PAINT.panel};color:${PAINT.rule};` +
    `border:${entranceBorderPx()}px solid ${PAINT.rule};` +
    'border-radius:0.25em;cursor:default;' +
    entryGlyphRoom(gapRow)
  )
}

const ENTRANCE_STATE_FILL = [
  ['EN-1', PAINT.armed],
  ['EN-2', PAINT.pressed],
  ['EN-3', PAINT.pinned],
  ['EN-4', PAINT.pressed],
  ['EN-6', PAINT.pressed],
] as const

type EntranceStateRow = (typeof ENTRANCE_STATE_FILL)[number][0]

// see FR-029, T-237
/** @purity pure */
export function entranceStateFill(standing: readonly EntranceStateRow[]): string {
  for (const [rowId, colour] of ENTRANCE_STATE_FILL) {
    if (standing.includes(rowId)) return `background:${colour};color:${PAINT.ground};`
  }
  return ''
}

const STOPPING_BOX =
  'position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);' +
  'box-sizing:border-box;max-width:92%;max-height:92%;overflow:auto;padding:1em;' +
  `background:${PAINT.ground};color:${PAINT.ink};border:1px solid ${PAINT.rule};` +
  `box-shadow:0 0.5em 1.5em ${PAINT.shadow};pointer-events:auto;`

export const STYLE = {
  root:
    'position:fixed;left:0;top:0;right:0;bottom:0;pointer-events:none;' +
    `visibility:hidden;font:inherit;color:${PAINT.ink};`,
  rootShown:
    'position:fixed;left:0;top:0;right:0;bottom:0;pointer-events:none;' +
    `font:inherit;color:${PAINT.ink};`,
  layer: 'position:absolute;left:0;top:0;right:0;bottom:0;pointer-events:none;',
  // TRAP: isolate the Row Title Tree, so a hovered row's raise stays inside it; unisolated it
  // lifts the row over every later layer, the divider band and the modals included.
  treeIsolation: 'isolation:isolate;',
  appHeader:
    'position:absolute;left:0;top:0;right:0;box-sizing:border-box;display:flex;' +
    'align-items:center;gap:0.75em;padding:0.375em 0.75em;line-height:1.5;' +
    `overflow:hidden;white-space:nowrap;background:${PAINT.ground};color:${PAINT.ink};` +
    `border-bottom:1px solid ${PAINT.rule};pointer-events:auto;`,
  // see FR-039
  // TRAP: every text here stays at the normal weight, the h2 heading included; the bold are S-245 (OC-1 labels),
  // S-463 (the Document Title, documentTitleStyle in app-header-drawing.ts) and NT-7's answer initial.
  documentTitle: 'overflow:hidden;text-overflow:ellipsis;line-height:1.2;',
  brandedTitle: 'display:flex;align-items:center;min-width:0;overflow:hidden;',
  brandingSeat: 'display:inline-flex;align-items:center;flex-shrink:0;',
  branding:
    `font-weight:normal;color:${PAINT.ink};line-height:1.2;text-decoration:none;` +
    `-webkit-text-stroke-color:${PAINT.brandingRim};paint-order:stroke fill;`,
  documentTitleEntry:
    'box-sizing:border-box;width:100%;min-width:0;font:inherit;color:inherit;' +
    'background:transparent;border:0;padding:0;margin:0;',
  // WHY: height 0, its lines hanging evenly about the header's middle, so the box never sets the header's height.
  fileStatus:
    `margin-left:auto;color:${PAINT.quiet};display:flex;height:0;` +
    `flex-direction:column;justify-content:center;align-items:flex-end;line-height:1.2;`,
  openedFileName: 'flex-shrink:0;overflow:hidden;text-overflow:ellipsis;max-width:24ch;',
  fileSavedAt: 'flex-shrink:0;white-space:pre;',
  headerCommands: 'display:flex;align-items:center;gap:0.25em;',
  languageCode:
    'display:inline-block;vertical-align:middle;margin-left:0.25em;' +
    'font-size:0.8em;line-height:1;pointer-events:none;',
  dividerBand: 'cursor:col-resize;pointer-events:auto;',
  dividerLine: `background:${PAINT.rule};pointer-events:none;`,
  scrollbarTrack: `background:${PAINT.panel};pointer-events:auto;`,
  scrollbarThumb: `position:absolute;background:${PAINT.quiet};border-radius:0.25em;`,
  rowTitlePanel: `position:absolute;background:${PAINT.panel};`,
  panelCornerEntry: 'position:absolute;top:0;right:0;pointer-events:auto;',
  // see HF-19
  // WHY: clip across only; the controls' lattice may hang below a row shorter than it.
  rowTitle:
    'box-sizing:border-box;display:flex;align-items:flex-start;' +
    'overflow-x:clip;overflow-y:visible;white-space:nowrap;' +
    `background:${PAINT.panel};color:${PAINT.ink};` +
    'pointer-events:auto;',
  rowLabel: 'flex:1;overflow:hidden;',
  // TRAP: in the flex flow each control would take room from the name, so the browser's
  // ellipsis cuts it while isLabelTruncated stays false and no tooltip is raised (FR-085).
  rowControl:
    `position:absolute;font:inherit;background:transparent;color:${PAINT.ink};` +
    'border:none;cursor:pointer;pointer-events:auto;',
  rowControlFaintInk: `color:${PAINT.rule};cursor:default;`,
  propertiesPanel:
    'position:absolute;box-sizing:border-box;overflow-y:auto;' +
    `background:${PAINT.panel};color:${PAINT.ink};border-left:1px solid ${PAINT.rule};` +
    'pointer-events:auto;',
  heading: 'font-weight:normal;margin:0 0 0.5em 0;',
  field: 'display:flex;gap:0.5em;line-height:1.6;',
  fieldName: `color:${PAINT.quiet};min-width:9em;`,
  // see FR-053, GR-19, JDG-660
  // WHY: the band stays clamped in frame-loop.ts (paletteCornerInWindow); a palette wider or
  // taller than the window is otherwise left alone, since content decides its size (S-135a note).
  commandPalette:
    `box-sizing:border-box;background:${PAINT.panel};color:${PAINT.ink};` +
    `border:1px solid ${PAINT.rule};border-radius:0.25em;` +
    `box-shadow:0 0.5em 1.5em ${PAINT.shadow};pointer-events:auto;`,
  paletteGrabBand:
    'display:flex;align-items:center;justify-content:flex-end;' +
    'cursor:grab;pointer-events:auto;position:relative;',
  paletteMinimise:
    'position:relative;display:flex;align-items:center;' +
    'cursor:pointer;pointer-events:auto;',
  paletteContents: 'padding:0.5em;',
  paletteGroup: '',
  paletteCommands: 'display:flex;flex-wrap:wrap;gap:0.25em;',
  armedText: `color:${PAINT.ink};`,
  modal: STOPPING_BOX,
  surfaceHeader: 'display:flex;align-items:center;gap:0.75em;margin-bottom:0.5em;',
  helpEntry: 'display:flex;flex-wrap:wrap;align-items:baseline;break-inside:avoid;line-height:1.35;',
  helpText: 'min-width:0;',
  helpKeys: 'flex:0 0 auto;opacity:0.75;white-space:nowrap;',
  helpGlyph: 'flex:0 0 auto;display:inline-flex;align-items:center;',
  helpColumn: 'min-width:0;',
  helpBlock: '',
  helpHeading: '',
  helpLegend: 'display:inline-flex;align-items:center;gap:0.5em;margin-left:auto;',
  helpLegal: '',
  helpLegalSummary: 'cursor:pointer;',
  helpLegalText: 'white-space:pre-wrap;margin:0.5em 0 0;',
  formatChoices: 'display:flex;flex-wrap:wrap;gap:0.25em;margin-top:0.5em;',
  // TRAP: `left:50%` with a transform, or a `max-width`, shrinks or wraps the telling (NT-9).
  notices:
    'position:absolute;left:0;right:0;pointer-events:none;' +
    'display:flex;flex-direction:column;align-items:center;',
  notice:
    `box-sizing:border-box;margin:0.25em 0;padding:0.5em 0.75em;background:${PAINT.ground};` +
    `color:${PAINT.ink};border:1px solid ${PAINT.rule};pointer-events:auto;` +
    'display:flex;flex-wrap:wrap;align-items:center;gap:0.5em;',
  noticeDismiss: 'flex:none;',
  noticeNextStep: `color:${PAINT.quiet};`,
  noticeLink: `color:${PAINT.ink};text-decoration:underline;`,
  confirmation: STOPPING_BOX + 'display:flex;flex-direction:column;overflow:hidden;',
  confirmationHeader:
    'flex:none;display:flex;flex-wrap:wrap;align-items:center;gap:0.5em;',
  confirmationHeaderAnswers: 'flex:none;display:flex;align-items:center;gap:0.5em;',
  confirmationNames: 'flex:1 1 auto;min-height:0;overflow:auto;',
  confirmationItem: 'display:block;line-height:1.6;',
  confirmationMark: 'margin-left:0.5em;',
  confirmationAnswers:
    'flex:0 0 auto;display:flex;align-items:center;gap:0.5em;margin-top:0.5em;',
  confirmationAnswer: 'flex:none;',
  importReportBox: 'display:flex;flex-direction:column;',
  confirmationAnswerInitial: 'font-weight:bold;',
  watermarkUnlockEntry:
    `display:block;box-sizing:border-box;width:100%;margin:0.5em 0;font:inherit;` +
    `background:${PAINT.ground};color:${PAINT.ink};border:1px solid ${PAINT.rule};`,
  dialogueField:
    'box-sizing:border-box;display:flex;flex-direction:column;overflow:hidden;' +
    `background:${PAINT.ground};color:${PAINT.ink};` +
    `border:1px solid ${PAINT.rule};pointer-events:auto;`,
  dialogueMessages: 'flex:1;overflow-y:auto;padding:0 0.5em;',
  dialogueMessage: 'line-height:1.5;',
  dialogueAuthor: `color:${PAINT.quiet};margin-right:0.5em;`,
  dialogueEntry: 'font:inherit;margin-top:0.25em;',
  tooltip:
    'position:absolute;width:max-content;white-space:normal;' +
    `padding:0.25em 0.5em;background:${PAINT.ground};` +
    `color:${PAINT.ink};border:1px solid ${PAINT.rule};pointer-events:auto;`,
  hidden: 'display:none;position:absolute;',
} as const

// see FR-029
/** @purity pure */
function glyphStyle(): string {
  const side = chromeScaledPx(NOT_STORED_ICON_SIZES['S-138'])
  return (
    'display:inline-block;vertical-align:middle;' +
    `width:${side}px;height:${side}px;pointer-events:none;`
  )
}

// see FR-041
export interface ScreenTheme {
  readonly preference: 'light' | 'dark'
  readonly hue: number
  // see S-74
  // WHY: optional, so a theme read before monochrome reached the screen still paints in colour.
  readonly monochrome?: boolean
}

// see FR-041, S-74
// TRAP: every H, not the first (DFC-754); and the one greying of SvgRenderer, so screen and export agree.
/** @purity pure */
function hued(written: string, followsHue: boolean, theme: ScreenTheme): string {
  const coloured = followsHue ? written.replace(/\bH\b/g, String(theme.hue)) : written
  return theme.monochrome === true ? achromatic(coloured) : coloured
}

// see FR-041
/** @purity pure */
export function themeStyle(theme: ScreenTheme): string {
  let written = `color-scheme:${theme.preference};`
  for (const [name, rowId] of Object.entries(PAINT_ROW)) {
    const row = SCREEN_COLOURS[rowId]
    if (row === undefined) continue
    const chosen = theme.preference === 'dark' ? row.dark : row.light
    written += `--gr-${name}:${hued(chosen, row.followsHue, theme)};`
  }
  return written
}

// see FR-039, S-246
/** @purity pure */
function typefaceStyle(): string {
  return `font-family:${NOT_STORED_TYPEFACES['S-246']};`
}

// see FR-041
/** @purity pure */
export function pageGroundStyle(theme: ScreenTheme): string {
  const ground = SCREEN_COLOURS[PAINT_ROW.ground]
  if (ground === undefined) {
    throw new Error(`table T-236 has no ${PAINT_ROW.ground}: rebuild with npm run gen`)
  }
  const chosen = theme.preference === 'dark' ? ground.dark : ground.light
  return (
    `color-scheme:${theme.preference};` +
    `background:${hued(chosen, ground.followsHue, theme)};`
  )
}

export const ROW_GRAB_STRIP_MARK = 'data-row-grab'

export const SCROLLBAR_AXIS_ATTRIBUTE = 'data-axis'

export const SCREEN_Z_ORDER_ATTRIBUTE = 'data-uz'

// see T-337
// WHY: front to back, exactly the table's row ids; z-index comes only from a row's place here (R2.7).
export const SCREEN_Z_ORDER: readonly string[] = [
  'UZ-1',
  'UZ-2',
  'UZ-3',
  'UZ-4',
  'UZ-5',
  'UZ-6',
  'UZ-13',
  'UZ-7',
  'UZ-8',
  'UZ-9',
  'UZ-10',
  'UZ-11',
  'UZ-12',
]

// see T-337
/** @purity pure */
function zIndexOf(rowId: string): number {
  const at = SCREEN_Z_ORDER.indexOf(rowId)
  if (at < 0) throw new Error(`table T-337 has no row ${rowId}`)
  return SCREEN_Z_ORDER.length - at
}

// see T-337
/** @purity pure */
function zIndexStyle(rowId: string): string {
  return `z-index:${zIndexOf(rowId)};`
}

/** @purity non-pure */
function markZOrder(element: HTMLElement, rowId: string): void {
  element.setAttribute(SCREEN_Z_ORDER_ATTRIBUTE, rowId)
  element.style.zIndex = String(zIndexOf(rowId))
}

const ROW_CONTROL_SHOWN_CSS =
  `[data-unit="${UNIT_ROW}"] [data-role="${ROLE.rowExpander}"],` +
  `[data-unit="${UNIT_ROW}"] [data-role="${ROLE.rowPin}"],` +
  `[data-unit="${UNIT_ROW}"] [${ROW_CONTROL_GROUND_MARK}],` +
  `[data-unit="${UNIT_ROW}"] [data-icon="${ADD_CHILD_ROW_ENTRY}"],` +
  `[data-unit="${UNIT_ROW}"] [data-icon="${DELETE_ROW_ENTRY}"]` +
  '{visibility:hidden;}' +
  `[data-unit="${UNIT_ROW}"] [data-group-id]:hover [data-role="${ROLE.rowExpander}"],` +
  `[data-unit="${UNIT_ROW}"] [data-group-id]:hover [data-role="${ROLE.rowPin}"],` +
  `[data-unit="${UNIT_ROW}"] [data-group-id]:hover [${ROW_CONTROL_GROUND_MARK}],` +
  `[data-unit="${UNIT_ROW}"] [data-group-id]:hover [data-icon="${ADD_CHILD_ROW_ENTRY}"],` +
  `[data-unit="${UNIT_ROW}"] [data-group-id]:hover [data-icon="${DELETE_ROW_ENTRY}"]` +
  '{visibility:visible;}' +
  // see HF-6, HF-19
  // WHY: rows paint in tree order, so a later row covers a hanging group and takes its pointer.
  `[data-unit="${UNIT_ROW}"] [data-role="${ROLE.rowTitleTree}"] > [data-group-id]:hover` +
  '{z-index:1;}'

const PALETTE_FAINTNESS = '0.6'

const PALETTE_FAINT_CSS =
  `[data-unit="${UNIT_ROW}"] [data-role="${ROLE.commandPalette}"]:not(:hover)` +
  `{opacity:${PALETTE_FAINTNESS};}`

// see FR-029
/** @purity pure */
function entranceHoverGroundCss(): string {
  return (
    // TRAP: `[data-icon]` without `button` tints the whole grab band, since IC-75 sits inside it.
    `[data-unit="${UNIT_ROW}"] button[data-icon]:not([aria-disabled="true"])` +
    ':not([data-armed="true"]):not([data-pressed="true"]):not([data-pinned="true"])' +
    // WHY: `!important` because entrance grounds are inline declarations, which outrank any rule.
    `:hover{background:${stateGround(PAINT.hoveredEntrance, 'S-214')} !important;}`
  )
}

/** @purity pure */
function hoverCss(): string {
  return ROW_CONTROL_SHOWN_CSS + PALETTE_FAINT_CSS + entranceHoverGroundCss()
}

// see FR-051, HF-19
// WHY: a hanging group may cross canvasPadding but not the horizontal Scrollbars band; no band
// lies under the Row Title Panel, so the tree stops where the chart's band starts.
/** @purity non-pure */
function markFrame(root: HTMLElement, rowTitleTree: HTMLElement, frame: ScreenFrame): void {
  root.setAttribute('data-full-screen', String(frame.isFullScreen))
  const band = horizontalScrollbar(frame)
  const clip = band === undefined ? '' : `clip-path:inset(0 0 calc(100% - ${band.track.y}px) 0);`
  rowTitleTree.setAttribute('style', STYLE.layer + STYLE.treeIsolation + clip + zIndexStyle('UZ-11'))
}

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg'

const GLYPH_BY_ROW = new Map(iconGlyphs.glyphs.map((one) => [one.rowId, one.elements]))

/** @purity pure */
export function boxStyle(box: ScreenRect): string {
  return (
    `position:absolute;left:${box.x}px;top:${box.y}px;` +
    `width:${box.width}px;height:${box.height}px;`
  )
}

// see IN-3, EZ-6, DFC-1287, DFC-1720
/** @purity pure */
export function anchorKey(anchor: TooltipAnchor): string {
  if (anchor.kind === 'icon') {
    return [anchor.kind, anchor.surface, anchor.icon, anchor.groupId].filter((one) => one !== undefined).join(' ')
  }
  if (anchor.kind === 'rowTitle') return `rowTitle ${anchor.groupId}`
  if (anchor.kind === 'scrollbar') return `scrollbar ${anchor.axis}`
  return `${anchor.kind} ${anchor.taskUid}`
}

/** @purity pure */
function described(part: unknown): string {
  return JSON.stringify(part) ?? ''
}

/** @purity pure */
function helpKeysOf(helpModal: ScreenView['openModal']): { readonly helpModal: string; readonly helpPlace: string } {
  if (helpModal === null) return { helpModal: described(null), helpPlace: described(null) }
  const place = 'place' in helpModal ? helpModal.place : null
  return { helpModal: described({ ...helpModal, place: undefined }), helpPlace: described(place) }
}

/** @purity non-pure */
export function made(host: Document, tag: string, style: string): HTMLElement {
  const node = host.createElement(tag)
  node.setAttribute('style', style)
  return node
}

/** @purity non-pure */
export function part(host: Document, tag: string, role: string, style: string): HTMLElement {
  const node = made(host, tag, style)
  node.setAttribute('data-role', role)
  return node
}

/** @purity non-pure */
function shapeNode(host: Document, tag: string): Element {
  if (typeof (host as Partial<Document>).createElementNS !== 'function') {
    return host.createElement(tag)
  }
  return host.createElementNS(SVG_NAMESPACE, tag)
}

// see FR-029, F-019
/** @purity non-pure */
export function fillEntry(
  host: Document,
  entry: HTMLElement,
  icon: string,
  aroundTheShape = '',
): void {
  const drawn = GLYPH_BY_ROW.get(icon)
  // WHY: IconId is a bare string, and an entry with no body collapses to zero height.
  if (drawn === undefined) {
    entry.replaceChildren(icon)
    return
  }
  const shape = shapeNode(host, 'svg')
  shape.setAttribute('viewBox', iconGlyphs.viewBox)
  shape.setAttribute('style', glyphStyle() + aroundTheShape)
  shape.setAttribute('aria-hidden', 'true')
  shape.setAttribute('focusable', 'false')
  for (const element of drawn) {
    const node = shapeNode(host, element.tag)
    for (const attribute of element.attributes) {
      node.setAttribute(attribute.name, attribute.value)
    }
    shape.append(node)
  }
  entry.replaceChildren(shape)
}

// see FR-029, T-109, T-237
/** @purity non-pure */
export function commandEntry(host: Document, item: CommandItem): HTMLElement {
  const base = item.isEnabled ? entryStyle() : entryFaintStyle()
  const standing: EntranceStateRow[] = []
  if (item.isEnabled && item.isArmed) standing.push('EN-1')
  if (item.isEnabled && item.isPressed) standing.push('EN-2')
  if (item.isEnabled && item.isChosen) standing.push('EN-6')
  const entry = made(host, 'button', base + entranceStateFill(standing))
  entry.setAttribute('type', 'button')
  entry.setAttribute('data-icon', item.icon)
  entry.setAttribute('data-enabled', String(item.isEnabled))
  entry.setAttribute('data-pressed', String(item.isPressed))
  // WHY: on every entry, so an unarmed entry is told from one the description never reached.
  entry.setAttribute('data-armed', String(item.isArmed))
  if (!item.isEnabled) entry.setAttribute('aria-disabled', 'true')
  // WHY: only when on: aria-pressed=false on every entry would announce each as a toggle.
  if (item.isPressed) entry.setAttribute('aria-pressed', 'true')
  entry.setAttribute('aria-label', item.label === '' ? item.icon : item.label)
  fillEntry(host, entry, item.icon)
  return entry
}

/** @purity non-pure */
export function anchoredEntry(
  host: Document,
  item: CommandItem,
  anchors: Map<string, HTMLElement>,
  surface?: string,
): HTMLElement {
  const entry = commandEntry(host, item)
  anchors.set(anchorKey({ kind: 'icon', icon: item.icon }), entry)
  if (surface !== undefined) anchors.set(anchorKey({ kind: 'icon', icon: item.icon, surface }), entry)
  return entry
}

export interface ScreenSurfaceWiring {
  readonly host: Document
  readonly mount: Element
  readonly readAuthor: () => string
  readonly readClockMs: () => number
  readonly onAppHeaderHeightPx: (heightPx: number) => void
  readonly onRowControlsHeightPx?: (heightPx: number) => void
  // see FR-053, JDG-660
  readonly onCommandPaletteBandPx?: (bandPx: { readonly width: number; readonly height: number }) => void
  readonly holdFocusPropertyField?: (focus: (row: string) => boolean) => void
  readonly holdReadWatermarkUnlockAnswer?: (read: () => string) => void
  // see SV-5, SV-14, RG-15
  readonly onSearchWordTyped?: () => void
  // see SV-7, RG-16, IF-9
  // WHY: on the wiring, not the seam: the focus and the settled filter changes are no member IF-9 lists.
  readonly holdWindowReaders?: (readers: WindowReaders) => void
  readonly readTheme: () => ScreenTheme
}

export interface WindowReaders {
  readonly readFocusedWindow: () => WindowName | null
  readonly isFocusInPropertiesPanel: () => boolean
  readonly readFilterChanges: () => readonly SearchFilterChange[]
  readonly readReportInput: () => { readonly word: string | null; readonly changes: readonly SearchFilterChange[] }
}

interface TableWindowInput {
  readonly readWord: () => string | null
  readonly readFilterChanges: () => readonly SearchFilterChange[]
}

// see RG-16, IF-9
/** @purity pure */
function windowReadersOf(
  host: Document,
  windows: Partial<Readonly<Record<WindowName, Element>>>,
  propertiesPanel: Element,
  painters: { readonly search: TableWindowInput; readonly report: TableWindowInput },
): WindowReaders {
  /** @purity semi-pure-b */
  const focused = (): Element | null => (host as Partial<Document>).activeElement ?? null
  /** @purity semi-pure-b */
  const readFocusedWindow = (): WindowName | null => {
    const at = focused()
    const held = Object.entries(windows).find(([, layer]) => at !== null && layer.contains(at))
    return held === undefined ? null : (held[0] as WindowName)
  }
  /** @purity semi-pure-b */
  const isFocusInPropertiesPanel = (): boolean => {
    const at = focused()
    return at !== null && propertiesPanel.contains(at)
  }
  /** @purity semi-pure-b */
  const readReportInput = () => ({ word: painters.report.readWord(), changes: painters.report.readFilterChanges() })
  return { readFocusedWindow, isFocusInPropertiesPanel, readFilterChanges: painters.search.readFilterChanges, readReportInput }
}

// see T-337
// WHY: stacking comes from each element's z-index (markZOrder), not the order of the tree.
/** @purity non-pure */
function screenLayersOf(host: Document) {
  const hoverSheet = host.createElement('style')
  hoverSheet.textContent = hoverCss()
  const layers = {
    hoverSheet,
    frameLayer: made(host, 'div', STYLE.layer),
    rowTitlePanel: part(host, 'div', ROLE.rowTitlePanel, STYLE.hidden),
    rowTitleTree: part(host, 'div', ROLE.rowTitleTree, STYLE.layer + STYLE.treeIsolation),
    propertiesPanel: part(host, 'div', ROLE.propertiesPanel, STYLE.hidden),
    dividerBandLayer: made(host, 'div', STYLE.layer),
    paletteLayer: made(host, 'div', STYLE.layer),
    searchPanelLayer: made(host, 'div', STYLE.layer),
    reportLayer: made(host, 'div', STYLE.layer),
    dialogueField: part(host, 'div', ROLE.dialogueField, STYLE.hidden),
    appHeader: part(host, 'div', ROLE.appHeader, appHeaderStyle()),
    // WHY: (T-337) every open surface but Help, which JDG-666 gives its own layer (helpLayer, UZ-7).
    modalLayer: made(host, 'div', STYLE.layer),
    helpLayer: made(host, 'div', STYLE.layer),
    noticeLayer: part(host, 'div', ROLE.notices, STYLE.layer),
    confirmationLayer: made(host, 'div', STYLE.layer),
    tooltipLayer: part(host, 'div', ROLE.tooltips, STYLE.layer),
  }
  const rows: readonly (readonly [HTMLElement, string])[] = [
    [layers.tooltipLayer, 'UZ-2'],
    [layers.confirmationLayer, 'UZ-3'],
    [layers.noticeLayer, 'UZ-4'],
    [layers.paletteLayer, 'UZ-5'],
    [layers.searchPanelLayer, 'UZ-6'],
    [layers.reportLayer, 'UZ-6'],
    [layers.modalLayer, 'UZ-13'],
    [layers.helpLayer, 'UZ-7'],
    [layers.appHeader, 'UZ-8'],
    [layers.dialogueField, 'UZ-9'],
    [layers.dividerBandLayer, 'UZ-10'],
    [layers.rowTitlePanel, 'UZ-11'],
    [layers.rowTitleTree, 'UZ-11'],
    [layers.propertiesPanel, 'UZ-11'],
    [layers.frameLayer, 'UZ-12'],
  ]
  for (const [layer, row] of rows) markZOrder(layer, row)
  return layers
}

// see IF-9, PI-38
/** @purity non-pure */
export function domScreenSurface(wiring: ScreenSurfaceWiring): ScreenSurface {
  const { host, readAuthor, readClockMs, onAppHeaderHeightPx, readTheme } = wiring

  const root = made(host, 'div', STYLE.root + typefaceStyle() + themeStyle(readTheme()))
  root.setAttribute('data-unit', UNIT_ROW)
  const layers = screenLayersOf(host)
  const { frameLayer, rowTitlePanel, rowTitleTree, propertiesPanel, dividerBandLayer, paletteLayer, searchPanelLayer } = layers
  const { dialogueField, appHeader, modalLayer, helpLayer, noticeLayer, confirmationLayer, tooltipLayer, reportLayer } = layers

  const { openEveryRow, collapseEveryRow, openLevelZero, addTopRow, deleteEveryRow } =
    headEntryElements(host)
  const headFoldedRows = foldedRowCountElement(host, 0, headFoldedRowCountRight())
  const head = [openEveryRow, collapseEveryRow, openLevelZero, addTopRow, deleteEveryRow]
  rowTitlePanel.append(...head, headFoldedRows)

  root.append(...Object.values(layers))
  wiring.mount.append(root)

  // see T-337, SE-5
  const scaleMessageLayer = made(host, 'div', SCALE_MESSAGE_STYLE.layer)
  const readoutLayer = made(host, 'div', STYLE.layer)
  markZOrder(scaleMessageLayer, 'UZ-1')
  markZOrder(readoutLayer, 'UZ-1')
  root.append(scaleMessageLayer, readoutLayer)

  // STOP: spec does not decide whether a wheel over a confirmation is left to the host. Looked in MK-1, MK-10, NT-7 (PND-380)
  let lastKeys: Readonly<Record<string, string>> = {}
  let langShown = ''
  let headerHeightPx = 0
  let isHeaderHeightSettled = false
  let paletteBandPx = { width: 0, height: 0 }
  let paletteElementDrawn: HTMLElement | null = null
  let paletteBandDrawn: HTMLElement | null = null
  const { anchorsOf, anchorFor } = tooltipAnchorTable(root)

  // see FR-051
  /** @purity non-pure */
  function reportHeaderHeight(): boolean {
    const measured = appHeader.getBoundingClientRect().height
    if (isHeaderHeightSettled && measured === headerHeightPx) return false
    isHeaderHeightSettled = true
    headerHeightPx = measured
    onAppHeaderHeightPx(measured)
    return true
  }

  // see FR-053, JDG-660
  // WHY: measured on a palette or frame change only, not per frame; the drawn rectangles are the
  // truth, since content decides the palette's width (S-135a note).
  /** @purity non-pure */
  function reportPaletteBand(): void {
    // TRAP: from the palette's corner, not the band's own box; the palette's border sits above it.
    const corner = paletteElementDrawn?.getBoundingClientRect()
    const band = paletteBandDrawn?.getBoundingClientRect()
    const width = corner === undefined || band === undefined ? 0 : band.right - corner.left
    const height = corner === undefined || band === undefined ? 0 : band.bottom - corner.top
    if (width === paletteBandPx.width && height === paletteBandPx.height) return
    paletteBandPx = { width, height }
    wiring.onCommandPaletteBandPx?.(paletteBandPx)
  }

  const reportRowControlsHeight = rowControlsHeightReporter(rowTitleTree, readClockMs, wiring)

  const dialogue = dialogueFieldPainter(host, dialogueField, readAuthor, readClockMs)

  const help = helpWindowPainter(host, helpLayer)

  const searchPanel = searchPanelPainter(host, searchPanelLayer, () => wiring.onSearchWordTyped?.())

  const report = searchPanelPainter(host, reportLayer, () => wiring.onSearchWordTyped?.(), REPORT_IDENTITY)

  let isReportInFront = true

  // see RW-5, T-337
  // WHY: both windows sit in UZ-6, where the later in the tree is drawn in front; the layer opened later moves last.
  /** @purity non-pure */
  function orderTableWindows(view: ScreenView): void {
    const inFront = view.delayDiagnosticsReport?.isInFront !== false
    if (inFront === isReportInFront) return
    isReportInFront = inFront
    if (inFront) searchPanelLayer.after(reportLayer)
    else reportLayer.after(searchPanelLayer)
  }

  /** @purity non-pure */
  function placePanels(view: ScreenView): void {
    const titleEdge = panelEdge(view.frame, 'rowTitlePanel')
    rowTitlePanel.setAttribute(
      'style',
      (titleEdge === null
        ? STYLE.hidden
        : STYLE.rowTitlePanel +
            `left:0;top:${headerHeightPx}px;width:${titleEdge.x}px;bottom:0;`) + zIndexStyle('UZ-11'),
    )
    if (view.propertiesPanel === null) {
      propertiesPanel.setAttribute('style', STYLE.hidden + zIndexStyle('UZ-11'))
      return
    }
    const propertiesEdge = panelEdge(view.frame, 'propertiesPanel')
    const place =
      propertiesEdge === null
        ? `right:0;top:${headerHeightPx}px;bottom:0;width:max-content;`
        : `left:${propertiesEdge.x + propertiesEdge.width}px;` +
          `top:${headerHeightPx}px;right:0;bottom:0;`
    propertiesPanel.setAttribute('style', propertiesPanelStyle() + place + zIndexStyle('UZ-11'))
    // WHY: a new panel width re-wraps every text field, so each is grown again (FR-006).
    growWrappingFields(propertiesPanel)
  }

  // see IF-9
  /** @purity non-pure */
  function showScreenView(view: ScreenView): void {
    fieldEditing.holdNoticeShowing(view.notices.length > 0)
    // WHY: (T-337, JDG-666) Help has its own layer, also when it arrives as the open surface.
    const isHelpOpenModal = view.openModal !== null && view.openModal.surface === HELP_MODAL_SURFACE
    const surfaceModal = isHelpOpenModal ? null : view.openModal
    const helpModal = view.helpModal ?? (isHelpOpenModal ? view.openModal : null)
    const keys: Record<string, string> = {
      frame: described(view.frame),
      appHeaderItems: described(view.appHeaderItems),
      rowTitlePanel: described(view.rowTitlePanel),
      propertiesPanel: fieldEditing.panelKeyAfterCommits(propertiesPanelKeyOf(view.propertiesPanel)),
      commandPalette: described(view.commandPalette),
      openModal: described(surfaceModal),
      ...helpKeysOf(helpModal),
      notices: described(view.notices),
      confirmation: described(view.confirmation),
      dialogueField: described(view.dialogueField),
      searchPanel: described(view.searchPanel),
      delayDiagnosticsReport: described(view.delayDiagnosticsReport ?? null),
      tooltips: described(view.tooltips),
    }
    const changed = (name: string): boolean => keys[name] !== lastKeys[name]
    // TRAP: record what was drawn, not keys: a part that declined to redraw would see no change
    // next frame and keep the old description after its control is let go.
    const drawnKeys: Record<string, string> = { ...keys }

    if (view.language !== langShown) {
      langShown = view.language
      root.setAttribute('lang', view.language)
    }

    let isHeaderMoved = false
    if (changed('appHeaderItems')) {
      if (fieldEditing.isDocumentTitleOpen()) {
        drawnKeys.appHeaderItems = lastKeys.appHeaderItems ?? ''
      } else {
        fieldEditing.holdDocumentTitle(
          fillAppHeader(host, appHeader, view.appHeaderItems, anchorsOf('appHeaderItems')),
          view.appHeaderItems.documentTitle ?? '',
        )
        isHeaderMoved = reportHeaderHeight()
      }
    }
    if (changed('frame')) {
      fillScreenFrame(host, frameLayer, dividerBandLayer, view.frame, anchorsOf('frame'))
      markFrame(root, rowTitleTree, view.frame)
    }
    if (changed('rowTitlePanel')) {
      fillRowTitleTree(host, rowTitleTree, view.rowTitlePanel, anchorsOf('rowTitlePanel'))
      reportRowControlsHeight(rowControlsMeasureKey(view, readTheme(), headerHeightPx))
      const rowsTop = rowsTopPx(view.rowTitlePanel)
      for (const corner of head) {
        if (rowsTop === null) corner.removeAttribute('data-corner-band')
        else corner.setAttribute('data-corner-band', String(rowsTop - headerHeightPx))
      }
      markHeadEntries(
        { openEveryRow, collapseEveryRow, openLevelZero, addTopRow, deleteEveryRow },
        view.rowTitlePanel,
      )
      markFoldedRowCount(
        headFoldedRows,
        view.rowTitlePanel.foldedRowCount ?? 0,
        headFoldedRowCountRight(),
      )
    }
    if (changed('propertiesPanel') && view.propertiesPanel !== null) {
      markPropertiesPanel(propertiesPanel, view.propertiesPanel)
      // TRAP: a held control: no redraw (loses the caret), no anchorsOf (empties the map).
      if (fieldEditing.isFieldHeld()) {
        drawnKeys.propertiesPanel = lastKeys.propertiesPanel ?? ''
      } else {
        fillPropertiesPanel(
          host,
          propertiesPanel,
          view.propertiesPanel,
          anchorsOf('propertiesPanel'),
          fieldEditing.typedControlsByRow,
        )
      }
    }
    if (view.propertiesPanel !== null) rewritePanelReadouts(propertiesPanel, view.propertiesPanel)
    if (changed('commandPalette')) {
      const palette = view.commandPalette
      const anchors = anchorsOf('commandPalette')
      paletteElementDrawn = palette === null ? null : paletteElement(host, palette, anchors)
      paletteBandDrawn =
        palette === null ? null : (anchors.get(anchorKey({ kind: 'icon', icon: PALETTE_GRAB_BAND_ENTRY })) ?? null)
      paletteLayer.replaceChildren(...(paletteElementDrawn === null ? [] : [paletteElementDrawn]))
    }
    if (changed('openModal')) {
      const anchors = anchorsOf('openModal')
      const drawnModal = surfaceModal === null ? null : modalElement(host, surfaceModal, anchors)
      const scrolledBefore = modalLayer.querySelector(ROSTER_SCROLLER)
      modalLayer.replaceChildren(...(drawnModal === null ? [] : [drawnModal.element]))
      keepRosterScroll(scrolledBefore, modalLayer.querySelector(ROSTER_SCROLLER))
      fieldEditing.holdWatermarkUnlock(drawnModal)
    }
    if (changed('helpModal') || changed('helpPlace')) help.draw(helpModal, changed('helpModal'), () => anchorsOf('helpModal'))
    searchPanel.draw(view.searchPanel, changed('searchPanel'), () => anchorsOf('searchPanel'))
    report.draw(view.delayDiagnosticsReport, changed('delayDiagnosticsReport'), () => anchorsOf('delayDiagnosticsReport'))
    orderTableWindows(view)
    if (changed('notices')) {
      noticeLayer.replaceChildren(...view.notices.map((one) => noticeElement(host, one)))
    }
    if (changed('confirmation')) {
      const asked = view.confirmation
      confirmationLayer.replaceChildren(
        ...(asked === null ? [] : [confirmationElement(host, asked)]),
      )
    }

    if (changed('frame') || changed('commandPalette')) reportPaletteBand()
    if (isHeaderMoved || changed('frame') || changed('propertiesPanel')) placePanels(view)
    if (changed('dialogueField')) dialogue.draw(view.dialogueField ?? null, anchorsOf('dialogueField'), zIndexStyle('UZ-9'))
    if (isHeaderMoved || changed('notices')) {
      noticeLayer.setAttribute('style', STYLE.notices + `top:${headerHeightPx}px;` + zIndexStyle('UZ-4'))
    }

    if (changed('tooltips')) {
      tooltipLayer.replaceChildren(...view.tooltips.map((one) => tooltipElement(host, one, anchorFor)))
      keepTooltipsInside(tooltipLayer)
    }

    lastKeys = drawnKeys
    showUnpressableWords(host, scaleMessageLayer, readoutLayer, view)
    // TRAP: shown synchronously, never inside a frame callback: a first paint that waits for one
    // leaves a white screen until an input arrives.
    root.setAttribute('style', STYLE.rootShown + typefaceStyle() + themeStyle(readTheme()))

    dialogue.forgetSettled()
  }

  const fieldEditing = fieldEditingOf(host, propertiesPanel)

  // see IF-9, GR-20, GR-21
  /** @purity semi-pure-b */
  function readScreenPartAt(x: number, y: number): ScreenPart | null {
    const ask = (host as Partial<Document>).elementFromPoint
    if (typeof ask !== 'function') return null

    const first: Element | null = ask.call(host, x, y)
    let node = first
    let entry: string | null = null
    let format: string | null = null
    let group: string | null = null
    let uid: string | null = null
    let panel: string | null = null
    let part: string | null = null
    let dismissKey: string | null = null
    let answer: string | null = null
    let onImportReportDismiss = false
    let onGrabStrip = false
    let axis: string | null = null
    // WHY: the innermost carrier wins for each key but the outermost data-role for the part: an
    // entry sits inside its part, and table T-109 names the containing surface.
    while (node !== null && node !== root) {
      const icon = node.getAttribute('data-icon')
      if (icon !== null && entry === null) entry = icon
      const chosen = node.getAttribute('data-format')
      if (chosen !== null && format === null) format = chosen
      const groupId = node.getAttribute('data-group-id')
      if (groupId !== null && group === null) group = groupId
      const resource = node.getAttribute('data-uid')
      if (resource !== null && uid === null) uid = resource
      const resized = node.getAttribute('data-panel')
      if (resized !== null && panel === null) panel = resized
      const told = node.getAttribute(NOTICE_DISMISS_KEY_ATTRIBUTE)
      if (told !== null && dismissKey === null) dismissKey = told
      const given = node.getAttribute(CONFIRMATION_ANSWER_ATTRIBUTE)
      if (given !== null && answer === null) answer = given
      if (node.getAttribute(ROW_GRAB_STRIP_MARK) !== null) onGrabStrip = true
      const lane = node.getAttribute(SCROLLBAR_AXIS_ATTRIBUTE)
      if (lane !== null && axis === null) axis = lane
      if (node.getAttribute(IMPORT_REPORT_DISMISS_ATTRIBUTE) !== null) {
        onImportReportDismiss = true
      }
      const role = node.getAttribute('data-role')
      if (role !== null) part = role
      node = node.parentElement
    }
    if (node !== root || part === null) return windowsAnswerAt({ x, y, first, walked: null })
    return windowsAnswerAt({ x, y, first, walked: {
      part: part === ROLE.rowTitleTree ? ROLE.rowTitlePanel : part,
      entry,
      format,
      rowGroupId: group,
      resourceUid: uid === null ? null : Number(uid),
      dividerPanel: panel === null ? null : (panel as ScreenPart['dividerPanel']),
      ...(onGrabStrip ? { isRowGrabStrip: true } : {}),
      ...(axis === null ? {} : { scrollbarAxis: axis as NonNullable<ScreenPart['scrollbarAxis']> }),
      noticeDismissKey: dismissKey,
      ...(answer === null ? {} : { confirmationAnswer: answer }),
      ...(onImportReportDismiss ? { isImportReportDismiss: true } : {}),
    } })
  }

  /** @purity semi-pure-b */
  const windowsAnswerAt = (asked: PointAsked): ScreenPart | null => {
    const [back, front] = isReportInFront ? [searchPanel, report] : [report, searchPanel]
    const tableWindows = front.answerAt({ ...asked, walked: back.answerAt(asked) })
    return dialogue.answerAt({ ...asked, walked: help.answerAt({ ...asked, walked: tableWindows }) })
  }

  // TRAP: onAppHeaderHeightPx fires here, before this factory returns: the callback may not
  // reach for the surface, and BO-1's regions must wait for it.
  reportHeaderHeight()

  // see SV-2
  wiring.holdFocusPropertyField?.((row) =>
    row === SEARCH_WORD_ROW ? searchPanel.focusWord() : fieldEditing.focusPropertyField(row),
  )

  wiring.holdReadWatermarkUnlockAnswer?.(fieldEditing.readWatermarkUnlockAnswer)
  const windowLayers = { searchPanel: searchPanelLayer, delayDiagnosticsReport: reportLayer, helpModal: helpLayer, dialogueField }
  wiring.holdWindowReaders?.(windowReadersOf(host, windowLayers, propertiesPanel, { search: searchPanel, report }))

  // WHY: focusPropertyField travels on the wiring: the IF-9 cell of table T-065 names exactly these.
  return {
    showScreenView,
    readDialogueInput: dialogue.readDialogueInput,
    readFieldCommit: fieldEditing.readFieldCommit,
    readScreenPartAt,
    hasUnsettledTextEntry: fieldEditing.hasUnsettledTextEntry,
    readFieldEditNotices: fieldEditing.readFieldEditNotices,
    readSearchWord: searchPanel.readWord,
  }
}

// see SE-2
const SCALE_MESSAGE_MARK = 'data-scale-message'

// see FR-039, SE-4, SE-5
// TRAP: no data-role and pointer-events:none, so readScreenPartAt never answers it and a
// press lands on what lies under it; one element, rewritten in place, never stacked (SE-4).
/** @purity non-pure */
function showScaleMessage(host: Document, layer: HTMLElement, text: string | undefined): void {
  if (text === undefined) {
    if (layer.firstElementChild !== null) layer.replaceChildren()
    return
  }
  const shown = layer.firstElementChild
  if (shown !== null) {
    if (shown.textContent !== text) shown.textContent = text
    return
  }
  const box = made(host, 'div', SCALE_MESSAGE_STYLE.box)
  box.setAttribute(SCALE_MESSAGE_MARK, '')
  box.textContent = text
  layer.append(box)
}

// see SE-5, DC-3, CU-3, DC-9
/** @purity non-pure */
function showUnpressableWords(
  host: Document,
  scaleMessageLayer: HTMLElement,
  readoutLayer: HTMLElement,
  view: ScreenView,
): void {
  showScaleMessage(host, scaleMessageLayer, view.scaleMessage)
  const label = view.guideCursorLabel
  showPointTip(host, readoutLayer, view.dualCursorReadout ?? (label === undefined ? undefined : { lines: [label.text], at: label.at }))
}

// see FR-039, SE-5
// WHY: T-260 leaves the place and the look open; this follows CR-411 question 3's recommendation,
// an upper-middle box that takes no press.
const SCALE_MESSAGE_STYLE = {
  layer:
    'position:absolute;left:0;right:0;top:33%;pointer-events:none;' +
    'display:flex;justify-content:center;',
  box:
    `padding:0.25em 0.75em;background:${PAINT.ground};color:${PAINT.ink};` +
    `border:1px solid ${PAINT.rule};box-shadow:0 2px 8px ${PAINT.shadow};` +
    'font-size:1.5em;pointer-events:none;',
} as const

// <generated -- do not edit by hand>
// Single source of truth:
//   docs/spec/_source/settings.json (tables T-206 and T-236)
// Rebuild: npm run gen   ||   npm run gen:check fails on drift.
// see T-206
export const NOT_STORED_ICON_SIZES: {
  readonly 'S-138': number
  readonly 'S-141': number
  readonly 'S-237': number
  readonly 'S-243': number
} = {
  'S-138': 16,
  'S-141': 4,
  'S-237': 1,
  'S-243': 1,
}

// see T-206
export const NOT_STORED_ROW_GRAB_STRIP_SIZES: {
  readonly 'S-218': number
} = {
  'S-218': 4,
}

// see T-206
export const NOT_STORED_ROW_BAND_SIZES: {
  readonly 'S-213': number
} = {
  'S-213': 3,
}

// see T-206
export const NOT_STORED_ROW_CONTROL_EDGE_SIZES: {
  readonly 'S-313': number
} = {
  'S-313': 4,
}

// see T-206
const NOT_STORED_STATE_GROUND_PERCENTS: {
  readonly 'S-214': number
  readonly 'S-215': number
} = {
  'S-214': 9,
  'S-215': 12,
}

// see T-206
export const NOT_STORED_HELP_SIZES: {
  readonly 'S-201': number
  readonly 'S-202': number
  readonly 'S-203': number
  readonly 'S-204': number
  readonly 'S-334': number
  readonly 'S-339': number
  readonly 'S-340': number
  readonly 'S-436': number
  readonly 'S-437': number
  readonly 'S-457': number
  readonly 'S-458': number
  readonly 'S-460': number
  readonly 'S-423': number
  readonly 'S-424': number
  readonly 'S-426': number
  readonly 'S-453': number
  readonly 'S-454': number
  readonly 'S-459': string
} = {
  'S-201': 0.95,
  'S-202': 4,
  'S-203': 0.80,
  'S-204': 0.875,
  'S-334': 0.4375,
  'S-339': 8,
  'S-340': 10,
  'S-436': 1.0,
  'S-437': 1,
  'S-457': 0.5,
  'S-458': 18,
  'S-460': 24,
  'S-423': 360,
  'S-424': 160,
  'S-426': 6,
  'S-453': 24,
  'S-454': 14,
  'S-459': 'https://github.com/GoodRelax/gr-scheduler',
}

// see T-206
export const NOT_STORED_RESOURCE_ROSTER_SIZES: {
  readonly 'S-240': number
  readonly 'S-241': number
} = {
  'S-240': 0.75,
  'S-241': 1,
}

// see T-206
export const NOT_STORED_SEARCH_PANEL_SIZES: {
  readonly 'S-421': number
  readonly 'S-422': number
  readonly 'S-425': number
  readonly 'S-465': number
  readonly 'S-466': number
  readonly 'S-467': number
  readonly 'S-468': number
  readonly 'S-469': number
  readonly 'S-470': number
  readonly 'S-471': number
  readonly 'S-472': number
  readonly 'S-473': number
  readonly 'S-474': number
  readonly 'S-475': number
  readonly 'S-476': number
  readonly 'S-477': number
  readonly 'S-478': number
  readonly 'S-479': number
  readonly 'S-480': number
  readonly 'S-481': number
} = {
  'S-421': 0.5,
  'S-422': 0.5,
  'S-425': 64,
  'S-465': 6,
  'S-466': 250,
  'S-467': 190,
  'S-468': 110,
  'S-469': 110,
  'S-470': 150,
  'S-471': 380,
  'S-472': 300,
  'S-473': 240,
  'S-474': 110,
  'S-475': 150,
  'S-476': 190,
  'S-477': 110,
  'S-478': 250,
  'S-479': 220,
  'S-480': 220,
  'S-481': 380,
}

// see T-333, FR-151
export const NOT_STORED_SEARCH_PANEL_FONT_SIZES: {
  readonly 'S-430': number
  readonly 'S-431': number
  readonly 'S-432': number
} = {
  'S-430': 9,
  'S-431': 10,
  'S-432': 12,
}

// see T-206
export const NOT_STORED_PALETTE_GROUP_RULE_SIZES: {
  readonly 'S-143': readonly [number, number]
} = {
  'S-143': [1, 6],
}

// see T-206
export const NOT_STORED_PROPERTY_FIELD_SIZES: {
  readonly 'S-186': number
  readonly 'S-187': number
  readonly 'S-188': readonly [number, number]
  readonly 'S-189': number
  readonly 'S-190': number
  readonly 'S-191': number
  readonly 'S-192': readonly [number, number]
  readonly 'S-193': number
  readonly 'S-197': number
  readonly 'S-198': number
  readonly 'S-335': number
  readonly 'S-338': number
  readonly 'S-368': number
  readonly 'S-440': number
  readonly 'S-441': number
} = {
  'S-186': 17,
  'S-187': 16,
  'S-188': [14, 3],
  'S-189': 42,
  'S-190': 6,
  'S-191': 2,
  'S-192': [6, 8],
  'S-193': 2,
  'S-197': 0.70,
  'S-198': 0.90,
  'S-335': 2,
  'S-338': 5,
  'S-368': 5,
  'S-440': 1,
  'S-441': 6,
}

// see T-206
export const NOT_STORED_CONFIRMATION_RULE_SIZES: {
  readonly 'S-242': number
} = {
  'S-242': 1,
}

// see T-206
export const NOT_STORED_DOCUMENT_TITLE_SIZES: {
  readonly 'S-225': number
  readonly 'S-226': number
  readonly 'S-461': number
  readonly 'S-462': number
  readonly 'S-463': number
} = {
  'S-225': 20,
  'S-226': 12,
  'S-461': 0.05,
  'S-462': 2.5,
  'S-463': 700,
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

// see T-236, S-73
export const SCREEN_COLOURS: {
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
  'S-231': { light: 'hsl(H 14% 82%)', dark: 'hsl(H 12% 28%)', followsHue: true },
  'S-151': { light: 'hsl(H 59% 32%)', dark: 'hsl(H 62% 68%)', followsHue: true },
  'S-152': { light: '#1f7a3d', dark: '#6fc98d', followsHue: false },
  'S-183': { light: '#1f7a3d', dark: '#6fc98d', followsHue: false },
  'S-153': { light: '#a8600f', dark: '#e0a353', followsHue: false },
  'S-154': { light: '#a02b2b', dark: '#e07a7a', followsHue: false },
  'S-170': { light: 'rgba(0,0,0,0.28)', dark: 'rgba(0,0,0,0.6)', followsHue: false },
  'S-336': { light: '#ffffff', dark: '#ffffff', followsHue: false },
  'S-337': { light: '#c0c0c0', dark: '#c0c0c0', followsHue: false },
  'S-464': { light: '#5b6068', dark: '#9aa1ab', followsHue: false },
}
// </generated>
