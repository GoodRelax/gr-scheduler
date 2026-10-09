// CR-690 spec-only cases: the fit span of FR-055 (table T-367), its fields, the fixed fit and the chooser line.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { documentFromJson, jsonFromDocument } from '../../src/adapter/document-codec/document-codec'
import { commandFromFieldCommit } from '../../src/adapter/input-command-translator/input-command-translator'
import type {
  DisplayLanguage,
  FieldCommit,
  PropertyField,
  ScreenView,
} from '../../src/adapter/screen-renderer/screen-renderer'
import type { Document } from '../../src/entity/document-model/document/document'
import type { FrameValues } from '../../src/framework/single-html-shell/frame-loop'
import { contextOf, documentOf, taskOf } from './cr-606-stage'
import { bare, specTable, unbroken } from './spec-table'
import { EXPORT_CHOOSER, exportStage, restoreAnimationFrames, type ExportStage } from './w3-t3-frame-stage'

afterEach(restoreAnimationFrames)

const SPEC = join(process.cwd(), 'docs', 'spec')
const REQUIREMENTS = unbroken(readFileSync(join(SPEC, '01-04-requirements.md'), 'utf8').replace(/\r\n/g, '\n'))

const WORDS = JSON.parse(readFileSync(join(SPEC, '_source', 'display-words.json'), 'utf8')) as {
  readonly settings: readonly { readonly rowId: string; readonly label: Record<DisplayLanguage, string> }[]
  readonly fitSpanField: readonly { readonly part: string; readonly text: Record<DisplayLanguage, string> }[]
  readonly exportChooser: readonly { readonly part: string; readonly text: Record<DisplayLanguage, string> }[]
}

const FX_1_SAVED =
  '⭐ 期間（`_assets/tbl-settings.md` の 表 T-202 の `S-518` / `S-519`）と固定（同書の 表 T-203 の `S-532`）を文書に保存すること（MUST）'
const FX_1_EMPTIED =
  '読んだ文書と、片方だけが日付を持つ 表 T-108 の `CM-88` は、もう片方に同じ日をコピーする。⭐ 欄で片方を空にして確定したら、期間を消すこと（MUST）'
const FX_1_FIX_NEEDS_DAYS =
  '（`05-07-design.md` の 表 T-220 の前文）。⭐ `S-532` が真のときは、期間が日付を持つこと（MUST）'
const FX_2_ONLY_TWO =
  '⭐ 固定しているとき（`S-532` が真）、期間を当てるのは、全体表示（本要求、入口は `_assets/tbl-glossary.md` の 表 T-109 の `IC-10`）と、画像の書き出し（表 T-024 の `IO-3`・`IO-4`・`IO-6`、`FR-025` の 表 T-241 の `IX-12` 〜 `IX-16`）の 2 つだけとすること（MUST）'
const FX_2_NOT_ELSEWHERE = '⛔ ほかの時に、画面を期間へ動かしてはならない（MUST NOT）'
const FX_3_ACROSS =
  '⭐ 固定しているとき、全体表示は横を、`FR-025` の 表 T-241 の `IX-13` が期間の絵に定めるのと同じ置き方で、期間の両端の日の列を `Task Group Area` の両端に合わせること（MUST）'
const FX_3_CLAMP =
  '⚠️ 求めた横の倍率が 表 T-203 の `S-75` の下限か上限を超えるときは、その端へ寄せ、左端を `S-518` の日の列の左端に置く'
const FX_3_VERTICAL = '⭐ 縦は本要求の上の規則（グループ LOD の深さを選んで合わせる）のままとすること（MUST）'
const FX_4_CHECK =
  '入口は 1 つのチェックボックスとし、名を `FR-038` の辞書が 表 T-104 の `K-142` に持つ語とし、押されたら 表 T-108 の `CM-90` を 1 回発行すること（MUST）'
const FX_4_COPY = '⭐ 期間が `null` のまま固定へ入れたときは、同じ 1 回の命令で、期間に `FX-6` の 2 つの日をコピーすること（MUST）'
const FX_5_FIELD =
  '名を辞書が 表 T-104 の `K-141` に持つ語とし、開始日と終了日の 2 つを、宿主の日付の入力（`FR-151` の 表 T-330 の `SV-7` と同じ、カレンダーで選べる入力）で、`-` を挟んで並べること（MUST）'
