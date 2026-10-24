// DFC-567 part 3 spec-only cases: FR-029 -- each header zoom entrance (IC-12 .. IC-15) is drawn faint exactly when a press would not change its zoom (S-75 / S-97 floor, the S-229 zoomX ceiling, T-262 ZE-1 / ZE-3), dark again one step back, and all four are dark in between.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { CommandItem } from '../../src/adapter/screen-renderer/screen-renderer'
import { DEFAULT_DISPLAY_SCALE } from '../fixtures/display-scale'
import { numberIn, REQUIREMENTS, rowOf, shell, taskGroupDocument, type ShellBench, type TaskGroupSeed } from './cr-541-stage'

const FR_029_FAINT =
  'その入口を押しても、いま文書にも画面にも何も変えられないときは、その入口を薄く描くこと（MUST）'
const FR_029_EVERY_SURFACE = '本規則は `_assets/tbl-glossary.md` の 表 T-109 の全行に当たる —— タスクグループの操作子もパレットもヘッダーも同じである。'
const FR_016_THE_RANGE = 'ズームの倍率は表 T-203 の `S-75` / `S-76` が持つ範囲へ収めること（MUST）'
const FR_016_ZOOM_X_CEILING =
  '⭐ 日付の軸（`zoomX`）の上限は、見えている範囲が `_assets/tbl-settings.md` の 表 T-206 の `S-229` 日を下回らない倍率とすること（MUST） —— `Task Group Area` の幅 ÷（`S-229` × 等倍のときの 1 日の幅）である。'
const FR_016_DAY_WIDTH_SCALED = 'ここでいう等倍のときの 1 日の幅は、`FR-039` の表示の倍率の描く比を掛けたあとの `S-1` である'
const FR_016_NO_DEAD_ENTRANCE = '⛔ 上限に達したことを、押しても何も起きない入口で示してはならない（MUST NOT） —— 作法は `FR-029` に従う。'
const ZE_1_THE_LOWER_END =
  '⭐ いまの `zoomY` が次の ① と ② をともに満たすとき、縦軸は縮める側の端にあるとすること（MUST）'
const ZE_2_NO_WRITE_AT_THE_END =
  '端にあるときに縮める入力（表 T-023 の `MK-4` の縮める向き、`_assets/tbl-glossary.md` の 表 T-109 の `IC-14`、表 T-036 の `SK-16c`）を受けたら、`zoomY` を書き換えてはならない（MUST NOT）'
const ZE_3_NO_WRITE_AT_THE_CEILING =
  '拡げる入力（`MK-4` の拡げる向き、`IC-15`、`SK-16a`）で、本要求の上限で止めた値がいまの `zoomY` と等しいときは、`zoomY` を書き換えてはならない（MUST NOT）'
const T_262_END_IS_FR_029 = '⚠️ 端で押した `IC-14` / `IC-15` は `FR-029` の「押しても何も変えられない入口」に当たる'

describe('DFC-567 part 3 -- the manuscript these cases are driven by', () => {
  it.each([
    ['FR-029 (MUST) -- an entrance that can change nothing is faint', FR_029_FAINT],
    ['FR-029 -- the rule reaches the header too', FR_029_EVERY_SURFACE],
    ['FR-016 (MUST) -- a zoom stays in the S-75 / S-76 range', FR_016_THE_RANGE],
    ['FR-016 (MUST) -- the zoomX ceiling keeps S-229 days in view', FR_016_ZOOM_X_CEILING],
    ['FR-016 -- the day width is S-1 after the display scale ratio', FR_016_DAY_WIDTH_SCALED],
    ['FR-016 (MUST NOT) -- a ceiling is not told by a dead entrance', FR_016_NO_DEAD_ENTRANCE],
    ['T-262 ZE-1 (MUST) -- the lower end of zoomY', ZE_1_THE_LOWER_END],
    ['T-262 ZE-2 (MUST NOT) -- IC-14 at the lower end writes nothing', ZE_2_NO_WRITE_AT_THE_END],
    ['T-262 ZE-3 (MUST NOT) -- IC-15 at the ceiling writes nothing', ZE_3_NO_WRITE_AT_THE_CEILING],
    ['T-262 note -- IC-14 / IC-15 at an end are FR-029 entrances that change nothing', T_262_END_IS_FR_029],
  ])('still says it, word for word: %s', (_name, clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })

  it('T-109 gives IC-12 / IC-13 to S-75 and IC-14 / IC-15 to S-76, all on the App Header', () => {
    for (const [icon, setting] of [['IC-12', 'S-75'], ['IC-13', 'S-75'], ['IC-14', 'S-76'], ['IC-15', 'S-76']] as const) {
      const cells = rowOf('T-109', icon).cells.join(' ')
      expect(cells, icon).toContain('`App Header`')
      expect(cells, icon).toContain(`\`${setting}\``)
    }
  })
})

