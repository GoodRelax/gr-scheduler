
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { documentFromJson } from '../../src/adapter/document-codec/json-codec'
import type { Document } from '../../src/entity/document-model/document/document'
import * as scheduleEntry from '../../src/entity/document-model/schedule/schedule'
import { bare, specTable, unbroken } from './spec-table'
import { taskGroupDocument, taskOf } from '../unit/cr-541-stage'

const REQUIREMENTS = unbroken(readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8'))

const FR_130_NO_STATUS = '基準日（`Project.statusDate`）が `null` のときは診断を行わず、そのことを告げること（MUST）。'
const FR_130_NO_WRITE = '⛔ 診断は文書を変えてはならない（MUST NOT） —— タスク・依存・実績・`S-63` を書かない。'
const FR_130_NOT_KEPT = '導いた親子（`FR-135`）とマイルストーンの先行・達成（`FR-136`）も保存しない。'
const FR_131_ONE_EACH =
  '`GRS` は、開いている文書モデルを、矛盾（表 T-310）・疑義（表 T-311）・記載漏れ（表 T-312）の観点ですべて調べ、当たった 1 件ごとに指摘を 1 つ作ること。'
const FR_132_BOTTLENECK =
  '`GRS` は、表 T-313 の 4 つの段をこの順に行い、表 T-314 の量をタスクごとに求め、押し出し日数が `S-397` 以上で完了していない `Task` をボトルネックとすること。'
const FR_132_WORKING_DAYS = '日数はすべて稼働日で数えること（MUST、暦は `FR-054`）。'
const FR_132_NOT_DONE = '⛔ 完了（表 T-019a の `PS-2`）したタスクをボトルネックとしてはならない（MUST NOT）。'
const FR_132_DX_9 =
  '押し出し日数が `S-397` 以上の完了したタスクは、レポートの 表 T-317 の `DX-9` に確定した押し出しとして出すこと（MUST）。'
const FR_133_PATH_MARK =
  'ボトルネック経路の印（`DG-3`）は、ボトルネックの WBS の祖先（`parentTaskUid` を遡る縦の道、`FR-135` で導いた親を含む）にだけ付けること（MUST）。'
const FR_133_NOT_DOWNSTREAM = '⛔ 依存の下流に付けてはならない（MUST NOT）。'
const FR_135_DERIVE = '`Task.parentTaskUid` が `null` の `Task` について、`GRS` は、表 T-318 の規則で親を導き、診断の中でだけ使うこと。'
const FR_135_NOT_WRITTEN = '⛔ 導いた親を文書へ書いてはならない（MUST NOT）。'
const FR_135_NOT_NARROWER = '⛔ 候補が 2 つ以上のとき、狭いほうを親と決めてはならない（MUST NOT）。'
const FR_135_VO_4 = '導けなかった `Task` を、進捗妥当性検査の指摘（表 T-312 の `VO-4`）として出すこと（MUST）。'
const FR_136_DW_3 = '先行を 1 つも持たないマイルストーンは、表 T-316 の `DW-3` とすること（MUST）。'
const FR_136_NO_WRITE =
  '⛔ 診断がマイルストーンの `actualFinish` を書いてはならない（MUST NOT）。'
const FR_136_VO_5 =
  '導いた達成が成り立ち、手の `actualFinish` が無いマイルストーンは、表 T-312 の `VO-5` として、完了にする提案（達成日の候補 ＝ `MP-4` の日）をレポートに出すこと（MUST）。'

const CLAUSES = [
  FR_130_NO_STATUS,
  FR_130_NO_WRITE,
  FR_130_NOT_KEPT,
  FR_131_ONE_EACH,
  FR_132_BOTTLENECK,
  FR_132_WORKING_DAYS,
  FR_132_NOT_DONE,
  FR_132_DX_9,
  FR_133_PATH_MARK,
  FR_133_NOT_DOWNSTREAM,
  FR_135_DERIVE,
  FR_135_NOT_WRITTEN,
  FR_135_NOT_NARROWER,
  FR_135_VO_4,
  FR_136_DW_3,
  FR_136_NO_WRITE,
  FR_136_VO_5,
]

function cellOf(table: string, id: string, heading: string): string {
  const row = specTable(table).rows.find((one) => one.id === id)
  if (row === undefined) throw new Error(`table ${table} has no row ${id}`)
  const cell = row.by[heading]
  if (cell === undefined) throw new Error(`table ${table} has no column ${heading}`)
  return unbroken(cell)
}

const numberIn = (cell: string): number => {
  const found = /-?\d+/.exec(bare(cell).replace(/`/g, ''))
  const value = Number(found?.[0] ?? '')
  if (!Number.isFinite(value)) throw new Error(`no number in ${JSON.stringify(cell)}`)
  return value
}

// see S-397
const S_397 = numberIn(cellOf('T-206', 'S-397', '既定'))

type Report = unknown
type Diagnose = (document: Document, calendar: unknown) => Report

function diagnose(document: Document): Report {
  const seam = (scheduleEntry as unknown as { diagnoseDelay?: Diagnose }).diagnoseDelay
  if (typeof seam !== 'function') {
    throw new Error('S-1: the Schedule entry (schedule.ts) publishes no diagnoseDelay')
  }
  return seam(document, scheduleEntry.workingCalendarOf(document.schedule))
}

type Loose = Record<string, unknown>
const isPlain = (value: unknown): value is Loose =>
  value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Map) && !(value instanceof Set)

interface Placed {
  readonly node: unknown
  readonly container: unknown
}

function everything(root: unknown): readonly Placed[] {
  const out: Placed[] = []
  const seen = new Set<unknown>()
  const visit = (node: unknown, container: unknown): void => {
    out.push({ node, container })
    if (node === null || typeof node !== 'object' || seen.has(node)) return
    seen.add(node)
    if (node instanceof Map) {
      for (const [key, value] of node) {
        visit(key, node)
        visit(value, node)
      }
    } else if (node instanceof Set) {
      for (const value of node) visit(value, node)
    } else {
      for (const value of Object.values(node as Loose)) visit(value, node)
    }
  }
  visit(root, null)
  return out
}

const leavesOf = (root: unknown): readonly unknown[] =>
  everything(root)
    .map((one) => one.node)
    .filter((one) => one === null || typeof one !== 'object')

const holdsNumber = (root: unknown, value: number): boolean => leavesOf(root).includes(value)

function flat(record: Loose, depth = 0): Loose {
  const out: Loose = {}
  for (const [key, value] of Object.entries(record)) {
    if (isPlain(value) && depth < 2) Object.assign(out, flat(value, depth + 1))
    else if (value === null || typeof value !== 'object') out[key] = value
  }
  return out
}

const owns = (record: Loose, uid: number): boolean => Object.values(flat(record)).includes(uid)

const DG = /^DG-[1-4]$/

// see T-317, DX-8
function marksOf(report: Report, uids: readonly number[]): ReadonlyMap<number, string> {
  const marks = new Map<number, string>()
  const known = new Set(uids)
  for (const { node } of everything(report)) {
    if (node instanceof Map) {
      for (const [key, value] of node) {
        if (typeof key === 'number' && typeof value === 'string' && DG.test(value)) marks.set(key, value)
      }
    } else if (Array.isArray(node)) {
      if (node.length === 2 && typeof node[0] === 'number' && typeof node[1] === 'string' && DG.test(node[1])) {
        marks.set(node[0], node[1])
      }
    } else if (isPlain(node)) {
      const own = Object.entries(node)
      for (const [key, value] of own) {
        if (/^\d+$/.test(key) && typeof value === 'string' && DG.test(value)) marks.set(Number(key), value)
      }
      const symbol = own.map(([, value]) => value).find((value) => typeof value === 'string' && DG.test(value))
      if (typeof symbol === 'string') {
        const uid = Object.values(flat(node)).find((value) => typeof value === 'number' && known.has(value))
        if (typeof uid === 'number' && !marks.has(uid)) marks.set(uid, symbol)
      }
    }
  }
  return marks
}

function heldBy(report: Report, rowId: string): readonly unknown[] {
  const out: unknown[] = []
  for (const { node } of everything(report)) {
    if (node instanceof Map) {
      if (node.has(rowId)) out.push(node.get(rowId))
    } else if (isPlain(node)) {
      if (Object.values(node).includes(rowId)) out.push(node)
      if (Object.hasOwn(node, rowId)) out.push(node[rowId])
    }
  }
  return out
}

// see T-317, DX-3, DX-6
const namesTask = (report: Report, rowId: string, uid: number): unknown[] =>
  heldBy(report, rowId).flatMap((part) => {
    if (Array.isArray(part)) return part.filter((one) => holdsNumber(one, uid))
    return holdsNumber(part, uid) ? [part] : []
  })

interface Pushed {
  readonly record: Loose
  readonly values: Loose
  readonly container: unknown
}

// see T-317, DX-4, DX-9
function pushedOf(report: Report, uid: number): readonly Pushed[] {
  return everything(report)
    .filter((one) => one.container !== null && isPlain(one.node))
    .map((one) => ({ record: one.node as Loose, values: flat(one.node as Loose), container: one.container }))
    .filter((one) => Object.hasOwn(one.values, 'pushOutDays') && owns(one.record, uid))
}

function onePushed(report: Report, uid: number): Pushed {
  const found = pushedOf(report, uid)
  if (found.length === 0) throw new Error(`the report holds no pushOutDays entry for task ${uid}`)
  return found[0] as Pushed
}

const ROW_ID_OF_A_FINDING = /^V[COS]-\d+$/

const S = (day: number): string => `2026-04-${String(day).padStart(2, '0')}T08:00:00`
const F = (day: number): string => `2026-04-${String(day).padStart(2, '0')}T17:00:00`
const FS = 1
const SS = 3
const after = (uid: number, linkType = FS): Loose => ({
  predecessorUid: uid,
  linkType,
  lag: 0,
  lagFormat: 7,
  carry: {},
  carryElements: [],
})

interface Row {
  readonly id: string
  readonly parentId: string | null
  readonly tasks: readonly Loose[]
}

function documentOf(statusDate: string | null, rows: readonly Row[], keepsWrittenPercent = false): Document {
  const raw = taskGroupDocument(rows.map((row) => ({ id: row.id, parentId: row.parentId })))
  raw.schedule.project.statusDate = statusDate
  raw.schedule.project.uidHighWaterMark = 1000
  raw.schedule.tasks = rows.flatMap((row) => row.tasks)
  raw.schedule.taskGroupMembers = rows.flatMap((row) =>
    row.tasks.map((task) => ({ taskUid: task['uid'], groupId: row.id })),
  )
  const decoded = documentFromJson(JSON.stringify(raw))
  if (!decoded.ok) throw new Error(`the schedule does not decode: ${JSON.stringify(decoded.faults)}`)
  if (!keepsWrittenPercent) return decoded.document
  // WHY: a GRS JSON read recounts percentComplete (FR-012); VC-5 stands on a value an MSPDI import keeps (FR-021).
  const written = new Map(raw.schedule.tasks.map((task: Loose) => [task['uid'], task['percentComplete']]))
  const tasks = decoded.document.schedule.tasks.map((task) => ({
    ...task,
    percentComplete: (written.get(task.uid) as number | null | undefined) ?? task.percentComplete,
  }))
  return { ...decoded.document, schedule: { ...decoded.document.schedule, tasks } }
}

const STATUS = F(15)

// WHY: B, B2 start on their predecessor's finish day (BD-2). A counts 1 actual day (FR-011), so BD-1 ends it the 17th,
// 7 late, all reaching B's end; B2 also ends the 17th, keeps min(3, 5) and hands A2 min(2, 2) = 2 (CR-633).
const P = 100
const A = 101
const B = 102
const A2 = 111
const B2 = 112
const CHAIN_TASK_GROUPS = (statusDate: string | null): Document =>
  documentOf(statusDate, [
    {
      id: 'r0',
      parentId: null,
      tasks: [taskOf(P, { name: 'Programme', start: S(6), finish: F(10), actualStart: S(6) })],
    },
    {
      id: 'r1',
      parentId: 'r0',
      tasks: [
        taskOf(A, { name: 'Design', parentTaskUid: P, start: S(6), finish: F(8), actualStart: S(6), percentComplete: 40 }),
        taskOf(B, { name: 'Build', parentTaskUid: P, start: S(8), finish: F(10), dependencies: [after(A)] }),
      ],
    },
    {
      id: 'r2',
      parentId: 'r0',
      tasks: [
        taskOf(A2, {
          name: 'Survey',
          parentTaskUid: P,
          start: S(6),
          finish: F(8),
          actualStart: S(6),
          actualFinish: F(10),
          percentComplete: 100,
        }),
        taskOf(B2, {
          name: 'Report',
          parentTaskUid: P,
          start: S(8),
          finish: F(10),
          actualStart: S(13),
          percentComplete: 30,
          dependencies: [after(A2)],
        }),
      ],
    },
  ])

const R = 130
const C = 131
const D = 132
const E = 133
const FF = 134
const TRUST = (statusDate: string | null): Document =>
  documentOf(statusDate, [
    { id: 'r0', parentId: null, tasks: [taskOf(R, { name: 'Release', start: S(6), finish: F(14), actualStart: S(6) })] },
    {
      id: 'r1',
      parentId: 'r0',
      tasks: [
        taskOf(C, { name: 'Contract', parentTaskUid: R, start: S(6), finish: F(8), percentComplete: 50 }),
        taskOf(D, { name: 'Delivery', parentTaskUid: R, start: S(9), finish: F(10), dependencies: [after(C)] }),
        taskOf(E, { name: 'Acceptance', parentTaskUid: R, start: S(13), finish: F(14), dependencies: [after(D)] }),
        taskOf(FF, {
          name: 'Fitting',
          parentTaskUid: R,
          start: S(6),
          finish: F(8),
          actualStart: S(6),
          actualFinish: F(8),
          percentComplete: 100,
        }),
      ],
    },
  ], true)

const K = 140
const L = 141
const M = 142
const DOUBT = documentOf(STATUS, [
  { id: 'r0', parentId: null, tasks: [taskOf(K, { name: 'Kickoff', start: S(6), finish: F(10) })] },
  {
    id: 'r1',
    parentId: 'r0',
    tasks: [
      taskOf(L, { name: 'Listing', parentTaskUid: K, start: S(6), finish: F(10), dependencies: [after(K, SS)] }),
      taskOf(M, { name: 'Mockup', parentTaskUid: K, start: S(6), finish: F(8) }),
    ],
  },
])

const W = 150
const X = 151
const Y = 152
const Z = 153
const DERIVED = documentOf(STATUS, [
  { id: 'r0', parentId: null, tasks: [taskOf(W, { name: 'Workstream', start: S(6), finish: F(10), actualStart: S(6) })] },
  {
    id: 'r1',
    parentId: 'r0',
    tasks: [taskOf(X, { name: 'Excavation', parentTaskUid: W, start: S(6), finish: F(8), actualStart: S(6) })],
  },
  {
    id: 'r1b',
    parentId: 'r0',
    // WHY: Z starts on the 8th, Y's finish day (BD-2, CR-618), so Y's 7 days (BD-1, CR-633) reach Z's end whole.
    tasks: [taskOf(Z, { name: 'Zoning', parentTaskUid: W, start: S(8), finish: F(10), dependencies: [after(Y)] })],
  },
  {
    id: 'r2',
    parentId: 'r1',
    tasks: [taskOf(Y, { name: 'Yard', start: S(6), finish: F(8), actualStart: S(6), percentComplete: 40 })],
  },
])

const W2 = 160
const X1 = 161
const X2 = 162
const Y2 = 163
const TWO_CANDIDATES = documentOf(STATUS, [
  { id: 'r0', parentId: null, tasks: [taskOf(W2, { name: 'Wing', start: S(6), finish: F(10) })] },
  {
    id: 'r1',
    parentId: 'r0',
    tasks: [
      taskOf(X1, { name: 'Wide', parentTaskUid: W2, start: S(6), finish: F(10) }),
      taskOf(X2, { name: 'Narrow', parentTaskUid: W2, start: S(6), finish: F(9) }),
    ],
  },
  { id: 'r2', parentId: 'r1', tasks: [taskOf(Y2, { name: 'Inner', start: S(7), finish: F(8) })] },
])

const W3 = 170
const X3 = 171
const Y3 = 172
const NO_CANDIDATE = documentOf(STATUS, [
  { id: 'r0', parentId: null, tasks: [taskOf(W3, { name: 'Ward', start: S(6), finish: F(10) })] },
  { id: 'r1', parentId: 'r0', tasks: [taskOf(X3, { name: 'Early', parentTaskUid: W3, start: S(6), finish: F(8) })] },
  { id: 'r2', parentId: 'r1', tasks: [taskOf(Y3, { name: 'Overhang', start: S(7), finish: F(10) })] },
])

const W4 = 180
const M0 = 181
const T4 = 182
const LONE_MILESTONE = documentOf(STATUS, [
  { id: 'r0', parentId: null, tasks: [taskOf(W4, { name: 'Window', start: S(6), finish: F(10) })] },
  {
    id: 'r1',
    parentId: 'r0',
    tasks: [
      taskOf(M0, { name: 'Gate zero', parentTaskUid: W4, milestone: true, start: S(6), finish: S(6) }),
      taskOf(T4, { name: 'Tooling', parentTaskUid: W4, start: S(6), finish: F(10) }),
    ],
  },
])

const W5 = 190
const T1 = 191
const T2 = 192
const M1 = 193
const ACHIEVED = documentOf(STATUS, [
  { id: 'r0', parentId: null, tasks: [taskOf(W5, { name: 'Wave', start: S(6), finish: F(10), actualStart: S(6) })] },
  {
    id: 'r1',
    parentId: 'r0',
    tasks: [
      taskOf(T1, {
        name: 'Trial one',
        parentTaskUid: W5,
        start: S(6),
        finish: F(8),
        actualStart: S(6),
        actualFinish: F(8),
        percentComplete: 100,
      }),
      taskOf(T2, {
        name: 'Trial two',
        parentTaskUid: W5,
        start: S(6),
        finish: F(9),
        actualStart: S(6),
        actualFinish: F(9),
        percentComplete: 100,
      }),
      taskOf(M1, { name: 'Gate one', parentTaskUid: W5, milestone: true, start: S(10), finish: S(10) }),
    ],
  },
])

const W6 = 200
const T3 = 201
const M2 = 202
const EARLY_GATE = documentOf(STATUS, [
  { id: 'r0', parentId: null, tasks: [taskOf(W6, { name: 'Wharf', start: S(6), finish: F(10), actualStart: S(10) })] },
  {
    id: 'r1',
    parentId: 'r0',
    tasks: [
      taskOf(T3, { name: 'Trench', parentTaskUid: W6, start: S(6), finish: F(8) }),
      taskOf(M2, {
        name: 'Gate two',
        parentTaskUid: W6,
        milestone: true,
        start: S(10),
        finish: S(10),
        actualStart: S(10),
        actualFinish: S(10),
        percentComplete: 100,
      }),
    ],
  },
])

const ALL_UIDS = [P, A, B, A2, B2, R, C, D, E, FF, K, L, M, W, X, Y, Z, W2, X1, X2, Y2, W3, X3, Y3, W4, M0, T4, W5, T1, T2, M1, W6, T3, M2]
const markOf = (report: Report, uid: number): string | undefined => marksOf(report, ALL_UIDS).get(uid)
const PAINTED = ['DG-1', 'DG-2', 'DG-3']

const taskIn = (document: Document, uid: number): Loose => {
  const found = (document.schedule.tasks as unknown as readonly Loose[]).find((one) => one['uid'] === uid)
  if (found === undefined) throw new Error(`no task ${uid}`)
  return found
}

describe('CR-561 -- the clauses these cases are driven by', () => {
  it.each(CLAUSES)('the requirements still say: %s', (clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })

  it('T-313 BD-1 .. BD-4, T-314 DQ-1 .. DQ-4 and T-317 DX-1 .. DX-10 are still the rows read here', () => {
    expect(specTable('T-313').rows.map((row) => row.id)).toEqual(['BD-1', 'BD-2', 'BD-3', 'BD-4'])
    expect(specTable('T-314').rows.map((row) => bare(row.by['英（コード）'] ?? ''))).toEqual([
      'projectedFinish',
      'inheritedDelayDays',
      'selfDelayDays',
      'pushOutDays',
    ])
    expect(specTable('T-317').rows.map((row) => row.id)).toEqual([
      'DX-1',
      'DX-2',
      'DX-3',
      'DX-4',
      'DX-5',
      'DX-6',
      'DX-7',
      'DX-8',
      'DX-9',
      'DX-10',
    ])
    expect(cellOf('T-313', 'BD-1', '何をするか')).toContain('着手済みで未完了は 基準日 ＋ 残りの日数 とし')
    expect(cellOf('T-314', 'DQ-3', '定義')).toContain('max(0, `DQ-1` − (最早開始 ＋ 計画期間))')
    expect(cellOf('T-316', 'DW-1', '紫（表 T-315 の `DG-1`）を付ける行')).toBe('原因の `Task` と、その依存の下流すべて')
    expect(cellOf('T-316', 'DW-2', '紫（表 T-315 の `DG-1`）を付ける行')).toContain('候補が 0 なら原因だけ')
    expect(cellOf('T-318', 'IP-1', '規則')).toContain('（親の `start` ≤ 子の `start` かつ 子の `finish` ≤ 親の `finish`）')
    expect(cellOf('T-319', 'MP-4', '規則')).toContain('達成日 ＝ 先行の最も遅い `actualFinish`')
    expect(S_397).toBe(1)
  })

  it('every schedule below decodes (the fixtures, not the seam)', () => {
    for (const one of [CHAIN_TASK_GROUPS(STATUS), TRUST(STATUS), DOUBT, DERIVED, TWO_CANDIDATES, NO_CANDIDATE]) {
      expect(one.schedule.tasks.length).toBeGreaterThan(0)
    }
    for (const one of [LONE_MILESTONE, ACHIEVED, EARLY_GATE]) expect(one.schedule.tasks.length).toBeGreaterThan(0)
  })
})

describe(`FR-130 -- ${FR_130_NO_STATUS}`, () => {
  it('with no status date the report is returned, and nothing in it is a diagnosis (DX-1)', () => {
    const report = diagnose(TRUST(null))
    expect(report).toBeDefined()
    expect(report).not.toBeNull()
    expect(leavesOf(report).filter((one) => typeof one === 'string' && ROW_ID_OF_A_FINDING.test(one))).toEqual([])
    expect([...marksOf(report, ALL_UIDS).values()].filter((one) => PAINTED.includes(one))).toEqual([])
    expect(everything(report).some((one) => isPlain(one.node) && Object.hasOwn(one.node, 'pushOutDays'))).toBe(false)
  })

  it('the not-diagnosed report is not the diagnosed one (DX-1 tells the two apart)', () => {
    expect(diagnose(CHAIN_TASK_GROUPS(null))).not.toEqual(diagnose(CHAIN_TASK_GROUPS(STATUS)))
  })

  it('DX-2: the report carries the status date it diagnosed at', () => {
    const document = CHAIN_TASK_GROUPS(STATUS)
    const statusDate = document.schedule.project.statusDate
    expect(leavesOf(diagnose(document))).toContainEqual(statusDate)
  })
})

describe(`FR-130 -- ${FR_130_NO_WRITE}`, () => {
  const documents: readonly [string, () => Document][] = [
    ['no status date', () => CHAIN_TASK_GROUPS(null)],
    ['a delayed chain', () => CHAIN_TASK_GROUPS(STATUS)],
    ['a contradiction', () => TRUST(STATUS)],
    ['a derived parent', () => DERIVED],
    ['two candidate parents', () => TWO_CANDIDATES],
    ['an achieved milestone', () => ACHIEVED],
  ]

  it.each(documents)('%s: the document deep-equals itself after the call', (_name, make) => {
    const document = make()
    const before = structuredClone(document)
    diagnose(document)
    expect(document).toEqual(before)
  })

  it.each(documents)('%s: calling twice gives equal reports (pure)', (_name, make) => {
    const document = make()
    expect(diagnose(document)).toEqual(diagnose(document))
  })

  it(`${FR_135_NOT_WRITTEN} -- Y keeps parentTaskUid null`, () => {
    diagnose(DERIVED)
    expect(taskIn(DERIVED, Y)['parentTaskUid']).toBeNull()
  })

  it(`${FR_136_NO_WRITE} -- M1 keeps actualFinish null`, () => {
    diagnose(ACHIEVED)
    expect(taskIn(ACHIEVED, M1)['actualFinish']).toBeNull()
  })
})

describe(`FR-132 -- ${FR_132_BOTTLENECK}`, () => {
  const report = (): Report => diagnose(CHAIN_TASK_GROUPS(STATUS))

  it('A, started and not done, is the bottleneck: DX-8 holds DG-2 for it', () => {
    expect(markOf(report(), A)).toBe('DG-2')
  })

  it('B, pushed by A and generating nothing itself, is not painted', () => {
    expect(PAINTED).not.toContain(markOf(report(), B))
  })

  it(`${FR_132_WORKING_DAYS} -- A: DQ-2 0, DQ-3 7, DQ-4 7 (T-313 BD-1, T-314, CR-633)`, () => {
    const entry = onePushed(report(), A)
    expect(entry.values['inheritedDelayDays']).toBe(0)
    expect(entry.values['selfDelayDays']).toBe(7)
    expect(entry.values['pushOutDays']).toBe(7)
  })

  it('DX-4: the entry names A by uid and name, and says one terminal was reached', () => {
    const entry = onePushed(report(), A)
    expect(Object.values(entry.values)).toContain('Design')
    const others = Object.entries(entry.values).filter(
      ([key, value]) => typeof value === 'number' && value !== A && !['inheritedDelayDays', 'selfDelayDays', 'pushOutDays'].includes(key),
    )
    expect(others.map(([, value]) => value)).toContain(1)
  })

  it('DX-5: terminal B carries its delay of 7 and hands it to A', () => {
    const terminals = everything(report())
      .filter((one) => one.container !== null && isPlain(one.node))
      .map((one) => one.node as Loose)
      .filter((one) => !Object.hasOwn(flat(one), 'pushOutDays') && owns(one, B) && holdsNumber(one, A))
    expect(terminals.some((one) => Object.values(flat(one)).includes(7) && holdsNumber(one, 7))).toBe(true)
  })
})

describe(`FR-132 -- ${FR_132_NOT_DONE}`, () => {
  const report = (): Report => diagnose(CHAIN_TASK_GROUPS(STATUS))

  it('A2 is done (PS-2): DX-8 does not hold DG-2 for it', () => {
    expect(markOf(report(), A2)).not.toBe('DG-2')
  })

  it(`${FR_132_DX_9} -- A2 pushed B2's end by 2 working days`, () => {
    const entry = onePushed(report(), A2)
    expect(entry.values['selfDelayDays']).toBe(2)
    expect(entry.values['pushOutDays']).toBe(2)
    expect(entry.values['pushOutDays']).toBeGreaterThanOrEqual(S_397)
  })

  it('DX-9 is its own row: A2 (done) and A (not done) are not in the same list', () => {
    const one = report()
    expect(onePushed(one, A2).container).not.toBe(onePushed(one, A).container)
  })
})

