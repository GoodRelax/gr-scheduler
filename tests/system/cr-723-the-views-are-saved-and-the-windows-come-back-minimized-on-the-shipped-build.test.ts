// CR-723 on the shipped build: the views are saved and come back (S-560 to S-572, OP-18, TV-12), a view change is an unsaved edit and one undo step (UN-20, TV-8), the Delay Diagnostics start (OP-18, S-445), and the Agent API reads and writes the views (AM-27).

import { expect, test, type Browser, type Page } from '@playwright/test'
import { bare, specTable } from '../contract/spec-table'
import { validateDocument } from '../fixtures/grs-document'
import { CLEARING_UP_MS, launchReferenceBrowser } from './live-app'
import { UNDO, keyOf, openDocument, openStage, pressEntrance, saveDocument, settle, wouldWarn, type Stage } from './cr-570-tree-state-stage'
import { rowOf } from './sws-case'
import { ALPHA, BRAVO, CHARLIE, DELTA, ECHO, SATO, SCROLLED_CLEAR_OF_THE_PALETTE, TANAKA, documentText, scheduleFixture, type Loose } from '../contract/cr-723-fixture'

const roleOf = (id: string): string => `[data-role="${bare(rowOf(specTable('T-103'), id).cells[0] ?? '')}"]`
const SEARCH = roleOf('U-64')
const REPORT = roleOf('U-66')
const RESOURCE_LIST = roleOf('U-49')
const BAND = roleOf('U-67')
const EYE = rowOf(specTable('T-109'), 'IC-143').id
const OPEN_SEARCH_ICON = rowOf(specTable('T-109'), 'IC-117').id
const DIAGNOSE = rowOf(specTable('T-109'), 'IC-107').id
const OPEN_RESOURCE_LIST = rowOf(specTable('T-109'), 'IC-62').id
const MINIMIZE = rowOf(specTable('T-109'), 'IC-129').id
const CLOSE = rowOf(specTable('T-109'), 'IC-52').id
const OPEN_SEARCH = keyOf('SK-24')

// see S-543
const colorOf = (id: string): string => {
  const hex = /#([0-9a-f]{6})/i.exec(rowOf(specTable('T-236'), id).by['明るいテーマ'] ?? '')?.[1] ?? ''
  const at = (from: number): number => parseInt(hex.slice(from, from + 2), 16)
  return `rgb(${String(at(0))}, ${String(at(2))}, ${String(at(4))})`
}
const RED = colorOf('S-543')

// see RO-6, UZ-6
const RO_6_LATER_IN_FRONT = 'ほかの表のウィンドウと同時に出ているときは、後に開いたものを前に置く'

const VIEW_SETTINGS = (part: Loose): Loose => ({ ...SCROLLED_CLEAR_OF_THE_PALETTE, ...part })
const NO_VIEWS = (): string => documentText(VIEW_SETTINGS({}))

type Api = {
  readDocument(): { documentSettings: { tableViews: Record<string, Record<string, unknown>> } }
  readStamp(): unknown
  applyCommands(request: unknown): { accepted: boolean }
  readShownTasks(): { drawnTaskUids: number[] | null; tables: string[] }
  showOnlyTasks(taskUids: readonly number[] | null): unknown
}

/** @purity semi-pure-b */
async function viewsOf(page: Page): Promise<Record<string, Record<string, unknown>>> {
  return page.evaluate(() => (window as unknown as { grSchedulerAgentApi: Api }).grSchedulerAgentApi.readDocument().documentSettings.tableViews)
}

/** @purity semi-pure-b */
async function shownOf(page: Page): Promise<{ drawn: number[] | null; tables: string[] }> {
  const shown = await page.evaluate(() => (window as unknown as { grSchedulerAgentApi: Api }).grSchedulerAgentApi.readShownTasks())
  return { drawn: shown.drawnTaskUids === null ? null : [...shown.drawnTaskUids].sort((a, b) => a - b), tables: [...shown.tables].sort() }
}

