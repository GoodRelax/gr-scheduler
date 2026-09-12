// 表 T-019's closing note (MUST) -- what a Task exports in its LAST column while
// nobody has edited its actuals, and what it exports once somebody has.
//
// ---------------------------------------------------------------------------
// THE CLAUSE, QUOTED VERBATIM (docs/spec/01-04-requirements.md:1937)
// ---------------------------------------------------------------------------
//
//   ⚠️ **最終列は算出して書くときの値である。取り込んだ原値があり、そのタスクの
//   実績を人が編集していないあいだは、最終列によらず原値をそのまま書き戻すこと
//   （MUST）** —— Carry である（表 T-005 の `G-13`）。算出値が原値と 1 日でも違うと、
//   **編集していないタスクの値を書き換える**ことになり（表 T-033 の `EX-2`）、
//   未編集の往復も壊れる（`FR-021`）。**人がそのタスクの実績を編集したときに限り、
//   最終列の値へ置き換える** —— `FR-012` の完了率と同じ規則である。
//
// ⚠️ THE LEDGER ROW THAT ASKED FOR THIS FILE NAMED THE WRONG PLACE, and the body
// that repaired it said so in as many words: D-294's 仕様の場所 column read 「表
// T-016 と `FR-072`」, and neither of those settles this. The clause above is the
// note UNDER 表 T-019, and it is the one quoted here.
//
// ---------------------------------------------------------------------------
// WHERE 表 T-218 PUTS THIS FILE
// ---------------------------------------------------------------------------
// `TS-6`, tests/unit/ -- 「単体テスト | 持たない | —— | Unit | `tests/unit/` |
// Vitest」. ⛔ NOT tests/integration/: `TS-2` takes 「`SWS-xxx`」 for a parent and
// Chapter 9 holds no `SW_SPEC_TEST` for the carry note, and this body owns
// tests/ only -- it may not write a node into docs/spec to give itself one.
// ⭐ The precedent is beside it: tests/unit/fr-021-the-outline-base-of-the-file-
// comes-back.test.ts drives the same two codec signatures from tests/unit/ and
// says at length why the one MSPDI node in Chapter 6.1 is not its node either.
//
// ---------------------------------------------------------------------------
// ⛔ WRITTEN FROM docs/spec, AND WHAT WAS READ OF `src/` IS NAMED HERE
// ---------------------------------------------------------------------------
// (docs/development-rules/04-verification.md section 1: only the head, the
// published types and the signatures.)
//
//   mspdi-codec.ts    `MSPDI_NAMESPACE`, `MspdiDecoding`, `MspdiEncoding`, and
//                     the two signatures `documentFromMspdi(text, current)` and
//                     `mspdiFromDocument(document)`
//   edit-task.ts      the signature `editTask(document, command)`, the
//                     `TaskCommand` union and `PlanActualPlacement`
//   edit-document.ts  `EditResult`
//   document.ts       `Document`
// ⛔ NO FUNCTION BODY WAS READ. In particular nothing was read of how a carried
// original is kept or dropped; every expectation below is the clause's.
//
// ---------------------------------------------------------------------------
// THE ROWS THESE CASES REST ON
// ---------------------------------------------------------------------------
//   表 T-019      its last column, 「`Stop`（書き出し）」: `PA-3` 中断・再開予定
//                 あり and `PA-4` 中断・再開日未定 both 「**書く**」; `PA-1`
//                 `PA-2` `PA-5` 「書かない」.
//   表 T-019 の注  the clause quoted above -- the whole of this file.
//   表 T-059 DV-9 「`Task` | `stop` | `Task/Stop` | `actualStart` ＋
//                 `actualDuration`。**中断のときだけ書く**」 -- WHAT the computed
//                 value is, which is what a dropped original falls back to.
//   表 T-005 G-13 「Carry | 取り込んだ MSPDI の項目を、そのまま持ち回って書き戻す
//                 仕組み。対象は……**算出で置き換えうるが原値を保つ項目**（`Stop`）
//                 である。後者の規則は表 T-019 の注記が持つ」 -- the mechanism the
//                 clause names, and the reason `Stop` is the column driven here.
//   表 T-108      the three commands that EDIT THE ACTUALS, read at run time
//                 rather than typed: `CM-13` `setTaskPlanActualState`（予実の 5
//                 列を置く）, `CM-14` `beginTaskActual`（実績を置き始める）,
//                 `CM-15` `cycleTaskPlanActualState`（予実の状態を巡らせる）.
//                 ⭐ The controls are `CM-9` `setTaskName`（名称を変える）and
//                 `CM-11` `setTaskPlanDates`（予定の開始・終了を置く）, which the
//                 clause's 「そのタスクの実績を人が編集した」 does not reach.
//   表 T-033 EX-2 the reason the clause gives: 「編集していないタスクの値を書き
//                 換える」ことになる.
//
// ---------------------------------------------------------------------------
// ⭐ EVERY CASE HAS A CONTROL THAT MUST MOVE
// ---------------------------------------------------------------------------
// A build that never dropped the original would pass every "keeps it" case and
// fail every "drops it" one; a build that always dropped it would do the
// reverse. ⛔ Neither half is asserted alone anywhere below -- the plan-side
// edits run against the same fixture, in the same case, so a file that went
// green by writing the computed value everywhere is caught by the control.
//
// ---------------------------------------------------------------------------
// ⚠️ WHAT IS DELIBERATELY NOT ASSERTED
// ---------------------------------------------------------------------------
//   1. WHICH DAY THE COMPUTED `Stop` LANDS ON. `DV-9` states the arithmetic and
//      tests/unit/uf-36.test.ts owns the MSPDI shapes; what the clause rules on
//      is WHICH of the two values is written, so these cases ask only that the
//      written one is (or is not) the carried original.
//   2. THE OTHER CARRIED ITEMS. `G-13` names two kinds and the clause governs
//      only 「算出で置き換えうるが原値を保つ項目」, whose one member it names:
//      `Stop`.
//   3. WHAT `FR-012`'s 完了率 does. The clause says it follows the same rule;
//      that requirement has its own cases.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  documentFromMspdi,
  mspdiFromDocument,
  MSPDI_NAMESPACE,
} from '../../src/adapter/document-codec/mspdi-codec'
import type { Document } from '../../src/entity/document-model/document/document'
import { editTask, type TaskCommand } from '../../src/use-case/edit-document/edit-task'
import { bare, specTable, type SpecTable, unbroken } from '../contract/spec-table'

