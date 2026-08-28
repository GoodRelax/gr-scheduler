// The typography of the `Properties Panel` (U-25 of table T-103) -- the size
// the panel's text is drawn at, the smaller size its item names take, and where
// those item names sit.
//
// Unit under test: UF-71 of table T-075 (`dom-screen-surface.ts`, component
// CP-38 of table T-062, published as PI-38 of table T-064). It is the side of
// IF-9 that turns a `ScreenView` into nodes, so it is the side that states a
// size at all -- UF-64 (`properties-panel.ts`) says WHICH items the panel
// holds and carries no dimension.
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these cases have no node
// in the specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// ---------------------------------------------------------------------------
// The rules these cases answer to
// ---------------------------------------------------------------------------
//
//   FR-006      「パネルの寸法・余白・配置は `_assets/tbl-settings.md` の 表
//               T-206 の `S-186` 〜 `S-193` と `S-197` / `S-198` に従うこと
//               （MUST）。」
//               ⛔ 「項目名は値の欄の左に置き、右詰めにすること（MUST）」
//               （利用者の裁定 2026-08-27）。「幅は `S-189` が持つ。」
//               ⛔ 「パネルの文字を宿主の既定の大きさで描いてはならない（MUST
//               NOT）」（同じ裁定）—— 「大きさは `S-197` を宿主が与える地の文字
//               の大きさに掛けて求め、項目名にはさらに `S-198` を掛けること
//               （MUST）。」
//               ⛔ 「px の定数として持ってはならない（MUST NOT）」 -- 「読む人が
//               ブラウザで文字を大きくしたとき、パネルだけが取り残される」
//               （WCAG 2.1 の 1.4.4。要求としては `FR-039` が持つ）。
//               ⚠️ 「掛ける相手は 表 T-215 の `fontScaleSizes[fontScale]` では
//               ない。」 The requirement gives the ground in as many words:
//               `fontScale` decides the SCHEDULE's own text and 「パネルは日程
//               表ではなく外枠である」, and multiplying by that table would
//               reach 11.2px at its largest and 8.4px at its smallest.
//   S-197       table T-206, 「プロパティパネルの文字の大きさの係数」 -- ⭐ 「px
//               ではなく係数である」, and ⛔ 「参考実装の 11.9px をそのまま書き
//               取ってはならない —— あれは本仕様が持たない 17px から出た数で
//               ある」.
//   S-198       table T-206, 「項目名だけをさらに小さくする係数」 -- ⭐ 「掛ける
//               相手は `S-197` を適用したあとの大きさであって、`fontScaleSizes`
//               ではない」. ⚠️ Its own note separates it from S-189: 「あちらは
//               幅、本行は文字の大きさ」.
//   S-189       table T-206, 「項目名の欄が取る割合」 -- ⭐ 「px ではなく割合で
//               ある —— パネルの幅は `S-80` で人が動かすので、絶対値で持つと
//               広げたときに入力欄だけが伸びる」.
//   S-186       table T-206, the LOWER BOUND on a field's height -- ⛔ 「「高さ」
//               ではなく「下限」である —— 読む人がブラウザで文字を大きくした
//               とき、固定の高さは文字を切り落とす（`NFR-007`）」. ⭐ Read here
//               only as corroboration that the text inside a field is expected
//               to GROW with the reader's own setting; no case asserts it,
//               because a height is not what this file is about.
//   T-215       `fontScaleSizes` (S-121 / S-122 / S-123) -- read so that the
//               multiplicand FR-006 rules out can be named in a case rather
//               than described in a comment.
//   T-103 U-25  the settled name `Properties Panel`, which W-4 of table T-006a
//               (MUST) carries into the DOM as a `data-role`, so the panel is
//               found by the name the specification gave it.
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
// particular nothing was read about which CSS property the panel states its
// size in, nor in which unit. Every number below comes from a table.
//
// ⭐ THE SHAPE IS COPIED, NOT INVENTED. The fake browser, `stage` / `wiringOf`
// / `wire` / `surfaceOf`, the tree readers (`styleMap`, `inlineStyle`,
// `descendants`, `byRole`, `oneByRole`, `matches`) and the `ScreenView`
// fixtures are copied from tests/unit/uf-71.test.ts, which drives this same
// unit against this same fake. `shorthandParts` is copied from
// tests/unit/uf-72-screen-part.test.ts.
//
// ---------------------------------------------------------------------------
// ⛔ WHAT THESE CASES CAN AND CANNOT SEE, SO NO FAILURE IS MISREAD
// ---------------------------------------------------------------------------
//
// `npm test` runs under Node with no DOM (vitest.config.ts sets `environment:
// 'node'`), so there is no layout engine here and no computed style. What the
// fake records is what the unit WROTE: inline declarations, in order. So:
//
//   1. ⛔ A SIZE THAT ARRIVES THROUGH A STYLE SHEET IS INVISIBLE HERE. If the
//      panel's size were stated in a rule rather than on the node, these cases
//      would read the inherited size and fail. That failure would be this
//      file's blindness and not a defect -- ⚠️ REPORT IT, do not tune the
//      case. The neighbours' evidence is that this unit styles inline
//      (uf-71.test.ts reads `visibility`, `color` and a custom property off
//      the nodes themselves; uf-72-screen-part.test.ts reads `padding` and
//      `flex`), which is why the risk is taken rather than the question
//      dropped.
//   2. `var(--x)` is chased through the custom properties the unit wrote on the
//      node and its ancestors. ⚠️ A FALLBACK IS NOT HONOURED (`var(--x, 1em)`
//      is left unresolved and the case fails saying so) -- the same choice
//      uf-71.test.ts makes for colours, for the same reason: a resolver that
//      quietly accepted a fallback would sleep through the defect.
//   3. `rem` is resolved against the same base as the inherited size. The two
//      are the same thing for this rule: FR-006 says 「宿主が与える地の文字の
//      大きさ」, and both `em` at the top of the mounted tree and `rem` move
//      with the reader's browser setting, which is the whole of what the MUST
//      NOT protects (FR-039, WCAG 1.4.4).
//
// ⭐ WHAT IS DELIBERATELY NOT ASSERTED:
//   1. WHICH PROPERTY carries the size. No table names one, and PD-151 already
//      records that the choice of property is the drawing side's; the cases ask
//      what the panel COMPUTES TO under a base, which is the question FR-006
//      asks.
//   2. THE OTHER PANEL DIMENSIONS -- S-186 / S-187 / S-188 / S-190 / S-191 /
//      S-192 / S-193. They are the same MUST paragraph, and they are lengths
//      rather than typography; a file that meant them would drive them from
//      `NOT_STORED_PROPERTY_FIELD_SIZES` and is not this one.
//   3. THAT THE VALUE COLUMN IS LEFT-ALIGNED. The ruling right-aligns the item
//      NAME so that the boundary lines up; it says nothing about the value, and
//      an assertion about it would be invented.
//   4. WHAT THE PANEL LOOKS LIKE AT A GIVEN READER SETTING. The base text size
//      never reaches this unit -- `ScreenSurfaceWiring` has no member for it,
//      and that absence IS the design the MUST NOT asks for. So the cases
//      resolve the declaration under bases of their own choosing; the numbers
//      12 / 16 / 20 / 24 / 32 are this file's, and no case reads one of them as
//      the manuscript's.
//
// ⛔ THE HOLE. WHETHER THE CONTROLS ARE COVERED IS AN INFERENCE, NOT A QUOTE.
// FR-006 forbids drawing 「パネルの文字」 at the host's own size. It never says
// the word "control", and a form control does not inherit a font from its
// ancestors in a browser unless it is told to -- so the panel's own declaration
// leaves every `input` / `select` / `textarea` at the browser's default unless
// something states a size for them too. The case below reads 「パネルの文字」 as
// covering the text a person reads inside a field, on the strength of S-186's
// note (a fixed height 「読む人がブラウザで文字を大きくしたとき … 文字を切り落と
// す」, which presumes the field's text grows). ⚠️ If the ruling is that the
// prohibition stops at the plain text, this case is wrong and the manuscript
// needs the sentence that says so. Reported rather than dropped.

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
import { SETTINGS_DEFAULTS } from '../../src/entity/document-model/document-settings/document-settings'
import {
  domScreenSurface,
  type ScreenSurfaceWiring,
  type ScreenTheme,
} from '../../src/framework/dom-screen-surface/dom-screen-surface'
// ⭐ Borrowed from the contract kind on purpose: it is the one reader that takes
// its copy from the .md at read time, so a ratio that moves in table T-206
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
 * The number one row of table T-206 states.
 *
 * ⚠️ The cells carry a 🔎 beside the number (the mark that says it was measured
 * off the reference implementation), so the number is read out of the cell
 * rather than the cell parsed whole.
 */
