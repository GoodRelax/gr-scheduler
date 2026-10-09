// Pins CR-584 section 8 at its seams: the ruler tiers S-83 / S-84 (FR-017, T-205) and the exported picture (IX-10, EP-1).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { exportSvg, type ExportScene, type SvgExport } from '../../src/adapter/image-exporter/image-exporter'
import type {
  AppHeaderItems,
  TaskGroupPanel,
  ScreenFrame,
  ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'
import { colourOf } from '../../src/adapter/svg-renderer/svg-renderer'
import {
  SETTINGS_CONSTANTS,
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import { rulerTierOf, type RulerTier } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import {
  regionsFromScreen,
  type ScreenEnvironment,
} from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { specTable } from './spec-table'
import { DEFAULT_DISPLAY_RATIO, DEFAULT_DISPLAY_SCALE, S_235 } from '../fixtures/display-scale'
import { settingDefaultOf } from '../fixtures/setting-default'

const MANUSCRIPT: unknown = JSON.parse(
  readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'settings.json'), 'utf8'),
)

interface ManuscriptRow {
  readonly id: string
  readonly default?: { readonly num?: string; readonly pair?: readonly string[] }
  readonly light?: { readonly colour?: string }
}

// see T-201, T-204, T-205, T-206, T-236
const manuscriptRowOf = (id: string): ManuscriptRow => {
  const found: ManuscriptRow[] = []
  const walk = (one: unknown): void => {
    if (Array.isArray(one)) {
      for (const inner of one) walk(inner)
      return
    }
    if (one === null || typeof one !== 'object') return
    if ((one as { id?: unknown }).id === id && ('default' in one || 'light' in one)) found.push(one as ManuscriptRow)
    for (const inner of Object.values(one)) walk(inner)
  }
  walk(MANUSCRIPT)
  if (found.length !== 1) throw new Error(`settings.json holds ${found.length} rows ${id}, not one`)
  return found[0] as ManuscriptRow
}

const manuscriptNumberOf = (id: string): number => {
  const value = Number(manuscriptRowOf(id).default?.num ?? NaN)
  if (!Number.isFinite(value)) throw new Error(`settings.json row ${id} states no number`)
  return value
}

// see S-8
const S_8 = manuscriptNumberOf('S-8')
// see S-30
const S_30 = manuscriptNumberOf('S-30')
// see S-33
const S_33 = manuscriptNumberOf('S-33')
// see S-83
const S_83 = manuscriptNumberOf('S-83')
// see S-84
const S_84 = manuscriptNumberOf('S-84')
// see S-135
const S_135 = manuscriptNumberOf('S-135')
// see S-225
const S_225 = manuscriptNumberOf('S-225')
// see S-73
const THEME_HUE = Number(settingDefaultOf('themeHue') ?? NaN)
// see S-81
const [S_81_WIDTH, S_81_HEIGHT] = (manuscriptRowOf('S-81').default?.pair ?? []).map(Number) as [number, number]

// see FR-093
const labelUnitsOf = (label: string): number =>
  [...label].reduce((sum, one) => sum + ((one.codePointAt(0) ?? 0) > 0xff ? 2 : 1), 0)

// see FR-093, T-205
const widestLabelWidthOf = (labels: readonly string[]): number =>
  Math.max(...labels.map(labelUnitsOf)) * S_8 * S_30 + S_135

const MONTHS = Array.from({ length: 12 }, (_one, index) => String(index + 1))
const DAYS_OF_MONTH = Array.from({ length: 31 }, (_one, index) => String(index + 1))
const DAYS_PER_WEEK = 7
const MS_PER_DAY = 86400000
const YEAR_WITHOUT_LEAP_DAY = 2026
const monthLengths = MONTHS.map(
  (_one, index) =>
    (Date.UTC(YEAR_WITHOUT_LEAP_DAY, index + 1, 1) - Date.UTC(YEAR_WITHOUT_LEAP_DAY, index, 1)) / MS_PER_DAY,
)
const SHORTEST_MONTH = Math.min(...monthLengths)
const AVERAGE_MONTH = monthLengths.reduce((sum, one) => sum + one, 0) / monthLengths.length

