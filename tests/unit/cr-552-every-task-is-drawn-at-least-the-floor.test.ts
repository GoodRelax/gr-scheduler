// CR-552: no Task is dropped for its width; a narrow one is drawn at the S-49 floor and grabbed by the existing rules.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { documentFromJson, jsonFromDocument } from '../../src/adapter/document-codec/json-codec'
import type { Document } from '../../src/entity/document-model/document/document'
import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule, Task } from '../../src/entity/document-model/schedule/schedule'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import { grabSizesOf, itemAtPointer } from '../../src/entity/layout-engine/item-hit-area/item-hit-area'
import {
  geometryFromLayout,
  type ScheduleGeometry,
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
import { unbroken } from '../contract/spec-table'
import { DEFAULT_DISPLAY_SCALE, DISPLAY_SCALE_STEPS, displayRatioAt } from '../fixtures/display-scale'
import { boxOfBar, drawingDefault, midY, sizePx, type Box } from './cr-430-bench'

const REQUIREMENTS = unbroken(
  readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'),
)

const FR_018_NEVER_DROPPED_FOR_ITS_WIDTH =
  '⛔ 描いている行に載る `Task` を、形状の幅が狭いことを理由に描かないでおいてはならない（MUST NOT）'
const FR_018_THE_WIDTH_IS_THE_GREATER =
  '⭐ `Task` の形状を描く幅は、期間に 1 日あたりの表示幅（`FR-017`）を掛けた幅と、表 T-201 の `S-49`（`minShapeWidth`）に `FR-039` の描く比を掛けた幅の、大きいほうとすること（MUST）'
const FR_018_OVERLAPS_STACK =
  '⭐ 描いた幅が重なる `Task` は、段割当（`FR-003`、表 T-014）が下の段へ積む'
const FR_018_NO_SPECIAL_GRAB =
  '⛔ 床の幅で描いた `Task` のために、掴み代の値や応える順を別に置いてはならない（MUST NOT）'
const OP_6_UNKNOWN_KEYS_ARE_KEPT = '知らないキーは捨てずに保つ'
const S_49_IS_4PX_AT_100 = '既定の 6.4 は、表示の倍率 100（描く比 0.625、`S-236`）で 4px（6.4 × 0.625）に描く値である'

describe('CR-552 -- the manuscript these cases are driven by', () => {
  it.each([
    ['FR-018 (MUST NOT) never drops a Task for its width', FR_018_NEVER_DROPPED_FOR_ITS_WIDTH],
    ['FR-018 (MUST) the drawn width is the greater of the span and the floor', FR_018_THE_WIDTH_IS_THE_GREATER],
    ['FR-018 overlapping drawn widths are stacked by FR-003', FR_018_OVERLAPS_STACK],
    ['FR-018 (MUST NOT) no grab rule of its own for a floored Task', FR_018_NO_SPECIAL_GRAB],
    ['OP-6 keeps a key it does not know', OP_6_UNKNOWN_KEYS_ARE_KEPT],
  ])('01-04-requirements.md still says it: %s', (_name, clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })

  it('S-49 still says its default is 4px at display scale 100', () => {
    const settingsTable = readFileSync(join(process.cwd(), 'docs', 'spec', '_assets', 'tbl-settings.md'), 'utf8')
    expect(settingsTable).toContain(S_49_IS_4PX_AT_100)
  })
})

// see S-49, S-1, S-54, S-55
const S_49 = drawingDefault('S-49')
const S_1 = drawingDefault('S-1')
const ZOOM_MIN = drawingDefault('S-54')
const ZOOM_MAX = drawingDefault('S-55')

// see T-266, S-250, S-251, S-253, S-254
const S_250 = sizePx('S-250')
const S_251 = sizePx('S-251')
const S_253 = sizePx('S-253')
const S_254 = sizePx('S-254')

const SMALLEST_SCALE = Math.min(...DISPLAY_SCALE_STEPS)
const LARGEST_SCALE = Math.max(...DISPLAY_SCALE_STEPS)

const NESTED_DEFAULTS: Record<string, unknown> = (() => {
  const out: Record<string, unknown> = { ...SETTINGS_DEFAULTS }
  for (const [key, value] of Object.entries(SETTINGS_DEFAULTS)) {
    const dot = key.indexOf('.')
    if (dot < 0) continue
    const head = key.slice(0, dot)
    out[head] = {
      ...((out[head] as Record<string, unknown> | undefined) ?? {}),
      [key.slice(dot + 1)]: value,
    }
  }
  return out
})()

const START = '2026-01-05'

// see S-62, S-63, S-228, T-038
const settingsOf = (part: Record<string, unknown> = {}): DocumentSettings =>
  ({
    ...NESTED_DEFAULTS,
    scrollDate: START,
    stackDirection: 'down',
    assigneeVisible: false,
    percentCompleteVisible: false,
    progressMarkerVisible: false,
    actualVisible: false,
    dependencyVisible: false,
    ...part,
  }) as unknown as DocumentSettings

const ENV: ScreenEnvironment = { width: 1400, height: 900, appHeaderHeight: 56, scrollbarThickness: 8 }

const taskOf = (part: Record<string, unknown>): Task =>
  ({
    name: null,
    start: null,
    finish: null,
    milestone: false,
    actualStart: null,
    stop: null,
    actualFinish: null,
    resume: null,
    resumeValid: null,
    percentComplete: null,
    fadeInDays: null,
    fadeOutDays: null,
    dependencies: [],
    ...part,
  }) as unknown as Task

const dayAfter = (from: string, days: number): string =>
  new Date(new Date(`${from}T00:00:00Z`).getTime() + days * 86400000).toISOString().slice(0, 10)

const spanning = (uid: number, from: string, days: number, part: Record<string, unknown> = {}): Task =>
  taskOf({ uid, start: from, finish: dayAfter(from, days), ...part })

const oneRowOf = (tasks: readonly Task[], visuals: readonly Record<string, unknown>[] = []): Schedule =>
  ({
    project: { calendarUid: null, statusDate: null, title: null, themeHue: 214 },
    calendars: [],
    resources: [],
    assignments: [],
    highlightBoxes: [],
    commentBoxes: [],
    tasks,
    taskGroups: [{ id: 'g1', parentId: null, order: 0, height: null }],
    taskGroupMembers: tasks.map((task) => ({ groupId: 'g1', taskUid: task.uid })),
    taskVisuals: visuals,
    taskOrigins: [],
    baselineTasks: [],
  }) as unknown as Schedule

interface Scene {
  readonly layout: ScheduleLayout
  readonly geometry: ScheduleGeometry
}

const sceneOf = (schedule: Schedule, part: Record<string, unknown> = {}): Scene => {
  const settings = settingsOf(part)
  const regions = regionsFromScreen(ENV, settings)
  const layout = layoutFromSchedule(schedule, settings, regions)
  return { layout, geometry: geometryFromLayout(schedule, settings, layout, regions, emptySelection()) }
}

const placedOrThrow = (layout: ScheduleLayout, uid: number): TaskPlacement => {
  const placed = taskPlacement(layout, uid)
  if (placed === null) throw new Error(`Task ${uid} was not placed`)
  return placed
}

const planBoxOf = (scene: Scene, uid: number): Box => {
  const drawn = scene.geometry.tasks.find((one) => one.taskUid === uid)
  if (drawn === undefined) throw new Error(`Task ${uid} was not drawn`)
  return boxOfBar(drawn.plan, `the plan of Task ${uid}`)
}

// see FR-039, DS-1
const floorAt = (displayScale: number): number => S_49 * displayRatioAt(displayScale)

// see FR-017, DS-4
const spanWidthOf = (days: number, zoomX: number, displayScale: number): number =>
  days * S_1 * displayRatioAt(displayScale) * zoomX

const ZOOM_SWEEP: readonly number[] = (() => {
  const steps = 16
  const out: number[] = []
  for (let at = 0; at <= steps; at += 1) out.push(ZOOM_MIN * (ZOOM_MAX / ZOOM_MIN) ** (at / steps))
  out[steps] = ZOOM_MAX
  return out
})()

const SPAN_DAYS: readonly number[] = [0, 1, 2, 7, 30, 365]
const MILESTONE_UID = 100

const SWEEP_TASKS: readonly Task[] = [
  ...SPAN_DAYS.map((days, index) => spanning(index + 1, START, days, { name: `t${days}` })),
  taskOf({ uid: MILESTONE_UID, start: START, finish: START, milestone: true, name: 'm' }),
]
const SWEEP_SCHEDULE = oneRowOf(SWEEP_TASKS, [{ taskUid: MILESTONE_UID, shapeKind: 'milestone' }])
const SWEEP_UIDS = SWEEP_TASKS.map((task) => task.uid).sort((a, b) => a - b)

describe('FR-018 (MUST NOT) -- no Task is dropped at any zoomX the specification allows', () => {
  it('sweeps S-54 .. S-55 with the sweep ends exactly on the range', () => {
    expect(ZOOM_SWEEP[0]).toBe(ZOOM_MIN)
    expect(ZOOM_SWEEP[ZOOM_SWEEP.length - 1]).toBe(ZOOM_MAX)
  })

  it.each([SMALLEST_SCALE, DEFAULT_DISPLAY_SCALE, LARGEST_SCALE])(
    'places and draws every Task, 0 and 1 day and milestone included, at display scale %s',
    (displayScale) => {
      const missing: string[] = []
      for (const zoomX of ZOOM_SWEEP) {
        const scene = sceneOf(SWEEP_SCHEDULE, { zoomX, displayScale })
        const placed = scene.layout.placements.map((one) => one.taskUid).sort((a, b) => a - b)
        const drawn = scene.geometry.tasks.map((one) => one.taskUid).sort((a, b) => a - b)
        if (placed.join() !== SWEEP_UIDS.join()) missing.push(`zoomX ${zoomX}: placed ${placed.join()}`)
        if (drawn.join() !== SWEEP_UIDS.join()) missing.push(`zoomX ${zoomX}: drawn ${drawn.join()}`)
      }
      expect(missing, FR_018_NEVER_DROPPED_FOR_ITS_WIDTH).toEqual([])
    },
  )

  it('premise: the low end of the sweep really makes the short spans narrower than the floor', () => {
    expect(spanWidthOf(1, ZOOM_MIN, LARGEST_SCALE)).toBeLessThan(floorAt(LARGEST_SCALE))
    expect(spanWidthOf(7, ZOOM_MIN, DEFAULT_DISPLAY_SCALE)).toBeLessThan(floorAt(DEFAULT_DISPLAY_SCALE))
  })
})

describe('FR-018 / S-49 / DS-1 -- the drawn width is max(span width, S-49 x drawn ratio)', () => {
  it('premise: minShapeWidth is S-49 as table T-201 prints it', () => {
    expect(SETTINGS_DEFAULTS['minShapeWidth']).toBe(S_49)
  })

  it('floors at 4.0px at display scale 100', () => {
    // see S-49
    expect(floorAt(100)).toBeCloseTo(4, 10)
    const scene = sceneOf(SWEEP_SCHEDULE, { zoomX: ZOOM_MIN, displayScale: 100 })
    const box = planBoxOf(scene, 2)
    expect(box.x1 - box.x0, 'a 1-day Task at S-54, display scale 100').toBeCloseTo(4, 6)
  })

  it.each([SMALLEST_SCALE, 100, LARGEST_SCALE])(
    'draws every rectangle at the greater of the two, at display scale %s',
    (displayScale) => {
      const wrong: string[] = []
      for (const zoomX of ZOOM_SWEEP) {
        const scene = sceneOf(SWEEP_SCHEDULE, { zoomX, displayScale })
        SPAN_DAYS.forEach((days, index) => {
          const want = Math.max(spanWidthOf(days, zoomX, displayScale), floorAt(displayScale))
          const placed = placedOrThrow(scene.layout, index + 1).width
          const box = planBoxOf(scene, index + 1)
          if (Math.abs(placed - want) > 1e-6 * Math.max(1, want)) wrong.push(`zoomX ${zoomX} ${days}d placed ${placed} want ${want}`)
          if (Math.abs(box.x1 - box.x0 - want) > 1e-6 * Math.max(1, want)) wrong.push(`zoomX ${zoomX} ${days}d drawn ${box.x1 - box.x0} want ${want}`)
        })
      }
      expect(wrong, FR_018_THE_WIDTH_IS_THE_GREATER).toEqual([])
    },
  )

  it('makes the floor follow the display ratio: half at 50, double at 200', () => {
    const at = (displayScale: number): number => {
      const box = planBoxOf(sceneOf(SWEEP_SCHEDULE, { zoomX: ZOOM_MIN, displayScale }), 1)
      return box.x1 - box.x0
    }
    expect(at(50)).toBeCloseTo(at(100) / 2, 6)
    expect(at(200)).toBeCloseTo(at(100) * 2, 6)
  })
})

// see OC-1, FR-003, ST-10
describe('OC-1 / FR-003 -- floored Tasks that overlap, names included, take separate lanes', () => {
  const pairAt = (gapDays: number, name: string | null): Scene =>
    sceneOf(oneRowOf([spanning(1, START, 1, { name }), spanning(2, dayAfter(START, gapDays), 1)]), {
      zoomX: ZOOM_MIN,
      displayScale: 100,
    })

  it('stacks two 1-day Tasks whose dates do not overlap but whose floored shapes do', () => {
    const scene = pairAt(15, null)
    const a = placedOrThrow(scene.layout, 1)
    const b = placedOrThrow(scene.layout, 2)
    expect(a.x + spanWidthOf(1, ZOOM_MIN, 100), 'premise: the spans leave a gap').toBeLessThan(b.x)
    expect(a.x + a.width, 'premise: the floored shapes overlap').toBeGreaterThan(b.x)
    expect(a.stack).not.toBe(b.stack)
  })

  it('stacks two whose shapes are apart but whose outside name reaches over the next', () => {
    const scene = pairAt(200, 'a name long enough to reach well past the next Task')
    const a = placedOrThrow(scene.layout, 1)
    const b = placedOrThrow(scene.layout, 2)
    expect(a.x + a.width, 'premise: the shapes do not overlap').toBeLessThan(b.x)
    expect(a.labelPlacement, 'premise: the name stands outside the floored shape').toBe('right')
    expect(a.labelX + a.labelTextWidth, 'premise: the name reaches past the next shape').toBeGreaterThan(b.x)
    expect(a.stack, FR_018_OVERLAPS_STACK).not.toBe(b.stack)
  })

  it('control: the same named pair far apart shares one lane', () => {
    const scene = pairAt(4000, 'a name long enough to reach well past the next Task')
    const a = placedOrThrow(scene.layout, 1)
    const b = placedOrThrow(scene.layout, 2)
    expect(a.labelX + a.labelTextWidth, 'premise: the name ends before the next shape').toBeLessThan(b.x)
    expect(a.stack).toBe(b.stack)
  })
})

// see GA-9, GA-1, GA-2, HT-1, HT-4, DS-7
describe('T-266 / T-267 -- a floored Task is grabbed by the rules every Task has', () => {
  const grabAt = (scene: Scene, x: number, y: number): string | null => {
    const hit = itemAtPointer(scene.geometry, x, y, grabSizesOf())
    if (hit === null) return null
    if (hit.item.kind !== 'task' || hit.item.taskUid !== 1) return `other ${hit.grab}`
    return hit.grab
  }

  it('premise: the plan ends reach nowhere inward (S-251, S-254)', () => {
    expect(S_251).toBe(0)
    expect(S_254).toBe(0)
  })

  it.each([100, LARGEST_SCALE])('display scale %s: the body is the drawn width and the ends reach S-250 / S-253 beyond it', (displayScale) => {
    const scene = sceneOf(oneRowOf([spanning(1, START, 0)]), { zoomX: ZOOM_MIN, displayScale })
    const box = planBoxOf(scene, 1)
    const y = midY(box)
    expect(box.x1 - box.x0, 'premise: drawn at the floor').toBeCloseTo(floorAt(displayScale), 6)
    const inside: (string | null)[] = []
    for (let x = box.x0 + S_251 + 0.25; x < box.x1 - S_254; x += 0.25) inside.push(grabAt(scene, x, y))
    expect(inside.length, 'premise: some points inside were pressed').toBeGreaterThan(0)
    expect(new Set(inside), 'GA-9 answers across the whole drawn shape').toEqual(new Set(['GA-9']))
    expect(grabAt(scene, box.x0 - 0.5, y)).toBe('GA-1')
    expect(grabAt(scene, box.x0 - S_250 + 0.5, y)).toBe('GA-1')
    expect(grabAt(scene, box.x1 + 0.5, y)).toBe('GA-2')
    expect(grabAt(scene, box.x1 + S_253 - 0.5, y)).toBe('GA-2')
    expect(grabAt(scene, box.x0 - S_250 - 1, y), 'nothing past S-250').toBeNull()
    expect(grabAt(scene, box.x1 + S_253 + 1, y), 'nothing past S-253').toBeNull()
  })
})

const TEMPLATE = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
) as Record<string, unknown>

