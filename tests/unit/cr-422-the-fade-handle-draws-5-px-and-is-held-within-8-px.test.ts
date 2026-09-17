// CR-422: the fade grab point is drawn as an S-109 half-side square (5 x 5) and pressed within S-92 (8 x 8).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { documentFromJson } from '../../src/adapter/document-codec/json-codec'
import { svgFromSchedule } from '../../src/adapter/svg-renderer/svg-renderer'
import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule, Task } from '../../src/entity/document-model/schedule/schedule'
import { emptySelection, selectionWith } from '../../src/entity/document-model/selection/selection'
import { grabSizesOf, itemAtPointer } from '../../src/entity/layout-engine/item-hit-area/item-hit-area'
import { geometryFromLayout } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import { layoutFromSchedule } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import {
  regionsFromScreen,
  type ScreenEnvironment,
} from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { bare, specTable } from '../contract/spec-table'
import { validateDocument } from '../fixtures/grs-document'
import { DEFAULT_DISPLAY_SCALE, DISPLAY_SCALE_STEPS } from '../fixtures/display-scale'

// see T-206, T-210
const numbersOf = (table: string, id: string, column: string): readonly number[] => {
  const row = specTable(table).rows.find((one) => one.id === id)
  if (row === undefined) throw new Error(`table ${table} has no row ${id}`)
  return (bare(row.by[column] ?? '').replace(/`/g, '').match(/\d+(?:\.\d+)?/g) ?? []).map(Number)
}

const [S_109] = numbersOf('T-210', 'S-109', '値')
const [S_109_FLOOR] = numbersOf('T-210', 'S-109', '下限')
const [S_110] = numbersOf('T-210', 'S-110', '値')
const [S_92_WIDE, S_92_TALL] = numbersOf('T-206', 'S-92', '既定')
const HALF_GRAB = S_92_WIDE! / 2
const INSIDE = HALF_GRAB - 0.1
const OUTSIDE = HALF_GRAB + 0.1

describe('tables T-210 / T-206 -- the values CR-422 moved', () => {
  it('holds S-109 at 2.5 with its floor at 2.5, S-110 at 1.0, and S-92 at 8 x 8', () => {
    expect(S_109).toBe(2.5)
    expect(S_109_FLOOR).toBe(2.5)
    expect(S_110).toBe(1)
    expect([S_92_WIDE, S_92_TALL]).toEqual([8, 8])
  })

  it('keeps the grab wider than the drawn point', () => {
    expect(S_92_WIDE!).toBeGreaterThan(S_109! * 2)
  })

  it('generates the stored fade-handle defaults the manuscript prints', () => {
    expect(SETTINGS_DEFAULTS['fadeHandleHalfPx']).toBe(S_109)
    expect(SETTINGS_DEFAULTS['fadeHandleStrokePx']).toBe(S_110)
  })

  it('hands the hit test half of S-92 through grabSizesOf', () => {
    expect(grabSizesOf().fadeHandle).toBe(HALF_GRAB)
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
  ({
    ...nestedDefaults(),
    scrollDate: '2026-01-01',
    displayScale: scale,
    zoomX: 2,
    zoomY: 2,
  }) as unknown as DocumentSettings

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
      stop: null,
      actualFinish: null,
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

describe('S-109 / S-110 -- the drawn fade grab points of the selected Task', () => {
  it.each([DISPLAY_SCALE_STEPS[0]!, DEFAULT_DISPLAY_SCALE, DISPLAY_SCALE_STEPS[DISPLAY_SCALE_STEPS.length - 1]!])(
    'draws each, in a document of generated defaults, as a 5 x 5 square centred on its point with an S-110 border, at display scale %s',
    (scale) => {
      const { geometry, svg } = sceneAt(scale)
      const points = geometry.tasks[0]?.fadeHandles ?? []
      expect(points, 'premise: FR-075 gives the selected Task its two points').toHaveLength(2)
      const squares = rectsOf(svg).filter((tag) => attributeOf(tag, 'data-figure')?.includes('fade-handle') === true)
      expect(squares, 'one square per point').toHaveLength(points.length)
      squares.forEach((square, index) => {
        const width = Number(attributeOf(square, 'width'))
        const height = Number(attributeOf(square, 'height'))
        expect(width, square).toBeCloseTo(S_109! * 2, 6)
        expect(height, square).toBeCloseTo(S_109! * 2, 6)
        expect(Number(attributeOf(square, 'x')) + width / 2, square).toBeCloseTo(points[index]!.x, 2)
        expect(Number(attributeOf(square, 'y')) + height / 2, square).toBeCloseTo(points[index]!.y, 2)
        expect(Number(attributeOf(square, 'stroke-width')), square).toBeCloseTo(S_110!, 6)
      })
    },
  )
})

describe('S-92 -- a press within 4px of a point takes its fade, and 4.1px does not', () => {
  const { geometry } = sceneAt(DEFAULT_DISPLAY_SCALE)
  const points = geometry.tasks[0]?.fadeHandles ?? []
  const grabAt = (x: number, y: number) => itemAtPointer(geometry, x, y, grabSizesOf())?.grab ?? null

  it('premise: each point centre is taken as GR-1 or GR-2', () => {
    expect(new Set(points.map((point) => grabAt(point.x, point.y)))).toEqual(new Set(['GR-1', 'GR-2']))
  })

  it.each([
    ['right', 1, 0],
    ['left', -1, 0],
    ['below', 0, 1],
    ['above', 0, -1],
  ] as const)('takes the fade %s of the centre at 3.9px and not at 4.1px', (_side, dx, dy) => {
    for (const point of points) {
      const own = grabAt(point.x, point.y)
      expect(grabAt(point.x + dx * INSIDE, point.y + dy * INSIDE), `${INSIDE}px from the point`).toBe(own)
      expect(grabAt(point.x + dx * OUTSIDE, point.y + dy * OUTSIDE), `${OUTSIDE}px from the point`).not.toBe(own)
    }
  })
})

describe('the document schema and the codec -- fadeHandleHalfPx may be 2.5', () => {
  const template = JSON.parse(
    readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
  ) as Record<string, any>

  const documentWith = (fadeHandleHalfPx: number): Record<string, unknown> => ({
    ...template,
    documentSettings: { ...template.documentSettings, fadeHandleHalfPx },
  })

  it('accepts 2.5 and refuses 2.4 under the schema in docs/spec', () => {
    expect(validateDocument(documentWith(S_109_FLOOR!)).valid).toBe(true)
    expect(validateDocument(documentWith(S_109_FLOOR! - 0.1)).valid).toBe(false)
  })

  it('opens a document holding 2.5 as 2.5, clamping nothing', () => {
    const read = documentFromJson(JSON.stringify(documentWith(S_109_FLOOR!)))
    expect(read.ok, JSON.stringify(read.ok ? '' : read.faults)).toBe(true)
    if (!read.ok) return
    expect(read.document.documentSettings.fadeHandleHalfPx).toBe(S_109_FLOOR)
    expect(read.clampedCount).toBe(0)
  })

  it('does not take 2.4 as it stands: it is refused, or brought to 2.5 and counted (RS-51)', () => {
    const read = documentFromJson(JSON.stringify(documentWith(S_109_FLOOR! - 0.1)))
    if (!read.ok) return
    expect(read.document.documentSettings.fadeHandleHalfPx).toBe(S_109_FLOOR)
    expect(read.clampedCount).toBeGreaterThanOrEqual(1)
  })
})
