# CR-570 — すべて開く入口は、いまの縦の倍率のまま全階層を描き、縦を縮めた最初の刻みで倍率の絵へ戻る

> 起草の状態: 起草（2026-09-25）。未着地。本書を書いた体は `docs/spec/`・`src/`・`tests/` に 1 字も書いていない（書いたのは本書と台帳の 3 行だけ）。
> 読んだ木: `3457e412`（調整役が渡した `origin/refactor`）。行番号・数・参照は、すべてこの木で測った（測り方は 13 節）。
> ID の帯: 調整役から `CR-570`・`JDG-590` 〜 `JDG-599`・`DFC-983` 〜 `DFC-989` を受けた（`DFC-982` は使用済み）。測った: 帯の中の ID は台帳の行としても木の文としても 0。本書が使うのは `JDG-590`・`JDG-591`・`DFC-983` と、表 T-206 の新しい行 `S-351`、表 T-280 の新しい状態機械 `lodSuspensionStateMachine` だけである。
> ⚠️ `S-351` は帯の外である —— 調整役は `S-` の帯を渡していない。測った: `git grep -w S-351` は木で 0、`git log --all -S"S-351"` も 0（その前後の番号は、ほかの CR がすでに採っている）。⛔ 当てる直前に測り直し、ほかの CR が採っていたら次の空きへ付け替えること —— 「いまの最大の次」で採った ID は、次のコミットで古くなる。
> 当てる順: ⛔ 段 8 の性能の測定（RISK-001）の**前**、`CR-569` の**後**。すべて開く入口が描く行の数が変わる（`sample-large-erp-program.ja.xml` の全体表示で 1 行 → すべての行）ので、測ってから当てると測り直しになる。
> ⛔ `src/framework/single-html-shell/frame-loop.ts` を触るほかの CR と同じ波に入れない。当てる直前に `file:line` を測り直すこと。
>
> 閉じるもの: `DFC-983`（すべて開く入口が、倍率で描かれていない行を開かない）。利用者の裁定 `JDG-590`・`JDG-591`（逐語は 0.1 節）。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 利用者の逐語（2026-09-25）

- 裁定 `JDG-590`: 「[vv]で押下した場合でもいったんは全階層を開く。 [v]で開いたタスクはそのあと縮小しても表示継続だろ？ [vv] は縮小したら折りたたむ。」
- 裁定 `JDG-591`（調整役が示した細部 3 つへの答え）: 「細部 1〜3 も推奨どおり。 ただし、Fixすると[v]も[vv]も、縮小時も開くモードを解除するのは既存の仕様通りね。」
- 調整役が渡した読み（本書はこれを満たす）:
  - 頭の [vv]（`IC-74`）は、いまの倍率のまま表示量の LOD（`FR-018`）を止めてすべての段を描く。開いたままの印は立てない。画面だけの一時の状態であり、文書に保存せず、取り消しの段も作らない。
  - 一時の状態は、行の軸（縦）を縮めた最初の刻みと、全体表示で終わる。横のズーム、拡大、スクロールでは終わらない。
  - 一時の状態のあいだに行の [v] を押すと、今と同じく印が立つ（縮めても残る）。
  - 行の [vv]（`IC-58`、`HF-2`・`KO-2`）も、その配下について同じ一時の扱いにする。
  - 全体表示は、開いたままの印（今の `FR-055`・`KO-7`）と一時の状態の両方を捨てる。
  - `IC-74` の構え: 畳みで隠れた行か、LOD で隠れた行が 1 つでもあれば押せる（今は畳まれた行が無いと押せない）。理由 `RS-31` もそれに合わせる。
  - `FR-018` の単調性（縮めて増えない）は保つ。

⭐ 調べた結果（`DFC-983` の詳細）:

- 深い行を隠しているのは人の畳みではなく、グループ LOD（`FR-018`、表 T-005a の `L-3`）である —— `src/entity/layout-engine/schedule-layout/schedule-layout.ts:356-361` が `groupDepthLimit`（`group-level-of-detail.ts:31-37`）より深い行を落とす。
- 頭の [vv] の翻訳（`src/adapter/input-command-translator/row-tree-entrances.ts:28-48`）は、畳み・隠し・印・段 0 の畳みのどれも無いと `noFoldedRowAtAll`（`RS-31`）を返す。倍率は動かさない（`HF-10` がそう定める）ので、倍率で落ちた行は押しても出ない。
- 行の [vv]（同 `:135-144`、構えは `:200-218`）は、押した行に印を立て（`KO-2`）、直下の子だけを倍率によらず描かせる —— 孫より下は倍率に従う（`HF-2` の「直下の子より深い行は `FR-018` の倍率に従わせる」）。
- 実測（13 節、`3457e412` の写しの木、1920 × 1080、`sample-large-erp-program.ja.xml` を取り込んだ文書、`CR-569` の前）: 開いた直後の絵は全体表示（`OP-10`）で 1 行、保存された `zoomY` は 1 のまま（絵は保存された倍率で描かれていない）。頭の [vv] は `RS-31`「畳まれている行が 1 つもありません」を返し、1 行のまま。根の行の [vv] は 13 行（根と、印が描かせる直下の子 12）—— 文書の行は 38。
- ⚠️ 調整役の調べにある「全体表示で根の [vv] が行を 13 → 1 に減らす」は、上の条件では再現しなかった（1 → 13 に増えた）。条件（画面の高さ・`CR-569` の後か）が違う可能性がある。本書の変更の後は、どちらの条件でも根の [vv] は根の配下のすべての行を描く。

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

`GL-002`（`CH-2`、縮めても全体を 1 枚で俯瞰させる）—— 全体表示で俯瞰したあと、「すべて開く」の 1 手で、いまの倍率のまま中身をすべて見られる。縮めれば俯瞰の絵へ戻る。
`GL-006`（初見で使える）—— 「すべて開く」を押して何も起きない（`RS-31`「畳まれた行が 1 つも無い」なのに行が隠れている）入口が無くなる。

### ② レビュー観点のどの条項を当て、何が出たか

- `R1.3`（矛盾が無い、唯一の正）—— 一時開放の立て方と終え方は 表 T-280 の `lodSuspensionStateMachine` の 1 か所、置き場は 表 T-206 の `S-351` の 1 か所に置く。`FR-018` はその 2 つを名指し、`HF-2`・`HF-10`・`HF-8`・`FR-055` は `FR-018` を名指して写さない。
- `R1.2`（検証できる）—— 終わる条件は「書き込みの後に描く縦の倍率が、覚えた縦の倍率より小さい」の 1 つの比較と、全体表示・置き換えの 2 つの出来事だけで決まり、状態機械の試験で確かめられる。
- `R1.1`（抜けが無い）—— 印（表 T-254）が扱わない「倍率で落ちた行をいまだけ描く」状態が、仕様のどこにも無かった。`FR-018` の新しい段で埋める。
- `R4.x`（状態機械）—— 新しい状態機械を 1 つ足す。状態 2 つ、出来事 4 つ。どの升も「→ 先 [ガード]」で言い切る（生成された表の「それ以外 → —」を含む）。

