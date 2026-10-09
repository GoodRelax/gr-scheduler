// CR-597 on the shipped build: the Search Panel's typed word (SV-5), row jump (SJ-1..SJ-4) and heading grab (GR-24, SV-10, SV-11).

import { expect, test, type Browser, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { bare, specTable, unbroken } from '../contract/spec-table'
import { CLEARING_UP_MS, launchReferenceBrowser } from './live-app'
import {
  ERP_SAMPLE,
  HEAD_FOLD_EVERY_TASK_GROUP,
  REQUIREMENTS,
  keyOf,
  openDocument,
  openStage,
  pressEntrance,
  readTree,
  settle,
  type Stage,
  type TreeReading,
} from './cr-570-tree-state-stage'
import { rowOf } from './sws-case'

const DESIGN = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '05-07-design.md'), 'utf8'))
const STATE_MACHINES = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '_assets', 'tbl-state-machines.md'), 'utf8'))

const IF_9_WORD =
  '上の MUST NOT の例外は、検索パネル（`U-64`）の入力欄（`FR-151` の 表 T-330 の `SV-2`）の 1 つだけとする —— 面は、この欄の語が変わるたびに、打ちかけの語をそのまま返すこと（MUST）'
const IF_9_POINT =
  '⭐ ウィンドウ（`01-04-requirements.md` の `FR-036` の 表 T-335 —— ヘルプ・検索パネル・遅延診断レポートの窓・対話欄）の上の点には、上の UI パーツと入口の答えに加えて下の 2 つ目を、検索パネルの上の点には 1 つ目も答えること（MUST）'
const IF_9_OTHER_CELLS = 'ほかのセルの上では、この答えを `null` とする —— `SJ-1` のとおり、ほかのセルは飛ばない。'
const IF_9_ENTRY_ONLY = '入口の上では入口だけを答える —— `GR-24` は入口の載っていない所である'
const SV_5_EACH = '語を 1 文字打つたびに表を作り直す。'
const SV_5_NO_ENTER = '`Enter` を要しない。'
const SV_5_ENTER = '焦点がパネルの中にあるときの `Enter` は、`SK-19` を当てずにブラウザへ渡す'
const SJ_1_WHERE = 'タスクの表は `SQ-1` のセル、コメントボックスの表は `SQ-7` のセル。'
const SJ_1_OTHERS = 'ほかのセルは飛ばない'
const SJ_2_OPEN =
  '飛ぶ先のタスクグループ（タスクは `AT-61`、コメントボックスは `AT-114`）と、その祖先のすべての `treeState` を `expanded` にする'
const SJ_2_LEVEL_ZERO = '段 0 が畳まれていれば開く。'
const SJ_2_ONE_STEP = '値が変われば未保存の編集（`FR-100`）であり、取り消しの 1 段である。'
const SJ_2_NO_STEP = '1 つも変わらなければ段を積まない'
const SJ_4_CHOOSE = '飛ぶ先のタスクかコメントボックスを選ぶ（表 T-023c の `SL-1`）。'
const SJ_4_PANEL_KEPT =
  '飛ぶことを理由に、プロパティパネル（`_assets/tbl-settings.md` の `S-99h`）を出したり閉じたりしてはならない（MUST NOT）'
const SV_10_WB_8 = '`FR-036` の 表 T-335 の `WB-8` に従う（掴む帯は `GR-24`）。'
const SV_10_FOLLOW = '題の行の帯（表 T-023d の `GR-24`）を握っているあいだ、ウィンドウをポインタに追従させること（MUST）。'
const SV_10_SETTLE = '位置が決まるのは離した時点、中断では元の位置へ戻す（表 T-028 の `IN-1`）。'
const SV_11_INSIDE = 'ウィンドウを、ウィンドウごとの範囲（`WB-3` と同じ）の外へ出してはならない（MUST NOT）'
const SV_11_EDGE = '縁と角（表 T-023d の `GR-25`）を握っているあいだ、ウィンドウの大きさをポインタに追従させること（MUST）。'
const GR_24_WHERE = '題の行の、入口の載っていない所（検索パネルでは 表 T-330 の `SV-1` の見出しの行）。'
const GR_25_WHERE = '縁の内側と外側に、同じ `_assets/tbl-settings.md` の `S-426` の幅ずつ敷く'
const RG_16_ROW = '| RG-16 | `Esc` | 開いているウィンドウ |'
const AM_25_SAME_ROWS = '語を 1 つ受け、検索パネルの 2 つの表と同じ行を返す。'
const IN_1_ESC = '中断は `Esc` で行い'
const U_32_NOT_THE_BOX =
  '⛔ `Schedule Canvas` の範囲を、`data-role` に `Schedule Canvas` を持つ要素の箱から読んではならない（MUST NOT）'