const FX_5_ONE_COMMIT =
  '⭐ 2 つの入力は 1 つの欄として確定し、確定した値で 表 T-108 の `CM-88` を、片方か 2 つともを空にして確定したら同表の `CM-89` を、1 回発行すること（MUST）（`FX-1`）。⭐ 固定しているあいだに期間を消したときは、同じ 1 回の `CM-89` で固定も外すこと（MUST）'
const FX_5_UNFIXED =
  '⭐ 2 つの入力は固定しているあいだだけ書けるものとし、固定していないあいだは保存している値を示したまま書けないと示すこと（MUST）'
const FX_6_NAMES = '読むだけの値とし、名は辞書の `fitSpanField` の `currentName` の語、値は同節の `currentValue` の語とすること（MUST）'
const FX_6_FOLLOW =
  '2 つの日は、`Task Group Area` の左端の位置が指す日と、右端の 1 px 手前の位置が指す日（右端に一部でも見えている最後の日）である。⭐ 表示位置か横の倍率が変わったら、次に描く絵で書き換えること（MUST）'
const FX_6_NOT_EDITABLE = '表 T-338 の `MH-4` と同じ追随である。⛔ 編集できると示してはならない（MUST NOT）'
const FX_7_BUTTON =
  '`FX-6` の値のすぐ下に、語を辞書の `fitSpanField` の `copyCurrent` の語とするボタンを置き、押されたら `FX-6` の 2 つの日で 表 T-108 の `CM-88` を 1 回発行すること（MUST）'
const FX_7_ONE_FIELD = '⭐ `FX-6` とこのボタンは 1 つの欄とし、あいだに欄の区切りを置かないこと（MUST）'
const FX_7_STILL = '⛔ 画面を動かしてはならず、固定（`S-532`）を変えてはならない（MUST NOT）'
const FX_7_FIXED_ONLY = 'どちらを押したかが結果から読めるようにする。⭐ 固定しているあいだだけ押せるものとすること（MUST）'
const FX_8_DIGITS =
  '`FX-6` の値と `FR-096` の 1 行に書く日は、年（西暦の 4 桁）、`/`、月（2 桁）、`/`、日（2 桁）とし、足りない桁を 0 で埋めること（MUST）'
const FX_8_JOINER = '2 つの日のつなぎは、表 T-347 の `DT-5` と同じく、半角空白 1 つ、`-`、半角空白 1 つとすること（MUST）'
const FR_055_FIXED = '⭐ ただし文書が全体表示時の期間を固定しているときの横は、本要求の 表 T-367 に従うこと（MUST）'
const FR_055_MARGIN =
  '⭐ 横は、表 T-038 に従って測った実寸の左右に、`Task Group Area` の幅に `_assets/tbl-settings.md` の 表 T-206 の `S-332` を掛けた余白を片側ずつ残して収めること（MUST）'
const IX_8_CUT =
  '⚠️ 全体表示時の期間を固定していないとき、画面の上端で既に切れて見えている `TaskGroup` は、画面のとおりに切れたまま描くこと（MUST）'

const CLAUSES = [
  FX_1_SAVED,
  FX_1_EMPTIED,
  FX_1_FIX_NEEDS_DAYS,
  FX_2_ONLY_TWO,
  FX_2_NOT_ELSEWHERE,
  FX_3_ACROSS,
  FX_3_CLAMP,
  FX_3_VERTICAL,
  FX_4_CHECK,
  FX_4_COPY,
  FX_5_FIELD,
  FX_5_ONE_COMMIT,
  FX_5_UNFIXED,
  FX_6_NAMES,
  FX_6_FOLLOW,
  FX_6_NOT_EDITABLE,
  FX_7_BUTTON,
  FX_7_ONE_FIELD,
  FX_7_STILL,
  FX_7_FIXED_ONLY,
  FX_8_DIGITS,
  FX_8_JOINER,
  FR_055_FIXED,
  FR_055_MARGIN,
  IX_8_CUT,
]

