// On a drawn plan or actual shape a dependency line answers only on its drawn ink; off the shapes it keeps S-137.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule, Task } from '../../src/entity/document-model/schedule/schedule'
import {
  emptySelection,
  selectionWith,
  type ItemRef,
} from '../../src/entity/document-model/selection/selection'
import {
  itemAtPointer,
  NOT_STORED_SIZES,
  type Hit,
  type Item,
  type PointerSlop,
} from '../../src/entity/layout-engine/item-hit-area/item-hit-area'
import {
  geometryFromLayout,
  type BarGeometry,
  type DependencyGeometry,
  type Path,
  type Point,
  type ScheduleGeometry,
  type TaskGeometry,
} from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import { layoutFromSchedule } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import {
  regionsFromScreen,
  type ScreenEnvironment,
} from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { specTable, unbroken } from '../contract/spec-table'
import { DEFAULT_DISPLAY_SCALE, DISPLAY_SCALE_STEPS, displayRatioAt } from '../fixtures/display-scale'

const REQUIREMENTS = unbroken(
  readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'),
)

const ON_A_SHAPE_THE_LINE_TAKES_ONLY_ITS_INK =
  'ただし、描いた予定と実績の形状の上では、依存線は描いた線そのものだけを取ること（MUST）'

const GR_13_STANDS_ABOVE_GR_12 =
  '⭐ 依存線（`GR-13`）を予定バー本体（`GR-12`）より上に置くこと（MUST）'

const WHAT_A_DRAWN_SHAPE_IS =
  '⚠️ **ここでいう描いた形状は、表 T-012 の `SH-1` 〜 `SH-4` では予定と実績を描いた範囲の矩形であり、`SH-5`（マイルストーン）では描いた予定と実績の図形そのものである** —— 矢羽根（`SH-2`）の欠けた角も、線だけの形状（`SH-3` / `SH-4`）の細い範囲も、その矩形で読む。'

const WHAT_THE_DRAWN_LINE_IS =
  '⚠️ **描いた線そのものは、描いた本線と矢じり（表 T-201 の `S-19`）である** —— 選ばれて太く描いた本線は、その太さ（表 T-206 の `S-178` を掛けた太さ）で取る。'

const THE_HALO_IS_NOT_INCLUDED =
  '⭐ 縁（同表の `S-224`）は含まない —— 本線と縁は `FR-009` が分けている。'

const OFF_A_SHAPE_S_137_STANDS =
  '⭐ **描いた形状の外では、依存線は `S-137` の掴み代のまま `GR-12` より上に在る** —— 掴み代を縮めないので、線は形状の外で広く掴める。'

const OFF_THE_INK_THE_SAME_AS_NO_LINE =
  '線が形状を横切っていても、描いた線の外を押せば、線が無いときと同じものを掴む。'

const AT_AN_END_THE_LINE_TAKES_ITS_S_137 =
  '⚠️ **「ただし」が守るのは描いた形状の上だけであり、端を掴んで伸ばす掴み代（`GR-3` / `GR-4` の `S-90`）は守らない** —— その掴み代は描いた形状の外に在り、本表で `GR-13` より下に在るので、依存線が付く端では、端の掴み代のうち線から `S-137` 以内を線が取る。'

const AT_AN_END_THE_REST_STAYS_THE_ENDS =
  '⭐ 端の掴み代のうち、線から `S-137` より離れた所は端に残る —— `S-90` は端の外側だけでなくバーの上下にも届くので、既定の値では線の上にも下にも残る。'

const THE_PROVISO_DOES_NOT_DEPEND_ON_S_137 =
  '⚠️ **上の「ただし」は `S-137` の値に依らない** —— `_assets/tbl-settings.md` の 表 T-206 の値は読む人の環境に属しており、同表の `S-90` の備考が既にそう述べている。'

const A_WIDENED_S_137_IS_NOT_CUT =
  '⇒ ⛔ 読む人が `S-137` を広げたときに、道具の側で切り詰めてはならない（MUST NOT）'

const A_WIDENED_S_137_KEEPS_OFF_THE_SHAPE = '**描いた形状の上は、広げても線に取られない。**'

const DS_7_THE_INK_SHRINKS_WITH_THE_SCALE =
  '⚠️ **掛けないのは掴み代の値である** —— 描いた予定と実績の形状の上で依存線を掴める幅は、`S-137` ではなく描いた線の太さ（同書の 表 T-201 の `S-18` に描く比を掛け、選ばれていれば 表 T-206 の `S-178` を掛けた値）であり、表示の倍率で縮む。'

