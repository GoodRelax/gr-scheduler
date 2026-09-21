// DomScreenSurface -- public entry of this folder.
// @unit      UF-71   (docs/spec/05-07-design.md, table T-075)
// @component DomScreenSurface, layer Framework (table T-062)
// @purity    non-pure
// @publishes table T-064 row PI-38

import type {
  CommandItem,
  ScreenPart,
  ScreenSurface,
  ScreenView,
  TooltipAnchor,
} from '../../adapter/screen-renderer/screen-renderer'
import type { ScreenRect } from '../../entity/layout-engine/screen-regions/screen-regions'
import iconGlyphs from './icon-glyphs.json'
import { fillScreenFrame, panelEdge } from './screen-frame-drawing'
import { appHeaderStyle, fillAppHeader } from './app-header-drawing'
import { confirmationElement, noticeElement } from './notices-drawing'
import { paletteElement } from './command-palette-drawing'
import { fieldEditingOf } from './field-editing'
import { showDualCursorReadout, tooltipAnchorTable, tooltipElement } from './tooltips-drawing'
import {
  fillPropertiesPanel,
  growWrappingFields,
  markPropertiesPanel,
  propertiesPanelStyle,
} from './properties-panel-drawing'
import {
  ADD_CHILD_ROW_ENTRY,
  DELETE_ROW_ENTRY,
  ROW_CONTROL_GROUND_MARK,
  addTopRowElement,
  collapseEveryRowElement,
  fillRowTitleTree,
  foldedRowCountElement,
  headFoldedRowCountRight,
  markFoldedRowCount,
  markPanelCornerEntry,
  openEveryRowElement,
  openLevelZeroElement,
  rowControlsHeightReporter,
  rowControlsMeasureKey,
  rowsTopPx,
} from './row-title-panel-drawing'
import {
  dialogueSettlement,
  fillDialogueMessages,
  placeDialogueField,
} from './dialogue-field-drawing'
import { ROSTER_SCROLLER, keepRosterScroll, modalElement } from './open-modals-drawing'

const UNIT_ROW = 'UF-71'

export const ROLE = {
  appHeader: 'App Header',
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

// see FR-029, LF-3, HF-19
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

const FILE_STATUS_TEXT_SCALE = 0.75

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
  appHeader:
    'position:absolute;left:0;top:0;right:0;box-sizing:border-box;display:flex;' +
    'align-items:center;gap:0.75em;padding:0.375em 0.75em;line-height:1.5;' +
    `overflow:hidden;white-space:nowrap;background:${PAINT.ground};color:${PAINT.ink};` +
    `border-bottom:1px solid ${PAINT.rule};pointer-events:auto;`,
  // see FR-039
  // TRAP: every text here stays at the normal weight, the h2 heading included; S-245 is the OC-1 name
  // labels' alone, and NT-7's answer initial is the one bold.
  documentTitle: 'overflow:hidden;text-overflow:ellipsis;',
  documentTitleEntry:
    'box-sizing:border-box;width:100%;min-width:0;font:inherit;color:inherit;' +
    'background:transparent;border:0;padding:0;margin:0;',
  fileStatus:
    `margin-left:auto;color:${PAINT.quiet};display:flex;` +
    `flex-direction:column;align-items:flex-end;line-height:1.2;` +
    `font-size:${FILE_STATUS_TEXT_SCALE}em;`,
  openedFileName: 'overflow:hidden;text-overflow:ellipsis;max-width:24ch;',
  fileSavedAt: '',
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
  rowTitle:
    'box-sizing:border-box;display:flex;align-items:flex-start;' +
    `overflow:hidden;white-space:nowrap;background:${PAINT.panel};color:${PAINT.ink};` +
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
  // STOP: spec does not decide what a palette larger than the window does. Looked in FR-053, SC-6, S-135a
  // @provisional PND-470
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
  helpEntry: 'display:flex;align-items:baseline;gap:0.5em;break-inside:avoid;line-height:1.35;',
  helpText: 'flex:1;min-width:0;',
  helpKeys: 'flex:0 0 auto;opacity:0.75;white-space:nowrap;',
  helpGlyph: 'flex:0 0 auto;display:inline-flex;align-items:center;',
  helpColumn: 'min-width:0;',
  helpBlock: '',
  helpHeading: '',
  helpLegend: 'display:inline-flex;align-items:center;gap:0.5em;margin-left:auto;',
  helpLegal: 'margin-top:0.75em;border-top:1px solid currentColor;padding-top:0.5em;',
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
    'position:absolute;box-sizing:border-box;display:flex;flex-direction:column;' +
    `width:24em;height:14em;padding:0.5em;background:${PAINT.ground};color:${PAINT.ink};` +
    `border:1px solid ${PAINT.rule};pointer-events:auto;`,
  dialogueMessages: 'flex:1;overflow-y:auto;',
  dialogueMessage: 'line-height:1.5;',
  dialogueAuthor: `color:${PAINT.quiet};margin-right:0.5em;`,
  dialogueEntry: 'font:inherit;margin-top:0.25em;',
  tooltip:
    `position:absolute;max-width:24em;padding:0.25em 0.5em;background:${PAINT.ground};` +
    `color:${PAINT.ink};border:1px solid ${PAINT.rule};pointer-events:auto;`,
  hidden: 'display:none;',
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
}

