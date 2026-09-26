# CR-588 — 変更前の予定を重ねて描き、無ければそのファイルを選ばせる

> 起草の状態: 当てた（2026-09-26、枝 `cr-organise`、波 W4a。`JDG-740`）。当てた木は `e4011375` に `CR-575` を当てた作業木（未コミット）。4 節の旧 25 はどれも 1 度だけ現れた。E-14 は旧 B（`ZO-13` を `ZO-14` の前に置いた形）が 1 度、旧 A が 0 度だったので、B を当てた（W3 が `PP-7` を `ZO-12` ／ `ZO-13` ／ `ZO-14` の順で書いていた）。当てるときに新を直した: E-02 の `BL-2`（括弧の中の句点を読点にした —— 行の検査）。`S-443` は `tools/generate_entity_types.py` の `SCHEDULE_COLOURS` に、`S-444` は新しい定数 `NOT_STORED_BASELINE_OUTLINE_SIZES`（4.3 節のとおり `svg-renderer.ts` へ刷り、同ファイルの公開の名簿に載せた）に入れた。11 節の問い 1 は調整役が A と答えた（2026-09-26）—— 刻み 4 × 2px を 🔎 の試す値のまま出し、実物を見てから直す。変更履歴の行は、変更履歴の持ち主へ調整役が足す。
> （起草の記: 起草した（2026-09-26）。）利用者の裁定 `JDG-722`（`DFC-1142` の問 2 への答えを含む。逐語は 0.1 節）を当てる本文の案である。⛔ 仕様・コード・試験・台帳はまだ 1 文字も変えていない。
> 読んだ木: 枝 `cr-organise` の `87d98a47`。⚠️ 起草のあいだ、同じ作業木で調整役の波 W1 の編集（`01-04-requirements.md`・`settings.json` ほか）が進んでいた ⇒ 本書の数・行番号・旧の塊は、どれも `git archive 87d98a47` で写した木で測った（13 節）。
> ID の帯: 調整役から `CR-588` と仮の番号の帯 `90800` 〜 `90899` を受けた。新しい行 ID・表・設定値の行はどれも仮である（2 節）—— 調整役が当てる直前に測り直して詰める（規則 02 の 2.5 節）。
> 当てる順: 波 W4 の `CR-575` の後（`docs/development-records/cr-plan-2026-09-26.md`、`JDG-740`）。表 T-020 は W3 の `CR-558` → `CR-556` → `CR-559` と W4 の `CR-575` が先に書く ⇒ 4 節の表 T-020 まわりの旧は、それらの新を当てた写しの上で数えた（13 節）。表 T-201 の `S-39` を「予定の輪郭と同じ太さ」として読むのは、W2 の `CR-572` が表 T-201 を定数にした後の読みである。
> 閉じるもの: `DFC-1014`（`IC-73` で重ねを読み込んでも輪郭が 1 つも描かれない）と `DFC-1142`（利用者の指摘「変更前の予定と重ねて表示が動いてない」と、重ねる予定が無いときの `IC-4`）。
> ⛔ 覆すもの: 表 T-109 の `IC-4` の「⚠️ **ファイルを読む入口ではない**」を、重ねる予定が無いときに限って覆す（`JDG-722`）。表 T-024a の `OP-9` の「選ぶ入口は `OP-3` の第 3 の選択肢である」を広げる。表 T-020 の注「変更前の予定の重ね … まだ描いていないので本表に行を持たない」は、描くので偽になり書き直す。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 利用者の逐語と、それが決めること

| 所 | 逐語（`87d98a47` の `docs/development-records/rulings.md` ・ `defects.md` から写した） | 決めること | 本書での扱い |
|---|---|---|---|
| `JDG-722` | **「変更前の予定と重ねて表示を使えるようにしろ。」**（2026-09-26。利用者の指摘）／**「問 2 — DFC-1142 → (b)（推奨）」**（同日。トリアージのセッションが、変更前の予定が無いときに `IC-4` を押したら (a) いまの予定を写し取る (b) ファイルを選ぶ画面を開く (c) 押せなくする、を問うた後の答え） | ① 重ねは描かれなければならない（`FR-015` がすでに定める —— `DFC-1014` の直し）。② 重ねる予定が無いときに `IC-4` を押すと、変更前の予定にするファイルを選ぶ画面を開く（`IC-73` の流れ） | ① 表 T-020 の `ZO-15`、表 T-339（新）、`FR-015` の 3 文（4.1 節の E-01 〜 E-14）。② 表 T-024a の `OP-15`（新）、`OP-9`・`UC-006` 5a・`IC-4`、状態機械（E-15 〜 E-18、J-04 〜 J-07） |
| `DFC-1142` の指摘 | 「変更前の予定と重ねて表示が動いてない。 少なくともそう見える。変更前の予定と重ねて表示を使えるようにしろ。」 | `JDG-722` の 1 文目の元の文 | 同上 |

### 0.2 調べた結果（`87d98a47`）

1. **描く処理が 1 つも無い。** `src/adapter/svg-renderer/svg-renderer.ts` の `svgFromSchedule`（`:437`）の層の列（`:610` 〜 `:631`）に、変更前の予定の層は無い。`baselineTasks` を読むのは取り込み（`src/use-case/import-document/import-document.ts` の `baselinedDocument`、`:319` 〜 `:355`）・検証・符号化だけで、`src/entity/layout-engine` と `src/adapter/svg-renderer` の中は 0 行（`git grep -n -i "baseline" 87d98a47 -- src/entity/layout-engine src/adapter/svg-renderer` の 3 行は、どれも字の置き場の `labelBaseline` と目盛の字の縦の位置）。
2. **仕様にも描く行が無い。** 表 T-020 の注（`01-04-requirements.md:4009`）が「⚠️ 期限の印・遅れの日数・変更前の予定の重ねは、まだ描いていないので本表に行を持たない —— 描くときに行を足す。」と書く。形・置き場・線の色と刻みを決める行も無い —— `FR-015` は「グレーで、かつ破線の輪郭」「刻みは予実の補助線（表 T-208 の `planActualGuidePattern`）と別の値にする」までを決め、値の行は表 T-201 〜 T-236 のどこにも無い（`grep -n "変更前\|baseline" docs/spec/_source/settings.json` は `S-69` の 1 行だけ）。
3. **読み込んでも `S-69` は偽のまま。** `baselinedDocument` は `schedule.baselineTasks` だけを書き、`documentSettings` を変えない。`S-69` の既定は偽（`_assets/tbl-settings.md:173`）⇒ `FR-015` の「読み込んだとき … 重ねて描くこと」は、描く処理が在っても `IC-4` を押すまで成り立たない。
4. **`IC-4` は重ねる予定が無くても `S-69` を切り替えるだけである。** `input-command-translator.ts:1027` の `ENTRY.baselineVisible` は `commandFromVisibleElementEntry`（`:1134`）へ落ちる。トリアージの実測（`DFC-1142` の証拠の欄）: 起動文書（`baselineTasks` 0 件）で押すと `baselineVisible` は真になり、SVG の要素は ±0。
5. **ファイルを選ばせて、`OP-3` を問わずに開く前例が在る。** 表 T-024a の `OP-13`（`Ctrl` ＋ `R`）は「**`OP-3` の 3 択は問わず、置き換えに定めること（MUST）**」。コードにも、選択を先に決めて渡す口が在る —— `document-file-flow.ts` の `openDocumentIntoHold`（`:462`）は `flow.askHowToOpen(current, handed?.choice ?? null)` で、渡された選択があれば問わない。
6. **`OP-2` の「入口は 1 つ」は合流の話である。** `OP-2` の MUST NOT は「取込（合流）に別の入口を設けてはならない」であり、重ねの入口は縛らない。縛っていたのは `IC-4` の行の注「読む入口は `IC-1` 1 つ」だけで、`JDG-722` がそれを覆す。
7. **同じ形の所の数（依頼文の 4）。** ① 表 T-202 の真偽の切り替えは 11 行（`S-227`・`S-228`・`S-60`・`S-61`・`S-232`・`S-62`・`S-63`・`S-64`・`S-67`・`S-68`・`S-69`）。描く中身を別のファイルから取るのは `S-69` の 1 行だけである。似た形は `S-64`（`IC-39`、イナズマ線）—— 基準日が無い文書で押しても何も描かれない。本書は `S-64` を変えない（10 節）。② 表 T-020 の注の「まだ描いていないので本表に行を持たない」に残る対象は、本書の後「遅れの日数」の 1 つ（`DFC-1013`）。③ 読む入口が `OP-3` を問わずに選択を決める行は `OP-13` の 1 つで、本書の `OP-15` が 2 つ目になる。

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

- `CH-2`（ペライチ、`GL-002`）—— `UC-006` 手順 5「閲覧者は変更前の予定を重ねて、計画がどう動いたかを見る」は、1 枚の日程の上で予定の動きを読ませる手順である。いまは重ねが 1 本も描かれず、手順 5 が成り立たない（`DFC-1014`）。
- `CH-4`（すぐわか、`GL-006`）—— 重ねる予定が無いときに `IC-4` を押しても何も起きない。押せば、次にすべきこと（ファイルを選ぶ）が画面に出る（`JDG-722`）。
- ⚠️ `CH-3`（ぬるサク、`GL-003`）には負に働きうる —— 重ねを出しているあいだ、毎フレーム、描く `Task` ごとに輪郭を 1 つ作る（8 節の注）。

### ② レビュー観点のどの条項を当て、何が出たか

