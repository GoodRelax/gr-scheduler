// FR-029 (MUST): IC-53 -- the marker that shows the `Command Palette` can be
// grabbed and moved -- is DRAWN on the palette, with the shape 図 F-019 gives
// it. And table T-023b (MUST NOT): no arm's row id is printed there.
//
// Unit under test: UF-71 of table T-075 (`dom-screen-surface.ts`, component
// CP-38 of table T-062). It is the side of IF-9 that turns a `ScreenView` into
// nodes, so it is the side that draws a shape at all -- UF-65
// (`command-palette.ts`) says the band is there and how far down it reaches,
// and carries no shape.
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these cases have no node
// in the specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// ---------------------------------------------------------------------------
// ⛔ WHY THIS FILE EXISTS -- THE HOLE IT WAS WRITTEN TO STAND IN
// ---------------------------------------------------------------------------
//
// IC-53 is answered for and it is described, but nothing asked whether it is
// DRAWN:
//
//   tests/unit/uf-65.test.ts        the description carries a band, S-135a tall
//   tests/unit/uf-72-screen-part.test.ts  a point on the band answers IC-53,
//                                   and beats whatever is drawn beneath it
//   tests/unit/uf-71.test.ts        every `CommandItem` draws 図 F-019's shape
//                                   -- ⛔ AND IC-53 IS NOT A `CommandItem`.
//                                   Table T-109 says 「ボタンではない」 and
//                                   uf-65 holds the palette to leaving it out
//                                   of the entries.
//
// ⭐ So IC-53 falls between the two: it is a row of table T-109 with a shape in
// 図 F-019 and a 面 that reads `Command Palette`, and it is the one such row no
// case follows onto the page. FR-029 (MUST) binds BOTH halves -- the roster and
// the placement to the table, the shape to the figure -- and says why in its
// own RATIONALE: 「無反応だと故障に見える。操作できるものが操作できるように見え
// ること ... はアフォーダンスとシグニファイアの基本である。」 A band that can be
// grabbed but shows nothing is exactly the thing that RATIONALE refuses.
//
// ---------------------------------------------------------------------------
// The rules these cases answer to
// ---------------------------------------------------------------------------
//
//   FR-029   ⭐ 「アイコンの名簿と置き場は `_assets/tbl-glossary.md` の 表 T-109
//            に、各アイコンの図形は同書の 図 F-019 に従うこと（MUST）。図形を描く
//            箱の一辺は ... `S-138` に従うこと（MUST）。載る面によって変えてはな
//            らない（MUST NOT）」
//            ⛔ 「図 F-019 の図形を第三者のアイコン集から差し替えてはならない
//            （MUST NOT）」
//   T-109    IC-53 | `Command Palette` | — | 「掴んで動かせることを示す。**ボタン
//            ではない**」 | `FR-053` | —
//            ⭐ its preamble: 「⭐ 図形を持たない行は無い —— 全 74 行が 図 F-019
//            に図形を持つ。」
//   GR-19    表 T-023d, printed FIRST under 「上の行ほど優先すること（MUST）」:
//            「`Command Palette` の掴み帯 | **パレットの上端に敷く帯**（高さは
//            ... `S-135a`）| 掴めばパレットを動かす（`FR-053`）」
//   FR-053   ⭐ 「いま構えているものが画面上で読めること（MUST）。」
//            ⛔ 「入口の群の見出しを画面に刷ってはならない（MUST NOT）。」
//   T-023b   ⭐ its closing rule: 「⛔ 行 ID そのものを画面に刷ってはならない
//            （MUST NOT）。」
//   T-103    U-26 `Command Palette` -- the settled name that reaches the DOM as
//            a `data-role`.
//
// ---------------------------------------------------------------------------
// ⛔ HOW THE EXPECTED VALUES WERE OBTAINED (docs/development-rules/
// 04-verification.md, section 1)
// ---------------------------------------------------------------------------
//
// What was read: docs/spec/ for every rule above, docs/development-rules/, and
// of `src/` nothing but the exported declarations these cases must call or name
// -- `domScreenSurface`, `ScreenSurfaceWiring`, `ScreenTheme`, the `ScreenView`
// family and `SETTINGS_DEFAULTS` -- plus `icon-glyphs.json`, which is 図 F-019
// as it reaches `src/` and is read, not copied, for the reason
// tests/unit/uf-71.test.ts gives.
// ⛔ NO BODY WAS READ. In particular nothing was read about WHERE inside the
// palette the marker is put, and no case below asks.
//
// ⭐ THE SHAPE IS COPIED, NOT INVENTED. The fake browser, `stage` / `wiringOf` /
// `wire` / `surfaceOf`, the tree readers and the `ScreenView` fixtures are
// copied from tests/unit/fr-053-palette-group-boundary.test.ts, which copied
// them from tests/unit/uf-71.test.ts -- the file that drives this same unit
// against this same fake.
//
// ---------------------------------------------------------------------------
// ⚠️ WHAT IS DELIBERATELY NOT ASSERTED, each searched for before being given up
// ---------------------------------------------------------------------------
//
//   1. WHERE THE MARKER SITS INSIDE THE BAND -- left, centre or right. ⛔ NO ROW
//      STATES IT. GR-19 states where the BAND goes 「パレットの上端に敷く帯」 and
//      表 T-206's `S-135a` how far down it reaches; table T-109 gives IC-53 an
//      em dash for its 群, so not even the ordering column speaks for it. ⚠️ This
//      is the row `docs/development-records/defects.md` D-68 turns on -- the
//      user asked for it at the TOP RIGHT on 2026-08-27 -- and it is exactly
//      what a tester reading only docs/spec cannot assert. Reported, not
//      invented.
//   2. HOW BIG THE MARKER IS DRAWN. FR-029 (MUST) sends the box's side to
//      `S-138` and (MUST NOT) forbids it varying by surface, and
//      tests/unit/uf-71.test.ts is the bench that holds every entry to it. ⛔ It
//      holds `CommandItem`s, and IC-53 is not one, so whether S-138 governs a
//      marker that is not an entry is a reading no row settles.
//   3. THE BAND'S OWN HEIGHT IN THE PAGE. `S-135a` reaches this unit through
//      `CommandPalette.grabBandHeight`, and tests/unit/uf-65.test.ts is the
//      bench that holds the described band to the manuscript.

