// CR-671 on the shipped build: FR-006 choosers of document names (PR-15, PR-16) fit the panel, cut with an ellipsis, keep the value.

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

import { expect, test, type Browser, type Page } from '@playwright/test'
import { bare, specTable, unbroken } from '../contract/spec-table'
import { CLEARING_UP_MS, DRAWN_SVG, launchReferenceBrowser, readSettledDrawnSvg, screenOf } from './live-app'
import { rowOf } from './sws-case'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

// WHY: each constant ends exactly at its marker, cut from the manuscript as check 39 reads it.
const FR_006_FITS =
  '⭐ 表 T-016 の `入力の型` が `選択` の操作子のうち、候補を文書の中の名から集めるもの（候補がスキーマの選択肢でないもの）にも、上の「要る幅より狭い幅を割ってはならない」を当てず、パネルの幅の中に収めること（MUST）'
const FR_006_NO_OVERFLOW = '。⛔ その操作子をパネルの右へはみ出させてはならない（MUST NOT）'
const FR_006_ELLIPSIS = '⭐ 欄の幅に入り切らない名は、欄の中で後ろを省き、省いたことを「…」で示すこと（MUST）'
const FR_006_VALUE_KEPT = '名を省かずに読むのは、開いた候補の一覧である。⛔ 省くのは見せ方であり、値を変えてはならない（MUST NOT）'
const FR_006_FLOOR = '⛔ 1 つの操作子に、その値を出すのに要る幅より狭い幅を割ってはならない（MUST NOT）'

const SHIPPED_BUILD = join(process.cwd(), 'dist', 'index.html')
const SCREEN = screenOf(rowOf(specTable('T-025'), 'MC-6'))

// see U-25, U-24
const roleOf = (id: string): string =>
  `[data-role="${bare(specTable('T-103').rows.find((one) => one.id === id)?.by['確定名（英）'] ?? '')}"]`
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

type Loose = Record<string, unknown>
const TEMPLATE = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
) as { readonly schedule: { readonly tasks: readonly Loose[]; readonly assignments: readonly Loose[]; readonly resources: readonly Loose[] } }

// WHY: the first Task of the startup document with both a WBS parent and an assignee.
const SUBJECT = ((): { uid: number; parentUid: number; parentName: string; assigneeName: string } => {
  const { tasks, assignments, resources } = TEMPLATE.schedule
  for (const task of tasks) {
    const parentUid = task['wbsParentUid']
    const assignment = assignments.find((one) => one['taskUid'] === task['uid'])
    if (typeof parentUid !== 'number' || assignment === undefined || task['milestone'] === true) continue
    const parent = tasks.find((one) => one['uid'] === parentUid)
    const person = resources.find((one) => one['uid'] === assignment['resourceUid'])
    return {
      uid: task['uid'] as number,
      parentUid,
      parentName: String(parent?.['name'] ?? ''),
      assigneeName: String(person?.['name'] ?? ''),
    }
  }
  throw new Error('premise: the startup document holds a Task with a parent and an assignee')
})()

const MILESTONE_UIDS = TEMPLATE.schedule.tasks.filter((one) => one['milestone'] === true).map((one) => one['uid'] as number)

const SETTLE_MS = 900
const SUBPIXEL = 0.5

// WHY: the panel's own box leaves out the one-pixel Panel Divider line that the stated width counts.
const PANEL_EDGE_PX = 1.5

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
async function openOn(page: Page, uids: readonly number[]): Promise<number> {
  const at = await page.evaluate(
    ({ svg, uids }: { svg: string; uids: readonly number[] }) => {
      const drawing = document.querySelector(svg)
      for (const uid of uids) {
        const plan = drawing?.querySelector(`[data-figure="task-${uid}-plan"]`)
        if (plan === null || plan === undefined) continue
        const box = plan.getBoundingClientRect()
        const x = box.left + box.width / 2
        const y = box.top + box.height / 2
        const under = document.elementFromPoint(x, y)?.closest('[data-figure]')?.getAttribute('data-figure') ?? ''
        if (box.width <= 0 || !under.startsWith(`task-${uid}-`)) continue
        return { uid, x, y }
      }
      return null
    },
    { svg: DRAWN_SVG, uids },
  )
  expect(at, `premise: one of the Tasks ${uids.slice(0, 5).join(', ')} is drawn where it can be double-clicked`).not.toBeNull()
  if (at === null) return -1
  await page.mouse.dblclick(at.x, at.y)
  await page.waitForSelector(`${PROPERTIES_PANEL} [data-field-row]`)
  await page.waitForTimeout(SETTLE_MS)
  return at.uid
}