- `R1.3`（矛盾・唯一の正）—— ① 表 T-109 の `IC-4` の「ファイルを読む入口ではない」と `JDG-722` が当たる → 重ねる予定が無いときだけ覆し、規則は 表 T-024a の新しい行 `OP-15` の 1 か所に置き、`IC-4`・`OP-9`・`UC-006` 5a・`FR-015` はそこを指すだけにした（E-15 〜 E-18）。② `OP-9` の「選ぶ入口は `OP-3` の第 3 の選択肢である」が偽になる → 入口を 2 つ並べた（E-16）。③ `OP-3` の「どちらになるかを `GRS` が勝手に決めてはならない（MUST NOT）」は、人が重ねの入口を押して選んでいるので当たらない —— `OP-13` と同じ読みであり、`OP-3` の文は書かない。④ 表 T-020 の注が偽になる（E-13）。⑤ 表 T-274 の結び（`01-04-requirements.md:419`）は、`PP-` の覆う行に名の無い行を 表 T-020 に足すことを禁じる → `PP-7` に `ZO-15` を足した（E-14）。⑥ `induced.py` の閉路 1 つ（大きさ 6: `FR-015` `FR-049` `FR-087` `OP-3` `OP-9` `UC-006`）—— 本書はそのうち `FR-015`・`OP-9`・`UC-006` を書き、`FR-087` の表 T-024a に行を足す ⇒ 1 つの計画で、同じ体・同じ巡で当てる（8 節）。`FR-049` と `OP-3` の文は書かない。
- `R1.4`（異常系・境界）—— 重ねる予定が 0 件（`OP-15`）、一致が 1 つも無く枠が空（`OP-9` の ⚠️。`OP-15` の「重ねる予定が無い」に入れた）、`start` か `finish` が `null`（`BL-1` の ②）、選ばずに閉じた（`OP-15`）、読み込みを取り消した（③ の 決定 7）、2 つ以上のファイル（`OP-11` をそのまま当てる）、進行中の別の取込（`OP-8`）を行か決定に入れた。
- `R2.1`（命名）—— 日本語は「変更前の予定」と書き、「ベースライン」「基準線」を使わない（表 T-006b の `A-7`・`A-9`）。「段」「行」「バー」を単独で書かない（`A-1`・`A-2`・`A-14`）。新しい接頭辞 `BL`（Baseline）は、登録簿の `BC`・`BF`・`BO`・`BT` と字が違い、`BL-` の行は `87d98a47` の `docs change-request src tests tools .claude` に 0 件。コードの名は既存の綴り（`baselineVisible`・`BaselineTask`・`OpenChoice` の `'baseline'`）に揃える。
- `R2.7`（マジックナンバー無し）—— 色は表 T-236 の `S-148` を継ぎ、太さは表 T-201 の `S-39` を読む。新しい数は破線の刻み 1 組（`S-444`）だけで、🔎 の試す値として置く（③ の 決定 4）。
- `R4.4`（状態機械）—— `fileOperationStateMachine` に、読んだ後 `U-56` を出さずに取り込みへ進む遷移を 1 つ足す。図と状態遷移表は `docs/spec/_source/state-machines.json` から生成されるので、原稿の 3 か所（J-05 〜 J-07）だけを書く。ガードの名 `isBaselineRoute` は既存の `isReopenRoute` と同じ形（`is` ＋ 名詞）。状態は足さない。
- `R2.10`（SoC）—— 輪郭の置き場（日付から位置、縦の範囲）は幾何（`src/entity/layout-engine`）が解き、描き手（`src/adapter/svg-renderer`）は線を描くだけにする（5 節の S-1・S-2）。

### ③ 利用者に問わずに決めたこと

⭐ 根拠を添えて問わずに決めた。あとから覆せる（戻し方は 1 節の最右列）。`rulings.md` を「変更前の予定」「baseline」「IC-4」「IC-73」「OP-9」「S-69」「ZO-」「表 T-020」「OP-13」で引いた —— 当たるのは `JDG-722`（本書が当てる）、`JDG-203`（前後と掴みを分けて管理する —— `FR-110` の元。本書は従う）、`JDG-365`（表 T-020 は日程の中の前後）だけで、どれも本書と食い違わない。

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| 決定 1 | 前後は、実績バー（`ZO-2`）より手前、依存線（`ZO-4`）より奥（`ZO-15`、順 6） | 輪郭は塗らない線である。実績バーより奥に置くと、実績の塗りが重なる所で破線が消える。依存線より手前に置くと、`FR-110` が手前に置けと定める字とマーカー（`ZO-3`・`ZO-5`）に近づき、押す的の依存線を切る。`CR-575` の表 T-337 は画面の UI パーツの前後であり、日程の中の前後は表 T-020 が持つ（`CR-575` の決定 1、`UZ-12`）⇒ 表 T-337 には行を足さない | 表 T-020 の「順」の欄が 10 行ずれる（`ZO-4` 〜 `ZO-6`） |
| 決定 2 | 形は、タスクなら矩形、マイルストーンなら菱形。現在の図形（表 T-012 の `SH-1` 〜 `SH-5`）を写さない | `DFC-1142` の修正案 ①（トリアージのセッションの推奨）。変更前について読ませたいのは日付であり、図形を写すと「形が変わったのか日付が動いたのか」が読めない。`BaselineTask` は形の列を持たない（`_assets/fig-erd-detail.md` の `AT-134` 〜 `AT-138`） | 矢羽根や端点スパンのタスクでも、変更前は矩形で出る |
| 決定 3 | 縦の置き場は、一致する `Task` の予定の形が占める縦の範囲。横は予定バーと同じ日付から位置への換算 | 同じ位置に重ねれば、どの `Task` の変更前かを線の位置で読める。`FR-015` の「現在の文書の行に従う」の読み | 変更前の日付の範囲に同じ行（`TaskGroup`）の別の `Task` が在ると、輪郭がそれに重なる（`BL-4` で占有に数えない） |
| 決定 4 | 色は `S-148`（控えめな文字の色）を継ぐ新しい行 `S-443`、太さは `S-39`（`planStroke`、予定の輪郭）、破線の刻みは新しい行 `S-444` の 4 × 2px 🔎（表示の倍率を掛けない） | 「グレー」を、表 T-236 が副次のものに持つ中立の灰で描く（新しい色を起こさない。`S-223` が同じく `S-148` を継ぐ前例）。刻みは `S-104`（2, 2）・`S-175`（2 × 1）・`S-28` / `S-29`（3, 2）のどれとも違う組にした。倍率を掛けないのは `S-104`・`S-175` と同じ（表 T-252 に行が無い） | 4 × 2 は測って決めた値ではない（11 節の問い 1） |
| 決定 5 | 読み込んだら `S-69` を真にする（`FR-015` に 1 文） | `FR-015` の「読み込んだとき … 重ねて描くこと」と `S-69` の既定 `false` を両立させる唯一の読み（0.2 節の 3）。`DFC-1142` の修正案 ② も同じ推奨（分類 `C`） | `S-69` は文書に保存する値なので、重ねた文書は保存すると `baselineVisible: true` で残る |
| 決定 6 | 「重ねる予定が無い」を `BaselineTask` 0 件と読む。一致が 1 つも無く枠が空になった後（`OP-9` の ⚠️）もこれに当たり、押せばもう一度ファイルを選べる | 枠が空なら描くものが無く、`JDG-722` の「押して何も起きない」と同じ場面である | 空の枠を読んだ直後に `IC-4` を押すと、切り替えではなくファイルの選択が出る |
| 決定 7 | `S-69` の切り替えは取り消しの対象外のまま（`UN-7`）。取り込みの取り消し（`UN-18`）は `S-69` を戻さない | `UN-7` は表示の切り替えを対象外とする。重ねの取り込みを 1 段とする `UN-18` の範囲を広げない | 取り込みを取り消すと、`S-69` は真のまま重ねが 0 件になる —— `IC-4` は押された見た目のまま、押すとファイルの選択が出る |
| 決定 8 | 予定の表示（`S-227`）では重ねを止めない | 重ねは自分の切り替え `S-69` を持つ。`FR-049` が予定と実績の 2 つの切り替えを独立とした読みを、`S-69` にも当てた | 予定を隠すと、変更前の輪郭だけが残る |
| 決定 9 | 表 T-038 の占有に数えない（`BL-4`） | 重ねは現在の日程の上に置く絵であり、数えると `S-69` を切り替えるたびに現在の日程の形の置き場が動く | 輪郭が隣の `Task` の形と重なりうる |
| 決定 10 | `IC-4` の押された見た目（`app-header-items.ts:86`、`isPressed: settings.baselineVisible`）は変えない | 見た目を「重ねが在って `S-69` が真」にすると、表示の規則を 1 つ足すことになる。本書の範囲は `JDG-722` の押したときの振る舞いまで | 決定 7 の代償と同じ |

---

## 1. 範囲 —— 要求ごとの行き先

