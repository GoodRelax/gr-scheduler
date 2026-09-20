// On a drawn plan or actual shape a dependency line answers only on its drawn ink; off the shapes it keeps S-285.

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
  type GrabSizes,
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
  '⭐ 依存線とハイライトボックスの枠は、形の上では描いた線そのものでだけ応えること（MUST）'

const TY_5_STANDS_ABOVE_TY_9 =
  '| TY-5 | 5 | 依存線 | 実績の端 |'

const WHAT_A_DRAWN_SHAPE_IS =
  '⭐ 描いた形は形ごとに読むこと（MUST）'

const WHAT_THE_DRAWN_LINE_IS =
  '依存線の描いた線は本線と矢じりであり、選んだ線は 表 T-206 の `S-178` を掛けた太さで取り、地の色の縁（同表の `S-224`）は含めない'

const GA_19_THE_LINE_MARGIN = '線の縁から左右へ `S-285`'

const DS_7_THE_INK_SHRINKS_WITH_THE_SCALE =
  '⚠️ **掛けないのは掴み代の値である** —— 描いた予定と実績の形状の上で依存線を掴める幅は、`S-137` ではなく描いた線の太さ（同書の 表 T-201 の `S-18` に描く比を掛け、選ばれていれば 表 T-206 の `S-178` を掛けた値）であり、表示の倍率で縮む。'

