// One System sweep for the four clauses CR-354 put into the manuscript: FR-019, IV-19, HM-9 and HM-3 (table T-015a / T-220).

import { expect, test, type Browser, type Page } from '@playwright/test'
import { specTable, type SpecTable } from '../contract/spec-table'
import { CLEARING_UP_MS, launchReferenceBrowser, readSettledDrawnSvg, screenOf } from './live-app'
import { lastCellOf, rowOf } from './sws-case'

const T014: SpecTable = specTable('T-014')
const T015A: SpecTable = specTable('T-015a')
const T023B: SpecTable = specTable('T-023b')
const T023D: SpecTable = specTable('T-023d')
const T025: SpecTable = specTable('T-025')
const T109: SpecTable = specTable('T-109')
const T206: SpecTable = specTable('T-206')
const T220: SpecTable = specTable('T-220')

// see T-025, MC-6
const BASE_SCREEN = screenOf(rowOf(T025, 'MC-6'))

/** @purity pure */
function numberIn(cell: string, what: string): number {
  const found = /-?\d+(?:\.\d+)?/.exec(cell.replace(/`/g, ''))
  const value = Number(found?.[0] ?? '')
  if (!Number.isFinite(value)) {
    throw new Error(`${what} states no number this file can read: ${JSON.stringify(cell)}`)
  }
  return value
}

// see T-206, S-208, FR-019
const PRESS_OR_DRAG_PX = numberIn(
  rowOf(T206, 'S-208').cells[1] ?? '',
  'table T-206 row S-208',
)

// see T-014, ST-2
/** @purity pure */
function sortKeysOfSt2(): ReadonlyArray<{ readonly key: string; readonly ascending: boolean }> {
  const cell = lastCellOf(rowOf(T014, 'ST-2'))
  // WHY: given as code points, not literal characters, to keep non-ASCII text
  // WHY: out of this source file (U+6607 U+9806 ascending; U+964D U+9806 descending).
  const ASCENDING = String.fromCharCode(0x6607, 0x9806)
  const DESCENDING = String.fromCharCode(0x964d, 0x9806)
  const found: Array<{ key: string; ascending: boolean }> = []
  const pattern = /`([A-Za-z]+)`\s*(.)(.)/g
  let hit = pattern.exec(cell)
  while (hit !== null) {
    const key = hit[1] ?? ''
    const word = `${hit[2] ?? ''}${hit[3] ?? ''}`
    if (word === ASCENDING) found.push({ key, ascending: true })
    else if (word === DESCENDING) found.push({ key, ascending: false })
    hit = pattern.exec(cell)
  }
  if (found.length !== 3) {
    throw new Error(
      `table T-014 row ST-2 states ${found.length} ordered keys this file can read, and it needs 3`,
    )
  }
  return found
}

const ST2_KEYS = sortKeysOfSt2()

/** @purity pure */
function entranceArming(holding: string): string {
  const wanted = new RegExp(`${holding}(?![0-9])`)
  const found = T109.rows.filter((row) => wanted.test(lastCellOf(row)))
  if (found.length !== 1) {
    throw new Error(`table T-109 has ${found.length} entrances arming ${holding}, and it needs one`)
  }
  return found[0]?.id ?? ''
}

// see T-023b, AR-6
const HIGHLIGHT_BOX_ENTRANCE = entranceArming(rowOf(T023B, 'AR-6').id)

/** @purity pure */
function entranceServing(requirement: string, place: string): string {
  const wanted = new RegExp(`${requirement}(?![0-9])`)
  const found = T109.rows.filter(
    (row) => wanted.test(row.cells[3] ?? '') && (row.cells[0] ?? '').includes(place),
  )
  if (found.length !== 1) {
    throw new Error(
      `table T-109 has ${found.length} entrances of ${place} serving ${requirement}, and it needs one`,
    )
  }
  return found[0]?.id ?? ''
}

const ROW_PIN_ENTRANCE = entranceServing('FR-098', 'Row Title Panel')
const AGENT_API_ENTRANCE = entranceServing('FR-065', 'App Header')

const HM_3 = rowOf(T015A, 'HM-3').id
const HM_8 = rowOf(T015A, 'HM-8').id
const HM_9 = rowOf(T015A, 'HM-9').id
const IV_19 = rowOf(T220, 'IV-19').id
// see T-023d, GR-20
const GR_20 = rowOf(T023D, 'GR-20').id

interface DocGroup {
  readonly id: string
  readonly parentId: string | null
  readonly order: number
  readonly label: string | null
  readonly derivedFromTaskUid: number | null
}

interface DocTask {
  readonly uid: number
  readonly wbsParentUid: number | null
  readonly wbsOrder: number | null
  readonly start: string | null
  readonly finish: string | null
}

interface DocBox {
  readonly id: string
  readonly startDate: string | null
  readonly endDate: string | null
  readonly topGroupId: string | null
  readonly bottomGroupId: string | null
}

interface DocShot {
  readonly groups: readonly DocGroup[]
  readonly tasks: readonly DocTask[]
  readonly boxes: readonly DocBox[]
  readonly members: ReadonlyArray<{ readonly taskUid: number; readonly groupId: string }>
}

interface DrawnRow {
  readonly id: string
  readonly depth: number
  readonly pinned: boolean
  readonly label: string
  readonly y: number
  readonly height: number
}

// see T-058, AT-52, AT-55, FR-019, HM-9
/** @purity pure */
function rankInRowTree(groups: readonly DocGroup[]): ReadonlyMap<string, number> {
  const children = new Map<string | null, DocGroup[]>()
  for (const group of groups) {
    const kin = children.get(group.parentId) ?? []
    kin.push(group)
    children.set(group.parentId, kin)
  }
  for (const kin of children.values()) kin.sort((a, b) => a.order - b.order)
  const rank = new Map<string, number>()
  const walk = (parent: string | null): void => {
    for (const group of children.get(parent) ?? []) {
      rank.set(group.id, rank.size)
      walk(group.id)
    }
  }
  walk(null)
  return rank
}

/** @purity pure */
function nameOf(groups: readonly DocGroup[], id: string | null): string {
  const group = groups.find((one) => one.id === id)
  return `${group?.label ?? '(no label)'} <${String(id).slice(0, 8)}>`
}

let browser: Browser | null = null

test.beforeAll(async () => {
  browser = await launchReferenceBrowser()
})

test.afterAll(async () => {
  // WHY: this raises the hook's own timeout, not an assertion's; see CLEARING_UP_MS.
  test.setTimeout(CLEARING_UP_MS)
  await browser?.close()
})

const CANVAS_PART = '[data-role="Schedule Canvas"]'
const CANVAS_SVG = '[data-role="Schedule Canvas"] svg'
const ROW_PANEL = '[data-role="Row Title Panel"]'

interface Opened {
  readonly page: Page
  close(): Promise<void>
}

/** @purity non-pure */
async function openTheApp(baseURL: string | undefined): Promise<Opened> {
  if (baseURL === undefined) {
    throw new Error('playwright.config.ts declares no baseURL for the running application')
  }
  if (browser === null) throw new Error('the reference browser was not opened')
  const context = await browser.newContext({ baseURL, viewport: BASE_SCREEN })
  const page = await context.newPage()
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

// WHY: a real pointer, not element.click() -- a synthetic click has reached
// WHY: nothing in this project before, because the shell reads the pointer.
/** @purity non-pure */
async function pressAt(page: Page, at: { x: number; y: number }): Promise<void> {
  await page.mouse.move(at.x, at.y)
  await page.mouse.down()
  await page.mouse.up()
}

/** @purity non-pure */
async function pressEntrance(page: Page, icon: string): Promise<boolean> {
  const at = await page.evaluate((wanted: string) => {
    const entry = document.querySelector(`[data-icon="${wanted}"]`)
    if (entry === null) return null
    const box = entry.getBoundingClientRect()
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
  }, icon)
  if (at === null) return false
  await pressAt(page, at)
  await page.waitForTimeout(500)
  return true
}

// see T-051, HF-6
/** @purity non-pure */
async function pressEntranceInRow(page: Page, index: number, icon: string): Promise<boolean> {
  const hover = await page.evaluate((wanted: number) => {
    const row = Array.from(document.querySelectorAll('[data-depth]'))[wanted]
    const name = row?.querySelector('span')
    if (name === null || name === undefined) return null
    const box = name.getBoundingClientRect()
    return { x: box.x + 4, y: box.y + box.height / 2 }
  }, index)
  if (hover === null) return false
  await page.mouse.move(hover.x, hover.y)
  await page.waitForTimeout(400)
  const at = await page.evaluate(
    (asked: { index: number; icon: string }) => {
      const row = Array.from(document.querySelectorAll('[data-depth]'))[asked.index]
      const entry = row?.querySelector(`[data-icon="${asked.icon}"]`)
      if (entry === null || entry === undefined) return null
      const box = entry.getBoundingClientRect()
      if (box.width === 0 || box.height === 0) return null
      return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
    },
    { index, icon },
  )
  if (at === null) return false
  await pressAt(page, at)
  await page.waitForTimeout(700)
  return true
}

/** @purity semi-pure-b */
async function drawnRows(page: Page): Promise<DrawnRow[]> {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('[data-depth]')).map((row) => {
      const box = row.getBoundingClientRect()
      return {
        id: row.getAttribute('data-group-id') ?? '',
        depth: Number(row.getAttribute('data-depth')),
        pinned: row.getAttribute('data-pinned') === 'true',
        label: (row.querySelector('span')?.textContent ?? '').trim(),
        y: Math.round(box.y),
        height: Math.round(box.height),
      }
    }),
  )
}

// see T-107, AM-3, AG-4, FR-065
/** @purity semi-pure-b */
async function readDocumentShot(page: Page): Promise<DocShot | null> {
  return page.evaluate(() => {
    const api = (window as unknown as { grSchedulerAgentApi?: { readDocument(): unknown } })
      .grSchedulerAgentApi
    if (api === undefined) return null
    const schedule = (api.readDocument() as { schedule: Record<string, unknown> }).schedule
    return {
      groups: schedule.taskGroups,
      tasks: schedule.tasks,
      boxes: schedule.highlightBoxes,
      members: schedule.taskGroupMembers,
    } as unknown as DocShot
  })
}

// see T-028, IN-2
/** @purity non-pure */
async function cursorAt(page: Page, x: number, y: number): Promise<string> {
  await page.mouse.move(x, y)
  return page.evaluate((part: string) => {
    const surface = document.querySelector(part)
    return surface instanceof HTMLElement ? surface.style.cursor : ''
  }, CANVAS_PART)
}

/** @purity pure */
const REACH_PX = 160

// see T-023a, PTD-5, AR-6
/** @purity non-pure */
async function emptyColumnAcross(
  page: Page,
  first: DrawnRow,
  second: DrawnRow,
): Promise<number | null> {
  const left = Math.round(
    await page.evaluate(
      (panel: string) => document.querySelector(panel)?.getBoundingClientRect().right ?? 0,
      ROW_PANEL,
    ),
  )
  const yFirst = first.y + Math.round(first.height / 2)
  const ySecond = second.y + Math.round(second.height / 2)
  for (let x = left + 80; x < BASE_SCREEN.width - 260 - REACH_PX; x += 24) {
    if ((await cursorAt(page, x, yFirst)) !== 'default') continue
    if ((await cursorAt(page, x, ySecond)) !== 'default') continue
    if ((await cursorAt(page, x + REACH_PX, yFirst)) !== 'default') continue
    if ((await cursorAt(page, x + REACH_PX, ySecond)) !== 'default') continue
    return x
  }
  return null
}

/** @purity non-pure */
async function dragBetween(
  page: Page,
  from: { x: number; y: number },
  to: { x: number; y: number },
): Promise<void> {
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(
    from.x + Math.sign(to.x - from.x) * 40,
    from.y + Math.sign(to.y - from.y) * 15,
    { steps: 5 },
  )
  await page.mouse.move(to.x, to.y, { steps: 12 })
  await page.mouse.up()
  await page.waitForTimeout(900)
}

/** @purity semi-pure-b */
async function drawnOutlines(
  page: Page,
): Promise<Array<{ y: number; height: number; x: number; width: number }>> {
  return page.evaluate(
    (selector: string) =>
      Array.from(document.querySelector(selector)?.querySelectorAll('rect') ?? [])
        .filter((one) => one.getAttribute('fill') === 'none' && one.getAttribute('rx') !== null)
        .map((one) => ({
          x: Number(one.getAttribute('x')),
          y: Number(one.getAttribute('y')),
          width: Number(one.getAttribute('width')),
          height: Number(one.getAttribute('height')),
        })),
    CANVAS_SVG,
  )
}

// see T-023d, GA-9
/** @purity non-pure */
async function barBodyOn(page: Page, row: DrawnRow): Promise<{ x: number; y: number } | null> {
  const left = Math.round(
    await page.evaluate(
      (panel: string) => document.querySelector(panel)?.getBoundingClientRect().right ?? 0,
      ROW_PANEL,
    ),
  )
  for (let x = left + 100; x < BASE_SCREEN.width - 260; x += 8) {
    for (const offset of [-20, 0, 20, 40]) {
      const y = row.y + Math.round(row.height / 2) + offset
      if (y < row.y + 6 || y > row.y + row.height - 6) continue
      // see T-028, IN-2
      if ((await cursorAt(page, x, y)) === 'grab') return { x, y }
    }
  }
  return null
}

/**
 * The centre of the grab strip `GR-20` of table T-023d lays on one row.
 *
 * ⭐ Held verbatim -- row `GR-20` (table T-023d):
 * 「行の左端に敷く掴み代」, and 「行の左端とは、その行の字下げの後ろである
 * （MUST）—— 掴み代は行の名前の直前に立ち、段の字下げとともに動くこと
 * （MUST）」, ⛔「パネルの左端に揃えてはならない（MUST NOT）」.
 *
 * ⛔⛔ SO NO x IS WRITTEN HERE, AND NONE MAY BE. The strip's x is a function of
 * the row's depth, and its width is `S-138` of table T-206 -- a settings value
 * that is nobody's to copy. The strip's own box is read off the drawn page
 * instead, so a change to either the indent or `S-138` moves this point with it.
 * ⚠️ Measured 2026-09-05 on the shipped build: at depth 2 the strip ran
 * x 32..48 and the row's name began at x 52, so a press at x=60 -- what this
 * file did until today -- landed on the NAME and never on the strip.
 *
 * ⛔ `null` ALSO MEANS 「掴めない」 AND NOT ONLY 「見つからない」. GR-20 (MUST
 * NOT): 「ピン止めしている行は掴めないこと」, and the drawing side keeps that by
 * laying no strip at all on a pinned row -- so a pinned row answers `null` here.
 *
 * @purity semi-pure-b
 */
async function grabStripCentreOn(
  page: Page,
  id: string,
): Promise<{ x: number; y: number } | null> {
  return page.evaluate((wanted: string) => {
    const row = Array.from(document.querySelectorAll('[data-depth]')).find(
      (one) => one.getAttribute('data-group-id') === wanted,
    )
    const strip = row?.querySelector('[data-row-grab]')
    if (strip === null || strip === undefined) return null
    const box = strip.getBoundingClientRect()
    if (box.width === 0 || box.height === 0) return null
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
  }, id)
}

// see T-014, ST-2
/** @purity pure */
function beforeUnderSt2(left: DocTask, right: DocTask): number {
  const cellOf = (task: DocTask, key: string): string | number | null =>
    (task as unknown as Record<string, string | number | null>)[key] ?? null
  for (const { key, ascending } of ST2_KEYS) {
    const a = cellOf(left, key)
    const b = cellOf(right, key)
    if (a === null || b === null || a === b) continue
    const order =
      typeof a === 'number' && typeof b === 'number'
        ? a < b
          ? -1
          : 1
        : String(a) < String(b)
          ? -1
          : 1
    return ascending ? order : -order
  }
  return 0
}

test('the row tree, and not the screen, decides what is below (FR-019 / IV-19 / HM-9 / HM-3)', async ({
  baseURL,
}) => {
  test.setTimeout(600_000)

  {
    const opened = await openTheApp(baseURL)
    const page = opened.page
    try {
      expect
        .soft(await pressEntrance(page, AGENT_API_ENTRANCE), `${AGENT_API_ENTRANCE} is on the screen`)
        .toBe(true)
      const before = await readDocumentShot(page)
      expect.soft(before, 'FR-065: pressing that entrance published the Agent API').not.toBeNull()

      const rows = await drawnRows(page)
      expect.soft(rows.length, 'the panel draws rows to work with').toBeGreaterThan(3)
      const rank = rankInRowTree(before?.groups ?? [])

      let placed = false
      for (let upper = 0; upper < rows.length - 1 && !placed; upper += 1) {
        for (let lower = upper + 1; lower < rows.length && !placed; lower += 1) {
          const x = await emptyColumnAcross(page, rows[upper] as DrawnRow, rows[lower] as DrawnRow)
          if (x === null) continue
          const high = rows[upper] as DrawnRow
          const low = rows[lower] as DrawnRow
          expect
            .soft(await pressEntrance(page, HIGHLIGHT_BOX_ENTRANCE), `${HIGHLIGHT_BOX_ENTRANCE} is on the screen`)
            .toBe(true)
          // ⭐ Held verbatim -- check 39 (must-clause-coverage), row `FR-019`,
          // manuscript text ending at its own marker:
          // 「⛔⛔ **ハイライトボックスはドラッグでのみ置くこと（MUST）。クリックでは置かないこと（MUST NOT）」
          expect
            .soft(REACH_PX, 'the drag travels further than S-208, so it is a drag')
            .toBeGreaterThan(PRESS_OR_DRAG_PX)
          await dragBetween(
            page,
            { x: x + REACH_PX, y: low.y + Math.round(low.height / 2) },
            { x, y: high.y + Math.round(high.height / 2) },
          )
          const after = await readDocumentShot(page)
          const box = after?.boxes[0]
          expect.soft(after?.boxes.length ?? -1, 'FR-019: the drag placed one highlight box').toBe(1)
          if (box !== undefined) {
            placed = true
            // ⭐ Held verbatim -- check 39, row `FR-019`, manuscript text ending
            // at its own marker:
            // 「）—— **`startDate` が `endDate` より後のとき、および `topGroupId` が `bottomGroupId` より下のときは、入れ替えて持つこと（MUST）。**⛔ **拒んではならない（MUST NOT）」
            expect
              .soft(
                String(box.startDate) <= String(box.endDate),
                `${IV_19} / FR-019: startDate ${box.startDate} is not after endDate ${box.endDate}`,
              )
              .toBe(true)
            // ⭐ Held verbatim -- check 39, row `FR-019`, manuscript text ending
            // at its own marker:
            // 「— **そちらは `05-07-design.md` の 表 T-220 の `IV-10` と同じ扱いで拒む。**⛔⛔ **その「下」は、行の木における順位で判ずること（MUST）。画面に描かれた位置で判じてはならない（MUST NOT）」
            expect
              .soft(
                (rank.get(String(box.topGroupId)) ?? -1) < (rank.get(String(box.bottomGroupId)) ?? -1),
                `${IV_19} / FR-019 (control, nothing pinned): the top row must rank earlier in the ` +
                  `row tree than the bottom one -- top ${nameOf(after?.groups ?? [], box.topGroupId)} ` +
                  `is at ${String(rank.get(String(box.topGroupId)))}, bottom ` +
                  `${nameOf(after?.groups ?? [], box.bottomGroupId)} at ` +
                  `${String(rank.get(String(box.bottomGroupId)))}`,
              )
              .toBe(true)
          }
        }
      }
      expect.soft(placed, 'a pair of drawn rows shares a column of empty ground').toBe(true)
    } finally {
      await opened.close()
    }
  }

  {
    const opened = await openTheApp(baseURL)
    const page = opened.page
    try {
      await pressEntrance(page, AGENT_API_ENTRANCE)
      const before = await drawnRows(page)
      const last = before.length - 1
      expect
        .soft(
          await pressEntranceInRow(page, last, ROW_PIN_ENTRANCE),
          `FR-098: ${ROW_PIN_ENTRANCE} is drawn in every row of the panel`,
        )
        .toBe(true)

      const rows = await drawnRows(page)
      const shot = await readDocumentShot(page)
      const rank = rankInRowTree(shot?.groups ?? [])
      const pinnedIndex = rows.findIndex((one) => one.pinned)
      expect.soft(pinnedIndex, 'FR-098: the pinned row is drawn first, at the top of Row Area').toBe(0)

      const pinned = rows[pinnedIndex < 0 ? 0 : pinnedIndex] as DrawnRow
      const others = rows.filter((one) => !one.pinned)
      const later = others.filter((one) => (rank.get(one.id) ?? 0) < (rank.get(pinned.id) ?? 0))
      expect
        .soft(
          later.length,
          'the fixture needs at least one drawn row that the row tree puts BEFORE the pinned one ' +
            'while the screen puts it after',
        )
        .toBeGreaterThan(0)

      let judged = false
      for (const other of later) {
        if (judged) break
        const x = await emptyColumnAcross(page, pinned, other)
        if (x === null) continue
        const outlinesBefore = (await drawnOutlines(page)).length
        await pressEntrance(page, HIGHLIGHT_BOX_ENTRANCE)
        await dragBetween(
          page,
          { x, y: pinned.y + Math.round(pinned.height / 2) },
          { x: x + REACH_PX, y: other.y + Math.round(other.height / 2) },
        )
        const after = await readDocumentShot(page)
        const box = after?.boxes[0]
        expect.soft(after?.boxes.length ?? -1, 'FR-019: the drag placed one highlight box').toBe(1)
        if (box === undefined) continue
        judged = true

        // ⭐ Held verbatim -- check 39, row `FR-019`, the same marker window as
        // the control case above:
        // 「— **そちらは `05-07-design.md` の 表 T-220 の `IV-10` と同じ扱いで拒む。**⛔⛔ **その「下」は、行の木における順位で判ずること（MUST）。画面に描かれた位置で判じてはならない（MUST NOT）」
        expect
          .soft(
            (rank.get(String(box.topGroupId)) ?? -1) < (rank.get(String(box.bottomGroupId)) ?? -1),
            `${IV_19} / FR-019: with ${pinned.label} pinned to the top of the screen, "below" must ` +
              'still be read off the ROW TREE and never off the drawn position -- expected top ' +
              `${nameOf(after?.groups ?? [], other.id)} (tree rank ${String(rank.get(other.id))}), ` +
              `got top ${nameOf(after?.groups ?? [], box.topGroupId)} (tree rank ` +
              `${String(rank.get(String(box.topGroupId)))}) and bottom ` +
              `${nameOf(after?.groups ?? [], box.bottomGroupId)} (tree rank ` +
              `${String(rank.get(String(box.bottomGroupId)))})`,
          )
          .toBe(true)

        // ⭐ Held verbatim -- check 39, row `FR-019`, manuscript text ending at
        // its own marker:
        // 「* —— **同じファイルを、留めていない人が開いても同じ意味でなければならない。**⭐⭐ **描く側は逆である** —— **画面に出ている 2 つの行を囲んで描くこと（MUST）。**⛔ **木の順で描いてはならない（MUST NOT）」
        const outlines = await drawnOutlines(page)
        expect
          .soft(outlines.length, 'FR-019: the placed highlight box is drawn as an outline')
          .toBeGreaterThan(outlinesBefore)
        const wantedTop = Math.min(pinned.y, other.y)
        const wantedBottom = Math.max(pinned.y + pinned.height, other.y + other.height)
        const enclosing = outlines.filter(
          (one) => one.y <= wantedTop + 2 && one.y + one.height >= wantedBottom - 2,
        )
        expect
          .soft(
            enclosing.length,
            `FR-019: the drawing must enclose the two rows AS THE SCREEN HAS THEM -- ` +
              `${wantedTop}..${wantedBottom}px covering ${pinned.label} and ${other.label}; ` +
              `outlines drawn: ${JSON.stringify(outlines)}`,
          )
          .toBeGreaterThan(0)
      }
      expect.soft(judged, 'the pinned row shares a column of empty ground with a tree-earlier row').toBe(true)
    } finally {
      await opened.close()
    }
  }

  {
    const opened = await openTheApp(baseURL)
    const page = opened.page
    try {
      await pressEntrance(page, AGENT_API_ENTRANCE)
      const rows = await drawnRows(page)
      const before = await readDocumentShot(page)
      const rank = rankInRowTree(before?.groups ?? [])
      const homeOf = new Map((before?.members ?? []).map((one) => [one.taskUid, one.groupId]))

      const source = rows.find((one) => {
        const held = (before?.tasks ?? []).filter((task) => homeOf.get(task.uid) === one.id)
        return held.length >= 2 && held.every((task) => task.wbsParentUid === held[0]?.wbsParentUid)
      })
      const destination = rows.find(
        (one) => source !== undefined && (rank.get(one.id) ?? 0) > (rank.get(source.id) ?? 0),
      )
      expect.soft(source, 'one drawn row holds two or more WBS siblings').not.toBeUndefined()
      expect.soft(destination, 'another drawn row sits later in the row tree').not.toBeUndefined()

      if (source !== undefined && destination !== undefined) {
        const moved: number[] = []
        for (let attempt = 0; attempt < 2; attempt += 1) {
          const grab = await barBodyOn(page, source)
          if (grab === null) break
          await dragBetween(page, grab, {
            x: grab.x,
            y: destination.y + Math.round(destination.height / 2),
          })
          const now = await readDocumentShot(page)
          const nowHome = new Map((now?.members ?? []).map((one) => [one.taskUid, one.groupId]))
          for (const [uid, home] of nowHome) {
            if (home === destination.id && homeOf.get(uid) === source.id && !moved.includes(uid)) {
              moved.push(uid)
            }
          }
        }
        expect
          .soft(
            moved.length,
            `${HM_3} / GA-9 of table T-023d: dragging a plan bar down onto ${destination.label} ` +
              'puts it on that row',
          )
          .toBeGreaterThan(0)

        const after = await readDocumentShot(page)
        const afterHome = new Map((after?.members ?? []).map((one) => [one.taskUid, one.groupId]))

        // ⭐ Held verbatim -- check 39, row `HM-3` (table T-015a), manuscript
        // text ending at its own marker:
        // 「| HM-3 | **タスクバーを別の行へ移す操作では WBS の親を変えてはならない（MUST NOT）」
        for (const uid of moved) {
          const was = (before?.tasks ?? []).find((one) => one.uid === uid)
          const is = (after?.tasks ?? []).find((one) => one.uid === uid)
          expect
            .soft(
              is?.wbsParentUid ?? null,
              `${HM_3} (MUST NOT): moving task ${uid} to another row must not change its WBS parent`,
            )
            .toBe(was?.wbsParentUid ?? null)
        }

        // ⭐ Held verbatim -- check 39, row `HM-9` (table T-015a), manuscript
        // text ending at its own marker:
        // 「トするでよい」）—— **各 `Task` の、同じ WBS 親を持つ兄弟の中での順位は、その `Task` を描いている行の、行の木における位置で決めること（MUST）。**⛔ **画面に描かれた位置で決めてはならない（MUST NOT）」
        for (const uid of moved) {
          const one = (after?.tasks ?? []).find((task) => task.uid === uid)
          if (one === undefined) continue
          const siblings = (after?.tasks ?? []).filter(
            (task) => task.wbsParentUid === one.wbsParentUid,
          )
          const wrong = siblings.filter((other) => {
            if (other.uid === one.uid) return false
            const here = rank.get(String(afterHome.get(one.uid))) ?? 0
            const there = rank.get(String(afterHome.get(other.uid))) ?? 0
            if (here === there) return false
            const byRow = here < there ? -1 : 1
            const byOrder = (one.wbsOrder ?? 0) < (other.wbsOrder ?? 0) ? -1 : 1
            return byRow !== byOrder
          })
          expect
            .soft(
              wrong.length,
              `${HM_9} / ${HM_3}: task ${uid} now sits on ${destination.label} (tree rank ` +
                `${String(rank.get(destination.id))}), so among its WBS siblings it must rank by ` +
                `that row's place in the row tree; ${wrong.length} of ${siblings.length - 1} ` +
                `siblings disagree (its wbsOrder is still ${String(one.wbsOrder)})`,
            )
            .toBe(0)
        }

        // ⭐ Held verbatim -- check 39, row `HM-9` (table T-015a), manuscript
        // text ending at its own marker:
        // 「た位置で決めてはならない（MUST NOT）** —— **ピン留め（`FR-098`）と畳みは画面から行を動かすが、書き出しは動かない。**⭐ 同じ行に兄弟が複数いるときは 表 T-014 の `ST-2` の順とすること（MUST）」
        if (moved.length >= 2) {
          const pair = moved
            .map((uid) => (after?.tasks ?? []).find((task) => task.uid === uid))
            .filter((task): task is DocTask => task !== undefined)
          const [left, right] = [pair[0] as DocTask, pair[1] as DocTask]
          const expected = beforeUnderSt2(left, right)
          const actual = (left.wbsOrder ?? 0) < (right.wbsOrder ?? 0) ? -1 : 1
          expect
            .soft(
              expected === 0 || expected === actual,
              `${HM_9} -> ST-2 of table T-014: tasks ${left.uid} and ${right.uid} share one row, so ` +
                `the table's three keys settle their order; keys ` +
                `${JSON.stringify(ST2_KEYS)} want ${expected < 0 ? left.uid : right.uid} first, ` +
                `wbsOrder has ${actual < 0 ? left.uid : right.uid} first`,
            )
            .toBe(true)
        }
      }
    } finally {
      await opened.close()
    }
  }

  {
    const opened = await openTheApp(baseURL)
    const page = opened.page
    try {
      await pressEntrance(page, AGENT_API_ENTRANCE)
      const rows = await drawnRows(page)
      const before = await readDocumentShot(page)
      const groups = before?.groups ?? []
      // ⛔ GR-20 (MUST NOT): 「ピン止めしている行は掴めないこと」. FR-098 lifts a
      // pinned row to the head of the panel and the drawing side keeps the MUST
      // NOT by laying no strip on it at all -- so a pinned row is dropped before
      // a pair is picked, rather than being grabbed at a point that is not there.
      const pair = rows
        .filter((row) => !row.pinned)
        .map((row) => groups.find((group) => group.id === row.id))
        .filter((group): group is DocGroup => group !== undefined)
      const sibling = pair.find(
        (group, at) => at > 0 && pair[at - 1]?.parentId === group.parentId,
      )
      const above = pair[pair.indexOf(sibling as DocGroup) - 1]
      expect.soft(sibling, 'two drawn rows are siblings under one parent').not.toBeUndefined()

      // ⭐ Held verbatim -- check 39, row `HM-8` (table T-015a), manuscript
      // text ending at its own marker:
      // 「| HM-8 | **兄弟どうしの並べ替えができること（MUST）」
      // ⭐ Held verbatim -- check 39, row `HM-9` (table T-015a), the row's own
      // opening marker (what this drag ultimately feeds into `HM-9` for):
      // 「| HM-9 | 並べ替えた順序も WBS へ伝わること（MUST）」
      const grab = sibling === undefined ? null : await grabStripCentreOn(page, sibling.id)
      expect
        .soft(grab, `${GR_20} (MUST) lays a grab strip on the row this drag takes hold of`)
        .not.toBeNull()

      if (sibling !== undefined && above !== undefined && grab !== null) {
        const to = rows.find((one) => one.id === above.id) as DrawnRow
        // ⭐ THE GRAB IS TAKEN WHERE GR-20 PUT IT, read off the drawn row --
        // see `grabStripCentreOn`. ⛔ No x is written here, because GR-20 (MUST)
        // 「掴み代は行の名前の直前に立ち、段の字下げとともに動くこと」 moves the
        // strip with the row's depth, and until today this case pressed a fixed
        // x=60 that stood on the row's NAME.
        // ⛔ THE SAME x AT BOTH ENDS: `HF-15` (MUST) settles the axis on the
        // first travel past `S-208`, and this case is about the POSITION axis.
        await dragBetween(page, grab, { x: grab.x, y: to.y + 8 })
        const after = await readDocumentShot(page)
        const now = (after?.groups ?? []).find((one) => one.id === sibling.id)
        expect
          .soft(
            now?.order ?? sibling.order,
            `${HM_8} (MUST): a drag in the row title panel reorders siblings -- this is the only ` +
              `entrance ${HM_9} has, so nothing can carry a reordering into the WBS without it. ` +
              `Dragged ${sibling.label ?? ''} above ${above.label ?? ''}; its order was ` +
              `${sibling.order}`,
          )
          .toBeLessThan(sibling.order)
      }
    } finally {
      await opened.close()
    }
  }
})
