// DomScreenSurface -- public entry of this folder.
//
// @unit      UF-71   (docs/spec/05-07-design.md, table T-075)
// @component DomScreenSurface, layer Framework (table T-062)
// @purity    non-pure
// @publishes table T-064 row PI-38
//
// The implementation of ScreenSurface (table T-065 IF-9, CP-38): it puts the
// description ScreenRenderer (UF-60) built onto the page and hands back what a
// person settled. ScreenRenderer is `pure`, so nothing in its description is a
// node; this unit is where the nodes are made. Dependency direction: LR-5 of
// table T-061; nothing inner imports this file.
//
// The app header's height is measured here (FR-051, BO-1 of table T-077),
// which is why the factory takes a callback:
//
//   1. The skeleton is mounted and measured before the factory returns, so the
//      caller has the height before it computes one `ScreenRegions`. The root
//      stays `visibility:hidden` until the first `showScreenView` -- not
//      `display:none`, because a box that is not laid out has no height.
//   1a. 0 is handed back like any other answer: withholding it would leave
//      BO-1 waiting on a step that can never finish (NFR-011).
//   2. The box is fixed by `line-height` and an `em` padding, so what it
//      measures to is the machine's text size; `overflow:hidden` and no wrap
//      keep the content's length out of it.
//   2a. Whether there is any content DOES change it: an empty flex box lays
//      out no line, so the measurement before the first description is of an
//      empty header. The redraw re-measures and reports, and BO-5's own frame
//      is its first caller (see the note after `loop = running` in the shell).
//   3. `onAppHeaderHeightPx` is called again only when a redraw measured a
//      different height (FT-3 of table T-078). The callback must only record
//      the number: waking a frame on anything else breaks NFR-010.
//
// No listener registered below schedules a frame (NFR-010):
//
//   - `keydown` on the dialogue entry only remembers the settled line; the
//     same press reaches DomInputSource, whose frame (FT-1) carries it away.
//   - `change` on the properties panel only remembers the settled value; the
//     blur or Enter that raised it reaches DomInputSource too. `change` and not
//     `input`, because FR-031 makes one property change one undo step.
//   - `focusin` / `focusout` remember whether a control is held, so a redraw
//     does not sweep away half-typed text. Watched rather than read off
//     `document.activeElement` because the wiring only offers `createElement`.
//
// Nothing listens on a tooltip (`tooltipElement` says why), and there is no
// timer here: the note under table T-078 puts the clock in the shell.
//
// Every part carries `data-role` (table T-103) and every entry `data-icon`
// (table T-109), so that:
//
//   - `readScreenPartAt`, the fourth member of IF-9, can walk them back. The
//     group and person are read off the ROW and the roster LINE because the
//     entrances drawn once per row / person sit inside them, so one walk
//     answers both which control and whose. Chapter 5.3 under table T-065
//     makes the side that drew an entry the side that answers where it is.
//   - `data-format` is not a spelling of `data-icon`: the choices on `Export
//     Chooser` (U-54) are rows of table T-024, not T-109 (FR-096).
//   - `data-notice` is not either: NT-8's entrance is a word with no row of
//     table T-109, so a press there names the telling (`Notice.dismissKey`).
//   - IN-5a's condition can be read: the entry is the only `input` inside
//     `[data-role="Dialogue Field"]`.
//   - the live DOM can be checked against the description (rule 04).
//
// Only `textContent` and `setAttribute` are written -- no `innerHTML` -- because
// a task name is untrusted input (FR-023).
//
// No system colour is left anywhere (FR-041): a system colour follows the
// operating system, not `themePreference` (S-72). Table T-236 reaches this file
// generated (`SCREEN_COLOURS` at the foot), `PAINT` names which row paints what,
// and `themeStyle` resolves one rendering onto the root. `readTheme` is a
// REQUIRED member of the wiring for that reason: an optional reader would need
// a fallback behind each `var()`, and every fallback is the environment deciding.
//
//   - The theme arrives through the wiring because no member of `ScreenView`,
//     `ScreenFrame` or `AppHeaderItems` carries S-72 / S-73; `ScreenSession`
//     holds them, but it is ScreenRenderer's argument, not its result.
//   - S-146 is not painted on this root: the root is `position:fixed` over the
//     schedule, so a background here would hide it. The page element is the box
//     behind the schedule; `pageGroundStyle` resolves its ground for
//     SingleHtmlShell, which owns that element.
//
// Entries are drawn as the shapes of figure F-019 (FR-029), which
// `tools/generate_icon_glyphs.py` carries into `icon-glyphs.json`; nothing here
// re-draws or re-scales a path.
//
//   - `CommandItem.label` leaves through `aria-label`; the shape is
//     `aria-hidden` so the accessible name still comes from the word.
//   - The figure's own light / dark media query is not carried (FR-041); a
//     shape takes `currentColor` from the entry it sits in.
//   - `createElementNS` is required: a shape made with `createElement` is an
//     unknown HTML element and draws nothing. It is asked for rather than
//     assumed, like `elementFromPoint`, so a host without namespaces still works.
//
// Rules about where the pointer is (HF-6, FR-053, FR-029's hover ground) cannot
// be inline declarations, so the unit hangs ONE `style` element off its root
// (`hoverCss`), scoped by `data-unit` and built from constants only. `:hover` is
// the environment's own hit test -- the one `elementFromPoint` answers with -- so
// there is no second hit test to disagree with it, and it matches ancestors, so
// a pointer on `Palette Groups` / `Palette Commands` counts as on the palette.
//
// The caller supplies `ScreenSurfaceWiring` below; the browser arrives rather
// than being reached for (R7.3, LY-5), so the unit runs where there is no DOM.
//
// Every name the component publishes leaves through here (Chapter 5.3).

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

// ------------------------------------------------------- the settled names ---

/**
 * This unit's row of table T-075; the root carries it and it scopes `hoverCss`.
 * Not a part name: table T-103 has no row for the whole screen.
 */
const UNIT_ROW = 'UF-71'

/**
 * The part names of table T-103, spelled as that table spells them (rule 03).
 *
 * `notices` has no row there, so it carries PI-37's member name on `ScreenView`
 * instead; no third spelling is minted.
 */
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

/**
 * The key that settles an utterance. SK-19 of table T-036 does not list the
 * `Dialogue Field`, so this is the nearest settled assignment.
 *
 * @provisional PND-150
 */
const HOST_ENTER = 'Enter'

/**
 * IC-21 of table T-109 (FR-038): the one header entry that draws something no
 * other entry does (`AppHeaderItems.language`).
 *
 * A row id because it is the only join table T-109 admits; that table has no
 * English column. The same holds for every `*_ENTRY` constant below.
 */
const DISPLAY_LANGUAGE_ENTRY = 'IC-21'

/**
 * IC-53 of table T-109 -- GR-19 of table T-023d's grab band on U-26; not an
 * entrance. `readScreenPartAt` still answers it on `ScreenPart.entry`, which is
 * the row a point is on, not something pressable.
 */
const PALETTE_GRAB_BAND_ENTRY = 'IC-53'

/**
 * IC-67 / IC-68 of table T-109 -- the one entrance FR-099 draws per person in
 * U-49, in its two states. Only one stands at a time
 * (`RosterResource.isSelected`); drawing both would offer two entrances.
 */
const ROSTER_CHOSEN_ENTRY = 'IC-67'
const ROSTER_UNCHOSEN_ENTRY = 'IC-68'

/**
 * IC-74 of table T-109 -- HF-10 of table T-051. Drawn once per panel, not per
 * row, which is why it is named here and not in `rowTitleElement`.
 */
const OPEN_EVERY_ROW_ENTRY = 'IC-74'

/**
 * IC-78 of table T-109 -- HF-12 of table T-051, placed as HF-10 is.
 * Not HF-8, which discards folds as part of the whole view (FR-055).
 */
const COLLAPSE_EVERY_ROW_ENTRY = 'IC-78'

/**
 * IC-92 of table T-109 -- HF-16 of table T-051. Not IC-74 under a second name
 * (HF-16, MUST NOT).
 */
const OPEN_LEVEL_ZERO_ENTRY = 'IC-92'

/**
 * IC-93 of table T-109 -- HF-17 of table T-051. Opens the same in-place name
 * field IC-91 does (HF-17 sends its handling to HF-14).
 */
const ADD_TOP_ROW_ENTRY = 'IC-93'

/**
 * IC-82 of table T-109 -- FR-032's deletion, drawn once per row.
 *
 * No `data-role`: table T-103 names no part for it. `readScreenPartAt` takes the
 * outermost `data-role`, so the answer is the `Row Title Panel` either way, and
 * the row's `data-group-id` says which row. That is why `ROW_CONTROL_SHOWN_CSS`
 * reaches it by `data-icon`: S-140 reserves no room, so a control drawn at rest
 * would sit over the row's name. Applying HF-6 (a folding row) to deletion is
 * this unit's reading. @provisional PND-353
 */
const DELETE_ROW_ENTRY = 'IC-82'

/**
 * IC-91 -- HF-14 of table T-051. No part in table T-103 either, so the rule
 * reaches it by `data-icon`, exactly as it reaches IC-82.
 */
const ADD_CHILD_ROW_ENTRY = 'IC-91'

/**
 * IC-90 -- HF-13 of table T-051. It carries U-47's `data-role`, so HF-6's rule
 * already reaches it; unlike the HF-1 controls it stands on every row (HF-13).
 */
const OPEN_ONE_LEVEL_ENTRY = 'IC-90'

/**
 * Carries `Notice.dismissKey` on NT-8's entrance (table T-037).
 *
 * Not `data-icon`: that attribute carries a row of table T-109 and NT-8's
 * entrance has none, so a reader handed both on one attribute could not tell
 * which table it had. Not `data-group-id` / `data-uid` / `data-panel` either:
 * those name document or frame things, not a telling.
 *
 * Read back through `ScreenPart.noticeDismissKey`
 * (`src/adapter/screen-renderer/screen-surface.ts`) and spent in
 * `src/framework/single-html-shell/frame-loop.ts` on `raisedNotices`.
 */
const NOTICE_DISMISS_KEY_ATTRIBUTE = 'data-notice'

/**
 * Which of NT-7's two answers a word button gives -- `ConfirmationAnswer.answer`.
 *
 * Not `data-icon` (NT-7, MUST NOT). Not the word itself: `Yes` / `No` come from
 * the dictionary (FR-038), so a reader keyed on them would be keyed on the
 * display language.
 */
const CONFIRMATION_ANSWER_ATTRIBUTE = 'data-confirmation-answer'

/**
 * Marks U-60 `Watermark Unlock`'s masked field (FR-020), for the read-back rule
 * 04 asks for. No decision rests on it -- `modalElement` hands the control over
 * as it makes it -- and it never carries the typed value (FR-020, MUST NOT).
 */
const WATERMARK_UNLOCK_ENTRY_ATTRIBUTE = 'data-watermark-unlock'

/**
 * Marks U-62 `Import Report`'s one entrance (FR-023 sends its word to NT-8).
 *
 * Not `data-icon`: no row of table T-109 names U-62. Not
 * `NOTICE_DISMISS_KEY_ATTRIBUTE`: the shell spends that by removing a telling,
 * and U-62 is a surface standing in S-99g, so the surface would never close.
 * Read back as `ScreenPart.isImportReportDismiss`, which
 * `input-command-translator.ts` closes S-99g's surface on.
 */
const IMPORT_REPORT_DISMISS_ATTRIBUTE = 'data-import-report-dismiss'

// -------------------------------------------------------------- the paint ---

/**
 * Which row of table T-236 paints what, and the custom property that carries it.
 *
 * The row id is the join; the values are generated into `SCREEN_COLOURS` at the
 * foot of this file, so no colour is written here. The mapping to parts is a
 * judgement: no table joins a row of T-236 to a row of table T-103.
 *
 * A row of `SCREEN_COLOURS` with no member here reports a schedule's state and
 * belongs to SvgRenderer (`tools/generate_entity_types.py`).
 *
 * S-170 is a colour, not a shadow: no row states an offset, blur or spread, so
 * those are this unit's. Searched: table T-236, table T-201, table T-206 and
 * FR-041.
 *
 * No `var()` carries a fallback: a fallback can only be a system colour, which
 * FR-041 forbids, and `readTheme` is required so the root always carries the
 * declaration.
 *
 * Several members resolve to the same row today (S-183, S-151, S-147). They are
 * kept apart because each follows a different rule (EN-1 / EN-2 / EN-4 of table
 * T-237, FR-029, FR-098, HF-15 of table T-051); one member for two rules would
 * recolour both the day either changes.
 */
const PAINT_ROW = {
  ground: 'S-146',
  ink: 'S-147',
  quiet: 'S-148',
  rule: 'S-149',
  panel: 'S-150',
  shadow: 'S-170',
  // EN-1 of table T-237: the armed entrance's fill.
  armed: 'S-183',
  // EN-2 and EN-4 of table T-237 (FR-072 sends the panel's pressed state to
  // EN-4). Separate from `armed` because `entranceStateFill` keeps the order
  // between EN-1 and EN-2.
  pressed: 'S-183',
  // EN-3 of table T-237: the fill on a pinned row's IC-60, over the panel's S-150.
  pinned: 'S-151',
  // FR-029's hover ground under an entrance. Not `ink`: that member is the text
  // colour, and nothing ties the two together.
  hoveredEntrance: 'S-147',
  // FR-098's ground under the whole pinned row; `pinned` is one control's fill.
  pinnedRow: 'S-151',
  // HF-15's two axis bands.
  grabAxisPosition: 'S-151',
  grabAxisDepth: 'S-152',
  // HF-15's ground and mark on the held row. One member for both because they
  // draw one state; split, they could be recoloured apart. Not
  // `grabAxisPosition`, which has an S-152 sibling for the depth axis.
  heldRow: 'S-151',
  // HF-18: the folded-row count (and HF-12's at 段 0).
  caution: 'S-153',
} as const

/** How a declaration names one of them. @purity pure */
function painted(name: keyof typeof PAINT_ROW): string {
  return `var(--gr-${name})`
}

/**
 * The paints, as `var()` references. There is no separate entrance ground or
 * word colour: table T-236 has one 地 and one 文字の色 (rule 03, one concept one
 * name).
 *
 * `armed` / `pressed` / `pinned` are fills (they replace an entrance's paint and
 * knock its shape out in S-146); `hoveredEntrance` / `pinnedRow` / `heldRow` are
 * grounds laid under something (`stateGround`). A ground is not a fill, so they
 * are not folded together.
 */
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

/**
 * A colour of table T-236 laid as a state ground, at a depth of table T-206
 * (FR-029, FR-098, HF-15 of table T-051).
 *
 * `color-mix` and not `opacity`: `opacity` would fade the row's name and
 * controls with the ground. Mixed with `transparent` rather than S-150, because
 * FR-029's ground is laid on several different surfaces.
 *
 * A function because the depths arrive in the generated block at the foot of
 * this file, which a `const` above it cannot read (the same holds for every
 * function below that reads a `NOT_STORED_*` block).
 *
 * @purity pure
 */
function stateGround(paint: string, depthRow: 'S-214' | 'S-215'): string {
  return `color-mix(in srgb, ${paint} ${NOT_STORED_STATE_GROUND_PERCENTS[depthRow]}%, transparent)`
}

/**
 * The room one entrance keeps around its shape: S-138 with S-141 on each side,
 * on both axes (FR-029).
 *
 * The shape is taken out of the line box and centred: left in the line box, the
 * box grows with the reader's text size and the frame moves, which S-141 says
 * does not happen. Both lengths are px from the generated block, so nothing
 * relative is left to grow.
 *
 * The frame is not touched: border and corner stay `entryStyle`'s. A `button`
 * measures border-and-all, so the height is the frame's outer edge and the sides
 * its inner one; adding the border's thickness would move the frame by a value
 * the specification does not hold. The doubling is left to `calc()` so no
 * doubled number is written here.
 *
 * @purity pure
 */
function entryGlyphRoom(): string {
  const side = NOT_STORED_ICON_SIZES['S-138']
  const gap = NOT_STORED_ICON_SIZES['S-141']
  return (
    'display:inline-flex;align-items:center;justify-content:center;' +
    `padding:0 ${gap}px;` +
    `min-height:calc(${side}px + ${gap}px * 2);`
  )
}

/**
 * FR-006's property field sizes, named once (table T-206, generated from
 * `_source/settings.json`).
 *
 * S-188 is not read: FR-006 (MUST NOT) forbids drawing the value in front of its
 * control, so nothing here draws a swatch.
 *
 * The last two are ratios, written with `em` so the panel follows the host's
 * text size (FR-006, NFR-007).
 *
 * @purity pure
 */
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
    /** S-198: multiplied on top of S-197. */
    nameTextScale: NOT_STORED_PROPERTY_FIELD_SIZES['S-198'],
  }
}

/**
 * U-25's own box: padded by S-192, lettered by S-197 (FR-006).
 *
 * The text size sits on the panel box because `font-size` inherits: `em` here
 * resolves against a parent that states no size, so it multiplies the host's
 * base. Not `fontScaleSizes[fontScale]` of table T-215, which sizes the schedule
 * (FR-006).
 *
 * Form controls do not inherit a font by default, which is why
 * `propertyControlStyle`, `propertyColorStyle` and `propertyCheckStyle` open with
 * `font:inherit`.
 *
 * Not a member of `STYLE`: S-192 is px, and `STYLE` holds only relative lengths.
 *
 * @purity pure
 */
function propertiesPanelStyle(): string {
  const size = fieldSizes()
  return (
    `${STYLE.propertiesPanel}padding:${size.panelPadY}px ${size.panelPadX}px;` +
    `font-size:${size.textScale}em;`
  )
}

/**
 * Where U-25's entries stand, with no heading row to sit beside (FR-072).
 *
 * `margin-left:auto` on the first field's flex line pushes them to the far end
 * at every width S-80 allows. `justify-content` only matters when there is no
 * field and the box stands alone. The gap reuses S-190.
 *
 * @purity pure
 */
function propertyWayOutStyle(): string {
  return (
    'display:flex;align-items:flex-start;justify-content:flex-end;' +
    `gap:${fieldSizes().nameGap}px;margin-left:auto;`
  )
}

/**
 * One field of U-25: S-190 across, S-191 down.
 *
 * `flex-start` because a multi-line control (S-193) is taller than its name, and
 * centring would move the name off the column the reader scans down.
 *
 * @purity pure
 */
function propertyFieldStyle(): string {
  const size = fieldSizes()
  return (
    `display:flex;align-items:flex-start;gap:${size.nameGap}px;` +
    `margin-bottom:${size.rowGap}px;line-height:1.6;`
  )
}

/**
 * The name half of one field (FR-006).
 *
 * S-189 is a percentage because S-80 lets the panel be dragged wider. `em`
 * resolves against the panel's S-197 size, so S-198 compounds on it.
 *
 * @purity pure
 */
function propertyFieldNameStyle(): string {
  const size = fieldSizes()
  return (
    `color:${PAINT.quiet};flex:0 0 ${size.namePercent}%;` +
    `text-align:right;font-size:${size.nameTextScale}em;`
  )
}

/**
 * EZ-2 of table T-040: the tooltip's text size (S-204), as a coefficient.
 *
 * @purity pure
 */
function tooltipStyle(): string {
  return `${STYLE.tooltip}font-size:${NOT_STORED_HELP_SIZES['S-204']}em;`
}

function helpColumnsStyle(): string {
  // S-202 (FR-036). `column-count` lets the browser divide whatever width the
  // surface came out at, so no pixel width is held.
  return `column-count:${NOT_STORED_HELP_SIZES['S-202']};column-gap:1.5em;`
}

function helpStyle(): string {
  // S-201 of the viewport on both axes (FR-036). `vw` / `vh` rather than a
  // window size read once, so the share follows a resize. A size, not only a
  // maximum, and it overrides `STOPPING_BOX`'s 92% caps, which would otherwise
  // win over the share. `overflow` serves the scrolling FR-036 allows below MC-6.
  const share = NOT_STORED_HELP_SIZES['S-201'] * 100
  // S-203, set on the box so the entries and their `em` shapes inherit it.
  return (
    `width:${share}vw;max-width:${share}vw;` +
    `height:${share}vh;max-height:${share}vh;overflow:auto;` +
    `font-size:${NOT_STORED_HELP_SIZES['S-203']}em;`
  )
}

function propertyControlsStyle(): string {
  return `flex:1;display:flex;flex-wrap:wrap;align-items:flex-start;gap:${fieldSizes().nameGap}px;min-width:0;`
}

/**
 * One control that takes room. S-186 is a minimum, not a height, so enlarged
 * text is not cut off (NFR-007).
 *
 * STOP -- the specification does not say how narrow a control may be before its
 * value is cut off; PR-3 of table T-016 meets it first, its two date controls
 * halving the value side. FR-093's date estimate alone does not answer it: a
 * row is missing for the room a control's frame and the host's date editor take
 * beside the value, and for a field whose controls cannot all be given it.
 * Searched: FR-006, FR-093, FR-029, table T-016 (PR-3), and the S-186 .. S-198
 * run of table T-206 beside S-171 and S-80. No width is invented here.
 *
 * @purity pure
 */
function propertyControlStyle(widthInFontSizes: number): string {
  return (
    `font:inherit;box-sizing:border-box;flex:1;min-width:${widthInFontSizes}em;` +
    `min-height:${fieldSizes().controlMinHeight}px;` +
    `background:${PAINT.ground};color:${PAINT.ink};border:1px solid ${PAINT.rule};`
  )
}

/**
 * A colour control, at S-187 rather than S-186 (see that row). S-187 stays even
 * though no swatch is drawn here any more (FR-006): the row holds the reference
 * implementation's measurement, and this side does not solve a row away.
 *
 * @purity pure
 */
function propertyColorStyle(): string {
  return (
    'font:inherit;box-sizing:border-box;flex:1;min-width:0;padding:0;' +
    `min-height:${fieldSizes().colorMinHeight}px;` +
    `background:${PAINT.ground};border:1px solid ${PAINT.rule};`
  )
}

/**
 * A truth value: the one control that does not stretch, since a field-wide
 * checkbox reads as a box to type in. S-186 does not apply to it.
 *
 * @purity pure
 */
function propertyCheckStyle(): string {
  return 'font:inherit;'
}

/**
 * One entrance's frame, in FR-029's usable state.
 *
 * Not a member of `STYLE`: it reaches px lengths (S-138, S-141) through
 * `entryGlyphRoom`.
 *
 * @purity pure
 */
function entryStyle(): string {
  return (
    `font:inherit;background:${PAINT.panel};color:${PAINT.ink};` +
    `border:1px solid ${PAINT.rule};border-radius:0.25em;cursor:pointer;` +
    entryGlyphRoom()
  )
}

/**
 * The same frame for an entrance FR-029 draws faint, in S-149 (`PAINT.rule`), so
 * frame and shape are one colour here.
 *
 * `commandEntry` writes `aria-disabled`, not `disabled`: a disabled control
 * leaves the accessibility tree and stops taking the pointer, which would lose
 * IN-3's tooltip and the `data-icon` answer PND-141 reads.
 *
 * @purity pure
 */
function entryFaintStyle(): string {
  return (
    `font:inherit;background:${PAINT.panel};color:${PAINT.rule};` +
    `border:1px solid ${PAINT.rule};border-radius:0.25em;cursor:default;` +
    entryGlyphRoom()
  )
}

/**
 * The fill rows of table T-237, in that table's order; the first row that stands
 * wins.
 *
 * An ordered list, not an object read with `Object.keys`, so the precedence does
 * not depend on key enumeration. No pair of rows is assumed impossible. Rows
 * that resolve to one colour today stay separate rows.
 */
const ENTRANCE_STATE_FILL = [
  ['EN-1', PAINT.armed],
  ['EN-2', PAINT.pressed],
  ['EN-3', PAINT.pinned],
  ['EN-4', PAINT.pressed],
] as const

/** One row id of table T-237. */
type EntranceStateRow = (typeof ENTRANCE_STATE_FILL)[number][0]

/**
 * FR-029's fill for an entrance in effect: the box filled, the shape knocked out
 * in S-146 (`PAINT.ground`), so it separates in both renderings.
 *
 * Needed because `data-armed` / `data-pressed` / `data-pinned` paint nothing:
 * there is no `.css` file under `src/`, and every rule here is inline. Figure
 * F-019 paints `currentColor`, so `color:` is what knocks the shape out.
 *
 * `aria-pressed` carries the state for the accessibility tree (`commandEntry`),
 * never on the armed entry, which FR-053 refuses to draw as pressed.
 *
 * The caller appends this only to an entrance that can be used: a fill over
 * FR-029's faintness is refused, and `commandEntry` offers no row for an
 * entrance it drew faint. One shape for every row, so there is no second
 * function. Returns '' when no row stands, so callers append unconditionally.
 *
 * @purity pure
 */
function entranceStateFill(standing: readonly EntranceStateRow[]): string {
  for (const [rowId, colour] of ENTRANCE_STATE_FILL) {
    if (standing.includes(rowId)) return `background:${colour};color:${PAINT.ground};`
  }
  return ''
}

/**
 * The line between two palette groups (FR-053): S-143's thickness and clearance,
 * in S-149, the separating-line colour `dividerLine` also reads. The clearance
 * is one value applied to all four sides.
 *
 * `pointer-events:none`: the rule has no row in table T-103 or T-109, so a point
 * on it has to answer as the palette (IF-9's `readScreenPartAt`).
 *
 * @purity pure
 */
function paletteGroupRuleStyle(): string {
  const [thickness, clearance] = NOT_STORED_PALETTE_GROUP_RULE_SIZES['S-143']
  return (
    `height:${thickness}px;margin:${clearance}px;` +
    `background:${PAINT.rule};pointer-events:none;`
  )
}

/**
 * The band U-27 `Document Title` stands in, with S-226's left inset.
 *
 * EP-1 of table T-076: `image-exporter.ts` reads S-225 and S-226 from the same
 * generated block, so screen and export share one row each. Only the left
 * inset is the row's; the other paddings stay relative, because BO-1 measures
 * the band's height from them (FR-051).
 *
 * @purity pure
 */
function appHeaderStyle(): string {
  const inset = NOT_STORED_DOCUMENT_TITLE_SIZES['S-226']
  return `${STYLE.appHeader}padding-left:${inset}px;`
}

/**
 * The name itself, at S-225 (EP-1). Split from `appHeaderStyle` because the
 * inset belongs to the band and the size to the name inside it.
 *
 * @purity pure
 */
function documentTitleStyle(): string {
  const size = NOT_STORED_DOCUMENT_TITLE_SIZES['S-225']
  return `${STYLE.documentTitle}font-size:${size}px;`
}

// -------------------------------------------------------------- the styles ---

/**
 * What the `Autosave Status`'s letters multiply the host's base by.
 *
 * No row of table T-206 holds a text coefficient for the `App Header`; PND-326
 * names the row that must exist. Until then this value is not the
 * specification's. A coefficient, not px (NFR-007); not table T-215's
 * `fontScaleSizes`, which sizes the schedule, not the frame around it (FR-006).
 *
 * @provisional PND-326
 */
const FILE_STATUS_TEXT_SCALE = 0.75

/**
 * The box a part that stops the reading takes: centred, over everything, taking
 * the pointer. Shared by the surface IN-4 of table T-028 closes with Esc and by
 * U-55 `Confirmation` (NT-7); what they share is the reason for the place, so a
 * change here is meant to reach both.
 *
 * @provisional PND-151
 */
