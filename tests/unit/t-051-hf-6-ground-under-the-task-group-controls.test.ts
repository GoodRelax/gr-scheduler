// Unit tests: the ground HF-6 lays under a task group's controls, and FR-029's faint entrance on every surface.

import { readRepoFile } from '../spec-files'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import type {
  AppHeaderItems,
  CommandItem,
  CommandPalette,
  PaletteGroup,
  TaskGroupExpander,
  TaskGroupTitle,
  ScreenFrame,
  ScreenSurface,
  ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'
import type { ScreenRect } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import {
  SETTINGS_CONSTANTS,
} from '../../src/entity/document-model/document-settings/document-settings'
import {
  domScreenSurface,
  type ScreenSurfaceWiring,
  type ScreenTheme,
} from '../../src/framework/dom-screen-surface/dom-screen-surface'
// Why: borrowed from the contract tests on purpose: it reads the .md at run time, so a
// value that moves in a table moves here too.
import { bare, specTable, unbroken } from '../contract/spec-table'
import { taskGroupNameFont } from '../fixtures/task-group-name-font'
import { emptyScreenSession } from '../../src/use-case/advance-screen-session/advance-screen-session'

const rowOf = (table: string, id: string) => {
  const found = specTable(table).rows.find((one) => one.id === id)
  if (found === undefined) throw new Error(`table ${table} has no row ${id}`)
  return found
}

const HF_6 = rowOf('T-051', 'HF-6').cells.join(' ')

// Spec: LF-16, HF-1
const LATTICE = (() => {
  const px = (id: string): number => Number(/-?\d+(?:\.\d+)?/.exec(bare(rowOf('T-206', id).by['既定'] ?? ''))?.[0])
  return 2 * (px('S-138') + px('S-243') * 2) * px('S-235')
})()

// Why: the whole file and not the one requirement, because nothing here parses Chapter 1-4
// into requirements; the premises ask only that the sentences are still in it.
const FR_029_TEXT = unbroken(readRepoFile(
  join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
  'utf8',
))

const IC_HEADER = 'IC-20'
const IC_PALETTE = 'IC-61'
const IC_TASK_GROUP_OPEN = 'IC-58'
const IC_OPEN_EVERY_TASK_GROUP = 'IC-74'
const IC_CLOSE_EVERY_TASK_GROUP = 'IC-78'

const nameOf = (row: string): string => bare(rowOf('T-103', row).by['確定名（英）'] ?? '')
const U_23 = nameOf('U-23')
const U_26 = nameOf('U-26')

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

// Summary: One row of table T-236 for this rendering, its hue letter H filled in from S-73 as the table writes it.
function t236(specTableRowId: string): string {
  const row = rowOf('T-236', specTableRowId)
  const cell = bare(row.by[THEME.preference === 'dark' ? '暗いテーマ' : '明るいテーマ'] ?? '')
  if (!/^(#|hsl\(|rgba?\()/.test(cell)) {
    throw new Error(`表 T-236 ${specTableRowId} states no color for this rendering: ${cell}`)
  }
  return cell.replace('H', String(THEME.hue)).replace(/\s+/g, '').toLowerCase()
}

const S_150 = t236('S-150')
const S_149 = t236('S-149')

// Why: FR-041 has one root declaration carry table T-236, so a part names its colour and is
// resolved here; no var() fallback is honoured, since FR-041 forbids one.
function resolved(built: Stage, written: string): string {
  const flat = written.trim().toLowerCase()
  const named = /^var\((--[a-z0-9-]+)\)$/.exec(flat)
  if (named === null) return flat.replace(/\s+/g, '')
  const property = named[1] as string
  return (styleMap(built.root()).get(property) ?? `(the root declares no ${property})`)
    .replace(/\s+/g, '')
    .toLowerCase()
}

const paintedColor = (built: Stage, element: FakeElement): string =>
  resolved(built, styleMap(element).get('color') ?? '')

// Why: several spellings, because no row settles whether a ground is a background or an
// SVG fill; reading all keeps the cases about the rule, not about a spelling.
function paintedGround(built: Stage, element: FakeElement): string {
  const style = styleMap(element)
  for (const property of ['background-color', 'background', 'fill']) {
    const written = style.get(property)
    if (written !== undefined && written.trim() !== '') return resolved(built, written)
  }
  const attribute = element.getAttribute('fill')
  return attribute === null ? '' : resolved(built, attribute)
}

function serialize(element: FakeElement): string {
  const attributes = [...element.attributes].map(([name, value]) => ` ${name}="${value}"`).join('')
  const style = inlineStyle(element)
  return `<${element.tagName.toLowerCase()}${attributes}${style === '' ? '' : ` style="${style}"`}>`
}

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
  isChosen: false,
  label: patch.icon,
  ...patch,
})