import { readFileSync } from 'node:fs'
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
import { SETTINGS_DEFAULTS } from '../../src/entity/document-model/document-settings/document-settings'
import {
  domScreenSurface,
  type ScreenSurfaceWiring,
  type ScreenTheme,
} from '../../src/framework/dom-screen-surface/dom-screen-surface'
// ⭐ Borrowed from the contract kind on purpose: it is the one reader that takes
// its copy from the .md at read time, so a value that moves in a table moves
// here too instead of going stale.
import { bare, specTable } from '../contract/spec-table'

// ---------------------------------------------------------------------------
// The manuscripts, read at run time rather than copied here (Chapter 1.9 :275).
// ---------------------------------------------------------------------------

const T_206 = specTable('T-206')
const T_109 = specTable('T-109')
const T_023b = specTable('T-023b')

/** U-26 of table T-103 -- the settled name that reaches the DOM as `data-role`. */
const U_26 = ((): string => {
  const row = specTable('T-103').rows.find((one) => one.id === 'U-26')
  if (row === undefined) throw new Error('table T-103 no longer has row U-26')
  return bare(row.by['確定名（英）'] ?? '')
})()

/** S-135a -- the band GR-19 lays along the palette's top edge. */
const GRAB_BAND_HEIGHT_PX = ((): number => {
  const row = T_206.rows.find((one) => one.id === 'S-135a')
  if (row === undefined) throw new Error('table T-206 no longer has row S-135a')
  const found = /-?\d+(?:\.\d+)?/.exec(bare(row.by['既定'] ?? ''))
  if (found === null) throw new Error('table T-206\'s S-135a states no number')
  return Number.parseFloat(found[0] as string)
})()

/** The row of table T-109 that shows the palette can be grabbed. */
const IC_GRAB_MARKER = 'IC-53'

/** Rows table T-109 places on the palette, in the table's own print order. */
const PALETTE_ROWS: readonly string[] = T_109.rows
  .filter((row) => bare(row.by['面'] ?? '') === U_26)
  .map((row) => row.id)

/**
 * 図 F-019 -- the authority FR-029 names for every icon's shape (MUST), as it
 * reaches `src/`.
 *
 * ⭐ READ, NOT COPIED, AND NOT INVENTED HERE, for the reason
 * tests/unit/uf-71.test.ts gives at length: `docs/spec/_assets/fig-icons.svg` is
 * the figure, `tools/generate_icon_glyphs.py` carries it into this file
 * cross-checked against table T-109, and `npm run gen:check` is what fails when
 * the figure moves on without it.
 */
interface GlyphElement {
  readonly tag: string
  readonly attributes: readonly { readonly name: string; readonly value: string }[]
}

const ICON_GLYPHS = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'adapter', 'screen-renderer', 'icon-glyphs.json'), 'utf8'),
) as {
  readonly viewBox: string
  readonly glyphs: readonly { readonly rowId: string; readonly elements: readonly GlyphElement[] }[]
}

