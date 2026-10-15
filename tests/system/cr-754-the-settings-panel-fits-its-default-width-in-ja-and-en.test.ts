// CR-754 on the shipped build: the settings face fits S-171 in ja and en, closes from its own row, and cuts no date or item name (DFC-2516..2520, DFC-2525).

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

import { chromium, expect, test, type Browser, type Page } from '@playwright/test'
import { bare, specTable, unbroken } from '../contract/spec-table'
import { CLEARING_UP_MS, readSettledDrawnSvg, screenOf, taskBodyPoint } from './live-app'
import { rowOf } from './sws-case'

const SPEC = join(process.cwd(), 'docs', 'spec')
const REQUIREMENTS = unbroken(readFileSync(join(SPEC, '01-04-requirements.md'), 'utf8'))
const SETTINGS_BOOK = unbroken(readFileSync(join(SPEC, '_assets', 'tbl-settings.md'), 'utf8'))

// see FR-006, FR-072, S-171
const FR_006_FITS_AT_DEFAULT = '⭐ 既定の幅（`S-171`）では横に送らずに収まる —— 横に送るのは、人が既定より狭めたときだけである。'
const FR_006_SCROLL_NOT_SHRINK = 'パネルを横に送って見せ、選びを縮めない。'
const FR_006_EMPTY_IS_AS_WIDE = '`S-590` を掛けた幅とすること（MUST）。⭐ 値が空でも同じ幅とすること（MUST）'
const FR_006_BREAK_AT_MARKS =
  '⭐ 項目名が項目名の欄の 1 行に収まらないときは、`FR-038` の辞書がその語に持つ折り目でだけ折り、折った行の長さがなるべくそろう折り目を選ぶこと（MUST）'
const FR_006_LONG_PIECE = '⛔ 1 つの区切りが項目名の欄より長いときに限り、その区切りの中で折ってよい'
const FR_006_OTHER_DATE_FIELDS = '⭐ 本段の日付と日時の要る幅は、`GRS` が描くほかの日付の欄にも当てること（MUST）'
const FR_072_CLOSE_ROW =
  '⭐ パネルの先頭に、閉じる入口（`_assets/tbl-glossary.md` の 表 T-109 の `IC-52`）だけの行を置き、閉じる入口をその行の右端に置くこと（MUST）'
const T_369_FOLDABLE = '見出しを押すとその組を畳め、初めはどの組も開いている。'
const S_171_RULE = '横にはみ出さない最も小さい幅とし、10 px 単位に切り上げる。'

const SHIPPED_BUILD = join(process.cwd(), 'dist', 'index.html')
const SCREEN = screenOf(rowOf(specTable('T-025'), 'MC-6'))

// see T-025
const REFERENCE_CHANNEL = 'msedge'

// see U-25, U-24
const roleOf = (id: string): string => `[data-role="${bare(specTable('T-103').rows.find((one) => one.id === id)?.by['確定名（英）'] ?? '')}"]`
const PROPERTIES_PANEL = roleOf('U-25')
const PANEL_DIVIDER = roleOf('U-24')

// see S-171, S-248
const settingPx = (id: string): number => {
  const found = /(\d+(?:\.\d+)?)/.exec(bare(specTable('T-206').rows.find((one) => one.id === id)?.by['既定'] ?? ''))
  if (found === null) throw new Error(`table T-206 row ${id} states no number`)
  return Number(found[1])
}
const S_171 = settingPx('S-171')
const S_248 = settingPx('S-248')

const DOCUMENT_SETTINGS = 'IC-17'
const CLOSE = 'IC-52'
const SHOW_TIME_OF_DAY = 'K-146'
const SEARCH = 'IC-117'

// see T-331
const START_COLUMN = 'SQ-3'
const LOCALES = [
  { language: 'ja', locale: 'ja-JP' },
  { language: 'en', locale: 'en-US' },
] as const

const SETTLE_MS = 700
const SUBPIXEL = 0.5

// WHY: the panel's own box leaves out the one-pixel Panel Divider line that the stated width counts.
const PANEL_EDGE_PX = 1.5