### ③ 利用者に問わずに決めたこと

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| 決定 1 | 一時開放は、行の状態（`AT-56`・`AT-57`・`AT-142`）ではなく画面の値とし、状態機械 `lodSuspensionStateMachine`（表 T-280）が持つ。置き場の行は 表 T-206 の `S-351` | 裁定が「保存しない・取り消しの段を作らない」と定めた。先例は段 0 の畳み（`S-211`、`levelZeroFoldStateMachine`） | 取り消しで [vv] の書き込み（畳みと印）を戻しても、一時開放は戻らない（決定 7） |
| 決定 2 | 一時開放は範囲（すべての行か、行の組）と、立てたときに描いていた縦の倍率を覚える。書き込みの後に描く縦の倍率が覚えた倍率より小さければ終え、大きければ覚えた倍率をその値へ上げる | 裁定の「縦を縮めた最初の刻みで終わる」。上げないと、拡大してから 1 刻み縮めても覚えた倍率より下がるまで続き、「最初の刻み」が破れる | — |
| 決定 3 | 比べるのは「描いている縦の倍率」であって、保存された `zoomY` ではない | 実測（0.1 節）: 開いた直後は全体表示の絵（`OP-10`）で、保存された `zoomY` は 1 のまま。保存値で比べると、全体表示の絵から拡大した最初の書き込みが「縮めた」に見えることがある | — |
| 決定 4 | 縦の倍率が下限にあって、縮める押下が倍率を変えないとき（`ZE-5` の端の知らせ）は、一時開放を終えない | 終わる条件は「描く縦の倍率が下がった書き込み」であり、何も書かない押下は何も変えない（`FR-031`） | 下限で [vv] を押したあとは、拡大してから縮めるか、全体表示で戻す。⚠️ 11 節の問い 2 |
| 決定 5 | 行の [vv] を続けて押すと範囲を足し合わせる。頭の [vv] はすべての行にする | 覚えた倍率はいつも描いている倍率と等しい（決定 2）ので、倍率は 1 つで足りる | — |
| 決定 6 | 現在の文書が置き換わったとき（`OP-3` の置き換え）も終える | 範囲は前の文書の行の id を指している。すべての行の範囲が次の文書に残ると、開いた直後から LOD が効かない | 状態機械に出来事が 1 つ増える（`documentSwapped`） |
| 決定 7 | 取り消し・やり直しは一時開放に触れない | 裁定「取り消しの段を作らない」。一時開放は人の畳みと隠しに勝たないので、畳みを戻せば畳みが勝つ | [vv] を取り消すと、畳みは戻るが、倍率で落ちていた行は（縮めるまで）描かれたまま |
| 決定 8 | 全体表示で一時開放を終える入口は `IC-10` と `SK-18`（どちらも `FR-055`）。起動の全体表示（`OP-10`）は一時開放を持たない | 裁定 `JDG-591`。`HF-8` は起動では働かない（`OP-10`） | — |
| 決定 9 | 書き出しの絵（`FR-080` の `EP-11`・`EP-12`）は、画面と同じく一時開放を読んで描く | `pictureSessionOf`（`frame-loop.ts:810-820`）が段 0 の畳みを引き継ぐのと同じ理由 —— 画面と書き出しで描く行が違うと、`DFC-229` の試験（`tests/system/measured-sweep.test.ts:3408`）が言う食い違いになる | — |
| 決定 10 | 一時開放のあいだ、1 階層開く [v]（`HF-13`）は、一時開放のおかげで描かれているだけの直下の子を「開ける子」と数えて押せるようにし、押せば `KO-1` の印を立てる | 裁定の読み「一時の状態のあいだに [v] を押すと今と同じく印が立つ」。数えないと、一時開放で子がすべて描かれているので [v] が薄くなり、`RS-30` を返す | — |
| 決定 11 | `RS-28`（行の [vv] の理由）の文と語は変えない | 構えが広がっても、`RS-28` が出る場面（配下に描かれていない行も印も無い）では「配下に、開ける行が 1 つも無い」は真のまま | 英語の語 "There is no folded group under this row to open" は倍率の場合を言わない |
| 決定 12 | 全畳み（`HF-12`）と行の畳み（`HF-11`）・隠し（`HF-3`）は一時開放を終えない | 一時開放は人の畳みと隠しに勝たないので、畳めば畳みが勝つ。終える入口を増やすと、裁定の言う「縮めたら閉じる」以外の終わり方ができる | 全畳みのあと 1 階層ずつ開くと、開いた行の配下は（縮めるまで）倍率によらず描かれる |

---

## 1. 範囲 —— 要求ごとの行き先

| 要求 | 仕様で変える所 | 編集 |
|---|---|---|
| R1 行の [vv] は印を立てず、配下に一時開放を立てる。構えは「配下に描かれていない行があるか、印があるか」 | 表 T-051 の `HF-2` | E-01 |
| R2 頭の [vv] はすべての行に一時開放を立てる。構えは「描かれていない行か印があるか」 | 表 T-051 の `HF-10` | E-02 |
| R3 全体表示が一時開放を終える | 表 T-051 の `HF-8`、`FR-055` の RATIONALE | E-03、E-11、E-12 |
| R4 [v] が一時開放のあいだも押せて印を立てる | 表 T-051 の `HF-13` | E-04 |
| R5 構えの数え方と、行の状態 2 つの規則が一時開放を名指す | 表 T-051 の下の注 3 か所 | E-05、E-06、E-07 |
| R6 行の [vv] の印の書き換え | 表 T-254 の `KO-2` と、その下の注 | E-08、E-09 |
| R7 一時開放の規則（範囲・終わり方・単調性・保存しない） | `FR-018` の RATIONALE に段を 1 つ足す | E-10 |
| R8 取り消しは一時開放を戻さない | `FR-031` の段（`UN-17` の下） | E-13 |
| R9 頭の [vv] の理由 | 表 T-233 の `RS-31` の場面と、その語 | E-14、E-15 |
| R10 描く行の選びとユニットの責務 | `05-07-design.md` の 表 T-068 の `LC-2`、表 T-075 の `UF-139`・`UF-96` | E-16、E-17、E-18 |
| R11 置き場の行 | 表 T-206 に `S-351`（`_source/settings.json`） | J-01 |
| R12 立て方と終え方 | 表 T-280 に出来事 4 つと状態機械 1 つ（`_source/state-machines.json`） | J-02、J-03 |

数: 仕様の文の編集 17（E-01 〜 E-14・E-16 〜 E-18）、辞書の原稿の編集 1（E-15）、原稿 JSON の編集 3（J-01 〜 J-03）。`npm run gen` が刷り直すもの: `_assets/tbl-settings.md`（`S-351`）、`_assets/tbl-state-machines.md`（表 T-280 と図 F-026 の節）、`src/use-case/advance-screen-session/screen-values.ts` の生成の区画、`src/adapter/screen-renderer/display-words.json`。

---

## 2. 新しい識別子

- 表 T-206 の行 `S-351`（測った: 木のどこにも、どの枝の歴史にも現れない。退いた ID の名簿 `retired.py` にも無い）。
- 表 T-280 の状態機械 `lodSuspensionStateMachine`（状態 `inForce`・`suspended`）と、出来事 `screen/openEveryLevelPressed`・`screen/fitPressed`・`screen/rowZoomSettled`・`screen/documentSwapped`、ガード `isBelowSuspendedZoom`・`isAboveSuspendedZoom`（測った: どれも木に 0）。
- 用語「表示量の一時開放」（測った: 木に 0）。
- 表・要求・表示語の行は 0（`RS-31` は語を差し替えるだけ）。
- 台帳の行 `JDG-590`・`JDG-591`・`DFC-983`（本書と同じコミットで書いた。12 節）。

---

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

