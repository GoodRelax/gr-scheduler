// CR-762 on the shipped build, from docs/spec only: a GR-28 border pull follows the pointer frame by frame and stops left of the scrollbar.

import { chromium, expect, test, type Browser, type Page } from '@playwright/test'
import { CLEARING_UP_MS } from './live-app'
import { PANEL, REPORT, cellOf, settle, stageWith, withReport, withSearch, type Stage } from './cr-721-stage'
import { REQUIREMENTS, pressEntrance } from './cr-570-tree-state-stage'
import { bare, specTable, unbroken } from '../contract/spec-table'
import { rowOf } from './sws-case'

const SV_18_FOLLOW = '握っているあいだ、列の幅をポインタに追従させること（MUST）'
const SV_18_ABORT = '幅が決まるのは離した時点、中断では元の幅へ戻す'
const SV_18_OTHERS = 'その境目の左の列の幅を変える —— ほかの列の幅は変えず、右の列はその分だけ動く。'
const SV_18_FLOOR = '幅の下限は `S-425` —— 見出しのセルに `IC-122` の箱と、セルの左右の詰めと罫が入る幅を、そのときの段で測った値である'
const SV_18_RIGHT_EDGE = '境目を、表を出している領域の右の縁より右へ引いてはならない（MUST NOT）'
const SV_18_SCROLLBAR = '⭐ 領域の右の縁は、縦のスクロールバーが出ているときはその左の縁とし、スクロールバーは領域に入れない'
const SV_18_UNDER_SCROLLBAR = 'スクロールバーの下の境目は見えず、そこを押せばスクロールバーが答える'
const RW_9_SAME = '`SV-18` と同じとし、列は 表 T-347 の列とする。'
const RO_9_SAME = '表 T-371 の 5 列に `RW-9` を当てる'
const MC_8_FLOATING = '浮くウィンドウ（`FR-036` の 表 T-335）の中の掴み（表 T-023d の `GR-24`・`GR-25`・`GR-28`）を引くあいだも含む'

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

const STEP_PX = 5
const STEPS = 20
// WHY: a drawn width is a layout number; one px covers subpixel rounding of the cell box.
const TOLERANCE = 1
// WHY: the floor is measured by the app at the current type step, and this file rebuilds it from SV-7's parts (cr-721 used 2 too).
const FLOOR_TOLERANCE = 2

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

// WHY: Chromium hides scrollbars under automation by default, and SV-18's ceiling is the scrollbar's left edge, so it must be drawn.
// The channel is the one tests/system/live-app.ts names for T-025 MC-5.
test.beforeAll(async () => {
  browser = await chromium.launch({ channel: 'msedge', ignoreDefaultArgs: ['--hide-scrollbars'] })
})

test.afterAll(async () => {
  test.setTimeout(CLEARING_UP_MS)
  await browser?.close()
})

const need = (): Browser => {
  if (browser === null) throw new Error('no browser')
  return browser
}

test.describe('CR-762 the manuscript these cases are driven by', () => {
  test('T-330 SV-18 still says follow, abort, floor, the right edge and the scrollbar, word for word', () => {
    const say = cellOf('T-330', 'SV-18', '定め')
    for (const clause of [SV_18_FOLLOW, SV_18_ABORT, SV_18_OTHERS, SV_18_FLOOR, SV_18_RIGHT_EDGE, SV_18_SCROLLBAR, SV_18_UNDER_SCROLLBAR]) {
      expect(say).toContain(clause)
    }
  })
  test('RW-9 and RO-9 still take SV-18 over, and MC-8 still counts a GR-28 pull', () => {
    expect(REQUIREMENTS).toContain(RW_9_SAME)
    expect(REQUIREMENTS).toContain(RO_9_SAME)
    expect(REQUIREMENTS).toContain(MC_8_FLOATING)
    expect(BAND).toBeGreaterThan(0)
    expect(EDGE).toBeGreaterThan(0)
  })
})

interface Area {
  readonly left: number
  readonly right: number
  readonly top: number
  readonly bottom: number
  readonly scrollbar: number
  readonly scrollsDown: boolean
  readonly maxScrollLeft: number
}

interface Heading {
  readonly column: string
  readonly left: number
  readonly right: number
  readonly top: number
  readonly bottom: number
  readonly width: number
  readonly dataWidth: number
  readonly fixed: boolean
  readonly noBorder: boolean
  readonly markWidth: number
  readonly fontPx: number
}

interface Reading {
  readonly area: Area
  readonly headings: readonly Heading[]
}

