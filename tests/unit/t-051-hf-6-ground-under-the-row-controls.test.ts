// The ground HF-6 lays under a row's controls (表 T-051), and the faintness
// FR-029 asks of an entrance that has nothing to do -- on EVERY surface it is
// drawn on.
//
// Unit under test: UF-71 of table T-075 (`dom-screen-surface.ts`, component
// CP-38 of table T-062). It is the side of IF-9 that turns a `ScreenView` into
// nodes, so it is the side that lays a ground and paints an entrance at all.
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these cases have no node
// in the specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// ---------------------------------------------------------------------------
// ⛔ WHY THIS FILE EXISTS -- THE HOLES IT WAS WRITTEN TO STAND IN
// ---------------------------------------------------------------------------
//
// Both rules below were measured to be watched by no case at all: broken on
// purpose, nothing went red.
//
//   1. THE GROUND. `HF-6` gained it on 2026-08-30 (CR-305) and nothing has
//      asked for it since -- neither that it is there, nor that it is ONE, nor
//      what colour it is, nor how far it reaches.
//   2. THE FAINTNESS, BEYOND ONE SURFACE. tests/unit/uf-71.test.ts asks that a
//      header entry which cannot be used is painted differently from one that
//      can, and that the colour is SOME row of 表 T-236. ⛔ It does not ask
//      WHICH row, and FR-029 now names one: 「薄さは … 表 T-236 の `S-148` の色
//      で示すこと（MUST）」. ⛔ And it asks it on the `App Header` alone, while
//      the same requirement closes with 「本規則は … 表 T-109 の全行に当たる ——
//      行の操作子もパレットもヘッダーも同じである。載る面によって薄くしない入口
//      があってはならない（MUST NOT）」.
//
// ---------------------------------------------------------------------------
// THE ROWS THESE CASES REST ON
// ---------------------------------------------------------------------------
//
//   表 T-051 HF-6  ⭐ 「描いているあいだ、操作子の下に地を 1 枚敷くこと（MUST）。色は
//                  `_assets/tbl-settings.md` の 表 T-236 の `S-150` とすること
//                  （MUST）」／⛔ 「操作子ごとに別々の地を敷いてはならない（MUST
//                  NOT）—— 操作子のあいだに名前の文字のかけらが残る」／⭐ 「敷く範囲
//                  は、いちばん左の操作子の左端から行の右端までとし、縦はその行の高
//                  さとすること（MUST）」／⭐ 「操作子は、行の名前の上へ重ねて描くこ
//                  と（MUST）」
//   `FR-029`       「その入口を押しても、いま文書にも画面にも何も変えられないときは、
//                  その入口を薄く描くこと（MUST）。薄さは … 表 T-236 の `S-148` の
//                  色で示すこと（MUST）。」／⛔ 「薄く描いた入口を、宿主の意味で無効
//                  にしてはならない（MUST NOT）—— 無効にすると押下そのものが届かず、
//                  下の理由を告げる引き金が消える」／⚠️ 「本規則は … 表 T-109 の全行
//                  に当たる —— 行の操作子もパレットもヘッダーも同じである。載る面に
//                  よって薄くしない入口があってはならない（MUST NOT）。」
//   表 T-236 S-150 「パネルの地の色」（行見出しパネル・プロパティパネル・パレットの地。
//                  色相追随 ○）
//   表 T-236 S-148 「控えめな文字の色」（副次の文字。色相追随 —）
//   表 T-051 HF-1  every row with something under it carries the three controls;
//                  `RowExpander` is how the description says which of them has
//                  work. ⭐ A row whose `canOpen` is false is exactly FR-029's
//                  「押しても、いま文書にも画面にも何も変えられない」.
//   `FR-041`       「画面の色は … 表 T-236 に従うこと（MUST）」 and (MUST NOT)
//                  「閲覧環境のシステム色に委ねてはならない」 -- why a colour is
//                  resolved through the one declaration on the root rather than
//                  read off the part.
//
// ---------------------------------------------------------------------------
// ⛔ WRITTEN FROM docs/spec AND NOTHING ELSE (docs/development-rules/
// 04-verification.md section 1). What was read of `src/`: the exported types of
// `screen-renderer.ts` (`AppHeaderItems`, `CommandItem`, `CommandPalette`,
// `PaletteGroup`, `RowExpander`, `RowTitle`, `ScreenFrame`, `ScreenSurface`,
// `ScreenView`), `ScreenRect` of `screen-regions.ts`, the exported declarations of
// `dom-screen-surface.ts` (`domScreenSurface`, `ScreenSurfaceWiring`,
// `ScreenTheme`) and `SETTINGS_DEFAULTS`. ⛔ NO FUNCTION BODY WAS READ.
//
// ⭐ THE SHAPE IS COPIED, NOT INVENTED. The fake browser and the readers below
// are tests/unit/fr-029-palette-grab-marker.test.ts's and
// tests/unit/uf-71.test.ts's, which drive this same unit through the same seam.
//
// ---------------------------------------------------------------------------
// ⭐ WHAT IS DELIBERATELY NOT ASSERTED, AND WHY
// ---------------------------------------------------------------------------
//   1. WHEN the controls are drawn. HF-6 draws them 「その行の名前にポインタが
//      乗っているあいだだけ」, and where the pointer is is not in `ScreenView` --
//      no member of `RowTitle` carries it. So these cases ask what is drawn for
//      a described row and never when it appears.
//   2. THE GAP BETWEEN THE CONTROLS. HF-6 (MUST NOT) forbids that amount to be
//      written into it at all, and says why: no row holds it and it has had no
//      ruling.
//   3. THE LEFT EDGE OF THE GROUND. 「いちばん左の操作子の左端から」 is a
//      measurement of a laid-out page, and this fake lays nothing out: it
//      records what was written, and a browser is what turns that into an edge.
//      ⛔ Reported rather than replaced by a case about a number that happens to
//      be written somewhere.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import type {
  AppHeaderItems,
  CommandItem,
  CommandPalette,
  PaletteGroup,
  RowExpander,
  RowTitle,
  ScreenFrame,
  ScreenSurface,
  ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'