// see OP-6, CR-552
describe('OP-6 -- a saved document that still carries the retired task-LOD key opens and keeps it', () => {
  const RETIRED_KEY = 'taskLevelOfDetailReadablePx'
  const withKey = (): Document => {
    const template = structuredClone(TEMPLATE) as { documentSettings: Record<string, unknown> }
    return { ...template, documentSettings: { ...template.documentSettings, [RETIRED_KEY]: 24 } } as unknown as Document
  }

  it('premise: the template itself no longer carries the key', () => {
    expect((TEMPLATE['documentSettings'] as Record<string, unknown>)[RETIRED_KEY]).toBeUndefined()
  })

  it('opens without refusal and keeps the key and its value', () => {
    const decoded = documentFromJson(JSON.stringify(withKey()))
    expect(decoded.ok, decoded.ok ? '' : JSON.stringify(decoded)).toBe(true)
    if (!decoded.ok) return
    expect((decoded.document.documentSettings as unknown as Record<string, unknown>)[RETIRED_KEY]).toBe(24)
  })

  it('writes the key back unchanged, and every other setting with it', () => {
    const original = withKey()
    const decoded = documentFromJson(JSON.stringify(original))
    expect(decoded.ok).toBe(true)
    if (!decoded.ok) return
    const written = JSON.parse(jsonFromDocument(decoded.document)) as { documentSettings: Record<string, unknown> }
    expect(written.documentSettings[RETIRED_KEY]).toBe(24)
    expect(written.documentSettings).toEqual(
      JSON.parse(JSON.stringify((original as unknown as { documentSettings: unknown }).documentSettings)),
    )
  })
})