| 旧（`3457e412`） | 新 | 理由 |
|---|---|---|
| `HF-2` の「押したときは、押した行に開いたままの印を立て、」 | 「押したときは、押した行とその配下の行をすべて人の指定の無い状態へ戻すこと（MUST）」＋「開いたままの印を立ててはならない（MUST NOT）」 | 裁定「[vv] は縮小したら折りたたむ」。印を立てると、縮めても直下の子が残る |
| `HF-2` の「押した人がその行の中を見たいことは明らかだが、どの深さまで開きたいかは明らかでないので、直下の子より深い行は `FR-018` の倍率に従わせる。」 | 一時開放を立てる MUST（E-01） | 裁定「いったんは全階層を開く」。消える理由（深さが明らかでない）は、縮めれば倍率に戻ることで置き換わる |
| `HF-2` の構えの「押した行かその配下に畳みか隠しがあるとき、配下に開いたままの印があるとき、押した行に印が無く直下の子が `FR-018` の倍率で描かれていないとき」 | 「押した行の配下に描かれていない行が 1 つでもあるとき（…）と、押した行かその配下に開いたままの印があるとき」 | 倍率で落ちた孫より下も、押せば描かれる。⚠️ 押した行の印が「印がある」に入る（押せば外れる） |
| `HF-2` の「⭐ 倍率で描かれていない直下の子は、開ける子として数える（数え方は `HF-13` と同じである）。」 | （消す。上の構えの文が含む） | 直下の子だけを数える理由（直下の子だけが印で描かれる）が消える |
| `HF-10` の「⭐ 畳み・隠し・開いたままの印のどれも 1 つも無いときだけ、`FR-029` に従って薄く描くこと（MUST） —— 印も本行が戻すものなので、印が 1 つでも立っていれば押しは何かを変える。」 | 「⭐ 描かれていない行も開いたままの印も 1 つも無いときだけ、…薄く描くこと（MUST） —— 描かれていない行は、段 0 の畳み・人の畳み・隠し・`FR-018` の倍率のどれで…」＋「⚠️ 印も本行が戻すものなので、…」 | 裁定の読み（構え）。後半の文は 1 字も落とさずに別の文として残す |
| `HF-10` の段 0 の注「段 0 には印を立てず（上の段）、」 | （消す） | `HF-2` がもう印を立てないので、段 0 だけが立てない理由が要らない |
| 表 T-254 の `KO-2` の印の欄「押した行には立て、配下の行からは外す」 | 「外す」 | 決定と裁定（上の 1 行目）。書き換える行の欄は変えない |
| 表 T-254 の下の注の「（`KO-2` の配下、`KO-4`、`KO-5`）」 | 「（`KO-2`、`KO-4`、`KO-5`）」 | `KO-2` は押した行の印も外す |
| 表 T-233 の `RS-31` の場面「畳まれた行が 1 つも無い」 | 「描かれていない行も、開いたままの印も 1 つも無い」 | 構えの条件（E-02）と同じ言葉にする |
| `RS-31` の語（ja「畳まれている行が 1 つもありません」／ en "No row is folded"、次の手 ja「どれかの行を畳んでから、もう一度押してください」／ en "Fold a row first, then press again"） | ja「すべての行が、もう開いて描かれています」／ en "Every row is already open and drawn"、次の手 ja「どれかの行を畳むか、縦に縮小してから、もう一度押してください」／ en "Fold a row or zoom out vertically, then press again" | 倍率で落ちた行があれば押せるようになったので、「畳まれていない」だけでは理由にならない |
| `tests/unit/cr-404-a-row-opened-by-hand-stays-open.test.ts:543` の場合「claim 8 KO-2: [vv] on a folded R marks R, …」 | R に印が無いことを確かめる場合 | E-08 |
| 同 `:684` の場合「claim 14 …: [vv] over rows dropped by zoom only is thin, answers RS-28 and writes nothing」 | 倍率だけで落ちた行の上の [vv] は押せて、配下をすべて描き、印を書かない場合 | E-01 |
| `tests/unit/cr-541-row-title-panel-open-all-and-reset.test.ts:11`・`:15` の逐語 Q02・Q06、`:78`・`:89` の場合 | 新しい文の逐語と、新しい構え | E-01・E-02 |
| `tests/unit/cr-438-pointer-panels-row-entrances-row-grab-and-frame-drags.test.ts:258` の場合「HF-2 / HR-3 / KO-2: IC-58 marks the pressed row …」 | 押した行に `keptOpen: true` を書かない場合 | E-08 |
| `tests/unit/t-015-t-051-the-four-folding-controls.test.ts:1200` の逐語（`HF-2` の構え） | 新しい構えの逐語 | E-01 |
| `tests/contract/t-233-reason-words-tell-the-row.contract.test.ts:209` の `RS-31` の指紋 `5b41d6369c8ea593` | 新しい場面と語の指紋 | E-14・E-15 |

⭐ 消さないもの: `KO-3`（頭の [vv] はすべての印を外す —— 11 節の問い 1 の推奨）、`HF-2` の「⚠️ そのため、構えの条件は `HF-18` の数と同じではない —— …」（試験 `t-015-…:1364`・`:1366` が逐語で引く。文はそのまま真）、`HF-10` の「⚠️ **倍率も表示位置も動かさない**」（一時開放は倍率を動かさない）、`HR-1`・`HR-3`（畳みと隠しの効果は変わらない）。

---

## 4. 書き直す所（当てる体がそのまま使う文）

⚠️ 下の旧の塊は、`3457e412` の木でどれもちょうど 1 度現れ、写しの木に全部当たった（13 節）。
⚠️ 文の中に日付・利用者の名・裁定の番号を書かない（検査 `check-spec-holds-no-history.py`）。逐語は `rulings.md` の `JDG-590`・`JDG-591` だけが持つ。
⚠️ J-01 〜 J-03 の後に `npm run gen` を走らせる（`_assets/tbl-settings.md`・`_assets/tbl-state-machines.md` を手で直さない。検査 16）。

<!-- EDIT id=E-01 file=docs/spec/01-04-requirements.md -->

旧（表 T-051 の HF-2 の、押したときと構えの文）
```text
⭐ 押したときは、押した行に開いたままの印を立て、その配下の行はすべて人の指定の無い状態へ戻すこと（MUST） —— 配下の畳み・隠し・開いたままの印を外す（書き換える行は 表 T-254 の `KO-2`）。<br>押した人がその行の中を見たいことは明らかだが、どの深さまで開きたいかは明らかでないので、直下の子より深い行は `FR-018` の倍率に従わせる。<br>⭐ 押しても何も変わらないときだけ、`FR-029` に従って薄く描くこと（MUST） —— 押しが何かを変えるのは、押した行かその配下に畳みか隠しがあるとき、配下に開いたままの印があるとき、押した行に印が無く直下の子が `FR-018` の倍率で描かれていないときである。<br>⭐ 倍率で描かれていない直下の子は、開ける子として数える（数え方は `HF-13` と同じである）。<br>
```
新
```text
⭐ 押したときは、押した行とその配下の行をすべて人の指定の無い状態へ戻すこと（MUST） —— 畳み・隠し・開いたままの印を外す（書き換える行は 表 T-254 の `KO-2`）。<br>⭐ あわせて、押した行とその配下のすべてに、表示量の一時開放（`FR-018`）を立てること（MUST） —— 押した人が求めているのは、いまの倍率でその行の中をすべて見ることである。<br>⛔ 開いたままの印を立ててはならない（MUST NOT） —— 縦の倍率を下げれば一時開放が終わり、配下は `FR-018` の倍率に従って畳まれる。<br>⚠️ 縮めても描き続けたい行には、1 階層開く入口（`HF-13`）が印を立てる。<br>⭐ 押しても何も変わらないときだけ、`FR-029` に従って薄く描くこと（MUST） —— 押しが何かを変えるのは、押した行の配下に描かれていない行が 1 つでもあるとき（人の畳み・隠し・`FR-018` の倍率のどれで描かれていなくても数える）と、押した行かその配下に開いたままの印があるときである。<br>
```

<!-- EDIT id=E-02 file=docs/spec/01-04-requirements.md -->

旧（表 T-051 の HF-10 の、押したときと構えの文）
```text
⭐ 押したときは、すべての行を人の指定の無い状態へ戻すこと（MUST） —— 畳みと隠し（`HR-1`）に加えて、開いたままの印もすべて外す（表 T-254 の `KO-3`）。<br>⭐ 畳み・隠し・開いたままの印のどれも 1 つも無いときだけ、`FR-029` に従って薄く描くこと（MUST） —— 印も本行が戻すものなので、印が 1 つでも立っていれば押しは何かを変える。<br>⚠️ 薄いときの理由は 表 T-233 の `RS-31` である
```
新
```text
⭐ 押したときは、すべての行を人の指定の無い状態へ戻すこと（MUST） —— 畳みと隠し（`HR-1`）に加えて、開いたままの印もすべて外す（表 T-254 の `KO-3`）。<br>⭐ あわせて、すべての行に表示量の一時開放（`FR-018`）を立てること（MUST） —— 倍率を動かさずに、いまの倍率ですべての段を描く。<br>⛔ どの行にも印を書き足してはならない（MUST NOT） —— 理由は `HF-2` が持つ。<br>⭐ 描かれていない行も開いたままの印も 1 つも無いときだけ、`FR-029` に従って薄く描くこと（MUST） —— 描かれていない行は、段 0 の畳み・人の畳み・隠し・`FR-018` の倍率のどれで描かれていなくても数える。<br>⚠️ 印も本行が戻すものなので、印が 1 つでも立っていれば押しは何かを変える。<br>⚠️ 薄いときの理由は 表 T-233 の `RS-31` である
```

<!-- EDIT id=E-03 file=docs/spec/01-04-requirements.md -->