// WHY: at S-171 every ja name fits one line; a width between S-171 and S-248 makes some names take exactly two.
const NARROWED_PX = 360

let browser: Browser | null = null

// WHY: Playwright hides scrollbars by default; S-171 was measured with the vertical scrollbar drawn, so it is drawn here too.
test.beforeAll(async () => {
  if (!existsSync(SHIPPED_BUILD)) throw new Error('build the shipped app first (dist/index.html)')
  browser = await chromium.launch({ channel: REFERENCE_CHANNEL, ignoreDefaultArgs: ['--hide-scrollbars'] })
})

test.afterAll(async () => {
  test.setTimeout(CLEARING_UP_MS)
  await browser?.close()
})

/** @purity non-pure */
async function pressIcon(page: Page, icon: string): Promise<void> {
  const at = await page.evaluate((wanted: string) => {
    const box = document.querySelector(`[data-icon="${wanted}"]`)?.getBoundingClientRect()
    return box === undefined ? null : { x: box.x + box.width / 2, y: box.y + box.height / 2 }
  }, icon)
  expect(at, `premise: ${icon} is on the screen`).not.toBeNull()
  if (at === null) return
  await page.mouse.click(at.x, at.y)
  await page.waitForTimeout(SETTLE_MS)
}

/** @purity non-pure */
async function openSettings(locale: string): Promise<{ readonly page: Page; close(): Promise<void> }> {
  if (browser === null) throw new Error('the reference browser was not opened')
  const context = await browser.newContext({ viewport: SCREEN, locale })
  const page = await context.newPage()
  await page.goto(pathToFileURL(SHIPPED_BUILD).href)
  await readSettledDrawnSvg(page)
  await pressIcon(page, DOCUMENT_SETTINGS)
  await page.waitForSelector(`${PROPERTIES_PANEL}[data-showing="documentSettings"]`)
  return { page, close: () => context.close() }
}

interface Fit {
  readonly language: string
  readonly width: number
  readonly clientWidth: number
  readonly scrollWidth: number
  readonly firstIsWayOut: boolean
  readonly wayOutIcons: readonly string[]
  readonly closeRight: number
  readonly closeTop: number
  readonly contentRight: number
  readonly contentTop: number
  readonly panelFont: number
  readonly groundFont: number
}

/** @purity semi-pure-b */
async function readFit(page: Page): Promise<Fit> {
  return page.evaluate(
    ({ panel, close }: { panel: string; close: string }) => {
      const root = document.querySelector(panel) as HTMLElement
      const style = getComputedStyle(root)
      const box = root.getBoundingClientRect()
      const wayOut = root.firstElementChild as HTMLElement | null
      const entry = root.querySelector(`[data-icon="${close}"]`)?.getBoundingClientRect()
      const borderLeft = Number.parseFloat(style.borderLeftWidth) || 0
      return {
        language: document.documentElement.lang,
        width: box.width,
        clientWidth: root.clientWidth,
        scrollWidth: root.scrollWidth,
        firstIsWayOut: wayOut?.hasAttribute('data-way-out') ?? false,
        wayOutIcons: Array.from(wayOut?.querySelectorAll('[data-icon]') ?? []).map((one) => one.getAttribute('data-icon') ?? ''),
        closeRight: entry?.right ?? Number.NaN,
        closeTop: entry?.top ?? Number.NaN,
        contentRight: box.left + borderLeft + root.clientWidth - (Number.parseFloat(style.paddingRight) || 0),
        contentTop: box.top + (Number.parseFloat(style.paddingTop) || 0),
        panelFont: Number.parseFloat(style.fontSize),
        groundFont: Number.parseFloat(getComputedStyle(document.documentElement).fontSize),
      }
    },
    { panel: PROPERTIES_PANEL, close: CLOSE },
  )
}

interface EntryReading {
  readonly row: string
  readonly type: string
  readonly value: string
  readonly drawn: number
  readonly needed: number
  readonly floor: number
}

