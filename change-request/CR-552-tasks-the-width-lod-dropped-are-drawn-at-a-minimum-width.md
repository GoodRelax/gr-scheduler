# CR-552 — 縮めて LOD が消していたタスクを、最小の幅で描く

> 起草の状態: 起草（2026-09-23）。11 節の問いは、前に立つ者が同日に答えた（残る問いは無い）。4 節の編集を当ててよい。
> 読んだ木: `a912f4ea`（`refactor` の内容。worktree の枝は `claude/elastic-austin-1ceb27`）。行番号・数・参照は、すべてこの木で測った（測り方は 13 節）。
>
> **閉じるもの**: 利用者の 2026-09-23 の指示 `JDG-399`（逐語は下の 0.1 節）。
> ⛔ **覆すもの**: 表 T-005a の `L-2`（タスク LOD）、`FR-018` の RATIONALE の「形状の幅がしきい値 `S-86` を割る `Task` を描かない」、`S-86`（`taskLevelOfDetailReadablePx`）と、それを掛ける 表 T-252 の `DS-2`、鍵の行 `K-55`、`S-49` の既定 `6`（🔎）。
> ⛔ **当てる順**: `CR-551`（未着地。別のセッションが当てている）→ 本書 → `CR-553`（行の縦幅。並行して起草中）。本書の旧の文は `a912f4ea` で数えた。**`CR-551` が着地したら、当てる者は 4 節の旧を、着地した木で数え直してから当てること**（13 節の道具で、`CR-551` の 4.1 節を先に当てた写しの上でも、14 件の旧がすべて 1 回だった）。
>
> ⚠️ **依頼文（前に立つ者の見立て）と違う所が 3 つある**（木が反証した。file:line は各節）:
> ① 4px は新しい行（`S-350`）ではなく、既にある `S-49`（`minShapeWidth`）の既定にした —— `S-49` は既に全 `Task` の形状の床である（決定 1）。
> ② マイルストーンは、いまも LOD で落ちていない（`schedule-layout.ts:610`、`FR-018` の `01-04-requirements.md:4435`）。本書が描くようにするのは `Task` だけである（決定 4）。
> ③ 見本の「最も短い的」の表は、仕様に無い掴み方（形の中心に揃えた 12px）で測った数である。仕様の掴み代では、4px の `Task` の本体（`GA-9`）は 4px であり、端（`GA-1` / `GA-2`）が外へ 12px ずつ届く（決定 5）。

### 0.1 利用者の逐語（2026-09-23、`JDG-399`）

| 順 | 逐語 |
|---|---|
| 先 | 「複数のタスクの描画が重複する場合は、高さ方向に積むが正解だ。 問題は1タスクの最小描画幅だけ。だろ？」 |
| 後 | 「最小幅は4pxとしておけ。 名前のラベルも占有幅にいれろ。 掴める幅の扱い: 今回の対応で特別ルールを設けるな。 既存のルールに従え。」 |

前に立つ者の読み（`rulings.md` の `JDG-399` の読みの欄）: 縮めて LOD が消していたタスクとマイルストーンは、最小 4px の幅で描く。重なりは今の段割当で下へ積む。名前のラベルも占有幅に数える。掴み代は既存の規則に従い、特別な規則を足さない。覆すもの: 表 T-005a の `L-2`。

**見本の実測**（`previous-project-result/16-grab-area-sizing/README.md` の「追補: 縮小で消えるタスクを最小幅で描く（2026-09-23）」、`min-width-lod-sample.html`。3 行に 1 年ぶんのタスク 85 件とマイルストーン 3 件。1 段 ＝ 18.125px ＋ 隙間 3.5px、行の床 24px）:

| 段の数 ／ 3 行の縦幅（名前を占有幅に数える） | 0.25px/日 | 0.5 | 1 | 2 | 4 | 8 |
|---|---|---|---|---|---|---|
| 今のアプリ（描いた幅が `S-86` を割ると描かない） | 7 ／ 154（描いたのは 6 件） | 6 ／ 132（7 件） | 4 ／ 91（7 件） | 3 ／ 72（7 件） | 3 ／ 72（7 件） | 4 ／ 91（21 件） |
| **最小幅 4px（利用者が採った）** | **59 ／ 1276** | **36 ／ 779** | **20 ／ 433** | **15 ／ 324** | **14 ／ 303** | **13 ／ 281** |
| 最小幅 8px（見本が推した） | 66 ／ 1427 | 37 ／ 800 | 22 ／ 476 | 16 ／ 346 | 14 ／ 303 | 13 ／ 281 |

| 最も短い的（px。名前を数える ／ 数えない） | 0.25px/日 | 0.5 | 1 | 2 | 4 | 8 |
|---|---|---|---|---|---|---|
| 最小幅 4px | 9.25 ／ 5.25 | 10.5 ／ 7 | 11 ／ 5 | 8 ／ 4 | 8 ／ 4 | 10 ／ 8 |

- 60 の組のすべてで、描いた 88 件の全部に届き、どれも自分の形の真ん中で自分が応えた（88 / 88）。
- 利用者は、見本が推した 8px ではなく 4px を採った（`JDG-399`）。
- ⭐ 数は測り直していない。段の数と縦幅は 1 段 21.625px と行の床 24px で互いに合う（例: 14 段 × 21.625 ＝ 302.75 → 303、今のアプリの 7 段 ／ 154 ＝ 床の行 1 つ 24 ＋ 6 段 129.75）。
- ⚠️ 見本の「最小幅」は**描いた px**である（見本の `:65` の「最小幅（描く、px）」、`:66` の「今のアプリの最小幅は S-49 の 6 × 0.625 ＝ 3.75px」）。
- ⚠️ 見本の「最も短い的」は、描いた幅が 12px より細い形を「形の中心に揃えた 12px」で掴ませて測った（見本の `:215-216`）。**仕様はその掴み方を持たない**（決定 5）。

---

## 0. ⛔ 立ちどまって答える 3 つ

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

⭐ **`CH-2` ／ `GL-002`**（全体を 1 枚で俯瞰する）—— 縮めて 1 年を 1 画面に収めると、今のアプリは 85 件のうち 3〜4 件しか描かない（0.1 節の表）。残ったものだけの絵を全体と読ませることになる。
⚠️ **`CH-2` の前半「縮めたときに出す情報を絞り」とは逆向きに働く** —— 絞る手段が 1 つ（タスク LOD）減り、残る手段はグループ LOD（`L-3`）と表示の切り替え（`FR-049`）である。利用者は重なりを「高さ方向に積む」と裁いたので、絞る代わりに行が高くなる（0.1 節の表: 1 日 1px で 4 段 ／ 91px → 20 段 ／ 433px）。
⭐ **`CH-1` ／ `GL-008`**（縮めても指せる。`FR-104` の ORIGIN）—— 消えていた `Task` が描かれ、掴めるようになる。
⚠️ **`CH-3`（ぬるサク）には負に働く** —— 縮めた画面で描く要素が増える（8 節の注）。

### ② レビュー観点のどの条項を当て、何が出たか