describe(`FR-131 -- ${FR_131_ONE_EACH}`, () => {
  const report = (): Report => diagnose(TRUST(STATUS))

  it('VC-5 (T-310): one finding names C by uid and name, at the layer T-310 gives, with the values it read', () => {
    const found = namesTask(report(), 'VC-5', C)
    expect(found.length).toBeGreaterThan(0)
    const layer = numberIn(cellOf('T-310', 'VC-5', '層'))
    expect(found.some((one) => leavesOf(one).includes('Contract'))).toBe(true)
    expect(found.some((one) => holdsNumber(one, layer))).toBe(true)
    expect(found.some((one) => holdsNumber(one, 50))).toBe(true)
  })

  it('DW-1 (T-316): C and its dependency downstream D and E are DG-1; F, apart and done, is not', () => {
    const one = report()
    expect(markOf(one, C)).toBe('DG-1')
    expect(markOf(one, D)).toBe('DG-1')
    expect(markOf(one, E)).toBe('DG-1')
    expect(markOf(one, FF)).not.toBe('DG-1')
  })

  it('DX-6: a DW-1 wall names C as its cause', () => {
    expect(namesTask(report(), 'DW-1', C).length).toBeGreaterThan(0)
  })

  it('VS-1 (T-311): a dependency between parent K and child L is one finding naming them', () => {
    const found = [...namesTask(diagnose(DOUBT), 'VS-1', K), ...namesTask(diagnose(DOUBT), 'VS-1', L)]
    expect(found.length).toBeGreaterThan(0)
  })

  it('VO-1 (T-312): M was due to start and has no actualStart -- one finding names it', () => {
    expect(namesTask(diagnose(DOUBT), 'VO-1', M).length).toBeGreaterThan(0)
  })

  it('VO-2 (T-312): A was due to finish, has started, and has neither actualFinish nor stop', () => {
    expect(namesTask(diagnose(CHAIN_TASK_GROUPS(STATUS)), 'VO-2', A).length).toBeGreaterThan(0)
  })

  it('a doubt and a VO-1 omission do not paint: DG-1 takes T-310, VO-3, VO-5 and T-316 only (T-315), so L and M are not DG-1', () => {
    const one = diagnose(DOUBT)
    expect(markOf(one, L)).not.toBe('DG-1')
    expect(markOf(one, M)).not.toBe('DG-1')
  })
})

