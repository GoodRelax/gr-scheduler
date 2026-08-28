// FR-038 and the date controls of the `Properties Panel` -- whether the
// language the screen stands in reaches the parts the HOST draws inside it.
//
// Unit under test: UF-71 of table T-075 (`dom-screen-surface.ts`, component
// CP-38 of table T-062, published as PI-38 of table T-064). It is the side of
// IF-9 that turns a `ScreenView` into nodes, so it is the only side that can
// tell the host anything at all -- `properties-panel.ts` (UF-64) says WHICH
// items the panel holds and makes no node.
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these cases have no node
// in the specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// ⛔ WRITTEN FROM docs/spec AND NOTHING ELSE (docs/development-rules/
// 04-verification.md section 1). What was read of `src/`: `domScreenSurface`,
// `ScreenSurfaceWiring`, `ScreenTheme`, the `ScreenView` family and
// `SETTINGS_DEFAULTS` -- their exported declarations and nothing more.
// ⛔ NO FUNCTION BODY WAS READ.
//
// ⭐ THE SHAPE IS COPIED, NOT INVENTED. The fake browser, `stage` / `wiringOf` /
// `wire` / `surfaceOf` and the tree readers are tests/unit/
// fr-006-panel-typography.test.ts's, which drives this same unit against this
// same fake; the `ScreenView` fixtures are that file's too.
//
// ---------------------------------------------------------------------------
// THE RULES THESE CASES ANSWER TO
// ---------------------------------------------------------------------------
//
//   FR-038      「利用者が表示言語を選んだとき、`GRS` は、メニューとパネルの文字
//               をその言語で示すこと。対象は `ja` と `en` の 2 言語とする。」
//               ⛔ 「**言語の状態は 1 つとし、画面全体に効くこと（MUST）。ヘルプ
//               だけを別の言語にできてはならない（MUST NOT）**」 —— 分けると、
//               ヘルプが説明しているボタン名と画面のボタン名が食い違う。
//   `S-99`      表 T-206: 「`language`（`ja` / `en`）| — | **別枠。**
//               `localStorage` に置く。保存しない規則と理由は `FR-038`」.
//   FR-006      「作成者がタスクを選んだとき、`GRS` は、**表 T-016 の項目**を
//               プロパティパネルに出し…」, and under that table: 「**入力の形は
//               同表の「入力の型」の欄に従うこと（MUST）**」 -- so a row whose
//               入力の型 is 日付 is drawn as a date control, and a date control
//               is what the host hangs a calendar on.
//   表 T-016    the roster itself. The row this file drives is read out of it at
//               run time by its 入力の型 column, never typed.
//   U-25        表 T-103's settled name, which W-4 of 表 T-006a (MUST) carries
//               into the DOM as a `data-role`.
//
// ---------------------------------------------------------------------------
// ⛔ THE INFERENCE THIS FILE MAKES, STATED PLAINLY SO A FAILURE IS NOT MISREAD
// ---------------------------------------------------------------------------
//
// FR-038's dictionary rule -- 「画面に刷る語は、言語ごとの辞書として 1 か所に持つ
// こと（MUST）」 -- governs the words GRS PRINTS, and the month names inside a
// date control's calendar are not among them: the host prints those. ⛔ NO CASE
// HERE ASSERTS A WORD, and none may.
//
// What the cases DO read is the other MUST of the same requirement: 「言語の状態
// は 1 つとし、画面全体に効くこと」. A screen whose date fields open a calendar in
// one language while the rest of the screen stands in the other is a screen
// carrying two language states, which is the reading that MUST exists to refuse
// -- and 「ヘルプだけを別の言語にできてはならない（MUST NOT）」 is the same
// prohibition written for one particular surface.
//
// ⚠️ SO THE CASES ASK WHAT THE SURFACE DECLARED, NEVER WHAT THE HOST DREW. The
// declaration is the one thing this unit can do about it, and the host's own
// language for a subtree is settled by `lang` (or `xml:lang`) and by nothing
// else -- so those two names are the whole of what is looked for. ⛔ If the
// ruling is that the host's calendar stands outside FR-038 altogether, these
// cases are wrong and the manuscript needs the sentence that says so, beside
// FR-038's existing exception for 「タスク名と行名、および表 T-016 の項目名」.
// Reported rather than dropped.
//
// ⭐ WHAT IS DELIBERATELY NOT ASSERTED:
//   1. WHICH WORDS the calendar shows. FR-038's dictionary is for the words GRS
//      prints; these are the host's.
//   2. WHERE the declaration sits. A declaration on the tree's root reaches
//      every control by inheritance and one on the control reaches it directly;
//      no table settles which, so the cases read the NEAREST one reaching each
//      control and accept either.
//   3. THE WIDTH OF THE DATE FIELD. The year-month heading wrapping onto two
//      lines is a second report against the same control, and no row of table
//      T-206 holds a width for a field -- `S-186` is a height and `S-189` a
//      share of the panel. Reported; not guessed at here.