| 何 | 仕様で変える所 | 編集 | 裁定を戻すとき |
|---|---|---|---|
| 描く対象・形・線・占有 | 表 T-339（新）の `BL-1` 〜 `BL-4`、`FR-015` の STATEMENT に 1 文 | E-01 ・ E-02 | 各 1 行（例: 図形を写す ⇒ `BL-2` の 1 文） |
| 前後 | 表 T-020 の `ZO-15`（新）と「順」の欄、表 T-020 の注、表 T-274 の `PP-7` | E-03 〜 E-14 | `ZO-15` を消して「順」を詰める（10 セル） |
| 読み込んだら出す | `FR-015` の STATEMENT に 1 文 | E-01 | その 1 文 |
| 重ねる予定が無いときの `IC-4` | 表 T-024a の `OP-15`（新）、`OP-9` の 1 句、`UC-006` 5a、表 T-109 の `IC-4`、`FR-015` に 1 文、辞書の `IC-4` の説明 | E-01 ・ E-15 〜 E-18 ・ J-04 | `OP-15` を消し、`IC-4` ・ `OP-9` ・ 5a を旧に戻す |
| 状態機械 | `state-machines.json` の `documentOpenAsked`・`readingDocumentFile`・`documentFileRead` | J-05 〜 J-07 | 同じ 3 か所を旧に |
| 値 | 表 T-236 の `S-443`、表 T-206 の `S-444`（新）。`S-39` は読むだけ | J-01 ・ J-02 | 各行の値 |
| 接頭辞 | `row-id-prefixes.json` の `BL` | J-03 | — |
| 生成器 | `tools/generate_entity_types.py` の `SCHEDULE_COLOURS` と新しい群 | 4.3 節 | — |

**数**: 仕様の文の編集 18（E-01 〜 E-18。`01-04-requirements.md` 17、`_assets/tbl-glossary.md` 1。E-14 は旧が 2 通りのうち 1 つ）、原稿 JSON の編集 7（J-01 〜 J-07）、生成器 1（4.3 節）。

⚠️ **同じ所を書く保留の CR**（`87d98a47` で `change-request/` を読んだ。13 節）:
- `CR-558`（W3）—— 表 T-020 に `ZO-14` を順 2 で足し、`ZO-10` の文を広げ、`PP-7` に `ZO-14` を足す。
- `CR-556`（W3）—— 表 T-020 に `ZO-13` を `ZO-4` と `ZO-8` のあいだに足し、注から「期限の印」を外し、`PP-7` に `ZO-13` を足す。調整役の計画は、その E-04・E-06 を `CR-558` の新の上で書き直す（`cr-plan-2026-09-26.md` の W3 の行）。
- `CR-559`（W3）—— 表 T-020 の `ZO-10` の末に 1 句。
- `CR-575`（W4、本書の直前）—— 表 T-020 の注に 1 文を足し、表 T-020 の行と順は変えない。画面の UI パーツの前後は新しい表 T-337 が持ち、日程の中は `UZ-12` の中の表 T-020 に従う ⇒ 重ねの行は表 T-020 だけに置く（決定 1）。
- ⇒ E-03 〜 E-14 の旧は、上の 4 本の新を当てた写しで数えた。「順」の欄の書き換えは、行の文に触れない部分の置き換え（`kind=sub`）にしたので、`ZO-10` の文が `CR-558` ・ `CR-559` のどちらの形でも当たる。
- `CR-576`（W2）は表 T-236 の `S-163` を、`CR-556` は `S-311` の後ろを書く —— J-02 は `S-163` の項の頭（`"id": "S-163",`）の前に足すので、どちらの後でも 1 回だけ当たる。
- `CR-584` ・ `CR-585` ・ `CR-586` ・ `CR-587` ・ `CR-589` は同じ時に起草中で、`87d98a47` に無い（13 節の「見えなかったもの」）。

---

## 2. 新しい識別子（仮 —— 調整役が当てる直前に詰める）

| 仮の名 | 種類 | 何か |
|---|---|---|
| `T-339` | 表 | 変更前の予定の輪郭（`FR-015` の中、RATIONALE の後） |
| `BL` | 接頭辞 | Baseline —— 表 T-339 の行 |
| `BL-1` 〜 `BL-4` | 行 | 表 T-339 の 4 行 |
| `ZO-15` | 行 | 表 T-020 の変更前の予定の輪郭 |
| `OP-15` | 行 | 表 T-024a の「重ねる予定が無いときに `IC-4` が押されたとき」 |
| `S-443` | 設定値の行 | 表 T-236 の輪郭の色（`S-148` を継ぐ） |
| `S-444` | 設定値の行 | 表 T-206 の輪郭の破線の刻み |
| `isBaselineRoute` | ガードの名 | `fileOperationStateMachine` の `documentFileRead`（J-07） |
| `baseline` | `openRoute` の値 | J-05 の注 |
| `NOT_STORED_BASELINE_OUTLINE_SIZES` | 生成器の群の名（仮） | 4.3 節 |

- ⭐ 当てる直前（2026-09-26、`e4011375` に `CR-575` を当てた作業木）に測り直した: 仕様が定める表の番号は `T-337` までで `T-338`・`T-339` は使われていなかった。`BL-`・`ZO-15`・`OP-15`・`S-443`・`S-444`・`isBaselineRoute`・`NOT_STORED_BASELINE_OUTLINE_SIZES` は `docs/spec`・`src`・`tests`・`tools` に 0 件（設定値の行は `S-439` まで）。登録簿の件数は 172 で `BL` は無く、本書の後に 173。
- ⛔ 番号は仮である。`90800` 〜 `90899` の帯は本書だけのもの（調整役が配った）。表・接頭辞・行 ID が当てる時に空いていることは、当てる直前に調整役が測り直す（規則 02 の 2.5 節）。
- 本書が取らないもの: 新しい要求（`FR-`）・用語集の行（`U-`・`K-`）・辞書の新しい項・状態。`S-443` と `S-444` は鍵を持たない行なので、表 T-104 の `K-` の行も辞書の項も要らない。

---

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

| 消すもの | 所（`87d98a47`） | 置き換わる先 | 編集 |
|---|---|---|---|
| 表 T-109 の `IC-4` の「⚠️ **ファイルを読む入口ではない** —— 読む入口は `IC-1` 1 つであり」 | `_assets/tbl-glossary.md:513` | 重ねる予定が無いときは `OP-15`。在るときはファイルを読む入口ではない（文は残して条件を付ける） | E-18 |
| `OP-9` の「選ぶ入口は `OP-3` の第 3 の選択肢である。」 | `01-04-requirements.md:5668` | `OP-3` の第 3 の選択肢と、重ねる予定が無いときの `IC-4`（`OP-15`） | E-16 |
| 表 T-020 の注の「変更前の予定の重ね」（「まだ描いていないので本表に行を持たない」の対象） | `:4009`（`CR-556` の E-05 の後の文） | `ZO-15` | E-13 |
| 表 T-020 の「順」の欄 `ZO-4` 〜 `ZO-6` の 10 の数（`CR-558` ・ `CR-556` の後で 6 〜 15） | 表 T-020（`:3987` の表題の下）の写し | 7 〜 16（`ZO-15` が 6 に入る） | E-03 〜 E-12 |
| `IC-4` の説明（辞書）「変更前の予定を重ねて表示する。もう一度押すと非表示にする」 | `_source/display-words.json:75` ・ `:76` | 末に「重ねる予定が無いときは、そのファイルを選ぶ」を足す | J-04 |
| `documentFileRead` の `readingDocumentFile` の 2 つの枝（再読み込みか、`U-56` を出すか） | `_source/state-machines.json:3916` 〜 `:3946` | 3 つ目の枝（重ねの入口なら `U-56` を出さずに取り込む） | J-07 |

⭐ **消さないもの**（読み直して真のまま）: `OP-2` の「取込（合流）に別の入口を設けてはならない（MUST NOT）」（合流の話。0.2 節の 6）。`OP-3` の文（決定 1 の R1.3 ③）。`FR-108` の「変更前の予定の重ね（`FR-015`）」を掴めないものに数える文（`BL-4` はそこを指すだけ）。`UN-18`・`UN-7`（決定 7）。`FR-015` の RATIONALE（持つもの・書き出さないもの・通知）。`IC-73` の行（`OP-3` の第 3 の選択肢のまま）。

---

## 4. 書き直す所（当てる体がそのまま使う文）

⛔ **作法**（`CR-555` ・ `CR-559` と同じ）: 各編集は「旧」を「新」で置き換える。**置き換える前に、旧がそのファイルに 1 回だけ現れることを数えること**（13 節の道具が 25 件すべてで数えた）。旧・新は、下の `<!-- EDIT … -->` の直後の 2 つの `text` の塊である。4 節の編集はこの順に当てる（E-03 〜 E-12 は行 ID の違う置き換えなので、どの順でも旧は 1 回ずつである）。
⚠️ 行末の 2 つの半角空白（改行の印）も旧と新の一部である。
⚠️ `kind=sub` は行の一部の置き換えであり、塊の末の改行を旧にも新にも含めない。ほかは行の全体（末の改行まで）である。
⚠️ JSON の塊は改行を LF に揃えて数えた（原稿は CRLF。当てる者は CRLF のまま読み、同じ並びを置き換えること）。当てた後は `json.loads` で読めることと、`*.schema.json` を確かめること。
⚠️ 生成物（`_assets/tbl-settings.md` ・ `_assets/tbl-state-machines.md` ・ `_assets/tbl-row-id-prefixes.md` ・ `src/` の生成物）は手で直さない。原稿を直して `npm run gen` を打つ。

### 4.1 文の編集（`01-04-requirements.md` ・ `_assets/tbl-glossary.md`）

