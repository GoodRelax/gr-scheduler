// CR-649: CM-39 stamps exception-day times, DV-8 counts the finish day, the Open Chooser takes its new words.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { documentFromMspdi, mspdiFromDocument } from '../../src/adapter/document-codec/document-codec'
import type { Document } from '../../src/entity/document-model/document/document'
import type { Exception } from '../../src/entity/document-model/schedule/schedule'
import { editDocument, type SettingsLimits } from '../../src/use-case/edit-document/edit-document'
import { specTable } from '../contract/spec-table'
import {
  DAY_END,
  DAY_START,
  ERD_DETAIL,
  REQUIREMENTS,
  S_482,
  S_483,
  april,
  asDocument,
  documentObject,
  elementTexts,
  mspdiTask,
  mspdiText,
  taskElementOf,
  taskOf,
  taskRow,
  timeOf,
} from './cr-646-stage'

const LIMITS: SettingsLimits = { zoomMin: 0.02, zoomMax: 64, taskGroupAreaWidthWithoutPanels: 982 }
const A_MOMENT = '2026-10-04T09:00:00'

// see FR-057, CM-39
const FR_057_STAMPS =
  '例外日の `fromDate` ／ `toDate` は、`CM-39`（`_assets/tbl-glossary.md` の 表 T-108）を受けて文書へ書く側が、足した行と日の動いた列だけを `WT-6` ／ `WT-7` の時刻で書くこと（MUST）。'
const FR_057_KEEPS =
  '元の行（同じ `ordinal`、`_assets/fig-erd-detail.md` の `AT-77`）と日で比べて同じ列は、元の行の字面を保つこと（MUST、`WT-10`）。'
const CM_39_POINTS = '例外日の `fromDate` ／ `toDate` の時刻は、本命令を受けて文書へ書く側が揃える'
// see DV-8, T-059
const DV_8_COUNTS =
  '`start` の日から `finish` の日までを、両端の日を含めて数えた文書の暦の稼働日の数 × `Project.minutesPerDay`（空のときは 表 T-209 の `S-128`）。マイルストーン（`Task.milestone` が真）は `PT0H0M0S`。'
const DV_8_EXAMPLE = '水曜の `08:00:00` に始まり木曜の `17:00:00` に終わるタスクを `PT16H0M0S`（2 稼働日）と書く'
// see EX-12, T-033
const EX_12_REBUILDS = '日付を編集したタスクでは、`Duration` を `DV-8` のとおり作り直すこと（MUST）。'
const EX_12_GRS_MADE = '`GRS` が作ったタスクにも `Duration` を `DV-8` のとおり書くこと（MUST）。'

// WHY: April 2026 starts on a Wednesday, so the 6th is a Monday; the template calendar works Monday to Friday
// and holds no exception in April 2026, and the template leaves minutesPerDay empty (S-128 answers).
const MONDAY = 6
const WEDNESDAY = 8
const THURSDAY = 9
const FRIDAY = 10
const NEXT_MONDAY = 13

/** @purity pure */
function cellsOf(table: string, id: string): string {
  const row = specTable(table).rows.find((one) => one.id === id)
  if (row === undefined) throw new Error(`premise: table ${table} has no row ${id}`)
  return row.cells.join(' | ').replace(/<br\s*\/?>/gi, '')
}

/** @purity pure */
function exceptionRow(part: Partial<Exception> & { ordinal: number }): Exception {
  return {
    name: `x${part.ordinal}`,
    fromDate: april(20),
    toDate: april(20),
    dayWorking: false,
    recurrenceKind: 9,
    carry: {},
    carryElements: [],
    ...part,
  }
}

// WHY: an imported row whose times are none of WT-6 / WT-7, so a kept spelling and a stamped one differ.
const IMPORTED_TASK_GROUP = exceptionRow({
  ordinal: 0,
  name: 'imported',
  fromDate: '2026-05-04T08:00:00',
  toDate: '2026-05-05T17:00:00',
})

/** @purity pure */
function documentHolding(exceptions: readonly Exception[]): Document {
  const object = documentObject()
  object['schedule']['calendars'][0]['exceptions'] = exceptions
  return object as unknown as Document
}

/** @purity pure */
function exceptionsAfter(document: Document, exceptions: readonly Exception[]): readonly Exception[] {
  const result = editDocument(document, { kind: 'setCalendar', exceptions }, LIMITS, 'Row')
  if (!result.ok) throw new Error(`premise: CM-39 was refused: ${JSON.stringify(result.refusals)}`)
  const calendar = result.document.schedule.calendars[0]
  if (calendar === undefined) throw new Error('premise: the document lost its calendar')
  return calendar.exceptions
}

/** @purity pure */
function writtenDuration(task: Record<string, unknown>, project: Record<string, unknown> = {}): string[] {
  const document = asDocument({ tasks: [task], project })
  return elementTexts(taskElementOf(mspdiFromDocument(document, A_MOMENT).text, 1), 'Duration')
}

