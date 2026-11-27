// Unit tests: what one Properties Panel field draws -- room for its value, and its chooser.

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
import {
  domScreenSurface,
  type ScreenSurfaceWiring,
  type ScreenTheme,
} from '../../src/framework/dom-screen-surface/dom-screen-surface'
import { bare, specTable } from '../contract/spec-table'
import { emptyScreenSession } from '../../src/use-case/advance-screen-session/advance-screen-session'

const T_206 = specTable('T-206')
const T_201 = specTable('T-201')
const T_016 = specTable('T-016')

function numberIn(written: string, where: string): number {
  const found = /-?\d+(?:\.\d+)?/.exec(written)
  if (found === null) throw new Error(`${where} states no number: ${written}`)
  return Number.parseFloat(found[0] as string)
}

function cellOf(table: ReturnType<typeof specTable>, id: string, heading: string): string {
  const row = table.rows.find((one) => one.id === id)
  if (row === undefined) throw new Error(`table ${table.id} no longer has row ${id}`)
  const held = row.by[heading]
  if (held === undefined) {
    throw new Error(`table ${table.id} no longer has a ${heading} column: ${table.headings.join(' | ')}`)
  }
  return bare(held)
}

const S_197 = numberIn(cellOf(T_206, 'S-197', '既定'), "table T-206's S-197")

const S_30 = numberIn(cellOf(T_201, 'S-30', '既定値'), "table T-201's S-30")

// Why: S-199 is a multiple of the font size, not a px, so adding it to FR-093's
// estimate here leaves the room a ratio.
const S_199 = numberIn(cellOf(T_206, 'S-199', '既定'), "table T-206's S-199")

const S_189_CELL = cellOf(T_206, 'S-189', '既定')

const U_25 = cellOf(specTable('T-103'), 'U-25', '確定名（英）')

// Why: the GRS JSON column names a field; the name the screen shows is the dictionary's (FR-038).
const ITEM_NAME_COLUMN = '列（`GRS JSON`）'

const INPUT_KIND_COLUMN = '入力の型'

