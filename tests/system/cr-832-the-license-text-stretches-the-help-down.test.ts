// CR-832 on the shipped build: opening the full license text stretches the help's bottom edge to the bottom of the Schedule Canvas.

import { expect, test, type Browser, type Page } from '@playwright/test'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { bare, specTable, unbroken } from '../contract/spec-table'
import { CLEARING_UP_MS, launchReferenceBrowser, readSettledDrawnSvg, screenOf } from './live-app'
import { rowOf } from './sws-case'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

// WHY: each constant is cut from the manuscript as it stands; the cases below are driven by them.
const FR_069_STRETCH =
  '⭐ 全文と帰属表示を開いたら、表 T-335 の `WB-1` のヘルプの窓の下の縁を、同表の `WB-3` の範囲の下端まで伸ばすこと（MUST）'
const FR_069_SCROLLS_INSIDE = '全文は窓の本文の中でスクロールして読み、スクロールバーは窓の右側に出る'
const FR_069_FOLD_BACK = '⭐ もう一度押してたたんだら、窓を開く前の大きさに戻すこと（MUST）'
const FR_069_ONLY_THE_DRAWN_BOX = '伸ばすのは描く箱だけであり、`WB-8`・`WB-9` が決める位置と大きさは変えない'
const FR_069_MOVE_KEEPS_BOTTOM = '⚠️ 開いているあいだに `WB-8` で動かしても、下の縁は範囲の下端に留まる'
const FR_069_NOT_WB_2 = '⚠️ `WB-2` は本文を描かないので伸ばさず、`WB-3` は既に範囲いっぱいである'
const FR_069_NOT_SAVED = '⚠️ 開いているかどうかは窓の状態と同じく保存せず、ヘルプを閉じたら捨てる（`WB-6`）'
const FR_069_FOLDED_AT_OPEN = '⛔ 全文と帰属表示を、ヘルプを開いたときに開いた形で出してはならない（MUST NOT）'
const FR_069_ENTRANCE_WORD = '折りたたんだ全文を開く入口の語は、`FR-038` の辞書が持つこと（MUST）'
const WB_2_PLACE = '最小化する前の箱の下の縁に、右の端をそろえて置く'
const WB_3_RANGE = '`App Header` の下の縁からウィンドウの下の端まで'
const FR_036_ONE_SCREEN_AT_WB_1 = '開いたときの大きさ（表 T-335 の `WB-1`）で全部の塊とライセンスの行（`FR-069`）を 1 画面に収め'
const T_337_THE_FRONT_ONE_TAKES_THE_PRESS = '⭐ 押下は、その点で最も手前に描かれた UI パーツが受けること（MUST）'

const SHIPPED_BUILD = join(process.cwd(), 'dist', 'index.html')
const T_103 = specTable('T-103')
const T_109 = specTable('T-109')

const partOf = (id: string): string => `[data-role="${bare(rowOf(T_103, id).by['確定名（英）'] ?? '')}"]`
const HELP = partOf('U-30')
const HEADER = partOf('U-31')
const iconOf = (id: string): string => rowOf(T_109, id).id
const OPEN_HELP = iconOf('IC-22')
const HELP_LANGUAGE = iconOf('IC-128')
const MINIMIZE = iconOf('IC-129')
const CLOSE = iconOf('IC-52')

type Language = 'ja' | 'en'
type Words = Readonly<Record<Language, string>>
const WORDS = JSON.parse(readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'display-words.json'), 'utf8')) as {
  readonly helpLegal: readonly { readonly part: string; readonly text: Words }[]
}
// see FR-069, FR-038
const FULL_TEXT_WORD: Words = (() => {
  const found = WORDS.helpLegal.find((one) => one.part === 'fullText')
  if (found === undefined) throw new Error('the dictionary holds no helpLegal word for fullText')
  return found.text
})()

// WHY: a viewport tall enough that the default help ends well above the bottom; MC-6 is the reference environment.
const SCREENS: readonly (readonly [string, { width: number; height: number }])[] = [
  ['1600 x 1000', { width: 1600, height: 1000 }],
  ['MC-6', screenOf(rowOf(specTable('T-025'), 'MC-6'))],
]

// WHY: a box laid out at a fractional position reads back a fraction off; less than that is not a move.
const EDGE = 1.5
// WHY: the default box (S-201 of the area, centred) ends about 24 px above the bottom at both screens; a stretch must be seen past this.
const ROOM = 10

