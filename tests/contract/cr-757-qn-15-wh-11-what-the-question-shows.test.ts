// CR-757 spec-only cases: WH-11 the counts QN-15 shows, written in the words of the dictionary and the dates of TX-12.

import { describe, expect, it } from 'vitest'

import {
  wholeScheduleShiftQuestionItems,
  type DisplayLanguage,
  type WholeScheduleShiftPreview,
} from '../../src/adapter/screen-renderer/screen-renderer'
import { wholeScheduleShiftFieldWord } from '../../src/adapter/screen-renderer/notices'
import { wholeScheduleShiftPreviewOf } from '../../src/use-case/edit-document/edit-document'
import { emptyScreenSession, type ScreenSession } from '../../src/use-case/advance-screen-session/advance-screen-session'
import {
  NOTICE_REASONS,
  REQUIREMENTS,
  WORDS,
  documentOf,
  heldOf,
  questionWord,
  shiftTo,
  shiftWord,
  timeZoneWord,
  whRow,
  written,
  type Loose,
} from './cr-757-stage'
import { specTable, unbroken } from './spec-table'

const WH_11_SHOWS =
  'いまの開始日と新しい開始日（`WH-2` で寄せたときはその 1 行も）、ずらす稼働日の数（正負）、書き換える `Task` の件数、前の稼働日へ寄せる日付の件数（`WH-5`）、移した後に開始か終了が稼働時間の外に出る `Task` の件数、例 1 つ（文書の並びで最初に開始を持つ `Task` の名と、前後の日付）'
const TX_12_NO_TIME = '⭐ 時刻を表示していても時刻を添えない —— 全体日程シフトは日の単位で動かす'
const FR_159_ASKS = '表 T-379 の `WH-11` が示すものを示して続けてよいかを問い（表 T-037 の `NT-7`、問いの文は 表 T-234 の `QN-15`）'

const PARTS = ['name', 'apply', 'currentStart', 'newStartUnit', 'startLine', 'workingDaysLine', 'pulledCountLine', 'holidayStartLine'] as const

describe('FR-159 / WH-11 / TX-12 / QN-15 -- the manuscript still says what these cases press', () => {
  it(`WH-11: ${WH_11_SHOWS}`, () => {
    expect(whRow('WH-11')).toContain(WH_11_SHOWS)
  })

  it(`FR-159: ${FR_159_ASKS}`, () => {
    expect(REQUIREMENTS).toContain(FR_159_ASKS)
  })

  it(`TX-12: yyyy/mm/dd whether the time of day is shown or not -- ${TX_12_NO_TIME}`, () => {
    const row = specTable('T-375').rows.find((one) => one.id === 'TX-12')
    expect(unbroken(row?.cells[0] ?? '')).toContain(TX_12_NO_TIME)
    expect([row?.by['時刻を表示しない'], row?.by['時刻を表示する']]).toEqual(['`yyyy/mm/dd`', '`yyyy/mm/dd`'])
  })

  it('QN-15 is a question (display "ask") of table T-234, scene FR-159', () => {
    const row = specTable('T-234').rows.find((one) => one.id === 'QN-15')
    expect(row, 'table T-234 holds QN-15').toBeDefined()
    expect(NOTICE_REASONS).toContain('全体日程シフトを実行する前（`FR-159`）')
  })
})

describe('the dictionary section wholeScheduleShiftField -- the words JDG-2109 settled, and no hint (JDG-2233)', () => {
  it('holds exactly the eight parts, each with ja and en', () => {
    const section = WORDS['wholeScheduleShiftField'] as readonly Loose[]
    expect(section.map((one) => one['part'])).toEqual([...PARTS])
    for (const one of section) expect(Object.keys(one['text']).sort(), one['part']).toEqual(['en', 'ja'])
    expect(section.map((one) => one['part'])).not.toContain('hint')
  })

  it.each([
    ['name', '全体日程シフト', 'Shift Whole Schedule'],
    ['apply', '適用', 'Apply'],
    ['currentStart', '現在の開始日: {date}', 'Current start: {date}'],
    ['newStartUnit', '新しい開始日', 'New start date'],
    ['startLine', '開始日: {before} → {after}', 'Start: {before} → {after}'],
    ['workingDaysLine', 'ずらす稼働日: {count} 日', 'Working days moved: {count}'],
    ['pulledCountLine', '前の稼働日へ寄せる日付: {count} 件', 'Dates pulled back to the previous working day: {count}'],
    ['holidayStartLine', '{typed} は休日 —— {start} から始める', '{typed} is not a working day; the schedule starts on {start}'],
  ])('%s: ja "%s", en "%s" (CR-757 section 4.10)', (part, ja, en) => {
    expect([shiftWord(part, 'ja'), shiftWord(part, 'en')]).toEqual([ja, en])
  })

  it.each(PARTS.flatMap((part) => (['ja', 'en'] as const).map((language) => [part, language] as const)))(
    'the renderer reads %s (%s) out of the dictionary',
    (part, language) => {
      expect(wholeScheduleShiftFieldWord(part, language)).toBe(shiftWord(part, language))
    },
  )

  it('QN-15 has its question text in both languages', () => {
    expect(questionWord('QN-15', 'ja')).toBe(
      '全体日程シフトを実行して、日程全体を新しい開始日へ移しますか？ 書き換える内容は下に示します。取り消し 1 回で戻せます',
    )
    expect(questionWord('QN-15', 'en')).toBe(
      'Shift the whole schedule to the new start date? What will be rewritten is shown below. One Undo brings it back',
    )
  })
})