function numberOf(id: string): number {
  const written = cellOf(id)
  const found = /-?\d+(?:\.\d+)?/.exec(written)
  if (found === null) throw new Error(`table T-206's ${id} states no number: ${written}`)
  return Number.parseFloat(found[0] as string)
}

/** S-197 -- the panel's text against the base the host gives. */
const S_197 = numberOf('S-197')

/** S-198 -- the item name against the size S-197 already produced. */
const S_198 = numberOf('S-198')

/** S-189 -- the share of the width the item name's column takes. */
const S_189 = numberOf('S-189')

/** The same as the table writes it, so a case can say the cell states a share. */
const S_189_CELL = cellOf('S-189')

/**
 * `fontScaleSizes` (S-121 / S-122 / S-123 of table T-215) -- the multiplicand
 * FR-006 rules out in as many words.
 */
const T_215 = specTable('T-215')
const FONT_SCALE_SIZES = ['S-121', 'S-122', 'S-123'].map((id) => {
  const row = T_215.rows.find((one) => one.id === id)
  if (row === undefined) throw new Error(`table T-215 no longer has row ${id}`)
  return Number.parseFloat(bare(row.by['値'] ?? ''))
})

/** U-25 of table T-103 -- the settled name that reaches the DOM as `data-role`. */
const U_25 = ((): string => {
  const row = specTable('T-103').rows.find((one) => one.id === 'U-25')
  if (row === undefined) throw new Error('table T-103 no longer has row U-25')
  return bare(row.by['確定名（英）'] ?? '')
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
// Reading a size out of what was written, which is the whole of this file.
// ---------------------------------------------------------------------------

/** Split a shorthand at the top level, so `calc(0.7 * 1em)` stays ONE value. Copied from uf-72. */
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

/**
 * What this node states for its own text size: the longhand, or the size part
 * of a `font` shorthand, or `''` where it states nothing.
 *
 * ⚠️ The `font` shorthand writes the size just before the family, optionally
 * with `/line-height` stuck to it -- so the first part that begins like a
 * number, a `calc(` or a `var(` is the size.
 */
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

/** The nearest declaration of a custom property, walking upwards from this node. */
function customProperty(element: FakeElement, name: string): string | null {
  let at: FakeElement | null = element
  while (at !== null) {
    const held = styleMap(at).get(name)
    if (held !== undefined && held.trim() !== '') return held.trim()
    at = at.parentNode
  }
  return null
}

/**
 * The same expression with every `var(--x)` replaced by what the tree declares
 * for it, or `null` when one of them cannot be resolved.
 *
 * ⚠️ NO FALLBACK IS HONOURED -- `var(--x, 1em)` is left alone, does not match,
 * and the arithmetic below then refuses it. A resolver that accepted the
 * fallback would report a size the page never draws.
 */
function expandVariables(element: FakeElement, value: string, depth = 0): string | null {
  if (depth > 8) return null
  const named = /var\(\s*(--[a-z0-9-]+)\s*\)/i.exec(value)
  if (named === null) return value
  const held = customProperty(element, named[1] as string)
  if (held === null) return null
  return expandVariables(element, value.replace(named[0] as string, `(${held})`), depth + 1)
}

/**
 * A length in px, given the size it inherits and the base the host gives.
 *
 * ⭐ EVERY UNIT THAT MOVES WITH THE READER IS ADMITTED (`em`, `rem`, `%`) AND SO
 * IS `px` -- because the point of these cases is to see whether a px constant
 * is in there, and a resolver that refused px could not tell a fixed size from
 * an unreadable one. Anything else (`ex`, `ch`, a viewport unit, an unresolved
 * `var`) leaves a non-numeric token behind and comes back as `null`.
 */
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
    // eslint-disable-next-line no-new-func
    const answer: unknown = new Function(`return (${arithmetic});`)()
    return typeof answer === 'number' && Number.isFinite(answer) ? answer : null
  } catch {
    return null
  }
}