const CLAUSES: readonly (readonly [string, string])[] = [
  ['T-023d (MUST) -- on a drawn shape the line takes only its drawn ink', ON_A_SHAPE_THE_LINE_TAKES_ONLY_ITS_INK],
  ['T-023d (MUST) -- GR-13 stands above GR-12', GR_13_STANDS_ABOVE_GR_12],
  ['T-023d -- what a drawn shape is, SH-1 to SH-4 and SH-5', WHAT_A_DRAWN_SHAPE_IS],
  ['T-023d -- the drawn line is the body and the head, thickened by S-178 when selected', WHAT_THE_DRAWN_LINE_IS],
  ['T-023d -- the halo of S-224 is not part of it', THE_HALO_IS_NOT_INCLUDED],
  ['T-023d -- off the shapes the line keeps S-137 above GR-12', OFF_A_SHAPE_S_137_STANDS],
  ['T-023d -- off the ink a press takes what it takes with no line', OFF_THE_INK_THE_SAME_AS_NO_LINE],
  ['T-023d -- at an attached end the line takes the S-90 slop within S-137', AT_AN_END_THE_LINE_TAKES_ITS_S_137],
  ['T-023d -- the rest of the S-90 slop stays with the end, above and below', AT_AN_END_THE_REST_STAYS_THE_ENDS],
  ['T-023d -- the proviso does not depend on the value of S-137', THE_PROVISO_DOES_NOT_DEPEND_ON_S_137],
  ['T-023d (MUST NOT) -- a widened S-137 is not cut down by the tool', A_WIDENED_S_137_IS_NOT_CUT],
  ['T-023d -- a widened S-137 still does not take the shape', A_WIDENED_S_137_KEEPS_OFF_THE_SHAPE],
  ['DS-7 -- the width the line keeps on a shape shrinks with the display scale', DS_7_THE_INK_SHRINKS_WITH_THE_SCALE],
]

describe('the clauses these cases stand on are the manuscript\'s own words', () => {
  it.each(CLAUSES)('%s', (_name, clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })
})

// see T-201, T-206
const numberOf = (table: string, id: string, column: string): number => {
  const row = specTable(table).rows.find((one) => one.id === id)
  if (row === undefined) throw new Error(`table ${table} has no row ${id}`)
  const found = (row.by[column] ?? '').match(/\d+(?:\.\d+)?/g) ?? []
  if (found.length !== 1) throw new Error(`table ${table} row ${id} states no single number: ${row.by[column]}`)
  return Number(found[0])
}

const T_201_DEFAULT = '既定値'
const T_206_DEFAULT = '既定'

const S_18 = numberOf('T-201', 'S-18', T_201_DEFAULT)
const S_19 = numberOf('T-201', 'S-19', T_201_DEFAULT)
const S_90 = numberOf('T-206', 'S-90', T_206_DEFAULT)
const S_137 = numberOf('T-206', 'S-137', T_206_DEFAULT)
const S_178 = numberOf('T-206', 'S-178', T_206_DEFAULT)
const S_224 = numberOf('T-206', 'S-224', T_206_DEFAULT)

// see S-90, S-91, S-92, S-137, S-230
const SLOP: PointerSlop = {
  planEndpoint: NOT_STORED_SIZES['S-90'],
  actualEndpoint: NOT_STORED_SIZES['S-91'],
  fadeHandle: NOT_STORED_SIZES['S-92'][0] / 2,
  line: NOT_STORED_SIZES['S-137'],
  boxPoint: NOT_STORED_SIZES['S-230'],
}

// see S-234, FR-039
const LOW_SCALE = DEFAULT_DISPLAY_SCALE
const HIGH_SCALE = 100
const SCALES = [LOW_SCALE, HIGH_SCALE] as const

// see DS-7, S-18, S-178
const inkHalfAt = (scale: number, selected: boolean): number =>
  (S_18 * displayRatioAt(scale) * (selected ? S_178 : 1)) / 2

// see FR-009, S-224
const haloHalfAt = (scale: number): number => (S_18 * displayRatioAt(scale) * S_224) / 2

