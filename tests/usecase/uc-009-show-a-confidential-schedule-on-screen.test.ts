// Use-case test for UC-009 (show a confidential schedule on screen), table T-334 row VT-1.
import { expect, test, type Page } from '@playwright/test'
import { VIEWPORT, enableAgentApi, launch, openByDrop, press, readDocument, readSample, settle } from './uc-harness'

test.use({ viewport: VIEWPORT, locale: 'en-US' })

const ERP = 'sample-large-erp-program.ja.xml'
const DEFAULT_OPENER = 'user'
const DEFAULT_UNLOCK = 'goodrelax-scheduler'
const UNLOCK = '[data-role="Watermark Unlock"]'

const watermark = (page: Page) =>
  page.evaluate(() => {
    const g = document.querySelector('[data-role="Watermark"]')
    if (!g) return null
    const clipId = (g.getAttribute('clip-path') ?? '').match(/#([^)]+)/)?.[1]
    const clip = clipId ? document.getElementById(clipId)?.querySelector('rect') : null
    return {
      texts: [...g.querySelectorAll('text')].map((t) => t.textContent ?? ''),
      opacity: Number(g.getAttribute('opacity')),
      rotated: /rotate\(\s*-?\d/.test(g.outerHTML),
      clip: clip ? { x: Number(clip.getAttribute('x')), y: Number(clip.getAttribute('y')), w: Number(clip.getAttribute('width')), h: Number(clip.getAttribute('height')) } : null,
    }
  })

test('UC-009 show a confidential schedule on screen (FR-020 T-242 WM-6 WM-8 WM-10, S-99a, S-100, S-102, S-220, U-60)', async ({ page }) => {
  await launch(page)
  await enableAgentApi(page)

  await test.step('UC-009 step 1: the author opens the schedule (FR-087)', async () => {
    await openByDrop(page, ERP, readSample(ERP))
    expect((await readDocument(page)).schedule.tasks.length).toBeGreaterThan(100)
  })

  await test.step('UC-009 step 2: the opener and the run time are laid faint, slanted and repeated over the Row Area only (FR-020, WM-13, WM-14)', async () => {
    const mark = (await watermark(page))!
    expect(mark).not.toBeNull()
    expect(mark.texts.length).toBeGreaterThan(1)
    const stamp = mark.texts[0]!.match(/^(.+) (\d{4}-\d\d-\d\dT\d{2}:\d{2}:\d{2}Z)$/)
    expect(stamp).not.toBeNull()
    expect(stamp![1]).toBe(DEFAULT_OPENER)
    expect(Math.abs(Date.parse(stamp![2]!) - Date.now())).toBeLessThan(10 * 60 * 1000)
    expect(new Set(mark.texts).size).toBe(1)
    expect(mark.opacity).toBeLessThanOrEqual(0.3)
    expect(mark.rotated).toBe(true)
    const rows = (await page.locator('[data-role="Row Title Panel"]').boundingBox())!
    const ruler = (await page.locator('[data-figure="ruler-ground"]').boundingBox())!
    expect(mark.clip).not.toBeNull()
    expect(mark.clip!.x).toBeGreaterThanOrEqual(rows.x + rows.width - 8)
    expect(mark.clip!.y).toBeGreaterThanOrEqual(ruler.y + ruler.height - 1)
    const settings = (await readDocument(page)).documentSettings
    expect(Object.keys(settings).some((key) => key.toLowerCase().includes('watermark'))).toBe(false)
  })

  await test.step('UC-009 step 3: the author tries to take the watermark off (IC-41, WM-6, U-60)', async () => {
    await press(page, 'IC-41')
    await expect(page.locator(UNLOCK)).toHaveCount(1)
    await expect(page.locator(UNLOCK + ' input[type="password"]')).toHaveCount(1)
  })

  await test.step('UC-009 extension 4a: a wrong unlock password leaves the watermark on and says why (WM-8, RS-41)', async () => {
    await page.fill(UNLOCK + ' input[type="password"]', 'not-the-password')
    await page.click(UNLOCK + ' [data-confirmation-answer="proceed"]')
    await settle(page)
    await expect(page.locator(UNLOCK)).toHaveCount(1)
    expect((await watermark(page))?.texts.length ?? 0).toBeGreaterThan(1)
    await expect(page.locator('[data-role="Notification Area"]')).not.toHaveText('')
  })

  await test.step('UC-009 step 4: only the matching password removes it, and putting it back asks nothing (WM-8, WM-10)', async () => {
    await page.fill(UNLOCK + ' input[type="password"]', DEFAULT_UNLOCK)
    await page.click(UNLOCK + ' [data-confirmation-answer="proceed"]')
    await settle(page)
    await expect(page.locator(UNLOCK)).toHaveCount(0)
    expect((await watermark(page))?.texts.length ?? 0).toBe(0)
    await press(page, 'IC-41')
    await expect(page.locator(UNLOCK)).toHaveCount(0)
    expect((await watermark(page))?.texts.length ?? 0).toBeGreaterThan(1)
  })
})