// see T-201, T-206, T-203
const setting = (table: string, id: string, column: string): number => numberIn(rowOf(table, id).by[column] ?? '')
const S_1 = setting('T-201', 'S-1', '既定値')
const S_4 = setting('T-201', 'S-4', '既定値')
const S_5 = setting('T-201', 'S-5', '既定値')
const S_6 = setting('T-201', 'S-6', '既定値')
const S_53 = setting('T-201', 'S-53', '既定値')
const S_54 = setting('T-201', 'S-54', '既定値')
const S_229 = setting('T-206', 'S-229', '既定')
const S_236 = setting('T-206', 'S-236', '既定')

describe('DFC-567 part 3 -- the premises read from the manuscript', () => {
  it('S-97 is S-54 (0.02), the floor of S-75', () => {
    expect(rowOf('T-206', 'S-97').by['既定']).toContain('S-54')
    expect(S_54).toBe(0.02)
  })
})

const A = 'cccccccc-0000-4000-8000-000000000001'
const B = 'cccccccc-0000-4000-8000-000000000002'
const C = 'cccccccc-0000-4000-8000-000000000003'
const Z = 'cccccccc-0000-4000-8000-000000000004'

// WHY: depth 3, so FR-018 drops task groups as zoomY lowers and ZE-1 (2) is a real condition here.
const DEEP: readonly TaskGroupSeed[] = [
  { id: A, parentId: null },
  { id: B, parentId: A },
  { id: C, parentId: B },
  { id: Z, parentId: null },
]

type Axis = 'zoomX' | 'zoomY'
interface ZoomEntrance {
  readonly icon: string
  readonly axis: Axis
  readonly back: string
  readonly end: string
}

const ENTRANCES: readonly ZoomEntrance[] = [
  { icon: 'IC-12', axis: 'zoomX', back: 'IC-13', end: 'S-75 floor (S-97)' },
  { icon: 'IC-13', axis: 'zoomX', back: 'IC-12', end: 'FR-016 zoomX ceiling (S-229)' },
  { icon: 'IC-14', axis: 'zoomY', back: 'IC-15', end: 'T-262 ZE-1 / ZE-2 lower end' },
  { icon: 'IC-15', axis: 'zoomY', back: 'IC-14', end: 'FR-016 zoomY ceiling, T-262 ZE-3' },
]
const ICONS = ENTRANCES.map((one) => one.icon)

const benches: ShellBench[] = []

beforeEach(() => {
  vi.useFakeTimers({
    toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date', 'performance'],
    now: Date.UTC(2026, 9, 24, 3, 0, 0),
  })
})

afterEach(() => {
  for (const one of benches.splice(0, benches.length)) one.restore()
  vi.useRealTimers()
})

function bench(settings: Record<string, unknown> = {}): ShellBench {
  const built = shell(taskGroupDocument(DEEP, { zoomX: 1, zoomY: 1, displayScale: DEFAULT_DISPLAY_SCALE, ...settings }))
  benches.push(built)
  return built
}

const zoomOf = (built: ShellBench, axis: Axis): number => built.loop.document().documentSettings[axis] as number

function entranceOf(built: ShellBench, icon: string): CommandItem {
  const found = built.last().appHeaderItems.commands.filter((one) => one.icon === icon)
  if (found.length !== 1) throw new Error(`the App Header carries ${found.length} items for ${icon}`)
  return found[0] as CommandItem
}

const enabledOf = (built: ShellBench): Record<string, boolean> =>
  Object.fromEntries(ICONS.map((icon) => [icon, entranceOf(built, icon).isEnabled]))

const press = (built: ShellBench, icon: string): void => built.press('App Header', icon, null)

interface Step {
  readonly at: number
  readonly wasEnabled: boolean
  readonly changed: boolean
}

// WHY: the walk records, per press, the drawn state before it and whether the press moved the zoom, so faintness is compared with the effect itself.
function walkToEnd(built: ShellBench, entrance: ZoomEntrance): readonly Step[] {
  const steps: Step[] = []
  for (let turn = 0; turn < 120; turn += 1) {
    const at = zoomOf(built, entrance.axis)
    const wasEnabled = entranceOf(built, entrance.icon).isEnabled
    press(built, entrance.icon)
    const changed = zoomOf(built, entrance.axis) !== at
    steps.push({ at, wasEnabled, changed })
    if (!changed) return steps
  }
  throw new Error(`${entrance.icon} had not stopped after 120 presses`)
}

