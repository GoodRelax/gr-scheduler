// CR-701 on the shipped build: a plan end released on a Saturday asks nothing; the end stays on the Saturday and the calendar and its shade do not change.

import { expect, test, type Browser, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { bare, specTable, unbroken } from '../contract/spec-table'
import { validateDocument } from '../fixtures/grs-document'
import { CLEARING_UP_MS, launchReferenceBrowser } from './live-app'
import { openDocument, openStage, settle, type Stage } from './cr-570-tree-state-stage'
import { rowOf } from './sws-case'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

// WHY: each constant ends exactly at its marker, cut from the manuscript as check 39 reads it.
const FR_031_ONLY_THESE = '確認ダイアログを増やす代わりにこれが要る。例外は、取り消しで取り戻せないものを失う場面に限る（MUST）'
const FR_031_NO_OTHER = 'それ以外の場面で確認を求めてはならない（MUST NOT）'
const FR_103_NO_SNAP = '⛔ **掴んだ端点を置いた日を、稼働日へ寄せてはならない（MUST NOT）'

test.describe('CR-701 the manuscript these cases are driven by', () => {
  for (const clause of [FR_031_ONLY_THESE, FR_031_NO_OTHER, FR_103_NO_SNAP]) {
    test(`01-04 still says: ${clause.slice(-40)}`, () => {
      expect(REQUIREMENTS).toContain(clause)
    })
  }
})

const CONFIRMATION = `[data-role="${bare(rowOf(specTable('T-103'), 'U-55').cells[0] ?? '')}"]`

const TEMPLATE = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
) as { schemaVersion: string; schedule: Record<string, any>; documentSettings: Record<string, unknown>; documentStamp: unknown }

// WHY: January 2026 runs Mon 5 .. Fri 9, Sat 10; the template calendar works Mon-Fri and has no January exception.
const day = (dayOfMonth: number, time = '08:00:00'): string => `2026-01-${String(dayOfMonth).padStart(2, '0')}T${time}`
const ROW = '5c000000-0000-4000-8000-000000006680'
// WHY: the Command Palette opens over the left of the canvas; the view starts two weeks early so the bar lies clear of it.
const CLEAR_OF_THE_PALETTE = '2025-12-20T00:00:00'

/** @purity pure */
function fixture(): string {
  const built = {
    schemaVersion: TEMPLATE.schemaVersion,
    schedule: {
      ...TEMPLATE.schedule,
      project: { ...TEMPLATE.schedule['project'], statusDate: null, uidHighWaterMark: 100 },
      tasks: [
        {
          uid: 1,
          wbsParentUid: null,
          wbsOrder: 1,
          name: 'Alpha',
          start: day(5),
          finish: day(7, '17:00:00'),
          milestone: false,
          deadline: null,
          notes: null,
          calendarUid: null,
          actualStart: null,
          actualFinish: null,
          stop: null,
          resume: null,
          resumeValid: null,
          percentComplete: 0,
          fadeInDays: null,
          fadeOutDays: null,
          dependencies: [],
          carry: {},
          carryElements: [],
        },
      ],
      resources: [],
      assignments: [],
      taskGroups: [{ ...TEMPLATE.schedule['taskGroups'][0], id: ROW, parentId: null, label: 'Row A', order: 0, treeState: 'auto', minHeight: null }],
      taskGroupMembers: [{ taskUid: 1, groupId: ROW }],
      taskVisuals: [{ taskUid: 1, shapeKind: null, milestoneGlyph: null, fillColor: null, strokeColor: null, strokeWidthPx: null }],
      commentBoxes: [],
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
    },
    documentSettings: { ...TEMPLATE.documentSettings, zoomX: 6, scrollDate: CLEAR_OF_THE_PALETTE, scrollDayOffset: 0, scrollGroupId: ROW, scrollGroupOffset: 0 },
    documentStamp: TEMPLATE.documentStamp,
    changeLog: [],
  }
  const checked = validateDocument(built)
  expect(checked.errors, 'the fixture is a document the schema accepts').toEqual([])
  return JSON.stringify(built)
}

interface Held {
  readonly finish: string
  readonly exceptions: string
  readonly stamp: unknown
}

/** @purity semi-pure-b */
async function readHeld(page: Page): Promise<Held> {
  return page.evaluate(() => {
    const api = (window as unknown as { grSchedulerAgentApi: { readDocument(): any } }).grSchedulerAgentApi
    const held = api.readDocument()
    return {
      finish: String(held.schedule.tasks[0].finish).slice(0, 10),
      exceptions: JSON.stringify(held.schedule.calendars.map((one: { exceptions: unknown }) => one.exceptions)),
      stamp: held.documentStamp,
    }
  })
}