<!-- EDIT id=E-01 file=docs/spec/01-04-requirements.md -->
`FR-015` の STATEMENT の末（段落の終わりに 3 文を足す。旧の行は末に改行の印を足す）。旧
```text
重ねる相手の `TaskGroup` の構造が違うときは、現在の文書の行に従うこと。
```
新
```text
重ねる相手の `TaskGroup` の構造が違うときは、現在の文書の行に従うこと。  
輪郭の形・置き場・線は表 T-339 に従い、前後は `FR-110` の 表 T-020 の `ZO-15` とすること（MUST）。  
⭐ 重ねを読み込んだときは、`_assets/tbl-settings.md` の 表 T-202 の `S-69` を真にすること（MUST） —— 既定は偽なので、書き換えなければ読み込んだ直後に何も描かれず、本要求の「読み込んだとき … 重ねて描く」が成り立たない。  
⭐ 重ねる予定が無いときに `_assets/tbl-glossary.md` の 表 T-109 の `IC-4` が押されたときは、表 T-024a の `OP-15` に従う。
```

<!-- EDIT id=E-02 file=docs/spec/01-04-requirements.md -->
`FR-015` の RATIONALE の末の段の後に、表 T-339 を足す。旧
```text
対応するタスクが無い重ねる側のタスクは、描かずに通知すること（MUST） —— ⚠️ `FR-022` の対応付けの禁止は合流についての規則であり、重ねには掛からない（`FR-087` の `OP-9` が合流でないと定める）。
```
新
```text
対応するタスクが無い重ねる側のタスクは、描かずに通知すること（MUST） —— ⚠️ `FR-022` の対応付けの禁止は合流についての規則であり、重ねには掛からない（`FR-087` の `OP-9` が合流でないと定める）。

**表 T-339 — 変更前の予定の輪郭**

| 行 ID | 何について | 規則 |
| --- | --- | --- |
| BL-1 | 描く対象 | `BaselineTask`（`_assets/fig-erd-detail.md` の `ET-18`）のうち、次の 3 つがそろうものだけを描くこと（MUST）。<br>① `UID` が一致する `Task` が、そのフレームで描かれている行（`TaskGroup`）に載っている —— 人が畳んだ行・隠した行（表 T-015 の `HR-1a` / `HR-6`）と、グループ LOD（表 T-005a の `L-3`）が描かない行の `Task` には描かない。<br>② `start`（`AT-136`）と `finish`（`AT-137`）の両方を持つ。<br>③ `_assets/tbl-settings.md` の 表 T-202 の `S-69` が真である（`FR-049`）。<br>⚠️ 予定の表示（同表の `S-227`）では止めない —— 重ねは自分の切り替え `S-69` を持つ |
| BL-2 | 形と置き場 | 横は、`start` から `finish` までを、予定バーと同じ日付から位置への換算で置くこと（MUST）。<br>縦は、一致する `Task` の予定の形が占める縦の範囲とすること（MUST） —— 同じ位置に重ねることで、どの `Task` の変更前かを読ませる。<br>形は、`milestone`（`AT-138`）が偽なら矩形、真なら `start` の位置を中心とし、縦と横の対角線をどちらもその縦の範囲の高さとする菱形とすること（MUST） —— 変更前について読ませたいのは日付であり、現在の図形（表 T-012）を写すと、形が変わったのか日付が動いたのかが読めない。<br>置く区画（ピン止めの帯か、その下の残り。`FR-098`）は、一致する `Task` の予定の形と同じとする |
| BL-3 | 線 | 塗らず、輪郭の線だけを描くこと（MUST）。<br>色は `_assets/tbl-settings.md` の 表 T-236 の `S-443`、太さは同書の 表 T-201 の `S-39`（予定の輪郭と同じ太さ）、破線の刻みは同書の 表 T-206 の `S-444` とする。<br>⛔ 刻みを 表 T-208 の `S-104`（予実の補助線）や 表 T-206 の `S-175`（選択の枠）と同じ組にしてはならない（MUST NOT） —— 色だけで区別しない規則（`FR-015`）を、刻みでも守る |
| BL-4 | 占有 | 表 T-038 の占有に数えないこと（MUST） —— 重ねは現在の日程の上に置く絵であり、数えると `S-69` を切り替えるたびに現在の日程の形の置き場が動く。<br>⭐ 掴めないことは `FR-108` が、書き出す絵に載ることは `FR-080` が持つ |
```

<!-- EDIT id=E-03 file=docs/spec/01-04-requirements.md kind=sub -->
表 T-020。`ZO-2`（順 5）と `ZO-4` のあいだに `ZO-15` を足し、`ZO-4` の順を 1 つ下げる。旧
```text
| ZO-4 | 6 |
```
新
```text
| ZO-15 | 6 | 変更前の予定の輪郭（`FR-015` の 表 T-339）。<br>予定バーと実績バーより手前、依存線（`ZO-4`）より奥とする —— 輪郭は塗らない線なので、実績バーより奥では隠れ、依存線・印・字より手前では押す的と読む字を切る |
| ZO-4 | 7 |
```

<!-- EDIT id=E-04 file=docs/spec/01-04-requirements.md kind=sub -->
表 T-020 の「順」（`CR-556` の `ZO-13`）。旧
```text
| ZO-13 | 7 |
```
新
```text
| ZO-13 | 8 |
```

<!-- EDIT id=E-05 file=docs/spec/01-04-requirements.md kind=sub -->
旧
```text
| ZO-8 | 8 |
```
新
```text
| ZO-8 | 9 |
```

<!-- EDIT id=E-06 file=docs/spec/01-04-requirements.md kind=sub -->
旧
```text
| ZO-3 | 9 |
```
新
```text
| ZO-3 | 10 |
```

<!-- EDIT id=E-07 file=docs/spec/01-04-requirements.md kind=sub -->
旧
```text
| ZO-5 | 10 |
```
新
```text
| ZO-5 | 11 |
```

<!-- EDIT id=E-08 file=docs/spec/01-04-requirements.md kind=sub -->
旧
```text
| ZO-9 | 11 |
```
新
```text
| ZO-9 | 12 |
```

<!-- EDIT id=E-09 file=docs/spec/01-04-requirements.md kind=sub -->
旧（`ZO-10` の文は `CR-558` ・ `CR-559` が書くので、順の欄までを置き換える）
```text
| ZO-10 | 12 |
```
新
```text
| ZO-10 | 13 |
```

<!-- EDIT id=E-10 file=docs/spec/01-04-requirements.md kind=sub -->
旧
```text
| ZO-11 | 13 |
```
新
```text
| ZO-11 | 14 |
```

<!-- EDIT id=E-11 file=docs/spec/01-04-requirements.md kind=sub -->
旧
```text
| ZO-12 | 14 |
```
新
```text
| ZO-12 | 15 |
```

<!-- EDIT id=E-12 file=docs/spec/01-04-requirements.md kind=sub -->
旧
```text
| ZO-6 | 15（最前面） |
```
新
```text
| ZO-6 | 16（最前面） |
```

<!-- EDIT id=E-13 file=docs/spec/01-04-requirements.md -->
表 T-020 の注（`CR-556` の E-05 が書いた文）。旧
```text
⚠️ 遅れの日数・変更前の予定の重ねは、まだ描いていないので本表に行を持たない —— 描くときに行を足す。  
```
新
```text
⚠️ 遅れの日数は、まだ描いていないので本表に行を持たない —— 描くときに行を足す。  
```

<!-- EDIT id=E-14 file=docs/spec/01-04-requirements.md kind=sub -->
表 T-274 の `PP-7` の覆う行の末。⚠️ 旧は `CR-556` の E-06 を `CR-558` の新の上で書き直した形による ⇒ 次の A と B のうち、ちょうど 1 回現れるほうを当てること（13 節で両方の写しを数えた）。旧 A
```text
`ZO-12` ／ `ZO-14` ／ `ZO-13` |
```
新 A
```text
`ZO-12` ／ `ZO-14` ／ `ZO-13` ／ `ZO-15` |
```

<!-- EDIT id=E-14b file=docs/spec/01-04-requirements.md kind=sub alt=E-14 -->
旧 B（`ZO-13` を `ZO-14` の前に置いた形）
```text
`ZO-12` ／ `ZO-13` ／ `ZO-14` |
```
新 B
```text
`ZO-12` ／ `ZO-13` ／ `ZO-14` ／ `ZO-15` |
```

<!-- EDIT id=E-15 file=docs/spec/01-04-requirements.md kind=sub -->
表 T-024a の末（`OP-14` の行の末）に `OP-15` を足す。旧
```text
本行は人が何も選んでいない起動のときである |
```
新
```text
本行は人が何も選んでいない起動のときである |
| OP-15 | **重ねる予定が無いときに `IC-4` が押されたとき**（`_assets/tbl-glossary.md` の 表 T-109） | **`OP-2` のファイル選択と同じ画面を開き、選んだファイルを重ねる用途で開くこと（MUST）** —— 押しても何も描かれない入口にしない。<br>**`OP-3` の 3 択は問わず、重ねに定めること（MUST）** —— 人は重ねの入口を押して、重ねることを既に選んでいる（`OP-13` が読み直しを置き換えに定めるのと同じ形である）。<br>選んだ後は重ねる用途で開いたときと同じとする —— 検証は `OP-5` と `OP-12`、枠と通知は `OP-9` と `FR-015`、2 つ以上のファイルは `OP-11`、進行中の扱いは `OP-8` が持つ。<br>⚠️ `OP-4` の確認は掛けない —— 現在の文書を捨てない。<br>⚠️ 選ばずに閉じたときは何も変えない —— `S-69` も書き換えない。<br>⭐ 「重ねる予定が無い」とは、文書の `BaselineTask`（`_assets/fig-erd-detail.md` の `ET-18`）が 0 件であることとする —— `OP-9` の「一致が 1 つも無いときは枠が空になる」の後もこれに当たる。<br>⚠️ 重ねる予定が在るときの `IC-4` は `S-69` を切り替えるだけであり、本行に当たらない |
```

