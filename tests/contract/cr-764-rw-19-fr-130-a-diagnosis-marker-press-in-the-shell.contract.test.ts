// CR-764 spec-only contract over the shell: a press on a diagnosis marker opens the report at its row, and IC-107 with the report closed runs the diagnosis again.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import type { Document } from '../../src/entity/document-model/document/document'
import type { Task } from '../../src/entity/document-model/schedule/schedule'
import type { ScreenView } from '../../src/adapter/screen-renderer/screen-renderer'
import { selfAndDescendants, type FakeElement } from '../fixtures/fake-browser'
import { pointerOf } from '../unit/cr-541-stage'
import { keyOfRow } from './cr-610-file-flow-stage'
import { FINISH_OF, FS, START_OF, documentOf, type TaskSpec } from './cr-731-stage'
import { windowStage, type WindowStage } from './cr-760-stage'
import { specTable, unbroken } from './spec-table'

const RW_19_STEPS_IN_ORDER =
  '遅延診断を出しているあいだ、日程表で `FR-133` の 表 T-315 の `DG-1` 〜 `DG-3` で描いた進捗マーカー（表 T-266 の `GA-18`）を押して離したら、状態を巡らせず（表 T-270 の `PE-8`・`PE-10` の例外）、次をこの順に行うこと（MUST）'
const RW_19_FIRST = '① 窓が閉じていれば開き（`RW-1`）、最小化していれば戻し（`IC-129`）、手前に出す'
const RW_19_SECOND = '② 診断結果の表（`RW-11` の `IC-154`）を出していなければ出す'
const RW_19_FOURTH = '④ 行を表の中に送り、`RW-14` と同じいまの行の印を付ける。'
const RW_19_DG_4_CYCLES = '⭐ `DG-4`（`!`）と、どの状態でもないマーカーは今どおり巡る'
const RW_19_PULL = '⚠️ 引く操作（`PE-8` の「引く」の欄）は変えない。'
const RW_19_ONE_MARK = '⚠️ いまの行の印は表に 1 つで、次にマーカーを押すまで残る。'
const RW_19_MARK_GONE = '診断を作り直してその行が無くなれば消える。'
const RW_19_FIXES_STILL = '⚠️ 修正案の表とそのいまの行（`RW-14`）は動かさない（利用者が定めた）。'
const RW_19_SELECTED = '⚠️ 押したタスクは今どおり選ぶ（`FR-107`）。'
const RW_19_VIEW_STILL = '日程表の見る位置は動かさない'
const RW_1_REOPENED = '窓だけを閉じたあとは、`RW-19` のマーカーの押下で開き直す —— 開くのは閉じたときの位置と大きさである。'
const RW_1_IC_107 = '`IC-107` を押せば診断をやり直して開く（`FR-130`）'
const PE_8_EXCEPTION =
  '⚠️ 遅延診断を出しているあいだ、`FR-133` の 表 T-315 の `DG-1` 〜 `DG-3` で描いたマーカーは巡らせない —— `FR-134` の 表 T-346 の `RW-19` に従う'
const PE_10_EXCEPTION = '⚠️ 遅延診断を出しているあいだの例外は `PE-8` と同じ（`RW-19`）'
// WHY: CR-781 rewrote this sentence of FR-130: an open window (minimized included) is closed alone like IC-52, and the marks stay.
const FR_130_THE_SAME_ENTRY =
  '診断を出しているあいだに同じ入口を押したら、遅延診断レポートの窓（`FR-134` の 表 T-346 の `RW-1`）が開いていれば（最小化を含む）、窓の `IC-52` と同じく窓だけを閉じ、窓だけを閉じていれば（`IC-52`）いまの文書で診断をやり直し、その結果をマーカーと一覧に出して窓を開くこと（MUST）'

