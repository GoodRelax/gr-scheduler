// DFC-3479 spec-only cases: a press and release on a plan end or a fade grab point selects and writes nothing (T-270 PE-3 / PE-11, S-208).

import { afterEach, describe, expect, it } from 'vitest'

import type { Document } from '../../src/entity/document-model/document/document'
import type { Task } from '../../src/entity/document-model/schedule/schedule'
import { itemAtPointer } from '../../src/entity/layout-engine/item-hit-area/item-hit-area'
import type { Point } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import { sizePx, sizesOrSeam, specRow } from './cr-430-bench'
import { dayUnder, frameOf, planBox, xOfDay } from './cr-430-stage'
import {
  REQUIREMENTS,
  april,
  asDocument,
  restoreAnimationFrames,
  stage,
  taskOf,
  taskRow,
  visualOf,
  type Stage,
} from './cr-646-stage'

afterEach(restoreAnimationFrames)

const BAR = 1
const ARROW = 2
const FADED = 3

const FADE_DAYS = 3

// see T-206
// WHY: the press / pull boundary is the settings row S-208, never a number held here.
const S_208 = sizePx('S-208')

const TASKS = [
  taskRow(BAR),
  taskRow(ARROW),
  taskRow(FADED, { finish: april(20, '17:00:00'), fadeInDays: FADE_DAYS, fadeOutDays: FADE_DAYS }),
]

/** @purity pure */
function endsDocument(): Document {
  return asDocument({
    tasks: TASKS,
    visuals: TASKS.map((one) => visualOf(one['uid'] as number, one['uid'] === ARROW ? { shapeKind: 'arrow' } : {})),
  })
}

/** @purity pure */
function selectedItems(built: Stage): unknown {
  return (built.loop.agentApiSeams().source.readSnapshot().selection as unknown as { readonly items: unknown }).items
}

/** @purity pure */
function taskRef(uid: number): { kind: string; uid: number } {
  return { kind: 'task', uid }
}

// see T-266, T-267, T-268
// WHY: every point where the grab area answers, not only the middle one, so a case can
// WHY: press the part of an end grab that lies in the neighbouring day column.
/** @purity pure */
function pointsAnswering(built: Stage, uid: number, grabArea: string): readonly Point[] {
  const frame = frameOf(built.loop)
  const box = planBox(built.loop, uid)
  const sizes = sizesOrSeam()
  const reach = 2 * frame.pxPerDay + S_208
  const found: Point[] = []
  for (let y = box.y0 - reach; y <= box.y1 + reach; y += 0.5) {
    for (let x = box.x0 - reach; x <= box.x1 + reach; x += 0.5) {
      if (x <= frame.taskGroupArea.x0 || x >= frame.taskGroupArea.x1) continue
      if (y <= frame.taskGroupArea.y0 || y >= frame.taskGroupArea.y1) continue
      const hit = itemAtPointer(frame.geometry, x, y, sizes)
      if (hit === null || hit.grab !== grabArea) continue
      if (hit.item.kind === 'task' && hit.item.taskUid !== uid) continue
      found.push({ x, y })
    }
  }
  if (found.length === 0) throw new Error(`premise: no point answers ${grabArea} for Task ${String(uid)}`)
  return found
}

/** @purity pure */
function middlemost(all: readonly Point[]): Point {
  const cx = all.reduce((sum, one) => sum + one.x, 0) / all.length
  const cy = all.reduce((sum, one) => sum + one.y, 0) / all.length
  let best = all[0]!
  for (const one of all) {
    if ((one.x - cx) ** 2 + (one.y - cy) ** 2 < (best.x - cx) ** 2 + (best.y - cy) ** 2) best = one
  }
  return best
}

// WHY: S-208 is the largest move that is still a press -- "does not exceed" includes it.
const PRESS_OFFSETS: readonly { readonly dx: number; readonly dy: number }[] = [
  { dx: 0, dy: 0 },
  { dx: -S_208 / 2, dy: 0 },
  { dx: S_208 / 2, dy: 0 },
  { dx: -S_208, dy: 0 },
  { dx: S_208, dy: 0 },
  { dx: 0, dy: -S_208 },
  { dx: 0, dy: S_208 },
  { dx: -S_208, dy: S_208 },
  { dx: S_208, dy: -S_208 },
]

interface EndCase {
  readonly grabArea: string
  readonly uid: number
  readonly column: 'start' | 'finish'
  readonly ownDay: string
  readonly neighbourDay: string
}

