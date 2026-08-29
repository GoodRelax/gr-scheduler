// MK-13's second half: the name field a double click leaves a person typing in,
// with everything that was already in it chosen.
//
// Unit under test: UF-71 of table T-075 (`dom-screen-surface.ts`, component
// CP-38 of table T-062). It is the side of IF-9 that turns a `ScreenView` into
// nodes, so it is the only side that HAS a field to put the focus in -- the row
// asks for a state of the page, and a description cannot hold one.
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these cases have no node
// in the specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// ---------------------------------------------------------------------------
// ⛔ WHY THIS FILE EXISTS -- THE HOLE IT WAS WRITTEN TO STAND IN
// ---------------------------------------------------------------------------
//
// `MK-13` gained this half on 2026-08-30 (CR-304) and nothing has asked for it
// since: broken on purpose, no case went red. ⭐ And the seam it travels on says
// so itself -- `holdFocusPropertyField` is declared optional, and its own
// declaration records the cost: 「a caller which never passes it leaves MK-13
// half done and neither the compiler nor a reader will say so」.
//
// ---------------------------------------------------------------------------
// THE ROWS THESE CASES REST ON
// ---------------------------------------------------------------------------
//
//   表 T-023 MK-13 「ダブルクリック | 対象ごとに定めること（MUST）—— …タスク（名称
//                  ラベルと本体のどちらでも）＝ プロパティパネルを出し、名称の欄
//                  （表 T-016 の `PR-1`）を編集できる状態にして焦点を置き、既にある
//                  文字をすべて選んだ状態にすること（MUST）（利用者の指示と裁定
//                  2026-08-30）—— 全選択とするのは、利用者の逐語が「容易にタスク名を
//                  変更できるように」であり、打ち直しが 1 手で済むからである」
//                  ⭐ WHICH ROW OF 表 T-016 IS READ OUT OF THAT CELL, never typed.
//   `FR-006`       「プロパティパネルが選択を出しているとき、`GRS` は、表 T-016 の
//                  項目をプロパティパネルに出し、同表が読み取り専用と記した項目を
//                  除いて編集できるようにすること」／「入力の形は同表の「入力の型」
//                  の欄に従うこと（MUST）」 -- why the name is a control a person
//                  can type in at all.
//   `FR-072`       「出す入口は 表 T-023 の `MK-13` と `IC-17` の 2 つである」 -- the
//                  entrance whose second half this is.
//   `SK-19`        「その場の編集を確定する」 -- what a person presses when the
//                  typing is done. ⚠️ Not driven here:
//                  tests/unit/fr-072-the-two-entrances-to-the-panel.test.ts owns
//                  that key.
//
// ---------------------------------------------------------------------------
// ⛔ WRITTEN FROM docs/spec AND NOTHING ELSE (docs/development-rules/
// 04-verification.md section 1). What was read of `src/`: the exported types of
// `screen-renderer.ts` (`AppHeaderItems`, `PropertiesPanel`, `PropertyControl`,
// `PropertyField`, `ScreenFrame`, `ScreenSurface`, `ScreenView`) and the
// exported declarations of `dom-screen-surface.ts` (`domScreenSurface`,
// `ScreenSurfaceWiring`, `ScreenTheme`). ⛔ NO FUNCTION BODY WAS READ.
//
// ⭐ THE SHAPE IS COPIED, NOT INVENTED. The fake browser is
// tests/unit/fr-029-palette-grab-marker.test.ts's and the panel literal is
// tests/unit/fr-006-panel-fields-drawn.test.ts's. ⚠️ TWO THINGS WERE ADDED TO
// THE FAKE, both marked where they stand: a control's chosen text (`select` /
// `setSelectionRange`, which a real `input` answers and MK-13 is about), and the
// wiring member the focus travels on.
//
// ---------------------------------------------------------------------------
// ⭐ WHAT IS DELIBERATELY NOT ASSERTED, AND WHY
// ---------------------------------------------------------------------------
//   1. THAT A DOUBLE CLICK IS WHAT CALLS IT. The press is read by UF-48 and the
//      shell is what joins the two sides, so a case here would be asserting a
//      unit it is not driving.
//      tests/unit/fr-072-the-two-entrances-to-the-panel.test.ts holds the half
//      that can be seen from the loop: the panel goes up, showing that Task.
//      ⛔ THE JOIN ITSELF -- that the shell calls this with `PR-1` when MK-13
//      happens -- IS WATCHED BY NEITHER FILE, and is reported rather than
//      guessed at: `holdFocusPropertyField` is the Framework's own arrangement
//      and no seam of the specification carries it.
//   2. WHICH ELEMENT THE CONTROL IS. FR-006 fixes the FORM of a control (表
//      T-016's 入力の型), not the tag, so these cases ask for the control of the
//      row rather than for an `input`.

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
import { bare, specTable } from '../contract/spec-table'