const SPEC = join(process.cwd(), 'docs', 'spec')
const REQUIREMENTS = unbroken(readFileSync(join(SPEC, '01-04-requirements.md'), 'utf8'))
type Words = { readonly ja: string; readonly en: string }
type IconWords = { readonly rowId: string; readonly hint?: Words }
const SPEC_WORDS = JSON.parse(readFileSync(join(SPEC, '_source', 'display-words.json'), 'utf8')) as { readonly icons: readonly IconWords[] }
const SHIPPED_WORDS = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'adapter', 'screen-renderer', 'display-words.json'), 'utf8'),
) as { readonly icons: readonly IconWords[] }

const cellOf = (table: string, id: string, heading: string): string =>
  unbroken(specTable(table).rows.find((one) => one.id === id)?.by[heading] ?? '')

// see T-315
// WHY: SELF depends on itself (DG-1), LATE is not started after its start (DG-2), PARENT is its ancestor (DG-3),
// WHY: WAITING waits on the late SLOW (DG-4) and PLAIN has no state; the premise case checks each.
// WHY: BEHIND follows AHEAD; begun first, it makes AHEAD a predecessor still open (VO-3, DG-1) until undone.
const SELF = 40
const PARENT = 20
const LATE = 21
const SLOW = 30
const WAITING = 31
const PLAIN = 7
const AHEAD = 8
const BEHIND = 9

const span = (uid: number, from: string, to: string, extra: Partial<TaskSpec> = {}): TaskSpec => ({
  uid,
  start: START_OF(`2027-${from}`),
  finish: FINISH_OF(`2027-${to}`),
  ...extra,
})

// WHY: the canvas starts before April, so every marker stands on the chart and clear of the report window below it.
function seeded(): Document {
  const made = documentOf(
    [
      span(SELF, '05-03', '05-04', { after: [[SELF, FS]], name: 'Self' }),
      span(PARENT, '04-05', '04-09', { name: 'Parent' }),
      span(LATE, '04-05', '04-09', { parent: PARENT, name: 'Late child' }),
      span(SLOW, '04-05', '04-09', { actualStart: START_OF('2027-04-05'), percentComplete: 50, name: 'Slow' }),
      span(WAITING, '04-12', '04-16', { after: [[SLOW, FS]], name: 'Waiting' }),
      span(PLAIN, '06-07', '06-11', { name: 'Plain' }),
      span(AHEAD, '06-07', '06-11', { name: 'Ahead' }),
      span(BEHIND, '06-14', '06-18', { after: [[AHEAD, FS]], name: 'Behind' }),
    ],
    { statusDate: '2027-04-21T00:00:00' },
  )
  return { ...made, documentSettings: { ...made.documentSettings, scrollDate: '2027-03-29T00:00:00' } } as Document
}

const staged = async (): Promise<WindowStage> => windowStage(seeded())
const diagnosed = async (): Promise<WindowStage> => {
  const stage = await staged()
  await stage.press('IC-107')
  return stage
}

interface Marker {
  readonly symbol: string
  readonly x: number
  readonly y: number
}

function markerOf(stage: WindowStage, uid: number): Marker {
  const drawn = stage.loop.current()?.geometry.tasks.find((one) => one.taskUid === uid)?.marker
  if (drawn === undefined || drawn === null) throw new Error(`premise: Task ${String(uid)} draws a progress marker`)
  return { symbol: String(drawn.symbol), x: drawn.center.x, y: drawn.center.y }
}

async function pressMarker(stage: WindowStage, uid: number): Promise<void> {
  const at = markerOf(stage, uid)
  await stage.key(pointerOf('down', at.x, at.y) as never)
  await stage.key(pointerOf('up', at.x, at.y) as never)
}

async function pullMarker(stage: WindowStage, uid: number, dx: number): Promise<void> {
  const at = markerOf(stage, uid)
  await stage.key(pointerOf('down', at.x, at.y) as never)
  await stage.key(pointerOf('move', at.x + dx / 2, at.y) as never)
  await stage.key(pointerOf('move', at.x + dx, at.y) as never)
  await stage.key(pointerOf('up', at.x + dx, at.y) as never)
}