function namesIn(cell: string): readonly string[] {
  return [...cell.matchAll(/`([^`]+)`/g)].map((one) => one[1] as string)
}

function rowOf(id: string): Readonly<Record<string, string>> {
  const row = T_016.rows.find((one) => one.id === id)
  if (row === undefined) throw new Error(`table T-016 no longer has row ${id}`)
  return row.by
}

const PR_3_NAMES = namesIn(rowOf('PR-3')[ITEM_NAME_COLUMN] ?? '')
const PR_47_NAMES = namesIn(rowOf('PR-47')[ITEM_NAME_COLUMN] ?? '')

const PR_16_NAME = namesIn(rowOf('PR-16')[ITEM_NAME_COLUMN] ?? '')[0] ?? ''

const PR_16_INPUT_KIND = (rowOf('PR-16')[INPUT_KIND_COLUMN] ?? '').trim()

const CHOICE_WORD = '選択'

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
  // Why: only an input really has a value; it is harmless elsewhere and keeps the fake small.
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

// Why: a tiny selector engine, so a unit that does query is not failed for it.
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

// Why: the split is taken at the half-width advance, not a code range; every string
// here is ASCII, so no case turns on where the boundary falls.
function unitsOf(text: string): number {
  let units = 0
  for (const character of text) {
    const code = character.codePointAt(0) ?? 0
    units += code < 0x0080 || (code >= 0xff61 && code <= 0xff9f) ? 1 : 2
  }
  return units
}

function customProperty(element: FakeElement, name: string): string | null {
  let at: FakeElement | null = element
  while (at !== null) {
    const held = styleMap(at).get(name)
    if (held !== undefined && held.trim() !== '') return held.trim()
    at = at.parentNode
  }
  return null
}

// Summary: The expander shall honour no var() fallback, which would report a length never drawn.
function expandVariables(element: FakeElement, value: string, depth = 0): string | null {
  if (depth > 8) return null
  const named = /var\(\s*(--[a-z0-9-]+)\s*\)/i.exec(value)
  if (named === null) return value
  const held = customProperty(element, named[1] as string)
  if (held === null) return null
  return expandVariables(element, value.replace(named[0] as string, `(${held})`), depth + 1)
}

// Why: a percentage resolves to null, since a share is of the width a person drags
// (FR-052, S-189), which this seam never learns.
function lengthPx(expression: string, emPx: number, basePx: number): number | null {
  const arithmetic = expression
    .trim()
    .toLowerCase()
    .replace(/\bcalc\b/g, '')
    .replace(/([\d.]+)\s*rem\b/g, (_whole, n: string) => `(${Number.parseFloat(n) * basePx})`)
    .replace(/([\d.]+)\s*em\b/g, (_whole, n: string) => `(${Number.parseFloat(n) * emPx})`)
    .replace(/([\d.]+)\s*px\b/g, '($1)')
  if (arithmetic.trim() === '') return null
  if (!/^[\d\s+*/.()-]+$/.test(arithmetic)) return null
  try {
    // eslint-disable-next-line no-new-func -- evaluates arithmetic already checked to hold only digits and operators
    const answer: unknown = new Function(`return (${arithmetic});`)()
    return typeof answer === 'number' && Number.isFinite(answer) ? answer : null
  } catch {
    return null
  }
}

const ROOM_PROPERTIES = ['width', 'min-width', 'inline-size', 'min-inline-size', 'flex-basis']

function statedRoom(element: FakeElement): string[] {
  const declared = styleMap(element)
  const found: string[] = []
  for (const property of ROOM_PROPERTIES) {
    const written = (declared.get(property) ?? '').trim()
    if (written !== '') found.push(`${property}: ${written}`)
  }
  return found
}

interface Room {
  readonly px: number
  readonly statedBy: FakeElement
}

// Why: the nearest box below the panel wins, and a box holding both dates is
// credited to each; the panel is excluded, its width being the reader's (FR-052).
// Why: em resolves against the size FR-006 requires (S-197 x base), so a wrong
// font size fails only in the typography tests.
function roomOf(control: FakeElement, panel: FakeElement, basePx: number): Room | null {
  const emPx = S_197 * basePx
  let walker: FakeElement | null = control
  while (walker !== null && walker !== panel) {
    const here: FakeElement = walker
    const stated = statedRoom(here)
    if (stated.length > 0) {
      const lengths = stated
        .map((one) => {
          const written = one.slice(one.indexOf(':') + 1).trim()
          const expanded = expandVariables(here, written)
          return expanded === null ? null : lengthPx(expanded, emPx, basePx)
        })
        .filter((one): one is number => one !== null)
      if (lengths.length > 0) return { px: Math.max(...lengths), statedBy: here }
      return null
    }
    walker = here.parentNode
  }
  return null
}

function whatWasStated(panel: FakeElement, control: FakeElement): string {
  const chain: string[] = []
  let walker: FakeElement | null = control
  while (walker !== null) {
    const here: FakeElement = walker
    const stated = statedRoom(here)
    chain.push(
      `${here.tagName}[${here.getAttribute('data-role') ?? '-'}]` +
        `{${stated.join('; ') || 'no room stated'}}`,
    )
    if (here === panel) break
    walker = here.parentNode
  }
  return chain.join(' <- ')
}

const CONTROL_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT'])

const controlsIn = (panel: FakeElement): FakeElement[] =>
  selfAndDescendants(panel).filter((one) => CONTROL_TAGS.has(one.tagName))

// Why: candidates are searched over the whole panel, since AS-5's dropdown and
// search may be a text field pointed at a separate list.
const optionsIn = (panel: FakeElement): FakeElement[] =>
  selfAndDescendants(panel).filter((one) => one.tagName === 'OPTION')

const optionValueOf = (option: FakeElement): string =>
  option.getAttribute('value') ?? option.value

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

const viewWith = (patch: Partial<ScreenView>): ScreenView => ({ ...EMPTY_VIEW, ...patch })

// Why: the room is the estimating side's (FR-093 units x S-30, plus S-199), since
// FR-006 forbids the drawing side a coefficient of its own.
const controlOf = (
  patch: Partial<PropertyControl> & Pick<PropertyControl, 'key' | 'kind'>,
): PropertyControl => ({
  text: '',
  choices: null,
  min: null,
  max: null,
  widthInFontSizes: unitsOf(patch.text ?? '') * S_30 + S_199,
  ...patch,
})

// Why: spelled as EX-7 pins a date only so the fixture is the manuscript's; no row
// settles what the panel spells on screen.
const START_TEXT = '2026-08-27'
const FINISH_TEXT = '2026-12-31'

const DATE_FIELD: PropertyField = {
  row: 'PR-3',
  name: PR_3_NAMES.join(' / '),
  text: START_TEXT,
  isEditable: true,
  controls: [controlOf({ key: { holder: 'task', uid: 1, column: 'start' }, kind: 'date', text: START_TEXT })],
}
const DATE_FIELDS: readonly PropertyField[] = [
  DATE_FIELD,
  {
    row: 'PR-47',
    name: PR_47_NAMES.join(' / '),
    text: FINISH_TEXT,
    isEditable: true,
    controls: [controlOf({ key: { holder: 'task', uid: 1, column: 'finish' }, kind: 'date', text: FINISH_TEXT })],
  },
]
const DATE_CONTROLS = DATE_FIELDS.flatMap((one) => one.controls)

// Why: uids share no digit run with the names, so AS-6's check cannot be fooled;
// the last two share a name (AS-8), which is the case AS-9 exists for.
const SEATED_NAME = 'Ariadne'
const TWIN_NAME = 'Bertrand'
const ROSTER_WORDS: readonly string[] = [SEATED_NAME, TWIN_NAME, TWIN_NAME]
const ROSTER_VALUES: readonly string[] = ['4242', '4243', '4244']

const ASSIGNEE_FIELD: PropertyField = {
  row: 'PR-16',
  name: PR_16_NAME,
  text: SEATED_NAME,
  isEditable: true,
  controls: [
    controlOf({
      // Why: the key is minted: PR-16 is not a Task column and no PropertyFieldKey can
      // name it; no case below turns on which key rides along.
      key: { holder: 'task', uid: 1, column: 'assignee' } as unknown as PropertyControl['key'],
      kind: 'choice',
      text: SEATED_NAME,
      choices: ROSTER_WORDS,
      choiceValues: ROSTER_VALUES,
    }),
  ],
}

// Why: no heading is offered (FR-072); the cast keeps whether the type still
// declares one a failing case rather than a compile error.
const panelWith = (fields: readonly PropertyField[]): PropertiesPanel =>
  ({
    showing: 'selection',
    isSubjectGone: false,
    fields,
    commands: [],
  }) as PropertiesPanel

// Why: the App Header must measure to something for BO-1's dimension to settle.
const HEADER_HEIGHT = { 'App Header': 37 }

// Why: bases of this file's own choosing, since the base never reaches this unit.
const BASES = [16, 32]

function drawPanel(fields: readonly PropertyField[]): { built: Stage; panel: FakeElement } {
  const built = wire(HEADER_HEIGHT)
  surfaceOf(built).showScreenView(viewWith({ propertiesPanel: panelWith(fields) }))
  return { built, panel: oneByRole(built.root(), U_25) }
}

// Spec: FR-006, FR-093, S-189, S-30, S-197, S-199, U-25, PR-3, PR-47, PR-16
describe('the manuscript still says what these cases read', () => {
  it('⭐ was really driven by the manuscript, and not by a hollow read of it', () => {
    // Why: a parse that picked up the wrong column would make every case below agree with anything.
    expect(S_197).toBeGreaterThan(0)
    expect(S_197).toBeLessThan(1)
    expect(S_30, "table T-201's S-30 is a coefficient between its own bounds").toBeGreaterThan(0)
    expect(S_30).toBeLessThanOrEqual(1)
    expect(U_25).toBe('Properties Panel')
  })

  it('⛔ S-189 is a share of the width, which is why a share cannot answer this file', () => {
    expect(S_189_CELL).toContain('%')
    expect(S_189_CELL).not.toContain('px')
  })

  it('PR-3 and PR-47 are one row per date (CR-689), and PR-16 is a 選択', () => {
    expect(PR_3_NAMES, 'table T-016 PR-3 writes the start alone').toEqual(['start'])
    expect(PR_47_NAMES, 'table T-016 PR-47 writes the finish alone').toEqual(['finish'])
    expect(PR_16_INPUT_KIND, 'table T-016 PR-16 入力の型').toContain(CHOICE_WORD)
    expect(PR_16_NAME.length).toBeGreaterThan(0)
  })

  it('counts units the way FR-093 does', () => {
    // Why: ten is the date part of the spelling EX-7 pins, counted by FR-093's rule.
    expect(unitsOf(START_TEXT)).toBe(10)
    expect(unitsOf('あ')).toBe(2)
  })
})

// Spec: FR-006, FR-093, NFR-007, S-30, S-186, S-197, EX-7, PR-3, PR-47
describe('FR-006 / FR-093 -- PR-3 and PR-47 give each date the room its digits need', () => {
  it('draws one control per column of the row', () => {
    const { panel } = drawPanel(DATE_FIELDS)
    expect(controlsIn(panel)).toHaveLength(DATE_CONTROLS.length)
  })

  it('⛔ MUST give each control at least the room FR-093 estimates for its text', () => {
    // Why: only what the unit wrote inline is seen; a width set by a style sheet is
    // invisible here, which is this file's blindness: report it, do not tune it.
    const { panel } = drawPanel(DATE_FIELDS)
    const controls = controlsIn(panel)
    expect(controls.length, 'the panel drew controls at all').toBeGreaterThan(0)

    for (const base of BASES) {
      for (let index = 0; index < controls.length; index += 1) {
        const control = controls[index] as FakeElement
        const shown = DATE_CONTROLS[index]?.text ?? ''
        const needed = unitsOf(shown) * (S_197 * base) * S_30
        const room = roomOf(control, panel, base)
        expect(
          room,
          `FR-093 (MUST): nothing this seam can read gives ${JSON.stringify(shown)} a room. ` +
            `A share of the panel is not one -- S-189's note says the width is dragged by the ` +
            `boundary (FR-052). What was stated: ${whatWasStated(panel, control)}`,
        ).not.toBe(null)
        expect(
          (room as Room).px,
          `${JSON.stringify(shown)} needs ${needed}px at a host base of ${base}px; ` +
            `stated by ${(room as Room).statedBy.tagName}. ${whatWasStated(panel, control)}`,
        ).toBeGreaterThanOrEqual(needed)
      }
    }
  })

  it('⛔ MUST NOT hold that room as a px constant', () => {
    // Why: a room that does not double with the base is a constant however it is
    // written (FR-039), and digits held at 16px are cut off at 32px.
    const { panel } = drawPanel(DATE_FIELDS)

    for (const control of controlsIn(panel)) {
      const small = roomOf(control, panel, 16)
      const large = roomOf(control, panel, 32)
      expect(small, whatWasStated(panel, control)).not.toBe(null)
      expect(large, whatWasStated(panel, control)).not.toBe(null)
      expect(
        (large as Room).px / (small as Room).px,
        `the room follows the reader rather than a constant. ${whatWasStated(panel, control)}`,
      ).toBeCloseTo(2, 9)
    }
  })
})

