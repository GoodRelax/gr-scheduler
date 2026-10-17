// DFC-2980: FR-107 table T-270 row PE-8 on the shipped build -- a marker pulled in 1 px steps puts the actual of table T-245 row GO-9.

import { expect, test, type Page } from '@playwright/test'

import { answerConfirmation, dayAxis, dayNumber, drag, enableAgentApi, figureBox, launch, press, readDocument, settle } from '../use-case/uc-harness'

test.use({ viewport: { width: 1454, height: 709 } })

const FROM = { x: 655, y: 88 }
const TO = { x: 768, y: 88 }
const DRAG_THRESHOLD_PX = 6

// WHY: a frame between moves, as a hand makes them; two rAF turns let the tentative picture be drawn before it is read.
/** @purity non-pure */
async function frame(page: Page): Promise<void> {
  await page.evaluate(() => new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => done()))))
}

/** @purity non-pure */
async function placeANamedTask(page: Page): Promise<number> {
  await launch(page)
  await enableAgentApi(page)
  await press(page, 'IC-98')
  // WHY: FR-095 asks QN-5 only when edits are unsaved; the start-up document has none, so most runs see no question.
  if ((await page.locator('[data-role="Confirmation"]').count()) > 0) await answerConfirmation(page, 'proceed')
  await press(page, 'IC-23')
  await drag(page, FROM, TO)
  await page.keyboard.type('Alpha')
  await page.keyboard.press('Enter')
  await settle(page)
  const tasks = (await readDocument(page)).schedule.tasks
  expect(tasks, 'premise: the rectangle made one task').toHaveLength(1)
  return tasks[0]!.uid
}

for (const travel of [64, 66, 70, 120]) {
  test(`PE-8 / GO-9: the marker pulled ${String(travel)} px in 1 px steps puts the actual on release`, async ({ page }) => {
    const uid = await placeANamedTask(page)
    const planStart = (await readDocument(page)).schedule.tasks.find((one) => one.uid === uid)!.start.slice(0, 10)
    const axis = await dayAxis(page)
    const marker = await figureBox(page, `task-${String(uid)}-marker`)
    expect(marker, 'premise: the not-started task draws its progress marker (FR-109)').not.toBeNull()
    expect(await figureBox(page, `task-${String(uid)}-actual`), 'premise: a not-started task has no actual figure yet (FR-013)').toBeNull()

    // WHY: the right half of the marker; the dummy's grab area (GA-5) takes the left half (table T-267).
    const press0 = { x: marker!.x + marker!.w * 0.75, y: marker!.y + marker!.h / 2 }
    await page.mouse.move(press0.x, press0.y)
    await page.mouse.down()
    for (let step = 1; step <= travel; step += 1) {
      await page.mouse.move(press0.x + step, press0.y)
      await frame(page)
      if (step > DRAG_THRESHOLD_PX) {
        await expect(
          page.locator(`[data-figure="task-${String(uid)}-actual"]`),
          `at ${String(step)} px of travel the tentative picture draws the pulled actual (FR-107 PE-8, FR-109 draws it while held)`,
        ).toHaveCount(1)
      }
    }
    await page.mouse.up()
    await settle(page)

    await expect(page.locator(`[data-figure="task-${String(uid)}-actual"]`), `release at ${String(travel)} px (GO-9)`).toHaveCount(1)
    const task = (await readDocument(page)).schedule.tasks.find((one) => one.uid === uid)!
    expect(task.actualStart?.slice(0, 10), `release at ${String(travel)} px: actualStart is the plan start (GO-9)`).toBe(planStart)
    const lastDay = (task.actualFinish ?? task.stop) as string | null
    expect(lastDay, `release at ${String(travel)} px: the last day of the actual is written (GO-9)`).not.toBeNull()
    expect(
      Math.abs(dayNumber(lastDay!) - axis.dayOf(press0.x + travel)),
      `release at ${String(travel)} px: the last day of the actual is the day released on (GO-9)`,
    ).toBeLessThanOrEqual(1)
  })
}
