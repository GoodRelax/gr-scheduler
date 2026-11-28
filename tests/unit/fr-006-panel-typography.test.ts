// Unit tests: the Properties Panel's text size, the smaller size of its item names, and where those names sit.

import { describe, expect, it } from 'vitest'

import type {
  AppHeaderItems,
  PropertiesPanel,
  PropertyControl,
  PropertyField,
  ScreenFrame,
  ScreenSurface,
  ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'
import {
  domScreenSurface,
  type ScreenSurfaceWiring,
  type ScreenTheme,
} from '../../src/framework/dom-screen-surface/dom-screen-surface'
// Why: borrowed from the contract kind, as it reads table T-206 from the .md at run time, so a moved ratio moves here too.
import { bare, specTable } from '../contract/spec-table'
import { emptyScreenSession } from '../../src/use-case/advance-screen-session/advance-screen-session'

const T_206 = specTable('T-206')

const VALUE_COLUMN = '既定'

if (!T_206.headings.includes(VALUE_COLUMN)) {
  throw new Error(`table T-206 no longer has a ${VALUE_COLUMN} column: ${T_206.headings.join(' | ')}`)
}

function cellOf(id: string): string {
  const row = T_206.rows.find((one) => one.id === id)
  if (row === undefined) throw new Error(`table T-206 no longer has row ${id}`)
  return bare(row.by[VALUE_COLUMN] ?? '')
}

// Why: a cell carries a mark beside its number, so the number is read out of the cell rather than the cell parsed whole.
function numberOf(id: string): number {
  const written = cellOf(id)
  const found = /-?\d+(?:\.\d+)?/.exec(written)
  if (found === null) throw new Error(`table T-206's ${id} states no number: ${written}`)
  return Number.parseFloat(found[0] as string)
}

const S_197 = numberOf('S-197')

const S_198 = numberOf('S-198')

const S_189 = numberOf('S-189')

const S_189_CELL = cellOf('S-189')

// Spec: S-121, S-122, S-123
const T_215 = specTable('T-215')
const FONT_SIZE_STEP_SIZES = ['S-121', 'S-122', 'S-123'].map((id) => {
  const row = T_215.rows.find((one) => one.id === id)
  if (row === undefined) throw new Error(`table T-215 no longer has row ${id}`)
  return Number.parseFloat(bare(row.by['値'] ?? ''))
})

// Spec: U-25
const U_25 = ((): string => {
  const row = specTable('T-103').rows.find((one) => one.id === 'U-25')
  if (row === undefined) throw new Error('table T-103 no longer has row U-25')
  return bare(row.by['確定名（英）'] ?? '')
})()

interface FakeEvent {
  readonly type: string
  target: FakeElement | null
  currentTarget: FakeElement | null
  defaultPrevented: boolean
}

interface Registration {
  readonly node: FakeElement
  readonly type: string
  readonly listener: (event: FakeEvent) => void
}

type StyleWrite =
  | { readonly kind: 'reset'; readonly css: string }
  | { readonly kind: 'set'; readonly property: string; readonly value: string }

class FakeText {
  parentNode: FakeElement | null = null
  constructor(public data: string) {}
}

type FakeNode = FakeElement | FakeText

class FakeElement {
  readonly tagName: string
  readonly attributes = new Map<string, string>()
  readonly childNodes: FakeNode[] = []
  readonly styleWrites: StyleWrite[] = []
  parentNode: FakeElement | null = null
  value = ''
  isMount = false

  constructor(
    tagName: string,
    private readonly world: World,
  ) {
    this.tagName = tagName.toUpperCase()
  }

  setAttribute(name: string, value: string): void {
    if (name === 'style') {
      this.styleWrites.push({ kind: 'reset', css: value })
      return
    }
    this.attributes.set(name, String(value))
  }

  getAttribute(name: string): string | null {
    if (name === 'style') return inlineStyle(this)
    return this.attributes.get(name) ?? null
  }

  hasAttribute(name: string): boolean {
    if (name === 'style') return this.styleWrites.length > 0
    return this.attributes.has(name)
  }

  removeAttribute(name: string): void {
    this.attributes.delete(name)
  }

  get dataset(): Record<string, string> {
    const element = this
    return new Proxy(
      {},
      {
        get(_target, property): string | undefined {
          if (typeof property !== 'string') return undefined
          return element.attributes.get(`data-${kebab(property)}`)
        },
        set(_target, property, value): boolean {
          if (typeof property === 'string') {
            element.attributes.set(`data-${kebab(property)}`, String(value))
          }
          return true
        },
      },
    ) as Record<string, string>
  }

  get id(): string {
    return this.attributes.get('id') ?? ''
  }

  set id(value: string) {
    this.attributes.set('id', value)
  }

  get className(): string {
    return this.attributes.get('class') ?? ''
  }

  set className(value: string) {
    this.attributes.set('class', value)
  }

  get classList(): {
    add: (...names: string[]) => void
    remove: (...names: string[]) => void
    contains: (name: string) => boolean
    toggle: (name: string, force?: boolean) => void
  } {
    const element = this
    const names = (): Set<string> =>
      new Set(element.className.split(/\s+/).filter((one) => one.length > 0))
    const write = (set: Set<string>): void => {
      element.className = [...set].join(' ')
    }
    return {
      add: (...added) => {
        const set = names()
        for (const one of added) set.add(one)
        write(set)
      },
      remove: (...removed) => {
        const set = names()
        for (const one of removed) set.delete(one)
        write(set)
      },
      contains: (name) => names().has(name),
      toggle: (name, force) => {
        const set = names()
        const on = force ?? !set.has(name)
        if (on) set.add(name)
        else set.delete(name)
        write(set)
      },
    }
  }

  // Why: an innerHTML assignment would be markup (FR-023), so it is recorded and never obeyed.
  get innerHTML(): string {
    this.world.markupWrites.push({ node: this, value: '(read)' })
    return ''
  }

  set innerHTML(value: string) {
    this.world.markupWrites.push({ node: this, value })
  }

  get style(): Record<string, string> {
    const element = this
    return new Proxy(
      {},
      {
        get(_target, property): unknown {
          if (property === 'setProperty') {
            return (name: string, value: string): void => {
              element.styleWrites.push({ kind: 'set', property: name, value })
            }
          }
          if (typeof property !== 'string') return undefined
          return styleMap(element).get(kebab(property)) ?? ''
        },
        set(_target, property, value): boolean {
          if (typeof property !== 'string') return true
          if (property === 'cssText') {
            element.styleWrites.push({ kind: 'reset', css: String(value) })
            return true
          }
          element.styleWrites.push({ kind: 'set', property: kebab(property), value: String(value) })
          return true
        },
      },
    ) as Record<string, string>
  }

  get disabled(): boolean {
    return this.attributes.has('disabled')
  }

  set disabled(value: boolean) {
    if (value) this.attributes.set('disabled', '')
    else this.attributes.delete('disabled')
  }

  private adopt(node: FakeNode | string): FakeNode {
    if (typeof node === 'string') return new FakeText(node)
    node.parentNode?.detach(node)
    return node
  }

  private detach(node: FakeNode): void {
    const at = this.childNodes.indexOf(node)
    if (at >= 0) this.childNodes.splice(at, 1)
    node.parentNode = null
  }

  append(...nodes: (FakeNode | string)[]): void {
    for (const one of nodes) {
      const node = this.adopt(one)
      node.parentNode = this
      this.childNodes.push(node)
    }
  }

  appendChild(node: FakeNode): FakeNode {
    this.append(node)
    return node
  }

  replaceChildren(...nodes: (FakeNode | string)[]): void {
    for (const one of [...this.childNodes]) this.detach(one)
    this.append(...nodes)
  }

  removeChild(node: FakeNode): FakeNode {
    this.detach(node)
    return node
  }

  insertBefore(node: FakeNode, reference: FakeNode | null): FakeNode {
    const adopted = this.adopt(node)
    const at = reference === null ? this.childNodes.length : this.childNodes.indexOf(reference)
    this.childNodes.splice(at < 0 ? this.childNodes.length : at, 0, adopted)
    adopted.parentNode = this
    return adopted
  }

  remove(): void {
    this.parentNode?.detach(this)
  }

  get children(): FakeElement[] {
    return this.childNodes.filter((one): one is FakeElement => one instanceof FakeElement)
  }

  get firstChild(): FakeNode | null {
    return this.childNodes[0] ?? null
  }

  get lastChild(): FakeNode | null {
    return this.childNodes[this.childNodes.length - 1] ?? null
  }

  get textContent(): string {
    return this.childNodes
      .map((one) => (one instanceof FakeText ? one.data : one.textContent))
      .join('')
  }

  set textContent(value: string) {
    for (const one of [...this.childNodes]) this.detach(one)
    if (value !== '') this.append(new FakeText(value))
  }

  get isConnected(): boolean {
    let at: FakeElement | null = this
    while (at !== null) {
      if (at.isMount) return true
      at = at.parentNode
    }
    return false
  }

  contains(node: FakeElement): boolean {
    let at: FakeElement | null = node
    while (at !== null) {
      if (at === this) return true
      at = at.parentNode
    }
    return false
  }

  closest(selector: string): FakeElement | null {
    let at: FakeElement | null = this
    while (at !== null) {
      if (matches(at, selector)) return at
      at = at.parentNode
    }
    return null
  }

  querySelector(selector: string): FakeElement | null {
    this.world.selectors.push(selector)
    return descendants(this).find((one) => matches(one, selector)) ?? null
  }

  querySelectorAll(selector: string): FakeElement[] {
    this.world.selectors.push(selector)
    return descendants(this).filter((one) => matches(one, selector))
  }

  getBoundingClientRect(): {
    x: number
    y: number
    width: number
    height: number
    top: number
    left: number
    right: number
    bottom: number
  } {
    this.world.measured.push(this)
    const role = this.attributes.get('data-role') ?? ''
    const height = this.world.heightsByRole.get(role) ?? 0
    const width = this.world.widthsByRole.get(role) ?? 0
    return { x: 0, y: 0, width, height, top: 0, left: 0, right: width, bottom: height }
  }

  focus(): void {
    this.world.activeElement = this
  }

  blur(): void {
    if (this.world.activeElement === this) this.world.activeElement = null
  }

  addEventListener(type: string, listener: (event: FakeEvent) => void): void {
    this.world.registrations.push({ node: this, type, listener })
  }

  removeEventListener(type: string, listener: (event: FakeEvent) => void): void {
    const at = this.world.registrations.findIndex(
      (one) => one.node === this && one.type === type && one.listener === listener,
    )
    if (at >= 0) this.world.registrations.splice(at, 1)
  }
}

interface World {
  readonly created: FakeElement[]
  readonly registrations: Registration[]
  readonly measured: FakeElement[]
  readonly selectors: string[]
  readonly markupWrites: { node: FakeElement; value: string }[]
  readonly hostMembers: string[]
  readonly heightsByRole: Map<string, number>
  readonly widthsByRole: Map<string, number>
  activeElement: FakeElement | null
}

interface Stage {
  readonly world: World
  readonly host: Document
  readonly mount: FakeElement
  readonly reportedHeights: number[]
  clockMs: number
  author: string
  surface: ScreenSurface | undefined
  root(): FakeElement
}

function stage(heightsByRole: Record<string, number> = {}): Stage {
  const world: World = {
    created: [],
    registrations: [],
    measured: [],
    selectors: [],
    markupWrites: [],
    hostMembers: [],
    heightsByRole: new Map(Object.entries(heightsByRole)),
    widthsByRole: new Map(),
    activeElement: null,
  }

  const document = {
    createElement(tagName: string): FakeElement {
      const made = new FakeElement(tagName, world)
      world.created.push(made)
      return made
    },
  }
  const host = new Proxy(document, {
    get(target, property, receiver): unknown {
      if (typeof property === 'string') world.hostMembers.push(property)
      return Reflect.get(target, property, receiver)
    },
  }) as unknown as Document

  const mount = new FakeElement('div', world)
  mount.isMount = true

  return {
    world,
    host,
    mount,
    reportedHeights: [],
    clockMs: Date.UTC(2026, 7, 27, 3, 4, 5),
    author: 'Watcher',
    surface: undefined,
    root(): FakeElement {
      const first = mount.children[0]
      if (first === undefined) throw new Error('the unit mounted nothing')
      return first
    },
  }
}

// Why: no case reads a color back; readTheme is a required member of ScreenSurfaceWiring,
// so the cases need a theme to build the surface at all, not a particular one.
const S_73 = specTable('T-216').rows.find((row) => row.id === 'S-73')
if (S_73 === undefined) throw new Error('table T-216 no longer has row S-73')
const THEME: ScreenTheme = {
  preference: emptyScreenSession.screen.themePreference,
  hue: Number(bare(S_73.by['既定'] ?? '')),
}

function wiringOf(built: Stage): ScreenSurfaceWiring {
  return {
    host: built.host,
    mount: built.mount as unknown as Element,
    readClockMs: (): number => built.clockMs,
    onAppHeaderHeightMeasured: (heightPx: number): void => {
      built.reportedHeights.push(heightPx)
    },
    readTheme: (): ScreenTheme => THEME,
  }
}

function wire(heightsByRole: Record<string, number> = {}): Stage {
  const built = stage(heightsByRole)
  built.surface = domScreenSurface(wiringOf(built))
  return built
}

function surfaceOf(built: Stage): ScreenSurface {
  if (built.surface === undefined) throw new Error('the surface was not built')
  return built.surface
}

const kebab = (name: string): string => name.replace(/[A-Z]/g, (one) => `-${one.toLowerCase()}`)

function styleMap(element: FakeElement): Map<string, string> {
  const held = new Map<string, string>()
  for (const write of element.styleWrites) {
    if (write.kind === 'reset') {
      held.clear()
      for (const one of write.css.split(';')) {
        const at = one.indexOf(':')
        if (at < 0) continue
        held.set(one.slice(0, at).trim().toLowerCase(), one.slice(at + 1).trim())
      }
      continue
    }
    held.set(write.property.toLowerCase(), write.value)
  }
  return held
}

function inlineStyle(element: FakeElement): string {
  return [...styleMap(element)].map(([property, value]) => `${property}:${value}`).join(';')
}

const styleOf = (element: FakeElement): string =>
  inlineStyle(element).replace(/\s+/g, '').toLowerCase()

function descendants(element: FakeElement): FakeElement[] {
  const found: FakeElement[] = []
  for (const child of element.children) {
    found.push(child, ...descendants(child))
  }
  return found
}

const selfAndDescendants = (element: FakeElement): FakeElement[] => [
  element,
  ...descendants(element),
]

const byRole = (root: FakeElement, role: string): FakeElement[] =>
  selfAndDescendants(root).filter((one) => one.getAttribute('data-role') === role)

function oneByRole(root: FakeElement, role: string): FakeElement {
  const found = byRole(root, role)
  if (found.length !== 1) {
    throw new Error(`expected exactly one [data-role="${role}"], found ${found.length}`)
  }
  const first = found[0]
  if (first === undefined) throw new Error('unreachable')
  return first
}

// Why: a tiny selector engine exists so that a unit which did query is not failed for it.
function matches(element: FakeElement, selector: string): boolean {
  const parts = selector.trim().split(/\s+(?![^[]*\])/)
  const last = parts[parts.length - 1]
  if (last === undefined) return false
  if (!matchesSimple(element, last)) return false
  let at = element.parentNode
  for (let index = parts.length - 2; index >= 0; index -= 1) {
    const want = parts[index]
    if (want === undefined) continue
    let found = false
    while (at !== null) {
      if (matchesSimple(at, want)) {
        found = true
        at = at.parentNode
        break
      }
      at = at.parentNode
    }
    if (!found) return false
  }
  return true
}

function matchesSimple(element: FakeElement, selector: string): boolean {
  const attribute = /^\[([^\]=]+)(?:=(?:"([^"]*)"|'([^']*)'|([^\]]*)))?\]$/.exec(selector)
  if (attribute !== null) {
    const name = attribute[1] ?? ''
    const wanted = attribute[2] ?? attribute[3] ?? attribute[4]
    const held = element.getAttribute(name)
    if (held === null) return false
    return wanted === undefined || held === wanted
  }
  if (selector.startsWith('#')) return element.id === selector.slice(1)
  if (selector.startsWith('.')) return element.classList.contains(selector.slice(1))
  return element.tagName === selector.toUpperCase()
}

// Why: split at the top level only, so calc(0.7 * 1em) stays one value.
function shorthandParts(value: string): string[] {
  const parts: string[] = []
  let depth = 0
  let at = ''
  for (const character of value.trim()) {
    if (character === '(') depth += 1
    if (character === ')') depth -= 1
    if (/\s/.test(character) && depth === 0) {
      if (at !== '') parts.push(at)
      at = ''
      continue
    }
    at += character
  }
  if (at !== '') parts.push(at)
  return parts
}

// Why: the font shorthand writes the size just before the family, maybe with /line-height stuck to it,
// so the first part that begins like a number, a calc( or a var( is the size.
function declaredFontSize(element: FakeElement): string {
  const declared = styleMap(element)
  const longhand = (declared.get('font-size') ?? '').trim()
  if (longhand !== '') return longhand
  const shorthand = (declared.get('font') ?? '').trim()
  if (shorthand === '') return ''
  if (shorthand.toLowerCase() === 'inherit') return 'inherit'
  for (const part of shorthandParts(shorthand)) {
    const size = part.split('/')[0] ?? ''
    if (/^(calc\(|var\(|[.\d])/i.test(size)) return size
  }
  return ''
}

function customProperty(element: FakeElement, name: string): string | null {
  let at: FakeElement | null = element
  while (at !== null) {
    const held = styleMap(at).get(name)
    if (held !== undefined && held.trim() !== '') return held.trim()
    at = at.parentNode
  }
  return null
}

// Why: no var() fallback is honored, since a resolver that accepted one would report a size the page never draws.
function expandVariables(element: FakeElement, value: string, depth = 0): string | null {
  if (depth > 8) return null
  const named = /var\(\s*(--[a-z0-9-]+)\s*\)/i.exec(value)
  if (named === null) return value
  const held = customProperty(element, named[1] as string)
  if (held === null) return null
  return expandVariables(element, value.replace(named[0] as string, `(${held})`), depth + 1)
}

// Why: em, rem, % and px are all admitted, since a case must see whether a px constant is there; rem resolves
// against the same base as the inherited size, as both move with the reader's own setting (FR-039).
function lengthPx(expression: string, inheritedPx: number, basePx: number): number | null {
  const arithmetic = expression
    .trim()
    .toLowerCase()
    .replace(/\bcalc\b/g, '')
    .replace(/([\d.]+)\s*rem\b/g, (_whole, n: string) => `(${Number.parseFloat(n) * basePx})`)
    .replace(/([\d.]+)\s*em\b/g, (_whole, n: string) => `(${Number.parseFloat(n) * inheritedPx})`)
    .replace(/([\d.]+)\s*%/g, (_whole, n: string) => `(${(Number.parseFloat(n) / 100) * inheritedPx})`)
    .replace(/([\d.]+)\s*px\b/g, '($1)')
  if (arithmetic.trim() === '') return null
  if (!/^[\d\s+*/.()-]+$/.test(arithmetic)) return null
  try {
    // eslint-disable-next-line no-new-func -- evaluates only the arithmetic the replacements above left
    const answer: unknown = new Function(`return (${arithmetic});`)()
    return typeof answer === 'number' && Number.isFinite(answer) ? answer : null
  } catch {
    return null
  }
}

// Why: asked of the whole chain, as a ratio on the panel and a px constant on an ancestor make a fixed size together.
// Trap: only inline declarations are recorded, so a size stated in a style sheet reads as inherited and fails here;
// that is this file's blindness, not a defect: report it, do not tune the case.
function fontSizeAt(element: FakeElement, basePx: number): number | null {
  if (element.isMount) return basePx
  const parent = element.parentNode
  const inherited = parent === null ? basePx : fontSizeAt(parent, basePx)
  if (inherited === null) return null
  const written = declaredFontSize(element)
  if (written === '' || written.toLowerCase() === 'inherit') return inherited
  const expanded = expandVariables(element, written)
  if (expanded === null) return null
  return lengthPx(expanded, inherited, basePx)
}

function whatWasWritten(built: Stage, element: FakeElement): string {
  const styles = selfAndDescendants(built.root())
    .filter((one) => declaredFontSize(one) !== '')
    .map((one) => `${one.tagName}[${one.getAttribute('data-role') ?? '-'}]=${declaredFontSize(one)}`)
  return (
    `this node states ${JSON.stringify(declaredFontSize(element))} (${styleOf(element)}); ` +
    `every stated size in the tree: ${styles.join(', ') || '(none)'}; ` +
    `style elements the unit made: ${built.world.created.filter((one) => one.tagName === 'STYLE').length}`
  )
}

function sizeOf(built: Stage, element: FakeElement, basePx: number): number {
  const size = fontSizeAt(element, basePx)
  if (size === null) {
    throw new Error(
      'FR-006 (MUST): 「大きさは `S-197` を宿主が与える地の文字の大きさに掛けて求め」 -- ' +
        `this file could not resolve a size at a base of ${basePx}px. ${whatWasWritten(built, element)}`,
    )
  }
  return size
}

// Why: found by what it shows, as no table names the cell an item name sits in;
// includes, not equality, so a cell that draws a separator beside the name still matches.
function theCellShowing(root: FakeElement, text: string): FakeElement {
  const showing = selfAndDescendants(root).filter((one) => one.textContent.includes(text))
  const innermost = showing.filter(
    (one) => !one.children.some((child) => child.textContent.includes(text)),
  )
  const first = innermost[0]
  if (first === undefined) throw new Error(`nothing in the panel shows ${JSON.stringify(text)}`)
  if (innermost.length !== 1) {
    throw new Error(`${innermost.length} separate nodes show ${JSON.stringify(text)}`)
  }
  return first
}

function alignmentReaching(from: FakeElement, stopAt: FakeElement): string {
  let at: FakeElement | null = from
  while (at !== null) {
    const declared = styleMap(at)
    const align = (declared.get('text-align') ?? '').trim().toLowerCase()
    if (align !== '') return align
    const justify = (declared.get('justify-content') ?? '').trim().toLowerCase()
    if (justify !== '') return justify
    if (at === stopAt) break
    at = at.parentNode
  }
  return ''
}

const IS_RIGHT = new Set(['right', 'end', 'flex-end'])

const WIDTH_PROPERTIES = [
  'width',
  'min-width',
  'max-width',
  'flex',
  'flex-basis',
  'grid-template-columns',
]

function widthsReaching(from: FakeElement, stopAt: FakeElement): string[] {
  const found: string[] = []
  let at: FakeElement | null = from
  while (at !== null) {
    const declared = styleMap(at)
    for (const property of WIDTH_PROPERTIES) {
      const written = (declared.get(property) ?? '').trim()
      if (written !== '') found.push(`${property}: ${written}`)
    }
    if (at === stopAt) break
    at = at.parentNode
  }
  return found
}

const CONTROL_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT'])

const controlsIn = (panel: FakeElement): FakeElement[] =>
  selfAndDescendants(panel).filter((one) => CONTROL_TAGS.has(one.tagName))

const EMPTY_HEADER: AppHeaderItems = {
  documentTitle: null,
  openedFileName: null,
  fileSavedAt: null,
  fileSavedByteLength: null,
  fileNeverSavedText: '',
  commands: [],
  language: 'ja',
}

const EMPTY_FRAME: ScreenFrame = { isFullScreen: false, dividers: [], scrollbars: [] }

const EMPTY_VIEW: ScreenView = {
  language: 'ja',
  frame: EMPTY_FRAME,
  appHeaderItems: EMPTY_HEADER,
  taskGroupPanel: { pinnedTitles: [], titles: [] },
  propertiesPanel: null,
  commandPalette: null,
  openModal: null,
  notices: [],
  confirmation: null,
  tooltips: [],
}

const viewWith = (patch: Partial<ScreenView>): ScreenView => ({ ...EMPTY_VIEW, ...patch })

// Why: PR-9 on purpose: T-016 marks it read-only, so the panel writes its value out as text, which a text-against-text
// case needs; the value is this file's own string, so name and value are not found by the same search.
const READ_ONLY_FIELD: PropertyField = {
  row: 'PR-9',
  name: 'percentComplete',
  text: 'ValueTextHere',
  isEditable: false,
  controls: [],
}

const controlOf = (patch: Partial<PropertyControl> & Pick<PropertyControl, 'key' | 'kind'>): PropertyControl => ({
  text: 'ControlTextHere',
  choices: null,
  min: null,
  max: null,
  // Why: a room no case here is about, stated only so the description is a whole one.
  widthInFontSizes: 0,
  ...patch,
})

// Why: one field per kind of control, so a size that reached only some of them is visible; the choices are this file's own.
const EDITABLE_FIELDS: readonly PropertyField[] = [
  {
    row: 'PR-1',
    name: 'name',
    text: 'TaskNameHere',
    isEditable: true,
    controls: [controlOf({ key: { holder: 'task', uid: 1, column: 'name' }, kind: 'text' })],
  },
  {
    row: 'PR-3',
    name: 'start',
    text: '2026-08-27',
    isEditable: true,
    controls: [
      controlOf({ key: { holder: 'task', uid: 1, column: 'start' }, kind: 'date', text: '2026-08-27' }),
      controlOf({ key: { holder: 'task', uid: 1, column: 'finish' }, kind: 'date', text: '2026-08-28' }),
    ],
  },
  {
    row: 'PR-5',
    name: 'actualDuration',
    text: '3',
    isEditable: true,
    controls: [
      controlOf({
        // Why: PR-5's item name, not a Task column since AT-35 retired; the panel casts it the same way.
        key: { holder: 'task', uid: 1, column: 'actualDuration' as string as Extract<PropertyControl['key'], { holder: 'task' }>['column'] },
        kind: 'number',
        text: '3',
        min: 0,
        max: 99,
      }),
    ],
  },
  {
    row: 'PR-2',
    name: 'notes',
    text: 'NotesTextHere',
    isEditable: true,
    controls: [
      controlOf({ key: { holder: 'task', uid: 1, column: 'notes' }, kind: 'multiline', text: 'NotesTextHere' }),
    ],
  },
  {
    row: 'PR-8',
    name: 'resumeValid',
    text: 'false',
    isEditable: true,
    controls: [
      controlOf({ key: { holder: 'task', uid: 1, column: 'resumeValid' }, kind: 'boolean', text: 'false' }),
    ],
  },
  {
    // Why: PR-17 is the choice row T-016 still holds; the shape row left, as FR-029 forbids an entrance that answers
    // nothing and FR-083 leaves the shape to the palette.
    row: 'PR-17',
    name: 'milestoneGlyph',
    text: 'GlyphChoiceOne',
    isEditable: true,
    controls: [
      controlOf({
        key: { holder: 'taskVisual', uid: 1, column: 'milestoneGlyph' },
        kind: 'choice',
        text: 'GlyphChoiceOne',
        choices: ['GlyphChoiceOne', 'GlyphChoiceTwo'],
      }),
    ],
  },
  {
    row: 'PR-12',
    name: 'strokeColor',
    text: 'ColorTextHere',
    isEditable: true,
    controls: [
      controlOf({
        key: { holder: 'taskVisual', uid: 1, column: 'strokeColor' },
        kind: 'color',
        text: 'ColorTextHere',
      }),
    ],
  },
]

// Why: no heading is offered, as FR-072 refuses the panel a title bar; the cast is narrow so that a changed member
// arrives as one failing test, not as a compile error that takes every case in this file down.
const panelWith = (fields: readonly PropertyField[]): PropertiesPanel =>
  ({
    showing: 'selection',
    isSubjectGone: false,
    fields,
    commands: [],
  }) as PropertiesPanel

// Why: the App Header must measure to something, or BO-1 is not settled and no screen is drawn.
const HEADER_HEIGHT = { 'App Header': 37 }

// Why: bases of this file's own choosing: the host's base never reaches the unit, so the cases resolve under several.
const BASES = [12, 16, 20, 24, 32]

function drawPanel(fields: readonly PropertyField[]): { built: Stage; panel: FakeElement } {
  const built = wire(HEADER_HEIGHT)
  surfaceOf(built).showScreenView(viewWith({ propertiesPanel: panelWith(fields) }))
  return { built, panel: oneByRole(built.root(), U_25) }
}

// Spec: S-186, S-189, S-197, S-198
describe('the manuscript still says what these cases read', () => {
  it('⭐ was really driven by the manuscript, and not by a hollow read of it', () => {
    // Why: without this, a parse that picked the wrong column would make every case agree with anything;
    // S-186 in the same column states px, so a value read can be told from a heading or a reason.
    expect(cellOf('S-186')).toContain('px')
    expect(S_197).toBeGreaterThan(0)
    expect(S_197).toBeLessThan(1)
    expect(S_198).toBeGreaterThan(0)
    expect(S_198).toBeLessThan(1)
    expect(S_197, 'S-197 and S-198 are two different ratios').not.toBe(S_198)
    expect(FONT_SIZE_STEP_SIZES.every((one) => one > 0)).toBe(true)
    expect(U_25).toBe('Properties Panel')
  })

  it('⛔ S-197 and S-198 are ratios and state no px of their own', () => {
    expect(cellOf('S-197')).not.toContain('px')
    expect(cellOf('S-198')).not.toContain('px')
  })

  it('⛔ S-189 is a share of the width and not a length', () => {
    expect(S_189_CELL).toContain('%')
    expect(S_189_CELL).not.toContain('px')
  })
})

// Spec: FR-006, S-197, FR-039, T-215
describe("FR-006 (MUST) -- the panel's text is S-197 of the base the host gives", () => {
  // Spec: IMPS-71, IMPS-75
  it('computes to S-197 of the base, at every base a reader might set', () => {
    // Why: the base never reaches this unit, so the panel can meet this at every base only by stating a ratio.
    const { built, panel } = drawPanel([READ_ONLY_FIELD])

    for (const base of BASES) {
      expect(sizeOf(built, panel, base), `a host base of ${base}px`).toBeCloseTo(S_197 * base, 9)
    }
  })

  // Spec: IMPS-73
  it('⛔ MUST NOT: doubling the base doubles what the panel computes to', () => {
    // Why: a px constant, on the panel, behind a custom property or on an ancestor, gives the same number
    // under both bases, and a ratio cannot.
    const { built, panel } = drawPanel([READ_ONLY_FIELD])

    const small = sizeOf(built, panel, 16)
    const large = sizeOf(built, panel, 32)

    expect(large / small, 'the panel follows the reader, rather than a constant').toBeCloseTo(2, 9)
  })

  // Spec: IMPS-74
  it('⛔ MUST NOT: it is not `fontSizeStepSizes[fontSizeStep]` that is multiplied', () => {
    // Why: the base is none of T-215's own numbers, so a panel that multiplied the wrong thing cannot pass by accident.
    const base = 20
    expect(FONT_SIZE_STEP_SIZES, 'the base this case drives with is not one of them').not.toContain(base)

    const { built, panel } = drawPanel([READ_ONLY_FIELD])
    const size = sizeOf(built, panel, base)

    expect(size).toBeCloseTo(S_197 * base, 9)
    for (const wrong of FONT_SIZE_STEP_SIZES) {
      expect(size, `S-197 x fontSizeStepSizes = ${S_197 * wrong}`).not.toBeCloseTo(S_197 * wrong, 9)
    }
  })
})

// Spec: FR-006, S-197, S-198
describe('FR-006 (MUST) -- the item name takes S-198 on top of that', () => {
  it('the item name is smaller than the value beside it by exactly S-198', () => {
    const { built, panel } = drawPanel([READ_ONLY_FIELD])

    const name = theCellShowing(panel, READ_ONLY_FIELD.name)
    const value = theCellShowing(panel, READ_ONLY_FIELD.text)

    for (const base of BASES) {
      const nameSize = sizeOf(built, name, base)
      const valueSize = sizeOf(built, value, base)
      expect(nameSize / valueSize, `a host base of ${base}px`).toBeCloseTo(S_198, 9)
    }
  })

  // Spec: IMPS-72
  it('and so it is S-197 then S-198 of the base, never S-198 of the base alone', () => {
    // Why: the two ratios compound; S-198 against the base alone would leave the item name larger than its value.
    const { built, panel } = drawPanel([READ_ONLY_FIELD])
    const name = theCellShowing(panel, READ_ONLY_FIELD.name)

    for (const base of BASES) {
      expect(sizeOf(built, name, base), `a host base of ${base}px`).toBeCloseTo(
        S_197 * S_198 * base,
        9,
      )
    }
  })
})

// Spec: FR-006, S-189
describe('FR-006 (MUST) -- the item name sits to the left of the value, right-aligned', () => {
  it('⛔ MUST: the item name is right-aligned', () => {
    // Why: either spelling is accepted: a flex box states right alignment as justify-content, a block as text-align.
    const { panel } = drawPanel([READ_ONLY_FIELD])
    const name = theCellShowing(panel, READ_ONLY_FIELD.name)

    const aligned = alignmentReaching(name, panel)
    expect([...IS_RIGHT], `the item name's column states ${JSON.stringify(aligned)}`).toContain(
      aligned,
    )
  })

  // Spec: IMPS-31
  it('⛔ MUST: the item name comes before the value it names', () => {
    // Why: this seam sees only node order, so a panel that reorders with CSS order would pass here and fail a reader;
    // no table settles which property may place a field's parts, so that is not asserted.
    const { panel } = drawPanel([READ_ONLY_FIELD])
    const order = selfAndDescendants(panel)

    const name = order.indexOf(theCellShowing(panel, READ_ONLY_FIELD.name))
    const value = order.indexOf(theCellShowing(panel, READ_ONLY_FIELD.text))

    expect(name).toBeGreaterThanOrEqual(0)
    expect(value).toBeGreaterThan(name)
  })

  // Spec: IMPS-30
  it("⛔ takes S-189's share of the width, and states no px for it", () => {
    // Why: the share may be stated on the name's cell or on the row's box, so the chain up to the panel is read;
    // a row that states its columns another way would fail here for the wording, not the rule.
    const { panel } = drawPanel([READ_ONLY_FIELD])
    const name = theCellShowing(panel, READ_ONLY_FIELD.name)
    const stated = widthsReaching(name, panel)

    const asShare = new RegExp(`(^|[^0-9.])${S_189}(\\.0+)?\\s*%`)
    const asLength = new RegExp(`(^|[^0-9.])${S_189}(\\.0+)?\\s*px`)

    expect(stated.some((one) => asShare.test(one)), stated.join(' | ')).toBe(true)
    expect(stated.some((one) => asLength.test(one)), stated.join(' | ')).toBe(false)
  })
})

// Spec: FR-006
describe('FR-006 (MUST NOT) -- the size reaches the controls, not only the outer box', () => {
  it('every control the panel draws computes to the panel size', () => {
    // Why: FR-006 says the panel's text, not controls; it is read as covering a field's text, since a form control inherits
    // no font and S-186's note presumes that text grows (NFR-007); if a ruling stops at plain text, this case is wrong.
    const { built, panel } = drawPanel(EDITABLE_FIELDS)
    const controls = controlsIn(panel)

    expect(controls.length, 'the panel drew controls at all').toBeGreaterThan(0)

    for (const base of [16, 32]) {
      for (const control of controls) {
        const named = control.getAttribute('data-row') ?? control.tagName
        expect(sizeOf(built, control, base), `${named} at a host base of ${base}px`).toBeCloseTo(
          S_197 * base,
          9,
        )
      }
    }
  })

  it('⛔ MUST NOT: no control is left at a size a reader cannot move', () => {
    const { built, panel } = drawPanel(EDITABLE_FIELDS)

    for (const control of controlsIn(panel)) {
      const named = control.getAttribute('data-row') ?? control.tagName
      const small = sizeOf(built, control, 16)
      const large = sizeOf(built, control, 32)
      expect(large / small, named).toBeCloseTo(2, 9)
    }
  })
})
