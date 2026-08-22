// Unit tests for EditDocument's Dependency aggregate (unit UF-13).
//
// ⚠️ Chapter 9 does not admit Unit as a TEST_LEVEL, so these have no node in
// the specification. Table T-218 of Chapter 7 gives them their place: TS-6,
// tests/unit/, written by whoever implemented the unit.
//
// The three commands are CM-36 to CM-38 of table T-108, and every rule they
// obey comes from FR-009 (with FR-032 / table T-050 for the delete) and the
// two settings rows S-117 / S-118 of table T-213. Nothing here was read off
// the implementation: Chapter 1.9 requires a test that verifies a requirement
// pointing at a table to be driven by a fixed copy of that table, which is
// what `T_018` below is.

import { describe, expect, it } from 'vitest'

import type { Document } from '../../src/entity/document-model/document/document'
import type { Dependency, Task } from '../../src/entity/document-model/schedule/schedule'
import {
  editDependency,
  type DependencyCommand,
  type DependencyEdge,
} from '../../src/use-case/edit-document/edit-document'

// ⚠️ Every nullable column of `Task` is spelled `null`, never left out. A
// column left `undefined` reads as "held" to anything that asks whether the
// task has one, and table T-019a's five states are decided by exactly that
// question.
const taskOf = (part: Partial<Task> & { readonly uid: number }): Task => ({
  wbsParentUid: null,
  wbsOrder: null,
  name: null,
  start: null,
  finish: null,
  milestone: null,
  deadline: null,
  notes: null,
  calendarUid: null,
  actualStart: null,
  actualDuration: null,
  actualFinish: null,
  resume: null,
  resumeValid: null,
  percentComplete: null,
  fadeInDays: null,
  fadeOutDays: null,
  dependencies: [],
  carry: {},
  carryElements: [],
  ...part,
})

const dependencyOf = (
  part: Partial<Dependency> & { readonly predecessorUid: number; readonly linkType: number },
): Dependency => ({
  lag: null,
  lagFormat: null,
  carry: {},
  carryElements: [],
  ...part,
})

// A whole Document is far more than these cases read, so the fixture carries
// the keys the aggregate actually touches. Same idiom as the other unit files.
const documentOf = (tasks: readonly Task[]): Document =>
  ({
    schemaVersion: '1',
    schedule: {
      project: { title: 'A', statusDate: null, themeHue: 214, startDate: null },
      calendars: [],
      tasks,
      resources: [],
      assignments: [],
      taskGroups: [],
      taskGroupMembers: [],
      taskVisuals: [],
      commentBoxes: [],
      highlightBoxes: [],
      taskOrigins: [],
      baselineTasks: [],
    },
    documentSettings: {
      stackDirection: 'up',
      planActualDisplay: 'both',
      guideCursorMode: 'none',
      dualCursor: null,
      fontScale: 'M',
      fontScaleSizes: { S: 12, M: 14, L: 16 },
      rulerFont: 14,
      rulerHeight: 48,
      canvasPadding: 10,
      rowTitlePanelWidth: 170,
      propertyPanelWidth: 280,
      pinnedGroupIds: [],
      pinnedRowMax: 5,
      zoomX: 1,
      zoomY: 1,
      scrollDate: null,
      scrollGroupId: null,
      exportPngScale: 1,
      dependencyVisible: true,
      // ⚠️ S-117 of table T-213 lives in the document, so a fixture that
      // leaves it out hands the aggregate `undefined` as the value it puts on
      // a new dependency -- and nothing would say so. It is spelled with the
      // value the table gives: `0`, meaning 「間を空けない」.
      dependencyLagDefault: 0,
    },
    documentStamp: {
      scheduleUpdatedUtc: '2026-08-17T00:00:00Z',
      lastEditedBy: 'user',
      settingsUpdatedUtc: '2026-08-17T00:00:00Z',
    },
    changeLog: [],
  }) as unknown as Document

const taskIn = (document: Document, uid: number): Task =>
  document.schedule.tasks.find((task) => task.uid === uid)!

