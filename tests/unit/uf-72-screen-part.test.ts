// Unit tests: readScreenPartAt of the DOM screen surface answers which UI part and entry a point is on.

import { readRepoFile } from '../spec-files'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import type {
  AppHeaderItems,
  CommandItem,
  CommandPalette,
  Notice,
  HelpModal,
  TaskGroupExpander,
  TaskGroupTitle,
  ScreenFrame,
  ScreenPart,
  ScreenSurface,
  ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'
import type { ScreenRect } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import {
  domScreenSurface,
  type ScreenSurfaceWiring,
  type ScreenTheme,
} from '../../src/framework/dom-screen-surface/dom-screen-surface'
import { bare, bareAll, specTable, unbroken } from '../contract/spec-table'
import { taskGroupNameFont } from '../fixtures/task-group-name-font'
import { emptyScreenSession } from '../../src/use-case/advance-screen-session/advance-screen-session'

// Spec: FR-083, T-109, T-023b
// Why: IC-50 sits in the same group but is left out: it folds the milestone list
// and arms nothing.
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

// Why: only the App Header entries are copied here; the Task Group Panel roster is
// read from the table at load time, because a hand copy of it went stale.
const T_109_ELSEWHERE = [
  { row: 'IC-5', surface: 'App Header' },
  { row: 'IC-7', surface: 'App Header' },
  { row: 'IC-12', surface: 'App Header' },
  { row: 'IC-13', surface: 'App Header' },
] as const

// Why: the row says the band is not a button, so isButton is false; entry still
// answers it, since entry is the row a point is on, not a pressable entry.
const T_109_GRAB_BAND = {
  row: 'IC-53',
  surface: 'Command Palette',
  authority: 'FR-053',
  isButton: false,
} as const

const T_023D = specTable('T-023d')

// Trap: never name this row by its id: the claim is the table's order, and a named
// row would keep passing after it moved down the table.
const T_023D_TOP_TASK_GROUP = T_023D.rows[0]

const T_023D_PRIORITY_PREAMBLE = '`GRS` は、表 T-023d で先に並ぶ `GR` の行ほど優先すること。'

const T_103_PARTS = [
  { row: 'U-22', name: 'Task Group Panel' },
  { row: 'U-23', name: 'Task Group Title Tree' },
  { row: 'U-26', name: 'Command Palette' },
  { row: 'U-30', name: 'Help Window' },
  { row: 'U-31', name: 'App Header' },
  { row: 'U-34', name: 'Palette Commands' },
  { row: 'U-35', name: 'Header Commands' },
  { row: 'U-47', name: 'Task Group Buttons' },
  { row: 'U-57', name: 'Notification Area' },
] as const

// Spec: W-4, W-6
// Trap: U-30, U-34 and U-35 name two parts in one cell and this returns the first,
// so use it only for rows that name exactly one part.
function partName(row: string): string {
  const found = T_103_PARTS.find((one) => one.row === row)
  if (found === undefined) throw new Error(`the copy of 表 T-103 no longer holds ${row}`)
  return found.name
}

const T_109 = specTable('T-109')

const T_051 = specTable('T-051')

// Why: head rows are derived, not listed: a head row names the panel's top or places
// itself against HF-10's controls, so a new head control is picked up unaided.
const T_051_AT_THE_HEAD: readonly string[] = T_051.rows
  .filter((one) => {
    const says = one.cells.join(' ')
    return says.includes('タスクグループパネルの最上部') || says.includes('`HF-10` のボタン')
  })
  .map((one) => one.id)

if (T_051_AT_THE_HEAD.length === 0) {
  throw new Error('表 T-051 no longer places a single control at the panel’s head')
}

const isHeadRule = (authority: string): boolean =>
  T_051_AT_THE_HEAD.some((rule) =>
    new RegExp(`(^|[^0-9A-Za-z-])${rule}([^0-9-]|$)`).test(authority),
  )

// Spec: HF-20, IC-106
// Why: IC-106 shares its authority column (FR-032) with IC-82; only its entrance column names HF-20.
const namesHeadRule = (one: { readonly by: Readonly<Record<string, string>> }): boolean =>
  isHeadRule(one.by['正'] ?? '') || isHeadRule(one.by['何の入口か'] ?? '')

// Why: bareAll, not bare: the surface column enumerates, so membership is includes,
// never === on a first span that answers for one surface of several.
const T_109_ON_THE_PANEL = T_109.rows.filter(
  (one) => bareAll(one.by['面'] ?? '').includes(partName('U-22')),
)

// Why: the order is the table's printing order, not a placement rule: HF-4 fixes only
// the pin's place, so the cases read which entrances end the run, not where each is.
const T_109_ON_THE_TASK_GROUP = T_109.rows
  .filter((one) => bareAll(one.by['面'] ?? '').includes(partName('U-22')))
  .filter((one) => !namesHeadRule(one))
  .map((one) => ({ row: one.id, surface: partName('U-22') }))

if (T_109_ON_THE_TASK_GROUP.length === 0) {
  throw new Error('表 T-109 no longer puts a single entry on the Task Group Panel')
}

const T_109_AT_THE_HEAD = T_109.rows
  .filter((one) => bareAll(one.by['面'] ?? '').includes(partName('U-22')))
  .filter(namesHeadRule)
  .map((one) => ({ row: one.id, rule: one.by['正'] ?? '' }))

if (T_109_AT_THE_HEAD.length === 0) {
  throw new Error('表 T-109 no longer puts a single entry at the Task Group Panel’s head')
}

// Trap: keep the non-id bounds on both ends of the match, or HF-1 matches HF-11.
function entranceForRule(rule: string): string {
  const found = T_109_ON_THE_PANEL.filter((one) =>
    new RegExp(`(^|[^0-9A-Za-z-])${rule}([^0-9-]|$)`).test(one.by['正'] ?? ''),
  )
  const first = found[0]
  if (found.length !== 1 || first === undefined) {
    throw new Error(
      `表 T-109 gives ${rule} ${found.length} entrances on the Task Group Panel, not one`,
    )
  }
  return first.id
}

// Why: these are four roster rows, not one row in four states, listed in HF-1's
// 2 x 2 lattice read column first.
const T_109_TASK_GROUP_EXPANDER = [
  { row: entranceForRule('HF-3'), rule: 'HF-3', gist: 'このタスクグループを親に格納する', side: 'hiding' },
  {
    row: entranceForRule('HF-13'),
    rule: 'HF-13',
    gist: 'タスクグループの配下を 1 階層だけ展開する',
    side: 'openingOneLevel',
  },
  {
    row: entranceForRule('HF-11'),
    rule: 'HF-11',
    gist: 'タスクグループの配下をすべて折りたたむ',
    side: 'closingBelow',
  },
  { row: entranceForRule('HF-2'), rule: 'HF-2', gist: 'タスクグループの配下をすべて展開する', side: 'opening' },
]

const T_051_HF1_FOUR_CONTROLS =
  '`Retract Into Parent Button` と、`Expand One Level Button` と、`Collapse Below Button` と、`Expand Below Button` を 1 つずつ'
const T_051_HF1_IS_A_LATTICE = '`GRS` は、`HF-1` の 4 つのボタンを 2 × 2 の格子に並べること'
const T_051_HF1_LEFT_TO_RIGHT = '左の列を上から 親に格納・1 階層展開する'

const T_051_HF4_THE_WHOLE_RUN =
  '`GRS` は、折りたたみの 4 つ（`HF-1` の格子）、消すと足すの縦の対、ピン止めの順に、左から右へボタンを置くこと。'

const T_051_HF4_DELETE_ABOVE_ADD = '`GRS` は、消すを上、足すを下に置くこと。'

const T_051_HF10_THE_HEAD_RUN =
  '`GRS` は、頭の並びを、左から すべて折りたたむ・1 階層展開する・すべて展開する・足す・すべて消すの順に、1 行に並べること。'

const T_051_HF10_NOT_TWO_TIERS =
  '2 段に積まないのは、パネルの頭の高さが 2 段に足りない倍率で、下の段のボタンが隠れて押せなくなるからである。'

const T_051_HF20_LAST_IN_THE_RUN = '並びの最後、`HF-17`（最も浅い段へ足す）の右隣である。'

const T_051_HF15_THE_STRIP_IS_ALWAYS_DRAWN = '`GRS` は、掴み代を常に描くこと。'

const T_051_HF18_THE_COUNT =
  '配下に折りたたみ込んでいるタスクグループがあるとき、`GRS` は、折りたたみ込んでいるタスクグループの数をタスクグループに示すこと。'

// Trap: the word-to-rule pairing is prose and no machine joins it; when a rule's
// own words change, change its word here by hand.
const T_051_HF1_LATTICE = [
  { rule: 'HF-3', word: '親に格納' },
  { rule: 'HF-13', word: '1 階層展開する' },
  { rule: 'HF-11', word: '配下をすべて折りたたむ' },
  { rule: 'HF-2', word: '配下をすべて展開する' },
] as const

// Why: HF-2 and HF-3 are what the entries mean, not what this unit does; it owes
// them only that a press on one is told apart from a press on the other.
const T_051_EXPANDER = [
  { row: 'HF-1', gist: T_051_HF1_FOUR_CONTROLS },
  { row: 'HF-1', gist: T_051_HF1_IS_A_LATTICE },
  { row: 'HF-2', gist: '`GRS` は、`Expand Below Button` の職務を 表 T-015 の `HR-3` にすること。' },
  { row: 'HF-3', gist: '`GRS` は、`Retract Into Parent Button` の職務を 表 T-015 の `HR-6` にすること。' },
  { row: 'HF-11', gist: '`GRS` は、`Collapse Below Button` で、表 T-015 の `HR-4` を行うこと（見本と同じ動作に揃える）。' },
  { row: 'HF-13', gist: '`GRS` は、`Expand One Level Button` を、タスクグループごとに 1 つ置くこと。' },
  { row: 'HF-13', gist: '`GRS` は、`Expand One Level Button` の職務を 表 T-015 の `HR-7` にすること（見本と同じ動作に揃える）。' },
] as const

// Why: the count lives only at its owner HF-1; a copy in U-47 went stale once,
// so these assert that U-47 points at HF-1 and holds no count.
const T_103_U47_POINTS_AT_ITS_OWNER = '表 T-051 の `HF-1`'
const T_103_U47_HOLDS_NO_COUNT = /\d+\s*つで\s*1\s*組/

const T_023A_ONLY_THE_DRAWING_AREA =
  '`GRS` は、判定順序を日程の描画領域だけに適用すること。'

const T_065_THE_SIDE_THAT_DREW_IT =
  '点がどの入口の上かは、その入口を描いた側が答えること（MUST）'

const S_99G_OVER_THE_SCREEN = '画面の上に重ねて開き'

const specText = (...parts: string[]): string =>
  readRepoFile(join(process.cwd(), 'docs', 'spec', ...parts), 'utf8')

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
  value = ''
  isMount = false

  constructor(
    tagName: string,
    readonly world: World,
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
    // Trap: keep the trailing `;` a browser serializes: the unit appends to its own
    // style, and without it two declarations glue into one and the inset vanishes.
    if (name === 'style') {
      const css = inlineStyle(this)
      return css === '' ? css : `${css};`
    }
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

  // Summary: The fake shall record a markup read or write and never obey it (FR-023).
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
  // Summary: This file's own placing, keyed by `data-icon` first and then by `data-role`.
  readonly layout: Map<string, ScreenRect>
  mount: FakeElement | null
  activeElement: FakeElement | null
}

const ZERO: ScreenRect = { x: 0, y: 0, width: 0, height: 0 }

const layoutKey = (element: FakeElement): string | null => {
  const icon = element.attributes.get('data-icon')
  if (icon !== undefined) return `icon:${icon}`
  const role = element.attributes.get('data-role')
  if (role !== undefined) return `role:${role}`
  return null
}

// Why: placed from the attributes the unit wrote, not a table keyed by node, so a
// measure taken while drawing and one taken while answering cannot disagree.
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

// Why: half-open on both axes, the rule rectHoldsPoint follows (R3.4).
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

// Why: a browser's order: later paints over earlier and a hidden subtree takes no
// pointer; which UI part wins is the unit's answer, never this fake's.
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

interface Stage {
  readonly world: World
  readonly host: Document
  readonly mount: FakeElement
  readonly reportedHeights: number[]
  surface: ScreenSurface | undefined
  root(): FakeElement
}

// Why: the host is a Proxy so that every member the unit reaches for is recorded.
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

// Why: neither value is typed: S-72 arrives with the screen values and S-73 is read
// from T-216; no case reads a color back, so the default is a neutral choice.
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
    readClockMs: (): number => Date.UTC(2026, 7, 21, 3, 4, 5),
    onAppHeaderHeightMeasured: (heightPx: number): void => {
      built.reportedHeights.push(heightPx)
    },
    readTheme: (): ScreenTheme => THEME,
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

function drawn(view: ScreenView): Stage {
  const built = wire()
  surfaceOf(built).showScreenView(view)
  return built
}

const ask = (built: Stage, x: number, y: number): ScreenPart | null =>
  surfaceOf(built).readScreenPartAt(x, y)

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

function serialize(element: FakeElement): string {
  const attributes = [...element.attributes].map(([name, value]) => ` ${name}="${value}"`).join('')
  const style = inlineStyle(element)
  const inside = element.childNodes
    .map((one) => (one instanceof FakeText ? one.data : serialize(one)))
    .join('')
  const tag = element.tagName.toLowerCase()
  return `<${tag}${attributes}${style === '' ? '' : ` style="${style}"`}>${inside}</${tag}>`
}

// Summary: A tiny selector engine for `[attr]`, `[attr="value"]`, a tag and a descendant.
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

// Why: the header height of 40 sits inside S-116's band (32 .. 96).
const WINDOW = { width: 1000, height: 800 } as const
const HEADER_HEIGHT = 40
const ENTRY = 24

// Why: IC-13 and IC-12 touch, so R3.4 has an edge to resolve.
const HEADER_ENTRY_X: Readonly<Record<string, number>> = {
  'IC-5': 100,
  'IC-7': 132,
  'IC-13': 180,
  'IC-12': 204,
}

const paletteEntryBox = (index: number): ScreenRect =>
  rect(410 + (index % 6) * 30, 310 + Math.floor(index / 6) * 30, ENTRY, ENTRY)

// Why: named, not written twice: GR-19's band is placed from this box, so the two
// cannot drift apart.
const PALETTE_BOX = rect(400, 300, 220, 180)

// Why: this file's own number, not S-135a: the unit owes GR-19 only that the band
// answers; it stops where the first entry row begins, so R3.4 has an edge.
const GRAB_BAND_HEIGHT = 10

// Why: unlike the other LAYOUT boxes this one is fixed by GR-19 and S-135a, so it
// is derived from PALETTE_BOX rather than typed.
const GRAB_BAND_BOX = rect(PALETTE_BOX.x, PALETTE_BOX.y, PALETTE_BOX.width, GRAB_BAND_HEIGHT)

// Why: each relation a case needs is present once: the Help Window overlaps the palette
// without covering it, and the Notification Area starts on the header's bottom edge.
const LAYOUT = new Map<string, ScreenRect>([
  ['role:App Header', rect(0, 0, WINDOW.width, HEADER_HEIGHT)],
  ['role:Task Group Panel', rect(0, 40, 170, 660)],
  ['role:Task Group Title Tree', rect(0, 40, 170, 660)],
  // Trap: layoutKey reads data-icon first, so a node marked with an icon must be
  // registered under icon:, or it gets the ZERO rectangle and takes no press.
  ['role:Task Group Buttons', rect(10, 60, 16, 16)],
  // Why: the boxes share edges so R3.4 has one to resolve, and a strip of bare panel
  // before the pin tells a point on the surface from a point on an entry.
  [`icon:${entranceForRule('HF-13')}`, rect(52, 60, 16, 16)],
  [`icon:${entranceForRule('HF-14')}`, rect(68, 60, 16, 16)],
  ['icon:IC-58', rect(84, 60, 16, 16)],
  ['icon:IC-59', rect(100, 60, 16, 16)],
  ['icon:IC-77', rect(116, 60, 16, 16)],
  ['icon:IC-60', rect(140, 60, 16, 16)],
  ['role:Command Palette', PALETTE_BOX],
  [`icon:${T_109_GRAB_BAND.row}`, GRAB_BAND_BOX],
  ['role:Help Window', rect(500, 380, 400, 300)],
  [`role:${partName('U-57')}`, rect(700, 40, 280, 80)],
  ['icon:IC-52', rect(860, 390, ENTRY, ENTRY)],
  ...Object.entries(HEADER_ENTRY_X).map(
    ([icon, x]): [string, ScreenRect] => [`icon:${icon}`, rect(x, 8, ENTRY, ENTRY)],
  ),
  ...T_109_ARMING.map(
    (one, index): [string, ScreenRect] => [`icon:${one.row}`, paletteEntryBox(index)],
  ),
])

const AT = {
  entryIc5: { x: 112, y: 20 },
  entryIc7: { x: 144, y: 20 },
  entryIc13: { x: 190, y: 20 },
  headerNoEntry: { x: 600, y: 20 },
  headerLastRow: { x: 750, y: 39 },
  noticesFirstRow: { x: 750, y: 40 },
  paletteNoEntry: { x: 600, y: 320 },
  paletteUnderModal: { x: 550, y: 400 },
  // Why: above the first entry row, so the claim is the band's own and not which
  // of two siblings paints last.
  paletteGrabBand: { x: 500, y: 304 },
  // Why: the band's bottom edge, which R3.4 gives to the entry that starts there.
  paletteBelowTheBand: { x: 412, y: PALETTE_BOX.y + GRAB_BAND_HEIGHT },
  modalOnly: { x: 520, y: 650 },
  modalEntry: { x: 870, y: 400 },
  notices: { x: 900, y: 100 },
  taskGroupPin: { x: 144, y: 64 },
  taskGroupExpanderOpen: { x: 92, y: 64 },
  taskGroupExpanderClose: { x: 108, y: 64 },
  taskGroupExpanderCloseBelow: { x: 124, y: 64 },
  // Why: a point of its own, so a press here and one on taskGroupExpanderOpen can
  // come back as two different rows (HF-13).
  taskGroupOpenOneLevel: { x: 60, y: 64 },
  taskGroupAddChild: { x: 76, y: 64 },
  taskGroupExpanderGap: { x: 136, y: 64 },
  rowTreeNoEntry: { x: 80, y: 400 },
  bareSchedule: { x: 500, y: 600 },
} as const

const command = (patch: Partial<CommandItem> & { icon: string }): CommandItem => ({
  isEnabled: true,
  isPressed: false,
  // Why: a member apart from isPressed: the palette entry is not a button (IC-54) and
  // FR-053 bars the pressed form, so an arm may not travel on the toggle.
  isArmed: false,
  isChosen: false,
  label: patch.icon,
  ...patch,
})

const FRAME: ScreenFrame = {
  isFullScreen: false,
  // Why: the panel is drawn against the boundary FR-052 gives it, so the frame must
  // carry one for the panel to be on the screen at all.
  dividers: [{ panel: 'taskGroupPanel', band: rect(170, 40, 6, 660), line: rect(172, 40, 1, 660) }],
  scrollbars: [],
}

const HEADER: AppHeaderItems = {
  documentTitle: 'DocumentTitleHere',
  openedFileName: null,
  fileSavedAt: null,
  fileSavedByteLength: null,
  fileNeverSavedText: '',
  commands: [
    // Why: a disabled entry is drawn faint and still answers (FR-029).
    command({ icon: 'IC-5', label: 'UndoNothingToUndo', isEnabled: false }),
    command({ icon: 'IC-7', label: 'ShowPalette' }),
    command({ icon: 'IC-13', label: 'ZoomTimeIn' }),
    command({ icon: 'IC-12', label: 'ZoomTimeOut' }),
  ],
  // Why: the same language BASE_VIEW carries, since S-99 is one state for the whole
  // screen (FR-038).
  language: 'ja',
}

const taskGroupTitle = (patch: Partial<TaskGroupTitle> & { taskGroupId: string }): TaskGroupTitle => ({
  depth: 1,
  // Trap: keep indentPx following the patched depth; a fixed number draws the deepest
  // task group like a root one, which FR-085's indent case asks about.
  indentPx: (patch.depth ?? 1) * 12,
  ...taskGroupNameFont(patch.depth ?? 1),
  box: rect(0, 40, 170, 24),
  label: patch.taskGroupId,
  wholeLabel: patch.taskGroupId,
  isLabelTruncated: false,
  // Why: a task group with nothing to fold still has its controls, drawn faint with none
  // armed (HF-1, FR-029), so the neutral fixture is all false, not null.
  expander: { canOpen: false, canClose: false, canCloseBelow: false },
  isPinned: false,
  isSelected: false,
  ...patch,
})

const PALETTE: CommandPalette = {
  // Why: a corner, not a rectangle: FR-053 sizes the palette by its contents, so its
  // extent is the fake browser's answer, registered in LAYOUT.
  at: { x: PALETTE_BOX.x, y: PALETTE_BOX.y },
  grabBandHeight: GRAB_BAND_HEIGHT,
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
      name: 'PlaceGroup',
      commands: T_109_ARMING.map((one) => command({ icon: one.row, label: one.arm })),
    },
  ],
  armedText: 'ArmedNothing',
}

