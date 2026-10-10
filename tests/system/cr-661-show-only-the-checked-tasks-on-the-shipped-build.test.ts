// CR-661 on the shipped build, read after CR-722: narrow to one assignee, set its rows Hide in the Visibility column (SQ-10), press IC-143; the band, minimize and close, SJ-0's three doors, undo, save and export.

import { expect, test, type Browser, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { bare, specTable, unbroken } from '../contract/spec-table'
import { validateDocument } from '../fixtures/grs-document'
import { CLEARING_UP_MS, launchReferenceBrowser } from './live-app'
import { keyOf, openDocument, openStage, readTree, saveDocument, settle, stateOf, type Stage } from './cr-570-tree-state-stage'
import { rowOf } from './sws-case'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

// WHY: each constant ends exactly at its marker, cut from the manuscript as check 39 reads it.
const FR_151_RULES =
  '検索の表・遅延診断レポートの表・担当リストの表の表示の列（Visibility）と、表ごとのスケジュールフィルタの入口（`_assets/tbl-glossary.md` の 表 T-109 の `IC-143`）で、日程表に描くタスクを絞ること（スケジュールフィルタ）の規則は 表 T-353 に従うこと（MUST）'
const FR_151_NOT_SAVED = '⛔ 表ごとの表示の列の値とスケジュールフィルタの入切も文書に保存してはならない（MUST NOT）'
const FR_151_NOT_UNDONE = '取り消しの記録にも載せない'
const TV_3_NOT_FAINT = '「描かれていないタスク」）。⛔ 薄く描いてはならない（MUST NOT）'
const EL_21_SJ_0 = '印の先の端のタスクがスケジュールフィルタ（`FR-151` の 表 T-353）で描かれないときは、先に 表 T-332 の `SJ-0` を行うこと（MUST）'
const FR_134_JUMP = '表の 1 行の名前を押したら、その行の `Task` へ、`FR-151` の 表 T-332 の飛び方（`SJ-0`・`SJ-2` 〜 `SJ-8`・`SJ-10`）で飛ぶこと（MUST）'
const IX_11_NO_BAND_WORDS =
  '⛔ 絵にスケジュールフィルタの帯（`_assets/tbl-glossary.md` の `U-67`）の語を書き込んではならない（MUST NOT）'

const CLAUSES = [FR_151_RULES, FR_151_NOT_SAVED, FR_151_NOT_UNDONE, TV_3_NOT_FAINT, EL_21_SJ_0, FR_134_JUMP, IX_11_NO_BAND_WORDS]

const T_353 = specTable('T-353')
const T_332 = specTable('T-332')
const cellOf = (table: typeof T_353, id: string): string => unbroken(rowOf(table, id).by['定め'] ?? '')

test.describe('CR-661 the manuscript these cases are driven by', () => {
  for (const clause of CLAUSES) {
    test(`01-04 still says: ${clause.slice(-40)}`, () => {
      expect(REQUIREMENTS).toContain(clause)
    })
  }
  test('T-353 and T-332 still hold the rows these cases press', () => {
    expect(cellOf(T_353, 'TV-2')).toContain('初めはどの表のどの行も「表示」')
    expect(cellOf(T_353, 'TV-5')).toContain('`IC-143` を押すと、その表のスケジュールフィルタを掛け')
    expect(cellOf(T_353, 'TV-6')).toContain('スケジュールフィルタを掛けるときは、タスクグループを展開しない')
    expect(cellOf(T_353, 'TV-8')).toContain('⭐ 最小化（`SV-12`）では解除しない')
    expect(cellOf(T_353, 'TV-8')).toContain('解除しても表示の列の値は残る')
    expect(cellOf(T_353, 'TV-11')).toContain('N は文書のタスクの数、M は描いているタスクの数')
    expect(unbroken(rowOf(T_332, 'SJ-0').by['定め'] ?? '')).toContain('そのタスクの行だけを「表示」にし')
  })
})

const roleOf = (id: string): string => `[data-role="${bare(rowOf(specTable('T-103'), id).cells[0] ?? '')}"]`
const PANEL = roleOf('U-64')
const REPORT = roleOf('U-66')
const BAND = roleOf('U-67')
const CANVAS = roleOf('U-32')
// WHY: the canvas element spans the window; the ruler's ground is drawn at the top of the region the band moves down.
const RULER = '[data-figure="ruler-ground"]'
const ENTER = rowOf(specTable('T-109'), 'IC-143').id
const MINIMIZE = rowOf(specTable('T-109'), 'IC-129').id
const CLOSE = rowOf(specTable('T-109'), 'IC-52').id
const DIAGNOSE = rowOf(specTable('T-109'), 'IC-107').id
const OPEN_SEARCH = keyOf('SK-24')

// see S-497, S-498
const settingPx = (id: string): number => Number(/^(\d+)px/.exec(unbroken(rowOf(specTable('T-206'), id).by['既定'] ?? ''))?.[1] ?? NaN)
const BAND_HEIGHT = settingPx('S-497')

const TEMPLATE = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'), 'utf8'),
) as { $schema: string; schemaVersion: string; schedule: Record<string, any>; documentSettings: Record<string, unknown>; documentStamp: unknown }

