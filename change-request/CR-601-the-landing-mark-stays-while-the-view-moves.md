# CR-601 — 着地の印は、見る位置と倍率を動かすあいだ残る

> 起草の状態: 起草（2026-10-01、枝 `jump-followups`）。まだ当てていない。4 節の旧 2 件は、読んだ木で各 1 回だった（13 節）。
> 読んだ木: `refactor` `67605ad4`（`CR-596` が当たった木）。行番号・数は、すべてこの木で測った（13 節）。
> ID の帯: 調整役から `CR-601`・`JDG-900` 〜 `JDG-909`・`DFC-1380` 〜 `DFC-1389` を受けた。⭐ 本書は仕様の新しい識別子を 1 つも取らない（2 節）。
> ⛔ 当てる順: `CR-596` の後（`EL-17` は `CR-596` が足した）。`CR-598` とは同じ行を書き換えないので、どちらが先でもよい（6 節）。
> 閉じるもの: `JDG-900`・`JDG-902` 〜 `JDG-906`。見本: `previous-project-result/22-jump-followups/`。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 利用者の逐語と、それが決めること

| 裁定 | 逐語（`docs/development-records/rulings.md` から写した） | 決めること | 本書での扱い |
|---|---|---|---|
| `JDG-900` | 「「…」を 1 回クリックするとジャンプの点、触ってみた。 縦/横スクロール中だけは太い赤の状態をキープしてほしい。 拡大縮小や折り畳みなどのほかの操作で消えるのはOK。 理由: 結局どことどこがどうつながっているのかいまいちわからない。」 | 縦・横のスクロールでは着地の印を消さない | E-01。⚠️ 「拡大縮小…で消えるのはOK」は `JDG-902` が覆した |
| `JDG-902` | 「残す。 さらに拡大縮小でも残す。 理由: 拡大したら強調線が消えてイラっとした。 ズームも含めて強調線を維持しないと直感的操作を実現できない。」（問い 2「パン（PTD-1）のあいだも残しますか？」への答え） | パンでも拡大縮小でも消さない | E-01。決定 1 |
| `JDG-903` | 「残す (推奨)」（問い 3「パネルの上のホイールでも残しますか？」） | ホイールはどれも、どこの上でも消さない | E-01。決定 2 |
| `JDG-904` | 「4 つとも消さない (推奨)」（問い 4「修飾キーだけの押下では消さないことにしますか？」） | `Ctrl` ・ `Shift` ・ `Alt` ・ `Meta` だけの押下では消さない | E-01 |
| `JDG-905` | 「消す (推奨)」（「全体を収める（F キー・IC-10）でも赤を残しますか？」） | 全体を収めるでは消す | E-01 の ⚠️ |
| `JDG-906` | 「残す (推奨)」（「表示の倍率（IC-104 / IC-105）を変えたときも赤を残しますか？」） | 表示の倍率では消さない | E-01 |
| `JDG-794` | （`CR-596` の問い「赤い印を消す「ほかの操作」に、ホイールでのスクロールも入れますか？」への答え。`rulings.md` の同じ行） | 押下・キー・ホイールのどれでも消す | ⚠️ 本書が一部を覆す —— 同じ行の状態を「覆された（一部）」に変えた |

問うた場面: 枝 `jump-followups` のセッションが、触れる見本（`previous-project-result/22-jump-followups/jump-followups-sample.html`）を見せて、`CR-598` の問い 1（`JDG-901`）と合わせて 4 つをまとめて問い、答えの問い 2 が拡大縮小を足したので、境目の 2 つ（`JDG-905` ・ `JDG-906`）を追って問うた。

### 0.2 調べた結果（`67605ad4`）

