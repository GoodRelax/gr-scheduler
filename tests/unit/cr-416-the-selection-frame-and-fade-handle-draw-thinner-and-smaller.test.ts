// CR-416: the selection frame is S-174 thick on an S-175 dash, and the fade grab point is an S-109 half-side square with an S-110 border.

import { describe, expect, it } from 'vitest'

import { svgFromSchedule } from '../../src/adapter/svg-renderer/svg-renderer'
import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule, Task } from '../../src/entity/document-model/schedule/schedule'
import { emptySelection, selectionWith } from '../../src/entity/document-model/selection/selection'
import {
  itemAtPointer,
  NOT_STORED_SIZES,
  type PointerSlop,
} from '../../src/entity/layout-engine/item-hit-area/item-hit-area'
import { geometryFromLayout } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import { layoutFromSchedule } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import {
  regionsFromScreen,
  type ScreenEnvironment,
} from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { bare, specTable } from '../contract/spec-table'
import { DEFAULT_DISPLAY_SCALE, DISPLAY_SCALE_STEPS } from '../fixtures/display-scale'

// see T-206, T-210
const numbersOf = (table: string, id: string, column: string): readonly number[] => {
  const row = specTable(table).rows.find((one) => one.id === id)
  if (row === undefined) throw new Error(`table ${table} has no row ${id}`)
  return (bare(row.by[column] ?? '').match(/\d+(?:\.\d+)?/g) ?? []).map(Number)
}

const [S_174] = numbersOf('T-206', 'S-174', '既定')
const [S_175_ON, S_175_OFF] = numbersOf('T-206', 'S-175', '既定')
const [S_109] = numbersOf('T-210', 'S-109', '値')
const [S_110] = numbersOf('T-210', 'S-110', '値')
const [S_92] = numbersOf('T-206', 'S-92', '既定')
const S_92_BOTH = numbersOf('T-206', 'S-92', '既定')
const [S_109_FLOOR] = numbersOf('T-210', 'S-109', '下限')

describe('tables T-206 / T-210 -- the values CR-416 moved, and S-109 / S-92 as CR-422 moved them', () => {
  it('holds S-174 1px, S-175 2 x 1px, S-109 2.5px with its floor 2.5, and S-110 1.0px', () => {
    expect(S_174).toBe(1)
    expect([S_175_ON, S_175_OFF]).toEqual([2, 1])
    expect(S_109).toBe(2.5)
    expect(S_109_FLOOR).toBe(2.5)
    expect(S_110).toBe(1)
  })

  it('holds the S-92 grab at 8 x 8px, wider than the 5 x 5px point', () => {
    expect(S_92_BOTH).toEqual([8, 8])
    expect(S_92).toBeGreaterThan(S_109! * 2)
  })

  it('generates the two stored fade-handle defaults the manuscript prints', () => {
    expect(SETTINGS_DEFAULTS['fadeHandleHalfPx']).toBe(S_109)
    expect(SETTINGS_DEFAULTS['fadeHandleStrokePx']).toBe(S_110)
  })
})

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
  ({ ...nestedDefaults(), scrollDate: '2026-01-01', displayScale: scale, zoomX: 2, zoomY: 2 }) as unknown as DocumentSettings

const ENV: ScreenEnvironment = { width: 1600, height: 900, appHeaderHeight: 56, scrollbarThickness: 8 }

const ONE_TASK: Schedule = {
  project: { calendarUid: null, statusDate: null, title: null, themeHue: 214 },
  calendars: [],
  resources: [],
  assignments: [],
  highlightBoxes: [],
  commentBoxes: [],
  tasks: [
    {
      uid: 1,
      name: 'alpha',
      start: '2026-01-05',
      finish: '2026-02-05',
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
    } as unknown as Task,
  ],
  taskGroups: [{ id: 'g1', parentId: null, order: 0, height: null }],
  taskGroupMembers: [{ groupId: 'g1', taskUid: 1 }],
  taskVisuals: [],
  taskOrigins: [],
  baselineTasks: [],
} as unknown as Schedule

const SELECTED = selectionWith(emptySelection(), { kind: 'task', uid: 1 })

const sceneAt = (scale: number) => {
  const settings = settingsAt(scale)
  const regions = regionsFromScreen(ENV, settings)
  const layout = layoutFromSchedule(ONE_TASK, settings, regions)
  const geometry = geometryFromLayout(ONE_TASK, settings, layout, regions, SELECTED)
  return { geometry, svg: svgFromSchedule(ONE_TASK, settings, layout, geometry, regions, SELECTED, 'screen') }
}