// WHY: read inside a requestAnimationFrame callback -- the first frame after the input was delivered (SV-18 follow).
/** @purity semi-pure-b */
async function readFrame(page: Page, window: string, nextFrame: boolean): Promise<Reading> {
  return page.evaluate(
    (asked: { window: string; filter: string; nextFrame: boolean }) => {
      const read = (): Reading => {
        const box = document.querySelector(`${asked.window} [data-table-box]`) as HTMLElement | null
        if (box === null) throw new Error(`${asked.window} holds no [data-table-box]`)
        const r = box.getBoundingClientRect()
        const style = getComputedStyle(box)
        const borders = Number.parseFloat(style.borderLeftWidth) + Number.parseFloat(style.borderRightWidth)
        const area: Area = {
          left: r.left + box.clientLeft,
          right: r.left + box.clientLeft + box.clientWidth,
          top: r.top,
          bottom: r.bottom,
          scrollbar: box.offsetWidth - box.clientWidth - borders,
          scrollsDown: box.scrollHeight > box.clientHeight,
          maxScrollLeft: box.scrollWidth - box.clientWidth,
        }
        const headings = Array.from(box.querySelectorAll('thead th[data-column]')).map((cell) => {
          const c = cell.getBoundingClientRect()
          const mark = cell.querySelector(`[data-icon="${asked.filter}"]`)
          return {
            column: cell.getAttribute('data-column') ?? '',
            left: c.left,
            right: c.right,
            top: c.top,
            bottom: c.bottom,
            width: c.width,
            dataWidth: Number(cell.getAttribute('data-width')),
            fixed: cell.getAttribute('data-fixed-column') === 'true',
            noBorder: cell.hasAttribute('data-no-border'),
            markWidth: mark === null ? 0 : mark.getBoundingClientRect().width,
            fontPx: Number.parseFloat(getComputedStyle(cell).fontSize),
          }
        })
        return { area, headings }
      }
      if (!asked.nextFrame) return read()
      return new Promise<Reading>((done, fail) =>
        requestAnimationFrame(() => {
          try {
            done(read())
          } catch (thrown) {
            fail(thrown)
          }
        }),
      )
    },
    { window, filter: FILTER, nextFrame },
  )
}

const headingOf = (reading: Reading, column: string): Heading => {
  const found = reading.headings.find((one) => one.column === column)
  if (found === undefined) throw new Error(`no heading ${column}`)
  return found
}

// see SV-18, SV-7, S-425
const floorOf = (heading: Heading): number => heading.markWidth + 2 * PAD_EM * heading.fontPx + BAND + RULE_PX

const clamp = (value: number, low: number, high: number): number => Math.min(Math.max(value, low), high)

interface Pull {
  readonly column: string
  readonly start: number
  readonly floor: number
  readonly ceiling: number
  readonly misses: readonly string[]
  readonly last: number
  readonly lastExpected: number
}

// see SV-18, GR-28
/** @purity non-pure */
async function pull(page: Page, window: string, column: string, step: number): Promise<Pull> {
  const before = await readFrame(page, window, false)
  const cell = headingOf(before, column)
  const at = { x: cell.right - 1, y: (cell.top + cell.bottom) / 2 }
  await page.mouse.move(at.x, at.y)
  await page.mouse.down()
  const pressed = await readFrame(page, window, true)
  const start = headingOf(pressed, column).width
  const floor = floorOf(headingOf(pressed, column))
  const ceiling = start + (pressed.area.right - headingOf(pressed, column).right)
  const misses: string[] = []
  let last = start
  let lastExpected = start
  for (let i = 1; i <= STEPS; i += 1) {
    await page.mouse.move(at.x + step * i, at.y)
    const now = await readFrame(page, window, true)
    const drawn = headingOf(now, column)
    const expected = clamp(start + step * i, floor, ceiling)
    const allowed = Math.abs(expected - floor) < 0.01 ? FLOOR_TOLERANCE : TOLERANCE
    if (Math.abs(drawn.width - expected) > allowed) {
      misses.push(`move ${i} (${step * i}px): drew ${drawn.width.toFixed(1)}px, expected ${expected.toFixed(1)}px`)
    }
    if (Math.abs(drawn.dataWidth - drawn.width) > TOLERANCE) {
      misses.push(`move ${i}: data-width ${drawn.dataWidth} disagrees with the drawn ${drawn.width.toFixed(1)}px`)
    }
    last = drawn.width
    lastExpected = expected
  }
  return { column, start, floor, ceiling, misses, last, lastExpected }
}

