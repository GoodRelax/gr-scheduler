// Unit tests: the screen language reaches the date controls of the Properties Panel.

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
import {
  domScreenSurface,
  type ScreenSurfaceWiring,
  type ScreenTheme,
} from '../../src/framework/dom-screen-surface/dom-screen-surface'
import { bare, specTable } from '../contract/spec-table'
import { emptyScreenSession } from '../../src/use-case/advance-screen-session/advance-screen-session'

const U_25 = ((): string => {
  const row = specTable('T-103').rows.find((one) => one.id === 'U-25')
  if (row === undefined) throw new Error('table T-103 no longer has row U-25')
  return bare(row.by['確定名（英）'] ?? '')
})()

const T_016 = specTable('T-016')

const SHAPE_COLUMN = '入力の型'
const NAME_COLUMN = '列（`GRS JSON`）'

for (const column of [SHAPE_COLUMN, NAME_COLUMN]) {
  if (!T_016.headings.includes(column)) {
    throw new Error(`table T-016 no longer has a ${column} column: ${T_016.headings.join(' | ')}`)
  }
}

const DATE_SHAPE = '日時'

// Why: read and not typed: which rows carry dates is the table's fact, and a typed PR-3
// would keep driving a row the table had moved the dates off.
const DATE_ROW = ((): { readonly id: string; readonly name: string } => {
  const found = T_016.rows.find((row) => (row.by[SHAPE_COLUMN] ?? '').includes(DATE_SHAPE))
  if (found === undefined) {
    throw new Error(`no row of table T-016 states an 入力の型 of ${DATE_SHAPE}`)
  }
  // Why: a cell may name several columns with ` / ` between them (PR-3 is start and finish),
  // so the first is taken as the name of the field.
  const written = (found.by[NAME_COLUMN] ?? '').split('/')
  return { id: found.id, name: bare(written[0] ?? '') }
})()

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
  value = ''
  isMount = false

  constructor(
    tagName: string,
    private readonly world: World,
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

  // Summary: the fake records every innerHTML read and assignment as markup (FR-023) and never obeys one.
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
  root(): FakeElement
}

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
    readClockMs: (): number => built.clockMs,
    onAppHeaderHeightMeasured: (heightPx: number): void => {
      built.reportedHeights.push(heightPx)
    },
    readTheme: (): ScreenTheme => THEME,
  }
}

function wire(heightsByRole: Record<string, number> = {}): Stage {
  const built = stage(heightsByRole)
  built.surface = domScreenSurface(wiringOf(built))
  return built
}

function surfaceOf(built: Stage): ScreenSurface {
  if (built.surface === undefined) throw new Error('the surface was not built')
  return built.surface
}

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

// Why: a tiny selector engine, so that a unit which does query is not failed for it.
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

// Why: a host settles a subtree's language from lang (xml:lang in XML) and nothing else,
// so looking for these two asks whether the language was declared at all.
const LANGUAGE_ATTRIBUTES = ['lang', 'xml:lang'] as const

function declaredLanguage(element: FakeElement): string | null {
  for (const name of LANGUAGE_ATTRIBUTES) {
    const held = element.getAttribute(name)
    if (held !== null && held.trim() !== '') return held.trim()
  }
  return null
}

function languageReaching(from: FakeElement): string | null {
  let at: FakeElement | null = from
  while (at !== null) {
    const held = declaredLanguage(at)
    if (held !== null) return held
    at = at.parentNode
  }
  return null
}

const languagesDeclaredIn = (root: FakeElement): string[] =>
  selfAndDescendants(root)
    .map((one) => declaredLanguage(one))
    .filter((one): one is string => one !== null)

const CONTROL_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT'])

const controlsIn = (panel: FakeElement): FakeElement[] =>
  selfAndDescendants(panel).filter((one) => CONTROL_TAGS.has(one.tagName))

function whatWasDeclared(built: Stage): string {
  const declared = selfAndDescendants(built.root())
    .filter((one) => declaredLanguage(one) !== null)
    .map((one) => `${one.tagName}[${one.getAttribute('data-role') ?? '-'}]=${declaredLanguage(one)}`)
  return `every language declared in the tree: ${declared.join(', ') || '(none)'}`
}

