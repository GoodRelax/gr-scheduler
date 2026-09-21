// CR-541: the plain wheel scrolls by the device's distance (FR-016 / S-176); the display-scale message
// on every press, even at an end, and no FR-029 notice at an end (T-260 SE-1 / SE-5, T-262 ZE-2 / ZE-3);
// Esc during a drag cancels the drag before the properties panel (T-028 IN-4); Ctrl+A while text entry
// is unsettled goes to the browser (T-028 IN-5a). Expectations come from docs/spec only.

import { afterEach, describe, expect, it } from 'vitest'

import type { HumanInput } from '../../src/adapter/input-command-translator/input-command-translator'
import { DEFAULT_DISPLAY_SCALE, DISPLAY_SCALE_STEPS } from '../fixtures/display-scale'
import {
  keyOf,
  NO_MODS,
  pointerOf,
  REQUIREMENTS,
  rowDocument,
  shell,
  taskOf,
  type RowSeed,
  type ShellBench,
} from './cr-541-stage'

const Q19 = '⭐ 修飾なしのホイールの縦スクロール（表 T-023 の `MK-1`）も、入力装置が出した距離だけ日程表を動かすこと（MUST）'
const Q20 = '1 行に満たない端数は `S-176` に持つ。⛔ 距離を行の数へ丸めてはならない（MUST NOT）'
const Q35 = '`IC-104` / `IC-105` と 表 T-036 の `SK-22` / `SK-23` が押されるたびに出すこと（MUST）'
const Q36 = '押しても倍率が変わらなかったとき（いちばん大きい段で上げる側、いちばん小さい段で下げる側）も出すこと（MUST）'
const Q37 = '⭐ 端の段で押して倍率が変わらなかった入口（`SE-1` の後段と、行の軸のズームの 表 T-262 の `ZE-2` / `ZE-3`）には、`FR-029` の行えない理由の通知を出してはならない（MUST NOT）'
const Q39 = '⛔ ドラッグ中にパネルを先に閉じてはならない（MUST NOT）'
const Q40 = '⭐ `SK-2`（`Ctrl+A`）も同じく、文字入力を確定していない間はショートカットとして効かせず、欄の文字をすべて選ぶ操作としてブラウザへ渡すこと（MUST）'

describe('CR-541 -- the clauses still stand in the manuscript', () => {
  it.each([Q19, Q20, Q35, Q36, Q37, Q39, Q40])('%s', (clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })
})

const benches: ShellBench[] = []
const keep = (built: ShellBench): ShellBench => {
  benches.push(built)
  return built
}
afterEach(() => {
  for (const one of benches.splice(0)) one.restore()
})

const manyRows = (count: number): RowSeed[] =>
  Array.from({ length: count }, (_unused, index) => ({ id: `row-${String(index + 1).padStart(2, '0')}`, parentId: null }))

// ---------------------------------------------------------------------------
// FR-016 -- the plain wheel
// ---------------------------------------------------------------------------

const wheelOf = (x: number, y: number, dy: number): HumanInput => ({
  kind: 'wheel',
  x,
  y,
  modifiers: NO_MODS,
  notches: 1,
  scrollPx: { x: 0, y: dy },
})

describe('FR-016 -- MK-1 moves the chart by the distance the device gave', () => {
  const scrolled = (dy: number) => {
    const built = keep(shell(rowDocument(manyRows(60))))
    const frame = built.loop.current()
    if (frame === null) throw new Error('premise: a frame was drawn')
    const area = frame.regions.rowArea
    const band = frame.layout.rows[0]!.height
    const before = new Map(frame.layout.rows.map((one) => [one.groupId, one.y]))
    built.send(wheelOf(area.x + area.width / 2, area.y + area.height / 2, dy))
    const after = built.loop.current()!.layout.rows
    const moved = after.filter((one) => before.has(one.groupId)).map((one) => before.get(one.groupId)! - one.y)
    return { built, band, moved }
  }

  it(Q19, () => {
    const { band, moved } = scrolled(10)
    expect(band, 'premise: a row band is taller than the distance').toBeGreaterThan(10)
    expect(moved.length).toBeGreaterThan(0)
    for (const one of moved) expect(Math.abs(one), 'every row moved by the distance').toBeCloseTo(10, 6)
  })

  it(Q20, () => {
    const { built, band } = scrolled(10)
    const offset = Number((built.loop.document().documentSettings as unknown as Record<string, unknown>)['scrollGroupOffset'])
    expect(band).toBeGreaterThan(10)
    expect(offset, 'the part of a row is held in S-176, not rounded away').toBeGreaterThan(0)
    expect(offset).toBeLessThan(1)
  })
})