旧（表 T-051 の HF-8 の末尾）
```text
⭐ あわせて、表 T-254 の `KO-7` のとおり、開いたままの印をすべて外すこと（MUST） —— ⚠️ 上の「畳みだけ」は隠した状態と対にした言い方であり、この印は人が開いた状態なので、畳みと同じ側に立つ。 |
```
新
```text
⭐ あわせて、表 T-254 の `KO-7` のとおり、開いたままの印をすべて外すこと（MUST） —— ⚠️ 上の「畳みだけ」は隠した状態と対にした言い方であり、この印は人が開いた状態なので、畳みと同じ側に立つ。<br>⭐ 表示量の一時開放（`FR-018`）も終えること（MUST） —— 一時開放は `HF-10` と `HF-2` が立てる、人が開いた状態であり、印と同じ側に立つ。 |
```

<!-- EDIT id=E-04 file=docs/spec/01-04-requirements.md -->

旧（表 T-051 の HF-13 の、倍率で描かれていない子の文）
```text
⭐ 直下の子が `FR-018` の倍率で描かれていないときは、その子を開ける直下の子として数えること（MUST） —— 押下が 表 T-254 の `KO-1` の印を立て、その子を倍率によらず描かせるからである。<br>
```
新
```text
⭐ 直下の子が `FR-018` の倍率で描かれていないときは、その子を開ける直下の子として数えること（MUST） —— 押下が 表 T-254 の `KO-1` の印を立て、その子を倍率によらず描かせるからである。<br>⭐ 直下の子が表示量の一時開放（`FR-018`）があるから描かれているだけのときも、同じく開ける直下の子として数えること（MUST） —— 一時開放は縦の倍率を下げると終わるので、印を立てれば、終わった後もその子が描かれ続ける。<br>
```

<!-- EDIT id=E-05 file=docs/spec/01-04-requirements.md -->

旧（表 T-051 の下、構えの注）
```text
⚠️ ただし `HF-2` と `HF-10` は、開いたままの印（表 T-254）を外すことも、行うことに数える —— 印も両者が人の指定の無い状態へ戻すものだからである（`HF-2`、`HF-10`）。  
```
新
```text
⚠️ ただし `HF-2` と `HF-10` は、開いたままの印（表 T-254）を外すことも、行うことに数える —— 印も両者が人の指定の無い状態へ戻すものだからである（`HF-2`、`HF-10`）。  
⚠️ また `HF-2` と `HF-10` は、倍率で描かれていない行を描かせることも、行うことに数える —— 両者は表示量の一時開放（`FR-018`）を立てるので、その行は押しの後に描かれる。  
```

<!-- EDIT id=E-06 file=docs/spec/01-04-requirements.md -->

旧（表 T-051 の下、行の状態 2 つの注）
```text
⚠️ 同書の `AT-142`（表 T-254 の開いたままの印）は、上の 2 つに数えない —— 行を描かない側へは働かず、`FR-018` が倍率で落とす行を描く側へ戻すだけであり、人が畳んだ状態と隠した状態には勝たないからである。
```
新
```text
⚠️ 同書の `AT-142`（表 T-254 の開いたままの印）は、上の 2 つに数えない —— 行を描かない側へは働かず、`FR-018` が倍率で落とす行を描く側へ戻すだけであり、人が畳んだ状態と隠した状態には勝たないからである。  
⚠️ 表示量の一時開放（`FR-018`）も同じ理由で上の 2 つに数えない —— そのうえ行の状態ではなく、画面の状態である。
```

<!-- EDIT id=E-07 file=docs/spec/01-04-requirements.md -->

旧（段 0 の注の最後の文）
```text
⇒ `HF-10` は `HF-2` を段 0 に対して行うので、段 0 には印を立てず（上の段）、その配下にあたるすべての行から印を外す（同表の `KO-3`）。
```
新
```text
⇒ `HF-10` は `HF-2` を段 0 に対して行うので、その配下にあたるすべての行から印を外し（同表の `KO-3`）、すべての行に表示量の一時開放（`FR-018`）を立てる。
```

<!-- EDIT id=E-08 file=docs/spec/01-04-requirements.md -->

旧（表 T-254 の KO-2 の行）
```text
| KO-2 | `HF-2`（`HR-3`） | 押した行には立て、配下の行からは外す | 押した行と、その配下のすべての行 |
```
新
```text
| KO-2 | `HF-2`（`HR-3`） | 外す | 押した行と、その配下のすべての行 |
```

<!-- EDIT id=E-09 file=docs/spec/01-04-requirements.md -->

旧（表 T-254 の下、印を外す入口の注の一部）
```text
（`KO-2` の配下、`KO-4`、`KO-5`）
```
新
```text
（`KO-2`、`KO-4`、`KO-5`）
```

<!-- EDIT id=E-10 file=docs/spec/01-04-requirements.md -->

旧（FR-018 の RATIONALE、表 T-254 の下の最後の文）
```text
⚠️ 頭の 1 階層開く（表 T-051 の `HF-16`）は本表に無い —— 段 0 は印を持たず、その直下の最も浅い段は本要求が倍率で落とさない（`FR-004` の、パネルの頭を段 0 とする段）。
```
新
```text
⚠️ 頭の 1 階層開く（表 T-051 の `HF-16`）は本表に無い —— 段 0 は印を持たず、その直下の最も浅い段は本要求が倍率で落とさない（`FR-004` の、パネルの頭を段 0 とする段）。

⭐ **表示量の一時開放** —— すべて開く入口（`HF-10` と `HF-2`）が押されたとき、その押下が開いた範囲を、本要求の対象から外すこと（MUST） —— 範囲は、`HF-10` ではすべての行、`HF-2` では押した行とその配下のすべてである。  
⭐ 一時開放は、描く縦の倍率を下げた最初の書き込みと、全体表示（`FR-055`）で終えること（MUST） —— 縦の倍率を上げること、横の倍率を変えること、表示位置を動かすことは、一時開放を終えない。  
⭐ 現在の文書が置き換わったとき（表 T-024a の `OP-3`）も終えること（MUST） —— 範囲は前の文書の行を指している。  
⇒ 立て方と終え方は `_assets/tbl-state-machines.md` の 表 T-280 の `lodSuspensionStateMachine` が、置き場は `_assets/tbl-settings.md` の 表 T-206 の `S-351` が持つ。  
⛔ 一時開放は開いたままの印ではない —— 印を立ても外しもせず、表 T-254 に行を持たない。  
⛔ **一時開放は人の畳みと隠しに勝たない** —— 範囲の中でも、畳まれた行と隠れた行の下は描かれないままである（`HF-7`）。  
⭐ **落とす向きの単調性はこの免除でも壊れない** —— 一時開放は描く縦の倍率を下げた最初の書き込みで終わり、そのあとの絵は下げた倍率での本要求の絵なので、下げる前の絵より多くを描かない。  
⛔ 一時開放を文書に保存してはならず、取り消しの段に入れてもならない（MUST NOT） —— 理由は置き場の行（`S-351`）が持つ。
```

<!-- EDIT id=E-11 file=docs/spec/01-04-requirements.md -->

旧（FR-055 の RATIONALE、印を外す理由の文）
```text
⭐ 開いたままの印（表 T-254 の `KO-7`）も同じ理由で外す —— 外さないと、印が描かせる行のぶんだけ「全体」が伸び、収める対象がやはり人の操作で変わる。  
```
新
```text
⭐ 開いたままの印（表 T-254 の `KO-7`）も同じ理由で外す —— 外さないと、印が描かせる行のぶんだけ「全体」が伸び、収める対象がやはり人の操作で変わる。  
⭐ 表示量の一時開放（`FR-018`）も同じ理由で終える —— 終えないと、一時開放が描かせる行のぶんだけ「全体」が伸びる。  
```

<!-- EDIT id=E-12 file=docs/spec/01-04-requirements.md -->

旧（FR-055 の RATIONALE、下限の対象外の文）
```text
⚠️ **開いたままの印（表 T-254）が描かせる行も、この下限の対象外である** —— 免除の規則は `FR-018` が持つ。  
```
新
```text
⚠️ **開いたままの印（表 T-254）と表示量の一時開放が描かせる行も、この下限の対象外である** —— 免除の規則は `FR-018` が持つ。  
```

<!-- EDIT id=E-13 file=docs/spec/01-04-requirements.md -->