/* eslint-disable @typescript-eslint/no-explicit-any */

// ===========================================================================
// 1. The clause, read out of the manuscript rather than believed
// ===========================================================================

const REQUIREMENTS = unbroken(readFileSync(
  join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
  'utf8',
))

/**
 * ⚠️ A Japanese literal in code. Rule 03 section 5 keeps code English and ASCII
 * and admits 日本語そのものを扱う処理 as the exception -- this string IS the
 * clause, and matching it against the manuscript is what makes the cases below
 * cases about the specification rather than about this file's opinion.
 *
 * ⭐ IT ENDS AT THE MARKER'S OWN CLOSING PARENTHESIS. Check 39 takes the trailing
 * window that ENDS at `（MUST）` and looks for it under tests/; a quote that began
 * at the sentence and stopped before the marker would hold nothing at all.
 * ⚠️ AND IT STOPS SHORT OF THE PARAGRAPH BREAK. The 120- and 90-character
 * windows of this marker both reach back across a blank line into the sentence
 * about `PS-2`, and a source file cannot carry a raw line break inside a quoted
 * string without changing its bytes -- so the longest window that is one
 * unbroken run of manuscript is the one written here.
 */
const T_019_CARRY_NOTE =
  '取り込んだ原値があり、そのタスクの実績を人が編集していないあいだは、最終列によらず原値をそのまま書き戻すこと（MUST）'

