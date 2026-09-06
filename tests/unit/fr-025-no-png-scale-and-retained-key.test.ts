// `FR-025` (利用者の裁定 2026-09-06, CR-336/337 aftermath, ledger row from the
// same date): the PNG export was given a selectable scale (`S-82`,
// `exportPngScale`) and the ruling retired the idea outright -- 「PNGはいつも
// 原則 1600x900のままとする。例外は行が多い場合に900を増やすときのみ」. The
// picture's width is fixed at `exportCanvas` (S-81) and its height only grows to
// fit; there is no multiplier anywhere any more.
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these cases have no node
// in the specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/.
//
// ---------------------------------------------------------------------------
// ⭐ THE TWO CLAUSES, VERBATIM (docs/spec/01-04-requirements.md, FR-025) -- each
// window below ends at its own marker's closing parenthesis, which is the unit
// check 39 (`check-must-clause-coverage.py`) measures a clause by.
// ---------------------------------------------------------------------------
//
//   ⛔⛔ 「倍率を持ってはならない（MUST NOT）」
//   ⛔ 「保存済みの文書がその鍵を持っていても、捨てずに保つこと（MUST）」
//
// ---------------------------------------------------------------------------
// Units under test:
//   `image-exporter.ts` (UF-40, component CP-25's neighbour, table T-075) --
//     `exportPng`'s published signature, `(rasterizer, scene)`, carries no
//     third "scale" argument, and its body reads no such field off
//     `scene.settings`.
//   `json-codec.ts` (`documentFromJson` / `jsonFromDocument`) -- the read and
//     write side of `GRS JSON`, where OP-6 of table T-024a ("a key the reader
//     does not know is kept, not dropped") is what makes a retired key survive.
//
// ⛔ WRITTEN FROM docs/spec, PLUS ONLY THE PUBLISHED SIGNATURES AND TYPES
// (docs/development-rules/04-verification.md §1): `ExportScene`, `ImageExport`,
// `Rasterizer`, `RasterSizePx`, `Rastering` from `image-exporter.ts`;
// `documentFromJson` / `jsonFromDocument` from `json-codec.ts`. NO FUNCTION BODY
// of either unit was read to decide what a case below expects -- every expected
// value is FR-025's or OP-6's own wording. The fixture-building helpers
// (`regionsOf`, `viewOf`, `settingsOf`) are copied in shape from
// tests/unit/uf-39-40.test.ts, which drives the same two published entries the
// same way.
//
// ---------------------------------------------------------------------------
// ⚠️ WHAT IS DELIBERATELY NOT ASSERTED
// ---------------------------------------------------------------------------
//  1. THE HEIGHT-GROWTH ARITHMETIC ITSELF (S-81's floor, S-217's ceiling, the
//     "too tall" refusal). tests/unit/uf-39-40.test.ts already drives that;
//     this file's only question is whether a SCALE reaches the picture.
//  2. WHETHER `documentFromJson` OR THE SCHEMA REFUSES AN OUT-OF-BOUNDS KNOWN
//     VALUE. That is `clampedSettings`' own ground and it is not this file's.
//  3. THE COMMAND / KEY-TABLE ROW RETIREMENTS (`CM-70`, `K-88`). Those are
//     tests/unit/t-027-outside-the-history.test.ts's and tests/unit/
//     uf-34-35.test.ts's own record; this file is about the VALUE, not the
//     roster rows that used to write it.

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
import { specTable } from '../contract/spec-table'

/* eslint-disable @typescript-eslint/no-explicit-any */

// ===========================================================================
// 1. The manuscript, read at run time rather than copied
// ===========================================================================

const REQUIREMENTS = readFileSync(
  join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
  'utf8',
)

/** ⛔⛔ FR-025 (MUST NOT), verbatim, ending at its own marker. */
const FR_025_NO_SCALE =
  '出力サイズは表 T-204 の `S-81` に固定し、書き出しのたびに選ばせてはならない（MUST NOT）。** ⛔⛔ **倍率を持ってはならない（MUST NOT）'

/** ⛔ FR-025 (MUST), the retired key kept rather than dropped, verbatim. */
const FR_025_KEEP_RETIRED_KEY =
  'exportPngScale`）は同日に退役した** —— **倍率という考えそのものを廃したので、値だけを残す意味が無い。**⛔ **保存済みの文書がその鍵を持っていても、捨てずに保つこと（MUST）'

