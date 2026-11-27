// Unit tests: the Command Palette group rule keeps the S-143 gap on all four sides.

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
// Why: borrowed from the contract kind, as it is the one reader that copies from the .md
// at read time, so a value that moves in table T-206 moves here too.
import { bare, bareAll, specTable } from '../contract/spec-table'
import { emptyScreenSession } from '../../src/use-case/advance-screen-session/advance-screen-session'

const T_206 = specTable('T-206')

const NAME_COLUMN = '値'
const VALUE_COLUMN = '既定'

if (!T_206.headings.includes(NAME_COLUMN) || !T_206.headings.includes(VALUE_COLUMN)) {
  throw new Error(`table T-206 no longer has both a ${NAME_COLUMN} and a ${VALUE_COLUMN} column: ${T_206.headings.join(' | ')}`)
}

const S_143_ROW = ((): (typeof T_206.rows)[number] => {
  const row = T_206.rows.find((one) => one.id === 'S-143')
  if (row === undefined) throw new Error('table T-206 no longer has row S-143')
  return row
})()

const [RULE_THICKNESS_PX, RULE_SIDE_GAP_PX] = ((): readonly [number, number] => {
  const written = bare(S_143_ROW.by[VALUE_COLUMN] ?? '')
  const found = /(-?\d+(?:\.\d+)?)\s*[×xX]\s*(-?\d+(?:\.\d+)?)/.exec(written)
  if (found === null) throw new Error(`table T-206's S-143 no longer states a pair: ${written}`)
  return [Number.parseFloat(found[1] as string), Number.parseFloat(found[2] as string)]
})()

const U_26 = ((): string => {
  const row = specTable('T-103').rows.find((one) => one.id === 'U-26')
  if (row === undefined) throw new Error('table T-103 no longer has row U-26')
  return bare(row.by['確定名（英）'] ?? '')
})()

// Why: the icons come from table T-109's palette rows, so no row id is minted here.
const PALETTE_ROWS: readonly string[] = ((): readonly string[] => {
  const table = specTable('T-109')
  return table.rows
    .filter((row) => bareAll(row.by['面'] ?? '').includes(U_26))
    .map((row) => row.id)
})()

// Why: four groups make three boundaries, enough to catch a fix that fixed some lines only.
const GROUP_COUNT = 4

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

  // Why: FR-023 forbids markup, so an innerHTML write is recorded, never obeyed.
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

// Why: readTheme is a required wiring member, so the cases need a theme to build the
// surface at all, not a particular one; no case reads a color back.
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

// Why: a small selector engine, so a unit that does query the tree is not failed for it.
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

function statesPx(value: string, px: number): boolean {
  return new RegExp(`(^|[^0-9.])${px}(\\.0+)?px(\\b|$)`).test(value)
}

const ONE_SIDED_BORDERS = ['border-top', 'border-bottom', 'border-left', 'border-right']

const PAINTS = ['background', 'background-color', 'background-image', 'border-color']

// Why: the border shorthand is not a rule: every palette entry states a frame on all
// four sides, and a framed box is not a boundary between two groups.
function isRule(node: FakeElement): boolean {
  if (node.tagName === 'HR') return true
  const declared = styleMap(node)
  for (const side of ONE_SIDED_BORDERS) {
    if (statesPx(declared.get(side) ?? '', RULE_THICKNESS_PX)) return true
    if (statesPx(declared.get(`${side}-width`) ?? '', RULE_THICKNESS_PX)) return true
  }
  const isPainted = PAINTS.some((property) => (declared.get(property) ?? '').trim() !== '')
  const isThin =
    statesPx(declared.get('height') ?? '', RULE_THICKNESS_PX) ||
    statesPx(declared.get('width') ?? '', RULE_THICKNESS_PX)
  return isPainted && isThin
}

const rulesIn = (palette: FakeElement): FakeElement[] => selfAndDescendants(palette).filter(isRule)

type Side = 'top' | 'right' | 'bottom' | 'left'
const SIDES: readonly Side[] = ['top', 'right', 'bottom', 'left']

