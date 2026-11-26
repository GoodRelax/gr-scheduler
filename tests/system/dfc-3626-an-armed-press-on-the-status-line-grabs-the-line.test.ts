// DFC-3626 on the shipped build: an armed press within S-137 of the status line grabs it (T-023b AR-2 AR-3, GR-16); beyond it creates (PTD-4, TC-6).

import { expect, test, type Browser, type Page } from '@playwright/test'

import { grabSizesOf } from '../../src/entity/layout-engine/item-hit-area/item-hit-area'
import { VIEWPORT, answerConfirmation, dayAxis, dayNumber, drag, enableAgentApi, figureBox, launch, press, readDocument } from '../use-case/uc-harness'

const STATUS_LINE_REACH_PX = grabSizesOf()['S-137']
// Why: the y and the pull of UC-004's task B (tests/use-case/uc-004-show-dependencies-between-tasks.test.ts).
const TASK_GROUP_Y = 83
const PULL_PX = 150

/** @purity non-pure */
async function armedOnAnEmptyTaskGroup(browser: Browser, now: Date, entry: string): Promise<Page> {
  const context = await browser.newContext({ viewport: VIEWPORT, locale: 'en-US' })
  const page = await context.newPage()
  await page.clock.setFixedTime(now)
  await launch(page)
  await enableAgentApi(page)
  await press(page, 'IC-106')
  await answerConfirmation(page, 'proceed')
  await press(page, entry)
  return page
}

/** @purity non-pure */
async function statusLineX(page: Page): Promise<number> {
  const box = await figureBox(page, 'status-line')
  expect(box, 'premise: the document keeps a status date, so CU-1 draws the status line').not.toBeNull()
  return box!.x + box!.w / 2
}

/** @purity non-pure */
async function expectGrabbedOrCreated(page: Page, from: number, isOnTheLine: boolean, what: string): Promise<void> {
  const before = await readDocument(page)
  expect(before.schedule.tasks, 'premise: IC-106 left no task').toHaveLength(0)
  const axis = await dayAxis(page)
  await drag(page, { x: from, y: TASK_GROUP_Y }, { x: from + PULL_PX, y: TASK_GROUP_Y })
  const after = await readDocument(page)
  if (isOnTheLine) {
    expect(after.schedule.tasks, `${what}: the line is hit, so the existing one wins and nothing is created (T-023b)`).toHaveLength(0)
    const moved = after.schedule.project.statusDate as string
    expect(moved, `${what}: GR-16 moves the status date`).not.toBe(before.schedule.project.statusDate)
    expect(Math.abs(dayNumber(moved) - axis.dayOf(from + PULL_PX)), `${what}: GR-16 puts the status date on the day released on (FR-046)`).toBeLessThanOrEqual(1)
  } else {
    expect(after.schedule.tasks, `${what}: nothing is hit, so the armed shape is created (PTD-4, FR-001)`).toHaveLength(1)
    expect(after.schedule.project.statusDate, `${what}: the status date stays`).toBe(before.schedule.project.statusDate)
  }
  await page.context().close()
}

// Why: after IC-106 the line stays on the sample's statusDate and the view opens on today, so the clock moves the line;
// on 11-25 it stood 3.75 px from UC-004's press at x 900, one day before and three after 7.5 px.
const CLOCKS: ReadonlyArray<{ readonly now: string; readonly isOnTheLine: boolean }> = [
  { now: '2026-11-24T09:00:00', isOnTheLine: false },
  { now: '2026-11-25T09:00:00', isOnTheLine: true },
  { now: '2026-11-28T09:00:00', isOnTheLine: false },
]

for (const clock of CLOCKS) {
  test(`DFC-3626: UC-004's pull of B from x 900 with the clock on ${clock.now}`, async ({ browser }) => {
    const page = await armedOnAnEmptyTaskGroup(browser, new Date(clock.now), 'IC-23')
    const distance = Math.abs(900 - (await statusLineX(page)))
    expect(distance <= STATUS_LINE_REACH_PX, `premise: x 900 is ${String(distance)} px from the status line; S-137 is ${String(STATUS_LINE_REACH_PX)} px`).toBe(clock.isOnTheLine)
    await expectGrabbedOrCreated(page, 900, clock.isOnTheLine, `clock ${clock.now}`)
  })
}

// Why: 1 px inside and 3 px beyond S-137 on both sides, for a bar shape (AR-2) and a milestone shape (AR-3).
const OFFSETS: readonly number[] = [-(STATUS_LINE_REACH_PX + 3), -(STATUS_LINE_REACH_PX - 1), STATUS_LINE_REACH_PX - 1, STATUS_LINE_REACH_PX + 3]

for (const entry of ['IC-23', 'IC-27']) {
  for (const offset of OFFSETS) {
    test(`DFC-3626: ${entry} armed, pressed ${String(offset)} px from the status line`, async ({ browser }) => {
      const page = await armedOnAnEmptyTaskGroup(browser, new Date('2026-11-25T09:00:00'), entry)
      const line = await statusLineX(page)
      await expectGrabbedOrCreated(page, line + offset, Math.abs(offset) <= STATUS_LINE_REACH_PX, `${entry} at ${String(offset)} px`)
    })
  }
}