<!-- EDIT id=E-16 file=docs/spec/01-04-requirements.md kind=sub -->
`OP-9` の 1 句。旧
```text
選ぶ入口は `OP-3` の第 3 の選択肢である。
```
新
```text
選ぶ入口は `OP-3` の第 3 の選択肢と、重ねる予定が無いときの `IC-4`（`OP-15`）である。
```

<!-- EDIT id=E-17 file=docs/spec/01-04-requirements.md -->
`UC-006` の拡張 5a（段落の終わりに 1 文を足す）。旧
```text
- 5a. 重ねる変更前の予定が読み込まれていない。
  - `GRS` は別ファイルとして読み込ませる。
```
新
```text
- 5a. 重ねる変更前の予定が読み込まれていない。
  - `GRS` は別ファイルとして読み込ませる。  
    閲覧者が変更前の予定の入口（`_assets/tbl-glossary.md` の 表 T-109 の `IC-4`）を押すと、`GRS` はそのファイルを選ばせ、選んだファイルを重ねる（表 T-024a の `OP-15`）。
```

<!-- EDIT id=E-18 file=docs/spec/_assets/tbl-glossary.md -->
表 T-109 の `IC-4`。旧
```text
| IC-4 | `App Header` | 文書 | 変更前の予定の重ねを表示する・非表示にする（`S-69`）。<br>⚠️ **ファイルを読む入口ではない** —— 読む入口は `IC-1` 1 つであり、重ねを選ぶのは 表 T-024a の `OP-3` の第 3 の選択肢である（同 `OP-9`）| `FR-049`（`FR-015`）| — |
```
新
```text
| IC-4 | `App Header` | 文書 | 変更前の予定の重ねを表示する・非表示にする（`S-69`）。<br>⭐ **重ねる予定が無いときは切り替えず、変更前の予定にするファイルを選ばせる**（表 T-024a の `OP-15`） —— 押しても何も描かれない入口にしない。<br>⚠️ **重ねる予定が在るときはファイルを読む入口ではない** —— 読む入口は `IC-1` であり、重ねを選ぶのは 表 T-024a の `OP-3` の第 3 の選択肢である（同 `OP-9`）| `FR-049`（`FR-015`）| — |
```

### 4.2 原稿 JSON の編集（`_source/`）

<!-- EDIT id=J-01 file=docs/spec/_source/settings.json -->
表 T-206 に `S-444` を足す（`S-334` の項の前 —— `S-334` の備考は「同上」で始まらないので、足しても前の行を継ぐ文が無い）。旧
```text
    {
     "id": "S-334",
```
新
```text
    {
     "id": "S-444",
     "value": {
      "ja": "変更前の予定の輪郭の破線の刻み（`FR-015` の 表 T-339 の `BL-3`）"
     },
     "default": {
      "pair": [
       "4",
       "2"
      ],
      "suffix": "px",
      "mark": "🔎"
     },
     "note": {
      "ja": "見せ方の寸法であり、日程の内容ではないので保存しない。⭐ **描く長さと空ける長さの組である** —— 予実の補助線（表 T-208 の `S-104`、2 と 2）とも、選択の枠（`S-175`、2 × 1）とも、再開アイコンへの破線（表 T-201 の `S-28` と `S-29`、3 と 2）とも違う組にした（`FR-015` の「刻みは予実の補助線と別の値にする」）。⭐ 表示の倍率を掛けない —— `S-104` と `S-175` と同じく、表 T-252 に行を持たない。⛔ 測って決めた値ではない（🔎）"
     }
    },
    {
     "id": "S-334",
```

<!-- EDIT id=J-02 file=docs/spec/_source/settings.json -->
表 T-236 に `S-443` を足す（`S-163` の項の前。`S-163` の備考は「同上」で始まらない）。旧
```text
    {
     "id": "S-163",
```
新
```text
    {
     "id": "S-443",
     "name": {
      "ja": "変更前の予定の輪郭の色（`FR-015` の 表 T-339 の `BL-3`）"
     },
     "light": {
      "sameAs": "S-148"
     },
     "dark": {
      "sameAs": "S-148"
     },
     "hue": {
      "ja": "—"
     },
     "note": {
      "ja": "⭐ **控えめな文字の色（`S-148`）を継ぐ** —— `FR-015` の「グレー」を、本表が副次のものに持つ中立の灰で描き、新しい値を起こさない（`S-223` が同じく `S-148` を継ぐ）。⛔ テーマの色相に追随させない（`FR-041`）—— 色相を帯びると、予定バーの色（`S-155`・`S-156`）と見分けにくい。⛔ 色だけで区別しない —— 破線の刻みは 表 T-206 の `S-444` が持つ"
     }
    },
    {
     "id": "S-163",
```

<!-- EDIT id=J-03 file=docs/spec/_source/row-id-prefixes.json -->
接頭辞 `BL` を `BF` と `BO` のあいだに足す。旧
```text
  {
   "prefix": "BO",
```
新
```text
  {
   "prefix": "BL",
   "words": "Baseline",
   "owner": "spec",
   "means": {
    "ja": "変更前の予定の輪郭を描く規則"
   }
  },
  {
   "prefix": "BO",
```

<!-- EDIT id=J-04 file=docs/spec/_source/display-words.json -->
辞書の `IC-4` の説明。旧
```text
    "ja": "変更前の予定を重ねて表示する。もう一度押すと非表示にする",
    "en": "Overlay the baseline; press again to hide it"
```
新
```text
    "ja": "変更前の予定を重ねて表示する。もう一度押すと非表示にする。重ねる予定が無いときは、そのファイルを選ぶ",
    "en": "Overlay the baseline; press again to hide it. With no baseline yet, choose its file"
```

<!-- EDIT id=J-05 file=docs/spec/_source/state-machines.json -->
出来事 `documentOpenAsked` の出どころと運ぶ値。旧
```text
     "key": "documentOpenAsked",
     "source": {
      "kind": "input",
      "rows": [
       "IC-1",
       "SK-10",
       "OP-2",
       "CHN-1",
       "SK-21",
       "OP-13"
      ],
      "note": {
       "ja": "開く入口・`Ctrl` ＋ `O`、ファイルを落とした、`Ctrl` ＋ `R`"
      }
     },
     "carries": [
      {
       "name": "openRoute",
       "rows": [
        "OP-2",
        "OP-13"
       ],
       "note": {
        "ja": "`chooser`（開く入口・`Ctrl` ＋ `O`）／ `drop`（ファイルを落とした）／ `reopen`（`Ctrl` ＋ `R`）"
       }
```
新
```text
     "key": "documentOpenAsked",
     "source": {
      "kind": "input",
      "rows": [
       "IC-1",
       "SK-10",
       "OP-2",
       "CHN-1",
       "SK-21",
       "OP-13",
       "IC-4",
       "OP-15"
      ],
      "note": {
       "ja": "開く入口・`Ctrl` ＋ `O`、ファイルを落とした、`Ctrl` ＋ `R`、重ねる予定が無いときの変更前の予定の入口"
      }
     },
     "carries": [
      {
       "name": "openRoute",
       "rows": [
        "OP-2",
        "OP-13",
        "OP-15"
       ],
       "note": {
        "ja": "`chooser`（開く入口・`Ctrl` ＋ `O`）／ `drop`（ファイルを落とした）／ `reopen`（`Ctrl` ＋ `R`）／ `baseline`（重ねる予定が無いときの変更前の予定の入口。`OP-3` を問わずに重ねる）"
       }
```

<!-- EDIT id=J-06 file=docs/spec/_source/state-machines.json -->
状態 `readingDocumentFile` が運ぶ `openRoute` の根拠。旧
```text
       "key": "readingDocumentFile",
       "parent": null,
       "initial": false,
       "carries": [
        {
         "name": "openRoute",
         "rows": [
          "OP-2",
          "OP-13"
         ]
        }
       ],
```
新
```text
       "key": "readingDocumentFile",
       "parent": null,
       "initial": false,
       "carries": [
        {
         "name": "openRoute",
         "rows": [
          "OP-2",
          "OP-13",
          "OP-15"
         ]
        }
       ],
```

<!-- EDIT id=J-07 file=docs/spec/_source/state-machines.json -->
`fileOperationStateMachine` の `documentFileRead`。重ねの入口から読んだときは `U-56` を出さずに取り込みへ進む。旧
```text
      "documentFileRead": {
       "readingDocumentFile": [
        {
         "to": "awaitingDiscardAnswer",
         "guard": [
          {
           "name": "isReopenRoute"
          }
         ],
         "evidence": [
          "OP-13",
          "OP-4"
         ]
        },
        {
         "to": "awaitingOpenChoice",
         "guard": [
          {
           "name": "isReopenRoute",
           "not": true
          }
         ],
```
新
```text
      "documentFileRead": {
       "readingDocumentFile": [
        {
         "to": "awaitingDiscardAnswer",
         "guard": [
          {
           "name": "isReopenRoute"
          }
         ],
         "evidence": [
          "OP-13",
          "OP-4"
         ]
        },
        {
         "to": "importingDocument",
         "guard": [
          {
           "name": "isBaselineRoute"
          }
         ],
         "effect": "importIncomingDocument",
         "evidence": [
          "OP-15",
          "OP-9",
          "RD-3"
         ]
        },
        {
         "to": "awaitingOpenChoice",
         "guard": [
          {
           "name": "isReopenRoute",
           "not": true
          },
          {
           "name": "isBaselineRoute",
           "not": true
          }
         ],
```