// see T-252
const nestedDefaults = (): Record<string, unknown> => {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(SETTINGS_DEFAULTS)) {
    const path = key.split('.')
    let into = out
    for (const step of path.slice(0, -1)) {
      into[step] = { ...((into[step] as Record<string, unknown> | undefined) ?? {}) }
      into = into[step] as Record<string, unknown>
    }
    into[path[path.length - 1]!] = value
  }
  return out
}

const settingsAt = (scale: number): DocumentSettings =>
  ({ ...nestedDefaults(), scrollDate: '2026-01-01', displayScale: scale }) as unknown as DocumentSettings

const ENV: ScreenEnvironment = { width: 1600, height: 900, appHeaderHeight: 56, scrollbarThickness: 8 }

const taskOf = (part: Record<string, unknown>): Task =>
  ({
    name: null,
    start: null,
    finish: null,
    milestone: null,
    percentComplete: null,
    actualStart: null,
    actualDuration: null,
    actualFinish: null,
    stop: null,
    resume: null,
    resumeValid: null,
    fadeInDays: null,
    fadeOutDays: null,
    dependencies: [],
    ...part,
  }) as unknown as Task

const PREDECESSOR_UID = 1
const CROSSED_UID = 2
const SUCCESSOR_UID = 3

const LINK = { predecessorUid: PREDECESSOR_UID, linkType: 1, lag: null, lagFormat: null, carry: {}, carryElements: [] }

const LINK_ITEM: Item = { kind: 'dependency', predecessorUid: PREDECESSOR_UID, successorUid: SUCCESSOR_UID }

const LINK_REF: ItemRef = { kind: 'dependency', successorUid: SUCCESSOR_UID, ordinal: 0 }

type Crossed = 'rectangle' | 'milestone' | 'arrow'

// see SH-1, SH-3, SH-5
const crossedTask = (kind: Crossed): Task => {
  if (kind === 'milestone') {
    return taskOf({
      uid: CROSSED_UID,
      start: '2026-02-06',
      finish: '2026-02-06',
      milestone: true,
      actualStart: '2026-02-16',
      stop: '2026-02-16',
    })
  }
  if (kind === 'arrow') {
    return taskOf({ uid: CROSSED_UID, start: '2026-01-01', finish: '2026-05-01', actualStart: '2026-01-01', stop: '2026-05-01' })
  }
  return taskOf({ uid: CROSSED_UID, start: '2026-01-01', finish: '2026-05-01' })
}

const scheduleOf = (kind: Crossed, linked: boolean): Schedule =>
  ({
    project: { calendarUid: null, statusDate: null },
    calendars: [],
    resources: [],
    assignments: [],
    highlightBoxes: [],
    commentBoxes: [],
    tasks: [
      taskOf({ uid: PREDECESSOR_UID, start: '2026-01-05', finish: '2026-01-15' }),
      crossedTask(kind),
      taskOf({ uid: SUCCESSOR_UID, start: '2026-03-01', finish: '2026-03-11', dependencies: linked ? [LINK] : [] }),
    ],
    taskGroups: ['g1', 'g2', 'g3'].map((id, order) => ({ id, parentId: null, order, height: null })),
    taskGroupMembers: [
      { groupId: 'g1', taskUid: PREDECESSOR_UID },
      { groupId: 'g2', taskUid: CROSSED_UID },
      { groupId: 'g3', taskUid: SUCCESSOR_UID },
    ],
    taskVisuals: kind === 'arrow' ? [{ taskUid: CROSSED_UID, shapeKind: 'arrow' }] : [],
  }) as unknown as Schedule

interface Box {
  readonly left: number
  readonly right: number
  readonly top: number
  readonly bottom: number
}

const boundsOf = (bar: BarGeometry | null): Box => {
  if (bar === null) throw new Error('the shape draws nothing to bound')
  const points: Point[] = bar.form === 'outline' ? [...bar.points] : [bar.from, bar.to, ...(bar.head ?? [])]
  const pad = bar.form === 'line' ? bar.strokeWidth / 2 : 0
  return {
    left: Math.min(...points.map((one) => one.x)) - pad,
    right: Math.max(...points.map((one) => one.x)) + pad,
    top: Math.min(...points.map((one) => one.y)) - pad,
    bottom: Math.max(...points.map((one) => one.y)) + pad,
  }
}

const insidePolygon = (x: number, y: number, polygon: Path): boolean => {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const a = polygon[i]!
    const b = polygon[j]!
    if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) inside = !inside
  }
  return inside
}

