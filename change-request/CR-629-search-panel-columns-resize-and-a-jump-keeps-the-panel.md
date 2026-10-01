# CR-629 — 検索パネルの列は見出しの境目で幅を変えて名を省略で切り、飛ぶと担当と完了率の札が左に見え、プロパティパネルの開閉は変わらない

> 起草の状態: 起草のみ（2026-10-01、枝 `l4-review-crs`）。まだ当てていない。4 節の旧 13 件は、読んだ木でどれも 1 回だった（13 節）。11 節の問い 1 は 2026-10-01 に推奨の A と答えを得た（`JDG-1096` の Q15）。同じ答えの Q16（`DFC-1645`: 列の絞り込みを押した見出しの下のドロップダウンにし、見出しの字でも開く）を本書が持つ —— 決定 11 と E-14 を足した（2026-10-01、調整役の依頼。E-14 の旧は `8b4b7907` で 1 回）。
> 読んだ木: `refactor` `bfbe7eb7`。行番号・数は、すべてこの木で測った（13 節）。
> ID の帯: 調整役から `CR-629` だけを受けた。⚠️ 仕様の新しい識別子は**仮番**である（2 節）—— 当てる時に仕様の波のセッションが本番を振る（規則 02 の 2.5）。
> ⛔ 当てる順: `CR-621`（窓の枠）→ `CR-630`（Esc の段）→ **本書**。E-02・E-06・E-07・E-08・E-09 は、両書が書き換えうる所と同じ行・同じ升に載る（4.1 節）。`CR-617`（遅延診断レポート、起草）は 表 T-331 の 2 セルを書くが、本書は 表 T-331 を書かない —— 重ならない。`CR-609`（プロパティパネルの状態機械、起草）とは合成できる（5 節）。
> 閉じるもの: `DFC-1347` の ①②④⑤（③ は `CR-621`、⑥⑦ は `CR-630`）と `DFC-1281`（`S-428` の値と `SJ-6` の寄せ）と `DFC-1645`（絞り込みの開き方、`JDG-1096` の Q16）。`JDG-877` の該当 4 項を当てる。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 利用者の裁定の逐語

| 裁定 | 逐語（`docs/development-records/rulings.md` から写した） | 本書での扱い |
|---|---|---|
| `JDG-877` | 「列幅を変更可能とせよ。<br> タスク名や担当者名が列幅より長い場合は、列幅に収まるようにトランケーションせよ」 | ①② —— 新しい行 `SV-<新1>`（列の幅）・掴みの行 `GR-<新1>`・設定値の行（E-03・E-06・E-12） |
| `JDG-877` | 「担当者名や進捗を表示するモードで検索から指定のタスク/マイルストーンにジャンプする場合、左上で担当者名や進捗が表示できるようにしてジャンプしろ」 | ④ —— `SJ-6` が占有の左端を寄せ、`S-428` に値（E-05・E-11） |
| `JDG-877` | 「ジャンプするときプロパティーパネルが閉じている場合は閉じたまま、開いているときは開いたままジャンプしろ」 | ⑤ —— `SJ-4` を覆す（E-04）。`JDG-616` の一部を覆す（下の行） |
| `JDG-616` | 「タスク名を押下したら、その部分にジャンプ。 折りたたまれていたら 開いて (expandして) フォーカスをあてる。」（1 通目）。まとめの欄「⭐ そのタスクを選ぶ（プロパティパネルに出る）。」 | ⚠️ **覆すのは、まとめの欄の括弧「（プロパティパネルに出る）」だけである。** 仕様はそれを `SJ-4` の「プロパティパネルに出す（`S-99h`）」として書いた。⭐ 選ぶこと（「フォーカスをあてる」の読み）・祖先を開くこと・コメントボックスも同じ形にすることは残す |
| `JDG-612` | 「デフォルトは画面の1/4程度。 ホバーの淵を触って任意のサイズに変更可能」（まとめの欄「大きさ・位置・フィルターはファイルに保存しない（画面だけの状態）」） | 先例。列の幅も同じく画面だけの値とし、閉じても同じ画面のあいだ覚える（決定 2） |
| `JDG-619` | 「進め方も提案通り」（まとめの欄「パネルの寸法（既定の大きさ、列の最小幅、掴める縁の幅、表の行の高さ）は触れる見本…で決める」） | 寸法の値の出どころ。見本 `previous-project-result/18-search-panel-sample/` の初めの値を使うかを 11 節の問い 1 で問う |
| `JDG-633` | 「→提案通り」（まとめの欄「⭐ 2: 大きさを変えて掴める縁は、縁の内側と外側に同じ幅ずつ」） | 先例。列の境目の掴みも、境目の左右に同じ幅ずつ敷く（決定 5） |
| `JDG-614` | 「一般的な表と同様、表ヘッダーは固定、担当者名列・コメント列まで固定表示」 | 変えない。固定した列の境目が見えなくならないよう、引ける範囲を領域の中に留める（決定 4） |

| 裁定 | 逐語（2026-10-01。Q の番号は調整役がチャットで振った番号） | 本書での扱い |
|---|---|---|
| `JDG-1096` の Q15・Q16 | 「Q14: 推奨通りA<br>Q15:  推奨通りA<br>Q16:  推奨通りA<br>Q17: 推奨通りA」（Q15 は本書の 11 節の問い 1、Q16 は `DFC-1645` の問い。Q14 は `CR-627`、Q17 は `DFC-1290`） | Q15: 見本の初めの値を 🔎 で入れる（E-11・E-12 のまま）。Q16: 列の絞り込みは、押した列の見出しの下に重ねるドロップダウンとして開き、見出しの字を押しても開く（決定 11、E-14） |

### 0.2 調べた結果（`bfbe7eb7`）

1. **② の原因は `S-425` の値の無さではない。列に幅が 1 つも無いことである。** `src/framework/dom-screen-surface/search-panel-drawing.ts` のセルの型は `white-space:nowrap;overflow:hidden;text-overflow:ellipsis`（`:85`）を持つが、表は `border-collapse:collapse;`（`:76`）だけで、幅・`table-layout`・`<col>` のどれも持たず、表を包む箱は `overflow:auto`（`:74`）である。⇒ ブラウザは各列を最も長い字の幅まで広げ、表が箱より広くなれば箱ごと横に送る —— 省略記号が働く場面が来ない。`S-425` は下限なので、値を入れても列を狭めない。⇒ **仕様が足すべきは列の幅そのもの（既定の幅と、握って変えた幅）と、表をその幅で組むこと**（E-03 の `SV-<新1>`）。試験 `tests/contract/cr-571-search-panel-view.test.ts:579` は字の型（`nowrap`・`ellipsis`）だけを見るので、この穴を通していた。（読んで確かめた。組んで測ってはいない。）
2. **④ の原因は `SJ-6` が日付だけを寄せることである。** `src/use-case/edit-document/search-jump.ts:65`〜`:67` は日付を表示の左端へ入れ込み 0 で置く（注「`S-428` has no value」）。担当と完了率の札は予定バーの外側の左に置かれる（`FR-090`「予定バーの左端から `S-32` だけ左へ離した位置に、札の右端を揃えて置く」、表 T-038 の `OC-2`「左（バーの外側へ張り出す）」）⇒ 日付を左端に置くと札はまるごと表示の左の外に出る。`S-428` に値が入っても、札の幅が入れ込みより広ければ切れる ⇒ **寄せる点を、日付から「左へ出た占有の左端」へ変える**（E-05）。
3. **⑤ はシェルの 1 行が `SJ-4` を果たしている。** `src/framework/single-html-shell/frame-loop.ts` の `jumpToSearchHit`（`:1284`〜`:1296`）は選択を動かした後に `showProperties()`（`showPropertiesOfChoice`、`:2835` —— `propertiesOfChoiceAsked` を送る）を呼ぶ。⭐ 選択が動いたことだけでパネルを出すことは `FR-072` が既に禁じている（「⛔ 表 T-023c の選択が動いたことだけを理由に、パネルを出し始めてはならない（MUST NOT）—— 出すのは、出すことを求める要求が名指した押下のときだけである（MUST）。」）⇒ `SJ-4` から「プロパティパネルに出す」を消せば、閉じたパネルは `FR-072` によって閉じたままになる。出ているパネルは 表 T-280 の `selectionMoved` の升のとおり（`selectionDisplayed` なら中身が飛ぶ先へ移る）。
4. **列の幅の置き場の先例は、同じパネルの中にある。** `S-419`（位置と大きさ）と `S-420`（語・表・絞り込み・並べ替え）は `SearchPanelSession` に載り、閉じても同じ画面のあいだ覚える（`SV-14`）。ヘルプの `S-435`「閉じたら捨てる」は別の UI パーツの先例であり、検索パネルは既に反対の側を選んでいる ⇒ 問わずに決めた（決定 2）。
5. **列の境目を左右へ動かすポインタの形は既にある。** 表 T-269 の `PK-10`（`col-resize`）を、`FR-106` が基準日線（`GR-16`）とパネルの境界（`GR-22`）に当てている（「どちらも縦の線を左右へ動かす操作であり、同じ形が同じ動きを示す」）⇒ 列の境目にも同じ形を当てる（決定 6）。

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

⭐ **`CH-4` ／ `GL-006`**（説明を読まずに操作できる。`FR-151` の ORIGIN も `GL-006`）—— 列の境目を掴んで引けば幅が変わり、長い名は列の中で省略記号で切れ、飛んだ先で担当と完了率の札が読め、飛んでもパネルの開閉は押す前のまま —— どれも、表の道具と日程表を見て人が予期するとおりに動く。

