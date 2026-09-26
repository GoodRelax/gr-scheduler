# CR-579 — 入力の翻訳係は、写しを持ち主へ返し、1 つの兄弟だけが使う規則をその兄弟へ渡す

> 起草の状態: 起草した（2026-09-26）。  
> ⛔ 仕様・コード・試験・生成器・基準線はまだ 1 文字も変えていない。
> ⭐ **2026-09-26、利用者が 10 節の 2 つの問いに答えた（`JDG-690`・`JDG-691`、どちらも推奨の A）。**  
>  割り方の向き（入口の本体を残し、写しを返し、1 つの兄弟だけが使うものを渡す）は決まった。
> ⛔ **ただし 4 節の表は、`src/` 全体の関数の重複の調査の群を統合するまで確定ではない**（調整役の指示、2026-09-26）。
> その調査の群のうちこのファイルか `calendar-day.ts` に落ちるものは、本書を当てる手番が本書に統合する（2 つの写しのまま動かさない）。  
> 統合で `JDG-690` の向きが変わるなら、当てる手番が利用者に問い直す。
> 読んだ木: `d65097b9`（ブランチ `refactor` の先端）。  
> ⛔ 当てる前に、その時点の `refactor` の先端で、本書の数と `file:line` をすべて関数名で引き直すこと。
> ID の帯: 調整役から `CR-579`・`JDG-690` 〜 `JDG-694`・`DFC-1040` 〜 `DFC-1045` を受けた。  
> 表 T-075 の新しい行 ID は仮（仮 `UF-183`）で、調整役が当てる直前に max＋1 へ詰める（2 節）。
> 当てる順（調整役の決定）: `CR-573` → `CR-572` → `CR-578`（`frame-loop.ts` の分割）→ **本書** → `CR-574`・`CR-575`・`CR-577` → `CR-555` 〜 `CR-563` → `CR-571` → `CR-576`。
> 分割が先に入り、後の変更要求は分割した後の木で自分の `file:line` を測り直す（`CR-554` の 8.1 と同じ扱い）。
> **型**: `CR-432` の 4.1（S1〜S5 と共変の数え方）、`CR-438`（このファイルを割った前例）、`CR-554`（とくに 2.2・13 節の測り方と 15.6.7 の生成の定数の置き場）。

---

## 0. ⛔ 立ちどまって答える 3 つ

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

⚠️ **直に前へ進めるものは無い。  
利用者が画面で気づく変化は 0 である**（`CR-432`・`CR-438`・`CR-554` の 0 節 ① と同じ答え）。  
表 T-054 の `CH-1` 〜 `CH-6` のどれにも、`GL-001` 〜 `GL-008` のどれにも直には結ばない。  
`CH-3`（ぬるサク）の速さは動かさない —— 移すのは純粋な関数と表だけで、フレームごとの仕事の量は変わらない。  
間接の結びは利用者の目的（`CR-432` の 4.1 に逐語）「目的はとにかく変更に強くすること。」である。  
本書は、次の 2 つの形で変更に強くする。

- **写しを持ち主へ返す**（1 つの規則を 2 か所で持たない）。
  いまは、日の番号の算術・行の木の順位・図形の名の一覧・構えの対応の 4 つを、翻訳係が持ち主と別に持っている。
  片方だけ直ると、もう片方が黙って古いまま残る（`taskGroupRankById` の上の `TRAP` が「両方を一緒に変えよ」と書いているのがその印である）。
- **1 つの兄弟だけが使う規則を、その兄弟へ渡す**（`UD-5`「この欠陥はどのファイルか」に 1 つのファイルで答える）。

### ② レビュー観点のどの条項を当て、何が出たか

- 規則 03 の「仕様が持つ値は写さずに生成する」（`docs/development-rules/03-implementation.md:22`「⛔ 仕様が持つ「値」は、写さずに生成する。打ち直した値は、仕様が変わっても黙って古いままになる。」）—— ⛔ **このファイルで 4 か所違反している**（1.3）。
- `R1.3`（唯一の正）—— `taskGroupRankById` は `schedule-invariants.ts:132-154` と本体が 1 字も違わない写しである（1.3）。
- 表 T-276 の `UD-1`・`UD-5` —— 1 つの兄弟だけが読む補助が入口にある（1.4）。
- `03-implementation.md:137`・`:148`（生成の定数は使うユニットに刷る）—— 入口に刷られた 5 群のうち 4 群は、入口が 1 度も読まない（1.5）。
- `R2.3`（OCP、SHOULD）—— `commandFromEntry` は 156 行・分岐 70 で `HELD` である。  
文脈を読まずに決まった答えを返す 11 の腕は、1 行ずつの表にできる（4 節の W7）。
- `R2.1`（命名）・`03-implementation.md:199`・`:205` —— 利用者の例の名 `input-command-types.ts`・`date-geometry-utils.ts` は「どう作ったか」と `util` を言う名であり、通らない（3 節）。  
公開する名 `serial` も単位を言わない（2 節）。
- `R2.2a`・`R2.2b` —— 4 節のすべてのユニットの責務文に当てた。

### ③ 利用者に問わずに決めたこと（根拠を添えた。あとから覆せる）

1. **入口の本体（答えの語彙 V・入口の台帳 E・押しの振り分け P）は割らない。**
   共変が 3 つとも拒んだ（1.2 の表）。  
   `CR-438` と `CR-554` の判定を、分割後のコミットを足して測り直しても変わらない。
2. **利用者の例 2・3 の名と形は採らない**（3 節）。  
代わりに、写しを持ち主へ返す（W2・W3）。
3. **`compareDay` は `compareDays` ではなく `calendarDaysBetween` の符号へ置き換える。**
   `compareDays` に替えると、西暦 0〜99 年で符号が逆になる（反証の体が測った。  
   1.3 の注）。  
   `calendarDaysBetween(b, a)` はすべての入力でバイト一致する。
4. **Schedule の 2 つの関数は、公開する時に名を改める** —— `serial` → `dayNumberOf`、`dayFromSerial` → `dayFromNumber`。
   `R2.1`「単位が固定の量は名前に単位を入れる」と、仕様の語「日の番号」（表 T-075 の `UF-170` の責務文）による。  
   改めるのは `Schedule` の 3 ファイル・14 か所である（2 節）。
5. **`taskGroupRankById` は `Schedule` の新しいユニット `task-group-rank.ts`（仮 `UF-183`）へ移す。**
   `schedule-invariants.ts`（`UF-131`「文書の不変条件を表 T-220 の行ごとに判じ、違反の箇所を返す」）から公開すると、責務文の外の歩きを公開することになる（`R2.2a`）。
   一方の読み手は不変条件（`IV-19`）で、もう一方は翻訳係の落とし先の並びである。  
   片方だけが並びを変えたくなる出来事を挙げられる（`UD-1`）。
