// DFC-2960 spec-only cases: while a task group is carried, the drop line and the name copy are drawn in front of the panel rows and their controls, the copy follows the pointer, a pointer move never rebuilds the rows, and no row shows its controls (HF-15, HF-6).

import { afterEach, describe, expect, it } from 'vitest'

import { selfAndDescendants, serialize, stage, type FakeElement } from '../fixtures/fake-browser'
import { REQUIREMENTS, documentOf } from './cr-772-stage'
import {
  S_208,
  S_599,
  carryBench,
  hoverChainOf,
  isShown,
  pageBoxOf,
  paintsOver,
  rulesOf,
  type CarryBench,
} from './dfc-2960-carry-bench'
import type { Document } from '../../src/entity/document-model/document/document'

const GLOBAL = globalThis as unknown as Record<string, unknown>
const realRaf = GLOBAL['requestAnimationFrame']
afterEach(() => {
  if (realRaf === undefined) delete GLOBAL['requestAnimationFrame']
  else GLOBAL['requestAnimationFrame'] = realRaf
})

const HF_15_IN_FRONT = '⭐ **差し込み線と名前の写しは、パネルの行と操作子より前に描くこと（MUST）** —— ポインタの下の行が前に来ると、写しと線がその行の下に隠れたり出たりして、ちらつく。'
const HF_15_NO_REDRAW = '⛔ **運んでいるあいだ、ポインタが動いただけでパネルの行を描き直してはならない（MUST NOT）** —— 描き直すのは差し込み線と写しだけとする。'
const HF_15_FOLLOW = '③ 掴み代の印とタスクグループ名の写しを、ポインタから 表 T-206 の `S-599` だけ右と下へずらして付いて行かせること（MUST）'
const HF_15_NO_CONTROLS = '⭐ **運んでいるあいだ、どの行にも操作子（`HF-6`）とその地を描かないこと（MUST）** —— 運ぶ最中に操作子は押せず、描くと行を渡るたびに点いたり消えたりする。'
const HF_15_BACK = '離すか `Esc` でやめれば、`HF-6` のとおりに戻る。'
const HF_6_TAIL = '⛔ **タスクグループを運んでいるあいだ（`HF-15`）は、ポインタが乗っていても操作子とその地を描かないこと（MUST）** —— 規則と理由は `HF-15` が持つ。'
const HF_6_HEAD = '**操作子は、そのタスクグループ名か、そのタスクグループのために描いた操作子の群（下の段が地を敷く範囲）にポインタが乗っているあいだだけ描くこと（MUST）**'

// WHY: the held task group B (with B1 under it) in the cr-772 tree; drawn order A, A1, A1x, Ah, A2, A2a, B, B1, C (folded), D, E, E1, E2, E3.
const HELD = 'B'
// WHY: rows the route crosses, top to bottom and back; every point stays clear of the S-597 edge band.
const ROUTE_ROWS = ['A1x', 'Ah', 'A2', 'A2a', 'C', 'D', 'E', 'E1', 'E2', 'D', 'C', 'A2a', 'A2', 'Ah']

function startCarry(): { bench: CarryBench; route: { x: number; y: number }[] } {
  const bench = carryBench(documentOf() as unknown as Document)
  const at = bench.press(HELD)
  bench.move(at.x + 2, at.y + S_208 + 3)
  const route: { x: number; y: number }[] = []
  ROUTE_ROWS.forEach((id, index) => {
    const box = bench.layoutBox(id)
    // WHY: three heights per row (upper half, middle, lower half) and a sideways drift of whole and half indents, so gap and depth both change.
    for (const part of [0.25, 0.5, 0.8]) route.push({ x: at.x + 30 + (index % 4) * 7 + part * 4, y: box.y + box.height * part })
  })
  return { bench, route }
}

// WHY: the page offset between the frame loop's coordinates and the drawn tree, read from the held row itself.
function offsetOf(bench: CarryBench, id: string): { x: number; y: number } {
  const page = pageBoxOf(bench.row(id), bench.root())
  const layout = bench.layoutBox(id)
  return { x: page.left - layout.x, y: page.top - layout.y }
}

function rowUnder(bench: CarryBench, x: number, y: number, offset: { x: number; y: number }): FakeElement | null {
  for (const row of bench.rows()) {
    const box = pageBoxOf(row, bench.root())
    if (x + offset.x >= box.left && x + offset.x < box.left + box.width && y + offset.y >= box.top && y + offset.y < box.top + box.height) return row
  }
  return null
}

describe('DFC-2960 -- the manuscript these cases are driven by', () => {
  it.each([HF_15_IN_FRONT, HF_15_NO_REDRAW, HF_15_FOLLOW, HF_15_NO_CONTROLS, HF_15_BACK, HF_6_TAIL, HF_6_HEAD])('HF-15 / HF-6 still say it: %s', (text) => {
    expect(REQUIREMENTS).toContain(text)
  })
})