### ② レビュー観点のどの条項を当て、何が出たか

`docs/development-rules/07-review-standards.md` の条項を当てた。

- **`R1.3`（矛盾がない・唯一の正）** —— `SJ-4` の「プロパティパネルに出す」は `JDG-877` と食い違う。裁かれた行が勝つ（規則 02 の 1）ので `SJ-4` を書き換える（E-04）。⭐ 書き換えた後の `SJ-4` は `FR-072` の MUST NOT（選択が動いただけで出し始めない）とそのまま揃う。`SV-17` の「列の幅の下限は `S-425`」は、幅を決める行が無いまま下限だけを言っていた —— 幅の規則を `SV-<新1>` の 1 か所に集め、`SV-17` はそれを指す（E-03）。
- **`R1.4`（境界・空の場合）** —— 3 つ出た。(a) 固定した列（`SV-6`）の境目を領域の外まで引くと、送っても見えず二度と掴めない ⇒ 境目を領域の右の縁より右へ引かせない（決定 4）。(b) 幅が狭いと、見出しのセルの `IC-122` まで省略で切れ、`SV-7`「どの列の見出しにも `IC-122` を置き」が偽になる ⇒ 切るのは見出しの語だけとし、`S-425` は `IC-122` が入る幅とする（決定 7）。(c) 飛ぶ先の日付が空のときは、今の「日付が空なら横は動かさない」をそのまま残す。
- **`R2.7`（DRY・マジックナンバー）** —— 新しい寸法（境目の掴み代、列ごとの既定の幅）はすべて 表 T-206 の行にする（E-12）。値の無い行（`S-425`・`S-428`）には値を入れる（問い 1）。
- **`R2.14`（POLA）** —— 列の幅は、字を打つたびに作り直す表（`SV-5`）で動いてはならない ⇒ 中身に合わせて自動で決めず、列ごとの既定の幅から始めて人が変えたときだけ変える（決定 3）。
- **`R4.3`（中間の不正な状態）** —— 飛ぶと、シェルは選択を動かし（`objectsPicked`）、続けて `propertiesOfChoiceAsked` を送る。本書の後は後者を送らない —— パネルの状態は選択が動いたことへの 表 T-280 の升だけで決まり、飛ぶことが別の道でパネルを動かさない（5 節）。
- **`R4.4`（状態遷移表）** —— 表 T-280 は変えない。`propertiesPanelContentStateMachine` の升（`selectionMoved` と `propertiesOfChoiceAsked`）を読み、`hidden` × `selectionMoved` は「—」（閉じたまま）、`selectionDisplayed` × `selectionMoved` は中身を書き換える、を確かめた（`docs/spec/_source/state-machines.json:2051`〜`:2089`）。
- **`R2.9`（YAGNI）** —— 列の幅を 2 度押しで中身に合わせる手立て・上限の設定値・列の並べ替え（ドラッグで列を動かす）は、利用者が求めていない ⇒ 足さない（10 節）。

### ③ 利用者に問わずに決めたこと

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| 決定 1 | **`SJ-4` から「プロパティパネルに出す」を消し、「飛ぶことを理由にパネルを出したり閉じたりしてはならない（MUST NOT）」と書く。** 出ているパネルの中身は 表 T-280 の `selectionMoved` の升に任せる（E-04） | `JDG-877` の逐語は開閉だけを言う。中身の規則は既に 表 T-280 にある（`R1.3`）。⚠️ 設定を出しているあいだに選択が動いたとき（`documentSettingsDisplayed` × `selectionMoved`）は `DFC-706` が未決のまま —— 本書は決めない | 設定を出しているパネルで飛ぶと、出る中身は `DFC-706` の答え次第（今の升は「—」、設定のまま） |
| 決定 2 | **列の幅は画面だけの値とし、閉じても同じ画面のあいだ覚え、文書に保存しない。** 置き場は `S-420` の行に足し（新しい行を立てない）、`SV-14` と `FR-151` の MUST NOT の数え上げに「列の幅」を足す（E-01・E-02・E-10） | 0.2 節 4。`JDG-612`「大きさ・位置・フィルターはファイルに保存しない」。`S-435`（ヘルプ、閉じたら捨てる）は別の UI パーツの先例 | 開き直すと前の幅で出る —— 既定へ戻す手立ては、ページを開き直すことだけ |
| 決定 3 | **列の幅は 表 T-331 の列ごとに持ち、既定は列ごとの設定値の行**（`S-<新2>` 〜 `S-<新10>`、`SQ-1` 〜 `SQ-9` の順）。**表は列の幅を足した幅で組む**（E-03・E-12） | 0.2 節 1。中身に合わせて決めると、1 文字打つたびに列が動く（`SV-5`、`R2.14`）。1 つの幅を全列に使うと、日付（見本 110px）と階層（見本 380px）のどちらかが合わない | 設定値の行が 9 つ増える |
| 決定 4 | **境目を、表を出している領域の右の縁より右へ引いてはならない（MUST NOT）**（E-03） | `R1.4` (a)。固定した列（`SV-6`、`JDG-614`）は横に送っても動かないので、境目が領域の外へ出ると掴む所が無くなる | パネルを後から狭めると固定した列の境目が外へ出うる —— そのときは広げるか最大化（`SV-13`）で戻る |
| 決定 5 | **境目の掴み代は、見出しの行の各列の右の境目に重ね、境目の左右に同じ幅ずつ敷く**（`GR-<新1>`、`S-<新1>`）。表 T-023d の順は `GR-25` の後・`GR-22` の前（E-06） | `JDG-633` の 2（縁の内と外に同じ幅）。パネルは日程の上に浮くので、パネルの中の掴みは `GR-22` より上に立つ（`GR-24`・`GR-25` と同じ理由）。縁と境目が重なるパネルの右の縁では、縁（大きさ変え）が勝つ | 見出しの行以外（本文の行）の境目は掴めない —— 表の道具のふつうの形 |
| 決定 6 | **境目の上のポインタは 表 T-269 の `PK-10`**（E-08） | 0.2 節 5 の先例。`JDG-877` の「マウスカーソルもWindows標準の形に合わせる」の向きとも揃う（縁と角の形は `CR-621` の持ち物） | 無い |
| 決定 7 | **見出しのセルでは `IC-122` を切らず、入らない分は見出しの語から切る。`S-425` は `IC-122` が入る幅とする**（E-03・E-11） | `R1.4` (b)。`SV-7`「どの列の見出しにも `IC-122` を置き」 | 狭い列では見出しの語がほとんど読めない —— 押せば絞り込みは開く |
| 決定 8 | **幅は画面の px とし、字の段（`S-429`）と表示の倍率（`S-234`）で変えない**（E-03） | `SV-16` の罫と字の扱い（「表示の倍率（`S-234`）を掛けない」）と同じ。字の段で幅が動くと、人が合わせた幅が黙って変わる | 字を 20px にすると切れる字が増える —— 人が境目で広げる |
| 決定 9 | **`SJ-6` は、飛ぶ先がタスクで、表 T-038 が左へ数える占有が日付より左へ出ているとき、日付ではなくその左端を `S-428` の所へ置く**（E-05） | `JDG-877` の「左上で担当者名や進捗が表示できるように」。担当と完了率の札は 表 T-038 の `OC-2` が「表示しているときだけ算入」するので、札を出す表示でだけ効き、出さない表示では今と同じ日付の寄せになる。数え上げを 2 か所に置かない —— 占有に何を数えるかは 表 T-038 だけが持つ（同表の「2 か所で別々に数え上げてはならない（MUST NOT）」の考え方） | 期限の印（`OC-9`）や予定より早く始めた実績（`OC-5`）が左へ出ているタスクも、それが見える所へ寄る（日付は `S-428` より右に来る） |
| 決定 10 | 表 T-331 は書かない。列の既定の幅は 表 T-331 に列を足さず、表 T-206 の行に置く | 値は設定値の表に置く（規則 02・マジックナンバーの規則）。`CR-617` の E-12 と同じ表を触らずに済む | 無い |

⭐ 次の 1 つは問うて決めた（`DFC-1645` の問い、答えは `JDG-1096` の Q16）。問わずに決めた上の 10 と区別するために、ここに分けて置く。

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| 決定 11 | **列の絞り込みは、押した列の見出しのセルの下に、表の上に重ねるドロップダウンとして開く。見出しの語を押しても `IC-122` と同じく開く（列の境目の掴み代の上を除く）。幅は中身の幅で見出しのセルより狭くせず、表を出している領域からはみ出す分は領域の中へ寄せ、縦に入らない分は絞り込みの中を送る**（E-14） | `JDG-877`「表のヘッダー部分をクリックしてフィルターを設定可能とせよ。フィルターはExcel同様、ドロップダウン」と `JDG-1096` の Q16。位置と幅を見出しのセルと中身から決めれば、新しい設定値の行を起こさずに済む（`R2.9`・マジックナンバーの規則）。見出しの語を押して開くので、`IC-122` の小さな印を狙わずに済む | 見出しの語を押して並べ替える手（表計算ソフトの一部が持つ）は持たない —— 並べ替えは絞り込みの中の `IC-123`・`IC-124` のまま。開いた絞り込みは表の数行を覆う |

---

## 1. 範囲 —— 行き先

