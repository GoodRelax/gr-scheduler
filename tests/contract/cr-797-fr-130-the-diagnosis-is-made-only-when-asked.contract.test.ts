// CR-797 spec-only contract: the diagnosis is made again only on IC-107 (window closed) and IC-168 (FR-130); a marker pressed or pulled drops its own DG-1..DG-3 mark until then (PE-8); issued fix rows leave the proposals (RW-16).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  diagnosisRowAskedOf,
  markerOperatedTaskUidOf,
  type HumanInput,
  type InputContext,
} from '../../src/adapter/input-command-translator/input-command-translator'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import { geometryFromLayout } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import { layoutFromSchedule } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import { regionsFromScreen, type ScreenEnvironment } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { emptyScreenSession } from '../../src/use-case/advance-screen-session/advance-screen-session'
import { NOT_STORED_ZOOM_BOUNDS } from '../../src/use-case/edit-document/edit-document'
import type { Document } from '../../src/entity/document-model/document/document'
import { selfAndDescendants, type FakeElement } from '../fixtures/fake-browser'
import { pointerOf } from '../unit/cr-541-stage'
import { keyOfRow } from './cr-610-file-flow-stage'
import { ONE_PARENT } from './cr-731-documents'
import { LOG_ROLE, PROPOSALS_ROLE } from './cr-731-shell'
import { FINISH_OF, FS, START_OF, documentOf, type TaskSpec } from './cr-731-stage'
import { agentApiOf, windowStage, type WindowStage } from './cr-760-stage'
import { specTable, unbroken } from './spec-table'

const FR_130_NEVER_BY_ITSELF = '⛔ 診断を出しているあいだに文書が変わっても、診断を自分からやり直してはならない（MUST NOT） —— マーカーと一覧は、診断した時の結果のまま残す。'
const FR_130_ONLY_WHEN_ASKED = 'やり直すのは、`IC-107`（窓を閉じたあと）と `IC-168` を押したときと、AI が `Agent API` の `AM-31`（`runDelayDiagnostics`）を呼んだときだけである。'
const FR_130_IC_168 = '窓の `IC-168`（`RW-3`）を押したら、窓を開いたまま、いまの文書で診断をやり直し、その結果をマーカーと一覧に出すこと（MUST）。'
const FR_130_OPERATED_DROPS =
  'ただし、進捗マーカーを押して状態を巡らせたか、引いて実績の終了を動かした `Task`（表 T-270 の `PE-8`・`PE-10`）は、次に診断するまで `FR-133` の 表 T-315 の `DG-1` 〜 `DG-3` の印を描かず、普段の状態の印で描くこと（MUST）。'
const FR_130_JUMP_KEEPS = '窓が開いていて行へ送るだけの押下（`FR-134` の 表 T-346 の `RW-19`）は状態を変えないので、印を外さない。'
const FR_130_ONLY_END = '診断の表示を終えるのは、`IC-40`（`FR-049`）を押したときである（`RW-1`）。'
const PE_8_DROPS = '⚠️ 押して巡らせても引いても、そのタスクの `DG-1` 〜 `DG-3` の印は次の診断まで外れる（`FR-130`）'
const RW_16_ISSUED_LEAVE =
  '⭐ 束を発行しても診断はやり直さない（`FR-130`）ので、発行した行は、次に診断するまで修正案の表から外すこと（MUST） —— 修正の記録の表にだけ載り、同じ直しを二度発行できない。'
const RW_16_UNDO_BRINGS_BACK = '束を取り消せば修正案の表に戻る（利用者が定めた）。'
const RW_3_ORDER = '左から、`IC-168`（再診断 —— 語の入口、語は `_assets/tbl-settings.md` の 表 T-206 の `S-623` の太さ、`RW-1`）・`IC-140`（`[.md]`）・`IC-108`（クリップボードへコピーする）・入力欄。'
const RW_3_EVERY_TABLE = '`IC-168` は 3 つの表（`RW-11`）のどれを出しているときも置く。'

