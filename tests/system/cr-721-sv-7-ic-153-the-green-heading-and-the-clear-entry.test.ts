// CR-721 on the shipped build: a filtered column's heading is painted S-183 with S-146 ink, a sorted one is not, and IC-153 takes filters and sort away and nothing else (T-330 SV-7, SV-1).

import { expect, test, type Browser, type Page } from '@playwright/test'
import { bare, specTable } from '../contract/spec-table'
import { CLEARING_UP_MS, launchReferenceBrowser } from './live-app'
import {
  CLEAR,
  PANEL,
  REPORT,
  boxOf,
  cellOf,
  colourOfHeading,
  dragBorder,
  openFilter,
  pressAt,
  pressSelector,
  settle,
  widthsOf,
  withReport,
  withSearch,
  type Box,
} from './cr-721-stage'

const SV_7_GREEN =
  '⭐ 列のフィルタを掛けている列 —— 値の一覧の印を 1 つでも外した列か、「いつから」か「いつまで」を置いた列 —— の見出しのセルは、`_assets/tbl-settings.md` の 表 T-236 の `S-183` で塗り、語と `IC-122` の絵を `S-146`（地の色）で描くこと（MUST）'
const SV_7_SORT_ONLY = '並べ替えだけを掛けた列の見出しは塗らない —— 緑は列のフィルタだけの合図である（利用者が定めた）'
const SV_1_NOTHING = '列のフィルタも並べ替えも掛かっていないあいだは、`IC-153` を効かなくする（`FR-092`）。'
const IC_153_KEEPS = '⭐ 語・表示の列の値・スケジュールフィルタ（`IC-143`）は変えない。'

let browser: Browser | null = null

test.beforeAll(async () => {
  browser = await launchReferenceBrowser()
})

test.afterAll(async () => {
  test.setTimeout(CLEARING_UP_MS)
  await browser?.close()
})

const need = (): Browser => {
  if (browser === null) throw new Error('no browser')
  return browser
}