function fourSides(tokens: readonly string[]): Partial<Record<Side, string>> | undefined {
  // Why: indexed as string, not string | undefined: the length check guarantees the index,
  // and exactOptionalPropertyTypes refuses an explicit undefined in an optional property.
  if (tokens.length === 1) {
    const one = tokens[0] as string
    return { top: one, right: one, bottom: one, left: one }
  }
  if (tokens.length === 2) {
    const vertical = tokens[0] as string
    const horizontal = tokens[1] as string
    return { top: vertical, bottom: vertical, right: horizontal, left: horizontal }
  }
  if (tokens.length === 3) {
    const top = tokens[0] as string
    const horizontal = tokens[1] as string
    const bottom = tokens[2] as string
    return { top, right: horizontal, left: horizontal, bottom }
  }
  if (tokens.length === 4) {
    return { top: tokens[0] as string, right: tokens[1] as string, bottom: tokens[2] as string, left: tokens[3] as string }
  }
  return undefined
}

function marginEffects(property: string, value: string): Partial<Record<Side, string>> {
  const prop = property.toLowerCase()
  const declared = value.trim()
  if (prop === 'margin-top' || prop === 'margin-block-start') return { top: declared }
  if (prop === 'margin-bottom' || prop === 'margin-block-end') return { bottom: declared }
  if (prop === 'margin-left' || prop === 'margin-inline-start') return { left: declared }
  if (prop === 'margin-right' || prop === 'margin-inline-end') return { right: declared }
  const tokens = declared.split(/\s+/).filter((one) => one.length > 0)
  if (prop === 'margin') return fourSides(tokens) ?? {}
  if (prop === 'margin-block') {
    if (tokens.length === 1) return { top: tokens[0] as string, bottom: tokens[0] as string }
    if (tokens.length === 2) return { top: tokens[0] as string, bottom: tokens[1] as string }
  }
  if (prop === 'margin-inline') {
    if (tokens.length === 1) return { left: tokens[0] as string, right: tokens[0] as string }
    if (tokens.length === 2) return { left: tokens[0] as string, right: tokens[1] as string }
  }
  return {}
}

// Why: a reset clears every side first, as writing the whole style attribute replaces
// what came before it.
function effectiveMarginPx(node: FakeElement): Readonly<Record<Side, string | undefined>> {
  const value: Partial<Record<Side, string>> = {}
  const apply = (property: string, declared: string): void => {
    const effects = marginEffects(property, declared)
    for (const side of SIDES) {
      if (effects[side] !== undefined) value[side] = effects[side]
    }
  }
  for (const write of node.styleWrites) {
    if (write.kind === 'reset') {
      for (const side of SIDES) delete value[side]
      for (const one of write.css.split(';')) {
        const at = one.indexOf(':')
        if (at < 0) continue
        apply(one.slice(0, at).trim(), one.slice(at + 1).trim())
      }
      continue
    }
    apply(write.property, write.value)
  }
  return { top: value.top, right: value.right, bottom: value.bottom, left: value.left }
}

const whatWasDrawn = (palette: FakeElement): string =>
  selfAndDescendants(palette)
    .map(
      (one) =>
        `${one.tagName}[${one.getAttribute('data-role') ?? one.getAttribute('data-icon') ?? '-'}]` +
        `={${styleOf(one)}}`,
    )
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

const groupWord = (at: number): string => `IsotropicGapGroupWord${at}`

const entryFor = (icon: string): CommandItem => ({
  icon,
  isEnabled: true,
  isPressed: false,
  isArmed: false,
  isChosen: false,
  label: `IsotropicGapCommandWordFor${icon}`,
})

const paletteOf = (groupCount: number): CommandPalette => ({
  at: { x: 400, y: 300 },
  grabBandHeight: 0,
  minimize: {
    icon: 'IC-75',
    label: 'IC-75',
    isEnabled: true,
    isPressed: false,
    isArmed: false,
    isChosen: false,
  },
  isMinimized: false,
  groups: Array.from(
    { length: groupCount },
    (_absent, at): PaletteGroup => ({
      name: groupWord(at),
      commands: [entryFor(PALETTE_ROWS[at] as string)],
    }),
  ),
  armedText: 'IsotropicGapArmedWord',
})