6. **`NOT_STORED_ROW_GRAB_SIZES` は動かさない。**
   入口の `hasDraggedPastThreshold` が `S-208` を読み、試験 2 本が入口から取り込む。  
   2 つめの写しを `row-grab.ts` に刷る前例は、1 つのコンポーネントの中には無い（反証の体、C7）。
7. **`NOT_STORED_ZOOM_STEP` は動かさない。**  
 読み手はどれも入口の外（`frame-loop.ts`・`view-place.ts`・試験 5 本）であり、`CR-578` の持ち場に掛かる ⇒ `DFC-1042` の候補（9 節）。
8. **行の軸の上限の 2 関数を `zoom-and-fit.ts` へ移し、それを字で読む試験 1 本の読む先を移す**（W5）。
   試験の意図は「上限を求める側は 2 つを問い、どちらの式も写してはならない」（`FR-016`）であり、入口のファイルそのものではない（反証の体、C8）。
   試験を直すのは移す体ではなく、仕様だけを読む試験の体である。
9. **`FIXED_ACTION_BY_ENTRY` の表は手で書く**（W7）。  
表 T-109 は、入口が返す操作の名の欄を持たない（1.3）。

---

## 1. 読んで確かめた事実（`d65097b9` で測った）

測り方はすべて 13 節にある。  
数は 3 つの体が測り、前に立つ者が突き合わせた。

### 1.1 大きさと中身

- ファイル: 1,381 行（手書き 1,338、生成 43。  
生成の区画は `:1339-1381`）。
- 中身を関数名で 10 群に分けた（重なり 0、漏れ 0、合計 1,381 を表明で確かめた）。

| 群 | 何か | 行 | 誕生を除いてコードを変えたコミット |
| --- | --- | --- | --- |
| I | 取り込みと出し直し（`:1-117`） | 117 | 28 |
| V | 答えの語彙 —— `PointerPress`・`InputContext`・`InputAction`・`TranslatedInput`・`acted`・`changed` ほか | 236 | 50 |
| M | 修飾キーとキーの名 —— `isCombo`・`KEY` ほか | 61 | 2 |
| D | 日の番号の算術 —— `serialOfDay`・`dayFromSerial`・`dayShifted`・`dayAtX`・`pointerDaySerial`・`dayShift`・`compareDay` | 54 | 4 |
| R | 行とスクロールの錨 —— `rowAtY`・`rowAnchorIn`・`dayAnchorAt`・`panTo`・`scrolledAnchor` ほか | 146 | 9 |
| P | 押しの振り分け（表 T-023a）—— `pressRowOf`・`commandFromPointer`・`pointerAssignment` ほか | 140 | 17 |
| E | 入口の台帳（表 T-109）—— `ENTRY`・`ARMED_BY_ENTRY`・`VISIBLE_ELEMENT_BY_ENTRY`・`commandFromEntry` ほか | 346 | 50 |
| A | 揃え（`FR-034`）—— `chosenDrawnTaskCount`・`alignWrites` | 45 | 2 |
| H | 兄弟が読む補助 —— `placementAt`・`taskGroupRankById`・`boxById`・`zoomYCeiling` ほか 19 | 192 | 59（うち 37 は分割のコミットの呑み込み。<br>1.2 の注） |
| G | 生成の区画 | 44 | 8 |

- 最大の関数: `commandFromEntry` 156 行・分岐 70（`function-size-baseline.txt:45` の `HELD`）、`pointerAssignment` 44/21（`:46`）、`alignWrites` 27/13。
- `commandFromEntry` の札は 57、腕は 34 と `default`。
  - 文脈を読まずに決まった操作を返す腕が 11（`openDocument`・`copyPicture`・`undo`・`redo`・`paletteMinimise`・`interactionRecord`・`fullScreen`・`milestoneList`・`documentSettingsProperties`・`agentApi`・`dialogueFieldVisible`）。
  - 兄弟の関数へまっすぐ渡す腕が 10（札 17 と `default`）。
  - 入口の中の関数へ渡す腕が 3（札 13）。
  - 腕の中に規則を持つ腕が 9（札 14）。

### 1.2 共変 —— `CR-554` の 2.2 の数え方で、全履歴を測った

閾値は 0.5 を超える、小さい側の下限は 5 件（`CR-432` の 4.1）。  
「R」は拒む、「s」は継ぎ目が立つ、「ne」は証拠なし。

| 組 | 数 | 読み |
| --- | --- | --- |
| E 〜 `shortcut-keys.ts` | 0.80（15 件中 12） | R（`CR-554` の 4.9 は 0.79） |
| E 〜 `frame-drags.ts` | 0.80（10 件中 8） | R（同 0.75） |
| E 〜 `row-tree-entrances.ts` | 0.76（17 件中 13） | R（同 0.67） |
| E 〜 P | 0.65（17 件中 11） | R（同 0.59） |
| V 〜 E | 0.60（50 件中 30） | R |
| V 〜 P | 0.76（17 件中 13） | R |
| V 〜 `armed-placement` ・ `frame-drags` ・ `row-tree-entrances` ・ `shortcut-keys` | 0.62 ・ 0.70 ・ 0.65 ・ 0.67 | R |
| R 〜 P ・ V 〜 R | 0.33 ・ 0.22 | s |
| D ・ M ・ A と、どの相手 | 下限未満 | ne |
| 行の軸の上限の 2 関数（`zoomYCeiling`・`rowsAtZoomY`・`TOP_ROW_DEPTH`）〜 `zoom-and-fit.ts` | 0.83（6 件中 5） | R ⇒ **同じユニットに置くべき**（W5） |
| `item-grab.ts` だけが読む補助の束 〜 `item-grab.ts` | 0.75（4 件中 3、変種 B） | ne |

⚠️ **分割のコミット `223a5a5b` の呑み込み**: `git log -L` は、分割で消えた大きな塊の隣の範囲（`boxById`・`rowDepthOfGroup`・`commandFromVisibleElementEntry`・`PlacedPlanActual`）に、兄弟へ移ったコードの分割前の履歴を付ける（`CR-432` の 4.1 が書いた癖）。  
H の 59 件のうち 37 件がこれである。  
そこで、名前で分割を跨いで追う変種 B も測った（13 節）。  
変種 B で判定が変わった組は、H 〜 兄弟だけである（`armed-placement` 1.00 → 0.31、`item-grab` 0.89 → 0.27、`row-tree-entrances` 0.76 → 0.24）。  
⇒ 本書は、判定には素の数を使い（`CR-554` の 2.3）、H の補助を兄弟へ移す理由には共変を使わない。  
S1（表の持ち主）と `UD-5` で決める（4 節の W6）。

### 1.3 写し —— 持ち主が別に持っているもの

