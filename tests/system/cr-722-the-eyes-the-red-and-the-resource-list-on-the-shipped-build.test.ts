// CR-722 on the shipped build: the Resource List window, each eye IC-143, the product drawn, the red (TV-12), the bar (TV-11), closing (TV-8), the jump (SJ-0) and AM-26 / AM-27.

import { expect, test, type Browser, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { bare, specTable, unbroken } from '../contract/spec-table'
import { validateDocument } from '../fixtures/grs-document'
import { CLEARING_UP_MS, launchReferenceBrowser, readSettledDrawnSvg } from './live-app'
import { keyOf, openDocument, openStage, pressEntrance, saveDocument, settle, type Stage } from './cr-570-tree-state-stage'
import { rowOf } from './sws-case'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

const TV_12_RED =
  'スケジュールフィルタを掛けている表の `IC-143` と、その表を開く起動アイコン（検索パネルは `IC-117`、遅延診断レポートは `IC-107`、担当リストはコマンドパレットの `IC-62`）を、`FR-029` の 表 T-237 の `EN-8` で描くこと（MUST）'
const TV_12_NOT_RED = '⛔ スケジュールフィルタを掛けていない表の入口を赤くしてはならない（MUST NOT）'
const FR_099_NOT_SAVED =
  '⛔ ウィンドウの状態（出ているか・位置・大きさ・語・列のフィルタ・並べ替え・列の幅・選択）を文書に保存してはならない（MUST NOT）'
const EN_8_ROW = 'その入口の表のスケジュールフィルタを掛けている（`FR-151` の 表 T-353 の `TV-12` —— その表の `IC-143` と起動アイコン）'
const EN_TOP_WINS = '⛔ **1 つの入口に 2 行が同時に当たるときは、上の行が勝つこと（MUST）**'
const SJ_0_ONLY_THAT_ROW = 'スケジュールフィルタを掛けていてそのタスクを「表示」としない検索の表とレポートの表で、そのタスクの行だけを「表示」にし、担当リストの表がそのタスクを「表示」としないときは担当リストの表のスケジュールフィルタを解除してから、`SJ-2` 以降を行う。'
const SJ_0_KEEPS_HIDE = '担当の行の表示の列の値は変えない —— その担当のほかのタスクまで戻さない（利用者が定めた）。'
const TV_8_CLOSE = 'その表のウィンドウを閉じる（検索パネルは 表 T-330 の `SV-14`、遅延診断レポートの窓は 表 T-346 の `RW-1`、担当リストのウィンドウは 表 T-370 の `RO-1`）。'

const CLAUSES = [TV_12_RED, TV_12_NOT_RED, FR_099_NOT_SAVED, EN_TOP_WINS, SJ_0_ONLY_THAT_ROW, SJ_0_KEEPS_HIDE, TV_8_CLOSE]

test.describe('CR-722 the manuscript these cases are driven by', () => {
  for (const clause of CLAUSES) {
    test(`01-04 still says: ${clause.slice(-40)}`, () => {
      expect(REQUIREMENTS).toContain(clause)
    })
  }
  test('T-237 leads with EN-8, above EN-5', () => {
    const t237 = specTable('T-237')
    expect(t237.rows[0]?.id).toBe('EN-8')
    expect(unbroken(rowOf(t237, 'EN-8').cells[0] ?? '')).toBe(EN_8_ROW)
    expect(t237.rows.findIndex((one) => one.id === 'EN-8')).toBeLessThan(t237.rows.findIndex((one) => one.id === 'EN-5'))
  })
})

const roleOf = (id: string): string => `[data-role="${bare(rowOf(specTable('T-103'), id).cells[0] ?? '')}"]`
const PANEL = roleOf('U-64')
const REPORT = roleOf('U-66')
const RESOURCE_LIST = roleOf('U-49')
const BAND = roleOf('U-67')
const ICON = (id: string): string => rowOf(specTable('T-109'), id).id
const EYE = ICON('IC-143')
const OPEN_RESOURCE_LIST = ICON('IC-62')
const OPEN_SEARCH_ICON = ICON('IC-117')
const DIAGNOSE = ICON('IC-107')
const MINIMISE = ICON('IC-129')
const CLOSE = ICON('IC-52')
const SELECT_ALL = ICON('IC-63')
const OPEN_SEARCH = keyOf('SK-24')

// see S-543, S-544
const colourOf = (id: string, theme: '明るいテーマ' | '暗いテーマ'): string => {
  const hex = /#([0-9a-f]{6})/i.exec(rowOf(specTable('T-236'), id).by[theme] ?? '')?.[1] ?? ''
  const at = (from: number): number => parseInt(hex.slice(from, from + 2), 16)
  return `rgb(${String(at(0))}, ${String(at(2))}, ${String(at(4))})`
}
const RED_LIGHT = colourOf('S-543', '明るいテーマ')
const RED_DARK = colourOf('S-543', '暗いテーマ')
const GLYPH_DARK = colourOf('S-544', '暗いテーマ')

type Words = Record<'ja' | 'en', string>
const WORDS = JSON.parse(readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'display-words.json'), 'utf8')) as Record<
  string,
  readonly { readonly part?: string; readonly rowId?: string; readonly name?: string; readonly text?: Words; readonly heading?: Words }[]
