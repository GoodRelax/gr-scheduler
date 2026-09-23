// CR-553 in the running app: a shown control group stays its row's (HF-6, JDG-394), and the last row keeps room for it (LF-16).

import { expect, test, type Browser, type Page } from '@playwright/test'
import { specTable } from '../contract/spec-table'
import { validateDocument } from '../fixtures/grs-document'
import { CLEARING_UP_MS, launchReferenceBrowser, readSettledDrawnSvg, screenOf } from './live-app'
import { rowOf } from './sws-case'

const BASE_SCREEN = screenOf(rowOf(specTable('T-025'), 'MC-6'))

// see T-109, HF-13
const OPEN_ONE_TIER = ((): string => {
  const found = specTable('T-109').rows.filter((row) => row.cells.some((cell) => /HF-13(?![0-9])/.test(cell)))
  if (found.length !== 1) throw new Error(`table T-109 has ${found.length} entrances governed by HF-13`)
  return found[0]?.id ?? ''
})()

// see FR-065, T-109
const AGENT_API_ENTRANCE = ((): string => {
  const found = specTable('T-109').rows.filter((row) => row.cells.some((cell) => /FR-065(?![0-9])/.test(cell)))
  if (found.length !== 1) throw new Error(`table T-109 has ${found.length} entrances governed by FR-065`)
  return found[0]?.id ?? ''
})()

const HF_6_NOT_THE_LOWER_ROW =
  '群が下の行に重なっているとき、群の上にあるポインタを、下の行の名前に乗っていると数えてはならない（MUST NOT）'

const ROW = '[data-depth]'
const GRID = '[data-row-folding-grid]'
const SCROLLBARS = '[data-role="Scrollbars"]'
const CANVAS = '[data-role="Schedule Canvas"]'

let browser: Browser | null = null

test.beforeAll(async () => {
  browser = await launchReferenceBrowser()
})

test.afterAll(async () => {
  test.setTimeout(CLEARING_UP_MS)
  await browser?.close()
})

/** @purity semi-pure-b */
function openedBrowser(): Browser {
  if (browser === null) throw new Error('the reference browser was not opened')
  return browser
}

/** @purity non-pure */
async function pressAt(page: Page, at: { x: number; y: number }): Promise<void> {
  await page.mouse.move(at.x, at.y)
  await page.mouse.down()
  await page.mouse.up()
}

// see FR-067, FR-065, T-107
// WHY: the document is built from the one the app opens with, so every column keeps the shape the
// schema holds; it reaches the page through the embedded-document route of FR-067, not AM-8 (FR-022 waits).
/** @purity non-pure */
async function documentWithRows(baseURL: string, roots: number, offset: number): Promise<string> {
  const context = await openedBrowser().newContext({ baseURL, viewport: BASE_SCREEN })
  try {
    const page = await context.newPage()
    await page.goto('/')
    await readSettledDrawnSvg(page)
    const at = await page.evaluate((wanted: string) => {
      const box = document.querySelector(`[data-icon="${wanted}"]`)?.getBoundingClientRect()
      return box === undefined ? null : { x: box.x + box.width / 2, y: box.y + box.height / 2 }
    }, AGENT_API_ENTRANCE)
    if (at === null) throw new Error(`the entrance ${AGENT_API_ENTRANCE} is not drawn`)
    await pressAt(page, at)
    await page.waitForTimeout(600)
    return await page.evaluate((asked: { count: number; offset: number }) => {
      type Bag = Record<string, unknown>
      const api = (window as unknown as { grSchedulerAgentApi?: { readDocument(): unknown } }).grSchedulerAgentApi
      if (api === undefined) throw new Error('the Agent API did not open')
      const held = api.readDocument() as { schedule: Bag & { project: Bag; tasks: Bag[]; taskGroups: Bag[] }; documentSettings: Bag }
      const task0 = held.schedule.tasks[0] ?? {}
      const group0 = held.schedule.taskGroups[0] ?? {}
      const groups: Bag[] = []
      const tasks: Bag[] = []
      const members: Bag[] = []
      let uid = 1
      for (let index = 0; index < asked.count; index += 1) {
        groups.push({ ...group0, id: `r${index}`, parentId: null, order: index, label: `Row ${index}`, isCollapsed: true, isHidden: null, height: null })
        groups.push({ ...group0, id: `r${index}c`, parentId: `r${index}`, order: 0, label: `Child ${index}`, isCollapsed: null, isHidden: null, height: null })
        for (const groupId of [`r${index}`, `r${index}c`]) {
          const over: Bag = {
            uid, name: `T${uid}`, start: '2026-01-05T08:00:00', finish: '2026-01-20T17:00:00', dependencies: [],
            actualStart: null, actualFinish: null, actualDuration: null, stop: null, percentComplete: null,
            resume: null, resumeValid: true, wbsParentUid: null, milestone: false,
          }
          tasks.push({ ...task0, ...Object.fromEntries(Object.entries(over).filter(([key]) => key in task0)) })
          members.push({ groupId, taskUid: uid, stackOrder: null })
          uid += 1
        }
      }
      return JSON.stringify({
        ...held,
        schedule: {
          ...held.schedule,
          project: { ...held.schedule.project, uidHighWaterMark: uid + 1 },
          tasks, taskGroups: groups, taskGroupMembers: members, taskVisuals: [], highlightBoxes: [], commentBoxes: [],
          resources: [], assignments: [], taskOrigins: [], baselineTasks: [],
        },
        documentSettings: {
          ...held.documentSettings, displayScale: 100, zoomY: 1, zoomX: 1, pinnedGroupIds: [],
          scrollGroupId: 'r0', scrollGroupOffset: asked.offset, scrollDate: '2026-01-01', scrollDayOffset: 0,
        },
      })
    }, { count: roots, offset })
  } finally {
    await context.close()
  }
}

