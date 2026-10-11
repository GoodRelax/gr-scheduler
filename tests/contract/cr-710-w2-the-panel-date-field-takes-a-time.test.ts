// CR-710 wave 2 (spec-only): FR-158 TX-3 -- the properties panel date field is a date-and-time field while the time of day is shown.

import { describe, expect, it } from 'vitest'

import type { PropertyControl } from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import { instantOf } from '../../src/entity/document-model/schedule/schedule'
import { editDocument, type DocumentCommand } from '../../src/use-case/edit-document/edit-document'
import type { SettingsLimits } from '../../src/use-case/edit-document/edit-document-settings'
import { REQUIREMENTS, commandsOf, documentOf, fieldOf, panelOf, recordOf, taskItem, taskOf } from './cr-606-stage'

// see FR-158, TX-3
const TX_3_ROW = '| TX-3 | プロパティパネルの日時の欄（`FR-006` の 表 T-016 の `PR-3` ほか） | 日付の欄 | 日付と時刻の欄 |'
const FR_158_STATEMENT =
  '作成者が文書の設定の面で「時刻を表示する」（`_assets/tbl-settings.md` の 表 T-202 の `S-576`）を切り替えたとき、`GRS` は、日時を見せるすべての所を 表 T-375 の形で見せること。'

describe('the rows these cases are built from still read as quoted', () => {
  it('FR-158 and table T-375 TX-3', () => {
    expect(REQUIREMENTS).toContain(FR_158_STATEMENT)
    expect(REQUIREMENTS).toContain(TX_3_ROW)
  })
})

const TASK = 1
const MILESTONE = 2

const documentWith = (shows: boolean): Document => {
  const base = documentOf({
    tasks: [
      taskOf(TASK, {
        start: '2026-04-08T08:30:00',
        finish: '2026-04-10T17:00:00',
        actualStart: '2026-04-08T09:15:00',
        deadline: '2026-04-20T17:00:00',
      }),
      taskOf(MILESTONE, { milestone: true, start: '2026-04-09T17:00:00', finish: '2026-04-09T17:00:00' }),
    ],
  })
  return { ...base, documentSettings: { ...base.documentSettings, showsTimeOfDay: shows } } as unknown as Document
}

const LIMITS: SettingsLimits = { zoomMin: 0.02, zoomMax: 240, taskGroupAreaWidthWithoutPanels: 982 }

const controlOf = (document: Document, uid: number, row: string): PropertyControl => {
  const field = fieldOf(panelOf(document, taskItem(uid)), row)
  expect(field.controls.length, `${row} draws at least one input`).toBeGreaterThan(0)
  return field.controls[0] as PropertyControl
}

const isDateTime = (control: PropertyControl): boolean => (control as { isDateTime?: unknown }).isDateTime === true

// see T-016
const DATE_ROWS = ['PR-3', 'PR-47', 'PR-4', 'PR-10'] as const

describe('TX-3: the date fields of the panel', () => {
  it.each(DATE_ROWS)('%s is a date field and not a date-and-time field while the time is not shown', (row) => {
    const control = controlOf(documentWith(false), TASK, row)
    expect(control.kind).toBe('date')
    expect(isDateTime(control)).toBe(false)
  })

  it.each(DATE_ROWS)('%s is a date-and-time field while the time is shown', (row) => {
    const control = controlOf(documentWith(true), TASK, row)
    expect(control.kind).toBe('date')
    expect(isDateTime(control)).toBe(true)
  })

  it('the one input of a milestone date (PR-35) is a date-and-time field while the time is shown', () => {
    expect(isDateTime(controlOf(documentWith(true), MILESTONE, 'PR-35'))).toBe(true)
    expect(isDateTime(controlOf(documentWith(false), MILESTONE, 'PR-35'))).toBe(false)
  })

  it('shows the time in the text beside the day while the time is shown, and only the day otherwise', () => {
    const shown = controlOf(documentWith(true), TASK, 'PR-3').text ?? ''
    expect(shown).toContain('2026-04-08')
    expect(shown).toMatch(/0?8:30/)
    const hidden = controlOf(documentWith(false), TASK, 'PR-3').text ?? ''
    expect(hidden).toContain('2026-04-08')
    expect(hidden).not.toMatch(/:/)
  })
})

describe('TX-3, FR-054: a typed yyyy-mm-ddThh:mm writes that instant', () => {
  const commitOn = (document: Document, uid: number, row: string, text: string): readonly DocumentCommand[] => {
    const control = controlOf(document, uid, row)
    return commandsOf(document, { row, key: control.key, text })
  }

  it('PR-3 writes the typed start with its minutes and seconds 00', () => {
    const document = documentWith(true)
    const commands = commitOn(document, TASK, 'PR-3', '2026-04-07T10:30')
    expect(commands.map((one) => recordOf(one)['kind'])).toEqual(['setTaskPlanDates'])
    const command = recordOf(commands[0] as DocumentCommand)
    expect(command['uid']).toBe(TASK)
    expect(instantOf(String(command['start']))).toBe(instantOf('2026-04-07T10:30:00'))
    expect(String(command['start'])).toBe('2026-04-07T10:30:00')
  })

  it('PR-47 writes the typed finish with its minutes', () => {
    const document = documentWith(true)
    const commands = commitOn(document, TASK, 'PR-47', '2026-04-14T12:15')
    const command = recordOf(commands[0] as DocumentCommand)
    expect(String(command['finish'])).toBe('2026-04-14T12:15:00')
  })

  it('the command is accepted and the task then holds that instant', () => {
    const document = documentWith(true)
    const command = commitOn(document, TASK, 'PR-3', '2026-04-07T10:30')[0] as DocumentCommand
    const result = editDocument(document, command, LIMITS, 'row')
    expect(result.ok, JSON.stringify(result)).toBe(true)
    if (!result.ok) return
    const task = result.document.schedule.tasks.find((one) => one.uid === TASK)
    expect(task?.start).toBe('2026-04-07T10:30:00')
  })

  it('the one input of a milestone writes the typed instant to start and to finish', () => {
    const document = documentWith(true)
    const commands = commitOn(document, MILESTONE, 'PR-35', '2026-04-24T15:45')
    expect(commands.map((one) => recordOf(one)['kind'])).toEqual(['setTaskPlanDates'])
    const command = recordOf(commands[0] as DocumentCommand)
    expect(String(command['start'])).toBe('2026-04-24T15:45:00')
    expect(String(command['finish'])).toBe('2026-04-24T15:45:00')
  })
})
