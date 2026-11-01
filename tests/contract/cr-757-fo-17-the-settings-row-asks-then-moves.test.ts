// CR-757 spec-only cases: the FO-17 row of the settings face (WH-1, WH-2, WH-12), QN-15 asked like the Time Shift, one undo, and no question from the Agent API.

import { afterEach, describe, expect, it } from 'vitest'

import { installAgentApi } from '../../src/adapter/agent-api-endpoint/agent-api-endpoint'
import type { DisplayLanguage, PropertyField } from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import { isWholeScheduleShiftWrite } from '../../src/framework/single-html-shell/field-entry'
import {
  FO_17,
  NEW_START,
  REQUIREMENTS,
  TASK_A,
  WORKED,
  documentOf,
  keyOf,
  questionWord,
  restoreAnimationFrames,
  shiftStage,
  shiftTo,
  shiftWord,
  taskIn,
  whRow,
  type Loose,
  type ShiftStage,
} from './cr-757-stage'
import { specTable, unbroken } from './spec-table'

afterEach(restoreAnimationFrames)

const FR_159_PLACE = '全体日程シフトの欄は、`FR-072` の 表 T-369 の `FO-17` の場所に置く。'
// WHY: CR-787 renamed the start date to the first task start (JDG-2540).
const FR_159_SHOWS_START = '欄の上に最初のタスクの開始日（表 T-379 の `WH-1`）を見せること（MUST）'
const FR_159_AGENT = '`Agent API` から `_assets/tbl-document-commands.md` の 表 T-108 の `CM-99` を受けたときは問わない'
const FR_156_ASKS_ONLY = '確認を取るのは、データを大幅に書き換えるタイムシフト（`FR-157`）と全体日程シフト（`FR-159`）だけである（利用者の判断）'
const WH_1_DASH = '⛔ 開始を持つ `Task` が 1 つも無いあいだは、欄の上に「—」を見せ、適用のボタンを押せないものとする（`WH-12`）'
const WH_2_LINE = '欄の上の段（最初のタスクの開始日の次の行）と問いに、辞書の `wholeScheduleShiftField` の `holidayStartLine` の語を出す'
const WH_2_RANGE = '日付の欄は 表 T-214 の範囲の日だけを受ける（外の日と読めない字は欄を元へ戻し 表 T-233 の `RS-87` を告げる'
const WH_12_BUTTON = '新しい開始日の日付の欄の右に、語を辞書の `wholeScheduleShiftField` の `apply` の語とするボタンを置き、押されたら下書きの日で問いを出すこと（MUST）'
const WH_12_DIM = '⭐ 新しい開始日が空のあいだ、開始を持つ `Task` が無いあいだ（`WH-1`）、ずらす稼働日が 0 のあいだ（`WH-9`）は、押せないものとすること（MUST）'
const WH_12_NO_TOOLTIP = 'ツールチップも持たない（利用者の判断）'
const FO_17_ABOVE_FO_16 = '⭐ `FO-16` の上に置く（利用者の指示）'
const FR_159_ONE_UNDO = '取り消しを 1 度押せば全部の日付が元へ戻ること（MUST）'

// see T-369
// WHY: CR-755 -- FO-15 is four rows; the last of them stands right above FO-17.
const FACE_ROW_OF_FO_15 = 'K-145:4'
const FACE_ROW_OF_FO_16 = 'IC-162'
const LINE_BREAK = '\n'
const DASH = '—'
const UNDO = keyOf('SK-6')

describe('FR-159 / FR-156 / T-379 / T-369 -- the manuscript still says what these cases press', () => {
  it.each([FR_159_PLACE, FR_159_SHOWS_START, FR_159_AGENT, FR_156_ASKS_ONLY])('%s', (clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })

  it.each([
    ['WH-1', WH_1_DASH],
    ['WH-2', WH_2_LINE],
    ['WH-2', WH_2_RANGE],
    ['WH-12', WH_12_BUTTON],
    ['WH-12', WH_12_DIM],
    ['WH-12', WH_12_NO_TOOLTIP],
  ])('%s: %s', (row, clause) => {
    expect(whRow(row)).toContain(clause)
  })

  it(`T-369 FO-17: ${FO_17_ABOVE_FO_16}, between FO-15 and FO-16 in the order of the table`, () => {
    const ids = specTable('T-369').rows.map((one) => one.id)
    expect(ids.indexOf('FO-17')).toBe(ids.indexOf('FO-15') + 1)
    expect(ids.indexOf('FO-16')).toBe(ids.indexOf('FO-17') + 1)
    expect(unbroken(specTable('T-369').rows.find((one) => one.id === 'FO-17')?.cells.join(' | ') ?? '')).toContain(FO_17_ABOVE_FO_16)
  })
})

const readoutLinesOf = (field: PropertyField): readonly string[] => (field.readout ?? '').split(LINE_BREAK)
const isDim = (field: PropertyField, index: number): boolean => field.controls[index]?.isDisabled === true

