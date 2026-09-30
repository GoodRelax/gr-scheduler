// Spec-only cases for CR-618 T1 .. T7: a link holds on the same day (VC-15, VS-4, BD-2).

import { describe, expect, it } from 'vitest'

import { documentFromJson } from '../../src/adapter/document-codec/json-codec'
import type { Document } from '../../src/entity/document-model/document/document'
import * as scheduleEntry from '../../src/entity/document-model/schedule/schedule'
import { bare, specTable, unbroken } from '../contract/spec-table'
import { REQUIREMENTS, rowDocument, taskOf } from './cr-541-stage'

const VC_15_FORMULA =
  '予定の日付が依存の向きに反する（FS: 後続の `start` ≥ 先行の `finish` ＋ `lag`、SS: 後続の `start` ≥ 先行の `start` ＋ `lag`、FF: 後続の `finish` ≥ 先行の `finish` ＋ `lag`、SF: 後続の `finish` ≥ 先行の `start` ＋ `lag`）。'
const VC_15_SAME_DAY = '⭐ 日は日として比べ、4 つとも **同じ日は反しない**'
const VC_15_NOT_ND_3 = '⛔ `ND-3` の「終了日はその日を含む」を、FS の 1 日の差に数えてはならない（MUST NOT）'
const VS_4_ACTUALS = '実績の日付が依存の向きに反する（式は `VC-15` を実績の列に当てたもの）'
const BD_2_SAME_DAY =
  'FS の後続の最早開始は、先行の見込み終了と **同じ日** ＋ `lag` であり、翌稼働日ではない。'
const BD_2_NOT_BELOW_START = '⭐ 最早開始は `start` を下回らない'
const BD_2_NOT_BELOW_STATUS = '未着手の `Task` の最早開始は、さらに基準日を下回らない。'
const BD_1_STARTED = '着手済みで未完了は `max(finish, 基準日)`。'
const DQ_2 = 'max(0, 最早開始 − `start`) —— 巻き添え'
const DQ_3 = 'max(0, `DQ-1` − (最早開始 ＋ 計画期間)) —— 発生源'
const DW_1_PURPLE = '原因の `Task` と、その依存の下流すべて'
const DG_1_WHEN = '表 T-310 の指摘を持つ、または 表 T-316 が紫とする'
const DG_2_WHEN = '`DQ-4` が `S-397` 以上で、完了（`PS-2`）していない'
const FR_131_ONE_EACH =
  '`GRS` は、開いている文書モデルを、矛盾（表 T-310）・疑義（表 T-311）・記載漏れ（表 T-312）の観点ですべて調べ、当たった 1 件ごとに指摘を 1 つ作ること。'
const FR_132_WORKING_DAYS = '日数はすべて稼働日で数えること（MUST、暦は `FR-054`）。'

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

// see AT-46
const FF = 0
const FS = 1
const SF = 2
const SS = 3

type Report = unknown
type Diagnose = (document: Document, calendar: unknown) => Report

function diagnose(document: Document): Report {
  const seam = (scheduleEntry as unknown as { diagnoseDelay?: Diagnose }).diagnoseDelay
  if (typeof seam !== 'function') {
    throw new Error('SEAM-1: the Schedule entry (schedule.ts) publishes no diagnoseDelay')
  }
  return seam(document, scheduleEntry.workingCalendarOf(document.schedule))
}

type Loose = Record<string, unknown>
const isPlain = (value: unknown): value is Loose =>
  value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Map) && !(value instanceof Set)

function nodesOf(root: unknown): readonly unknown[] {
  const out: unknown[] = []
  const seen = new Set<unknown>()
  const visit = (node: unknown): void => {
    out.push(node)
    if (node === null || typeof node !== 'object' || seen.has(node)) return
    seen.add(node)
    if (node instanceof Map) {
      for (const [key, value] of node) {
        visit(key)
        visit(value)
      }
    } else if (node instanceof Set) {
      for (const value of node) visit(value)
    } else {
      for (const value of Object.values(node as Loose)) visit(value)
    }
  }
  visit(root)
  return out
}

const plainsOf = (report: Report): readonly Loose[] => nodesOf(report).filter(isPlain)
const ownNumbers = (record: Loose): readonly number[] =>
  Object.values(record).filter((value): value is number => typeof value === 'number')

const FINDING_ROW = /^V[COS]-\d+$/
const MARK_ROW = /^DG-[1-4]$/
const ANY_ROW = /^(V[COS]|DW|DG)-\d+$/

