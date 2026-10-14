// CR-739 on the shipped build, from docs/spec only: inside S-426 of the top edge the window edge answers before the title bar, and a column heading cell outside the border band shows the finger.

import { expect, test, type Browser, type Page } from '@playwright/test'
import { CLEARING_UP_MS, launchReferenceBrowser } from './live-app'
import { APP_HEADER, PANEL, REPORT, cellOf, boxOf, settle, stageWith, withReport, withSearch, type Box, type Stage } from './cr-721-stage'
import { REQUIREMENTS, pressEntrance } from './cr-570-tree-state-stage'
import { bare, specTable, unbroken } from '../contract/spec-table'
import { rowOf } from './sws-case'

const GR_24_EDGE_FIRST =
  '⭐ ただし、ウィンドウの縁（`GR-25`）を敷いた所では、本表の順によらず縁が本行より先に答える —— 上の辺の内側 `_assets/tbl-settings.md` の `S-426` の幅はタイトルバーの帯と重なるが、そこを引けば、ほかの辺と同じく大きさを変える'
const FR_106_TOP_OVER_TITLE =
  '⭐ 上の辺と上の 2 つの角では、縁の内側がタイトルバーの帯（表 T-023d の `GR-24`）と重なる所でも、この形とすること（MUST） —— そこでは縁が答え、引けば大きさを変える（同表の `GR-24` の ⭐）。'
const FR_106_EDGES =
  'ウィンドウの縁の掴み代（表 T-023d の `GR-25`）では、左と右の辺は 表 T-269 の `PK-12`、上と下の辺は `PK-13`、左上と右下の角は `PK-14`、右上と左下の角は `PK-15` とすること（MUST）'
const FR_106_HEADER_FINGER =
  '⭐ その帯の外で、見出しのセルが `IC-122` として答える所（見出しの語・`IC-122`・その間と左右と上下の詰め —— `FR-151` の 表 T-330 の `SV-7`）では、表 T-269 の `PK-7` とすること（MUST）'
const SV_7_SHAPE = '⭐ そう答える所（帯の外の、見出しの語・`IC-122`・その間と左右と上下の詰め）のポインタの形は `FR-106` が持つ（表 T-269 の `PK-7`）。'
const SV_7_CHECKBOX = '[表示] の列（表 T-331 の `SQ-10`）の見出しのチェックボックスの上では、チェックボックスが答え、フィルタを開かない'
const WB_8_FOLLOWS = '握っているあいだ、ウィンドウをポインタに追従させること（MUST）'
const WB_9_FOLLOWS = '縁と角（表 T-023d の `GR-25`）を握っているあいだ、ウィンドウの大きさをポインタに追従させること（MUST）'

const T_103 = specTable('T-103')
const RESOURCE_LIST = `[data-role="${bare(rowOf(T_103, 'U-49').cells[0] ?? '')}"]`
const OPEN_RESOURCE_LIST = rowOf(specTable('T-109'), 'IC-62').id
const CLOSE_ICON = 'IC-52'
const FILTER = 'IC-122'
const SHOWN_COLUMN = 'SQ-10'

const pxOf = (text: string): number => Number(/(\d+(?:\.\d+)?)\s*px/.exec(text)?.[1])
const wholeRow = (table: string, id: string): string => unbroken(rowOf(specTable(table), id).cells.join(' '))
const BAND = pxOf(wholeRow('T-206', 'S-465'))
const EDGE = pxOf(wholeRow('T-206', 'S-426'))
const TOLERANCE_PX = 2
const RESIZE_SHAPES: readonly string[] = ['ns-resize', 'nwse-resize', 'nesw-resize', 'ew-resize']

interface Win {
  readonly name: string
  readonly selector: string
  open(browser: Browser): Promise<Stage>
}

interface Point {
  readonly x: number
  readonly y: number
}

