// CR-604: the pause mark PM-3 is one bar as thick as the "!" bar, and markers show by default.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { unbroken } from '../contract/spec-table'
import { cellOf, day, notStored, rowOf, sceneOf, taskOf, type Scene } from './cr-430-cross-section-scene'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

// see FR-013
const FR_013_PAUSE_BAR =
  '中断の記号 `( − )`（表 T-021 の `PM-3`）は、円の中心を通る水平の横棒 1 本とし、半分の長さを円の半径に 表 T-206 の `S-341` を掛けた値、太さを `S-24` に同表の `S-328` を掛けた値とすること（MUST）'
// see FR-013, S-328
const FR_013_BANG_BAR = '遅れの記号 `(!)` の縦棒の太さは、`S-24` に 表 T-206 の `S-328` を掛けた値とすること（MUST）'
// see T-021
const PM_3_STATES = ['中断・再開予定あり', '中断・再開日未定']
// see T-019a
const PS_3_CONDITION = '`resumeValid` が `false`'
const PS_4_CONDITION = '`resume` に日付がある'

const PAUSE_SYMBOL = '( − )'
const OLD_PAUSE_SYMBOL = '( \\ )'

// see S-328, S-341
const S_328 = notStored('S-328')
const S_341 = notStored('S-341')
// see S-63
const MARKER_VISIBLE = cellOf('T-202', 'S-63', 'キー')

// WHY: the renderer writes coordinates rounded to two decimals; one rounding is at most 0.005.
const ROUND = 0.005

interface Shape {
  readonly tag: string
  readonly attrs: string
}

const attrOf = (shape: Shape, name: string): string | null =>
  new RegExp(`(?:^|\\s)${name}="([^"]*)"`).exec(shape.attrs)?.[1] ?? null

const numOf = (shape: Shape, name: string): number => {
  const text = attrOf(shape, name)
  if (text === null) throw new Error(`<${shape.tag}> has no ${name}: ${shape.attrs}`)
  return Number(text)
}