// see T-317, DX-3
function findingsOf(report: Report): readonly { readonly row: string; readonly record: Loose }[] {
  const out: { row: string; record: Loose }[] = []
  for (const record of plainsOf(report)) {
    const row = Object.values(record).find((value): value is string => typeof value === 'string' && FINDING_ROW.test(value))
    if (row !== undefined) out.push({ row, record })
  }
  return out
}

const findingRows = (report: Report): readonly string[] => findingsOf(report).map((one) => one.row)
const countOf = (rows: readonly string[], row: string): number => rows.filter((one) => one === row).length

// see T-317, DX-8
function marksOf(report: Report): ReadonlyMap<number, string> {
  const marks = new Map<number, string>()
  for (const node of nodesOf(report)) {
    if (node instanceof Map) {
      for (const [key, value] of node) {
        if (typeof key === 'number' && typeof value === 'string' && MARK_ROW.test(value)) marks.set(key, value)
      }
    } else if (isPlain(node)) {
      const symbol = Object.values(node).find((value) => typeof value === 'string' && MARK_ROW.test(value))
      const numbers = ownNumbers(node)
      if (typeof symbol === 'string' && numbers.length === 1) marks.set(numbers[0] as number, symbol)
      for (const [key, value] of Object.entries(node)) {
        if (/^\d+$/.test(key) && typeof value === 'string' && MARK_ROW.test(value)) marks.set(Number(key), value)
      }
    }
  }
  return marks
}

// see T-314
const QUANTITIES = ['inheritedDelayDays', 'selfDelayDays', 'pushOutDays'] as const

function quantitiesOf(report: Report, uid: number): readonly Loose[] {
  return plainsOf(report).filter((record) => Object.hasOwn(record, 'pushOutDays') && ownNumbers(record).includes(uid))
}

function anyPositiveQuantity(report: Report): readonly Loose[] {
  return plainsOf(report).filter((record) =>
    QUANTITIES.some((name) => typeof record[name] === 'number' && (record[name] as number) > 0),
  )
}

// see T-317, DX-5
function terminalDelaysOf(report: Report, uid: number): readonly number[] {
  return plainsOf(report)
    .filter((record) => !Object.hasOwn(record, 'pushOutDays'))
    .filter((record) => !Object.values(record).some((value) => typeof value === 'string' && ANY_ROW.test(value)))
    .filter((record) => ownNumbers(record).includes(uid))
    .map((record) => ownNumbers(record).filter((value) => value !== uid))
    .filter((numbers) => numbers.length === 1)
    .map((numbers) => numbers[0] as number)
}

const at = (day: number, hour: number): string =>
  `2026-04-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:00:00`

const link = (uid: number, linkType: number): Loose => ({
  predecessorUid: uid,
  linkType,
  lag: 0,
  lagFormat: 7,
  carry: {},
  carryElements: [],
})

const P = 100
const A = 101
const B = 102
const C = 103

interface Child {
  readonly uid: number
  readonly start: string
  readonly finish: string
  readonly after?: readonly (readonly [number, number])[]
  readonly milestone?: boolean
  readonly actualStart?: string
  readonly actualFinish?: string
  readonly percentComplete?: number
}

const earliest = (values: readonly string[]): string => [...values].sort()[0] as string
const latest = (values: readonly string[]): string => [...values].sort().reverse()[0] as string

function documentOf(statusDate: string, children: readonly Child[]): Document {
  const raw = rowDocument([
    { id: 'r0', parentId: null },
    { id: 'r1', parentId: 'r0' },
  ])
  raw.schedule.project.statusDate = statusDate
  raw.schedule.project.uidHighWaterMark = 1000
  const started = children.flatMap((one) => (one.actualStart === undefined ? [] : [one.actualStart]))
  const allDone = children.every((one) => one.actualFinish !== undefined)
  const root = taskOf(P, {
    name: 'Programme',
    start: earliest(children.map((one) => one.start)),
    finish: latest(children.map((one) => one.finish)),
    actualStart: started.length > 0 ? earliest(started) : null,
    actualFinish: allDone ? latest(children.map((one) => one.actualFinish as string)) : null,
    percentComplete: allDone ? 100 : 0,
  })
  const tasks = children.map((one) =>
    taskOf(one.uid, {
      name: `Step ${one.uid}`,
      wbsParentUid: P,
      start: one.start,
      finish: one.finish,
      milestone: one.milestone === true,
      actualStart: one.actualStart ?? null,
      actualFinish: one.actualFinish ?? null,
      percentComplete: one.percentComplete ?? (one.actualFinish !== undefined ? 100 : 0),
      dependencies: (one.after ?? []).map(([uid, type]) => link(uid, type)),
    }),
  )
  raw.schedule.tasks = [root, ...tasks]
  raw.schedule.taskGroupMembers = [
    { taskUid: P, groupId: 'r0', stackOrder: null },
    ...children.map((one) => ({ taskUid: one.uid, groupId: 'r1', stackOrder: null })),
  ]
  const decoded = documentFromJson(JSON.stringify(raw))
  if (!decoded.ok) throw new Error(`the schedule does not decode: ${JSON.stringify(decoded.faults)}`)
  return decoded.document
}

