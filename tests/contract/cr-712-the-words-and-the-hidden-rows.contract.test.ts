// CR-712 wave 2 spec-only cases: the words the review chose (E-08, E-09), MG-10, and the sentences the hidden rows rewrote (E-03).

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { specTable, unbroken } from './spec-table'

const SPEC = join(process.cwd(), 'docs', 'spec')

const REQUIREMENTS = unbroken(readFileSync(join(SPEC, '01-04-requirements.md'), 'utf8'))

interface Words {
  readonly ja: string
  readonly en: string
}

interface RowWords {
  readonly rowId: string
  readonly text: Words
  readonly nextStep?: Words
}

interface PartWords {
  readonly part: string
  readonly text: Words
}

const DICTIONARY = JSON.parse(readFileSync(join(SPEC, '_source', 'display-words.json'), 'utf8')) as {
  readonly reasons: readonly RowWords[]
  readonly invariants: readonly RowWords[]
  readonly delayReportReasons: readonly PartWords[]
  readonly differenceReview?: readonly PartWords[]
}

const MG_10_ALWAYS_ON_U_61 =
  '「別のものとして取り込む」を選ばせる面（`_assets/tbl-glossary.md` の `U-61`）に、そのタスクが元の外部 WBS マスタへ戻せなくなることを、選ぶ前から常に示すこと（MUST）'
const MG_10_NOT_A_NOTICE = '通知にしない —— 選ぶ人が選ぶ前に読むものであり、`OK` を押させるものではない'
const T_233_REFUSAL_CARRIES_THE_ROW =
  '取り込みの検証が拒んだとき、`NT-1` の通知が運ぶ理由は、拒んだ 表 T-220 の行の行 ID とすること（MUST）'
const FR_029_CARRY_THE_REASON = '押されたときに限り、行えない理由を通知の仕組みへ運ぶこと（MUST）'
const FR_029_THE_COLUMN_DECIDES =
  'その理由を画面に出すかどうかは同表の表示の仕方の欄が決める —— 薄さが行えないことを既に示しているので、多くの行は出さない'
const FR_029_FALLBACK_HIDDEN = '落ち先が `RS-27` である（出さない）'
const FR_029_OLD_TELL = '行えない理由を通知すること（MUST）'
const NT_7_DROPPED_AS_RS_27 =
  '画面からの書き込み（取り消し・やり直しを含む）は 表 T-233 の `RS-27` として捨て（同行は出さない —— 問いが画面に立っているので、受けなかったことは見える）、`Agent API` の書き込みは 表 T-035 の `AG-9` のとおり拒むこと（MUST）'
const HF_14_NO_TASK_GROUP_WHEN_FAINT = '⛔ 薄いまま押されたときは、そのタスクグループの配下に新しいタスクグループを立てないこと（MUST）'
const HF_14_CARRIES_RS_46 = '運ぶ理由は 表 T-233 の `RS-46` とすること（MUST）'
const FR_019_NOT_MADE = '指す `TaskGroup` が無い縦位置で置こうとしたときは、作らないこと（MUST）'
const FR_019_CARRIES_RS_44 = '運ぶ理由は 表 T-233 の `RS-44` とする'
const FR_019_SEEN_ON_SCREEN = '理由は出さない —— 置かれなかったことは画面で見える'
const WL_9_CARRIES_RS_55 = '何も書かない。運ぶ理由は 表 T-233 の `RS-55`（Chapter 6.1 の 表 T-220 の `IV-4`）'

// WHY: the E-08 words copied from CR-712 section 4, so a word changed in the dictionary alone goes red.
const REASON_WORDS: readonly (readonly [string, string, string, string | null, string | null])[] = [
  ['RS-6', 'いまは変更を受け付けられなかったので、行っていません', 'The change could not be accepted just now, so it was not made', 'もう一度行ってください', 'Try once more'],
  ['RS-8', 'いまは変更を受け付けられなかったので、行っていません', 'The change could not be accepted just now, so it was not made', '先に [Enter] で編集を確定するか、[Esc] で取りやめてください', 'First press Enter to commit the edit, or Esc to cancel it'],
  ['RS-11', 'このファイルは GRS が読める形式（GRS JSON・MSPDI XML・GRS の .html）ではありません', 'This file is not in a format GRS can read (GRS JSON, MSPDI XML or a GRS .html)', '形式とファイルが壊れていないかを確かめてください', 'Check the format, and whether the file is intact'],
  ['RS-69', 'マイルストーンは期間を持たないので、親タスクにはできません', 'A milestone has no span, so it cannot be a parent task', null, null],
  ['RS-77', '工数は書き換えていません', 'The work values were not rewritten', '相手側のアプリで工数を更新してください', 'Update the work in the other application'],
]

