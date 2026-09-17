// CR-413: stacked shapes keep S-11 + the drawn dependency line + S-11 apart, in a row and across rows; a milestone is no taller than a rectangle.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { documentFromJson } from '../../src/adapter/document-codec/json-codec'
import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule, Task } from '../../src/entity/document-model/schedule/schedule'
import {
  emptySelection,
  selectionWith,
  type Selection,
} from '../../src/entity/document-model/selection/selection'
import {
  geometryFromLayout,
  type BarGeometry,
  type ScheduleGeometry,
  type TaskGeometry,
} from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import {
  layoutFromSchedule,
  taskPlacement,
  type ScheduleLayout,
  type TaskPlacement,
} from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import {
  regionsFromScreen,
  type ScreenEnvironment,
} from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { bare, specTable, unbroken } from '../contract/spec-table'
import { DEFAULT_DISPLAY_SCALE, DISPLAY_SCALE_STEPS, displayRatioAt } from '../fixtures/display-scale'

const REQUIREMENTS = unbroken(
  readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'),
)
const DESIGN = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '05-07-design.md'), 'utf8'))

const FR_094_THE_GAP_FOLLOWS_T_259 = '⭐ 上下に積んだタスクの形と形の縦の隙間は、表 T-259 に従うこと（MUST）'
const VG_1_WHERE =
  '同じ行の上下の段のあいだと、上の行のいちばん下の段と下の行のいちばん上の段のあいだに空けること（MUST）'
const VG_2_HOW_LARGE =
  '`_assets/tbl-settings.md` の 表 T-201 の `S-11` と、描いた依存線の太さ（`VG-4`）と、もう 1 つの `S-11` を足した長さとすること（MUST）'
const VG_3_SCREEN_PX = '| `S-11` の単位 | 画面の px とすること（MUST）'
const VG_3_NOT_SCALED = '⛔ 表示の倍率の描く比も `zoomY` も掛けてはならない（MUST NOT）'
const VG_4_THE_LINE =
  '`_assets/tbl-settings.md` の 表 T-201 の `S-18` に `FR-039` の描く比を掛けた太さとすること（MUST）'
const VG_4_NOT_SELECTED = '⛔ 選ばれて 表 T-206 の `S-178` を掛けた太さで数えてはならない（MUST NOT）'
const VG_5_THE_EDGE = '上の形の描いた下端と、下の形の描いた上端のあいだで測ること（MUST）'
const VG_6_THE_WIDEST = 'その段で縦にいちばん広く取る形の端から測ること（MUST）'
const VG_7_A_LOWER_BOUND = '行をまたぐところは、`VG-2` の大きさを下限とすること（MUST）'

const LF_2_ONE_GAP_PER_LANE =
  '段と段のあいだと、いちばん下の段の下に、同表の `VG-2` の隙間を 1 つずつ加える（段数と同じ数）'
const LF_5_HALF_THE_GAP = '同じ段どうしのときはその段の下端に、`01-04-requirements.md` の 表 T-259 の `VG-2` の隙間の半分を加えた高さ'

const CLAUSES: readonly (readonly [string, string])[] = [
  ['FR-094 (MUST) -- the vertical gap follows table T-259', FR_094_THE_GAP_FOLLOWS_T_259],
  ['VG-1 (MUST) -- between lanes of a row and across rows', VG_1_WHERE],
  ['VG-2 (MUST) -- S-11 + the drawn line + S-11', VG_2_HOW_LARGE],
  ['VG-3 (MUST) -- S-11 is a screen px', VG_3_SCREEN_PX],
  ['VG-3 (MUST NOT) -- neither the drawn ratio nor zoomY multiplies S-11', VG_3_NOT_SCALED],
  ['VG-4 (MUST) -- the line is S-18 x the drawn ratio', VG_4_THE_LINE],
  ['VG-4 (MUST NOT) -- a selected line is not counted at S-178', VG_4_NOT_SELECTED],
  ['VG-5 (MUST) -- measured between the drawn edges', VG_5_THE_EDGE],
  ['VG-6 (MUST) -- measured from the widest shape of the lane', VG_6_THE_WIDEST],
  ['VG-7 (MUST) -- across rows VG-2 is a lower bound', VG_7_A_LOWER_BOUND],
]

describe('CR-413 -- the manuscript these cases are driven by', () => {
  it.each(CLAUSES)('still says it, word for word: %s', (_name, clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })

  it('LF-2 adds one VG-2 gap per lane and LF-5 runs the same-lane corridor half a gap below the lane', () => {
    expect(DESIGN).toContain(LF_2_ONE_GAP_PER_LANE)
    expect(DESIGN).toContain(LF_5_HALF_THE_GAP)
  })
})