// see RP-2, RT-5
const verticalOver = (line: DependencyGeometry, box: Box): number => {
  for (let i = 0; i + 1 < line.points.length; i += 1) {
    const a = line.points[i]!
    const b = line.points[i + 1]!
    const spansTheBox = Math.min(a.y, b.y) < box.top && Math.max(a.y, b.y) > box.bottom
    if (a.x === b.x && spansTheBox && a.x > box.left && a.x < box.right) return a.x
  }
  throw new Error(`the route ${line.pattern} does not run down across the crossed shape`)
}

interface Scene {
  readonly geometry: ScheduleGeometry
  readonly bare: ScheduleGeometry
  readonly line: DependencyGeometry
  readonly predecessor: TaskGeometry
  readonly crossed: TaskGeometry
  readonly successor: TaskGeometry
  readonly lineX: number
}

const geometryOf = (schedule: Schedule, settings: DocumentSettings, selected: boolean): ScheduleGeometry => {
  const regions = regionsFromScreen(ENV, settings)
  const selection = selected ? selectionWith(emptySelection(), LINK_REF) : emptySelection()
  return geometryFromLayout(schedule, settings, layoutFromSchedule(schedule, settings, regions), regions, selection)
}

const taskIn = (geometry: ScheduleGeometry, uid: number): TaskGeometry => {
  const found = geometry.tasks.find((one) => one.taskUid === uid)
  if (found === undefined) throw new Error(`task ${uid} is not drawn`)
  return found
}

const sceneAt = (scale: number, kind: Crossed, selected = false): Scene => {
  const settings = settingsAt(scale)
  const geometry = geometryOf(scheduleOf(kind, true), settings, selected)
  const line = geometry.dependencies[0]
  if (line === undefined) throw new Error('the dependency line is not drawn')
  const crossed = taskIn(geometry, CROSSED_UID)
  return {
    geometry,
    bare: geometryOf(scheduleOf(kind, false), settings, false),
    line,
    predecessor: taskIn(geometry, PREDECESSOR_UID),
    crossed,
    successor: taskIn(geometry, SUCCESSOR_UID),
    lineX: verticalOver(line, boundsOf(crossed.plan)),
  }
}

const hitAt = (geometry: ScheduleGeometry, x: number, y: number, slop: PointerSlop = SLOP): Hit | null =>
  itemAtPointer(geometry, x, y, slop)

const middleOf = (box: Box): number => (box.top + box.bottom) / 2

const TASK_ITEM = (uid: number): Item => ({ kind: 'task', taskUid: uid })

describe('the values the expectations are derived from agree with the manuscript', () => {
  it('the slop handed to the unit carries S-90 and S-137 as table T-206 prints them', () => {
    expect(SLOP.planEndpoint).toBe(S_90)
    expect(SLOP.line).toBe(S_137)
  })

  it('the settings the layout draws with carry S-18 and S-19 as table T-201 prints them', () => {
    expect(SETTINGS_DEFAULTS['dependencyWidth']).toBe(S_18)
    expect(SETTINGS_DEFAULTS['dependencyArrowLength']).toBe(S_19)
  })

  it('both display scales are steps of S-234, the lower one being the default', () => {
    expect(DISPLAY_SCALE_STEPS).toContain(LOW_SCALE)
    expect(DISPLAY_SCALE_STEPS).toContain(HIGH_SCALE)
    expect(LOW_SCALE).toBeLessThan(HIGH_SCALE)
  })

  it('the probes stand between the ink, the halo and S-137 at both scales', () => {
    for (const scale of SCALES) {
      expect(inkHalfAt(scale, true)).toBeLessThan(S_137 / 2)
      expect(haloHalfAt(scale)).toBeLessThan(S_137)
      expect(inkHalfAt(scale, false)).toBeLessThan(haloHalfAt(scale))
    }
    expect(inkHalfAt(LOW_SCALE, true)).toBeGreaterThan(inkHalfAt(LOW_SCALE, false))
  })

  it.each(SCALES)('at display scale %i the route runs down across each crossed shape, drawn alike with no link', (scale) => {
    for (const kind of ['rectangle', 'milestone', 'arrow'] as const) {
      const scene = sceneAt(scale, kind)
      expect(taskIn(scene.bare, CROSSED_UID), kind).toEqual(scene.crossed)
      expect(sceneAt(scale, kind, true).lineX, kind).toBe(scene.lineX)
    }
  })
})