const DATE_ENTRIES = 'input[type="date"], input[type="datetime-local"]'
const CHOICE_ENTRIES = 'select[data-field-row]'

// WHY: what the host draws in full is read off a twin of the field let to take its own width (CR-754 section 12, step 3).
/** @purity non-pure */
async function readEntries(page: Page, selector: string, within: string = PROPERTIES_PANEL): Promise<readonly EntryReading[]> {
  return page.evaluate(
    ({ panel, selector }: { panel: string; selector: string }) => {
      const root = document.querySelector(panel) as HTMLElement
      return Array.from(root.querySelectorAll(selector)).map((one) => {
        const entry = one as HTMLInputElement | HTMLSelectElement
        const twin = entry.cloneNode(true) as HTMLInputElement | HTMLSelectElement
        twin.style.width = 'auto'
        twin.style.minWidth = '0'
        twin.style.flex = 'none'
        twin.style.position = 'absolute'
        twin.style.visibility = 'hidden'
        entry.parentElement?.appendChild(twin)
        twin.value = entry.value
        const needed = twin.getBoundingClientRect().width
        twin.remove()
        return {
          row: entry.getAttribute('data-field-row') ?? '',
          type: entry.type,
          value: entry.value,
          drawn: entry.getBoundingClientRect().width,
          needed,
          floor: Number.parseFloat(getComputedStyle(entry).minWidth) || 0,
        }
      })
    },
    { panel: within, selector },
  )
}

/** @purity non-pure */
const readDates = (page: Page): Promise<readonly EntryReading[]> => readEntries(page, DATE_ENTRIES)

interface NameReading {
  readonly row: string
  readonly name: string
  readonly pieces: readonly string[]
  readonly lineStarts: readonly number[]
  readonly pieceWidths: readonly number[]
  readonly lineWidths: readonly number[]
  readonly column: number
}

// WHY: a line starts where a character's top moves down; the pieces are the text between break opportunities (WBR) or, unmarked, the words.
/** @purity non-pure */
async function readNames(page: Page): Promise<readonly NameReading[]> {
  return page.evaluate((panel: string) => {
    const root = document.querySelector(panel) as HTMLElement
    const rows = Array.from(root.querySelectorAll('[data-field-row]')).filter((one) => one.parentElement === root || one.parentElement?.tagName === 'DETAILS')
    const widthOf = (host: HTMLElement, text: string): number => {
      const probe = document.createElement('span')
      probe.style.whiteSpace = 'nowrap'
      probe.style.position = 'absolute'
      probe.style.visibility = 'hidden'
      probe.textContent = text
      host.appendChild(probe)
      const width = probe.getBoundingClientRect().width
      probe.remove()
      return width
    }
    return rows.map((row) => {
      const name = row.firstElementChild as HTMLElement
      const marked = Array.from(name.childNodes).some((one) => one.nodeName === 'WBR')
      const pieces: string[] = ['']
      const texts: Text[] = []
      for (const node of Array.from(name.childNodes)) {
        if (node.nodeName === 'WBR') pieces.push('')
        else if (node.nodeType === Node.TEXT_NODE) {
          texts.push(node as Text)
          pieces[pieces.length - 1] += (node as Text).data
        }
      }
      const whole = pieces.join('')
      const units = marked ? pieces : whole.split(/(?<= )/)
      const tops: number[] = []
      const range = document.createRange()
      for (const text of texts) {
        for (let at = 0; at < text.data.length; at += 1) {
          range.setStart(text, at)
          range.setEnd(text, at + 1)
          const rects = Array.from(range.getClientRects()).filter((one) => one.width > 0)
          tops.push(rects.length === 0 ? Number.NaN : (rects[rects.length - 1] as DOMRect).top)
        }
      }
      const lineStarts: number[] = []
      let lastTop = Number.NaN
      tops.forEach((top, at) => {
        if (Number.isNaN(top)) return
        if (!Number.isNaN(lastTop) && top > lastTop + 2) lineStarts.push(at)
        lastTop = top
      })
      const bounds = [0, ...lineStarts, whole.length]
      const lineWidths = bounds.slice(1).map((end, at) => widthOf(name, whole.slice(bounds[at], end).trim()))
      return {
        row: row.getAttribute('data-field-row') ?? '',
        name: whole,
        pieces: units,
        lineStarts,
        pieceWidths: units.map((one) => widthOf(name, one.trim())),
        lineWidths,
        column: name.clientWidth,
      }
    })
  }, PROPERTIES_PANEL)
}