| 事項 | 仕様で変える所 | 編集 | 裁定を戻すとき |
|---|---|---|---|
| 列の幅を保存しない | `FR-151` の MUST NOT の数え上げ | E-01 | その 1 句 |
| 列の幅を覚える | 表 T-330 の `SV-14` の 3 文目 | E-02 | その 1 句 |
| 列の幅と省略（①②） | 表 T-330 の `SV-17` を書き直し、`SV-<新1>` を足す | E-03 | 2 行 |
| 飛んでもパネルの開閉を変えない（⑤） | 表 T-332 の `SJ-4` | E-04 | その行 |
| 飛ぶ先の札が左に見える（④） | 表 T-332 の `SJ-6` | E-05 | その行 |
| 境目の掴み | 表 T-023d に `GR-<新1>` を足す | E-06 | その行 |
| 境目も追従する | 表 T-023d の結びの `GR-24` / `GR-25` の文 | E-07 | その 1 文 |
| 境目のポインタ | `FR-106` の `PK-10` の文の後に 1 文 | E-08 | その 1 文 |
| 面が境目を答える | `05-07-design.md` の 表 T-065 の `IF-9` の最後の文 | E-09 | その文 |
| 覚える値の置き場 | `docs/spec/_source/settings.json` の `S-420` | E-10 | その行 |
| 列の幅の下限の値 | 同 `S-425` | E-11 | その行 |
| 寄せの入れ込みの値と新しい行 | 同 `S-428` と、その後ろの新しい 10 行 | E-12 | 11 行 |
| 公開エントリの説明 | `docs/spec/_source/published-entries.json` の `SearchPanelSession` | E-13 | その 1 行 |
| 絞り込みはドロップダウン（`DFC-1645`） | 表 T-330 の `SV-7` の 1 文目の後 | E-14（`JDG-1096` の Q16） | 足した 5 行 |

⭐ 生成物 `docs/spec/_assets/tbl-settings.md`・`docs/spec/_assets/tbl-published-entries.md`・`src/` の生成区画は `npm run gen` だけが書く。⛔ 手で書かない。`01-04-requirements.md` と `05-07-design.md` は手書きの仕様である（`CR-615` が同じ 2 つを直に書いた）。

## 2. 新しい識別子

⚠️ **どれも仮番である。** 当てる時に、仕様の波のセッションが今の木を測り直して本番を振り、本書の中の仮番を 1 回で置き換える（規則 02 の 2.5）。接頭辞は足さない —— どれも既にある表の既にある接頭辞に 1 行ずつ足す。

| 仮番 | 表 | 何か |
|---|---|---|
| `SV-<新1>` | 表 T-330 | 列の幅 |
| `GR-<新1>` | 表 T-023d | `Search Panel` の列の境目 |
| `S-<新1>` | 表 T-206 | 検索の表の列の境目を掴める幅 |
| `S-<新2>` 〜 `S-<新10>` | 表 T-206 | 検索の表の列の既定の幅（`SQ-1` 〜 `SQ-9` の順に 1 行ずつ） |

⭐ 要求（`FR-`）・表・図・辞書の語は足さない。

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

| 消すもの | 所（`bfbe7eb7`） | 置き換わる先 | 編集 |
|---|---|---|---|
| 「列の幅の下限は `S-425`」（`SV-17`） | `docs/spec/01-04-requirements.md:4926` | 「列の幅は `SV-<新1>` に従う」。下限は `SV-<新1>` が言う | E-03 |
| 「、プロパティパネルに出す（`_assets/tbl-settings.md` の `S-99h`）」（`SJ-4`） | 同 `:4949` | MUST NOT「飛ぶことを理由に…出したり閉じたりしてはならない」 | E-04 |
| 値「未定 🔎」 | `docs/spec/_source/settings.json` の `S-425`（`:4821`〜）・`S-428`（`:4857`〜） | 64px 🔎 ・ 24px 🔎（問い 1 の推奨） | E-11・E-12 |
| 注「同上」だけ（`S-425`） | 同 `S-425` の `note` | 値の出どころと `IC-122` の幅 | E-11 |
| コードの「プロパティパネルに出す」 | `src/framework/single-html-shell/frame-loop.ts` の `jumpToSearchHit`（`:1284`〜`:1296`）の `showProperties` の引数と呼び出し、呼ぶ所 `:2997` | 9 節 | 実装する者 |
| コードの「日付を左端に入れ込み 0 で置く」 | `src/use-case/edit-document/search-jump.ts:65`〜`:67` | 9 節 | 実装する者 |
| 試験の「飛ぶとパネルが出る」 | `tests/system/cr-597-the-search-panel-word-jump-and-grab.test.ts:41`・`:315`・`:426` | 8 節の波 2 | 実装する者 |
| コードの、絞り込みを語の欄と表のあいだの帯に開く描き方 | `src/framework/dom-screen-surface/search-panel-drawing.ts` の `FILTER_MENU_STYLE`（`DFC-1645`） | 押した見出しの下のドロップダウン（E-14） | 9 節 |
| 試験の「`GR-22` の上は 3 行だけ」 | `tests/unit/cr-408-the-property-panel-wraps-and-its-edge-can-be-held.test.ts:77`〜`:79` | 8 節の波 1 | 当てる体 |

## 4. 書き直す所（当てる体がそのまま使う文）

⛔ 作法: 旧がそのファイルに 1 回だけ現れることを数えてから置き換える（改行は LF に揃えて数える。4 ファイルとも `bfbe7eb7` では LF だけ）。旧は行の一部であってよい —— そのときは旧の文字列だけを新の文字列に置き換え、行の残りは触らない。仮番（`<新n>`）は、当てる時に本番へ置き換えてから書く。

<!-- EDIT id=E-01 file=docs/spec/01-04-requirements.md -->
旧
```text
⛔ パネルの表示・位置・大きさ・語・絞り込み・並べ替えを文書に保存してはならない（MUST NOT）
```
新
```text
⛔ パネルの表示・位置・大きさ・語・絞り込み・並べ替え・列の幅を文書に保存してはならない（MUST NOT）
```

<!-- EDIT id=E-02 file=docs/spec/01-04-requirements.md -->
旧
```text
語・表の切り替え・絞り込み・並べ替え・位置・大きさは、同じ画面のあいだ覚え、開き直したときに戻す
```
新
```text
語・表の切り替え・絞り込み・並べ替え・列の幅・位置・大きさは、同じ画面のあいだ覚え、開き直したときに戻す
```

<!-- EDIT id=E-03 file=docs/spec/01-04-requirements.md -->
旧
```text
| SV-17 | 行と列の寸法 | 表の行の高さは `S-427`、列の幅の下限は `S-425`。<br>セルの字は折り返さず、入らない分を省略記号で切る。<br>本文の改行は空白 1 つにする |
```
新
```text
| SV-17 | 行と列の寸法 | 表の行の高さは `S-427`。<br>列の幅は `SV-<新1>` に従う。<br>セルの字は折り返さず、入らない分を省略記号で切る。<br>本文の改行は空白 1 つにする |
| SV-<新1> | 列の幅 | 列の幅は 表 T-331 の列ごとに持つ。<br>既定は `_assets/tbl-settings.md` の 表 T-206 の `S-<新2>` 〜 `S-<新10>`（`SQ-1` 〜 `SQ-9` の順）。<br>表は列の幅を足した幅で組み、パネルより広ければ横に送る（`SV-6`）。<br>見出しの行の、各列の右の境目（表 T-023d の `GR-<新1>`）を握って左右へ引くと、その境目の左の列の幅を変える —— ほかの列の幅は変えず、右の列はその分だけ動く。<br>握っているあいだ、列の幅をポインタに追従させること（MUST）。<br>幅が決まるのは離した時点、中断では元の幅へ戻す（表 T-028 の `IN-1`、`SV-10` と同じ）。<br>幅の下限は `S-425`。<br>境目を、表を出している領域の右の縁より右へ引いてはならない（MUST NOT） —— 固定した列（`SV-6`）の境目が領域の外へ出ると、送っても見えず、掴む所が無くなる。<br>幅は画面の px であり、字の段（`S-429`）と表示の倍率（`S-234`）で変えない。<br>見出しのセルでは `IC-122` を切らず、入らない分は見出しの語から切る（`SV-7`） |
```

<!-- EDIT id=E-04 file=docs/spec/01-04-requirements.md -->
旧
```text
| SJ-4 | 選ぶ | 飛ぶ先のタスクかコメントボックスを選び（表 T-023c の `SL-1`）、プロパティパネルに出す（`_assets/tbl-settings.md` の `S-99h`）。<br>取り消しの記録には載せない（`UN-9`） |
```
新
```text
| SJ-4 | 選ぶ | 飛ぶ先のタスクかコメントボックスを選ぶ（表 T-023c の `SL-1`）。<br>取り消しの記録には載せない（`UN-9`）。<br>飛ぶことを理由に、プロパティパネル（`_assets/tbl-settings.md` の `S-99h`）を出したり閉じたりしてはならない（MUST NOT） —— 閉じていれば閉じたまま、出ていれば出たままとし、出ている中身は選択が動いたときの規則（`_assets/tbl-state-machines.md` の 表 T-280 の `propertiesPanelContentStateMachine` の `selectionMoved`）に従う（`FR-072`） |
```

<!-- EDIT id=E-05 file=docs/spec/01-04-requirements.md -->
旧
```text
| SJ-6 | 横 | 倍率を変えない。<br>飛ぶ先の日付（タスクは `AT-28`、コメントボックスは `AT-113`）が、表示の左端から `S-428` だけ内側に来るよう `S-77` を置く。<br>日付が空なら横は動かさない |
```
新
```text
| SJ-6 | 横 | 倍率を変えない。<br>飛ぶ先の日付（タスクは `AT-28`、コメントボックスは `AT-113`）が、表示の左端から `S-428` だけ内側に来るよう `S-77` を置く。<br>⭐ ただし飛ぶ先がタスクで、表 T-038 が左へ数える占有（担当と完了率の札 `OC-2` ほか）が日付より左へ出ているときは、日付ではなくその占有の左端が表示の左端から `S-428` だけ内側に来るよう置く —— 担当者名や完了率を出す表示で飛んでも、札が表示の左で切れない。<br>日付が空なら横は動かさない |
```

