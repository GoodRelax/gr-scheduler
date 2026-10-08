// W3 spec-only cases on the shipped build: FR-025 IX-12 / IX-14 / IX-15 / IX-16 (the export span picture) and FR-096 (the Export Chooser row, its span line).

import { expect, test, type Browser, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { bare, specTable, unbroken } from '../contract/spec-table'
import { CLEARING_UP_MS, launchReferenceBrowser } from './live-app'
import { openDocument, openStage, pressEntrance, settle, type Stage } from './cr-570-tree-state-stage'
import { rowOf } from './sws-case'
import { applyCommandsOf, exportSvgOf, rowsDocument } from './w3-t1-stage'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

// WHY: each constant ends exactly at its marker, cut from the manuscript as check 39 reads it.
const IX_12 = '表 T-024 の `IO-3`・`IO-4`・`IO-6` の絵を `IX-13` 〜 `IX-17` で描くこと（MUST）'
const IX_14_ALL_ROWS = '| IX-14 | 期間の絵の縦 | ⭐ `FR-018` の 表 T-329 が描く行のすべてを、上から下まで並べること（MUST）'
const IX_14_ZOOM_ONE = '行の高さは、`FR-039` の 表 T-252 の `DS-8` の縦のズーム（表 T-203 の `S-76`）を 1 と置いて組むこと（MUST）（`DS-13` は縦のズームを掛けない）'
const IX_15_NO_FIT = '`S-217` を超えるときは `IX-5` ・ `IX-6` のとおりとする。⛔ 収めるために、行の高さ・1 日の幅・字の大きさを変えてはならない（MUST NOT）'
const IX_16 = '| IX-16 | 期間の絵に描く UI パーツ | 表 T-076 に従うこと（MUST）'
const FR_096_SPAN = '行の語は `FR-038` の辞書の `exportChooser` の `exportSpan` の語とし、その中の 2 つの日を 表 T-251 の `ND-4`・`ND-5` の形で書くこと（MUST）'
const EP_3_NO_DOM = '画面は名前を箱の上端に寄せて置き、書き出しは字をベースラインで置くので、測らずに同じ高さへ揃えるには上端からの補正が要る —— `EP-1` の `Document Title` と同じ考え方である。⛔ DOM を測って揃えてはならない（MUST NOT）'
const WB_10_MOVE = '題の行の帯（表 T-023d の `GR-24`）で動かす —— 追従と、位置が決まる時点と、中断は `WB-8` と同じとすること（MUST）'
const FR_077_NO_FLOOR = '期間を持つときは縮めない（`FR-025` の 表 T-241 の `IX-13`）。⚠️ **画像の側に下限を課してはならない（MUST NOT）'
const FR_096_GAP = '⭐ 上下に隣り合う 2 つの形式のボタンのあいだは、`_assets/tbl-settings.md` の 表 T-206 の `S-517` の隔たりとすること（MUST）。⭐ 選択面の幅は、縦に並べた形式と見出しの段が決めること（MUST）'

const WORDS = JSON.parse(readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'display-words.json'), 'utf8')) as {
  readonly exportChooser: readonly { readonly part: string; readonly text: { readonly ja: string; readonly en: string } }[]
}
const SPAN_WORDS = WORDS.exportChooser.find((one) => one.part === 'exportSpan')?.text ?? { ja: '', en: '' }

// see S-517
const S_517_EM = Number(/[\d.]+/.exec(bare(rowOf(specTable('T-206'), 'S-517').cells[1] ?? ''))?.[0] ?? NaN)
// see S-217
const S_217 = Number(/\d+/.exec(bare(rowOf(specTable('T-204'), 'S-217').by['既定'] ?? ''))?.[0] ?? NaN)
const EXPORT_CHOOSER = `[data-role="${bare(rowOf(specTable('T-103'), 'U-54').cells[0] ?? '')}"]`
const PALETTE_COMMANDS = `[data-role="${bare(rowOf(specTable('T-103'), 'U-26').cells[0] ?? '')}"]`
const OPEN_EXPORT_CHOOSER = rowOf(specTable('T-109'), 'IC-2').id

