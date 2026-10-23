// CR-795 spec-only contract: a marker press on DG-1 to DG-3 skips cycling only while the report window is open and the row is not marked (RW-19).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  diagnosisRowAskedOf,
  screenEventFromInput,
  type HumanInput,
  type InputContext,
} from '../../src/adapter/input-command-translator/input-command-translator'
import { geometryFromLayout } from '../../src/entity/layout-engine/schedule-geometry/schedule-geometry'
import { layoutFromSchedule } from '../../src/entity/layout-engine/schedule-layout/schedule-layout'
import { regionsFromScreen, type ScreenEnvironment } from '../../src/entity/layout-engine/screen-regions/screen-regions'
import { emptySelection } from '../../src/entity/document-model/selection/selection'
import { NOT_STORED_ZOOM_BOUNDS } from '../../src/use-case/edit-document/edit-document'
import { emptyScreenSession } from '../../src/use-case/advance-screen-session/advance-screen-session'
import { pointerOf } from '../unit/cr-541-stage'
import { FINISH_OF, FS, START_OF, documentOf } from './cr-731-stage'
import { windowStage, type WindowStage } from './cr-760-stage'
import { specTable, unbroken } from './spec-table'

const RW_19_OPEN_ONLY =
  '遅延診断レポートの窓が開いているあいだ（最小化（`IC-129`）を含む —— `RW-1`）、日程表で `FR-133` の 表 T-315 の `DG-1` 〜 `DG-3` で描いた進捗マーカー（表 T-266 の `GA-18`）を押して離したとき、そのタスクの行に下の ④ のいまの行の印が付いていなければ、状態を巡らせず（表 T-270 の `PE-8`・`PE-10` の例外）'
const RW_19_MARKED_CYCLES = 'そのタスクの行にいまの行の印が付いていれば、普段どおり状態を巡らせ（`PE-8`・`PE-10`）、① 〜 ④ を行わないこと（MUST）。'
const RW_19_CLOSED_CYCLES = '窓が閉じているあいだは、診断の印が残っていても（`RW-1`）、普段どおり状態を巡らせ、窓を開かないこと（MUST）。'
const RW_1_NOT_REOPENED = '窓だけを閉じたあとは、日程表のマーカーを押しても開かない（`RW-19`）'
const PE_8_OPEN_ONLY =
  '⚠️ 遅延診断レポートの窓が開いているあいだ、`FR-133` の 表 T-315 の `DG-1` 〜 `DG-3` で描いたマーカーは、そのタスクの行にいまの行の印が付いていなければ巡らせない'
const PE_10_OPEN_ONLY = '⚠️ 遅延診断レポートの窓が開いているあいだの例外は `PE-8` と同じ（`RW-19`）'
const NOTE_OPEN_ONLY =
  '遅延診断レポートの窓が開いているあいだ（最小化を含む）、`DG-1` 〜 `DG-3` で描いた進捗マーカー（表 T-266 の `GA-18`）を押して離した入力で、そのタスクの行にいまの行の印が付いていなければ'

const SPEC = join(process.cwd(), 'docs', 'spec')
const REQUIREMENTS = unbroken(readFileSync(join(SPEC, '01-04-requirements.md'), 'utf8'))
const PUBLISHED = readFileSync(join(SPEC, '_source', 'published-entries.json'), 'utf8')

const cellOf = (table: string, id: string, heading: string): string =>
  unbroken(specTable(table).rows.find((one) => one.id === id)?.by[heading] ?? '')

describe('CR-795 -- the clauses this file is driven by', () => {
  it('T-346 RW-19 and RW-1, T-270 PE-8 and PE-10 and the published note read this way', () => {
    const rw19 = cellOf('T-346', 'RW-19', '定め')
    for (const clause of [RW_19_OPEN_ONLY, RW_19_MARKED_CYCLES, RW_19_CLOSED_CYCLES]) expect(rw19, clause).toContain(clause)
    expect(cellOf('T-346', 'RW-1', '定め')).toContain(RW_1_NOT_REOPENED)
    expect(REQUIREMENTS).toContain(PE_8_OPEN_ONLY)
    expect(REQUIREMENTS).toContain(PE_10_OPEN_ONLY)
    expect(PUBLISHED).toContain(NOTE_OPEN_ONLY)
  })
})


const ENV: ScreenEnvironment = { width: 1000, height: 700, appHeaderHeight: 56, scrollbarThickness: 8, propertyPanelWidth: 0 }
const MODS = { ctrl: false, shift: false, alt: false, meta: false }
const PRESS_AT = { kind: 'pointer', phase: 'down', button: 'left', x: 200, y: 120, modifiers: MODS, clickCount: 1 }
const release = (): HumanInput => ({ ...PRESS_AT, phase: 'up' }) as unknown as HumanInput