const END_CASES: readonly EndCase[] = [
  { grabArea: 'GA-1', uid: BAR, column: 'start', ownDay: '2026-04-06', neighbourDay: '2026-04-05' },
  { grabArea: 'GA-2', uid: BAR, column: 'finish', ownDay: '2026-04-10', neighbourDay: '2026-04-11' },
  { grabArea: 'GA-10', uid: ARROW, column: 'start', ownDay: '2026-04-06', neighbourDay: '2026-04-05' },
  { grabArea: 'GA-11', uid: ARROW, column: 'finish', ownDay: '2026-04-10', neighbourDay: '2026-04-11' },
]

/** @purity pure */
function tasksOf(built: Stage): readonly Task[] {
  return built.loop.document().schedule.tasks
}

describe('DFC-3479 -- the rows these cases are driven by', () => {
  it('T-270: the press / pull boundary is S-208 on every row, horizontally or vertically', () => {
    expect(REQUIREMENTS).toContain(
      '⭐ 押して離す（動かさない）と引くを分ける距離は、本表のすべての行で `_assets/tbl-settings.md` の 表 T-206 の `S-208` とすること（MUST） —— 押した点から横か縦のどちらかへ `S-208` を超えて離せば引く、どちらも超えなければ押して離すである。',
    )
    expect(S_208, 'T-206 S-208 is 6px').toBe(6)
  })

  it('T-270 PE-3 / PE-11: a press and release selects; a horizontal pull sets the end or the fade days', () => {
    expect(specRow('T-270', 'PE-3').by['押して離す（動かさない）']).toBe('選ぶ')
    expect(specRow('T-270', 'PE-3').by['横に引く']).toContain('その端を離した所にする')
    expect(specRow('T-270', 'PE-11').by['掴んだもの']).toBe('フェードの掴み点')
    expect(specRow('T-270', 'PE-11').by['押して離す（動かさない）']).toBe('選ぶ')
    expect(specRow('T-270', 'PE-11').by['横に引く']).toBe('入 ／ 出の日数を変える')
  })

  it('T-245 GO-1 / GO-2: the start grabs GA-1 / GA-10 and the finish grabs GA-2 / GA-11 set that end to the released place', () => {
    expect(specRow('T-245', 'GO-1').cells.join(' | ')).toContain('`GA-1` / `GA-10`')
    expect(specRow('T-245', 'GO-1').cells.join(' | ')).toContain('`start` ＝ 離した所')
    expect(specRow('T-245', 'GO-2').cells.join(' | ')).toContain('`GA-2` / `GA-11`')
    expect(specRow('T-245', 'GO-2').cells.join(' | ')).toContain('`finish` ＝ 離した所そのもの')
  })
})

describe('DFC-3479 a: a press and release on a plan end grab writes no date and selects the task (PE-3)', () => {
  for (const one of END_CASES) {
    it(`${one.grabArea}: a release within S-208 of the press point changes no task and selects Task ${String(one.uid)}`, () => {
      const probe = stage(endsDocument())
      const from = middlemost(pointsAnswering(probe, one.uid, one.grabArea))
      for (const offset of PRESS_OFFSETS) {
        const built = stage(endsDocument())
        const before = structuredClone(tasksOf(built))
        built.drag(from.x, from.y, from.x + offset.dx, from.y + offset.dy)
        const where = `pressed at (${String(from.x)}, ${String(from.y)}), released ${String(offset.dx)}, ${String(offset.dy)} away`
        expect(tasksOf(built), `${where}: no task date is written`).toEqual(before)
        expect(selectedItems(built), `${where}: the task is selected`).toEqual([taskRef(one.uid)])
      }
    })

    it(`${one.grabArea}: a press and release on the outer part, in the neighbouring day column, writes no date`, () => {
      const probe = stage(endsDocument())
      const outer = pointsAnswering(probe, one.uid, one.grabArea).filter((at) => dayUnder(probe.loop, at.x) === one.neighbourDay)
      expect(outer.length, `premise: part of ${one.grabArea} lies in the ${one.neighbourDay} column`).toBeGreaterThan(0)
      const at = middlemost(outer)
      const releases: readonly Point[] = [
        at,
        { x: at.x + (one.column === 'start' ? -S_208 : S_208), y: at.y },
      ]
      for (const to of releases) {
        const built = stage(endsDocument())
        const before = structuredClone(tasksOf(built))
        built.drag(at.x, at.y, to.x, to.y)
        const where = `pressed at (${String(at.x)}, ${String(at.y)}) in ${dayUnder(probe.loop, at.x)}, released at x ${String(to.x)}`
        expect(tasksOf(built), `${where}: no task date is written`).toEqual(before)
        expect(taskOf(built.loop.document(), one.uid)[one.column]?.slice(0, 10), `${where}: the ${one.column} stays`).toBe(one.ownDay)
        expect(selectedItems(built), `${where}: the task is selected`).toEqual([taskRef(one.uid)])
      }
    })
  }
})