const STOPPING_BOX =
  'position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);' +
  'box-sizing:border-box;max-width:92%;max-height:92%;overflow:auto;padding:1em;' +
  `background:${PAINT.ground};color:${PAINT.ink};border:1px solid ${PAINT.rule};` +
  `box-shadow:0 0.5em 1.5em ${PAINT.shadow};pointer-events:auto;`

/**
 * How the parts are placed and painted.
 *
 * Not values of the specification. Every length here is relative (`em`, a
 * percentage, a hairline) so that what BO-1 measures is the environment's answer
 * (FR-051); anything in px lives in a function that reads the generated block.
 * `ScreenView` leaves the places of parts without a rectangle to this surface.
 *
 * @provisional PND-151
 */
const STYLE = {
  root:
    'position:fixed;left:0;top:0;right:0;bottom:0;pointer-events:none;' +
    `visibility:hidden;font:inherit;color:${PAINT.ink};`,
  // The same box once a description has arrived (BO-1 of table T-077).
  rootShown:
    'position:fixed;left:0;top:0;right:0;bottom:0;pointer-events:none;' +
    `font:inherit;color:${PAINT.ink};`,
  layer: 'position:absolute;left:0;top:0;right:0;bottom:0;pointer-events:none;',
  // The height this box measures to is what FR-051 reads; nothing inside can
  // stretch it.
  appHeader:
    'position:absolute;left:0;top:0;right:0;box-sizing:border-box;display:flex;' +
    'align-items:center;gap:0.75em;padding:0.375em 0.75em;line-height:1.5;' +
    `overflow:hidden;white-space:nowrap;background:${PAINT.ground};color:${PAINT.ink};` +
    `border-bottom:1px solid ${PAINT.rule};pointer-events:auto;`,
  documentTitle: 'font-weight:600;overflow:hidden;text-overflow:ellipsis;',
  // FR-035's in-place name field. Every declaration keeps the box the size of
  // the text it replaces: the header height is measured on redraw frames, not on
  // the press that opens this field, so a taller field would misplace everything
  // below the header. `font:inherit` because a host gives an input its own font.
  // Paint is inherited so it follows the theme. The host's focus ring is left
  // alone: it is what shows the person is typing.
  documentTitleEntry:
    'box-sizing:border-box;width:100%;min-width:0;font:inherit;color:inherit;' +
    'background:transparent;border:0;padding:0;margin:0;',
  // Smaller text (`FILE_STATUS_TEXT_SCALE`). It cannot make the measured header
  // height wrong, but it can lower it if this was the tallest box. A column puts
  // the name above the time (FR-101) without a stated offset.
  fileStatus:
    `margin-left:auto;color:${PAINT.quiet};display:flex;` +
    `flex-direction:column;align-items:flex-end;line-height:1.2;` +
    `font-size:${FILE_STATUS_TEXT_SCALE}em;`,
  openedFileName: 'overflow:hidden;text-overflow:ellipsis;max-width:24ch;',
  fileSavedAt: '',
  headerCommands: 'display:flex;align-items:center;gap:0.25em;',
  // Entrance frames and shape boxes are not here: `entryStyle`,
  // `entryFaintStyle` and `glyphStyle` hold them because they are px.

  // FR-038's language code beside the shape. No colour of its own, so it follows
  // the entry's ink and faintness. Smaller and on a line box of its own height so
  // the measured header height is unchanged. `pointer-events:none` so
  // `readScreenPartAt` reads the button, not this child.
  languageCode:
    'display:inline-block;vertical-align:middle;margin-left:0.25em;' +
    'font-family:monospace;font-size:0.8em;line-height:1;pointer-events:none;',
  // EP-9 of table T-076: the grabbed band carries no paint of its own.
  dividerBand: 'cursor:col-resize;pointer-events:auto;',
  dividerLine: `background:${PAINT.rule};pointer-events:none;`,
  scrollbarTrack: `background:${PAINT.panel};pointer-events:auto;`,
  scrollbarThumb: `position:absolute;background:${PAINT.quiet};border-radius:0.25em;`,
  rowTitlePanel: `position:absolute;background:${PAINT.panel};`,
  // HF-10 of table T-051: top right, with no inset added.
  // `pointer-events:auto` because neither the root nor the panel takes the
  // pointer; without it the entrance could not be pressed or read back.
  panelCornerEntry: 'position:absolute;top:0;right:0;pointer-events:auto;',
  // HF-5 of table T-051: controls levelled with the top of the name. IF-9 does
  // not carry where the name sits in the band, so no offset could be stated.
  // No `gap`: the one gap (S-218, GR-20's strip to the name) is px and is set in
  // `rowTitleElement`. It must be that fixed number because FR-085 subtracts it
  // before cutting the name; an `em` gap would grow and eat into the name.
  rowTitle:
    'box-sizing:border-box;display:flex;align-items:flex-start;' +
    `overflow:hidden;white-space:nowrap;background:${PAINT.panel};color:${PAINT.ink};` +
    'pointer-events:auto;',
  // HF-4 of table T-051: the name takes the leftover width, so the controls stay
  // at the right edge. Depth is the row's left padding (`RowTitle.indentPx`), so
  // indentation moves the name and not the controls.
  rowLabel: 'flex:1;overflow:hidden;text-overflow:ellipsis;',
  // HF-6 of table T-051: whether a control is drawn is `ROW_CONTROL_SHOWN_CSS`,
  // since an inline declaration cannot depend on the pointer. FR-098 sends the
  // `Row Pin` to the same row.
  //
  // No `entryGlyphRoom`: this control has no frame for a gap to be held off, and
  // a self-centring box would read as the centring HF-5 forbids. Its box comes
  // from `rowControlBoxStyle` (S-138 plus S-141 each side, both axes), which also
  // gives EN-3's fill a filled icon rather than a band; left to the line box, the
  // height would grow with the text.
  //
  // Out of the flow on purpose: in the flex row each control would hold a box,
  // the name would get less than FR-085 cut it against (S-140), and the
  // browser's ellipsis would cut it with `isLabelTruncated` still false -- so the
  // tooltip for a cut name would never be raised. The reserved room stays the
  // same whether the controls are drawn or not.
  rowControl:
    // No `top`: an out-of-flow box without one keeps its static position, the
    // row's content top, which is where HF-5 puts it.
    // Transparent: HF-6 forbids a ground per control; the row's one ground is
    // `rowControlGroundStyle`.
    // `pointer-events:auto` stated, not inherited: inside HF-1's lattice
    // (`rowControlGridStyle`, which takes no pointer) inheritance would give
    // `none`.
    // The box is `rowControlBoxStyle`, appended where the control is made.
    `position:absolute;font:inherit;background:transparent;color:${PAINT.ink};` +
    'border:none;cursor:pointer;pointer-events:auto;',
  // FR-029's faint state, in S-149 like `entryFaintStyle`, because the faintness
  // may not differ by surface; the cursor matches for the same reason. Appended
  // to `rowControl` rather than a second declaration. Never `disabled`:
  // `rowControlElement` writes `aria-disabled` (see `entryFaintStyle`).
  rowControlFaintInk: `color:${PAINT.rule};cursor:default;`,
  // SC-5 of table T-031. The padding (S-192, px) is in `propertiesPanelStyle`.
  propertiesPanel:
    'position:absolute;box-sizing:border-box;overflow-y:auto;' +
    `background:${PAINT.panel};color:${PAINT.ink};border-left:1px solid ${PAINT.rule};` +
    'pointer-events:auto;',
  heading: 'font-weight:600;margin:0 0 0.5em 0;',
  // The name / value line for every surface except the properties panel, whose
  // px lengths (`propertyFieldStyle`) would otherwise reach the resource roster
  // and FR-088's weekdays.
  field: 'display:flex;gap:0.5em;line-height:1.6;',
  fieldName: `color:${PAINT.quiet};min-width:9em;`,
  // No width or height (FR-053): `cornerStyle` places the palette and an
  // absolutely placed box with no extent sizes to its contents.
  //
  // No `overflow:auto`: while the placed extent was empty it scrolled everything
  // out of view, and SC-6 of table T-031 grants the palette no scrolling.
  //
  // STOP -- not decided by the specification: what a palette larger than the
  // window does. Searched: FR-053, FR-029, table T-031, table T-103 and table
  // T-109. Nothing is done; a person can drag the overflowing part into view.
  //
  // No padding: GR-19 of table T-023d lays the grab band along the top edge, and
  // padding would inset it. The room moved to `paletteContents`.
  commandPalette:
    `box-sizing:border-box;background:${PAINT.panel};color:${PAINT.ink};` +
    `border:1px solid ${PAINT.rule};border-radius:0.25em;` +
    `box-shadow:0 0.5em 1.5em ${PAINT.shadow};pointer-events:auto;`,
  // GR-19 of table T-023d, laid as the palette's first child so its width
  // follows the entries. Its height arrives on the description, per frame.
  //
  // STOP -- not decided by the specification: how the band is painted. Searched:
  // GR-19 and the preamble of table T-023d, FR-053, FR-029, table T-051 (HF-6),
  // table T-076 (EP-9) and `_assets/tbl-settings.md`. It carries no paint, like
  // `dividerBand`; IC-53's shape (`grabBandElement`) and `cursor:grab` tell a
  // person it can be held.
  //
  // `justify-content:flex-end` puts IC-53 at the right end with IC-75 after it
  // (FR-053); centring would leave the mark mid-band.
  // STOP -- no row states the gap between the two marks or the band's edge room.
  // Searched: FR-053, FR-029, GR-19 and the preamble of 表 T-023d, 表 T-109,
  // 表 T-206 (`S-135a`) and `_assets/tbl-settings.md`. They are laid flush.
  paletteGrabBand:
    'display:flex;align-items:center;justify-content:flex-end;' +
    'cursor:grab;pointer-events:auto;position:relative;',
  // The minimise toggle rides in the flow after IC-53 in both states. Out of the
  // flow (`position:absolute;right:0`) it would leave IC-53 centred when shown,
  // and land left of IC-53 when minimised, since nothing else gives the palette a
  // width. `cursor:pointer`: it is pressed, not dragged.
  paletteMinimise:
    'position:relative;display:flex;align-items:center;' +
    'cursor:pointer;pointer-events:auto;',
  // The palette's padding, one box in so the band reaches the edges. No
  // `data-role`, so `readScreenPartAt` walks past it to the palette.
  paletteContents: 'padding:0.5em;',
  // Empty on purpose: FR-053 prints no caption, and a gap beside S-143's line
  // (`paletteGroupRuleStyle`) would be a second boundary.
  paletteGroup: '',
  paletteCommands: 'display:flex;flex-wrap:wrap;gap:0.25em;',
  // S-147, not S-151: table T-236 keeps the emphasis colour for selection and
  // current position, and armed is neither; FR-053 asks only for legibility.
  armedText: `color:${PAINT.ink};`,
  modal: STOPPING_BOX,
  // A heading with its surface's entries beside it. Not used by the properties
  // panel (FR-072); the name stays general because the row belongs to a surface.
  surfaceHeader: 'display:flex;align-items:center;gap:0.75em;margin-bottom:0.5em;',
  // One line per help row (FR-036). `break-inside:avoid` keeps an entry in one
  // column. The 1.35 line height is what lets the list fit at MC-6 of table
  // T-025 without scrolling; 1.6 pushed the heading out.
  helpEntry: 'display:flex;align-items:baseline;gap:0.5em;break-inside:avoid;line-height:1.35;',
  // Takes the leftover room, so keys and shape keep their place whatever the
  // language's word length (FR-038).
  helpText: 'flex:1;min-width:0;',
  // A width is kept for a row with no assignment; `modalElement` says why nothing
  // is drawn there.
  helpKeys: 'flex:0 0 auto;opacity:0.75;white-space:nowrap;',
  // The text size (S-203) is set by `helpStyle` on the surface box.
  helpGlyph: 'flex:0 0 auto;display:inline-flex;align-items:center;',
  // FR-069's three, folded under the copyright line; `modalElement` says why.
  helpLegal: 'margin-top:0.75em;border-top:1px solid currentColor;padding-top:0.5em;',
  helpLegalSummary: 'cursor:pointer;',
  helpLegalText: 'white-space:pre-wrap;margin:0.5em 0 0;',
  // FR-096's format choices, in the description's order (table T-024's).
  formatChoices: 'display:flex;flex-wrap:wrap;gap:0.25em;margin-top:0.5em;',
  // NT-9 of table T-037: the layer takes the whole width and only centres.
  // No `left:50%` with a transform: such a box shrinks to the half window left of
  // it, capping by a screen percentage (NT-9, MUST NOT). No `max-width` either:
  // it would wrap NT-8's entrance off the line.
  // `pointer-events:none` so the full-width layer does not block the schedule;
  // `notice` takes the pointer back.
  notices:
    'position:absolute;left:0;right:0;pointer-events:none;' +
    'display:flex;flex-direction:column;align-items:center;',
  // NT-9: the telling on one line; `flex-wrap` lets it break only when the
  // window is too narrow, keeping NT-8's entrance on screen.
  notice:
    `box-sizing:border-box;margin:0.25em 0;padding:0.5em 0.75em;background:${PAINT.ground};` +
    `color:${PAINT.ink};border:1px solid ${PAINT.rule};pointer-events:auto;` +
    'display:flex;flex-wrap:wrap;align-items:center;gap:0.5em;',
  // NT-8's entrance. No `margin-top`, which would drop it under the words
  // (NT-9). `flex:none` stops the word being squeezed unreadable. Frame is
  // `entryStyle`'s.
  noticeDismiss: 'flex:none;',
  // NT-3a's next step. Not `STYLE.fieldName`, whose fixed `min-width` would hold
  // the box open (NT-9); only the quiet colour is kept.
  noticeNextStep: `color:${PAINT.quiet};`,
  // `pointer-events:auto` so `readScreenPartAt` sees this surface and NT-7's
  // answers can be pressed.
  // A column: `STOPPING_BOX` scrolls as a whole, so a long FR-032 name list
  // would push the answers out of reach. Names scroll; answers do not. No new
  // size (searched: table T-206's S- rows, table T-212, table T-103, FR-032,
  // NT-7).
  confirmation: STOPPING_BOX + 'display:flex;flex-direction:column;',
  // The scrolling half. `min-height:0` lets a flex child shrink below its
  // content; without it the region grows the box instead of scrolling.
  confirmationNames: 'flex:1 1 auto;min-height:0;overflow:auto;',
  // NT-7: one element per name.
  confirmationItem: 'display:block;line-height:1.6;',
  // FR-032's mark (PND-175). Only a gap: NT-1 forbids colour or border carrying
  // the meaning.
  confirmationMark: 'margin-left:0.5em;',
  // The answers, apart from the names. `flex:0 0 auto` keeps them out of the
  // scrolling region (see `confirmation`).
  confirmationAnswers:
    'flex:0 0 auto;display:flex;align-items:center;gap:0.5em;margin-top:0.5em;',
  // `flex:none` keeps the word whole, as for `noticeDismiss`.
  confirmationAnswer: 'flex:none;',
  // U-62 `Import Report` as a column over `STYLE.modal`, for `confirmation`'s
  // reason: its one entrance must stay reachable below a long list. No new
  // length (searched: table T-103, table T-206's S- rows, table T-212, FR-023).
  importReportBox: 'display:flex;flex-direction:column;',
  // U-62 reuses `confirmationNames` and `confirmationAnswers` for the same job.
  // NT-7: the first letter of each answer bold, and nothing else. Stated because
  // `entryStyle`'s `font:inherit` resets the weight a `<strong>` would get.
  confirmationAnswerInitial: 'font-weight:bold;',
  // FR-020's masked field. Masking is the field's `type`; this makes it fill the
  // box, and `font:inherit` matches the surface text.
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
  // IN-3 of table T-028: it can be pointed at, so it takes the pointer. The text
  // size (S-204, EZ-2) is added by `tooltipStyle`.
  tooltip:
    `position:absolute;max-width:24em;padding:0.25em 0.5em;background:${PAINT.ground};` +
    `color:${PAINT.ink};border:1px solid ${PAINT.rule};pointer-events:auto;`,
  hidden: 'display:none;',
} as const

/**
 * The box one shape of figure F-019 is drawn in: S-138 on a side (FR-029), the
 * one declaration every entrance reaches through `fillEntry`. It sizes the
 * shape, not the entrance's outline, so the header height is unchanged.
 *
 * `inline-block` / `vertical-align` serve the one place a shape still sits on a
 * line (the palette's grab band, or a host without flex layout); inside
 * `entryGlyphRoom`'s box it is a centred flex item. `pointer-events:none` so
 * `readScreenPartAt` reads the button, which carries `data-icon`.
 *
 * @purity pure
 */
function glyphStyle(): string {
  const side = NOT_STORED_ICON_SIZES['S-138']
  return (
    'display:inline-block;vertical-align:middle;' +
    `width:${side}px;height:${side}px;pointer-events:none;`
  )
}

/**
 * The reader's rendering of table T-236 and the hue to solve it with: S-72 and
 * S-73 (AT-19), both the document's (FR-041). `light` / `dark` are the names
 * S-72 admits, not copied values.
 */
export interface ScreenTheme {
  /** S-72. */
  readonly preference: 'light' | 'dark'
  /** S-73, 0..359. */
  readonly hue: number
}

/**
 * Substitutes S-73 for the `H` a `followsHue` row of table T-236 writes.
 *
 * Replacing the first occurrence is enough: such rows write `hsl(H ...)` and no
 * other capital `H` appears in a cell.
 *
 * @purity pure
 */
function hued(written: string, followsHue: boolean, hue: number): string {
  return followsHue ? written.replace('H', String(hue)) : written
}

/**
 * FR-041 for this unit's root: every `PAINT_ROW` entry as the custom property
 * `PAINT` reads, plus `color-scheme` -- without it the panels' scrollbars stay
 * light in the dark rendering.
 *
 * S-146 is written as a property but not painted on the root, which lies over
 * the schedule; the page's ground is `pageGroundStyle`'s.
 *
 * @purity pure
 */
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

/**
 * FR-041 for the page element behind the schedule: resolved here, where
 * `SCREEN_COLOURS` is read, and written by SingleHtmlShell, which owns that
 * element; this unit writes on nothing it was not given.
 *
 * `color-scheme` is repeated because the window's own scrollbars and canvas are
 * outside this unit's root.
 *
 * Throws on a missing S-146 instead of skipping it like `themeStyle`: a ground
 * left off falls to the environment's colour (FR-041, MUST NOT). A generated
 * block without S-146 is caught by `npm run gen:check`.
 *
 * @purity pure
 */
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

/**
 * Marks the one ground HF-6 of table T-051 lays under a row's controls.
 *
 * Not `data-role` / `data-icon`: no row of table T-103 or T-109 describes it, so
 * either would make `readScreenPartAt` answer with a part never described. A
 * mark of its own (as `data-corner-band`) lets it be read back (rule 04).
 */
const ROW_CONTROL_GROUND_MARK = 'data-row-control-ground'

/**
 * Marks HF-1's 2 x 2 lattice of folding controls; a mark of its own for the
 * ground's reason.
 */
const ROW_FOLDING_GRID_MARK = 'data-row-folding-grid'

/**
 * Marks HF-4's one column holding the deletion and the addition; a mark of its
 * own for the ground's reason.
 */
const ROW_CONTROL_PAIR_MARK = 'data-row-control-pair'

/**
 * How long a quiet spell must be before the next frame re-measures the two boxes
 * above, in ms. Not a setting: it only decides how often an already-known answer
 * is asked again (`rowControlsPanelDrawnAtMs` says why it is asked at all).
 *
 * One second sits well above the frame spacing inside a gesture, so no gesture
 * ends a lull and the hot path pays nothing, yet short enough that an unseen
 * environment change is picked up by the person's next act.
 */
const ROW_CONTROLS_LULL_MS = 1000

/**
 * Marks GR-20's grab strip along a row's left edge (table T-023d), read back as
 * `ScreenPart.isRowGrabStrip`.
 *
 * Not `data-icon`: table T-109 has no row for it (precedent: `data-panel`). Not
 * `data-role`: table T-103 has no part for it, so the walk takes the panel's
 * role, as for IC-91 and IC-82. Not `data-group-id`: the row already carries the
 * key, and the walk takes the innermost one.
 */
const ROW_GRAB_STRIP_MARK = 'data-row-grab'

/**
 * Which lane of U-21 `Scrollbars` a point is on, read back as
 * `ScreenPart.scrollbarAxis`; GR-21 of table T-023d needs it because the lanes
 * move different halves of the display position.
 *
 * Not `data-role`: table T-103 names both lanes `Scrollbars`. The value is
 * `Scrollbar['axis']`, not spelled here, as with `data-panel`.
 */
const SCROLLBAR_AXIS_ATTRIBUTE = 'data-axis'

/**
 * HF-6 of table T-051 (and FR-098 for the `Row Pin`): row controls drawn only
 * while the pointer is on the row.
 *
 * `visibility`, not `display`: the kept room may not change (HF-6), because the
 * row's name was cut against it (FR-085, S-140). A hidden control also stops
 * taking the pointer, which matches what `elementFromPoint` answers.
 *
 * Keyed on the row (`[data-group-id]`), not the name: the controls sit at the
 * right edge outside the name's box (HF-4), so a name-keyed rule would hide them
 * the moment the pointer reached them.
 *
 * A rule, not a `pointerover` listener: a row is rebuilt when the press that
 * opens a level changes the description, and the fresh node would stay undrawn
 * under a pointer that never moved; `:hover` survives the rebuild and runs no
 * frame (NFR-010).
 *
 * No `!important`: nothing writes `visibility` inline. The sheet is put on the
 * page by the script the single `.html` carries (FR-067); PO-3 of table T-232
 * (`style-src 'unsafe-inline'`) covers this element.
 */
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

/**
 * How faint the palette stands while the pointer is off it.
 *
 * STOP -- not held anywhere: FR-053 states the state and no degree. S-131
 * `dummyOpacity` belongs to the schedule's faint marks (FR-013, FR-043), so it
 * is not borrowed. Searched: FR-053, FR-029, table T-031, table T-051 (HF-6) and
 * `_assets/tbl-settings.md`. A transparency, not a colour like FR-029's S-149.
 */
const PALETTE_FAINTNESS = '0.6'

/**
 * FR-053: the palette stands faint while the pointer is not on it.
 *
 * A rule rather than a description member: the judgement is on which part the
 * pointer is over, and only this unit drew the parts (Chapter 5.3 under table
 * T-065). `:hover` answers against the laid-out boxes, and the palette has no
 * rectangle anyone else could test. It matches ancestors, so a pointer on
 * `Palette Groups` / `Palette Commands` (U-34) keeps the palette bright.
 *
 * No `!important`: nothing writes `opacity` inline. Runs no frame (NFR-010).
 */
const PALETTE_FAINT_CSS =
  `[data-unit="${UNIT_ROW}"] [data-role="${ROLE.commandPalette}"]:not(:hover)` +
  `{opacity:${PALETTE_FAINTNESS};}`

/**
 * FR-029: a ground under an entrance while a pointer rests on it, in S-147 at
 * S-214's depth.
 *
 * `button[data-icon]`: every entrance is a `button` with `data-icon`
 * (`commandEntry`, `rowControlElement`, `panelCornerEntryElement`,
 * `rosterSelectionEntry`), while IC-53's grab band is not a button; since IC-75
 * sits inside that band and `:hover` matches ancestors, `[data-icon]` alone
 * would tint the whole band.
 *
 * Excluded: faint entrances (`aria-disabled`), which must not answer the pointer
 * (FR-029), and filled ones (`data-armed` / `data-pressed` / `data-pinned`, the
 * attributes written beside `entranceStateFill`), whose fill a ground would hide.
 *
 * `!important` is needed here only: entrance grounds are inline declarations
 * (`entryStyle`, `STYLE.rowControl`), which outrank any rule.
 *
 * A function because the depth comes from the generated block.
 *
 * @purity pure
 */
function entranceHoverGroundCss(): string {
  return (
    `[data-unit="${UNIT_ROW}"] button[data-icon]:not([aria-disabled="true"])` +
    ':not([data-armed="true"]):not([data-pressed="true"]):not([data-pinned="true"])' +
    `:hover{background:${stateGround(PAINT.hoveredEntrance, 'S-214')} !important;}`
  )
}

/**
 * Every pointer-position rule, as one sheet. Built from constants only, so it is
 * written once and never rewritten. A function because
 * `entranceHoverGroundCss` reads the generated block.
 *
 * @purity pure
 */
function hoverCss(): string {
  return ROW_CONTROL_SHOWN_CSS + PALETTE_FAINT_CSS + entranceHoverGroundCss()
}

/** The SVG namespace; an element made outside it is an unknown HTML element. */
const SVG_NAMESPACE = 'http://www.w3.org/2000/svg'

/**
 * The shapes of figure F-019 by table T-109 row id (FR-029), from
 * `icon-glyphs.json` (`tools/generate_icon_glyphs.py`). No shape is chosen here.
 *
 * A module constant compiled in, so reading it does not make the builders
 * `semi-pure-a`. A `Map` because descriptions are built every frame and rule 05
 * forbids a linear search on that path (NFR-013).
 */
const GLYPH_BY_ROW = new Map(iconGlyphs.glyphs.map((one) => [one.rowId, one.elements]))

// --------------------------------------------------------------------- pure --

/**
 * A rectangle as an absolute place, in window coordinates: every layer spans the
 * root and the root is pinned to the viewport, so `ScreenSession.rowBoxes` and
 * `ScreenRegions` numbers apply directly.
 *
 * @purity pure
 */
function boxStyle(box: ScreenRect): string {
  return (
    `position:absolute;left:${box.x}px;top:${box.y}px;` +
    `width:${box.width}px;height:${box.height}px;`
  )
}

/**
 * A corner as an absolute place, with no size, so the palette sizes to its
 * contents (FR-053). Window coordinates, as `boxStyle`.
 *
 * @purity pure
 */
function cornerStyle(at: { readonly x: number; readonly y: number }): string {
  return `position:absolute;left:${at.x}px;top:${at.y}px;`
}

/**
 * `boxStyle` for a box inside another absolutely placed box.
 *
 * Trap: the outer box is the containing block, so window numbers would be added
 * to its corner and GR-21's grip would land at twice the offset, unseen and
 * ungrabbable. The container is subtracted rather than making the grip a sibling,
 * because `readScreenPartAt` reads part and axis off the lane's ancestors.
 *
 * @purity pure
 */
function boxStyleWithin(box: ScreenRect, container: ScreenRect): string {
  return boxStyle({
    x: box.x - container.x,
    y: box.y - container.y,
    width: box.width,
    height: box.height,
  })
}

/**
 * A tooltip anchor as a comparable string, so the anchor element is found again
 * after a redraw only while it is the same anchor.
 *
 * @purity pure
 */
function anchorKey(anchor: TooltipAnchor): string {
  if (anchor.kind === 'icon') return `icon ${anchor.icon}`
  // EZ-6's Task is drawn into the schedule over IF-1, so this key never finds an
  // element here (`Tooltip.at` carries the point); it still tells one Task's
  // explanation from another's between frames.
  if (anchor.kind === 'task') return `task ${anchor.taskUid}`
  if (anchor.kind === 'rowTitle') return `rowTitle ${anchor.groupId}`
  return `scrollbar ${anchor.axis}`
}

