// CR-783, CR-784, CR-786, CR-787, CR-788, CR-789 on the shipped build: the real-app steps of docs/review/user-checklist-2026-10-17.md.

import { expect, test, type Page } from '@playwright/test'

import { answerConfirmation, enableAgentApi, launch, press, readDocument, settle, VIEWPORT, type Box } from '../use-case/uc-harness'

// WHY: the probes of the checklist were measured at the harness screen; CR-783 keeps the screen of its own steps.
test.use({ viewport: VIEWPORT, locale: 'ja-JP' })

type Point = { x: number; y: number }

/** @purity non-pure */
async function frame(page: Page): Promise<void> {
  await page.evaluate(() => new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => done()))))
}

/** @purity non-pure */
async function boxOf(page: Page, selector: string): Promise<Box | null> {
  return page.evaluate((selector) => {
    const element = document.querySelector(selector)
    if (!element) return null
    const r = element.getBoundingClientRect()
    return { x: r.x, y: r.y, w: r.width, h: r.height }
  }, selector)
}

const middle = (box: Box): Point => ({ x: box.x + box.w / 2, y: box.y + box.h / 2 })

// WHY: a press as a hand makes it; several entries act on pointerdown, which element.click() never sends.
/** @purity non-pure */
async function pressAt(page: Page, at: Point): Promise<void> {
  await page.mouse.move(at.x, at.y)
  await page.mouse.down()
  await page.mouse.up()
  await settle(page)
}

/** @purity non-pure */
async function pull(page: Page, from: Point, to: Point, steps = 6): Promise<void> {
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  for (let i = 1; i <= steps; i += 1) await page.mouse.move(from.x + ((to.x - from.x) * i) / steps, from.y + ((to.y - from.y) * i) / steps)
  await page.mouse.up()
  await settle(page)
}

/** @purity non-pure */
async function isArmed(page: Page, id: string): Promise<boolean> {
  return (await page.getAttribute(`[data-icon="${id}"]`, 'data-armed')) === 'true'
}

/** @purity non-pure */
async function panelWidth(page: Page): Promise<{ width: number; left: number; showing: string | null; sideScrolls: number }> {
  return page.evaluate(() => {
    const panel = document.querySelector('[data-role="Properties Panel"]') as HTMLElement
    const r = panel.getBoundingClientRect()
    const sideScrolls = [panel, ...panel.querySelectorAll('*')].filter(
      (one) => one.scrollWidth > one.clientWidth + 1 && /auto|scroll/.test(getComputedStyle(one).overflowX),
    ).length
    return { width: r.width, left: r.x, showing: panel.getAttribute('data-showing'), sideScrolls }
  })
}

/** @purity non-pure */
async function openTaskPanel(page: Page, uid: number): Promise<void> {
  const plan = (await boxOf(page, `[data-figure="task-${String(uid)}-plan"]`))!
  const at = middle(plan)
  await page.mouse.dblclick(at.x, at.y)
  await settle(page)
}