// WHY: diagnosed before anything is due, so no omission (T-312) and no PM-4 delay can arise.
const BEFORE_ALL = at(3, 17)
const AFTER_ALL = at(15, 17)

const plannedOnly = (children: readonly Child[]): Document => documentOf(BEFORE_ALL, children)
const doneOnPlan = (children: readonly Child[]): Document =>
  documentOf(
    AFTER_ALL,
    children.map((one) => ({ ...one, actualStart: one.actualStart ?? one.start, actualFinish: one.actualFinish ?? one.finish })),
  )

describe('CR-618 -- the sentences T1 .. T7 are driven by', () => {
  it.each([
    ['T-310 VC-15', () => cellOf('T-310', 'VC-15', '観点'), VC_15_FORMULA],
    ['T-310 VC-15', () => cellOf('T-310', 'VC-15', '観点'), VC_15_SAME_DAY],
    ['T-310 VC-15', () => cellOf('T-310', 'VC-15', '観点'), VC_15_NOT_ND_3],
    ['T-311 VS-4', () => cellOf('T-311', 'VS-4', '観点'), VS_4_ACTUALS],
    ['T-313 BD-2', () => cellOf('T-313', 'BD-2', '何をするか'), BD_2_SAME_DAY],
    ['T-313 BD-2', () => cellOf('T-313', 'BD-2', '何をするか'), BD_2_NOT_BELOW_START],
    ['T-313 BD-2', () => cellOf('T-313', 'BD-2', '何をするか'), BD_2_NOT_BELOW_STATUS],
    ['T-313 BD-1', () => cellOf('T-313', 'BD-1', '何をするか'), BD_1_STARTED],
    ['T-314 DQ-2', () => cellOf('T-314', 'DQ-2', '定義'), DQ_2],
    ['T-314 DQ-3', () => cellOf('T-314', 'DQ-3', '定義'), DQ_3],
    ['T-316 DW-1', () => cellOf('T-316', 'DW-1', '紫（表 T-315 の `DG-1`）を付ける行'), DW_1_PURPLE],
    ['T-315 DG-1', () => cellOf('T-315', 'DG-1', '条件'), DG_1_WHEN],
    ['T-315 DG-2', () => cellOf('T-315', 'DG-2', '条件'), DG_2_WHEN],
  ] as const)('%s still says: %s', (_row, read, sentence) => {
    expect(read()).toContain(sentence)
  })

  it.each([FR_131_ONE_EACH, FR_132_WORKING_DAYS])('the requirements still say: %s', (clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })

  it('S-397 is still 1 working day, and T-314 still names the three quantities read here', () => {
    expect(S_397).toBe(1)
    expect(specTable('T-314').rows.map((row) => bare(row.by['英（コード）'] ?? ''))).toEqual([
      'projectedFinish',
      ...QUANTITIES,
    ])
  })
})

describe(`CR-618 T1 -- T-310 VC-15: ${VC_15_SAME_DAY}`, () => {
  const shapes: readonly [string, () => Document][] = [
    [
      'FS: A ends at noon on the 8th, B starts at 13:00 the same day',
      () =>
        plannedOnly([
          { uid: A, start: at(6, 8), finish: at(8, 12) },
          { uid: B, start: at(8, 13), finish: at(10, 17), after: [[A, FS]] },
        ]),
    ],
    [
      'FS: A ends at 17:00 on the 8th, B starts at 08:00 the same day (days compared as days)',
      () =>
        plannedOnly([
          { uid: A, start: at(6, 8), finish: at(8, 17) },
          { uid: B, start: at(8, 8), finish: at(10, 17), after: [[A, FS]] },
        ]),
    ],
    [
      'FS: milestone B sits at the moment A ends',
      () =>
        plannedOnly([
          { uid: A, start: at(6, 8), finish: at(8, 17) },
          { uid: B, start: at(8, 17), finish: at(8, 17), milestone: true, after: [[A, FS]] },
        ]),
    ],
  ]

  it.each(shapes)('%s: no finding at all (FR-131)', (_name, make) => {
    expect(findingRows(diagnose(make()))).toEqual([])
  })

  it.each(shapes)('%s: no Task is DG-1 (T-315)', (_name, make) => {
    expect([...marksOf(diagnose(make())).values()].filter((one) => one === 'DG-1')).toEqual([])
  })
})