async function settledStage(document: Document, typed: string, language: DisplayLanguage = 'ja'): Promise<ShiftStage> {
  const stage = await shiftStage(document, language)
  await stage.commit('newStartDate', typed)
  return stage
}

describe('FO-17 -- the row on the settings face', () => {
  it.each(['ja', 'en'] as const)('%s: the name, the date field, the unit word, and the Apply button to its right', async (language) => {
    const field = (await shiftStage(WORKED(), language)).shiftField()
    expect(field.name).toBe(shiftWord('name', language))
    expect(field.unit).toBe(shiftWord('newStartUnit', language))
    expect(field.controls).toHaveLength(2)
    expect(field.controls[0]?.kind).toBe('date')
    expect(field.controls[0]?.key).toEqual({ holder: 'wholeScheduleShift', column: 'newStartDate' })
    expect(field.controls[1]?.key).toEqual({ holder: 'wholeScheduleShift', column: 'entry' })
    expect(field.controls[1]?.press, WH_12_BUTTON).toBe(shiftWord('apply', language))
  })

  it.each(['ja', 'en'] as const)(`%s: ${WH_12_NO_TOOLTIP} -- neither control carries a hint`, async (language) => {
    const field = (await settledStage(WORKED(), NEW_START, language)).shiftField()
    expect(field.controls.map((one) => one.hint)).toEqual([undefined, undefined])
  })

  it(`${FO_17_ABOVE_FO_16} -- the row stands after the FO-15 field and before the FO-16 field`, async () => {
    const rows = ((await shiftStage(WORKED())).lastView().propertiesPanel?.fields ?? []).map((one) => one.row)
    expect(rows.indexOf(FO_17)).toBe(rows.indexOf(FACE_ROW_OF_FO_15) + 1)
    expect(rows.indexOf(FACE_ROW_OF_FO_16)).toBe(rows.indexOf(FO_17) + 1)
  })

  it.each(['ja', 'en'] as const)(`%s: ${FR_159_SHOWS_START} -- the first line reads the current start as yyyy/mm/dd (TX-12)`, async (language) => {
    const field = (await shiftStage(WORKED(), language)).shiftField()
    expect(readoutLinesOf(field)[0]).toBe(shiftWord('currentStart', language).replace('{date}', '2028/04/04'))
  })

  it(`${WH_1_DASH}`, async () => {
    const empty = documentOf({ tasks: [{ uid: 1, start: null, finish: null }] })
    const field = (await settledStage(empty, NEW_START)).shiftField()
    expect(readoutLinesOf(field)[0]).toBe(shiftWord('currentStart', 'ja').replace('{date}', DASH))
    expect(isDim(field, 1), 'Apply cannot be pressed').toBe(true)
  })
})

describe(`WH-12 -- ${WH_12_DIM}`, () => {
  it('no date typed: Apply cannot be pressed', async () => {
    expect(isDim((await shiftStage(WORKED())).shiftField(), 1)).toBe(true)
  })

  it('the typed date is the current start, so zero working days move (WH-9): Apply cannot be pressed', async () => {
    expect(isDim((await settledStage(WORKED(), '2028-04-04')).shiftField(), 1)).toBe(true)
  })

  it('a date that moves the schedule: the field holds it and Apply can be pressed', async () => {
    const field = (await settledStage(WORKED(), NEW_START)).shiftField()
    expect(field.controls[0]?.text).toBe(NEW_START)
    expect(isDim(field, 1)).toBe(false)
  })

  it('a dim Apply asks nothing when pressed', async () => {
    const stage = await settledStage(WORKED(), '2028-04-04')
    await stage.commit('entry', '')
    expect(stage.lastView().confirmation).toBeNull()
  })
})

describe(`WH-2 -- ${WH_2_LINE}`, () => {
  it.each(['ja', 'en'] as const)('%s: a typed Sunday shows the holiday line under the current start', async (language) => {
    const field = (await settledStage(WORKED(), '2029-03-04', language)).shiftField()
    expect(readoutLinesOf(field)[1]).toBe(
      shiftWord('holidayStartLine', language).replace('{typed}', '2029/03/04').replace('{start}', '2029/03/02'),
    )
  })

  it('a typed working day shows no holiday line', async () => {
    const field = (await settledStage(WORKED(), NEW_START)).shiftField()
    expect(readoutLinesOf(field).filter((line) => line !== '')).toHaveLength(1)
  })
})

describe(`WH-2 -- ${WH_2_RANGE}`, () => {
  it.each([
    ['a day after 2149-12-31', '2150-01-01'],
    ['a day before 1984-01-01', '1983-12-31'],
    ['a text that is not a date', 'next spring'],
  ])('%s (%s): RS-87 is told and the field holds nothing', async (_what, typed) => {
    const stage = await settledStage(WORKED(), typed)
    const reasons = (stage.lastView().notices as unknown as readonly Loose[]).flatMap((one) =>
      (one['raisedNotices'] as readonly Loose[]).map((raised) => raised['reason']),
    )
    expect(reasons).toContain('RS-87')
    expect(stage.shiftField().controls[0]?.text).toBe('')
    expect(isDim(stage.shiftField(), 1)).toBe(true)
  })
})