describe('CR-649 the manuscript as these cases read it', () => {
  it('FR-057 / CM-39 (T-108): the writer stamps added rows and moved columns, and keeps a same-day column', () => {
    expect(REQUIREMENTS).toContain(FR_057_STAMPS)
    expect(REQUIREMENTS).toContain(FR_057_KEEPS)
    expect(cellsOf('T-108', 'CM-39')).toContain(CM_39_POINTS)
  })

  it('DV-8 (T-059): Duration counts both end days, and a milestone is PT0H0M0S', () => {
    expect(ERD_DETAIL).toContain(DV_8_COUNTS)
    expect(ERD_DETAIL).toContain(DV_8_EXAMPLE)
  })

  it('EX-12 (T-033): an edited task and a GRS-made task both write Duration by DV-8', () => {
    const cells = cellsOf('T-033', 'EX-12')
    expect(cells).toContain(EX_12_REBUILDS)
    expect(cells).toContain(EX_12_GRS_MADE)
  })

  it('WT-6 / WT-7 (T-350): the whole-day range runs from 00:00:00 to 23:59:00', () => {
    expect(cellsOf('T-350', 'WT-6')).toContain(`\`${DAY_START}\``)
    expect(cellsOf('T-350', 'WT-7')).toContain(`\`${DAY_END}\``)
    expect(REQUIREMENTS).toContain('**表 T-350 — `GRS` が書く日時の時刻**')
  })
})

describe('CM-39 / WT-6 / WT-7: the calendar edit stamps the times of the exception days it writes', () => {
  it('CM-39 + WT-6 / WT-7: an added row gets 00:00:00 on fromDate and 23:59:00 on toDate', () => {
    const added = exceptionRow({ ordinal: 1, fromDate: april(20, '09:30:00'), toDate: april(21) })
    const [, written] = exceptionsAfter(documentHolding([IMPORTED_TASK_GROUP]), [IMPORTED_TASK_GROUP, added])
    expect(written?.fromDate).toBe(april(20, DAY_START))
    expect(written?.toDate).toBe(april(21, DAY_END))
  })

  it('CM-39 + WT-6 / WT-7: a row carried by a date only (no time) is written with both times', () => {
    const added = exceptionRow({ ordinal: 1, fromDate: '2026-04-20', toDate: '2026-04-22' })
    const [, written] = exceptionsAfter(documentHolding([]), [IMPORTED_TASK_GROUP, added])
    expect([written?.fromDate, written?.toDate]).toEqual([april(20, DAY_START), april(22, DAY_END)])
  })

  it('CM-39 + WT-7: a moved toDate is re-stamped at 23:59:00', () => {
    const moved = { ...IMPORTED_TASK_GROUP, toDate: '2026-05-07T00:00:00' }
    const [written] = exceptionsAfter(documentHolding([IMPORTED_TASK_GROUP]), [moved])
    expect(written?.toDate).toBe(`2026-05-07T${DAY_END}`)
  })

  it('CM-39 + WT-10: the fromDate of that row did not move by day, so it keeps its imported T08:00:00', () => {
    const moved = { ...IMPORTED_TASK_GROUP, fromDate: '2026-05-04T00:00:00', toDate: '2026-05-07T00:00:00' }
    const [written] = exceptionsAfter(documentHolding([IMPORTED_TASK_GROUP]), [moved])
    expect(written?.fromDate).toBe(IMPORTED_TASK_GROUP.fromDate)
  })

  it('CM-39 + WT-10: a row unchanged by day keeps both imported spellings while another row is added', () => {
    const added = exceptionRow({ ordinal: 1 })
    const [kept] = exceptionsAfter(documentHolding([IMPORTED_TASK_GROUP]), [IMPORTED_TASK_GROUP, added])
    expect([timeOf(kept?.fromDate), timeOf(kept?.toDate)]).toEqual(['08:00:00', '17:00:00'])
  })

  it('CM-39 + WT-6: a row whose ordinal is new is an added row even when an old row held the same day', () => {
    const renumbered = { ...IMPORTED_TASK_GROUP, ordinal: 7 }
    const [written] = exceptionsAfter(documentHolding([IMPORTED_TASK_GROUP]), [renumbered])
    expect(timeOf(written?.fromDate)).toBe(DAY_START)
  })

  it('control -- CM-39: a list equal by day to the held one changes nothing (the same document comes back)', () => {
    const document = documentHolding([IMPORTED_TASK_GROUP])
    const sameDays = { ...IMPORTED_TASK_GROUP, fromDate: '2026-05-04T00:00:00', toDate: '2026-05-05T23:59:00' }
    const result = editDocument(document, { kind: 'setCalendar', exceptions: [sameDays] }, LIMITS, 'Row')
    if (!result.ok) throw new Error('premise: CM-39 was refused')
    expect(result.document).toBe(document)
  })
})