旧（FR-031 の、全体表示の取り消しの段の最後の文）
```text
⭐ 同じ押下が外した開いたままの印（表 T-254 の `KO-7`）も、その 1 段で戻る。
```
新
```text
⭐ 同じ押下が外した開いたままの印（表 T-254 の `KO-7`）も、その 1 段で戻る。  
⚠️ 同じ押下が終えた表示量の一時開放（`FR-018`）は戻らない —— 取り消しの段に入らない画面の状態である。
```

<!-- EDIT id=E-14 file=docs/spec/01-04-requirements.md -->

旧（表 T-233 の RS-31 の行）
```text
| RS-31 | 畳まれた行が 1 つも無い | `NT-1` | 表 T-051 の `HF-10` |
```
新
```text
| RS-31 | 描かれていない行も、開いたままの印も 1 つも無い | `NT-1` | 表 T-051 の `HF-10` |
```

<!-- EDIT id=E-15 file=docs/spec/_source/display-words.json -->

旧（RS-31 の語）
```text
    "ja": "畳まれている行が 1 つもありません",
    "en": "No row is folded"
   },
   "nextStep": {
    "ja": "どれかの行を畳んでから、もう一度押してください",
    "en": "Fold a row first, then press again"
```
新
```text
    "ja": "すべての行が、もう開いて描かれています",
    "en": "Every row is already open and drawn"
   },
   "nextStep": {
    "ja": "どれかの行を畳むか、縦に縮小してから、もう一度押してください",
    "en": "Fold a row or zoom out vertically, then press again"
```

<!-- EDIT id=E-16 file=docs/spec/05-07-design.md -->

旧（表 T-068 の LC-2 の行）
```text
| LC-2 | 2 | 表示量を増減し、描く対象を決める | 縦横の倍率 ／ 開いたままの印（表 T-254） | `FR-018` ／ 表 T-005a |
```
新
```text
| LC-2 | 2 | 表示量を増減し、描く対象を決める | 縦横の倍率 ／ 開いたままの印（表 T-254） ／ 表示量の一時開放（`_assets/tbl-settings.md` の 表 T-206 の `S-351`） | `FR-018` ／ 表 T-005a |
```

<!-- EDIT id=E-17 file=docs/spec/05-07-design.md -->

旧（表 T-075 の UF-139 の責務の欄の一部）
```text
開いたままの印が残す行を答え（表 T-254）、
```
新
```text
開いたままの印が残す行（表 T-254）と、表示量の一時開放が残す行（`S-351`）を答え、
```

<!-- EDIT id=E-18 file=docs/spec/05-07-design.md -->

旧（表 T-075 の UF-96 の責務の欄）
```text
行の畳み・開き・隠し・足しの入口を、表 T-015・表 T-051・表 T-254 に従って書き込みに変える |
```
新
```text
行の畳み・開き・隠し・足しの入口を、表 T-015・表 T-051・表 T-254 に従って書き込みに変える。<br>すべて開く入口（`HF-10`・`HF-2`）は、書き込みとあわせて、表示量の一時開放を立てる押下を答える（表 T-280 の `lodSuspensionStateMachine`） |
```

<!-- JSON id=J-01 file=docs/spec/_source/settings.json op=insert-row-after anchor=S-211 -->

```json
{
 "id": "S-351",
 "value": {
  "ja": "表示量の一時開放（`FR-018`）が立っているか。立っているときは、その範囲（すべての行か、すべて開く入口を押した行の組）と、立てたときに描いていた縦の倍率"
 },
 "default": {
  "ja": "立っていない"
 },
 "note": {
  "ja": "⭐ 立てるのはすべて開く入口（`HF-10` と `HF-2`）であり、終えるのは描く縦の倍率を下げた最初の書き込みと、全体表示（`FR-055`）と、文書の置き換え（`OP-3`）である —— 規則は `FR-018` が、遷移は 表 T-280 の `lodSuspensionStateMachine` が持つ。⭐ 描く縦の倍率を上げる書き込みは、覚えている倍率をその値へ上げる —— 上げないと、拡大してから 1 刻み縮めても覚えた倍率より下がるまで一時開放が続き、「下げた最初の書き込みで終える」が破れる。⚠️ 比べるのは描いている縦の倍率であり、保存された `zoomY` ではない —— 全体表示の絵（`OP-10`）は `zoomY` を保存しない。⛔ **保存しない** —— いま画面を見ている人の一時の求めであり、文書を開き直す人へ引き継ぐものではない。⛔ 取り消しの段に入れない —— 取り消しが戻すのは文書であり、一時開放は文書に無い。⚠️ 数を 1 つも持たない —— しきい値は `S-87`・`S-88` のまま使う。"
 }
}
```

<!-- JSON id=J-02 file=docs/spec/_source/state-machines.json op=insert-events-after region=screen anchor=levelZeroOpened -->

```json
[
 {
  "key": "openEveryLevelPressed",
  "source": {
   "kind": "input",
   "rows": [
    "HF-10",
    "HF-2",
    "S-351"
   ],
   "note": {
    "ja": "押下が何かを行うときだけ。薄い入口の押下は送らない"
   }
  },
  "carries": [
   {
    "name": "scope",
    "note": {
     "ja": "開いた範囲。すべての行か、押した行"
    }
   },
   {
    "name": "zoomY",
    "note": {
     "ja": "押したときに描いていた縦の倍率"
    }
   }
  ]
 },
 {
  "key": "fitPressed",
  "source": {
   "kind": "input",
   "rows": [
    "IC-10",
    "SK-18",
    "FR-055"
   ]
  },
  "carries": []
 },
 {
  "key": "rowZoomSettled",
  "source": {
   "kind": "effectResult",
   "rows": [
    "FR-018",
    "S-351"
   ],
   "note": {
    "ja": "書き込みで、描く縦の倍率が変わった"
   }
  },
  "carries": [
   {
    "name": "zoomY",
    "note": {
     "ja": "書き込みの後に描く縦の倍率"
    }
   }
  ]
 },
 {
  "key": "documentSwapped",
  "source": {
   "kind": "effectResult",
   "rows": [
    "OP-3",
    "S-351"
   ],
   "note": {
    "ja": "置き換えで、現在の文書が別の文書になった"
   }
  },
  "carries": []
 }
]
```

<!-- JSON id=J-03 file=docs/spec/_source/state-machines.json op=insert-machine-after region=screen anchor=levelZeroFoldStateMachine -->

```json
{
 "name": "lodSuspensionStateMachine",
 "states": [
  {
   "key": "inForce",
   "parent": null,
   "initial": true,
   "carries": [],
   "evidence": [
    "FR-018",
    "S-351"
   ]
  },
  {
   "key": "suspended",
   "parent": null,
   "initial": false,
   "carries": [
    {
     "name": "scope",
     "note": {
      "ja": "すべての行か、行の組"
     }
    },
    {
     "name": "zoomY",
     "note": {
      "ja": "覚えている縦の倍率"
     }
    }
   ],
   "evidence": [
    "HF-10",
    "HF-2",
    "S-351"
   ]
  }
 ],
 "transitions": {
  "openEveryLevelPressed": {
   "inForce": {
    "to": "suspended",
    "evidence": [
     "HF-10",
     "HF-2",
     "FR-018"
    ]
   },
   "suspended": {
    "to": "suspended",
    "evidence": [
     "HF-10",
     "HF-2",
     "FR-018"
    ],
    "note": {
     "ja": "`scope` を足し合わせ（どちらかがすべての行ならすべての行）、`zoomY` を書き換える"
    }
   }
  },
  "fitPressed": {
   "suspended": {
    "to": "inForce",
    "evidence": [
     "FR-055",
     "HF-8",
     "S-351"
    ]
   }
  },
  "rowZoomSettled": {
   "suspended": [
    {
     "to": "inForce",
     "guard": [
      {
       "name": "isBelowSuspendedZoom"
      }
     ],
     "evidence": [
      "FR-018",
      "S-351"
     ]
    },
    {
     "to": "suspended",
     "guard": [
      {
       "name": "isAboveSuspendedZoom"
      }
     ],
     "evidence": [
      "FR-018",
      "S-351"
     ],
     "note": {
      "ja": "`zoomY` を書き換える"
     }
    }
   ]
  },
  "documentSwapped": {
   "suspended": {
    "to": "inForce",
    "evidence": [
     "FR-018",
     "OP-3",
     "S-351"
    ]
   }
  }
 }
}
```