// WHY: January 2026; Sato carries Alpha (task group C under the folded task group P) and Charlie (task group Q); Tanaka carries Bravo and
// Delta; Alpha -> Delta is a link whose far end the narrowing hides while its task group Q stays drawn for Charlie.
const day = (dayOfMonth: number): string => `2026-01-${String(dayOfMonth).padStart(2, '0')}T00:00:00`
// WHY: the Command Palette opens over the left of the canvas; the view starts two weeks early so the bars lie clear of it.
const CLEAR_OF_THE_PALETTE = '2025-12-20T00:00:00'
const TASK_GROUP_P = '5c000000-0000-4000-8000-000000006620'
const TASK_GROUP_C = '5c000000-0000-4000-8000-000000006621'
const TASK_GROUP_Q = '5c000000-0000-4000-8000-000000006622'
const SATO = 'Sato Hanako'
const TANAKA = 'Tanaka Jiro'
const ALPHA = 1
const BRAVO = 2
const CHARLIE = 3
const DELTA = 4
const NAMES: Readonly<Record<number, string>> = { [ALPHA]: 'Alpha', [BRAVO]: 'Bravo', [CHARLIE]: 'Charlie', [DELTA]: 'Delta' }

const taskRow = (uid: number, from: number, to: number, dependencies: readonly unknown[] = []): Record<string, unknown> => ({
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
  dependencies,
  carry: {},
  carryElements: [],
})

// WHY: TV-6 opens nothing on entering, so a case that needs Alpha drawn opens task group P in the document itself.
type FoldOfP = 'collapsed' | 'expanded'

