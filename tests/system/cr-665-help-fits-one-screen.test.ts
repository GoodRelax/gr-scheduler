// CR-665 on the shipped build: the help, opened at its default box, fits one screen at 1280 x 627 and at MC-6 in ja and en.

import { expect, test, type Browser, type Page } from '@playwright/test'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { bare, specTable, unbroken } from '../contract/spec-table'
import { CLEARING_UP_MS, launchReferenceBrowser, readSettledDrawnSvg, screenOf } from './live-app'
import { rowOf } from './sws-case'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

// WHY: each constant ends exactly at its marker, cut from the manuscript as check 39 reads it.
const FR_036_ONE_SCREEN =
  'ない環境の両方で、ヘルプの言語が日本語でも英語でも、開いたときの大きさ（表 T-335 の `WB-1`）で全部の塊と、備考 ※1 の行とライセンスの行（`FR-069`）を 1 画面に収め、縦にも横にもスクロールを要さないこと（MUST）'
const S_203_FITS_BOTH =
  'ne-screen/` が持つ。⭐ 収めるためにヘルプの字を小さくしてよい —— `_assets/tbl-settings.md` の 表 T-206 の `S-203` は、上の 2 つの環境で日英の両方が収まる値とすること（MUST）'
const FR_036_NOTE_1 =
  '4` の行で持つ。⭐ 本文の領域の段の下、ライセンスの行（`FR-069`）の上に備考 ※1 を 1 行で右寄せに置き、AI のアプリから `Agent API` を使うための束（`FR-150`）と最新版を入手する所を示すこと（MUST）'
const FR_069_ONE_LINE =
  'スの名・全文と帰属表示を開く入口の 3 つを 1 行に並べて常に見せ、全文と帰属表示はその下に折りたたんで置くこと（MUST）'
const T_256_SPLIT =
  '4` は後から足した段である）。⭐ `Command Palette` の入口を 2 つの塊に分け、表 T-109 の `群` が `揃える` の行を、`HC-4` の `Task Group Panel` の塊の下の塊へ移すこと（MUST）'
const FR_036_LOW_SCREEN = '⚠️ 後者の環境の閲覧環境の窓は、CSS で約 1280 × 627 である'

const SHIPPED_BUILD = join(process.cwd(), 'dist', 'index.html')
const T_109 = specTable('T-109')
const T_103 = specTable('T-103')
const T_206 = specTable('T-206')
const T_256 = specTable('T-256')

const nameOf = (id: string): string => bare(rowOf(T_103, id).by['確定名（英）'] ?? '')
const HELP = `[data-role="${nameOf('U-30')}"]`
const HELP_ENTRY = `[data-role="${nameOf('U-31')}"] [data-icon="${rowOf(T_109, 'IC-22').id}"]`
const HELP_LANGUAGE_ENTRY = `${HELP} [data-icon="${rowOf(T_109, 'IC-128').id}"]`

// see S-203
const S_203 = Number(bare(rowOf(T_206, 'S-203').by['既定'] ?? '').replace(/[^\d.]/g, ''))