interface Box {
  readonly left: number
  readonly top: number
  readonly right: number
  readonly bottom: number
}
interface Point {
  readonly x: number
  readonly y: number
}
interface BodyScroll {
  readonly scrollHeight: number
  readonly clientHeight: number
  readonly scrollWidth: number
  readonly clientWidth: number
}

const said = (box: Box): string => `[${[box.left, box.top, box.right, box.bottom].map((n) => n.toFixed(1)).join(', ')}]`
const near = (a: number, b: number): boolean => Math.abs(a - b) <= EDGE

let browser: Browser | null = null

test.beforeAll(async () => {
  if (!existsSync(SHIPPED_BUILD)) throw new Error('build the shipped app first (dist/index.html)')
  browser = await launchReferenceBrowser()
})

test.afterAll(async () => {
  test.setTimeout(CLEARING_UP_MS)
  await browser?.close()
})

/** @purity non-pure */
async function openApp(size: { width: number; height: number }): Promise<{ page: Page; close(): Promise<void> }> {
  if (browser === null) throw new Error('the reference browser was not opened')
  const context = await browser.newContext({ viewport: size, locale: 'ja-JP' })
  const page = await context.newPage()
  await page.goto(pathToFileURL(SHIPPED_BUILD).href)
  await readSettledDrawnSvg(page)
  return {
    page,
    /** @purity non-pure */
    async close(): Promise<void> {
      await context.close()
    },
  }
}

/** @purity semi-pure-b */
async function boxOf(page: Page, selector: string): Promise<Box | null> {
  return page.evaluate((wanted: string) => {
    const found = document.querySelector(wanted)
    if (found === null) return null
    const box = found.getBoundingClientRect()
    if (box.width <= 0 || box.height <= 0) return null
    return { left: box.left, top: box.top, right: box.right, bottom: box.bottom }
  }, selector)
}

/** @purity semi-pure-b */
async function helpBox(page: Page): Promise<Box> {
  const box = await boxOf(page, HELP)
  if (box === null) throw new Error(`${HELP} is not on the screen`)
  return box
}

// see WB-3, U-32
/** @purity semi-pure-b */
async function rangeBox(page: Page): Promise<Box> {
  const header = await boxOf(page, HEADER)
  if (header === null) throw new Error(`${HEADER} is not on the screen`)
  const inner = await page.evaluate(() => ({ width: window.innerWidth, height: window.innerHeight }))
  return { left: 0, top: header.bottom, right: inner.width, bottom: inner.height }
}

// see T-337
/** @purity semi-pure-b */
async function frontPointOf(page: Page, selector: string): Promise<Point | null> {
  return page.evaluate((wanted: string) => {
    const one = document.querySelector(wanted)
    if (one === null) return null
    const box = one.getBoundingClientRect()
    if (box.width <= 0 || box.height <= 0) return null
    for (const fy of [0.5, 0.3, 0.7]) {
      for (const fx of [0.5, 0.3, 0.7, 0.15, 0.85]) {
        const x = box.left + box.width * fx
        const y = box.top + box.height * fy
        const hit = document.elementFromPoint(x, y)
        if (hit !== null && one.contains(hit)) return { x, y }
      }
    }
    return null
  }, selector)
}

/** @purity non-pure */
async function press(page: Page, selector: string): Promise<void> {
  const at = await frontPointOf(page, selector)
  if (at === null) throw new Error(`${T_337_THE_FRONT_ONE_TAKES_THE_PRESS} -- no point of ${selector} is the front`)
  await page.mouse.move(at.x, at.y)
  await page.mouse.down()
  await page.mouse.up()
  await page.waitForTimeout(300)
}

/** @purity non-pure */
async function openHelp(page: Page): Promise<Box> {
  await press(page, `${HEADER} [data-icon="${OPEN_HELP}"]`)
  await expect.poll(async () => (await boxOf(page, HELP)) !== null, { message: `${OPEN_HELP} opens ${HELP}` }).toBe(true)
  await page.waitForTimeout(300)
  return helpBox(page)
}

const SUMMARY = `${HELP} details > summary`

