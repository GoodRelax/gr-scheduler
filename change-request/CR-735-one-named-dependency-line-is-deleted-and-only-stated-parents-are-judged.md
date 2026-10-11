# CR-735 —— 依存線を 1 本だけ名指して消す命令を足し、`FA-3` を表のとおり機械／選ぶで直す。`VC-9`〜`VC-12` は明記の親だけで判じる

> 起草の状態: 当てた（2026-10-11、作業木 `2bb7d3ce` の上）。調整役の波 1 の体 B が、起草・仕様・コード・既存の試験・台帳を同じ作業木で行った。
> ID の帯: 番号 `CR-735`、変更履歴 `4.39`、`perf-pending` `178`、裁定 `JDG-1960`〜`JDG-1964`、台帳 `DFC-2425`〜`DFC-2429`、問い `PND-888`〜`PND-890` を調整役から受けた。使ったのは `CR-735` と `4.39` だけ（新しい裁定・台帳・問いの行は無い。毎フレームの経路に触れないので `perf-pending` の行も無い）。新しい行 ID は `CM-93` の 1 つ（表 T-108 の最大の `CM-92` の次）。`2bb7d3ce` の木で `CR-735` を名乗る変更要求は 0 件、変更履歴の `4.39` は 0 件、`CM-93` は 0 件、`deleteDependencyAt` ・ `withoutDependencyAt` は 0 件だった（9 節）。
> 当てるもの: `JDG-1953`（「1 本だけ消す命令を足す (推奨)」、`DFC-2418`）と `JDG-1954`（「明記した親だけ (推奨)」、`DFC-2419`）。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 行は仮説 —— 反証した結果（`2bb7d3ce`）

| 主張 | 見たもの | 本書での扱い |
|---|---|---|
| `CM-37` は線を 1 本ずつ消せない | `src/use-case/edit-document/edit-dependency.ts` の `deleteDependency` の枝は、後続の依存から `predecessorUid` の一致する線を全部除く | 新しい命令 `CM-93` を足す（X-1） |
| 同じ向きの線は名指す鍵を持たない | `Dependency`（`AT-42` の要素）が持つのは `predecessorUid`・`linkType`・`lag`・`lagFormat`・運ぶ値だけ。種類と `lag` が同じ線は、並びの中の位置でしか見分けられない | 名指しは並びの中の順（X-2） |
| `JDG-1953` の着地に 表 T-310 の `VC-3` が要る | `VC-3` は「同じ 2 つの `Task` の間に依存が 2 本以上ある」という指摘の定めで、直し方も命令も持たない（直し方は 表 T-373 の `FA-3`） | 変えない。裁定の行の着地の欄にその旨を書いた |
| `JDG-1954` の着地に `FR-135` が要る | `FR-135` は導いた親を「診断の中でだけ使う」と言い、どの観点に使うかは各表の行が言う（`VS-6`・`DG-3`・`MP-2` は自分の行で言っている） | 変えない。`VC-9`〜`VC-12` が自分の行で言う（X-4） |
| 診断は導いた組に `VC-9`〜`VC-12` を立てない | `delay-diagnostics.ts` の `contradictionsOf` は `parentContradictions` に `explicitChildrenOf`（`parentTaskUid` で組んだ子）だけを渡す。マイルストーンの親も除く（`FR-135`） | コードは変えない（`JDG-1954`） |
| 前文の ⛔ を外すと、仕様だけを読む試験が赤になる | `tests/contract/cr-731-t-373-the-rows-that-mend-themselves.contract.test.ts` の 1 件が前文の字を引いていた | その 1 件を 表 T-310 の新しい文を引くように直した（5 節） |

### 0.2 裁定の鎖（`rulings.md` を「依存線」「消す」「導いた親」「明記」「FA-3」「VC-9」で引いた）

| 裁定 | 何を決めたか | 本書との関係 |
|---|---|---|
| `JDG-1944` | 機械で直すのは 7 種類とも（同じ依存の重なりを 1 本にする、を含む）。導いた親子では直さない | `FA-3` の機械を本書が実際に当てられるようにする。導いた親子は 表 T-310 が判じないので行が出ない |
| `JDG-1953` | 1 本だけ消す命令を足す（`DFC-2418` の (A)） | X-1〜X-3 |
| `JDG-1954` | `VC-9`〜`VC-12` は明記の親だけ（`DFC-2419` の (B)） | X-4・X-5 |