/** AT-42: the array holds the dependencies whose SUCCESSOR is this task. */
const dependenciesOf = (document: Document, successorUid: number): readonly Dependency[] =>
  taskIn(document, successorUid).dependencies

// Two ordinary tasks (AT-30 `milestone` is `null`, so neither is a point) and
// one milestone, with dates so that "the lag does not move the dates" has
// something to measure.
const PLAIN = () => [
  taskOf({ uid: 1, name: 'a', start: '2026-01-05', finish: '2026-01-09' }),
  taskOf({ uid: 2, name: 'b', start: '2026-01-12', finish: '2026-01-16' }),
]

const accepted = (result: ReturnType<typeof editDependency>): Document => {
  expect(result.ok).toBe(true)
  if (!result.ok) throw new Error(`refused: ${JSON.stringify(result.refusals)}`)
  return result.document
}

const draw = (
  predecessorUid: number,
  successorUid: number,
  predecessorEdge: DependencyEdge,
  successorEdge: DependencyEdge,
): DependencyCommand => ({
  kind: 'createDependency',
  predecessorUid,
  successorUid,
  predecessorEdge,
  successorEdge,
})

/**
 * Table T-018 copied out, one row at a time. The `linkType` codes are the
 * exchange partner's (AT-46: 0 = FF, 1 = FS, 2 = SF, 3 = SS); the edges are
 * the 出口 / 入口 columns read as the half of the bar the line was drawn out
 * of and into ("左半分が開始側、右半分が終了側").
 */
const T_018 = [
  { row: 'DP-1', name: 'FS', linkType: 1, out: 'finish', into: 'start' },
  { row: 'DP-2', name: 'SF', linkType: 2, out: 'start', into: 'finish' },
  { row: 'DP-3', name: 'FF', linkType: 0, out: 'finish', into: 'finish' },
  { row: 'DP-4', name: 'SS', linkType: 3, out: 'start', into: 'start' },
] as const satisfies readonly {
  row: string
  name: string
  linkType: number
  out: DependencyEdge
  into: DependencyEdge
}[]

