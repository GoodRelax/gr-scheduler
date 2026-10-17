// DomScreenSurface -- the Properties Panel fields, one control per input kind of table T-016.
// @unit      UF-106  (docs/spec/05-07-design.md, table T-075)
// @component DomScreenSurface, layer Framework (table T-062)
// @purity    non-pure

import type {
  PropertiesPanel,
  PropertyControl,
  PropertyControlKind,
  PropertyField,
  ScreenPart,
} from '../../adapter/screen-renderer/screen-renderer'
import { ASSIGNEE_LIST_SEPARATOR } from '../../adapter/screen-renderer/screen-renderer'
import {
  HOST_ENTER,
  NOT_STORED_PROPERTY_FIELD_SIZES,
  NOT_STORED_WHEEL_UNITS,
  PAINT,
  SCREEN_COLORS,
  STYLE,
  anchoredEntry,
  commandEntry,
  made,
} from './dom-screen-surface'
import type { TextEntryControl } from './field-editing'
import { CONTROL_KEYS, CONTROL_PICKS, SETTLED_AS_ONE_ATTRIBUTE, TYPED_CONTROLS, TYPED_ROWS } from './field-editing'

// see FR-006
/** @purity pure */
function fieldSizes(): {
  readonly controlMinHeight: number
  readonly colorMinHeight: number
  readonly namePercent: number
  readonly nameGap: number
  readonly taskGroupGap: number
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
    taskGroupGap: NOT_STORED_PROPERTY_FIELD_SIZES['S-191'],
    panelPadY,
    panelPadX,
    multilineRows: NOT_STORED_PROPERTY_FIELD_SIZES['S-193'],
    textScale: NOT_STORED_PROPERTY_FIELD_SIZES['S-197'],
    nameTextScale: NOT_STORED_PROPERTY_FIELD_SIZES['S-198'],
  }
}

/** @purity pure */
export function propertiesPanelStyle(): string {
  const size = fieldSizes()
  return (
    `${STYLE.propertiesPanel}padding:${size.panelPadY}px ${size.panelPadX}px;` +
    `font-size:${size.textScale}em;`
  )
}

// see FR-072, IC-52
// WHY: a line of its own at the head of the panel, its entrance at the right end (JDG-2097, JDG-2103).
/** @purity pure */
function propertyWayOutStyle(): string {
  const size = fieldSizes()
  return (
    'display:flex;align-items:flex-start;justify-content:flex-end;' +
    `gap:${size.nameGap}px;margin-bottom:${size.taskGroupGap}px;`
  )
}

const FIELD_LINE_HEIGHT = 1.6

/** @purity pure */
function propertyFieldStyle(): string {
  const size = fieldSizes()
  return (
    `display:flex;align-items:flex-start;gap:${size.nameGap}px;` +
    `margin-bottom:${size.taskGroupGap}px;line-height:${FIELD_LINE_HEIGHT};`
  )
}

// see FR-006, FR-038
// WHY: balance picks the break that keeps the longer line shortest; keep-all leaves only the marks (wbr) to break at.
/** @purity pure */
function propertyFieldNameStyle(isSegmented = false): string {
  const size = fieldSizes()
  return (
    `color:${PAINT.quiet};flex:0 0 ${size.namePercent}%;` +
    `text-align:right;font-size:${size.nameTextScale}em;` +
    `text-wrap:balance;overflow-wrap:anywhere;${isSegmented ? 'word-break:keep-all;' : ''}`
  )
}

const SPACE = / /g

const UNBROKEN_SPACE = '\u00a0'

/** @purity non-pure */
function fieldNameElement(host: Document, name: string, segments: readonly string[] | undefined): HTMLElement {
  const shown = made(host, 'span', propertyFieldNameStyle(segments !== undefined))
  if (segments === undefined) {
    shown.textContent = name
    return shown
  }
  segments.forEach((segment, at) => {
    if (at > 0) shown.append(host.createElement('wbr'))
    shown.append(segment.replace(SPACE, UNBROKEN_SPACE))
  })
  return shown
}

function propertyControlsStyle(): string {
  return `flex:1;display:flex;flex-wrap:wrap;align-items:flex-start;gap:${fieldSizes().nameGap}px;min-width:0;`
}