describe(`FR-135 -- ${FR_135_DERIVE}`, () => {
  const report = (): Report => diagnose(DERIVED)

  it('IP-2: X is Y\'s one candidate, so Y is not a VO-4', () => {
    expect(namesTask(report(), 'VO-4', Y)).toEqual([])
  })

  it('Y, started and late, is the bottleneck (it pushes Z\'s end)', () => {
    expect(markOf(report(), Y)).toBe('DG-2')
    expect(onePushed(report(), Y).values['pushOutDays']).toBe(7)
  })

  it(`${FR_133_PATH_MARK} -- X, the derived parent, is DG-3`, () => {
    expect(markOf(report(), X)).toBe('DG-3')
  })

  it(`${FR_133_NOT_DOWNSTREAM} -- Z, downstream of Y, is not DG-3`, () => {
    expect(markOf(report(), Z)).not.toBe('DG-3')
  })

  it('DX-4: Y\'s path runs from the root W through the derived parent X', () => {
    const entry = onePushed(report(), Y)
    const paths = everything(entry.record)
      .map((one) => one.node)
      .filter((one): one is number[] => Array.isArray(one) && one.length > 0 && one.every((v) => typeof v === 'number'))
    expect(paths.some((path) => path[0] === W && path[1] === X && path.every((v) => [W, X, Y].includes(v)))).toBe(true)
  })
})