describe('EditDependency (UF-13) -- CM-36 createDependency', () => {
  it('T-018 lands every pair of edges on exactly one of the four rows', () => {
    // FR-009: 「引き出した辺と引き入れた辺の組合せは、4 つの種別と 1 対 1 に
    // 対応する（MUST）」and「表 T-018 の 4 行のいずれか 1 つに必ず落ちる」.
    for (const link of T_018) {
      const document = accepted(editDependency(documentOf(PLAIN()), draw(1, 2, link.out, link.into)))
      const rows = dependenciesOf(document, 2)
      expect(rows).toHaveLength(1)
      expect({ row: link.row, linkType: rows[0]!.linkType }).toEqual({
        row: link.row,
        linkType: link.linkType,
      })
      expect(rows[0]!.predecessorUid).toBe(1)
      // AT-45: 「後続は入れ子の位置が表す」-- the successor is the task whose
      // array the row sits in, so nothing is written on the predecessor.
      expect(dependenciesOf(document, 1)).toHaveLength(0)
    }
  })

  it('S-117 puts the lag default of table T-213 on a dependency drawn on screen', () => {
    // Table T-213: 「依存を作ったときに置く値。0 は「間を空けない」」, and
    // FR-009 sends the default there: 「既定値と単位は表 T-213 が持つ」. The
    // default is a number, not a second spelling of "no lag".
    const document = accepted(editDependency(documentOf(PLAIN()), draw(1, 2, 'finish', 'start')))
    expect(dependenciesOf(document, 2)[0]!.lag).toBe(0)

    // And it is the settings row that is read, not a 0 written into the code:
    // S-117 is a value the document holds, so a document holding 2 places 2.
    const shifted = documentOf(PLAIN())
    const withDefault = {
      ...shifted,
      documentSettings: { ...shifted.documentSettings, dependencyLagDefault: 2 },
    } as Document
    const drawnThere = accepted(editDependency(withDefault, draw(1, 2, 'finish', 'start')))
    expect(dependenciesOf(drawnThere, 2)[0]!.lag).toBe(2)
  })

  it('FR-009 refuses a self-reference', () => {
    // MUST NOT: 「同じタスクを先行と後続の両方にするもの（自己参照）」.
    const result = editDependency(documentOf(PLAIN()), draw(1, 1, 'finish', 'start'))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.refusals[0]!.rule).toBe('FR-009')
  })

  it('FR-009 refuses a second dependency on the same pair, whatever the type', () => {
    // MUST NOT: 「既に同じ 2 つの間にある依存と同じ組（先行と後続の対を指す。
    // 種別は問わない）」-- so an FS already drawn blocks an SS on the same
    // pair, even though table T-018 puts them on different rows.
    const first = accepted(editDependency(documentOf(PLAIN()), draw(1, 2, 'finish', 'start')))
    const second = editDependency(first, draw(1, 2, 'start', 'start'))
    expect(second.ok).toBe(false)
    if (!second.ok) expect(second.refusals[0]!.rule).toBe('FR-009')
    // The refusal 「引きかけの矢印だけを捨てて」-- the dependency already held
    // is not replaced by the one that was refused.
    expect(dependenciesOf(first, 2)).toHaveLength(1)
    expect(dependenciesOf(first, 2)[0]!.linkType).toBe(1)
  })

  it('FR-009 reads the pair in order, so the reverse pair is not the same 組', () => {
    // The parenthetical is what fixes this: 「先行と後続の対を指す。種別は
    // 問わない」-- what is disregarded is the TYPE, and the pair is named as
    // predecessor-and-successor. B as the predecessor of A is a different 組.
    const first = accepted(editDependency(documentOf(PLAIN()), draw(1, 2, 'finish', 'start')))
    const reversed = accepted(editDependency(first, draw(2, 1, 'finish', 'start')))
    expect(dependenciesOf(reversed, 2).map((row) => row.predecessorUid)).toEqual([1])
    expect(dependenciesOf(reversed, 1).map((row) => row.predecessorUid)).toEqual([2])
  })

  it('FR-009 refuses an endpoint that is neither Task nor milestone', () => {
    // MUST NOT: 「タスクでもマイルストーンでもないものを端点にするもの」. A
    // uid that names no row of `tasks` names neither.
    for (const command of [draw(9, 2, 'finish', 'start'), draw(1, 9, 'finish', 'start')]) {
      const result = editDependency(documentOf(PLAIN()), command)
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.refusals[0]!.rule).toBe('FR-009')
    }
  })

  it('FR-009 makes a dependency with a milestone at either end FS', () => {
    // MUST: 「マイルストーンが端に来る依存は、画面上で作るとき FS とすること」
    // -- a milestone is a point, so the four date relations collapse. DP-1's
    // code is 1, whichever pair of edges the pointer reported.
    const withMilestonePredecessor = [
      taskOf({ uid: 1, name: 'm', start: '2026-01-05', finish: '2026-01-05', milestone: true }),
      taskOf({ uid: 2, name: 'b', start: '2026-01-12', finish: '2026-01-16' }),
    ]
    // start -> finish is DP-2 (SF) for two bars; the milestone makes it FS.
    const drawnOut = accepted(
      editDependency(documentOf(withMilestonePredecessor), draw(1, 2, 'start', 'finish')),
    )
    expect(dependenciesOf(drawnOut, 2)[0]!.linkType).toBe(1)

    const withMilestoneSuccessor = [
      taskOf({ uid: 1, name: 'a', start: '2026-01-05', finish: '2026-01-09' }),
      taskOf({ uid: 2, name: 'm', start: '2026-01-12', finish: '2026-01-12', milestone: true }),
    ]
    // finish -> finish is DP-3 (FF) for two bars; the milestone makes it FS.
    const drawnInto = accepted(
      editDependency(documentOf(withMilestoneSuccessor), draw(1, 2, 'finish', 'finish')),
    )
    expect(dependenciesOf(drawnInto, 2)[0]!.linkType).toBe(1)
  })

  it('FR-009 keeps the dependencies the successor already holds', () => {
    // The array is the successor's, so drawing a second line INTO the same
    // task adds a row rather than replacing one: the pair is what may not
    // repeat, not the successor.
    const document = documentOf([
      ...PLAIN(),
      taskOf({ uid: 3, name: 'c', start: '2026-01-05', finish: '2026-01-07' }),
    ])
    const first = accepted(editDependency(document, draw(1, 2, 'finish', 'start')))
    const second = accepted(editDependency(first, draw(3, 2, 'start', 'start')))
    expect(dependenciesOf(second, 2).map((row) => [row.predecessorUid, row.linkType])).toEqual([
      [1, 1],
      [3, 3],
    ])
  })

  it('FR-009 does not move the dates of either endpoint', () => {
    // 表 T-009 の XO-5: 日付を動かす計算系は範囲外. Drawing a line changes
    // no `start` and no `finish`.
    const document = accepted(editDependency(documentOf(PLAIN()), draw(1, 2, 'finish', 'start')))
    expect([taskIn(document, 1).start, taskIn(document, 1).finish]).toEqual([
      '2026-01-05',
      '2026-01-09',
    ])
    expect([taskIn(document, 2).start, taskIn(document, 2).finish]).toEqual([
      '2026-01-12',
      '2026-01-16',
    ])
  })
})