<!-- EDIT id=E-06 file=docs/spec/01-04-requirements.md -->
旧
```text
| GR-22 | `Panel Divider` の掴み帯 | **パネルの境界に重ねて敷く帯**（幅は `_assets/tbl-settings.md` の 表 T-206 の `S-134`）。<br>⭐ プロパティパネルの側は、パネルを出しているあいだだけ（`FR-052`） | 掴めば行見出しパネルかプロパティパネルの幅を変える（`FR-052`）。<br>⚠️ **帯の下に何が描かれていても帯が勝つ** —— 縦の `Scrollbars` の帯（`FR-051` がプロパティパネルの左端に接して置く）とパネルは、それぞれ帯の片側に重なる。<br>⛔ 帯の幅のうち、押しても帯に届かない所を残してはならない（MUST NOT） —— 残すと掴める幅が帯の幅より狭くなり、どこを押せば掴めるのかが読めない |
```
新
```text
| GR-<新1> | `Search Panel` の列の境目 | 表の見出しの行の、各列の右の境目に重ねて、境目の左右に同じ `_assets/tbl-settings.md` の `S-<新1>` の幅ずつ敷く | 掴めば境目の左の列の幅を変える（`FR-151` の 表 T-330 の `SV-<新1>`）。<br>⚠️ 入口（`IC-122`）の上では入口が答える（`05-07-design.md` の 表 T-065 の `IF-9`） |
| GR-22 | `Panel Divider` の掴み帯 | **パネルの境界に重ねて敷く帯**（幅は `_assets/tbl-settings.md` の 表 T-206 の `S-134`）。<br>⭐ プロパティパネルの側は、パネルを出しているあいだだけ（`FR-052`） | 掴めば行見出しパネルかプロパティパネルの幅を変える（`FR-052`）。<br>⚠️ **帯の下に何が描かれていても帯が勝つ** —— 縦の `Scrollbars` の帯（`FR-051` がプロパティパネルの左端に接して置く）とパネルは、それぞれ帯の片側に重なる。<br>⛔ 帯の幅のうち、押しても帯に届かない所を残してはならない（MUST NOT） —— 残すと掴める幅が帯の幅より狭くなり、どこを押せば掴めるのかが読めない |
```

<!-- EDIT id=E-07 file=docs/spec/01-04-requirements.md -->
旧
```text
⚠️ `GR-24` / `GR-25` は、`FR-151` の 表 T-330 の `SV-10` / `SV-11` が追従を同じ MUST で既に求めている。
```
新
```text
⚠️ `GR-24` / `GR-25` / `GR-<新1>` は、`FR-151` の 表 T-330 の `SV-10` / `SV-11` / `SV-<新1>` が追従を同じ MUST で既に求めている。
```

<!-- EDIT id=E-08 file=docs/spec/01-04-requirements.md -->
旧（行末の空白 2 つは旧にも新にも含めない —— 旧の後ろに残る）
```text
⭐ 基準日線の掴み代（表 T-023d の `GR-16`）と、パネルの境界の掴み帯（同表の `GR-22`）では、表 T-269 の `PK-10` とすること（MUST） —— どちらも縦の線を左右へ動かす操作であり、同じ形が同じ動きを示す。
```
新（1 行目の末尾に空白 2 つを置く —— 次の行の前の改行を Markdown の改行にする）
```text
⭐ 基準日線の掴み代（表 T-023d の `GR-16`）と、パネルの境界の掴み帯（同表の `GR-22`）では、表 T-269 の `PK-10` とすること（MUST） —— どちらも縦の線を左右へ動かす操作であり、同じ形が同じ動きを示す。  
⭐ 検索パネルの列の境目（表 T-023d の `GR-<新1>`）でも、表 T-269 の `PK-10` とすること（MUST） —— 列の境目も縦の線を左右へ動かす操作である。
```

<!-- EDIT id=E-09 file=docs/spec/05-07-design.md -->
旧
```text
⚠️ 帯と縁が重なる所では 表 T-023d の順で 1 つだけを答え、入口の上では入口だけを答える —— `GR-24` は入口の載っていない所である
```
新
```text
⚠️ 帯と縁と列の境目が重なる所では 表 T-023d の順で 1 つだけを答え、入口の上では入口だけを答える —— `GR-24` は入口の載っていない所である。<br>⭐ 2 つ目の掴み領域には、見出しの帯と縁のほかに、表の見出しの行の列の境目（表 T-023d の `GR-<新1>`）がある —— 境目の上では、その境目の左の列（`FR-151` の 表 T-331 の行）まで答える。<br>`SV-<新1>` は境目の左の列の幅を変えるので、列を名乗らないと、どの列の幅を変えるかを決められない
```

<!-- EDIT id=E-10 file=docs/spec/_source/settings.json -->
旧
```text
     "id": "S-420",
     "value": {
      "ja": "検索パネルの語・出している表・列の絞り込み・並べ替え（`FR-151`）"
     },
     "default": {
      "ja": "空・タスクの表・絞り込み無し・既定の並び"
     },
```
新
```text
     "id": "S-420",
     "value": {
      "ja": "検索パネルの語・出している表・列の絞り込み・並べ替え・列の幅（`FR-151`）"
     },
     "default": {
      "ja": "空・タスクの表・絞り込み無し・既定の並び・列ごとの既定の幅（`S-<新2>` 〜 `S-<新10>`）"
     },
```

<!-- EDIT id=E-11 file=docs/spec/_source/settings.json -->
問い 1 の推奨で書いた。
旧
```text
     "id": "S-425",
     "value": {
      "ja": "検索の表の列の幅の下限（`SV-17`）"
     },
     "default": {
      "ja": "未定 🔎"
     },
     "note": {
      "ja": "同上"
     }
```
新
```text
     "id": "S-425",
     "value": {
      "ja": "検索の表の列の幅の下限（`FR-151` の 表 T-330 の `SV-<新1>`）"
     },
     "default": {
      "num": "64",
      "suffix": "px",
      "mark": "🔎"
     },
     "note": {
      "ja": "同上。⭐ 値は触れる見本（`previous-project-result/18-search-panel-sample/`）の初めの値である。⚠️ 見出しのセルの `IC-122` が入る幅であること（`SV-<新1>`）。⛔ **測って決めた値ではない** （🔎）"
     }
```

<!-- EDIT id=E-12 file=docs/spec/_source/settings.json -->
問い 1 の推奨で書いた。
旧
```text
     "id": "S-428",
     "value": {
      "ja": "飛んだ先の日付と表示の左端のあいだ（画面の px、表 T-332 の `SJ-6`）"
     },
     "default": {
      "ja": "未定 🔎"
     },
     "note": {
      "ja": "同上。⚠️ 画面の px であり、倍率で変わらない"
     }
    },
```
新
```text
     "id": "S-428",
     "value": {
      "ja": "飛んだ先の左端（日付、または日付より左へ出た占有の左端）と表示の左端のあいだ（画面の px、表 T-332 の `SJ-6`）"
     },
     "default": {
      "num": "24",
      "suffix": "px",
      "mark": "🔎"
     },
     "note": {
      "ja": "同上。⚠️ 画面の px であり、倍率で変わらない。⭐ 値は触れる見本（`previous-project-result/18-search-panel-sample/`）の初めの値である。⛔ **測って決めた値ではない** （🔎）"
     }
    },
    {
     "id": "S-<新1>",
     "value": {
      "ja": "検索の表の列の境目を掴める幅（境目の左右のそれぞれ、表 T-023d の `GR-<新1>`）"
     },
     "default": {
      "num": "6",
      "suffix": "px",
      "mark": "🔎",
      "prefix": {
       "ja": "境目の左右に "
      }
     },
     "note": {
      "ja": "検索パネルの見せ方であり、日程の内容ではないので保存しない。⭐ 性質は `S-137`（基準日線の掴み代）と同じ —— 縦の線を左右へ動かす掴み代である（`FR-106` の `PK-10`）。⛔ `S-137` を継がない —— 片方を選び直しても、もう一方は動かない。左右は同じ値（`JDG-633`）。⛔ **測って決めた値ではない** （🔎）"
     }
    },
    {
     "id": "S-<新2>",
     "value": {
      "ja": "検索の表の列の既定の幅 —— `FR-151` の 表 T-331 の `SQ-1`（タスク（マイルストーン））"
     },
     "default": {
      "num": "250",
      "suffix": "px",
      "mark": "🔎"
     },
     "note": {
      "ja": "検索パネルの見せ方であり、日程の内容ではないので保存しない。⭐ 値は触れる見本（`previous-project-result/18-search-panel-sample/`）の初めの値である。⚠️ `S-425` を割らないこと。⛔ **測って決めた値ではない** （🔎）"
     }
    },
    {
     "id": "S-<新3>",
     "value": {
      "ja": "同 —— `SQ-2`（担当者名）"
     },
     "default": {
      "num": "190",
      "suffix": "px",
      "mark": "🔎"
     },
     "note": {
      "ja": "同上"
     }
    },
    {
     "id": "S-<新4>",
     "value": {
      "ja": "同 —— `SQ-3`（予定開始）"
     },
     "default": {
      "num": "110",
      "suffix": "px",
      "mark": "🔎"
     },
     "note": {
      "ja": "同上"
     }
    },
    {
     "id": "S-<新5>",
     "value": {
      "ja": "同 —— `SQ-4`（予定終了）"
     },
     "default": {
      "num": "110",
      "suffix": "px",
      "mark": "🔎"
     },
     "note": {
      "ja": "同上"
     }
    },
    {
     "id": "S-<新6>",
     "value": {
      "ja": "同 —— `SQ-5`（状態）"
     },
     "default": {
      "num": "150",
      "suffix": "px",
      "mark": "🔎"
     },
     "note": {
      "ja": "同上"
     }
    },
    {
     "id": "S-<新7>",
     "value": {
      "ja": "同 —— `SQ-6`（最上位までの階層）"
     },
     "default": {
      "num": "380",
      "suffix": "px",
      "mark": "🔎"
     },
     "note": {
      "ja": "同上"
     }
    },
    {
     "id": "S-<新8>",
     "value": {
      "ja": "同 —— `SQ-7`（本文）"
     },
     "default": {
      "num": "300",
      "suffix": "px",
      "mark": "🔎"
     },
     "note": {
      "ja": "同上"
     }
    },
    {
     "id": "S-<新9>",
     "value": {
      "ja": "同 —— `SQ-8`（行タイトル）"
     },
     "default": {
      "num": "240",
      "suffix": "px",
      "mark": "🔎"
     },
     "note": {
      "ja": "同上"
     }
    },
    {
     "id": "S-<新10>",
     "value": {
      "ja": "同 —— `SQ-9`（日付）"
     },
     "default": {
      "num": "110",
      "suffix": "px",
      "mark": "🔎"
     },
     "note": {
      "ja": "同上"
     }
    },
```