test.describe('CR-783: a drag-created task snaps like a grabbed end (FR-103, table T-378)', () => {
  test.use({ viewport: { width: 1454, height: 709 } })

  test('CR-783 section 4: at the hour tier the press is the start and the release the end; Alt is one minute; below it is days', async ({ page }) => {
    await launch(page)
    await enableAgentApi(page)
    await press(page, 'IC-98')
    if ((await page.locator('[data-role="Confirmation"]').count()) > 0) await answerConfirmation(page, 'proceed')
    await press(page, 'IC-17')
    await page.click('[data-role="Properties Panel"] input[data-field-row="K-146"]')
    await settle(page)
    await page.click('[data-role="Properties Panel"] [data-icon="IC-52"]')
    await settle(page)
    expect((await readDocument(page)).documentSettings['isTimeOfDayVisible'], 'premise: the time of day is shown (K-146)').toBe(true)

    const hourTicks = (): Promise<Array<{ minute: number; x: number }>> =>
      page.evaluate(() =>
        [...document.querySelectorAll('[data-figure^="ruler-hour-tick-"]')]
          .map((e) => ({ minute: Number((e.getAttribute('data-figure') ?? '').split('-tick-')[1]), x: e.getBoundingClientRect().x }))
          .sort((a, b) => a.minute - b.minute),
      )
    for (let i = 0; i < 80; i += 1) {
      const ticks = await hourTicks()
      if (ticks.length > 2 && ticks[1]!.minute - ticks[0]!.minute === 60) break
      await press(page, 'IC-13')
    }
    const ticks = await hourTicks()
    expect(ticks[1]!.minute - ticks[0]!.minute, 'premise: the ruler shows the one-hour tier').toBe(60)
    const perMinute = (ticks[ticks.length - 1]!.x - ticks[0]!.x) / (ticks[ticks.length - 1]!.minute - ticks[0]!.minute)
    const xOf = (minute: number): number => ticks[0]!.x + (minute - ticks[0]!.minute) * perMinute
    const nine = Math.ceil(ticks[0]!.minute / 1440) * 1440 + 1440 + 9 * 60
    const at = (minute: number): string => new Date(minute * 60000).toISOString().slice(0, 19)
    const lastTask = async (): Promise<string> => {
      const tasks = (await readDocument(page)).schedule.tasks
      const last = tasks[tasks.length - 1]!
      return `${last.start.slice(0, 19)}..${last.finish.slice(0, 19)}`
    }
    const make = async (fromMinute: number, toMinute: number, y: number, withAlt: boolean): Promise<Array<[number, number]>> => {
      if (!(await isArmed(page, 'IC-23'))) await press(page, 'IC-23')
      await page.mouse.move(xOf(fromMinute), y)
      await page.mouse.down()
      for (let i = 1; i <= 8; i += 1) await page.mouse.move(xOf(fromMinute) + ((xOf(toMinute) - xOf(fromMinute)) * i) / 8, y)
      if (withAlt) {
        await page.keyboard.down('Alt')
        await page.mouse.move(xOf(toMinute) + 0.1, y)
      }
      const tentative = await page.evaluate(() =>
        [...document.querySelectorAll('[data-figure$="-plan"]')].map((e): [number, number] => {
          const r = e.getBoundingClientRect()
          return [Math.round(r.x), Math.round(r.right)]
        }),
      )
      await page.mouse.up()
      if (withAlt) await page.keyboard.up('Alt')
      await settle(page)
      await page.keyboard.press('Enter')
      await page.keyboard.press('Escape')
      await settle(page)
      return tentative
    }

    const tentative = await make(nine + 10, nine + 160, 200, false)
    expect(await lastTask(), 'step 1: 9:10 to 11:40 makes 9:00 to 12:00').toBe(`${at(nine)}..${at(nine + 180)}`)
    expect(tentative, 'step 1: the picture while pulling stands where the task is made').toEqual([[Math.round(xOf(nine)), Math.round(xOf(nine + 180))]])
    await make(nine + 10, nine + 160, 260, true)
    expect(await lastTask(), 'step 2: Alt before the release snaps to one minute').toBe(`${at(nine + 10)}..${at(nine + 160)}`)
    await make(nine + 160, nine + 10, 320, false)
    expect(await lastTask(), 'step 3: right to left swaps start and end and makes the same task').toBe(`${at(nine)}..${at(nine + 180)}`)

    for (let i = 0; i < 40 && (await page.locator('[data-figure^="ruler-hour-tick-"]').count()) > 0; i += 1) await press(page, 'IC-12')
    const days = await page.evaluate(() =>
      [...document.querySelectorAll('[data-figure^="ruler-day-tick-"]')]
        .map((e) => ({ day: Number((e.getAttribute('data-figure') ?? '').split('-tick-')[1]), x: e.getBoundingClientRect().x }))
        .sort((a, b) => a.day - b.day),
    )
    expect(days.length, 'premise: below the hour tier the ruler shows days').toBeGreaterThan(2)
    const perDay = (days[days.length - 1]!.x - days[0]!.x) / (days[days.length - 1]!.day - days[0]!.day)
    const xOfDay = (day: number): number => days[0]!.x + (day - days[0]!.day) * perDay
    const day = days[1]!.day
    if (!(await isArmed(page, 'IC-23'))) await press(page, 'IC-23')
    await pull(page, { x: xOfDay(day + 0.4), y: 380 }, { x: xOfDay(day + 2.6), y: 380 }, 8)
    await page.keyboard.press('Enter')
    await page.keyboard.press('Escape')
    await settle(page)
    const made = await lastTask()
    expect(made.slice(0, 10), 'step 4: below the hour tier the start is the pressed day').toBe(at(day * 1440).slice(0, 10))
    expect(made.slice(21, 31), 'step 4: below the hour tier the end is the released day').toBe(at((day + 2) * 1440).slice(0, 10))
    expect(made.slice(11, 16) !== '09:36' && made.slice(32, 37) !== '14:23', 'step 4: the times are whole days, not the pressed minutes').toBe(true)
  })
})

