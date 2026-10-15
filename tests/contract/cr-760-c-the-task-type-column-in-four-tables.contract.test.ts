// CR-760 spec-only cases: the Task Type column (SQ-14, DT-9, FM-9) -- left of the task column, Milestone from Task.milestone, filtered, sorted Task first in both languages, fixed, in the Markdown, and never matched by the word

import { describe, expect, it } from 'vitest'

import { OPENED_DELAY_DIAGNOSTICS_REPORT } from '../../src/adapter/screen-renderer/screen-renderer'
import { delayDiagnosticsReportFromWindow } from '../../src/adapter/screen-renderer/delay-diagnostics-report'
import {
  searchPanelAfterFilterChange,
  searchPanelFromSession,
  searchPanelWithFilterOpened,
} from '../../src/adapter/screen-renderer/search-panel'
import {
  advanceScreenSession,
  emptyScreenSession,
  emptySearchPanelSession,
  EVERY_ROW_SHOWN,
  type ScreenSession,
  type SessionEvent,
  type TableView,
} from '../../src/use-case/advance-screen-session/advance-screen-session'
import type { FakeElement } from '../fixtures/fake-browser'
import { LOG_ROLE, PROPOSALS_ROLE } from './cr-731-shell'
import { REQUIREMENTS, cellOf } from './cr-731-stage'
import {
  DT_9_VALUE,
  FM_9_VALUE,
  RW_10_FIXED,
  RW_3_WORD,
  RW_6_FIX_ORDER,
  RW_6_NO_VISIBILITY,
  RW_6_ORDER,
  SQ_14_FILTER,
  SQ_14_NOT_SHAPE,
  SQ_14_SORT,
  SQ_14_VALUE,
  SQ_14_WORDS,
  SV_4_WHERE,
  SV_6_FIXED,
  SV_8_TASK_TYPE,
  T_331_TYPE_LEFT_OF_TASK,
  T_347_ORDER,
  T_374_FIXED,
} from './cr-760-clauses'
import {
  LANGUAGES,
  TYPE_NAMED,
  TYPE_TASKS,
  cellOfColumn,
  copiedMarkdown,
  diagnosed,
  fixHeading,
  headingsIn,
  isFixedHeading,
  markdownTableWith,
  sortBy,
  reportHeading,
  reportRead,
  searchHeading,
  searchPanelElement,
  searchRead,
  searchShown,
  stageIn,
  taskTypeWord,
  typeDocument,
  typeTaskNamed,
  typeWordOf,
  type Language,
  type TableRead,
  type WindowStage,
} from './cr-760-stage'
import { specTable } from './spec-table'

const TYPE_TASK_OF = new Map(TYPE_TASKS.map((one) => [one.uid, one]))
const typeOfUid = (uid: number) => {
  const found = TYPE_TASK_OF.get(uid)
  if (found === undefined) throw new Error(`no Task Type task ${uid}`)
  return found
}

function expectTypeCells(read: TableRead, column: string, language: Language): void {
  expect(read.rows.length, 'premise: the table holds rows').toBeGreaterThan(0)
  for (const row of read.rows) {
    const task = typeOfUid(row.uid)
    expect(cellOfColumn(read, row.uid, column), `${task.name} (milestone ${String(task.milestone)}) in ${language}`).toBe(typeWordOf(task, language))
  }
}

const isMilestoneRow = (uid: number): boolean => typeOfUid(uid).milestone === true

function expectTasksThenMilestones(order: readonly number[], ascending: boolean): void {
  const kinds = order.map((uid) => (isMilestoneRow(uid) ? 1 : 0))
  expect(kinds, ascending ? 'Task before Milestone' : 'Milestone before Task').toEqual([...kinds].sort((a, b) => (ascending ? a - b : b - a)))
  expect(new Set(kinds).size, 'premise: both kinds are listed').toBe(2)
}

async function reportOpened(language: Language): Promise<WindowStage> {
  const stage = await stageIn(typeDocument(), language)
  await stage.press('IC-107')
  return stage
}

