// DFC-2960 / DFC-2961 bench: a task group carried through the frame loop, each frame drawn by the real DOM surface, read through a small cascade, :hover and stacking reader (HF-15, HF-6).

import type { ScreenView } from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import { ROLE } from '../../src/framework/dom-screen-surface/dom-screen-surface'
import { byRole, resolved, selfAndDescendants, styleMap, surfaceOf, wire, type FakeElement, type Stage } from '../fixtures/fake-browser'
import { bare, specTable } from './spec-table'
import { numberIn, rowOf } from '../unit/cr-541-stage'
import { shell, type Shell } from './cr-772-shell-stage'

export const HUE = 214
export const S_208 = numberIn(rowOf('T-206', 'S-208').by['既定'] ?? '')
export const S_213 = numberIn(rowOf('T-206', 'S-213').by['既定'] ?? '')
export const S_215 = numberIn(rowOf('T-206', 'S-215').by['既定'] ?? '')
export const S_597 = numberIn(rowOf('T-206', 'S-597').by['既定'] ?? '')
export const S_599 = numberIn(rowOf('T-206', 'S-599').by['既定'] ?? '')
export const S_620 = numberIn(rowOf('T-206', 'S-620').by['既定'] ?? '')

// see T-236
// WHY: the light-theme value of a screen colour, solved at HUE, spelled the way fake-browser's resolved() hands a colour back.
export function screenColor(id: string): string {
  const row = specTable('T-236').rows.find((one) => one.id === id)
  if (row === undefined) throw new Error(`table T-236 has no row ${id}`)
  const cell = bare(row.by['明るいテーマ'] ?? '').replace(/`/g, '')
  return cell.replace(/\bH\b/g, String(HUE)).replace(/\s+/g, '').toLowerCase()
}

interface Compound {
  readonly tag: string | null
  readonly attributes: readonly { name: string; value: string | null }[]
  readonly classes: readonly string[]
  readonly ids: readonly string[]
  readonly hover: boolean
  readonly nots: readonly Compound[]
  readonly unknown: boolean
}

interface Selector {
  // WHY: right to left; combinator[i] joins compounds[i] to compounds[i + 1] (the one to its left).
  readonly compounds: readonly Compound[]
  readonly combinators: readonly ('descendant' | 'child')[]
  readonly specificity: readonly [number, number, number]
}

export interface Rule {
  readonly selector: Selector
  readonly declarations: ReadonlyMap<string, { value: string; important: boolean }>
  readonly order: number
}

function parseCompound(text: string): Compound {
  let tag: string | null = null
  const attributes: { name: string; value: string | null }[] = []
  const classes: string[] = []
  const ids: string[] = []
  const nots: Compound[] = []
  let hover = false
  let unknown = false
  let at = 0
  const ident = (): string => {
    const found = /^[-\w*]+/.exec(text.slice(at))
    const word = found?.[0] ?? ''
    at += word.length
    return word
  }
  while (at < text.length) {
    const head = text[at]
    if (head === '[') {
      let depth = 0
      let quote: string | null = null
      let end = at
      for (; end < text.length; end += 1) {
        const one = text[end]
        if (quote !== null) {
          if (one === quote) quote = null
          continue
        }
        if (one === '"' || one === "'") quote = one
        else if (one === '[') depth += 1
        else if (one === ']') {
          depth -= 1
          if (depth === 0) break
        }
      }
      const inside = text.slice(at + 1, end)
      const eq = inside.indexOf('=')
      if (eq < 0) attributes.push({ name: inside.trim(), value: null })
      else attributes.push({ name: inside.slice(0, eq).trim(), value: inside.slice(eq + 1).trim().replace(/^["']|["']$/g, '') })
      at = end + 1
    } else if (head === '.') {
      at += 1
      classes.push(ident())
    } else if (head === '#') {
      at += 1
      ids.push(ident())
    } else if (head === ':') {
      if (text.startsWith(':hover', at)) {
        hover = true
        at += ':hover'.length
      } else if (text.startsWith(':not(', at)) {
        let depth = 0
        let end = at + ':not'.length
        for (; end < text.length; end += 1) {
          if (text[end] === '(') depth += 1
          else if (text[end] === ')') {
            depth -= 1
            if (depth === 0) break
          }
        }
        nots.push(parseCompound(text.slice(at + ':not('.length, end)))
        at = end + 1
      } else {
        unknown = true
        at += 1
        ident()
        if (text[at] === '(') {
          const close = text.indexOf(')', at)
          at = close < 0 ? text.length : close + 1
        }
      }
    } else {
      const word = ident()
      if (word === '') {
        unknown = true
        at += 1
      } else if (word !== '*') tag = word.toUpperCase()
    }
  }
  return { tag, attributes, classes, ids, hover, nots, unknown }
}

function splitSelector(text: string): { parts: string[]; combinators: ('descendant' | 'child')[] } {
  const parts: string[] = []
  const combinators: ('descendant' | 'child')[] = []
  let current = ''
  let bracket = 0
  let paren = 0
  let quote: string | null = null
  let pending: 'descendant' | 'child' | null = null
  const flush = (): void => {
    if (current.trim() === '') return
    if (parts.length > 0) combinators.push(pending ?? 'descendant')
    parts.push(current.trim())
    current = ''
    pending = null
  }
  for (const one of text.trim()) {
    if (quote !== null) {
      current += one
      if (one === quote) quote = null
      continue
    }
    if (one === '"' || one === "'") quote = one
    if (one === '[') bracket += 1
    if (one === ']') bracket -= 1
    if (one === '(') paren += 1
    if (one === ')') paren -= 1
    if (bracket === 0 && paren === 0 && (one === ' ' || one === '>')) {
      flush()
      if (one === '>') pending = 'child'
      continue
    }
    current += one
  }
  flush()
  return { parts, combinators }
}

function specificityOf(compound: Compound): [number, number, number] {
  const inner = compound.nots.map(specificityOf)
  return [
    compound.ids.length + inner.reduce((sum, one) => sum + one[0], 0),
    compound.attributes.length + compound.classes.length + (compound.hover ? 1 : 0) + inner.reduce((sum, one) => sum + one[1], 0),
    (compound.tag === null ? 0 : 1) + inner.reduce((sum, one) => sum + one[2], 0),
  ]
}

function parseSelector(text: string): Selector {
  const { parts, combinators } = splitSelector(text)
  const compounds = parts.map(parseCompound)
  const total = compounds.map(specificityOf).reduce<[number, number, number]>((sum, one) => [sum[0] + one[0], sum[1] + one[1], sum[2] + one[2]], [0, 0, 0])
  return { compounds: [...compounds].reverse(), combinators: [...combinators].reverse(), specificity: total }
}

// WHY: every <style> under the root, in order; @-blocks are not written by the surface for these properties.
export function rulesOf(root: FakeElement): Rule[] {
  const text = selfAndDescendants(root)
    .filter((node) => node.tagName === 'STYLE')
    .map((node) => node.textContent)
    .join('\n')
  const rules: Rule[] = []
  let order = 0
  for (const hit of text.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const declarations = new Map<string, { value: string; important: boolean }>()
    for (const one of (hit[2] ?? '').split(';')) {
      const colon = one.indexOf(':')
      if (colon < 0) continue
      const raw = one.slice(colon + 1).trim()
      const important = /!important\s*$/.test(raw)
      declarations.set(one.slice(0, colon).trim().toLowerCase(), { value: raw.replace(/\s*!important\s*$/, ''), important })
    }
    for (const selector of (hit[1] ?? '').split(/,(?![^(]*\))(?![^[]*\])/)) {
      if (selector.trim() === '' || selector.trim().startsWith('@')) continue
      rules.push({ selector: parseSelector(selector), declarations, order })
      order += 1
    }
  }
  return rules
}

function matchesCompound(element: FakeElement, compound: Compound, hovered: ReadonlySet<FakeElement>): boolean {
  if (compound.unknown) return false
  if (compound.tag !== null && element.tagName !== compound.tag) return false
  for (const one of compound.attributes) {
    const held = element.getAttribute(one.name)
    if (held === null) return false
    if (one.value !== null && held !== one.value) return false
  }
  for (const one of compound.classes) if (!element.classList.contains(one)) return false
  for (const one of compound.ids) if (element.id !== one) return false
  if (compound.hover && !hovered.has(element)) return false
  for (const one of compound.nots) if (matchesCompound(element, one, hovered)) return false
  return true
}

function matchesFrom(element: FakeElement, selector: Selector, index: number, hovered: ReadonlySet<FakeElement>): boolean {
  const compound = selector.compounds[index]
  if (compound === undefined) return true
  if (!matchesCompound(element, compound, hovered)) return false
  if (index === selector.compounds.length - 1) return true
  const combinator = selector.combinators[index]
  if (combinator === 'child') {
    const parent = element.parentNode
    return parent !== null && matchesFrom(parent, selector, index + 1, hovered)
  }
  for (let up = element.parentNode; up !== null; up = up.parentNode) {
    if (matchesFrom(up, selector, index + 1, hovered)) return true
  }
  return false
}

export function selectorMatches(element: FakeElement, selector: Selector, hovered: ReadonlySet<FakeElement>): boolean {
  return matchesFrom(element, selector, 0, hovered)
}

// WHY: :hover holds for the element under the pointer and for every ancestor of it.
export function hoverChainOf(element: FakeElement | null): ReadonlySet<FakeElement> {
  const out = new Set<FakeElement>()
  for (let up = element; up !== null; up = up.parentNode) out.add(up)
  return out
}

const NO_HOVER: ReadonlySet<FakeElement> = new Set()

// WHY: important sheet > inline > sheet by specificity then order (the parts of the cascade the surface uses).
export function cascaded(element: FakeElement, property: string, rules: readonly Rule[], hovered: ReadonlySet<FakeElement> = NO_HOVER): string | undefined {
  let best: { important: boolean; specificity: readonly number[]; order: number; value: string } | undefined
  const better = (a: NonNullable<typeof best>, b: NonNullable<typeof best>): boolean => {
    for (let at = 0; at < 3; at += 1) if ((a.specificity[at] ?? 0) !== (b.specificity[at] ?? 0)) return (a.specificity[at] ?? 0) > (b.specificity[at] ?? 0)
    return a.order > b.order
  }
  for (const rule of rules) {
    const held = rule.declarations.get(property)
    if (held === undefined) continue
    if (!selectorMatches(element, rule.selector, hovered)) continue
    const candidate = { important: held.important, specificity: rule.selector.specificity, order: rule.order, value: held.value }
    if (best === undefined || (candidate.important && !best.important) || (candidate.important === best.important && better(candidate, best))) best = candidate
  }
  if (best?.important === true) return best.value
  const inline = styleMap(element).get(property)
  if (inline !== undefined) return inline
  return best?.value
}

// WHY: visibility inherits; display:none hides the whole subtree.
export function isShown(element: FakeElement, rules: readonly Rule[], hovered: ReadonlySet<FakeElement> = NO_HOVER): boolean {
  let visibility: string | undefined
  for (let up: FakeElement | null = element; up !== null; up = up.parentNode) {
    if ((cascaded(up, 'display', rules, hovered) ?? '').trim() === 'none') return false
    if (visibility === undefined) visibility = cascaded(up, 'visibility', rules, hovered)
  }
  return visibility === undefined || !/^(hidden|collapse)$/.test(visibility.trim())
}

const isPositioned = (element: FakeElement, rules: readonly Rule[], hovered: ReadonlySet<FakeElement>): boolean =>
  /^(absolute|relative|fixed|sticky)$/.test((cascaded(element, 'position', rules, hovered) ?? 'static').trim())

function zIndexOf(element: FakeElement, rules: readonly Rule[], hovered: ReadonlySet<FakeElement>): number | null {
  const written = (cascaded(element, 'z-index', rules, hovered) ?? 'auto').trim()
  return written === 'auto' ? null : Number(written)
}

function makesStackingContext(element: FakeElement, rules: readonly Rule[], hovered: ReadonlySet<FakeElement>): boolean {
  const position = (cascaded(element, 'position', rules, hovered) ?? 'static').trim()
  if (position === 'fixed' || position === 'sticky') return true
  if (isPositioned(element, rules, hovered) && zIndexOf(element, rules, hovered) !== null) return true
  if ((cascaded(element, 'isolation', rules, hovered) ?? '').trim() === 'isolate') return true
  const opacity = cascaded(element, 'opacity', rules, hovered)
  if (opacity !== undefined && Number(opacity) < 1) return true
  for (const property of ['transform', 'filter', 'clip-path', 'mask', 'mix-blend-mode']) {
    const value = (cascaded(element, property, rules, hovered) ?? '').trim()
    if (value !== '' && value !== 'none' && value !== 'normal') return true
  }
  return false
}

function pathFromRoot(element: FakeElement): FakeElement[] {
  const out: FakeElement[] = []
  for (let up: FakeElement | null = element; up !== null; up = up.parentNode) out.unshift(up)
  return out
}

// WHY: the layer a branch paints in, inside the stacking context the two branches share.
function layerOf(branch: readonly FakeElement[], rules: readonly Rule[], hovered: ReadonlySet<FakeElement>): number {
  for (const one of branch) {
    if (makesStackingContext(one, rules, hovered)) return isPositioned(one, rules, hovered) ? (zIndexOf(one, rules, hovered) ?? 0) : 0
  }
  return branch.some((one) => isPositioned(one, rules, hovered)) ? 0 : -0.5
}

// WHY: true when `front` paints over `back` where they overlap.
export function paintsOver(front: FakeElement, back: FakeElement, rules: readonly Rule[], hovered: ReadonlySet<FakeElement> = NO_HOVER): boolean {
  const a = pathFromRoot(front)
  const b = pathFromRoot(back)
  if (a[0] !== b[0]) throw new Error('premise: the two elements share a root')
  let split = 0
  while (split < a.length && split < b.length && a[split] === b[split]) split += 1
  if (split === a.length) return false
  if (split === b.length) return layerOf(a.slice(split), rules, hovered) >= 0
  const layerA = layerOf(a.slice(split), rules, hovered)
  const layerB = layerOf(b.slice(split), rules, hovered)
  if (layerA !== layerB) return layerA > layerB
  const parent = a[split - 1] as FakeElement
  return parent.children.indexOf(a[split] as FakeElement) > parent.children.indexOf(b[split] as FakeElement)
}

const pxOf = (value: string | undefined): number | null => {
  if (value === undefined) return null
  const found = /^(-?[\d.]+)px$/.exec(value.trim())
  return found === null ? (value.trim() === '0' ? 0 : null) : Number(found[1])
}

export interface PageBox {
  readonly left: number
  readonly top: number
  readonly width: number
  readonly height: number
}

// WHY: the surface places every panel part with left/top in px inside positioned parents; the page box sums them up to the unit's root.
export function pageBoxOf(element: FakeElement, root: FakeElement): PageBox {
  let left = 0
  let top = 0
  for (let up: FakeElement | null = element; up !== null && up !== root; up = up.parentNode) {
    const style = styleMap(up)
    left += pxOf(style.get('left')) ?? 0
    top += pxOf(style.get('top')) ?? 0
  }
  const style = styleMap(element)
  return { left, top, width: pxOf(style.get('width')) ?? NaN, height: pxOf(style.get('height')) ?? NaN }
}

// WHY: the box the eye sees, border included, whichever box-sizing the element states.
export function outerSizeOf(element: FakeElement): { width: number; height: number; stroke: number } {
  const style = styleMap(element)
  const border = style.get('border') ?? ''
  const stroke = pxOf(/(-?[\d.]+px)/.exec(border)?.[1]) ?? pxOf(style.get('border-width')) ?? 0
  const isBorderBox = (style.get('box-sizing') ?? '').trim() === 'border-box'
  const width = pxOf(style.get('width')) ?? NaN
  const height = pxOf(style.get('height')) ?? NaN
  return isBorderBox ? { width, height, stroke } : { width: width + 2 * stroke, height: height + 2 * stroke, stroke }
}

const GLOBAL = globalThis as unknown as Record<string, unknown>

export interface CarryBench {
  readonly built: Shell
  readonly dom: Stage
  root(): FakeElement
  rules(): Rule[]
  // WHY: the drawn row (a child of the title tree) whose words are the task group's name.
  row(taskGroupId: string): FakeElement
  rows(): FakeElement[]
  tree(): FakeElement
  copy(): FakeElement | null
  line(): FakeElement | null
  // WHY: the pointer as last sent, in the frame loop's coordinates.
  pointer(): { x: number; y: number }
  // WHY: the box of a drawn task group title, as the frame loop described it.
  layoutBox(taskGroupId: string): { x: number; y: number; width: number; height: number }
  press(taskGroupId: string): { x: number; y: number }
  move(x: number, y: number): void
  release(x: number, y: number): void
  esc(): void
  // WHY: draw the frame loop's last description with the DOM surface.
  show(): void
}

export function carryBench(document?: Document): CarryBench {
  const built = document === undefined ? shell() : shell(document)
  const dom = wire({ preference: 'light', hue: HUE }, { 'App Header': 40 })
  let at = { x: 0, y: 0 }
  const show = (): void => {
    const keep = GLOBAL['requestAnimationFrame']
    const waiting: ((time: number) => void)[] = []
    GLOBAL['requestAnimationFrame'] = (callback: (time: number) => void): number => waiting.push(callback)
    try {
      surfaceOf(dom).showScreenView(built.lastView() as ScreenView)
      for (let turn = 0; turn < 8 && waiting.length > 0; turn += 1) for (const run of waiting.splice(0)) run(turn)
    } finally {
      GLOBAL['requestAnimationFrame'] = keep
    }
  }
  const one = (role: string): FakeElement | null => {
    const found = byRole(dom.root(), role)
    if (found.length > 1) throw new Error(`expected at most one ${role}, found ${found.length}`)
    return found[0] ?? null
  }
  const tree = (): FakeElement => {
    const found = one(ROLE.taskGroupTitleTree)
    if (found === null) throw new Error('the surface drew no task group title tree')
    return found
  }
  const nameOf = (taskGroupId: string): string => {
    const group = (built.loop.document().schedule.taskGroups as unknown as { id: string; name: string }[]).find((g) => g.id === taskGroupId)
    if (group === undefined) throw new Error(`premise: ${taskGroupId} exists`)
    return group.name
  }
  const ownText = (element: FakeElement): string =>
    element.childNodes
      .filter((node) => !(node instanceof Object && 'tagName' in node))
      .map((node) => (node as { data: string }).data)
      .join('')
      .trim()
  const row = (taskGroupId: string): FakeElement => {
    const name = nameOf(taskGroupId)
    const found = tree().children.filter((child) => selfAndDescendants(child).some((node) => ownText(node) === name))
    if (found.length !== 1) throw new Error(`expected one drawn row named ${name}, found ${found.length}`)
    return found[0] as FakeElement
  }
  show()
  return {
    built,
    dom,
    root: () => dom.root(),
    rules: () => rulesOf(dom.root()),
    row,
    rows: () =>
      tree().children.filter((child) => {
        const groups = built.loop.document().schedule.taskGroups as unknown as { name: string }[]
        return selfAndDescendants(child).some((node) => groups.some((g) => g.name === ownText(node)))
      }),
    tree,
    copy: () => one(ROLE.taskGroupGrabCopy),
    line: () => one(ROLE.taskGroupDropLine),
    pointer: () => at,
    layoutBox: (taskGroupId) => {
      const panel = built.lastView().taskGroupPanel
      const title = [...(panel?.pinnedTitles ?? []), ...(panel?.titles ?? [])].find((one) => one.taskGroupId === taskGroupId)
      const box = (title as unknown as { box?: { x: number; y: number; width: number; height: number } } | undefined)?.box
      if (box === undefined) throw new Error(`the frame drew no title for ${taskGroupId}`)
      return box
    },
    press: (taskGroupId) => {
      at = built.press(taskGroupId)
      show()
      return at
    },
    move: (x, y) => {
      at = { x, y }
      built.move(x, y)
      show()
    },
    release: (x, y) => {
      at = { x, y }
      built.release(x, y)
      show()
    },
    esc: () => {
      built.send({ kind: 'key', key: 'Esc', modifiers: { ctrl: false, shift: false, alt: false, meta: false } })
      show()
    },
    show,
  }
}

// WHY: a colour as the eye gets it, through the root's custom properties.
export const colorIn = (dom: Stage, written: string): string => resolved(dom, written)