const TIER_OF_ROW: Readonly<Record<string, RulerTier>> = {
  'TM-1': 'year',
  'TM-2': 'yearMonth',
  'TM-3': 'yearMonthWeek',
  'TM-4': 'yearMonthDayWeekday',
}

const SETTINGS = ((): DocumentSettings => {
  const heads = new Set(Object.keys(SETTINGS_DEFAULTS).map((key) => key.split('.')[0] as string))
  const built: Record<string, unknown> = {}
  for (const head of heads) built[head] = settingDefaultOf(head)
  built['displayScale'] = DEFAULT_DISPLAY_SCALE
  return built as unknown as DocumentSettings
})()

// see FR-017, DS-1
const AT_A_12PX_RULER: DocumentSettings = { ...SETTINGS, rulerFont: S_8 / DEFAULT_DISPLAY_RATIO }

const JUST_UNDER = 1 - 1e-9

describe('FR-017 with table T-205 -- S-83 and S-84 are the edges where the label fits (CR-584 T1, T2)', () => {
  it('the manuscript values reach the built constants (rule 04 section 2: change one value, a test goes red)', () => {
    expect(SETTINGS_CONSTANTS.rulerTierPxPerDayMonth, 'S-83 (MUST) "the thresholds are fixed values"').toBe(S_83)
    expect(SETTINGS_CONSTANTS.rulerTierPxPerDayWeek, 'S-84 (MUST) "the thresholds are fixed values"').toBe(S_84)
    expect(SETTINGS_CONSTANTS.fontMin, 'FR-017 (MUST) "this 12 agrees with S-8"').toBe(S_8)
  })

  it('walks table T-238: every tier row has one tier the ruler can fall in', () => {
    expect(specTable('T-238').rows.map((row) => row.id), 'T-238: the row ID is the name of the tier').toEqual(
      Object.keys(TIER_OF_ROW),
    )
  })

  it('at a 12px ruler, exactly S-83 px/day is the month tier TM-2 and just under it is the year tier TM-1', () => {
    expect(
      AT_A_12PX_RULER.rulerFont * DEFAULT_DISPLAY_RATIO,
      'FR-017: the effective font size is the drawn rulerFont (DS-1), here S-8',
    ).toBeCloseTo(S_8, 12)
    expect(
      rulerTierOf(S_83, AT_A_12PX_RULER),
      'FR-017 (MUST) "pxPerDay / (effective font size / S-8) >= threshold": S-83 itself opens TM-2',
    ).toBe(TIER_OF_ROW['TM-2'])
    expect(
      rulerTierOf(S_83 * JUST_UNDER, AT_A_12PX_RULER),
      'FR-017 (MUST) "a label that does not fit one tick puts the tier one coarser": under S-83 is TM-1',
    ).toBe(TIER_OF_ROW['TM-1'])
  })

  it('at a 12px ruler, exactly S-84 px/day is the week tier TM-3 and just under it is the month tier TM-2', () => {
    expect(
      rulerTierOf(S_84, AT_A_12PX_RULER),
      'FR-017 (MUST) "pxPerDay / (effective font size / S-8) >= threshold": S-84 itself opens TM-3',
    ).toBe(TIER_OF_ROW['TM-3'])
    expect(
      rulerTierOf(S_84 * JUST_UNDER, AT_A_12PX_RULER),
      'FR-017 (MUST) "a label that does not fit one tick puts the tier one coarser": under S-84 is TM-2',
    ).toBe(TIER_OF_ROW['TM-2'])
  })

  it('S-83 is the width of the widest month label plus S-135 over the shortest month, not over the average one', () => {
    const label = widestLabelWidthOf(MONTHS)
    expect(
      SHORTEST_MONTH * S_83,
      'T-205 note: "the threshold is the edge where neighbouring labels fit the shortest tick" -- 28 days at S-83 holds the label',
    ).toBeGreaterThanOrEqual(label)
    expect(
      S_83,
      'FR-017 (MUST) "the threshold is that edge": S-83 = (widest m label + S-135) / the shortest month, no coarser',
    ).toBeCloseTo(label / SHORTEST_MONTH, 12)
    const averaged = label / AVERAGE_MONTH
    expect(
      SHORTEST_MONTH * averaged,
      'T-205 note: "derived over the 30.4-day average, the labels overlap in February"',
    ).toBeLessThan(label)
  })

  it('S-84 is the width of the widest week-start day label plus S-135 over seven days', () => {
    const label = widestLabelWidthOf(DAYS_OF_MONTH)
    expect(
      S_84,
      'FR-017 (MUST) "the threshold is that edge": S-84 = (widest d label + S-135) / 7 days',
    ).toBeCloseTo(label / DAYS_PER_WEEK, 12)
  })
})

