# CR-598 — 最も浅い段の行が隠されている端にも、続きの印を出す

> 起草の状態: 起草（2026-09-30、枝 `lane-l1`）。まだ当てていない。4 節の旧 2 件は、読んだ木で各 1 回だった（13 節）。
> 読んだ木: `lane-l1` `964efc45`（`CR-596` を 4.4 節まで当てた木。`docs/spec` ・ `src` ・ `tests` は `964efc45` のまま）。行番号・数は、すべてこの木で測った（13 節）。
> ID の帯: 調整役から `CR-598` を受けた。⭐ 本書は新しい識別子を 1 つも取らない（2 節）—— 表・行・設定値の行・状態機械・出来事のどれも足さない。
> ⛔ 当てる順: `CR-596` の後（`EL-20` ・ `EL-21` は `CR-596` が足した。`964efc45` で当たっている）。
> 閉じるもの: `JDG-846`。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 利用者の逐語と、それが決めること

| 裁定 | 逐語（`docs/development-records/rulings.md` から写した） | 決めること | 本書での扱い |
|---|---|---|---|
| `JDG-846` | 「画面の端に印を立てる」（問い「「…」の先のタスクの「一番上の行」そのものが隠されているとき、印を立てる表示中の行が無いので、いまは線も「…」も出ません。どうしますか？」への答え。推奨は「いまのまま」だった） | 端の祖先がすべて隠され、描かれた祖先が無いときも、見えている端から短い線と続きの印を出す。押せばその行と祖先を出してから送る。先の端が立つ所を新しく決める（表 T-303 の `EL-20` と `EL-6` の境） | 4 節の E-01（`EL-20`）・ E-02（`05-07-design.md` の `LC-10` の注）。立つ所は決定 1 |
| `JDG-841` ・ `JDG-842` | （`CR-596` が当てた。逐語は `rulings.md:1112-1113`） | 畳んだ行・隠した行の配下の端を省いて描き、印の押下で開いてから送る | 本書は開き方（`EL-21`）と送り方（`EL-10` 〜 `EL-12`）を変えない。立つ所が無い端をその流れに入れるだけ |
| `JDG-441` | （`rulings.md:735`。逐語の要: 「依存元のみが表示されている: 依存線の続きを...で省略する」「依存元と依存先が両方表示されていない: 依存線を描画しない」） | 片方の端が見えていれば短い線と続きの印、どちらも見えていなければ描かない | 本書は `EL-6` の文を変えない（決定 2） |

問うた場面: 持ち場 L1 がまとめて問うた回（`9a699fd0` の記録）。問いの「印を立てる表示中の行」は、`EL-20` の先の端が立つ所 —— 描かれている最も近い祖先の行の帯の下端 —— を指す。⭐ 目に見える続きの印（3 つの点）は、どの省いた線でも見えている端の短い線の先に立つ（`EL-7` 〜 `EL-9`）。先の端が立つ所は描かれず、短い線がどちらへ折れるかだけを決める（0.2 節の 2）。

### 0.2 調べた結果（`964efc45`）

