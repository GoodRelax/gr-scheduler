// CR-669 on the shipped build: the help maximises, moves and widens only within the Schedule Canvas, and brackets its added words.

import { expect, test, type Browser, type Page } from '@playwright/test'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { bare, specTable, unbroken } from '../contract/spec-table'
import { CLEARING_UP_MS, launchReferenceBrowser, readSettledDrawnSvg } from './live-app'
import { rowOf } from './sws-case'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

// WHY: each constant ends exactly at its marker, cut from the manuscript as check 39 reads it.
const FR_036_MAXIMISED =
  'ヘルプを最大化したときに占める範囲は、`Schedule Canvas`（`_assets/tbl-glossary.md` の `U-32`）の全体とする（MUST）'
const WB_8_FOLLOWS = 'タイトルバーの帯（表 T-023d の `GR-24`）を握っているあいだ、ウィンドウをポインタに追従させること（MUST）'
const WB_8_RANGE = 'ウィンドウを、ウィンドウごとの範囲（`WB-3` と同じ）の外へ出してはならない（MUST NOT）'
const WB_9_FOLLOWS = '縁と角（表 T-023d の `GR-25`）を握っているあいだ、ウィンドウの大きさをポインタに追従させること（MUST）'
const WB_9_RANGE = 'ウィンドウごとの範囲の外へ広げてはならない（MUST NOT）'
const FR_036_BRACKETS = '⭐ `IC-54` と `IC-20` の項目に添える語は、丸括弧で囲むこと（MUST）'
const T_337_THE_FRONT_ONE_TAKES_THE_PRESS = '⭐ 押下は、その点で最も手前に描かれた UI パーツが受けること（MUST）'
const FR_036_ONE_SCREEN =
  'ない環境の両方で、ヘルプの言語が日本語でも英語でも、開いたときの大きさ（表 T-335 の `WB-1`）で全部の塊と、備考 ※1 の行とライセンスの行（`FR-069`）を 1 画面に収め、縦にも横にもスクロールを要さないこと（MUST）'
const S_203_FITS_BOTH =
  '⭐ 収めるためにヘルプの字を小さくしてよい —— `_assets/tbl-settings.md` の 表 T-206 の `S-203` は、上の 2 つの環境で日英の両方が収まる値とすること（MUST）'
// WHY: plain sentences the cases below lean on; no marker of their own.
const WB_3_RANGE = 'ヘルプ・検索パネル・遅延診断レポートの窓・対話欄のどれも `Schedule Canvas`（`U-32`）の全体'
const FR_036_HEADER_STAYS = 'ヘルプを実物の横へ寄せて見比べるあいだも、`App Header` の入口は隠れない'
const FR_036_ONE_SPACE = '項目の説明は名の語と添える語を半角の空白 1 つで繋ぐ'
const FR_036_IN_THE_DICTIONARY = '括弧は辞書の語の中に持ち、描き手は足さない'
const UZ_9_CANVAS_BELOW_HEADER = '動かせる範囲は `Schedule Canvas` の中（`FR-066`）なので、`App Header` と重ならない'
const FR_036_LOW_SCREEN = '⚠️ 後者の環境の閲覧環境の窓は、CSS で約 1280 × 627 である'
const FR_038_HELP_LANGUAGE_ONLY = '画面の言語だけを替え、ヘルプの言語を替えない'

const SHIPPED_BUILD = join(process.cwd(), 'dist', 'index.html')
const T_103 = specTable('T-103')
const T_109 = specTable('T-109')

const partOf = (id: string): string => `[data-role="${bare(rowOf(T_103, id).by['確定名（英）'] ?? '')}"]`
const HELP = partOf('U-30')
const HEADER = partOf('U-31')
const iconOf = (id: string): string => rowOf(T_109, id).id
const OPEN_HELP = iconOf('IC-22')
const SCREEN_LANGUAGE = iconOf('IC-21')
const HELP_LANGUAGE = iconOf('IC-128')
const MAXIMISE = iconOf('IC-130')
const RESTORE = iconOf('IC-131')
const CLOSE = iconOf('IC-52')

type Language = 'ja' | 'en'
type Words = Readonly<Record<Language, string>>

const WORDS = JSON.parse(readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'display-words.json'), 'utf8')) as {
  readonly icons: readonly { readonly rowId: string; readonly label: Words }[]
  readonly helpNotes: readonly { readonly rowId: string; readonly text: Words }[]
}
const labelOf = (rowId: string, language: Language): string => {
  const found = WORDS.icons.find((one) => one.rowId === rowId)
  if (found === undefined) throw new Error(`the dictionary holds no label for ${rowId}`)
  return found.label[language]
}