const T_103 = specTable('T-103')
const roleOf = (id: string): string => `[data-role="${bare(rowOf(T_103, id).cells[0] ?? '')}"]`
const SEARCH_PANEL = roleOf('U-64')
const APP_HEADER = roleOf('U-31')
const PROPERTIES_PANEL = roleOf('U-25')
const SEARCH_WORD = '[data-field-row="SV-2"]'
const COMMENT_BOX_TABLE = rowOf(specTable('T-109'), 'IC-119').id
const TEXT_SIZE = rowOf(specTable('T-109'), 'IC-127').id
const OPEN_SEARCH = keyOf('SK-24')
const UNDO_KEY = keyOf('SK-6')

const TASK_WORD = 'UAT'
const NARROWING_WORD = 'PMO'
const COMMENT_BOX_ID = '11111111-2222-4333-8444-555555555555'
const COMMENT_BOX_WORD = 'cr597 comment'
const WITHIN_A_PIXEL = 1

const cellOf = (table: string, id: string, heading: string): string =>
  unbroken(rowOf(specTable(table), id).by[heading] ?? '')

interface Box {
  readonly x: number
  readonly y: number
  readonly right: number
  readonly bottom: number
  readonly width: number
  readonly height: number
}

interface Spot {
  readonly x: number
  readonly y: number
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
async function stage(): Promise<Stage> {
  if (browser === null) throw new Error('no browser')
  return openStage(browser)
}

/** @purity non-pure */
async function openErpSample(page: Page): Promise<void> {
  await openDocument(page, 'sample-large-erp-program.ja.xml', ERP_SAMPLE)
}

// WHY: no sample holds a comment box, so one is added to the exported sample and the result reopened.
/** @purity non-pure */
async function openErpSampleWithCommentBox(page: Page): Promise<number> {
  await openErpSample(page)
  const uid = await firstTaskUid(page, TASK_WORD)
  const text = await page.evaluate(
    async (asked: { id: string; word: string; uid: number }) => {
      const api = (window as unknown as { grSchedulerAgentApi: { exportJson(): Promise<{ ok: boolean; value: string }> } })
        .grSchedulerAgentApi
      const exported = await api.exportJson()
      if (!exported.ok) throw new Error('AM-11 refused')
      const held = JSON.parse(exported.value) as {
        schedule: { commentBoxes: unknown[]; taskGroupMembers: { taskUid: number; groupId: string }[] }
      }
      const row = held.schedule.taskGroupMembers.find((one) => one.taskUid === asked.uid)?.groupId ?? null
      held.schedule.commentBoxes.push({
        id: asked.id,
        leaderShapeKind: null,
        text: asked.word,
        anchorDate: '2026-06-01',
        anchorGroupId: row,
        bodyOffsetPx: null,
        strokeColor: null,
        strokeWidthPx: null,
        fillColor: null,
        fillTransparencyPercent: null,
        textColor: null,
      })
      return JSON.stringify(held)
    },
    { id: COMMENT_BOX_ID, word: COMMENT_BOX_WORD, uid },
  )
  await openDocument(page, 'with-comment-box.json', text)
  return uid
}

/** @purity semi-pure-b */
async function firstTaskUid(page: Page, word: string): Promise<number> {
  const rows = await searchRows(page, word)
  const first = rows.tasks[0]
  if (first === undefined) throw new Error(`AM-25 finds no task for ${word}`)
  return first
}

/** @purity semi-pure-b */
async function searchRows(page: Page, word: string): Promise<{ readonly tasks: number[]; readonly boxes: string[] }> {
  return page.evaluate((asked: string) => {
    const api = (window as unknown as { grSchedulerAgentApi: { readSearchRows(word: string): unknown } }).grSchedulerAgentApi
    const rows = api.readSearchRows(asked) as {
      taskRows: { taskUid: number }[]
      commentBoxRows: { commentBoxId: string }[]
    }
    return { tasks: rows.taskRows.map((one) => one.taskUid), boxes: rows.commentBoxRows.map((one) => one.commentBoxId) }
  }, word)
}

/** @purity semi-pure-b */
async function groupOfTask(page: Page, uid: number): Promise<string> {
  const found = await page.evaluate((asked: number) => {
    const api = (window as unknown as { grSchedulerAgentApi: { readDocument(): unknown } }).grSchedulerAgentApi
    const held = api.readDocument() as { schedule: { taskGroupMembers: { taskUid: number; groupId: string }[] } }
    return held.schedule.taskGroupMembers.find((one) => one.taskUid === asked)?.groupId ?? null
  }, uid)
  if (found === null) throw new Error(`task ${String(uid)} stands on no task group`)
  return found
}

/** @purity pure */
function taskGroupAndAncestors(reading: TreeReading, id: string): readonly string[] {
  const chain: string[] = []
  let at: string | null = id
  while (at !== null) {
    chain.push(at)
    const here: string = at
    at = reading.rows.find((row) => row.id === here)?.parentId ?? null
  }
  return chain
}

/** @purity pure */
function statesOf(reading: TreeReading): string {
  return JSON.stringify({ levelZero: reading.levelZero, rows: reading.rows.map((row) => [row.id, row.treeState]) })
}

/** @purity semi-pure-b */
async function selection(page: Page): Promise<string> {
  return page.evaluate(() => {
    const api = (window as unknown as { grSchedulerAgentApi: { readSelection(): unknown } }).grSchedulerAgentApi
    return JSON.stringify(api.readSelection())
  })
}

/** @purity semi-pure-b */
async function boxOf(page: Page, selector: string): Promise<Box | null> {
  return page.evaluate((wanted: string) => {
    const box = document.querySelector(wanted)?.getBoundingClientRect()
    return box === undefined
      ? null
      : { x: box.x, y: box.y, right: box.right, bottom: box.bottom, width: box.width, height: box.height }
  }, selector)
}

// WHY: the range starts at the App Header's lower edge; the element with the role spans the window.
// see U-32, UZ-9
/** @purity semi-pure-b */
async function scheduleCanvasRange(page: Page): Promise<Box> {
  const header = await boxOf(page, APP_HEADER)
  const view = page.viewportSize()
  if (header === null || view === null) throw new Error(`${U_32_NOT_THE_BOX} -- ${APP_HEADER} is not on the screen`)
  const height = view.height - header.bottom
  return { x: 0, y: header.bottom, right: view.width, bottom: view.height, width: view.width, height }
}

/** @purity semi-pure-b */
async function panelBox(page: Page): Promise<Box> {
  const box = await boxOf(page, SEARCH_PANEL)
  if (box === null) throw new Error('the Search Panel is not on the screen')
  return box
}

/** @purity semi-pure-b */
async function drawnTaskUids(page: Page): Promise<number[]> {
  return page.evaluate(
    (panel: string) =>
      Array.from(document.querySelectorAll(`${panel} tbody tr`))
        .map((row) => row.querySelector('[data-search-task]')?.getAttribute('data-search-task') ?? null)
        .filter((one): one is string => one !== null)
        .map(Number),
    SEARCH_PANEL,
  )
}

// WHY: the column a cell stands in is read from the heading above it, which the view marks per SQ row.
/** @purity semi-pure-b */
async function cellCentre(page: Page, column: string, rowIndex: number): Promise<Spot> {
  const found = await page.evaluate(
    (asked: { panel: string; column: string; row: number }) => {
      const panel = document.querySelector(asked.panel)
      const heads = Array.from(panel?.querySelectorAll('thead th') ?? [])
      const index = heads.findIndex((one) => one.getAttribute('data-column') === asked.column)
      const cell = panel?.querySelectorAll('tbody tr')[asked.row]?.children[index]
      if (index < 0 || cell === undefined) return null
      const box = cell.getBoundingClientRect()
      return { x: box.x + Math.min(box.width / 2, 40), y: box.y + box.height / 2 }
    },
    { panel: SEARCH_PANEL, column, row: rowIndex },
  )
  if (found === null) throw new Error(`the Search Panel draws no ${column} cell in row ${String(rowIndex)}`)
  return found
}

// WHY: the heading row is the band above the SV-2 field; a point on no entrance is GR-24's.
/** @purity semi-pure-b */
async function headingBandSpot(page: Page): Promise<Spot> {
  const found = await page.evaluate(
    (asked: { panel: string; field: string }) => {
      const panel = document.querySelector(asked.panel)
      const field = panel?.querySelector(asked.field)
      if (panel === null || panel === undefined || field === null || field === undefined) return null
      const outer = panel.getBoundingClientRect()
      const y = (outer.top + field.getBoundingClientRect().top) / 2
      for (let x = outer.left + outer.width / 2; x > outer.left + 2; x -= 4) {
        const top = document.elementFromPoint(x, y)
        if (top !== null && panel.contains(top) && top.closest('[data-icon]') === null) return { x, y }
      }
      return null
    },
    { panel: SEARCH_PANEL, field: SEARCH_WORD },
  )
  if (found === null) throw new Error('GR-24: no point of the heading row is free of an entrance')
  return found
}

/** @purity non-pure */
async function pressAt(page: Page, at: Spot): Promise<void> {
  await page.mouse.move(at.x, at.y)
  await page.mouse.down()
  await page.mouse.up()
  await settle(page)
}

/** @purity non-pure */
async function openSearch(page: Page, word: string): Promise<void> {
  await page.keyboard.press(OPEN_SEARCH)
  await settle(page)
  await page.keyboard.type(word)
  await settle(page)
}

/** @purity non-pure */
async function foldEverything(page: Page): Promise<void> {
  expect(await pressEntrance(page, HEAD_FOLD_EVERY_TASK_GROUP), 'HF-12 is on the screen').toBe(true)
}

/** @purity non-pure */
async function grabAndHold(page: Page, from: Spot, dx: number, dy: number): Promise<void> {
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(from.x + dx / 2, from.y + dy / 2, { steps: 4 })
  await page.mouse.move(from.x + dx, from.y + dy, { steps: 4 })
  await page.waitForTimeout(300)
}

test.describe('CR-597 -- the clauses these cases are driven by', () => {
  test('IF-9, SV-5, SV-10, SV-11, SJ-1, SJ-2, SJ-4, GR-24, GR-25, RG-15, AM-25 and IN-1 still read this way', () => {
    expect(DESIGN).toContain(IF_9_WORD)
    expect(DESIGN).toContain(IF_9_POINT)
    expect(DESIGN).toContain(IF_9_OTHER_CELLS)
    expect(DESIGN).toContain(IF_9_ENTRY_ONLY)
    expect(cellOf('T-330', 'SV-5', '定め')).toBe(`${SV_5_EACH}${SV_5_NO_ENTER}${SV_5_ENTER}`)
    expect(cellOf('T-330', 'SV-10', '定め')).toContain(SV_10_WB_8)
    expect(cellOf('T-335', 'WB-8', '描くもの')).toContain(`${SV_10_FOLLOW}${SV_10_SETTLE}`)
    expect(cellOf('T-335', 'WB-9', '描くもの')).toContain(SV_11_EDGE)
    expect(cellOf('T-335', 'WB-8', '置き場と大きさ')).toContain(SV_11_INSIDE)
    expect(cellOf('T-332', 'SJ-1', '定め')).toBe(`${SJ_1_WHERE}${SJ_1_OTHERS}`)
    expect(cellOf('T-332', 'SJ-2', '定め')).toContain(SJ_2_OPEN)
    expect(cellOf('T-332', 'SJ-2', '定め')).toContain(SJ_2_LEVEL_ZERO)
    expect(cellOf('T-332', 'SJ-2', '定め')).toContain(SJ_2_ONE_STEP)
    expect(cellOf('T-332', 'SJ-2', '定め')).toContain(SJ_2_NO_STEP)
    expect(cellOf('T-332', 'SJ-4', '定め')).toContain(SJ_4_CHOOSE)
    expect(cellOf('T-332', 'SJ-4', '定め')).toContain(SJ_4_PANEL_KEPT)
    expect(cellOf('T-023d', 'GR-24', '場所')).toContain(GR_24_WHERE)
    expect(cellOf('T-023d', 'GR-25', '場所')).toBe(GR_25_WHERE)
    expect(STATE_MACHINES).toContain(RG_16_ROW)
    expect(unbroken(specTable('T-107').rows.find((one) => one.id === 'AM-25')?.cells.join(' ') ?? '')).toContain(AM_25_SAME_ROWS)
    expect(REQUIREMENTS).toContain(IN_1_ESC)
  })
})

test.describe(`SV-5 -- ${SV_5_EACH}${SV_5_NO_ENTER}`, () => {
  test(`IF-9: ${IF_9_WORD} -- each keystroke rebuilds the table to AM-25's rows, with no Enter`, async () => {
    const one = await stage()
    try {
      await openErpSample(one.page)
      await one.page.keyboard.press(OPEN_SEARCH)
      await settle(one.page)
      const seen: string[] = []
      let word = ''
      for (const letter of NARROWING_WORD) {
        await one.page.keyboard.type(letter)
        word += letter
        await settle(one.page)
        const wanted = (await searchRows(one.page, word)).tasks
        expect([...(await drawnTaskUids(one.page))].sort(), `the table after typing "${word}"`).toEqual([...wanted].sort())
        seen.push(JSON.stringify([...wanted].sort()))
      }
      await one.page.keyboard.press('Backspace')
      await settle(one.page)
      const shorter = (await searchRows(one.page, word.slice(0, -1))).tasks
      expect([...(await drawnTaskUids(one.page))].sort(), 'the table after one letter was taken back').toEqual([...shorter].sort())
      expect(new Set(seen).size, 'the letters typed have to change the rows, or the case proves nothing').toBeGreaterThan(1)
    } finally {
      await one.close()
    }
  })

  test(`${SV_5_ENTER}`, async () => {
    const one = await stage()
    try {
      await openErpSample(one.page)
      await openSearch(one.page, TASK_WORD)
      const leftToTheBrowser = await one.page.evaluate(() =>
        (document.activeElement ?? document.body).dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true, cancelable: true }),
        ),
      )
      expect(leftToTheBrowser, 'dispatchEvent answers false once the default is stopped').toBe(true)
      await one.page.keyboard.press('Enter')
      await settle(one.page)
      expect(await boxOf(one.page, SEARCH_PANEL)).not.toBeNull()
      const field = await one.page.evaluate(
        (asked: { panel: string; field: string }) => {
          const active = document.activeElement as HTMLInputElement | null
          return {
            inField: active !== null && active.matches(`${asked.panel} ${asked.field}`),
            value: active?.value ?? '',
          }
        },
        { panel: SEARCH_PANEL, field: SEARCH_WORD },
      )
      expect(field).toEqual({ inField: true, value: TASK_WORD })
    } finally {
      await one.close()
    }
  })

  test('WS-2: a word typed in SV-2 does not hold back an Agent API write (SV-2 sends no edit notice)', async () => {
    const one = await stage()
    try {
      await openErpSample(one.page)
      const uid = await firstTaskUid(one.page, TASK_WORD)
      await openSearch(one.page, TASK_WORD.slice(0, 2))
      const accepted = await one.page.evaluate((asked: number) => {
        const api = (
          window as unknown as {
            grSchedulerAgentApi: { readStamp(): unknown; applyCommands(request: unknown): { accepted: boolean } }
          }
        ).grSchedulerAgentApi
        return api.applyCommands({
          readStamp: api.readStamp(),
          commands: [{ kind: 'setTaskName', uid: asked, name: 'Renamed while the search word is typed' }],
        }).accepted
      }, uid)
      expect(accepted).toBe(true)
    } finally {
      await one.close()
    }
  })
})

