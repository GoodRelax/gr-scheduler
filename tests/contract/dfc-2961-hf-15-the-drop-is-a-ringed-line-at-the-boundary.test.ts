// DFC-2961 spec-only cases: while a task group is carried, the drop is shown only as a line on the row boundary with a ring at its left end that stands at the chosen depth's indent and moves with it, no task group is framed, a folded task group takes a line one level deeper under it, and the held ground and the name copy stay (HF-15, S-213, S-620).

import { afterEach, describe, expect, it } from 'vitest'

import { selfAndDescendants, serialize, styleMap, type FakeElement } from '../fixtures/fake-browser'
import { REQUIREMENTS, documentOf, indentPx } from './cr-772-stage'
import {
  S_208,
  S_213,
  S_215,
  S_620,
  carryBench,
  outerSizeOf,
  pageBoxOf,
  screenColor,
  type CarryBench,
  type PageBox,
} from './dfc-2960-carry-bench'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Document } from '../../src/entity/document-model/document/document'

const GLOBAL = globalThis as unknown as Record<string, unknown>
const realRaf = GLOBAL['requestAnimationFrame']
afterEach(() => {
  if (realRaf === undefined) delete GLOBAL['requestAnimationFrame']
  else GLOBAL['requestAnimationFrame'] = realRaf
})

const SETTINGS = readFileSync(join(process.cwd(), 'docs', 'spec', '_assets', 'tbl-settings.md'), 'utf8')

const HF_15_LINE = '① 選んだ隙間に、選んだ段の字下げの位置からパネルの右端まで、差し込み線を引く。'
const HF_15_ON_BOUNDARY = '⭐ **差し込み線は、選んだ隙間の境目（上下 2 つのタスクグループのあいだ）に立てること（MUST）** —— ⛔ ポインタの高さに付いて行かせてはならない（MUST NOT）'
const HF_15_RING = '⭐ **差し込み線の左端に丸を立てること（MUST）** —— 丸の中心は線の左端（選んだ段の字下げの位置）とし、ポインタを左右に動かして段が変われば線とともに動く。'
const HF_15_RING_SHAPE = '⭐ 丸は中の抜けた輪とし、外径は 表 T-206 の `S-620`、輪の太さは線と同じ `S-213`、中はパネルの地（表 T-236 の `S-150`）とすること（MUST）。'
const HF_15_FOLDED = '⭐ 折りたたまれたタスクグループの中へ落とすときも、その行の真下の隙間に、1 段深い字下げから線を引いて示す。'
const HF_15_NO_FRAME = '⛔ **落ち先を示すために、タスクグループを枠で囲んではならない（MUST NOT）**'
const HF_15_COLOR = '線と丸の色は 表 T-236 の `S-151`、太さは 表 T-206 の `S-213` とすること（MUST）。'
const HF_15_GROUND = '② 掴んでいるタスクグループとその配下には地を敷くこと（MUST）。'
const HF_15_GROUND_COLOR = '色は 表 T-236 の `S-151`、濃さは 表 T-206 の `S-215` とすること（MUST）'
const HF_15_GAP_RULE = '隙間は、行の高さの中点がポインタより上にある行の数で決まる'
const HF_15_DEPTH_RULE = '⭐ 隙間に置ける段は、下限を下のタスクグループの段（無ければ 1）、上限を上のタスクグループの段 ＋ 1（無ければ 1）とすること（MUST）。'
const HF_15_FOLDED_GAP = '⭐ **折りたたまれたタスクグループの真下の隙間では、その段 ＋ 1 を選べること（MUST）**'
const S_213_ROW = '| S-213 | タスクグループパネルに引く帯と線の太さ（表 T-051 の `HF-18` の帯と、`HF-15` の差し込み線と丸の輪） | 3px 🔎 |'
const S_620_ROW = '| S-620 | タスクグループを運ぶあいだ、差し込み線の左端に立てる丸の外径（表 T-051 の `HF-15`） | 12px 🔎 |'

// WHY: the cr-772 tree; drawn order A(1), A1(2), A1x(3), Ah(2), A2(2), A2a(3), B(1), B1(2), C(1, folded), D(1), E(1), E1(2), E2(3), E3(4).
const DEPTH_OF: Readonly<Record<string, number>> = { A: 1, A1: 2, A1x: 3, Ah: 2, A2: 2, A2a: 3, B: 1, B1: 2, C: 1, D: 1, E: 1, E1: 2, E2: 3, E3: 4 }
// WHY: the held task group and every one under it (HF-15 part 2), for the two task groups these cases hold.
const CARRIED_WITH: Readonly<Record<string, readonly string[]>> = { D: ['D'], E1: ['E1', 'E2', 'E3'] }
// WHY: a drawn row standing at each depth, to read where that depth's indent starts.
const ROW_AT_DEPTH: Readonly<Record<number, string>> = { 1: 'A', 2: 'A1', 3: 'A1x', 4: 'E3' }

