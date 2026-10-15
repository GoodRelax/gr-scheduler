// CR-755 (spec-only): FO-14 offers the standard rows only and asks Convert and Apply / Don't Convert / Cancel only when another zone is chosen, with before and after lines; one undo takes an answer back; FO-15 is four numbered rows.

import { afterEach, describe, expect, it } from 'vitest'

import type { DisplayLanguage, PropertyControl, PropertyField } from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import { baseChangeCommandsOf } from '../../src/framework/single-html-shell/field-entry'
import type { DocumentCommand } from '../../src/use-case/apply-document-change/apply-document-change'
import { baseChangeCommandOf, baseTimeZonesAfterChange } from '../../src/use-case/edit-document/edit-document-settings'
import {
  ALL_KEYS,
  REQUIREMENTS,
  STANDARD_KEYS,
  STATE_MACHINE_BOOK,
  T_376_ROWS,
  expectedNameOf,
  settingWord,
  timeZoneWord,
  zoneRowOfKey,
} from './cr-755-stage'
import {
  documentOf,
  heldOf,
  keyOf,
  planned,
  restoreAnimationFrames,
  shiftStage,
  undone,
  written,
  type ShiftStage,
  type TaskSpec,
} from './cr-757-stage'
import { specTable, unbroken } from './spec-table'

afterEach(restoreAnimationFrames)

// see FR-156
const FR_156_STATEMENT =
  '作成者が文書の設定の面で基準に別のタイムゾーンを選び、答えを押したときは、その答えに従って、見せる基準を選んだタイムゾーンにするか、日程データのタイムゾーンを選んだタイムゾーンに付け替えて見せる基準を日程データのタイムゾーンへ戻すこと。'
const FR_156_FIELD = '基準の欄は、`_assets/tbl-glossary.md` の 表 T-104 の `K-144` の名で、表 T-376 の種が標準時の行を選ぶ欄を 1 つ置く。'
const FR_156_ASK_ONLY_OTHER =
  '⭐ その欄で、いまの見せる基準と違うタイムゾーンを選んだときだけ、欄のすぐ下に、辞書の `timeZoneField` の `baseChangeQuestion` の 1 行と、次の 3 つの答えを 1 行に 1 つずつ出すこと（MUST）'
const FR_156_APPLY = '換算して適用する —— 見せる基準（`S-574`）を選んだタイムゾーンにし、保存の数字は変えない（同じ瞬間を新しいタイムゾーンの時刻で見せる）。'
const FR_156_DONT_CONVERT =
  '換算しない —— 日程データのタイムゾーン（`AT-157`）を選んだタイムゾーンに付け替え、見せる基準を `null`（日程データのタイムゾーンと同じ）に戻す'
const FR_156_CANCEL = 'キャンセル —— 選んだタイムゾーンを取り消し、基準を変えない。'
const FR_156_HINTS =
  '語は `FR-038` の辞書の `timeZoneField` の `keepGlobalTime`・`keepLocalTime`・`cancelBaseChange` が持ち、換算して適用する と 換算しない には、その働きを言う説明（同じ区の語）を添える。'
const FR_156_BEFORE_AFTER =
  '換算して適用する と 換算しない の下には、その答えで当てる前と後の時刻を、辞書の `beforeLine` と `afterLine` の 2 行に分けて添えること（MUST）'
const FR_156_FIRST_TASK = '時刻は、開始を持つ最初のタスク（文書の `Task` の並びの順）の開始の日時を、前はいまの見せる基準で、後はその答えで当てた後の見せる基準で見せ'
const FR_156_NO_START = '開始を持つタスクが無いときは、前と後の行を出さない。'
const FR_156_SHOWN_AFTER = '⭐ どちらの答えでも、押した後は選んだタイムゾーンが基準の欄に示され、画面の日時はすべてその時刻で見える（利用者の判断）。'
const FR_156_ONLY_ON_ANSWER = '⭐ タイムゾーンを選んだだけでは当てず、答えを押したときに当てること（MUST）'
const FR_156_ONE_UNDO = '⛔ 答えは確認を取らずに当て、取り消し 1 回で戻せること（MUST）'
const FR_156_ONE_WRITE = '換算しない の 2 つの書き換えも 1 回の書き込みとする。'
const FR_156_DISPLAY_ROWS =
  '表示するタイムゾーンの欄は、基準の欄の下に、`K-145` の名に番号（1 〜 4）を添えた選ぶ欄を 1 行に 1 つずつ 4 行置き、どれも「なし」と 表 T-376 のすべての行を選べる（利用者の判断）。'