test.describe(`SJ-1 -- ${SJ_1_WHERE}${SJ_1_OTHERS}`, () => {
  test(`an SQ-1 cell opens the task's task group and ancestors (SJ-2: ${SJ_2_OPEN}) and chooses the task (SJ-4)`, async () => {
    const one = await stage()
    try {
      await openErpSample(one.page)
      await foldEverything(one.page)
      await openSearch(one.page, TASK_WORD)
      const uid = (await drawnTaskUids(one.page))[0]
      if (uid === undefined) throw new Error(`the task table holds no row for ${TASK_WORD}`)
      const row = await groupOfTask(one.page, uid)
      const folded = await readTree(one.page)
      expect(taskGroupAndAncestors(folded, row).map((id) => folded.rows.find((r) => r.id === id)?.treeState)).not.toContain('expanded')

      await pressAt(one.page, await cellCentre(one.page, 'SQ-1', 0))

      const opened = await readTree(one.page)
      for (const id of taskGroupAndAncestors(opened, row)) {
        expect(opened.rows.find((r) => r.id === id)?.treeState, `task group ${id} after the jump`).toBe('expanded')
      }
      expect(opened.levelZero, SJ_2_LEVEL_ZERO).not.toBe('collapsed')
      expect(JSON.parse(await selection(one.page))).toMatchObject({ items: [{ kind: 'task', uid }] })
      expect((await boxOf(one.page, PROPERTIES_PANEL))?.width ?? 0, SJ_4_PANEL_KEPT).toBe(0)
    } finally {
      await one.close()
    }
  })

  test(`SJ-2: ${SJ_2_ONE_STEP} -- one Ctrl+Z puts every task group back; ${SJ_2_NO_STEP}`, async () => {
    const one = await stage()
    try {
      await openErpSample(one.page)
      await foldEverything(one.page)
      const before = statesOf(await readTree(one.page))
      await openSearch(one.page, TASK_WORD)
      const jump = await cellCentre(one.page, 'SQ-1', 0)
      await pressAt(one.page, jump)
      const after = statesOf(await readTree(one.page))
      expect(after, 'the jump has to change something, or the undo proves nothing').not.toBe(before)
      await pressAt(one.page, await cellCentre(one.page, 'SQ-1', 0))
      expect(statesOf(await readTree(one.page)), 'the second jump found everything open').toBe(after)

      await one.page.keyboard.press(UNDO_KEY)
      await settle(one.page)
      expect(statesOf(await readTree(one.page))).toBe(before)
    } finally {
      await one.close()
    }
  })

  test(`SJ-1: ${SJ_1_OTHERS} -- an SQ-2 cell changes no task group and chooses nothing`, async () => {
    const one = await stage()
    try {
      await openErpSample(one.page)
      await foldEverything(one.page)
      await openSearch(one.page, TASK_WORD)
      const before = statesOf(await readTree(one.page))
      const chosen = await selection(one.page)
      await pressAt(one.page, await cellCentre(one.page, 'SQ-2', 0))
      expect(statesOf(await readTree(one.page))).toBe(before)
      expect(await selection(one.page)).toBe(chosen)
    } finally {
      await one.close()
    }
  })

  test("an SQ-7 cell opens the comment box's task group (AT-114) and chooses the comment box", async () => {
    const one = await stage()
    try {
      const uid = await openErpSampleWithCommentBox(one.page)
      expect((await searchRows(one.page, COMMENT_BOX_WORD)).boxes).toEqual([COMMENT_BOX_ID])
      const row = await groupOfTask(one.page, uid)
      await foldEverything(one.page)
      await openSearch(one.page, COMMENT_BOX_WORD)
      expect(await pressEntrance(one.page, COMMENT_BOX_TABLE), `${COMMENT_BOX_TABLE} is on the screen`).toBe(true)

      await pressAt(one.page, await cellCentre(one.page, 'SQ-7', 0))

      const opened = await readTree(one.page)
      for (const id of taskGroupAndAncestors(opened, row)) {
        expect(opened.rows.find((r) => r.id === id)?.treeState, `task group ${id} after the jump`).toBe('expanded')
      }
      const chosen = JSON.parse(await selection(one.page)) as { items: unknown[] }
      expect(chosen.items).toHaveLength(1)
      expect(JSON.stringify(chosen.items[0])).toContain(COMMENT_BOX_ID)
    } finally {
      await one.close()
    }
  })
})