describe('DFC-567 part 3 -- FR-029 in between, all four zoom entrances are drawn dark', () => {
  it('zoomX 1, zoomY 1: IC-12, IC-13, IC-14 and IC-15 are all enabled', () => {
    const built = bench()
    expect(enabledOf(built), FR_029_FAINT).toEqual({ 'IC-12': true, 'IC-13': true, 'IC-14': true, 'IC-15': true })
  })
})

describe('DFC-567 part 3 -- FR-029 a zoom entrance is faint exactly when a press changes no zoom', () => {
  it.each(ENTRANCES)('$icon pressed from 1 to its end ($end): every press finds it dark when it moves the zoom, faint when it does not', (entrance) => {
    const built = bench()
    const steps = walkToEnd(built, entrance)
    expect(steps.length, 'premise: the walk moved the zoom at least once').toBeGreaterThan(1)
    const disagreeing = steps.filter((one) => one.wasEnabled !== one.changed)
    expect(disagreeing, `${FR_029_FAINT} -- (wasEnabled must equal changed) at zoom ${JSON.stringify(disagreeing.map((one) => one.at))}`).toEqual([])
  })

  it.each(ENTRANCES)('$icon at its end ($end): only $icon is faint, and further presses keep the zoom and the faintness', (entrance) => {
    const built = bench()
    walkToEnd(built, entrance)
    const stopped = zoomOf(built, entrance.axis)
    const expected = Object.fromEntries(ICONS.map((icon) => [icon, icon !== entrance.icon]))
    expect(enabledOf(built), FR_029_FAINT).toEqual(expected)
    for (let turn = 0; turn < 3; turn += 1) press(built, entrance.icon)
    expect(zoomOf(built, entrance.axis)).toBe(stopped)
    expect(entranceOf(built, entrance.icon).isEnabled, FR_029_FAINT).toBe(false)
  })

  it.each(ENTRANCES)('$icon at its end ($end): one press of $back moves the zoom and draws all four dark again', (entrance) => {
    const built = bench()
    walkToEnd(built, entrance)
    const stopped = zoomOf(built, entrance.axis)
    press(built, entrance.back)
    expect(zoomOf(built, entrance.axis), `premise: ${entrance.back} moves the zoom off the end`).not.toBe(stopped)
    expect(enabledOf(built), FR_029_FAINT).toEqual({ 'IC-12': true, 'IC-13': true, 'IC-14': true, 'IC-15': true })
  })
})

describe('DFC-567 part 3 -- the ends the walks stop at are the ends the manuscript names', () => {
  it('IC-12 stops on the S-75 floor S-54 (S-97)', () => {
    const built = bench()
    walkToEnd(built, ENTRANCES[0]!)
    expect(zoomOf(built, 'zoomX'), FR_016_THE_RANGE).toBeCloseTo(S_54, 12)
  })

  it('IC-13 stops on the FR-016 zoomX ceiling: Task Group Area width / (S-229 x S-1 x the S-236 ratio at the default display scale)', () => {
    const built = bench()
    walkToEnd(built, ENTRANCES[1]!)
    const width = built.loop.current()?.regions.taskGroupArea.width
    if (width === undefined) throw new Error('the loop has drawn no frame')
    const ratio = S_236 * (DEFAULT_DISPLAY_SCALE / 100)
    expect(zoomOf(built, 'zoomX'), FR_016_ZOOM_X_CEILING).toBeCloseTo(width / (S_229 * S_1 * ratio), 6)
  })

  it('IC-14 stops inside the T-262 ZE-1 lower end: (1) the plan height is on its floor and (2) the task groups drawn are those drawn at S-54', () => {
    const built = bench()
    walkToEnd(built, ENTRANCES[2]!)
    const stopped = zoomOf(built, 'zoomY')
    expect(S_4 * stopped, 'ZE-1 (1)').toBeLessThanOrEqual(S_6 / S_5)
    const drawn = (one: ShellBench): readonly string[] => (one.loop.current()?.layout.taskGroups ?? []).map((group) => group.taskGroupId)
    expect(drawn(built), 'ZE-1 (2)').toEqual(drawn(bench({ zoomY: S_54 })))
    expect(stopped * S_53, 'premise: one S-53 step up leaves the end').toBeGreaterThan(stopped)
  })

  it('IC-15 stops where a raise would write the zoomY it already has (T-262 ZE-3)', () => {
    const built = bench()
    const steps = walkToEnd(built, ENTRANCES[3]!)
    expect(steps[steps.length - 1]?.changed, ZE_3_NO_WRITE_AT_THE_CEILING).toBe(false)
  })
})