const A = 21
const B = 22
const DOCUMENT = documentOf(
  [
    { uid: A, start: START_OF('2027-04-05'), finish: FINISH_OF('2027-04-09'), name: 'A' },
    { uid: B, start: START_OF('2027-04-12'), finish: FINISH_OF('2027-04-16'), name: 'B' },
  ],
  { statusDate: '2027-04-21T00:00:00' },
)

type Shown = 'normal' | 'minimized' | 'maximized'
interface Report {
  readonly shown: Shown
  readonly isInFront: boolean
  readonly markedRowTaskUid?: number | null
}

function contextOf(taskUid: number, report: Report | null | undefined, marks: readonly number[] = [A, B]): InputContext {
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
    pressed: { at: PRESS_AT, hit: { grab: 'GA-18', item: { kind: 'task', taskUid } }, on: null, pressRow: 'PTD-3' },
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

describe('RW-19 -- the marker cycles unless the open report asks for its row (translator)', () => {
  it('premise: with the report open and the row not marked, the release answers the task and produces no state event', () => {
    const context = contextOf(A, OPEN)
    expect(diagnosisRowAskedOf(release(), context)).toBe(A)
    expect(screenEventFromInput(release(), context)).toBeNull()
  })

  it('a) report closed, marks still shown: the release cycles (a state event) and answers null', () => {
    for (const closed of [null, undefined]) {
      const context = contextOf(A, closed)
      expect(diagnosisRowAskedOf(release(), context)).toBeNull()
      expect(screenEventFromInput(release(), context), 'a state event is produced').not.toBeNull()
    }
  })

  it('b) report open, row not marked: the first release answers the uid and does not cycle', () => {
    for (const marked of [null, undefined]) {
      const context = contextOf(A, marked === undefined ? { shown: 'normal', isInFront: true } : { shown: 'normal', isInFront: true, markedRowTaskUid: marked })
      expect(diagnosisRowAskedOf(release(), context)).toBe(A)
      expect(screenEventFromInput(release(), context)).toBeNull()
    }
  })

  it('c) report open, the row of the task marked: the release cycles and answers null; the mark stays', () => {
    const context = contextOf(A, { ...OPEN, markedRowTaskUid: A })
    expect(diagnosisRowAskedOf(release(), context)).toBeNull()
    expect(screenEventFromInput(release(), context), 'a state event is produced').not.toBeNull()
    expect(context.delayDiagnosticsReport?.markedRowTaskUid, 'the mark stays where it was').toBe(A)
  })

  it('d) report open, the row of task A marked, a release on the DG marker of task B answers B and does not cycle', () => {
    const context = contextOf(B, { ...OPEN, markedRowTaskUid: A })
    expect(diagnosisRowAskedOf(release(), context)).toBe(B)
    expect(screenEventFromInput(release(), context)).toBeNull()
  })

  it.each(['minimized', 'normal', 'maximized'] as const)('e) the window %s counts as open: row not marked answers the uid, marked cycles', (shown) => {
    const unmarked = contextOf(A, { shown, isInFront: shown !== 'minimized', markedRowTaskUid: null })
    expect(diagnosisRowAskedOf(release(), unmarked)).toBe(A)
    expect(screenEventFromInput(release(), unmarked)).toBeNull()
    const marked = contextOf(A, { shown, isInFront: shown !== 'minimized', markedRowTaskUid: A })
    expect(diagnosisRowAskedOf(release(), marked)).toBeNull()
    expect(screenEventFromInput(release(), marked)).not.toBeNull()
  })

  it('a marker not drawn as DG-1 to DG-3 cycles whatever the report does', () => {
    const context = contextOf(A, OPEN, [B])
    expect(diagnosisRowAskedOf(release(), context)).toBeNull()
    expect(screenEventFromInput(release(), context)).not.toBeNull()
  })
})


// WHY: SELF starts before the status date; a task not begun that starts after it is never drawn with DG-1 or DG-2 (FR-133).
const SELF = 40
const PARENT = 20
const LATE = 21
const SLOW = 30
const WAITING = 31

function shellDocument() {
  const made = documentOf(
    [
      { uid: SELF, start: START_OF('2027-04-19'), finish: FINISH_OF('2027-04-20'), after: [[SELF, FS]], name: 'Self' },
      { uid: PARENT, start: START_OF('2027-04-05'), finish: FINISH_OF('2027-04-09'), name: 'Parent' },
      { uid: LATE, start: START_OF('2027-04-05'), finish: FINISH_OF('2027-04-09'), parent: PARENT, name: 'Late child' },
      { uid: SLOW, start: START_OF('2027-04-05'), finish: FINISH_OF('2027-04-09'), actualStart: START_OF('2027-04-05'), percentComplete: 50, name: 'Slow' },
      { uid: WAITING, start: START_OF('2027-04-12'), finish: FINISH_OF('2027-04-16'), after: [[SLOW, FS]], name: 'Waiting' },
    ],
    { statusDate: '2027-04-21T00:00:00' },
  )
  return { ...made, documentSettings: { ...made.documentSettings, scrollDate: '2027-03-29T00:00:00' } } as typeof made
}

async function diagnosed(): Promise<WindowStage> {
  const stage = await windowStage(shellDocument())
  await stage.press('IC-107')
  return stage
}

const markerAt = (stage: WindowStage, uid: number): { x: number; y: number; symbol: string } => {
  const drawn = stage.loop.current()?.geometry.tasks.find((one) => one.taskUid === uid)?.marker
  if (drawn === undefined || drawn === null) throw new Error(`premise: Task ${String(uid)} draws a progress marker`)
  return { x: drawn.center.x, y: drawn.center.y, symbol: String(drawn.symbol) }
}
async function pressMarker(stage: WindowStage, uid: number): Promise<void> {
  const at = markerAt(stage, uid)
  await stage.key(pointerOf('down', at.x, at.y) as never)
  await stage.key(pointerOf('up', at.x, at.y) as never)
}
const taskOf = (stage: WindowStage, uid: number): unknown => stage.loop.document().schedule.tasks.find((one) => one.uid === uid)
type Seen = { shown: string; rows: readonly { target?: { kind: string; taskUid?: number }; isCurrent?: boolean }[] }
const reportOf = (stage: WindowStage): Seen | null => (stage.last() as unknown as { delayDiagnosticsReport?: Seen | null }).delayDiagnosticsReport ?? null
const currentUids = (stage: WindowStage): readonly number[] =>
  (reportOf(stage)?.rows ?? []).flatMap((row) => (row.isCurrent === true && row.target?.kind === 'task' ? [row.target.taskUid ?? -1] : []))
const isDiagnosisDrawn = (stage: WindowStage): boolean =>
  (stage.loop.current()?.geometry.tasks ?? []).some((one) => /^DG-/.test(String(one.marker?.symbol ?? '')))

describe('RW-19 / RW-1 -- in the shell, a marker press with the window closed cycles and does not open it', () => {
  it('premise: the diagnosis draws DG-1 to DG-3 and the window is open', async () => {
    const stage = await diagnosed()
    expect([SELF, LATE, PARENT].map((uid) => markerAt(stage, uid).symbol)).toEqual(['DG-1', 'DG-2', 'DG-3'])
    expect(reportOf(stage)).not.toBeNull()
  })

  it.each(['IC-52', 'IC-107'])('window closed by %s, marks shown: the press cycles the state and the window stays closed', async (entry) => {
    for (const uid of [SELF, LATE, PARENT]) {
      const stage = await diagnosed()
      await stage.press(entry)
      expect(reportOf(stage), 'premise: the window is closed').toBeNull()
      expect(isDiagnosisDrawn(stage), 'premise: the marks stay (RW-1)').toBe(true)
      const before = taskOf(stage, uid)
      await pressMarker(stage, uid)
      expect(taskOf(stage, uid), `Task ${String(uid)} cycles`).not.toEqual(before)
      expect(reportOf(stage), 'the window stays closed (RW-1)').toBeNull()
    }
  })

  it('window open, row not marked: the first press leaves the task as it was and marks its row (also while minimized)', async () => {
    for (const minimize of [false, true]) {
      const stage = await diagnosed()
      if (minimize) await stage.press('IC-129')
      expect(reportOf(stage)?.shown).toBe(minimize ? 'minimized' : 'normal')
      const before = taskOf(stage, LATE)
      await pressMarker(stage, LATE)
      expect(taskOf(stage, LATE)).toEqual(before)
      expect(currentUids(stage)).toEqual([LATE])
    }
  })

  it('window open, row marked: the next press on the same task cycles it and the mark stays', async () => {
    const stage = await diagnosed()
    await pressMarker(stage, LATE)
    expect(currentUids(stage)).toEqual([LATE])
    const before = taskOf(stage, LATE)
    await pressMarker(stage, LATE)
    expect(taskOf(stage, LATE), 'the second press cycles').not.toEqual(before)
    expect(currentUids(stage), 'the mark stays (RW-19)').toEqual([LATE])
  })

  it('window open, row of task A marked: a press on the marker of task B (DG) marks B and leaves B as it was', async () => {
    const stage = await diagnosed()
    await pressMarker(stage, LATE)
    const before = taskOf(stage, SELF)
    await pressMarker(stage, SELF)
    expect(taskOf(stage, SELF)).toEqual(before)
    expect(currentUids(stage)).toEqual([SELF])
  })
})