// see T-201, T-206
const numberOf = (table: string, id: string, column: string): number => {
  const row = specTable(table).rows.find((one) => one.id === id)
  if (row === undefined) throw new Error(`table ${table} has no row ${id}`)
  const found = /-?\d+(?:\.\d+)?/.exec(bare(row.by[column] ?? ''))
  if (found === null) throw new Error(`table ${table} row ${id} states no number in ${column}`)
  return Number(found[0])
}
const cellOf = (table: string, id: string, column: string): string => {
  const row = specTable(table).rows.find((one) => one.id === id)
  if (row === undefined) throw new Error(`table ${table} has no row ${id}`)
  return row.by[column] ?? ''
}

const T_201_DEFAULT = '既定値'
const T_206_DEFAULT = '既定'

const S_11 = numberOf('T-201', 'S-11', T_201_DEFAULT)
const S_17 = numberOf('T-201', 'S-17', T_201_DEFAULT)
const S_18 = numberOf('T-201', 'S-18', T_201_DEFAULT)
const S_19 = numberOf('T-201', 'S-19', T_201_DEFAULT)
const S_39 = numberOf('T-201', 'S-39', T_201_DEFAULT)
const S_196 = numberOf('T-206', 'S-196', T_206_DEFAULT)
const S_233 = numberOf('T-206', 'S-233', T_206_DEFAULT)

// see VG-2, VG-4
const gapAt = (scale: number): number => S_11 + S_18 * displayRatioAt(scale) + S_11

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

const settingsAt = (scale: number, part: Record<string, unknown> = {}): DocumentSettings =>
  ({
    ...nestedDefaults(),
    scrollDate: '2026-01-01',
    displayScale: scale,
    stackDirection: 'down',
    zoomY: 3,
    ...part,
  }) as unknown as DocumentSettings

const ENV: ScreenEnvironment = { width: 1600, height: 1200, appHeaderHeight: 56, scrollbarThickness: 8 }