/** @purity pure */
function fixture(foldOfP: FoldOfP): string {
  const group = TEMPLATE.schedule['taskGroups'][0] as Record<string, unknown>
  const resource = TEMPLATE.schedule['resources'][0] as Record<string, unknown>
  const link = { predecessorUid: ALPHA, linkType: 1, lag: 0, lagFormat: 7, carry: {}, carryElements: [] }
  const tasks = [taskRow(ALPHA, 5, 9), taskRow(BRAVO, 6, 8), taskRow(CHARLIE, 12, 14), taskRow(DELTA, 13, 16, [link])]
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
      assignments: [
        { uid: 2101, taskUid: ALPHA, resourceUid: 2001, carry: {}, carryElements: [] },
        { uid: 2102, taskUid: BRAVO, resourceUid: 2002, carry: {}, carryElements: [] },
        { uid: 2103, taskUid: CHARLIE, resourceUid: 2001, carry: {}, carryElements: [] },
        { uid: 2104, taskUid: DELTA, resourceUid: 2002, carry: {}, carryElements: [] },
      ],
      taskGroups: [
        { ...group, id: TASK_GROUP_P, parentId: null, label: 'Row P', order: 0, treeState: foldOfP, minHeight: null },
        { ...group, id: TASK_GROUP_C, parentId: TASK_GROUP_P, label: 'Row C', order: 1, treeState: 'auto', minHeight: null },
        { ...group, id: TASK_GROUP_Q, parentId: null, label: 'Row Q', order: 2, treeState: 'auto', minHeight: null },
      ],
      taskGroupMembers: [
        { taskUid: ALPHA, groupId: TASK_GROUP_C },
        { taskUid: BRAVO, groupId: TASK_GROUP_C },
        { taskUid: CHARLIE, groupId: TASK_GROUP_Q },
        { taskUid: DELTA, groupId: TASK_GROUP_Q },
      ],
      taskVisuals: tasks.map((one) => ({ taskUid: one['uid'], shapeKind: null, milestoneGlyph: null, fillColor: null, strokeColor: null, strokeWidthPx: null })),
      commentBoxes: [],
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
    },
    documentSettings: { ...TEMPLATE.documentSettings, zoomX: 6, scrollDate: CLEAR_OF_THE_PALETTE, scrollDayOffset: 0, scrollGroupId: TASK_GROUP_P, scrollGroupOffset: 0 },
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
    const api = (window as unknown as { grSchedulerAgentApi: { readShownTasks(): { drawnTaskUids: number[] | null; tables: string[] } } }).grSchedulerAgentApi
    return api.readShownTasks()
  })
  return { drawnTaskUids: shown.drawnTaskUids === null ? null : [...shown.drawnTaskUids].sort((a, b) => a - b), tables: [...shown.tables] }
}

const NARROWED = { drawnTaskUids: [ALPHA, CHARLIE], tables: ['searchPanel'] }
const NOT_NARROWED = { drawnTaskUids: null, tables: [] }

// WHY: every task figure is keyed task-<uid>-... (the drawing's own keys), so the drawn tasks are read off the keys.
/** @purity semi-pure-b */
async function drawnTaskUids(page: Page): Promise<number[]> {
  const keys = await page.evaluate(() => Array.from(document.querySelectorAll('[data-figure^="task-"]')).map((one) => one.getAttribute('data-figure') ?? ''))
  return [...new Set(keys.map((key) => Number(/^task-(\d+)-/.exec(key)?.[1] ?? NaN)).filter((uid) => Number.isInteger(uid)))].sort((a, b) => a - b)
}

/** @purity semi-pure-b */
async function drawnTexts(page: Page): Promise<string> {
  return page.evaluate((canvas: string) => document.querySelector(`${canvas} svg`)?.textContent ?? '', CANVAS)
}