/** @purity non-pure */
async function applyView(page: Page, table: string, view: unknown): Promise<boolean> {
  return page.evaluate(
    (asked: { table: string; view: unknown }) => {
      const api = (window as unknown as { grSchedulerAgentApi: Api }).grSchedulerAgentApi
      return api.applyCommands({ readStamp: api.readStamp(), commands: [{ kind: 'setTableView', table: asked.table, view: asked.view }] }).accepted
    },
    { table, view },
  )
}

/** @purity semi-pure-b */
async function boxOf(page: Page, selector: string): Promise<{ x: number; y: number; width: number; height: number } | null> {
  return page.evaluate((wanted: string) => {
    const r = document.querySelector(wanted)?.getBoundingClientRect()
    return r === undefined ? null : { x: r.x, y: r.y, width: r.width, height: r.height }
  }, selector)
}

/** @purity non-pure */
async function press(page: Page, selector: string): Promise<void> {
  const box = await boxOf(page, selector)
  if (box === null) throw new Error(`${selector} is not on the screen`)
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.up()
  await settle(page)
}

// see RO-6, UZ-6, WB-8, GR-24
// WHY: a window opened later covers the one under it; a person drags it aside by its title band, a point on no entrance.
/** @purity non-pure */
async function dragAside(page: Page, window: string): Promise<void> {
  const spot = await page.evaluate((wanted: string) => {
    const one = document.querySelector(wanted)
    const title = one?.firstElementChild
    if (one === null || one === undefined || title === null || title === undefined) return null
    const band = title.getBoundingClientRect()
    const y = band.top + band.height / 2
    for (let x = band.left + 2; x < band.right - 2; x += 4) {
      const top = document.elementFromPoint(x, y)
      if (top !== null && one.contains(top) && top.closest('[data-icon]') === null) return { x, y, width: one.getBoundingClientRect().width }
    }
    return null
  }, window)
  if (spot === null) throw new Error(`GR-24: no free point on the title band of ${window} (${RO_6_LATER_IN_FRONT})`)
  await page.mouse.move(spot.x, spot.y)
  await page.mouse.down()
  await page.mouse.move(spot.x + spot.width / 2, spot.y, { steps: 4 })
  await page.mouse.move(spot.x + spot.width, spot.y, { steps: 4 })
  await page.mouse.up()
  await settle(page)
}

// see WB-2
// WHY: a minimized window draws its title bar only, so it holds neither the word field nor a table.
/** @purity semi-pure-b */
async function isMinimized(page: Page, window: string): Promise<boolean> {
  return page.evaluate((wanted: string) => {
    const one = document.querySelector(wanted)
    return one !== null && one.querySelector('input') === null && one.querySelector('table') === null
  }, window)
}

/** @purity semi-pure-b */
async function paintsRed(page: Page, selector: string): Promise<boolean> {
  return page.evaluate(
    (asked: { selector: string; red: string }) => {
      const top = document.querySelector(asked.selector)
      if (top === null) return false
      return [top, ...Array.from(top.querySelectorAll('*'))].some((one) => [getComputedStyle(one).backgroundColor, getComputedStyle(one).fill].includes(asked.red))
    },
    { selector, red: RED },
  )
}

// WHY: the word narrows the list (SV-4), the heading box then takes every listed row out of Show (SQ-10), and the word is cleared again.
/** @purity non-pure */
async function hideListedIn(page: Page, window: string, word: string): Promise<void> {
  await press(page, `${window} input`)
  await page.keyboard.press('Control+a')
  await page.keyboard.type(word)
  await settle(page)
  await press(page, `${window} [data-search-shown-all]`)
  await press(page, `${window} input`)
  await page.keyboard.press('Control+a')
  await page.keyboard.press('Backspace')
  await settle(page)
}

/** @purity non-pure */
async function openSearch(page: Page): Promise<void> {
  await page.keyboard.press(OPEN_SEARCH)
  await settle(page)
}

/** @purity non-pure */
async function openResourceList(page: Page): Promise<void> {
  expect(await pressEntrance(page, OPEN_RESOURCE_LIST), 'IC-62 is on the screen').toBe(true)
  await expect(page.locator(RESOURCE_LIST)).toBeVisible()
}

let browser: Browser | null = null