test.describe('CR-784: the in-progress progress marker is drawn as (->) (FR-013, PM-1)', () => {
  test('CR-784 section 4: the arrow on the canvas and in the search status column; a press goes done, interrupted, not started', async ({ page }) => {
    await launch(page)
    await enableAgentApi(page)
    const markerOf = (uid: number): Promise<string> =>
      page.evaluate((uid) => {
        return [...document.querySelectorAll(`[data-figure="task-${String(uid)}-marker"]`)]
          .map((e) => {
            if (e.tagName === 'line') return e.getAttribute('y1') === e.getAttribute('y2') ? 'bar' : 'stroke'
            if (e.tagName === 'path') return /^M [\d.]+ [\d.]+ H [\d.]+ M .* L .* L /.test(e.getAttribute('d') ?? '') ? 'arrow' : 'path'
            if (e.tagName === 'polyline') return e.getAttribute('points')!.split(' ').length === 3 ? 'check' : 'polyline'
            return e.tagName
          })
          .join(',')
      }, uid)
    const tasks = (await readDocument(page)).schedule.tasks
    const leaves = tasks.filter((one) => one.actualStart && !one.actualFinish && !one.resume && !tasks.some((child) => child.parentTaskUid === one.uid))
    let uid = -1
    for (const one of leaves) {
      if ((await markerOf(one.uid)).includes('arrow')) {
        uid = one.uid
        break
      }
    }
    expect(uid, 'step 1: an in-progress task with an actual draws the right arrow in its marker circle').toBeGreaterThan(0)

    const pressMarker = async (): Promise<void> => {
      // WHY: the right part of the marker; the dummy's grab area takes the left half (table T-267).
      const marker = (await boxOf(page, `[data-figure="task-${String(uid)}-marker"]`))!
      await pressAt(page, { x: marker.x + marker.w * 0.8, y: marker.y + marker.h / 2 })
    }
    await pressMarker()
    expect(await markerOf(uid), 'step 2: one press makes it done, drawn as a check').toBe('circle,check')
    await pressMarker()
    expect(await markerOf(uid), 'step 2: the next press makes it interrupted, a bar with no arrowhead').toBe('circle,bar')
    await page.keyboard.press('Control+z')
    await page.keyboard.press('Control+z')
    await settle(page)

    await press(page, 'IC-117')
    const glyph = await page.evaluate(() => {
      const rows = [...document.querySelectorAll('[data-role="Search Panel"] tr')]
      const row = rows.find((one) => (one as HTMLElement).innerText.includes('進行中'))
      return row?.querySelector('svg path')?.getAttribute('d') ?? null
    })
    expect(glyph, 'step 3: the search status column draws the same arrow for in progress').toMatch(/^M [\d.]+ [\d.]+ H [\d.]+ M .* L .* L /)
  })
})