interface SettingRow {
  readonly id: string
  readonly default?: { readonly num?: string }
}

const SETTING_ROWS: readonly SettingRow[] = (
  JSON.parse(readFileSync(join(SPEC, '_source', 'settings.json'), 'utf8')) as { blocks: { rows?: SettingRow[] }[] }
).blocks.flatMap((block) => block.rows ?? [])

function setting(id: string): number {
  const value = Number(SETTING_ROWS.find((one) => one.id === id)?.default?.num ?? Number.NaN)
  if (!Number.isFinite(value)) throw new Error(`settings.json holds no number for ${id}`)
  return value
}

const S_54 = setting('S-54')
const S_55 = setting('S-55')
const S_332 = Number(bare(specTable('T-206').rows.find((one) => one.id === 'S-332')?.by['既定'] ?? ''))

// see T-108
const commandNameOf = (id: string): string => bare(specTable('T-108').rows.find((one) => one.id === id)?.by['確定名'] ?? '')
const CM_88 = commandNameOf('CM-88')
const CM_89 = commandNameOf('CM-89')
const CM_90 = commandNameOf('CM-90')

const K_141 = 'K-141'
const K_142 = 'K-142'
const FX_6 = 'FX-6'

const settingsWordOf = (rowId: string, language: DisplayLanguage): string =>
  WORDS.settings.find((one) => one.rowId === rowId)?.label[language] ?? `(no dictionary word for ${rowId})`
const partWordOf = (
  words: readonly { readonly part: string; readonly text: Record<DisplayLanguage, string> }[],
  part: string,
  language: DisplayLanguage,
): string => words.find((one) => one.part === part)?.text[language] ?? `(no dictionary word for ${part})`

const DOCUMENT = documentOf({
  tasks: [
    taskOf(1),
    taskOf(2, { start: '2026-05-04T08:00:00', finish: '2026-05-15T17:00:00' }),
    taskOf(3, { start: '2026-06-15T08:00:00', finish: '2026-07-03T17:00:00' }),
  ],
})

const withFit = (start: string | null, finish: string | null, fixed: boolean, base: Document = DOCUMENT): Document => ({
  ...base,
  documentSettings: { ...base.documentSettings, fitSpanStart: start, fitSpanFinish: finish, fitSpanFixed: fixed },
})

const settingsOf = (stage: ExportStage) => stage.loop.document().documentSettings

const frameOf = (stage: ExportStage): FrameValues => {
  const frame = stage.loop.current()
  if (frame === null) throw new Error('premise: a frame was drawn')
  return frame
}

async function settingsStage(document: Document, language: DisplayLanguage = 'ja'): Promise<ExportStage> {
  const stage = exportStage(document, undefined, language)
  await stage.take('IC-17')
  return stage
}

const fieldOf = (view: ScreenView, row: string): PropertyField => {
  const found = view.propertiesPanel?.fields.filter((one) => one.row === row) ?? []
  if (found.length !== 1) throw new Error(`expected one field ${row} on the settings face, got ${found.length}`)
  return found[0] as PropertyField
}

async function commitOn(stage: ExportStage, commit: FieldCommit): Promise<void> {
  stage.commitNext(commit)
  await stage.pointAt(1, 1)
}

const fixCommit = (fixed: boolean): FieldCommit =>
  ({ row: K_142, key: { holder: 'documentSettings', column: 'fitSpanFixed' }, text: String(fixed) }) as FieldCommit

const spanCommit = (start: string, finish: string): FieldCommit =>
  ({
    row: K_141,
    key: { holder: 'documentSettings', column: 'fitSpanStart' },
    text: start,
    entrances: [
      { key: { holder: 'documentSettings', column: 'fitSpanStart' }, text: start },
      { key: { holder: 'documentSettings', column: 'fitSpanFinish' }, text: finish },
    ],
  }) as FieldCommit

const kindsOf = (commands: readonly unknown[]): string[] => commands.map((one) => String((one as { kind?: unknown }).kind))

const MS_PER_DAY = 86_400_000