interface Box {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

/** @purity semi-pure-b */
async function boxOf(page: Page, selector: string): Promise<Box | null> {
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

/** @purity semi-pure-b */
async function bandText(page: Page): Promise<string | null> {
  return page.evaluate((band: string) => document.querySelector(band)?.textContent ?? null, BAND)
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
async function opened(foldOfP: FoldOfP = 'collapsed'): Promise<Stage> {
  if (browser === null) throw new Error('no browser')
  const stage = await openStage(browser)
  await openDocument(stage.page, 'cr-661.json', fixture(foldOfP))
  return stage
}

// WHY: every row starts Show (TV-2); the word narrows the table to Tanaka (SV-4), the heading box sets every listed row Hide (SQ-10), and the word is cleared again.
/** @purity non-pure */
async function hideTanaka(page: Page): Promise<void> {
  await page.keyboard.press(OPEN_SEARCH)
  await settle(page)
  await page.keyboard.type(TANAKA)
  await settle(page)
  await press(page, `${PANEL} [data-search-shown-all]`)
  await press(page, `${PANEL} input`)
  await page.keyboard.press('Control+a')
  await page.keyboard.press('Backspace')
  await settle(page)
}

/** @purity non-pure */
async function enter(page: Page): Promise<void> {
  await hideTanaka(page)
  await press(page, `${PANEL} [data-icon="${ENTER}"]`)
}

test.describe('FR-151 / T-353 on the shipped build', () => {
  test.setTimeout(180_000)

  test(`FR-151 (MUST): ${FR_151_RULES.slice(-30)} -- the Show tasks only, the band, no task group opened on entering`, async () => {
    const stage = await opened()
    try {
      const { page } = stage
      const rulerBefore = await boxOf(page, RULER)
      await hideTanaka(page)
      expect(await readShown(page)).toEqual(NOT_NARROWED)
      expect(await bandText(page), 'no band before IC-143').toBeNull()
      await press(page, `${PANEL} [data-icon="${ENTER}"]`)
      expect(await readShown(page)).toEqual(NARROWED)
      // see TV-6
      expect(stateOf(await readTree(page), TASK_GROUP_P), 'entering leaves the folded task group above Alpha folded').toBe('collapsed')
      // see TV-1, TV-3
      const drawn = await drawnTaskUids(page)
      expect(drawn).toContain(CHARLIE)
      expect(drawn).not.toContain(BRAVO)
      expect(drawn).not.toContain(DELTA)
      // see TV-11
      expect(await bandText(page) ?? '').toMatch(/4 件中 2 件|2 of 4/)
      const band = await boxOf(page, BAND)
      const rulerAfter = await boxOf(page, RULER)
      expect(band?.height).toBeCloseTo(BAND_HEIGHT, 0)
      expect((rulerAfter?.y ?? 0) - (rulerBefore?.y ?? 0), 'the canvas moves down by the band height').toBeCloseTo(BAND_HEIGHT, 0)
      expect((band?.y ?? 0) + (band?.height ?? 0)).toBeLessThanOrEqual((rulerAfter?.y ?? 0) + 0.5)
    } finally {
      await stage.close()
    }
  })

  test(`TV-3 (MUST NOT): ${TV_3_NOT_FAINT.slice(-22)} -- an unchecked task leaves no figure and no word in the drawing`, async () => {
    const stage = await opened()
    try {
      const { page } = stage
      await enter(page)
      const drawn = await drawnTaskUids(page)
      expect(drawn).not.toContain(BRAVO)
      expect(drawn).not.toContain(DELTA)
      const words = await drawnTexts(page)
      expect(words).toContain(NAMES[CHARLIE])
      expect(words).not.toContain(NAMES[BRAVO])
      expect(words).not.toContain(NAMES[DELTA])
    } finally {
      await stage.close()
    }
  })

  test(`FR-151 (MUST NOT): ${FR_151_NOT_SAVED.slice(-30)} -- Ctrl+Z after entering takes nothing back, and a save holds no Visibility`, async () => {
    const stage = await opened()
    try {
      const { page } = stage
      const savedBefore = JSON.parse(await saveDocument(page)) as Record<string, unknown>
      await enter(page)
      expect(stateOf(await readTree(page), TASK_GROUP_P), 'TV-6: entering opens nothing').toBe('collapsed')
      await page.keyboard.press('Control+z')
      await settle(page)
      expect(stateOf(await readTree(page), TASK_GROUP_P)).toBe('collapsed')
      expect(await readShown(page), `${FR_151_NOT_UNDONE}: the Visibility and the Schedule Filter stay`).toEqual(NARROWED)
      expect(await bandText(page)).not.toBeNull()
      const savedDuring = JSON.parse(await saveDocument(page)) as Record<string, unknown>
      expect(savedDuring['schedule']).toEqual(savedBefore['schedule'])
      expect(savedDuring['documentSettings']).toEqual(savedBefore['documentSettings'])
      expect(JSON.stringify(savedDuring)).not.toMatch(/shown|showOnly|checked|visibility|hiddenKeys|scheduleFilter/i)
    } finally {
      await stage.close()
    }
  })

  test('TV-8: minimizing keeps the Schedule Filter; closing the panel turns it off and keeps the Visibility', async () => {
    const stage = await opened('expanded')
    try {
      const { page } = stage
      await enter(page)
      await press(page, `${PANEL} [data-icon="${MINIMIZE}"]`)
      expect(await readShown(page)).toEqual(NARROWED)
      expect(await bandText(page)).not.toBeNull()
      await press(page, `${PANEL} [data-icon="${CLOSE}"]`)
      expect(await readShown(page)).toEqual(NOT_NARROWED)
      expect(await bandText(page)).toBeNull()
      expect(await drawnTaskUids(page)).toEqual([ALPHA, BRAVO, CHARLIE, DELTA])
      await page.keyboard.press(OPEN_SEARCH)
      await settle(page)
      await press(page, `${PANEL} [data-icon="${ENTER}"]`)
      expect(await readShown(page), 'the Visibility outlived the close').toEqual(NARROWED)
    } finally {
      await stage.close()
    }
  })

  test('SJ-0: a jump from the search table to a Hide task sets its row Show first and draws it', async () => {
    const stage = await opened()
    try {
      const { page } = stage
      await enter(page)
      await press(page, `${PANEL} [data-search-task="${BRAVO}"]`)
      expect(await readShown(page)).toEqual({ drawnTaskUids: [ALPHA, BRAVO, CHARLIE], tables: ['searchPanel'] })
      expect(await drawnTaskUids(page)).toContain(BRAVO)
    } finally {
      await stage.close()
    }
  })

  test(`EL-21 (MUST): ${EL_21_SJ_0.slice(-30)} -- pressing the continuation mark toward Delta sets Delta Show`, async () => {
    const stage = await opened('expanded')
    try {
      const { page } = stage
      await enter(page)
      const dot = `circle[data-figure="dep-${ALPHA}-${DELTA}"]`
      expect(await boxOf(page, dot), 'the link to the Hide Delta ends in the continuation mark (EL-20)').not.toBeNull()
      await press(page, dot)
      expect(await readShown(page)).toEqual({ drawnTaskUids: [ALPHA, CHARLIE, DELTA], tables: ['searchPanel'] })
      expect(await drawnTaskUids(page)).toContain(DELTA)
    } finally {
      await stage.close()
    }
  })

  test(`FR-134 (MUST): ${FR_134_JUMP.slice(-30)} -- a report row's name sets its Hide task Show first`, async () => {
    const stage = await opened()
    try {
      const { page } = stage
      await enter(page)
      await press(page, `[data-icon="${DIAGNOSE}"]`)
      const cell = `${REPORT} [data-search-task="${DELTA}"]`
      expect(await boxOf(page, cell), 'TV-10: the report lists Delta although the search table hides it').not.toBeNull()
      await press(page, cell)
      expect((await readShown(page)).drawnTaskUids).toContain(DELTA)
      expect(await drawnTaskUids(page)).toContain(DELTA)
    } finally {
      await stage.close()
    }
  })

  test(`IX-11 (MUST NOT): ${IX_11_NO_BAND_WORDS.slice(-30)} -- the exported picture is narrowed and carries no band words`, async () => {
    const stage = await opened()
    try {
      const { page } = stage
      await enter(page)
      const svg = await page.evaluate(() => {
        const api = (window as unknown as { grSchedulerAgentApi: { exportSvg(): { ok: boolean; value?: string; svg?: string } } }).grSchedulerAgentApi
        const made = api.exportSvg() as unknown as Record<string, unknown>
        return String(made['value'] ?? made['svg'] ?? made['text'] ?? '')
      })
      expect(svg.length).toBeGreaterThan(0)
      expect(/4 件中 2 件|2 of 4/.test(svg), 'no line of the band is written into the picture').toBe(false)
      expect(svg).not.toContain('>Bravo<')
    } finally {
      await stage.close()
    }
  })
})
