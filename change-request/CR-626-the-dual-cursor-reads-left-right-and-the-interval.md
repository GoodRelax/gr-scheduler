# CR-626 — 2 本カーソルの読みは 左・右・間隔 の 3 行になり、間隔は年・か月・日と日数を 1 行で示す

> 起草の状態: 起草のみ（2026-10-01、枝 `l4-review-crs`）。まだ当てていない。4 節の旧 4 件は、読んだ木でどれも 1 回だった（13 節）。
> 読んだ木: `refactor` `bfbe7eb7`。行番号・数は、すべてこの木で測った（13 節）。
> ID の帯: 調整役から受けた（`CR-626` だけ）。⭐ 本書は仕様の新しい識別子を 1 つも取らない（2 節）。
> ⛔ 当てる順: `CR-624` → `CR-625` → **本書**。E-01・E-02 は `CR-625` が書き換える 表 T-029a の `DC-3` の同じ行の中にある（置き方の文。4.1 節「重なり」）。日付の書き方 `yyyy/mm/dd (曜日)` は `CR-625`、曜日の語は `CR-624` が持つ —— 本書は指すだけで、2 度定めない（5 節の継ぎ目）。
> 閉じるもの: `DFC-1345`（`JDG-875`・`JDG-923`・`JDG-925`）。⚠️ `JDG-325` を一部覆す（0.1 節）。11 節の問い 2 つは推奨で書いた。
> ⛔ 触れないもの: 遅延診断のマーカーとレポート（`CR-616`・`CR-617` の起草）。`DC-3` の置き方の文（`CR-625`）。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 利用者の裁定の逐語

| 裁定 | 逐語（`docs/development-records/rulings.md` から写した） | 本書での扱い |
|---|---|---|
| `JDG-875` | 「#26 デュアルカーソルの日付が微妙。カーソルA/Bの意味が分かりづらいし、左右入れ替わっても間隔が-にならないし<br>左  : yyyy/mm/dd (曜日)<br>右  : yyyy/mm/mm (曜日)<br>間隔: yyyy/mm/dd (曜日)<br>      xxx days<br>とせよ。 これなら間隔は必ず正の値になるだろ？」 | 本書の骨格。3 行を 左・右・間隔 と名づけ、左右は日付の順とする（E-01・E-03）。逐語の「yyyy/mm/mm」は「yyyy/mm/dd」の打ち違いと読む（`DFC-1345` の読み）。間隔の行の「yyyy/mm/dd (曜日)」と 2 行の形は `JDG-925` が置き換えた |
| `JDG-923` | 「日付は yyyy/mm/dd のゼロ埋め  の意味が分からない。   days だけだとだめ。  (例)793days が何年何か月か暗算するのはきつい。」 | 間隔は日数だけにせず、年と月に直した値も並べる。⭐ 今の `DC-3` の年・月・日の数え方（`CR-550` 決定 3）をそのまま使う（E-01） |
| `JDG-925` | 「ゼロ埋めはあり。<br><br>間隔:  <br> 2年 2か月 3日   ( 793 days) <br> 2y 2m 3d  (793 days)<br> と 改行なしで1行にまとめろ。」 | 日付は 0 を詰める（`JDG-325` の「詰めない」を覆す）。間隔は 1 行: ja「2年 2か月 3日 (793 days)」／ en「2y 2m 3d (793 days)」（E-01・E-03）。空白の数は 決定 4 で揃えた |
| `JDG-325` | ①「カーソルAの日付: yyyy/m/d<br>カーソルBの日付: yyyy/m/d<br>カーソルA-Bの期間: yyyy/m/d」<br>②「F6 : B 年・月・日 という意味で yyyy/m/d (xx days)」（どちらも抜き書き。全文は同行） | ⚠️ **一部を覆す。** 覆すのは 3 つ: 1 行目・2 行目をカーソル A・B（`date1`・`date2`）で名づけること（`JDG-875`）、日付の月と日に 0 を詰めないこと（`JDG-925`）、間隔を `y/m/d (n days)` の記号で書くこと（`JDG-925`）。⭐ **残すもの**: ポインタのそばに 3 行を小さく示すこと、3 行目が 2 つの日付のあいだの長さであること、その中身が「年・月・日 と日数」（② の B）であること、数え方が差であること（4/1 と 4/15 は 14 日）、追従している側の日付はその線がいま立っている日であること、書き出しに出さないこと |
| `JDG-379` | 「…カーソルに追従する日付情報のフォントは今の50%」（2026-09-23。項目 12 の抜き書き） | 変えない。字の大きさは `S-334`（E-01 の旧・新の外） |
| `JDG-398` | 「7. カーソルに付いてくる日付 →提案通り」 | 変えない。字の下限は `S-340`（E-01 の旧・新の外） |
| `JDG-898` | 「[6/3]には名札を付けない。   日・英表示を切り替えて変わるのはメニューやTipsだけにするため。」 | 変えない。同行の読み「曜日は説明とカーソルの読みにだけ付ける」が、本書の日付に曜日が付くことと合う |
| `JDG-324` | 「英語は治安通り」 | 先例。`CR-550` の en の語は提案どおりに採られた。⚠️ 本書の en の見出し（Left ほか）は利用者の字ではない ⇒ 問い 2 |

`CR-550`（当てた。2026-09-22）: `DC-3` と辞書の節 `dualCursorReadout` を作った変更要求。残すもの —— 月数 k の数え方（決定 3）、`(1 day)`（11.1 節の 4）、ja の括弧の中の英語 `days`（11.1 節の 3）、決まっていない日付を `—` で示すこと（決定 8）、置き方と字の大きさ（`CR-625` と `S-334`・`S-340` が持つ）。覆すもの —— 決定 1（A は `date1`）と決定 4（`yyyy/m/d`）。

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