// Why: the App Header must measure to something, or BO-1's dimension is unsettled.
const HEADER_HEIGHT = { 'App Header': 37 }

function drawPalette(): FakeElement {
  const built = wire(HEADER_HEIGHT)
  surfaceOf(built).showScreenView(viewWith({ commandPalette: paletteOf(GROUP_COUNT) }))
  return oneByRole(built.root(), U_26)
}

// Spec: S-143, U-26
describe('the manuscript still says what these cases read', () => {
  it('⭐ was really driven by the manuscript, and not by a hollow read of it', () => {
    // Why: without this, a parse that picked up the wrong column lets every case below agree with anything.
    expect(bare(S_143_ROW.by[VALUE_COLUMN] ?? '')).toContain('px')
    expect(RULE_THICKNESS_PX).toBeGreaterThan(0)
    expect(RULE_SIDE_GAP_PX).toBeGreaterThan(0)
    expect(RULE_THICKNESS_PX, 'S-143 states two different numbers').not.toBe(RULE_SIDE_GAP_PX)
    expect(U_26).toBe('Command Palette')
    expect(PALETTE_ROWS.length).toBeGreaterThanOrEqual(GROUP_COUNT)
  })

  it('⛔ states the 2026-08-29 ruling: the gap is now isotropic, not left/right only', () => {
    // Why: a tripwire: a later edit that reverted the ruling in the manuscript turns this red.
    // Trap: bare() returns only the first backtick span, and the ruling's wording lives in
    // the prose around it.
    const name = S_143_ROW.by[NAME_COLUMN] ?? ''
    const remark = S_143_ROW.cells.join(' ')
    expect(name, 'S-143 is still the row about the group rule (`FR-053`)').toContain('FR-053')
    expect(name, 'S-143’s own name states an all-around gap, not a left/right one').toContain('まわり')
    expect(name, 'the pre-ruling wording ("左右の空き") must be gone').not.toContain('左右の空き')
    expect(remark, '2026-08-29’s ruling text is still attached to this row').toContain('上下左右')
  })
})

// Spec: S-143, FR-053
// Why: there is no DOM here, so only inline declarations are seen; a gap set by a style
// sheet or by padding on a wrapper is invisible to these cases.
// Why: no row names a color for this line (the color FR-053 does name, through EN-1,
// is the armed entry's), so no case asserts one.
describe('S-143 (利用者の裁定 2026-08-29) -- the gap reaches every side of the line', () => {
  it('draws each boundary at S-143’s exact thickness', () => {
    const palette = drawPalette()
    const rules = rulesIn(palette)
    expect(
      rules.length,
      `${GROUP_COUNT} groups should draw ${GROUP_COUNT - 1} boundaries of S-143's ${RULE_THICKNESS_PX}px. ${whatWasDrawn(palette)}`,
    ).toBe(GROUP_COUNT - 1)
  })

  it('insets each boundary by S-143’s second number on ALL FOUR sides -- top and bottom included', () => {
    // Why: the ruling makes the same number reach all four sides and mints no new one, so
    // RULE_SIDE_GAP_PX is checked on every side rather than a second constant.
    const palette = drawPalette()
    const rules = rulesIn(palette)

    expect(rules.length, `no boundary was drawn at all. ${whatWasDrawn(palette)}`).toBeGreaterThan(0)

    for (const rule of rules) {
      const gaps = effectiveMarginPx(rule)
      for (const side of SIDES) {
        expect(
          statesPx(gaps[side] ?? '', RULE_SIDE_GAP_PX),
          `${side} margin of a boundary line: states ${JSON.stringify(gaps[side]) ?? 'nothing'}, ` +
            `wanted ${RULE_SIDE_GAP_PX}px. ${styleOf(rule)}`,
        ).toBe(true)
      }
    }
  })
})