1. **仕様で消すかを決めるのは `EL-17` の 1 セルだけである。** `01-04-requirements.md:2830` の「押下（どのボタンでも、画面のどこでも。`EL-18` の押下を除く）、キーの押下（修飾キーだけのものを含む）、ホイール」。状態機械は出来事 `landingMarkClearAsked` を持ち、その出所の注が同じ 3 つを写している（`_source/state-machines.json:1141`、生成された `_assets/tbl-state-machines.md:100`）。遷移（`shown` → `hidden`）は変わらない（`tbl-state-machines.md:523`）。⇒ 書き換えるのは `EL-17` のセルと注の 2 か所。
2. **「スクロール」と「拡大縮小」の入力は、仕様にこれだけある。**
   - ホイール: 表 T-023 の `MK-1`（縦スクロール）・ `MK-2`（両軸ズーム）・ `MK-3`（`Shift` ＋ ホイール ＝ 横の**ズーム**）・ `MK-4`（縦のズーム）・ `MK-5`（`Ctrl` ＋ `Shift` ＋ ホイール ＝ 横スクロール）（`:3925-3929`）。「本表のホイールの行はこの 5 つで全部である」（`:3942`）。⚠️ 依頼の文の「Shift+wheel」はスクロールではなくズームである。
   - 面・パネルの上のホイール: 割当を当てずブラウザへ渡し、面やパネルの中を送る（`:3941-3946`、`FR-099` の `RR-3`、検索パネル）。
   - パン: 表 T-023a の `PTD-1`（中ボタンのドラッグ、`Ctrl` だけを伴う左ドラッグ。`:3870`、`MK-7` `:3931`）。
   - スクロールバー: 表 T-031 の `SC-4`「掴んで動かすと表示位置が変わる」（`:4717`）。
   - 拡大縮小のキー: 表 T-036 の `SK-16` ・ `SK-16b` ・ `SK-16a` ・ `SK-16c`（`:4994-4997`）。表示の倍率のキー `SK-22` ・ `SK-23`（`:4998-4999`）。全体を収める `SK-18`（`:5000`）。
   - 拡大縮小の入口: `_assets/tbl-glossary.md` の 表 T-109 の `IC-12` 〜 `IC-15`（`:541-544`）、表示の倍率 `IC-104` ・ `IC-105`（`:545-546`）、全体を収める `IC-10`（`:537`）。
   - ⭐ **キーで日程を送る割当は無い** —— 表 T-036 は「ショートカットキーの割当の全数である」（`:5005`）とし、矢印・`PageUp` ・ `PageDown` の行は無い。⇒ 修飾キー以外のキーは、拡大縮小と表示の倍率のキーを除いて、今のまま消す。
   - ⭐ 表 T-027 の `UN-8`「ズーム・スクロール・パン」（`:2285`）が、これらを 1 つの種類として既に括っている。全体を収めるは `UN-8` に加えて `UN-17`（行の木の状態を戻す、`:2290`、`HF-8` `:1734`）に当たる。
3. **コードで消しているのは 1 つの関数である。** `frame-loop.ts:984-991` の `isLandingMarkClearedBy` —— 印が出ていて、入力がポインタでなければ（キーとホイール）必ず真、ポインタなら `phase === 'down' && clickCount < 2` で真。呼ぶのは `receiveInput` の `:2828`（出来事は `:427` の `LANDING_MARK_CLEAR_ASKED`）。受ける側は `screen-values.ts:871-876` の `onLandingMarkClearAsked` で、どの入力かを読まない。⇒ 直すのは述語だけで、`screen-values.ts` は変わらない。
4. **判じる材料はコードに既にある。** パンは `input-command-translator.ts:622-630` の `pressRowOf`（中ボタン、`Ctrl` だけの左）が `PTD-1` を返す。スクロールバーの押下は、押した所の `ScreenPart` の `scrollbarAxis`（`input-command-translator.ts:1038`、`frame-drags.ts:94`）。入口の押下は同じ部品の `entry`（入口と `IC-` の対応は `input-command-translator.ts:697-703`）。`IC-12` 〜 `IC-15` は押し続けると繰り返す（`gesture-values.ts:96`）。ホイールは `wheel-input.ts:66` の `commandFromWheel`。⚠️ 今の呼び出し（`:2828`）は `collectInputContext`（`:2830`）より前にあり、押した所の部品は `receiveInput` の前段の `partUnderPointer`（`:1595`）が持つ。
5. **持ち場。** `frame-loop.ts` ・ `input-command-translator.ts` ・ `screen-values.ts` ・ `wheel-input.ts` は持ち場 L4（`docs/development-records/cr-plan-2026-09-26.md:67`）。描く側（`schedule-task-figures.ts`）は L1（`:64`）だが、本書は描く側を変えない。⭐ 枝 `lane-l4`（`2a28b638`）は `7665dcd8` から分かれ、`CR-596` の `isLandingMarkClearedBy` をまだ持たない（`git grep -c isLandingMarkClearedBy lane-l4` が 0）。L4 の差分は `frame-loop.ts` の対話欄とプロンプトの写し（`dialogueFieldEntryPressed` ・ `copyImageToJsonPrompt`）と `screen-values.ts:704-711` の `onDialogueFieldEntryPressed` で、印の関数とは重ならない。⚠️ 同じファイルなので、L4 が `refactor` を取り込んでから当てる（8 節）。
6. **毎フレームの経路。** 印の絵は `CR-596` のまま毎フレーム描いている —— `svg-renderer.ts:486` の `landingLinkOf`、`schedule-task-figures.ts:763-766` の `emphasisOf`（線ごとに鍵を比べる）、`:779-806` の `dependencyLinkParts`（着地の線は経路の全体）、`:887-899` の `endedTasksOf`（印か選択があるとき線を 1 回なめる）。本書はその手順を変えない。変わるのは、印が出たままのフレームがスクロールとズームのあいだに増えることだけで、選んだ線を持ったままスクロールするとき（選択はホイールで変わらない、`selection-input.ts:153`）と同じ種類の費用である。⚠️ ただし直す `frame-loop.ts` は 04 の 5 節の「毎フレームの経路」の表に載る（`docs/development-rules/04-verification.md:281`）⇒ `perf-pending.md` に 1 行が要る（`PW-2`）。
7. **試験。** 文を引くのは `tests/contract/cr-596-a-click-on-the-mark-jumps-and-marks-the-landing.contract.test.ts` だけ（`grep` で 1 ファイル）。変わる事例は 4 つ —— `:182`（`EL_17_CLEAR` の逐語 `:118-119` を引く原稿の事例）、`:1514`（修飾キーだけで消える → 残る）、`:1520`（ホイールで消える → 残る）、`:1553-1556`（`Shift` で消して省いた形に戻る対照 → 消す入力を別のものに）。状態機械の事例（`:1257-1290`）は遷移を引くだけで、変わらない。

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

