// W3 tester 3: the head row of the Task Group Panel, live -- its right margin is S-313 and Tab walks it left to right.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { expect, test, type Browser, type Page } from '@playwright/test'
import { bare, bareAll, specTable, unbroken } from '../contract/spec-table'
import { CLEARING_UP_MS, launchReferenceBrowser, readSettledDrawnSvg, screenOf } from './live-app'
import { rowOf } from './sws-case'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8').replace(/\r\n/g, '\n'))

const CLAUSE_RIGHT_MARGIN =
  '⭐ 並びのいちばん右の操作子（すべて消す）の外形と、タスクグループパネルの右端とのあいだを、タスクグループの並び（`HF-4`）と同じく `_assets/tbl-settings.md` の 表 T-206 の `S-313` とすること（MUST）'
const CLAUSE_TAB_ORDER = '⭐ 焦点が `Tab` で進む順も、この並びの左から右とすること（MUST）'

// see T-109
const TASK_GROUP_PANEL = bare(specTable('T-103').rows.find((one) => one.id === 'U-22')?.by['確定名（英）'] ?? '')
const headEntryOf = (rule: string): string => {
  const found = specTable('T-109').rows.filter(
    (one) => bareAll(one.by['面'] ?? '').includes(TASK_GROUP_PANEL) && one.cells.some((cell) => cell.includes(`\`${rule}\``)),
  )
  if (found.length !== 1) throw new Error(`table T-109 gives ${rule} ${found.length} head entrances`)
  return found[0]?.id ?? ''
}
const DELETE_EVERY_TASK_GROUP = headEntryOf('HF-20')
const HEAD_ROW = [headEntryOf('HF-12'), headEntryOf('HF-16'), headEntryOf('HF-10'), headEntryOf('HF-17'), DELETE_EVERY_TASK_GROUP]

// see S-313
const S_313 = Number(/(\d+(?:\.\d+)?)\s*px/.exec(specTable('T-206').rows.find((one) => one.id === 'S-313')?.by['既定'] ?? '')?.[1])

// see MC-6
const SCREEN = screenOf(rowOf(specTable('T-025'), 'MC-6'))
const NEAR_PX = 0.5

let browser: Browser | null = null

test.beforeAll(async () => {
  browser = await launchReferenceBrowser()
})

test.afterAll(async () => {
  test.setTimeout(CLEARING_UP_MS)
  await browser?.close()
})

interface HeadBox {
  readonly icon: string
  readonly left: number
  readonly right: number
}

/** @purity semi-pure-b */
async function measure(page: Page, icons: readonly string[]): Promise<{ heads: HeadBox[]; panelRight: number }> {
  return page.evaluate((wanted: readonly string[]) => {
    const heads = wanted.flatMap((icon) => {
      const found = document.querySelector(`[data-icon="${icon}"]`)
      if (found === null) return []
      const box = found.getBoundingClientRect()
      return box.width > 0 ? [{ icon, left: box.left, right: box.right }] : []
    })
    const rows = Array.from(document.querySelectorAll('[data-role="Task Group Title Tree"] [data-group-id]'))
      .map((row) => row.getBoundingClientRect())
      .filter((box) => box.width > 0 && box.height > 0)
    return { heads, panelRight: Math.max(...rows.map((box) => box.right)) }
  }, icons)
}

/** @purity non-pure */
async function openTheApp(baseURL: string | undefined): Promise<{ page: Page; close(): Promise<void> }> {
  if (baseURL === undefined) throw new Error('playwright.config.ts declares no baseURL for the running application')
  if (browser === null) throw new Error('the reference browser was not opened')
  const context = await browser.newContext({ baseURL, viewport: SCREEN })
  const page = await context.newPage()
  await page.goto('/')
  await readSettledDrawnSvg(page)
  return {
    page,
    /** @purity non-pure */
    async close(): Promise<void> {
      await context.close()
    },
  }
}

test('the manuscript still says what these cases read', () => {
  expect(REQUIREMENTS).toContain(CLAUSE_RIGHT_MARGIN)
  expect(REQUIREMENTS).toContain(CLAUSE_TAB_ORDER)
  expect(HEAD_ROW).toHaveLength(5)
  expect(Number.isFinite(S_313)).toBe(true)
})

test(`HF-10 "${CLAUSE_RIGHT_MARGIN}"`, async ({ baseURL }) => {
  test.setTimeout(180_000)
  const opened = await openTheApp(baseURL)
  try {
    const measured = await measure(opened.page, HEAD_ROW)
    const rightmost = measured.heads.find((one) => one.icon === DELETE_EVERY_TASK_GROUP)
    expect(rightmost, `premise: ${DELETE_EVERY_TASK_GROUP} is drawn at the head`).toBeDefined()
    expect(Number.isFinite(measured.panelRight), 'premise: rows are drawn in the panel').toBe(true)
    expect(Math.abs(measured.panelRight - (rightmost?.right ?? Number.NaN) - S_313)).toBeLessThan(NEAR_PX)
  } finally {
    await opened.close()
  }
})

test(`HF-10 "${CLAUSE_TAB_ORDER}"`, async ({ baseURL }) => {
  test.setTimeout(180_000)
  const opened = await openTheApp(baseURL)
  try {
    const { page } = opened
    const measured = await measure(page, HEAD_ROW)
    const leftToRight = [...measured.heads].sort((a, b) => a.left - b.left).map((one) => one.icon)
    expect(leftToRight, 'premise: the head row is drawn').toHaveLength(HEAD_ROW.length)
    const focusable = await page.evaluate(
      (icons: readonly string[]) =>
        icons.filter((icon) => {
          const found = document.querySelector<HTMLElement>(`[data-icon="${icon}"]`)
          if (found === null) return false
          found.focus()
          return document.activeElement === found
        }),
      leftToRight,
    )
    expect(focusable.length, 'premise: at least two head entrances take the focus').toBeGreaterThanOrEqual(2)
    await page.evaluate((icon: string) => document.querySelector<HTMLElement>(`[data-icon="${icon}"]`)?.focus(), focusable[0] ?? '')
    const visited = [focusable[0]]
    for (let step = 1; step < focusable.length; step += 1) {
      await page.keyboard.press('Tab')
      visited.push(await page.evaluate(() => document.activeElement?.getAttribute('data-icon') ?? null) ?? '(left the head row)')
    }
    expect(visited).toEqual(focusable)
  } finally {
    await opened.close()
  }
})
