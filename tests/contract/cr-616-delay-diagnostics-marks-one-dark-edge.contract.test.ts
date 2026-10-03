// CR-616 spec-only tests: FR-013 / FR-133 / T-236 / T-315 -- the DG marks take the chosen grounds, one dark edge.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { documentFromJson } from '../../src/adapter/document-codec/json-codec'
import { svgFromSchedule } from '../../src/adapter/svg-renderer/svg-renderer'
import type { DocumentSettings } from '../../src/entity/document-model/document-settings/document-settings'
import type { Schedule } from '../../src/entity/document-model/schedule/schedule'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import {
  geometryFromLayout,
  type ScheduleGeometry,
} from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import { layoutFromSchedule, type ScheduleLayout } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import {
  drawnSettingsOf,
  regionsFromScreen,
  type ScreenRegions,
} from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { bare, specTable, unbroken } from './spec-table'
import { rowDocument, SCREEN, taskOf } from '../unit/cr-541-stage'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

const FR_013_EDGE =
  '⭐ マーカーの円の縁は、そのマーカーの記号と同じ色で、`_assets/tbl-settings.md` の 表 T-201 の `S-24` の太さに描くこと（MUST）'
const FR_013_DELAY = '⭐ ただし遅れ（表 T-021 の `PM-4`）のマーカーは、地を `_assets/tbl-settings.md` の 表 T-236 の `S-326`、記号を同表の `S-327` で塗ること（MUST）'
const FR_133_SHAPE = '状態の区別を色だけに頼ってはならない（MUST NOT） —— 表 T-315 の記号の形でも分けること。'
const FR_133_CLOSE = '⭐ `!!`（`DG-3`）と `!`（`DG-4`）は色が近い（ともに黄の系統） —— 見分けは記号の形が担う。'
const NFR_007_TEXT = '`GRS` は、文字について 4.5 : 1、図形と操作できる要素について 3 : 1 のコントラスト比を満たすこと'

type Theme = 'light' | 'dark'
const THEMES: readonly Theme[] = ['light', 'dark']
const THEME_COLUMN: Record<Theme, string> = { light: '明るいテーマ', dark: '暗いテーマ' }