/**
 * One part's description as a comparable string, so an unchanged part is not
 * rebuilt (FT-4 of table T-078 wakes frames that may change nothing visible).
 * The key order is stable because the same `pure` builder makes the value.
 *
 * @purity pure
 */
function described(part: unknown): string {
  return JSON.stringify(part) ?? ''
}

/**
 * The stamp AT-129 spells (ISO 8601, UTC, to the second), cut from
 * `toISOString` so it cannot disagree with the model's spelling.
 *
 * @purity pure
 */
function stampOf(atMs: number): string {
  return `${new Date(atMs).toISOString().slice(0, 19)}Z`
}

/**
 * Where a panel's boundary is drawn, or `null` when the frame names no divider.
 * `ScreenView` carries no rectangle for either panel, so the divider line (FR-052)
 * is the only edge this side has.
 *
 * @purity pure
 */
function panelEdge(
  frame: ScreenFrame,
  panel: 'rowTitlePanel' | 'propertiesPanel',
): ScreenRect | null {
  const divider = frame.dividers.find((one) => one.panel === panel)
  return divider === undefined ? null : divider.line
}

// ---------------------------------------------------------------- semi-pure --
//
// Between the pure section and the builders, in R7.7's order.

/**
 * AT-129's UTC stamp, shown in the reader's local zone.
 *
 * Converted on the drawing side so IF-9's value keeps AT-129's spelling; FR-101
 * settles only what is stored. Local zone, as `readToday` in the shell does for
 * FR-046. The trailing `Z` is dropped because the result is no longer UTC; no
 * offset is written, since that spelling is still open (PND-325). No month or
 * weekday words, which would be a second dictionary (FR-038).
 *
 * An unreadable stamp is returned untouched rather than as `NaN-NaN-NaN`. The
 * `+ 1` is `getMonth`'s zero base.
 *
 * @provisional PND-325
 * @purity semi-pure-b
 */
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

// ----------------------------------------------------------- the builders ----

/**
 * One element with its place already written on it.
 *
 * @purity non-pure
 */
function made(host: Document, tag: string, style: string): HTMLElement {
  const node = host.createElement(tag)
  node.setAttribute('style', style)
  return node
}

/**
 * One element that IS one of the named parts.
 *
 * @purity non-pure
 */
function part(host: Document, tag: string, role: string, style: string): HTMLElement {
  const node = made(host, tag, style)
  node.setAttribute('data-role', role)
  return node
}

/**
 * One node of a shape, made in the namespace SVG needs.
 *
 * `createElementNS` is asked for rather than assumed because a host that lays
 * nothing out (these cases run under Node; R7.3 hands the host in) has no
 * namespaces. The fallback draws nothing in a browser; it only lets such a host
 * be handed the same tag and attributes and read them back.
 *
 * @purity non-pure
 */
function shapeNode(host: Document, tag: string): Element {
  if (typeof (host as Partial<Document>).createElementNS !== 'function') {
    return host.createElement(tag)
  }
  return host.createElementNS(SVG_NAMESPACE, tag)
}

/**
 * The body of one entry: the shape figure F-019 draws for its row (FR-029).
 *
 * Only the tag and attributes `icon-glyphs.json` carries are set: no path is
 * redrawn and no colour chosen -- the figure paints `currentColor`, so the
 * shape takes its entry's colour.
 *
 * `aria-hidden` keeps the accessible name coming from `CommandItem.label`;
 * `focusable="false"` keeps hosts from putting the shape in the tab order.
 *
 * The row-id fallback is unreachable for a row of table T-109 (the generator
 * refuses a row without a shape), but `IconId` is a bare `string`, and an entry
 * with no body collapses to zero height -- unreachable by pointer and by IF-9.
 *
 * `aroundTheShape` is room around the shape that the entry may not declare
 * itself (only row controls pass it; see `rowControlGlyphGapStyle`). It must
 * not carry the shape's own box, which is `glyphStyle` (FR-029), and may not
 * change what is drawn.
 *
 * @purity non-pure
 */
function fillEntry(
  host: Document,
  entry: HTMLElement,
  icon: string,
  aroundTheShape = '',
): void {
  const drawn = GLYPH_BY_ROW.get(icon)
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

/**
 * One entry a person can press, wherever table T-109 places it.
 *
 * The word leaves through `aria-label` and the shape (figure F-019) is what is
 * seen (FR-029). The row id stands in as the name when the word is empty -- a
 * guard against a hand-edited generated file, as UF-65 keeps its own.
 *
 * @purity non-pure
 */
function commandEntry(host: Document, item: CommandItem): HTMLElement {
  // The state fill is appended to one of two base styles, never a whole style
  // per combination: table T-237's states and FR-029's faint state are
  // independent facts about one entrance.
  // Which rows of table T-237 stand is decided here; which one wins is
  // `entranceStateFill`'s, so no caller can reach a different precedence.
  // No row is offered for a faint entrance (FR-029, MUST NOT), the armed one
  // included.
  // `isPressed` is offered as EN-2 though it could be EN-4 (FR-072's IC-17):
  // the seam carries one flag and both rows state the same colour, so the
  // drawing is the same either way.
  // Flat steps rather than one nested condition (rule 03 section 4).
  const base = item.isEnabled ? entryStyle() : entryFaintStyle()
  const standing: EntranceStateRow[] = []
  if (item.isEnabled && item.isArmed) standing.push('EN-1')
  if (item.isEnabled && item.isPressed) standing.push('EN-2')
  const entry = made(host, 'button', base + entranceStateFill(standing))
  entry.setAttribute('type', 'button')
  // The join table T-109 admits, and what PND-141 has the shell read back.
  entry.setAttribute('data-icon', item.icon)
  entry.setAttribute('data-enabled', String(item.isEnabled))
  entry.setAttribute('data-pressed', String(item.isPressed))
  // Written for every entry, unlike `aria-pressed`: it is a read-back path like
  // `data-enabled`, and an attribute only armed entries carried could not be
  // told from an entry the description never reached.
  entry.setAttribute('data-armed', String(item.isArmed))
  // FR-029 (MUST): faint and still reachable, never quiet.
  if (!item.isEnabled) entry.setAttribute('aria-disabled', 'true')
  // Only when it IS on: `isPressed` is a toggle that is on, and writing
  // `aria-pressed="false"` on every entry would announce each of them as a
  // toggle -- FR-065's IC-20 and FR-072's IC-17 are the ones that are.
  if (item.isPressed) entry.setAttribute('aria-pressed', 'true')
  entry.setAttribute('aria-label', item.label === '' ? item.icon : item.label)
  fillEntry(host, entry, item.icon)
  return entry
}

/**
 * The current display language, put on the entry that switches it (IC-21).
 *
 * FR-038 needs the language readable before the entry is pressed and FR-029
 * keeps the globe shape as the body, so the code is set beside the shape. It
 * is printed as it arrives (`ja` / `en`, S-99 of table T-206): these are
 * values, not dictionary words, so nothing is upper-cased or translated.
 *
 * The accessible name is left to `commandEntry`; composing one here would mint
 * a name the description does not carry. `data-language` lets the drawn header
 * be read back, as `modalElement` does for `HelpModal.language`.
 *
 * @purity non-pure
 */
function drawLanguageReading(host: Document, entry: HTMLElement, language: DisplayLanguage): void {
  entry.setAttribute('data-language', language)
  const code = made(host, 'span', STYLE.languageCode)
  code.textContent = language
  entry.append(code)
}

/**
 * U-31 `App Header` (UF-62), filled in place. Answers with the `Document Title`
 * it drew.
 *
 * Only the contents are rebuilt: the box whose height FR-051 settles at BO-1
 * has to be the same box from frame to frame.
 *
 * The title element is returned because SK-9 opens a field in it (FR-035), and
 * `ScreenSurfaceWiring` allows only `createElement` on the host, so it cannot
 * be found again by query -- the same bargain `modalElement` keeps for U-60.
 *
 * @purity non-pure
 */
function fillAppHeader(
  host: Document,
  header: HTMLElement,
  items: AppHeaderItems,
  anchors: Map<string, HTMLElement>,
): HTMLElement {
  const title = part(host, 'span', ROLE.documentTitle, documentTitleStyle())
  // No substitute for a missing title: FR-035's `Untitled` is for the browser
  // tab, not the header.
  title.textContent = items.documentTitle

  // FR-101. One box, so name-above-time is the box's own order rather than two
  // independently placed parts.
  const fileStatus = part(host, 'span', ROLE.fileStatus, STYLE.fileStatus)
  const fileName = part(host, 'span', ROLE.openedFileName, STYLE.openedFileName)
  // No substitute for a document open from no file: FR-101 asks for one for
  // the time alone, and a word here would have to be invented.
  fileName.textContent = items.openedFileName
  fileStatus.append(fileName)
  const savedAt = part(host, 'span', ROLE.fileSavedAt, STYLE.fileSavedAt)
  // Converted for display only (`readableStamp` says why); the description's
  // UTC value is untouched. The "never written" word arrives already in the
  // session's language (FR-038).
  savedAt.textContent =
    items.fileSavedAt === null
      ? items.fileNeverSavedText
      : readableStamp(items.fileSavedAt)
  fileStatus.append(savedAt)

  const commands = part(host, 'span', ROLE.headerCommands, STYLE.headerCommands)
  for (const item of items.commands) {
    const entry = commandEntry(host, item)
    // FR-038: IC-21 has to say which language is on. After `commandEntry`,
    // never inside it: `fillEntry` replaces the body, so a code added first
    // would be thrown away.
    if (item.icon === DISPLAY_LANGUAGE_ENTRY) {
      drawLanguageReading(host, entry, items.language)
    }
    // EZ-2 of table T-040: the tooltip is placed against the entry drawn for
    // that icon.
    anchors.set(anchorKey({ kind: 'icon', icon: item.icon }), entry)
    commands.append(entry)
  }

  header.replaceChildren(title, fileStatus, commands)
  return title
}

/**
 * U-24 `Panel Divider` and U-21 `Scrollbars` (UF-61). Every bar the
 * description holds is drawn (SC-4 of table T-031).
 *
 * @purity non-pure
 */
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
    // GR-21 of table T-023d. Placed against the lane, not the window: the lane
    // is `position:absolute`, so it is the grip's containing block
    // (`boxStyleWithin`). Inside the lane because `readScreenPartAt` reads
    // `data-role` / `data-axis` off ancestors; a grip beside it would answer
    // IF-9 for no part.
    track.append(
      made(host, 'div', boxStyleWithin(bar.thumb, bar.track) + STYLE.scrollbarThumb),
    )
    // FR-037: the lane is what its tooltip is placed against.
    anchors.set(anchorKey({ kind: 'scrollbar', axis: bar.axis }), track)
    drawn.push(track)
  }
  layer.replaceChildren(...drawn)
}

/**
 * How far apart the row's controls stand, measured from the row's right edge
 * (the order is `ROW_CONTROL_STEPS`, HF-4 / HF-1). The panel's corner
 * entrances use their own step (`panelCornerStepPx`).
 *
 * The step is one control's box, in pixels: HF-5 fixes that box in pixels, so a
 * step that followed the reader's text size would open gaps or stack the
 * controls onto each other and over GR-20's grab strip (HF-6).
 * It is still a step and not a width: the two coincide only while PND-348
 * leaves the gap between controls at nothing.
 *
 * @provisional PND-348
 *
 * @purity pure
 */
function rowControlStepPx(): number {
  return rowControlBoxPx()
}

/**
 * How far in from the row's right edge the nearest control stands.
 *
 * Named because the HF-6 ground reaches from the leftmost control, so this term
 * is read twice. In pixels because `rowControlStepPx` is: a run whose terms mix
 * two units would place the controls by neither.
 *
 * @provisional PND-348
 */
const ROW_CONTROL_EDGE_PX = 4

/**
 * Where the control `stepsFromEdge` steps from the row's right edge stands.
 * The inset is the first term, so the nearest control sits at the row's edge
 * (HF-4) rather than a step in from it.
 *
 * @purity pure
 */
function rowControlRight(stepsFromEdge: number): string {
  return `right:${rowControlRightPx(stepsFromEdge)}px;`
}

/**
 * The same distance as a number, which the HF-6 ground needs. One arithmetic
 * for both, so the control's place and the ground's width cannot drift apart.
 *
 * @purity pure
 */
function rowControlRightPx(stepsFromEdge: number): number {
  return ROW_CONTROL_EDGE_PX + rowControlStepPx() * stepsFromEdge
}

/**
 * Which step from the row's right edge each column of controls stands at.
 * The left-to-right order is HF-4's, with HF-1's lattice first and the pin
 * outermost; named once because the HF-6 ground has to reach the same leftmost
 * step.
 */
const ROW_CONTROL_STEPS = {
  /** IC-82 above IC-91 -- HF-4's vertical pair, one column, one step in. */
  pair: 1,
  /** IC-60 -- the outermost, which HF-4 (MUST) fixes. */
  pin: 0,
  /**
   * The right-hand column of HF-1's 2 x 2 lattice; two columns rather than one
   * line of four so the run does not cover GR-20's grab strip (HF-6).
   */
  foldingGrid: 2,
} as const

/**
 * Where in HF-1's 2 x 2 lattice each folding control stands.
 *
 * HF-1 prints the four left to right and has the lattice read action top to
 * bottom and reach left to right; filling it a column at a time is the only
 * filling under which both hold (row by row swaps the two readings).
 *
 *               column 1 (this row / one level)   column 2 (whole subtree)
 *   row 1 fold    IC-59                             IC-77
 *   row 2 open    IC-90                             IC-58
 *
 * Stated per control rather than left to DOM order: a lattice filled by DOM
 * order would shift controls into empty cells on a row that drew fewer
 * (HF-6, MUST NOT).
 */
const ROW_FOLDING_CELLS = {
  /** IC-59 -- HF-3, which is HR-6: the row is hidden. */
  close: { column: 1, row: 1 },
  /** IC-77 -- HF-11, which is HR-4: the whole subtree folds. */
  closeBelow: { column: 2, row: 1 },
  /** IC-90 -- HF-13, which is HR-7 of table T-015. */
  openOneLevel: { column: 1, row: 2 },
  /** IC-58 -- HF-2, which is HR-3: the whole subtree opens. */
  open: { column: 2, row: 2 },
} as const

/**
 * Where in HF-4's vertical pair each of the two stands (HF-4; no rule lines,
 * HF-1).
 */
const ROW_CONTROL_PAIR_CELLS = {
  /** IC-82 -- FR-032's deletion, the upper of the two. */
  remove: { column: 1, row: 1 },
  /** IC-91 -- HF-14, which is HR-8: the lower of the two. */
  addChild: { column: 1, row: 2 },
} as const

/**
 * The step the leftmost control reaches, read by the lattice and by the HF-6
 * ground. One more than `foldingGrid` because the lattice is two columns wide;
 * derived, so it follows the lattice when the run changes.
 */
const ROW_CONTROL_LEFTMOST_STEP = ROW_CONTROL_STEPS.foldingGrid + 1

/**
 * The one ground HF-6 of table T-051 lays under the row's controls (S-150,
 * `PAINT.panel`), so the name's tail goes under the controls instead of
 * showing between them.
 *
 * It spans the row's height (`top:0;bottom:0`) so a name set larger than the
 * controls (S-36 / S-38) cannot put its descenders out from under it. Its width
 * is read from where the leftmost control stands, so it follows whatever
 * PND-348 rules without a gap of its own.
 *
 * Out of flow, so S-140 stays 0 and FR-085's cut of the name does not move.
 * `pointer-events:none`: a box that answered `elementFromPoint` would put a
 * part the description never carried under every press near the right edge.
 *
 * @purity pure
 */
function rowControlGroundStyle(leftmostStepsFromEdge: number): string {
  // The leftmost control's LEFT edge, measured from the row's right edge: where
  // that control's right edge stands, plus its own width -- its shape (S-138)
  // with `S-141` on either side of it, which is `rowControlBoxPx`.
  const reach = rowControlRightPx(leftmostStepsFromEdge)
  return (
    'position:absolute;top:0;bottom:0;right:0;' +
    `width:${reach + rowControlBoxPx()}px;` +
    `background:${PAINT.panel};pointer-events:none;`
  )
}

/**
 * The outer box of one row control, in pixels, on both axes: S-138 with S-141
 * on either side (HF-5; the same composition `entryGlyphRoom` uses).
 *
 * Nothing relative: a box that followed the host's line box let the lattice's
 * lower rank overlap the upper one at larger text sizes.
 * A function and not a constant: the generated block it reads stands at the
 * foot of this file (see `rowBandPx`).
 *
 * @purity pure
 */
function rowControlBoxPx(): number {
  return NOT_STORED_ICON_SIZES['S-138'] + NOT_STORED_ICON_SIZES['S-141'] * 2
}

/**
 * One control's width as a declaration, read by the lattice's columns and the
 * ground; one spelling so the two cannot drift.
 *
 * @purity pure
 */
function rowControlWidthCss(): string {
  return `${rowControlBoxPx()}px`
}

/**
 * The box one row control keeps around its shape, the same at any text size
 * (HF-5).
 *
 * `inline-flex` takes the host's line box out of the height: the control is as
 * tall as its shape (S-138, `glyphStyle`). `inline-block`, a `button`'s
 * default, measured the strut of the reader's text.
 *
 * No vertical length is declared: a `height`, `min-height` or vertical padding
 * would give an empty control a height, and
 * tests/unit/uf-72-screen-part.test.ts relies on an empty control measuring
 * wide and not high to catch the 4 x 0 finding. The vertical S-141 gap rides
 * on the shape instead (`rowControlGlyphGapStyle`); the horizontal gap stays
 * here because that case asserts an empty control is still wide.
 *
 * `align-items` is not declared: the shape has a definite size and does not
 * stretch, and centring the control is forbidden (HF-5).
 *
 * A function and not a `STYLE` member: the value arrives in the generated
 * block at the foot of this file, and `STYLE` holds only relative lengths.
 *
 * @purity pure
 */
function rowControlBoxStyle(): string {
  return `display:inline-flex;padding:0 ${NOT_STORED_ICON_SIZES['S-141']}px;`
}

/**
 * S-141's gap above and below the shape, on the shape because
 * `rowControlBoxStyle` may not declare a vertical length. The control's own top
 * stays level with the name's, so this is not a set-down of the control
 * (HF-5).
 *
 * @purity pure
 */
function rowControlGlyphGapStyle(): string {
  return `margin:${NOT_STORED_ICON_SIZES['S-141']}px 0;`
}

/**
 * The box for HF-1's 2 x 2 lattice and HF-4's vertical pair, asked for
 * `columns` columns; one declaration so the two cannot drift.
 *
 * A box holding the controls rather than per-control offsets: HF-5 forbids
 * setting a control down from the name's top, and HF-1 needs a second rank, so
 * what is set down is the grid rank. No `top`: the box keeps its static
 * position, which is the name's top.
 *
 * Tracks are stated as one control's box (`rowControlWidthCss`) rather than
 * sized by content: content-sized rows measure the host's line box, which
 * follows the reader's text size, and `auto` columns would collapse on a row
 * that drew fewer controls (HF-6, MUST NOT).
 *
 * `pointer-events:none`: the box spans the gaps, and a press there would answer
 * with a box the description never carried -- which is why `STYLE.rowControl`
 * states `auto` for the controls inside. Out of flow, so S-140 stays 0.
 * No border, outline or ground (HF-1, MUST NOT).
 *
 * @purity pure
 */
