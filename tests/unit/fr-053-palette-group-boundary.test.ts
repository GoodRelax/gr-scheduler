// FR-053 (MUST): the boundary between two groups of the palette is shown by a
// LINE -- and (MUST NOT) the group's caption is not printed.
//
// Unit under test: UF-71 of table T-075 (`dom-screen-surface.ts`, component
// CP-38 of table T-062, published as PI-38 of table T-064). It is the side of
// IF-9 that turns a `ScreenView` into nodes, so it is the side that draws a
// line at all -- UF-65 (`command-palette.ts`) says WHICH groups there are and
// carries no rule of its own.
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these cases have no node
// in the specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// ---------------------------------------------------------------------------
// The rules these cases answer to
// ---------------------------------------------------------------------------
//
//   FR-053   ⛔ 「入口の群の見出しを画面に刷ってはならない（MUST NOT）。群の境目
//            は線で示すこと（MUST）。」線の太さと左右の空きは 表 T-206 の
//            `S-143` が持つ。
//            ⭐ 「群の名は `_assets/tbl-glossary.md` の 表 T-109 の `群` の欄が
//            持ち、あれは並べる順のためだけに在る。」
//            ⭐ 「`FR-029` が「用途を言葉ではなくアイコンで伝える」と定めており、
//            見出しは言葉である。」
//            ⚠️ 「線であって文字ではない —— 文字にすると `FR-038` の表示語になり、
//            言語ごとに持つことになる。」
//            ⛔ 「ヘルプ（`FR-036`）は入口を語で並べるので、群の語そのものは残す。
//            消えるのはパレットに刷ることだけである。」
//   S-143    表 T-206、「パレットの群を隔てる線の太さと左右の空き」 —— ⛔ 「線で
//            あって文字ではない」。⚠️ 「図形でもない」ので 表 T-109 の行も
//            図 F-019 の図形も要らない。
//   S-135a   表 T-206、`Command Palette` の掴み帯の高さ。⭐ Read here only so
//            that the band this unit always draws cannot be mistaken for a
//            group boundary by the reader below; no case asserts it.
//   T-103    U-26 `Command Palette`, the settled name W-4 of table T-006a
//            (MUST) carries into the DOM as a `data-role`.
//
// ---------------------------------------------------------------------------
// ⛔ HOW THE EXPECTED VALUES WERE OBTAINED (docs/development-rules/
// 04-verification.md, section 1)
// ---------------------------------------------------------------------------
//
// What was read: docs/spec/ for every rule above, docs/development-rules/, and
// of `src/` nothing but the exported declarations these cases must call or
// name -- `domScreenSurface`, `ScreenSurfaceWiring`, `ScreenTheme`, the
// `ScreenView` family and `SETTINGS_DEFAULTS`. ⛔ NO BODY WAS READ, and in
// particular nothing was read about which CSS property this unit states a rule
// in, nor whether it states one at all. Every number below comes from a table.
//
// ⭐ THE SHAPE IS COPIED, NOT INVENTED. The fake browser, `stage` / `wiringOf` /
// `wire` / `surfaceOf`, the tree readers (`styleMap`, `inlineStyle`, `styleOf`,
// `descendants`, `selfAndDescendants`, `byRole`, `oneByRole`, `matches`) and
// the `ScreenView` fixtures are copied from tests/unit/fr-006-panel-typography
// .test.ts, which copied them from tests/unit/uf-71.test.ts -- the file that
// drives this same unit against this same fake.
//
// ---------------------------------------------------------------------------
// ⛔ WHAT THESE CASES CAN AND CANNOT SEE, SO NO FAILURE IS MISREAD
// ---------------------------------------------------------------------------
//
// `npm test` runs under Node with no DOM (vitest.config.ts sets `environment:
// 'node'`), so there is no layout engine here and no computed style. What the
// fake records is what the unit WROTE: inline declarations, in order. So a rule
// that arrived through a style sheet would be invisible here -- ⚠️ REPORT that,
// do not tune the case. The neighbours' evidence is that this unit styles
// inline and that there is no `.css` file under `src/` at all.
//
// ⛔ WHAT COUNTS AS A LINE, AND WHY IT IS A LIST RATHER THAN ONE PROPERTY.
// FR-053 states 「線で示すこと」 and S-143 states its thickness and its side
// gaps; ⛔ NO TABLE NAMES A CSS PROPERTY, and PD-151 already records that the
// choice of property belongs to the drawing side. So `isRule` below accepts
// every spelling of a hairline that states S-143's thickness -- a one-sided
// border, a painted box that is that thin, or an `hr` -- and a rule spelled
// some other way again (a gradient, a pseudo-element, a shadow) would fail
// here for the wording rather than for the rule. ⚠️ REPORTED RATHER THAN
// LOOSENED, the same bargain tests/unit/fr-006-panel-typography.test.ts strikes
// with S-189: a palette that draws no boundary at all is the defect FR-053's
// MUST names, and a reader who cannot see where one group ends is what the
// requirement is for.
//
// ⚠️ WHAT IS DELIBERATELY NOT ASSERTED:
//   1. HOW MANY GROUPS THE PALETTE HAS. That is table T-109's fact and UF-65's
//      answer, and tests/unit/uf-65.test.ts is the bench that holds it. This
//      unit draws the groups it is handed, so the cases here drive it with one,
//      two, three and four and ask for one boundary fewer than there are
//      groups -- which is what makes the real palette's four groups three
//      lines.
//   2. WHERE THE LINE STANDS -- above the group, below it, or between the two
//      boxes. No row states it, and there is no layout engine here to ask.
//   3. WHAT COLOUR THE LINE IS. Table T-236 holds no row for it; S-143 states a
//      thickness and a gap and says in as many words that it holds nothing
//      else.

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
import { SETTINGS_DEFAULTS } from '../../src/entity/document-model/document-settings/document-settings'
import {
  domScreenSurface,
  type ScreenSurfaceWiring,
  type ScreenTheme,
} from '../../src/framework/dom-screen-surface/dom-screen-surface'
// ⭐ Borrowed from the contract kind on purpose: it is the one reader that takes
// its copy from the .md at read time, so a value that moves in table T-206
// moves here too instead of going stale.
import { bare, specTable } from '../contract/spec-table'