// see FR-069
/** @purity semi-pure-b */
async function readLegal(page: Page): Promise<{ language: string; summaryText: string; isOpen: boolean } | null> {
  return page.evaluate((help: string) => {
    const modal = document.querySelector(help)
    const details = modal?.querySelector('details')
    const summary = details?.querySelector('summary')
    if (modal === null || modal === undefined || details === null || details === undefined || summary === null || summary === undefined) return null
    return { language: modal.getAttribute('data-language') ?? '', summaryText: (summary.textContent ?? '').trim(), isOpen: details.open }
  }, HELP)
}

/** @purity semi-pure-b */
async function isFullTextOpen(page: Page): Promise<boolean> {
  return (await readLegal(page))?.isOpen ?? false
}

// see FR-069
/** @purity semi-pure-b */
async function readBodyScroll(page: Page): Promise<BodyScroll> {
  const read = await page.evaluate((help: string) => {
    const modal = document.querySelector(help)
    const details = modal?.querySelector('details')
    if (modal === null || modal === undefined || details === null || details === undefined) return null
    // WHY: the body is the nearest box around the full text, inside the help, that clips its content.
    let body: Element | null = details.parentElement
    while (body !== null && body !== modal) {
      const style = getComputedStyle(body)
      if (['auto', 'scroll', 'hidden'].includes(style.overflowY)) break
      body = body.parentElement
    }
    if (body === null) return null
    return { scrollHeight: body.scrollHeight, clientHeight: body.clientHeight, scrollWidth: body.scrollWidth, clientWidth: body.clientWidth }
  }, HELP)
  if (read === null) throw new Error(`${HELP} draws no body around the full text`)
  return read
}

// see GR-24
/** @purity semi-pure-b */
async function titleBandPoint(page: Page): Promise<Point> {
  const at = await page.evaluate(
    (asked: { help: string; close: string }) => {
      const root = document.querySelector(asked.help)
      const close = root?.querySelector(`[data-icon="${asked.close}"]`)
      if (root === null || root === undefined || close === null || close === undefined) return null
      let title: Element = close
      while (title.parentElement !== null && title.parentElement !== root && title.parentElement.querySelector('[data-row]') === null) {
        title = title.parentElement
      }
      const box = title.getBoundingClientRect()
      return { x: box.left + 8, y: (box.top + box.bottom) / 2 }
    },
    { help: HELP, close: CLOSE },
  )
  if (at === null) throw new Error(`${HELP} draws no title row with ${CLOSE}`)
  return at
}

/** @purity non-pure */
async function dragBy(page: Page, from: Point, by: Point): Promise<void> {
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(from.x + by.x / 2, from.y + by.y / 2, { steps: 4 })
  await page.mouse.move(from.x + by.x, from.y + by.y, { steps: 4 })
  await page.mouse.up()
  await page.waitForTimeout(300)
}

/** @purity non-pure */
async function openFullText(page: Page): Promise<void> {
  await press(page, SUMMARY)
  await expect.poll(() => isFullTextOpen(page), { message: `pressing ${FULL_TEXT_WORD.ja} opens the full text` }).toBe(true)
  await page.waitForTimeout(300)
}

/** @purity non-pure */
async function foldFullText(page: Page): Promise<void> {
  await press(page, SUMMARY)
  await expect.poll(() => isFullTextOpen(page), { message: `pressing ${FULL_TEXT_WORD.ja} again folds the full text` }).toBe(false)
  await page.waitForTimeout(300)
}

const expectStretched = (box: Box, before: Box, range: Box, what: string): void => {
  expect(near(box.bottom, range.bottom), `${FR_069_STRETCH} (${what}): bottom ${said(box)} vs range ${said(range)}`).toBe(true)
  expect(near(box.top, before.top), `${what}: the top stays ${said(box)} vs ${said(before)}`).toBe(true)
  expect(near(box.left, before.left), `${what}: the left stays ${said(box)} vs ${said(before)}`).toBe(true)
  expect(near(box.right - box.left, before.right - before.left), `${what}: the width stays ${said(box)} vs ${said(before)}`).toBe(true)
}

const expectSameBox = (box: Box, before: Box, what: string): void => {
  for (const side of ['left', 'top', 'right', 'bottom'] as const) {
    expect(near(box[side], before[side]), `${what}: ${side} ${said(box)} vs ${said(before)}`).toBe(true)
  }
}