// see FR-036
const LOW_SCREEN = { width: 1280, height: 627 }
// WHY: a box laid out at a fractional position reads back a fraction off; less than that is not a move.
const EDGE = 1.5
// WHY: far enough past every edge of the range at the low screen that only the range can stop the box.
const FAR = 400

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

// see U-32, UZ-9
/** @purity semi-pure-b */
async function scheduleCanvasBox(page: Page): Promise<Box> {
  const header = await boxOf(page, HEADER)
  if (header === null) throw new Error(`${HEADER} is not on the screen`)
  const view = page.viewportSize()
  if (view === null) throw new Error('the page has no viewport')
  return { left: 0, top: header.bottom, right: view.width, bottom: view.height }
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
      for (const fx of [0.5, 0.3, 0.7]) {
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

test.describe('CR-669 the manuscript these cases are driven by', () => {
  for (const [name, clause] of [
    ['FR-036 (MUST) the maximised help fills the Schedule Canvas', FR_036_MAXIMISED],
    ['T-335 WB-3 every window maximises to the Schedule Canvas', WB_3_RANGE],
    ['T-335 WB-8 (MUST) the window follows the title band', WB_8_FOLLOWS],
    ['T-335 WB-8 (MUST NOT) not outside the range', WB_8_RANGE],
    ['T-335 WB-9 (MUST) the size follows the edge', WB_9_FOLLOWS],
    ['T-335 WB-9 (MUST NOT) not wider than the range', WB_9_RANGE],
    ['FR-036 the App Header entrances stay visible', FR_036_HEADER_STAYS],
    ['FR-036 (MUST) the added words are bracketed', FR_036_BRACKETS],
    ['FR-036 name and added words joined by one space', FR_036_ONE_SPACE],
    ['FR-036 the brackets live in the dictionary', FR_036_IN_THE_DICTIONARY],
    ['T-337 UZ-9 the Schedule Canvas does not overlap the App Header', UZ_9_CANVAS_BELOW_HEADER],
    ['T-337 (MUST) the front part takes the press', T_337_THE_FRONT_ONE_TAKES_THE_PRESS],
    ['FR-036 (MUST) one screen', FR_036_ONE_SCREEN],
    ['S-203 (MUST) fits both languages', S_203_FITS_BOTH],
    ['FR-036 the low environment is about 1280 x 627', FR_036_LOW_SCREEN],
    ['T-336 HN-6 the screen language entrance leaves the help language', FR_038_HELP_LANGUAGE_ONLY],
  ] as const) {
    test(`01-04 still says it, word for word: ${name}`, () => {
      expect(REQUIREMENTS).toContain(clause)
    })
  }
})

test.describe('CR-669 FR-036 / WB-3 -- the maximised help', () => {
  test(`FR-036 (MUST): ${FR_036_MAXIMISED}`, async () => {
    test.setTimeout(180_000)
    const app = await openApp(LOW_SCREEN)
    try {
      const { page } = app
      await openHelp(page)
      await press(page, `${HELP} [data-icon="${MAXIMISE}"]`)
      await expect.poll(async () => (await boxOf(page, `${HELP} [data-icon="${RESTORE}"]`)) !== null, { message: 'WB-4: IC-131 while maximised' }).toBe(true)
      const box = await helpBox(page)
      const canvas = await scheduleCanvasBox(page)
      for (const side of ['left', 'top', 'right', 'bottom'] as const) {
        expect(near(box[side], canvas[side]), `${side}: help ${said(box)} vs Schedule Canvas ${said(canvas)}`).toBe(true)
      }
    } finally {
      await app.close()
    }
  })

  test(`FR-036: ${FR_036_HEADER_STAYS} -- every App Header entrance is the front while the help is maximised, and one press reaches it`, async () => {
    test.setTimeout(180_000)
    const app = await openApp(LOW_SCREEN)
    try {
      const { page } = app
      await openHelp(page)
      await press(page, `${HELP} [data-icon="${MAXIMISE}"]`)
      await expect.poll(async () => (await boxOf(page, `${HELP} [data-icon="${RESTORE}"]`)) !== null).toBe(true)
      const entrances = await page.evaluate((header: string) => {
        return [...document.querySelectorAll(`${header} [data-icon]`)]
          .filter((one) => {
            const box = one.getBoundingClientRect()
            return box.width > 0 && box.height > 0
          })
          .map((one) => one.getAttribute('data-icon') ?? '')
      }, HEADER)
      expect(entrances, `${HEADER} draws its entrances`).toContain(OPEN_HELP)
      const hidden: string[] = []
      for (const icon of entrances) {
        if ((await frontPointOf(page, `${HEADER} [data-icon="${icon}"]`)) === null) hidden.push(icon)
      }
      expect(hidden, `${T_337_THE_FRONT_ONE_TAKES_THE_PRESS}: App Header entrances under the maximised help`).toEqual([])

      // STEP: T-336 HN-6 -- the screen language entrance is pressed through; the help keeps its language and its box
      const before = await helpBox(page)
      const helpLanguage = await page.evaluate((help: string) => document.querySelector(help)?.getAttribute('data-language') ?? '', HELP)
      const screenLanguage = await page.evaluate(() => document.documentElement.lang)
      await press(page, `${HEADER} [data-icon="${SCREEN_LANGUAGE}"]`)
      await expect
        .poll(() => page.evaluate(() => document.documentElement.lang), { message: `${SCREEN_LANGUAGE} pressed while the help is maximised` })
        .not.toBe(screenLanguage)
      expect(await page.evaluate((help: string) => document.querySelector(help)?.getAttribute('data-language') ?? '', HELP), FR_038_HELP_LANGUAGE_ONLY).toBe(
        helpLanguage,
      )
      const after = await helpBox(page)
      expect(near(after.top, before.top) && near(after.bottom, before.bottom), `still maximised: ${said(after)} vs ${said(before)}`).toBe(true)
    } finally {
      await app.close()
    }
  })
})

test.describe('CR-669 T-335 WB-8 / WB-9 -- moving and resizing stop at the Schedule Canvas', () => {
  test(`WB-8 (MUST NOT): ${WB_8_RANGE} -- dragged far up and left, the help stops at the App Header's bottom and the left edge`, async () => {
    test.setTimeout(180_000)
    const app = await openApp(LOW_SCREEN)
    try {
      const { page } = app
      const opened = await openHelp(page)
      const canvas = await scheduleCanvasBox(page)
      await dragBy(page, await titleBandPoint(page), { x: -FAR, y: -FAR })
      const moved = await helpBox(page)
      expect(moved.top, `${WB_8_FOLLOWS}: the help moved up ${said(moved)} vs ${said(opened)}`).toBeLessThan(opened.top - EDGE)
      expect(near(moved.top, canvas.top), `${WB_8_RANGE}: top ${said(moved)} stops at the App Header's bottom ${canvas.top}`).toBe(true)
      expect(near(moved.left, canvas.left), `${WB_8_RANGE}: left ${said(moved)} stops at ${canvas.left}`).toBe(true)
      expect(near(moved.bottom - moved.top, opened.bottom - opened.top), 'WB-8 moves, it does not resize').toBe(true)

      // STEP: the other way -- far down and right, the help stops at the window's bottom and right
      await dragBy(page, await titleBandPoint(page), { x: FAR * 2, y: FAR * 2 })
      const back = await helpBox(page)
      expect(back.bottom, `${WB_8_RANGE}: bottom ${said(back)}`).toBeLessThanOrEqual(canvas.bottom + EDGE)
      expect(back.right, `${WB_8_RANGE}: right ${said(back)}`).toBeLessThanOrEqual(canvas.right + EDGE)
      expect(back.top, `${WB_8_RANGE}: top ${said(back)}`).toBeGreaterThanOrEqual(canvas.top - EDGE)
    } finally {
      await app.close()
    }
  })

  test(`WB-9 (MUST NOT): ${WB_9_RANGE} -- the top edge pulled far up stops at the App Header's bottom, the right edge at the window's right`, async () => {
    test.setTimeout(180_000)
    const app = await openApp(LOW_SCREEN)
    try {
      const { page } = app
      const opened = await openHelp(page)
      const canvas = await scheduleCanvasBox(page)

      // STEP: GR-25 -- the top edge, a little outside the box, in the middle of its width
      await dragBy(page, { x: (opened.left + opened.right) / 2, y: opened.top - 2 }, { x: 0, y: -FAR })
      const taller = await helpBox(page)
      expect(taller.top, `${WB_9_FOLLOWS}: the top edge rose ${said(taller)} vs ${said(opened)}`).toBeLessThan(opened.top - EDGE)
      expect(near(taller.top, canvas.top), `${WB_9_RANGE}: top ${said(taller)} stops at the App Header's bottom ${canvas.top}`).toBe(true)
      expect(near(taller.bottom, opened.bottom), 'WB-9: the opposite edge stays').toBe(true)

      // STEP: GR-25 -- the right edge, half way down
      await dragBy(page, { x: taller.right - 1, y: (taller.top + taller.bottom) / 2 }, { x: FAR, y: 0 })
      const wider = await helpBox(page)
      expect(wider.right, `${WB_9_FOLLOWS}: the right edge moved ${said(wider)} vs ${said(taller)}`).toBeGreaterThan(taller.right + EDGE)
      expect(near(wider.right, canvas.right), `${WB_9_RANGE}: right ${said(wider)} stops at ${canvas.right}`).toBe(true)
      expect(near(wider.left, taller.left), 'WB-9: the opposite edge stays').toBe(true)
      expect(wider.top, `${WB_9_RANGE}: still below the App Header ${said(wider)}`).toBeGreaterThanOrEqual(canvas.top - EDGE)
    } finally {
      await app.close()
    }
  })
})

// see FR-036
/** @purity semi-pure-b */
async function readItemsAndScroll(page: Page): Promise<{
  language: string
  items: Readonly<Record<string, string>>
  scrollHeight: number
  clientHeight: number
}> {
  const read = await page.evaluate(
    (asked: { help: string; rows: readonly string[] }) => {
      const modal = document.querySelector(asked.help)
      const columns = modal?.querySelector('[data-help-column]')?.parentElement
      const body = columns?.parentElement
      if (modal === null || modal === undefined || body === null || body === undefined) return null
      const items: Record<string, string> = {}
      for (const row of asked.rows) {
        const item = modal.querySelector(`[data-row="${row}"]`)
        // WHY: the item's text spans are the description then the assignment; the description is the first non-empty one.
        const spans = item === null ? [] : [...item.querySelectorAll('span')].map((one) => one.textContent ?? '').filter((t) => t.trim() !== '')
        items[row] = spans[0] ?? ''
      }
      return { language: modal.getAttribute('data-language') ?? '', items, scrollHeight: body.scrollHeight, clientHeight: body.clientHeight }
    },
    { help: HELP, rows: WORDS.helpNotes.map((one) => one.rowId) },
  )
  if (read === null) throw new Error(`${HELP} draws no body with columns`)
  return read
}

test.describe('CR-669 FR-036 brackets and S-203 at 1280 x 627 -- the help opened at its default box, ja and en', () => {
  let app: { page: Page; close(): Promise<void> } | null = null
  const readings: Awaited<ReturnType<typeof readItemsAndScroll>>[] = []

  test.beforeAll(async () => {
    test.setTimeout(180_000)
    app = await openApp(LOW_SCREEN)
    await openHelp(app.page)
    readings.push(await readItemsAndScroll(app.page))
    await press(app.page, `${HELP} [data-icon="${HELP_LANGUAGE}"]`)
    await expect.poll(async () => (await readItemsAndScroll(app?.page as Page)).language).not.toBe(readings[0]?.language)
    await app.page.waitForTimeout(300)
    readings.push(await readItemsAndScroll(app.page))
  })

  test.afterAll(async () => {
    await app?.close()
  })

  test('premise: the help was read in ja and in en, and the dictionary names IC-54 and IC-20 for added words', () => {
    expect(readings.map((one) => one.language).sort()).toEqual(['en', 'ja'])
    expect(WORDS.helpNotes.map((one) => one.rowId).sort()).toEqual(['IC-20', 'IC-54'])
  })

  test(`FR-036 (MUST): ${FR_036_BRACKETS} -- the dictionary words start with "(" and end with ")"`, () => {
    for (const note of WORDS.helpNotes) {
      for (const language of ['ja', 'en'] as const) {
        const text = note.text[language]
        expect(text.startsWith('('), `${note.rowId} ${language}: ${JSON.stringify(text)}`).toBe(true)
        expect(text.endsWith(')'), `${note.rowId} ${language}: ${JSON.stringify(text)}`).toBe(true)
      }
    }
  })

  test(`FR-036 (MUST): ${FR_036_BRACKETS} -- the item reads its name, one space, then the bracketed words`, () => {
    for (const reading of readings) {
      const language = reading.language as Language
      for (const note of WORDS.helpNotes) {
        const expected = `${labelOf(note.rowId, language)} ${note.text[language]}`
        expect(reading.items[note.rowId]?.trim(), `${note.rowId} in ${language}: ${FR_036_ONE_SPACE}`).toBe(expected)
      }
    }
  })

  test(`FR-036 (MUST) / S-203 (MUST): ${FR_036_LOW_SCREEN} -- the help body does not scroll vertically`, () => {
    for (const reading of readings) {
      expect(reading.scrollHeight, `${reading.language}: ${FR_036_ONE_SCREEN}`).toBeLessThanOrEqual(reading.clientHeight)
    }
  })
})
