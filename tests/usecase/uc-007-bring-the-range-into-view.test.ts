// Use-case test for UC-007 (bring the wanted range into view), table T-334 row VT-1.
import { expect, test, type Page } from '@playwright/test'
import { VIEWPORT, bandAt, dayAxis, enableAgentApi, launch, openByDrop, press, pressRowControl, readDocument, readSample, rowSelector, settle } from './uc-harness'

test.use({ viewport: VIEWPORT, locale: 'en-US' })

const ERP = 'sample-large-erp-program.ja.xml'
const POINTER = { x: 1000, y: 500 }

const wheel = async (page: Page, dy: number, times: number, modifier?: 'Control' | 'Alt'): Promise<void> => {
  await page.mouse.move(POINTER.x, POINTER.y)
  for (let i = 0; i < times; i++) {
    if (modifier) await page.keyboard.down(modifier)
    await page.mouse.wheel(0, dy)
    if (modifier) await page.keyboard.up(modifier)
    await page.waitForTimeout(120)
  }
  await settle(page)
}

const tierNames = (page: Page): Promise<string[]> =>
  page.evaluate(() => [...new Set([...document.querySelectorAll('[data-figure^="ruler-"][data-figure*="-tick-"]')].map((e) => (e.getAttribute('data-figure') ?? '').split('-')[1]!))])

const deepestDrawnRow = (page: Page): Promise<number> =>
  page.evaluate(() => Math.max(...[...document.querySelectorAll('[data-role="Row Title Tree"] [data-group-id]')].map((r) => Number(r.getAttribute('data-depth')))))

const tickX = (page: Page, figure: string): Promise<number | null> =>
  page.evaluate((figure) => document.querySelector('[data-figure="' + figure + '"]')?.getBoundingClientRect().x ?? null, figure)

const firstMonthTick = (page: Page): Promise<string> =>
  page.evaluate(() => {
    const ticks = [...document.querySelectorAll('[data-figure^="ruler-"][data-figure*="-tick-"]')]
    const inside = ticks.find((e) => { const x = e.getBoundingClientRect().x; return x > 600 && x < 1400 })
    return inside?.getAttribute('data-figure') ?? ''
  })

const isAncestorOrSelf = (groups: Array<Record<string, any>>, ancestor: string, id: string | null): boolean => {
  for (let at = id; at; at = groups.find((g) => g.id === at)?.parentId ?? null) if (at === ancestor) return true
  return false
}