interface Carry {
  readonly bench: CarryBench
  readonly press: { readonly x: number; readonly y: number }
  // WHY: put the pointer at a height inside the gap under `upperId` (between its middle and the next counted row's middle), `steps` indents right of the press.
  readonly at: (upperId: string, lowerId: string, steps: number, part?: number) => void
}

function carry(heldId: string): Carry {
  const bench = carryBench(documentOf() as unknown as Document)
  const press = bench.press(heldId)
  bench.move(press.x, press.y + S_208 + 3)
  const step = indentPx()
  return {
    bench,
    press,
    at: (upperId, lowerId, steps, part = 0.5) => {
      const upper = bench.layoutBox(upperId)
      const lower = bench.layoutBox(lowerId)
      const from = upper.y + upper.height / 2
      const to = lower.y + lower.height / 2
      bench.move(press.x + steps * step, from + (to - from) * part)
    },
  }
}

const page = (bench: CarryBench, element: FakeElement): PageBox => pageBoxOf(element, bench.root())

const px = (value: string | undefined): number => {
  const found = /^(-?[\d.]+)px$/.exec((value ?? '').trim())
  return found === null ? ((value ?? '').trim() === '0' ? 0 : NaN) : Number(found[1])
}

// WHY: where a row's indent ends and its content (grab strip, then name: FR-085) starts.
function indentStartOf(bench: CarryBench, id: string): number {
  const row = bench.row(id)
  const style = styleMap(row)
  let padding = px(style.get('padding-left'))
  if (Number.isNaN(padding)) {
    const parts = (style.get('padding') ?? '').trim().split(/\s+/)
    const left = parts.length === 4 ? parts[3] : parts.length >= 2 ? parts[1] : parts[0]
    padding = px(left)
  }
  return page(bench, row).left + padding
}

const boundaryUnder = (bench: CarryBench, id: string): number => {
  const box = page(bench, bench.row(id))
  return box.top + box.height
}

function lineOf(bench: CarryBench): FakeElement {
  const line = bench.line()
  if (line === null) throw new Error('no drop line is drawn')
  return line
}

// WHY: every round, bordered part drawn beside the line (in the line or in the layer holding it).
function ringsOf(bench: CarryBench): FakeElement[] {
  const holder = lineOf(bench).parentNode as FakeElement
  return selfAndDescendants(holder).filter((one) => {
    const style = styleMap(one)
    const radius = (style.get('border-radius') ?? '').trim()
    const size = outerSizeOf(one)
    const round = radius === '50%' || (radius !== '' && px(radius) >= size.width / 2)
    return round && size.stroke > 0
  })
}

// WHY: every var(--x) written in a value, replaced by what the unit's root declares for it.
function expand(bench: CarryBench, written: string): string {
  const rootStyle = styleMap(bench.root())
  return written.replace(/var\((--[\w-]+)\)/g, (_all, name: string) => rootStyle.get(name.toLowerCase()) ?? `(no ${name})`).replace(/\s+/g, '').toLowerCase()
}

const FRAME_PROPERTIES = /^(outline|border|box-shadow)/

function framesOf(bench: CarryBench, element: FakeElement): string {
  return [...styleMap(element)]
    .filter(([property]) => FRAME_PROPERTIES.test(property))
    .map(([property, value]) => `${property}:${expand(bench, value)}`)
    .sort()
    .join(';')
}

describe('DFC-2961 -- the manuscript these cases are driven by', () => {
  it.each([
    HF_15_LINE,
    HF_15_ON_BOUNDARY,
    HF_15_RING,
    HF_15_RING_SHAPE,
    HF_15_FOLDED,
    HF_15_NO_FRAME,
    HF_15_COLOR,
    HF_15_GROUND,
    HF_15_GROUND_COLOR,
    HF_15_GAP_RULE,
    HF_15_DEPTH_RULE,
    HF_15_FOLDED_GAP,
  ])('HF-15 still says it: %s', (text) => {
    expect(REQUIREMENTS).toContain(text)
  })

  it.each([S_213_ROW, S_620_ROW])('T-206 still states the row: %s', (text) => {
    expect(SETTINGS).toContain(text)
  })

  it('reads S-213 as 3 and S-620 as 12 px', () => {
    expect(S_213).toBe(3)
    expect(S_620).toBe(12)
  })
})