const HELP_MODAL: HelpModal = {
  surface: 'Help Window',
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

const NOTICE: Notice = {
  manner: 'NT-3',
  mannerText: '',
  text: 'NoticeTextOne',
  nextSteps: ['NextStepOne'],
  affectedCount: 3,
  dismissText: 'DismissWordOne',
  dismissKey: 'NT-3|RE-1',
  raisedNotices: [],
}

const BASE_VIEW: ScreenView = {
  // Why: readScreenPartAt answers with rectangles and entry ids, never a word, so
  // the language is inert for every case below.
  language: 'ja',
  frame: FRAME,
  appHeaderItems: HEADER,
  taskGroupPanel: {
    pinnedTitles: [],
    titles: [
      taskGroupTitle({
        taskGroupId: 'g-1',
        label: 'TaskGroupOne',
        isPinned: true,
        expander: { canOpen: true, canClose: false, canCloseBelow: false },
      }),
    ],
  },
  propertiesPanel: null,
  commandPalette: null,
  openModal: null,
  notices: [],
  confirmation: null,
  tooltips: [],
}

const viewWith = (patch: Partial<ScreenView>): ScreenView => ({ ...BASE_VIEW, ...patch })

const OVER_THE_SCHEDULE: ScreenView = viewWith({
  commandPalette: PALETTE,
  helpModal: HELP_MODAL,
  notices: [NOTICE],
})

const PALETTE_VIEW: ScreenView = viewWith({ commandPalette: PALETTE })

describe('the specification still says what these cases copy', () => {
  it('表 T-065 IF-9 supplies a THIRD thing: which UI part and which entry a point is on', () => {
    const row = specTable('T-065').rows.find((one) => one.id === 'IF-9')
    expect(row, '表 T-065 no longer holds IF-9').toBeDefined()

    const supply = row?.cells[row.cells.length - 1] ?? ''
    expect(supply).toContain('作った記述を画面に載せ')
    expect(supply).toContain('画面上の点')
    expect(supply).toContain('UI パーツ')
    expect(supply).toContain('入口')
    expect(supply).toContain('T-103')
    expect(supply).toContain('T-109')
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
    // Why: every T-023b arm but AR-1, which is none, and nothing invented.
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

  it('表 T-109 still gives the Task Group Buttons TWO rows, one per side (IC-58 / IC-59)', () => {
    const rows = specTable('T-109').rows
    for (const one of T_109_TASK_GROUP_EXPANDER) {
      const row = rows.find((held) => held.id === one.row)
      expect(row, `表 T-109 no longer holds ${one.row}`).toBeDefined()
      expect(row?.by['面'], `${one.row} left the Task Group Panel`).toContain('Task Group Panel')
      expect(row?.by['何の入口か'], `${one.row} no longer means "${one.gist}"`).toContain(one.gist)
      expect(row?.by['正'], `${one.row} no longer traces 表 T-051 の ${one.rule}`).toContain(
        one.rule,
      )
    }
    // Why: the four must be different roster rows, or the cases below ask for an entry
    // the spec does not name; the count is read from HF-1, not typed.
    expect(new Set(T_109_TASK_GROUP_EXPANDER.map((one) => one.row)).size).toBe(
      T_051_HF1_LATTICE.length,
    )
  })

  it('表 T-051 HF-1 still asks for FOUR folding controls per task group, in a 2 x 2 lattice', () => {
    const rows = specTable('T-051').rows
    for (const one of T_051_EXPANDER) {
      const row = rows.find((held) => held.id === one.row)
      expect(row, `表 T-051 no longer holds ${one.row}`).toBeDefined()
      expect(row?.cells.join(' '), `${one.row} no longer says "${one.gist}"`).toContain(one.gist)
    }
  })

  it('表 T-103 U-47 names the row that holds the count, and holds no count itself', () => {
    const row = specTable('T-103').rows.find((one) => one.id === 'U-47')
    const cells = row?.cells.join(' ') ?? ''
    expect(cells, 'U-47 no longer points at the row that owns its layout').toContain(
      T_103_U47_POINTS_AT_ITS_OWNER,
    )
    expect(
      T_103_U47_HOLDS_NO_COUNT.test(cells),
      'U-47 states a count again -- 表 T-051 の `HF-1` owns it, and a number in two places drifts',
    ).toBe(false)
  })

  it('U-23 still requires an entrance to be named by the Task Group Panel (MUST)', () => {
    const row = specTable('T-103').rows.find((one) => one.id === 'U-23')
    expect(row?.cells.join(' ')).toContain(
      '操作の入口を指すときは「タスクグループパネル」と書くこと（MUST）',
    )
  })
})

describe('R7.3 / LY-5 -- the browser arrives, it is not reached for', () => {
  it('no document anywhere: a global reach would fail every case in this file', () => {
    // Why: with globals present, a unit reaching for globalThis.document would quietly
    // succeed and this file would stop proving R7.3.
    expect('document' in globalThis).toBe(false)
    expect('window' in globalThis).toBe(false)
  })

  it('answers a point with no DOM in the environment at all', () => {
    const built = drawn(OVER_THE_SCHEDULE)

    expect(ask(built, AT.entryIc7.x, AT.entryIc7.y)).toEqual({
      part: 'App Header',
      entry: 'IC-7',
      format: null,
      taskGroupId: null,
      resourceUid: null,
      dividerPanel: null,
      noticeDismissKey: null,
    })
  })

  it('touches no member of the host beyond making elements and asking about a point', () => {
    const built = drawn(OVER_THE_SCHEDULE)
    const before = built.world.hostMembers.length

    ask(built, AT.entryIc7.x, AT.entryIc7.y)

    // Why: elementsFromPoint is admitted beside elementFromPoint: both put the same
    // question, and T-065 fixes the answer, not the way of getting it.
    for (const member of new Set(built.world.hostMembers.slice(before))) {
      expect(['createElement', 'elementFromPoint', 'elementsFromPoint']).toContain(member)
    }
  })
})

describe('IF-9 of 表 T-065 -- one member per supply the cell names', () => {
  it('publishes readScreenPartAt beside the other members IF-9 names', () => {
    // Why: the members are worked out from the IF-9 cell, not counted, so the case
    // falls when a supply is added or dropped, not merely when a number moves.
    const surface = surfaceOf(wire())

    expect(Object.keys(surface).sort()).toEqual([
      'readFieldCommit',
      // Why: IF-9's begin/end notices (CR-500 wave B) replaced the boolean member (DFC-1876).
      'readFieldEditNotices',
      'readScreenPartAt',
      'readSearchWord',
      'showScreenView',
    ])
    expect(typeof surface.readScreenPartAt).toBe('function')
    expect(typeof surface.readSearchWord).toBe('function')
  })

  it('IF-9 (CR-597): 面は、この欄の語が変わるたびに、打ちかけの語をそのまま返すこと（MUST） -- the word has a member of its own, not readFieldCommit', () => {
    const surface = surfaceOf(wire())

    expect(Object.keys(surface)).toContain('readSearchWord')
    expect(Object.keys(surface)).toContain('readFieldCommit')
    expect(surface.readSearchWord).not.toBe(surface.readFieldCommit)
  })

  it('answers with every member ScreenPart declares and nothing else', () => {
    const built = drawn(OVER_THE_SCHEDULE)

    const answer = ask(built, AT.entryIc7.x, AT.entryIc7.y)
    expect(answer).not.toBeNull()
    // Why: written down, not derived: ScreenPart is a type with nothing at run time,
    // and keys read off the answer would agree with any answer at all.
    expect(Object.keys(answer ?? {}).sort()).toEqual([
      'dividerPanel',
      'entry',
      'format',
      'noticeDismissKey',
      'part',
      'resourceUid',
      'taskGroupId',
    ])
  })
})

describe("表 T-023a (MUST) -- the decision order is the drawing area's alone", () => {
  // Why: these parts hold no ScreenRegions rectangle, so regionAtPointer answers
  // taskGroupArea there; a non-null answer stops PTD-5's marquee underneath.
  const overTheSchedule = [
    { part: 'Command Palette', at: AT.paletteNoEntry, why: 'FR-053 floats it' },
    { part: 'Help Window', at: AT.modalOnly, why: 'S-99g opens it over the screen' },
    { part: partName('U-57'), at: AT.notices, why: 'FR-076 raises it over the screen' },
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

    expect(ask(built, AT.paletteNoEntry.x, AT.paletteNoEntry.y)).toEqual({
      part: 'Command Palette',
      entry: null,
      format: null,
      taskGroupId: null,
      resourceUid: null,
      dividerPanel: null,
      noticeDismissKey: null,
    })
  })

  it('a press where the schedule is exposed answers null -- and PTD-5 may run', () => {
    const built = drawn(viewWith({}))

    expect(ask(built, AT.bareSchedule.x, AT.bareSchedule.y)).toBeNull()
  })
})

describe('FR-029 -- a disabled entry answers; it does not go quiet', () => {
  it('answers IC-5 although that entry cannot be used', () => {
    const built = drawn(viewWith({}))

    // Why: an entry answering null would be the unresponsive one FR-029 forbids, and
    // EZ-2's explanation can be raised only once the shell knows which entry it is.
    expect(ask(built, AT.entryIc5.x, AT.entryIc5.y)).toEqual({
      part: 'App Header',
      entry: 'IC-5',
      format: null,
      taskGroupId: null,
      resourceUid: null,
      dividerPanel: null,
      noticeDismissKey: null,
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

    // Why: a `disabled` attribute stops an element taking the pointer, so no answer
    // above could be given; FR-029 asks only for a faint drawing.
    const entry = entryFor(built.root(), 'IC-5')
    expect(entry.hasAttribute('disabled')).toBe(false)
    expect(isShown(entry)).toBe(true)
  })
})

describe('FR-053 / 表 T-023b -- the palette can be armed from (SP-1 .. SP-4)', () => {
  // Why: FR-083's SP-1 .. SP-4 turn on which entry was pressed; until this member
  // answered, T-023b could only ever be AR-1.
  it.each(T_109_ARMING)('answers $row on the Command Palette (arms $arm)', ({ row }) => {
    const built = drawn(PALETTE_VIEW)

    const box = LAYOUT.get(`icon:${row}`)
    expect(box, `this file has no place for ${row}`).toBeDefined()
    const at = box ?? ZERO
    expect(ask(built, at.x + 2, at.y + 2)).toEqual({
      part: 'Command Palette',
      entry: row,
      format: null,
      taskGroupId: null,
      resourceUid: null,
      dividerPanel: null,
      noticeDismissKey: null,
    })
  })

  it('names the containing surface, not the grouping inside it (U-34)', () => {
    const built = drawn(PALETTE_VIEW)

    // Why: the answer names the surface, not U-34's parts, because that is the grain
    // T-109's surface column uses and the only one an entry joins back by.
    expect(byRole(built.root(), 'Palette Commands').length).toBeGreaterThan(0)
    expect(ask(built, 412, 312)?.part).toBe('Command Palette')
  })

  it('names the App Header, not Header Commands, for an entry drawn in it (U-35)', () => {
    const built = drawn(viewWith({}))

    expect(byRole(built.root(), 'Header Commands').length).toBeGreaterThan(0)
    expect(ask(built, AT.entryIc7.x, AT.entryIc7.y)?.part).toBe('App Header')
  })

  it('⛔ names the Task Group Panel and never the Task Group Title Tree (U-23, MUST)', () => {
    const built = drawn(viewWith({}))

    // Why: the tree is the nearer name but U-23 forbids it for an entrance, and T-109
    // does not use it for IC-58 .. IC-60 either.
    expect(byRole(built.root(), 'Task Group Title Tree').length).toBeGreaterThan(0)
    expect(ask(built, AT.rowTreeNoEntry.x, AT.rowTreeNoEntry.y)?.part).toBe('Task Group Panel')
  })
})

describe('GR-19 of 表 T-023d -- the band on the palette, and the claim it has', () => {
  // Why: the band has no name of its own and wins whatever is drawn under it, so a
  // press on it needs this answer, or FR-053's drag has no entrance at all.

  it('表 T-023d still puts the palette band FIRST, which is what makes it win', () => {
    expect(T_023D.rows.length, '表 T-023d has no rows').toBeGreaterThan(1)
    expect(T_023D_TOP_TASK_GROUP?.id, '表 T-023d no longer opens with the palette band').toBe('GR-19')

    const requirements = unbroken(readRepoFile(
      join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
      'utf8',
    ))
    expect(requirements, '表 T-023d no longer says the upper row wins').toContain(
      T_023D_PRIORITY_PREAMBLE,
    )
    expect(T_023D_TOP_TASK_GROUP?.cells.join(' ')).toContain(T_109_GRAB_BAND.surface)
    expect(T_023D_TOP_TASK_GROUP?.cells.join(' ')).toContain(T_109_GRAB_BAND.authority)
  })

  it('answers the band for a point on it, so FR-053 has an entrance to drag by', () => {
    const built = drawn(PALETTE_VIEW)

    expect(ask(built, AT.paletteGrabBand.x, AT.paletteGrabBand.y)).toEqual({
      part: 'Command Palette',
      entry: T_109_GRAB_BAND.row,
      format: null,
      // Why: the band moves commandPaletteAt (FR-053), nothing in the document, so it
      // names neither a task group nor a resource.
      taskGroupId: null,
      resourceUid: null,
      dividerPanel: null,
      noticeDismissKey: null,
    })
  })

  it('⛔ the band beats what is drawn under it -- the schedule below it never answers', () => {
    // Why: the same point with no palette drawn is bare schedule, where T-023a would
    // let PTD-5 start a marquee; with the palette drawn it is the band's.
    const bare = drawn(viewWith({}))
    expect(
      ask(bare, AT.paletteGrabBand.x, AT.paletteGrabBand.y),
      'the point has to be over the bare schedule, or the case proves nothing',
    ).toBeNull()

    const built = drawn(PALETTE_VIEW)
    expect(ask(built, AT.paletteGrabBand.x, AT.paletteGrabBand.y)?.entry).toBe(
      T_109_GRAB_BAND.row,
    )
  })

  it('R3.4 -- the band ends where the first entry begins, and neither claims both', () => {
    // Why: the point asked about is the point handed in; a margin of the unit's own would
    // slide this edge and hand a press to the wrong row (SP-1 .. SP-4 or the drag).
    const built = drawn(PALETTE_VIEW)
    const firstEntry = T_109_ARMING[0].row

    expect(ask(built, AT.paletteBelowTheBand.x, AT.paletteBelowTheBand.y - 1)?.entry).toBe(
      T_109_GRAB_BAND.row,
    )
    expect(ask(built, AT.paletteBelowTheBand.x, AT.paletteBelowTheBand.y)?.entry).toBe(firstEntry)
  })

  it('⛔ lays the band on a palette that holds no entry at all', () => {
    // Why: GR-19 states a place, not a state, and an empty description still reaches
    // this seam; a palette drawn without a band could never be moved again.
    const built = drawn(viewWith({ commandPalette: { ...PALETTE, groups: [] } }))

    expect(ask(built, AT.paletteGrabBand.x, AT.paletteGrabBand.y)).toEqual({
      part: 'Command Palette',
      entry: T_109_GRAB_BAND.row,
      format: null,
      // Why: the band moves commandPaletteAt (FR-053), nothing in the document, so it
      // names neither a task group nor a resource.
      taskGroupId: null,
      resourceUid: null,
      dividerPanel: null,
      noticeDismissKey: null,
    })
  })

  it('⛔ answers the band even though 表 T-109 calls that row no button', () => {
    // Why: entry is the row a point is on, not which entry can be pressed, so the band is
    // answered though CommandPalette.groups rightly holds no CommandItem for it.
    const built = drawn(PALETTE_VIEW)

    expect(T_109_GRAB_BAND.isButton).toBe(false)
    expect(
      PALETTE.groups.flatMap((group) => group.commands).map((one) => one.icon),
      '表 T-109 says the band is not a button, so no entry may stand for it',
    ).not.toContain(T_109_GRAB_BAND.row)
    expect(ask(built, AT.paletteGrabBand.x, AT.paletteGrabBand.y)?.entry).toBe(
      T_109_GRAB_BAND.row,
    )
  })
})

describe('EZ-2 of 表 T-040 -- the icon the pointer rests ON', () => {
  it('answers one entry, and it is the one under the point', () => {
    const built = drawn(viewWith({}))

    expect(ask(built, AT.entryIc13.x, AT.entryIc13.y)?.entry).toBe('IC-13')
  })

  it('⛔ does not answer the neighbor that shares an edge with it', () => {
    const built = drawn(viewWith({}))

    // Why: IC-13 holds x 180..204 and IC-12 x 204..228; R3.4 gives the shared edge
    // to IC-12 and never to both.
    expect(ask(built, 203, 20)?.entry).toBe('IC-13')
    expect(ask(built, 204, 20)?.entry).toBe('IC-12')
  })

  it('answers entry null where the pointer rests on the part but on no icon', () => {
    const built = drawn(viewWith({}))

    // Why: EZ-2 explains the icon under the pointer, so "no icon" must be told from
    // "some icon"; iconUnderPointer is IconId | null for the same reason.
    expect(ask(built, AT.headerNoEntry.x, AT.headerNoEntry.y)).toEqual({
      part: 'App Header',
      entry: null,
      format: null,
      taskGroupId: null,
      resourceUid: null,
      dividerPanel: null,
      noticeDismissKey: null,
    })
  })
})

describe('R3.4 -- half-open, the way the rest of src/ resolves an edge', () => {
  // Why: regionAtPointer resolves edges the same half-open way (R3.4); a second rule
  // on the same screen would put one pixel under two answers.
  it('holds its left and top edge', () => {
    const built = drawn(viewWith({}))

    expect(ask(built, 180, 8)?.entry).toBe('IC-13')
    expect(ask(built, 0, 0)).toEqual({
      part: 'App Header',
      entry: null,
      format: null,
      taskGroupId: null,
      resourceUid: null,
      dividerPanel: null,
      noticeDismissKey: null,
    })
  })

  it('lets go of its right and bottom edge', () => {
    const built = drawn(viewWith({}))

    expect(ask(built, 203, 31)?.entry).toBe('IC-13')
    expect(ask(built, 180, 32)).toEqual({
      part: 'App Header',
      entry: null,
      format: null,
      taskGroupId: null,
      resourceUid: null,
      dividerPanel: null,
      noticeDismissKey: null,
    })
  })

  it("hands the App Header's bottom edge to the part that begins there", () => {
    const built = drawn(OVER_THE_SCHEDULE)

    expect(ask(built, AT.headerLastRow.x, AT.headerLastRow.y)?.part).toBe('App Header')
    expect(ask(built, AT.noticesFirstRow.x, AT.noticesFirstRow.y)?.part).toBe(partName('U-57'))
  })
})

describe('a point that is on nothing at all', () => {
  it('answers null outside the window on either side', () => {
    const built = drawn(OVER_THE_SCHEDULE)

    expect(ask(built, -1, 20)).toBeNull()
    expect(ask(built, 20, -1)).toBeNull()
    expect(ask(built, WINDOW.width + 500, WINDOW.height + 500)).toBeNull()
  })

  // Spec: S-99e
  it('answers null for a part that is not drawn this frame', () => {
    const built = drawn(viewWith({ commandPalette: null }))

    expect(ask(built, AT.paletteUnderModal.x, AT.paletteUnderModal.y)).toBeNull()
  })

  it('answers null before the first description arrives (BO-1 of 表 T-077)', () => {
    const built = wire()

    // Why: the skeleton is mounted so the header can be measured, but nothing is drawn
    // until the dimensions settle (BO-1), so no point is on anything.
    expect(built.reportedHeights).toEqual([HEADER_HEIGHT])
    expect(ask(built, AT.entryIc7.x, AT.entryIc7.y)).toBeNull()
  })
})

describe('overlapping parts', () => {
  it('gives the overlap to the open surface, which S-99g opens OVER the screen', () => {
    const built = drawn(OVER_THE_SCHEDULE)

    // Why: the Help Window is x 500..900 / y 380..680 and the palette x 400..620 /
    // y 300..480, so this point is on both.
    expect(byRole(built.root(), 'Command Palette').length).toBeGreaterThan(0)
    expect(byRole(built.root(), 'Help Window').length).toBeGreaterThan(0)
    expect(ask(built, AT.paletteUnderModal.x, AT.paletteUnderModal.y)?.part).toBe('Help Window')
  })

  it('answers the same point for the palette once the surface is closed', () => {
    // Why: the same press one frame apart changes answer because what is drawn changed,
    // which is why the drawing side is the side asked.
    const built = drawn(OVER_THE_SCHEDULE)
    expect(ask(built, AT.paletteUnderModal.x, AT.paletteUnderModal.y)?.part).toBe('Help Window')

    surfaceOf(built).showScreenView(PALETTE_VIEW)
    expect(ask(built, AT.paletteUnderModal.x, AT.paletteUnderModal.y)?.part).toBe('Command Palette')
  })

  it('carries one of each where a part and its own entry hold the same point', () => {
    const built = drawn(OVER_THE_SCHEDULE)

    // Why: IC-52 is drawn inside the Help Window, so the answer carries one of each.
    expect(ask(built, AT.modalEntry.x, AT.modalEntry.y)).toEqual({
      part: 'Help Window',
      entry: 'IC-52',
      format: null,
      taskGroupId: null,
      resourceUid: null,
      dividerPanel: null,
      noticeDismissKey: null,
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

    // Why: the member reads the page and may not change it; NFR-010 forbids waking a
    // frame on a trigger T-078 does not list, and a listener here would be one.
    expect(serialize(built.root())).toBe(drawnBefore)
    expect(built.world.registrations).toHaveLength(listenersBefore)
    expect(built.world.created).toHaveLength(madeBefore)
    expect(built.world.markupWrites).toHaveLength(0)
  })

  it('answers from what is drawn NOW -- two frames apart, two answers', () => {
    const built = drawn(viewWith({}))
    expect(ask(built, AT.entryIc7.x, AT.entryIc7.y)?.entry).toBe('IC-7')

    surfaceOf(built).showScreenView(
      viewWith({ appHeaderItems: { ...HEADER, commands: [command({ icon: 'IC-13' })] } }),
    )

    expect(ask(built, AT.entryIc7.x, AT.entryIc7.y)).toEqual({
      part: 'App Header',
      entry: null,
      format: null,
      taskGroupId: null,
      resourceUid: null,
      dividerPanel: null,
      noticeDismissKey: null,
    })
    expect(ask(built, AT.entryIc13.x, AT.entryIc13.y)?.entry).toBe('IC-13')
  })
})

describe('the entries of 表 T-109 on the `Task Group Panel`', () => {
  // Spec: FR-098, AT-51, U-48
  it('answers IC-60 for a press on the Pin Button (FR-098, 表 T-109 IC-60)', () => {
    const built = drawn(viewWith({}))

    expect(byRole(built.root(), 'Pin Button').length).toBeGreaterThan(0)
    expect(ask(built, AT.taskGroupPin.x, AT.taskGroupPin.y)).toEqual({
      part: 'Task Group Panel',
      entry: 'IC-60',
      format: null,
      // Why: FR-098 pins one task group and BASE_VIEW draws exactly one, so the press
      // must come back naming it; a null left pinning unreachable by pointer.
      taskGroupId: 'g-1',
      resourceUid: null,
      dividerPanel: null,
      noticeDismissKey: null,
    })
  })
})

// Why: not null: HF-1 puts the controls on every task group, and one with nothing
// to fold carries them with none armed, drawn faint (FR-029).
const NOTHING_TO_FOLD: TaskGroupExpander = { canOpen: false, canClose: false, canCloseBelow: false }

const withExpander = (expander: TaskGroupExpander): ScreenView =>
  viewWith({
    taskGroupPanel: {
      pinnedTitles: [],
      titles: [taskGroupTitle({ taskGroupId: 'g-1', label: 'TaskGroupOne', expander })],
    },
  })

const EXPANDER_STATES = [
  { canOpen: true, canClose: true, canCloseBelow: false },
  { canOpen: true, canClose: false, canCloseBelow: false },
  { canOpen: false, canClose: true, canCloseBelow: false },
  { canOpen: false, canClose: false, canCloseBelow: false },
] as const

// Why: this file's own placing, not the specification's.
const EXPANDER_AT: Readonly<Record<string, { readonly x: number; readonly y: number }>> = {
  'IC-58': AT.taskGroupExpanderOpen,
  'IC-59': AT.taskGroupExpanderClose,
  'IC-77': AT.taskGroupExpanderCloseBelow,
  'IC-90': AT.taskGroupOpenOneLevel,
}

const EXPANDER_TASK_GROUPS = T_109_TASK_GROUP_EXPANDER.map((one) => one.row).sort()

// Why: found by data-icon, not data-role: whether IC-90 and IC-91 belong to U-47 is
// decided nowhere, while data-icon carries the T-109 row, which is decided.
const expanderControls = (built: Stage): FakeElement[] =>
  selfAndDescendants(built.root()).filter((one) => {
    const icon = one.getAttribute('data-icon')
    return icon !== null && EXPANDER_TASK_GROUPS.includes(icon)
  })

const expanderIcons = (built: Stage): string[] =>
  expanderControls(built).map((one) => one.getAttribute('data-icon') ?? '(unmarked)')

describe('表 T-051 HF-1 -- one opening control and one closing control per task group', () => {
  it('GIVEN a task group whose description carries an expander WHEN the panel is drawn THEN the task group holds one IC-58 and one IC-59 (HF-1, U-47)', () => {
    const built = drawn(withExpander({ canOpen: true, canClose: false, canCloseBelow: false }))

    // Why: U-47 holds no count of its own (it points at HF-1), so the count is
    // the roster's, read from table T-109.
    expect(expanderIcons(built).sort()).toEqual(EXPANDER_TASK_GROUPS)
  })

  it('GIVEN two task groups, one pinned and one not, WHEN the panel is drawn THEN EACH task group gets the pair (HF-1 「各タスクグループに」)', () => {
    const built = drawn(
      viewWith({
        taskGroupPanel: {
          pinnedTitles: [
            taskGroupTitle({
              taskGroupId: 'g-pinned',
              isPinned: true,
              expander: { canOpen: true, canClose: true, canCloseBelow: false },
            }),
          ],
          titles: [
            taskGroupTitle({
              taskGroupId: 'g-1',
              expander: { canOpen: false, canClose: true, canCloseBelow: false },
            }),
          ],
        },
      }),
    )

    const icons = expanderIcons(built)
    expect(icons).toHaveLength(T_109_TASK_GROUP_EXPANDER.length * 2)
    // Why: U-46 lifts a pinned task group out of the scrolling list, but it is still a
    // task group of the panel, and HF-1 makes no exception for it.
    for (const one of T_109_TASK_GROUP_EXPANDER) {
      const drawnTwice = icons.filter((held) => held === one.row)
      expect(drawnTwice, `${one.row} was not drawn once per task group`).toHaveLength(2)
    }
  })

  it.each(EXPANDER_STATES)(
    'GIVEN canOpen=$canOpen and canClose=$canClose WHEN the task group is drawn THEN both controls stand (FR-029: faint, never absent)',
    (state) => {
      const built = drawn(withExpander(state))

      // Why: a spent control is drawn faint, not removed: a vanished control would move
      // the other one under the pointer (FR-029, HF-4).
      expect(expanderIcons(built).sort()).toEqual(EXPANDER_TASK_GROUPS)
    },
  )

  it('⭐ GIVEN a task group with NOTHING under it WHEN the panel is drawn THEN HF-13 and HF-14 still place their entrances on it (「タスクグループごとに 1 つ置くこと（MUST）」)', () => {
    const built = drawn(withExpander(NOTHING_TO_FOLD))
    const row = theTaskGroupOf(built)
    const drew = controlsOf(row).map((one) => one.getAttribute('data-icon'))

    // Why: a task group with no children is the case HF-13's faint rule was written for;
    // HF-14 is not spent by it, since adding a task group always changes the count.
    expect(drew, `${entranceForRule('HF-13')} left a task group with nothing under it`).toContain(
      entranceForRule('HF-13'),
    )
    expect(drew, `${entranceForRule('HF-14')} left a task group with nothing under it`).toContain(
      entranceForRule('HF-14'),
    )
  })

  it('GIVEN a panel with no task groups at all WHEN it is drawn THEN no expander control exists anywhere (empty)', () => {
    const built = drawn(viewWith({ taskGroupPanel: { pinnedTitles: [], titles: [] } }))

    expect(expanderControls(built)).toHaveLength(0)
  })
})

// Why: this unit owes HF-13 and HF-14 only that each entrance exists once per task
// group, is told from HF-2's and takes a press; what a press writes is elsewhere.

const IC_OPEN_ONE_LEVEL = entranceForRule('HF-13')
const IC_OPEN_ALL_BELOW = entranceForRule('HF-2')
const IC_ADD_CHILD = entranceForRule('HF-14')

const twoTaskGroups = (patch: Partial<TaskGroupTitle> = {}): ScreenView =>
  viewWith({
    taskGroupPanel: {
      pinnedTitles: [],
      titles: [
        taskGroupTitle({
          taskGroupId: 'g-1',
          expander: { canOpen: true, canClose: true, canCloseBelow: false },
          ...patch,
        }),
        taskGroupTitle({
          taskGroupId: 'g-2',
          expander: { canOpen: true, canClose: true, canCloseBelow: false },
          ...patch,
        }),
      ],
    },
  })

const everyEntry = (built: Stage, icon: string): FakeElement[] =>
  selfAndDescendants(built.root()).filter((one) => one.getAttribute('data-icon') === icon)

describe('表 T-051 HF-13 -- 1 階層だけ展開する操作子を、タスクグループごとに 1 つ (MUST)', () => {
  it(`GIVEN two task groups WHEN the panel is drawn THEN each carries exactly one ${IC_OPEN_ONE_LEVEL} (「タスクグループごとに 1 つ置くこと（MUST）」)`, () => {
    const built = drawn(twoTaskGroups())

    expect(everyEntry(built, IC_OPEN_ONE_LEVEL)).toHaveLength(2)
    for (const row of rowsOf(built)) {
      expect(
        controlsOf(row).filter((one) => one.getAttribute('data-icon') === IC_OPEN_ONE_LEVEL),
        `task group ${row.getAttribute('data-group-id')} does not carry exactly one ${IC_OPEN_ONE_LEVEL}`,
      ).toHaveLength(1)
    }
  })

  it(`⭐ GIVEN the task group is drawn WHEN ${IC_OPEN_ONE_LEVEL} and ${IC_OPEN_ALL_BELOW} are compared THEN they are TWO controls and not one (「別の入口とすること（MUST）。同じ入口に兼ねさせてはならない（MUST NOT）」)`, () => {
    const built = drawn(oneLiveTaskGroup())
    const oneLevel = everyEntry(built, IC_OPEN_ONE_LEVEL)
    const allBelow = everyEntry(built, IC_OPEN_ALL_BELOW)

    // Why: two nodes is the only shape that cannot open different amounts on different
    // presses, which HF-13's MUST NOT forbids.
    expect(oneLevel).toHaveLength(1)
    expect(allBelow).toHaveLength(1)
    expect(oneLevel[0], 'HF-13 and HF-2 are the same node').not.toBe(allBelow[0])
  })

  it(`⭐ GIVEN both entrances are drawn WHEN each is pressed THEN IF-9 answers a DIFFERENT row of 表 T-109 (${IC_OPEN_ONE_LEVEL} / ${IC_OPEN_ALL_BELOW})`, () => {
    const built = drawn(oneLiveTaskGroup())

    // Why: if both points came back with one row, the shell would have one place for two
    // amounts of opening: HF-13's MUST NOT, arriving one seam later.
    expect(ask(built, AT.taskGroupOpenOneLevel.x, AT.taskGroupOpenOneLevel.y)).toEqual({
      part: partName('U-22'),
      entry: IC_OPEN_ONE_LEVEL,
      format: null,
      taskGroupId: 'g-1',
      resourceUid: null,
      dividerPanel: null,
      noticeDismissKey: null,
    })
    expect(ask(built, AT.taskGroupExpanderOpen.x, AT.taskGroupExpanderOpen.y)?.entry).toBe(IC_OPEN_ALL_BELOW)
  })

  it(`⛔ GIVEN a task group with no direct child to open WHEN it is drawn THEN ${IC_OPEN_ONE_LEVEL} is drawn FAINT and not taken away (「展開できる直下の子が 1 つも無いときは、FR-029 に従って薄く描くこと（MUST）」)`, () => {
    const armed = drawn(twoTaskGroups({ canOpenOneLevel: true }))
    const spent = drawn(twoTaskGroups({ canOpenOneLevel: false }))
    const armedOne = everyEntry(armed, IC_OPEN_ONE_LEVEL)[0] as FakeElement
    const spentOne = everyEntry(spent, IC_OPEN_ONE_LEVEL)[0] as FakeElement

    expect(spentOne, `${IC_OPEN_ONE_LEVEL} went away when it had nothing to open`).toBeDefined()
    // Why: some declaration must part the two, or the faint drawing drew nothing.
    expect(
      differingProperties(armedOne, spentOne),
      `${IC_OPEN_ONE_LEVEL} is drawn identically whether or not it has a child to open`,
    ).not.toEqual([])
  })

  it(`⛔ GIVEN ${IC_OPEN_ONE_LEVEL} is faint WHEN the press it must still take is looked for THEN it is not disabled in the host's sense and IF-9 still answers it (FR-029 MUST NOT)`, () => {
    const built = drawn(twoTaskGroups({ canOpenOneLevel: false }))
    const spentOne = everyEntry(built, IC_OPEN_ONE_LEVEL)[0] as FakeElement

    // Why: a `disabled` attribute would swallow the press that carries RS-30's reason
    // to the notices (FR-029).
    expect(
      spentOne.hasAttribute('disabled'),
      `${IC_OPEN_ONE_LEVEL} is disabled in the host's sense, so the press RS-30 waits on never lands`,
    ).toBe(false)
    expect(ask(built, AT.taskGroupOpenOneLevel.x, AT.taskGroupOpenOneLevel.y)?.entry).toBe(IC_OPEN_ONE_LEVEL)
  })

  it(`⭐ GIVEN a spent ${IC_OPEN_ONE_LEVEL} and a spent entrance on ANOTHER surface WHEN the two are read THEN both are faint in the same color (FR-029: 載る面によって薄くしない入口があってはならない (MUST NOT))`, () => {
    const built = drawn(twoTaskGroups({ canOpenOneLevel: false }))
    const onTheTaskGroup = everyEntry(built, IC_OPEN_ONE_LEVEL)[0] as FakeElement
    // Why: IC-5 stands in the header fixture disabled, the same state one surface over.
    const onTheHeader = entryFor(built.root(), 'IC-5')

    // Why: the resolved color is held against T-236 and S-149 elsewhere; asked here is
    // only that the task group gets no faintness of its own.
    expect(
      styleMap(onTheTaskGroup).get('color'),
      'the task group control and the header entrance are faint in different colors',
    ).toBe(styleMap(onTheHeader).get('color'))
  })

  it('GIVEN the specification is re-read WHEN 表 T-051 HF-13 is looked up THEN it still asks for a separate entrance, one per task group, faint when spent', () => {
    const hf13 = specTable('T-051').rows.find((one) => one.id === 'HF-13')
    expect(hf13, '表 T-051 no longer holds HF-13').toBeDefined()
    const cells = hf13?.cells.join(' ') ?? ''
    expect(cells).toContain('`GRS` は、`Expand One Level Button` を、タスクグループごとに 1 つ置くこと。')
    expect(cells).toContain('`GRS` は、1 つの入口に `HF-13` と `HF-2` を兼ねさせないこと。')
    expect(cells).toContain('展開できる直下の子が 1 つも無いとき、`GRS` は、`Expand One Level Button` を `FR-029` に従って薄く描くこと。')
    expect(cells).toContain(`\`${IC_OPEN_ONE_LEVEL}\``)
  })

  it('GIVEN the specification is re-read WHEN 表 T-015 HR-7 is looked up THEN it still opens the DIRECT children only', () => {
    // Why: read so the entrance cannot quietly become HF-2's twin: once HR-7 stops
    // meaning direct children only, HF-13's separateness has no reason left.
    const hr7 = specTable('T-015').rows.find((one) => one.id === 'HR-7')
    expect(hr7, '表 T-015 no longer holds HR-7').toBeDefined()
    const cells = hr7?.cells.join(' ') ?? ''
    expect(cells).toContain('子を 1 階層展開を押したとき、`GRS` は、選択した `TaskGroup` の折りたたみだけを解くこと（見本と同じ動作に揃える）')
    expect(cells).toContain('直下の子が描かれ、孫より下は折りたたまれたままになる')
    expect(cells).toContain('子を 1 階層展開を押したとき、`GRS` は、孫より下の折りたたみに触れないこと。')
  })
})

describe('表 T-051 HF-14 -- 配下にタスクグループを足す操作子を、タスクグループごとに 1 つ (MUST)', () => {
  it(`GIVEN two task groups WHEN the panel is drawn THEN each carries exactly one ${IC_ADD_CHILD} (「タスクグループごとに 1 つ置くこと（MUST）」)`, () => {
    const built = drawn(twoTaskGroups())

    expect(everyEntry(built, IC_ADD_CHILD)).toHaveLength(2)
    for (const row of rowsOf(built)) {
      expect(
        controlsOf(row).filter((one) => one.getAttribute('data-icon') === IC_ADD_CHILD),
        `task group ${row.getAttribute('data-group-id')} does not carry exactly one ${IC_ADD_CHILD}`,
      ).toHaveLength(1)
    }
  })

  it(`⭐ GIVEN ${IC_ADD_CHILD} is drawn WHEN it is pressed THEN IF-9 answers it WITH the task group it stands on (表 T-065 IF-9 MUST)`, () => {
    const built = drawn(oneLiveTaskGroup())

    // Why: taskGroupId makes the press actionable: HR-8 adds under the selected task
    // group, so naming only the entrance leaves the shell not knowing under what.
    expect(ask(built, AT.taskGroupAddChild.x, AT.taskGroupAddChild.y)).toEqual({
      part: partName('U-22'),
      entry: IC_ADD_CHILD,
      format: null,
      taskGroupId: 'g-1',
      resourceUid: null,
      dividerPanel: null,
      noticeDismissKey: null,
    })
  })

  it(`GIVEN a task group with nothing under it WHEN it is drawn THEN ${IC_ADD_CHILD} stands on it armed (a childless task group is exactly the task group a child is added to)`, () => {
    const armed = drawn(withExpander(NOTHING_TO_FOLD))
    const alsoArmed = drawn(oneLiveTaskGroup())
    const onLeaf = everyEntry(armed, IC_ADD_CHILD)[0] as FakeElement
    const onParent = everyEntry(alsoArmed, IC_ADD_CHILD)[0] as FakeElement

    // Why: the closing paragraph under T-051 does not list HF-14, and adding a task
    // group always changes the count, so having no children does not spend it.
    expect(onLeaf).toBeDefined()
    expect(
      differingProperties(onLeaf, onParent),
      `${IC_ADD_CHILD} is drawn differently on a task group that has no children`,
    ).toEqual([])
  })

  it('GIVEN the specification is re-read WHEN 表 T-051 HF-14 is looked up THEN it still asks for one per task group and a last child, and now for the default name and the Properties Panel', () => {
    const hf14 = specTable('T-051').rows.find((one) => one.id === 'HF-14')
    expect(hf14, '表 T-051 no longer holds HF-14').toBeDefined()
    const cells = hf14?.cells.join(' ') ?? ''

    expect(cells).toContain('`GRS` は、配下にタスクグループを足すボタンを、タスクグループごとに 1 つ置くこと（表 T-015 の `HR-8`）。')
    expect(cells).toContain('`GRS` は、足したタスクグループを末子とすること。')
    expect(cells).toContain(`\`${IC_ADD_CHILD}\``)
    expect(cells).toContain(
      '押したタスクグループの深さが `FR-085` の上限に達しているとき、`GRS` は、配下に足すボタンを `FR-029` に従って薄く描くこと。',
    )

    // Why: read so the press this unit draws is not planned into a second, in-place
    // naming road beside FR-085's.
    expect(cells).toContain('配下に足すボタンを押したとき、`GRS` は、押した瞬間に既定の名前でタスクグループを立てること。')
    expect(cells).toContain('配下に足すボタンを押したとき、`GRS` は、立てたタスクグループのプロパティパネルを出し、名前の欄で名づけさせること。')
    expect(cells).toContain('`GRS` は、改名と別の名づけの道を作らないこと。')

    // Why: the row keeps a history note repeating these words without their (MUST),
    // so only a real revival reddens these.
    expect(cells).not.toContain('名前は空で立て、その場で打たせること（MUST）')
    expect(cells).not.toContain('既定の名を与えてはならない（MUST NOT）')
    expect(cells).not.toContain('名前が空のまま確定されたときは、その行を立てないこと（MUST）')
  })

  it('GIVEN the specification is re-read WHEN 表 T-015 HR-8 is looked up THEN it still adds UNDER the task group and not beside it', () => {
    const hr8 = specTable('T-015').rows.find((one) => one.id === 'HR-8')
    expect(hr8, '表 T-015 no longer holds HR-8').toBeDefined()
    expect(hr8?.cells.join(' ')).toContain('配下に足すを押したとき、`GRS` は、選択した `TaskGroup` の同じ段ではなく配下にタスクグループを 1 つ足すこと。')
  })
})

describe('表 T-109 IC-58 / IC-59 -- the entry a press on either side answers', () => {
  it.each(T_109_TASK_GROUP_EXPANDER)(
    'GIVEN the pair is drawn WHEN a point over the $side control is asked about THEN IF-9 answers Task Group Panel / $row (表 T-051 の $rule)',
    ({ row }) => {
      const built = drawn(withExpander({ canOpen: true, canClose: true, canCloseBelow: false }))
      const at = EXPANDER_AT[row]

      expect(at, `no point was laid out for ${row}`).toBeDefined()
      expect(ask(built, at?.x ?? -1, at?.y ?? -1)).toEqual({
        part: 'Task Group Panel',
        entry: row,
        format: null,
        // Why: the entry alone cannot become either command; withExpander draws one task
        // group and this is its TaskGroup.id.
        taskGroupId: 'g-1',
        resourceUid: null,
        dividerPanel: null,
        noticeDismissKey: null,
      })
    },
  )

  it('GIVEN both controls WHEN each is pressed THEN two DIFFERENT entries come back (U-47: two controls, not one in two states)', () => {
    const built = drawn(withExpander({ canOpen: true, canClose: true, canCloseBelow: false }))

    const opening = ask(built, AT.taskGroupExpanderOpen.x, AT.taskGroupExpanderOpen.y)
    const closing = ask(built, AT.taskGroupExpanderClose.x, AT.taskGroupExpanderClose.y)

    expect(opening?.entry).not.toBe(closing?.entry)
    expect([opening?.entry, closing?.entry]).toEqual(['IC-58', 'IC-59'])
  })

  it('GIVEN the pair is drawn WHEN the entries answered are compared with the tree THEN the unit answers only what it itself drew (IF-9 MUST, 05-07-design.md)', () => {
    const built = drawn(withExpander({ canOpen: true, canClose: true, canCloseBelow: false }))

    for (const one of T_109_TASK_GROUP_EXPANDER) {
      const node = entryFor(built.root(), one.row)
      expect(node.getAttribute('data-role')).toBe('Task Group Buttons')
      const at = EXPANDER_AT[one.row]
      expect(ask(built, at?.x ?? -1, at?.y ?? -1)?.entry).toBe(one.row)
    }
  })

  it('GIVEN both sides are spent WHEN either is pressed THEN it still answers its entry (FR-029: it does not go quiet)', () => {
    const built = drawn(withExpander({ canOpen: false, canClose: false, canCloseBelow: false }))

    for (const one of T_109_TASK_GROUP_EXPANDER) {
      const at = EXPANDER_AT[one.row]
      expect(ask(built, at?.x ?? -1, at?.y ?? -1)).toEqual({
        part: 'Task Group Panel',
        entry: one.row,
        format: null,
        // Why: a spent control still stands on its task group, so the task group it names
        // does not go away.
        taskGroupId: 'g-1',
        resourceUid: null,
        dividerPanel: null,
        noticeDismissKey: null,
      })
    }
  })

  it('GIVEN both sides are spent WHEN the controls are read THEN neither is disabled nor hidden (FR-029: drawn faint, not removed)', () => {
    const built = drawn(withExpander({ canOpen: false, canClose: false, canCloseBelow: false }))

    for (const one of T_109_TASK_GROUP_EXPANDER) {
      const node = entryFor(built.root(), one.row)
      // Why: `disabled` stops an element taking the pointer, so no answer above could
      // be given.
      expect(node.hasAttribute('disabled'), `${one.row} was disabled`).toBe(false)
      expect(isShown(node), `${one.row} was hidden`).toBe(true)
    }
  })

  it('GIVEN the pair is drawn WHEN canOpen and canClose differ THEN each side records its own half (FR-029 needs the spent one tellable)', () => {
    // Why: the attribute names are the seam's DOM contract, not the spec's; the spec needs
    // only that canOpen and canClose arrive apart, for FR-029 to key on.
    const open = drawn(withExpander({ canOpen: true, canClose: false, canCloseBelow: false }))
    const close = drawn(withExpander({ canOpen: false, canClose: true, canCloseBelow: false }))

    expect(entryFor(open.root(), 'IC-58').getAttribute('data-can-open')).toBe('true')
    expect(entryFor(open.root(), 'IC-59').getAttribute('data-can-close')).toBe('false')
    expect(entryFor(close.root(), 'IC-58').getAttribute('data-can-open')).toBe('false')
    expect(entryFor(close.root(), 'IC-59').getAttribute('data-can-close')).toBe('true')
  })
})

describe('the Task Group Buttons at the edges -- R3.4, the bare panel, and a redraw', () => {
  it('GIVEN IC-58 holds x 84..100 and IC-59 x 100..116 WHEN the shared edge is pressed THEN it belongs to IC-59 (R3.4, half-open)', () => {
    const built = drawn(withExpander({ canOpen: true, canClose: true, canCloseBelow: false }))

    expect(ask(built, 99, 64)?.entry).toBe('IC-58')
    expect(ask(built, 100, 64)?.entry).toBe('IC-59')
    expect(ask(built, 115, 64)?.entry).toBe('IC-59')
    expect(ask(built, 116, 64)?.entry).toBe('IC-77')
  })

  it('GIVEN IC-58 begins at x 84, y 60 WHEN its left and top edge are pressed THEN it holds them (R3.4, half-open)', () => {
    const built = drawn(withExpander({ canOpen: true, canClose: true, canCloseBelow: false }))

    expect(ask(built, 84, 60)?.entry).toBe('IC-58')
  })

  it('GIVEN IC-77 ends at x 132 WHEN the strip beyond it is pressed THEN the panel answers with entry null (EZ-2: the icon the pointer rests ON)', () => {
    const built = drawn(withExpander({ canOpen: true, canClose: true, canCloseBelow: false }))

    // Why: the point is on no entry and still on that task group, so entry is null while
    // the task group is named; EZ-2 needs the two told apart.
    expect(ask(built, 132, 64)).toEqual({
      part: 'Task Group Panel',
      entry: null,
      format: null,
      taskGroupId: 'g-1',
      resourceUid: null,
      dividerPanel: null,
      noticeDismissKey: null,
    })
    expect(ask(built, AT.taskGroupExpanderGap.x, AT.taskGroupExpanderGap.y)).toEqual({
      part: 'Task Group Panel',
      entry: null,
      format: null,
      taskGroupId: 'g-1',
      resourceUid: null,
      dividerPanel: null,
      noticeDismissKey: null,
    })
  })

  it('GIVEN the expander was drawn and the next frame drops the TASK GROUP WHEN the same point is pressed THEN the entry stops answering (the answer comes from what is drawn NOW)', () => {
    const built = drawn(withExpander({ canOpen: true, canClose: true, canCloseBelow: false }))
    expect(ask(built, AT.taskGroupExpanderOpen.x, AT.taskGroupExpanderOpen.y)?.entry).toBe(
      entranceForRule('HF-2'),
    )

    // Why: a panel with no task groups is the frame that really takes the control away;
    // a side answering from the frame before would name an entry nobody can see.
    surfaceOf(built).showScreenView(viewWith({ taskGroupPanel: { pinnedTitles: [], titles: [] } }))

    expect(ask(built, AT.taskGroupExpanderOpen.x, AT.taskGroupExpanderOpen.y)?.entry ?? null).toBeNull()
    expect(expanderControls(built)).toHaveLength(0)
  })

  it('GIVEN nothing has been drawn yet WHEN the expander point is asked about THEN nothing is on it (BO-1 of 表 T-077)', () => {
    const built = wire()

    expect(ask(built, AT.taskGroupExpanderOpen.x, AT.taskGroupExpanderOpen.y)).toBeNull()
  })
})

// Why: the fake answers boxes from LAYOUT, so a width read here would pass a 4 x 0
// control; the cases read the declarations a browser turns into the pixel instead.

const T_051_HF5_SAME_SIZE = '`GRS` は、タスクグループ名の文字サイズにかかわらず、ボタンを同じ大きさで描くこと。'

const FR_098_ONE_PER_TASK_GROUP = '`GRS` は、ピン止めボタン（`Pin Button`）を、タスクグループパネルの各タスクグループに 1 つ置くこと。'

// Summary: A length that contributes nothing, counting `none` and `auto` as its absence.
const isZeroLength = (value: string): boolean =>
  value === '' || /^(0(?:[a-z%]+)?|none|auto|initial|unset)$/i.test(value.trim())

function fourSides(shorthand: string): {
  readonly top: string
  readonly right: string
  readonly bottom: string
  readonly left: string
} {
  const parts = shorthand
    .trim()
    .split(/\s+/)
    .filter((one) => one.length > 0)
  const [first = '', second = first, third = first, fourth = second] = parts
  return { top: first, right: second, bottom: third, left: fourth }
}

const borderHasWidth = (shorthand: string): boolean =>
  !/(^|\s)(none|hidden)(\s|$)/i.test(shorthand) &&
  /(^|\s)(thin|medium|thick|[0-9.]+[a-z%]+)(\s|$)/i.test(shorthand)

// Why: content counts on both axes, since a button is inline-block by default; LAYOUT
// is never consulted, because the point is to read what a browser would read.
function intrinsicExtent(element: FakeElement): {
  readonly hasContent: boolean
  readonly widthSources: string[]
  readonly heightSources: string[]
} {
  const declared = styleMap(element)
  const at = (property: string): string => declared.get(property) ?? ''
  const padding = fourSides(at('padding'))
  const border = at('border')
  const widthSources: string[] = []
  const heightSources: string[] = []

  const hasContent = element.textContent !== '' || element.children.length > 0
  if (hasContent) {
    widthSources.push('content')
    heightSources.push('content')
  }
  for (const [axis, sources] of [
    ['width', widthSources],
    ['height', heightSources],
  ] as const) {
    if (!isZeroLength(at(axis))) sources.push(axis)
    if (!isZeroLength(at(`min-${axis}`))) sources.push(`min-${axis}`)
  }
  for (const side of ['top', 'bottom'] as const) {
    if (!isZeroLength(at(`padding-${side}`) || padding[side])) heightSources.push(`padding-${side}`)
    if (borderHasWidth(at(`border-${side}`) || border)) heightSources.push(`border-${side}`)
  }
  for (const side of ['left', 'right'] as const) {
    if (!isZeroLength(at(`padding-${side}`) || padding[side])) widthSources.push(`padding-${side}`)
    if (borderHasWidth(at(`border-${side}`) || border)) widthSources.push(`border-${side}`)
  }
  return { hasContent, widthSources, heightSources }
}

// Why: pointer-events inherits, and the fake's stackAt models only visibility and
// display, so a control lost this way shows in no other case.
function inheritedPointerEvents(element: FakeElement): {
  readonly value: string
  readonly declaredBy: string
} {
  let at: FakeElement | null = element
  while (at !== null) {
    const held = styleMap(at).get('pointer-events')
    if (held !== undefined && held.trim() !== '' && held.trim() !== 'inherit') {
      return {
        value: held.trim().toLowerCase(),
        declaredBy: at.getAttribute('data-role') ?? at.tagName.toLowerCase(),
      }
    }
    at = at.parentNode
  }
  return { value: 'auto', declaredBy: '(nothing declared one)' }
}

function taskGroupControlsOf(built: Stage): Map<string, FakeElement[]> {
  const held = new Map<string, FakeElement[]>()
  for (const one of T_109_ON_THE_TASK_GROUP) {
    held.set(
      one.row,
      selfAndDescendants(built.root()).filter((node) => node.getAttribute('data-icon') === one.row),
    )
  }
  return held
}

const oneLiveTaskGroup = (): ScreenView => withExpander({ canOpen: true, canClose: true, canCloseBelow: false })

describe('表 T-109 IC-58 / IC-59 / IC-60 -- the control has a box (the 4 x 0 finding)', () => {
  it.each(T_109_ON_THE_TASK_GROUP)(
    '⭐ GIVEN $row is drawn on the $surface WHEN the declarations a browser would measure are read THEN the control has BOTH a width and a HEIGHT -- the case that catches the 4 x 0 control nobody could press (表 T-109 $row, 表 T-051 HF-5 MUST)',
    ({ row }) => {
      const built = drawn(oneLiveTaskGroup())
      const node = entryFor(built.root(), row)
      const extent = intrinsicExtent(node)

      // Why: a control with no source of height is drawn 0 high, the same size as nothing,
      // and no point is ever on it for IF-9 to answer (HF-5, FR-029).
      expect(
        extent.heightSources,
        `${row} has nothing that gives it a height: ${inlineStyle(node)}`,
      ).not.toHaveLength(0)
      expect(
        extent.widthSources,
        `${row} has nothing that gives it a width: ${inlineStyle(node)}`,
      ).not.toHaveLength(0)
    },
  )

  it('⛔ GIVEN a node carrying the SAME declarations but nothing inside WHEN it is read THEN it measures wide and NOT high -- so the case above is not a green that proves nothing (04-verification.md §2)', () => {
    const built = drawn(oneLiveTaskGroup())
    const real = entryFor(built.root(), 'IC-58')

    // Why: the same node and declarations with nothing inside, to break the predicate.
    const emptied = new FakeElement('button', built.world)
    emptied.setAttribute('style', inlineStyle(real))
    const extent = intrinsicExtent(emptied)

    expect(extent.hasContent).toBe(false)
    expect(extent.heightSources, 'the predicate would pass an empty control').toHaveLength(0)
    // Why: horizontal padding survives an empty control, which is why it was 4 x 0;
    // if this ever empties too, the case above no longer catches the defect.
    expect(extent.widthSources).not.toHaveLength(0)
  })

  it('GIVEN the specification is re-read WHEN 表 T-051 HF-5 and FR-098 are looked up THEN they still require a size and one control per task group', () => {
    const requirements = specText('01-04-requirements.md')

    expect(requirements).toContain(T_051_HF5_SAME_SIZE)
    expect(requirements).toContain(FR_098_ONE_PER_TASK_GROUP)
  })

  it('GIVEN both sides of the expander are spent WHEN the controls are read THEN each still has a width and a height (FR-029: 薄く描く, not shrunk to nothing) -- IC-58 / IC-59', () => {
    const built = drawn(withExpander({ canOpen: false, canClose: false, canCloseBelow: false }))

    // Why: a tooltip has to be pointed at, so a faint control needs its box more than
    // a live one (FR-029).
    for (const one of T_109_TASK_GROUP_EXPANDER) {
      const extent = intrinsicExtent(entryFor(built.root(), one.row))
      expect(extent.heightSources, `spent ${one.row} lost its height`).not.toHaveLength(0)
      expect(extent.widthSources, `spent ${one.row} lost its width`).not.toHaveLength(0)
    }
  })

  it('GIVEN a task group whose own name is EMPTY WHEN its controls are read THEN they still have a height (表 T-051 HF-5: the task group name does not decide it) -- IC-58 / IC-59 / IC-60', () => {
    const built = drawn(
      viewWith({
        taskGroupPanel: {
          pinnedTitles: [],
          titles: [
            taskGroupTitle({
              taskGroupId: 'g-1',
              label: '',
              wholeLabel: '',
              expander: { canOpen: true, canClose: true, canCloseBelow: false },
            }),
          ],
        },
      }),
    )

    // Why: if the task group's own name filled the control, an unnamed task group would
    // take the control away with it.
    for (const one of T_109_ON_THE_TASK_GROUP) {
      const extent = intrinsicExtent(entryFor(built.root(), one.row))
      expect(extent.heightSources, `${one.row} lost its height on an unnamed task group`).not.toHaveLength(
        0,
      )
    }
  })

  it('GIVEN a pinned task group and an ordinary task group WHEN every control of 表 T-109 on the panel is read THEN each of the six has a box (HF-1 「各タスクグループに」, FR-098 「各タスクグループに 1 つ」)', () => {
    const built = drawn(
      viewWith({
        taskGroupPanel: {
          pinnedTitles: [
            taskGroupTitle({
              taskGroupId: 'g-pinned',
              isPinned: true,
              expander: { canOpen: true, canClose: true, canCloseBelow: false },
            }),
          ],
          titles: [
            taskGroupTitle({
              taskGroupId: 'g-1',
              expander: { canOpen: true, canClose: true, canCloseBelow: false },
            }),
          ],
        },
      }),
    )

    const held = taskGroupControlsOf(built)
    for (const one of T_109_ON_THE_TASK_GROUP) {
      const controls = held.get(one.row) ?? []
      expect(controls, `${one.row} was not drawn once per task group`).toHaveLength(2)
      for (const node of controls) {
        expect(
          intrinsicExtent(node).heightSources,
          `${one.row} has no height on one of the two task groups`,
        ).not.toHaveLength(0)
      }
    }
  })

  it('⭐ GIVEN a task group with NOTHING TO FOLD WHEN the panel is read THEN every entry of 表 T-109 is on it exactly once and each has a box (FR-098 「各タスクグループに 1 つ」, HF-1 「各タスクグループに」, FR-029 薄く描く)', () => {
    const built = drawn(withExpander(NOTHING_TO_FOLD))

    // Why: a task group with every folding control spent is covered nowhere else, and a
    // spent control with no box is one no press can reach.
    const held = taskGroupControlsOf(built)
    for (const one of T_109_ON_THE_TASK_GROUP) {
      const drew = held.get(one.row) ?? []
      expect(drew, `${one.row} is not on a task group with nothing to fold exactly once`).toHaveLength(1)
      for (const node of drew) {
        expect(
          intrinsicExtent(node).heightSources,
          `${one.row} has nothing that gives it a height: ${inlineStyle(node)}`,
        ).not.toHaveLength(0)
      }
    }
  })

  it('GIVEN a panel with no task groups at all WHEN it is read THEN no control of 表 T-109 is drawn and none claims a box (empty)', () => {
    const built = drawn(viewWith({ taskGroupPanel: { pinnedTitles: [], titles: [] } }))

    const held = taskGroupControlsOf(built)
    for (const one of T_109_ON_THE_TASK_GROUP) {
      expect(held.get(one.row), `${one.row} was drawn on an empty panel`).toEqual([])
    }
    expect(ask(built, AT.taskGroupPin.x, AT.taskGroupPin.y)).toEqual({
      part: 'Task Group Panel',
      entry: null,
      format: null,
      // Why: the key says the point is on no task group, not that the document has none.
      taskGroupId: null,
      resourceUid: null,
      dividerPanel: null,
      noticeDismissKey: null,
    })
  })
})

describe('表 T-109 IC-58 / IC-59 / IC-60 -- the control takes the pointer', () => {
  // Why: stackAt weighs only visibility and display, so pointer-events could keep every
  // case above green while the live DOM answers the node behind the control.
  it('GIVEN the panel is drawn WHEN the tree over it is read THEN it really does declare pointer-events:none -- without which the case below would be checking nothing', () => {
    const built = drawn(oneLiveTaskGroup())
    const overlay = byRole(built.root(), 'Task Group Title Tree')[0]

    // Why: the overlay spans the whole panel and is none on purpose, or it would swallow
    // every press; so each control's branch must hand the pointer back.
    expect(overlay, 'no Task Group Title Tree was drawn').toBeDefined()
    expect(styleMap(overlay as FakeElement).get('pointer-events')).toBe('none')
  })

  it.each(T_109_ON_THE_TASK_GROUP)(
    '⛔ GIVEN $row is drawn WHEN the pointer-events it INHERITS is resolved up the tree THEN it is not none -- a control the pointer passes through cannot be pressed (FR-098 MUST, 表 T-051 HF-1)',
    ({ row }) => {
      const built = drawn(oneLiveTaskGroup())
      const node = entryFor(built.root(), row)
      const reaching = inheritedPointerEvents(node)

      // Why: a control under an inherited pointer-events:none is no hit target, so the
      // browser answers what is behind it and IF-9 can never name it (FR-098, HF-1).
      expect(
        reaching.value,
        `${row} inherits pointer-events:${reaching.value} from ${reaching.declaredBy}`,
      ).not.toBe('none')
    },
  )
})

// Spec: FR-098, HF-4, HF-5, HF-6
const FR_098_SAME_AS_THE_EXPANDER = '置き方・大きさ・濃さと'

// Why: the fake's boxes come from LAYOUT for every name and depth, so comparing x
// would pass controls on the left; the cases read the flex arrangement instead.

const T_051_HF4_RIGHT_EDGE =
  '`GRS` は、タスクグループ名の長さにかかわらず、`Task Group Buttons` をタスクグループパネルの右端に揃えること。'

const FR_085_INDENT_BY_DEPTH = 'タスクグループの深さぶんのインデント（`taskGroupTitleIndent`、表 T-201 の `S-37`）'

function settingNumber(table: string, row: string): number {
  const cell = specTable(table).rows.find((one) => one.id === row)?.by['値'] ?? ''
  const found = /`(\d+)`/.exec(cell)
  if (found === null) throw new Error(`table ${table} row ${row} has no number in its 値 column`)
  return Number.parseInt(found[1] ?? '', 10)
}

// Why: T-211 counts the root task group as depth 1, so 1 and S-125 are the two ends.
const MAX_GROUP_DEPTH = settingNumber('T-211', 'S-125')

const DEPTHS = Array.from({ length: MAX_GROUP_DEPTH }, (_unused, index) => index + 1)

const TASK_GROUP_NAMES = [
  { what: 'empty', label: '' },
  { what: 'null -- no name could be resolved (FR-058)', label: null },
  { what: 'one character', label: 'A' },
  { what: 'far longer than the panel', label: 'N'.repeat(400) },
] as const

const taskGroupNamed = (label: string | null, depth = 1): ScreenView =>
  viewWith({
    taskGroupPanel: {
      pinnedTitles: [],
      titles: [
        taskGroupTitle({
          taskGroupId: 'g-1',
          label,
          wholeLabel: label,
          depth,
          expander: { canOpen: true, canClose: true, canCloseBelow: false },
        }),
      ],
    },
  })

const rowsOf = (built: Stage): FakeElement[] =>
  selfAndDescendants(built.root()).filter((one) => one.hasAttribute('data-group-id'))

function theTaskGroupOf(built: Stage): FakeElement {
  const first = rowsOf(built)[0]
  if (first === undefined) throw new Error('the panel drew no task group')
  return first
}

// Why: the whole subtree, not row.children: HF-1's lattice holds the folding controls,
// and nothing in the spec fixes how deep a control is nested.
const controlsOf = (row: FakeElement): FakeElement[] =>
  selfAndDescendants(row).filter((one) => one !== row && one.hasAttribute('data-icon'))

const holdsAControl = (node: FakeElement): boolean =>
  selfAndDescendants(node).some((one) => one.hasAttribute('data-icon'))

// Why: HF-4 lines up these hosts, not the controls, against the right edge, because
// it is these that stand in the task group's own line.
const controlHostsOf = (row: FakeElement): FakeElement[] => row.children.filter(holdsAControl)

// Why: found by position, not role: nothing in the spec names the name cell, and
// HF-4 is about what stands between the name and the right edge.
function nameCellOf(row: FakeElement): FakeElement | null {
  const firstHost = row.children.findIndex(holdsAControl)
  const before = firstHost < 0 ? row.children : row.children.slice(0, firstHost)
  return before[before.length - 1] ?? null
}

// Summary: Splits a shorthand at the top level, so `calc(0.25em + 2em)` stays one value.
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

function sidesOf(shorthand: string): {
  readonly top: string
  readonly right: string
  readonly bottom: string
  readonly left: string
} {
  const parts = shorthandParts(shorthand)
  const [first = '', second = first, third = first, fourth = second] = parts
  return { top: first, right: second, bottom: third, left: fourth }
}

type BoxSide = 'top' | 'right' | 'bottom' | 'left'

function insetOf(element: FakeElement, property: 'padding' | 'margin', side: BoxSide): string {
  const declared = styleMap(element)
  const longhand = declared.get(`${property}-${side}`)
  if (longhand !== undefined && longhand.trim() !== '') return longhand.trim()
  return sidesOf(declared.get(property) ?? '')[side]
}

function flexGrowOf(element: FakeElement): number {
  const declared = styleMap(element)
  const longhand = declared.get('flex-grow')
  if (longhand !== undefined && longhand.trim() !== '') return Number.parseFloat(longhand)
  const shorthand = (declared.get('flex') ?? '').trim().toLowerCase()
  if (shorthand === '' || shorthand === 'none' || shorthand === 'initial') return 0
  if (shorthand === 'auto') return 1
  const first = shorthandParts(shorthand)[0] ?? ''
  const value = Number.parseFloat(first)
  return Number.isFinite(value) ? value : 0
}

// Why: `flex: 1` means a basis of `0%`, not `auto`.
function flexBasisOf(element: FakeElement): string {
  const declared = styleMap(element)
  const longhand = declared.get('flex-basis')
  if (longhand !== undefined && longhand.trim() !== '') return longhand.trim().toLowerCase()
  const shorthand = (declared.get('flex') ?? '').trim().toLowerCase()
  if (shorthand === '' || shorthand === 'none' || shorthand === 'auto' || shorthand === 'initial') {
    return 'auto'
  }
  const parts = shorthandParts(shorthand)
  if (parts.every((one) => /^[0-9.]+$/.test(one))) return '0%'
  return parts[parts.length - 1] ?? 'auto'
}

const isZeroBasis = (value: string): boolean => /^0(?:[a-z%]+)?$/i.test(value.trim())

function differingProperties(a: FakeElement, b: FakeElement): string[] {
  const left = styleMap(a)
  const right = styleMap(b)
  return [...new Set([...left.keys(), ...right.keys()])]
    .filter((one) => left.get(one) !== right.get(one))
    .sort()
}

// Why: an indent may land only on the left inset; the shorthands' right component
// is read out and compared separately.
const LEFT_INSETS = new Set(['padding', 'padding-left', 'margin', 'margin-left', 'text-indent'])

const controlStyles = (built: Stage): Record<string, string> =>
  Object.fromEntries(
    T_109_ON_THE_TASK_GROUP.map((one) => [one.row, inlineStyle(entryFor(built.root(), one.row))]),
  )

// Why: only the place in the line is asserted, not the nesting: the folding controls
// arrive inside HF-1's lattice, and no spec row says how deep.
function expectTheControlsEndTheTaskGroup(row: FakeElement): void {
  const hosts = controlHostsOf(row)
  expect(hosts.length, `nothing on the task group brings a control: ${serialize(row)}`).toBeGreaterThan(0)

  const places = hosts.map((one) => row.children.indexOf(one))
  expect(
    places[places.length - 1],
    `something of the task group's own stands after its controls: ${serialize(row)}`,
  ).toBe(row.children.length - 1)
  expect(
    places,
    `the controls do not stand together at the end of the task group: ${serialize(row)}`,
  ).toEqual(places.map((_unused, index) => row.children.length - places.length + index))
}

describe('表 T-051 HF-4 / FR-098 -- the controls hold the right edge whatever the name is', () => {
  it.each(TASK_GROUP_NAMES)(
    '⭐ GIVEN a task group whose name is $what WHEN the task group it built is read THEN every entry 表 T-109 puts on the Task Group Panel is among its LAST children and the name beside them is what takes the free space (表 T-051 HF-4 MUST)',
    ({ label }) => {
      const built = drawn(taskGroupNamed(label))
      const row = theTaskGroupOf(built)

      // Why: in a flex line the last items sit at its end only if something ahead absorbs
      // the free space, so these four readings together are HF-4, none of them alone.
      expect(styleMap(row).get('display'), 'the task group is not a flex line').toBe('flex')

      // Why: the set, not the order, since the run's order has its own cases below; read
      // through the hosts, as the folding controls sit inside the lattice.
      expect(
        [...controlsOf(row).map((one) => one.getAttribute('data-icon'))].sort(),
        `the task group does not carry 表 T-109's entries for the Task Group Panel: ${serialize(row)}`,
      ).toEqual([...T_109_ON_THE_TASK_GROUP.map((one) => one.row)].sort())
      expectTheControlsEndTheTaskGroup(row)

      const name = nameCellOf(row)
      expect(name, 'the task group has no cell for its name at all').not.toBeNull()
      const cell = name as FakeElement
      expect(
        flexGrowOf(cell),
        `the name cell does not grow, so the controls follow the name: ${inlineStyle(cell)}`,
      ).toBeGreaterThanOrEqual(1)
      // Why: a zero basis makes the name's length irrelevant: the cell starts at nothing
      // and is handed the space left over.
      expect(
        isZeroBasis(flexBasisOf(cell)),
        `the name cell is sized from its content (flex-basis:${flexBasisOf(cell)})`,
      ).toBe(true)
      // Why: this stops a long name: a flex item's automatic minimum size does not apply
      // when its overflow is not visible.
      expect(
        (styleMap(cell).get('overflow') ?? 'visible').trim().toLowerCase(),
        'a name longer than the task group can push the controls out of it',
      ).not.toBe('visible')
    },
  )

  it('⭐ GIVEN the same task group drawn with an empty name and with one far longer than the panel WHEN the two are compared THEN not one declaration on the controls differs, and neither does the task group (表 T-051 HF-4: 名前ごとに位置が変わると狙えない)', () => {
    const empty = drawn(taskGroupNamed(''))
    const long = drawn(taskGroupNamed('N'.repeat(400)))

    expect(controlStyles(long)).toEqual(controlStyles(empty))
    expect(
      differingProperties(theTaskGroupOf(empty), theTaskGroupOf(long)),
      'the task group itself is drawn differently for a long name',
    ).toEqual([])
  })

  it('⭐ GIVEN a task group with NOTHING under it WHEN it is read THEN the SAME roster still ends the task group (表 T-051 HF-1 「各タスクグループに」, HF-13 / HF-14 「タスクグループごとに 1 つ」, FR-029 薄く描く)', () => {
    const built = drawn(withExpander(NOTHING_TO_FOLD))
    const row = theTaskGroupOf(built)

    // Why: every task group has the same controls: a roster that shrank on a childless
    // task group would move the rest under the pointer, which HF-4 and FR-085 forbid.
    expect(
      [...controlsOf(row).map((one) => one.getAttribute('data-icon'))].sort(),
      'a childless task group ends with a different set of controls than a task group with children',
    ).toEqual([...T_109_ON_THE_TASK_GROUP.map((one) => one.row)].sort())
    const cell = nameCellOf(row)
    expect(cell).not.toBeNull()
    expect(flexGrowOf(cell as FakeElement)).toBeGreaterThanOrEqual(1)
  })

  it('GIVEN a PINNED task group WHEN it is read THEN its controls end the task group the same way (FR-098 draws the pinned task groups too)', () => {
    const built = drawn(
      viewWith({
        taskGroupPanel: {
          pinnedTitles: [
            taskGroupTitle({
              taskGroupId: 'g-pinned',
              isPinned: true,
              depth: 2,
              expander: { canOpen: true, canClose: true, canCloseBelow: false },
            }),
          ],
          titles: [],
        },
      }),
    )
    const row = theTaskGroupOf(built)

    // Why: U-46 lifts a pinned task group out of the scrolling list, but HF-4 makes no
    // exception for it.
    expect(styleMap(row).get('display')).toBe('flex')
    expect(
      [...controlsOf(row).map((one) => one.getAttribute('data-icon'))].sort(),
      `a pinned task group does not carry 表 T-109's entries for the Task Group Panel: ${serialize(row)}`,
    ).toEqual([...T_109_ON_THE_TASK_GROUP.map((one) => one.row)].sort())
    expectTheControlsEndTheTaskGroup(row)
    expect(flexGrowOf(nameCellOf(row) as FakeElement)).toBeGreaterThanOrEqual(1)
  })

  it('GIVEN a panel with no task groups at all WHEN it is read THEN nothing claims the edge -- no task group and no control (empty)', () => {
    const built = drawn(viewWith({ taskGroupPanel: { pinnedTitles: [], titles: [] } }))

    expect(rowsOf(built)).toEqual([])
    for (const one of T_109_ON_THE_TASK_GROUP) {
      expect(
        selfAndDescendants(built.root()).filter(
          (node) => node.getAttribute('data-icon') === one.row,
        ),
        `${one.row} was drawn on an empty panel`,
      ).toEqual([])
    }
  })

  it('GIVEN the specification is re-read WHEN 表 T-051 HF-4 is looked up THEN it still puts the controls on the right edge regardless of the name (Chapter 1.9: the case is driven by the table)', () => {
    const hf4 = specTable('T-051').rows.find((one) => one.id === 'HF-4')
    expect(hf4, '表 T-051 no longer holds HF-4').toBeDefined()
    expect(hf4?.cells.join(' ')).toContain('タスクグループ名の長さにかかわらず')
    expect(hf4?.cells.join(' ')).toContain('`Task Group Buttons` をタスクグループパネルの右端に揃えること。')
    expect(specText('01-04-requirements.md')).toContain(T_051_HF4_RIGHT_EDGE)
    expect(specText('01-04-requirements.md')).toContain(FR_098_SAME_AS_THE_EXPANDER)
  })
})

describe('表 T-051 HF-4 / FR-085 -- the task group depth moves the name, never the right edge', () => {
  it.each(DEPTHS)(
    '⭐ GIVEN a task group at depth %i WHEN it is compared with a root task group THEN every control is drawn identically and the task group differs only on its LEFT inset (表 T-051 HF-4, FR-085 「深さぶんのインデント」) -- IC-58 / IC-59 / IC-60',
    (depth) => {
      const root = drawn(taskGroupNamed('TaskGroupOne', 1))
      const deeper = drawn(taskGroupNamed('TaskGroupOne', depth))

      // Why: nothing the depth wrote may reach the controls, or the right edge walks in
      // with the depth (HF-4).
      expect(controlStyles(deeper), `the depth ${depth} indent reached the controls`).toEqual(
        controlStyles(root),
      )

      const differing = differingProperties(theTaskGroupOf(root), theTaskGroupOf(deeper))
      expect(
        differing.filter((one) => !LEFT_INSETS.has(one)),
        `depth ${depth} changed something that is not a left inset: ${inlineStyle(theTaskGroupOf(deeper))}`,
      ).toEqual([])

      // Why: `padding` is a shorthand and may differ, so its right side is compared alone.
      expect(
        insetOf(theTaskGroupOf(deeper), 'padding', 'right'),
        `depth ${depth} changed the task group's right padding`,
      ).toBe(insetOf(theTaskGroupOf(root), 'padding', 'right'))
      expect(insetOf(theTaskGroupOf(deeper), 'margin', 'right')).toBe(
        insetOf(theTaskGroupOf(root), 'margin', 'right'),
      )
    },
  )

  it('⭐ GIVEN the deepest task group S-125 allows and a root task group WHEN their drawings are compared THEN they DIFFER -- the depth was spent, and spent on the name side (FR-085)', () => {
    const root = drawn(taskGroupNamed('TaskGroupOne', 1))
    const deepest = drawn(taskGroupNamed('TaskGroupOne', MAX_GROUP_DEPTH))

    // Why: without this, a unit ignoring the depth would pass the case above; FR-085
    // counts on the indent being there.
    expect(
      differingProperties(theTaskGroupOf(root), theTaskGroupOf(deepest)),
      `depth ${MAX_GROUP_DEPTH} is drawn exactly like depth 1 -- the indent is missing`,
    ).not.toEqual([])
    expect(specText('01-04-requirements.md')).toContain(FR_085_INDENT_BY_DEPTH)
  })

  it('GIVEN 表 T-211 is re-read WHEN S-125 is looked up THEN the depths these cases walk are the ones it allows (Chapter 1.9)', () => {
    const row = specTable('T-211').rows.find((one) => one.id === 'S-125')
    expect(row?.cells.join(' '), '表 T-211 no longer holds maxGroupDepth').toContain('maxGroupDepth')
    expect(row?.cells.join(' '), 'S-125 no longer counts the root task group as depth 1').toContain(
      '根のタスクグループを深さ 1 と数える',
    )
    expect(DEPTHS[0]).toBe(1)
    expect(DEPTHS[DEPTHS.length - 1]).toBe(MAX_GROUP_DEPTH)
  })
})

// Why: there is no pointer here, so the cases read the unit's sheet, not a made-up
// pointerover; FR-048 does not cover HF-6, so a listener would be admissible too.

interface SheetDeclaration {
  readonly value: string
  readonly isImportant: boolean
}

interface SheetRule {
  readonly selector: string
  readonly declarations: ReadonlyMap<string, SheetDeclaration>
}

// Summary: A tiny stylesheet reader for the flat selector lists and declaration blocks a single-file page carries.
// Trap: it knows nothing of at-rules: a rule inside `@media` reads as always
// applying, so re-read this if one ever appears.
function parseCss(css: string): SheetRule[] {
  const rules: SheetRule[] = []
  for (const block of css.split('}')) {
    const brace = block.indexOf('{')
    if (brace < 0) continue
    const declarations = new Map<string, SheetDeclaration>()
    for (const one of block.slice(brace + 1).split(';')) {
      const colon = one.indexOf(':')
      if (colon < 0) continue
      const property = one.slice(0, colon).trim().toLowerCase()
      const written = one.slice(colon + 1).trim()
      declarations.set(property, {
        value: written.replace(/!\s*important$/i, '').trim(),
        isImportant: /!\s*important$/i.test(written),
      })
    }
    for (const selector of block.slice(0, brace).split(',')) {
      if (selector.trim() !== '') rules.push({ selector: selector.trim(), declarations })
    }
  }
  return rules
}

const sheetRulesOf = (root: FakeElement): SheetRule[] =>
  selfAndDescendants(root)
    .filter((one) => one.tagName === 'STYLE')
    .flatMap((one) => parseCss(one.textContent))

// Summary: The declaration a rule set gives this node while the pointer rests where the selector names, the last match winning, or null.
// Why: `:hover` may sit on any part of the selector: HF-6 keys on the name, an
// ancestor of the control, so the condition is stripped wherever it stands.
function hoverDeclaration(
  rules: readonly SheetRule[],
  node: FakeElement,
  property: string,
): SheetDeclaration | null {
  let found: SheetDeclaration | null = null
  for (const rule of rules) {
    if (!rule.selector.includes(':hover')) continue
    if (!matches(node, rule.selector.split(':hover').join(''))) continue
    found = rule.declarations.get(property) ?? found
  }
  return found
}

// Why: any selector with a `:` is left out as conditional, the safe direction: it
// can only miss a rule, never invent one.
function restingDeclaration(
  rules: readonly SheetRule[],
  node: FakeElement,
  property: string,
): SheetDeclaration | null {
  let found: SheetDeclaration | null = null
  for (const rule of rules) {
    if (rule.selector.includes(':')) continue
    if (!matches(node, rule.selector)) continue
    found = rule.declarations.get(property) ?? found
  }
  return found
}

const T_051_HF6_ONLY_WHILE_POINTED =
  '`GRS` は、`Task Group Buttons` を、タスクグループ名か、タスクグループのために描いたボタンの群（地を敷く範囲）にポインターが乗っているあいだだけ描くこと。'
const T_051_HF6_THE_GROUP_STAYS =
  '`GRS` は、一度あるタスクグループのために描いた群を、ポインターが群から外れて群が消えるまで、描き始めたタスクグループのボタンのままにすること。'
const T_051_HF6_ROOM_UNCHANGED = '`GRS` は、ボタンを描かないあいだも、確保する場所を変えないこと（規則と理由は `FR-085` が持つ）。'

// Spec: HF-6, FR-085, S-140
// Why: the room must stay: display:none and content-visibility:hidden take the box
// out of the layout, visibility and opacity do not.
interface Hiding {
  readonly property: string
  readonly hidden: string
  readonly keepsRoom: boolean
}

const HIDING_DECLARATIONS: readonly Hiding[] = [
  { property: 'visibility', hidden: 'hidden', keepsRoom: true },
  { property: 'opacity', hidden: '0', keepsRoom: true },
  { property: 'display', hidden: 'none', keepsRoom: false },
  { property: 'content-visibility', hidden: 'hidden', keepsRoom: false },
]

function hiddenWhileResting(rules: readonly SheetRule[], node: FakeElement): Hiding | null {
  for (const one of HIDING_DECLARATIONS) {
    const declared = restingDeclaration(rules, node, one.property)
    if (declared === null) continue
    if (declared.value.trim().toLowerCase() === one.hidden) return one
  }
  return null
}

describe('表 T-051 HF-6 / FR-098 -- the task group controls are drawn only while a pointer is there', () => {
  it.each(T_109_ON_THE_TASK_GROUP)(
    '⭐ GIVEN $row is drawn WHEN the rules with NO pointer condition are read THEN one of them keeps it from being drawn, and it is not one that takes its room away (表 T-051 HF-6 MUST and MUST NOT, referred to by FR-098) -- $row',
    ({ row }) => {
      const built = drawn(oneLiveTaskGroup())
      const node = entryFor(built.root(), row)
      const rules = sheetRulesOf(built.root())
      const hiding = hiddenWhileResting(rules, node)

      expect(
        hiding,
        `${row} is drawn with no pointer condition on any rule: ${rules.map((one) => one.selector).join(' | ')}`,
      ).not.toBeNull()
      expect(
        (hiding as Hiding).keepsRoom,
        `${row} is kept from being drawn with ${(hiding as Hiding).property}, which takes its room away`,
      ).toBe(true)
    },
  )

  it.each(T_109_ON_THE_TASK_GROUP)(
    '⭐ GIVEN $row is drawn WHEN the sheet the unit put on the page is read THEN a rule keyed on the pointer draws it again, on the same property that hid it (表 T-051 HF-6 「乗っているあいだだけ」) -- $row',
    ({ row }) => {
      const built = drawn(oneLiveTaskGroup())
      const node = entryFor(built.root(), row)
      const rules = sheetRulesOf(built.root())
      const hiding = hiddenWhileResting(rules, node)
      expect(hiding, `${row} is never hidden, so there is nothing for a pointer to undo`).not.toBeNull()

      const pointed = hoverDeclaration(rules, node, (hiding as Hiding).property)

      // Why: hidden with nothing to bring it back is half a rule, and the missing half
      // would leave the controls never reachable.
      expect(
        pointed,
        `${row} has no rule keyed on a pointer: ${rules.map((one) => one.selector).join(' | ')}`,
      ).not.toBeNull()
      expect(
        (pointed as SheetDeclaration).value.trim().toLowerCase(),
        `${row} is left hidden while the pointer is there`,
      ).not.toBe((hiding as Hiding).hidden)
    },
  )

  it('⛔ GIVEN a rule that hides with display, one that never hides, and one written for somebody else WHEN each is read through the predicates above THEN none of them passes -- so the cases above are not greens that prove nothing (04-verification.md §2)', () => {
    const built = drawn(oneLiveTaskGroup())
    const node = entryFor(built.root(), 'IC-58')
    const base = '[data-unit="UF-71"] [data-role="Task Group Buttons"]'

    // Why: a sheet hiding the control by taking its box out is read as the wrong mechanism.
    const takesTheRoom = parseCss(`${base}{display:none;}${base}:hover{display:inline-block;}`)
    expect(hiddenWhileResting(takesTheRoom, node)?.keepsRoom).toBe(false)

    // Why: a sheet that never hides answers null, so the first case fails on a unit that
    // draws the controls always.
    const never = parseCss(`${base}:hover{visibility:visible;}`)
    expect(hiddenWhileResting(never, node)).toBeNull()

    // Why: a rule for another part reaches neither reading, so the readings cannot pass
    // on any rule of the sheet.
    const elsewhere = parseCss(
      '[data-role="Header Commands"] button{visibility:hidden;}' +
        '[data-role="Header Commands"] button:hover{visibility:visible;}',
    )
    expect(hiddenWhileResting(elsewhere, node)).toBeNull()
    expect(hoverDeclaration(elsewhere, node, 'visibility')).toBeNull()
  })

  it('GIVEN a PINNED task group WHEN its controls are read THEN the same pair of rules reaches them, THE PIN EXCEPTED (FR-098 draws the pinned task groups too)', () => {
    const built = drawn(
      viewWith({
        taskGroupPanel: {
          pinnedTitles: [
            taskGroupTitle({
              taskGroupId: 'g-pinned',
              isPinned: true,
              expander: { canOpen: true, canClose: true, canCloseBelow: false },
            }),
          ],
          titles: [],
        },
      }),
    )
    const rules = sheetRulesOf(built.root())

    // Why: IC-60 is left out: HF-6 draws a pinned task group's pin at rest, a case of
    // its own below; the loop still holds the MUST NOT for the rest.
    for (const one of T_109_ON_THE_TASK_GROUP.filter((held) => held.row !== 'IC-60')) {
      const node = entryFor(built.root(), one.row)
      const hiding = hiddenWhileResting(rules, node)
      expect(hiding, `${one.row} on a pinned task group is drawn with nothing pointing at it`).not.toBeNull()
      expect((hiding as Hiding).keepsRoom).toBe(true)
      expect(
        hoverDeclaration(rules, node, (hiding as Hiding).property),
        `${one.row} on a pinned task group has no rule keyed on a pointer`,
      ).not.toBeNull()
    }
  })

  it('⛔⛔ MUST GIVEN a PINNED task group WHEN its IC-60 is read THEN it is drawn with NO pointer on the task group (表 T-051 HF-6: ピン止めしているタスクグループの IC-60 だけは、ポインターが乗っていなくても描くこと)', () => {
    // Why: drawn at rest means no resting rule reaches the pin, or the control states the
    // property back inline, since an inline declaration outranks the sheet.
    const built = drawn(
      viewWith({
        taskGroupPanel: {
          pinnedTitles: [
            taskGroupTitle({
              taskGroupId: 'g-pinned',
              isPinned: true,
              expander: { canOpen: true, canClose: true, canCloseBelow: false },
            }),
          ],
          titles: [],
        },
      }),
    )
    const rules = sheetRulesOf(built.root())
    const pin = entryFor(built.root(), 'IC-60')
    const hiding = hiddenWhileResting(rules, pin)
    const declaredBack =
      hiding === null
        ? true
        : (styleMap(pin).get(hiding.property) ?? '').trim().toLowerCase() !== '' &&
          (styleMap(pin).get(hiding.property) ?? '').trim().toLowerCase() !== hiding.hidden

    expect(
      declaredBack,
      `a pinned task group's IC-60 is not drawn until a pointer arrives: the sheet hides it with ` +
        `${hiding?.property ?? '(nothing)'}:${hiding?.hidden ?? ''} and the control itself says ` +
        `${inlineStyle(pin)}`,
    ).toBe(true)
  })

  it('⛔ MUST NOT GIVEN an UNPINNED task group WHEN its IC-60 is read THEN it is hidden at rest like the others (HF-6: ほかの操作子を常時描いてはならない)', () => {
    // Why: the pair that makes the case above a test: unpinned, the pin is hidden like
    // the others.
    const built = drawn(oneLiveTaskGroup())
    const rules = sheetRulesOf(built.root())
    const pin = entryFor(built.root(), 'IC-60')
    const hiding = hiddenWhileResting(rules, pin)

    expect(hiding, 'an unpinned task group draws its pin at all times').not.toBeNull()
    expect(
      (styleMap(pin).get((hiding as Hiding).property) ?? '').trim(),
      `an unpinned task group's pin declares itself back into the picture: ${inlineStyle(pin)}`,
    ).toBe('')
  })

  it('GIVEN the specification is re-read WHEN HF-6 is looked up THEN the pin’s exception is still there, and still the only one (Chapter 1.9)', () => {
    const hf6 = (specTable('T-051').rows.find((one) => one.id === 'HF-6')?.cells ?? []).join(' ')

    expect(hf6).toContain(
      'タスクグループをピン止めしている間、`GRS` は、ピン止めしているタスクグループの `IC-60` を、ポインターが乗っていなくても描くこと（`HF-6` の唯一の例外）。',
    )
    expect(hf6).toContain('ポインターが乗っていなくても描くこと（`HF-6` の唯一の例外）')
    expect(hf6).toContain('`GRS` は、`IC-60` のほかのボタンを常時描かないこと。')
  })

  it('GIVEN nothing has been drawn yet WHEN the sheet is read THEN no rule of it draws these controls on its own (BO-1 of 表 T-077, the empty case)', () => {
    const built = wire()

    // Why: the sheet is put on the page once, before any task group; a resting rule that
    // brought a control back would undo HF-6 for every task group at once.
    for (const rule of sheetRulesOf(built.root())) {
      if (rule.selector.includes(':')) continue
      for (const one of HIDING_DECLARATIONS) {
        const declared = rule.declarations.get(one.property)
        if (declared === undefined) continue
        expect(
          declared.value.trim().toLowerCase(),
          `${rule.selector} declares ${one.property}:${declared.value} with no pointer condition`,
        ).toBe(one.hidden)
      }
    }
  })

  it('GIVEN the specification is re-read WHEN 表 T-051 HF-6 is looked up THEN it still asks for both rules (Chapter 1.9: the case is driven by the table)', () => {
    const hf6 = specTable('T-051').rows.find((one) => one.id === 'HF-6')
    expect(hf6, '表 T-051 no longer holds HF-6').toBeDefined()
    expect(hf6?.cells.join(' ')).toContain(T_051_HF6_ONLY_WHILE_POINTED)
    expect(hf6?.cells.join(' ')).toContain(T_051_HF6_ROOM_UNCHANGED)
    expect(hf6?.cells.join(' ')).toContain(T_051_HF6_THE_GROUP_STAYS)
    expect(specText('01-04-requirements.md')).toContain(T_051_HF6_ONLY_WHILE_POINTED)
  })
})

// Why: which CSS property carries the placement is not asserted; only the shapes
// HF-5 names, centered and level with the name's top.

const T_051_HF5_LEVEL_WITH_TOP = '名前がボタンより大きいとき、`GRS` は、ボタンを名前の上端に揃えること。'
const T_051_HF5_NOT_CENTERED = '名前がボタンより大きいとき、`GRS` は、ボタンを中央で揃えないこと。'
const T_051_HF5_NOT_SET_DOWN = '名前がボタンより大きいとき、`GRS` は、ボタンを上端から下げないこと。'

const CENTERING_PROPERTIES = [
  'align-items',
  'align-self',
  'align-content',
  'place-items',
  'place-self',
  'place-content',
  'vertical-align',
] as const

// Why: vertical-align middle counts as centering on the name's line; text-align does
// not, as it centers what is inside the box, the other axis.
function centeringOn(element: FakeElement): string[] {
  const declared = styleMap(element)
  const found: string[] = []
  for (const property of CENTERING_PROPERTIES) {
    const value = (declared.get(property) ?? '').trim().toLowerCase()
    if (value === '') continue
    if (value.includes('center') || (property === 'vertical-align' && value.includes('middle'))) {
      found.push(`${property}:${value}`)
    }
  }
  // Why: the fourth way to center a flex item names no word for it: auto margins on
  // both ends of the block axis.
  const top = insetOf(element, 'margin', 'top').trim().toLowerCase()
  const bottom = insetOf(element, 'margin', 'bottom').trim().toLowerCase()
  if (top === 'auto' && bottom === 'auto') found.push('margin-top:auto;margin-bottom:auto')
  return found
}

// Why: a zero is not a set-down but `auto` is, unlike in isZeroLength: one auto
// margin on the block axis pushes a flex item down its line.
function setDownOn(element: FakeElement): string[] {
  const pushesDown = (value: string): boolean => value !== '' && !/^0(?:[a-z%]+)?$/.test(value)
  const found: string[] = []
  for (const property of ['margin', 'padding'] as const) {
    const value = insetOf(element, property, 'top').trim().toLowerCase()
    if (pushesDown(value)) found.push(`${property}-top:${value}`)
  }
  const inset = (styleMap(element).get('top') ?? '').trim().toLowerCase()
  if (pushesDown(inset)) found.push(`top:${inset}`)
  return found
}

const taskGroupWithControls = (): ScreenView =>
  viewWith({
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

describe('表 T-051 HF-5 / FR-098 -- the controls are level with the top of the name, never centered and never set down', () => {
  it('GIVEN the specification is re-read WHEN 表 T-051 HF-5 is looked up THEN it asks for the top edge and forbids both the center and the set-down in as many words (Chapter 1.9: the case is driven by the table)', () => {
    const hf5 = specTable('T-051').rows.find((one) => one.id === 'HF-5')
    expect(hf5, '表 T-051 no longer holds HF-5').toBeDefined()
    expect(hf5?.cells.join(' ')).toContain(T_051_HF5_LEVEL_WITH_TOP)
    expect(hf5?.cells.join(' ')).toContain(T_051_HF5_NOT_CENTERED)
    expect(hf5?.cells.join(' ')).toContain(T_051_HF5_NOT_SET_DOWN)
    // Why: no amount may be held anywhere: were S-139 to come back, the cases below
    // would assert the absence of something the spec asks for.
    expect(hf5?.cells.join(' ')).not.toContain('S-139')
    expect(specTable('T-206').rows.find((one) => one.id === 'S-139')).toBeUndefined()
    expect(specText('01-04-requirements.md')).toContain(T_051_HF5_NOT_CENTERED)
    expect(specText('01-04-requirements.md')).toContain(FR_098_SAME_AS_THE_EXPANDER)
  })

  it.each(T_109_ON_THE_TASK_GROUP)(
    '⛔ GIVEN $row is drawn WHEN the control and the line it sits in are read THEN neither centers it (表 T-051 HF-5 MUST NOT: 中央で揃えてはならない) -- $row',
    ({ row }) => {
      const built = drawn(taskGroupWithControls())
      const control = entryFor(built.root(), row)
      const line = control.parentNode

      expect(line, `${row} is not inside anything`).not.toBeNull()
      expect(
        centeringOn(control),
        `${row} centers itself on the line it sits in: ${inlineStyle(control)}`,
      ).toEqual([])
      expect(
        centeringOn(line as FakeElement),
        `the task group centers its controls: ${inlineStyle(line as FakeElement)}`,
      ).toEqual([])
    },
  )

  it.each(T_109_ON_THE_TASK_GROUP)(
    '⛔ GIVEN $row is drawn WHEN the drawn control is read THEN it carries no top offset at all (表 T-051 HF-5 MUST NOT: 上端から下げてはならない) -- $row',
    ({ row }) => {
      const built = drawn(taskGroupWithControls())
      const control = entryFor(built.root(), row)

      expect(
        setDownOn(control),
        `${row} is set down from the top of the name: ${inlineStyle(control)}`,
      ).toEqual([])
    },
  )

  it.each(T_109_ON_THE_TASK_GROUP)(
    '⭐ GIVEN $row is drawn WHEN the line it sits in is read THEN that line starts its items at its top (表 T-051 HF-5 MUST: 名前の上端に揃えること) -- $row',
    ({ row }) => {
      // Why: forbidding center and set-down still leaves no alignment at all open, so this
      // reads where the line box starts its items, against the name's top edge.
      const built = drawn(taskGroupWithControls())
      const line = entryFor(built.root(), row).parentNode as FakeElement

      expect(line, `${row} is not inside anything`).not.toBeNull()
      expect(
        (styleMap(line).get('align-items') ?? '').trim().toLowerCase(),
        `the task group does not start its controls at its top: ${inlineStyle(line)}`,
      ).toBe('flex-start')
    },
  )

  it('⛔ GIVEN a control declared `align-self:center`, one declared `vertical-align:middle`, one with auto margins on both ends and one set down by 7px WHEN each is read through the predicates above THEN all four are caught -- so the cases above are not greens that prove nothing (04-verification.md §2)', () => {
    const built = drawn(taskGroupWithControls())

    // Why: built by hand, not drawn: a predicate that could not name a centered or set-down
    // control would pass every case above whatever the unit did.
    const make = (css: string): FakeElement => {
      const node = new FakeElement('button', built.world)
      node.setAttribute('style', css)
      return node
    }

    expect(centeringOn(make('align-self:center'))).toEqual(['align-self:center'])
    expect(centeringOn(make('vertical-align:middle'))).toEqual(['vertical-align:middle'])
    expect(centeringOn(make('align-items:center'))).toEqual(['align-items:center'])
    expect(centeringOn(make('margin:auto 0'))).toEqual(['margin-top:auto;margin-bottom:auto'])
    expect(setDownOn(make('margin-top:7px'))).toEqual(['margin-top:7px'])
    expect(setDownOn(make('padding:7px 0 0 0'))).toEqual(['padding-top:7px'])
    expect(setDownOn(make('position:relative;top:0.5em'))).toEqual(['top:0.5em'])
    // Why: what HF-5 allows must not be caught, or the cases above would be unpassable.
    expect(centeringOn(make('align-self:flex-start'))).toEqual([])
    expect(centeringOn(make('text-align:center'))).toEqual([])
    expect(setDownOn(make('padding:0 0.125em'))).toEqual([])
    expect(setDownOn(make('margin-top:0'))).toEqual([])
  })

  it('GIVEN a PINNED task group WHEN its controls are read THEN the same three rules hold there (FR-098 draws the pinned task groups too) -- IC-58 / IC-59 / IC-77 / IC-60 / IC-82', () => {
    const built = drawn(
      viewWith({
        taskGroupPanel: {
          pinnedTitles: [
            taskGroupTitle({
              taskGroupId: 'g-pinned',
              isPinned: true,
              expander: { canOpen: true, canClose: true, canCloseBelow: false },
            }),
          ],
          titles: [],
        },
      }),
    )

    for (const one of T_109_ON_THE_TASK_GROUP) {
      const control = entryFor(built.root(), one.row)
      const line = control.parentNode as FakeElement
      expect(centeringOn(control), `${one.row} on a pinned task group centers itself`).toEqual([])
      expect(
        setDownOn(control),
        `${one.row} on a pinned task group is set down: ${inlineStyle(control)}`,
      ).toEqual([])
      expect(
        (styleMap(line).get('align-items') ?? '').trim().toLowerCase(),
        `the pinned task group does not start ${one.row} at its top`,
      ).toBe('flex-start')
    }
  })
})

// Why: the strip is found by what GR-20 says it is, S-138 wide on the left edge, not
// by an attribute; entries are excluded first, since an entry box is S-138 too.

const S_138_STRIP_WIDTH = (() => {
  const row = specTable('T-206').rows.find((one) => one.id === 'S-138')
  if (row === undefined) throw new Error('表 T-206 no longer holds S-138')
  const found = /\d+(?:\.\d+)?/.exec(row.by['既定'] ?? '')
  if (found === null) throw new Error('S-138 states no number in its 既定 column')
  return Number(found[0])
})()

// Summary: The width this node fixes for itself in px, from `width`, `min-width` or `flex-basis`, or null.
function fixedWidthPx(element: FakeElement): number | null {
  const declared = styleMap(element)
  const candidates = [
    declared.get('width'),
    declared.get('min-width'),
    flexBasisOf(element),
    declared.get('flex-basis'),
  ]
  for (const one of candidates) {
    const found = /^(\d+(?:\.\d+)?)px$/i.exec((one ?? '').trim())
    if (found !== null) return Number(found[1])
  }
  return null
}

const stripsOf = (row: FakeElement): FakeElement[] =>
  row.children.filter(
    (one) => !one.hasAttribute('data-icon') && fixedWidthPx(one) === S_138_STRIP_WIDTH,
  )

const PANEL_WITH_A_PIN = (): ScreenView =>
  viewWith({
    taskGroupPanel: {
      pinnedTitles: [
        taskGroupTitle({
          taskGroupId: 'g-pinned',
          isPinned: true,
          expander: { canOpen: true, canClose: true, canCloseBelow: false },
        }),
      ],
      titles: [
        taskGroupTitle({
          taskGroupId: 'g-free',
          expander: { canOpen: true, canClose: true, canCloseBelow: false },
        }),
      ],
    },
  })

const taskGroupWithId = (built: Stage, taskGroupId: string): FakeElement => {
  const found = rowsOf(built).find((one) => one.getAttribute('data-group-id') === taskGroupId)
  if (found === undefined) throw new Error(`the panel drew no task group ${taskGroupId}`)
  return found
}

describe('GR-20 of 表 T-023d -- タスクグループの左端に敷く掴み代（幅は S-138）', () => {
  it.each(DEPTHS)(
    '⭐ GIVEN an ordinary task group at depth %i WHEN it is read THEN it carries ONE strip of S-138 and that strip is the FIRST thing in the task group (GR-20 「タスクグループの左端に敷く掴み代」)',
    (depth) => {
      const built = drawn(taskGroupNamed('TaskGroupOne', depth))
      const row = theTaskGroupOf(built)
      const strips = stripsOf(row)

      expect(
        strips.length,
        `GR-20's strip is not on the task group, or there is more than one of it: ${serialize(row)}`,
      ).toBe(1)
      // Why: the depth cases are here because FR-085 indents a deep task group, and an
      // indent pushing the strip in would move the grab on every task group.
      expect(
        row.children.indexOf(strips[0] as FakeElement),
        `the strip does not lie along the task group's left edge: ${serialize(row)}`,
      ).toBe(0)
    },
  )

  it('⭐ GIVEN a task group drawn at depth 1 and the same task group at the deepest S-125 allows WHEN the two strips are compared THEN not one declaration differs (GR-20 gives the strip one width and no other)', () => {
    const shallow = drawn(taskGroupNamed('TaskGroupOne', 1))
    const deep = drawn(taskGroupNamed('TaskGroupOne', DEPTHS[DEPTHS.length - 1] ?? 1))

    const one = stripsOf(theTaskGroupOf(shallow))[0]
    const other = stripsOf(theTaskGroupOf(deep))[0]
    expect(one, 'the shallow task group has no strip').toBeDefined()
    expect(other, 'the deep task group has no strip').toBeDefined()
    expect(
      differingProperties(one as FakeElement, other as FakeElement),
      'the depth reached the grab strip',
    ).toEqual([])
  })

  it('⛔ MUST NOT GIVEN a PINNED task group WHEN it is read THEN it carries NO strip at all (GR-20: ピン止めしているタスクグループは掴めないこと)', () => {
    const built = drawn(PANEL_WITH_A_PIN())

    expect(
      stripsOf(taskGroupWithId(built, 'g-free')).length,
      'the premise fails: the ordinary task group beside the pinned one has no strip either',
    ).toBe(1)
    expect(
      stripsOf(taskGroupWithId(built, 'g-pinned')).length,
      `a pinned task group was given a grab strip: ${serialize(taskGroupWithId(built, 'g-pinned'))}`,
    ).toBe(0)
  })

  it('GIVEN the specification is re-read WHEN GR-20 is looked up THEN it still lays the strip on the left edge at S-138 and still refuses a pinned task group (Chapter 1.9)', () => {
    const gr20 = specTable('T-023d').rows.find((one) => one.id === 'GR-20')
    expect(gr20, '表 T-023d no longer holds GR-20').toBeDefined()
    const says = (gr20?.cells ?? []).join(' ')
    expect(says).toContain('タスクグループの左端に敷く掴み代')
    expect(says).toContain('`S-138`')
    expect(says).toContain('`GRS` は、ピン止めしているタスクグループの掴みを成立させないこと。')
    expect(says).toContain('掴み代を掴んだとき、`GRS` はタスクグループを動かすこと')
    expect(S_138_STRIP_WIDTH, 'S-138 no longer states a width').toBeGreaterThan(0)
  })
})

// Why: ranked by the declared inset, not child order: an out-of-flow control sits
// where its inset puts it; document order is used only when no control has one.

function lengthOf(value: string | undefined): { readonly n: number; readonly unit: string } | null {
  const found = /^(-?\d+(?:\.\d+)?)(px|em|rem)$/.exec((value ?? '').trim())
  return found === null ? null : { n: Number(found[1]), unit: found[2] as string }
}

const iconOf = (node: FakeElement): string => node.getAttribute('data-icon') ?? '(unmarked)'

function leftToRight(nodes: readonly FakeElement[]): string[] {
  return leftToRightBy(nodes, iconOf)
}

// Why: names each node as the caller wants, so a run carrying HF-1's lattice can
// name that box by the lattice, not by an entry it does not hold.
function leftToRightBy(
  nodes: readonly FakeElement[],
  nameOf: (node: FakeElement) => string,
): string[] {
  const how = new Set<string>()
  const ranked = nodes.map((node, index) => {
    const declared = styleMap(node)
    const left = lengthOf(declared.get('left'))
    const right = lengthOf(declared.get('right'))
    if (left !== null) {
      how.add(`left:${left.unit}`)
      return { icon: nameOf(node), key: left.n, index }
    }
    if (right !== null) {
      how.add(`right:${right.unit}`)
      return { icon: nameOf(node), key: -right.n, index }
    }
    how.add('in flow')
    return { icon: nameOf(node), key: 0, index }
  })
  if (how.size > 1) {
    throw new Error(
      `these controls are placed in ${how.size} different ways (${[...how].join(', ')}), ` +
        'so no reading of them says which stands to the left of which',
    )
  }
  return ranked
    .slice()
    .sort((a, b) => a.key - b.key || a.index - b.index)
    .map((one) => one.icon)
}

const HF1_LEFT_TO_RIGHT = T_051_HF1_LATTICE.map((one) => entranceForRule(one.rule))

// Why: IC-82 and IC-60 are typed because HF-4 names them itself; the premise case
// below holds them to it.
const HF4_LEFT_TO_RIGHT = [...HF1_LEFT_TO_RIGHT, 'IC-82', entranceForRule('HF-14'), 'IC-60']

// Spec: HF-20
const HF20_HEAD_DELETE = T_109.rows.find(
  (one) => namesHeadRule(one) && /(^|[^0-9A-Za-z-])HF-20([^0-9-]|$)/.test(one.by['何の入口か'] ?? ''),
)?.id

const HF10_LEFT_TO_RIGHT = [
  entranceForRule('HF-12'),
  entranceForRule('HF-16'),
  entranceForRule('HF-10'),
  entranceForRule('HF-17'),
  HF20_HEAD_DELETE ?? '(table T-109 names no head entrance for HF-20)',
]

const nodesFor = (built: Stage, rows: readonly string[]): FakeElement[] =>
  selfAndDescendants(built.root()).filter((one) => rows.includes(iconOf(one)))

// Why: reads whichever placement the unit declared, grid lines or an inset per axis,
// and refuses a mixed run; no gap is asserted, since no spec row states one.

function gridLineOf(value: string | undefined): number | null {
  const found = /^(-?\d+)\s*(?:\/|$)/.exec((value ?? '').trim())
  return found === null ? null : Number(found[1])
}

// Summary: Where one control stands, as a rightward key and a downward key with the reading that produced them.
function placeOf(node: FakeElement): {
  readonly x: number
  readonly y: number
  readonly how: string
} {
  const declared = styleMap(node)
  const column = gridLineOf(declared.get('grid-column'))
  const rank = gridLineOf(declared.get('grid-row'))
  if (column !== null && rank !== null) return { x: column, y: rank, how: 'grid line' }

  const left = lengthOf(declared.get('left'))
  const right = lengthOf(declared.get('right'))
  const top = lengthOf(declared.get('top'))
  const bottom = lengthOf(declared.get('bottom'))
  const x = left !== null ? left.n : right !== null ? -right.n : null
  const y = top !== null ? top.n : bottom !== null ? -bottom.n : null
  if (x !== null && y !== null) {
    return {
      x,
      y,
      how: `inset ${left !== null ? 'left' : 'right'}/${top !== null ? 'top' : 'bottom'}`,
    }
  }
  throw new Error(
    `this control states no place on two axes, so no reading of it says where it stands ` +
      `in HF-1's lattice: ${inlineStyle(node)}`,
  )
}

const axisOf = (keys: readonly number[]): number[] => [...new Set(keys)].sort((a, b) => a - b)

// Summary: The lattice as `[column][rank]` of T-109 rows, columns left to right and ranks top to bottom.
function latticeOf(nodes: readonly FakeElement[]): string[][] {
  const placed = nodes.map((node) => ({ icon: iconOf(node), ...placeOf(node) }))
  const how = new Set(placed.map((one) => one.how))
  if (how.size > 1) {
    throw new Error(
      `these controls are placed in ${how.size} different ways (${[...how].join(', ')}), ` +
        'so no reading of them says where each stands in the lattice',
    )
  }

  const columns = axisOf(placed.map((one) => one.x))
  const ranks = axisOf(placed.map((one) => one.y))
  return columns.map((column) =>
    ranks.map((rank) => {
      const here = placed.filter((one) => one.x === column && one.y === rank)
      if (here.length !== 1) {
        throw new Error(
          `${here.length} controls stand at column ${column} rank ${rank} of the lattice, not one`,
        )
      }
      return (here[0] as { readonly icon: string }).icon
    }),
  )
}

const HF1_LATTICE = 'HF-1 の格子'

const HF4_PAIR = 'HF-4 の縦の対'

const HF4_PAIR_TOP_TO_BOTTOM = ['IC-82', entranceForRule('HF-14')]

// Why: each child is named by what it brings; a child mixing the folding controls
// with another entry leaves the run unreadable and is refused, not guessed at.
function runOf(row: FakeElement): string[] {
  const nameOf = (host: FakeElement): string => {
    const icons = selfAndDescendants(host)
      .filter((one) => one.hasAttribute('data-icon'))
      .map(iconOf)
    const folding = icons.filter((one) => HF1_LEFT_TO_RIGHT.includes(one))
    const pair = icons.filter((one) => HF4_PAIR_TOP_TO_BOTTOM.includes(one))
    if (pair.length === icons.length && icons.length > 0) return HF4_PAIR
    if (folding.length === 0) {
      if (icons.length !== 1) {
        throw new Error(`one box of the task group's run brings ${icons.length} entries: ${icons.join(' ')}`)
      }
      return icons[0] as string
    }
    if (folding.length !== icons.length) {
      throw new Error(
        `one box of the task group's run mixes HF-1's lattice with other entries: ${icons.join(' ')}`,
      )
    }
    return HF1_LATTICE
  }

  const read = leftToRightBy(controlHostsOf(row), nameOf)
  // Why: consecutive boxes of one name read as one member, so a unit hanging the controls
  // on the task group still reads; non-consecutive ones stay apart and fail.
  return read.filter(
    (one, index) => (one !== HF1_LATTICE && one !== HF4_PAIR) || read[index - 1] !== one,
  )
}

// Why: three members, not seven: HF-4's sentence counts the lattice as one and the
// pair as one more; HF4_LEFT_TO_RIGHT holds the seven entries.
const HF4_RUN = [HF1_LATTICE, HF4_PAIR, 'IC-60']


describe('表 T-051 HF-1 (MUST) -- the four folding controls, left to right in a 2 x 2 lattice', () => {
  it('GIVEN the specification is re-read WHEN HF-1 is looked up THEN it still names four controls, still calls the arrangement a lattice, and still orders them (Chapter 1.9)', () => {
    const hf1 = specTable('T-051').rows.find((one) => one.id === 'HF-1')
    expect(hf1, '表 T-051 no longer holds HF-1').toBeDefined()
    const says = (hf1?.cells ?? []).join(' ')

    expect(says).toContain(T_051_HF1_FOUR_CONTROLS)
    expect(says).toContain(T_051_HF1_IS_A_LATTICE)
    expect(says).toContain(T_051_HF1_LEFT_TO_RIGHT)
    expect(says).toContain('`GRS` は、1 本と 2 本を混ぜて並べないこと。')

    // Why: each word is looked for after the one before, so a re-ordered lattice fails
    // here instead of leaving the case below asserting the old order.
    let at = says.indexOf(T_051_HF1_LEFT_TO_RIGHT)
    expect(at, 'HF-1 no longer states the left-to-right order').toBeGreaterThanOrEqual(0)
    for (const one of T_051_HF1_LATTICE) {
      const next = says.indexOf(one.word, at)
      expect(next, `HF-1 no longer names 「${one.word}」 where this file expects it`).toBeGreaterThan(
        -1,
      )
      at = next + one.word.length
    }
    expect(new Set(HF1_LEFT_TO_RIGHT).size).toBe(4)
  })

  it('⭐ GIVEN a task group is drawn WHEN its four folding controls are read as a lattice THEN the left column then the right gives HF-1’s order (MUST: 左から 隠す・1 階層展開する・配下をすべて折りたたむ・配下をすべて展開する)', () => {
    // Why: read down each column, not along each rank: the sentence reads action top to
    // bottom and range left to right, so the left column's pair comes first (RC-13).
    const built = drawn(oneLiveTaskGroup())
    const lattice = latticeOf(nodesFor(built, HF1_LEFT_TO_RIGHT))

    expect(lattice.length, `HF-1's four do not stand in two columns: ${lattice.join(' | ')}`).toBe(2)
    for (const column of lattice) {
      expect(column.length, `a column of the lattice is not two deep: ${column.join(' ')}`).toBe(2)
    }
    expect(lattice.flat()).toEqual(HF1_LEFT_TO_RIGHT)
  })

  it('⛔ MUST NOT GIVEN a task group is drawn WHEN the lattice is read THEN the single bars share one column and the double bars the other (HF-1: 1 本と 2 本を混ぜて並べてはならない)', () => {
    // Why: the single bars (RC-13) share one column and the double bars the other; a
    // column holding one of each, or a single line, breaks the lattice.
    const built = drawn(oneLiveTaskGroup())
    const lattice = latticeOf(nodesFor(built, HF1_LEFT_TO_RIGHT))

    const singles = [entranceForRule('HF-3'), entranceForRule('HF-13')]
    const doubles = [entranceForRule('HF-11'), entranceForRule('HF-2')]
    for (const [what, pair] of [
      ['the single bars', singles],
      ['the double bars', doubles],
    ] as const) {
      const columns = lattice.filter((column) => pair.some((row) => column.includes(row)))
      expect(columns.length, `${what} are not both on the task group: ${lattice.join(' | ')}`).toBe(1)
      expect(
        [...(columns[0] as string[])].sort(),
        `${what} do not have a column to themselves: ${lattice.join(' | ')}`,
      ).toEqual([...pair].sort())
    }
    expect(lattice.length, `HF-1's four stand in one line: ${lattice.join(' | ')}`).toBe(2)
  })

  it('⛔ GIVEN a run built by hand in the WRONG order WHEN it is read through `leftToRight` THEN the reading catches it -- so the cases above are not greens that prove nothing (04-verification.md §2)', () => {
    const built = drawn(oneLiveTaskGroup())
    const make = (icon: string, css: string): FakeElement => {
      const node = new FakeElement('button', built.world)
      node.setAttribute('data-icon', icon)
      node.setAttribute('style', css)
      return node
    }

    // Why: right-anchored, so the larger inset is further left.
    expect(leftToRight([make('IC-58', 'right:0em'), make('IC-59', 'right:4em')])).toEqual([
      'IC-59',
      'IC-58',
    ])
    // Why: left-anchored, so the smaller inset is further left.
    expect(leftToRight([make('IC-58', 'left:4em'), make('IC-59', 'left:0em')])).toEqual([
      'IC-59',
      'IC-58',
    ])
    // Why: in flow, document order is the order handed in.
    expect(leftToRight([make('IC-58', ''), make('IC-59', '')])).toEqual(['IC-58', 'IC-59'])
    expect(() => leftToRight([make('IC-58', 'left:0em'), make('IC-59', 'right:0em')])).toThrow()
  })

  it('⛔ GIVEN a lattice built by hand in the WRONG order WHEN it is read through `latticeOf` THEN the reading catches it -- so the cases above are not greens that prove nothing (04-verification.md §2)', () => {
    const built = drawn(oneLiveTaskGroup())
    const make = (icon: string, css: string): FakeElement => {
      const node = new FakeElement('button', built.world)
      node.setAttribute('data-icon', icon)
      node.setAttribute('style', css)
      return node
    }

    // Why: on grid lines the smaller column is further left and the smaller rank higher.
    expect(
      latticeOf([
        make('IC-58', 'grid-column:2;grid-row:2'),
        make('IC-59', 'grid-column:1;grid-row:1'),
        make('IC-77', 'grid-column:2;grid-row:1'),
        make('IC-90', 'grid-column:1;grid-row:2'),
      ]),
    ).toEqual([
      ['IC-59', 'IC-90'],
      ['IC-77', 'IC-58'],
    ])
    // Why: as insets, right counts backwards and top forwards.
    expect(
      latticeOf([
        make('IC-58', 'right:0em;top:1em'),
        make('IC-59', 'right:2em;top:0em'),
        make('IC-77', 'right:0em;top:0em'),
        make('IC-90', 'right:2em;top:1em'),
      ]),
    ).toEqual([
      ['IC-59', 'IC-90'],
      ['IC-77', 'IC-58'],
    ])
    expect(() =>
      latticeOf([make('IC-58', 'grid-column:1;grid-row:1'), make('IC-59', 'left:0em;top:0em')]),
    ).toThrow()
    expect(() => latticeOf([make('IC-58', 'right:0em')])).toThrow()
    expect(() =>
      latticeOf([make('IC-58', 'grid-column:1;grid-row:1'), make('IC-59', 'grid-column:1;grid-row:1')]),
    ).toThrow()
  })
})

describe('表 T-051 HF-4 (MUST) -- the whole run of a task group, left to right', () => {
  it('GIVEN the specification is re-read WHEN HF-4 is looked up THEN it still states the run, still names IC-82 and IC-60, and still forbids anything between 足す and 消す (Chapter 1.9)', () => {
    const hf4 = specTable('T-051').rows.find((one) => one.id === 'HF-4')
    const says = (hf4?.cells ?? []).join(' ')

    expect(says).toContain(T_051_HF4_THE_WHOLE_RUN)
    expect(says).toContain('`GRS` は、足すと消すのあいだに他のボタンを挟まないこと')
    expect(says).toContain(
      '`GRS` は、`Pin Button`（表 T-109 の `IC-60`）を、並びのいちばん外（右端）に置くこと。',
    )
    expect(says).toContain(T_051_HF4_DELETE_ABOVE_ADD)
    expect(says).toContain('縦に隣り合うので、この禁止は縦に読む')

    expect([...HF4_LEFT_TO_RIGHT].sort()).toEqual([...T_109_ON_THE_TASK_GROUP.map((one) => one.row)].sort())
  })

  it('⭐ GIVEN a task group is drawn WHEN its run is read from the left THEN the lattice, the 縦の対 and ピン止め stand in HF-4’s order (MUST: 折りたたみの 4 つ（HF-1 の格子）、消すと足すの縦の対、ピン止めの順に、左から右へ)', () => {
    // Why: the run has three members, not seven, as the sentence counts the lattice and
    // the pair as one each; where each stands within its box has its own cases.
    const built = drawn(oneLiveTaskGroup())

    expect(runOf(theTaskGroupOf(built))).toEqual(HF4_RUN)
  })

  it.each(DEPTHS)(
    '⛔ MUST NOT GIVEN the same task group at depth %i WHEN its run is read THEN the arrangement and the number are the ones every other depth got (HF-15: 段の深さによって、操作子の並び・員数・振る舞いを変えてはならない)',
    (depth) => {
      // Why: HF-15 bars the run and the count changing with depth; what a press does is
      // not this unit's to answer.
      const row = theTaskGroupOf(drawn(taskGroupNamed('TaskGroupOne', depth)))

      expect(runOf(row), `depth ${depth} was given a different run`).toEqual(HF4_RUN)
      expect(
        [...controlsOf(row).map(iconOf)].sort(),
        `depth ${depth} was given a different number of controls`,
      ).toEqual([...T_109_ON_THE_TASK_GROUP.map((one) => one.row)].sort())
      expect(
        latticeOf(controlsOf(row).filter((one) => HF1_LEFT_TO_RIGHT.includes(iconOf(one)))).flat(),
        `depth ${depth} was given a different lattice`,
      ).toEqual(HF1_LEFT_TO_RIGHT)
    },
  )

  it('⭐ GIVEN a PINNED task group WHEN its controls are read from the left THEN the same run stands there (FR-098 draws the pinned task groups too)', () => {
    const built = drawn(
      viewWith({
        taskGroupPanel: {
          pinnedTitles: [
            taskGroupTitle({
              taskGroupId: 'g-pinned',
              isPinned: true,
              expander: { canOpen: true, canClose: true, canCloseBelow: false },
            }),
          ],
          titles: [],
        },
      }),
    )

    expect(runOf(theTaskGroupOf(built))).toEqual(HF4_RUN)
  })

  it('⭐ MUST GIVEN a task group is drawn WHEN the outermost control is read THEN it is the pin, and the deletion’s column is the one step inside it (HF-4: ピン止めを並びのいちばん外へ)', () => {
    // Why: one step in from the pin is the pair, deletion on its upper rank, so a pointer
    // poured in from the right still meets the pin first.
    const row = theTaskGroupOf(drawn(oneLiveTaskGroup()))
    const run = runOf(row)

    expect(run[run.length - 1], `the outermost control is not the pin: ${run.join(' ')}`).toBe(
      'IC-60',
    )
    expect(run[run.length - 2], `the pair is not one step in: ${run.join(' ')}`).toBe(HF4_PAIR)
    expect(
      controlsOf(row).map(iconOf),
      'the deletion is not on the task group at all',
    ).toContain('IC-82')
  })

  it('⛔ MUST NOT GIVEN a task group is drawn WHEN 消す and 足す are found THEN they stand in ONE column with 消す above 足す and nothing between them (HF-4: 消すを上、足すを下 / いまは縦に隣り合う)', () => {
    // Why: read as a lattice, not left to right: the pair is one column of two ranks,
    // delete first.
    const row = theTaskGroupOf(drawn(oneLiveTaskGroup()))
    const pair = controlsOf(row).filter((one) => HF4_PAIR_TOP_TO_BOTTOM.includes(iconOf(one)))

    expect(pair.length, `消す and 足す are not both on the task group: ${serialize(row)}`).toBe(2)
    expect(latticeOf(pair), 'the pair is not one column of two, 消す above 足す').toEqual([
      HF4_PAIR_TOP_TO_BOTTOM,
    ])
  })

  it('⛔ MUST NOT GIVEN a task group is drawn WHEN the boxes that carry its run are read THEN not one of them draws a line or a frame around what it holds (HF-1: 格子を線や枠で囲んではならない)', () => {
    const row = theTaskGroupOf(drawn(oneLiveTaskGroup()))

    // Why: what is refused is a line that paints: `border:none` takes the host's own
    // button frame away, the same rule read the other way.
    const paintsNothing = /^(none|0|0px|initial|unset|revert)$/i
    for (const host of controlHostsOf(row)) {
      const declared = styleMap(host)
      for (const [property, value] of declared) {
        if (!/^(border|outline|box-shadow)/.test(property)) continue
        expect(
          paintsNothing.test(value.trim()) ? '' : `${property}:${value}`,
          `a box of the task group's run draws a line: ${inlineStyle(host)}`,
        ).toBe('')
      }
    }
  })
})

describe('表 T-051 HF-10 (MUST) -- the run at the panel’s head, left to right', () => {
  it('GIVEN the specification is re-read WHEN HF-10 is looked up THEN it still states the head run and still refuses the outermost place to すべて展開する (Chapter 1.9)', () => {
    const hf10 = (specTable('T-051').rows.find((one) => one.id === 'HF-10')?.cells ?? []).join(' ')

    expect(hf10).toContain(T_051_HF10_THE_HEAD_RUN)
    expect(hf10).toContain('`GRS` は、`HF-10` の「配下を展開」を並びのいちばん外へ置かないこと。')

    expect(hf10, 'HF-10 names the reason the head is not two tiers').toContain(T_051_HF10_NOT_TWO_TIERS)
    const hf20 = (specTable('T-051').rows.find((one) => one.id === 'HF-20')?.cells ?? []).join(' ')
    expect(hf20, 'HF-20 places its entrance last in HF-10’s run').toContain(T_051_HF20_LAST_IN_THE_RUN)

    expect(HF20_HEAD_DELETE, 'table T-109 gives HF-20 an entrance at the head').toBeDefined()
    expect([...HF10_LEFT_TO_RIGHT].sort()).toEqual(
      [...T_109_AT_THE_HEAD.map((one) => one.row)].sort(),
    )
    for (const row of HF10_LEFT_TO_RIGHT) {
      expect(
        T_109_ON_THE_TASK_GROUP.map((one) => one.row),
        `${row} is on a task group as well`,
      ).not.toContain(row)
    }
  })

  it('⭐ GIVEN the panel is drawn WHEN the head’s controls are read from the left THEN they stand in HF-10’s order (MUST: すべて折りたたむ・1 階層展開する・すべて展開する・足す・すべて消す)', () => {
    const built = drawn(oneLiveTaskGroup())

    expect(leftToRight(nodesFor(built, HF10_LEFT_TO_RIGHT)), T_051_HF10_THE_HEAD_RUN).toEqual(HF10_LEFT_TO_RIGHT)
  })

  it('⭐ GIVEN the panel is drawn WHEN the head’s five controls are read THEN they share one top, with no second tier (HF-10: 1 行に並べること)', () => {
    for (const view of [oneLiveTaskGroup(), viewWith({ taskGroupPanel: { pinnedTitles: [], titles: [] } })]) {
      const head = nodesFor(drawn(view), HF10_LEFT_TO_RIGHT)
      expect(head.map(iconOf).sort(), `premise: ${T_051_HF10_THE_HEAD_RUN}`).toEqual([...HF10_LEFT_TO_RIGHT].sort())
      expect(new Set(head.map((one) => one.parentNode)).size, `premise, one box holds the run: ${T_051_HF10_THE_HEAD_RUN}`).toBe(1)
      const tops = head.map((one) => `${iconOf(one)} top:${styleMap(one).get('top') ?? '(none)'} bottom:${styleMap(one).get('bottom') ?? '(none)'}`)
      expect(
        new Set(tops.map((one) => one.slice(one.indexOf(' ') + 1))).size,
        `${T_051_HF10_THE_HEAD_RUN} / ${T_051_HF10_NOT_TWO_TIERS} -- ${tops.join(', ')}`,
      ).toBe(1)
    }
  })

  it('⭐ GIVEN a panel of TWO task groups WHEN the head’s controls are counted THEN each is drawn ONCE for the whole panel, not once per task group (HF-10 / HF-12 / HF-16 / HF-17 / HF-20: 1 つ置くこと)', () => {
    const built = drawn(
      viewWith({
        taskGroupPanel: {
          pinnedTitles: [
            taskGroupTitle({
              taskGroupId: 'g-pinned',
              isPinned: true,
              expander: { canOpen: true, canClose: true, canCloseBelow: false },
            }),
          ],
          titles: [
            taskGroupTitle({
              taskGroupId: 'g-1',
              expander: { canOpen: true, canClose: true, canCloseBelow: false },
            }),
          ],
        },
      }),
    )

    for (const one of T_109_AT_THE_HEAD) {
      expect(
        nodesFor(built, [one.row]).length,
        `${one.row} was drawn more than once for the panel`,
      ).toBe(1)
    }
    // Why: the pair that makes the count a test: a task group control is drawn twice here.
    expect(nodesFor(built, [entranceForRule('HF-3')]).length).toBe(2)
  })

  it('⭐⭐ GIVEN a panel with NO task groups at all WHEN the head is read THEN all five are still drawn (HF-17: タスクグループが 1 つも無い文書では押す相手が存在しない)', () => {
    // Why: a head drawn only beside a task group would leave an empty document no way
    // to gain one, which HF-17's reason forbids.
    const built = drawn(viewWith({ taskGroupPanel: { pinnedTitles: [], titles: [] } }))

    expect(rowsOf(built)).toEqual([])
    for (const one of T_109_AT_THE_HEAD) {
      expect(nodesFor(built, [one.row]).length, `${one.row} left with the last task group`).toBe(1)
    }
    expect(leftToRight(nodesFor(built, HF10_LEFT_TO_RIGHT))).toEqual(HF10_LEFT_TO_RIGHT)
  })
})

const themeColorsOf = (row: string): readonly string[] => {
  const found = specTable('T-236').rows.find((one) => one.id === row)
  if (found === undefined) throw new Error(`表 T-236 no longer holds ${row}`)
  return ['明るいテーマ', '暗いテーマ'].map((column) => bare(found.by[column] ?? ''))
}

const taskGroupHeldOn = (isHeld: boolean): ScreenView =>
  viewWith({
    taskGroupPanel: {
      pinnedTitles: [],
      titles: [
        taskGroupTitle({
          taskGroupId: 'g-1',
          label: 'TaskGroupOne',
          isHeld,
          expander: { canOpen: true, canClose: true, canCloseBelow: false },
        }),
      ],
    },
  })

describe('表 T-051 HF-15 (MUST) -- the held task group takes a ground, and the strip is always drawn', () => {
  it('GIVEN the specification is re-read WHEN HF-15 is looked up THEN it still asks for the always-drawn strip and the S-213 thickness (Chapter 1.9)', () => {
    const hf15 = (specTable('T-051').rows.find((one) => one.id === 'HF-15')?.cells ?? []).join(' ')

    expect(hf15).toContain(T_051_HF15_THE_STRIP_IS_ALWAYS_DRAWN)
    expect(hf15).toContain('`GRS` は、差し込み線と丸の色を 表 T-236 の `S-151`、太さを 表 T-206 の `S-213` とすること。')
  })

  it('⭐ MUST GIVEN a task group is held WHEN it is compared with the same task group unheld THEN it is given a ground of its own (HF-15: the held task group takes a ground)', () => {
    const held = theTaskGroupOf(drawn(taskGroupHeldOn(true)))
    const free = theTaskGroupOf(drawn(taskGroupHeldOn(false)))

    const groundOf = (row: FakeElement): string =>
      (styleMap(row).get('background') ?? styleMap(row).get('background-color') ?? '').trim()

    expect(groundOf(held), `the held task group has no ground: ${inlineStyle(held)}`).not.toBe('')
    expect(groundOf(held), 'the held task group is painted like every other task group').not.toBe(groundOf(free))
  })

  it('⭐⭐ MUST GIVEN the panel is drawn with nothing held WHEN GR-20’s strip is read THEN NO resting rule hides it, though the task group controls beside it are hidden (HF-15: 掴み代は常に描くこと、HF-6 の対象ではない)', () => {
    const built = drawn(oneLiveTaskGroup())
    const rules = sheetRulesOf(built.root())
    const strip = stripsOf(theTaskGroupOf(built))[0]

    expect(strip, 'GR-20 laid no strip, so there is nothing to ask about').toBeDefined()
    // Why: a control is hidden while resting, so a sheet hiding nothing could not pass
    // the line below by accident.
    expect(
      hiddenWhileResting(rules, entryFor(built.root(), entranceForRule('HF-3'))),
      'no control is hidden while resting, so this case proves nothing',
    ).not.toBeNull()
    expect(
      hiddenWhileResting(rules, strip as FakeElement),
      `the grab strip is hidden until a pointer arrives: ${inlineStyle(strip as FakeElement)}`,
    ).toBeNull()
  })
})

// Why: found as a leaf whose text is the mark and a number, not by an attribute: no
// part or entrance names the mark, and the mark is required, not tolerated.
const numberMarksOf = (row: FakeElement): string[] =>
  descendants(row)
    .filter((one) => one.children.length === 0
      && /^\u25be\s\d+$/.test(one.textContent.trim()))
    .map((one) => one.textContent.trim().replace(/^\u25be\s/, ''))

describe('表 T-051 HF-18 (MUST) -- the count of what a task group holds folded is drawn, and not only under a pointer', () => {
  it('GIVEN the specification is re-read WHEN HF-18 is looked up THEN it still asks for the count, the mark and the color, and still says HF-6 does not reach it (Chapter 1.9)', () => {
    const hf18 = (specTable('T-051').rows.find((one) => one.id === 'HF-18')?.cells ?? []).join(' ')

    expect(hf18).toContain(T_051_HF18_THE_COUNT)
    expect(hf18).toContain('配下に折りたたみ込んでいるタスクグループがあるとき、`GRS` は、折りたたみ込んでいるタスクグループ自身にも印を付けること。')
    expect(hf18).toContain('`GRS` は、数を置く先をタスクグループの右端とすること。')
    expect(hf18).toContain('`GRS` は、数の前に、折りたたみ込みを表す印を 1 つ置くこと。')
    expect(hf18).toContain('`GRS` は、左の辺の帯の色を 表 T-236 の `S-153` とすること。')
    expect(hf18).toContain('`GRS` は、数と左の辺の帯を `HF-6` の対象にしないこと。')
    expect(themeColorsOf('S-153').filter((one) => one !== ''), '表 T-236 S-153').toHaveLength(2)
  })

  it('⭐ MUST GIVEN a task group that holds three task groups folded WHEN it is read THEN the count is drawn on it (HF-18: そのタスクグループ数をタスクグループに示すこと)', () => {
    const built = drawn(
      viewWith({
        taskGroupPanel: {
          pinnedTitles: [],
          titles: [
            taskGroupTitle({
              taskGroupId: 'g-1',
              label: 'TaskGroupOne',
              foldedTaskGroupCount: 3,
              expander: { canOpen: true, canClose: true, canCloseBelow: false },
            }),
          ],
        },
      }),
    )

    expect(
      numberMarksOf(theTaskGroupOf(built)),
      `the task group does not show what it holds folded: ${serialize(theTaskGroupOf(built))}`,
    ).toEqual(['3'])
  })

  it('⛔ GIVEN a task group that holds NOTHING folded WHEN it is read THEN no count is drawn (HF-18 shows one 「配下に折りたたみ込んでいるタスクグループがあるとき」)', () => {
    const built = drawn(oneLiveTaskGroup())

    expect(
      numberMarksOf(theTaskGroupOf(built)),
      'a task group with nothing folded was given a count',
    ).toEqual([])
  })

  it('⭐⭐ MUST GIVEN the count is drawn WHEN the sheet is read THEN no resting rule hides it (HF-18: HF-6 の対象ではない)', () => {
    const built = drawn(
      viewWith({
        taskGroupPanel: {
          pinnedTitles: [],
          titles: [
            taskGroupTitle({
              taskGroupId: 'g-1',
              label: 'TaskGroupOne',
              foldedTaskGroupCount: 7,
              expander: { canOpen: true, canClose: true, canCloseBelow: false },
            }),
          ],
        },
      }),
    )
    const row = theTaskGroupOf(built)
    expect(numberMarksOf(row), 'the count was not drawn, so there is nothing to ask about').toEqual([
      '7',
    ])
    // Why: the mark and the number are one node (HF-18), so the text sought carries both.
    const mark = descendants(row).find(
      (one) => one.children.length === 0 && one.textContent.trim() === '▾ 7',
    )
    expect(
      hiddenWhileResting(sheetRulesOf(built.root()), mark as FakeElement),
      'the count is drawn only while a pointer is on the task group -- 抱えているタスクグループを探して回ることになる',
    ).toBeNull()
  })
})

const IN_3_TAKES_NO_POINTER = '\u2b50 \u30c4\u30fc\u30eb\u30c1\u30c3\u30d7\u306f\u30dd\u30a4\u30f3\u30bf\u30fc\u3092\u53d7\u3051\u53d6\u3089\u305a\u3001\u4e0b\u3078\u901a\u3059\u3053\u3068\uff08MUST\uff09'
const UZ_2_PASSES_THE_PRESS = '`GRS` \u306f\u3001`Tooltip` \u306b\u62bc\u4e0b\u3092\u53d7\u3051\u3055\u305b\u305a\u3001\u62bc\u4e0b\u3092\u4e0b\u3078\u901a\u3059\u3053\u3068\u3002'
const TOOLTIP_PART = bare(specTable('T-103').rows.find((one) => one.id === 'U-53')?.by['\u78ba\u5b9a\u540d\uff08\u82f1\uff09'] ?? '')
const TIPPED_ENTRY = 'IC-23'
const COVERED_ENTRY = 'IC-61'
const COVERED_BOX = paletteEntryBox(T_109_ARMING.findIndex((one) => one.row === COVERED_ENTRY))
const UNDER_THE_TIP = { x: COVERED_BOX.x + ENTRY / 2, y: COVERED_BOX.y + ENTRY / 2 }
const TIP_OVER_THE_ENTRY = new Map<string, ScreenRect>([
  ...LAYOUT,
  [`role:${TOOLTIP_PART}`, rect(COVERED_BOX.x - ENTRY, COVERED_BOX.y - ENTRY / 2, 5 * ENTRY, 2 * ENTRY)],
])
const TIPPED_PALETTE: ScreenView = viewWith({
  commandPalette: PALETTE,
  tooltips: [{ anchor: { kind: 'icon', icon: TIPPED_ENTRY, surface: 'Command Palette' }, text: 'TipTextOne', assignment: null }],
})

// Why: a browser skips a node whose pointer-events resolve to none; the shared fake does not, so only this bench does.
/** @purity non-pure */
function drawnHonoringPointerEvents(view: ScreenView): Stage {
  const built = stage(TIP_OVER_THE_ENTRY)
  const takes = (one: FakeElement): boolean => inheritedPointerEvents(one).value !== 'none'
  const made = built.host as unknown as { createElement(tagName: string): FakeElement }
  const host = {
    createElement: (tagName: string): FakeElement => made.createElement(tagName),
    elementFromPoint: (x: number, y: number): FakeElement | null => stackAt(built.mount, x, y).find(takes) ?? null,
    elementsFromPoint: (x: number, y: number): FakeElement[] => stackAt(built.mount, x, y).filter(takes),
  } as unknown as Document
  const honoring: Stage = { ...built, host }
  honoring.surface = domScreenSurface(wiringOf(honoring))
  surfaceOf(honoring).showScreenView(view)
  return honoring
}

describe('IN-3 of table T-028 / UZ-2 of table T-337 -- an icon tooltip drawn over an entrance takes no press', () => {
  it('IN-3 / UZ-2 -- the clauses still stand', () => {
    expect(specText('01-04-requirements.md')).toContain(IN_3_TAKES_NO_POINTER)
    expect(specText('01-04-requirements.md')).toContain(UZ_2_PASSES_THE_PRESS)
  })

  it('IN-3 / UZ-2 -- premise: the tooltip really is drawn over the entrance, the front of the plain stack', () => {
    const built = wire(TIP_OVER_THE_ENTRY)
    surfaceOf(built).showScreenView(TIPPED_PALETTE)
    const tip = byRole(built.root(), TOOLTIP_PART)[0]
    expect(tip?.textContent ?? '', 'the tooltip is drawn').toContain('TipTextOne')
    const front = stackAt(built.mount, UNDER_THE_TIP.x, UNDER_THE_TIP.y)[0]
    expect(front !== undefined && (tip as FakeElement).contains(front), `the front at ${JSON.stringify(UNDER_THE_TIP)} is ${front === undefined ? 'nothing' : serialize(front)}`).toBe(true)
    expect(stackAt(built.mount, UNDER_THE_TIP.x, UNDER_THE_TIP.y).some((one) => one.attributes.get('data-icon') === COVERED_ENTRY)).toBe(true)
  })

  it('IN-3 / UZ-2 -- every node of the tooltip resolves to pointer-events none, and the covered entrance does not', () => {
    const built = wire(TIP_OVER_THE_ENTRY)
    surfaceOf(built).showScreenView(TIPPED_PALETTE)
    const tip = byRole(built.root(), TOOLTIP_PART)[0] as FakeElement
    for (const one of selfAndDescendants(tip)) {
      expect(inheritedPointerEvents(one).value, `${IN_3_TAKES_NO_POINTER} -- ${serialize(one)}`).toBe('none')
    }
    expect(inheritedPointerEvents(entryFor(built.root(), COVERED_ENTRY)).value, `premise: ${COVERED_ENTRY} takes the press`).not.toBe('none')
  })

  it('IN-3 / UZ-2 -- a press under the tooltip answers the entrance beneath it, in a host that skips what takes no pointer', () => {
    const built = drawnHonoringPointerEvents(TIPPED_PALETTE)
    const answer = ask(built, UNDER_THE_TIP.x, UNDER_THE_TIP.y)
    expect(answer?.part, UZ_2_PASSES_THE_PRESS).toBe(partName('U-26'))
    expect(answer?.entry, UZ_2_PASSES_THE_PRESS).toBe(COVERED_ENTRY)
  })
})