const markerShapesOf = (svg: string, uid: number): readonly Shape[] =>
  [...svg.matchAll(/<([a-zA-Z]+)\b((?:[^<>"]|"[^"]*")*?)\/?>/g)]
    .filter((one) => (one[2] ?? '').includes(`data-figure="task-${uid}-marker"`))
    .map((one) => ({ tag: one[1] as string, attrs: one[2] as string }))

interface DrawnMark {
  readonly symbol: string
  readonly centre: { readonly x: number; readonly y: number }
  readonly radius: number
  readonly ring: Shape
  readonly glyph: readonly Shape[]
}

// WHY: the ring is the stroked circle as wide as the marker; everything else in the marker is the symbol.
const drawnMarkOf = (scene: Scene, uid: number): DrawnMark => {
  const marker = scene.taskOf(uid).marker
  if (marker === null) throw new Error(`task ${uid}: no progress marker in the geometry`)
  const shapes = markerShapesOf(scene.svg(), uid)
  const rings = shapes.filter(
    (one) => one.tag === 'circle' && Math.abs(numOf(one, 'r') - marker.radius) <= ROUND && attrOf(one, 'stroke') !== null,
  )
  if (rings.length !== 1) throw new Error(`task ${uid}: ${rings.length} marker rings in ${JSON.stringify(shapes)}`)
  const ring = rings[0] as Shape
  return {
    symbol: marker.symbol,
    centre: marker.centre,
    radius: marker.radius,
    ring,
    glyph: shapes.filter((one) => one !== ring),
  }
}

// see T-019
const PA_4 = { actualStart: day(2), stop: day(5), resumeValid: false, percentComplete: 30 }
const PA_3 = { actualStart: day(2), stop: day(5), resume: day(8), resumeValid: true, percentComplete: 30 }
const PA_2 = { actualStart: day(2), stop: day(5), resumeValid: true, percentComplete: 30 }

const PLAN = { name: 'a task', start: day(2), finish: day(12) }

// WHY: no status date, so no T-021b condition holds and PM-4 cannot win over PM-3 (FR-046).
const pausedScene = (pause: Readonly<Record<string, unknown>>): Scene =>
  sceneOf({ tasks: [taskOf({ uid: 1, ...PLAN, ...pause })], settings: { [MARKER_VISIBLE]: true } })

// WHY: a status date past the start of an unstarted task makes it late (T-021b DL-2), so it shows PM-4;
// the PA-4 task has no resume date, so DL-3 cannot make it late.
const sideBySide = (): Scene =>
  sceneOf({
    tasks: [
      taskOf({ uid: 1, ...PLAN, ...PA_4 }),
      taskOf({ uid: 2, name: 'late', start: day(2), finish: day(4) }),
    ],
    statusDate: day(20),
    settings: { [MARKER_VISIBLE]: true },
  })

const barOf = (mark: DrawnMark, uid: number): Shape => {
  const lines = mark.glyph.filter((one) => one.tag === 'line')
  if (lines.length !== 1) throw new Error(`task ${uid}: ${lines.length} <line> in the symbol ${JSON.stringify(mark.glyph)}`)
  return lines[0] as Shape
}

describe('CR-604 -- the clauses these cases rest on still stand', () => {
  it(`FR-013 still says: ${FR_013_PAUSE_BAR}`, () => {
    expect(REQUIREMENTS).toContain(FR_013_PAUSE_BAR)
    expect(REQUIREMENTS).toContain(FR_013_BANG_BAR)
  })

  it('T-021 PM-3 folds both pause states; T-019a PS-3 / PS-4 are how a Task reads as paused', () => {
    const states = cellOf('T-021', 'PM-3', '対応する状態')
    for (const one of PM_3_STATES) expect(states).toContain(one)
    // WHY: each condition cell is one sentence spelled with code spans, so it is read raw (DFC-343).
    expect((rowOf('T-019a', 'PS-3').by['条件'] ?? '').trim()).toBe(PS_3_CONDITION)
    expect((rowOf('T-019a', 'PS-4').by['条件'] ?? '').trim()).toBe(PS_4_CONDITION)
    expect(cellOf('T-019a', 'PS-3', '状態')).toBe(PM_3_STATES[1])
    expect(cellOf('T-019a', 'PS-4', '状態')).toBe(PM_3_STATES[0])
  })

  it('the read values are numbers', () => {
    for (const one of [S_328, S_341]) expect(Number.isFinite(one) && one > 0).toBe(true)
    expect(MARKER_VISIBLE).toBe('progressMarkerVisible')
  })
})

describe('T-021 PM-3 -- the symbol cell', () => {
  it(`PM-3's symbol is ${PAUSE_SYMBOL}`, () => {
    expect(cellOf('T-021', 'PM-3', '記号')).toBe(PAUSE_SYMBOL)
  })

  it(`no ${OLD_PAUSE_SYMBOL} remains in 01-04-requirements.md`, () => {
    expect(REQUIREMENTS).not.toContain(OLD_PAUSE_SYMBOL)
  })
})

describe('FR-013 -- the pause mark PM-3 is one horizontal bar through the centre', () => {
  for (const [name, pause] of [
    ['PA-4 (中断・再開日未定)', PA_4],
    ['PA-3 (中断・再開予定あり)', PA_3],
  ] as const) {
    it(`${name}: the marker carries PM-3 and its symbol is exactly one <line>`, () => {
      const mark = drawnMarkOf(pausedScene(pause), 1)
      expect(mark.symbol, 'premise: a paused Task shows PM-3').toBe('PM-3')
      expect(mark.glyph.map((one) => one.tag), FR_013_PAUSE_BAR).toEqual(['line'])
    })

    it(`${name}: 円の中心を通る水平の横棒 -- y1 == y2 == cy, x1 + x2 == 2 cx`, () => {
      const mark = drawnMarkOf(pausedScene(pause), 1)
      const bar = barOf(mark, 1)
      const cx = numOf(mark.ring, 'cx')
      const cy = numOf(mark.ring, 'cy')
      expect(Math.abs(numOf(bar, 'y1') - numOf(bar, 'y2')), 'horizontal').toBeLessThanOrEqual(1e-9)
      expect(Math.abs(numOf(bar, 'y1') - cy), 'through the centre (y)').toBeLessThanOrEqual(2 * ROUND)
      expect(Math.abs(numOf(bar, 'x1') + numOf(bar, 'x2') - 2 * cx), 'centred on cx').toBeLessThanOrEqual(4 * ROUND)
      expect(Math.abs(cx - mark.centre.x), 'premise: the ring sits on the marker centre').toBeLessThanOrEqual(ROUND)
    })

    it(`${name}: 半分の長さを円の半径に S-341 を掛けた値 -- length == 2 x r x S-341`, () => {
      const mark = drawnMarkOf(pausedScene(pause), 1)
      const bar = barOf(mark, 1)
      const length = Math.abs(numOf(bar, 'x2') - numOf(bar, 'x1'))
      const r = numOf(mark.ring, 'r')
      expect(Math.abs(length - 2 * r * S_341), `${FR_013_PAUSE_BAR}: length ${length}, r ${r}`).toBeLessThanOrEqual(
        2 * ROUND + 2 * S_341 * ROUND,
      )
    })

    it(`${name}: 太さを S-24 に S-328 を掛けた値 -- stroke-width == markerStroke x S-328`, () => {
      // WHY: the ring is drawn at S-24 (markerStroke) as scaled for the screen (FR-094), so the bar is read against it.
      const mark = drawnMarkOf(pausedScene(pause), 1)
      const bar = barOf(mark, 1)
      const ring = numOf(mark.ring, 'stroke-width')
      expect(ring, 'premise: the ring is stroked (S-24)').toBeGreaterThan(0)
      const width = numOf(bar, 'stroke-width')
      expect(Math.abs(width - ring * S_328), `${FR_013_PAUSE_BAR}: bar ${width}, ring ${ring}`).toBeLessThanOrEqual(
        ROUND + S_328 * ROUND,
      )
    })

    it(`${name}: the bar's ends are cut (stroke-linecap absent or butt)`, () => {
      const bar = barOf(drawnMarkOf(pausedScene(pause), 1), 1)
      const cap = attrOf(bar, 'stroke-linecap')
      expect(cap === null || cap === 'butt', `stroke-linecap="${cap}"`).toBe(true)
      expect(/stroke-linecap\s*:\s*(round|square)/.test(attrOf(bar, 'style') ?? ''), 'no cap in a style').toBe(false)
    })
  }

  it('control: an in-progress Task (PA-2) shows PM-1 and no bar, so the PM-3 cases discriminate', () => {
    const mark = drawnMarkOf(pausedScene(PA_2), 1)
    expect(mark.symbol).toBe('PM-1')
    expect(mark.glyph.filter((one) => one.tag === 'line')).toEqual([])
  })
})

describe('JDG-962 -- the "!" bar of PM-4 and the PM-3 bar share S-328', () => {
  it('the PM-3 bar and the PM-4 vertical bar have the same stroke-width', () => {
    const scene = sideBySide()
    const paused = drawnMarkOf(scene, 1)
    const late = drawnMarkOf(scene, 2)
    expect([paused.symbol, late.symbol], 'premise: one PM-3 and one PM-4 in one picture').toEqual(['PM-3', 'PM-4'])
    const pauseBar = barOf(paused, 1)
    const bangBar = barOf(late, 2)
    expect(Math.abs(numOf(bangBar, 'x1') - numOf(bangBar, 'x2')), 'premise: the "!" bar is vertical').toBeLessThanOrEqual(1e-9)
    expect(Math.abs(numOf(pauseBar, 'stroke-width') - numOf(bangBar, 'stroke-width')), FR_013_BANG_BAR).toBeLessThanOrEqual(
      2 * ROUND,
    )
  })
})

describe('S-63 -- progress markers are shown by default', () => {
  const inProgress = (settings: Readonly<Record<string, unknown>>): Scene =>
    sceneOf({ tasks: [taskOf({ uid: 1, ...PLAN, ...PA_2 })], settings })

  it(`with the settings defaults (no ${MARKER_VISIBLE} given) the Task's marker is drawn`, () => {
    const scene = inProgress({})
    expect(scene.settings[MARKER_VISIBLE as keyof typeof scene.settings], 'S-63 default').toBe(true)
    expect(scene.taskOf(1).marker, 'S-63: the marker is in the geometry').not.toBeNull()
    const shapes = markerShapesOf(scene.svg(), 1)
    expect(shapes.some((one) => one.tag === 'circle'), 'S-63: the marker circle is in the picture').toBe(true)
  })

  it(`control: ${MARKER_VISIBLE} false and no delay diagnostics draws no marker (unchanged)`, () => {
    const scene = inProgress({ [MARKER_VISIBLE]: false })
    expect(scene.taskOf(1).marker).toBeNull()
    expect(markerShapesOf(scene.svg(), 1)).toEqual([])
  })
})