import { describe, expect, it } from 'vitest'

import type {
  AppHeaderItems,
  PropertiesPanel,
  PropertyControl,
  PropertyControlKind,
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
import { bare, specTable } from '../contract/spec-table'

// ---------------------------------------------------------------------------
// The manuscript, read at run time rather than copied here (Chapter 1.9 :275).
// ---------------------------------------------------------------------------

/** U-25 of table T-103 -- the settled name that reaches the DOM as `data-role`. */
const U_25 = ((): string => {
  const row = specTable('T-103').rows.find((one) => one.id === 'U-25')
  if (row === undefined) throw new Error('table T-103 no longer has row U-25')
  return bare(row.by['確定名（英）'] ?? '')
})()

const T_016 = specTable('T-016')

/** The column of table T-016 that says what form an item is edited in. */
const SHAPE_COLUMN = '入力の型'
/** The column that holds the item's own name, which the panel prints as-is. */
// ⭐ THE COLUMN IN THE FILE, WHICH IS WHAT THESE CASES WANTED ALL ALONG.
// Table T-016 carried an 項目名（英語・画面表示） column until CR-278; the
// name the SCREEN shows is now the dictionary's (FR-038, MUST NOT), and
// what stayed in the table is the GRS JSON column. Every use below reads
// the code spans out of it to name a field, which is the column.
const NAME_COLUMN = '列（`GRS JSON`）'

for (const column of [SHAPE_COLUMN, NAME_COLUMN]) {
  if (!T_016.headings.includes(column)) {
    throw new Error(`table T-016 no longer has a ${column} column: ${T_016.headings.join(' | ')}`)
  }
}

/** 表 T-016's word for the form this file is about. */
const DATE_SHAPE = '日付'

/**
 * The first row of table T-016 whose 入力の型 is 日付.
 *
 * ⭐ READ AND NOT TYPED. Which rows carry dates is the table's own fact, and a
 * file that named `PR-3` outright would go on driving a row the table had moved
 * the dates off.
 */
const DATE_ROW = ((): { readonly id: string; readonly name: string } => {
  const found = T_016.rows.find((row) => (row.by[SHAPE_COLUMN] ?? '').includes(DATE_SHAPE))
  if (found === undefined) {
    throw new Error(`no row of table T-016 states an 入力の型 of ${DATE_SHAPE}`)
  }
  // ⚠️ Several columns to a cell, written with ` / ` between them (PR-3 is
  // `start` AND `finish`), so the first is taken as the name of the field.
  const written = (found.by[NAME_COLUMN] ?? '').split('/')
  return { id: found.id, name: bare(written[0] ?? '') }
})()

// ---------------------------------------------------------------------------
// The fake browser. Copied from tests/unit/fr-006-panel-typography.test.ts.
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
 * T-216 at load time. ⭐ No case reads a colour back.
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

/** Wire the unit up the way its contract asks the caller to. */
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
// Reading the tree. Copied from tests/unit/fr-006-panel-typography.test.ts.
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
// Reading the language a subtree was put in
// ---------------------------------------------------------------------------

/**
 * The two attribute names a host reads a subtree's language from.
 *
 * ⭐ NOT A CHOICE THIS FILE MADE. A browser settles which language it draws a
 * date control's calendar in from the element's language, and the element's
 * language is `lang` (with `xml:lang` its XML spelling). There is no third
 * name, so looking for these two is looking for "was the language declared at
 * all", not for one particular way of declaring it.
 */
const LANGUAGE_ATTRIBUTES = ['lang', 'xml:lang'] as const

/** What this node itself declares, or `null`. */
function declaredLanguage(element: FakeElement): string | null {
  for (const name of LANGUAGE_ATTRIBUTES) {
    const held = element.getAttribute(name)
    if (held !== null && held.trim() !== '') return held.trim()
  }
  return null
}

/** The nearest declaration reaching this node, walking upwards. `null` when none does. */
function languageReaching(from: FakeElement): string | null {
  let at: FakeElement | null = from
  while (at !== null) {
    const held = declaredLanguage(at)
    if (held !== null) return held
    at = at.parentNode
  }
  return null
}

/** Every language any node of a tree declares, so a second state is visible. */
const languagesDeclaredIn = (root: FakeElement): string[] =>
  selfAndDescendants(root)
    .map((one) => declaredLanguage(one))
    .filter((one): one is string => one !== null)

/** The controls a person edits a field through -- a form element, and nothing else. */
const CONTROL_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT'])

const controlsIn = (panel: FakeElement): FakeElement[] =>
  selfAndDescendants(panel).filter((one) => CONTROL_TAGS.has(one.tagName))

/** Everything a failure needs to be read without opening the unit. */
function whatWasDeclared(built: Stage): string {
  const declared = selfAndDescendants(built.root())
    .filter((one) => declaredLanguage(one) !== null)
    .map((one) => `${one.tagName}[${one.getAttribute('data-role') ?? '-'}]=${declaredLanguage(one)}`)
  return `every language declared in the tree: ${declared.join(', ') || '(none)'}`
}

// ---------------------------------------------------------------------------
// Descriptions to draw. Every one is a value of `ScreenView` and nothing else.
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

/**
 * `PropertyControlKind`'s member for table T-016's 日付.
 *
 * ⚠️ The SEAM's own spelling and not the manuscript's: the type declares its
 * members against that column, and rule 03 section 1 asks a caller to copy the
 * name a published type already settled rather than mint a second one.
 */
const DATE_SHAPE_KIND: PropertyControlKind = 'date'

const controlOf = (
  patch: Partial<PropertyControl> & Pick<PropertyControl, 'key' | 'kind'>,
): PropertyControl => ({
  text: '2026-08-27',
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
 * The one field these cases drive: the row of table T-016 whose 入力の型 is
 * 日付, drawn with the two controls that row's cell names.
 *
 * ⚠️ The column names are this file's own strings for the seam's `key`, which
 * carries 「どの列を編集しているか」; no case reads one as the manuscript's.
 */
const DATE_FIELD: PropertyField = {
  row: DATE_ROW.id,
  name: DATE_ROW.name,
  text: '2026-08-27',
  isEditable: true,
  controls: [
    controlOf({
      key: { holder: 'task', uid: 1, column: 'start' },
      kind: DATE_SHAPE_KIND,
      text: '2026-08-27',
    }),
    controlOf({
      key: { holder: 'task', uid: 1, column: 'finish' },
      kind: DATE_SHAPE_KIND,
      text: '2026-12-01',
    }),
  ],
}

/**
 * ⛔ NO HEADING IS OFFERED. FR-072 (MUST NOT) refuses the panel one -- 「⛔ **パネ
 * ルの先頭に見出しの行を置いてはならない（MUST NOT）**（利用者の指示 2026-08-27）」
 * (CR-272) -- and this fixture carried one until that row moved.
 *
 * ⚠️ THE CAST IS DELIBERATE AND NARROW: whether the published description still
 * declares a member for a heading is the implementation's answer, and a fixture
 * that turned either answer into a COMPILE error would take every case in this
 * file down with it. Rule 04 section 1 asks a disagreement to arrive as a test
 * that falls, and tests/unit/uf-64.test.ts is where that one falls.
 */
const panelWith = (fields: readonly PropertyField[]): PropertiesPanel =>
  ({
    showing: 'selection',
    isSubjectGone: false,
    fields,
    commands: [],
  }) as PropertiesPanel

/** The App Header measures to something, so the screen is drawn. */
const HEADER_HEIGHT = { 'App Header': 37 }

function drawPanel(language: ScreenView['language']): { built: Stage; panel: FakeElement } {
  const built = wire(HEADER_HEIGHT)
  surfaceOf(built).showScreenView({
    ...EMPTY_VIEW,
    language,
    appHeaderItems: { ...EMPTY_HEADER, language },
    propertiesPanel: panelWith([DATE_FIELD]),
  })
  return { built, panel: oneByRole(built.root(), U_25) }
}

/** FR-038: 「対象は `ja` と `en` の 2 言語とする」. */
const BOTH_LANGUAGES = ['ja', 'en'] as const

// ===========================================================================

describe('the manuscript still says what these cases read', () => {
  it('⭐ was really driven by the manuscript, and not by a hollow read of it', () => {
    // ⛔ WITHOUT THIS, A PARSE THAT LOST THE 入力の型 COLUMN WOULD MAKE EVERY CASE
    // BELOW DRIVE A FIELD THAT IS NOT A DATE -- rule 04 section 2.
    expect(U_25).toBe('Properties Panel')
    expect(T_016.rows.length, 'table T-016 has rows').toBeGreaterThan(0)
    expect(
      T_016.rows.filter((row) => (row.by[SHAPE_COLUMN] ?? '').includes(DATE_SHAPE)).length,
      'table T-016 still states an 入力の型 of 日付 for at least one row',
    ).toBeGreaterThan(0)
    expect(DATE_ROW.name.length, 'the date row states an item name').toBeGreaterThan(0)
  })
})

describe('FR-038 (MUST) -- the screen stands in ONE language, and it reaches the panel', () => {
  it('⛔ the surface declares a language for the tree it builds', () => {
    // 「言語の状態は 1 つとし、画面全体に効くこと（MUST）」. ⭐ A tree that
    // declares no language at all leaves every part the HOST draws inside it --
    // a date control's calendar above all -- standing in whatever the host
    // guessed, which is a second language state by definition.
    for (const language of BOTH_LANGUAGES) {
      const { built } = drawPanel(language)
      expect(
        languagesDeclaredIn(built.root()).length,
        `${language}: ${whatWasDeclared(built)}`,
      ).toBeGreaterThan(0)
    }
  })

  it('⛔ MUST: every control of the date field stands in `ScreenView.language`', () => {
    // 「利用者が表示言語を選んだとき、`GRS` は、メニューとパネルの文字をその言語で
    // 示すこと」, with 「画面全体に効くこと（MUST）」 beside it. ⚠️ The nearest
    // declaration is read, so a language written once on the tree's root and one
    // written on the control itself are both accepted -- no table settles where.
    for (const language of BOTH_LANGUAGES) {
      const { built, panel } = drawPanel(language)
      const controls = controlsIn(panel)
      expect(controls.length, 'the panel drew controls for the date field at all').toBeGreaterThan(0)

      for (const control of controls) {
        const named = control.getAttribute('data-row') ?? control.tagName
        expect(languageReaching(control), `${named} at ${language}: ${whatWasDeclared(built)}`).toBe(
          language,
        )
      }
    }
  })

  it('⛔ MUST: the declaration MOVES when the display language moves', () => {
    // ⭐ THE CASE THAT SEPARATES "declared" FROM "declared correctly". A tree
    // that always said `ja` would satisfy the case above at `ja` and would be
    // exactly the defect: 「英語モードでもカレンダーが日本語のまま」.
    const inJapanese = drawPanel('ja')
    const inEnglish = drawPanel('en')

    const firstControl = (panel: FakeElement): FakeElement => {
      const found = controlsIn(panel)[0]
      if (found === undefined) throw new Error('the panel drew no control for the date field')
      return found
    }

    const japanese = languageReaching(firstControl(inJapanese.panel))
    const english = languageReaching(firstControl(inEnglish.panel))

    expect(japanese).toBe('ja')
    expect(english).toBe('en')
    expect(japanese, 'FR-038 admits two languages, and they are not the same one').not.toBe(english)
  })

  it('⛔ MUST NOT: no part of the tree stands in a language other than the view\'s', () => {
    // 「言語の状態は 1 つとし、画面全体に効くこと（MUST）。ヘルプだけを別の言語に
    // できてはならない（MUST NOT）」 -- the prohibition is about a SECOND state
    // anywhere on the screen, and the help is named as one instance of it.
    for (const language of BOTH_LANGUAGES) {
      const { built } = drawPanel(language)
      const declared = new Set(languagesDeclaredIn(built.root()))
      expect([...declared], `${language}: ${whatWasDeclared(built)}`).toEqual([language])
    }
  })
})