>
const wordOf = (group: string, key: string): Words => {
  const found = (WORDS[group] ?? []).find((one) => one.part === key || one.rowId === key || one.name === key)
  const words = found?.text ?? found?.heading
  if (words === undefined) throw new Error(`the dictionary has no ${group}/${key}`)
  return words
}

const TEMPLATE = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
) as { $schema: string; schemaVersion: string; schedule: Record<string, any>; documentSettings: Record<string, unknown>; documentStamp: unknown }

const day = (dayOfMonth: number): string => `2026-01-${String(dayOfMonth).padStart(2, '0')}T00:00:00`
const CLEAR_OF_THE_PALETTE = '2025-12-20T00:00:00'
const TASK_GROUP = '5c000000-0000-4000-8000-000000007220'
const ALPHA = 1
const BRAVO = 2
const CHARLIE = 3
const DELTA = 4
const ECHO = 5
const ALL = [ALPHA, BRAVO, CHARLIE, DELTA, ECHO]
const NAMES: Readonly<Record<number, string>> = { [ALPHA]: 'Alpha', [BRAVO]: 'Bravo', [CHARLIE]: 'Charlie', [DELTA]: 'Delta', [ECHO]: 'Echo' }
const SATO = 'Sato Hanako'
const TANAKA = 'Tanaka Jiro'

const taskRow = (uid: number, from: number, to: number): Record<string, unknown> => ({
  uid,
  parentTaskUid: null,
  wbsOrder: uid,
  name: NAMES[uid],
  start: day(from),
  finish: day(to),
  milestone: false,
  deadline: null,
  notes: null,
  calendarUid: null,
  actualStart: null,
  actualFinish: null,
  stop: null,
  resume: null,
  resumeValid: null,
  percentComplete: 0,
  fadeInDays: null,
  fadeOutDays: null,
  dependencies: [],
  carry: {},
  carryElements: [],
})