const glyphFor = (row: string): readonly GlyphElement[] => {
  const found = ICON_GLYPHS.glyphs.find((one) => one.rowId === row)
  if (found === undefined) throw new Error(`図 F-019 draws no shape for ${row}`)
  return found.elements
}

// ---------------------------------------------------------------------------
// The fake browser. Copied from tests/unit/fr-053-palette-group-boundary.test.ts.
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
 * ⛔ NEITHER VALUE IS TYPED HERE (rule 03 section 1). ⭐ No case reads a colour
 * back -- `readTheme` is a REQUIRED member of `ScreenSurfaceWiring`, so the
 * cases need a theme to build the surface at all, not a particular one.
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
// Comparing what was drawn against 図 F-019.
// ---------------------------------------------------------------------------

/**
 * How a shape reads when it is compared: its tag and every attribute the figure
 * drew it with, in the figure's own order.
 *
 * ⚠️ `style` is compared declaration by declaration, because a browser is free
 * to respell one and the fake respells them the way a browser does. Everything
 * else -- the geometry, which IS the shape -- is compared character for
 * character. Copied from tests/unit/uf-71.test.ts.
 */
const saidBy = (name: string, text: string | null): string =>
  name === 'style'
    ? (text ?? '')
        .split(';')
        .map((one) => one.replace(/\s+/g, ''))
        .filter((one) => one.length > 0)
        .sort()
        .join(';')
    : (text ?? '')

/** Whether this `svg` element carries exactly the shape 図 F-019 gives that row. */
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

/** Every `svg` drawn inside this part -- 図 F-019 is an SVG figure. */
const shapesIn = (part: FakeElement): FakeElement[] =>
  selfAndDescendants(part).filter((one) => one.tagName === 'SVG')

/** Everything a failure needs to be read without opening the unit. */
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

// ---------------------------------------------------------------------------
// Descriptions to draw. Every one is a value of `ScreenView` and nothing else.
// The shape is tests/unit/fr-053-palette-group-boundary.test.ts's.
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
 * dictionary per language; what they SAY is not what this file is about, so
 * these are strings distinctive enough to be searched for.
 */
const ARMED_WORD = 'ArmedWordHere'
const GROUP_WORD = 'PaletteGroupWordHere'

const entryFor = (icon: string): CommandItem => ({
  icon,
  isEnabled: true,
  isPressed: false,
  isArmed: false,
  label: `PaletteCommandWordFor${icon}`,
})

/**
 * A group of `entryCount` entries.
 *
 * ⭐ THE ROW IDS COME FROM TABLE T-109, so that no entry this unit is handed
 * names a row minted here.
 */
const groupOf = (entryCount: number, from = 0): PaletteGroup =>
  ({
    name: GROUP_WORD,
    commands: PALETTE_ROWS.slice(from, from + entryCount).map((row) => entryFor(row)),
  }) as PaletteGroup

/**
 * A palette of one group of two entries.
 *
 * ⭐ The band's height comes from S-135a for the same reason: nothing handed to
 * this unit is a value minted here.
 */
const paletteWith = (patch: Partial<CommandPalette> = {}): CommandPalette => ({
  at: { x: 400, y: 300 },
  grabBandHeight: GRAB_BAND_HEIGHT_PX,
  groups: [groupOf(2)],
  armedText: ARMED_WORD,
  ...patch,
})

/** The App Header measures to something, so BO-1's dimension is settled and the screen is drawn. */
const HEADER_HEIGHT = { 'App Header': 37 }

/** The `Command Palette` this unit drew, for the description handed in. */
function drawPalette(palette: CommandPalette = paletteWith()): FakeElement {
  const built = wire(HEADER_HEIGHT)
  surfaceOf(built).showScreenView(viewWith({ commandPalette: palette }))
  return oneByRole(built.root(), U_26)
}

// ===========================================================================

