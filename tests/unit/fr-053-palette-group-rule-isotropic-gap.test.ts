// S-143 of table T-206 (utilisateur ruling 2026-08-29): the second of its two
// numbers -- the space around the line that separates two groups of the
// `Command Palette` -- now reaches ALL FOUR sides of that line, not only its
// left and right. FR-053 (MUST) is what the line answers to.
//
// Unit under test: UF-71 of table T-075 (`dom-screen-surface.ts`, component
// CP-38 of table T-062, published as PI-38 of table T-064) -- the same unit
// tests/unit/fr-053-palette-group-boundary.test.ts drives. That file already
// proves the line exists, is FR-053's exact thickness, and is inset left and
// right by S-143's second number. ⛔ IT DOES NOT ASK ABOUT TOP AND BOTTOM,
// because until 2026-08-29 the manuscript did not either -- S-143's remark now
// records, in the past tense, that before that date the gap was left/right
// only and the line touched the group's buttons top and bottom (0px,
// measured). This file is the one that would have caught a fix which moved
// only two of the four sides.
//
// ---------------------------------------------------------------------------
// The rule this file answers to, quoted verbatim from the manuscript
// ---------------------------------------------------------------------------
//
// `docs/spec/_assets/tbl-settings.md`, table T-206, row S-143 (値 / 既定 /
// 保存しない理由 columns):
//
//   値    「パレットの群を隔てる線の太さとまわりの空き（`FR-053`）」
//   既定  「1 × 6px」
//   理由  「同上。⭐ 2 つ目の数は上下左右のすべてに当たる（利用者の裁定
//         2026-08-29）—— ⛔ 上下だけの数を別に持たない。罫のまわりを等方にす
//         るのが裁定であり、新しい数を 1 つも起こさない。⚠️ 2026-08-29 まで、
//         この数は左右にしか当たっておらず、上下は 0px で群のボタンが罫に接
//         していた（実測）。⛔ 線であって文字ではない。理由は `FR-053` が持
//         つ。⚠️ 図形でもないので 表 T-109 の行も 図 F-019 の図形も要らない」
//
// `docs/spec/01-04-requirements.md`, FR-053's statement of the boundary (:2450
// of the working tree at the time this file was written):
//
//   「入口の群の見出しを画面に刷ってはならない（MUST NOT）。群の境目は線で示
//   すこと（MUST）。線の太さとまわりの空きは 表 T-206 の `S-143` が持つ。」
//
// Both were「左右の空き」until the same 2026-08-29 ruling changed the row's
// own 値 column and this sentence together (`git show 2a679cb` -- the commit
// that carried the ruling in). Neither mentions a colour for this line
// anywhere in either passage.
//
// ---------------------------------------------------------------------------
// ⛔ HOW THE EXPECTED VALUES WERE OBTAINED (docs/development-rules/
// 04-verification.md, section 1)
// ---------------------------------------------------------------------------
//
// What was read: docs/spec/ for S-143, FR-053 and table T-236 (searched for a
// colour row naming this line -- see below), docs/development-rules/, and of
// `src/` nothing but the exported declarations these cases must call or name:
// `domScreenSurface`, `ScreenSurfaceWiring`, `ScreenTheme`, the `ScreenView`
// family and `SETTINGS_DEFAULTS`. ⛔ NO BODY WAS READ. In particular nothing
// was read about which CSS property this unit states a gap in, nor whether it
// states the same property on every side.
//
// COLOUR: searched table T-236 (「画面の色」) and every place FR-053's text
// names a T-236 row (`S-183` for the armed entry's colour, `S-151` for the
// selection frame elsewhere in the specification) -- neither FR-053's
// boundary paragraph nor S-143's own row names one for this line. S-143's
// remark states outright that the row holds a thickness and a gap and
// "nothing else" (⚠️ 図形でもない…). ⛔ SO NO COLOUR CASE IS WRITTEN, matching
// the conclusion tests/unit/fr-053-palette-group-boundary.test.ts already
// reached for the same row.
//
// ⭐ THE SHAPE IS COPIED, NOT INVENTED. The fake browser, `stage` / `wiringOf`
// / `wire` / `surfaceOf`, the tree readers (`styleMap`, `inlineStyle`,
// `styleOf`, `descendants`, `selfAndDescendants`, `byRole`, `oneByRole`,
// `matches`) and the `ScreenView` fixtures (`paletteOf`, `drawPalette`,
// `groupWord`, `entryFor`) are copied verbatim from
// tests/unit/fr-053-palette-group-boundary.test.ts, which copied them in turn
// from tests/unit/uf-71.test.ts. `isRule` / `rulesIn` / `ONE_SIDED_BORDERS` /
// `PAINTS` / `statesPx` are copied unchanged from the same file -- they are
// what finds the line at all, and this file only needed to measure it on four
// sides instead of two once found.
//
// ⛔ WHAT IS NEW HERE AND WHY: `sideGapsOf` in the sibling file reads only the
// horizontal margin properties, because that was the whole of S-143's second
// number before the ruling. `effectiveMarginPx` below is its generalisation:
// it resolves the CSS margin shorthand (1/2/3/4-value forms), the physical
// longhands, and the logical shorthands/longhands (`margin-block(-start/end)`,
// `margin-inline(-start/end)`, read as LTR -- the specification carries no
// right-to-left concern) down to one value per PHYSICAL side, replaying every
// style write on the node in the order the unit made it -- the same order
// `styleMap` already relies on for a single property, extended across the
// several property names that can all state a margin.
//
// ---------------------------------------------------------------------------
// ⛔ WHAT THESE CASES CAN AND CANNOT SEE, SO NO FAILURE IS MISREAD
// ---------------------------------------------------------------------------
//
// `npm test` runs under Node with no DOM (vitest.config.ts sets `environment:
// 'node'`), so there is no layout engine here and no computed style -- only
// what the unit WROTE as an inline declaration is visible. A gap that arrived
// through a style sheet, or through PADDING on a wrapping element rather than
// a MARGIN on the line itself, would be invisible here. ⚠️ REPORT that, do not
// tune the case -- the same bargain the sibling file already strikes for its
// left/right case, extended to all four sides.
//
// ⚠️ WHAT IS DELIBERATELY NOT ASSERTED:
//   1. HOW MANY BOUNDARIES A PALETTE HAS. tests/unit/fr-053-palette-group-
//      boundary.test.ts already drives GROUP_COUNTS = [1, 2, 3, 4] for that.
//      This file draws one palette of four groups (three boundaries) only
//      because three independent lines are enough to catch a fix that inset
//      some lines correctly and others not.
//   2. THE LINE'S OWN THICKNESS BEYOND WHAT FINDS IT. `rulesIn` already
//      requires the exact px `isRule` was given, copied unchanged from the
//      sibling file -- a rule found by it is, by construction, S-143's first
//      number and no other. This file measures the SIDES; the sibling file's
//      "was really driven by the manuscript" case already proves the number
//      itself was read rather than invented.
//   3. WHAT COLOUR THE LINE IS -- searched and not found, see above.
//   4. WHERE THE LINE STANDS relative to the two boxes it separates. No row
//      states it and there is no layout engine here to ask (unchanged from
//      the sibling file).

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