- ⭐ **`CH-4` ／ `GL-006`**（説明を読まずに操作できる）—— 送った先から線を辿って元の端を見に行く操作（スクロール・パン・ズーム）で、辿っている線が消えない。利用者の理由「結局どことどこがどうつながっているのかいまいちわからない」「拡大したら強調線が消えてイラっとした」。
- ⚠️ **`CH-3`（ぬるサク）** —— 印を描く手順は変わらない。印が出ているフレームが増えるだけである（0.2 節の 6）。

### ② レビュー観点のどの条項を当て、何が出たか

- **`R1.3`（矛盾・唯一の正）** —— ① `EL-17` と状態機械の注が同じ 3 つを写している ⇒ 2 つとも書き換える（E-01 ・ E-02）。② `FR-009` の前後の順 ⓪「印が出ているあいだ、選ばれている線は無い」（`:2788`）は、スクロールもズームも選択を変えないので真のまま。③ `PE-12`（`:4402`）の「印を消す操作（`EL-17`）で元に戻らない」も真のまま。
- **`R1.4`（異常系・境界値）** —— ① 着地の線が画面の外へ出た（10 節の 3）。② ズームで端の行がグループ LOD で描かれなくなった（`EL-16` の ⚠️「描かれていないときは、その分を描かない」で足りる）。③ 押し続ける拡大の入口（`IC-12` 〜 `IC-15` の繰り返し）。④ `Ctrl` を押してからの左の押下が `PTD-7`（写す）になるとき —— パンではないので消す。⑤ 修飾キーを押してから割当の無いキーを押した —— そのキーで消す。
- **`R2.21`（1 つの仕事は 1 か所）** —— 「見る位置と倍率だけを動かす操作」の括りは 表 T-027 の `UN-8` が持つ。E-01 はそれを指し、入力の行を名指すだけで新しい分類を作らない。
- **`R5`（性能）** —— 0.2 節の 6。⛔ 最適化は進めない（`JDG-11`）。

### ③ 利用者に問わずに決めたこと