/**
 * What this node's text COMPUTES TO, if the host's base text size were
 * `basePx`.
 *
 * ⭐ THIS IS THE QUESTION FR-006 ASKS, and it is asked of the whole chain: a
 * ratio stated on the panel and a px constant stated on an ancestor make a
 * fixed size together, and only resolving the chain can see it.
 */
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

/** Everything a failure needs to be read without opening the unit. */
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

/**
 * The nearest node that shows this text and has no child that shows it too.
 *
 * ⭐ FOUND BY WHAT IT SHOWS, NOT BY A ROLE OR A POSITION. No table names the
 * cell an item name sits in, so a case that looked one up by name would be
 * asserting a spelling the manuscript never settled. ⚠️ `includes` and not
 * equality, so a cell that draws the name with a separator beside it is still
 * the cell that draws the name.
 */
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

/** The alignment that reaches this node, from itself or the nearest ancestor that states one. */
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

/** 「右詰め」, however a box states it. */
const IS_RIGHT = new Set(['right', 'end', 'flex-end'])

/** The properties that could carry the room the item name's column takes. */
const WIDTH_PROPERTIES = [
  'width',
  'min-width',
  'max-width',
  'flex',
  'flex-basis',
  'grid-template-columns',
]

/** Every width this node or an ancestor up to `stopAt` states, nearest first. */
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