const SPEC = join(process.cwd(), 'docs', 'spec')
const REQUIREMENTS = unbroken(readFileSync(join(SPEC, '01-04-requirements.md'), 'utf8'))
const PUBLISHED = readFileSync(join(SPEC, '_source', 'published-entries.json'), 'utf8')
const cellOf = (table: string, id: string, heading: string): string =>
  unbroken(specTable(table).rows.find((one) => one.id === id)?.by[heading] ?? '')

describe('CR-797 -- the clauses this file is driven by', () => {
  it('FR-130, T-270 PE-8 and T-346 RW-3 and RW-16 read this way', () => {
    for (const clause of [FR_130_NEVER_BY_ITSELF, FR_130_ONLY_WHEN_ASKED, FR_130_IC_168, FR_130_OPERATED_DROPS, FR_130_JUMP_KEEPS, FR_130_ONLY_END, PE_8_DROPS]) {
      expect(REQUIREMENTS, clause).toContain(clause)
    }
    const rw16 = cellOf('T-346', 'RW-16', '定め')
    expect(rw16).toContain(RW_16_ISSUED_LEAVE)
    expect(rw16).toContain(RW_16_UNDO_BRINGS_BACK)
    const rw3 = cellOf('T-346', 'RW-3', '定め')
    expect(rw3).toContain(RW_3_ORDER)
    expect(rw3).toContain(RW_3_EVERY_TABLE)
  })

  it('T-109 holds IC-168; S-623 is 700; the entry markerOperatedTaskUidOf is published', () => {
    const rows = specTable('T-109').rows
    expect(rows.some((one) => one.id === 'IC-168')).toBe(true)
    const weight = specTable('T-206').rows.find((one) => one.id === 'S-623')
    expect(weight?.cells.join(' '), 'S-623 is in T-206').toContain('700')
    expect(PUBLISHED).toContain('markerOperatedTaskUidOf')
  })
})

// see T-315
// WHY: SELF depends on itself (DG-1); LATE is not started after its start (DG-2); PARENT is its ancestor (DG-3); PLAIN and OTHER have no state.
const SELF = 40
const PARENT = 20
const LATE = 21
const PLAIN = 7
const OTHER = 8

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
      span(PLAIN, '06-07', '06-11', { name: 'Plain' }),
      span(OTHER, '06-14', '06-18', { name: 'Other' }),
    ],
    { statusDate: '2027-04-21T00:00:00' },
  )
  return { ...made, documentSettings: { ...made.documentSettings, scrollDate: '2027-03-29T00:00:00' } } as Document
}

const diagnosed = async (): Promise<WindowStage> => {
  const stage = await windowStage(seeded())
  await stage.press('IC-107')
  return stage
}

const symbolOf = (stage: WindowStage, uid: number): string => {
  const drawn = stage.loop.current()?.geometry.tasks.find((one) => one.taskUid === uid)?.marker
  if (drawn === undefined || drawn === null) throw new Error(`premise: Task ${String(uid)} draws a progress marker`)
  return String(drawn.symbol)
}
const isDiagnosisMark = (symbol: string): boolean => /^DG-[123]$/.test(symbol)

async function pressMarker(stage: WindowStage, uid: number): Promise<void> {
  const drawn = stage.loop.current()?.geometry.tasks.find((one) => one.taskUid === uid)?.marker
  if (drawn === undefined || drawn === null) throw new Error(`premise: Task ${String(uid)} draws a progress marker`)
  await stage.key(pointerOf('down', drawn.center.x, drawn.center.y) as never)
  await stage.key(pointerOf('up', drawn.center.x, drawn.center.y) as never)
}

async function pullMarker(stage: WindowStage, uid: number, dx: number): Promise<void> {
  const drawn = stage.loop.current()?.geometry.tasks.find((one) => one.taskUid === uid)?.marker
  if (drawn === undefined || drawn === null) throw new Error(`premise: Task ${String(uid)} draws a progress marker`)
  const { x, y } = drawn.center
  await stage.key(pointerOf('down', x, y) as never)
  await stage.key(pointerOf('move', x + dx / 2, y) as never)
  await stage.key(pointerOf('move', x + dx, y) as never)
  await stage.key(pointerOf('up', x + dx, y) as never)
}