- **`R1.3`（矛盾・重複がない。唯一の正）** —— ① 最小の描く幅を新しい行に置くと、既にある `S-49`（全 `Task` の床。`01-04-requirements.md:1091`、`schedule-layout.ts:599`）と 2 つの行が同じことに答える → `S-49` の既定を変える形にした（決定 1）。② 用語の `K-55` の説明「この幅を割った WBS の深さは描かない」は `S-86` の中身（形状の幅）と食い違っていた（`tbl-glossary.md:244`）→ 行ごと退ける。③ `FR-081` の選択の規則（`01-04-requirements.md:2243`）は「描かれていないタスク」にタスク LOD で落ちた `Task` を数えていなかった（コードは描いたものだけから選ぶ。`selection-input.ts:71`）→ 本書で落ちる `Task` が無くなるので、書き足さずに閉じる。
- **`R1.4`（異常系・境界値）** —— ① 保存済みの文書は `taskLevelOfDetailReadablePx` を持つ（テンプレートと見本の文書が持つ）→ 表 T-024a の `OP-6`（知らないキーは捨てずに保つ）がそのまま当たる（決定 3）。② `S-49` の既定が 6 のまま保存された文書は 3.75px で描く（決定 1 の代償）。③ 描く `Task` が増えるので、1 つの `TaskGroup` の段が安全弁（表 T-014 の `ST-7`、`S-89` ＝ 255）に届きやすくなる —— 届いたときの振る舞いは `ST-7` が既に持つ（止めて通知する）。④ 縦の全体表示（`FR-055`）は段が増えたぶん浅い深さを選ぶ —— 規則は変えない。
- **`R1.2`（検証できる表現）** —— 「最小幅は4px」を `S-49` の値（6.4 × 描く比 0.625 ＝ 4.0px）にした。
- **`R5`（パフォーマンス）** —— 縮めた画面で描く要素（`05-07-design.md` の 表 T-043 の `PG-6`）が増える。段割当は `schedule-layout.ts:943-948` の区間の比べ方のまま（段ごとの左右端で先に弾く）。⛔ 最適化は進めない（`JDG-11`）。性能の試しは 8 節の注。

### ③ 利用者に問わずに決めたこと

⭐ 下は根拠を添えて問わずに決めた（あとから覆せる）。

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| 決定 1 | 「最小幅は4px」を、新しい行ではなく `S-49`（`minShapeWidth`）の既定 6 → 6.4 とする。描く幅は max(期間の幅, `S-49` × 描く比) のまま | `S-49` は既に全 `Task` の形状の床である（`FR-001` の `01-04-requirements.md:1091`、`schedule-layout.ts:599` の `Math.max(spanWidth, settings.minShapeWidth)`）。表示の倍率の描く比が掛かる（表 T-252 の `DS-1`、`screen-regions.ts:79`）ので、いまの床は 6 × 0.625 ＝ 3.75px である（見本の `:66` も同じ値を書いている）。6.4 × 0.625 ＝ 4.0px。床を表示の倍率に従わせるのは、利用者が図形と字の大きさを表示の倍率に揃えると裁いた理由（`JDG-131`「プロジェクトによって最適なサイズが異なる。GRSもそれに合わせる」）と同じ。⭐ 前に立つ者が 2026-09-23 にこの形（案 A）を採った —— 退けた案: **B** 新しい行 `S-350` ＝ 4（画面の px、描く比を掛けない、保存しない）を足して描く幅 ＝ max(期間の幅, `S-49` × 描く比, `S-350`)（表示の倍率 50 ／ 100 ／ 200 で 4.0 ／ 4.0 ／ 7.5px。倍率 110 以上では `S-49` が、100 以下では `S-350` が効き、1 つの問いに 2 つの行が答える。`R1.3`）、**C** `S-49` ＝ 4（描く比を掛けると倍率 100 で 2.5px —— 見本の 4px は描いた px なので合わない）。利用者の「4px」は標準の表示の倍率 100 で読む | ちょうど 4px になるのは表示の倍率 100 だけ（50 で 2.0px、200 で 8.0px）。既定 6 で保存した文書は 3.75px のまま（文書の値を書き換えない。`FR-039`）。スキーマの型が整数から数へ広がる（`erd_json_to_schema.py:392-395` が既定の字から決める） |
| 決定 2 | `S-86` を退け、代わりの行を立てない。`DS-2`（`S-86` に描く比を掛ける）と鍵の行 `K-55`、辞書の `K-55` も退ける | 読む者が残らない（`S-86` を読むのは `FR-018` と `DS-2` だけ。13 節の `impact.py`） | 退けた番号は `retired.py` に理由つきで入れる（E-11）。番号は振り直さない（`L-3` は `L-3` のまま） |
| 決定 3 | 保存済みの文書が持つ `taskLevelOfDetailReadablePx` は、表 T-024a の `OP-6`（`01-04-requirements.md:5619`「知らないキーは捨てずに保つ」）のまま保って書き戻す。`CR-551` の 表 T-297 に行を足さない | `documentSettings` には「知らないキーを拒む条件を当ててはならない」（`05-07-design.md:1232`）。表 T-297 は閉じた実体の列（`TaskVisual`）のためのもの。アプリの読み込みも `documentSettings` を閉じていない（`json-codec.ts:806`、`closed` を持たない） | 退けた鍵が古い文書に乗ったまま往復する（効き目は無い）。⚠️ 刷ったスキーマ（`grs-document.schema.json:226` の `additionalProperties: false`）はその文書を拒む —— アプリは拒まない（10 節） |
| 決定 4 | マイルストーンは変えない | いまも落ちていない —— `keptByLevelOfDetail` は `shapeKind === 'milestone'` と期間がゼロのときに `true` を返す（`schedule-layout.ts:610`）。`FR-018` も「幅が期間から出ていない形状を落としてはならない」（`01-04-requirements.md:4435`）。幅は図形の一辺（表 T-221 の `LF-10`） | — |
| 決定 5 | 掴み代の規則を 1 つも足さない。床の幅で描いた `Task` にも、表 T-266 ・ 表 T-267 ・ 表 T-268 をそのまま当てる | 利用者の逐語「特別ルールを設けるな。既存のルールに従え」。どれも**描いた**形と端を読む: 表 T-266 の前文「横の値は、描いた端から外へ（外側）・内へ（内側）」（`01-04-requirements.md:3545`）、`GA-9` の「描いた形そのもの」（`:3562`）、`GA-1` / `GA-2` の外側 `S-250` / `S-253` ＝ 12px（`:3554-3555`）、`HT-1` の「描いた形の上では」（`:3635`）、`HT-4` の中心までの距離（`:3638`）、掴み代に描く比を掛けない `DS-7`（`:6817`）。期間の長さで判じる行は、予定の 2 端が 1 日に立つかの判定だけで、それは幅ではなく日で決める（`schedule-layout.ts:585` `planEndsStandOnOneDay`、`tests/unit/t-023d-the-plan-start-is-the-boundary.test.ts:1319-1330`）—— 床で描いても変わらない | 4px の `Task` を**動かす**的（本体 `GA-9`）は 4px である。端を掴む的は外へ 12px ずつ。見本の「最も短い的」の数（8 ／ 4px ほか）は仕様の掴み方の数ではない |
| 決定 6 | 名前のラベルは、既に占有幅に入っている。本書は数え方を変えない | 表 T-038 の `OC-1`「名称ラベル（形状の外へ出したぶん）｜左右」（`01-04-requirements.md:1515`）。コードも名前の右端を占有に入れて段を選ぶ（`schedule-layout.ts:911-913` の `labelledX1`、`:943-948` の区間の比べ方）。見本の「名前を占有幅に数える（今のアプリ。表 T-038）」も同じ | 名前が段を決める（見本: 1 日 1px・最小幅 8px で、数えると 22 段、数えないと 12 段） |
| 決定 7 | 「LOD で描かないタスク」と書く 3 か所 —— `FR-108` の STATEMENT（`:3803`）、表 T-023a の結び（`:3312`）、表 T-018a の `RT-4a`（`:2604`）—— は書き直さない | 本書の後も、グループ LOD（`L-3`）が描かない行に載る `Task` を指して真である | 読む人がタスク LOD を思い出すかもしれない（G-12 と表 T-005a が 2 つと言う） |
| 決定 8 | `FR-018` の STATEMENT は、行の量をグループ LOD で増減させ、描いている行に載る `Task` はすべて描く、と書く | 表 T-005a に残る 2 つのうち、`L-1`（目盛）は `FR-017` が持つ | — |
| 決定 9 | `S-49` の既定から 🔎（由来が無い）を外す | 由来ができた（利用者の 4px、表示の倍率 100 の描く比 0.625） | — |