| 翻訳係の写し | 持ち主 | 同じか | 何が要るか |
| --- | --- | --- | --- |
| `taskGroupRankById`（`:1257-1282`、`TRAP`「change both together」） | `schedule-invariants.ts:132-154`（公開していない） | 空白を正規化して 23 行が 1 字も違わない | `Schedule` が公開する（③ の 5） |
| `serialOfDay`（`:420`）・`dayFromSerial`（`:425`）・`MS_PER_DAY`（`:417`） | `calendar-day.ts` の `serial`（`:45`）・`dayFromSerial`（`:101`）。<br>`schedule.ts:40-46` は公開していない | `dayFromSerial` は本体が 1 字も違わない。<br>`serialOfDay` の `Math.floor` は値を変えない（`Date.UTC` が整数の日を返す。<br>約 2 万 5 千日で不一致 0） | `Schedule` が公開する（③ の 4） |
| `compareDay`（`:1293`） | `calendarDaysBetween`（`calendar-day.ts:51`、公開済み） | `compareDay(a, b)` ＝ `calendarDaysBetween(b, a)`（どちらも日の番号の差） | 呼び手 7 か所を置き換える |
| `dayShift`（`:1285`） | 差は `calendarDaysBetween(from, to)` | 同じ。<br>ただし `dayAtX` で引く段と「`null` なら 0」は残る | 引く段ごと `item-grab.ts` へ（W6） |
| `TASK_SHAPE_KINDS`・`TASK_MILESTONE_GLYPHS`（`:618`・`:633`） | 生成された `COLUMN_SHAPES.TaskVisual.shapeKind`・`milestoneGlyph` の選び（`schedule-entities.ts:425-426`、`schedule.ts:11` が出し直す） | 集合が等しい（5 個と 15 個） | 生成の側を読む。<br>`field-commit.ts:71` が既にそうしている |
| `ARMED_BY_ENTRY`（`:785-808`、`TRAP`「a misspelling here compiles and arms nothing」） | 表 T-109 の「構え」の欄 ＋ 表 T-012 ＋ `erd.json` ＋ `state-machines.json:895-960`。<br>`tools/generate_icon_roster.py` の `fill_arms_shape` が同じ結びを作り、`icon-roster.json` に `armsShape` として刷っている | 集合が等しい（22 行）。<br>並びだけが違う（T-109 は `IC-61` を `IC-35`・`IC-36` の前に置く）。<br>表は引くだけで外へ出ないので、振る舞いは同じ | 生成する（W4） |
| `FONT_SCALE_STEPS`（`:774`） | 表 T-215 の行の並び（`settings.json:6199`、`S-121`〜`S-123`） | 同じ並び（`S`・`M`・`L`） | 生成する（W4） |

⚠️ **生成しないもの**:
- `ENTRY`（`:665-731`）—— 表 T-109 は英名の欄を拒んでいる（`docs/spec/_assets/tbl-glossary.md:492`「本表は英名の欄を持たない —— 持つと 97 個の確定名を新たに作ることになる」）。
- `VISIBLE_ELEMENT_BY_ENTRY`・`GUIDE_CURSOR_MODE_BY_ENTRY`（`:735`・`:760`）—— 値は表 T-109 の「何の入口か」の文の中にしか無く、`IC-48` には設定の行 ID も無い。  
欄を足さないと生成できない ⇒ 10 節の問い `JDG-691`。
- `KEY`・`PressRow`・`ActualEndHold` —— `KEY` は DOM のキーの値の語彙で、仕様の表ではない。  
`PressRow` は既に検査 50（`check-press-row-ids.py`）が表 T-023a と突き合わせている。  
`ActualEndHold` を区切る欄は表 T-266 に無い。

### 1.4 読み手 —— `src` と `tests` の取り込みの文をすべて読んだ

| 入口の名 | 読み手（入口の中を除く） | 置き場 |
| --- | --- | --- |
| `boxById`・`drawnRowsOf`・`drawnRowsCrossed`・`ActualEndHold`・`dayShift`・`pointerDaySerial` | `item-grab.ts` だけ（試験 0） | W6 で `item-grab.ts` へ |
| `scrollAreaTopOf` | `wheel-input.ts:46` だけ | W6 で `wheel-input.ts` へ |
| `zoomYCeiling`・`rowsAtZoomY`（と `TOP_ROW_DEPTH`） | `zoom-and-fit.ts` だけ | W5 で `zoom-and-fit.ts` へ |
| `rowIndexAtTopEdge`・`rowGrabDepthOf`・`rowAtY`・`serialOfDay` | 兄弟 1 つ ＋ 入口の中の関数 | 入口に残る（S4） |
| `taskShapeKindOf` | `armed-placement.ts` だけ | 入口に残る —— 対の `milestoneGlyphOf`（読み手 2）と同じ形を保つ |

### 1.5 生成の区画 —— 刷られた 5 群を読む所

| 群 | 読む所 | 本書 |
| --- | --- | --- |
| `NOT_STORED_VISIBLE_DAY_FLOOR`（`S-229`） | `zoom-and-fit.ts:86` だけ | `zoom-and-fit.ts` に刷る（W3） |
| `NOT_STORED_ROW_BAND_CEILING_SEARCH`（`S-238`・`S-239`） | `zoom-and-fit.ts:229` だけ | `zoom-and-fit.ts` に刷る（W3） |
| `NOT_STORED_PROPERTIES_PANEL_FLOOR`（`S-248`） | `frame-drags.ts:136` だけ（`frame-loop.ts` は自分の写しを読む） | `frame-drags.ts` に刷る（W3） |
| `NOT_STORED_ROW_GRAB_SIZES`（`S-208`・`S-212`） | 入口 `:438`・`row-grab.ts:262`・`:316`・試験 2 本 | 動かさない（③ の 6） |
| `NOT_STORED_ZOOM_STEP`（`S-96`） | `frame-loop.ts`・`view-place.ts`・試験 5 本（フォルダの中は 0） | 動かさない（③ の 7） |

### 1.6 分割のあとで入口を開いた頻度（`CR-438` の 4.4 と `JDG-440` の「割ったあとで入口を開く頻度を測る」）

分割 `223a5a5b`（2026-09-21）から `d65097b9` までに入口を変えたコミットは 12 件、うちコードを変えたものは 8 件である。

| 群 | コードを変えたコミット |
| --- | --- |
| V（答えの語彙） | 7 —— どれも `InputContext`・`InputAction`・`PointerPress`・`InPlaceTarget` に欄か種類を足した。<br>6 件は兄弟も同時に変えた |
| I | 4 |
| E | 3 |
| H | 2 |
| P | 1 |
| M・D・R・A・G | 0 |

⇒ 入口を開かせる主な理由は、兄弟が共有する答えの型に 1 つ足すことである。  
型を別のファイルへ出しても、開くファイルは 1 つ増えるだけで減らない（V 〜 E 0.60、V 〜 P 0.76 で共に変わる）。

---

## 2. 新しい識別子（仮 —— 調整役がコミットの前に詰める）