async function drag(stage: WindowStage, from: readonly [number, number], to: readonly [number, number]): Promise<void> {
  await stage.key(pointerOf('down', from[0], from[1]) as never)
  await stage.key(pointerOf('move', (from[0] + to[0]) / 2, (from[1] + to[1]) / 2) as never)
  await stage.key(pointerOf('move', to[0], to[1]) as never)
  await stage.key(pointerOf('up', to[0], to[1]) as never)
}

const taskOf = (stage: WindowStage, uid: number): Task => {
  const found = stage.loop.document().schedule.tasks.find((one) => one.uid === uid)
  if (found === undefined) throw new Error(`Task ${String(uid)} left the document`)
  return found
}

interface ReportSeen {
  readonly shown: string
  readonly isInFront: boolean
  readonly at: unknown
  readonly size: unknown
  readonly rows: readonly { readonly target?: { readonly kind: string; readonly taskUid?: number }; readonly isCurrent?: boolean }[]
  readonly fixes?: unknown
}

const reportOf = (stage: WindowStage): ReportSeen | null =>
  ((stage.last() as unknown as { delayDiagnosticsReport?: ReportSeen | null }).delayDiagnosticsReport ?? null)
const needReport = (stage: WindowStage): ReportSeen => {
  const found = reportOf(stage)
  if (found === null) throw new Error('the report window is not described')
  return found
}
const currentUids = (stage: WindowStage): readonly number[] =>
  (reportOf(stage)?.rows ?? []).flatMap((row) => (row.isCurrent === true && row.target?.kind === 'task' ? [row.target.taskUid ?? -1] : []))
const reportUids = (stage: WindowStage): readonly number[] =>
  (reportOf(stage)?.rows ?? []).flatMap((row) => (row.target?.kind === 'task' ? [row.target.taskUid ?? -1] : []))
const isDiagnosisDrawn = (stage: WindowStage): boolean =>
  (stage.loop.current()?.geometry.tasks ?? []).some((one) => /^DG-/.test(String(one.marker?.symbol ?? '')))
const selectedUids = (stage: WindowStage): readonly number[] =>
  ((stage.loop.agentApiSeams().source.readSnapshot().selection as unknown as { items?: { uid: number }[] }).items ?? []).map((one) => one.uid)
const searchPanelOf = (stage: WindowStage): unknown =>
  (stage.last() as unknown as ScreenView & { searchPanel?: unknown }).searchPanel ?? null

const rowsIn = (container: FakeElement): FakeElement[] => {
  const head = new Set(selfAndDescendants(container).filter((one) => one.tagName === 'THEAD').flatMap((one) => selfAndDescendants(one)))
  return selfAndDescendants(container).filter((one) => one.tagName === 'TR' && !head.has(one))
}
// see RW-11
const chosenTab = (stage: WindowStage): string | null =>
  ((needReport(stage) as unknown as { tabEntries?: readonly { icon: string; isChosen: boolean }[] }).tabEntries ?? []).find((one) => one.isChosen)?.icon ?? null
// see RW-14
const counterOf = (stage: WindowStage): string => JSON.stringify((needReport(stage) as unknown as { walkCounter?: unknown }).walkCounter ?? null)