test.describe('CR-832 the manuscript these cases are driven by', () => {
  for (const [name, clause] of [
    ['FR-069 (MUST) opening the full text stretches the help down to the WB-3 range bottom', FR_069_STRETCH],
    ['FR-069 the full text scrolls inside the window body', FR_069_SCROLLS_INSIDE],
    ['FR-069 (MUST) folding returns the window to its size before opening', FR_069_FOLD_BACK],
    ['FR-069 only the drawn box stretches', FR_069_ONLY_THE_DRAWN_BOX],
    ['FR-069 a WB-8 move keeps the bottom at the range bottom', FR_069_MOVE_KEEPS_BOTTOM],
    ['FR-069 WB-2 does not stretch', FR_069_NOT_WB_2],
    ['FR-069 the open state is not saved and is discarded on close', FR_069_NOT_SAVED],
    ['FR-069 (MUST NOT) not open when the help opens', FR_069_FOLDED_AT_OPEN],
    ['FR-069 (MUST) the entrance word lives in the dictionary', FR_069_ENTRANCE_WORD],
    ['T-335 WB-2 the bar sits at the bottom edge of the box before minimizing', WB_2_PLACE],
    ['T-335 WB-3 the range is from the App Header bottom to the window bottom', WB_3_RANGE],
    ['FR-036 one screen is measured at the WB-1 size the help opens with', FR_036_ONE_SCREEN_AT_WB_1],
    ['T-337 (MUST) the front part takes the press', T_337_THE_FRONT_ONE_TAKES_THE_PRESS],
  ] as const) {
    test(`01-04 still says it, word for word: ${name}`, () => {
      expect(REQUIREMENTS).toContain(clause)
    })
  }
})