| 仮の名 | 何か |
| --- | --- |
| 仮 `UF-183` | `src/entity/document-model/schedule/task-group-rank.ts`（表 T-075、`UF-131` の直後） |
| `dayNumberOf` | `calendar-day.ts` の `serial` の新しい名（③ の 4）。<br>呼び手: `calendar-day.ts:52`、`working-calendar.ts`（取り込み `:13` ＋ 10 か所）、`schedule-invariants.ts`（取り込み `:11` ＋ 2 か所）、W2 の後の翻訳係と `item-grab.ts` |
| `dayFromNumber` | `calendar-day.ts` の `dayFromSerial` の新しい名 |
| `FIXED_ACTION_BY_ENTRY` | W7 の表。<br>名は、入口の答えが文脈を読まないこと（中身）を言う。<br>形（「payload が無い」）では名付けない（`03-implementation.md:199`） |
| `JDG-690` 〜 `JDG-694` | 10 節の問い（使うのは答えを得た分だけ。<br>残りは調整役へ返す） |
| `DFC-1040` 〜 `DFC-1045` | 9 節の台帳の候補（⛔ 本書は台帳を書かない） |

表 T-064 の `PI-1` の欄に足す名: `dayNumberOf`・`dayFromNumber`・`taskGroupRankById`。  
新しい表・図・接頭辞・設定値・要求 ID は 0 である。

---

## 3. 利用者の例 3 つの判定

| 例 | 判定 | 理由（測った数と規則） |
| --- | --- | --- |
| ① 大きな `switch`（`commandFromEntry`）を表にする | **一部を採る**（W7） | 文脈を読まずに決まった答えを返す 11 の腕だけを、ファイルの既にある作法（`VISIBLE_ELEMENT_BY_ENTRY`・`GUIDE_CURSOR_MODE_BY_ENTRY`・`ARMED_BY_ENTRY`）と同じ形の 1 つの表 `FIXED_ACTION_BY_ENTRY` にする。<br>残る 23 の腕は規則か `TRAP` を持つ ⇒ `switch` のまま（関数を並べた表にすると、同じ長さのまま、腕の `TRAP` が腕から離れる）。<br>表を仕様から生成できるかも調べた —— `ENTRY` は表 T-109 が英名の欄を拒み（`tbl-glossary.md:492`）、生成できない。<br>`ARMED_BY_ENTRY` と `FONT_SCALE_STEPS` は、いまの原稿から生成できる ⇒ W4 で生成する |
| ② 定数と型を `input-command-types.ts` へ | **採らない** | (a) 型（V）は入口の台帳と共に変わる（V 〜 E 0.60、V 〜 P 0.76）—— 出すと、入口を開く変更のたびに 2 ファイルを開く。<br>(b) `S4`（`CR-432` の 4.1「どの要求の規則も持たないコード … は、元のファイルに残す」）と、表 T-063 の `UT-10`（`05-07-design.md:339`「兄弟が共有する語彙と補助、入口の振り分け … は公開エントリに置いた」）。<br>(c) 名が「何であるか」でなく種類を言う（`03-implementation.md:199`）。<br>(d) 型は `PI-18` が公開する面そのものである。<br>⭐ 定数のうち仕様の値の写しは、別のファイルへ移すのではなく、持ち主の生成物を読む（W2）か生成する（W4） |
| ③ 日付と座標の補助を `date-geometry-utils.ts` へ | **採らない。<br>代わりに持ち主へ返す**（W1・W2） | (a) `util` は名前ではない（`03-implementation.md:205`）。<br>(b) 日の番号の算術は `Schedule` の `calendar-day.ts` の写しである（1.3）⇒ 新しいファイルへ移すと写しが 1 つ動くだけで、持ち主と 2 つのままになる。<br>(c) 座標とスクロールの錨（R）は 3 つの兄弟と入口が共有する（S4）。<br>全履歴で 9 件しか変わっておらず、どの組でも拒まれない ⇒ 出す理由が無い（`R2.9`）。<br>(d) ⚠️ 日の番号の写しは翻訳係の外にもある（`svg-renderer/schedule-grid.ts:66-76`、`time-axis.ts:11`、`working-calendar.ts:71`）。<br>調整役の決定により、重複の調査がそれらの持ち主と、どの変更要求で統合するかを決める |

---

## 4. 最終の割り方の表（⛔ 重複の調査が報告するまで、利用者の了承を取らない）

### 4.1 ユニット

| 行 ID | ユニット | 責務文（R2.2a の畳みを添えた） | 本書で変わること |
| --- | --- | --- | --- |
| `UF-30`（残る。<br>公開エントリ） | `input-command-translator.ts` | 「`CP-18` の残り —— 入力の種類と押した所から、答える兄弟を選ぶ（表 T-023a・表 T-109）。兄弟が共有する語彙と補助 —— 出力の型、日と行の座標、スクロールの錨 —— を持つ」。<br>「入口ごとの答え」は (b)。<br>共有の語彙は継ぎ目の宣言なので (c)。<br>⚠️ 3 つめの文「行の軸の上限の字と帯を、写さずに `PI-5`・`PI-37` へ問う」は `UF-92` へ移る | 手書き 1,338 → およそ 1,160（見積もり: 各波が消す宣言の行の和。<br>当てる時に `wc -l` で測る）。<br>生成の区画は 3 群が出て 2 群が入る |
| `UF-92` | `zoom-and-fit.ts` | 「日程表の倍率を決めて書き込む —— 1 段のズームと、全体を収めること」に、`UF-30` から来る文「行の軸の上限の字と帯を、写さずに `PI-5`・`PI-37` へ問う」を足す（`FR-016` の MUST NOT。<br>(c)） | `zoomYCeiling`・`rowsAtZoomY`・`TOP_ROW_DEPTH` と 2 つの生成の群が入る |
| `UF-98` | `item-grab.ts` | 変えない（掴んだ所の表 T-266・T-023d と置く値の表 T-245・T-246・T-270 が、移る補助の `// see` の行をすべて含む） | `boxById`・`drawnRowsOf`・`drawnRowsCrossed`・`ActualEndHold`・`dayShift`・`pointerDaySerial` が入る |
| `UF-91` | `wheel-input.ts` | 変えない | `scrollAreaTopOf` が入る |
| `UF-94` | `frame-drags.ts` | 変えない | 生成の群 1 つが入る |
| `UF-99`・`UF-100` | `armed-placement.ts`・`field-commit.ts` | 変えない | 取り込み元が変わるだけ |
| `UF-170` | `calendar-day.ts` | 変えない（既に「日の番号で数える」と言う） | 2 つの名を改める |
| `UF-131` | `schedule-invariants.ts` | 変えない | `taskGroupRankById` を仮 `UF-183` から読む |
| 仮 `UF-183`（新） | `task-group-rank.ts` | 「行の群を、親子の木を兄弟の順に前から歩いた順位に写す」。<br>読み手（不変条件の `IV-19` と翻訳係の落とし先の並び）の列挙は (b) | `schedule-invariants.ts:129-154` から移る |
| `UF-1` | `schedule.ts` | 変えない（「表 T-064 の `PI-1` のとおりに公開する」） | 3 つの名を出し直す |