/** @purity pure */
const boundariesOf = (pieces: readonly string[]): readonly number[] =>
  pieces.reduce<number[]>((ends, piece) => [...ends, (ends[ends.length - 1] ?? 0) + piece.length], []).slice(0, -1)

// WHY: the narrowest longest line any one break between pieces could give a two-line name.
/** @purity pure */
function bestLongerLine(reading: NameReading): number {
  const total = reading.pieceWidths.reduce((sum, one) => sum + one, 0)
  let best = Number.POSITIVE_INFINITY
  let head = 0
  for (const width of reading.pieceWidths.slice(0, -1)) {
    head += width
    best = Math.min(best, Math.max(head, total - head))
  }
  return best
}

/** @purity non-pure */
async function narrowTo(page: Page, width: number | null): Promise<void> {
  const at = await page.evaluate(
    ({ panel, divider }: { panel: string; divider: string }) => {
      const left = document.querySelector(panel)?.getBoundingClientRect().left ?? Number.NaN
      let best: { x: number; y: number; off: number } | null = null
      for (const band of Array.from(document.querySelectorAll(divider))) {
        const box = band.getBoundingClientRect()
        if (box.width <= 0 || box.height <= 0) continue
        const x = box.left + box.width / 2
        const off = Math.abs(x - left)
        if (best === null || off < best.off) best = { x, y: box.top + box.height / 2, off }
      }
      return best
    },
    { panel: PROPERTIES_PANEL, divider: PANEL_DIVIDER },
  )
  expect(at, 'premise: a Panel Divider stands at the panel edge').not.toBeNull()
  if (at === null) return
  await page.mouse.move(at.x, at.y)
  await page.mouse.down()
  // WHY: the divider stands on the panel's left edge, so the panel ends as wide as the screen right of the release.
  await page.mouse.move(width === null ? SCREEN.width - 2 : SCREEN.width - width, at.y, { steps: 16 })
  await page.mouse.up()
  await page.waitForTimeout(SETTLE_MS)
}

test('CR-754 the manuscript this file is driven by still reads this way', () => {
  for (const clause of [FR_006_FITS_AT_DEFAULT, FR_006_SCROLL_NOT_SHRINK, FR_006_EMPTY_IS_AS_WIDE, FR_006_BREAK_AT_MARKS, FR_006_LONG_PIECE, FR_072_CLOSE_ROW, T_369_FOLDABLE]) {
    expect(REQUIREMENTS, clause).toContain(clause)
  }
  expect(SETTINGS_BOOK).toContain(S_171_RULE)
  expect(S_171).toBe(560)
})

