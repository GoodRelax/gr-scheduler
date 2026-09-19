# CR-428 — MSPDI の参照を版ごとのフォルダに分け、仕様書が指すローカル複製のパスを `pj12/` へ移す

> **閉じるもの**: 利用者の指示（2026-09-19）。
> - 「`docs/reference/mspdi` を 12用と15用を分けたい。 その上で、 12と15の比較検討などを行い、最終的にはGRSが12と15の両方に対応できるようにしたい。」
> - 分け方・ブランチ・引用の扱いの提案への答え: 「すべて提案通りにやれ」
>
> ⭐ **本書は置き場所だけを動かす。** 仕様の意味は 1 つも変えない。pj15 を仕様書へ持ち込むのは、両対応の変更要求（本書の後）である。
> 読んだ木は `5a2d67d9`（ブランチ `mspdi-pj15`）。比較の実測は `docs/review/mspdi-pj12-vs-pj15-2026-09-19.md`。

---

## 0. ⛔ 立ちどまって答える 3 つ

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

⭐ **`GL-004`**（`CH-1` の受ける目標）—— 外部と情報を落とさずに往復できる状態。pj15（Project 2013、ファイルは `SaveVersion` 14）の文書を落とさずに往復させる準備として、2 つの版の正典を取り違えない置き場を作る。本書だけでは振る舞いは変わらない。

### ② レビュー観点のどの条項を当て、何が出たか

- **`R1.3`（唯一の正）** —— 取得手順の正は `previous-project-result/01-mspdi/mspdi/README.md` の 1 か所のまま（`docs/reference/README.md` の「手順を複製しない」）。pj15 の取得手順もそこへ足し、参照棚の README は置き場の説明だけを持つ。
- **`R1.3`（参照の一意性）** —— 仕様書の中でローカル複製をフルパスで指す所は 5 か所（`EX-8` 1、`05-07-design.md` 1、`_source/mspdi-custom-fields.json` 3）。版の入ったファイル名は変えないので、`mspdi_pj12.xsd:NNN` の形の引用は 1 つも動かない。
- **表 T-003 の `CN-7`（出典はファイル名と行番号）** —— ファイル名を変えないことで、既存の引用がそのまま `CN-7` を満たす。

### ③ 利用者に問わずに決めたこと

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| 決定 1 | ファイル名は変えない（`mspdi_pj12.xsd` のまま `pj12/` へ）| ⭐ 名前が版を持つので、行番号の引用がフォルダに依らず版を名乗る | パスが 1 段深くなる |
| 決定 2 | pj12 から作った ERD の要約（`_erd-part-M*.md`、`mspdi-erd-ja.md`）は `pj12/` へ入れる | ⭐ 中身が pj12 の読みである | 無し |
| 決定 3 | `learn-docs/` は動かさない | ⭐ どちらの版とも一致しない（比較の第 5 節）| 無し |
| 決定 4 | 記録（`change-request/`、`docs/review/`、`docs/development-records/`）の古いパスは書き換えない | ⭐ その時点で読んだ場所の事実である | 古いパスを追う読み手は、本書を見て読み替える |
| 決定 5 | pj15 の出典の規則（公式 URL が無いこと）は、本書では仕様書へ入れない | ⭐ 仕様書はまだ pj15 を 1 行も引いていない。規則は最初の引用と同じ変更要求で置く | 規則が置かれるまで、pj15 の引き方は取得手順の README と比較の文書だけが持つ |
| 決定 6 | 利用者の手元の参照棚（git 管理外）は、合流の前に新しい配置の複製を置き、古い平置きのファイルは合流の後で消す | ⭐ 合流の前後どちらの木で試験を回しても XSD が読める | 合流までのあいだ、同じファイルが 2 か所にある |

---

## 1. 読んで確かめた事実

| 事実 | 所（`5a2d67d9`、当てる前）|
|---|---|
| `EX-8` が並びの根拠としてローカル複製をフルパスで指す | `docs/spec/01-04-requirements.md:4840` |
| 6.2 節が「事実はローカル複製で確かめる」とフルパスで書く | `docs/spec/05-07-design.md:1260` |
| 拡張領域の枠の原稿が、3 つの値の出典をフルパスで書く（契約は `^docs/reference/` で始まることだけを求める）| `docs/spec/_source/mspdi-custom-fields.json:15`、`:20`、`:25`、`_source/mspdi-custom-fields.schema.json:23`、`:55` |
| 生成物 `src/adapter/document-codec/mspdi-custom-fields.json` は出典の欄を持たない | `tools/generate_mspdi_custom_fields.py` の出力 |
| 並びの試験が XSD を実行時にフルパスで読む | `tests/unit/uf-36.test.ts:90` |
| A.1 は公式 URL だけを書き、ローカルのパスを書かない | `docs/spec/A-appendix.md:18`〜`:19` |
| pj15 の公式 URL は HTTP 404、pj12 は HTTP 200 | 比較の第 2 節（2026-09-19 に `curl` で測った）|