// WHY: the divider nearest the panel's left edge is the one FR-052 lets the author drag; past the floor it stops at S-248.
/** @purity non-pure */
async function narrowToTheFloor(page: Page): Promise<void> {
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
  await page.mouse.move(SCREEN.width - 2, at.y, { steps: 16 })
  await page.mouse.up()
  await page.waitForTimeout(SETTLE_MS)
}

interface Chooser {
  readonly row: string
  readonly right: number
  readonly width: number
  readonly textOverflow: string
  readonly value: string
  readonly shownText: string
  readonly shownTextWidth: number
  readonly longestOptionWidth: number
  readonly contentWidth: number
}

interface Reading {
  readonly panelWidth: number
  readonly innerRight: number
  readonly choosers: readonly Chooser[]
}

/** @purity semi-pure-b */
async function readPanel(page: Page, rows: readonly string[]): Promise<Reading> {
  return page.evaluate(
    ({ panel, rows }: { panel: string; rows: readonly string[] }) => {
      const root = document.querySelector(panel) as HTMLElement | null
      if (root === null) throw new Error('the Properties Panel is not drawn')
      const frame = root.getBoundingClientRect()
      const innerRight = frame.right - (Number.parseFloat(getComputedStyle(root).borderRightWidth) || 0)
      const measure = document.createElement('canvas').getContext('2d')
      const textWidth = (text: string, of: Element): number => {
        if (measure === null) return Number.NaN
        measure.font = getComputedStyle(of).font
        return measure.measureText(text).width
      }
      const choosers: Chooser[] = []
      for (const row of rows) {
        // WHY: PR-15 is a link since CR-676 (WL-15); the Task it jumps to is its value.
        const found = root.querySelectorAll(`select[data-field-row="${row}"], input[data-field-combo][data-field-row="${row}"], [data-field-row="${row}"] select, [data-field-row="${row}"][data-field-kind="link"]`)
        for (const one of Array.from(found)) {
          const link = one.getAttribute('data-field-kind') === 'link' ? (one as HTMLElement) : null
          const element = one as HTMLSelectElement | HTMLInputElement
          const box = element.getBoundingClientRect()
          const style = getComputedStyle(element)
          const isSelect = element instanceof HTMLSelectElement
          const shown = link !== null ? (link.textContent ?? '') : isSelect ? (element.selectedOptions[0]?.textContent ?? '') : element.value
          const options = isSelect ? Array.from(element.options).map((option) => option.textContent ?? '') : [shown]
          const padding = (Number.parseFloat(style.paddingLeft) || 0) + (Number.parseFloat(style.paddingRight) || 0)
          choosers.push({
            row,
            right: box.right,
            width: box.width,
            textOverflow: style.textOverflow,
            value: link !== null ? (link.getAttribute('data-link-task-uid') ?? '') : element.value,
            shownText: shown,
            shownTextWidth: textWidth(shown, element),
            longestOptionWidth: Math.max(0, ...options.map((text) => textWidth(text, element))),
            contentWidth: element.clientWidth - padding,
          })
        }
      }
      return { panelWidth: frame.width, innerRight, choosers }
    },
    { panel: PROPERTIES_PANEL, rows },
  )
}

const DOCUMENT_NAME_ROWS = ['PR-15', 'PR-16'] as const

test('CR-671 the manuscript this file is driven by: FR-006 still reads this way', () => {
  for (const clause of [FR_006_FITS, FR_006_NO_OVERFLOW, FR_006_ELLIPSIS, FR_006_VALUE_KEPT, FR_006_FLOOR]) {
    expect(REQUIREMENTS, clause).toContain(clause)
  }
  // WHY: CR-676 made PR-15 a link (table T-351 WL-15 to WL-17); WL-15 cuts its name as FR-006's chooser does.
  for (const row of ['PR-16', 'PR-17']) {
    expect(bare(specTable('T-016').rows.find((one) => one.id === row)?.by['入力の型'] ?? ''), `${row} is a choice`).toBe('選択')
  }
  expect(bare(specTable('T-016').rows.find((one) => one.id === 'PR-15')?.by['入力の型'] ?? ''), 'PR-15 is a link').toBe('リンク')
})