// ---------------------------------------------------------------------------
// T-260 SE-1 / SE-5 and T-262 ZE-2 / ZE-3
// ---------------------------------------------------------------------------

const scaleBench = (displayScale: number, zoomY = 1): ShellBench =>
  keep(shell(rowDocument(manyRows(4), { displayScale, zoomY })))
const messageOf = (built: ShellBench): string | undefined => (built.last() as { scaleMessage?: string }).scaleMessage
const scaleOf = (built: ShellBench): number => Number(built.loop.document().documentSettings.displayScale)
const HIGHEST = DISPLAY_SCALE_STEPS[DISPLAY_SCALE_STEPS.length - 1]!
const LOWEST = DISPLAY_SCALE_STEPS[0]!
const SK_22 = keyOf('+', { ctrl: true, shift: true })
const SK_23 = keyOf('-', { ctrl: true, shift: true })
const pressHeader = (built: ShellBench, icon: string): void => built.press('App Header', icon, null)

describe('SE-1 -- a message on every press', () => {
  it.each([
    ['IC-105', null],
    ['IC-104', null],
    ['SK-22', SK_22],
    ['SK-23', SK_23],
  ] as const)(`${Q35} -- %s`, (name, input) => {
    const built = scaleBench(DEFAULT_DISPLAY_SCALE)
    expect(messageOf(built), 'premise: no message before a press').toBeUndefined()
    if (input === null) pressHeader(built, name)
    else built.send(input)
    expect(scaleOf(built), 'premise: the press moved the scale').not.toBe(DEFAULT_DISPLAY_SCALE)
    expect(messageOf(built) ?? '').toContain(`${scaleOf(built)}%`)
  })

  it.each([
    ['IC-105 at the highest step', HIGHEST, 'IC-105'],
    ['SK-22 at the highest step', HIGHEST, SK_22],
    ['IC-104 at the lowest step', LOWEST, 'IC-104'],
    ['SK-23 at the lowest step', LOWEST, SK_23],
  ] as const)(`${Q36} -- %s`, (_name, start, press) => {
    const built = scaleBench(start)
    if (typeof press === 'string') pressHeader(built, press)
    else built.send(press)
    expect(scaleOf(built), 'premise: the press changed nothing').toBe(start)
    expect(messageOf(built) ?? '').toContain(`${start}%`)
  })
})

