// Use-case test for UC-013 (fix the schedule while consulting an AI), table T-334 row VT-1.
import { expect, test } from '@playwright/test'
import { VIEWPORT, enableAgentApi, icon, launch, press, readDocument, settle, specMismatch } from './uc-harness'

test.use({ viewport: VIEWPORT, locale: 'en-US' })

const TASK = 2
const ASK = 'Please mark the survey phase as moved'
const REASON = 'The author asked to mark the survey phase as moved'
const FIELD = '[data-role="Dialogue Field"]'

test('UC-013 fix the schedule while consulting an AI (FR-066 AG-11, DR-4 changeLog, AM-6 AM-7 AM-18, FR-031)', async ({ page }) => {
  specMismatch('UC-013 step 2 / FR-066 AG-11: a line typed in the Dialogue Field and sent with Enter is not returned by readDialogueMessages; step 4 / FR-066 DR-4: no change reason reaches changeLog (UC-013 defers its implementation)')
  await launch(page)

  await test.step('UC-013 step 1: the author turns the Agent API on and the dialogue field shows (IC-20, IC-18, FR-066)', async () => {
    await enableAgentApi(page)
    await expect(page.locator(icon('IC-18'))).toHaveAttribute('data-enabled', 'true')
    await expect(page.locator(FIELD + ' input')).toBeVisible()
  })

  await test.step('UC-013 step 2: the author says in the dialogue field what to fix (SK-19, AG-11)', async () => {
    await page.click(FIELD + ' input')
    await page.keyboard.type(ASK)
    await page.keyboard.press('Enter')
    await settle(page)
    const messages = await page.evaluate(() => JSON.stringify((window as any).grSchedulerAgentApi.readDialogueMessages()))
    expect.soft(messages).toContain(ASK)
  })

  let original = ''
  await test.step('UC-013 step 3: the AI reads the document and asks for a change (AM-3, AM-7, AM-18)', async () => {
    original = (await readDocument(page)).schedule.tasks.find((t) => t.uid === TASK)!.name
    const answer = await page.evaluate(
      ({ uid, reason }) => {
        const api = (window as any).grSchedulerAgentApi
        const written = api.applyCommands({ readStamp: api.readStamp(), commands: [{ kind: 'setTaskName', uid, name: 'Survey phase (moved)' }], explanation: reason })
        const posted = api.postDialogueMessage(reason)
        return { written, posted }
      },
      { uid: TASK, reason: REASON },
    )
    expect(answer.written.accepted).toBe(true)
    expect(answer.posted.accepted).toBe(true)
    await settle(page)
    await expect(page.locator(FIELD)).toContainText(REASON)
  })

  await test.step('UC-013 step 4: the change is applied and only its reason stays in the document (DR-4, AT-132)', async () => {
    const doc = await readDocument(page)
    expect(doc.schedule.tasks.find((t) => t.uid === TASK)!.name).toBe('Survey phase (moved)')
    expect.soft(doc.changeLog.map((entry) => entry['explanation'])).toContain(REASON)
  })

  await test.step('UC-013 extension 4a: the conversation itself is not saved (FR-066)', async () => {
    const saved = await page.evaluate(() => JSON.stringify((window as any).grSchedulerAgentApi.exportJson()))
    expect(saved).not.toContain(ASK)
  })

  await test.step('UC-013 step 5: the author looks at the result and takes it back (IC-5, FR-031)', async () => {
    await press(page, 'IC-5')
    expect((await readDocument(page)).schedule.tasks.find((t) => t.uid === TASK)!.name).toBe(original)
  })
})