/** The other half of the same note -- when the computed value DOES take over. */
const T_019_ONLY_WHEN_EDITED = '人がそのタスクの実績を編集したときに限り、最終列の値へ置き換える'

// ===========================================================================
// 2. Which commands edit the actuals, read out of 表 T-108
// ===========================================================================

const T_108: SpecTable = specTable('T-108')
const T_059: SpecTable = specTable('T-059')

/** The `命令` column of one row of 表 T-108, without its backticks. */
function commandNameOf(rowId: string): string {
  const found = T_108.rows.find((one) => one.id === rowId)
  if (found === undefined) throw new Error(`table T-108 has no row ${rowId}`)
  const name = bare(found.by['確定名'] ?? '')
  if (name === '') throw new Error(`table T-108 row ${rowId} names no 確定名`)
  return name
}

/** The whole of one row of 表 T-108, for reading its 説明 back. */
function meaningOf(rowId: string): string {
  const found = T_108.rows.find((one) => one.id === rowId)
  if (found === undefined) throw new Error(`table T-108 has no row ${rowId}`)
  return found.cells.join(' ')
}

/** `CM-13` / `CM-14` / `CM-15` -- the three the clause's 「実績を人が編集した」 means. */
const ACTUAL_EDITS = ['CM-13', 'CM-14', 'CM-15'] as const
/** `CM-9` / `CM-11` -- edits that are NOT of the actuals, and must not release it. */
const PLAN_EDITS = ['CM-9', 'CM-11'] as const

// ===========================================================================
// 3. One MSPDI whose `Stop` cannot have been computed
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

const TASK_UID = 1

/**
 * ⭐⭐ THE CARRIED VALUE IS A DAY THE ARITHMETIC CANNOT REACH, and that is the
 * whole of the fixture's design. `DV-9` computes 「`actualStart` ＋
 * `actualDuration`」 -- one week from 2026-04-06 -- so a file that carries
 * 2026-09-30 states a `Stop` no computation of these columns produces. ⇒ the two
 * candidate answers can never be confused, and a case that reads back the
 * carried day is reading a value that was PRESERVED and not one that happened to
 * agree.
 *
 * ⚠️ 30 September is a Wednesday in 2026 and 6 April a Monday, so neither day is
 * one a working-day rule would shift; the fixture states no exception days.
 */
const CARRIED_STOP_DAY = '2026-09-30'
const CARRIED_STOP = `${CARRIED_STOP_DAY}T17:00:00`

/**
 * A task 表 T-019 puts in `PA-3` 中断・再開予定あり: an actual has begun
 * (`actualStart` あり / `actualDuration` あり), it has not finished
 * (`actualFinish` 空) and a resume day stands (`resume` 日付 / `resumeValid`
 * `true`). ⭐ That is one of the two rows whose last column says 「**書く**」, so
 * the export has a `Stop` to write either way and the cases below compare two
 * values rather than a value against an absence.
 */
const SUSPENDED_TASK_XML = `    <Task>
      <UID>${TASK_UID}</UID>
      <ID>1</ID>
      <Name>Carried</Name>
      <OutlineNumber>1</OutlineNumber>
      <OutlineLevel>1</OutlineLevel>
      <Start>2026-04-06T08:00:00</Start>
      <Finish>2026-04-24T17:00:00</Finish>
      <Milestone>0</Milestone>
      <Summary>0</Summary>
      <ActualStart>2026-04-06T08:00:00</ActualStart>
      <ActualDuration>PT40H0M0S</ActualDuration>
      <Stop>${CARRIED_STOP}</Stop>
      <Resume>2026-05-11T08:00:00</Resume>
      <ResumeValid>1</ResumeValid>
    </Task>`