describe('DFC-3479 b: a press and release on a fade grab point changes no fade value (PE-11)', () => {
  /** @purity non-pure */
  function selectedFaded(): Stage {
    const built = stage(endsDocument())
    const box = planBox(built.loop, FADED)
    built.click((box.x0 + box.x1) / 2, (box.y0 + box.y1) / 2)
    expect(selectedItems(built), 'premise: the fade grab points show on the selected task only (FR-075)').toEqual([taskRef(FADED)])
    return built
  }

  for (const grabArea of ['GA-7', 'GA-8']) {
    it(`${grabArea}: a release within S-208 of the press point keeps fadeInDays and fadeOutDays`, () => {
      const from = middlemost(pointsAnswering(selectedFaded(), FADED, grabArea))
      for (const offset of PRESS_OFFSETS) {
        const built = selectedFaded()
        const before = structuredClone(tasksOf(built))
        built.drag(from.x, from.y, from.x + offset.dx, from.y + offset.dy)
        const where = `pressed at (${String(from.x)}, ${String(from.y)}), released ${String(offset.dx)}, ${String(offset.dy)} away`
        const task = taskOf(built.loop.document(), FADED)
        expect([task.fadeInDays, task.fadeOutDays], `${where}: the fade days stay`).toEqual([FADE_DAYS, FADE_DAYS])
        expect(tasksOf(built), `${where}: nothing is written`).toEqual(before)
        expect(selectedItems(built), `${where}: the task stays selected`).toEqual([taskRef(FADED)])
      }
    })
  }
})

describe('DFC-3479 c: a pull farther than S-208 still moves the end and still changes the fade', () => {
  for (const one of END_CASES) {
    const toDay = one.column === 'start' ? 3 : 14
    it(`${one.grabArea} (GO-${one.column === 'start' ? '1' : '2'}): a pull to 2026-04-${String(toDay).padStart(2, '0')} sets the ${one.column} there`, () => {
      const built = stage(endsDocument())
      const from = middlemost(pointsAnswering(built, one.uid, one.grabArea))
      built.drag(from.x, from.y, xOfDay(built.loop, april(toDay)), from.y)
      expect(taskOf(built.loop.document(), one.uid)[one.column]?.slice(0, 10)).toBe(`2026-04-${String(toDay).padStart(2, '0')}`)
    })

    it(`${one.grabArea}: a pull just past S-208 outward moves the ${one.column} outward`, () => {
      const built = stage(endsDocument())
      const from = middlemost(pointsAnswering(built, one.uid, one.grabArea))
      const before = taskOf(built.loop.document(), one.uid)[one.column] ?? ''
      const outward = one.column === 'start' ? -(S_208 + 1) : S_208 + 1
      built.drag(from.x, from.y, from.x + outward, from.y)
      const after = taskOf(built.loop.document(), one.uid)[one.column] ?? ''
      if (one.column === 'start') expect(after < before, `start ${after} is before ${before}`).toBe(true)
      else expect(after > before, `finish ${after} is after ${before}`).toBe(true)
    })
  }

  it('GA-7: a pull of two days changes fadeInDays and keeps fadeOutDays', () => {
    const built = stage(endsDocument())
    const box = planBox(built.loop, FADED)
    built.click((box.x0 + box.x1) / 2, (box.y0 + box.y1) / 2)
    const from = middlemost(pointsAnswering(built, FADED, 'GA-7'))
    built.drag(from.x, from.y, from.x + 2 * frameOf(built.loop).pxPerDay, from.y)
    const task = taskOf(built.loop.document(), FADED)
    expect(task.fadeInDays).not.toBe(FADE_DAYS)
    expect(task.fadeOutDays).toBe(FADE_DAYS)
  })

  it('GA-8: a pull of two days changes fadeOutDays and keeps fadeInDays', () => {
    const built = stage(endsDocument())
    const box = planBox(built.loop, FADED)
    built.click((box.x0 + box.x1) / 2, (box.y0 + box.y1) / 2)
    const from = middlemost(pointsAnswering(built, FADED, 'GA-8'))
    built.drag(from.x, from.y, from.x - 2 * frameOf(built.loop).pxPerDay, from.y)
    const task = taskOf(built.loop.document(), FADED)
    expect(task.fadeOutDays).not.toBe(FADE_DAYS)
    expect(task.fadeInDays).toBe(FADE_DAYS)
  })
})
