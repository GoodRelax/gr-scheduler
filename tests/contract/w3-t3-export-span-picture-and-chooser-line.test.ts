// W3 tester 3: a document with an export span exports the span picture, and the export chooser names the span.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it, vi } from 'vitest'

import type { DisplayLanguage, OpenModal, ScreenView } from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import { descendants, surfaceOf, wire, type FakeElement } from '../fixtures/fake-browser'
import { documentOf, taskOf } from './cr-606-stage'
import { bare, specTable, unbroken } from './spec-table'
import {
  EXPORT_CHOOSER,
  LARGE_SCREEN,
  SMALL_SCREEN,
  exportStage,
  restoreAnimationFrames,
  templateDocument,
  withSpan,
} from './w3-t3-frame-stage'

afterEach(restoreAnimationFrames)

const SPEC = join(process.cwd(), 'docs', 'spec')
const REQUIREMENTS = unbroken(readFileSync(join(SPEC, '01-04-requirements.md'), 'utf8').replace(/\r\n/g, '\n'))
const WORDS = JSON.parse(readFileSync(join(SPEC, '_source', 'display-words.json'), 'utf8')) as {
  readonly exportChooser: readonly { readonly part: string; readonly text: Record<DisplayLanguage, string> }[]
  readonly exportFormats: readonly { readonly rowId: string; readonly name?: Record<DisplayLanguage, string> }[]
}

// WHY: CR-690 -- the condition is the fix (FX-1, S-532), the old span row retired, and the days carry the year (FX-8).
const CLAUSE_SPAN_PICTURE =
  '⭐ 文書が全体表示時の期間を固定しているとき（`FR-055` の 表 T-367 の `FX-1`）は、本要求の縮めた絵ではなく、`FR-025` の 表 T-241 の `IX-12` 〜 `IX-16` が定める絵を出すこと（MUST）'
const CLAUSE_NO_DUAL_CURSOR = '表 T-076 に従うこと（MUST）。⛔ ただし `EP-6` の `Dual Cursor` を描いてはならない（MUST NOT）'
const CLAUSE_SPAN_LINE =
  '⭐ 文書が全体表示時の期間を固定しているとき（`FR-055` の 表 T-367 の `FX-1`）は、選択面の形式の格子の下に、その期間を 1 行で示すこと（MUST）'
const CLAUSE_SPAN_LINE_WORDS =
  '行の語は `FR-038` の辞書の `exportChooser` の `fitSpan` の語とし、その中の 2 つの日を `FR-055` の 表 T-367 の `FX-8` の形で書くこと（MUST） —— 文書の設定の面と同じ日の書き方で、年まで読ませる。固定していないときは、行を出さず、場所も空けないこと（MUST）'

const IC_2 = 'IC-2'
const IC_45 = 'IC-45'
const IO_3 = 'IO-3'

// see S-81
const S_81 = bare(specTable('T-204').rows.find((one) => one.id === 'S-81')?.by['既定'] ?? '')
const [S_81_WIDTH, S_81_HEIGHT] = S_81.split('×').map((one) => Number(one.trim()))

const SPAN_START = '2027-05-03'
const SPAN_FINISH = '2027-07-30'

const TEMPLATE = templateDocument()
const SPANNED = withSpan(TEMPLATE, SPAN_START, SPAN_FINISH)

// WHY: a few task groups, so the span picture with every task group stays under the S-217 cap (IX-5 would refuse it).
const SMALL = documentOf({
  tasks: [taskOf(1), taskOf(2, { start: '2026-05-04T08:00:00', finish: '2026-05-15T17:00:00' })],
})
const SMALL_SPANNED = withSpan(SMALL, '2026-04-01', '2026-05-31')

async function exportedSvg(document: Document, screen = SMALL_SCREEN, dualCursor = false): Promise<string> {
  const stage = exportStage(document, screen)
  if (dualCursor) {
    await stage.take(IC_45)
    await stage.pointAt(screen.width / 2, screen.height / 2)
  }
  await stage.take(IC_2)
  await stage.takeFormat(IO_3)
  return stage.writtenSvg()
}