const TASK_GROUP_TITLE_INDENT = SETTINGS_CONSTANTS['taskGroupTitleIndent'] as number

const TASK_GROUP_BOX = rect(0, 40, 170, 29)

const taskGroupTitle = (patch: Partial<TaskGroupTitle> & { taskGroupId: string }): TaskGroupTitle => ({
  depth: patch.depth ?? 1,
  ...taskGroupNameFont(patch.depth ?? 1),
  indentPx: (patch.depth ?? 1) * TASK_GROUP_TITLE_INDENT,
  box: TASK_GROUP_BOX,
  label: patch.taskGroupId,
  wholeLabel: patch.taskGroupId,
  isLabelTruncated: false,
  // Why: the neutral fixture carries the three controls with none armed, because HF-1 puts
  // them on every task group and having nothing to fold is a state, not their absence.
  expander: { canOpen: false, canClose: false, canCloseBelow: false },
  isPinned: false,
  isSelected: false,
  ...patch,
})

const EVERY_CONTROL: TaskGroupExpander = { canOpen: true, canClose: true, canCloseBelow: true }

const NOTHING_TO_OPEN: TaskGroupExpander = { canOpen: false, canClose: true, canCloseBelow: true }

const NOTHING_TO_FOLD: TaskGroupExpander = { canOpen: false, canClose: false, canCloseBelow: false }

const paletteWith = (commands: readonly CommandItem[]): CommandPalette =>
  ({
    at: { x: 400, y: 300 },
    grabBandHeight: 12,
    minimize: command({ icon: 'IC-75' }),
    isMinimized: false,
    groups: [{ name: 'PaletteGroupWordHere', commands } as PaletteGroup],
    armedText: 'ArmedWordHere',
  }) as CommandPalette

const HEADER_HEIGHT = { 'App Header': 37 }

function drawn(view: ScreenView): Stage {
  const built = wire(HEADER_HEIGHT)
  surfaceOf(built).showScreenView(view)
  return built
}

const oneTaskGroup = (expander: TaskGroupExpander = EVERY_CONTROL, taskGroupId = 'TaskGroupAlpha'): ScreenView =>
  viewWith({
    taskGroupPanel: { pinnedTitles: [], titles: [taskGroupTitle({ taskGroupId, expander })] },
  })

const whatWasDrawn = (part: FakeElement): string =>
  selfAndDescendants(part)
    .map((one) => {
      const named =
        one.getAttribute('data-role') ?? one.getAttribute('data-icon') ?? one.tagName.toLowerCase()
      return `${named}{${inlineStyle(one)}}`
    })
    .join(' ; ')

function iconEntry(root: FakeElement, icon: string): FakeElement {
  const found = selfAndDescendants(root).filter((one) => one.getAttribute('data-icon') === icon)
  const first = found[0]
  if (first === undefined) {
    throw new Error(`nothing carries data-icon="${icon}": ${whatWasDrawn(root)}`)
  }
  return first
}

// Why: found from the controls up, because no attribute names a task group; the task group
// is the highest node under the tree that still holds its controls.
function taskGroupElement(built: Stage): FakeElement {
  const tree = oneByRole(built.root(), U_23)
  const control = iconEntry(tree, IC_TASK_GROUP_OPEN)
  let at: FakeElement = control
  while (at.parentNode !== null && at.parentNode !== tree) at = at.parentNode
  return at
}