<!-- EDIT id=E-13 file=docs/spec/_source/published-entries.json -->
旧
```text
"`Search Panel` の値 —— 語・表・絞り込み・並べ替え・位置・大きさ・字の大きさの段（`FR-151` の 表 T-330、`S-429`）"
```
新
```text
"`Search Panel` の値 —— 語・表・絞り込み・並べ替え・列の幅・位置・大きさ・字の大きさの段（`FR-151` の 表 T-330、`S-429`）"
```

⭐ `settings.schema.json` が新しい行の形を検める（`num`・`suffix`・`mark`・`prefix` は `S-137`・`S-436` が既に使う形）。⚠️ 仮番の `S-<新n>` のままでは形の検査に通らない —— 本番に置き換えてから `npm run gen`。

<!-- EDIT id=E-14 file=docs/spec/01-04-requirements.md -->
`JDG-1096` の Q16（`DFC-1645`）で書いた（決定 11）。表 T-330 の `SV-7` の 1 文目の後に 5 行を足す（行の残りは変えない）。⚠️ `GR-<新1>` は本書の E-06 の仮番 —— E-06 と同じ回に本番へ置き換える。旧（`8b4b7907` で 1 回）
```text
| SV-7 | 列の絞り込み | どの列の見出しにも `IC-122` を置き、押すと絞り込みを開く。<br>
```
新
```text
| SV-7 | 列の絞り込み | どの列の見出しにも `IC-122` を置き、押すと絞り込みを開く。<br>見出しのセルの語を押したときも、`IC-122` を押したものとして同じ絞り込みを開くこと（MUST） —— ただし列の境目の掴み代（表 T-023d の `GR-<新1>`）の上では掴み代が答える（`05-07-design.md` の 表 T-065 の `IF-9`）。<br>絞り込みは、押した列の見出しのセルの下に、表の上に重ねるドロップダウンとして開くこと（MUST） —— 左端を見出しのセルの左端に、上端を見出しの行の下端にそろえる。<br>幅は中身の幅とし、見出しのセルの幅より狭くしない。<br>表を出している領域の右か下に出る分は領域の中へ寄せ、それでも縦に入らない分は絞り込みの中を縦に送る。<br>⛔ 絞り込みを、語の欄と表のあいだの帯として開いてはならない（MUST NOT） —— 開いた列と絞り込みが離れ、どの列の絞り込みかを位置で読めない（利用者が「Excel同様、ドロップダウン」と定めた）。<br>
```

### 4.1 重なり

`change-request/CR-603` 〜 `CR-620` の 1 〜 10 行目と本文を、本書の編集する行・升・値（`FR-151`・`SV-14`・`SV-17`・`SJ-4`・`SJ-6`・`GR-22`・`GR-25`・`PK-10`・`FR-106`・`IF-9`・`S-420`・`S-425`・`S-428`・`SearchPanelSession`・表 T-330・表 T-332）で引いた（13 節）。

| 相手 | 重なる所 | 先に当たる側 | 数え直す側 |
|---|---|---|---|
| `CR-621`（窓の枠、兄弟の起草。読めない） | 見込み: 表 T-023d の `GR-25` の行とその結び（E-07 の文）、`FR-106` のポインタの文（E-08 の旧の近く）、`IF-9` の縁の文（E-09 の旧の近く）、`S-426` | `CR-621` | 本書。E-07・E-08・E-09 の旧を `CR-621` の後の木で数え直す。⭐ 本書の差分は小さい —— E-07 は「/ `GR-<新1>`」「/ `SV-<新1>`」を挟むだけ、E-08 は 1 文を足すだけ、E-09 は「帯と縁が」を「帯と縁と列の境目が」にして 2 文を足すだけ。⚠️ `CR-621` が `GR-25` の行を窓の共通の行へ移すなら、E-06 の挿し込み先（`GR-25` の次・`GR-22` の前）はその新しい行の次にする。⚠️ `S-426` の注は「同上」であり、E-11 の後は `S-425` の新しい注を継いで読める —— `S-426` に値を与える `CR-621` が注を書き下すこと（`CR-621` が書く） |
| `CR-630`（Esc の段、兄弟の起草。読めない） | 見込み: `SV-14` の 1 文目（焦点によらず `Esc` で閉じる） | `CR-630` | 本書。E-02 の旧は `SV-14` の 3 文目だけなので、1 文目が変わっても 1 回のまま残るはず —— 数え直すだけ |
| `CR-617`（遅延診断レポート、起草。⛔ 遅延診断は本書の外） | 同書の E-12 は 表 T-331 の `SQ-3`・`SQ-9` の「書き方」の升を書く。本書は 表 T-331 を書かない（決定 10） ⇒ 升は重ならない。⚠️ ただし同書の窓は「表 T-330 の行のうち、本表に無いものはそのまま当てる」ので、本書の `SV-<新1>` はレポートの窓にも当たる —— レポートの表の列には既定の幅の行が無い（`S-<新2>` 〜 `S-<新10>` は 表 T-331 の列だけ）。⇒ 調整役へ: 遅延診断を当てる時に、レポートの列の既定の幅を同書が持つか、`SV-<新1>` をレポートに当てないかを決める | どちらでも | 触れない（記録だけ） |
| `CR-609`（プロパティパネル、起草） | 表 T-280 の `settingsEntryPressed` の 3 升と `returnSubject`。本書は 表 T-280 を書かない。コードは両書とも `frame-loop.ts` を触る —— 同書は `settingsEntryEventsOf`・`propertiesPanelKept`・`showPropertiesOfChoice` の 1 行、本書は `jumpToSearchHit` とその呼ぶ所 | どちらでも | 実装の体が関数の名で引く（行番号は動く） |
| `CR-615`（着地） | 表 T-023d の結びの `GR-24` / `GR-25` の文（E-07 の旧）は同書が書いた —— 本書はその新の上に載る | 済み | ― |
| `CR-605`・`CR-606`・`CR-607`・`CR-613` | `FR-151`・`U-64`・`IC-123`/`IC-124` を指すだけか、表 T-109 の行を書く。本書の旧のどれも含まない | ― | ― |

## 5. 継ぎ目 —— 両側の依頼文にこのまま写すこと

```
SEAM (verbatim in the implementer's and the tester's brief)
Ids are the landed numbers of CR-629's SV-<new1>, GR-<new1>, S-<new1>..S-<new10>.

Column widths (SV-<new1>, SV-17, S-420, S-425, S-<new2>..S-<new10>)
- SearchPanelSession gains `columnWidths: Readonly<Record<SearchColumn, number>>`
  keyed by the table T-331 row id ('SQ-1' .. 'SQ-9'), screen px. A missing key
  means the default row of that column (S-<new2>..S-<new10>, in SQ order).
  emptySearchPanelSession.columnWidths is {}. Kept while the panel is closed
  (SV-14); never written to the document (FR-151 MUST NOT).
- Every column of SearchPanelView carries its width in px. The drawn table is
  laid out at exactly those widths (table width = their sum); a cell whose text
  does not fit ends in an ellipsis; a heading cell keeps IC-122 whole and cuts
  only the heading word. Widths do not follow S-429 nor S-234.
- ScreenPart.searchPanelGrab gains region 'columnBorder' with `column` (the SQ
  id of the column LEFT of the border) and that column's drawn width at the
  press, riding on the answer as panelBox does. It is answered on the heading
  row only, within S-<new1> px on either side of each column's right border.
  Order: an entrance alone > GR-24 > GR-25 > columnBorder (table T-023d).
- While held: width = min(max(width at press + dx, S-425), visible table box
  right - column left). Settled on release (IN-1); an interrupted drag puts the
  width at press back. Other columns keep their widths.
- Pointer over the band and while held: PK-10 (`col-resize`).
- S-425, S-<new1>..S-<new10> reach src only through a generated constant
  (tools/generate_entity_types.py lists them); never a literal.

Jump, horizontal (SJ-6, S-428)
- searchJumpWrites(document, target, hasRoomBelowPins, reach) with
  reach: { readonly pxPerDay: number; readonly leftReachPx: number }.
  leftReachPx = how far, in screen px, the target task's table T-038
  occupancy extends left of the x of its AT-28 (0 when nothing extends left,
  0 for a comment box). The written S-77 (scrollDate + scrollDayOffset) puts
  (date x - leftReachPx) at (view left + S-428). No date: horizontal untouched.
  The zoom is never written. AM-16 (SJ-9) passes the same reach.
- S-428 reaches the code only through a generated constant; never a literal.

Column filter as a drop-down (SV-7, DFC-1645, JDG-1096 Q16)
- Pressing IC-122 OR the heading word of a column (anywhere on the heading
  cell except the GR-<new1> border band) opens that column's filter. The
  surface answers the heading word as IC-122 of that column (IF-9).
- The filter is drawn ON TOP of the table, left edge = the pressed heading
  cell's left edge, top edge = the heading row's bottom edge; width = its
  content, never narrower than the heading cell; pushed back inside the
  visible table box when it would leave it; scrolls inside when too tall.
  Never as a band between the word field and the table. One open at a time
  and Esc closes it first (SV-14) -- unchanged. No new setting row.

Jump and the Properties Panel (SJ-4)
- The jump sends searchHitJumped and objectsPicked, and NOTHING that asks the
  panel to show: no propertiesOfChoiceAsked. A hidden panel stays hidden. A
  shown panel follows table T-280 selectionMoved as it stands (DFC-706, the
  documentSettingsDisplayed cell, stays open and is not decided here).
- Composes with CR-609: that change rewrites only the settingsEntryPressed
  cells and drops returnSubject; neither touches selectionMoved nor the jump.
```

