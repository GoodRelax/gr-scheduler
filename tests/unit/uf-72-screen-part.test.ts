// Unit tests for the THIRD member of `ScreenSurface` -- `readScreenPartAt`,
// which CR-192 added to IF-9 of 表 T-065 (docs/spec/05-07-design.md:386). The
// unit that implements it is UF-71 `dom-screen-surface.ts` (表 T-075),
// component `DomScreenSurface` (CP-38 of 表 T-062), published as PI-38 of
// 表 T-064.
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these have no node in the
// specification. 表 T-218 of Chapter 7 gives them their place: TS-6, tests/unit/.
//
// ⛔ WRITTEN WITHOUT READING THE UNIT'S BODY (docs/development-rules/
// 04-verification.md §1 -- the one who wrote a unit does not write its test).
// What was read: docs/spec/ for every rule below, change-request/CR-192-*.md,
// the seam declaration `src/adapter/screen-renderer/screen-surface.ts`, the
// `ScreenView` family in `src/adapter/screen-renderer/screen-renderer.ts`,
// `PointerPress` in `src/adapter/input-command-translator/`, and of UF-71 itself
// only its head comment, the exported interface `ScreenSurfaceWiring` and the
// one signature `domScreenSurface(wiring): ScreenSurface`. Every expected value
// here comes from a requirement, a table or a recorded provisional decision --
// never from the implementation.
//
// ⭐ WHY THE FAKE IS SHAPED THE WAY IT IS. This is a Framework unit: it builds
// nodes, and `npm test` runs under Node with no DOM at all (vitest.config.ts
// sets `environment: 'node'`). R7.3 and LY-5 of 表 T-060 ask for the browser to
// be handed in rather than reached for, so the unit takes a `Document` as an
// argument and these cases hand it a fake instead. ⛔ A unit that reached for a
// global would fail every case here, and `no document anywhere` says so out loud.
//
// ⚠️ R6.3 -- WHAT THE FAKE MAY AND MAY NOT DECIDE. The fake answers geometry the
// way a browser does and in no other way: a rectangle is half-open (the rule
// `rectHoldsPoint` already follows in
// src/entity/layout-engine/screen-regions/screen-regions.ts:99, citing R3.4),
// later in document order paints over earlier, and a subtree that is not shown
// takes no pointer. ⛔ It holds no rule about UI parts -- which of two parts a
// point belongs to, and which entry, is the unit's answer and never the fake's.
// The cases below also assert what the unit DID: which point it asked about,
// which nodes it measured, which members of the host it touched, and that it
// wrote nothing while answering.
// ⚠️ THE LIMIT OF THAT, SAID PLAINLY: the unit resolves a point through the
// host's own `elementFromPoint`, so what these cases pin is the unit's part and
// entry resolution and its refusal to add a margin of its own -- not rectangle
// arithmetic it does not do. A host without that member answers nothing at all;
// no requirement asks for a fallback, so none is expected here.
//
// The rules these cases answer to:
//   表 T-065 IF-9   the supply cell as CR-192 rewrote it -- 「画面上の点がどの
//                   UI パーツ（表 T-103）のどの入口（表 T-109）の上かを答える」,
//                   with the MUST under that table (:390): the side that DREW an
//                   entry is the side that answers where it is
//   表 T-023a       (MUST, 01-04-requirements.md:2251) 判定順序を適用するのは
//                   日程の描画領域だけとすること -- the floating palette, the
//                   open surface, the notices and the dialogue field hold no
//                   `ScreenRegions` rectangle, so a non-null answer over them is
//                   what stops a press from becoming PD-5's marquee underneath
//   表 T-023b       the arms, and the entries of 表 T-109 that set them
//   FR-053 / FR-083 SP-1 .. SP-4 -- a press on a palette shape arms or changes a
//                   shape, so the press has to reach the entry at all
//   FR-029          what cannot be used is drawn faint and gives its reason
//                   rather than going quiet -- so a disabled entry still answers
//   表 T-040 EZ-2   the explanation belongs to the icon the pointer rests ON;
//                   one entry, not its neighbour and not every icon
//   表 T-103        U-23 (MUST): an entrance is named by the `Row Title Panel`
//                   and never by the `Row Title Tree`; and 表 T-109's 面 column
//                   is the containing surface, not the grouping inside it
//   表 T-206 S-99g  「面」とは、画面の上に重ねて開き、`Esc` の第 1 階層で閉じ
//                   られるもの (_assets/tbl-settings.md:251) -- with IN-4 of
//                   表 T-028 putting 開いている面 FIRST in that order, an open
//                   surface stands over the palette where the two overlap
//   表 T-077 BO-1   nothing is drawn until the dimensions are settled, so before
//                   the first description a point is on nothing
//   R3.4            intervals are half-open by default; a point on the right or
//                   the bottom edge belongs to whatever comes next
//   R7.3 / LY-5     the browser ARRIVES; nothing here is reached for globally
//
// ⭐ Chapter 1.9 (:275) asks a test of a requirement that points at a table to be
// driven by a fixed copy of that table. `T_109_ARMING`, `T_109_ELSEWHERE` and
// `T_103_PARTS` are those copies, and each is checked against the .md at read
// time so it cannot fall behind a row.
//
// ⛔ ONE CASE IS DELIBERATELY LEFT FAILING -- see the last describe. It is a
// finding, not a chore.
//
// ⚠️ THREE THINGS ARE DELIBERATELY NOT ASSERTED, because no requirement decides
// them:
//   - what a disabled entry's REASON is carried as ON THIS SEAM. FR-029 (MUST)
//     asks for the reason to be given rather than the entry going quiet, and
//     `ScreenPart` carries `part` and `entry` and nothing else -- so what is
//     checked here is that the entry still answers, which is the half of FR-029
//     this member can carry. The words ride `CommandItem.label` and
//     `Tooltip.text`, which are UF-62's and UF-69's and are uf-71's to cover.
//   - which node of an entry is hit when its glyph is smaller than its box.
//     Nothing fixes an entry's geometry -- that is the whole reason IF-9 needs
//     this member -- so the layout below is this file's own, and only its EDGES
//     are asserted, against R3.4.
//   - which of two OPEN surfaces wins, because S-99g admits only one at a time.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import type {
  AppHeaderItems,
  CommandItem,
  CommandPalette,
  DialogueField,
  Notice,
  OpenModal,
  RowTitle,
  ScreenFrame,
  ScreenPart,
  ScreenSurface,
  ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'