覆す裁定は無い（`JDG-1944` は 1 種類も戻さない —— `JDG-1953` の言葉どおり）。

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

- `GL-006`（横断の作法）—— 機械の直しが表の言うとおりに当たれば、利用者は「機械」の行を読んでそのまま了承できる。表と動きが食い違うと、行ごとに確かめる手間が戻る。

### ② レビュー観点のどの条項を当て、何が出たか

- `R1.3`（同じことを 2 か所で言わない）—— 1 本を除く規則は `Schedule` の `withoutDependencyAt` 1 つにし、命令（`EditDocument`）と直す案の写しへの当て（`delay-fixes.ts` の `scheduleAfter`）の両方がそれを呼ぶ。「明記の親だけ」の理由は `VC-9` だけが持ち、`VC-10`〜`VC-12` は `VC-9` を指す。
- `R2.22`（名は指すものを言う）—— `deleteDependencyAt` は「並びの中の位置で名指して消す」、`withoutDependencyAt` は「その位置の線を除いた `Task`」を言う。

### ③ 利用者に問わずに決めたこと

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| X-1 | 新しい命令は 表 T-108 の `CM-93`、確定名 `deleteDependencyAt`、群 `Dependency`、正は `FR-155` | `JDG-1953`。この命令を使うのは 表 T-373 の `FA-3`（`FR-155`）であり、人の削除（`FR-032` の `CM-37`）は今のまま | 無い（AI も `AM-7` で使える —— 表 T-108 の命令はすべて `AM-7` が受ける） |
| X-2 | 名指しは後続（`successorUid`）・先行（`predecessorUid`）と、後続の依存の並びのうち**その先行から来る線の中の**順（`order`、0 が最初） | 並び全体の位置で名指すと、同じ束でほかの先行の線（`FA-2` の自己依存など）を先に消したとき位置がずれる。同じ先行の線の中の順なら、ずれるのは同じ組の線を消したときだけで、それは `FA-3` 自身が後ろから消すので起きない | 無い |
| X-3 | 名指した線が無ければ断る（`CM-37` は無ければ何もしない） | 位置で名指す命令が黙って通ると、別の文書で作った束が、誰も名指さなかった線を消しうる。断れば `FR-155` の「束のどれかを断ったら全部当てない」が効く | 無い |
| X-4 | 「明記の親だけ」の理由は `VC-9` が持ち、`VC-10`〜`VC-12` は `VC-9` を指す | 表 T-310 の行ごとに書く（`JDG-1954`）が、理由を 4 度書かない | 無い |
| X-5 | 表 T-373 の前文の ⛔ は外すだけで、代わりの文を置かない | 導いた組には `VC-9`〜`VC-12` が立たないので、`FA-9`〜`FA-12` の行も無い —— 前文が言うことが残らない | `（MUST NOT）` が 1 つ減る |

---

## 1. 範囲 —— 行き先

| 観点 | 今 | 本書の後 |
|---|---|---|
| 同じ向きの 2 本のうち 1 本を消す | 命令が無い。`FA-3` の行は「手で直す」に落ちる | `CM-93` で 1 本ずつ名指して消す。`FA-3` は種類と `lag` が同じなら機械、違えば選ぶ（択は線の数） |
| 導いた組の `VC-9`〜`VC-12` | 表は言わない。前文は導いた組に指摘が立つ前提で「手で直す」と言う | 表 T-310 が「明記の親だけで判じる」と言い、前文の ⛔ は無い。診断の振る舞いは変わらない |

---

## 2. 新しい識別子

| 番号 | 置き場 | 何か |
|---|---|---|
| `CM-93` | `_assets/tbl-glossary.md` の 表 T-108 の `CM-37` の後 | 依存線を 1 本だけ消す（`deleteDependencyAt`） |
| `withoutDependencyAt` | 表 T-064 の `PI-1`（`Schedule`） | 1 つの先行から来る線のうち順で名指した 1 本を除いた `Task`（無ければ `null`） |

---

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