const CASES = [
  { theme: 'light', locale: 'ja-JP' },
  { theme: 'dark', locale: 'ja-JP' },
  { theme: 'light', locale: 'en-US' },
  { theme: 'dark', locale: 'en-US' },
] as const

for (const { theme, locale } of CASES) {
  test(`FR-006 (MUST, MUST NOT), ${theme}, ${locale}: PR-15 and PR-16 stay inside the panel at S-171 and at S-248, cut with an ellipsis, value kept`, async () => {
    test.setTimeout(180_000)
    if (browser === null) throw new Error('the reference browser was not opened')
    const context = await browser.newContext({ viewport: SCREEN, colorScheme: theme, locale })
    try {
      const page = await context.newPage()
      await page.goto(pathToFileURL(SHIPPED_BUILD).href)
      await readSettledDrawnSvg(page)
      await openOn(page, [SUBJECT.uid])
      for (const where of ['S-171', 'S-248'] as const) {
        if (where === 'S-248') await narrowToTheFloor(page)
        const read = await readPanel(page, DOCUMENT_NAME_ROWS)
        expect(
          Math.abs(read.panelWidth - (where === 'S-171' ? S_171 : S_248)),
          `premise: the panel is ${where} wide (its divider line aside)`,
        ).toBeLessThanOrEqual(PANEL_EDGE_PX)
        for (const row of DOCUMENT_NAME_ROWS) {
          const found = read.choosers.filter((one) => one.row === row)
          expect(found.length, `premise (${where}): ${row} draws a chooser`).toBeGreaterThan(0)
        }
        for (const chooser of read.choosers) {
          const label = `${chooser.row} at ${where}`
          expect(chooser.right, `${label}: ${FR_006_NO_OVERFLOW}`).toBeLessThanOrEqual(read.innerRight + SUBPIXEL)
          expect(chooser.textOverflow, `${label}: ${FR_006_ELLIPSIS}`).toBe('ellipsis')
        }
        const parent = read.choosers.find((one) => one.row === 'PR-15')
        expect(parent?.value, `PR-15 at ${where}: ${FR_006_VALUE_KEPT}`).toBe(String(SUBJECT.parentUid))
        expect(parent?.shownText, 'PR-15: the link keeps the whole name').toBe(SUBJECT.parentName)
        const assignee = read.choosers.find((one) => one.row === 'PR-16')
        expect(assignee?.shownText, 'PR-16: the chosen option keeps the whole name').toBe(SUBJECT.assigneeName)
        if (where === 'S-248') {
          expect(
            (parent?.shownTextWidth ?? 0) > (parent?.contentWidth ?? 0),
            'premise: at the floor the parent name is wider than its field, so the cut is exercised',
          ).toBe(true)
        }
      }
    } finally {
      await context.close()
    }
  })
}

test(`FR-006 "${FR_006_FLOOR}" -- a schema chooser (PR-17) keeps the needed width at S-248`, async () => {
  test.setTimeout(180_000)
  if (browser === null) throw new Error('the reference browser was not opened')
  const context = await browser.newContext({ viewport: SCREEN })
  try {
    const page = await context.newPage()
    await page.goto(pathToFileURL(SHIPPED_BUILD).href)
    await readSettledDrawnSvg(page)
    await openOn(page, MILESTONE_UIDS)
    await narrowToTheFloor(page)
    const read = await readPanel(page, ['PR-17'])
    const glyph = read.choosers[0]
    expect(glyph, 'premise: a milestone draws the PR-17 chooser').toBeDefined()
    expect(glyph?.contentWidth ?? 0, 'PR-17 is not narrowed below its longest choice').toBeGreaterThanOrEqual(
      (glyph?.longestOptionWidth ?? Number.POSITIVE_INFINITY) - SUBPIXEL,
    )
  } finally {
    await context.close()
  }
})
