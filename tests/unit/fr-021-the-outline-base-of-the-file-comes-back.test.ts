// 「⛔⛔ **段の起点は、取り込んだファイルのものを保つこと（MUST）**（利用者の裁定
// 2026-09-06）」 -- the sentence CR-359 put into `FR-021`'s STATEMENT.
//
// The unit driven is the MSPDI codec of CP-11 `document-codec` (table T-062),
// through the two signatures it publishes: `documentFromMspdi(text, current)`
// and `mspdiFromDocument(document)`. FR-021 is a statement about those two
// composed -- 「1 つの MSPDI を取り込み、合流させずに、編集せずに書き出したとき」
// -- so a case is one text in, one text out, and nothing in between.
//
// ---------------------------------------------------------------------------
// WHERE TABLE T-218 PUTS THIS FILE
// ---------------------------------------------------------------------------
// `TS-6`, tests/unit/ -- the inside of one unit, decided by values alone
// (vitest.config.ts lists the three Vitest places). ⚠️ Chapter 6.1 does hold an
// `SWS-6` (MSPDI の正規化) and tests/system/mspdi-normalization.sws.test.ts is
// its case; ⛔ that node is about the NORMALIZATION used to compare, which
// FR-021 explicitly hands to Chapter 6.1 and away from itself: 「どの正規化を
// 用いるかは Chapter 6.1 が持つ —— 本要求が課すのは、比べる前に双方へ同じ正規化を
// 当てることだけである」. What is measured here is not a normalization but four
// named columns per Task, so it is not that node's case.
//
// ---------------------------------------------------------------------------
// ⛔ THE EXCHANGE SAMPLES ARE NOT AVAILABLE, AND THAT IS WHY THE XML IS HERE
// ---------------------------------------------------------------------------
// The measurement FR-021 quotes was taken on files under `sample-schedule/`,
// which is gitignored and therefore absent from a worktree. ⇒ Every text below
// is BUILT HERE, out of the columns the specification names, in the two shapes
// FR-021 itself describes:
//
//   「MS Project は `OutlineLevel` 0 の行を**ちょうど 1 つ**書き（`UID` 0・`ID` 0・
//    `OutlineNumber` 0、名前はプロジェクト名）、ProjectLibre は **1 つも書かない**
//    （`UID` は 1 から）」
//
// ⛔ NO FIGURE IS COPIED FROM A SAMPLE FILE. The counts FR-021 prints (100 /
// 283 / 548) are records of what a real file did and are not asserted here;
// what is asserted is the RELATION the rule states -- what went in comes back.
//
// ---------------------------------------------------------------------------
// ⛔ WRITTEN FROM docs/spec, AND WHAT WAS READ OF `src/` IS NAMED HERE
// ---------------------------------------------------------------------------
// (docs/development-rules/04-verification.md section 1: 読んでよいのは冒頭の
// 宣言・公開する型・署名まで.)
//
// Exported declarations read, and nothing else:
//   mspdi-codec.ts   `MSPDI_NAMESPACE`, `MspdiDecoding`, `MspdiEncoding`, and
//                    the two signatures `documentFromMspdi(text, current)` and
//                    `mspdiFromDocument(document)`
//   document.ts      `Document`
//
// ---------------------------------------------------------------------------
// THE ROWS THESE CASES REST ON
// ---------------------------------------------------------------------------
//   FR-021  its STATEMENT: 「1 つの MSPDI を取り込み、合流させずに、編集せずに
//           書き出したとき、`GRS` は、XML 正規化して比べたときに元のファイルと
//           同じものを出すこと。⛔⛔ 段の起点は、取り込んだファイルのものを保つ
//           こと（MUST）」, and 「⭐ 起点は 表 T-058 の `Project.outlineBase` が
//           持ち、既定は 1 とする —— `GRS` が自分で作った文書は 1 から書き、
//           ProjectLibre と同じ形になる」.
//   T-058 AT-139  `Project.outlineBase`, 出自 `Consume`, 既定 `1` -- the one
//           place the base is held.
//   T-059 DV-4 `Task/ID` / DV-5 `Task/OutlineLevel` / DV-6 `Task/OutlineNumber`
//           / DV-7 `Task/Summary` -- the four columns FR-021 names as the ones
//           that shift for every Task when the base is rounded to 1, and the
//           four this file therefore compares.
//   T-024 IO-1  MSPDI XML, 取込 / 書出, 往復無損失（`FR-021`）.
//
// ---------------------------------------------------------------------------
// WHAT IS DELIBERATELY NOT ASSERTED
// ---------------------------------------------------------------------------
//   - Byte equality. FR-021 forbids it in as many words: 「バイト列をそのまま
//     突き合わせて合否としてはならない（MUST NOT）」.
//   - The `ActualDuration` fraction. FR-021 says it does not come back
//     (「本規則では往復しない」), so no case here asks it to.
//   - What happens when a person adds a second root to a base-0 document.
//     FR-021 states the hole and states that no warning is raised; asserting
//     the two `OutlineLevel` 0 rows would be this file inventing the answer to
//     「相手が読めるかは確かめていない」.
//   - Everything else FR-021's round trip covers. The clause this file is for
//     is the 段の起点 one, and tests/unit/uf-36.test.ts already drives the
//     carry-and-write-back half.

