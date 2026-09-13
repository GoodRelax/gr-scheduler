// DomScreenSurface -- public entry of this folder.
// @unit      UF-71   (docs/spec/05-07-design.md, table T-075)
// @component DomScreenSurface, layer Framework (table T-062)
// @purity    non-pure
// @publishes table T-064 row PI-38

import type {
  AppHeaderItems,
  CommandItem,
  CommandPalette,
  Confirmation,
  DialogueField,
  DialogueInput,
  DisplayLanguage,
  FieldCommit,
  Notice,
  OpenModal,
  PropertiesPanel,
  PropertyControl,
  PropertyControlKind,
  PropertyField,
  PropertyFieldKey,
  RowTitle,
  RowTitlePanel,
  ScreenFrame,
  ScreenPart,
  ScreenSurface,
  ScreenView,
  Tooltip,
  TooltipAnchor,
} from '../../adapter/screen-renderer/screen-renderer'
import type { ScreenRect } from '../../entity/layout-engine/screen-regions/screen-regions'
import iconGlyphs from '../../adapter/screen-renderer/icon-glyphs.json'

const UNIT_ROW = 'UF-71'

const ROLE = {
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

// STOP: spec does not decide the key that settles an utterance. Looked in SK-19, T-036
// @provisional PND-150
const HOST_ENTER = 'Enter'

const DISPLAY_LANGUAGE_ENTRY = 'IC-21'

const PALETTE_GRAB_BAND_ENTRY = 'IC-53'

const ROSTER_CHOSEN_ENTRY = 'IC-67'
const ROSTER_UNCHOSEN_ENTRY = 'IC-68'

const OPEN_EVERY_ROW_ENTRY = 'IC-74'

const COLLAPSE_EVERY_ROW_ENTRY = 'IC-78'

const OPEN_LEVEL_ZERO_ENTRY = 'IC-92'

const ADD_TOP_ROW_ENTRY = 'IC-93'

// STOP: spec does not decide whether HF-6 hides the deletion control at rest.
// Looked in HF-6, T-103, S-140. @provisional PND-353
const DELETE_ROW_ENTRY = 'IC-82'

const ADD_CHILD_ROW_ENTRY = 'IC-91'

const OPEN_ONE_LEVEL_ENTRY = 'IC-90'

const NOTICE_DISMISS_KEY_ATTRIBUTE = 'data-notice'

const CONFIRMATION_ANSWER_ATTRIBUTE = 'data-confirmation-answer'

const WATERMARK_UNLOCK_ENTRY_ATTRIBUTE = 'data-watermark-unlock'

const IMPORT_REPORT_DISMISS_ATTRIBUTE = 'data-import-report-dismiss'

// WHY: members that share a row stay apart; each follows its own rule and may be recoloured alone.
const PAINT_ROW = {
  ground: 'S-146',
  ink: 'S-147',
  quiet: 'S-148',
  rule: 'S-149',
  panel: 'S-150',
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

const PAINT = {
  ground: painted('ground'),
  ink: painted('ink'),
  quiet: painted('quiet'),
  rule: painted('rule'),
  panel: painted('panel'),
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
function stateGround(paint: string, depthRow: 'S-214' | 'S-215'): string {
  // WHY: color-mix, not opacity, which would fade the row's name and controls with the ground.
  return `color-mix(in srgb, ${paint} ${NOT_STORED_STATE_GROUND_PERCENTS[depthRow]}%, transparent)`
}

// see FR-029
/** @purity pure */
function entryGlyphRoom(): string {
  const side = NOT_STORED_ICON_SIZES['S-138']
  const gap = NOT_STORED_ICON_SIZES['S-141']
  return (
    'display:inline-flex;align-items:center;justify-content:center;' +
    `padding:0 ${gap}px;` +
    `min-height:calc(${side}px + ${gap}px * 2);`
  )
}

// see FR-006
/** @purity pure */
function fieldSizes(): {
  readonly controlMinHeight: number
  readonly colorMinHeight: number
  readonly namePercent: number
  readonly nameGap: number
  readonly rowGap: number
  readonly panelPadY: number
  readonly panelPadX: number
  readonly multilineRows: number
  readonly textScale: number
  readonly nameTextScale: number
} {
  const [panelPadY, panelPadX] = NOT_STORED_PROPERTY_FIELD_SIZES['S-192']
  return {
    controlMinHeight: NOT_STORED_PROPERTY_FIELD_SIZES['S-186'],
    colorMinHeight: NOT_STORED_PROPERTY_FIELD_SIZES['S-187'],
    namePercent: NOT_STORED_PROPERTY_FIELD_SIZES['S-189'],
    nameGap: NOT_STORED_PROPERTY_FIELD_SIZES['S-190'],
    rowGap: NOT_STORED_PROPERTY_FIELD_SIZES['S-191'],
    panelPadY,
    panelPadX,
    multilineRows: NOT_STORED_PROPERTY_FIELD_SIZES['S-193'],
    textScale: NOT_STORED_PROPERTY_FIELD_SIZES['S-197'],
    nameTextScale: NOT_STORED_PROPERTY_FIELD_SIZES['S-198'],
  }
}

/** @purity pure */
function propertiesPanelStyle(): string {
  const size = fieldSizes()
  return (
    `${STYLE.propertiesPanel}padding:${size.panelPadY}px ${size.panelPadX}px;` +
    `font-size:${size.textScale}em;`
  )
}

// see FR-072
/** @purity pure */
function propertyWayOutStyle(): string {
  return (
    'display:flex;align-items:flex-start;justify-content:flex-end;' +
    `gap:${fieldSizes().nameGap}px;margin-left:auto;`
  )
}

/** @purity pure */
function propertyFieldStyle(): string {
  const size = fieldSizes()
  return (
    `display:flex;align-items:flex-start;gap:${size.nameGap}px;` +
    `margin-bottom:${size.rowGap}px;line-height:1.6;`
  )
}

/** @purity pure */
function propertyFieldNameStyle(): string {
  const size = fieldSizes()
  return (
    `color:${PAINT.quiet};flex:0 0 ${size.namePercent}%;` +
    `text-align:right;font-size:${size.nameTextScale}em;`
  )
}

// see EZ-2
/** @purity pure */
function tooltipStyle(): string {
  return `${STYLE.tooltip}font-size:${NOT_STORED_HELP_SIZES['S-204']}em;`
}

// see FR-036
function helpColumnsStyle(): string {
  return `column-count:${NOT_STORED_HELP_SIZES['S-202']};column-gap:1.5em;`
}

// see FR-036
function helpStyle(): string {
  const share = NOT_STORED_HELP_SIZES['S-201'] * 100
  return (
    `width:${share}vw;max-width:${share}vw;` +
    `height:${share}vh;max-height:${share}vh;overflow:auto;` +
    `font-size:${NOT_STORED_HELP_SIZES['S-203']}em;`
  )
}

function propertyControlsStyle(): string {
  return `flex:1;display:flex;flex-wrap:wrap;align-items:flex-start;gap:${fieldSizes().nameGap}px;min-width:0;`
}

/** @purity pure */
function propertyControlStyle(widthInFontSizes: number): string {
  return (
    `font:inherit;box-sizing:border-box;flex:1;min-width:${widthInFontSizes}em;` +
    `min-height:${fieldSizes().controlMinHeight}px;` +
    `background:${PAINT.ground};color:${PAINT.ink};border:1px solid ${PAINT.rule};`
  )
}

/** @purity pure */
function propertyColorStyle(): string {
  return (
    'font:inherit;box-sizing:border-box;flex:1;min-width:0;padding:0;' +
    `min-height:${fieldSizes().colorMinHeight}px;` +
    `background:${PAINT.ground};border:1px solid ${PAINT.rule};`
  )
}

/** @purity pure */
function propertyCheckStyle(): string {
  return 'font:inherit;'
}

/** @purity pure */
function entryStyle(): string {
  return (
    `font:inherit;background:${PAINT.panel};color:${PAINT.ink};` +
    `border:1px solid ${PAINT.rule};border-radius:0.25em;cursor:pointer;` +
    entryGlyphRoom()
  )
}

/** @purity pure */
function entryFaintStyle(): string {
  return (
    `font:inherit;background:${PAINT.panel};color:${PAINT.rule};` +
    `border:1px solid ${PAINT.rule};border-radius:0.25em;cursor:default;` +
    entryGlyphRoom()
  )
}

const ENTRANCE_STATE_FILL = [
  ['EN-1', PAINT.armed],
  ['EN-2', PAINT.pressed],
  ['EN-3', PAINT.pinned],
  ['EN-4', PAINT.pressed],
] as const

type EntranceStateRow = (typeof ENTRANCE_STATE_FILL)[number][0]

// see FR-029, T-237
/** @purity pure */
function entranceStateFill(standing: readonly EntranceStateRow[]): string {
  for (const [rowId, colour] of ENTRANCE_STATE_FILL) {
    if (standing.includes(rowId)) return `background:${colour};color:${PAINT.ground};`
  }
  return ''
}

// see FR-053
/** @purity pure */
function paletteGroupRuleStyle(): string {
  const [thickness, clearance] = NOT_STORED_PALETTE_GROUP_RULE_SIZES['S-143']
  return (
    `height:${thickness}px;margin:${clearance}px;` +
    `background:${PAINT.rule};pointer-events:none;`
  )
}

// see EP-1
/** @purity pure */
function appHeaderStyle(): string {
  const inset = NOT_STORED_DOCUMENT_TITLE_SIZES['S-226']
  return `${STYLE.appHeader}padding-left:${inset}px;`
}

// see EP-1
/** @purity pure */
function documentTitleStyle(): string {
  const size = NOT_STORED_DOCUMENT_TITLE_SIZES['S-225']
  return `${STYLE.documentTitle}font-size:${size}px;`
}

// STOP: spec does not decide a measured value for S-210. Looked in FR-101, S-210
// @provisional PND-326
const FILE_STATUS_TEXT_SCALE = 0.75

// STOP: spec does not decide where a surface that stops the reading stands. Looked in IN-4, NT-7
// @provisional PND-151
const STOPPING_BOX =
  'position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);' +
  'box-sizing:border-box;max-width:92%;max-height:92%;overflow:auto;padding:1em;' +
  `background:${PAINT.ground};color:${PAINT.ink};border:1px solid ${PAINT.rule};` +
  `box-shadow:0 0.5em 1.5em ${PAINT.shadow};pointer-events:auto;`

// STOP: spec does not decide how parts without a rectangle are placed. Looked in IF-9, T-103
// @provisional PND-151
const STYLE = {
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
  documentTitle: 'font-weight:600;overflow:hidden;text-overflow:ellipsis;',
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
    'font-family:monospace;font-size:0.8em;line-height:1;pointer-events:none;',
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
  rowLabel: 'flex:1;overflow:hidden;text-overflow:ellipsis;',
  // TRAP: in the flex flow each control would take room from the name, so the browser's
  // ellipsis cuts it while isLabelTruncated stays false and no tooltip is raised (FR-085).
  // TRAP: a `top` here moves the controls off the top of the name (HF-5).
  rowControl:
    `position:absolute;font:inherit;background:transparent;color:${PAINT.ink};` +
    'border:none;cursor:pointer;pointer-events:auto;',
  rowControlFaintInk: `color:${PAINT.rule};cursor:default;`,
  propertiesPanel:
    'position:absolute;box-sizing:border-box;overflow-y:auto;' +
    `background:${PAINT.panel};color:${PAINT.ink};border-left:1px solid ${PAINT.rule};` +
    'pointer-events:auto;',
  heading: 'font-weight:600;margin:0 0 0.5em 0;',
  field: 'display:flex;gap:0.5em;line-height:1.6;',
  fieldName: `color:${PAINT.quiet};min-width:9em;`,
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
  confirmation: STOPPING_BOX + 'display:flex;flex-direction:column;',
  // TRAP: without `min-height:0` the names grow the box instead of scrolling and push the answers out.
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
  const side = NOT_STORED_ICON_SIZES['S-138']
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
  // TRAP: only the first `H` is replaced; a T-236 cell holding a second capital H is written wrong.
  return followsHue ? written.replace('H', String(hue)) : written
}

// see FR-041
/** @purity pure */
function themeStyle(theme: ScreenTheme): string {
  let written = `color-scheme:${theme.preference};`
  for (const [name, rowId] of Object.entries(PAINT_ROW)) {
    const row = SCREEN_COLOURS[rowId]
    if (row === undefined) continue
    const chosen = theme.preference === 'dark' ? row.dark : row.light
    written += `--gr-${name}:${hued(chosen, row.followsHue, theme.hue)};`
  }
  return written
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

const ROW_CONTROL_GROUND_MARK = 'data-row-control-ground'

const ROW_FOLDING_GRID_MARK = 'data-row-folding-grid'

const ROW_CONTROL_PAIR_MARK = 'data-row-control-pair'

const ROW_CONTROLS_LULL_MS = 1000

const ROW_GRAB_STRIP_MARK = 'data-row-grab'

const SCROLLBAR_AXIS_ATTRIBUTE = 'data-axis'

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
function boxStyle(box: ScreenRect): string {
  return (
    `position:absolute;left:${box.x}px;top:${box.y}px;` +
    `width:${box.width}px;height:${box.height}px;`
  )
}

/** @purity pure */
function cornerStyle(at: { readonly x: number; readonly y: number }): string {
  return `position:absolute;left:${at.x}px;top:${at.y}px;`
}

/** @purity pure */
function boxStyleWithin(box: ScreenRect, container: ScreenRect): string {
  return boxStyle({
    x: box.x - container.x,
    y: box.y - container.y,
    width: box.width,
    height: box.height,
  })
}

/** @purity pure */
function anchorKey(anchor: TooltipAnchor): string {
  if (anchor.kind === 'icon') return `icon ${anchor.icon}`
  if (anchor.kind === 'task') return `task ${anchor.taskUid}`
  if (anchor.kind === 'rowTitle') return `rowTitle ${anchor.groupId}`
  return `scrollbar ${anchor.axis}`
}

/** @purity pure */
function described(part: unknown): string {
  return JSON.stringify(part) ?? ''
}

// see AT-129
/** @purity pure */
function stampOf(atMs: number): string {
  return `${new Date(atMs).toISOString().slice(0, 19)}Z`
}

/** @purity pure */
function panelEdge(
  frame: ScreenFrame,
  panel: 'rowTitlePanel' | 'propertiesPanel',
): ScreenRect | null {
  const divider = frame.dividers.find((one) => one.panel === panel)
  return divider === undefined ? null : divider.line
}

// see FR-101
// STOP: spec does not decide how a local stamp spells its zone offset. Looked in FR-101, AT-129
// @provisional PND-325
/** @purity semi-pure-b */
function readableStamp(utc: string): string {
  const foundAt = new Date(utc)
  if (Number.isNaN(foundAt.getTime())) return utc
  const padded = (part: number, width: number): string => String(part).padStart(width, '0')
  const year = padded(foundAt.getFullYear(), 4)
  const month = padded(foundAt.getMonth() + 1, 2)
  const day = padded(foundAt.getDate(), 2)
  const hour = padded(foundAt.getHours(), 2)
  const minute = padded(foundAt.getMinutes(), 2)
  const second = padded(foundAt.getSeconds(), 2)
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`
}


/** @purity non-pure */
function made(host: Document, tag: string, style: string): HTMLElement {
  const node = host.createElement(tag)
  node.setAttribute('style', style)
  return node
}

/** @purity non-pure */
function part(host: Document, tag: string, role: string, style: string): HTMLElement {
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
function fillEntry(
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
function commandEntry(host: Document, item: CommandItem): HTMLElement {
  const base = item.isEnabled ? entryStyle() : entryFaintStyle()
  const standing: EntranceStateRow[] = []
  if (item.isEnabled && item.isArmed) standing.push('EN-1')
  if (item.isEnabled && item.isPressed) standing.push('EN-2')
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

// see FR-038, IC-21
/** @purity non-pure */
function drawLanguageReading(host: Document, entry: HTMLElement, language: DisplayLanguage): void {
  entry.setAttribute('data-language', language)
  const code = made(host, 'span', STYLE.languageCode)
  code.textContent = language
  entry.append(code)
}

// see U-31, FR-101
/** @purity non-pure */
function fillAppHeader(
  host: Document,
  header: HTMLElement,
  items: AppHeaderItems,
  anchors: Map<string, HTMLElement>,
): HTMLElement {
  const title = part(host, 'span', ROLE.documentTitle, documentTitleStyle())
  title.textContent = items.documentTitle

  const fileStatus = part(host, 'span', ROLE.fileStatus, STYLE.fileStatus)
  const fileName = part(host, 'span', ROLE.openedFileName, STYLE.openedFileName)
  fileName.textContent = items.openedFileName
  fileStatus.append(fileName)
  const savedAt = part(host, 'span', ROLE.fileSavedAt, STYLE.fileSavedAt)
  savedAt.textContent =
    items.fileSavedAt === null
      ? items.fileNeverSavedText
      : readableStamp(items.fileSavedAt)
  fileStatus.append(savedAt)

  const commands = part(host, 'span', ROLE.headerCommands, STYLE.headerCommands)
  for (const item of items.commands) {
    const entry = commandEntry(host, item)
    // TRAP: after commandEntry, never before: fillEntry replaces the body and drops the code.
    if (item.icon === DISPLAY_LANGUAGE_ENTRY) {
      drawLanguageReading(host, entry, items.language)
    }
    anchors.set(anchorKey({ kind: 'icon', icon: item.icon }), entry)
    commands.append(entry)
  }

  header.replaceChildren(title, fileStatus, commands)
  return title
}

// see U-21, U-24, SC-4
/** @purity non-pure */
function fillScreenFrame(
  host: Document,
  layer: HTMLElement,
  frame: ScreenFrame,
  anchors: Map<string, HTMLElement>,
): void {
  const drawn: HTMLElement[] = []
  for (const divider of frame.dividers) {
    const band = part(host, 'div', ROLE.panelDivider, boxStyle(divider.band) + STYLE.dividerBand)
    band.setAttribute('data-panel', divider.panel)
    drawn.push(band)
    drawn.push(made(host, 'div', boxStyle(divider.line) + STYLE.dividerLine))
  }
  for (const bar of frame.scrollbars) {
    const track = part(host, 'div', ROLE.scrollbars, boxStyle(bar.track) + STYLE.scrollbarTrack)
    track.setAttribute(SCROLLBAR_AXIS_ATTRIBUTE, bar.axis)
    // TRAP: the thumb stays inside the track: readScreenPartAt reads data-axis off ancestors.
    track.append(
      made(host, 'div', boxStyleWithin(bar.thumb, bar.track) + STYLE.scrollbarThumb),
    )
    anchors.set(anchorKey({ kind: 'scrollbar', axis: bar.axis }), track)
    drawn.push(track)
  }
  layer.replaceChildren(...drawn)
}

// STOP: spec does not decide the spacing of row controls from the right edge.
// Looked in HF-4, T-051, T-206. @provisional PND-348
/** @purity pure */
function rowControlStepPx(): number {
  return rowControlBoxPx()
}

// STOP: spec does not decide the inset of the nearest row control from the right edge.
// Looked in HF-4, T-051, T-206. @provisional PND-348
const ROW_CONTROL_EDGE_PX = 4

/** @purity pure */
function rowControlRight(stepsFromEdge: number): string {
  return `right:${rowControlRightPx(stepsFromEdge)}px;`
}

/** @purity pure */
function rowControlRightPx(stepsFromEdge: number): number {
  return ROW_CONTROL_EDGE_PX + rowControlStepPx() * stepsFromEdge
}

const ROW_CONTROL_STEPS = {
  pair: 1,
  pin: 0,
  foldingGrid: 2,
} as const

const ROW_FOLDING_CELLS = {
  close: { column: 1, row: 1 },
  closeBelow: { column: 2, row: 1 },
  openOneLevel: { column: 1, row: 2 },
  open: { column: 2, row: 2 },
} as const

const ROW_CONTROL_PAIR_CELLS = {
  remove: { column: 1, row: 1 },
  addChild: { column: 1, row: 2 },
} as const

const ROW_CONTROL_LEFTMOST_STEP = ROW_CONTROL_STEPS.foldingGrid + 1

// see HF-6
/** @purity pure */
function rowControlGroundStyle(leftmostStepsFromEdge: number): string {
  const reach = rowControlRightPx(leftmostStepsFromEdge)
  return (
    'position:absolute;top:0;bottom:0;right:0;' +
    `width:${reach + rowControlBoxPx()}px;` +
    `background:${PAINT.panel};pointer-events:none;`
  )
}

/** @purity pure */
function rowControlBoxPx(): number {
  return NOT_STORED_ICON_SIZES['S-138'] + NOT_STORED_ICON_SIZES['S-141'] * 2
}

/** @purity pure */
function rowControlWidthCss(): string {
  return `${rowControlBoxPx()}px`
}

// see HF-5
/** @purity pure */
function rowControlBoxStyle(): string {
  return `display:inline-flex;padding:0 ${NOT_STORED_ICON_SIZES['S-141']}px;`
}

/** @purity pure */
function rowControlGlyphGapStyle(): string {
  return `margin:${NOT_STORED_ICON_SIZES['S-141']}px 0;`
}

// see HF-1, HF-4
/** @purity pure */
function rowControlGridStyle(columns: number, stepsFromEdge: number): string {
  const track = rowControlWidthCss()
  const columnTracks = Array.from({ length: columns }, () => track).join(' ')
  return (
    'position:absolute;display:grid;align-items:flex-start;' +
    `grid-template-columns:${columnTracks};` +
    `grid-template-rows:${track} ${track};` +
    `right:${rowControlRightPx(stepsFromEdge)}px;` +
    'pointer-events:none;'
  )
}

/** @purity pure */
function rowControlCellStyle(cell: { readonly column: number; readonly row: number }): string {
  return `position:static;grid-column:${cell.column};grid-row:${cell.row};`
}

const FOLDED_ROW_COUNT_MARK = 'data-folded-rows'

/** @purity pure */
function rowBandPx(): number {
  return NOT_STORED_ROW_BAND_SIZES['S-213']
}

// see HF-15
/** @purity pure */
function rowGrabbedStyle(axis: 'position' | 'depth'): string {
  const paint = axis === 'position' ? PAINT.grabAxisPosition : PAINT.grabAxisDepth
  const band = `${rowBandPx()}px solid ${paint}`
  return (
    `background:${stateGround(PAINT.heldRow, 'S-215')};` +
    (axis === 'position'
      ? `border-left:${band};border-right:${band};`
      : `border-top:${band};border-bottom:${band};`)
  )
}

// see HF-18
/** @purity pure */
function foldedRowCountStyle(rightPx: string): string {
  const side = NOT_STORED_ICON_SIZES['S-138']
  return (
    'position:absolute;top:0;pointer-events:none;' +
    rightPx +
    `min-width:${side}px;height:${side}px;line-height:${side}px;` +
    'text-align:center;font-size:0.75em;white-space:nowrap;' +
    `color:${PAINT.caution};`
  )
}

const FOLD_COUNT_MARK = '\u25be\u0020'

// see HF-12
/** @purity non-pure */
function markFoldedRowCount(mark: HTMLElement, count: number, rightPx: string): void {
  mark.setAttribute(FOLDED_ROW_COUNT_MARK, String(count))
  mark.textContent = FOLD_COUNT_MARK + String(count)
  mark.setAttribute('style', count > 0 ? foldedRowCountStyle(rightPx) : STYLE.hidden)
}

/** @purity non-pure */
function foldedRowCountElement(host: Document, count: number, rightPx: string): HTMLElement {
  const mark = made(host, 'span', foldedRowCountStyle(rightPx))
  mark.setAttribute(FOLDED_ROW_COUNT_MARK, String(count))
  mark.setAttribute('aria-hidden', 'true')
  mark.textContent = FOLD_COUNT_MARK + String(count)
  return mark
}

// see GR-20, HF-15
/** @purity pure */
function rowGrabStripStyle(isHeld: boolean): string {
  const width = NOT_STORED_ICON_SIZES['S-138']
  return (
    `flex:none;width:${width}px;cursor:${isHeld ? 'grabbing' : 'grab'};pointer-events:auto;` +
    'text-align:center;' +
    `color:${isHeld ? PAINT.heldRow : PAINT.rule};font-size:0.75em;user-select:none;`
  )
}

// see FR-029, HF-5, T-109
/** @purity non-pure */
function rowControlElement(
  host: Document,
  role: string | null,
  icon: string,
  canAct: boolean,
): HTMLElement {
  const style =
    (canAct ? STYLE.rowControl : STYLE.rowControl + STYLE.rowControlFaintInk) +
    rowControlBoxStyle()
  const control = role === null ? made(host, 'button', style) : part(host, 'button', role, style)
  control.setAttribute('type', 'button')
  control.setAttribute('data-icon', icon)
  control.setAttribute('aria-label', icon)
  if (!canAct) control.setAttribute('aria-disabled', 'true')
  fillEntry(host, control, icon, rowControlGlyphGapStyle())
  return control
}

// see FR-098, GR-20, HF-4, HF-15, HF-18
/** @purity non-pure */
function rowTitleElement(host: Document, title: RowTitle, isPinned: boolean): HTMLElement {
  const row = made(
    host,
    'div',
    // TRAP: the indent is the only inset; other padding lets the browser cut the name
    // silently, since isLabelTruncated records only FR-085's cut.
    boxStyle(title.box) +
      STYLE.rowTitle +
      `gap:${NOT_STORED_ROW_GRAB_STRIP_SIZES['S-218']}px;` +
      `padding:0 0 0 ${title.indentPx}px;` +
      // TRAP: title.isPinned, not the isPinned argument, which only says which list is built.
      (title.isPinned ? `background:${stateGround(PAINT.pinnedRow, 'S-214')};` : '') +
      (title.heldOnAxis == null ? '' : rowGrabbedStyle(title.heldOnAxis)),
  )
  if (title.heldOnAxis != null) row.setAttribute('data-held-axis', title.heldOnAxis)
  if (isPinned) row.setAttribute('data-role', ROLE.pinnedRow)
  row.setAttribute('data-group-id', title.groupId)
  row.setAttribute('data-depth', String(title.depth))
  row.setAttribute('data-pinned', String(title.isPinned))
  row.setAttribute('data-selected', String(title.isSelected))
  row.setAttribute('data-truncated', String(title.isLabelTruncated))
  if (title.isSelected) row.setAttribute('aria-selected', 'true')

  if (!title.isPinned) {
    const grab = made(host, 'div', rowGrabStripStyle(title.heldOnAxis != null))
    grab.setAttribute(ROW_GRAB_STRIP_MARK, 'true')
    grab.textContent = '⋮⋮'
    grab.setAttribute('aria-hidden', 'true')
    row.append(grab)
  }

  const label = made(host, 'span', STYLE.rowLabel)
  label.textContent = title.label

  // TRAP: append the ground before every control: with no z-index, paint order is tree order.
  const ground = made(
    host,
    'div',
    rowControlGroundStyle(ROW_CONTROL_LEFTMOST_STEP),
  )
  ground.setAttribute(ROW_CONTROL_GROUND_MARK, 'true')
  ground.setAttribute('aria-hidden', 'true')
  row.append(ground)
  row.append(label)

  const foldingGrid = made(host, 'div', rowControlGridStyle(2, ROW_CONTROL_STEPS.foldingGrid))
  foldingGrid.setAttribute(ROW_FOLDING_GRID_MARK, 'true')
  row.append(foldingGrid)

  if (title.expander !== null) {
    const open = rowControlElement(host, ROLE.rowExpander, 'IC-58', title.expander.canOpen)
    open.setAttribute('data-can-open', String(title.expander.canOpen))
    open.setAttribute(
      'style',
      open.getAttribute('style') + rowControlCellStyle(ROW_FOLDING_CELLS.open),
    )
    foldingGrid.append(open)

    const close = rowControlElement(host, ROLE.rowExpander, 'IC-59', title.expander.canClose)
    close.setAttribute('data-can-close', String(title.expander.canClose))
    close.setAttribute(
      'style',
      close.getAttribute('style') + rowControlCellStyle(ROW_FOLDING_CELLS.close),
    )
    foldingGrid.append(close)

    const closeBelow = rowControlElement(
      host,
      ROLE.rowExpander,
      'IC-77',
      title.expander.canCloseBelow,
    )
    closeBelow.setAttribute('data-can-close-below', String(title.expander.canCloseBelow))
    closeBelow.setAttribute(
      'style',
      closeBelow.getAttribute('style') + rowControlCellStyle(ROW_FOLDING_CELLS.closeBelow),
    )
    foldingGrid.append(closeBelow)
  }

  // TRAP: outside the expander block: expander is null on a leaf, where HF-13 still draws IC-90.
  const openOneLevel = rowControlElement(
    host,
    ROLE.rowExpander,
    OPEN_ONE_LEVEL_ENTRY,
    title.canOpenOneLevel ?? true,
  )
  openOneLevel.setAttribute('data-can-open-one-level', String(title.canOpenOneLevel ?? true))
  openOneLevel.setAttribute(
    'style',
    openOneLevel.getAttribute('style') + rowControlCellStyle(ROW_FOLDING_CELLS.openOneLevel),
  )
  foldingGrid.append(openOneLevel)

  const controlPair = made(host, 'div', rowControlGridStyle(1, ROW_CONTROL_STEPS.pair))
  controlPair.setAttribute(ROW_CONTROL_PAIR_MARK, 'true')
  row.append(controlPair)

  const remove = rowControlElement(host, null, DELETE_ROW_ENTRY, true)
  remove.setAttribute(
    'style',
    remove.getAttribute('style') + rowControlCellStyle(ROW_CONTROL_PAIR_CELLS.remove),
  )
  controlPair.append(remove)

  const addChild = rowControlElement(
    host,
    null,
    ADD_CHILD_ROW_ENTRY,
    title.canAddChildRow ?? true,
  )
  addChild.setAttribute('data-can-add-child-row', String(title.canAddChildRow ?? true))
  addChild.setAttribute(
    'style',
    addChild.getAttribute('style') + rowControlCellStyle(ROW_CONTROL_PAIR_CELLS.addChild),
  )
  controlPair.append(addChild)

  const pin = rowControlElement(host, ROLE.rowPin, 'IC-60', true)
  pin.setAttribute('data-pinned', String(title.isPinned))
  pin.setAttribute('aria-pressed', String(title.isPinned))
  pin.setAttribute(
    'style',
    pin.getAttribute('style') +
      rowControlRight(ROW_CONTROL_STEPS.pin) +
      entranceStateFill(title.isPinned ? ['EN-3'] : []) +
      (title.isPinned ? 'visibility:visible;' : ''),
  )
  row.append(pin)

  const foldedRows = title.foldedRowCount ?? 0
  if (foldedRows > 0) {
    row.append(
      foldedRowCountElement(
        host,
        foldedRows,
        rowControlRight(ROW_CONTROL_STEPS.pin),
      ),
    )
    row.setAttribute(
      'style',
      (row.getAttribute('style') ?? '') +
        `box-shadow:inset ${rowBandPx()}px 0 0 0 ${PAINT.caution};`,
    )
  }
  return row
}

// see HF-10
/** @purity non-pure */
function openEveryRowElement(host: Document): HTMLElement {
  return panelCornerEntryElement(host, OPEN_EVERY_ROW_ENTRY, 1)
}

/** @purity non-pure */
function panelCornerEntryElement(host: Document, icon: string, stepsFromEdge: number): HTMLElement {
  const entry = made(host, 'button', panelCornerEntryStyle(stepsFromEdge, true))
  entry.setAttribute('type', 'button')
  entry.setAttribute('data-icon', icon)
  entry.setAttribute('aria-label', icon)
  fillEntry(host, entry, icon)
  return entry
}

/** @purity pure */
function panelCornerEntryStyle(stepsFromEdge: number, canAct: boolean): string {
  return (
    (canAct ? entryStyle() : entryFaintStyle()) +
    STYLE.panelCornerEntry +
    `right:${panelCornerStepPx() * stepsFromEdge}px;`
  )
}

/** @purity pure */
function panelCornerStepPx(): number {
  const side = NOT_STORED_ICON_SIZES['S-138']
  const gap = NOT_STORED_ICON_SIZES['S-141']
  return side + gap * 2 + PANEL_CORNER_BORDER_PX * 2
}

/** @purity pure */
function headFoldedRowCountRight(): string {
  return `right:${panelCornerStepPx() * 4}px;`
}

// TRAP: must equal the border entryStyle draws on each side; change both together.
const PANEL_CORNER_BORDER_PX = 1

/** @purity non-pure */
function markPanelCornerEntry(
  entry: HTMLElement,
  stepsFromEdge: number,
  canAct: boolean | undefined,
): void {
  const usable = canAct !== false
  entry.setAttribute('style', panelCornerEntryStyle(stepsFromEdge, usable))
  entry.setAttribute('data-enabled', String(usable))
  if (usable) entry.removeAttribute('aria-disabled')
  else entry.setAttribute('aria-disabled', 'true')
}

// see HF-12
/** @purity non-pure */
function collapseEveryRowElement(host: Document): HTMLElement {
  return panelCornerEntryElement(host, COLLAPSE_EVERY_ROW_ENTRY, 2)
}

// see HF-16
/** @purity non-pure */
function openLevelZeroElement(host: Document): HTMLElement {
  return panelCornerEntryElement(host, OPEN_LEVEL_ZERO_ENTRY, 3)
}

// see HF-17
/** @purity non-pure */
function addTopRowElement(host: Document): HTMLElement {
  return panelCornerEntryElement(host, ADD_TOP_ROW_ENTRY, 0)
}

// WHY: inferred from row tops: ScreenFrame carries no corner rectangle and no ruler height.
/** @purity pure */
function rowsTopPx(panel: RowTitlePanel): number | null {
  let top: number | null = null
  for (const title of panel.pinnedTitles) {
    if (top === null || title.box.y < top) top = title.box.y
  }
  for (const title of panel.titles) {
    if (top === null || title.box.y < top) top = title.box.y
  }
  return top
}

// see U-22, FR-098
/** @purity non-pure */
function fillRowTitleTree(
  host: Document,
  tree: HTMLElement,
  panel: RowTitlePanel,
  anchors: Map<string, HTMLElement>,
): void {
  const drawn: HTMLElement[] = []
  for (const title of panel.pinnedTitles) {
    const row = rowTitleElement(host, title, true)
    anchors.set(anchorKey({ kind: 'rowTitle', groupId: title.groupId }), row)
    drawn.push(row)
  }
  for (const title of panel.titles) {
    const row = rowTitleElement(host, title, false)
    anchors.set(anchorKey({ kind: 'rowTitle', groupId: title.groupId }), row)
    drawn.push(row)
  }
  tree.replaceChildren(...drawn)
}

// WHY: not an attribute: a key spelled into one must be parsed back, and a separator breaks that.
const CONTROL_KEYS = new WeakMap<Element, { row: string; key: PropertyFieldKey }>()

const CONTROL_TAG: Readonly<Record<PropertyControlKind, string>> = {
  text: 'input',
  multiline: 'textarea',
  date: 'input',
  number: 'input',
  boolean: 'input',
  choice: 'select',
  color: 'input',
}

const CONTROL_INPUT_TYPE: Readonly<Record<PropertyControlKind, string | null>> = {
  text: 'text',
  multiline: null,
  date: 'date',
  number: 'number',
  boolean: 'checkbox',
  choice: null,
  color: 'color',
}

// TRAP: must match how textOfValue (properties-panel.ts) writes a boolean; change both.
const TRUE_TEXT = String(true)

const HOST_ESCAPE_KEY = 'Escape'

const HOST_KEY_RELEASE = 'keyup'

const IS_KIND_TYPED_INTO: Readonly<Record<PropertyControlKind, boolean>> = {
  text: true,
  multiline: true,
  date: true,
  number: true,
  boolean: false,
  choice: false,
  color: false,
}

interface TextEntryControl {
  value: string
  blur?: () => void
  focus?: () => void
  select?: () => void
}

const TYPED_CONTROLS = new WeakSet<object>()

/** @purity pure */
function textEntryControlOf(target: unknown): TextEntryControl | null {
  if (target === null || typeof target !== 'object') return null
  if (!TYPED_CONTROLS.has(target)) return null
  const drawn = target as Partial<TextEntryControl>
  return typeof drawn.value === 'string' ? (target as TextEntryControl) : null
}

// see T-016, FR-031
// STOP: spec does not decide whether a field commits per keystroke or on change.
// Looked in T-016, FR-006, FR-031. @provisional PND-270
/** @purity non-pure */
function controlElement(
  host: Document,
  row: string,
  control: PropertyControl,
  typedByRow: Map<string, TextEntryControl> | null,
): HTMLElement {
  const tag = CONTROL_TAG[control.kind]
  const drawn = host.createElement(tag)
  const style =
    control.kind === 'color'
      ? propertyColorStyle()
      : control.kind === 'boolean'
        ? propertyCheckStyle()
        : propertyControlStyle(control.widthInFontSizes)
  drawn.setAttribute('style', style)
  drawn.setAttribute('data-field-row', row)
  drawn.setAttribute('data-field-kind', control.kind)

  const inputType = CONTROL_INPUT_TYPE[control.kind]
  if (inputType !== null) drawn.setAttribute('type', inputType)

  if (control.kind === 'choice') {
    const values = control.choiceValues ?? null
    const choices = control.choices ?? []
    for (let index = 0; index < choices.length; index += 1) {
      const choice = choices[index] ?? ''
      const option = host.createElement('option')
      option.setAttribute('value', values?.[index] ?? choice)
      option.textContent = choice
      drawn.append(option)
    }
    ;(drawn as HTMLSelectElement).value = control.text
  } else if (control.kind === 'boolean') {
    ;(drawn as HTMLInputElement).checked = control.text === TRUE_TEXT
  } else {
    if (control.kind === 'multiline') {
      drawn.setAttribute('rows', String(fieldSizes().multilineRows))
    }
    if (control.kind === 'number') {
      if (control.min !== null) drawn.setAttribute('min', String(control.min))
      if (control.max !== null) drawn.setAttribute('max', String(control.max))
    }
    ;(drawn as HTMLInputElement).value = control.text
  }

  CONTROL_KEYS.set(drawn, { row, key: control.key })
  if (IS_KIND_TYPED_INTO[control.kind]) {
    TYPED_CONTROLS.add(drawn)
    if (typedByRow !== null && !typedByRow.has(row)) {
      typedByRow.set(row, drawn as unknown as TextEntryControl)
    }
  }
  return drawn as HTMLElement
}

function rosterId(row: string): string {
  return `grs-roster-${row}`
}

// see AS-5
/** @purity non-pure */
function searchElements(
  host: Document,
  row: string,
  control: PropertyControl,
  words: readonly string[],
  typedByRow: Map<string, TextEntryControl> | null,
): readonly HTMLElement[] {
  const id = rosterId(row)
  const roster = host.createElement('datalist')
  roster.setAttribute('id', id)
  for (const word of words) {
    const option = host.createElement('option')
    option.setAttribute('value', word)
    roster.append(option)
  }

  const box = made(host, 'input', propertyControlStyle(control.widthInFontSizes))
  box.setAttribute('type', 'text')
  box.setAttribute('list', id)
  box.setAttribute('data-field-row', row)
  box.setAttribute('data-field-search', 'true')
  ;(box as HTMLInputElement).value = ''

  CONTROL_KEYS.set(box, { row, key: control.key })
  TYPED_CONTROLS.add(box)
  // TRAP: the only typed entrance into PR-16; without this entry its focus lands nowhere.
  if (typedByRow !== null && !typedByRow.has(row)) {
    typedByRow.set(row, box as unknown as TextEntryControl)
  }
  return [roster as HTMLElement, box]
}

// see T-016, T-058, T-104
/** @purity non-pure */
function fieldElement(
  host: Document,
  field: PropertyField,
  typedByRow: Map<string, TextEntryControl> | null,
): HTMLElement {
  const line = made(host, 'div', propertyFieldStyle())
  line.setAttribute('data-field-row', field.row)
  line.setAttribute('data-editable', String(field.isEditable))
  const name = made(host, 'span', propertyFieldNameStyle())
  name.textContent = field.name

  if (field.controls.length === 0) {
    const value = made(host, 'span', '')
    value.textContent = field.text
    line.append(name, value)
    return line
  }

  const controls = made(host, 'div', propertyControlsStyle())
  if (field.text !== '' && field.controls.every((one) => one.text === '')) {
    const shown = made(host, 'span', '')
    shown.textContent = field.text
    controls.append(shown)
  }
  for (const control of field.controls) {
    controls.append(controlElement(host, field.row, control, typedByRow))
    const words = control.searchWords
    if (words !== undefined) {
      controls.append(...searchElements(host, field.row, control, words, typedByRow))
    }
  }
  line.append(name, controls)
  return line
}

// see FR-072
/** @purity non-pure */
function markPropertiesPanel(panel: HTMLElement, description: PropertiesPanel): void {
  panel.setAttribute('data-showing', description.showing)
  panel.setAttribute('data-subject-gone', String(description.isSubjectGone))
}

// see U-25, FR-072
// STOP: spec does not decide where the way-out sits. Looked in FR-072, T-109 @provisional PND-327
// STOP: spec does not decide redrawing a held field. Looked in FR-006, FR-072 @provisional PND-271
/** @purity non-pure */
function fillPropertiesPanel(
  host: Document,
  panel: HTMLElement,
  description: PropertiesPanel,
  anchors: Map<string, HTMLElement>,
  typedByRow: Map<string, TextEntryControl>,
): void {
  // TRAP: clear first, as anchorsOf does: a leftover row would name a control no longer drawn.
  typedByRow.clear()
  const drawn = description.fields.map((field) => fieldElement(host, field, typedByRow))
  const entries = description.commands.map((item) => {
    const entry = commandEntry(host, item)
    anchors.set(anchorKey({ kind: 'icon', icon: item.icon }), entry)
    return entry
  })
  if (entries.length > 0) {
    const wayOut = made(host, 'div', propertyWayOutStyle())
    wayOut.append(...entries)
    const first = drawn[0]
    if (first === undefined) drawn.push(wayOut)
    else first.append(wayOut)
  }
  panel.replaceChildren(...drawn)
}

// see GR-19, FR-053
/** @purity non-pure */
function grabBandElement(
  host: Document,
  heightPx: number,
  minimise: CommandItem,
  isMinimised: boolean,
  anchors: Map<string, HTMLElement>,
): HTMLElement {
  const band = made(host, 'div', STYLE.paletteGrabBand + `height:${heightPx}px;`)
  band.setAttribute('data-icon', PALETTE_GRAB_BAND_ENTRY)
  fillEntry(host, band, PALETTE_GRAB_BAND_ENTRY)

  const toggle = commandEntry(host, minimise)
  toggle.setAttribute('style', toggle.getAttribute('style') + STYLE.paletteMinimise)
  toggle.setAttribute('aria-pressed', String(isMinimised))
  anchors.set(anchorKey({ kind: 'icon', icon: minimise.icon }), toggle)
  band.append(toggle)
  return band
}

// see U-26, FR-053
/** @purity non-pure */
function paletteElement(
  host: Document,
  palette: CommandPalette,
  anchors: Map<string, HTMLElement>,
): HTMLElement {
  const drawn = part(
    host,
    'div',
    ROLE.commandPalette,
    cornerStyle(palette.at) + STYLE.commandPalette,
  )
  const laid: HTMLElement[] = []
  for (const group of palette.groups) {
    if (laid.length > 0) laid.push(made(host, 'div', paletteGroupRuleStyle()))
    const box = part(host, 'div', ROLE.paletteGroups, STYLE.paletteGroup)
    const commands = part(host, 'div', ROLE.paletteCommands, STYLE.paletteCommands)
    for (const item of group.commands) {
      const entry = commandEntry(host, item)
      anchors.set(anchorKey({ kind: 'icon', icon: item.icon }), entry)
      commands.append(entry)
    }
    box.append(commands)
    laid.push(box)
  }
  const armed =
    palette.armedText === null ? null : made(host, 'div', STYLE.armedText)
  if (armed !== null) armed.textContent = palette.armedText

  // TRAP: the band is a child of the palette part, never a sibling: PALETTE_FAINT_CSS uses
  // :hover, which a sibling band would not keep matching while held.
  const band = grabBandElement(
    host,
    palette.grabBandHeight,
    palette.minimise,
    palette.isMinimised,
    anchors,
  )
  anchors.set(anchorKey({ kind: 'icon', icon: PALETTE_GRAB_BAND_ENTRY }), band)

  if (palette.isMinimised) {
    drawn.replaceChildren(band)
    return drawn
  }
  const contents = made(host, 'div', STYLE.paletteContents)
  contents.replaceChildren(...laid, ...(armed === null ? [] : [armed]))

  drawn.replaceChildren(band, contents)
  return drawn
}

// see FR-099
/** @purity non-pure */
function rosterSelectionEntry(host: Document, isSelected: boolean): HTMLElement {
  const icon = isSelected ? ROSTER_CHOSEN_ENTRY : ROSTER_UNCHOSEN_ENTRY
  const entry = made(host, 'button', entryStyle())
  entry.setAttribute('type', 'button')
  entry.setAttribute('data-icon', icon)
  entry.setAttribute('aria-label', icon)
  fillEntry(host, entry, icon)
  return entry
}

interface DrawnModal {
  readonly element: HTMLElement
  readonly watermarkUnlockEntry: TextEntryControl | null
}

/** @purity non-pure */
function modalElement(
  host: Document,
  modal: OpenModal,
  anchors: Map<string, HTMLElement>,
): DrawnModal {
  const drawn = part(
    host,
    'div',
    modal.surface,
    STYLE.modal +
      ('entries' in modal ? helpStyle() : '') +
      ('droppedTaskNames' in modal ? STYLE.importReportBox : ''),
  )
  drawn.setAttribute('role', 'dialog')
  drawn.setAttribute('aria-modal', 'true')

  const header = made(host, 'div', STYLE.surfaceHeader)
  const heading = made(host, 'h2', STYLE.heading)
  heading.textContent = modal.heading
  header.append(heading)
  for (const item of modal.commands) {
    const entry = commandEntry(host, item)
    anchors.set(anchorKey({ kind: 'icon', icon: item.icon }), entry)
    header.append(entry)
  }
  const body: HTMLElement[] = []
  let watermarkUnlockEntry: TextEntryControl | null = null

  if ('entries' in modal) {
    drawn.setAttribute('data-language', modal.language)
    const columns = made(host, 'div', helpColumnsStyle())
    for (const line of modal.entries) {
      const row = made(host, 'div', STYLE.helpEntry)
      row.setAttribute('data-table', line.table)
      row.setAttribute('data-row', line.row)

      const glyph = made(host, 'span', STYLE.helpGlyph)
      if (line.icon !== null) fillEntry(host, glyph, line.icon)
      row.append(glyph)

      const text = made(host, 'span', STYLE.helpText)
      text.textContent = line.text
      row.append(text)

      const assignment = made(host, 'span', STYLE.helpKeys)
      assignment.textContent = line.keys ?? line.press ?? null
      row.append(assignment)

      columns.append(row)
    }
    body.push(columns)
    const legal = made(host, 'details', STYLE.helpLegal)
    const summary = made(host, 'summary', STYLE.helpLegalSummary)
    summary.textContent = modal.copyrightNotice
    legal.append(summary)
    for (const text of [modal.licenceText, ...modal.attributions]) {
      const line = made(host, 'p', STYLE.helpLegalText)
      line.textContent = text
      legal.append(line)
    }
    body.push(legal)
  }

  if ('documentText' in modal) {
    const text = made(host, 'pre', 'white-space:pre-wrap;overflow:auto;')
    text.textContent = modal.documentText
    body.push(text)
  }

  if ('formats' in modal) {
    const choices = made(host, 'div', STYLE.formatChoices)
    for (const format of modal.formats) {
      const choice = made(host, 'button', entryStyle())
      choice.setAttribute('type', 'button')
      choice.setAttribute('data-format', format.row)
      const shown = `${format.name} ${format.extension}`
      choice.setAttribute('aria-label', shown)
      choice.textContent = shown
      choices.append(choice)
    }
    body.push(choices)
  }

  if ('resources' in modal) {
    for (const resource of modal.resources) {
      const line = made(host, 'div', STYLE.field)
      line.setAttribute('data-uid', String(resource.uid))
      line.setAttribute('data-referenced', String(resource.isReferenced))
      line.setAttribute('data-selected', String(resource.isSelected))
      const name = made(host, 'span', STYLE.fieldName)
      name.textContent = resource.name
      line.append(name, rosterSelectionEntry(host, resource.isSelected))
      for (const taskName of resource.unassignedTaskNames) {
        const unassigned = made(host, 'span', 'margin-right:0.5em;')
        unassigned.setAttribute('data-unnamed', String(taskName === null))
        unassigned.textContent = taskName
        line.append(unassigned)
      }
      body.push(line)
    }
  }

  if ('candidates' in modal) {
    for (const candidate of modal.candidates) {
      const line = made(host, 'div', STYLE.field)
      line.setAttribute('data-uid', String(candidate.currentUid))
      line.setAttribute('data-incoming-uid', String(candidate.incomingUid))
      const uid = made(host, 'span', STYLE.fieldName)
      uid.textContent =
        candidate.currentUid === candidate.incomingUid
          ? String(candidate.currentUid)
          : `${candidate.currentUid} / ${candidate.incomingUid}`
      const current = made(host, 'span', 'margin-right:0.5em;')
      current.setAttribute('data-side', 'current')
      current.setAttribute('data-unnamed', String(candidate.currentName === null))
      current.textContent = candidate.currentName ?? ''
      const incoming = made(host, 'span', 'margin-right:0.5em;')
      incoming.setAttribute('data-side', 'incoming')
      incoming.setAttribute('data-unnamed', String(candidate.incomingName === null))
      incoming.textContent = candidate.incomingName ?? ''
      line.append(uid, current, incoming)
      body.push(line)
    }
  }

  if ('unreadColumns' in modal) {
    if (modal.unreadText !== '') {
      const said = made(host, 'div', '')
      said.textContent = modal.unreadText
      body.push(said)
    }
    if (modal.unreadNextStep !== '') {
      const step = made(host, 'div', STYLE.noticeNextStep)
      step.textContent = modal.unreadNextStep
      body.push(step)
    }
    for (const column of modal.unreadColumns) {
      const line = made(host, 'div', STYLE.field)
      line.setAttribute('data-unread-column', column)
      const name = made(host, 'span', STYLE.fieldName)
      name.textContent = column
      line.append(name)
      body.push(line)
    }
  }

  if ('droppedTaskNames' in modal) body.push(...importReportElements(host, modal))

  if ('fields' in modal) {
    // TRAP: null, not a map: modal controls must not answer focusPropertyField for panel rows.
    for (const field of modal.fields) body.push(fieldElement(host, field, null))
  }

  if ('weekDays' in modal) {
    // TRAP: not renumbered: WeekDay.dayType (AT-73) counts Sunday as 1 and
    // Project.weekStartDay (AT-17) as 0.
    drawn.setAttribute('data-week-start-day', String(modal.weekStartDay))
    for (const day of modal.weekDays) {
      const line = made(host, 'div', STYLE.field)
      line.setAttribute('data-ordinal', String(day.ordinal))
      line.setAttribute('data-day-type', String(day.dayType))
      line.setAttribute('data-day-working', String(day.dayWorking))
      body.push(line)
    }
    for (const exception of modal.exceptions) {
      const line = made(host, 'div', STYLE.field)
      line.setAttribute('data-ordinal', String(exception.ordinal))
      line.setAttribute('data-day-working', String(exception.dayWorking))
      line.setAttribute('data-recurrence-kind', String(exception.recurrenceKind))
      const name = made(host, 'span', STYLE.fieldName)
      name.textContent = exception.name
      const span = made(host, 'span', '')
      span.textContent = `${exception.fromDate ?? ''} ${exception.toDate ?? ''}`
      line.append(name, span)
      body.push(line)
    }
  }

  if ('question' in modal) {
    const question = made(host, 'div', '')
    question.textContent = modal.question

    // WHY: type=password, not a painted mask, which would leave the characters in the DOM.
    const answerEntry = host.createElement('input')
    answerEntry.setAttribute('type', 'password')
    answerEntry.setAttribute('style', STYLE.watermarkUnlockEntry)
    answerEntry.setAttribute('aria-label', modal.question)
    answerEntry.setAttribute(WATERMARK_UNLOCK_ENTRY_ATTRIBUTE, 'true')
    watermarkUnlockEntry = answerEntry

    const answers = made(host, 'div', STYLE.confirmationAnswers)
    for (const answer of modal.answers) {
      answers.append(confirmationAnswerElement(host, answer))
    }
    body.push(question, answerEntry, answers)
  }

  drawn.replaceChildren(header, ...body)
  return { element: drawn, watermarkUnlockEntry }
}

type ImportReport = Extract<OpenModal, { readonly droppedTaskNames: readonly (string | null)[] }>

// see U-62, FR-023
/** @purity non-pure */
function importReportElements(host: Document, modal: ImportReport): readonly HTMLElement[] {
  const said = made(host, 'div', '')
  said.textContent = modal.text
  const lines: HTMLElement[] = [said]
  if (modal.nextStep !== '') {
    const step = made(host, 'div', STYLE.noticeNextStep)
    step.textContent = modal.nextStep
    lines.push(step)
  }
  for (const name of modal.droppedTaskNames) {
    const line = made(host, 'div', STYLE.confirmationItem)
    line.setAttribute('data-unnamed', String(name === null))
    line.textContent = name ?? ''
    lines.push(line)
  }
  const names = made(host, 'div', STYLE.confirmationNames)
  names.replaceChildren(...lines)

  const dismiss = made(host, 'button', entryStyle() + STYLE.noticeDismiss)
  dismiss.setAttribute('type', 'button')
  dismiss.setAttribute(IMPORT_REPORT_DISMISS_ATTRIBUTE, 'true')
  dismiss.textContent = modal.dismissText
  const wayOut = made(host, 'div', STYLE.confirmationAnswers)
  wayOut.replaceChildren(dismiss)
  return [names, wayOut]
}

// see NT-1, NT-3a, NT-8
/** @purity non-pure */
function noticeElement(host: Document, notice: Notice): HTMLElement {
  const drawn = made(host, 'div', STYLE.notice)
  drawn.setAttribute('data-manner', notice.manner)
  drawn.setAttribute('role', 'status')
  const text = made(host, 'div', '')
  text.textContent = notice.text
  drawn.append(text)
  if (notice.affectedCount !== null) {
    // STOP: spec does not decide the word for the count. Looked in NT-1, NT-3, FR-038
    // @provisional PND-157
    const count = made(host, 'div', '')
    count.textContent = String(notice.affectedCount)
    drawn.append(count)
    drawn.setAttribute('data-affected-count', String(notice.affectedCount))
  }
  for (const step of notice.nextSteps) {
    const line = made(host, 'div', STYLE.noticeNextStep)
    line.textContent = step
    drawn.append(line)
  }
  const dismiss = made(host, 'button', entryStyle() + STYLE.noticeDismiss)
  dismiss.setAttribute('type', 'button')
  dismiss.setAttribute(NOTICE_DISMISS_KEY_ATTRIBUTE, notice.dismissKey)
  dismiss.textContent = notice.dismissText
  drawn.append(dismiss)
  return drawn
}

// see NT-7
/** @purity non-pure */
function confirmationAnswerElement(
  host: Document,
  answer: Confirmation['answers'][number],
): HTMLElement {
  const drawn = made(host, 'button', entryStyle() + STYLE.confirmationAnswer)
  drawn.setAttribute('type', 'button')
  drawn.setAttribute(CONFIRMATION_ANSWER_ATTRIBUTE, answer.answer)
  // WHY: no aria-label: the spans give the name; a copy would stop following the dictionary.
  const initial = made(host, 'span', STYLE.confirmationAnswerInitial)
  initial.textContent = answer.text.slice(0, 1)
  const rest = made(host, 'span', '')
  rest.textContent = answer.text.slice(1)
  drawn.append(initial, rest)
  return drawn
}

// see U-55, NT-7, FR-032
/** @purity non-pure */
function confirmationElement(host: Document, confirmation: Confirmation): HTMLElement {
  const drawn = part(host, 'div', ROLE.confirmation, STYLE.confirmation)
  drawn.setAttribute('role', 'alertdialog')
  drawn.setAttribute('aria-modal', 'true')
  drawn.setAttribute('data-manner', confirmation.manner)

  const text = made(host, 'div', '')
  text.textContent = confirmation.text

  const items = confirmation.items.map((item) => {
    const line = made(host, 'div', STYLE.confirmationItem)
    line.setAttribute('data-unnamed', String(item.name === null))
    line.setAttribute('data-shown-on-another-row', String(item.isShownOnAnotherRow))
    // TRAP: set the text before appending the mark; the textContent setter replaces every child.
    line.textContent = item.name
    if (item.isShownOnAnotherRow) {
      const mark = made(host, 'span', STYLE.confirmationMark)
      mark.textContent = confirmation.shownOnAnotherRowMark
      line.append(mark)
    }
    return line
  })

  const answers = made(host, 'div', STYLE.confirmationAnswers)
  for (const answer of confirmation.answers) {
    answers.append(confirmationAnswerElement(host, answer))
  }

  const names = made(host, 'div', STYLE.confirmationNames)
  names.replaceChildren(text, ...items)
  drawn.replaceChildren(names, answers)
  return drawn
}

// see FR-066
/** @purity non-pure */
function fillDialogueMessages(host: Document, box: HTMLElement, field: DialogueField): void {
  const drawn = field.messages.map((message) => {
    const line = made(host, 'div', STYLE.dialogueMessage)
    line.setAttribute('data-sequence', String(message.sequence))
    line.setAttribute('data-author', message.author)
    line.setAttribute('data-settled-at', message.settledAt)
    const who = made(host, 'span', STYLE.dialogueAuthor)
    who.textContent = message.author
    const said = made(host, 'span', '')
    said.textContent = message.text
    line.append(who, said)
    return line
  })
  box.replaceChildren(...drawn)
}


export interface ScreenSurfaceWiring {
  readonly host: Document
  readonly mount: Element
  readonly readAuthor: () => string
  readonly readClockMs: () => number
  readonly onAppHeaderHeightPx: (heightPx: number) => void
  readonly onRowControlsHeightPx?: (heightPx: number) => void
  readonly holdFocusPropertyField?: (focus: (row: string) => void) => void
  readonly holdReadWatermarkUnlockAnswer?: (read: () => string) => void
  readonly readTheme: () => ScreenTheme
}

interface Settlement {
  readonly text: string
  readonly settledAt: string
}

// see IF-9, PI-38
/** @purity non-pure */
export function domScreenSurface(wiring: ScreenSurfaceWiring): ScreenSurface {
  const { host, readAuthor, readClockMs, onAppHeaderHeightPx, readTheme } = wiring

  const root = made(host, 'div', STYLE.root + themeStyle(readTheme()))
  root.setAttribute('data-unit', UNIT_ROW)

  const hoverSheet = host.createElement('style')
  hoverSheet.textContent = hoverCss()

  const frameLayer = made(host, 'div', STYLE.layer)
  const rowTitlePanel = part(host, 'div', ROLE.rowTitlePanel, STYLE.hidden)
  const rowTitleTree = part(host, 'div', ROLE.rowTitleTree, STYLE.layer)
  const propertiesPanel = part(host, 'div', ROLE.propertiesPanel, STYLE.hidden)
  const paletteLayer = made(host, 'div', STYLE.layer)
  const dialogueField = part(host, 'div', ROLE.dialogueField, STYLE.hidden)
  const dialogueMessages = made(host, 'div', STYLE.dialogueMessages)
  const dialogueEntry = host.createElement('input')
  const appHeader = part(host, 'div', ROLE.appHeader, appHeaderStyle())
  const modalLayer = made(host, 'div', STYLE.layer)
  let watermarkUnlockEntry: TextEntryControl | null = null
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
    paletteLayer,
    dialogueField,
    appHeader,
    modalLayer,
    noticeLayer,
    confirmationLayer,
    tooltipLayer,
  )
  wiring.mount.append(root)

  let lastKeys: Readonly<Record<string, string>> = {}
  let langShown = ''
  let headerHeightPx = 0
  // TRAP: 0 is a height a host really answers; using 0 for "not measured" swallows the first report.
  let isHeaderHeightSettled = false
  let rowControlsHeightPx = 0
  let rowControlsMeasuredAgainst: string | null = null
  let rowControlsPanelDrawnAtMs = 0
  let settled: Settlement | null = null
  let isFieldUp = false
  let fieldCommit: FieldCommit | null = null

  // WHY: one map per part, not one for the screen: a single map keeps detached nodes of rebuilt
  // parts, which measure to nothing and put a tooltip in the top-left corner.
  const anchorsByPart = new Map<string, Map<string, HTMLElement>>()

  /** @purity non-pure */
  function anchorsOf(name: string): Map<string, HTMLElement> {
    const held = anchorsByPart.get(name) ?? new Map<string, HTMLElement>()
    held.clear()
    anchorsByPart.set(name, held)
    return held
  }

  /** @purity semi-pure-b */
  function anchorFor(key: string, anchor: TooltipAnchor): HTMLElement | undefined {
    for (const held of anchorsByPart.values()) {
      const found = held.get(key)
      if (found !== undefined) return found
    }
    if (anchor.kind !== 'icon') return undefined
    return root.querySelector<HTMLElement>(`[data-icon="${anchor.icon}"]`) ?? undefined
  }

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

  // TRAP: no term may read style or geometry off the tree; a forced layout costs what the key saves.
  /** @purity non-pure */
  function rowControlsMeasureKey(view: ScreenView): string {
    const edge = panelEdge(view.frame, 'rowTitlePanel')
    const rowsDrawn =
      view.rowTitlePanel.pinnedTitles.length + view.rowTitlePanel.titles.length > 0
    return [
      rowControlGridStyle(2, ROW_CONTROL_STEPS.foldingGrid),
      rowControlGridStyle(1, ROW_CONTROL_STEPS.pair),
      rowControlBoxStyle(),
      rowControlGlyphGapStyle(),
      String(rowsDrawn),
      view.language,
      themeStyle(readTheme()),
      String(edge === null ? 'none' : edge.x),
      String(headerHeightPx),
    ].join('|')
  }

  // see LF-3, HF-19
  /** @purity non-pure */
  function reportRowControlsHeight(measuredAgainst: string): void {
    const drawnAtMs = readClockMs()
    const endsALull = drawnAtMs - rowControlsPanelDrawnAtMs >= ROW_CONTROLS_LULL_MS
    rowControlsPanelDrawnAtMs = drawnAtMs
    if (
      !endsALull &&
      rowControlsHeightPx !== 0 &&
      measuredAgainst === rowControlsMeasuredAgainst
    )
      return
    rowControlsMeasuredAgainst = measuredAgainst
    let tallest = rowControlsHeightPx
    const stacked = `[${ROW_FOLDING_GRID_MARK}],[${ROW_CONTROL_PAIR_MARK}]`
    for (const box of rowTitleTree.querySelectorAll(stacked)) {
      tallest = Math.max(tallest, box.getBoundingClientRect().height)
    }
    if (tallest === rowControlsHeightPx) return
    rowControlsHeightPx = tallest
    wiring.onRowControlsHeightPx?.(tallest)
  }

  // see AG-11
  /** @purity non-pure */
  function onEntryKeyDown(event: KeyboardEvent): void {
    if (event.key !== HOST_ENTER || event.isComposing) return
    if (event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) return
    if (!isFieldUp) return
    settled = { text: dialogueEntry.value, settledAt: stampOf(readClockMs()) }
    dialogueEntry.value = ''
  }

  dialogueEntry.addEventListener('keydown', onEntryKeyDown)

  // see IN-3, EZ-2
  /** @purity non-pure */
  function tooltipElement(tip: Tooltip): HTMLElement {
    const key = anchorKey(tip.anchor)
    const drawn = made(host, 'div', tooltipStyle())
    drawn.setAttribute('role', 'tooltip')
    drawn.setAttribute('data-anchor', key)
    drawn.textContent = tip.assignment
      ? `${tip.text} ${tip.assignment}`
      : tip.text

    // STOP: spec does not decide where EZ-6's tooltip stands. Looked in IN-3, EZ-6
    // @provisional PND-391
    if (tip.at !== undefined) {
      drawn.setAttribute(
        'style',
        tooltipStyle() + `pointer-events:none;left:${tip.at.x}px;top:${tip.at.y}px;`,
      )
      return drawn
    }

    const anchored = anchorFor(key, tip.anchor)
    if (anchored === undefined) {
      drawn.setAttribute('style', tooltipStyle() + 'left:0;top:0;')
      return drawn
    }
    const foundAt = anchored.getBoundingClientRect()
    drawn.setAttribute('style', tooltipStyle() + `left:${foundAt.left}px;top:${foundAt.bottom}px;`)
    return drawn
  }

  // STOP: spec does not decide where the panels' widths come from. Looked in FR-052, S-80
  // @provisional PND-155
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
  }

  // STOP: spec does not decide where the Dialogue Field stands. Looked in SC-4, FR-066
  // @provisional PND-151
  /** @purity non-pure */
  function placeDialogueField(view: ScreenView): void {
    if (view.dialogueField === null) {
      dialogueField.setAttribute('style', STYLE.hidden)
      return
    }
    const lane = view.frame.scrollbars.find((one) => one.axis === 'horizontal')
    const propertiesLine = panelEdge(view.frame, 'propertiesPanel')
    const bottom = lane === undefined ? '100%' : `${lane.track.y}px`
    const right = propertiesLine === null ? '100%' : `${propertiesLine.x}px`
    dialogueField.setAttribute(
      'style',
      STYLE.dialogueField + `left:calc(${right} - 24em);top:calc(${bottom} - 14em);`,
    )
  }

  // see IF-9
  /** @purity non-pure */
  function showScreenView(view: ScreenView): void {
    isNoticeShowing = view.notices.length > 0
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

    // STOP: spec does not decide whether the surface root repeats the page's lang. Looked in FR-038
    // @provisional PND-323
    if (view.language !== langShown) {
      langShown = view.language
      root.setAttribute('lang', view.language)
    }

    let isHeaderMoved = false
    if (changed('appHeaderItems')) {
      if (documentTitleEntry !== null) {
        drawnKeys.appHeaderItems = lastKeys.appHeaderItems ?? ''
      } else {
        documentTitleBox = fillAppHeader(
          host,
          appHeader,
          view.appHeaderItems,
          anchorsOf('appHeaderItems'),
        )
        documentTitleShown = view.appHeaderItems.documentTitle ?? ''
        isHeaderMoved = reportHeaderHeight()
      }
    }
    if (changed('frame')) {
      fillScreenFrame(host, frameLayer, view.frame, anchorsOf('frame'))
      root.setAttribute('data-full-screen', String(view.frame.isFullScreen))
    }
    if (changed('rowTitlePanel')) {
      fillRowTitleTree(host, rowTitleTree, view.rowTitlePanel, anchorsOf('rowTitlePanel'))
      reportRowControlsHeight(rowControlsMeasureKey(view))
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
      if (isFieldHeld) {
        drawnKeys.propertiesPanel = lastKeys.propertiesPanel ?? ''
      } else {
        fillPropertiesPanel(
          host,
          propertiesPanel,
          view.propertiesPanel,
          anchorsOf('propertiesPanel'),
          typedControlsByRow,
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
      modalLayer.replaceChildren(...(drawnModal === null ? [] : [drawnModal.element]))
      watermarkUnlockEntry = drawnModal === null ? null : drawnModal.watermarkUnlockEntry
      if (drawnModal !== null && drawnModal.watermarkUnlockEntry !== null) {
        watchWatermarkUnlock(drawnModal.element)
      }
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
      isFieldUp = field !== null
      if (field !== null) fillDialogueMessages(host, dialogueMessages, field)
    }

    if (isHeaderMoved || changed('frame') || changed('propertiesPanel')) placePanels(view)
    if (isHeaderMoved || changed('frame') || changed('dialogueField')) placeDialogueField(view)
    if (isHeaderMoved || changed('notices')) {
      noticeLayer.setAttribute('style', STYLE.notices + `top:${headerHeightPx}px;`)
    }

    // TRAP: tooltips are placed last; anything above may move what they are anchored to.
    if (isHeaderMoved || Object.keys(keys).some(changed)) {
      tooltipLayer.replaceChildren(...view.tooltips.map((one) => tooltipElement(one)))
    }

    lastKeys = drawnKeys
    // TRAP: shown synchronously, never inside a frame callback: a first paint that waits for one
    // leaves a white screen until an input arrives.
    root.setAttribute('style', STYLE.rootShown + themeStyle(readTheme()))

    // TRAP: only the draw takes the settled line; a caller that reads without drawing after it
    // hands the same utterance over twice.
    settled = null
  }

  /** @purity semi-pure-b */
  function readDialogueInput(): DialogueInput | null {
    if (!isFieldUp) return null
    const held = settled
    if (held !== null) {
      return { text: held.text, isSettled: true, author: readAuthor(), settledAt: held.settledAt }
    }
    const typed = dialogueEntry.value
    if (typed === '') return null
    // STOP: spec does not decide what an unsettled line carries as settledAt. Looked in AG-11
    // @provisional PND-156
    return { text: typed, isSettled: false, author: readAuthor(), settledAt: '' }
  }

  /** @purity pure */
  function fieldCommitOf(target: unknown): FieldCommit | null {
    if (target === null || typeof target !== 'object') return null
    const named = CONTROL_KEYS.get(target as Element)
    if (named === undefined) return null
    const input = target as HTMLInputElement
    const text = input.type === 'checkbox' ? String(input.checked) : input.value
    return { row: named.row, key: named.key, text }
  }

  // see FR-031, UN-3
  /** @purity non-pure */
  function onFieldChange(event: Event): void {
    const commit = fieldCommitOf(event.target)
    if (commit === null) return
    const target: unknown = event.target
    if (target === (heldTextControl as unknown) && commit.text === heldTextValueAtFocus) return
    fieldCommit = commit
  }

  propertiesPanel.addEventListener('change', onFieldChange)

  const typedControlsByRow = new Map<string, TextEntryControl>()

  // see MK-13
  /** @purity non-pure */
  function focusPropertyField(row: string): void {
    if (row === DOCUMENT_TITLE_ROW) {
      openDocumentTitleField()
      return
    }
    const control = typedControlsByRow.get(row)
    if (control === undefined) return
    if (typeof control.focus === 'function') control.focus()
    // TRAP: select after focus, or the host's own focus handling moves the caret afterwards.
    if (typeof control.select === 'function') control.select()
  }

  let isFieldHeld = false
  let isNoticeShowing = false
  // see NT-8
  /** @purity semi-pure-b */
  function isPressTakenByStandingNotice(key: unknown): boolean {
    if (!isNoticeShowing) return false
    return key === HOST_ENTER || key === HOST_ESCAPE_KEY
  }
  let heldTextControl: TextEntryControl | null = null
  let heldTextValueAtFocus = ''
  let isHeldTextTakenBack = false
  // see IN-4, IN-5a
  // WHY: released on the Esc key release, not in a microtask: a microtask runs between two
  // keydown listeners, so one Esc would cancel the edit and put the panel away.
  /** @purity non-pure */
  function releaseTakenBackText(held: TextEntryControl): void {
    if (heldTextControl !== held || !isHeldTextTakenBack) return
    if (typeof held.blur === 'function') held.blur()
    heldTextControl = null
    heldTextValueAtFocus = ''
    isFieldHeld = false
    isHeldTextTakenBack = false
  }
  propertiesPanel.addEventListener('focusin', (event: Event) => {
    isFieldHeld = true
    heldTextControl = textEntryControlOf(event.target)
    heldTextValueAtFocus = heldTextControl === null ? '' : heldTextControl.value
    isHeldTextTakenBack = false
  })
  propertiesPanel.addEventListener('focusout', () => {
    isFieldHeld = false
    heldTextControl = null
    heldTextValueAtFocus = ''
    isHeldTextTakenBack = false
  })
  propertiesPanel.addEventListener('input', () => {
    isHeldTextTakenBack = false
  })

  /** @purity non-pure */
  propertiesPanel.addEventListener('keydown', (event: Event) => {
    const held = heldTextControl
    if (held === null) return
    if ((event as { key?: unknown }).key !== HOST_ESCAPE_KEY) return
    if (isPressTakenByStandingNotice(HOST_ESCAPE_KEY)) return
    if (isHeldTextTakenBack) {
      releaseTakenBackText(held)
      return
    }
    // TRAP: do not let go of the control on this press: this listener runs before the shell's,
    // so the ladder would spend a second level on one press.
    held.value = heldTextValueAtFocus
    isHeldTextTakenBack = true
  })

  /** @purity non-pure */
  propertiesPanel.addEventListener(HOST_KEY_RELEASE, (event: Event) => {
    const held = heldTextControl
    if (held === null || !isHeldTextTakenBack) return
    if ((event as { key?: unknown }).key !== HOST_ESCAPE_KEY) return
    releaseTakenBackText(held)
  })

  /** @purity non-pure */
  propertiesPanel.addEventListener('keydown', (event: Event) => {
    const held = heldTextControl
    if (held === null) return
    const key = event as Partial<KeyboardEvent>
    if (key.key !== HOST_ENTER || key.isComposing === true) return
    if (key.ctrlKey === true || key.altKey === true) return
    if (key.metaKey === true || key.shiftKey === true) return
    if (isPressTakenByStandingNotice(HOST_ENTER)) return
    const commit = fieldCommitOf(event.target)
    if (commit === null) return
    if (commit.text !== heldTextValueAtFocus) fieldCommit = commit
    heldTextValueAtFocus = commit.text
    // TRAP: blur before clearing heldTextControl: onFieldChange drops the repeated change only
    // while heldTextControl names the control, or one value is written twice.
    if (typeof held.blur === 'function') held.blur()
    heldTextControl = null
    heldTextValueAtFocus = ''
    isFieldHeld = false
    isHeldTextTakenBack = false
  })

  // WHY: on the host, not the root or readScreenPartAt: the schedule is outside this tree,
  // and readScreenPartAt is also asked on hover, which would end an edit.
  /** @purity non-pure */
  if (typeof host.addEventListener === 'function') {
    host.addEventListener('pointerdown', settleOnPressOutside)
  }

  // see IN-6, FR-020
  /** @purity non-pure */
  function releaseWatermarkUnlockOnPressOutside(event: Event): void {
    const field = watermarkUnlockEntry
    if (field === null || !isWatermarkUnlockHeld) return
    if ((event as { target?: unknown }).target === (field as unknown)) return
    if (typeof field.blur === 'function') field.blur()
    isWatermarkUnlockHeld = false
    isWatermarkUnlockTakenBack = false
  }

  /** @purity non-pure */
  function settleOnPressOutside(event: Event): void {
    releaseWatermarkUnlockOnPressOutside(event)
    settleDocumentTitleOnPressOutside(event)
    const held = heldTextControl
    if (held === null) return
    const pressedOn: unknown = (event as { target?: unknown }).target
    if (pressedOn === (held as unknown)) return

    const commit = fieldCommitOf(held)
    if (commit !== null && commit.text !== heldTextValueAtFocus) {
      fieldCommit = commit
      heldTextValueAtFocus = commit.text
    }
    isHeldTextTakenBack = false

    // STOP: spec does not decide if pressing another field releases this one. Looked in IN-6
    // @provisional PND-352
    if (textEntryControlOf(pressedOn) !== null) return

    if (typeof held.blur === 'function') held.blur()
    heldTextControl = null
    heldTextValueAtFocus = ''
    isFieldHeld = false
  }

  let documentTitleEntry: TextEntryControl | null = null
  let documentTitleBox: HTMLElement | null = null
  let documentTitleShown = ''
  let documentTitleValueAtFocus = ''
  let isDocumentTitleTakenBack = false

  const DOCUMENT_TITLE_ROW = 'U-27'
  const DOCUMENT_TITLE_KEY: PropertyFieldKey = { holder: 'project', column: 'title' }

  // see FR-035
  /** @purity non-pure */
  function openDocumentTitleField(): void {
    const box = documentTitleBox
    if (box === null || documentTitleEntry !== null) return
    const drawn = made(host, 'input', STYLE.documentTitleEntry)
    drawn.setAttribute('type', 'text')
    drawn.setAttribute('data-field-row', DOCUMENT_TITLE_ROW)
    const entry = drawn as unknown as TextEntryControl
    entry.value = documentTitleShown
    CONTROL_KEYS.set(drawn, { row: DOCUMENT_TITLE_ROW, key: DOCUMENT_TITLE_KEY })
    TYPED_CONTROLS.add(drawn)
    // TRAP: the field goes inside the box, not in its place, or a point on the name answers no part.
    box.replaceChildren(drawn)
    documentTitleEntry = entry
    documentTitleValueAtFocus = documentTitleShown
    isDocumentTitleTakenBack = false
    // TRAP: watch before focusing: the host may raise focusin or focusout on the focus below.
    watchDocumentTitleField(drawn, entry)
    if (typeof entry.focus === 'function') entry.focus()
    if (typeof entry.select === 'function') entry.select()
  }

  /** @purity non-pure */
  function closeDocumentTitleField(): void {
    if (documentTitleEntry === null) return
    documentTitleEntry = null
    documentTitleValueAtFocus = ''
    isDocumentTitleTakenBack = false
    // TRAP: clear the entry before rewriting the box: a focusout on the removed field must find nothing.
    if (documentTitleBox !== null) documentTitleBox.textContent = documentTitleShown
  }

  // see FR-035, IN-6
  /** @purity non-pure */
  function settleDocumentTitle(): void {
    const entry = documentTitleEntry
    if (entry === null) return
    if (entry.value === '') {
      entry.value = documentTitleValueAtFocus
      return
    }
    if (entry.value === documentTitleValueAtFocus) return
    const commit = fieldCommitOf(entry)
    if (commit === null) return
    fieldCommit = commit
    documentTitleValueAtFocus = commit.text
  }

  /** @purity non-pure */
  function settleDocumentTitleOnPressOutside(event: Event): void {
    const held = documentTitleEntry
    if (held === null) return
    if ((event as { target?: unknown }).target === (held as unknown)) return
    settleDocumentTitle()
    if (typeof held.blur === 'function') held.blur()
    closeDocumentTitleField()
  }

  // see SK-19, IN-4
  /** @purity non-pure */
  function watchDocumentTitleField(field: HTMLElement, entry: TextEntryControl): void {
    const isStanding = (): boolean => documentTitleEntry === entry

    field.addEventListener('change', () => {
      if (!isStanding()) return
      settleDocumentTitle()
    })
    field.addEventListener('input', () => {
      if (!isStanding()) return
      isDocumentTitleTakenBack = false
    })
    field.addEventListener('focusout', () => {
      if (!isStanding()) return
      closeDocumentTitleField()
    })
    field.addEventListener('keydown', (event: Event) => {
      if (!isStanding()) return
      if ((event as { key?: unknown }).key !== HOST_ESCAPE_KEY) return
      if (isPressTakenByStandingNotice(HOST_ESCAPE_KEY)) return
      if (isDocumentTitleTakenBack) {
        closeDocumentTitleField()
        return
      }
      // TRAP: do not close the field on this press: this listener runs before the shell's (IN-4).
      entry.value = documentTitleValueAtFocus
      isDocumentTitleTakenBack = true
    })
    field.addEventListener(HOST_KEY_RELEASE, (event: Event) => {
      if (!isStanding() || !isDocumentTitleTakenBack) return
      if ((event as { key?: unknown }).key !== HOST_ESCAPE_KEY) return
      closeDocumentTitleField()
    })
    field.addEventListener('keydown', (event: Event) => {
      if (!isStanding()) return
      const key = event as Partial<KeyboardEvent>
      if (key.key !== HOST_ENTER || key.isComposing === true) return
      if (key.ctrlKey === true || key.altKey === true) return
      if (key.metaKey === true || key.shiftKey === true) return
      if (isPressTakenByStandingNotice(HOST_ENTER)) return
      settleDocumentTitle()
      closeDocumentTitleField()
    })
  }

  // see FR-020
  /** @purity semi-pure-b */
  function readWatermarkUnlockAnswer(): string {
    return watermarkUnlockEntry === null ? '' : watermarkUnlockEntry.value
  }

  // WHY: held by focus, not by contents: a keydown is answered before the character lands,
  // so the first keystroke would reach table T-036.
  let isWatermarkUnlockHeld = false
  let isWatermarkUnlockTakenBack = false
  // see FR-020
  /** @purity non-pure */
  function watchWatermarkUnlock(surface: HTMLElement): void {
    // WHY: focused here, not by the browser: the input seam prevents this pointerdown, and a
    // prevented pointerdown gives no focus.
    surface.addEventListener('pointerdown', (event: Event) => {
      const field = watermarkUnlockEntry
      if (field === null) return
      if ((event as { target?: unknown }).target !== (field as unknown)) return
      if (typeof field.focus === 'function') field.focus()
    })
    surface.addEventListener('focusin', (event: Event) => {
      isWatermarkUnlockHeld =
        watermarkUnlockEntry !== null &&
        (event as { target?: unknown }).target === (watermarkUnlockEntry as unknown)
      isWatermarkUnlockTakenBack = false
    })
    surface.addEventListener('focusout', () => {
      isWatermarkUnlockHeld = false
      isWatermarkUnlockTakenBack = false
    })
    surface.addEventListener('input', () => {
      isWatermarkUnlockTakenBack = false
    })
    surface.addEventListener('keydown', (event: Event) => {
      const held = watermarkUnlockEntry
      if (held === null || !isWatermarkUnlockHeld) return
      if ((event as { key?: unknown }).key !== HOST_ESCAPE_KEY) return
      if (isPressTakenByStandingNotice(HOST_ESCAPE_KEY)) return
      if (isWatermarkUnlockTakenBack) {
        releaseTakenBackWatermarkUnlock(held)
        return
      }
      held.value = ''
      isWatermarkUnlockTakenBack = true
    })

    /** @purity non-pure */
    surface.addEventListener(HOST_KEY_RELEASE, (event: Event) => {
      const held = watermarkUnlockEntry
      if (held === null || !isWatermarkUnlockTakenBack) return
      if ((event as { key?: unknown }).key !== HOST_ESCAPE_KEY) return
      releaseTakenBackWatermarkUnlock(held)
    })
  }

  // see IN-4, WS-2
  /** @purity non-pure */
  function releaseTakenBackWatermarkUnlock(held: TextEntryControl): void {
    if (watermarkUnlockEntry !== held || !isWatermarkUnlockTakenBack) return
    if (typeof held.blur === 'function') held.blur()
    isWatermarkUnlockHeld = false
    isWatermarkUnlockTakenBack = false
  }

  // see IN-5a, WS-2
  /** @purity semi-pure-b */
  function hasUnsettledTextEntry(): boolean {
    return heldTextControl !== null || isWatermarkUnlockHeld || documentTitleEntry !== null
  }

  /** @purity semi-pure-b */
  function readFieldCommit(): FieldCommit | null {
    const held = fieldCommit
    fieldCommit = null
    return held
  }

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

  wiring.holdFocusPropertyField?.(focusPropertyField)

  wiring.holdReadWatermarkUnlockAnswer?.(readWatermarkUnlockAnswer)

  // WHY: focusPropertyField travels on the wiring: the IF-9 cell of table T-065 names exactly these.
  return {
    showScreenView,
    readDialogueInput,
    readFieldCommit,
    readScreenPartAt,
    hasUnsettledTextEntry,
  }
}

// <generated -- do not edit by hand>
// Single source of truth:
//   docs/spec/_source/settings.json (tables T-206 and T-236)
// Rebuild: npm run gen   ||   npm run gen:check fails on drift.
// see T-206
export const NOT_STORED_ICON_SIZES: {
  readonly 'S-138': number
  readonly 'S-141': number
} = {
  'S-138': 16,
  'S-141': 4,
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
export const NOT_STORED_STATE_GROUND_PERCENTS: {
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
export const NOT_STORED_DOCUMENT_TITLE_SIZES: {
  readonly 'S-225': number
  readonly 'S-226': number
} = {
  'S-225': 16,
  'S-226': 12,
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
  'S-151': { light: 'hsl(H 59% 32%)', dark: 'hsl(H 62% 68%)', followsHue: true },
  'S-152': { light: '#1f7a3d', dark: '#6fc98d', followsHue: false },
  'S-183': { light: '#1f7a3d', dark: '#6fc98d', followsHue: false },
  'S-153': { light: '#a8600f', dark: '#e0a353', followsHue: false },
  'S-154': { light: '#a02b2b', dark: '#e07a7a', followsHue: false },
  'S-170': { light: 'rgba(0,0,0,0.28)', dark: 'rgba(0,0,0,0.6)', followsHue: false },
}
// </generated>