---

## 1. 範囲 —— 行き先

| 何 | 仕様で変える所 | 編集 | 裁定を戻すとき |
|---|---|---|---|
| タスク LOD を退ける | 表 T-005a の `L-2` ・ 前文 ・ 見出し、用語 `G-12`、`UC-007` の手順 4、`FR-018` の STATEMENT と RATIONALE、`FR-001` の 1 文 | E-01 〜 E-08 | 行と文を戻す（1 行では済まない） |
| 最小の幅を 4px に | `S-49` の既定と備考 | J-01 | `S-49` の既定の 1 値 |
| しきい値の行を退ける | `S-86`、表 T-252 の `DS-2`、表 T-104 の `K-55`、辞書の `K-55`、`retired.py` | E-09 〜 E-11 ・ J-02 ・ J-03 | 行を戻す |
| 名前を占有幅に数える | —（既に `OC-1`。決定 6） | — | — |
| 掴み代 | —（既存の規則のまま。決定 5） | — | — |

**数**: 文の編集 11（E-01 〜 E-11。うち `retired.py` が 1）、原稿 JSON の編集 3（J-01 〜 J-03）。

⚠️ **`CR-551` と重なる所**（`CR-551` の 4 節を、本書が触る行ごとに grep した。13 節）:
- 本書の旧の文を、`CR-551` の旧も新も含まない —— 14 件とも 0 回。
- `CR-551` は `FR-055` の RATIONALE（E-15）と `FR-002`（E-02。`OC-1` の幅の測り方）を書くが、本書はその 2 つを書かない。`CR-551` の E-15 の「算入するのは、いま描いているものだけである」は、本書の後は全 `Task` を指す —— 食い違わない。
- 同じファイルに入る: `01-04-requirements.md`（`CR-551` 35 件のうち多数）、`settings.json`（`CR-551` は `S-63` ・ `S-163` ・ `S-178` ・ `S-194` ・ `S-195` ・ `S-196` と新しい 14 行。本書は `S-49` ・ `S-86`）、`display-words.json`（`CR-551` は `PR-13` ・ `colourField` ・ `IC-106` ・ `QN-10`。本書は `K-55`）、`tbl-glossary.md`（`CR-551` は 表 T-109 ・ `P-20` ・ `CM-25`。本書は 表 T-104 の `K-55`）。
- ⇒ **当てる者は、`CR-551` が着地した木で、本書の旧をもう 1 度数えてから当てること。** 行番号は動くが、旧の文そのものは動かない見込みである（13 節で確かめた）。
- ⚠️ `CR-553`（行の縦幅）は `schedule-layout.ts` の `bandFloorOf`（~`:792`）と `settings.json` を触る。本書のコードは同じファイルの `:602-612` と `:855` —— 塊は重ならないが、同じファイルである（8 節）。

---

## 2. 新しい識別子

⚠️ 本書は新しい識別子を 1 つも作らない（行 ID ・ 表 ・ 接頭辞 ・ 設定値の行、どれも 0）。
- 依頼文が配った帯（設定値 `S-350` 〜 `S-354`、台帳 `JDG-430` 〜 `JDG-434` ・ `DFC-850` 〜 `DFC-854`）は、どれも使わない（`S-350` は退けた案 B のためのものだった。決定 1）。
- 2026-09-23、`a912f4ea` で測った: `S-350` 〜 `S-354` ・ `JDG-430` 〜 `JDG-434` ・ `DFC-850` 〜 `DFC-854` を名乗る所は木に 0 件（`previous-project-result` を除く。13 節）。**当てる直前に測り直すこと**（規則 02 の 2.5 節）。

---

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

| 消すもの | 所（`a912f4ea`） | 置き換わる先 | 編集 |
|---|---|---|---|
| 表 T-005a の `L-2`（タスク LOD「形状の幅が狭い `Task` を描かない」） | `01-04-requirements.md:261` | —（欠番）。前文に「幅で `Task` を落とす LOD は無い」の注 | E-04 ・ E-02 |
| 用語 `G-12` の「3 つある（… タスク LOD …）」 | `:248` | 2 つ（時間軸 LOD ／ グループ LOD） | E-01 |
| 前文の「LOD は 3 つある」、見出し「LOD の 3 種」 | `:252` ・ `:256` | 2 つ ／ 2 種 | E-02 ・ E-03 |
| `UC-007` 手順 4 の「3 つの LOD に従って」タスクと行を増減 | `:795` | 行をグループ LOD で増減、行に載るタスクはすべて描く | E-05 |
| `FR-001` の「その `Task` をタスク LOD が落とさないことは `FR-018` が定める」 | `:1092` | 縮めても描き続けることは `FR-018` が定める | E-06 |
| `FR-018` の STATEMENT の「表 T-005a の 3 つの LOD」 | `:4426` | グループ LOD ＋ 行に載る `Task` はすべて描く | E-07 |
| `FR-018` の RATIONALE のタスク LOD の 9 行（判定・しきい値 `S-86`・占有幅で判じない・期間から出た幅・免除・単調性・深さを代理にしない） | `:4431-4439` | 落とさない MUST NOT ＋ 床（`S-49`）＋ 段割当（`OC-1`）＋ 掴み代は既存のまま | E-08 |
| 表 T-252 の `DS-2`（`S-86` に描く比を掛ける） | `:6812` | —（欠番） | E-09 |
| 表 T-104 の `K-55`（`taskLevelOfDetailReadablePx`） | `_assets/tbl-glossary.md:244` | —（欠番） | E-10 |
| `S-86`（表 T-205） | `_source/settings.json:2352-2366`（生成物 `_assets/tbl-settings.md:261`、`grs-document.schema.json:215` ・ `:779-782`） | —（欠番） | J-02 |
| `S-49` の既定 `6`（🔎）と備考の「由来を持たないので選び直してよい」「床が `S-86` 以上になると …」 | `_source/settings.json:1285-1296` | 既定 `6.4`、由来（4px）を書いた備考 | J-01 |
| 辞書の `K-55` | `_source/display-words.json:1640-1646`（生成物 `src/adapter/screen-renderer/display-words.json:1817` 付近） | — | J-03 |
| コードの `keptByLevelOfDetail` とその呼び出し、描く比の名簿の `taskLevelOfDetailReadablePx`（⛔ 本書は直さない。9 節） | `schedule-layout.ts:602-612` ・ `:855`、`screen-regions.ts:80` | 描く `Task` を幅で選ばない | 波 0 の実装する者 |

