// CR-721 on the shipped build: default widths are measured only on open, type size and language change; a dragged column keeps its width; a drag stops at the floor and at the area's right edge (T-330 SV-18, T-346 RW-9, T-206 S-425, S-496).

import { expect, test, type Browser, type Page } from '@playwright/test'
import { CLEARING_UP_MS, launchReferenceBrowser } from './live-app'
import {
  APP_HEADER,
  PANEL,
  REPORT,
  TEXT_SIZE,
  boxOf,
  cellOf,
  dragBorder,
  headingColumns,
  openFilter,
  pressSelector,
  settle,
  widthsOf,
  withReport,
  withSearch,
} from './cr-721-stage'

const SV_18_MEASURED =
  '⭐ 中身の字の幅が決まる列（ステータス・進捗・日付 —— `SQ-5`・`SQ-11`・`SQ-3`・`SQ-4`・`SQ-12`・`SQ-13`・`SQ-9`）の既定は、そのときの言語（`FR-038`）と字の段（`SV-16`）で、見出し（語と `IC-122`）も値も省略記号で切られない最小の幅とすること（MUST）'
const SV_18_WHEN = '測るのは、窓を開いたとき・`IC-127` で段を変えたとき・表示の言語を変えたときだけとし、ほかの時には測り直さない'
const SV_18_DRAGGED = '引いて変えた列は測り直さず、変えた幅を保つ。'
const SV_18_FOLLOW = '握っているあいだ、列の幅をポインタに追従させること（MUST）'
const SV_18_ABORT = '幅が決まるのは離した時点、中断では元の幅へ戻す'
const SV_18_FLOOR = '幅の下限は `S-425` —— 見出しのセルに `IC-122` の箱と、セルの左右の詰めと罫が入る幅を、そのときの段で測った値である'
const SV_18_RIGHT_EDGE =
  '境目を、表を出している領域の右の縁より右へ引いてはならない（MUST NOT）'
const SV_18_NOT_BY_STEP = '幅は画面の px であり、字の段（`S-429`）と表示の倍率（`S-234`）で変えない。'
const SV_18_VISIBILITY = '⭐ [表示] の列（`SQ-10`）は例外で、幅は `S-496` の固定の値とし、右の境目（`GR-28`）を持たない'
const S_425_ABOUT = '利用者が「フィルタマークの幅」と定めた（9px の段で約 23px）'

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

const MEASURED = ['SQ-5', 'SQ-11', 'SQ-3', 'SQ-4', 'SQ-12', 'SQ-13']
const TOLERANCE = 1

test.describe('CR-721 the manuscript these cases are driven by', () => {
  test('T-330 SV-18 and T-206 S-425 still say it, word for word', () => {
    const say = cellOf('T-330', 'SV-18', '定め')
    for (const clause of [SV_18_MEASURED, SV_18_WHEN, SV_18_DRAGGED, SV_18_FOLLOW, SV_18_ABORT, SV_18_FLOOR, SV_18_RIGHT_EDGE, SV_18_NOT_BY_STEP, SV_18_VISIBILITY]) {
      expect(say).toContain(clause)
    }
  })
})

/** @purity semi-pure-b */
async function fontPxOf(page: Page, window: string): Promise<number> {
  return page.evaluate((asked: string) => Number.parseFloat(getComputedStyle(document.querySelector(`${asked} thead th`) as Element).fontSize), window)
}

const unchanged = (before: Readonly<Record<string, number>>, after: Readonly<Record<string, number>>, columns: readonly string[]): void => {
  for (const column of columns) expect(Math.abs((after[column] ?? 0) - (before[column] ?? 0)), column).toBeLessThanOrEqual(TOLERANCE)
}