/** @purity non-pure */
async function withResourceList(browser: Browser): Promise<Stage> {
  const stage = await stageWith(browser)
  expect(await pressEntrance(stage.page, OPEN_RESOURCE_LIST), 'IC-62 is on the screen').toBe(true)
  await expect(stage.page.locator(RESOURCE_LIST)).toBeVisible()
  await settle(stage.page)
  return stage
}

const WINDOWS: readonly Win[] = [
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

test.describe('CR-739 the manuscript these cases are driven by', () => {
  test('T-023d GR-24 says the edge GR-25 answers first where it is laid, over the title band', () => {
    expect(cellOf('T-023d', 'GR-24', '操作')).toContain(GR_24_EDGE_FIRST)
  })
  test('FR-106 names PK-13..PK-15 for the top edge and corners even over the title band, and PK-7 for the heading cell outside the band', () => {
    for (const clause of [FR_106_EDGES, FR_106_TOP_OVER_TITLE, FR_106_HEADER_FINGER]) expect(REQUIREMENTS).toContain(clause)
  })
  test('T-330 SV-7 points at FR-106 for the shape and leaves the SQ-10 checkbox to answer', () => {
    const say = cellOf('T-330', 'SV-7', '定め')
    expect(say).toContain(SV_7_SHAPE)
    expect(say).toContain(SV_7_CHECKBOX)
  })
  test('T-335 WB-8 and WB-9 follow the pointer, and S-426 / S-465 are px values', () => {
    expect(wholeRow('T-335', 'WB-8')).toContain(WB_8_FOLLOWS)
    expect(wholeRow('T-335', 'WB-9')).toContain(WB_9_FOLLOWS)
    expect(EDGE).toBeGreaterThan(0)
    expect(BAND).toBeGreaterThan(0)
  })
})

/** @purity non-pure */
async function frame(page: Page): Promise<void> {
  await page.evaluate(() => new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => done()))))
  await page.waitForTimeout(60)
}

/** @purity non-pure */
async function shapeHere(page: Page, x: number, y: number): Promise<string> {
  await frame(page)
  return page.evaluate(
    (at: Point) => {
      const hit = document.elementFromPoint(at.x, at.y)
      return hit === null ? '(nothing)' : getComputedStyle(hit).cursor
    },
    { x, y },
  )
}

/** @purity non-pure */
async function shapeAt(page: Page, x: number, y: number): Promise<string> {
  await page.mouse.move(x, y)
  return shapeHere(page, x, y)
}

/** @purity semi-pure-b */
async function shapeMarked(page: Page): Promise<boolean> {
  return page.evaluate(() => document.querySelector('[data-pointer-shape-shown]') !== null)
}

/** @purity semi-pure-b */
async function windowBox(page: Page, win: Win): Promise<Box> {
  const box = await boxOf(page, win.selector)
  if (box === null) throw new Error(`premise: ${win.name} is on the screen`)
  return box
}

interface TitleRow {
  readonly top: number
  readonly bottom: number
  readonly middle: number
}

// WHY: the title row is the row that carries IC-52 and holds no table row (SV-1); read it from the page the way a person sees it.
/** @purity semi-pure-b */
async function titleRowOf(page: Page, win: Win): Promise<TitleRow> {
  const row = await page.evaluate(
    (asked: { window: string; close: string }) => {
      const root = document.querySelector(asked.window)
      const close = root?.querySelector(`[data-icon="${asked.close}"]`)
      if (root === null || root === undefined || close === null || close === undefined) return null
      let title: Element = close
      while (title.parentElement !== null && title.parentElement !== root && title.parentElement.querySelector('[data-row], table') === null) {
        title = title.parentElement
      }
      const box = title.getBoundingClientRect()
      return { top: box.top, bottom: box.bottom, middle: (box.top + box.bottom) / 2 }
    },
    { window: win.selector, close: CLOSE_ICON },
  )
  if (row === null) throw new Error(`premise: ${win.name} draws a title row with ${CLOSE_ICON}`)
  return row
}