// Trap: counting the task group itself breaks the count below: its strip of the panel is
// painted S-150 in its own right, and HF-6 asks for a ground within the task group.
const bandsIn = (built: Stage, row: FakeElement): FakeElement[] =>
  descendants(row).filter((one) => paintedGround(built, one) === S_150)

const rowsOf = (tree: FakeElement): FakeElement[] => tree.children

// Spec: HF-6, HF-19
// Why: the fake lays nothing out, so the ground is read as written: pinned to the task group top and as
// tall as the task group box or the lattice, whichever is lower down; a max() of the two counts as both.
function reachesTheLowerBottom(node: FakeElement, taskGroupHeightPx: number, latticePx: number): boolean {
  const style = styleMap(node)
  if (!/^0(px)?$/.test((style.get('top') ?? '').replace(/\s+/g, ''))) return false
  const height = (style.get('height') ?? '').replace(/\s+/g, '')
  const want = Math.max(taskGroupHeightPx, latticePx)
  const pxOf = (term: string): number => {
    if (term === '100%') return taskGroupHeightPx
    const found = /^(-?\d+(?:\.\d+)?)px$/.exec(term)
    return found === null ? Number.NaN : Number(found[1])
  }
  const max = /^max\((.+),(.+)\)$/.exec(height)
  const reached = max === null ? pxOf(height) : Math.max(pxOf(max[1] ?? ''), pxOf(max[2] ?? ''))
  if (Number.isFinite(reached)) return reached >= want - 1e-3
  const pinnedToBottom = /^0(px)?$/.test((style.get('bottom') ?? '').replace(/\s+/g, ''))
  return pinnedToBottom && taskGroupHeightPx >= latticePx - 1e-3
}

// Why: two readings, because a box reaches the right edge either by being pinned to it or
// by a left edge and a width that add up to it.
function reachesTheTaskGroupsRightEdge(node: FakeElement, taskGroupWidthPx: number): boolean {
  const style = styleMap(node)
  const right = (style.get('right') ?? '').replace(/\s+/g, '')
  if (/^0(px)?$/.test(right)) return true
  const left = Number.parseFloat((style.get('left') ?? '').replace(/[^\d.-]/g, ''))
  const width = Number.parseFloat((style.get('width') ?? '').replace(/[^\d.-]/g, ''))
  return Number.isFinite(left) && Number.isFinite(width) && left + width === taskGroupWidthPx
}

// Spec: IMPS-1110, IMPS-1116
describe('the manuscripts still say what these cases read', () => {
  it('⭐ was really driven by the manuscripts, and not by a hollow read of them', () => {
    // Why: without this, a parse that picked up the wrong column would make every case below
    // agree with anything.
    expect(U_23).toBe('Task Group Title Tree')
    expect(U_26).toBe('Command Palette')
    expect(S_150.length).toBeGreaterThan(0)
    expect(S_149.length).toBeGreaterThan(0)
    // Why: two rows that painted alike would make every case below pass on either colour.
    expect(S_150, '表 T-236: the ground and the rule color are two colors').not.toBe(S_149)
  })

  it('⛔ HF-6 still asks for ONE ground, in S-150, down to the lower of the task group and the lattice, and counts it as the group', () => {
    expect(HF_6).toContain('ボタンを描いている間、`GRS` は、ボタンの下に地を 1 枚敷くこと。')
    expect(HF_6).toContain('`S-150`')
    expect(HF_6).toContain('`GRS` は、ボタンごとに別々の地を敷かないこと。')
    expect(HF_6).toContain('`GRS` は、地を敷く範囲を、いちばん左のボタンの左端からタスクグループの右端までとし、縦はタスクグループの上端から、タスクグループの下端と格子（`HF-1`）の下端のうち下にあるほうまでとすること。')
    expect(HF_6).toContain('`GRS` は、`HF-6` の「群」を地の範囲とし、ボタンとボタンのあいだの地の上も群の上に数えること。')
  })

  it('⛔ FR-029 still names S-149 for the faintness, and still forbids disabling', () => {
    const fr029 = FR_029_TEXT
    expect(fr029).toContain('`GRS` は、入口の薄さを `_assets/tbl-settings.md` の 表 T-236 の `S-149` の色で示すこと。')
    // Why: a unit still painting S-148 would paint a colour that reads as an entrance that
    // can be used.
    expect(fr029).toContain('`GRS` は、入口の薄さに `S-148` を使わないこと。')
    expect(fr029).not.toContain('`S-148` の色で示すこと（MUST）')
    expect(S_149, '表 T-236: S-148 and S-149 are two colors').not.toBe(t236('S-148'))
    expect(fr029).toContain('`GRS` は、薄く描いた入口を、宿主の意味で無効にしないこと。')
    expect(fr029).toContain('`GRS` は、載る面によって薄くしない入口を持たないこと。')
  })

  it('the task group these cases draw really carries its controls', () => {
    const built = drawn(oneTaskGroup())
    expect(isShown(iconEntry(taskGroupElement(built), IC_TASK_GROUP_OPEN))).toBe(true)
  })
})