test('UC-007 bring the wanted range into view (MK-1 MK-2 MK-4 MK-7, FR-016, FR-017 S-83..S-85, FR-018 T-005a, FR-098, PTD-1 PTD-5)', async ({ page }) => {
  test.setTimeout(120000)
  await launch(page)
  await enableAgentApi(page)
  await openByDrop(page, ERP, readSample(ERP))
  await press(page, 'IC-7')
  const groups = (await readDocument(page)).schedule.taskGroups

  let before = { day: 0, row: '' as string | null, zoomX: 0 }
  await test.step('UC-007 step 1: put the pointer on the target and zoom with Ctrl and the wheel (MK-2)', async () => {
    const axis = await dayAxis(page)
    before = { day: axis.dayOf(POINTER.x), row: await bandAt(page, POINTER.y), zoomX: (await readDocument(page)).documentSettings.zoomX }
    expect(before.row).not.toBeNull()
    await wheel(page, -200, 1, 'Control')
  })

  await test.step('UC-007 step 2: the date and the row under the pointer stay put while the zoom changes (FR-016)', async () => {
    const doc = await readDocument(page)
    expect(doc.documentSettings.zoomX).not.toBe(before.zoomX)
    const axis = await dayAxis(page)
    expect(Math.abs(axis.dayOf(POINTER.x) - before.day)).toBeLessThanOrEqual(1)
    expect(isAncestorOrSelf(groups, before.row!, await bandAt(page, POINTER.y))).toBe(true)
  })

  await test.step('UC-007 step 3: the ruler tier follows the width of one day over the font ratio (FR-017, S-8, S-83, S-84, S-85)', async () => {
    const settings = (await readDocument(page)).documentSettings
    const seen = new Set<string>()
    for (let i = 0; i < 4; i++) {
      const axis = await dayAxis(page)
      const rulerFontPx = await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('[data-figure^="ruler-"][data-figure*="-label-"]')!).fontSize))
      const pxPerDay = (axis.xOf(1) - axis.xOf(0)) / (rulerFontPx / settings.fontMin)
      const tiers = await tierNames(page)
      if (pxPerDay >= settings.rulerTierPxPerDayDay) expect(tiers).toContain('day')
      else if (pxPerDay >= settings.rulerTierPxPerDayWeek) expect(tiers).toContain('week')
      else if (pxPerDay >= settings.rulerTierPxPerDayMonth) expect(tiers.some((t) => t.startsWith('month') || t === 'yearMonth')).toBe(true)
      for (const t of tiers) seen.add(t)
      await wheel(page, -200, 4, 'Control')
    }
    expect(seen.has('week')).toBe(true)
    expect(seen.has('day')).toBe(true)
  })

  await test.step('UC-007 step 4: the rows drawn follow the group LOD, and every task on a drawn row is drawn (FR-018, T-005a)', async () => {
    await press(page, 'IC-10')
    const shallow = await deepestDrawnRow(page)
    await wheel(page, -200, 8, 'Alt')
    const deep = await deepestDrawnRow(page)
    expect(deep).toBeGreaterThan(shallow)
    const doc = await readDocument(page)
    const axis = await dayAxis(page)
    const seenFrom = axis.dayOf(200)
    const seenTo = axis.dayOf(VIEWPORT.width - 20)
    const drawnRows = await page.evaluate(() =>
      [...document.querySelectorAll('[data-figure^="row-"][data-figure$="-band"]')]
        .filter((e) => { const r = e.getBoundingClientRect(); return r.y > 80 && r.y + r.height < 1060 })
        .map((e) => (e.getAttribute('data-figure') ?? '').slice(4, -5)),
    )
    expect(drawnRows.length).toBeGreaterThan(0)
    const dayOf = (iso: string) => Math.round(Date.parse(iso.slice(0, 10) + 'T00:00:00Z') / 86400000)
    let checked = 0
    for (const member of doc.schedule.taskGroupMembers.filter((m) => drawnRows.includes(m.groupId))) {
      const task = doc.schedule.tasks.find((t) => t.uid === member.taskUid)!
      if (dayOf(task.finish) < seenFrom || dayOf(task.start) > seenTo) continue
      await expect(page.locator('[data-figure="task-' + task.uid + '-plan"]')).toHaveCount(1)
      checked++
    }
    expect(checked).toBeGreaterThan(0)
    await wheel(page, 200, 8, 'Alt')
    expect(await deepestDrawnRow(page)).toBeLessThanOrEqual(deep)
  })

  await test.step('UC-007 step 5: Ctrl drag and middle-button drag move the view one to one (MK-7, PTD-1)', async () => {
    const tick = await firstMonthTick(page)
    const x0 = (await tickX(page, tick))!
    await page.keyboard.down('Control')
    await page.mouse.move(900, 600)
    await page.mouse.down()
    await page.mouse.move(1020, 600, { steps: 8 })
    await page.mouse.up()
    await page.keyboard.up('Control')
    await settle(page)
    expect(Math.abs((await tickX(page, tick))! - (x0 + 120))).toBeLessThanOrEqual(1)
    await page.mouse.move(900, 600)
    await page.mouse.down({ button: 'middle' })
    await page.mouse.move(820, 600, { steps: 8 })
    await page.mouse.up({ button: 'middle' })
    await settle(page)
    expect(Math.abs((await tickX(page, tick))! - (x0 + 40))).toBeLessThanOrEqual(1)
  })

  await test.step('UC-007 step 6: a pinned row stays drawn while scrolling down (FR-098, IC-60)', async () => {
    await press(page, 'IC-10')
    const target = groups.find((g) => g.parentId === null)!.id
    await pressRowControl(page, target, 'IC-60')
    expect((await readDocument(page)).documentSettings.pinnedGroupIds).toContain(target)
    await wheel(page, 400, 10)
    const row = page.locator(rowSelector(target))
    await expect(row).toHaveCount(1)
    await expect(row).toHaveAttribute('data-pinned', 'true')
    const box = (await row.boundingBox())!
    expect(box.y).toBeGreaterThanOrEqual(0)
    expect(box.y + box.height).toBeLessThanOrEqual(VIEWPORT.height)
  })

  await test.step('UC-007 extension 1a: the wheel without a modifier scrolls and does not zoom (MK-1)', async () => {
    const zoom = (await readDocument(page)).documentSettings
    await wheel(page, -300, 2)
    const now = (await readDocument(page)).documentSettings
    expect([now.zoomX, now.zoomY]).toEqual([zoom.zoomX, zoom.zoomY])
  })

  await test.step('UC-007 extension 5a: a plain drag on empty ground starts a range selection and does not pan (PTD-5, ZO-6)', async () => {
    const tick = await firstMonthTick(page)
    const x0 = (await tickX(page, tick))!
    await page.mouse.move(1500, 1040)
    await page.mouse.down()
    await page.mouse.move(1650, 1050, { steps: 8 })
    await page.mouse.up()
    await settle(page)
    expect(Math.abs((await tickX(page, tick))! - x0)).toBeLessThanOrEqual(1)
  })
})