import type { ScreenRect } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import {
  domScreenSurface,
  type ScreenSurfaceWiring,
} from '../../src/framework/dom-screen-surface/dom-screen-surface'
// ⭐ Borrowed from the contract kind on purpose: it is the one reader that takes
// the copy from the .md at read time, which is what keeps the rosters below from
// falling behind a row.
import { specTable } from '../contract/spec-table'

// ---------------------------------------------------------------------------
// Fixed copies of the tables these cases are driven by.
// ---------------------------------------------------------------------------

/**
 * The entries of 表 T-109 that ARM something on the palette, each with the row
 * of 表 T-023b it arms.
 *
 * ⭐ This is the set FR-083's SP-1 .. SP-4 speak of -- 「パレットの形状を押した
 * とき」 -- together with AR-4, AR-5 and AR-6, which 表 T-023b counts as arms as
 * well. ⛔ IC-50 / IC-51 are NOT here although they sit in the same 群: they open
 * and fold the list of milestone figures, and arm nothing.
 */
const T_109_ARMING = [
  { row: 'IC-23', arm: 'AR-2' },
  { row: 'IC-24', arm: 'AR-2' },
  { row: 'IC-25', arm: 'AR-2' },
  { row: 'IC-26', arm: 'AR-2' },
  { row: 'IC-27', arm: 'AR-3' },
  { row: 'IC-28', arm: 'AR-3' },
  { row: 'IC-29', arm: 'AR-3' },
  { row: 'IC-30', arm: 'AR-3' },
  { row: 'IC-31', arm: 'AR-3' },
  { row: 'IC-32', arm: 'AR-3' },
  { row: 'IC-33', arm: 'AR-3' },
  { row: 'IC-34', arm: 'AR-3' },
  { row: 'IC-35', arm: 'AR-5' },
  { row: 'IC-36', arm: 'AR-6' },
  { row: 'IC-61', arm: 'AR-4' },
] as const

/**
 * Entries of 表 T-109 drawn somewhere OTHER than the palette, with the surface
 * its 面 column gives them.
 *
 * ⚠️ IC-58 .. IC-60 sit on the `Row Title Panel` (U-22) and not on the `Row
 * Title Tree` (U-23), which is what U-23's MUST is about.
 */
const T_109_ELSEWHERE = [
  { row: 'IC-5', surface: 'App Header' },
  { row: 'IC-7', surface: 'App Header' },
  { row: 'IC-12', surface: 'App Header' },
  { row: 'IC-13', surface: 'App Header' },
  { row: 'IC-58', surface: 'Row Title Panel' },
  { row: 'IC-59', surface: 'Row Title Panel' },
  { row: 'IC-60', surface: 'Row Title Panel' },
] as const

/** 表 T-103 — the settled names these cases look for. */
const T_103_PARTS = [
  { row: 'U-22', name: 'Row Title Panel' },
  { row: 'U-23', name: 'Row Title Tree' },
  { row: 'U-26', name: 'Command Palette' },
  { row: 'U-30', name: 'Help Modal' },
  { row: 'U-31', name: 'App Header' },
  { row: 'U-34', name: 'Palette Commands' },
  { row: 'U-35', name: 'Header Commands' },
  { row: 'U-44', name: 'Dialogue Field' },
] as const

/** 表 T-023a's own note, which the 面 table under it belongs to. */
const T_023A_ONLY_THE_DRAWING_AREA =
  '判定順序を適用するのは日程の描画領域だけとすること（MUST）。'

/** The MUST under 表 T-065 that puts the answer on the side that drew it. */
const T_065_THE_SIDE_THAT_DREW_IT =
  '点がどの入口の上かは、その入口を描いた側が答えること（MUST）'

/** S-99g's definition of 「面」 -- what stands OVER the screen. */
const S_99G_OVER_THE_SCREEN = '画面の上に重ねて開き'

const specText = (...parts: string[]): string =>
  readFileSync(join(process.cwd(), 'docs', 'spec', ...parts), 'utf8')

// ---------------------------------------------------------------------------
// The fake browser.
// ---------------------------------------------------------------------------

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

type StyleWrite =
  | { readonly kind: 'reset'; readonly css: string }
  | { readonly kind: 'set'; readonly property: string; readonly value: string }

/** One question about a point, as the unit put it. */
interface PointQuery {
  readonly member: string
  readonly x: number
  readonly y: number
}

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
    readonly world: World,
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

  get parentElement(): FakeElement | null {
    return this.parentNode
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
    const box = laidOut(this)
    return {
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height,
      top: box.y,
      left: box.x,
      right: box.x + box.width,
      bottom: box.y + box.height,
    }
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
  readonly pointQueries: PointQuery[]
  /** This file's own placing, by `data-icon` first and then by `data-role`. */
  readonly layout: Map<string, ScreenRect>
  mount: FakeElement | null
  activeElement: FakeElement | null
}

// ---------------------------------------------------------------------------
// The fake's geometry. ⛔ A browser's rules, and no opinion of this file's.
// ---------------------------------------------------------------------------

const ZERO: ScreenRect = { x: 0, y: 0, width: 0, height: 0 }

const layoutKey = (element: FakeElement): string | null => {
  const icon = element.attributes.get('data-icon')
  if (icon !== undefined) return `icon:${icon}`
  const role = element.attributes.get('data-role')
  if (role !== undefined) return `role:${role}`
  return null
}

/**
 * Where this node sits.
 *
 * ⭐ Worked out from the ATTRIBUTES the unit wrote rather than from a table keyed
 * by node, so that a measurement taken while drawing and one taken while
 * answering a point cannot disagree. A node the layout does not place takes the
 * union of what it holds, the way a plain box does.
 */