const taskText = (stage: WindowStage, uid: number): string => JSON.stringify(stage.loop.document().schedule.tasks.find((one) => one.uid === uid))

interface ReportSeen {
  readonly shown: string
  readonly rows: readonly { readonly target?: { readonly kind: string; readonly taskUid?: number }; readonly isCurrent?: boolean }[]
}
const reportOf = (stage: WindowStage): ReportSeen | null => (stage.last() as unknown as { delayDiagnosticsReport?: ReportSeen | null }).delayDiagnosticsReport ?? null
const reportUids = (stage: WindowStage): readonly number[] =>
  (reportOf(stage)?.rows ?? []).flatMap((row) => (row.target?.kind === 'task' ? [row.target.taskUid ?? -1] : []))
const currentUids = (stage: WindowStage): readonly number[] =>
  (reportOf(stage)?.rows ?? []).flatMap((row) => (row.isCurrent === true && row.target?.kind === 'task' ? [row.target.taskUid ?? -1] : []))

describe('FR-130 (a) -- an edit that touches no marker rebuilds nothing', () => {
  it('moving other tasks through the Agent API leaves the DG marks and the report rows as diagnosed', async () => {
    const stage = await diagnosed()
    expect([SELF, LATE, PARENT].map((uid) => symbolOf(stage, uid)), 'premise').toEqual(['DG-1', 'DG-2', 'DG-3'])
    const rowsBefore = reportUids(stage)
    expect(rowsBefore, 'premise: PLAIN has no row').not.toContain(PLAIN)
    const lateBefore = taskText(stage, LATE)
    const api = agentApiOf(stage)
    // WHY: moving LATE ahead of the status date would remove DG-2, and moving PLAIN behind it would add one, were the diagnosis made again.
    const moved = api.applyCommands({
      expectedStamp: api.readStamp(),
      commands: [
        { kind: 'setTaskPlanDates', taskUid: LATE, start: START_OF('2027-06-01'), finish: FINISH_OF('2027-06-02') },
        { kind: 'setTaskPlanDates', taskUid: PLAIN, start: START_OF('2027-04-05'), finish: FINISH_OF('2027-04-09') },
      ] as never,
    })
    expect(moved.ok, 'premise: the write is accepted').toBe(true)
    expect(taskText(stage, LATE), 'premise: LATE was moved').not.toBe(lateBefore)
    await stage.key(pointerOf('move', 5, 5) as never)
    expect([SELF, LATE, PARENT].map((uid) => symbolOf(stage, uid)), 'the marks stay as diagnosed').toEqual(['DG-1', 'DG-2', 'DG-3'])
    expect(isDiagnosisMark(symbolOf(stage, PLAIN)), 'a task that became late since gets no mark').toBe(false)
    expect(reportUids(stage), 'the report rows stay as diagnosed').toEqual(rowsBefore)
    expect(reportOf(stage), 'the window stays open').not.toBeNull()
  })

  it('the same with the window closed: the marks stay as diagnosed', async () => {
    const stage = await diagnosed()
    await stage.press('IC-107')
    expect(reportOf(stage), 'premise: the window is closed').toBeNull()
    const api = agentApiOf(stage)
    const moved = api.applyCommands({
      expectedStamp: api.readStamp(),
      commands: [{ kind: 'setTaskPlanDates', taskUid: LATE, start: START_OF('2027-06-01'), finish: FINISH_OF('2027-06-02') }] as never,
    })
    expect(moved.ok, 'premise: the write is accepted').toBe(true)
    await stage.key(pointerOf('move', 5, 5) as never)
    expect([SELF, LATE, PARENT].map((uid) => symbolOf(stage, uid))).toEqual(['DG-1', 'DG-2', 'DG-3'])
  })
})