⭐ **消さないもの**（読み直して真のまま）: `FR-108` の「LOD で描かないタスク（表 T-005a）」（`:3803`）、表 T-023a の結び「LOD で描かなかった `Task`」（`:3312`）、`RT-4a` の「LOD で間引いた `Task`」（`:2604`）—— 決定 7。`FR-018` の「倍率を刻む箇所 … しきい値をまたぐ側へ丸めてはならない」（`:4440`）と「深さを `S-125` で頭打ちにしてよい」（`:4441`）—— グループ LOD と目盛のしきい値に効く。

---

## 4. 書き直す所（当てる体がそのまま使う文）

⛔ **作法**（`CR-541` ・ `CR-550` ・ `CR-551` と同じ）: 各編集は「旧」を「新」で置き換える。**置き換える前に、旧がそのファイルに 1 回だけ現れることを数えること**（13 節の道具が 14 件すべてで 1 回を確かめた）。旧・新は、下の `<!-- EDIT … -->` の直後の 2 つの塊である。新が空の編集は、旧の行をその改行ごと消す。
⚠️ 行末の 2 つの半角空白（改行の印）も旧と新の一部である。写すときに落とさないこと。
⚠️ 生成物（`_assets/tbl-settings.md` ・ `_source/grs-document.schema.json` ・ `_assets/tbl-row-id-prefixes.md` と `src/` の生成物）は手で直さない。原稿を直して `npm run gen` を打つ。

### 4.1 文の編集（`01-04-requirements.md` ・ `_assets/tbl-glossary.md` ・ `retired.py`）

<!-- EDIT id=E-01 file=docs/spec/01-04-requirements.md -->
用語 `G-12`。旧
```text
| G-12 | LOD | ズームに応じて描く要素を増減させる仕組み。<br>**3 つある**（時間軸 LOD / タスク LOD / グループ LOD）。<br>表 T-005a で言い分ける |
```
新
```text
| G-12 | LOD | ズームに応じて描く要素を増減させる仕組み。<br>**2 つある**（時間軸 LOD / グループ LOD）。<br>表 T-005a で言い分ける |
```

<!-- EDIT id=E-02 file=docs/spec/01-04-requirements.md -->
表 T-005a の前文。旧
```text
LOD は 3 つある。  
混ぜて書いてはならない（MUST NOT）。  
内訳を表 T-005a に示す。
```
新
```text
LOD は 2 つある。  
混ぜて書いてはならない（MUST NOT）。  
内訳を表 T-005a に示す。  
⚠️ 形状の幅が狭いことを理由に `Task` を描かないでおく LOD は無い —— 幅の狭い `Task` も最小の幅で描く（`FR-018`）。
```

<!-- EDIT id=E-03 file=docs/spec/01-04-requirements.md -->
表 T-005a の見出し。旧
```text
**表 T-005a — LOD の 3 種**
```
新
```text
**表 T-005a — LOD の 2 種**
```

<!-- EDIT id=E-04 file=docs/spec/01-04-requirements.md -->
表 T-005a の `L-2` を消す（`L-3` は番号を変えない）。旧
```text
| L-2 | タスク LOD | **形状の幅が狭い** `Task` を描かない | 横（`zoomX`）＝ 幅 |
```
新
```text
```

<!-- EDIT id=E-05 file=docs/spec/01-04-requirements.md -->
`UC-007` 手順 4。旧
```text
4. `GRS` は描くタスクと行の量を、表 T-005a の 3 つの LOD に従って増減させる。
```
新
```text
4. `GRS` は描く行の量を、表 T-005a のグループ LOD に従って増減させ、描いている行に載るタスクはどの倍率でもすべて描く。
```

<!-- EDIT id=E-06 file=docs/spec/01-04-requirements.md -->
`FR-001` の RATIONALE。旧
```text
⭐ その `Task` をタスク LOD が落とさないことは `FR-018` が定める —— 定めないと、STATEMENT が MUST で作らせるものがどの倍率でも画面に出ない。
```
新
```text
⭐ その `Task` を縮めても描き続けることは `FR-018` が定める —— 定めないと、STATEMENT が MUST で作らせるものが、縮めた画面に出ない。
```

<!-- EDIT id=E-07 file=docs/spec/01-04-requirements.md -->
`FR-018` の STATEMENT。旧
```text
**STATEMENT**: 表示倍率が変わったとき、`GRS` は、描く `Task` と行の量を**表 T-005a の 3 つの LOD** に従って増減させること。  
```
新
```text
**STATEMENT**: 表示倍率が変わったとき、`GRS` は、描く行の量を**表 T-005a のグループ LOD** に従って増減させ、描いている行に載る `Task` は、どの倍率でもすべて描くこと。  
```

<!-- EDIT id=E-08 file=docs/spec/01-04-requirements.md -->
`FR-018` の RATIONALE のタスク LOD の段。旧
```text
**RATIONALE**: タスク LOD の判定は `Task` ごとに行い、その `Task` の形状が占める幅がしきい値を割るときは描かないこと（MUST）。  
しきい値は表 T-205 の `S-86` に従うこと（MUST） —— 幅は期間に 1 日あたりの表示幅（`FR-017`）を掛けた値である。  
⚠️ **占有幅（表 T-038）で判定してはならない（MUST NOT）** —— 外へ出したラベルを含むので、しきい値を割ることが起きない。  
タスク LOD が測るのは、期間から出た幅である。  
幅が期間から出ていない形状を落としてはならない（MUST NOT） —— 期間がゼロの `Task` は 表 T-201 の `S-49`（`minShapeWidth`）の床で、マイルストーンは 図形の一辺（表 T-221 の `LF-10`）で幅が決まり、**どちらも倍率を下げても縮まない**ので、期間の短さを測っていることにならない。  
⭐ **落とす向きの単調性はこの免除で壊れない** —— 免除される集合は倍率に依らず一定であり、描く集合は「一定の集合と、縮む集合の和」だからである。  
⛔ **下で禁じる「一定数以下なら全部描く」というしきい値とは別物である** —— 件数を 1 つも見ておらず、形状の幅がどこから来るかだけを見ている。  
⭐ **深さを代理に使わないのは、「深いほど短い」が相関にすぎないためである** —— 平らな WBS に短いタスクが並ぶ文書や、深い段に長期のタスクがある文書で外れる。  
⭐ タスクごとに測れば、縮めるほど描く集合が縮むことが構造で決まり、上の逆転の禁止が論証を要さずに成り立つ。  
```
新
```text
**RATIONALE**: ⛔ 描いている行に載る `Task` を、形状の幅が狭いことを理由に描かないでおいてはならない（MUST NOT） —— 縮めて長い期間を 1 画面に収めると短い `Task` のほとんどが消え、残ったものだけの絵が全体に見える。  
⭐ `Task` の形状を描く幅は、期間に 1 日あたりの表示幅（`FR-017`）を掛けた幅と、表 T-201 の `S-49`（`minShapeWidth`）に `FR-039` の描く比を掛けた幅の、大きいほうとすること（MUST） —— `FR-001` が期間がゼロの `Task` に置く床と同じ床であり、期間の短い `Task` と期間がゼロの `Task` を分けない。  
⚠️ マイルストーンの幅は図形の一辺（表 T-221 の `LF-10`）で決まり、本段の床は当たらない。  
⭐ 描いた幅が重なる `Task` は、段割当（`FR-003`、表 T-014）が下の段へ積む —— 重なりを測る占有幅に何を数えるか（形状の外へ出した名称ラベルを数える 表 T-038 の `OC-1` を含む）は同表が持ち、本要求は数え方を足さない。  
⭐ 床の幅で描いた `Task` の掴み代は、`FR-104` の 表 T-266 と `FR-105` の 表 T-267 ・ 表 T-268 のままとする —— どれも描いた形と描いた端から測るので、床の幅がそのまま本体（`GA-9`）の幅になり、予定の端（`GA-1` / `GA-2`）はその外へ届く。  
⛔ 床の幅で描いた `Task` のために、掴み代の値や応える順を別に置いてはならない（MUST NOT） —— 利用者が既存の規則に従うと定めた。  
⭐ 倍率を変えても、描いている行に載る `Task` の集合は変わらないので、上の逆転の禁止は `Task` について論証を要さずに成り立つ。  
```

