// CR-710 wave 1 (spec-only): the MUST clauses of FR-011, FR-012, FR-054 and FR-088 that the cr-710-w1 cases exercise, held as the manuscript writes them.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const MANUSCRIPT = readFileSync(join(process.cwd(), 'docs', 'spec', '01-04-requirements.md'), 'utf8')

const CLAUSES: readonly (readonly [string, string])[] = [
  ["FR-011", "`GRS` は、間にある非稼働日を、実績の長さに数えないこと。"],
  ["FR-011", "`GRS` は、実績の長さを文書の列に持たないこと。"],
  ["FR-011", "`GRS` は、交換相手から取り込むとき、`ActualFinish` を `actualFinish` へ置くこと。"],
  ["FR-011", "`GRS` は、交換相手から取り込むとき、`Stop` を `stop` へ置くこと。"],
  ["FR-011", "`actualDuration` を持ち `stop` を持たない以前の版の `GRS JSON` を開くとき、`GRS` は、`IMPS-420` と同じ読みで `stop` を置いて開くこと。"],
  ["FR-011", "`GRS` は、実績の開始と終わりが同じ日の 08:00 〜 17:00 であるとき、実績を 480 分（1d）とし、0 日としないこと（`IMPS-412` の数え方、既定の時間帯の暦）。"],
  ["FR-012", "`GRS` は、完了率を人に直接入力させないこと。"],
  ["FR-012", "`GRS` は、予定の期間が 0 の `Task` で割り算を行わないこと。"],
  ["FR-012", "`GRS` は、予定の期間が 0 の `Task` に、`actualFinish` があれば 100 を、無ければ 0 を格納すること。"],
  ["FR-012", "稼働日の暦が変わったとき、`GRS` は、完了率の数え直しを暦の変更と同じ書き込みの中で行うこと。"],
  ["FR-012", "`GRS` が `GRS JSON` を読んだとき、`GRS` は、格納済みの完了率を日付から数え直すこと。"],
  ["FR-012", "`GRS` は、`MSPDI` を読んだときに完了率を数え直さないこと。"],
  ["FR-012", "`GRS` は、完了率の型を整数とすること。"],
  ["FR-012", "`GRS` は、完了率を 0 〜 100 に丸めないこと。"],
  ["FR-054", "時間も同じ暦に従うこと。  \n1 日を何時間と決め打ちしてはならない（MUST NOT）"],
  ["FR-054", "はない。**  \n交換相手の期間（時間の量）は分のまま読み、日へ丸めないこと（MUST）"],
  ["FR-054", "）は列に持たず、開始から終了までの、文書の暦の稼働時間の合計（分）とすること（MUST）"],
  ["FR-054", "ject.minutesPerDay`（空なら `S-128`）分とすること（MUST）"],
  ["FR-054", "現地の時刻として読むこと（MUST）。  \n時差を換算してはならない（MUST NOT）"],
  ["FR-054", "ータのタイムゾーンが決める。  \n保存する日時の最小単位は 1 分とすること（MUST）"],
  ["FR-054", "りに終わる（利用者の判断）。  \n類推で終業の時刻へ補ってはならない（MUST NOT）"],
  ["FR-054", " ／ `AT-159`、交換相手の `WorkingTimes`）とすること（MUST）"],
  ["FR-054", "` の 表 T-209 の `S-580` の時間帯を持つものとして読むこと（MUST）"],
  ["FR-054", "  \n日時どうしが同じか・どちらが先かは、日付と時刻の対（瞬間）で比べること（MUST）"],
  ["FR-054", "だ終了の側の値が `00:00:00` のときは、字面どおりの瞬間と読むこと（MUST）"],
  ["FR-054", "58`）は、開始の側はその瞬間の日、終了の側は 1 分前の瞬間の日とすること（MUST）"],
  ["FR-054", "を開いたときは、表 T-233 の `RS-89` を 1 度だけ告げること（MUST）"],
  ["FR-088", "う組を持つ曜日（交換相手から取り込んだもの）を、面で直してはならない（MUST NOT）"],
  ["FR-088", "roject` の両方に及ぶときも、まとめて 1 回の書き込みで確定すること（MUST）"],
  ["FR-088", "を持たない稼働の曜日、新しく稼働にした曜日、面で足した稼働の例外日に書くこと（MUST）"],
  ["FR-088", "oject.calendarUid` に指させてから、曜日と例外日を書くこと（MUST）"],
  ["FR-088", " 1 つも持たない暦を、文書の暦（`FR-054`）にしてはならない（MUST NOT）"],
  ["FR-088", "54`）にしてはならない（MUST NOT）。  \n受け付けずに通知すること（MUST）"],
  ["FR-088", "期間の計算がすべて動く**ので、影響する `Task` の件数を通知すること（MUST）"],
]

describe('the clauses the cr-710-w1 cases are built from', () => {
  it.each(CLAUSES)('%s: %s', (_requirement, clause) => {
    expect(MANUSCRIPT).toContain(clause)
  })
})
