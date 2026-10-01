// DomScreenSurface -- the Properties Panel fields, one control per input kind of table T-016.
// @unit      UF-106  (docs/spec/05-07-design.md, table T-075)
// @component DomScreenSurface, layer Framework (table T-062)
// @purity    non-pure

import type {
  PropertiesPanel,
  PropertyControl,
  PropertyControlKind,
  PropertyField,
} from '../../adapter/screen-renderer/screen-renderer'
import {
  HOST_ENTER,
  NOT_STORED_PROPERTY_FIELD_SIZES,
  PAINT,
  SCREEN_COLOURS,
  STYLE,
  anchoredEntry,
  commandEntry,
  made,
} from './dom-screen-surface'
import type { TextEntryControl } from './field-editing'
import { CONTROL_KEYS, CONTROL_PICKS, TYPED_CONTROLS } from './field-editing'

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
export function propertiesPanelStyle(): string {
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
    'display:flex;align-items:flex-start;justify-content:flex-end;flex:none;' +
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

// see FR-006, CV-9
/** @purity pure */
function propertyFieldNameAboveStyle(): string {
  return `color:${PAINT.quiet};flex:1 1 100%;text-align:left;font-size:${fieldSizes().nameTextScale}em;`
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

// WHY: `text` is a textarea as well: an input cannot wrap, and FR-006 wraps a long name downwards.
const CONTROL_TAG: Readonly<Record<PropertyControlKind, string>> = {
  text: 'textarea',
  multiline: 'textarea',
  date: 'input',
  number: 'input',
  boolean: 'input',
  choice: 'select',
  color: 'select',
}

const CONTROL_INPUT_TYPE: Readonly<Record<PropertyControlKind, string | null>> = {
  text: null,
  multiline: null,
  date: 'date',
  number: 'number',
  boolean: 'checkbox',
  choice: null,
  color: null,
}

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

// see FR-006
/** @purity non-pure */
export function growWrappingFields(panel: HTMLElement): void {
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
  const tag = CONTROL_TAG[control.kind]
  const drawn = host.createElement(tag)
  const isWrapping = IS_KIND_WRAPPING[control.kind]
  const style =
    control.kind === 'color'
      ? propertyColorStyle()
      : control.kind === 'boolean'
        ? propertyCheckStyle()
        : isWrapping
          ? propertyWrappingStyle()
          : propertyControlStyle(control.widthInFontSizes)
  drawn.setAttribute('style', style)
  if (isWrapping) {
    drawn.setAttribute(WRAPPING_FIELD_ATTRIBUTE, 'true')
    watchWrappingField(drawn, control.kind === 'text')
  }
  drawn.setAttribute('data-field-row', row)
  drawn.setAttribute('data-field-kind', control.kind)

  const inputType = CONTROL_INPUT_TYPE[control.kind]
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
  } else {
    if (control.kind === 'multiline') {
      drawn.setAttribute('rows', String(fieldSizes().multilineRows))
    }
    if (control.kind === 'text') drawn.setAttribute('rows', String(SINGLE_LINE_ROWS))
    if (control.kind === 'number') {
      if (control.min !== null) drawn.setAttribute('min', String(control.min))
      if (control.max !== null) drawn.setAttribute('max', String(control.max))
    }
    ;(drawn as HTMLInputElement).value = control.text
  }

  CONTROL_KEYS.set(drawn, { row, key: control.key })
  if (IS_KIND_TYPED_INTO[control.kind]) {
    TYPED_CONTROLS.add(drawn)
    holdTypedEntry(typedByRow, row, control, drawn)
  }
  return drawn as HTMLElement
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

type ColourField = NonNullable<PropertyControl['colour']>

type ColourName = NonNullable<ColourField['names']>[number]

type ColourSide = ColourField['light']

// TRAP: the light side only: S-336 and S-337 hold one colour for both themes, and a row that
// split them would need the theme passed down to this side.
/** @purity pure */
function checkerColour(row: 'S-336' | 'S-337'): string {
  return SCREEN_COLOURS[row]?.light ?? ''
}

// see T-294, CV-9
const TRANSPARENT_NAME = 'transparent'
const UNSET_COLOUR_VALUE = ''
// TRAP: change with NOT_DRAWN in svg-renderer.ts; a mismatch paints transparent as the ink colour.
const TRANSPARENT_PAINT = 'none'
const CHECKER_TILE_SPAN = 2
const SIDE_SWATCH_SIDE_EM = 0.75
const SWATCH_BORDER_PX = 1
const UNSET_SWATCH_BORDER = `border:${SWATCH_BORDER_PX}px dashed currentColor;`
const SET_SWATCH_BORDER = `border:${SWATCH_BORDER_PX}px solid transparent;`
const SIDE_SEPARATOR = ' / '
const SIDE_WORD_END = ': '
const VALUE_GAP = ' '
const COLOUR_CHOICE_ATTRIBUTE = 'data-colour-choice'
const HOST_CHANGE = 'change'
const HOST_CLICK = 'click'
const PRESSED_ATTRIBUTE = 'aria-pressed'
const PRESSED_VALUE = 'true'
const FIELD_ROW_ATTRIBUTE = 'data-field-row'

// see CV-9, S-335, S-336, S-337
/** @purity pure */
function checkerPattern(side: string): string {
  const tile = `calc(${side} * ${CHECKER_TILE_SPAN} / ${NOT_STORED_PROPERTY_FIELD_SIZES['S-335']})`
  return (
    `repeating-conic-gradient(${checkerColour('S-337')} 0 25%, ${checkerColour('S-336')} 0 50%)` +
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

/** @purity pure */
function sideSwatchSide(): string {
  return `${SIDE_SWATCH_SIDE_EM}em`
}

// see CV-9, CV-3
// WHY: a side is undefined when the adapter names its twin, or when an unset field carries no
// null mark (a description built without one); a null with its mark is painted (CV-9).
/** @purity pure */
function isSideUndefined(control: PropertyControl, side: ColourSide): boolean {
  if (side.mark !== undefined) return false
  return control.text === UNSET_COLOUR_VALUE || side.note !== ''
}

// see CV-9, T-294
/** @purity pure */
function paletteNamesOf(control: PropertyControl): readonly string[] {
  const words = control.choices ?? []
  const customWord = control.colour?.customWord
  return (control.choiceValues ?? []).filter(
    (value, at) => value !== UNSET_COLOUR_VALUE && words[at] !== customWord,
  )
}

// see CV-9
/** @purity pure */
function wordOfName(control: PropertyControl, name: string): string {
  const at = (control.choiceValues ?? []).indexOf(name)
  return at < 0 ? '' : (control.choices?.[at] ?? '')
}

/** @purity pure */
function sideValueText(control: PropertyControl, side: ColourSide): string {
  if (side.mark !== undefined) return side.mark
  if (isSideUndefined(control, side)) return ''
  if (paletteNamesOf(control).includes(control.text)) return wordOfName(control, control.text)
  if (side.paint === TRANSPARENT_PAINT) return wordOfName(control, TRANSPARENT_NAME)
  return (side.value ?? side.paint).toUpperCase()
}

/** @purity pure */
function sideSwatchStyle(control: PropertyControl, side: ColourSide): string {
  const box = swatchBox(sideSwatchSide())
  if (isSideUndefined(control, side)) return box + UNSET_SWATCH_BORDER
  return box + swatchPaint(side.paint, sideSwatchSide()) + SET_SWATCH_BORDER
}

// WHY: one side kept on one line; the two sides may break onto two lines (CV-9, FR-006).
/** @purity non-pure */
function sideElement(host: Document, control: PropertyControl, side: ColourSide, tail: string): HTMLElement {
  const group = made(host, 'span', 'white-space:nowrap;')
  const word = made(host, 'span', '')
  word.textContent = `${side.word}${SIDE_WORD_END}`
  const mark = made(host, 'span', sideSwatchStyle(control, side))
  mark.setAttribute('data-colour-swatch', side.paint)
  const value = made(host, 'span', '')
  value.textContent = `${VALUE_GAP}${sideValueText(control, side)}${side.note}${tail}`
  group.append(word, mark, value)
  return group
}

// see CV-9
/** @purity non-pure */
function colourSidesElement(host: Document, control: PropertyControl, colour: ColourField): HTMLElement {
  const readout = made(host, 'span', 'flex:1 1 100%;display:flex;flex-wrap:wrap;align-items:center;')
  readout.setAttribute('data-colour-sides', 'true')
  readout.append(
    sideElement(host, control, colour.light, SIDE_SEPARATOR),
    sideElement(host, control, colour.dark, ''),
  )
  return readout
}

// WHY: the one field whose host colour input stands; only a press on the custom entrance opens it.
const openCustomColour: { identity: string | null } = { identity: null }

/** @purity pure */
function colourFieldIdentity(row: string, control: PropertyControl): string {
  return `${row}|${JSON.stringify(control.key)}`
}

// see CV-9, CV-4
// WHY: the custom entrance commits one #rrggbb; the translator writes it to the side being drawn.
/** @purity non-pure */
function hostColourInput(host: Document, row: string, control: PropertyControl, colour: ColourField): HTMLElement {
  const custom = made(host, 'input', propertyColorStyle())
  custom.setAttribute('type', 'color')
  custom.setAttribute('title', colour.customWord)
  custom.setAttribute('aria-label', colour.customWord)
  custom.setAttribute('data-field-row', row)
  custom.setAttribute('data-colour-custom', 'true')
  if (colour.customValue !== '') (custom as HTMLInputElement).value = colour.customValue
  CONTROL_KEYS.set(custom, { row, key: control.key })
  letGoOnChange(custom)
  return custom
}

// WHY: the host input keeps the focus after its change; held, it stops the readout's redraw (CV-9).
/** @purity non-pure */
function letGoOnChange(entry: HTMLElement): void {
  if (typeof entry.addEventListener !== 'function') return
  entry.addEventListener(HOST_CHANGE, () => {
    if (typeof entry.blur === 'function') entry.blur()
  })
}

// see CV-9, IF-9
// WHY: a press reaches the panel's change listener as a choice from the list did, then lets the
// focus go, which would otherwise hold the panel and leave the readout stale.
/** @purity non-pure */
function commitOnPress(entry: HTMLElement): void {
  if (typeof entry.addEventListener !== 'function') return
  entry.addEventListener(HOST_CLICK, () => {
    openCustomColour.identity = null
    if (typeof entry.dispatchEvent === 'function') {
      entry.dispatchEvent(new Event(HOST_CHANGE, { bubbles: true }))
    }
    if (typeof entry.blur === 'function') entry.blur()
  })
}

// see CV-9, T-294
/** @purity non-pure */
function colourChoiceElement(host: Document, row: string, control: PropertyControl, name: string): HTMLElement {
  const at = (control.choiceValues ?? []).indexOf(name)
  if (at < 0) return made(host, 'span', swatchBox(choiceSide()))
  const paint = (control.colour?.swatches ?? control.swatches)?.[at] ?? ''
  const word = control.choices?.[at] ?? name
  const style = swatchBox(choiceSide()) + swatchPaint(paint, choiceSide()) + choiceSwatchBorder()
  const choice = made(host, 'button', style)
  choice.setAttribute('type', 'button')
  choice.setAttribute('value', name)
  ;(choice as HTMLButtonElement).value = name
  choice.setAttribute(COLOUR_CHOICE_ATTRIBUTE, name)
  choice.setAttribute(FIELD_ROW_ATTRIBUTE, row)
  choice.setAttribute('title', word)
  choice.setAttribute('aria-label', word)
  if (control.text === name) choice.setAttribute(PRESSED_ATTRIBUTE, PRESSED_VALUE)
  CONTROL_KEYS.set(choice, { row, key: control.key })
  commitOnPress(choice)
  return choice
}

// see CV-9, T-294
/** @purity pure */
function paletteOrderOf(control: PropertyControl, colour: ColourField): readonly ColourName[] {
  return colour.names ?? paletteNamesOf(control).map((name) => ({ name, isOffered: true }))
}

/** @purity pure */
function transparentOf(control: PropertyControl, colour: ColourField): ColourName {
  const listed = paletteOrderOf(control, colour).find((one) => one.name === TRANSPARENT_NAME)
  return listed ?? { name: TRANSPARENT_NAME, isOffered: false }
}

// see CV-9
// WHY: an unoffered name keeps its place as an empty slot, so a colour stays where it is learnt.
/** @purity non-pure */
function colourSlotElement(host: Document, row: string, control: PropertyControl, one: ColourName): HTMLElement {
  if (!one.isOffered) return made(host, 'span', swatchBox(choiceSide()))
  return colourChoiceElement(host, row, control, one.name)
}

// see CV-9, S-338, S-368
/** @purity pure */
function colourGridStyle(perLine: number): string {
  return (
    `display:grid;grid-template-columns:repeat(${perLine},max-content);` +
    `gap:${fieldSizes().rowGap}px;`
  )
}

/** @purity pure */
function colourLastLineStyle(): string {
  return `display:flex;align-items:center;gap:${fieldSizes().rowGap}px;margin-top:${fieldSizes().rowGap}px;`
}

/** @purity non-pure */
function customEntryElement(
  host: Document,
  row: string,
  control: PropertyControl,
  colour: ColourField,
  slot: HTMLElement,
): HTMLElement {
  const entry = made(host, 'button', `font:inherit;flex:none;min-height:${choiceSide()};`)
  entry.setAttribute('type', 'button')
  entry.setAttribute('data-colour-custom-entry', 'true')
  entry.textContent = colour.customWord
  if (typeof entry.addEventListener !== 'function') return entry
  entry.addEventListener(HOST_CLICK, () => {
    openCustomColour.identity = colourFieldIdentity(row, control)
    slot.replaceChildren(hostColourInput(host, row, control, colour))
    if (typeof entry.blur === 'function') entry.blur()
  })
  return entry
}

// see CV-9, CV-5, FR-007
/** @purity non-pure */
function themeEntryElement(host: Document, row: string, control: PropertyControl, colour: ColourField): HTMLElement {
  const entry = made(host, 'button', `font:inherit;flex:none;min-height:${choiceSide()};`)
  const hint = colour.theme?.hint ?? ''
  entry.setAttribute('type', 'button')
  entry.setAttribute('value', UNSET_COLOUR_VALUE)
  ;(entry as HTMLButtonElement).value = UNSET_COLOUR_VALUE
  entry.setAttribute('data-colour-theme-entry', 'true')
  entry.setAttribute(FIELD_ROW_ATTRIBUTE, row)
  entry.setAttribute('title', hint)
  entry.setAttribute('aria-label', hint)
  if (control.text === UNSET_COLOUR_VALUE) entry.setAttribute(PRESSED_ATTRIBUTE, PRESSED_VALUE)
  const paint = colour.theme?.paint
  if (paint !== undefined) {
    entry.append(made(host, 'span', swatchBox(sideSwatchSide()) + swatchPaint(paint, sideSwatchSide()) + SET_SWATCH_BORDER))
  }
  entry.append(wordSpan(host, `${paint === undefined ? '' : VALUE_GAP}${colour.theme?.word ?? ''}`))
  CONTROL_KEYS.set(entry, { row, key: control.key })
  commitOnPress(entry)
  return entry
}

/** @purity non-pure */
function wordSpan(host: Document, text: string): HTMLElement {
  const word = made(host, 'span', '')
  word.textContent = text
  return word
}

// see CV-9
// WHY: an entrance with its word (no fill / no line); a field that refuses transparent keeps the slot empty.
/** @purity non-pure */
function transparentEntryElement(host: Document, row: string, control: PropertyControl, colour: ColourField): HTMLElement {
  const style = `font:inherit;flex:none;min-height:${choiceSide()};`
  const word = colour.transparentWord
  if (word === undefined || !transparentOf(control, colour).isOffered) {
    const slot = made(host, 'span', style + 'visibility:hidden;')
    slot.setAttribute('data-colour-transparent-slot', 'true')
    return slot
  }
  const entry = made(host, 'button', style)
  entry.setAttribute('type', 'button')
  entry.setAttribute('value', TRANSPARENT_NAME)
  ;(entry as HTMLButtonElement).value = TRANSPARENT_NAME
  entry.setAttribute(COLOUR_CHOICE_ATTRIBUTE, TRANSPARENT_NAME)
  entry.setAttribute(FIELD_ROW_ATTRIBUTE, row)
  entry.setAttribute('aria-label', word)
  if (control.text === TRANSPARENT_NAME) entry.setAttribute(PRESSED_ATTRIBUTE, PRESSED_VALUE)
  entry.append(
    made(host, 'span', swatchBox(sideSwatchSide()) + swatchPaint(TRANSPARENT_PAINT, sideSwatchSide()) + SET_SWATCH_BORDER),
    wordSpan(host, `${VALUE_GAP}${word}`),
  )
  CONTROL_KEYS.set(entry, { row, key: control.key })
  commitOnPress(entry)
  return entry
}

// WHY: MK-13 focuses a colour field (JDG-410), which takes no text: the value's swatch, else the first.
/** @purity non-pure */
function holdColourFocusTarget(
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
function colourFieldElements(
  host: Document,
  row: string,
  control: PropertyControl,
  focusByRow: Map<string, TextEntryControl> | null,
): readonly HTMLElement[] {
  const colour = control.colour
  if (colour === undefined) return []
  const grid = made(host, 'div', colourGridStyle(NOT_STORED_PROPERTY_FIELD_SIZES['S-338']))
  const named = paletteOrderOf(control, colour).filter((one) => one.name !== TRANSPARENT_NAME)
  const slots = named.map((one) => colourSlotElement(host, row, control, one))
  grid.append(...slots)
  const slot = made(host, 'span', '')
  if (openCustomColour.identity === colourFieldIdentity(row, control)) {
    slot.append(hostColourInput(host, row, control, colour))
  }
  const lastLine = made(host, 'div', colourLastLineStyle())
  const transparent = transparentEntryElement(host, row, control, colour)
  const theme = themeEntryElement(host, row, control, colour)
  lastLine.append(transparent, customEntryElement(host, row, control, colour, slot), slot)
  holdColourFocusTarget(focusByRow, row, [...slots, transparent, theme])
  const themeLine = made(host, 'div', colourLastLineStyle())
  themeLine.append(theme)
  const palette = made(host, 'div', 'flex:1 1 100%;')
  palette.setAttribute('data-colour-palette', row)
  palette.setAttribute('data-field-kind', control.kind)
  palette.append(themeLine, grid, lastLine)
  return [colourSidesElement(host, control, colour), palette]
}

// see FR-041, S-368
/** @purity non-pure */
function swatchFieldElements(
  host: Document,
  field: PropertyField,
  control: PropertyControl,
  focusByRow: Map<string, TextEntryControl> | null,
): readonly HTMLElement[] {
  const grid = made(host, 'div', colourGridStyle(NOT_STORED_PROPERTY_FIELD_SIZES['S-368']))
  const slots = (control.choiceValues ?? []).map((value) => colourChoiceElement(host, field.row, control, value))
  grid.append(...slots)
  holdColourFocusTarget(focusByRow, field.row, slots)
  const palette = made(host, 'div', 'flex:1 1 100%;')
  palette.setAttribute('data-colour-palette', field.row)
  palette.setAttribute('data-field-kind', control.kind)
  palette.append(grid)
  const shown = made(host, 'span', 'flex:1 1 100%;')
  shown.textContent = field.text
  return [palette, shown]
}

// WHY: a field no longer described closes its host colour input, so it stands only after a press.
/** @purity non-pure */
function forgetClosedCustomColour(description: PropertiesPanel): void {
  const standing = description.fields.flatMap((field) =>
    field.controls.map((control) => colourFieldIdentity(field.row, control)),
  )
  if (openCustomColour.identity !== null && !standing.includes(openCustomColour.identity)) {
    openCustomColour.identity = null
  }
}

// see AS-5, IC-123, IC-124
/** @purity pure */
function comboListStyle(isShown: boolean): string {
  return (
    `flex:1 1 100%;display:${isShown ? 'flex' : 'none'};flex-direction:column;border:1px solid ${PAINT.rule};` +
    `background:${PAINT.ground};color:${PAINT.ink};`
  )
}

const COMBO_ITEM_ATTRIBUTE = 'data-combo-item'
const COMBO_HIGHLIGHT_ATTRIBUTE = 'aria-selected'
const HOST_ARROW_DOWN = 'ArrowDown'
const HOST_ARROW_UP = 'ArrowUp'
const NO_HIGHLIGHT = -1

interface ComboState {
  isDescending: boolean
  highlighted: number
}

/** @purity non-pure */
function comboInputOf(
  host: Document,
  row: string,
  control: PropertyControl,
  combo: NonNullable<PropertyControl['assignee']>,
  typedByRow: Map<string, TextEntryControl> | null,
): HTMLElement {
  const box = made(host, 'input', propertyControlStyle(control.widthInFontSizes))
  box.setAttribute('type', 'text')
  box.setAttribute('data-field-row', row)
  box.setAttribute('data-field-kind', control.kind)
  box.setAttribute('data-field-combo', 'true')
  const seated = combo.people.find((one) => String(one.uid) === control.text)
  ;(box as HTMLInputElement).value = seated?.name ?? ''
  CONTROL_KEYS.set(box, { row, key: control.key })
  TYPED_CONTROLS.add(box)
  holdTypedEntry(typedByRow, row, control, box)
  return box
}

// WHY: preventDefault keeps the focus in the combo, and stopPropagation keeps the press from the
// host's settle-on-press-outside, which would commit the typed text first.
/** @purity non-pure */
function onPressHeld(element: HTMLElement, act: () => void): void {
  element.addEventListener('pointerdown', (event: Event) => {
    event.preventDefault()
    event.stopPropagation()
    act()
  })
}

/** @purity non-pure */
function pickComboItem(box: HTMLElement, item: HTMLElement): void {
  ;(box as HTMLInputElement).value = item.getAttribute('value') ?? ''
  CONTROL_PICKS.set(box, item.getAttribute(COMBO_ITEM_ATTRIBUTE) === 'add' ? 'add' : 'candidate')
  if (typeof box.dispatchEvent === 'function') box.dispatchEvent(new Event('change', { bubbles: true }))
  if (typeof box.blur === 'function') box.blur()
}

// see AS-5, IC-123, IC-124
/** @purity non-pure */
function drawComboList(
  host: Document,
  list: HTMLElement,
  box: HTMLElement,
  combo: NonNullable<PropertyControl['assignee']>,
  state: ComboState,
): void {
  state.highlighted = NO_HIGHLIGHT
  const sorts = combo.sortEntries.map((item, at) => {
    const entry = commandEntry(host, { ...item, isPressed: (at === 1) === state.isDescending })
    onPressHeld(entry, () => {
      state.isDescending = at === 1
      drawComboList(host, list, box, combo, state)
    })
    return entry
  })
  const head = made(host, 'div', 'display:flex;justify-content:flex-end;')
  head.append(...sorts)
  const shown = combo.candidatesOf((box as HTMLInputElement).value, state.isDescending).map((one) => {
    const item = made(host, 'div', 'cursor:default;padding:0 0.25em;')
    item.setAttribute(COMBO_ITEM_ATTRIBUTE, one.pick)
    item.setAttribute('value', one.value)
    item.textContent = one.word
    onPressHeld(item, () => pickComboItem(box, item))
    return item
  })
  list.replaceChildren(head, ...shown)
}

/** @purity non-pure */
function onComboKey(event: Event, list: HTMLElement, box: HTMLElement, state: ComboState): void {
  const key = event as Partial<KeyboardEvent>
  const all: readonly HTMLElement[] = Array.from(list.querySelectorAll(`[${COMBO_ITEM_ATTRIBUTE}]`))
  if (key.key === HOST_ARROW_DOWN || key.key === HOST_ARROW_UP) {
    event.preventDefault()
    if (all.length === 0) return
    const step = key.key === HOST_ARROW_DOWN ? 1 : -1
    const was = state.highlighted
    state.highlighted = was === NO_HIGHLIGHT ? (step > 0 ? 0 : all.length - 1) : (was + step + all.length) % all.length
    all.forEach((one, at) => one.setAttribute(COMBO_HIGHLIGHT_ATTRIBUTE, String(at === state.highlighted)))
    return
  }
  const chosen = all[state.highlighted]
  if (key.key !== HOST_ENTER || key.isComposing === true || chosen === undefined) return
  event.preventDefault()
  event.stopPropagation()
  pickComboItem(box, chosen)
}

// see AS-5, AS-6, AS-7, SV-4
// WHY: a pick commits through the panel's change listener with CONTROL_PICKS naming how it was
// settled; an Enter with nothing highlighted bubbles on to the panel's own commit.
/** @purity non-pure */
function assigneeComboElements(
  host: Document,
  row: string,
  control: PropertyControl,
  combo: NonNullable<PropertyControl['assignee']>,
  typedByRow: Map<string, TextEntryControl> | null,
): readonly HTMLElement[] {
  const box = comboInputOf(host, row, control, combo, typedByRow)
  const list = made(host, 'div', comboListStyle(false))
  list.setAttribute('data-combo-list', row)
  if (typeof box.addEventListener !== 'function') return [box, list]
  const state: ComboState = { isDescending: false, highlighted: NO_HIGHLIGHT }
  box.addEventListener('focus', () => {
    list.setAttribute('style', comboListStyle(true))
    drawComboList(host, list, box, combo, state)
  })
  box.addEventListener('blur', () => list.setAttribute('style', comboListStyle(false)))
  box.addEventListener('input', () => drawComboList(host, list, box, combo, state))
  box.addEventListener('keydown', (event: Event) => onComboKey(event, list, box, state))
  return [box, list]
}

const READOUT_ATTRIBUTE = 'data-field-readout'

const READOUT_MEMBER: keyof PropertyField = 'readout'

// see MH-5
/** @purity pure */
function readoutRuleStyle(): string {
  const width = NOT_STORED_PROPERTY_FIELD_SIZES['S-440']
  const gap = NOT_STORED_PROPERTY_FIELD_SIZES['S-441']
  return `flex:none;align-self:stretch;width:${width}px;margin:0 ${gap}px;background:${PAINT.rule};`
}

// see MH-1, MH-3, MH-5
/** @purity non-pure */
function readoutElement(host: Document, field: PropertyField, readout: string): HTMLElement {
  const beside = made(host, 'span', 'display:flex;align-items:center;flex:none;white-space:nowrap;')
  const unit = made(host, 'span', '')
  unit.textContent = field.unit ?? ''
  const current = made(host, 'span', '')
  current.setAttribute(READOUT_ATTRIBUTE, field.row)
  current.textContent = readout
  beside.append(unit, made(host, 'span', readoutRuleStyle()), current)
  return beside
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

// see T-016, T-058, T-104
/** @purity non-pure */
export function fieldElement(
  host: Document,
  field: PropertyField,
  typedByRow: Map<string, TextEntryControl> | null,
): HTMLElement {
  const line = made(host, 'div', propertyFieldStyle() + (field.isNameAbove === true ? 'flex-wrap:wrap;' : ''))
  line.setAttribute('data-field-row', field.row)
  line.setAttribute('data-editable', String(field.isEditable))
  const name = made(host, 'span', field.isNameAbove === true ? propertyFieldNameAboveStyle() : propertyFieldNameStyle())
  name.textContent = field.name

  if (field.controls.length === 0) {
    // WHY: pre-line, so a read-only row of one line per dependency shows its lines (PR-37, PR-38).
    const value = made(host, 'span', 'white-space:pre-line;')
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
    if (control.colour !== undefined) {
      controls.append(...colourFieldElements(host, field.row, control, typedByRow))
      continue
    }
    if (control.swatches !== undefined) {
      controls.append(...swatchFieldElements(host, field, control, typedByRow))
      continue
    }
    if (control.assignee !== undefined) {
      controls.append(...assigneeComboElements(host, field.row, control, control.assignee, typedByRow))
      continue
    }
    const drawn = controlElement(host, field.row, control, typedByRow)
    if (control.placeholder !== undefined) drawn.setAttribute('placeholder', control.placeholder)
    controls.append(drawn)
  }
  if (field.readout !== undefined) controls.append(readoutElement(host, field, field.readout))
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
  forgetClosedCustomColour(description)
  const drawn = description.fields.map((field) => fieldElement(host, field, typedByRow))
  const entries = description.commands.map((item) => anchoredEntry(host, item, anchors))
  if (entries.length > 0) {
    const wayOut = made(host, 'div', propertyWayOutStyle())
    wayOut.append(...entries)
    // TRAP: the way-out shares the first field's line; it overlaps no field only because the
    // wrapping fields keep no min-width and the way-out does not shrink (FR-006, IC-52).
    const first = drawn[0]
    if (first === undefined) drawn.push(wayOut)
    else first.append(wayOut)
  }
  const head = description.headEntry === undefined ? [] : [headEntryElement(host, description.headEntry, anchors)]
  panel.replaceChildren(...head, ...drawn)
}