⭐ ファイルの数: `src/` の `.ts` は 1 つ増える（仮 `UF-183`）。  
表 T-074 の `SU-3`・`units.contract.test.ts:50-51`・`05-07-design.md:247` の数を、その波のコミットで 1 つ上げる。

### 4.2 波（1 波 1 コミット。どの波も照合器でバイト一致を確かめる —— 8 節）

| 波 | すること | 触るファイル | 種類 |
| --- | --- | --- | --- |
| W0 | 仕様: 表 T-064 の `PI-1` に 3 つの名。<br>表 T-075 に仮 `UF-183`、`UF-30` と `UF-92` の文（4.1）。<br>`SU-3` の数。<br>`03-implementation.md` の生成の定数の一覧に 2 行（`FONT_SCALE_STEPS`・`ARMED_BY_ENTRY`、検査 30 の 1 部）。<br>⛔ `npm run gen` と検査 18 は `src` が追いつく W1 まで赤なので、W0 と W1 は同じコミットにする（`CR-438` の 2 節と同じ扱い） | `docs/spec/05-07-design.md`・`docs/development-rules/03-implementation.md` | 仕様 |
| W1 | `Schedule`: `serial` → `dayNumberOf`、`dayFromSerial` → `dayFromNumber`（14 か所）。<br>`taskGroupRankById` を `task-group-rank.ts` へ移して公開する。<br>`schedule.ts` が 3 つを出し直す | `calendar-day.ts`・`working-calendar.ts`・`schedule-invariants.ts`・`task-group-rank.ts`（新）・`schedule.ts` | 名の変更と移動 |
| W2 | 翻訳係が写しを返す: `serialOfDay`・`dayFromSerial`・`MS_PER_DAY` を消し、`dayNumberOf`・`dayFromNumber` を読む（`dayShifted` は残す）。<br>`compareDay` を消し、7 か所を `calendarDaysBetween` の符号に置き換える（`compareDay(a, b) <= 0` → `calendarDaysBetween(b, a) <= 0`）。<br>`taskGroupRankById` を消し、2 つの兄弟は `Schedule` から読む。<br>`taskShapeKindOf`・`milestoneGlyphOf` は名と署名を保ち、本体が生成の選びを読む | 入口・`armed-placement.ts`・`item-grab.ts` | 写しを返す |
| W3 | 生成の 3 群を読み手に刷る（1.5）。<br>`tools/generate_entity_types.py` の `TARGETS`（`:2346-2352`）と `PUBLISHED_READ_BY_SRC`（`:2550-2556`）を書き換える。<br>刷られた写しは `export` しない（`JDG-139`） | 生成器・入口・`zoom-and-fit.ts`・`frame-drags.ts` | 生成の置き場 |
| W4 | `ARMED_BY_ENTRY` と `FONT_SCALE_STEPS` を入口の生成の区画に刷る。<br>⛔ 1 ファイルに生成の区画は 1 つだけ（`generate_entity_types.py:2725-2727`）⇒ `generate_entity_types.py` の新しい出力の関数が刷る。<br>`ARMED_BY_ENTRY` の結びは `generate_icon_roster.py` の `fill_arms_shape` を取り込んで使い、写さない（`icon-roster.json` を読む形は、`package.json:19` の順で `types` が `icons` より先に走るので採らない）。<br>入口の見出し（`:6-7`）と検査 21（`check-provenance.py:87`）に新しい原稿の名を足す。<br>`:784` の `TRAP` を消す | 生成器・入口・`check-provenance.py` | 生成 |
| W5 | 行の軸の上限の 2 関数と `TOP_ROW_DEPTH` を `zoom-and-fit.ts` へ移す。<br>同じ波で、仕様だけを読む試験の体が 2 本の試験の読む先を直す —— `cr-380-381-384-name-beside-the-shape-and-row-zoom.test.ts:1164-1174`（読むファイルを `zoom-and-fit.ts` へ）と `tests/system/user-reported-fixes.test.ts:1454-1456`・`:1504-1514`（入口だけでなくフォルダ全体に `layoutFromSchedule` が無いこと）。<br>⚠️ `CR-573` がこの 2 本を消すか移していたら、`FR-016` の MUST NOT を守る試験がどこに残ったかを確かめ、そこを直す | 入口・`zoom-and-fit.ts`・試験 2 本 | 移動 |
| W6 | `item-grab.ts` だけが読む補助 6 つを `item-grab.ts` へ、`scrollAreaTopOf` を `wheel-input.ts` へ移す。<br>`pointerDaySerial` が読む `unitFraction` は入口に残し、`export` を付ける（錨の 2 関数も読む共有の補助 —— S4） | 入口・`item-grab.ts`・`wheel-input.ts` | 移動 |
| W7 | `commandFromEntry` の 11 の腕を `FIXED_ACTION_BY_ENTRY` の 1 表にする。<br>表を引く段は `const entry = on.entry`（`:1003`）の直後、`switch` の前に置く（仕切り・スクロールバー・行の掴み・`entry === null` の段より後）。<br>呼ぶたびに新しい答えの値を作る（`acted({ kind })`）。<br>表に無い入口は今までどおり `switch` と `default`（`commandFromArmingEntry`）へ届く | 入口 | 形の変更 |

⭐ 公開エントリの約束（`CR-554` の 6.3 の MUST 1 を、本書では次のとおり狭める）: フォルダの外と試験が入口から読む名は、名と署名を保つ。  
W2・W5・W6 が入口から消す名（`serialOfDay`・`dayFromSerial`・`compareDay`・`dayShift`・`taskGroupRankById`・`zoomYCeiling`・`rowsAtZoomY`・`boxById`・`drawnRowsOf`・`drawnRowsCrossed`・`ActualEndHold`・`scrollAreaTopOf`・`pointerDaySerial`）は、どれもフォルダの外と試験から読まれていない（反証の体、C12）。  
⇒ ⛔ 6.3 の MUST 1 を依頼文に逐語で写さないこと。

### 4.3 残るもの —— 割らない理由

| 残るもの | 行（およそ） | 理由 |
| --- | --- | --- |
| 答えの語彙 V | 236 | V 〜 E 0.60・V 〜 P 0.76 で拒む。<br>`S4`・`UT-10` |
| 入口の台帳 E（W7 の後） | およそ 300 | E 〜 打鍵 0.80・〜 枠の引き 0.80・〜 行の入口 0.76・〜 P 0.65 で拒む |
| 押しの振り分け P | 140 | E 〜 P 0.65 で拒む。<br>`PressRow` は検査 50 が入口のファイルで読む（`check-press-row-ids.py:52-54`） |
| 座標とスクロールの錨 R・日の番号の残り D | およそ 180 | 3 つの兄弟と入口が共有する（S4）。<br>どの組でも拒まれない ⇒ 出す理由が無い（`R2.9`） |
| 揃え A（`FR-034`） | 45 | 全履歴で 2 件（下限未満）。<br>E 〜 A は 2 件中 2。<br>小さい兄弟を作る理由が無い（`R2.9`） |
| 兄弟 2 つ以上が読む補助（`placementAt`・`escapeContextOf`・`rowDepthOfGroup` ほか） | およそ 110 | S4 |