// WHY: Sato carries Alpha and Charlie, Tanaka Bravo and Delta, and Echo has nobody (the (Unassigned) row holds one task).
/** @purity pure */
function fixture(): string {
  const group = TEMPLATE.schedule['taskGroups'][0] as Record<string, unknown>
  const resource = TEMPLATE.schedule['resources'][0] as Record<string, unknown>
  const tasks = [taskRow(ALPHA, 5, 9), taskRow(BRAVO, 6, 8), taskRow(CHARLIE, 12, 14), taskRow(DELTA, 13, 16), taskRow(ECHO, 15, 17)]
  const pairs = [
    [ALPHA, 2001],
    [BRAVO, 2002],
    [CHARLIE, 2001],
    [DELTA, 2002],
  ]
  const built = {
    '$schema': TEMPLATE['$schema'],
    schemaVersion: TEMPLATE.schemaVersion,
    schedule: {
      ...TEMPLATE.schedule,
      project: { ...TEMPLATE.schedule['project'], statusDate: '2026-01-20T17:00:00', uidHighWaterMark: 3000 },
      tasks,
      resources: [
        { ...resource, uid: 2001, name: SATO },
        { ...resource, uid: 2002, name: TANAKA },
      ],
      assignments: pairs.map(([taskUid, resourceUid], at) => ({ uid: 2101 + at, taskUid, resourceUid, carry: {}, carryElements: [] })),
      taskGroups: [{ ...group, id: TASK_GROUP, parentId: null, label: 'Row', order: 0, treeState: 'expanded', minHeight: null }],
      taskGroupMembers: tasks.map((one) => ({ taskUid: one['uid'], groupId: TASK_GROUP })),
      taskVisuals: tasks.map((one) => ({ taskUid: one['uid'], shapeKind: null, milestoneGlyph: null, fillColor: null, strokeColor: null, strokeWidthPx: null })),
      commentBoxes: [],
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
    },
    documentSettings: { ...TEMPLATE.documentSettings, zoomX: 6, scrollDate: CLEAR_OF_THE_PALETTE, scrollDayOffset: 0, scrollGroupId: TASK_GROUP, scrollGroupOffset: 0 },
    documentStamp: TEMPLATE.documentStamp,
    changeLog: [],
  }
  const checked = validateDocument(built)
  expect(checked.errors, 'the fixture is a document the schema accepts').toEqual([])
  return JSON.stringify(built)
}

interface Shown {
  readonly drawnTaskUids: readonly number[] | null
  readonly tables: readonly string[]
}

// see AM-26
/** @purity semi-pure-b */
async function readShown(page: Page): Promise<Shown> {
  const shown = await page.evaluate(() => {
    const api = (window as unknown as { grSchedulerAgentApi: { readShownTasks(): Shown } }).grSchedulerAgentApi
    return api.readShownTasks()
  })
  return { drawnTaskUids: shown.drawnTaskUids === null ? null : [...shown.drawnTaskUids].sort((a, b) => a - b), tables: [...shown.tables] }
}

// see AM-27
/** @purity non-pure */
async function showOnly(page: Page, taskUids: readonly number[] | null): Promise<void> {
  await page.evaluate((asked: readonly number[] | null) => {
    const api = (window as unknown as { grSchedulerAgentApi: { showOnlyTasks(taskUids: readonly number[] | null): unknown } }).grSchedulerAgentApi
    api.showOnlyTasks(asked)
  }, taskUids)
  await settle(page)
}

/** @purity semi-pure-b */
async function drawnTaskUids(page: Page): Promise<number[]> {
  const keys = await page.evaluate(() => Array.from(document.querySelectorAll('[data-figure^="task-"]')).map((one) => one.getAttribute('data-figure') ?? ''))
  return [...new Set(keys.map((key) => Number(/^task-(\d+)-/.exec(key)?.[1] ?? NaN)).filter((uid) => Number.isInteger(uid)))].sort((a, b) => a - b)
}

/** @purity non-pure */
async function press(page: Page, selector: string): Promise<void> {
  const box = await page.evaluate((wanted: string) => {
    const r = document.querySelector(wanted)?.getBoundingClientRect()
    return r === undefined ? null : { x: r.x + r.width / 2, y: r.y + r.height / 2 }
  }, selector)
  if (box === null) throw new Error(`${selector} is not on the screen`)
  await page.mouse.move(box.x, box.y)
  await page.mouse.down()
  await page.mouse.up()
  await settle(page)
}