1. **いま線が消える所。** `schedule-geometry.ts` の `lodEndOf`（`:347-372`）は、祖先を上へ辿り、描かれている行に当たればそこに立てる。描かれている行に当たらないまま最も浅い段の上へ出ると `:360` の `if (parent === undefined) return null` で `null` を返し、`dependenciesOf`（`:394-409`）の `:401` ・ `:404` の `continue` が線ごと落とす。文の側は `EL-20` の「⚠️ 描かれている祖先が無いとき（…）は、その端は立たず、線は `EL-6` に当たる」（`01-04-requirements.md:2833`）。⇒ 見えている端があっても線も印も出ない —— 問いの言うとおりである。
2. **印の点は見えている端に立つ。先の端の立つ所は向きだけを決める。** 省いた線の短い線は見えている端から出る（`dependency-route.ts` の `shortLineOf`、`:239-248`）。縦に折れる向きは経路の最初の縦の向き（`firstRiseOf`、`:228-234`）であり、長さは `S-360` ／ `S-361`、点は `S-362` で決まる（`continuationOf`、`:252-264`）。経路は先の端の立つ所へ向かって引かれるので、その所が見えている端より上か下かだけが、描いた絵に出る。⇒ 立つ所を決めることは、「短い線をどちらへ折るか」を決めることである。
3. **段 0 が畳まれている場合は、見えている端がそもそも無い。** `HR-2`（`:1712`）は段 0 を畳むと「行が 1 つも描かれない状態になりうる」とし、表 T-329 の `TD-1`（`:5251`、すべて要る）がどの行も落とす。コードも `drawn-rows.ts:18` が段 0 の畳みで空を返す。⇒ 段 0 の畳みで描かれている祖先が無い端は、他方の端も見えておらず、`EL-6` のままでよい。**本書が扱うのは「端の行の最も浅い段の祖先（端の行そのものを含む）が隠されている」場合だけである。**
4. **隠した行の木の中の位置は決まっている。** `LC-9`（`05-07-design.md:878`）は行を木の順に並べ、`:881` は「`LC-1` と `LC-2` が落とした行は、この順から抜けるだけである」とする。隠しを解けば、その行は木の順の同じ位置に戻る。⇒ 「隠しを解けば端の行が現れる所」は、木の順で端の行より前に在る、描かれているスクロールする行のうち最後の行の下端である。**これは `EL-2`（`:2815`）がピン止めした祖先に定める置き方と同じ形である**（「木の順でその祖先より前に在るスクロールする行のうち最後の行の下端 … そういう行が無ければ帯の下の残りの上端」）。
5. **押した後は `CR-596` の道がそのまま効く。** `item-grab.ts` の `continuationSend`（`:245-267`）は、描いたときの幾何の `far.foldedRowId` が在れば `farRowRevealWrites`（`:271-274`、`treeWritesOf` の `rowRevealAsked`）で開き、`far.groupId` の行へ縦に送る（`:261` ・ `:292`）。表 T-328 の `rowRevealAsked` は `hidden` の行も `expanded` にする（`task-group-folding.ts:598-615` の `isRevealedRowOrAncestor`）。⇒ 幾何が `foldedRowId` と `groupId` に端の行そのものを入れれば、入力側の書き換えは 0 である。
6. **掴み代・範囲選択・説明。** 印は `EL-9` の点のままなので、掴み代は 表 T-266 の `GA-24`（`:4203`、ポインタは `PK-7`）がそのまま当たる。範囲選択は `marquee.ts:36` が描いた線と点の外接で判じ、`EL-4` ／ `EL-5` の線と同じに取る。依存線や続きの印に説明（ツールチップ）を出す行は仕様に無い（`GA-24` ・「続きの印」で引いて、説明の行は 0 件）。⇒ どれも変えない。
7. **⚠️ 仕様とコードの食い違いを 1 つ見つけた（本書の起こりではない）。** `lodEndOf` の `:354` は、端の行がピン止めの一覧に在るだけで `null` を返す（WHY は「帯が持てないピン」）。ピン止めした行が隠されているとき・畳まれた祖先の下に在るときも、描かれず（`drawn-rows.ts:24-29` はピンを見ない）、この行で落ちる。`EL-20` にピンの除外は無い（`:2833`「端の行そのものが隠されているときを含む」）。⇒ 本書の場合（最も浅い段の行が隠されている）にも当たるので、決定 6 で同じ関数の中で直す。台帳の行は調整役が起こす（12 節）。

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

- ⭐ **`CH-4` ／ `GL-006`**（説明を読まずに操作できる）—— 隠した行へ向かう依存線が、隠した行の深さによって出たり出なかったりしない。最も浅い段を隠したときだけ線が消えると、「押せば開く」（`JDG-842`）が場合によって効かない不具合に見える。
- ⚠️ **`CH-3`（ぬるサク）** —— 毎フレーム足す仕事は、最も浅い段まで描かれている祖先が無い端についてだけ、木の順の位置を引くことである。そういう端が無ければ足さない。

### ② レビュー観点のどの条項を当て、何が出たか

