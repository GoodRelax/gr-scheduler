# CR-670 —— 遅延診断レポートは日付の範囲を「 - 」でつなぎ、理由をすべて語で告げる

> 起草の状態: 当てた（2026-10-04、調整役の統合点 `032c9ce4` から早送りした作業木、持ち場 L3）。起草と当てを同じ作業木で行った。
> ID の帯: 番号 `CR-670`、裁定の帯 `JDG-1445`〜`JDG-1447`、保留の帯 `PND-747`〜`PND-748`、台帳の帯 `DFC-2088` は調整役から受けた（13 節で、木のどこにも無いことを測った）。使ったのは `PND-747`・`PND-748`・`DFC-2088`。`JDG-1445`〜`JDG-1447` は使わない —— 本書で利用者の新しい言葉は受けていない（裁定の行は逐語の置き場である）。仕様の新しい識別子は取らない（2 節）。
> 閉じるもの: `JDG-1246`（と `JDG-1245` の 9）、`DFC-1882`、`DFC-1940`、`DFC-1772`、`DFC-1941` の残り（まとめの絵の幅の空き）。開いたまま残すもの: `DFC-1942`（語の確かめ —— `PND-747` で 1 度に問う）。
> 覆すもの: `JDG-997` の問い 4 の「～」—— `JDG-1246` が既に `覆された（一部）` の印を付けた（12 節）。
> ⛔ 触れないもの: 検索パネルの面（`search-panel.ts`・`search-table-filters.ts` —— `CR-661` の続きの持ち場）。`search-panel-drawing.ts` は 2 つの窓が共に使う描画であり、まとめの 1 行の分岐だけを変えた（5 節）。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 利用者の裁定の逐語（全文は `docs/development-records/rulings.md` の該当行）

| 裁定 | 逐語 | 本書での扱い |
|---|---|---|
| `JDG-1245` の 9 | 「どちらも「 - 」 (Recommended)」 | `DT-5`・`DT-6` のつなぎを「 - 」に（E-01） |
| `JDG-1246` | 「どちらも「 - 」のまま」 | 同じ。`JDG-997` 問い 4 の「～」は利用者自身の言葉だったと示したうえでの答え |

`rulings.md` を「〜」「～」「範囲」「つなぎ」「 - 」で引いた。`JDG-874`（説明の期間は m/d (曜日) - m/d (曜日)）と食い違わない —— 同じつなぎに揃う。`JDG-1018`（日付は yyyy/mm/dd）は変わらない。

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

⭐ **`GL-006`**（読まずに使える） —— 理由の欄が `VC-4` のような行 ID ではなく「マイルストーンなのに開始と終了が違う」と告げれば、仕様を開かずに直す所がわかる。日付の範囲が説明とレポートで同じ形なら、2 つの面を同じ読み方で読める。

### ② レビュー観点のどの条項を当て、何が出たか

- **`R1.3`（唯一の正）** —— 語の正は辞書（`docs/spec/_source/display-words.json`）だけである。観点の語と壁の語は、表の行ごとに 1 つ、辞書の新しい 2 節に置く。行の並びは生成器が表 T-310 ・ T-311 ・ T-316 から毎回読む（`delayReportColumns` が表 T-347 を読むのと同じ形）。
- **`R2.14`（POLA）** —— 壁の理由が原因の行にしか出ず、紫になった下流の行の理由が空だった（`DFC-2088`）。`DT-7` は「壁の語と原因の `Task` の名前」と言う —— 原因の名前を告げるのは、原因でない行のためである。⇒ 壁の止まった範囲のどの行にも出す。