/* eslint-disable @typescript-eslint/no-explicit-any */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  documentFromMspdi,
  mspdiFromDocument,
  MSPDI_NAMESPACE,
} from '../../src/adapter/document-codec/mspdi-codec'
import type { Document } from '../../src/entity/document-model/document/document'
import { specTable, unbroken } from '../contract/spec-table'

// ===========================================================================
// 1. The sentence, read out of the manuscript rather than believed
// ===========================================================================

const REQUIREMENTS = unbroken(readFileSync(
  join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
  'utf8',
))

const FR_021 = ((): string => {
  const at = REQUIREMENTS.indexOf('**UID**: FR-021')
  if (at < 0) throw new Error('FR-021 is not in 01-04-requirements.md')
  const end = REQUIREMENTS.indexOf('**ORIGIN**', at)
  return REQUIREMENTS.slice(at, end < 0 ? at + 4000 : end)
})()

/**
 * ⚠️ A Japanese literal in code. Rule 03 section 5 keeps code English and ASCII
 * and admits 日本語そのものを扱う処理 as the exception -- this string IS the
 * clause, and matching it against the manuscript is what makes the cases below
 * cases about the specification.
 */
const THE_CLAUSE = '⛔ **段の起点は、取り込んだファイルのものを保つこと（MUST）**'

const WHERE_THE_BASE_LIVES = '起点は 表 T-058 の `Project.outlineBase` が持ち、既定は 1 とする'

const T_058 = specTable('T-058')
const T_059 = specTable('T-059')

const columnRow = (entity: string, name: string) => {
  const found = T_058.rows.find(
    (row) => row.cells[0] === `\`${entity}\`` && row.cells[1] === `\`${name}\``,
  )
  if (found === undefined) throw new Error(`table T-058 has no row for ${entity}.${name}`)
  return found
}

const derivedRow = (id: string) => {
  const found = T_059.rows.find((row) => row.id === id)
  if (found === undefined) throw new Error(`table T-059 has no row ${id}`)
  return found
}

// ===========================================================================
// 2. Reading the four columns back out of an MSPDI text
// ===========================================================================

/**
 * The `<Task>` blocks of a text, each as a map from element name to its text.
 *
 * ⚠️ A reader, not a parser. FR-021 forbids comparing bytes, and what these
 * cases compare is four NAMED elements per Task keyed on `UID`, so nothing here
 * needs to know the schema's child order or its namespaces -- a difference in
 * either is precisely what FR-021 says must not decide the verdict.
 */
function tasksOf(text: string): ReadonlyMap<string, Readonly<Record<string, string>>> {
  const tasks = new Map<string, Record<string, string>>()
  const blocks = text.match(/<Task>[\s\S]*?<\/Task>/g) ?? []
  for (const block of blocks) {
    const fields: Record<string, string> = {}
    for (const found of block.matchAll(/<([A-Za-z]+)>([^<]*)<\/\1>/g)) {
      const name = found[1]
      const value = found[2]
      if (name === undefined || value === undefined) continue
      if (!(name in fields)) fields[name] = value
    }
    const uid = fields['UID']
    if (uid !== undefined) tasks.set(uid, fields)
  }
  return tasks
}

