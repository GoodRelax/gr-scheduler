// CR-740 from docs/spec only: the three MUSTs T-065 IF-1 holds about the overlay element and the overlay mouth (DFC-2448).

import { afterEach, describe, expect, it } from 'vitest'

import { domSvgSurface } from '../../src/framework/dom-svg-surface/dom-svg-surface'
import { pointer, restoreAnimationFrame, SCREEN, stage, wholeRow, type Stage } from './cr-740-stage'

const IF_1 = wholeRow('T-065', 'IF-1')
const IF_1_ONLY_WHILE_NOT_EMPTY = '重ねの要素は、重ねの絵が空でないあいだだけ置き、空になったら外すこと（MUST）'
const IF_1_LAST_CHILD = '置くときは Schedule Canvas の宿主の最後の子とし、position:absolute で下の絵と同じ左上に載せること（MUST）'
const IF_1_ONLY_ON_A_CHANGE = 'SingleHtmlShell（CP-25）は重ねの絵の文字列を覚え（初めは空）、前と違うときだけ重ねの口を呼ぶこと（MUST）'

afterEach(restoreAnimationFrame)

describe('CR-740 the manuscript these cases are driven by', () => {
  it.each([IF_1_ONLY_WHILE_NOT_EMPTY, IF_1_LAST_CHILD, IF_1_ONLY_ON_A_CHANGE, '範囲選択をしないフレームは重ねの口に触れない'])(
    'T-065 IF-1 holds %s',
    (clause) => {
      expect(IF_1).toContain(clause)
    },
  )
})

interface FakeStyle {
  [name: string]: unknown
  cssText: string
  setProperty(name: string, value: string): void
  getPropertyValue(name: string): string
}

const camel = (name: string): string => name.replace(/-([a-z])/g, (_all, letter: string) => letter.toUpperCase())

/** @purity non-pure */
function fakeStyle(): FakeStyle {
  const values = new Map<string, string>()
  const style = {
    setProperty: (name: string, value: string) => {
      values.set(camel(name.trim()), value.trim())
    },
    getPropertyValue: (name: string) => values.get(camel(name.trim())) ?? '',
  } as FakeStyle
  Object.defineProperty(style, 'cssText', {
    get: () => [...values].map(([name, value]) => `${name}:${value}`).join(';'),
    set: (text: string) => {
      values.clear()
      for (const part of text.split(';')) {
        const at = part.indexOf(':')
        if (at > 0) values.set(camel(part.slice(0, at).trim()), part.slice(at + 1).trim())
      }
    },
  })
  return new Proxy(style, {
    get: (target, name) => (typeof name === 'string' && !(name in target) ? (values.get(name) ?? '') : Reflect.get(target, name)),
    set: (target, name, value) => {
      if (typeof name === 'string' && !(name in target)) values.set(name, String(value))
      else Reflect.set(target, name, value)
      return true
    },
  })
}

class FakeElement {
  readonly tagName: string
  readonly attributes = new Map<string, string>()
  readonly style = fakeStyle()
  children: FakeElement[] = []
  parent: FakeElement | null = null
  private inner = ''

  constructor(tagName: string) {
    this.tagName = tagName
  }

  get ownerDocument(): { createElement(tag: string): FakeElement; createElementNS(ns: string, tag: string): FakeElement } {
    return { createElement: (tag) => new FakeElement(tag), createElementNS: (_ns, tag) => new FakeElement(tag) }
  }

  get lastElementChild(): FakeElement | null {
    return this.children[this.children.length - 1] ?? null
  }

  get firstElementChild(): FakeElement | null {
    return this.children[0] ?? null
  }

  get childElementCount(): number {
    return this.children.length
  }

  get innerHTML(): string {
    return this.children.length === 0 ? this.inner : this.children.map((one) => one.outerHTML).join('')
  }

  set innerHTML(html: string) {
    for (const child of this.children) child.parent = null
    this.children = []
    this.inner = ''
    for (const piece of FakeElement.split(html)) this.adopt(FakeElement.parsed(piece), this.children.length)
  }