### ③ 利用者に問わずに決めたこと

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| X-1 | 進行中の実績日は「yyyy/mm/dd -」（終わりの日を空けたつなぎ。末尾の空白は書かない） | `JDG-1246` のつなぎ「 - 」から終わりの日を除いた形。末尾の空白は表のセルでも Markdown でも見えない | 「yyyy/mm/dd - 」や「yyyy/mm/dd -」以外の形を利用者が望めば 1 行の直し（`PND-748`） |
| X-2 | 観点の語（20 行）と壁の語（3 行）の ja は表の `観点` ・ `告げる語` ・ `原因` の欄を短くした字、en は体が書いた | 辞書は「語は利用者が書く」と言う。lane の指示で推奨を当て、語の表を 1 度に問う（`PND-747`、`DFC-1942`） | 利用者が替えれば辞書の 1 か所の直し |
| X-3 | `VS-6` は観点の語を持たない | `VS-6` は 表 T-311 の自分の告げる語（`parentProgressOutside`）で告げる。同じ行に 2 つの語を置かない | 無い |
| X-4 | `VS-6` の告げる語の中の範囲「{最も左} 〜 {最も右}」も「 - 」でつなぐ（ja も en も） | `JDG-1245` の 9「説明もレポートと検索の表も「 - 」」—— この語はレポートの理由の欄に出る日付の範囲である。語は体が書いたもの（`CR-651`）で、利用者の逐語ではない | en の「to」が「-」になる |
| X-5 | Markdown の絞り込みの条件（日付の列の「いつから・いつまで」）も「 - 」でつなぐ | `RW-6` は形を名指さないが、同じ窓の日付の範囲を 2 つの形で書かない | 無い |
| X-6 | `DX-6` に範囲の `uid` の列を足す（`AM-19` の値が増える） | `DT-7` の壁の理由を範囲の行に出すには、どの行がどの壁で止まったかが要る。`AM-19` は 表 T-317 の値そのもの | `AM-19` の答えが少し長くなる |

---

## 1. 範囲 —— 行き先

| 何 | 仕様で変える所 | 編集 |
|---|---|---|
| 日付の範囲のつなぎ | `docs/spec/01-04-requirements.md` の 表 T-347 の `DT-5`・`DT-6` | E-01 |
| `VS-6` の告げる語の範囲 | 同 表 T-311 の `VS-6` の `告げる語`、辞書の `parentProgressOutside` | E-02 |
| 理由の欄の語の出どころ・壁の理由を出す行 | 同 表 T-347 の `DT-7` | E-03 |
| 壁の範囲 | 同 表 T-317 の `DX-6` | E-04 |
| 観点の語・壁の語 | `docs/spec/_source/display-words.json` に `delayReportAspects`（20 項目）・`delayReportWalls`（3 項目） | E-05 |
| 日付の列の既定の幅 | `docs/spec/_source/settings.json`（表 T-206）の `S-479`・`S-480` を 143 → 142（測った、7 節） | E-06 |

**数**: 表の行の増減 0。要求の増減 0。図 0。升の書き換え 6（`DT-5`・`DT-6`・`DT-7`・`DX-6`・`VS-6`、`S-479`・`S-480` の既定）。辞書の項目 +23。

---

## 2. 新しい識別子

仕様の識別子は取らない。辞書の節の名 2 つ（`delayReportAspects`・`delayReportWalls`）は節の鍵であり、行 ID ではない。

---

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

| 場所 | 消す文 | 代わり |
|---|---|---|
| `DT-5` の書き方 | 「yyyy/mm/dd〜yyyy/mm/dd。」 | 「yyyy/mm/dd - yyyy/mm/dd —— 2 つの日を、半角空白 1 つ、`-`、半角空白 1 つでつなぐ（バーの説明の 表 T-348 の `TL-5` と同じつなぎ）。」 |
| `DT-6` の書き方 | 「進行中は「yyyy/mm/dd〜」」 | 「進行中は「yyyy/mm/dd -」（終わりの日を空けたつなぎ）」 |
| `VS-6` の告げる語 | 「（{最も左} 〜 {最も右}）」 | 「（{最も左} - {最も右}）」 |
| `DT-7` の値 | 「`DX-3` の観点の語（辞書）と判定に使った値、または 表 T-316 の壁の語と原因の `Task` の名前。」 | 「`DX-3` の観点の語（辞書の、表 T-310 ・ 表 T-311 の行ごとに 1 つの語 —— `VS-6` は 表 T-311 の自分の告げる語で告げる）と判定に使った値、または 表 T-316 の壁の語（辞書の、行ごとに 1 つの語）と原因の `Task` の名前 —— 壁の止まった範囲（`DX-6`）のどの行にも出す（原因の行にも、紫になった下流と候補の親の行にも）。」 |
| `DX-6` の中身 | 「壁ごとに: 表 T-316 の行、原因の `Task`、止まった範囲の件数」 | 「…止まった範囲の件数と、範囲の `Task` の `uid` の列（原因を含む）」 |
| `S-479`・`S-480` の既定 | 143 | 142 |
| コードの `DEVIATION` | `delay-diagnostics-report.ts` の 2 つ（`DFC-1940`）、`delay-diagnostics-report-table.ts` の 1 つ（`DFC-1772`） | 消す（5 節） |

