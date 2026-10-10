// CR-728 on the shipped build: a jump lands in the middle and marks its target (T-332 SJ-5, SJ-6, SJ-9, SJ-10; T-303 EL-17).

import { expect, test, type Browser, type Page } from '@playwright/test'
import { bare, specTable, unbroken } from '../contract/spec-table'
import { validateDocument } from '../fixtures/grs-document'
import { CLEARING_UP_MS, launchReferenceBrowser } from './live-app'
import { ERP_SAMPLE, HEAD_FOLD_EVERY_TASK_GROUP, keyOf, openDocument, openStage, pressEntrance, settle, type Stage } from './cr-570-tree-state-stage'
import { rowOf } from './sws-case'
import { readDocumentOf, taskGroupsDocument } from './w3-t1-stage'

const numberIn = (cell: string): number => Number(cell.replace(/`/g, '').match(/-?\d+(?:\.\d+)?/)?.[0])
const T206 = (id: string): number => numberIn(unbroken(rowOf(specTable('T-206'), id).by['既定'] ?? ''))
const S_554 = T206('S-554')
const S_555 = T206('S-555')
const S_556 = T206('S-556')
const S_558 = T206('S-558')
const S_428 = T206('S-428')

const T_103 = specTable('T-103')
const roleOf = (id: string): string => `[data-role="${bare(rowOf(T_103, id).cells[0] ?? '')}"]`
const SEARCH_PANEL = roleOf('U-64')
const PROPERTIES = roleOf('U-25')
const REPORT = roleOf('U-66')
const OPEN_SEARCH = keyOf('SK-24')
const DIAGNOSE = rowOf(specTable('T-109'), 'IC-107').id
const RING = '[data-role="Jump Landing Ring"]'
const RIPPLE = '[data-role="Jump Landing Ripple"]'
const WITHIN_A_PIXEL = 1
const TO_SEARCH_NAME = 'Task 25'

let browser: Browser | null = null

test.beforeAll(async () => {
  browser = await launchReferenceBrowser()
})

test.afterAll(async () => {
  test.setTimeout(CLEARING_UP_MS)
  await browser?.close()
})

interface Spot {
  readonly x: number
  readonly y: number
}

// WHY: task 30 hangs under task 25 and depends on task 18; task 35 depends on task 30. Forty one-task rows put task 25 mid-list.
/** @purity pure */
function documentText(): string {
  const base = JSON.parse(
    taskGroupsDocument({ rows: 40, parentTaskOf: { 30: 25 }, settings: { zoomX: 6, scrollDate: '2026-02-25T00:00:00' } }),
  ) as { schedule: { tasks: { dependencies: unknown[] }[] } }
  const link = (predecessorUid: number): unknown => ({ predecessorUid, linkType: 1, lag: null, lagFormat: null, carry: {}, carryElements: [] })
  base.schedule.tasks[29]!.dependencies = [link(18)]
  base.schedule.tasks[34]!.dependencies = [link(30)]
  expect(validateDocument(base).errors, 'the fixture is a document the schema accepts').toEqual([])
  return JSON.stringify(base)
}

/** @purity non-pure */
async function stage(): Promise<Stage> {
  if (browser === null) throw new Error('no browser')
  const opened = await openStage(browser)
  await openDocument(opened.page, 'cr-728-jumps.json', documentText())
  return opened
}

/** @purity non-pure */
async function pressAt(page: Page, at: Spot): Promise<void> {
  await page.mouse.move(at.x, at.y)
  await page.mouse.down()
  await page.mouse.up()
}

/** @purity non-pure */
async function openSearch(page: Page, word: string): Promise<void> {
  await page.keyboard.press(OPEN_SEARCH)
  await settle(page)
  await page.keyboard.type(word)
  await settle(page)
}

/** @purity semi-pure-b */
async function centreOf(page: Page, selector: string): Promise<Spot> {
  const found = await page.evaluate((wanted: string) => {
    const box = document.querySelector(wanted)?.getBoundingClientRect()
    return box === undefined ? null : { x: box.x + Math.min(box.width / 2, 40), y: box.y + box.height / 2 }
  }, selector)
  if (found === null) throw new Error(`${selector} is not on the screen`)
  return found
}

/** @purity semi-pure-b */
async function barCentre(page: Page, uid: number): Promise<Spot> {
  const at = await page.evaluate((wanted: number) => {
    const r = document.querySelector(`[data-figure="task-${String(wanted)}-plan"]`)?.getBoundingClientRect()
    return r === undefined ? null : { x: r.x + r.width / 2, y: r.y + r.height / 2 }
  }, uid)
  if (at === null) throw new Error(`task ${String(uid)} has no plan bar on the screen`)
  return at
}

// WHY: the press and the ripple's start are one happening; the ripple lasts S-557 x S-558, so it is looked for
// right after the release, before any settling wait.
/** @purity non-pure */
async function pressAndSeeRipple(page: Page, at: Spot): Promise<number> {
  await pressAt(page, at)
  try {
    await page.waitForSelector(RIPPLE, { state: 'attached', timeout: 900 })
  } catch {
    return 0
  }
  return page.locator(RIPPLE).count()
}

interface Reading {
  readonly ring: { readonly x: number; readonly y: number; readonly right: number; readonly bottom: number; readonly strokeWidth: number } | null
  readonly ringCount: number
  readonly plan: { readonly x: number; readonly y: number; readonly right: number; readonly bottom: number } | null
  readonly areaMiddleX: number
  readonly areaWidth: number
  readonly areaTop: number
  readonly areaHeight: number
}

// WHY: the Task Group Area is read off the drawing -- the ruler ground spans its width and ends at its top, and the
// ground clip spans its height.
/** @purity semi-pure-b */
async function readingOf(page: Page, uid: number): Promise<Reading> {
  return page.evaluate(
    (asked: { uid: number; ring: string }) => {
      const svg = document.querySelector('[data-role="Schedule Canvas"] svg')
      if (svg === null) throw new Error('no drawing')
      const rulerBox = svg.querySelector('[data-figure="ruler-ground"]')?.getBoundingClientRect()
      const clip = svg.querySelector('clipPath rect')
      if (rulerBox === undefined || clip === null) throw new Error('the drawing has no ruler ground or ground clip')
      const scale = rulerBox.width / Number(svg.querySelector('[data-figure="ruler-ground"]')?.getAttribute('width'))
      const planBox = svg.querySelector(`[data-figure="task-${String(asked.uid)}-plan"]`)?.getBoundingClientRect()
      const rings = svg.querySelectorAll(asked.ring)
      const ringBox = rings[0]?.getBoundingClientRect()
      return {
        ring:
          ringBox === undefined
            ? null
            : { x: ringBox.x, y: ringBox.y, right: ringBox.right, bottom: ringBox.bottom, strokeWidth: Number(rings[0]?.getAttribute('stroke-width')) * scale },
        ringCount: rings.length,
        plan: planBox === undefined ? null : { x: planBox.x, y: planBox.y, right: planBox.right, bottom: planBox.bottom },
        areaMiddleX: rulerBox.x + rulerBox.width / 2,
        areaWidth: rulerBox.width,
        areaTop: rulerBox.bottom,
        areaHeight: Number(clip.getAttribute('height')) * scale,
      }
    },
    { uid, ring: RING },
  )
}

interface Landing {
  readonly isFirstRows?: boolean
  readonly isWide?: boolean
}

// see SJ-5, SJ-6, SJ-10
/** @purity non-pure */
async function expectLanded(page: Page, uid: number, shape: Landing = {}): Promise<void> {
  const read = await readingOf(page, uid)
  expect(read.plan, `the plan figure of task ${String(uid)} is drawn`).not.toBeNull()
  expect(read.ringCount, 'SJ-10: one ring').toBe(1)
  const plan = read.plan!
  const ring = read.ring!
  const middleX = (plan.x + plan.right) / 2
  const middleY = (plan.y + plan.bottom) / 2
  if (shape.isWide !== true) {
    expect(Math.abs(middleX - read.areaMiddleX), `SJ-6: x ${String(middleX)} against ${String(read.areaMiddleX)}`).toBeLessThanOrEqual(WITHIN_A_PIXEL)
  }
  const wantedY = read.areaTop + read.areaHeight * S_554
  if (shape.isFirstRows === true) expect(middleY, 'SJ-5: stops at the first task group, so above the line').toBeLessThanOrEqual(wantedY + WITHIN_A_PIXEL)
  else expect(Math.abs(middleY - wantedY), `SJ-5: y ${String(middleY)} against ${String(wantedY)}`).toBeLessThanOrEqual(WITHIN_A_PIXEL)
  expect(ring.strokeWidth, 'S-556').toBeCloseTo(S_556, 1)
  const margin = (outer: number, inner: number): number => Math.abs(outer - inner)
  for (const gap of [margin(plan.x, ring.x), margin(plan.y, ring.y), margin(ring.right, plan.right), margin(ring.bottom, plan.bottom)]) {
    expect(gap, 'S-555 and the stroke: the ring stands outside the plan figure').toBeGreaterThanOrEqual(S_555)
    expect(gap).toBeLessThanOrEqual(S_555 + S_556 + WITHIN_A_PIXEL)
  }
}

/** @purity non-pure */
async function expectLandedOnTheChosen(page: Page): Promise<void> {
  const chosen = JSON.parse(await selectionText(page)) as { items?: { kind: string; uid?: number }[] }
  const uid = chosen.items?.[0]?.uid
  expect(uid, 'the target is a chosen task').toBeDefined()
  const read = await readingOf(page, uid!)
  expect(read.plan, 'the target is drawn').not.toBeNull()
  const settings = (await readDocumentOf(page)).documentSettings as { scrollGroupId: string | null; scrollGroupOffset: number }
  const groups = (await readDocumentOf(page)).schedule.taskGroups as { id: string; parentId: string | null; order: number }[]
  const first = groups.filter((one) => one.parentId === null).sort((a, b) => a.order - b.order)[0]
  await expectLanded(page, uid!, {
    isWide: read.plan!.right - read.plan!.x > read.areaWidth - 2 * S_428,
    isFirstRows: settings.scrollGroupOffset === 0 && settings.scrollGroupId === (first?.id ?? null),
  })
}

/** @purity semi-pure-b */
async function ringCount(page: Page): Promise<number> {
  return page.locator(RING).count()
}

/** @purity semi-pure-b */
async function selectionText(page: Page): Promise<string> {
  return page.evaluate(() => JSON.stringify((window as unknown as { grSchedulerAgentApi: { readSelection(): unknown } }).grSchedulerAgentApi.readSelection()))
}

/** @purity non-pure */
async function focusTask(page: Page, uid: number): Promise<unknown> {
  const answer = await page.evaluate((asked: number) => {
    const api = (window as unknown as { grSchedulerAgentApi: { focusTask(uid: number): unknown } }).grSchedulerAgentApi
    return api.focusTask(asked)
  }, uid)
  await settle(page)
  return answer
}

/** @purity non-pure */
async function emptyPlace(page: Page): Promise<Spot> {
  const read = await readingOf(page, 1)
  const view = page.viewportSize()
  if (view === null) throw new Error('no viewport')
  return { x: view.width - 60, y: read.areaTop + read.areaHeight - 40 }
}

/** @purity non-pure */
async function jumpFromSearch(page: Page): Promise<number> {
  await openSearch(page, TO_SEARCH_NAME)
  const seen = await ringCount(page)
  expect(seen, 'premise: no mark before the first jump').toBe(0)
  const target = await page.evaluate((panel: string) => {
    const row = document.querySelector(`${panel} tbody tr`)
    const uid = row?.querySelector('[data-search-task]')?.getAttribute('data-search-task') ?? null
    const heads = Array.from(document.querySelector(panel)?.querySelectorAll('thead th') ?? [])
    const index = heads.findIndex((one) => one.getAttribute('data-column') === 'SQ-1')
    const name = row?.children[index]
    if (uid === null || name === undefined) return null
    const box = name.getBoundingClientRect()
    return { uid: Number(uid), x: box.x + Math.min(box.width / 2, 40), y: box.y + box.height / 2 }
  }, SEARCH_PANEL)
  if (target === null) throw new Error('the Search Panel draws no SQ-1 cell in row 0')
  expect(await pressAndSeeRipple(page, { x: target.x, y: target.y }), 'SJ-10 ②: a ripple starts').toBeGreaterThan(0)
  await settle(page)
  return target.uid
}

test.describe('CR-728 -- SJ-1: a press on a name in the Search Panel', () => {
  test.setTimeout(180_000)

  test('lands the task in the middle across and S-554 down, marks it with the ring, and the ripple ends while the ring stays', async () => {
    const opened = await stage()
    try {
      const uid = await jumpFromSearch(opened.page)
      expect(uid, 'premise: the table lists the task asked for').toBe(25)
      await expectLanded(opened.page, uid)
      expect(await selectionText(opened.page), 'SJ-4: the target is chosen').toMatch(/\b25\b/)
      await opened.page.waitForTimeout(S_558 * 2 + 1500)
      expect(await opened.page.locator(RIPPLE).count(), 'SJ-10 ②: the ripple is gone once S-557 runs are done').toBe(0)
      expect(await ringCount(opened.page), 'SJ-10: the ring stays after the ripple').toBe(1)
    } finally {
      await opened.close()
    }
  })

  test('the ripple is still there after one run and not before it began', async () => {
    const opened = await stage()
    try {
      await openSearch(opened.page, TO_SEARCH_NAME)
      expect(await opened.page.locator(RIPPLE).count(), 'no ripple before the press').toBe(0)
      const spot = await centreOf(opened.page, `${SEARCH_PANEL} tbody tr [data-search-task]`)
      const seen = await pressAndSeeRipple(opened.page, spot)
      expect(seen, 'a ripple at the start').toBe(1)
      await opened.page.waitForTimeout(S_558 * 1.3)
      expect(await opened.page.locator(RIPPLE).count(), 'S-557 runs: still going after the first S-558').toBe(1)
    } finally {
      await opened.close()
    }
  })

  test('prefers-reduced-motion: reduce -- no ripple at any time, the ring is drawn', async () => {
    const opened = await stage()
    try {
      await opened.page.emulateMedia({ reducedMotion: 'reduce' })
      await openSearch(opened.page, TO_SEARCH_NAME)
      const spot = await centreOf(opened.page, `${SEARCH_PANEL} tbody tr [data-search-task]`)
      await pressAt(opened.page, spot)
      for (const wait of [30, 200, 400, 800]) {
        await opened.page.waitForTimeout(wait)
        expect(await opened.page.locator(RIPPLE).count(), `no ripple ${String(wait)} ms on`).toBe(0)
      }
      await settle(opened.page)
      await expectLanded(opened.page, 25)
    } finally {
      await opened.close()
    }
  })
})

test.describe('CR-728 -- EL-17: what keeps and what clears the mark of a jump', () => {
  test.setTimeout(180_000)

  test('a wheel, a zoom by the wheel, a pointer move and a modifier key keep the mark; a press clears it', async () => {
    const opened = await stage()
    try {
      await focusTask(opened.page, 25)
      expect(await ringCount(opened.page), 'premise: AM-16 marks').toBe(1)
      const place = await emptyPlace(opened.page)
      await opened.page.mouse.move(place.x, place.y)
      await opened.page.mouse.wheel(0, 120)
      await settle(opened.page)
      expect(await ringCount(opened.page), 'a wheel keeps it').toBe(1)
      await opened.page.keyboard.down('Control')
      await opened.page.mouse.wheel(0, -120)
      await opened.page.keyboard.up('Control')
      await settle(opened.page)
      expect(await ringCount(opened.page), 'a zoom keeps it').toBe(1)
      await opened.page.mouse.move(place.x - 300, place.y - 100, { steps: 5 })
      await opened.page.keyboard.down('Shift')
      await opened.page.keyboard.up('Shift')
      await settle(opened.page)
      expect(await ringCount(opened.page), 'a pointer move and a modifier-only key keep it').toBe(1)
      await pressAt(opened.page, place)
      await settle(opened.page)
      expect(await ringCount(opened.page), 'a press clears it').toBe(0)
    } finally {
      await opened.close()
    }
  })

  test('a key press clears the mark', async () => {
    const opened = await stage()
    try {
      await focusTask(opened.page, 25)
      expect(await ringCount(opened.page), 'premise: AM-16 marks').toBe(1)
      await opened.page.keyboard.press('q')
      await settle(opened.page)
      expect(await ringCount(opened.page), 'a key clears it').toBe(0)
    } finally {
      await opened.close()
    }
  })
})

test.describe('CR-728 -- SJ-9: the Agent API focusTask', () => {
  test.setTimeout(180_000)

  test('puts the task in the middle, marks it, replaces an older mark, and the exports and the saved JSON carry no trace', async () => {
    const opened = await stage()
    try {
      await focusTask(opened.page, 30)
      await expectLanded(opened.page, 30)
      await focusTask(opened.page, 12)
      await expectLanded(opened.page, 12, { isFirstRows: true })
      await focusTask(opened.page, 25)
      await expectLanded(opened.page, 25)
      const exported = await opened.page.evaluate(async () => {
        const api = (window as unknown as { grSchedulerAgentApi: { exportSvg(): Promise<{ ok: boolean; value: unknown }>; exportJson(): Promise<{ ok: boolean; value: unknown }> } }).grSchedulerAgentApi
        return { svg: await api.exportSvg(), json: await api.exportJson() }
      })
      expect(exported.svg.ok && exported.json.ok, 'AM-13 and AM-11 answer').toBe(true)
      expect(String(exported.svg.value), 'SJ-10: the exported picture holds no ring').not.toContain('Jump Landing')
      expect(String(exported.json.value), 'SJ-10: the saved JSON holds no trace').not.toMatch(/landed|landing|Jump Landing/i)
      expect(Object.keys((await readDocumentOf(opened.page)).documentSettings).sort().join(',')).not.toMatch(/landed|landing/i)
    } finally {
      await opened.close()
    }
  })
})

test.describe('CR-728 -- the other entrances that press and jump', () => {
  test.setTimeout(240_000)

  // WHY: a double click on the bar opens the Properties Panel on that task; the press clears the old mark (EL-17).
  /** @purity non-pure */
  async function openPanelOn(page: Page, uid: number): Promise<void> {
    await focusTask(page, uid)
    const at = await barCentre(page, uid)
    await page.mouse.dblclick(at.x, at.y)
    await settle(page)
    expect(await ringCount(page), 'EL-17: the press cleared the older mark').toBe(0)
  }

  /** @purity non-pure */
  async function pressLinkAndLand(page: Page, selector: string, uid: number): Promise<void> {
    const spot = await centreOf(page, selector)
    expect(await pressAndSeeRipple(page, spot), 'SJ-10 ②: a ripple starts').toBeGreaterThan(0)
    await settle(page)
    await expectLanded(page, uid)
    expect(await selectionText(page), 'the target is chosen').toMatch(new RegExp(`\\b${String(uid)}\\b`))
  }

  test('PTL-16: the parent name in the Properties Panel lands the parent and marks it', async () => {
    const opened = await stage()
    try {
      await openPanelOn(opened.page, 30)
      await pressLinkAndLand(opened.page, `${PROPERTIES} [data-field-row="PR-15"] [data-link-task-uid]`, 25)
    } finally {
      await opened.close()
    }
  })

  test('PR-37: a predecessor name lands that task and marks it', async () => {
    const opened = await stage()
    try {
      await openPanelOn(opened.page, 30)
      await pressLinkAndLand(opened.page, `${PROPERTIES} [data-field-row="PR-37"] [data-link-task-uid]`, 18)
    } finally {
      await opened.close()
    }
  })

  test('PR-38: a successor name lands that task and marks it', async () => {
    const opened = await stage()
    try {
      await openPanelOn(opened.page, 30)
      await pressLinkAndLand(opened.page, `${PROPERTIES} [data-field-row="PR-38"] [data-link-task-uid]`, 35)
    } finally {
      await opened.close()
    }
  })

  test('SJ-2 then SJ-5 / SJ-6: a search jump to a task under folded task groups lands it in the middle once they are open', async () => {
    if (browser === null) throw new Error('no browser')
    const opened = await openStage(browser)
    try {
      await openDocument(opened.page, 'sample-large-erp-program.ja.xml', ERP_SAMPLE)
      expect(await pressEntrance(opened.page, HEAD_FOLD_EVERY_TASK_GROUP), 'HF-12 is on the screen').toBe(true)
      await openSearch(opened.page, 'UAT')
      const spot = await centreOf(opened.page, `${SEARCH_PANEL} tbody tr [data-search-task]`)
      expect(await pressAndSeeRipple(opened.page, spot), 'SJ-10 ②: a ripple starts').toBeGreaterThan(0)
      await settle(opened.page)
      await expectLandedOnTheChosen(opened.page)
    } finally {
      await opened.close()
    }
  })

  test('FR-134: a name in the Delay Diagnostics Report lands that task and marks it', async () => {
    if (browser === null) throw new Error('no browser')
    const opened = await openStage(browser)
    try {
      await openDocument(opened.page, 'sample-large-erp-program.ja.xml', ERP_SAMPLE)
      expect(await pressEntrance(opened.page, DIAGNOSE), 'IC-107 is on the screen').toBe(true)
      const name = await opened.page.evaluate((report: string) => {
        const row = document.querySelector(`${report} tbody tr`)
        const heads = Array.from(document.querySelector(report)?.querySelectorAll('thead th') ?? [])
        const index = heads.findIndex((one) => one.getAttribute('data-column') === 'DT-4')
        const cell = row?.children[index]
        if (cell === undefined) return null
        const box = cell.getBoundingClientRect()
        return { x: box.x + Math.min(box.width / 2, 40), y: box.y + box.height / 2 }
      }, REPORT)
      if (name === null) throw new Error('the report draws no DT-4 cell in its first row')
      expect(await pressAndSeeRipple(opened.page, name), 'SJ-10 ②: a ripple starts').toBeGreaterThan(0)
      await settle(opened.page)
      expect(await ringCount(opened.page), 'FR-134 reaches SJ-10: one ring').toBe(1)
      await expectLandedOnTheChosen(opened.page)
    } finally {
      await opened.close()
    }
  })
})

test.describe('CR-728 -- SJ-9 on the sample as it opens', () => {
  test.setTimeout(120_000)

  test('AM-16 focusTask to the long task of the large sample lands it in the middle, as it does for any other task', async () => {
    if (browser === null) throw new Error('no browser')
    const opened = await openStage(browser)
    try {
      await openDocument(opened.page, 'sample-large-erp-program.ja.xml', ERP_SAMPLE)
      await focusTask(opened.page, 208)
      await expectLanded(opened.page, 208)
    } finally {
      await opened.close()
    }
  })
})
