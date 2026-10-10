// CR-721 on the shipped build: a press outside the open column filter closes it and is answered by what it hit; another column's IC-122 switches the filter (T-330 SV-7).

import { expect, test, type Browser } from '@playwright/test'
import { CLEARING_UP_MS, launchReferenceBrowser, readDrawnSvg, taskBodyPoint } from './live-app'
import {
  APP_HEADER,
  PANEL,
  TEXT_SIZE,
  boxOf,
  cellOf,
  headingColumns,
  menuCount,
  menuLeft,
  openFilter,
  pressAt,
  pressSelector,
  selectedTaskUids,
  settle,
  withSearch,
} from './cr-721-stage'

const SV_7_OUTSIDE = '外を押して閉じたときは、その押下を押した先（日程表のタスク・ほかの窓・`App Header`・同じ窓のほかの所）にも渡すこと（MUST）'
const SV_7_CLOSE = '⭐ 開いているフィルタは、同じ列の `IC-122` をもう一度押すか、`Esc`（`SV-14`）か、フィルタの箱の外を押すと閉じる。'
const SV_7_ONE_AT_A_TIME = '開いているフィルタは一度に 1 つ —— ほかの列の `IC-122` を押すと、その列のフィルタに替わる。'
const SV_7_DROPDOWN = 'フィルタは、押した列の見出しのセルの下に、表の上に重ねるドロップダウンとして開くこと（MUST）'

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

test.describe('CR-721 the manuscript these cases are driven by', () => {
  test('T-330 SV-7 still says it, word for word', () => {
    const say = cellOf('T-330', 'SV-7', '定め')
    for (const clause of [SV_7_OUTSIDE, SV_7_CLOSE, SV_7_ONE_AT_A_TIME, SV_7_DROPDOWN]) expect(say).toContain(clause)
  })
})

test.describe('T-330 SV-7 -- 外を押して閉じたときは、その押下を押した先にも渡す', () => {
  test.setTimeout(180_000)

  test(`SV-7 「${SV_7_OUTSIDE}」 -- a task on the schedule is selected by the very press that closes the filter`, async () => {
    const stage = await withSearch(need())
    try {
      const page = stage.page
      await openFilter(page, PANEL, 'SQ-2')
      expect(await menuCount(page, PANEL), 'premise: the filter is open').toBe(1)
      expect(await selectedTaskUids(page), 'premise: nothing is selected').toEqual([])
      const target = await taskBodyPoint(page)
      if (target === null) throw new Error('premise: a task body is on the schedule outside the panel')
      await pressAt(page, target.x, target.y)
      expect(await menuCount(page, PANEL), SV_7_CLOSE).toBe(0)
      expect(await selectedTaskUids(page), SV_7_OUTSIDE).toEqual([Number(target.uid)])
    } finally {
      await stage.close()
    }
  })

  test(`SV-7 「${SV_7_OUTSIDE}」 -- a press on the App Header answers there too (the time axis shrinks)`, async () => {
    const stage = await withSearch(need())
    try {
      const page = stage.page
      const before = await readDrawnSvg(page)
      await openFilter(page, PANEL, 'SQ-2')
      expect(await menuCount(page, PANEL), 'premise: the filter is open').toBe(1)
      await pressSelector(page, `${APP_HEADER} [data-icon="IC-12"]`)
      expect(await menuCount(page, PANEL)).toBe(0)
      expect(await readDrawnSvg(page), SV_7_OUTSIDE).not.toBe(before)
    } finally {
      await stage.close()
    }
  })

  test(`SV-7 「${SV_7_OUTSIDE}」 -- a press on another place of the same window answers there too (the text size steps)`, async () => {
    const stage = await withSearch(need())
    try {
      const page = stage.page
      const fontOf = async (): Promise<string> => page.evaluate((window: string) => getComputedStyle(document.querySelector(`${window} tbody td`) as Element).fontSize, PANEL)
      const before = await fontOf()
      await openFilter(page, PANEL, 'SQ-2')
      expect(await menuCount(page, PANEL), 'premise: the filter is open').toBe(1)
      await pressSelector(page, `${PANEL} [data-icon="${TEXT_SIZE}"]`)
      expect(await menuCount(page, PANEL)).toBe(0)
      expect(await fontOf(), SV_7_OUTSIDE).not.toBe(before)
    } finally {
      await stage.close()
    }
  })

  test('SV-7: a press on an empty place of the screen closes the filter', async () => {
    const stage = await withSearch(need())
    try {
      const page = stage.page
      await openFilter(page, PANEL, 'SQ-2')
      const panel = await boxOf(page, PANEL)
      const header = await boxOf(page, APP_HEADER)
      if (panel === null || header === null) throw new Error('premise: the panel and the header are on the screen')
      await pressAt(page, panel.right + 4, header.bottom + 2)
      expect(await menuCount(page, PANEL)).toBe(0)
    } finally {
      await stage.close()
    }
  })
})

test.describe('T-330 SV-7 -- 開いているフィルタは一度に 1 つ: another column\'s IC-122 switches to that column', () => {
  test.setTimeout(180_000)

  test(`SV-7 「${SV_7_ONE_AT_A_TIME}」 -- the second IC-122 leaves one filter, under its own heading`, async () => {
    const stage = await withSearch(need())
    try {
      const page = stage.page
      await openFilter(page, PANEL, 'SQ-2')
      expect(await menuCount(page, PANEL)).toBe(1)
      await openFilter(page, PANEL, 'SQ-5')
      expect(await menuCount(page, PANEL), 'one filter at a time').toBe(1)
      const heading = (await headingColumns(page, PANEL)).find((one) => one.column === 'SQ-5')
      const left = await menuLeft(page, PANEL)
      expect(heading, 'premise: SQ-5 has a heading').toBeDefined()
      expect(Math.abs((left ?? -999) - (heading?.box.x ?? 0)), SV_7_DROPDOWN).toBeLessThanOrEqual(2)
    } finally {
      await stage.close()
    }
  })

  test('SV-7: the same column\'s IC-122 pressed again closes it', async () => {
    const stage = await withSearch(need())
    try {
      const page = stage.page
      await openFilter(page, PANEL, 'SQ-5')
      expect(await menuCount(page, PANEL)).toBe(1)
      await openFilter(page, PANEL, 'SQ-5')
      expect(await menuCount(page, PANEL)).toBe(0)
      await settle(page)
    } finally {
      await stage.close()
    }
  })
})
