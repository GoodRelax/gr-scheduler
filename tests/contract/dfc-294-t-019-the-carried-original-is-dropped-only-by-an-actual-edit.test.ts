// Contract tests: an imported ActualDuration is written back as carried until a person edits the task's actuals.

import { readRepoFile } from '../spec-files'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  documentFromMspdi,
  mspdiFromDocument,
  MSPDI_NAMESPACE,
} from '../../src/adapter/document-codec/mspdi-codec'
import type { Document } from '../../src/entity/document-model/document/document'
import { MINUTES_PER_CALENDAR_DAY } from '../../src/entity/document-model/schedule/schedule'
import { editTask, type TaskCommand } from '../../src/use-case/edit-document/edit-task'
import { bare, specTable, type SpecTable, unbroken } from './spec-table'

const LAST_SAVED_AT = '2026-10-03T09:00:00'

const DEFAULT_TASK_GROUP_NAME_FIXTURE = 'fixture default task group name'

const REQUIREMENTS = unbroken(readRepoFile(
  join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'),
  'utf8',
))

// Why: the quote ends at its (MUST) marker, the window check 39 looks for, and stops at the paragraph
// break, since a string cannot hold the manuscript's line break without changing its bytes.
const T_019_CARRY_NOTE =
  '取り込んだ `ActualDuration` の原値があり、人が `Task` の実績を編集していない間、`GRS` は、作った値によらず、原値をそのまま書き戻すこと（Carry —— 表 T-005 の `G-13`）。'

const T_019_ONLY_WHEN_EDITED = '人が `Task` の実績を編集したとき、`GRS` は、`ActualDuration` を作った値へ置き換えること。'

const T_108: SpecTable = specTable('T-108')
const T_059: SpecTable = specTable('T-059')

function commandNameOf(specTableRowId: string): string {
  const found = T_108.rows.find((one) => one.id === specTableRowId)
  if (found === undefined) throw new Error(`table T-108 has no row ${specTableRowId}`)
  const name = bare(found.by['確定名'] ?? '')
  if (name === '') throw new Error(`table T-108 row ${specTableRowId} names no 確定名`)
  return name
}

function meaningOf(specTableRowId: string): string {
  const found = T_108.rows.find((one) => one.id === specTableRowId)
  if (found === undefined) throw new Error(`table T-108 has no row ${specTableRowId}`)
  return found.cells.join(' ')
}

const ACTUAL_EDITS = ['CM-13', 'CM-14', 'CM-15'] as const
const PLAN_EDITS = ['CM-9', 'CM-11'] as const

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