const cellOf = (table: string, id: string, heading: string): string => {
  const row = specTable(table).rows.find((one) => one.id === id)
  const cell = row?.by[heading]
  if (cell === undefined) throw new Error(`table ${table} has no cell ${id} / ${heading}`)
  return cell
}
const colourOf = (id: string, theme: Theme): string => {
  const cell = cellOf('T-236', id, THEME_COLUMN[theme])
  const same = /(S-\d+[a-z]?)`?\s*に同じ/.exec(cell)
  if (same !== null) return colourOf(same[1] as string, theme)
  const hex = /#[0-9a-fA-F]{6}/.exec(cell)
  if (hex === null) throw new Error(`no colour in ${id}: ${cell}`)
  return hex[0].toLowerCase()
}
const settingIdOf = (cell: string): string => {
  const found = /S-\d+[a-z]?/.exec(cell)
  if (found === null) throw new Error(`no setting id in ${cell}`)
  return found[0]
}
type DgRow = 'DG-1' | 'DG-2' | 'DG-3' | 'DG-4'
const DG_ROWS: readonly DgRow[] = ['DG-1', 'DG-2', 'DG-3', 'DG-4']
const groundIdOf = (row: DgRow): string => settingIdOf(cellOf('T-315', row, '地'))
const inkIdOf = (row: DgRow): string => settingIdOf(cellOf('T-315', row, '記号'))
const defaultOf = (id: string): number => Number(/-?\d+(?:\.\d+)?/.exec(bare(cellOf('T-201', id, '既定値')))?.[0] ?? 'NaN')
const S_24 = defaultOf('S-24')
// WHY: S-24 and S-22 are both scaled by the display ratio; S-22's drawn size names the ratio without a copy of it.
const drawnEdgeWidth = (stage: Stage): number => (S_24 * drawnSettingsOf(stage.settings).markerSize) / defaultOf('S-22')

const luminanceOf = (hex: string): number => {
  const channel = (at: number): number => {
    const c = parseInt(hex.slice(at, at + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5)
}
const contrastOf = (a: string, b: string): number => {
  const [hi, lo] = [luminanceOf(a), luminanceOf(b)].sort((x, y) => y - x) as [number, number]
  return (hi + 0.05) / (lo + 0.05)
}

const DIAGNOSED: Record<Exclude<DgRow, 'DG-4'>, number> = { 'DG-1': 1, 'DG-2': 2, 'DG-3': 3 }
const UID_OF: Record<DgRow, number> = { ...DIAGNOSED, 'DG-4': 4 }
const DONE = 5
const SUSPENDED = 6

interface Stage {
  readonly schedule: Schedule
  readonly settings: DocumentSettings
  readonly regions: ScreenRegions
  readonly layout: ScheduleLayout
  readonly geometry: ScheduleGeometry
}

function stageOf(monochrome: boolean): Stage {
  const rows = [1, 2, 3, 4, 5, 6].map((uid) => ({ id: `g${uid}`, parentId: null }))
  const raw = rowDocument(rows, { progressMarkerVisible: true, themePreference: 'light', themeMonochrome: monochrome })
  raw.schedule.project.statusDate = '2026-05-08T17:00:00'
  const late = { start: '2026-04-06T08:00:00', finish: '2026-04-24T17:00:00' }
  raw.schedule.tasks = [
    taskOf(1, late),
    taskOf(2, late),
    taskOf(3, late),
    taskOf(4, late),
    taskOf(DONE, { ...late, actualStart: late.start, actualFinish: late.finish, percentComplete: 100 }),
    taskOf(SUSPENDED, { ...late, finish: '2026-06-19T17:00:00', actualStart: late.start, percentComplete: 10, resumeValid: false }),
  ]
  const decoded = documentFromJson(JSON.stringify(raw))
  if (!decoded.ok) throw new Error(`the stage does not decode: ${JSON.stringify(decoded.faults)}`)
  const schedule = decoded.document.schedule
  const settings = decoded.document.documentSettings
  const regions = regionsFromScreen({ ...SCREEN, propertyPanelWidth: 0 }, settings)
  const layout = layoutFromSchedule(schedule, settings, regions)
  const shown = {
    shown: true,
    symbolByUid: new Map(Object.entries(DIAGNOSED).map(([row, uid]) => [uid, row as Exclude<DgRow, 'DG-4'>])),
  }
  const geometry = geometryFromLayout(schedule, settings, layout, regions, emptySelection(), null, shown)
  return { schedule, settings, regions, layout, geometry }
}

const COLOURED = stageOf(false)
const GREY = stageOf(true)

function pictureOf(stage: Stage, theme: Theme): string {
  return svgFromSchedule(stage.schedule, stage.settings, stage.layout, stage.geometry, stage.regions, emptySelection(), 'screen', {
    themePreference: theme,
    guideCursorMode: 'none',
  })
}

interface Mark {
  readonly symbol: string
  readonly disc: string
  readonly symbolShapes: readonly string[]
}

function markOf(stage: Stage, theme: Theme, uid: number): Mark {
  const task = stage.geometry.tasks.find((one) => one.taskUid === uid)
  const marker = task?.marker
  if (marker === undefined || marker === null) throw new Error(`task ${uid} draws no marker`)
  const key = new RegExp(`data-figure="task-${uid}-marker(?:-[^"]*)?"`)
  const shapes = [...pictureOf(stage, theme).matchAll(/<(circle|line|path|polyline|polygon|rect)\b[^>]*>/g)]
    .map((one) => one[0])
    .filter((one) => key.test(one))
  const isDisc = (shape: string): boolean =>
    shape.startsWith('<circle') && Math.abs(attr(shape, 'r') - marker.radius) < 0.01 &&
    Math.abs(attr(shape, 'cx') - marker.centre.x) < 0.01
  const disc = shapes.find(isDisc)
  if (disc === undefined) throw new Error(`task ${uid}: no disc among ${shapes.join('')}`)
  return { symbol: marker.symbol, disc, symbolShapes: shapes.filter((one) => one !== disc) }
}

const attr = (shape: string, name: string): number => Number(new RegExp(`\\b${name}="([^"]+)"`).exec(shape)?.[1] ?? 'NaN')
const paintOf = (shape: string, name: 'fill' | 'stroke'): string =>
  (new RegExp(`\\b${name}="([^"]+)"`).exec(shape)?.[1] ?? 'none').toLowerCase()