- **`R1.3`（矛盾・唯一の正）** —— ① `EL-20` の「立たず、`EL-6` に当たる」は `JDG-846` と食い違う → E-01 で書き換える。② `EL-6` の「どちらも見えていない」は、見えている端がある線に当たらないので食い違わない（決定 2）。③ `05-07-design.md:876` の「描かれている最も近い祖先の行に立てる」は、祖先が無い場合を言わない → E-02 で 1 文足す。④ 立つ所の置き方は `EL-2` のピン止めした祖先の置き方と同じ形なので、新しい置き方を作らない（`R2.21`）。
- **`R1.4`（異常系・境界値）** —— ① 段 0 が畳まれている（0.2 節の 3）。② 両端とも隠した最も浅い段の配下 → どちらも見えておらず `EL-6`。③ 木の順で端の行より前に、描かれているスクロールする行が無い → 帯の下の残りの上端（`EL-2` と同じ）。④ 見えている端がピン止めした行に在る → 立つ所は残りの側なので、短い線は下へ折れる（`EL-2` のピン止めした祖先と同じ代償）。⑤ 端の行がピン止めされていて隠されている → 決定 6。⑥ 帯が持てず落ちたピンだけが描かれない理由の端 → 今のまま `null`（`RT-4a` ／ `LC-1`）。
- **`R1.2`（検証できる表現）** —— 立つ所を「木の順（`LC-9`）で端の行より前に在る、描かれているスクロールする行のうち最後の行の下端」と、既にある語だけで書いた。試験は、見えている端の短い線の折れる向き（上 ／ 下）で立つ所を判じられる。
- **`R2.21`（1 つの仕事は 1 か所）** —— 木の順は `LC-9` の 1 か所。コードでも木の順の並べ方を 2 つ持たない（5 節の SEAM、9 節）。
- **`R5`（性能）** —— 上の ① の `CH-3`。⛔ 最適化は進めない（`JDG-11`）。

### ③ 利用者に問わずに決めたこと

⭐ `rulings.md` の `JDG-` の行を `EL-6` ・ `EL-20` ・「続きの印」・「両方表示されていない」・「画面の端」・「隠した行」・「隠され」で引いた（13 節）—— 当たるのは `JDG-441`（両方見えなければ描かない）、`JDG-443` ・ `JDG-445`（送り方、`JDG-841` が覆した）、`JDG-596`（隠した行は畳まれてもいる）、`JDG-616`（検索の飛び方は隠れも開く）、`JDG-790` 〜 `JDG-799`、`JDG-841` 〜 `JDG-846` で、本書と食い違わない。`JDG-441` の「両方表示されていない」は、見えている端がある本書の線には当たらない。
⭐ 規則 06 の ① ② —— 直すのは幾何の中だけで、公開の名（表 T-064）も型の形（`FarEndGeometry` の欄）も変わらない。保存も交換もしない。

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| 決定 1 | 描かれている祖先が無い `EL-20` の端は、木の順（`LC-9`）で端の行より前に在る、描かれているスクロールする行のうち最後の行の下端に立つ。そういう行が無ければ帯の下の残りの上端に立つ。横の位置は `EL-2` のまま（予定の日付と 表 T-018 のアンカー）。<br>⭐ 候補を 3 つ比べた: **A** `Row Area` の上端か下端（「画面の端」をそのまま読む）／ **B** 見えている端の行の高さで、画面の左右の端 ／ **C** 本決定（隠しを解けば端の行が現れる木の順の境） | ① 描いた絵に出るのは短い線の折れる向きだけである（0.2 節の 2）。C の向きは、行が戻ってくる側を必ず指す。その境が画面の外なら、線は画面の端の側を指す —— 利用者の「画面の端」に当たる。② A は、上端か下端かを選ぶのに、見えている端の行と木の順を比べなければならない。コードは端を 1 つずつ引くので（`sightedEndOf`、`:375-383`）、2 つの端を結び付けることになる。見えている端と比べずに「画面の中の最初の行より前なら上」で選ぶと、隠した行が見えている 2 行のあいだに戻るとき、下の行の端から下へ折れ、逆を指す。③ B は見えている端と同じ高さに立つので、経路が同じ段の形（`RP-1` ／ `RP-8`）になり、短い線が横へ伸びるだけで上下を言わない。④ C は `EL-2` のピン止めした祖先の置き方と同じ形であり、新しい置き方を作らない | 立つ所が画面の中（見えている 2 行の境）になることがある —— 立つ所は描かれないので、絵には出ない。木の順での位置を、描かれていない行についても毎フレーム引く |
| 決定 2 | `EL-6` の文は変えない。境は `EL-20` の ⚠️ の 1 文の中で動く —— 描かれている祖先が無い端も「見えていない端」として立つので、他方が見えていれば `EL-4` ／ `EL-5`、他方も見えていなければ `EL-6` に当たる | `EL-6` は「どちらも見えていない」とだけ言い、見えていない理由を読まない。`EL-14` ・ `EL-19` の `EL-6` への言及（`impact.py` の参照 3 か所）も真のまま | — |
| 決定 3 | 段 0 が畳まれているときは今のまま `EL-6`（線を幾何に入れない）とし、文にその理由を書く | 0.2 節の 3。見えている端が無いので、線を立てても何も描かれない | — |
| 決定 4 | 押したときの振舞いは変えない —— `EL-21`（`rowRevealAsked` で端の行と祖先をすべて `expanded` に、段 0 も開く）→ `EL-11` ・ `EL-12`（縦は端の行そのものへ）→ `EL-16` 〜 `EL-19` の印。`EL-10` の倍率は変えない | `EL-21` の文は「印の先の端が `EL-20` の端のとき」とだけ言い、祖先が描かれているかを読まない。0.2 節の 5 のとおり、コードも幾何の 2 つの欄だけで動く | — |
| 決定 5 | 掴み代 `GA-24`・ポインタ `PK-7`・範囲選択 `SL-3`・`EL-14`・書き出し `EL-15`・端の囲み（`SL-8`、描かれていない端は囲まない）は変えない | 印は `EL-9` の点のままで、線は `EL-4` ／ `EL-5` の線のままである（0.2 節の 6） | 書き出す絵にも、隠した行へ向かう短い線と印が出る（ほかの省いた線と同じ） |
| 決定 6 | 端の行がピン止めされていても、隠されているか畳まれた・隠された祖先の下に在るなら、`EL-20` の端とする（コードの `:354` の門を、帯が持てず落ちたピンだけに狭める） | `EL-20` にピンの除外は無い（0.2 節の 7）。最も浅い段の行がピン止めされて隠されているのは、`JDG-846` の場面そのものである | 隠したピン止めの行は、戻ると帯に入るが、立つ所は残りの側の木の順の境である —— 向きが帯の側を指さないことがある |
| 決定 7 | 描かれている祖先が在る `EL-20` の端・`EL-2` の端の立つ所は変えない（最も近い描かれている祖先の帯の下端のまま） | `JDG-846` は祖先が無い場合だけを問うた。木の順の境に揃える案は、`EL-2` ・ `EL-20` の両方を動かす | 祖先が在る端と無い端で置き方が 2 つになる（どちらも `EL-2` の文の中に在る置き方である） |
| 決定 8 | 新しい長さ・ずれの値を足さない | 立つ所は行の下端と帯の下の残りの上端だけで決まる。短い線と点の寸法は `S-360` 〜 `S-362` のまま | — |

