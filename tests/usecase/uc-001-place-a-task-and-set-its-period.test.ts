// Use-case test for UC-001 (place a task and set its period), table T-334 row VT-1.
import { expect, test, type Page } from '@playwright/test'
import { VIEWPORT, answerConfirmation, dayAxis, dayNumber, drag, enableAgentApi, figureBox, icon, launch, press, readDocument, settle } from './uc-harness'

test.use({ viewport: VIEWPORT })

const ROW_Y = 83
const typeName = async (page: Page, name: string): Promise<void> => {
  await page.keyboard.type(name)
  await page.keyboard.press('Enter')
  await settle(page)
}

test('UC-001 place a task and set its period (FR-001 TC-6 TC-9, FR-091, FR-002, FR-109 LP-3, FR-003 ST-2)', async ({ page }) => {
  await launch(page)
  await enableAgentApi(page)
  await press(page, 'IC-106')
  await answerConfirmation(page, 'proceed')
  const onlyRow = (await readDocument(page)).schedule.taskGroups
  expect(onlyRow).toHaveLength(1)

  const axis = await dayAxis(page)
  const from = { x: 700, y: ROW_Y }
  const to = { x: 900, y: ROW_Y }

  await test.step('UC-001 step 1: arm the rectangle shape (IC-23) and drag over empty ground', async () => {
    await press(page, 'IC-23')
    await expect(page.locator(icon('IC-23'))).toHaveAttribute('data-armed', 'true')
    await drag(page, from, to)
  })

  let firstUid = 0
  await test.step('UC-001 step 2: a task of that period is made and drawn in the armed shape (FR-001 TC-6, T-012 SH-1)', async () => {
    const doc = await readDocument(page)
    expect(doc.schedule.tasks).toHaveLength(1)
    const task = doc.schedule.tasks[0]!
    firstUid = task.uid
    expect(task.milestone).toBe(false)
    expect(Math.abs(dayNumber(task.start) - axis.dayOf(from.x))).toBeLessThanOrEqual(1)
    expect(Math.abs(dayNumber(task.finish) - axis.dayOf(to.x))).toBeLessThanOrEqual(1)
    expect(doc.schedule.taskVisuals.find((v) => v.taskUid === firstUid)?.shapeKind).toBe('rectangle')
    expect(doc.schedule.taskGroupMembers.find((m) => m.taskUid === firstUid)?.groupId).toBe(onlyRow[0]!.id)
    const plan = await figureBox(page, 'task-' + firstUid + '-plan')
    expect(plan).not.toBeNull()
    expect(Math.abs(plan!.x - from.x)).toBeLessThan(6)
    expect(Math.abs(plan!.x + plan!.w - to.x)).toBeLessThan(6)
  })

  await test.step('UC-001 step 3: the name is typed straight away (FR-091, TC-9)', async () => {
    await expect(page.locator('[data-role="Properties Panel"] textarea[data-field-row="PR-1"]')).toBeFocused()
    await typeName(page, 'Alpha task')
    const task = (await readDocument(page)).schedule.tasks.find((t) => t.uid === firstUid)!
    expect(task.name).toBe('Alpha task')
  })

  await test.step('UC-001 step 4: the name label sits where it hides no shape (FR-002, FR-109 LP-3)', async () => {
    const plan = (await figureBox(page, 'task-' + firstUid + '-plan'))!
    const label = (await figureBox(page, 'task-' + firstUid + '-label'))!
    await expect(page.locator('[data-figure="task-' + firstUid + '-label"]')).toHaveText('Alpha task')
    expect(label.x).toBeGreaterThanOrEqual(plan.x)
    expect(label.x + label.w).toBeLessThanOrEqual(plan.x + plan.w)
    expect(label.y + label.h / 2).toBeGreaterThan(plan.y)
    expect(label.y + label.h / 2).toBeLessThan(plan.y + plan.h)
  })

  await test.step('UC-001 step 5: a second task overlapping in time is stacked in the fixed order (FR-003 ST-2, ST-3, ST-5)', async () => {
    await expect(page.locator(icon('IC-23'))).toHaveAttribute('data-armed', 'true')
    await drag(page, { x: 550, y: ROW_Y }, { x: 800, y: ROW_Y })
    await typeName(page, 'Beta task')
    const doc = await readDocument(page)
    expect(doc.schedule.tasks).toHaveLength(2)
    const earlier = doc.schedule.tasks.find((t) => t.uid !== firstUid)!
    expect(dayNumber(earlier.start)).toBeLessThan(dayNumber(doc.schedule.tasks.find((t) => t.uid === firstUid)!.start))
    expect(doc.schedule.taskGroupMembers.find((m) => m.taskUid === earlier.uid)?.groupId).toBe(onlyRow[0]!.id)
    const shallow = (await figureBox(page, 'task-' + earlier.uid + '-plan'))!
    const deep = (await figureBox(page, 'task-' + firstUid + '-plan'))!
    expect(Math.abs(shallow.y - deep.y)).toBeGreaterThanOrEqual(Math.min(shallow.h, deep.h))
    const shallowIsHigher = shallow.y < deep.y
    expect(shallowIsHigher).toBe(doc.documentSettings.stackDirection === 'down')
  })

  await test.step('UC-001 extension 4a: a name wider than truncateUnits is cut on screen only (FR-002, S-35)', async () => {
    const longName = 'An intentionally long task name that runs well past the forty-eight unit cap'
    await page.locator('[data-figure="task-' + firstUid + '-label"]').dblclick()
    await settle(page)
    await page.keyboard.press('Control+A')
    await typeName(page, longName)
    const task = (await readDocument(page)).schedule.tasks.find((t) => t.uid === firstUid)!
    expect(task.name).toBe(longName)
    const drawn = (await page.locator('[data-figure="task-' + firstUid + '-label"]').textContent()) ?? ''
    expect(drawn.length).toBeLessThan(longName.length)
    expect(longName.startsWith(drawn.slice(0, 20))).toBe(true)
  })
})
