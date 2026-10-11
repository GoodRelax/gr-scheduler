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
