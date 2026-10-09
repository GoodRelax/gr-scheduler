// Use-case test for UC-008 (tell by annotations), table T-334 row VT-1.
import { expect, test, type Page } from '@playwright/test'
import { DROP_STEPS, VIEWPORT, bandAt, dayAxis, dayNumber, drag, enableAgentApi, figureBox, launch, press, pressRowControl, readDocument, settle } from './uc-harness'

test.use({ viewport: VIEWPORT, locale: 'en-US' })

const ANCHOR_NEAR = { x: 1300, y: 300 }
const RANGE_FROM_NEAR = { x: 1400, y: 500 }
const RANGE_TO = { x: 1600, y: 650 }
const OFFSET = { dx: 60, dy: -40 }

// WHY: AR-5 and AR-6 act only where the press hits nothing; on a drawn bar the existing item wins
// (T-023b), so a fixed point breaks whenever the sample moves a bar under it (DFC-2132).
const bareSpotNear = (page: Page, near: { x: number; y: number }): Promise<{ x: number; y: number }> =>
  page.evaluate(({ x, y }) => {
    // WHY: the task group under the point is tried first; a bar can fill a whole task group, so nearby task groups follow.
    for (let row = 0; row < 30; row++) {
      for (const dy of [row * 10, -row * 10]) {
        for (let step = 0; step < 60; step++) {
          for (const dx of [step * 10, -step * 10]) {
            const hit = document.elementFromPoint(x + dx, y + dy)?.getAttribute('data-figure') ?? ''
            if (/^task-group-.*-band$/.test(hit)) return { x: x + dx, y: y + dy }
          }
        }
      }
    }
    throw new Error('no bare spot near ' + x + ',' + y)
  }, near)

const cornerRadius = async (page: Page, id: string): Promise<number> => Number(await page.locator('[data-figure="box-' + id + '"]').getAttribute('rx'))