function rowControlGridStyle(columns: number, stepsFromEdge: number): string {
  // Two ranks for both: HF-1's lattice and HF-4's pair are each two deep.
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

/**
 * Which cell of a grid one control stands in.
 *
 * @purity pure
 */
function rowControlCellStyle(cell: { readonly column: number; readonly row: number }): string {
  // `position:static` undoes `STYLE.rowControl`'s `absolute`: a control taken
  // out of the grid's flow would stack in the first cell.
  return `position:static;grid-column:${cell.column};grid-row:${cell.row};`
}

/**
 * What marks the count HF-18 shows on a row, and HF-12 at 段 0.
 *
 * Not `data-icon` / `data-role`: table T-109 holds no entrance and table T-103
 * no part for a count, so a mark of its own lets it be read back (rule 04), as
 * `data-corner-band` and `ROW_GRAB_STRIP_MARK` are. It also keeps the count out
 * of HF-6's hover rule, which reaches controls by `data-role` / `data-icon`.
 */
const FOLDED_ROW_COUNT_MARK = 'data-folded-rows'

/**
 * How thick a band drawn on a row's edge is -- S-213 of table T-206, in pixels,
 * one number for HF-15's axis bands and HF-18's holding mark.
 *
 * A function and not a constant: `NOT_STORED_ROW_BAND_SIZES` is declared in the
 * generated block at the foot of this file, and a module-level `const` would
 * read it inside its temporal dead zone.
 *
 * @purity pure
 */
function rowBandPx(): number {
  return NOT_STORED_ROW_BAND_SIZES['S-213']
}

/**
 * How a row HF-15's grab is holding is drawn: a ground (S-151 at depth S-215)
 * and one band on each edge crosswise to the live axis (S-151 / S-152), so the
 * band lies along the direction of travel.
 *
 * The ground is S-151 whichever axis is live; only the bands follow the axis.
 * S-215 rather than S-214 so a held row is told from a pinned one (FR-098).
 *
 * @purity pure
 */
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

/**
 * How the count HF-18 shows is drawn: the number beside the name, in S-153 ink
 * on the row's own ground (HF-18 refuses a painted tab).
 *
 * @purity pure
 */
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

/**
 * The mark HF-18 puts before the number (U+25BE) and one space.
 *
 * Not a display word: it is the same character in every language (as
 * `TRUNCATION_MARK` of `row-title-panel`). Not a figure F-019 glyph: that
 * figure holds entrances, and nothing about this count is pressed.
 * Written as code points (rule 03 section 5).
 */
const FOLD_COUNT_MARK = '\u25be\u0020'

/**
 * The head's count (HF-12), put back on the element built with the panel --
 * the same mark-and-number shape the rows use, not a phrase: a phrase does not
 * fit S-79's panel width.
 *
 * Written every frame, like `markPanelCornerEntry`: the head's furniture is
 * never rebuilt, so what it says must be re-applied whenever the description
 * moves. A count of zero is hidden.
 *
 * @purity non-pure
 */
function markFoldedRowCount(mark: HTMLElement, count: number, rightPx: string): void {
  mark.setAttribute(FOLDED_ROW_COUNT_MARK, String(count))
  mark.textContent = FOLD_COUNT_MARK + String(count)
  mark.setAttribute('style', count > 0 ? foldedRowCountStyle(rightPx) : STYLE.hidden)
}

/**
 * The count itself, as an element -- HF-18 on a row, HF-12 at 段 0.
 *
 * @purity non-pure
 */
function foldedRowCountElement(host: Document, count: number, rightPx: string): HTMLElement {
  const mark = made(host, 'span', foldedRowCountStyle(rightPx))
  mark.setAttribute(FOLDED_ROW_COUNT_MARK, String(count))
  mark.setAttribute('aria-hidden', 'true')
  mark.textContent = FOLD_COUNT_MARK + String(count)
  return mark
}

/**
 * How the grab strip GR-20 of table T-023d is drawn: a small mark, S-138 wide,
 * standing in the row's own flow just before the name so it moves with the
 * indent (GR-20).
 *
 * A function and not a `STYLE` member: S-138 arrives in the generated block at
 * the foot of this file.
 *
 * Resting in the rule colour (S-149, `PAINT.rule`), which is what HF-15's held
 * colour (S-151) is written against; no row states the resting colour as a
 * requirement. Searched: HF-15, GR-20 and the preamble of table T-023d, FR-029,
 * FR-085, table T-076 (EP-3 / EP-4), table T-206 and table T-236.
 * `cursor:grab`, and `grabbing` while held (HF-15); not `move`, a distinction
 * `paletteGrabBand` also draws.
 *
 * @purity pure
 */
function rowGrabStripStyle(isHeld: boolean): string {
  const width = NOT_STORED_ICON_SIZES['S-138']
  // One line high, the name's, and not spread over the row's box (HF-15).
  return (
    `flex:none;width:${width}px;cursor:${isHeld ? 'grabbing' : 'grab'};pointer-events:auto;` +
    'text-align:center;' +
    `color:${isHeld ? PAINT.heldRow : PAINT.rule};font-size:0.75em;user-select:none;`
  )
}

/**
 * One control of a row of the `Row Title Panel` -- U-47 `Row Expander`'s
 * controls, U-48 `Row Pin`, and the two row-making controls (`role` null).
 *
 * Every one carries its row of table T-109 as `data-icon`: under table T-065
 * the side that drew an entrance answers where it is (IF-9). U-47's controls
 * share `role`, and `icon` tells them apart.
 *
 * The shape comes through `fillEntry` (FR-098 / FR-029). Without it an empty
 * `button` collapses to zero height and cannot be pressed.
 *
 * The row id is the accessible name. The dictionary holds words for these rows,
 * but they live in ScreenRenderer's generated file, which Chapter 5.3 (MUST
 * NOT) keeps this folder out of, and `RowTitle` carries no word for a control.
 *
 * No set-down is added: the row's `align-items:flex-start` levels the control
 * with the name's top (HF-5), and a proportional offset would resolve against a
 * text size this function cannot see (`STYLE.rowLabel` sets none).
 *
 * @purity non-pure
 */
function rowControlElement(
  host: Document,
  role: string | null,
  icon: string,
  canAct: boolean,
): HTMLElement {
  // FR-029: faint while there is nothing this control could change, plus the
  // control's own pixel box (HF-5). No `height`: `rowControlBoxStyle` says why.
  const style =
    (canAct ? STYLE.rowControl : STYLE.rowControl + STYLE.rowControlFaintInk) +
    rowControlBoxStyle()
  // `null` is a control table T-103 names no part for (IC-82 and IC-91 make and
  // unmake rows); claiming U-47 or U-48 would answer `readScreenPartAt` with a
  // part never described. The walk still takes `data-role` from the panel.
  const control = role === null ? made(host, 'button', style) : part(host, 'button', role, style)
  control.setAttribute('type', 'button')
  control.setAttribute('data-icon', icon)
  control.setAttribute('aria-label', icon)
  // `aria-disabled` and never `disabled` (FR-029, MUST NOT): a disabled
  // control stops taking the press that tells the reason.
  if (!canAct) control.setAttribute('aria-disabled', 'true')
  fillEntry(host, control, icon, rowControlGlyphGapStyle())
  return control
}

/**
 * One row of U-23 `Row Title Tree`, placed by the box the description carries:
 * SC-1 of table T-031 slaves the panel to the body vertically, so the panel and
 * the `Row Area` must use the same numbers.
 *
 * @purity non-pure
 */
function rowTitleElement(host: Document, title: RowTitle, isPinned: boolean): HTMLElement {
  const row = made(
    host,
    'div',
    // The only inset is the indent (`RowTitle.indentPx`), so the name's room is
    // exactly what FR-085 cut it against. Any padding of its own lets the
    // browser's ellipsis cut silently, with no tooltip, because
    // `isLabelTruncated` records FR-085's cut and not this one. FR-085 also
    // subtracts the grab strip and the gap after it (S-138, S-218).
    boxStyle(title.box) +
      STYLE.rowTitle +
      // S-218 of table T-206 in pixels, the gap FR-085 subtracts, so the gap
      // drawn and the gap subtracted are one number at any text size.
      `gap:${NOT_STORED_ROW_GRAB_STRIP_SIZES['S-218']}px;` +
      `padding:0 0 0 ${title.indentPx}px;` +
      // FR-098: a pinned row takes a ground (S-151 at depth S-214).
      // `title.isPinned`, not the `isPinned` argument: the argument says which
      // list is being built; the row's own state is what FR-098 speaks of.
      (title.isPinned ? `background:${stateGround(PAINT.pinnedRow, 'S-214')};` : '') +
      // HF-15: the held row's ground and axis bands; `heldOnAxis` is filled for
      // the held row alone. After the pinned ground so that, if both ever
      // stood (a pinned row has no grab strip today), the deeper S-215 wins.
      (title.heldOnAxis == null ? '' : rowGrabbedStyle(title.heldOnAxis)),
  )
  if (title.heldOnAxis != null) row.setAttribute('data-held-axis', title.heldOnAxis)
  if (isPinned) row.setAttribute('data-role', ROLE.pinnedRow)
  row.setAttribute('data-group-id', title.groupId)
  row.setAttribute('data-depth', String(title.depth))
  row.setAttribute('data-pinned', String(title.isPinned))
  row.setAttribute('data-selected', String(title.isSelected))
  // FR-085: which rows were cut has to be readable for UF-69 to raise the
  // tooltip.
  row.setAttribute('data-truncated', String(title.isLabelTruncated))
  if (title.isSelected) row.setAttribute('aria-selected', 'true')

  // GR-20 of table T-023d, the strip HF-15 has a person grab to move the row.
  // Not on a pinned row (GR-20, MUST NOT); FR-098 draws a pinned row only in
  // the band, so one test covers it. `title.isPinned`, for the reason given
  // above. The refusal can only be the drawing side's: the pin is
  // `ScreenSession`'s (S-126 of table T-203), so the translator answering the
  // press cannot see it; drawing no strip makes the point unreachable.
  if (!title.isPinned) {
    // HF-15: the held colour. The same `heldOnAxis` the ground read, so the row
    // and its mark cannot disagree.
    const grab = made(host, 'div', rowGrabStripStyle(title.heldOnAxis != null))
    grab.setAttribute(ROW_GRAB_STRIP_MARK, 'true')
    // Two vertical ellipses (HF-15). No row of table T-109 and no F-019 glyph:
    // GR-20 is a grab area, not an entrance.
    // `aria-hidden`: decoration on a box that already takes the pointer.
    grab.textContent = '⋮⋮'
    grab.setAttribute('aria-hidden', 'true')
    row.append(grab)
  }

  const label = made(host, 'span', STYLE.rowLabel)
  // `null` is a row FR-058 leaves with no name at all -- a document that
  // broke that requirement, or a derivation whose `Task` carries none. Nothing
  // is invented in its place.
  label.textContent = title.label

  // HF-6: one ground under the controls.
  // Appended before every control: none of them sets `z-index`, so paint order
  // is tree order and the first added is under the rest. It still paints over
  // the in-flow name because positioned boxes paint above in-flow content.
  // Not between the name and the controls: HF-4 is read off this row as the
  // controls being its last children with the name the cell before them.
  const ground = made(
    host,
    'div',
    // The leftmost is HF-1's lattice, one step for every row: both lattice
    // columns have stated widths, so the leftmost edge is fixed however many
    // folding controls are drawn.
    rowControlGroundStyle(ROW_CONTROL_LEFTMOST_STEP),
  )
  ground.setAttribute(ROW_CONTROL_GROUND_MARK, 'true')
  ground.setAttribute('aria-hidden', 'true')
  row.append(ground)
  row.append(label)

  // HF-1's lattice holds the four folding controls; the pair and the pin stand
  // beside it, in HF-4's left-to-right order. Appended after the ground (so the
  // ground stays under) and before the rest (so children keep HF-4's order).
  // Spent controls are drawn faint and stay pressable (FR-029): the telling is
  // raised on the far side of the seam (`input-command-translator.ts`,
  // `frame-loop.ts`), so this side owes only `aria-disabled`.
  // `null` expander: nothing below the row, so IC-58, IC-59 and IC-77 are not
  // drawn -- `expanderOf`'s (UF-63) judgement, not repeated here.
  const foldingGrid = made(host, 'div', rowControlGridStyle(2, ROW_CONTROL_STEPS.foldingGrid))
  foldingGrid.setAttribute(ROW_FOLDING_GRID_MARK, 'true')
  row.append(foldingGrid)

  if (title.expander !== null) {
    const open = rowControlElement(host, ROLE.rowExpander, 'IC-58', title.expander.canOpen)
    open.setAttribute('data-can-open', String(title.expander.canOpen))
    // Placed by its lattice cell; HF-4 pins the lattice, not the control, to
    // the edge.
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

    // IC-77 -- HF-11: the row's subtree folds, the row itself does not. Its own
    // flag, not `canClose` inverted: `RowExpander` says why.
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

  // IC-90 -- HF-13 (HR-7 of table T-015).
  // Outside the block above: HF-13 puts it on every row and draws it faint on a
  // leaf, while `expander` is `null` on a leaf; inside the block it would not
  // be drawn on exactly the rows HF-13 names. A separate entrance from IC-58
  // (HF-13, MUST NOT).
  // `undefined` is drawn as usable, as `markPanelCornerEntry` reads its own
  // optional member: no answer is not an answer of "cannot", and a false
  // faint is the worse error.
  const openOneLevel = rowControlElement(
    host,
    ROLE.rowExpander,
    OPEN_ONE_LEVEL_ENTRY,
    title.canOpenOneLevel ?? true,
  )
  openOneLevel.setAttribute('data-can-open-one-level', String(title.canOpenOneLevel ?? true))
  // Appended from outside the block (the leaf question), but it stands in its
  // lattice cell.
  openOneLevel.setAttribute(
    'style',
    openOneLevel.getAttribute('style') + rowControlCellStyle(ROW_FOLDING_CELLS.openOneLevel),
  )
  foldingGrid.append(openOneLevel)

  // HF-4's vertical pair: a one-column grid for the reason HF-1's lattice is
  // one (HF-5 forbids setting the control down), and with no third rank so
  // nothing can stand between the two. Appended after the lattice and before
  // the pin to keep HF-4's order.
  const controlPair = made(host, 'div', rowControlGridStyle(1, ROW_CONTROL_STEPS.pair))
  controlPair.setAttribute(ROW_CONTROL_PAIR_MARK, 'true')
  row.append(controlPair)

  // IC-82 -- FR-032's deletion, on every row: not under `title.expander`,
  // because a leaf row is as deletable as any other. Never spent, so never
  // faint. No `data-role` and no key of its own -- see `DELETE_ROW_ENTRY`; the
  // row's `data-group-id` says which row goes.
  // Built by `rowControlElement` like the other six: a hand-assembled copy
  // missed `rowControlBoxStyle` and came out a different size (HF-5).
  const remove = rowControlElement(host, null, DELETE_ROW_ENTRY, true)
  remove.setAttribute(
    'style',
    remove.getAttribute('style') + rowControlCellStyle(ROW_CONTROL_PAIR_CELLS.remove),
  )
  controlPair.append(remove)

  // IC-91 -- HF-14 (HR-8), on every row. No `data-role`, as for IC-82 -- see
  // `ADD_CHILD_ROW_ENTRY`. Spent only at the depth cap: `RowTitle.canAddChildRow`
  // says why.
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

  // U-48 `Row Pin` (FR-098), IC-60 of table T-109: one control per row both
  // pins and lets go, so one `data-icon` states the whole join.
  // The row key is not written here: `readScreenPartAt` takes the innermost
  // `data-group-id`, which the row already carries.
  // Never faint: on a drawn row it always has pinning or unpinning left to do.
  // Painted for its state (EN-3 via `entranceStateFill`, HF-6) on top of the one
  // ground, not a per-control ground. On a pinned row it is visible without a
  // pointer (HF-6's exception), declared on the control because the sheet's
  // hover rule is keyed on the row and this must outrank it for one control;
  // unpinned, it falls back under the resting rule.
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

  // HF-18: the folded-row count, at the row's right end on the pin's step; the
  // controls may draw over it while hovered. Not drawn for zero. Out of flow,
  // so S-140 stays 0 and the name's cut does not move (FR-085).
  const foldedRows = title.foldedRowCount ?? 0
  if (foldedRows > 0) {
    row.append(
      foldedRowCountElement(
        host,
        foldedRows,
        rowControlRight(ROW_CONTROL_STEPS.pin),
      ),
    )
    // HF-18: the row itself is marked by a left-edge band in S-153. An inset
    // shadow, not a border: a border would take room (FR-085, MUST NOT).
    row.setAttribute(
      'style',
      (row.getAttribute('style') ?? '') +
        `box-shadow:inset ${rowBandPx()}px 0 0 0 ${PAINT.caution};`,
    )
  }
  return row
}

/**
 * IC-74 -- HF-10 of table T-051: opens every row (HR-1 of table T-015).
 *
 * Built once per panel, not per row, so it carries no `data-group-id` and IF-9
 * answers `rowGroupId: null`. No `data-role` of its own (table T-103 has no row
 * for it): the walk takes `data-icon` here and `data-role` from the panel.
 * The row id is the accessible name, for the reason `rowControlElement` gives.
 *
 * @purity non-pure
 */
function openEveryRowElement(host: Document): HTMLElement {
  return panelCornerEntryElement(host, OPEN_EVERY_ROW_ENTRY, 1)
}

/**
 * The entrances the panel draws for itself at its top right (IC-74, IC-78,
 * IC-92, IC-93). One builder because HF-12, HF-16 and HF-17 place theirs in
 * HF-10's lineup; `stepsFromEdge` counts `panelCornerStepPx`.
 *
 * @purity non-pure
 */
function panelCornerEntryElement(host: Document, icon: string, stepsFromEdge: number): HTMLElement {
  const entry = made(host, 'button', panelCornerEntryStyle(stepsFromEdge, true))
  entry.setAttribute('type', 'button')
  entry.setAttribute('data-icon', icon)
  entry.setAttribute('aria-label', icon)
  fillEntry(host, entry, icon)
  return entry
}

/**
 * What one of those entrances is drawn in, usable or spent: `entryFaintStyle`,
 * the same faint the header and palette take (FR-029, MUST NOT differ by
 * surface). Row controls reach that paint through `STYLE.rowControlFaintInk`
 * because they carry no frame.
 *
 * @purity pure
 */
function panelCornerEntryStyle(stepsFromEdge: number, canAct: boolean): string {
  return (
    (canAct ? entryStyle() : entryFaintStyle()) +
    STYLE.panelCornerEntry +
    `right:${panelCornerStepPx() * stepsFromEdge}px;`
  )
}

/**
 * How far apart the panel's own entrances stand, in pixels.
 *
 * Not the row controls' step: these carry a 1px frame on each side and row
 * controls none, and sharing the step made IC-78 and IC-74 overlap. Built from
 * what `entryStyle` and `entryGlyphRoom` build the entrance from (S-138, S-141
 * and the border), with no number typed here (rule 03).
 *
 * @purity pure
 */
function panelCornerStepPx(): number {
  const side = NOT_STORED_ICON_SIZES['S-138']
  const gap = NOT_STORED_ICON_SIZES['S-141']
  return side + gap * 2 + PANEL_CORNER_BORDER_PX * 2
}

/**
 * Where the head's count stands: one step outside the four entrances HF-10,
 * HF-12, HF-16 and HF-17 put there. The entrances' step, not the row controls':
 * the narrower row step would put the count under an entrance.
 *
 * @purity pure
 */
function headFoldedRowCountRight(): string {
  return `right:${panelCornerStepPx() * 4}px;`
}

/**
 * The 1px border `entryStyle` puts around every entrance, on each side. No row
 * of the specification states the frame's thickness (S-138 is the glyph box,
 * S-141 the gap; FR-029 leaves the outer form to the entrance); named so the
 * arithmetic above reads as what it is.
 */
const PANEL_CORNER_BORDER_PX = 1

/**
 * FR-029's faint, written onto one of the panel's own entrances each frame:
 * they are built with the panel and never rebuilt, so their state must be
 * re-applied whenever the description moves. `aria-disabled` and never
 * `disabled`, so the press that tells the reason still arrives. `undefined`
 * is drawn as usable -- see the member's declaration.
 *
 * @purity non-pure
 */
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

/**
 * IC-78 -- HF-12 of table T-051 (MUST): every row folds.
 *
 * @purity non-pure
 */
function collapseEveryRowElement(host: Document): HTMLElement {
  return panelCornerEntryElement(host, COLLAPSE_EVERY_ROW_ENTRY, 2)
}

/**
 * IC-92 -- HF-16: 段 0 opens one level. HF-16 and HF-17 state no order within
 * HF-10's lineup, and HF-4 reaches only the row's controls.
 *
 * @purity non-pure
 */
function openLevelZeroElement(host: Document): HTMLElement {
  return panelCornerEntryElement(host, OPEN_LEVEL_ZERO_ENTRY, 3)
}

/**
 * IC-93 -- HF-17 (MUST): a row is added at 段 0.
 *
 * @purity non-pure
 */
function addTopRowElement(host: Document): HTMLElement {
  return panelCornerEntryElement(host, ADD_TOP_ROW_ENTRY, 0)
}

/**
 * The top of the topmost row the panel draws, or `null` when it draws none.
 * HF-10's entrance may not overlap the pinned rows' controls, which share its
 * corner, so the band above the first row is the room it stands in.
 *
 * STOP -- the band itself is not on the seam: `ScreenFrame` carries neither the
 * corner rectangle nor the ruler's height, so it is inferred from where the
 * rows were put. Searched: `ScreenView`, `ScreenFrame`, `RowTitlePanel`,
 * `RowTitle` and table T-051. The inferred band is written as
 * `data-corner-band` so it can be read back (rule 04).
 *
 * @purity pure
 */
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

/**
 * U-22 `Row Title Panel` and its tree (UF-63). The description keeps pinned
 * and unpinned rows in separate lists (FR-098), so neither is filtered here.
 *
 * @purity non-pure
 */
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

/**
 * Where the value a person settles is found by the shell, keyed by the drawn
 * control.
 *
 * A `WeakMap` rather than an attribute: `PropertyControl.key` is a value, and
 * spelling it into an attribute means parsing it back, which a row id or uuid
 * holding the separator would break. Weak so a control thrown away with a
 * redrawn panel is not kept alive. Looked up by the element a `change` names,
 * not by a point, so it is no second `readScreenPartAt`.
 */
const CONTROL_KEYS = new WeakMap<Element, { row: string; key: PropertyFieldKey }>()

/**
 * What a control's kind asks the host to draw: one plain host control per
 * kind of table T-016's 入力の型 column, which also brings the reader's own way
 * of entering a date or picking a colour.
 */
const CONTROL_TAG: Readonly<Record<PropertyControlKind, string>> = {
  text: 'input',
  multiline: 'textarea',
  date: 'input',
  number: 'input',
  boolean: 'input',
  choice: 'select',
  color: 'input',
}

/** The `type` an `input` of each kind takes. `null` where the tag is not an input. */
const CONTROL_INPUT_TYPE: Readonly<Record<PropertyControlKind, string | null>> = {
  text: 'text',
  multiline: null,
  date: 'date',
  number: 'number',
  boolean: 'checkbox',
  choice: null,
  color: 'color',
}

/**
 * The spelling a truth value arrives and leaves in: `textOfValue` in
 * properties-panel.ts writes a boolean with `String`, so this reads that back.
 */
const TRUE_TEXT = String(true)

/**
 * The host's name for the key table T-036's SK-8 calls `Esc`. Spelled again
 * rather than shared with `dom-input-source.ts`: `_source/components.json`
 * draws no edge between the two units.
 */
const HOST_ESCAPE_KEY = 'Escape'

/**
 * The host's name for a key being let go. Table T-036 assigns nothing to a
 * release and IF-2 carries no shape for one, so reading it here takes no press
 * from `commandFromKey`; `releaseTakenBackText` says why a press is too early.
 */
const HOST_KEY_RELEASE = 'keyup'

/**
 * Which kinds of control a person puts characters into.
 *
 * A record over the kind, so a new kind cannot be forgotten here. The three
 * false kinds hold picked values, so there is no character for `Delete` to take
 * and swallowing it there would take SK-3 away for nothing (IN-5a).
 */
const IS_KIND_TYPED_INTO: Readonly<Record<PropertyControlKind, boolean>> = {
  text: true,
  multiline: true,
  date: true,
  number: true,
  boolean: false,
  choice: false,
  color: false,
}

/**
 * A control this unit drew that a person types into, as much of it as is used.
 * Not `HTMLInputElement`: table T-075 leaves this unit runnable against a host
 * that is not a browser.
 */
interface TextEntryControl {
  value: string
  blur?: () => void
  /**
   * Optional, as a host that lays nothing out need not provide them;
   * `focusPropertyField` asks with a guard.
   */
  focus?: () => void
  select?: () => void
}

/**
 * The controls of `IS_KIND_TYPED_INTO`, remembered as drawn. Not read back off
 * `data-field-kind`, which is written for readers and checks (rule 04) and must
 * not become load-bearing. Weak, like `CONTROL_KEYS`.
 */
const TYPED_CONTROLS = new WeakSet<object>()

/**
 * The control a happening landed on, if this unit drew it and a person types
 * into it -- otherwise `null`. Not `instanceof Element`: the host need not have
 * that global (see `onFieldChange`).
 *
 * @purity pure
 */
function textEntryControlOf(target: unknown): TextEntryControl | null {
  if (target === null || typeof target !== 'object') return null
  if (!TYPED_CONTROLS.has(target)) return null
  const drawn = target as Partial<TextEntryControl>
  return typeof drawn.value === 'string' ? (target as TextEntryControl) : null
}

/**
 * One control of one field, drawn as the host's own.
 *
 * A commit is a `change`, never a keystroke: FR-031 (UN-3 of table T-027)
 * makes one property change one undo step. SK-19's `Enter` does not raise
 * `change` because MK-10 has the input seam stop its default; the panel's
 * `keydown` listener settles it (beside `hasUnsettledTextEntry`).
 *
 * STOP -- the host's colour control holds only `#rrggbb`, so table T-058's
 * `transparent` (P-19) and AT-58's `null` (follow the theme) can be neither
 * reached nor seen through it, and FR-006 forbids a swatch beside it. Looked in
 * table T-016, FR-007, FR-030, table T-058 and table T-109.
 *
 * @provisional PND-270
 * @purity non-pure
 */
function controlElement(
  host: Document,
  row: string,
  control: PropertyControl,
  typedByRow: Map<string, TextEntryControl> | null,
): HTMLElement {
  const tag = CONTROL_TAG[control.kind]
  const drawn = host.createElement(tag)
  // Room in `em`, never px (FR-006, MUST NOT): `widthInFontSizes` has the font
  // size divided out, and `em` multiplies it back against the control's own
  // font (`font:inherit` makes that the panel's). Not computed here: S-30 is a
  // document setting this side does not read (table T-061).
  // Checkbox and colour controls paint their value rather than spelling it, so
  // they get no text room.
  const style =
    control.kind === 'color'
      ? propertyColorStyle()
      : control.kind === 'boolean'
        ? propertyCheckStyle()
        : propertyControlStyle(control.widthInFontSizes)
  drawn.setAttribute('style', style)
  // For readers of the built page and checks (rule 04); the commit travels by
  // CONTROL_KEYS.
  drawn.setAttribute('data-field-row', row)
  drawn.setAttribute('data-field-kind', control.kind)

  const inputType = CONTROL_INPUT_TYPE[control.kind]
  if (inputType !== null) drawn.setAttribute('type', inputType)

  if (control.kind === 'choice') {
    // The empty spelling is offered only where the candidates hold it.
    // `choiceValues` pairs by position with `choices` where a candidate commits
    // something other than its word (AS-6 of table T-225: PR-16 shows a name and
    // writes a `uid`); without it, the word is the value.
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
      // The bounds are the schema's, and only where it states one: an absent
      // bound is left absent rather than filled with a number from here.
      if (control.min !== null) drawn.setAttribute('min', String(control.min))
      if (control.max !== null) drawn.setAttribute('max', String(control.max))
    }
    ;(drawn as HTMLInputElement).value = control.text
  }

  CONTROL_KEYS.set(drawn, { row, key: control.key })
  // IF-9's fifth answer is about the controls a person types INTO, and this is
  // where the two are told apart -- the kind is in hand here and nowhere later.
  if (IS_KIND_TYPED_INTO[control.kind]) {
    TYPED_CONTROLS.add(drawn)
    // What `focusPropertyField` reaches the control by, recorded while row and
    // control are both in hand (not looked up off `data-field-row`, above).
    // The first control of a row wins: AS-5 gives PR-16 a chooser and a search
    // box, and the first holds the row's value. `null` is a caller that is not
    // the panel (`modalElement`), whose controls must not answer for panel rows.
    if (typedByRow !== null && !typedByRow.has(row)) {
      typedByRow.set(row, drawn as unknown as TextEntryControl)
    }
  }
  return drawn as HTMLElement
}

/**
 * The id the search box and its roster are joined by. Derived from the row, not
 * counted: a row carries at most one searchable chooser, and a counter would
 * rename the same element each redraw. Prefixed because ids share the host
 * document's one namespace.
 */
function rosterId(row: string): string {
  return `grs-roster-${row}`
}

/**
 * AS-5's second half: the partial-match search beside a chooser.
 *
 * `input` + `datalist` is the host's own, so it needs no label, placeholder or
 * heading -- each would be a word outside the dictionary (FR-038). How it
 * matches is the host's (FR-029's environment convention).
 *
 * It commits through the same `CONTROL_KEYS` key as the chooser beside it; the
 * chooser settles a `uid` (AS-9) and this settles the typed name (AS-7, AS-8,
 * AS-3's `-`). Its room is the chooser's estimate (FR-006).
 *
 * @purity non-pure
 */
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
  // Written for the reader of the built page and for a check, like the ones
  // `controlElement` writes -- the commit still travels by `CONTROL_KEYS`.
  box.setAttribute('data-field-row', row)
  box.setAttribute('data-field-search', 'true')
  ;(box as HTMLInputElement).value = ''

  CONTROL_KEYS.set(box, { row, key: control.key })
  // A person puts CHARACTERS into this one, which is the whole of what it is --
  // so it is settled by `Enter` and abandoned by `Esc` like every other such
  // control, and IN-5a's `Delete` is swallowed while it holds the pointer.
  TYPED_CONTROLS.add(box)
  // Recorded here too because it is the only typed entrance into PR-16: its
  // 入力の型 is 選択, so `controlElement` records nothing for the row and AS-1's
  // focus would land nowhere. Only where no control was recorded first, and
  // `null` for callers that are not the panel -- as in `controlElement`.
  if (typedByRow !== null && !typedByRow.has(row)) {
    typedByRow.set(row, box as unknown as TextEntryControl)
  }
  return [roster as HTMLElement, box]
}

/**
 * One item of table T-016, of table T-058's two row columns, or of table T-104.
 *
 * A field with no controls is still written out as text: that is how a field
 * looks until its surface exists (the settings roster, FR-074, read-only PR-9).
 *
 * @purity non-pure
 */
function fieldElement(
  host: Document,
  field: PropertyField,
  typedByRow: Map<string, TextEntryControl> | null,
): HTMLElement {
  const line = made(host, 'div', propertyFieldStyle())
  // The row that holds the item -- `PR-n`, `AT-58` / `AT-59`, or `K-n`.
  line.setAttribute('data-field-row', field.row)
  line.setAttribute('data-editable', String(field.isEditable))
  const name = made(host, 'span', propertyFieldNameStyle())
  // Not translated, and table T-016 says why it keeps its item names in
  // English (FR-038 leaves them alone).
  name.textContent = field.name

  if (field.controls.length === 0) {
    const value = made(host, 'span', '')
    value.textContent = field.text
    line.append(name, value)
    return line
  }

  const controls = made(host, 'div', propertyControlsStyle())
  // A control that carries no value of its own does not hide the field's text:
  // PR-16's chooser holds what one press would settle while the field holds all
  // assignee names (AS-6), and dropping them would hide who is on the task.
  // Keyed on the controls having no text, not on the row id, so this file holds
  // no copy of table T-016.
  if (field.text !== '' && field.controls.every((one) => one.text === '')) {
    const shown = made(host, 'span', '')
    shown.textContent = field.text
    controls.append(shown)
  }
  for (const control of field.controls) {
    // No swatch in front of a colour control (FR-006, MUST NOT): the host's
    // control already paints the colour.
    controls.append(controlElement(host, field.row, control, typedByRow))
    // AS-5 attaches a chooser and a search; the search stands beside the chooser,
    // not in its place, because only the chooser tells same-named people apart
    // (AS-9). Keyed on the control declaring words, for the reason above.
    const words = control.searchWords
    if (words !== undefined) {
      controls.append(...searchElements(host, field.row, control, words, typedByRow))
    }
  }
  line.append(name, controls)
  return line
}

/**
 * Which of FR-072's two the panel is on, written even when its contents are not
 * redrawn this frame (a person holding a field), since no control holds these
 * facts and a check reads them back.
 *
 * @purity non-pure
 */
function markPropertiesPanel(panel: HTMLElement, description: PropertiesPanel): void {
  panel.setAttribute('data-showing', description.showing)
  panel.setAttribute('data-subject-gone', String(description.isSubjectGone))
}

/**
 * U-25 `Properties Panel` (UF-64), contents and all.
 *
 * No heading row (FR-072, MUST NOT); which of the two is showing is IC-17's
 * pressed state (`app-header-items.ts`).
 *
 * The way out arrives in `PropertiesPanel.commands` already chosen by UF-64 and
 * is drawn through `commandEntry`.
 *
 * STOP -- where on the panel it sits is not decided: no table holds a
 * rectangle for an entry (PND-141). Searched: FR-006, FR-029, FR-072, table
 * T-109, table T-103 and S-186 .. S-198 of table T-206. It rides at the far end
 * of the first field's line (table T-016's first printed row); with no field it
 * stands alone, because a surface that cannot be put away is the worse failure.
 *
 * @provisional PND-327
 * @provisional PND-271
 * @purity non-pure
 */
