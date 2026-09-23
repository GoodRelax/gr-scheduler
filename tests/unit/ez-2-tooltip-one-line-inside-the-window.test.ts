// FR-092 EZ-2 / IN-3: an anchored tooltip stays on one line and is turned back inside the right edge.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import type { Tooltip } from '../../src/adapter/screen-renderer/screen-renderer'
import { keepTooltipsInside, tooltipElement } from '../../src/framework/dom-screen-surface/tooltips-drawing'
import { unbroken } from '../contract/spec-table'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

const EZ_2_THE_ICON_TOOLTIP = 'アイコンにポインタを合わせて一定時間が経ったら、そのアイコンの説明を出すこと（MUST）。'

// TRAP: neither EZ-2 nor IN-3 says "one line" or "inside the right edge"; the brief of 2026-09-23 does (spec gap).
const BRIEF_ONE_LINE = 'the brief of 2026-09-23: a tooltip is one line, it does not wrap'
const BRIEF_INSIDE = 'the brief of 2026-09-23: a tooltip that would pass the right edge is aligned to the anchor right edge'

interface FakeNode {
  style: string
  text: string
  children: FakeNode[]
  width: number
  rect: { left: number; top: number; right: number; bottom: number } | null
}

const pxOf = (style: string, name: string): number =>
  Number(new RegExp(`(?:^|;)${name}:(-?[\\d.]+)px`).exec(style.replace(/\s/g, ''))?.[1])

const nodeOf = (width: number): FakeNode & Record<string, unknown> => {
  const node: FakeNode & Record<string, unknown> = { style: '', text: '', children: [], width, rect: null }
  node.setAttribute = (name: string, value: string) => {
    if (name === 'style') node.style = value
  }
  node.getAttribute = (name: string) => (name === 'style' ? node.style : null)
  node.append = (...kids: FakeNode[]) => node.children.push(...kids)
  node.getBoundingClientRect = () => {
    if (node.rect !== null) return { ...node.rect, x: node.rect.left, y: node.rect.top, width: node.rect.right - node.rect.left, height: node.rect.bottom - node.rect.top }
    const left = pxOf(node.style, 'left')
    const top = pxOf(node.style, 'top')
    return { x: left, y: top, left, top, right: left + node.width, bottom: top + 20, width: node.width, height: 20 }
  }
  Object.defineProperty(node, 'textContent', {
    set: (value: string) => {
      node.text = value
    },
    get: () => node.text,
  })
  return node
}

const TIP_WIDTH = 240

const drawn = (anchorLeft: number, windowWidth: number): { tip: FakeNode; anchorRight: number } => {
  const host = { createElement: () => nodeOf(TIP_WIDTH) }
  const anchor = nodeOf(24)
  anchor.rect = { left: anchorLeft, top: 10, right: anchorLeft + 24, bottom: 34 }
  const tip: Tooltip = { anchor: { kind: 'icon', icon: 'help' as never }, text: 'a long description of the icon', assignment: null }
  const element = tooltipElement(host as unknown as Document, tip, () => anchor as unknown as HTMLElement) as unknown as FakeNode
  const layer = nodeOf(windowWidth)
  layer.rect = { left: 0, top: 0, right: windowWidth, bottom: 700 }
  layer.children = [element]
  keepTooltipsInside(layer as unknown as HTMLElement)
  return { tip: element, anchorRight: anchorLeft + 24 }
}

describe('FR-092 EZ-2 -- the manuscript this case hangs on', () => {
  it('still says it, word for word', () => {
    expect(REQUIREMENTS).toContain(EZ_2_THE_ICON_TOOLTIP)
  })
})

describe('FR-092 EZ-2 -- one line, inside the window', () => {
  it('the tooltip does not wrap (white-space nowrap)', () => {
    const { tip } = drawn(100, 1000)
    expect(tip.style.replace(/\s/g, ''), BRIEF_ONE_LINE).toContain('white-space:nowrap')
  })

  it('with room on the right, it stands under the anchor from the anchor left edge', () => {
    const { tip } = drawn(100, 1000)
    expect(pxOf(tip.style, 'left')).toBe(100)
    expect(pxOf(tip.style, 'top')).toBe(34)
  })

  it('near the right edge, it is aligned to the anchor right edge and stays inside', () => {
    const { tip, anchorRight } = drawn(900, 1000)
    const left = pxOf(tip.style, 'left')
    expect(left, BRIEF_INSIDE).toBe(anchorRight - TIP_WIDTH)
    expect(left + TIP_WIDTH, BRIEF_INSIDE).toBeLessThanOrEqual(1000)
    expect(pxOf(tip.style, 'top'), `${BRIEF_INSIDE} -- the vertical place does not move`).toBe(34)
    expect(tip.style.replace(/\s/g, ''), BRIEF_ONE_LINE).toContain('white-space:nowrap')
  })
})