const taskOf = (uid: number, start: string, finish: string, part: Record<string, unknown> = {}): Task =>
  ({
    uid,
    name: `t${uid}`,
    start,
    finish,
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

interface Member {
  readonly task: Task
  readonly groupId: string
  readonly shapeKind?: string
}

const scheduleOf = (members: readonly Member[]): Schedule => {
  const groups = [...new Set(members.map((one) => one.groupId))]
  return {
    project: { calendarUid: null, statusDate: null, title: null, themeHue: 214 },
    calendars: [],
    resources: [],
    assignments: [],
    highlightBoxes: [],
    commentBoxes: [],
    tasks: members.map((one) => one.task),
    taskGroups: groups.map((id, order) => ({ id, parentId: null, order, height: null })),
    taskGroupMembers: members.map((one) => ({ groupId: one.groupId, taskUid: one.task.uid })),
    taskVisuals: members
      .filter((one) => one.shapeKind !== undefined)
      .map((one) => ({ taskUid: one.task.uid, shapeKind: one.shapeKind })),
    taskOrigins: [],
    baselineTasks: [],
  } as unknown as Schedule
}

interface Scene {
  readonly scale: number
  readonly settings: DocumentSettings
  readonly layout: ScheduleLayout
  readonly geometry: ScheduleGeometry
}

const sceneOf = (
  schedule: Schedule,
  scale: number,
  part: Record<string, unknown> = {},
  selection: Selection = emptySelection(),
): Scene => {
  const settings = settingsAt(scale, part)
  const regions = regionsFromScreen(ENV, settings)
  const layout = layoutFromSchedule(schedule, settings, regions)
  return { scale, settings, layout, geometry: geometryFromLayout(schedule, settings, layout, regions, selection) }
}

const placementIn = (scene: Scene, uid: number): TaskPlacement => {
  const found = taskPlacement(scene.layout, uid)
  if (found === null) throw new Error(`task ${uid} is not placed`)
  return found
}

const geometryIn = (scene: Scene, uid: number): TaskGeometry => {
  const found = scene.geometry.tasks.find((one) => one.taskUid === uid)
  if (found === undefined) throw new Error(`task ${uid} is not drawn`)
  return found
}

interface Extent {
  readonly top: number
  readonly bottom: number
}

// see VG-5
const barExtent = (bar: BarGeometry, scale: number): Extent => {
  if (bar.form === 'outline') {
    const ys = bar.points.map((one) => one.y)
    const half = (S_39 * displayRatioAt(scale)) / 2
    return { top: Math.min(...ys) - half, bottom: Math.max(...ys) + half }
  }
  const ys = [bar.from.y, bar.to.y]
  const half = bar.strokeWidth / 2
  const heads = (bar.head ?? []).map((one) => one.y)
  return {
    top: Math.min(...ys.map((y) => y - half), ...heads),
    bottom: Math.max(...ys.map((y) => y + half), ...heads),
  }
}

// see VG-5, OC-10, S-196, S-233
const drawnExtent = (scene: Scene, uid: number): Extent => {
  const shape = geometryIn(scene, uid)
  const bars = [shape.plan, shape.actual, shape.milestoneFigure].filter(
    (one): one is BarGeometry => one !== null,
  )
  if (bars.length === 0) throw new Error(`task ${uid} draws no figure`)
  const each = bars.map((bar) => barExtent(bar, scene.scale))
  let top = Math.min(...each.map((one) => one.top))
  const bottom = Math.max(...each.map((one) => one.bottom))
  const placed = placementIn(scene, uid)
  if (placed.shapeKind === 'arrow' || placed.shapeKind === 'endpointSpan') {
    const figureTop = shape.plan === null ? top : barExtent(shape.plan, scene.scale).top
    top = Math.min(top, figureTop - S_196 * displayRatioAt(scene.scale) - placed.labelFontSize * S_233)
  }
  return { top, bottom }
}

// see VG-5
const gapBetween = (scene: Scene, upper: readonly number[], lower: readonly number[]): number =>
  Math.min(...lower.map((uid) => drawnExtent(scene, uid).top)) -
  Math.max(...upper.map((uid) => drawnExtent(scene, uid).bottom))

// see VG-1, ST-2
const A = 1
const B = 2
const NEXT_ROW = 3

const TWO_LANES_THEN_A_ROW = scheduleOf([
  { task: taskOf(A, '2026-01-05', '2026-01-20'), groupId: 'g1' },
  { task: taskOf(B, '2026-01-10', '2026-02-10'), groupId: 'g1' },
  { task: taskOf(NEXT_ROW, '2026-01-05', '2026-01-25'), groupId: 'g2' },
])

const upperAndLower = (scene: Scene): readonly [number, number] => {
  const a = placementIn(scene, A)
  const b = placementIn(scene, B)
  expect(a.stack, 'premise: the two overlapping rectangles take two lanes').not.toBe(b.stack)
  return a.y < b.y ? [A, B] : [B, A]
}

describe('VG-1 / VG-2 (MUST) -- the gap between two lanes of one row', () => {
  it.each(DISPLAY_SCALE_STEPS.filter((step, at, all) => at === 0 || step === DEFAULT_DISPLAY_SCALE || at === all.length - 1))(
    'is S-11 + S-18 x the drawn ratio + S-11 from the outer border edge, at display scale %s',
    (scale) => {
      const scene = sceneOf(TWO_LANES_THEN_A_ROW, scale)
      const [upper, lower] = upperAndLower(scene)
      expect(gapBetween(scene, [upper], [lower]), `${VG_2_HOW_LARGE} -- ${VG_5_THE_EDGE}`).toBeCloseTo(gapAt(scale), 6)
    },
  )

  it('is the 2.75px CR-413 works out at the default step, from the manuscript numbers alone', () => {
    expect(gapAt(DEFAULT_DISPLAY_SCALE)).toBeCloseTo(2.75, 9)
  })
})

describe('VG-1 / VG-7 (MUST) -- the gap across two rows', () => {
  it('keeps at least the VG-2 gap between the bottom lane of a two-lane row and the top of the next row', () => {
    const scene = sceneOf(TWO_LANES_THEN_A_ROW, DEFAULT_DISPLAY_SCALE)
    const [, lower] = upperAndLower(scene)
    expect(gapBetween(scene, [lower], [NEXT_ROW]), `${VG_1_WHERE} -- ${VG_7_A_LOWER_BOUND}`).toBeGreaterThanOrEqual(
      gapAt(DEFAULT_DISPLAY_SCALE) - 1e-6,
    )
  })

  it('leaves more than the gap under a one-lane row whose band stands on its floor', () => {
    const oneLane = scheduleOf([
      { task: taskOf(A, '2026-01-05', '2026-01-20'), groupId: 'g1' },
      { task: taskOf(NEXT_ROW, '2026-01-05', '2026-01-25'), groupId: 'g2' },
    ])
    const scene = sceneOf(oneLane, DEFAULT_DISPLAY_SCALE, { zoomY: 0.2 })
    expect(gapBetween(scene, [A], [NEXT_ROW]), VG_7_A_LOWER_BOUND).toBeGreaterThan(gapAt(DEFAULT_DISPLAY_SCALE))
  })
})

describe('VG-3 (MUST NOT) -- S-11 takes neither the drawn ratio nor zoomY', () => {
  it.each([0.5, 2])('leaves 2 x S-11 once the drawn line is taken off, at zoomY %s', (zoomY) => {
    for (const scale of [DISPLAY_SCALE_STEPS[0]!, DEFAULT_DISPLAY_SCALE, DISPLAY_SCALE_STEPS[DISPLAY_SCALE_STEPS.length - 1]!]) {
      const scene = sceneOf(TWO_LANES_THEN_A_ROW, scale, { zoomY })
      const [upper, lower] = upperAndLower(scene)
      expect(
        gapBetween(scene, [upper], [lower]) - S_18 * displayRatioAt(scale),
        `${VG_3_NOT_SCALED} -- scale ${scale}, zoomY ${zoomY}`,
      ).toBeCloseTo(2 * S_11, 6)
    }
  })
})

describe('VG-4 (MUST NOT) -- selecting a dependency line moves no lane and no row', () => {
  const LINKED = scheduleOf([
    { task: taskOf(A, '2026-01-05', '2026-01-20'), groupId: 'g1' },
    { task: taskOf(B, '2026-01-10', '2026-02-10'), groupId: 'g1' },
    {
      task: taskOf(NEXT_ROW, '2026-02-20', '2026-03-05', {
        dependencies: [{ predecessorUid: A, linkType: 1, lag: null, lagFormat: null, carry: {}, carryElements: [] }],
      }),
      groupId: 'g2',
    },
  ])

  it('draws every shape at the same height whether or not the line is selected', () => {
    const bare = sceneOf(LINKED, DEFAULT_DISPLAY_SCALE)
    const picked = sceneOf(
      LINKED,
      DEFAULT_DISPLAY_SCALE,
      {},
      selectionWith(emptySelection(), { kind: 'dependency', successorUid: NEXT_ROW, ordinal: 0 }),
    )
    for (const uid of [A, B, NEXT_ROW]) {
      expect(drawnExtent(picked, uid), `${VG_4_NOT_SELECTED} -- task ${uid}`).toEqual(drawnExtent(bare, uid))
    }
    expect(picked.layout.rows.map((row) => [row.y, row.height])).toEqual(bare.layout.rows.map((row) => [row.y, row.height]))
  })
})

describe('VG-6 (MUST) -- a lane holding shapes of different heights is measured from the widest', () => {
  const ARROW = 4
  const SHORT_RECTANGLE = 5
  const MIXED = scheduleOf([
    { task: taskOf(A, '2026-01-05', '2026-03-01'), groupId: 'g1' },
    { task: taskOf(ARROW, '2026-01-06', '2026-01-16'), groupId: 'g1', shapeKind: 'arrow' },
    { task: taskOf(SHORT_RECTANGLE, '2026-02-10', '2026-02-20'), groupId: 'g1' },
  ])

  it('puts the lane under the long rectangle at the gap from the top of its widest shape, counting the arrow name', () => {
    const scene = sceneOf(MIXED, DEFAULT_DISPLAY_SCALE, { zoomY: 1 })
    const arrow = placementIn(scene, ARROW)
    const short = placementIn(scene, SHORT_RECTANGLE)
    expect(arrow.stack, 'premise: the arrow and the short rectangle share one lane').toBe(short.stack)
    expect(placementIn(scene, A).y, 'premise: the long rectangle stands in the lane above').toBeLessThan(arrow.y)
    expect(gapBetween(scene, [A], [ARROW, SHORT_RECTANGLE]), VG_6_THE_WIDEST).toBeCloseTo(
      gapAt(DEFAULT_DISPLAY_SCALE),
      6,
    )
  })
})

describe('S-17 -- a milestone is no taller than a rectangle', () => {
  it('holds 1.0 with the ceiling 1 and the floor 0.1 in table T-201', () => {
    expect(S_17).toBe(1)
    expect(numberOf('T-201', 'S-17', '上限')).toBe(1)
    expect(numberOf('T-201', 'S-17', '下限')).toBeCloseTo(0.1, 9)
    expect(SETTINGS_DEFAULTS['shapeHeightOf.milestone'], 'the generated default').toBe(S_17)
  })

  it('draws the milestone plan height and its name font equal to the rectangle beside it', () => {
    const MILESTONE = 6
    const schedule = scheduleOf([
      { task: taskOf(A, '2026-01-05', '2026-01-20'), groupId: 'g1' },
      { task: taskOf(MILESTONE, '2026-02-10', '2026-02-10', { milestone: true }), groupId: 'g2' },
    ])
    const scene = sceneOf(schedule, DEFAULT_DISPLAY_SCALE, { zoomY: 2 })
    const rectangle = placementIn(scene, A)
    const milestone = placementIn(scene, MILESTONE)
    expect(milestone.shapeKind, 'premise: the milestone is drawn as SH-5').toBe('milestone')
    expect(milestone.planHeight, 'S-17 x the rectangle plan height').toBeCloseTo(rectangle.planHeight * S_17, 6)
    expect(milestone.labelFontSize, 'the milestone name is the rectangle name').toBeCloseTo(rectangle.labelFontSize, 6)
  })
})

describe('S-11 / S-17 / S-18 -- the document ranges table T-201 now states', () => {
  const TEMPLATE = JSON.parse(
    readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
  ) as Record<string, any>

  const read = (settings: Record<string, unknown>) => {
    const template = structuredClone(TEMPLATE)
    const text = JSON.stringify({
      ...template,
      documentSettings: {
        ...template.documentSettings,
        ...settings,
        shapeHeightOf: { ...template.documentSettings.shapeHeightOf, ...((settings['shapeHeightOf'] as object) ?? {}) },
      },
    })
    const decoded = documentFromJson(text)
    if (!decoded.ok) throw new Error(`refused: ${JSON.stringify(decoded.faults)}`)
    return decoded
  }

  it('fixes stackGap at S-11: a stored 12 reads as 1 and is counted (RS-51)', () => {
    expect(numberOf('T-201', 'S-11', '下限')).toBe(S_11)
    expect(numberOf('T-201', 'S-11', '上限')).toBe(S_11)
    const decoded = read({ stackGap: 12 })
    expect(decoded.document.documentSettings.stackGap).toBe(S_11)
    expect(decoded.clampedCount).toBeGreaterThanOrEqual(1)
  })

  it('caps a milestone at the rectangle: a stored 1.25 reads as 1', () => {
    const decoded = read({ shapeHeightOf: { milestone: 1.25 } })
    expect(decoded.document.documentSettings.shapeHeightOf.milestone).toBe(numberOf('T-201', 'S-17', '上限'))
  })

  it('caps dependencyWidth at dependencyArrowLength / 2, not at stackGap / 2', () => {
    expect(cellOf('T-201', 'S-18', '上限')).toContain('dependencyArrowLength')
    // STEP: S-19's own floor (dependencyWidth x 2) could lift the arrow instead, so the arrow stands at S-19's maximum.
    const longest = numberOf('T-201', 'S-19', '上限')
    expect(S_19, 'premise: the default S-19 sits below its maximum, so it could have been lifted').toBeLessThan(longest)
    const decoded = read({ dependencyArrowLength: longest, dependencyWidth: longest / 2 + 1 })
    expect(decoded.document.documentSettings.dependencyArrowLength).toBe(longest)
    expect(decoded.document.documentSettings.dependencyWidth).toBeCloseTo(longest / 2, 9)
    expect(decoded.clampedCount).toBeGreaterThanOrEqual(1)
  })
})

describe('LF-5 -- two Tasks of one lane route their corridor half a VG-2 gap under the lane', () => {
  it('runs the horizontal of a same-lane four-bend route at the lane bottom + gap / 2', () => {
    const P = 7
    const S = 8
    const schedule = scheduleOf([
      { task: taskOf(P, '2026-01-05', '2026-01-15'), groupId: 'g1' },
      {
        task: taskOf(S, '2026-01-15', '2026-01-25', {
          dependencies: [{ predecessorUid: P, linkType: 1, lag: null, lagFormat: null, carry: {}, carryElements: [] }],
        }),
        groupId: 'g1',
      },
    ])
    const scene = sceneOf(schedule, DEFAULT_DISPLAY_SCALE, { zoomX: 4, zoomY: 1 })
    expect(placementIn(scene, S).stack, 'premise: both Tasks are on one lane').toBe(placementIn(scene, P).stack)
    const line = scene.geometry.dependencies[0]
    if (line === undefined) throw new Error('the dependency line is not drawn')
    const mid = line.points[2]
    const back = line.points[3]
    if (mid === undefined || back === undefined) throw new Error(`not a four-bend route: ${line.pattern}`)
    expect(mid.y, 'premise: the corridor is one horizontal run').toBeCloseTo(back.y, 6)
    expect(mid.y, LF_5_HALF_THE_GAP).toBeCloseTo(drawnExtent(scene, P).bottom + gapAt(DEFAULT_DISPLAY_SCALE) / 2, 6)
  })
})
