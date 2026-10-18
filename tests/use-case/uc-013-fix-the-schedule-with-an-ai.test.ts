// Use-case test for UC-013 (fix the schedule while consulting an AI), table T-334 row VT-1.
import { expect, test } from '@playwright/test'
import { VIEWPORT, enableAgentApi, launch, press, readDocument, settle } from './uc-harness'

test.use({ viewport: VIEWPORT, locale: 'en-US' })

const TASK = 2
const REASON = 'The author asked to mark the survey phase as moved'

test('UC-013 fix the schedule while consulting an AI: the AI changes the document, only its reason stays, the author takes it back (DR-4 changeLog, AM-3 AM-7, FR-031)', async ({ page }) => {
  await launch(page)

  await test.step('UC-013 step 1: the author turns the Agent API on (IC-20)', async () => {
    await enableAgentApi(page)
  })

  let original = ''
  await test.step('UC-013 step 3: the AI reads the document and asks for a change (AM-3, AM-7)', async () => {
    original = (await readDocument(page)).schedule.tasks.find((t) => t.uid === TASK)!.name
    const answer = await page.evaluate(
      ({ uid, reason }) => {
        const api = (window as any).grSchedulerAgentApi
        return api.applyCommands({ expectedStamp: api.readStamp(), commands: [{ kind: 'setTaskName', taskUid: uid, name: 'Survey phase (moved)' }], explanation: reason })
      },
      { uid: TASK, reason: REASON },
    )
    expect(answer.ok).toBe(true)
    await settle(page)
  })

  await test.step('UC-013 step 4: the change is applied and only its reason stays in the document (DR-4, AT-132)', async () => {
    const doc = await readDocument(page)
    expect(doc.schedule.tasks.find((t) => t.uid === TASK)!.name).toBe('Survey phase (moved)')
    expect.soft(doc.changeLog.map((entry) => entry['explanation'])).toContain(REASON)
  })

  await test.step('UC-013 step 5: the author looks at the result and takes it back (IC-5, FR-031)', async () => {
    await press(page, 'IC-5')
    expect((await readDocument(page)).schedule.tasks.find((t) => t.uid === TASK)!.name).toBe(original)
  })
})