describe(`FR-135 -- ${FR_135_VO_4}`, () => {
  it(`${FR_135_NOT_NARROWER} -- Y2 has two candidates (X1, X2): VO-4 names it`, () => {
    expect(namesTask(diagnose(TWO_CANDIDATES), 'VO-4', Y2).length).toBeGreaterThan(0)
  })

  it('DW-2: Y2 and both candidates X1, X2 are DG-1, and a DW-2 wall names Y2', () => {
    const one = diagnose(TWO_CANDIDATES)
    expect(markOf(one, Y2)).toBe('DG-1')
    expect(markOf(one, X1)).toBe('DG-1')
    expect(markOf(one, X2)).toBe('DG-1')
    expect(namesTask(one, 'DW-2', Y2).length).toBeGreaterThan(0)
  })

  it('IP-1 (not by start alone): X3 starts before Y3 but ends before it -- no candidate, VO-4 names Y3', () => {
    expect(namesTask(diagnose(NO_CANDIDATE), 'VO-4', Y3).length).toBeGreaterThan(0)
  })

  it('DW-2 with no candidate: only the cause Y3 is DG-1, not X3', () => {
    const one = diagnose(NO_CANDIDATE)
    expect(markOf(one, Y3)).toBe('DG-1')
    expect(markOf(one, X3)).not.toBe('DG-1')
  })
})