<!-- EDIT id=E-09 file=docs/spec/01-04-requirements.md -->
表 T-252 の `DS-2` を消す（`DS-3` 以降は番号を変えない。`DS-3` の「同書の」は `DS-1` の `_assets/tbl-settings.md` を継ぐので、`DS-2` は継ぎの頭ではない —— 規則 02 の 4 節）。旧
```text
| DS-2 | 同書の 表 T-205 の `S-86` | 掛ける | 下限が `fontMin` である —— 掛けなければ、字を縮めたときにタスク LOD が字より広い幅を求め続ける |
```
新
```text
```

<!-- EDIT id=E-10 file=docs/spec/_assets/tbl-glossary.md -->
表 T-104 の `K-55` を消す。旧
```text
| K-55 | LOD | `taskLevelOfDetailReadablePx` | この幅を割った WBS の深さは描かない |
```
新
```text
```

<!-- EDIT id=E-11 file=.claude/skills/spec-graph-check/retired.py -->
退けた番号を理由つきで入れる（`CR-541` の E-61 と同じ扱い）。旧
```text
           'RF-2',
           'T-006'}
```
新
```text
           'RF-2',
           # CR-552 (2026-09-23, ruling JDG-399): a Task is no longer dropped
           # for being narrow; it is drawn at max(its span, S-49 x the drawing
           # ratio) and stacked by the lane assignment. L-2 (the task LOD row
           # of table T-005a), S-86 (its threshold, taskLevelOfDetailReadablePx),
           # DS-2 (the display-scale row that multiplied S-86) and K-55 (the
           # key row of table T-104) left with it. rulings.md (JDG-399) and the
           # change requests still name them, and the seats stay burnt.
           'L-2', 'S-86', 'DS-2', 'K-55',
           'T-006'}
```

### 4.2 原稿 JSON の編集（`_source/`）

⛔ JSON も文として当てる（旧が 1 回だけ現れることを数えてから置き換える）。当てた後は `json.loads` で読み、`settings.json` は手で書いた検証の形（`settings.schema.json`）で確かめてから `npm run gen` を打つこと（13 節で、写しの上で 0 件の誤りを確かめた）。

<!-- EDIT id=J-01 file=docs/spec/_source/settings.json -->
`S-49` —— 既定を 6.4 にし、🔎 を外し、備考を書き直す。旧
```text
     "key": "`minShapeWidth`",
     "unit": "px",
     "default": {
      "num": "6",
      "mark": "🔎"
     },
     "min": {
      "num": "1"
     },
     "max": {
      "num": "20"
     },
     "note": {
      "ja": "期間がゼロでも残す最小の幅（`FR-001`）。⭐ 本値は予定の端の掴み代に縛られない —— 予定の端の掴み代（表 T-266 の `GA-1` / `GA-2`）は端の外側だけに届き、内側の既定は 0 なので、胴は幅によらず必ず残る。 ⭐ 由来を持たないので選び直してよい （🔎）。⚠️ 床が `S-86` 以上になると、どの `Task` も LOD で落ちなくなる —— 床は全 `Task` に掛かるためである"
```
新
```text
     "key": "`minShapeWidth`",
     "unit": "px",
     "default": {
      "num": "6.4"
     },
     "min": {
      "num": "1"
     },
     "max": {
      "num": "20"
     },
     "note": {
      "ja": "`Task` の形状を描く最小の幅（`FR-001` ・ `FR-018`）。期間がゼロの `Task` も、期間の短い `Task` も、本値に描く比（`FR-039` の 表 T-252 の `DS-1`）を掛けた幅より細く描かない。⭐ 既定の 6.4 は、表示の倍率 100（描く比 0.625、`S-236`）で 4px（6.4 × 0.625）に描く値である —— 利用者が、縮めても描くタスクの最小の幅を 4px と定めた。見本（`previous-project-result/16-grab-area-sizing/min-width-lod-sample.html`）は 8px を推したが、利用者は 4px を採った。 ⭐ 本値は予定の端の掴み代に縛られない —— 予定の端の掴み代（表 T-266 の `GA-1` / `GA-2`）は端の外側だけに届き、内側の既定は 0 なので、胴は幅によらず必ず残る。"
```

<!-- EDIT id=J-02 file=docs/spec/_source/settings.json -->
`S-86` を消す（表 T-205 の行。次の `S-87` の塊はそのまま）。旧
```text
    {
     "id": "S-86",
     "key": "`taskLevelOfDetailReadablePx`",
     "default": {
      "num": "24",
      "code": true
     },
     "min": "`fontMin`",
     "max": {
      "num": "200"
     },
     "note": {
      "ja": "形状の幅がこれを割る `Task` を描かない。文字が 1 つも入らない幅にしない"
     }
    },
```
新
```text
```

<!-- EDIT id=J-03 file=docs/spec/_source/display-words.json -->
辞書の `K-55` を消す。旧
```text
  {
   "rowId": "K-55",
   "label": {
    "ja": "この幅を割った WBS の深さは描かない",
    "en": "taskLevelOfDetailReadablePx"
   }
  },
```
新
```text
```

### 4.3 生成器と生成物（形で示す）

| 何 | 何をする |
|---|---|
| `npm run gen` | `_assets/tbl-settings.md`（表 T-205 から `S-86` が消え、`S-49` の既定が `6.4`）・ `_assets/tbl-row-id-prefixes.md`（`L` 3 → 2、`DS` 10 → 9、`K` 123 → 122）・ `_source/grs-document.schema.json`（`taskLevelOfDetailReadablePx` が `required` と `properties` から消え、`minShapeWidth` の型が `integer` → `number`）と、`src/` の生成物（`SETTINGS_DEFAULTS` ・ `SETTINGS_BOUNDS` ・ `json-codec.ts` の検証の形 ・ `display-words.json` ・ `startup-template.json`）を刷る |
| `sample-schedule/No Name.json` ・ `sample-schedule/Three-Year Product Plan.json` ・ `docs/guides/schedule-to-grs-json/grs-skeleton.json` | 手で持つ文書。`taskLevelOfDetailReadablePx` を消し、`minShapeWidth` を `6.4` にする（見本の文書は利用者が開いて試すので、既定の見た目で開かせる） |

---

## 5. 継ぎ目 —— 両側の依頼文にこのまま写すこと

| # | 間 | 継ぎ目（逐語） |
|---|---|---|
| S-1 | 仕様 ↔ 配置（`schedule-layout.ts`） | 描く `Task` を幅で選ばない（`keptByLevelOfDetail` とその `.filter` を消す）。描く幅は `shapeWidthOf` のまま ＝ max(期間の幅, `settings.minShapeWidth`)。`settings` は描く比を掛けた後の値（`drawnSettingsOf`） |
| S-2 | 仕様 ↔ 描く比の名簿（`screen-regions.ts:70-81`） | `SCALED_BY_THE_DISPLAY` から `taskLevelOfDetailReadablePx` を消す。`minShapeWidth` は残す（`DS-1`） |
| S-3 | 配置 ↔ 掴み（`item-hit-area.ts`） | 変えない。床で描いた形も、描いた形と端から掴み代を組む |
| S-4 | 配置 ↔ 段割当 | 変えない。占有は `labelledX1` まで（名前を含む、`OC-1`） |