// ---------------------------------------------------------------------------
// The manuscript, read at run time rather than copied here (Chapter 1.9 :275).
// ---------------------------------------------------------------------------

const T_206 = specTable('T-206')

/** The column of table T-206 that holds the value itself. */
const VALUE_COLUMN = '既定'

if (!T_206.headings.includes(VALUE_COLUMN)) {
  throw new Error(`table T-206 no longer has a ${VALUE_COLUMN} column: ${T_206.headings.join(' | ')}`)
}

/** One row's value cell, as the table writes it. */
function cellOf(id: string): string {
  const row = T_206.rows.find((one) => one.id === id)
  if (row === undefined) throw new Error(`table T-206 no longer has row ${id}`)
  return bare(row.by[VALUE_COLUMN] ?? '')
}

/**
 * S-143 -- 「線の太さと左右の空き」, which the cell writes as one pair.
 *
 * ⚠️ The cell carries the two numbers with a `×` between them, the way S-188
 * and S-192 write a pair in the same column; they are read out of it rather
 * than the cell parsed whole.
 */
const [RULE_THICKNESS_PX, RULE_SIDE_GAP_PX] = ((): readonly [number, number] => {
  const written = cellOf('S-143')
  const found = /(-?\d+(?:\.\d+)?)\s*[×xX]\s*(-?\d+(?:\.\d+)?)/.exec(written)
  if (found === null) throw new Error(`table T-206's S-143 no longer states a pair: ${written}`)
  return [Number.parseFloat(found[1] as string), Number.parseFloat(found[2] as string)]
})()

/** S-135a -- the band this unit lays along the palette's top edge on every frame. */
const GRAB_BAND_HEIGHT_PX = ((): number => {
  const written = cellOf('S-135a')
  const found = /-?\d+(?:\.\d+)?/.exec(written)
  if (found === null) throw new Error(`table T-206's S-135a states no number: ${written}`)
  return Number.parseFloat(found[0] as string)
})()

/** U-26 of table T-103 -- the settled name that reaches the DOM as `data-role`. */
const U_26 = ((): string => {
  const row = specTable('T-103').rows.find((one) => one.id === 'U-26')
  if (row === undefined) throw new Error('table T-103 no longer has row U-26')
  return bare(row.by['確定名（英）'] ?? '')
})()

/**
 * Rows table T-109 places on the palette, in the table's own print order -- the
 * icons these cases hand the unit, so that no row id is minted here.
 */