interface Opened {
  readonly page: Page
  close(): Promise<void>
}

/** @purity non-pure */
async function openWith(
  baseURL: string | undefined,
  roots: number,
  viewport = BASE_SCREEN,
  offset = 0,
): Promise<Opened> {
  if (baseURL === undefined) throw new Error('playwright.config.ts declares no baseURL')
  const built = await documentWithRows(baseURL, roots, offset)
  const checked = validateDocument(JSON.parse(built))
  expect(checked.errors, 'the fixture document is one the schema accepts').toEqual([])
  const context = await openedBrowser().newContext({ baseURL, viewport })
  const page = await context.newPage()
  await page.route('**/*', async (route) => {
    if (route.request().resourceType() !== 'document') return route.continue()
    const response = await route.fetch()
    const html = await response.text()
    const tag = `<script type="application/json" id="embedded-document">${built}</script>`
    return route.fulfill({ response, body: html.replace('</head>', `${tag}</head>`) })
  })
  await page.goto('/')
  await readSettledDrawnSvg(page)
  return {
    page,
    /** @purity non-pure */
    async close(): Promise<void> {
      await context.close()
    },
  }
}

interface Box {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

interface DrawnRow {
  readonly id: string
  readonly box: Box
  readonly grid: Box | null
  readonly entrance: Box | null
  readonly entranceShown: boolean
}

/** @purity semi-pure-b */
async function drawnRows(page: Page): Promise<DrawnRow[]> {
  return page.evaluate(
    (asked: { row: string; grid: string; icon: string }) =>
      Array.from(document.querySelectorAll(asked.row)).map((row) => {
        const boxOf = (element: Element | null | undefined) => {
          if (element === null || element === undefined) return null
          const box = element.getBoundingClientRect()
          return { x: box.x, y: box.y, width: box.width, height: box.height }
        }
        const entrance = row.querySelector(`[data-icon="${asked.icon}"]`)
        return {
          id: row.getAttribute('data-group-id') ?? '',
          box: boxOf(row) ?? { x: 0, y: 0, width: 0, height: 0 },
          grid: boxOf(row.querySelector(asked.grid)),
          entrance: boxOf(entrance),
          entranceShown: entrance !== null && getComputedStyle(entrance).visibility === 'visible',
        }
      }),
    { row: ROW, grid: GRID, icon: OPEN_ONE_TIER },
  )
}

/** @purity semi-pure-b */
async function rowById(page: Page, id: string): Promise<DrawnRow> {
  const found = (await drawnRows(page)).find((row) => row.id === id)
  if (found === undefined) throw new Error(`row ${id} is not drawn`)
  return found
}

// WHY: the left end of the name, where the page itself says the name is on top: the ground of the
// group runs from the leftmost control to the right edge (HF-6), so it never covers this spot.
/** @purity semi-pure-b */
async function nameSpotOf(page: Page, id: string): Promise<{ x: number; y: number }> {
  const spot = await page.evaluate(
    (asked: { id: string; row: string }) => {
      const row = Array.from(document.querySelectorAll(asked.row)).find((one) => one.getAttribute('data-group-id') === asked.id)
      const name = row?.querySelector('span')
      if (name === null || name === undefined) return null
      const box = name.getBoundingClientRect()
      const rowBox = row?.getBoundingClientRect()
      const top = Math.max(box.y, rowBox?.y ?? box.y)
      const bottom = Math.min(box.bottom, rowBox?.bottom ?? box.bottom, window.innerHeight)
      for (let y = top + 1; y < bottom; y += 1) {
        for (let x = Math.ceil(box.x) + 1; x < box.x + 40; x += 2) {
          if (document.elementFromPoint(x, y) === name) return { x, y }
        }
      }
      return null
    },
    { id, row: ROW },
  )
  if (spot === null) throw new Error(`the name of row ${id} is nowhere on top`)
  return spot
}

/** @purity semi-pure-b */
async function ownerAt(page: Page, at: { x: number; y: number }): Promise<string | null> {
  return page.evaluate(
    (asked: { x: number; y: number; row: string }) =>
      document.elementFromPoint(asked.x, asked.y)?.closest(asked.row)?.getAttribute('data-group-id') ?? null,
    { ...at, row: ROW },
  )
}

test.describe('HF-6 / JDG-394 (MUST): a shown group stays the row it was drawn for', () => {
  test('the lower rank over the next row still presses the row the group was drawn for', async ({ baseURL }) => {
    test.setTimeout(180_000)
    expect(rowOf(specTable('T-051'), 'HF-6').cells.join(' '), 'the clause this case presses').toContain(HF_6_NOT_THE_LOWER_ROW)
    const opened = await openWith(baseURL, 30)
    try {
      const { page } = opened
      const first = await rowById(page, 'r0')
      const second = await rowById(page, 'r1')
      expect(second.box.y, 'the premise: r1 is the row right under r0').toBeCloseTo(first.box.y + first.box.height, 1)

      const name = await nameSpotOf(page, 'r0')
      await page.mouse.move(name.x, name.y)
      await page.waitForTimeout(400)
      const shown = await rowById(page, 'r0')
      expect(shown.entranceShown, `HF-6: hovering r0's name draws its group (${OPEN_ONE_TIER})`).toBe(true)
      const entrance = shown.entrance
      const grid = shown.grid
      if (entrance === null || grid === null) throw new Error('r0 draws no lattice')
      expect(grid.height, 'the premise: the lattice (LF-16) is taller than the one-lane band (HF-19)').toBeGreaterThan(first.box.height)
      const rowBottom = first.box.y + first.box.height
      expect(entrance.y + entrance.height, `the premise: ${OPEN_ONE_TIER} in the lower rank reaches over r1`).toBeGreaterThan(rowBottom + 1)

      // STEP: along the group to the part of the lower rank that lies over r1's band, then press there.
      const middle = { x: entrance.x + entrance.width / 2, y: entrance.y + entrance.height / 2 }
      const overNext = { x: middle.x, y: (rowBottom + entrance.y + entrance.height) / 2 }
      await page.mouse.move(middle.x, middle.y, { steps: 8 })
      await page.mouse.move(overNext.x, overNext.y, { steps: 4 })
      await page.waitForTimeout(300)
      expect(overNext.y, 'the premise: the pressed point is inside r1 band').toBeGreaterThan(second.box.y)
      expect(await ownerAt(page, overNext), HF_6_NOT_THE_LOWER_ROW).toBe('r0')
      await pressAt(page, overNext)
      await page.waitForTimeout(800)

      const ids = (await drawnRows(page)).map((row) => row.id)
      expect(ids, `JDG-394: the press reached r0 and opened its child: ${ids.slice(0, 6).join(' ')}`).toContain('r0c')
      expect(ids, 'and it did not reach r1').not.toContain('r1c')
    } finally {
      await opened.close()
    }
  })

  test('the control: leaving the group onto r1 name hands the group to r1', async ({ baseURL }) => {
    test.setTimeout(180_000)
    const opened = await openWith(baseURL, 30)
    try {
      const { page } = opened
      const nameOfFirst = await nameSpotOf(page, 'r0')
      await page.mouse.move(nameOfFirst.x, nameOfFirst.y)
      await page.waitForTimeout(300)
      const nameOfSecond = await nameSpotOf(page, 'r1')
      await page.mouse.move(nameOfSecond.x, nameOfSecond.y, { steps: 6 })
      await page.waitForTimeout(400)
      expect((await rowById(page, 'r0')).entranceShown, 'HF-6: r0 group is gone once the pointer left it').toBe(false)
      const second = await rowById(page, 'r1')
      expect(second.entranceShown, 'HF-6: the pointer on r1 name draws r1 group').toBe(true)
      if (second.entrance === null) throw new Error('r1 draws no entrance')
      await pressAt(page, { x: second.entrance.x + second.entrance.width / 2, y: second.entrance.y + second.entrance.height / 2 })
      await page.waitForTimeout(800)
      const ids = (await drawnRows(page)).map((row) => row.id)
      expect(ids).toContain('r1c')
      expect(ids).not.toContain('r0c')
    } finally {
      await opened.close()
    }
  })
})

interface RowArea {
  readonly top: number
  readonly bottom: number
  readonly scrollbarTop: number
}

// see FR-051, GR-21
// WHY: Scrollbars take their room from the Row Area (FR-051), so the vertical one spans exactly the
// Row Area's height, and the horizontal one starts where nothing of the schedule may be drawn.
/** @purity semi-pure-b */
async function rowAreaOf(page: Page): Promise<RowArea> {
  return page.evaluate((selector: string) => {
    const bars = Array.from(document.querySelectorAll(selector)).map((one) => one.getBoundingClientRect())
    const down = bars.filter((box) => box.height > box.width)
    const across = bars.filter((box) => box.width > box.height)
    if (down.length !== 1 || across.length !== 1) throw new Error(`${down.length} vertical and ${across.length} horizontal Scrollbars`)
    return { top: down[0]?.y ?? Number.NaN, bottom: down[0]?.bottom ?? Number.NaN, scrollbarTop: across[0]?.y ?? Number.NaN }
  }, SCROLLBARS)
}

/** @purity non-pure */
async function scrollToTheEnd(page: Page): Promise<void> {
  const canvas = await page.evaluate((selector: string) => {
    const box = document.querySelector(selector)?.getBoundingClientRect()
    return box === undefined ? null : { x: box.x + box.width / 2, y: box.y + box.height / 2 }
  }, CANVAS)
  if (canvas === null) throw new Error('no Schedule Canvas')
  await page.mouse.move(canvas.x, canvas.y)
  let last = ''
  for (let turn = 0; turn < 60; turn += 1) {
    await page.mouse.wheel(0, 600)
    await page.waitForTimeout(150)
    const seen = JSON.stringify((await drawnRows(page)).map((row) => [row.id, row.box.y]))
    if (seen === last) return
    last = seen
  }
  throw new Error('the rows kept moving after 60 turns of the wheel')
}

/** @purity non-pure */
async function hoverAndRead(page: Page, id: string): Promise<DrawnRow> {
  const spot = await nameSpotOf(page, id)
  await page.mouse.move(spot.x, spot.y)
  await page.waitForTimeout(400)
  return rowById(page, id)
}

test.describe('LF-16 / HF-19 (MUST): the last row keeps room for its lattice', () => {
  test('scrolled to the end, the whole lattice of the last row is inside the Row Area', async ({ baseURL }) => {
    test.setTimeout(180_000)
    const opened = await openWith(baseURL, 60)
    try {
      const { page } = opened
      const area = await rowAreaOf(page)
      expect((await drawnRows(page)).map((row) => row.id), 'the premise: the last row starts off the screen').not.toContain('r59')
      await scrollToTheEnd(page)
      const shown = await hoverAndRead(page, 'r59')
      if (shown.grid === null || shown.entrance === null) throw new Error('the last row draws no lattice')
      expect(shown.grid.height, 'the premise: the lattice is taller than the band').toBeGreaterThan(shown.box.height)
      expect(shown.grid.y + shown.grid.height, 'LF-16: the lattice bottom is inside the Row Area').toBeLessThanOrEqual(area.bottom + 0.5)
      const lowest = { x: shown.entrance.x + shown.entrance.width / 2, y: shown.entrance.y + shown.entrance.height - 1 }
      expect(await ownerAt(page, lowest), 'the lowest rank takes the pointer').toBe('r59')
    } finally {
      await opened.close()
    }
  })

  // see FR-055, T-109
  const FIT_ENTRANCE = ((): string => {
    const found = specTable('T-109').rows.filter((row) => row.cells.some((cell) => /FR-055(?![0-9])/.test(cell)))
    if (found.length !== 1) throw new Error(`table T-109 has ${found.length} entrances governed by FR-055`)
    return found[0]?.id ?? ''
  })()

  // WHY: the Row Area is sized so that 40 one-lane rows fit and 40 rows plus the reserve do not; FR-055
  // (MUST) then has to settle on depth 1, and a fit that forgot LF-16 would draw depth 2 and cut the lattice.
  const fittedWith = async (baseURL: string | undefined, spare: (reserve: number) => number) => {
    const measuring = await openWith(baseURL, 20)
    let height = 0
    let band = 0
    let reserve = 0
    try {
      const area = await rowAreaOf(measuring.page)
      const first = await rowById(measuring.page, 'r0')
      band = first.box.height
      reserve = (first.grid?.height ?? Number.NaN) - band
      height = Math.round(BASE_SCREEN.height - (area.bottom - area.top) + 40 * band + spare(reserve))
    } finally {
      await measuring.close()
    }
    const opened = await openWith(baseURL, 20, { width: BASE_SCREEN.width, height })
    const { page } = opened
    const entrance = await page.evaluate((wanted: string) => {
      const box = document.querySelector(`[data-icon="${wanted}"]`)?.getBoundingClientRect()
      return box === undefined ? null : { x: box.x + box.width / 2, y: box.y + box.height / 2 }
    }, FIT_ENTRANCE)
    if (entrance === null) throw new Error(`the entrance ${FIT_ENTRANCE} is not drawn`)
    await pressAt(page, entrance)
    await page.waitForTimeout(800)
    await readSettledDrawnSvg(page)
    return { opened, area: await rowAreaOf(page), band, reserve, rows: await drawnRows(page) }
  }

  test('FR-055 (MUST): the fit refuses the depth whose rows fit only without the reserve', async ({ baseURL }) => {
    test.setTimeout(240_000)
    const fitted = await fittedWith(baseURL, (reserve) => reserve / 2)
    try {
      const height = fitted.area.bottom - fitted.area.top
      expect(height, 'the premise: 40 bands fit').toBeGreaterThan(40 * fitted.band - 0.5)
      expect(height, 'the premise: 40 bands and the reserve do not').toBeLessThan(40 * fitted.band + fitted.reserve)
      expect(fitted.rows.map((row) => row.id), 'depth 1 only: no child row is drawn').not.toContain('r0c')
      expect(fitted.rows).toHaveLength(20)
    } finally {
      await fitted.opened.close()
    }
  })

  test('the control: one reserve more of Row Area and the fit draws depth 2, the last lattice inside', async ({ baseURL }) => {
    test.setTimeout(240_000)
    const fitted = await fittedWith(baseURL, (reserve) => reserve + 2)
    try {
      const ids = fitted.rows.map((row) => row.id)
      expect(ids).toContain('r0c')
      expect(ids).toHaveLength(40)
      const shown = await hoverAndRead(fitted.opened.page, 'r19c')
      if (shown.grid === null) throw new Error('the last row draws no lattice')
      expect(shown.grid.y + shown.grid.height, 'LF-16: the last lattice is inside the Row Area').toBeLessThanOrEqual(fitted.area.bottom + 0.5)
    } finally {
      await fitted.opened.close()
    }
  })
})

test.describe('FR-051 / JDG-376 (MUST NOT): the group is not drawn into the horizontal Scrollbars band', () => {
  test('a row cut at the Row Area bottom, hovered, paints nothing of its group into the band', async ({ baseURL }) => {
    test.setTimeout(180_000)
    const opened = await openWith(baseURL, 60, BASE_SCREEN, 0.5)
    try {
      const { page } = opened
      const area = await rowAreaOf(page)
      const rows = await drawnRows(page)
      const cut = rows.find((row) => row.box.y < area.bottom - 2 && row.box.y + (row.grid?.height ?? 0) > area.scrollbarTop + 1)
      if (cut === undefined) throw new Error(`no lattice reaches past ${area.scrollbarTop}: ${JSON.stringify(rows.slice(-2))}`)
      const shown = await hoverAndRead(page, cut.id)
      expect(shown.entranceShown, `HF-6: hovering row ${cut.id} draws its group`).toBe(true)
      if (shown.grid === null) throw new Error(`row ${cut.id} draws no lattice`)
      const bottom = await page.evaluate(() => window.innerHeight)
      const intruders: string[] = []
      for (let y = Math.ceil(area.scrollbarTop) + 1; y < bottom; y += 2) {
        for (let x = Math.ceil(shown.grid.x); x < shown.grid.x + shown.grid.width; x += 2) {
          if ((await ownerAt(page, { x, y })) === cut.id) intruders.push(`${x},${y}`)
        }
      }
      expect(intruders.slice(0, 6), `FR-051 (MUST NOT): nothing of row ${cut.id} below y ${area.scrollbarTop}`).toEqual([])
    } finally {
      await opened.close()
    }
  })
})
