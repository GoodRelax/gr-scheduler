// W3 tester 4: FR-009 dependency lines -- the ground-coloured halo is not laid over the box of a plan or actual shape, ink included.

// WHY: the drawn picture is read from the frame loop's export scene (the same SVG the screen draws); every box is measured
// from the figure's own coordinates and stroke width, never from a number written here.

import { describe, expect, it } from 'vitest'

import { documentFromJson } from '../../src/adapter/document-codec/document-codec'
import type { Document } from '../../src/entity/document-model/document/document'
import { rowDocument, taskOf } from '../unit/cr-541-stage'
import { REQUIREMENTS, shellStage } from './cr-610-file-flow-stage'

const HALO_SPARES =
  '`HT-1` が形ごとに読む描いた形のうち、予定と実績の形（マイルストーンの図形を含む）のそれぞれを囲む矩形とし、輪郭と線の太さ・矢じり・点のインクを含めること（MUST）'
const HALO_NOT_ON_SHAPES = '⛔ **`Task` の形に重なる区間では、縁を敷いてはならない（MUST NOT）**'
const HALO_IS_GROUND = '手当ては、手前の線に地の色（`S-146`）の縁を敷くこととする（MUST）'

// see AT-46
const FS = 1

const link = (predecessorUid: number): Record<string, unknown> => ({
  predecessorUid,
  linkType: FS,
  lag: 0,
  lagFormat: 7,
  carry: {},
  carryElements: [],
})

// see HT-1
// WHY: a plain bar, a linked bar, a started bar with an actual, and a milestone, so every shape family is drawn.
/** @purity pure */
function shapesDocument(): Document {
  const draft = rowDocument([
    { id: 'g1', parentId: null },
    { id: 'g2', parentId: null },
    { id: 'g3', parentId: null },
    { id: 'g4', parentId: null },
  ])
  draft['schedule'].project.statusDate = '2026-04-08T17:00:00'
  draft['schedule'].tasks[0] = taskOf(1, { start: '2026-04-06T08:00:00', finish: '2026-04-08T17:00:00' })
  draft['schedule'].tasks[1] = taskOf(2, { start: '2026-04-09T08:00:00', finish: '2026-04-14T17:00:00', dependencies: [link(1)] })
  draft['schedule'].tasks[2] = taskOf(3, {
    start: '2026-04-06T08:00:00',
    finish: '2026-04-10T17:00:00',
    actualStart: '2026-04-06T08:00:00',
    percentComplete: 40,
    dependencies: [link(1)],
  })
  draft['schedule'].tasks[3] = taskOf(4, {
    start: '2026-04-15T08:00:00',
    finish: '2026-04-15T08:00:00',
    milestone: true,
    dependencies: [link(2)],
  })
  const read = documentFromJson(JSON.stringify(draft))
  if (!read.ok) throw new Error(`the bench document is not GRS JSON: ${JSON.stringify(read.faults)}`)
  return read.document
}

interface Box {
  readonly left: number
  readonly top: number
  readonly right: number
  readonly bottom: number
}