| 旧 | 新 |
|---|---|
| 表 T-373 の前文「⛔ `parentTaskUid` が `null` で、親を `FR-135` で導いた組には、`FA-9` 〜 `FA-12` の機械・選ぶ・日付の候補を当ててはならない（MUST NOT） —— その行は手で直すとする。」 | 無し（X-5） |
| 表 T-373 の `FA-3` の `命令` の欄 `CM-37` | `CM-93` |

ほかの文は消さない（足すだけ）。

---

## 4. 書き直す所

### X-1 —— 表 T-108（`CM-37` に書き添え、`CM-93` を足す）

```
| CM-37 | `Dependency` | `deleteDependency` | — | 依存線を消す（先行と後続の組で名指し、その向きの線をすべて —— 1 本だけは `CM-93`） | `FR-032` |
| CM-93 | `Dependency` | `deleteDependencyAt` | — | 同じ向きの線のうち 1 本を、後続（`successorUid`）・先行（`predecessorUid`）と、後続の依存の並び（`_assets/fig-erd-detail.md` の `AT-42`）でその先行から来る線の中の順（`order`、0 が最初）とで名指して除く。<br>その線が無ければ断る —— 同じ向きの線は線ごとの名を持たず、並びの中の順でしか名指せない | `FR-155` |
```

⚠️ 初めの字（「依存線を 1 本だけ消す —— …」）は検査 11 が `CM-37` と似た行として新しい重なりに数えたので、`CM-93` の書き出しを命令の働き（1 本を名指して除く）から始めた。

### X-2 —— 表 T-373 の `FA-3`

```
| FA-3 | `VC-3` | 種類（`linkType`）と `lag` がすべて同じなら機械、違えば選ぶ | 機械: 文書の依存の並びで最初の 1 本を残し、ほかを消す。<br>選ぶ: 残す 1 本を選び、ほかを消す —— 択は線の 1 本ずつ（種類と `lag`）。<br>消す線は 1 本ずつ名指す（同じ向きの線も残す 1 本を残せる） | `CM-93` | — |
```

### X-3 —— 表 T-373 の前文から ⛔ を 1 つ外す（3 節）

### X-4 —— 表 T-310 の `VC-9`〜`VC-12`

```
| VC-9 | 4 | 親が完了（`PS-2`）なのに、子に未完了がある。<br>⭐ 親と子は、子の `parentTaskUid` が指す親（明記の親）だけで組む —— `FR-135` で導いた親では判じない。<br>導いた親は人が結んでいない関係であり、その完了や両端が子とそろわないことは矛盾ではない（利用者が定めた） | `actualFinish` ・ `parentTaskUid` |
| VC-10 | 4 | 子が全部完了なのに、明記の親（`VC-9`）が未完了 | 同上 |
| VC-11 | 4 | 明記の親（`VC-9`）の予定の両端が、子の両端（最も早い `start` と最も遅い `finish`）と違う | `start` ・ `finish` ・ `parentTaskUid` |
| VC-12 | 4 | 明記の親（`VC-9`）の実績の両端が、子の両端と違う（…） | 実績の 2 列 ・ `parentTaskUid` |
```

⚠️ 初めは `VC-10`〜`VC-12` の各行に同じ一文（「明記の親だけで判じる（`VC-9` と同じ）」）を足したが、検査 11 が 3 行の同じ字を新しい重なりに数えた。観点の文の「親」を「明記の親（`VC-9`）」と書き、同じ字を 3 度書かない形にした。

### X-5 —— `FR-009` の依存の命令の並び

| 旧 | 新 |
|---|---|
| 表 T-108 に種別や端を変える命令は無く（`CM-36` 〜 `CM-38`）、 | 表 T-108 に種別や端を変える命令は無く（`CM-36` 〜 `CM-38` ・ `CM-93`）、 |

### X-6 —— 表 T-064（`_source/published-entries.json`）

| 行 | 変えるもの |
|---|---|
| `PI-1`（`Schedule`） | `withoutDependencyAt` を `taskByUid` の後に足す |
| `PI-1` の `DelayFixCommand` の注 | 「`CM-3` ・ `CM-11` ・ `CM-13` ・ `CM-37` ・ `CM-93` と同じ形」 |

### 4.1 生成物

`npm run gen`（`gen:tests`・`gen:index` を含む）が `_assets/tbl-published-entries.md`・`_assets/tbl-row-id-prefixes.md`・`docs/review/public-entry-index.md`・`docs/development-records/test-inventory.md` を書いた。`strictdoc export docs/spec` は通った（出力は `scratch/` へ。根に `output` を作っていない）。