⭐ `rulings.md` の `JDG-` の行を「着地の印」「EL-17」「ホイール」「スクロール」「パン」「修飾キー」で引いた —— 当たるのは `JDG-790` 〜 `JDG-799`（`JDG-794` を本書が一部覆す）、`JDG-840` 〜 `JDG-846`、`JDG-900` 〜 `JDG-906`。
⭐ 規則 06 の ① ② —— 公開の名（表 T-064）も型の形も変わらない。状態・出来事・運ぶ値を足さない。保存も交換もしない。

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| 決定 1 | 消さない操作を「表 T-027 の `UN-8`（ズーム・スクロール・パン）と表示の倍率（`FR-039`）」と括り、その入力の行を名指す | `JDG-902` の理由「ズームも含めて強調線を維持しないと」と `JDG-906`。`UN-8` は既に 3 つを 1 つの種類にしている | 入力の行が増えたら `EL-17` の列挙も直す（`UN-8` を足す変更要求が同時に直す） |
| 決定 2 | ホイールは、組と場所によらず消さない | `JDG-903`。ホイールの割当 5 つ（`MK-1` 〜 `MK-5`）はどれも `UN-8` であり、面・パネルの上ではその中を送る。割当の無い組は何も起こさない | 割当の無いホイールの組でも印が残る（何も動かないので害は無い） |
| 決定 3 | 押下で消さないのは、パン（`PTD-1`）・スクロールバー（`SC-4`）・拡大縮小と表示の倍率の入口（`IC-12` 〜 `IC-15` ・ `IC-104` ・ `IC-105`）の押下だけ。どこに置かれた入口でも（コマンドパレットの中でも）同じ | 入口は置き場ではなく `IC-` の行で同じ操作である（表 T-109） | — |
| 決定 4 | 動かさずに離した `PTD-1` の押下でも消さない | 動かさない `PTD-1` は 0 のパンで、何も書かない（`input-command-translator.ts:977-980`） | — |
| 決定 5 | 面・パネルの中のスクロールバー（ブラウザが描くもの）の押下は、パネルの上のホイール（`JDG-903`）と同じく消さない | 同じ「パネルの中を送る」操作であり、ホイールとスクロールバーで答えを分けると説明できない | ⚠️ 利用者には問うていない。見本で触れてもらう |
| 決定 6 | 状態機械は変えない —— 出来事 `landingMarkClearAsked` の出所の注だけを書き換える | 消えるときの動き（`shown` → `hidden`）は同じ。変わるのはどの入力が出来事を起こすかだけ | — |
| 決定 7 | 新しい設定値の行を足さない | 寸法も色も `CR-596` のまま | — |

---

## 1. 範囲 —— 行き先

| 何 | 仕様で変える所 | 編集 | 裁定を戻すとき |
|---|---|---|---|
| 着地の印を消す入力と消さない入力 | 表 T-303 の `EL-17` のセル（`01-04-requirements.md:2830`） | E-01 | E-01 の新を旧へ |
| 状態機械の出来事の出所の注 | `_source/state-machines.json:1141`（生成で `_assets/tbl-state-machines.md:100` が変わる） | E-02 | 同上 |
| `EL-16` ・ `EL-18` ・ `EL-19` ・ `PE-12` ・ `UN-8` ・ `MK-1` 〜 `MK-5` ・ `PTD-1` ・ `SC-4` | 変えない | — | — |

**数**: 文の編集 1（E-01）。原稿 JSON の編集 1（E-02）。生成器の群 0。

---

## 2. 新しい識別子

本書は仕様の新しい識別子を取らない —— 表・行 ID・接頭辞・設定値の行・状態・出来事・運ぶ値・関数の公開の名のどれも足さない。

---

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

| 消すもの | 所（`67605ad4`） | 置き換わる先 | 編集 |
|---|---|---|---|
| `EL-17` の「キーの押下（修飾キーだけのものを含む）」 | `01-04-requirements.md:2830` | キーの押下。修飾キーだけ ・ 拡大縮小と表示の倍率のキーは除く | E-01 |
| `EL-17` の「ホイール」（消す入力として） | 同上 | ホイールはどれも消さない | E-01 |
| `EL-17` の「押下（どのボタンでも、画面のどこでも。…）」の例外が `EL-18` だけであること | 同上 | 例外に `PTD-1` ・ `SC-4` ・ 入口 6 つの押下を足す | E-01 |
| 状態機械の注「印が出ているあいだの押下・キー・ホイール。…」 | `_source/state-machines.json:1141` | 押下とキーの押下。見る位置と倍率だけを動かす操作と修飾キーだけの押下と `EL-18` を除く | E-02 |
| コードの「ポインタでなければ消す」（⛔ 本書は直さない） | `frame-loop.ts:988-990` | 9 節の述語 | 波 1b |
| 試験の 4 事例（⛔ 本書は直さない） | `cr-596-…contract.test.ts:182` ・ `:1514` ・ `:1520` ・ `:1553-1556` | 新しい `EL-17` から書き直す | 波 2 |