/**
 * ⭐⭐ THE SAME CARRIED `Stop` ON A TASK 表 T-019 SAYS NOT TO WRITE ONE FOR.
 * `PA-1` 未着手 -- no `ActualStart`, no `ActualDuration` -- and its last column
 * reads 「書かない」, yet the file carries a `Stop`. ⇒ this fixture is what makes
 * 「**最終列によらず**原値をそのまま書き戻すこと」 measurable: a build that
 * consulted the last column first would write nothing here, and one that honours
 * the clause writes the carried day back even though the computed answer is
 * "none at all".
 *
 * ⛔ IT IS ALSO THE ONLY FIXTURE `CM-14` CAN REACH. `FR-043` puts the grab-holds
 * on a task 「`Task` が未着手であるあいだ」, so `beginTaskActual` is refused on a
 * task whose actual has already begun -- measured here, not assumed: the
 * suspended fixture above answers 「CM-14 FR-043 the task has already been
 * started」.
 */
const UNSTARTED_TASK_XML = `    <Task>
      <UID>${TASK_UID}</UID>
      <ID>1</ID>
      <Name>Carried</Name>
      <OutlineNumber>1</OutlineNumber>
      <OutlineLevel>1</OutlineLevel>
      <Start>2026-04-06T08:00:00</Start>
      <Finish>2026-04-24T17:00:00</Finish>
      <Milestone>0</Milestone>
      <Summary>0</Summary>
      <Stop>${CARRIED_STOP}</Stop>
    </Task>`

const fileOf = (taskXml: string): string => `<?xml version="1.0" encoding="UTF-8"?>
<Project xmlns="${MSPDI_NAMESPACE}">
  <Name>Carry fixture</Name>
  <CalendarUID>1</CalendarUID>
${CALENDAR_XML}
  <Tasks>
${taskXml}
  </Tasks>
</Project>
`

const SUSPENDED_FILE = fileOf(SUSPENDED_TASK_XML)
const UNSTARTED_FILE = fileOf(UNSTARTED_TASK_XML)

/**
 * Which fixture each row of 表 T-108 is driven against.
 *
 * ⚠️ ONLY `CM-14` DIFFERS, and the reason is `FR-043`'s own 「`Task` が未着手で
 * あるあいだ」 rather than anything about the carry rule. Every other command
 * runs on the suspended task, where both candidate answers are a real day.
 */
const fileFor = (rowId: string): string => (rowId === 'CM-14' ? UNSTARTED_FILE : SUSPENDED_FILE)

const TEMPLATE = JSON.parse(
  readFileSync(
    join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'),
    'utf8',
  ),
) as Document

/** What `documentFromMspdi` is given for everything MSPDI does not carry. */
const current = (): Document => structuredClone(TEMPLATE)

function imported(file: string = SUSPENDED_FILE): Document {
  const reading = documentFromMspdi(file, current())
  if (!reading.ok) {
    throw new Error(
      `the fixture is not a readable MSPDI: ${reading.faults
        .map((fault) => `${fault.at} ${fault.what}`)
        .join('; ')}`,
    )
  }
  return reading.document
}

/** The `<Stop>` the writer put on the one task, or `null` where it wrote none. */
function exportedStop(document: Document): string | null {
  const { text } = mspdiFromDocument(document)
  const found = /<Stop>([^<]*)<\/Stop>/.exec(text)
  return found === null ? null : (found[1] ?? null)
}

/** Run one command through `editTask`, refusing to go on if the aggregate refused. */
function edited(document: Document, command: TaskCommand): Document {
  const result = editTask(document, command)
  if (!result.ok) {
    throw new Error(
      `the fixture could not take ${command.kind}: ${result.refusals
        .map((one) => `${one.command} ${one.rule} ${one.what}`)
        .join('; ')}`,
    )
  }
  return result.document
}

/**
 * The command one row of 表 T-108 names, built for this fixture's one task.
 *
 * ⚠️ THE `kind` IS THE TABLE'S OWN `確定名` CELL and not a literal, so a row whose
 * command is renamed reaches this file instead of going stale. The arguments are
 * this file's, because 表 T-108 carries no argument column.
 */