/** DV-4 to DV-7 -- the four the clause names, read off one Task. */
const FOUR_COLUMNS = ['ID', 'OutlineLevel', 'OutlineNumber', 'Summary'] as const

const fourOf = (fields: Readonly<Record<string, string>>): Record<string, string | undefined> =>
  Object.fromEntries(FOUR_COLUMNS.map((name) => [name, fields[name]]))

// ===========================================================================
// 3. The two file shapes FR-021 describes
// ===========================================================================

const WEEK_DAYS = [1, 2, 3, 4, 5, 6, 7]
  .map(
    (dayType) =>
      `<WeekDay><DayType>${dayType}</DayType><DayWorking>${
        dayType === 1 || dayType === 7 ? 0 : 1
      }</DayWorking></WeekDay>`,
  )
  .join('')

const CALENDAR_XML = `  <Calendars>
    <Calendar>
      <UID>1</UID>
      <Name>Standard</Name>
      <IsBaseCalendar>1</IsBaseCalendar>
      <BaseCalendarUID>-1</BaseCalendarUID>
      <WeekDays>${WEEK_DAYS}</WeekDays>
    </Calendar>
  </Calendars>`

interface Row {
  readonly uid: number
  readonly id: number
  readonly name: string
  readonly level: number
  readonly outlineNumber: string
  readonly summary: 0 | 1
  readonly start: string
  readonly finish: string
}

const taskXml = (row: Row): string =>
  `    <Task>
      <UID>${row.uid}</UID>
      <ID>${row.id}</ID>
      <Name>${row.name}</Name>
      <OutlineNumber>${row.outlineNumber}</OutlineNumber>
      <OutlineLevel>${row.level}</OutlineLevel>
      <Start>${row.start}</Start>
      <Finish>${row.finish}</Finish>
      <Milestone>0</Milestone>
      <Summary>${row.summary}</Summary>
    </Task>`

const fileOf = (rows: readonly Row[]): string =>
  `<?xml version="1.0" encoding="UTF-8"?>
<Project xmlns="${MSPDI_NAMESPACE}">
  <Name>Base fixture</Name>
  <CalendarUID>1</CalendarUID>
${CALENDAR_XML}
  <Tasks>
${rows.map(taskXml).join('\n')}
  </Tasks>
</Project>
`

/**
 * ProjectLibre's shape: no `OutlineLevel` 0 row at all, `UID` from 1.
 * ⭐ This is the REGRESSION target CR-359 names -- 「ここが退行の的である」.
 */
const BASE_ONE_ROWS: readonly Row[] = [
  {
    uid: 1,
    id: 1,
    name: 'Alpha',
    level: 1,
    outlineNumber: '1',
    summary: 1,
    start: '2026-04-06T08:00:00',
    finish: '2026-04-24T17:00:00',
  },
  {
    uid: 2,
    id: 2,
    name: 'Beta',
    level: 2,
    outlineNumber: '1.1',
    summary: 0,
    start: '2026-04-06T08:00:00',
    finish: '2026-04-10T17:00:00',
  },
  {
    uid: 3,
    id: 3,
    name: 'Gamma',
    level: 2,
    outlineNumber: '1.2',
    summary: 0,
    start: '2026-04-13T08:00:00',
    finish: '2026-04-24T17:00:00',
  },
]

/**
 * MS Project's shape: the SAME three rows, with exactly one `OutlineLevel` 0
 * row added above them -- `UID` 0 / `ID` 0 / `OutlineNumber` 0, named for the
 * project, which is the four values FR-021 lists.
 *
 * ⭐⭐ THE THREE ROWS DO NOT MOVE, AND THAT IS THE POINT. Both tools write a
 * top-level task at `OutlineLevel` 1; what MS Project adds is a row ABOVE them
 * at 0. So the base is not a relabelling of the tasks -- it is whether the file
 * counts from 0 or from 1, and 「起点を 1 に丸めると、0 から始まるファイルの木が
 * 1 段つぶれ」 is what happens when that extra row is forced to share depth 1
 * with the rows under it.
 */