const PALETTE_ROWS: readonly string[] = ((): readonly string[] => {
  const table = specTable('T-109')
  return table.rows
    .filter((row) => bare(row.by['面'] ?? '') === U_26)
    .map((row) => row.id)
})()

// ---------------------------------------------------------------------------
// The fake browser. Copied from tests/unit/uf-71.test.ts.
// ---------------------------------------------------------------------------

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

/** One write to an element's inline style, in the order the unit made it. */
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
  /** Only an `input` really has one; harmless elsewhere and it keeps the fake small. */
  value = ''
  isMount = false

  constructor(
    tagName: string,
    private readonly world: World,
  ) {
    this.tagName = tagName.toUpperCase()
  }

  // -- attributes ---------------------------------------------------------

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

  /** ⛔ FR-023: an assignment here would be markup. It is recorded, never obeyed. */
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

  // -- the tree -----------------------------------------------------------

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

  // -- what only a browser can answer -------------------------------------

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

  // -- events -------------------------------------------------------------

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
  /** Every number `onAppHeaderHeightPx` was told, in order. */
  readonly reportedHeights: number[]
  clockMs: number
  author: string
  surface: ScreenSurface | undefined
  /** The tree the unit built inside the mount. */
  root(): FakeElement
}

/** A browser that is only what `ScreenSurfaceWiring` says it is. */
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

/**
 * The rendering and hue every case below wires the surface with.
 *
 * ⛔ NEITHER VALUE IS TYPED HERE (rule 03 section 1): S-72's default arrives
 * through the generated `SETTINGS_DEFAULTS` and S-73's is read out of table
 * T-216 at load time. ⭐ No case reads a colour back -- `readTheme` is a
 * REQUIRED member of `ScreenSurfaceWiring`, so the cases need a theme to build
 * the surface at all, not a particular one.
 */
const S_73 = specTable('T-216').rows.find((row) => row.id === 'S-73')
if (S_73 === undefined) throw new Error('table T-216 no longer has row S-73')
const THEME: ScreenTheme = {
  preference: SETTINGS_DEFAULTS['themePreference'] as ScreenTheme['preference'],
  hue: Number(bare(S_73.by['既定'] ?? '')),
}

function wiringOf(built: Stage): ScreenSurfaceWiring {
  return {
    host: built.host,
    mount: built.mount as unknown as Element,
    readAuthor: (): string => built.author,
    readClockMs: (): number => built.clockMs,
    onAppHeaderHeightPx: (heightPx: number): void => {
      built.reportedHeights.push(heightPx)
    },
    readTheme: (): ScreenTheme => THEME,
  }
}

/** Wire the unit up the way contract line 1 asks the caller to. */
function wire(heightsByRole: Record<string, number> = {}): Stage {
  const built = stage(heightsByRole)
  built.surface = domScreenSurface(wiringOf(built))
  return built
}

function surfaceOf(built: Stage): ScreenSurface {
  if (built.surface === undefined) throw new Error('the surface was not built')
  return built.surface
}

// ---------------------------------------------------------------------------
// Reading the tree the unit built. Copied from tests/unit/uf-71.test.ts.
// ---------------------------------------------------------------------------

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

/** The inline style as it stands now, with later writes winning over earlier ones. */
function inlineStyle(element: FakeElement): string {
  return [...styleMap(element)].map(([property, value]) => `${property}:${value}`).join(';')
}

/** ⚠️ Whitespace-free and lower case, so a message never depends on how a value was spaced. */
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

/**
 * A tiny selector engine: enough for `[attr]`, `[attr="value"]`, a tag name and
 * a descendant combinator. ⭐ It exists so that a unit which DID query is not
 * failed for it.
 */
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

// ---------------------------------------------------------------------------
// Reading a line out of what was written, which is the whole of this file.
// ---------------------------------------------------------------------------

/** Whether one declaration states this many px -- `11px` never counts as `1px`. */
function statesPx(value: string, px: number): boolean {
  return new RegExp(`(^|[^0-9.])${px}(\\.0+)?px(\\b|$)`).test(value)
}

/** The four ways a box states a rule down ONE of its sides. */
const ONE_SIDED_BORDERS = ['border-top', 'border-bottom', 'border-left', 'border-right']

/** The declarations that make a box VISIBLE, so that a thin one reads as a line. */
const PAINTS = ['background', 'background-color', 'background-image', 'border-color']