describe(`FR-136 -- ${FR_136_DW_3}`, () => {
  it('M0 has no predecessor by MP-1 .. MP-3: DG-1, and a DW-3 wall names it', () => {
    const one = diagnose(LONE_MILESTONE)
    expect(markOf(one, M0)).toBe('DG-1')
    expect(namesTask(one, 'DW-3', M0).length).toBeGreaterThan(0)
  })

  it('M1 has T1 and T2 by MP-1, so it is no DW-3; its VO-5 makes it DG-1, not a wall (T-315 DG-1, CR-633)', () => {
    const one = diagnose(ACHIEVED)
    expect(namesTask(one, 'DW-3', M1)).toEqual([])
    expect(markOf(one, M1)).toBe('DG-1')
  })
})

describe(`FR-136 -- ${FR_136_VO_5}`, () => {
  it('VO-5 names M1 and proposes the latest actualFinish of its predecessors, T2\'s (MP-4)', () => {
    const found = namesTask(diagnose(ACHIEVED), 'VO-5', M1)
    expect(found.length).toBeGreaterThan(0)
    const proposed = taskIn(ACHIEVED, T2)['actualFinish'] as string
    const leaves = found.flatMap((one) => leavesOf(one))
    expect(leaves.some((one) => one === proposed || (typeof one === 'string' && one.startsWith(proposed.slice(0, 10))))).toBe(
      true,
    )
  })

  it('VC-14 (T-310): M2 carries a hand actualFinish while its MP-1 predecessor T3 is not done', () => {
    const one = diagnose(EARLY_GATE)
    expect(namesTask(one, 'VC-14', M2).length).toBeGreaterThan(0)
    expect(markOf(one, M2)).toBe('DG-1')
  })
})