describe.each(SCALES)('display scale %i -- a line running down across a rectangle plan bar', (scale) => {
  const scene = sceneAt(scale, 'rectangle')
  const bar = boundsOf(scene.crossed.plan)
  const y = middleOf(bar)

  it('the bare bar answers GR-12 where the line will cross it', () => {
    expect(hitAt(scene.bare, scene.lineX + S_137 / 2, y)).toEqual({ item: TASK_ITEM(CROSSED_UID), grab: 'GR-12' })
  })

  it('a press on the line itself over the bar answers GR-13', () => {
    const hit = hitAt(scene.geometry, scene.lineX, y)
    expect(hit?.grab, GR_13_STANDS_ABOVE_GR_12).toBe('GR-13')
    expect(hit?.item).toEqual(LINK_ITEM)
  })

  it('a press inside the drawn ink over the bar answers GR-13', () => {
    const inside = inkHalfAt(scale, false) / 2
    for (const sign of [-1, 1]) {
      expect(hitAt(scene.geometry, scene.lineX + sign * inside, y)?.grab, WHAT_THE_DRAWN_LINE_IS).toBe('GR-13')
    }
  })

  it('outside the ink but within S-137, the bar answers exactly as with no line', () => {
    for (const sign of [-1, 1]) {
      const x = scene.lineX + (sign * S_137) / 2
      const bare = hitAt(scene.bare, x, y)
      expect(bare).not.toBeNull()
      expect(hitAt(scene.geometry, x, y), ON_A_SHAPE_THE_LINE_TAKES_ONLY_ITS_INK).toEqual(bare)
      expect(hitAt(scene.geometry, x, y), OFF_THE_INK_THE_SAME_AS_NO_LINE).toEqual(bare)
    }
  })

  it('the halo S-224 draws around the line is not ink, so the bar answers there', () => {
    const x = scene.lineX + (inkHalfAt(scale, false) + haloHalfAt(scale)) / 2
    expect(hitAt(scene.geometry, x, y), THE_HALO_IS_NOT_INCLUDED).toEqual(hitAt(scene.bare, x, y))
  })

  it('one pixel above the bar the line answers within S-137, one pixel inside it the bar does', () => {
    const x = scene.lineX + S_137 / 2
    expect(hitAt(scene.geometry, x, bar.top - 1)?.grab, OFF_A_SHAPE_S_137_STANDS).toBe('GR-13')
    expect(hitAt(scene.geometry, x, bar.top + 1), WHAT_A_DRAWN_SHAPE_IS).toEqual(hitAt(scene.bare, x, bar.top + 1))
    expect(hitAt(scene.bare, x, bar.top + 1)?.grab).toBe('GR-12')
  })

  it('between the rows, off every shape, S-137 is not scaled: the line answers out to it and no further', () => {
    const between = (boundsOf(scene.predecessor.plan).bottom + bar.top) / 2
    // STEP: three quarters of S-137 lies past S-137 times the drawn ratio at every step up to 100.
    expect(hitAt(scene.geometry, scene.lineX + (S_137 * 3) / 4, between)?.grab, OFF_A_SHAPE_S_137_STANDS).toBe('GR-13')
    const past = scene.lineX + S_137 + 2
    expect(hitAt(scene.geometry, past, between)?.grab).not.toBe('GR-13')
    expect(hitAt(scene.geometry, past, between)).toEqual(hitAt(scene.bare, past, between))
  })

  it('a widened S-137 reaches further off the shapes and still does not take the bar', () => {
    const wide: PointerSlop = { ...SLOP, line: S_137 * 2 }
    const x = scene.lineX + (S_137 * 3) / 2
    const between = (boundsOf(scene.predecessor.plan).bottom + bar.top) / 2
    expect(hitAt(scene.geometry, x, between)?.grab).not.toBe('GR-13')
    expect(hitAt(scene.geometry, x, between, wide)?.grab, A_WIDENED_S_137_IS_NOT_CUT).toBe('GR-13')
    expect(hitAt(scene.geometry, x, y, wide), A_WIDENED_S_137_KEEPS_OFF_THE_SHAPE).toEqual(hitAt(scene.bare, x, y, wide))
    expect(hitAt(scene.geometry, x, y, wide)?.grab, THE_PROVISO_DOES_NOT_DEPEND_ON_S_137).toBe('GR-12')
  })

  it('a selected line keeps its ink thickened by S-178 over the bar, and an unselected one does not', () => {
    const selected = sceneAt(scale, 'rectangle', true)
    const x = scene.lineX + (inkHalfAt(scale, false) + inkHalfAt(scale, true)) / 2
    const hit = hitAt(selected.geometry, x, y)
    expect(hit?.grab, WHAT_THE_DRAWN_LINE_IS).toBe('GR-13')
    expect(hit?.item).toEqual(LINK_ITEM)
    expect(hitAt(scene.geometry, x, y), ON_A_SHAPE_THE_LINE_TAKES_ONLY_ITS_INK).toEqual(hitAt(scene.bare, x, y))
  })

  it('past the thickened ink a selected line leaves the bar to the bar', () => {
    const selected = sceneAt(scale, 'rectangle', true)
    const x = scene.lineX + S_137 / 2
    expect(hitAt(selected.geometry, x, y), ON_A_SHAPE_THE_LINE_TAKES_ONLY_ITS_INK).toEqual(hitAt(selected.bare, x, y))
  })
})