---

## 6. グラフ（`a912f4ea` で測った）

### 6.1 `impact.py` —— 触る行ごとの届く先（要求 / 参照）

| 対象 | 要求 / 参照 | 指している要求 |
|---|---|---|
| `L-2` ・ `DS-2` ・ `K-55` ・ `G-12` | 0 / 0 | 浮いている。消しても偽になる所が無い |
| 表 T-005a | 4 要求 | `UC-007`（`:795`、E-05）・ `FR-004`（`:1654`、`HR-1a` の「`L-3` と同じ絵」—— `L-3` は残るので書き直さない）・ `FR-108`（`:3803`、決定 7）・ `FR-018`（`:4426`、E-07） |
| `FR-018` | 6 / 45 | `FR-001`（E-06）・ `FR-004` ・ `FR-016` ・ `FR-055` ・ `FR-081` ・ `FR-098` —— `FR-001` の 1 文のほかは、どれもグループ LOD（行）の単調性と下限を引く（例: `FR-055` の `:4649`「`FR-018` の単調性と対になる」）。書き直さない |
| `S-86` | 2 / 3 | `FR-018`（E-08）・ `FR-039`（`DS-2`、E-09） |
| `S-49` | 3 / 3 | `FR-001`（`:1091`、変えない）・ `FR-011`（`:2717`「`S-49` を実績に当ててはならない」、変えない）・ `FR-018`（E-08） |
| `FR-001` | 8 / 16 | `FR-008` ・ `FR-019` ・ `FR-032` ・ `FR-033` ・ `FR-075` ・ `FR-076` ・ `FR-083` ・ `FR-091` —— どれも形状を作る側を引き、LOD の文を引かない |
| `OC-1` | 5 / 7 | `FR-002` ・ `FR-003` ・ `FR-039` ・ `FR-049` ・ `FR-109` —— 本書は `OC-1` を書かない（決定 6） |
| `GA-9` ・ `HT-1` ・ `HT-4` | 1 / 2 ・ 1 / 2 ・ 2 / 3 | `FR-104` ・ `FR-016` ・ `FR-001` / `FR-043` —— 書かない（決定 5） |
| `FR-108` ・ `RT-4a` | 3 / 4 ・ 1 / 3 | `FR-016` ・ `FR-104` ・ `FR-107` ・ `FR-009` —— 書かない（決定 7） |
| `UC-007` | 18 / 37 | 手順 4 を引く者は `FR-018` だけ（`ORIGIN`） |
| `OP-6` | 3 / 6 | `FR-025` ・ `FR-087` ・ `FR-076` —— 書かない（決定 3） |

⭐ 導いた条項ごとに、届いた行を `rulings.md` で引いた（規則 02 の 1）: `L-2` は `JDG-399` だけ（`JDG-233` の当たりは `SL-2` の字の一部）。`FR-018` は `JDG-145` ・ `JDG-160`（どちらも縦の倍率と開いた行 —— グループ LOD の話で、本書は触らない）。`FR-108` は `JDG-184` ・ `JDG-193` ・ `JDG-211` ・ `JDG-222` ・ `JDG-245`（見えないものは掴めない —— 本書は見えるものを増やすだけで、食い違わない）。`HT-4` は `JDG-190` ・ `JDG-217` ・ `JDG-274`（中心が近い方 —— そのまま当たる）。`RT-4a` は `JDG-196`（予定が無ければ依存線を描かない —— 触らない）。`T-252` は `JDG-122` ・ `JDG-123` ・ `JDG-131` ・ `JDG-132` ・ `JDG-148` ・ `JDG-149` ・ `JDG-152` ・ `JDG-201`（図形と字に表示の倍率を掛ける、掴み代には掛けない —— 決定 1 はこの向きに従う）。`FR-055` は `JDG-06` ・ `JDG-377`（空の文書、全体表示の余白 —— 触らない）。`S-86` ・ `S-49` ・ `minShapeWidth` ・ `DS-2` ・ `K-55` ・ `OC-1` ・ `OP-6` ・ `FR-001` は 0 件。⭐ `CR-541` の Q7（`JDG-300`「倍率で描かれないタスクも選ばせない」）は `FR-081` の `:2243` に着地しており、行の軸の倍率で描かれない行だけを数えた —— 本書の後は幅で落ちる `Task` が無いので、書き足す要が無い。

### 6.2 `induced.py`（6 群）

| 種 | 解決 | 種の中の辺 | 閉路 | 扱い |
|---|---|---|---|---|
| `T-005a L-2 G-12 UC-007 FR-018 FR-001 S-49 S-86 T-205` | 9/9 | 12 | 1: `FR-001` `FR-018` `S-49` `UC-007` | ⭐ 4 つとも本書が 1 つの計画で書く（E-05 ・ E-06 ・ E-07 ・ E-08 ・ J-01） |
| `FR-018 FR-039 T-252 DS-1 DS-2 S-49 S-86 T-201` | 8/8 | 7 | 0 | — |
| `FR-018 FR-003 T-014 ST-1 T-038 OC-1 FR-055` | 7/7 | 9 | 1: `FR-003` `FR-018` `FR-055` | 本書は `FR-018` だけを書く。`FR-003` ・ `FR-055` の文はグループ LOD と段割当を引くだけで、偽にならない |
| `FR-018 FR-104 T-266 GA-1 GA-2 GA-9 T-267 HT-1 HT-4 FR-105 DS-7` | 11/11 | 9 | 1: `DS-7` `FR-104` | 書かない |
| `FR-018 FR-108 FR-081 FR-009 RT-4a FR-016 T-005a` | 7/7 | 7 | 1: `FR-009` `RT-4a` | 書かない |
| `S-86 K-55 T-104 OP-6 FR-087` | 5/5 | 0 | 0 | — |

---

## 7. 数の予測（`a912f4ea` で測った。当てた後に同じ数え方で突き合わせる）

| 数 | 前（`a912f4ea`） | 後（本書だけ） | `CR-551` の後に当てたとき | 内訳 |
|---|--:|--:|--:|---|
| tables | 186 | 186 | 187 → 187 | — |
| figures | 27 | 27 | 27 → 27 | — |
| rows | 2282 | 2278 | 2302 → 2298 | 消す 4（`L-2` ・ `DS-2` ・ `K-55` ・ `S-86`） |
| uids | 162 | 162 | 162 → 162 | — |
| 接頭辞 | 162 | 162 | 163 → 163 | `L` ・ `DS` ・ `K` ・ `S` は行が残る |
| 設定値の行 | — | −1 | −1 | `S-86` |
| 辞書の項 | — | −1 | −1 | `K-55` |

⚠️ 「`CR-551` の後」の列の左は `CR-551` の 7 節の予測であり、本書は測っていない。

---

## 8. 波 —— 持ち場で割る（規則 02 の 3.5 節: 原稿と読む側は同じ波）

