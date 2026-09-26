// Use-case test for UC-012 (let an AI agent edit), table T-334 row VT-1.
import { expect, test, type Page } from '@playwright/test'
import { VIEWPORT, icon, launch, press, readDocument, settle } from './uc-harness'

test.use({ viewport: VIEWPORT, locale: 'en-US' })

const TASK = 16
const call = <T>(page: Page, body: string, arg?: unknown): Promise<T> =>
  page.evaluate(
    ({ body, arg }) => {
      try {
        return { threw: false, value: new Function('api', 'arg', body)((window as any).grSchedulerAgentApi, arg) }
      } catch (error) {
        return { threw: true, value: String(error) }
      }
    },
    { body, arg },
  ) as Promise<T>

type Outcome = { threw: boolean; value: any }

test('UC-012 let an AI agent edit (FR-028, FR-064 T-035 AG-1 AG-2 AG-3 AG-4 AG-9a, FR-065, AM-1..AM-7)', async ({ page }) => {
  await launch(page)

  await test.step('UC-012 extension 1a: until a person turns it on, the Agent API is not exposed (FR-065)', async () => {
    expect(await page.evaluate(() => typeof (window as any).grSchedulerAgentApi)).toBe('undefined')
  })

  await test.step('UC-012 step 1: a person turns the Agent API on, and it shows as on (IC-20, FR-065)', async () => {
    await press(page, 'IC-20')
    expect(await page.evaluate(() => typeof (window as any).grSchedulerAgentApi)).toBe('object')
    await expect(page.locator(icon('IC-20'))).toHaveAttribute('data-pressed', 'true')
  })

  let stamp: Record<string, unknown> = {}
  await test.step('UC-012 step 2: the agent reads the version and checks it knows it (AM-1, AM-4, AG-1)', async () => {
    const version = await call<Outcome>(page, 'return api.agentApiVersion')
    expect(version.threw).toBe(false)
    expect(typeof version.value).toBe('number')
    stamp = (await call<Outcome>(page, 'return api.readStamp()')).value
    expect(Object.keys(stamp).sort()).toEqual(['fileSavedUtc', 'lastEditedBy', 'scheduleUpdatedUtc', 'settingsUpdatedUtc'])
  })

  let outcome: Outcome = { threw: false, value: null }
  await test.step('UC-012 step 3: the agent reads the document and asks for an edit (AM-3, AG-4, AM-7)', async () => {
    const frozen = await call<Outcome>(page, 'const d = api.readDocument(); try { d.schedule.tasks[0].name = "tampered" } catch (e) {} return api.readDocument().schedule.tasks[0].name !== "tampered"')
    expect(frozen.value).toBe(true)
    outcome = await call<Outcome>(page, 'return api.applyCommands({ readStamp: arg, commands: [{ kind: "setTaskName", uid: ' + TASK + ', name: "Renamed by agent" }] })', stamp)
  })

  await test.step('UC-012 step 4: GRS answers with a value, not an exception, and the edit is in the document (AM-7, FR-028)', async () => {
    expect(outcome.threw).toBe(false)
    expect(outcome.value.accepted).toBe(true)
    expect(outcome.value.stamp).not.toEqual(stamp)
    expect((await readDocument(page)).schedule.tasks.find((t) => t.uid === TASK)!.name).toBe('Renamed by agent')
    await settle(page)
    await expect(page.locator('[data-figure="task-' + TASK + '-label"]')).toHaveText(/^Renamed by agent/)
  })

  await test.step('UC-012 extension 3a: a refused request comes back as a structured refusal that can be retried as it is (AG-2, AG-3, AG-9a)', async () => {
    const before = JSON.stringify((await readDocument(page)).schedule)
    const stale = await call<Outcome>(page, 'return api.applyCommands({ readStamp: arg, commands: [{ kind: "setTaskName", uid: ' + TASK + ', name: "Stale write" }] })', stamp)
    expect(stale.threw).toBe(false)
    expect(stale.value.accepted).toBe(false)
    expect(stale.value.refusal.target).toBeTruthy()
    expect(stale.value.refusal.reason).toBeTruthy()
    expect(stale.value.refusal.stamp).toEqual((await call<Outcome>(page, 'return api.readStamp()')).value)
    expect(stale.value.refusal.document).toBeTruthy()
    expect(JSON.stringify((await readDocument(page)).schedule)).toBe(before)
    const mixed = await call<Outcome>(page, 'return api.applyCommands({ readStamp: arg, commands: [{ kind: "setTaskName", uid: ' + TASK + ', name: "Half" }, { kind: "setTaskName", uid: 987654, name: "Nobody" }] })', stale.value.refusal.stamp)
    expect(mixed.threw).toBe(false)
    expect(mixed.value.accepted).toBe(false)
    expect(JSON.stringify((await readDocument(page)).schedule)).toBe(before)
    const retried = await call<Outcome>(page, 'return api.applyCommands({ readStamp: arg, commands: [{ kind: "setTaskName", uid: ' + TASK + ', name: "Retried" }] })', stale.value.refusal.stamp)
    expect(retried.value.accepted).toBe(true)
    expect((await readDocument(page)).schedule.tasks.find((t) => t.uid === TASK)!.name).toBe('Retried')
  })
})