interface Box {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

/** @purity semi-pure-b */
async function planBox(page: Page): Promise<Box> {
  const box = await page.evaluate(() => {
    const r = document.querySelector('[data-figure="task-1-plan"]')?.getBoundingClientRect()
    return r === undefined ? null : { x: r.x, y: r.y, width: r.width, height: r.height }
  })
  if (box === null) throw new Error('the plan bar of task 1 is not drawn')
  return box
}

// WHY: the shade is one path of runs "M x0 top H x1 V bottom H x0 Z", read here in page coordinates.
/** @purity semi-pure-b */
async function shadeRuns(page: Page): Promise<readonly (readonly [number, number])[]> {
  return page.evaluate(() => {
    const left = document.querySelector('[data-role="Schedule Canvas"] svg')?.getBoundingClientRect().x ?? 0
    const d = document.querySelector('[data-figure="non-working-days"]')?.getAttribute('d') ?? ''
    return Array.from(d.matchAll(/M(-?[\d.]+) [-\d.]+ H(-?[\d.]+)/g)).map((one) => [Number(one[1]) + left, Number(one[2]) + left] as const)
  })
}

/** @purity semi-pure-b */
async function isShadedAt(page: Page, x: number): Promise<boolean> {
  return (await shadeRuns(page)).some(([from, to]) => from <= x && x <= to)
}

interface Days {
  readonly perDay: number
  readonly friday: number
  readonly saturday: number
}

// WHY: the run of shade that ends where the Monday bar starts is Saturday 3 and Sunday 4, two day columns wide.
/** @purity semi-pure-b */
async function daysFrom(page: Page, bar: Box): Promise<Days> {
  const runs = await shadeRuns(page)
  const weekend = runs.find(([, to]) => Math.abs(to - bar.x) < 1)
  if (weekend === undefined) throw new Error(`no shaded weekend ends at the bar start ${bar.x}`)
  const perDay = (weekend[1] - weekend[0]) / 2
  return { perDay, friday: bar.x + 4.5 * perDay, saturday: bar.x + 5.5 * perDay }
}

// WHY: the end is moved by whole day columns from where it was grabbed, so the finish moves by that many days
// whichever edge of its day the end is drawn on; Wednesday + 2 is Friday, + 3 is Saturday.
/** @purity non-pure */
async function dragPlanEndBy(page: Page, days: Days, count: number): Promise<void> {
  const bar = await planBox(page)
  const y = bar.y + bar.height / 2
  const from = bar.x + bar.width - 2
  await page.mouse.move(from, y)
  await page.mouse.down()
  await page.mouse.move(from + count * days.perDay, y, { steps: 8 })
  await page.mouse.up()
  await settle(page)
}

/** @purity semi-pure-b */
async function questionText(page: Page): Promise<string | null> {
  return page.evaluate((selector: string) => {
    const found = document.querySelector(selector)
    return found === null ? null : (found.textContent ?? '')
  }, CONFIRMATION)
}

let browser: Browser | null = null

test.beforeAll(async () => {
  browser = await launchReferenceBrowser()
})

test.afterAll(async () => {
  test.setTimeout(CLEARING_UP_MS)
  await browser?.close()
})

/** @purity non-pure */
async function stage(): Promise<{ stage: Stage; days: Days; before: Held }> {
  if (browser === null) throw new Error('no browser')
  const opened = await openStage(browser)
  await openDocument(opened.page, 'cr-701.json', fixture())
  const days = await daysFrom(opened.page, await planBox(opened.page))
  const before = await readHeld(opened.page)
  expect(before.finish).toBe('2026-01-07')
  expect(await isShadedAt(opened.page, days.saturday), 'the Saturday is shaded before the drag').toBe(true)
  expect(await isShadedAt(opened.page, days.friday), 'the Friday is not shaded').toBe(false)
  return { stage: opened, days, before }
}

test.describe('FR-031 / FR-103 on the shipped build: a rest-day release is not asked', () => {
  test.setTimeout(180_000)

  test(`FR-031 (MUST NOT): ${FR_031_NO_OTHER} -- a plan end released on a Friday asks nothing`, async () => {
    const { stage: opened, days } = await stage()
    try {
      await dragPlanEndBy(opened.page, days, 2)
      expect(await questionText(opened.page)).toBeNull()
      expect((await readHeld(opened.page)).finish).toBe('2026-01-09')
    } finally {
      await opened.close()
    }
  })

  test(`FR-031 (MUST): ${FR_031_ONLY_THESE.slice(-30)} -- a plan end released on a Saturday loses nothing, so it asks nothing`, async () => {
    const { stage: opened, days, before } = await stage()
    try {
      await dragPlanEndBy(opened.page, days, 3)
      expect(await questionText(opened.page), 'no question stands after the release').toBeNull()
      const placed = await readHeld(opened.page)
      expect(placed.finish, 'the end is written at the release').toBe('2026-01-10')
      expect(placed.exceptions, 'the calendar is not changed').toBe(before.exceptions)
    } finally {
      await opened.close()
    }
  })

  test(`FR-103 (MUST NOT): ${FR_103_NO_SNAP.slice(-22)} -- the end stays on the Saturday and the Saturday keeps its shade`, async () => {
    const { stage: opened, days, before } = await stage()
    try {
      await dragPlanEndBy(opened.page, days, 3)
      const placed = await readHeld(opened.page)
      expect(placed.finish, 'not Friday, not Monday').toBe('2026-01-10')
      expect(await isShadedAt(opened.page, days.saturday), 'the Saturday keeps its shade').toBe(true)
      await opened.page.keyboard.press('Control+z')
      await settle(opened.page)
      const undone = await readHeld(opened.page)
      expect(undone.finish, 'one undo puts the end back').toBe('2026-01-07')
      expect(undone.exceptions, 'and there is no calendar change to undo').toBe(before.exceptions)
    } finally {
      await opened.close()
    }
  })
})