// WHY: x positions along the top where neither the edge rows nor the title row's middle lie under an entrance (IF-9: an entrance answers first), nearest the middle first.
/** @purity semi-pure-b */
async function freeColumns(page: Page, win: Win, title: TitleRow): Promise<readonly number[]> {
  const box = await windowBox(page, win)
  return page.evaluate(
    (asked: { box: Box; ys: number[]; edge: number }) => {
      const free: number[] = []
      for (let x = asked.box.x + asked.edge + 4; x < asked.box.right - asked.edge - 4; x += 3) {
        const clear = asked.ys.every((y) => {
          const hit = document.elementFromPoint(x, y)
          return hit !== null && hit.closest('[data-icon], input, button, select') === null
        })
        if (clear) free.push(x)
      }
      const middle = asked.box.x + asked.box.width / 2
      return free.sort((a, b) => Math.abs(a - middle) - Math.abs(b - middle))
    },
    { box, ys: [box.y + 2, box.y + EDGE - 1, title.middle], edge: EDGE },
  )
}

/** @purity non-pure */
async function dragFrom(page: Page, from: Point, by: Point): Promise<void> {
  await page.mouse.move(from.x, from.y)
  await frame(page)
  await page.mouse.down()
  await page.mouse.move(from.x + by.x / 2, from.y + by.y / 2, { steps: 4 })
  await page.mouse.move(from.x + by.x, from.y + by.y, { steps: 4 })
  await page.waitForTimeout(200)
  await page.mouse.up()
  await settle(page)
}

/** @purity semi-pure-b */
async function roomAbove(page: Page, win: Win): Promise<number> {
  const header = await boxOf(page, APP_HEADER)
  const box = await windowBox(page, win)
  return box.y - (header?.bottom ?? 0)
}

const near = (actual: number, wanted: number): number => Math.abs(actual - wanted)