// see T-109, T-256
const surfaceOf = (cell: string): string => cell.replace(/`/g, '').trim()
const PALETTE_ALIGN_ROWS: readonly string[] = T_109.rows
  .filter((row) => surfaceOf(row.by['面'] ?? '') === 'Command Palette' && bare(row.by['群'] ?? '') === '揃える')
  .map((row) => row.id)
const LEFT_OFF_ROWS: readonly string[] = [
  ...T_109.rows.filter((row) => ['Open Chooser', 'Difference Review'].includes(surfaceOf(row.by['面'] ?? ''))).map((row) => row.id),
  'IC-52',
  'IC-53',
  'IC-75',
]

// see FR-036, MC-6
const SCREENS: readonly (readonly [string, { width: number; height: number }])[] = [
  ['1280 x 627 (1920 x 1080 at 150 %, maximised)', { width: 1280, height: 627 }],
  ['MC-6', screenOf(rowOf(specTable('T-025'), 'MC-6'))],
]

// WHY: a box laid out at a fractional position reads back a fraction off; less than that is not a move.
const EDGE = 1.5
// WHY: pieces of one line in different inline boxes can sit a pixel or two apart; a second line is a whole line lower.
const LINE_SPREAD = 4

interface Box {
  readonly left: number
  readonly top: number
  readonly right: number
  readonly bottom: number
}

interface HelpLayout {
  readonly language: string
  readonly body: { readonly scrollHeight: number; readonly clientHeight: number; readonly scrollWidth: number; readonly clientWidth: number }
  readonly fontPx: number
  readonly hostFontPx: number
  readonly columnIds: readonly string[]
  readonly columnsBottom: number
  readonly blocksInHc4: readonly string[]
  readonly rowsByBlock: Readonly<Record<string, readonly string[]>>
  readonly allRows: readonly string[]
  readonly note: { readonly box: Box; readonly text: Box; readonly lineTops: readonly number[]; readonly isInAColumn: boolean } | null
  readonly copyright: Box | null
  readonly licence: Box | null
  readonly fullText: Box | null
  readonly isFullTextOpen: boolean
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

/** @purity semi-pure-b */
async function isShown(page: Page, selector: string): Promise<boolean> {
  return page.evaluate((wanted: string) => {
    const found = document.querySelector(wanted)
    const box = found?.getBoundingClientRect()
    return box !== undefined && box.width > 0 && box.height > 0
  }, selector)
}

// see FR-036, FR-069
/** @purity semi-pure-b */
async function readLayout(page: Page): Promise<HelpLayout> {
  const read = await page.evaluate((help: string) => {
    const boxOf = (one: Element | DOMRect | null | undefined): Box | null => {
      if (one === null || one === undefined) return null
      const box = one instanceof Element ? one.getBoundingClientRect() : one
      return { left: box.left, top: box.top, right: box.right, bottom: box.bottom }
    }
    const modal = document.querySelector(help)
    const firstColumn = modal?.querySelector('[data-help-column]')
    const columns = firstColumn?.parentElement
    const body = columns?.parentElement
    if (modal === null || modal === undefined || columns === null || columns === undefined || body === null || body === undefined) {
      return null
    }
    const columnEls = [...modal.querySelectorAll('[data-help-column]')]
    const hc4 = modal.querySelector('[data-help-column="HC-4"]')
    const rowsByBlock: Record<string, string[]> = {}
    for (const block of modal.querySelectorAll('[data-help-block]')) {
      rowsByBlock[block.getAttribute('data-help-block') ?? ''] = [...block.querySelectorAll('[data-row]')].map(
        (one) => one.getAttribute('data-row') ?? '',
      )
    }
    // WHY: the inked text, not the boxes around it, which may span the whole line.
    const textRects = (root: Element): DOMRect[] => {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
      const rects: DOMRect[] = []
      for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
        if ((node.textContent ?? '').trim() === '') continue
        const range = document.createRange()
        range.selectNodeContents(node)
        rects.push(...[...range.getClientRects()].filter((r) => r.width > 0))
      }
      return rects
    }
    const textBoxOf = (root: Element | null | undefined): Box | null => {
      if (root === null || root === undefined) return null
      const rects = textRects(root)
      if (rects.length === 0) return null
      return {
        left: Math.min(...rects.map((r) => r.left)),
        top: Math.min(...rects.map((r) => r.top)),
        right: Math.max(...rects.map((r) => r.right)),
        bottom: Math.max(...rects.map((r) => r.bottom)),
      }
    }
    const note = modal.querySelector('[data-help-footnote]')
    let noteRead = null
    if (note !== null) {
      noteRead = {
        box: boxOf(note) as Box,
        text: textBoxOf(note) as Box,
        lineTops: [...new Set(textRects(note).map((r) => Math.round((r.top + r.bottom) / 2)))],
        isInAColumn: note.closest('[data-help-column]') !== null,
      }
    }
    const legal = note?.parentElement ?? null
    const copyright =
      legal === null ? null : [...legal.children].find((one) => one !== note && one.tagName !== 'DETAILS' && one.querySelector('a') !== null) ?? null
    const licence = copyright?.nextElementSibling ?? null
    const details = legal?.querySelector('details') ?? null
    return {
      language: modal.getAttribute('data-language') ?? '',
      body: { scrollHeight: body.scrollHeight, clientHeight: body.clientHeight, scrollWidth: body.scrollWidth, clientWidth: body.clientWidth },
      fontPx: Number.parseFloat(getComputedStyle(columns).fontSize),
      hostFontPx: Number.parseFloat(getComputedStyle(document.body).fontSize),
      columnIds: columnEls.map((one) => one.getAttribute('data-help-column') ?? ''),
      columnsBottom: Math.max(...columnEls.map((one) => one.getBoundingClientRect().bottom)),
      blocksInHc4: hc4 === null ? [] : [...hc4.querySelectorAll('[data-help-block]')].map((one) => one.getAttribute('data-help-block') ?? ''),
      rowsByBlock,
      allRows: [...modal.querySelectorAll('[data-row]')].map((one) => one.getAttribute('data-row') ?? ''),
      note: noteRead,
      copyright: textBoxOf(copyright),
      licence: textBoxOf(licence),
      fullText: textBoxOf(details?.querySelector('summary')),
      isFullTextOpen: details?.open ?? false,
    }
  }, HELP)
  if (read === null) throw new Error(`${HELP} draws no body with columns`)
  return read
}

/** @purity non-pure */
async function openHelpIn(size: { width: number; height: number }): Promise<{ page: Page; layouts: HelpLayout[]; close(): Promise<void> }> {
  if (browser === null) throw new Error('the reference browser was not opened')
  const context = await browser.newContext({ viewport: size, locale: 'ja-JP' })
  const page = await context.newPage()
  await page.goto(pathToFileURL(SHIPPED_BUILD).href)
  await readSettledDrawnSvg(page)
  await page.click(HELP_ENTRY, { timeout: 8_000 })
  await expect.poll(() => isShown(page, HELP)).toBe(true)
  await page.waitForTimeout(400)
  const layouts: HelpLayout[] = [await readLayout(page)]
  await page.click(HELP_LANGUAGE_ENTRY, { timeout: 8_000 })
  await expect.poll(async () => (await readLayout(page)).language).not.toBe(layouts[0]?.language)
  await page.waitForTimeout(400)
  layouts.push(await readLayout(page))
  return {
    page,
    layouts,
    /** @purity non-pure */
    async close(): Promise<void> {
      await context.close()
    },
  }
}

const centreY = (box: Box): number => (box.top + box.bottom) / 2
const holdsY = (box: Box, y: number): boolean => y >= box.top - EDGE && y <= box.bottom + EDGE

test.describe('CR-665 the manuscript these cases are driven by', () => {
  for (const [name, clause] of [
    ['FR-036 (MUST) one screen in both environments and both languages', FR_036_ONE_SCREEN],
    ['S-203 (MUST) a value that fits both', S_203_FITS_BOTH],
    ['FR-036 (MUST) note *1 below the columns, above the licence, one right-aligned line', FR_036_NOTE_1],
    ['FR-069 (MUST) copyright, licence name and the full-text entrance on one line', FR_069_ONE_LINE],
    ['T-256 (MUST) the align group moves under the Task Group Panel', T_256_SPLIT],
    ['FR-036 the low environment is about 1280 x 627 in CSS', FR_036_LOW_SCREEN],
  ] as const) {
    test(`01-04 still says it, word for word: ${name}`, () => {
      expect(REQUIREMENTS).toContain(clause)
    })
  }
})

for (const [screenName, size] of SCREENS) {
  test.describe(`the help opened at ${screenName}`, () => {
    let opened: { page: Page; layouts: HelpLayout[]; close(): Promise<void> } | null = null

    test.beforeAll(async () => {
      test.setTimeout(180_000)
      opened = await openHelpIn(size)
    })

    test.afterAll(async () => {
      await opened?.close()
    })

    const layouts = (): HelpLayout[] => {
      if (opened === null) throw new Error('the help was not opened')
      return opened.layouts
    }

    test('premise: the help was read in ja and in en', () => {
      expect(layouts().map((one) => one.language).sort()).toEqual(['en', 'ja'])
    })

    test(`FR-036 (MUST): ${FR_036_ONE_SCREEN}`, () => {
      for (const one of layouts()) {
        expect(one.body.scrollHeight, `${one.language}: no vertical scroll`).toBeLessThanOrEqual(one.body.clientHeight)
        expect(one.body.scrollWidth, `${one.language}: no horizontal scroll`).toBeLessThanOrEqual(one.body.clientWidth)
      }
    })

    test(`S-203 (MUST): ${S_203_FITS_BOTH}`, () => {
      expect(S_203).toBeGreaterThan(0)
      for (const one of layouts()) {
        expect(one.fontPx, `${one.language}: the help letters are the host letters times S-203`).toBeCloseTo(one.hostFontPx * S_203, 1)
      }
    })

    test(`FR-036 (MUST): ${FR_036_NOTE_1}`, () => {
      for (const one of layouts()) {
        const note = one.note
        if (note === null) throw new Error(`${one.language}: the help draws no note *1`)
        expect(note.isInAColumn, `${one.language}: the note is not in a column`).toBe(false)
        expect(note.box.top, `${one.language}: the note stands below the columns`).toBeGreaterThanOrEqual(one.columnsBottom - EDGE)
        const spread = Math.max(...note.lineTops) - Math.min(...note.lineTops)
        expect(spread, `${one.language}: the note is one line (${note.lineTops.join(', ')})`).toBeLessThanOrEqual(LINE_SPREAD)
        expect(Math.abs(note.text.right - note.box.right), `${one.language}: the note is right-aligned`).toBeLessThanOrEqual(EDGE)
        expect(note.text.left - note.box.left, `${one.language}: the note does not start at the left`).toBeGreaterThan(EDGE)
        if (one.copyright === null) throw new Error(`${one.language}: no copyright line`)
        expect(note.box.bottom, `${one.language}: the note is above the licence line`).toBeLessThanOrEqual(one.copyright.top + EDGE)
      }
    })

    test(`FR-069 (MUST): ${FR_069_ONE_LINE}`, () => {
      for (const one of layouts()) {
        const { copyright, licence, fullText } = one
        if (copyright === null || licence === null || fullText === null) throw new Error(`${one.language}: a part of the licence line is missing`)
        for (const [name, other] of [
          ['the licence name', licence],
          ['the full-text entrance', fullText],
        ] as const) {
          expect(holdsY(copyright, centreY(other)), `${one.language}: ${name} shares the copyright line`).toBe(true)
          expect(holdsY(other, centreY(copyright)), `${one.language}: the copyright shares the line of ${name}`).toBe(true)
        }
        expect(copyright.right, `${one.language}: copyright, then the licence name`).toBeLessThanOrEqual(licence.left + EDGE)
        expect(licence.right, `${one.language}: the licence name, then the full-text entrance`).toBeLessThanOrEqual(fullText.left + EDGE)
        expect(one.isFullTextOpen, `${one.language}: the full text stays folded`).toBe(false)
      }
    })

    test(`T-256 (MUST): ${T_256_SPLIT}`, () => {
      for (const one of layouts()) {
        expect(one.columnIds, `${one.language}: the columns in the order of table T-256`).toEqual(T_256.rows.map((row) => row.id))
        expect(one.blocksInHc4, `${one.language}: HC-4 holds the two blocks`).toEqual(['Task Group Panel', 'Command Palette (continued)'])
        expect([...(one.rowsByBlock['Command Palette (continued)'] ?? [])].sort(), `${one.language}: only the align group`).toEqual(
          [...PALETTE_ALIGN_ROWS].sort(),
        )
        expect(one.allRows.filter((row) => LEFT_OFF_ROWS.includes(row)), `${one.language}: no row FR-036 leaves off`).toEqual([])
      }
    })
  })
}