describe(`CR-618 T2 -- T-310 VC-15: FS, B starts the day BEFORE A ends`, () => {
  const make = (): Document =>
    plannedOnly([
      { uid: A, start: at(6, 8), finish: at(8, 17) },
      { uid: B, start: at(7, 8), finish: at(10, 17), after: [[A, FS]] },
      { uid: C, start: at(13, 8), finish: at(14, 17), after: [[B, FS]] },
    ])

  it(`${FR_131_ONE_EACH} -- exactly one VC-15, and no other T-310 row`, () => {
    const rows = findingRows(diagnose(make()))
    expect(countOf(rows, 'VC-15')).toBe(1)
    expect(rows.filter((one) => one.startsWith('VC-') && one !== 'VC-15')).toEqual([])
  })

  it(`T-316 DW-1 (${DW_1_PURPLE}) -- the successor B and its downstream C are DG-1`, () => {
    const marks = marksOf(diagnose(make()))
    expect(marks.get(B)).toBe('DG-1')
    expect(marks.get(C)).toBe('DG-1')
  })
})

describe(`CR-618 T3 -- T-310 VC-15: SS, FF and SF on the same day hold`, () => {
  const shapes: readonly [string, () => Document][] = [
    [
      'SS: B starts at 08:00 on the day A starts at 13:00',
      () =>
        plannedOnly([
          { uid: A, start: at(6, 13), finish: at(8, 17) },
          { uid: B, start: at(6, 8), finish: at(8, 17), after: [[A, SS]] },
        ]),
    ],
    [
      'FF: B ends at noon on the day A ends at 17:00',
      () =>
        plannedOnly([
          { uid: A, start: at(6, 8), finish: at(8, 17) },
          { uid: B, start: at(7, 8), finish: at(8, 12), after: [[A, FF]] },
        ]),
    ],
    [
      'SF: B ends at noon on the day A starts at 13:00',
      () =>
        plannedOnly([
          { uid: A, start: at(8, 13), finish: at(10, 17) },
          { uid: B, start: at(6, 8), finish: at(8, 12), after: [[A, SF]] },
        ]),
    ],
  ]

  it.each(shapes)('%s: no finding at all', (_name, make) => {
    expect(findingRows(diagnose(make()))).toEqual([])
  })

  it.each(shapes)('%s: no Task is DG-1', (_name, make) => {
    expect([...marksOf(diagnose(make())).values()].filter((one) => one === 'DG-1')).toEqual([])
  })
})

describe(`CR-618 T4 -- T-310 VC-15: SF, B ends the day BEFORE A starts`, () => {
  const make = (): Document =>
    plannedOnly([
      { uid: A, start: at(8, 8), finish: at(10, 17) },
      { uid: B, start: at(6, 8), finish: at(7, 17), after: [[A, SF]] },
    ])

  it('SF: 後続の `finish` ≥ 先行の `start` ＋ `lag` is broken by one day -- exactly one VC-15', () => {
    expect(countOf(findingRows(diagnose(make())), 'VC-15')).toBe(1)
  })

  it('the successor B is DG-1 (T-315 DG-1, T-316 DW-1)', () => {
    expect(marksOf(diagnose(make())).get(B)).toBe('DG-1')
  })
})

describe(`CR-618 T5 -- T-311 VS-4: ${VS_4_ACTUALS}`, () => {
  const sameDay = (): Document =>
    documentOf(AFTER_ALL, [
      { uid: A, start: at(6, 8), finish: at(8, 12), actualStart: at(6, 8), actualFinish: at(8, 12) },
      {
        uid: B,
        start: at(8, 13),
        finish: at(10, 17),
        actualStart: at(8, 13),
        actualFinish: at(10, 17),
        after: [[A, FS]],
      },
    ])
  const dayBefore = (): Document =>
    documentOf(AFTER_ALL, [
      { uid: A, start: at(6, 8), finish: at(8, 12), actualStart: at(6, 8), actualFinish: at(8, 17) },
      {
        uid: B,
        start: at(8, 13),
        finish: at(10, 17),
        actualStart: at(7, 8),
        actualFinish: at(10, 17),
        after: [[A, FS]],
      },
    ])

  it('the T1 shape on the actual columns: no finding at all', () => {
    expect(findingRows(diagnose(sameDay()))).toEqual([])
  })

  it('the T2 shape on the actual columns: exactly one VS-4, and no T-310 row', () => {
    const rows = findingRows(diagnose(dayBefore()))
    expect(countOf(rows, 'VS-4')).toBe(1)
    expect(rows.filter((one) => one.startsWith('VC-'))).toEqual([])
  })

  it(`T-315 DG-1 is "${DG_1_WHEN}" -- a doubt (T-311) paints no Task DG-1`, () => {
    expect([...marksOf(diagnose(dayBefore())).values()].filter((one) => one === 'DG-1')).toEqual([])
  })
})