## 6. グラフ（`bfbe7eb7`）

- `impact.py FR-151 SV-6 SV-7 SV-17 SJ-4 SJ-6 S-425 S-428 T-331`:
  - `FR-151` を指す要求 7 件・参照 46 か所（`FR-009`:2834（`EL-21`）、`FR-016`:3935・3947・3969・3970・4069、`FR-070`:5002（`SK-24`）、`FR-098`:5290、`FR-029`:7252（`EN-6`）、`FR-076`:7398（`RS-66`）、`FR-040`:7787・7790（`IN-4`・`IN-5a`）、5.3 節の 5 か所（`UT-2`・`UT-7`・`UT-13`・`UF-180`/`UF-181`・`IF-9`）、`tbl-glossary.md` の `U-64`・`AM-25`・`AM-16` と名簿 11 行、公開エントリ 6 行、設定値 8 行、状態機械 `searchPanelDisplayStateMachine`）。
  - `SV-6`: 指す所 0。`SV-7`: `FR-040`:7790・5.3 の 3 か所・公開エントリ 1。`SV-17`: `S-425`・`S-427`。`SJ-4`: `SJ-8`・`SJ-9`。`SJ-6`: `SJ-7`・`SJ-8`・`S-428`。`S-425`: `SV-17`。`S-428`: `SJ-6`。
  - 表 T-331: `FR-151` の 1 要求、2 次 7 件（上と同じ）、5.3 の 2 か所と `AM-25`。
- `induced.py FR-151 SV-6 SV-7 SV-17 SJ-4 SJ-6 S-425 S-428 T-331`: 種 9/9、種の中の辺 5、閉路 2 —— `S-425`↔`SV-17`、`S-428`↔`SJ-6`（値の行とその規則を持つ行の作法の閉路）。⭐ どちらも両方の頂点を本書が書くので、1 つの波で一緒に書く（E-03 と E-11、E-05 と E-12 —— 8 節の波 1）。
- ⭐ 届いた先を 1 つずつ読んだ（偽になりうるもの）:
  - `SJ-8`「`SJ-2` と `SJ-4` は行う」—— 真のまま（選ぶことは残る）。`SJ-9`「ただし `SJ-4` を行わず、パネルに触れず」—— 真のまま（`Agent API` は選ばない。「パネル」は検索パネル）。`SJ-7`「`SJ-6` だけを行う」—— 真のまま。
  - `FR-072`（`01-04-requirements.md:1950`〜）の「⛔ 表 T-023c の選択が動いたことだけを理由に、パネルを出し始めてはならない（MUST NOT）—— 出すのは、出すことを求める要求が名指した押下のときだけである（MUST）。」「⛔ その入口を本要求が数え上げてはならない（MUST NOT）」—— E-04 の後、`SJ-4` は名指す押下から外れるだけで、`FR-072` の文は真のまま。
  - `IN-4`（`FR-040`:7787）の検索パネルの段・`SV-14` の 1 文目 —— 本書は触れない（`CR-630`）。
  - 5.3 の `UF-180`（「中身 —— 見出しの行・入力欄・出している表とその固定」）・`UF-182`（「固定した見出しと列、絞り込み、見出しの帯と縁の掴み」）・`UF-179`（「表示を寄せる書き込みを、表 T-332 に従って作る」）—— 列の幅は「出している表」と「列」の中にあり、寄せは 表 T-332 のまま ⇒ 真のまま、書き換えない。⚠️ `UF-182` の「見出しの帯と縁の掴み」は列の境目を数えていないが、責務文は総和ではなく要約である（`R2.2b`）—— 書き足さない。
  - `IF-9`（`05-07-design.md:614`）—— 「2 つ目は…帯（`GR-24`）の上か縁（`GR-25`）の上か」は、境目を答えないと `SV-<新1>` が果たせない ⇒ E-09。
  - 表 T-023d の結び（`:4059`〜`:4072`）—— 「⛔ 追従しない行を残してはならない（MUST NOT）」は、新しい行を誰かが名指すことを求める ⇒ E-07。書き込みの禁止の文（「日程の形（`GR-23`）・`GR-14`・`GR-16`・`GR-21` を掴んでいるあいだ値を文書へ書いてはならない」）は文書の値の話であり、列の幅は文書の値ではない ⇒ 足さない。
  - 表 T-038（`OC-2` ほか）・`FR-090`・`FR-003`・`FR-055` —— E-05 は表 T-038 を読むだけで、数え上げを変えない ⇒ 真のまま。
  - `U-64`・`AM-16`・`AM-25`・`EN-6`・`RS-66`・`EL-21`・`SK-24`・`MK-10` —— 列の幅にも開閉にも触れない ⇒ 真のまま。
- `rulings.md` を `SJ-4`・`SJ-6`・`S-425`・`S-428`・`SV-17`・`SV-14`・`T-332`・`列の幅`・`列幅`・`PK-10`・`GR-22`・`IF-9`・`T-023d`・`OC-2`・`T-038` で引いた: 当たりは `JDG-877`（本書）。検索パネルの裁定 `JDG-610` 〜 `JDG-619`・`JDG-630` 〜 `JDG-634`・`JDG-646`・`JDG-647` を読み、`JDG-616` の括弧だけを覆す（0.1 節）。担当と完了率の札の裁定 `JDG-08`・`JDG-09`（札を 1 つに繋いで右寄せ、場所を空ける）は本書の寄せと食い違わない。⇒ 導いた条項（決定 1〜10）と食い違う裁定は 0。
- `pending-decisions.md` を `S-42`・`SJ-`・`検索パネル` で引いた: 当たり 0。

## 7. 数の予測（`bfbe7eb7`。当てた後に同じ数え方で突き合わせる）

| 数 | 前 → 後 | 理由 |
|---|---|---|
| tables | 差 0 | 表を足しも消しもしない |
| figures | 差 0 | 図に触れない |
| rows | ＋12 | 表 T-330 に `SV-<新1>` の 1、表 T-023d に `GR-<新1>` の 1、表 T-206 に `S-<新1>` 〜 `S-<新10>` の 10。ほかは升の中の文だけ |
| uids | 差 0 | 要求を足しも消しもしない |
| `（MUST）` の印（`01-04-requirements.md`） | ＋4 | `SV-<新1>` の「追従させること（MUST）」、`FR-106` の新しい 1 文、`SV-7` の 2 文（E-14、2026-10-01 に足した）。検査 39 のために試験が逐語で引く（8 節の波 4） |
| `（MUST NOT）` の印（同） | ＋3 | `SV-<新1>` の「右へ引いてはならない（MUST NOT）」、`SJ-4` の「出したり閉じたりしてはならない（MUST NOT）」、`SV-7` の「帯として開いてはならない（MUST NOT）」（E-14） |
| 表 T-206 の「未定 🔎」 | 6 → 4 | `S-425`・`S-428` が値を持つ（`S-423`・`S-424`・`S-426`・`S-427` は残る） |

## 8. 波 —— 持ち場で割る

