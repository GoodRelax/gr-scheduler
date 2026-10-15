// CR-755 (spec-only): FR-017 prints each clock row's time zone abbreviation right-aligned in the blank over the Task Group Panel, on screen, in the DOM and in the exported picture; the abbreviation never changes with the season.

import { afterEach, describe, expect, it } from 'vitest'

import { exportSvg } from '../../src/adapter/image-exporter/image-exporter'
import type { RulerAbbreviation, TaskGroupPanel } from '../../src/adapter/screen-renderer/screen-renderer'
import { rulerAbbreviationsOf } from '../../src/adapter/screen-renderer/task-group-panel'
import { svgFromSchedule } from '../../src/adapter/svg-renderer/svg-renderer'
import {
  SETTINGS_CONSTANTS,
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type { Document } from '../../src/entity/document-model/document/document'
import type { Schedule } from '../../src/entity/document-model/schedule/schedule'
import { instantOf } from '../../src/entity/document-model/schedule/schedule'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import { geometryFromLayout } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import { layoutFromSchedule, xOfInstant, type ScheduleLayout } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import { regionsFromScreen, type ScreenRegions } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { fillTaskGroupTitleTree } from '../../src/framework/dom-screen-surface/task-group-panel-drawing'
import { tooltipAnchorTable } from '../../src/framework/dom-screen-surface/tooltips-drawing'
import { descendants, stage as browserStage, type FakeElement } from '../fixtures/fake-browser'
import { RATIO, SCREEN, notStored, rowOf, scheduleOf, stored, taskOf } from '../unit/cr-430-cross-section-scene'
import { REQUIREMENTS, expectedAbbreviationOf } from './cr-755-stage'
import { documentOf, restoreAnimationFrames, shiftStage } from './cr-757-stage'
import { bare } from './spec-table'

afterEach(restoreAnimationFrames)

// see FR-017
const FR_017_ZONE_ROWS =
  '表示するタイムゾーン（`FR-156`）は、時刻を表示しているあいだ、目盛の帯の下に 1 つにつき 1 段を足して刷ること（MUST）'
const FR_017_ABBREVIATION =
  '時刻を表示しているあいだ、見せる基準の時の行（表 T-238 の `TM-5` の 2 行目、目盛が時の段のときだけ）と、表示するタイムゾーンの各段について、その段の左の、タスクグループパネルの上の空欄に、そのタイムゾーンの略称（`FR-156` の 表 T-376 の行が持つ 1 つ）を右寄せで刷ること（MUST）'
const FR_017_FIXED = '略称は行ごとに決まっていて、見えている日や季節で変わらない（利用者の判断）。'
const FR_017_NO_ABBREVIATION =
  '略称を持たない行は、`FR-038` の辞書の `timeZoneField` の `offsetName` の形で、その行の UTC の差を刷る（分が 0 なら時だけ）。'
const FR_017_FONT_AND_EDGE =
  '字は目盛のラベルと同じ大きさと色とし、右端はタスクグループパネルの右端から `_assets/tbl-settings.md` の 表 T-206 の `S-313` 内側とする。'
const FR_017_BELOW_HEAD = '略称を刷る段は 2 段目より下なので重ならない。'
const FR_017_PICTURE = '書き出す絵（`FR-025`）にも刷る（表 T-076 の `EP-2`・`EP-3`）。'

describe('FR-017 -- the manuscript these cases are built from still reads as quoted', () => {
  it.each([FR_017_ZONE_ROWS, FR_017_ABBREVIATION, FR_017_FIXED, FR_017_NO_ABBREVIATION, FR_017_FONT_AND_EDGE, FR_017_BELOW_HEAD, FR_017_PICTURE])(
    '%s',
    (clause) => {
      expect(REQUIREMENTS).toContain(clause)
    },
  )
})

// see S-8, S-577, S-578, T-205
const PX_SCALE = ((SETTINGS_DEFAULTS['rulerFont'] as number) * RATIO) / stored('S-8')
const thresholdOf = (id: string): number => Number(bare(rowOf('T-205', id).by['既定'] ?? ''))
const S_577 = thresholdOf('S-577')
const S_578 = thresholdOf('S-578')
// WHY: inside the day tier, and wide inside the hour tier where every hour carries its number.
const DAY_TIER = S_577 / 2
const HOUR_TIER = S_578 * 1.25
// see S-313
const S_313 = notStored('S-313')

const WEEKDAY_WORDS = ['日', '月', '火', '水', '木', '金', '土']

interface Scene {
  readonly regions: ScreenRegions
  readonly schedule: Schedule
  readonly settings: DocumentSettings
  readonly layout: ScheduleLayout
  readonly svg: string
}

interface SceneWish {
  readonly width: number
  readonly shows?: boolean
  readonly data?: string
  readonly view?: string | null
  readonly display?: readonly string[]
  readonly day?: string
}

function sceneOf(wish: SceneWish): Scene {
  const day = wish.day ?? '2026-01-05'
  const settings = {
    ...SETTINGS_DEFAULTS,
    zoomX: (wish.width * PX_SCALE) / (SETTINGS_CONSTANTS.pxPerDayAt1x * RATIO),
    scrollDate: `${day}T00:00:00`,
    stackDirection: 'down',
    showsTimeOfDay: wish.shows ?? true,
    viewTimeZone: wish.view ?? null,
    displayTimeZones: wish.display ?? [],
  } as unknown as DocumentSettings
  const base = scheduleOf({ tasks: [taskOf({ uid: 1, name: 'a', start: `${day}T08:00:00`, finish: `${day}T17:00:00` })] }) as unknown as Record<
    string,
    any
  >
  const schedule = { ...base, project: { ...base['project'], scheduleDataTimeZone: wish.data ?? 'UTC-08:00' } } as unknown as Schedule
  const regions = regionsFromScreen(SCREEN, settings)
  const layout = layoutFromSchedule(schedule, settings, regions)
  const geometry = geometryFromLayout(schedule, settings, layout, regions, emptySelection(), null)
  const svg = svgFromSchedule(schedule, settings, layout, geometry, regions, emptySelection(), 'screen', {
    themePreference: 'light',
    guideCursorMode: 'none',
  } as never, null, WEEKDAY_WORDS)
  return { regions, schedule, settings, layout, svg }
}

const abbreviationsOf = (scene: Scene, language: 'ja' | 'en' = 'ja'): readonly RulerAbbreviation[] =>
  rulerAbbreviationsOf(scene.regions, scene.schedule, scene.settings, language)
const textsOf = (scene: Scene): readonly string[] => abbreviationsOf(scene).map((one) => one.text)

const elementOf = (svg: string, figure: string): string | null =>
  new RegExp(`<[a-z]+ [^>]*data-figure="${figure}"[^>]*>`).exec(svg)?.[0] ?? null
const attrOf = (element: string, name: string): string | null => new RegExp(`(?:^|\\s)${name}="([^"]*)"`).exec(element)?.[1] ?? null
const NEAR = 0.01

// see FR-017, FR-156, TM-5, S-574, S-575
describe(`FR-017 -- ${FR_017_ABBREVIATION}`, () => {
  it('at the hour tier: the view base hour row prints the base abbreviation, then each display zone row its own, top to bottom', () => {
    const scene = sceneOf({ width: HOUR_TIER, display: ['UTC+09:00', 'UTC-07:00 DST'] })
    expect(scene.layout.tier, 'premise: the hour tier').toBe('dayHour')
    expect(textsOf(scene)).toEqual(['PST', 'JST', 'PDT'])
    const tops = abbreviationsOf(scene).map((one) => one.box.y)
    expect([...tops].sort((a, b) => a - b)).toEqual(tops)
  })

  it('off the hour tier: only the display zone rows print, the base prints nothing', () => {
    const scene = sceneOf({ width: DAY_TIER, display: ['UTC+09:00', 'UTC-07:00 DST'] })
    expect(scene.layout.tier, 'premise: not the hour tier').not.toBe('dayHour')
    expect(textsOf(scene)).toEqual(['JST', 'PDT'])
  })

  it('the base row reads the view base (S-574) when one is set, not the schedule data zone', () => {
    expect(textsOf(sceneOf({ width: HOUR_TIER, view: 'UTC+09:00' }))).toEqual(['JST'])
    expect(textsOf(sceneOf({ width: HOUR_TIER, data: 'UTC+05:30' }))).toEqual(['IST'])
  })

  it('while time of day is not shown nothing is printed, display zones or not', () => {
    expect(abbreviationsOf(sceneOf({ width: HOUR_TIER, shows: false, display: ['UTC+09:00'] }))).toEqual([])
    expect(abbreviationsOf(sceneOf({ width: DAY_TIER, shows: false, display: ['UTC+09:00'] }))).toEqual([])
  })

  it(`${FR_017_NO_ABBREVIATION} -- UTC-12:00 prints UTC-12, in both languages`, () => {
    const scene = sceneOf({ width: DAY_TIER, display: ['UTC-12:00'] })
    expect(abbreviationsOf(scene, 'ja').map((one) => one.text)).toEqual([expectedAbbreviationOf('UTC-12:00', 'ja')])
    expect(abbreviationsOf(scene, 'en').map((one) => one.text)).toEqual(['UTC-12'])
  })
})

// see FR-017, FR-156
describe(`FR-017 -- ${FR_017_FIXED}`, () => {
  it.each([
    ['January', '2026-01-05'],
    ['April', '2026-04-06'],
    ['August', '2026-08-03'],
    ['November', '2026-11-02'],
  ])('in %s the rows print PST, JST, PDT, MST and MDT', (_month, day) => {
    const scene = sceneOf({ width: HOUR_TIER, day, display: ['UTC+09:00', 'UTC-07:00 DST', 'UTC-07:00', 'UTC-06:00 DST'] })
    expect(textsOf(scene)).toEqual(['PST', 'JST', 'PDT', 'MST', 'MDT'])
  })

  it.each([
    ['January', '2026-01-05'],
    ['August', '2026-08-03'],
  ])('in %s the PDT row numbers the hour of a data-zone 08:00 PST (16:00 UTC) as 9: UTC-7 all year', (_month, day) => {
    const scene = sceneOf({ width: HOUR_TIER, day, display: ['UTC-07:00 DST'] })
    const x = xOfInstant(scene.layout, instantOf(`${day}T08:00:00`) as number)
    const labels = [...scene.svg.matchAll(/<text [^>]*data-figure="ruler-zone-0-label-[^"]*"[^>]*>([^<]*)<\/text>/g)]
    const at = labels.find((one) => Math.abs(Number(attrOf(one[0], 'x')) - x) < NEAR)
    expect(at?.[1], 'a number on the PDT row at that hour').toBe('9')
  })
})

// see FR-017, S-313, T-206
describe(`FR-017 -- ${FR_017_FONT_AND_EDGE}`, () => {
  const scene = sceneOf({ width: HOUR_TIER, display: ['UTC+09:00', 'UTC-07:00 DST'] })
  const panel = scene.regions.taskGroupPanel
  const shown = abbreviationsOf(scene)

  it('every box ends S-313 inside the right edge of the Task Group Panel and starts at or right of its left edge', () => {
    expect(shown.length).toBe(3)
    for (const one of shown) {
      expect(one.box.x + one.box.width, one.text).toBeCloseTo(panel.x + panel.width - S_313, 6)
      expect(one.box.x, one.text).toBeGreaterThanOrEqual(panel.x - NEAR)
    }
  })

  it.each([0, 1])('display zone row %i: the box is the drawn row (its top rule) and the text sits on its labels, at their size', (index) => {
    const one = shown[index + 1] as RulerAbbreviation
    const rule = elementOf(scene.svg, `ruler-zone-${String(index)}-rule`)
    expect(rule, 'premise: the zone row is drawn').not.toBeNull()
    expect(one.box.y).toBeCloseTo(Number(attrOf(rule ?? '', 'y1')), 1)
    const label = new RegExp(`<text [^>]*data-figure="ruler-zone-${String(index)}-label-[^"]*"[^>]*>`).exec(scene.svg)?.[0] ?? ''
    expect(label, 'premise: the zone row carries labels').not.toBe('')
    expect(one.baseline).toBeCloseTo(Number(attrOf(label, 'y')), 1)
    expect(one.fontPx).toBeCloseTo(Number(attrOf(label, 'font-size')), 1)
  })

  it(`${FR_017_BELOW_HEAD} -- no box reaches into the top row of the ruler band, and the boxes do not overlap`, () => {
    const band = scene.regions.timeRuler
    const rowHeight = (shown[1] as RulerAbbreviation).box.height
    for (const one of shown) expect(one.box.y, one.text).toBeGreaterThanOrEqual(band.y + rowHeight - NEAR)
    for (let i = 1; i < shown.length; i += 1) {
      const above = shown[i - 1] as RulerAbbreviation
      expect(above.box.y + above.box.height).toBeLessThanOrEqual((shown[i] as RulerAbbreviation).box.y + NEAR)
    }
    const last = shown[shown.length - 1] as RulerAbbreviation
    expect(last.box.y + last.box.height).toBeLessThanOrEqual(band.y + band.height + NEAR)
  })
})

// see FR-017, U-22
describe('FR-017 -- the DOM prints each abbreviation right-aligned in its box', () => {
  const ABBREVIATIONS: readonly RulerAbbreviation[] = [
    { text: 'PST', box: { x: 0, y: 30, width: 296, height: 23 }, baseline: 48, fontPx: 21 },
    { text: 'JST', box: { x: 0, y: 53, width: 296, height: 23 }, baseline: 71, fontPx: 21 },
  ]

  it('one element per abbreviation, marked, holding the text, at the box and the size, pushed to the right', () => {
    const built = browserStage()
    const root = built.host.createElement('div') as unknown as FakeElement
    const tree = built.host.createElement('div') as unknown as FakeElement
    root.append(tree)
    const table = tooltipAnchorTable(root as unknown as HTMLElement)
    const panel = { pinnedTitles: [], titles: [], rulerAbbreviations: ABBREVIATIONS } as unknown as TaskGroupPanel
    fillTaskGroupTitleTree(built.host, tree as unknown as HTMLElement, panel, table.anchorsOf('Task Group Title Tree'))
    const marked = descendants(tree).filter((one) => one.getAttribute('data-ruler-abbreviation') !== null)
    expect(marked.map((one) => one.textContent)).toEqual(['PST', 'JST'])
    for (const [index, one] of marked.entries()) {
      const style = one.getAttribute('style') ?? ''
      const wish = ABBREVIATIONS[index] as RulerAbbreviation
      expect(style).toMatch(/justify-content:flex-end/)
      expect(style).toContain(`font-size:${String(wish.fontPx)}px`)
      expect(style).toContain(`top:${String(wish.box.y)}px`)
    }
  })
})

type Loose = Record<string, unknown>

function withClocks(document: Document, settings: Loose, data = 'UTC-08:00'): Document {
  return {
    ...document,
    schedule: { ...document.schedule, project: { ...document.schedule.project, scheduleDataTimeZone: data } },
    documentSettings: { ...document.documentSettings, ...settings },
  } as unknown as Document
}

const BENCH = (): Document => documentOf({ tasks: [{ uid: 1, name: 'Kickoff', start: '2028-04-03T08:00:00', finish: '2028-04-03T17:00:00' }] })

// see FR-017, EP-2, EP-3, FR-025
describe(`FR-017 -- the screen view and the exported picture: ${FR_017_PICTURE}`, () => {
  it('the screen view carries no abbreviations while time of day is hidden', async () => {
    const built = await shiftStage(withClocks(BENCH(), { showsTimeOfDay: false, displayTimeZones: ['UTC+09:00'] }))
    expect(built.lastView().taskGroupPanel.rulerAbbreviations).toBeUndefined()
  })

  it('the screen view carries the display zone abbreviations while time of day is shown', async () => {
    const built = await shiftStage(withClocks(BENCH(), { showsTimeOfDay: true, displayTimeZones: ['UTC+09:00', 'UTC-07:00 DST'] }))
    const texts = (built.lastView().taskGroupPanel.rulerAbbreviations ?? []).map((one) => one.text)
    expect(texts.slice(-2)).toEqual(['JST', 'PDT'])
  })

  it('the exported SVG prints each abbreviation right-anchored at its box', async () => {
    const built = await shiftStage(withClocks(BENCH(), { showsTimeOfDay: true, displayTimeZones: ['UTC+09:00', 'UTC-07:00 DST'] }))
    const view = built.lastView()
    const settings = { ...SETTINGS_DEFAULTS, showsTimeOfDay: true } as unknown as DocumentSettings
    const picture = exportSvg({
      svg: '',
      regions: regionsFromScreen(SCREEN, settings),
      screenView: view,
      settings,
      themePreference: 'light',
      themeHue: 214,
    })
    expect(picture.ok).toBe(true)
    if (!picture.ok) return
    for (const text of ['JST', 'PDT']) {
      expect(picture.svg, text).toMatch(new RegExp(`<text text-anchor="end"[^>]*>${text}</text>`))
    }
  })
})
