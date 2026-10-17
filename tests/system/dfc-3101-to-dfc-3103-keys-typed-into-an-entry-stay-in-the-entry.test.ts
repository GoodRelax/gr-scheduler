// DFC-3101..3103, IN-5a: a key typed into an entry reaches the entry and runs no shortcut of table T-036, on the shipped build.

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { expect, test, type Locator, type Page } from '@playwright/test'

import { answerConfirmation, enableAgentApi, launch, press, readDocument, settle, VIEWPORT } from '../use-case/uc-harness'

test.use({ viewport: VIEWPORT, locale: 'ja-JP' })

const PANEL = '[data-role="Properties Panel"]'

/** @purity non-pure */
async function openSmallSample(page: Page): Promise<void> {
  await launch(page)
  await enableAgentApi(page)
  const text = readFileSync(resolve('sample-schedule/sample-small-website-renewal.ja.xml'), 'utf8')
  await page.evaluate((text) => {
    ;(window as unknown as { __grsNextOpen: unknown }).__grsNextOpen = { name: 'small.xml', text }
  }, text)
  await press(page, 'IC-1')
  for (let i = 0; i < 3; i += 1) {
    if ((await page.locator('[data-role="Open Chooser"] [data-icon="IC-71"]').count()) > 0) await press(page, 'IC-71', '[data-role="Open Chooser"]')
    if ((await page.locator('[data-role="Confirmation"] [data-confirmation-answer="proceed"]').count()) > 0) await answerConfirmation(page, 'proceed')
  }
  await expect(page.locator('[data-role="Opened File Name"]'), 'premise: the small sample is open').toHaveText('small.xml')
}

/** @purity non-pure */
async function openTaskPanel(page: Page): Promise<void> {
  const uid = await page.evaluate(() => {
    const schedule = (window as any).grSchedulerAgentApi.readDocument().schedule
    const leaf = schedule.tasks.find(
      (one: any) => !one.milestone && !schedule.tasks.some((child: any) => child.parentTaskUid === one.uid) && schedule.assignments.some((seat: any) => seat.taskUid === one.uid),
    )
    ;(window as any).grSchedulerAgentApi.focusTask(leaf.uid)
    return leaf.uid as number
  })
  await settle(page)
  const plan = (await page.locator(`[data-figure="task-${String(uid)}-plan"]`).boundingBox())!
  await page.mouse.dblclick(plan.x + plan.width / 2, plan.y + plan.height / 2)
  await settle(page)
}

/** @purity non-pure */
async function zoomOf(page: Page): Promise<unknown> {
  return (await readDocument(page)).documentSettings['zoomX']
}

// WHY: '+' and '_' are typed with Shift on a US keyboard -- the same keystrokes as SK-16 and SK-16b.
/** @purity non-pure */
async function typeShiftedSigns(page: Page, entry: Locator): Promise<{ value: string; zoomBefore: unknown; zoomAfter: unknown }> {
  await entry.click()
  await entry.evaluate((element) => {
    const field = element as HTMLInputElement
    field.value = 'A'
    field.dispatchEvent(new Event('input', { bubbles: true }))
    field.setSelectionRange(1, 1)
  })
  const zoomBefore = await zoomOf(page)
  await page.keyboard.press('Shift+Equal')
  await page.keyboard.press('Shift+Minus')
  await page.waitForTimeout(300)
  return { value: await entry.inputValue(), zoomBefore, zoomAfter: await zoomOf(page) }
}

test.describe('IN-5a: what already holds on the shipped build', () => {
  test('every letter, digit and sign reaches the task name (PR-1) and the search word (SV-2)', async ({ page }) => {
    await openSmallSample(page)
    await openTaskPanel(page)
    const name = page.locator(`${PANEL} textarea[data-field-row="PR-1"]`)
    await name.click()
    await name.evaluate((element) => {
      ;(element as HTMLTextAreaElement).value = ''
    })
    const typed = 'abcdefghijklmnopqrstuvwxyz0123456789 -.,/'
    await page.keyboard.type(typed, { delay: 30 })
    await expect(name, 'PR-1 holds every typed key').toHaveValue(typed)
    await page.keyboard.press('Escape')
    await press(page, 'IC-117')
    const word = page.locator('[data-role="Search Panel"] input[data-field-row="SV-2"]')
    await word.click()
    await page.keyboard.type(typed, { delay: 30 })
    await expect(word, 'SV-2 holds every typed key').toHaveValue(typed)
    const signs = await typeShiftedSigns(page, word)
    expect(signs, 'SV-2 takes + and _ and the zoom stays (IN-5a, keys judged by where they go)').toEqual({ value: 'A+_', zoomBefore: signs.zoomBefore, zoomAfter: signs.zoomBefore })
  })
})

test.describe('IN-5a: the reds this sweep found (fixme until fixed)', () => {
  test.fixme('DFC-3101: "Tony" typed into the assignee filter (PR-16) does not replace the document', async ({ page }) => {
    await openSmallSample(page)
    await openTaskPanel(page)
    await page.locator('[data-assignee-field="PR-16"] > button[data-field-kind="choice"]').click()
    await settle(page)
    const filter = page.locator('[data-assignee-filter="PR-16"]')
    await filter.click()
    await page.keyboard.type('Tony', { delay: 400 })
    await expect(filter).toHaveValue('Tony')
    expect((await readDocument(page)).schedule.tasks.length, 'the open document stays').toBe(45)
  })

  test.fixme('DFC-3102: + and _ typed into an entry go into it and the time axis does not zoom (SK-16, SK-16b)', async ({ page }) => {
    await openSmallSample(page)
    await openTaskPanel(page)
    const seen: Record<string, string> = {}
    for (const row of ['PR-1', 'PR-2']) {
      const signs = await typeShiftedSigns(page, page.locator(`${PANEL} textarea[data-field-row="${row}"]`))
      seen[row] = `${signs.value} zoom ${String(signs.zoomBefore === signs.zoomAfter)}`
    }
    await page.keyboard.press('Escape')
    await page.mouse.click(960, 600)
    await page.keyboard.press('F2')
    await settle(page)
    const title = await typeShiftedSigns(page, page.locator('[data-role="Document Title"] input'))
    seen['U-27'] = `${title.value} zoom ${String(title.zoomBefore === title.zoomAfter)}`
    expect(seen).toEqual({ 'PR-1': 'A+_ zoom true', 'PR-2': 'A+_ zoom true', 'U-27': 'A+_ zoom true' })
  })

  test.fixme('DFC-3103: typing a date by keyboard tells no out-of-range notice before the date is complete (PR-4)', async ({ page }) => {
    await openSmallSample(page)
    await openTaskPanel(page)
    const start = page.locator(`${PANEL} input[data-field-row="PR-4"]`).first()
    await start.click({ position: { x: 8, y: 8 } })
    const notices: string[] = []
    for (const digit of '2027') {
      await page.keyboard.type(digit)
      await page.waitForTimeout(150)
      notices.push(await page.locator('[data-role="Notification Area"]').innerText())
    }
    expect(notices.filter((one) => one.trim() !== ''), 'no notice while the year is being typed').toEqual([])
  })
})