describe('FR-130 / PE-8 (b) -- window closed: a pressed marker drops its own DG mark until the next diagnosis', () => {
  it('the first press cycles the state and draws the plain state mark; the second press still draws none; the others keep theirs', async () => {
    const stage = await diagnosed()
    await stage.press('IC-107')
    expect(reportOf(stage), 'premise: the window is closed').toBeNull()
    expect(symbolOf(stage, SELF), 'premise').toBe('DG-1')
    const before = taskText(stage, SELF)
    await pressMarker(stage, SELF)
    expect(taskText(stage, SELF), 'the state cycles').not.toBe(before)
    expect(isDiagnosisMark(symbolOf(stage, SELF)), 'SELF is drawn without DG-1').toBe(false)
    expect(symbolOf(stage, SELF)).toMatch(/^PM-/)
    const afterFirst = taskText(stage, SELF)
    await pressMarker(stage, SELF)
    expect(taskText(stage, SELF), 'the second press cycles again').not.toBe(afterFirst)
    expect(isDiagnosisMark(symbolOf(stage, SELF)), 'still no DG mark').toBe(false)
    expect(symbolOf(stage, LATE)).toBe('DG-2')
    expect(symbolOf(stage, PARENT)).toBe('DG-3')
  })

  it('each of DG-1, DG-2 and DG-3 drops when its own marker is pressed', async () => {
    for (const uid of [SELF, LATE, PARENT]) {
      const stage = await diagnosed()
      await stage.press('IC-107')
      await pressMarker(stage, uid)
      expect(isDiagnosisMark(symbolOf(stage, uid)), `Task ${String(uid)}`).toBe(false)
      const others = [SELF, LATE, PARENT].filter((one) => one !== uid)
      expect(others.every((one) => isDiagnosisMark(symbolOf(stage, one))), 'the other two keep their marks').toBe(true)
    }
  })
})

describe('FR-130 / RW-19 / PE-8 (c) -- window open: the jump keeps the mark, the cycling press drops it', () => {
  it('the first press jumps to the row (mark stays); the next press on the marked row cycles and drops the mark', async () => {
    const stage = await diagnosed()
    const before = taskText(stage, LATE)
    await pressMarker(stage, LATE)
    expect(taskText(stage, LATE), 'the jump changes nothing').toBe(before)
    expect(symbolOf(stage, LATE), 'a jump does not drop the mark (FR-130)').toBe('DG-2')
    expect(currentUids(stage)).toEqual([LATE])
    await pressMarker(stage, LATE)
    expect(taskText(stage, LATE), 'the press on the marked row cycles').not.toBe(before)
    expect(isDiagnosisMark(symbolOf(stage, LATE)), 'and drops the mark').toBe(false)
    expect(reportUids(stage), 'the report is left as diagnosed').toContain(LATE)
    expect(currentUids(stage), 'the mark of the row stays where it was').toEqual([LATE])
    expect(symbolOf(stage, SELF)).toBe('DG-1')
    expect(symbolOf(stage, PARENT)).toBe('DG-3')
  })

  it('a plain marker press while the window is open drops nothing of the others', async () => {
    const stage = await diagnosed()
    await pressMarker(stage, PLAIN)
    expect([SELF, LATE, PARENT].map((uid) => symbolOf(stage, uid))).toEqual(['DG-1', 'DG-2', 'DG-3'])
  })
})

describe('FR-130 / PE-8 / PE-10 (d) -- pulling a DG marker drops the mark too', () => {
  it('a DG-2 marker pulled right (window open) writes the actual and is drawn without DG-2', async () => {
    const stage = await diagnosed()
    const before = taskText(stage, LATE)
    await pullMarker(stage, LATE, 120)
    expect(taskText(stage, LATE), 'premise: the pull writes').not.toBe(before)
    expect(isDiagnosisMark(symbolOf(stage, LATE))).toBe(false)
    expect(symbolOf(stage, SELF)).toBe('DG-1')
    expect(symbolOf(stage, PARENT)).toBe('DG-3')
  })

  it('the same with the window closed', async () => {
    const stage = await diagnosed()
    await stage.press('IC-107')
    const before = taskText(stage, LATE)
    await pullMarker(stage, LATE, 120)
    expect(taskText(stage, LATE), 'premise: the pull writes').not.toBe(before)
    expect(isDiagnosisMark(symbolOf(stage, LATE))).toBe(false)
  })
})

