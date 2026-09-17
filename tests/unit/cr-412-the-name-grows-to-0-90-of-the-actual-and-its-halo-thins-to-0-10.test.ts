// CR-412: the name font is S-7 of the actual strip and its halo is S-34 of the font.

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
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import { geometryFromLayout } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import {
  layoutFromSchedule,
  taskPlacement,
} from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import {
  regionsFromScreen,
  type ScreenEnvironment,
} from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { bare, specTable } from '../contract/spec-table'
import { DEFAULT_DISPLAY_SCALE, DISPLAY_SCALE_STEPS, displayRatioAt } from '../fixtures/display-scale'

// see T-201
const cellOf = (id: string, column: string): string => {
  const row = specTable('T-201').rows.find((one) => one.id === id)
  if (row === undefined) throw new Error(`table T-201 has no row ${id}`)
  return row.by[column] ?? ''
}

const numberOf = (id: string, column = '既定値'): number => {
  const found = /-?\d+(?:\.\d+)?/.exec(bare(cellOf(id, column)))
  if (found === null) throw new Error(`table T-201 row ${id} states no number in ${column}`)
  return Number(found[0])
}

const S_4 = numberOf('S-4')
const S_5 = numberOf('S-5')
const S_6 = numberOf('S-6')
const S_7 = numberOf('S-7')
const S_8 = numberOf('S-8')
const S_13 = numberOf('S-13')
const S_34 = numberOf('S-34')

describe('table T-201 -- the two values CR-412 moved', () => {
  it('holds S-7 fontOfActual at 0.90 and S-34 labelHaloOfFont at 0.10, both inside their ranges', () => {
    expect(bare(cellOf('S-7', 'キー'))).toBe('fontOfActual')
    expect(S_7).toBeCloseTo(0.9, 9)
    expect(bare(cellOf('S-34', 'キー'))).toBe('labelHaloOfFont')
    expect(S_34).toBeCloseTo(0.1, 9)
    expect(S_34).toBeLessThanOrEqual(numberOf('S-34', '上限'))
  })

  it('generates the same two defaults the manuscript prints', () => {
    expect(SETTINGS_DEFAULTS['fontOfActual']).toBe(S_7)
    expect(SETTINGS_DEFAULTS['labelHaloOfFont']).toBe(S_34)
  })

  it('names fontMin / fontOfActual as the floor of S-6, which the default 16 stands above', () => {
    expect(cellOf('S-6', '下限')).toContain('fontMin')
    expect(cellOf('S-6', '下限')).toContain('fontOfActual')
    expect(S_6).toBeGreaterThanOrEqual(S_8 / S_7)
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
  ({ ...nestedDefaults(), scrollDate: '2026-01-01', displayScale: scale, zoomY: 1 }) as unknown as DocumentSettings

const ENV: ScreenEnvironment = { width: 1600, height: 900, appHeaderHeight: 56, scrollbarThickness: 8 }

const NAMED: Schedule = {
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
      finish: '2026-03-05',
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

// see FR-094, S-7, T-252
const rectangleNameAt = (scale: number): number =>
  Math.max(S_8 * displayRatioAt(scale), Math.max(S_4 * S_13 * S_5, S_6) * S_7 * displayRatioAt(scale))

describe('S-7 -- a rectangle name at zoomY 1 is the actual strip x 0.90, times the drawn ratio', () => {
  it('works out to the 7.2009px CR-412 names at the default step, above the S-8 floor', () => {
    expect(rectangleNameAt(DEFAULT_DISPLAY_SCALE)).toBeCloseTo(7.2009, 4)
    expect(rectangleNameAt(DEFAULT_DISPLAY_SCALE)).toBeGreaterThan(S_8 * displayRatioAt(DEFAULT_DISPLAY_SCALE))
  })

  it.each(DISPLAY_SCALE_STEPS)('lays the name out at that size at display scale %s', (scale) => {
    const settings = settingsAt(scale)
    const regions = regionsFromScreen(ENV, settings)
    const placed = taskPlacement(layoutFromSchedule(NAMED, settings, regions), 1)
    expect(placed?.shapeKind, 'premise: the Task is a rectangle').toBe('rectangle')
    expect(placed?.labelFontSize).toBeCloseTo(rectangleNameAt(scale), 6)
  })
})

describe('S-34 -- the name halo is the font x 0.10', () => {
  it.each([DISPLAY_SCALE_STEPS[0]!, DEFAULT_DISPLAY_SCALE, DISPLAY_SCALE_STEPS[DISPLAY_SCALE_STEPS.length - 1]!])(
    'draws the label stroke-width at its own font-size x S-34, at display scale %s',
    (scale) => {
      const settings = settingsAt(scale)
      const regions = regionsFromScreen(ENV, settings)
      const layout = layoutFromSchedule(NAMED, settings, regions)
      const geometry = geometryFromLayout(NAMED, settings, layout, regions, emptySelection())
      const svg = svgFromSchedule(NAMED, settings, layout, geometry, regions, emptySelection(), 'screen')
      const found = /data-figure="task-1-label"/.exec(svg)
      if (found === null) throw new Error('the name label was not drawn')
      const opened = svg.lastIndexOf('<text ', found.index)
      const head = svg.slice(opened, found.index)
      const size = Number(/font-size="([\d.]+)"/.exec(head)?.[1])
      const halo = Number(/stroke-width="([\d.]+)"/.exec(head)?.[1])
      expect(size, 'premise: the label states a font-size').toBeGreaterThan(0)
      expect(Math.abs(halo - size * S_34), `stroke-width ${halo} against font-size ${size} x ${S_34}`).toBeLessThanOrEqual(0.01)
    },
  )
})

describe('S-6 -- its floor fontMin / fontOfActual is read at 0.90', () => {
  it('reads a stored actualMin of 13 as 12 / 0.90, and counts it (RS-51)', () => {
    const template = JSON.parse(
      readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
    ) as Record<string, any>
    const text = JSON.stringify({
      ...template,
      documentSettings: { ...template.documentSettings, fontMin: S_8, fontOfActual: S_7, actualMin: 13 },
    })
    const decoded = documentFromJson(text)
    if (!decoded.ok) throw new Error(`refused: ${JSON.stringify(decoded.faults)}`)
    expect(decoded.document.documentSettings.actualMin).toBeCloseTo(S_8 / S_7, 9)
    expect(decoded.clampedCount).toBeGreaterThanOrEqual(1)
  })
})