⛔ **仕様の波とコードの 2 行は同じ波にすること。** `S-86` を原稿から消して `npm run gen` を打つと、`SETTINGS_DEFAULTS` から `taskLevelOfDetailReadablePx` が消える。`schedule-layout.ts:611` の `shapeWidth >= settings.taskLevelOfDetailReadablePx` は `undefined` と比べて常に偽になり、期間を持つ `Task` が**すべて**消える（vitest は型を見ないので、赤くなる前に絵が空になる）。

```
wave 0  spec + its two readers (ONE body, one worktree cut after CR-551 landed)
          section 4 (E-01..E-11, J-01..J-03), then
          src/entity/layout-engine/schedule-layout/schedule-layout.ts  -- delete keptByLevelOfDetail (:602-612) and its .filter (:855)
          src/entity/layout-engine/screen-regions/screen-regions.ts:80 -- drop 'taskLevelOfDetailReadablePx' from SCALED_BY_THE_DISPLAY
          sample-schedule/*.json, docs/guides/schedule-to-grs-json/grs-skeleton.json (section 4.3)
          npm run gen && npm run gen:check && npx tsc --noEmit
          -> tests that quote the spec verbatim or expect a drop go red here, by design (section 9)
wave 1  tests by a spec-only tester (never the wave-0 body), reading docs/spec only
          rewrite the reds of section 9; add: no Task is dropped at any zoomX; drawn width is
          max(span, S-49 x ratio) (4.0px at displayScale 100); floored Tasks stack by OC-1;
          GA-9 of a floored Task is its drawn width and GA-1 / GA-2 reach S-250 / S-253 beyond it
wave 2  check.sh + vitest on the merged tree; npm run build (dist/) for the user to try by file://
```

- ⚠️ `CR-553` は `schedule-layout.ts` の `bandFloorOf`（~`:792`）を触る。本書の `:602-612` ・ `:855` とは塊が重ならないが、同じファイルなので、後に当てる側が先の着地の上で数え直すこと。
- ⚠️ 検査 39（MUST の条文の網羅）の数が動く見込み —— `FR-018` の旧の段から MUST ／ MUST NOT が 4 つ消え（落とす判定・しきい値 `S-86`・占有幅で判じない・期間から出ない形を落とさない）、新の段に 3 つ立つ（落とさない・床・掴み代を別に置かない）。⛔ **基準線を動かすときは、利用者に先に問うこと**（記録 `baseline-moves-need-user-ok`）。
- ⚠️ 検査 44（`src/` と `tests/` が引く退けた番号）の数が動く —— E-11 で `retired.py` に入れるので「定義の無い番号」には数えられない。
- ⚠️ 性能: 縮めた画面で描く要素が増える（見本の 1 年 88 件で、描く数が 6〜7 → 88）。⛔ 性能の試し（`RISK-001` の門）を走らせる前に、前に立つ者が利用者に声をかける（常設の規則。記録 `perf-test-notify`）。⛔ 最適化は進めない（`JDG-11`）—— 1 フレームの予算を割ったら数を持って問う。
- ⚠️ `dist/` は利用者が `file://` で試す。着地の報告には枝・commit・sha を添えること。

---

## 9. 仕様の外で直すもの（⛔ 本書は直さない）

| 所 | 何をする | 試験（いま引いているもの。何を主張しているか） |
|---|---|---|
| `src/entity/layout-engine/schedule-layout/schedule-layout.ts:602-612`（`keptByLevelOfDetail`）・ `:855`（`.filter`） | 消す。`// see FR-018` の注も | `tests/unit/layout-engine.test.ts:687`（`CR-163 keeps a shape that clears S-86 and drops one that does not` —— 3 日 × 6px ＝ 18 が落ちると主張）・ `:710-718`（`FR-018 still drops a Task that is merely short`）→ ⛔ 逆になる。書き直す。`:697-708`（期間ゼロはどの倍率でも描く）は緑のまま |
| `src/entity/layout-engine/screen-regions/screen-regions.ts:80` | `SCALED_BY_THE_DISPLAY` から 1 つ消す（`TRAP` の注 `:69` の「DS-1 to DS-4」も直す） | `tests/unit/cr-394-the-chart-has-a-display-scale.test.ts:322-345`（表 T-252 が `DS-1` 〜 `DS-10` を持ち、`DS-2` が「掛ける」と主張）→ 赤。`DS-2` を抜く |
| 生成物（`npm run gen`） | `SETTINGS_DEFAULTS` の `minShapeWidth: 6.4`、`taskLevelOfDetailReadablePx` が消える | `tests/unit/t-038-oc-2-labels-in-the-occupied-width.test.ts:938`（注で `taskLevelOfDetailReadablePx` 24px に頼る）・ `tests/unit/t-023d-the-plan-start-is-the-boundary.test.ts:1354`（`FLOORED_PLAN_PX = 6` —— 注のとおり値そのものは主張しない） |
| 仕様を逐語で引く試験 | — | `tests/unit/cr-393-an-arrow-names-itself-from-the-plan-start.test.ts:45`（`FR-018` の「しきい値は表 T-205 の `S-86` に従うこと（MUST）」を逐語で持つ）→ 赤。条文を抜く |
| 落ちることを前提にした試験 | — | `tests/system/cr-430-labels-and-hidden-things-sweep.test.ts:392-399`（`L-2 drops narrow Tasks, so the low end of the zoom has some` —— 落ちたタスクが 1 つ以上あると主張）→ 赤。「どの倍率でも落ちない」に書き直す。`tests/unit/uf-47-48.test.ts:123` ・ `:158` ・ `:465`（全体表示が縮めて 2 つの `Task` を落とした経緯の注と前提）・ `tests/unit/fr-055-vertical-fit.test.ts:324-325` ・ `fr-055-vertical-lod-fit.test.ts:34` ・ `:219-220` ・ `fr-055-fit-discards-the-collapse.test.ts:184` ・ `fr-055-fit-reaches-deep-tiers.test.ts:252`（「`S-86` を越える長さにした」という注。段が増えると縦の全体表示の選ぶ深さが変わりうる —— 走らせて測る） |
| 注だけが引く試験 | 注の `S-86` ・ `L-2` を直す | `tests/unit/fr-009-ptd-3-the-two-halves-of-a-bar.test.ts:389` ・ `fr-013-pointer-on-the-figure.test.ts:688` ・ `t-012-name-label-vertical.test.ts:287` |
| `sample-schedule/*.json` ・ `grs-skeleton.json` | 4.3 節 | 見本の文書を刷ったスキーマで確かめる試験（`tests/fixtures/grs-document.ts` を読むもの）が、`taskLevelOfDetailReadablePx` を持つ文書を拒む —— 消せば緑 |

⚠️ 性能: 縮めた画面で描く要素が増える（`PG-6`）。⛔ 性能の試し（`RISK-001` の門）を走らせる前に利用者に声をかけること（8 節の注）。

---

## 10. ⛔ この変更でやらないこと

- **掴み代の規則** —— 1 つも足さない（`JDG-399`、決定 5）。見本を仕様の掴み方（`GA-1` / `GA-2` / `GA-9`）で測り直すこともしない。
- **`K-49` の語**「ゼロ期間でも残す最小幅」（`tbl-glossary.md:238` と辞書）—— 本書の後は期間の短い `Task` にも効くので狭い語になるが、偽ではない。直すなら辞書と表を同じ巡で。
- **`FR-108` ・ 表 T-023a の結び ・ `RT-4a` の「LOD で描かない」の語**（決定 7）。
- **刷ったスキーマの `documentSettings` の閉じ方**（`grs-document.schema.json:226` の `additionalProperties: false` と `required`）—— `05-07-design.md:1232` が読み込みの路に禁じていることと、刷ったスキーマの形の食い違いは本書の前から在る。本書で退けた鍵を持つ古い文書を、刷ったスキーマは拒み、アプリ（`json-codec.ts:806`）は拒まない。
- **行の縦幅**（`CR-553`）、**遅延診断**、**性能の最適化**（`JDG-11`）。
- `docs/development-records/` の `pending-decisions.md` ・ `changelog.md`、`A-appendix.md` の変更履歴（当てる者が書く）。