// Spec: HF-6
describe('表 T-051 HF-6 -- the ground laid under a task group’s controls', () => {
  it('⛔ MUST: a ground is laid, and it is painted S-150', () => {
    const built = drawn(oneTaskGroup())
    const row = taskGroupElement(built)

    expect(
      bandsIn(built, row).length,
      `HF-6 (MUST): 操作子の下に地を 1 枚敷くこと -- nothing inside the task group is painted ${S_150}: ${whatWasDrawn(row)}`,
    ).toBeGreaterThan(0)
  })

  it('⛔ MUST NOT: it is ONE ground, and not one per control', () => {
    // Why: written down because the MUST NOT is the easier thing to build: painting each
    // control is one declaration where a band is a node.
    const built = drawn(oneTaskGroup())
    const row = taskGroupElement(built)

    expect(
      bandsIn(built, row).length,
      `HF-6 (MUST NOT): 操作子ごとに別々の地を敷いてはならない: ${whatWasDrawn(row)}`,
    ).toBe(1)
  })

  // Spec: HF-6, HF-5
  it('⛔ MUST: it reaches the lower of the TASK GROUP bottom and the lattice bottom, not a control', () => {
    const built = drawn(oneTaskGroup())
    const row = taskGroupElement(built)
    const band = bandsIn(built, row)[0]
    if (band === undefined) throw new Error(`no ground was laid: ${whatWasDrawn(row)}`)

    expect(
      reachesTheLowerBottom(band, TASK_GROUP_BOX.height, LATTICE),
      `HF-6 (MUST): the task group (${TASK_GROUP_BOX.height}px) or the lattice, whichever is lower: ${serialize(band)}`,
    ).toBe(true)
  })

  it('⛔ MUST: on a task group lower than the lattice it reaches the lattice bottom, over the task group below (HF-19)', () => {
    const short = rect(0, 40, 170, 21.625)
    const built = drawn(
      viewWith({
        taskGroupPanel: { pinnedTitles: [], titles: [taskGroupTitle({ taskGroupId: 'TaskGroupAlpha', expander: EVERY_CONTROL, box: short })] },
      }),
    )
    const row = taskGroupElement(built)
    const band = bandsIn(built, row)[0]
    if (band === undefined) throw new Error(`no ground was laid: ${whatWasDrawn(row)}`)
    expect(short.height, 'the premise: this task group is lower than the lattice').toBeLessThan(LATTICE)
    expect(
      reachesTheLowerBottom(band, short.height, LATTICE),
      `HF-6 (MUST): down to the lattice (${LATTICE}px): ${serialize(band)}`,
    ).toBe(true)
  })

  it('⭐ the ground is part of the group, so it takes the pointer (HF-6, decision 2 of CR-553)', () => {
    const built = drawn(oneTaskGroup())
    const row = taskGroupElement(built)
    const band = bandsIn(built, row)[0]
    if (band === undefined) throw new Error(`no ground was laid: ${whatWasDrawn(row)}`)
    expect(styleMap(band).get('pointer-events'), `HF-6: the ground between the controls is the group: ${serialize(band)}`).not.toBe('none')
  })

  it('⛔ MUST: it reaches the task group’s right edge', () => {
    const built = drawn(oneTaskGroup())
    const row = taskGroupElement(built)
    const band = bandsIn(built, row)[0]
    if (band === undefined) throw new Error(`no ground was laid: ${whatWasDrawn(row)}`)

    expect(
      reachesTheTaskGroupsRightEdge(band, TASK_GROUP_BOX.width),
      `HF-6 (MUST): タスクグループの右端まで (${TASK_GROUP_BOX.width}px): ${serialize(band)}`,
    ).toBe(true)
  })

  it('⭐ MUST: it reaches the SAME leftmost control whether the task group has anything to fold or not (HF-6 「いちばん左の操作子の左端から」, FR-085 MUST NOT)', () => {
    // Why: every other case draws EVERY_CONTROL, so this one reads the band's left edge on a
    // task group with nothing to fold, where FR-029 still draws the spent control.
    const armed = drawn(oneTaskGroup(EVERY_CONTROL))
    const spent = drawn(oneTaskGroup(NOTHING_TO_FOLD))
    const armedBand = bandsIn(armed, taskGroupElement(armed))[0]
    const spentBand = bandsIn(spent, taskGroupElement(spent))[0]
    if (armedBand === undefined || spentBand === undefined) {
      throw new Error('a task group was drawn without a ground')
    }

    expect(
      reachesTheTaskGroupsRightEdge(spentBand, TASK_GROUP_BOX.width),
      `HF-6 (MUST): タスクグループの右端まで (${TASK_GROUP_BOX.width}px): ${serialize(spentBand)}`,
    ).toBe(true)
    expect(
      inlineStyle(spentBand),
      'the ground starts at a different control when the task group has nothing to fold',
    ).toBe(inlineStyle(armedBand))
  })

  it('⭐ two task groups are two grounds -- the band belongs to a task group and not to the panel', () => {
    // Why: one band across the panel would satisfy one ground while covering task groups whose
    // controls are not drawn at all.
    const built = drawn(
      viewWith({
        taskGroupPanel: {
          pinnedTitles: [],
          titles: [
            taskGroupTitle({ taskGroupId: 'TaskGroupAlpha', expander: EVERY_CONTROL, box: rect(0, 40, 170, 29) }),
            taskGroupTitle({ taskGroupId: 'TaskGroupBeta', expander: EVERY_CONTROL, box: rect(0, 69, 170, 29) }),
          ],
        },
      }),
    )
    const tree = oneByRole(built.root(), U_23)

    const rows = rowsOf(tree)
    expect(rows.length, 'the tree drew the two task groups it was handed').toBe(2)
    expect(
      rows.map((one) => bandsIn(built, one).length),
      `HF-6: one ground per drawn task group: ${whatWasDrawn(tree)}`,
    ).toEqual([1, 1])
  })
})

