// CR-760 spec-only cases: the Search Panel's status column (SQ-5) shows the progress marker -- late without the diagnosis, DG-1 .. DG-3 while it is shown -- and sorts by SV-8

import { describe, expect, it } from 'vitest'

import {
  SQ_5_DG_WINS,
  SQ_5_GLYPHS,
  SQ_5_LATE_ALWAYS,
  SQ_5_NOT_BY_DRAWING,
  SQ_5_VALUE,
  SQ_5_WHILE_SHOWN,
  SQ_5_WORDS,
  SV_8_STATES,
  SV_8_TIES,
} from './cr-760-clauses'
import {
  LANGUAGES,
  MARKER_TASKS,
  cellOfColumn,
  diagnosisRowsOf,
  markerDocument,
  markerTask,
  markerWithDiagnosis,
  markerWithoutDiagnosis,
  pressHeadingFilter,
  pressMenuEntry,
  rankOf,
  searchPanelElement,
  searchRead,
  searchShown,
  stageIn,
  wordOfMarker,
  type DiagnosisRows,
  type Language,
  type Marker,
  type WindowStage,
} from './cr-760-stage'
import { cellOf } from './cr-731-stage'

const STATUS = 'SQ-5'
const DIAGNOSIS = diagnosisRowsOf(markerDocument())
const NONE: DiagnosisRows = { byUid: new Map(), bottlenecks: [], every: [] }

const expectedOf = (rows: DiagnosisRows) => (uid: number): Marker =>
  rows === NONE ? markerWithoutDiagnosis(markerTask(uid)) : markerWithDiagnosis(markerTask(uid), rows)

function expectRowsShow(stage: WindowStage, rows: DiagnosisRows, language: Language): void {
  const read = searchRead(stage)
  const expected = expectedOf(rows)
  expect(read.rows.map((one) => one.uid).sort((a, b) => a - b)).toEqual(MARKER_TASKS.map((one) => one.uid).sort((a, b) => a - b))
  for (const row of read.rows) {
    const task = markerTask(row.uid)
    const marker = expected(row.uid)
    expect(row.glyph, `${task.name}: the glyph`).toBe(marker)
    expect(cellOfColumn(read, row.uid, STATUS), `${task.name}: the word in ${language}`).toBe(wordOfMarker(task, marker, language))
  }
}

async function opened(language: Language, diagnosed: boolean): Promise<WindowStage> {
  const stage = await stageIn(markerDocument(), language)
  if (diagnosed) await stage.press('IC-107')
  await searchShown(stage)
  return stage
}

async function sortedBy(stage: WindowStage, entry: 'IC-123' | 'IC-124'): Promise<readonly number[]> {
  await pressHeadingFilter(stage, searchPanelElement(stage), STATUS)
  await pressMenuEntry(stage, entry)
  return searchRead(stage).rows.map((one) => one.uid)
}

function expectSortedAndStable(order: readonly number[], defaultOrder: readonly number[], rows: DiagnosisRows, direction: 1 | -1): void {
  const expected = expectedOf(rows)
  const ranks = order.map((uid) => rankOf(markerTask(uid), expected(uid)))
  expect(ranks, 'SV-8: the ranks run in the order of the direction').toEqual([...ranks].sort((a, b) => direction * (a - b)))
  for (const rank of new Set(ranks)) {
    const tied = order.filter((uid) => rankOf(markerTask(uid), expected(uid)) === rank)
    expect(tied, `${SV_8_TIES} (rank ${rank})`).toEqual(defaultOrder.filter((uid) => tied.includes(uid)))
  }
}