describe('DV-8 / EX-12: Task/Duration counts the finish day', () => {
  it('DV-8: a task on one day, 08:00:00 to 17:00:00, writes PT8H0M0S (one working day of S-128 minutes)', () => {
    const task = taskRow(1, { start: april(MONDAY, S_482), finish: april(MONDAY, S_483) })
    expect(writtenDuration(task)).toEqual(['PT8H0M0S'])
  })

  it('DV-8: Monday to Friday writes PT40H0M0S', () => {
    const task = taskRow(1, { start: april(MONDAY, S_482), finish: april(FRIDAY, S_483) })
    expect(writtenDuration(task)).toEqual(['PT40H0M0S'])
  })

  it("DV-8: the partner's own example -- Wednesday to Thursday writes PT16H0M0S", () => {
    const task = taskRow(1, { start: april(WEDNESDAY, S_482), finish: april(THURSDAY, S_483) })
    expect(writtenDuration(task)).toEqual(['PT16H0M0S'])
  })

  it('DV-8: Friday to Monday counts two working days; the weekend between is not worked', () => {
    const task = taskRow(1, { start: april(FRIDAY, S_482), finish: april(NEXT_MONDAY, S_483) })
    expect(writtenDuration(task)).toEqual(['PT16H0M0S'])
  })

  it('DV-8: a milestone writes PT0H0M0S', () => {
    const task = taskRow(1, { start: april(MONDAY, S_482), finish: april(MONDAY, S_482), milestone: true })
    expect(writtenDuration(task)).toEqual(['PT0H0M0S'])
  })

  it('DV-8 + S-128: Project.minutesPerDay scales the count (420 minutes x 2 days = PT14H0M0S)', () => {
    const task = taskRow(1, { start: april(WEDNESDAY, S_482), finish: april(THURSDAY, S_483) })
    expect(writtenDuration(task, { minutesPerDay: 420 })).toEqual(['PT14H0M0S'])
  })

  it('EX-12 + DV-8: a date-edited imported task carries Duration and ManualDuration counted with the finish day', () => {
    const read = documentFromMspdi(
      mspdiText({
        tasks: mspdiTask(
          1,
          '2026-04-06T08:00:00',
          '2026-04-10T17:00:00',
          '<Manual>1</Manual><ManualStart>2026-04-06T08:00:00</ManualStart><ManualFinish>2026-04-10T17:00:00</ManualFinish><ManualDuration>PT40H0M0S</ManualDuration>',
        ),
      }),
      asDocument(),
    )
    if (!read.ok) throw new Error('premise: the MSPDI was refused')
    // WHY: Tuesday the 7th to Tuesday the 14th holds six working days; the half-open count would say five.
    const result = editDocument(
      read.document,
      { kind: 'setTaskPlanDates', uid: 1, start: april(7, S_482), finish: april(14, S_483) },
      LIMITS,
      'Row',
    )
    if (!result.ok) throw new Error('premise: the date edit was refused')
    const carry = taskOf(result.document, 1).carry
    expect([carry['Duration'], carry['ManualDuration']]).toEqual(['PT48H0M0S', 'PT48H0M0S'])
  })
})

describe('JDG-1164 / JDG-1223: the Open Chooser (U-56) heading and the three descriptions (IC-71 to IC-73)', () => {
  const MANUSCRIPT = JSON.parse(
    readFileSync(join(process.cwd(), 'docs', 'spec', '_source', 'display-words.json'), 'utf8'),
  ) as Record<string, any>
  const SHIPPED = JSON.parse(
    readFileSync(join(process.cwd(), 'src', 'adapter', 'screen-renderer', 'display-words.json'), 'utf8'),
  ) as Record<string, any>

  /** @purity pure */
  function headingOf(words: Record<string, any>): unknown {
    const surface = (words['surfaces'] as Record<string, any>[]).find((one) => one['name'] === 'Open Chooser')
    return surface?.['heading']
  }

  /** @purity pure */
  function hintOf(words: Record<string, any>, rowId: string): unknown {
    const entry = Object.values(words)
      .filter((one): one is Record<string, any>[] => Array.isArray(one))
      .flat()
      .find((one) => one?.['rowId'] === rowId && one?.['hint'] !== undefined)
    return entry?.['hint']
  }

  it('U-56: the heading is ja 「ファイルを開く」 / en "Open File"', () => {
    expect(headingOf(MANUSCRIPT)).toEqual({ ja: 'ファイルを開く', en: 'Open File' })
  })

  it('IC-71 / IC-72 / IC-73: the descriptions are the three sentences of JDG-1164', () => {
    expect([hintOf(MANUSCRIPT, 'IC-71'), hintOf(MANUSCRIPT, 'IC-72'), hintOf(MANUSCRIPT, 'IC-73')].map((one) => (one as { ja: string }).ja)).toEqual([
      '開くファイルで現在の文書を置き換える',
      '開くファイルの内容を現在の文書に追加する',
      '開くファイルの内容を変更前の予定として重ねる',
    ])
  })

  it('FR-038: the shipped dictionary carries the same heading and descriptions as the manuscript', () => {
    expect(headingOf(SHIPPED)).toEqual(headingOf(MANUSCRIPT))
    for (const rowId of ['IC-71', 'IC-72', 'IC-73']) expect(hintOf(SHIPPED, rowId)).toEqual(hintOf(MANUSCRIPT, rowId))
  })
})