function commandFor(rowId: string): TaskCommand {
  const kind = commandNameOf(rowId)
  switch (rowId) {
    // CM-13 -- 「予実の 5 列を置く」. `PA-4` 中断・再開日未定 keeps the task on a
    // row whose last column still says 「**書く**」, so the export writes a
    // `Stop` either way and the comparison stays between two values.
    case 'CM-13':
      return {
        kind,
        uid: TASK_UID,
        place: { row: 'PA-4', actualStart: '2026-04-06', actualDuration: 5 },
      } as unknown as TaskCommand
    // CM-14 -- 「実績を置き始める」, FR-043's 掴みシロを離した日.
    case 'CM-14':
      return { kind, uid: TASK_UID, droppedDay: '2026-04-07' } as unknown as TaskCommand
    // CM-15 -- 「予実の状態を巡らせる」.
    case 'CM-15':
      return { kind, uid: TASK_UID } as unknown as TaskCommand
    // CM-9 -- 「名称を変える」.
    case 'CM-9':
      return { kind, uid: TASK_UID, name: 'RenamedAndNothingElse' } as unknown as TaskCommand
    // CM-11 -- 「予定の開始・終了を置く」.
    case 'CM-11':
      return {
        kind,
        uid: TASK_UID,
        start: '2026-04-13',
        finish: '2026-05-01',
      } as unknown as TaskCommand
    default:
      throw new Error(`this file states no arguments for table T-108 row ${rowId}`)
  }
}

// ===========================================================================
// 4. The premises every case below stands on
// ===========================================================================

describe('表 T-019 の注 -- the manuscript this file is driven by', () => {
  it('still carries the carry clause, ending at its own （MUST）', () => {
    expect(REQUIREMENTS).toContain(T_019_CARRY_NOTE)
    expect(REQUIREMENTS).toContain(T_019_ONLY_WHEN_EDITED)
  })

  it('表 T-059 DV-9 still makes `Task/Stop` the computed column this file drives', () => {
    const row = T_059.rows.find((one) => one.id === 'DV-9')
    expect(row, 'table T-059 no longer holds DV-9').not.toBeUndefined()
    expect(row?.cells.join(' ')).toContain('Task/Stop')
    expect(row?.cells.join(' ')).toContain('中断のときだけ書く')
  })

  it('表 T-108 still names the three commands that edit the actuals', () => {
    expect(meaningOf('CM-13')).toContain('予実の 5 列を置く')
    expect(meaningOf('CM-14')).toContain('実績を置き始める')
    expect(meaningOf('CM-15')).toContain('予実の状態を巡らせる')
    // ⛔ AND THE TWO CONTROLS ARE NOT ABOUT THE ACTUALS. If either of these
    // cells ever came to mention 実績 the control below would stop being one.
    expect(meaningOf('CM-9')).toContain('名称を変える')
    expect(meaningOf('CM-11')).toContain('予定の開始・終了を置く')
  })

  it('the fixture really does carry a `Stop` no arithmetic on its own columns reaches', () => {
    // ⛔ THE GUARD THAT MAKES EVERY CASE BELOW MEAN SOMETHING. If the imported
    // day and the computed day ever agreed, "kept" and "dropped" would read
    // alike and this whole file would pass on a broken build.
    const untouched = exportedStop(imported())
    expect(untouched, 'the untouched export wrote no Stop at all').not.toBeNull()
    expect(untouched).toContain(CARRIED_STOP_DAY)
  })

  it('⛔ FR-043 really does refuse CM-14 on a task whose actual has begun', () => {
    // ⚠️ MEASURED RATHER THAN ASSUMED, because it is the whole reason CM-14 is
    // driven against a second fixture: 「`Task` が未着手であるあいだ、`GRS` は、
    // 実績の入力を始める掴みシロを**2 つ**……示すこと（MUST）」.
    const refused = editTask(imported(SUSPENDED_FILE), commandFor('CM-14'))

    expect(refused.ok, 'CM-14 was accepted on a started task, so this file has a fixture too many').toBe(
      false,
    )
  })
})

