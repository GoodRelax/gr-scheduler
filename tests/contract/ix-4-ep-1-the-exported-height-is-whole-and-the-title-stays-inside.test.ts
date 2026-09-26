// Pins DFC-1143 (FR-025 IX-4 whole export height) and DFC-1144 (T-076 EP-1 title inside its band) at the PI-21 seam.

import { describe, expect, it } from 'vitest'

import {
  exportPng,
  exportSvg,
  type ExportScene,
  type RasterSizePx,
  type Rastering,
  type Rasterizer,
  type SvgExport,
} from '../../src/adapter/image-exporter/image-exporter'
import type {
  AppHeaderItems,
  RowTitlePanel,
  ScreenFrame,
  ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'
import type { DocumentSettings } from '../../src/entity/document-model/document-settings/document-settings'
import { SETTINGS_DEFAULTS } from '../../src/entity/document-model/document-settings/document-settings'
import {
  regionsFromScreen,
  type ScreenEnvironment,
} from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { bare, specTable } from './spec-table'
import { DEFAULT_DISPLAY_SCALE, S_235 } from '../fixtures/display-scale'
import { settingDefaultOf } from '../fixtures/setting-default'

const DEFAULT_COLUMN = String.fromCharCode(0x65e2, 0x5b9a)

const cellOf = (table: string, id: string, heading: string): string => {
  const row = specTable(table).rows.find((one) => one.id === id)
  if (row === undefined) throw new Error(`table ${table} has no row ${id}`)
  return bare(row.by[heading] ?? '').replace(/`/g, '')
}

const numbersIn = (cell: string): number[] =>
  (cell.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number).filter((one) => Number.isFinite(one))

// see S-81
const [S_81_WIDTH, S_81_HEIGHT] = numbersIn(cellOf('T-204', 'S-81', DEFAULT_COLUMN)) as [
  number,
  number,
]
// see S-217
const S_217_CAP = numbersIn(cellOf('T-204', 'S-217', DEFAULT_COLUMN))[0] as number
// see S-225
const S_225 = numbersIn(cellOf('T-206', 'S-225', DEFAULT_COLUMN))[0] as number

const SETTINGS = ((): DocumentSettings => {
  const heads = new Set(Object.keys(SETTINGS_DEFAULTS).map((key) => key.split('.')[0] as string))
  const built: Record<string, unknown> = {}
  for (const head of heads) built[head] = settingDefaultOf(head)
  built['displayScale'] = DEFAULT_DISPLAY_SCALE
  return built as unknown as DocumentSettings
})()

const TITLE = 'Plan of record'

const VIEW: ScreenView = {
  language: 'en',
  frame: { isFullScreen: false, dividers: [], scrollbars: [] } as unknown as ScreenFrame,
  appHeaderItems: {
    documentTitle: TITLE,
    openedFileName: null,
    fileSavedAt: null,
    fileNeverSavedText: '',
    commands: [],
    language: 'en',
  } as AppHeaderItems,
  rowTitlePanel: { pinnedTitles: [], titles: [] } as unknown as RowTitlePanel,
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
  readonly appHeaderHeight?: number
}

const sceneOn = (screen: Screen): ExportScene => {
  const env: ScreenEnvironment = {
    width: screen.width,
    height: screen.height,
    appHeaderHeight: screen.appHeaderHeight ?? 37,
    scrollbarThickness: 8,
  }
  return {
    svg: '<svg xmlns="http://www.w3.org/2000/svg"></svg>',
    regions: regionsFromScreen(env, SETTINGS),
    screenView: VIEW,
    settings: SETTINGS,
    themeHue: 214,
  }
}

const ratioOf = (scene: ExportScene): number => {
  const canvas = scene.regions.scheduleCanvas
  return S_81_WIDTH / (canvas.x + canvas.width)
}

const rawHeightOf = (scene: ExportScene): number => {
  const canvas = scene.regions.scheduleCanvas
  return (canvas.y + canvas.height) * ratioOf(scene)
}

const pictureOrThrow = (answer: SvgExport): Extract<SvgExport, { readonly ok: true }> => {
  if (!answer.ok) throw new Error(`exportSvg refused a fixture under S-217: ${answer.fault.reason}`)
  return answer
}

interface RootSize {
  readonly width: number
  readonly height: number
  readonly viewBoxHeight: number
}

const rootSizeOf = (svg: string): RootSize => {
  const root = /<svg\b[^>]*>/.exec(svg)?.[0] ?? ''
  const attr = (name: string): string => new RegExp(`\\s${name}="([^"]*)"`).exec(root)?.[1] ?? ''
  const box = attr('viewBox').trim().split(/[\s,]+/).map(Number)
  return { width: Number(attr('width')), height: Number(attr('height')), viewBoxHeight: box[3] ?? NaN }
}