---

## 5. 継ぎ目（コード）と試験

| ファイル | 変えたもの |
|---|---|
| `src/entity/document-model/schedule/schedule.ts` | `withoutDependencyAt(task, predecessorUid, order)` —— 1 本を除いた `Task`、無ければ `null` |
| `src/use-case/edit-document/edit-dependency.ts` | `DependencyCommand` に `deleteDependencyAt`（`predecessorUid`・`successorUid`・`order`）。`withOneLineDeleted` —— 無ければ `CM-93` / `FR-155` で断る |
| `src/use-case/edit-document/edit-document.ts` | `DEPENDENCY_KINDS` に `deleteDependencyAt`（`EditDocument` の道に載せる） |
| `src/entity/document-model/schedule/delay-fixes.ts` | `DelayFixCommand` に `deleteDependencyAt`。`keepOutcome` は残す 1 本のほかを、後ろから 1 本ずつ `deleteDependencyAt` で名指す（`deleteLineAt`）。`scheduleAfter`・`writtenUidsOf`・`touchedUidsOf` が新しい命令を読む |
| `tests/contract/cr-731-t-373-the-rows-a-person-chooses-or-dates.contract.test.ts` | `DFC-2418` に結んだ `it.fails` の 2 件を `it` に戻した（緑）。`DFC-730` の 2 件（`cr-731-un-21-…`）はそのまま |
| `tests/contract/cr-731-clauses.ts` ・ `tests/contract/cr-731-t-373-the-rows-that-mend-themselves.contract.test.ts` | 前文の ⛔ を引いていた 1 件を、表 T-310 の `VC-9` の新しい文を引く 1 件に直した。項目 10（導いた組に `FA-9`〜`FA-12` の機械・選ぶ・日付の候補の行が無い）はそのまま緑 |

毎フレームの経路（規則 04 の 5 節）: 触れない。直す案は診断とチェックが変わったときだけ作り直す（`CR-734` の 5 節）。

---

## 6. グラフ（`impact.py`・`induced.py`、本書を当てた木）

- `CM-93` を指すのは要求 2 件・4 か所（`FR-009`・`FR-155` の 表 T-373・表 T-108 の節・表 T-064）。
- `VC-9` を指すのは要求 3 件・7 か所、`CM-37` は要求 1 件・5 か所、`FA-3` を名指す所は表の外に無い。
- 触れる物の誘導部分グラフ（`T-108`・`CM-37`・`CM-93`・`FA-3`・`VC-3`・`VC-9`〜`VC-12`・`T-373`・`T-310`・`FR-135`・`FR-155`・`FR-032`・`FR-009`）: 当てる前 14 個・辺 11・輪 0、当てた後 15 個・辺 17・輪 0。

---

## 7. 数（実測）

- 表 T-108 の行 +1（`CM-93`）。要求 ±0、表 ±0、`（MUST）` ±0、`（MUST NOT）` −1（`01-04-requirements.md` で 954 → 953、`git show HEAD:` と作業木を数えた）。
- 表 T-064 のメンバ 397 → 398（`npm run gen:entries` が刷った数）。

---

## 8. 台帳

| 台帳 | 動かしたもの |
|---|---|
| `rulings.md` | `JDG-1953`・`JDG-1954` を `適用済`（着地の欄に仕様の行 ID） |
| `defects.md` | `DFC-2418`・`DFC-2419` を `仕様待ち` から `実測待ち`（実物の手順を経緯の欄に） |
| `changelog.md` | `4.39` |

---

## 9. 測り方の再現

```
git grep -c "CR-735" 2bb7d3ce -- change-request                                                 # 0 件（台帳の「CR-735 が当てる」は数えない）
git grep -c "CM-93\|deleteDependencyAt\|withoutDependencyAt" 2bb7d3ce -- docs src tests change-request   # 0 件
git grep -c "| 4.39 |" 2bb7d3ce -- docs                                                         # 0 件
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py CM-93 FA-3 VC-9 CM-37
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/induced.py T-108 CM-37 CM-93 FA-3 VC-3 VC-9 VC-10 VC-11 VC-12 T-373 T-310 FR-135 FR-155 FR-032 FR-009
```