// ===========================================================================
// 5. 「取り込んだ原値があり、そのタスクの実績を人が編集していないあいだは、
//     最終列によらず原値をそのまま書き戻すこと（MUST）」
// ===========================================================================

describe('表 T-019 の注 (MUST) -- while nobody edited the actuals, the original is written back', () => {
  it('an untouched import writes the day the file carried, not the day DV-9 computes', () => {
    expect(exportedStop(imported())).toContain(CARRIED_STOP_DAY)
  })

  it('⭐⭐ 「最終列によらず」: a PA-1 task, whose last column says 書かない, still writes the original back', () => {
    // 表 T-019 gives `PA-1` 未着手 「書かない」 in its last column, and `DV-9`
    // computes nothing for a task that is not suspended. ⇒ the computed answer
    // here is "no Stop at all", and the clause still asks for the carried day.
    expect(
      exportedStop(imported(UNSTARTED_FILE)),
      'the last column decided instead of the carried original -- 表 T-019 の注 says 「最終列に' +
        'よらず原値をそのまま書き戻すこと」',
    ).toContain(CARRIED_STOP_DAY)
  })

  for (const rowId of PLAN_EDITS) {
    it(`⛔ ${rowId} (${commandNameOf(rowId)}) is not an edit of the actuals, so the original stays`, () => {
      const after = edited(imported(), commandFor(rowId))

      expect(
        exportedStop(after),
        `${rowId} released the carried original -- 表 T-019 の注 releases it 「人がその` +
          `タスクの実績を編集したときに限り」, and this command edits no actual`,
      ).toContain(CARRIED_STOP_DAY)
    })
  }

  it('⭐ the control: the same fixture DOES release it when the actuals are edited', () => {
    // ⛔ THIS CASE EXISTS SO THE FIVE ABOVE CANNOT PASS ON A BUILD THAT NEVER
    // RELEASES ANYTHING. It is the same fixture and the same reading; only the
    // command differs.
    const kept = exportedStop(edited(imported(), commandFor('CM-9')))
    const released = exportedStop(edited(imported(), commandFor('CM-13')))

    expect(kept).toContain(CARRIED_STOP_DAY)
    expect(
      released,
      'the plan-side edit and the actual-side edit wrote the same Stop, so nothing here is measured',
    ).not.toBe(kept)
  })
})

// ===========================================================================
// 6. 「人がそのタスクの実績を編集したときに限り、最終列の値へ置き換える」
// ===========================================================================

describe('表 T-019 の注 -- an edit of the actuals replaces it with the computed value', () => {
  for (const rowId of ACTUAL_EDITS) {
    it(`${rowId} (${commandNameOf(rowId)}) stops exporting the value the import carried`, () => {
      const after = edited(imported(fileFor(rowId)), commandFor(rowId))

      expect(
        exportedStop(after) ?? '',
        `${rowId} kept writing the carried original -- 表 T-019 の注 replaces it with 「最終列の` +
          `値」 once a person has edited that task's actuals`,
      ).not.toContain(CARRIED_STOP_DAY)
    })
  }

  it('⭐ the control: the reading itself still finds a Stop when one is written', () => {
    // ⛔ WITHOUT THIS, EVERY CASE ABOVE WOULD PASS ON A WRITER THAT STOPPED
    // WRITING `Stop` FOR ANY REASON AT ALL -- `null` does not contain the day
    // either. `CM-13` puts the task on `PA-4`, whose last column says 「**書く**」,
    // so a Stop is owed.
    const after = edited(imported(), commandFor('CM-13'))

    expect(
      exportedStop(after),
      '表 T-019 gives PA-4 「**書く**」 in its last column, so a Stop is owed after CM-13',
    ).not.toBeNull()
  })
})