async function searchOpened(language: Language): Promise<WindowStage> {
  const stage = await stageIn(typeDocument(), language)
  await searchShown(stage)
  return stage
}

interface DrawnTable {
  readonly headings: readonly string[]
  readonly fixed: readonly string[]
  readonly rows: readonly (readonly string[])[]
}

function drawnTable(container: FakeElement | null, what: string): DrawnTable {
  if (container === null) throw new Error(`${what} is not drawn`)
  const heads = headingsIn(container)
  const headRows = new Set(heads.map((one) => one.parentNode))
  const rows = container.querySelectorAll('tr').filter((one) => !headRows.has(one))
  return {
    headings: heads.map((one) => one.textContent.trim()),
    fixed: heads.filter(isFixedHeading).map((one) => one.textContent.trim()),
    rows: rows.map((one) => one.children.filter((cell) => cell.tagName === 'TD').map((cell) => cell.textContent.trim())),
  }
}

function expectFixTypeCells(table: DrawnTable, language: Language): void {
  const typeAt = table.headings.indexOf(fixHeading('FM-9', language))
  const nameAt = table.headings.indexOf(fixHeading('FM-5', language))
  expect(table.rows.length, 'premise: the table holds rows').toBeGreaterThan(0)
  for (const row of table.rows) {
    const named = TYPE_TASKS.find((one) => (row[nameAt] ?? '').includes(one.name))
    expect(named, `premise: the row names a task: ${row.join(' | ')}`).toBeDefined()
    if (named !== undefined) expect(row[typeAt], named.name).toBe(typeWordOf(named, language))
  }
}

const SCREEN_LANGUAGE = (language: Language): ScreenSession => {
  const shown = advanceScreenSession(emptyScreenSession, { type: 'searchEntryPressed' } as unknown as SessionEvent).state
  return { ...shown, screen: { ...shown.screen, screenLanguage: language, helpLanguage: language } } as unknown as ScreenSession
}
const NO_VIEW: TableView = { visibility: EVERY_ROW_SHOWN, columnFilters: [], sort: null }
const CANVAS = { x: 0, y: 56, width: 1000, height: 600 }

describe('T-331 SQ-14 / T-347 DT-9 / T-374 FM-9 -- the manuscript these cases read', () => {
  it('SQ-14 takes Task.milestone, writes the taskTypes words, sorts Task first and filters by the two values', () => {
    expect(cellOf('T-331', 'SQ-14', '値')).toContain(SQ_14_VALUE)
    expect(cellOf('T-331', 'SQ-14', '値')).toContain(SQ_14_NOT_SHAPE)
    expect(cellOf('T-331', 'SQ-14', '書き方')).toContain(SQ_14_WORDS)
    expect(cellOf('T-331', 'SQ-14', '書き方')).toContain(SQ_14_SORT)
    expect(cellOf('T-331', 'SQ-14', 'フィルタ')).toBe(SQ_14_FILTER)
    expect(cellOf('T-330', 'SV-8', '定め')).toContain(SV_8_TASK_TYPE)
    expect(REQUIREMENTS).toContain(T_331_TYPE_LEFT_OF_TASK)
  })

  it('DT-9 and FM-9 are SQ-14, each left of its task column; the fixed columns reach the task column', () => {
    expect(REQUIREMENTS).toContain(T_347_ORDER)
    expect(cellOf('T-347', 'DT-9', '値')).toBe(DT_9_VALUE)
    expect(cellOf('T-374', 'FM-9', '値')).toBe(FM_9_VALUE)
    expect(specTable('T-347').rows.map((one) => one.id).slice(0, 5)).toEqual(['DT-8', 'DT-1', 'DT-3', 'DT-9', 'DT-4'])
    const fm = specTable('T-374').rows.map((one) => one.id)
    expect(fm.indexOf('FM-9') + 1).toBe(fm.indexOf('FM-5'))
    expect(cellOf('T-330', 'SV-6', '定め')).toContain(SV_6_FIXED)
    expect(cellOf('T-346', 'RW-10', '定め')).toContain(RW_10_FIXED)
    expect(REQUIREMENTS).toContain(T_374_FIXED)
  })

  it('RW-6 writes the tables in the column order of T-347 and T-374; RW-3 and SV-4 name the columns the word is matched against', () => {
    const rw6 = cellOf('T-346', 'RW-6', '定め')
    for (const clause of [RW_6_ORDER, RW_6_NO_VISIBILITY, RW_6_FIX_ORDER]) expect(rw6).toContain(clause)
    expect(cellOf('T-346', 'RW-3', '定め')).toContain(RW_3_WORD)
    expect(cellOf('T-330', 'SV-4', '定め')).toContain(SV_4_WHERE)
  })

  it('premise: the fixture has a milestone, a task and a task whose Task.milestone is empty', () => {
    const tasks = typeDocument().schedule.tasks
    expect(new Set(tasks.map((one) => one.milestone))).toEqual(new Set([true, false, null]))
  })
})