## 2. 測った

`impact.py EX-8` —— 属する表 T-033、指している所は `05-07-design.md:1330`（6.2 節）の 1 か所だけ。`induced.py EX-8 EX-1` —— 閉路 0。

## 3. グラフ

`EX-8` の文字列だけを変え、指す先・指される先は変えない。閉路に入らない。

## 4. 当てた中身

| # | 所（当てたあと）| 前 | 後 |
|---|---|---|---|
| 1 | `docs/spec/01-04-requirements.md:4840`（`EX-8`）| `docs/reference/mspdi/mspdi_pj12.xsd:991` | `docs/reference/mspdi/pj12/mspdi_pj12.xsd:991` |
| 2 | `docs/spec/05-07-design.md:1260` | `docs/reference/mspdi/mspdi_pj12.xsd` | `docs/reference/mspdi/pj12/mspdi_pj12.xsd` |
| 3〜5 | `docs/spec/_source/mspdi-custom-fields.json:15`、`:20`、`:25` | `docs/reference/mspdi/mspdi_pj12.xsd:NNNN` | `docs/reference/mspdi/pj12/mspdi_pj12.xsd:NNNN`（行番号はそのまま）|
| 6〜7 | `tests/unit/uf-36.test.ts:11`、`:90` | `…'mspdi', 'mspdi_pj12.xsd'` | `…'mspdi', 'pj12', 'mspdi_pj12.xsd'` |
| 8 | `tools/generate_startup_template.py:499`（注釈）| `docs/reference/mspdi/_erd-part-M2-task.md` | `docs/reference/mspdi/pj12/_erd-part-M2-task.md` |
| 9〜10 | `previous-project-result/README.md:105`、`:188` | `docs/reference/mspdi/mspdi_pj12.xsd` | `docs/reference/mspdi/pj12/mspdi_pj12.xsd` |
| 11 | `docs/development-rules/04-verification.md:388` | `docs/reference/mspdi/*.xsd` | `docs/reference/mspdi/pj12/mspdi_pj12.xsd` |
| 12 | `previous-project-result/01-mspdi/mspdi/README.md` | pj12 だけの取得手順 | 版ごとの置き場、pj15 の取り出し手順（`7z`、`.msi` は実行しない）、両方のハッシュ、pj15 に公式 URL が無いこと |
| 13 | `docs/reference/README.md` の `mspdi/` の行 | 平置きの説明 | `pj12/` ／ `pj15/` ／ `learn-docs/` の説明 |

## 5. 数の予測

本書の差: **tables 0 ／ figures 0 ／ rows 0 ／ uids 0**。`（MUST）` `（MUST NOT）` の数も変わらない（パスの文字列だけを替える）。
⭐ 生成物: `npm run gen:check` は差 0 のまま（生成物は出典の欄を持たない）。

## 6. 影響

### 6.1 仕様

`EX-8` と 6.2 節の本文の、ローカル複製のパスだけ。意味は変わらない。

### 6.2 記録

`docs/development-records/changelog.md` に 2.47 を 1 行足す。⛔ 裁定の台帳（`rulings.md`）には本書では足さない —— 本書が当てる中身は置き場所であり、仕様の規則ではない。両対応の変更要求で、pj15 の引き方と `EX-1` の読みの裁定と一緒に足す。

### 6.3 実装と試験で直す所

`tests/unit/uf-36.test.ts:90` —— 読む XSD のパス（本書で直した）。
⚠️ 作業木では、`docs/reference/mspdi/` を新しい配置で写さないと `uf-36` は読み込めない（`docs/development-rules/04-verification.md` の 6.7 の罠は、置き場が変わっても同じ）。

## 7. 試験が主張すべきこと

新しい配置（`pj12/mspdi_pj12.xsd`）の木で `uf-36` が読み込めて緑であること。古い平置きしかない木では読み込めない（それが本書の当たった証拠になる）。

## 8. 関係

- 比較の実測: `docs/review/mspdi-pj12-vs-pj15-2026-09-19.md`（両対応の前に決める問い Q1〜Q6 を持つ）。
- `DFC-563`: 比較の探針で、pj12 だけの文書でも `EX-1` を破ることが分かった。本書では直さない。

## 9. ⛔ この変更でやらないこと ／ 返す問い

- pj15 を仕様書へ入れない（`EX-1` の「公式スキーマ」がどちらかは、比較の Q1 への答えを待つ）。
- 並びの表（`mspdi-codec.ts:59`）を変えない。
- 返す問い: 比較の第 6 節 Q1〜Q6。