test.describe('CR-786: overlapping boxes come to the front, and a snapped tip is searched where it stands (FR-019, ZO-9, SQ-9, SJ-6)', () => {
  /** @purity non-pure */
  async function placeCommentBox(page: Page, at: Point, text: string): Promise<void> {
    if (!(await isArmed(page, 'IC-35'))) await press(page, 'IC-35')
    await pressAt(page, at)
    await page.keyboard.type(text)
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
    await settle(page)
  }

  const selectedIds = async (page: Page): Promise<string[]> =>
    page.evaluate(() => (window as any).grSchedulerAgentApi.readSelection().items.map((one: { id: string }) => one.id))

  test('CR-786 #2: [Bring to Front] (PR-48 / PR-49) moves the box last, and a press on the overlap takes it', async ({ page }) => {
    await launch(page)
    await enableAgentApi(page)
    await placeCommentBox(page, { x: 700, y: 600 }, 'AAAAAAAAAA')
    await placeCommentBox(page, { x: 720, y: 606 }, 'BBBBBBBBBB')
    const [first, second] = (await readDocument(page)).schedule.commentBoxes
    const a = (await boxOf(page, `[data-figure="comment-${first!.id}"]`))!
    const b = (await boxOf(page, `[data-figure="comment-${second!.id}"]`))!
    const overlap = { x: (Math.max(a.x, b.x) + Math.min(a.x + a.w, b.x + b.w)) / 2, y: (Math.max(a.y, b.y) + Math.min(a.y + a.h, b.y + b.h)) / 2 }
    await pressAt(page, overlap)
    expect(await selectedIds(page), 'premise: the later comment box answers the overlap (ZO-9)').toEqual([second!.id])
    await pressAt(page, { x: a.x + 3, y: a.y + 3 })
    await page.click('[data-role="Properties Panel"] [data-field-row="PR-48"]')
    await settle(page)
    expect((await readDocument(page)).schedule.commentBoxes.map((one) => one.id), 'PR-48 moves the box to the end of the order').toEqual([second!.id, first!.id])
    await pressAt(page, overlap)
    expect(await selectedIds(page), 'the brought box now answers the overlap').toEqual([first!.id])
    await page.keyboard.press('Escape')
    await page.keyboard.press('Escape')
    await settle(page)

    const free = await page.evaluate(() => {
      const isBand = (x: number, y: number): boolean => /-band$/.test(document.elementFromPoint(x, y)?.getAttribute('data-figure') ?? '')
      for (let y = 300; y < 900; y += 10) for (let x = 400; x < 1300; x += 10) if (isBand(x, y) && isBand(x + 80, y + 40)) return { x, y }
      return null
    })
    expect(free, 'premise: an empty band to draw highlight boxes on').not.toBeNull()
    const drawHighlight = async (from: Point, to: Point): Promise<void> => {
      if (!(await isArmed(page, 'IC-36'))) await press(page, 'IC-36')
      await pull(page, from, to, 2)
      await page.keyboard.press('Escape')
      await settle(page)
    }
    await drawHighlight(free!, { x: free!.x + 120, y: free!.y + 60 })
    const one = (await readDocument(page)).schedule.highlightBoxes[0]!
    const c = (await boxOf(page, `[data-figure="box-${one.id}"]`))!
    const start = await page.evaluate((c) => {
      const isBand = (x: number, y: number): boolean => /-band$/.test(document.elementFromPoint(x, y)?.getAttribute('data-figure') ?? '')
      for (let x = c.x + c.w + 20; x < c.x + c.w + 120; x += 10) for (let y = c.y + 4; y < c.y + c.h; y += 10) if (isBand(x, y)) return { x, y }
      return null
    }, c)
    expect(start, 'premise: an empty band right of the first highlight box').not.toBeNull()
    await drawHighlight(start!, { x: c.x + 40, y: c.y + c.h + 30 })
    const boxes = (await readDocument(page)).schedule.highlightBoxes
    expect(boxes, 'premise: two highlight boxes').toHaveLength(2)
    // WHY: a highlight box answers a press only on its frame and its 8 grab points (GR-14), so its front is read from the paint order.
    const paintOrder = (): Promise<string[]> =>
      page.evaluate(() => [...document.querySelectorAll('[data-figure^="box-"]')].map((e) => e.getAttribute('data-figure') ?? '').filter((name) => /^box-[0-9a-f-]+$/.test(name)))
    expect(await paintOrder(), 'premise: the later highlight box is painted in front').toEqual([`box-${boxes[0]!.id}`, `box-${boxes[1]!.id}`])
    await page.mouse.dblclick(c.x + 1, c.y + c.h / 2)
    await settle(page)
    expect(await selectedIds(page), 'premise: a double-click on the frame selects the first highlight box and shows its panel').toEqual([boxes[0]!.id])
    await page.click('[data-role="Properties Panel"] [data-field-row="PR-49"]')
    await settle(page)
    expect((await readDocument(page)).schedule.highlightBoxes.map((box) => box.id), 'PR-49 moves the box to the end of the order').toEqual([boxes[1]!.id, boxes[0]!.id])
    expect(await paintOrder(), 'the brought highlight box is painted in front').toEqual([`box-${boxes[1]!.id}`, `box-${boxes[0]!.id}`])
  })

  test('CR-786 #3: a tip snapped to a task is searched and jumped to at the date where it stands (SQ-9, SJ-6)', async ({ page }) => {
    await launch(page)
    await enableAgentApi(page)
    // WHY: with the actual hidden the tip snaps to the plan, which a body pull moves alone (PE-1).
    await press(page, 'IC-9')
    const tasks = (await readDocument(page)).schedule.tasks
    let target: { uid: number; plan: Box } | null = null
    for (const one of tasks) {
      if (one.milestone || tasks.some((child) => child.parentTaskUid === one.uid)) continue
      const plan = await boxOf(page, `[data-figure="task-${String(one.uid)}-plan"]`)
      if (!plan || plan.x < 400 || plan.x > 1300 || plan.y < 200 || plan.y > 900 || plan.w < 40) continue
      const isFree = await page.evaluate(([x, y]) => /-band$/.test(document.elementFromPoint(x!, y!)?.getAttribute('data-figure') ?? ''), [plan.x - 40, plan.y - 30])
      if (isFree) {
        target = { uid: one.uid, plan }
        break
      }
    }
    expect(target, 'premise: a task with an empty band above-left of its plan').not.toBeNull()
    const { uid, plan } = target!
    await placeCommentBox(page, { x: plan.x - 40, y: plan.y - 30 }, 'SNAPME')
    await page.keyboard.press('Escape')
    await settle(page)
    const id = (await readDocument(page)).schedule.commentBoxes[0]!.id
    const body = (await boxOf(page, `[data-figure="comment-${id}"]`))!
    await pressAt(page, { x: body.x + 5, y: body.y + 5 })
    const handle = (await boxOf(page, `[data-figure="comment-${id}-handle"]`))!
    await pull(page, middle(handle), { x: plan.x + 2, y: plan.y + 2 })
    const snapped = (await readDocument(page)).schedule.commentBoxes[0]!
    expect([snapped.anchorTaskUid, snapped.anchorSnapPoint], 'premise: the tip snapped to the plan corner').toEqual([uid, 'topLeftCorner'])
    await page.keyboard.press('Escape')
    await settle(page)
    const moved = (await boxOf(page, `[data-figure="task-${String(uid)}-plan"]`))!
    await pull(page, middle(moved), { x: middle(moved).x + 80, y: middle(moved).y })
    const start = (await readDocument(page)).schedule.tasks.find((one) => one.uid === uid)!.start
    expect(start.slice(0, 10), 'premise: the task moved').not.toBe(plan && snapped.anchorDate.slice(0, 10))
    expect((await readDocument(page)).schedule.commentBoxes[0]!.anchorDate, 'premise: anchorDate stays where it was written').toBe(snapped.anchorDate)

    await press(page, 'IC-117')
    await page.click('[data-role="Search Panel"] [data-icon="IC-119"]')
    await settle(page)
    const row = page.locator('[data-role="Search Panel"] tr', { hasText: 'SNAPME' }).first()
    await expect(row, 'SQ-9: the date column is the date where the tip stands').toContainText(start.slice(0, 10).replaceAll('-', '/'))
    await row.click()
    await settle(page)
    const leader = (await boxOf(page, `[data-figure="comment-${id}-leader"]`))!
    const corner = (await boxOf(page, `[data-figure="task-${String(uid)}-plan"]`))!
    expect(Math.abs(leader.x - corner.x), 'SJ-6: after the jump the tip stands on the moved corner').toBeLessThanOrEqual(1)
    const area = (await boxOf(page, '[data-role="Schedule Canvas"]'))!
    const panel = (await boxOf(page, '[data-role="Task Group Panel"]'))!
    const areaMiddle = (panel.x + panel.w + area.x + area.w) / 2
    expect(Math.abs(leader.x - areaMiddle), 'SJ-6: the jump brings the tip date to the middle of the Task Group Area').toBeLessThan(40)
  })
})