const EMPTY_HEADER: AppHeaderItems = {
  documentTitle: null,
  openedFileName: null,
  fileSavedAt: null,
  fileSavedByteLength: null,
  fileNeverSavedText: '',
  commands: [],
  language: 'ja',
}

const EMPTY_FRAME: ScreenFrame = { isFullScreen: false, dividers: [], scrollbars: [] }

const EMPTY_VIEW: ScreenView = {
  language: 'ja',
  frame: EMPTY_FRAME,
  appHeaderItems: EMPTY_HEADER,
  taskGroupPanel: { pinnedTitles: [], titles: [] },
  propertiesPanel: null,
  commandPalette: null,
  openModal: null,
  notices: [],
  confirmation: null,
  tooltips: [],
}

// Why: the seam's own spelling, not the manuscript's: a caller copies the name a published type settled.
const DATE_SHAPE_KIND: PropertyControlKind = 'date'

const controlOf = (
  patch: Partial<PropertyControl> & Pick<PropertyControl, 'key' | 'kind'>,
): PropertyControl => ({
  text: '2026-08-27',
  choices: null,
  min: null,
  max: null,
  // Why: no case here is about the width; it is stated only so the description is a whole one.
  widthInFontSizes: 0,
  ...patch,
})

// Why: the column names are this file's own strings for the seam's key;
// no case reads one as the manuscript's.
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

// Why: no heading is offered (FR-072), and the cast is narrow on purpose: a fixture that made
// a heading member a compile error would take every case in this file down with it.
const panelWith = (fields: readonly PropertyField[]): PropertiesPanel =>
  ({
    showing: 'selection',
    isSubjectGone: false,
    fields,
    commands: [],
  }) as PropertiesPanel

// Why: the App Header must measure to something, or the screen is not drawn.
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

const BOTH_LANGUAGES = ['ja', 'en'] as const

// Spec: FR-038, FR-006, U-25
describe('the manuscript still says what these cases read', () => {
  it('⭐ was really driven by the manuscript, and not by a hollow read of it', () => {
    // Why: without this, a parse that lost the input-type column makes every case below drive a non-date field.
    expect(U_25).toBe('Properties Panel')
    expect(T_016.rows.length, 'table T-016 has rows').toBeGreaterThan(0)
    expect(
      T_016.rows.filter((row) => (row.by[SHAPE_COLUMN] ?? '').includes(DATE_SHAPE)).length,
      'table T-016 still states an 入力の型 of 日付 for at least one row',
    ).toBeGreaterThan(0)
    expect(DATE_ROW.name.length, 'the date row states an item name').toBeGreaterThan(0)
  })
})

// Spec: FR-038
// Why: no case asserts a word: the month names of a calendar are printed by the host, not by GRS,
// so only the declared language is asked, never what the host drew.
describe('FR-038 (MUST) -- the screen language reaches the panel', () => {
  it('⛔ the surface declares a language for the tree it builds', () => {
    // Why: a tree that declares no language leaves every part the host draws inside it,
    // a calendar above all, in whatever language the host guessed.
    for (const language of BOTH_LANGUAGES) {
      const { built } = drawPanel(language)
      expect(
        languagesDeclaredIn(built.root()).length,
        `${language}: ${whatWasDeclared(built)}`,
      ).toBeGreaterThan(0)
    }
  })

  it('⛔ MUST: every control of the date field stands in `ScreenView.language`', () => {
    // Why: the nearest declaration is read, so one on the root and one on the control are both accepted;
    // no table settles where it sits.
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

  it('⛔ MUST: the declaration MOVES when the screen language moves', () => {
    // Why: this separates declared from declared correctly: a tree that always said ja passes the case
    // above at ja and is exactly the defect.
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

  it('⛔ MUST: with no help drawn, no part of the tree stands in a language other than the view\'s', () => {
    for (const language of BOTH_LANGUAGES) {
      const { built } = drawPanel(language)
      const declared = new Set(languagesDeclaredIn(built.root()))
      expect([...declared], `${language}: ${whatWasDeclared(built)}`).toEqual([language])
    }
  })
})