const TITLE = 'Plan of record'

const VIEW: ScreenView = {
  language: 'en',
  frame: { isFullScreen: false, dividers: [], scrollbars: [] } as unknown as ScreenFrame,
  appHeaderItems: {
    documentTitle: TITLE,
    openedFileName: null,
    fileSavedAt: null,
    fileSavedByteLength: null,
    fileNeverSavedText: '',
    commands: [],
    language: 'en',
  } as AppHeaderItems,
  taskGroupPanel: { pinnedTitles: [], titles: [] } as unknown as TaskGroupPanel,
  propertiesPanel: null,
  commandPalette: null,
  openModal: null,
  notices: [],
  confirmation: null,
  dialogueField: null,
  tooltips: [],
}

interface Screen {
  readonly width: number
  readonly height: number
  readonly appHeaderHeight: number
  readonly why: string
}

const sceneOn = (screen: Screen, themePreference: ExportScene['themePreference']): ExportScene => {
  const env: ScreenEnvironment = {
    width: screen.width,
    height: screen.height,
    appHeaderHeight: screen.appHeaderHeight,
    scrollbarThickness: 8,
    propertyPanelWidth: 0,
  }
  return {
    svg: '<svg xmlns="http://www.w3.org/2000/svg"></svg>',
    regions: regionsFromScreen(env, SETTINGS),
    screenView: VIEW,
    settings: SETTINGS,
    themePreference,
    themeHue: THEME_HUE,
  }
}

const pictureOrThrow = (answer: SvgExport): Extract<SvgExport, { readonly ok: true }> => {
  if (!answer.ok) throw new Error(`exportSvg refused a fixture under S-217: ${answer.fault.reason}`)
  return answer
}

interface Tag {
  readonly tag: string
  readonly attrs: Readonly<Record<string, string>>
}