test.describe('CR-787: the properties panel opens at a width per content (FR-052 S-171, S-602, S-603, S-604, K-145)', () => {
  test('CR-787 section 4: document settings at about 360 px, two-line zone list, task and comment box at about 240 px', async ({ page }) => {
    await launch(page)
    await enableAgentApi(page)
    await placeCommentBoxFor787(page)
    await press(page, 'IC-17')
    let shown = await panelWidth(page)
    expect(Math.abs(shown.width - 360), 'step 1: document settings open at about 360 px').toBeLessThanOrEqual(2)
    expect(shown.sideScrolls, 'step 1: no side scroll bar').toBe(0)
    const text = await page.locator('[data-role="Properties Panel"]').innerText()
    expect(text, 'step 1: the read-only heading').toContain('表示専用/変更不可')
    expect(text, 'step 3: the left edge row').toContain('日程表の左端の日時')
    expect(text, 'step 3: the top edge row').toMatch(/日程表の上端のタスクグループ\n.+（上から \d+%）/)
    expect(text, 'step 4: the first task start row').toMatch(/最初のタスクの開始日: \d{4}\/\d{2}\/\d{2}/)
    const label = await page.evaluate(() => {
      const panel = document.querySelector('[data-role="Properties Panel"]')!
      const span = [...panel.querySelectorAll('span')].find((one) => one.textContent === '遅延診断時に親タスクの進捗の疑義を許す日数')!
      return span.getBoundingClientRect().height / parseFloat(getComputedStyle(span).lineHeight)
    })
    expect(Math.round(label), 'step 1: the parent-doubt days name takes two lines').toBe(2)

    await page.locator('[data-two-line-choice="K-145:1"] button').first().click()
    await settle(page)
    await expect(page.locator('[data-two-line-choice="K-145:1"]'), 'step 2: the list shows offset and name on two lines').toContainText('UTC -07:00 MST山岳部標準時（米国・カナダ）')
    await page.locator('[data-two-line-choice="K-145:1"] div').getByText('山岳部標準時（米国・カナダ）', { exact: true }).first().click()
    await settle(page)
    expect((await readDocument(page)).documentSettings['displayTimeZones'], 'step 2: one press picks and closes').toEqual(['UTC-07:00'])
    expect(await page.locator('[data-two-line-choice="K-145:1"] > div').count(), 'step 2: the list closed').toBe(0)
    await page.locator('[data-two-line-choice="K-145:2"] button').first().click()
    await settle(page)
    await page.mouse.click(800, 500)
    await settle(page)
    expect(await page.locator('[data-two-line-choice="K-145:2"] > div').count(), 'step 2: a press outside closes').toBe(0)
    expect((await readDocument(page)).documentSettings['displayTimeZones'], 'step 2: a press outside picks nothing').toEqual(['UTC-07:00'])

    await openTaskPanel(page, 16)
    shown = await panelWidth(page)
    expect(Math.abs(shown.width - 240), 'step 5: a task opens at about 240 px').toBeLessThanOrEqual(2)
    await pull(page, { x: shown.left, y: 500 }, { x: shown.left - 61, y: 500 }, 8)
    expect(Math.abs((await panelWidth(page)).width - 300), 'step 5: the border pulled to about 300 px').toBeLessThanOrEqual(2)
    await openTaskPanel(page, 17)
    expect(Math.abs((await panelWidth(page)).width - 300), 'step 5: another task keeps 300 px').toBeLessThanOrEqual(2)
    const id = (await readDocument(page)).schedule.commentBoxes[0]!.id
    const body = (await boxOf(page, `[data-figure="comment-${id}"]`))!
    await page.mouse.dblclick(body.x + body.w / 2, body.y + body.h / 2)
    await settle(page)
    shown = await panelWidth(page)
    expect(Math.abs(shown.width - 240), 'step 5: a comment box goes back to about 240 px').toBeLessThanOrEqual(2)
    expect(body.x + body.w, 'step 5: the panel does not hide the box').toBeLessThan(shown.left)
    await page.keyboard.press('Escape')
    await settle(page)
    const name = (await page.locator('[data-role="Task Group Title Tree"] [data-group-id]').first().boundingBox())!
    await page.mouse.click(name.x + 60, name.y + name.height / 2)
    await settle(page)
    shown = await panelWidth(page)
    expect([Math.abs(shown.width - 240) <= 2, shown.sideScrolls], 'step 6: a task group at about 240 px, no side scroll bar').toEqual([true, 0])

    await press(page, 'IC-21')
    await press(page, 'IC-17')
    expect((await panelWidth(page)).sideScrolls, 'step 7: in English, no side scroll bar').toBe(0)
    await page.locator('[data-two-line-choice="K-145:1"] button').first().click()
    await settle(page)
    expect((await panelWidth(page)).sideScrolls, 'step 7: in English with the zone list open, no side scroll bar').toBe(0)
  })

  /** @purity non-pure */
  async function placeCommentBoxFor787(page: Page): Promise<void> {
    await press(page, 'IC-35')
    await pressAt(page, { x: 700, y: 600 })
    await page.keyboard.type('Box')
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
    await page.keyboard.press('Escape')
    await page.keyboard.press('Escape')
    await settle(page)
  }
})