function laidOut(element: FakeElement): ScreenRect {
  const key = layoutKey(element)
  if (key !== null) {
    const placed = element.world.layout.get(key)
    if (placed !== undefined) return placed
  }
  let box: ScreenRect | null = null
  for (const child of element.children) {
    const inside = laidOut(child)
    if (inside.width === 0 && inside.height === 0) continue
    box = box === null ? inside : union(box, inside)
  }
  return box ?? ZERO
}

function union(a: ScreenRect, b: ScreenRect): ScreenRect {
  const x = Math.min(a.x, b.x)
  const y = Math.min(a.y, b.y)
  return {
    x,
    y,
    width: Math.max(a.x + a.width, b.x + b.width) - x,
    height: Math.max(a.y + a.height, b.y + b.height) - y,
  }
}

/**
 * Half-open on both axes -- the same rule `rectHoldsPoint` follows in
 * src/entity/layout-engine/screen-regions/screen-regions.ts:99, which cites R3.4
 * of docs/development-rules/07-review-standards.md:495.
 */
const holdsPoint = (box: ScreenRect, x: number, y: number): boolean =>
  box.width > 0 &&
  box.height > 0 &&
  x >= box.x &&
  x < box.x + box.width &&
  y >= box.y &&
  y < box.y + box.height

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

/**
 * Every node the point lands on, topmost first.
 *
 * ⭐ A browser's order: later in document order paints over earlier, and a
 * subtree that is not shown takes no pointer. ⛔ Which of two UI PARTS wins is
 * not decided here -- that is the unit's answer, and this only says what a page
 * would have looked like.
 */
function stackAt(root: FakeElement, x: number, y: number): FakeElement[] {
  const found: FakeElement[] = []
  const walk = (at: FakeElement): void => {
    if (isHiddenHere(at)) return
    if (holdsPoint(laidOut(at), x, y)) found.push(at)
    for (const child of at.children) walk(child)
  }
  walk(root)
  return found.reverse()
}

// ---------------------------------------------------------------------------
// Wiring the unit up.
// ---------------------------------------------------------------------------

interface Stage {
  readonly world: World
  readonly host: Document
  readonly mount: FakeElement
  readonly reportedHeights: number[]
  surface: ScreenSurface | undefined
  root(): FakeElement
}

/**
 * A browser that is only what `ScreenSurfaceWiring` says it is, plus the one
 * member a real `Document` offers for a point.
 *
 * ⚠️ The host is a Proxy so that every member the unit reaches for is recorded.
 */
function stage(layout: Map<string, ScreenRect>): Stage {
  const world: World = {
    created: [],
    registrations: [],
    measured: [],
    selectors: [],
    markupWrites: [],
    hostMembers: [],
    pointQueries: [],
    layout,
    mount: null,
    activeElement: null,
  }

  const mount = new FakeElement('div', world)
  mount.isMount = true
  world.mount = mount

  const base: Record<string, unknown> = {
    createElement(tagName: string): FakeElement {
      const made = new FakeElement(tagName, world)
      world.created.push(made)
      return made
    },
    elementFromPoint(x: number, y: number): FakeElement | null {
      world.pointQueries.push({ member: 'elementFromPoint', x, y })
      return stackAt(mount, x, y)[0] ?? null
    },
    elementsFromPoint(x: number, y: number): FakeElement[] {
      world.pointQueries.push({ member: 'elementsFromPoint', x, y })
      return stackAt(mount, x, y)
    },
  }

  const host = new Proxy(base, {
    get(target, property, receiver): unknown {
      if (typeof property === 'string') world.hostMembers.push(property)
      return Reflect.get(target, property, receiver)
    },
    has(target, property): boolean {
      if (typeof property === 'string') world.hostMembers.push(property)
      return Reflect.has(target, property)
    },
  }) as unknown as Document

  return {
    world,
    host,
    mount,
    reportedHeights: [],
    surface: undefined,
    root(): FakeElement {
      const first = mount.children[0]
      if (first === undefined) throw new Error('the unit mounted nothing')
      return first
    },
  }
}

function wiringOf(built: Stage): ScreenSurfaceWiring {
  return {
    host: built.host,
    mount: built.mount as unknown as Element,
    readAuthor: (): string => 'Watcher',
    readClockMs: (): number => Date.UTC(2026, 7, 21, 3, 4, 5),
    onAppHeaderHeightPx: (heightPx: number): void => {
      built.reportedHeights.push(heightPx)
    },
  }
}

function wire(layout: Map<string, ScreenRect> = LAYOUT): Stage {
  const built = stage(layout)
  built.surface = domScreenSurface(wiringOf(built))
  return built
}

function surfaceOf(built: Stage): ScreenSurface {
  if (built.surface === undefined) throw new Error('the surface was not built')
  return built.surface
}

/** Wire up and draw -- the shape almost every case takes. */
function drawn(view: ScreenView): Stage {
  const built = wire()
  surfaceOf(built).showScreenView(view)
  return built
}

const ask = (built: Stage, x: number, y: number): ScreenPart | null =>
  surfaceOf(built).readScreenPartAt(x, y)

// ---------------------------------------------------------------------------
// Reading the tree the unit built.
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

function entryFor(root: FakeElement, icon: string): FakeElement {
  const found = selfAndDescendants(root).filter((one) => one.getAttribute('data-icon') === icon)
  const first = found[0]
  if (first === undefined) throw new Error(`nothing carries data-icon="${icon}"`)
  return first
}

/** Attributes and text together, for the case that asks whether anything moved. */
function serialize(element: FakeElement): string {
  const attributes = [...element.attributes].map(([name, value]) => ` ${name}="${value}"`).join('')
  const style = inlineStyle(element)
  const inside = element.childNodes
    .map((one) => (one instanceof FakeText ? one.data : serialize(one)))
    .join('')
  const tag = element.tagName.toLowerCase()
  return `<${tag}${attributes}${style === '' ? '' : ` style="${style}"`}>${inside}</${tag}>`
}

/** A tiny selector engine: enough for `[attr]`, `[attr="value"]`, a tag and a descendant. */
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
// The screen these cases press on.
// ---------------------------------------------------------------------------