interface Watched {
  readonly rasterizer: Rasterizer
  readonly sizes: RasterSizePx[]
}

const watchedRasterizer = (): Watched => {
  const sizes: RasterSizePx[] = []
  return {
    sizes,
    rasterizer: {
      rasterizePng: (_svg: string, sizePx: RasterSizePx): Promise<Rastering> => {
        sizes.push(sizePx)
        return Promise.resolve({ ok: true, pngBytes: Uint8Array.from([0x89, 0x50, 0x4e, 0x47]) })
      },
    },
  }
}

const FITTING: readonly (Screen & { readonly why: string })[] = [
  { width: 1373, height: 773, why: 'the full-screen surface of DFC-1143, raw 900.80' },
  { width: 1536, height: 864, why: 'exactly 16:9, raw 900 exactly' },
  { width: 1366, height: 768, why: 'wider than 16:9, raw 899.56 -- S-81 height is the floor' },
  { width: 1363, height: 668, why: 'the windowed surface of DFC-1143, raw 784.15' },
  { width: 1000, height: 800, why: 'ratio 1.6, raw 1280 exactly' },
  { width: 1100, height: 700, why: 'ratio 1.4545..., raw 1018.18' },
  { width: 999, height: 777, why: 'ratio 1.6016..., raw 1244.44' },
  { width: 1920, height: 1201, why: 'ratio 0.8333..., raw 1000.83' },
  { width: 1377, height: 3525, why: 'raw 4095.86, under S-217 only once whole' },
  { width: 400, height: 1024, why: 'ratio 4, raw 4096 -- S-217 itself is allowed' },
]

describe('FR-025 IX-4 -- the exported height is the least whole pixel count that holds the picture (DFC-1143)', () => {
  it.each(FITTING)('exportSvg on $width x $height ($why)', (screen) => {
    const scene = sceneOn(screen)
    const raw = rawHeightOf(scene)
    const wanted = Math.max(S_81_HEIGHT, raw)
    const picture = pictureOrThrow(exportSvg(scene))
    const root = rootSizeOf(picture.svg)

    expect(
      Number.isInteger(picture.heightPx),
      `IX-4 (MUST) "the height is stretched until the picture fits" -- a picture is whole pixels (PND-133 refuses a fraction): heightPx was ${picture.heightPx}`,
    ).toBe(true)
    expect(
      picture.heightPx,
      'IX-4 (MUST) "stretched until the picture fits" and IX-5 (MUST NOT) "draw only part of it": the height holds the whole shrunk screen',
    ).toBeGreaterThanOrEqual(wanted - 0.01)
    expect(
      picture.heightPx,
      'IX-4 (MUST) "until the picture fits" and no further: less than one pixel above the picture (or S-81 height, IX-10)',
    ).toBeLessThan(wanted + 1)
    expect(
      picture.heightPx,
      'S-217 remark: "S-81 height is the lower bound before stretching, not the upper bound"; IX-10 (MUST) leaves the rest blank',
    ).toBeGreaterThanOrEqual(S_81_HEIGHT)
    expect(root.width, 'IX-4 (MUST) "the width is fixed at S-81 width"').toBe(S_81_WIDTH)
    expect(
      root.height,
      'FR-080 / IX-4: the root height attribute is the picture height exportSvg answers',
    ).toBe(picture.heightPx)
    expect(
      root.viewBoxHeight,
      'FR-080 (MUST) "the same ratio on both axes": the viewBox height is the picture height, so nothing is stretched',
    ).toBe(picture.heightPx)
  })

  it.each(FITTING)('exportPng on $width x $height hands the rasterizer a whole height ($why)', async (screen) => {
    const scene = sceneOn(screen)
    const watched = watchedRasterizer()
    const answer = await exportPng(watched.rasterizer, scene)
    const picture = pictureOrThrow(exportSvg(scene))

    expect(answer.ok, 'IX-4 (MUST): a picture under S-217 is written, as IO-4 and IO-6').toBe(true)
    expect(watched.sizes).toHaveLength(1)
    const size = watched.sizes[0] as RasterSizePx
    expect(
      Number.isInteger(size.heightPx),
      `IX-4 with PND-133 ("refuse, do not round"): the PNG height must be whole or IO-4 / IO-6 fail with RS-42 -- got ${size.heightPx}`,
    ).toBe(true)
    expect(
      size.heightPx,
      'IO-6 "the same PNG as IO-4", and IO-4 is painted from IO-3: one height for the SVG and the PNG',
    ).toBe(picture.heightPx)
    expect(size.widthPx, 'IX-4 (MUST) "the width is fixed at S-81 width"').toBe(S_81_WIDTH)
  })
})