describe('CR-764 -- the clauses this file is driven by', () => {
  it('T-346 RW-19 and RW-1, T-270 PE-8 and PE-10, FR-130 still read this way', () => {
    const rw19 = cellOf('T-346', 'RW-19', '定め')
    for (const clause of [
      RW_19_STEPS_IN_ORDER,
      RW_19_FIRST,
      RW_19_SECOND,
      RW_19_FOURTH,
      RW_19_DG_4_CYCLES,
      RW_19_PULL,
      RW_19_ONE_MARK,
      RW_19_MARK_GONE,
      RW_19_FIXES_STILL,
      RW_19_SELECTED,
      RW_19_VIEW_STILL,
    ]) {
      expect(rw19, clause).toContain(clause)
    }
    const rw1 = cellOf('T-346', 'RW-1', '定め')
    expect(rw1).toContain(RW_1_REOPENED)
    expect(rw1).toContain(RW_1_IC_107)
    expect(REQUIREMENTS).toContain(PE_8_EXCEPTION)
    expect(REQUIREMENTS).toContain(PE_10_EXCEPTION)
    expect(REQUIREMENTS).toContain(FR_130_THE_SAME_ENTRY)
  })

  it('premise: the stage draws each state of T-315 it needs while the diagnosis is shown, and none before', async () => {
    const stage = await staged()
    expect([SELF, PARENT, LATE, WAITING, PLAIN].map((uid) => markerOf(stage, uid).symbol).filter((one) => one.startsWith('DG-'))).toEqual([])
    await stage.press('IC-107')
    expect(markerOf(stage, SELF).symbol).toBe('DG-1')
    expect(markerOf(stage, LATE).symbol).toBe('DG-2')
    expect(markerOf(stage, PARENT).symbol).toBe('DG-3')
    expect(markerOf(stage, WAITING).symbol, 'DG-4 is drawn as PM-4 (T-315)').toBe('PM-4')
    expect(markerOf(stage, PLAIN).symbol).toBe('PM-1a')
    expect(reportUids(stage)).toEqual(expect.arrayContaining([SELF, PARENT, LATE, WAITING]))
    expect(currentUids(stage)).toEqual([])
  })
})