---

## 11. 前に立つ者へ返す問い

⭐ 残る問いは無い。起草のときの 2 つに、前に立つ者が 2026-09-23 に答えた（前に立つ者の判断であり、利用者の言葉ではないので、`rulings.md` に行を起こさない）。

| # | 問い | 答え |
|---|---|---|
| 1 | 「最小幅は4px」をどの行に置くか（依頼文は新しい行 `S-350` を見立てた） | 案 A —— `S-49` の既定を 6 → 6.4（床は 1 つ、表示の倍率 100 で 4.0px）。`S-49` は既に全 `Task` の唯一の床であり、ほかの形状の細部と同じく描く比が掛かる（`DS-1`）。2 つ目の床（案 B）は 1 つの問いに 2 つの行を答えさせる。利用者の「4px」は標準の表示の倍率 100 で読む。代償: 既定 6 で保存した文書は 3.75px のまま。⇒ 0 節 ③ の決定 1 |
| 2 | 性能の試し（`RISK-001` の門）を、本書を当てたあとに走らせるか | 問いではない —— 性能の試しの前に前に立つ者が利用者に声をかけることは、常設の規則が既に定めている。⇒ 8 節の注 |

---|---|---|---|
| 1 | 「最小幅は4px」をどの行に置くか（依頼文は新しい行 `S-350` を見立てた） | **A** `S-49` の既定を 6 → 6.4（本書の形）: 描く幅 ＝ max(期間の幅, `S-49` × 描く比)。表示の倍率 50 ／ 100 ／ 200 で 2.0 ／ **4.0** ／ 8.0px。床は 1 つ。既定 6 で保存した文書は 3.75px のまま。 **B** 新しい行 `S-350` ＝ 4（画面の px、描く比を掛けない、保存しない）を足し、描く幅 ＝ max(期間の幅, `S-49` × 描く比, `S-350`): 50 ／ 100 ／ 200 で 4.0 ／ 4.0 ／ 7.5px。床が 2 つになり、倍率 110 以上では `S-49` が、100 以下では `S-350` が効く。`FR-001` と `FR-018` の文に 2 つの床を書く。 **C** `S-49` ＝ 4: 描く比を掛けると 100 で 2.5px —— 見本の 4px（描いた px）と合わない | **A**。① 「1 タスクの最小描画幅」に答える行は既に `S-49` であり（`FR-001` ・ `schedule-layout.ts:599`）、B は同じ問いに 2 つの行が答える（`R1.3`）。② 図形を表示の倍率に揃える向きは利用者が裁いている（`JDG-131`）。③ 見本の 4px は表示の倍率 100 で測った描いた px であり、A はそこでちょうど 4.0px。⚠️ 逆に、表示の倍率を 50 にした人にも 4px を守りたいなら B |
| 2 | 性能の試し（`RISK-001` の門）を、本書を当てたあとに走らせるか | 描く `Task` が増えるのは縮めた画面だけ（見本の 1 年 88 件で、描く数が 6〜7 → 88）。走らせないと、大きな文書で 1 フレームの予算を割るかが分からない。走らせるには利用者に声をかける（記録 `perf-test-notify`） | 波 2 の後、利用者に声をかけてから走らせる。⛔ 最適化は進めない（`JDG-11`）—— 割ったら数を持って問う |

---

## 12. 台帳

### 12.1 裁定（`docs/development-records/rulings.md`）

- `JDG-399` —— 本書を当てたら状態を「適用済」へ、着地先を本書と着地の commit へ変える（当てる者の仕事）。
- 起こさない。帯 `JDG-430` 〜 `JDG-434` は使わない（11 節の答えは前に立つ者の判断であり、利用者の言葉ではない）。

### 12.2 欠陥（`docs/development-records/defects.md`）

- 提案しない。`DFC-850` 〜 `DFC-854` は使わない。
- ⚠️ 見つけたが欠陥として起こさなかったもの: ① `FR-081` の選択の規則（`:2243`）が、タスク LOD で落ちた `Task` を「描かれていないタスク」に数えていなかった —— コードは描いた形だけから選ぶ（`selection-input.ts:67-73`）ので振る舞いは正しく、本書で落ちる `Task` が無くなるので閉じる。② `K-55` の語の食い違い（2 節 ②）—— 本書で行ごと退く。③ 刷ったスキーマの `documentSettings` の閉じ方（10 節）—— 本書の前から在る。起こすかは前に立つ者が決める。

---

## 13. 測り方の再現

```
# totals (before), 2026-09-23, a912f4ea
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/md-checks.py | grep "tables="
#   -> tables=186  figures=27  rows=2282  uids=162

# the new-identifier bands are unused (2026-09-23, a912f4ea)
git grep -nE "\bRK-3\b|\bS-35[0-4]\b|\bJDG-43[0-4]\b|\bDFC-85[0-4]\b" -- . ':!previous-project-result'
#   -> nothing
for p in S RK JDG DFC; do
  git grep -ohE "\b$p-[0-9]+[a-z]?\b" -- docs src tests tools change-request | sed "s/$p-//;s/[a-z]$//" | sort -n | uniq | tail -1
done
#   -> S 999 (a test sentinel; the next is 338, claimed by CR-551), RK 2 (CR-551), JDG 399, DFC 799 (CR-551's band)

# every reader of S-86 (docs/spec, src, tests, tools)
git grep -nE "S-86\b|taskLevelOfDetailReadablePx|keptByLevelOfDetail|DS-2\b|\bL-2\b|K-55\b" -- docs/spec src tests tools sample-schedule docs/guides
#   -> section 3 and section 9 list every hit

# graph (every ID of 6.1, every group of 6.2)
strictdoc export docs/spec --formats=json --output-dir scratch/spec-check/sd-out --no-parallelization
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py <ID>
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/induced.py <seeds>

# rulings reached (6.1): grep docs/development-records/rulings.md for each row reached

# CR-551 overlap: each of this file's 14 old blocks, counted inside CR-551
#   -> 0 of 14 appear there (neither in its old nor in its new text)

# every old block of section 4 occurs exactly once in its file, and all 14 apply in order to a COPY
#   scratchpad cr552-build.py verify
#   edits parsed: 14 (E-01 E-02 E-03 E-04 E-05 E-06 E-07 E-08 E-09 E-10 E-11 J-01 J-02 J-03)
#   base a912f4ea: problems 0, applied 14 of 14
#   settings.json: json.loads ok, 0 schema errors, S-86 present False, S-49 present True
#   display-words.json: json.loads ok, K-55 present False, K rows 122
#   retired.py: compiles; RETIRED holds L-2 S-86 DS-2 K-55: True
#   old blocks found inside CR-551: 0 of 14 
#   CR-551 text edits applied first: 35 of 35 (problems 0); then these: problems 0, applied 14 of 14
#   md-checks on a copy (before): tables=186  figures=27  rows=2282  uids=162
#   md-checks on a copy (after): tables=186  figures=27  rows=2278  uids=162
```
