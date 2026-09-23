// CR-551 item 8 (IN-7 of table T-028): every icon tooltip stays on one line and inside the window, swept live.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { expect, test, type Browser, type Page } from '@playwright/test'
import { bare, specTable, unbroken } from '../contract/spec-table'
import { CLEARING_UP_MS, launchReferenceBrowser, readSettledDrawnSvg, screenOf } from './live-app'
import { rowOf } from './sws-case'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

const IN_7_ONE_LINE = 'ツールチップは、説明の各行を折り返さずに 1 行で出すこと（MUST）。'
const IN_7_ONLY_WIDER = '行が上限より広いときだけ、その行を折り返すこと（MUST）'
const IN_7_CAP =
  '説明の幅は中身の幅とし、その上限を閲覧環境の窓の幅から両側に `_assets/tbl-settings.md` の 表 T-206 の `S-339` を引いた幅とすること（MUST）。'

const numberOf = (cell: string): number => {
  const found = /-?\d+(?:\.\d+)?/.exec(bare(cell).replace(/`/g, ''))
  const value = Number(found?.[0] ?? '')
  if (!Number.isFinite(value)) throw new Error(`no number in ${JSON.stringify(cell)}`)
  return value
}

// see S-124, T-212
const S_124_MS = numberOf(specTable('T-212').rows.find((row) => row.id === 'S-124')?.by['値'] ?? '')
// see S-339, T-206
const S_339_PX = numberOf(specTable('T-206').rows.find((row) => row.id === 'S-339')?.by['既定'] ?? '')

// see FR-038, EZ-2
const WORDS = JSON.parse(readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'display-words.json'), 'utf8')) as {
  icons: { rowId: string; hint?: { ja: string; en: string } }[]
}
const HINTED: readonly string[] = WORDS.icons.filter((one) => one.hint !== undefined).map((one) => one.rowId)

// WHY: 800 x 600 -- a narrow window, where the App Header runs out of room, long descriptions meet the cap and
// the entrances on the right (the help entrance IC-22 among them) must turn their descriptions back.
const NARROW = { width: 800, height: 600 }
// WHY: 1280 x 800 -- a common laptop window between the two ends.
const MEDIUM = { width: 1280, height: 800 }
// WHY: the reference screen of table T-025 (MC-6), where nothing is cramped.
const WIDE = screenOf(rowOf(specTable('T-025'), 'MC-6'))

const WIDTHS: readonly { readonly name: string; readonly size: { width: number; height: number } }[] = [
  { name: 'narrow', size: NARROW },
  { name: 'medium', size: MEDIUM },
  { name: 'wide', size: WIDE },
]

// see U-53
const TOOLTIP_LAYER = `[data-role="${bare(specTable('T-103').rows.find((row) => row.id === 'U-53')?.cells[0] ?? '')}"]`

// WHY: the hover has to outlast S-124 and the frame that follows it; this is the allowance past it.
const SHOW_ALLOWANCE_MS = 1_500

interface Measured {
  readonly icon: string
  readonly box: { left: number; right: number; top: number; bottom: number }
  readonly lines: readonly { readonly text: string; readonly lineBoxes: number; readonly naturalWidth: number }[]
}

let browser: Browser | null = null

test.beforeAll(async () => {
  browser = await launchReferenceBrowser()
})

test.afterAll(async () => {
  test.setTimeout(CLEARING_UP_MS)
  await browser?.close()
})

/** @purity semi-pure-b */
async function visibleHintedIcons(page: Page): Promise<string[]> {
  return page.evaluate((hinted: readonly string[]) => {
    const found: string[] = []
    for (const icon of hinted) {
      const entry = document.querySelector(`[data-icon="${icon}"]`)
      if (entry === null) continue
      const box = entry.getBoundingClientRect()
      if (box.width < 1 || box.height < 1) continue
      const x = box.left + box.width / 2
      const y = box.top + box.height / 2
      if (x < 0 || y < 0 || x >= window.innerWidth || y >= window.innerHeight) continue
      const top = document.elementFromPoint(x, y)
      if (top === null || (top !== entry && !entry.contains(top))) continue
      found.push(icon)
    }
    return found
  }, HINTED)
}

/** @purity semi-pure-b */
async function readTooltip(page: Page, icon: string): Promise<Measured | null> {
  return page.evaluate(
    ({ layerSelector, icon }: { layerSelector: string; icon: string }) => {
      const layer = document.querySelector(layerSelector)
      if (layer === null) return null
      const boxes = Array.from(layer.children).filter((one) => (one.textContent ?? '').trim() !== '')
      const tip = boxes[boxes.length - 1]
      if (tip === undefined) return null
      const rect = tip.getBoundingClientRect()
      const canvas = document.createElement('canvas').getContext('2d')
      const lines: { text: string; lineBoxes: number; naturalWidth: number }[] = []
      const walker = document.createTreeWalker(tip, NodeFilter.SHOW_TEXT)
      for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
        const whole = node.textContent ?? ''
        let at = 0
        for (const segment of whole.split('\n')) {
          const start = at
          at += segment.length + 1
          if (segment.trim() === '') continue
          const range = document.createRange()
          range.setStart(node, start)
          range.setEnd(node, start + segment.length)
          const tops = new Set(
            Array.from(range.getClientRects())
              .filter((one) => one.width > 0.5)
              .map((one) => Math.round(one.top)),
          )
          const parent = node.parentElement ?? tip
          if (canvas !== null) canvas.font = getComputedStyle(parent).font
          lines.push({ text: segment, lineBoxes: tops.size, naturalWidth: canvas?.measureText(segment).width ?? 0 })
        }
      }
      return { icon, box: { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom }, lines }
    },
    { layerSelector: TOOLTIP_LAYER, icon },
  )
}

/** @purity non-pure */
async function hoverAndRead(page: Page, icon: string): Promise<Measured | null> {
  // WHY: leave to a spot that carries no icon first, so the previous description is gone.
  await page.mouse.move(2, (await page.evaluate(() => window.innerHeight)) - 2)
  await page.waitForTimeout(200)
  const at = await page.evaluate((wanted: string) => {
    const entry = document.querySelector(`[data-icon="${wanted}"]`)
    if (entry === null) return null
    const box = entry.getBoundingClientRect()
    return { x: box.left + box.width / 2, y: box.top + box.height / 2 }
  }, icon)
  if (at === null) return null
  await page.mouse.move(at.x, at.y)
  await page.waitForTimeout(S_124_MS)
  const deadline = Date.now() + SHOW_ALLOWANCE_MS
  while (Date.now() < deadline) {
    const read = await readTooltip(page, icon)
    if (read !== null) return read
    await page.waitForTimeout(100)
  }
  return null
}

test('IN-7 still says: 折り返さずに 1 行 / 上限より広いときだけ折り返す / 窓の幅から両側に S-339 を引いた幅', () => {
  expect(REQUIREMENTS).toContain(IN_7_ONE_LINE)
  expect(REQUIREMENTS).toContain(IN_7_ONLY_WIDER)
  expect(REQUIREMENTS).toContain(IN_7_CAP)
  expect(HINTED.length, 'the manuscript gives descriptions to icons').toBeGreaterThan(0)
  expect(S_124_MS).toBeGreaterThan(0)
  expect(S_339_PX).toBeGreaterThan(0)
})

for (const width of WIDTHS) {
  test(`IN-7 (${width.name}, ${width.size.width} x ${width.size.height}): every icon tooltip is one line a line and stays S-339 inside the window`, async ({
    baseURL,
  }) => {
    // see IN-7, S-339, S-124, EZ-2
    test.setTimeout(600_000)
    if (baseURL === undefined) throw new Error('playwright.config.ts declares no baseURL for the running application')
    if (browser === null) throw new Error('the reference browser was not opened')
    const context = await browser.newContext({ baseURL, viewport: width.size })
    const page = await context.newPage()
    try {
      await page.goto('/')
      await readSettledDrawnSvg(page)
      const icons = await visibleHintedIcons(page)
      test.info().annotations.push({
        type: 'swept',
        description: `${icons.length} of ${HINTED.length} hinted icons are on the screen at start: ${icons.join(' ')}`,
      })
      expect(icons.length, 'premise: some hinted icons are on the screen').toBeGreaterThan(0)
      const innerWidth = await page.evaluate(() => window.innerWidth)
      const innerHeight = await page.evaluate(() => window.innerHeight)
      const cap = innerWidth - 2 * S_339_PX
      const problems: string[] = []
      const silent: string[] = []
      for (const icon of icons) {
        const read = await hoverAndRead(page, icon)
        if (read === null) {
          silent.push(icon)
          continue
        }
        for (const line of read.lines) {
          // see IN-7
          if (line.lineBoxes > 1 && line.naturalWidth <= cap) {
            problems.push(`${icon}: "${line.text}" is ${line.lineBoxes} line boxes though ${line.naturalWidth.toFixed(1)}px fits the cap ${cap}px`)
          }
        }
        // see IN-7, S-339
        if (read.box.left < S_339_PX - 0.5) problems.push(`${icon}: left ${read.box.left.toFixed(1)} < S-339 ${S_339_PX}`)
        if (read.box.right > innerWidth - S_339_PX + 0.5) {
          problems.push(`${icon}: right ${read.box.right.toFixed(1)} > window ${innerWidth} - S-339 ${S_339_PX}`)
        }
        // WHY: IN-7 keeps S-339 on the two sides; above and below, the box must at least be inside the window.
        if (read.box.top < -0.5 || read.box.bottom > innerHeight + 0.5) {
          problems.push(`${icon}: top ${read.box.top.toFixed(1)} / bottom ${read.box.bottom.toFixed(1)} leave the window height ${innerHeight}`)
        }
      }
      test.info().annotations.push({ type: 'no tooltip seen', description: silent.join(' ') || '(none)' })
      expect(silent, `EZ-2: hovering past S-124 (${S_124_MS} ms) showed no description`).toEqual([])
      expect(problems).toEqual([])
    } finally {
      await context.close()
    }
  })
}