describe('SE-5 -- no FR-029 notice at an end', () => {
  it.each([
    ['IC-105 at the highest step', HIGHEST, 'IC-105'],
    ['SK-22 at the highest step', HIGHEST, SK_22],
    ['IC-104 at the lowest step', LOWEST, 'IC-104'],
    ['SK-23 at the lowest step', LOWEST, SK_23],
  ] as const)(`${Q37} -- display scale, %s`, (_name, start, press) => {
    const built = scaleBench(start)
    expect(built.notices(), 'premise: no notice before the press').toEqual([])
    if (typeof press === 'string') pressHeader(built, press)
    else built.send(press)
    expect(scaleOf(built), 'premise: the press changed nothing').toBe(start)
    expect(built.notices()).toEqual([])
  })

  it.each([
    ['ZE-2: Alt+- at the shrinking end', '-'],
    ['ZE-3: Alt++ at the growing end', '+'],
  ] as const)(`${Q37} -- row zoom, %s`, (_name, sign) => {
    const built = scaleBench(DEFAULT_DISPLAY_SCALE)
    const zoomY = (): number => Number(built.loop.document().documentSettings.zoomY)
    let previous = Number.NaN
    for (let step = 0; step < 80 && zoomY() !== previous; step += 1) {
      previous = zoomY()
      built.send(keyOf(sign, { alt: true }))
    }
    const atEnd = zoomY()
    // The loop stops on the first press that changed nothing -- already one end press.
    const noticesBefore = built.notices().length
    built.send(keyOf(sign, { alt: true }))
    expect(zoomY(), 'premise: at the end the press does not change zoomY').toBe(atEnd)
    expect(built.notices().length, 'the end press raises no notice').toBe(noticesBefore)
    expect(noticesBefore, 'and none was standing from the presses that led there').toBe(0)
  })
})

// ---------------------------------------------------------------------------
// T-028 IN-4 -- Esc while a bar is being dragged, with the properties panel out
// ---------------------------------------------------------------------------

describe('IN-4 -- Esc cancels the drag before the panel', () => {
  it(Q39, () => {
    const built = keep(
      shell(
        rowDocument([{ id: 'row-1', parentId: null }, { id: 'row-2', parentId: null }], { scrollDate: '2026-03-30', zoomX: 20 }, {
          tasks: [taskOf(1, { start: '2026-04-06T08:00:00', finish: '2026-04-17T17:00:00' }), taskOf(2)],
        }),
      ),
    )
    const shape = built.loop.current()!.geometry.tasks.find((one) => one.taskUid === 1)
    const plan = shape?.plan
    if (plan === null || plan === undefined || plan.form !== 'outline') throw new Error('premise: task 1 is drawn as an outline')
    const xs = plan.points.map((one) => one.x)
    const ys = plan.points.map((one) => one.y)
    const centre = { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 }
    // FR-072: the panel is put out by its entrance, never by a selection alone (IC-17 of table T-109).
    pressHeader(built, 'IC-17')
    expect(built.last().propertiesPanel, 'premise: IC-17 puts the properties panel out').not.toBeNull()
    const before = JSON.stringify((built.loop.document().schedule as any).tasks[0])
    built.send(pointerOf('down', centre.x, centre.y))
    built.send(pointerOf('move', centre.x + 40, centre.y))
    built.send(pointerOf('move', centre.x + 80, centre.y))
    built.send(keyOf('Escape'))
    expect(built.last().propertiesPanel, 'the first Esc leaves the panel out').not.toBeNull()
    built.send(pointerOf('up', centre.x + 80, centre.y))
    expect(JSON.stringify((built.loop.document().schedule as any).tasks[0]), 'the first Esc cancelled the drag').toBe(before)
  })
})

// ---------------------------------------------------------------------------
// T-028 IN-5a -- Ctrl+A while text entry is unsettled
// ---------------------------------------------------------------------------

describe('IN-5a -- Ctrl+A reaches the text field', () => {
  it(Q40, () => {
    const built = keep(shell(rowDocument(manyRows(3)), { unsettledText: true }))
    const ctrlA = keyOf('A', { ctrl: true })
    expect(built.loop.isBrowserDefaultStopped(ctrlA), 'the browser keeps its select-all').toBe(false)
    built.send(ctrlA)
    const picked = built.loop.agentApiSeams().source.readSnapshot().selection
    expect(picked.items, 'SK-2 did not select the chart').toEqual([])
  })

  it(`${Q40} -- control: with no text entry, Ctrl+A is SK-2`, () => {
    const built = keep(shell(rowDocument(manyRows(3))))
    const ctrlA = keyOf('A', { ctrl: true })
    built.send(ctrlA)
    const picked = built.loop.agentApiSeams().source.readSnapshot().selection
    expect(picked.items.length).toBeGreaterThan(0)
  })
})