| 波 | 持ち場 | 中身 | 体 | 毎フレーム |
|---|---|---|---|---|
| 0 | ― | `CR-621`・`CR-630` を当てた木で、E-02・E-06・E-07・E-08・E-09 の旧を数え直し、4.1 節の差分で載せ直す。仮番を本番へ置き換える | 当てる体 | ― |
| 1 | 仕様: `docs/spec/01-04-requirements.md`・`docs/spec/05-07-design.md`・`docs/spec/_source/settings.json`・`docs/spec/_source/published-entries.json`（E-01〜E-14）＋ `npm run gen`（調整役）＋ `tests/unit/cr-408-the-property-panel-wraps-and-its-edge-can-be-held.test.ts:77`〜`:79` | ⚠️ cr-408 の試験は「表 T-023d で `GR-22` の上は `GR-19`・`GR-24`・`GR-25` だけ」を仕様から読む ⇒ E-06 と同じ波で `GR-<新1>` を加えた 4 行へ直す（名も「GR-19, GR-24, GR-25 and GR-<新1>」へ）。`tests/unit/t-023d-follows-the-pointer.test.ts` は E-07 の文から行を数えるので、E-07 と一緒なら緑のまま | 当てる体（L4 の後） | いいえ —— 文書だけ |
| 2 | ⛔ L4（`frame-loop.ts`・`search-jump.ts` は L4 の持ち物）。`src/use-case/edit-document/search-jump.ts`・`src/framework/single-html-shell/frame-loop.ts`（`jumpToSearchHit` と呼ぶ所）・`src/adapter/agent-api-endpoint/agent-api-members.ts`（`:751`〜`:753`）・`tools/generate_entity_types.py`（新しい行を群に足す —— 波 3 の分も一緒に）＋ `tests/contract/cr-571-search-jump.contract.test.ts`（`searchJumpWrites` の 10 か所の呼び方と `:232`〜`:233` の注）＋ `tests/system/cr-597-the-search-panel-word-jump-and-grab.test.ts`（`:41`・`:315`・`:426`） | ④⑤: 寄せる点を占有の左端へ、`S-428` を生成の定数から読む。飛ぶときに `propertiesOfChoiceAsked` を送らない。cr-597 は `SJ_4_CHOOSE` を E-04 の新しい文へ替え、`:426` の「パネルの幅が 0 より大きい」を「押す前に閉じていれば閉じたまま」と「出ていれば出たままで中身が飛ぶ先」の 2 つへ書き直す | L4 の実装の体 | いいえ —— 飛ぶ 1 回に 1 度だけ走る |
| 3 | ⛔ L4（検索パネルの持ち場）。`src/use-case/advance-screen-session/screen-values.ts`（`SearchPanelSession`・`emptySearchPanelSession`）・`src/adapter/screen-renderer/search-panel.ts`・`src/adapter/screen-renderer/screen-surface.ts`・`src/framework/dom-screen-surface/search-panel-drawing.ts`・`src/framework/single-html-shell/frame-loop.ts`（`searchPanelHeldWhileGrabbed` の隣）＋ `tests/system/nfr-004-file-scheme-sweep.sws.test.ts`（表 T-023d の全行を押す掃除 —— `GR-<新1>` の見本を 1 つ足す） | ①②: 列の幅の値・幅で組む表・境目の答え・握っているあいだの追従・`PK-10`。⭐ `DFC-1645`: 絞り込みを押した見出しの下のドロップダウンに描き、見出しの語の押しを `IC-122` として答える（E-14） | L4 の実装の体 | **はい** —— 握っているあいだ、ポインタが動くたびに表を描き直し、ポインタの下を答える。⇒ 着地の時に `docs/development-records/perf-pending.md` に 1 行を足す（PW-2） |
| 4 | `tests/contract/cr-629-*.test.ts`（新しいファイルだけ） | 仕様だけを読む試験（下の表）。波 2・波 3 と並べてよい | 仕様だけの試験の体 | ― |

**波 4 の試験（仕様だけを読む体が書く場合の名と中身）**

| 場合 | 確かめること |
|---|---|
| `SV-<new1>: every column starts at its default width` | `emptySearchPanelSession` からの表の各列の幅が 表 T-206 の `S-<新2>` 〜 `S-<新10>`（`SQ` の順）、表の幅がその和 |
| `SV-17 / SV-<new1>: a long task name is cut with an ellipsis inside its column` | 既定の幅より長い名のセルが、列の幅のまま省略で切れる（列が広がらない） |
| `SV-<new1>: a heading cell keeps IC-122 whole` | `S-425` まで狭めた列でも `IC-122` が見える |
| `SV-<new1>: dragging a border widens only the column to its left` | 境目を 40px 右へ引くと左の列だけが 40px 広がり、ほかの列の幅は同じ |
| `SV-<new1>: the width follows the pointer while held (MUST) and settles on release` | 握っているあいだ幅が追従し、中断（`IN-1`）で元の幅へ戻る |
| `SV-<new1>: S-425 is the floor` | 左へ引き続けても `S-425` で止まる |
| `SV-<new1>: a border is never dragged past the visible table box (MUST NOT)` | 固定した列の境目を右へ引き続けても、領域の右の縁で止まる |
| `SV-14: widths survive closing the panel; FR-151: they are not in the saved document` | 閉じて開き直すと同じ幅、書き出した `GRS JSON` に幅が無い |
| `GR-<new1> / FR-106: PK-10 over a column border` | 境目の上のポインタが `col-resize` |
| `GR-<new1>: an edge beats a border at the panel's right edge` | パネルの右の縁に重なる所では大きさ変え（`GR-25`）が答える |
| `SJ-6: with assignee or percent shown, the tag's left end lands S-428 inside the view` | `S-60` か `S-61` を出して飛ぶと、札の左端が表示の左端 ＋ `S-428` |
| `SJ-6: with neither shown, the date lands S-428 inside the view` | 札を出さないと日付が表示の左端 ＋ `S-428` |
| `SJ-4: a closed Properties Panel stays closed after a jump (MUST NOT)` | 閉じたまま飛ぶと閉じたまま、選択は飛ぶ先 |
| `SJ-4: a shown Properties Panel stays shown and shows the new choice` | 選択物を出していれば出たままで、中身が飛ぶ先 |
| `SV-7: pressing the heading word opens that column's filter (MUST)` | 見出しの語を押すと `IC-122` と同じ絞り込みが開く。境目の掴み代の上では開かず、掴み代が答える |
| `SV-7: the filter drops down under the pressed heading cell (MUST)` | 絞り込みの左端が見出しのセルの左端、上端が見出しの行の下端、幅は見出しのセル以上。表の右の縁の列で開いても領域の中に収まる |
| `SV-7: the filter is never a band between the word field and the table (MUST NOT)` | 開いても語の欄と表のあいだの縦の位置が変わらない |

⭐ 既存の試験で旧の文を逐語で引くもの（`git grep`、13 節）: `tests/system/cr-597-the-search-panel-word-jump-and-grab.test.ts:41`（`SJ-4`、波 2 で替える）。`SJ_6_NO_ZOOM`「倍率を変えない。」・`SJ_6_NO_DATE`「日付が空なら横は動かさない」（`tests/contract/cr-571-search-jump.contract.test.ts:29`〜`:30`）・`SV_17_ELLIPSIS`「セルの字は折り返さず、入らない分を省略記号で切る。」（`tests/contract/cr-571-search-panel-view.test.ts:68`）・`FR_106_PK_10`（`tests/unit/cr-551-fit-status-line-and-cursors.test.ts:254`）は、E-03・E-05・E-08 の新にそのまま残る —— 替えない。

## 9. 仕様の外で直すもの（⛔ 本書は直さない。`bfbe7eb7` の行番号 —— 関数の名で引くこと）

| ファイル | 関数・所 | 何を | 毎フレーム |
|---|---|---|---|
| `src/use-case/edit-document/search-jump.ts` | `scrollWriteTo`（`:61`〜`:79`、注 `:65`）・`searchJumpWrites`（`:83`） | 5 節の `reach` を受け、`(日付の x − leftReachPx)` を `表示の左端 ＋ S-428` に置く `S-77` を書く | いいえ |
| `src/framework/single-html-shell/frame-loop.ts` | `jumpToSearchHit`（`:1284`〜`:1296`）と呼ぶ所（`:2997`） | `showProperties` の引数と呼び出しを消す。`reach` を配置（`frame.layout`）から作って渡す | いいえ |
| `src/adapter/agent-api-endpoint/agent-api-members.ts` | `focusTask`（`:751`〜`:753`） | 同じ `reach` を渡す（`SJ-9`） | いいえ |
| `tools/generate_entity_types.py` | 群 `NOT_STORED_SEARCH_PANEL_SIZES`（`:1350`〜`:1355`。注「S-423 .. S-428 hold no value yet」） | `S-425`・`S-428`・`S-<新1>` 〜 `S-<新10>` を足す（`S-428` は `search-jump.ts` が読める層へ）。⚠️ 足さないと `gen:check` は緑のまま、値が `src` へ届かない | いいえ |
| `src/use-case/advance-screen-session/screen-values.ts` | `SearchPanelSession`（`:71`）・`emptySearchPanelSession`（`:91`） | `columnWidths` を足す | いいえ |
| `src/adapter/screen-renderer/search-panel.ts` | 見せ方を組む所と `searchPanelBoxAfterGrab` の隣 | 列ごとの幅を見せ方に載せ、境目を引いた後の幅を求める | はい（握っているあいだ） |
| `src/adapter/screen-renderer/screen-surface.ts` | `SearchPanelGrab`（`:19`〜`:22`） | 領域 `columnBorder` と `column`・押した時の幅 | ― |
| `src/framework/dom-screen-surface/search-panel-drawing.ts` | `searchTableElement`（`:300`）・`headerCellElement`（`:209`）・`searchPanelPartAt`（`:388`） | 幅で組む（`<col>` か `table-layout` —— 選ぶのは実装）、`IC-122` を切らない見出し、境目の答え、`PK-10` | はい |
| 同 | `FILTER_MENU_STYLE` と絞り込みを置く所（`DFC-1645`） | 語の欄と表のあいだの帯をやめ、押した見出しのセルの下に重ねて置く。見出しの語の押しを `IC-122` の答えにする（E-14） | はい（開いているあいだ） |

## 10. ⛔ この変更でやらないこと ・ 触れ合うもの