// Spec: FR-029, S-149
describe('FR-029 (MUST) -- an entrance with nothing to do is painted S-149', () => {
  it('⛔ MUST: on the `App Header`, the faint color is 表 T-236’s S-149', () => {
    const built = drawn(
      viewWith({
        appHeaderItems: {
          ...EMPTY_HEADER,
          commands: [command({ icon: IC_HEADER, isEnabled: false })],
        },
      }),
    )

    expect(
      paintedColor(built, iconEntry(built.root(), IC_HEADER)),
      'FR-029 (MUST): 薄さは 表 T-236 の `S-149` の色で示すこと',
    ).toBe(S_149)
  })

  it('⛔ MUST NOT: the same on the `Command Palette` -- 載る面によって変えない', () => {
    const built = drawn(
      viewWith({ commandPalette: paletteWith([command({ icon: IC_PALETTE, isEnabled: false })]) }),
    )

    expect(
      paintedColor(built, iconEntry(oneByRole(built.root(), U_26), IC_PALETTE)),
      'FR-029 (MUST NOT): 載る面によって薄くしない入口があってはならない',
    ).toBe(S_149)
  })

  it('⛔ MUST NOT: and on a task group’s controls -- the surface CR-306 was raised from', () => {
    // Why: right after startup nothing is folded, so every open control is spent; canOpen
    // false is that task group, and HF-2's control is the entrance with nothing to open.
    const built = drawn(oneTaskGroup(NOTHING_TO_OPEN))
    const row = taskGroupElement(built)

    expect(
      paintedColor(built, iconEntry(row, IC_TASK_GROUP_OPEN)),
      `FR-029 (MUST): the task group control with nothing to open is not painted S-149: ${whatWasDrawn(row)}`,
    ).toBe(S_149)
  })

  it('⛔ MUST: and on the panel’s own two entrances -- IC-74 and IC-78', () => {
    // Why: IC-74 and IC-78 are drawn for the panel, not per task group, which is why FR-029's
    // closing sentence must reach them by name.
    const built = drawn(
      viewWith({
        taskGroupPanel: {
          pinnedTitles: [],
          titles: [taskGroupTitle({ taskGroupId: 'TaskGroupAlpha', expander: EVERY_CONTROL })],
          canOpenEveryTaskGroup: false,
          canCloseEveryTaskGroup: false,
        },
      }),
    )
    const root = built.root()

    for (const icon of [IC_OPEN_EVERY_TASK_GROUP, IC_CLOSE_EVERY_TASK_GROUP]) {
      expect(
        paintedColor(built, iconEntry(root, icon)),
        `FR-029 (MUST): ${icon} has nothing to do and is not painted S-149`,
      ).toBe(S_149)
    }
  })

  it('⭐ and neither is faint while it still has task groups to reach', () => {
    // Why: without this pair, a unit that always painted those two faint would pass the case above.
    const built = drawn(
      viewWith({
        taskGroupPanel: {
          pinnedTitles: [],
          titles: [taskGroupTitle({ taskGroupId: 'TaskGroupAlpha', expander: EVERY_CONTROL })],
          canOpenEveryTaskGroup: true,
          canCloseEveryTaskGroup: true,
        },
      }),
    )
    const root = built.root()

    for (const icon of [IC_OPEN_EVERY_TASK_GROUP, IC_CLOSE_EVERY_TASK_GROUP]) {
      expect(paintedColor(built, iconEntry(root, icon)), `${icon} still has task groups to reach`).not.toBe(
        S_149,
      )
    }
  })

  it('⭐ and an entrance that CAN be used is not painted that color', () => {
    // Why: without this pair, a unit that painted every entrance S-149 would pass the cases above.
    const built = drawn(
      viewWith({
        appHeaderItems: {
          ...EMPTY_HEADER,
          commands: [command({ icon: IC_HEADER, isEnabled: true })],
        },
      }),
    )

    expect(paintedColor(built, iconEntry(built.root(), IC_HEADER))).not.toBe(S_149)
  })

  // Spec: IMPS-1111
  it('⛔ MUST NOT: a faint entrance is never disabled in the host’s own sense', () => {
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
    const rows = drawn(oneTaskGroup(NOTHING_TO_OPEN))

    const entries = [
      iconEntry(header.root(), IC_HEADER),
      iconEntry(palette.root(), IC_PALETTE),
      iconEntry(taskGroupElement(rows), IC_TASK_GROUP_OPEN),
    ]
    for (const entry of entries) {
      expect(
        entry.hasAttribute('disabled'),
        `FR-029 (MUST NOT): 宿主の意味で無効にしてはならない: ${serialize(entry)}`,
      ).toBe(false)
    }
  })
})