// WHY: Monday to Friday 08:00-12:00 / 13:00-17:00, and Tuesday 2029-03-06 a short working day from 09:00 to 12:00.
const COUNTED = () =>
  documentOf({
    exceptions: [{ from: '2029-03-06', to: '2029-03-06', working: true, spans: [['09:00', '12:00']] }],
    tasks: [
      { uid: 7, name: 'Spare', start: null, finish: null },
      { uid: 1, name: 'Kickoff', start: '2028-04-04T08:00:00', finish: '2028-04-04T17:00:00' },
      { uid: 2, name: 'Design', start: '2028-04-05T08:00:00', finish: '2028-04-06T17:00:00' },
      { uid: 3, name: 'Review', start: '2028-04-10T08:00:00', finish: '2028-04-10T17:00:00', deadline: '2028-04-08T17:00:00' },
    ],
    highlights: [{ id: 'sunday', start: '2028-04-09T00:00:00', end: '2028-04-09T23:59:00' }],
  })

const previewOf = (typed: string): WholeScheduleShiftPreview => {
  const preview = wholeScheduleShiftPreviewOf(COUNTED(), typed)
  if (preview === null) throw new Error(`no preview for ${typed}`)
  return preview as WholeScheduleShiftPreview
}

const sessionIn = (language: DisplayLanguage): ScreenSession =>
  ({ ...emptyScreenSession, screen: { ...emptyScreenSession.screen, screenLanguage: language, helpLanguage: language } }) as ScreenSession

const linesOf = (preview: WholeScheduleShiftPreview, language: DisplayLanguage): readonly string[] =>
  wholeScheduleShiftQuestionItems(preview, sessionIn(language)).map((one) => one.name ?? '')

const filled = (word: string, slots: Readonly<Record<string, string>>): string =>
  Object.entries(slots).reduce((text, [slot, value]) => text.replace(`{${slot}}`, value), word)