// WHY: the E-09 words copied from CR-712 section 4 without its annotations; IV-17 rides on RS-21 and has none.
const IMPORT_REFUSAL_WORDS: readonly (readonly [string, string, string, string, string])[] = [
  ["IV-1", "同じ ID のものが 2 つ以上あるので、このファイルは開けません", "元のファイルの ID の重なりを直してから開いてください", "Two or more items share one ID, so this file cannot be opened", "Fix the repeated IDs in the original file, then open it"],
  ["IV-2", "存在しないものを指している参照があるので、このファイルは開けません", "書き出したときのファイルをそのまま開いてください", "A reference points at something that does not exist, so this file cannot be opened", "Open the file exactly as it was exported"],
  ["IV-3", "ピン止めの記録が存在しないタスクグループを指しているので、このファイルは開けません", "書き出したときのファイルをそのまま開いてください", "A pin record points at a task group that does not exist, so this file cannot be opened", "Open the file exactly as it was exported"],
  ["IV-4", "親タスクと子タスクの関係が輪になっているので、このファイルは開けません", "元のファイルで親タスクと子タスクの関係の輪を解いてから開いてください", "The parents and children of the tasks form a loop, so this file cannot be opened", "Break the loop in the original file, then open it"],
  ["IV-5", "タスクグループの入れ子が段の上限より深いので、このファイルは開けません", "元のファイルで入れ子を浅くしてから開いてください", "Task groups are nested deeper than the level limit, so this file cannot be opened", "Make the nesting shallower in the original file, then open it"],
  ["IV-6", "どのタスクグループにも載っていない（または 2 つ以上に載っている）タスクがあるので、このファイルは開けません", "書き出したときのファイルをそのまま開いてください", "A task sits on no task group (or on more than one), so this file cannot be opened", "Open the file exactly as it was exported"],
  ["IV-7", "暦が 1 つも無いので、このファイルは開けません", "書き出したときのファイルをそのまま開いてください", "The file has no calendar, so it cannot be opened", "Open the file exactly as it was exported"],
  ["IV-8", "名前の無いタスクグループがあるので、このファイルは開けません", "書き出したときのファイルをそのまま開いてください", "A task group has no name, so this file cannot be opened", "Open the file exactly as it was exported"],
  ["IV-9", "塗りと線の両方が透明なものがあるので、このファイルは開けません", "どちらかに色を付けてください", "Something has both its fill and its line transparent, so this file cannot be opened", "Give one of them a colour"],
  ["IV-10", "終了の日が、開始の日より前になっているタスクがあるので、このファイルは開けません", "元のファイルでそのタスクの日付を直してから開いてください", "A task finishes before it starts, so this file cannot be opened", "Fix that task's dates in the original file, then open it"],
  ["IV-11", "フェードが付いているのに終了日の無いタスクがあるので、このファイルは開けません", "元のファイルで終了日を入れるかフェードを外してから開いてください", "A task has a fade but no finish date, so this file cannot be opened", "In the original file, enter a finish date or remove the fade, then open it"],
  ["IV-12", "フェードの日数の和がタスクの期間より長いタスクがあるので、このファイルは開けません", "元のファイルでフェードを短くするか期間を延ばしてから開いてください", "A task's fade days add up to more than its span, so this file cannot be opened", "In the original file, shorten the fades or lengthen the span, then open it"],
  ["IV-14", "日付として読めない値か、扱える範囲の外の日付です", "正しい日付を入れてください", "The value is not a date, or the date is outside the range that can be handled", "Enter a valid date"],
  ["IV-15", "ファイルの中の取り込みの記録が食い違っているので、このファイルは開けません", "書き出したときのファイルをそのまま開いてください", "The import records in the file disagree, so this file cannot be opened", "Open the file exactly as it was exported"],
  ["IV-16", "設定値の上限と下限が逆になっているので、このファイルは開けません", "元のファイルの設定値を直してから開いてください", "A setting's upper and lower limits are the wrong way round, so this file cannot be opened", "Fix the settings in the original file, then open it"],
  ["IV-18", "タスクグループの親子が輪になっているので、このファイルは開けません", "書き出したときのファイルをそのまま開いてください", "The parents and children of the task groups form a loop, so this file cannot be opened", "Open the file exactly as it was exported"],
  ["IV-19", "始まりと終わり（または上と下）が逆のハイライトボックスがあるので、このファイルは開けません", "元のファイルでハイライトボックスの向きを直してから開いてください", "A highlight box has its start and end (or top and bottom) the wrong way round, so this file cannot be opened", "Put the highlight box the right way round in the original file, then open it"],
  ["IV-20", "タスクグループが 1 つも無いので、このファイルは開けません", "書き出したときのファイルをそのまま開いてください", "The file has no task group, so it cannot be opened", "Open the file exactly as it was exported"],
  ["IV-21", "実績の終了が実績の開始より前のタスクがあるので、このファイルは開けません", "元のファイルで実績の日付を直してから開いてください", "A task's actual finish is before its actual start, so this file cannot be opened", "Fix the actual dates in the original file, then open it"],
  ["IV-22", "マイルストーンの形なのにマイルストーンでない（またはその逆の）タスクがあるので、このファイルは開けません", "元のファイルでそのタスクの形とマイルストーンの印を揃えてから開いてください", "A task drawn as a milestone is not a milestone (or the other way round), so this file cannot be opened", "In the original file, make that task's shape and its milestone flag agree, then open it"],
  ["IV-23", "タスクの見た目の記録が欠けているか重なっているので、このファイルは開けません", "書き出したときのファイルをそのまま開いてください", "A task's appearance record is missing or repeated, so this file cannot be opened", "Open the file exactly as it was exported"],
]