test.describe(`SV-10 -- ${SV_10_FOLLOW}`, () => {
  test('GR-24: the panel follows the pointer while held and settles where it is let go', async () => {
    const one = await stage()
    try {
      await one.page.keyboard.press(OPEN_SEARCH)
      await settle(one.page)
      const start = await panelBox(one.page)
      const dx = Math.round(start.width / 10)
      const dy = -Math.round(start.height / 3)
      await grabAndHold(one.page, await headingBandSpot(one.page), dx, dy)
      const held = await panelBox(one.page)
      expect(Math.abs(held.x - start.x - dx), 'x while held').toBeLessThanOrEqual(WITHIN_A_PIXEL)
      expect(Math.abs(held.y - start.y - dy), 'y while held').toBeLessThanOrEqual(WITHIN_A_PIXEL)
      await one.page.mouse.up()
      await settle(one.page)
      expect(await panelBox(one.page)).toEqual(held)
    } finally {
      await one.close()
    }
  })

  test(`IN-1: ${IN_1_ESC} -- Esc during the drag puts the panel back where it was`, async () => {
    const one = await stage()
    try {
      await one.page.keyboard.press(OPEN_SEARCH)
      await settle(one.page)
      // WHY: IN-4 puts the focused panel's rung before the drag's, so the focus is taken out of the panel first.
      await one.page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
      const start = await panelBox(one.page)
      await grabAndHold(one.page, await headingBandSpot(one.page), Math.round(start.width / 10), -Math.round(start.height / 3))
      expect(await panelBox(one.page), 'the drag has to move the panel, or the Esc proves nothing').not.toEqual(start)
      await one.page.keyboard.press('Escape')
      await one.page.mouse.up()
      await settle(one.page)
      expect(await panelBox(one.page)).toEqual(start)
    } finally {
      await one.close()
    }
  })

  test(`SV-11: ${SV_11_INSIDE} -- dragged far past each corner, the panel stays inside the Schedule Canvas`, async () => {
    const one = await stage()
    try {
      await one.page.keyboard.press(OPEN_SEARCH)
      await settle(one.page)
      const canvas = await scheduleCanvasRange(one.page)
      const far = canvas.width + canvas.height
      for (const [dx, dy] of [[far, far], [-far, -far], [far, -far], [-far, far]] as const) {
        await grabAndHold(one.page, await headingBandSpot(one.page), dx, dy)
        await one.page.mouse.up()
        await settle(one.page)
        const box = await panelBox(one.page)
        const said = `after a drag of (${String(dx)}, ${String(dy)})`
        expect(box.x, said).toBeGreaterThanOrEqual(canvas.x - WITHIN_A_PIXEL)
        expect(box.y, said).toBeGreaterThanOrEqual(canvas.y - WITHIN_A_PIXEL)
        expect(box.right, said).toBeLessThanOrEqual(canvas.right + WITHIN_A_PIXEL)
        expect(box.bottom, said).toBeLessThanOrEqual(canvas.bottom + WITHIN_A_PIXEL)
      }
    } finally {
      await one.close()
    }
  })

  test(`IF-9: ${IF_9_ENTRY_ONLY} -- a drag begun on ${TEXT_SIZE} does not move the panel`, async () => {
    const one = await stage()
    try {
      await one.page.keyboard.press(OPEN_SEARCH)
      await settle(one.page)
      const start = await panelBox(one.page)
      const entry = await boxOf(one.page, `${SEARCH_PANEL} [data-icon="${TEXT_SIZE}"]`)
      if (entry === null) throw new Error(`${TEXT_SIZE} is not in the heading row`)
      await grabAndHold(one.page, { x: entry.x + entry.width / 2, y: entry.y + entry.height / 2 }, 0, -Math.round(start.height / 3))
      await one.page.mouse.up()
      await settle(one.page)
      const after = await panelBox(one.page)
      expect({ x: after.x, y: after.y }).toEqual({ x: start.x, y: start.y })
    } finally {
      await one.close()
    }
  })

  test(`GR-25: ${SV_11_EDGE} -- the right edge widens the panel`, async () => {
    const one = await stage()
    try {
      await one.page.keyboard.press(OPEN_SEARCH)
      await settle(one.page)
      const start = await panelBox(one.page)
      const widen = Math.round(start.width / 10)
      await grabAndHold(one.page, { x: start.right - WITHIN_A_PIXEL, y: start.y + start.height / 2 }, widen, 0)
      await one.page.mouse.up()
      await settle(one.page)
      const after = await panelBox(one.page)
      expect(Math.abs(after.width - start.width - widen)).toBeLessThanOrEqual(WITHIN_A_PIXEL)
      expect(after.x).toBe(start.x)
    } finally {
      await one.close()
    }
  })
})

test.describe(`RG-16 -- ${RG_16_ROW}`, () => {
  test('Esc with the focus in the panel closes it', async () => {
    const one = await stage()
    try {
      await openSearch(one.page, TASK_WORD)
      expect(await boxOf(one.page, SEARCH_PANEL)).not.toBeNull()
      await one.page.keyboard.press('Escape')
      await settle(one.page)
      expect(await boxOf(one.page, SEARCH_PANEL)).toBeNull()
    } finally {
      await one.close()
    }
  })
})