describe('CR-616 -- the clauses read here are still in the specification', () => {
  it('FR-013, FR-133 and NFR-007 still say what the cases below read', () => {
    for (const clause of [FR_013_EDGE, FR_013_DELAY, FR_133_SHAPE, FR_133_CLOSE, NFR_007_TEXT]) {
      expect(REQUIREMENTS, clause).toContain(clause)
    }
  })

  it('premise: the stage draws DG-1 .. DG-4, PM-2 and PM-3 where it means to', () => {
    // WHY: T-315 makes DG-4 the PM-4 mark itself, so the geometry names it PM-4.
    for (const row of DG_ROWS) expect(markOf(COLOURED, 'light', UID_OF[row]).symbol, row).toBe(row === 'DG-4' ? 'PM-4' : row)
    expect(markOf(COLOURED, 'light', DONE).symbol).toBe('PM-2')
    expect(markOf(COLOURED, 'light', SUSPENDED).symbol).toBe('PM-3')
  })
})

describe('FR-013 (CR-616 E-10) -- the edge of every DG mark is the colour of its symbol, S-24 thick', () => {
  for (const theme of THEMES) {
    it(`DG-1 .. DG-4 (${theme}): one edge colour for the four states, the S-327 value`, () => {
      const edges = DG_ROWS.map((row) => paintOf(markOf(COLOURED, theme, UID_OF[row]).disc, 'stroke'))
      expect(new Set(edges).size, edges.join(' ')).toBe(1)
      expect(edges[0]).toBe(colourOf('S-327', theme))
    })

    for (const row of DG_ROWS) {
      it(`${row} (${theme}): the edge is the ${inkIdOf(row)} value, as wide as S-24`, () => {
        const mark = markOf(COLOURED, theme, UID_OF[row])
        expect(paintOf(mark.disc, 'stroke')).toBe(colourOf(inkIdOf(row), theme))
        expect(attr(mark.disc, 'stroke-width')).toBeCloseTo(drawnEdgeWidth(COLOURED), 1)
      })

      it(`${row} (${theme}): the symbol is painted in the S-327 value and nothing else`, () => {
        const ink = colourOf('S-327', theme)
        const mark = markOf(COLOURED, theme, UID_OF[row])
        expect(mark.symbolShapes.length, mark.disc).toBeGreaterThan(0)
        for (const shape of mark.symbolShapes) {
          expect([ink, 'none'], shape).toContain(paintOf(shape, 'fill'))
          expect([ink, 'none'], shape).toContain(paintOf(shape, 'stroke'))
        }
      })
    }

    for (const row of ['DG-1', 'DG-2', 'DG-3'] as const) {
      it(`${row} (${theme}): the disc is filled with the ${groundIdOf(row)} value (T-236, T-315)`, () => {
        expect(paintOf(markOf(COLOURED, theme, UID_OF[row]).disc, 'fill')).toBe(colourOf(groundIdOf(row), theme))
      })
    }

    it(`PM-2 and PM-3 (${theme}): the edge follows the same rule, the S-161 symbol colour`, () => {
      for (const uid of [DONE, SUSPENDED]) {
        const mark = markOf(COLOURED, theme, uid)
        expect(paintOf(mark.disc, 'stroke'), mark.symbol).toBe(colourOf('S-161', theme))
        expect(attr(mark.disc, 'stroke-width'), mark.symbol).toBeCloseTo(drawnEdgeWidth(COLOURED), 1)
      }
    })
  }
})

describe('FR-133 (CR-616 E-13) -- in monochrome (FR-041) the close colours are told apart by shape', () => {
  const shapeOf = (row: DgRow): string =>
    markOf(GREY, 'light', UID_OF[row]).symbolShapes.map((one) => /^<([a-z]+)/.exec(one)?.[1] ?? '').join(' ')

  it('DG-2, DG-3 and DG-4 draw three different symbol shapes', () => {
    const shapes = (['DG-2', 'DG-3', 'DG-4'] as const).map(shapeOf)
    expect(new Set(shapes).size, shapes.join(' | ')).toBe(3)
  })

  it('control: monochrome is on -- the DG-3 ground is drawn grey', () => {
    const fill = paintOf(markOf(GREY, 'light', UID_OF['DG-3']).disc, 'fill')
    expect(fill).not.toBe(colourOf('S-385', 'light'))
  })
})

describe('T-236 (CR-616 decision 3) -- S-398 stays apart from S-387', () => {
  it('S-398 is not the S-387 value in either theme, and reads at the NFR-007 text ratio on the light ground', () => {
    const textRatio = Number(/文字について ([\d.]+) : 1/.exec(NFR_007_TEXT)?.[1] ?? 'NaN')
    for (const theme of THEMES) expect(colourOf('S-398', theme), theme).not.toBe(colourOf('S-387', theme))
    expect(contrastOf(colourOf('S-398', 'light'), colourOf('S-146', 'light'))).toBeGreaterThanOrEqual(textRatio)
  })
})