describe('FR-156 / FO-14 / FO-15 -- the manuscript these cases are built from still reads as quoted', () => {
  it.each([
    FR_156_STATEMENT,
    FR_156_FIELD,
    FR_156_ASK_ONLY_OTHER,
    FR_156_APPLY,
    FR_156_DONT_CONVERT,
    FR_156_CANCEL,
    FR_156_HINTS,
    FR_156_BEFORE_AFTER,
    FR_156_FIRST_TASK,
    FR_156_NO_START,
    FR_156_SHOWN_AFTER,
    FR_156_ONLY_ON_ANSWER,
    FR_156_ONE_UNDO,
    FR_156_ONE_WRITE,
    FR_156_DISPLAY_ROWS,
  ])('%s', (clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })

  it('T-280: the draft machine takes baseTimeZoneChosen, baseChangeEntryPressed and baseChangeCancelPressed; baseChangeWayChosen is gone', () => {
    for (const event of ['screen/baseTimeZoneChosen', 'screen/baseChangeEntryPressed', 'screen/baseChangeCancelPressed']) {
      expect(STATE_MACHINE_BOOK, event).toContain(`| \`${event}\` |`)
    }
    expect(STATE_MACHINE_BOOK).toContain('isOtherThanShownBase')
    expect(STATE_MACHINE_BOOK).not.toContain('baseChangeWayChosen')
  })

  it('T-369: FO-14 and FO-15 name the field and the four numbered rows', () => {
    const cellsOf = (id: string): string => unbroken(specTable('T-369').rows.find((one) => one.id === id)?.cells.join(' | ') ?? '')
    expect(cellsOf('FO-14')).toContain('本プロジェクトの基準タイムゾーン')
    expect(cellsOf('FO-14')).toContain('スケジュールデータの時刻:')
    expect(cellsOf('FO-15')).toContain('表示するタイムゾーン 1 〜 4')
  })
})

const BASE_ROW = 'K-144'
const CHOSEN = { holder: 'baseTimeZoneDraft', column: 'chosenRegion' } as const
const APPLY = { holder: 'baseTimeZoneDraft', column: 'keepGlobalTime' } as const
const DONT_CONVERT = { holder: 'baseTimeZoneDraft', column: 'keepLocalTime' } as const
const CANCEL = { holder: 'baseTimeZoneDraft', column: 'cancel' } as const
const UNDO = keyOf('SK-6')

// WHY: the first task holds no start, so the first task WITH a start is the second, not the earliest (the third).
const TASKS: readonly TaskSpec[] = [
  { uid: 1, name: 'Unplanned', start: null, finish: null },
  { uid: 2, name: 'Kickoff', start: '2028-04-01T08:00:00', finish: '2028-04-01T17:00:00' },
  { uid: 3, name: 'Earlier', start: '2028-03-01T08:00:00', finish: '2028-03-01T17:00:00' },
]

function benchOf(tasks: readonly TaskSpec[], data = 'UTC-08:00', view: string | null = null): Document {
  const built = documentOf({ tasks })
  return {
    ...built,
    schedule: { ...built.schedule, project: { ...built.schedule.project, scheduleDataTimeZone: data } },
    documentSettings: { ...built.documentSettings, viewTimeZone: view },
  } as unknown as Document
}

const fieldOf = (built: ShiftStage, row: string): PropertyField => {
  const found = built.lastView().propertiesPanel?.fields.filter((one) => one.row === row) ?? []
  if (found.length !== 1) throw new Error(`expected one ${row} field on the settings face, got ${String(found.length)}`)
  return found[0] as PropertyField
}

const chooserOf = (field: PropertyField): PropertyControl => {
  const found = field.controls.find((one) => one.kind === 'choice')
  if (found === undefined) throw new Error(`the ${field.row} field has no chooser`)
  return found
}

// WHY: the words below the chooser, one line per entry, a control of several lines split at its breaks.
const linesUnder = (field: PropertyField): readonly string[] =>
  field.controls.filter((one) => one.kind !== 'choice').flatMap((one) => (one.press ?? one.words ?? '').split('\n'))

const zonesOf = (built: ShiftStage): readonly [string, string | null] => {
  const document = built.loop.document()
  return [document.schedule.project.scheduleDataTimeZone, document.documentSettings.viewTimeZone]
}

async function chosen(document: Document, key: string, language: DisplayLanguage = 'ja'): Promise<ShiftStage> {
  const built = await shiftStage(document, language)
  await built.commitField(BASE_ROW, CHOSEN, key)
  return built
}