// see FR-006, PR-5, S-589, S-590
// WHY: a date or a choice from a fixed list never shrinks below the host's own drawing of it (JDG-2046, JDG-2098):
// the em floor alone falls short where the host raises small text to its least size.
/** @purity pure */
function propertyControlStyle(widthInFontSizes: number, sizing: 'fill' | 'asDate' | 'date' | 'keptChoice' = 'fill'): string {
  const flex = {
    fill: 'flex:1;',
    asDate: `flex:0 1 auto;width:${widthInFontSizes}em;`,
    date: 'flex:0 0 auto;width:auto;',
    keptChoice: 'flex:1 0 auto;width:auto;',
  }[sizing]
  return (
    `font:inherit;box-sizing:border-box;${flex}min-width:${widthInFontSizes}em;text-overflow:ellipsis;` +
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

// see FR-006
/** @purity pure */
function propertyCheckStyle(): string {
  return 'font:inherit;flex:none;margin:0;'
}

// see FR-006, CV-9
/** @purity pure */
function controlStyleOf(control: PropertyControl, isWrapping: boolean): string {
  if (control.kind === 'color') return propertyColorStyle()
  if (control.kind === 'boolean') return propertyCheckStyle()
  if (isWrapping) return propertyWrappingStyle()
  return propertyControlStyle(control.widthInFontSizes, sizingOf(control))
}

// see FR-006
// WHY: a choice with no floor gathers names from the document and must fit the panel (CR-671), so it alone may shrink.
/** @purity pure */
function sizingOf(control: PropertyControl): 'fill' | 'asDate' | 'date' | 'keptChoice' {
  if (control.kind === 'date') return 'date'
  if (control.isSizedAsDate === true) return 'asDate'
  return control.kind === 'choice' && control.widthInFontSizes > 0 ? 'keptChoice' : 'fill'
}

// see MH-1, MH-2, PR-8, IN-3
/** @purity non-pure */
function markControl(drawn: HTMLElement, control: PropertyControl): void {
  if (control.hint !== undefined) drawn.setAttribute('title', control.hint)
  if (control.isDisabled === true) drawn.setAttribute('disabled', 'true')
}

// WHY: `text` is a textarea as well: an input cannot wrap, and FR-006 wraps a long name downwards.
const CONTROL_TAG: Readonly<Record<PropertyControlKind, string>> = {
  text: 'textarea',
  multiline: 'textarea',
  date: 'input',
  number: 'input',
  boolean: 'input',
  choice: 'select',
  color: 'select',
  taskReference: 'span',
}

const CONTROL_INPUT_TYPE: Readonly<Record<PropertyControlKind, string | null>> = {
  text: null,
  multiline: null,
  date: 'date',
  number: 'number',
  boolean: 'checkbox',
  choice: null,
  color: null,
  taskReference: null,
}

// see TX-3, FR-158
const DATE_TIME_INPUT_TYPE = 'datetime-local'

// TRAP: must match how textOfValue (properties-panel.ts) writes a boolean; change both.
const TRUE_TEXT = String(true)

const IS_KIND_TYPED_INTO: Readonly<Record<PropertyControlKind, boolean>> = {
  text: true,
  multiline: true,
  date: true,
  number: true,
  boolean: false,
  choice: false,
  color: false,
  taskReference: false,
}

// see FR-006
const IS_KIND_WRAPPING: Readonly<Record<PropertyControlKind, boolean>> = {
  text: true,
  multiline: true,
  date: false,
  number: false,
  boolean: false,
  choice: false,
  color: false,
  taskReference: false,
}

const WRAPPING_FIELD_ATTRIBUTE = 'data-field-wraps'

const SINGLE_LINE_ROWS = 1

const LINE_BREAKS = /[\r\n]+/g

// see FR-006
// TRAP: no min-width from widthInFontSizes: FR-006 exempts these kinds from the room rule, and a
// floor wider than the panel pushes the field out past its right edge.
/** @purity pure */
function propertyWrappingStyle(): string {
  return (
    'font:inherit;box-sizing:border-box;flex:1 1 100%;width:100%;min-width:0;max-width:100%;' +
    `min-height:${fieldSizes().controlMinHeight}px;resize:none;overflow:hidden;` +
    'overflow-wrap:anywhere;white-space:pre-wrap;' +
    `background:${PAINT.ground};color:${PAINT.ink};border:1px solid ${PAINT.rule};`
  )
}

// see FR-006
/** @purity non-pure */
function growWrappingField(field: Element): void {
  const box = field as Partial<HTMLTextAreaElement>
  const style = box.style
  if (style === undefined || typeof box.scrollHeight !== 'number') return
  if (typeof box.offsetHeight !== 'number' || typeof box.clientHeight !== 'number') return
  // WHY: back to the rows height first, or a field that wrapped once never shrinks again.
  style.height = ''
  const frameHeight = box.offsetHeight - box.clientHeight
  if (box.scrollHeight > box.clientHeight) style.height = `${box.scrollHeight + frameHeight}px`
}

// see FR-006, S-589, S-590
/** @purity non-pure */
export function fitPanelFields(panel: HTMLElement): void {
  growWrappingFields(panel)
  matchDateSizedFields(panel)
}

// see FR-006, PR-5, DFC-2870
// WHY: a host date entry outgrows its em floor at small type (its picker is fixed px), so the field copies the drawn width of the date entry before it.
/** @purity non-pure */
function matchDateSizedFields(panel: HTMLElement): void {
  if (typeof panel.querySelectorAll !== 'function') return
  const dates = Array.from(panel.querySelectorAll<HTMLElement>(DATE_ENTRY_SELECTOR))
  for (const field of Array.from(panel.querySelectorAll<HTMLElement>(`[${DATE_SIZED_FIELD_ATTRIBUTE}]`))) {
    const before = dates.filter((one) => (one.compareDocumentPosition(field) & DOCUMENT_POSITION_FOLLOWING) !== 0)
    const width = before[before.length - 1]?.offsetWidth ?? 0
    if (width > 0) field.style.width = `${width}px`
  }
}

const DATE_SIZED_FIELD_ATTRIBUTE = 'data-field-sized-as-date'
const DATE_ENTRY_SELECTOR = 'input[type="date"], input[type="datetime-local"]'
const DOCUMENT_POSITION_FOLLOWING = 4

// see FR-006
/** @purity non-pure */
function growWrappingFields(panel: HTMLElement): void {
  if (typeof panel.querySelectorAll !== 'function') return
  for (const field of Array.from(panel.querySelectorAll(`[${WRAPPING_FIELD_ATTRIBUTE}]`))) {
    growWrappingField(field)
  }
}

// see FR-006
/** @purity non-pure */
function watchWrappingField(field: Element, isSingleLine: boolean): void {
  if (typeof field.addEventListener !== 'function') return
  field.addEventListener('input', () => {
    const typed = field as Partial<HTMLTextAreaElement>
    // WHY: a paste into a one-line value drops its breaks, as a text input does; wrapping itself
    // never writes a break into the value (FR-006).
    if (isSingleLine && typeof typed.value === 'string') {
      const joined = typed.value.replace(LINE_BREAKS, '')
      if (joined !== typed.value) typed.value = joined
    }
    growWrappingField(field)
  })
  if (!isSingleLine) return
  field.addEventListener('keydown', (event: Event) => {
    const typed = event as { readonly key?: unknown; readonly isComposing?: unknown }
    // TRAP: leave a composing Enter alone; it confirms the input method's candidate.
    if (typed.isComposing === true || typed.key !== HOST_ENTER) return
    // WHY: default only; the panel's own Enter listener still commits the value.
    if (typeof event.preventDefault === 'function') event.preventDefault()
  })
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
  const isSizedAsDate = control.isSizedAsDate === true
  const tag = isSizedAsDate ? 'input' : CONTROL_TAG[control.kind]
  const drawn = host.createElement(tag)
  const isWrapping = IS_KIND_WRAPPING[control.kind] && !isSizedAsDate
  drawn.setAttribute('style', controlStyleOf(control, isWrapping))
  markControl(drawn, control)
  if (isWrapping) {
    drawn.setAttribute(WRAPPING_FIELD_ATTRIBUTE, 'true')
    watchWrappingField(drawn, control.kind === 'text')
  }
  drawn.setAttribute('data-field-row', row)
  drawn.setAttribute('data-field-kind', control.kind)
  if (isSizedAsDate) drawn.setAttribute(DATE_SIZED_FIELD_ATTRIBUTE, 'true')

  const inputType = control.isDateTime === true ? DATE_TIME_INPUT_TYPE : CONTROL_INPUT_TYPE[control.kind]
  if (inputType !== null) drawn.setAttribute('type', inputType)

  if (tag === 'select') {
    const values = control.choiceValues ?? null
    const choices = control.choices ?? []
    for (let index = 0; index < choices.length; index += 1) {
      const choice = choices[index] ?? ''
      drawn.append(optionElement(host, values?.[index] ?? choice, choice))
    }
    ;(drawn as HTMLSelectElement).value = control.text
  } else if (control.kind === 'boolean') {
    ;(drawn as HTMLInputElement).checked = control.text === TRUE_TEXT
    letGoOnChange(drawn)
  } else {
    fillTypedValue(drawn, control)
  }

  CONTROL_KEYS.set(drawn, { row, key: control.key })
  if (IS_KIND_TYPED_INTO[control.kind]) {
    TYPED_CONTROLS.add(drawn)
    holdTypedEntry(typedByRow, row, control, drawn)
  }
  return drawn as HTMLElement
}

// see T-016, IN-6
/** @purity non-pure */
export function surfaceFieldElement(host: Document, row: string, control: PropertyControl): HTMLElement {
  return controlElement(host, row, control, null)
}

// see T-016, FR-006
/** @purity non-pure */
function fillTypedValue(drawn: HTMLElement, control: PropertyControl): void {
  if (control.kind === 'multiline') drawn.setAttribute('rows', String(fieldSizes().multilineRows))
  if (control.kind === 'text') drawn.setAttribute('rows', String(SINGLE_LINE_ROWS))
  if (control.kind === 'number') {
    if (control.min !== null) drawn.setAttribute('min', String(control.min))
    if (control.max !== null) drawn.setAttribute('max', String(control.max))
    scrollInsteadOfStepping(drawn)
  }
  ;(drawn as HTMLInputElement).value = control.text
}

const WHEEL_MAY_STOP_DEFAULT: AddEventListenerOptions = { passive: false }

// see MH-4, UN-8, T-023
// WHY: the host steps a focused number entry under a plain wheel (DFC-2178); scroll the panel instead.
/** @purity non-pure */
function scrollInsteadOfStepping(field: HTMLElement): void {
  if (typeof field.addEventListener !== 'function') return
  field.addEventListener(
    'wheel',
    (event: Event) => {
      const wheel = event as WheelEvent
      if (wheel.ctrlKey || wheel.altKey || wheel.shiftKey || wheel.metaKey) return
      if (field.ownerDocument.activeElement !== field) return
      wheel.preventDefault()
      const scroller = scrollingAncestorOf(field)
      if (scroller !== null) scroller.scrollTop += wheel.deltaY * wheelLinePx(wheel, scroller)
    },
    WHEEL_MAY_STOP_DEFAULT,
  )
}

const SCROLLING_OVERFLOWS: ReadonlySet<string> = new Set(['auto', 'scroll'])

/** @purity semi-pure-b */
function scrollingAncestorOf(field: Element): HTMLElement | null {
  const view = field.ownerDocument.defaultView
  for (let at = field.parentElement; at !== null; at = at.parentElement) {
    const overflow = view?.getComputedStyle(at).overflowY ?? ''
    if (SCROLLING_OVERFLOWS.has(overflow) && at.scrollHeight > at.clientHeight) return at
  }
  return null
}

/** @purity semi-pure-b */
function wheelLinePx(wheel: WheelEvent, scroller: HTMLElement): number {
  if (wheel.deltaMode === wheel.DOM_DELTA_PAGE) return scroller.clientHeight
  if (wheel.deltaMode === wheel.DOM_DELTA_LINE) return NOT_STORED_WHEEL_UNITS['S-514']
  return 1
}

// see AS-1, AS-5
/** @purity non-pure */
function holdTypedEntry(
  typedByRow: Map<string, TextEntryControl> | null,
  row: string,
  control: PropertyControl,
  drawn: Element,
): void {
  if (typedByRow === null) return
  if (control.isFocusTarget === true || !typedByRow.has(row)) {
    typedByRow.set(row, drawn as unknown as TextEntryControl)
  }
}

// see T-016
/** @purity non-pure */
function optionElement(host: Document, value: string, choice: string): HTMLElement {
  const option = host.createElement('option')
  option.setAttribute('value', value)
  option.textContent = choice
  return option
}

type ColorField = NonNullable<PropertyControl['color']>

type ColorName = NonNullable<ColorField['names']>[number]

type ColorEntrance = ColorField['theme']

// TRAP: the light side only: S-336 and S-337 hold one color for both themes, and a row that
// split them would need the theme passed down to this side.
/** @purity pure */
function checkerColor(row: 'S-336' | 'S-337'): string {
  return SCREEN_COLORS[row]?.light ?? ''
}

// see T-294, CV-9
const UNSET_COLOR_VALUE = ''
// TRAP: change with NOT_DRAWN in svg-renderer.ts; a mismatch paints transparent as the ink color.
const TRANSPARENT_PAINT = 'none'
const CHECKER_TILE_SPAN = 2
const SWATCH_BORDER_PX = 1
const COLOR_CHOICE_ATTRIBUTE = 'data-color-choice'
const HOST_CHANGE = 'change'
const HOST_CLICK = 'click'
const PRESSED_ATTRIBUTE = 'aria-pressed'
const PRESSED_VALUE = 'true'
const FIELD_ROW_ATTRIBUTE = 'data-field-row'
const CHOSEN_ATTRIBUTE = 'data-color-chosen'

// see CV-9, S-335, S-336, S-337
/** @purity pure */
function checkerPattern(side: string): string {
  const tile = `calc(${side} * ${CHECKER_TILE_SPAN} / ${NOT_STORED_PROPERTY_FIELD_SIZES['S-335']})`
  return (
    `repeating-conic-gradient(${checkerColor('S-337')} 0 25%, ${checkerColor('S-336')} 0 50%)` +
    ` 0 0/${tile} ${tile}`
  )
}

/** @purity pure */
function swatchPaint(paint: string, side: string): string {
  return paint === TRANSPARENT_PAINT ? `background:${checkerPattern(side)};` : `background:${paint};`
}

// TRAP: read PAINT at the call; this file is imported by dom-screen-surface.ts, so a
// module-level read of it sees nothing.
/** @purity pure */
function choiceSwatchBorder(): string {
  return `border:${SWATCH_BORDER_PX}px solid ${PAINT.rule};`
}

/** @purity pure */
function swatchBox(side: string): string {
  return `display:inline-block;box-sizing:border-box;flex:none;width:${side};height:${side};vertical-align:middle;`
}

// see CV-9, S-186
/** @purity pure */
function choiceSide(): string {
  return `${fieldSizes().controlMinHeight}px`
}

// see CV-9, S-530, S-531, S-147
/** @purity pure */
function chosenOutline(isChosen: boolean): string {
  if (!isChosen) return ''
  const sizes = NOT_STORED_PROPERTY_FIELD_SIZES
  return `outline:${sizes['S-530']}px solid ${PAINT.ink};outline-offset:${sizes['S-531']}px;`
}

/** @purity non-pure */
function markChosen(entry: HTMLElement, isChosen: boolean): void {
  if (!isChosen) return
  entry.setAttribute(PRESSED_ATTRIBUTE, PRESSED_VALUE)
  entry.setAttribute(CHOSEN_ATTRIBUTE, 'true')
}

// see CV-9, T-294
/** @purity pure */
function paletteNamesOf(control: PropertyControl): readonly string[] {
  const words = control.choices ?? []
  const customWord = control.color?.customWord
  return (control.choiceValues ?? []).filter(
    (value, at) => value !== UNSET_COLOR_VALUE && words[at] !== customWord,
  )
}

// WHY: the one field whose host color input stands; only a press on the custom entrance opens it.
const openCustomColor: { identity: string | null } = { identity: null }

/** @purity pure */
function colorFieldIdentity(row: string, control: PropertyControl): string {
  return `${row}|${JSON.stringify(control.key)}`
}

// see CV-9, CV-4
// WHY: the custom entrance commits one #rrggbb; the translator writes it to the side being drawn.
/** @purity non-pure */
function hostColorInput(host: Document, row: string, control: PropertyControl, color: ColorField): HTMLElement {
  const custom = made(host, 'input', propertyColorStyle())
  custom.setAttribute('type', 'color')
  custom.setAttribute('title', color.customWord)
  custom.setAttribute('aria-label', color.customWord)
  custom.setAttribute('data-field-row', row)
  custom.setAttribute('data-color-custom', 'true')
  if (color.customValue !== '') (custom as HTMLInputElement).value = color.customValue
  CONTROL_KEYS.set(custom, { row, key: control.key })
  letGoOnChange(custom)
  return custom
}

// WHY: a host input or check keeps the focus after its change; held, it stops the panel's redraw (CV-9, MH-2).
/** @purity non-pure */
function letGoOnChange(entry: HTMLElement): void {
  if (typeof entry.addEventListener !== 'function') return
  entry.addEventListener(HOST_CHANGE, () => {
    if (typeof entry.blur === 'function') entry.blur()
  })
}

// see CV-9, IF-9
// WHY: a press reaches the panel's change listener as a choice from the list did, then lets the
// focus go, which would otherwise hold the panel and leave it stale.
/** @purity non-pure */
function commitOnPress(entry: HTMLElement): void {
  if (typeof entry.addEventListener !== 'function') return
  entry.addEventListener(HOST_CLICK, () => {
    openCustomColor.identity = null
    if (typeof entry.dispatchEvent === 'function') {
      entry.dispatchEvent(new Event(HOST_CHANGE, { bubbles: true }))
    }
    if (typeof entry.blur === 'function') entry.blur()
  })
}

/** @purity non-pure */
function swatchButton(host: Document, row: string, style: string, hint: string): HTMLElement {
  const entry = made(host, 'button', style)
  entry.setAttribute('type', 'button')
  entry.setAttribute(FIELD_ROW_ATTRIBUTE, row)
  entry.setAttribute('title', hint)
  entry.setAttribute('aria-label', hint)
  return entry
}

// see CV-9, T-294
/** @purity non-pure */
function colorChoiceElement(host: Document, row: string, control: PropertyControl, name: string): HTMLElement {
  const at = (control.choiceValues ?? []).indexOf(name)
  if (at < 0) return made(host, 'span', swatchBox(choiceSide()))
  const paint = (control.color?.swatches ?? control.swatches)?.[at] ?? ''
  const isChosen = control.text === name
  const style = swatchBox(choiceSide()) + swatchPaint(paint, choiceSide()) + choiceSwatchBorder() + chosenOutline(isChosen)
  const choice = swatchButton(host, row, style, control.choices?.[at] ?? name)
  choice.setAttribute('value', name)
  ;(choice as HTMLButtonElement).value = name
  choice.setAttribute(COLOR_CHOICE_ATTRIBUTE, name)
  markChosen(choice, isChosen)
  CONTROL_KEYS.set(choice, { row, key: control.key })
  commitOnPress(choice)
  return choice
}

// see CV-9, T-294
/** @purity pure */
function paletteOrderOf(control: PropertyControl, color: ColorField): readonly ColorName[] {
  return color.names ?? paletteNamesOf(control).map((name) => ({ name, isOffered: true }))
}

/** @purity pure */
function transparentOf(control: PropertyControl, color: ColorField): ColorName {
  const listed = paletteOrderOf(control, color).find((one) => one.name === color.transparentName)
  return listed ?? { name: color.transparentName, isOffered: false }
}

// see CV-9
// WHY: an unoffered name keeps its place as an empty slot, so a color stays where it is learned.
/** @purity non-pure */
function colorSlotElement(host: Document, row: string, control: PropertyControl, one: ColorName): HTMLElement {
  if (!one.isOffered) return made(host, 'span', swatchBox(choiceSide()))
  return colorChoiceElement(host, row, control, one.name)
}

// see CV-9, S-338, S-368
/** @purity pure */
function colorGridStyle(perLine: number): string {
  return (
    `display:grid;grid-template-columns:repeat(${perLine},max-content);` +
    `gap:${fieldSizes().taskGroupGap}px;`
  )
}

// see CV-9
/** @purity pure */
function glyphSwatchStyle(entrance: ColorEntrance, isChosen: boolean): string {
  const ground = entrance.paint === null ? `background:${PAINT.ground};` : swatchPaint(entrance.paint, choiceSide())
  const ink = entrance.ink === '' ? PAINT.ink : entrance.ink
  return (
    swatchBox(choiceSide()) + ground + choiceSwatchBorder() + chosenOutline(isChosen) +
    `display:inline-flex;align-items:center;justify-content:center;padding:0;font:inherit;line-height:1;color:${ink};`
  )
}

/** @purity non-pure */
function customEntryElement(
  host: Document,
  row: string,
  control: PropertyControl,
  color: ColorField,
  slot: HTMLElement,
): HTMLElement {
  const isChosen = control.text !== UNSET_COLOR_VALUE && !paletteNamesOf(control).includes(control.text) &&
    control.text !== color.transparentName
  const entry = swatchButton(host, row, glyphSwatchStyle(color.custom, isChosen), color.custom.hint)
  entry.setAttribute('data-color-custom-entry', 'true')
  entry.textContent = color.custom.glyph
  markChosen(entry, isChosen)
  if (typeof entry.addEventListener !== 'function') return entry
  entry.addEventListener(HOST_CLICK, () => {
    openCustomColor.identity = colorFieldIdentity(row, control)
    slot.replaceChildren(hostColorInput(host, row, control, color))
    if (typeof entry.blur === 'function') entry.blur()
  })
  return entry
}

// see CV-9, CV-5, FR-007
/** @purity non-pure */
function themeEntryElement(host: Document, row: string, control: PropertyControl, color: ColorField): HTMLElement {
  const isChosen = control.text === UNSET_COLOR_VALUE
  const entry = swatchButton(host, row, glyphSwatchStyle(color.theme, isChosen), color.theme.hint)
  entry.setAttribute('value', UNSET_COLOR_VALUE)
  ;(entry as HTMLButtonElement).value = UNSET_COLOR_VALUE
  entry.setAttribute('data-color-theme-entry', 'true')
  entry.textContent = color.theme.glyph
  markChosen(entry, isChosen)
  CONTROL_KEYS.set(entry, { row, key: control.key })
  commitOnPress(entry)
  return entry
}

// see CV-9
// WHY: a field that refuses transparent keeps the slot empty, so the custom entrance stays in its place.
/** @purity non-pure */
function transparentEntryElement(host: Document, row: string, control: PropertyControl, color: ColorField): HTMLElement {
  const word = color.transparentWord
  if (word === undefined || !transparentOf(control, color).isOffered) {
    const slot = made(host, 'span', swatchBox(choiceSide()))
    slot.setAttribute('data-color-transparent-slot', 'true')
    return slot
  }
  const isChosen = control.text === color.transparentName
  const style = swatchBox(choiceSide()) + swatchPaint(TRANSPARENT_PAINT, choiceSide()) + choiceSwatchBorder() + chosenOutline(isChosen)
  const entry = swatchButton(host, row, style, word)
  entry.setAttribute('value', color.transparentName)
  ;(entry as HTMLButtonElement).value = color.transparentName
  entry.setAttribute(COLOR_CHOICE_ATTRIBUTE, color.transparentName)
  markChosen(entry, isChosen)
  CONTROL_KEYS.set(entry, { row, key: control.key })
  commitOnPress(entry)
  return entry
}

// WHY: MK-13 focuses a color field (JDG-410), which takes no text: the value's swatch, else the first.
/** @purity non-pure */
function holdColorFocusTarget(
  focusByRow: Map<string, TextEntryControl> | null,
  row: string,
  slots: readonly HTMLElement[],
): void {
  const swatches = slots.filter((one) => one.getAttribute(FIELD_ROW_ATTRIBUTE) === row)
  const target = swatches.find((one) => one.getAttribute(PRESSED_ATTRIBUTE) === PRESSED_VALUE) ?? swatches[0]
  if (focusByRow === null || target === undefined || focusByRow.has(row)) return
  focusByRow.set(row, target as unknown as TextEntryControl)
}

// see CV-9, CV-4, S-338
/** @purity non-pure */
function colorFieldElements(
  host: Document,
  row: string,
  control: PropertyControl,
  focusByRow: Map<string, TextEntryControl> | null,
): readonly HTMLElement[] {
  const color = control.color
  if (color === undefined) return []
  const perLine = NOT_STORED_PROPERTY_FIELD_SIZES['S-338']
  const named = paletteOrderOf(control, color).filter((one) => one.name !== color.transparentName)
  const slots = named.map((one) => colorSlotElement(host, row, control, one))
  const slot = made(host, 'span', 'flex:1 1 100%;')
  if (openCustomColor.identity === colorFieldIdentity(row, control)) {
    slot.append(hostColorInput(host, row, control, color))
  }
  const theme = themeEntryElement(host, row, control, color)
  const transparent = transparentEntryElement(host, row, control, color)
  const custom = customEntryElement(host, row, control, color, slot)
  const grid = made(host, 'div', colorGridStyle(perLine + 2))
  grid.append(...slots.slice(0, perLine), theme, made(host, 'span', ''), ...slots.slice(perLine), transparent, custom)
  holdColorFocusTarget(focusByRow, row, [...slots, theme, transparent, custom])
  const palette = made(host, 'div', 'flex:1 1 100%;display:flex;flex-wrap:wrap;')
  palette.setAttribute('data-color-palette', row)
  palette.setAttribute('data-field-kind', control.kind)
  palette.append(grid, slot)
  return [palette]
}

// see FR-041, S-368
/** @purity non-pure */
function swatchFieldElements(
  host: Document,
  field: PropertyField,
  control: PropertyControl,
  focusByRow: Map<string, TextEntryControl> | null,
): readonly HTMLElement[] {
  const grid = made(host, 'div', colorGridStyle(NOT_STORED_PROPERTY_FIELD_SIZES['S-368']))
  const slots = (control.choiceValues ?? []).map((value) => colorChoiceElement(host, field.row, control, value))
  grid.append(...slots)
  holdColorFocusTarget(focusByRow, field.row, slots)
  const palette = made(host, 'div', 'flex:1 1 100%;')
  palette.setAttribute('data-color-palette', field.row)
  palette.setAttribute('data-field-kind', control.kind)
  palette.append(grid)
  if ((control.choiceValues ?? []).includes(control.text)) return [palette]
  const shown = made(host, 'span', 'flex:1 1 100%;')
  shown.textContent = field.text
  return [palette, shown]
}

// see FX-7
/** @purity non-pure */
function pressElement(host: Document, row: string, control: PropertyControl, word: string): HTMLElement {
  const entry = made(host, 'button', 'font:inherit;flex:none;')
  entry.setAttribute('type', 'button')
  entry.setAttribute('data-field-row', row)
  entry.setAttribute('data-field-kind', control.kind)
  entry.textContent = word
  entry.setAttribute('value', control.text)
  ;(entry as HTMLButtonElement).value = control.text
  markControl(entry, control)
  CONTROL_KEYS.set(entry, { row, key: control.key })
  commitOnPress(entry)
  return entry
}

// WHY: a field no longer described closes its host color input, so it stands only after a press.
/** @purity non-pure */
function forgetClosedCustomColor(description: PropertiesPanel): void {
  const standing = description.fields.flatMap((field) =>
    field.controls.map((control) => colorFieldIdentity(field.row, control)),
  )
  if (openCustomColor.identity !== null && !standing.includes(openCustomColor.identity)) {
    openCustomColor.identity = null
  }
}

// WHY: the open list, its narrowing and order outlive the redraw after each check; the filter regains the focus.
const openAssigneeList: { identity: string | null; typed: string; isDescending: boolean; isFilterRefocused: boolean } = {
  identity: null,
  typed: '',
  isDescending: false,
  isFilterRefocused: false,
}

type AssigneeComboOf = NonNullable<PropertyControl['assignee']>

const ASSIGNEE_FIELD_ATTRIBUTE = 'data-assignee-field'
const ASSIGNEE_LIST_ATTRIBUTE = 'data-assignee-list'
const ASSIGNEE_PERSON_ATTRIBUTE = 'data-assignee-person'
const ASSIGNEE_ADD_ATTRIBUTE = 'data-assignee-add'

/** @purity pure */
function assigneeListStyle(): string {
  return (
    `flex:1 1 100%;display:flex;flex-direction:column;border:1px solid ${PAINT.rule};` +
    `background:${PAINT.ground};color:${PAINT.ink};`
  )
}

// see AS-5, S-607
/** @purity pure */
function assigneeItemsStyle(): string {
  const height = NOT_STORED_PROPERTY_FIELD_SIZES['S-607'] * LINES_PER_CHOICE * FIELD_LINE_HEIGHT
  return `display:flex;flex-direction:column;max-height:${height}em;overflow-y:auto;`
}

// WHY: preventDefault keeps the focus where it is; stopPropagation keeps the press from settle-on-press-outside.
/** @purity non-pure */
function onPressHeld(element: HTMLElement, act: () => void): void {
  element.addEventListener('pointerdown', (event: Event) => {
    event.preventDefault()
    event.stopPropagation()
    act()
  })
}

// see AS-5, AS-7, IC-125, IC-126
// WHY: one carrier writes, as a list choice does; the filter lets go first, or the held field stops the redraw (MH-2).
/** @purity non-pure */
function commitAssignee(carrier: HTMLElement, filter: HTMLInputElement, write: { readonly key: PropertyControl['key']; readonly text: string; readonly pick: AssigneePick }): void {
  const isFocused = filter.ownerDocument.activeElement === filter
  openAssigneeList.isFilterRefocused = isFocused
  if (isFocused) filter.blur()
  ;(carrier as HTMLButtonElement).value = write.text
  CONTROL_KEYS.set(carrier, { row: carrier.getAttribute(FIELD_ROW_ATTRIBUTE) ?? '', key: write.key })
  CONTROL_PICKS.set(carrier, write.pick)
  carrier.dispatchEvent(new Event(HOST_CHANGE, { bubbles: true }))
}

type AssigneePick = NonNullable<ReturnType<typeof CONTROL_PICKS.get>>

/** @purity pure */
function seatedKeyOf(control: PropertyControl, resourceUid: number | null): PropertyControl['key'] {
  return { ...(control.key as Extract<PropertyControl['key'], { holder: 'assignment' }>), resourceUid }
}

// see AS-5, AS-7, AS-10
/** @purity non-pure */
function assigneeItemElement(
  host: Document,
  candidate: ReturnType<AssigneeComboOf['candidatesOf']>[number],
  isSeated: boolean,
  press: () => void,
): HTMLElement {
  // WHY: a div, not a label: a label would flip its own check and raise a change of its own.
  const item = made(host, 'div', `display:flex;align-items:center;gap:${fieldSizes().nameGap}px;cursor:default;padding:0 0.25em;`)
  const check = made(host, 'input', 'margin:0;flex:none;pointer-events:none;')
  check.setAttribute('type', 'checkbox')
  check.setAttribute('tabindex', '-1')
  ;(check as HTMLInputElement).checked = isSeated
  const word = made(host, 'span', 'overflow-wrap:anywhere;')
  word.textContent = candidate.word
  item.append(check, word)
  item.setAttribute(candidate.pick === 'add' ? ASSIGNEE_ADD_ATTRIBUTE : ASSIGNEE_PERSON_ATTRIBUTE, candidate.value)
  onPressHeld(item, press)
  return item
}

// see AS-5, AS-7, AS-10, IC-123, IC-124
/** @purity non-pure */
function drawAssigneeItems(
  host: Document,
  items: HTMLElement,
  control: PropertyControl,
  combo: AssigneeComboOf,
  send: (key: PropertyControl['key'], text: string, pick: AssigneePick) => void,
): void {
  const candidates = combo.candidatesOf(openAssigneeList.typed, openAssigneeList.isDescending)
  items.replaceChildren(...candidates.map((one) => {
    const uid = Number(one.value)
    const isSeated = one.pick === 'candidate' && combo.seated.includes(uid)
    return assigneeItemElement(host, one, isSeated, () => {
      if (one.pick === 'add') send(seatedKeyOf(control, null), one.value, 'add')
      else if (isSeated) send(seatedKeyOf(control, uid), UNASSIGN_TOKEN, 'candidate')
      else send(seatedKeyOf(control, null), one.value, 'candidate')
    })
  }))
}

// see AS-3
const UNASSIGN_TOKEN = '-'

// see AS-5, IC-123, IC-124, IC-125, IC-126
/** @purity non-pure */
function assigneeHeadElement(
  host: Document,
  combo: AssigneeComboOf,
  redraw: () => void,
  sendList: (pick: 'all' | 'none') => void,
): HTMLElement {
  const checks = combo.checkEntries.map((item, at) => {
    const entry = commandEntry(host, item)
    onPressHeld(entry, () => sendList(at === 0 ? 'all' : 'none'))
    return entry
  })
  const sorts = combo.sortEntries.map((item, at) => {
    const entry = commandEntry(host, { ...item, isPressed: (at === 1) === openAssigneeList.isDescending })
    onPressHeld(entry, () => {
      openAssigneeList.isDescending = at === 1
      redraw()
    })
    return entry
  })
  const head = made(host, 'div', `display:flex;flex-wrap:wrap;gap:${fieldSizes().nameGap}px;`)
  head.append(...checks, ...sorts)
  return head
}

// see AS-5, AS-8, SV-4
/** @purity non-pure */
function onAssigneeFilterKey(event: Event, combo: AssigneeComboOf, check: (uid: number) => void): void {
  const key = event as Partial<KeyboardEvent>
  if (key.key !== HOST_ENTER || key.isComposing === true) return
  event.preventDefault()
  event.stopPropagation()
  const typed = openAssigneeList.typed.trim()
  const named = combo.people.find((one) => one.name === typed)
  if (named !== undefined && !combo.seated.includes(named.uid)) check(named.uid)
}

// see AS-5, IC-125, IC-126
/** @purity pure */
function shownUidsOf(combo: AssigneeComboOf, isSeated: boolean): string {
  return combo
    .candidatesOf(openAssigneeList.typed, openAssigneeList.isDescending)
    .filter((one) => one.pick === 'candidate' && combo.seated.includes(Number(one.value)) === isSeated)
    .map((one) => one.value)
    .join(ASSIGNEE_LIST_SEPARATOR)
}

// see AS-5, SV-4
/** @purity non-pure */
function assigneeFilterOf(host: Document, row: string, control: PropertyControl): HTMLInputElement {
  const filter = made(host, 'input', propertyControlStyle(control.widthInFontSizes)) as HTMLInputElement
  filter.setAttribute('type', 'text')
  filter.setAttribute('data-assignee-filter', row)
  filter.value = openAssigneeList.typed
  // WHY: a text entry (T-292): while it holds the focus its keys are its own, not the single-key shortcuts.
  TYPED_CONTROLS.add(filter)
  TYPED_ROWS.set(filter, row)
  return filter
}

// see AS-5, AS-7, AS-10, IC-123, IC-124, IC-125, IC-126
/** @purity non-pure */
function assigneeListElement(
  host: Document,
  parts: { readonly row: string; readonly control: PropertyControl; readonly combo: AssigneeComboOf },
  filter: HTMLInputElement,
  carrier: HTMLElement,
): HTMLElement {
  const { row, control, combo } = parts
  const list = made(host, 'div', assigneeListStyle())
  list.setAttribute(ASSIGNEE_LIST_ATTRIBUTE, row)
  const items = made(host, 'div', assigneeItemsStyle())
  const send = (key: PropertyControl['key'], text: string, pick: AssigneePick): void =>
    commitAssignee(carrier, filter, { key, text, pick })
  const redraw = (): void => drawAssigneeItems(host, items, control, combo, send)
  const sendList = (pick: 'all' | 'none'): void => {
    const uids = shownUidsOf(combo, pick === 'none')
    if (uids !== '') send(seatedKeyOf(control, null), uids, pick)
  }
  filter.addEventListener('input', () => {
    openAssigneeList.typed = filter.value
    redraw()
  })
  filter.addEventListener('keydown', (event: Event) =>
    onAssigneeFilterKey(event, combo, (uid) => send(seatedKeyOf(control, null), String(uid), 'candidate')),
  )
  list.append(filter, assigneeHeadElement(host, combo, redraw, sendList), items)
  redraw()
  return list
}

// see AS-1, AS-5, FR-059, AS-13
/** @purity non-pure */
function assigneeDropdownElements(
  host: Document,
  row: string,
  control: PropertyControl,
  combo: AssigneeComboOf,
  typedByRow: Map<string, TextEntryControl> | null,
): readonly HTMLElement[] {
  const identity = colorFieldIdentity(row, control)
  const field = made(host, 'span', 'display:flex;flex-direction:column;flex:1 1 100%;min-width:0;')
  field.setAttribute(ASSIGNEE_FIELD_ATTRIBUTE, row)
  const word = made(host, 'span', 'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;')
  word.textContent = combo.fieldWord
  const shown = closedFieldOf(host, row, control, word)
  const carrier = made(host, 'button', 'display:none;')
  carrier.setAttribute(FIELD_ROW_ATTRIBUTE, row)
  const filter = assigneeFilterOf(host, row, control)
  const isOpen = (): boolean => field.querySelector(`[${ASSIGNEE_LIST_ATTRIBUTE}]`) !== null
  const open = (): void => {
    if (isOpen()) return
    if (openAssigneeList.identity !== identity) Object.assign(openAssigneeList, { typed: '', isDescending: false })
    openAssigneeList.identity = identity
    filter.value = openAssigneeList.typed
    field.append(assigneeListElement(host, { row, control, combo }, filter, carrier))
    closeAssigneeOnPressElsewhere(host, field)
  }
  holdAssigneeFocus(filter, open, typedByRow, row)
  field.append(shown, carrier)
  if (openAssigneeList.identity === identity) open()
  if (openAssigneeList.isFilterRefocused && isOpen()) refocusAssigneeFilter(filter)
  shown.addEventListener(HOST_CLICK, () => (isOpen() ? closeAssigneeList(field) : open()))
  return [field]
}

// WHY: AS-1 focuses the row's typed entry; the filter is that entry, so its focus opens the list first.
/** @purity non-pure */
function holdAssigneeFocus(
  filter: HTMLInputElement,
  open: () => void,
  typedByRow: Map<string, TextEntryControl> | null,
  row: string,
): void {
  const focusFilter = filter.focus.bind(filter)
  filter.focus = (options?: FocusOptions): void => {
    open()
    focusFilter(options)
  }
  typedByRow?.set(row, filter as unknown as TextEntryControl)
}

/** @purity non-pure */
function refocusAssigneeFilter(filter: HTMLInputElement): void {
  openAssigneeList.isFilterRefocused = false
  queueMicrotask(() => {
    if (filter.isConnected) filter.focus()
  })
}

/** @purity non-pure */
function closeAssigneeList(field: HTMLElement): void {
  Object.assign(openAssigneeList, { identity: null, typed: '', isDescending: false, isFilterRefocused: false })
  field.querySelector(`[${ASSIGNEE_LIST_ATTRIBUTE}]`)?.remove()
}

// WHY: a field the panel has since redrawn lets go of the listener.
/** @purity non-pure */
function closeAssigneeOnPressElsewhere(host: Document, field: HTMLElement): void {
  const onPress = (event: Event): void => {
    if (field.isConnected && field.contains(event.target as Node)) return
    host.removeEventListener('pointerdown', onPress, true)
    if (field.isConnected) closeAssigneeList(field)
  }
  host.addEventListener('pointerdown', onPress, true)
}

const LINK_TASK_ATTRIBUTE = 'data-link-task-uid'

const UNLINKED_VALUE = ''

const UNLINK_GLYPH = '×'

/** @purity pure */
function propertyLinkStyle(): string {
  return (
    'flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;' +
    `cursor:pointer;color:${PAINT.link};text-decoration:underline;`
  )
}

/** @purity pure */
function propertyUnlinkStyle(): string {
  return `font:inherit;flex:none;cursor:pointer;background:${PAINT.ground};color:${PAINT.ink};border:1px solid ${PAINT.rule};`
}

/** @purity pure */
function propertyBadgeStyle(): string {
  return `flex:none;padding:0 0.25em;border:1px solid ${PAINT.rule};color:${PAINT.quiet};font-size:0.85em;line-height:1.4;`
}

// see PR-37, PR-38, T-018, IN-3
/** @purity non-pure */
function linkTailElements(host: Document, control: PropertyControl): readonly HTMLElement[] {
  const tail: HTMLElement[] = []
  if (control.badge !== undefined) {
    const badge = made(host, 'span', propertyBadgeStyle())
    badge.textContent = control.badge.text
    badge.setAttribute('title', control.badge.hint)
    badge.setAttribute('data-link-kind', control.badge.text)
    tail.push(badge)
  }
  if (control.lag !== undefined) {
    const lag = made(host, 'span', `flex:none;color:${PAINT.quiet};`)
    lag.textContent = control.lag
    lag.setAttribute('data-link-lag', 'true')
    tail.push(lag)
  }
  return tail
}

// see PTL-15, PTL-16, PTL-17, PR-37, PR-38, CM-18, SQ-1, S-503, FR-006
/** @purity non-pure */
function linkFieldElements(host: Document, row: string, control: PropertyControl, link: NonNullable<PropertyControl['link']>): readonly HTMLElement[] {
  const name = made(host, 'span', propertyLinkStyle())
  name.textContent = control.text
  name.setAttribute(FIELD_ROW_ATTRIBUTE, row)
  name.setAttribute('data-field-kind', control.kind)
  name.setAttribute(LINK_TASK_ATTRIBUTE, String(link.taskUid))
  if (!link.canUnlink) {
    const line = made(host, 'span', `flex:1 1 100%;display:flex;align-items:center;gap:${fieldSizes().nameGap}px;min-width:0;`)
    line.append(name, ...linkTailElements(host, control))
    return [line]
  }
  const unlink = made(host, 'button', propertyUnlinkStyle())
  unlink.setAttribute('type', 'button')
  ;(unlink as HTMLButtonElement).value = UNLINKED_VALUE
  unlink.textContent = UNLINK_GLYPH
  unlink.setAttribute(FIELD_ROW_ATTRIBUTE, row)
  CONTROL_KEYS.set(unlink, { row, key: control.key })
  commitOnPress(unlink)
  return [name, unlink]
}

// see PTL-16, SJ-1, T-332
/** @purity semi-pure-b */
export function withPropertyLinkJump(answer: ScreenPart | null, first: Element | null): ScreenPart | null {
  if (answer === null || first === null || typeof first.getAttribute !== 'function') return answer
  const uid = first.getAttribute(LINK_TASK_ATTRIBUTE)
  if (uid === null || answer.searchJumpTarget != null) return answer
  return { ...answer, searchJumpTarget: { kind: 'task', taskUid: Number(uid) } }
}

const READOUT_ATTRIBUTE = 'data-field-readout'

const READOUT_MEMBER: keyof PropertyField = 'readout'

// see FR-006, MH-1, PR-5, PR-40
/** @purity non-pure */
function unitElement(host: Document, unit: string): HTMLElement {
  const shown = made(host, 'span', 'flex:none;align-self:center;white-space:nowrap;')
  shown.textContent = unit
  return shown
}

// see MH-4
// TRAP: keep the readout out of this key, or each zoom step rebuilds the panel and a held field reads stale.
/** @purity pure */
export function propertiesPanelKeyOf(description: PropertiesPanel | null): string {
  const withoutReadout = (member: string, value: unknown): unknown => (member === READOUT_MEMBER ? undefined : value)
  return JSON.stringify(description, withoutReadout) ?? ''
}

// see MH-4
/** @purity non-pure */
export function rewritePanelReadouts(panel: HTMLElement, description: PropertiesPanel): void {
  if (typeof panel.querySelector !== 'function') return
  for (const field of description.fields) {
    const readout = field.readout
    if (readout === undefined) continue
    const shown = panel.querySelector(`[${READOUT_ATTRIBUTE}="${field.row}"]`)
    if (shown !== null && shown.textContent !== readout) shown.textContent = readout
  }
}

// see FO-14, FR-156
/** @purity non-pure */
function ownLineOf(host: Document, elements: readonly HTMLElement[]): readonly HTMLElement[] {
  const line = made(host, 'div', 'flex:1 1 100%;display:flex;')
  line.append(...elements)
  return [line]
}

/** @purity non-pure */
function wordsElement(host: Document, words: string): HTMLElement {
  const shown = made(host, 'span', 'white-space:pre-line;')
  shown.textContent = words
  return shown
}

// see T-016, FR-006, CV-9, AS-5, PTL-15
/** @purity non-pure */
function controlElementsOf(
  host: Document,
  field: PropertyField,
  control: PropertyControl,
  typedByRow: Map<string, TextEntryControl> | null,
): readonly HTMLElement[] {
  if (control.color !== undefined) return colorFieldElements(host, field.row, control, typedByRow)
  if (control.swatches !== undefined) return swatchFieldElements(host, field, control, typedByRow)
  if (control.press !== undefined) return [pressElement(host, field.row, control, control.press)]
  if (control.assignee !== undefined) return assigneeDropdownElements(host, field.row, control, control.assignee, typedByRow)
  if (control.link !== undefined) return linkFieldElements(host, field.row, control, control.link)
  if (control.choiceLines !== undefined) return [twoLineChoiceElement(host, field.row, control, control.choiceLines)]
  return [controlElement(host, field.row, control, typedByRow)]
}

type ChoiceLines = NonNullable<PropertyControl['choiceLines']>

// WHY: the one two-line choice whose list stands; the panel redraws it open until a choice or a press elsewhere.
const openTwoLineChoice: { identity: string | null } = { identity: null }

const CHOICE_MARK = '▾'

const TWO_LINE_CHOICE_ATTRIBUTE = 'data-two-line-choice'

const TWO_LINE_LIST_ATTRIBUTE = 'data-two-line-list'

// see FO-14, FO-15, FR-006
// WHY: grown from its floor, not from its longest line, so a long place wraps rather than widening the panel.
/** @purity pure */
function twoLineFieldStyle(control: PropertyControl): string {
  return `display:flex;flex-direction:column;flex:1 1 ${control.widthInFontSizes}em;min-width:${control.widthInFontSizes}em;`
}

// WHY: flex:none, or the list's height cap squeezes each choice and its two lines overlap the next.
/** @purity pure */
function twoLineEntryStyle(isChosen: boolean): string {
  return (
    'font:inherit;box-sizing:border-box;flex:none;width:100%;display:flex;align-items:center;justify-content:space-between;' +
    `gap:${fieldSizes().nameGap}px;text-align:left;min-height:${fieldSizes().controlMinHeight}px;` +
    `background:${PAINT.ground};color:${PAINT.ink};border:1px solid ${isChosen ? PAINT.ink : PAINT.rule};`
  )
}

const LINES_PER_CHOICE = 2

// see FO-14, FO-15, S-607
/** @purity pure */
function twoLineListStyle(): string {
  const height = NOT_STORED_PROPERTY_FIELD_SIZES['S-607'] * LINES_PER_CHOICE * FIELD_LINE_HEIGHT
  return `display:flex;flex-direction:column;max-height:${height}em;overflow-y:auto;border:1px solid ${PAINT.rule};`
}

/** @purity non-pure */
function choiceLinesElement(host: Document, [head, place]: readonly [string, string]): HTMLElement {
  const lines = made(host, 'span', 'display:flex;flex-direction:column;min-width:0;')
  for (const [at, line] of (place === '' ? [head] : [head, place]).entries()) {
    const shown = made(host, 'span', at === 0 ? 'white-space:nowrap;' : 'overflow-wrap:anywhere;')
    shown.textContent = line
    lines.append(shown)
  }
  return lines
}

// see FO-14, FO-15, FR-156, JDG-2463
// WHY: the host's list draws one line per choice and the zone names take two, so the field draws its own:
// a press on the field opens the list under it, a press on a choice commits it as a list choice does.
/** @purity non-pure */
function twoLineChoiceElement(host: Document, row: string, control: PropertyControl, choiceLines: ChoiceLines): HTMLElement {
  const identity = colorFieldIdentity(row, control)
  const values = control.choiceValues ?? []
  const field = made(host, 'span', twoLineFieldStyle(control))
  field.setAttribute(TWO_LINE_CHOICE_ATTRIBUTE, row)
  const shown = closedFieldOf(host, row, control, choiceLinesElement(host, choiceLines[values.indexOf(control.text)] ?? [control.text, '']))
  field.append(shown)
  const open = (): void => {
    openTwoLineChoice.identity = identity
    field.append(twoLineListElement(host, row, control, choiceLines))
    closeOnPressElsewhere(host, field)
  }
  if (openTwoLineChoice.identity === identity) open()
  shown.addEventListener(HOST_CLICK, () => {
    const list = field.querySelector(`[${TWO_LINE_LIST_ATTRIBUTE}]`)
    if (list === null) open()
    else closeTwoLineList(field)
  })
  return field
}

/** @purity non-pure */
function closeTwoLineList(field: HTMLElement): void {
  openTwoLineChoice.identity = null
  field.querySelector(`[${TWO_LINE_LIST_ATTRIBUTE}]`)?.remove()
}

// WHY: a field the panel has since redrawn lets go of the listener.
/** @purity non-pure */
function closeOnPressElsewhere(host: Document, field: HTMLElement): void {
  const onPress = (event: Event): void => {
    const isInside = field.isConnected && field.contains(event.target as Node)
    if (isInside) return
    host.removeEventListener('pointerdown', onPress, true)
    if (field.isConnected) closeTwoLineList(field)
  }
  host.addEventListener('pointerdown', onPress, true)
}

// see FO-14, AS-5
/** @purity non-pure */
function closedFieldOf(host: Document, row: string, control: PropertyControl, words: HTMLElement): HTMLElement {
  const shown = made(host, 'button', twoLineEntryStyle(false))
  shown.setAttribute('type', 'button')
  shown.setAttribute(FIELD_ROW_ATTRIBUTE, row)
  shown.setAttribute('data-field-kind', control.kind)
  markControl(shown, control)
  const mark = made(host, 'span', '')
  mark.textContent = CHOICE_MARK
  shown.append(words, mark)
  keepFocusOff(shown)
  return shown
}

// WHY: the field and its choices take no focus, so the panel keeps redrawing (a held control stops it, MH-2).
/** @purity non-pure */
function keepFocusOff(entry: HTMLElement): void {
  entry.addEventListener('mousedown', (event: Event) => event.preventDefault())
}

/** @purity non-pure */
function twoLineListElement(host: Document, row: string, control: PropertyControl, choiceLines: ChoiceLines): HTMLElement {
  const list = made(host, 'div', twoLineListStyle())
  list.setAttribute(TWO_LINE_LIST_ATTRIBUTE, row)
  ;(control.choiceValues ?? []).forEach((value, at) => {
    const choice = made(host, 'button', twoLineEntryStyle(value === control.text))
    choice.setAttribute('type', 'button')
    choice.setAttribute(FIELD_ROW_ATTRIBUTE, row)
    choice.setAttribute('value', value)
    ;(choice as HTMLButtonElement).value = value
    choice.append(choiceLinesElement(host, choiceLines[at] ?? [value, '']))
    if (value === control.text) markChosen(choice, true)
    CONTROL_KEYS.set(choice, { row, key: control.key })
    keepFocusOff(choice)
    // WHY: the list goes at once: a choice equal to the value writes nothing, so no redraw would close it.
    choice.addEventListener(HOST_CLICK, () => {
      choice.dispatchEvent(new Event(HOST_CHANGE, { bubbles: true }))
      closeTwoLineList(list.parentElement ?? list)
    })
    list.append(choice)
  })
  return list
}

// see T-016, MH-3, PR-37, PR-38
// WHY: pre-line, so a read-only row of one line per dependency shows its lines; a readout is rewritten in place (MH-4).
/** @purity non-pure */
function valueElement(host: Document, field: PropertyField): HTMLElement {
  const value = made(host, 'span', 'white-space:pre-line;')
  if (field.readout === undefined) {
    value.textContent = field.text
    return value
  }
  value.setAttribute(READOUT_ATTRIBUTE, field.row)
  value.textContent = field.readout
  return value
}

// see T-016, T-058, T-104
/** @purity non-pure */
export function fieldElement(
  host: Document,
  field: PropertyField,
  typedByRow: Map<string, TextEntryControl> | null,
): HTMLElement {
  const line = made(host, 'div', propertyFieldStyle())
  line.setAttribute('data-field-row', field.row)
  line.setAttribute('data-editable', String(field.isEditable))
  if (field.isSettledAsOne === true) line.setAttribute(SETTLED_AS_ONE_ATTRIBUTE, 'true')
  const name = fieldNameElement(host, field.name, field.nameBreakSegments)

  if (field.controls.length === 0) {
    line.append(name, valueElement(host, field))
    return line
  }

  const controls = made(host, 'div', propertyControlsStyle())
  // WHY: a read-out with an entrance under it is one field (FX-6, FX-7): the read-out takes the first line.
  if (field.readout !== undefined) {
    const readout = valueElement(host, field)
    readout.style.flex = '1 1 100%'
    controls.append(readout)
  }
  if (field.text !== '' && field.controls.every((one) => one.text === '')) {
    const shown = made(host, 'span', '')
    shown.textContent = field.text
    controls.append(shown)
  }
  for (const control of field.controls) {
    const drawn = control.words === undefined ? controlElementsOf(host, field, control, typedByRow) : [wordsElement(host, control.words)]
    controls.append(...(control.isOwnLine === true ? ownLineOf(host, drawn) : drawn))
  }
  if (field.unit !== undefined) controls.append(unitElement(host, field.unit))
  line.append(name, controls)
  return line
}

// see FR-153, IC-139
// WHY: laid out as a field row, name left and entry right, but carries no field row: it holds no
// value; anchored so a press reaches the shell as any entry's does (T-109).
/** @purity non-pure */
function headEntryElement(host: Document, entry: PropertiesPanel['commands'][number], anchors: Map<string, HTMLElement>): HTMLElement {
  const line = made(host, 'div', propertyFieldStyle())
  const name = made(host, 'span', propertyFieldNameStyle())
  name.textContent = entry.label
  const controls = made(host, 'div', propertyControlsStyle())
  controls.append(anchoredEntry(host, entry, anchors))
  line.append(name, controls)
  return line
}

// see FR-072
/** @purity non-pure */
export function markPropertiesPanel(panel: HTMLElement, description: PropertiesPanel): void {
  panel.setAttribute('data-showing', description.showing)
  panel.setAttribute('data-subject-gone', String(description.isSubjectGone))
}

// see U-25, FR-072
/** @purity non-pure */
export function fillPropertiesPanel(
  host: Document,
  panel: HTMLElement,
  description: PropertiesPanel,
  anchors: Map<string, HTMLElement>,
  typedByRow: Map<string, TextEntryControl>,
): void {
  // TRAP: clear first, as anchorsOf does: a leftover row would name a control no longer drawn.
  typedByRow.clear()
  forgetClosedCustomColor(description)
  const folded = foldedGroupsOf(panel)
  const drawn = description.fields.map((field) => fieldElement(host, field, typedByRow))
  const entries = description.commands.map((item) => anchoredEntry(host, item, anchors))
  const wayOut = made(host, 'div', propertyWayOutStyle())
  wayOut.setAttribute(WAY_OUT_ATTRIBUTE, 'true')
  wayOut.append(...entries)
  const head = description.headEntry === undefined ? [] : [headEntryElement(host, description.headEntry, anchors)]
  panel.replaceChildren(wayOut, ...head, ...withReadOnlyGroups(host, description, drawn, folded))
}

const WAY_OUT_ATTRIBUTE = 'data-way-out'

const READ_ONLY_GROUP_ATTRIBUTE = 'data-read-only-group'

const READ_ONLY_HEADING_ATTRIBUTE = 'data-read-only-heading'

const READ_ONLY_SECTION_ATTRIBUTE = 'data-read-only-section'

// see T-380
// TRAP: the panel is rebuilt whenever its description changes, so a group the author folded is read back first.
/** @purity non-pure */
function foldedGroupsOf(panel: HTMLElement): ReadonlySet<string> {
  if (typeof panel.querySelectorAll !== 'function') return new Set()
  const groups = [...panel.querySelectorAll(`[${READ_ONLY_GROUP_ATTRIBUTE}]`)]
  return new Set(groups.filter((group) => !group.hasAttribute('open')).map((group) => group.getAttribute(READ_ONLY_GROUP_ATTRIBUTE) ?? ''))
}

/** @purity non-pure */
function readOnlyLine(host: Document, attribute: string, words: string, style: string): HTMLElement {
  const line = made(host, 'div', style)
  line.setAttribute(attribute, words)
  line.textContent = words
  return line
}

/** @purity non-pure */
function readOnlyGroupElement(host: Document, group: NonNullable<PropertyField['readOnlyGroup']>, isFolded: boolean): HTMLElement {
  const box = made(host, 'details', `margin-bottom:${fieldSizes().taskGroupGap}px;`)
  box.setAttribute(READ_ONLY_GROUP_ATTRIBUTE, group.key)
  if (!isFolded) box.setAttribute('open', '')
  const summary = made(host, 'summary', `cursor:pointer;margin-bottom:${fieldSizes().taskGroupGap}px;`)
  summary.textContent = group.name
  box.append(summary)
  return box
}

// see FR-072, T-369, T-380, RN-6
// WHY: the read-only rows come last; each group is one foldable box, open at first, a window's name heading its rows.
/** @purity non-pure */
function withReadOnlyGroups(
  host: Document,
  description: PropertiesPanel,
  drawn: readonly HTMLElement[],
  folded: ReadonlySet<string>,
): readonly HTMLElement[] {
  const laid: HTMLElement[] = []
  let box: HTMLElement | null = null
  let section: string | undefined
  description.fields.forEach((field, at) => {
    const element = drawn[at]
    const group = field.readOnlyGroup
    if (element === undefined) return
    if (group === undefined) {
      laid.push(element)
      return
    }
    if (box === null && description.readOnlyHeading !== undefined) {
      laid.push(readOnlyLine(host, READ_ONLY_HEADING_ATTRIBUTE, description.readOnlyHeading, `color:${PAINT.quiet};margin:${fieldSizes().taskGroupGap}px 0;`))
    }
    if (box === null || box.getAttribute(READ_ONLY_GROUP_ATTRIBUTE) !== group.key) {
      box = readOnlyGroupElement(host, group, folded.has(group.key))
      section = undefined
      laid.push(box)
    }
    if (group.section !== undefined && group.section !== section) {
      section = group.section
      box.append(readOnlyLine(host, READ_ONLY_SECTION_ATTRIBUTE, section, `color:${PAINT.quiet};font-size:${fieldSizes().nameTextScale}em;`))
    }
    box.append(element)
  })
  return laid
}
