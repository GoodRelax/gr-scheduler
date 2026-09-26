// Use-case test for UC-008 (tell by annotations), table T-334 row VT-1.
import { expect, test, type Page } from '@playwright/test'
import { VIEWPORT, bandAt, dayAxis, dayNumber, drag, enableAgentApi, figureBox, launch, press, pressRowControl, readDocument, settle, specMismatch } from './uc-harness'

test.use({ viewport: VIEWPORT, locale: 'en-US' })

const ANCHOR = { x: 1300, y: 300 }
const RANGE_FROM = { x: 1400, y: 500 }
const RANGE_TO = { x: 1600, y: 650 }
const OFFSET = { dx: 60, dy: -40 }

const cornerRadius = async (page: Page, id: string): Promise<number> => Number(await page.locator('[data-figure="box-' + id + '"]').getAttribute('rx'))

test('UC-008 tell by annotations (FR-019, T-023b AR-5 AR-6, FR-097 PR-21, T-217, FR-016)', async ({ page }) => {
  specMismatch('UC-008 extension 4a / FR-019: hiding the bottom row of a highlight box makes its frame grow far below the range instead of shrinking to the rows still shown')
  await launch(page)
  await enableAgentApi(page)
  let commentId = ''
  let anchorRow: string | null = null

  await test.step('UC-008 step 1: place a comment box and decide what it points at (IC-35, AR-5)', async () => {
    anchorRow = await bandAt(page, ANCHOR.y)
    expect(anchorRow).not.toBeNull()
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

  await test.step('UC-008 step 2: the anchor is a date and a row id, and only the body offset is in screen pixels (FR-019, FR-016)', async () => {
    const body = (await figureBox(page, 'comment-' + commentId))!
    await drag(page, { x: body.x + body.w / 2, y: body.y + body.h / 2 }, { x: body.x + body.w / 2 + OFFSET.dx, y: body.y + body.h / 2 + OFFSET.dy })
    const box = (await readDocument(page)).schedule.commentBoxes[0]!
    expect(box.anchorGroupId).toBe(anchorRow)
    expect(box.bodyOffsetPx).toEqual(OFFSET)
    await press(page, 'IC-13')
    const leader = (await figureBox(page, 'comment-' + commentId + '-leader'))!
    expect(Math.abs(leader.w - OFFSET.dx)).toBeLessThanOrEqual(1)
    expect(Math.abs(leader.h + OFFSET.dy)).toBeLessThanOrEqual(1)
    await press(page, 'IC-12')
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
    await drag(page, RANGE_FROM, RANGE_TO)
    await page.keyboard.press('Escape')
    const boxes = (await readDocument(page)).schedule.highlightBoxes
    expect(boxes).toHaveLength(1)
    highlightId = boxes[0]!.id
  })

  await test.step('UC-008 step 4: the range is kept as dates and rows, and the corner radius does not follow the zoom (FR-019, T-217)', async () => {
    const axis = await dayAxis(page)
    const box = (await readDocument(page)).schedule.highlightBoxes[0]!
    expect(Math.abs(dayNumber(box.startDate) - axis.dayOf(RANGE_FROM.x))).toBeLessThanOrEqual(1)
    expect(Math.abs(dayNumber(box.endDate) - axis.dayOf(RANGE_TO.x))).toBeLessThanOrEqual(1)
    expect([box.topGroupId, box.bottomGroupId]).toEqual(rows)
    expect(await cornerRadius(page, highlightId)).toBe(box.cornerRadiusPx)
  })

  await test.step('UC-008 extension 4a: when a row inside the range is hidden, only the rows still shown are surrounded (FR-019)', async () => {
    const box = (await readDocument(page)).schedule.highlightBoxes[0]!
    const before = (await figureBox(page, 'box-' + highlightId))!
    await pressRowControl(page, box.bottomGroupId, 'IC-59')
    const after = (await figureBox(page, 'box-' + highlightId))!
    expect.soft(after.h).toBeLessThan(before.h)
  })

  await test.step('UC-008 extension 2a: when the pointed row is hidden, the comment box is hidden with it (FR-019)', async () => {
    await expect(page.locator('[data-figure="comment-' + commentId + '"]')).toHaveCount(1)
    await pressRowControl(page, anchorRow!, 'IC-59')
    await expect(page.locator('[data-figure="comment-' + commentId + '"]')).toHaveCount(0)
  })

  await test.step('UC-008 step 4 over zoom: the corner radius stays the same when the zoom changes (T-217)', async () => {
    const radius = (await readDocument(page)).schedule.highlightBoxes[0]!.cornerRadiusPx
    await press(page, 'IC-13')
    await press(page, 'IC-15')
    await expect(page.locator('[data-figure="box-' + highlightId + '"]')).toHaveCount(1)
    expect(await cornerRadius(page, highlightId)).toBe(radius)
  })
})