// see FX-6
const dayAt = (frame: FrameValues, x: number): string => {
  const origin = frame.layout.originDay as unknown as { year: number; month: number; day: number } | null
  if (origin === null) throw new Error('premise: the picture has an origin day')
  const index = Math.floor((x - frame.layout.originX) / frame.layout.pxPerDay)
  return new Date(Date.UTC(origin.year, origin.month - 1, origin.day) + index * MS_PER_DAY).toISOString().slice(0, 10)
}

const shownDaysOf = (frame: FrameValues): readonly [string, string] => {
  const area = frame.regions.taskGroupArea
  return [dayAt(frame, area.x), dayAt(frame, area.x + area.width - 1)]
}

// see FX-8
const slashed = (day: string): string => day.slice(0, 10).split('-').join('/')

const readoutOf = (days: readonly [string, string], language: DisplayLanguage = 'ja'): string =>
  partWordOf(WORDS.fitSpanField, 'currentValue', language).replace('{start}', slashed(days[0])).replace('{finish}', slashed(days[1]))

const viewPlaceOf = (stage: ExportStage) => {
  const settings = settingsOf(stage)
  return { zoomX: settings.zoomX, scrollDate: settings.scrollDate, scrollDayOffset: settings.scrollDayOffset }
}

const shiftWheelOut = (x: number, y: number) =>
  ({ kind: 'wheel', x, y, modifiers: { ctrl: false, shift: true, alt: false, meta: false }, notches: 1, scrollPx: { x: 0, y: 0 } }) as const

describe('CR-690 -- the manuscript still says what these cases press', () => {
  it.each(CLAUSES)('%s', (clause) => {
    expect(REQUIREMENTS).toContain(clause)
  })

  it('premise: the command rows and the settings these cases read exist', () => {
    expect([CM_88, CM_89, CM_90].every((one) => one !== '')).toBe(true)
    expect(S_54).toBeLessThan(S_55)
    expect(S_332).toBeGreaterThan(0)
  })
})

describe('FR-055 T-367 FX-1 -- the span and its fix are document values', () => {
  it(`${FX_1_SAVED} -- written to GRS JSON and read back`, () => {
    const saved = withFit('2026-05-01', '2026-05-31', true)
    const read = documentFromJson(jsonFromDocument(saved))
    if (!read.ok) throw new Error(`premise: the written document reads back: ${JSON.stringify(read.faults)}`)
    const back = read.document.documentSettings
    expect([back.fitSpanStart?.slice(0, 10), back.fitSpanFinish?.slice(0, 10), back.fitSpanFixed]).toEqual(['2026-05-01', '2026-05-31', true])
  })

  it(`${FX_1_FIX_NEEDS_DAYS} -- a document fixed with no span reads as not fixed`, () => {
    const read = documentFromJson(jsonFromDocument(withFit(null, null, true)))
    if (!read.ok) throw new Error(`premise: the document reads: ${JSON.stringify(read.faults)}`)
    expect(read.document.documentSettings.fitSpanFixed).toBe(false)
  })

  it(`${FX_1_EMPTIED} -- one emptied end settles as one ${CM_89}`, () => {
    const context = contextOf(withFit('2026-05-01', '2026-05-31', true))
    expect(kindsOf(commandFromFieldCommit(spanCommit('2026-05-01', ''), context))).toEqual([CM_89])
    expect(kindsOf(commandFromFieldCommit(spanCommit('', '2026-05-31'), context))).toEqual([CM_89])
    expect(kindsOf(commandFromFieldCommit(spanCommit('', ''), context))).toEqual([CM_89])
  })
})