const rect = (x: number, y: number, width: number, height: number): ScreenRect => ({
  x,
  y,
  width,
  height,
})

/** 1000 x 800, with an `App Header` inside S-116's band (32 .. 96). */
const WINDOW = { width: 1000, height: 800 } as const
const HEADER_HEIGHT = 40
const ENTRY = 24

/** Four header entries; IC-13 and IC-12 TOUCH, so R3.4 has an edge to resolve. */
const HEADER_ENTRY_X: Readonly<Record<string, number>> = {
  'IC-5': 100,
  'IC-7': 132,
  'IC-13': 180,
  'IC-12': 204,
}

const paletteEntryBox = (index: number): ScreenRect =>
  rect(410 + (index % 6) * 30, 310 + Math.floor(index / 6) * 30, ENTRY, ENTRY)

/**
 * ⭐ Chosen so that every relation a case needs is present exactly once: the
 * `Help Modal` overlaps the palette WITHOUT covering it, the notices box begins
 * on the `App Header`'s bottom edge, and the `Row Title Tree` sits on the `Row
 * Title Panel`.
 */
const LAYOUT = new Map<string, ScreenRect>([
  ['role:App Header', rect(0, 0, WINDOW.width, HEADER_HEIGHT)],
  ['role:Row Title Panel', rect(0, 40, 170, 660)],
  ['role:Row Title Tree', rect(0, 40, 170, 660)],
  // ⭐ The `Row Expander` is placed by ROLE and the `Row Pin` by ICON, and the
  // difference is the unit's, not this file's: the unit marks the pin with its
  // row of 表 T-109 (`data-icon="IC-60"`) and deliberately leaves the expander
  // unmarked (IC-58 / IC-59 are not yet drawn as a pair). `layoutKey` reads
  // `data-icon` FIRST -- as it must, since a browser lays a node out whatever
  // attributes it carries -- so each box has to be registered under the key its
  // own node actually yields. ⛔ Registering the pin under `role:Row Pin` would
  // give it the ZERO rectangle in silence and no press would ever reach it.
  ['role:Row Expander', rect(10, 60, 16, 16)],
  ['icon:IC-60', rect(140, 60, 16, 16)],
  ['role:Command Palette', rect(400, 300, 220, 180)],
  ['role:Help Modal', rect(500, 380, 400, 300)],
  ['role:notices', rect(700, 40, 280, 80)],
  ['role:Dialogue Field', rect(200, 700, 600, 60)],
  ['icon:IC-52', rect(860, 390, ENTRY, ENTRY)],
  ...Object.entries(HEADER_ENTRY_X).map(
    ([icon, x]): [string, ScreenRect] => [`icon:${icon}`, rect(x, 8, ENTRY, ENTRY)],
  ),
  ...T_109_ARMING.map(
    (one, index): [string, ScreenRect] => [`icon:${one.row}`, paletteEntryBox(index)],
  ),
])

/** Points the cases press, each named for what it is on. */
const AT = {
  entryIc5: { x: 112, y: 20 },
  entryIc7: { x: 144, y: 20 },
  entryIc13: { x: 190, y: 20 },
  headerNoEntry: { x: 600, y: 20 },
  headerLastRow: { x: 750, y: 39 },
  noticesFirstRow: { x: 750, y: 40 },
  paletteNoEntry: { x: 600, y: 320 },
  paletteUnderModal: { x: 550, y: 400 },
  modalOnly: { x: 520, y: 650 },
  modalEntry: { x: 870, y: 400 },
  notices: { x: 900, y: 100 },
  dialogue: { x: 300, y: 730 },
  rowPin: { x: 144, y: 64 },
  rowTreeNoEntry: { x: 80, y: 400 },
  bareSchedule: { x: 500, y: 600 },
} as const

const command = (patch: Partial<CommandItem> & { icon: string }): CommandItem => ({
  isEnabled: true,
  isPressed: false,
  label: patch.icon,
  ...patch,
})

const FRAME: ScreenFrame = {
  isFullScreen: false,
  // ⚠️ The `Row Title Panel` is drawn against the boundary FR-052 gives it, so
  // the frame has to carry one for the panel to be on the screen at all.
  dividers: [{ panel: 'rowTitlePanel', band: rect(170, 40, 6, 660), line: rect(172, 40, 1, 660) }],
  scrollbars: [],
}

const HEADER: AppHeaderItems = {
  documentTitle: 'DocumentTitleHere',
  autosaveStatus: { kind: 'saved', at: '2026-08-21T03:04:05Z' },
  commands: [
    // ⛔ FR-029: what cannot be used is drawn faint and does NOT go quiet.
    command({ icon: 'IC-5', label: 'UndoNothingToUndo', isEnabled: false }),
    command({ icon: 'IC-7', label: 'ShowPalette' }),
    command({ icon: 'IC-13', label: 'ZoomTimeIn' }),
    command({ icon: 'IC-12', label: 'ZoomTimeOut' }),
  ],
}

const rowTitle = (patch: Partial<RowTitle> & { groupId: string }): RowTitle => ({
  depth: 1,
  box: rect(0, 40, 170, 24),
  label: patch.groupId,
  wholeLabel: patch.groupId,
  isLabelTruncated: false,
  expander: null,
  isPinned: false,
  isSelected: false,
  ...patch,
})

const PALETTE: CommandPalette = {
  box: rect(400, 300, 220, 180),
  isPointerOver: false,
  groups: [
    {
      name: 'PlaceGroup',
      commands: T_109_ARMING.map((one) => command({ icon: one.row, label: one.arm })),
    },
  ],
  armedText: 'ArmedNothing',
}

const HELP_MODAL: OpenModal = {
  surface: 'Help Modal',
  heading: 'HelpHeading',
  commands: [command({ icon: 'IC-52', label: 'CloseHelp' })],
  entries: [{ table: 'T-036', row: 'MK-1', text: 'HelpEntryOne' }],
  language: 'en',
  licenceText: 'LicenceTextHere',
  copyrightNotice: 'CopyrightNoticeHere',
  attributions: ['AttributionOne'],
}

