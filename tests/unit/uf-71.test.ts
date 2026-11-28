// Unit tests: UF-71 DomScreenSurface turns a ScreenView into nodes on a handed-in Document.

import { readRepoFile } from '../spec-files'
import { join } from 'node:path'

import { describe, expect, it, vi } from 'vitest'

import {
  type AppHeaderItems,
  type CommandItem,
  type CommandPalette,
  type HelpModal,
  type Notice,
  type PropertiesPanel,
  type PropertyField,
  type TaskGroupTitle,
  type ScreenFrame,
  type ScreenSurface,
  type ScreenView,
  type Tooltip,
} from '../../src/adapter/screen-renderer/screen-renderer'
import {
  SETTINGS_CONSTANTS,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { ScreenRect } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import {
  domScreenSurface,
  type ScreenSurfaceWiring,
  type ScreenTheme,
} from '../../src/framework/dom-screen-surface/dom-screen-surface'
import { bare, specTable, unbroken } from '../contract/spec-table'
import { taskGroupNameFont } from '../fixtures/task-group-name-font'
import { S_235 } from '../fixtures/display-scale'
import { emptyScreenSession } from '../../src/use-case/advance-screen-session/advance-screen-session'

const LINK_GUARDS: readonly string[] = ['pointerdown', 'pointerup', 'keydown']
// Why: the search word field hears composition, so a word still being converted is not sent.
const TEXT_ENTRY_EVENTS: readonly string[] = ['input', 'compositionstart', 'compositionend']

// Why: U-30, U-34 and U-35 spell two names in one cell, so the copy is a list of
// names, not of rows; readsFromTable checks it against the .md.
const T_103_PARTS = [
  { row: 'U-21', name: 'Scrollbars' },
  { row: 'U-22', name: 'Task Group Panel' },
  { row: 'U-23', name: 'Task Group Title Tree' },
  { row: 'U-24', name: 'Panel Divider' },
  { row: 'U-25', name: 'Properties Panel' },
  { row: 'U-26', name: 'Command Palette' },
  { row: 'U-27', name: 'Document Title' },
  { row: 'U-58', name: 'Opened File Name' },
  { row: 'U-59', name: 'File Saved At' },
  { row: 'U-30', name: 'Help Modal' },
  { row: 'U-31', name: 'App Header' },
  { row: 'U-34', name: 'Palette Groups' },
  { row: 'U-34', name: 'Palette Commands' },
  { row: 'U-35', name: 'Header Commands' },
  { row: 'U-46', name: 'Pinned Task Group' },
  { row: 'U-47', name: 'Task Group Expander' },
  { row: 'U-48', name: 'Task Group Pin' },
  { row: 'U-49', name: 'Resource List' },
  { row: 'U-53', name: 'Tooltip' },
  { row: 'U-57', name: 'Notification Area' },
] as const

// Why: W-4 (T-006a) has a data-role carry a settled name in W-6's form, so a case
// finds a part by its row, never by a spelling typed into the case.
function partName(row: string): string {
  const found = T_103_PARTS.find((one) => one.row === row)
  if (found === undefined) throw new Error(`the copy of 表 T-103 no longer holds ${row}`)
  return found.name
}

// Why: FR-051 makes S-116 the upper bound, not the height: its value only proves
// the reported number is not it, and its bounds keep measurements inside the band.
function s116(): { readonly value: number; readonly min: number; readonly max: number } {
  const row = specTable('T-212').rows.find((one) => one.id === 'S-116')
  if (row === undefined) throw new Error('表 T-212 no longer holds S-116')
  const digits = (cell: string | undefined): number => {
    const found = /-?\d+(?:\.\d+)?/.exec(cell ?? '')
    if (found === null) throw new Error(`S-116 cell holds no number: ${String(cell)}`)
    return Number(found[0])
  }
  return { value: digits(row.cells[1]), min: digits(row.cells[2]), max: digits(row.cells[3]) }
}

const S_116 = s116()

// Why: T-206's number sits in its default column, not in the value column, which
// holds the row's description.
function s138(): { readonly px: number; readonly cell: string } {
  const row = specTable('T-206').rows.find((one) => one.id === 'S-138')
  if (row === undefined) throw new Error('表 T-206 no longer holds S-138')
  const cell = row.by['既定'] ?? ''
  const found = /(\d+(?:\.\d+)?)\s*px/.exec(cell)
  if (found === null) throw new Error(`S-138 states no px value in its 既定 column: ${cell}`)
  return { px: Number(found[1]), cell }
}

const S_138 = s138()

function s141(): { readonly px: number; readonly cell: string } {
  const row = specTable('T-206').rows.find((one) => one.id === 'S-141')
  if (row === undefined) throw new Error('表 T-206 no longer holds S-141')
  const cell = row.by['既定'] ?? ''
  const found = /(\d+(?:\.\d+)?)\s*px/.exec(cell)
  if (found === null) throw new Error(`S-141 states no px value in its 既定 column: ${cell}`)
  return { px: Number(found[1]), cell }
}

const S_141 = s141()

// Why: icon-glyphs.json is F-019 carried by the generator, which gen:check guards,
// so comparing against it asks only whether the unit drew the figure's shape.
interface GlyphElement {
  readonly tag: string
  readonly attributes: readonly { readonly name: string; readonly value: string }[]
}

const ICON_GLYPHS = JSON.parse(
  readRepoFile(
    join(process.cwd(), 'src', 'framework', 'dom-screen-surface', 'icon-glyphs.json'),
    'utf8',
  ),
) as {
  readonly viewBox: string
  readonly glyphs: readonly { readonly specTableRowId: string; readonly elements: readonly GlyphElement[] }[]
}

const glyphFor = (row: string): readonly GlyphElement[] => {
  const found = ICON_GLYPHS.glyphs.find((one) => one.specTableRowId === row)
  if (found === undefined) throw new Error(`図 F-019 draws no shape for ${row}`)
  return found.elements
}

interface FakeEvent {
  readonly type: string
  readonly key: string
  readonly isComposing: boolean
  readonly shiftKey: boolean
  readonly ctrlKey: boolean
  readonly altKey: boolean
  readonly metaKey: boolean
  target: FakeElement | null
  currentTarget: FakeElement | null
  defaultPrevented: boolean
  preventDefault(): void
  stopPropagation(): void
}

interface Registration {
  readonly node: FakeElement
  readonly type: string
  readonly listener: (event: FakeEvent) => void
}

type StyleWrite = { readonly kind: 'reset'; readonly css: string } | { readonly kind: 'set'; readonly property: string; readonly value: string }

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
  // Why: only an input really has a value; it is harmless elsewhere and keeps the fake small.
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

  // Why: an innerHTML write would be markup (FR-023), so it is recorded, never obeyed.
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

  // Why: mirrors the real property, so a unit that wrote el.disabled instead of
  // setAttribute is caught by the same FR-029 case.
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

  dispatchEvent(event: FakeEvent): boolean {
    event.target = this
    let stopped = false
    const stop = event.stopPropagation.bind(event)
    Object.defineProperty(event, 'stopPropagation', {
      configurable: true,
      value: (): void => {
        stopped = true
        stop()
      },
    })
    let at: FakeElement | null = this
    while (at !== null && !stopped) {
      const here: FakeElement = at
      for (const one of [...this.world.registrations]) {
        if (one.node === here && one.type === event.type) {
          event.currentTarget = here
          one.listener(event)
        }
      }
      at = at.parentNode
    }
    return !event.defaultPrevented
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
  readonly reportedBeforeFactoryReturned: boolean[]
  readonly authors: string[]
  clockMs: number
  author: string
  surface: ScreenSurface | undefined
  // Why: IF-9 carries only questions the shell asks, so this way in travels on the
  // Framework's own wiring; HF-14 shares it with the FR-085 rename.
  focusField: ((row: string) => void) | null
  root(): FakeElement
}

// Why: the host is a Proxy recording every member the unit reaches for, so the
// cases assert what the unit did to the fake, not merely that a call came back.
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

  const made: Stage = {
    world,
    host,
    mount,
    reportedHeights: [],
    reportedBeforeFactoryReturned: [],
    authors: [],
    clockMs: Date.UTC(2026, 7, 20, 3, 4, 5),
    author: 'Watcher',
    surface: undefined,
    focusField: null,
    root(): FakeElement {
      const first = mount.children[0]
      if (first === undefined) throw new Error('the unit mounted nothing')
      return first
    },
  }
  return made
}

// Why: neither value is typed: S-72 arrives with the screen values and S-73 is read
// from T-216, since DR-5 keeps the hue on Project and no constant carries it.
// Why: no case reads a colour back; readTheme is required (FR-041), so the cases
// need a theme to build the surface at all, not a particular one.
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
      built.reportedBeforeFactoryReturned.push(built.surface === undefined)
    },
    // Why: HF-14 names this FR-085 rename road (MK-13) for the task group it stands up
    // and forbids a second one.
    holdFocusPropertyField: (focus: (row: string) => void): void => {
      built.focusField = focus
    },
    readTheme: (): ScreenTheme => THEME,
  }
}