describe('FR-055 T-367 FX-5 -- the span field', () => {
  it.each(['ja', 'en'] as const)(`${FX_5_FIELD} -- %s`, async (language) => {
    const field = fieldOf((await settingsStage(DOCUMENT, language)).lastView(), K_141)
    expect(field.name).toBe(settingsWordOf(K_141, language))
    expect(field.controls.map((one) => one.kind)).toEqual(['date', 'date'])
    expect(field.isSettledAsOne).toBe(true)
  })

  it(`${FX_5_ONE_COMMIT} -- both days settle as one ${CM_88}`, () => {
    const commands = commandFromFieldCommit(spanCommit('2026-05-01', '2026-05-31'), contextOf(withFit('2026-05-01', '2026-05-31', true)))
    expect(kindsOf(commands)).toEqual([CM_88])
    expect(JSON.stringify(commands)).toContain('2026-05-31')
  })

  it(`${FX_5_ONE_COMMIT} -- emptying the fixed span clears the fix too`, async () => {
    const stage = await settingsStage(withFit('2026-05-01', '2026-05-31', true))
    await commitOn(stage, spanCommit('2026-05-01', ''))
    const settings = settingsOf(stage)
    expect([settings.fitSpanStart, settings.fitSpanFinish, settings.fitSpanFixed]).toEqual([null, null, false])
  })

  it(`${FX_5_UNFIXED} -- unfixed, both inputs show the stored days and cannot be written; fixed, they can`, async () => {
    const unfixed = fieldOf((await settingsStage(withFit('2026-05-01', '2026-05-31', false))).lastView(), K_141)
    expect(unfixed.controls.map((one) => [one.text, one.isDisabled === true])).toEqual([
      ['2026-05-01', true],
      ['2026-05-31', true],
    ])
    const fixed = fieldOf((await settingsStage(withFit('2026-05-01', '2026-05-31', true))).lastView(), K_141)
    expect(fixed.controls.map((one) => one.isDisabled === true)).toEqual([false, false])
  })
})

describe('FR-055 T-367 FX-4 -- the fix check', () => {
  it.each(['ja', 'en'] as const)(`${FX_4_CHECK} -- %s`, async (language) => {
    const field = fieldOf((await settingsStage(DOCUMENT, language)).lastView(), K_142)
    expect(field.name).toBe(settingsWordOf(K_142, language))
    expect(field.controls.map((one) => one.kind)).toEqual(['boolean'])
    expect(kindsOf(commandFromFieldCommit(fixCommit(true), contextOf(DOCUMENT)))).toEqual([CM_90])
  })

  it(`${FX_4_COPY} -- fixing with no span takes the shown span in the same step`, async () => {
    const stage = await settingsStage(DOCUMENT)
    const shown = shownDaysOf(frameOf(stage))
    const place = viewPlaceOf(stage)
    await commitOn(stage, fixCommit(true))
    const settings = settingsOf(stage)
    expect([settings.fitSpanFixed, settings.fitSpanStart?.slice(0, 10), settings.fitSpanFinish?.slice(0, 10)]).toEqual([true, ...shown])
    expect(viewPlaceOf(stage), `${FX_2_NOT_ELSEWHERE}: fixing does not move the screen`).toEqual(place)
  })
})