---

## 1. 範囲 —— 行き先

| 何 | 仕様で変える所 | 編集 | 裁定を戻すとき |
|---|---|---|---|
| 描かれている祖先が無い端の立つ所 | 表 T-303 の `EL-20` の ⚠️ の 1 文（`01-04-requirements.md:2833`） | E-01 | E-01 の新を旧へ |
| 設計の注 | `05-07-design.md:876`（`LC-10` の順の理由の段） | E-02 | 足した 1 文を消す |
| `EL-6` ・ `EL-2` ・ `EL-21` ・ `RT-4a` ・ `GA-24` ・ `SL-3` ・ `SL-8` | 変えない | — | — |

**数**: 文の編集 2（E-01 ・ E-02）。原稿 JSON の編集 0。生成器の群 0。

---

## 2. 新しい識別子

本書は新しい識別子を取らない —— 表・行 ID・接頭辞・設定値の行・状態機械・出来事・関数の公開の名のどれも足さない。

---

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

| 消すもの | 所（`964efc45`） | 置き換わる先 | 編集 |
|---|---|---|---|
| `EL-20` の「描かれている祖先が無いとき（段 0 が畳まれている、または … 隠されている）は、その端は立たず、線は `EL-6` に当たる」 | `01-04-requirements.md:2833` | 隠されている場合は木の順の境に立つ。段 0 が畳まれている場合だけ `EL-6` | E-01 |
| コードの「最も浅い段の上へ出たら `null`」（⛔ 本書は直さない） | `schedule-geometry.ts:360` | 描かれている祖先が無く、隠し ・ 畳みが途中に在れば、木の順の境に立てる | 9 節、波 1b |
| コードの「ピン止めの一覧に在れば `null`」（⛔ 本書は直さない） | `schedule-geometry.ts:354` | 帯が持てず落ちたピンだけ `null` | 9 節、波 1b（決定 6） |
| 試験「最も浅い段の隠した行には描かれている祖先が無い —— 線も印も無い」（⛔ 本書は直さない） | `tests/contract/cr-596-a-click-on-the-mark-jumps-and-marks-the-landing.contract.test.ts:131-132`（`EL_20_NONE` の逐語）・ `:864-873` | 短い線と印が在り、押せば開いて送る | 波 2 |