⚠️ 入口は本書の後も、フォルダでいちばん大きいファイルのままである（およそ 1,190 行。  
うち生成およそ 50）。  
それでも割らないのは、測った共変が、残る 4 つの塊を 1 つに保つよう求めるからである（`JDG-54`: 大きさの上限は段 8 の実測まで置かない）。  
⇒ **もう一度調べる合図**: V を変えないコミットで E と P が別々に開かれることが 5 件に届いたとき、または R が E・P と別に 5 件変わったとき。

---

## 5. 衝突 —— 同じ所を触る、着地を待つ変更要求

本書は `CR-578` の直後、下の変更要求より先に当てる（調整役の決定）。  
下の変更要求は、本書の後の木で自分の `file:line` を測り直す。

| 変更要求 | 触る所 | 本書のあとの置き場 |
| --- | --- | --- |
| `CR-577` | `zoom-and-fit.ts`（行の軸の拡大）。<br>`:6`「`zoom-and-fit.ts` を触るほかの CR と同じ波に入れない」 | 本書の W3・W5 の後で測り直す。<br>⚠️ W3・W5 は `zoom-and-fit.ts` に生成の区画と 3 つの宣言を足し、行をずらす |
| `CR-558`（`:641`・`:779`） | `item-grab.ts` の `highlightBoxRangeWrite`（`:393-474`） | 同じ関数。<br>W6 が上に補助を足すので行がずれる |
| `CR-559`（`:34`・`:600`・`:684`） | `item-grab.ts:108-118`・`:477`・`boxById` の呼び所 | `boxById` は W6 で `item-grab.ts` の中へ移る |
| `CR-576`（`:46`・`:204`） | `item-grab.ts:136-155`（`GA-7`・`GA-8`、`serialOfDay`・`pointerDaySerial`） | `pointerDaySerial` は W6 で `item-grab.ts` へ、`serialOfDay` は W2 で `dayNumberOf` になる |
| `CR-560`（`:135` ほか） | 入口の `pressRowOf`（`:604-617`）・`bodyMoveWrites` | `pressRowOf` は入口に残る |
| `CR-571`（`:373`・`:431`） | `wheel-input.ts` | W6 が `scrollAreaTopOf` を足す |
| `CR-562`（`:943`） | `ENTRY` の `aiExportModal`（`IC-19` → `IC-115`） | `ENTRY` は入口に残る |
| `CR-561`（`:591`） | `ENTRY` に `IC-107`・`IC-108` | 決まった答えを返す入口なら、W7 の表に 1 行ずつ足す |
| `CR-574`（`:47`・`:197`） | `escapeContextOf`（`:1326`） | 入口に残る |
| `CR-555`・`CR-556`・`CR-558`・`CR-559`・`CR-572`・`CR-576` | `tools/generate_entity_types.py` | 本書の W3・W4 も同じ生成器を書く ⇒ 併合は前に立つ者が 1 本ずつ |
| `CR-573` | `tests/unit` を消し、並べ替える（`cr-380`・`fr-001`・`t-023d` を含む） | W5 の試験の直しと、③ の 6 の「試験 2 本が入口から取り込む」は、当てる時に測り直す |
| `CR-578`（`frame-loop.ts` の分割、起草中） | `src/framework/single-html-shell/` が入口から読む 12 の名 | 本書は入口のその 12 の名をどれも動かさない。<br>`CR-578` は翻訳係の補助を `frame-loop` の兄弟へ写さない（調整役に伝えた） |

---

## 6. 各波が書き換える検査と基準線

| 検査・基準線 | 書き換え |
| --- | --- |
| 18（`generate_unit_tree.py --check`）と表 T-075 | 仮 `UF-183` の 1 行。<br>W0 と W1 を同じコミットにする |
| `SU-3`（`05-07-design.md:247`）・`units.contract.test.ts:50-51`・`audit-ch5.py`（検査 33）の数 | 160 → 161（W1） |
| 26b（`check-published-members.py`） | `PI-1` の 3 つの名（W0）。<br>`Schedule` の外から読むので、表 T-064 が名を持たないと赤 |
| 30（`check-generated-constants.py`）と生成器の名簿 | W3: 3 つの名を `PUBLISHED_READ_BY_SRC` の入口の鍵から外す（刷った先では `export` しない）。<br>W4: `03-implementation.md` の一覧に 2 行（W0 で書く） |
| 21（`check-provenance.py`） | W4: 入口の見出しと `:87` に原稿（`tbl-glossary.md`・`01-04-requirements.md` の表 T-012・`erd.json`・`state-machines.json`）の名 |
| 55（コメント密度） | ⛔ `zoom-and-fit.ts` と `frame-drags.ts` は上限ちょうどである（`zoom-and-fit.ts` はコード 431 行・コメント 47 行・上限 47、`frame-drags.ts` は 124 行・13 行・上限 13）。<br>W3・W5 が生成の区画の印（コメントの行）と `// see` を運び込む ⇒ その波で検査 55 を回し、赤なら `comment-rules-src.md` の 5 節の手当て（`TRAP` を消してコードで守るか、台帳へ起こす）をして、消した文を報告する |
| 60（`function-size-baseline.txt`） | W7: `commandFromEntry` の行（`:45`、156/70）を実測へ下げる。<br>`excess-lines` も下がる。<br>下げるのは調整役（`JDG-520`）で、上げる行は 0 の見込み |
| 45（同じ式の繰り返し） | 下がれば OK と「基準線を下げよ」を刷る（`check-repeated-expressions.py:570-573`）。<br>各波で回す |
| 50（`check-press-row-ids.py`） | 変わらない（`PressRow` は入口に残る） |
| 19・59・61 | 変わらない。<br>新しいファイルはどれも既にあるフォルダに置き、`components.json` に新しい辺は要らない（`InputCommandTranslator` → `Schedule` の辺は既にある）。<br>検査 61 は書き換えない `const` の表を咎めない |
| 62（識別子の予約） | 当てる直前に、仮 `UF-183` と `JDG`・`DFC` の帯がまだ使われていないことを調整役が測り直す |

---

## 7. 依頼文に逐語で書くこと（どの波の体にも共通）