// ---------------------------------------------------------------------------
// The manuscripts, read at run time rather than copied here (Chapter 1.9 :275).
// ---------------------------------------------------------------------------

const rowOf = (table: string, id: string) => {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

/** Everything MK-13 writes, as one string. */
const MK_13 = rowOf('T-023', 'MK-13').cells.join(' ')

/**
 * The row of 表 T-016 MK-13 names -- read OUT OF MK-13's own cell.
 *
 * ⭐ NOT TYPED (rule 03 section 1): the cell reads 「名称の欄（表 T-016 の
 * `PR-1`）」, so the row id has a home already and this file reads it from there.
 * ⛔ A cell that stopped naming one fails here, in one line, instead of leaving
 * every case below asking about a row nothing points at.
 */
const NAME_ROW = ((): string => {
  const found = /表 T-016 の `(PR-\d+)`/.exec(MK_13)
  if (found === null) throw new Error('表 T-023 MK-13 no longer names a row of 表 T-016')
  return found[1] as string
})()

/** U-25 of 表 T-103 -- the settled name that reaches `data-role`. */
const U_25 = bare(rowOf('T-103', 'U-25').by['確定名（英）'] ?? '')

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

  /**
   * What a browser tells about the text chosen inside this control.
   *
   * ⭐ ADDED FOR MK-13, whose row (MUST) asks for 「既にある文字をすべて選んだ
   * 状態にすること」 -- a real `input` answers both `select()` and
   * `setSelectionRange`, and a fake that answered neither would fail a unit for
   * using either. ⛔ IT DECIDES NOTHING: it records what was asked for, exactly
   * as the rest of this fake records what was written.
   */
  selectionStart: number | null = null
  selectionEnd: number | null = null

  select(): void {
    this.selectionStart = 0
    this.selectionEnd = this.value.length
  }

  setSelectionRange(start: number, end: number): void {
    this.selectionStart = start
    this.selectionEnd = end
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
  /**
   * What `holdFocusPropertyField` handed over, or `null` while it handed nothing.
   *
   * ⭐ MK-13's SECOND HALF TRAVELS HERE. `ScreenSurface` names five members and
   * none of them is a command, so the row's 「焦点を置き…すべて選んだ状態に
   * する」 reaches the drawing side through the wiring instead.
   */
  focusField: ((row: string) => void) | null
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
    focusField: null,
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
    holdFocusPropertyField: (focus: (row: string) => void): void => {
      built.focusField = focus
    },
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
// Descriptions to draw. Every one is a value of `ScreenView` and nothing else.
// The panel literal is tests/unit/fr-006-panel-fields-drawn.test.ts's.
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
 * The name a Task already carries -- ⭐ THE WHOLE POINT OF THE ROW.
 *
 * 「全選択とするのは、利用者の逐語が「容易にタスク名を変更できるように」であり、
 * 打ち直しが 1 手で済むからである」: an empty field would have nothing to choose,
 * so a case driven on one could not tell 「すべて選んだ」 from 「何も選んでいない」.
 * ⚠️ The word is this file's own; no dictionary holds a Task's name.
 */
const THE_NAME_ALREADY_THERE = 'TaskNameAlreadyHere'

/** A second row, so that WHICH row was asked for is a question with two answers. */
const NOTES_ROW = 'PR-2'
const THE_OTHER_VALUE = 'NotesAlreadyHere'

/**
 * ⚠️ `widthInFontSizes` IS THIS FILE'S OWN AND DECIDES NOTHING. FR-006 has the
 * estimating side work the room out, tests/unit/fr-006-panel-typography.test.ts
 * holds that arithmetic, and no case here reads a width.
 */
const controlOf = (
  patch: Partial<PropertyControl> & Pick<PropertyControl, 'key' | 'kind'>,
): PropertyControl => ({
  text: '',
  choices: null,
  min: null,
  max: null,
  widthInFontSizes: 8,
  ...patch,
})

const NAME_FIELD: PropertyField = {
  row: NAME_ROW,
  name: 'name',
  text: THE_NAME_ALREADY_THERE,
  isEditable: true,
  controls: [
    controlOf({
      key: { holder: 'task', uid: 1, column: 'name' },
      kind: 'text',
      text: THE_NAME_ALREADY_THERE,
    }),
  ],
}

const OTHER_FIELD: PropertyField = {
  row: NOTES_ROW,
  name: 'notes',
  text: THE_OTHER_VALUE,
  isEditable: true,
  controls: [
    controlOf({
      key: { holder: 'task', uid: 1, column: 'notes' },
      kind: 'multiline',
      text: THE_OTHER_VALUE,
    }),
  ],
}

const panelWith = (fields: readonly PropertyField[]): PropertiesPanel =>
  ({
    showing: 'selection',
    isSubjectGone: false,
    fields,
    commands: [],
  }) as PropertiesPanel

/** The App Header measures to something, so BO-1's dimension is settled. */
const HEADER_HEIGHT = { 'App Header': 37 }

/** The controls a person edits a field through -- a form element, and nothing else. */
const CONTROL_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT'])

const controlsIn = (panel: FakeElement): FakeElement[] =>
  selfAndDescendants(panel).filter((one) => CONTROL_TAGS.has(one.tagName))

/** Everything a failure needs to be read without opening the unit. */
const whatWasDrawn = (part: FakeElement): string =>
  controlsIn(part)
    .map(
      (one) =>
        `${one.tagName}[value=${JSON.stringify(one.value)} chosen=${one.selectionStart}..${one.selectionEnd}]`,
    )
    .join(' ; ')

/** Draw a panel of the two fields and hand back the stage it was drawn on. */
function drawPanel(fields: readonly PropertyField[] = [NAME_FIELD, OTHER_FIELD]): Stage {
  const built = wire(HEADER_HEIGHT)
  surfaceOf(built).showScreenView(viewWith({ propertiesPanel: panelWith(fields) }))
  return built
}

/** The one control that carries this value, whichever element it turned out to be. */
function controlCarrying(built: Stage, value: string): FakeElement {
  const panel = oneByRole(built.root(), U_25)
  const found = controlsIn(panel).filter((one) => one.value === value)
  const first = found[0]
  if (first === undefined) {
    throw new Error(`no control carries ${JSON.stringify(value)}: ${whatWasDrawn(panel)}`)
  }
  return first
}

/** Ask the drawing side to do MK-13's second half for one row of 表 T-016. */
function askForFocus(built: Stage, row: string): void {
  if (built.focusField === null) {
    throw new Error('the surface handed over no way to place the focus at all')
  }
  built.focusField(row)
}

/** Whether every character this control already held is chosen. */
const wholeValueIsChosen = (control: FakeElement): boolean =>
  control.selectionStart === 0 && control.selectionEnd === control.value.length

// ===========================================================================
// The premises every case below stands on
// ===========================================================================

describe('the manuscript still says what these cases read', () => {
  it('⭐ was really driven by the manuscript, and not by a hollow read of it', () => {
    // ⛔ WITHOUT THIS, A PARSE THAT LOST THE CELL WOULD MAKE EVERY CASE BELOW
    // AGREE WITH ANYTHING -- rule 04 section 2.
    expect(U_25).toBe('Properties Panel')
    expect(NAME_ROW).toBe('PR-1')
    expect(MK_13, 'MK-13 still puts the focus in the name field').toContain(
      '編集できる状態にして焦点を置き',
    )
    expect(MK_13, 'MK-13 still asks for every character to be chosen').toContain(
      '既にある文字をすべて選んだ状態にすること（MUST）',
    )
  })

  it('⛔ the surface really handed a way to place the focus over', () => {
    // ⭐ THE PREMISE THE WHOLE ROW RESTS ON. MK-13 (MUST) asks for a state of the
    // page, and every member of IF-9 is a question -- so if nothing is handed
    // over, the row cannot be carried out at all and every case below would be
    // failing for want of a seam rather than for want of the behaviour.
    expect(drawPanel().focusField).not.toBeNull()
  })

  it('the panel draws a control for each of the two fields', () => {
    const built = drawPanel()
    const panel = oneByRole(built.root(), U_25)
    expect(controlsIn(panel).length, whatWasDrawn(panel)).toBe(2)
  })

  it('nothing is focused, and nothing is chosen, before the row is asked for', () => {
    // ⭐ The premise without which "it took the focus" says nothing.
    const built = drawPanel()
    expect(built.world.activeElement).toBeNull()
    expect(wholeValueIsChosen(controlCarrying(built, THE_NAME_ALREADY_THERE))).toBe(false)
  })
})

// ===========================================================================
// MK-13 (MUST) -- the focus, and everything already there chosen
// ===========================================================================

describe('表 T-023 MK-13 -- 名称の欄を編集できる状態にして焦点を置き、既にある文字をすべて選ぶ', () => {
  it('⛔ MUST: the name field takes the focus', () => {
    // 「名称の欄（表 T-016 の `PR-1`）を編集できる状態にして焦点を置き」.
    const built = drawPanel()

    askForFocus(built, NAME_ROW)

    expect(
      built.world.activeElement,
      'MK-13 (MUST): 名称の欄を編集できる状態にして焦点を置き',
    ).toBe(controlCarrying(built, THE_NAME_ALREADY_THERE))
  })

  it('⛔ MUST: and every character already in it is chosen', () => {
    // 「既にある文字をすべて選んだ状態にすること（MUST）—— 全選択とするのは、利用者
    //   の逐語が「容易にタスク名を変更できるように」であり、打ち直しが 1 手で済むから
    //   である」. ⛔ A focus without the choosing leaves a person deleting the old
    // name character by character, which is the very cost the ruling names.
    const built = drawPanel()

    askForFocus(built, NAME_ROW)

    const control = controlCarrying(built, THE_NAME_ALREADY_THERE)
    expect(
      control.selectionStart,
      `MK-13 (MUST): 既にある文字をすべて選んだ状態に: ${whatWasDrawn(oneByRole(built.root(), U_25))}`,
    ).toBe(0)
    expect(control.selectionEnd, 'to the end of what was already there').toBe(
      THE_NAME_ALREADY_THERE.length,
    )
  })

  it('⭐ the row asked for is the row that answers -- the other field is left alone', () => {
    // ⛔ WITHOUT THIS, A UNIT THAT FOCUSED THE FIRST CONTROL IT DREW WOULD PASS
    // BOTH CASES ABOVE. MK-13 names ONE row of 表 T-016, and the panel prints
    // several (FR-006).
    const built = drawPanel()

    askForFocus(built, NAME_ROW)

    const other = controlCarrying(built, THE_OTHER_VALUE)
    expect(built.world.activeElement).not.toBe(other)
    expect(wholeValueIsChosen(other), 'nothing was chosen in a field nobody asked for').toBe(false)
  })

  it('⭐ and asking for the OTHER row moves both answers to it', () => {
    // The pair that makes the case above a rule about the row rather than about
    // the order the panel happens to draw its fields in.
    const built = drawPanel()

    askForFocus(built, NOTES_ROW)

    const other = controlCarrying(built, THE_OTHER_VALUE)
    expect(built.world.activeElement).toBe(other)
    expect(wholeValueIsChosen(other)).toBe(true)
  })

  it('⛔ the panel is still one a person can type in -- the control is not read-only', () => {
    // FR-006: 「同表が読み取り専用と記した項目を除いて編集できるようにすること」, and
    // MK-13 asks for the field to be 「編集できる状態」 before the focus is put in
    // it. ⛔ A focused field a person cannot type into satisfies the focus half
    // and none of the point.
    const built = drawPanel()

    askForFocus(built, NAME_ROW)

    const control = controlCarrying(built, THE_NAME_ALREADY_THERE)
    expect(control.hasAttribute('readonly')).toBe(false)
    expect(control.hasAttribute('disabled')).toBe(false)
  })
})