const BASE_ZERO_ROWS: readonly Row[] = [
  {
    uid: 0,
    id: 0,
    name: 'Base fixture',
    level: 0,
    outlineNumber: '0',
    summary: 1,
    start: '2026-04-06T08:00:00',
    finish: '2026-04-24T17:00:00',
  },
  ...BASE_ONE_ROWS,
]

// ===========================================================================
// 4. One round trip
// ===========================================================================

const TEMPLATE = JSON.parse(
  readFileSync(
    join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'),
    'utf8',
  ),
) as Document

/** What `documentFromMspdi` is given for everything MSPDI does not carry. */
const current = (): Document => structuredClone(TEMPLATE)

function imported(text: string): Document {
  const reading = documentFromMspdi(text, current())
  if (!reading.ok) {
    throw new Error(
      `the fixture is not a readable MSPDI: ${reading.faults
        .map((fault) => `${fault.at} ${fault.what}`)
        .join('; ')}`,
    )
  }
  return reading.document
}

/** 取り込み → 無編集 → 書き出し, which is the whole of FR-021's premise. */
const roundTripped = (text: string): string => mspdiFromDocument(imported(text)).text

const baseOf = (document: Document): unknown =>
  (document as any).schedule.project.outlineBase as unknown

// ===========================================================================
// 5. The premises every case below stands on
// ===========================================================================

describe('FR-021 -- the manuscript this file is driven by', () => {
  it('still carries the ruling of 2026-09-06 about the outline base', () => {
    expect(FR_021).toContain(THE_CLAUSE)
    expect(FR_021).toContain('（利用者の裁定 2026-09-06）')
  })

  it('still puts the base in one place, with 1 for its default', () => {
    expect(FR_021).toContain(WHERE_THE_BASE_LIVES)
    const row = columnRow('Project', 'outlineBase')
    expect(row.id).toBe('AT-139')
    expect(row.cells.join(' ')).toContain('Consume')
    expect(row.cells.join(' ')).toContain('`1`')
  })

  it('still names the four columns that shift when the base is rounded', () => {
    expect(FR_021).toContain(
      '`Task/ID`・`Task/OutlineLevel`・`Task/OutlineNumber`・`Task/Summary` の 4 列が全タスクでずれる',
    )
    expect(derivedRow('DV-4').cells.join(' ')).toContain('`Task/ID`')
    expect(derivedRow('DV-5').cells.join(' ')).toContain('`Task/OutlineLevel`')
    expect(derivedRow('DV-6').cells.join(' ')).toContain('`Task/OutlineNumber`')
    expect(derivedRow('DV-7').cells.join(' ')).toContain('`Task/Summary`')
  })

  it('drives two fixtures that really are the two shapes FR-021 describes', () => {
    // ⭐ The premise of every case below. If the fixtures were the same shape,
    // both round trips could pass while the base was thrown away.
    const zeros = (rows: readonly Row[]) => rows.filter((row) => row.level === 0).length
    expect(zeros(BASE_ONE_ROWS), 'ProjectLibre writes none').toBe(0)
    expect(zeros(BASE_ZERO_ROWS), 'MS Project writes exactly one').toBe(1)
    expect(Math.min(...BASE_ONE_ROWS.map((row) => row.uid))).toBe(1)
    expect(BASE_ZERO_ROWS[0]?.uid).toBe(0)
    expect(BASE_ZERO_ROWS[0]?.id).toBe(0)
    expect(BASE_ZERO_ROWS[0]?.outlineNumber).toBe('0')
    // The three tasks themselves are the same in both files, so the only thing
    // the two round trips can disagree about is the base.
    expect(BASE_ZERO_ROWS.slice(1)).toEqual(BASE_ONE_ROWS)
  })
})

// ===========================================================================
// 6. 「段の起点は、取り込んだファイルのものを保つこと（MUST）」
// ===========================================================================