test.describe('T-330 SV-18 -- 測るのは、窓を開いたとき・段を変えたとき・言語を変えたときだけ', () => {
  test.setTimeout(240_000)

  test(`SV-18 「${SV_18_WHEN.slice(0, 30)}」 -- a word, a filter and a sort move no measured width`, async () => {
    const stage = await withSearch(need())
    try {
      const page = stage.page
      const opened = await widthsOf(page, PANEL)
      await page.keyboard.type('UAT')
      await settle(page)
      unchanged(opened, await widthsOf(page, PANEL), MEASURED)
      await openFilter(page, PANEL, 'SQ-5')
      await pressSelector(page, `${PANEL} [data-search-filter-menu] input[type="checkbox"]`)
      await pressSelector(page, `${PANEL} [data-search-filter-menu] [data-icon="IC-123"]`)
      await page.keyboard.press('Escape')
      await settle(page)
      unchanged(opened, await widthsOf(page, PANEL), MEASURED)
    } finally {
      await stage.close()
    }
  })

  test(`SV-18 「${SV_18_WHEN.slice(0, 30)}」 -- the type size step measures again; a fixed-px column does not move (${SV_18_NOT_BY_STEP.slice(0, 12)})`, async () => {
    const stage = await withSearch(need())
    try {
      const page = stage.page
      const opened = await widthsOf(page, PANEL)
      const fontBefore = await fontPxOf(page, PANEL)
      await pressSelector(page, `${PANEL} [data-icon="${TEXT_SIZE}"]`)
      const stepped = await widthsOf(page, PANEL)
      expect(await fontPxOf(page, PANEL), 'premise: the step enlarged the type').toBeGreaterThan(fontBefore)
      expect(MEASURED.some((column) => Math.abs((stepped[column] ?? 0) - (opened[column] ?? 0)) > TOLERANCE), 'a measured column is measured again at the new step').toBe(true)
      unchanged(opened, stepped, ['SQ-1', 'SQ-2', 'SQ-10'])
    } finally {
      await stage.close()
    }
  })

  test('RW-9: the report measures again at the type size step too', async () => {
    const stage = await withReport(need())
    try {
      const page = stage.page
      const opened = await widthsOf(page, REPORT)
      await pressSelector(page, `${REPORT} [data-icon="${TEXT_SIZE}"]`)
      const stepped = await widthsOf(page, REPORT)
      expect(['DT-1', 'DT-3', 'DT-5', 'DT-6'].some((column) => Math.abs((stepped[column] ?? 0) - (opened[column] ?? 0)) > TOLERANCE)).toBe(true)
      unchanged(opened, stepped, ['DT-2', 'DT-4', 'DT-7'])
    } finally {
      await stage.close()
    }
  })

  test(`SV-18 「${SV_18_DRAGGED}」 -- a dragged column keeps its width through every type size step`, async () => {
    const stage = await withSearch(need())
    try {
      const page = stage.page
      const drag = await dragBorder(page, PANEL, 'SQ-11', 60)
      expect(Math.abs(drag.after - drag.start - 60), 'premise: the drag took').toBeLessThanOrEqual(TOLERANCE)
      const kept = (await widthsOf(page, PANEL))['SQ-11'] ?? 0
      for (let step = 0; step < 3; step += 1) {
        await pressSelector(page, `${PANEL} [data-icon="${TEXT_SIZE}"]`)
        expect(Math.abs(((await widthsOf(page, PANEL))['SQ-11'] ?? 0) - kept), `step ${step + 1}`).toBeLessThanOrEqual(TOLERANCE)
      }
    } finally {
      await stage.close()
    }
  })

  test('SV-18: the display language change measures again (the status words change length)', async () => {
    const stage = await withSearch(need())
    try {
      const page = stage.page
      const opened = await widthsOf(page, PANEL)
      await pressSelector(page, `${APP_HEADER} [data-icon="IC-21"]`)
      await settle(page)
      const changed = await widthsOf(page, PANEL)
      expect(MEASURED.some((column) => Math.abs((changed[column] ?? 0) - (opened[column] ?? 0)) > TOLERANCE), 'a measured column follows the language').toBe(true)
      unchanged(opened, changed, ['SQ-1', 'SQ-2', 'SQ-10'])
    } finally {
      await stage.close()
    }
  })
})