⭐ **消さないもの**（読み直して真のまま）: `EL-17` の ⭐「押して離したのが続きの印なら、押下で古い印を消し、離したときに新しい印を付ける」、⚠️「ポインタを動かすだけでは消さない」、⚠️「送る書き込みと `Agent API` の書き込みでは消さない」。`EL-18` の全文。状態機械の遷移。

---

## 4. 書き直す所（当てる体がそのまま使う文）

⛔ **作法**: 各編集は「旧」を「新」で置き換える。**置き換える前に、旧がそのファイルに 1 回だけ現れることを数えること**（`67605ad4` で 2 件とも 1 回。13 節）。ファイルの改行は LF。
⚠️ どちらも見出しに `partial` と書いた、行の一部の置き換えである。塊の末の改行を旧にも新にも含めない。

<!-- EDIT id=E-01 file=docs/spec/01-04-requirements.md partial -->
旧
```text
印が出ているあいだに、人が次のどれかを行ったら、印を消すこと（MUST）: 押下（どのボタンでも、画面のどこでも。<br>`EL-18` の押下を除く）、キーの押下（修飾キーだけのものを含む）、ホイール。<br>⭐ 押して離したのが続きの印なら、
```
新
```text
印が出ているあいだに、人が次のどれかを行ったら、印を消すこと（MUST）: 押下（どのボタンでも、画面のどこでも）、キーの押下。<br>⭐ ただし、見る位置と倍率だけを動かす操作 —— 表 T-027 の `UN-8`（ズーム・スクロール・パン）と、表示の倍率（`FR-039`）の操作 —— では消さないこと（MUST） —— 送った先から線を辿って元の端を見に行く操作であり、辿るあいだに線が消えると、どこがつながっているかが読めない。<br>その操作の入力は、次のとおりとする: ホイール（表 T-023 の `MK-1` 〜 `MK-5`。面やパネルの上でその中を送るものを含め、ホイールはどれも消さない）、パン（表 T-023a の `PTD-1`）の押下、スクロールバー（表 T-031 の `SC-4`）の押下、`_assets/tbl-glossary.md` の 表 T-109 の `IC-12` 〜 `IC-15` ・ `IC-104` ・ `IC-105` の入口の押下、表 T-036 の `SK-16` ・ `SK-16a` ・ `SK-16b` ・ `SK-16c` ・ `SK-22` ・ `SK-23` のキー。<br>修飾キー（`Ctrl` ・ `Shift` ・ `Alt` ・ `Meta`）だけの押下でも消さないこと（MUST） —— 横のスクロール（`MK-5`）もパンも、まず修飾キーを押す。次の入力が消すかを決める。<br>⚠️ 全体を収める（`FR-055`、表 T-036 の `SK-18`、表 T-109 の `IC-10`）では消す —— 倍率と表示位置のほかに行の木の状態を戻す（表 T-027 の `UN-17`）。<br>`EL-18` の押下でも消さない。<br>⭐ 押して離したのが続きの印なら、
```

<!-- EDIT id=E-02 file=docs/spec/_source/state-machines.json partial -->
旧
```text
"ja": "印が出ているあいだの押下・キー・ホイール。印を付けた押下の 2 回目（EL-18）を除く"
```
新
```text
"ja": "印が出ているあいだの押下・キーの押下。見る位置と倍率だけを動かす操作と修飾キーだけの押下（EL-17 の ⭐）、印を付けた押下の 2 回目（EL-18）を除く"
```

当てた後に打つもの: `npm run gen`（`_assets/tbl-state-machines.md:100` が変わる）→ `npm run gen:check` → `rm -rf output && npm run check`（⚠️ check 42 は、波 2 が `EL_17_CLEAR` の逐語を書き直すまで赤になる —— 8 節）。

---

## 5. 継ぎ目 —— 両側の依頼文にこのまま写すこと

