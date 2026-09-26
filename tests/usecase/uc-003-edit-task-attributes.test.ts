// Use-case test for UC-003 (edit the attributes of a task), table T-334 row VT-1.
import { expect, test, type Page } from '@playwright/test'
import { VIEWPORT, drag, enableAgentApi, figureBox, launch, press, readDocument, settle, type GrsDocument } from './uc-harness'

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

  await test.step('UC-003 step 2: the Properties Panel shows its attributes under English item names (FR-072, T-016, FR-038)', async () => {
    await expect(page.locator('[data-role="Properties Panel"]')).toHaveAttribute('data-showing', 'selection')
    const names = await page.locator(PANEL + '[data-field-row] > span:first-child').allTextContents()
    expect(names.length).toBeGreaterThan(5)
    for (const name of names) expect(name).toMatch(/^[\x20-\x7e]+$/)
    await expect(page.locator(PANEL + 'textarea[data-field-row="PR-1"]')).toHaveValue(taskOf(await readDocument(page)).name)
  })

  await test.step('UC-003 step 3: the author changes date, shape, colour, line weight and assignee (PR-3, SP-2, PR-12, PR-16)', async () => {
    const before = await readDocument(page)
    await page.fill(PANEL + 'input[data-field-row="PR-3"] >> nth=0', '2026-05-01')
    await commit(page)
    expect(taskOf(await readDocument(page)).start.slice(0, 10)).toBe('2026-05-01')
    await press(page, 'IC-24')
    expect(visualOf(await readDocument(page)).shapeKind).toBe('chevron')
    await page.click(PANEL + '[data-colour-palette="PR-12"] >> nth=0 >> [data-colour-choice="red"]')
    await settle(page)
    expect(visualOf(await readDocument(page)).strokeColor).toBe('red')
    await page.selectOption(PANEL + 'select[data-field-row="PR-12"]', 'thick')
    await commit(page)
    expect(visualOf(await readDocument(page)).lineWeight).toBe('thick')
    const other = before.schedule.resources.find((r) => !assigneesOf(before).includes(r.uid))!
    await page.selectOption(PANEL + 'select[data-field-row="PR-16"] >> nth=0', String(other.uid))
    await commit(page)
    expect(assigneesOf(await readDocument(page))).toContain(other.uid)
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
    await press(page, 'IC-16')
    const after = (await readDocument(page)).documentSettings
    expect(after.dateGridLinesVisible).toBe(!before.dateGridLinesVisible)
    expect(after.themePreference).not.toBe(before.themePreference)
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
    await page.click(PANEL + '[data-colour-palette="PR-12"] >> nth=0 >> [data-colour-choice="transparent"]')
    await settle(page)
    await page.click(PANEL + '[data-colour-palette="PR-12"] >> nth=1 >> [data-colour-choice="transparent"]')
    await settle(page)
    const visual = visualOf(await readDocument(page))
    expect(visual.strokeColor === 'transparent' && visual.fillColor === 'transparent').toBe(false)
    await expect(page.locator('[data-role="Notification Area"]')).not.toHaveText('')
  })

  await test.step('UC-003 extension 4a: moving the task on screen moves the dates in the panel (FR-006)', async () => {
    const plan = (await figureBox(page, 'task-' + TASK + '-plan'))!
    const startBefore = taskOf(await readDocument(page)).start
    await drag(page, { x: plan.x + plan.w / 2, y: plan.y + plan.h / 2 }, { x: plan.x + plan.w / 2 + 60, y: plan.y + plan.h / 2 })
    const startAfter = taskOf(await readDocument(page)).start
    expect(startAfter).not.toBe(startBefore)
    await expect(page.locator(PANEL + 'input[data-field-row="PR-3"] >> nth=0')).toHaveValue(startAfter.slice(0, 10))
  })
})