const attrsOf = (source: string): Record<string, string> =>
  Object.fromEntries([...source.matchAll(/([A-Za-z_:][-A-Za-z0-9_:.]*)="([^"]*)"/g)].map((hit) => [hit[1], hit[2]]))

/** @purity pure */
function numbersIn(text: string): readonly number[] {
  return [...text.matchAll(/-?\d+(?:\.\d+)?(?:e-?\d+)?/g)].map((hit) => Number(hit[0]))
}

// see HT-1
// WHY: the ink of a figure is its geometry grown by half its stroke width on every side.
/** @purity pure */
function inkBoxOf(tag: string, attrs: Readonly<Record<string, string>>): Box | null {
  const half = Number(attrs['stroke'] === undefined || attrs['stroke'] === 'none' ? 0 : attrs['stroke-width'] ?? 1) / 2
  let xs: number[] = []
  let ys: number[] = []
  if (tag === 'rect') {
    const x = Number(attrs['x'])
    const y = Number(attrs['y'])
    xs = [x, x + Number(attrs['width'])]
    ys = [y, y + Number(attrs['height'])]
  } else if (tag === 'polygon' || tag === 'polyline') {
    const all = numbersIn(attrs['points'] ?? '')
    xs = all.filter((_one, index) => index % 2 === 0)
    ys = all.filter((_one, index) => index % 2 === 1)
  } else if (tag === 'circle') {
    const r = Number(attrs['r'])
    xs = [Number(attrs['cx']) - r, Number(attrs['cx']) + r]
    ys = [Number(attrs['cy']) - r, Number(attrs['cy']) + r]
  } else if (tag === 'path' && /^[MLHVZ0-9.,\s-]+$/i.test(attrs['d'] ?? '') && !/[HV]/i.test(attrs['d'] ?? '')) {
    const all = numbersIn(attrs['d'] ?? '')
    xs = all.filter((_one, index) => index % 2 === 0)
    ys = all.filter((_one, index) => index % 2 === 1)
  } else {
    return null
  }
  if (xs.length === 0 || [...xs, ...ys].some((one) => !Number.isFinite(one))) return null
  return { left: Math.min(...xs) - half, top: Math.min(...ys) - half, right: Math.max(...xs) + half, bottom: Math.max(...ys) + half }
}

interface Figure {
  readonly name: string
  readonly box: Box
}

// see HT-1
/** @purity pure */
function shapeFiguresOf(svg: string): readonly Figure[] {
  const out: Figure[] = []
  for (const hit of svg.matchAll(/<(rect|polygon|polyline|circle|path)\b((?:[^<>"]|"[^"]*")*)\/?>/g)) {
    const attrs = attrsOf(hit[2] ?? '')
    const name = attrs['data-figure'] ?? ''
    if (!/^task-\d+-(plan|actual|dummy)$/.test(name)) continue
    if ((attrs['fill'] ?? '') === 'black' || (attrs['fill'] ?? '') === 'white') continue
    const box = inkBoxOf(hit[1] ?? '', attrs)
    if (box !== null) out.push({ name, box })
  }
  return out
}

// see HT-1
/** @purity pure */
function sparedBoxesOf(svg: string): readonly Box[] {
  const mask = /<mask\b[^>]*id="[^"]*halo[^"]*"[^>]*>([\s\S]*?)<\/mask>/.exec(svg)
  if (mask === null) return []
  return [...(mask[1] ?? '').matchAll(/<rect\b((?:[^<>"]|"[^"]*")*)\/?>/g)]
    .map((hit) => attrsOf(hit[1] ?? ''))
    .filter((attrs) => attrs['fill'] === 'black')
    .map((attrs) => inkBoxOf('rect', { ...attrs, stroke: 'none' }) as Box)
}

// WHY: the picture is written to the 0.01 px grid (NS-3), so a box may sit one grid step inside the ink it spares.
const GRID = 0.011

const covers = (outer: Box, inner: Box): boolean =>
  outer.left <= inner.left + GRID && outer.top <= inner.top + GRID && outer.right >= inner.right - GRID && outer.bottom >= inner.bottom - GRID

describe('the halo rule -- the manuscript these cases are driven by', () => {
  it.each([HALO_SPARES, HALO_NOT_ON_SHAPES, HALO_IS_GROUND])('01-04 still says: %s', (clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })
})

describe(`the halo rule -- ${HALO_SPARES}`, () => {
  it('every plan, actual and milestone shape of a linked schedule lies, ink included, inside a box the halo is not laid on', async () => {
    const built = await shellStage({ document: shapesDocument() })
    const svg = built.loop.exportScene()?.svg ?? ''
    const spared = sparedBoxesOf(svg)
    const figures = shapeFiguresOf(svg)
    expect(spared.length, `premise: the linked schedule lays a halo with spared boxes -- ${HALO_IS_GROUND}`).toBeGreaterThan(0)
    expect(
      [...new Set(figures.map((one) => one.name.replace(/^task-\d+-/, '')))].sort(),
      'premise: the picture draws a plan and an actual',
    ).toEqual(expect.arrayContaining(['actual', 'plan']))
    expect(figures.some((one) => one.name === 'task-4-plan'), 'premise: the milestone is drawn').toBe(true)
    const bare = figures.filter((one) => !spared.some((box) => covers(box, one.box)))
    expect(bare.map((one) => `${one.name} ${JSON.stringify(one.box)}`), HALO_SPARES).toEqual([])
  })
})