⭐ **消さないもの**（読み直して真のまま）: `EL-6` の全文。`EL-20` の残りの文（見出し、`TD-1` ／ `TD-2` ／ `TD-3`、描かれている最も近い祖先に立つ置き方、⭐ 隠した行は畳まれてもいる、⚠️ 畳みとグループ LOD の両方）。`EL-2` の全文。`EL-21` の全文。`RT-4a` の「本行が落とすのは、線を付ける予定が無い端点だけである」。

---

## 4. 書き直す所（当てる体がそのまま使う文）

⛔ **作法**: 各編集は「旧」を「新」で置き換える。**置き換える前に、旧がそのファイルに 1 回だけ現れることを数えること**（`964efc45` で 2 件とも 1 回。13 節）。ファイルの改行は LF。
⚠️ どちらも見出しに `partial` と書いた、行の一部の置き換えである。塊の末の改行を旧にも新にも含めない。

<!-- EDIT id=E-01 file=docs/spec/01-04-requirements.md partial -->
旧
```text
<br>⚠️ 描かれている祖先が無いとき（段 0 が畳まれている、または端の行の最も浅い段の祖先（端の行そのものを含む）が隠されている）は、その端は立たず、線は `EL-6` に当たる。
```
新
```text
<br>⚠️ 描かれている祖先が無いとき（端の行の最も浅い段の祖先（端の行そのものを含む）が隠されている）は、木の順（`05-07-design.md` の 表 T-068 の `LC-9`）で端の行より前に在る、描かれているスクロールする行のうち最後の行の下端に立つものとし、そういう行が無ければ帯の下の残りの上端に立つものとすること（MUST） —— 隠しを解けば端の行が現れる所であり、`EL-2` がピン止めした祖先に定める置き方と同じである。<br>横の位置は `EL-2` と同じく、予定の日付と 表 T-018 のアンカーから決める。<br>見えている他方の端の短い線（`EL-7` ／ `EL-8`）と続きの印（`EL-9`）は、この所の側へ向く —— その所が画面の外なら、画面の端の側を指す。<br>⛔ 立つ所が無いとして線を落としてはならない（MUST NOT） —— 見えている端から先を開く入口（`EL-21`）が消え、隠した行の深さによって印が出たり出なかったりする。<br>⚠️ 段 0 が畳まれているときは行が 1 つも描かれず（表 T-015 の `HR-2`）、見えている端も無いので、線は `EL-6` に当たる。
```

<!-- EDIT id=E-02 file=docs/spec/05-07-design.md partial -->
旧
```text
描かれている最も近い祖先の行に立てる（同表の `EL-2` ・ `EL-20`）。
```
新
```text
描かれている最も近い祖先の行に立てる（同表の `EL-2` ・ `EL-20`）。描かれている祖先が無い隠した行の配下の端点は、`LC-9` の木の順でその端の行より前に描かれているスクロールする行のうち最後の行の下端に立てる（同表の `EL-20`）。
```

当てた後に打つもの: `npm run gen:check`（原稿 JSON は触らないので差は出ない）→ `bash .claude/skills/spec-graph-check/check.sh`（⚠️ check 42 は、波 2 が `EL_20_NONE` の逐語を書き直すまで赤になる —— 8 節）。

---

## 5. 継ぎ目 —— 両側の依頼文にこのまま写すこと

