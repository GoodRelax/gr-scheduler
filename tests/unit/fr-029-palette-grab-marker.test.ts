// Unit tests: the Command Palette draws its grab marker and prints no row id.

import { readRepoFile } from '../spec-files'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import type {
  AppHeaderItems,
  CommandItem,
  CommandPalette,
  PaletteGroup,
  ScreenFrame,
  ScreenSurface,
  ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'
import {
  domScreenSurface,
  type ScreenSurfaceWiring,
  type ScreenTheme,
} from '../../src/framework/dom-screen-surface/dom-screen-surface'
// Why: the contract kind's reader is borrowed because it reads the .md at run
// time, so a value that moves in a table moves here too.
import { bare, bareAll, specTable } from '../contract/spec-table'
import { emptyScreenSession } from '../../src/use-case/advance-screen-session/advance-screen-session'

const T_206 = specTable('T-206')
const T_109 = specTable('T-109')
const T_023b = specTable('T-023b')

// Spec: T-103, U-26
const U_26 = ((): string => {
  const row = specTable('T-103').rows.find((one) => one.id === 'U-26')
  if (row === undefined) throw new Error('table T-103 no longer has row U-26')
  return bare(row.by['確定名（英）'] ?? '')
})()

// Spec: T-206, S-135a, T-023d, GR-19
const GRAB_BAND_HEIGHT_PX = ((): number => {
  const row = T_206.rows.find((one) => one.id === 'S-135a')
  if (row === undefined) throw new Error('table T-206 no longer has row S-135a')
  const found = /-?\d+(?:\.\d+)?/.exec(bare(row.by['既定'] ?? ''))
  if (found === null) throw new Error('table T-206\'s S-135a states no number')
  return Number.parseFloat(found[0] as string)
})()

// Spec: T-109
const IC_GRAB_MARKER = 'IC-53'

const PALETTE_ROWS: readonly string[] = T_109.rows
  .filter((row) => bareAll(row.by['面'] ?? '').includes(U_26))
  .map((row) => row.id)

// Spec: F-019, FR-029
// Why: read from icon-glyphs.json, not copied: the generator carries F-019 into
// it, and npm run gen:check fails when the figure moves on without it.
interface GlyphElement {
  readonly tag: string
  readonly attributes: readonly { readonly name: string; readonly value: string }[]
}

const ICON_GLYPHS = JSON.parse(
  readRepoFile(join(process.cwd(), 'src', 'framework', 'dom-screen-surface', 'icon-glyphs.json'), 'utf8'),
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
  // Why: only an input really has a value; every element keeps one to keep the fake small.
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

// Spec: T-216, S-73
// Why: no case reads a color back; readTheme is a required member of the wiring,
// so the cases need a theme to build the surface, not a particular one.
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

// Why: a tiny selector engine, so a unit that did query is not failed for it.
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

// Why: style is compared declaration by declaration, as a browser may respell it;
// the geometry, which is the shape, is compared character for character.
const saidBy = (name: string, text: string | null): string =>
  name === 'style'
    ? (text ?? '')
        .split(';')
        .map((one) => one.replace(/\s+/g, ''))
        .filter((one) => one.length > 0)
        .sort()
        .join(';')
    : (text ?? '')

function drawsGlyph(shape: FakeElement, row: string): boolean {
  if (shape.getAttribute('viewBox') !== ICON_GLYPHS.viewBox) return false
  const drawn = glyphFor(row)
  const children = shape.children
  if (children.length !== drawn.length) return false
  for (const [at, element] of drawn.entries()) {
    const node = children[at] as FakeElement
    if (node.tagName.toLowerCase() !== element.tag) return false
    for (const attribute of element.attributes) {
      const drew = saidBy(attribute.name, node.getAttribute(attribute.name))
      const figure = saidBy(attribute.name, attribute.value)
      if (drew !== figure) return false
    }
  }
  return true
}

const shapesIn = (part: FakeElement): FakeElement[] =>
  selfAndDescendants(part).filter((one) => one.tagName === 'SVG')

const whatWasDrawn = (part: FakeElement): string =>
  selfAndDescendants(part)
    .map((one) => {
      const named =
        one.getAttribute('data-role') ?? one.getAttribute('data-icon') ?? one.getAttribute('viewBox') ?? '-'
      const inside =
        one.tagName === 'SVG' ? `<${one.children.map((child) => child.tagName.toLowerCase()).join(',')}>` : ''
      return `${one.tagName}[${named}]${inside}`
    })
    .join(' ; ')

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

// Why: these words are this file's own, not the dictionary's (FR-038): what they
// say is not under test, so they are made easy to search for.
const ARMED_WORD = 'ArmedWordHere'
const GROUP_WORD = 'PaletteGroupWordHere'

const entryFor = (icon: string): CommandItem => ({
  icon,
  isEnabled: true,
  isPressed: false,
  isArmed: false,
  isChosen: false,
  label: `PaletteCommandWordFor${icon}`,
})

// Why: the row IDs come from T-109, so no entry handed to the unit names a row
// minted here.
const groupOf = (entryCount: number, from = 0): PaletteGroup =>
  ({
    name: GROUP_WORD,
    commands: PALETTE_ROWS.slice(from, from + entryCount).map((row) => entryFor(row)),
  }) as PaletteGroup

// Why: the band height comes from S-135a, so nothing handed to the unit is a
// value minted here.
const paletteWith = (patch: Partial<CommandPalette> = {}): CommandPalette => ({
  at: { x: 400, y: 300 },
  grabBandHeight: GRAB_BAND_HEIGHT_PX,
  minimize: {
    icon: 'IC-75',
    label: 'IC-75',
    isEnabled: true,
    isPressed: false,
    isArmed: false,
    isChosen: false,
  },
  isMinimized: false,
  groups: [groupOf(2)],
  armedText: ARMED_WORD,
  ...patch,
})

// Why: the App Header measures to something, so BO-1 is settled and the screen is drawn.
const HEADER_HEIGHT = { 'App Header': 37 }

function drawPalette(palette: CommandPalette = paletteWith()): FakeElement {
  const built = wire(HEADER_HEIGHT)
  surfaceOf(built).showScreenView(viewWith({ commandPalette: palette }))
  return oneByRole(built.root(), U_26)
}

describe('the manuscripts still say what these cases read', () => {
  it('⭐ was really driven by the manuscripts, and not by a hollow read of them', () => {
    // Why: without this premise, a parse that picked the wrong column would make
    // every case below agree with anything.
    expect(U_26).toBe('Command Palette')
    expect(GRAB_BAND_HEIGHT_PX).toBeGreaterThan(0)
    // Why: five, because the widest description driven below asks for five entries.
    expect(PALETTE_ROWS.length).toBeGreaterThanOrEqual(5)
    expect(PALETTE_ROWS).toContain(IC_GRAB_MARKER)
    expect(ICON_GLYPHS.viewBox.length).toBeGreaterThan(0)
    expect(glyphFor(IC_GRAB_MARKER).length).toBeGreaterThan(0)
  })

  it('⛔ table T-109 still stands IC-53 on the palette, and still says it is no button', () => {
    // Why: the face column puts the shape on this surface, and not a button means no
    // CommandItem carries it, so a per-entry case cannot reach it.
    const row = T_109.rows.find((one) => one.id === IC_GRAB_MARKER)
    if (row === undefined) throw new Error(`table T-109 no longer has row ${IC_GRAB_MARKER}`)
    expect(bare(row.by['面'] ?? '')).toBe(U_26)
    expect(row.cells.join(' '), `${IC_GRAB_MARKER} is still not a button`).toContain('ボタンではない')
  })

  it('⭐ 図 F-019 draws a shape for every row table T-109 places on the palette', () => {
    // Why: read here so that a missing shape is reported against the figure rather
    // than blamed on the unit below.
    for (const row of PALETTE_ROWS) {
      expect(() => glyphFor(row), `図 F-019 draws no shape for ${row}`).not.toThrow()
    }
  })
})

// Spec: FR-029, T-109, IC-53, F-019, GR-19
// Why: where the marker sits inside the band and whether S-138 sizes it are not
// asserted: no row states either for a marker that is not an entry.
describe('FR-029 (MUST) -- IC-53 is drawn on the palette, with 図 F-019\'s shape', () => {
  it('⛔ draws the grab marker at all', () => {
    const palette = drawPalette()
    const marker = shapesIn(palette).filter((shape) => drawsGlyph(shape, IC_GRAB_MARKER))

    expect(marker.length, `FR-029 (MUST): ${whatWasDrawn(palette)}`).toBe(1)
  })

  it('draws exactly one, however many groups and entries the palette holds', () => {
    // Why: the group and entry counts are inputs, not claims: the real groups are
    // UF-65's answer, so no case here means the numbers.
    const shapes: readonly { readonly what: string; readonly palette: CommandPalette }[] = [
      { what: 'one group of one entry', palette: paletteWith({ groups: [groupOf(1)] }) },
      { what: 'one group of five entries', palette: paletteWith({ groups: [groupOf(5)] }) },
      {
        what: 'four groups of one entry',
        palette: paletteWith({ groups: [groupOf(1, 0), groupOf(1, 1), groupOf(1, 2), groupOf(1, 3)] }),
      },
    ]

    for (const { what, palette } of shapes) {
      const drawn = drawPalette(palette)
      const marker = shapesIn(drawn).filter((shape) => drawsGlyph(shape, IC_GRAB_MARKER))
      expect(marker.length, `${what}. ${whatWasDrawn(drawn)}`).toBe(1)
    }
  })
})

describe('FR-053 (MUST) / table T-023b (MUST NOT) -- what is armed reads, and no row id does', () => {
  it('prints the word it was handed for what is armed', () => {
    // Why: the armed word is the text most easily mistaken for a group caption, so this
    // case keeps a tidy-up of the palette's top from deleting it.
    const palette = drawPalette()

    expect(palette.textContent, `FR-053 (MUST): ${whatWasDrawn(palette)}`).toContain(ARMED_WORD)
  })

  it('⛔ prints no row id of table T-023b', () => {
    // Why: asked of the printed text, not the attributes: data-icon carries an IC
    // row ID by design, as the T-109 preamble says.
    const armRows = T_023b.rows.map((row) => row.id)
    const palette = drawPalette()
    const printed = palette.textContent

    for (const row of armRows) {
      expect(
        new RegExp(`(^|[^A-Za-z0-9-])${row}([^A-Za-z0-9-]|$)`).test(printed),
        `table T-023b (MUST NOT): "${printed}" prints ${row}`,
      ).toBe(false)
    }
  })

  it('⛔ prints no group caption, in a palette that prints a word at all', () => {
    // Why: read beside the armed word on purpose: the two look alike, and the risk
    // is that a tidy-up takes the wrong one away.
    const palette = drawPalette()

    expect(palette.textContent).toContain(ARMED_WORD)
    expect(palette.textContent, 'FR-053 (MUST NOT): the group caption').not.toContain(GROUP_WORD)
  })
})
