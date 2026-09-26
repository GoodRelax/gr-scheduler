// Use-case test for UC-004 (show dependencies between tasks), table T-334 row VT-1.
import { expect, test, type Page } from '@playwright/test'
import { VIEWPORT, answerConfirmation, drag, enableAgentApi, figureBox, icon, launch, press, readDocument, settle, specMismatch, type Box } from './uc-harness'

test.use({ viewport: VIEWPORT, locale: 'en-US' })

const ROW_Y = 83
const PANEL = '[data-role="Properties Panel"] '

const makeTask = async (page: Page, x1: number, x2: number, name: string): Promise<void> => {
  await drag(page, { x: x1, y: ROW_Y }, { x: x2, y: ROW_Y })
  await page.keyboard.type(name)
  await page.keyboard.press('Enter')
  await settle(page)
}

const half = (box: Box, side: 'left' | 'right'): { x: number; y: number } => ({ x: box.x + box.w * (side === 'left' ? 0.2 : 0.8), y: box.y + box.h / 2 })

const pointsOf = async (page: Page, figure: string): Promise<number[][]> => {
  const raw = (await page.locator('[data-figure="' + figure + '"]').first().getAttribute('points')) ?? ''
  return raw.trim().split(/\s+/).map((pair) => pair.split(',').map(Number))
}

test('UC-004 show dependencies between tasks (FR-009 T-018 DP-1 DP-3, T-018a, T-023b, S-201)', async ({ page }) => {
  specMismatch('UC-004 step 5 / FR-009 T-018: the panel of a selected dependency offers linkType as an editable number instead of the FS/SF/FF/SS abbreviation')
  await launch(page)
  await enableAgentApi(page)
  await press(page, 'IC-106')
  await answerConfirmation(page, 'proceed')
  await press(page, 'IC-23')
  await makeTask(page, 600, 750, 'A')
  await makeTask(page, 900, 1050, 'B')
  await makeTask(page, 1200, 1350, 'C')
  await press(page, 'IC-23')
  const [a, b, c] = (await readDocument(page)).schedule.tasks.map((t) => t.uid as number)
  const boxOf = async (uid: number): Promise<Box> => (await figureBox(page, 'task-' + uid + '-plan'))!

  await test.step('UC-004 step 1: arm the dependency line in the palette (IC-61, T-023b AR-4)', async () => {
    await press(page, 'IC-61')
    await expect(page.locator(icon('IC-61'))).toHaveAttribute('data-armed', 'true')
  })

  await test.step('UC-004 step 2: pull from the right side of the predecessor into the left side of the successor', async () => {
    await drag(page, half(await boxOf(a!), 'right'), half(await boxOf(b!), 'left'))
  })

  await test.step('UC-004 step 3: the kind comes from the two sides and the lag is the default (T-018 DP-1, T-213)', async () => {
    const doc = await readDocument(page)
    const links = doc.schedule.tasks.find((t) => t.uid === b)!.dependencies
    expect(links).toHaveLength(1)
    expect(links[0].predecessorUid).toBe(a)
    expect(links[0].linkType).toBe(1)
    expect(links[0].lag).toBe(doc.documentSettings.dependencyLagDefault)
  })

  await test.step('UC-004 step 4: the anchors follow the kind, and drawing can go on (T-018, T-018a)', async () => {
    const from = await boxOf(a!)
    const to = await boxOf(b!)
    const route = await pointsOf(page, 'dep-' + a + '-' + b)
    expect(Math.abs(route[0]![0]! - (from.x + from.w))).toBeLessThan(2)
    expect(Math.abs(route[0]![1]! - (from.y + from.h / 2))).toBeLessThan(2)
    expect(Math.abs(route.at(-1)![0]! - to.x)).toBeLessThan(2)
    await expect(page.locator(icon('IC-61'))).toHaveAttribute('data-armed', 'true')
    await drag(page, half(await boxOf(b!), 'right'), half(await boxOf(c!), 'right'))
    const links = (await readDocument(page)).schedule.tasks.find((t) => t.uid === c)!.dependencies
    expect(links).toHaveLength(1)
    expect(links[0].linkType).toBe(0)
    const sameSide = await pointsOf(page, 'dep-' + b + '-' + c)
    const target = await boxOf(c!)
    expect(Math.abs(sameSide.at(-1)![0]! - (target.x + target.w))).toBeLessThan(2)
    expect(sameSide.length).toBeGreaterThanOrEqual(4)
  })

  await test.step('UC-004 extension 2b: Esc while pulling drops only the half-drawn arrow (T-028 IN-4)', async () => {
    const start = half(await boxOf(a!), 'right')
    await page.mouse.move(start.x, start.y)
    await page.mouse.down()
    await page.mouse.move(start.x + 200, start.y + 5, { steps: 6 })
    await page.keyboard.press('Escape')
    await page.mouse.up()
    await settle(page)
    const doc = await readDocument(page)
    expect(doc.schedule.tasks.reduce((n, t) => n + t.dependencies.length, 0)).toBe(2)
    await expect(page.locator(icon('IC-61'))).toHaveAttribute('data-armed', 'true')
  })

  await test.step('UC-004 step 5: disarm, then change the lag; the kind is shown by its abbreviation only (FR-009)', async () => {
    await page.keyboard.press('Escape')
    await settle(page)
    await expect(page.locator(icon('IC-61'))).toHaveAttribute('data-armed', 'false')
    const task = await boxOf(a!)
    await page.mouse.dblclick(task.x + task.w / 2, task.y + task.h / 2)
    await settle(page)
    await page.keyboard.press('Escape')
    const route = await pointsOf(page, 'dep-' + a + '-' + b)
    await page.mouse.click((route[0]![0]! + route[1]![0]!) / 2, (route[0]![1]! + route[1]![1]!) / 2)
    await settle(page)
    const selection = await page.evaluate(() => (window as any).grSchedulerAgentApi.readSelection())
    expect(selection.items[0].kind).toBe('dependency')
    await expect.soft(page.locator('[data-role="Properties Panel"]')).toContainText('FS')
    await expect.soft(page.locator(PANEL + 'input[data-field-row="AT-46"]')).toHaveCount(0)
    await page.fill(PANEL + 'input[data-field-row="AT-47"]', '2')
    await page.keyboard.press('Tab')
    await settle(page)
    const links = (await readDocument(page)).schedule.tasks.find((t) => t.uid === b)!.dependencies
    expect(links[0].lag).not.toBe(0)
    expect(links[0].linkType).toBe(1)
  })

  await test.step('UC-004 step 6: the route is drawn again from the same anchors (T-018a)', async () => {
    const from = await boxOf(a!)
    const to = await boxOf(b!)
    const route = await pointsOf(page, 'dep-' + a + '-' + b)
    expect(Math.abs(route[0]![0]! - (from.x + from.w))).toBeLessThan(2)
    expect(Math.abs(route.at(-1)![0]! - to.x)).toBeLessThan(2)
  })
})