for (const win of WINDOWS) {
  test.describe(`CR-739 ${win.name}: the window edge over the title bar`, () => {
    test.setTimeout(240_000)

    test(`GR-24 / GR-25 / PK-13..PK-15: inside S-426 of the top edge the shapes are the resize shapes, and below it the title bar is not`, async () => {
      const stage = await win.open(need())
      try {
        const page = stage.page
        const box = await windowBox(page, win)
        const title = await titleRowOf(page, win)
        expect(title.middle - box.y, 'premise: the title bar reaches below the S-426 of the top edge').toBeGreaterThan(EDGE + 1)
        const free = await freeColumns(page, win, title)
        expect(free.length, 'premise: a point of the top edge that no entrance covers').toBeGreaterThan(0)
        const x = free[0] ?? 0
        for (const inside of [1, 2, Math.floor(EDGE / 2), EDGE - 1]) {
          expect(await shapeAt(page, x, box.y + inside), `top edge, ${String(inside)}px inside`).toBe('ns-resize')
        }
        expect(await shapeMarked(page), 'a shown shape is marked on the UI parts root').toBe(true)
        expect(await shapeAt(page, x, box.y - 2), 'top edge, outside').toBe('ns-resize')
        const below = await shapeAt(page, x, title.middle)
        expect(RESIZE_SHAPES, `the title bar below S-426 shows no resize shape (got ${below})`).not.toContain(below)
        const belowEdge = await shapeAt(page, x, box.y + EDGE + 2)
        expect(RESIZE_SHAPES, `just below S-426 shows no resize shape (got ${belowEdge})`).not.toContain(belowEdge)
        for (const [what, dx, dy] of [
          ['left corner, 2px in each way', 2, 2],
          ['left corner, 1px down and 5px in', 5, 1],
          ['left corner, 5px down and 1px in', 1, 5],
        ] as const) {
          expect(await shapeAt(page, box.x + dx, box.y + dy), `top ${what}`).toBe('nwse-resize')
        }
      } finally {
        await stage.close()
      }
    })

    test(`GR-25 / PK-15: the top right corner inside S-426 is nesw-resize wherever no entrance (IC-52) covers it`, async () => {
      const stage = await win.open(need())
      try {
        const page = stage.page
        const box = await windowBox(page, win)
        const points: Point[] = await page.evaluate(
          (asked: { box: Box; edge: number }) => {
            const found: Point[] = []
            for (let dx = 0.5; dx < asked.edge; dx += 1) {
              for (let dy = 0.5; dy < asked.edge; dy += 1) {
                const x = asked.box.right - dx
                const y = asked.box.y + dy
                const hit = document.elementFromPoint(x, y)
                if (hit !== null && hit.closest('[data-icon]') === null) found.push({ x, y })
              }
            }
            return found
          },
          { box, edge: EDGE },
        )
        // WHY: IF-9 lets an entrance answer first; when IC-52 covers the whole inner corner, the outer corner (cr-737) is all that remains to point at
        test.skip(points.length === 0, 'IC-52 covers every point of the inner top right corner')
        const at = points[0] as Point
        expect(await shapeAt(page, at.x, at.y), 'top right corner, inside, off the entrance').toBe('nesw-resize')
        expect(await shapeAt(page, box.right + 2, box.y - 2), 'top right corner, outside').toBe('nesw-resize')
      } finally {
        await stage.close()
      }
    })

    test(`GR-24 / GR-25 / PK-12: the left edge keeps ew-resize where it overlaps the title bar`, async () => {
      const stage = await win.open(need())
      try {
        const page = stage.page
        const box = await windowBox(page, win)
        const title = await titleRowOf(page, win)
        expect(await shapeAt(page, box.x + 2, title.middle), 'left edge, inside, at the title bar').toBe('ew-resize')
        expect(await shapeAt(page, box.x + 2, box.y + EDGE + 2), 'left edge, inside, just below the top corner').toBe('ew-resize')
      } finally {
        await stage.close()
      }
    })

    test(`GR-24 / WB-9: pressing inside S-426 of the top edge and pulling up changes the height; the window does not move`, async () => {
      const stage = await win.open(need())
      try {
        const page = stage.page
        const before = await windowBox(page, win)
        const title = await titleRowOf(page, win)
        const free = await freeColumns(page, win, title)
        const x = free[0] ?? 0
        const up = Math.min(40, Math.floor(await roomAbove(page, win)) - 6)
        expect(up, 'premise: room above the window to pull up into').toBeGreaterThanOrEqual(15)
        for (const inside of [2, EDGE - 2]) {
          const from = await windowBox(page, win)
          await dragFrom(page, { x, y: from.y + inside }, { x: 0, y: -up })
          const after = await windowBox(page, win)
          expect(near(after.height, from.height + up), `grabbed ${String(inside)}px inside: the height grows by the pull (${String(from.height)} -> ${String(after.height)})`).toBeLessThanOrEqual(TOLERANCE_PX)
          expect(near(after.bottom, from.bottom), `grabbed ${String(inside)}px inside: the bottom stays`).toBeLessThanOrEqual(TOLERANCE_PX)
          expect(near(after.y, from.y - up), `grabbed ${String(inside)}px inside: the top follows the pointer`).toBeLessThanOrEqual(TOLERANCE_PX)
          expect(near(after.x, from.x), `grabbed ${String(inside)}px inside: the window does not move sideways`).toBeLessThanOrEqual(TOLERANCE_PX)
          expect(near(after.width, from.width), `grabbed ${String(inside)}px inside: the width stays`).toBeLessThanOrEqual(TOLERANCE_PX)
          // WHY: put the top back so the next grab starts from the same box
          await dragFrom(page, { x, y: after.y + inside }, { x: 0, y: up })
        }
        const back = await windowBox(page, win)
        expect(near(back.height, before.height), 'premise: the window is back at its height').toBeLessThanOrEqual(TOLERANCE_PX * 2)
      } finally {
        await stage.close()
      }
    })

    test(`FR-106: a held top edge keeps ns-resize while the pointer travels into the title bar and the window body`, async () => {
      const stage = await win.open(need())
      try {
        const page = stage.page
        const box = await windowBox(page, win)
        const title = await titleRowOf(page, win)
        const free = await freeColumns(page, win, title)
        const x = free[0] ?? 0
        await page.mouse.move(x, box.y + 2)
        await frame(page)
        await page.mouse.down()
        await page.mouse.move(x, box.y + 14, { steps: 4 })
        expect(await shapeHere(page, x, box.y + 14), 'held on the top edge, now in the title bar').toBe('ns-resize')
        await page.mouse.move(x, box.y + Math.min(60, box.height / 2), { steps: 4 })
        expect(await shapeHere(page, x, box.y + Math.min(60, box.height / 2)), 'held on the top edge, now over the window body').toBe('ns-resize')
        await page.mouse.up()
        await settle(page)
      } finally {
        await stage.close()
      }
    })

    test(`GR-25 / WB-9: pulling the top left corner up and in moves the top and the left side only`, async () => {
      const stage = await win.open(need())
      try {
        const page = stage.page
        const from = await windowBox(page, win)
        const step = Math.min(25, Math.floor(await roomAbove(page, win)) - 6)
        expect(step, 'premise: room above the window').toBeGreaterThanOrEqual(10)
        await dragFrom(page, { x: from.x + 2, y: from.y + 2 }, { x: step, y: -step })
        const after = await windowBox(page, win)
        expect(near(after.y, from.y - step), `the top follows (${String(from.y)} -> ${String(after.y)})`).toBeLessThanOrEqual(TOLERANCE_PX)
        expect(near(after.x, from.x + step), `the left follows (${String(from.x)} -> ${String(after.x)})`).toBeLessThanOrEqual(TOLERANCE_PX)
        expect(near(after.bottom, from.bottom), 'the bottom stays').toBeLessThanOrEqual(TOLERANCE_PX)
        expect(near(after.right, from.right), 'the right stays').toBeLessThanOrEqual(TOLERANCE_PX)
      } finally {
        await stage.close()
      }
    })

    test(`WB-8: below S-426 the title bar still moves the window, and the size is kept`, async () => {
      const stage = await win.open(need())
      try {
        const page = stage.page
        const from = await windowBox(page, win)
        const title = await titleRowOf(page, win)
        const free = await freeColumns(page, win, title)
        expect(free.length, 'premise: a point of the title bar that no entrance covers').toBeGreaterThan(0)
        const x = free[0] ?? 0
        const view = page.viewportSize()
        const right = from.right + 50 < (view?.width ?? 0)
        const dx = right ? 30 : -30
        const dy = (await roomAbove(page, win)) > 40 ? -20 : 20
        await dragFrom(page, { x, y: title.middle }, { x: dx, y: dy })
        const after = await windowBox(page, win)
        expect(near(after.x, from.x + dx), `moved sideways (${String(from.x)} -> ${String(after.x)})`).toBeLessThanOrEqual(TOLERANCE_PX)
        expect(near(after.y, from.y + dy), `moved vertically (${String(from.y)} -> ${String(after.y)})`).toBeLessThanOrEqual(TOLERANCE_PX)
        expect(near(after.width, from.width), 'the width is kept').toBeLessThanOrEqual(TOLERANCE_PX)
        expect(near(after.height, from.height), 'the height is kept').toBeLessThanOrEqual(TOLERANCE_PX)
      } finally {
        await stage.close()
      }
    })
  })

  test.describe(`CR-739 ${win.name}: the heading cell outside the border band`, () => {
    test.setTimeout(240_000)

    test(`FR-106 / SV-7 / PK-7: the word, IC-122, the gap between and the side padding show the finger; the band stays col-resize`, async () => {
      const stage = await win.open(need())
      try {
        const page = stage.page
        const box = await windowBox(page, win)
        const cells = (await anatomyOf(page, win.selector)).filter((one) => one.column !== SHOWN_COLUMN && !one.hasCheckbox)
        expect(cells.length, 'premise: the window shows column headings with IC-122').toBeGreaterThan(2)
        const picked = cells.length <= 3 ? cells : [cells[0] as Cell, cells[Math.floor(cells.length / 2)] as Cell, cells[cells.length - 1] as Cell]
        for (const cell of picked) {
          const y = cell.box.y + cell.box.height / 2
          const low = Math.max(cell.hasLeftNeighbour ? cell.box.x + BAND + 1 : cell.box.x + 1, box.x + EDGE + 1)
          const high = Math.min(cell.hasRightBorder ? cell.box.right - BAND - 1 : cell.box.right - 1, box.right - EDGE - 1)
          const marks: [string, number][] = [['IC-122', cell.mark.x + cell.mark.width / 2]]
          if (cell.word !== null) marks.push(['the word', cell.word.x + cell.word.width / 2])
          if (cell.word !== null && cell.mark.x - cell.word.right > 2) marks.push(['the gap between', (cell.word.right + cell.mark.x) / 2])
          if (cell.hasRightBorder && high - cell.mark.right > 1) marks.push(['the right padding', (cell.mark.right + high) / 2])
          if (cell.word !== null && cell.word.x - low > 1) marks.push(['the left padding', (low + cell.word.x) / 2])
          for (let x = low; x <= high; x += 4) marks.push([`a step at ${x.toFixed(0)}`, x])
          for (const [what, x] of marks) {
            if (x < low || x > high) continue
            expect(await shapeAt(page, x, y), `${cell.column}: ${what}`).toBe('pointer')
          }
          // WHY: a border that lies against the window's right edge is the window edge's (GR-25), and cr-737 holds the band cases
          if (cell.hasRightBorder && cell.box.right + BAND + EDGE + 2 < box.right) {
            for (const offset of [-Math.round(BAND / 2), 0, Math.round(BAND / 2)]) {
              expect(await shapeAt(page, cell.box.right + offset, y), `${cell.column}: the band at ${String(offset)}px stays the border's`).toBe('col-resize')
            }
          }
        }
      } finally {
        await stage.close()
      }
    })
  })
}

