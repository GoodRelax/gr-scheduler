// CR-737 on the shipped build, from docs/spec only: the filter mark clears the column border and the pointer shapes show over the table windows.

import { expect, test, type Browser, type Page } from '@playwright/test'
import { CLEARING_UP_MS, launchReferenceBrowser } from './live-app'
import { PANEL, REPORT, cellOf, boxOf, headingColumns, openFilter, menuCount, settle, stageWith, withReport, withSearch, type Box, type Stage } from './cr-721-stage'
import { REQUIREMENTS, pressEntrance } from './cr-570-tree-state-stage'
import { bare, specTable, unbroken } from '../contract/spec-table'
import { rowOf } from './sws-case'

const SV_7_CLEAR =
  '右の境目（表 T-023d の `GR-28`）を持つ列では、`IC-122` を境目から、境目の掴み代の片側の幅（`_assets/tbl-settings.md` の `S-465`）にセルの右の詰め（0.25em）を足しただけ内側に立てる'
const SV_7_WHY = '掴み代の上に入口を置くと、境目の線の左を狙った押下が入口に取られ、列の幅が変わらない'
const SV_7_WIDTH_FLOOR = '列の幅の下限は、この離れの分だけ広い（`SV-18`）'
const SV_7_WORD = '見出しのセルの語を押したときも、`IC-122` を押したものとして同じに答えること（MUST） —— ただし列の境目の掴み代（表 T-023d の `GR-28`）の上では掴み代が答える'
const GR_28_ANSWER = '⚠️ 入口（`IC-122`）は帯の外に立てる（`FR-151` の 表 T-330 の `SV-7`）—— 帯の上では、見出しの語の上でも境目が答える。'
const S_425_NOTE = '`IC-122` を列の境目の掴み代の外に立てる離れ（`S-465`、表 T-330 の `SV-7`）と、罫 1px が入る幅を、そのときの字の段（`S-429`）で測る'
const FR_106_HELD = '押しているあいだは、掴んだときの形を保つこと（MUST）。'
const FR_106_TABLES = '3 つの表のウィンドウ（検索パネル・遅延診断レポート・担当リスト）の列の境目（表 T-023d の `GR-28`）でも、表 T-269 の `PK-10` とすること（MUST）'
const FR_106_EDGES =
  'ウィンドウの縁の掴み代（表 T-023d の `GR-25`）では、左と右の辺は 表 T-269 の `PK-12`、上と下の辺は `PK-13`、左上と右下の角は `PK-14`、右上と左下の角は `PK-15` とすること（MUST）'

const T_103 = specTable('T-103')
const RESOURCE_LIST = `[data-role="${bare(rowOf(T_103, 'U-49').cells[0] ?? '')}"]`
const OPEN_RESOURCE_LIST = rowOf(specTable('T-109'), 'IC-62').id
const FILTER = 'IC-122'

const pxOf = (text: string): number => Number(/(\d+(?:\.\d+)?)\s*px/.exec(text)?.[1])
const wholeRow = (table: string, id: string): string => unbroken(rowOf(specTable(table), id).cells.join(' '))
const BAND = pxOf(wholeRow('T-206', 'S-465'))
const EDGE = pxOf(wholeRow('T-206', 'S-426'))
const PAD_EM = 0.25
const RULE_PX = 1
const TOLERANCE_PX = 0.6

// WHY: SQ-10, DT-8 and RQ-1 hold a fixed width and have no right border (SV-18, RW-9, RO-9)
const NO_BORDER = new Set(['SQ-10', 'DT-8', 'RQ-1'])

interface Window {
  readonly name: string
  readonly selector: string
  open(browser: Browser): Promise<Stage>
}

/** @purity non-pure */
async function withResourceList(browser: Browser): Promise<Stage> {
  const stage = await stageWith(browser)
  expect(await pressEntrance(stage.page, OPEN_RESOURCE_LIST), 'IC-62 is on the screen').toBe(true)
  await expect(stage.page.locator(RESOURCE_LIST)).toBeVisible()
  await settle(stage.page)
  return stage
}