---

## 5. 継ぎ目 —— 両側の依頼文にこのまま写すこと

⚠️ `frame-loop.ts` は避けられない —— 画面の値（`ScreenSession`）と、書き込み済みの文書と、`layoutFromSchedule` の呼び出しを 1 か所で持つのはこのユニットだけである（`UF-48`）。先例は段 0 の畳み（`isLevelZeroFoldedIn`、`frame-loop.ts:838-840`）。⛔ 足すのは下の 6 か所だけとし、判定（縮めたか・範囲を足すか）は状態機械（`screen-values.ts`）と翻訳係に置く。

| 継ぎ目 | 形 |
|---|---|
| 範囲の型 | `LodSuspensionScope = 'everyRow' \| readonly string[]`（`src/entity/layout-engine/schedule-layout/group-level-of-detail.ts` が公開する。`PI-5` には足さない —— `keptInViewByOpenMarks` と同じく兄弟の内側） |
| 描く行 | 同ファイルに `keptInViewByLodSuspension(unfoldedRows: readonly TaskGroup[], scope: LodSuspensionScope \| null): ReadonlySet<string>` —— `'everyRow'` ならすべて、行の組ならその行と配下のすべて。注は `// see FR-018, S-351`。⛔ 読むのは `unfoldedRows`（人の畳みと隠しを落とした後）だけ —— 一時開放が `HF-7` に勝たないのはこれで保たれる |
| 描く行の選び | `layoutFromSchedule`（`schedule-layout.ts:343-361`）に 7 つ目の省略できる引数 `lodSuspension?: LodSuspensionScope \| null` を足し、`rows` の条件（`:359-361`）に `\|\| suspendedIds.has(glyph.id)` を足す。⛔ `fit-zoom.ts:171` と `view-place.ts` の呼び出しには渡さない —— 全体表示は一時開放を終えるので、収める絵は一時開放の無い絵である |
| 状態機械 | `npm run gen` が `screen-values.ts` の生成の区画に `lodSuspensionState` の型と遷移表を刷る。手で書くのは 4 つの出来事の処理だけ: `openEveryLevelPressed`（範囲を足し合わせ、`zoomY` を書く）、`rowZoomSettled`（`zoomY` < 覚えた値 → `inForce`、> → 覚えた値を上げる、= → 同じ参照）、`fitPressed`・`documentSwapped`（→ `inForce`）。副作用は 0 |
| 翻訳係 | `InputContext`（`input-command-translator.ts:181` の隣）に `readonly lodSuspension?: LodSuspensionScope \| null` と `readonly drawnZoomY?: number`。`InputAction` の `changeDocument` と `setLevelZeroFolded` に省略できる `readonly suspendsLod?: { readonly scope: string \| null; readonly zoomY: number }` を足し、`changeDocument` に省略できる `readonly isFit?: true` を足す。`suspendsLod` を持つ `changeDocument` は `writes` が空でもよい（倍率だけで落ちた行を開く押下は文書に何も書かず、取り消しの段も作らない —— `FR-031`）。⛔ 行の [vv] の書き込みは今と同じ 1 つの束のまま（`tests/unit/uf-30-31.test.ts:3000` が 1 段であることを見る） |
| 行の [vv] | `row-tree-entrances.ts:135-144`: `pressedRowMarkedAndBelowCleared` を `keptOpenMarksWritten(schedule, rowGroupId, false)` に替え、`suspendsLod: { scope: rowGroupId, zoomY: context.drawnZoomY }` を付ける。構え（`isOpenAllBelowArmed`、`:200-218`）は「押した行の配下に `drawnRowGroupIds` に無い行が 1 つでもあるか、押した行かその配下に印があるか」。⛔ `row-title-panel.ts` の薄さの判定も同じ条件にする（`:198` の TRAP のとおり） |
| 頭の [vv] | `row-tree-entrances.ts:28-48`: 構えは「`drawnRowGroupIds` に無い行が 1 つでもあるか（段 0 の畳みを含む）、印が 1 つでもあるか」。答えに `suspendsLod: { scope: null, zoomY: context.drawnZoomY }` を付ける |
| 1 階層開く | `row-tree-entrances.ts:113-125` と `wouldMoveARow` の `openOneLevel`（`:402-405`）: 直下の子が一時開放の範囲にあり、`groupDepthLimit` より深く、印でもピン止めでも描かれないときも「開ける子」と数える（`hasAChildBelowTheDepthLimit` は描かれているかを見ないので、そのまま使える） |
| 全体表示 | `fitWrites`（`zoom-and-fit.ts:35`）を返す 2 つの入口（`input-command-translator.ts:1020`、`shortcut-keys.ts:107`）が、答えの `changeDocument` に `isFit: true` を付ける |
| `frame-loop.ts`（6 か所） | ① `lodSuspensionIn(session): LodSuspensionScope \| null` を `isLevelZeroFoldedIn` の隣に ② `layoutFromSchedule` の 2 つの呼び出し（`:1553`・`:1812`）と `InputContext` を作る所（`:2034`）に渡す ③ `pictureSessionOf`（`:810-820`）が `lodSuspensionState` を引き継ぐ（決定 9） ④ 答えの `suspendsLod` を `openEveryLevelPressed`、`isFit` を `fitPressed` として、書き込みの後に送る ⑤ 書き込みを当てた後、描く縦の倍率が前と違えば `rowZoomSettled { zoomY }` を送る ⑥ 置き換えで文書が差し替わったら `documentSwapped` を送る |
| 渡すだけの所 | `copy-and-paste.ts:75`（`wouldDraw`）、`row-band-ceiling-cache.ts`（鍵に範囲を足す —— 足さないと一時開放の前の天井を使い回す）、`display-scale-steps.ts:108`、`zoom-and-fit.ts:361` |
| ⚠️ 罠 | 縮める押下の置き場の計算（`zoomWrites` の `placeHeldStill`）は、下げた後の絵を一時開放の無い絵で測ること —— その書き込みで一時開放が終わるので、残した絵で測るとポインタの下の行がずれる |
| 変えない値 | 行の `isCollapsed`・`isHidden`・`isKeptOpen` の意味、`S-87`・`S-88`、`groupDepthLimit`、段 0 の畳みの状態機械、通知の語（`RS-31` を除く） |

---

## 6. グラフ（`3457e412` で測った）

- `impact.py FR-018`: 要求 6 件・参照 50 箇所。本書の後に偽になる文を探した —— `FR-004`（`:1650`〜`:1716`）の注は E-05 〜 E-07 で直す。`FR-016`（`:3218`〜`:3288`、倍率の刻み）と `FR-098`（`:4582-4583`、ピン止めの免除）は一時開放と両立する（ピン止めも一時開放も免除であり、単調性の論証は同じ形）。`FR-081`（`:2250`）と `FR-001`（`:1090`）は `Task` の描き方で、行の選びに触れない。⇒ 偽になる文は 0。
- `impact.py HF-10`: 要求 4 件・参照 17 箇所 —— `FR-004`・`FR-018`（直す）、`FR-076` の `RS-31`（E-14）、`FR-036`（`:6692`、頭の入口の順 —— 変えない）、`tbl-settings.md:400` の `S-211`（「戻す道は 3 つ」—— 変えない。`HF-10` は今も段 0 を開く）、`tbl-state-machines.md:78` の `levelZeroOpened`（変えない）。
- `impact.py HF-2`・`KO-2`・`KO-3`: 参照 12・3・4 箇所。`KO-3` を名指す 4 箇所（`:1667`・`:1700`・`:4513`・`:4515`）は、`:1700` だけを E-07 で直す。
- `impact.py HF-13`・`RS-31`・`FR-055`・`T-280`: `FR-055` の参照 `UN-17`（`:2165`）は「戻るのは畳みだけ」—— 一時開放は戻らないので両立する（E-13 が 1 文足す）。
- ⚠️ 表 T-280 の員数を散文で述べた所: `PI-39` は「画面の値・通知・…の 8 領域」—— 領域は増えないので変わらない。状態機械の数を述べた文は 0（`grep -n "状態機械が" docs/spec` で数えた）。
- `induced.py`（写しの木で、E-01 〜 E-18・J-01 〜 J-03 を当てた後）: 種 11 のうち 11 が仕様に在り、種のあいだの辺 38、閉路 1 つ（大きさ 11: `FR-004` `FR-018` `FR-031` `FR-055` `HF-10` `HF-13` `HF-2` `HF-8` `KO-2` `RS-31` `S-351`）。⇒ 波 1 は全員を 1 度に書く（1 つのコミット）。