**MUST**
1. 振る舞いを変えないこと。  
照合器（8 節）が一致しなければ止まって報告すること。  
黙って範囲を変えない。
2. 移すものは関数名で引き直すこと（行番号は最初の編集で動く）。
3. 移したファイルの頭の見出し（`@unit`・`@component`・`@purity`）は変えない。  
新しいファイル（仮 `UF-183`）は `CR-554` の 6.3 の MUST 2 の形で始める。
4. 兄弟はモジュールの頂上で入口の名を読まないこと（評価の順。  
いまは 0 件 —— 13 節の手 5）。
5. 「各波のあとに検査 45・55・26b・30・21 を回し、終了コードと赤の集合を報告せよ。検査 55 でコメント密度の上限を超えたら comment-rules-src.md の 5 節どおり TRAP を消し、消した文を報告せよ。」
6. 「『前例がある』と言う前に、その前例が crossing-names-baseline.txt（借り）に載っていないかを grep せよ。」

**MUST NOT**
1. フォルダの外のファイルの取り込みの文を書き換えないこと。  
例外は W1（`Schedule` の中）と、W2 が `armed-placement.ts`・`item-grab.ts` に足す `Schedule` からの取り込みだけである。
2. 試験を書き換えないこと。  
W5 の 2 本は、移す体ではなく仕様だけを読む試験の体が直す。
3. `git stash`・作業木・`node_modules` の繋ぎを使わないこと。  
`commit` と `push` は前に立つ者が行う。  
基準線を書かないこと。

---

## 8. 確かめ方

### 8.1 照合器 —— 別の体が、当てる前の木から作る

`CR-439`・`CR-554` と同じ扱いである（`handoff.md:742-745` の ⑨、`CR-554` の 15.6.13）。

- **作る体**: 移す体と別の体。  
当てる直前の `refactor` の先端（`CR-578` の着地の後）から作り、スクラッチの置き場か `tests/` の新しいファイルだけに書く。
- **何を比べるか**: 公開エントリを動的に `import` し、多くの入力の出力の `sha256` を並べる台本（`npx vite-node`、根のパスを引数に取る）。  
入力の型は次のとおり。
  - `commandFromInput`・`selectionFromInput`・`screenEventFromInput`・`commandFromFieldCommit`・`rowBandCeilingOf` —— `PressRow` のすべて、表 T-109 の入口のすべて（97 行のうち入口に届くもの）、掴みの連鎖、±1 の境目、倍率の端。
  - W1・W2 のために、`Schedule` の `scheduleViolations` と稼働日の関数（`working-calendar.ts`）、日の番号の全域（西暦 0〜99 年・負の年・閏年の境）。
- **感度**: わざと壊した 10 件のうち何件を捕らえるかを測って報告させる。  
例: `compareDay` の置き換えの向きを逆にする、`FIXED_ACTION_BY_ENTRY` の 1 行を別の種類にする、`ARMED_BY_ENTRY` の 1 行の `glyph` を変える、`TOP_ROW_DEPTH` を 2 にする、`taskGroupRankById` の兄弟の並びを逆にする。
  ⚠️ 前例では、最初の照合器がわざと壊した 3 件のうち 2 件を逃した（`handoff.md:768-770` の ⑭）。
- **網羅**: `NODE_V8_COVERAGE` ＋ `v8-to-istanbul` で、入口・`zoom-and-fit.ts`・`item-grab.ts`・`calendar-day.ts`・`task-group-rank.ts` の分岐網羅をファイルごとに表にする（`c8` のコマンドは黙ってファイルを落とした）。
- **設計した違い**（照合器はこれを差として数えない）: 入口の公開名の一覧が 13 減り（4.2 の末）、`unitFraction` の 1 つが増える（W6）。  
`Schedule` の公開名が 3 増える。  
`ARMED_BY_ENTRY` の鍵の並び（表は外へ出ない）。
- **保つべき例外**: `CR-554` の 15.6.13 の F-1（`fitZoom` の `TypeError`、`DFC-969`）と F-2 は、本書の波でも同じく出ること。

### 8.2 各波のコミットで確かめること

- `node node_modules/typescript/bin/tsc --noEmit -p .`（作業木なら親の道具 —— メモ「Worktree runs parent tools」）。
- `vitest` が、試験を書き換えずに緑（W1 の `units.contract.test.ts` の数の 1 行と、W5 の 2 本を除く）。  
⛔ 版が `node_modules/vitest` と同じであることを確かめる（`npx` が 5.0.1 を走らせた前例）。
- `npm run gen:check`、`check.sh` の赤の集合が当てる前と同じであること（⛔ `FAIL` を `grep` しない。  
検査 11・12・33 は `FAIL` の行を刷らずに赤になる。  
終了コードと出力の全体の差で判ずる）。
- 照合器が一致すること（8.1）。
- 検査 59・60・61 の効果: 59 と 61 は変わらないこと、60 は W7 で `commandFromEntry` の行が下がるだけであること。
- e2e は出口で 1 度だけ走らせる（`GRS_PERF` を付けない）。

---

## 9. 台帳へ起こす候補（⛔ 本書は台帳を書かない。当てる手番か前に立つ者が書く）

| 候補 | 何が食い違うか | 測り方 |
| --- | --- | --- |
| `DFC-1040` | 西暦 0〜99 年の日を、`dayOf` はそのまま読み、`Date.UTC` を通る日の番号（`dateAtX` → `time-axis.ts` の `serialOf`）は 1900 年代として読む。<br>`compareDay`（番号の差）と `compareDays`（欄の比較）は 99-12-31 と 100-01-01 で符号が逆になる。<br>いまの文書では `importMinDate`（既定 1970-01-01、`schedule-invariants.ts:175`）が入口を塞ぐので届かない | 反証の体の `c1c2.js`（0〜400 年で符号の逆転 5 件）。<br>⚠️ `JDG-78`（異常系は後）の範囲 |
| `DFC-1041` | 表 T-109 は、表示の切り替えの入口が書き換える設定の行と `Guide Cursor` の型を文の中にしか持たない。<br>コードの `VISIBLE_ELEMENT_BY_ENTRY`（11 行）と `GUIDE_CURSOR_MODE_BY_ENTRY`（2 行）はそれを打ち直している（`03-implementation.md:22`）。<br>`IC-48` には設定の行 ID も無い | `tbl-glossary.md:513-571` を読む。<br>`JDG-691`（2026-09-26）により台帳に積む。<br>欄を足すのは `CR-561`・`CR-562` の着地の後 |
| `DFC-1042` | `NOT_STORED_ZOOM_STEP` は入口に刷られるが、読み手はフォルダの外（`frame-loop.ts`・`view-place.ts`）と試験 5 本だけである（`03-implementation.md:137`「使うユニットで分ける」） | `git grep NOT_STORED_ZOOM_STEP -- src tests` |
| `DFC-1043` | `tools/generate_icon_roster.py` の docstring の「AR-3 against eight」が古い（いまは 15 行が `AR-3` を構える） | 反証の体、C6 (b) |
| `DFC-1044` | `command-palette.ts:253-263` が、構えの種類から `AR-n` への逆の対応を手で持つ（`generate_icon_roster.py` の結びの写し）。<br>重複の調査へ渡す | 調整役へ伝えた（2026-09-26） |

