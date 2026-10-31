// CR-850 on the dev server: at the hour tier the status date field, the grabs, the cursors and the Dual Cursor interval read 15 minutes; the day tier reads whole days.

import { expect, test, type Browser, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { specTable, unbroken } from '../contract/spec-table'
import { validateDocument } from '../fixtures/grs-document'
import { BASE_SCREEN, openDocument, pressEntrance } from './cr-570-tree-state-stage'
import { CLEARING_UP_MS, launchReferenceBrowser, readSettledDrawnSvg } from './live-app'
import { rowOf } from './sws-case'
import { taskGroupsDocument } from './w3-t1-stage'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

const FR_046_FIELD = '⭐ 欄の形は `FR-158` の 表 T-375 の `TX-3` に従い、時刻を表示するときは日付と時刻の欄とし、打った分を丸めずに `statusDate` に書くこと（MUST）'
const T_378_READERS = '⭐ 本表の単位は、掴み代のほか、基準日線のドラッグ（`FR-046`）、デュアルカーソルの線（`FR-082` の 表 T-029a の `DC-3`）、ガイドカーソルの札（表 T-029 の `CU-3`）も読むこと（MUST）'
const CY_5_FIFTEEN = '⭐ 15 分で寄せるとき（`SG-2`）は、寄せた分だけずらすこと（MUST）'

const AGENT_API = rowOf(specTable('T-109'), 'IC-20').id
const PROPERTIES = '[data-role="Properties Panel"]'
const STATUS_LINE = '[data-figure="status-line"]'
const PLAN_OF_TASK_1 = '[data-figure="task-1-plan"]'
const HOUR_TICKS = '[data-figure^="ruler-hour-tick-"]'
// WHY: zoomX 100 is well over S-577 (hour tier) and S-578 (half-hour grid); every x below is read from the hour ticks.
const HOUR_TIER_ZOOM = 100
const STATUS_AT = '2026-03-04T12:00:00'
const PINNED_NOW = new Date('2026-03-04T09:00:00')
const DEFAULT_FINISH = 'T17:00:00'

let browser: Browser | null = null

test.beforeAll(async () => {
  browser = await launchReferenceBrowser()
})

test.afterAll(async () => {
  test.setTimeout(CLEARING_UP_MS)
  await browser?.close()
})

interface Opened {
  readonly page: Page
  close(): Promise<void>
}

/** @purity non-pure */
async function openAtHourTier(): Promise<Opened> {
  if (browser === null) throw new Error('no browser')
  const baseURL = test.info().project.use.baseURL
  if (baseURL === undefined) throw new Error('playwright.config.ts declares no baseURL for the running application')
  const context = await browser.newContext({ baseURL, viewport: BASE_SCREEN, colorScheme: 'light' })
  await context.addInitScript(() => {
    const held = { next: { name: '', text: '' }, written: [] as string[] }
    ;(window as unknown as Record<string, unknown>)['grsCr570'] = held
    ;(window as unknown as Record<string, unknown>)['showOpenFilePicker'] = async () => [
      {
        kind: 'file',
        name: held.next.name,
        getFile: async () => new File([held.next.text], held.next.name),
        queryPermission: async () => 'granted',
        requestPermission: async () => 'granted',
        isSameEntry: async () => false,
      },
    ]
  })
  const page = await context.newPage()
  await page.clock.setFixedTime(PINNED_NOW)
  await page.goto('/')
  await readSettledDrawnSvg(page)
  expect(await pressEntrance(page, AGENT_API), 'FR-065: the Agent API entrance is on the screen').toBe(true)
  const built = JSON.parse(
    taskGroupsDocument({ rows: 2, settings: { zoomX: HOUR_TIER_ZOOM, scrollDate: '2026-03-04T06:00:00', isTimeOfDayVisible: true } }),
  )
  built.schedule.project.statusDate = STATUS_AT
  expect(validateDocument(built).errors, 'the fixture is a document the schema accepts').toEqual([])
  await openDocument(page, 'cr-850-grabs.json', JSON.stringify(built))
  return { page, close: async () => context.close() }
}

const minuteOf = (text: string): number => Date.parse(`${text.slice(0, 16)}:00Z`) / 60000
const textOfMinute = (minute: number): string => new Date(minute * 60000).toISOString().slice(0, 19)

interface Axis {
  readonly xOf: (minute: number) => number
}

// WHY: the hour ticks carry their minute in the figure key, so x and time come from one drawing.
/** @purity semi-pure-b */
async function axisOf(page: Page): Promise<Axis> {
  const ticks = await page.evaluate((selector: string) =>
    [...document.querySelectorAll(selector)]
      .map((e) => ({ minute: Number((e.getAttribute('data-figure') ?? '').split('-tick-')[1]), x: e.getBoundingClientRect().x }))
      .sort((a, b) => a.minute - b.minute),
    HOUR_TICKS,
  )
  expect(ticks.length, 'premise: the ruler shows the hour tier').toBeGreaterThan(2)
  const first = ticks[0]!
  const last = ticks[ticks.length - 1]!
  expect(ticks[1]!.minute - first.minute, 'premise: one hour between ticks').toBe(60)
  const perMinute = (last.x - first.x) / (last.minute - first.minute)
  expect(perMinute * 15, 'premise: a quarter hour is wider than 3 px').toBeGreaterThan(3)
  return { xOf: (minute: number) => first.x + (minute - first.minute) * perMinute }
}

/** @purity semi-pure-b */
async function readSchedule(page: Page): Promise<any> {
  return page.evaluate(() => (window as unknown as { grSchedulerAgentApi: { readDocument(): any } }).grSchedulerAgentApi.readDocument().schedule)
}

/** @purity semi-pure-b */
async function boxOf(page: Page, selector: string): Promise<{ x: number; y: number; w: number; h: number }> {
  const box = await page.locator(selector).first().boundingBox()
  if (box === null) throw new Error(`${selector} has no box`)
  return { x: box.x, y: box.y, w: box.width, h: box.height }
}

/** @purity non-pure */
async function pull(page: Page, from: { x: number; y: number }, to: { x: number; y: number }, modifier: 'Alt' | 'Control' | null): Promise<void> {
  if (modifier !== null) await page.keyboard.down(modifier)
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  for (let i = 1; i <= 8; i += 1) await page.mouse.move(from.x + ((to.x - from.x) * i) / 8, from.y + ((to.y - from.y) * i) / 8)
  await page.mouse.up()
  if (modifier !== null) await page.keyboard.up(modifier)
  await readSettledDrawnSvg(page)
}

/** @purity non-pure */
async function arm(page: Page, icon: string): Promise<void> {
  if ((await page.getAttribute(`[data-icon="${icon}"]`, 'data-armed')) !== 'true') await pressEntrance(page, icon)
  await readSettledDrawnSvg(page)
}

// WHY: the point tip (CU-3 label, DC-3 readout) carries no role; its lines are the leaf divs that hold a dated text.
/** @purity semi-pure-b */
async function pointTipLines(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    [...document.querySelectorAll('div')]
      .filter((one) => one.children.length === 0 && /\d{4}\/\d{2}\/\d{2}|^\S+: /.test(one.textContent ?? ''))
      .map((one) => one.textContent ?? ''),
  )
}