for (const { language, locale } of LOCALES) {
  test.describe(`${language}: the settings face at its default width`, () => {
    test(`S-171: ${FR_006_FITS_AT_DEFAULT}`, async () => {
      test.setTimeout(120_000)
      const opened = await openSettings(locale)
      try {
        const fit = await readFit(opened.page)
        expect(fit.language, 'premise: the screen speaks the locale language').toBe(language)
        expect(Math.abs(fit.width - S_171), 'premise: the panel opens S-171 wide (its divider line aside)').toBeLessThanOrEqual(PANEL_EDGE_PX)
        expect(fit.scrollWidth, 'no sideways scroll at the default width').toBeLessThanOrEqual(fit.clientWidth)
        expect(fit.panelFont, 'FR-006 (MUST NOT): the panel is not drawn at the host default size').toBeLessThan(fit.groundFont)
      } finally {
        await opened.close()
      }
    })

    test(`FR-072: ${FR_072_CLOSE_ROW}`, async () => {
      test.setTimeout(120_000)
      const opened = await openSettings(locale)
      try {
        const fit = await readFit(opened.page)
        expect(fit.firstIsWayOut).toBe(true)
        expect(fit.wayOutIcons).toEqual([CLOSE])
        expect(Math.abs(fit.closeRight - fit.contentRight), 'the entrance meets the right edge of the panel content').toBeLessThanOrEqual(1)
        expect(fit.closeTop - fit.contentTop, 'the entrance is the topmost thing in the panel').toBeLessThanOrEqual(1)
      } finally {
        await opened.close()
      }
    })

    test(`FR-006: no date field cuts its format or calendar button, empty or filled -- ${FR_006_EMPTY_IS_AS_WIDE}`, async () => {
      test.setTimeout(120_000)
      const opened = await openSettings(locale)
      try {
        const dates = await readDates(opened.page)
        expect(dates.length, 'premise: IC-44, the two K-141 fields and FO-17 are drawn').toBeGreaterThanOrEqual(4)
        expect(dates.some((one) => one.value === '') && dates.some((one) => one.value !== ''), 'premise: empty and filled fields both stand').toBe(true)
        for (const one of dates) expect(one.drawn, `${one.row} (${one.type}, "${one.value}")`).toBeGreaterThanOrEqual(one.needed - SUBPIXEL)
      } finally {
        await opened.close()
      }
    })

    test(`FR-006: item names break only between their pieces, at S-171, at ${NARROWED_PX} px and at S-248 -- ${FR_006_BREAK_AT_MARKS}`, async () => {
      test.setTimeout(180_000)
      const opened = await openSettings(locale)
      try {
        let wrapped = 0
        for (const width of [null, NARROWED_PX, S_248]) {
          if (width !== null) await narrowTo(opened.page, width === S_248 ? null : width)
          const names = await readNames(opened.page)
          expect(names.length).toBeGreaterThan(0)
          for (const one of names) {
            const where = `${one.row} "${one.name}" at ${width ?? 'S-171'}`
            const ends = boundariesOf(one.pieces)
            for (const start of one.lineStarts) {
              if (ends.includes(start)) continue
              const inside = ends.filter((end) => end < start).length
              expect(one.pieceWidths[inside] ?? 0, `${where} breaks at ${start} inside "${one.pieces[inside]}": ${FR_006_LONG_PIECE}`).toBeGreaterThan(one.column)
            }
            const isWhole = one.pieceWidths.every((piece) => piece <= one.column)
            if (language !== 'ja' || one.lineStarts.length !== 1 || one.pieces.length < 2 || !isWhole) continue
            wrapped += 1
            expect(Math.max(...one.lineWidths), `${where} lines ${JSON.stringify(one.lineWidths)}`).toBeLessThanOrEqual(bestLongerLine(one) + 1)
          }
        }
        if (language === 'ja') expect(wrapped, 'premise: some ja names take exactly two lines').toBeGreaterThan(0)
      } finally {
        await opened.close()
      }
    })

    test(`FR-006 narrowed to S-248: ${FR_006_SCROLL_NOT_SHRINK}`, async () => {
      test.setTimeout(120_000)
      const opened = await openSettings(locale)
      try {
        await narrowTo(opened.page, null)
        const after = await readFit(opened.page)
        expect(Math.abs(after.width - S_248), 'premise: the panel stops at S-248').toBeLessThanOrEqual(PANEL_EDGE_PX)
        expect(after.scrollWidth, 'the panel scrolls sideways').toBeGreaterThan(after.clientWidth)
        const choices = await readEntries(opened.page, CHOICE_ENTRIES)
        expect(choices.length, 'premise: the settings face draws fixed-list choices').toBeGreaterThan(0)
        for (const one of choices) {
          expect(one.drawn, `${one.row} keeps the room FR-006 gives it`).toBeGreaterThanOrEqual(one.floor - SUBPIXEL)
          expect(one.drawn, `${one.row} cuts no option`).toBeGreaterThanOrEqual(one.needed - SUBPIXEL)
        }
        for (const one of await readDates(opened.page)) expect(one.drawn, `${one.row} at the floor`).toBeGreaterThanOrEqual(one.needed - SUBPIXEL)
      } finally {
        await opened.close()
      }
    })
  })
}