const NOTICE: Notice = {
  manner: 'NT-3',
  text: 'NoticeTextOne',
  nextSteps: ['NextStepOne'],
  affectedCount: 3,
}

const DIALOGUE: DialogueField = {
  messages: [
    { sequence: 1, author: 'Someone', text: 'MessageOne', settledAt: '2026-08-20T00:00:00Z' },
  ],
}

const BASE_VIEW: ScreenView = {
  frame: FRAME,
  appHeaderItems: HEADER,
  rowTitlePanel: {
    pinnedTitles: [],
    titles: [
      rowTitle({
        groupId: 'g-1',
        label: 'RowOne',
        isPinned: true,
        expander: { canOpen: true, canClose: false },
      }),
    ],
  },
  propertiesPanel: null,
  commandPalette: null,
  openModal: null,
  notices: [],
  dialogueField: null,
  tooltips: [],
}

const viewWith = (patch: Partial<ScreenView>): ScreenView => ({ ...BASE_VIEW, ...patch })

/** Everything 表 T-023a's 面 table names, drawn at once. */
const OVER_THE_SCHEDULE: ScreenView = viewWith({
  commandPalette: PALETTE,
  openModal: HELP_MODAL,
  notices: [NOTICE],
  dialogueField: DIALOGUE,
})

/** The palette with nothing over it. */
const PALETTE_VIEW: ScreenView = viewWith({ commandPalette: PALETTE })

// ===========================================================================

describe('the specification still says what these cases copy', () => {
  it('表 T-065 IF-9 supplies a THIRD thing: which UI part and which entry a point is on', () => {
    const row = specTable('T-065').rows.find((one) => one.id === 'IF-9')
    expect(row, '表 T-065 no longer holds IF-9').toBeDefined()

    const supply = row?.cells[row.cells.length - 1] ?? ''
    // The two halves that were always there.
    expect(supply).toContain('作った記述を画面に載せ')
    expect(supply).toContain('対話欄で確定した発話を返')
    // ⭐ CR-192's third, which is what this whole file tests.
    expect(supply).toContain('画面上の点')
    expect(supply).toContain('UI パーツ')
    expect(supply).toContain('入口')
    expect(supply).toContain('T-103')
    expect(supply).toContain('T-109')
    // The sides are unchanged: declared by ScreenRenderer, drawn by this unit.
    expect(row?.cells.join(' ')).toContain('ScreenSurface')
    expect(row?.cells.join(' ')).toContain('DomScreenSurface')
  })

  it('表 T-065 still puts the answer on the side that drew the entry (MUST)', () => {
    expect(specText('05-07-design.md')).toContain(T_065_THE_SIDE_THAT_DREW_IT)
  })

  it('表 T-023a still limits the decision order to the schedule drawing area (MUST)', () => {
    expect(specText('01-04-requirements.md')).toContain(T_023A_ONLY_THE_DRAWING_AREA)
  })

  it('S-99g still defines 面 as what opens OVER the screen', () => {
    const row = specTable('T-206').rows.find((one) => one.id === 'S-99g')
    expect(row?.cells.join(' ')).toContain(S_99G_OVER_THE_SCREEN)
  })

  it('IN-4 of 表 T-028 still consumes the open surface FIRST, before the arm', () => {
    const manner = specTable('T-028').rows.find((one) => one.id === 'IN-4')?.cells.join(' ') ?? ''
    expect(manner).toContain('開いている面')
    expect(manner.indexOf('開いている面')).toBeLessThan(manner.indexOf('構え'))
  })

  it('表 T-109 still puts every arming entry on the Command Palette', () => {
    const rows = specTable('T-109').rows
    for (const one of T_109_ARMING) {
      const row = rows.find((held) => held.id === one.row)
      expect(row, `表 T-109 no longer holds ${one.row}`).toBeDefined()
      expect(row?.cells[0], `${one.row} left the Command Palette`).toContain('Command Palette')
    }
    // ⛔ 表 T-023b's arms but AR-1 (which is "none"), and nothing invented.
    expect([...new Set(T_109_ARMING.map((one) => one.arm))].sort()).toEqual([
      'AR-2',
      'AR-3',
      'AR-4',
      'AR-5',
      'AR-6',
    ])
  })

  it('表 T-109 still puts the other entries on the surfaces these cases expect', () => {
    const rows = specTable('T-109').rows
    for (const one of T_109_ELSEWHERE) {
      const row = rows.find((held) => held.id === one.row)
      expect(row, `表 T-109 no longer holds ${one.row}`).toBeDefined()
      expect(row?.cells[0]).toContain(one.surface)
    }
  })

  it('表 T-103 still spells every settled name these cases look for', () => {
    const rows = specTable('T-103').rows
    for (const part of T_103_PARTS) {
      const row = rows.find((one) => one.id === part.row)
      expect(row, `表 T-103 no longer holds ${part.row}`).toBeDefined()
      expect(row?.cells[0]).toContain(`\`${part.name}\``)
    }
  })

  it('U-23 still requires an entrance to be named by the Row Title Panel (MUST)', () => {
    const row = specTable('T-103').rows.find((one) => one.id === 'U-23')
    expect(row?.cells.join(' ')).toContain(
      '操作の入口を指すときは「行見出しパネル」と書くこと（MUST）',
    )
  })
})

describe('R7.3 / LY-5 -- the browser arrives, it is not reached for', () => {
  it('no document anywhere: a global reach would fail every case in this file', () => {
    // ⛔ If this stops being true the file stops proving R7.3 -- a unit that
    // reached for `globalThis.document` would quietly succeed instead.
    expect('document' in globalThis).toBe(false)
    expect('window' in globalThis).toBe(false)
  })

  it('answers a point with no DOM in the environment at all', () => {
    const built = drawn(OVER_THE_SCHEDULE)

    expect(ask(built, AT.entryIc7.x, AT.entryIc7.y)).toEqual({
      part: 'App Header',
      entry: 'IC-7',
    })
  })

  it('touches no member of the host beyond making elements and asking about a point', () => {
    const built = drawn(OVER_THE_SCHEDULE)
    const before = built.world.hostMembers.length

    ask(built, AT.entryIc7.x, AT.entryIc7.y)

    // ⚠️ `elementsFromPoint` is admitted beside `elementFromPoint`: both put the
    // SAME question, and 表 T-065 fixes the answer rather than the way of getting
    // it. Anything else would be this unit reading a value LY-5 leaves with the
    // caller.
    for (const member of new Set(built.world.hostMembers.slice(before))) {
      expect(['createElement', 'elementFromPoint', 'elementsFromPoint']).toContain(member)
    }
  })
})