const SPAN_28 = { exportSpanStart: '2026-03-02T00:00:00', exportSpanFinish: '2026-03-29T00:00:00' }
const SPAN_14 = { exportSpanStart: '2026-03-02T00:00:00', exportSpanFinish: '2026-03-15T00:00:00' }

let browser: Browser | null = null

test.beforeAll(async () => {
  browser = await launchReferenceBrowser()
})

test.afterAll(async () => {
  test.setTimeout(CLEARING_UP_MS)
  await browser?.close()
})

/** @purity non-pure */
async function stageWith(rows: number, settings: Readonly<Record<string, unknown>>): Promise<Stage> {
  if (browser === null) throw new Error('no browser')
  const opened = await openStage(browser)
  await openDocument(opened.page, 'w3-t1-span.json', rowsDocument({ rows, settings }))
  return opened
}

/** @purity semi-pure-b */
async function pictureOf(page: Page): Promise<string> {
  const answer = await exportSvgOf(page)
  expect(answer.ok, 'AM-13 answers a picture').toBe(true)
  return String(answer.value)
}

// WHY: the watermark carries the clock and the clip paths carry a fresh id per drawing; neither is the picture.
/** @purity pure */
function sameness(svg: string): string {
  return svg.replace(/\d{4}-\d\d-\d\dT[0-9]{2}:[0-9]{2}:[0-9]{2}Z/g, 'T').replace(/(grs-[a-z-]+?)-[0-9a-z]{4,}(?=[")])/g, '$1')
}

/** @purity pure */
function textYOf(svg: string, text: string): number | null {
  const found = new RegExp(`<text\\b[^>]*\\sy="([\\d.]+)"[^>]*>${text}</text>`).exec(svg)
  return found === null ? null : Number(found[1])
}

/** @purity pure */
function fontSizeOf(svg: string, text: string): number {
  return Number(new RegExp(`<text\\b[^>]*\\sfont-size="([\\d.]+)"[^>]*>${text}</text>`).exec(svg)?.[1] ?? NaN)
}

interface Span {
  readonly left: number
  readonly right: number
}

/** @purity pure */
function planOf(svg: string, uid: number): Span {
  const points = new RegExp(`<polygon points="([^"]+)"[^>]*data-figure="task-${uid}-plan"`).exec(svg)?.[1]
  if (points === undefined) throw new Error(`task ${uid} has no plan bar in the picture`)
  const xs = points.split(' ').map((pair) => Number(pair.split(',')[0]))
  return { left: Math.min(...xs), right: Math.max(...xs) }
}

/** @purity pure */
function heightOf(svg: string): number {
  return Number(/^<svg\b[^>]*\sheight="([\d.]+)"/.exec(svg)?.[1] ?? NaN)
}

/** @purity semi-pure-b */
async function screenRowPitch(page: Page): Promise<number> {
  return page.evaluate(() => {
    const tops = [...document.querySelectorAll('[data-depth]')]
      .map((one) => one.getBoundingClientRect())
      .filter((box) => box.height > 0)
      .map((box) => box.top)
      .sort((a, b) => a - b)
    return (tops[1] ?? NaN) - (tops[0] ?? NaN)
  })
}

test.describe('W3-T1 the manuscript these cases are driven by', () => {
  test('IX-12, IX-14, IX-15, IX-16 and FR-096 still read this way', () => {
    for (const clause of [IX_12, IX_14_ALL_ROWS, IX_14_ZOOM_ONE, IX_15_NO_FIT, IX_16, FR_096_SPAN, FR_096_GAP, EP_3_NO_DOM, WB_10_MOVE, FR_077_NO_FLOOR]) {
      expect(REQUIREMENTS, clause).toContain(clause)
    }
    expect(SPAN_WORDS.en, 'premise: the dictionary holds the exportSpan word').toContain('{start}')
    expect(S_517_EM, 'premise: S-517 is a number of em').toBeGreaterThan(0)
  })
})

test.describe('FR-025 the export span picture on the shipped build', () => {
  test.setTimeout(240_000)

  test(`IX-14 (MUST): ${IX_14_ALL_ROWS.slice(-40)} -- 80 rows, every row in the span picture`, async () => {
    const opened = await stageWith(80, {})
    try {
      const without = await pictureOf(opened.page)
      expect(textYOf(without, 'Row 80'), 'premise: with no span, a row below the screen is not in the picture (IX-4)').toBeNull()
      await applyCommandsOf(opened.page, [{ kind: 'setExportSpan', ...SPAN_28 }])
      await settle(opened.page)
      const withSpan = await pictureOf(opened.page)
      const missing = Array.from({ length: 80 }, (_one, index) => `Row ${String(index + 1).padStart(2, '0')}`).filter(
        (label) => textYOf(withSpan, label) === null,
      )
      expect(missing, 'every row is laid top to bottom').toEqual([])
      const ys = Array.from({ length: 80 }, (_one, index) => textYOf(withSpan, `Row ${String(index + 1).padStart(2, '0')}`) ?? NaN)
      expect(ys.every((y, index) => index === 0 || y > (ys[index - 1] ?? Infinity)), 'in row order, top to bottom').toBe(true)
    } finally {
      await opened.close()
    }
  })

  test(`IX-14 (MUST): ${IX_14_ZOOM_ONE.slice(-40)} -- the screen zoomed to 2 leaves the picture's row pitch at the zoom-1 pitch`, async () => {
    const opened = await stageWith(30, SPAN_28)
    try {
      const pitchAtOne = await screenRowPitch(opened.page)
      const first = await pictureOf(opened.page)
      const pictured = (textYOf(first, 'Row 02') ?? NaN) - (textYOf(first, 'Row 01') ?? NaN)
      expect(pictured).toBeCloseTo(pitchAtOne, 1)
      await applyCommandsOf(opened.page, [{ kind: 'setZoom', zoomX: 1, zoomY: 2 }])
      await settle(opened.page)
      const pitchAtTwo = await screenRowPitch(opened.page)
      expect(pitchAtTwo, 'premise: the screen rows grew with the zoom').toBeGreaterThan(pitchAtOne * 1.5)
      const second = await pictureOf(opened.page)
      expect((textYOf(second, 'Row 02') ?? NaN) - (textYOf(second, 'Row 01') ?? NaN)).toBeCloseTo(pitchAtOne, 1)
      expect(sameness(second), 'the whole picture is unchanged').toBe(sameness(first))
    } finally {
      await opened.close()
    }
  })

  test(`IX-12 (MUST): ${IX_12.slice(-40)} -- the day width is the Row Area over the span's days, whatever the window`, async () => {
    const opened = await stageWith(12, SPAN_28)
    try {
      const at28 = await pictureOf(opened.page)
      const bar28 = planOf(at28, 1)
      const day28 = (bar28.right - bar28.left) / 3
      // see IX-13
      expect(planOf(at28, 2).left - bar28.left, 'task 2 starts 7 days after task 1').toBeCloseTo(7 * day28, 1)
      await opened.page.setViewportSize({ width: 1280, height: 720 })
      await settle(opened.page)
      expect(sameness(await pictureOf(opened.page)), 'IX-12: the window size does not move the picture').toBe(sameness(at28))
      await applyCommandsOf(opened.page, [{ kind: 'setExportSpan', ...SPAN_14 }])
      await settle(opened.page)
      const at14 = await pictureOf(opened.page)
      const bar14 = planOf(at14, 1)
      const day14 = (bar14.right - bar14.left) / 3
      expect(bar14.left, 'the span start sits on the Row Area left edge both times').toBeCloseTo(bar28.left, 1)
      expect(14 * day14, 'one Row Area width, divided by 14 or by 28 days').toBeCloseTo(28 * day28, 0)
    } finally {
      await opened.close()
    }
  })

  test(`IX-15 (MUST NOT): ${IX_15_NO_FIT.slice(-40)} -- more rows grow the height, never shrink the rows, days or type`, async () => {
    const few = await stageWith(20, SPAN_28)
    let fewPicture = ''
    try {
      fewPicture = await pictureOf(few.page)
    } finally {
      await few.close()
    }
    const many = await stageWith(80, SPAN_28)
    try {
      const manyPicture = await pictureOf(many.page)
      expect(heightOf(manyPicture), 'premise: the 80-row picture is taller').toBeGreaterThan(heightOf(fewPicture))
      const pitch = (svg: string): number => (textYOf(svg, 'Row 02') ?? NaN) - (textYOf(svg, 'Row 01') ?? NaN)
      expect(pitch(manyPicture), 'the row height').toBeCloseTo(pitch(fewPicture), 2)
      const width = (svg: string): number => planOf(svg, 1).right - planOf(svg, 1).left
      expect(width(manyPicture), 'the day width').toBeCloseTo(width(fewPicture), 2)
      expect(fontSizeOf(manyPicture, 'Row 01'), 'the row title type').toBe(fontSizeOf(fewPicture, 'Row 01'))
      expect(fontSizeOf(manyPicture, 'Task 01'), 'the name label type').toBe(fontSizeOf(fewPicture, 'Task 01'))
    } finally {
      await many.close()
    }
    const rowsPastTheCap = Math.ceil(S_217 / 10)
    const tall = await stageWith(rowsPastTheCap, SPAN_28)
    try {
      const answer = await exportSvgOf(tall.page)
      expect(answer.ok, `IX-5: ${rowsPastTheCap} rows do not fit under S-217 (${S_217}px), and are refused rather than squeezed`).toBe(false)
    } finally {
      await tall.close()
    }
  })

  test(`IX-16 (MUST): ${IX_16.slice(-30)} -- the span picture draws what EP-1 / EP-3 / EP-5 draw and leaves EP-11 out`, async () => {
    const opened = await stageWith(12, SPAN_28)
    try {
      const paletteWords = await opened.page.evaluate((selector: string) => {
        const found = document.querySelector(selector)
        return [...(found?.querySelectorAll('button') ?? [])].map((one) => (one.getAttribute('aria-label') ?? '').trim()).filter((one) => one.length > 6)
      }, PALETTE_COMMANDS)
      expect(paletteWords.length, 'premise: the Command Palette is open on the screen').toBeGreaterThan(0)
      const svg = await pictureOf(opened.page)
      expect(textYOf(svg, 'Span plan'), 'EP-1: the Document Title').not.toBeNull()
      expect(textYOf(svg, 'Row 12'), 'EP-3: the Row Title Panel').not.toBeNull()
      expect(svg, 'EP-5: the task bars').toContain('data-figure="task-12-plan"')
      const texts = [...svg.matchAll(/<text\b[^>]*>([^<]*)<\/text>/g)].map((one) => one[1] ?? '')
      expect(texts.filter((one) => paletteWords.includes(one)), 'EP-11: no palette command').toEqual([])
    } finally {
      await opened.close()
    }
  })
})

test.describe('FR-096 the Export Chooser on the shipped build', () => {
  test.setTimeout(180_000)

  /** @purity semi-pure-b */
  async function chooserOf(page: Page): Promise<{ line: string | null; buttons: { x: number; y: number; w: number; h: number }[]; em: number }> {
    return page.evaluate((selector: string) => {
      const found = document.querySelector(selector)
      if (found === null) return { line: null, buttons: [], em: NaN }
      const buttons = [...found.querySelectorAll('[data-format]')].map((one) => {
        const box = one.getBoundingClientRect()
        return { x: box.x, y: box.y, w: box.width, h: box.height }
      })
      const grid = found.querySelector('[data-format]')?.parentElement
      const em = grid === null || grid === undefined ? NaN : parseFloat(getComputedStyle(grid).fontSize)
      const lines = [...found.querySelectorAll('div')].filter((one) => one.children.length === 0).map((one) => one.textContent ?? '')
      return { line: lines.find((one) => /\d+\/\d+/.test(one)) ?? null, buttons, em }
    }, EXPORT_CHOOSER)
  }

  test(`FR-096 (MUST): ${FR_096_SPAN.slice(-40)} -- the span line reads 3/2 - 3/29 and is gone with the span`, async () => {
    const opened = await stageWith(4, SPAN_28)
    try {
      expect(await pressEntrance(opened.page, OPEN_EXPORT_CHOOSER), 'IC-2 opens the Export Chooser').toBe(true)
      const shown = await chooserOf(opened.page)
      const said = [SPAN_WORDS.ja, SPAN_WORDS.en].map((words) => words.replace('{start}', '3/2').replace('{finish}', '3/29'))
      expect(said, 'ND-4 without a year: the tasks all sit in 2026 (ND-5)').toContain(shown.line)
      await opened.page.keyboard.press('Escape')
      await settle(opened.page)
      await applyCommandsOf(opened.page, [{ kind: 'clearExportSpan' }])
      await settle(opened.page)
      expect(await pressEntrance(opened.page, OPEN_EXPORT_CHOOSER)).toBe(true)
      expect((await chooserOf(opened.page)).line, 'no span, no line').toBeNull()
    } finally {
      await opened.close()
    }
  })

  for (const width of [1920, 640]) {
    test(`FR-096 (MUST): ${FR_096_GAP.slice(-30)} -- at a ${width}px window the formats stand one a row, one size, S-517 apart`, async () => {
      const opened = await stageWith(4, {})
      try {
        await opened.page.setViewportSize({ width, height: 720 })
        await settle(opened.page)
        expect(await pressEntrance(opened.page, OPEN_EXPORT_CHOOSER)).toBe(true)
        const shown = await chooserOf(opened.page)
        expect(shown.buttons.length, 'premise: the chooser holds its formats').toBeGreaterThan(2)
        const first = shown.buttons[0] as { x: number; y: number; w: number; h: number }
        for (const [index, one] of shown.buttons.entries()) {
          expect(one.x, `format ${index} stands in the first one's column`).toBeCloseTo(first.x, 1)
          expect(one.w, `format ${index} has the first one's width`).toBeCloseTo(first.w, 1)
          expect(one.h, `format ${index} has the first one's height`).toBeCloseTo(first.h, 1)
          expect(one.x + one.w, `format ${index} stands inside the ${width}px window`).toBeLessThanOrEqual(width)
          const next = shown.buttons[index + 1]
          if (next !== undefined) expect(next.y - (one.y + one.h), `the gap below format ${index}`).toBeCloseTo(S_517_EM * shown.em, 1)
        }
      } finally {
        await opened.close()
      }
    })
  }
})

test.describe(`EP-3 (MUST NOT): ${EP_3_NO_DOM.slice(-40)}`, () => {
  test.setTimeout(120_000)

  test('every exported row name stands its own type size below the top of its row title box', async () => {
    const opened = await stageWith(12, {})
    try {
      const tops = await opened.page.evaluate(() =>
        [...document.querySelectorAll('[data-depth]')].map((one) => ({ text: (one.textContent ?? '').trim(), top: one.getBoundingClientRect().top })),
      )
      const svg = await pictureOf(opened.page)
      expect(/<g transform="scale\(1\)">/.test(svg), 'premise: at the 1920 px screen the picture ratio is 1').toBe(true)
      let checked = 0
      for (const one of tops) {
        const label = /Row \d\d/.exec(one.text)?.[0]
        if (label === undefined) continue
        const y = textYOf(svg, label)
        if (y === null) continue
        expect(y, `${label}: baseline = box top + its type size`).toBeCloseTo(one.top + fontSizeOf(svg, label), 1)
        checked += 1
      }
      expect(checked, 'premise: the rows were compared').toBeGreaterThan(5)
    } finally {
      await opened.close()
    }
  })
})

test.describe(`FR-077 (MUST NOT): ${FR_077_NO_FLOOR.slice(-30)}`, () => {
  test.setTimeout(120_000)

  test('at a 3840 px window the picture halves the screen type, with no floor put back', async () => {
    const opened = await stageWith(6, {})
    try {
      await opened.page.setViewportSize({ width: 3840, height: 1080 })
      await settle(opened.page)
      const screenSize = await opened.page.evaluate(() =>
        Number(document.querySelector('[data-role="Schedule Canvas"] svg [data-figure="task-1-label"]')?.getAttribute('font-size') ?? NaN),
      )
      const svg = await pictureOf(opened.page)
      const ratio = Number(/<g transform="scale\(([\d.]+)\)">/.exec(svg)?.[1] ?? NaN)
      expect(ratio, 'FR-080: S-81 width over the screen width').toBeCloseTo(1920 / 3840, 3)
      const inner = Number(/<text\b[^>]*\sfont-size="([\d.]+)"[^>]*data-figure="task-1-label"/.exec(svg)?.[1] ?? NaN)
      expect(inner * ratio, 'the drawn size is the screen size times the ratio').toBeCloseTo(screenSize * ratio, 2)
      expect(inner * ratio, 'smaller than the screen allows itself').toBeLessThan(screenSize)
    } finally {
      await opened.close()
    }
  })
})

test.describe(`WB-10 (MUST): ${WB_10_MOVE.slice(-40)}`, () => {
  test.setTimeout(120_000)

  /** @purity semi-pure-b */
  async function boxOf(page: Page, selector: string): Promise<{ x: number; y: number; w: number; h: number } | null> {
    return page.evaluate((wanted: string) => {
      const r = document.querySelector(wanted)?.getBoundingClientRect()
      return r === undefined ? null : { x: r.x, y: r.y, w: r.width, h: r.height }
    }, selector)
  }

  test('the Export Chooser follows its title band, stays where released, and opens in the centre again', async () => {
    const opened = await stageWith(4, {})
    try {
      expect(await pressEntrance(opened.page, OPEN_EXPORT_CHOOSER)).toBe(true)
      const band = await boxOf(opened.page, `${EXPORT_CHOOSER} [data-window-grab="true"]`)
      const start = await boxOf(opened.page, EXPORT_CHOOSER)
      if (band === null || start === null) throw new Error('the Export Chooser and its title band are on the screen')
      const grip = { x: band.x + 20, y: band.y + band.h / 2 }
      await opened.page.mouse.move(grip.x, grip.y)
      await opened.page.mouse.down()
      await opened.page.mouse.move(grip.x + 150, grip.y + 80, { steps: 10 })
      await opened.page.waitForTimeout(300)
      const held = await boxOf(opened.page, EXPORT_CHOOSER)
      expect([(held?.x ?? NaN) - start.x, (held?.y ?? NaN) - start.y], 'WB-8: it follows the pointer while held').toEqual([
        expect.closeTo(150, 0),
        expect.closeTo(80, 0),
      ])
      await opened.page.mouse.up()
      await settle(opened.page)
      const released = await boxOf(opened.page, EXPORT_CHOOSER)
      expect([released?.x, released?.y], 'WB-8: the place is settled on release').toEqual([expect.closeTo(held?.x ?? NaN, 0), expect.closeTo(held?.y ?? NaN, 0)])
      // WHY: IN-4 spends Esc on the open surface before the drag, so an Esc here closes the chooser and its place is thrown away.
      await opened.page.keyboard.press('Escape')
      await settle(opened.page)
      expect(await pressEntrance(opened.page, OPEN_EXPORT_CHOOSER)).toBe(true)
      const reopened = await boxOf(opened.page, EXPORT_CHOOSER)
      expect([reopened?.x, reopened?.y], 'WB-10: the place is thrown away on close').toEqual([expect.closeTo(start.x, 0), expect.closeTo(start.y, 0)])
    } finally {
      await opened.close()
    }
  })
})