- 縁と角で大きさを変える形とポインタ（`DFC-1347` の ③、`GR-25`・`S-426`・`PK-12`〜`PK-15`）—— `CR-621` が書く。
- `Esc` で閉じる段（⑥⑦、`SV-14` の 1 文目・`IN-4`）—— `CR-630` が書く。
- 表の見出しの地（`DFC-1361`、見出しが透けて行が重なる）と Excel 風の絞り込みを作ること（`DFC-1362`、`UF-181` が空）—— どちらも仕様は既にあり、コードの仕事として別の行が持つ。本書の `SV-<新1>` は、絞り込みの入口 `IC-122` を切らないことだけを言う。⭐ ただし絞り込みを開く場所と見出しの語で開くことは、`DFC-1645`（`JDG-1096` の Q16）として本書の E-14 が書く。
- 境目の 2 度押しで中身に合わせる・列の幅の上限の設定値・列を掴んで並べ替える —— 利用者が求めていない（`R2.9`）。
- 表 T-331（列そのもの・書き方）と、`CR-617` の E-12 の升。
- 表 T-280（`propertiesPanelContentStateMachine`）と `DFC-706`（設定を出しているあいだに選択が動く）—— 決めない（決定 1）。`CR-609` の升にも触れない。
- 遅延診断レポートの窓（`CR-617`）の列の既定の幅 —— 4.1 節に記録だけ。
- 読み上げの類 —— 足さない。

## 11. 利用者に問うこと

⭐ **2026-10-01 に答えを得た** —— 問い 1 は `JDG-1096` の「Q15:  推奨通りA」。推奨で書いてあり、書き換えは無い。⭐ 同じ答えの「Q16:  推奨通りA」は `DFC-1645` の問い（列の絞り込みを押した見出しの下のドロップダウンにし、見出しの字でも開くか）への答えであり、本書の決定 11・E-14 が持つ。残る問いは無い。

### 問い 1: 列の幅・入れ込み・掴み代の値を、見本の初めの値で決めてよいか

`JDG-619` は「パネルの寸法（既定の大きさ、列の最小幅、掴める縁の幅、表の行の高さ）は触れる見本で決める」とした。見本 `previous-project-result/18-search-panel-sample/`（2026-09-26）は、`S-425` を 64px、`S-428` を 24px、列の既定の幅を 250・190・110・110・150・380（タスクの表）と 300・240・110（コメントボックスの表）で持っていたが、README は「どれも仮である（決めてはいない）」と書く。列の境目の掴みは見本に無い。

| 案 | 中身 | 良い所 | 代償 |
|---|---|---|---|
| **A（推奨）** | 見本の初めの値をそのまま 🔎（測って決めた値ではない）で入れる。境目の掴み代は 基準日線の掴み代 `S-137` と同じ 6px 🔎 | すぐ使える —— 名が切れ、札が見え、境目を掴める。利用者は 2026-09-26 にこの値の見本を触って、寸法に異を唱えなかった（`JDG-633` の答えは寸法以外）。値は 1 行ずつ後から選び直せる | 値を選んだのは利用者ではなく見本の作り手である |
| B | 見本に列の境目の掴みと、飛ぶ先の札の寄せを足し、利用者が触って選んだ値を入れる（`JDG-619` の手の通り） | 利用者が選んだ値になる | もう 1 巡（見本・触る・答える）かかる。その間、①②④ は動かない |
| C | 値は「未定 🔎」のまま規則だけを入れる | 値を決めない | `S-426` と同じく、掴み代 0px・入れ込み 0px・幅なしで、①②④ は直らない（`DFC-1286` と同じ形の既知の赤が増える） |

⭐ 推奨は **A** —— 利用者の求め（`JDG-877`）は「使えること」であり、値は 🔎 のまま後から 1 行ずつ選び直せる。E-11・E-12 は A で書いた。

## 12. 台帳

| ID | 何か | 状態 |
|---|---|---|
| `DFC-1347` | 検索パネルの要望の束 | ①②④⑤ を本書が閉じる（仕様は波 1、コードは波 2・波 3）。③ は `CR-621`、⑥⑦ は `CR-630`。⇒ 3 本とも着地して行を閉じる。①②④ の値は問い 1 の答え A（`JDG-1096` の Q15）—— 🔎 のまま後から選び直せる |
| `DFC-1281` | `S-428` が未定で、`SJ-6` が入れ込みなしで置く | 本書で閉じる —— 値（E-12、問い 1）と、寄せる点（E-05） |
| `DFC-1286` | `S-426` が値を持たない | 触れない（`CR-621`）。⚠️ 同行の「触れる見本で `S-423` 〜 `S-428` を決める」のうち `S-425`・`S-428` は本書が値を入れる |
| `DFC-1361`・`DFC-1362` | 見出しの地・絞り込み | 触れない（10 節） |
| `DFC-1645` | 列の絞り込みが帯に開き、見出しの字で開かない | 本書で閉じる —— 仕様は E-14（波 1）、コードは波 3（`JDG-1096` の Q16） |
| `JDG-1096` | Q14〜Q17 への答え（状態「指示 —— 調整役が投入時期を決める」）。本書は Q15・Q16 | 調整役へ: 本書の波が決まったら Q15・Q16 の部分を「指示 —— `CR-629` が当てる」 |
| `JDG-877` | 利用者の裁定（状態「指示 —— 調整役が投入時期を決める」） | 調整役へ: 本書を当てる波が決まったら「指示 —— `CR-629` が当てる」（`CR-621`・`CR-630` と分けて持つ項を添える）。着地したら 適用済 |
| `JDG-616` | 飛ぶと選ぶ（プロパティパネルに出る） | 調整役へ: 括弧「（プロパティパネルに出る）」を `JDG-877` が覆したことを同行に記す（ほかは有効のまま） |
| `DFC-706` | 設定を出しているあいだに選択が動く | 触れない（決定 1）。⚠️ 本書の後は、飛ぶことも「選択が動く」の 1 つになる —— 同行の答えは飛ぶ時にも効く |
| 変更履歴 | `A-appendix` の 1 行 | 調整役が当てる時に足す |

## 13. 測り方の再現

```
# the tree: l4-review-crs bfbe7eb7 (= origin/refactor); the four spec files are LF-only
#   (CRLF counts 0: 01-04-requirements.md, 05-07-design.md, _source/settings.json, _source/published-entries.json)
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py FR-151 SV-6 SV-7 SV-17 SJ-4 SJ-6 S-425 S-428 T-331
#   FR-151: 7 requirements / 46 references; SV-6: 0; SV-7: 5; SV-17: 2; SJ-4: 2; SJ-6: 3; S-425: 1; S-428: 1;
#   T-331: FR-151 only, second hop 7 (FR-009 FR-016 FR-070 FR-098 FR-029 FR-076 FR-040)
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/induced.py FR-151 SV-6 SV-7 SV-17 SJ-4 SJ-6 S-425 S-428 T-331
#   seeds 9 of 9, edges 5, cycles 2: S-425 <-> SV-17, S-428 <-> SJ-6

# the ledger and the rulings, read whole
grep -n "^| *DFC-1347 \|^| *DFC-1281 \|^| *DFC-1286 \|^| *DFC-1361 \|^| *DFC-1362 " docs/development-records/defects.md
grep -n "^| *JDG-612 \|^| *JDG-614 \|^| *JDG-616 \|^| *JDG-619 \|^| *JDG-633 \|^| *JDG-877 \|^| *JDG-922 " docs/development-records/rulings.md
grep -n "SJ-4\|SJ-6\|S-428\|S-425\|SV-17\|SV-14\|T-332\|列の幅\|列幅" docs/development-records/rulings.md     # JDG-877 only
grep -n "PK-10\|GR-22\|IF-9\|T-023d\|OC-2\|T-038" docs/development-records/rulings.md                    # no row against this change
grep -n "S-42[3-8]\|SJ-4\|SJ-6\|検索パネル" docs/development-records/pending-decisions.md                 # 0

# the code that holds the three defects
sed -n 70,100p src/framework/dom-screen-surface/search-panel-drawing.ts    # :74 overflow:auto, :76 no width, :85 ellipsis
sed -n 59,79p src/use-case/edit-document/search-jump.ts                    # :65-67 date at the left edge, no inset
sed -n 1282,1296p src/framework/single-html-shell/frame-loop.ts            # jumpToSearchHit calls showProperties()
sed -n 2051,2089p docs/spec/_source/state-machines.json                    # propertiesOfChoiceAsked / selectionMoved cells

# tests that quote what this change rewrites, or read the rows it adds
git grep -n "SJ-4\|SJ_4\|SJ_6\|SV_17\|S-425\|S-428" -- tests
git grep -n "searchJumpWrites(" -- tests                                    # 10, all in cr-571-search-jump.contract.test.ts
git grep -n "specTable('T-023d')\|'T-023d'" -- tests                        # cr-408 :77-79 pins the rows above GR-22
git grep -n "パネルの境界の掴み帯（同表の" -- tests                          # cr-551 :254 (kept verbatim by E-08)

# the overlaps
#   Grep of change-request/CR-6[0-2]?-*.md for the ids above: CR-605 CR-606 CR-607 CR-613 CR-615 CR-617 only;
#   none holds an old block of this change (section 4.1)

# the old blocks: each counted once, LF-normalised, by a script in the session scratchpad
#   (reads the <!-- EDIT --> markers of this file, takes the first fenced block after 旧, counts it in its file)
#   E-01 1 / E-02 1 / E-03 1 / E-04 1 / E-05 1 / E-06 1 / E-07 1 / E-08 1 / E-09 1 / E-10 1 / E-11 1 / E-12 1 / E-13 1
#   (script: the session scratchpad, cr-629/count_old.py -- also confirms no 新 block is already in its file: 0 for all 13)
```