---

## 4. 書き直す所

<!-- EDIT id=E-01 file=docs/spec/01-04-requirements.md -->
表 T-347 の `DT-5` と `DT-6` の `書き方` を 3 節の表のとおりに替える。

<!-- EDIT id=E-02 file=docs/spec/01-04-requirements.md -->
表 T-311 の `VS-6` の `告げる語` の範囲を「 - 」にする。辞書の `delayReportReasons` の `parentProgressOutside` も ja・en とも同じ（`tests/unit/cr-648-*` の 1 件が 2 つの字の一致を見ている）。

<!-- EDIT id=E-03 file=docs/spec/01-04-requirements.md -->
表 T-347 の `DT-7` の `値` を 3 節の表のとおりに替える。

<!-- EDIT id=E-04 file=docs/spec/01-04-requirements.md -->
表 T-317 の `DX-6` の `中身` を 3 節の表のとおりに替える。

<!-- EDIT id=E-05 file=docs/spec/_source/display-words.json -->
末尾に 2 つの節を足す（ja ／ en）。生成器（`tools/generate_display_words.py`）は鍵の並びを表から読む —— `delayReportAspects` は 表 T-310 と 表 T-311 の行（`VS-6` を除く）、`delayReportWalls` は 表 T-316 の行。

| 行 | ja | en |
|---|---|---|
| `VC-1` | 依存に輪がある | The dependencies form a loop |
| `VC-2` | 同じタスクを先行と後続にする依存（自己依存） | A dependency links a task to itself |
| `VC-3` | 同じ 2 つのタスクの間に依存が 2 本以上ある | Two or more dependencies join the same two tasks |
| `VC-4` | マイルストーンなのに開始と終了が違う | A milestone whose start and finish differ |
| `VC-5` | 完了率が 0 より大きいのに実績開始が無い | Progress above 0 but no actual start |
| `VC-6` | 実績終了があるのに実績開始が無い | An actual finish but no actual start |
| `VC-7` | 未着手なのに中断または再開の日を持つ | Not started but has a stop or resume date |
| `VC-8` | 実績終了があるのに再開の日が有効 | An actual finish but the resume date is still valid |
| `VC-9` | 親が完了なのに、子に未完了がある | The parent is finished but a child is not |
| `VC-10` | 子が全部完了なのに、親が未完了 | Every child is finished but the parent is not |
| `VC-11` | 親の予定の両端が、子の両端と違う | The parent's planned ends differ from its children's |
| `VC-12` | 親の実績の両端が、子の両端と違う | The parent's actual ends differ from its children's |
| `VC-13` | 後続が完了しているのに、依存が縛る先行の端がまだ起きていない | The successor is finished but the predecessor end it waits for has not happened |
| `VC-14` | 手で完了にしたマイルストーンの先行に、未完了がある | A milestone finished by hand has an unfinished predecessor |
| `VC-15` | 予定の日付が依存の向きに反する | The planned dates go against a dependency |
| `VS-1` | 親子の関係にある 2 つのタスクの間に依存がある | A dependency joins a parent and its own child |
| `VS-2` | この行を束ねる上位タスクが無い | No summary task holds this row |
| `VS-3` | 先行が未着手なのに、後続が着手済み | The predecessor has not started but the successor has |
| `VS-4` | 実績の日付が依存の向きに反する | The actual dates go against a dependency |
| `VS-5` | 実績の日付が基準日より後 | An actual date is after the status date |
| `DW-1` | 矛盾があるので、依存の下流を解析できない | A contradiction stops the analysis downstream |
| `DW-2` | 親が決まらないので、遅れを祖先へ上げられない | No single parent, so the delay is not passed up |
| `DW-3` | 先行の無いマイルストーンは診断できない | A milestone with no predecessor cannot be diagnosed |