---

## 7. 数の予測（`3457e412` で測った。当てた後に同じ数え方で突き合わせる）

| 数 | 前 | 後 | 内訳 |
|---|--:|--:|---|
| tables | 187 | 187 | — |
| figures | 27 | 27 | — |
| rows | 2361 | 2362 | ＋1（表 T-206 の `S-351`） |
| uids | 162 | 162 | — |
| `tbl-settings.md` の `S-` の行（19 表の合計） | 331 | 332 | ＋1 |
| 表 T-280 の状態機械 | 12 | 13 | ＋1（`lodSuspensionStateMachine`） |
| 表 T-280 の出来事 | 32 | 36 | ＋4 |

⚠️ 写しで赤くなる門が 3 つある（どれも波 1 と同じコミットで閉じる。⛔ 基準値を上げて閉じない）:
- `check-must-clause-coverage.py`（検査 39）—— 試験が逐語で持たない MUST ／ MUST NOT が 1305 → 1316（＋11）。⛔ **基準値は上げない。** 波 2b の試験の体が新しい条項を逐語で引く試験を書き、波 1 と**同じコミット**に入れる。同じコミットで閉じられないときは、基準値を上げる前に利用者の許しを取ること。
- `check-quoted-source.py` —— 仕様に無い文を引く注が 353 → 355。2 つとも `RS-31` の古い場面「畳まれた行が 1 つも無い」を引く試験の注である（`tests/unit/fr-029-the-reason-a-press-carries.test.ts:54`、`tests/unit/t-015-t-051-the-four-folding-controls.test.ts:1309`）。波 2b が注を新しい場面に替える。
- `docs/review/dup-check.py`（検査 11）—— 基準の群「`T-233 RS-28` ＋ `RS-31` ＋ `RS-32`」から `RS-31` が抜け（場面の文が変わった）、「`RS-28` ＋ `RS-32`」が新しい群に見える。重なりは減っている。⇒ `docs/review/duplication-baseline.txt` の該当の 1 行を「`RS-28` ＋ `RS-32`」に替える —— ⚠️ 基準の書き換えなので、前に立つ者が利用者に確かめてから行う。
- ⭐ 初稿では検査 11 がほかに 5 群を新しく数えた。新しい文が既存の文と同じ言い回しを使った 4 群（言い回しを変えて消した）と、`表 T-051 の \`HF-` の 4 文字の断片が共通の断片の上限（60）を超えて、基準の群「`IC-58` ＋ `IC-77` ＋ `IC-90` ＋ `IC-92`」が 2 つに割れた 1 群（新しい文から「表 T-051 の」を 2 つ外して消した）である。⛔ 当てる体が文を足すときは、`表 T-051 の \`HF-` を書き足さないこと。

---

## 8. 波 —— 持ち場で割る（規則 02 の 3.5 節: 原稿と読む側は同じ波）

| 波 | 持ち場 | 中身 |
|---|---|---|
| 1 | 仕様（前に立つ者） | E-01 〜 E-18、J-01 〜 J-03、`npm run gen`（`tbl-settings.md`・`tbl-state-machines.md`・`screen-values.ts` の生成の区画・`src/adapter/screen-renderer/display-words.json` が刷り直される） |
| 2a-1 | 実装の体 A（`src/entity/`・`src/use-case/`） | `group-level-of-detail.ts` と `schedule-layout.ts`（範囲の型・`keptInViewByLodSuspension`・7 つ目の引数）、`screen-values.ts` の 4 つの出来事の処理 |
| 2a-2 | 実装の体 B（`src/adapter/`・`src/framework/`） | `row-tree-entrances.ts`・`input-command-translator.ts`・`shortcut-keys.ts`・`zoom-and-fit.ts`・`display-scale-steps.ts`・`row-title-panel.ts`、`frame-loop.ts` の 6 か所、`copy-and-paste.ts`・`row-band-ceiling-cache.ts` |
| 2b | 試験の体（⛔ 実装を読まない。`docs/spec` だけを読む） | 9 節の書き直しと、新しい試験 `tests/unit/cr-570-open-all-draws-every-level-until-the-row-zoom-shrinks.test.ts` |
| 3 | 前に立つ者 | `dist/index.html` を刷り直し、9 節の実物確認。⛔ その後に段 8 の性能の測定 |

⭐ 2a-1 と 2a-2 と 2b は触るファイルが重ならないので並行してよい。継ぎ目（5 節の型と名）は 3 つの依頼文に同じ字で写すこと。破る試験は合わせた木で走らせる。
⭐ 実装は判断を含む（構えの条件・倍率の比較・置き場の計算）ので、2a-2 は判断を任せられる体（Opus）に渡す。

---

## 9. 仕様の外で直すもの（⛔ 本書は直さない）

- コード: 5 節の継ぎ目。
- 試験（調べた体が `tests/` を読んで挙げた。写しの木で継ぎ目を当てて走らせてはいない —— 当てた後に全単体試験で数え直すこと）:

| ファイル | 場合 | 直し方 |
|---|---|---|
| `tests/unit/cr-404-a-row-opened-by-hand-stays-open.test.ts` | `:543` 「claim 8 KO-2: [vv] on a folded R marks R, clears every fold, hide and mark under it, and leaves the rest」 | 印の残りは `[A]`（R には印が無い） |
| 同 | `:684` 「claim 14 (CR-404 q2 as recommended): [vv] over rows dropped by zoom only is thin, answers RS-28 and writes nothing」 | 逆にする —— 倍率 0.8 で R の [vv] は押せて、`RS-28` を返さず、G1 を描き、印を書かない |
| 同 | `:559` 「after KO-3 no mark is left, so zooming down drops rows by the depth rule again」 | 縮めたとき一時開放が終わることを前提に書く（縮めた後は深さの規則だけで落ちる —— 今の期待のまま緑のはず） |
| `tests/unit/cr-541-row-title-panel-open-all-and-reset.test.ts` | `:11` の Q02、`:15` の Q06（逐語）、`:72` の `it.each`、`:78`、`:89`、`:124`・`:132` | 逐語を新しい文に替える。`:84` の B の `isKeptOpen` は偽。構えは文書の JSON ではなく描いた行で測る。倍率だけで落ちた行があれば頭の [vv] が押せる場合を足す |
| `tests/unit/cr-438-pointer-panels-row-entrances-row-grab-and-frame-drags.test.ts` | `:258` 「HF-2 / HR-3 / KO-2: IC-58 marks the pressed row and takes the marks off every row under it」 | 押した行に `keptOpen: true` を書かない |
| `tests/unit/t-015-t-051-the-four-folding-controls.test.ts` | `:1195`（`:1200` の逐語） | `HF-2` の新しい構えの逐語 |
| `tests/contract/t-233-reason-words-tell-the-row.contract.test.ts` | `:563` の `RS-31`（`:209` の指紋） | 新しい場面と語を読み直して指紋を付け直す |
| `tests/unit/uf-30-31.test.ts` | `:3000` 「FR-031: what HF-2 asks for arrives as ONE undo step, not one per row」 | 継ぎ目が `changeDocument` を保てば緑のまま。保てないときは `allWritesOf` で読む |
| `tests/system/measured-sweep.test.ts` | `:3408` 「DFC-229: the written picture draws the rows the screen draws after a fold, with no scroll」 | 継ぎ目の `pictureSessionOf`（決定 9）を当てれば緑のまま。当てないと赤 |
| コメントだけ | `tests/unit/fr-029-the-reason-a-press-carries.test.ts:54`、`tests/unit/t-015-…:1309`（どちらも検査 `check-quoted-source.py` が数える）、`tests/unit/uf-72-screen-part.test.ts:2703` | `RS-31` の場面の写しを新しい文に |