// see FO-14, FR-156, K-144, T-376
describe(`FO-14 -- ${FR_156_FIELD}`, () => {
  it.each(['ja', 'en'] as const)('%s: the field carries the K-144 word and one chooser of the 27 standard rows, in table order', async (language) => {
    const field = fieldOf(await shiftStage(benchOf(TASKS), language), BASE_ROW)
    expect(field.name).toBe(settingWord('K-144', language))
    const chooser = chooserOf(field)
    expect(chooser.choiceValues).toEqual(STANDARD_KEYS)
    expect(chooser.choices).toEqual(STANDARD_KEYS.map((key) => expectedNameOf(zoneRowOfKey(key), language)))
    expect(field.controls).toHaveLength(1)
  })

  it('the K-144 word is the one CR-755 named: ja and en', () => {
    expect(settingWord('K-144', 'ja')).toBe('本プロジェクトの基準タイムゾーン')
    expect(settingWord('K-144', 'en')).toBe('Project Base Time Zone')
  })

  it('no daylight row is offered as the base', async () => {
    const chooser = chooserOf(fieldOf(await shiftStage(benchOf(TASKS)), BASE_ROW))
    for (const row of T_376_ROWS.filter((one) => one.isDaylight)) expect(chooser.choiceValues, row.key).not.toContain(row.key)
  })

  it('the chooser shows the shown base: the schedule data zone while S-574 is empty, else S-574', async () => {
    expect(chooserOf(fieldOf(await shiftStage(benchOf(TASKS)), BASE_ROW)).text).toBe('UTC-08:00')
    expect(chooserOf(fieldOf(await shiftStage(benchOf(TASKS, 'UTC-08:00', 'UTC+05:30')), BASE_ROW)).text).toBe('UTC+05:30')
  })
})

// see FO-14, FR-156, TX-11, T-280
describe(`FO-14 -- ${FR_156_ASK_ONLY_OTHER}`, () => {
  it('choosing the shown base again asks nothing and writes nothing', async () => {
    const built = await chosen(benchOf(TASKS), 'UTC-08:00')
    expect(fieldOf(built, BASE_ROW).controls).toHaveLength(1)
    expect(zonesOf(built)).toEqual(['UTC-08:00', null])
  })

  it(`ja: choosing UTC+09:00 shows the question line, the three answers one per line, and ${FR_156_BEFORE_AFTER}`, async () => {
    const built = await chosen(benchOf(TASKS), 'UTC+09:00')
    const field = fieldOf(built, BASE_ROW)
    expect(chooserOf(field).text).toBe('UTC+09:00')
    expect(linesUnder(field)).toEqual([
      'スケジュールデータの時刻:',
      '換算して適用する',
      '変更前: 4/1 8:00 PST',
      '変更後: 4/2 1:00 JST',
      '換算しない',
      '変更前: 4/1 8:00 PST',
      '変更後: 4/1 8:00 JST',
      'キャンセル',
    ])
    for (const one of field.controls.filter((control) => control.kind !== 'choice')) expect(one.isOwnLine).toBe(true)
  })

  it('en: the same lines in the en words of the dictionary', async () => {
    const field = fieldOf(await chosen(benchOf(TASKS), 'UTC+09:00', 'en'), BASE_ROW)
    expect(linesUnder(field)).toEqual([
      timeZoneWord('baseChangeQuestion', 'en'),
      timeZoneWord('keepGlobalTime', 'en'),
      timeZoneWord('beforeLine', 'en').replace('{time}', '4/1 8:00 PST'),
      timeZoneWord('afterLine', 'en').replace('{time}', '4/2 1:00 JST'),
      timeZoneWord('keepLocalTime', 'en'),
      timeZoneWord('beforeLine', 'en').replace('{time}', '4/1 8:00 PST'),
      timeZoneWord('afterLine', 'en').replace('{time}', '4/1 8:00 JST'),
      timeZoneWord('cancelBaseChange', 'en'),
    ])
    expect(timeZoneWord('keepGlobalTime', 'en')).toBe('Convert and Apply')
    expect(timeZoneWord('keepLocalTime', 'en')).toBe("Don't Convert")
    expect(timeZoneWord('cancelBaseChange', 'en')).toBe('Cancel')
  })

  it(`${FR_156_HINTS} -- the two writing answers carry their hint words, and they are the answers that press`, async () => {
    const field = fieldOf(await chosen(benchOf(TASKS), 'UTC+09:00'), BASE_ROW)
    const pressed = field.controls.filter((one) => one.press !== undefined)
    expect(pressed.map((one) => one.key)).toEqual([APPLY, DONT_CONVERT, CANCEL])
    expect(pressed.map((one) => one.hint)).toEqual([timeZoneWord('keepGlobalTimeHint', 'ja'), timeZoneWord('keepLocalTimeHint', 'ja'), undefined])
  })

  it(`${FR_156_NO_START} -- no task with a start: the question and the three answers only`, async () => {
    const field = fieldOf(await chosen(benchOf([{ uid: 1, start: null, finish: null }]), 'UTC+09:00'), BASE_ROW)
    expect(linesUnder(field)).toEqual(['スケジュールデータの時刻:', '換算して適用する', '換算しない', 'キャンセル'])
  })

  it('a view base set (S-574 = UTC+05:30): the before lines read IST, the after lines the chosen zone', async () => {
    const field = fieldOf(await chosen(benchOf(TASKS, 'UTC-08:00', 'UTC+05:30'), 'UTC+09:00'), BASE_ROW)
    expect(linesUnder(field)).toEqual([
      'スケジュールデータの時刻:',
      '換算して適用する',
      '変更前: 4/1 21:30 IST',
      '変更後: 4/2 1:00 JST',
      '換算しない',
      '変更前: 4/1 21:30 IST',
      '変更後: 4/1 8:00 JST',
      'キャンセル',
    ])
  })

  it('while the answers stand, another zone rebuilds the lines; the shown base again takes them away', async () => {
    const built = await chosen(benchOf(TASKS), 'UTC+09:00')
    await built.commitField(BASE_ROW, CHOSEN, 'UTC+05:30')
    expect(linesUnder(fieldOf(built, BASE_ROW))).toContain('変更後: 4/1 21:30 IST')
    await built.commitField(BASE_ROW, CHOSEN, 'UTC-08:00')
    expect(fieldOf(built, BASE_ROW).controls).toHaveLength(1)
    expect(zonesOf(built)).toEqual(['UTC-08:00', null])
  })
})