test('UC-008 tell by annotations (FR-019, T-023b AR-5 AR-6, FR-097 PR-21, T-217, FR-016)', async ({ page }) => {
  await launch(page)
  await enableAgentApi(page)
  let commentId = ''
  const ANCHOR = await bareSpotNear(page, ANCHOR_NEAR)
  const RANGE_FROM = await bareSpotNear(page, RANGE_FROM_NEAR)
  let anchorTaskGroup: string | null = null

  await test.step('UC-008 step 1: place a comment box and decide what it points at (IC-35, AR-5)', async () => {
    anchorTaskGroup = await bandAt(page, ANCHOR.y)
    expect(anchorTaskGroup).not.toBeNull()
    const axis = await dayAxis(page)
    await press(page, 'IC-35')
    await page.mouse.click(ANCHOR.x, ANCHOR.y)
    await settle(page)
    await page.keyboard.press('Escape')
    await settle(page)
    const boxes = (await readDocument(page)).schedule.commentBoxes
    expect(boxes).toHaveLength(1)
    commentId = boxes[0]!.id
    expect(Math.abs(dayNumber(boxes[0]!.anchorDate) - axis.dayOf(ANCHOR.x))).toBeLessThanOrEqual(1)
  })

  await test.step('UC-008 step 2: the anchor is a date and a row id, only the body offset is in screen pixels, and the body carries the anchor (FR-019, T-023d)', async () => {
    const before = (await readDocument(page)).schedule.commentBoxes[0]!
    const body = (await figureBox(page, 'comment-' + commentId))!
    const band = (await figureBox(page, 'task-group-' + anchorTaskGroup + '-band'))!
    const axis = await dayAxis(page)
    const taskGroupUnderTheMovedAnchor = await bandAt(page, band.y + band.h / 2 + OFFSET.dy)
    await drag(page, { x: body.x + body.w / 2, y: body.y + body.h / 2 }, { x: body.x + body.w / 2 + OFFSET.dx, y: body.y + body.h / 2 + OFFSET.dy }, [], DROP_STEPS)
    const box = (await readDocument(page)).schedule.commentBoxes[0]!
    const moved = (await figureBox(page, 'comment-' + commentId))!
    expect(Math.abs(moved.x - body.x - OFFSET.dx)).toBeLessThanOrEqual(1)
    expect(Math.abs(moved.y - body.y - OFFSET.dy)).toBeLessThanOrEqual(1)
    expect(Math.abs(dayNumber(box.anchorDate) - axis.dayOf(axis.xOf(dayNumber(before.anchorDate)) + OFFSET.dx))).toBeLessThanOrEqual(1)
    expect(box.anchorGroupId).toBe(taskGroupUnderTheMovedAnchor)
    expect(Number.isFinite(box.bodyOffsetPx.dx) && Number.isFinite(box.bodyOffsetPx.dy)).toBe(true)
    await press(page, 'IC-13')
    expect((await readDocument(page)).schedule.commentBoxes[0]!.bodyOffsetPx).toEqual(box.bodyOffsetPx)
    await press(page, 'IC-12')
    anchorTaskGroup = box.anchorGroupId
  })

  await test.step('UC-008 extension 1a: the body text is typed and drawn inside the box (FR-097, MK-13, PR-21)', async () => {
    const body = (await figureBox(page, 'comment-' + commentId))!
    await page.mouse.dblclick(body.x + body.w / 2, body.y + body.h / 2)
    await settle(page)
    await expect(page.locator('[data-role="Properties Panel"] textarea[data-field-row="PR-21"]')).toBeFocused()
    await page.keyboard.type('Check with vendor')
    await page.keyboard.press('Enter')
    await settle(page)
    expect((await readDocument(page)).schedule.commentBoxes[0]!.text).toBe('Check with vendor')
    await expect(page.locator('[data-figure="comment-' + commentId + '-line-0"]')).toHaveText('Check with vendor')
    const frame = (await figureBox(page, 'comment-' + commentId))!
    const text = (await figureBox(page, 'comment-' + commentId + '-line-0'))!
    expect(text.x).toBeGreaterThanOrEqual(frame.x)
    expect(text.x + text.w).toBeLessThanOrEqual(frame.x + frame.w)
    await page.keyboard.press('Escape')
  })

  let highlightId = ''
  let rows: Array<string | null> = []
  await test.step('UC-008 step 3: surround the range to stress with a rounded rectangle (IC-36, AR-6)', async () => {
    rows = [await bandAt(page, RANGE_FROM.y), await bandAt(page, RANGE_TO.y)]
    await press(page, 'IC-36')
    await drag(page, RANGE_FROM, RANGE_TO, [], DROP_STEPS)
    await page.keyboard.press('Escape')
    const boxes = (await readDocument(page)).schedule.highlightBoxes
    expect(boxes).toHaveLength(1)
    highlightId = boxes[0]!.id
  })

  await test.step('UC-008 step 4: the range is kept as dates and task groups, and the corner radius does not follow the zoom (FR-019, T-217)', async () => {
    const axis = await dayAxis(page)
    const box = (await readDocument(page)).schedule.highlightBoxes[0]!
    expect(Math.abs(dayNumber(box.startDate) - axis.dayOf(RANGE_FROM.x))).toBeLessThanOrEqual(1)
    expect(Math.abs(dayNumber(box.endDate) - axis.dayOf(RANGE_TO.x))).toBeLessThanOrEqual(1)
    expect([box.topGroupId, box.bottomGroupId]).toEqual(rows)
    expect(await cornerRadius(page, highlightId)).toBe(box.cornerRadiusPx)
  })

  // WHY: measured while the box is drawn; extension 2a later hides the pointed task group, which in the
  // template is an ancestor of the range task groups, so the box is no longer drawn after it (DFC-2132).
  await test.step('UC-008 step 4 over zoom: the corner radius stays the same when the zoom changes (T-217)', async () => {
    const radius = (await readDocument(page)).schedule.highlightBoxes[0]!.cornerRadiusPx
    await press(page, 'IC-13')
    await press(page, 'IC-15')
    await expect(page.locator('[data-figure="box-' + highlightId + '"]')).toHaveCount(1)
    expect(await cornerRadius(page, highlightId)).toBe(radius)
    await press(page, 'IC-14')
    await press(page, 'IC-12')
  })

  await test.step('UC-008 extension 4a: when a task group inside the range is hidden, only the task groups still shown are surrounded (FR-019)', async () => {
    const box = (await readDocument(page)).schedule.highlightBoxes[0]!
    const before = (await figureBox(page, 'box-' + highlightId))!
    await pressRowControl(page, box.bottomGroupId, 'IC-59')
    const after = (await figureBox(page, 'box-' + highlightId))!
    expect.soft(after.h).toBeLessThan(before.h)
  })

  await test.step('UC-008 extension 2a: when the pointed task group is hidden, the comment box is hidden with it (FR-019)', async () => {
    await expect(page.locator('[data-figure="comment-' + commentId + '"]')).toHaveCount(1)
    await pressRowControl(page, anchorTaskGroup!, 'IC-59')
    await expect(page.locator('[data-figure="comment-' + commentId + '"]')).toHaveCount(0)
  })
})
