// Unit tests: the Confirmation surface (U-55) and NT-7's two word buttons.

import { readRepoFile } from '../spec-files'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { confirmationFromSession } from '../../src/adapter/screen-renderer/notices'
import type {
  AppHeaderItems,
  CommandItem,
  Confirmation,
  ConfirmationItem,
  RaisedConfirmation,
  ScreenFrame,
  ScreenPart,
  ScreenSurface,
  ScreenView,
  ScreenViewReadings,
} from '../../src/adapter/screen-renderer/screen-renderer'
import type { ScreenRect } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import {
  domScreenSurface,
  type ScreenSurfaceWiring,
  type ScreenTheme,
} from '../../src/framework/dom-screen-surface/dom-screen-surface'
import {
  emptyScreenSession,
  type ScreenSession,
} from '../../src/use-case/advance-screen-session/advance-screen-session'
// Why: the contract reader takes its copy from the .md at read time, which keeps
// the rosters below from falling behind a row.
import { specTable, bare, bareAll } from '../contract/spec-table'

import { unbroken } from '../contract/spec-table'

const specText = (...parts: string[]): string =>
  unbroken(readRepoFile(join(process.cwd(), 'docs', 'spec', ...parts), 'utf8'))

const U_55 = 'U-55'

const ASKING = 'NT-7'

const LANGUAGE = 'en'

// Why: the names column is read raw, not through bare, whose answer for a cell
// carrying a code span would be the span rather than the answer.
const T_234 = specTable('T-234').rows.map((row) => ({
  row: row.id,
  namesWhatGoes: (row.by['名前を挙げるか'] ?? '').trim().startsWith('挙げる'),
  by: (row.by['正'] ?? '').trim(),
}))

const questionRow = (at: number): string =>
  (T_234[at % T_234.length] as { readonly row: string }).row

// Why: read, never written: FR-076 makes what a question shows a row of T-234,
// and FR-038 keeps its sentence in the one dictionary, which a bench may not copy.
const DISPLAY_WORDS = JSON.parse(
  readRepoFile(
    join(process.cwd(), 'src', 'adapter', 'screen-renderer', 'display-words.json'),
    'utf8',
  ),
) as {
  readonly questions: readonly { readonly specTableRowId: string; readonly text: Record<string, string> }[]
  readonly confirmationMarks: readonly {
    readonly mark: string
    readonly text: Record<string, string>
  }[]
}

const QUESTION_WORDS = DISPLAY_WORDS.questions

const MARK_WORDS = DISPLAY_WORDS.confirmationMarks

// Why: the mark's word is read from the dictionary too; this file names no mark of its own.
const SHOWN_ON_ANOTHER_TASK_GROUP_MARK: string = (() => {
  const held = MARK_WORDS[0]
  if (held === undefined) throw new Error('FR-032: the dictionary holds no mark for an item')
  return held.text[LANGUAGE] ?? ''
})()

const SETTING_SLOT_ROWS: Readonly<Record<string, string>> = { maxGroupDepth: 'S-125' }