const REFUSED: readonly (Screen & { readonly why: string })[] = [
  { width: 400, height: 1025, why: 'ratio 4, raw 4100' },
  { width: 1377, height: 3526, why: 'raw 4097.02' },
  { width: 1373, height: 3515, why: 'raw 4096.13 -- 4097 once whole' },
]

describe('FR-025 IX-5 -- past S-217 nothing is written (DFC-1143)', () => {
  it.each(REFUSED)('exportSvg and exportPng refuse $width x $height ($why)', async (screen) => {
    const scene = sceneOn(screen)
    expect(rawHeightOf(scene)).toBeGreaterThan(S_217_CAP)

    const svg = exportSvg(scene)
    expect(
      svg.ok,
      'IX-4 (MUST) "stretch only as far as S-217"; IX-5 (MUST) "when it does not fit under S-217, write no image"',
    ).toBe(false)
    if (!svg.ok) expect(svg.fault.reason, 'CP-21: refused, not a picture').toBe('tooTall')

    const watched = watchedRasterizer()
    const png = await exportPng(watched.rasterizer, scene)
    expect(png.ok, 'IX-7: IO-4 and IO-6 are stopped as IO-3 is').toBe(false)
    expect(watched.sizes, 'IX-5 (MUST NOT) "draw only part of it": nothing is painted').toHaveLength(0)
  })
})

interface DrawnTitle {
  readonly y: number
  readonly fontSize: number
}

const titleOf = (svg: string): DrawnTitle => {
  const text = /<text\b[^>]*>/.exec(svg)?.[0]
  if (text === undefined) throw new Error('the export drew no <text> for the Document Title')
  const attr = (name: string): number => Number(new RegExp(`\\s${name}="([^"]*)"`).exec(text)?.[1] ?? NaN)
  expect(svg.includes(`>${TITLE}</text>`), 'EP-1: the first <text> is the Document Title').toBe(true)
  return { y: attr('y'), fontSize: attr('font-size') }
}

const TITLED: readonly Screen[] = [
  { width: 1373, height: 773, appHeaderHeight: 37 },
  { width: 1366, height: 768, appHeaderHeight: 37 },
  { width: 1920, height: 1080, appHeaderHeight: 37 },
  { width: 1000, height: 800, appHeaderHeight: 37 },
  { width: 2560, height: 1440, appHeaderHeight: 37 },
  { width: 1100, height: 700, appHeaderHeight: 30 },
  { width: 1600, height: 900, appHeaderHeight: 48 },
]

describe('T-076 EP-1 -- the exported Document Title stands inside its band (DFC-1144)', () => {
  it.each(TITLED)('on $width x $height with a $appHeaderHeight px band', (screen) => {
    const scene = sceneOn(screen)
    const ratio = ratioOf(scene)
    const band = scene.regions.appHeader
    const title = titleOf(pictureOrThrow(exportSvg(scene)).svg)

    expect(
      title.fontSize,
      'EP-1 (MUST) "the size reads S-225", drawn at S-235 (FR-051) and shrunk by the FR-080 ratio -- written to two decimals',
    ).toBeCloseTo(S_225 * S_235 * ratio, 1)
    expect(
      title.y - title.fontSize,
      'EP-1 (MUST NOT) "the Document Title position must not move": the screen shows the title inside the band, so its em box above the baseline starts inside the picture (top >= 0)',
    ).toBeGreaterThanOrEqual(band.y * ratio - 0.01)
    expect(
      title.y,
      'EP-1 (MUST) "keep the band height as the screen has it": the baseline stays inside the exported band',
    ).toBeLessThanOrEqual((band.y + band.height) * ratio + 0.01)
  })

  it('stands at the same place in the band at every ratio (EP-1 MUST NOT move, FR-080 one ratio on both axes)', () => {
    const band = 37
    const unscaled = TITLED.filter((one) => one.appHeaderHeight === band).map((screen) => {
      const scene = sceneOn(screen)
      return titleOf(pictureOrThrow(exportSvg(scene)).svg).y / ratioOf(scene)
    })
    const first = unscaled[0] as number
    for (const one of unscaled) {
      expect(
        Math.abs(one - first),
        'FR-080 (MUST) "the same ratio vertically and horizontally" with EP-1 (MUST NOT) "must not move": the baseline over the ratio is one screen position (NS-6: under 1 px)',
      ).toBeLessThan(1)
    }
  })
})