describe('IF-9 of 表 T-065 -- three supplies, three members', () => {
  it('publishes readScreenPartAt beside the two members that were always there', () => {
    const surface = surfaceOf(wire())

    expect(Object.keys(surface).sort()).toEqual([
      'readDialogueInput',
      'readScreenPartAt',
      'showScreenView',
    ])
    expect(typeof surface.readScreenPartAt).toBe('function')
  })

  it('answers with the two members ScreenPart declares and nothing else', () => {
    const built = drawn(OVER_THE_SCHEDULE)

    const answer = ask(built, AT.entryIc7.x, AT.entryIc7.y)
    expect(answer).not.toBeNull()
    expect(Object.keys(answer ?? {}).sort()).toEqual(['entry', 'part'])
  })
})

describe("表 T-023a (MUST) -- the decision order is the drawing area's alone", () => {
  // ⛔ 01-04-requirements.md:2251 「判定順序を適用するのは日程の描画領域だけとする
  // こと（MUST）」. The four parts below hold no `ScreenRegions` rectangle -- PI-35
  // has six and none of them is one of these -- so `regionAtPointer` answers
  // `rowArea` for a point on any of them. A non-null answer here is what stops
  // PD-5's marquee from starting underneath an open surface.
  const overTheSchedule = [
    { part: 'Command Palette', at: AT.paletteNoEntry, why: 'FR-053 floats it' },
    { part: 'Help Modal', at: AT.modalOnly, why: 'S-99g opens it over the screen' },
    { part: 'notices', at: AT.notices, why: 'FR-076 raises it over the screen' },
    { part: 'Dialogue Field', at: AT.dialogue, why: 'FR-066 puts it up' },
  ] as const

  it.each(overTheSchedule)(
    'a press on the $part answers that part, never nothing ($why)',
    ({ part, at }) => {
      const built = drawn(OVER_THE_SCHEDULE)

      const answer = ask(built, at.x, at.y)
      expect(answer, `a press at ${at.x},${at.y} was read as bare schedule`).not.toBeNull()
      expect(answer?.part).toBe(part)
    },
  )

  it('a press on a part but on none of its entries answers the part with entry null', () => {
    const built = drawn(OVER_THE_SCHEDULE)

    // ⭐ The third answer CR-192 argued for: neither an entry nor the schedule.
    expect(ask(built, AT.paletteNoEntry.x, AT.paletteNoEntry.y)).toEqual({
      part: 'Command Palette',
      entry: null,
    })
  })

  it('a press where the schedule is exposed answers null -- and PD-5 may run', () => {
    const built = drawn(viewWith({}))

    expect(ask(built, AT.bareSchedule.x, AT.bareSchedule.y)).toBeNull()
  })
})

describe('FR-029 -- a disabled entry answers; it does not go quiet', () => {
  it('answers IC-5 although that entry cannot be used', () => {
    const built = drawn(viewWith({}))

    // ⛔ FR-029's RATIONALE: 「無反応だと故障に見える」. An entry that answered
    // `null` would BE the unresponsive one, and the reason a person is shown
    // (EZ-2's explanation, hung on this very entry) can only be raised once the
    // shell knows WHICH entry the pointer is on.
    expect(ask(built, AT.entryIc5.x, AT.entryIc5.y)).toEqual({
      part: 'App Header',
      entry: 'IC-5',
    })
  })

  it('answers it exactly as it answers the entry beside it that can be used', () => {
    const built = drawn(viewWith({}))

    const cannot = ask(built, AT.entryIc5.x, AT.entryIc5.y)
    const can = ask(built, AT.entryIc7.x, AT.entryIc7.y)
    expect(cannot?.part).toBe(can?.part)
    expect(cannot?.entry).toBe('IC-5')
    expect(can?.entry).toBe('IC-7')
  })

  it('⛔ keeps the entry pointable -- it is drawn faint, not taken out of the tree', () => {
    const built = drawn(viewWith({}))

    // ⚠️ The `disabled` attribute stops an element taking the pointer, and then
    // no answer above could ever be given. FR-029 asks for 「薄く描く」.
    const entry = entryFor(built.root(), 'IC-5')
    expect(entry.hasAttribute('disabled')).toBe(false)
    expect(isShown(entry)).toBe(true)
  })
})

describe('FR-053 / 表 T-023b -- the palette can be armed from (SP-1 .. SP-4)', () => {
  // ⭐ FR-083's SP-1 .. SP-4 turn on WHICH ENTRY was pressed and on what is
  // selected. The selection is the translator's; the entry is this member's, and
  // until it answered, 表 T-023b could only ever be AR-1 -- CR-192's own account
  // of the hole.
  it.each(T_109_ARMING)('answers $row on the Command Palette (arms $arm)', ({ row }) => {
    const built = drawn(PALETTE_VIEW)

    const box = LAYOUT.get(`icon:${row}`)
    expect(box, `this file has no place for ${row}`).toBeDefined()
    const at = box ?? ZERO
    expect(ask(built, at.x + 2, at.y + 2)).toEqual({ part: 'Command Palette', entry: row })
  })

  it('names the containing surface, not the grouping inside it (U-34)', () => {
    const built = drawn(PALETTE_VIEW)

    // ⚠️ `Palette Groups` and `Palette Commands` (U-34) really are drawn; the
    // answer names the surface anyway, because that is the granularity 表 T-109's
    // 面 column uses and the only one an entry can be joined back to it by.
    expect(byRole(built.root(), 'Palette Commands').length).toBeGreaterThan(0)
    expect(ask(built, 412, 312)?.part).toBe('Command Palette')
  })

  it('names the App Header, not Header Commands, for an entry drawn in it (U-35)', () => {
    const built = drawn(viewWith({}))

    expect(byRole(built.root(), 'Header Commands').length).toBeGreaterThan(0)
    expect(ask(built, AT.entryIc7.x, AT.entryIc7.y)?.part).toBe('App Header')
  })

  it('⛔ names the Row Title Panel and never the Row Title Tree (U-23, MUST)', () => {
    const built = drawn(viewWith({}))

    // ⚠️ The tree is drawn ON the panel and is the nearer name, which is exactly
    // the spelling U-23 forbids for an entrance -- and which 表 T-109 does not
    // use for IC-58 .. IC-60 either.
    expect(byRole(built.root(), 'Row Title Tree').length).toBeGreaterThan(0)
    expect(ask(built, AT.rowTreeNoEntry.x, AT.rowTreeNoEntry.y)?.part).toBe('Row Title Panel')
  })
})