/**
 * Whether this node is a line of S-143's thickness.
 *
 * ⛔ THE `border` SHORTHAND IS NOT ONE. Every entry of the palette already
 * states a frame on all four sides, and a box with a frame is not a boundary
 * between two groups -- so only a rule down a single side counts.
 */
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

/** The ways a box states the room to its left and right. */
const HORIZONTAL_MARGINS = [
  'margin',
  'margin-left',
  'margin-right',
  'margin-inline',
  'margin-inline-start',
  'margin-inline-end',
]

const sideGapsOf = (node: FakeElement): string[] => {
  const declared = styleMap(node)
  return HORIZONTAL_MARGINS.map((property) => declared.get(property) ?? '').filter(
    (written) => written.trim() !== '',
  )
}

/** Everything a failure needs to be read without opening the unit. */
const whatWasDrawn = (palette: FakeElement): string =>
  selfAndDescendants(palette)
    .map(
      (one) =>
        `${one.tagName}[${one.getAttribute('data-role') ?? one.getAttribute('data-icon') ?? '-'}]` +
        `={${styleOf(one)}}`,
    )
    .join(' ; ')

// ---------------------------------------------------------------------------
// Descriptions to draw. Every one is a value of `ScreenView` and nothing else.
// The shape is tests/unit/fr-006-panel-typography.test.ts's.
// ---------------------------------------------------------------------------

const EMPTY_HEADER: AppHeaderItems = {
  documentTitle: null,
  autosaveStatus: { kind: 'saving' },
  commands: [],
  language: 'ja',
}

const EMPTY_FRAME: ScreenFrame = { isFullScreen: false, dividers: [], scrollbars: [] }

const EMPTY_VIEW: ScreenView = {
  language: 'ja',
  frame: EMPTY_FRAME,
  appHeaderItems: EMPTY_HEADER,
  rowTitlePanel: { pinnedTitles: [], titles: [] },
  propertiesPanel: null,
  commandPalette: null,
  openModal: null,
  notices: [],
  confirmation: null,
  dialogueField: null,
  tooltips: [],
}

const viewWith = (patch: Partial<ScreenView>): ScreenView => ({ ...EMPTY_VIEW, ...patch })

/**
 * ⚠️ EVERY WORD BELOW IS THIS FILE'S OWN and no case reads one as the
 * manuscript's. FR-038 (MUST) holds the words the screen prints in one
 * dictionary per language, and what a group is CALLED is not what this file is
 * about -- these are strings distinctive enough to be searched for.
 */
const groupWord = (at: number): string => `PaletteGroupWordNumber${at}`

/** The one word FR-053 (MUST) does have this palette print, so the reader below is not blind. */
const ARMED_WORD = 'ArmedWordHere'

const entryFor = (icon: string): CommandItem => ({
  icon,
  isEnabled: true,
  isPressed: false,
  isArmed: false,
  label: `PaletteCommandWordFor${icon}`,
})

/**
 * A palette of `groupCount` groups, one entry in each.
 *
 * ⭐ THE ROW IDS COME FROM TABLE T-109 and the band's height from S-135a, so
 * that nothing this unit is handed is a value minted here. ⚠️ The band is why
 * S-135a is read at all: it is drawn on every frame the palette is, and a
 * reader that counted it as a boundary would answer one too many.
 */
const paletteOf = (groupCount: number): CommandPalette => ({
  at: { x: 400, y: 300 },
  grabBandHeight: GRAB_BAND_HEIGHT_PX,
  groups: Array.from(
    { length: groupCount },
    (_absent, at): PaletteGroup => ({
      name: groupWord(at),
      commands: [entryFor(PALETTE_ROWS[at] as string)],
    }),
  ),
  armedText: ARMED_WORD,
})

/** The App Header measures to something, so BO-1's dimension is settled and the screen is drawn. */
const HEADER_HEIGHT = { 'App Header': 37 }

/** How many groups the cases below drive with. ⭐ Not a count of the real palette. */
const GROUP_COUNTS = [1, 2, 3, 4]

/** The `Command Palette` this unit drew, for a description of that many groups. */
function drawPalette(groupCount: number): FakeElement {
  const built = wire(HEADER_HEIGHT)
  surfaceOf(built).showScreenView(viewWith({ commandPalette: paletteOf(groupCount) }))
  return oneByRole(built.root(), U_26)
}

// ===========================================================================