/** The controls a person edits a field through -- a form element, and nothing else. */
const CONTROL_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT'])

const controlsIn = (panel: FakeElement): FakeElement[] =>
  selfAndDescendants(panel).filter((one) => CONTROL_TAGS.has(one.tagName))

// ---------------------------------------------------------------------------
// Descriptions to draw. Every one is a value of `ScreenView` and nothing else.
// The shape is tests/unit/uf-71.test.ts's.
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
 * ⭐ THE ONE FIELD THE TYPOGRAPHY CASES COMPARE, and it is PR-9 on purpose:
 * table T-016 marks `percentComplete` 読み取り専用, so a panel that offers it no
 * control is the manuscript's own case rather than a contrived one -- and
 * `PropertyField.controls` says in as many words that the surface then 「writes
 * the value out as text」, which is what a case about text against text needs.
 *
 * ⚠️ THE VALUE IS A STRING OF THIS FILE'S OWN. This unit draws what it is
 * handed, and a distinct one keeps the name and the value from being found by
 * the same search.
 */
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
  // ⚠️ A room this file has no case about, stated so the description is a
  // whole one. FR-006's own room is `fr-006-panel-fields-drawn.test.ts`;
  // what matters here is only that the member is not missing.
  widthInFontSizes: 0,
  ...patch,
})

/**
 * One field per kind of control, so that a size which reached only some of them
 * is visible.
 *
 * ⚠️ The choices are this file's own strings and no case reads one as the
 * manuscript's -- the paragraph under table T-016 (MUST NOT) puts the real ones
 * in `_source/grs-document.schema.json`, and what a control OFFERS is not what
 * this file is about.
 */
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
        key: { holder: 'task', uid: 1, column: 'actualDuration' },
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
    // ⚠️ THE 選択 ROW IS `PR-17`, and it is the one the table still carries:
    // the shape item left table T-016 on 2026-08-27 because FR-029 forbids an
    // entrance that answers nothing, and FR-083 leaves the shape to the
    // palette. A field naming a row the table no longer holds would make this
    // fixture read as the manuscript's when it is not.
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
    text: 'ColourTextHere',
    isEditable: true,
    controls: [
      controlOf({
        key: { holder: 'taskVisual', uid: 1, column: 'strokeColor' },
        kind: 'color',
        text: 'ColourTextHere',
      }),
    ],
  },
]