describe('the manuscripts still say what these cases read', () => {
  it('⭐ was really driven by the manuscripts, and not by a hollow read of them', () => {
    // ⛔ WITHOUT THIS, A PARSE THAT PICKED UP THE WRONG COLUMN WOULD MAKE EVERY
    // CASE BELOW AGREE WITH ANYTHING -- rule 04 section 2: a mechanism is not
    // verified until it has been broken on purpose and seen to fail.
    expect(U_26).toBe('Command Palette')
    expect(GRAB_BAND_HEIGHT_PX).toBeGreaterThan(0)
    // Five, because the widest description driven below asks for five entries.
    expect(PALETTE_ROWS.length).toBeGreaterThanOrEqual(5)
    expect(PALETTE_ROWS).toContain(IC_GRAB_MARKER)
    expect(ICON_GLYPHS.viewBox.length).toBeGreaterThan(0)
    expect(glyphFor(IC_GRAB_MARKER).length).toBeGreaterThan(0)
  })

  it('⛔ table T-109 still stands IC-53 on the palette, and still says it is no button', () => {
    // Both halves matter to this file. The 面 column is why the shape belongs on
    // THIS surface (FR-029, MUST); 「ボタンではない」 is why no `CommandItem`
    // carries it, which is why tests/unit/uf-71.test.ts's per-entry case cannot
    // reach it and this file has to.
    const row = T_109.rows.find((one) => one.id === IC_GRAB_MARKER)
    if (row === undefined) throw new Error(`table T-109 no longer has row ${IC_GRAB_MARKER}`)
    expect(bare(row.by['面'] ?? '')).toBe(U_26)
    expect(row.cells.join(' '), `${IC_GRAB_MARKER} is still not a button`).toContain('ボタンではない')
  })

  it('⭐ 図 F-019 draws a shape for every row table T-109 places on the palette', () => {
    // The preamble of section 8: 「⭐ 図形を持たない行は無い —— 全 74 行が 図 F-019
    // に図形を持つ。」 ⛔ Read here so that a missing shape is reported against the
    // figure rather than blamed on the unit below.
    for (const row of PALETTE_ROWS) {
      expect(() => glyphFor(row), `図 F-019 draws no shape for ${row}`).not.toThrow()
    }
  })
})

describe('FR-029 (MUST) -- IC-53 is drawn on the palette, with 図 F-019\'s shape', () => {
  it('⛔ draws the grab marker at all', () => {
    // ⭐ 「アイコンの名簿と置き場は ... 表 T-109 に ... 従うこと（MUST）」 and table
    // T-109's 面 column reads `Command Palette` for IC-53. ⚠️ The row's own words
    // are what it is FOR: 「掴んで動かせることを示す」 -- a band that can be grabbed
    // but shows nothing does not show it, and FR-029's RATIONALE opens with 「無反
    // 応だと故障に見える。」
    const palette = drawPalette()
    const marker = shapesIn(palette).filter((shape) => drawsGlyph(shape, IC_GRAB_MARKER))

    expect(marker.length, `FR-029 (MUST): ${whatWasDrawn(palette)}`).toBe(1)
  })

  it('draws exactly one, however many groups and entries the palette holds', () => {
    // ⭐ FR-029 (MUST NOT) forbids one function two entrances, and IC-53 is ONE
    // row of table T-109 -- not one per group and not one per neighbour. ⚠️ A
    // marker repeated down the palette would also be a second thing to grab in a
    // table whose first row (GR-19) is about grabbing exactly one.
    // ⚠️ THE SHAPES ARE DRIVEN, NOT COUNTED: the real palette's groups are
    // UF-65's answer and tests/unit/uf-65.test.ts is the bench that holds them,
    // so the numbers below are inputs and no case here means them.
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
    // ⭐ 「いま構えているものが画面上で読めること（MUST）。」 ⚠️ THE CASE THAT MUST
    // STAY GREEN THROUGH ANY TIDYING OF THE PALETTE'S TOP: this word is what a
    // reader most easily mistakes for a group caption, and FR-053 makes deleting
    // it a breach rather than a tidy-up. Where it goes is not asked here.
    const palette = drawPalette()

    expect(palette.textContent, `FR-053 (MUST): ${whatWasDrawn(palette)}`).toContain(ARMED_WORD)
  })

  it('⛔ prints no row id of table T-023b', () => {
    // ⛔ 「行 ID そのものを画面に刷ってはならない（MUST NOT）。」 ⭐ Asked of the
    // printed text and NOT of the attributes: table T-109's own preamble says
    // 「繋ぎ目は行 ID `IC-nn` だけである」 and `data-icon` carries one by design, so
    // a case that barred every row id everywhere would fail the specification
    // rather than the code.
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
    // ⛔ FR-053: 「入口の群の見出しを画面に刷ってはならない（MUST NOT）。」 ⭐ Read
    // here beside the armed word on purpose: the two are the same size, the same
    // kind of text and one line apart, and the whole risk this file guards is
    // that a tidy-up takes the wrong one away.
    const palette = drawPalette()

    expect(palette.textContent).toContain(ARMED_WORD)
    expect(palette.textContent, 'FR-053 (MUST NOT): the group caption').not.toContain(GROUP_WORD)
  })
})