describe('DS-7 -- the ink a line keeps on a shape shrinks with the display scale, S-137 does not', () => {
  const offset = (inkHalfAt(LOW_SCALE, false) + inkHalfAt(HIGH_SCALE, false)) / 2

  it('the same offset from the line lies inside the ink at the high scale and outside it at the low one', () => {
    const high = sceneAt(HIGH_SCALE, 'rectangle')
    const low = sceneAt(LOW_SCALE, 'rectangle')
    const highY = middleOf(boundsOf(high.crossed.plan))
    const lowY = middleOf(boundsOf(low.crossed.plan))
    expect(hitAt(high.geometry, high.lineX + offset, highY)?.grab, DS_7_THE_INK_SHRINKS_WITH_THE_SCALE).toBe('GR-13')
    expect(hitAt(low.geometry, low.lineX + offset, lowY), DS_7_THE_INK_SHRINKS_WITH_THE_SCALE).toEqual(
      hitAt(low.bare, low.lineX + offset, lowY),
    )
    expect(hitAt(low.bare, low.lineX + offset, lowY)?.grab).toBe('GR-12')
  })
})

describe.each(SCALES)('display scale %i -- a line running down across a milestone', (scale) => {
  const scene = sceneAt(scale, 'milestone')
  const figure = scene.crossed.plan
  if (figure === null || figure.form !== 'outline') throw new Error('the milestone draws no outline')
  const box = boundsOf(figure)
  const y = middleOf(box)

  it('a press on the line itself over the drawn figure answers GR-13', () => {
    expect(insidePolygon(scene.lineX, y, figure.points)).toBe(true)
    const hit = hitAt(scene.geometry, scene.lineX, y)
    expect(hit?.grab).toBe('GR-13')
    expect(hit?.item).toEqual(LINK_ITEM)
  })

  it('on the drawn figure, outside the ink but within S-137, the milestone answers as with no line', () => {
    for (const sign of [-1, 1]) {
      const x = scene.lineX + (sign * S_137) / 2
      expect(insidePolygon(x, y, figure.points)).toBe(true)
      const bare = hitAt(scene.bare, x, y)
      expect(bare?.item).toEqual(TASK_ITEM(CROSSED_UID))
      expect(hitAt(scene.geometry, x, y), WHAT_A_DRAWN_SHAPE_IS).toEqual(bare)
    }
  })

  it('inside the figure\'s bounding box but off the drawn figure, the line answers within S-137', () => {
    const x = scene.lineX + S_137 / 2
    const nearTheTop = box.top + (box.bottom - box.top) / 8
    expect(insidePolygon(x, nearTheTop, figure.points)).toBe(false)
    expect(x).toBeLessThan(box.right)
    expect(hitAt(scene.geometry, x, nearTheTop)?.grab, WHAT_A_DRAWN_SHAPE_IS).toBe('GR-13')
  })

  it('a selected line keeps only its thickened ink over the drawn figure', () => {
    const selected = sceneAt(scale, 'milestone', true)
    const inside = scene.lineX + (inkHalfAt(scale, false) + inkHalfAt(scale, true)) / 2
    expect(hitAt(selected.geometry, inside, y)?.grab).toBe('GR-13')
    expect(hitAt(scene.geometry, inside, y), WHAT_THE_DRAWN_LINE_IS).toEqual(hitAt(scene.bare, inside, y))
  })
})