/**
 * ⛔ NO HEADING IS OFFERED. FR-072 (MUST NOT) refuses the panel one -- 「⛔ **パネ
 * ルの先頭に見出しの行を置いてはならない（MUST NOT）**（利用者の指示 2026-08-27）」
 * (CR-272) -- and this fixture carried one until that row moved.
 *
 * ⚠️ THE CAST IS DELIBERATE AND NARROW. Whether the published description still
 * declares a member for a heading is the implementation's answer; a fixture that
 * turned either answer into a COMPILE error would take every case in this file
 * down with it, and rule 04 section 1 asks a disagreement to arrive as a test
 * that falls. ⛔ Every member FR-006's cases read is spelled out here.
 */
const panelWith = (fields: readonly PropertyField[]): PropertiesPanel =>
  ({
    showing: 'selection',
    isSubjectGone: false,
    fields,
    commands: [],
  }) as PropertiesPanel

/** The App Header measures to something, so BO-1's dimension is settled and the screen is drawn. */
const HEADER_HEIGHT = { 'App Header': 37 }

/** ⭐ Bases of this file's own choosing -- see the head comment, point 4. */
const BASES = [12, 16, 20, 24, 32]

function drawPanel(fields: readonly PropertyField[]): { built: Stage; panel: FakeElement } {
  const built = wire(HEADER_HEIGHT)
  surfaceOf(built).showScreenView(viewWith({ propertiesPanel: panelWith(fields) }))
  return { built, panel: oneByRole(built.root(), U_25) }
}

// ===========================================================================

describe('the manuscript still says what these cases read', () => {
  it('⭐ was really driven by the manuscript, and not by a hollow read of it', () => {
    // ⛔ WITHOUT THIS, A PARSE THAT PICKED UP THE WRONG COLUMN WOULD MAKE EVERY
    // CASE BELOW AGREE WITH ANYTHING -- rule 04 section 2: a mechanism is not
    // verified until it has been broken on purpose and seen to fail. S-186 in
    // the same column states a length in px, so a read that returned the value
    // column can be told from one that returned a heading or a reason.
    expect(cellOf('S-186')).toContain('px')
    expect(S_197).toBeGreaterThan(0)
    expect(S_197).toBeLessThan(1)
    expect(S_198).toBeGreaterThan(0)
    expect(S_198).toBeLessThan(1)
    expect(S_197, 'S-197 and S-198 are two different ratios').not.toBe(S_198)
    expect(FONT_SCALE_SIZES.every((one) => one > 0)).toBe(true)
    expect(U_25).toBe('Properties Panel')
  })

  it('⛔ S-197 and S-198 are ratios and state no px of their own', () => {
    // S-197: ⭐ 「px ではなく係数である」. ⛔ 「参考実装の 11.9px をそのまま書き
    // 取ってはならない —— あれは本仕様が持たない 17px から出た数である」, so a
    // cell that had grown a px is the defect that note names.
    expect(cellOf('S-197')).not.toContain('px')
    expect(cellOf('S-198')).not.toContain('px')
  })

  it('⛔ S-189 is a share of the width and not a length', () => {
    // ⭐ 「px ではなく割合である —— パネルの幅は `S-80` で人が動かすので、絶対値
    // で持つと広げたときに入力欄だけが伸びる」.
    expect(S_189_CELL).toContain('%')
    expect(S_189_CELL).not.toContain('px')
  })
})