const CARRIED_ACTUAL_DURATION = 'PT37H0M0S'

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
      <ActualDuration>${CARRIED_ACTUAL_DURATION}</ActualDuration>
      <Stop>2026-04-10T17:00:00</Stop>
      <Resume>2026-05-11T08:00:00</Resume>
      <ResumeValid>1</ResumeValid>
    </Task>`

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
      <ActualDuration>${CARRIED_ACTUAL_DURATION}</ActualDuration>
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

// Why: only CM-14 runs on the unstarted task, because FR-043 refuses it once the actual has begun;
// every other command runs on the suspended task, where both candidate answers are a real day.
const fileFor = (specTableRowId: string): string => (specTableRowId === 'CM-14' ? UNSTARTED_FILE : SUSPENDED_FILE)

const TEMPLATE = JSON.parse(
  readRepoFile(
    join(process.cwd(), 'src', 'framework', 'single-html-shell', 'startup-template.json'),
    'utf8',
  ),
) as Document

// Summary: current() is the document documentFromMspdi starts from for everything MSPDI does not carry.
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

function exportedActualDuration(document: Document): string | null {
  const { text } = mspdiFromDocument(document, LAST_SAVED_AT)
  const found = /<ActualDuration>([^<]*)<\/ActualDuration>/.exec(text)
  return found === null ? null : (found[1] ?? null)
}

function edited(document: Document, command: TaskCommand): Document {
  const result = editTask(document, command, DEFAULT_TASK_GROUP_NAME_FIXTURE)
  if (!result.ok) {
    throw new Error(
      `the fixture could not take ${command.kind}: ${result.refusals
        .map((one) => `${one.command} ${one.rule} ${one.what}`)
        .join('; ')}`,
    )
  }
  return result.document
}

// Why: the kind is the T-108 cell, so a renamed command reaches this file; the arguments are this
// file's own, because T-108 has no argument column.
function commandFor(specTableRowId: string): TaskCommand {
  const kind = commandNameOf(specTableRowId)
  switch (specTableRowId) {
    case 'CM-13':
      return {
        kind,
        taskUid: TASK_UID,
        place: { state: 'suspendedWithoutResumeDate', actualStart: '2026-04-06', stop: '2026-04-08' },
      } as unknown as TaskCommand
    case 'CM-14':
      return {
        kind,
        taskUid: TASK_UID,
        released: { start: '2026-04-07', finish: '2026-04-07' },
        snapMinutes: MINUTES_PER_CALENDAR_DAY,
      } as unknown as TaskCommand
    case 'CM-15':
      return { kind, taskUid: TASK_UID } as unknown as TaskCommand
    case 'CM-9':
      return { kind, taskUid: TASK_UID, name: 'RenamedAndNothingElse' } as unknown as TaskCommand
    case 'CM-11':
      return {
        kind,
        taskUid: TASK_UID,
        start: '2026-04-13',
        finish: '2026-05-01',
      } as unknown as TaskCommand
    default:
      throw new Error(`this file states no arguments for table T-108 row ${specTableRowId}`)
  }
}

// Spec: T-019, T-059, DV-11, T-108, FR-043
describe('表 T-019 の注 -- the manuscript this file is driven by', () => {
  it('still carries the carry clause, ending at its own （MUST）', () => {
    expect(REQUIREMENTS).toContain(T_019_CARRY_NOTE)
    expect(REQUIREMENTS).toContain(T_019_ONLY_WHEN_EDITED)
  })

  it('表 T-059 DV-11 still makes `Task/ActualDuration` the computed column this file drives', () => {
    const row = T_059.rows.find((one) => one.id === 'DV-11')
    expect(row, 'table T-059 no longer holds DV-11').not.toBeUndefined()
    expect(row?.cells.join(' ')).toContain('Task/ActualDuration')
    expect(row?.cells.join(' ')).toContain('取り込んだ原値をそのまま返す')
  })

  it('表 T-108 still names the three commands that edit the actuals', () => {
    expect(meaningOf('CM-13')).toContain('予実の 5 列を置く')
    expect(meaningOf('CM-14')).toContain('実績を置き始める')
    expect(meaningOf('CM-15')).toContain('予実の状態を、表 T-021a の輪に沿って 1 つ進める')
    // Why: the two controls must not be about the actuals; if either cell came to mention them, the
    // control cases below would stop being controls.
    expect(meaningOf('CM-9')).toContain('名称を変える')
    expect(meaningOf('CM-11')).toContain('予定の開始・終了を置く')
  })

  it('the fixture really does carry an `ActualDuration` no arithmetic on its own dates reaches', () => {
    const untouched = exportedActualDuration(imported())
    expect(untouched, 'the untouched export wrote no ActualDuration at all').not.toBeNull()
    expect(untouched).toContain(CARRIED_ACTUAL_DURATION)
  })

  it('⛔ FR-043 really does refuse CM-14 on a task whose actual has begun', () => {
    // Why: measured rather than assumed, because it is the whole reason CM-14 runs on a second fixture.
    const refused = editTask(imported(SUSPENDED_FILE), commandFor('CM-14'), DEFAULT_TASK_GROUP_NAME_FIXTURE)

    expect(refused.ok, 'CM-14 was accepted on a started task, so this file has a fixture too many').toBe(
      false,
    )
  })
})

// Spec: T-019, T-005, G-13, T-033, EX-2, PA-1
describe('表 T-019 の注 (MUST) -- while nobody edited the actuals, the original is written back', () => {
  // Spec: IMPS-393
  it('an untouched import writes the length the file carried, not the length DV-11 computes', () => {
    expect(exportedActualDuration(imported())).toContain(CARRIED_ACTUAL_DURATION)
  })

  it('⭐⭐ 「作った値によらず」: a PA-1 task, which has no computed length, still writes the original back', () => {
    expect(
      exportedActualDuration(imported(UNSTARTED_FILE)),
      'the computed value decided instead of the carried original -- 表 T-019 の注 says 「作った値に' +
        'よらず原値をそのまま書き戻すこと」',
    ).toContain(CARRIED_ACTUAL_DURATION)
  })

  for (const specTableRowId of PLAN_EDITS) {
    it(`⛔ ${specTableRowId} (${commandNameOf(specTableRowId)}) is not an edit of the actuals, so the original stays`, () => {
      const after = edited(imported(), commandFor(specTableRowId))

      expect(
        exportedActualDuration(after),
        `${specTableRowId} released the carried original -- 表 T-019 の注 releases it 「人がその` +
          `タスクの実績を編集したときに限り」, and this command edits no actual`,
      ).toContain(CARRIED_ACTUAL_DURATION)
    })
  }

  it('⭐ the control: the same fixture DOES release it when the actuals are edited', () => {
    // Why: this case keeps the five above from passing on a build that never releases the original;
    // it is the same fixture and the same reading, and only the command differs.
    const kept = exportedActualDuration(edited(imported(), commandFor('CM-9')))
    const released = exportedActualDuration(edited(imported(), commandFor('CM-13')))

    expect(kept).toContain(CARRIED_ACTUAL_DURATION)
    expect(
      released,
      'the plan-side edit and the actual-side edit wrote the same ActualDuration, so nothing here is measured',
    ).not.toBe(kept)
  })
})

// Spec: T-019, CM-13, CM-14, CM-15
describe('表 T-019 の注 -- an edit of the actuals replaces it with the computed value', () => {
  for (const specTableRowId of ACTUAL_EDITS) {
    // Spec: IMPS-394
    it(`${specTableRowId} (${commandNameOf(specTableRowId)}) stops exporting the value the import carried`, () => {
      const after = edited(imported(fileFor(specTableRowId)), commandFor(specTableRowId))

      expect(
        exportedActualDuration(after) ?? '',
        `${specTableRowId} kept writing the carried original -- 表 T-019 の注 replaces it with 「作った` +
          `値」 once a person has edited that task's actuals`,
      ).not.toContain(CARRIED_ACTUAL_DURATION)
    })
  }

  it('⭐ the control: the reading itself still finds an ActualDuration when one is written', () => {
    const after = edited(imported(), commandFor('CM-13'))

    expect(
      exportedActualDuration(after),
      'DV-11 owes an ActualDuration for a started task after CM-13',
    ).not.toBeNull()
  })
})