// Spec: FR-008, T-225, AS-5, AS-6, AS-8, AS-9, MG-5, PR-16
describe('表 T-225 AS-5 / AS-6 / AS-9 -- what the drawn assignee field says and hands back', () => {
  it('⛔ AS-5 (MUST) -- the field offers ONE control for the one column it has', () => {
    // Why: one, because PR-16 writes one column name where PR-3 writes two; the count
    // comes from the table, not from a guess about which element a chooser is.
    const { panel } = drawPanel([ASSIGNEE_FIELD])
    expect(controlsIn(panel)).toHaveLength(ASSIGNEE_FIELD.controls.length)
  })

  it('⛔ AS-5 / AS-9 -- every person on the roster is a candidate, same-named ones twice', () => {
    // Why: a chooser that folded the same-named pair to one entry would delete the only
    // route the manuscript has for telling them apart (AS-9, MG-5).
    const { panel } = drawPanel([ASSIGNEE_FIELD])
    const options = optionsIn(panel)

    expect(options).toHaveLength(ROSTER_WORDS.length)
    expect(options.filter((one) => one.textContent.includes(TWIN_NAME))).toHaveLength(2)
  })

  it('⛔ AS-6 (MUST) -- the drawn field names the person who is seated', () => {
    // Why: asked of the drawn tree, not of the description, so a surface that dropped
    // the name on the way to the nodes fails here.
    const { panel } = drawPanel([ASSIGNEE_FIELD])
    expect(panel.textContent).toContain(SEATED_NAME)
  })

  it('⛔ AS-6 (MUST NOT) -- no uid is drawn as a word', () => {
    // Why: text only: a uid in an attribute is AS-9 being kept, not AS-6 broken.
    const { panel } = drawPanel([ASSIGNEE_FIELD])
    for (const uid of ROSTER_VALUES) {
      expect(panel.textContent, `AS-6 (MUST NOT): the uid ${uid} was drawn as a word`).not.toContain(
        uid,
      )
    }
  })

  it('⛔ AS-9 (MUST) -- what a candidate hands back is its uid, not its name', () => {
    // Why: two candidates showing one word must carry two values, or the panel cannot
    // be the route AS-9 says it is.
    const { panel } = drawPanel([ASSIGNEE_FIELD])
    const options = optionsIn(panel)

    expect(options.map((one) => optionValueOf(one))).toEqual([...ROSTER_VALUES])
    expect(
      new Set(options.map((one) => optionValueOf(one))).size,
      'AS-9: two same-named people are told apart by what they hand back',
    ).toBe(ROSTER_VALUES.length)
  })
})

