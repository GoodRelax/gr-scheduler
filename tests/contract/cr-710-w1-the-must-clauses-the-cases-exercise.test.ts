// CR-710 wave 1 (spec-only): the MUST clauses of FR-011, FR-012, FR-054 and FR-088 that the cr-710-w1 cases exercise, held as the manuscript writes them.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const MANUSCRIPT = readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8')

const CLAUSES: readonly (readonly [string, string])[] = [
  ["FR-011", "を示す（利用者の判断）。  \n⛔ 間にある非稼働日を数えてはならない（MUST NOT）"],
  ["FR-011", "-11`）は、この長さを読む —— 長さを文書の列に持ってはならない（MUST NOT）"],
  ["FR-011", "`actualFinish` へ、`Stop` を `stop` へ置くこと（MUST）"],
  ["FR-011", " `stop` を持たないときも、同じ読みで `stop` を置いて開くこと（MUST）"],
  ["FR-011", "る（下の段の数え方、既定の時間帯の暦）。  \n0 日としてはならない（MUST NOT）"],
  ["FR-012", "いずれも稼働時間の分）で算出して格納し、**人に直接入力させないこと（MUST NOT）"],
  ["FR-012", "️ 予定の期間が 0 の `Task` では割り算を行ってはならない（MUST NOT）"],
  ["FR-012", "`actualFinish` があれば 100、無ければ 0 を格納すること（MUST）"],
  ["FR-012", " の `RS-52` が持つ。  \n⛔ 暦の変更と同じ書き込みの中で行うこと（MUST）"],
  ["FR-012", "`GRS JSON` を読んだときも、格納済みの完了率を日付から数え直すこと（MUST）"],
  ["FR-012", "さない。  \n⛔ `MSPDI` を読んだときは数え直してはならない（MUST NOT）"],
  ["FR-012", " が持つ。  \n型は整数とし、**0 〜 100 に丸めてはならない（MUST NOT）"],
  ["FR-054", "時間も、非稼働日を描くのと同じ暦に従わせること。<br>`GRS` は、1 日を何時間と決め打ちしないこと。"],
  ["FR-054", "`GRS` は、交換相手の期間（時間の量）を分のまま読み、日へ丸めないこと"],
  ["FR-054", "`GRS` は、所要（タスクの長さ）を列に持たず、開始から終了までの、文書の暦の稼働時間の合計（分）とすること"],
  ["FR-054", "`GRS` は、所要を `d` で見せ、`d` で打たせるときの 1d を `Project.minutesPerDay`（空なら `S-128`）分とすること"],
  ["FR-054", "現地の時刻として読むこと。<br>`GRS` は、時差を換算しないこと"],
  ["FR-054", "`GRS` は、保存する日時の最小単位を 1 分とすること。"],
  ["FR-054", "りに終わる（利用者の判断）。<br>`GRS` は、終了の側の `00:00:00` を類推で終業の時刻へ補わないこと。"],
  ["FR-054", " ／ `AT-159`、交換相手の `WorkingTimes`）とすること。"],
  ["FR-054", "`GRS` は、稼働日で時間帯を持たない日を、`_assets/tbl-settings.md` の 表 T-209 の `S-580` の時間帯を持つものとして読むこと。"],
  ["FR-054", "`GRS` は、日時どうしが同じか・どちらが先かを、日付と時刻の対（瞬間）で比べること。"],
  ["FR-054", "⭐ `GRS` は、取り込んだ終了の側の値が `00:00:00` のとき、字面どおりの瞬間と読むこと"],
  ["FR-054", "58`）を、開始の側はその瞬間の日、終了の側は 1 分前の瞬間の日とすること"],
  ["FR-054", "を開いたとき、`GRS` は、表 T-233 の `RS-89` を 1 度だけ告げること。"],
  ["FR-088", "う組を持つ曜日（交換相手から取り込んだもの）を、面で直させないこと"],
  ["FR-088", "roject` の両方に及ぶときも、`GRS` は編集をまとめて 1 回の書き込みで確定すること"],
  ["FR-088", "を持たない稼働の曜日、新しく稼働にした曜日、面で足した稼働の例外日に書くこと。"],
  ["FR-088", "oject.calendarUid` に指させてから、曜日と例外日を書くこと。"],
  ["FR-088", " 1 つも持たない暦を、文書の暦（`FR-054`）にしないこと。"],
  ["FR-088", "稼働する曜日を 1 つも持たない暦を受け付けずに通知すること"],
  ["FR-088", "暦が変わったとき、`GRS` は、影響する `Task` の件数を通知すること。"],
]

describe('the clauses the cr-710-w1 cases are built from', () => {
  it.each(CLAUSES)('%s: %s', (_requirement, clause) => {
    expect(MANUSCRIPT).toContain(clause)
  })
})