describe('HF-15 ① -- the line stands on the boundary of the gap, not at the pointer height', () => {
  it.each([0.1, 0.5, 0.95])('stands on the A1 | A1x boundary with the pointer at %s of the way between their middles', (part) => {
    const { bench, at } = carry('D')
    at('A1', 'A1x', 0, part)
    const line = page(bench, lineOf(bench))
    expect(line.top + line.height / 2).toBeCloseTo(boundaryUnder(bench, 'A1'), 6)
    expect(boundaryUnder(bench, 'A1')).toBeCloseTo(page(bench, bench.row('A1x')).top, 6)
  })

  it('jumps by one row to the next boundary when the pointer passes the next middle', () => {
    const { bench, at } = carry('D')
    at('A1', 'A1x', 0)
    const first = page(bench, lineOf(bench))
    at('A1x', 'Ah', 0)
    const second = page(bench, lineOf(bench))
    expect(second.top + second.height / 2).toBeCloseTo(boundaryUnder(bench, 'A1x'), 6)
    expect(second.top - first.top).toBeCloseTo(page(bench, bench.row('A1x')).height, 6)
  })

  it('draws the line S-213 thick in S-151, from the indent of the chosen depth to the right edge of the panel', () => {
    const { bench, at } = carry('D')
    at('A1', 'A1x', 0)
    const element = lineOf(bench)
    const line = page(bench, element)
    expect(line.height).toBeCloseTo(S_213, 6)
    // WHY: the gap A1 | A1x admits depth 3 only (lower bound A1x = 3, upper bound A1 + 1 = 3).
    expect(line.left).toBeCloseTo(indentStartOf(bench, ROW_AT_DEPTH[3] as string), 6)
    const panelRow = page(bench, bench.row('A'))
    expect(line.left + line.width).toBeCloseTo(panelRow.left + panelRow.width, 6)
    expect(expand(bench, styleMap(element).get('background') ?? styleMap(element).get('background-color') ?? '')).toBe(screenColor('S-151'))
  })
})

describe('HF-15 ① -- the ring at the left end of the line', () => {
  it('draws exactly one ring, S-620 across, S-213 thick, solid S-151, hollow with the panel ground S-150', () => {
    const { bench, at } = carry('D')
    at('B1', 'C', 0)
    const rings = ringsOf(bench)
    expect(rings, rings.map(serialize).join('\n')).toHaveLength(1)
    const ring = rings[0] as FakeElement
    const size = outerSizeOf(ring)
    expect(size.width).toBeCloseTo(S_620, 6)
    expect(size.height).toBeCloseTo(S_620, 6)
    expect(size.stroke).toBeCloseTo(S_213, 6)
    const style = styleMap(ring)
    const border = expand(bench, style.get('border') ?? `${style.get('border-style') ?? ''}${style.get('border-color') ?? ''}`)
    expect(border).toContain('solid')
    expect(border).toContain(screenColor('S-151'))
    expect(expand(bench, style.get('background') ?? style.get('background-color') ?? '')).toBe(screenColor('S-150'))
  })

  it('centres the ring on the left end of the line', () => {
    const { bench, at } = carry('D')
    at('B1', 'C', 0)
    const line = page(bench, lineOf(bench))
    const ring = ringsOf(bench)[0] as FakeElement
    const box = page(bench, ring)
    const size = outerSizeOf(ring)
    // WHY: the page box starts at the border edge whichever box-sizing is used; the outer size already includes the border.
    expect(box.left + size.width / 2).toBeCloseTo(line.left, 6)
    expect(box.top + size.height / 2).toBeCloseTo(line.top + line.height / 2, 6)
  })

  // WHY: the gap B1 | C admits depths 1 to 3 (lower bound C = 1, upper bound B1 + 1 = 3); D is pressed at depth 1, so steps move the depth from 1 and stop silently at the ends.
  it.each([
    [-1, 1],
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 3],
  ])('with the pointer %s indents right of the press, stands the line and its ring at the indent of depth %s', (steps, depth) => {
    const { bench, at } = carry('D')
    at('B1', 'C', steps)
    const line = page(bench, lineOf(bench))
    expect(line.left).toBeCloseTo(indentStartOf(bench, ROW_AT_DEPTH[depth] as string), 6)
    expect(line.top + line.height / 2).toBeCloseTo(boundaryUnder(bench, 'B1'), 6)
    const ring = ringsOf(bench)
    expect(ring).toHaveLength(1)
    expect(page(bench, ring[0] as FakeElement).left + outerSizeOf(ring[0] as FakeElement).width / 2).toBeCloseTo(line.left, 6)
  })

  it('moves the line and the ring by one indent (S-37 times the display ratio) per depth', () => {
    const { bench, at } = carry('D')
    const lefts: number[] = []
    for (const steps of [0, 1, 2]) {
      at('B1', 'C', steps)
      lefts.push(page(bench, lineOf(bench)).left)
    }
    expect((lefts[1] as number) - (lefts[0] as number)).toBeCloseTo(indentPx(), 6)
    expect((lefts[2] as number) - (lefts[1] as number)).toBeCloseTo(indentPx(), 6)
  })
})