function fillPropertiesPanel(
  host: Document,
  panel: HTMLElement,
  description: PropertiesPanel,
  anchors: Map<string, HTMLElement>,
  typedByRow: Map<string, TextEntryControl>,
): void {
  // Emptied first, as `anchorsOf` empties the anchors: the old controls are
  // thrown away below, and a leftover row would name a control no longer drawn.
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

/**
 * GR-19 of table T-023d -- the band a person grabs to move U-26. That the band
 * wins over whatever is drawn under it needs no code here: the palette floats
 * over the schedule, and `elementFromPoint` returns the topmost node.
 *
 * `CommandPalette` carries only the band's height, because the palette's width
 * is known only where entries were laid out (FR-053; under table T-065 the
 * drawing side answers). The height is used as it arrives; the width is the
 * block box spreading to the palette.
 *
 * Inside the palette's part, never beside it: `PALETTE_FAINT_CSS` judges
 * FR-053's faintness on that element with `:hover`, which also matches when
 * the pointer is on a descendant, so a sibling band would leave the palette
 * faint while held.
 *
 * Not a button (table T-109's IC-53). `data-icon` lets `readScreenPartAt`
 * answer `{ part: 'Command Palette', entry: 'IC-53' }` (innermost `data-icon`,
 * outermost `data-role`).
 * It reads as grabbable by IC-53's shape at the band's right end (FR-053) and by
 * the cursor (`STYLE.paletteGrabBand`, whose STOP note covers what is not
 * decided).
 *
 * The band has no accessible name: `CommandPalette` carries no word for IC-53
 * though the dictionary holds one, so a member is owed on the seam. Searched:
 * FR-053, FR-029, GR-19 of table T-023d, table T-109 and `CommandPalette`.
 *
 * @purity non-pure
 */
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

  // IC-75 inside the band, to the right of IC-53 (FR-053); inside for the
  // faintness reason above. It is a `CommandItem`, so it carries its own word.
  const toggle = commandEntry(host, minimise)
  // One placing for both states: FR-053 states no exception for the minimised
  // palette, and a second placing would drift.
  toggle.setAttribute('style', toggle.getAttribute('style') + STYLE.paletteMinimise)
  // Table T-109 gives IC-75 one shape for both states, so the state is written.
  toggle.setAttribute('aria-pressed', String(isMinimised))
  // EZ-2 of table T-040: IC-75's tooltip is placed against the toggle, set here
  // because the band's first child is IC-53's shape and the toggle cannot be
  // found from outside by position.
  anchors.set(anchorKey({ kind: 'icon', icon: minimise.icon }), toggle)
  band.append(toggle)
  return band
}

/**
 * U-26 `Command Palette` (UF-65).
 *
 * Placed and not sized: FR-053 has the size follow the contents, so
 * `cornerStyle` writes the corner and the entries decide the extent.
 * Two children, band first (GR-19 lays it along the top); `grabBandElement`
 * says why it cannot be a sibling. Faintness is `PALETTE_FAINT_CSS`'s.
 *
 * `PaletteGroup.name` is not printed (FR-053, MUST NOT) but still arrives: it
 * orders the groups and names them in the help (FR-036).
 *
 * One S-143 rule per boundary between groups (`paletteGroupRuleStyle`), before
 * every group but the first; a rule per group would draw one above the first
 * entry, where nothing meets.
 *
 * @purity non-pure
 */
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
  // Group boxes with a rule between each pair, in one order.
  const laid: HTMLElement[] = []
  for (const group of palette.groups) {
    // FR-053: empty only before the first group, so one rule per boundary.
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
  // FR-053: the armed reading; null while minimised, and then nothing is laid
  // out for it.
  const armed =
    palette.armedText === null ? null : made(host, 'div', STYLE.armedText)
  if (armed !== null) armed.textContent = palette.armedText

  // GR-19 first: the band is the palette's top edge. Drawn whenever the palette
  // is, on no condition of its own.
  const band = grabBandElement(
    host,
    palette.grabBandHeight,
    palette.minimise,
    palette.isMinimised,
    anchors,
  )
  // EZ-2 of table T-040: IC-53 is a row the pointer can rest on (PND-141), so
  // its tooltip is placed against the band.
  anchors.set(anchorKey({ kind: 'icon', icon: PALETTE_GRAB_BAND_ENTRY }), band)

  // The palette's padding, one box further in so the band reaches the edges
  // (`STYLE.paletteContents`). Not made while minimised: FR-053 shows the band
  // alone, and an empty box would still carry padding under it.
  if (palette.isMinimised) {
    drawn.replaceChildren(band)
    return drawn
  }
  const contents = made(host, 'div', STYLE.paletteContents)
  contents.replaceChildren(...laid, ...(armed === null ? [] : [armed]))

  drawn.replaceChildren(band, contents)
  return drawn
}

/**
 * IC-67 / IC-68 of table T-109 -- FR-099's entrance against one person in
 * U-49, drawn per person so `readScreenPartAt` has a `data-icon` to answer.
 *
 * One entrance: which row is drawn (`RosterResource.isSelected`) tells the
 * state, so no `aria-pressed` is set. The row id is the accessible name, as in
 * `rowControlElement`: no `CommandItem` reaches it, so no dictionary word does.
 * Where on the line it stands is not decided (HF-4 reaches nothing on U-49 and
 * FR-099 says nothing); it follows the name.
 * The person is not written on it: the line already carries `data-uid`.
 *
 * @purity non-pure
 */
function rosterSelectionEntry(host: Document, isSelected: boolean): HTMLElement {
  const icon = isSelected ? ROSTER_CHOSEN_ENTRY : ROSTER_UNCHOSEN_ENTRY
  const entry = made(host, 'button', entryStyle())
  entry.setAttribute('type', 'button')
  entry.setAttribute('data-icon', icon)
  entry.setAttribute('aria-label', icon)
  fillEntry(host, entry, icon)
  return entry
}

/**
 * A surface, drawn, with the one typed-into control this unit must read back.
 * Returned rather than looked up, so no attribute becomes load-bearing (as
 * `TYPED_CONTROLS`). `null` on every surface but U-60.
 */
interface DrawnModal {
  readonly element: HTMLElement
  readonly watermarkUnlockEntry: TextEntryControl | null
}

/**
 * The surface open over the screen (UF-66).
 *
 * Narrowed by which member a variant carries, never by comparing the name: see
 * `OpenModal` (a `string` discriminant would keep its last member in every
 * comparison).
 *
 * `data-role` is the surface's name from `ScreenState.surface` (S-99g), written
 * unchanged -- not kebab-cased, since W-4 of table T-006a sends a part's
 * settled name to W-6 rather than translating it.
 *
 * @purity non-pure
 */