describe('FR-159 / QN-15 -- Apply asks like the Time Shift, and only "proceed" writes', () => {
  it('settling the date asks nothing', async () => {
    expect((await settledStage(WORKED(), NEW_START)).lastView().confirmation).toBeNull()
  })

  it.each(['ja', 'en'] as const)('%s: Apply raises QN-15 in the manner NT-7, with its text and the WH-11 lines', async (language) => {
    const stage = await settledStage(WORKED(), NEW_START, language)
    await stage.commit('entry', '')
    const asked = stage.lastView().confirmation
    expect(asked?.question).toBe('QN-15')
    expect(asked?.manner).toBe('NT-7')
    expect(asked?.text).toBe(questionWord('QN-15', language))
    expect(asked?.items[0]?.name).toBe(shiftWord('startLine', language).replace('{before}', '2028/04/04').replace('{after}', '2029/03/05'))
    expect(stage.loop.document(), 'nothing is written before the answer').toEqual(WORKED())
  })

  it('cancel writes nothing and keeps the typed date', async () => {
    const stage = await settledStage(WORKED(), NEW_START)
    await stage.commit('entry', '')
    await stage.answer('cancel')
    expect(stage.lastView().confirmation).toBeNull()
    expect(taskIn(stage.loop.document(), TASK_A)['start']).toBe('2028-04-04T08:00:00')
    expect(stage.shiftField().controls[0]?.text).toBe(NEW_START)
  })

  it('proceed moves the schedule, empties the field (the write landed), and the row reads the new start', async () => {
    const stage = await settledStage(WORKED(), NEW_START)
    await stage.commit('entry', '')
    await stage.answer('proceed')
    expect(stage.lastView().confirmation).toBeNull()
    expect(taskIn(stage.loop.document(), TASK_A)['start']).toBe('2029-03-05T08:00:00')
    expect(taskIn(stage.loop.document(), TASK_A)['finish']).toBe('2029-03-08T17:00:00')
    expect(stage.loop.document().schedule.calendars).toEqual(WORKED().schedule.calendars)
    const field = stage.shiftField()
    expect(field.controls[0]?.text).toBe('')
    expect(readoutLinesOf(field)[0]).toBe(shiftWord('currentStart', 'ja').replace('{date}', '2029/03/05'))
  })

  it('UN-13: one Undo (SK-6) brings every date of the schedule back, and S-518 / S-519 with it', async () => {
    const stage = await moved()
    await stage.press(UNDO)
    expect(stage.loop.document().schedule).toEqual(WORKED().schedule)
    const settings = stage.loop.document().documentSettings
    expect([settings.fitSpanStart, settings.fitSpanFinish]).toEqual([WORKED().documentSettings.fitSpanStart, WORKED().documentSettings.fitSpanFinish])
  })

  // WHY: DFC-2761 -- FR-159 brings every date back with one undo and WH-7 moves S-77; the shell keeps the moved scrollDate (UN-8 keeps scrolling out of undo).
  it.fails(`UN-13 / FR-159: ${FR_159_ONE_UNDO} -- S-77 scrollDate is back too`, async () => {
    const stage = await moved()
    expect(stage.loop.document().documentSettings.scrollDate, 'premise: CM-99 moved S-77').toBe('2029-03-09T00:00:00')
    await stage.press(UNDO)
    expect(stage.loop.document().documentSettings.scrollDate).toBe(WORKED().documentSettings.scrollDate)
  })
})

async function moved(): Promise<ShiftStage> {
  const stage = await settledStage(WORKED(), NEW_START)
  await stage.commit('entry', '')
  await stage.answer('proceed')
  return stage
}

describe(`FR-159 -- ${FR_159_AGENT}`, () => {
  it('CM-99 from the Agent API is accepted with no question standing', async () => {
    const stage = await shiftStage(WORKED())
    const api = installAgentApi({ ...stage.loop.agentApiSeams(), writerName: 'cr-757-tester', schemaVersion: '1' } as never)
    const outcome = api.applyCommands({ expectedStamp: api.readStamp(), commands: [{ kind: 'shiftScheduleToStartDate', newStartDate: NEW_START }] as never })
    await stage.press({ kind: 'pointer', phase: 'move', button: 'left', x: 1, y: 1, modifiers: { ctrl: false, shift: false, alt: false, meta: false }, clickCount: 1 } as never)
    expect(outcome.ok).toBe(true)
    expect(stage.lastView().confirmation).toBeNull()
    expect(taskIn(stage.loop.document(), TASK_A)['start']).toBe('2029-03-05T08:00:00')
  })

  it('the shell knows a CM-99 write when it lands (wholeScheduleShiftLanded follows it)', () => {
    expect(isWholeScheduleShiftWrite([[shiftTo(NEW_START)]])).toBe(true)
    expect(isWholeScheduleShiftWrite([[{ kind: 'shiftScheduleTimes', minutes: 60 } as never]])).toBe(false)
    expect(isWholeScheduleShiftWrite([])).toBe(false)
  })
})