const rectsOf = (svg: string): readonly string[] => svg.match(/<rect [^>]*>/g) ?? []
const attributeOf = (tag: string, name: string): string | null =>
  new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1] ?? null

describe('S-174 / S-175 -- the selected Task frame, which SL-8 keeps off the scale', () => {
  it.each([DISPLAY_SCALE_STEPS[0]!, DEFAULT_DISPLAY_SCALE, DISPLAY_SCALE_STEPS[DISPLAY_SCALE_STEPS.length - 1]!])(
    'draws one dashed frame at stroke-width S-174 and dash S-175, at display scale %s',
    (scale) => {
      const frames = rectsOf(sceneAt(scale).svg).filter((tag) => attributeOf(tag, 'stroke-dasharray') !== null)
      expect(frames, 'premise: the selected Task has exactly one dashed frame').toHaveLength(1)
      const frame = frames[0]!
      expect(Number(attributeOf(frame, 'stroke-width')), frame).toBeCloseTo(S_174!, 6)
      expect((attributeOf(frame, 'stroke-dasharray') ?? '').split(/[\s,]+/).map(Number), frame).toEqual([
        S_175_ON,
        S_175_OFF,
      ])
    },
  )
})

describe('S-109 / S-110 -- the fade grab points of the selected Task', () => {
  it('draws each as a 5 x 5 square centred on its point, with a 1px border', () => {
    const { geometry, svg } = sceneAt(DEFAULT_DISPLAY_SCALE)
    const points = geometry.tasks[0]?.fadeHandles ?? []
    expect(points, 'premise: FR-075 gives the selected Task its two points').toHaveLength(2)
    const squares = rectsOf(svg).filter(
      (tag) => attributeOf(tag, 'data-figure')?.includes('fade-handle') === true,
    )
    expect(squares, 'one square per point').toHaveLength(points.length)
    for (const square of squares) {
      expect(Number(attributeOf(square, 'width')), square).toBeCloseTo(S_109! * 2, 6)
      expect(Number(attributeOf(square, 'height')), square).toBeCloseTo(S_109! * 2, 6)
      expect(Number(attributeOf(square, 'stroke-width')), square).toBeCloseTo(S_110!, 6)
    }
  })
})

// see T-206, T-023d
const SLOP: PointerSlop = {
  planEndpoint: NOT_STORED_SIZES['S-90'],
  actualEndpoint: NOT_STORED_SIZES['S-91'],
  fadeHandle: S_92! / 2,
  line: NOT_STORED_SIZES['S-137'],
  boxPoint: NOT_STORED_SIZES['S-230'],
}

describe('S-92 -- a press outside the drawn point but inside 8 x 8 still takes the fade', () => {
  it('takes GR-1 or GR-2 at 0.1px inside the S-92 half right of each point centre', () => {
    const { geometry } = sceneAt(DEFAULT_DISPLAY_SCALE)
    const slop = SLOP
    const offset = S_92! / 2 - 0.1
    expect(offset, 'premise: the offset is outside the drawn point').toBeGreaterThan(S_109!)
    expect(offset, 'premise: the offset is inside the S-92 grab').toBeLessThan(S_92! / 2)
    const grabs = (geometry.tasks[0]?.fadeHandles ?? []).map(
      (point) => itemAtPointer(geometry, point.x + offset, point.y, slop)?.grab ?? null,
    )
    expect(new Set(grabs)).toEqual(new Set(['GR-1', 'GR-2']))
  })

  it('does not take GR-1 or GR-2 at 0.1px past the S-92 half right of each point centre', () => {
    const { geometry } = sceneAt(DEFAULT_DISPLAY_SCALE)
    const offset = S_92! / 2 + 0.1
    const grabs = (geometry.tasks[0]?.fadeHandles ?? []).map(
      (point) => itemAtPointer(geometry, point.x + offset, point.y, SLOP)?.grab ?? null,
    )
    expect(grabs, 'premise: FR-075 gives the selected Task its two points').toHaveLength(2)
    expect(grabs).not.toContain('GR-1')
    expect(grabs).not.toContain('GR-2')
  })

  it('the S-92 half the shell hands the hit test is the manuscript one', () => {
    expect(NOT_STORED_SIZES['S-92']).toEqual(S_92_BOTH)
  })
})