const CHAIN: readonly Child[] = [
  { uid: A, start: at(6, 8), finish: at(8, 12) },
  { uid: B, start: at(8, 13), finish: at(10, 12), after: [[A, FS]] },
  { uid: C, start: at(10, 13), finish: at(14, 17), after: [[B, FS]] },
]

describe(`CR-618 T6 -- T-313 BD-2: ${BD_2_SAME_DAY}`, () => {
  const shapes: readonly [string, () => Document][] = [
    ['done on plan, status date after the last finish', () => doneOnPlan(CHAIN)],
    // WHY: with nothing done every projected finish comes from the flow itself (BD-1), so a
    // next-working-day flow would carry one day into B and two into the terminal C.
    ['not started, status date before the first start', () => plannedOnly(CHAIN)],
  ]

  it.each(shapes)('%s: no T-310 finding', (_name, make) => {
    expect(findingRows(diagnose(make())).filter((one) => one.startsWith('VC-'))).toEqual([])
  })

  it.each(shapes)('%s: no Task carries a positive DQ-2, DQ-3 or DQ-4 in the report', (_name, make) => {
    expect(anyPositiveQuantity(diagnose(make()))).toEqual([])
  })

  it.each(shapes)('%s: no Task is DG-1, DG-2 or DG-3', (_name, make) => {
    expect([...marksOf(diagnose(make())).values()].filter((one) => ['DG-1', 'DG-2', 'DG-3'].includes(one))).toEqual([])
  })

  it.each(shapes)('%s: the terminal C is listed with a delay of 0 (T-317 DX-5)', (_name, make) => {
    const delays = terminalDelaysOf(diagnose(make()), C)
    expect(delays).toContain(0)
    expect(delays.filter((one) => one !== 0)).toEqual([])
  })
})

describe(`CR-618 T7 -- T-313 BD-2 / BD-4: the first step of the T6 chain ends 3 working days late`, () => {
  // WHY: A started on time and is not done; the status date is the 13th, 3 working days after
  // A's finish (9th, 10th, 13th), so BD-1 puts A's projected finish on the 13th.
  const make = (): Document =>
    documentOf(at(13, 17), [
      { ...(CHAIN[0] as Child), actualStart: at(6, 8), percentComplete: 50 },
      CHAIN[1] as Child,
      CHAIN[2] as Child,
    ])

  it('no T-310 finding', () => {
    expect(findingRows(diagnose(make())).filter((one) => one.startsWith('VC-'))).toEqual([])
  })

  it(`T-315 DG-2 (${DG_2_WHEN}) -- A is the bottleneck`, () => {
    expect(marksOf(diagnose(make())).get(A)).toBe('DG-2')
  })

  it(`${DQ_3} -- A: DQ-2 0, DQ-3 3, DQ-4 3 (T-317 DX-4)`, () => {
    const found = quantitiesOf(diagnose(make()), A)
    expect(found.length).toBeGreaterThan(0)
    const entry = found[0] as Loose
    expect(entry['inheritedDelayDays']).toBe(0)
    expect(entry['selfDelayDays']).toBe(3)
    expect(entry['pushOutDays']).toBe(3)
  })

  it('B and C generate nothing: neither is DG-2, and neither has a DQ-3 above 0', () => {
    const report = diagnose(make())
    const marks = marksOf(report)
    expect(marks.get(B)).not.toBe('DG-2')
    expect(marks.get(C)).not.toBe('DG-2')
    for (const uid of [B, C]) {
      for (const entry of quantitiesOf(report, uid)) expect(entry['selfDelayDays']).toBe(0)
    }
  })

  it(`${DQ_2} -- the downstream carries 3, not 3 plus a day per link: terminal C is 3 late (DX-5)`, () => {
    expect(terminalDelaysOf(diagnose(make()), C)).toContain(3)
  })

  it('where the report lists B or C with T-314 quantities, their DQ-2 is 3', () => {
    const report = diagnose(make())
    for (const uid of [B, C]) {
      for (const entry of quantitiesOf(report, uid)) expect(entry['inheritedDelayDays']).toBe(3)
    }
  })
})