describe('EditDependency (UF-13) -- CM-38 setDependencyLag', () => {
  const drawn = () => accepted(editDependency(documentOf(PLAIN()), draw(1, 2, 'finish', 'start')))

  it('FR-009 holds the lag as a value and does not move the dates', () => {
    // MUST: 「依存の種別ごとにラグを保持し、作成者が編集できること」, and
    // ⚠️「ラグは値として保持するだけで、日付を自動で動かさない」.
    const document = accepted(
      editDependency(drawn(), {
        kind: 'setDependencyLag',
        predecessorUid: 1,
        successorUid: 2,
        lag: 3,
      }),
    )
    expect(dependenciesOf(document, 2)[0]!.lag).toBe(3)
    expect([taskIn(document, 1).finish, taskIn(document, 2).start]).toEqual([
      '2026-01-09',
      '2026-01-12',
    ])
  })

  it('S-117 reads 0 as a lag, not as an erasure', () => {
    // Table T-213: 0 は「間を空けない」-- a legitimate value, so setting it
    // back to 0 leaves a dependency that is still there.
    const document = accepted(
      editDependency(drawn(), {
        kind: 'setDependencyLag',
        predecessorUid: 1,
        successorUid: 2,
        lag: 0,
      }),
    )
    expect(dependenciesOf(document, 2)).toHaveLength(1)
    expect(dependenciesOf(document, 2)[0]!.lag).toBe(0)
  })

  it('FR-009 leaves the type of a dependency between two bars alone', () => {
    // MUST NOT: 「取り込んだ依存の種別は書き換えてはならない」. Neither end
    // is a milestone here, so there is nothing the edit may re-decide: the SS
    // stays an SS.
    const document = documentOf([
      taskOf({ uid: 1, name: 'a', start: '2026-01-05', finish: '2026-01-09' }),
      taskOf({
        uid: 2,
        name: 'b',
        start: '2026-01-12',
        finish: '2026-01-16',
        dependencies: [dependencyOf({ predecessorUid: 1, linkType: 3, lag: 2 })],
      }),
    ])
    const edited = accepted(
      editDependency(document, {
        kind: 'setDependencyLag',
        predecessorUid: 1,
        successorUid: 2,
        lag: 5,
      }),
    )
    expect(dependenciesOf(edited, 2)[0]!.linkType).toBe(3)
    expect(dependenciesOf(edited, 2)[0]!.lag).toBe(5)
  })
})