// ⚠️ `ScreenRect` is PI-35's own type and `screen-renderer.ts` re-exports none
// of it -- so it is taken from where it is declared, which is the unit table
// T-064 gives it.
import type { ScreenRect } from '../../src/entity/layout-engine/screen-regions/screen-regions'
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

const rowOf = (table: string, id: string) => {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

/** Everything HF-6 writes, as one string. */
const HF_6 = rowOf('T-051', 'HF-6').cells.join(' ')

/**
 * FR-029's own sentences, read out of the manuscript.
 *
 * ⚠️ THE WHOLE FILE AND NOT THE ONE REQUIREMENT: Chapter 1-4 is one document and
 * nothing here parses it into requirements, so a premise below asks that the
 * sentences are still IN it rather than which UID holds them.
 */
const FR_029_TEXT = readFileSync(
  join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
  'utf8',
)

/** The rows of table T-109 these cases stand an entrance on, one per surface. */
const IC_HEADER = 'IC-20'
const IC_PALETTE = 'IC-61'
const IC_ROW_OPEN = 'IC-58'
/** The panel's own two, which HF-10 and HF-12 give it (表 T-109). */
const IC_OPEN_EVERY_ROW = 'IC-74'
const IC_CLOSE_EVERY_ROW = 'IC-78'

/** Table T-103's settled names, which W-4 of table T-006a puts into `data-role`. */
const nameOf = (row: string): string => bare(rowOf('T-103', row).by['確定名（英）'] ?? '')
const U_23 = nameOf('U-23')
const U_26 = nameOf('U-26')

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
// ---------------------------------------------------------------------------
// 表 T-236, solved for the rendering that was wired
// ---------------------------------------------------------------------------

/**
 * One row of 表 T-236 as this rendering paints it.
 *
 * ⛔ NO COLOUR IS TYPED HERE (rule 03 section 1). The rows that follow the hue
 * write it as the letter `H`, which the table's own 色相追随 column marks and
 * which `S-73` fills in -- so the hue read for `THEME` is substituted the once,
 * exactly as the manuscript writes it. ⭐ Copied from tests/unit/uf-71.test.ts.
 */
function t236(rowId: string): string {
  const row = rowOf('T-236', rowId)
  const cell = bare(row.by[THEME.preference === 'dark' ? '暗いテーマ' : '明るいテーマ'] ?? '')
  if (!/^(#|hsl\(|rgba?\()/.test(cell)) {
    throw new Error(`表 T-236 ${rowId} states no colour for this rendering: ${cell}`)
  }
  return cell.replace('H', String(THEME.hue)).replace(/\s+/g, '').toLowerCase()
}

/** 「パネルの地の色」 -- what HF-6 (MUST) names for the ground. */
const S_150 = t236('S-150')
/** 「控えめな文字の色」 -- what FR-029 (MUST) names for an entrance that is spent. */
const S_148 = t236('S-148')

/**
 * A declaration this node was written with, resolved through the one the unit
 * put on its own root.
 *
 * ⭐ WHY IT HAS TO BE RESOLVED. FR-041 (MUST) has one declaration carry 表 T-236
 * for the whole tree, so a part states which colour it takes and not what that
 * colour is. Reading the part alone would compare a NAME with a colour and fail
 * whatever the unit painted. ⚠️ No fallback is honoured (`var(--x, y)` is left
 * unresolved and will match no row), because FR-041 (MUST NOT) forbids one.
 * ⭐ Copied from tests/unit/uf-71.test.ts.
 */
function resolved(built: Stage, written: string): string {
  const flat = written.trim().toLowerCase()
  const named = /^var\((--[a-z0-9-]+)\)$/.exec(flat)
  if (named === null) return flat.replace(/\s+/g, '')
  const property = named[1] as string
  return (styleMap(built.root()).get(property) ?? `(the root declares no ${property})`)
    .replace(/\s+/g, '')
    .toLowerCase()
}

/** The colour this node's WORDS are painted in. */
const paintedColour = (built: Stage, element: FakeElement): string =>
  resolved(built, styleMap(element).get('color') ?? '')

/**
 * The colour this node's GROUND is painted in, whichever of the spellings a
 * ground can be written with.
 *
 * ⚠️ SEVERAL SPELLINGS AND NOT ONE, because no row of the specification settles
 * which: a ground can be an element's background or an SVG shape's fill, and
 * HF-6 says only 「地を 1 枚敷く」. ⭐ Reading all of them is what keeps these
 * cases about the RULE rather than about a spelling nobody chose.
 */
function paintedGround(built: Stage, element: FakeElement): string {
  const style = styleMap(element)
  for (const property of ['background-color', 'background', 'fill']) {
    const written = style.get(property)
    if (written !== undefined && written.trim() !== '') return resolved(built, written)
  }
  const attribute = element.getAttribute('fill')
  return attribute === null ? '' : resolved(built, attribute)
}

/** Attributes and text together, for a failure that has to be read on its own. */
function serialize(element: FakeElement): string {
  const attributes = [...element.attributes].map(([name, value]) => ` ${name}="${value}"`).join('')
  const style = inlineStyle(element)
  return `<${element.tagName.toLowerCase()}${attributes}${style === '' ? '' : ` style="${style}"`}>`
}

/** Hidden the way BO-1 asks for: laid out (so it can be measured) but not shown. */
const isHiddenHere = (element: FakeElement): boolean => {
  const style = inlineStyle(element).replace(/\s+/g, '').toLowerCase()
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

// ---------------------------------------------------------------------------
// Descriptions to draw. Every one is a value of `ScreenView` and nothing else.
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

const rect = (x: number, y: number, width: number, height: number): ScreenRect => ({
  x,
  y,
  width,
  height,
})

const command = (patch: Partial<CommandItem> & { icon: string }): CommandItem => ({
  isEnabled: true,
  isPressed: false,
  isArmed: false,
  label: patch.icon,
  ...patch,
})

const ROW_TITLE_INDENT = SETTINGS_DEFAULTS['rowTitleIndent'] as number

/** The row's own box, which HF-6 measures the ground's height against. */
const ROW_BOX = rect(0, 40, 170, 29)

const rowTitle = (patch: Partial<RowTitle> & { groupId: string }): RowTitle => ({
  depth: patch.depth ?? 1,
  indentPx: (patch.depth ?? 1) * ROW_TITLE_INDENT,
  box: ROW_BOX,
  label: patch.groupId,
  wholeLabel: patch.groupId,
  isLabelTruncated: false,
  expander: null,
  isPinned: false,
  isSelected: false,
  ...patch,
})

/** HF-1: a row with something under it, so all three controls have work. */
const EVERY_CONTROL: RowExpander = { canOpen: true, canClose: true, canCloseBelow: true }

/** FR-029's own situation: an entrance with nothing to open. */
const NOTHING_TO_OPEN: RowExpander = { canOpen: false, canClose: true, canCloseBelow: true }

const paletteWith = (commands: readonly CommandItem[]): CommandPalette =>
  ({
    at: { x: 400, y: 300 },
    grabBandHeight: 12,
    minimise: command({ icon: 'IC-75' }),
    isMinimised: false,
    groups: [{ name: 'PaletteGroupWordHere', commands } as PaletteGroup],
    armedText: 'ArmedWordHere',
  }) as CommandPalette

/** The App Header measures to something, so BO-1's dimension is settled. */
const HEADER_HEIGHT = { 'App Header': 37 }

/** Draw one description and hand back the stage it was drawn on. */
function drawn(view: ScreenView): Stage {
  const built = wire(HEADER_HEIGHT)
  surfaceOf(built).showScreenView(view)
  return built
}

/** A screen holding one row whose controls are drawn. */
const oneRow = (expander: RowExpander = EVERY_CONTROL, groupId = 'RowAlpha'): ScreenView =>
  viewWith({
    rowTitlePanel: { pinnedTitles: [], titles: [rowTitle({ groupId, expander })] },
  })

/** Everything a failure needs to be read without opening the unit. */
const whatWasDrawn = (part: FakeElement): string =>
  selfAndDescendants(part)
    .map((one) => {
      const named =
        one.getAttribute('data-role') ?? one.getAttribute('data-icon') ?? one.tagName.toLowerCase()
      return `${named}{${inlineStyle(one)}}`
    })
    .join(' ; ')

/** The one node carrying a row of 表 T-109, anywhere under the node given. */
function iconEntry(root: FakeElement, icon: string): FakeElement {
  const found = selfAndDescendants(root).filter((one) => one.getAttribute('data-icon') === icon)
  const first = found[0]
  if (first === undefined) {
    throw new Error(`nothing carries data-icon="${icon}": ${whatWasDrawn(root)}`)
  }
  return first
}

/**
 * The element that holds one row of the tree.
 *
 * ⭐ FOUND FROM THE CONTROLS UP, because no attribute of the specification names
 * a row: W-4 of 表 T-006a fixes `data-role` for a UI part and 表 T-103 gives the
 * tree a name, not each of its rows. So the row is the highest node under the
 * tree that still holds this row's controls -- which is what 「行の右端」 and
 * 「その行の高さ」 are measured against.
 */
function rowElement(built: Stage): FakeElement {
  const tree = oneByRole(built.root(), U_23)
  const control = iconEntry(tree, IC_ROW_OPEN)
  let at: FakeElement = control
  while (at.parentNode !== null && at.parentNode !== tree) at = at.parentNode
  return at
}

/**
 * Every node laid INSIDE this row whose ground is painted the colour HF-6 names.
 *
 * ⛔ THE ROW ITSELF IS NOT ONE OF THEM, and leaving it in would make the count
 * below a count of something else. The row is a strip of the `Row Title Panel`,
 * whose ground 表 T-236 gives `S-150` in its own right (「行見出しパネル・プロパ
 * ティパネル・パレットの地」), and CR-305 measured that —— 「行の帯の地も実測で
 * `S-150` である」 is why the band is invisible where no control stands. What
 * HF-6 asks for is a ground laid UNDER THE CONTROLS, which is a thing within
 * the row.
 */
const bandsIn = (built: Stage, row: FakeElement): FakeElement[] =>
  descendants(row).filter((one) => paintedGround(built, one) === S_150)

/** The rows the tree drew, in its own order. */
const rowsOf = (tree: FakeElement): FakeElement[] => tree.children

/**
 * Whether this node is laid out to cover the whole height of the row it is in.
 *
 * ⚠️ THREE READINGS ACCEPTED, because no row of the specification settles the
 * spelling: HF-6 says 「縦はその行の高さとすること（MUST）」 and a box can say that
 * as the number itself, as a share of its parent, or by being pinned to both
 * edges. ⛔ What is NOT accepted is a height of its own that is anything else --
 * which is the failure the sentence names: 「縦を操作子の高さにすると、`HF-5`
 * が名前の上端に揃えるぶん、名前の大きい行で文字の脚が下からのぞく」.
 */
function coversTheRowsHeight(node: FakeElement, rowHeightPx: number): boolean {
  const style = styleMap(node)
  const height = (style.get('height') ?? '').replace(/\s+/g, '')
  if (height === `${rowHeightPx}px` || height === '100%') return true
  const zero = (value: string | undefined): boolean =>
    value !== undefined && /^0(px)?$/.test(value.replace(/\s+/g, ''))
  return zero(style.get('top')) && zero(style.get('bottom'))
}

/**
 * Whether this node reaches the right edge of the row it is in.
 *
 * ⚠️ TWO READINGS, for the same reason: 「行の右端まで」 is stated of the row and
 * a box says it either by being pinned to that edge or by a left edge and a
 * width that add up to it. ⛔ A band that stopped short is what the sentence
 * refuses: CR-305 measured the gap it leaves at 4px of the person's own name.
 */
function reachesTheRowsRightEdge(node: FakeElement, rowWidthPx: number): boolean {
  const style = styleMap(node)
  const right = (style.get('right') ?? '').replace(/\s+/g, '')
  if (/^0(px)?$/.test(right)) return true
  const left = Number.parseFloat((style.get('left') ?? '').replace(/[^\d.-]/g, ''))
  const width = Number.parseFloat((style.get('width') ?? '').replace(/[^\d.-]/g, ''))
  return Number.isFinite(left) && Number.isFinite(width) && left + width === rowWidthPx
}

// ===========================================================================
// The premises every case below stands on
// ===========================================================================

describe('the manuscripts still say what these cases read', () => {
  it('⭐ was really driven by the manuscripts, and not by a hollow read of them', () => {
    // ⛔ WITHOUT THIS, A PARSE THAT PICKED UP THE WRONG COLUMN WOULD MAKE EVERY
    // CASE BELOW AGREE WITH ANYTHING -- rule 04 section 2: a mechanism is not
    // verified until it has been broken on purpose and seen to fail.
    expect(U_23).toBe('Row Title Tree')
    expect(U_26).toBe('Command Palette')
    expect(S_150.length).toBeGreaterThan(0)
    expect(S_148.length).toBeGreaterThan(0)
    // ⛔ Two rows of one table that painted alike would make every case below
    // pass on either colour.
    expect(S_150, '表 T-236: the ground and the subdued text are two colours').not.toBe(S_148)
  })

  it('⛔ HF-6 still asks for ONE ground, in S-150, as tall as the row', () => {
    expect(HF_6).toContain('操作子の下に地を 1 枚敷くこと（MUST）')
    expect(HF_6).toContain('`S-150`')
    expect(HF_6).toContain('操作子ごとに別々の地を敷いてはならない（MUST NOT）')
    expect(HF_6).toContain('行の右端までとし、縦はその行の高さとすること（MUST）')
  })

  it('⛔ FR-029 still names S-148 for the faintness, and still forbids disabling', () => {
    const fr029 = FR_029_TEXT
    expect(fr029).toContain('`S-148` の色で示すこと（MUST）')
    expect(fr029).toContain('薄く描いた入口を、宿主の意味で無効にしてはならない（MUST NOT）')
    expect(fr029).toContain('載る面によって薄くしない入口があってはならない（MUST NOT）')
  })

  it('the row these cases draw really carries its controls', () => {
    // The premise without which every count below is a count of nothing.
    const built = drawn(oneRow())
    expect(isShown(iconEntry(rowElement(built), IC_ROW_OPEN))).toBe(true)
  })
})

// ===========================================================================
// (a) HF-6 -- the ground under the controls
// ===========================================================================

describe('表 T-051 HF-6 -- the ground laid under a row’s controls', () => {
  it('⛔ MUST: a ground is laid, and it is painted S-150', () => {
    // 「描いているあいだ、操作子の下に地を 1 枚敷くこと（MUST）。色は … 表 T-236 の
    //   `S-150` とすること（MUST）」 -- and CR-305's own measurement of what its
    //   absence costs: the control and the name are both `S-147`, so where they
    //   overlap the contrast is 1.00 : 1.
    const built = drawn(oneRow())
    const row = rowElement(built)

    expect(
      bandsIn(built, row).length,
      `HF-6 (MUST): 操作子の下に地を 1 枚敷くこと -- nothing inside the row is painted ${S_150}: ${whatWasDrawn(row)}`,
    ).toBeGreaterThan(0)
  })

  it('⛔ MUST NOT: it is ONE ground, and not one per control', () => {
    // 「操作子ごとに別々の地を敷いてはならない（MUST NOT）—— 操作子のあいだに名前の
    //   文字のかけらが残る」（利用者の裁定 2026-08-30。1 つずつ角丸で塗る案はこれで
    //   落ちた）. ⭐ THE MUST NOT IS THE EASIER THING TO BUILD, which is why it is
    // written down: painting each control is one declaration where a band is a
    // node.
    const built = drawn(oneRow())
    const row = rowElement(built)

    expect(
      bandsIn(built, row).length,
      `HF-6 (MUST NOT): 操作子ごとに別々の地を敷いてはならない: ${whatWasDrawn(row)}`,
    ).toBe(1)
  })

  it('⛔ MUST: it is as tall as the ROW, not as tall as a control', () => {
    // 「縦はその行の高さとすること（MUST）—— … 縦を操作子の高さにすると、`HF-5` が
    //   名前の上端に揃えるぶん、名前の大きい行で文字の脚が下からのぞく」. ⭐ The
    // height is the one the DESCRIPTION carries: `RowTitle.box` is where 「その行
    // の高さ」 comes from, and this unit invents no measurement.
    const built = drawn(oneRow())
    const row = rowElement(built)
    const band = bandsIn(built, row)[0]
    if (band === undefined) throw new Error(`no ground was laid: ${whatWasDrawn(row)}`)

    expect(
      coversTheRowsHeight(band, ROW_BOX.height),
      `HF-6 (MUST): 縦はその行の高さ (${ROW_BOX.height}px): ${serialize(band)}`,
    ).toBe(true)
  })

  it('⛔ MUST: it reaches the row’s right edge', () => {
    // 「敷く範囲は、いちばん左の操作子の左端から行の右端までとし…」—— CR-305:
    //   「操作子の右端で止めると、行の右端との隙間に名前の文字が残る」.
    const built = drawn(oneRow())
    const row = rowElement(built)
    const band = bandsIn(built, row)[0]
    if (band === undefined) throw new Error(`no ground was laid: ${whatWasDrawn(row)}`)

    expect(
      reachesTheRowsRightEdge(band, ROW_BOX.width),
      `HF-6 (MUST): 行の右端まで (${ROW_BOX.width}px): ${serialize(band)}`,
    ).toBe(true)
  })

  it('⭐ two rows are two grounds -- the band belongs to a row and not to the panel', () => {
    // ⭐ THE OTHER READING THE RULE EXCLUDES. 「敷く範囲は … 縦はその行の高さ」
    // makes the ground a row's own; one band drawn across the panel would satisfy
    // 「1 枚」 while covering rows whose controls are not drawn at all.
    const built = drawn(
      viewWith({
        rowTitlePanel: {
          pinnedTitles: [],
          titles: [
            rowTitle({ groupId: 'RowAlpha', expander: EVERY_CONTROL, box: rect(0, 40, 170, 29) }),
            rowTitle({ groupId: 'RowBeta', expander: EVERY_CONTROL, box: rect(0, 69, 170, 29) }),
          ],
        },
      }),
    )
    const tree = oneByRole(built.root(), U_23)

    const rows = rowsOf(tree)
    expect(rows.length, 'the tree drew the two rows it was handed').toBe(2)
    expect(
      rows.map((one) => bandsIn(built, one).length),
      `HF-6: one ground per drawn row: ${whatWasDrawn(tree)}`,
    ).toEqual([1, 1])
  })
})

// ===========================================================================
// (b) FR-029 -- the faintness, and which colour it is
// ===========================================================================

describe('FR-029 (MUST) -- an entrance with nothing to do is painted S-148', () => {
  it('⛔ MUST: on the `App Header`, the faint colour is 表 T-236’s S-148', () => {
    // 「その入口を押しても、いま文書にも画面にも何も変えられないときは、その入口を
    //   薄く描くこと（MUST）。薄さは … 表 T-236 の `S-148` の色で示すこと（MUST）」
    // ⛔ WHICH ROW, AND NOT MERELY "SOME ROW". tests/unit/uf-71.test.ts already
    // asks that the colour is a row of 表 T-236 and that it differs from an
    // entry that can be used; CR-306 named the row, and nothing asked for it.
    const built = drawn(
      viewWith({
        appHeaderItems: {
          ...EMPTY_HEADER,
          commands: [command({ icon: IC_HEADER, isEnabled: false })],
        },
      }),
    )

    expect(
      paintedColour(built, iconEntry(built.root(), IC_HEADER)),
      'FR-029 (MUST): 薄さは 表 T-236 の `S-148` の色で示すこと',
    ).toBe(S_148)
  })

  it('⛔ MUST NOT: the same on the `Command Palette` -- 載る面によって変えない', () => {
    // 「本規則は … 表 T-109 の全行に当たる —— 行の操作子もパレットもヘッダーも
    //   同じである。載る面によって薄くしない入口があってはならない（MUST NOT）」
    const built = drawn(
      viewWith({ commandPalette: paletteWith([command({ icon: IC_PALETTE, isEnabled: false })]) }),
    )

    expect(
      paintedColour(built, iconEntry(oneByRole(built.root(), U_26), IC_PALETTE)),
      'FR-029 (MUST NOT): 載る面によって薄くしない入口があってはならない',
    ).toBe(S_148)
  })

  it('⛔ MUST NOT: and on a row’s controls -- the surface CR-306 was raised from', () => {
    // ⚠️ WHAT THE USER ACTUALLY SAW: 「起動直後の画面である —— 何も畳まっていない
    //   ので、画面上の「開く」は 1 つ残らず死んでいる」. `canOpen` false is that
    //   row, and HF-2's control is the entrance with nothing to open.
    const built = drawn(oneRow(NOTHING_TO_OPEN))
    const row = rowElement(built)

    expect(
      paintedColour(built, iconEntry(row, IC_ROW_OPEN)),
      `FR-029 (MUST): the row control with nothing to open is not painted S-148: ${whatWasDrawn(row)}`,
    ).toBe(S_148)
  })

  it('⛔ MUST: and on the panel’s own two entrances -- IC-74 and IC-78', () => {
    // 表 T-109: IC-74 「すべての行を開く」（表 T-051 の `HF-10`）, IC-78 「すべての行を
    //   畳む」（`HF-12`）. ⭐ THEY ARE DRAWN FOR THE PANEL AND NOT PER ROW, which
    //   is why FR-029's closing sentence has to reach them by name: 「本規則は …
    //   表 T-109 の全行に当たる」.
    const built = drawn(
      viewWith({
        rowTitlePanel: {
          pinnedTitles: [],
          titles: [rowTitle({ groupId: 'RowAlpha', expander: EVERY_CONTROL })],
          canOpenEveryRow: false,
          canCloseEveryRow: false,
        },
      }),
    )
    const root = built.root()

    for (const icon of [IC_OPEN_EVERY_ROW, IC_CLOSE_EVERY_ROW]) {
      expect(
        paintedColour(built, iconEntry(root, icon)),
        `FR-029 (MUST): ${icon} has nothing to do and is not painted S-148`,
      ).toBe(S_148)
    }
  })

  it('⭐ and neither is faint while it still has rows to reach', () => {
    // ⛔ WITHOUT THIS PAIR, A UNIT THAT PAINTED THOSE TWO FAINT ALWAYS WOULD PASS
    // THE CASE ABOVE while telling a person nothing.
    const built = drawn(
      viewWith({
        rowTitlePanel: {
          pinnedTitles: [],
          titles: [rowTitle({ groupId: 'RowAlpha', expander: EVERY_CONTROL })],
          canOpenEveryRow: true,
          canCloseEveryRow: true,
        },
      }),
    )
    const root = built.root()

    for (const icon of [IC_OPEN_EVERY_ROW, IC_CLOSE_EVERY_ROW]) {
      expect(paintedColour(built, iconEntry(root, icon)), `${icon} still has rows to reach`).not.toBe(
        S_148,
      )
    }
  })

  it('⭐ and an entrance that CAN be used is not painted that colour', () => {
    // ⛔ WITHOUT THIS PAIR, A UNIT THAT PAINTED EVERY ENTRANCE S-148 WOULD PASS
    // ALL THREE CASES ABOVE and would be telling a person nothing at all.
    const built = drawn(
      viewWith({
        appHeaderItems: {
          ...EMPTY_HEADER,
          commands: [command({ icon: IC_HEADER, isEnabled: true })],
        },
      }),
    )

    expect(paintedColour(built, iconEntry(built.root(), IC_HEADER))).not.toBe(S_148)
  })

  it('⛔ MUST NOT: a faint entrance is never disabled in the host’s own sense', () => {
    // 「薄く描いた入口を、宿主の意味で無効にしてはならない（MUST NOT）—— 無効にする
    //   と押下そのものが届かず、下の理由を告げる引き金が消える」. ⭐ On all three
    // surfaces, for the reason that sentence gives.
    const header = drawn(
      viewWith({
        appHeaderItems: {
          ...EMPTY_HEADER,
          commands: [command({ icon: IC_HEADER, isEnabled: false })],
        },
      }),
    )
    const palette = drawn(
      viewWith({ commandPalette: paletteWith([command({ icon: IC_PALETTE, isEnabled: false })]) }),
    )
    const rows = drawn(oneRow(NOTHING_TO_OPEN))

    const entries = [
      iconEntry(header.root(), IC_HEADER),
      iconEntry(palette.root(), IC_PALETTE),
      iconEntry(rowElement(rows), IC_ROW_OPEN),
    ]
    for (const entry of entries) {
      expect(
        entry.hasAttribute('disabled'),
        `FR-029 (MUST NOT): 宿主の意味で無効にしてはならない: ${serialize(entry)}`,
      ).toBe(false)
    }
  })
})