  get outerHTML(): string {
    const attrs = [...this.attributes].map(([name, value]) => ` ${name}="${value}"`).join('')
    return `<${this.tagName}${attrs}>${this.innerHTML}</${this.tagName}>`
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value)
    if (name === 'style') this.style.cssText = value
  }

  getAttribute(name: string): string | null {
    if (name === 'style' && this.style.cssText !== '') return this.style.cssText
    return this.attributes.get(name) ?? null
  }

  removeAttribute(name: string): void {
    this.attributes.delete(name)
  }

  append(...nodes: FakeElement[]): void {
    for (const node of nodes) this.adopt(node, this.children.length)
  }

  appendChild(node: FakeElement): FakeElement {
    this.adopt(node, this.children.length)
    return node
  }

  prepend(...nodes: FakeElement[]): void {
    nodes.forEach((node, at) => this.adopt(node, at))
  }

  removeChild(node: FakeElement): FakeElement {
    node.remove()
    return node
  }

  remove(): void {
    if (this.parent === null) return
    this.parent.children = this.parent.children.filter((one) => one !== this)
    this.parent = null
  }

  insertAdjacentHTML(position: string, html: string): void {
    const made = FakeElement.split(html).map((piece) => FakeElement.parsed(piece))
    if (position === 'beforeend') this.append(...made)
    else if (position === 'afterbegin') this.prepend(...made)
    else if (this.parent !== null) {
      const at = this.parent.children.indexOf(this) + (position === 'afterend' ? 1 : 0)
      made.forEach((node, offset) => this.parent?.adopt(node, at + offset))
    }
  }

  private adopt(node: FakeElement, at: number): void {
    node.remove()
    node.parent = this
    this.children.splice(at, 0, node)
  }

  private static split(html: string): readonly string[] {
    const trimmed = html.trim()
    if (trimmed === '') return []
    const pieces: string[] = []
    let rest = trimmed
    while (rest.length > 0) {
      const open = /^<([A-Za-z][A-Za-z0-9:-]*)/.exec(rest)
      if (open === null) break
      const name = open[1] as string
      const close = `</${name}>`
      let depth = 0
      let end = -1
      const tags = new RegExp(`<(/?)${name}\\b[^>]*?(/?)>`, 'g')
      for (let found = tags.exec(rest); found !== null; found = tags.exec(rest)) {
        if (found[1] === '/') depth -= 1
        else if (found[2] !== '/') depth += 1
        if (depth === 0) {
          end = found.index + found[0].length
          break
        }
      }
      if (end < 0) end = rest.indexOf(close) < 0 ? rest.length : rest.indexOf(close) + close.length
      pieces.push(rest.slice(0, end))
      rest = rest.slice(end).trim()
    }
    return pieces
  }

  private static parsed(piece: string): FakeElement {
    const open = /^<([A-Za-z][A-Za-z0-9:-]*)([^>]*?)\/?>/.exec(piece)
    if (open === null) throw new Error('the fake host was handed something that is not an element')
    const node = new FakeElement(open[1] as string)
    for (const attr of (open[2] as string).matchAll(/([A-Za-z_:][-A-Za-z0-9_:.]*)="([^"]*)"/g)) {
      node.setAttribute(attr[1] as string, attr[2] as string)
    }
    const name = open[1] as string
    const bodyStart = open[0].length
    const bodyEnd = piece.lastIndexOf(`</${name}>`)
    node.inner = bodyEnd > bodyStart ? piece.slice(bodyStart, bodyEnd) : ''
    return node
  }
}

const ZO_6 = 'data-zo="ZO-6"'

/** @purity pure */
function positionOf(node: FakeElement): { position: string; left: string; top: string } {
  return { position: String(node.style['position']), left: String(node.style['left']), top: String(node.style['top']) }
}

const atTheOrigin = (value: string): boolean => /^0(px)?$/.test(value)

interface Mounted {
  readonly host: FakeElement
  readonly one: Stage
}

/** @purity non-pure */
function mounted(): Mounted {
  const host = new FakeElement('div')
  const one = stage({ surface: domSvgSurface(host as unknown as Element) })
  return { host, one }
}

describe(`T-065 IF-1 -- ${IF_1_ONLY_WHILE_NOT_EMPTY}`, () => {
  it('while nothing is held the Schedule Canvas host holds the picture beneath and no overlay element', () => {
    const { host, one } = mounted()
    for (const at of one.ground()) one.send(pointer('move', at.x, at.y))
    expect(host.childElementCount, 'only the picture beneath is on the host').toBe(1)
    expect(host.innerHTML).not.toContain(ZO_6)
    expect(host.firstElementChild?.tagName.toLowerCase()).toBe('svg')
  })

  it('a press that has not moved yet takes no rectangle and puts no overlay element (SL-3)', () => {
    const { host, one } = mounted()
    const [from] = one.ground()
    one.send(pointer('down', from!.x, from!.y))
    expect(host.childElementCount).toBe(1)
    one.send(pointer('up', from!.x, from!.y))
  })

  it('on release the overlay element is taken off the host', () => {
    const { host, one } = mounted()
    const [from, ...path] = one.ground()
    one.send(pointer('down', from!.x, from!.y))
    one.send(pointer('move', path[0]!.x, path[0]!.y))
    expect(host.childElementCount, 'premise: the held rectangle put an overlay element').toBe(2)
    one.send(pointer('up', path[0]!.x, path[0]!.y))
    expect(host.childElementCount, IF_1_ONLY_WHILE_NOT_EMPTY).toBe(1)
    expect(host.innerHTML).not.toContain(ZO_6)
    for (const at of path) one.send(pointer('move', at.x, at.y))
    expect(host.childElementCount, 'and no element comes back on the frames after').toBe(1)
  })
})