/** @purity pure */
function hued(written: string, followsHue: boolean, hue: number): string {
  return followsHue ? written.replace('H', String(hue)) : written
}

// see FR-041
/** @purity pure */
export function themeStyle(theme: ScreenTheme): string {
  let written = `color-scheme:${theme.preference};`
  for (const [name, rowId] of Object.entries(PAINT_ROW)) {
    const row = SCREEN_COLOURS[rowId]
    if (row === undefined) continue
    const chosen = theme.preference === 'dark' ? row.dark : row.light
    written += `--gr-${name}:${hued(chosen, row.followsHue, theme.hue)};`
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
    `background:${hued(chosen, ground.followsHue, theme.hue)};`
  )
}

export const ROW_GRAB_STRIP_MARK = 'data-row-grab'

export const SCROLLBAR_AXIS_ATTRIBUTE = 'data-axis'

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
  '{visibility:visible;}'

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

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg'

const GLYPH_BY_ROW = new Map(iconGlyphs.glyphs.map((one) => [one.rowId, one.elements]))

/** @purity pure */
export function boxStyle(box: ScreenRect): string {
  return (
    `position:absolute;left:${box.x}px;top:${box.y}px;` +
    `width:${box.width}px;height:${box.height}px;`
  )
}

/** @purity pure */
export function anchorKey(anchor: TooltipAnchor): string {
  if (anchor.kind === 'icon') return `icon ${anchor.icon}`
  if (anchor.kind === 'task') return `task ${anchor.taskUid}`
  if (anchor.kind === 'rowTitle') return `rowTitle ${anchor.groupId}`
  return `scrollbar ${anchor.axis}`
}

/** @purity pure */
function described(part: unknown): string {
  return JSON.stringify(part) ?? ''
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
): HTMLElement {
  const entry = commandEntry(host, item)
  anchors.set(anchorKey({ kind: 'icon', icon: item.icon }), entry)
  return entry
}

export interface ScreenSurfaceWiring {
  readonly host: Document
  readonly mount: Element
  readonly readAuthor: () => string
  readonly readClockMs: () => number
  readonly onAppHeaderHeightPx: (heightPx: number) => void
  readonly onRowControlsHeightPx?: (heightPx: number) => void
  readonly holdFocusPropertyField?: (focus: (row: string) => boolean) => void
  readonly holdReadWatermarkUnlockAnswer?: (read: () => string) => void
  readonly readTheme: () => ScreenTheme
}

