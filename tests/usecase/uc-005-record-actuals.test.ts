// Use-case test for UC-005 (record actuals), table T-334 row VT-1.
import { expect, test, type Page } from '@playwright/test'
import { VIEWPORT, answerConfirmation, drag, enableAgentApi, figureBox, launch, press, readDocument, settle } from './uc-harness'

test.use({ viewport: VIEWPORT, locale: 'en-US' })

const DAY_MS = 86400000
const weekdaysBetween = (fromIso: string, toIso: string, inclusive: boolean): number => {
  let count = 0
  const end = Date.parse(toIso.slice(0, 10) + 'T00:00:00Z') + (inclusive ? DAY_MS : 0)
  for (let t = Date.parse(fromIso.slice(0, 10) + 'T00:00:00Z'); t < end; t += DAY_MS) {
    const weekday = new Date(t).getUTCDay()
    if (weekday !== 0 && weekday !== 6) count++
  }
  return count
}

const markerShape = (page: Page, uid: number): Promise<string> =>
  page.evaluate((uid) => [...document.querySelectorAll('[data-figure="task-' + uid + '-marker"]')].map((e) => e.tagName).join('|'), uid)

const pressMarker = async (page: Page, uid: number): Promise<void> => {
  const marker = (await figureBox(page, 'task-' + uid + '-marker'))!
  await page.mouse.click(marker.x + marker.w * 0.85, marker.y + marker.h / 2)
  await page.waitForTimeout(1500)
  await settle(page)
}

test('UC-005 record actuals (FR-043, FR-011, FR-012, FR-013 T-021 T-021a PV-1..PV-4, T-019)', async ({ page }) => {
  await launch(page)
  await enableAgentApi(page)
  await press(page, 'IC-106')
  await answerConfirmation(page, 'proceed')
  await press(page, 'IC-23')
  await drag(page, { x: 700, y: 83 }, { x: 1100, y: 83 })
  await page.keyboard.type('Work')
  await page.keyboard.press('Enter')
  await press(page, 'IC-23')
  if (!(await readDocument(page)).documentSettings.progressMarkerVisible) await press(page, 'IC-40')
  const uid = (await readDocument(page)).schedule.tasks[0]!.uid as number
  const task = async () => (await readDocument(page)).schedule.tasks[0]!

  await test.step('UC-005 step 1: grab the end of the actual bar and place it (FR-043 dummy, FR-011)', async () => {
    expect((await task()).actualStart).toBeNull()
    const dummy = (await figureBox(page, 'task-' + uid + '-dummies'))!
    await drag(page, { x: dummy.x + dummy.w - 1, y: dummy.y + dummy.h / 2 }, { x: dummy.x + dummy.w + 99, y: dummy.y + dummy.h / 2 })
    const first = await task()
    expect(first.actualStart).not.toBeNull()
    const actual = (await figureBox(page, 'task-' + uid + '-actual'))!
    await drag(page, { x: actual.x + actual.w - 1, y: actual.y + actual.h / 2 }, { x: actual.x + actual.w + 79, y: actual.y + actual.h / 2 })
    expect(Date.parse((await task()).stop)).toBeGreaterThan(Date.parse(first.stop))
  })

  await test.step('UC-005 step 2: actual start and duration are stored, and percentComplete is worked out from the dates (FR-012)', async () => {
    const now = await task()
    expect(now.actualStart).toBe(now.start)
    expect(now.actualFinish).toBeNull()
    const expected = Math.round((weekdaysBetween(now.actualStart, now.stop, true) / weekdaysBetween(now.start, now.finish, false)) * 100)
    expect(Math.abs(now.percentComplete - expected)).toBeLessThanOrEqual(1)
    const actual = (await figureBox(page, 'task-' + uid + '-actual'))!
    const plan = (await figureBox(page, 'task-' + uid + '-plan'))!
    expect(Math.abs(actual.x - plan.x)).toBeLessThan(2)
  })

  const shapes: string[] = []
  await test.step('UC-005 step 3: press the progress marker to move the state on (T-021a PV-2)', async () => {
    shapes.push(await markerShape(page, uid))
    const before = await task()
    await pressMarker(page, uid)
    const after = await task()
    expect(after.actualFinish).toBe(before.stop)
    expect(after.stop).toBeNull()
    expect(after.resumeValid).toBe(false)
    expect(after.actualStart).toBe(before.actualStart)
  })

  await test.step('UC-005 step 4: the state cycles and each state has its own marker shape (T-021, T-021a PV-3 PV-4 PV-1, FR-030)', async () => {
    shapes.push(await markerShape(page, uid))
    const complete = await task()
    await pressMarker(page, uid)
    const interrupted = await task()
    expect(interrupted.stop).toBe(complete.actualFinish)
    expect(interrupted.actualFinish).toBeNull()
    expect(interrupted.resume).toBeNull()
    expect(interrupted.resumeValid).toBe(false)
    shapes.push(await markerShape(page, uid))
    await pressMarker(page, uid)
    const notStarted = await task()
    expect(notStarted.actualStart).toBeNull()
    expect(notStarted.stop).toBeNull()
    await pressMarker(page, uid)
    const restarted = await task()
    expect(restarted.actualStart).toBe(interrupted.actualStart)
    expect(restarted.stop).toBe(interrupted.stop)
    expect(restarted.resumeValid).toBe(true)
    expect(new Set(shapes).size).toBe(3)
  })
})