const attrsOf = (source: string): Record<string, string> =>
  Object.fromEntries([...source.matchAll(/([A-Za-z_:][-A-Za-z0-9_:.]*)="([^"]*)"/g)].map((hit) => [hit[1], hit[2]]))

// see IX-10
const firstDrawnInsideTheClip = (svg: string): Tag => {
  const clipId = /<clipPath\b[^>]*\sid="([^"]+)"/.exec(svg)?.[1]
  if (clipId === undefined) throw new Error('the export has no fit clip')
  const opening = new RegExp(`<g\\b[^>]*clip-path="url\\(#${clipId}\\)"[^>]*>`).exec(svg)
  if (opening === null) throw new Error('nothing is drawn under the fit clip')
  const next = /<([A-Za-z][-A-Za-z0-9]*)((?:[^<>"]|"[^"]*")*)\/?>/.exec(svg.slice(opening.index + opening[0].length))
  if (next === null) throw new Error('the fit clip holds nothing')
  return { tag: next[1] ?? '', attrs: attrsOf(next[2] ?? '') }
}

const rootOf = (svg: string): Tag => {
  const root = /<svg\b((?:[^<>"]|"[^"]*")*)>/.exec(svg)
  return { tag: 'svg', attrs: attrsOf(root?.[1] ?? '') }
}

const GROUNDED: readonly Screen[] = [
  { width: S_81_WIDTH, height: 953, appHeaderHeight: 37, why: 'a window on the MC-6 screen, shorter than S-81' },
  { width: S_81_WIDTH, height: 2 * S_81_HEIGHT, appHeaderHeight: 37, why: 'a screen taller than S-81' },
  { width: 1373, height: 773, appHeaderHeight: 37, why: 'the IX-4 example screen' },
]

const THEMES: readonly ExportScene['themePreference'][] = ['light', 'dark']

const GROUND_CASES = GROUNDED.flatMap((screen) => THEMES.map((theme) => ({ ...screen, theme })))

describe('IX-10 -- the blanks of the picture are painted S-146, never left transparent (CR-584 T3, T4)', () => {
  it.each(GROUND_CASES)('$width x $height, $theme theme ($why)', ({ theme, ...screen }) => {
    const picture = pictureOrThrow(exportSvg(sceneOn(screen, theme)))
    const root = rootOf(picture.svg)
    const first = firstDrawnInsideTheClip(picture.svg)
    const ground = colourOf('S-146', THEME_HUE, theme === 'dark', false)

    expect(first.tag, 'IX-10 (MUST) "paint the blanks in S-146" (MUST NOT "leave them transparent"): painted before anything else').toBe(
      'rect',
    )
    expect(
      [first.attrs['x'], first.attrs['y']].map(Number),
      'IX-10 (MUST) "paint the blanks in S-146": the ground starts at the picture origin',
    ).toEqual([0, 0])
    expect(
      [Number(first.attrs['width']), Number(first.attrs['height'])],
      'IX-10 (MUST NOT) "leave them transparent": the ground covers the whole picture, the IX-4 width and height',
    ).toEqual([Number(root.attrs['width']), picture.heightPx])
    expect(first.attrs['fill'], `IX-10 (MUST) "paint the blanks in S-146 of table T-236" (${theme})`).toBe(ground)
    if (theme === 'light') {
      expect(ground, 'T-236 S-146: the light ground is the colour the table writes').toBe(
        manuscriptRowOf('S-146').light?.colour,
      )
    }
  })
})

const TITLED: readonly Screen[] = [
  ...GROUNDED,
  { width: 1100, height: 700, appHeaderHeight: 30, why: 'a narrower band' },
  { width: 2560, height: 1440, appHeaderHeight: 48, why: 'a wider screen and band, ratio under 1' },
]

describe('T-076 EP-1 -- the exported Document Title baseline sits S-225 x S-235 x S-33 below the band centre (CR-584 T6)', () => {
  it.each(TITLED)('$width x $height with a $appHeaderHeight px band ($why)', (screen) => {
    const scene = sceneOn(screen, 'light')
    const ratio = S_81_WIDTH / screen.width
    const band = scene.regions.appHeader
    const text = /<text\b((?:[^<>"]|"[^"]*")*)>([^<]*)<\/text>/.exec(pictureOrThrow(exportSvg(scene)).svg)
    expect(text?.[2], 'EP-1 (MUST) "draw the band and the Document Title"').toBe(TITLE)
    const baseline = Number(attrsOf(text?.[1] ?? '')['y'])
    const wanted = (band.y + band.height / 2 + S_225 * S_235 * S_33) * ratio

    expect(
      Math.abs(baseline - wanted),
      `EP-1 (MUST) "the baseline stands below the band's vertical centre by S-225 x S-235 x S-33", times the FR-080 ratio, to the NS-3 0.01 px grid: wanted ${wanted}, drew ${baseline}`,
    ).toBeLessThanOrEqual(0.005 + 1e-9)
  })
})