const WINDOWS: readonly Window[] = [
  { name: 'Search Panel', selector: PANEL, open: (browser) => withSearch(browser) },
  { name: 'Delay Diagnostics Report', selector: REPORT, open: (browser) => withReport(browser) },
  { name: 'Resource List', selector: RESOURCE_LIST, open: withResourceList },
]

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

test.describe('CR-737 the manuscript these cases are driven by', () => {
  test('T-330 SV-7 still says where IC-122 stands and who answers on the band', () => {
    const say = cellOf('T-330', 'SV-7', '定め')
    for (const clause of [SV_7_CLEAR, SV_7_WHY, SV_7_WIDTH_FLOOR, SV_7_WORD]) expect(say).toContain(clause)
  })
  test('T-023d GR-28 still says the band sits on the border and IC-122 stands outside it', () => {
    expect(cellOf('T-023d', 'GR-28', '操作')).toContain(GR_28_ANSWER)
  })
  test('T-206 S-425 still counts the clearance into the floor, and S-465 / S-426 are px values', () => {
    expect(wholeRow('T-206', 'S-425')).toContain(S_425_NOTE)
    expect(BAND).toBeGreaterThan(0)
    expect(EDGE).toBeGreaterThan(0)
  })
  test('FR-106 still names PK-10 for the table borders, PK-12..PK-15 for the window edges, and the held shape', () => {
    for (const clause of [FR_106_HELD, FR_106_TABLES, FR_106_EDGES]) expect(REQUIREMENTS).toContain(clause)
  })
})

interface Column {
  readonly column: string
  readonly box: Box
  readonly mark: Box
  readonly fontPx: number
}

/** @purity semi-pure-b */
async function columnsOf(page: Page, window: string): Promise<readonly Column[]> {
  return page.evaluate(
    (asked: { window: string; filter: string }) => {
      const out: Column[] = []
      for (const cell of Array.from(document.querySelectorAll(`${asked.window} thead th`))) {
        const mark = cell.querySelector(`[data-icon="${asked.filter}"]`)
        if (mark === null) continue
        const read = (one: Element): Box => {
          const r = one.getBoundingClientRect()
          return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height }
        }
        out.push({ column: cell.getAttribute('data-column') ?? '', box: read(cell), mark: read(mark), fontPx: Number.parseFloat(getComputedStyle(cell).fontSize) })
      }
      return out
    },
    { window, filter: FILTER },
  )
}

// WHY: the first, the middle and the last bordered column that lies clear of the window's right edge (GR-25 wins there)
/** @purity non-pure */
async function borderedColumns(page: Page, window: string): Promise<readonly Column[]> {
  const win = await boxOf(page, window)
  if (win === null) throw new Error(`${window} is not on the screen`)
  const all = (await columnsOf(page, window)).filter((one) => !NO_BORDER.has(one.column) && one.box.right + BAND + EDGE + 2 < win.right && one.box.right > win.x + 2)
  if (all.length <= 3) return all
  return [all[0] as Column, all[Math.floor(all.length / 2)] as Column, all[all.length - 1] as Column]
}

/** @purity non-pure */
async function frame(page: Page): Promise<void> {
  await page.evaluate(() => new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => done()))))
  await page.waitForTimeout(60)
}

/** @purity non-pure */
async function shapeAt(page: Page, x: number, y: number): Promise<string> {
  await page.mouse.move(x, y)
  return shapeHere(page, x, y)
}

/** @purity non-pure */
async function shapeHere(page: Page, x: number, y: number): Promise<string> {
  await frame(page)
  return page.evaluate(
    (at: { x: number; y: number }) => {
      const hit = document.elementFromPoint(at.x, at.y)
      return hit === null ? '(nothing)' : getComputedStyle(hit).cursor
    },
    { x, y },
  )
}

/** @purity semi-pure-b */
async function shapeMarked(page: Page): Promise<boolean> {
  return page.evaluate(() => document.querySelector('[data-pointer-shape-shown]') !== null)
}

/** @purity semi-pure-b */
async function underMark(page: Page, x: number, y: number): Promise<boolean> {
  return page.evaluate((at: { x: number; y: number }) => document.elementFromPoint(at.x, at.y)?.closest('[data-icon="IC-122"]') != null, { x, y })
}

const middleOf = (one: Box): number => one.y + one.height / 2