describe('FR-025 -- the manuscript this file is driven by', () => {
  it('still forbids a scale, and still asks a retired key be kept', () => {
    expect(REQUIREMENTS).toContain(FR_025_NO_SCALE)
    expect(REQUIREMENTS).toContain(FR_025_KEEP_RETIRED_KEY)
  })
})

/**
 * The heading the settings tables give their default column.
 *
 * ⚠️ Built from its code points: rule 03 section 5 keeps this tree ASCII, so a
 * literal would be invisible in a diff.
 */
const DEFAULT_COLUMN = String.fromCharCode(0x65e2, 0x5b9a)

/**
 * `S-73` of table T-216 -- the document's theme hue (`Project.themeHue`,
 * AT-19), which a scene has to state because DR-5 of table T-052 keeps it at
 * `Project` and therefore out of `DocumentSettings` and `ScreenView` alike.
 *
 * ⛔ Read from the manuscript rather than typed: rule 03 section 1 forbids
 * copying a value the specification already holds.
 */
const THEME_HUE = ((): number => {
  const row = specTable('T-216').rows.find((one) => one.id === 'S-73')
  if (row === undefined) throw new Error('table T-216 has no row S-73')
  const found = /-?\d+(?:\.\d+)?/.exec((row.by[DEFAULT_COLUMN] ?? '').replace(/`/g, ''))
  const value = Number(found?.[0] ?? '')
  if (!Number.isFinite(value)) throw new Error('table T-216 row S-73 states no number')
  return value
})()

// ===========================================================================
// 2. FR-025 (MUST NOT): the picture carries no scale
// ===========================================================================

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

/** Copied in shape from tests/unit/uf-39-40.test.ts's own `regionsOf`. */
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

/** A minimal, valid `ScreenView` -- nothing table T-076 keeps out of an export. */
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
    // ⛔⛔ THE WHOLE OF THE CLAUSE, AT THE TYPE LEVEL: a function that "may not
    // carry a scale" has no parameter for one to travel on.
    expect(exportPng).toHaveLength(2)
  })

  it('⭐⭐ a settings group carrying the RETIRED key (exportPngScale) paints the same size as one without it', async () => {
    // ⚠️ THE FIXTURE FOR A DOCUMENT THAT STILL CARRIES `S-82`: OP-6 of table
    // T-024a (MUST) keeps a key this build no longer declares, so a real
    // `DocumentSettings` value here legitimately still has the field at
    // runtime even though `DocumentSettings` publishes no member for it.
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
    // ⛔ WITHOUT THIS, a rasterizer stub that ignores its size argument would
    // make the case above pass for nothing.
    const narrower = settingsOf({ exportCanvas: { width: 800, height: 900 } })
    const watched = watchedRasterizer()

    await exportPng(watched.rasterizer, sceneOf(narrower))

    expect(watched.calls[0]?.sizePx.widthPx).toBe(800)
  })
})

// ===========================================================================
// 3. FR-025 (MUST) -- a retired key is kept, not dropped, on the JSON road
// ===========================================================================

const TEMPLATE = JSON.parse(
  readFileSync(
    join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'),
    'utf8',
  ),
) as Record<string, unknown>

/** A document whose settings still carry the retired `S-82` key, as an old file would. */
function documentWithRetiredKey(value: number): Document {
  const template = structuredClone(TEMPLATE) as any
  return {
    ...template,
    documentSettings: { ...template.documentSettings, exportPngScale: value },
  } as Document
}

describe('FR-025 (MUST) -- OP-6 keeps the retired exportPngScale key rather than drop it', () => {
  it('⭐⭐ documentFromJson keeps the key, unmoved, on a document that still carries it', () => {
    const text = JSON.stringify(documentWithRetiredKey(3))

    const decoded = documentFromJson(text)

    expect(decoded.ok, decoded.ok ? '' : JSON.stringify((decoded as any).faults)).toBe(true)
    if (!decoded.ok) return
    expect(
      (decoded.document.documentSettings as unknown as Record<string, unknown>)['exportPngScale'],
      'FR-025 (MUST): 保存済みの文書がその鍵を持っていても、捨てずに保つこと -- ' +
        'reading the file dropped a key OP-6 says to keep',
    ).toBe(3)
  })

  it('⭐⭐ the key survives a full write-then-read cycle unchanged', () => {
    const original = documentWithRetiredKey(5)

    const text = jsonFromDocument(original)
    const decoded = documentFromJson(text)

    expect(decoded.ok).toBe(true)
    if (!decoded.ok) return
    expect(
      (decoded.document.documentSettings as unknown as Record<string, unknown>)['exportPngScale'],
    ).toBe(5)
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