describe(`RW-19 / PE-8 / PE-10 -- ${RW_19_STEPS_IN_ORDER}`, () => {
  it('premise: before the diagnosis the same markers cycle (PE-8 / PE-10)', async () => {
    for (const uid of [SELF, PARENT, LATE]) {
      const stage = await staged()
      const before = taskOf(stage, uid)
      await pressMarker(stage, uid)
      expect(taskOf(stage, uid), `Task ${String(uid)} cycles`).not.toEqual(before)
    }
  })

  it(`${PE_8_EXCEPTION} -- a DG-1, DG-2 or DG-3 marker pressed leaves the task as it was`, async () => {
    for (const uid of [SELF, LATE, PARENT]) {
      const stage = await diagnosed()
      const before = taskOf(stage, uid)
      await pressMarker(stage, uid)
      expect(taskOf(stage, uid), `Task ${String(uid)} drawn as ${markerOf(stage, uid).symbol}`).toEqual(before)
    }
  })

  it(`④ ${RW_19_FOURTH} -- the row of the pressed task is the one current row`, async () => {
    for (const uid of [SELF, LATE, PARENT]) {
      const stage = await diagnosed()
      await pressMarker(stage, uid)
      expect(currentUids(stage), `Task ${String(uid)}`).toEqual([uid])
    }
  })

  it(`④ the mark is the same mark RW-14 gives the current row of the fix table`, async () => {
    const stage = await diagnosed()
    await stage.press('IC-155')
    await stage.press('IC-160')
    const fixLine = rowsIn(stage.window()!).find((one) => (one.getAttribute('style') ?? '') !== '')
    expect(fixLine, 'premise: RW-14 marks a current row of the fix table').toBeDefined()
    await pressMarker(stage, LATE)
    const marked = rowsIn(stage.window()!).filter((one) => (one.getAttribute('style') ?? '') === (fixLine?.getAttribute('style') ?? ''))
    expect(marked, 'exactly one row of the diagnosis table carries that mark').toHaveLength(1)
    expect(marked[0]?.textContent ?? '').toContain('Late child')
  })

  it('a press is not a step: undo takes back the edit made before it', async () => {
    const stage = await diagnosed()
    const plainBefore = taskOf(stage, PLAIN)
    await pressMarker(stage, PLAIN)
    expect(taskOf(stage, PLAIN), 'premise: the plain marker cycled').not.toEqual(plainBefore)
    const lateBefore = taskOf(stage, LATE)
    await pressMarker(stage, LATE)
    await stage.key(keyOfRow('SK-6') as never)
    expect(taskOf(stage, PLAIN), 'the one undo takes back the plain marker').toEqual(plainBefore)
    expect(taskOf(stage, LATE)).toEqual(lateBefore)
  })

  it(`${RW_19_DG_4_CYCLES}`, async () => {
    for (const uid of [WAITING, PLAIN]) {
      const stage = await diagnosed()
      const before = taskOf(stage, uid)
      await pressMarker(stage, uid)
      expect(taskOf(stage, uid), `Task ${String(uid)} cycles`).not.toEqual(before)
      expect(currentUids(stage), 'no row is marked').toEqual([])
    }
  })

  it(`${RW_19_PULL} -- a DG-2 marker pulled right still writes the actual (PE-8 pull)`, async () => {
    const stage = await diagnosed()
    const before = taskOf(stage, LATE)
    await pullMarker(stage, LATE, 120)
    expect(taskOf(stage, LATE)).not.toEqual(before)
    expect(currentUids(stage), 'a pull marks no row').toEqual([])
  })

  it(`${RW_19_SELECTED}`, async () => {
    const stage = await diagnosed()
    await pressMarker(stage, PARENT)
    expect(selectedUids(stage)).toEqual([PARENT])
  })

  it(`${RW_19_VIEW_STILL}`, async () => {
    const stage = await diagnosed()
    const before = [SELF, PARENT, LATE, WAITING, PLAIN].map((uid) => markerOf(stage, uid))
    await pressMarker(stage, SELF)
    expect([SELF, PARENT, LATE, WAITING, PLAIN].map((uid) => markerOf(stage, uid)).map(({ x, y }) => ({ x, y }))).toEqual(
      before.map(({ x, y }) => ({ x, y })),
    )
  })

  it(`${RW_19_ONE_MARK}`, async () => {
    const stage = await diagnosed()
    await pressMarker(stage, SELF)
    await pressMarker(stage, PLAIN)
    expect(currentUids(stage), 'a plain marker press leaves the mark where it was').toEqual([SELF])
    await pressMarker(stage, LATE)
    expect(currentUids(stage)).toEqual([LATE])
  })

  it(`${RW_19_MARK_GONE}`, async () => {
    const stage = await diagnosed()
    expect(reportUids(stage), 'premise: AHEAD has no row').not.toContain(AHEAD)
    await pressMarker(stage, BEHIND)
    expect(markerOf(stage, AHEAD).symbol, 'premise: BEHIND begun makes AHEAD an open predecessor').toBe('DG-1')
    await pressMarker(stage, AHEAD)
    expect(currentUids(stage)).toEqual([AHEAD])
    await stage.key(keyOfRow('SK-6') as never)
    expect(reportUids(stage), 'premise: undone, AHEAD has no row again').not.toContain(AHEAD)
    expect(currentUids(stage)).toEqual([])
    await pressMarker(stage, BEHIND)
    expect(currentUids(stage), 'the row back again comes back without the mark').toEqual([])
  })
})

describe(`RW-19 ① -- ${RW_19_FIRST}`, () => {
  it(`the closed window opens again (${RW_1_REOPENED})`, async () => {
    const stage = await diagnosed()
    await drag(stage, [699, 600], [900, 600])
    await drag(stage, [300, 429], [300, 300])
    const placed = needReport(stage)
    expect(placed.at, 'premise: the window was moved from where it opened').not.toBeNull()
    await stage.press('IC-52')
    expect(reportOf(stage)).toBeNull()
    expect(isDiagnosisDrawn(stage), 'closing the window alone keeps the diagnosis (RW-1)').toBe(true)
    await pressMarker(stage, SELF)
    const reopened = needReport(stage)
    expect({ at: reopened.at, size: reopened.size }).toEqual({ at: placed.at, size: placed.size })
    expect(currentUids(stage)).toEqual([SELF])
  })

  it('a minimized window is restored', async () => {
    const stage = await diagnosed()
    await stage.press('IC-129')
    expect(needReport(stage).shown).toBe('minimized')
    await pressMarker(stage, LATE)
    expect(needReport(stage).shown).toBe('normal')
    expect(currentUids(stage)).toEqual([LATE])
  })

  it('a window behind another is brought to the front', async () => {
    const stage = await diagnosed()
    await stage.press('IC-117')
    expect(searchPanelOf(stage), 'premise: the Search Panel is open').not.toBeNull()
    expect(needReport(stage).isInFront, 'premise: the Search Panel opened later stands in front').toBe(false)
    await pressMarker(stage, PARENT)
    expect(needReport(stage).isInFront).toBe(true)
  })
})