/** @purity pure */
function rowWords(list: readonly RowWords[], id: string): RowWords {
  const found = list.find((one) => one.rowId === id)
  if (found === undefined) throw new Error(`display-words.json holds no ${id}`)
  return found
}

describe('E-08 -- the words of the reasons the review rewrote', () => {
  it.each(REASON_WORDS)('%s says what CR-712 chose', (id, textJa, textEn, nextJa, nextEn) => {
    const words = rowWords(DICTIONARY.reasons, id)
    expect(words.text).toEqual({ ja: textJa, en: textEn })
    if (nextJa !== null && nextEn !== null) expect(words.nextStep).toEqual({ ja: nextJa, en: nextEn })
  })

  it('milestoneAchieved in delayReportReasons says what CR-712 chose', () => {
    const words = DICTIONARY.delayReportReasons.find((one) => one.part === 'milestoneAchieved')
    expect(words?.text).toEqual({
      ja: '先行がすべて完了しているので、このマイルストーンは達成済みかもしれない',
      en: 'Every predecessor is complete, so this milestone may already be achieved',
    })
  })

  it('differenceReview is a new part list holding separateNote alone', () => {
    expect(DICTIONARY.differenceReview?.map((one) => one.part)).toEqual(['separateNote'])
    expect(DICTIONARY.differenceReview?.[0]?.text).toEqual({
      ja: '別のものとして取り込むと、このタスクは元の WBS の台帳とつながらなくなり、相手側へ戻せなくなります',
      en: 'Taken in as a separate task, it loses its link to the original WBS ledger and cannot be written back to the other side',
    })
  })
})

describe(`E-09 -- ${T_233_REFUSAL_CARRIES_THE_ROW}`, () => {
  it('the closing of table T-233 still says so', () => {
    expect(REQUIREMENTS).toContain(T_233_REFUSAL_CARRIES_THE_ROW)
  })

  it('every row of the import refusals the review worded has its words', () => {
    expect(IMPORT_REFUSAL_WORDS).toHaveLength(21)
  })

  it.each(IMPORT_REFUSAL_WORDS)('%s says what CR-712 chose', (id, textJa, nextJa, textEn, nextEn) => {
    const words = rowWords(DICTIONARY.invariants, id)
    expect(words.text).toEqual({ ja: textJa, en: textEn })
    expect(words.nextStep).toEqual({ ja: nextJa, en: nextEn })
  })
})

describe(`MG-10 -- ${MG_10_ALWAYS_ON_U_61}`, () => {
  it('table T-032 MG-10 reads as CR-712 E-08 wrote it', () => {
    const mg10 = specTable('T-032').rows.find((one) => one.id === 'MG-10')
    const said = (mg10?.cells ?? []).join(' ').replace(/\*\*/g, '')
    expect(said).toContain(MG_10_ALWAYS_ON_U_61)
    expect(said).toContain(MG_10_NOT_A_NOTICE)
  })
})

describe('E-03 -- the sentences a hidden row would break are rewritten to carry, not tell', () => {
  it('FR-029 carries the reason and lets the display column decide; the old tell is gone everywhere', () => {
    expect(REQUIREMENTS).toContain(FR_029_CARRY_THE_REASON)
    expect(REQUIREMENTS).toContain(FR_029_THE_COLUMN_DECIDES)
    expect(REQUIREMENTS).toContain(FR_029_FALLBACK_HIDDEN)
    expect(REQUIREMENTS).not.toContain(FR_029_OLD_TELL)
    expect(REQUIREMENTS).toMatch(/行えない理由を通知の仕組みへ運ぶこと（MUST）[」』]と両立しない/)
  })

  it('NT-7 drops a screen write as RS-27 without showing it', () => {
    expect(REQUIREMENTS).toContain(NT_7_DROPPED_AS_RS_27)
  })

  it('HF-14 stands no row when faint, carrying RS-46', () => {
    expect(REQUIREMENTS).toContain(HF_14_NO_TASK_GROUP_WHEN_FAINT)
    expect(REQUIREMENTS).toContain(HF_14_CARRIES_RS_46)
  })

  it('FR-019 makes nothing and carries RS-44 without showing it', () => {
    expect(REQUIREMENTS).toContain(FR_019_NOT_MADE)
    expect(REQUIREMENTS).toContain(FR_019_CARRIES_RS_44)
    expect(REQUIREMENTS).toContain(FR_019_SEEN_ON_SCREEN)
  })

  it('FR-016 and HB-3 carry RS-44 and no longer tell it', () => {
    expect(REQUIREMENTS).toContain('`RS-44` を運ぶ')
    expect(REQUIREMENTS).not.toContain('`RS-44` を告げる')
  })

  it('PTL-9 carries RS-55', () => {
    expect(REQUIREMENTS).toContain(WL_9_CARRIES_RS_55)
    expect(REQUIREMENTS).not.toContain('`RS-55` を告げる')
  })
})