```
SEAM-1 (geometry: the far end with no drawn ancestor, T-303 EL-20)
- Where: src/entity/layout-engine/schedule-geometry/schedule-geometry.ts, lodEndOf.
  Today the climb that finds no drawn ancestor returns null (the line is dropped).
- New: when the climb reaches the top with no drawn row on the way AND the own row
  or an ancestor is 'hidden' (or 'collapsed') AND levelZeroTreeState !== 'collapsed',
  return a standing end instead of null:
    y = the bottom (row.y + row.height) of the LAST row in layout.rows with
        isPinned !== true that comes BEFORE the far Task's own row in tree order;
        if there is no such row, y = layout.scrollAreaY ?? regions.rowArea.y
        (the top of the rows under the band). Same shape as standingYOf for a
        pinned ancestor (EL-2).
    x, width = as today for an EL-2 end (plan start, planSpanWidthOf).
    far = farEndOf(end, own.id, <own depth>, own.id, reading)
          -> groupId = the own row, foldedRowId = the own row.
- Tree order is LC-9: parent before its children, siblings by TaskGroup.order
  ascending (AT-55) -- the order drawn-rows.ts inTreeOrder already uses. Do not
  write a second tree-order walk: expose ONE helper from the schedule-layout
  side and use it in both places. Compute it only when an end needs it.
- Level zero collapsed: return null as today (no row is drawn, so no end is seen).
- A pin the band could not hold (pinned, not hidden, no hidden/collapsed ancestor,
  not in layout.rows): return null as today. A pinned own row that IS hidden or
  under a hidden/collapsed ancestor is an EL-20 end like any other row
  (narrow the pinnedIds guard; decision 6).
- Unchanged: FarEndGeometry's fields and meaning, standingEndOf, the elision
  (EL-4 / EL-5 when the other end is seen, EL-6 when it is not), the short line,
  the dots, the hit area (GA-24), the marquee, the export.

SEAM-2 (press, unchanged -- verify only)
- item-grab.ts continuationSend already reveals far.foldedRowId through
  treeWritesOf({ type: 'rowRevealAsked', revealedRowId }) (level zero too), sends
  down to far.groupId with offset 0, skips the EL-10 zoom when foldedRowId is set,
  and returns landingMarked. With SEAM-1 filling groupId = foldedRowId = own row,
  no line of item-grab.ts changes. One undo step for the reveal (UN-14), none for
  the send (UN-8).

Observable (for the tester, from the spec only):
- A Task in a row whose shallowest ancestor (or itself) is hidden, linked to a
  seen Task: the seen end draws the short line and three dots (EL-4 / EL-5).
  The short line bends UP when the hidden row sorts before the seen end's row in
  tree order and DOWN when it sorts after (for seen ends in scrolling rows).
- A still click on the dots: the hidden row and its ancestors become expanded, the
  view is sent so the far Task's row is at the top of the rows under the band, the
  landing mark shows (EL-16 .. EL-19). Ctrl+Z hides the row again.
- Level zero collapsed: nothing is drawn (EL-6).
```

---

## 6. グラフ（`964efc45`）

### 6.1 `impact.py` —— 触る行ごとの届く先（要求 / 参照）

| 対象 | 届く先 | 読んだ結果 |
|---|---|---|
| `EL-20` | 要求 1 ／ 参照 4 —— `FR-009`（`:2768` `RT-4a` ・ `:2823` `EL-10` ・ `:2834` `EL-21`）・ `05-07-design.md:876` | `RT-4a` ・ `EL-10` ・ `EL-21` は「`EL-20` の端」とだけ言い、祖先の有無を読まない ⇒ 書き換え不要。`:876` は E-02 |
| `EL-6` | 要求 1 ／ 参照 3 —— `FR-009`（`:2827` `EL-14` ・ `:2832` `EL-19` ・ `:2833` `EL-20`） | `EL-14` ・ `EL-19` は `EL-6` の線の扱いを言うだけで真のまま。`:2833` は E-01 |
| `EL-2` | 要求 2 ／ 参照 6 —— `FR-081:2370`（`SL-8`）・ `FR-009`（`:2768` ・ `:2823` ・ `:2829` ・ `:2833`）・ `05-07-design.md:876` | 本書は `EL-2` を指すだけで変えない |
| `LC-10` | 要求 0 ／ 参照 4 —— `05-07-design.md:344` ・ `:410` ・ `:876`、`tbl-published-entries.md:24` | `:876` だけが E-02 |
| `LC-9` | 要求 0 ／ 参照 5 —— `05-07-design.md:343` ・ `:397` ・ `:878` ・ `:885` ・ `:889` | E-01 が新しく指す。`LC-9` は変えない |
| 表 T-303 | 1 次 11 ／ 2 次 40 | 行を足さない・消さないので、表を指す文は動かない |

### 6.2 `induced.py`

```
seeds: FR-009 T-303 T-068 T-015 T-329 T-328
-> 6 of 6 resolved, 1 edge inside the seed set, 0 cycles
```

⇒ 閉路 0。E-01 と E-02 は別のファイルであり、どちらの順で当ててもよい。

---

## 7. 数の予測（`964efc45`。当てた後に同じ数え方で突き合わせる）

| 数 | `964efc45` | 本書を当てた後 | 差 |
|---|---|---|---|
| tables / figures / rows / uids（`md-checks.py`） | 212 / 29 / 2685 / 176 | 212 / 29 / 2685 / 176 | 0 |
| 表 T-303 の行 | 21 | 21 | 0 |
| `EL-20` のセルの `<br>` で区切った文 | 5 | 9 | ＋4（E-01 の 1 文が 5 文になる） |

---

## 8. 波 —— 持ち場で割る