test.beforeAll(async () => {
  browser = await launchReferenceBrowser()
})

test.afterAll(async () => {
  test.setTimeout(CLEARING_UP_MS)
  await browser?.close()
})

/** @purity non-pure */
async function opened(text: string): Promise<Stage> {
  if (browser === null) throw new Error('no browser')
  const stage = await openStage(browser)
  await openDocument(stage.page, 'cr-723.json', text)
  return stage
}

const STATUS_FILTER = { column: 'SQ-5', hiddenValues: ['Done'], fromDate: null, toDate: null }
const BY_RESOURCE = { column: 'SQ-2', direction: 'descending' }

test.describe('CR-723 on the shipped build', () => {
  test.setTimeout(240_000)

  test('S-560 to S-572 / OP-18 / TV-12: hide two rows, one person, filter and sort, two eyes, save; reopen gives the same views, minimized windows and red', async () => {
    const first = await opened(NO_VIEWS())
    let saved = ''
    try {
      const { page } = first
      await openSearch(page)
      await hideListedIn(page, SEARCH, 'Sato')
      await openResourceList(page)
      await hideListedIn(page, RESOURCE_LIST, 'Tanaka')
      const current = (await viewsOf(page))['searchPanel'] ?? {}
      expect(current['hiddenTaskUids'], 'premise: the two Sato tasks are Hide').toEqual([ALPHA, CHARLIE])
      expect(await applyView(page, 'searchPanel', { visibility: { hiddenKeys: [ALPHA, CHARLIE], isUnassignedHidden: false, isApplied: false }, columnFilters: [STATUS_FILTER], sort: BY_RESOURCE })).toBe(true)
      await settle(page)
      // STEP: RO-6 -- the Resource List opened later stands in front of the Search Panel; drag it aside to reach the search IC-143
      await dragAside(page, RESOURCE_LIST)
      await press(page, `${SEARCH} [data-icon="${EYE}"]`)
      await press(page, `${RESOURCE_LIST} [data-icon="${EYE}"]`)
      saved = await saveDocument(page)
      expect(await wouldWarn(page), 'FR-100: a saved document has no unsaved edit').toBe(false)
    } finally {
      await first.close()
    }

    const file = JSON.parse(saved) as { documentSettings: { tableViews: Record<string, Record<string, unknown>> } }
    expect(validateDocument(file).errors, 'FR-024: the saved file conforms to the schema').toEqual([])
    const views = file.documentSettings.tableViews
    expect(views['searchPanel']).toEqual({ isScheduleFilterApplied: true, hiddenTaskUids: [ALPHA, CHARLIE], columnFilters: [STATUS_FILTER], sort: BY_RESOURCE })
    expect(views['resourceList']).toMatchObject({ isScheduleFilterApplied: true, hiddenResourceUids: [TANAKA], isUnassignedHidden: false })
    expect(views['delayDiagnosticsReport']).toMatchObject({ isScheduleFilterApplied: false, hiddenTaskUids: [], columnFilters: [], sort: null })
    expect(JSON.stringify(file)).not.toMatch(/"(word|textSizeStep|columnWidths|isMinimized)"/)

    const second = await opened(saved)
    try {
      const { page } = second
      expect(await viewsOf(page), 'the reopened document holds the same three views').toEqual(views)
      expect(await isMinimized(page, SEARCH), 'OP-18: the Search Panel comes up minimized').toBe(true)
      expect(await isMinimized(page, RESOURCE_LIST), 'OP-18: the Resource List comes up minimized').toBe(true)
      expect(await page.locator(REPORT).count(), 'the report window is not shown for the other two').toBe(0)
      expect(await paintsRed(page, `${SEARCH} [data-icon="${EYE}"]`), 'TV-12: the search eye').toBe(true)
      expect(await paintsRed(page, `${RESOURCE_LIST} [data-icon="${EYE}"]`), 'TV-12: the resource list eye').toBe(true)
      expect(await paintsRed(page, `[data-icon="${OPEN_SEARCH_ICON}"]`), 'TV-12: IC-117').toBe(true)
      expect(await paintsRed(page, `[data-icon="${OPEN_RESOURCE_LIST}"]`), 'TV-12: IC-62').toBe(true)
      expect(await paintsRed(page, `[data-icon="${DIAGNOSE}"]`), 'TV-12 (MUST NOT): IC-107 stays plain').toBe(false)
      expect(await page.locator(BAND).count(), 'TV-11: the bar is shown').toBe(1)
      expect(await shownOf(page)).toEqual({ drawn: [ECHO], tables: ['resourceList', 'searchPanel'] })
      expect(await wouldWarn(page), 'OP-18: opening is not an unsaved edit').toBe(false)
      await press(page, `${SEARCH} [data-icon="${MINIMIZE}"]`)
      expect(await page.inputValue(`${SEARCH} input`), 'FR-151: the word is not part of the document').toBe('')
    } finally {
      await second.close()
    }
  })

  test('UN-20 / FR-100: hiding rows is an unsaved edit and one undo step; undoing it clears the mark', async () => {
    const stage = await opened(NO_VIEWS())
    try {
      const { page } = stage
      expect(await wouldWarn(page)).toBe(false)
      await openSearch(page)
      await hideListedIn(page, SEARCH, 'Sato')
      expect(await wouldWarn(page), 'a row made Hide is an unsaved edit').toBe(true)
      expect(await pressEntrance(page, UNDO), 'IC-5 is on the screen').toBe(true)
      expect((await viewsOf(page))['searchPanel']?.['hiddenTaskUids'], 'one undo takes all the rows back').toEqual([])
      expect(await wouldWarn(page), 'FR-100: back at the saved document, no unsaved edit').toBe(false)
    } finally {
      await stage.close()
    }
  })

  test('TV-8 / UN-20: closing the window to release the eye is an edit; undo turns the eye on and brings the window back minimized', async () => {
    const stage = await opened(NO_VIEWS())
    try {
      const { page } = stage
      await openSearch(page)
      await hideListedIn(page, SEARCH, 'Sato')
      await press(page, `${SEARCH} [data-icon="${EYE}"]`)
      expect((await shownOf(page)).tables).toEqual(['searchPanel'])
      await press(page, `${SEARCH} [data-icon="${CLOSE}"]`)
      expect((await shownOf(page)).tables, 'closing releases the eye').toEqual([])
      expect((await viewsOf(page))['searchPanel']?.['hiddenTaskUids'], 'TV-8: the Visibility stays').toEqual([ALPHA, CHARLIE])
      expect(await pressEntrance(page, UNDO)).toBe(true)
      expect((await shownOf(page)).tables, 'undo turns the eye on again').toEqual(['searchPanel'])
      expect(await isMinimized(page, SEARCH), 'WB-2: the window comes back minimized').toBe(true)
    } finally {
      await stage.close()
    }
  })

  test('OP-18: a uid the document does not have and a column no table has are dropped on opening; the document opens and is not edited', async () => {
    const text = documentText(
      VIEW_SETTINGS({
        tableViews: {
          searchPanel: { isScheduleFilterApplied: true, hiddenTaskUids: [ALPHA, 987654], columnFilters: [STATUS_FILTER, { column: 'no-such-column', hiddenValues: [], fromDate: null, toDate: null }], sort: { column: 'no-such-column', direction: 'ascending' } },
          delayDiagnosticsReport: { isScheduleFilterApplied: false, hiddenTaskUids: [], columnFilters: [], sort: null },
          resourceList: { isScheduleFilterApplied: false, hiddenResourceUids: [SATO, 876543], isUnassignedHidden: false, columnFilters: [], sort: null },
        },
      }),
    )
    const stage = await opened(text)
    try {
      const { page } = stage
      const views = await viewsOf(page)
      expect(views['searchPanel']).toEqual({ isScheduleFilterApplied: true, hiddenTaskUids: [ALPHA], columnFilters: [STATUS_FILTER], sort: null })
      expect(views['resourceList']?.['hiddenResourceUids']).toEqual([SATO])
      expect((await shownOf(page)).drawn).toEqual([BRAVO, CHARLIE, DELTA, ECHO])
      expect(await wouldWarn(page), 'opening is not an unsaved edit').toBe(false)
    } finally {
      await stage.close()
    }
  })

  test('OP-18 / S-445 / S-564: a document saved with the report eye on starts the diagnosis and shows the report minimized', async () => {
    const text = documentText(
      VIEW_SETTINGS({
        tableViews: {
          searchPanel: { isScheduleFilterApplied: false, hiddenTaskUids: [], columnFilters: [], sort: null },
          delayDiagnosticsReport: { isScheduleFilterApplied: true, hiddenTaskUids: [DELTA], columnFilters: [], sort: null },
          resourceList: { isScheduleFilterApplied: false, hiddenResourceUids: [], isUnassignedHidden: false, columnFilters: [], sort: null },
        },
      }),
    )
    const stage = await opened(text)
    try {
      const { page } = stage
      expect(await isMinimized(page, REPORT), 'the report window comes up minimized').toBe(true)
      expect(await paintsRed(page, `${REPORT} [data-icon="${EYE}"]`), 'TV-12: the report eye').toBe(true)
      expect(await paintsRed(page, `[data-icon="${DIAGNOSE}"]`), 'TV-12: IC-107').toBe(true)
      expect((await shownOf(page)).tables).toEqual(['delayDiagnosticsReport'])
      expect(await wouldWarn(page), 'opening is not an unsaved edit').toBe(false)
      await press(page, `${REPORT} [data-icon="${MINIMIZE}"]`)
      expect(await page.locator(`${REPORT} tbody tr`).count(), 'the diagnosis ran, so the report lists tasks').toBeGreaterThan(0)
    } finally {
      await stage.close()
    }
  })

  test('OP-18: with no status date the diagnosis cannot start; the report eye is released on opening and nothing is marked unsaved', async () => {
    const schedule = scheduleFixture()
    const project = { ...(schedule['project'] as Loose), statusDate: null }
    const text = documentText(
      VIEW_SETTINGS({
        tableViews: {
          searchPanel: { isScheduleFilterApplied: false, hiddenTaskUids: [], columnFilters: [], sort: null },
          delayDiagnosticsReport: { isScheduleFilterApplied: true, hiddenTaskUids: [DELTA], columnFilters: [], sort: null },
          resourceList: { isScheduleFilterApplied: false, hiddenResourceUids: [], isUnassignedHidden: false, columnFilters: [], sort: null },
        },
      }),
      { ...schedule, project },
    )
    const stage = await opened(text)
    try {
      const { page } = stage
      expect((await shownOf(page)).tables, 'the report eye is not on').toEqual([])
      expect(await paintsRed(page, `[data-icon="${DIAGNOSE}"]`)).toBe(false)
      expect(await wouldWarn(page), 'releasing it on opening is not an edit').toBe(false)
    } finally {
      await stage.close()
    }
  })

  test('AM-27: showOnlyTasks writes the search view (one undo step), readDocument reads it, null releases the eye and keeps the rows', async () => {
    const stage = await opened(NO_VIEWS())
    try {
      const { page } = stage
      await page.evaluate((keep: number[]) => (window as unknown as { grSchedulerAgentApi: Api }).grSchedulerAgentApi.showOnlyTasks(keep), [ALPHA, CHARLIE])
      await settle(page)
      expect((await viewsOf(page))['searchPanel']).toMatchObject({ isScheduleFilterApplied: true, hiddenTaskUids: [BRAVO, DELTA, ECHO] })
      expect(await wouldWarn(page), 'FR-100: an Agent API write counts').toBe(true)
      await page.evaluate(() => (window as unknown as { grSchedulerAgentApi: Api }).grSchedulerAgentApi.showOnlyTasks(null))
      await settle(page)
      expect((await viewsOf(page))['searchPanel']).toMatchObject({ isScheduleFilterApplied: false, hiddenTaskUids: [BRAVO, DELTA, ECHO] })
      expect(await pressEntrance(page, UNDO)).toBe(true)
      expect((await viewsOf(page))['searchPanel']).toMatchObject({ isScheduleFilterApplied: true })
    } finally {
      await stage.close()
    }
  })
})