const rowBY = async (page: Page): Promise<number> => {
  const plan = await boxOf(page, PLAN_OF_TASK_1)
  return plan.y + plan.h / 2 + plan.h * 3
}

test.describe('CR-850 the manuscript these cases are driven by', () => {
  for (const clause of [FR_046_FIELD, T_378_READERS, CY_5_FIFTEEN]) {
    test(`01-04 still says: ${clause.slice(-40)}`, () => {
      expect(REQUIREMENTS).toContain(clause)
    })
  }
})

test.describe('CR-850 at the hour tier, on the dev server', () => {
  test.setTimeout(180_000)

  test(`FR-046 FO-8: ${FR_046_FIELD.slice(0, 40)} -- 10:37 typed is kept, and the line stands at 10:37`, async () => {
    const opened = await openAtHourTier()
    try {
      const page = opened.page
      await pressEntrance(page, 'IC-17')
      const field = page.locator(`${PROPERTIES} input[data-field-row="IC-44"]`)
      expect(await field.getAttribute('type'), 'TX-3: a date-and-time entry while the time of day is shown').toBe('datetime-local')
      await field.fill('2026-03-04T10:37')
      await field.press('Enter')
      await readSettledDrawnSvg(page)
      const statusDate = String((await readSchedule(page)).project.statusDate)
      expect(statusDate.slice(0, 16), 'the typed minute is written as typed').toBe('2026-03-04T10:37')
      const axis = await axisOf(page)
      const line = await boxOf(page, STATUS_LINE)
      expect(Math.abs(line.x + line.w / 2 - axis.xOf(minuteOf(statusDate))), 'the line stands at 10:37').toBeLessThan(1.5)
    } finally {
      await opened.close()
    }
  })

  test('FR-103 GO-2: a grabbed plan finish released 10 minutes past 18:00 lands at 18:15; with Alt held too', async () => {
    const opened = await openAtHourTier()
    try {
      const page = opened.page
      for (const modifier of [null, 'Alt'] as const) {
        const axis = await axisOf(page)
        const plan = await boxOf(page, PLAN_OF_TASK_1)
        const finish = minuteOf(String((await readSchedule(page)).tasks[0].finish))
        // STEP: grab the plan finish 1 px inside its end and release about 1 h 10 min later (1 h 25 with the second pass).
        await pull(page, { x: plan.x + plan.w - 1, y: plan.y + plan.h / 2 }, { x: axis.xOf(finish + 72), y: plan.y + plan.h / 2 }, modifier)
        const moved = minuteOf(String((await readSchedule(page)).tasks[0].finish))
        expect(moved - finish, `released 72 minutes later (modifier ${String(modifier)})`).toBe(75)
      }
    } finally {
      await opened.close()
    }
  })

  test('TC-6: a bar drawn from about 09:10 to about 11:40 on 03-05 becomes 09:15 to 11:45', async () => {
    const opened = await openAtHourTier()
    try {
      const page = opened.page
      const axis = await axisOf(page)
      const y = await rowBY(page)
      const nine = minuteOf('2026-03-05T09:00')
      await arm(page, 'IC-23')
      await pull(page, { x: axis.xOf(nine + 10), y }, { x: axis.xOf(nine + 160), y }, null)
      await page.keyboard.press('Enter')
      await page.keyboard.press('Escape')
      await readSettledDrawnSvg(page)
      const tasks = (await readSchedule(page)).tasks
      const made = tasks[tasks.length - 1]
      expect(`${String(made.start).slice(0, 19)}..${String(made.finish).slice(0, 19)}`).toBe(`${textOfMinute(nine + 15)}..${textOfMinute(nine + 165)}`)
    } finally {
      await opened.close()
    }
  })

  test('TC-10: a milestone pressed at about 13:08 on 03-05 is placed at 13:15', async () => {
    const opened = await openAtHourTier()
    try {
      const page = opened.page
      const axis = await axisOf(page)
      const y = await rowBY(page)
      const pressed = minuteOf('2026-03-05T13:08')
      await arm(page, 'IC-27')
      await page.mouse.move(axis.xOf(pressed), y)
      await page.mouse.down()
      await page.mouse.up()
      await readSettledDrawnSvg(page)
      await page.keyboard.press('Enter')
      await page.keyboard.press('Escape')
      await readSettledDrawnSvg(page)
      const tasks = (await readSchedule(page)).tasks
      const made = tasks[tasks.length - 1]
      expect(made.milestone, 'the made task is a milestone').toBe(true)
      expect(String(made.start).slice(0, 19)).toBe(textOfMinute(minuteOf('2026-03-05T13:15')))
    } finally {
      await opened.close()
    }
  })

  test(`CY-5: ${CY_5_FIFTEEN.slice(2, 30)} -- a Ctrl copy pulled about 1 h 6 min right starts one hour later`, async () => {
    const opened = await openAtHourTier()
    try {
      const page = opened.page
      const axis = await axisOf(page)
      const plan = await boxOf(page, PLAN_OF_TASK_1)
      const source = (await readSchedule(page)).tasks[0]
      // WHY: the bar runs off the left edge and the status line crosses it at 12:00, so the press sits at 15:00, clear of both.
      const from = { x: axis.xOf(minuteOf(String(source.finish)) - 120), y: plan.y + plan.h / 2 }
      // STEP: select the bar (FR-033 copies the Selection), then Ctrl-drag the body by 66 minutes.
      await page.mouse.click(from.x, from.y)
      await readSettledDrawnSvg(page)
      await pull(page, from, { x: from.x + axis.xOf(66) - axis.xOf(0), y: from.y }, 'Control')
      const tasks = (await readSchedule(page)).tasks
      expect(tasks.length, 'one copy was made').toBe(3)
      const copy = tasks[tasks.length - 1]
      expect(minuteOf(String(copy.start)) - minuteOf(String(source.start)), 'shifted by the snapped minutes').toBe(60)
      expect(minuteOf(String(copy.finish)) - minuteOf(String(copy.start)), 'the copy keeps its length').toBe(minuteOf(String(source.finish)) - minuteOf(String(source.start)))
    } finally {
      await opened.close()
    }
  })

  test(`CU-3 and DC-3 with Alt held: ${T_378_READERS.slice(2, 26)} -- 10:08 reads 10:15, and the interval reads in 15 minutes`, async () => {
    const opened = await openAtHourTier()
    try {
      const page = opened.page
      const axis = await axisOf(page)
      const y = await rowBY(page)
      const at = (text: string): number => axis.xOf(minuteOf(text))
      await arm(page, 'IC-48')
      await page.keyboard.down('Alt')
      await page.mouse.move(at('2026-03-05T10:08'), y)
      await readSettledDrawnSvg(page)
      const guide = await pointTipLines(page)
      await page.keyboard.up('Alt')
      expect(guide.some((one) => /^2026\/03\/05 \(.+\) 10:15$/.test(one)), `CU-3 label with Alt: ${guide.join(' / ')}`).toBe(true)

      await arm(page, 'IC-45')
      await page.keyboard.down('Alt')
      await page.mouse.move(at('2026-03-05T10:08'), y)
      await page.mouse.down()
      await page.mouse.up()
      await page.mouse.move(at('2026-03-05T11:22'), y)
      await readSettledDrawnSvg(page)
      const readout = await pointTipLines(page)
      await page.keyboard.up('Alt')
      const dated = readout.filter((one) => /^\S+: /.test(one))
      expect(dated.length, `DC-3 shows three rows: ${readout.join(' / ')}`).toBeGreaterThanOrEqual(3)
      expect(dated[0], 'row 1: cursor A placed at 10:15 with Alt held').toMatch(/2026\/03\/05 \(.+\) 10:15$/)
      expect(dated[1], 'row 2: the following cursor at 11:22 reads 11:15').toMatch(/2026\/03\/05 \(.+\) 11:15$/)
      expect(dated[2], 'row 3: the interval ends in 1h, the 60 minutes between 10:15 and 11:15').toMatch(/1h$/)
    } finally {
      await opened.close()
    }
  })
})