interface Cell {
  readonly column: string
  readonly box: Box
  readonly mark: Box
  readonly word: Box | null
  readonly hasCheckbox: boolean
  readonly hasLeftNeighbour: boolean
  readonly hasRightBorder: boolean
}

// WHY: SQ-10, DT-8 and RQ-1 hold a fixed width and have no right border (SV-18, RW-9, RO-9)
const NO_BORDER = new Set(['SQ-10', 'DT-8', 'RQ-1'])

/** @purity semi-pure-b */
async function anatomyOf(page: Page, window: string): Promise<readonly Cell[]> {
  const raw = await page.evaluate(
    (asked: { window: string; filter: string }) => {
      const read = (r: DOMRect): Box => ({ x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height })
      const cells = Array.from(document.querySelectorAll(`${asked.window} thead th`))
      const out: Omit<Cell, 'hasRightBorder'>[] = []
      cells.forEach((cell, index) => {
        const mark = cell.querySelector(`[data-icon="${asked.filter}"]`)
        if (mark === null) return
        let word: Box | null = null
        const walker = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT)
        for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
          if (mark.contains(node) || (node.textContent ?? '').trim() === '') continue
          const range = document.createRange()
          range.selectNodeContents(node)
          const box = read(range.getBoundingClientRect())
          word = word === null ? box : { x: Math.min(word.x, box.x), y: Math.min(word.y, box.y), right: Math.max(word.right, box.right), bottom: Math.max(word.bottom, box.bottom), width: Math.max(word.right, box.right) - Math.min(word.x, box.x), height: box.height }
        }
        out.push({
          column: cell.getAttribute('data-column') ?? '',
          box: read(cell.getBoundingClientRect()),
          mark: read(mark.getBoundingClientRect()),
          word,
          hasCheckbox: cell.querySelector('input[type="checkbox"]') !== null,
          hasLeftNeighbour: index > 0,
        })
      })
      return out
    },
    { window, filter: FILTER },
  )
  return raw.map((one) => ({ ...one, hasRightBorder: !NO_BORDER.has(one.column) }))
}