describe('EZ-2 of 表 T-040 -- the icon the pointer rests ON', () => {
  it('answers one entry, and it is the one under the point', () => {
    const built = drawn(viewWith({}))

    // Four entries are drawn; the answer names exactly the one pressed.
    expect(ask(built, AT.entryIc13.x, AT.entryIc13.y)?.entry).toBe('IC-13')
  })

  it('⛔ does not answer the neighbour that shares an edge with it', () => {
    const built = drawn(viewWith({}))

    // IC-13 occupies x 180..204 and IC-12 x 204..228. R3.4 makes the interval
    // half-open, so the shared edge belongs to IC-12 -- and never to both.
    expect(ask(built, 203, 20)?.entry).toBe('IC-13')
    expect(ask(built, 204, 20)?.entry).toBe('IC-12')
  })

  it('answers entry null where the pointer rests on the part but on no icon', () => {
    const built = drawn(viewWith({}))

    // ⭐ EZ-2 shows the explanation OF THAT ICON, so "no icon" has to be tellable
    // from "some icon" -- `ScreenSession.iconUnderPointer` (PD-141) is filled
    // from this and is `IconId | null` for the same reason.
    expect(ask(built, AT.headerNoEntry.x, AT.headerNoEntry.y)).toEqual({
      part: 'App Header',
      entry: null,
    })
  })
})

describe('R3.4 -- half-open, the way the rest of src/ resolves an edge', () => {
  // ⭐ src/entity/layout-engine/screen-regions/screen-regions.ts:89-101 states it
  // for `regionAtPointer`: 「a point on the right or bottom edge belongs to
  // whatever comes next, so adjoining regions never both claim it」, citing R3.4
  // (docs/development-rules/07-review-standards.md:495). A second rule on the
  // same screen would put one pixel under two answers.
  it('holds its left and top edge', () => {
    const built = drawn(viewWith({}))

    expect(ask(built, 180, 8)?.entry).toBe('IC-13')
    expect(ask(built, 0, 0)).toEqual({ part: 'App Header', entry: null })
  })

  it('lets go of its right and bottom edge', () => {
    const built = drawn(viewWith({}))

    // The last point inside the entry on each axis, then the first point outside.
    expect(ask(built, 203, 31)?.entry).toBe('IC-13')
    expect(ask(built, 180, 32)).toEqual({ part: 'App Header', entry: null })
  })

  it("hands the App Header's bottom edge to the part that begins there", () => {
    const built = drawn(OVER_THE_SCHEDULE)

    // The `App Header` is y 0..40 and the notices box begins at y 40.
    expect(ask(built, AT.headerLastRow.x, AT.headerLastRow.y)?.part).toBe('App Header')
    expect(ask(built, AT.noticesFirstRow.x, AT.noticesFirstRow.y)?.part).toBe('notices')
  })
})

describe('a point that is on nothing at all', () => {
  it('answers null outside the window on either side', () => {
    const built = drawn(OVER_THE_SCHEDULE)

    expect(ask(built, -1, 20)).toBeNull()
    expect(ask(built, 20, -1)).toBeNull()
    expect(ask(built, WINDOW.width + 500, WINDOW.height + 500)).toBeNull()
  })

  it('answers null for a part that is not drawn this frame', () => {
    // S-99e says the palette is hidden, so `ScreenView.commandPalette` is null --
    // and nothing may be answered for the place it would have taken.
    const built = drawn(viewWith({ commandPalette: null }))

    expect(ask(built, AT.paletteUnderModal.x, AT.paletteUnderModal.y)).toBeNull()
  })

  it('answers null before the first description arrives (BO-1 of 表 T-077)', () => {
    const built = wire()

    // ⛔ 「寸法が確定するまで 1 枚も描かない」: the skeleton is mounted so that the
    // header can be measured, but nothing is on the screen yet, so no point is on
    // anything.
    expect(built.reportedHeights).toEqual([HEADER_HEIGHT])
    expect(ask(built, AT.entryIc7.x, AT.entryIc7.y)).toBeNull()
  })
})

describe('overlapping parts', () => {
  it('gives the overlap to the open surface, which S-99g opens OVER the screen', () => {
    const built = drawn(OVER_THE_SCHEDULE)

    // The `Help Modal` is x 500..900 / y 380..680 and the palette
    // x 400..620 / y 300..480, so this point is on both.
    expect(byRole(built.root(), 'Command Palette').length).toBeGreaterThan(0)
    expect(byRole(built.root(), 'Help Modal').length).toBeGreaterThan(0)
    expect(ask(built, AT.paletteUnderModal.x, AT.paletteUnderModal.y)?.part).toBe('Help Modal')
  })

  it('answers the same point for the palette once the surface is closed', () => {
    // ⭐ The same press one frame apart: the answer changes because what is DRAWN
    // changed, which is the whole reason the drawing side is the side asked.
    const built = drawn(OVER_THE_SCHEDULE)
    expect(ask(built, AT.paletteUnderModal.x, AT.paletteUnderModal.y)?.part).toBe('Help Modal')

    surfaceOf(built).showScreenView(PALETTE_VIEW)
    expect(ask(built, AT.paletteUnderModal.x, AT.paletteUnderModal.y)?.part).toBe('Command Palette')
  })

  it('carries one of each where a part and its own entry hold the same point', () => {
    const built = drawn(OVER_THE_SCHEDULE)

    // IC-52 is drawn inside the `Help Modal`: both hold the point, and the answer
    // carries one of each rather than choosing between them.
    expect(ask(built, AT.modalEntry.x, AT.modalEntry.y)).toEqual({
      part: 'Help Modal',
      entry: 'IC-52',
    })
  })
})