describe('FR-021 (MUST) -- the outline base of the file that came in is kept', () => {
  it('remembers 1 for a file whose shallowest row is at 1', () => {
    expect(baseOf(imported(fileOf(BASE_ONE_ROWS)))).toBe(1)
  })

  it('remembers 0 for a file that carries an OutlineLevel 0 row', () => {
    expect(baseOf(imported(fileOf(BASE_ZERO_ROWS)))).toBe(0)
  })

  it('brings a base-1 file back unchanged in the four columns -- the regression target', () => {
    const before = tasksOf(fileOf(BASE_ONE_ROWS))
    const after = tasksOf(roundTripped(fileOf(BASE_ONE_ROWS)))
    expect([...after.keys()].sort()).toEqual([...before.keys()].sort())
    for (const [uid, fields] of before) {
      expect(fourOf(after.get(uid) ?? {}), `Task UID ${uid}`).toEqual(fourOf(fields))
    }
  })

  it('brings a base-0 file back unchanged in the four columns', () => {
    // ⭐⭐ THE CASE THE RULING WAS MADE FOR. Rounding the base to 1 collapses one
    // level of the tree and shifts all four columns for every Task -- 「起点を 1
    // に丸めると、0 から始まるファイルの木が 1 段つぶれ」.
    const before = tasksOf(fileOf(BASE_ZERO_ROWS))
    const after = tasksOf(roundTripped(fileOf(BASE_ZERO_ROWS)))
    expect([...after.keys()].sort()).toEqual([...before.keys()].sort())
    for (const [uid, fields] of before) {
      expect(fourOf(after.get(uid) ?? {}), `Task UID ${uid}`).toEqual(fourOf(fields))
    }
  })

  it('is not a vacuous case: rounding the base to 1 does shift the four columns', () => {
    // ⭐⭐ THE GUARD. A round trip that agreed for a reason other than the base
    // would pass the two cases above whatever the base held, so this one does to
    // the imported document exactly what FR-021 says must not be done -- 「起点を
    // 1 に丸める」 -- and requires the damage the sentence predicts: 「0 から
    // 始まるファイルの木が 1 段つぶれ、`Task/ID`・`Task/OutlineLevel`・
    // `Task/OutlineNumber`・`Task/Summary` の 4 列が全タスクでずれる」.
    // ⛔ Not an assertion about any component: the rounding is done HERE, on a
    // value this file wrote into a document it owns.
    const honest = imported(fileOf(BASE_ZERO_ROWS))
    const rounded = structuredClone(honest) as any
    rounded.schedule.project.outlineBase = 1

    const before = tasksOf(fileOf(BASE_ZERO_ROWS))
    const damaged = tasksOf(mspdiFromDocument(rounded as Document).text)
    const differing = [...before.keys()].filter(
      (uid) =>
        JSON.stringify(fourOf(damaged.get(uid) ?? {})) !==
        JSON.stringify(fourOf(before.get(uid) ?? {})),
    )
    expect(
      differing.length,
      'rounding the base changed nothing, so the two cases above prove nothing',
    ).toBeGreaterThan(0)
  })

  it('keeps the base itself across the round trip, not only the first read', () => {
    for (const rows of [BASE_ONE_ROWS, BASE_ZERO_ROWS]) {
      const once = imported(fileOf(rows))
      const twice = imported(mspdiFromDocument(once).text)
      expect(baseOf(twice), 'the base changed on the second pass').toBe(baseOf(once))
    }
  })

  it('writes from 1 for a document GRS made itself, which is the default', () => {
    // 「既定は 1 とする —— `GRS` が自分で作った文書は 1 から書き、ProjectLibre と
    // 同じ形になる」. BT-4 of table T-034 is such a document: it was never
    // imported from anywhere.
    expect(baseOf(TEMPLATE)).toBe(1)
    const levels = [...tasksOf(mspdiFromDocument(current()).text).values()]
      .map((fields) => Number(fields['OutlineLevel']))
      .filter((level) => Number.isFinite(level))
    expect(levels.length, 'the shipped template writes at least one Task').toBeGreaterThan(0)
    expect(Math.min(...levels)).toBe(1)
  })
})