describe('HF-15 ① -- a folded task group takes a line one level deeper under its row', () => {
  it('draws the line under the folded C at the indent of depth 2, with its ring', () => {
    const { bench, at } = carry('E1')
    // WHY: E1 is pressed at depth 2; the gap C | D admits 1 to 2 (lower bound D = 1, folded C + 1 = 2).
    at('C', 'D', 0)
    expect(DEPTH_OF['C']).toBe(1)
    const line = page(bench, lineOf(bench))
    expect(line.top + line.height / 2).toBeCloseTo(boundaryUnder(bench, 'C'), 6)
    expect(line.left).toBeCloseTo(indentStartOf(bench, ROW_AT_DEPTH[2] as string), 6)
    expect(line.left - indentStartOf(bench, 'C')).toBeCloseTo(indentPx(), 6)
    expect(ringsOf(bench)).toHaveLength(1)
  })

  it('draws the line under C at the indent of C itself when the pointer goes one indent left', () => {
    const { bench, at } = carry('E1')
    at('C', 'D', -1)
    const line = page(bench, lineOf(bench))
    expect(line.left).toBeCloseTo(indentStartOf(bench, 'C'), 6)
  })
})

describe('HF-15 -- no task group is framed to show the drop', () => {
  // WHY: each landing makes a different task group the parent: none (depth 1), B (depth 2), B1 (depth 3), the folded C (depth 2 under C).
  const LANDINGS: readonly [string, string, string, string, number][] = [
    ['no parent', 'D', 'B1', 'C', -1],
    ['the parent B', 'D', 'B1', 'C', 1],
    ['the parent B1', 'D', 'B1', 'C', 2],
    ['the folded parent C', 'E1', 'C', 'D', 0],
    ['the parent A1 (deep)', 'D', 'A1', 'A1x', 0],
  ]

  it.each(LANDINGS)('draws no frame for %s: every row not carried keeps the outline, border and shadow it had before the press', (_name, held, upper, lower, steps) => {
    const before = carryBench(documentOf() as unknown as Document)
    const framesUnder = (bench: CarryBench, id: string): string => selfAndDescendants(bench.row(id)).map((one) => framesOf(bench, one)).join('|')
    const idle = new Map(Object.keys(DEPTH_OF).map((id) => [id, framesUnder(before, id)]))
    const { bench, at } = carry(held)
    at(upper, lower, steps)
    expect(bench.line()).not.toBeNull()
    for (const id of Object.keys(DEPTH_OF)) {
      if ((CARRIED_WITH[held] ?? []).includes(id)) continue
      expect(framesUnder(bench, id), `row ${id} gained a frame`).toBe(idle.get(id))
    }
  })

  it.each(LANDINGS)('draws nothing in S-151 with an outline, border or shadow except the one ring, for %s', (_name, held, upper, lower, steps) => {
    const { bench, at } = carry(held)
    at(upper, lower, steps)
    const color = screenColor('S-151')
    const framed = [...selfAndDescendants(bench.tree()), ...selfAndDescendants(lineOf(bench).parentNode as FakeElement)].filter((one) =>
      framesOf(bench, one).includes(color),
    )
    expect(framed.map(serialize)).toEqual(ringsOf(bench).map(serialize))
  })
})

describe('HF-15 ② ③ -- at a boundary the held ground and the name copy stay', () => {
  it('keeps the S-151 ground at S-215 on the held task group and every one under it, and the copy with its name', () => {
    const { bench, at } = carry('E1')
    at('C', 'D', 0)
    expect(bench.line()).not.toBeNull()
    for (const id of ['E1', 'E2', 'E3']) {
      const style = styleMap(bench.row(id))
      const ground = expand(bench, style.get('background') ?? style.get('background-color') ?? '')
      expect(ground, `${id} ground`).toContain(screenColor('S-151'))
      expect(ground, `${id} ground`).toContain(`${S_215}%`)
    }
    for (const id of ['D', 'E']) {
      const ground = expand(bench, styleMap(bench.row(id)).get('background') ?? '')
      expect(ground, `${id} is not held`).not.toContain(screenColor('S-151'))
    }
    const copy = bench.copy()
    expect(copy).not.toBeNull()
    const name = (bench.built.loop.document().schedule.taskGroups as unknown as { id: string; name: string }[]).find((g) => g.id === 'E1')?.name ?? ''
    expect((copy as FakeElement).textContent).toContain(name)
  })
})
