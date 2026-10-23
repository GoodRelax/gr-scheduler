// CR-828 on the shipped build: the help's browser functions block shows the dictionary sentence under its rows, in ja and en, within one screen.

import { expect, test, type Browser, type Page } from '@playwright/test'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { bare, specTable, unbroken } from '../contract/spec-table'
import { CLEARING_UP_MS, launchReferenceBrowser, readSettledDrawnSvg, screenOf } from './live-app'
import { rowOf } from './sws-case'

const ROOT = process.cwd()
const REQUIREMENTS = unbroken(readFileSync(join(ROOT, 'docs', 'spec', '01-04-requirements.md'), 'utf8').replace(/\r\n/g, '\n'))

const FR_036_BROWSER_NOTE =
  '⭐ 本表の行の塊は、行の下に 1 文を添え、ブラウザが保存の前に出す確認にサイトの名が出ても、`GRS` は手元のファイルを書き換えるだけでどこへも送らないことを告げること（MUST） —— 利用者が、その確認を GRS がサーバーへ送る印と読ませないために、ヘルプに 1 文を足すと定めた。'
const FR_036_NOTE_WORDS = '文の語は `FR-038` の辞書（`_source/display-words.json`）が、ブラウザの機能の塊の名を鍵にして持つ。'
const FR_036_ONE_SCREEN =
  'ない環境の両方で、ヘルプの言語が日本語でも英語でも、開いたときの大きさ（表 T-335 の `WB-1`）で全部の塊とライセンスの行（`FR-069`）を 1 画面に収め、縦にも横にもスクロールを要さないこと（MUST）'

const WORDS = JSON.parse(readFileSync(join(ROOT, 'docs', 'spec', '_source', 'display-words.json'), 'utf8')) as {
  readonly helpBlockNotes: readonly { readonly block: string; readonly text: Readonly<Record<string, string>> }[]
}
const NOTE = WORDS.helpBlockNotes.find((one) => one.block === 'browser')?.text ?? {}

const SHIPPED_BUILD = join(ROOT, 'dist', 'index.html')
const T_103 = specTable('T-103')
const T_109 = specTable('T-109')
const T_255_ROWS = specTable('T-255').rows.map((row) => row.id)

const nameOf = (id: string): string => bare(rowOf(T_103, id).by['確定名（英）'] ?? '')
const HELP = `[data-role="${nameOf('U-30')}"]`
const HELP_ENTRY = `[data-role="${nameOf('U-31')}"] [data-icon="${rowOf(T_109, 'IC-22').id}"]`
const HELP_LANGUAGE_ENTRY = `${HELP} [data-icon="${rowOf(T_109, 'IC-128').id}"]`

// see FR-036, MC-6
const SCREENS: readonly (readonly [string, { width: number; height: number }])[] = [
  ['1280 x 627', { width: 1280, height: 627 }],
  ['MC-6', screenOf(rowOf(specTable('T-025'), 'MC-6'))],
]

// WHY: a box laid out at a fractional position reads back a fraction off; less than that is not a move.
const EDGE = 1.5

interface NoteReading {
  readonly language: string
  readonly isInTheBlock: boolean
  readonly noteTop: number | null
  readonly noteBottom: number | null
  readonly rowsBottom: number
  readonly bodyBottom: number
  readonly bodyScrolls: boolean
}

let browser: Browser | null = null

test.beforeAll(async () => {
  if (!existsSync(SHIPPED_BUILD)) throw new Error('build the shipped app first (dist/index.html)')
  browser = await launchReferenceBrowser()
})

test.afterAll(async () => {
  test.setTimeout(CLEARING_UP_MS)
  await browser?.close()
})

