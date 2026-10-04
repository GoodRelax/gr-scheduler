// CR-668 on the shipped build: a plan end released on a Saturday asks QN-13; Yes works the day in one undo step, No and Esc keep the shade.

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
const FR_154_ONE_STEP =
  '`Yes` と答えたときは、例外日を足す書き込み（`_assets/tbl-glossary.md` の 表 T-108 の `CM-39`）と端を置く書き込みを 1 つの束とし、取り消しを 1 段とすること（MUST）'
const FR_154_NOT_SILENTLY =
  'その日を文書の暦の稼働日にすれば、どの数え方も同じ日数を数える。⛔ 暦を黙って変えてはならない（MUST NOT）'
const FR_154_NO_SNAP = '⇒ 変えるかどうかは、端を置いた人がその場で選ぶ。⛔ 端を稼働日へ寄せてはならない（MUST NOT）'
const FR_031_NO_OTHER = 'それ以外の場面で確認を求めてはならない（MUST NOT）'
const HW_11 = '`Yes`（`y`）・`No`（`n`）。<br>`Esc` は `No` と同じ'
const QN_13_DAYS = '挙げない —— 日付を挙げる。<br>日の書き方は 表 T-348 の `TL-10` と `TL-11`（曜日を添える）'
const AG_9 = '人が画面で文書を変えるドラッグをしている間は、書き込みを拒否すること（MUST）'
const FR_154_AG_9 = '⚠️ 問いが立っているあいだは、人のドラッグが続いているものとし、`Agent API` の書き込みを拒む（表 T-035 の `AG-9`）'

const RAW = readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8')

test.describe('CR-668 the manuscript these cases are driven by', () => {
  for (const clause of [FR_154_ONE_STEP, FR_154_NOT_SILENTLY, FR_154_NO_SNAP, FR_031_NO_OTHER, AG_9, FR_154_AG_9]) {
    test(`01-04 still says: ${clause.slice(-40)}`, () => {
      expect(REQUIREMENTS).toContain(clause)
    })
  }
  for (const cell of [HW_11, QN_13_DAYS]) {
    test(`the table cell still says: ${cell.slice(0, 30)}`, () => {
      expect(RAW).toContain(cell)
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
  await openDocument(opened.page, 'cr-668.json', fixture())
  const days = await daysFrom(opened.page, await planBox(opened.page))
  const before = await readHeld(opened.page)
  expect(before.finish).toBe('2026-01-07')
  expect(await isShadedAt(opened.page, days.saturday), 'the Saturday is shaded before the drag').toBe(true)
  expect(await isShadedAt(opened.page, days.friday), 'the Friday is not shaded').toBe(false)
  return { stage: opened, days, before }
}

test.describe('FR-154 / QN-13 on the shipped build', () => {
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

  test(`FR-154 (MUST NOT): ${FR_154_NOT_SILENTLY.slice(-24)} -- the Saturday release asks QN-13 with the day and changes nothing yet`, async () => {
    const { stage: opened, days, before } = await stage()
    try {
      await dragPlanEndBy(opened.page, days, 3)
      const said = await questionText(opened.page)
      expect(said, 'QN-13 stands on the confirmation surface').not.toBeNull()
      // see TL-10, TL-11
      expect(said ?? '').toMatch(/1\/10 \((土|Sat)\)/)
      const held = await readHeld(opened.page)
      expect(held.exceptions, 'no calendar row before the answer').toBe(before.exceptions)
      expect(held.finish, 'no end either: the question belongs to the drag').toBe('2026-01-07')
      await opened.page.keyboard.press('n')
      await settle(opened.page)
    } finally {
      await opened.close()
    }
  })

  test(`AG-9 (MUST): ${AG_9.slice(-30)} -- an agent write is refused while QN-13 stands`, async () => {
    const { stage: opened, days } = await stage()
    try {
      await dragPlanEndBy(opened.page, days, 3)
      expect(await questionText(opened.page)).not.toBeNull()
      const held = await readHeld(opened.page)
      const outcome = await opened.page.evaluate((stamp: unknown) => {
        const api = (window as unknown as { grSchedulerAgentApi: { applyCommands(request: unknown): { accepted: boolean } } }).grSchedulerAgentApi
        return api.applyCommands({ readStamp: stamp, commands: [{ kind: 'setTaskName', uid: 1, name: 'Agent' }] }).accepted
      }, held.stamp)
      expect(outcome, FR_154_AG_9).toBe(false)
      await opened.page.keyboard.press('n')
      await settle(opened.page)
    } finally {
      await opened.close()
    }
  })

  test(`FR-154 (MUST): ${FR_154_ONE_STEP.slice(-40)} -- Yes works the Saturday, one Ctrl+Z restores both`, async () => {
    const { stage: opened, days, before } = await stage()
    try {
      await dragPlanEndBy(opened.page, days, 3)
      expect(await questionText(opened.page)).not.toBeNull()
      await opened.page.keyboard.press('y')
      await settle(opened.page)
      expect(await questionText(opened.page)).toBeNull()
      const accepted = await readHeld(opened.page)
      expect(accepted.finish).toBe('2026-01-10')
      expect(accepted.exceptions).not.toBe(before.exceptions)
      expect(await isShadedAt(opened.page, days.saturday), 'the grey shade leaves the Saturday').toBe(false)
      await opened.page.keyboard.press('Control+z')
      await settle(opened.page)
      const undone = await readHeld(opened.page)
      expect(undone.finish, 'one undo puts the end back').toBe('2026-01-07')
      expect(undone.exceptions, 'the same undo takes the calendar row back').toBe(before.exceptions)
      expect(await isShadedAt(opened.page, days.saturday), 'the shade is back').toBe(true)
    } finally {
      await opened.close()
    }
  })

  for (const [answer, key] of [['No', 'n'], ['Esc', 'Escape']] as const) {
    test(`FR-154 (MUST NOT): ${FR_154_NO_SNAP.slice(-22)} -- ${answer} places the end on the Saturday and keeps the shade`, async () => {
      const { stage: opened, days, before } = await stage()
      try {
        await dragPlanEndBy(opened.page, days, 3)
        expect(await questionText(opened.page)).not.toBeNull()
        await opened.page.keyboard.press(key)
        await settle(opened.page)
        expect(await questionText(opened.page)).toBeNull()
        const declined = await readHeld(opened.page)
        expect(declined.finish, 'the end stays on the day it was released on').toBe('2026-01-10')
        expect(declined.exceptions, 'the calendar is not changed').toBe(before.exceptions)
        expect(await isShadedAt(opened.page, days.saturday), 'the Saturday keeps its shade').toBe(true)
      } finally {
        await opened.close()
      }
    })
  }
})
