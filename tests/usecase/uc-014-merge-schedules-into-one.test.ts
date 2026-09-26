// Use-case test for UC-014 (merge several schedules into one), table T-334 row VT-1.
import { expect, test, type Page } from '@playwright/test'
import { VIEWPORT, dropFile, enableAgentApi, figureBox, icon, launch, openByDrop, press, readDocument, readSample, settle, specMismatch } from './uc-harness'

test.use({ viewport: VIEWPORT, locale: 'en-US' })

const ERP = 'sample-large-erp-program.ja.xml'
const EDITED_UID = 2
const REVIEW = '[data-role="Difference Review"]'

const mergeByDrop = async (page: Page): Promise<void> => {
  await dropFile(page, ERP, readSample(ERP))
  await page.click(icon('IC-72', '[data-role="Open Chooser"]'))
  await settle(page)
}

const answerReview = async (page: Page, id: 'IC-95' | 'IC-96' | 'IC-97'): Promise<void> => {
  await page.click(icon(id, REVIEW))
  await settle(page)
}

test('UC-014 merge several schedules into one (FR-022 T-032a MM-1 MM-2 MM-4, FR-056, OP-3 IC-72, U-61)', async ({ page }) => {
  test.setTimeout(120000)
  specMismatch('UC-014 step 5 / FR-022: after a merge answered with IC-95 no notice tells what was overwritten, kept or did not arrive')
  await launch(page)
  await enableAgentApi(page)
  await openByDrop(page, ERP, readSample(ERP))
  await press(page, 'IC-7')
  const originalName = (await readDocument(page)).schedule.tasks.find((t) => t.uid === EDITED_UID)!.name
  const plan = (await figureBox(page, 'task-' + EDITED_UID + '-plan'))!
  await page.mouse.dblclick(plan.x + Math.min(plan.w / 2, 20), plan.y + plan.h / 2)
  await settle(page)
  await page.keyboard.press('Control+A')
  await page.keyboard.type('Changed here')
  await page.keyboard.press('Enter')
  await page.keyboard.press('Escape')
  await settle(page)
  const taskCount = (await readDocument(page)).schedule.tasks.length

  await test.step('UC-014 step 1: the author opens a file and picks merge, not replace (OP-3, IC-72)', async () => {
    await mergeByDrop(page)
  })

  await test.step('UC-014 step 3: tasks that may correspond are gathered and the author is asked (FR-022, U-61)', async () => {
    await expect(page.locator(REVIEW)).toHaveCount(1)
    const row = page.locator(REVIEW + ' [data-uid="' + EDITED_UID + '"]')
    await expect(row.locator('[data-side="current"]')).toHaveText('Changed here')
    await expect(row.locator('[data-side="incoming"]')).toHaveText(originalName)
  })

  await test.step('UC-014 step 4: the author picks one of the offered answers (IC-95, MM-1)', async () => {
    await answerReview(page, 'IC-95')
    await expect(page.locator(REVIEW)).toHaveCount(0)
  })

  await test.step('UC-014 steps 2 and 5: the origin is recorded, the file is added in, and what happened is told (FR-056, T-032)', async () => {
    const doc = await readDocument(page)
    expect(doc.schedule.tasks.length).toBe(taskCount)
    expect(doc.schedule.tasks.find((t) => t.uid === EDITED_UID)!.name).toBe(originalName)
    const origins = doc.schedule['taskOrigins'] as Array<Record<string, unknown>>
    expect(origins.find((o) => o['taskUid'] === EDITED_UID)?.['sourceUid']).toBe(EDITED_UID)
    await expect.soft(page.locator('[data-role="Notification Area"]')).not.toHaveText('')
  })

  await test.step('UC-014 extension 4a: stopping the import leaves the document exactly as before (IC-97, MM-4)', async () => {
    await page.keyboard.press('Escape')
    const before = JSON.stringify((await readDocument(page)).schedule)
    await mergeByDrop(page)
    await answerReview(page, 'IC-97')
    expect(JSON.stringify((await readDocument(page)).schedule)).toBe(before)
  })

  await test.step('UC-014 extension 3a: tasks kept apart last time are not copied again when they arrive again (IC-96, MM-2)', async () => {
    await mergeByDrop(page)
    await answerReview(page, 'IC-96')
    const apart = (await readDocument(page)).schedule.tasks.length
    expect(apart).toBeGreaterThan(taskCount)
    await mergeByDrop(page)
    if (await page.locator(REVIEW).count()) await answerReview(page, 'IC-95')
    expect((await readDocument(page)).schedule.tasks.length).toBe(apart)
  })
})