```
SEAM-1 (shell: which input clears the landing mark, T-303 EL-17)
- Where: src/framework/single-html-shell/frame-loop.ts, isLandingMarkClearedBy
  (called once per input in receiveInput, before the translator runs).
- New: while the mark is shown, the input clears it UNLESS it is one of:
    wheel      -> never clears (any modifiers, anywhere: MK-1..MK-5 and the
                  browser-default wheel over a surface or panel)
    key        -> a modifier-only key (Control, Shift, Alt, Meta), or the key
                  of SK-16, SK-16a, SK-16b, SK-16c, SK-22, SK-23 (read the key
                  table the translator already uses; do not spell the keys twice)
    pointer    -> phase 'down' with clickCount >= 2 (EL-18, as today), or
                  a press the translator reads as PTD-1 (pressRowOf, only for a
                  press on the Row Area, as pointerAssignment does), or a press on
                  a ScreenPart with scrollbarAxis (SC-4), or a press on the entry
                  of IC-12, IC-13, IC-14, IC-15, IC-104, IC-105 (wherever it sits)
    pointer    -> 'move' / 'up' / 'lost' never clear (as today)
- Still clears: IC-10 and SK-18 (fit, UN-17), every other key and press.
- Put the judgement in ONE pure function on the translator side (L4 owns both
  files); frame-loop only asks it. Do not add a state, an event or a payload:
  landingMarkClearAsked and onLandingMarkClearAsked are unchanged.
- TRAP: the call sits before collectInputContext; PTD-1 needs the selection
  (PTD-7 is Ctrl on a selected Task body) -- either read it from the context
  after it is collected (the event must still be sent before the translator's
  own writes of this input) or pass what pressRowOf needs.

Observable (for the tester, from the spec only):
- After one click on a continuation mark (landing shown), each of these keeps
  the mark (S-448 line and outlines stay): plain wheel, Ctrl+Shift+wheel,
  Ctrl+wheel, Shift+wheel, Alt+wheel, a wheel over the search panel, a middle
  press and drag, a Ctrl+left press and drag on an empty place, a Ctrl-only key
  down, a Shift-only key down, a press and drag on a scrollbar, a press on
  IC-13 / IC-15 / IC-105, the keys of SK-16 / SK-16a / SK-22.
- Each of these clears it: a plain left press on an empty place, a right press,
  a press on a row's fold entry, a plain key (e.g. Enter), F (SK-18), a press on
  IC-10.
- After the view has scrolled or zoomed with the mark kept, one click on
  another line's continuation mark moves the mark to that line (EL-17 star).
```

---

## 6. グラフ（`67605ad4`）

### 6.1 `impact.py` —— 触る行ごとの届く先（要求 / 参照）

| 対象 | 届く先 | 読んだ結果 |
|---|---|---|
| `EL-17` | 要求 1 ／ 参照 3 —— `FR-107`（`:4402` `PE-12`）・ `tbl-state-machines.md:100` ・ `:525` | `PE-12` は「印を消す操作（`EL-17`）で元に戻らない」とだけ言い、真のまま。`:100` は E-02 の生成。`:525` は `hidden` の根拠で変わらない |
| `EL-18` | 要求 2 ／ 参照 3 —— `FR-009`（`:2830` `EL-17`）・ `FR-016`（`:3938` `MK-13`）・ `tbl-state-machines.md:100` | E-01 は `EL-18` を指し続ける。`MK-13` は変わらない |
| `UN-8` | 要求 3 ／ 参照 10 —— `FR-031` ほか | E-01 が新しく指す。`UN-8` は変えない |

### 6.2 `induced.py`

```
seeds: FR-009 T-303 T-280 T-027 T-023 T-036 T-023a
-> 7 of 7 resolved, 2 edges inside the seed set, 0 cycles
```

⇒ 閉路 0。E-01 と E-02 は別のファイルであり、どちらの順で当ててもよい。⭐ `CR-598` の E-01 ・ E-02 は `EL-20` と `05-07-design.md` を書き、本書は `EL-17` と状態機械の注を書く —— 同じ塊は無い。

---

## 7. 数の予測（`67605ad4`。当てた後に同じ数え方で突き合わせる）

| 数 | `67605ad4` | 本書を当てた後 | 差 |
|---|---|---|---|
| tables / figures / rows / uids（`md-checks.py`） | 212 / 29 / 2685 / 176 | 212 / 29 / 2685 / 176 | 0 |
| 表 T-303 の行 | 21 | 21 | 0 |
| `EL-17` のセルの `<br>` で区切った文 | 5 | 9 | ＋4 |
| 状態機械の状態 ／ 出来事 | 変わらない | 変わらない | 0 |

---

## 8. 波 —— 持ち場で割る