test.describe('T-330 SV-18 / T-206 S-425 -- the floor and the right edge', () => {
  test.setTimeout(240_000)

  test(`SV-18 「${SV_18_FLOOR.slice(0, 20)}」 -- a drag far to the left stops at the filter mark plus the padding and the rule`, async () => {
    const stage = await withSearch(need())
    try {
      const page = stage.page
      const drag = await dragBorder(page, PANEL, 'SQ-4', -900)
      const heading = await boxOf(page, `${PANEL} thead th[data-column="SQ-4"] [data-icon="IC-122"]`)
      const font = await fontPxOf(page, PANEL)
      if (heading === null) throw new Error('premise: SQ-4 draws IC-122')
      const expected = heading.width + 2 * 0.25 * font + 1
      expect(drag.after, 'it stopped above nothing').toBeGreaterThan(0)
      expect(Math.abs(drag.after - expected), S_425_ABOUT).toBeLessThanOrEqual(2)
      expect(Math.abs(drag.held - expected), 'it already held the floor while the pointer was far left').toBeLessThanOrEqual(2)
      expect(Math.abs(drag.after - 23), S_425_ABOUT).toBeLessThanOrEqual(3)
    } finally {
      await stage.close()
    }
  })

  test('SV-18: a step change raises a narrower column to the new floor', async () => {
    const stage = await withSearch(need())
    try {
      const page = stage.page
      await dragBorder(page, PANEL, 'SQ-4', -900)
      for (let step = 0; step < 3; step += 1) {
        await pressSelector(page, `${PANEL} [data-icon="${TEXT_SIZE}"]`)
        const mark = await boxOf(page, `${PANEL} thead th[data-column="SQ-4"] [data-icon="IC-122"]`)
        const cell = (await headingColumns(page, PANEL)).find((one) => one.column === 'SQ-4')
        const font = await fontPxOf(page, PANEL)
        expect(cell?.box.width ?? 0, `step ${step + 1}`).toBeGreaterThanOrEqual((mark?.width ?? 0) + 2 * 0.25 * font + 1 - 1)
      }
    } finally {
      await stage.close()
    }
  })

  test(`SV-18 「${SV_18_ABORT}」 -- Esc during a drag puts the width back`, async () => {
    const stage = await withSearch(need())
    try {
      const page = stage.page
      const start = (await widthsOf(page, PANEL))['SQ-1'] ?? 0
      const cell = (await headingColumns(page, PANEL)).find((one) => one.column === 'SQ-1')
      if (cell === undefined) throw new Error('premise: SQ-1 has a heading')
      const from = { x: cell.box.right - 1, y: cell.box.y + cell.box.height / 2 }
      await page.mouse.move(from.x, from.y)
      await page.mouse.down()
      await page.mouse.move(from.x + 50, from.y, { steps: 5 })
      await page.waitForTimeout(200)
      expect(Math.abs(((await widthsOf(page, PANEL))['SQ-1'] ?? 0) - start - 50), 'premise: the width follows').toBeLessThanOrEqual(TOLERANCE)
      await page.keyboard.press('Escape')
      await page.mouse.up()
      await settle(page)
      expect(Math.abs(((await widthsOf(page, PANEL))['SQ-1'] ?? 0) - start), 'back to the width it had').toBeLessThanOrEqual(TOLERANCE)
    } finally {
      await stage.close()
    }
  })

  test(`SV-18 「${SV_18_RIGHT_EDGE}」`, async () => {
    const stage = await withSearch(need())
    try {
      const page = stage.page
      await dragBorder(page, PANEL, 'SQ-1', 3000)
      const panel = await boxOf(page, PANEL)
      const cell = (await headingColumns(page, PANEL)).find((one) => one.column === 'SQ-1')
      if (panel === null || cell === undefined) throw new Error('premise: the panel and SQ-1 are on the screen')
      expect(cell.box.right, SV_18_RIGHT_EDGE).toBeLessThanOrEqual(panel.right + 1)
    } finally {
      await stage.close()
    }
  })
})

test.describe('T-330 SV-18 / T-206 S-496 -- the Visibility column has no border to pull', () => {
  test.setTimeout(180_000)

  test(`SV-18 「${SV_18_VISIBILITY.slice(0, 30)}」`, async () => {
    const stage = await withSearch(need())
    try {
      const page = stage.page
      const fixed = Number(/^(\d+)px/.exec(cellOf('T-206', 'S-496', '既定'))?.[1])
      const start = (await widthsOf(page, PANEL))['SQ-10'] ?? 0
      expect(Math.abs(start - fixed), 'S-496').toBeLessThanOrEqual(TOLERANCE)
      const cell = (await headingColumns(page, PANEL)).find((one) => one.column === 'SQ-10')
      if (cell === undefined) throw new Error('premise: SQ-10 has a heading')
      await page.mouse.move(cell.box.right - 1, cell.box.y + 2)
      await page.mouse.down()
      await page.mouse.move(cell.box.right + 60, cell.box.y + 2, { steps: 5 })
      await page.mouse.up()
      await settle(page)
      expect(Math.abs(((await widthsOf(page, PANEL))['SQ-10'] ?? 0) - start), 'no border to pull').toBeLessThanOrEqual(TOLERANCE)
    } finally {
      await stage.close()
    }
  })
})