/** @purity semi-pure-b */
async function textOf(page: Page, selector: string): Promise<string | null> {
  return page.evaluate((wanted: string) => document.querySelector(wanted)?.textContent ?? null, selector)
}

// WHY: the spec says the box is filled and the glyph drawn, not which element carries which; every colour in the entrance is read.
/** @purity semi-pure-b */
async function paintsOf(page: Page, selector: string): Promise<{ readonly fills: readonly string[]; readonly inks: readonly string[] }> {
  return page.evaluate((wanted: string) => {
    const top = document.querySelector(wanted)
    if (top === null) return { fills: [], inks: [] }
    const all = [top, ...Array.from(top.querySelectorAll('*'))]
    const fills = all.flatMap((one) => [getComputedStyle(one).backgroundColor, getComputedStyle(one).fill])
    const inks = all.flatMap((one) => [getComputedStyle(one).color, getComputedStyle(one).fill, getComputedStyle(one).stroke])
    return { fills, inks }
  }, selector)
}

const isRed = async (page: Page, selector: string, red: string = RED_LIGHT): Promise<boolean> => (await paintsOf(page, selector)).fills.includes(red)

// WHY: the word narrows the list (SV-4), the heading box then takes every listed row out of Show (SQ-10).
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

/** @purity semi-pure-b */
async function columnTexts(page: Page, window: string, column: string): Promise<string[]> {
  return page.evaluate(
    (asked: { window: string; column: string }) => {
      const headings = Array.from(document.querySelectorAll(`${asked.window} thead th`)).map((one) => one.getAttribute('data-column'))
      const at = headings.indexOf(asked.column)
      return Array.from(document.querySelectorAll(`${asked.window} tbody tr`)).map((row) => (row.children[at]?.textContent ?? '').trim())
    },
    { window, column },
  )
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
async function opened(scheme: 'light' | 'dark' = 'light'): Promise<Stage> {
  if (browser === null) throw new Error('no browser')
  const stage = await openStage(browser)
  if (scheme === 'dark') {
    await stage.page.emulateMedia({ colorScheme: 'dark' })
    await stage.page.reload()
    await readSettledDrawnSvg(stage.page)
  }
  await openDocument(stage.page, 'cr-722.json', fixture())
  return stage
}

const sentencesOf = (names: readonly string[], total: number, shown: number): readonly string[] =>
  (['ja', 'en'] as const).map((language) =>
    wordOf('searchPanel', 'scheduleFilterBar')
      [language].replace('{tables}', names.map((name) => wordOf('surfaces', name)[language]).join(wordOf('searchPanel', 'tableNameSeparator')[language]))
      .replace('{total}', String(total))
      .replace('{shown}', String(shown)),
  )

test.describe('CR-722 / FR-151 T-353 / FR-099 T-370 on the shipped build', () => {
  test.setTimeout(180_000)

  test('FR-099 (MUST): IC-62 opens the Resource List as a table window with the T-371 columns and the (Unassigned) row last', async () => {
    const stage = await opened()
    try {
      const { page } = stage
      await openResourceList(page)
      for (const icon of ['IC-153', 'IC-143', 'IC-127', 'IC-129', 'IC-130', 'IC-52']) {
        expect(await page.locator(`${RESOURCE_LIST} [data-icon="${ICON(icon)}"]`).count(), `RO-2: the title bar carries ${icon}`).toBeGreaterThan(0)
      }
      const headings = await page.evaluate((window: string) => Array.from(document.querySelectorAll(`${window} thead th`)).map((one) => one.getAttribute('data-column')), RESOURCE_LIST)
      expect(headings).toEqual(specTable('T-371').rows.map((one) => one.id))
      const names = await columnTexts(page, RESOURCE_LIST, 'RQ-2')
      expect(names).toEqual([SATO, TANAKA, expect.stringMatching(/./)])
      expect([wordOf('resourceList', 'unassigned').ja, wordOf('resourceList', 'unassigned').en]).toContain(names[2])
      expect(await columnTexts(page, RESOURCE_LIST, 'RQ-4'), 'RQ-4: two tasks each, one with nobody').toEqual(['2', '2', '1'])
      expect((await columnTexts(page, RESOURCE_LIST, 'RQ-5'))[2], 'RQ-5 of (Unassigned) is Echo').toContain(NAMES[ECHO])
      await press(page, `${RESOURCE_LIST} [data-icon="${SELECT_ALL}"]`)
      const marks = await page.evaluate(
        (window: string) => Array.from(document.querySelectorAll(`${window} tbody tr`)).map((row) => row.querySelectorAll('[data-icon="IC-67"], [data-icon="IC-68"]').length),
        RESOURCE_LIST,
      )
      expect(marks, 'RO-5: the (Unassigned) row has an empty RQ-3 and IC-63 does not choose it').toEqual([1, 1, 0])
    } finally {
      await stage.close()
    }
  })

  test(`FR-099 (MUST NOT): ${FR_099_NOT_SAVED.slice(-30)} -- nor the Resource List's Visibility and eye`, async () => {
    const stage = await opened()
    try {
      const { page } = stage
      const before = JSON.parse(await saveDocument(page)) as Record<string, unknown>
      await openResourceList(page)
      await hideListedIn(page, RESOURCE_LIST, TANAKA)
      await press(page, `${RESOURCE_LIST} [data-icon="${EYE}"]`)
      expect((await readShown(page)).tables, 'premise: the eye is on').toEqual(['resourceList'])
      const during = JSON.parse(await saveDocument(page)) as Record<string, unknown>
      expect(during['schedule']).toEqual(before['schedule'])
      expect(during['documentSettings']).toEqual(before['documentSettings'])
      expect(JSON.stringify(during)).not.toMatch(/resourceList|Resource List|hiddenKeys|isApplied|visibility/i)
    } finally {
      await stage.close()
    }
  })

  test(`TV-12 (MUST): ${TV_12_RED.slice(-30)} -- the search eye and IC-117 turn red, nothing else does`, async () => {
    const stage = await opened()
    try {
      const { page } = stage
      await openSearch(page)
      expect(await isRed(page, `[data-icon="${OPEN_SEARCH_ICON}"]`), 'not red before the eye').toBe(false)
      await hideListedIn(page, PANEL, SATO)
      await press(page, `${PANEL} [data-icon="${EYE}"]`)
      expect(await readShown(page)).toEqual({ drawnTaskUids: [BRAVO, DELTA, ECHO], tables: ['searchPanel'] })
      expect(await drawnTaskUids(page)).toEqual([BRAVO, DELTA, ECHO])
      expect(await isRed(page, `${PANEL} [data-icon="${EYE}"]`), 'EN-8 on the eye').toBe(true)
      expect(await isRed(page, `[data-icon="${OPEN_SEARCH_ICON}"]`), 'EN-8 above EN-5 on IC-117').toBe(true)
      expect(await isRed(page, `[data-icon="${DIAGNOSE}"]`), TV_12_NOT_RED).toBe(false)
      expect(await isRed(page, `[data-icon="${OPEN_RESOURCE_LIST}"]`), TV_12_NOT_RED).toBe(false)
    } finally {
      await stage.close()
    }
  })

  test(`TV-12 (MUST NOT): ${TV_12_NOT_RED.slice(-30)} -- the Resource List eye reddens IC-62 and leaves IC-117 as it was; dark theme`, async () => {
    const stage = await opened('dark')
    try {
      const { page } = stage
      await openSearch(page)
      await openResourceList(page)
      await hideListedIn(page, RESOURCE_LIST, TANAKA)
      await press(page, `${RESOURCE_LIST} [data-icon="${EYE}"]`)
      expect(await readShown(page)).toEqual({ drawnTaskUids: [ALPHA, CHARLIE, ECHO], tables: ['resourceList'] })
      expect(await isRed(page, `[data-icon="${OPEN_RESOURCE_LIST}"]`, RED_DARK), 'EN-8 on IC-62').toBe(true)
      expect((await paintsOf(page, `${RESOURCE_LIST} [data-icon="${EYE}"]`)).inks, 'S-544: the glyph is drawn in white').toContain(GLYPH_DARK)
      expect(await isRed(page, `[data-icon="${OPEN_SEARCH_ICON}"]`, RED_DARK), TV_12_NOT_RED).toBe(false)
      expect(await isRed(page, `${PANEL} [data-icon="${EYE}"]`, RED_DARK), TV_12_NOT_RED).toBe(false)
    } finally {
      await stage.close()
    }
  })

  test('TV-11: the Schedule Filter Bar names the tables that are on, counts N and M, and its word entrance turns every eye off', async () => {
    const stage = await opened()
    try {
      const { page } = stage
      expect(await textOf(page, BAND), 'no bar before an eye').toBeNull()
      await openSearch(page)
      await hideListedIn(page, PANEL, NAMES[DELTA] ?? '')
      await press(page, `${PANEL} [data-icon="${EYE}"]`)
      const one = (await textOf(page, BAND)) ?? ''
      expect(sentencesOf(['Search Panel'], ALL.length, 4).some((sentence) => one.includes(sentence)), `the bar reads ${one}`).toBe(true)
      await openResourceList(page)
      await hideListedIn(page, RESOURCE_LIST, SATO)
      await press(page, `${RESOURCE_LIST} [data-icon="${EYE}"]`)
      expect(await readShown(page)).toEqual({ drawnTaskUids: [BRAVO, ECHO], tables: ['searchPanel', 'resourceList'] })
      const two = (await textOf(page, BAND)) ?? ''
      expect(sentencesOf(['Search Panel', 'Resource List'], ALL.length, 2).some((sentence) => two.includes(sentence)), `the bar reads ${two}`).toBe(true)
      const off = wordOf('searchPanel', 'scheduleFilterOff')
      await page.locator(BAND).getByText(new RegExp(`^(${off.ja}|${off.en})$`)).click()
      await settle(page)
      expect(await readShown(page)).toEqual({ drawnTaskUids: null, tables: [] })
      expect(await textOf(page, BAND)).toBeNull()
      expect(await drawnTaskUids(page)).toEqual(ALL)
      expect(await isRed(page, `[data-icon="${OPEN_SEARCH_ICON}"]`)).toBe(false)
      expect(await isRed(page, `[data-icon="${OPEN_RESOURCE_LIST}"]`)).toBe(false)
    } finally {
      await stage.close()
    }
  })

  test(`TV-8: ${TV_8_CLOSE.slice(0, 20)} -- minimising keeps the Resource List eye, closing drops it, reopening keeps the Hide rows`, async () => {
    const stage = await opened()
    try {
      const { page } = stage
      await openResourceList(page)
      await press(page, `${RESOURCE_LIST} [data-icon="${EYE}"]`)
      expect(await readShown(page), 'TV-5: with no Hide row the eye does not turn on').toEqual({ drawnTaskUids: null, tables: [] })
      await hideListedIn(page, RESOURCE_LIST, TANAKA)
      await press(page, `${RESOURCE_LIST} [data-icon="${EYE}"]`)
      expect((await readShown(page)).drawnTaskUids).toEqual([ALPHA, CHARLIE, ECHO])
      await press(page, `${RESOURCE_LIST} [data-icon="${MINIMISE}"]`)
      expect((await readShown(page)).tables, 'SV-12: minimising keeps the eye').toEqual(['resourceList'])
      expect(await textOf(page, BAND)).not.toBeNull()
      await openResourceList(page)
      await press(page, `${RESOURCE_LIST} [data-icon="${CLOSE}"]`)
      expect(await readShown(page), 'RO-1: closing drops the eye').toEqual({ drawnTaskUids: null, tables: [] })
      expect(await textOf(page, BAND)).toBeNull()
      expect(await drawnTaskUids(page)).toEqual(ALL)
      await openResourceList(page)
      await press(page, `${RESOURCE_LIST} [data-icon="${EYE}"]`)
      expect((await readShown(page)).drawnTaskUids, 'the Hide row of Tanaka stayed').toEqual([ALPHA, CHARLIE, ECHO])
    } finally {
      await stage.close()
    }
  })

  test(`SJ-0 / JDG-1774: ${SJ_0_ONLY_THAT_ROW.slice(-30)} -- only the jumped-to row turns Show in the search table`, async () => {
    const stage = await opened()
    try {
      const { page } = stage
      await openSearch(page)
      await hideListedIn(page, PANEL, NAMES[BRAVO] ?? '')
      await hideListedIn(page, PANEL, NAMES[DELTA] ?? '')
      await press(page, `${PANEL} [data-icon="${EYE}"]`)
      expect((await readShown(page)).drawnTaskUids).toEqual([ALPHA, CHARLIE, ECHO])
      await press(page, `${PANEL} [data-search-task="${String(BRAVO)}"]`)
      expect(await readShown(page)).toEqual({ drawnTaskUids: [ALPHA, BRAVO, CHARLIE, ECHO], tables: ['searchPanel'] })
      expect(await drawnTaskUids(page)).toContain(BRAVO)
      expect(await drawnTaskUids(page), 'Delta stays Hide').not.toContain(DELTA)
    } finally {
      await stage.close()
    }
  })

  test(`SJ-0 / JDG-1774: ${SJ_0_KEEPS_HIDE.slice(0, 30)} -- the jump turns the Resource List eye off and leaves Tanaka Hide`, async () => {
    const stage = await opened()
    try {
      const { page } = stage
      await openResourceList(page)
      await hideListedIn(page, RESOURCE_LIST, TANAKA)
      await press(page, `${RESOURCE_LIST} [data-icon="${EYE}"]`)
      expect((await readShown(page)).drawnTaskUids).toEqual([ALPHA, CHARLIE, ECHO])
      await openSearch(page)
      await press(page, `${PANEL} [data-search-task="${String(BRAVO)}"]`)
      expect(await readShown(page), 'the Resource List eye is off, so nothing narrows').toEqual({ drawnTaskUids: null, tables: [] })
      expect(await drawnTaskUids(page)).toContain(BRAVO)
      await press(page, `${RESOURCE_LIST} [data-icon="${EYE}"]`)
      expect((await readShown(page)).drawnTaskUids, 'Tanaka is still Hide: Bravo and Delta go again').toEqual([ALPHA, CHARLIE, ECHO])
    } finally {
      await stage.close()
    }
  })

  test('AM-26 / AM-27: showOnlyTasks puts the search table on with those tasks; readShownTasks reads the product and the tables', async () => {
    const stage = await opened()
    try {
      const { page } = stage
      expect(await readShown(page)).toEqual({ drawnTaskUids: null, tables: [] })
      await showOnly(page, [ALPHA, CHARLIE])
      expect(await readShown(page)).toEqual({ drawnTaskUids: [ALPHA, CHARLIE], tables: ['searchPanel'] })
      expect(await drawnTaskUids(page)).toEqual([ALPHA, CHARLIE])
      expect(await textOf(page, BAND)).not.toBeNull()
      expect(await isRed(page, `[data-icon="${OPEN_SEARCH_ICON}"]`), 'TV-12 on IC-117').toBe(true)
      await showOnly(page, null)
      expect(await readShown(page)).toEqual({ drawnTaskUids: null, tables: [] })
      expect(await textOf(page, BAND)).toBeNull()
      expect(await drawnTaskUids(page)).toEqual(ALL)
    } finally {
      await stage.close()
    }
  })
})