⭐ ja の出どころ: `VC-*` と `VS-1`・`VS-4`・`VS-5` は表の `観点` の欄の最初の文から列の名と注を除いた字、`VS-2`・`VS-3` は 表 T-311 の `告げる語` の字そのまま、`DW-*` は 表 T-316 の `原因` と `止まる範囲` を 1 文にした字。

<!-- EDIT id=E-06 file=docs/spec/_source/settings.json -->
`S-479`・`S-480` の `default.num` を "142" にする（7 節）。

---

## 5. コード

| ファイル | 変えたこと |
|---|---|
| `src/entity/document-model/schedule/delay-diagnostics.ts` | `DelayDiagnosticsReport` に `lateDays`（`DX-10`: `PM-4` が成り立つ `Task` ごとに `uid`・表 T-021b の行・稼働日の数 —— `task-delay.ts` の `delayStart` ・ `delayWorkingDays` を引く。重ねて書かない）。`AnalysisWall` に `stoppedUids`（`DX-6`） |
| `src/entity/document-model/schedule/delay-diagnostics-report-table.ts` | `DG-4` の理由に `DX-10` の日数を載せる（`DEVIATION` を消した）。壁の理由は、範囲（`stoppedUids`）に入る行すべてに、原因の名前（`causeName`）と一緒に載せる |
| `src/adapter/screen-renderer/delay-diagnostics-report.ts` | つなぎ「 - 」と開いたつなぎ「 -」、観点の語と壁の語を辞書から（語の無い行は行 ID —— 生成器の banner のとおり）、`DG-4` の理由に辞書の `late` の文型（`DEVIATION` 2 つを消した）。まとめの行の絵: ステータスの行は `glyph` を持ち（絵の無いステータスは `null` ＝ 絵の幅を空ける）、基準日と解析できなかった件数の行は `glyph` を持たない（`RW-4`「疑義・記載漏れと確定は絵の幅だけ空ける」） |
| `src/framework/dom-screen-surface/search-panel-drawing.ts` | `summaryItemElement` の分岐を 1 つ: `glyph` が無ければ字だけ、`null` なら空の絵の箱（幅 1em）＋字 |
| `tools/generate_display_words.py` | 2 つの節を表から読む |

⭐ **毎フレームの経路: はい** —— `search-panel-drawing.ts`・`delay-diagnostics-report.ts` に触れる。窓の表とまとめは中身が変わったときだけ描き直し、まとめの項目 2 つに空の箱が 1 つずつ増える。理由の欄の語の引きは `Map` の 1 回。`perf-pending.md` に 1 行（92）。

---

## 6. グラフ（`032c9ce4`）

- `impact.py DT-5`: 要求 2 件（`FR-002` の `ND-5` が日の書き方を指すだけ、`FR-134`）・参照 4（`S-479` の節）。
- `impact.py DT-6`・`DT-7`・`DX-6`: 要求 1 件ずつ（`FR-134`）。`DT-7` は表 T-064 の公開の説明 1 か所が名を引くだけ。
- `VS-6` の告げる語を写す所: 辞書の `parentProgressOutside` と `tests/unit/cr-648-*`（字の一致）。

---

## 7. 数の予測と測った数

**既定の幅（測った、手元の Windows 11 の Chromium、字は `S-246`）** —— 測り方は `CR-660` の 7 節と同じ（セルの形: 左右の詰め 0.25em・罫 1px・折り返さない、`table-layout:auto`、字の段 9・10・12 px、0〜9 の各数字を並べた日付）。同じ測りで旧の形を測り、143 を再現してから新の形を測った。

| 列 | 行 | 旧の形 | 旧 | 新の形 | 新 |
|---|---|---|---|---|---|
| `DT-5` 予定日 | `S-479` | `dddd/dd/dd〜dddd/dd/dd` | 142.20 → 143 | `dddd/dd/dd - dddd/dd/dd` | 141.58 → **142** |
| `DT-6` 実績日 | `S-480` | 同 | 143 | 同（開いた形 `dddd/dd/dd -` は 77.19） | **142** |

見出しは en「Planned Dates」＋ `IC-122` で 102 —— 値より狭い。

