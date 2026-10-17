// CR-766 spec-only tests: the MUST clauses that point at table T-108 follow it to tbl-document-commands.md, and still hold.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import type { Document } from '../../src/entity/document-model/document/document'
import { editDocument, type DocumentCommand } from '../../src/use-case/edit-document/edit-document'
import type { SettingsLimits } from '../../src/use-case/edit-document/edit-document-settings'
import { taskGroupDocument } from '../unit/cr-541-stage'
import { printedCommands } from './cr-766-printed-commands'
import { specTable, unbroken } from './spec-table'

const SPEC = join(process.cwd(), 'docs', 'spec')
const REQUIREMENTS = unbroken(readFileSync(join(SPEC, '01-04-requirements.md'), 'utf8'))

// see FR-019, CM-46
const CM_46_FIVE_NULLS =
  '⭐ 置くとき（`_assets/tbl-document-commands.md` の 表 T-108 の `CM-46`）は 5 列を `null` とすること（MUST）'
// see FR-057, CM-39
const CM_39_WRITER_ALIGNS =
  '例外日の `fromDate` ／ `toDate` は、`CM-39`（`_assets/tbl-document-commands.md` の 表 T-108）を受けて文書へ書く側が、足した行と日の動いた列だけを `WT-6` ／ `WT-7` の時刻で書くこと（MUST）'
// see UF-16
const UF_16_ONLY_UNIT = '例外日の日付の時刻を揃えるのは本ユニットだけである（`_assets/tbl-document-commands.md` の `CM-39`）。'

const FIVE_LOOK_COLUMNS = ['AT-148', 'AT-149', 'AT-150', 'AT-151', 'AT-152']
const FIVE_LOOK_FIELDS = ['strokeColor', 'strokeWidthPx', 'fillColor', 'fillTransparencyPercent', 'textColor'] as const

const GROUP = 'aaaaaaaa-0000-4000-8000-000000000001'
const BOX = 'bbbbbbbb-0000-4000-8000-000000000001'
const LIMITS: SettingsLimits = { zoomMin: 0.02, zoomMax: 64, taskGroupAreaWidthWithoutPanels: 982 }

const { commands } = printedCommands()
const commandOf = (id: string) => commands.find((command) => command.id === id)
const documentWithOneGroup = (): Document => taskGroupDocument([{ id: GROUP, parentId: null }]) as unknown as Document

describe('FR-019 (MUST): a comment box is placed (CM-46) with its five look columns null', () => {
  it('the requirement still says so, pointing at table T-108 in its printed file', () => {
    expect(REQUIREMENTS).toContain(CM_46_FIVE_NULLS)
  })

  it('CM-46 createCommentBox carries no value for any of the five columns -- it has nothing to put there but null', () => {
    const create = commandOf('CM-46')
    expect(create?.name).toBe('createCommentBox')
    const pointers = [...(create?.values ?? []), ...(create?.values.flatMap((value) => value.fields) ?? [])].map((value) => value.pointer)
    for (const column of FIVE_LOOK_COLUMNS) expect(pointers).not.toContain(column)
  })

  it('each of the five columns has its own command in the table, so a value is set only after the box is placed', () => {
    for (const column of FIVE_LOOK_COLUMNS) {
      const setters = commands.filter((command) => command.values.some((value) => value.pointer === column))
      expect(setters.map((command) => command.group), column).toEqual(['`CommentBox`'])
    }
  })

  it('a comment box placed by CM-46 holds null in all five columns', () => {
    const command: DocumentCommand = { kind: 'createCommentBox', commentBoxId: BOX, anchor: { date: '2026-04-08T00:00:00', taskGroupId: GROUP } }
    const result = editDocument(documentWithOneGroup(), command, LIMITS, 'row')
    if (!result.ok) throw new Error(`CM-46 was refused: ${JSON.stringify(result.refusals)}`)
    const placed = result.document.schedule.commentBoxes.find((box) => box.id === BOX)
    expect(placed).toBeDefined()
    for (const field of FIVE_LOOK_FIELDS) expect(placed?.[field], field).toBeNull()
  })
})

describe('FR-057 (MUST): the side that writes CM-39 into the document sets the times of an exception day', () => {
  it('the requirement still says so, pointing at table T-108 in its printed file', () => {
    expect(REQUIREMENTS).toContain(CM_39_WRITER_ALIGNS)
  })

  it('UF-16 says edit-calendar.ts is the one unit that aligns them, pointing at the same file', () => {
    const row = specTable('T-075').rows.find((one) => one.id === 'UF-16')
    expect(unbroken(row?.cells.join(' ') ?? '')).toContain(UF_16_ONLY_UNIT)
  })

  it('CM-39 setCalendar carries the exception days as the Calendar.exceptions column, and says the writer aligns their times', () => {
    const calendar = commandOf('CM-39')
    expect(calendar?.name).toBe('setCalendar')
    const exceptions = calendar?.values.find((value) => value.name === 'exceptions')
    expect([exceptions?.role, exceptions?.writes, exceptions?.pointer]).toEqual(['column', 'Calendar.exceptions', 'AT-71'])
    expect(calendar?.carries).toContain('例外日の `fromDate` ／ `toDate` の時刻は、本命令を受けて文書へ書く側が揃える')
    expect(calendar?.carries).toContain('`FR-057` の 表 T-350')
  })

  it('an exception day added by CM-39 is written from WT-6 00:00:00 to WT-7 23:59:00, whatever times it came with', () => {
    const added = {
      ordinal: 1,
      name: 'cr-766 added day',
      fromDate: '2026-05-01T12:34:00',
      toDate: '2026-05-01T12:34:00',
      dayWorking: false,
      recurrenceKind: null,
      workingTimes: [],
      carry: {},
      carryElements: [],
    }
    const command = { kind: 'setCalendar', exceptions: [added] } as unknown as DocumentCommand
    const result = editDocument(documentWithOneGroup(), command, LIMITS, 'row')
    if (!result.ok) throw new Error(`CM-39 was refused: ${JSON.stringify(result.refusals)}`)
    const written = result.document.schedule.calendars.flatMap((one) => one.exceptions).find((one) => one.name === added.name)
    expect([written?.fromDate, written?.toDate]).toEqual(['2026-05-01T00:00:00', '2026-05-01T23:59:00'])
  })
})