// see FR-036, T-255
/** @purity semi-pure-b */
async function readNote(page: Page, sentence: Readonly<Record<string, string>>): Promise<NoteReading> {
  return page.evaluate(
    ({ help, rows, words }) => {
      const modal = document.querySelector(help)
      const language = modal?.getAttribute('data-language') ?? ''
      const wanted = words[language] ?? ''
      const firstRow = modal?.querySelector(`[data-row="${rows[0] ?? ''}"]`)
      const block = firstRow?.closest('[data-help-block]') ?? null
      const body = modal?.querySelector('[data-help-column]')?.parentElement?.parentElement ?? null
      const rowBoxes = rows.map((id) => modal?.querySelector(`[data-row="${id}"]`)?.getBoundingClientRect().bottom ?? 0)
      const walker = document.createTreeWalker(modal ?? document.body, NodeFilter.SHOW_TEXT)
      let holder: Element | null = null
      for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
        if ((node.parentElement?.textContent ?? '').includes(wanted) && wanted !== '') {
          holder = node.parentElement
          break
        }
      }
      const box = holder?.getBoundingClientRect() ?? null
      return {
        language,
        isInTheBlock: holder !== null && block !== null && block.contains(holder),
        noteTop: box === null ? null : box.top,
        noteBottom: box === null ? null : box.bottom,
        rowsBottom: Math.max(...rowBoxes),
        bodyBottom: body?.getBoundingClientRect().bottom ?? 0,
        bodyScrolls: body === null ? true : body.scrollHeight > body.clientHeight || body.scrollWidth > body.clientWidth,
      }
    },
    { help: HELP, rows: T_255_ROWS, words: sentence },
  )
}

/** @purity semi-pure-b */
async function isShown(page: Page): Promise<boolean> {
  return page.evaluate((wanted: string) => {
    const box = document.querySelector(wanted)?.getBoundingClientRect()
    return box !== undefined && box.width > 0 && box.height > 0
  }, HELP)
}

/** @purity non-pure */
async function readBothLanguages(size: { width: number; height: number }): Promise<NoteReading[]> {
  if (browser === null) throw new Error('the reference browser was not opened')
  const context = await browser.newContext({ viewport: size, locale: 'ja-JP' })
  try {
    const page = await context.newPage()
    await page.goto(pathToFileURL(SHIPPED_BUILD).href)
    await readSettledDrawnSvg(page)
    await page.click(HELP_ENTRY, { timeout: 8_000 })
    await expect.poll(() => isShown(page)).toBe(true)
    await page.waitForTimeout(400)
    const first = await readNote(page, NOTE)
    await page.click(HELP_LANGUAGE_ENTRY, { timeout: 8_000 })
    await expect.poll(async () => (await readNote(page, NOTE)).language).not.toBe(first.language)
    await page.waitForTimeout(400)
    return [first, await readNote(page, NOTE)]
  } finally {
    await context.close()
  }
}

test.describe('CR-828 -- the manuscript these cases are driven by', () => {
  for (const clause of [FR_036_BROWSER_NOTE, FR_036_NOTE_WORDS, FR_036_ONE_SCREEN]) {
    test(`01-04 still says it: ${clause}`, () => {
      expect(REQUIREMENTS).toContain(clause)
    })
  }

  test('the dictionary holds the sentence in ja and en, and the two differ', () => {
    expect(NOTE['ja']?.length ?? 0).toBeGreaterThan(0)
    expect(NOTE['en']?.length ?? 0).toBeGreaterThan(0)
    expect(NOTE['ja']).not.toBe(NOTE['en'])
    expect(T_255_ROWS.length, 'premise: table T-255 has rows').toBeGreaterThan(0)
  })
})

for (const [screenName, size] of SCREENS) {
  test(`at ${screenName}: ${FR_036_BROWSER_NOTE}`, async () => {
    test.setTimeout(180_000)
    const readings = await readBothLanguages(size)
    expect(readings.map((one) => one.language).sort()).toEqual(['en', 'ja'])
    for (const one of readings) {
      if (one.noteTop === null || one.noteBottom === null) throw new Error(`${one.language}: the help shows no ${one.language} sentence of helpBlockNotes.browser`)
      expect(one.isInTheBlock, `${one.language}: the sentence stands in the block of the T-255 rows`).toBe(true)
      expect(one.noteTop, `${one.language}: the sentence is under the rows`).toBeGreaterThanOrEqual(one.rowsBottom - EDGE)
      expect(one.noteBottom, `${one.language}: ${FR_036_ONE_SCREEN}`).toBeLessThanOrEqual(one.bodyBottom + EDGE)
      expect(one.bodyScrolls, `${one.language}: ${FR_036_ONE_SCREEN}`).toBe(false)
    }
  })
}