describe('EditDependency (UF-13) -- the imported dependency', () => {
  // 取り込んだ MSPDI がマイルストーン間に FS 以外を持っている場合。SS (AT-46
  // の 3) のまま文書に載っている。
  const importedSsBetweenMilestones = () =>
    documentOf([
      taskOf({ uid: 1, name: 'm1', start: '2026-01-05', finish: '2026-01-05', milestone: true }),
      taskOf({
        uid: 2,
        name: 'm2',
        start: '2026-01-12',
        finish: '2026-01-12',
        milestone: true,
        dependencies: [dependencyOf({ predecessorUid: 1, linkType: 3, lag: 0 })],
      }),
      taskOf({ uid: 3, name: 'c', start: '2026-01-20', finish: '2026-01-22' }),
    ])

  it('FR-009 does not rewrite the type of one it did not touch', () => {
    // MUST NOT: 「取り込んだ依存の種別は書き換えてはならない」——「取り込んだ
    // MSPDI がマイルストーン間に FS 以外を持っていたら、その種別のまま保つ」.
    // Editing some OTHER dependency must not sweep this one to FS; rewriting
    // it would break FR-021's lossless round trip.
    const after = accepted(
      editDependency(importedSsBetweenMilestones(), draw(2, 3, 'finish', 'start')),
    )
    expect(dependenciesOf(after, 2)[0]!.linkType).toBe(3)
  })

  // ⛔ NOT TESTED -- 「人がその依存を編集したときに限り FS へ寄せる」. The
  // exception to the MUST NOT above needs a decision the specification has not
  // made: whether CM-38 (the lag, the only in-place edit a person has over a
  // dependency) is the 編集 that triggers it, or whether only redrawing the
  // line is. The parallel FR-009 invokes -- 「`FR-012` の完了率と同じ規則で
  // ある」-- recomputes a derived value when its INPUTS (the dates) are
  // edited, and the lag is not an input of the link type. The aggregate also
  // holds no column saying a dependency came from an import (AT-45 to AT-50),
  // so the sentence's scope (取り込んだ依存) cannot be expressed here at all.
  // Today the lag edit leaves the type alone. Reported, not asserted.
})

describe('EditDependency (UF-13) -- CM-37 deleteDependency', () => {
  it('CD-3 takes the dependency and nothing else', () => {
    // Table T-050's CD-3: 依存線 -- 一緒に消えるもの「無し」. The two tasks
    // stay, and the other dependency into the same successor stays.
    const document = documentOf([
      taskOf({ uid: 1, name: 'a', start: '2026-01-05', finish: '2026-01-09' }),
      taskOf({ uid: 3, name: 'c', start: '2026-01-05', finish: '2026-01-07' }),
      taskOf({
        uid: 2,
        name: 'b',
        start: '2026-01-12',
        finish: '2026-01-16',
        dependencies: [
          dependencyOf({ predecessorUid: 1, linkType: 1, lag: 0 }),
          dependencyOf({ predecessorUid: 3, linkType: 3, lag: 0 }),
        ],
      }),
    ])
    const after = accepted(
      editDependency(document, { kind: 'deleteDependency', predecessorUid: 1, successorUid: 2 }),
    )
    expect(dependenciesOf(after, 2).map((row) => row.predecessorUid)).toEqual([3])
    expect(after.schedule.tasks.map((task) => task.uid).sort()).toEqual([1, 2, 3])
  })

  it('FR-009 lets the same pair be drawn again once it is gone', () => {
    // The MUST NOT is about a pair that is 「既に」held. Once CM-37 has taken
    // it, the pair is free, and the type it comes back with is the one the
    // new pair of edges falls on.
    const drawn = accepted(editDependency(documentOf(PLAIN()), draw(1, 2, 'finish', 'start')))
    const gone = accepted(
      editDependency(drawn, { kind: 'deleteDependency', predecessorUid: 1, successorUid: 2 }),
    )
    expect(dependenciesOf(gone, 2)).toHaveLength(0)
    const again = accepted(editDependency(gone, draw(1, 2, 'start', 'start')))
    expect(dependenciesOf(again, 2)[0]!.linkType).toBe(3)
  })
})