describe(`WH-11 -- the counts of the preview the question shows`, () => {
  const preview = previewOf('2029-03-05')

  it('the current start and the new start, as days', () => {
    expect([preview.currentStart, preview.newStart, preview.isNewStartNonWorking]).toEqual(['2028-04-04', '2029-03-05', false])
  })

  it('the working days moved, signed: 239 later', () => {
    expect(preview.workingDays).toBe(239)
  })

  it('the Tasks rewritten: the three with dates (the dateless Spare is not rewritten)', () => {
    expect(preview.taskCount).toBe(3)
  })

  it('the dates pulled back (WH-5): the Saturday deadline and both ends of the Sunday highlight box', () => {
    expect(preview.pulledCount).toBe(3)
  })

  it('the Tasks whose start or finish leaves working time after the move: Design starts 08:00 on the 09:00 short day', () => {
    expect(preview.outsideCount).toBe(1)
  })

  it('the example is the first Task in document order holding a start, with its days before and after', () => {
    const example = preview.example
    expect(example?.name).toBe('Kickoff')
    expect(example?.before.replace(/\//g, '-').slice(0, 10)).toBe('2028-04-04')
    expect(example?.after.replace(/\//g, '-').slice(0, 10)).toBe('2029-03-05')
  })

  it('earlier is negative: a week back is -5', () => {
    expect(previewOf('2028-03-28').workingDays).toBe(-5)
  })

  it('a typed Sunday starts on the Friday before it (WH-2)', () => {
    const sunday = previewOf('2029-03-04')
    expect([sunday.typedStart, sunday.newStart, sunday.isNewStartNonWorking, sunday.workingDays]).toEqual([
      '2029-03-04',
      '2029-03-02',
      true,
      238,
    ])
  })
})

describe('WH-11 / TX-12 -- the lines of the question, in the dictionary words and yyyy/mm/dd', () => {
  it.each(['ja', 'en'] as const)('%s: start, working days, Tasks, pulled, outside, example -- no holiday line', (language) => {
    expect(linesOf(previewOf('2029-03-05'), language)).toEqual([
      filled(shiftWord('startLine', language), { before: '2028/04/04', after: '2029/03/05' }),
      filled(shiftWord('workingDaysLine', language), { count: '239' }),
      filled(timeZoneWord('shiftTaskCountLine', language), { count: '3' }),
      filled(shiftWord('pulledCountLine', language), { count: '3' }),
      filled(timeZoneWord('shiftOutsideCountLine', language), { count: '1' }),
      filled(timeZoneWord('shiftExampleLine', language), { name: 'Kickoff', before: '2028/04/04', after: '2029/03/05' }),
    ])
  })

  it.each(['ja', 'en'] as const)('%s: a typed non-working day adds the holiday line of WH-2', (language) => {
    const lines = linesOf(previewOf('2029-03-04'), language)
    expect(lines).toContain(filled(shiftWord('holidayStartLine', language), { typed: '2029/03/04', start: '2029/03/02' }))
    expect(lines[0]?.startsWith(filled(shiftWord('startLine', language), { before: '2028/04/04', after: '' }).trimEnd())).toBe(true)
    expect(lines).toContain(filled(timeZoneWord('shiftExampleLine', language), { name: 'Kickoff', before: '2028/04/04', after: '2029/03/02' }))
  })

  it.each(['ja', 'en'] as const)(`%s: ${TX_12_NO_TIME} -- no line carries a time of day`, (language) => {
    for (const line of linesOf(previewOf('2029-03-04'), language)) expect(line).not.toMatch(/\d{1,2}:\d{2}/)
  })

  it('a negative shift shows its sign', () => {
    const line = linesOf(previewOf('2028-03-28'), 'en').find((one) => one.startsWith('Working days moved'))
    expect(line).toMatch(/^Working days moved: [-−]5$/)
  })
})

const UF_206_ONE_MAPPING = '全体日程シフト（`FR-159`）の書き込みと、問い（`QN-15`）に出すものの数えを、表 T-379 の同じ写像で作る'

describe(`UF-206 -- ${UF_206_ONE_MAPPING}`, () => {
  it('table T-075 names UF-206 in whole-schedule-shift.ts', () => {
    const row = specTable('T-075').rows.find((one) => one.id === 'UF-206')
    expect(unbroken(row?.cells.join(' | ') ?? '')).toContain(UF_206_ONE_MAPPING)
    expect(unbroken(row?.cells.join(' | ') ?? '')).toContain('`whole-schedule-shift.ts`')
  })

  it.each(['2029-03-05', '2029-03-04', '2028-03-28'])('typed %s: the example and the Task count agree with what CM-99 writes', (typed) => {
    const before = COUNTED()
    const preview = previewOf(typed)
    const after = written(heldOf(before), [shiftTo(typed)]).document
    const changed = before.schedule.tasks.filter((task, index) => JSON.stringify(task) !== JSON.stringify(after.schedule.tasks[index]))
    expect(preview.taskCount).toBe(changed.length)
    const kickoff = after.schedule.tasks.find((task) => task.name === 'Kickoff')
    expect(preview.example?.after.replace(/\//g, '-').slice(0, 10)).toBe(String(kickoff?.start).slice(0, 10))
    expect(preview.newStart).toBe(String(kickoff?.start).slice(0, 10))
  })
})

const FR_054_DATE_ONLY_MILESTONE =
  '終了の側の列（`WT-2`・`WT-4`、`WT-5` のマイルストーンの開始の側）ではその日の最後の時間帯の終わりの瞬間と読むこと（MUST）'

const outsideOf = (gate: { readonly start: string; readonly finish: string } | null): number | undefined =>
  wholeScheduleShiftPreviewOf(
    documentOf({
      tasks: [
        { uid: 1, name: 'Kickoff', start: '2028-04-04T08:00:00', finish: '2028-04-07T17:00:00' },
        ...(gate === null ? [] : [{ uid: 2, name: 'Gate', milestone: true, ...gate }]),
      ],
    }),
    '2029-03-05',
  )?.outsideCount

// WHY: DFC-2760 -- the count judges a milestone's start as a start, though WT-5 and FR-054 read it on the finish side.
describe('WH-11 / WT-5 / FR-054 -- a milestone at the end of the last span is inside working time', () => {
  it(`premise: FR-054 says ${FR_054_DATE_ONLY_MILESTONE}`, () => {
    expect(REQUIREMENTS).toContain(FR_054_DATE_ONLY_MILESTONE)
  })

  it('premise: a task ending at the end of the last span (17:00) is not counted', () => {
    expect(outsideOf(null)).toBe(0)
  })

  it.fails('a dateless milestone (read as 17:00, the end of the last span) is not counted outside after the move', () => {
    expect(outsideOf({ start: '2028-04-14', finish: '2028-04-14' })).toBe(0)
  })

  it.fails('a milestone written at 17:00 (its WT-5 default time) is not counted outside after the move', () => {
    expect(outsideOf({ start: '2028-04-14T17:00:00', finish: '2028-04-14T17:00:00' })).toBe(0)
  })
})