// see FR-156, CM-94, CM-95, UN-13
describe(`FO-14 -- ${FR_156_ONLY_ON_ANSWER} / ${FR_156_ONE_UNDO}`, () => {
  it('choosing another zone writes nothing until an answer is pressed', async () => {
    const built = await chosen(benchOf(TASKS), 'UTC+09:00')
    expect(zonesOf(built)).toEqual(['UTC-08:00', null])
  })

  it(`Convert and Apply: S-574 becomes the chosen zone, no question is asked, the field shows it, one undo takes it back -- ${FR_156_SHOWN_AFTER}`, async () => {
    const built = await chosen(benchOf(TASKS), 'UTC+09:00')
    await built.commitField(BASE_ROW, APPLY, '')
    expect(built.lastView().confirmation).toBeNull()
    expect(zonesOf(built)).toEqual(['UTC-08:00', 'UTC+09:00'])
    const field = fieldOf(built, BASE_ROW)
    expect(field.controls).toHaveLength(1)
    expect(chooserOf(field).text).toBe('UTC+09:00')
    await built.press(UNDO)
    expect(zonesOf(built)).toEqual(['UTC-08:00', null])
  })

  it(`Don't Convert: AT-157 becomes the chosen zone and S-574 null in one write; the field shows it; one undo takes both back`, async () => {
    const built = await chosen(benchOf(TASKS, 'UTC-08:00', 'UTC+05:30'), 'UTC+09:00')
    await built.commitField(BASE_ROW, DONT_CONVERT, '')
    expect(built.lastView().confirmation).toBeNull()
    expect(zonesOf(built)).toEqual(['UTC+09:00', null])
    expect(chooserOf(fieldOf(built, BASE_ROW)).text).toBe('UTC+09:00')
    await built.press(UNDO)
    expect(zonesOf(built)).toEqual(['UTC-08:00', 'UTC+05:30'])
  })

  it("Don't Convert keeps the stored numbers: the task start text is the same, read in the new zone", async () => {
    const built = await chosen(benchOf(TASKS), 'UTC+09:00')
    const before = built.loop.document().schedule.tasks.map((one) => one.start)
    await built.commitField(BASE_ROW, DONT_CONVERT, '')
    expect(built.loop.document().schedule.tasks.map((one) => one.start)).toEqual(before)
  })

  it(`Cancel: ${FR_156_CANCEL} -- nothing written, the answers go, the field shows the base again`, async () => {
    const built = await chosen(benchOf(TASKS), 'UTC+09:00')
    await built.commitField(BASE_ROW, CANCEL, '')
    expect(zonesOf(built)).toEqual(['UTC-08:00', null])
    const field = fieldOf(built, BASE_ROW)
    expect(field.controls).toHaveLength(1)
    expect(chooserOf(field).text).toBe('UTC-08:00')
  })
})