| 数 | 前 → 後 | 測り方 |
|---|---|---|
| 辞書の項目 | 803 → 826（書かれた 758 → 781） | `npm run words` の出力 |
| `src` の `DEVIATION`（`DFC-1940`・`DFC-1772`） | 3 → 0 | `git grep -n "DFC-1940\|DFC-1772" -- src` |

---

## 8. 波

| 波 | 持ち場 | 中身 |
|---|---|---|
| 1 | 仕様 ＋ 生成 | E-01〜E-06、`npm run gen` |
| 2 | コード ＋ 試験の書き直し | 5 節・9 節 |
| 3 | 台帳 | 12 節 |

---

## 9. 仕様の外で直すもの

- `tests/unit/cr-617-the-delay-diagnostics-report-window.test.ts`: 進行中の実績日の主張「2026/01/05〜」→「2026/01/05 -」（`DT-6` の新しい書き方を指す）。
- `tests/unit/cr-617-*`・`tests/unit/cr-648-*`・`tests/contract/cr-660-*` の作り置きの報告に `lateDays: []` を足す（型が求める欄。主張は変えない）。
- 生成物: `src/adapter/screen-renderer/display-words.json`、`docs/spec/_assets/tbl-settings.md`、`src/framework/dom-screen-surface/dom-screen-surface.ts` の `NOT_STORED_SEARCH_PANEL_SIZES`、`docs/review/public-entry-index.md`（`npm run gen`）。

---

## 10. ⛔ この変更でやらないこと

- 検索パネルの面（`CR-661` の続き）。検索の表は日付の範囲を 1 つのセルに持たない（`SQ-3`・`SQ-4`・`SQ-12`・`SQ-13` は 1 つの日）—— つなぎは現れない。
- 判定に使った値の書き方（`DT-7` の「判定に使った値」は、いま列の名 ＝ 値の並び —— 例 `start=2027-05-03T08:00:00`）。列の名は `MSPDI` の名で英語のまま —— `PND-747` の問いに含める。
- `CR-617`・`CR-648`・`CR-651`・`CR-660` には追補しない。

---

## 11. 利用者に問うこと

1. 観点の語 20 と壁の語 3（4 節 E-05 の表）と、`DFC-1942` の英語の語 —— このままでよいか（`PND-747`）。⭐ 推奨: ja はこのまま（表の字）、en は利用者が目を通す。
2. 進行中の実績日を「yyyy/mm/dd -」と書くこと（`PND-748`）。⭐ 推奨: このまま。

---

## 12. 台帳

| 行 | 本書での扱い |
|---|---|
| `JDG-1246` | 適用済、着地先は 表 T-347 の `DT-5`・`DT-6` |
| `JDG-1245` | 9 だけ着地（7 は `DFC-1881`、10 は `DFC-1883` —— どちらも本書の外）。状態の欄に一部の着地を書き足す |
| `JDG-997` | 問い 4 の「～」は `JDG-1246` が既に `覆された（一部）` にした —— 書き換えない |
| `DFC-1882` | `実測待ち`（手順は行に） |
| `DFC-1940` | `実測待ち`（語は `PND-747` で確かめる） |
| `DFC-1941` | `実測待ち` のまま。残っていたまとめの絵の幅の空きを当てた |
| `DFC-1942` | `裁定待ち` のまま。本書の語を表に足し、`PND-747` を指す |
| `DFC-1771` | `実測待ち` のまま（`CR-648` が当てた）。本書は触れない |
| `DFC-1772` | `実測待ち` |
| `DFC-2088` | 新: 壁の理由が原因の行にしか出なかった。本書が当てた —— `実測待ち` |
| `PND-747`・`PND-748` | 新（11 節の問い） |

---

## 13. 測り方の再現

```
git grep -n -e "CR-670" -e "JDG-144[5-7]" -e "PND-74[78]" -e "DFC-2088"   # 0 before drafting
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py DT-5 DT-6 DT-7 DX-6 DX-10 VS-6 S-479 S-480
# widths: a scratch Playwright script (not in the tree), the CR-660 section 7 method, old and new joins side by side.
npm run gen && npm run gen:check
npm run typecheck
grep -n "〜\|～" src/adapter/screen-renderer/delay-diagnostics-report.ts docs/spec/_source/display-words.json   # 0
```