describe('HF-15 -- premise: the stacking reader sees the flicker the row reports', () => {
  it('reads a copy drawn among the rows as behind the hovered row once a :hover rule lifts that row, and in front of it otherwise', () => {
    const built = stage()
    const make = (tag: string, style: string): FakeElement => {
      const one = built.host.createElement(tag) as unknown as FakeElement
      one.setAttribute('style', style)
      return one
    }
    const root = make('div', 'position:fixed')
    const sheet = make('style', '')
    sheet.textContent = '[data-tree] > [data-row]:hover{z-index:1;}'
    const tree = make('div', 'position:absolute;left:0;top:0')
    tree.setAttribute('data-tree', 'true')
    const row = make('div', 'position:absolute;left:0;top:10px;width:100px;height:20px')
    row.setAttribute('data-row', 'true')
    const copy = make('div', 'position:absolute;left:5px;top:15px')
    root.append(sheet, tree)
    tree.append(row, copy)
    const rules = rulesOf(root)
    expect(paintsOver(copy, row, rules)).toBe(true)
    expect(paintsOver(copy, row, rules, hoverChainOf(row))).toBe(false)
    expect(paintsOver(row, copy, rules, hoverChainOf(row))).toBe(true)
  })
})

describe('HF-15 -- the line and the copy are drawn in front of the rows and their controls', () => {
  it('paints the copy and the line over every drawn row and every part of it, with the row under the pointer hovered, on every frame of the route', () => {
    const { bench, route } = startCarry()
    const offset = offsetOf(bench, HELD)
    let checkedFrames = 0
    for (const point of route) {
      bench.move(point.x, point.y)
      const rules = bench.rules()
      const hovered = rowUnder(bench, point.x, point.y, offset)
      expect(hovered, `premise: the pointer at ${point.x},${point.y} is over a drawn row`).not.toBeNull()
      const hover = hoverChainOf(hovered)
      const copy = bench.copy()
      const line = bench.line()
      expect(copy, 'the copy is drawn while carrying').not.toBeNull()
      expect(line, 'the drop line is drawn while carrying').not.toBeNull()
      for (const row of bench.rows()) {
        for (const part of selfAndDescendants(row)) {
          for (const cue of [copy, line] as FakeElement[]) {
            expect(paintsOver(cue, part, rules, hover), `${serialize(cue)} must paint over ${serialize(part)} (pointer ${point.x},${point.y})`).toBe(true)
          }
        }
      }
      checkedFrames += 1
    }
    expect(checkedFrames).toBe(route.length)
  })
})

describe('HF-15 -- the copy follows the pointer by S-599 to the right and down', () => {
  it('places the copy S-599 right of and below the pointer on every frame', () => {
    const { bench, route } = startCarry()
    const offset = offsetOf(bench, HELD)
    for (const point of route) {
      bench.move(point.x, point.y)
      const copy = bench.copy()
      expect(copy).not.toBeNull()
      const box = pageBoxOf(copy as FakeElement, bench.root())
      expect(box.left - offset.x).toBeCloseTo(point.x + S_599, 6)
      expect(box.top - offset.y).toBeCloseTo(point.y + S_599, 6)
    }
  })
})

describe('HF-15 -- a pointer move does not rebuild the rows', () => {
  it('keeps every element under the title tree, and what it states, through the whole route while the line moves gap and depth', () => {
    const { bench, route } = startCarry()
    const tree = bench.tree()
    const before = selfAndDescendants(tree)
    const statesBefore = before.map((one) => `${serialize(one)}${one.textContent}`)
    const lines = new Set<string>()
    for (const point of route) {
      bench.move(point.x, point.y)
      expect(bench.tree()).toBe(tree)
      const now = selfAndDescendants(tree)
      expect(now.length).toBe(before.length)
      now.forEach((one, at) => {
        expect(one, `element ${at} under the tree was replaced at pointer ${point.x},${point.y}`).toBe(before[at])
        expect(`${serialize(one)}${one.textContent}`).toBe(statesBefore[at])
      })
      const line = bench.line()
      if (line !== null) lines.add(serialize(line))
    }
    // WHY: premise -- the route really moved the drop between gaps and depths, so the rows stayed through landing changes too.
    expect(lines.size).toBeGreaterThan(4)
  })
})

describe('HF-15 / HF-6 -- no row shows its controls or their ground while carrying', () => {
  const shownIn = (row: FakeElement, bench: CarryBench, hover: ReadonlySet<FakeElement>): FakeElement[] => {
    const rules = bench.rules()
    return selfAndDescendants(row).filter((one) => isShown(one, rules, hover))
  }

  it('premise: with nothing carried, the pointer over a row shows parts of it that were hidden (the controls of HF-6)', () => {
    const bench = carryBench(documentOf() as unknown as Document)
    const row = bench.row('A2')
    const plain = shownIn(row, bench, new Set())
    const hovered = shownIn(row, bench, hoverChainOf(row))
    expect(hovered.length).toBeGreaterThan(plain.length)
  })

  it('shows nothing more on the row under the pointer than on a row no pointer is over, on every frame of the route', () => {
    const { bench, route } = startCarry()
    const offset = offsetOf(bench, HELD)
    for (const point of route) {
      bench.move(point.x, point.y)
      const row = rowUnder(bench, point.x, point.y, offset) as FakeElement
      expect(row).not.toBeNull()
      const plain = shownIn(row, bench, new Set())
      const hovered = shownIn(row, bench, hoverChainOf(row))
      expect(hovered.map(serialize)).toEqual(plain.map(serialize))
    }
  })

  it('shows the controls again under the pointer once Esc ends the carry', () => {
    const { bench, route } = startCarry()
    const point = route[2] as { x: number; y: number }
    bench.move(point.x, point.y)
    bench.esc()
    const row = bench.row('A2')
    const plain = shownIn(row, bench, new Set())
    const hovered = shownIn(row, bench, hoverChainOf(row))
    expect(hovered.length).toBeGreaterThan(plain.length)
    expect(bench.copy()).toBeNull()
    expect(bench.line()).toBeNull()
  })
})