⚠️ J-07 の後、生成される 表（`_assets/tbl-state-machines.md`）の `fileFlow/documentFileRead` の `readingDocumentFile` の升は 3 つの枝になり、図には `readingDocumentFile --> importingDocument : documentFileRead` の辺が 1 本増える。`isBaselineRoute` と `isReopenRoute` は同じ `openRoute` の違う値なので、同時に真にならない。`confirmationStateMachine` の `documentFileRead`（`isReopenRoute` だけを見る）と、`unsavedEditsStateMachine` の `documentOpenLanded`（`isReplaceChoice` を見る —— 重ねは置き換えでないので `editsUnsaved` へ。`DFC-784` は変えない）は書かない。

### 4.3 生成器（形で示す。規則 02 の 3.5 節: 設定値の行は生成器の群に載るまで src に出ない）

- `tools/generate_entity_types.py` の `SCHEDULE_COLOURS` の末に `'S-443'` を足す（表 T-236 の行。`svg-renderer.ts` へ刷られる）。
- 新しい群 `NOT_STORED_BASELINE_OUTLINE_SIZES`（仮の名）: `(['S-444'], DRAWN_INTO_THE_EXPORTED_PICTURE)` —— 書き出す絵にも描く（`FR-080`）。`src/adapter/svg-renderer/svg-renderer.ts` へ刷る 2 か所（刷る塊の列と、ファイルごとの群の名簿）に足す。`NOT_STORED_DUAL_CURSOR_SIZES` と同じ形。
- 表 T-201 の `S-39`（`planStroke`）は今のまま読む。`CR-572` の後は表 T-201 ごと `SETTINGS_CONSTANTS` に刷られる（`CR-572` の 3 節）ので、群の手当ては要らない。
- ⚠️ `npm run gen:check` は群に載せ忘れても緑のままである（規則 02 の 3.5 節）—— 当てる体は、生成された `svg-renderer.ts` の区画に `S-443` と `S-444` の名が在ることを `grep` で確かめること。

---

## 5. 継ぎ目 —— 依頼文にこのまま写すこと

```
SEAM (verbatim in the implementer's and the tester's brief)
S-1  geometry (src/entity/layout-engine/schedule-geometry/schedule-geometry.ts,
     ScheduleGeometry + geometryFromLayout):
     ScheduleGeometry gains `baselineOutlines: readonly BaselineOutline[]`,
     BaselineOutline = { taskUid: number; kind: 'rectangle' | 'diamond';
                         box: ScreenRect; isPinned: boolean }.
     One entry per BaselineTask that meets table T-339 BL-1 (uid matches a
     Task on a drawn row; start and finish both non-null; S-69 true). S-227 does
     NOT gate it. box.x..box.x+box.width = the plan bar's day-to-x mapping of
     start..finish (same finish handling as the plan bar); box.y/height = the
     matching Task's plan figure vertical extent. kind 'diamond' when
     milestone is true: centred on x(start), both diagonals = box.height.
     Not counted in the occupancy of table T-038 (BL-4).
S-2  drawing (src/adapter/svg-renderer): no fill; stroke = S-443 (resolved
     like the other SCHEDULE_COLOURS rows), stroke-width = planStroke (S-39,
     scaled like the plan outline), stroke-dasharray = S-444 (not scaled).
     Pinned / scrolling split like planParts. Layer: zoLayer('ZO-15', ...)
     placed after ZO-2 and before ZO-4 in svgFromSchedule. data-zo is the row ID.
S-3  hit test: none (FR-108 already lists the overlay as not grabbable).
S-4  IC-4 (src/adapter/input-command-translator/input-command-translator.ts,
     ENTRY.baselineVisible): when schedule.baselineTasks is empty, do NOT
     toggle S-69; raise the open request with openRoute 'baseline'
     (fileFlow/documentOpenAsked). When non-empty, unchanged.
S-5  file flow: openRoute gains 'baseline' (file-store.ts OpenRoute,
     file-flow-values.ts FileFlowOpenRoute). Guard isBaselineRoute beside
     isReopenRoute. On documentFileRead with isBaselineRoute: no U-56, go to
     importingDocument with openChoice 'baseline' (the IC-73 path). No OP-4
     question. Closing the chooser without a file changes nothing (S-69 kept).
S-6  import (src/use-case/import-document/import-document.ts, baselinedDocument):
     the landed document also has documentSettings.baselineVisible = true
     (FR-015's new MUST). Same one undo step (UN-18); S-69 is not undone (UN-7).
No other new constant, no magic number.
```

---

## 6. グラフ（`impact.py` ・ `induced.py`。2026-09-26、作業木の `scratch/spec-check/sd-out/json/index.json`（18:16 に書かれた）で測った）

⚠️ 索引は起草のあいだに進んでいた作業木（W1 の編集の途中）から作られている ⇒ 下の「参照箇所」の行番号は `87d98a47` の行番号と数十行ずれる。本書の本文の `file:line` は、どれも `87d98a47` を `grep` した行番号である。

### 6.1 `impact.py` —— 触る行ごとの届く先（要求 / 参照）

| 対象 | 要求 / 参照 | 扱い |
|---|---|---|
| `FR-015` | 5 / 12 | `FR-031`（`UN-18`）・`FR-016`・`FR-108`・`FR-087`（`OP-9`）・`FR-076`（`RS-16`）—— どれも重ねの取り込み・掴めないこと・通知を引き、描き方を引かない。E-01 は文を足すだけ |
| `UC-006` | 9 / 20 | `FR-084`・`FR-043`・`FR-013`・`FR-045`・`FR-046`・`FR-047`・`FR-014`・`FR-015`・`FR-049` —— 手順 2 〜 4 を引く。5a を引くのは `FR-015` の ORIGIN だけ |
| `IC-4` | 0 / 1 | 表 T-109 の外では `RC-13` の段（`01-04-requirements.md` の 4.3 節）だけ |
| `IC-73` | 1 / 5 | `FR-036` と状態機械（`screen/flowSurfaceAnswered`・`fileFlow/openChoiceAnswered`）—— 変えない |
| `S-69` | 0 / 1 | `IC-4` の行だけ |
| `OP-9` | 2 / 4 | `FR-031`・`FR-015`、状態 `importingDocument` の根拠 —— E-16 は入口の句だけ |
| `OP-3` | 7 / 26 | 書かない（0 節 ② の R1.3 ③） |
| `OP-13` | 1 / 5 | 前例として読むだけ |
| `OP-2` | 3 / 7 | 書かない（0.2 節の 6） |
| 表 T-024a | 17 要求（2 次 47） | 塊「開くと合流」（表 T-024・T-024a・T-032）。⭐ 行を 1 つ足すだけで既存の行を動かさない。塊の注「入口は「開く」1 つ」は合流の入口の話（`OP-2`） |
| `FR-087` | 7 / 16 | 書かない |
| 表 T-020 | 6 要求（2 次 21） | `FR-081`・`FR-011`・`FR-084`・`FR-016`・`FR-104`・`FR-110` —— どれも「表 T-020 に従う」と指すだけで、順の数を引かない（`CR-558` の 6 節と同じ）。`ZO-4` の順を名指す文は 0 |
| `FR-110` | 3 / 8 | 書かない。STATEMENT の「名称・担当と進捗・進捗マーカーは、線と形より手前」を `ZO-15` は守る |
| `PP-7` ・ 表 T-274 | 0 / 0 ・ 2 次 0 | 浮いている |
| `FR-108` | 4 / 5 | 書かない（重ねを掴めないものに数える文は真のまま） |
| `FR-049` | 13 / 42 | 書かない（`S-69` を状態条件に加える一般則がそのまま効く） |
| `UN-18` | 0 / 0 | 書かない（決定 7） |
| `S-39` | 1 / 1 | 読むだけ（塊「設定値の相互依存」—— 値を変えない） |
| `S-148` | 1 / 2 | 読むだけ（`sameAs` で継ぐ） |
| `S-104` ・ `S-175` | 0 / 0 ・ 1 / 3 | 読むだけ（刻みの比べ先） |

⭐ 導いた条項ごとに、届いた行を `rulings.md` で引いた（規則 02 の 1）: 0 節 ③ の頭のとおり。`DFC-784`（重ねが未保存の編集に数えられるか、`未検討`）は本書の決定 5 と同じ場面に触れる —— 10 節。

### 6.2 `induced.py`

| 種（24） | 解決 | 種の中の辺 | 閉路 | 扱い |
|---|---|---|---|---|
| `FR-015 T-020 FR-110 PP-7 T-274 IC-4 IC-73 S-69 OP-9 OP-3 OP-13 OP-2 T-024a FR-087 UC-006 FR-108 FR-049 UN-18 S-39 S-148 S-104 S-175 FR-098 RT-4a` | 24/24 | 30 | 1: 大きさ 6 —— `FR-015` `FR-049` `FR-087` `OP-3` `OP-9` `UC-006` | ⭐ 本書はそのうち `FR-015`（E-01 ・ E-02）・`OP-9`（E-16）・`UC-006`（E-17）を書き、`FR-087` の表 T-024a に `OP-15` を足す（E-15）⇒ 4 つを 1 つの計画で、同じ体・同じ巡で当てる（8 節の波 1）。`FR-049` と `OP-3` の文は書かない |

---

## 7. 数の予測（`87d98a47` の写しで測った。当てた後に同じ数え方で突き合わせる）

`md-checks.py` を写しに当てて数えた（13 節）。前は、`87d98a47` に `CR-558` → `CR-556` → `CR-559` → `CR-575` の表 T-020 まわりの新だけを当てた写し。