function modalElement(
  host: Document,
  modal: OpenModal,
  anchors: Map<string, HTMLElement>,
): DrawnModal {
  // FR-036 (MUST) gives the help a share of the screen that no other surface
  // is given, so the box it opens in is the modal's plus that share.
  const drawn = part(
    host,
    'div',
    modal.surface,
    STYLE.modal +
      ('entries' in modal ? helpStyle() : '') +
      // U-62 as a column so its one entrance stays reachable however long the
      // list is (`STYLE.importReportBox`).
      ('droppedTaskNames' in modal ? STYLE.importReportBox : ''),
  )
  drawn.setAttribute('role', 'dialog')
  drawn.setAttribute('aria-modal', 'true')

  const header = made(host, 'div', STYLE.surfaceHeader)
  const heading = made(host, 'h2', STYLE.heading)
  heading.textContent = modal.heading
  header.append(heading)
  // IC-52 closes it, and the first level of Esc does the same (IN-4).
  for (const item of modal.commands) {
    const entry = commandEntry(host, item)
    anchors.set(anchorKey({ kind: 'icon', icon: item.icon }), entry)
    header.append(entry)
  }
  const body: HTMLElement[] = []
  // U-60's masked field, filled in by the branch that draws it and left `null`
  // by every other surface.
  let watermarkUnlockEntry: TextEntryControl | null = null

  if ('entries' in modal) {
    // FR-038: the language in force, readable before pressing -- the second of
    // the two entrances (the header's IC-21 draws the same reading). An
    // accessible name would not be read before pressing.
    drawn.setAttribute('data-language', modal.language)
    // FR-036: entries in S-202's columns, the share of screen on the box
    // (`helpStyle`). CSS columns over one list rather than a grid of cells, so
    // the browser keeps columns even as words change with language.
    const columns = made(host, 'div', helpColumnsStyle())
    for (const line of modal.entries) {
      const row = made(host, 'div', STYLE.helpEntry)
      row.setAttribute('data-table', line.table)
      row.setAttribute('data-row', line.row)

      // FR-036: shape, description, assignment. The row id is not drawn (closing
      // rule of table T-023b, MUST NOT); it stays on `data-row`.
      // A shape only where table T-109 places exactly one entrance for the row --
      // `HelpEntry.icon` says why.
      const glyph = made(host, 'span', STYLE.helpGlyph)
      if (line.icon !== null) fillEntry(host, glyph, line.icon)
      row.append(glyph)

      const text = made(host, 'span', STYLE.helpText)
      text.textContent = line.text
      row.append(text)

      // FR-036: key or mouse operation. The cell is kept when empty so the
      // column stays aligned, and nothing is written in it: a dash would read as
      // a deliberately withheld assignment. No row is in both tables T-023 and
      // T-036, so at most one is non-null.
      const assignment = made(host, 'span', STYLE.helpKeys)
      assignment.textContent = line.keys ?? line.press ?? null
      row.append(assignment)

      columns.append(row)
    }
    body.push(columns)
    // FR-069: licence, copyright and attributions, folded away so the help
    // still fits without scrolling (FR-036). The host's `details` opens with no
    // script, which keeps it readable in a file opened with nothing else.
    const legal = made(host, 'details', STYLE.helpLegal)
    const summary = made(host, 'summary', STYLE.helpLegalSummary)
    // Not a dictionary word (FR-038): the copyright notice is NOTICE's line,
    // the same in every language.
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
    // FR-068: the document that would be handed to an AI, shown as it is.
    // No control beside it: table T-109 holds no row for a copy entry, and
    // FR-029 makes that table the whole of the icons (MUST).
    const text = made(host, 'pre', 'white-space:pre-wrap;overflow:auto;')
    text.textContent = modal.documentText
    body.push(text)
  }

  if ('formats' in modal) {
    // FR-096: the author picks one of table T-024's out-direction rows on U-54.
    // Not entries of table T-109: IC-3 is the one entrance and it opened this
    // surface, so a choice carries no row, shape or `data-icon` (MUST NOT one
    // entrance per format). The proposed name is not drawn: no `OpenModal`
    // member holds it, and the platform picker's proposal is the shell's.
    const choices = made(host, 'div', STYLE.formatChoices)
    for (const format of modal.formats) {
      // How a format is marked in the page is not decided; its row id is the
      // one join (table T-024 has no English column), so `data-format` carries
      // it, as `data-icon` does for table T-109. Painted as an entry because
      // this unit paints everything pressable that way (R4).
      const choice = made(host, 'button', entryStyle())
      choice.setAttribute('type', 'button')
      choice.setAttribute('data-format', format.row)
      // FR-096: the word the description brought plus table T-024's extension;
      // the row id is not drawn (MUST NOT) and stays on `data-format`.
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
      // FR-099 (MUST NOT a count): one element per name, so a `Task` with no
      // name (AT-27) is not lost between separators.
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
    // U-61 `Difference Review` -- FR-022: candidates shown before choosing.
    // One element per side, for the roster's reason above. Names are document
    // values and not translated (FR-038). The UID is drawn as characters too,
    // so same-named tasks can be told apart; `data-uid` is for read-back
    // (rule 04). The three answers are header `commands` (IC-95 .. IC-97).
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
    // U-61 `Difference Review` -- FR-073: unread columns listed, one element
    // per column, spelled as the file did (no dictionary row exists for them).
    // The sentence and next step are RS-48 of table T-233 and NT-3a, read out
    // of the dictionary by `notices.ts` (FR-038), as `importReportElements`
    // does for RS-50; empty when every column was read.
    if (modal.unreadText !== '') {
      const said = made(host, 'div', '')
      said.textContent = modal.unreadText
      body.push(said)
    }
    if (modal.unreadNextStep !== '') {
      // `noticeElement`'s quiet colour, reused: the same thing (what can be done
      // next).
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
    // `null`: these are table T-104's fields on a modal, not table T-016's on
    // the `Properties Panel`, and `focusPropertyField` answers for the panel.
    for (const field of modal.fields) body.push(fieldElement(host, field, null))
  }

  if ('weekDays' in modal) {
    // Carried as the columns hold them and NOT renumbered: `WeekDay.dayType`
    // (AT-73) makes Sunday 1 and `Project.weekStartDay` (AT-17) makes Sunday 0,
    // so converting either here would put one weekday under two numbers on one
    // surface.
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
    // U-60 `Watermark Unlock` -- FR-020's gate on hiding the watermark only.
    // The answers are word buttons per NT-7, drawn by
    // `confirmationAnswerElement` so this surface and U-55 cannot drift; no
    // row of table T-109, so no shape.
    const question = made(host, 'div', '')
    question.textContent = modal.question

    // FR-020: typed answer, masked. `type=password` so the browser masks while
    // typing; a painted mask would leave the characters in the DOM. Nothing
    // keeps what is typed: `readWatermarkUnlockAnswer` reads it when an answer
    // is given.
    const answerEntry = host.createElement('input')
    answerEntry.setAttribute('type', 'password')
    answerEntry.setAttribute('style', STYLE.watermarkUnlockEntry)
    // The question is the label: one field, and no second string outside the
    // dictionary (FR-038).
    answerEntry.setAttribute('aria-label', modal.question)
    // How the field is marked is not decided (table T-006a's `data-role` and
    // `data-icon` reach no field); marked so the read-back of rule 04 finds it.
    answerEntry.setAttribute(WATERMARK_UNLOCK_ENTRY_ATTRIBUTE, 'true')
    watermarkUnlockEntry = answerEntry

    // No entrance to put this away: no row of table T-109 names U-60. The way
    // out is `Esc` (IN-4, FR-020), which reports a press and never writes, so
    // it cannot hide the watermark.
    const answers = made(host, 'div', STYLE.confirmationAnswers)
    for (const answer of modal.answers) {
      answers.append(confirmationAnswerElement(host, answer))
    }
    body.push(question, answerEntry, answers)
  }

  drawn.replaceChildren(header, ...body)
  return { element: drawn, watermarkUnlockEntry }
}

/** U-62 `Import Report` of table T-103, as `screen-renderer.ts` describes it. */
type ImportReport = Extract<OpenModal, { readonly droppedTaskNames: readonly (string | null)[] }>

/**
 * U-62 `Import Report` of table T-103 -- FR-023's list of dropped `Task` names.
 *
 * One element per name, never one joined string: a nameless `Task` (AT-27)
 * would vanish between separators (FR-023, MUST NOT a count). Nothing is capped
 * or summarised; the box is laid out to hold the list
 * (`STYLE.importReportBox`). Names are not translated; `text`, `nextStep` and
 * `dismissText` arrive from the dictionary (FR-038).
 *
 * @purity non-pure
 */
function importReportElements(host: Document, modal: ImportReport): readonly HTMLElement[] {
  // RS-50 of table T-233 and NT-3a's next step, already read from the
  // dictionary by `notices.ts` (FR-038).
  const said = made(host, 'div', '')
  said.textContent = modal.text
  const lines: HTMLElement[] = [said]
  if (modal.nextStep !== '') {
    // `noticeElement`'s quiet colour, reused so there is one colour to keep in
    // step.
    const step = made(host, 'div', STYLE.noticeNextStep)
    step.textContent = modal.nextStep
    lines.push(step)
  }
  for (const name of modal.droppedTaskNames) {
    const line = made(host, 'div', STYLE.confirmationItem)
    // For read-back (rule 04), not for the person; it tells a nameless row
    // (AT-27) from one named with an empty string.
    line.setAttribute('data-unnamed', String(name === null))
    line.textContent = name ?? ''
    lines.push(line)
  }
  // The list scrolls and the entrance does not: a way out pushed off the bottom
  // by a long list is no way out.
  const names = made(host, 'div', STYLE.confirmationNames)
  names.replaceChildren(...lines)

  // NT-8's `OK` (FR-023): a word is the body and no shape is drawn -- no row of
  // table T-109 names U-62, and adding one is RC-13 of table T-026's decision.
  // A press closes U-62: `readScreenPartAt` answers
  // `ScreenPart.isImportReportDismiss` and `input-command-translator.ts` closes
  // S-99g's surface. `Esc` (IN-4) is a second way out.
  const dismiss = made(host, 'button', entryStyle() + STYLE.noticeDismiss)
  dismiss.setAttribute('type', 'button')
  dismiss.setAttribute(IMPORT_REPORT_DISMISS_ATTRIBUTE, 'true')
  // Nothing is printed in place of an empty word: a row id on the screen is a
  // string FR-038 does not hold. `entryStyle`'s frame keeps it visible.
  dismiss.textContent = modal.dismissText
  // Kept out of the scrolling region by `confirmationAnswers`, reused as the
  // same job. One child: U-62 asks nothing.
  const wayOut = made(host, 'div', STYLE.confirmationAnswers)
  wayOut.replaceChildren(dismiss)
  return [names, wayOut]
}

/**
 * One thing told to the person (UF-67).
 *
 * The words are drawn and the manner rides along as its row id, so colour or
 * border never carries the meaning alone (NT-1, MUST NOT) and NT-5 can look
 * unlike NT-1. Everything is drawn as characters, the count included;
 * `data-affected-count` is only for read-back (rule 04).
 *
 * NT-8's entrance puts it away. It is never drawn on a question
 * (`confirmationElement`; NT-8, MUST NOT).
 *
 * @purity non-pure
 */
function noticeElement(host: Document, notice: Notice): HTMLElement {
  const drawn = made(host, 'div', STYLE.notice)
  drawn.setAttribute('data-manner', notice.manner)
  drawn.setAttribute('role', 'status')
  const text = made(host, 'div', '')
  text.textContent = notice.text
  drawn.append(text)
  if (notice.affectedCount !== null) {
    // NT-3: how many things a destructive result reaches, after the words it
    // qualifies and on the same line (NT-9).
    // The number stands alone: no table holds a word for what it counts, so a
    // word here would be unsettled.
    // @provisional PND-157
    const count = made(host, 'div', '')
    count.textContent = String(notice.affectedCount)
    drawn.append(count)
    drawn.setAttribute('data-affected-count', String(notice.affectedCount))
  }
  // NT-3a (MUST NOT a failure without a next step), on the telling's one line
  // (NT-9) -- see `STYLE.noticeNextStep`.
  for (const step of notice.nextSteps) {
    const line = made(host, 'div', STYLE.noticeNextStep)
    line.textContent = step
    drawn.append(line)
  }
  // NT-8: the entrance to put the telling away, last because it is what is
  // done about the telling. A word is the body and no shape is drawn: no row of
  // table T-109 names it, and adding one is RC-13 of table T-026's decision.
  // The word is UF-67's, from the dictionary (FR-038).
  const dismiss = made(host, 'button', entryStyle() + STYLE.noticeDismiss)
  dismiss.setAttribute('type', 'button')
  // WHICH telling a press here put away, and the whole of what this unit
  // reports about it: `NOTICE_DISMISS_KEY_ATTRIBUTE` says why it is on an
  // attribute of its own and which file closes the loop.
  dismiss.setAttribute(NOTICE_DISMISS_KEY_ATTRIBUTE, notice.dismissKey)
  // Nothing is printed in place of an empty word: a row id on the screen is a
  // string FR-038 does not hold. `entryStyle`'s frame keeps it pressable.
  dismiss.textContent = notice.dismissText
  drawn.append(dismiss)
  return drawn
}

/**
 * One of NT-7's two answers as a word button with its first character bold.
 *
 * Split here because it is a matter of drawing: a dictionary holding the word in
 * two pieces would hold a decision about how it looks. Two elements, so no
 * reader gets the word with the weight lost; an empty rest is right for a
 * one-character word.
 * Nothing is printed in place of an empty word: `answer` is the join, not a
 * dictionary string (FR-038). `entryStyle`'s frame keeps it pressable.
 *
 * The type is reached through `Confirmation`: `ScreenRenderer` declares
 * `ConfirmationAnswer`, but table T-064 does not publish it, and adding a row
 * there is the specification's decision.
 *
 * @purity non-pure
 */
function confirmationAnswerElement(
  host: Document,
  answer: Confirmation['answers'][number],
): HTMLElement {
  const drawn = made(host, 'button', entryStyle() + STYLE.confirmationAnswer)
  drawn.setAttribute('type', 'button')
  // WHICH of the two a press here gives, and the whole of what this unit reports
  // about it: `CONFIRMATION_ANSWER_ATTRIBUTE` says why it is on an attribute of
  // its own and which file closes the loop.
  drawn.setAttribute(CONFIRMATION_ANSWER_ATTRIBUTE, answer.answer)
  // No `aria-label`: unlike `commandEntry`'s shape body, the spans are the word
  // and give the name; a label would be a copy that stops following the
  // dictionary.
  const initial = made(host, 'span', STYLE.confirmationAnswerInitial)
  initial.textContent = answer.text.slice(0, 1)
  const rest = made(host, 'span', '')
  rest.textContent = answer.text.slice(1)
  drawn.append(initial, rest)
  return drawn
}

/**
 * U-55 `Confirmation` (UF-67), the question NT-7 of table T-037 asks before
 * something goes ahead. Modelled on the open surface, not on a notice: it stops
 * until answered.
 *
 * Names are one element each, for the reason `importReportElements` gives
 * (FR-032, FR-099). FR-032's shown-on-another-row mark is a word (PND-175), not
 * a shape: no row of table T-109 holds one (RC-13 of table T-026).
 *
 * The two answers come from `confirmationAnswerElement` and carry no shape.
 * No NT-8 entrance (MUST NOT): `Confirmation` carries neither `dismissText`
 * nor `dismissKey`.
 *
 * @purity non-pure
 */
function confirmationElement(host: Document, confirmation: Confirmation): HTMLElement {
  const drawn = part(host, 'div', ROLE.confirmation, STYLE.confirmation)
  // `alertdialog` and not `dialog`: it is the one this description matches --
  // a question that stops the reading until it is answered.
  drawn.setAttribute('role', 'alertdialog')
  drawn.setAttribute('aria-modal', 'true')
  // The join to table T-037, carried the way a notice carries its own.
  drawn.setAttribute('data-manner', confirmation.manner)

  // NT-7 (MUST): what is about to happen, in words. It arrives already in the
  // display language -- only the asker knows what it names.
  const text = made(host, 'div', '')
  text.textContent = confirmation.text

  const items = confirmation.items.map((item) => {
    const line = made(host, 'div', STYLE.confirmationItem)
    line.setAttribute('data-unnamed', String(item.name === null))
    // For read-back (rule 04) beside the word, not what tells the person.
    line.setAttribute('data-shown-on-another-row', String(item.isShownOnAnotherRow))
    // Set before the mark is appended, not after: the setter replaces every
    // child, so the other order would drop the mark it had just been given.
    line.textContent = item.name
    if (item.isShownOnAnotherRow) {
      // FR-032. Its own element, so a nameless `Task` (AT-27) does not show the
      // mark as though it were the name.
      const mark = made(host, 'span', STYLE.confirmationMark)
      mark.textContent = confirmation.shownOnAnotherRowMark
      line.append(mark)
    }
    return line
  })

  // NT-7's two answers in UF-67's order; neither is spent or a toggle.
  // No tooltip anchor: table T-029a hangs tooltips on rows of table T-109, and
  // these have none.
  const answers = made(host, 'div', STYLE.confirmationAnswers)
  for (const answer of confirmation.answers) {
    answers.append(confirmationAnswerElement(host, answer))
  }

  // The words and names scroll; the two answers do not: a choice pushed off the
  // bottom of the screen is no choice, and FR-032 forbids capping the names.
  const names = made(host, 'div', STYLE.confirmationNames)
  names.replaceChildren(text, ...items)
  drawn.replaceChildren(names, answers)
  return drawn
}

/**
 * The settled utterances, oldest first (UF-68), drawn in arrival order: the
 * far side orders by `DialogueMessage.sequence` (AG-11).
 *
 * @purity non-pure
 */
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

// -------------------------------------------------------------- the wiring ---

/**
 * What the caller hands over once, at wiring time.
 *
 * Every member is something LY-5 of table T-060 leaves to this layer. None is
 * reached for globally (R7.3), which lets this unit run where there is no DOM.
 */
export interface ScreenSurfaceWiring {
  /**
   * The document the nodes are made in.
   *
   * Only `createElement`, `createElementNS`, `elementFromPoint` and one
   * `addEventListener` are called on it. `createElementNS` because FR-029's
   * shapes are SVG and an element made outside that namespace draws nothing;
   * `elementFromPoint` because IF-9 of table T-065 has the side that drew an
   * entrance answer where it is; `addEventListener` because IN-6 of table T-028
   * reaches presses on the schedule, which IF-1 puts up outside this unit's tree
   * (see `settleOnPressOutside`; it reports nothing and raises no frame, so
   * FT-1 of table T-078 is untouched).
   * All four are asked for rather than assumed, so a host that lays nothing out
   * still works.
   */
  readonly host: Document
  /**
   * Where the screen is put. The surface makes a root of its own inside it and
   * never writes on the element it was given.
   *
   * It has to be in the document already: FR-051's height is measured off a
   * laid-out box, and a detached mount measures to nothing. A host may still lay
   * it out at 0 x 0 (a preview pane not yet sized); that height is the truth of
   * the moment, and the caller's BO-1 guard keeps a frame from being drawn
   * against it.
   */
  readonly mount: Element
  /**
   * Who is speaking, for a line this person settles -- the name AG-6 of table
   * T-035 compares against.
   *
   * Read each time rather than taken once: LY-5 leaves the current value with
   * the caller, and nothing in the specification settles where a person's own
   * name is kept.
   */
  readonly readAuthor: () => string
  /**
   * The machine's clock, in milliseconds since the epoch.
   *
   * Read at the moment a line is settled: the stamp AT-129 spells is when the
   * person settled it.
   */
  readonly readClockMs: () => number
  /**
   * FR-051: the height the `App Header` measures to, which BO-1 of table T-077
   * settles before anything is drawn.
   *
   * Called once before this factory returns, so the callback may not reach for
   * the surface -- there is not one yet. Called again only when a redraw
   * measured a different height (FT-3 of table T-078); it must only record the
   * number and leave the deciding to the shell's resize path, because NFR-010
   * forbids waking a frame on anything else.
   */
  readonly onAppHeaderHeightPx: (heightPx: number) => void
  /**
   * LF-3 of table T-221: the height HF-1's lattice takes, which that row makes a
   * floor under every row's band.
   *
   * Measured and never stated (HF-19): this unit builds the lattice, so it is
   * the one side that can answer without inventing a number.
   * On the wiring and not on IF-9, for the reason `holdFocusPropertyField` gives.
   * Called only when the measurement changed, and never before a row has been
   * drawn -- there is no lattice to measure until then.
   */
  readonly onRowControlsHeightPx?: (heightPx: number) => void
  /**
   * MK-13's second half, handed to the caller once, before this factory returns
   * -- a way to put the person into the control this surface drew for one row of
   * table T-016: focus it and select everything already in it.
   *
   * Only the side that drew the field can do it (LR-6). On the wiring and not on
   * `ScreenSurface`: the supplies the IF-9 cell of table T-065 names are all
   * questions, and another member would claim a duty that seam was not given;
   * `screen-surface.ts` records the same bargain from the seam's side.
   *
   * Ask it after the description has been drawn: the control does not exist
   * until `showScreenView` builds it, so an earlier request reaches the panel of
   * the frame before. A row this surface did not draw, or one whose control
   * takes no characters, does nothing -- what the panel came out as is the
   * drawing side's answer, not an error.
   *
   * Optional so that existing callers compile; the cost is that a caller which
   * never passes it leaves MK-13 half done silently, and only the tests written
   * from the specification watch it.
   */
  readonly holdFocusPropertyField?: (focus: (row: string) => void) => void
  /**
   * FR-020: handed to the caller once, before this factory returns -- a way to
   * read what stands in the masked field U-60 `Watermark Unlock` draws, at the
   * moment one of that surface's two answers is given.
   *
   * On the wiring and not on IF-9, for the reason `holdFocusPropertyField` gives.
   * `readFieldCommit` is not the road either: it carries the `Properties Panel`'s
   * settled value, and this answer settles nothing and writes no column.
   *
   * Pulled and not pushed: a push would hand the raw password out on every
   * keystroke, which FR-020 forbids. Reading it does not take it: FR-020 caps no
   * tries, so a mismatch leaves the characters for the person to correct.
   *
   * An absent field and an empty field both answer the empty string; neither can
   * match the SHA-256 the specification states, so nothing needs them told
   * apart.
   *
   * Optional; a caller that never asks for it can never hide the watermark,
   * which is the safe direction (FR-020's gate is on the hiding side).
   */
  readonly holdReadWatermarkUnlockAnswer?: (read: () => string) => void
  /**
   * FR-041: which of table T-236's two renderings to paint in, and the hue the
   * rows that follow the theme are solved with.
   *
   * Read each frame, like `readAuthor`: IC-16 switches S-72 while the document
   * is open. Also read once while this factory runs, because the header is built
   * and measured there.
   *
   * Required: neither S-72 nor S-73 crosses IF-9 (`ScreenView`, `ScreenFrame` and
   * `AppHeaderItems` carry no member for either), so this is the only way in. An
   * optional member would need a system-colour fallback behind every `var()`,
   * which lets the environment decide the theme (FR-041); without a fallback a
   * `var()` resolves to `unset` and the chrome ships with no colour. The compiler
   * naming every caller is the cheaper failure.
   *
   * The caller already holds both values (`documentSettings.themePreference`,
   * `schedule.project.themeHue`). `ScreenSession` is not a way in: it is
   * ScreenRenderer's argument, and what crosses IF-9 is `ScreenView`.
   * Searched: FR-041, S-72 / S-73, `ScreenView`, `ScreenFrame`,
   * `AppHeaderItems`, `ScreenSession`, table T-064.
   */
  readonly readTheme: () => ScreenTheme
}

/** What the person settled, until the draw that follows takes it away. */
interface Settlement {
  readonly text: string
  readonly settledAt: string
}

/**
 * The one implementation of `ScreenSurface` (PI-38 of table T-064, CP-38).
 *
 * The caller's half of the contract:
 *
 *   1. Wire this up before BO-1's regions are computed. `onAppHeaderHeightPx`
 *      fires while this function runs and is the only source of FR-051's
 *      measured height.
 *   2. In a frame that reads, read before drawing. `readDialogueInput` is
 *      `semi-pure-b` and may not take the settled line away, so the draw takes
 *      it, and a read with no draw after it would hand the same utterance over
 *      twice.
 *
 * @purity non-pure
 */
export function domScreenSurface(wiring: ScreenSurfaceWiring): ScreenSurface {
  const { host, readAuthor, readClockMs, onAppHeaderHeightPx, readTheme } = wiring

  // FR-041 from the first moment there is a root: the header is built and
  // measured inside this factory, before any frame.
  const root = made(host, 'div', STYLE.root + themeStyle(readTheme()))
  // Table T-103 has no row for the whole screen, so the root carries the unit's
  // row of table T-075 instead of a minted part name. It also scopes `hoverCss`.
  root.setAttribute('data-unit', UNIT_ROW)

  // HF-6 and the faint half of FR-053, neither of which an inline declaration can
  // state. Hung off the root so it lives and dies with this tree; never
  // rewritten, since neither rule depends on a description.
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
  /**
   * FR-020: the masked field U-60 asks the password into, while that surface
   * stands -- `null` while it does not.
   *
   * Not built with the tree as `dialogueEntry` is: that one must survive a
   * redraw, and this one must not outlive the surface, since FR-020 keeps the raw
   * password out of code, model and output.
   * Held as `TextEntryControl`, not `HTMLInputElement`: table T-075 leaves this
   * unit runnable against a host that lays nothing out, whose elements need not
   * have a `blur`.
   */
  let watermarkUnlockEntry: TextEntryControl | null = null
  const noticeLayer = part(host, 'div', ROLE.notices, STYLE.layer)
  // Not itself a part: U-55's `data-role` is written on the surface this layer
  // holds, so a point on the layer's own emptiness answers as nothing.
  const confirmationLayer = made(host, 'div', STYLE.layer)
  const tooltipLayer = part(host, 'div', ROLE.tooltips, STYLE.layer)

  // HF-10 of table T-051. Built once and never rebuilt: it takes nothing from a
  // description, and rebuilding it would discard the browser's work and drop it
  // from the panel for a frame.
  const openEveryRow = openEveryRowElement(host)
  // HF-12: built and mounted the same way, for the same reason.
  const collapseEveryRow = collapseEveryRowElement(host)
  // HF-16 and HF-17: built and mounted the same way, for the same reason.
  const openLevelZero = openLevelZeroElement(host)
  const addTopRow = addTopRowElement(host)
  // HF-12's folded-row count, one step outside the outermost entrance; built once
  // with them and written every frame (`markFoldedRowCount`).
  const headFoldedRows = foldedRowCountElement(host, 0, headFoldedRowCountRight())
  rowTitlePanel.append(openEveryRow, collapseEveryRow, openLevelZero, addTopRow, headFoldedRows)

  dialogueEntry.setAttribute('type', 'text')
  dialogueEntry.setAttribute('style', STYLE.dialogueEntry)
  dialogueField.append(dialogueMessages, dialogueEntry)

  // The order is the stacking order. The tooltip layer is last because IN-3 lets
  // a person point at a tooltip. The confirmation is above the notices and below
  // the tooltips: a notice over its two answers would take away NT-7's choice.
  // The sheet has no box and paints nothing, so its place does not matter.
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

  // STOP -- the names past the first screenful of a `Confirmation` (FR-032)
  // cannot be scrolled into view: wheel and scrollbar are both stopped by the
  // input seam's `preventDefault`, because `isWheelHere` (PND-12) reads the
  // pointer against the schedule's regions, and a press anywhere carries an
  // assignment.
  // Looked in MK-10: both its MUST and its MUST NOT speak only of inputs carrying
  // a modifier the tool assigned, so no row asks for a plain wheel's scrolling
  // to be taken away here.
  // Both repairs are shut: a listener here stopping the wheel is refused by
  // `tests/unit/uf-71.test.ts` (listeners only inside the `Dialogue Field` or the
  // `Properties Panel`, one on the host), and letting `isWheelHere` answer false
  // while a `Confirmation` stands needs an `InputContext` member only the shell
  // can fill.
  // NT-7 is kept: the two answers are outside the scrolling region. PND-380 holds
  // the rest; no provisional mark, since that row waits for a ruling.

  let lastKeys: Readonly<Record<string, string>> = {}
  // Held so the attribute is written only when it moved: every happening of
  // table T-078 runs a frame, and rewriting an attribute with the same value
  // still costs a style recalculation of the subtree on the path NFR-002
  // measures (the shell's `showPointerShape` holds its last value for the same
  // reason). The empty string is no language, so the first description writes.
  let langShown = ''
  let headerHeightPx = 0
  // Held apart from the number rather than folded in as 0 meaning "not measured":
  // 0 is a height a host really answers, and folding would swallow the first
  // measurement (FR-051).
  let isHeaderHeightSettled = false
  /**
   * The tallest HF-1 lattice this unit has drawn, in pixels -- LF-3's floor,
   * held so that it is reported only when it moved.
   *
   * The tallest and not the first: HF-5 makes them equal on ordinary rows, but a
   * lattice with an empty rank is shorter, and the tallest keeps every band
   * clear of the next one's controls.
   * Never reset downward by a panel that drew no row: a folded 段 0 (HR-2) draws
   * no lattice, and a floor of 0 there would make the bands jump when the head
   * is opened again.
   */
  let rowControlsHeightPx = 0
  /**
   * The key the last measurement of `rowControlsHeightPx` was taken against, or
   * `null` while none has been taken.
   *
   * A key rather than a measurement every frame: `getBoundingClientRect` on a
   * just-rebuilt tree forces a layout on the spot, and on the shipped build at
   * the target scale (1000 Task, 1920 x 1080) that one forced layout, not the
   * reads, was the cost -- 11.3 ms of a scrolling frame. Only how often it is
   * asked is saved; the answer is still measured off the laid-out lattice
   * (HF-19).
   */
  let rowControlsMeasuredAgainst: string | null = null
  /**
   * When the panel was last drawn, by `readClockMs`, so that the frame which
   * ends a lull can be told from one inside a gesture.
   *
   * The net under the key: the reader's own text size is not visible to it (on
   * the shipped build, moving the base text to 24px and 32px redrew the panel
   * without the header, so no term moved). This makes a wrong key stale rather
   * than frozen: the first frame after a lull measures again.
   * A lull and not a period: frames inside a gesture never end a lull, so the
   * scroll path pays nothing, and a frame after a quiet spell has NFR-003's whole
   * budget free.
   */
  let rowControlsPanelDrawnAtMs = 0
  let settled: Settlement | null = null
  let isFieldUp = false
  // One at a time, the last one wins: a person holds one control, and `change`
  // is raised as the previous one is left, so a second commit before the shell
  // collected the first would have been collected next frame anyway. Held here
  // because the element is thrown away by the next redraw.
  let fieldCommit: FieldCommit | null = null

  /**
   * What each part's tooltips are anchored to, one map per part.
   *
   * Not one map for the screen: a part is rebuilt only when its description
   * changed, so a single map would keep detached nodes of rebuilt parts, which
   * measure to nothing and put a tooltip in the top-left corner.
   */
  const anchorsByPart = new Map<string, Map<string, HTMLElement>>()

  /**
   * The map a part records into, emptied because that part is being rebuilt.
   *
   * @purity non-pure
   */
  function anchorsOf(name: string): Map<string, HTMLElement> {
    const held = anchorsByPart.get(name) ?? new Map<string, HTMLElement>()
    held.clear()
    anchorsByPart.set(name, held)
    return held
  }

  /**
   * The element one tooltip explains, wherever it was drawn.
   *
   * @purity semi-pure-b
   */
  function anchorFor(key: string, anchor: TooltipAnchor): HTMLElement | undefined {
    for (const held of anchorsByPart.values()) {
      const found = held.get(key)
      if (found !== undefined) return found
    }
    // Then the tree itself, by row id: the entrances drawn per row and per person
    // (IC-58 .. IC-60, IC-77, IC-82, IC-63 ..) are built where no `anchors` map is
    // threaded, and EZ-2 of table T-040 reaches every row of table T-109.
    // `data-icon` carries the row id `anchorKey` is built from, so this is not a
    // second join. The first one drawn: FR-029 forbids one entrance in two places.
    if (anchor.kind !== 'icon') return undefined
    return root.querySelector<HTMLElement>(`[data-icon="${anchor.icon}"]`) ?? undefined
  }

  /**
   * FR-051: the height is taken from the environment, not from a settings key.
   * Reported only when it changed, so the caller's FT-3 path is not told about a
   * frame that moved nothing.
   *
   * The first measurement is always reported, 0 included -- see 1a at the top
   * of this file. "Changed" is judged against whether anything was settled yet,
   * never against the starting number, so a host laying the header out at 0
   * still settles BO-1 of table T-077.
   *
   * @purity non-pure
   */
  function reportHeaderHeight(): boolean {
    const measured = appHeader.getBoundingClientRect().height
    if (isHeaderHeightSettled && measured === headerHeightPx) return false
    isHeaderHeightSettled = true
    headerHeightPx = measured
    onAppHeaderHeightPx(measured)
    return true
  }

  /**
   * Everything this unit can see that can move the height of HF-1's lattice or
   * of HF-4's pair, as one string. While it does not change, the measurement
   * already taken stands.
   *
   * No term reads style or geometry back off the tree: a witness that forced a
   * layout would cost what it saves (on the shipped build,
   * `getComputedStyle(...).fontSize` read here cost more than the reads it would
   * have replaced).
   *
   * The terms:
   * 1. The four declarations that spell the boxes' stated shape
   *    (`rowControlGridStyle` states two tracks of `rowControlBoxPx`), so a change
   *    to table T-206's numbers or a third rank moves them.
   * 2. Whether any row is drawn, not how many: a scroll moves rows through the
   *    panel by turns, and counting them would re-measure an unchanged box on
   *    half the frames.
   * 3. The language, which can change the faces the environment falls back to.
   * 4. The theme: a declaration block that could restate a size.
   * 5. The width the frame reserves for the panel (FR-052's divider), which is
   *    also how a window resize reaches this side.
   * 6. The header's measured height, laid out from its content and so this
   *    unit's only witness that the environment's text size moved.
   *
   * The reader's text size has no term of its own, and term 6 does not always
   * follow it. HF-5 and S-138 keep the control box from following it, and
   * `ROW_CONTROLS_LULL_MS` is the net, so a missed change goes stale but never
   * freezes.
   *
   * @purity non-pure
   */
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

  /**
   * LF-3 of table T-221: the height HF-1's lattice takes, which that row makes a
   * floor under the row's band.
   *
   * Measured off the lattice, never summed from S-138 and S-141: HF-19 keeps the
   * number out of its row, and a sum here would be a second copy of LF-3's.
   * The floor does not follow the reader's text size (HF-19, LF-3), which is why
   * the measure key carries no font scale; making it follow would break S-138.
   * Measurable while the controls are hidden: HF-6's showing is done with
   * `visibility` (`ROW_CONTROL_SHOWN_CSS`), which leaves the boxes laid out.
   * Reported only when it changed, so the caller's FT-3 path is not told about a
   * frame that moved nothing.
   *
   * @purity non-pure
   */
  function reportRowControlsHeight(measuredAgainst: string): void {
    // The one condition not in the key: an answer of 0 is asked again every frame
    // until it is not 0. A mount can be laid out at 0 x 0 before the host sizes
    // it (`ScreenSurfaceWiring.mount`), and a key alone would keep that first 0
    // for the life of the page. A host that lays nothing out keeps asking at no
    // cost: there is no layout for the read to force.
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
    // Both boxes of HF-4's run are read, not the folding lattice alone: the
    // deletion and the addition stand in a second grid of two ranks, and the
    // answer must not depend on which box was asked.
    const stacked = `[${ROW_FOLDING_GRID_MARK}],[${ROW_CONTROL_PAIR_MARK}]`
    for (const box of rowTitleTree.querySelectorAll(stacked)) {
      tallest = Math.max(tallest, box.getBoundingClientRect().height)
    }
    if (tallest === rowControlsHeightPx) return
    rowControlsHeightPx = tallest
    wiring.onRowControlsHeightPx?.(tallest)
  }

  /**
   * AG-11: what has not been settled may not be read as an utterance. This is
   * the one place on this side that decides a line has been settled.
   *
   * `isComposing` matters: a person entering Japanese presses Enter to accept
   * what the input method offers, not to send it, so reading that press would
   * post a half-typed line.
   *
   * `preventDefault` is not called here: MK-10 of table T-023 lets the browser's
   * behaviour be stopped only for what the tool assigned, and only
   * `commandFromInput` knows which is which -- so the press travels on to
   * DomInputSource, whose frame carries this settlement away (FT-1).
   *
   * @purity non-pure
   */
  function onEntryKeyDown(event: KeyboardEvent): void {
    if (event.key !== HOST_ENTER || event.isComposing) return
    // A modified Enter is left alone: MK-10 keeps combinations the tool did not
    // assign for the browser.
    if (event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) return
    if (!isFieldUp) return
    settled = { text: dialogueEntry.value, settledAt: stampOf(readClockMs()) }
    dialogueEntry.value = ''
  }

  dialogueEntry.addEventListener('keydown', onEntryKeyDown)

  /**
   * One explanation shown against something (UF-69).
   *
   * IN-3 governs all of them, which is why the browser's own `title` attribute
   * is nowhere in this file: that tooltip cannot be pointed at and goes away by
   * itself.
   *
   * IN-3's dismissal is not built here: IN-4 of table T-028 ends its `Esc` ladder
   * with the explanation that is showing (`'tooltip'` in `escapeTarget`), and a
   * second way added here would be a second entrance to one operation (FR-029).
   *
   * @purity non-pure
   */
  function tooltipElement(tip: Tooltip): HTMLElement {
    const key = anchorKey(tip.anchor)
    const drawn = made(host, 'div', tooltipStyle())
    drawn.setAttribute('role', 'tooltip')
    drawn.setAttribute('data-anchor', key)
    // EZ-2 of table T-040: the explanation, then the assignment. Joined here and
    // not on the far side: the description keeps them apart because the
    // explanation is the dictionary's word; joining is a drawing decision. A
    // space and nothing else -- a separator with meaning would be a word outside
    // the one dictionary (FR-038).
    // Tested for truth, not `!== null`: a description arriving without the member
    // would otherwise show the word `undefined`; an empty string means none.
    drawn.textContent = tip.assignment
      ? `${tip.text} ${tip.assignment}`
      : tip.text

    // A point carried by the description wins, and only EZ-6's Task carries one:
    // that explanation is anchored to a bar in the schedule's picture, which goes
    // up over IF-1, so there is no element of this surface to stand against. Read
    // rather than measured: the side that drew the bar says where it is.
    // @provisional PND-391
    if (tip.at !== undefined) {
      // STOP -- IN-3 of table T-028 grants every tooltip being pointed at, and this
      // one refuses the pointer: standing under the pointer, the box would become
      // the element there, `readScreenPartAt` would answer `Tooltip`, and
      // `grabAtPointer` would turn the point away, leaving the bar unreachable.
      // Looked in EZ-6: it has the explanation go on a pointer move, so the hover
      // IN-3 grants cannot be reached for this raiser anyway. The other two raisers
      // stand away from the point and keep it. Reported, not settled -- PND-391.
      drawn.setAttribute(
        'style',
        tooltipStyle() + `pointer-events:none;left:${tip.at.x}px;top:${tip.at.y}px;`,
      )
      return drawn
    }

    // Placed against the element that carries the anchor (EZ-2's icon entry, the
    // row FR-085 cut, or the lane FR-037's hint belongs to). Read from the live
    // tree: `ScreenView` carries no rectangle for an entry, the same absence
    // `ScreenSession.iconUnderPointer` records.
    const anchored = anchorFor(key, tip.anchor)
    if (anchored === undefined) {
      drawn.setAttribute('style', tooltipStyle() + 'left:0;top:0;')
      return drawn
    }
    const foundAt = anchored.getBoundingClientRect()
    drawn.setAttribute('style', tooltipStyle() + `left:${foundAt.left}px;top:${foundAt.bottom}px;`)
    return drawn
  }

  /**
   * U-22 and U-25 have no rectangle in the description; FR-052's `Panel Divider`
   * line is the panel's own edge, so that is what places them.
   *
   * With no divider the panel is placed against the window edge and sized by its
   * contents, which will not agree with the width `regionsFromScreen` reserved
   * for it (`propertyPanelWidth`, S-80).
   *
   * @provisional PND-155
   * @purity non-pure
   */
  function placePanels(view: ScreenView): void {
    const titleEdge = panelEdge(view.frame, 'rowTitlePanel')
    rowTitlePanel.setAttribute(
      'style',
      titleEdge === null
        ? STYLE.hidden
        : STYLE.rowTitlePanel +
            `left:0;top:${headerHeightPx}px;width:${titleEdge.x}px;bottom:0;`,
    )
    // UF-64's `null` is a closed panel, as it goes into an export (EP-8), so it
    // is not drawn rather than drawn empty.
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

  /**
   * Where the `Dialogue Field` stands: inside the drawing area's corner, clear of
   * the lane SC-4 keeps both scrollbars drawn in.
   *
   * @provisional PND-151
   * @purity non-pure
   */
  function placeDialogueField(view: ScreenView): void {
    // FR-066.
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

  /**
   * Put the description on the screen (the first half of IF-9).
   *
   * The whole description each time; only the rebuilding of a part whose
   * description did not change is skipped, which loses no information and keeps
   * the browser's paint work for that part. The dialogue entry is never rebuilt:
   * removing a focused input takes the focus and caret with it, and the person
   * would lose the line they are typing every frame.
   *
   * @purity non-pure
   */
  function showScreenView(view: ScreenView): void {
    // NT-8 of table T-037: this unit's field listeners must decline `Enter` and
    // `Esc` while a telling stands, and can see only what this unit was handed.
    // Written on every description, not only a changed one: the redraw below is
    // skipped wherever nothing moved.
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
    /**
     * What was actually put on the screen this frame, which the next frame
     * compares against.
     *
     * Not `keys`: a part may decline to redraw on a frame whose description did
     * change, because a held control would lose its characters and caret.
     * Recording the declined description would make the next frame see no change,
     * so the part would keep showing the old description even after the control
     * is let go. A skipped part keeps its last drawn key, so the next frame that
     * may draw it sees a difference and draws it (NFR-010).
     */
    const drawnKeys: Record<string, string> = { ...keys }

    // FR-038: one language for the whole screen -- the half the dictionary cannot
    // reach. Controls the host draws for table T-016's input types
    // (`CONTROL_INPUT_TYPE`; a `date` control's calendar, say) bring the
    // environment's own words, in the language of the `lang` they inherit; this
    // attribute tells the environment which language the person is reading in.
    //
    // On this unit's root and not on the host's `documentElement`: every control
    // hangs off this root, and `ScreenSurfaceWiring.host` lists what is called on
    // the host. The page's own `lang` is left alone; carrying the language out
    // that far needs a second channel from the loop to the shell (the twin of
    // `showPointerShape`), which is not built.
    // Not a `data-` attribute like the entry's (IC-21) and the help's
    // `data-language`: those are the description read back, and this one is what
    // the environment acts on.
    //
    // Before the header is redrawn and re-measured: the language can change the
    // faces the environment falls back to, and a first frame in a new language
    // would otherwise report a height measured in the old one (FR-051).
    //
    // Which element carries it is undecided -- PND-323.
    //
    // @provisional PND-323
    if (view.language !== langShown) {
      langShown = view.language
      root.setAttribute('lang', view.language)
    }

    // The header is redrawn first: everything below is placed against the height
    // it measures (FR-051), and it is the only part re-measured after being
    // rewritten.
    let isHeaderMoved = false
    if (changed('appHeaderItems')) {
      // A redraw may not take what is being typed: `fillAppHeader` replaces every
      // child of this band, and the field SK-9 opened over the name is one of
      // them. The height is not re-measured either: the band being typed in is
      // the band on the screen.
      if (documentTitleEntry !== null) {
        // The description that was not drawn is not recorded as drawn -- see
        // `drawnKeys`.
        drawnKeys.appHeaderItems = lastKeys.appHeaderItems ?? ''
      } else {
        documentTitleBox = fillAppHeader(
          host,
          appHeader,
          view.appHeaderItems,
          anchorsOf('appHeaderItems'),
        )
        // The name as drawn, kept for the field FR-035 opens on it: while that
        // field stands the box holds the field instead of the text.
        documentTitleShown = view.appHeaderItems.documentTitle ?? ''
        isHeaderMoved = reportHeaderHeight()
      }
    }
    if (changed('frame')) {
      fillScreenFrame(host, frameLayer, view.frame, anchorsOf('frame'))
      // S-99f. Neither FR-071's leaving by the entry it entered by nor IN-4a's
      // passing Esc to the browser can be carried out here: nothing published
      // lets a surface ask the browser for full screen or hear that it left. The
      // state is written where it can be read.
      root.setAttribute('data-full-screen', String(view.frame.isFullScreen))
    }
    if (changed('rowTitlePanel')) {
      // No redraw guard: this tree holds nothing a person types into.
      fillRowTitleTree(host, rowTitleTree, view.rowTitlePanel, anchorsOf('rowTitlePanel'))
      // Measured here and not at BO-1: LF-3's floor is the lattice's own box,
      // built per row, so this is the first moment the answer exists. The frame
      // that measures it was laid out without it; the caller's FT-3 path draws the
      // next one with it, as `onAppHeaderHeightPx` does for the header.
      // The key is built after the tree is filled: term 2 is about the tree that
      // now stands, and term 6 was re-measured by the block above.
      reportRowControlsHeight(rowControlsMeasureKey(view))
      // HF-10: the entrance may not overlap the pinned rows' controls, and the
      // band above the topmost row is where it does not. Recorded, not enforced:
      // the entrance stays where HF-10 puts it, and `rowsTopPx` holds why the band
      // cannot be asked for outright. Absent when the panel draws no row: nothing
      // to overlap, no first row to measure from.
      const rowsTop = rowsTopPx(view.rowTitlePanel)
      // Written on every corner entrance: HF-12 takes HF-10's placement and so
      // takes its MUST NOT with it.
      for (const corner of [openEveryRow, collapseEveryRow, openLevelZero, addTopRow]) {
        if (rowsTop === null) corner.removeAttribute('data-corner-band')
        else corner.setAttribute('data-corner-band', String(rowsTop - headerHeightPx))
      }
      // FR-029: the panel's own entrances are made faint where they have nothing
      // left to do, as the row entrances are. The steps are the ones they were
      // built with: the style carries the placement, so it is restated with the
      // paint rather than kept in two places.
      markPanelCornerEntry(openEveryRow, 1, view.rowTitlePanel.canOpenEveryRow)
      markPanelCornerEntry(collapseEveryRow, 2, view.rowTitlePanel.canCloseEveryRow)
      // HF-16.
      markPanelCornerEntry(openLevelZero, 3, view.rowTitlePanel.canOpenLevelZero)
      // IC-93 is never faint: adding a row at 段 0 always changes the document
      // (FR-085 allows the shallowest level, so S-125's cap cannot refuse it),
      // and FR-029 fades only entrances that can change neither document nor
      // screen.
      markPanelCornerEntry(addTopRow, 0, true)
      // HF-12: the rows the head holds folded now, 段 0's own fold included.
      markFoldedRowCount(
        headFoldedRows,
        view.rowTitlePanel.foldedRowCount ?? 0,
        headFoldedRowCountRight(),
      )
    }
    if (changed('propertiesPanel') && view.propertiesPanel !== null) {
      markPropertiesPanel(propertiesPanel, view.propertiesPanel)
      // A redraw may not take what is being typed: every happening of table T-078
      // runs a frame, and `replaceChildren` would discard the held control with
      // its characters and caret. While a control is held the fields stay as they
      // stand; the frame after it is let go draws them again.
      // The attributes above are still written: they say which of FR-072's two
      // the panel is on, which no control holds and a check reads back.
      // Whether a control is held is watched (`focusin` / `focusout` bubble to the
      // panel), not read off the host's `activeElement`.
      // `anchorsOf` is called only on frames that really redraw: it empties the
      // map, and a skipped frame would lose the anchors of entries still on the
      // screen.
      if (isFieldHeld) {
        // The description that was not drawn is not recorded as drawn -- see
        // `drawnKeys`.
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
      // FR-020: the U-60 field, kept as long as the surface that drew it stands.
      // Replaced whenever the surface is redrawn: a reference kept over would read
      // characters from a field nobody can see. The person's characters still
      // survive frames, because this branch runs only when the surface's
      // description changed, and U-60's does not change while it is up.
      watermarkUnlockEntry = drawnModal === null ? null : drawnModal.watermarkUnlockEntry
      // Only where there is a field, so nothing is registered while U-60 is
      // closed -- see `watchWatermarkUnlock`.
      if (drawnModal !== null && drawnModal.watermarkUnlockEntry !== null) {
        watchWatermarkUnlock(drawnModal.element)
      }
    }
    if (changed('notices')) {
      noticeLayer.replaceChildren(...view.notices.map((one) => noticeElement(host, one)))
    }
    if (changed('confirmation')) {
      const asked = view.confirmation
      // No anchor map: table T-029a hangs a tooltip on a row of table T-109, and
      // NT-7 refuses this surface's two answers such a row.
      confirmationLayer.replaceChildren(
        ...(asked === null ? [] : [confirmationElement(host, asked)]),
      )
    }
    if (changed('dialogueField')) {
      const field = view.dialogueField
      // The entry node is kept whether the field is up or not, so a frame in
      // which it is down does not throw away what is in it.
      isFieldUp = field !== null
      if (field !== null) fillDialogueMessages(host, dialogueMessages, field)
    }

    // The parts that carry no rectangle of their own hang off the header's
    // height and off the frame's dividers and lanes, so they are placed again
    // whenever either moved.
    if (isHeaderMoved || changed('frame') || changed('propertiesPanel')) placePanels(view)
    if (isHeaderMoved || changed('frame') || changed('dialogueField')) placeDialogueField(view)
    if (isHeaderMoved || changed('notices')) {
      noticeLayer.setAttribute('style', STYLE.notices + `top:${headerHeightPx}px;`)
    }

    // Anything above may have moved what a tooltip is anchored to, so tooltips
    // are placed last whenever anything moved -- the order
    // `screenViewFromRegions` builds in, for the same reason.
    if (isHeaderMoved || Object.keys(keys).some(changed)) {
      // Nothing is held back: what is drawn is what the description holds.
      tooltipLayer.replaceChildren(...view.tooltips.map((one) => tooltipElement(one)))
    }

    lastKeys = drawnKeys
    // BO-1 of table T-077: nothing has been shown until here -- the header was
    // mounted only so FR-051 could measure it. Made visible synchronously, never
    // inside a frame callback: a first paint that waits for one leaves a white
    // screen until an input arrives.
    // FR-041, on the root: a custom property is inherited, so one declaration
    // reaches every part, and `color-scheme` reaches the scrollbars the
    // environment paints. Read again, not carried from the factory: IC-16
    // switches S-72 while the document is open.
    root.setAttribute('style', STYLE.rootShown + themeStyle(readTheme()))

    // The settled line is taken away here, the only member that may:
    // `readDialogueInput` is `semi-pure-b`. The frame that drew a description has
    // already read the utterance, which is why the caller reads before it draws.
    settled = null
  }

  /**
   * What stands in the dialogue field, or `null` while the person has entered
   * nothing (the second half of IF-9).
   *
   * `isSettled` is what crosses: `dialogueMessageFromInput` (PI-37) refuses the
   * line while it is false, and `onEntryKeyDown` decides it (AG-11).
   *
   * Not deterministic -- two calls one keystroke apart answer differently -- and
   * it changes nothing (`semi-pure-b`): the draw that follows takes the settled
   * line away.
   *
   * @purity semi-pure-b
   */
  function readDialogueInput(): DialogueInput | null {
    if (!isFieldUp) return null
    const held = settled
    if (held !== null) {
      return { text: held.text, isSettled: true, author: readAuthor(), settledAt: held.settledAt }
    }
    const typed = dialogueEntry.value
    if (typed === '') return null
    // `settledAt` is empty: nothing has been settled, so there is no moment to
    // name. `dialogueMessageFromInput` answers `null` before it looks, and no row
    // says what an unsettled line should carry.
    // @provisional PND-156
    return { text: typed, isSettled: false, author: readAuthor(), settledAt: '' }
  }

  /**
   * What a settled control is worth, as the row of table T-016 it names and the
   * text that crosses -- or `null` for something this unit did not draw as a
   * control.
   *
   * A checkbox carries its value in `checked` and every other control in
   * `value`; a truth value crosses in the spelling `textOfValue` writes on the
   * other side, so nothing new is minted.
   *
   * Shared by every way of settling (SK-19's `Enter`, the host's `change`, IN-6's
   * press) so the row and the text are decided in one place.
   *
   * @purity pure
   */
  function fieldCommitOf(target: unknown): FieldCommit | null {
    // Not `instanceof Element`: table T-075 leaves this unit runnable against a
    // host without that global, so membership in the map is what says this was
    // a control drawn here.
    if (target === null || typeof target !== 'object') return null
    const named = CONTROL_KEYS.get(target as Element)
    if (named === undefined) return null
    const input = target as HTMLInputElement
    const text = input.type === 'checkbox' ? String(input.checked) : input.value
    return { row: named.row, key: named.key, text }
  }

  /**
   * A person settled a value in one of the property fields.
   *
   * One listener on the panel, not one per control: `change` bubbles, and the
   * fields are rebuilt on nearly every frame. `change` and not `input`: one undo
   * step, not one per letter (see `controlElement`). A `change` on anything not
   * in `CONTROL_KEYS` is ignored rather than guessed at.
   *
   * A `change` that repeats what `Enter` already settled is dropped: the host
   * raises `change` on leaving a control whose value differs from its focus-time
   * value, and SK-19's listener moves that baseline as it settles -- otherwise
   * one value would be written twice (FR-031, UN-3 of table T-027). The host
   * still raises that `change` on leaving even though `Enter` itself is stopped
   * (MK-10).
   *
   * @purity non-pure
   */
  function onFieldChange(event: Event): void {
    const commit = fieldCommitOf(event.target)
    if (commit === null) return
    const target: unknown = event.target
    if (target === (heldTextControl as unknown) && commit.text === heldTextValueAtFocus) return
    fieldCommit = commit
  }

  propertiesPanel.addEventListener('change', onFieldChange)

  /**
   * The control this panel drew for each row of table T-016 that a person types
   * into, as the last redraw left it -- what `focusPropertyField` reaches.
   *
   * Emptied by `fillPropertiesPanel` before it draws: `replaceChildren` discards
   * every control of the frame before, and a stale entry would name a node no
   * longer on the page.
   * A strong map, unlike `CONTROL_KEYS`: the row is the key, so nothing is kept
   * alive that the clearing does not release.
   */
  const typedControlsByRow = new Map<string, TextEntryControl>()

  /**
   * MK-13's second half, carried out where the field is: the control of one row
   * of table T-016 is focused and everything already in it selected.
   *
   * Asked for, not watched for: the shell decides MK-13 happened, and only this
   * side can reach a control (LR-6).
   *
   * A row that was not drawn does nothing, quietly -- what the panel came out as
   * is this side's answer. Both calls are guarded: a host that lays nothing out
   * need give its elements neither (table T-075).
   * Nothing about the hold is recorded here: the host raises `focusin` on the
   * panel, and that listener is the one writer of `heldTextControl` and its
   * starting value.
   *
   * @purity non-pure
   */
  function focusPropertyField(row: string): void {
    // The row may name a field this panel never drew: IF-9's row id is not limited
    // to table T-016, and SK-9 asks for `U-27` -- so the row is looked at first,
    // and the field FR-035 asks for is made where the name stands. One road: a
    // second member for that field would have the shell hold an opinion about
    // where a field is drawn.
    if (row === DOCUMENT_TITLE_ROW) {
      openDocumentTitleField()
      return
    }
    const control = typedControlsByRow.get(row)
    if (control === undefined) return
    if (typeof control.focus === 'function') control.focus()
    // After the focus, so the host's own focus handling does not move the caret
    // afterwards.
    if (typeof control.select === 'function') control.select()
  }

  /**
   * Whether a person has hold of one of this panel's controls.
   *
   * Watched rather than asked for: `focusin` / `focusout` bubble to the panel,
   * so the panel answers for its own controls without asking the host.
   * `focusout` runs before `focusin` when the focus moves between controls, which
   * is harmless: a redraw between the two draws the description true then.
   */
  let isFieldHeld = false
  /**
   * Whether anything told to the person is standing, as this unit last drew it.
   *
   * Needed here because NT-8 of table T-037 has `Enter` / `Esc` put a telling
   * away before any other level, and the next level of both ladders -- the
   * in-place edit -- is spent by this unit's listeners, which run before
   * `DomInputSource`'s (they hang on the panel, it on the window). Without this
   * flag one press would put the telling away and settle or cancel the edit: two
   * levels for one press, which IN-4 forbids.
   *
   * Read off the description (`ScreenView.notices`), never off the drawn nodes.
   * `false` until the first description arrives, the safe direction.
   */
  let isNoticeShowing = false
  /**
   * NT-8: whether the standing telling takes this press before any listener of
   * this unit may.
   *
   * One place for the rule, read by every `Enter` / `Esc` listener of this unit.
   * This unit does not put the telling away; it only declines the press, so the
   * shell, which holds the tellings (LY-5 of table T-060), reaches the same
   * happening with the ladders' first level still unspent.
   *
   * @purity semi-pure-b
   */
  function isPressTakenByStandingNotice(key: unknown): boolean {
    if (!isNoticeShowing) return false
    return key === HOST_ENTER || key === HOST_ESCAPE_KEY
  }
  /**
   * The control the person is typing in, or `null` while none is held -- what
   * `hasUnsettledTextEntry` answers from, and what an `Esc` puts back.
   *
   * Narrower than `isFieldHeld`: that flag guards a redraw and is raised by a
   * checkbox or a chooser too, while this is IF-9's unsettled text entry, and a
   * checkbox holds no characters. Folded together, `Delete` would be swallowed
   * (IN-5a) where it takes nothing back, and SK-3 would be unreachable while a
   * chooser had the focus.
   */
  let heldTextControl: TextEntryControl | null = null
  /**
   * What stood in that control when the person took hold of it -- IN-4's value
   * before the edit began.
   *
   * Read at `focusin`, not at the redraw: a held control is left as it stands
   * (see `showScreenView`), so the description is no record of the starting
   * value.
   */
  let heldTextValueAtFocus = ''
  /**
   * Whether an `Esc` has already taken the held control's characters back, with
   * nothing typed since.
   *
   * This keeps IN-4 at one level per press: the `Esc` spends its level on the
   * edit, so this side keeps answering `true`, and the shell, reading after this
   * listener, stops the ladder there. A control released during that press let
   * the panel go on the same press.
   * It does not outlive the press: `releaseTakenBackText` lets the control go as
   * soon as the press has been reckoned.
   *
   * `Enter` does not use this flag and must not be folded into it: SK-19 has no
   * level below it to protect, so that listener lets go at once.
   */
  let isHeldTextTakenBack = false
  /**
   * Let a cancelled control go, once the press that cancelled it has been
   * reckoned.
   *
   * IF-9 answers "typing?" with one truth value, and its readers pull opposite
   * ways: IN-4's first rung needs `true` for the length of the cancelling press
   * or the ladder spends a second level; IN-5a and WS-2 of table T-067 (taking
   * AG-9 of table T-035) need `false` once the edit is gone, or `Ctrl+Z` is
   * refused with RS-8 for ever after. So the answer moves in time instead of
   * splitting into a second IF-9 member: the caret in the field is the state
   * (IN-6), and the field is given up on the release of the same `Esc`
   * (`HOST_KEY_RELEASE`) -- after the press is reckoned, before any later press.
   *
   * Not a microtask: `Promise.resolve().then` runs between two listeners of the
   * same `keydown` (the host takes a checkpoint as each listener returns), so one
   * `Esc` would cancel the edit and put the `Properties Panel` away.
   * Not `isHeldTextTakenBack` left standing with the field focused either: with
   * the caret still in a field and this answer `false`, typing `p` opens the
   * Command Palette.
   *
   * The flag is re-read, not captured: the `input` listener lowers it the moment
   * characters go in again, so a person who typed in that turn keeps the edit.
   *
   * @purity non-pure
   */
  function releaseTakenBackText(held: TextEntryControl): void {
    if (heldTextControl !== held || !isHeldTextTakenBack) return
    // Guarded: a host that is not a browser need not give its elements a `blur`
    // (table T-075).
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
  // `input`, not `change`, the one place in this unit where that is right: not a
  // commit, but characters going in again after a cancellation, which makes the
  // edit unsettled once more.
  propertiesPanel.addEventListener('input', () => {
    isHeldTextTakenBack = false
  })

  /**
   * IN-4's first level of table T-028, spent where the characters are.
   *
   * Spent here because nowhere else can: `escapeTarget` (PI-36) answers
   * `'textEntry'` for it, and the shell that reads that answer holds no field
   * (LR-6), so the ladder names the level and this side carries it out -- the
   * division `'gesture'` and `'confirmation'` already stand in.
   *
   * IN-4 with FR-031: the value goes back and the abandoned characters are never
   * written. Restoring the value before leaving the control keeps the second
   * half: the host raises `change` on leaving only where the value differs from
   * the focus-time value.
   *
   * The control is not let go in this listener: it runs before the shell's, so a
   * flag cleared here would let the ladder take the `Properties Panel` away on
   * the same press (two levels, against IN-4). It is let go one turn later --
   * see `releaseTakenBackText`.
   *
   * `preventDefault` is not called here: MK-10's answer for the whole happening
   * is `TranslatedInput.isBrowserDefaultStopped`, which the input seam (IF-2)
   * reports and acts on; a second opinion here would put the decision in two
   * places.
   *
   * @purity non-pure
   */
  propertiesPanel.addEventListener('keydown', (event: Event) => {
    const held = heldTextControl
    if (held === null) return
    if ((event as { key?: unknown }).key !== HOST_ESCAPE_KEY) return
    // NT-8: the standing telling has this press first
    // (`isPressTakenByStandingNotice`).
    if (isPressTakenByStandingNotice(HOST_ESCAPE_KEY)) return
    if (isHeldTextTakenBack) {
      // Nothing stands unsettled any more. A second `Esc` reaches this only where
      // the release never came -- a held key repeats its press without release,
      // and a host outside the browser (table T-075) need raise none. In a browser
      // the `keyup` listener has already let go and this returns on
      // `held === null`.
      releaseTakenBackText(held)
      return
    }
    held.value = heldTextValueAtFocus
    isHeldTextTakenBack = true
  })

  /**
   * Where the cancelled control is let go -- see `releaseTakenBackText`.
   *
   * Nothing is assigned to a key release (table T-036 spells presses only, and
   * IF-2 carries no shape for a release), so this listener takes no press from
   * anybody. The focus has not moved by now: the press only put the value back,
   * so the release lands on the same control.
   *
   * @purity non-pure
   */
  propertiesPanel.addEventListener(HOST_KEY_RELEASE, (event: Event) => {
    const held = heldTextControl
    if (held === null || !isHeldTextTakenBack) return
    if ((event as { key?: unknown }).key !== HOST_ESCAPE_KEY) return
    releaseTakenBackText(held)
  })

  /**
   * SK-19 of table T-036, spent where the characters are: `Enter` settles the
   * in-place edit.
   *
   * Settled here because nowhere else can: SK-19 is an assignment, so MK-10 has
   * the input seam call `preventDefault`, which stops the host from raising its
   * own `change` on `Enter` -- without this listener no `Enter` would reach the
   * document (FR-006).
   *
   * It runs before the shell's (panel against window), so one press is enough:
   * the commit stands by the time `spendFieldCommit` reads it.
   *
   * The control is let go: `hasUnsettledTextEntry` answers from the control being
   * held, so a control never let go would make SK-19's second stage (putting the
   * panel away) unreachable, and a second `Enter` would build a second commit of
   * the same text (FR-031 with UN-3; IN-6). Releasing does not also put the panel
   * away on this press: the shell's `settleTextEntry` case returns on
   * `didSettleFieldEntry`, raised by the commit left standing here.
   * The baseline moves before the release: `onFieldChange` drops the host's
   * `change` that repeats the settled value only while `heldTextControl` still
   * names the control. Guarded for a host that lays nothing out (table T-075).
   *
   * A modified `Enter` is left alone, as in `onEntryKeyDown`: `commandFromKey`
   * assigns SK-19 to the plain press only (MK-10).
   *
   * @purity non-pure
   */
  propertiesPanel.addEventListener('keydown', (event: Event) => {
    const held = heldTextControl
    if (held === null) return
    const key = event as Partial<KeyboardEvent>
    if (key.key !== HOST_ENTER || key.isComposing === true) return
    if (key.ctrlKey === true || key.altKey === true) return
    if (key.metaKey === true || key.shiftKey === true) return
    // NT-8: the standing telling has this press first.
    if (isPressTakenByStandingNotice(HOST_ENTER)) return
    const commit = fieldCommitOf(event.target)
    if (commit === null) return
    // A value that did not move is not written (FR-031 with UN-3): the person may
    // settle a field they never changed.
    if (commit.text !== heldTextValueAtFocus) fieldCommit = commit
    // The baseline becomes the value just settled, which the `change` raised by
    // the release below is compared against.
    heldTextValueAtFocus = commit.text
    if (typeof held.blur === 'function') held.blur()
    heldTextControl = null
    heldTextValueAtFocus = ''
    isFieldHeld = false
    isHeldTextTakenBack = false
  })

  /**
   * IN-6 of table T-028, spent where the characters are: a press outside the
   * field settles the edit standing in it and does not take it back.
   *
   * The press has to do it: it carries an assignment, so MK-10 has the input seam
   * call `preventDefault`, which stops the host moving the focus off the field.
   * The field would keep the focus however far away the person pressed.
   *
   * Hung on the host, the one place it can hang: the schedule is outside this
   * unit's tree (IF-1 puts the picture up as its own surface under `body`), so a
   * listener on the root misses exactly the presses on the schedule. No IF-9
   * member is asked at the moment of the press -- `readScreenPartAt` is also
   * asked on a hover, so settling there would end an edit whenever the pointer
   * crossed the screen. Guarded for a host that is not a browser (table T-075).
   * It runs before the shell's (document against window), so the commit stands
   * by the time `spendFieldCommit` reads it.
   *
   * The press itself is not touched (IN-6): nothing here calls `preventDefault`,
   * `stopPropagation` or `stopImmediatePropagation`; what the press does is left
   * to table T-023a and IN-1. A value that did not move is not written (IN-6),
   * the guard `onFieldChange` keeps and `Enter` moves the baseline for.
   *
   * A press on another field of this same panel settles but does not release:
   * that press is assigned too, so the host's own focus move is stopped, and
   * letting go would leave the focus nowhere. No row settles this corner.
   * @provisional PND-352
   *
   * @purity non-pure
   */
  if (typeof host.addEventListener === 'function') {
    host.addEventListener('pointerdown', settleOnPressOutside)
  }

  /**
   * IN-6 of table T-028 reaches U-60's masked field as well: a press outside it
   * ends the typing that stands in it.
   *
   * Unlike the other two fields there is nothing to settle: FR-020 keeps the raw
   * password out of the model, so no column is written and no commit is built;
   * the press only ends AG-9's typing state (table T-035). Without it, WS-2 of
   * table T-067 refuses the write while the caret stays in the field, so pressing
   * `Yes` with a matching password answers RS-8.
   * The characters are left where they are: FR-020 caps no tries, so a mismatch
   * leaves them for the person to correct.
   *
   * @purity non-pure
   */
  function releaseWatermarkUnlockOnPressOutside(event: Event): void {
    const field = watermarkUnlockEntry
    if (field === null || !isWatermarkUnlockHeld) return
    if ((event as { target?: unknown }).target === (field as unknown)) return
    // Guarded, as every other `blur` call is.
    if (typeof field.blur === 'function') field.blur()
    isWatermarkUnlockHeld = false
    isWatermarkUnlockTakenBack = false
  }

  /** @purity non-pure */
  function settleOnPressOutside(event: Event): void {
    releaseWatermarkUnlockOnPressOutside(event)
    // IN-6 reaches U-27's field as well, and this is the one press listener that
    // hears every press outside it -- see that function.
    settleDocumentTitleOnPressOutside(event)
    const held = heldTextControl
    if (held === null) return
    const pressedOn: unknown = (event as { target?: unknown }).target
    // The press is inside the field it would settle: nothing to settle from.
    if (pressedOn === (held as unknown)) return

    const commit = fieldCommitOf(held)
    if (commit !== null && commit.text !== heldTextValueAtFocus) {
      fieldCommit = commit
      // The baseline moves to the settled value, as `Enter` moves it, so the
      // host's `change` on leaving carries nothing new and `onFieldChange` drops
      // it.
      heldTextValueAtFocus = commit.text
    }
    isHeldTextTakenBack = false

    // PND-352: another field of this panel keeps the person's place.
    if (textEntryControlOf(pressedOn) !== null) return

    // Guarded for a host that lays nothing out (table T-075), and the flags are
    // cleared here rather than left to a `focusout` such a host may never raise.
    if (typeof held.blur === 'function') held.blur()
    heldTextControl = null
    heldTextValueAtFocus = ''
    isFieldHeld = false
  }

  // ------------------------------------------- U-27, edited where it stands ---

  /**
   * FR-035: the field SK-9 opens over the `Document Title`, while it stands --
   * `null` at every other moment.
   *
   * Made on the ask and not drawn with the header: FR-035's field exists from
   * the moment the name is chosen, and a field drawn every frame would stand in
   * the header for ever at the host's own height, which FR-051 measures.
   * Held as `TextEntryControl` for a host that lays nothing out (table T-075).
   */
  let documentTitleEntry: TextEntryControl | null = null
  /**
   * The `Document Title` box the last redraw of the header left standing, which
   * is where that field is opened -- `null` until the first one.
   */
  let documentTitleBox: HTMLElement | null = null
  /**
   * The name that box was last drawn with -- what the field opens on and what
   * the box gets back when the field comes down.
   *
   * Not read back off the box: while the field stands the box holds no text.
   * An absent name draws as the empty string, as `fillAppHeader` writes `null`;
   * the document tells the two apart (FR-035), a box need not.
   */
  let documentTitleShown = ''
  /**
   * What stood in that field when it was opened -- IN-4's value before the edit
   * began.
   */
  let documentTitleValueAtFocus = ''
  /**
   * Whether an `Esc` has already taken the characters back with nothing typed
   * since -- the flag and one-turn release `isHeldTextTakenBack` keeps for the
   * panel's own control.
   */
  let isDocumentTitleTakenBack = false

  /**
   * IF-9's row id for that field: `U-27` of table T-103.
   *
   * Not a row of table T-016: the name is not an item of the `Properties Panel`
   * (FR-074), and IF-9 lets a field name a row of another table.
   */
  const DOCUMENT_TITLE_ROW = 'U-27'
  /**
   * What that field edits: `Project.title` (AT-3 of table T-058), the column
   * CM-1 of table T-108 writes. No id: a document holds exactly one `Project`.
   */
  const DOCUMENT_TITLE_KEY: PropertyFieldKey = { holder: 'project', column: 'title' }

  /**
   * FR-035, carried out: the name the header drew becomes a field, the person is
   * put in it, and everything already in it is selected.
   *
   * Asked for through `focusPropertyField`, the one road for every field: IF-9's
   * row id is not limited to table T-016, so the shell asks the same way for
   * this field, and it is this side that knows the ask means making a field.
   *
   * Nothing happens before the first frame (no box exists yet), the silence
   * `focusPropertyField` keeps for a row the panel never drew. A second ask while
   * the field stands does nothing: a field over a field would lose the
   * characters already typed.
   *
   * @purity non-pure
   */
  function openDocumentTitleField(): void {
    const box = documentTitleBox
    if (box === null || documentTitleEntry !== null) return
    const drawn = made(host, 'input', STYLE.documentTitleEntry)
    drawn.setAttribute('type', 'text')
    // For the reader of the built page and for a check, as `controlElement`
    // writes it; the commit travels by `CONTROL_KEYS`.
    drawn.setAttribute('data-field-row', DOCUMENT_TITLE_ROW)
    const entry = drawn as unknown as TextEntryControl
    entry.value = documentTitleShown
    // So `fieldCommitOf` needs no second reading for this field.
    CONTROL_KEYS.set(drawn, { row: DOCUMENT_TITLE_ROW, key: DOCUMENT_TITLE_KEY })
    // A person puts characters into it, which is what IN-5a and IN-4's rung are
    // about.
    TYPED_CONTROLS.add(drawn)
    // Inside the part, not in place of it: IF-9's fourth answer is which part a
    // point is on, so replacing the box would leave a point on the name answering
    // as nothing, and EP-1 of table T-076 says the name does not move.
    box.replaceChildren(drawn)
    documentTitleEntry = entry
    documentTitleValueAtFocus = documentTitleShown
    isDocumentTitleTakenBack = false
    // Listeners before the focus and after the state: the host may raise a
    // happening on the focus placed below, and `watchDocumentTitleField` reads the
    // state to tell its own field from one since taken down.
    watchDocumentTitleField(drawn, entry)
    // Select after focus, so the host's own focus handling does not move the
    // caret afterwards. Both guarded, as in `focusPropertyField`.
    if (typeof entry.focus === 'function') entry.focus()
    if (typeof entry.select === 'function') entry.select()
  }

  /**
   * The field comes down and the name stands where it stood.
   *
   * The field is let go before the box is rewritten, so a `focusout` the host
   * raises on a field taken off the page finds nothing to settle; the caller has
   * already settled whatever was owed.
   * What goes back is the description's name, never what was typed: a settled
   * value reaches the document through CM-1 and comes back on the next
   * description; a refused or taken-back one never became the name.
   *
   * @purity non-pure
   */
  function closeDocumentTitleField(): void {
    if (documentTitleEntry === null) return
    documentTitleEntry = null
    documentTitleValueAtFocus = ''
    isDocumentTitleTakenBack = false
    if (documentTitleBox !== null) documentTitleBox.textContent = documentTitleShown
  }

  /**
   * The one settling for all three triggers -- SK-19's `Enter`, IN-6's press
   * outside, and the host's own `change` on leaving the field -- because IN-6
   * makes them one act, as the panel's triggers share `fieldCommitOf`.
   *
   * An empty name is not settled, and the value goes back (FR-035). This is not a
   * second reading of CM-1's refusal (FR-076): this field sends no empty name, so
   * a person who empties the box gets the name they had rather than a telling
   * about a value they did not mean to write. Nor is it made `null`: clearing the
   * name is not what FR-035 asks this field for.
   *
   * A value that did not move is not written (IN-6 of table T-028), so no
   * command, bundle or telling is built.
   *
   * @purity non-pure
   */
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
    // The baseline becomes the value just settled, which the host's own `change`
    // on the way out is compared against -- the move `Enter` makes on the panel's
    // control.
    documentTitleValueAtFocus = commit.text
  }

  /**
   * IN-6 of table T-028 for this field: a press outside it settles what stands in
   * it and does not take it back.
   *
   * Hung on the host with the panel's own (`settleOnPressOutside`): the schedule
   * is outside this unit's tree (IF-1). The press itself is not touched (IN-6).
   *
   * @purity non-pure
   */
  function settleDocumentTitleOnPressOutside(event: Event): void {
    const held = documentTitleEntry
    if (held === null) return
    // The press is inside the field it would settle: nothing to settle from.
    if ((event as { target?: unknown }).target === (held as unknown)) return
    settleDocumentTitle()
    // Guarded, as every other `blur` call is.
    if (typeof held.blur === 'function') held.blur()
    closeDocumentTitleField()
  }

  /**
   * The two keys and the three happenings this field answers, hung on the field
   * itself and thrown away with it.
   *
   * On the field and not on the header around it, the rule `watchWatermarkUnlock`
   * states: FT-1 of table T-078 forbids widening IF-2's supply, so a listener
   * outside the parts it serves would be a second source of input, and nothing
   * is registered while the name is only a name. Hung on the `App Header`, they
   * fail `tests/unit/uf-71.test.ts`.
   *
   * Each is the panel's own rule for the same rows (SK-19, IN-4, IN-5a, NT-8);
   * no new rule is written for this field.
   * They run before the shell's (node against window), so the commit stands by
   * the time `spendFieldCommit` reads it. Nothing here reports to the shell or
   * raises a frame: they move `hasUnsettledTextEntry`'s answer, and what they
   * settle leaves by `readFieldCommit`.
   *
   * @purity non-pure
   */
  function watchDocumentTitleField(field: HTMLElement, entry: TextEntryControl): void {
    /**
     * Whether the field this listener was hung on is still the one standing: a
     * field taken off the page may still be handed a `focusout` or a key release,
     * and the state belongs to whatever field stands now, which may be none.
     */
    const isStanding = (): boolean => documentTitleEntry === entry

    // The host's own `change` settles a field left by neither a press nor a key
    // (a `Tab` away, the window going). It is raised before `focusout`, the order
    // `onFieldChange` rests on.
    field.addEventListener('change', () => {
      if (!isStanding()) return
      settleDocumentTitle()
    })
    // `input`, not `change`: characters going in again after a cancellation make
    // the edit unsettled once more.
    field.addEventListener('input', () => {
      if (!isStanding()) return
      isDocumentTitleTakenBack = false
    })
    field.addEventListener('focusout', () => {
      if (!isStanding()) return
      // The field may not outlive the focus: `hasUnsettledTextEntry` answers from
      // it standing, so with the caret gone IN-5a would swallow every
      // single-character key and WS-2 of table T-067 would refuse every write.
      closeDocumentTitleField()
    })
    // IN-4's rung for the unsettled in-place edit.
    field.addEventListener('keydown', (event: Event) => {
      if (!isStanding()) return
      if ((event as { key?: unknown }).key !== HOST_ESCAPE_KEY) return
      // NT-8: a standing telling has this press first.
      if (isPressTakenByStandingNotice(HOST_ESCAPE_KEY)) return
      if (isDocumentTitleTakenBack) {
        // Nothing stands unsettled any more. A second `Esc` gets here only where
        // the release never came -- a held key repeats its press.
        closeDocumentTitleField()
        return
      }
      // IN-4 with FR-031: the value goes back before the field is let go, so the
      // host's `change` on the way out finds no difference and raises nothing.
      // The field is not taken down on this press: this listener runs before the
      // shell's, and letting go here would have the ladder take a second level
      // on the one press (IN-4).
      entry.value = documentTitleValueAtFocus
      isDocumentTitleTakenBack = true
    })
    // Where the cancelled field is let go, one turn later -- see
    // `releaseTakenBackText`.
    field.addEventListener(HOST_KEY_RELEASE, (event: Event) => {
      if (!isStanding() || !isDocumentTitleTakenBack) return
      if ((event as { key?: unknown }).key !== HOST_ESCAPE_KEY) return
      closeDocumentTitleField()
    })
    // SK-19 of table T-036. A modified `Enter` is left alone: `commandFromKey`
    // assigns SK-19 to the plain press only.
    field.addEventListener('keydown', (event: Event) => {
      if (!isStanding()) return
      const key = event as Partial<KeyboardEvent>
      if (key.key !== HOST_ENTER || key.isComposing === true) return
      if (key.ctrlKey === true || key.altKey === true) return
      if (key.metaKey === true || key.shiftKey === true) return
      // NT-8: the standing telling has this press first.
      if (isPressTakenByStandingNotice(HOST_ENTER)) return
      settleDocumentTitle()
      // Let go so SK-19's second stage is reachable: a field never let go would
      // answer unsettled for ever, and a second `Enter` would find the same state.
      closeDocumentTitleField()
    })
  }

  /**
   * FR-020: what stands in U-60's masked field now, or the empty string while
   * that surface is not up.
   *
   * Read when asked and never remembered: FR-020 keeps the raw password out of
   * code, model and output, so the characters live only in the control and this
   * hands them once to the one caller that hashes them.
   * Asking does not take them, unlike `readFieldCommit`: FR-020 caps no tries,
   * so a mismatch leaves what was typed where the person can correct it.
   *
   * @purity semi-pure-b
   */
  function readWatermarkUnlockAnswer(): string {
    return watermarkUnlockEntry === null ? '' : watermarkUnlockEntry.value
  }

  /**
   * Whether the person has hold of U-60's masked field (FR-020).
   *
   * It counts as unsettled text entry because IN-5a of table T-028 makes
   * single-character keys inert while text is typed, and table T-036 assigns many
   * single letters; left out, typing the password would open the palette and fit
   * the schedule on the way.
   * The value is never spelled here (FR-020): `S-100` of table T-207 states it,
   * and only its SHA-256 (`S-101`) reaches `src/`, brought by a generator.
   * It writes nothing: IN-4's rung is spent on the characters, and the rung under
   * it (the open surface, which FR-020 names) is reached on the next press, as
   * with the panel's field.
   * It is the focus and not the contents: a flag raised once a character landed
   * would leave the first keystroke to table T-036, since a `keydown` is
   * answered before the host puts the character in.
   */
  let isWatermarkUnlockHeld = false
  /**
   * Whether the characters in that field have been taken back by an `Esc` and
   * nothing has been typed since -- the flag `isHeldTextTakenBack` keeps for the
   * panel's own control.
   */
  let isWatermarkUnlockTakenBack = false
  /**
   * Everything U-60 `Watermark Unlock` has to be listened to for, hung on the
   * surface this unit just drew (FR-020).
   *
   * On the surface and not on the layer that holds it: FT-1 of table T-078
   * forbids widening IF-2's supply, so a listener outside the parts it serves
   * would be a second source of input, and the layer is a bare box table T-103
   * names nothing for. Nothing is registered while U-60 is closed.
   * Re-hung on every redraw of the surface without leaking: the element before
   * is thrown away with its listeners.
   *
   * Nothing here reports to the shell or raises a frame: they move
   * `hasUnsettledTextEntry`'s answer and the field's own contents.
   *
   * @purity non-pure
   */
  function watchWatermarkUnlock(surface: HTMLElement): void {
    // The field is focused by this unit, not by the browser: `pointerAssignment`
    // claims every press on this surface, so `DomInputSource` calls
    // `preventDefault` on the `pointerdown` (MK-10 of table T-023), and a
    // prevented `pointerdown` gives no focus.
    // So the side that drew the field puts the person in it, as
    // `focusPropertyField` does. This runs before `DomInputSource`'s (node against
    // window), so the press is still reported and still stopped. Nothing else is
    // done with it: MK-10's answer is `TranslatedInput.isBrowserDefaultStopped`.
    surface.addEventListener('pointerdown', (event: Event) => {
      const field = watermarkUnlockEntry
      if (field === null) return
      if ((event as { target?: unknown }).target !== (field as unknown)) return
      // Guarded for a host that lays nothing out (table T-075).
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
    // `input`, not `change`: characters going in again after a cancellation make
    // the entry unsettled once more.
    surface.addEventListener('input', () => {
      isWatermarkUnlockTakenBack = false
    })
    // IN-4's rung, spent where the characters are. The value before the edit is
    // always the empty string for this field: FR-020 carries nothing in.
    // The control is not let go on this press: this listener runs before the
    // shell's, so the ladder would take the surface away on the same press (two
    // levels, against IN-4). Nor is it kept held past the press, or
    // `hasUnsettledTextEntry` would stay true after the cancel:
    // `releaseTakenBackWatermarkUnlock` lets go on the key release, not in a
    // microtask (see `releaseTakenBackText`).
    surface.addEventListener('keydown', (event: Event) => {
      const held = watermarkUnlockEntry
      if (held === null || !isWatermarkUnlockHeld) return
      if ((event as { key?: unknown }).key !== HOST_ESCAPE_KEY) return
      // NT-8: a standing telling has this press first.
      if (isPressTakenByStandingNotice(HOST_ESCAPE_KEY)) return
      if (isWatermarkUnlockTakenBack) {
        // A second `Esc` reaches this only where the release never came -- a held
        // key repeats its press, and a host outside the browser (table T-075) need
        // raise no release. In a browser the `keyup` below has already let go and
        // this returns above, on `!isWatermarkUnlockHeld`.
        releaseTakenBackWatermarkUnlock(held)
        return
      }
      held.value = ''
      isWatermarkUnlockTakenBack = true
    })

    /**
     * Where the cancelled watermark unlock field is let go, on the release of the
     * same `Esc` -- as `releaseTakenBackText` does for the panel's control.
     *
     * @purity non-pure
     */
    surface.addEventListener(HOST_KEY_RELEASE, (event: Event) => {
      const held = watermarkUnlockEntry
      if (held === null || !isWatermarkUnlockTakenBack) return
      if ((event as { key?: unknown }).key !== HOST_ESCAPE_KEY) return
      releaseTakenBackWatermarkUnlock(held)
    })
  }

  /**
   * Let a cancelled watermark unlock field go once the cancelling press has been
   * reckoned, shaped after `releaseTakenBackText`: it must answer typing for the
   * length of that press (IN-4) and stop the moment the edit is gone (WS-2 of
   * table T-067), so the release moves in time instead of adding a second flag.
   *
   * @purity non-pure
   */
  function releaseTakenBackWatermarkUnlock(held: TextEntryControl): void {
    if (watermarkUnlockEntry !== held || !isWatermarkUnlockTakenBack) return
    // Guarded: a host that lays nothing out need not give its elements a `blur`.
    if (typeof held.blur === 'function') held.blur()
    isWatermarkUnlockHeld = false
    isWatermarkUnlockTakenBack = false
  }

  /**
   * IF-9's fifth answer -- whether characters stand unsettled in a field of this
   * surface: the panel's held control, U-60's masked field, or U-27's field.
   *
   * One truth value and not which field (under table T-065). Held rather than
   * measured: `focusin` / `focusout` bubble to the panel, so `activeElement` is
   * never asked of the host.
   * Each field counts because IN-5a makes single-character keys inert while text
   * is typed, and what is typed into any of them can be keys table T-036
   * assigns; the same answer serves WS-2 of table T-067 and IN-4's first level.
   *
   * The `Dialogue Field`'s entry is deliberately outside it: AG-9 of table T-035
   * and IN-5a name what is typed in place, and no row settles what an utterance
   * in flight should do to IN-5a or WS-2.
   *
   * @purity semi-pure-b
   */
  function hasUnsettledTextEntry(): boolean {
    return heldTextControl !== null || isWatermarkUnlockHeld || documentTitleEntry !== null
  }

  /**
   * The value settled in a property field since this was last asked -- the
   * third member of IF-9, and the one that carries a value back.
   *
   * Reading it takes it, as the declaration states: a commit answered twice would
   * be written twice (FR-031 with UN-3).
   *
   * @purity semi-pure-b
   */
  function readFieldCommit(): FieldCommit | null {
    const held = fieldCommit
    fieldCommit = null
    return held
  }

  /**
   * What this surface has drawn at (x, y) -- the fourth member of IF-9.
   *
   * The browser answers what is on top, which is why this is asked of the
   * surface: the parts overlap, several are placed by `em` and percentages, and
   * `pointer-events` decides which takes a press. Nothing outside this unit can
   * reproduce that (under table T-065).
   *
   * `null` for a point this unit did not draw on, including one outside the
   * window and one over the schedule, which tells the caller that table T-023a's
   * decision order applies.
   *
   * `elementFromPoint` may be absent (no DOM under Node; R7.3 hands the host
   * in); absent answers `null`, the same as nothing of this unit's being there.
   *
   * The format is read back but is not an entry: FR-096 forbids a second
   * entrance per format, so a choice on U-54 carries a row of table T-024, not
   * of table T-109. The two never stand on one element.
   *
   * Row, person and boundary are read on the same walk (R7.4): a second query
   * could ask a screen that had moved. Neither row nor person is an entry: the
   * `Row Title Panel` row and the roster line carry the key, and the entrances
   * inside them (IC-58 .. IC-60, IC-67 / IC-68) carry the row of table T-109.
   * Every `Panel Divider` is one part under table T-103, so the walk also reads
   * which panel -- FR-052 resizes that panel.
   *
   * @purity semi-pure-b
   */
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
    // U-62 `Import Report`'s entrance (NT-8 of table T-037). A truth value: the
    // button carries no payload of its own.
    let onImportReportDismiss = false
    // GR-20 of table T-023d. A truth value: the strip carries no `data-group-id`
    // of its own, because the row it sits in does and the walk takes the
    // innermost one.
    let onGrabStrip = false
    // GR-21 of table T-023d. The axis, not a truth value: the two lanes move
    // different halves of the display position.
    let axis: string | null = null
    // The innermost of each key attribute and the outermost `data-role`: an entry
    // sits inside its part, and table T-109's surface column names the containing
    // surface rather than the grouping inside it (U-34 / U-35), so the role keeps
    // being replaced on the way up.
    // Innermost for the keys because a row of the `Row Title Panel` and a roster
    // line are drawn inside their containers, so the nearest carrier on the way
    // up is the one the point is on.
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
      // NT-8 of table T-037: which telling this entrance puts away. Read back here
      // and not as an entry: that row has no row of table T-109, because its
      // entrance is a word.
      const told = node.getAttribute(NOTICE_DISMISS_KEY_ATTRIBUTE)
      if (told !== null && dismissKey === null) dismissKey = told
      // NT-7 of table T-037: which of the two answers this button gives. Not an
      // entry: NT-7 refuses these two a row of table T-109, so an `IconId` would
      // name a row that does not exist.
      const given = node.getAttribute(CONFIRMATION_ANSWER_ATTRIBUTE)
      if (given !== null && answer === null) answer = given
      // GR-20 of table T-023d: the grab strip HF-15's drag is taken on.
      if (node.getAttribute(ROW_GRAB_STRIP_MARK) !== null) onGrabStrip = true
      // GR-21 of table T-023d: which lane, taken from the lane the grip sits
      // inside, so one attribute answers for both; `input-command-translator.ts`
      // carries what table T-023d leaves open about the difference.
      const lane = node.getAttribute(SCROLLBAR_AXIS_ATTRIBUTE)
      if (lane !== null && axis === null) axis = lane
      // U-62 `Import Report`'s entrance (NT-8 of table T-037).
      if (node.getAttribute(IMPORT_REPORT_DISMISS_ATTRIBUTE) !== null) {
        onImportReportDismiss = true
      }
      const role = node.getAttribute('data-role')
      if (role !== null) part = role
      node = node.parentElement
    }
    // The walk ran off the top instead of reaching the root, so the point is on
    // something this unit did not draw -- the schedule, or the page around it.
    if (node !== root || part === null) return null
    // U-23: an entrance is named by the panel, not by the tree inside it; table
    // T-109 puts IC-58 .. IC-60 on the panel too.
    // `Resource.uid` (AT-85) is a number and an attribute is text; converted here
    // because the side that wrote it (`String(resource.uid)` in `modalElement`)
    // knows what it wrote. `fillScreenFrame` writes only `PanelDivider.panel` onto
    // `data-panel`, so its spellings are not written out here: a value typed into
    // this file stops following its declaration.
    return {
      part: part === ROLE.rowTitleTree ? ROLE.rowTitlePanel : part,
      entry,
      format,
      rowGroupId: group,
      resourceUid: uid === null ? null : Number(uid),
      dividerPanel: panel === null ? null : (panel as ScreenPart['dividerPanel']),
      // GR-20. Never true on a pinned row: `rowTitleElement` draws no strip there.
      // The key is present only on a strip; the declaration fixes absent as
      // `false`, so a reader comparing whole answers sees no change for any other
      // point, and absence is not a third state.
      ...(onGrabStrip ? { isRowGrabStrip: true } : {}),
      // GR-21, carried the way GR-20 is. The spellings are `Scrollbar['axis']` and
      // not written out here, for the reason `data-panel`'s are not.
      ...(axis === null ? {} : { scrollbarAxis: axis as NonNullable<ScreenPart['scrollbarAxis']> }),
      noticeDismissKey: dismissKey,
      // NT-7, carried the way GR-20 is.
      ...(answer === null ? {} : { confirmationAnswer: answer }),
      // U-62's entrance, carried the way `isRowGrabStrip` is.
      ...(onImportReportDismiss ? { isImportReportDismiss: true } : {}),
    }
  }

  // BO-1: settled before the first frame, and before this factory returns.
  reportHeaderHeight()

  // MK-13's second half, handed over now. The caller may not use it yet: the
  // panel holds no control until the first `showScreenView`.
  wiring.holdFocusPropertyField?.(focusPropertyField)

  // FR-020's field reader, handed over the same way and with the same caution:
  // U-60 holds no field until a `showScreenView` puts that surface up.
  wiring.holdReadWatermarkUnlockAnswer?.(readWatermarkUnlockAnswer)

  return {
    showScreenView,
    readDialogueInput,
    readFieldCommit,
    readScreenPartAt,
    hasUnsettledTextEntry,
    // `focusPropertyField` is not here: the IF-9 cell of table T-065 names
    // exactly these supplies, so what MK-13 needs travels on the wiring
    // (`holdFocusPropertyField`).
  }
}

// <generated -- do not edit by hand>
// Single source of truth:
//   docs/spec/_source/settings.json (tables T-206 and T-236)
// Rebuild: npm run gen   ||   npm run gen:check fails on drift.
/**
 * The values table T-206 states that this unit needs, by row ID.
 *
 * ⭐ Table T-206 holds what the document does NOT store, so these
 * are not document settings and are not in SETTINGS_DEFAULTS. They
 * are reached by row ID because most rows of that table have no key
 * column -- the row ID is the specification's own name for them.
 *
 * ⚠️ This unit reads the row where it stands. ⛔ Neither row is a
 * document setting and neither may become one: table T-206 is where
 * the specification records that the document does not keep them,
 * and the export draws no entrance at all (EP-1 and EP-4 of table
 * T-076), so a reader handed this document sees the same picture
 * whatever this value is.
 */
export const NOT_STORED_ICON_SIZES: {
  /** S-138, in px */
  readonly 'S-138': number
  /** S-141, in px */
  readonly 'S-141': number
} = {
  'S-138': 16,
  'S-141': 4,
}

/**
 * The values table T-206 states that this unit needs, by row ID.
 *
 * ⭐ Table T-206 holds what the document does NOT store, so these
 * are not document settings and are not in SETTINGS_DEFAULTS. They
 * are reached by row ID because most rows of that table have no key
 * column -- the row ID is the specification's own name for them.
 *
 * ⚠️ This unit reads the row where it stands. ⛔ Neither row is a
 * document setting and neither may become one: table T-206 is where
 * the specification records that the document does not keep them,
 * and the export draws no entrance at all (EP-1 and EP-4 of table
 * T-076), so a reader handed this document sees the same picture
 * whatever this value is.
 */
export const NOT_STORED_ROW_GRAB_STRIP_SIZES: {
  /** S-218, in px */
  readonly 'S-218': number
} = {
  'S-218': 4,
}

/**
 * The values table T-206 states that this unit needs, by row ID.
 *
 * ⭐ Table T-206 holds what the document does NOT store, so these
 * are not document settings and are not in SETTINGS_DEFAULTS. They
 * are reached by row ID because most rows of that table have no key
 * column -- the row ID is the specification's own name for them.
 *
 * ⚠️ This unit reads the row where it stands. ⛔ Neither row is a
 * document setting and neither may become one: table T-206 is where
 * the specification records that the document does not keep them,
 * and the export draws no entrance at all (EP-1 and EP-4 of table
 * T-076), so a reader handed this document sees the same picture
 * whatever this value is.
 */
export const NOT_STORED_ROW_BAND_SIZES: {
  /** S-213, in px */
  readonly 'S-213': number
} = {
  'S-213': 3,
}

/**
 * The values table T-206 states that this unit needs, by row ID.
 *
 * ⭐ Table T-206 holds what the document does NOT store, so these
 * are not document settings and are not in SETTINGS_DEFAULTS. They
 * are reached by row ID because most rows of that table have no key
 * column -- the row ID is the specification's own name for them.
 *
 * ⚠️ This unit reads the row where it stands. ⛔ Neither row is a
 * document setting and neither may become one: table T-206 is where
 * the specification records that the document does not keep them,
 * and the export draws no entrance at all (EP-1 and EP-4 of table
 * T-076), so a reader handed this document sees the same picture
 * whatever this value is.
 */
export const NOT_STORED_STATE_GROUND_PERCENTS: {
  /** S-214, in % */
  readonly 'S-214': number
  /** S-215, in % */
  readonly 'S-215': number
} = {
  'S-214': 9,
  'S-215': 12,
}

/**
 * The values table T-206 states that this unit needs, by row ID.
 *
 * ⭐ Table T-206 holds what the document does NOT store, so these
 * are not document settings and are not in SETTINGS_DEFAULTS. They
 * are reached by row ID because most rows of that table have no key
 * column -- the row ID is the specification's own name for them.
 *
 * ⚠️ This unit reads the row where it stands. ⛔ Neither row is a
 * document setting and neither may become one: table T-206 is where
 * the specification records that the document does not keep them,
 * and the export draws no entrance at all (EP-1 and EP-4 of table
 * T-076), so a reader handed this document sees the same picture
 * whatever this value is.
 */
export const NOT_STORED_HELP_SIZES: {
  /** S-201 */
  readonly 'S-201': number
  /** S-202 */
  readonly 'S-202': number
  /** S-203 */
  readonly 'S-203': number
  /** S-204 */
  readonly 'S-204': number
} = {
  'S-201': 0.95,
  'S-202': 3,
  'S-203': 0.80,
  'S-204': 0.875,
}

/**
 * The values table T-206 states that this unit needs, by row ID.
 *
 * ⭐ Table T-206 holds what the document does NOT store, so these
 * are not document settings and are not in SETTINGS_DEFAULTS. They
 * are reached by row ID because most rows of that table have no key
 * column -- the row ID is the specification's own name for them.
 *
 * ⚠️ This unit reads the row where it stands. ⛔ It is not a document
 * setting and may not become one: table T-206 is where the
 * specification records that the document does not keep it. ⚠️ The
 * closing sentence of the entrance rows does NOT fit -- EP-1 and EP-4
 * of table T-076 keep an ENTRANCE out of an exported picture, and this
 * row is no entrance: table T-206 says of it that the boundary is a
 * line rather than a word and not a shape either, so it has no row of
 * table T-109 and no shape of figure F-019. ⭐ What keeps it out of an
 * export is EP-11, which draws no `Command Palette` at all.
 */
export const NOT_STORED_PALETTE_GROUP_RULE_SIZES: {
  /** S-143, in px */
  readonly 'S-143': readonly [number, number]
} = {
  'S-143': [1, 6],
}

/**
 * The values table T-206 states that this unit needs, by row ID.
 *
 * ⭐ Table T-206 holds what the document does NOT store, so these
 * are not document settings and are not in SETTINGS_DEFAULTS. They
 * are reached by row ID because most rows of that table have no key
 * column -- the row ID is the specification's own name for them.
 *
 * ⚠️ This unit reads the row where it stands. ⛔ Neither row is a
 * document setting and neither may become one: table T-206 is where
 * the specification records that the document does not keep them,
 * and the export draws no entrance at all (EP-1 and EP-4 of table
 * T-076), so a reader handed this document sees the same picture
 * whatever this value is.
 */
export const NOT_STORED_PROPERTY_FIELD_SIZES: {
  /** S-186, in px */
  readonly 'S-186': number
  /** S-187, in px */
  readonly 'S-187': number
  /** S-188, in px */
  readonly 'S-188': readonly [number, number]
  /** S-189, in % */
  readonly 'S-189': number
  /** S-190, in px */
  readonly 'S-190': number
  /** S-191, in px */
  readonly 'S-191': number
  /** S-192, in px */
  readonly 'S-192': readonly [number, number]
  /** S-193 */
  readonly 'S-193': number
  /** S-197 */
  readonly 'S-197': number
  /** S-198 */
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

/**
 * The values table T-206 states that this unit needs, by row ID.
 *
 * ⭐ Table T-206 holds what the document does NOT store, so these
 * are not document settings and are not in SETTINGS_DEFAULTS. They
 * are reached by row ID because most rows of that table have no key
 * column -- the row ID is the specification's own name for them.
 *
 * ⚠️ This unit reads the row where it stands: `AppHeaderItems`
 * carries the title as a string and no rectangle -- unlike
 * `RowTitle`, which carries its `box` -- so there is no door to pass
 * it through. ⛔ It is not a document setting and may not become one:
 * table T-206 is where the specification records that the document
 * does not keep it. ⭐ AND THE SCREEN READS THE SAME ROW -- EP-1 of
 * table T-076 (MUST) has the size and the inset come from one row on
 * both sides and (MUST NOT) lets an export hold a value of its own,
 * so what makes this the reader's own is not that the title is
 * hidden but that the document keeps its TEXT (`Project.title`,
 * U-27) and neither of the two numbers it is written with.
 */
export const NOT_STORED_DOCUMENT_TITLE_SIZES: {
  /** S-225, in px */
  readonly 'S-225': number
  /** S-226, in px */
  readonly 'S-226': number
} = {
  'S-225': 16,
  'S-226': 12,
}

/**
 * The colours of table T-236, by row ID, in both renderings.
 *
 * ⭐ Table T-236 holds constants baked into the artifact. FR-041 (MUST
 * NOT) forbids saving a derived colour, so none of these is a document
 * setting and none may become one.
 *
 * ⛔ `H` IN A HUE IS NOT A TYPO. Where `followsHue` is true the row
 * follows themeHue (S-73), and the manuscript writes the letter so that
 * S-73's value is stated once rather than copied into every row. Solve it
 * by putting the hue in before use. A row with `followsHue` false states
 * its own hue and is used exactly as written -- the dependency and
 * progress lines are the two of those (FR-041).
 */
export const SCREEN_COLOURS: {
  readonly [rowId: string]: {
    readonly light: string
    readonly dark: string
    readonly followsHue: boolean
  }
} = {
  /* S-146 */
  'S-146': { light: '#ffffff', dark: 'hsl(H 12% 9%)', followsHue: true },
  /* S-147 */
  'S-147': { light: '#16181d', dark: '#e8eaee', followsHue: false },
  /* S-148 */
  'S-148': { light: '#5b6068', dark: '#9aa1ab', followsHue: false },
  /* S-149 */
  'S-149': { light: 'hsl(H 14% 87%)', dark: 'hsl(H 12% 23%)', followsHue: true },
  /* S-150 */
  'S-150': { light: 'hsl(H 20% 97%)', dark: 'hsl(H 14% 13%)', followsHue: true },
  /* S-151 */
  'S-151': { light: 'hsl(H 59% 32%)', dark: 'hsl(H 62% 68%)', followsHue: true },
  /* S-152 */
  'S-152': { light: '#1f7a3d', dark: '#6fc98d', followsHue: false },
  /* S-183 */
  'S-183': { light: '#1f7a3d', dark: '#6fc98d', followsHue: false },
  /* S-153 */
  'S-153': { light: '#a8600f', dark: '#e0a353', followsHue: false },
  /* S-154 */
  'S-154': { light: '#a02b2b', dark: '#e07a7a', followsHue: false },
  /* S-170 */
  'S-170': { light: 'rgba(0,0,0,0.28)', dark: 'rgba(0,0,0,0.6)', followsHue: false },
}
// </generated>