for (const [screenName, size] of SCREENS) {
  test.describe(`CR-832 FR-069 at ${screenName} -- the full text stretches the help down`, () => {
    test(`FR-069 (MUST): ${FR_069_STRETCH}; ${FR_069_SCROLLS_INSIDE}; ${FR_069_FOLD_BACK}`, async () => {
      test.setTimeout(180_000)
      const app = await openApp(size)
      try {
        const { page } = app
        const opened = await openHelp(page)
        const range = await rangeBox(page)
        const legal = await readLegal(page)
        if (legal === null) throw new Error(`${HELP} draws no folded full text with a summary`)
        expect(legal.isOpen, FR_069_FOLDED_AT_OPEN).toBe(false)
        expect(legal.summaryText, `${FR_069_ENTRANCE_WORD} (${legal.language})`).toBe(FULL_TEXT_WORD[legal.language as Language])
        expect(opened.bottom, `premise: the default help ${said(opened)} ends well above the range bottom ${range.bottom}`).toBeLessThan(range.bottom - ROOM)
        const folded = await readBodyScroll(page)
        expect(folded.scrollHeight, `${FR_036_ONE_SCREEN_AT_WB_1}: folded, the body does not scroll`).toBeLessThanOrEqual(folded.clientHeight)

        // STEP: (1) press the full-text entrance with the mouse; the bottom reaches the range bottom
        await openFullText(page)
        const stretched = await helpBox(page)
        expectStretched(stretched, opened, range, 'opened')

        // STEP: (2) the body scrolls vertically and nothing scrolls sideways
        const body = await readBodyScroll(page)
        expect(body.scrollHeight, `${FR_069_SCROLLS_INSIDE}: vertical scroll`).toBeGreaterThan(body.clientHeight)
        expect(body.scrollWidth, `${FR_069_SCROLLS_INSIDE}: no horizontal scroll`).toBeLessThanOrEqual(body.clientWidth)
        const page_ = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
        }))
        expect(page_.scrollWidth, 'the page does not scroll sideways').toBeLessThanOrEqual(page_.clientWidth)

        // STEP: (3) press again; the window returns to the box it had before
        await foldFullText(page)
        expectSameBox(await helpBox(page), opened, FR_069_FOLD_BACK)
      } finally {
        await app.close()
      }
    })

    test(`FR-069: ${FR_069_NOT_SAVED} -- closed and reopened, the help starts folded at the default box`, async () => {
      test.setTimeout(180_000)
      const app = await openApp(size)
      try {
        const { page } = app
        const opened = await openHelp(page)
        await openFullText(page)
        await press(page, `${HELP} [data-icon="${CLOSE}"]`)
        await expect.poll(async () => (await boxOf(page, HELP)) === null, { message: `${CLOSE} closes ${HELP}` }).toBe(true)
        const reopened = await openHelp(page)
        expect(await isFullTextOpen(page), `${FR_069_NOT_SAVED}; ${FR_069_FOLDED_AT_OPEN}`).toBe(false)
        expectSameBox(reopened, opened, 'WB-6: reopened at the default box')
      } finally {
        await app.close()
      }
    })

    test(`FR-069: switching the help language (IC-128) while open keeps it open and stretched`, async () => {
      test.setTimeout(180_000)
      const app = await openApp(size)
      try {
        const { page } = app
        const opened = await openHelp(page)
        const range = await rangeBox(page)
        await openFullText(page)
        const language = (await readLegal(page))?.language ?? ''
        await press(page, `${HELP} [data-icon="${HELP_LANGUAGE}"]`)
        await expect.poll(async () => (await readLegal(page))?.language ?? '', { message: `${HELP_LANGUAGE} switches the help language` }).not.toBe(language)
        await page.waitForTimeout(300)
        const after = await readLegal(page)
        if (after === null) throw new Error(`${HELP} lost its full text after ${HELP_LANGUAGE}`)
        expect(after.summaryText, `${FR_069_ENTRANCE_WORD} (${after.language})`).toBe(FULL_TEXT_WORD[after.language as Language])
        expect(after.isOpen, 'the full text stays open across the help language switch').toBe(true)
        expectStretched(await helpBox(page), opened, range, `after ${HELP_LANGUAGE}`)
      } finally {
        await app.close()
      }
    })

    test(`FR-069: ${FR_069_MOVE_KEEPS_BOTTOM}; folded after the move, the moved box keeps the size it had`, async () => {
      test.setTimeout(180_000)
      const app = await openApp(size)
      try {
        const { page } = app
        const opened = await openHelp(page)
        const range = await rangeBox(page)
        await openFullText(page)
        const by = { x: -40, y: -Math.min(30, Math.max(0, opened.top - range.top - 5)) }
        await dragBy(page, await titleBandPoint(page), by)
        const moved = await helpBox(page)
        expect(near(moved.left, opened.left + by.x), `WB-8: the help moved left ${said(moved)} vs ${said(opened)}`).toBe(true)
        expect(near(moved.bottom, range.bottom), `${FR_069_MOVE_KEEPS_BOTTOM}: ${said(moved)} vs range ${said(range)}`).toBe(true)
        await foldFullText(page)
        const folded = await helpBox(page)
        expect(near(folded.left, moved.left), `${FR_069_ONLY_THE_DRAWN_BOX}: the move stays ${said(folded)}`).toBe(true)
        expect(near(folded.bottom - folded.top, opened.bottom - opened.top), `${FR_069_FOLD_BACK}: height ${said(folded)} vs ${said(opened)}`).toBe(true)
        expect(near(folded.right - folded.left, opened.right - opened.left), `${FR_069_FOLD_BACK}: width ${said(folded)} vs ${said(opened)}`).toBe(true)
      } finally {
        await app.close()
      }
    })

    test(`FR-069: ${FR_069_NOT_WB_2} -- minimized while open, only the title bar is drawn, and restored it is stretched again`, async () => {
      test.setTimeout(180_000)
      const app = await openApp(size)
      try {
        const { page } = app
        const opened = await openHelp(page)
        const range = await rangeBox(page)
        await openFullText(page)
        await press(page, `${HELP} [data-icon="${MINIMIZE}"]`)
        const minimized = await helpBox(page)
        expect(minimized.bottom - minimized.top, `${FR_069_NOT_WB_2}: the title bar alone ${said(minimized)}`).toBeLessThan((opened.bottom - opened.top) / 2)
        expect(near(minimized.bottom, opened.bottom), `${FR_069_NOT_WB_2}; ${WB_2_PLACE}: the bar ${said(minimized)} vs the folded box ${said(opened)}`).toBe(true)
        await press(page, `${HELP} [data-icon="${MINIMIZE}"]`)
        expect(await isFullTextOpen(page), 'the full text is still open after WB-2 and back').toBe(true)
        expectStretched(await helpBox(page), opened, range, 'back from WB-2')
      } finally {
        await app.close()
      }
    })
  })
}