describe('FR-055 T-367 FX-2 / FX-3 -- the fixed fit', () => {
  const SPAN = ['2026-05-01', '2026-05-31'] as const
  const SPAN_DAYS = 31

  it(`${FX_2_NOT_ELSEWHERE} -- setting the span does not move the screen; a zoom shows outside it`, async () => {
    const stage = await settingsStage(withFit(...SPAN, true))
    const place = viewPlaceOf(stage)
    await commitOn(stage, spanCommit('2026-05-02', '2026-05-30'))
    expect(viewPlaceOf(stage)).toEqual(place)
    const area = frameOf(stage).regions.taskGroupArea
    await stage.press(shiftWheelOut(area.x + area.width / 2, area.y + area.height / 2))
    const [start, finish] = shownDaysOf(frameOf(stage))
    expect(start < '2026-05-02' || finish > '2026-05-30', 'the view shows days outside the span').toBe(true)
  })

  it(`${FX_2_ONLY_TWO} / ${FX_3_ACROSS} / ${FR_055_FIXED} -- the fit puts the span's two days on the Task Group Area's edges`, async () => {
    const stage = await settingsStage(withFit(...SPAN, true))
    await stage.take('IC-10')
    const frame = frameOf(stage)
    expect(frame.layout.pxPerDay).toBeCloseTo(frame.regions.taskGroupArea.width / SPAN_DAYS, 6)
    expect([settingsOf(stage).scrollDate?.slice(0, 10), settingsOf(stage).scrollDayOffset]).toEqual([SPAN[0], 0])
    expect(shownDaysOf(frame)).toEqual(SPAN)
    expect(fieldOf(stage.lastView(), FX_6).readout, FX_6_FOLLOW).toBe(readoutOf(SPAN))
  })

  it(`${FX_3_VERTICAL} -- the fixed fit takes the same vertical as the unfixed one`, async () => {
    const fixed = exportStage(withFit(...SPAN, true))
    await fixed.take('IC-10')
    const unfixed = exportStage(withFit(...SPAN, false))
    await unfixed.take('IC-10')
    expect(settingsOf(fixed).zoomY).toBe(settingsOf(unfixed).zoomY)
    expect(settingsOf(fixed).scrollGroupId).toBe(settingsOf(unfixed).scrollGroupId)
  })

  it.each([
    ['2000-01-01', '2099-12-31', S_54],
    ['2026-05-10', '2026-05-10', S_55],
  ])(`${FX_3_CLAMP} -- %s .. %s fits at the S-75 end %s`, async (start, finish, end) => {
    const stage = exportStage(withFit(start, finish, true))
    await stage.take('IC-10')
    expect([settingsOf(stage).zoomX, settingsOf(stage).scrollDate?.slice(0, 10), settingsOf(stage).scrollDayOffset]).toEqual([end, start, 0])
  })

  it(`${FR_055_MARGIN} -- unfixed, the fit keeps the margin on each side`, async () => {
    const stage = exportStage(withFit(...SPAN, false))
    await stage.take('IC-10')
    const frame = frameOf(stage)
    const area = frame.regions.taskGroupArea
    const left = Math.min(...frame.layout.placements.map((one) => one.occupiedX0))
    const right = Math.max(...frame.layout.placements.map((one) => one.occupiedX1))
    expect(left - area.x).toBeCloseTo(area.width * S_332, 0)
    expect(area.x + area.width - right).toBeCloseTo(area.width * S_332, 0)
  })
})

describe('FR-055 T-367 FX-6 / FX-7 -- the shown span and the copy entrance', () => {
  it.each(['ja', 'en'] as const)(`${FX_6_NAMES} -- %s`, async (language) => {
    const stage = await settingsStage(DOCUMENT, language)
    const field = fieldOf(stage.lastView(), FX_6)
    expect(field.name).toBe(partWordOf(WORDS.fitSpanField, 'currentName', language))
    expect(field.readout).toBe(readoutOf(shownDaysOf(frameOf(stage)), language))
  })

  it(`${FX_6_FOLLOW} -- a zoom of the time axis rewrites it on the next picture`, async () => {
    const stage = await settingsStage(DOCUMENT)
    const before = fieldOf(stage.lastView(), FX_6).readout
    const area = frameOf(stage).regions.taskGroupArea
    await stage.press(shiftWheelOut(area.x + area.width / 2, area.y + area.height / 2))
    const after = fieldOf(stage.lastView(), FX_6).readout
    expect(after).not.toBe(before)
    expect(after).toBe(readoutOf(shownDaysOf(frameOf(stage))))
  })

  it(`${FX_6_NOT_EDITABLE} -- the value is no input; its one control is the copy press`, async () => {
    const field = fieldOf((await settingsStage(DOCUMENT)).lastView(), FX_6)
    expect(field.isEditable).toBe(false)
    expect(field.controls.every((one) => one.press !== undefined)).toBe(true)
  })

  it.each(['ja', 'en'] as const)(`${FX_7_BUTTON} / ${FX_7_ONE_FIELD} -- %s`, async (language) => {
    const field = fieldOf((await settingsStage(withFit('2026-05-01', '2026-05-31', true), language)).lastView(), FX_6)
    expect(field.controls.map((one) => one.press)).toEqual([partWordOf(WORDS.fitSpanField, 'copyCurrent', language)])
    expect(field.readout).not.toBe('')
  })

  it(`${FX_7_BUTTON} / ${FX_7_STILL} -- a press writes the shown span once, and neither the view nor the fix moves`, async () => {
    const document = withFit('2026-05-01', '2026-05-31', true)
    const stage = await settingsStage(document)
    const shown = shownDaysOf(frameOf(stage))
    const place = viewPlaceOf(stage)
    const control = fieldOf(stage.lastView(), FX_6).controls[0]
    if (control === undefined) throw new Error('premise: the copy entrance is drawn')
    const press = { row: FX_6, key: control.key, text: control.text } as FieldCommit
    expect(kindsOf(commandFromFieldCommit(press, contextOf(document)))).toEqual([CM_88])
    await commitOn(stage, press)
    const settings = settingsOf(stage)
    expect([settings.fitSpanStart?.slice(0, 10), settings.fitSpanFinish?.slice(0, 10)]).toEqual([...shown])
    expect(settings.fitSpanFixed).toBe(true)
    expect(viewPlaceOf(stage)).toEqual(place)
  })

  it(`${FX_7_FIXED_ONLY} -- unfixed, the copy entrance cannot be pressed`, async () => {
    const unfixed = fieldOf((await settingsStage(DOCUMENT)).lastView(), FX_6)
    expect(unfixed.controls.map((one) => one.isDisabled === true)).toEqual([true])
    const fixed = fieldOf((await settingsStage(withFit('2026-05-01', '2026-05-31', true))).lastView(), FX_6)
    expect(fixed.controls.map((one) => one.isDisabled === true)).toEqual([false])
  })
})