const svgSizeOf = (svg: string): { readonly width: number; readonly height: number } => {
  const head = /<svg\b[^>]*>/.exec(svg)?.[0] ?? ''
  return {
    width: Number(/\bwidth="([\d.]+)/.exec(head)?.[1] ?? Number.NaN),
    height: Number(/\bheight="([\d.]+)/.exec(head)?.[1] ?? Number.NaN),
  }
}

// see FX-8
// WHY: the year, the month and the day, zero-filled to 4, 2 and 2 digits, whatever years the tasks span.
function dayWordOf(day: string, _document: Document): string {
  return day.split('-').join('/')
}

const spanWordOf = (language: DisplayLanguage): string =>
  WORDS.exportChooser.find((one) => one.part === 'fitSpan')?.text[language] ?? '(no fitSpan word)'

const expectedLineOf = (document: Document, start: string, finish: string, language: DisplayLanguage): string =>
  spanWordOf(language).replace('{start}', dayWordOf(start, document)).replace('{finish}', dayWordOf(finish, document))

async function chooserOf(document: Document, language: DisplayLanguage = 'ja'): Promise<OpenModal & { readonly fitSpanLine?: string | null }> {
  const stage = exportStage(document, SMALL_SCREEN, language)
  await stage.take(IC_2)
  const modal = stage.lastView().openModal
  if (modal === null || modal === undefined || modal.surface !== EXPORT_CHOOSER) {
    throw new Error(`premise: ${IC_2} opens ${EXPORT_CHOOSER}, got ${JSON.stringify(modal?.surface)}`)
  }
  return modal as OpenModal & { readonly fitSpanLine?: string | null }
}

const EMPTY_VIEW = {
  language: 'ja',
  frame: { isFullScreen: false, dividers: [], scrollbars: [] },
  appHeaderItems: {
    documentTitle: null,
    openedFileName: null,
    fileSavedAt: null,
    fileSavedByteLength: null,
    fileNeverSavedText: '',
    commands: [],
    language: 'ja',
  },
  taskGroupPanel: { pinnedTitles: [], titles: [] },
  propertiesPanel: null,
  commandPalette: null,
  openModal: null,
  notices: [],
  confirmation: null,
  dialogueField: null,
  tooltips: [],
} as unknown as ScreenView

function drawnChooser(modal: OpenModal): FakeElement {
  const built = wire({ preference: 'light', hue: 214 }, { 'App Header': 37 })
  surfaceOf(built).showScreenView({ ...EMPTY_VIEW, openModal: modal })
  return built.root()
}

const textOf = (element: FakeElement): string => element.textContent ?? ''

const shapeOf = (element: FakeElement): string =>
  `${element.tagName}[${element.children.map(shapeOf).join(',')}]`

describe('W3-T3 -- the manuscript still says what these cases read', () => {
  it.each([CLAUSE_SPAN_PICTURE, CLAUSE_NO_DUAL_CURSOR, CLAUSE_SPAN_LINE, CLAUSE_SPAN_LINE_WORDS])('%s', (clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })

  it('premise: S-81 is a width and a height', () => {
    expect(Number.isFinite(S_81_WIDTH) && Number.isFinite(S_81_HEIGHT)).toBe(true)
  })
})

describe('FR-080 -- a document with an export span exports the IX-12 to IX-16 picture', () => {
  it(`"${CLAUSE_SPAN_PICTURE}" -- control: without a span the picture follows the window`, async () => {
    expect(await exportedSvg(SMALL, SMALL_SCREEN)).not.toBe(await exportedSvg(SMALL, LARGE_SCREEN))
  })

  it(`"${CLAUSE_SPAN_PICTURE}" -- with a span the window size does not change the picture (IX-12)`, async () => {
    // WHY: the picture carries the edit time; two renders a second apart under load differ by it alone.
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-04-01T09:00:00Z'))
    try {
      expect(await exportedSvg(SMALL_SPANNED, SMALL_SCREEN)).toBe(await exportedSvg(SMALL_SPANNED, LARGE_SCREEN))
    } finally {
      vi.useRealTimers()
    }
  })

  it(`"${CLAUSE_SPAN_PICTURE}" -- the span picture is drawn at the S-81 width, not shrunk (IX-13)`, async () => {
    const size = svgSizeOf(await exportedSvg(SMALL_SPANNED, SMALL_SCREEN))
    expect(size.width).toBe(S_81_WIDTH)
    expect(size.height).toBeGreaterThanOrEqual(S_81_HEIGHT ?? Number.NaN)
  })
})

describe('FR-025 IX-16 -- the span picture never draws the Dual Cursor', () => {
  it(`"${CLAUSE_NO_DUAL_CURSOR}" -- control: without a span the Dual Cursor changes the picture`, async () => {
    expect(await exportedSvg(SMALL, SMALL_SCREEN, true)).not.toBe(await exportedSvg(SMALL, SMALL_SCREEN, false))
  })

  it(`"${CLAUSE_NO_DUAL_CURSOR}" -- with a span, the picture is the same with the Dual Cursor out`, async () => {
    // WHY: the picture carries the edit time; two renders a second apart under load differ by it alone.
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-04-01T09:00:00Z'))
    try {
      expect(await exportedSvg(SMALL_SPANNED, SMALL_SCREEN, true)).toBe(await exportedSvg(SMALL_SPANNED, SMALL_SCREEN, false))
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('FR-096 -- the export chooser names a saved span in one line', () => {
  const ONE_YEAR = documentOf({ tasks: [taskOf(1), taskOf(2)] })

  it.each(['ja', 'en'] as const)(`"${CLAUSE_SPAN_LINE_WORDS}" -- the year is shown, %s`, async (language) => {
    const modal = await chooserOf(SPANNED, language)
    expect(modal.fitSpanLine).toBe(expectedLineOf(SPANNED, SPAN_START, SPAN_FINISH, language))
  })

  it(`"${CLAUSE_SPAN_LINE_WORDS}" -- the year is shown even when every task sits in one year`, async () => {
    const spanned = withSpan(ONE_YEAR, '2026-04-01', '2026-04-30')
    const modal = await chooserOf(spanned)
    expect(modal.fitSpanLine).toBe(expectedLineOf(spanned, '2026-04-01', '2026-04-30', 'ja'))
    expect(modal.fitSpanLine).toContain('2026/04/01 - 2026/04/30')
  })

  it(`"${CLAUSE_SPAN_LINE}" -- the line is drawn below the format grid`, async () => {
    const modal = await chooserOf(SPANNED)
    const root = drawnChooser(modal)
    const line = expectedLineOf(SPANNED, SPAN_START, SPAN_FINISH, 'ja')
    const all = descendants(root)
    const lineAt = all.findIndex((one) => textOf(one) === line && one.children.every((child) => textOf(child) !== line))
    expect(lineAt, 'the span line is not drawn').toBeGreaterThanOrEqual(0)
    const formatNames = (modal as unknown as { readonly formats: readonly { readonly name: string }[] }).formats.map((one) => one.name)
    const grid = all.find((one) => formatNames.every((name) => textOf(one).includes(name)) && !textOf(one).includes(line))
    expect(grid, 'no element holds every format and not the line').toBeDefined()
    const lastFormatAt = all.lastIndexOf(descendants(grid as FakeElement).slice(-1)[0] ?? (grid as FakeElement))
    expect(lineAt).toBeGreaterThan(lastFormatAt)
  })

  it(`"${CLAUSE_SPAN_LINE_WORDS}" -- with no span there is no line and no room kept for one`, async () => {
    const empty = await chooserOf(TEMPLATE)
    expect(empty.fitSpanLine ?? null).toBeNull()
    const spanned = await chooserOf(SPANNED)
    const withLine = drawnChooser(spanned)
    const without = drawnChooser(empty)
    const line = expectedLineOf(SPANNED, SPAN_START, SPAN_FINISH, 'ja')
    const lineElement = descendants(withLine).find(
      (one) => textOf(one) === line && one.children.every((child) => textOf(child) !== line),
    )
    expect(lineElement).toBeDefined()
    lineElement?.parentNode?.removeChild(lineElement)
    expect(shapeOf(without)).toBe(shapeOf(withLine))
  })
})