describe(`T-065 IF-1 -- ${IF_1_LAST_CHILD}`, () => {
  it('while the rectangle is held and moved the overlay is the last child of the host, absolute, at the top-left of the picture beneath', () => {
    const { host, one } = mounted()
    const [from, ...path] = one.ground()
    one.send(pointer('down', from!.x, from!.y))
    for (const at of path) {
      one.send(pointer('move', at.x, at.y))
      expect(host.childElementCount, 'one picture beneath and one overlay').toBe(2)
      const overlay = host.lastElementChild
      expect(overlay, 'the overlay is the last child').not.toBe(host.firstElementChild)
      expect(overlay?.outerHTML).toContain(ZO_6)
      expect(host.firstElementChild?.outerHTML).not.toContain(ZO_6)
      const place = positionOf(overlay as FakeElement)
      expect(place.position, IF_1_LAST_CHILD).toBe('absolute')
      expect(atTheOrigin(place.left) && atTheOrigin(place.top), `the top-left the picture beneath starts at, was ${place.left} ${place.top}`).toBe(true)
    }
    one.send(pointer('up', path[0]!.x, path[0]!.y))
  })

  it('a new picture beneath while the rectangle is held leaves the overlay the last child', () => {
    const { host, one } = mounted()
    const [from, ...path] = one.ground()
    one.send(pointer('down', from!.x, from!.y))
    one.send(pointer('move', path[0]!.x, path[0]!.y))
    const beneathBefore = one.beneathNow()
    one.loop.resize({ ...SCREEN, width: SCREEN.width - 200, height: SCREEN.height - 100 })
    one.send(pointer('move', path[1]!.x, path[1]!.y))
    expect(one.beneathNow(), 'premise: a resize makes a new picture beneath').not.toBe(beneathBefore)
    expect(host.childElementCount).toBe(2)
    expect(host.lastElementChild?.outerHTML).toContain(ZO_6)
    expect(positionOf(host.lastElementChild as FakeElement).position).toBe('absolute')
    one.send(pointer('up', path[1]!.x, path[1]!.y))
  })
})

describe(`T-065 IF-1 -- ${IF_1_ONLY_ON_A_CHANGE}`, () => {
  const overlayCalls = (one: Stage): readonly string[] =>
    one.calls.filter((call) => call.mouth === 'showMarqueeOverlaySvg').map((call) => call.svg)

  it('frames with no range selection never call the overlay mouth: start, pointer moves, entrance presses, a resize', () => {
    const one = stage()
    for (const at of one.ground()) one.send(pointer('move', at.x, at.y))
    one.press('IC-16')
    one.press('IC-47')
    one.press('IC-47')
    one.press('IC-16')
    one.loop.resize({ ...SCREEN, width: SCREEN.width - 100 })
    one.send(pointer('move', 600, 20))
    const [from] = one.ground()
    one.send(pointer('down', from!.x, from!.y))
    one.send(pointer('up', from!.x, from!.y))
    expect(one.framesRun(), 'premise: frames ran').toBeGreaterThan(1)
    expect(overlayCalls(one), 'the remembered overlay starts empty and stays empty').toEqual([])
  })

  it('while a rectangle is held the mouth is called only when the overlay string changed, and once with the empty string on release', () => {
    const one = stage()
    const [from, ...path] = one.ground()
    one.send(pointer('down', from!.x, from!.y))
    for (const at of path) {
      one.send(pointer('move', at.x, at.y))
      const calls = overlayCalls(one).length
      one.send(pointer('move', at.x, at.y))
      expect(overlayCalls(one).length, 'the same rectangle again: the same string, no call').toBe(calls)
    }
    const whileHeld = overlayCalls(one)
    expect(whileHeld.length, 'premise: each move drew a new rectangle').toBe(path.length)
    expect(whileHeld[0]?.length ?? 0, 'the first call differs from the empty string remembered at the start').toBeGreaterThan(0)
    for (let at = 1; at < whileHeld.length; at += 1) expect(whileHeld[at], `call ${at} repeats the call before it`).not.toBe(whileHeld[at - 1])
    one.send(pointer('up', path[path.length - 1]!.x, path[path.length - 1]!.y))
    expect(overlayCalls(one).slice(whileHeld.length), 'released: one call, with the empty string').toEqual([''])
    for (const at of path) one.send(pointer('move', at.x, at.y))
    expect(overlayCalls(one).length, 'and no call on the frames after').toBe(whileHeld.length + 1)
  })
})