⭐ **`CH-4` ／ `GL-006`**（説明を読まずに操作できる） —— 「カーソルA」がどちらの線かは、`DC-2` が追従する側を押すたびに入れ替えるので、画面を見ても読めない（`JDG-875`「カーソルA/Bの意味が分かりづらい」）。左・右なら画面の上の位置がそのまま名になる。間隔を年・か月・日で示すと、793 日を暗算させない（`JDG-923`）。

### ② レビュー観点のどの条項を当て、何が出たか

`docs/development-rules/07-review-standards.md` の条項を当てた。

- **`R2.1`（命名・用語一貫）** —— 行の名が「カーソル A」から「左」に変わるので、辞書の行の鍵 `a`・`b` も `left`・`right` へ改める（決定 5）。鍵 `a` のままだと「カーソル A の行」と読め、中身（早いほうの日付）と食い違う。`DC-3` の中の語「期間」も、画面の見出し「間隔」に揃える（決定 3）。
- **`R2.14`（POLA）** —— 左右を日付の順にすると、追従している線が止まっている線を越えた瞬間に、その日付が右の行から左の行へ移る。⚠️ 利用者が求めた形（`JDG-875`「左右入れ替わっても」）であり、代償として `DC-3` に 1 文で書く（E-01 の ⚠️ の文）。
- **`R1.4`（境界・空の場合）** —— 日付が 1 つしか決まっていないとき（追従する側の日がポインタの位置で定まらないとき。`tooltips.ts:220` の `dateAtX` が `null` を返す）、日付の順は決まらない。今の文「日付が決まっていない側は、その行の…」は、行が日付の順で決まる後では「その行」を指せない ⇒ 決まっている日付を左の行に出すと決める（決定 2）。月末の場合（1/31 → 2/28、1/31 → 3/30）とうるう日（2024/2/29 → 2025/2/28）は、今の数え方が既に一意に決めている ⇒ 例に 1/31 → 3/30 を足し、「E を k か月進めた日は、いつも E から数える」を 1 文で明かす（決定 6）。
- **`R3.6`（時刻の扱い：暦計算）** —— 間隔の年・月・日は暦で数え、固定の日数で割らない。今の `calendarSpanOf`（`src/entity/document-model/schedule/calendar-day.ts:88`）がそう実装している ⇒ 数え方を変えない。13 節の写し（`span.py`）で、E-01 の例 8 つがその数え方の答えと一致することを確かめた。
- **`R2.21`（1 つの仕事は 1 か所）** —— カーソルの日付の書き方は `CR-625` が 表 T-029 の `CU-3` の日付の札に定める。`DC-3` はそれを指し、書き方を写さない（E-01）。コードも同じ 1 つの関数で書く（5 節の継ぎ目）。
- **`R1.3`（矛盾がない）** —— 届いた先（6 節）のどれも、読みの行の名・日付の書き方・間隔の記号を言っていない ⇒ `DC-3` の外に書き換えの要る文は無い。