| 波 | 持ち場 | 中身 | 体 |
|---|---|---|---|
| 0 | ― | 当てる木で 4 節の旧をもう 1 度数える（2 件とも 1 回）。0.2 節の 7 の食い違いを台帳に起こすかを決める（12 節） | 調整役 |
| 1a | 仕様の文（`01-04-requirements.md` ・ `05-07-design.md`） | E-01 ・ E-02。変更履歴（`docs/development-records/changelog.md`）に 1 行 | 仕様の持ち場 |
| 1b | 段 B の **L1 描画**: `schedule-geometry.ts`（`lodEndOf`）＋ 木の順の助け 1 つ（`schedule-layout` の側、`drawn-rows.ts` の `inTreeOrder` と共有） | SEAM-1 | L1（実装の体） |
| 1c | L1: `item-grab.ts` | SEAM-2 —— 書き換えは 0 の見込み。確かめだけ | 1b と同じ体 |
| 2 | 仕様だけを読む試験の体 | 新しい `EL-20` の文から試験を書く。`tests/contract/cr-596-a-click-on-the-mark-jumps-and-marks-the-landing.contract.test.ts` の `EL_20_NONE`（`:131-132`）と `:864-873` を書き直す（実装した体に書かせない） | 別の体 |
| 3 | ― | 実物で確かめる（Playwright の probe。表示枠は rAF を回さない）: 最も浅い段の行を隠し、その配下のタスクへの依存線が見えている端から短い線と点で出る。向きが隠した行の戻る側を指す。点を押すと行が戻り、送られ、印が付く。`Ctrl+Z` で隠しが戻る | 調整役 |

- ⚠️ **毎フレームの経路に触れる**（`dependenciesOf` → `lodEndOf`）。規則 04 の 5 節と `JDG-605`: `perf-pending.md` に 1 行が要る（調整役が書く）。`main` の早送りの前に測る。
- ⚠️ 1a と 2 は同じ合流で当てる —— 1a だけでは check 42 が `EL_20_NONE` の逐語で赤になる。
- ⭐ `frame-loop.ts` ・ `screen-values.ts`（持ち場 L4）に触れる見込みは無い。触れる塊が出たら、`cross-lane: <file> for CR-598` の 1 コミットに分けること。
- ⛔ 体はワークツリーも `node_modules` の結び目も作らない。`git stash` をしない。基準線に触れない。

---

## 9. 仕様の外で直すもの（⛔ 本書は直さない。`964efc45` の行番号）

| ファイル | 何を | 毎フレーム |
|---|---|---|
| `src/entity/layout-engine/schedule-geometry/schedule-geometry.ts` | `lodEndOf`（`:347-372`）: `:360` の `parent === undefined` で、途中に隠し ・ 畳みが在り段 0 が畳まれていなければ、SEAM-1 の立つ所で `SightedEnd` を返す（`groupId` ・ `foldedRowId` は端の行）。`:354` の `pinnedIds` の門を、隠されておらず畳まれた ・ 隠された祖先も無いピンだけに狭める（決定 6）。`:343-345` の WHY を書き直す | ⚠️ はい |
| `src/entity/layout-engine/schedule-layout/drawn-rows.ts` | `inTreeOrder`（`:39-64`）の木の順を、描かれていない行にも引ける形で 1 つ公開し、`inTreeOrder` もそれを使う（`R2.21`）。⚠️ 公開の名が増えるなら、表 T-064 に載せるかを 1b の体が調整役に問う | ⚠️ はい（引くのは要る端が在るときだけ） |
| `src/adapter/input-command-translator/item-grab.ts` | 変えない見込み（SEAM-2）。`:242-243` の WHY に `EL-20` の祖先の無い端を足すかは体に任せる | いいえ |
| `src/entity/layout-engine/schedule-geometry/dependency-route.ts` ・ `src/adapter/svg-renderer/*` ・ `src/entity/layout-engine/item-hit-area/marquee.ts` ・ `item-hit-area.ts` | 変えない（決定 5） | — |
| `tests/contract/cr-596-a-click-on-the-mark-jumps-and-marks-the-landing.contract.test.ts` | `:131-132` の `EL_20_NONE` と `:864-873` の試験は新しい文で偽になる —— 波 2 の体が書き直す。`:875-878` の「行を戻せば `EL-3`」の対照はそのまま使える | いいえ |

---

## 10. ⛔ この変更でやらないこと

- `EL-6` の文を変えない。`JDG-441` の「両方表示されていない: 描画しない」はそのまま（決定 2）。
- 描かれている祖先が在る端（`EL-2` ・ `EL-20`）の立つ所を変えない（決定 7）。
- 続きの印を、見えている端の短い線の先以外（画面の縁そのもの）に描かない —— 11 節の問い 1 の推しのとおり。
- 開き方（`rowRevealAsked`、`EL-21`）・送り方（`EL-10` 〜 `EL-12`）・送った先の印（`EL-16` 〜 `EL-19`）を変えない（決定 4）。
- 新しい設定値の行を足さない（決定 8）。