function wire(heightsByRole: Record<string, number> = {}): Stage {
  const built = stage(heightsByRole)
  const surface = domScreenSurface(wiringOf(built))
  built.surface = surface
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

// Why: whitespace-free and lower case, so a case never depends on how a value was spaced.
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

const isHiddenHere = (element: FakeElement): boolean => {
  const style = styleOf(element)
  return style.includes('visibility:hidden') || style.includes('display:none')
}

const isShown = (element: FakeElement): boolean => {
  let at: FakeElement | null = element
  while (at !== null) {
    if (isHiddenHere(at)) return false
    at = at.parentNode
  }
  return true
}

function serialize(element: FakeElement): string {
  const attributes = [...element.attributes].map(([name, value]) => ` ${name}="${value}"`).join('')
  const style = inlineStyle(element)
  const inside = element.childNodes
    .map((one) => (one instanceof FakeText ? one.data : serialize(one)))
    .join('')
  return `<${element.tagName.toLowerCase()}${attributes}${style === '' ? '' : ` style="${style}"`}>${inside}</${element.tagName.toLowerCase()}>`
}

// Why: the written colour, not a resolved one: FR-041 has one root declaration
// carry T-236 for the tree, so a part states which colour it takes.
const colorOf = (element: FakeElement): string =>
  (styleMap(element).get('color') ?? '').trim().toLowerCase()

// Why: found by the svg tag: F-019 is an SVG figure, so a carried shape is an
// svg element or it is not the figure's.
function shapeIn(entry: FakeElement): FakeElement {
  const found = selfAndDescendants(entry).filter((one) => one.tagName === 'SVG')
  if (found.length !== 1) {
    throw new Error(`the entry draws ${found.length} shapes, and FR-029 gives it one`)
  }
  return found[0] as FakeElement
}

function shownText(element: FakeElement): string {
  if (isHiddenHere(element)) return ''
  return element.childNodes
    .map((one) => (one instanceof FakeText ? one.data : shownText(one)))
    .join('')
}

function chainUpTo(from: FakeElement, stopAt: FakeElement): FakeElement[] {
  const found: FakeElement[] = []
  let at: FakeElement | null = from
  while (at !== null && at !== stopAt) {
    found.push(at)
    at = at.parentNode
  }
  return found
}

const withText = (root: FakeElement, text: string): FakeElement[] =>
  selfAndDescendants(root).filter((one) => one.textContent === text)

function theOneWithText(root: FakeElement, text: string): FakeElement {
  const found = withText(root, text)
  const deepest = found[found.length - 1]
  if (deepest === undefined) throw new Error(`nothing on the screen reads "${text}"`)
  return deepest
}

function keyPress(
  target: FakeElement,
  key: string,
  extra: Partial<FakeEvent> = {},
): FakeEvent {
  const event: FakeEvent = {
    type: 'keydown',
    key,
    isComposing: false,
    shiftKey: false,
    ctrlKey: false,
    altKey: false,
    metaKey: false,
    target: null,
    currentTarget: null,
    defaultPrevented: false,
    preventDefault(): void {
      ;(this as { defaultPrevented: boolean }).defaultPrevented = true
    },
    stopPropagation(): void {},
    ...extra,
  }
  target.dispatchEvent(event)
  return event
}

// Why: a tiny selector engine, so a unit that did query is not failed for it; the
// cases assert what was queried, not that nothing was.
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

const rect = (x: number, y: number, width: number, height: number): ScreenRect => ({
  x,
  y,
  width,
  height,
})

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
  // Why: the unit draws what it is handed and chooses no word, so language is inert
  // for every case below.
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

const command = (patch: Partial<CommandItem> & { icon: string }): CommandItem => ({
  isEnabled: true,
  isPressed: false,
  // Why: isArmed is apart from isPressed: IC-54 says the palette entry is not a
  // button and FR-053 bars the pressed form, so an arm may not ride the toggle.
  isArmed: false,
  isChosen: false,
  label: patch.icon,
  ...patch,
})

const TASK_GROUP_TITLE_INDENT = SETTINGS_CONSTANTS['taskGroupTitleIndent'] as number

const taskGroupTitle = (patch: Partial<TaskGroupTitle> & { taskGroupId: string }): TaskGroupTitle => ({
  depth: patch.depth ?? 1,
  indentPx: (patch.depth ?? 1) * TASK_GROUP_TITLE_INDENT,
  ...taskGroupNameFont(patch.depth ?? 1),
  box: rect(0, 0, 170, 24),
  label: patch.taskGroupId,
  wholeLabel: patch.taskGroupId,
  isLabelTruncated: false,
  // Why: expander is never null: HF-1 puts the three controls on every task group,
  // and having nothing to fold is a state FR-029 draws faint, not an absence.
  expander: { canOpen: false, canClose: false, canCloseBelow: false },
  isPinned: false,
  isSelected: false,
  ...patch,
})

const notice = (patch: Partial<Notice> & { manner: string; text: string }): Notice => ({
  mannerText: '',
  nextSteps: [],
  affectedCount: null,
  dismissText: 'OK',
  dismissKey: patch.manner,
  raisedNotices: [],
  ...patch,
})

const PALETTE: CommandPalette = {
  // Why: a corner, not a rectangle: FR-053 makes the palette's size follow its
  // contents, so the description carries only where it floats.
  at: { x: 400, y: 300 },
  // Why: the band height is this file's own and no case means it; the unit owes the
  // band where it is drawn and its mark, not the S-135a height.
  grabBandHeight: 10,
  minimize: {
    icon: 'IC-75',
    label: 'IC-75',
    isEnabled: true,
    isPressed: false,
    isArmed: false,
    isChosen: false,
  },
  isMinimized: false,
  groups: [
    {
      name: 'PaletteGroupOne',
      commands: [command({ icon: 'IC-61', label: 'PaletteCommandOne' })],
    },
  ],
  armedText: 'ArmedNothing',
}

// Why: FR-072 refuses the panel a heading, so the only word this description
// carries is the field's item name, which FR-006 puts on the screen.
// Why: the cast is narrow: whether the description still declares a heading member
// is the implementation's answer, and a compile error would take every case down.
const PROPERTIES: PropertiesPanel = {
  showing: 'selection',
  isSubjectGone: false,
  fields: [{ row: 'PR-3', name: 'start', text: '2026-08-20', isEditable: true, controls: [] }],
  commands: [],
} as PropertiesPanel

const HELP_MODAL: HelpModal = {
  surface: 'Help Modal',
  heading: 'HelpHeading',
  commands: [command({ icon: 'IC-52', label: 'CloseHelp' })],
  entries: [{
    table: 'T-036', row: 'MK-1', text: 'HelpEntryOne', press: null, keys: null, assignment: null, icon: null,
    kind: 'item', block: '', column: 'HC-1', segment: null, glyphs: [], link: null,
  }],
  legend: 'IC-102',
  helpLanguage: 'en',
  windowState: 'normal',
  licenseText: 'LicenseTextHere',
  copyrightNotice: 'CopyrightNoticeHere',
  attributions: ['AttributionOne'],
  helpLegal: { licensedUnder: 'LicensedUnderHere', fullText: 'FullTextHere' },
  blockNotes: [],
  area: { belowAppHeader: { x: 0, y: 37, width: 1280, height: 763 } },
  downloadLink: { words: '', address: '' },
  aboutLink: { words: '', address: '' },
}

// Why: EZ-2 puts the assignment behind the words and FR-036 leaves a row without
// one empty, so the member is always there and empty is null.
const iconTooltip = (icon: string, text: string, assignment: string | null = null): Tooltip => ({
  anchor: { kind: 'icon', icon },
  text,
  assignment,
})

// Summary: RICH_VIEW draws every part this unit owns, for the T-103 roster.
const RICH_VIEW: ScreenView = viewWith({
  frame: {
    isFullScreen: false,
    dividers: [
      { panel: 'taskGroupPanel', band: rect(170, 40, 6, 700), line: rect(172, 40, 1, 700) },
      { panel: 'propertiesPanel', band: rect(800, 40, 6, 700), line: rect(802, 40, 1, 700) },
    ],
    scrollbars: [
      { axis: 'horizontal', track: rect(176, 730, 620, 8), thumb: rect(176, 730, 200, 8) },
      { axis: 'vertical', track: rect(788, 40, 8, 690), thumb: rect(788, 40, 8, 300) },
    ],
  },
  appHeaderItems: {
    documentTitle: 'DocumentTitleHere',
    // Why: FR-101's file name is not the Document Title; U-58 says the two differ
    // normally, so the two fixtures differ.
    openedFileName: 'OpenedFileNameHere.grs.json',
    fileSavedAt: '2026-08-29T01:02:03Z',
    fileSavedByteLength: 48213,
    fileNeverSavedText: 'FileNeverSavedHere',
    commands: [command({ icon: 'IC-20', label: 'HeaderCommandOne' })],
    language: 'ja',
  },
  taskGroupPanel: {
    pinnedTitles: [taskGroupTitle({ taskGroupId: 'g-pinned', label: 'PinnedTaskGroupOne', isPinned: true })],
    titles: [
      taskGroupTitle({
        taskGroupId: 'g-1',
        label: 'TaskGroupOne',
        depth: 1,
        box: rect(0, 40, 170, 24),
        expander: { canOpen: true, canClose: false, canCloseBelow: false },
      }),
    ],
  },
  propertiesPanel: PROPERTIES,
  commandPalette: PALETTE,
  helpModal: HELP_MODAL,
  notices: [notice({ manner: 'NT-6', text: 'NoticeTextOne' })],
  tooltips: [iconTooltip('IC-20', 'TooltipTextOne')],
})

// Spec: T-103, T-212, S-116
describe('the tables these cases copy still say what the copies say', () => {
  it('表 T-103 spells every settled name the cases look for', () => {
    const rows = specTable('T-103').rows
    for (const part of T_103_PARTS) {
      const row = rows.find((one) => one.id === part.row)
      expect(row, `表 T-103 no longer holds ${part.row}`).toBeDefined()
      expect(row?.cells[0]).toContain(`\`${part.name}\``)
    }
  })

  it('表 T-212 still holds S-116 as a bound with a value inside it', () => {
    expect(S_116.min).toBeLessThan(S_116.value)
    expect(S_116.value).toBeLessThan(S_116.max)
  })
})

describe('IF-9 / PI-38 -- the seam is realized and not widened', () => {
  // Why: the roster is named, not counted: a count goes green on a swapped member,
  // and keys read off the surface under test agree with any surface.
  const IF_9_MEMBERS = [
    'readFieldCommit',
    'readFieldEditNotices',
    'readScreenPartAt',
    'readSearchWord',
    'showScreenView',
  ] as const

  it('IF-9 names a sixth supply, the typed search word, which readSearchWord serves (CR-597)', () => {
    const design = unbroken(readRepoFile(join(process.cwd(), 'docs', 'spec', '05-07-design.md'), 'utf8'))
    expect(design).toContain(
      '面は、この欄の語が変わるたびに、打ちかけの語をそのまま返すこと（MUST）',
    )
    expect(IF_9_MEMBERS).toContain('readSearchWord')
  })

  it('gives back exactly the members the IF-9 cell has supplies', () => {
    const built = wire({ 'App Header': 37 })
    const surface = surfaceOf(built)

    expect(Object.keys(surface).sort()).toEqual([...IF_9_MEMBERS])
    for (const member of IF_9_MEMBERS) {
      expect(typeof (surface as unknown as Record<string, unknown>)[member], member).toBe(
        'function',
      )
    }
  })

  it('reports the measured height on the FACTORY, never as a member of the seam', () => {
    const built = wire({ 'App Header': 37 })

    // Why: what the caller supplies travels on the wiring, so IF-9 keeps only the
    // members its cell names, and the height is not one of them.
    expect(built.reportedHeights).toEqual([37])
    expect(Object.keys(surfaceOf(built)).sort()).toEqual([...IF_9_MEMBERS])
  })
})

// Spec: BO-1, NFR-011
describe('BO-1 of 表 T-077 (MUST) -- nothing is drawn until the dimensions are settled', () => {
  it('mounts one root, marked with its own unit and hidden, before any description arrives', () => {
    const built = wire({ 'App Header': 37 })

    expect(built.mount.children).toHaveLength(1)
    // Why: T-103 has no row for the whole screen, so no name is minted for it.
    expect(built.root().getAttribute('data-unit')).toBe('UF-71')
    expect(built.root().getAttribute('data-role')).toBeNull()
    expect(isShown(built.root())).toBe(false)
  })

  it('hides with visibility, not display -- a box that is not laid out has no height', () => {
    const built = wire({ 'App Header': 37 })

    expect(styleOf(built.root())).toContain('visibility:hidden')
    expect(styleOf(built.root())).not.toContain('display:none')
  })

  it('has the App Header in the tree already, because BO-1 settles its dimension', () => {
    const built = wire({ 'App Header': 37 })

    expect(byRole(built.root(), 'App Header')).toHaveLength(1)
  })

  it('shows the screen only once a description has arrived', () => {
    const built = wire({ 'App Header': 37 })
    expect(isShown(built.root())).toBe(false)

    surfaceOf(built).showScreenView(EMPTY_VIEW)

    expect(isShown(built.root())).toBe(true)
  })

  it('⛔ still settles the dimension when the host lays the header out at 0', () => {
    // Why: NFR-011 names the 0x0 first frame as what the startup order stops, and a
    // preview pane cold-starts at 0 x 0, so a measured 0 must still be reported.
    const built = wire()

    expect(built.reportedHeights).toEqual([0])
    expect(isShown(built.root())).toBe(false)
  })
})

describe('FR-051 (MUST / MUST NOT) -- the App Header height is measured, not held', () => {
  it('measures the App Header itself rather than taking a number', () => {
    const built = wire({ 'App Header': 37 })

    const header = oneByRole(built.root(), 'App Header')
    expect(built.world.measured).toContain(header)
  })

  it('reports the height before the factory returns, so BO-1 has it', () => {
    const built = wire({ 'App Header': 37 })

    expect(built.reportedHeights).toEqual([37])
    // Why: contract line 1: the caller may not reach for the surface inside the
    // callback, because there is not one yet.
    expect(built.reportedBeforeFactoryReturned).toEqual([true])
  })

  it('answers with the environment, so two machines report two numbers', () => {
    const small = wire({ 'App Header': 33 })
    const large = wire({ 'App Header': 90 })

    expect(small.reportedHeights).toEqual([33])
    expect(large.reportedHeights).toEqual([90])
  })

  it('⛔ never substitutes appHeaderMaxHeight for the measurement (MUST NOT)', () => {
    const measured = S_116.min + 5
    expect(measured).not.toBe(S_116.value)

    const built = wire({ 'App Header': measured })

    expect(built.reportedHeights).toEqual([measured])
    expect(built.reportedHeights).not.toContain(S_116.value)
  })

  it('treats S-116 as a bound: a measurement at the bound itself is reported as it stands', () => {
    const atMin = wire({ 'App Header': S_116.min })
    const atMax = wire({ 'App Header': S_116.max })

    expect(atMin.reportedHeights).toEqual([S_116.min])
    expect(atMax.reportedHeights).toEqual([S_116.max])
  })

  it('FT-3: reports again when a redraw measured a different height, and not otherwise', () => {
    const built = wire({ 'App Header': 37 })
    const surface = surfaceOf(built)
    expect(built.reportedHeights).toEqual([37])

    // Step: the machine's text grows between two frames.
    built.world.heightsByRole.set('App Header', 44)
    surface.showScreenView(EMPTY_VIEW)
    expect(built.reportedHeights).toEqual([37, 44])

    // Why: nothing changed, so nothing is reported: NFR-010 forbids waking a frame on
    // anything T-078 does not list.
    surface.showScreenView(EMPTY_VIEW)
    surface.showScreenView(RICH_VIEW)
    expect(built.reportedHeights).toEqual([37, 44])
  })
})

describe('表 T-078 / NFR-010 (MUST NOT) -- nothing in this unit wakes a frame', () => {
  it('listens only where IF-9 gives it something to notice, and never on the host', () => {
    const built = wire({ 'App Header': 37 })
    surfaceOf(built).showScreenView(RICH_VIEW)

    // Why: no row fixes how many listeners a browser needs; T-078 forbids raising a
    // frame, so the case asserts where listeners sit, not how many.
    // Why: a tooltip once held a listener to put itself away; IN-4 has taken that job,
    // so a listener in a tooltip now fails here.
    // Why: HF-14 names a task group in the Properties Panel, so a listener among the
    // task groups fails this case, holding its MUST NOT from here.
    const root = built.root()
    const noticing = [oneByRole(root, 'Properties Panel')]
    // Why: the typed word may be heard on the search layer only as text entry (IF-9,
    // SV-5); the jump and the grab are answers to a point.
    const searchLayers = selfAndDescendants(root).filter(
      (one) => one.getAttribute('data-uz') === 'UZ-6',
    )

    expect(built.world.registrations.length).toBeGreaterThan(0)

    // Why: the IN-6 outside-press listener sits on the host, not a node: the schedule
    // goes up through IF-1 beside this tree, so presses on it never pass the root.
    for (const one of built.world.registrations) {
      // Why: FR-069 / FR-073 links keep their own press and Enter from the shell, so they open; they raise no frame.
      const isLinkGuard = one.node.getAttribute('target') === '_blank' && LINK_GUARDS.includes(one.type)
      // Why: FR-069: the help's full-text summary keeps its press and Enter from the shell like the links, and its
      // details hears toggle so the drawn help box stretches; neither reports to the shell nor raises a frame (T-078).
      const inHelp = byRole(root, 'Help Modal').some((help) => help.contains(one.node))
      const isFullTextGuard =
        inHelp &&
        ((one.node.tagName === 'SUMMARY' && one.node.parentNode?.tagName === 'DETAILS' && LINK_GUARDS.includes(one.type)) ||
          (one.node.tagName === 'DETAILS' && one.type === 'toggle'))
      expect(
        noticing.some((part) => part.contains(one.node)) ||
          isLinkGuard ||
          isFullTextGuard ||
          (TEXT_ENTRY_EVENTS.includes(one.type) && searchLayers.some((layer) => layer.contains(one.node))),
        `${one.type} on [data-role="${one.node.getAttribute('data-role') ?? ''}"]` +
          `[data-field-row="${one.node.getAttribute('data-field-row') ?? ''}"]`,
      ).toBe(true)
    }
  })

  it('registers nothing for a size change, and asks the host for one listener and no more', () => {
    const built = wire({ 'App Header': 37 })
    surfaceOf(built).showScreenView(RICH_VIEW)

    expect(built.world.registrations.map((one) => one.type)).not.toContain('resize')
    // Why: the host gives createElement, createElementNS for the F-019 SVG shapes and
    // one addEventListener for the IN-6 outside press; a second listener is a second touch.
    expect(new Set(built.world.hostMembers)).toEqual(
      new Set(['createElement', 'createElementNS', 'addEventListener']),
    )
    expect(built.world.hostMembers.filter((one) => one === 'addEventListener')).toHaveLength(1)
  })

  it('sets no timer -- FT-4 puts the clock in the shell', () => {
    vi.useFakeTimers()
    try {
      const built = wire({ 'App Header': 37 })
      surfaceOf(built).showScreenView(RICH_VIEW)
      expect(vi.getTimerCount()).toBe(0)

      vi.advanceTimersByTime(60_000)
      expect(vi.getTimerCount()).toBe(0)
    } finally {
      vi.useRealTimers()
    }
  })
})

// Why: the write, the default-name word and the FR-018 tier opening are settled
// before the ScreenView arrives, so only the one naming road is held here.
// Spec: HF-14, FR-085, MK-13
describe('HF-14 of 表 T-051 (MUST) -- 既定の名前でタスクグループを立て、プロパティパネルの名前の欄で名づけさせること', () => {
  // Why: read out of MK-13, never typed: HF-14 may not write the manner down, so
  // a cell that stopped naming the field fails here in one line.
  const NAME_TASK_GROUP = ((): string => {
    const mk13 = specTable('T-023').rows.find((one) => one.id === 'MK-13')
    const found = /タスクグループ見出し（タスクグループ名）[^`]*`[^`]*`[^`]*`(AT-\d+)`/.exec(mk13?.cells.join(' ') ?? '')
    if (found === null) throw new Error('表 T-023 MK-13 no longer names the task-group-name field')
    return found[1] as string
  })()

  const GROUP_ID = RICH_VIEW.taskGroupPanel.titles[0]?.taskGroupId ?? ''

  // Why: this file's own word; the default name is FR-038's and arrives in the
  // description, so a case needs only a value distinct from every other word.
  const THE_NAME_STANDING_THERE = 'TaskGroupNameStandingHere'

  const panelWithName = (): PropertiesPanel =>
    ({
      showing: 'selection',
      isSubjectGone: false,
      fields: [
        {
          row: NAME_TASK_GROUP,
          name: 'name',
          text: THE_NAME_STANDING_THERE,
          isEditable: true,
          controls: [
            {
              key: { holder: 'taskGroup', taskGroupId: GROUP_ID, column: 'name' },
              kind: 'text',
              text: THE_NAME_STANDING_THERE,
              choices: null,
              min: null,
              max: null,
              widthInFontSizes: 8,
            },
          ],
        } as PropertyField,
      ],
      commands: [],
    }) as PropertiesPanel

  const CONTROL_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT'])
  const controlsIn = (part: FakeElement): FakeElement[] =>
    selfAndDescendants(part).filter((one) => CONTROL_TAGS.has(one.tagName))

  const whatWasDrawn = (part: FakeElement): string =>
    controlsIn(part)
      .map((one) => `${one.tagName}[value=${JSON.stringify(one.value)}]`)
      .join(' ; ')

  // Why: notices are empty, since NT-8 puts the newest telling away before any
  // Enter or Esc rung and no case here is about that rung.
  const drawn = (): Stage => {
    const built = wire({ 'App Header': 37 })
    surfaceOf(built).showScreenView({
      ...RICH_VIEW,
      notices: [],
      propertiesPanel: panelWithName(),
    })
    return built
  }

  it('⭐ MUST: GIVEN the task group is standing WHEN the naming is looked for THEN it is in the `Properties Panel` -- 「そのタスクグループのプロパティパネルを出し、名前の欄で名づけさせること」', () => {
    const built = drawn()
    const panel = oneByRole(built.root(), partName('U-25'))

    expect(controlsIn(panel).map((one) => one.value), whatWasDrawn(panel)).toContain(
      THE_NAME_STANDING_THERE,
    )
  })

  it('⛔ MUST NOT: GIVEN the task groups are drawn WHEN the tree is read THEN nothing among them takes characters -- 「改名と別の道を作ってはならない（MUST NOT）」', () => {
    // Why: a second place to type a name is a second road; U-23 is where the task
    // groups stand, so that part is read.
    const built = drawn()
    const tree = oneByRole(built.root(), partName('U-23'))

    expect(controlsIn(tree), whatWasDrawn(tree)).toEqual([])
    expect(
      selfAndDescendants(tree).filter((one) => one.hasAttribute('contenteditable')),
      'a node among the task groups takes characters without being a form control',
    ).toEqual([])
  })

  it('⭐ MUST: GIVEN the surface is built WHEN the road is looked for THEN it is FR-085 の道, handed over once and landing in the panel', () => {
    const built = wire({ 'App Header': 37 })
    expect(built.focusField, 'the unit handed over no way to put a person in the name field').not.toBeNull()

    surfaceOf(built).showScreenView({
      ...RICH_VIEW,
      notices: [],
      propertiesPanel: panelWithName(),
    })
    // Why: the premise without which a focus landing says nothing.
    expect(built.world.activeElement).toBeNull()

    built.focusField?.(NAME_TASK_GROUP)

    const panel = oneByRole(built.root(), partName('U-25'))
    const active = built.world.activeElement
    expect(active, 'nothing took the focus').not.toBeNull()
    expect(
      panel.contains(active as FakeElement),
      `the focus landed outside the Properties Panel: ${whatWasDrawn(panel)}`,
    ).toBe(true)
    expect(oneByRole(built.root(), partName('U-23')).contains(active as FakeElement)).toBe(false)
  })

  it('DFC-805 IF-9 (MUST): the face answers a focus ask with false only when the field is drawn and the focus did not enter', () => {
    const built = wire({ 'App Header': 37 })
    surfaceOf(built).showScreenView({ ...RICH_VIEW, notices: [], propertiesPanel: panelWithName() })
    const ask = built.focusField as unknown as (row: string) => unknown
    expect(ask(NAME_TASK_GROUP), 'the focus entered the drawn field').toBe(true)
    expect(ask('no-such-row'), 'no such field in the panel drawn: the ask is answered as withdrawn').toBe(true)
    const field = controlsIn(oneByRole(built.root(), partName('U-25')))[0] as FakeElement
    field.focus = (): void => undefined
    // Why: the fake host names no activeElement, and a host that cannot say where the focus is reads as "in".
    Object.defineProperty(built.host, 'activeElement', { get: () => built.world.activeElement, configurable: true })
    built.world.activeElement = oneByRole(built.root(), partName('U-23'))
    expect(ask(NAME_TASK_GROUP), 'the field is drawn but the focus did not enter: ask again').toBe(false)
  })

  it('⛔ MUST: GIVEN a telling stands WHEN Enter is pressed in the name field THEN the telling goes and the name is NOT settled (NT-8 of 表 T-037)', () => {
    // Why: NT-8 puts a standing telling away before any Enter rung (IN-4, SK-19), one
    // rung per press, so Enter in the name field settles nothing.
    const built = wire({ 'App Header': 37 })
    // Why: RICH_VIEW carries one telling, which is the whole premise here.
    surfaceOf(built).showScreenView({ ...RICH_VIEW, propertiesPanel: panelWithName() })
    const panel = oneByRole(built.root(), partName('U-25'))
    const control = controlsIn(panel)[0]
    expect(control, whatWasDrawn(panel)).toBeDefined()

    // Why: the caret goes in, a word is typed and the key pressed: a bare keystroke on
    // a field nobody entered settles nothing, so it would pass for the wrong reason.
    const field = control as FakeElement
    field.focus()
    keyPress(field, '', { type: 'focusin' })
    field.value = 'TaskGroupNamedWhileATellingStood'
    keyPress(field, '', { type: 'input' })
    keyPress(field, 'Enter')

    expect(
      surfaceOf(built).readFieldCommit(),
      'the value was settled while a telling stood',
    ).toBeNull()
  })

  it('GIVEN the specification is re-read WHEN HF-14 and SK-19 are looked up THEN HF-14 stands the task group up WITH the default name and names it in the Properties Panel, settled with Enter', () => {
    const hf14 = specTable('T-051').rows.find((one) => one.id === 'HF-14')
    expect(hf14, '表 T-051 no longer holds HF-14').toBeDefined()
    const cells = hf14?.cells.join(' ') ?? ''

    expect(cells).toContain('配下に足す操作子を押したとき、`GRS` は、押した瞬間に既定の名前でタスクグループを立てること。')
    expect(cells).toContain('配下に足す操作子を押したとき、`GRS` は、立てたタスクグループのプロパティパネルを出し、名前の欄で名づけさせること。')
    expect(cells).toContain('`GRS` は、改名と別の名づけの道を作らないこと。')
    expect(cells).toContain('`GRS` は、名づけの道を、`FR-085` が改名について定める道と同じものにすること。')
    expect(cells).toContain('`GRS` は、既定の名前を表示語として持つこと（置き場は `FR-038` の辞書）。')
    expect(cells).toContain('仕様書が規則として綴りを刷ってはならない（MUST NOT）')

    // Why: held negatively: the row keeps a history note repeating the withdrawn words
    // without their MUST, so only a revival of the rules turns this red.
    expect(cells).not.toContain('名前は空で立て、その場で打たせること（MUST）')
    expect(cells).not.toContain('既定の名を与えてはならない（MUST NOT）')
    expect(cells).not.toContain('名前が空のまま確定されたときは、その行を立てないこと（MUST）')

    // Why: the default name is reached through the pointer under T-050 into FR-038's
    // dictionary, since HF-14 forbids the specification to print its spelling.
    const requirements = unbroken(readRepoFile(
      join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
      'utf8',
    ))
    const pointer = /名前は `FR-038` の辞書の `([A-Za-z]+)` の `([A-Za-z]+)` の語とすること（MUST）/.exec(
      requirements,
    )
    expect(pointer, '表 T-050 no longer points at the dictionary for the default name').not.toBeNull()
    const dictionary = JSON.parse(
      readRepoFile(
        join(process.cwd(), 'docs', 'spec', '_source', 'display-words.json'),
        'utf8',
      ),
    ) as Record<string, readonly Record<string, unknown>[]>
    const section = dictionary[(pointer as RegExpExecArray)[1] as string]
    expect(section, 'FR-038 の辞書 no longer holds the section 表 T-050 names').toBeDefined()
    const entry = section?.find((one) =>
      Object.values(one).includes((pointer as RegExpExecArray)[2] as string),
    )
    expect(entry, 'FR-038 の辞書 no longer holds the word 表 T-050 names').toBeDefined()
    const word = entry?.['text'] as Record<string, string> | undefined
    expect(word?.['ja'], 'the default name has no word to stand a task group up with').toBeTruthy()
    expect(word?.['en'], 'the default name has no word to stand a task group up with').toBeTruthy()
    // Why: the MUST NOT on spelling is not searched in the cell: HF-14's cell quotes
    // the ruling that holds the word, and the rule is about where the value lives.

    const sk19 = specTable('T-036').rows.find((one) => one.id === 'SK-19')
    expect(sk19, '表 T-036 no longer holds SK-19').toBeDefined()
    expect(sk19?.cells.join(' ')).toContain('タスクグループ名')
    expect(sk19?.cells.join(' ')).toContain('Enter')
    expect(sk19?.cells.join(' ')).toContain('出ている通知がある間、 `Enter` を押したとき、`GRS` は、出ている通知を 1 つ消すこと（作法は 表 T-037 の `NT-8`）。')
  })
})

// Why: two rows state another row instead of a colour and are left out; that only
// shrinks the set, the safe direction for a membership check.
const T_236_AS_WIRED = new Set(
  specTable('T-236')
    .rows.map((row) =>
      bare(row.by[THEME.preference === 'dark' ? '暗いテーマ' : '明るいテーマ'] ?? ''),
    )
    .filter((written) => /^(#|hsl\(|rgba?\()/.test(written))
    .map((written) => written.replace('H', String(THEME.hue)).replace(/\s+/g, '').toLowerCase()),
)

// Why: resolved through the root's declaration, since FR-041 has one declaration
// carry T-236; no var() fallback is honoured, as FR-041 forbids one.
function paintedColor(built: Stage, element: FakeElement): string {
  const written = colorOf(element)
  const named = /^var\((--[a-z0-9-]+)\)$/.exec(written)
  if (named === null) return written.replace(/\s+/g, '')
  const property = named[1] as string
  return (styleMap(built.root()).get(property) ?? `(the root declares no ${property})`)
    .replace(/\s+/g, '')
    .toLowerCase()
}

describe('FR-029 (MUST) -- the shape tells, the word names, and what cannot be used is faint rather than silent', () => {
  const disabledView = viewWith({
    appHeaderItems: {
      ...EMPTY_HEADER,
      commands: [
        command({ icon: 'IC-20', label: 'CannotBeUsed', isEnabled: false }),
        command({ icon: 'IC-21', label: 'CanBeUsed', isEnabled: true }),
      ],
    },
  })

  function entryFor(root: FakeElement, icon: string): FakeElement {
    const found = selfAndDescendants(root).filter((one) => one.getAttribute('data-icon') === icon)
    const first = found[0]
    if (first === undefined) throw new Error(`nothing carries data-icon="${icon}"`)
    return first
  }

  it('still draws the entry, with its words -- nothing goes quiet', () => {
    // Why: the word is the entry's accessible name, not its body: FR-029 tells by
    // icon, and CommandItem.label is declared as the accessible name.
    const built = wire({ 'App Header': 37 })
    surfaceOf(built).showScreenView(disabledView)

    const entry = entryFor(built.root(), 'IC-20')
    expect(isShown(entry)).toBe(true)
    expect(entry.getAttribute('aria-label')).toBe('CannotBeUsed')
    expect(isShown(shapeIn(entry))).toBe(true)
    // Why: the shape prints no word: FR-038 keeps every word in one dictionary, so a
    // word here would be one no language switch reaches.
    expect(shapeIn(entry).textContent).toBe('')
  })

  it('draws it faint -- a color of its own, and one 表 T-236 states for the rendering that was wired', () => {
    const built = wire({ 'App Header': 37 })
    surfaceOf(built).showScreenView(disabledView)

    // Why: the colour the words are drawn in, not any use of it: a usable entry may
    // still be bordered in a subdued colour.
    const cannot = paintedColor(built, entryFor(built.root(), 'IC-20'))
    const can = paintedColor(built, entryFor(built.root(), 'IC-21'))

    expect(cannot, 'the entry that cannot be used is painted like the one that can').not.toBe(can)
    // Why: T-236 holds no system colour, so membership is FR-041's MUST NOT: a
    // GrayText would follow the OS theme, not the chosen themePreference.
    expect(
      T_236_AS_WIRED.has(cannot),
      `${cannot} is not a color 表 T-236 states for the rendering ${THEME.preference}`,
    ).toBe(true)
  })

  it('⛔ says WHY with aria-disabled and never with the disabled attribute', () => {
    const built = wire({ 'App Header': 37 })
    surfaceOf(built).showScreenView(disabledView)

    const cannot = entryFor(built.root(), 'IC-20')
    // Why: disabled would take the entry out of the accessibility tree and off the
    // pointer, killing the IN-3 tooltip and the data-icon EZ-2 needs.
    expect(cannot.hasAttribute('disabled')).toBe(false)
    expect(cannot.getAttribute('aria-disabled')).toBe('true')
    expect(entryFor(built.root(), 'IC-21').getAttribute('aria-disabled')).not.toBe('true')
  })

  it('an entry whose dictionary cell is empty is NAMED by its row of 表 T-109', () => {
    // Why: every FR-038 dictionary cell is empty today, so the row id names the entry
    // where the word would go; with no name at all it would seem dead (FR-029).
    const built = wire({ 'App Header': 37 })
    surfaceOf(built).showScreenView(
      viewWith({
        appHeaderItems: {
          ...EMPTY_HEADER,
          commands: [command({ icon: 'IC-7', label: '' }), command({ icon: 'IC-20', label: 'Named' })],
        },
      }),
    )

    const unnamed = entryFor(built.root(), 'IC-7')
    const named = entryFor(built.root(), 'IC-20')

    expect(unnamed.getAttribute('aria-label')).toBe('IC-7')
    expect(named.getAttribute('aria-label')).toBe('Named')
    // Why: a unit that always named the entry after its row would pass the line above
    // and fail this one.
    expect(named.getAttribute('aria-label')).not.toBe('IC-20')
    expect(unnamed.getAttribute('data-icon')).toBe('IC-7')
    expect(named.getAttribute('data-icon')).toBe('IC-20')
  })

  it('FR-029 (MUST): the shape an entry draws is the one 図 F-019 gives its row', () => {
    // Why: compared element for element with the figure as it reaches src/, so a unit
    // that re-drew, re-scaled or substituted a shape is caught here.
    const built = wire({ 'App Header': 37 })
    surfaceOf(built).showScreenView(
      viewWith({
        appHeaderItems: { ...EMPTY_HEADER, commands: [command({ icon: 'IC-7', label: '' })] },
      }),
    )

    const shape = shapeIn(entryFor(built.root(), 'IC-7'))
    const drawn = glyphFor('IC-7')

    expect(shape.getAttribute('viewBox')).toBe(ICON_GLYPHS.viewBox)
    expect(shape.children.map((one) => one.tagName.toLowerCase())).toEqual(
      drawn.map((one) => one.tag),
    )
    for (const [at, element] of drawn.entries()) {
      const node = shape.children[at] as FakeElement
      for (const attribute of element.attributes) {
        // Why: style is compared declaration by declaration, since a browser may respell
        // one; the geometry is compared character for character.
        const said = (text: string | null): string =>
          attribute.name === 'style'
            ? (text ?? '')
                .split(';')
                .map((one) => one.replace(/\s+/g, ''))
                .filter((one) => one.length > 0)
                .sort()
                .join(';')
            : (text ?? '')
        expect(said(node.getAttribute(attribute.name)), `${element.tag} ${attribute.name}`).toBe(
          said(attribute.value),
        )
      }
    }
  })
})

describe('EZ-2 of 表 T-040 -- the entry the pointer rests on can be found', () => {
  // Why: no table spells how a tooltip names its entry, so no case checks the link;
  // what is checked is that the DOM can be read back.
  it('gives every drawn entry its row of 表 T-109 in data-icon', () => {
    const built = wire({ 'App Header': 37 })
    surfaceOf(built).showScreenView(RICH_VIEW)

    const icons = selfAndDescendants(built.root())
      .map((one) => one.getAttribute('data-icon'))
      .filter((one): one is string => one !== null)

    for (const wanted of ['IC-20', 'IC-61', 'IC-52']) {
      expect(icons).toContain(wanted)
    }
  })

  it('counts one entry per CommandItem, so the shell can name what is under the pointer', () => {
    const built = wire({ 'App Header': 37 })
    surfaceOf(built).showScreenView(
      viewWith({
        appHeaderItems: {
          ...EMPTY_HEADER,
          commands: [command({ icon: 'IC-20' }), command({ icon: 'IC-21' }), command({ icon: 'IC-52' })],
        },
      }),
    )

    const header = oneByRole(built.root(), 'Header Commands')
    const icons = selfAndDescendants(header)
      .map((one) => one.getAttribute('data-icon'))
      .filter((one): one is string => one !== null)
    expect(icons.sort()).toEqual(['IC-20', 'IC-21', 'IC-52'])
  })
})

describe('IN-3 of 表 T-028 -- a tooltip takes no pointer and does not go by itself', () => {
  const tooltipView = viewWith({ tooltips: [iconTooltip('IC-20', 'TooltipTextOne')] })

  const tooltipsBox = (root: FakeElement): FakeElement => oneByRole(root, 'Tooltip')

  function draw(view: ScreenView = tooltipView): { built: Stage; surface: ScreenSurface } {
    const built = wire({ 'App Header': 37 })
    const surface = surfaceOf(built)
    surface.showScreenView(view)
    return { built, surface }
  }

  it('IN-3 / UZ-2 -- takes no pointer, so a press on it passes to what lies below', () => {
    const { built } = draw()

    const box = tooltipsBox(built.root())
    expect(box.textContent).toContain('TooltipTextOne')
    const styles = selfAndDescendants(box).map((one) => styleOf(one))
    expect(styles.join(' ')).toContain('pointer-events:none')
    expect(styles.join(' ')).not.toContain('pointer-events:auto')
    expect(styles[0]).toContain('pointer-events:none')
  })

  it('⛔ does not go away by itself -- no clock of its own takes it', () => {
    vi.useFakeTimers()
    try {
      const { built } = draw()
      expect(vi.getTimerCount()).toBe(0)

      vi.advanceTimersByTime(600_000)

      expect(tooltipsBox(built.root()).textContent).toContain('TooltipTextOne')
    } finally {
      vi.useRealTimers()
    }
  })

  it('⛔ carries no on-screen control that puts it away, and no `x` to press', () => {
    // Why: a mark inside the tooltip cannot answer IN-3, since reaching it moves the
    // pointer, and IN-4 already holds the dismissal.
    const { built } = draw()
    const box = tooltipsBox(built.root())

    const pressable = selfAndDescendants(box).filter((one) =>
      built.world.registrations.some(
        (registration) => registration.type === 'click' && registration.node === one,
      ),
    )
    expect(pressable).toEqual([])
    expect(box.textContent).toBe('TooltipTextOne')
  })

  it('⛔ never uses the title attribute the browser owns, which breaks IN-3 twice', () => {
    const { built } = draw()

    const titled = selfAndDescendants(built.root()).filter((one) => one.hasAttribute('title'))
    expect(titled).toEqual([])
  })
})

describe('表 T-103 -- the settled names reach the DOM so the parts can be found', () => {
  const NOT_IN_A_HELP_VIEW = new Set(['Resource List'])

  it('draws every part under the name 表 T-103 settled for it', () => {
    const built = wire({ 'App Header': 37 })
    surfaceOf(built).showScreenView(RICH_VIEW)

    const root = built.root()
    for (const part of T_103_PARTS) {
      if (NOT_IN_A_HELP_VIEW.has(part.name)) continue
      expect(byRole(root, part.name).length, `${part.row} ${part.name}`).toBeGreaterThan(0)
    }
  })

  it('names the open surface by 表 T-103 where that table has a row for it', () => {
    const built = wire({ 'App Header': 37 })
    const surface = surfaceOf(built)

    surface.showScreenView(
      viewWith({
        openModal: {
          surface: 'Holiday Settings',
          heading: 'HolidaySettingsHeading',
          commands: [],
        },
      }),
    )
    expect(byRole(built.root(), 'Holiday Settings').length).toBeGreaterThan(0)
  })

  it('names U-57 by 表 T-103, which no longer leaves that part unnamed', () => {
    // Why: U-57 is not a Confirmation and not an S-99g surface opened over the screen,
    // so the view opens nothing and the part is drawn all the same.
    const built = wire({ 'App Header': 37 })
    surfaceOf(built).showScreenView(
      viewWith({ notices: [notice({ manner: 'NT-6', text: 'NoticeTextOne' })] }),
    )

    expect(byRole(built.root(), partName('U-57')).length).toBeGreaterThan(0)
  })
})

describe('SC-1 / SC-4 / SC-5 of 表 T-031 -- what is placed by what', () => {
  it('SC-4: draws both scrollbars, lanes and grips, whether things fit or not', () => {
    const built = wire({ 'App Header': 37 })
    surfaceOf(built).showScreenView(
      viewWith({
        frame: {
          isFullScreen: false,
          dividers: [],
          // Why: everything fits, so each grip is its whole lane; SC-4 still draws both.
          scrollbars: [
            { axis: 'horizontal', track: rect(176, 730, 620, 8), thumb: rect(176, 730, 620, 8) },
            { axis: 'vertical', track: rect(788, 40, 8, 690), thumb: rect(788, 40, 8, 690) },
          ],
        },
      }),
    )

    const lanes = byRole(built.root(), 'Scrollbars')
    expect(lanes).toHaveLength(2)
    const drawn = lanes.map((one) => selfAndDescendants(one).map(styleOf).join(' '))
    expect(drawn.join(' ')).toContain('620')
    expect(drawn.join(' ')).toContain('690')
  })

  it('FR-051: the Panel Divider is drawn from the band and the line the frame carries', () => {
    const built = wire({ 'App Header': 37 })
    surfaceOf(built).showScreenView(RICH_VIEW)

    const bands = byRole(built.root(), 'Panel Divider')
    expect(bands).toHaveLength(2)
    const drawn = bands.map((one) => selfAndDescendants(one).map(styleOf).join(' ')).join(' ')
    // Why: FR-051 gives the band no width of its own from the Task Group Area, so
    // it may be drawn only with the numbers it arrived with.
    expect(drawn).toContain('170')
    expect(drawn).toContain('800')
  })

  it('SC-1: a task group title is placed by the box the description carries, not by a measurement', () => {
    const built = wire({ 'App Header': 37 })
    surfaceOf(built).showScreenView(
      viewWith({
        taskGroupPanel: {
          pinnedTitles: [],
          titles: [taskGroupTitle({ taskGroupId: 'g-1', label: 'TaskGroupAlpha', box: rect(0, 137, 170, 29) })],
        },
      }),
    )

    const tree = oneByRole(built.root(), 'Task Group Title Tree')
    const label = theOneWithText(tree, 'TaskGroupAlpha')
    const placed = chainUpTo(label, tree).map(styleOf).join(' ')
    expect(placed).toContain('137')
    expect(placed).toContain('29')
  })

  it('sets a task group in by the `indentPx` its description carries, and by no measure of its own', () => {
    // Why: the boxes avoid 24 and 36 so the two indents cannot be confused with a
    // height or an offset in the joined styles.
    const built = wire({ 'App Header': 37 })
    surfaceOf(built).showScreenView(
      viewWith({
        taskGroupPanel: {
          pinnedTitles: [],
          titles: [
            taskGroupTitle({ taskGroupId: 'g-2', label: 'TaskGroupAtTwo', depth: 2, box: rect(0, 41, 171, 29) }),
            taskGroupTitle({ taskGroupId: 'g-3', label: 'TaskGroupAtThree', depth: 3, box: rect(0, 70, 171, 29) }),
          ],
        },
      }),
    )

    const tree = oneByRole(built.root(), 'Task Group Title Tree')
    const two = chainUpTo(theOneWithText(tree, 'TaskGroupAtTwo'), tree).map(styleOf).join(' ')
    const three = chainUpTo(theOneWithText(tree, 'TaskGroupAtThree'), tree).map(styleOf).join(' ')

    expect(two).toContain(`${2 * TASK_GROUP_TITLE_INDENT}px`)
    expect(three).toContain(`${3 * TASK_GROUP_TITLE_INDENT}px`)
    expect(two).not.toContain(`${3 * TASK_GROUP_TITLE_INDENT}px`)
    expect(three).not.toContain(`${2 * TASK_GROUP_TITLE_INDENT}px`)
    // Why: an em is the reader's font size and S-37 is px, so an em indent drifts.
    expect(two).not.toContain('1em')
    expect(three).not.toContain('2em')
  })

  const s218 = (): number => {
    const row = specTable('T-206').rows.find((one) => one.id === 'S-218')
    if (row === undefined) throw new Error('表 T-206 no longer holds S-218')
    const found = /(\d+(?:\.\d+)?)\s*px/.exec(row.by['既定'] ?? '')
    if (found === null) throw new Error('S-218 states no px value in its 既定 column')
    return Number(found[1])
  }

  const s140 = (): number => {
    const row = specTable('T-206').rows.find((one) => one.id === 'S-140')
    if (row === undefined) throw new Error('表 T-206 no longer holds S-140')
    const found = /(\d+(?:\.\d+)?)\s*px/.exec(row.by['既定'] ?? '')
    if (found === null) throw new Error('S-140 states no px value in its 既定 column')
    return Number(found[1])
  }

  const drawnTaskGroup = (title: TaskGroupTitle): { row: FakeElement; children: FakeElement[] } => {
    const built = wire({ 'App Header': 37 })
    surfaceOf(built).showScreenView(
      viewWith({ taskGroupPanel: { pinnedTitles: [], titles: [title] } }),
    )
    const tree = oneByRole(built.root(), 'Task Group Title Tree')
    const row = tree.children[0]
    if (row === undefined) throw new Error('the panel drew no task group')
    return { row, children: [...row.children] }
  }

  // Why: a fake DOM lays nothing out, so the cases ask which children are in the
  // flow (not absolute) and what it spends; the pixels are tests/system's.
  const isOutOfFlow = (element: FakeElement): boolean =>
    styleOf(element).includes('position:absolute')

  // Spec: HF-6, S-140
  it('⛔ DFC-116 / HF-6 (MUST): every task group control is laid OVER the name, not beside it', () => {
    expect(s140(), '表 T-206 の `S-140`: タスクグループの操作子に確保する場所').toBe(0)

    const { children } = drawnTaskGroup(
      taskGroupTitle({
        taskGroupId: 'g-1',
        label: 'TaskGroupAlpha',
        box: rect(0, 137, 170, 29),
        expander: { canOpen: true, canClose: true, canCloseBelow: true },
      }),
    )
    const inFlow = children.filter((child) => !isOutOfFlow(child))
    // Why: the grab strip (GR-20) and the name; not a pinned task group, since GR-20
    // gives a pinned one no strip and the count would drop for another reason.
    expect(
      inFlow.length,
      `表 T-051 の \`HF-6\`: ${inFlow.map(styleOf).join(' / ')} stand in the task group's flow`,
    ).toBe(2)
  })

  // Spec: FR-085, S-37, S-138, S-218, GR-20
  it('⛔ FR-085 (MUST): what the flow spends beside the name is the indent, `S-138` and `S-218`', () => {
    const depth = 3
    const { row, children } = drawnTaskGroup(
      taskGroupTitle({ taskGroupId: 'g-3', label: 'TaskGroupAtThree', depth, box: rect(0, 70, 170, 29) }),
    )
    // Why: the raw style, not styleOf(): the four-value padding shorthand needs its
    // spaces to say which side the indent is on.
    const style = inlineStyle(row)

    expect(style, 'FR-085: the task group is set in by its own `indentPx`').toContain(
      `padding:0 0 0 ${depth * TASK_GROUP_TITLE_INDENT}px`,
    )
    expect(style, 'FR-085: `S-218` stands between the grab strip and the name').toContain(
      `gap:${s218()}px`,
    )

    // Why: HF-15 draws the grab strip always, outside HF-6, so it is the one thing
    // that may stand in the flow ahead of the name.
    const inFlow = children.filter((child) => !isOutOfFlow(child))
    const strip = inFlow[0]
    expect(strip, 'the task group drew nothing in its flow').toBeDefined()
    expect(styleOf(strip as FakeElement), '表 T-023d の `GR-20`: 幅は `S-138`').toContain(
      `width:${S_138.px}px`,
    )
  })

  it('⛔ HF-6 (MUST NOT): the room does not change with whether the controls can act', () => {
    // Why: two task groups differ only in what their controls can do; the boxes must
    // match, or the cut moves with the state of the controls.
    const shape = { taskGroupId: 'g-1', label: 'TaskGroupAlpha', box: rect(0, 137, 170, 29) } as const
    const quiet = drawnTaskGroup(
      taskGroupTitle({ ...shape, expander: { canOpen: false, canClose: false, canCloseBelow: false } }),
    )
    // Why: isPinned is held equal: FR-098 gives a pinned task group a ground of its
    // own, a colour and not room, which would change the subject.
    const busy = drawnTaskGroup(
      taskGroupTitle({ ...shape, expander: { canOpen: true, canClose: true, canCloseBelow: true } }),
    )

    expect(styleOf(busy.row), 'FR-085 (MUST NOT): the task group itself changed size').toBe(
      styleOf(quiet.row),
    )

    const nameOf = (one: { children: FakeElement[] }): string => {
      const found = one.children.filter((child) => !isOutOfFlow(child))[1]
      if (found === undefined) throw new Error('the task group drew no name in its flow')
      return styleOf(found)
    }
    expect(nameOf(busy), 'FR-085 (MUST NOT): the name was given a different share').toBe(
      nameOf(quiet),
    )
  })

  it('SC-5: the Properties Panel scrolls its own contents and is slaved to nothing', () => {
    const built = wire({ 'App Header': 37 })
    surfaceOf(built).showScreenView(RICH_VIEW)

    const panel = oneByRole(built.root(), 'Properties Panel')
    const style = selfAndDescendants(panel).map(styleOf).join(' ')
    expect(style).toContain('overflow-y:auto')
  })

  // Why: what the Task Group Panel draws with no Panel Divider is left open: SC-3
  // speaks of the panel not scrolling away, not of a background.
  it('PND-155: the Properties Panel starts at the line of its own Panel Divider', () => {
    const at = (lineX: number): number => {
      const built = wire({ 'App Header': 37 })
      surfaceOf(built).showScreenView(
        viewWith({
          frame: {
            isFullScreen: false,
            dividers: [
              {
                panel: 'propertiesPanel',
                band: rect(lineX - 4, 40, 6, 700),
                line: rect(lineX, 40, 1, 700),
              },
            ],
            scrollbars: [],
          },
          propertiesPanel: PROPERTIES,
        }),
      )
      const left = styleMap(oneByRole(built.root(), 'Properties Panel')).get('left')
      return Number((left ?? '').replace('px', ''))
    }

    // Why: which side of the line the panel begins on is display only, so the case
    // asks only that the edge comes from the line.
    expect(at(806) - at(300)).toBe(506)
    expect(Math.abs(at(806) - 806)).toBeLessThanOrEqual(1)
  })
})

describe('NT-1 / NT-3 / NT-3a of 表 T-037', () => {
  // Spec: NT-1, NT-3, NT-3a, NT-5, FR-099
  it('NT-1 / NT-3 / NT-3a: a notice draws its words, its manner, its next steps and its count', () => {
    const built = wire({ 'App Header': 37 })
    surfaceOf(built).showScreenView(
      viewWith({
        notices: [
          notice({
            manner: 'NT-3a',
            text: 'NoticeWordsHere',
            nextSteps: ['NextStepOne', 'NextStepTwo'],
            affectedCount: 12,
          }),
        ],
      }),
    )

    const box = oneByRole(built.root(), partName('U-57'))
    expect(box.textContent).toContain('NoticeWordsHere')
    expect(box.textContent).toContain('NextStepOne')
    expect(box.textContent).toContain('NextStepTwo')
    expect(box.textContent).toContain('12')
    // Why: NT-5 tells a warning from an NT-1 refusal by the row, so the row travels
    // with the notice.
    expect(serialize(box)).toContain('NT-3a')
  })

  it('draws no count where the row does not ask for one', () => {
    const built = wire({ 'App Header': 37 })
    surfaceOf(built).showScreenView(
      viewWith({ notices: [notice({ manner: 'NT-6', text: 'NoticeWordsHere' })] }),
    )

    const box = oneByRole(built.root(), partName('U-57'))
    expect(box.textContent).not.toContain('null')
    expect(box.textContent).not.toContain('NaN')
  })
})

describe('FR-038 -- the words are carried, and the language is readable before the toggle', () => {
  it('draws headings, labels and notice words exactly as they arrived', () => {
    const built = wire({ 'App Header': 37 })
    surfaceOf(built).showScreenView(RICH_VIEW)

    const text = built.root().textContent
    // Why: the panel's word is an item name, not a heading: FR-072 leaves the panel
    // without a heading and FR-006 still puts the item name on the screen.
    for (const word of ['DocumentTitleHere', 'start', 'HelpHeading', 'NoticeTextOne']) {
      expect(text).toContain(word)
    }
    // Why: an entry's word is its accessible name, not its body (FR-029), and naming
    // the entry each word belongs to catches a word on the wrong entry.
    const commandFor = (icon: string): FakeElement => {
      const found = selfAndDescendants(built.root()).filter(
        (one) => one.getAttribute('data-icon') === icon,
      )
      const first = found[0]
      if (first === undefined) throw new Error(`nothing carries data-icon="${icon}"`)
      return first
    }
    expect(commandFor('IC-20').getAttribute('aria-label')).toBe('HeaderCommandOne')
    expect(commandFor('IC-61').getAttribute('aria-label')).toBe('PaletteCommandOne')
  })

  // Why: the view is in `ja` and HELP_MODAL carries helpLanguage `en`, so the two differ.
  it('⭐ ヘルプの言語が画面の言語と違うあいだは、ヘルプの領域にヘルプの言語を名乗らせること（MUST）', () => {
    const requirements = unbroken(readRepoFile(
      join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
      'utf8',
    ))
    expect(requirements).toContain('ヘルプの言語が画面の言語と違う間、`GRS` は、ヘルプの領域にヘルプの言語を名乗らせること')
    const built = wire({ 'App Header': 37 })
    surfaceOf(built).showScreenView(RICH_VIEW)

    const help = oneByRole(built.root(), 'Help Modal')
    const named = selfAndDescendants(help).flatMap((one) =>
      [...one.attributes].filter(([name, value]) => name.includes('lang') && value === 'en'),
    )
    expect(named.length).toBeGreaterThan(0)
  })

  it('carries the three license values FR-069 asks for into the help surface', () => {
    const built = wire({ 'App Header': 37 })
    surfaceOf(built).showScreenView(RICH_VIEW)

    const help = oneByRole(built.root(), 'Help Modal')
    expect(help.textContent).toContain('LicenseTextHere')
    expect(help.textContent).toContain('CopyrightNoticeHere')
    expect(help.textContent).toContain('AttributionOne')
  })
})

describe('FR-053 (MUST) -- a minimized palette shows the grab band and nothing else', () => {
  // Why: UF-65 decides a minimized palette carries no armedText; this unit owes that
  // a description with no reading draws no box for one.
  const minimized = (armedText: string | null): ScreenView =>
    viewWith({
      commandPalette: { ...PALETTE, isMinimized: true, groups: [], armedText },
    })

  it('⭐ prints no word at all when the description carries none', () => {
    const built = wire({ 'App Header': 37 })
    surfaceOf(built).showScreenView(minimized(null))

    const palette = oneByRole(built.root(), 'Command Palette')
    expect(shownText(palette), 'the band alone, with no word beside it').toBe('')
    expect(byRole(palette, 'Palette Groups')).toHaveLength(0)
    expect(byRole(palette, 'Palette Commands')).toHaveLength(0)
  })

  it('⛔ draws the band and no second box beside it', () => {
    // Why: an empty contents box carries no word and no group role, so the case above
    // passes it; it still takes room under the band, so the children are counted.
    const built = wire({ 'App Header': 37 })
    surfaceOf(built).showScreenView(minimized(null))

    const palette = oneByRole(built.root(), 'Command Palette')
    expect(palette.children, 'the band, and nothing beside it').toHaveLength(1)
    const band = palette.children[0] as FakeElement
    expect(
      selfAndDescendants(band).map((one) => one.getAttribute('data-icon')),
      'and the one child IS the band -- IC-53 is drawn on it',
    ).toContain('IC-53')
  })

  it('⛔ still draws the band, so the palette can be moved again (GR-19)', () => {
    // Why: FR-053 keeps the band, since without it a minimized palette cannot be
    // moved, and IC-75 rides on it in both states.
    const built = wire({ 'App Header': 37 })
    surfaceOf(built).showScreenView(minimized(null))

    const palette = oneByRole(built.root(), 'Command Palette')
    const marks = selfAndDescendants(palette)
      .map((one) => one.getAttribute('data-icon'))
      .filter((one): one is string => one !== null)
    expect(marks, 'IC-53 (掴みどころ) and IC-75 (最小化) are what the band carries')
      .toEqual(expect.arrayContaining(['IC-53', 'IC-75']))
  })

  it('⭐ prints the word again as soon as the description carries one', () => {
    // Why: the control case: a unit that never printed armedText would pass the first
    // case, and FR-053 makes the reading a MUST outside the minimized state.
    const built = wire({ 'App Header': 37 })
    surfaceOf(built).showScreenView(viewWith({ commandPalette: PALETTE }))

    const palette = oneByRole(built.root(), 'Command Palette')
    expect(shownText(palette)).toContain(PALETTE.armedText)
  })
})

describe('FR-023 -- nothing that arrived from a document becomes markup', () => {
  const HOSTILE = '<img src=x onerror="boom">'

  it('⛔ writes no markup anywhere', () => {
    const built = wire({ 'App Header': 37 })
    surfaceOf(built).showScreenView(
      viewWith({
        appHeaderItems: { ...EMPTY_HEADER, documentTitle: HOSTILE },
        taskGroupPanel: { pinnedTitles: [], titles: [taskGroupTitle({ taskGroupId: 'g-1', label: HOSTILE })] },
      }),
    )

    expect(built.world.markupWrites).toEqual([])
  })

  it('draws a hostile name as the words it is', () => {
    const built = wire({ 'App Header': 37 })
    surfaceOf(built).showScreenView(
      viewWith({ appHeaderItems: { ...EMPTY_HEADER, documentTitle: HOSTILE } }),
    )

    expect(oneByRole(built.root(), 'Document Title').textContent).toBe(HOSTILE)
  })

  it('builds no selector out of what a document said', () => {
    const built = wire({ 'App Header': 37 })
    surfaceOf(built).showScreenView(
      viewWith({
        appHeaderItems: { ...EMPTY_HEADER, documentTitle: HOSTILE },
        taskGroupPanel: { pinnedTitles: [], titles: [taskGroupTitle({ taskGroupId: HOSTILE, label: HOSTILE })] },
        tooltips: [{ anchor: { kind: 'taskGroupTitle', taskGroupId: HOSTILE }, text: HOSTILE, assignment: null }],
      }),
    )

    for (const selector of built.world.selectors) {
      expect(selector).not.toContain('img')
      expect(selector).not.toContain('onerror')
    }
  })

  it('adds no element for the markup a name contains', () => {
    const hostile = wire({ 'App Header': 37 })
    surfaceOf(hostile).showScreenView(
      viewWith({ appHeaderItems: { ...EMPTY_HEADER, documentTitle: HOSTILE } }),
    )
    const plain = wire({ 'App Header': 37 })
    surfaceOf(plain).showScreenView(
      viewWith({ appHeaderItems: { ...EMPTY_HEADER, documentTitle: 'PlainTitle' } }),
    )

    expect(selfAndDescendants(hostile.root())).toHaveLength(
      selfAndDescendants(plain.root()).length,
    )
  })
})

describe('showScreenView twice -- the whole description each time', () => {
  const first = viewWith({
    appHeaderItems: { ...EMPTY_HEADER, documentTitle: 'TitleOne' },
    propertiesPanel: PROPERTIES,
    commandPalette: PALETTE,
    helpModal: HELP_MODAL,
    notices: [
      notice({ manner: 'NT-1', text: 'NoticeOne' }),
      notice({ manner: 'NT-6', text: 'NoticeTwo' }),
      notice({ manner: 'NT-3a', text: 'NoticeThree', nextSteps: ['StepOne'] }),
    ],
    tooltips: [iconTooltip('IC-20', 'TooltipOne')],
  })

  const second = viewWith({
    appHeaderItems: { ...EMPTY_HEADER, documentTitle: 'TitleTwo' },
    notices: [notice({ manner: 'NT-6', text: 'NoticeFour' })],
  })

  it('leaves nothing of the first description that the second does not carry', () => {
    const built = wire({ 'App Header': 37 })
    const surface = surfaceOf(built)
    surface.showScreenView(first)
    expect(built.root().textContent).toContain('TitleOne')

    surface.showScreenView(second)

    const text = shownText(built.root())
    // Why: start stands where a heading once did: FR-072 leaves the panel no heading,
    // so the closed panel takes its field's item name away with it.
    for (const gone of ['TitleOne', 'NoticeOne', 'NoticeTwo', 'NoticeThree', 'StepOne', 'HelpHeading', 'LicenseTextHere', 'PaletteCommandOne', 'start', 'TooltipOne']) {
      expect(text, gone).not.toContain(gone)
    }
    expect(text).toContain('TitleTwo')
    expect(text).toContain('NoticeFour')
  })

  it('takes the closed parts off the screen rather than leaving them showing', () => {
    const built = wire({ 'App Header': 37 })
    const surface = surfaceOf(built)
    surface.showScreenView(first)

    surface.showScreenView(second)

    for (const role of ['Help Modal', 'Command Palette', 'Properties Panel']) {
      for (const one of byRole(built.root(), role)) {
        expect(isShown(one), role).toBe(false)
      }
    }
  })

  it('replaces the title rather than adding to it', () => {
    const built = wire({ 'App Header': 37 })
    const surface = surfaceOf(built)
    surface.showScreenView(first)

    surface.showScreenView(second)

    expect(oneByRole(built.root(), 'Document Title').textContent).toBe('TitleTwo')
  })

  it('keeps one root, however many descriptions arrive', () => {
    const built = wire({ 'App Header': 37 })
    const surface = surfaceOf(built)

    surface.showScreenView(first)
    surface.showScreenView(second)
    surface.showScreenView(RICH_VIEW)
    surface.showScreenView(EMPTY_VIEW)

    expect(built.mount.children).toHaveLength(1)
    expect(byRole(built.root(), 'App Header')).toHaveLength(1)
  })
})

describe('boundaries', () => {
  it('draws an empty description without complaint, and shows the screen', () => {
    const built = wire({ 'App Header': 37 })

    expect(() => surfaceOf(built).showScreenView(EMPTY_VIEW)).not.toThrow()

    expect(isShown(built.root())).toBe(true)
    expect(byRole(built.root(), partName('U-57')).every((one) => one.textContent === '')).toBe(true)
    expect(byRole(built.root(), 'Tooltip').every((one) => one.textContent === '')).toBe(true)
  })

  it('⛔ substitutes nothing for a document that carries no title', () => {
    const built = wire({ 'App Header': 37 })

    surfaceOf(built).showScreenView(viewWith({ appHeaderItems: EMPTY_HEADER }))

    // Why: FR-035 fixes Untitled for the browser tab and says nothing of the header,
    // so nothing is invented here.
    expect(oneByRole(built.root(), 'Document Title').textContent).toBe('')
    expect(built.root().textContent).not.toContain('Untitled')
  })

  it('draws a description whose every optional part is null', () => {
    const built = wire({ 'App Header': 37 })

    surfaceOf(built).showScreenView(
      viewWith({
        propertiesPanel: null,
        commandPalette: null,
        openModal: null,
        appHeaderItems: { ...EMPTY_HEADER, documentTitle: null },
        taskGroupPanel: {
          pinnedTitles: [],
          // Why: expander is no optional part, since HF-1 puts the controls on every task
          // group; name still is (FR-058, AT-54), and this task group carries its absence.
          titles: [taskGroupTitle({ taskGroupId: 'g-1', label: null })],
        },
      }),
    )

    expect(isShown(built.root())).toBe(true)
    expect(built.world.markupWrites).toEqual([])
  })

  it('draws the same description twice without doubling anything', () => {
    const built = wire({ 'App Header': 37 })
    const surface = surfaceOf(built)

    surface.showScreenView(RICH_VIEW)
    const once = selfAndDescendants(built.root()).length
    const readingTheTitleOnce = withText(built.root(), 'DocumentTitleHere').length
    surface.showScreenView(RICH_VIEW)

    expect(selfAndDescendants(built.root())).toHaveLength(once)
    // Why: the count comes from the first draw: how many boxes read exactly the title
    // is a nesting no row fixes; the case is that the second draw adds none.
    expect(withText(built.root(), 'DocumentTitleHere')).toHaveLength(readingTheTitleOnce)
    // Why: W-4 gives the settled name to exactly one box, and oneByRole() throws on a
    // second.
    expect(oneByRole(built.root(), 'Document Title').textContent).toBe('DocumentTitleHere')
  })
})

describe('LY-5 of 表 T-060 / R7.3 -- the outside arrives as an argument', () => {
  it('reaches for no global browser', () => {
    // Why: asserted so that a later change of the test environment cannot make the
    // case vacuous.
    expect(typeof (globalThis as { document?: unknown }).document).toBe('undefined')

    const built = wire({ 'App Header': 37 })
    expect(() => surfaceOf(built).showScreenView(RICH_VIEW)).not.toThrow()
  })

  it('calls nothing on the host it was handed but the two makers and IN-6 listener', () => {
    // Why: the claim is a closed set: createElementNS draws the F-019 SVG shapes and
    // addEventListener takes the one IN-6 outside press; the Proxy records any other.
    const built = wire({ 'App Header': 37 })
    surfaceOf(built).showScreenView(RICH_VIEW)
    surfaceOf(built).readFieldCommit()

    expect([...new Set(built.world.hostMembers)].sort()).toEqual([
      'addEventListener',
      'createElement',
      'createElementNS',
    ])
  })

  it('never writes on the element it was given to mount in', () => {
    const built = wire({ 'App Header': 37 })
    surfaceOf(built).showScreenView(RICH_VIEW)

    expect([...built.mount.attributes]).toEqual([])
    expect(built.mount.styleWrites).toEqual([])
  })

  it('holds what is current here, so a second surface starts clean', () => {
    // Why: a text field of the Properties Panel is the one place this unit holds a settled value.
    const panel = {
      showing: 'selection',
      isSubjectGone: false,
      fields: [
        {
          row: 'PR-1',
          name: 'name',
          text: 'Held',
          isEditable: true,
          controls: [
            {
              key: { holder: 'taskGroup', taskGroupId: 'g-1', column: 'name' },
              kind: 'text',
              text: 'Held',
              choices: null,
              min: null,
              max: null,
              widthInFontSizes: 8,
            },
          ],
        } as PropertyField,
      ],
      commands: [],
    } as PropertiesPanel
    const one = wire({ 'App Header': 37 })
    surfaceOf(one).showScreenView(viewWith({ propertiesPanel: panel }))
    const field = selfAndDescendants(oneByRole(one.root(), partName('U-25'))).find(
      (node) => node.tagName === 'INPUT' || node.tagName === 'TEXTAREA',
    ) as FakeElement
    field.focus()
    keyPress(field, '', { type: 'focusin' })
    field.value = 'please wait'
    keyPress(field, '', { type: 'input' })
    keyPress(field, 'Enter')

    const other = wire({ 'App Header': 37 })
    surfaceOf(other).showScreenView(viewWith({ propertiesPanel: panel }))

    expect(surfaceOf(other).readFieldCommit()).toBeNull()
    expect(surfaceOf(one).readFieldCommit()).not.toBeNull()
  })
})

const T_051_HF5_SAME_SIZE_HERE = '`GRS` は、タスクグループ名の文字サイズにかかわらず、操作子を同じ大きさで描くこと。'

const FR_029_THE_BOX = '`GRS` は、図形を描く箱の一辺を `_assets/tbl-settings.md` の 表 T-206 の `S-138` に従わせること'
const FR_029_NOT_BY_SURFACE = '`GRS` は、図形を描く箱の一辺を、載る面によって変えないこと'

// Why: four different surfaces on purpose -- the header, the floating palette, a
// surface opened over the screen and a task group's controls -- as FR-029 needs.
const T_109_ONE_PER_SURFACE = [
  { row: 'IC-20', surface: 'App Header' },
  { row: 'IC-61', surface: 'Command Palette' },
  { row: 'IC-52', surface: 'Help Modal' },
  { row: 'IC-58', surface: 'Task Group Panel' },
  { row: 'IC-59', surface: 'Task Group Panel' },
  { row: 'IC-60', surface: 'Task Group Panel' },
] as const

const EVERY_SURFACE_VIEW: ScreenView = viewWith({
  appHeaderItems: {
    ...EMPTY_HEADER,
    commands: [command({ icon: 'IC-20', label: 'AgentApiOnOff' })],
  },
  commandPalette: PALETTE,
  helpModal: HELP_MODAL,
  taskGroupPanel: {
    pinnedTitles: [],
    titles: [
      taskGroupTitle({
        taskGroupId: 'g-1',
        label: 'TaskGroupOne',
        expander: { canOpen: true, canClose: true, canCloseBelow: false },
      }),
    ],
  },
})

function iconEntry(root: FakeElement, icon: string): FakeElement {
  const found = selfAndDescendants(root).filter((one) => one.getAttribute('data-icon') === icon)
  const first = found[0]
  if (first === undefined) throw new Error(`nothing carries data-icon="${icon}"`)
  return first
}

// Why: read off the svg element, the box FR-029 means; a declaration overrides the
// width and height attributes, so it is read first and the attribute behind it.
function glyphSide(shape: FakeElement, axis: 'width' | 'height'): string {
  const declared = styleMap(shape).get(axis)
  if (declared !== undefined && declared.trim() !== '') return declared.trim().toLowerCase()
  const attribute = shape.getAttribute(axis)
  if (attribute !== null && attribute.trim() !== '') return attribute.trim().toLowerCase()
  throw new Error(`the shape states no ${axis} at all: ${serialize(shape)}`)
}

// Why: null for em, rem, % and ex is the point: S-138 must not follow the reader's
// text size, and a box that does is the failure.
function pixelsOf(value: string): number | null {
  const found = /^(-?\d+(?:\.\d+)?)(?:px)?$/.exec(value.trim())
  return found === null ? null : Number(found[1])
}

const glyphBoxOf = (entry: FakeElement): { readonly width: string; readonly height: string } => {
  const shape = shapeIn(entry)
  return { width: glyphSide(shape, 'width'), height: glyphSide(shape, 'height') }
}

// Why: the cases read the shape's box, never the entry's outline: S-138 sizes the
// shape, while the entry's border, padding and line are its own.
// Spec: FR-029, S-138, S-141, HF-5, T-109
describe('the manuscript still says what the S-138 cases copy', () => {
  it('表 T-206 still holds S-138 as the side of the box, in px', () => {
    // Why: every expectation below is S_138.px read from T-206, so a row that stops
    // stating px fails here in one line instead of six elsewhere.
    expect(S_138.px).toBeGreaterThan(0)
    expect(S_138.cell).toContain('px')
    expect(specTable('T-206').caption).toContain('保存しないもの')
    const row = specTable('T-206').rows.find((one) => one.id === 'S-138')
    expect(row?.by['値']).toContain('FR-029')
    expect(row?.by['保存しない理由']).toContain('EP-1')
    expect(row?.by['保存しない理由']).toContain('EP-4')
  })

  it('FR-029 still points at S-138 and still forbids the surface to change it', () => {
    const requirements = unbroken(readRepoFile(
      join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
      'utf8',
    ))
    expect(requirements).toContain(FR_029_THE_BOX)
    expect(requirements).toContain('S-138')
    expect(requirements).toContain(FR_029_NOT_BY_SURFACE)
    expect(requirements).toContain('一辺が定めるのは図形の箱であって')
  })

  it('表 T-206 still holds S-141 as the least gap, in px', () => {
    expect(S_141.px).toBeGreaterThan(0)
    expect(S_141.cell).toContain('px')
    const row = specTable('T-206').rows.find((one) => one.id === 'S-141')
    expect(row?.by['値']).toContain('FR-029')
  })

  it("FR-029 still forbids the gap to follow the reader's text size", () => {
    const requirements = unbroken(readRepoFile(
      join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
      'utf8',
    ))
    expect(requirements).toContain('S-141')
    expect(requirements).toContain(
      '`GRS` は、図形と入口の枠のあいだの隙間を、読む人の文字サイズに追随させないこと',
    )
  })

  it('表 T-051 HF-5 still asks for one size whatever the name is', () => {
    const hf5 = specTable('T-051').rows.find((one) => one.id === 'HF-5')
    expect(hf5, '表 T-051 no longer holds HF-5').toBeDefined()
    expect(hf5?.cells.join(' ')).toContain(T_051_HF5_SAME_SIZE_HERE)
  })

  it('表 T-109 still puts each of these entries on the surface its case expects', () => {
    const rows = specTable('T-109').rows
    for (const one of T_109_ONE_PER_SURFACE) {
      const row = rows.find((held) => held.id === one.row)
      expect(row, `表 T-109 no longer holds ${one.row}`).toBeDefined()
      expect(row?.by['面'], `${one.row} left the ${one.surface}`).toContain(one.surface)
    }
    expect(new Set(T_109_ONE_PER_SURFACE.map((one) => one.surface)).size).toBe(4)
  })
})

// Why: only arithmetic and px are admitted; any other unit or a custom property
// answers null, as a length the reader's text size can move is not allowed.
function pxExpression(value: string): number | null {
  const bare = value.trim().toLowerCase().replace(/\bcalc\b/g, '').replace(/px\b/g, '')
  if (bare.trim() === '') return null
  if (!/^[\d\s+*/.()-]+$/.test(bare)) return null
  try {
    // eslint-disable-next-line no-new-func -- evaluates a calc() body already checked to hold only arithmetic
    const answer: unknown = new Function(`return (${bare});`)()
    return typeof answer === 'number' && Number.isFinite(answer) ? answer : null
  } catch {
    return null
  }
}

// Summary: paddingSides() expands a padding shorthand to top, right, bottom and left.
function paddingSides(value: string): readonly string[] {
  const parts = value.trim().split(/\s+/)
  const [one, two, three, four] = parts
  if (parts.length === 1) return [one as string, one as string, one as string, one as string]
  if (parts.length === 2) return [one as string, two as string, one as string, two as string]
  if (parts.length === 3)
    return [one as string, two as string, three as string, two as string]
  return [one as string, two as string, three as string, four as string]
}

describe("FR-029 (MUST) -- S-141's least gap between a shape and its entrance's frame", () => {
  // Why: the rule names a frame, and T-109 never says which entry draws one, so the
  // framed entrances are read off the drawn entries.
  const framed = (): readonly { row: string; surface: string; entry: FakeElement }[] => {
    const built = wire({ 'App Header': 37 })
    surfaceOf(built).showScreenView(EVERY_SURFACE_VIEW)
    return T_109_ONE_PER_SURFACE.map((one) => ({
      row: one.row,
      surface: one.surface,
      entry: iconEntry(built.root(), one.row),
    })).filter((one) => {
      const border = styleMap(one.entry).get('border') ?? 'none'
      return border.trim() !== 'none' && border.trim() !== '0'
    })
  }

  it('at least one entrance carries a frame, or the rule below is asked of nothing', () => {
    expect(framed().length).toBeGreaterThan(0)
  })

  // Spec: IMPS-1103
  it('\u2b50 keeps at least S-141 between the shape and the frame, on both axes', () => {
    // Why: sideways the entrance's padding is the gap; downwards its room must hold
    // the S-138 shape with S-141 on each side.
    for (const one of framed()) {
      const held = styleMap(one.entry)
      const sides = paddingSides(held.get('padding') ?? '0')
      const where = `${one.row} on the ${one.surface}`
      expect(pxExpression(sides[1] as string), `${where}: right of the shape`).toBeGreaterThanOrEqual(
        S_141.px * S_235 - 1e-6,
      )
      expect(pxExpression(sides[3] as string), `${where}: left of the shape`).toBeGreaterThanOrEqual(
        S_141.px * S_235 - 1e-6,
      )

      const room = held.get('min-height') ?? held.get('height')
      expect(room, `${where}: the entrance reserves no room downwards`).toBeDefined()
      expect(
        pxExpression(room as string),
        `${where}: the room downwards is "${room ?? ''}"`,
      ).toBeGreaterThanOrEqual((S_138.px + S_141.px * 2) * S_235 - 1e-6)
    }
  })

  // Spec: IMPS-1106
  it("\u26d4 states that room in px alone, so the gap cannot follow the reader's text size (FR-029 MUST NOT)", () => {
    // Why: pxExpression() answers null for every relative unit, so a gap written in
    // em fails here whatever number it holds.
    for (const one of framed()) {
      const held = styleMap(one.entry)
      const where = `${one.row} on the ${one.surface}`
      for (const property of ['padding', 'padding-left', 'padding-right', 'padding-top',
        'padding-bottom', 'min-height', 'height']) {
        const stated = held.get(property)
        if (stated === undefined) continue
        for (const side of property === 'padding' ? paddingSides(stated) : [stated]) {
          expect(
            pxExpression(side),
            `${where}: ${property} states "${side}", which follows the reader's text size`,
          ).not.toBeNull()
        }
      }
    }
  })

  it('\u2b50 the gap is the same on every 面 the entry is drawn on', () => {
    const spelled = framed().map((one) => {
      const held = styleMap(one.entry)
      return `${held.get('padding') ?? ''}|${held.get('min-height') ?? ''}`
    })
    expect(new Set(spelled).size, spelled.join(' / ')).toBe(1)
  })
})

describe('FR-029 (MUST) -- the box a shape is drawn in is S-138, on whatever surface it sits', () => {
  const drawEverySurface = (): Stage => {
    const built = wire({ 'App Header': 37 })
    surfaceOf(built).showScreenView(EVERY_SURFACE_VIEW)
    return built
  }

  // Spec: IMPS-1102
  it.each(T_109_ONE_PER_SURFACE)(
    '⭐ GIVEN $row is drawn on the $surface WHEN the box its shape is drawn in is read THEN both sides are S-138 (FR-029 MUST, 表 T-206 S-138) -- $row',
    ({ row, surface }) => {
      const built = drawEverySurface()
      const box = glyphBoxOf(iconEntry(built.root(), row))

      expect(
        pixelsOf(box.width),
        `${row} on the ${surface} draws its shape ${box.width} wide`,
      ).toBeCloseTo(S_138.px * S_235, 4)
      expect(
        pixelsOf(box.height),
        `${row} on the ${surface} draws its shape ${box.height} tall`,
      ).toBeCloseTo(S_138.px * S_235, 4)
    },
  )

  it('⛔ GIVEN entries on the header, the palette, an open surface and a task group WHEN their boxes are compared THEN not one of them differs (FR-029: 載る面によって変えてはならない -- MUST NOT)', () => {
    // Why: one comparison, not four equalities: one wrong number everywhere is caught
    // by the case above, while this one holds the surfaces the same.
    const built = drawEverySurface()
    const boxes = T_109_ONE_PER_SURFACE.map((one) => ({
      row: one.row,
      surface: one.surface,
      ...glyphBoxOf(iconEntry(built.root(), one.row)),
    }))

    const spelled = boxes.map((one) => `${one.width} x ${one.height}`)
    expect(
      new Set(spelled).size,
      `the surfaces draw different boxes: ${boxes
        .map((one) => `${one.row} on the ${one.surface} = ${one.width} x ${one.height}`)
        .join(' | ')}`,
    ).toBe(1)
  })

  it("⛔ GIVEN a box is read WHEN its unit is examined THEN it is stated in px and not in the reader's own text size (表 T-206 S-138: 閲覧者の文字サイズに追随させない)", () => {
    const built = drawEverySurface()

    for (const one of T_109_ONE_PER_SURFACE) {
      const box = glyphBoxOf(iconEntry(built.root(), one.row))
      for (const [axis, stated] of Object.entries(box)) {
        expect(
          pixelsOf(stated),
          `${one.row} states its ${axis} as "${stated}", which follows the reader's text size`,
        ).not.toBeNull()
      }
    }
  })

  // Spec: IMPS-793
  it('⭐ GIVEN two task groups at different depths WHEN their controls are read THEN the box is the same on both, and neither is set down (表 T-051 HF-5 MUST: タスクグループ名の文字サイズにかかわらず、操作子を同じ大きさで描くこと)', () => {
    // Why: TaskGroupTitle carries no text size; only the depth reaches this side of
    // IF-9, so a box that moved with depth would break HF-5 here.
    const built = wire({ 'App Header': 37 })
    surfaceOf(built).showScreenView(
      viewWith({
        taskGroupPanel: {
          pinnedTitles: [],
          titles: [
            taskGroupTitle({
              taskGroupId: 'g-shallow',
              label: 'ShallowTaskGroup',
              depth: 1,
              box: rect(0, 40, 170, 40),
              expander: { canOpen: true, canClose: true, canCloseBelow: false },
            }),
            taskGroupTitle({
              taskGroupId: 'g-deep',
              label: 'DeepTaskGroup',
              depth: 5,
              box: rect(0, 80, 170, 18),
              expander: { canOpen: true, canClose: true, canCloseBelow: false },
            }),
          ],
        },
      }),
    )

    const rows = selfAndDescendants(built.root()).filter((one) => one.hasAttribute('data-group-id'))
    expect(rows, 'the panel did not draw two task groups').toHaveLength(2)

    for (const icon of ['IC-58', 'IC-59', 'IC-60']) {
      const boxes = rows.map((one) => glyphBoxOf(iconEntry(one, icon)))
      expect(boxes[0], `${icon} is drawn in two different boxes`).toEqual(boxes[1])
      expect(pixelsOf(boxes[0]?.width ?? ''), `${icon} is not S-138 × S-235 wide`).toBeCloseTo(
        S_138.px * S_235,
        4,
      )
      expect(pixelsOf(boxes[0]?.height ?? ''), `${icon} is not S-138 × S-235 tall`).toBeCloseTo(
        S_138.px * S_235,
        4,
      )
      for (const row of rows) {
        const control = iconEntry(row, icon)
        expect(styleMap(control).get('margin-top'), `${icon} is set down`).toBeUndefined()
        expect(styleMap(control).get('padding-top'), `${icon} is set down`).toBeUndefined()
      }
    }

    // Why: the name and controls share one line box, so where it starts its items is
    // where the controls sit against the name's top; center is what HF-5 forbids.
    for (const row of rows) {
      expect(styleMap(row).get('align-items'), 'the task group does not start its controls at the top')
        .toBe('flex-start')
    }
  })

  it("⭐ GIVEN a task group whose name is far bigger than its controls WHEN the task group is read THEN the controls are LEVEL with the name's top and are neither centered nor set down (表 T-051 HF-5)", () => {
    const built = wire({ 'App Header': 37 })
    surfaceOf(built).showScreenView(
      viewWith({
        taskGroupPanel: {
          pinnedTitles: [],
          titles: [
            taskGroupTitle({
              taskGroupId: 'g-tall',
              label: 'A task group whose name is drawn much larger than the controls beside it',
              depth: 1,
              // Why: six times S-138 tall, so a centered trio would sit far from the top and a
              // set-down one far from where it does.
              box: rect(0, 0, 170, S_138.px * 6),
              expander: { canOpen: true, canClose: true, canCloseBelow: false },
            }),
          ],
        },
      }),
    )

    const rows = selfAndDescendants(built.root()).filter((one) => one.hasAttribute('data-group-id'))
    expect(rows, 'the panel drew no task group').toHaveLength(1)
    const row = rows[0] as FakeElement

    const alignment = styleMap(row).get('align-items')
    expect(alignment, 'the task group states no cross-axis alignment at all').toBeDefined()
    expect(['center', 'baseline', 'last baseline', 'flex-end', 'end'], `align-items:${alignment ?? ''}`)
      .not.toContain(alignment)

    for (const icon of ['IC-58', 'IC-59', 'IC-60']) {
      const control = styleMap(iconEntry(row, icon))
      for (const property of ['margin-top', 'padding-top', 'top', 'transform']) {
        expect(control.get(property), `${icon} states ${property}`).toBeUndefined()
      }
      const self = control.get('align-self')
      if (self !== undefined) {
        expect(['center', 'baseline', 'flex-end', 'end'], `${icon} align-self:${self}`).not.toContain(
          self,
        )
      }
    }
  })

  it('GIVEN the same entry drawn on two different 面 WHEN both are read THEN neither scales it (FR-029 MUST NOT) -- IC-52', () => {
    // Why: T-109 puts IC-52 on several surfaces, so it alone can be compared on two
    // without a second row entering the comparison.
    const built = wire({ 'App Header': 37 })
    const surface = surfaceOf(built)

    surface.showScreenView(viewWith({ helpModal: HELP_MODAL }))
    const onHelp = glyphBoxOf(iconEntry(built.root(), 'IC-52'))

    surface.showScreenView(
      viewWith({
        openModal: {
          surface: 'Holiday Settings',
          heading: 'HolidaySettingsHeading',
          commands: [command({ icon: 'IC-52', label: 'CloseHolidaySettings' })],
        },
      }),
    )
    const onHolidaySettings = glyphBoxOf(iconEntry(built.root(), 'IC-52'))

    expect(onHolidaySettings).toEqual(onHelp)
    expect(pixelsOf(onHolidaySettings.width)).toBeCloseTo(S_138.px * S_235, 4)
    expect(pixelsOf(onHolidaySettings.height)).toBeCloseTo(S_138.px * S_235, 4)
  })
})