| 波 | 持ち場 | 中身 | 体 |
|---|---|---|---|
| 0 | ― | 当てる木で 4 節の旧をもう 1 度数える（2 件とも 1 回）。`perf-pending.md` に 1 行（`frame-loop.ts`、`PW-2`） | 調整役 |
| 1a | 仕様の文（`01-04-requirements.md` ・ `_source/state-machines.json`） | E-01 ・ E-02、`npm run gen`。変更履歴（`docs/development-records/changelog.md`）に 1 行 | 仕様の持ち場 |
| 1b | **L4**: `frame-loop.ts`（`isLandingMarkClearedBy`）＋ 判じる純関数 1 つ（`input-command-translator.ts` の側） | SEAM-1 | L4（実装の体） |
| 2 | 仕様だけを読む試験の体 | 新しい `EL-17` から試験を書く。`cr-596-…contract.test.ts` の `EL_17_CLEAR`（`:118-119`）と 4 事例（`:182` ・ `:1514` ・ `:1520` ・ `:1553-1556`）を書き直し、SEAM-1 の Observable の入力を 1 つずつ足す（実装した体に書かせない） | 別の体 |
| 3 | ― | 実物で確かめる（Playwright の probe。表示枠は rAF を回さない）: 印を付け、ホイール・`Ctrl` ＋ `Shift` ＋ ホイール・パン・スクロールバー・`IC-13` ・ `F` を順に試す | 調整役 |

- ⭐ **推す当て方: `CR-598` と同じ回に当てる。** 両方とも `cr-596-…contract.test.ts` を書き直すので、波 2 は 1 つの試験の体に両方を渡す。仕様の波 1a も 1 回で済む。コードは持ち場が分かれる（`CR-598` は L1 の `schedule-geometry.ts`、本書は L4 の `frame-loop.ts`）。
- ⛔ **L4 が `refactor` を取り込むまで波 1b を始めない** —— `lane-l4`（`2a28b638`）には `isLandingMarkClearedBy` がまだ無い（0.2 節の 5）。
- ⚠️ 1a と 2 は同じ合流で当てる —— 1a だけでは check 42 が `EL_17_CLEAR` の逐語で赤になる。
- ⚠️ `main` の早送りの前に測る（`JDG-605` ・ `JDG-726`）。`CR-598`（`lodEndOf`、毎フレーム）と 1 回にまとめてよい（`PW-1` の ②「溜まっていれば 1 回にまとめて測る」）。測る場面に「印を付けたままホイールで縦に送る」を 1 つ足す。
- ⛔ 体はワークツリーも `node_modules` の結び目も作らない。`git stash` をしない。基準線に触れない。

---

## 9. 仕様の外で直すもの（⛔ 本書は直さない。`67605ad4` の行番号）

| ファイル | 何を | 毎フレーム |
|---|---|---|
| `src/framework/single-html-shell/frame-loop.ts` | `isLandingMarkClearedBy`（`:984-991`）を SEAM-1 の述語に。`:984-985` の `see` と WHY に `UN-8` ・ `JDG-902` の理由を足す | ⚠️ ファイルは表に載る（関数は入力ごと） |
| `src/adapter/input-command-translator/input-command-translator.ts` | 判じる純関数 1 つ（`pressRowOf` と入口の対応を使う）。公開の名が増えるなら、表 T-064 に載せるかを 1b の体が調整役に問う | いいえ |
| `src/use-case/advance-screen-session/screen-values.ts` | 変えない（`onLandingMarkClearAsked` は入力を読まない） | — |
| `src/adapter/svg-renderer/*` | 変えない | — |
| `tests/contract/cr-596-a-click-on-the-mark-jumps-and-marks-the-landing.contract.test.ts` | 8 節の波 2 | いいえ |

---

## 10. ⛔ この変更でやらないこと ・ 触れ合うもの

