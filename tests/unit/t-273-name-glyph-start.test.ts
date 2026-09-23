// FR-002 / T-273 (CR-430, JDG-195): where the drawn glyphs of a name start, with no second S-31.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { unbroken } from '../contract/spec-table'
import {
  LABEL_GAP,
  LABEL_PAD,
  MARKER_D,
  MILESTONE_NAME_GAP,
  S_303,
  bandOf,
  bandOfRect,
  cellOf,
  day,
  sceneOf,
  taskOf,
  type Band,
  type Scene,
} from './cr-430-cross-section-scene'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

const FR_002_WRITE_START_IS_T_273 =
  '⭐ 字を書き出す位置は `FR-109` の 表 T-273 が持つ（`_assets/tbl-settings.md` の 表 T-201 の `S-31` ／ `S-32` ／ `S-301` のいずれか 1 つを、基準の端か進捗マーカーの右端に足した位置）。'
const FR_002_NOT_TWICE =
  '⛔ その値を 2 回数えてはならない（MUST NOT） —— 同表が与えるのは基準の端から**字そのもの**までの長さであり、箱の内側の余白ではない。'

const NAME_FROM = '名前の書き出し'
const says = (row: string): string => `T-273 ${row} ${NAME_FROM}: ${cellOf('T-273', row, NAME_FROM)}; ${FR_002_NOT_TWICE}`

// WHY: the SVG writes coordinates rounded, so allow half of the last written place.
const glyphXOf = (scene: Scene): { readonly x: number; readonly slack: number } => {
  const svg = scene.svg()
  const figure = svg.indexOf('data-figure="task-1-label"')
  expect(figure, 'premise: the name label is drawn').toBeGreaterThanOrEqual(0)
  const opened = svg.lastIndexOf('<text ', figure)
  const written = / x="(-?[\d.]+)"/.exec(svg.slice(opened, figure))?.[1]
  if (written === undefined) throw new Error('the name label was not drawn as a text with an x')
  return { x: Number(written), slack: 0.5 * 10 ** -(written.split('.')[1] ?? '').length + 1e-9 }
}

const expectGlyphAt = (scene: Scene, expected: number, row: string): void => {
  const { x, slack } = glyphXOf(scene)
  expect(Math.abs(x - expected), `${says(row)} -- drawn ${x}, expected ${expected}`).toBeLessThanOrEqual(slack)
  expect(Math.abs(x - (expected + LABEL_PAD)), `${says(row)} -- S-31 added a second time`).toBeGreaterThan(slack)
}

const placementOf = (scene: Scene): unknown =>
  (scene.placedOf(1) as unknown as { readonly labelPlacement?: unknown }).labelPlacement

const markerRightOf = (scene: Scene): number => {
  const marker = scene.taskOf(1).marker
  if (marker === null) throw new Error('premise: a marker is drawn')
  return marker.centre.x + marker.radius
}

const basisOf = (scene: Scene): Band => {
  const drawn = scene.taskOf(1)
  if (drawn.actual !== null) return bandOf(drawn.actual)
  const dummy = drawn.dummies[0]
  if (dummy !== undefined) return bandOfRect(dummy.ink)
  const figure = drawn.plan ?? drawn.milestoneFigure
  if (figure === null) throw new Error('premise: a basis is drawn')
  return bandOf(figure)
}

const SHORT = 'ab'
const LONG = 'a name that is far too long to stand inside a narrow bar'
const WIDE_ACTUAL = { actualStart: day(2), actualFinish: day(26), percentComplete: 60 }
const NARROW_ACTUAL = { actualStart: day(4), actualFinish: day(5), percentComplete: 20 }
const NO_MARKER = { progressMarkerVisible: false }

// see S-63
const rectangle = (over: Record<string, unknown>, settings: Record<string, unknown> = {}, name = SHORT): Scene =>
  sceneOf({
    tasks: [taskOf({ name, start: day(2), finish: day(28), ...over })],
    shapeKind: 'rectangle',
    settings: { progressMarkerVisible: true, ...settings },
  })

const milestone = (settings: Record<string, unknown> = {}): Scene =>
  sceneOf({
    tasks: [
      taskOf({
        name: SHORT,
        start: day(6),
        finish: day(6),
        milestone: true,
        actualStart: day(6),
        actualFinish: day(6),
        percentComplete: 100,
      }),
    ],
    shapeKind: 'milestone',
    settings: { progressMarkerVisible: true, ...settings },
  })

describe('FR-002 -- the manuscript these cases are driven by', () => {
  it.each([FR_002_WRITE_START_IS_T_273, FR_002_NOT_TWICE])('still says it, word for word: %s', (clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })
})

describe('T-273 -- the drawn glyphs start where the table puts the name, and S-31 is never added again', () => {
  it('LP-1: inside, the glyphs start at the marker right + S-32 (MUST)', () => {
    const scene = rectangle(WIDE_ACTUAL)
    expect(placementOf(scene), 'premise: the name fits').toBe('inside')
    expectGlyphAt(scene, markerRightOf(scene) + LABEL_GAP, 'LP-1')
  })

  it('LP-2: outside, the glyphs start at the marker right + S-32, the marker just right of the basis end (MUST)', () => {
    const scene = rectangle(NARROW_ACTUAL, {}, LONG)
    const basis = basisOf(scene)
    expect(placementOf(scene), 'premise: the name does not fit').toBe('right')
    expect(markerRightOf(scene) - MARKER_D, 'premise: LP-2 marker position').toBeCloseTo(basis.right, 6)
    expectGlyphAt(scene, markerRightOf(scene) + LABEL_GAP, 'LP-2')
  })

  it('LP-3: no marker, inside, the glyphs start at the basis start + S-31 (MUST)', () => {
    const scene = rectangle(WIDE_ACTUAL, NO_MARKER)
    expect(scene.taskOf(1).marker, 'premise: no marker').toBeNull()
    expectGlyphAt(scene, basisOf(scene).left + LABEL_PAD, 'LP-3')
  })

  it('LP-4: no marker, outside, the glyphs start at the basis end + S-31 (MUST)', () => {
    const scene = rectangle(NARROW_ACTUAL, NO_MARKER, LONG)
    expect(placementOf(scene), 'premise: the name does not fit').toBe('right')
    expectGlyphAt(scene, basisOf(scene).right + LABEL_PAD, 'LP-4')
  })

  it('LP-7: a milestone name starts at the marker right + S-301 (MUST)', () => {
    const scene = milestone()
    expectGlyphAt(scene, markerRightOf(scene) + MILESTONE_NAME_GAP, 'LP-7')
  })

  it('LP-8: with no marker, a milestone name starts S-303 of the way across the basis diamond (MUST)', () => {
    const scene = milestone(NO_MARKER)
    expect(scene.taskOf(1).marker, 'premise: no marker').toBeNull()
    const basis = basisOf(scene)
    expectGlyphAt(scene, basis.left + (basis.right - basis.left) * S_303, 'LP-8')
  })
})