describe('T-331 SQ-5 / T-330 SV-8 -- the manuscript these cases read', () => {
  it('SQ-5 is the value of the progress marker, PM-4 without the diagnosis and DG-1 .. DG-3 only while it is shown', () => {
    const value = cellOf('T-331', 'SQ-5', '値')
    for (const clause of [SQ_5_VALUE, SQ_5_DG_WINS, SQ_5_LATE_ALWAYS, SQ_5_WHILE_SHOWN, SQ_5_NOT_BY_DRAWING]) expect(value).toContain(clause)
    const written = cellOf('T-331', 'SQ-5', '書き方')
    for (const clause of [SQ_5_GLYPHS, SQ_5_WORDS]) expect(written).toContain(clause)
  })

  it('SV-8 orders the status column from DG-1 to the pause without a date', () => {
    expect(cellOf('T-330', 'SV-8', '定め')).toContain(SV_8_STATES)
    expect(cellOf('T-330', 'SV-8', '定め')).toContain(SV_8_TIES)
  })

  it('premise: the diagnosis names a DG-1, a DG-2 and a DG-3, on late tasks and on tasks that are not late', () => {
    const named = [...DIAGNOSIS.byUid.entries()]
    for (const row of ['DG-1', 'DG-2', 'DG-3']) expect(named.some(([, one]) => one === row), row).toBe(true)
    expect(named.some(([uid]) => markerTask(uid).late !== null), 'a diagnosed task that is late').toBe(true)
    expect(named.some(([uid]) => markerTask(uid).late === null), 'a diagnosed task that is not late').toBe(true)
    expect(MARKER_TASKS.some((one) => one.late !== null && !DIAGNOSIS.byUid.has(one.uid)), 'a late task the diagnosis leaves alone').toBe(true)
  })
})

describe(`T-331 SQ-5 -- ${SQ_5_LATE_ALWAYS}`, () => {
  it.each(LANGUAGES)('%s: without the diagnosis a late task shows the PM-4 glyph and the DG-4 word, the others their state', async (language) => {
    expectRowsShow(await opened(language, false), NONE, language)
  })

  it('without the diagnosis no row shows DG-1, DG-2 or DG-3', async () => {
    const read = searchRead(await opened('ja', false))
    expect(read.rows.map((one) => one.glyph).filter((one) => String(one).startsWith('DG-'))).toEqual([])
  })
})

describe(`T-331 SQ-5 -- ${SQ_5_WHILE_SHOWN}`, () => {
  it.each(LANGUAGES)('%s: with the diagnosis shown, DG-1 .. DG-3 win over PM-4 and over the state', async (language) => {
    expectRowsShow(await opened(language, true), DIAGNOSIS, language)
  })

  it('a late task the diagnosis names DG-1 reads (?), not late', async () => {
    const read = searchRead(await opened('ja', true))
    const odd = [...DIAGNOSIS.byUid.entries()].find(([uid, row]) => row === 'DG-1' && markerTask(uid).late !== null)
    expect(odd, 'premise: a late task named DG-1').toBeDefined()
    expect(read.rows.find((one) => one.uid === odd?.[0])?.glyph).toBe('DG-1')
  })

  it('the ancestor task of a bottleneck reads (!!) (DG-3)', async () => {
    const read = searchRead(await opened('ja', true))
    expect(DIAGNOSIS.byUid.get(5), 'premise: Running is a bottleneck').toBe('DG-2')
    expect(DIAGNOSIS.byUid.get(12), 'premise: Holder, the parent of Running, is on the bottleneck path').toBe('DG-3')
    expect(read.rows.find((one) => one.uid === 12)?.glyph).toBe('DG-3')
  })

  // WHY: CR-781 -- IC-107 again with the report open closes only the window (FR-130); the diagnosis ends with IC-40 (RW-1).
  it('ending the diagnosis (IC-40) brings back the values without it', async () => {
    const stage = await opened('ja', true)
    await stage.press('IC-40')
    expectRowsShow(stage, NONE, 'ja')
  })
})

describe(`T-330 SV-8 -- ${SV_8_STATES}`, () => {
  it.each([false, true])('ascending, with the diagnosis shown: %s', async (diagnosed) => {
    const stage = await opened('ja', diagnosed)
    const defaultOrder = searchRead(stage).rows.map((one) => one.uid)
    expectSortedAndStable(await sortedBy(stage, 'IC-123'), defaultOrder, diagnosed ? DIAGNOSIS : NONE, 1)
  })

  it.each([false, true])('descending, with the diagnosis shown: %s', async (diagnosed) => {
    const stage = await opened('ja', diagnosed)
    const defaultOrder = searchRead(stage).rows.map((one) => one.uid)
    expectSortedAndStable(await sortedBy(stage, 'IC-124'), defaultOrder, diagnosed ? DIAGNOSIS : NONE, -1)
  })

  it('premise: every rank of SV-8 has a row in one of the two sorts, with the diagnosis and without it', () => {
    const ranks = new Set(
      MARKER_TASKS.flatMap((one) => [rankOf(one, markerWithDiagnosis(one, DIAGNOSIS)), rankOf(one, markerWithoutDiagnosis(one))]),
    )
    expect([...ranks].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8])
  })
})