describe("FR-006 (MUST) -- the panel's text is S-197 of the base the host gives", () => {
  it('computes to S-197 of the base, at every base a reader might set', () => {
    // 「大きさは `S-197` を宿主が与える地の文字の大きさに掛けて求め」. ⭐ The
    // base never reaches this unit -- `ScreenSurfaceWiring` has no member for
    // it -- so the only way a panel can satisfy this at every base is to state
    // a ratio and let the browser do the multiplying.
    const { built, panel } = drawPanel([READ_ONLY_FIELD])

    for (const base of BASES) {
      expect(sizeOf(built, panel, base), `a host base of ${base}px`).toBeCloseTo(S_197 * base, 9)
    }
  })

  it('⛔ MUST NOT: doubling the base doubles what the panel computes to', () => {
    // ⛔ 「px の定数として持ってはならない（MUST NOT）」 -- 「読む人がブラウザで
    // 文字を大きくしたとき、パネルだけが取り残される」（WCAG 2.1 の 1.4.4）.
    // ⭐ THIS IS THE CASE THE MUST NOT IS FOR. A px constant -- written on the
    // panel, or hidden behind a custom property, or stated on an ancestor the
    // panel inherits from -- gives the same number under both bases, and a
    // ratio cannot.
    const { built, panel } = drawPanel([READ_ONLY_FIELD])

    const small = sizeOf(built, panel, 16)
    const large = sizeOf(built, panel, 32)

    expect(large / small, 'the panel follows the reader, rather than a constant').toBeCloseTo(2, 9)
  })

  it('⛔ MUST NOT: it is not `fontScaleSizes[fontScale]` that is multiplied', () => {
    // ⚠️ 「掛ける相手は 表 T-215 の `fontScaleSizes[fontScale]` ではない」 --
    // 「`fontScale` が決めるのは日程表そのものの文字であり、パネルは日程表では
    // なく外枠である」. ⛔ The requirement even states what that mistake looks
    // like: 「いちばん大きい `L` でも 11.2px にしかならず、`S` では 8.4px にな
    // る」.
    // ⭐ The base below is deliberately none of table T-215's own numbers, so a
    // panel that multiplied the wrong thing cannot come out right by accident.
    const base = 20
    expect(FONT_SCALE_SIZES, 'the base this case drives with is not one of them').not.toContain(base)

    const { built, panel } = drawPanel([READ_ONLY_FIELD])
    const size = sizeOf(built, panel, base)

    expect(size).toBeCloseTo(S_197 * base, 9)
    for (const wrong of FONT_SCALE_SIZES) {
      expect(size, `S-197 x fontScaleSizes = ${S_197 * wrong}`).not.toBeCloseTo(S_197 * wrong, 9)
    }
  })
})