test(`T-369: ${T_369_FOLDABLE}`, async () => {
  test.setTimeout(120_000)
  const opened = await openSettings('ja-JP')
  try {
    const states = (): Promise<readonly boolean[]> =>
      opened.page.evaluate(() => Array.from(document.querySelectorAll('details[data-read-only-group]')).map((one) => (one as HTMLDetailsElement).open))
    const first = await states()
    expect(first.length, 'premise: T-380 groups are drawn').toBe(6)
    expect(first.every((one) => one)).toBe(true)
    await opened.page.evaluate(() => (document.querySelector('details[data-read-only-group] > summary') as HTMLElement).scrollIntoView())
    await opened.page.locator('details[data-read-only-group] > summary').first().click()
    await opened.page.waitForTimeout(SETTLE_MS)
    expect(await states()).toEqual([false, true, true, true, true, true])
  } finally {
    await opened.close()
  }
})

test('DFC-2525: with the time shown, a Task panel closes from its own row and cuts no date and time field, empty or filled', async () => {
  test.setTimeout(180_000)
  const opened = await openSettings('ja-JP')
  try {
    const page = opened.page
    await page.locator(`${PROPERTIES_PANEL} input[type="checkbox"][data-field-row="${SHOW_TIME_OF_DAY}"]`).click()
    await page.waitForTimeout(SETTLE_MS)
    await readSettledDrawnSvg(page)
    const at = await taskBodyPoint(page)
    expect(at, 'premise: a Task body can be double-clicked').not.toBeNull()
    if (at === null) return
    await page.mouse.dblclick(at.x, at.y)
    await page.waitForSelector(`${PROPERTIES_PANEL}[data-showing="selection"]`)
    await page.waitForTimeout(SETTLE_MS)
    const fit = await readFit(page)
    expect(fit.firstIsWayOut).toBe(true)
    expect(fit.wayOutIcons).toEqual([CLOSE])
    const dates = await readDates(page)
    expect(dates.filter((one) => one.type === 'datetime-local').length, 'premise: the Task date fields carry the time').toBeGreaterThan(0)
    expect(dates.some((one) => one.value === ''), 'premise: an empty date and time field stands').toBe(true)
    for (const one of dates) expect(one.drawn, `${one.row} (${one.type}, "${one.value}")`).toBeGreaterThanOrEqual(one.needed - SUBPIXEL)
  } finally {
    await opened.close()
  }
})

// see FR-151, SV-7, IC-117, IC-122
test(`SV-7: the start date filter of the search panel cuts neither empty bound -- ${FR_006_OTHER_DATE_FIELDS}`, async () => {
  test.setTimeout(120_000)
  const opened = await openSettings('ja-JP')
  try {
    const page = opened.page
    await pressIcon(page, SEARCH)
    const at = await page.evaluate((column: string) => {
      const box = document.querySelector(`[data-icon="IC-122"][data-search-filter-column="${column}"]`)?.getBoundingClientRect()
      return box === undefined ? null : { x: box.x + box.width / 2, y: box.y + box.height / 2 }
    }, START_COLUMN)
    expect(at, `premise: the ${START_COLUMN} heading carries IC-122`).not.toBeNull()
    if (at === null) return
    await page.mouse.click(at.x, at.y)
    await page.waitForTimeout(SETTLE_MS)
    const bounds = await readEntries(page, DATE_ENTRIES, `div[data-search-filter-column="${START_COLUMN}"]`)
    expect(bounds.length, 'premise: since and until are drawn as host date inputs').toBe(2)
    for (const one of bounds) expect(one.drawn, `${START_COLUMN} ${one.type} "${one.value}"`).toBeGreaterThanOrEqual(one.needed - SUBPIXEL)
  } finally {
    await opened.close()
  }
})