/** The column that holds S-143's name, so the 2026-08-29 wording can be checked. */
const NAME_COLUMN = '値'
/** The column that holds S-143's value itself. */
const VALUE_COLUMN = '既定'

if (!T_206.headings.includes(NAME_COLUMN) || !T_206.headings.includes(VALUE_COLUMN)) {
  throw new Error(`table T-206 no longer has both a ${NAME_COLUMN} and a ${VALUE_COLUMN} column: ${T_206.headings.join(' | ')}`)
}

const S_143_ROW = ((): (typeof T_206.rows)[number] => {
  const row = T_206.rows.find((one) => one.id === 'S-143')
  if (row === undefined) throw new Error('table T-206 no longer has row S-143')
  return row
})()

/**
 * S-143 -- 「線の太さとまわりの空き」, which the 既定 cell writes as one pair
 * with a `×` between them, the way S-188 and S-192 write a pair in the same
 * column; they are read out of it rather than the cell parsed whole.
 */
const [RULE_THICKNESS_PX, RULE_SIDE_GAP_PX] = ((): readonly [number, number] => {
  const written = bare(S_143_ROW.by[VALUE_COLUMN] ?? '')
  const found = /(-?\d+(?:\.\d+)?)\s*[×xX]\s*(-?\d+(?:\.\d+)?)/.exec(written)
  if (found === null) throw new Error(`table T-206's S-143 no longer states a pair: ${written}`)
  return [Number.parseFloat(found[1] as string), Number.parseFloat(found[2] as string)]
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

/** Four groups make three boundaries -- enough to catch a fix that fixed some lines and not others. */
const GROUP_COUNT = 4

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
// Reading the tree the unit built. Copied from tests/unit/fr-053-palette-group-boundary.test.ts.
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
// Finding the line itself. Copied unchanged from tests/unit/fr-053-palette-
// group-boundary.test.ts -- it is what locates a node of S-143's exact
// thickness, so a rule found below already carries that half of the row.
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
 * ⛔ THE `border` SHORTHAND IS NOT ONE, for the reason the sibling file gives:
 * every entry of the palette already states a frame on all four sides, and a
 * box with a frame is not a boundary between two groups.
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

// ---------------------------------------------------------------------------
// ⭐ NEW: the space around the line, on all four physical sides.
// ---------------------------------------------------------------------------
//
// `sideGapsOf` in the sibling file only reads the horizontal margin
// properties, because before the 2026-08-29 ruling that was the whole of
// S-143's second number. `effectiveMarginPx` below generalises it: it resolves
// the CSS margin shorthand's 1/2/3/4-value forms, the physical longhands, and
// the logical shorthands/longhands (read as LTR, which is all this
// specification ever asks for) down to one value per physical side --
// replaying every style write on the node IN ORDER, the same way `styleMap`
// already does for a single property name, but across the several property
// names that can all state a margin on the same side.

type Side = 'top' | 'right' | 'bottom' | 'left'
const SIDES: readonly Side[] = ['top', 'right', 'bottom', 'left']

/** The `margin` shorthand's 1/2/3/4-value forms (CSS Box Model, unchanged since CSS1). */
function fourSides(tokens: readonly string[]): Partial<Record<Side, string>> | undefined {
  // ⚠️ Indexed as `as string`, not left as `string | undefined`: the length
  // check just above each branch already guarantees the index exists, and
  // `exactOptionalPropertyTypes` (tsconfig) refuses an explicit `undefined`
  // written into an optional property even when it can never occur.
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

/** What one declaration (property + value) states for each physical side it reaches, if any. */
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

/**
 * The effective margin this node states on each physical side, replaying the
 * node's own style writes in order (a `reset` clears every side first, exactly
 * as `styleMap` clears every property first, since setting the whole `style`
 * attribute really does replace what came before it).
 */
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
// The shape is tests/unit/fr-053-palette-group-boundary.test.ts's.
// ---------------------------------------------------------------------------

const EMPTY_HEADER: AppHeaderItems = {
  documentTitle: null,
  openedFileName: null,
  fileSavedAt: null,
  fileNeverSavedText: '',
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
 * manuscript's, matching the sibling file's own note on the same point.
 */
const groupWord = (at: number): string => `IsotropicGapGroupWord${at}`

const entryFor = (icon: string): CommandItem => ({
  icon,
  isEnabled: true,
  isPressed: false,
  isArmed: false,
  label: `IsotropicGapCommandWordFor${icon}`,
})

/** A palette of `groupCount` groups, one entry in each -- copied from the sibling file's `paletteOf`. */
const paletteOf = (groupCount: number): CommandPalette => ({
  at: { x: 400, y: 300 },
  grabBandHeight: 0,
  minimise: {
    icon: 'IC-75',
    label: 'IC-75',
    isEnabled: true,
    isPressed: false,
    isArmed: false,
  },
  isMinimised: false,
  groups: Array.from(
    { length: groupCount },
    (_absent, at): PaletteGroup => ({
      name: groupWord(at),
      commands: [entryFor(PALETTE_ROWS[at] as string)],
    }),
  ),
  armedText: 'IsotropicGapArmedWord',
})

/** The App Header measures to something, so BO-1's dimension is settled and the screen is drawn. */
const HEADER_HEIGHT = { 'App Header': 37 }

/** The `Command Palette` this unit drew, for a description of `GROUP_COUNT` groups. */
function drawPalette(): FakeElement {
  const built = wire(HEADER_HEIGHT)
  surfaceOf(built).showScreenView(viewWith({ commandPalette: paletteOf(GROUP_COUNT) }))
  return oneByRole(built.root(), U_26)
}

// ===========================================================================

describe('the manuscript still says what these cases read', () => {
  it('⭐ was really driven by the manuscript, and not by a hollow read of it', () => {
    // ⛔ WITHOUT THIS, A PARSE THAT PICKED UP THE WRONG COLUMN WOULD MAKE EVERY
    // CASE BELOW AGREE WITH ANYTHING -- rule 04 section 2.
    expect(bare(S_143_ROW.by[VALUE_COLUMN] ?? '')).toContain('px')
    expect(RULE_THICKNESS_PX).toBeGreaterThan(0)
    expect(RULE_SIDE_GAP_PX).toBeGreaterThan(0)
    expect(RULE_THICKNESS_PX, 'S-143 states two different numbers').not.toBe(RULE_SIDE_GAP_PX)
    expect(U_26).toBe('Command Palette')
    expect(PALETTE_ROWS.length).toBeGreaterThanOrEqual(GROUP_COUNT)
  })

  it('⛔ states the 2026-08-29 ruling: the gap is now isotropic, not left/right only', () => {
    // ⛔ WITHOUT THIS TRIPWIRE, A FUTURE EDIT THAT QUIETLY REVERTED THE RULING
    // IN THE MANUSCRIPT WOULD LEAVE THIS FILE MEASURING A RULE THE
    // SPECIFICATION NO LONGER MAKES -- rule 04 section 2 asks that a mechanism
    // reading a document be provable against the document, not just against
    // its own parser.
    // ⚠️ NOT `bare()`: the 値 cell carries a backtick span for `FR-053`, and
    // `bare()` returns only the FIRST such span -- the prose around it, where
    // the ruling's wording actually lives, is what this case needs to read.
    const name = S_143_ROW.by[NAME_COLUMN] ?? ''
    const remark = S_143_ROW.cells.join(' ')
    expect(name, 'S-143 is still the row about the group rule (`FR-053`)').toContain('FR-053')
    expect(name, 'S-143’s own name states an all-around gap, not a left/right one').toContain('まわり')
    expect(name, 'the pre-ruling wording ("左右の空き") must be gone').not.toContain('左右の空き')
    expect(remark, '2026-08-29’s ruling text is still attached to this row').toContain('上下左右')
  })
})

describe('S-143 (利用者の裁定 2026-08-29) -- the gap reaches every side of the line', () => {
  it('draws each boundary at S-143’s exact thickness', () => {
    // Measures the first of S-143’s two numbers. `rulesIn` is `isRule`
    // (copied unchanged from the sibling file) applied to the whole tree, and
    // `isRule` only accepts a node whose stated size is EXACTLY
    // `RULE_THICKNESS_PX` (`statesPx` rejects `11px` for `1px`) -- so a rule
        // found here already carries S-143's thickness by construction.
    const palette = drawPalette()
    const rules = rulesIn(palette)
    expect(
      rules.length,
      `${GROUP_COUNT} groups should draw ${GROUP_COUNT - 1} boundaries of S-143's ${RULE_THICKNESS_PX}px. ${whatWasDrawn(palette)}`,
    ).toBe(GROUP_COUNT - 1)
  })

  it('insets each boundary by S-143’s second number on ALL FOUR sides -- top and bottom included', () => {
    // ⛔ THE CASE THIS FILE EXISTS FOR. Before 2026-08-29 the row's own remark
    // says the gap reached only left and right, and top/bottom stood at 0px
    // (measured) -- a group's buttons touched the rule directly above and
    // below it. The ruling makes the SAME number reach all four sides, and no
    // new number is minted (S-143's remark: 「新しい数を 1 つも起こさない」),
    // so this case checks the one number, `RULE_SIDE_GAP_PX`, against all four
    // `effectiveMarginPx` sides rather than a second constant.
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

// ---------------------------------------------------------------------------
// ⚠️ NO COLOUR CASE. Searched: FR-053's full statement (the paragraph that
// carries S-143, and the rest of the requirement) and S-143's own row in table
// T-206. Neither names a row of table T-236 for this line -- the two T-236
// references FR-053's text does carry are for OTHER lines/marks (`S-183` for
// the armed entry's own colour, `S-185` for its border thickness), not for the
// group boundary. S-143's remark states, in as many words, that the row holds
// a thickness and a gap and nothing else (⚠️ 図形でもない…). Per the task's own
// rule ("if neither names one, say so and write no colour case"), none is
// written here.
// ---------------------------------------------------------------------------