// WHY: offsets inside the S-465 band, kept 1px clear of its rim for sub-pixel layout
const OFFSETS: readonly number[] = [-(BAND - 1), -Math.round(BAND / 2), -1, 0, 1, Math.round(BAND / 2), BAND - 1]

for (const win of WINDOWS) {
  test.describe(`CR-737 ${win.name}: the column border`, () => {
    test.setTimeout(240_000)

    test(`GR-28 / PK-10: col-resize anywhere within S-465 left and right of a border`, async () => {
      const stage = await win.open(need())
      try {
        const page = stage.page
        const columns = await borderedColumns(page, win.selector)
        expect(columns.length, 'premise: the window shows bordered columns').toBeGreaterThan(0)
        for (const one of columns) {
          const y = middleOf(one.box)
          for (const offset of OFFSETS) {
            expect(await shapeAt(page, one.box.right + offset, y), `${one.column} at ${String(offset)}px from its right border`).toBe('col-resize')
          }
          expect(await shapeMarked(page), `${one.column}: a shown shape is marked on the UI parts root`).toBe(true)
        }
      } finally {
        await stage.close()
      }
    })

    test(`SV-7: IC-122 ends at least S-465 + 0.25em from the border, and pressing it opens the filter`, async () => {
      const stage = await win.open(need())
      try {
        const page = stage.page
        const columns = (await columnsOf(page, win.selector)).filter((one) => !NO_BORDER.has(one.column))
        expect(columns.length, 'premise: the window shows bordered columns').toBeGreaterThan(0)
        for (const one of columns) {
          const gap = one.box.right - one.mark.right
          expect(gap, `${one.column}: the gap between IC-122 and the border`).toBeGreaterThanOrEqual(BAND + PAD_EM * one.fontPx - TOLERANCE_PX)
          expect(await shapeAt(page, one.mark.x + one.mark.width / 2, middleOf(one.mark)), `${one.column}: over IC-122 itself the shape is not the border's`).not.toBe('col-resize')
        }
        const first = columns[0]
        if (first === undefined) throw new Error('premise: a bordered column')
        await openFilter(page, win.selector, first.column)
        expect(await menuCount(page, win.selector), 'pressing the mark opens the filter').toBe(1)
      } finally {
        await stage.close()
      }
    })

    test(`SV-7 / SV-18: a press within the band, left or right of the border, changes the width and opens no filter`, async () => {
      const stage = await win.open(need())
      try {
        const page = stage.page
        const target = (await borderedColumns(page, win.selector))[0]
        if (target === undefined) throw new Error('premise: a bordered column')
        const widthOf = async (): Promise<number> => (await headingColumns(page, win.selector)).find((one) => one.column === target.column)?.box.width ?? 0
        for (const offset of [-(BAND - 1), -Math.round(BAND / 2), 1, Math.round(BAND / 2)]) {
          const before = await widthOf()
          const cell = (await headingColumns(page, win.selector)).find((one) => one.column === target.column)
          if (cell === undefined) throw new Error('premise: the column is drawn')
          const from = { x: cell.box.right + offset, y: middleOf(cell.box) }
          await page.mouse.move(from.x, from.y)
          await page.mouse.down()
          await page.mouse.move(from.x + 20, from.y, { steps: 4 })
          await page.mouse.move(from.x + 40, from.y, { steps: 4 })
          await page.waitForTimeout(200)
          await page.mouse.up()
          await settle(page)
          const grown = (await widthOf()) - before
          expect(grown, `a drag from ${String(offset)}px of the border widens the column`).toBeGreaterThan(40 - BAND - 1)
          expect(grown, `a drag from ${String(offset)}px of the border widens the column by about the pull`).toBeLessThan(40 + BAND + 1)
          expect(await menuCount(page, win.selector), 'the press did not open the filter').toBe(0)
        }
      } finally {
        await stage.close()
      }
    })

    test(`S-425 / SV-18: the floor is the mark plus both paddings plus S-465 plus the rule, and the mark stays clear and pressable there`, async () => {
      const stage = await win.open(need())
      try {
        const page = stage.page
        const target = (await borderedColumns(page, win.selector))[0]
        if (target === undefined) throw new Error('premise: a bordered column')
        const others = async (): Promise<number[]> => (await headingColumns(page, win.selector)).filter((one) => one.column !== target.column).map((one) => Math.round(one.box.width))
        const before = await others()
        const cell = (await headingColumns(page, win.selector)).find((one) => one.column === target.column)
        if (cell === undefined) throw new Error('premise: the column is drawn')
        const from = { x: cell.box.right - 1, y: middleOf(cell.box) }
        await page.mouse.move(from.x, from.y)
        await page.mouse.down()
        await page.mouse.move(from.x - 150, from.y, { steps: 6 })
        await page.mouse.move(from.x - 900, from.y, { steps: 6 })
        await page.waitForTimeout(300)
        await page.mouse.up()
        await settle(page)
        const after = (await columnsOf(page, win.selector)).find((one) => one.column === target.column)
        if (after === undefined) throw new Error('premise: the column is still drawn')
        const expected = after.mark.width + 2 * PAD_EM * after.fontPx + BAND + RULE_PX
        expect(Math.abs(after.box.width - expected), `S-425: floor ${String(after.box.width)} against ${String(expected)}`).toBeLessThanOrEqual(2)
        expect(after.box.width, 'S-425: about 29px at the 9px step').toBeGreaterThanOrEqual(27)
        expect(after.box.width, 'S-425: about 29px at the 9px step').toBeLessThanOrEqual(32)
        expect(after.fontPx, 'premise: the 9px step (S-429)').toBe(9)
        expect(after.box.right - after.mark.right, 'SV-7: still S-465 + 0.25em clear of the border at the floor').toBeGreaterThanOrEqual(BAND + PAD_EM * after.fontPx - TOLERANCE_PX)
        expect(after.mark.x, 'the mark is not clipped on the left').toBeGreaterThanOrEqual(after.box.x - TOLERANCE_PX)
        expect(await others(), 'the other columns keep their widths').toEqual(before)
        await openFilter(page, win.selector, target.column)
        expect(await menuCount(page, win.selector), 'the mark at the floor still opens the filter').toBe(1)
      } finally {
        await stage.close()
      }
    })

    test(`FR-106: while the border is held, col-resize stays over a mark, over the schedule and after leaving the window; it ends with the release`, async () => {
      const stage = await win.open(need())
      try {
        const page = stage.page
        const columns = await borderedColumns(page, win.selector)
        const target = columns[columns.length - 1]
        if (target === undefined) throw new Error('premise: a bordered column')
        const win0 = await boxOf(page, win.selector)
        if (win0 === null) throw new Error('premise: the window is on the screen')
        const all = await columnsOf(page, win.selector)
        const cell = all.find((one) => one.column === target.column)
        if (cell === undefined) throw new Error('premise: the column is drawn')
        const y = middleOf(cell.box)
        await page.mouse.move(cell.box.right - Math.round(BAND / 2), y)
        await page.mouse.down()
        await page.mouse.move(cell.box.right - 60, y, { steps: 6 })
        expect(await shapeHere(page, cell.box.right - 60, y), 'held, moving left').toBe('col-resize')
        // WHY: pulling far left stops the border at the floor, so the pointer then travels over this column's own mark and the earlier columns' marks, which stay put.
        await page.mouse.move(cell.box.x - 900 < 0 ? 0 : cell.box.x - 900, y, { steps: 6 })
        const ownMark = (await columnsOf(page, win.selector)).find((one) => one.column === target.column)
        if (ownMark === undefined) throw new Error('premise: the column is still drawn')
        const markAt = { x: ownMark.mark.x + ownMark.mark.width / 2, y: middleOf(ownMark.mark) }
        await page.mouse.move(markAt.x, markAt.y, { steps: 4 })
        expect(await underMark(page, markAt.x, markAt.y), 'premise: the pointer is over a filter mark').toBe(true)
        expect(await shapeHere(page, markAt.x, markAt.y), 'held, over a mark').toBe('col-resize')
        expect(await shapeMarked(page), 'held: the shape stays marked').toBe(true)
        const earlier = (await columnsOf(page, win.selector)).filter((one) => one.box.right <= ownMark.box.x + 1 && one.column !== target.column)
        const earlierMark = earlier[earlier.length - 1]
        if (earlierMark !== undefined) {
          const at = { x: earlierMark.mark.x + earlierMark.mark.width / 2, y: middleOf(earlierMark.mark) }
          await page.mouse.move(at.x, at.y, { steps: 4 })
          expect(await underMark(page, at.x, at.y), 'premise: over the earlier column mark').toBe(true)
          expect(await shapeHere(page, at.x, at.y), 'held, over an earlier column mark').toBe('col-resize')
        }
        const outside = { x: Math.max(4, win0.x - 40), y: Math.min(win0.y + 120, win0.bottom - 10) }
        await page.mouse.move(outside.x, outside.y, { steps: 6 })
        expect(await shapeHere(page, outside.x, outside.y), 'held, outside the window').toBe('col-resize')
        await page.mouse.up()
        await settle(page)
        expect(await menuCount(page, win.selector), 'a drag released over a mark opens no filter').toBe(0)
        expect(await shapeAt(page, outside.x + 1, outside.y + 1), 'released: the border shape is gone away from the border').not.toBe('col-resize')
      } finally {
        await stage.close()
      }
    })
  })

  test.describe(`CR-737 ${win.name}: the window edge`, () => {
    test.setTimeout(240_000)

    test(`GR-25 / PK-12..PK-15: the edges and corners show their resize shapes, inside and outside the edge`, async () => {
      const stage = await win.open(need())
      try {
        const page = stage.page
        const box = await boxOf(page, win.selector)
        if (box === null) throw new Error('premise: the window is on the screen')
        const view = page.viewportSize()
        const near = 2
        const midX = box.x + box.width / 2
        const midY = box.y + box.height / 2
        const cases: readonly (readonly [string, number, number, string])[] = [
          ['left edge, inside', box.x + near, midY, 'ew-resize'],
          ['left edge, outside', box.x - near, midY, 'ew-resize'],
          ['right edge, inside', box.right - near, midY, 'ew-resize'],
          ['right edge, outside', box.right + near, midY, 'ew-resize'],
          ['top edge, outside', midX, box.y - near, 'ns-resize'],
          ['top left corner, outside', box.x - near, box.y - near, 'nwse-resize'],
          ['top right corner, outside', box.right + near, box.y - near, 'nesw-resize'],
          ['bottom edge, inside', midX, box.bottom - near, 'ns-resize'],
          ['bottom edge, outside', midX, box.bottom + near, 'ns-resize'],
          ['bottom right corner, inside', box.right - near, box.bottom - near, 'nwse-resize'],
          ['bottom right corner, outside', box.right + near, box.bottom + near, 'nwse-resize'],
          ['bottom left corner, inside', box.x + near, box.bottom - near, 'nesw-resize'],
          ['bottom left corner, outside', box.x - near, box.bottom + near, 'nesw-resize'],
        ]
        // WHY: a window that sits against the screen's edge has no outside to point at there
        const seen = cases.filter(([, x, y]) => x >= 0 && y >= 0 && x < (view?.width ?? 0) && y < (view?.height ?? 0))
        expect(seen.length, `premise: the edge points on the screen for ${JSON.stringify(box)}`).toBeGreaterThanOrEqual(6)
        for (const [what, x, y, expected] of seen) expect(await shapeAt(page, x, y), what).toBe(expected)
      } finally {
        await stage.close()
      }
    })

    test(`FR-106: a held edge keeps its shape while the pointer travels over the window and the schedule`, async () => {
      const stage = await win.open(need())
      try {
        const page = stage.page
        const box = await boxOf(page, win.selector)
        if (box === null) throw new Error('premise: the window is on the screen')
        const y = box.y + box.height / 2
        await page.mouse.move(box.x + 2, y)
        await frame(page)
        await page.mouse.down()
        await page.mouse.move(box.x + 60, y, { steps: 5 })
        expect(await shapeHere(page, box.x + 60, y), 'held on the left edge, now inside the window').toBe('ew-resize')
        await page.mouse.move(box.x - 60 < 4 ? 4 : box.x - 60, y, { steps: 5 })
        expect(await shapeHere(page, box.x - 60 < 4 ? 4 : box.x - 60, y), 'held on the left edge, now outside the window').toBe('ew-resize')
        await page.mouse.up()
        await settle(page)
      } finally {
        await stage.close()
      }
    })
  })
}