describe(`T-331 -- ${T_331_TYPE_LEFT_OF_TASK}`, () => {
  it.each(LANGUAGES)('%s: the search table puts SQ-14 just left of SQ-1, headed by its dictionary word, and fixes up to SQ-1', async (language) => {
    const stage = await searchOpened(language)
    const read = searchRead(stage)
    expect(read.columns.indexOf('SQ-14') + 1).toBe(read.columns.indexOf('SQ-1'))
    expect(read.fixed).toEqual(read.columns.slice(0, read.columns.indexOf('SQ-1') + 1))
    expect(read.fixed).toHaveLength(5)
    const heading = headingsIn(searchPanelElement(stage)).find((one) => one.getAttribute('data-column') === 'SQ-14')
    expect(heading?.textContent.trim()).toBe(searchHeading('SQ-14', language))
  })

  it.each(LANGUAGES)('%s: SQ-14 reads Milestone for Task.milestone true, Task for false and for empty', async (language) => {
    expectTypeCells(searchRead(await searchOpened(language)), 'SQ-14', language)
  })

  it.each(LANGUAGES)('%s: the report puts DT-9 just left of DT-4, fixes up to DT-4, and writes the same values', async (language) => {
    const stage = await reportOpened(language)
    const read = reportRead(stage)
    expect(read.columns.indexOf('DT-9') + 1).toBe(read.columns.indexOf('DT-4'))
    expect(read.fixed).toEqual(read.columns.slice(0, read.columns.indexOf('DT-4') + 1))
    expect(read.fixed).toHaveLength(5)
    const heading = headingsIn(stage.window() as FakeElement).find((one) => one.getAttribute('data-column') === 'DT-9')
    expect(heading?.textContent.trim()).toBe(reportHeading('DT-9', language))
    expectTypeCells(read, 'DT-9', language)
  })

  it.each(LANGUAGES)('%s: the fix proposals put FM-9 just left of FM-5, fix 修正 .. タスク, and write the type of each row', async (language) => {
    const stage = await reportOpened(language)
    await stage.press('IC-155')
    const table = drawnTable(stage.inside(PROPOSALS_ROLE), 'the proposals')
    expect(table.headings.indexOf(fixHeading('FM-9', language)) + 1).toBe(table.headings.indexOf(fixHeading('FM-5', language)))
    expect(table.fixed).toEqual(['FM-1', 'FM-3', 'FM-4', 'FM-9', 'FM-5'].map((row) => fixHeading(row, language)))
    expectFixTypeCells(table, language)
    expect(table.rows.some((row) => row.includes(taskTypeWord('milestone', language))), 'premise: a milestone row is proposed').toBe(true)
  })

  it('the fix log puts FM-9 just left of FM-5, fixes 日時 .. タスク, and writes the type of each row', async () => {
    const stage = await reportOpened('ja')
    await stage.press('IC-155')
    stage.browser.toSave.push(stage.file('chosen.json', new Uint8Array(0)))
    await stage.press('IC-157')
    await stage.press('IC-156')
    const table = drawnTable(stage.inside(LOG_ROLE), 'the fix log')
    expect(table.headings.indexOf(fixHeading('FM-9', 'ja')) + 1).toBe(table.headings.indexOf(fixHeading('FM-5', 'ja')))
    expect(table.fixed).toEqual(['FM-2', 'FM-4', 'FM-9', 'FM-5'].map((row) => fixHeading(row, 'ja')))
    expectFixTypeCells(table, 'ja')
  })
})