1. **選んだ通常の線（`SL-8`、`JDG-795`）** —— 変えない。選択はもともとホイールでもパンでも変わらない（`selection-input.ts:153`）。印が出ているあいだは選ばれている線が無い（`PE-12`）ことも、スクロールとズームが選ばないので保たれる。
2. **印が出ているあいだの 2 回目のジャンプ** —— 変えない。別の線の続きの印を 1 回押せば、押下で古い印を消し、離したときに新しい印を付ける（`EL-17` の ⭐）。スクロールで印を連れたまま別の「…」まで行けるようになるだけである。⚠️ 着地の線そのものには続きの印が無い（`EL-19`「続きの印は描かない」）ので、同じ線の印は押せない。
3. **着地の線が画面の外へ出た** —— 印は出たまま（状態は `EL-17` の入力でしか `hidden` にならない）。線は経路の全体を描くので（`EL-19`）、両端が画面の外でも画面を横切る部分は見え、戻れば端の縁取りも見える。描く側の切り捨て（`schedule-task-figures.ts:801` の `isCulled`）が、画面に無い線の絵を作らない。
4. **ズームで端がグループ LOD の下になった** —— `EL-16` の ⚠️（描かれていない分は描かない）と `EL-19` のまま。倍率を戻せばまた描かれる。
5. **`CR-598` の隠した行の端** —— 印を押せば `EL-21` で開いてから送るので、着地のときは端が描かれている。着地のあと端をまた隠すのは人の押下（折り畳み）なので印は消える。⚠️ `Agent API` が行を隠したときだけ、印を残したまま端が `EL-20` の端になる —— `CR-598` の後は線が落ちず、木の順の境に立つ全体の経路になる（`CR-598` の前は `EL-19` の最後の ⚠️ と同じく落ちる）。どちらも本書の文を変えない。
6. 寸法・色・重ね順・書き出し（`EP-12`）を変えない。新しい設定値の行を足さない。

---

## 11. 前に立つ者へ返す問い

⭐ 開いている問いは無い（`JDG-902` 〜 `JDG-906` で答えを得た）。⚠️ 決定 5（パネルの中のスクロールバー）は問うていない —— `JDG-903` と同じ扱いにした。見本で違和感があれば、利用者が言う。

---

## 12. 台帳

| ID | 何か | 状態 |
|---|---|---|
| `JDG-900` ・ `JDG-902` 〜 `JDG-906` | 0.1 節 | 「指示 —— `CR-601` が当てる」。当てた後、前に立つ者が「適用済」へ |
| `JDG-794` | 一部を覆した | 状態に「覆された（一部）」を記した（2026-10-01） |
| `perf-pending.md` の 1 行 | 0.2 節の 6 | 着地させる者が足す（`PW-2`） |

---

## 13. 測り方の再現

```
# the tree: refactor 67605ad4 (CR-596 applied), branch jump-followups
git log --oneline -1 67605ad4                               # -> Rebuild dist with CR-596

# the rulings (section 0.1)
grep -n "^| JDG-79[0-9] \|^| JDG-90[0-6] " docs/development-records/rulings.md

# where the mark is cleared (section 0.2 items 1, 3, 4)
grep -rn "landingMark" src --include=*.ts | grep -v "\.test\."
grep -n "isLandingMarkClearedBy\|LANDING_MARK_CLEAR_ASKED" src/framework/single-html-shell/frame-loop.ts
grep -n '"印が出ているあいだの押下' docs/spec/_source/state-machines.json          # -> :1141

# the scroll and zoom inputs (section 0.2 item 2)
grep -n "^| MK-[1-7] \|^| PTD-1 \|^| SC-4 \|^| UN-8 \|^| UN-17 \|^| SK-1[68]\|^| SK-2[23] " docs/spec/01-04-requirements.md
grep -n "^| IC-1[0-5] \|^| IC-10[45] " docs/spec/_assets/tbl-glossary.md

# lane L4 (section 0.2 item 5)
git merge-base 67605ad4 lane-l4                              # -> 7665dcd8
git grep -c isLandingMarkClearedBy lane-l4 -- src/framework/single-html-shell/frame-loop.ts   # -> (none)
git diff 7665dcd8 lane-l4 --stat -- src/framework/single-html-shell/frame-loop.ts src/use-case/advance-screen-session/screen-values.ts

# tests that quote EL-17 (section 0.2 item 7)
grep -rln "押下・キー・ホイール\|修飾キーだけのものを含む" tests src docs tools

# graph (section 6)
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py EL-17 EL-18 UN-8
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/induced.py FR-009 T-303 T-280 T-027 T-023 T-036 T-023a
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/md-checks.py   # -> tables=212 figures=29 rows=2685 uids=176

# the sample: 10 inputs x 2 modes = 20 cases as ruled, page errors 0
node previous-project-result/22-jump-followups/sweep-sample.mjs
```

### 13.1 ⚠️ 測りが見られなかったもの

- 実物（`dist`）では見ていない。見本は仕様の値で描いた別物であり、見本の押し比べ（20 通り、ページのエラー 0）が確かめたのは表の案どおりに動くことだけである。
- 印を残したままスクロールするフレームの費用は測っていない（8 節の測りが測る）。
- 面・パネルの中のスクロールバーの押下が `InputSource` に届くかは確かめていない（決定 5）。