// see IF-9, PI-38
/** @purity non-pure */
export function domScreenSurface(wiring: ScreenSurfaceWiring): ScreenSurface {
  const { host, readAuthor, readClockMs, onAppHeaderHeightPx, readTheme } = wiring

  const root = made(host, 'div', STYLE.root + typefaceStyle() + themeStyle(readTheme()))
  root.setAttribute('data-unit', UNIT_ROW)

  const hoverSheet = host.createElement('style')
  hoverSheet.textContent = hoverCss()

  const frameLayer = made(host, 'div', STYLE.layer)
  const rowTitlePanel = part(host, 'div', ROLE.rowTitlePanel, STYLE.hidden)
  const rowTitleTree = part(host, 'div', ROLE.rowTitleTree, STYLE.layer)
  const propertiesPanel = part(host, 'div', ROLE.propertiesPanel, STYLE.hidden)
  const dividerBandLayer = made(host, 'div', STYLE.layer)
  const paletteLayer = made(host, 'div', STYLE.layer)
  const dialogueField = part(host, 'div', ROLE.dialogueField, STYLE.hidden)
  const dialogueMessages = made(host, 'div', STYLE.dialogueMessages)
  const dialogueEntry = host.createElement('input')
  const appHeader = part(host, 'div', ROLE.appHeader, appHeaderStyle())
  const modalLayer = made(host, 'div', STYLE.layer)
  const noticeLayer = part(host, 'div', ROLE.notices, STYLE.layer)
  const confirmationLayer = made(host, 'div', STYLE.layer)
  const tooltipLayer = part(host, 'div', ROLE.tooltips, STYLE.layer)

  const openEveryRow = openEveryRowElement(host)
  const collapseEveryRow = collapseEveryRowElement(host)
  const openLevelZero = openLevelZeroElement(host)
  const addTopRow = addTopRowElement(host)
  const headFoldedRows = foldedRowCountElement(host, 0, headFoldedRowCountRight())
  rowTitlePanel.append(openEveryRow, collapseEveryRow, openLevelZero, addTopRow, headFoldedRows)

  dialogueEntry.setAttribute('type', 'text')
  dialogueEntry.setAttribute('style', STYLE.dialogueEntry)
  dialogueField.append(dialogueMessages, dialogueEntry)

  // TRAP: append order is stacking order; a notice above the confirmation hides NT-7's answers.
  root.append(
    hoverSheet,
    frameLayer,
    rowTitlePanel,
    rowTitleTree,
    propertiesPanel,
    // TRAP: after both panels and the frame's scrollbar lanes, which cover the band's two halves
    // (GR-22); before the palette, whose band GR-19 puts above it.
    dividerBandLayer,
    paletteLayer,
    dialogueField,
    appHeader,
    modalLayer,
    noticeLayer,
    confirmationLayer,
    tooltipLayer,
  )
  wiring.mount.append(root)

  // see SE-5
  // TRAP: appended last, above the confirmation and the tooltips; it takes no press, so it
  // hides nothing a person has to reach.
  const scaleMessageLayer = made(host, 'div', SCALE_MESSAGE_STYLE.layer)
  const readoutLayer = made(host, 'div', STYLE.layer)
  root.append(scaleMessageLayer, readoutLayer)

  // STOP: spec does not decide whether a wheel over a confirmation is left to the host. Looked in MK-1, MK-10, NT-7 (PND-380)
  let lastKeys: Readonly<Record<string, string>> = {}
  let langShown = ''
  let headerHeightPx = 0
  let isHeaderHeightSettled = false
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

  const reportRowControlsHeight = rowControlsHeightReporter(rowTitleTree, readClockMs, wiring)

  const dialogue = dialogueSettlement(dialogueEntry, readAuthor, readClockMs)

  /** @purity non-pure */
  function placePanels(view: ScreenView): void {
    const titleEdge = panelEdge(view.frame, 'rowTitlePanel')
    rowTitlePanel.setAttribute(
      'style',
      titleEdge === null
        ? STYLE.hidden
        : STYLE.rowTitlePanel +
            `left:0;top:${headerHeightPx}px;width:${titleEdge.x}px;bottom:0;`,
    )
    if (view.propertiesPanel === null) {
      propertiesPanel.setAttribute('style', STYLE.hidden)
      return
    }
    const propertiesEdge = panelEdge(view.frame, 'propertiesPanel')
    const place =
      propertiesEdge === null
        ? `right:0;top:${headerHeightPx}px;bottom:0;width:max-content;`
        : `left:${propertiesEdge.x + propertiesEdge.width}px;` +
          `top:${headerHeightPx}px;right:0;bottom:0;`
    propertiesPanel.setAttribute('style', propertiesPanelStyle() + place)
    // WHY: a new panel width re-wraps every text field, so each is grown again (FR-006).
    growWrappingFields(propertiesPanel)
  }

  // see IF-9
  /** @purity non-pure */
  function showScreenView(view: ScreenView): void {
    fieldEditing.holdNoticeShowing(view.notices.length > 0)
    const keys: Record<string, string> = {
      frame: described(view.frame),
      appHeaderItems: described(view.appHeaderItems),
      rowTitlePanel: described(view.rowTitlePanel),
      propertiesPanel: described(view.propertiesPanel),
      commandPalette: described(view.commandPalette),
      openModal: described(view.openModal),
      notices: described(view.notices),
      confirmation: described(view.confirmation),
      dialogueField: described(view.dialogueField),
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
      root.setAttribute('data-full-screen', String(view.frame.isFullScreen))
    }
    if (changed('rowTitlePanel')) {
      fillRowTitleTree(host, rowTitleTree, view.rowTitlePanel, anchorsOf('rowTitlePanel'))
      reportRowControlsHeight(rowControlsMeasureKey(view, readTheme(), headerHeightPx))
      const rowsTop = rowsTopPx(view.rowTitlePanel)
      for (const corner of [openEveryRow, collapseEveryRow, openLevelZero, addTopRow]) {
        if (rowsTop === null) corner.removeAttribute('data-corner-band')
        else corner.setAttribute('data-corner-band', String(rowsTop - headerHeightPx))
      }
      markPanelCornerEntry(openEveryRow, 1, view.rowTitlePanel.canOpenEveryRow)
      markPanelCornerEntry(collapseEveryRow, 2, view.rowTitlePanel.canCloseEveryRow)
      markPanelCornerEntry(openLevelZero, 3, view.rowTitlePanel.canOpenLevelZero)
      markPanelCornerEntry(addTopRow, 0, true)
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
    if (changed('commandPalette')) {
      const palette = view.commandPalette
      const anchors = anchorsOf('commandPalette')
      paletteLayer.replaceChildren(
        ...(palette === null ? [] : [paletteElement(host, palette, anchors)]),
      )
    }
    if (changed('openModal')) {
      const modal = view.openModal
      const anchors = anchorsOf('openModal')
      const drawnModal = modal === null ? null : modalElement(host, modal, anchors)
      const scrolledBefore = modalLayer.querySelector(ROSTER_SCROLLER)
      modalLayer.replaceChildren(...(drawnModal === null ? [] : [drawnModal.element]))
      keepRosterScroll(scrolledBefore, modalLayer.querySelector(ROSTER_SCROLLER))
      fieldEditing.holdWatermarkUnlock(drawnModal)
    }
    if (changed('notices')) {
      noticeLayer.replaceChildren(...view.notices.map((one) => noticeElement(host, one)))
    }
    if (changed('confirmation')) {
      const asked = view.confirmation
      confirmationLayer.replaceChildren(
        ...(asked === null ? [] : [confirmationElement(host, asked)]),
      )
    }
    if (changed('dialogueField')) {
      const field = view.dialogueField
      dialogue.markFieldUp(field !== null)
      if (field !== null) fillDialogueMessages(host, dialogueMessages, field)
    }

    if (isHeaderMoved || changed('frame') || changed('propertiesPanel')) placePanels(view)
    if (isHeaderMoved || changed('frame') || changed('dialogueField')) placeDialogueField(dialogueField, view)
    if (isHeaderMoved || changed('notices')) {
      noticeLayer.setAttribute('style', STYLE.notices + `top:${headerHeightPx}px;`)
    }

    if (isHeaderMoved || Object.keys(keys).some(changed)) {
      tooltipLayer.replaceChildren(...view.tooltips.map((one) => tooltipElement(host, one, anchorFor)))
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

    let node: Element | null = ask.call(host, x, y)
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
    if (node !== root || part === null) return null
    return {
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
    }
  }

  // TRAP: onAppHeaderHeightPx fires here, before this factory returns: the callback may not
  // reach for the surface, and BO-1's regions must wait for it.
  reportHeaderHeight()

  wiring.holdFocusPropertyField?.(fieldEditing.focusPropertyField)

  wiring.holdReadWatermarkUnlockAnswer?.(fieldEditing.readWatermarkUnlockAnswer)

  // WHY: focusPropertyField travels on the wiring: the IF-9 cell of table T-065 names exactly these.
  return {
    showScreenView,
    readDialogueInput: dialogue.readDialogueInput,
    readFieldCommit: fieldEditing.readFieldCommit,
    readScreenPartAt,
    hasUnsettledTextEntry: fieldEditing.hasUnsettledTextEntry,
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

// see SE-5, DC-3
/** @purity non-pure */
function showUnpressableWords(
  host: Document,
  scaleMessageLayer: HTMLElement,
  readoutLayer: HTMLElement,
  view: ScreenView,
): void {
  showScaleMessage(host, scaleMessageLayer, view.scaleMessage)
  showDualCursorReadout(host, readoutLayer, view.dualCursorReadout)
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
} = {
  'S-201': 0.95,
  'S-202': 3,
  'S-203': 0.80,
  'S-204': 0.875,
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
} = {
  'S-225': 16,
  'S-226': 12,
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
const SCREEN_COLOURS: {
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
}
// </generated>