| 数 | 前 | 後（本書だけ） | 内訳 |
|---|--:|--:|---|
| tables | 189 | 190 | 表 T-339 |
| figures | 28 | 28 | — |
| rows | 2366 | 2372（写しで測った。生成物を刷る前） | `BL-1` 〜 `BL-4` 4、`ZO-15` 1、`OP-15` 1 |
| uids | 164 | 164 | — |
| 設定値の行 | — | ＋2 | `S-443`（表 T-236）・`S-444`（表 T-206）。`npm run gen` の後、`tbl-settings.md` に 2 行 |
| 接頭辞 | — | ＋1 | `BL`（`tbl-row-id-prefixes.md` に 1 行） |
| 辞書の項 | — | 0 | `IC-4` の説明の語だけを変える |
| 状態機械 | — | 状態 0、遷移 ＋1 | `readingDocumentFile` → `importingDocument`（`documentFileRead`） |

⚠️ 後の写しでは検査 7 ・ 8 が `S-443` ・ `S-444` を「無い行」と 2 件ずつ数える —— 写しは `npm run gen` を打っていない（`tbl-settings.md` が古い）ためであり、当てる波で gen の後に消える。前の写しの検査 5 ・ 7 の 4 件（`T-304` ・ `T-337` ・ `FR-152` ・ `UZ-12`）は、`CR-556` ・ `CR-575` の表を写していないためで、本書の差ではない。
⚠️ 前の 2366 は `87d98a47` の 2364 に `CR-558` の `ZO-14` と `CR-556` の `ZO-13` を足した数であり、W1 〜 W4 のほかの変更要求が動かす数は含まない ⇒ 当てるときは、その時点の数に本書の差（tables ＋1、rows ＋6）を足して突き合わせる。

---

## 8. 波 —— 持ち場で割る（規則 02 の 3.5 節: 原稿と読む側は同じ波）

```
wave 1  spec (ONE body, after CR-575 landed in W4)
          recount every old block of section 4 on that tree (E-14: exactly one of A / B),
          apply E-01..E-18 and J-01..J-07 in section 4's order,
          then tools/generate_entity_types.py (section 4.3), npm run gen && npm run gen:check
          -> the cycle FR-015 / FR-049 / FR-087 / OP-3 / OP-9 / UC-006 is written in this one pass
wave 2  code, lane L1 (docs/development-records/cr-plan-2026-09-26.md: 555 -> 556 -> 583 -> 588)
          2a entity/layout-engine  schedule-geometry.ts (S-1)
          2b adapter/svg-renderer  svg-renderer.ts, schedule-task-figures.ts (S-2) -- cut from 2a
          2c input + file flow     input-command-translator.ts, file-store.ts,
                                   file-flow-values.ts, document-file-flow.ts,
                                   import-document.ts (S-4..S-6) -- disjoint from 2a/2b
wave 3  tests by a spec-only tester (never a wave-2 body), docs/spec + section 5 only, MERGED tree
wave 4  coordinator: check.sh, vitest, e2e on the merged tree; dist/ for the user to try by file://
```

- ⛔ **波 2b は性能のセッションの持ち場**（`svg-renderer.ts`・`schedule-task-figures.ts`）が合流するまで待つ。L1 の順（`CR-555` → `CR-556` → `CR-583` → 本書）を守る。
- ⚠️ 毎フレームの仕事が増える（`CH-3`）—— `S-69` が真のあいだ、描く `Task` ごとに輪郭 1 つ。`S-69` が偽なら 0。⛔ 性能の試し（`RISK-001` の門）は、前に立つ者が利用者に声をかけてから走らせる（記録 `perf-test-notify`）。
- ⚠️ 検査 39（MUST の条文の網羅）の数が動く見込み —— 新しい MUST ／ MUST NOT が E-01 ・ E-02 ・ E-15 に立つ。⚠️ 検査 37 の `dictionary-table-pairing.txt`（`IC-4` の行と語の組の指紋）が動く見込み —— E-18 と J-04 を同じ波で当てる。⛔ 基準線は体が動かさない（`JDG-520`）。
- ⚠️ 検査 57（決定表）: 表 T-339 は条件の列を持たない（`何について` の 1 列）ので、検査の名簿に入れない。
- ⚠️ `dist/` は利用者が `file://` で試す。見せ所: 見本を `IC-71` で開いて 1 タスクを動かし、同じ見本を `IC-73` で重ねると、灰色の破線の輪郭が現れる。起動文書（重ねが 0 件）で `IC-4` を押すと、ファイルを選ぶ画面が出る。

---

## 9. 仕様の外で直すもの（⛔ 本書は直さない）

| 所（`87d98a47`） | 毎フレーム | 何をする |
|---|---|---|
| `src/entity/layout-engine/schedule-geometry/schedule-geometry.ts:146`（`ScheduleGeometry`）・`:178`（`geometryFromLayout`） | はい | S-1。日付から位置は `src/entity/layout-engine/schedule-layout/time-axis.ts:71` の `xFromDay` と、予定バーと同じ終わりの扱い |
| `src/adapter/svg-renderer/schedule-task-figures.ts:299`（`taskFigureParts`、`planParts` の組み方 `:330` 〜 `:381`） | はい | S-2。輪郭の部分を `baselineParts` ／ `baselinePartsPinned` として返す（関数を分けるかは実装する者が検査 60 の大きさで決める） |
| `src/adapter/svg-renderer/svg-renderer.ts:437`（`svgFromSchedule`）の層の列 `:610` 〜 `:631` | はい | `zoLayer('ZO-15', …)` を `ZO-2` と `ZO-4` のあいだに |
| `src/adapter/input-command-translator/input-command-translator.ts:1027`（`ENTRY.baselineVisible` の枝）・`:1134`（`commandFromVisibleElementEntry`） | いいえ | S-4 |
| `src/adapter/file-gateway/file-store.ts:7`（`OpenRoute`）・`src/use-case/advance-screen-session/file-flow-values.ts:11`（`FileFlowOpenRoute`）・`:218`（`isReopenRoute` の隣に `isBaselineRoute`）・`:298` 付近（`documentFileRead` の答え） | いいえ | S-5 |
| `src/framework/single-html-shell/document-file-flow.ts:462`（`openDocumentIntoHold` —— `flow.askHowToOpen(current, …)` に `'baseline'` を先に渡す） | いいえ | S-5 |
| `src/use-case/import-document/import-document.ts:319` 〜 `:355`（`baselinedDocument`） | いいえ | S-6 |
| `src/adapter/screen-renderer/app-header-items.ts:86` | いいえ | 変えない（決定 10） |
| `tools/generate_entity_types.py` | — | 4.3 節（仕様の波 1 が当てる） |

**試験**（いま引いているもの。仕様だけを読む試験の体が書き直す）:

| 試験 | いま主張していること | 本書の後 |
|---|---|---|
| `tests/contract/cr-430-t-020-the-order-things-are-drawn.test.ts` | 表 T-020 の行の数と順 | ⛔ 赤（`CR-558` ・ `CR-556` の後の 15 行から 16 行へ） |
| `tests/contract/t-020-zo-layer-membership.test.ts` | 表のどの行も描かれた層である | 場面に重ねを持つ文書を足さないと `ZO-15` が描かれず赤 |
| `tests/contract/cr-441-t-274-principles-and-rows-both-ways.contract.test.ts` | 表 T-274 と表 T-020 の行が両向きに覆い合う | E-03 と E-14 を同じ波で当てれば緑 |
| `tests/unit/uf-48-write-moment.test.ts:993` ・ `:1045` | `IC-4` が `S-69` を書く入口であること、行が `S-69` を名乗ること | 行は `S-69` を名乗ったまま（E-18）。押して `S-69` が変わる場面は、重ねを持つ文書でなければ赤になりうる —— 走らせて測る |
| `tests/usecase/uc-006-find-delays.test.ts:30` ・ `:84` 〜 `:92` | 手順 5 の `specMismatch`（「IC-4 draws nothing」）と、`IC-73` の後に `IC-4` を押す分岐 | `specMismatch` の手順 5 の半分が外れる（`DFC-1014`）。`IC-73` の後は `S-69` が真なので `IC-4` を押さない |
| `tests/contract/state-machine-file-flow.contract.test.ts` | `fileOperationStateMachine` の遷移 | `documentFileRead` の枝が 3 つになる —— 原稿を読む試験なら追随、写しなら赤 |
| `tests/contract/display-words.contract.test.ts` | 辞書の項 | `IC-4` の説明の語（J-04） |
| 新しく要るもの | — | `BL-1` の 3 つの条件（畳んだ行・`null` の日付・`S-69` 偽では描かない、`S-227` 偽でも描く）、`BL-2`（矩形の横が予定バーの換算と一致、菱形の対角線、ピン止めの帯）、`BL-3`（塗り無し、色 `S-148` の値、刻み 4 2）、`BL-4`（重ねの有無で他の形の置き場が変わらない）、`ZO-15`（`ZO-2` の後・`ZO-4` の前）、`OP-15`（0 件で押すとファイルを選ぶ面、`U-56` が出ない、閉じれば `S-69` 不変、読めば `S-69` 真で輪郭が出る、一致 0 件の後も同じ）、`FR-015` の新しい MUST（`IC-73` の後 `S-69` が真）。⚠️ 描く絵の試験は Playwright の見本で（記録 `browser-pane-no-raf`） |

---

## 10. ⛔ この変更でやらないこと