// see FR-156, CM-94, CM-95, UN-13
describe(`the base change commands -- ${FR_156_ONE_WRITE}`, () => {
  const bench = benchOf(TASKS, 'UTC-08:00', 'UTC+05:30')

  it("baseTimeZonesAfterChange: Convert and Apply moves S-574 only; Don't Convert moves AT-157 and empties S-574", () => {
    const held = { scheduleDataTimeZone: 'UTC-08:00', viewTimeZone: 'UTC+05:30' }
    expect(baseTimeZonesAfterChange(held, 'UTC+09:00', 'keepGlobalTime')).toEqual({ scheduleDataTimeZone: 'UTC-08:00', viewTimeZone: 'UTC+09:00' })
    expect(baseTimeZonesAfterChange(held, 'UTC+09:00', 'keepLocalTime')).toEqual({ scheduleDataTimeZone: 'UTC+09:00', viewTimeZone: null })
  })

  it.each([
    ['keepGlobalTime', ['UTC-08:00', 'UTC+09:00']],
    ['keepLocalTime', ['UTC+09:00', null]],
  ] as const)('%s: the commands write in one step, and one undo restores both zones', (way, after) => {
    const commands = baseChangeCommandsOf({ chosenRegion: 'UTC+09:00', chosenWay: way }, bench) as readonly DocumentCommand[]
    const once = written(heldOf(bench), commands)
    expect([once.document.schedule.project.scheduleDataTimeZone, once.document.documentSettings.viewTimeZone]).toEqual(after)
    expect(once.history.done).toHaveLength(1)
    const back = undone(once)
    expect([back.document.schedule.project.scheduleDataTimeZone, back.document.documentSettings.viewTimeZone]).toEqual(['UTC-08:00', 'UTC+05:30'])
  })

  it('baseChangeCommandOf returns a list (one write), and a daylight key as the schedule data zone is refused by the edit', () => {
    const commands = baseChangeCommandOf({ scheduleDataTimeZone: 'UTC-08:00', viewTimeZone: null }, 'UTC-07:00 DST', 'keepLocalTime')
    expect(Array.isArray(commands)).toBe(true)
    expect(planned(heldOf(benchOf(TASKS)), commands as readonly DocumentCommand[]).ok).toBe(false)
  })
})

// see FO-15, FR-156, K-145, S-575
describe(`FO-15 -- ${FR_156_DISPLAY_ROWS}`, () => {
  const ROWS = ['K-145:1', 'K-145:2', 'K-145:3', 'K-145:4']

  it.each(['ja', 'en'] as const)('%s: four rows named the K-145 word and 1..4, each offering none and all 39 rows', async (language) => {
    const built = await shiftStage(benchOf(TASKS), language)
    for (const [index, row] of ROWS.entries()) {
      const field = fieldOf(built, row)
      expect(field.name).toBe(`${settingWord('K-145', language)} ${String(index + 1)}`)
      const chooser = chooserOf(field)
      expect(chooser.choices).toEqual([timeZoneWord('none', language), ...ALL_KEYS.map((key) => expectedNameOf(zoneRowOfKey(key), language))])
    }
  })

  it('the K-145 word reads Display Time Zone in en', () => {
    expect(settingWord('K-145', 'en')).toBe('Display Time Zone')
  })

  it('the four rows stand below the base field, in order', async () => {
    const rows = ((await shiftStage(benchOf(TASKS))).lastView().propertiesPanel?.fields ?? []).map((one) => one.row)
    const at = [BASE_ROW, ...ROWS].map((row) => rows.indexOf(row))
    expect(at.every((one) => one >= 0)).toBe(true)
    expect([...at].sort((a, b) => a - b)).toEqual(at)
  })

  it('choosing the PDT row in display row 1 stores the daylight key (S-575 takes every row)', async () => {
    const built = await shiftStage(benchOf(TASKS))
    const chooser = chooserOf(fieldOf(built, 'K-145:1'))
    const index = chooser.choices?.indexOf(expectedNameOf(zoneRowOfKey('UTC-07:00 DST'), 'ja')) ?? -1
    expect(index).toBeGreaterThan(0)
    await built.commitField('K-145:1', chooser.key, chooser.choiceValues?.[index] ?? '')
    expect(built.loop.document().documentSettings.displayTimeZones).toEqual(['UTC-07:00 DST'])
  })
})