// WHY: the entry of the window is found by its data-icon; the weight is the inline style of the drawn button (S-623).
const entryOf = (stage: WindowStage, icon: string): FakeElement | null =>
  selfAndDescendants(stage.window() ?? stage.built.root()).find((one) => one.getAttribute('data-icon') === icon) ?? null
const weightOf = (element: FakeElement | null): string => (element?.getAttribute('style') ?? '').replace(/\s+/g, '')

describe('FR-130 / RW-3 (e) -- IC-168 makes the diagnosis again with the window kept open', () => {
  it('IC-168 alone brings back the mark that a press dropped, and the window is open all the while', async () => {
    const stage = await diagnosed()
    await stage.press('IC-107')
    await pressMarker(stage, SELF)
    expect(isDiagnosisMark(symbolOf(stage, SELF)), 'premise: the mark is dropped').toBe(false)
    await stage.press('IC-107')
    expect(reportOf(stage), 'premise: IC-107 opened the window with a new diagnosis').not.toBeNull()
    expect(symbolOf(stage, SELF), 'premise: IC-107 brought the mark back').toBe('DG-1')
    await pressMarker(stage, SELF)
    await pressMarker(stage, SELF)
    expect(isDiagnosisMark(symbolOf(stage, SELF)), 'the press on the marked row cycles and drops it').toBe(false)
    expect(reportOf(stage), 'the window stayed open').not.toBeNull()
    await stage.press('IC-168')
    expect(reportOf(stage), 'IC-168 keeps the window open').not.toBeNull()
    expect(symbolOf(stage, SELF), 'IC-168 makes the diagnosis again: the mark is back').toBe('DG-1')
    expect(symbolOf(stage, PARENT)).toBe('DG-3')
  })

  it('IC-168 makes the diagnosis of the document as it is now', async () => {
    const stage = await diagnosed()
    const api = agentApiOf(stage)
    api.applyCommands({
      expectedStamp: api.readStamp(),
      commands: [{ kind: 'setTaskPlanDates', taskUid: LATE, start: START_OF('2027-06-01'), finish: FINISH_OF('2027-06-02') }] as never,
    })
    expect(symbolOf(stage, LATE), 'premise: nothing is made again by itself').toBe('DG-2')
    await stage.press('IC-168')
    expect(isDiagnosisMark(symbolOf(stage, LATE)), 'LATE is no longer late, so the new diagnosis marks it no more').toBe(false)
    expect(reportOf(stage)).not.toBeNull()
  })

  it('the button of IC-168 draws its word in bold (font-weight 700, S-623) in each of the three tables', async () => {
    const stage = await windowStage(ONE_PARENT())
    await stage.press('IC-107')
    expect(weightOf(entryOf(stage, 'IC-168')), 'the diagnosis table (IC-154)').toContain('font-weight:700')
    await stage.press('IC-155')
    expect(weightOf(entryOf(stage, 'IC-168')), 'the proposals table (IC-155)').toContain('font-weight:700')
    stage.browser.toSave.push(stage.file('chosen.json', new Uint8Array(0)))
    await stage.press('IC-157')
    await stage.press('IC-156')
    expect(stage.inside(LOG_ROLE), 'premise: the log table is shown').not.toBeNull()
    expect(weightOf(entryOf(stage, 'IC-168')), 'the log table (IC-156)').toContain('font-weight:700')
  })
})