describe(`T-331 SQ-14 -- ${SQ_14_FILTER}`, () => {
  it.each(['task', 'milestone'] as const)('unticking %s in the SQ-14 filter keeps only the rows of the other value', (part) => {
    const session = SCREEN_LANGUAGE('ja')
    const schedule = typeDocument().schedule
    const panel = searchPanelWithFilterOpened(session, { ...emptySearchPanelSession, table: 'tasks' }, NO_VIEW, 'SQ-14')
    if (panel === null) throw new Error('premise: IC-122 opens the SQ-14 filter')
    const menu = searchPanelFromSession(session, panel, NO_VIEW, schedule, CANVAS)?.filterMenu
    if (menu?.kind !== 'values') throw new Error('premise: SQ-14 filters by a list of values')
    expect(menu.values.map((one) => one.label)).toEqual([taskTypeWord('task', 'ja'), taskTypeWord('milestone', 'ja')])
    const value = menu.values.find((one) => one.label === taskTypeWord(part, 'ja'))?.value ?? ''
    const view = searchPanelAfterFilterChange(session, panel, NO_VIEW, { kind: 'value', column: 'SQ-14', value, isShown: false })
    if (view === null) throw new Error('premise: the value can be unticked')
    const kept = (searchPanelFromSession(session, panel, view, schedule, CANVAS)?.rows ?? []).flatMap((one) =>
      one.target.kind === 'task' ? [one.target.taskUid] : [],
    )
    expect(kept.length, 'premise: rows are kept').toBeGreaterThan(0)
    for (const uid of kept) expect(isMilestoneRow(uid), typeOfUid(uid).name).toBe(part === 'task')
    expect(kept.sort((a, b) => a - b)).toEqual(TYPE_TASKS.filter((one) => (one.milestone === true) === (part === 'task')).map((one) => one.uid))
  })
})

describe(`T-330 SV-8 -- ${SQ_14_SORT}`, () => {
  it.each(LANGUAGES)('%s: the search table ascends Task then Milestone, and descends the reverse', async (language) => {
    const stage = await searchOpened(language)
    await sortBy(stage, () => searchPanelElement(stage), 'SQ-14', 'IC-123')
    expectTasksThenMilestones(searchRead(stage).rows.map((one) => one.uid), true)
    await sortBy(stage, () => searchPanelElement(stage), 'SQ-14', 'IC-124')
    expectTasksThenMilestones(searchRead(stage).rows.map((one) => one.uid), false)
  })

  it.each(LANGUAGES)('%s: the report ascends Task then Milestone, and descends the reverse', async (language) => {
    const stage = await reportOpened(language)
    await sortBy(stage, () => stage.window() as FakeElement, 'DT-9', 'IC-123')
    expectTasksThenMilestones(reportRead(stage).rows.map((one) => one.uid), true)
    await sortBy(stage, () => stage.window() as FakeElement, 'DT-9', 'IC-124')
    expectTasksThenMilestones(reportRead(stage).rows.map((one) => one.uid), false)
  })
})