---

## 11. 前に立つ者へ返す問い

| 問い | 案 | 推し |
|---|---|---|
| 問い 1 —— 「画面の端に印を立てる」の「印」をどう読むか | **A**（本書）3 つの点は、ほかの省いた線と同じく見えている端の短い線の先に立つ。画面の端は、短い線が向く側として現れる（隠した行が画面の外に戻るとき）／ **B** 3 つの点そのものを `Row Area` の上か下の縁に描く（見えている端から縁まで線を引く、または点だけを縁に置く） | A。B は印を端のタスクから離し、どの線の印かが読めなくなる。新しい描き方の行・掴み代の行（`GA-24` の隣）・範囲選択と書き出しの扱いを足すことになる。`rulings.md` の `JDG-846` の「決めること」も「見えている端から短い線と続きの印を出し」と読んでいる |

⚠️ 問い 1 は本書の E-01 を止めない —— B なら、E-01 の立つ所はそのままに、印の描き方の行を別の変更要求で足す。
⭐ ほかに開いている問いは無い。決定 6（ピン止めした隠した行）は `EL-20` の文が既に決めている。

---

## 12. 台帳

| ID | 何か | 状態 |
|---|---|---|
| `JDG-846` | 0.1 節 | 「指示 —— 新しい変更要求が当てる」のまま。当てた後、前に立つ者が `CR-598` の名を入れる |
| （新しい `DFC-` の行、番号は調整役から受ける） | 0.2 節の 7 —— `lodEndOf` がピン止めした行を、隠されていても畳まれた祖先の下でも落とす（`EL-20` と食い違う） | 調整役が起こす。本書の波 1b が同じ関数で直す（決定 6） |

---

## 13. 測り方の再現

```
# the tree: lane-l1 964efc45 (CR-596 applied through its section 4.4)
# scratchpad: <scratchpad>/g598/

git log --oneline -1                                  # -> 964efc45 cross-lane: frame-loop.ts for CR-596 (check 26b)

# the ruling (section 0.1)
sed -n 1117p docs/development-records/rulings.md      # JDG-846

# totals (section 7)
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/md-checks.py
#   -> tables=212  figures=29  rows=2685  uids=176

# graph (section 6)
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py EL-6 EL-20 EL-2 LC-10 LC-9
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py T-303 T-068
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/induced.py FR-009 T-303 T-068 T-015 T-329 T-328
#   -> 6 of 6, 1 edge, 0 cycles (index.json written by check.sh 2026-09-30 23:11)

# rulings reached (section 0 ③): every "| JDG-" row of rulings.md grepped for
#   EL-6 / EL-20 / 続きの印 / 両方表示されていない / 画面の端 / 隠した行 / 隠され
#   -> JDG-441 JDG-443 JDG-445 JDG-596 JDG-616 JDG-790..799 JDG-841..846

# where the line is dropped today (section 0.2 items 1, 3, 5, 7)
grep -n "lodEndOf\|parent === undefined\|pinnedIds.has" src/entity/layout-engine/schedule-geometry/schedule-geometry.ts
grep -n "levelZeroTreeState\|hidden" src/entity/layout-engine/schedule-layout/drawn-rows.ts
grep -n "foldedRowId\|farRowRevealWrites" src/adapter/input-command-translator/item-grab.ts

# tests that quote the sentence E-01 replaces
grep -rln "描かれている祖先が無いとき\|その端は立たず" tests src tools docs   # -> the cr-596 contract test and 01-04 only

# every old block of section 4 occurs exactly once; both edits apply to COPIES
PYTHONIOENCODING=utf-8 python <scratchpad>/g598/verify.py
```

### 13.1 ⚠️ 測りが見られなかったもの

- 実物では見ていない。短い線の折れる向き（決定 1）は、コード（`shortLineOf` ・ `firstRiseOf` ・ `routeOf`）を読んで言った —— 立つ所を変えた写しで描いてはいない。
- 0.2 節の 7（ピン止めした隠した行が落ちる）は、コードを読んで言った。その場面を組んで走らせてはいない。
- 木の順を毎フレーム引く費用は測っていない（8 節の `perf-pending.md` の行が測る）。
- `induced.py` は `check.sh` が書き出した `index.json`（2026-09-30 23:11）を読んだ。