### ③ 利用者に問わずに決めたこと

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| 決定 1 | 間隔の数え方（n は暦日の差、年・月は E を k か月進めた日で数え、その月に同じ日が無ければ末日へ寄せる）を今の `DC-3` のまま残す。稼働日ではなく暦日 | `JDG-923` は形（年と月も並べる）を求め、数え方には触れていない。`JDG-325` の「4/1 と 4/15 は 14 日」が差の数え方を決めている | 1/31 から 3/30 は `0年 1か月 30日` になる（2/28 から 30 日） |
| 決定 2 | 日付が 1 つしか決まっていないときは、決まっている日付を左の行に、右の行と間隔の行を `—` にする | 並べる相手が無いので順は決まらない。上から読ませる | 追従している側が画面の外の日に来たとき、止まっている日付が左の行へ跳ぶ |
| 決定 3 | `DC-3` の中の語「期間」を「間隔」に改める | 利用者の見出しの語（`JDG-875`・`JDG-925`「間隔:」）。仕様の語と画面の語を 1 つにする（`R2.1`） | `CU-2` の「その間の日数を測る」は日数の話なので変えない |
| 決定 4 | 語の空白は 1 つに揃える: ja `{y}年 {m}か月 {d}日 ({n} days)`、en `{y}y {m}m {d}d ({n} days)`。見出しは半角のコロンと空白 1 つ（`左: `） | 逐語の空白（「3日   ( 793 days)」「3d  (793」）は打った跡であり、`JDG-925` の要約の列が 1 つに揃えている。見出しの桁を揃える空白（「左  :」）は等幅の文字で打った跡で、読みはプロポーショナルの字で描く | コロンの位置は 3 行で揃わない |
| 決定 5 | 辞書の行の鍵を `a` → `left`、`b` → `right` に改める。`span`・`days`・`oneDay` は残す | `R2.1`。鍵は生成器 `tools/generate_display_words.py` の `DUAL_CURSOR_READOUT_LINES` が並べるので、生成器も同じ波で直す（E-04。規則 02 の 3.5） | 生成器・`tooltips.ts`・試験 2 ファイルが同じ波に入る（8 節） |
| 決定 6 | 「E を k か月進めた日は、いつも E から数える（1 か月ずつ進めた日を次の起点にしない）」を 1 文足し、例に 2026/1/31 と 2026/3/30 を足す | 今の文「E を k か月進めた日」は既にそう読めるが、月末で読み違えやすい（1/31 → 2/28 → 3/28 と進める読み）。今のコード `monthsAfter`（`calendar-day.ts:78`）は E から数えている | 1 文長くなる |
| 決定 7 | ja の括弧の中は英語の `days` のまま、日数が 1 のときは両言語とも `(1 day)` | `JDG-925` の逐語（ja の行も「793 days」）。`CR-550` の 11.1 節の 3・4 | — |
| 決定 8 | 例の日付は `2026/04/01 (水)` とする（2026 年 4 月 1 日は水曜日） | `CR-625` の書き方の例として指すだけで、書き方は定めない | — |

---

## 1. 範囲 —— 行き先

| 事項 | 仕様で変える所 | 編集 | 裁定を戻すとき |
|---|---|---|---|
| 3 行を 左・右・間隔 と名づけ、左右は日付の順 | `docs/spec/01-04-requirements.md` の 表 T-029a の `DC-3` の前半（置き方の文の前まで） | E-01 | その区間 |
| 日付の書き方は `CU-3` の日付の札を指す | 同じ区間 | E-01 | 同 |
| 間隔を 1 行で「2年 2か月 3日 (793 days)」の形に | 同じ区間 | E-01 | 同 |
| 行の最後の例 | `DC-3` の末尾「語は `FR-038` の辞書が持つ（例: …）」 | E-02 | その 1 文 |
| 画面に出す語 | `docs/spec/_source/display-words.json` の節 `dualCursorReadout` | E-03 | その節 |
| 語の鍵の並び | `tools/generate_display_words.py` の `DUAL_CURSOR_READOUT_LINES` | E-04 | その 1 行と注 |

⭐ 生成物 `src/adapter/screen-renderer/display-words.json` は `npm run gen` だけが書く。⛔ 手で書かない。

## 2. 新しい識別子

無い。行・表・要求・接頭辞・設定値の行を 1 つも足さない。辞書の行の鍵 `a`・`b` を `left`・`right` に改めるが、鍵は行 ID の接頭辞の表に載る名ではない（生成器の中の並び）。

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

| 消すもの | 所（`bfbe7eb7`） | 置き換わる先 | 編集 |
|---|---|---|---|
| 「1 行目にカーソル A（`date1`）の日付、2 行目にカーソル B（`date2`）の日付、3 行目に A と B のあいだの期間」 | `docs/spec/01-04-requirements.md:5689`（`DC-3`） | 「1 行目（左）に…早いほうの日付、2 行目（右）に遅いほうの日付、3 行目に…間隔」と、日付の順で名づける MUST | E-01 |
| 「日付は `yyyy/m/d` と書くこと（MUST） —— 年は 4 桁、月と日は 0 を詰めない（例: `2026/4/1`）」 | 同 | 「表 T-029 の `CU-3` の日付の札と同じ書き方で書くこと（MUST）」 | E-01 |
| 「期間は、…`y/m/d (n days)` の形で書くこと（MUST）」 | 同 | 「間隔は、…y・m・d と n を 1 行に書くこと（MUST）」と「0 のときも省かない（MUST）」 | E-01（問い 1） |
| 例 `0/0/14 (14 days)` ほか 6 つ | 同 | `0年 0か月 14日 (14 days)` ほか 8 つ | E-01 |
| 「A が B より後の日でも、期間は同じ値とする」 | 同 | 日付の順で名づける文の説明（間隔は負にならない） | E-01 |
| 「日付が決まっていない側は、その行の日付と期間の行を `—` で示すこと（MUST）」 | 同 | 「日付が 1 つしか決まっていないときは、決まっている日付を左の行に…`—`」 | E-01 |
| 例 `カーソルAの日付: 2026/4/1` | 同 | `左: 2026/04/01 (水)`・`間隔: 0年 0か月 14日 (14 days)` | E-02 |
| 語 `カーソルAの日付: {date}` ほか 5 行 | `docs/spec/_source/display-words.json:4073`〜`:4107` | `左: {date}` ほか（4 節） | E-03 |
| 鍵 `('a', 'b', 'span', 'days', 'oneDay')` | `tools/generate_display_words.py:232`〜`:237` | `('left', 'right', 'span', 'days', 'oneDay')` | E-04 |
| 生成された語 | `src/adapter/screen-renderer/display-words.json:4499`〜 | `npm run gen` | ― |
| コードの A・B の並び | `src/adapter/screen-renderer/tooltips.ts:190`〜`:195`（`readoutDate`）・`:228`〜`:252`（`dualCursorReadoutOf`） | 9 節 | 実装する者 |
| 試験の旧い逐語と語 | 9 節の表の 2 行 | 9 節 | 実装する者 |

## 4. 書き直す所（当てる体がそのまま使う文）

⛔ 作法: 旧がそのファイルに 1 回だけ現れることを数えてから置き換える（改行は LF に揃えて数える）。E-01・E-02・E-03・E-04 は、`CR-624`・`CR-625` を当てた後の木で数え直す —— 4.1 節の差分で当てる。

<!-- EDIT id=E-01 file=docs/spec/01-04-requirements.md -->
問い 1 の推奨で書いた（「0 のときも省かずに 3 つとも書くこと」の文）。

旧
```text
| DC-3 | 測る | 本モードにいるあいだ、ポインタのそばに 3 行を小さく示すこと（MUST）: 1 行目にカーソル A（`date1`）の日付、2 行目にカーソル B（`date2`）の日付、3 行目に A と B のあいだの期間。<br>⭐ 追従している側の日付は、その線がいま立っている日とすること（MUST） —— 線と字が同じ日を指す。<br>日付は `yyyy/m/d` と書くこと（MUST） —— 年は 4 桁、月と日は 0 を詰めない（例: `2026/4/1`）。<br>⭐ 期間は、2 つの日付のうち早いほうを E、遅いほうを L として、`y/m/d (n days)` の形で書くこと（MUST）。<br>n が 1 のときは `(1 day)` と書くこと（MUST） —— 言語によらない。<br>n は E から L までの暦日の差とする —— `FR-047` の稼働日の数え方とは別である。<br>月数 k は、E を k か月進めた日（その月に E と同じ日が無ければ、その月の末日）が L を越えない最大の整数とする。<br>y は k を 12 で割った商、m はその余り、d は E を k か月進めた日から L までの暦日の差とする。<br>例: 4/1 と 4/15 は `0/0/14 (14 days)`、4/1 と 4/2 は `0/0/1 (1 day)`、2026/1/31 と 2026/2/28 は `0/1/0 (28 days)`、2026/1/31 と 2026/3/1 は `0/1/1 (29 days)`、2024/2/29 と 2025/2/28 は `1/0/0 (365 days)`、同じ日は `0/0/0 (0 days)`。<br>A が B より後の日でも、期間は同じ値とする。<br>日付が決まっていない側は、その行の日付と期間の行を `—` で示すこと（MUST）。
```
新
```text
| DC-3 | 測る | 本モードにいるあいだ、ポインタのそばに 3 行を小さく示すこと（MUST）: 1 行目（左）に 2 つの日付のうち早いほうの日付、2 行目（右）に遅いほうの日付、3 行目に 2 つの日付のあいだの間隔。<br>⭐ 左と右は、カーソル A（`date1`）とカーソル B（`date2`）の別ではなく、日付の順で名づけること（MUST） —— 時間軸は左から右へ進むので、画面の左に立つ線の日付が左の行に出て、間隔は負にならない。<br>⚠️ 追従している側が止まっている側を越えると、追従している側の日付は右の行から左の行へ（または逆へ）移る。<br>⭐ 追従している側の日付は、その線がいま立っている日とすること（MUST） —— 線と字が同じ日を指す。<br>日付は、表 T-029 の `CU-3` の日付の札と同じ書き方で書くこと（MUST） —— 書き方はその行が持ち、本行は写さない（例: `2026/04/01 (水)`）。<br>⭐ 間隔は、2 つの日付のうち早いほうを E、遅いほうを L として、年・か月・日の数 y・m・d と暦日の数 n を 1 行に書くこと（MUST） —— 語の形は `FR-038` の辞書が持つ（例: `2年 2か月 3日 (793 days)`、英語は `2y 2m 3d (793 days)`）。<br>⭐ y・m・d は、0 のときも省かずに 3 つとも書くこと（MUST） —— ポインタが動くあいだ値は変わり続けるので、書く単位の数が変わると行の長さが跳ねる。<br>n が 1 のときは `(1 day)` と書くこと（MUST） —— 言語によらない。<br>n は E から L までの暦日の差とする —— `FR-047` の稼働日の数え方とは別である。<br>月数 k は、E を k か月進めた日（その月に E と同じ日が無ければ、その月の末日）が L を越えない最大の整数とする。<br>⭐ E を k か月進めた日は、いつも E から数えて求める —— 1 か月ずつ進めた日を次の起点にしない（2026/1/31 を 2 か月進めた日は 2026/3/31 であり、2026/3/28 ではない）。<br>y は k を 12 で割った商、m はその余り、d は E を k か月進めた日から L までの暦日の差とする。<br>例: 4/1 と 4/15 は `0年 0か月 14日 (14 days)`、4/1 と 4/2 は `0年 0か月 1日 (1 day)`、2026/1/31 と 2026/2/28 は `0年 1か月 0日 (28 days)`、2026/1/31 と 2026/3/1 は `0年 1か月 1日 (29 days)`、2026/1/31 と 2026/3/30 は `0年 1か月 30日 (58 days)`、2024/2/29 と 2025/2/28 は `1年 0か月 0日 (365 days)`、2024/1/1 と 2026/3/4 は `2年 2か月 3日 (793 days)`、同じ日は `0年 0か月 0日 (0 days)`。<br>日付が 1 つしか決まっていないときは、決まっている日付を左の行に示し、右の行と間隔の行を `—` で示すこと（MUST） —— 並べる相手が無いので、日付の順は決まらない。
```

⭐ 旧の直後の `<br>⭐ 置き方は、表 T-028 の `IN-3` が…` から行の終わりの手前までは、`CR-625` の持ち物である。本書は触れない。

<!-- EDIT id=E-02 file=docs/spec/01-04-requirements.md -->
旧
```text
語は `FR-038` の辞書が持つ（例: `カーソルAの日付: 2026/4/1`） |
```
新
```text
語は `FR-038` の辞書が持つ（例: `左: 2026/04/01 (水)`、`間隔: 0年 0か月 14日 (14 days)`） |
```

<!-- EDIT id=E-03 file=docs/spec/_source/display-words.json -->
問い 2 の推奨で書いた（en の見出し `Left`・`Right`・`Interval`）。

旧
```text
 "dualCursorReadout": [
  {
   "line": "a",
   "text": {
    "ja": "カーソルAの日付: {date}",
    "en": "Cursor A: {date}"
   }
  },
  {
   "line": "b",
   "text": {
    "ja": "カーソルBの日付: {date}",
    "en": "Cursor B: {date}"
   }
  },
  {
   "line": "span",
   "text": {
    "ja": "カーソルA-Bの期間: {span}",
    "en": "A-B: {span}"
   }
  },
  {
   "line": "days",
   "text": {
    "ja": "{y}/{m}/{d} ({n} days)",
    "en": "{y}/{m}/{d} ({n} days)"
   }
  },
  {
   "line": "oneDay",
   "text": {
    "ja": "{y}/{m}/{d} ({n} day)",
    "en": "{y}/{m}/{d} ({n} day)"
```
新
```text
 "dualCursorReadout": [
  {
   "line": "left",
   "text": {
    "ja": "左: {date}",
    "en": "Left: {date}"
   }
  },
  {
   "line": "right",
   "text": {
    "ja": "右: {date}",
    "en": "Right: {date}"
   }
  },
  {
   "line": "span",
   "text": {
    "ja": "間隔: {span}",
    "en": "Interval: {span}"
   }
  },
  {
   "line": "days",
   "text": {
    "ja": "{y}年 {m}か月 {d}日 ({n} days)",
    "en": "{y}y {m}m {d}d ({n} days)"
   }
  },
  {
   "line": "oneDay",
   "text": {
    "ja": "{y}年 {m}か月 {d}日 ({n} day)",
    "en": "{y}y {m}m {d}d ({n} day)"
```

⭐ `{date}` に入る文字列（`2026/04/01 (水)` の形）は、`CU-3` の日付の札と同じ関数が作る（5 節）。本節は日付の語を持たない。

<!-- EDIT id=E-04 file=tools/generate_display_words.py -->
旧
```text
# The lines DC-3 of table T-029a (MUST) shows beside the pointer while the
# Dual Cursor mode is on: the date of cursor A (date1), of cursor B (date2), and
# the span between them, whose value is `days`, or `oneDay` when the count is 1.
# HELD HERE, the same move as SCALE_ECHO_ENDS: DC-3 states the lines in prose
# and no table holds them as rows (CR-550). These are KEYS, not words.
DUAL_CURSOR_READOUT_LINES = ('a', 'b', 'span', 'days', 'oneDay')
```
新
```text
# The lines DC-3 of table T-029a (MUST) shows beside the pointer while the
# Dual Cursor mode is on: the earlier date (left), the later date (right), and
# the interval between them, whose value is `days`, or `oneDay` when the count
# is 1. HELD HERE, the same move as SCALE_ECHO_ENDS: DC-3 states the lines in
# prose and no table holds them as rows (CR-550, CR-626). KEYS, not words.
DUAL_CURSOR_READOUT_LINES = ('left', 'right', 'span', 'days', 'oneDay')
```

⭐ E-03 と E-04 は同じ commit で当てる —— 鍵が食い違うと生成器が書くのを拒む（原稿の `$comment`「the generator refuses to write if this file and those tables disagree」と同じ作り）。

### 4.1 重なり

`change-request/CR-603`〜`CR-620` の 1〜10 行目を読み、`DC-3`・`DC-9`・`CU-3`・`T-029a`・`dualCursorReadout`・`calendarSpanOf` で全文を引いた: 当たりは `CR-616` の 1 件だけで、それは色の表 T-236 の話であり `DC-3` を書かない（13 節）。`CR-617` は辞書の別の節（遅延診断レポートの面の名）に語を足すが、節 `dualCursorReadout` に触れない ⇒ 旧の数は変わらない。

同じ枝の兄弟（読めない。依頼文の範囲の記述で判じた）:

| 兄弟 | 書き換えうる所 | 本書の差分（載せ直すときはこれだけを当てる） |
|---|---|---|
| `CR-625`（先に当たる） | `DC-3` の置き方の文（旧の直後の「⭐ 置き方は、…」から「3 行が画面の外で切れない。」まで）。`CU-3` に日付の札 `yyyy/mm/dd (曜日)` を足す。⚠️ 札を描くのに `dualCursorReadoutOf`・`readoutDate` を使い回すなら、`tooltips.ts` の同じ関数と、辞書の節 `dualCursorReadout`・生成器の `DUAL_CURSOR_READOUT_LINES` に鍵を足すかもしれない。⚠️ `DC-3` の日付の文（旧の「日付は `yyyy/m/d` と書くこと…」）を先に書き換えるかもしれない | E-01: 旧を数え直す。`CR-625` が日付の文を書き換えていれば、その文を E-01 の新の「日付は、表 T-029 の `CU-3` の日付の札と同じ書き方で書くこと（MUST） —— …」に置き換えるだけにし、ほかの文は本書の新のとおり当てる。E-03・E-04: `CR-625` が鍵を足していれば、その鍵を残したまま `a` → `left`・`b` → `right` と語だけを替える。⭐ `CU-3` の書き方の置き場が 表 T-029 の `CU-3` でなければ（別の行 ID に置いたなら）、E-01 の「表 T-029 の `CU-3` の日付の札」をその行 ID に替える |
| `CR-624`（先に当たる） | `EZ-6`（表 T-040）の説明の日付と曜日の書き方「m/d (曜日)」。曜日の語は公開エントリ `rulerWeekdayWords` を使い回す | 重ならない（`DC-3` と節 `dualCursorReadout` に触れない見込み）。曜日の語は `CU-3` を経て本書へ届く |
| `CR-621`〜`CR-623`・`CR-627`〜`CR-630` | 窓の枠・ヘルプ・ファイルの面・アイコン・ロゴ・検索パネル・`Esc` | 重ならない |

## 5. 継ぎ目 —— 両側の依頼文にこのまま写すこと

```
SEAM (verbatim in the implementer's and the tester's brief)
- Rule: table T-029a DC-3 as CR-626 E-01 / E-02 leave it; words: display-words
  section dualCursorReadout, keys left / right / span / days / oneDay (E-03);
  generator tuple DUAL_CURSOR_READOUT_LINES in tools/generate_display_words.py
  (E-04). Run `npm run gen`; never write src/**/display-words.json by hand.
- Three lines, in this order: left = the EARLIER of the two dates, right = the
  LATER, then the interval. Order by date, never by date1/date2 and never by
  which line is following. Equal dates: both lines show the same date.
- Only one date known (the following side's day is null): left shows the known
  date, right and interval show the dash '—' (UNKNOWN, not a dictionary word).
- Date text: the SAME function that writes the CU-3 date label (CR-625,
  yyyy/mm/dd plus the weekday word of the display language; weekday words are
  the published entry rulerWeekdayWords, CR-624). Do not write a second
  date formatter for DC-3 (R2.21). Example: ja '左: 2026/04/01 (水)',
  en 'Left: 2026/04/01 (Wed)'.
- Interval: calendarSpanOf (src/entity/document-model/schedule/calendar-day.ts)
  unchanged. Fill the dictionary word `days` (or `oneDay` when dayCount === 1)
  with {y} {m} {d} {n}; all three of y, m, d always written, zeros included.
  ja '間隔: 2年 2か月 3日 (793 days)' for 2024/01/01 and 2026/03/04;
  en 'Interval: 2y 2m 3d (793 days)'. One day: '(1 day)' in both languages.
- Placement, font size (S-334, S-340), when it shows, export: unchanged here
  (CR-625 owns placement). No new setting, no new event, no new command.
- Code: src/adapter/screen-renderer/tooltips.ts dualCursorReadoutOf /
  readoutDate / readoutSpan. The drawing side (tooltips-drawing.ts) takes the
  three strings as before and does not change.
```

## 6. グラフ（`bfbe7eb7`）

- `impact.py DC-3 DC-9 CU-3`:
  - `DC-3` を指す要求 3 件・参照 8 か所（`FR-152` の `UZ-1`:4663、`FR-092` の `EZ-6`:7154、`FR-040` の `IN-7`:7793、`05-07-design.md:398` の `UF-132`、`tbl-published-entries.md:19`・`:23`（`PI-1`・`PI-5`）、`tbl-settings.md:447`・`:449`（`S-334`・`S-340`））。
  - `DC-9` を指す要求 3 件・参照 6 か所（`FR-048`:5628・:5657、`FR-082`:5690（`DC-4`）、`FR-029`:7252（`EN-6`）、`tbl-settings.md:523`（`S-195`）、`tbl-state-machines.md:80`）。
  - `CU-3` を指す要求 4 件・参照 11 か所（`FR-048` の 6 か所、`FR-082`:5695（`DC-9`）、`FR-080`:6333（`EP-6`）、`NFR-010`:7909、`tbl-settings.md:340`・`:523`）。
- ⭐ 届いた先を 1 つずつ読んだ: 読みの行の名（カーソル A・B）・日付の書き方・間隔の記号を言うのは `DC-3` の中だけである。`UZ-1`（重ね順 1）・`EZ-6`（モード中は出さない）・`IN-7`（置き方は `IN-3` の例外）・`UF-132`・`PI-1`（`calendarSpanOf` を公開）・`PI-5`・`S-334`・`S-340`・`DC-9`・`EN-6`・`EP-6`・`S-195` は、書き換えの後も真 ⇒ 書き換えない。`DC-9` と `CU-3` は、本書が `CU-3` の日付の札を指すことで種に入れた（指す先は `CR-625` が書く）。
- `induced.py DC-3 DC-9 CU-3`: 種 3/3 が仕様の対象、種の中の辺 1、閉路 0 ⇒ 1 つずつ書いてよい。
- `rulings.md` を `DC-3`・`dualCursorReadout`・`デュアルカーソル`・`2 本カーソル`・`Dual Cursor`・`カーソルA` で引いた: 当たりは `JDG-203`（描く順。触れない）・`JDG-302`（`JDG-325` が既に覆した）・`JDG-324`（en の語の先例）・`JDG-325`（一部覆す）・`JDG-328`（検査 40 の基準線。触れない）・`JDG-379`・`JDG-398`（残す）・`JDG-622`（2 つの日付を保存しない。残す）・`JDG-875`・`JDG-893`（`CR-625` の持ち物）・`JDG-923`・`JDG-925`。⇒ 導いた条項（決定 1〜8）と食い違う裁定は 0。
- `pending-decisions.md`: `PND-344`（`DC-3` の日数の置き場）は `JDG-325` で閉じており、本書で開き直さない。ほかに `DC-3` を引く行は無い。

## 7. 数の予測（`bfbe7eb7`。当てた後に同じ数え方で突き合わせる）

| 数 | 前 → 後 | 理由 |
|---|---|---|
| tables | 差 0 | 表を足しも消しもしない |
| figures | 差 0 | 図に触れない |
| rows | 差 0 | 表 T-029a の行数は変わらない（`DC-3` の中の文だけ） |
| uids | 差 0 | 要求を足しも消しもしない |
| `（MUST）` の印（`01-04-requirements.md`） | ＋2 | E-01 の旧 6 → 新 8（「日付の順で名づけること（MUST）」「0 のときも省かずに 3 つとも書くこと（MUST）」が増え、ほかは言い替え）。13 節の数え方。検査 39 のために、波 1 の試験が新しい文を逐語で引く |
| 辞書の節 `dualCursorReadout` の行 | 5 → 5 | 鍵 2 つの名と、5 行の語が変わる |
| 生成器の `DUAL_CURSOR_READOUT_LINES` の要素 | 5 → 5 | 名 2 つが変わる |

## 8. 波 —— 持ち場で割る

| 波 | 持ち場 | 中身 | 体 | 毎フレーム |
|---|---|---|---|---|
| 0 | ― | `CR-624`・`CR-625` を当てた木で、E-01〜E-04 の旧を数え直し、4.1 節の差分で載せ直す | 当てる体 | ― |
| 1 | L4（`tooltips.ts` と辞書は L4 の持ち物）。`docs/spec`（E-01〜E-03）＋ `tools/generate_display_words.py`（E-04）＋ `npm run gen` ＋ `src/adapter/screen-renderer/tooltips.ts` ＋ `tests/unit/cr-550-dual-cursor-readout.test.ts` ＋ `tests/contract/display-words.contract.test.ts` | 原稿・生成器・読む側を 1 つの波で着地させる（規則 02 の 3.5 —— 鍵 `a`・`b` が消えると `tooltips.ts` の `readoutWord('a', …)` が鍵を見失い、鍵の名そのものを出す）。変更履歴の 1 行も同じ波 | L4 の実装の体 | **はい** —— `dualCursorReadoutOf` はモードにいてポインタが `Row Area` かタイムルーラーの上にあるあいだ、毎フレーム走る。足すのは 2 つの日付の比べ 1 回だけ。⇒ 着地の時に `docs/development-records/perf-pending.md` に 1 行を足す（PW-2） |
| 2 | `tests/contract/cr-626-the-dual-cursor-reads-left-right-and-the-interval.test.ts`（新しいファイルだけ） | 下の「仕様だけの試験」 | 仕様だけの試験の体（波 1 と並べてよい） | ― |

**仕様だけの試験**（`docs/spec` だけを読む体が書く。`tests/contract/cr-626-the-dual-cursor-reads-left-right-and-the-interval.test.ts`）:

| 場合の名 | 確かめること |
|---|---|
| `DC-3: the left line holds the earlier date whichever cursor is date1` | `date1` が `date2` より後の日でも、1 行目は早いほうの日付、2 行目は遅いほう |
| `DC-3: the following date moves to the left line when it passes the standing one` | 止まっている側 2026/04/15、追従している側を 4/20 → 4/10 と動かすと、追従している側の日付が 2 行目から 1 行目へ移る |
| `DC-3: the dates are written as the CU-3 date label` | 読みの日付の部分が、同じ日の `CU-3` の日付の札の文字列と一致する（ja `2026/04/01 (水)`、en `2026/04/01 (Wed)`。月と日は 2 桁） |
| `DC-3: the interval is one line of years, months, days and the day count` | 2024/01/01 と 2026/03/04: ja `間隔: 2年 2か月 3日 (793 days)`、en `Interval: 2y 2m 3d (793 days)` |
| `DC-3: zero years and months are still written` | 4/1 と 4/15 は `0年 0か月 14日 (14 days)`、同じ日は `0年 0か月 0日 (0 days)` |
| `DC-3: one day is (1 day) in both languages` | 4/1 と 4/2 は ja・en とも `(1 day)` で終わる |
| `DC-3: month ends and the leap day` | 1/31 と 2/28 → `0年 1か月 0日 (28 days)`、1/31 と 3/1 → `0年 1か月 1日 (29 days)`、1/31 と 3/30 → `0年 1か月 30日 (58 days)`、2024/2/29 と 2025/2/28 → `1年 0か月 0日 (365 days)` |
| `DC-3: one known date goes to the left line` | 追従している側の日が決まらないとき、1 行目に止まっている日付、2 行目と 3 行目に `—` |
| `DC-3: the clauses stand in the manuscript` | E-01 の新の `（MUST）` の文 8 つを逐語で引く（検査 39） |

## 9. 仕様の外で直すもの（⛔ 本書は直さない。`bfbe7eb7` の行番号）

| ファイル | 関数・所 | 何を | 毎フレーム |
|---|---|---|---|
| `src/adapter/screen-renderer/tooltips.ts` | `dualCursorReadoutOf`（`:228`〜`:252`） | `date1`・`date2` を日付の順に並べ（`compareDays`）、1 行目を `left`、2 行目を `right` の語で書く。片方が `null` なら、決まっている日付を 1 行目に | はい（上の波 1） |
| 同 | `readoutDate`（`:190`〜`:195`） | `CU-3` の日付の札の関数（`CR-625`）に置き換え、言語を渡す。⛔ 2 つ目の書き方を作らない | はい |
| 同 | `readoutSpan`（`:197`〜`:207`） | 変えない（語が辞書で替わるだけ） | ― |
| `tests/unit/cr-550-dual-cursor-readout.test.ts` | `DC_3_DATE`（`:40`）・`DC_3_SPAN`（`:41`）・`DC_3_UNDECIDED`（`:43`）、語 `A_WORD`・`B_WORD`・`SPAN_WORD`（`:73`〜`:75`）、期待 `:223`〜`:275` | E-01 の新しい文を逐語で引き、語を `左: `・`右: `・`間隔: ` に、日付を `2026/04/10 (金)` の形に、間隔を `0年 0か月 14日 (14 days)` の形に替える。`:223`〜`:231` の「A は date1」の期待は日付の順の期待に書き直す | ― |
| `tests/contract/display-words.contract.test.ts` | `DUAL_CURSOR_READOUT_LINE`（`:1671`） | 鍵 `{ left: 0, right: 1, span: 2 }` | ― |

⚠️ `tests/unit/cr-550-dual-cursor-readout.test.ts:316` と `tests/unit/cr-551-fit-status-line-and-cursors.test.ts:445` の `lines: ['a', 'b', 'c']` は描く側に渡す見本の文字列で、辞書の鍵ではない ⇒ 変えない。

## 10. ⛔ この変更でやらないこと ・ 触れ合うもの

- 置き方（右端で左へ、下の余白、上へ返す）を変えない —— `CR-625` の持ち物。
- 日付の書き方 `yyyy/mm/dd (曜日)` と曜日の語を定めない —— `CR-625`・`CR-624` の持ち物。本書は指すだけ。
- 字の大きさ（`S-334`・`S-340`、`JDG-379`・`JDG-398`）、示す場所（`Row Area` とタイムルーラーの上）、`EZ-6` を出さないこと、書き出しに出さないことを変えない。
- 間隔の数え方（暦日の差、k か月の数え方）を変えない（決定 1）。
- 遅延診断のマーカー・レポート（`CR-616`・`CR-617`）に触れない。
- 2 本の線の描き方（`DC-8` の太さ、`S-194`・`S-195`）に触れない。

## 11. 利用者に問うこと

| # | 問い | 案 | 推奨と理由 |
|---|---|---|---|
| 問い 1 | 間隔で 0 になった年・か月を書くか。たとえば 4/1 と 4/15 | A: いつも 3 つとも書く ——「0年 0か月 14日 (14 days)」 ／ B: 頭の 0 だけ省く ——「14日 (14 days)」、「1年 0か月 3日」は残す ／ C: 0 の単位をすべて省く ——「14日 (14 days)」、「1年 3日 (368 days)」 | **A**。読みはポインタと一緒に動き、値が変わり続ける —— B・C では月の境を越えた瞬間に「1か月」が現れて行の長さが跳ね、年・か月・日の位置も動く。A は利用者の例（`JDG-925`「2年 2か月 3日」）の形のままで、今の `0/0/14` とも同じく 3 つを書く。代償: 短い間隔では「0年 0か月」が冗長に読める（括弧の日数が同じことを言う）。E-01 は A で書いた |
| 問い 2 | 英語の見出し 3 つ | A: `Left: ` ／ `Right: ` ／ `Interval: ` ／ B: `Earlier: ` ／ `Later: ` ／ `Interval: ` ／ C: `L: ` ／ `R: ` ／ `Span: ` | **A**。利用者の ja の見出し（左・右・間隔）をそのまま英語にした形で、画面の上の位置で読める（B は日付の順を言うが、画面の左右と別の語になる）。辞書の原稿は体の発明を禁じるので、確認として問う（`JDG-324` の先例）。E-03 は A で書いた |

## 12. 台帳

| ID | 何か | 状態 |
|---|---|---|
| `DFC-1345` | 2 本カーソルの読みの「カーソルA／B」の意味が分かりにくい | 本書で閉じる（仕様は E-01〜E-04、コードは波 1）。⚠️ 問い 1・問い 2 が答えられるまでは「裁定待ち」を推す —— どちらも推奨で書いてあり、答えが推奨どおりなら本書のまま当てられる |
| `JDG-875`・`JDG-923`・`JDG-925` | 利用者の裁定（状態「指示 —— 調整役が投入時期を決める」） | 調整役へ: 本書を当てる波が決まったら、状態を「指示 —— `CR-626` が当てる」にする（検査 43）。着地したら 適用済 |
| `JDG-325` | 2 本カーソルの読みの初めの裁定（適用済） | 調整役へ: 着地したら「覆された（一部）」とし、覆した部分（行の名 A・B、0 を詰めないこと、`y/m/d` の記号）と覆した裁定（`JDG-875`・`JDG-925`）を同行に書き添える。残る部分は 0.1 節 |
| `JDG-379`・`JDG-398` | 字の大きさ | 変わらない |
| `PND-*` | ― | 触れる行は無い（`PND-344` は閉じたまま） |

## 13. 測り方の再現

```
# the tree: l4-review-crs bfbe7eb7 (= origin/refactor); the four files below are LF-only
#   (CRLF count 0 each, measured by the extract script in the session scratchpad)
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py DC-3 DC-9 CU-3
#   DC-3: 3 requirements / 8 references; DC-9: 3 / 6; CU-3: 4 / 11
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/induced.py DC-3 DC-9 CU-3
#   -> seeds 3 of 3, edges 1, cycles 0

# who says the readout's words, keys or format
git grep -ln "カーソルA\|Cursor A\|dualCursorReadout" -- . ':!previous-project-result' ':!change-request' ':!docs/development-records'
#   docs/spec/01-04-requirements.md, docs/spec/_source/display-words.json (and its generated copy),
#   src/adapter/screen-renderer/{tooltips.ts,screen-renderer.ts}, src/framework/dom-screen-surface/*,
#   tests/contract/display-words.contract.test.ts, tests/unit/cr-550-dual-cursor-readout.test.ts,
#   tools/generate_display_words.py, docs/review/public-entry-index.md, dist/index.html
git grep -n "yyyy/m/d\|y/m/d (n days)\|0/0/14\|期間の行\|月数 k\|'a', 'b'" -- tests src tools docs/spec
#   tests quoting DC-3 verbatim: tests/unit/cr-550-dual-cursor-readout.test.ts :40 :41 :43 (and :258 :261 words)
#   tools/generate_display_words.py :237 ; the other 'a','b' hits are unrelated sample strings

# the interval examples of E-01, recomputed by a port of calendarSpanOf (span.py in the session scratchpad)
#   4/1..4/15 0年 0か月 14日 (14 days) / 4/1..4/2 (1 day) / 1/31..2/28 0年 1か月 0日 (28) /
#   1/31..3/1 0年 1か月 1日 (29) / 1/31..3/30 0年 1か月 30日 (58) / 2024/2/29..2025/2/28 1年 0か月 0日 (365) /
#   2024/1/1..2026/3/4 2年 2か月 3日 (793) / same day 0年 0か月 0日 (0); each symmetric; 2026/4/1 is a Wednesday

# the old blocks: each counted once, LF-normalised, by a script in the session scratchpad
#   (reads the <!-- EDIT --> markers of this file, takes each 旧 fenced block, counts it in its file)
#   E-01 01-04-requirements.md 1 / E-02 01-04-requirements.md 1 /
#   E-03 display-words.json 1 / E-04 generate_display_words.py 1
#   （MUST） inside E-01: old 6, new 8

# overlaps
grep -l "DC-3\|dualCursorReadout\|T-029a\|DC-9\|CU-3\|calendarSpanOf" change-request/CR-60[3-9]*.md change-request/CR-61*.md change-request/CR-620*.md
#   -> CR-616 only (a colour-table sentence; it writes no DC-3)

# the rulings and ledger rows read whole
grep -n "^| JDG-\(325\|379\|398\|875\|923\|925\|324\|898\|922\) " docs/development-records/rulings.md
grep -n "DC-3\|dualCursorReadout\|デュアルカーソル\|2 本カーソル\|Dual Cursor\|カーソルA" docs/development-records/rulings.md
grep -n "DFC-1345 \|DFC-1338 \|DFC-1339 \|DFC-1340 \|DFC-1360 " docs/development-records/defects.md
grep -n "DC-3\|dualCursorReadout\|Dual Cursor" docs/development-records/pending-decisions.md   # PND-344 (closed)
```