/** @purity pure */
function rgbOf(hex: string): string {
  const n = Number.parseInt(hex.replace('#', ''), 16)
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`
}

const S_183 = { light: rgbOf(bare(cellOf('T-236', 'S-183', '明るいテーマ'))), dark: rgbOf(bare(cellOf('T-236', 'S-183', '暗いテーマ'))) }
const S_146_LIGHT = rgbOf(bare(cellOf('T-236', 'S-146', '明るいテーマ')))

test.describe('CR-721 the manuscript these cases are driven by', () => {
  test('T-330 SV-7 and SV-1 and T-109 IC-153 still say it, word for word', () => {
    expect(cellOf('T-330', 'SV-7', '定め')).toContain(SV_7_GREEN)
    expect(cellOf('T-330', 'SV-7', '定め')).toContain(SV_7_SORT_ONLY)
    expect(cellOf('T-330', 'SV-1', '定め')).toContain(SV_1_NOTHING)
    expect(cellOf('T-109', 'IC-153', '何の入口か')).toContain(IC_153_KEEPS)
    expect(specTable('T-236').rows.some((one) => one.id === 'S-183')).toBe(true)
  })
})

/** @purity non-pure */
async function uncheckFirstValue(page: Page, window: string): Promise<void> {
  const box = await page.evaluate((asked: string) => {
    const mark = document.querySelector(`${asked} [data-search-filter-menu] input[type="checkbox"]`)
    const r = mark?.getBoundingClientRect()
    return r === undefined ? null : { x: r.x + r.width / 2, y: r.y + r.height / 2 }
  }, window)
  expect(box, 'the open filter lists a value').not.toBeNull()
  if (box !== null) await pressAt(page, box.x, box.y)
}

/** @purity non-pure */
async function pressMenuEntry(page: Page, window: string, icon: string): Promise<void> {
  await pressSelector(page, `${window} [data-search-filter-menu] [data-icon="${icon}"]`)
}

/** @purity semi-pure-b */
async function isEntryIdle(page: Page, window: string, icon: string): Promise<boolean> {
  return page.evaluate(
    (asked: { window: string; icon: string }) => {
      const one = document.querySelector(`${asked.window} [data-icon="${asked.icon}"]`)
      if (one === null) throw new Error(`${asked.icon} is not drawn`)
      return one.getAttribute('aria-disabled') === 'true' || one.getAttribute('data-enabled') === 'false' || one.hasAttribute('disabled')
    },
    { window, icon },
  )
}

/** @purity semi-pure-b */
async function wordFieldValue(page: Page): Promise<string> {
  return page.evaluate((window: string) => (document.querySelector(`${window} input[data-search-word]`) as HTMLInputElement | null)?.value ?? '', PANEL)
}

/** @purity semi-pure-b */
async function rowCount(page: Page, window: string): Promise<number> {
  return page.evaluate((asked: string) => document.querySelectorAll(`${asked} tbody tr`).length, window)
}

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`T-330 SV-7 -- the heading of a filtered column (${scheme} theme)`, () => {
    test.setTimeout(180_000)

    test(`SV-7 「${SV_7_GREEN.slice(-40)}」 -- an unchecked value paints the heading S-183 and the plain headings stay plain`, async () => {
      const stage = await withSearch(need(), scheme)
      try {
        const page = stage.page
        const plain = await colourOfHeading(page, PANEL, 'SQ-2')
        expect(plain.fill, 'premise: a plain heading is not green').not.toBe(S_183[scheme])
        await openFilter(page, PANEL, 'SQ-1')
        await uncheckFirstValue(page, PANEL)
        await page.keyboard.press('Escape')
        await settle(page)
        const marked = await colourOfHeading(page, PANEL, 'SQ-1')
        expect(marked.fill, 'the filtered heading is filled with S-183').toBe(S_183[scheme])
        expect(marked.word, 'its word is not the plain ink').not.toBe(plain.word)
        if (scheme === 'light') {
          expect(marked.word, 'its word is S-146').toBe(S_146_LIGHT)
          expect(marked.icon, 'its IC-122 picture is S-146').toContain(S_146_LIGHT)
        }
        expect((await colourOfHeading(page, PANEL, 'SQ-2')).fill, 'the other headings stay plain').toBe(plain.fill)
      } finally {
        await stage.close()
      }
    })

    test(`SV-7 「${SV_7_SORT_ONLY}」`, async () => {
      const stage = await withSearch(need(), scheme)
      try {
        const page = stage.page
        const plain = await colourOfHeading(page, PANEL, 'SQ-2')
        await openFilter(page, PANEL, 'SQ-4')
        await pressMenuEntry(page, PANEL, 'IC-123')
        await page.keyboard.press('Escape')
        await settle(page)
        expect(await colourOfHeading(page, PANEL, 'SQ-4'), 'a column only sorted is painted like a plain one').toEqual(await colourOfHeading(page, PANEL, 'SQ-2'))
        expect((await colourOfHeading(page, PANEL, 'SQ-4')).fill).toBe(plain.fill)
      } finally {
        await stage.close()
      }
    })
  })
}

test.describe('T-330 SV-7 -- a date bound paints the heading too', () => {
  test.setTimeout(180_000)

  test('a since date on SQ-3 paints SQ-3', async () => {
    const stage = await withSearch(need())
    try {
      const page = stage.page
      await openFilter(page, PANEL, 'SQ-3')
      await page.locator(`${PANEL} [data-search-filter-menu] input[type="date"]`).first().fill('2026-01-01')
      await settle(page)
      await page.keyboard.press('Escape')
      await settle(page)
      expect((await colourOfHeading(page, PANEL, 'SQ-3')).fill).toBe(S_183.light)
    } finally {
      await stage.close()
    }
  })
})

test.describe('T-330 SV-1 / T-109 IC-153 -- Clear Filters on the Search Panel', () => {
  test.setTimeout(240_000)

  test(`SV-1 「${SV_1_NOTHING}」 -- the entry is idle on a fresh table`, async () => {
    const stage = await withSearch(need())
    try {
      expect(await isEntryIdle(stage.page, PANEL, CLEAR)).toBe(true)
    } finally {
      await stage.close()
    }
  })

  test('IC-153 takes the filters and the sort away; the word, the Visibility check and the widths stay', async () => {
    const stage = await withSearch(need())
    try {
      const page = stage.page
      const all = await rowCount(page, PANEL)
      await page.keyboard.type('UAT')
      await settle(page)
      const wordRows = await rowCount(page, PANEL)
      expect(wordRows, 'premise: the word narrows the table').toBeLessThan(all)
      // STEP: check the Visibility box of the first row
      const firstBox = await boxOf(page, `${PANEL} tbody tr:first-child input[type="checkbox"]`)
      if (firstBox === null) throw new Error('premise: the first row has a Visibility box')
      await pressAt(page, firstBox.x + firstBox.width / 2, firstBox.y + firstBox.height / 2)
      const checkedBefore = await page.evaluate((window: string) => Array.from(document.querySelectorAll<HTMLInputElement>(`${window} tbody input[type="checkbox"]`)).map((one) => one.checked), PANEL)
      expect(checkedBefore.some(Boolean), 'premise: a row is checked').toBe(true)
      // STEP: drag SQ-11 wider, filter SQ-1, sort SQ-4
      const dragged = await dragBorder(page, PANEL, 'SQ-11', 40)
      await openFilter(page, PANEL, 'SQ-1')
      await uncheckFirstValue(page, PANEL)
      await pressMenuEntry(page, PANEL, 'IC-123')
      await page.keyboard.press('Escape')
      await settle(page)
      expect((await colourOfHeading(page, PANEL, 'SQ-1')).fill, 'premise: SQ-1 is painted').toBe(S_183.light)
      expect(await isEntryIdle(page, PANEL, CLEAR), 'the entry works now').toBe(false)
      const widthsBefore = await widthsOf(page, PANEL)
      await pressSelector(page, `${PANEL} [data-icon="${CLEAR}"]`)
      expect((await colourOfHeading(page, PANEL, 'SQ-1')).fill, 'the paint is gone').not.toBe(S_183.light)
      expect(await rowCount(page, PANEL), 'the rows are those of the word again').toBe(wordRows)
      expect(await wordFieldValue(page), 'the word stays').toBe('UAT')
      expect(
        await page.evaluate((window: string) => Array.from(document.querySelectorAll<HTMLInputElement>(`${window} tbody input[type="checkbox"]`)).map((one) => one.checked), PANEL),
        'the Visibility checks stay',
      ).toEqual(checkedBefore)
      expect(await widthsOf(page, PANEL), 'the widths stay').toEqual(widthsBefore)
      expect(Math.abs((widthsBefore['SQ-11'] ?? 0) - dragged.after), 'premise: the dragged width is the one kept').toBeLessThanOrEqual(1)
      expect(await isEntryIdle(page, PANEL, CLEAR), 'the entry is idle again').toBe(true)
    } finally {
      await stage.close()
    }
  })

  test('IC-153 pressed with nothing to clear changes nothing', async () => {
    const stage = await withSearch(need())
    try {
      const page = stage.page
      const widths = await widthsOf(page, PANEL)
      const rows = await rowCount(page, PANEL)
      const box: Box | null = await boxOf(page, `${PANEL} [data-icon="${CLEAR}"]`)
      if (box === null) throw new Error('premise: IC-153 is drawn')
      await pressAt(page, box.x + box.width / 2, box.y + box.height / 2)
      expect(await widthsOf(page, PANEL)).toEqual(widths)
      expect(await rowCount(page, PANEL)).toBe(rows)
    } finally {
      await stage.close()
    }
  })
})

test.describe('T-346 RW-2 -- Clear Filters on the report window', () => {
  test.setTimeout(240_000)

  test('a filtered report column is painted, IC-153 clears it, and the entry is idle again', async () => {
    const stage = await withReport(need())
    try {
      const page = stage.page
      expect(await isEntryIdle(page, REPORT, CLEAR), 'premise: idle on a fresh report').toBe(true)
      const rows = await rowCount(page, REPORT)
      await openFilter(page, REPORT, 'DT-1')
      await uncheckFirstValue(page, REPORT)
      await page.keyboard.press('Escape')
      await settle(page)
      expect((await colourOfHeading(page, REPORT, 'DT-1')).fill).toBe(S_183.light)
      expect(await rowCount(page, REPORT), 'premise: the filter narrows the report').toBeLessThan(rows)
      await pressSelector(page, `${REPORT} [data-icon="${CLEAR}"]`)
      expect((await colourOfHeading(page, REPORT, 'DT-1')).fill).not.toBe(S_183.light)
      expect(await rowCount(page, REPORT)).toBe(rows)
      expect(await isEntryIdle(page, REPORT, CLEAR)).toBe(true)
    } finally {
      await stage.close()
    }
  })
})