test.describe('CR-850 at the day tier with the time shown, on the dev server', () => {
  test.setTimeout(180_000)

  test('SG-1: below the hour tier a grabbed plan finish moves by whole days and keeps the default finish time', async () => {
    const opened = await openAtHourTier()
    try {
      const page = opened.page
      for (let i = 0; i < 60 && (await page.locator(HOUR_TICKS).count()) > 0; i += 1) await pressEntrance(page, 'IC-12')
      await readSettledDrawnSvg(page)
      expect(await page.locator(HOUR_TICKS).count(), 'premise: the ruler left the hour tier').toBe(0)
      const plan = await boxOf(page, PLAN_OF_TASK_1)
      const source = (await readSchedule(page)).tasks[0]
      const before = String(source.finish)
      const perDay = (plan.w * 1440) / (minuteOf(before) - minuteOf(String(source.start)))
      // STEP: pull the plan finish right by about 1.6 days, measured on the drawn bar.
      await pull(page, { x: plan.x + plan.w - 1, y: plan.y + plan.h / 2 }, { x: plan.x + plan.w - 1 + perDay * 1.6, y: plan.y + plan.h / 2 }, null)
      const after = String((await readSchedule(page)).tasks[0].finish)
      expect(after.slice(10, 19), 'a whole-day unit writes the default finish time').toBe(DEFAULT_FINISH)
      expect((minuteOf(after) - minuteOf(before)) % 1440, 'the finish moved by whole days').toBe(0)
      expect(minuteOf(after) - minuteOf(before), 'the finish moved').toBeGreaterThan(0)
    } finally {
      await opened.close()
    }
  })

  test('CU-3: below the hour tier with the time shown, the label reads the day at 0:00', async () => {
    const opened = await openAtHourTier()
    try {
      const page = opened.page
      for (let i = 0; i < 60 && (await page.locator(HOUR_TICKS).count()) > 0; i += 1) await pressEntrance(page, 'IC-12')
      await readSettledDrawnSvg(page)
      const y = await rowBY(page)
      const plan = await boxOf(page, PLAN_OF_TASK_1)
      await arm(page, 'IC-48')
      await page.mouse.move(plan.x + plan.w + plan.w / 3 / 2, y)
      await readSettledDrawnSvg(page)
      const guide = await pointTipLines(page)
      expect(guide.some((one) => /^\d{4}\/\d{2}\/\d{2} \(.+\) 0:00$/.test(one)), `the day unit reads the day's 0:00: ${guide.join(' / ')}`).toBe(true)
    } finally {
      await opened.close()
    }
  })
})