describe('the manuscript still says what these cases read', () => {
  it('⭐ was really driven by the manuscript, and not by a hollow read of it', () => {
    // ⛔ WITHOUT THIS, A PARSE THAT PICKED UP THE WRONG COLUMN WOULD MAKE EVERY
    // CASE BELOW AGREE WITH ANYTHING -- rule 04 section 2: a mechanism is not
    // verified until it has been broken on purpose and seen to fail.
    expect(cellOf('S-143')).toContain('px')
    expect(RULE_THICKNESS_PX).toBeGreaterThan(0)
    expect(RULE_SIDE_GAP_PX).toBeGreaterThan(0)
    expect(RULE_THICKNESS_PX, 'S-143 states two different numbers').not.toBe(RULE_SIDE_GAP_PX)
    expect(GRAB_BAND_HEIGHT_PX, 'the band cannot be mistaken for a rule').not.toBe(RULE_THICKNESS_PX)
    expect(U_26).toBe('Command Palette')
    expect(PALETTE_ROWS.length).toBeGreaterThanOrEqual(Math.max(...GROUP_COUNTS))
  })

  it('⛔ S-143 is the thickness of a LINE and not the size of a shape', () => {
    // S-143's own note: ⛔ 「線であって文字ではない。理由は `FR-053` が持つ。」
    // ⚠️ 「図形でもない」ので 表 T-109 の行も 図 F-019 の図形も要らない —— so a
    // boundary drawn as one more entry of table T-109 would be the reading this
    // row exists to refuse.
    const row = T_206.rows.find((one) => one.id === 'S-143')
    if (row === undefined) throw new Error('table T-206 no longer has row S-143')
    expect(row.cells.join(' '), 'S-143 is still the row about a line between groups').toContain('線')
  })
})

describe('FR-053 (MUST) -- the boundary between two groups is shown by a line', () => {
  it('draws one line for every boundary, and none where there is no boundary', () => {
    // ⛔ 「群の境目は線で示すこと（MUST）」. A boundary is what stands BETWEEN two
    // groups, so a palette of one group has none and a palette of four has
    // three -- which is what the real palette's four groups come to.
    // ⚠️ The caption used to do this work and FR-053 (MUST NOT) stopped it on
    // 2026-08-25; a palette that prints no caption AND draws no line leaves a
    // reader with no way to see where one group ends and the next begins.
    for (const groups of GROUP_COUNTS) {
      const palette = drawPalette(groups)
      const rules = rulesIn(palette)
      expect(rules.length, `${groups} groups. ${whatWasDrawn(palette)}`).toBe(groups - 1)
    }
  })

  it('insets every line by the side gap S-143 states', () => {
    // 「線の太さと左右の空きは 表 T-206 の `S-143` が持つ」 -- the gap is the
    // second half of that row and is as much of the MUST as the thickness.
    // ⚠️ THIS IS THE ARGUABLE CASE IN THIS FILE, for the reason the head comment
    // gives: no table names the property, so the gap is looked for in the
    // horizontal margins of the line itself. ⛔ Left failing rather than
    // loosened -- a rule that reaches the palette's own edges is not the rule
    // S-143 describes.
    const palette = drawPalette(Math.max(...GROUP_COUNTS))
    const rules = rulesIn(palette)

    expect(rules.length, `no line was drawn at all. ${whatWasDrawn(palette)}`).toBeGreaterThan(0)
    for (const rule of rules) {
      const gaps = sideGapsOf(rule)
      expect(
        gaps.some((written) => statesPx(written, RULE_SIDE_GAP_PX)),
        `${styleOf(rule)} states ${gaps.join(' | ') || 'no horizontal margin'}`,
      ).toBe(true)
    }
  })
})

describe("FR-053 (MUST NOT) -- the group's caption is not printed", () => {
  it('prints the word of no group, in a palette that prints a word at all', () => {
    // ⛔ 「入口の群の見出しを画面に刷ってはならない（MUST NOT）」 —— 「`FR-029` が
    // 「用途を言葉ではなくアイコンで伝える」と定めており、見出しは言葉である。」
    // ⭐ The armed word is asserted first so that this case cannot pass by being
    // unable to read printed text at all (rule 04 section 2).
    const palette = drawPalette(Math.max(...GROUP_COUNTS))

    expect(palette.textContent, 'FR-053 (MUST): what is armed is readable').toContain(ARMED_WORD)
    for (const at of GROUP_COUNTS.map((one) => one - 1)) {
      expect(palette.textContent, `the caption of group ${at}`).not.toContain(groupWord(at))
    }
  })
})
