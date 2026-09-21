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
  STYLE,
  anchoredEntry,
  made,
} from './dom-screen-surface'
import type { TextEntryControl } from './field-editing'
import { CONTROL_KEYS, TYPED_CONTROLS } from './field-editing'

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
  color: 'input',
}

const CONTROL_INPUT_TYPE: Readonly<Record<PropertyControlKind, string | null>> = {
  text: null,
  multiline: null,
  date: 'date',
  number: 'number',
  boolean: 'checkbox',
  choice: null,
  // DEVIATION: spec says colours are chosen from the T-017 palette (FR-007); here the host picker takes any colour (DFC-566)
  color: 'color',
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
export function fieldElement(
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
  panel.replaceChildren(...drawn)
}
