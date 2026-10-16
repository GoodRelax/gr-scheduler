// CR-754 on the shipped build: a Task panel draws the actual length entry (PR-5) as wide as the date entries beside it, time shown and hidden, ja and en (DFC-2870).

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

import { chromium, expect, test, type Browser, type Page } from '@playwright/test'
import { bare, specTable, unbroken } from '../contract/spec-table'
import { CLEARING_UP_MS, readSettledDrawnSvg, screenOf, taskBodyPoint } from './live-app'
import { rowOf } from './sws-case'

const SPEC = join(process.cwd(), 'docs', 'spec')
const REQUIREMENTS = unbroken(readFileSync(join(SPEC, '01-04-requirements.md'), 'utf8'))

// see FR-006
const FR_006_ACTUAL_LENGTH =
  '⭐ 実績の長さの欄（表 T-016 の `PR-5`）の入力は、日付の欄の入力と同じ幅とし、その右に単位の語を置くこと（MUST）'

const SHIPPED_BUILD = join(process.cwd(), 'dist', 'index.html')
const SCREEN = screenOf(rowOf(specTable('T-025'), 'MC-6'))

// see T-025
const REFERENCE_CHANNEL = 'msedge'

// see U-25
const PROPERTIES_PANEL = `[data-role="${bare(specTable('T-103').rows.find((one) => one.id === 'U-25')?.by['確定名（英）'] ?? '')}"]`

const DOCUMENT_SETTINGS = 'IC-17'
const SHOW_TIME_OF_DAY = 'K-146'

// see T-016
const ACTUAL_LENGTH_ROW = 'PR-5'
const DATE_ROWS = ['PR-4', 'PR-6']

const LOCALES = [
  { language: 'ja', locale: 'ja-JP' },
  { language: 'en', locale: 'en-US' },
] as const

const LOOKS = [
  { name: 'the time of day shown', isTimeShown: true, dateType: 'datetime-local' },
  { name: 'the time of day hidden', isTimeShown: false, dateType: 'date' },
] as const

const SETTLE_MS = 700

// WHY: the drawn widths are whole px but the host rounds a scaled font, so a sub-pixel gap is not a miss.
const ONE_PX = 1

let browser: Browser | null = null

// WHY: Playwright hides scrollbars by default; the panel width was measured with the vertical scrollbar drawn, so it is drawn here too.
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

// WHY: the time of day is a document setting (K-146); the Task panel is then opened from a Task body as a person does.
/** @purity non-pure */
async function openTaskPanel(locale: string, isTimeShown: boolean): Promise<{ readonly page: Page; close(): Promise<void> }> {
  if (browser === null) throw new Error('the reference browser was not opened')
  const context = await browser.newContext({ viewport: SCREEN, locale })
  const page = await context.newPage()
  await page.goto(pathToFileURL(SHIPPED_BUILD).href)
  await readSettledDrawnSvg(page)
  await pressIcon(page, DOCUMENT_SETTINGS)
  await page.waitForSelector(`${PROPERTIES_PANEL}[data-showing="documentSettings"]`)
  const checkbox = page.locator(`${PROPERTIES_PANEL} input[type="checkbox"][data-field-row="${SHOW_TIME_OF_DAY}"]`)
  if ((await checkbox.isChecked()) !== isTimeShown) {
    await checkbox.click()
    await page.waitForTimeout(SETTLE_MS)
    await readSettledDrawnSvg(page)
  }
  expect(await checkbox.isChecked(), `premise: ${SHOW_TIME_OF_DAY} is ${isTimeShown ? 'on' : 'off'}`).toBe(isTimeShown)
  const at = await taskBodyPoint(page)
  expect(at, 'premise: a Task body can be double-clicked').not.toBeNull()
  if (at !== null) await page.mouse.dblclick(at.x, at.y)
  await page.waitForSelector(`${PROPERTIES_PANEL}[data-showing="selection"]`)
  await page.waitForTimeout(SETTLE_MS)
  return { page, close: () => context.close() }
}

interface EntryBox {
  readonly row: string
  readonly tag: string
  readonly type: string
  readonly width: number
}

// WHY: the rendered box is read, not the style written: DFC-2870 drew PR-5 at 308 px against 122 px dates under a model that said the two were equal.
/** @purity semi-pure-b */
async function readBoxes(page: Page, rows: readonly string[]): Promise<readonly EntryBox[]> {
  return page.evaluate(
    ({ panel, wanted }: { panel: string; wanted: readonly string[] }) => {
      const root = document.querySelector(panel) as HTMLElement
      return Array.from(root.querySelectorAll('input[data-field-row], textarea[data-field-row], select[data-field-row]'))
        .filter((one) => wanted.includes(one.getAttribute('data-field-row') ?? ''))
        .map((one) => ({
          row: one.getAttribute('data-field-row') ?? '',
          tag: one.tagName.toLowerCase(),
          type: (one as HTMLInputElement).type ?? '',
          width: one.getBoundingClientRect().width,
        }))
    },
    { panel: PROPERTIES_PANEL, wanted: rows },
  )
}

test('CR-754 the manuscript this file is driven by still reads this way', () => {
  expect(REQUIREMENTS, FR_006_ACTUAL_LENGTH).toContain(FR_006_ACTUAL_LENGTH)
})

for (const { language, locale } of LOCALES) {
  test.describe(`${language}: a Task panel at its default width`, () => {
    for (const look of LOOKS) {
      test(`FR-006: with ${look.name}, PR-5 is as wide as the date entries (PR-4, PR-6) within ${ONE_PX} px -- ${FR_006_ACTUAL_LENGTH}`, async () => {
        test.setTimeout(180_000)
        const opened = await openTaskPanel(locale, look.isTimeShown)
        try {
          const page = opened.page
          expect(await page.evaluate(() => document.documentElement.lang), 'premise: the screen speaks the locale language').toBe(language)
          const boxes = await readBoxes(page, [ACTUAL_LENGTH_ROW, ...DATE_ROWS])
          const dates = boxes.filter((one) => DATE_ROWS.includes(one.row))
          const lengths = boxes.filter((one) => one.row === ACTUAL_LENGTH_ROW)
          expect(dates.map((one) => one.row).sort(), 'premise: PR-4 and PR-6 each draw one entry').toEqual([...DATE_ROWS].sort())
          for (const one of dates) expect(one.type, `premise: ${one.row} is a ${look.dateType} entry`).toBe(look.dateType)
          expect(lengths, 'premise: PR-5 draws one entry').toHaveLength(1)
          const length = lengths[0] as EntryBox
          expect(length.tag, 'PR-5 is a one-line entry, not a wrapping textarea').toBe('input')
          for (const one of dates) {
            expect(Math.abs(length.width - one.width), `PR-5 ${length.width}px against ${one.row} ${one.width}px`).toBeLessThanOrEqual(ONE_PX)
          }
        } finally {
          await opened.close()
        }
      })
    }
  })
}
