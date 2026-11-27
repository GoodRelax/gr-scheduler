// Unit tests: MK-13's second half, the name field a double click leaves focused with its text chosen.

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

const rowOf = (table: string, id: string) => {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

const MK_13 = rowOf('T-023', 'MK-13').cells.join(' ')

// Trap: a pattern taking the first PR-n in the cell picks the comment box's row, which
// MK-13 prints first; the clause is picked by the field the task's wording names.
const NAME_TASK_GROUP = ((): string => {
  const found = /名称の欄（表 T-016 の `(PR-\d+)`）/.exec(MK_13)
  if (found === null) {
    throw new Error('表 T-023 MK-13 no longer names 名称の欄（表 T-016 の `PR-n`） for a task')
  }
  return found[1] as string
})()

const U_25 = bare(rowOf('T-103', 'U-25').by['確定名（英）'] ?? '')

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

  // Why: FR-023 forbids markup, so an assignment here is recorded and never obeyed.
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

  // Why: a real input answers select() and setSelectionRange, and a fake answering neither
  // would fail a unit for using either; it records what was asked and decides nothing.
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
  // Why: ScreenSurface has no command member, so MK-13's focus reaches the drawing side
  // through the wiring instead.
  focusField: ((row: string) => void) | null
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

  // Why: the assignee list AS-1 opens closes on a press anywhere, so it listens on the document.
  const document = {
    createElement(tagName: string): FakeElement {
      const made = new FakeElement(tagName, world)
      world.created.push(made)
      return made
    },
    addEventListener: (): void => undefined,
    removeEventListener: (): void => undefined,
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

// Why: no case reads a colour back; readTheme is a required member of ScreenSurfaceWiring,
// so the cases need some theme to build the surface, not a particular one.
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
    holdFocusPropertyField: (focus: (row: string) => void): void => {
      built.focusField = focus
    },
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

// Why: a tiny selector engine, so that a unit which did query is not failed for it.
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

// Why: a name already there, because an empty field has nothing to choose and a case on
// one could not tell all chosen from nothing chosen.
const THE_NAME_ALREADY_THERE = 'TaskNameAlreadyHere'

// Why: a second row, so that which row was asked for is a question with two answers.
const NOTES_ROW = 'PR-2'
const THE_OTHER_VALUE = 'NotesAlreadyHere'

// Why: widthInFontSizes is this file's own and decides nothing; FR-006 leaves the width to
// the estimating side, and no case here reads one.
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
  row: NAME_TASK_GROUP,
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

const HEADER_HEIGHT = { 'App Header': 37 }

const CONTROL_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT'])

const controlsIn = (panel: FakeElement): FakeElement[] =>
  selfAndDescendants(panel).filter((one) => CONTROL_TAGS.has(one.tagName))

const whatWasDrawn = (part: FakeElement): string =>
  controlsIn(part)
    .map(
      (one) =>
        `${one.tagName}[value=${JSON.stringify(one.value)} chosen=${one.selectionStart}..${one.selectionEnd}]`,
    )
    .join(' ; ')

function drawPanel(fields: readonly PropertyField[] = [NAME_FIELD, OTHER_FIELD]): Stage {
  const built = wire(HEADER_HEIGHT)
  surfaceOf(built).showScreenView(viewWith({ propertiesPanel: panelWith(fields) }))
  return built
}

function controlCarrying(built: Stage, value: string): FakeElement {
  const panel = oneByRole(built.root(), U_25)
  const found = controlsIn(panel).filter((one) => one.value === value)
  const first = found[0]
  if (first === undefined) {
    throw new Error(`no control carries ${JSON.stringify(value)}: ${whatWasDrawn(panel)}`)
  }
  return first
}

function askForFocus(built: Stage, row: string): void {
  if (built.focusField === null) {
    throw new Error('the surface handed over no way to place the focus at all')
  }
  built.focusField(row)
}

const wholeValueIsChosen = (control: FakeElement): boolean =>
  control.selectionStart === 0 && control.selectionEnd === control.value.length

describe('the manuscript still says what these cases read', () => {
  it('⭐ was really driven by the manuscript, and not by a hollow read of it', () => {
    // Why: without this, a parse that lost the cell would make every case below agree with anything.
    expect(U_25).toBe('Properties Panel')
    expect(NAME_TASK_GROUP).toBe('PR-1')
    // Why: MK-13 prints the comment box's clause first, so this shows the guard above picks a
    // clause rather than the first PR-n it meets.
    expect(MK_13, 'MK-13 still settles the comment box on 本文の欄').toContain(
      '本文の欄（表 T-016 の `PR-21`）',
    )
    expect(NAME_TASK_GROUP, 'the task\'s clause, not the comment box\'s').not.toBe('PR-21')
    expect(MK_13, 'MK-13 still puts the focus in the name field').toContain(
      '`GRS` は、タスク（名称ラベルと本体のどちらでも）のダブルクリックで、プロパティパネルを出し、名称の欄（表 T-016 の `PR-1`）を編集できる状態にして焦点を置くこと。',
    )
    expect(MK_13, 'MK-13 still asks for every character to be chosen').toContain(
      '`GRS` は、タスクのダブルクリックで、名称の欄の既にある文字をすべて選んだ状態にすること。',
    )
  })

  it('⛔ the surface really handed a way to place the focus over', () => {
    // Why: without a handed-over seam the row cannot be carried out, and every case below would
    // fail for want of a seam rather than of the behaviour.
    expect(drawPanel().focusField).not.toBeNull()
  })

  it('the panel draws a control for each of the two fields', () => {
    const built = drawPanel()
    const panel = oneByRole(built.root(), U_25)
    expect(controlsIn(panel).length, whatWasDrawn(panel)).toBe(2)
  })

  it('nothing is focused, and nothing is chosen, before the row is asked for', () => {
    // Why: without this premise, a case finding the field focused says nothing.
    const built = drawPanel()
    expect(built.world.activeElement).toBeNull()
    expect(wholeValueIsChosen(controlCarrying(built, THE_NAME_ALREADY_THERE))).toBe(false)
  })
})

// Spec: MK-13, FR-072
describe('表 T-023 MK-13 -- 名称の欄を編集できる状態にして焦点を置き、既にある文字をすべて選ぶ', () => {
  it('⛔ MUST: the name field takes the focus', () => {
    const built = drawPanel()

    askForFocus(built, NAME_TASK_GROUP)

    expect(
      built.world.activeElement,
      'MK-13 (MUST): 名称の欄を編集できる状態にして焦点を置き',
    ).toBe(controlCarrying(built, THE_NAME_ALREADY_THERE))
  })

  it('⛔ MUST: and every character already in it is chosen', () => {
    // Why: a focus without the choosing leaves a person deleting the old name character by
    // character, the very cost the row's reason names.
    const built = drawPanel()

    askForFocus(built, NAME_TASK_GROUP)

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
    // Why: without this, a unit that focused the first control it drew would pass both cases
    // above; MK-13 names one row and the panel prints several (FR-006).
    const built = drawPanel()

    askForFocus(built, NAME_TASK_GROUP)

    const other = controlCarrying(built, THE_OTHER_VALUE)
    expect(built.world.activeElement).not.toBe(other)
    expect(wholeValueIsChosen(other), 'nothing was chosen in a field nobody asked for').toBe(false)
  })

  it('⭐ and asking for the OTHER row moves both answers to it', () => {
    // Why: the pair makes the case above a rule about the row, not about the order the panel
    // draws its fields in.
    const built = drawPanel()

    askForFocus(built, NOTES_ROW)

    const other = controlCarrying(built, THE_OTHER_VALUE)
    expect(built.world.activeElement).toBe(other)
    expect(wholeValueIsChosen(other)).toBe(true)
  })

  it('⛔ the panel is still one a person can type in -- the control is not read-only', () => {
    // Why: a focused field a person cannot type into satisfies the focus half and none of the point.
    const built = drawPanel()

    askForFocus(built, NAME_TASK_GROUP)

    const control = controlCarrying(built, THE_NAME_ALREADY_THERE)
    expect(control.hasAttribute('readonly')).toBe(false)
    expect(control.hasAttribute('disabled')).toBe(false)
  })
})

const AS_1 = rowOf('T-225', 'AS-1').cells.join(' ')

const ASSIGNEE_ROW = ((): string => {
  const found = /担当の欄（表 T-016 の `(PR-\d+)`）/.exec(AS_1)
  if (found === null) {
    throw new Error('表 T-225 AS-1 no longer names 担当の欄（表 T-016 の `PR-n`）')
  }
  return found[1] as string
})()

const THE_PERSON_ON_IT = 'PersonAlreadyOn'
const THE_OTHER_PERSON = 'PersonNotOnItYet'

// Why: the control carries no text of its own (AS-6), so no case can find this row by a
// value the way controlCarrying finds the others.
const ASSIGNEE_FIELD: PropertyField = {
  row: ASSIGNEE_ROW,
  name: 'assignee',
  text: THE_PERSON_ON_IT,
  isEditable: true,
  controls: [
    controlOf({
      // Why: AS-9 settles that a press of the chooser commits a uid, so the key names the Task
      // and its uid column; no case below reads a commit.
      key: { holder: 'assignment', taskUid: 1, resourceUid: null, column: 'resourceUid' },
      kind: 'choice',
      text: '',
      choices: [THE_PERSON_ON_IT, THE_OTHER_PERSON],
      assignee: {
        people: [
          { name: THE_PERSON_ON_IT, uid: 1, word: THE_PERSON_ON_IT },
          { name: THE_OTHER_PERSON, uid: 2, word: THE_OTHER_PERSON },
        ],
        addWord: '',
        sortEntries: [],
        checkEntries: [],
        seated: [1],
        fieldWord: THE_PERSON_ON_IT,
        candidatesOf: () => [],
      },
    }),
  ],
}

// Spec: AS-1, AS-5, PR-16
// Why: AS-1 asks the same for a chooser row, which may hold no place for the focus to land;
// the cases above drive a text row and cannot see that.
describe('表 T-225 AS-1 -- 担当の欄を編集できる状態にして焦点を置く', () => {
  it('⭐ was really driven by the manuscript, and not by a hollow read of it', () => {
    // Why: without this, a parse that lost the cell would make every case below agree with anything.
    expect(ASSIGNEE_ROW).toBe('PR-16')
    expect(AS_1, 'AS-1 still puts the focus in the assignee field').toContain(
      '編集できる状態にして焦点を置くこと',
    )
    // Why: AS-1 forbids an editor drawn on the schedule, which makes the panel the only place
    // a focus can land.
    expect(AS_1, 'AS-1 still forbids an in-place editor').toContain(
      '`GRS` は、担当ラベルの上に打ち換える器を置かないこと。',
    )
  })

  it('⛔ MUST: the assignee field takes the focus', () => {
    const built = drawPanel([NAME_FIELD, ASSIGNEE_FIELD])

    askForFocus(built, ASSIGNEE_ROW)

    const active = built.world.activeElement
    expect(active, 'AS-1 (MUST): 担当の欄 ... 焦点を置くこと').not.toBe(null)
    // Why: AS-1 opens the field's list and puts the focus in the filter at its head, so the
    // focus is sought inside the field, not on it.
    let inField = false
    for (let at = active; at !== null; at = at.parentNode) if (at.getAttribute('data-assignee-field') === ASSIGNEE_ROW) inField = true
    expect(inField, 'the focused control stands in the PR-16 assignee field').toBe(true)
    expect(active?.hasAttribute('data-assignee-filter'), 'AS-1 (MUST): the filter of the opened list').toBe(true)
  })

  it('⭐ the row asked for is the row that answers -- the name field is left alone', () => {
    // Why: without this, a unit that focused the first control it drew would pass the case
    // above; AS-1 names one row and the panel prints several (FR-006).
    const built = drawPanel([NAME_FIELD, ASSIGNEE_FIELD])

    askForFocus(built, ASSIGNEE_ROW)

    expect(built.world.activeElement).not.toBe(controlCarrying(built, THE_NAME_ALREADY_THERE))
  })

  it('⛔ the field is still one a person can type in -- the control is not read-only', () => {
    const built = drawPanel([NAME_FIELD, ASSIGNEE_FIELD])

    askForFocus(built, ASSIGNEE_ROW)

    const active = built.world.activeElement
    expect(active === null ? true : active.hasAttribute('readonly')).toBe(false)
    expect(active === null ? true : active.hasAttribute('disabled')).toBe(false)
  })
})