describe(`T-346 RW-6 -- ${RW_6_ORDER}`, () => {
  it('the diagnosis table of IC-108 has the T-347 columns but DT-8, Task Type among them, and each row its type', async () => {
    const text = await copiedMarkdown(await reportOpened('ja'))
    const columns = specTable('T-347').rows.map((one) => one.id).filter((one) => one !== 'DT-8')
    const table = markdownTableWith(text, reportHeading('DT-9', 'ja'))
    expect(table.heading).toEqual(columns.map((one) => reportHeading(one, 'ja')))
    const typeAt = columns.indexOf('DT-9')
    const nameAt = columns.indexOf('DT-4')
    expect(table.rows.length, 'premise: the table holds rows').toBeGreaterThan(0)
    for (const row of table.rows) expect(row[typeAt], row[nameAt]).toBe(typeWordOf(typeTaskNamed(row[nameAt] ?? ''), 'ja'))
  })

  it('the proposals table of IC-108 has FM-9 just left of FM-5, and each row its type', async () => {
    const text = await copiedMarkdown(await reportOpened('ja'))
    const diagnosisEnds = text.indexOf(reportHeading('DT-9', 'ja'))
    const table = markdownTableWith(text, fixHeading('FM-9', 'ja'), text.slice(0, diagnosisEnds).split('\n').length)
    const typeAt = table.heading.indexOf(fixHeading('FM-9', 'ja'))
    const nameAt = table.heading.indexOf(fixHeading('FM-5', 'ja'))
    expect(typeAt + 1).toBe(nameAt)
    expect(table.rows.length, 'premise: the table holds rows').toBeGreaterThan(0)
    for (const row of table.rows) {
      const named = TYPE_TASKS.find((one) => (row[nameAt] ?? '').includes(one.name))
      expect(named, `premise: the row names a task: ${row.join(' | ')}`).toBeDefined()
      if (named !== undefined) expect(row[typeAt], named.name).toBe(typeWordOf(named, 'ja'))
    }
  })
})

describe(`T-346 RW-3 / T-330 SV-4 -- the word is not matched against the Task Type words`, () => {
  const report = () => diagnosed(typeDocument())
  const reportRowsFor = (word: string): readonly number[] => {
    const window = { ...OPENED_DELAY_DIAGNOSTICS_REPORT, panel: { ...OPENED_DELAY_DIAGNOSTICS_REPORT.panel, word } }
    const view = delayDiagnosticsReportFromWindow(SCREEN_LANGUAGE('ja'), window, NO_VIEW, report(), typeDocument().schedule, {
      canvas: CANVAS,
      textSizeStep: 1,
    })
    if (view === null) throw new Error('premise: an opened report has a view')
    return view.rows.flatMap((one) => (one.target.kind === 'task' ? [one.target.taskUid] : []))
  }
  const searchRowsFor = (word: string): readonly number[] => {
    const view = searchPanelFromSession(SCREEN_LANGUAGE('ja'), { ...emptySearchPanelSession, table: 'tasks', word }, NO_VIEW, typeDocument().schedule, CANVAS)
    if (view === null) throw new Error('premise: a shown panel has a view')
    return view.rows.flatMap((one) => (one.target.kind === 'task' ? [one.target.taskUid] : []))
  }

  it('premise: with no word the report lists more than the named task, the search table every task, and one name holds the Task word', () => {
    expect(reportRowsFor('')).toEqual(expect.arrayContaining([typeTaskNamed(TYPE_NAMED).uid, typeTaskNamed('Gate').uid]))
    expect(searchRowsFor('').length).toBe(TYPE_TASKS.length)
    expect(TYPE_NAMED).toContain(taskTypeWord('task', 'ja'))
  })

  it(`RW-3: typing the Task word keeps only the row whose name holds it, and the Milestone word keeps none`, () => {
    expect(reportRowsFor(taskTypeWord('task', 'ja'))).toEqual([typeTaskNamed(TYPE_NAMED).uid])
    expect(reportRowsFor(taskTypeWord('milestone', 'ja'))).toEqual([])
  })

  it(`SV-4: typing the Task word keeps only the row whose name holds it, and the Milestone word keeps none`, () => {
    expect(searchRowsFor(taskTypeWord('task', 'ja'))).toEqual([typeTaskNamed(TYPE_NAMED).uid])
    expect(searchRowsFor(taskTypeWord('milestone', 'ja'))).toEqual([])
  })
})