describe('FR-055 T-367 FX-8 -- the day form of the read-out and of the FR-096 line', () => {
  const SLASHED_SPAN = /^\d{4}\/\d{2}\/\d{2} - \d{4}\/\d{2}\/\d{2}$/

  it(`${FX_8_DIGITS} / ${FX_8_JOINER} -- the shown span read-out`, async () => {
    const readout = fieldOf((await settingsStage(DOCUMENT)).lastView(), FX_6).readout ?? ''
    expect(readout).toMatch(SLASHED_SPAN)
  })

  it.each(['ja', 'en'] as const)(`${FX_8_DIGITS} / ${FX_8_JOINER} -- the chooser line, %s`, async (language) => {
    const stage = exportStage(withFit('2027-01-05', '2027-02-09', true), undefined, language)
    await stage.take('IC-2')
    const modal = stage.lastView().openModal as { readonly surface?: string; readonly fitSpanLine?: string | null } | null
    expect(modal?.surface).toBe(EXPORT_CHOOSER)
    const word = partWordOf(WORDS.exportChooser, 'fitSpan', language)
    expect(modal?.fitSpanLine).toBe(word.replace('{start}', '2027/01/05').replace('{finish}', '2027/02/09'))
    expect(modal?.fitSpanLine?.slice(word.indexOf('{start}'))).toMatch(SLASHED_SPAN)
  })
})

describe('FR-025 T-241 IX-8 -- the unfixed picture keeps the cut of the top task group', () => {
  it(IX_8_CUT, async () => {
    const rows = ['r1', 'r2', 'r3', 'r4']
    const cut = documentOf({ tasks: rows.map((_one, index) => taskOf(index + 1)) })
    const document: Document = {
      ...cut,
      schedule: {
        ...cut.schedule,
        taskGroups: rows.map((id, index) => ({ ...cut.schedule.taskGroups[0]!, id, label: id, order: index })),
        taskGroupMembers: rows.map((id, index) => ({ taskUid: index + 1, groupId: id })),
      },
      documentSettings: { ...cut.documentSettings, scrollGroupId: 'r1', scrollGroupOffset: 0.5 },
    }
    const stage = exportStage(document)
    const screen = stage.lastView().taskGroupPanel.titles.slice(0, 2).map((one) => [one.groupId, one.box])
    const scene = stage.loop.exportScene()
    if (scene === null) throw new Error('premise: the screen has a picture to export')
    const pictured = scene.screenView.taskGroupPanel.titles.slice(0, 2).map((one) => [one.groupId, one.box])
    expect(pictured).toEqual(screen)
    const [top, next] = scene.screenView.taskGroupPanel.titles
    expect(top?.box.height, 'premise: the top task group is cut on the screen').toBeLessThan(next?.box.height ?? 0)
  })
})