describe('⛔ R6.3 -- what the unit actually did to the fake', () => {
  it('asks about exactly the point it was given, and about no other', () => {
    const built = drawn(OVER_THE_SCHEDULE)
    built.world.pointQueries.length = 0

    ask(built, AT.paletteUnderModal.x, AT.paletteUnderModal.y)

    expect(built.world.pointQueries.length).toBeGreaterThan(0)
    for (const query of built.world.pointQueries) {
      expect([query.x, query.y]).toEqual([AT.paletteUnderModal.x, AT.paletteUnderModal.y])
    }
  })

  it('reads only nodes it made itself -- never the mount, never past it', () => {
    const built = drawn(OVER_THE_SCHEDULE)
    built.world.measured.length = 0

    ask(built, AT.paletteUnderModal.x, AT.paletteUnderModal.y)

    const root = built.root()
    for (const node of built.world.measured) {
      expect(built.world.created).toContain(node)
      expect(root.contains(node)).toBe(true)
    }
    expect(built.world.measured).not.toContain(built.mount)
  })

  it('⛔ writes nothing while answering -- reading a point is not a redraw', () => {
    const built = drawn(OVER_THE_SCHEDULE)
    const drawnBefore = serialize(built.root())
    const listenersBefore = built.world.registrations.length
    const madeBefore = built.world.created.length

    ask(built, AT.paletteUnderModal.x, AT.paletteUnderModal.y)
    ask(built, AT.entryIc7.x, AT.entryIc7.y)
    ask(built, 5000, 5000)

    // ⚠️ The member is `semi-pure-b`: it reads the page as it stands and may not
    // change it. NFR-010 also forbids waking a frame on a trigger 表 T-078 does
    // not list, and a listener registered here would be one.
    expect(serialize(built.root())).toBe(drawnBefore)
    expect(built.world.registrations).toHaveLength(listenersBefore)
    expect(built.world.created).toHaveLength(madeBefore)
    expect(built.world.markupWrites).toHaveLength(0)
  })

  it('answers from what is drawn NOW -- two frames apart, two answers', () => {
    const built = drawn(viewWith({}))
    expect(ask(built, AT.entryIc7.x, AT.entryIc7.y)?.entry).toBe('IC-7')

    // The header keeps its place; the entry that stood there is gone.
    surfaceOf(built).showScreenView(
      viewWith({ appHeaderItems: { ...HEADER, commands: [command({ icon: 'IC-13' })] } }),
    )

    expect(ask(built, AT.entryIc7.x, AT.entryIc7.y)).toEqual({ part: 'App Header', entry: null })
    expect(ask(built, AT.entryIc13.x, AT.entryIc13.y)?.entry).toBe('IC-13')
  })
})

// ===========================================================================

describe('the entries of 表 T-109 on the `Row Title Panel`', () => {
  // ⭐ THE FINDING THIS BLOCK ONCE HELD IS CLOSED. It read: the unit DRAWS the
  // `Row Pin` (U-48) but marks it with no row of 表 T-109, so IF-9 cannot name
  // the entry and a press comes back 「面の上・入口の外」. The unit has since
  // marked it -- `data-icon="IC-60"` at dom-screen-surface.ts:614, with the
  // reasoning above it -- so the case below is live and passing.
  //
  // ⚠️ The case kept failing for a while after the unit was fixed, and that was
  // THIS FILE's fault, not the unit's: the pin's box was registered under
  // `role:Row Pin` while `layoutKey` had begun yielding `icon:IC-60` for it, so
  // the fake handed the pin a ZERO rectangle and no press could land. Repaired
  // at the registration site (see the note in `LAYOUT`); the expectation was
  // never touched (docs/development-rules/04-verification.md §1).
  //
  // 表 T-065 IF-9, docs/spec/05-07-design.md:386, and its MUST at :390:
  //   「画面上の点がどの UI パーツ（表 T-103）のどの入口（表 T-109）の上かを答える」
  //   「点がどの入口の上かは、その入口を描いた側が答えること（MUST）」
  //
  // 表 T-109, docs/spec/_assets/tbl-glossary.md:497-499, holds three entries on
  // the `Row Title Panel`:
  //   IC-58  行の配下を 1 段開く            表 T-051 の HF-2
  //   IC-59  行の配下をすべて閉じる          表 T-051 の HF-3
  //   IC-60  行をピン止めし、同じ入口で外す   FR-098
  //
  // ⛔ IC-58 / IC-59 REMAIN UNANSWERED -- the unit draws the `Row Expander`
  // (U-47) as one control and does not mark it, because 表 T-109 gives the pair
  // two rows and the note at dom-screen-surface.ts:85 records the hole. 表 T-109
  // is 「アイコンの全数」 (FR-029, MUST), so that is still a supply IF-9 promises
  // and does not yet deliver -- but it belongs to the unit, and no case here
  // pretends otherwise.
  //
  // ⚠️ CR-192 §0 ⑧-5 leaves IC-58 .. IC-60 out of what the TRANSLATOR consumes,
  // for want of the row key (`TaskGroup.id`) -- a different question from whether
  // the entry can be NAMED. The key is left off `ScreenPart` by design (R2.9).
  it('answers IC-60 for a press on the Row Pin (FR-098, 表 T-109 IC-60)', () => {
    const built = drawn(viewWith({}))

    expect(byRole(built.root(), 'Row Pin').length).toBeGreaterThan(0)
    expect(ask(built, AT.rowPin.x, AT.rowPin.y)).toEqual({
      part: 'Row Title Panel',
      entry: 'IC-60',
    })
  })
})