const hasWord = (text: string): boolean => /[\p{L}\p{N}]/u.test(text)

function ownWords(element: FakeElement): string {
  return element.childNodes
    .filter((node): node is FakeText => node instanceof FakeText)
    .map((node) => node.data)
    .join('')
    .trim()
}

// Why: its own text, not textContent, which would answer the same for the panel
// as for its first field; the walk is in document order.
function firstWordsDrawn(panel: FakeElement): string {
  for (const element of descendants(panel)) {
    const own = ownWords(element)
    // Why: punctuation alone is passed over, for the reason the second case states.
    if (hasWord(own)) return own
  }
  return ''
}

// Spec: FR-072, FR-006, T-016
describe('FR-072 (MUST NOT) -- no heading row stands at the head of the panel', () => {
  it('⛔ draws the panel\'s first item first, and nothing above it', () => {
    // Why: no entry is offered, since T-109's IC-52 (IN-4) has no settled place on the panel;
    // with none, whatever stands above the first field is a heading.
    // Why: containment either way, never equality: no row settles whether a colon follows
    // an item name, and a heading is neither part of the name nor made of it.
    const { panel } = drawPanel([DATE_FIELD])
    const first = firstWordsDrawn(panel)
    expect(
      first !== '' && (first.includes(DATE_FIELD.name) || DATE_FIELD.name.includes(first)),
      `FR-072 (MUST NOT): ${JSON.stringify(first)} is drawn above the panel's first item`,
    ).toBe(true)
  })

  it('⛔ writes no word into the panel that no field of it carries', () => {
    // Why: the same rule asked of the whole panel, so a heading moved down instead of
    // dropped is caught too.
    const { panel } = drawPanel([DATE_FIELD])
    const carried = [
      DATE_FIELD.name,
      DATE_FIELD.text,
      ...DATE_FIELD.controls.map((one) => one.text),
    ].filter((one) => one !== '')

    // Why: only text with a letter or a digit is asked about; a separator or bracket
    // is the unit's to add, and failing it would pin a rendering, not the rule.
    for (const drawn of descendants(panel)) {
      const own = ownWords(drawn)
      if (!hasWord(own)) continue
      expect(
        carried.some((word) => own.includes(word) || word.includes(own)),
        `FR-072 (MUST NOT): ${JSON.stringify(own)} is drawn in the panel and no field carries it`,
      ).toBe(true)
    }
  })
})