describe('FR-130 / RW-1 (f) -- IC-107 after the window was closed makes the diagnosis again', () => {
  it('a mark dropped by a press comes back, and the window opens', async () => {
    const stage = await diagnosed()
    await stage.press('IC-107')
    await pressMarker(stage, SELF)
    expect(isDiagnosisMark(symbolOf(stage, SELF)), 'premise: the mark is dropped').toBe(false)
    expect(reportOf(stage), 'premise: the window is closed').toBeNull()
    await stage.press('IC-107')
    expect(reportOf(stage), 'the window opens').not.toBeNull()
    expect(symbolOf(stage, SELF), 'the mark is back').toBe('DG-1')
  })

  it('a mark dropped by a pull comes back the same way', async () => {
    const stage = await diagnosed()
    await stage.press('IC-107')
    await pullMarker(stage, SELF, 120)
    expect(isDiagnosisMark(symbolOf(stage, SELF)), 'premise: the mark is dropped').toBe(false)
    await stage.press('IC-107')
    expect(reportOf(stage)).not.toBeNull()
    expect(symbolOf(stage, SELF)).toBe('DG-1')
  })
})

describe(`RW-16 (g) -- ${RW_16_ISSUED_LEAVE}`, () => {
  const rowsIn = (container: FakeElement | null): number => {
    if (container === null) return 0
    const head = new Set(selfAndDescendants(container).filter((one) => one.tagName === 'THEAD').flatMap((one) => selfAndDescendants(one)))
    return selfAndDescendants(container).filter((one) => one.tagName === 'TR' && !head.has(one)).length
  }

  it('after IC-157 the issued rows are gone from the proposals table and are in the log; undo brings them back to the proposals', async () => {
    const stage = await windowStage(ONE_PARENT())
    await stage.press('IC-107')
    await stage.press('IC-155')
    const proposed = rowsIn(stage.inside(PROPOSALS_ROLE))
    expect(proposed, 'premise: the proposals table holds rows').toBeGreaterThan(0)
    stage.browser.toSave.push(stage.file('chosen.json', new Uint8Array(0)))
    await stage.press('IC-157')
    await stage.press('IC-155')
    expect(rowsIn(stage.inside(PROPOSALS_ROLE)), 'the issued rows have left the proposals').toBe(0)
    await stage.press('IC-156')
    expect(rowsIn(stage.inside(LOG_ROLE)), 'and are in the log').toBe(proposed)
    await stage.key(keyOfRow('SK-6') as never)
    expect(entryOf(stage, 'IC-156'), 'the undone bundle leaves the log').toBeNull()
    await stage.press('IC-155')
    expect(rowsIn(stage.inside(PROPOSALS_ROLE)), 'and the rows are back in the proposals').toBe(proposed)
  })

  it('IC-168 makes the proposals again from the document as it is now, and keeps the log', async () => {
    const stage = await windowStage(ONE_PARENT())
    await stage.press('IC-107')
    await stage.press('IC-155')
    stage.browser.toSave.push(stage.file('chosen.json', new Uint8Array(0)))
    await stage.press('IC-157')
    await stage.press('IC-168')
    await stage.press('IC-156')
    expect(rowsIn(stage.inside(LOG_ROLE)), 'the log is kept (RW-16)').toBeGreaterThan(0)
  })
})

const ENV: ScreenEnvironment = { width: 1000, height: 700, appHeaderHeight: 56, scrollbarThickness: 8, propertyPanelWidth: 0 }
const MODS = { ctrl: false, shift: false, alt: false, meta: false }
const PRESS_AT = { kind: 'pointer', phase: 'down', button: 'left', x: 200, y: 120, modifiers: MODS, clickCount: 1 }
const releaseAt = (x: number, y: number): HumanInput => ({ ...PRESS_AT, phase: 'up', x, y }) as unknown as HumanInput
const release = (): HumanInput => releaseAt(200, 120)
const dragged = (): HumanInput => releaseAt(600, 400)

const A = 21
const B = 22
const DOCUMENT = documentOf(
  [
    { uid: A, start: START_OF('2027-04-05'), finish: FINISH_OF('2027-04-09'), name: 'A' },
    { uid: B, start: START_OF('2027-04-12'), finish: FINISH_OF('2027-04-16'), name: 'B' },
  ],
  { statusDate: '2027-04-21T00:00:00' },
)