const CLAUSES: readonly (readonly [string, string])[] = [
  ['HT-1 (MUST) -- on a drawn shape the line takes only its drawn ink', ON_A_SHAPE_THE_LINE_TAKES_ONLY_ITS_INK],
  ['TY-5 -- the line stands above the body in the order of table T-268', TY_5_STANDS_ABOVE_TY_9],
  ['HT-1 (MUST) -- a drawn shape is read shape by shape', WHAT_A_DRAWN_SHAPE_IS],
  ['HT-1 -- the drawn line is the body and the head, thickened by S-178, without the S-224 halo', WHAT_THE_DRAWN_LINE_IS],
  ['GA-19 -- off the shapes the line is grabbed S-285 either side of its ink', GA_19_THE_LINE_MARGIN],
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
const S_250 = numberOf('T-206', 'S-250', T_206_DEFAULT)
const S_285 = numberOf('T-206', 'S-285', T_206_DEFAULT)
const S_178 = numberOf('T-206', 'S-178', T_206_DEFAULT)
const S_224 = numberOf('T-206', 'S-224', T_206_DEFAULT)

// see T-266, T-206
const SLOP: GrabSizes = NOT_STORED_SIZES

// see S-234, FR-039
const LOW_SCALE = DEFAULT_DISPLAY_SCALE
// WHY: the highest step above the default whose drawn arrow head still fits the gap between S-285 and S-250 the
// end cases probe; the step is solved from the two rows, not named, so a later default takes this with it.
const HIGH_SCALE = [...DISPLAY_SCALE_STEPS]
  .reverse()
  .find((one) => one > DEFAULT_DISPLAY_SCALE && S_19 * displayRatioAt(one) < S_250 - S_285)!
const SCALES = [LOW_SCALE, HIGH_SCALE] as const

// see DS-7, S-18, S-178
const inkHalfAt = (scale: number, selected: boolean): number =>
  (S_18 * displayRatioAt(scale) * (selected ? S_178 : 1)) / 2

// see FR-009, S-224
const haloHalfAt = (scale: number): number => (S_18 * displayRatioAt(scale) * S_224) / 2

// see GA-19, S-285
// WHY: `S-285` is counted from the drawn EDGE, so the reach off a shape is the ink's own half plus it;
// half way into that margin is outside the ink and inside the reach at every step.
const outsideTheInk = (scale: number, selected = false): number =>
  inkHalfAt(scale, selected) + S_285 / 2

// see GA-19, S-285
const pastTheMargin = (scale: number, selected = false): number =>
  inkHalfAt(scale, selected) + S_285 + 2

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

const hitAt = (geometry: ScheduleGeometry, x: number, y: number, slop: GrabSizes = SLOP): Hit | null =>
  itemAtPointer(geometry, x, y, slop)

const middleOf = (box: Box): number => (box.top + box.bottom) / 2

const TASK_ITEM = (uid: number): Item => ({ kind: 'task', taskUid: uid })

describe('the values the expectations are derived from agree with the manuscript', () => {
  it('the sizes handed to the unit carry S-250 and S-285 as table T-206 prints them', () => {
    expect(SLOP['S-250']).toBe(S_250)
    expect(SLOP['S-285']).toBe(S_285)
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

  it("the probes stand between the ink, the halo and GA-19's margin at both scales", () => {
    for (const scale of SCALES) {
      expect(inkHalfAt(scale, false)).toBeLessThan(outsideTheInk(scale))
      expect(outsideTheInk(scale)).toBeLessThan(inkHalfAt(scale, false) + S_285)
      expect(inkHalfAt(scale, false)).toBeLessThan(haloHalfAt(scale))
      expect(pastTheMargin(scale)).toBeGreaterThan(inkHalfAt(scale, false) + S_285)
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

  it('the bare bar answers GA-9 where the line will cross it', () => {
    expect(hitAt(scene.bare, scene.lineX + outsideTheInk(scale), y)).toEqual({ item: TASK_ITEM(CROSSED_UID), grab: 'GA-9' })
  })

  it('a press on the line itself over the bar answers GA-19', () => {
    const hit = hitAt(scene.geometry, scene.lineX, y)
    expect(hit?.grab, TY_5_STANDS_ABOVE_TY_9).toBe('GA-19')
    expect(hit?.item).toEqual(LINK_ITEM)
  })

  it('a press inside the drawn ink over the bar answers GA-19', () => {
    const inside = inkHalfAt(scale, false) / 2
    for (const sign of [-1, 1]) {
      expect(hitAt(scene.geometry, scene.lineX + sign * inside, y)?.grab, WHAT_THE_DRAWN_LINE_IS).toBe('GA-19')
    }
  })

  it("outside the ink but within GA-19's margin, the bar answers exactly as with no line", () => {
    for (const sign of [-1, 1]) {
      const x = scene.lineX + sign * outsideTheInk(scale)
      const bare = hitAt(scene.bare, x, y)
      expect(bare).not.toBeNull()
      expect(hitAt(scene.geometry, x, y), ON_A_SHAPE_THE_LINE_TAKES_ONLY_ITS_INK).toEqual(bare)
      expect(hitAt(scene.geometry, x, y), ON_A_SHAPE_THE_LINE_TAKES_ONLY_ITS_INK).toEqual(bare)
    }
  })

  it('the halo S-224 draws around the line is not ink, so the bar answers there', () => {
    const x = scene.lineX + (inkHalfAt(scale, false) + haloHalfAt(scale)) / 2
    expect(hitAt(scene.geometry, x, y), WHAT_THE_DRAWN_LINE_IS).toEqual(hitAt(scene.bare, x, y))
  })

  it("one pixel above the bar the line answers within its margin, one pixel inside it the bar does", () => {
    const x = scene.lineX + outsideTheInk(scale)
    expect(hitAt(scene.geometry, x, bar.top - 1)?.grab, GA_19_THE_LINE_MARGIN).toBe('GA-19')
    expect(hitAt(scene.geometry, x, bar.top + 1), WHAT_A_DRAWN_SHAPE_IS).toEqual(hitAt(scene.bare, x, bar.top + 1))
    expect(hitAt(scene.bare, x, bar.top + 1)?.grab).toBe('GA-9')
  })

  it('between the rows, off every shape, the line answers out to its ink plus S-285 and no further', () => {
    const between = (boundsOf(scene.predecessor.plan).bottom + bar.top) / 2
    // STEP: three quarters of the way into the margin is still inside it at every step.
    expect(
      hitAt(scene.geometry, scene.lineX + inkHalfAt(scale, false) + (S_285 * 3) / 4, between)?.grab,
      GA_19_THE_LINE_MARGIN,
    ).toBe('GA-19')
    const past = scene.lineX + pastTheMargin(scale)
    expect(hitAt(scene.geometry, past, between)?.grab).not.toBe('GA-19')
    expect(hitAt(scene.geometry, past, between)).toEqual(hitAt(scene.bare, past, between))
  })


  it('a selected line keeps its ink thickened by S-178 over the bar, and an unselected one does not', () => {
    const selected = sceneAt(scale, 'rectangle', true)
    const x = scene.lineX + (inkHalfAt(scale, false) + inkHalfAt(scale, true)) / 2
    const hit = hitAt(selected.geometry, x, y)
    expect(hit?.grab, WHAT_THE_DRAWN_LINE_IS).toBe('GA-19')
    expect(hit?.item).toEqual(LINK_ITEM)
    expect(hitAt(scene.geometry, x, y), ON_A_SHAPE_THE_LINE_TAKES_ONLY_ITS_INK).toEqual(hitAt(scene.bare, x, y))
  })

  it('past the thickened ink a selected line leaves the bar to the bar', () => {
    const selected = sceneAt(scale, 'rectangle', true)
    const x = scene.lineX + outsideTheInk(scale, true)
    expect(hitAt(selected.geometry, x, y), ON_A_SHAPE_THE_LINE_TAKES_ONLY_ITS_INK).toEqual(hitAt(selected.bare, x, y))
  })
})

describe('DS-7 -- the ink a line keeps on a shape shrinks with the display scale, S-285 does not', () => {
  const offset = (inkHalfAt(LOW_SCALE, false) + inkHalfAt(HIGH_SCALE, false)) / 2

  it('the same offset from the line lies inside the ink at the high scale and outside it at the low one', () => {
    const high = sceneAt(HIGH_SCALE, 'rectangle')
    const low = sceneAt(LOW_SCALE, 'rectangle')
    const highY = middleOf(boundsOf(high.crossed.plan))
    const lowY = middleOf(boundsOf(low.crossed.plan))
    expect(hitAt(high.geometry, high.lineX + offset, highY)?.grab, DS_7_THE_INK_SHRINKS_WITH_THE_SCALE).toBe('GA-19')
    expect(hitAt(low.geometry, low.lineX + offset, lowY), DS_7_THE_INK_SHRINKS_WITH_THE_SCALE).toEqual(
      hitAt(low.bare, low.lineX + offset, lowY),
    )
    expect(hitAt(low.bare, low.lineX + offset, lowY)?.grab).toBe('GA-9')
  })
})

describe.each(SCALES)('display scale %i -- a line running down across a milestone', (scale) => {
  const scene = sceneAt(scale, 'milestone')
  const figure = scene.crossed.plan
  if (figure === null || figure.form !== 'outline') throw new Error('the milestone draws no outline')
  const box = boundsOf(figure)
  const y = middleOf(box)

  it('a press on the line itself over the drawn figure answers GA-19', () => {
    expect(insidePolygon(scene.lineX, y, figure.points)).toBe(true)
    const hit = hitAt(scene.geometry, scene.lineX, y)
    expect(hit?.grab).toBe('GA-19')
    expect(hit?.item).toEqual(LINK_ITEM)
  })

  it("on the drawn figure, outside the ink but within GA-19's margin, the milestone answers as with no line", () => {
    for (const sign of [-1, 1]) {
      const x = scene.lineX + sign * outsideTheInk(scale)
      expect(insidePolygon(x, y, figure.points)).toBe(true)
      const bare = hitAt(scene.bare, x, y)
      expect(bare?.item).toEqual(TASK_ITEM(CROSSED_UID))
      expect(hitAt(scene.geometry, x, y), WHAT_A_DRAWN_SHAPE_IS).toEqual(bare)
    }
  })

  it("inside the figure's bounding box but off the drawn figure, the line answers within its margin", () => {
    const x = scene.lineX + outsideTheInk(scale)
    const nearTheTop = box.top + (box.bottom - box.top) / 8
    expect(insidePolygon(x, nearTheTop, figure.points)).toBe(false)
    expect(x).toBeLessThan(box.right)
    expect(hitAt(scene.geometry, x, nearTheTop)?.grab, WHAT_A_DRAWN_SHAPE_IS).toBe('GA-19')
  })

  it('a selected line keeps only its thickened ink over the drawn figure', () => {
    const selected = sceneAt(scale, 'milestone', true)
    const inside = scene.lineX + (inkHalfAt(scale, false) + inkHalfAt(scale, true)) / 2
    expect(hitAt(selected.geometry, inside, y)?.grab).toBe('GA-19')
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
    const x = scene.lineX + outsideTheInk(scale)
    // WHY: `GA-14`, not `GA-9` -- table T-266 gives the line-only family its own body row.
    expect(hitAt(scene.bare, x, y)).toEqual({ item: TASK_ITEM(CROSSED_UID), grab: 'GA-14' })
    expect(hitAt(scene.geometry, x, y)?.grab, WHAT_A_DRAWN_SHAPE_IS).not.toBe('GA-19')
    expect(hitAt(scene.geometry, x, y), WHAT_A_DRAWN_SHAPE_IS).toEqual(hitAt(scene.bare, x, y))
  })

  it('on the line itself between them it still answers GA-19', () => {
    const y = (plan.from.y + actual.from.y) / 2
    expect(hitAt(scene.geometry, scene.lineX, y)?.grab).toBe('GA-19')
  })
})

describe.each(SCALES)('display scale %i -- the plan ends the line is attached to', (scale) => {
  const scene = sceneAt(scale, 'rectangle')
  const entry = scene.line.points[scene.line.points.length - 1]!
  const exit = scene.line.points[0]!
  const successor = boundsOf(scene.successor.plan)
  const predecessor = boundsOf(scene.predecessor.plan)
  const clearOfTheLine = (S_285 + S_250) / 2

  it('the fixture attaches the line to the two ends, far from its descent, with room between S-285 and S-250', () => {
    expect(entry.x).toBeCloseTo(successor.left, 6)
    expect(exit.x).toBeCloseTo(predecessor.right, 6)
    expect(Math.abs(scene.lineX - successor.left)).toBeGreaterThan(S_285 * 3)
    expect(Math.abs(scene.lineX - predecessor.right)).toBeGreaterThan(S_285 * 3)
    // STEP: past S-285 even from the head's base, and inside S-250 beyond the bar's half height.
    expect(clearOfTheLine - (S_19 * displayRatioAt(scale)) / 2).toBeGreaterThan(S_285)
    expect(clearOfTheLine).toBeLessThan((successor.bottom - successor.top) / 2 + S_250)
  })
})