`DFC-1045` は使わない（調整役へ返す）。

---

## 10. 利用者に問うた問い（2026-09-26 に答えを得た）

⭐ **答え（利用者、2026-09-26、選んだ選択肢の逐語）**:
- `JDG-690`: 「A 写しを返す (Recommended)」 ⇒ 本書のとおり。  
型のファイル（B）と、全部の腕を関数の表にすること（C）は採らない。
- `JDG-691`: 「A 今はしない (Recommended)」 ⇒ `VISIBLE_ELEMENT_BY_ENTRY`・`GUIDE_CURSOR_MODE_BY_ENTRY` は手書きのまま残し、`DFC-1041` を台帳に積む。  
表 T-109 に欄を足すのは `CR-561`・`CR-562` の着地の後の別の手番である。

⚠️ 問うた時の文は下の表のとおりである（場面は「遅延診断のボタン `IC-107` を足すとき、開くファイルはいくつか」と「ベースラインを表示の入口を誤って `planVisible` に結んでもコンパイルが通る」で示した）。  
裁定の行は `JDG` の帯を持つ調整役が `rulings.md` に書く。

| 仮の番号 | 問い | 推奨 | 理由 |
| --- | --- | --- | --- |
| `JDG-690` | 入口の本体（語彙・台帳・振り分け・錨）を残し、およそ 1,190 行のまま置くことを了承するか。<br>A: 本書のとおり（写しを返し、1 つの兄弟だけが使うものを渡す）<br>B: A に加えて、共変に逆らって型のファイルを出す<br>C: A に加えて、`commandFromEntry` の全部の腕を関数の表にする | **A** | B は変更のたびに開くファイルを 1 つ増やす（V 〜 E 0.60、V 〜 P 0.76）。<br>C は長さが同じまま、腕の `TRAP` を腕から離す。<br>A のあとでも B・C は選べる |
| `JDG-691` | 表 T-109 に「書き換える設定の行」の欄を足し、`VISIBLE_ELEMENT_BY_ENTRY`・`GUIDE_CURSOR_MODE_BY_ENTRY` も生成にするか。<br>A: いまはしない（`DFC-1041` に積む）<br>B: 本書に入れる | **A** | 97 行の表に 13 行だけ埋まる欄を足すことになる。<br>`CR-561`・`CR-562` が同じ表に行を足す最中であり、その後の方が 1 度で済む |

`JDG-692` 〜 `JDG-694` は使わず、調整役へ返した（2026-09-26）。

---

## 11. ⛔ この変更でやらないこと

| やらないこと | なぜ |
| --- | --- |
| 入口の台帳（表 T-109・表 T-023a）を兄弟へ出すこと | 共変が拒んだ（1.2） |
| 答えの型を別のファイルへ出すこと | 3 節の ② |
| `svg-renderer/schedule-grid.ts`・`time-axis.ts`・`working-calendar.ts:71` の日の番号の写しを統合すること | 調整役の決定 —— 重複の調査が持ち主と変更要求を決める |
| 西暦 0〜99 年の読みを揃えること | `DFC-1040`。<br>`JDG-78` の範囲 |
| `NOT_STORED_ZOOM_STEP` の置き場を変えること | `DFC-1042`。<br>`CR-578` の持ち場に掛かる |
| 振る舞いを変えること | 各波は照合器でバイト一致を確かめる。<br>直しを混ぜると、ずれの出所を切り分けられない |
| 基準線を上げること | 上げる行は 0 の見込み。<br>上がるなら止まって利用者に問う（`JDG-520`） |

---

## 12. 書くときの作法（⛔ 当てる体はここを読んでから書く）

- CJK の直後に `**` を開いて、その中を code span で始めない（docutils が壊れる）。
- 「表 X の N 行」と書かない。  
行 ID を名指す。
- `python tools/fix_line_breaks.py` を、触った仕様と記録のファイルすべてに掛ける。
- 検査は終了コードで判ずる。
- Windows の `python` は `PYTHONIOENCODING=utf-8`。  
スクリプトはファイルに書いて走らせる（heredoc は `\` を壊す）。
- `docs/spec/` を変えたら、`strictdoc export docs/spec` が根に残す `./output` を消してから `check.sh` を回す（検査 41）。

---

## 13. 測り方の再現

スクリプトはセッションのスクラッチの置き場にあり、木には無い（`CR-554` の 13 節と同じ扱い）。  
手順だけを書く。

1. **群と範囲** —— 宣言を名前で引く（前のコメントの行から閉じの行まで。  
宣言の間の空行は次の宣言へ）。  
10 群が 1,381 行をちょうど 1 度覆うことを表明で確かめた。
2. **共変** —— `CR-554` の 2.2・13 節の手 1 のとおり。
   - 範囲を 1 つずつ `git log --format=@@@%H -L <始>,<終>:<ファイル>` に掛けた（242 範囲、stderr 0）。
   - コメントだけの変更と誕生を除いた。
   - 兄弟の分割前の履歴は、兄弟のいまの関数を名前で分割の親 `f626ae16` の入口の範囲へ写し、その版で `-L` を掛けて足した。
   - **変種 B**（感度。  
   判定には使わない）: 入口の範囲を名前で分割を跨いで追い、分割のコミット `223a5a5b` は、その宣言のコードが変わったときだけ数えた。
3. **入口を開いた頻度** —— `223a5a5b..d65097b9` で入口を変えたコミットを読み、コードの行が落ちた群を数えた。
4. **関数の大きさ** —— `.claude/skills/spec-graph-check/function-size.mjs` に `{"files":[{"file":"<path>","text":"<本文>"}]}` を渡した（83 関数、誤り 0）。
5. **読み手と評価の順** —— `git ls-files src tests` の各ファイルの `import { … } from '…input-command-translator'` を読んだ（動的な取り込み 0）。  
兄弟の頂上の `const` の初期化式に入口の名が現れるかを読んだ（0）。
6. **写しの同一** —— 2 つの本体を `export` を除き空白を正規化して比べた（`taskGroupRankById` 23 行・`dayFromSerial` 3 行が一致）。  
`serialOfDay` と `serial` は、約 2 万 5 千の本物の日と、端の値（日 1.5・年 2026.7・年 −5・年 50・年 1e6）で比べた。
7. **生成の結び** —— `icon-roster.json` と `state-machines.json` の `armModeStateMachine` を結び、`ARMED_BY_ENTRY` と集合で比べた（22 行が一致、並びだけが違う）。
8. **識別子** —— `git grep -hoE "\bUF-[0-9]+" -- docs change-request src tests tools .claude/skills | sort -t- -k2 -n -u | tail` の最大は `UF-182`（2026-09-26）。