interface Report {
  readonly shown: 'normal' | 'minimized' | 'maximized'
  readonly isInFront: boolean
  readonly markedRowTaskUid?: number | null
}

function contextOf(taskUid: number, report: Report | null | undefined, marks: readonly number[] = [A, B], grab = 'GA-18'): InputContext {
  const settings = DOCUMENT.documentSettings
  const regions = regionsFromScreen(ENV, settings)
  const layout = layoutFromSchedule(DOCUMENT.schedule, settings, regions)
  return {
    document: DOCUMENT,
    layout,
    geometry: geometryFromLayout(DOCUMENT.schedule, settings, layout, regions, emptySelection(), null),
    regions,
    screen: emptyScreenSession.screen,
    selection: emptySelection(),
    zoomStep: 3,
    zoomMin: NOT_STORED_ZOOM_BOUNDS['S-97'],
    zoomMax: NOT_STORED_ZOOM_BOUNDS['S-98'],
    pressed: { at: PRESS_AT, hit: { grab, item: { kind: 'task', taskUid } }, on: null, pressRow: 'PTD-3' },
    isTextEntryUnsettled: false,
    isSurfaceStanding: false,
    dualCursorFollowing: null,
    today: '2027-04-21T00:00:00',
    newTaskGroupId: 'task-group-minted-outside',
    newCommentBoxId: 'comment-box-minted-outside',
    newHighlightBoxId: 'highlight-box-minted-outside',
    diagnosisMarkedTaskUids: new Set(marks),
    delayDiagnosticsReport: report,
  } as unknown as InputContext
}

const OPEN: Report = { shown: 'normal', isInFront: true, markedRowTaskUid: null }

describe('FR-130 (h) -- markerOperatedTaskUidOf answers the Task whose marker was pressed or pulled', () => {
  it('a release on a GA-18 task marker answers its uid when the report is closed (the press cycles)', () => {
    for (const closed of [null, undefined]) expect(markerOperatedTaskUidOf(release(), contextOf(A, closed))).toBe(A)
  })

  it('a release on the marker of a task whose row is already marked answers the uid (the press cycles)', () => {
    expect(markerOperatedTaskUidOf(release(), contextOf(A, { ...OPEN, markedRowTaskUid: A }))).toBe(A)
  })

  it('a release that only asks for the report row answers null, and diagnosisRowAskedOf answers the uid', () => {
    const context = contextOf(A, OPEN)
    expect(diagnosisRowAskedOf(release(), context)).toBe(A)
    expect(markerOperatedTaskUidOf(release(), context)).toBeNull()
  })

  it('a dragged release answers the uid even when the row would be asked', () => {
    const context = contextOf(A, OPEN)
    expect(diagnosisRowAskedOf(dragged(), context), 'premise: a pull is not a row request').toBeNull()
    expect(markerOperatedTaskUidOf(dragged(), context)).toBe(A)
  })

  it('a marker that is not drawn as DG-1 to DG-3 answers the uid even with the report open', () => {
    expect(markerOperatedTaskUidOf(release(), contextOf(A, OPEN, [B]))).toBe(A)
  })

  it('input that is not a marker release answers null', () => {
    expect(markerOperatedTaskUidOf({ ...PRESS_AT } as unknown as HumanInput, contextOf(A, null)), 'the press, not the release').toBeNull()
    expect(markerOperatedTaskUidOf(release(), contextOf(A, null, [A, B], 'GA-1')), 'the press was not on a marker').toBeNull()
    expect(
      markerOperatedTaskUidOf({ kind: 'key', phase: 'down', key: 'a', modifiers: MODS } as unknown as HumanInput, contextOf(A, null)),
      'a key',
    ).toBeNull()
    const noHit = { ...contextOf(A, null), pressed: { ...contextOf(A, null).pressed, hit: null } } as unknown as InputContext
    expect(markerOperatedTaskUidOf(release(), noHit), 'nothing was under the press').toBeNull()
  })
})