- **`S-64`（イナズマ線、`IC-39`）ほか、中身が無いときに押しても何も描かれない切り替え**（0.2 節の 7）—— `JDG-722` は `IC-4` だけを裁いた。広げるなら別の問いである。
- **`DFC-784`**（重ねが未保存の編集に数えられるか）—— 決めない。⚠️ ただし決定 5 で `S-69`（文書に保存する値）を読み込みで書くので、重ねの着地は文書の値を 1 つ変える。`DFC-784` の案 ①（未保存にしない）を採る日が来たら、その読みと合わせて見直すこと。
- **重ねを外す入口**（重ねた予定を文書から消す）—— `UN-18` の RATIONALE どおり、取り消しだけのまま。
- **変更前の予定の差分の読み上げ・数値（ずれの日数）** —— `FR-047` の遅れの日数（`DFC-1013`）とは別の話であり、本書は輪郭だけ。
- **`IC-4` の押された見た目**（決定 10）。
- **表 T-337（`CR-575`）に行を足すこと**（決定 1）。
- `docs/development-records/` の `defects.md` ・ `rulings.md` ・ `changelog.md`、`A-appendix.md` の変更履歴（当てる者が書く）。

---

## 11. 前に立つ者へ返す問い

| # | 問い | 案と比べ | 推奨と理由 |
|---|---|---|---|
| 1 | **変更前の予定の輪郭の破線の刻み（`S-444`）を 4 × 2px で試してよいか**。場面: 見本を開いて 1 タスクを動かし、変更前の予定を重ねたとき、動かしたタスクの予定バーの上と横に、灰色の破線の枠が出る | **A 4 × 2px で出して、実物を見てから直す**（本書の形。🔎 の試す値。予実の補助線 2, 2・選択の枠 2 × 1・再開への破線 3, 2 のどれとも違う）。 **B 当てる前に、刻みと色を並べた触れる見本（1 枚の HTML）を作って選ぶ**（`16-grab-area-sizing` と同じ形。刻み 3 × 2 ・ 4 × 2 ・ 6 × 3 と、色 `S-148` ・ `S-149` を明るいテーマと暗いテーマで並べる） | **A**。刻みと色は 1 行ずつの値なので、実物で見て 1 行を書き換えれば済む（1 節の最右列）。仕様の形（形・前後・入口）は値に依らない。代償: 最初の絵が見にくければ 1 回直す手間がかかる |

⭐ ほかに問いは無い。前後・形・読み込んだら出す・「重ねる予定が無い」の読みは、0 節 ③ に根拠と代償を添えて問わずに決めた。

---

## 12. 台帳

| ID | 何か | 状態 |
|---|---|---|
| `DFC-1014` | `IC-73` で重ねを読み込んでも輪郭が 1 つも描かれない（`FR-015`） | 本書を当て、波 2 のコードが着地して閉じる |
| `DFC-1142` | 利用者の指摘と、重ねる予定が無いときの `IC-4`（修正案 ①・②） | 同上 |
| `JDG-722` | 0.1 節 | `rulings.md` の状態は「指示」。⭐ 当てる者は「指示 —— `CR-588` が当てる」へ（記録 `ruling-state-for-drafted-cr`） |
| 新しい行 | 無い | 本書は台帳の行を起こさない。11 節の問い 1 の答えを受けたら、前に立つ者が `JDG-` を振る |

---

## 13. 測り方の再現

```
# the tree: cr-organise 87d98a47 (HEAD). The working tree was moving (W1 edits in progress),
# so every count below reads a copy taken with git archive, never the working tree.
git merge-base --is-ancestor 87d98a47 HEAD                       # exit 0
git archive 87d98a47 docs/spec change-request tools/generate_entity_types.py | tar -x -C <scratch>/588-head

# the post-apply copy of 01-04-requirements.md (the tree CR-588 lands on, for table T-020 and PP-7):
#   CR-558 E-02, E-14 as written; CR-556 E-04 re-based onto CR-558 (ZO-13 between ZO-4 and ZO-8,
#   ZO-8..ZO-6 shifted by one), E-05 as written, E-06 re-based (ZO-13 appended after ZO-14 = copy A,
#   before it = copy B); CR-559 E-06 as written; CR-575 section 4.2 (one sentence after the ZO-6 note line)
python <scratch>/588-compose.py <scratch>/588-head <scratch>/588-tree-head A
python <scratch>/588-compose.py <scratch>/588-head <scratch>/588-tree-head B
#   -> table T-020: ZO-7 1, ZO-14 2, ZO-1 3, ZO-1a 4, ZO-2 5, ZO-4 6, ZO-13 7, ZO-8 8, ZO-3 9,
#      ZO-5 10, ZO-9 11, ZO-10 12, ZO-11 13, ZO-12 14, ZO-6 15

# every old block of section 4, applied in order to copies, each counted before it is applied:
python <scratch>/588-verify.py <repo> <scratch>
#   (result lines are copied below, section 13.1)

# graph (the index scratch/spec-check/sd-out/json/index.json, written 2026-09-26 18:16)
python .claude/skills/spec-graph-check/impact.py FR-015 UC-006 IC-4 IC-73 S-69 OP-9 OP-3 OP-13 OP-2 T-024a FR-087 T-020 FR-110 PP-7 T-274 FR-108 FR-049 UN-18 S-39 S-148 S-104 S-175
python .claude/skills/spec-graph-check/induced.py FR-015 T-020 FR-110 PP-7 T-274 IC-4 IC-73 S-69 OP-9 OP-3 OP-13 OP-2 T-024a FR-087 UC-006 FR-108 FR-049 UN-18 S-39 S-148 S-104 S-175 FR-098 RT-4a
#   -> 24 of 24, 30 edges, 1 cycle (size 6): FR-015 FR-049 FR-087 OP-3 OP-9 UC-006

# code facts of section 0.2 and 9 (87d98a47)
git grep -n -i "baseline" 87d98a47 -- src/entity/layout-engine src/adapter/svg-renderer  # 3 lines, all text placement
git grep -n "zoLayer('ZO-" 87d98a47 -- src/adapter/svg-renderer/svg-renderer.ts          # :610..:631
git grep -n "askHowToOpen" 87d98a47 -- src/framework/single-html-shell/document-file-flow.ts

# free provisional names (87d98a47 and the working tree, change-request/ included)
grep -rln "908[0-9][0-9]" change-request docs                                          # nothing
git grep -nE "\bBL-[0-9]|isBaselineRoute|NOT_STORED_BASELINE" 87d98a47                    # nothing

# rulings reached: grep 87d98a47:docs/development-records/rulings.md for
#   FR-015 / IC-4 / IC-73 / OP-9 / S-69 / 変更前の予定 / baseline / ZO- / 表 T-020 / OP-13
#   -> JDG-203, JDG-365, JDG-722 (and baseline-file rulings that are about check baselines, not this)
```

### 13.1 当てる道具の結果

```
edits parsed: 26 E-01 E-02 E-03 E-04 E-05 E-06 E-07 E-08 E-09 E-10 E-11 E-12 E-13 E-14 E-14b E-15 E-16 E-17 E-18 J-01 J-02 J-03 J-04 J-05 J-06 J-07
  post-575 copy A E-14: applied E-14
post-575 copy A: problems 0, applied 25 of 25
  post-575 copy B E-14: applied E-14b
post-575 copy B: problems 0, applied 25 of 25
working tree (JSON + glossary): problems 0, applied 8 of 8
on 87d98a47 itself (before CR-558/556/559/575): E-01=1, E-02=1, E-03=0, E-04=0, E-05=0, E-06=0, E-07=0, E-08=0, E-09=0, E-10=0, E-11=0, E-12=0, E-13=0, E-14=0, E-14b=0, E-15=1, E-16=1, E-17=1
json ok: docs/spec/_source/display-words.json
json ok: docs/spec/_source/row-id-prefixes.json
json ok: docs/spec/_source/settings.json
json ok: docs/spec/_source/state-machines.json
settings ids: duplicates 0 ; S-443 in ['T-236'] ; S-444 in ['T-206']
prefixes: BL between BF and BO ; duplicates 0
state machines json ok
md-checks before A exit 1: NOTE  row IDs in an unnumbered table (check 8 cannot guard these): | check 5  : 2 | check 7  : 2 | tables=189  figures=28  rows=2366  uids=164
md-checks after A exit 1: NOTE  row IDs in an unnumbered table (check 8 cannot guard these): | check 5  : 2 | check 7  : 4 | check 8  : 2 | tables=190  figures=28  rows=2372  uids=164
```

### 13.2 見えなかったもの（依頼文の 6）

- `CR-584` ・ `CR-585` ・ `CR-586` ・ `CR-587` ・ `CR-589` は同じ時に起草中で、`87d98a47` に無い。起草の終わりに作業木に在った `CR-585`（白黒）は読んでいない —— その旧が本書の塊（表 T-236 の `S-163` の項の頭、`S-148`）に触れるかは測っていない。
- 調整役が `CR-556` の E-04 ・ E-06 を `CR-558` の上でどう書き直すかは、写し A ・ B の 2 通りで仮に作った。第 3 の形（例: `PP-7` の名を番号順に並べ直す）なら E-14 の旧は 0 回になる —— 当てる者が数え直すこと。
- `CR-575` の 4.2 節の 1 文の行末（改行の印の有無）は、同書が書いていないので「有り」で作った。本書の塊はその行を含まない。
- 輪郭の色 `S-148` と予定バーの塗り（`S-155`）の比、`S-227` を偽にしたときの予定の縦の範囲、1000 タスクの文書で重ねを出したときのフレーム時間は、測っていない。
- 生成物（`npm run gen` の出力）と試験は走らせていない（依頼文の 7）。