- ⭐ 変えなくてよいもの（調べた体が読んだ）: `fr-029-the-reason-a-press-carries.test.ts` の全件（どの行も描かれている固定具なので、頭の [vv] は今も `RS-31`）、`t-015-…` の振る舞いの場合（倍率 1 ですべて描かれる）、`three-rows-read-from-the-spec-alone.test.ts:910`（頭の [vv] を 3 度まで押すので、2 度目から `RS-31`）、`t-015-…:1364`・`:1366` の逐語（その文は変えない）。
- 新しい試験（2b）: ① 倍率で深い段が落ちているとき、頭の [vv] は押せて、倍率を変えずにすべての行を描き、印を書かない ② 行の [vv] は配下のすべてを描き、押した行とその配下の印を外す ③ 縦を 1 刻み縮めると、一時開放が終わり、`FR-018` の絵に戻る（縮める前より多く描かない） ④ 拡大・横のズーム・スクロールでは終わらない、拡大してから 1 刻み縮めると終わる ⑤ 一時開放のあいだに [v] を押すと `KO-1` の印が立ち、縮めてもその子が描かれる ⑥ 全体表示で終わる ⑦ 保存した文書に一時開放が無い、取り消しで一時開放が戻らない ⑧ 人の畳みには勝たない ⑨ 状態機械の升（`rowZoomSettled` の 3 通り、`fitPressed`、`documentSwapped`、範囲の足し合わせ）。`HF-2`・`HF-10`・`HF-13`・`FR-018` の新しい条項を逐語で引く。
- 当てた後に、出荷ビルドで押して確かめる（Playwright、msedge、file://、縦 1080px）: `sample-large-erp-program.ja.xml` を開き、全体表示の絵で頭の [vv] を押すと、倍率を変えずにすべての行が描かれる（`RS-31` を返さない）。縦に 1 刻み縮めると全体表示の段の絵に戻る。[vv] の後に行の [v] を押してから縮めると、その行の直下の子が残る。全体表示ですべて戻る。
- 台帳: `DFC-983` の状態を `仕様待ち` → 当てたら `実測待ち` → 押して確かめたら `実測済`。`JDG-590`・`JDG-591` の状態を「指示」→「適用済み」（着地先は `HF-2`・`HF-10`・`FR-018`・`S-351`）。

---

## 10. ⛔ この変更でやらないこと

- 縦の倍率を動かさない（`HF-10` の「倍率も表示位置も動かさない」はそのまま）。
- `S-87`・`S-88`・`groupDepthLimit` の式、LOD のしきい値を変えない。
- 開いたままの印（表 T-254）の意味、`KO-1`・`KO-3` 〜 `KO-7` を変えない。
- `RS-28` の場面と語を変えない（決定 11）。
- 全畳み・行の畳み・隠しで一時開放を終えない（決定 12）。
- 段 0 の畳み（`levelZeroFoldStateMachine`・`S-211`）を変えない。
- 一時開放を文書・ブラウザ（`localStorage`）に残さない。

---

## 11. 前に立つ者へ返す問い

1. **[vv] は、すでに立っている開いたままの印をどうするか。**（裁定は「[vv] は印を立てない」と「[v] の印は縮めても残る」を言い、[vv] が既存の印を外すかは言っていない）
   - 案 ① 押した範囲の印を外す（推奨。本書の文）—— 頭の [vv] は今の `KO-3` のまま、行の [vv] は `KO-2` を「外す」にする。[vv] は「範囲を人の指定の無い状態へ戻してから、いまの倍率で全部見せる」操作になり、縮めれば LOD の絵にまっすぐ戻る（「[vv] は縮小したら折りたたむ」が範囲の全体で成り立つ）。今の `HF-2`・`HF-10` の「人の指定の無い状態へ戻す」を保つので、文の変更が最小である。
   - 案 ② 印に触れない —— `KO-2` と `KO-3` を 表 T-254 から消す。[vv] の前に [v] で開いた行は、[vv] の後に縮めても残る。構えから「印がある」が消える。代償: `HF-2`・`HF-10` の「人の指定の無い状態へ戻す」を書き直す文が増え、頭の [vv] で印をまとめて外す道が全体表示だけになる。
   - 案 ③ 今の `KO-2` のまま、押した行にだけ印を立てる —— 縮めても押した行の直下の子が残る。裁定の「[vv] は縮小したら折りたたむ」と半分食い違う。
2. **縦の倍率が下限のとき、縮める押下（倍率が変わらず `ZE-5` の知らせが出る）で一時開放を終えるか。**
   - 案 ① 終えない（推奨。本書の文）—— 終わる条件は「描く縦の倍率を下げた書き込み」の 1 つで言い切れる。下限で戻したい人は全体表示を押す。
   - 案 ② 終える —— 「縮める押下」そのものを出来事にする。`rowZoomEndReached` の送り先に本状態機械を足す。代償: 倍率が 1 つも変わらないのに絵が変わる押下ができる。

---

## 12. 台帳

| 台帳 | 行 |
|---|---|
| `docs/development-records/defects.md` | `DFC-983`（状態 `仕様待ち`。本書と同じコミットで記入） |
| `docs/development-records/rulings.md` | `JDG-590`・`JDG-591`（状態「指示 —— 本書が当てる（起草のみ）」。本書と同じコミットで記入） |

---

## 13. 測り方の再現

```
# the tree
git merge --ff-only 3457e412      # refused: the worktree was cut at 03fb4d74, a side line holding only
                                  # older copies of the usability reference commits (e1a80c33 / 43667931)
git merge --no-edit 3457e412      # -> 11a6af0c ; git diff --stat 3457e412 HEAD -> the usability file only

# free ids
git grep -w S-351 ; git log --all --oneline -S"S-351"             # -> nothing, nothing
grep -n "JDG-59[0-9]\|DFC-98[3-9]" docs/development-records/*.md   # -> nothing

# graph
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py FR-018 HF-10 HF-2 KO-2 KO-3 HF-13 RS-31 FR-055 T-280

# the behaviour today (a COPY of the tree in the session scratchpad, never committed;
# a scratch vitest probe drives frameLoop the way tests/unit/cr-404-*.test.ts stages it)
#   sample-large-erp-program.ja.xml through documentFromMspdi, 1920 x 1080, key F, then IC-74, then IC-58 on the root
#   -> rows in doc 38, drawn at open 1 (zoomY stored 1, drawn at the fit)
#   -> IC-74: drawn 1, notice 「畳まれている行が 1 つもありません」 (RS-31)
#   -> IC-58 on the root: drawn 13, one mark written

# the edits of section 4 on the same COPY (a scratch script reads this file: every old block occurs exactly once)
#   -> E-01 .. E-18: old occurs 1 time(s) ; J-01 .. J-03: anchor found ; problems 0
# the four generators the edits reach (npm run gen is refused outside the worktree, so one by one):
python docs/spec/_source/settings_json_to_md.py         # -> 19 tables, 332 rows (331 before)
python docs/spec/_source/state_machines_json_to_md.py   # -> tbl-state-machines.md
python tools/generate_state_machine_types.py            # -> screen-values.ts (lodSuspensionState, 4 events)
python tools/generate_display_words.py                  # -> src/adapter/screen-renderer/display-words.json

# the spec-side python checks of check.sh, one by one, on the worktree (before) and the edited COPY (after)
python .claude/skills/spec-graph-check/md-checks.py .   # -> tables=187 figures=27 rows=2361 -> 2362 uids=162
python .claude/skills/spec-graph-check/check-must-clause-coverage.py   # -> 1305 -> 1316 (red; wave 2b)
python .claude/skills/spec-graph-check/check-quoted-source.py --list   # -> 353 -> 355 (the two old RS-31 quotes)
python docs/review/dup-check.py 0.45 <report> docs/review/duplication-baseline.txt
#   -> before: A=31 (new 0) ; after: A=31 (new 1) -- RS-28 + RS-32, the known group losing RS-31
#   green on the COPY: style, line breaks (2, the baseline), no history, marks, id references (83), repeated
#   expressions (83), dictionary covariance, language dictionary, decided spec, decision tables, press rows,
#   ruled elsewhere, generated constants, provenance, and the --check of the four generators above
strictdoc export docs/spec --formats=json --output-dir scratch/spec-check/sd-out     # on the COPY
python .claude/skills/spec-graph-check/induced.py FR-018 HF-2 HF-10 HF-8 HF-13 KO-2 FR-055 S-351 RS-31 FR-004 FR-031
#   -> 11 of 11 seeds, 38 edges, 1 cycle of size 11
```