const settingSlotValue = (slot: string, name: string): string => {
  const id = SETTING_SLOT_ROWS[name]
  const row = id === undefined ? undefined : specTable('T-211').rows.find((one) => one.id === id)
  return /-?\d+/.exec(bare(row?.by['値'] ?? '').replace(/`/g, ''))?.[0] ?? slot
}

const sentenceFor = (question: string): string => {
  const held = QUESTION_WORDS.find((one) => one.specTableRowId === question)
  if (held === undefined) throw new Error(`the dictionary holds no row of table T-234 for ${question}`)
  return (held.text[LANGUAGE] ?? '').replace(/\{(\w+)\}/g, settingSlotValue)
}

// Why: not written out: T-109's surface column holds T-103's settled names, so the
// name must come from T-103 or the join between the tables is a coincidence.
function settledNameOf(row: string): string {
  const held = specTable('T-103').rows.find((one) => one.id === row)
  if (held === undefined) throw new Error(`table T-103 no longer holds ${row}`)
  const name = bare(held.by['確定名（英）'] ?? held.cells[0] ?? '')
  if (name === '') throw new Error(`table T-103 ${row} has no settled name`)
  return name
}

const CONFIRMATION = settledNameOf(U_55)

interface RosterIcon {
  readonly specTableRowId: string
  readonly surfaces: readonly string[]
  readonly group: string | null
  readonly entryTo: string
  readonly authority: string
}

interface Roster {
  readonly columns: Readonly<Record<string, string>>
  readonly icons: readonly RosterIcon[]
}

// Why: the generated roster is filtered rather than the .md, since the unit reads
// the same file and gen:check holds it to table T-109.
const ROSTER: Roster = JSON.parse(
  readRepoFile(
    join(process.cwd(), 'src', 'adapter', 'screen-renderer', 'icon-roster.json'),
    'utf8',
  ),
) as Roster

// Why: empty, which is NT-7's MUST NOT; kept and asserted so that a row naming
// U-55 again is caught by the first case below.
const ON_THE_CONFIRMATION: readonly RosterIcon[] = ROSTER.icons.filter((one) =>
  one.surfaces.includes(CONFIRMATION),
)

const ENTRY_ROWS: readonly string[] = ON_THE_CONFIRMATION.map((one) => one.specTableRowId)

// Why: the manuscript's section, not the generated copy, so a word that never made
// the crossing is caught rather than agreed with.
const MANUSCRIPT_ANSWERS: readonly { readonly answer: string; readonly text: Record<string, string> }[] =
  (
    JSON.parse(
      readRepoFile(join(process.cwd(), 'docs', 'spec', '_source', 'display-words.json'), 'utf8'),
    ) as {
      confirmation: { answer: string; text: Record<string, string> }[]
    }
  ).confirmation

const ANSWER_KEYS: readonly string[] = MANUSCRIPT_ANSWERS.map((one) => one.answer)

function answerWordFor(answer: string): string {
  const held = MANUSCRIPT_ANSWERS.find((one) => one.answer === answer)?.text[LANGUAGE]
  if (held === undefined || held === '') {
    throw new Error(`FR-038: the manuscript holds no ${LANGUAGE} word for the answer ${answer}`)
  }
  return held
}

const NT_7_SHOW_AND_CHOOSE = '何が起きるかを示したうえで、続けるか取りやめるかを選ばせること（MUST）'
const NT_7_BY_NAME = 'その名前を挙げること（MUST）'
const NT_7_COUNT_IS_NO_SUBSTITUTE = '件数は名前の代わりにできない'
const NT_7_ONLY_WHERE_ASKED = '問うてよいのは、要求が確認を求めると定めた場面だけとすること（MUST）'
const NT_7_WORD_BUTTONS = '答えの入口は、図形ではなく語のボタンとすること（MUST）'
const NT_7_SAME_IN_EVERY_LANGUAGE =
  '`FR-038` の辞書の `confirmation` の語を、どの言語でも `Yes` / `No` と綴ること（MUST）'
const NT_7_NO_ROW_OF_T_109 = '答えの入口に 表 T-109 の行を与えてはならない（MUST NOT）'
const NT_7_BOLD_HEAD = '頭の 1 文字（`Y` と `N`）を太字にすること（MUST）'
const NT_7_ANSWERED_BY_KEY = '`y` と `n` の打鍵でも答えられること（MUST）'
const NT_7_KEYS_GO_NOWHERE_ELSE =
  '問いが立っているあいだ、この 2 つのキーをほかの何にも渡してはならない（MUST NOT）'

const FR_032_NAMES_NOT_A_COUNT = '`GRS` は、タスクグループの削除の確認で、件数だけを示さないこと。'
const FR_032_SHOWN_ON_ANOTHER_TASK_GROUP = '`GRS` は、タスクグループの削除の確認で、消える `Task` のうち他のタスクグループに表示されているものに、他のタスクグループに表示されている旨を示すこと。'

const T_023A_ONLY_THE_DRAWING_AREA = '`GRS` は、判定順序を日程の描画領域だけに適用すること。'

const T_109_PREAMBLE_SURFACE_COLUMN =
  '**`面` の欄は 表 T-103 の確定名である。** 新しい面の名を作らない。'

const T_065_THE_SIDE_THAT_DREW_IT = '点がどの入口の上かは、その入口を描いた側が答えること（MUST）'

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
  // Why: only an input really has a value; it is harmless elsewhere and keeps the fake small.
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

  // Summary: The fake shall record every innerHTML read or write in markupWrites and never parse it.
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

  // Why: mirrors the real property, so a unit that writes el.disabled = true instead of
  // setAttribute is caught by the same case.
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
  readonly layout: Map<string, ScreenRect>
  mount: FakeElement | null
  activeElement: FakeElement | null
}

const ZERO: ScreenRect = { x: 0, y: 0, width: 0, height: 0 }

const layoutKey = (element: FakeElement): string | null => {
  const icon = element.attributes.get('data-icon')
  if (icon !== undefined) return `icon:${icon}`
  // Why: NT-7's answers carry no data-icon, so they need a layout key of their own.
  const answer = element.attributes.get('data-confirmation-answer')
  if (answer !== undefined) return `answer:${answer}`
  const role = element.attributes.get('data-role')
  if (role !== undefined) return `role:${role}`
  return null
}

// Why: worked out from the attributes the unit wrote, not a table keyed by node, so
// a measurement taken while drawing and one while answering cannot disagree.
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

// Summary: The fake shall hold a point half-open on both axes, as R3.4 does for an owned rectangle.
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

// Summary: The stack shall list every node a point lands on, topmost first, skipping hidden subtrees.
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

function wiringOf(built: Stage): ScreenSurfaceWiring {
  return {
    host: built.host,
    mount: built.mount as unknown as Element,
    readClockMs: (): number => Date.UTC(2026, 7, 22, 3, 4, 5),
    onAppHeaderHeightMeasured: (heightPx: number): void => {
      built.reportedHeights.push(heightPx)
    },
    // Why: no case reads a color back, but the member is required (FR-041 leaves the
    // environment no say), so the bench states the session's own pair.
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

const ask = (built: Stage, at: { readonly x: number; readonly y: number }): ScreenPart | null =>
  surfaceOf(built).readScreenPartAt(at.x, at.y)

// Why: the host's own answer, so a case can ask what the unit did with it without
// re-deciding where the point fell.
const hostLanding = (
  built: Stage,
  at: { readonly x: number; readonly y: number },
): FakeElement | null =>
  (built.host as unknown as { elementFromPoint(x: number, y: number): FakeElement | null })
    .elementFromPoint(at.x, at.y)

const edgesOf = (box: ScreenRect): readonly { readonly x: number; readonly y: number }[] => [
  { x: box.x, y: box.y },
  { x: box.x + box.width, y: box.y },
  { x: box.x, y: box.y + box.height },
  { x: box.x + box.width, y: box.y + box.height },
]

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

function confirmationPartOf(built: Stage): FakeElement {
  const found = byRole(built.root(), CONFIRMATION)
  expect(found, `table T-103 ${U_55}: exactly one ${CONFIRMATION} is drawn`).toHaveLength(1)
  const first = found[0]
  if (first === undefined) throw new Error('unreachable')
  return first
}

const entryNodesIn = (element: FakeElement): FakeElement[] =>
  selfAndDescendants(element).filter((one) => one.getAttribute('data-icon') !== null)

const entryRowsIn = (element: FakeElement): string[] =>
  entryNodesIn(element).map((one) => one.getAttribute('data-icon') ?? '')

const answerNodesIn = (element: FakeElement): FakeElement[] =>
  selfAndDescendants(element).filter(
    (one) => one.getAttribute('data-confirmation-answer') !== null,
  )

const answerKeysIn = (element: FakeElement): string[] =>
  answerNodesIn(element).map((one) => one.getAttribute('data-confirmation-answer') ?? '')

function answerNodeFor(element: FakeElement, answer: string): FakeElement {
  const found = answerNodesIn(element).filter(
    (one) => one.getAttribute('data-confirmation-answer') === answer,
  )
  expect(found, `${answer} is drawn once on the ${CONFIRMATION}`).toHaveLength(1)
  const first = found[0]
  if (first === undefined) throw new Error('unreachable')
  return first
}

const isShown = (element: FakeElement): boolean => {
  let at: FakeElement | null = element
  while (at !== null) {
    if (isHiddenHere(at)) return false
    at = at.parentNode
  }
  return true
}

function shownText(element: FakeElement): string {
  if (isHiddenHere(element)) return ''
  return element.childNodes
    .map((one) => (one instanceof FakeText ? one.data : shownText(one)))
    .join('')
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

// Why: a name is asked as a node whose whole text it is, so names run together or
// replaced by a count answer nothing, without fixing a spelling.
const nodesReadingExactly = (root: FakeElement, text: string): FakeElement[] =>
  selfAndDescendants(root).filter((one) => shownText(one) === text)

// Summary: The matcher shall answer [attr], [attr="value"], a tag and a descendant selector.
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

const WINDOW = { width: 1000, height: 800 } as const
const HEADER_HEIGHT = 40

// Why: these boxes are this file's own, since no row fixes the geometry; no case may
// turn the fake's holdsPoint into a claim about the unit.
// Why: the answers are laid apart so a bare strip of the surface lies between them,
// telling on the surface but off every answer from on an answer.
const CONFIRMATION_BOX = rect(300, 250, 400, 200)
const ANSWER_BOXES: readonly ScreenRect[] = [rect(330, 380, 120, 32), rect(470, 380, 120, 32)]

const boxOfAnswer = (index: number): ScreenRect =>
  ANSWER_BOXES[index] ?? rect(330 + index * 140, 380, 120, 32)

const LAYOUT = new Map<string, ScreenRect>([
  ['role:App Header', rect(0, 0, WINDOW.width, HEADER_HEIGHT)],
  [`role:${CONFIRMATION}`, CONFIRMATION_BOX],
  ...ANSWER_KEYS.map(
    (answer, index): [string, ScreenRect] => [`answer:${answer}`, boxOfAnswer(index)],
  ),
])

function midOfAnswer(index: number): { readonly x: number; readonly y: number } {
  const box = boxOfAnswer(index)
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

const AT = {
  surfaceOnly: { x: 620, y: 300 },
  betweenTheAnswers: { x: 460, y: 396 },
  scheduleExposed: { x: 100, y: 300 },
} as const

const command = (patch: Partial<CommandItem> & { icon: string }): CommandItem => ({
  isEnabled: true,
  isPressed: false,
  // Why: isArmed is a member apart from isPressed, since IC-54 is not a button and
  // FR-053 bars the pressed form, so an arm may not travel on the toggle.
  isArmed: false,
  isChosen: false,
  label: '',
  ...patch,
})

const FRAME: ScreenFrame = { isFullScreen: false, dividers: [], scrollbars: [] }

const HEADER: AppHeaderItems = {
  documentTitle: 'DocumentTitleHere',
  openedFileName: null,
  fileSavedAt: null,
  fileSavedByteLength: null,
  fileNeverSavedText: '',
  commands: [command({ icon: 'IC-7' })],
  // Why: the same language BASE_VIEW carries, since S-99 is one state for the whole screen.
  language: 'en',
}

const BASE_VIEW: ScreenView = {
  language: 'en',
  frame: FRAME,
  appHeaderItems: HEADER,
  taskGroupPanel: { pinnedTitles: [], titles: [] },
  propertiesPanel: null,
  commandPalette: null,
  openModal: null,
  notices: [],
  confirmation: null,
  tooltips: [],
}

const viewWith = (patch: Partial<ScreenView>): ScreenView => ({ ...BASE_VIEW, ...patch })

// Why: S-73 is read from T-216 because DR-5 keeps the hue on Project, so no
// generated constant carries it.
const S_73 = specTable('T-216').rows.find((row) => row.id === 'S-73')
if (S_73 === undefined) throw new Error('table T-216 no longer has row S-73')
const THEME_HUE = Number(bare(S_73.by['既定'] ?? ''))

const THEME: ScreenTheme = {
  preference: emptyScreenSession.screen.themePreference,
  hue: THEME_HUE,
}

const rootAsking: ScreenSession = {
  ...emptyScreenSession,
  screen: {
    ...emptyScreenSession.screen,
    screenLanguage: LANGUAGE,
    helpLanguage: LANGUAGE,
    milestoneListDisplayState: { kind: 'closed' },
    paletteDisplayState: { kind: 'shown', child: { kind: 'expanded' } },
    dualCursorModeState: { kind: 'off' },
    propertiesPanelContentState: { kind: 'hidden' },
  },
}

const readingsAsking = (raised: RaisedConfirmation | null): ScreenViewReadings => ({
  openedFileName: null,
  fileSavedAt: null,
  fileSavedByteLength: null,
  isAgentApiEnabled: false,
  pointer: null,
  pointerRestedMs: 0,
  hintTargetDwellMs: 0,
  iconUnderPointer: null,
  commandPaletteAt: { x: 0, y: 0 },
  // Why: no case reads the theme or the milestone glyph list (S-72, S-142), so
  // both take the manuscript's default.
  themePreference: THEME.preference,
  themeHue: THEME.hue,
  selectedTaskGroupIds: [],
  selectedResourceUids: [],
  notices: [],
  confirmation: raised,
  taskGroupBoxes: [],
  // Why: zero means everything fits (the lane-long grip of SC-4); GR-21 divides
  // these, and no case here asks anything of it.
  scrollExtent: { contentWidth: 0, contentHeight: 0, visibleHeight: 0 },
})

// Why: raised as a row of T-234, not a sentence: an asker that supplied one would
// be the second store of translated strings FR-038 forbids.
const raise = (question: string, items: readonly ConfirmationItem[] = []): RaisedConfirmation => ({
  manner: ASKING,
  question,
  items,
})

const named = (name: string, isShownOnAnotherTaskGroup = false): ConfirmationItem => ({
  name,
  isShownOnAnotherTaskGroup,
})

// Why: composed rather than written out, so every case is driven by the roster to the screen.
function composed(raised: RaisedConfirmation): Confirmation {
  const shown = confirmationFromSession(rootAsking, readingsAsking(raised))
  if (shown === null) throw new Error('a raised question came back as none')
  return shown
}

const asking = (question: string, items: readonly ConfirmationItem[] = []): ScreenView =>
  viewWith({ confirmation: composed(raise(question, items)) })

// Why: a roster of inputs, never of what may be shown (FR-031 MUST NOT); items follow
// T-234's names column, and the names are this file's own ASCII stand-ins.
const ASKING_SITES: readonly {
  readonly by: string
  readonly question: string
  readonly items: readonly ConfirmationItem[]
}[] = T_234.map((entry) => ({
  by: `${entry.row} (${entry.by})`,
  question: entry.row,
  items: entry.namesWhatGoes ? [named('foundation work'), named('steel delivery', true)] : [],
}))

// Spec: U-55, NT-7, T-109, T-227, DI-4, DI-5, IN-3, FR-032
describe('the specification still says what these cases copy', () => {
  it('GIVEN table T-103 WHEN U-55 is read THEN it still settles the name of the surface that asks', () => {
    const row = specTable('T-103').rows.find((one) => one.id === U_55)
    expect(row, `table T-103 no longer holds ${U_55}`).toBeDefined()

    const whole = row?.cells.join(' ') ?? ''
    expect(whole).toContain('続けてよいかを問う面')
    expect(whole).toContain('T-037')
    expect(whole).toContain(ASKING)
    expect(whole).toContain('T-109')
    expect(whole).toContain('通知')
    expect(whole).toContain('ではない')
  })

  it('GIVEN the preamble above table T-109 WHEN it is read THEN its surface column still holds the settled names of table T-103', () => {
    expect(specText('_assets', 'tbl-glossary.md')).toContain(T_109_PREAMBLE_SURFACE_COLUMN)
  })

  it('⛔ GIVEN table T-109 WHEN it is filtered on its surface column THEN it prints NO row against Confirmation (NT-7 MUST NOT)', () => {
    const fromTheTable = specTable('T-109')
      // Why: bareAll, not bare: IC-52 names six surfaces in that one cell, and reading
      // only the first would answer this MUST NOT for one of six.
      .rows.filter((one) => bareAll(one.by['面'] ?? one.cells[0] ?? '').includes(CONFIRMATION))
      .map((one) => one.id)

    expect(
      fromTheTable,
      `table T-109 prints ${fromTheTable.join(' / ')} against ${CONFIRMATION}, which NT-7 forbids`,
    ).toEqual([])
    // Why: the one place the generated roster and the .md are held against each other.
    expect(ENTRY_ROWS).toEqual(fromTheTable)
    expect(ANSWER_KEYS.length, 'NT-7 asks for TWO answers').toBe(2)
  })

  it('GIVEN the roster WHEN its column names are read THEN the column filtered on is the surface column of table T-109', () => {
    expect(ROSTER.columns['surfaces']).toBe('面')
    expect(ROSTER.columns['specTableRowId']).toBe('行 ID')
  })

  it('GIVEN the manuscript dictionary WHEN its confirmation section is read THEN it holds one word per answer, spelled the same in every display language (NT-7 MUST)', () => {
    // Why: the head letter is asserted beside the word, since an untranslated word is
    // what lets its head point at the key that answers it.
    for (const held of MANUSCRIPT_ANSWERS) {
      const spellings = new Set(Object.values(held.text))
      expect(spellings.size, `${held.answer} is spelled differently by language`).toBe(1)
      const word = answerWordFor(held.answer)
      expect(word.length, `${held.answer} has no word to draw a head letter from`).toBeGreaterThan(0)
    }
    // Why: the two heads differ, which is what lets one key name one answer.
    const heads = ANSWER_KEYS.map((answer) => answerWordFor(answer).slice(0, 1))
    expect(new Set(heads).size, 'the two answers share a head letter').toBe(heads.length)
  })

  it('GIVEN table T-037 WHEN NT-7 is read THEN it still asks for what happens to be shown and for the choice to be made', () => {
    const manner = specTable('T-037').rows.find((one) => one.id === ASKING)?.cells.join(' ') ?? ''
    expect(manner).toContain(NT_7_SHOW_AND_CHOOSE)
    expect(manner).toContain(NT_7_BY_NAME)
    expect(manner).toContain(NT_7_COUNT_IS_NO_SUBSTITUTE)
    expect(manner).toContain(NT_7_ONLY_WHERE_ASKED)
  })

  it('GIVEN table T-037 WHEN NT-7 is read THEN it still makes the two answers WORD BUTTONS, bolds their head letter, and refuses them a row of table T-109', () => {
    // Why: the fixed copy of the sentences the drawing cases rest on, so a withdrawn
    // one fails here before those cases disagree with a spec nobody read.
    const manner = specTable('T-037').rows.find((one) => one.id === ASKING)?.cells.join(' ') ?? ''
    expect(manner).toContain(NT_7_WORD_BUTTONS)
    expect(manner).toContain(NT_7_SAME_IN_EVERY_LANGUAGE)
    expect(manner).toContain(NT_7_NO_ROW_OF_T_109)
    expect(manner).toContain(NT_7_BOLD_HEAD)
    expect(manner).toContain(NT_7_ANSWERED_BY_KEY)
    expect(manner).toContain(NT_7_KEYS_GO_NOWHERE_ELSE)
  })

  it('GIVEN FR-032 WHEN its confirmation sentence is read THEN a count still may not stand in for the names', () => {
    const text = specText('01-04-requirements.md')
    expect(text).toContain(FR_032_NAMES_NOT_A_COUNT)
    expect(text).toContain(FR_032_SHOWN_ON_ANOTHER_TASK_GROUP)
  })

  it('GIVEN table T-024a OP-4 and table T-227 DI-4 / DI-5 WHEN they are read THEN two ask by NT-7 and one forbids asking', () => {
    const op4 = specTable('T-024a').rows.find((one) => one.id === 'OP-4')?.cells.join(' ') ?? ''
    expect(op4).toContain('捨てる前に確認を求めること（MUST）')

    const di4 = specTable('T-227').rows.find((one) => one.id === 'DI-4')?.cells.join(' ') ?? ''
    expect(di4).toContain('上書きしてよいかを問うこと（MUST）')
    expect(di4).toContain(ASKING)
    // Why: DI-4 owes no names here, so an empty list of names is a real answer.
    expect(di4).toContain('消えるものの名前を挙げる義務はここには無い')

    const di5 = specTable('T-227').rows.find((one) => one.id === 'DI-5')?.cells.join(' ') ?? ''
    expect(di5).toContain('問わないこと（MUST）')
  })

  it('GIVEN table T-023a WHEN its note is read THEN the decision order is still the drawing area alone (MUST)', () => {
    expect(specText('01-04-requirements.md')).toContain(T_023A_ONLY_THE_DRAWING_AREA)
  })

  it('GIVEN table T-065 WHEN IF-9 and the MUST under it are read THEN the side that drew an entry still answers where it is', () => {
    const row = specTable('T-065').rows.find((one) => one.id === 'IF-9')
    const supply = row?.cells[row.cells.length - 1] ?? ''
    expect(supply).toContain('画面上の点')
    expect(supply).toContain('T-103')
    expect(specText('05-07-design.md')).toContain(T_065_THE_SIDE_THAT_DREW_IT)
  })

  it('GIVEN table T-028 IN-3 WHEN it is read THEN it governs the tooltip, which is not this surface', () => {
    // Why: quoted to keep IN-3 off the confirmation: a tooltip may go once its trigger
    // comes off, while NT-7 has this surface wait until it is answered.
    const manner = specTable('T-028').rows.find((one) => one.id === 'IN-3')?.cells.join(' ') ?? ''
    expect(manner).toContain('ツールチップ')
    expect(manner).toContain('次の 2 つをすべて満たすこと（MUST）')
    expect(manner).toContain('消せること')
    expect(manner).not.toContain('ポインターを乗せられること')
    expect(manner).toContain('引き金が外れるまで出ていること')
    expect(manner).toContain('引き金が外れたら消してよい')
  })
})

// Spec: NT-7, UF-67, FR-038, FR-076
describe('NT-7 -- the two word buttons that stand on the surface', () => {
  it('GIVEN the manuscript dictionary WHEN its confirmation section is read THEN it holds two distinct answers', () => {
    // Why: neither key is written here, so a third answer printed by the manuscript is
    // described by this case and driven by every case below.
    expect(ANSWER_KEYS.length).toBeGreaterThanOrEqual(2)
    expect(new Set(ANSWER_KEYS).size).toBe(ANSWER_KEYS.length)
  })

  it('GIVEN a question was raised WHEN it is composed THEN it carries every answer the dictionary holds, in that dictionary order', () => {
    const shown = composed(raise(questionRow(0)))

    expect(shown.answers.map((one) => one.answer)).toEqual(ANSWER_KEYS)
  })

  it('GIVEN a question was raised WHEN it is composed THEN the raised half survives beside the answers the dictionary added', () => {
    const raised = raise(questionRow(1), [named('foundation work')])

    const shown = composed(raised)

    expect(shown.manner).toBe(raised.manner)
    expect(shown.question).toBe(raised.question)
    expect(shown.items).toEqual(raised.items)
    expect(shown.text).toBe(sentenceFor(raised.question))
  })

  it('GIVEN no question was raised WHEN the view is filled THEN there is nothing to answer', () => {
    expect(confirmationFromSession(rootAsking, readingsAsking(null))).toBeNull()
  })

  it('GIVEN each place a requirement asks WHEN each is composed THEN the same two answers stand on all of them (FR-031 MUST NOT: the places are not enumerated)', () => {
    for (const site of ASKING_SITES) {
      const shown = composed(raise(site.question, site.items))

      expect(shown.answers.map((one) => one.answer), site.by).toEqual(ANSWER_KEYS)
    }
  })
})

// Spec: NT-7, T-037, T-109, T-234, FR-076, FR-038, FR-029, DI-5, FR-060
describe('table T-037 NT-7 (MUST) -- going on or calling it off is CHOSEN', () => {
  it('⛔ GIVEN a question was raised WHEN it is composed THEN neither answer carries a row of table T-109 or an entrance state (NT-7 MUST NOT)', () => {
    // Why: the three entrance states are asserted absent beside the row id, since an
    // answer that could not be pressed would leave the person no way to answer.
    const shown = composed(raise(questionRow(0)))

    expect(shown.answers.length).toBe(ANSWER_KEYS.length)
    for (const one of shown.answers) {
      expect(one, one.answer).not.toHaveProperty('icon')
      expect(one, one.answer).not.toHaveProperty('isEnabled')
      expect(one, one.answer).not.toHaveProperty('isPressed')
      expect(one, one.answer).not.toHaveProperty('isArmed')
      expect(Object.keys(one).sort(), one.answer).toEqual(['answer', 'text'])
    }
  })

  it('GIVEN a question was raised WHEN it is composed THEN each answer carries the word the manuscript holds for its own key (FR-038 MUST)', () => {
    const shown = composed(raise(questionRow(2)))

    for (const one of shown.answers) {
      expect(one.text, one.answer).toBe(answerWordFor(one.answer))
    }
  })

  it('GIVEN a question stands WHEN the screen is drawn THEN what is about to happen is on it, in words -- one case walks every row of table T-234', () => {
    for (const entry of T_234) {
      const built = drawn(asking(entry.row, []))

      expect(shownText(confirmationPartOf(built)), entry.by).toContain(sentenceFor(entry.row))
      expect(shownText(confirmationPartOf(built)), entry.by).not.toContain(entry.row)
    }
  })

  it('GIVEN a question stands WHEN the screen is drawn THEN every answer the dictionary holds is drawn on that surface, in the dictionary order', () => {
    const built = drawn(asking(questionRow(1)))

    expect(answerKeysIn(confirmationPartOf(built))).toEqual(ANSWER_KEYS)
  })

  it('⛔ GIVEN a question stands WHEN the drawn answers are read THEN none carries a row of table T-109 (NT-7 MUST NOT)', () => {
    // Why: data-icon is the join commandEntry writes for a row of T-109, so nothing here may wear one.
    const part = confirmationPartOf(drawn(asking(questionRow(1))))

    expect(entryRowsIn(part), 'a word button was drawn as an entry of table T-109').toEqual([])
  })

  it('GIVEN a question stands WHEN the drawn answers are read THEN each is shown, none is disabled, and each can be chosen', () => {
    // Why: the press reaching that answer is the part with teeth: a disabled control is
    // still drawn, so the DOM's silence about disabled proves nothing alone.
    const built = drawn(asking(questionRow(2)))
    const part = confirmationPartOf(built)

    ANSWER_KEYS.forEach((answer, index) => {
      const node = answerNodeFor(part, answer)
      expect(isShown(node), `${answer} is on the screen`).toBe(true)
      expect(node.disabled, `${answer} may not be disabled`).toBe(false)
      expect(node.hasAttribute('disabled'), `${answer} may not be disabled`).toBe(false)
      expect(node.getAttribute('aria-disabled'), `${answer} may not be disabled`).not.toBe('true')
      expect(
        ask(built, midOfAnswer(index))?.confirmationAnswer,
        `${answer} can be chosen`,
      ).toBe(answer)
    })
  })

  it('⭐ GIVEN a question stands WHEN each answer is read THEN it carries the whole word, with its FIRST character drawn bold (NT-7 MUST)', () => {
    // Why: the whole word is asked for beside the bold head, since a surface that drew
    // only the head would pass a head-alone claim.
    const part = confirmationPartOf(drawn(asking(questionRow(2))))

    for (const answer of ANSWER_KEYS) {
      const word = answerWordFor(answer)
      const node = answerNodeFor(part, answer)

      expect(shownText(node), `${answer} shows its whole word`).toBe(word)

      const bold = selfAndDescendants(node).filter((one) =>
        (one.getAttribute('style') ?? '').replace(/\s+/g, '').includes('font-weight:bold'),
      )
      expect(bold.length, `${answer} draws no bold head`).toBe(1)
      expect(shownText(bold[0] as FakeElement), `${answer} bolds more or less than its head`).toBe(
        word.slice(0, 1),
      )
    }
  })

  it('⛔ GIVEN two answers whose words differ WHEN the two surfaces are compared THEN they differ -- so the case above is not a green that proves nothing (04-verification §2)', () => {
    // Why: a description no requirement allows, built only to show the surface carries
    // the answer's text to the screen rather than writing a constant.
    const live = composed(raise(questionRow(2)))
    const renamed: Confirmation = {
      ...live,
      answers: live.answers.map((one) => ({ ...one, text: `${one.answer}Word` })),
    }

    const asLive = serialize(confirmationPartOf(drawn(viewWith({ confirmation: live }))))
    const asRenamed = serialize(confirmationPartOf(drawn(viewWith({ confirmation: renamed }))))

    expect(asRenamed).not.toBe(asLive)
  })

  it('GIVEN each place a requirement asks WHEN the screen is drawn THEN the surface stands with both answers on it every time', () => {
    for (const site of ASKING_SITES) {
      const built = drawn(asking(site.question, site.items))
      const part = confirmationPartOf(built)

      expect(shownText(part), site.by).toContain(sentenceFor(site.question))
      expect(answerKeysIn(part), site.by).toEqual(ANSWER_KEYS)
    }
  })

  it('GIVEN nothing was raised WHEN the screen is drawn THEN no such surface stands at all (NT-7: only where a requirement asks)', () => {
    // Why: DI-5 turns on this: FR-060's path may not ask, so a surface that stood
    // whenever a file was written would break that row.
    const built = drawn(viewWith({ confirmation: null }))

    expect(byRole(built.root(), CONFIRMATION)).toHaveLength(0)
    expect(answerKeysIn(built.root())).toEqual([])
  })
})

// Spec: NT-7, NT-3, FR-032, T-050, CD-2, DI-4
describe('table T-037 NT-7 (MUST) -- what would go is named, one by one', () => {
  const NAMES = ['foundation work', 'steel delivery', 'first coat of paint'] as const

  it('GIVEN three things would go WHEN the question is drawn THEN each name stands as its own element', () => {
    const built = drawn(asking(questionRow(1), NAMES.map((name) => named(name))))
    const part = confirmationPartOf(built)

    for (const name of NAMES) {
      expect(
        nodesReadingExactly(part, name).length,
        `"${name}" has an element of its own`,
      ).toBeGreaterThanOrEqual(1)
    }
  })

  it('⛔ GIVEN a surface that ran the same three names together into ONE string WHEN it is read the same way THEN not one of them answers -- so the case above is not a green that proves nothing (04-verification §2)', () => {
    // Why: a hand-built tree, not the unit's, only to show that the reading above can
    // fail, and fails on the names-run-together shape NT-7 bars.
    const joined = new FakeElement('div', stage(new Map()).world)
    joined.setAttribute('data-role', CONFIRMATION)
    joined.textContent = NAMES.join(', ')

    for (const name of NAMES) {
      expect(nodesReadingExactly(joined, name), `"${name}" is not on its own`).toHaveLength(0)
    }
    // Why: every name is there, so what the reading catches is run into one sentence,
    // not never written at all.
    for (const name of NAMES) {
      expect(shownText(joined)).toContain(name)
    }
  })

  // Spec: IMPS-258
  it('GIVEN three things would go WHEN the question is drawn THEN no name is missing from the surface', () => {
    const built = drawn(asking(questionRow(1), NAMES.map((name) => named(name))))
    const text = shownText(confirmationPartOf(built))

    for (const name of NAMES) {
      expect(text, `"${name}" reached the screen`).toContain(name)
    }
  })

  // Spec: IMPS-259
  it("GIVEN three things would go WHEN the question is drawn THEN a count does not stand in for them (NT-3's count sits beside the names, never instead of them)", () => {
    // Why: the count is allowed beside the names, so what matters is that the names
    // survive a surface that also counts.
    const built = drawn(asking(questionRow(3), NAMES.map((name) => named(name))))
    const part = confirmationPartOf(built)

    const eachHasItsOwn = NAMES.every((name) => nodesReadingExactly(part, name).length > 0)
    expect(eachHasItsOwn, 'a count may not stand in for the names').toBe(true)
  })

  it('GIVEN twelve things would go WHEN the question is drawn THEN every one of them reaches the surface (there is no cap)', () => {
    const many = Array.from({ length: 12 }, (_unused, index) => named(`task number ${index}`))

    const built = drawn(asking(questionRow(4), many))
    const part = confirmationPartOf(built)

    for (const item of many) {
      const name = item.name ?? ''
      expect(
        nodesReadingExactly(part, name).length,
        `"${name}" reached the screen`,
      ).toBeGreaterThanOrEqual(1)
    }
  })

  // Spec: IMPS-260
  it('GIVEN a thing that goes is drawn on ANOTHER task group WHEN the question is drawn THEN the flag reaches the drawn surface, on the item it belongs to', () => {
    // Why: the flag must survive to the drawn surface on its own item, the half that
    // has to be in place before a mark can be drawn and would rot silently.
    const question = questionRow(1)
    const here = 'foundation work'
    const elsewhere = 'steel delivery'

    // Step: the flag reaches the surface at all: the same question, drawn twice.
    const unmarked = serialize(confirmationPartOf(drawn(asking(question, [named(elsewhere, false)]))))
    const marked = serialize(confirmationPartOf(drawn(asking(question, [named(elsewhere, true)]))))
    expect(marked, 'FR-032: the flag reached the drawn surface').not.toBe(unmarked)

    // Step: the flag reaches its own item: two items, the flag moved from one to the other.
    // Why: a surface that answered the flag once, over the list, comes out identical both ways.
    const onTheFirst = serialize(
      confirmationPartOf(drawn(asking(question, [named(here, true), named(elsewhere, false)]))),
    )
    const onTheSecond = serialize(
      confirmationPartOf(drawn(asking(question, [named(here, false), named(elsewhere, true)]))),
    )
    expect(onTheSecond, 'FR-032: the flag belongs to the item, not to the list').not.toBe(
      onTheFirst,
    )
  })

  // Spec: IMPS-263
  it('GIVEN a thing that goes is drawn on ANOTHER task group WHEN the question is drawn THEN the WORD the dictionary holds for that mark is on the surface (FR-032 MUST)', () => {
    // Why: the mark is owed to the reader, so the dictionary's word must be on the
    // surface, and only where the flag is set, so the unmarked twin is asked too.
    const question = questionRow(1)

    const marked = shownText(
      confirmationPartOf(drawn(asking(question, [named('steel delivery', true)]))),
    )
    const unmarked = shownText(
      confirmationPartOf(drawn(asking(question, [named('steel delivery', false)]))),
    )

    expect(marked, 'FR-032 (MUST): the mark is a word, and it reached the reader').toContain(
      SHOWN_ON_ANOTHER_TASK_GROUP_MARK,
    )
    expect(unmarked, 'FR-032: nothing is marked where the flag is not set').not.toContain(
      SHOWN_ON_ANOTHER_TASK_GROUP_MARK,
    )
  })

  it('⭐ GIVEN forty things would go WHEN the question is drawn THEN BOTH answers are still there, still live, and still reachable (NT-7 MUST)', () => {
    // Why: the two MUSTs read together: a long list may not crowd out, disable or
    // silence the answers, and CD-2 makes such a list ordinary.
    const many = Array.from({ length: 40 }, (_unused, index) => named(`task number ${index}`))

    const built = drawn(asking(questionRow(3), many))
    const part = confirmationPartOf(built)

    expect(answerKeysIn(part), 'both answers stand, in the dictionary order').toEqual(ANSWER_KEYS)

    ANSWER_KEYS.forEach((answer, index) => {
      const node = answerNodeFor(part, answer)
      expect(isShown(node), `${answer} is on the screen beside forty names`).toBe(true)
      expect(node.disabled, `${answer} may not be disabled`).toBe(false)
      expect(node.hasAttribute('disabled'), `${answer} may not be disabled`).toBe(false)
      expect(node.getAttribute('aria-disabled'), `${answer} may not be disabled`).not.toBe('true')
      expect(
        ask(built, midOfAnswer(index))?.confirmationAnswer,
        `${answer} can still be chosen`,
      ).toBe(answer)
    })
  })

  it('⭐ GIVEN forty things would go WHEN the question is drawn THEN every name is there WHOLE -- the list is not cut short and no name is cut (FR-032 MUST NOT)', () => {
    // Why: the names are long enough that a surface which cut them is caught, and
    // each is read back as the whole string.
    const many = Array.from({ length: 40 }, (_unused, index) =>
      named(`foundation work on the north elevation, phase ${index}`),
    )

    const part = confirmationPartOf(drawn(asking(questionRow(3), many)))

    for (const item of many) {
      const name = item.name ?? ''
      expect(
        nodesReadingExactly(part, name).length,
        `"${name}" is on the screen whole`,
      ).toBeGreaterThanOrEqual(1)
    }
  })

  it('GIVEN a question that takes nothing with it WHEN it is drawn THEN it still stands with both answers (table T-227 DI-4)', () => {
    const question = questionRow(5)

    const built = drawn(asking(question, []))
    const part = confirmationPartOf(built)

    expect(shownText(part)).toContain(sentenceFor(question))
    expect(answerKeysIn(part)).toEqual(ANSWER_KEYS)
  })
})

// Spec: T-023a, PTD-5
describe("table T-023a (MUST) -- a press on the confirmation is not a marquee on the schedule", () => {
  it('GIVEN the confirmation stands over the schedule WHEN a point on it but on no entry is pressed THEN the surface is named and the entry is none', () => {
    // Why: the confirmation holds no ScreenRegions rectangle, so on the surface but off
    // every entry must be an answer, or the press falls through to a marquee.
    const built = drawn(asking(questionRow(0)))

    expect(ask(built, AT.surfaceOnly)).toEqual({
      part: CONFIRMATION,
      entry: null,
      format: null,
      // Why: the confirmation stands against no task group and no person, so both keys
      // are null; neither stands in for the document holding none.
      taskGroupId: null,
      resourceUid: null,
      dividerPanel: null,
      noticeDismissKey: null,
    })
  })

  it('GIVEN the confirmation stands WHEN the bare strip between the two answers is pressed THEN the surface is still named', () => {
    const built = drawn(asking(questionRow(0)))

    expect(ask(built, AT.betweenTheAnswers)).toEqual({
      part: CONFIRMATION,
      entry: null,
      format: null,
      taskGroupId: null,
      resourceUid: null,
      dividerPanel: null,
      noticeDismissKey: null,
    })
  })

  it('GIVEN the confirmation stands WHEN a point where the schedule is exposed is pressed THEN nothing is on it and PTD-5 may run', () => {
    const built = drawn(asking(questionRow(0)))

    expect(ask(built, AT.scheduleExposed)).toBeNull()
  })

  it('GIVEN no question was raised WHEN the place the surface would have stood is pressed THEN nothing is on it', () => {
    const built = drawn(viewWith({ confirmation: null }))

    expect(ask(built, AT.surfaceOnly)).toBeNull()
  })
})

// Spec: T-065, IF-9, NT-7, U-55
describe('table T-065 IF-9 -- which UI part and which answer the point is on', () => {
  it('GIVEN both answers are drawn WHEN each is pressed THEN the part is the settled name of U-55 and the answer is that key of the dictionary', () => {
    const built = drawn(asking(questionRow(1)))

    ANSWER_KEYS.forEach((answer, index) => {
      expect(ask(built, midOfAnswer(index)), answer).toEqual({
        part: CONFIRMATION,
        // Why: NT-7 refuses the answers a row of T-109, so entry is empty and the answer travels alone.
        entry: null,
        format: null,
        // Why: the answers are keyed by nothing else: what the telling carries is already
        // in the description, so neither key turns this press into a command.
        taskGroupId: null,
        resourceUid: null,
        dividerPanel: null,
        noticeDismissKey: null,
        confirmationAnswer: answer,
      })
    })
  })

  it('GIVEN both answers are drawn WHEN each is pressed THEN neither answers with the other key', () => {
    const built = drawn(asking(questionRow(1)))

    const answered = ANSWER_KEYS.map(
      (_unused, index) => ask(built, midOfAnswer(index))?.confirmationAnswer ?? null,
    )

    expect(answered).toEqual(ANSWER_KEYS)
    expect(new Set(answered).size).toBe(ANSWER_KEYS.length)
  })

  it('GIVEN both answers are drawn WHEN what was answered is held against the tree THEN the unit answers only what it itself drew (the MUST under table T-065)', () => {
    const built = drawn(asking(questionRow(1)))
    const part = confirmationPartOf(built)

    const answered = ANSWER_KEYS.map(
      (_unused, index) => ask(built, midOfAnswer(index))?.confirmationAnswer ?? null,
    )

    expect(answered).toEqual(answerKeysIn(part))
  })

  it('GIVEN a point on an entry edge WHEN the unit is asked what is on it THEN it hands that very point to the host and measures no box of its own', () => {
    // Why: R3.4 binds whoever owns the rectangle and this unit owns none, so the case
    // asks only that the point reaches the host unchanged and no box is measured.
    const built = drawn(asking(questionRow(1)))
    const box = ANSWER_BOXES[0]
    if (box === undefined) throw new Error('this file placed no answer')

    for (const point of edgesOf(box)) {
      const askedBefore = built.world.pointQueries.length
      const measuredBefore = built.world.measured.length

      ask(built, point)

      expect(
        built.world.pointQueries.slice(askedBefore),
        `${point.x},${point.y} reached the host as it stands`,
      ).toContainEqual({ member: expect.any(String), x: point.x, y: point.y })
      expect(
        built.world.measured.length - measuredBefore,
        'the edge is the host to decide: no box of its own is measured',
      ).toBe(0)
    }
  })

  it('GIVEN the host has landed a point on a node WHEN the unit answers THEN the answer is the entry that node belongs to, neither widened nor narrowed (the MUST under table T-065)', () => {
    // Why: the expectation is read back off the host, never computed from the boxes,
    // so this file's own arithmetic proves nothing either way.
    const built = drawn(asking(questionRow(1)))
    const box = ANSWER_BOXES[0]
    if (box === undefined) throw new Error('this file placed no answer')

    const points = [
      ...ANSWER_KEYS.map((_unused, index) => midOfAnswer(index)),
      ...edgesOf(box),
      AT.surfaceOnly,
      AT.betweenTheAnswers,
    ]

    for (const point of points) {
      const landedOn = hostLanding(built, point)
      const where = `${point.x},${point.y}`
      expect(landedOn, `${where}: the host landed on nothing at all`).not.toBeNull()
      const inside = confirmationPartOf(built).contains(landedOn as FakeElement)
      const pressed = (landedOn as FakeElement).closest('[data-confirmation-answer]')

      const answer = ask(built, point)

      expect(answer?.confirmationAnswer ?? null, where).toBe(
        pressed?.getAttribute('data-confirmation-answer') ?? null,
      )
      expect(answer?.part ?? null, where).toBe(inside ? CONFIRMATION : null)
    }
  })

  it('GIVEN the answer is read WHEN it is inspected THEN it carries every member `ScreenPart` declares and nothing else', () => {
    const built = drawn(asking(questionRow(1)))

    const answer = ask(built, midOfAnswer(0))

    expect(answer).not.toBeNull()
    // Why: the roster is written down, not derived: ScreenPart leaves nothing at run
    // time, so only a kept list notices a member being dropped.
    expect(Object.keys(answer ?? {}).sort()).toEqual([
      'confirmationAnswer',
      'dividerPanel',
      'entry',
      'format',
      'noticeDismissKey',
      'part',
      'resourceUid',
      'taskGroupId',
    ])
  })

  it('GIVEN the question is taken away WHEN the same point is pressed again THEN the entry stops answering (the answer comes from what is drawn NOW)', () => {
    const built = wire()
    surfaceOf(built).showScreenView(asking(questionRow(0)))
    expect(ask(built, midOfAnswer(0))?.part).toBe(CONFIRMATION)

    surfaceOf(built).showScreenView(viewWith({ confirmation: null }))

    expect(ask(built, midOfAnswer(0))).toBeNull()
  })

  it('GIVEN nothing has been drawn yet WHEN a point on the surface is asked about THEN nothing is on it (BO-1 of table T-077)', () => {
    const built = wire()

    expect(ask(built, midOfAnswer(0))).toBeNull()
  })

  it('GIVEN a point is asked about WHEN the tree is compared before and after THEN nothing was written (reading a point is not a redraw)', () => {
    const built = drawn(asking(questionRow(1)))
    const before = serialize(built.root())

    ask(built, midOfAnswer(0))
    ask(built, AT.surfaceOnly)

    expect(serialize(built.root())).toBe(before)
    expect(built.world.markupWrites, 'FR-023: no markup was written').toEqual([])
  })
})