// WHY: the first bordered column whose border lies inside the area, clear of the window edge (GR-25 answers there).
/** @purity semi-pure-b */
async function firstBorderedColumn(page: Page, window: string): Promise<string> {
  const reading = await readFrame(page, window, false)
  const found = reading.headings.find(
    (one) => !one.noBorder && one.right > reading.area.left + 2 && one.right + BAND + EDGE + 2 < reading.area.right,
  )
  if (found === undefined) throw new Error(`${window} draws no bordered column inside its area`)
  return found.column
}

const widthsBy = (reading: Reading): Readonly<Record<string, number>> =>
  Object.fromEntries(reading.headings.map((one) => [one.column, Math.round(one.width * 10) / 10]))

test.describe(`T-330 SV-18 「${SV_18_FOLLOW}」 -- the width follows on the next frame in every table window`, () => {
  test.setTimeout(240_000)

  for (const window of WINDOWS) {
    test(`${window.name}: ${STEPS} moves of ${STEP_PX}px to the right follow frame by frame, and Esc puts the width back (${SV_18_ABORT})`, async () => {
      const stage = await window.open(need())
      try {
        const page = stage.page
        const column = await firstBorderedColumn(page, window.selector)
        const opened = widthsBy(await readFrame(page, window.selector, false))
        const right = await pull(page, window.selector, column, STEP_PX)
        expect(right.misses, `${column}: start ${right.start.toFixed(1)}, floor ${right.floor.toFixed(1)}, ceiling ${right.ceiling.toFixed(1)}`).toEqual([])
        expect(right.last - right.start, 'premise: the pull widened the column').toBeGreaterThan(STEP_PX)
        await page.keyboard.press('Escape')
        const aborted = await readFrame(page, window.selector, true)
        expect(Math.abs(headingOf(aborted, column).width - right.start), 'Esc while held: back to the width at press').toBeLessThanOrEqual(TOLERANCE)
        await page.mouse.up()
        await settle(page)
        const after = widthsBy(await readFrame(page, window.selector, false))
        for (const [name, width] of Object.entries(opened)) {
          expect(Math.abs((after[name] ?? 0) - width), `${name} after Esc and release`).toBeLessThanOrEqual(TOLERANCE)
        }
      } finally {
        await stage.close()
      }
    })

    test(`${window.name}: ${STEPS} moves of ${STEP_PX}px to the left follow frame by frame down to the floor, and a release keeps the width`, async () => {
      const stage = await window.open(need())
      try {
        const page = stage.page
        const column = await firstBorderedColumn(page, window.selector)
        const opened = widthsBy(await readFrame(page, window.selector, false))
        const left = await pull(page, window.selector, column, -STEP_PX)
        expect(left.misses, `${column}: start ${left.start.toFixed(1)}, floor ${left.floor.toFixed(1)}, ceiling ${left.ceiling.toFixed(1)}`).toEqual([])
        await page.mouse.up()
        await settle(page)
        const after = await readFrame(page, window.selector, false)
        expect(Math.abs(headingOf(after, column).width - left.last), 'the release keeps the width it drew last').toBeLessThanOrEqual(TOLERANCE)
        const widths = widthsBy(after)
        for (const [name, width] of Object.entries(opened)) {
          if (name === column) continue
          expect(Math.abs((widths[name] ?? 0) - width), `${SV_18_OTHERS} -- ${name}`).toBeLessThanOrEqual(TOLERANCE)
        }
      } finally {
        await stage.close()
      }
    })
  }
})