describe(`RW-19 ② -- ${RW_19_SECOND}; ${RW_19_FIXES_STILL}`, () => {
  it('from the fix table the window turns to the diagnosis table, and the fix table keeps its current row', async () => {
    const stage = await diagnosed()
    await stage.press('IC-155')
    await stage.press('IC-160')
    const fixesBefore = counterOf(stage)
    expect(fixesBefore, 'premise: RW-14 counts a current row').not.toBe('null')
    expect(chosenTab(stage), 'premise: the fix table is shown').toBe('IC-155')
    await pressMarker(stage, LATE)
    expect(chosenTab(stage)).toBe('IC-154')
    expect(currentUids(stage)).toEqual([LATE])
    await stage.press('IC-155')
    expect(counterOf(stage)).toBe(fixesBefore)
  })
})

describe(`FR-130 -- ${FR_130_THE_SAME_ENTRY}`, () => {
  it('with the window open, IC-107 closes the window alone like IC-52: the markers stay (FR-130, RW-1 as CR-781 rewrote them)', async () => {
    const stage = await diagnosed()
    expect(reportOf(stage)).not.toBeNull()
    await stage.press('IC-107')
    expect(reportOf(stage)).toBeNull()
    expect(isDiagnosisDrawn(stage)).toBe(true)
  })

  it('with the window alone closed, IC-107 runs the diagnosis again: the markers stay and the window opens; pressed again it closes the window alone', async () => {
    const stage = await diagnosed()
    await stage.press('IC-52')
    expect(reportOf(stage)).toBeNull()
    await stage.press('IC-107')
    expect(reportOf(stage), 'the window opens').not.toBeNull()
    expect(isDiagnosisDrawn(stage), 'the markers are shown').toBe(true)
    expect(markerOf(stage, SELF).symbol).toBe('DG-1')
    await stage.press('IC-107')
    expect(reportOf(stage), 'pressed again with the window open, only the window closes (FR-130)').toBeNull()
    expect(isDiagnosisDrawn(stage), 'the markers stay (FR-130)').toBe(true)
  })

  it('the result is the one of the document as it is now: a task changed while the window was closed is in the list', async () => {
    const stage = await diagnosed()
    expect(reportUids(stage), 'premise: the plain task has no row').not.toContain(PLAIN)
    await stage.press('IC-52')
    await pressMarker(stage, PLAIN)
    await pressMarker(stage, PLAIN)
    await stage.press('IC-107')
    const listed = reportUids(stage)
    const fresh = await windowStage(stage.loop.document())
    await fresh.press('IC-107')
    expect([...listed].sort()).toEqual([...reportUids(fresh)].sort())
  })

  it('the IC-107 hint says the same in both languages, and the shipped dictionary carries it', () => {
    const spec = SPEC_WORDS.icons.find((one) => one.rowId === 'IC-107')?.hint
    const shipped = SHIPPED_WORDS.icons.find((one) => one.rowId === 'IC-107')?.hint
    // WHY: CR-781 reworded the hint of IC-107 (display-words.json): an open report is closed alone.
    expect(spec?.ja).toBe('遅延診断を行う。レポートを閉じていれば診断をやり直して開き、開いていればレポートだけを閉じる')
    expect(spec?.en).toBe('Run the Delay Diagnostics; runs them again and opens the report if it is closed, or closes only the report while it is open')
    expect(shipped).toEqual(spec)
  })
})
