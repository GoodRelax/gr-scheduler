// Use-case test for UC-003 (edit the attributes of a task), table T-334 row VT-1.
import { expect, test, type Page } from '@playwright/test'
import { DROP_STEPS, VIEWPORT, drag, enableAgentApi, figureBox, launch, press, readDocument, settle, type GrsDocument } from './uc-harness'

test.use({ viewport: VIEWPORT, locale: 'en-US' })

const TASK = 16
const PANEL = '[data-role="Properties Panel"] '
const visualOf = (doc: GrsDocument) => doc.schedule.taskVisuals.find((v) => v.taskUid === TASK) ?? {}
const taskOf = (doc: GrsDocument) => doc.schedule.tasks.find((t) => t.uid === TASK)!
const assigneesOf = (doc: GrsDocument) => doc.schedule.assignments.filter((a) => a.taskUid === TASK).map((a) => a.resourceUid)
const commit = async (page: Page): Promise<void> => {
  await page.keyboard.press('Tab')
  await settle(page)
}

test('UC-003 edit the attributes of a task (FR-072, T-016, FR-083 SP-2, FR-007, FR-008, FR-049, FR-090, FR-039)', async ({ page }) => {
  // WHY: 12 s alone and 15 s in a whole run, all of it steps UC-003 names; a loaded GT-2 ran it past 30 s (DFC-2313).
  test.setTimeout(60000)
  await launch(page)
  await enableAgentApi(page)

  await test.step('UC-003 step 1: the author picks a task (MK-13)', async () => {
    const plan = (await figureBox(page, 'task-' + TASK + '-plan'))!
    await page.mouse.dblclick(plan.x + plan.w / 2, plan.y + plan.h / 2)
    await settle(page)
    const selection = await page.evaluate(() => (window as any).grSchedulerAgentApi.readSelection())
    expect(selection.items).toEqual([{ kind: 'task', uid: TASK }])
    await page.keyboard.press('Escape')
    await settle(page)
  })

  await test.step('UC-003 step 2: the Properties Panel shows its attributes under display-language item names, English here as the locale is en-US (FR-072, T-016, FR-038)', async () => {
    await expect(page.locator('[data-role="Properties Panel"]')).toHaveAttribute('data-showing', 'selection')
    const names = await page.locator(PANEL + ':not(button)[data-field-row] > span:first-child').allTextContents()
    expect(names.length).toBeGreaterThan(5)
    for (const name of names) expect(name).toMatch(/^[\x20-\x7e]+$/)
    await expect(page.locator(PANEL + 'textarea[data-field-row="PR-1"]')).toHaveValue(taskOf(await readDocument(page)).name)
  })

  await test.step('UC-003 step 3: the author changes date, shape, color, outline width and assignee (PR-3, SP-2, PR-39, PR-40, PR-16)', async () => {
    const before = await readDocument(page)
    await page.fill(PANEL + 'input[data-field-row="PR-3"] >> nth=0', '2026-05-01')
    await commit(page)
    expect(taskOf(await readDocument(page)).start.slice(0, 10)).toBe('2026-05-01')
    await press(page, 'IC-24')
    expect(visualOf(await readDocument(page)).shapeKind).toBe('chevron')
    await page.click(PANEL + '[data-color-palette="PR-39"] >> nth=0 >> [data-color-choice="red"]')
    await settle(page)
    expect(visualOf(await readDocument(page)).strokeColor).toBe('red')
    await page.fill(PANEL + 'input[data-field-row="PR-40"]', '3')
    await commit(page)
    expect(visualOf(await readDocument(page)).strokeWidthPx).toBe(3)
    const other = before.schedule.resources.find((r) => !assigneesOf(before).includes(r.uid))!
    await page.click(PANEL + 'input[data-field-row="PR-16"][data-field-combo] >> nth=-1')
    await page.click(PANEL + `[data-combo-list="PR-16"] [data-combo-item="candidate"][value="${other.uid}"] >> nth=0`)
    await settle(page)
    await expect.poll(async () => assigneesOf(await readDocument(page))).toContain(other.uid)
    // STEP: emptying the first line lets its person go (AS-3), so the new person is the only one
    await page.fill(PANEL + 'input[data-field-row="PR-16"][data-field-combo] >> nth=0', '')
    await settle(page)
    await expect.poll(async () => assigneesOf(await readDocument(page))).toEqual([other.uid])
  })

  await test.step('UC-003 step 4: the drawing follows and the assignee and percent labels obey the display settings (FR-049, FR-090, S-60, S-61)', async () => {
    const doc = await readDocument(page)
    const resource = doc.schedule.resources.find((r) => assigneesOf(doc).includes(r.uid))!
    const plan = (await figureBox(page, 'task-' + TASK + '-plan'))!
    expect(plan.w).toBeGreaterThan(0)
    const tag = page.locator('[data-figure="task-' + TASK + '-oc2-label"]')
    if (!doc.documentSettings.assigneeVisible) await press(page, 'IC-79')
    if (doc.documentSettings.percentCompleteVisible) await press(page, 'IC-80')
    await expect(tag).toHaveText(resource.name)
    await press(page, 'IC-80')
    await expect(tag).toHaveText(resource.name + ' : ' + String(taskOf(doc).percentComplete) + '%')
    await press(page, 'IC-79')
    await press(page, 'IC-80')
    await expect(tag).toHaveCount(0)
  })

  await test.step('UC-003 step 5: the author opens the display and format settings and sets toggles and theme (IC-17, IC-42, IC-16)', async () => {
    await press(page, 'IC-17')
    await expect(page.locator('[data-role="Properties Panel"]')).toHaveAttribute('data-showing', 'documentSettings')
    const before = (await readDocument(page)).documentSettings
    await press(page, 'IC-42')
    const after = (await readDocument(page)).documentSettings
    expect(after.dateGridLinesVisible).toBe(!before.dateGridLinesVisible)
    // WHY: FR-039 keeps the light/dark theme (S-72, table T-206) out of the document,
    // so IC-16 repaints the screen and leaves every saved setting as it was.
    const ground = await page.locator('[data-figure="ruler-ground"]').getAttribute('fill')
    await press(page, 'IC-16')
    const themed = (await readDocument(page)).documentSettings
    expect(await page.locator('[data-figure="ruler-ground"]').getAttribute('fill')).not.toBe(ground)
    expect(themed).toEqual(after)
    expect(Object.keys(themed)).not.toContain('themePreference')
  })

  await test.step('UC-003 step 6: the schedule is drawn again as set (FR-089, FR-039)', async () => {
    const settings = (await readDocument(page)).documentSettings
    const gridLines = await page.locator('[data-figure^="date-grid-"]').count()
    expect(gridLines > 0).toBe(settings.dateGridLinesVisible)
    const ground = await page.locator('[data-figure="ruler-ground"]').getAttribute('fill')
    await press(page, 'IC-16')
    expect(await page.locator('[data-figure="ruler-ground"]').getAttribute('fill')).not.toBe(ground)
  })

  await test.step('UC-003 extension 3a: stroke and fill cannot both be made transparent (FR-007)', async () => {
    const plan = (await figureBox(page, 'task-' + TASK + '-plan'))!
    await page.mouse.dblclick(plan.x + plan.w / 2, plan.y + plan.h / 2)
    await settle(page)
    await page.keyboard.press('Escape')
    await page.click(PANEL + '[data-color-palette="PR-39"] >> nth=0 >> [data-color-choice="transparent"]')
    await settle(page)
    await page.click(PANEL + '[data-color-palette="PR-12"] >> nth=0 >> [data-color-choice="transparent"]')
    await settle(page)
    const visual = visualOf(await readDocument(page))
    expect(visual.strokeColor === 'transparent' && visual.fillColor === 'transparent').toBe(false)
    await expect(page.locator('[data-role="Notification Area"]')).not.toHaveText('')
  })

  await test.step('UC-003 extension 4a: moving the task on screen moves the dates in the panel (FR-006)', async () => {
    const plan = (await figureBox(page, 'task-' + TASK + '-plan'))!
    const startBefore = taskOf(await readDocument(page)).start
    await drag(page, { x: plan.x + plan.w / 2, y: plan.y + plan.h / 2 }, { x: plan.x + plan.w / 2 + 60, y: plan.y + plan.h / 2 }, [], DROP_STEPS)
    // see FR-031, FR-103
    // WHY: the ends land on a weekend; no question is asked and the ends stay where they were dropped.
    await expect(page.locator('[data-role="Confirmation"]')).toHaveCount(0)
    await settle(page)
    const startAfter = taskOf(await readDocument(page)).start
    expect(startAfter).not.toBe(startBefore)
    await expect(page.locator(PANEL + 'input[data-field-row="PR-3"] >> nth=0')).toHaveValue(startAfter.slice(0, 10))
  })
})