test.describe(`T-330 SV-18 「${SV_18_SCROLLBAR}」`, () => {
  test.setTimeout(240_000)

  test(`Search Panel: the last fixed column pulled far right never draws its border right of the scrollbar's left edge (${SV_18_RIGHT_EDGE})`, async () => {
    const stage = await withSearch(need())
    try {
      const page = stage.page
      const opened = await readFrame(page, PANEL, false)
      expect(opened.area.scrollsDown, 'premise: the table has more rows than the area shows').toBe(true)
      expect(opened.area.scrollbar, 'premise: the vertical scrollbar is drawn (--hide-scrollbars is off)').toBeGreaterThan(0)
      const fixed = opened.headings.filter((one) => one.fixed && !one.noBorder)
      const last = fixed.reduce<Heading | null>((best, one) => (best === null || one.right > best.right ? one : best), null)
      if (last === null) throw new Error('premise: SV-6 fixes a bordered column (data-fixed-column)')
      const at = { x: last.right - 1, y: (last.top + last.bottom) / 2 }
      await page.mouse.move(at.x, at.y)
      await page.mouse.down()
      const overs: string[] = []
      for (let i = 1; i <= 30; i += 1) {
        await page.mouse.move(at.x + 100 * i, at.y)
        const now = await readFrame(page, PANEL, true)
        const drawn = headingOf(now, last.column)
        if (drawn.right > now.area.right + 0.5) {
          overs.push(`move ${i}: border at ${drawn.right.toFixed(1)}, area right ${now.area.right.toFixed(1)} (scrollbar ${now.area.scrollbar}px)`)
        }
      }
      expect(overs, SV_18_RIGHT_EDGE).toEqual([])
      await page.mouse.up()
      await settle(page)
      const after = await readFrame(page, PANEL, false)
      const kept = headingOf(after, last.column)
      expect(kept.right, `${last.column} after release: ${SV_18_SCROLLBAR}`).toBeLessThanOrEqual(after.area.right + 0.5)
      expect(kept.right, `${last.column} after release: ${SV_18_FOLLOW} -- the border reached the edge it is stopped at`).toBeGreaterThanOrEqual(after.area.right - 2)
      expect(after.area.scrollbar, 'the scrollbar is still drawn beside the widened column').toBeGreaterThan(0)
    } finally {
      await stage.close()
    }
  })

  test(`Search Panel: a press and drag on the scrollbar over a column border changes no width (${SV_18_UNDER_SCROLLBAR})`, async () => {
    const stage = await withSearch(need())
    try {
      const page = stage.page
      const opened = await readFrame(page, PANEL, false)
      expect(opened.area.scrollbar, 'premise: the vertical scrollbar is drawn (--hide-scrollbars is off)').toBeGreaterThan(0)
      const strip = { from: opened.area.right, to: opened.area.right + opened.area.scrollbar }
      const target = (strip.from + strip.to) / 2
      // WHY: at scrollLeft 0 a scrolled column's border moves left by exactly the scroll amount.
      const candidate = opened.headings.find((one) => {
        if (one.fixed || one.noBorder) return false
        const by = one.right - target
        return by > 0 && by <= opened.area.maxScrollLeft
      })
      if (candidate === undefined) throw new Error('premise: some scrolled column border can be put under the scrollbar')
      await page.evaluate(
        (asked: { window: string; by: number }) => {
          const box = document.querySelector(`${asked.window} [data-table-box]`) as HTMLElement
          box.scrollLeft = asked.by
        },
        { window: PANEL, by: Math.round(candidate.right - target) },
      )
      await settle(page)
      const placed = await readFrame(page, PANEL, false)
      const under = headingOf(placed, candidate.column)
      expect(under.right, `premise: ${candidate.column}'s border sits under the scrollbar`).toBeGreaterThan(placed.area.right + 1)
      expect(under.right, `premise: ${candidate.column}'s border sits under the scrollbar`).toBeLessThan(placed.area.right + placed.area.scrollbar - 1)
      const at = { x: under.right, y: (under.top + under.bottom) / 2 }
      expect(at.y, 'premise: the heading row lies beside the scrollbar').toBeGreaterThan(placed.area.top)
      const hit = await page.evaluate(
        (asked: { window: string; x: number; y: number }) => {
          const box = document.querySelector(`${asked.window} [data-table-box]`)
          const found = document.elementFromPoint(asked.x, asked.y)
          return found === box ? 'table box' : found === null ? 'nothing' : (found.closest('th') === null ? found.tagName : 'heading cell')
        },
        { window: PANEL, x: at.x, y: at.y },
      )
      expect(hit, 'premise: the press point is on the table box itself (its scrollbar), not on a heading cell').toBe('table box')
      const before = widthsBy(placed)
      await page.mouse.move(at.x, at.y)
      await page.mouse.down()
      const held: string[] = []
      for (const dx of [-10, -30, -60, 20, 60]) {
        await page.mouse.move(at.x + dx, at.y)
        const now = widthsBy(await readFrame(page, PANEL, true))
        for (const [name, width] of Object.entries(before)) {
          if (Math.abs((now[name] ?? 0) - width) > TOLERANCE) held.push(`${dx}px: ${name} ${width} -> ${now[name] ?? 0}`)
        }
      }
      await page.mouse.up()
      await settle(page)
      expect(held, `${SV_18_UNDER_SCROLLBAR} -- while held`).toEqual([])
      const after = widthsBy(await readFrame(page, PANEL, false))
      for (const [name, width] of Object.entries(before)) {
        expect(Math.abs((after[name] ?? 0) - width), `${SV_18_UNDER_SCROLLBAR} -- ${name} after release`).toBeLessThanOrEqual(TOLERANCE)
      }
    } finally {
      await stage.close()
    }
  })
})
