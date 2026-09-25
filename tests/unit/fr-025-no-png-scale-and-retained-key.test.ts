// Unit test: FR-025 forbids a PNG export scale and drops a retired settings key on reading.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  exportPng,
  type ExportScene,
  type ImageExport,
  type RasterSizePx,
  type Rastering,
  type Rasterizer,
} from '../../src/adapter/image-exporter/image-exporter'
import { documentFromJson, jsonFromDocument } from '../../src/adapter/document-codec/json-codec'
import type {
  AppHeaderItems,
  RowTitlePanel,
  ScreenFrame,
  ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'
import {
  SETTINGS_DEFAULTS,
  type DocumentSettings,
} from '../../src/entity/document-model/document-settings/document-settings'
import type {
  ScreenRect,
  ScreenRegions,
} from '../../src/entity/layout-engine/screen-regions/screen-regions'
import type { Document } from '../../src/entity/document-model/document/document'
import { specTable, unbroken } from '../contract/spec-table'

/* eslint-disable @typescript-eslint/no-explicit-any */

const REQUIREMENTS = unbroken(readFileSync(
  join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
  'utf8',
))

const FR_025_NO_SCALE =
  '出力サイズは表 T-204 の `S-81` に固定し、書き出しのたびに選ばせてはならない（MUST NOT）。 ⛔ **倍率を持ってはならない（MUST NOT）'

const FR_025_DROP_RETIRED_KEY =
  '⛔ 保存済みの文書がその鍵を持っていても、読むときに捨て、書き戻してはならない（MUST NOT）'

describe('FR-025 -- the manuscript this file is driven by', () => {
  it('still forbids a scale, and still asks a retired key be dropped on reading', () => {
    expect(REQUIREMENTS).toContain(FR_025_NO_SCALE)
    expect(REQUIREMENTS).toContain(FR_025_DROP_RETIRED_KEY)
  })
})

// WHY: built from code points, not a literal, so the file stays ASCII per
// rule 03 section 5 -- the two-character heading would vanish from a diff.
const DEFAULT_COLUMN = String.fromCharCode(0x65e2, 0x5b9a)

// WHY: read from the manuscript rather than typed, so this value cannot go
// stale against the specification (rule 03.1).
const THEME_HUE = ((): number => {
  const row = specTable('T-216').rows.find((one) => one.id === 'S-73')
  if (row === undefined) throw new Error('table T-216 has no row S-73')
  const found = /-?\d+(?:\.\d+)?/.exec((row.by[DEFAULT_COLUMN] ?? '').replace(/`/g, ''))
  const value = Number(found?.[0] ?? '')
  if (!Number.isFinite(value)) throw new Error('table T-216 row S-73 states no number')
  return value
})()

const nestedFrom = (flat: Readonly<Record<string, unknown>>): Record<string, unknown> => {
  const built: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(flat)) {
    const dot = key.indexOf('.')
    if (dot < 0) {
      built[key] = value
      continue
    }
    const head = key.slice(0, dot)
    const existing = built[head]
    const group = (typeof existing === 'object' && existing !== null ? existing : {}) as Record<
      string,
      unknown
    >
    group[key.slice(dot + 1)] = value
    built[head] = group
  }
  return built
}

const SETTINGS_BASE = nestedFrom(SETTINGS_DEFAULTS)

const settingsOf = (part: Record<string, unknown> = {}): DocumentSettings =>
  ({ ...SETTINGS_BASE, ...part }) as unknown as DocumentSettings

const SETTINGS = settingsOf()

interface MeasuredScreen {
  readonly width: number
  readonly height: number
  readonly appHeaderHeight: number
  readonly scrollbarThickness: number
}

const SCREEN: MeasuredScreen = {
  width: 1000,
  height: 800,
  appHeaderHeight: 56,
  scrollbarThickness: 8,
}

const regionsOf = (
  screen: MeasuredScreen = SCREEN,
  settings: DocumentSettings = SETTINGS,
): ScreenRegions => {
  const header: ScreenRect = { x: 0, y: 0, width: screen.width, height: screen.appHeaderHeight }
  const canvas: ScreenRect = {
    x: 0,
    y: screen.appHeaderHeight,
    width: screen.width,
    height: screen.height - screen.appHeaderHeight,
  }
  const rowAreaWidth =
    canvas.width -
    settings.canvasPadding -
    settings.rowTitlePanelWidth -
    settings.propertyPanelWidth -
    screen.scrollbarThickness
  const rowAreaHeight =
    canvas.height - settings.rulerHeight - settings.canvasPadding - screen.scrollbarThickness
  return {
    appHeader: header,
    scheduleCanvas: canvas,
    rowTitlePanel: { x: canvas.x, y: canvas.y, width: settings.rowTitlePanelWidth, height: canvas.height },
    timeRuler: {
      x: canvas.x + settings.rowTitlePanelWidth,
      y: canvas.y,
      width: rowAreaWidth,
      height: settings.rulerHeight,
    },
    propertiesPanel: {
      x: canvas.x + canvas.width - settings.propertyPanelWidth,
      y: canvas.y,
      width: settings.propertyPanelWidth,
      height: canvas.height,
    },
    rowArea: {
      x: canvas.x + settings.rowTitlePanelWidth,
      y: canvas.y + settings.rulerHeight,
      width: rowAreaWidth,
      height: rowAreaHeight,
    },
  }
}

const REGIONS = regionsOf()

const PICTURE =
  '<svg xmlns="http://www.w3.org/2000/svg" data-from="svg-renderer"><circle cx="7" cy="11" r="3"/></svg>'

const VIEW: ScreenView = {
  language: 'ja',
  frame: { isFullScreen: false, dividers: [], scrollbars: [] } as ScreenFrame,
  appHeaderItems: {
    documentTitle: null,
    openedFileName: null,
    fileSavedAt: null,
    fileNeverSavedText: '',
    commands: [],
    language: 'ja',
  } as AppHeaderItems,
  rowTitlePanel: { pinnedTitles: [], titles: [] } as RowTitlePanel,
  propertiesPanel: null,
  commandPalette: null,
  openModal: null,
  notices: [],
  confirmation: null,
  dialogueField: null,
  tooltips: [],
}

const sceneOf = (settings: DocumentSettings): ExportScene => ({
  svg: PICTURE,
  regions: REGIONS,
  screenView: VIEW,
  settings,
  themeHue: THEME_HUE,
})

const PNG_BYTES = Uint8Array.from([0x89, 0x50, 0x4e, 0x47])

interface Watched {
  readonly rasterizer: Rasterizer
  readonly calls: { svg: string; sizePx: RasterSizePx }[]
}

const watchedRasterizer = (): Watched => {
  const calls: { svg: string; sizePx: RasterSizePx }[] = []
  return {
    calls,
    rasterizer: {
      rasterizePng: (svg: string, sizePx: RasterSizePx): Promise<Rastering> => {
        calls.push({ svg, sizePx })
        return Promise.resolve({ ok: true, pngBytes: PNG_BYTES })
      },
    },
  }
}

type PictureAndPng = Extract<ImageExport, { readonly ok: true }>

const fitOrThrow = (answer: ImageExport): PictureAndPng => {
  if (!answer.ok) {
    throw new Error('FR-025 refused a picture this fixture is far under S-217 for -- the fixture')
  }
  return answer
}

describe('FR-025 (MUST NOT) -- exportPng carries no scale', () => {
  it('⛔ the published signature takes no third "scale" argument', () => {
    // WHY: a function forbidden a scale has no parameter for one to travel on,
    // so a length check at the type level proves the whole clause.
    expect(exportPng).toHaveLength(2)
  })

  it('⭐⭐ a settings group carrying the RETIRED key (exportPngScale) paints the same size as one without it', async () => {
    // WHY: a settings value built outside the read path can still carry the
    // field at runtime, and the picture must not read it even then.
    const withRetiredKey = { ...SETTINGS, exportPngScale: 1 } as unknown as DocumentSettings
    const withADifferentValue = { ...SETTINGS, exportPngScale: 8 } as unknown as DocumentSettings

    const low = watchedRasterizer()
    const high = watchedRasterizer()
    const lowPicture = fitOrThrow(await exportPng(low.rasterizer, sceneOf(withRetiredKey)))
    const highPicture = fitOrThrow(
      await exportPng(high.rasterizer, sceneOf(withADifferentValue)),
    )

    expect(
      low.calls[0]?.sizePx,
      'FR-025 (MUST NOT): the picture painted at a different size for a settings ' +
        'group that differs only in the retired exportPngScale key',
    ).toEqual(high.calls[0]?.sizePx)
    expect(lowPicture.heightPx).toBe(highPicture.heightPx)
  })

  it('⭐ the width painted is always S-81 (exportCanvas.width), never a multiple of it', async () => {
    const watched = watchedRasterizer()
    await exportPng(watched.rasterizer, sceneOf({ ...SETTINGS, exportPngScale: 4 } as unknown as DocumentSettings))

    expect(
      watched.calls[0]?.sizePx.widthPx,
      'FR-025 (MUST): 幅は S-81 の幅に固定すること -- a scale field could only ' +
        'show up here as a width that is not exportCanvas.width',
    ).toBe(SETTINGS.exportCanvas.width)
  })

  it('control: exportCanvas is what DOES change the painted width', async () => {
    // TRAP: a rasterizer stub that ignores its size argument would make the
    // case above pass for nothing without this control.
    const narrower = settingsOf({ exportCanvas: { width: 800, height: 900 } })
    const watched = watchedRasterizer()

    await exportPng(watched.rasterizer, sceneOf(narrower))

    expect(watched.calls[0]?.sizePx.widthPx).toBe(800)
  })
})

const TEMPLATE = JSON.parse(
  readFileSync(
    join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'),
    'utf8',
  ),
) as Record<string, unknown>

function documentWithRetiredKey(value: number): Document {
  const template = structuredClone(TEMPLATE) as any
  return {
    ...template,
    documentSettings: { ...template.documentSettings, exportPngScale: value },
  } as Document
}

describe('FR-025 IX-3 (MUST NOT) -- the retired exportPngScale key is dropped on reading and never written back', () => {
  it('⭐⭐ documentFromJson opens a document that still carries the key, and drops it', () => {
    const text = JSON.stringify(documentWithRetiredKey(3))

    const decoded = documentFromJson(text)

    expect(decoded.ok, decoded.ok ? '' : JSON.stringify((decoded as any).faults)).toBe(true)
    if (!decoded.ok) return
    expect(
      'exportPngScale' in (decoded.document.documentSettings as unknown as Record<string, unknown>),
      'IX-3 (MUST NOT): reading kept a retired key',
    ).toBe(false)
    expect(decoded.unreadColumns, 'IX-3: the drop is not told').toEqual([])
  })

  it('⭐⭐ a document read with the key writes without it, and reads back without it', () => {
    const decoded = documentFromJson(JSON.stringify(documentWithRetiredKey(5)))
    expect(decoded.ok).toBe(true)
    if (!decoded.ok) return

    const text = jsonFromDocument(decoded.document)
    expect(text.includes('exportPngScale'), 'IX-3 (MUST NOT): written back').toBe(false)
    const again = documentFromJson(text)

    expect(again.ok).toBe(true)
    if (!again.ok) return
    expect('exportPngScale' in (again.document.documentSettings as unknown as Record<string, unknown>)).toBe(false)
  })

  it('control: a document with no such key round-trips with none either', () => {
    const original = structuredClone(TEMPLATE) as unknown as Document
    expect((original.documentSettings as unknown as Record<string, unknown>)['exportPngScale']).toBeUndefined()

    const decoded = documentFromJson(jsonFromDocument(original))

    expect(decoded.ok).toBe(true)
    if (!decoded.ok) return
    expect(
      (decoded.document.documentSettings as unknown as Record<string, unknown>)['exportPngScale'],
    ).toBeUndefined()
  })
})