describe('FR-006 (MUST) -- the item name takes S-198 on top of that', () => {
  it('the item name is smaller than the value beside it by exactly S-198', () => {
    // 「項目名にはさらに `S-198` を掛けること（MUST）」, and S-198's own note:
    // ⭐ 「掛ける相手は `S-197` を適用したあとの大きさであって、`fontScaleSizes`
    // ではない —— パネル全体が縮んだうえで、その中でさらに項目名だけが小さい」.
    const { built, panel } = drawPanel([READ_ONLY_FIELD])

    const name = theCellShowing(panel, READ_ONLY_FIELD.name)
    const value = theCellShowing(panel, READ_ONLY_FIELD.text)

    for (const base of BASES) {
      const nameSize = sizeOf(built, name, base)
      const valueSize = sizeOf(built, value, base)
      expect(nameSize / valueSize, `a host base of ${base}px`).toBeCloseTo(S_198, 9)
    }
  })

  it('and so it is S-197 then S-198 of the base, never S-198 of the base alone', () => {
    // ⚠️ The two ratios COMPOUND. S-198 against the base by itself would leave
    // the item name larger than the value it names, which is the reading that
    // note exists to forbid.
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

describe('FR-006 (MUST) -- the item name sits to the left of the value, right-aligned', () => {
  it('⛔ MUST: the item name is right-aligned', () => {
    // ⛔ 「項目名は値の欄の左に置き、右詰めにすること（MUST）」（利用者の裁定
    // 2026-08-27）—— 「名前と値の境目が縦に揃っていないと、目が行ごとに境目を
    // 探し直すことになる」. ⚠️ Either spelling is accepted: the ruling asks for
    // the name pushed to the right of its own column, and a flex box states
    // that as `justify-content` where a block states it as `text-align`.
    const { panel } = drawPanel([READ_ONLY_FIELD])
    const name = theCellShowing(panel, READ_ONLY_FIELD.name)

    const aligned = alignmentReaching(name, panel)
    expect([...IS_RIGHT], `the item name's column states ${JSON.stringify(aligned)}`).toContain(
      aligned,
    )
  })

  it('⛔ MUST: the item name comes before the value it names', () => {
    // 「項目名は値の欄の左に置き」. ⚠️ WHAT THIS SEAM CAN SEE IS THE ORDER THE
    // NODES WERE PUT IN, which is left-to-right for the writing direction this
    // panel is drawn in; there is no layout engine here to ask where a box
    // landed. A panel that put the name after the value and pulled it back with
    // `order` would pass this case and fail a reader -- reported, not asserted,
    // because no table settles which property may place a field's parts.
    const { panel } = drawPanel([READ_ONLY_FIELD])
    const order = selfAndDescendants(panel)

    const name = order.indexOf(theCellShowing(panel, READ_ONLY_FIELD.name))
    const value = order.indexOf(theCellShowing(panel, READ_ONLY_FIELD.text))

    expect(name).toBeGreaterThanOrEqual(0)
    expect(value).toBeGreaterThan(name)
  })

  it("⛔ takes S-189's share of the width, and states no px for it", () => {
    // 「幅は `S-189` が持つ」, and S-189: ⭐ 「px ではなく割合である」.
    // ⚠️ THIS IS THE ARGUABLE CASE IN THIS FILE. The share may be stated on the
    // name's own cell or on the box that lays the row out, so the chain up to
    // the panel is read rather than one node; and a row that stated its columns
    // some other way again would fail here for the wording rather than for the
    // rule. ⛔ Left failing rather than loosened: 「幅は `S-189` が持つ」 is a
    // sentence of a MUST paragraph, and a panel that holds no share at all is
    // the defect S-189's note describes -- widening the panel then stretches
    // only the input.
    const { panel } = drawPanel([READ_ONLY_FIELD])
    const name = theCellShowing(panel, READ_ONLY_FIELD.name)
    const stated = widthsReaching(name, panel)

    const asShare = new RegExp(`(^|[^0-9.])${S_189}(\\.0+)?\\s*%`)
    const asLength = new RegExp(`(^|[^0-9.])${S_189}(\\.0+)?\\s*px`)

    expect(stated.some((one) => asShare.test(one)), stated.join(' | ')).toBe(true)
    expect(stated.some((one) => asLength.test(one)), stated.join(' | ')).toBe(false)
  })
})

describe('FR-006 (MUST NOT) -- the size reaches the controls, not only the outer box', () => {
  it('every control the panel draws computes to the panel size', () => {
    // ⛔ 「パネルの文字を宿主の既定の大きさで描いてはならない（MUST NOT）」 --
    // 「画面のほかのどこよりも大きい字でパネルだけが描かれ、同じ幅に入る項目が
    // 減る」. ⭐ A form control does not inherit a font from its ancestors on
    // its own, so a panel that stated its size once on the outer box leaves
    // every field's text at the host's default -- which is the very thing the
    // MUST NOT names, drawn in the place a person actually reads and types.
    // ⚠️ THE INFERENCE IS RECORDED IN THE HEAD COMMENT. FR-006 says 「パネルの
    // 文字」 and never the word "control".
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
    // The same MUST NOT, asked of the controls the way the panel was asked of
    // itself: a size that does not move with the base is a px constant however
    // it was written.
    const { built, panel } = drawPanel(EDITABLE_FIELDS)

    for (const control of controlsIn(panel)) {
      const named = control.getAttribute('data-row') ?? control.tagName
      const small = sizeOf(built, control, 16)
      const large = sizeOf(built, control, 32)
      expect(large / small, named).toBeCloseTo(2, 9)
    }
  })
})