describe.each(SCALES)('display scale %i -- a line running down across an arrow shape', (scale) => {
  const scene = sceneAt(scale, 'arrow')
  const plan = scene.crossed.plan
  const actual = scene.crossed.actual
  if (plan === null || plan.form !== 'line' || actual === null || actual.form !== 'line') {
    throw new Error('the arrow shape draws no plan line and actual line')
  }

  it('between its plan line and its actual line, inside the drawn range, the shape answers as with no line', () => {
    const y = (plan.from.y + actual.from.y) / 2
    expect(Math.abs(y - plan.from.y)).toBeGreaterThan(plan.strokeWidth / 2)
    expect(Math.abs(y - actual.from.y)).toBeGreaterThan(actual.strokeWidth / 2)
    const x = scene.lineX + S_137 / 2
    expect(hitAt(scene.bare, x, y)).toEqual({ item: TASK_ITEM(CROSSED_UID), grab: 'GR-12' })
    expect(hitAt(scene.geometry, x, y)?.grab, WHAT_A_DRAWN_SHAPE_IS).not.toBe('GR-13')
    expect(hitAt(scene.geometry, x, y), WHAT_A_DRAWN_SHAPE_IS).toEqual(hitAt(scene.bare, x, y))
  })

  it('on the line itself between them it still answers GR-13', () => {
    const y = (plan.from.y + actual.from.y) / 2
    expect(hitAt(scene.geometry, scene.lineX, y)?.grab).toBe('GR-13')
  })
})

describe.each(SCALES)('display scale %i -- the plan ends the line is attached to', (scale) => {
  const scene = sceneAt(scale, 'rectangle')
  const entry = scene.line.points[scene.line.points.length - 1]!
  const exit = scene.line.points[0]!
  const successor = boundsOf(scene.successor.plan)
  const predecessor = boundsOf(scene.predecessor.plan)
  const clearOfTheLine = (S_137 + S_90) / 2

  it('the fixture attaches the line to the two ends, far from its descent, with room between S-137 and S-90', () => {
    expect(entry.x).toBeCloseTo(successor.left, 6)
    expect(exit.x).toBeCloseTo(predecessor.right, 6)
    expect(Math.abs(scene.lineX - successor.left)).toBeGreaterThan(S_137 * 3)
    expect(Math.abs(scene.lineX - predecessor.right)).toBeGreaterThan(S_137 * 3)
    // STEP: past S-137 even from the head's base, and inside S-90 beyond the bar's half height.
    expect(clearOfTheLine - (S_19 * displayRatioAt(scale)) / 2).toBeGreaterThan(S_137)
    expect(clearOfTheLine).toBeLessThan((successor.bottom - successor.top) / 2 + S_90)
  })

  it('outside the successor\'s start, within S-137 of the line, above and below it, the line answers', () => {
    const x = successor.left - S_137 / 2
    for (const sign of [-1, 1]) {
      const hit = hitAt(scene.geometry, x, entry.y + (sign * S_137) / 2)
      expect(hit?.grab, AT_AN_END_THE_LINE_TAKES_ITS_S_137).toBe('GR-13')
      expect(hit?.item).toEqual(LINK_ITEM)
    }
  })

  it('outside the successor\'s start, farther than S-137 from the line, above and below it, GR-3 stays', () => {
    const x = successor.left - S_137 / 2
    for (const sign of [-1, 1]) {
      const hit = hitAt(scene.geometry, x, entry.y + sign * clearOfTheLine)
      expect(hit?.grab, AT_AN_END_THE_REST_STAYS_THE_ENDS).toBe('GR-3')
      expect(hit?.item).toEqual(TASK_ITEM(SUCCESSOR_UID))
    }
  })

  it('outside the predecessor\'s finish, the line takes S-137 of the slop and GR-4 keeps the rest', () => {
    const x = predecessor.right + S_137 / 2
    expect(hitAt(scene.geometry, x, exit.y + S_137 / 2)?.grab, AT_AN_END_THE_LINE_TAKES_ITS_S_137).toBe('GR-13')
    const kept = hitAt(scene.geometry, x, exit.y + clearOfTheLine)
    expect(kept?.grab, AT_AN_END_THE_REST_STAYS_THE_ENDS).toBe('GR-4')
    expect(kept?.item).toEqual(TASK_ITEM(PREDECESSOR_UID))
  })
})