test.describe('CR-788: the assignee field is a checkbox list and the first checked is the primary (AS-5, AS-13)', () => {
  const FIELD = '[data-assignee-field="PR-16"]'
  const LIST = '[data-assignee-list="PR-16"]'

  /** @purity non-pure */
  async function namesOf(page: Page, uid: number): Promise<string[]> {
    const schedule = (await readDocument(page)).schedule as unknown as {
      resources: Array<{ uid: number; name: string }>
      assignments: Array<{ taskUid: number; resourceUid: number }>
    }
    const named = new Map(schedule.resources.map((one) => [one.uid, one.name]))
    return schedule.assignments.filter((one) => one.taskUid === uid).map((one) => named.get(one.resourceUid) ?? '?')
  }

  // WHY: on the 1000-task start-up document a written check is drawn within about one second (measured
  // 150 / 500 ms: not yet; 1000 ms: drawn), so each press waits for the document before the next.
  /** @purity non-pure */
  async function pressInList(page: Page, selector: string, uid: number, count: number): Promise<void> {
    const at = (await page.locator(selector).boundingBox())!
    await page.mouse.move(at.x + at.width / 2, at.y + at.height / 2)
    await page.mouse.down()
    await page.mouse.up()
    await expect.poll(async () => (await namesOf(page, uid)).length, { timeout: 10_000 }).toBe(count)
  }

  test('CR-788 section 5: the list, add, uncheck all, primary first, one undo per person, label double-click, MSPDI round trip', async ({ page }) => {
    await launch(page)
    await enableAgentApi(page)
    await press(page, 'IC-79')
    await openTaskPanel(page, 16)
    await page.locator(`${FIELD} > button[data-field-kind="choice"]`).click()
    await settle(page)
    const icons = await page.evaluate((LIST) => [...document.querySelectorAll(`${LIST} [data-icon]`)].map((one) => one.getAttribute('data-icon')), LIST)
    expect(icons, 'step 2: check all, uncheck all, ascending, descending').toEqual(['IC-125', 'IC-126', 'IC-123', 'IC-124'])
    const checks = await page.evaluate((LIST) => [...document.querySelectorAll(`${LIST} [data-assignee-person] input`)].map((one) => (one as HTMLInputElement).checked), LIST)
    expect(checks.length, 'step 2: everyone on the assignee list is listed').toBeGreaterThan(10)
    expect(checks.filter(Boolean).length, 'step 2: only the seated person is checked').toBe(1)

    await page.click(`${LIST} input[data-assignee-filter]`)
    await page.keyboard.type('Zed', { delay: 60 })
    await expect(page.locator(`${LIST} [data-assignee-add]`), 'step 3: an unknown name offers to add it').toHaveText('“Zed” を追加')
    await pressInList(page, `${LIST} [data-assignee-add]`, 16, 2)
    expect(await namesOf(page, 16), 'step 3: the added person is made and seated').toEqual(['Analyst A', 'Zed'])

    // WHY: Backspace in the filter deletes the selected task instead (DFC-3100), so the filter is emptied as an input event.
    await page.evaluate((LIST) => {
      const filter = document.querySelector(`${LIST} input[data-assignee-filter]`) as HTMLInputElement
      filter.value = ''
      filter.dispatchEvent(new Event('input', { bubbles: true }))
    }, LIST)
    await settle(page)
    await pressInList(page, `${LIST} [data-icon="IC-126"]`, 16, 0)
    const uidOf = async (name: string): Promise<number> =>
      ((await readDocument(page)).schedule as unknown as { resources: Array<{ uid: number; name: string }> }).resources.find((one) => one.name === name)!.uid
    await pressInList(page, `${LIST} [data-assignee-person="${String(await uidOf('Writer A'))}"]`, 16, 1)
    await pressInList(page, `${LIST} [data-assignee-person="${String(await uidOf('Analyst B'))}"]`, 16, 2)
    expect(await namesOf(page, 16), 'step 4: the first checked is the primary').toEqual(['Writer A', 'Analyst B'])
    await expect(page.locator(`${FIELD} > button[data-field-kind="choice"]`), 'step 4: the field shows the primary and the mark').toContainText('Writer A, …')
    await expect(page.locator('[data-figure="task-16-oc2-label"]'), 'step 4: the assignee label shows the primary and the mark').toHaveText('Writer A, …')

    await page.mouse.click(1000, 14)
    await page.keyboard.press('Control+z')
    await expect.poll(() => namesOf(page, 16), { timeout: 10_000, message: 'step 5: one undo takes one person back' }).toEqual(['Writer A'])
    await page.keyboard.press('Control+y')
    await expect.poll(() => namesOf(page, 16), { timeout: 10_000 }).toEqual(['Writer A', 'Analyst B'])
    await page.keyboard.press('Escape')
    await settle(page)

    const label = (await boxOf(page, '[data-figure="task-16-oc2-label"]'))!
    await page.mouse.dblclick(label.x + label.w / 2, label.y + label.h / 2)
    await expect(page.locator(LIST), 'step 6: a label double-click opens the list').toHaveCount(1)
    await expect(page.locator(`${LIST} input[data-assignee-filter]`), 'step 6: the filter has the focus').toBeFocused()
    await page.keyboard.press('Escape')

    const written = await page.evaluate(() => (window as any).grSchedulerAgentApi.exportMspdi())
    expect(written.ok, 'premise: MSPDI is written').toBe(true)
    await page.evaluate((text) => {
      ;(window as unknown as { __grsNextOpen: unknown }).__grsNextOpen = { name: 'roundtrip.xml', text }
    }, written.value as string)
    await press(page, 'IC-1')
    for (let i = 0; i < 3; i += 1) {
      if ((await page.locator('[data-role="Open Chooser"] [data-icon="IC-71"]').count()) > 0) await press(page, 'IC-71', '[data-role="Open Chooser"]')
      if ((await page.locator('[data-role="Confirmation"] [data-confirmation-answer="proceed"]').count()) > 0) await answerConfirmation(page, 'proceed')
    }
    await expect(page.locator('[data-role="Opened File Name"]'), 'premise: the written file is open').toHaveText('roundtrip.xml')
    expect(await namesOf(page, 16), 'step 7: the primary is unchanged after MSPDI').toEqual(['Writer A', 'Analyst B'])
  })

  // WHY: fixme until DFC-3100 -- single keys (SK-14 P, SK-18 F, SK-25 N, y) and Backspace (SK-3) leave the filter.
  test.fixme('CR-788 section 5 step 3: every letter typed into the filter stays in the filter (DFC-3100)', async ({ page }) => {
    await launch(page)
    await enableAgentApi(page)
    await openTaskPanel(page, 16)
    await page.locator(`${FIELD} > button[data-field-kind="choice"]`).click()
    await settle(page)
    await page.click(`${LIST} input[data-assignee-filter]`)
    const before = (await readDocument(page)).documentSettings
    const count = (await readDocument(page)).schedule.tasks.length
    await page.keyboard.type('Developer fnpy', { delay: 40 })
    await expect(page.locator(`${LIST} input[data-assignee-filter]`)).toHaveValue('Developer fnpy')
    await page.keyboard.press('Backspace')
    await expect(page.locator(`${LIST} input[data-assignee-filter]`)).toHaveValue('Developer fnp')
    expect((await readDocument(page)).schedule.tasks, 'Backspace in the filter deletes no task').toHaveLength(count)
    expect((await readDocument(page)).documentSettings, 'typing in the filter changes no document setting').toEqual(before)
  })
})

