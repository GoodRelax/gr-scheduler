// CR-850 on the dev server: with time of day shown at the hour tier, the status line drags in 15-minute steps, Alt or not, and stands where it was let go.

import { expect, test, type Browser, type Page } from '@playwright/test'
import { specTable, unbroken } from '../contract/spec-table'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { validateDocument } from '../fixtures/grs-document'
import { BASE_SCREEN, openDocument, pressEntrance } from './cr-570-tree-state-stage'
import { CLEARING_UP_MS, launchReferenceBrowser, readSettledDrawnSvg } from './live-app'
import { rowOf } from './sws-case'
import { taskGroupsDocument } from './w3-t1-stage'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

const FR_046_DRAG =
  '⭐ 離した位置は、`FR-103` の 表 T-378 の単位で寄せて読むこと（MUST）'
const FR_046_AT_INSTANT =
  '⭐ 時刻を表示しているとき（`FR-158`）は、基準日線を `statusDate` の瞬間の位置に引くこと（MUST）'

const AGENT_API = rowOf(specTable('T-109'), 'IC-20').id
const STATUS_LINE = '[data-figure="status-line"]'
const SNAP_MINUTES = 15
// WHY: zoomX 100 is well over S-577 (hour tier) and S-578 (half-hour grid); the drawn px per minute is measured, not assumed.
const HOUR_TIER_ZOOM = 100
const START_STATUS = '2026-02-25T12:00:00'
const PINNED_NOW = new Date('2026-02-25T09:00:00')

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
    taskGroupsDocument({
      rows: 2,
      settings: { zoomX: HOUR_TIER_ZOOM, scrollDate: '2026-02-25T06:00:00', isTimeOfDayVisible: true },
    }),
  )
  built.schedule.project.statusDate = START_STATUS
  expect(validateDocument(built).errors, 'the fixture is a document the schema accepts').toEqual([])
  await openDocument(page, 'cr-850-status-line.json', JSON.stringify(built))
  return { page, close: async () => context.close() }
}

/** @purity semi-pure-b */
async function readStatusDate(page: Page): Promise<string> {
  return page.evaluate(() => {
    const api = (window as unknown as { grSchedulerAgentApi: { readDocument(): any } }).grSchedulerAgentApi
    return String(api.readDocument().schedule.project.statusDate)
  })
}

/** @purity non-pure */
async function setStatusDate(page: Page, statusDate: string): Promise<void> {
  await page.evaluate((asked: string) => {
    const api = (window as unknown as { grSchedulerAgentApi: { readStamp(): unknown; applyCommands(request: unknown): unknown } })
      .grSchedulerAgentApi
    api.applyCommands({ expectedStamp: api.readStamp(), commands: [{ kind: 'setStatusDate', statusDate: asked }] })
  }, statusDate)
  await readSettledDrawnSvg(page)
}

// WHY: the line stands at the statusDate instant (FR-046), so two set instants an hour apart give the px of one minute.
/** @purity non-pure */
async function pxPerMinute(page: Page): Promise<number> {
  await setStatusDate(page, '2026-02-25T11:00:00')
  const left = await lineCentre(page)
  await setStatusDate(page, START_STATUS)
  const right = await lineCentre(page)
  return (right.x - left.x) / 60
}

/** @purity semi-pure-b */
async function lineCentre(page: Page): Promise<{ x: number; y: number }> {
  const line = page.locator(STATUS_LINE)
  await expect(line).toHaveCount(1)
  const box = await line.boundingBox()
  if (box === null) throw new Error('the status line has no box')
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

/** @purity non-pure */
async function dragLineBy(page: Page, dx: number, withAlt: boolean): Promise<void> {
  const from = await lineCentre(page)
  if (withAlt) await page.keyboard.down('Alt')
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(from.x + dx / 2, from.y, { steps: 4 })
  await page.mouse.move(from.x + dx, from.y, { steps: 4 })
  await page.mouse.up()
  if (withAlt) await page.keyboard.up('Alt')
  await readSettledDrawnSvg(page)
}

const minutesOf = (text: string): number => {
  const [, hh, mm] = /T(\d{2}):(\d{2})/.exec(text) ?? []
  return Number(hh) * 60 + Number(mm)
}

test.describe('CR-850 the manuscript these cases are driven by', () => {
  for (const clause of [FR_046_DRAG, FR_046_AT_INSTANT]) {
    test(`01-04 still says: ${clause.slice(-40)}`, () => {
      expect(REQUIREMENTS).toContain(clause)
    })
  }
})

test.describe(`CR-850 FR-046 -- ${FR_046_DRAG}`, () => {
  test.setTimeout(180_000)

  for (const withAlt of [false, true]) {
    test(`a drag at the hour tier writes a quarter hour and the line stands where it was let go (Alt held: ${String(withAlt)})`, async () => {
      const opened = await openAtHourTier()
      try {
        const page = opened.page
        const perMinute = await pxPerMinute(page)
        expect(await readStatusDate(page)).toBe(START_STATUS)
        expect(perMinute * SNAP_MINUTES, 'premise: a quarter hour is wider than 3 px').toBeGreaterThan(3)
        const before = await lineCentre(page)
        // STEP: pull right by 4.4 quarter hours: it lands 4 quarters (one hour) later.
        await dragLineBy(page, 4.4 * SNAP_MINUTES * perMinute, withAlt)
        const first = await readStatusDate(page)
        expect(minutesOf(first) % SNAP_MINUTES, `${first} sits on a quarter hour`).toBe(0)
        expect(minutesOf(first) - minutesOf(START_STATUS), `${first} is one hour later`).toBe(60)
        const after = await lineCentre(page)
        expect(Math.abs(after.x - before.x - 60 * perMinute), FR_046_AT_INSTANT).toBeLessThan(1)
        // STEP: pull left by 1.7 quarter hours: it lands 2 quarters earlier.
        await dragLineBy(page, -1.7 * SNAP_MINUTES * perMinute, withAlt)
        const second = await readStatusDate(page)
        expect(minutesOf(second) - minutesOf(first), `${second} is 30 minutes before ${first}`).toBe(-30)
      } finally {
        await opened.close()
      }
    })
  }
})