test.describe('CR-789: a carried task group draws its cues in front and shows the drop as a ringed line (HF-15, S-620)', () => {
  test('CR-789 section 10: the copy is always shown, no control and no frame, the ring follows the depth, a folded parent takes the last child', async ({ page }) => {
    await launch(page)
    await enableAgentApi(page)
    const rowOf = (id: string): string => `[data-role="Task Group Title Tree"] [data-group-id="${id}"]`
    const groups = async (): Promise<Array<{ id: string; parentId: string | null; name: string; order: number; treeState: string }>> =>
      (await readDocument(page)).schedule.taskGroups as unknown as Array<{ id: string; parentId: string | null; name: string; order: number; treeState: string }>
    const look = (): Promise<{ copy: boolean; controls: number; frames: number; ring: number | null; lineX: number | null }> =>
      page.evaluate(() => {
        const tree = document.querySelector('[data-role="Task Group Title Tree"]')!
        const controls = [...tree.querySelectorAll('[data-role="Task Group Expander"], [data-role="Task Group Pin"], [data-icon]')].filter(
          (one) => getComputedStyle(one).visibility === 'visible' && one.getBoundingClientRect().width > 0,
        ).length
        const frames = [...tree.querySelectorAll('[data-group-id]')].filter((one) => {
          const style = getComputedStyle(one)
          return style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0
        }).length
        const ring = document.querySelector('[data-drop-ring]')
        const line = document.querySelector('[data-role="Task Group Drop Line"]')
        return {
          copy: document.querySelector('[data-role="Task Group Grab Copy"]') !== null,
          controls,
          frames,
          ring: ring ? Math.round(ring.getBoundingClientRect().x) : null,
          lineX: line ? Math.round(line.getBoundingClientRect().x) : null,
        }
      })
    const all = await groups()
    const signIn = all.find((one) => one.name === 'Phone Sign In')!
    const gates = all.find((one) => one.name === 'Phase Gates')!
    const settings = all.find((one) => one.name === 'Phone Settings Screen')!
    const pressRowEntry = async (id: string, entry: string): Promise<void> => {
      const row = page.locator(rowOf(id))
      await row.locator(':scope > span').first().hover()
      const at = await row.evaluate((element, entry) => {
        const found = [...element.querySelectorAll(`[data-icon="${entry}"]`)].find((one) => one.closest('[data-group-id]') === element)!
        const r = found.getBoundingClientRect()
        return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
      }, entry)
      await pressAt(page, at)
    }

    const grabOf = async (id: string): Promise<Point> => middle((await boxOf(page, `${rowOf(id)} [data-task-group-grab]`))!)
    const top = all.find((one) => one.parentId === null && one.order === 0)!
    const start = await grabOf(top.id)
    await page.evaluate(() => {
      ;(window as any).__rebuilds = 0
      new MutationObserver((records) => {
        if (records.some((one) => one.addedNodes.length > 0)) (window as any).__rebuilds += 1
      }).observe(document.querySelector('[data-role="Task Group Title Tree"]')!, { childList: true, subtree: true })
    })
    await page.mouse.move(start.x, start.y)
    await page.mouse.down()
    const missing = { copy: 0, controls: 0, frames: 0 }
    for (let y = start.y + 2; y < 650; y += 3) {
      await page.mouse.move(start.x + 40, y)
      await frame(page)
      const seen = await look()
      if (!seen.copy) missing.copy += 1
      if (seen.controls > 0) missing.controls += 1
      if (seen.frames > 0) missing.frames += 1
    }
    expect(missing, 'step 1: the copy is always shown and no row shows its controls or a frame').toEqual({ copy: 0, controls: 0, frames: 0 })
    expect(await page.evaluate(() => (window as any).__rebuilds), 'step 1: carrying redraws the task groups at most once').toBeLessThanOrEqual(1)
    let followed = false
    for (let y = 200; y < 1000 && !followed; y += 6) {
      const rings = new Set<number>()
      for (const x of [10, 50, 90, 130, 170]) {
        await page.mouse.move(x, y)
        await frame(page)
        const ring = (await look()).ring
        if (ring !== null) rings.add(ring)
      }
      followed = rings.size > 1
    }
    expect(followed, 'step 2: at some boundary the ring moves left and right with the depth').toBe(true)
    await page.keyboard.press('Escape')
    await page.mouse.up()
    await settle(page)
    const hovered = (await boxOf(page, `${rowOf(gates.id)} > span`))!
    await page.mouse.move(hovered.x + 20, hovered.y + hovered.h / 2)
    await frame(page)
    expect((await look()).controls, 'step 4: after Esc the controls show again on hover').toBeGreaterThan(0)

    await pressRowEntry(settings.id, 'IC-60')
    await pressRowEntry(signIn.id, 'IC-77')
    expect((await groups()).find((one) => one.id === signIn.id)!.treeState, 'premise: Phone Sign In is folded').toBe('collapsed')
    const folded = (await boxOf(page, rowOf(signIn.id)))!
    const grab = await grabOf(gates.id)
    await page.mouse.move(grab.x, grab.y)
    await page.mouse.down()
    for (let y = grab.y; y <= folded.y + folded.h; y += 4) {
      await page.mouse.move(grab.x + 30, y)
      await frame(page)
    }
    await page.mouse.move(20, folded.y + folded.h + 1)
    await frame(page)
    const shallow = await look()
    await page.mouse.move(140, folded.y + folded.h + 1)
    await frame(page)
    const deep = await look()
    expect(deep.lineX! > shallow.lineX! && deep.ring! > shallow.ring!, 'step 3: moving right under the folded row draws a deeper line and ring').toBe(true)
    expect(deep.frames, 'step 2: no frame, the pinned row included').toBe(0)
    await page.mouse.up()
    await settle(page)
    const after = await groups()
    const children = after.filter((one) => one.parentId === signIn.id).sort((a, b) => a.order - b.order)
    expect(children[children.length - 1]!.id, 'step 3: the carried task group is the last child').toBe(gates.id)
    expect(after.find((one) => one.id === signIn.id)!.treeState, 'step 3: the parent stays folded').toBe('collapsed')
  })
})
