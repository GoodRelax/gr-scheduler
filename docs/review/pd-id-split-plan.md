---
type: Plan
title: `PD-` の廃止 — 表 T-023a を `PTD-`、台帳を `PND-` へ
description: 同じ `PD-n` が仕様書の表 T-023a の行と、台帳の未裁定の決めごとの両方を指している。2026-09-12 に実害が出た（生きた仕様の指し先が 3 箇所剥がされた）。⛔ 単純置換は危険。スコープの実測と、逐次置換の計画を置く。
tags: [id, namespace, rename, spec, ledger]
status: plan
---

# `PD-` の廃止 — `PTD-` と `PND-` へ分ける

**利用者の裁定 2026-09-12**: `PD-x` は廃止する。両者に別 ID を振る。

```
表 T-023a の行（Pointer Down）      PD-n  →  PTD-n
台帳の未裁定の決めごと（Pending Decision）  PD-n  →  PND-n
```

⭐⭐ **両方を廃すことの値打ち** —— 片側だけ改名すると、残った `PD-3` は**永久に曖昧**である。
両方を廃せば **`PD-\d+` が 1 つでも残っていること自体が誤り**になり、**機械で終端を判定できる。**
⇒ **最後の関門は「`PD-\d+` は 0 件であること」**という 1 行の検査になる。

---

## 1. なぜ直すのか — ⛔ 実害が出ている

2026-09-12、掃除の巡で前に立つ者が `PD-\d+` を台帳に照合する分類器を書き、
**仕様書の表 T-023a の行を「閉じた決めごと」と判定した。**
体がその一覧で掃き、**`item-hit-area.ts` から生きた指し先を 3 箇所剥がした。**うち 1 件は文字どおり:

> `Table T-023a's PTD-3 says the same from the other side`

⇒ ファイルごと戻したが、⭐ **これは偶然ではなく構造が保証していた事故である。**
**同じ分類器を次に誰が書いても、同じ判定をする。**

### ⚠️ 規則がこれを防げなかった理由も測ってある

`docs/development-rules/08-spec-template/spec-writing-rules.md:166`「ID の接頭辞」は
**「表に無い接頭辞を本文で使ってはならない（MUST NOT）」**と定めているが、
その表が持つのは **`GL` `UC` `FR` `NFR` `ADR` `SWS` `TC` `TR` の 8 つ**、つまり **StrictDoc のノード ID だけ**である。

⛔ **表の「行 ID」用の登録簿が存在しない。**
実測: **行 ID の接頭辞は 119 個使われており、1 つも登録されていない。**

---

## 2. ⭐ 衝突はこれ 1 つだけである（実測 2026-09-12）

| 測ったもの | 値 |
|---|---:|
| `docs/spec` に定義された行 ID | **1,891** |
| **2 つの仕様表に定義されたもの** | **0** ⭐ |
| 文書をまたいで同じ ID が行として定義されたもの | 67 |
| 　└ **真の衝突（実体が別）** | **`PD-` の 4 個だけ** |
| 　└ 写し（記録が仕様の行を名指す。`UF-` 37・`PG-` 13 ほか）| 63 |

```
SPEC   PTD-1 = 中ボタンドラッグ、または Ctrl だけを伴う左ドラッグ → パン
LEDGER PD-1 = themeHue から実際の色を解く彩度と明度、および固定色 2 つの値
```

⇒ ⛔ **仕様書そのものは綺麗である。**直すのは `PD-` の 1 件でよい。

---

## 3. スコープ — 実測（git 追跡下のみ、`docs/spec/output/` を除く）

**総計 1,684 箇所 / 181 ファイル**

| 領域 | 総数 | ⛔ **曖昧**（`PD-1`〜`5`・`4a`）| 明白（`PD-6` 以上 ＝ 台帳）|
|---|---:|---:|---:|
| 台帳 `docs/development-records` | 590 | 61 | 529 |
| `tests/` | 340 | **212** | 128 |
| `src/` | 335 | **140** | 195 |
| `change-request/` | 254 | 31 | 223 |
| その他（`docs/review` ほか）| 94 | 38 | 56 |
| 道具・検査 `tools/` `.claude/` | 30 | 15 | 15 |
| **`docs/spec`** | **23** | **21** | **2** |
| `previous-project-result/` | 14 | 0 | 14 |
| 規則 `docs/development-rules` | 4 | 0 | 4 |
| **合計** | **1,684** | **518** | **1,166** |

### ⛔ 危険はここに集中している

- **`PD-6` 以上の 1,166 箇所は無条件に `PND-`**（台帳にしか存在しない番号）
- **`PD-1`〜`PD-5`・`PD-4a` の 518 箇所は、1 件ずつ判定が要る。66 ファイルに散っている**

**曖昧な箇所を多く持つファイル:**

```
74  src/adapter/input-command-translator/input-command-translator.ts
41  src/framework/single-html-shell/frame-loop.ts
38  tests/unit/t-023a-ptd-1-pan-follows-the-pointer.test.ts
35  tests/unit/uf-30-31.test.ts
25  docs/development-records/fixed-defects.md
23  docs/development-records/pending-decisions.md
22  tests/unit/ar-05-a-comment-box-is-placed.test.ts
21  tests/unit/in-2-pointer-shape.test.ts
20  tests/system/nfr-004-file-scheme-sweep.sws.test.ts
15  docs/spec/01-04-requirements.md
```

### ⚠️ 単純置換が壊す 5 つのもの

| # | 罠 | なぜ |
|---|---|---|
| **1** | **`PD-4` が `PD-4a` を食う** | `PD-4` の正規表現は `PD-4a` の頭に当たる。⛔ **必ず `\b` ではなく `(?![0-9a-z])` で止める** |
| **2** | **`PD-1` が `PD-10` `PD-100` を食う** | 同上。**曖昧集合と明白集合を同じ走査で扱ってはならない** |
| **3** | **試験ファイル名**に `pd-` が入っている | `t-023a-ptd-1-…test.ts` / `fr-009-ptd-3-…test.ts` ⇒ **`git mv` が要る** |
| **4** | **コードの型の値である** | `export type PressRow = 'PTD-1' \| … \| 'PTD-5'` ⇒ **製品コードの変更。掃除の巡では触れない** |
| **5** | **生成の経路に入っている** | `_source/display-words.json` が `"rowId": "PTD-1"` を持ち、**roster は `docs/spec` から毎回読む** ⇒ **片方だけ変えると `npm run gen:check` が落ちる** |

⚠️ さらに: **`docs/spec/_source/*.json` の `$comment` が台帳側の `PD-51` / `PD-160` を引いている。**
⇒ **SSOT の中に台帳の ID が在る。**これは `PND-` 側である。

---

## 4. ⛔ 逐次置換の計画 — **単純置換をしない**

### 巡 0 — 分類だけ。⛔ 1 文字も書き換えない

**成果物**: `docs/review/pd-sites.jsonl` —— 1,684 箇所すべてを 1 行 1 件で:

```json
{"path":"src/...ts","line":175,"token":"PTD-1","target":"PTD-1",
 "evidence":"PressRow type literal; 表 T-023a の行","confidence":"certain"}
```

**判定の根拠（機械で付ける）:**

| 目印が近くに在る | 行き先 |
|---|---|
| `表 T-023a` `T-023d` `PressRow` `MK-9a` `FR-009` `AR-1`〜`AR-6` `Ctrl` `pan` `構え` `hit` | **`PTD-`** |
| `@provisional` `未裁定` `裁定済` `pending-decisions` `台帳` | **`PND-`** |
| ファイルが `pending-decisions.md` の行 | **`PND-`** |
| 番号が **6 以上** | **`PND-`**（無条件） |
| 番号が **`4a`** | **`PTD-`**（⭐ 台帳に `PD-4a` は無い） |

⛔ **どれにも当たらない箇所は `confidence: "unknown"` として残し、人が裁く。**
⚠️ **巡 0 の合否は「置換した数」ではなく「`unknown` が 0 になったこと」である。**

⭐ **検算**: 無作為に 30 件を抽出し、前に立つ者が原典に当たって分類を確かめる。
**1 件でも外れたら、分類器を直して全件やり直す。**

---

### 巡 1 — **仕様側（`PTD-`）**。⛔ ここを先にやる

**理由**: 型の値であり試験が押さえているので、**誤りが赤で出る。**台帳側は散文が主で、誤っても黙っている。

**1 つの不可分な手として行う**（途中で門が緑にならない）:

1. `docs/spec/01-04-requirements.md` の表 T-023a の行 ID を `PTD-1`〜`PTD-5`・`PTD-4a` へ
2. 同原稿の本文からの参照
3. `src/` の `PressRow` の型の値と参照（`PTD-` と判定された 140 箇所のうち仕様側）
4. `tests/` の参照（212 箇所のうち仕様側）
5. **`git mv`** —— 試験ファイル 2 本
6. `npm run gen` → `_source/display-words.json` の `rowId`

**門**: `npm run guard:commit`（`gen:check` を含む）。⛔ **`npm run gen:check` が落ちたら 6 を忘れている。**

⚠️ **`docs/spec` を変えるので CR が要る**（`change-request/`、裁定 2026-08-22 の手順。検査 22 が規則 ①②⑧ への答えを求める）。

---

### 巡 2 — **台帳側（`PND-`）**

**1 つの不可分な手として行う:**

1. `docs/development-records/pending-decisions.md` の行 ID
2. **`@provisional PD-n` の印**（`src/` と `tests/`）
3. **`.claude/skills/spec-graph-check/check-pending-decisions.py` の正規表現**
   ⛔⛔ **3 を同じ手でやらないと検査 25 が赤になる**
4. 他の台帳（`fixed-defects.md` `defects.md` ほか）からの参照
5. `docs/development-rules/05-working-method.md:301` の `// @provisional PD-n` の記述
6. `docs/spec/_source/*.json` の `$comment` の `PD-51` `PD-160`

**門**: `npm run guard:commit`。⛔ **検査 25 を名指しで確かめる** —— 「every provisional mark matches its row」。

---

### 巡 3 — **終端を機械にする**

```
新しい検査:  PD-\d+ は追跡下のどこにも在ってはならない（0 件）
```

⭐ **これが両方を廃したことの配当である。**片側だけなら書けない検査である。

⛔ **例外は 2 つだけ在りうる。裁定してから除外する:**
- `previous-project-result/`（14 箇所）—— **終わった別プロジェクトの記録。書き換えると記録が嘘になる**
- `change-request/`（254 箇所）—— **適用済みの CR は歴史である**

---

## 5. 裁定（利用者、2026-09-12）

| # | 問い | ⭐ **裁定** |
|---|---|---|
| **1** | `change-request/` の **254 箇所** | ⭐ **直す。**理由（利用者の逐語）——「**後で裁定を見ても意味が分からなくなる。事情を知る ID を変えたものが直すべきだ**」<br>⇒ ⛔ **前に立つ者の「歴史だから触らない」という意見は退けられた。**CR は読み返される文書であり、読めなくなるほうが害が大きい |
| **2** | `previous-project-result/` の **14 箇所** | ⭐ **修正不要。**終わった別プロジェクトの成果物である |

⇒ **巡 3 の検査はこうなる:**

```
PD-\d+ は追跡下のどこにも在ってはならない（0 件）
  ⛔ 除外は previous-project-result/ ただ 1 つ。理由を検査の冒頭に書く
```

⭐ **`change-request/` を直す決定は、巡 1・巡 2 の範囲を広げる** —— CR の 254 箇所は
曖昧 31・明白 223 なので、**それぞれの巡の同じ手の中で一緒に直す**（別の巡にしない。
⛔ 別にすると、CR だけが古い綴りで残る期間ができる）。

---

## 6. 費用の見積り

| 巡 | 箇所 | ファイル | 危険 |
|---|---:|---:|---|
| 0 分類 | 1,684 を読む | 181 | ⭐ 低（書き換えない）|
| 1 `PTD-` | 約 500 | 約 60 | ⚠️ 中（型・生成・`git mv`）|
| 2 `PND-` | 約 1,180 | 約 120 | ⚠️ 中（検査 25 と同時でなければ赤）|
| 3 検査 | — | 1 | 低 |

⛔ **掃除の巡と混ぜてはならない。**掃除は「文だけを消す」と定めてある。
この改名は**製品コードと原稿を変える**ので、別の巡・別のコミットで行う。

---

## 7. ⭐⭐ 行 ID の接頭辞表 — 設計（利用者の裁定 2026-09-12「接頭辞表も作れ」）

⛔ **`PD-` を直しても次の衝突は防げない。**本当の欠陥はこちらである。

### 7.1 いまの空白（実測 2026-09-12）

```
docs/spec が定義する行 ID       1,891 行 / 接頭辞 124 個
そのうち登録されているもの            0 個
複数の表にまたがる接頭辞              7 個（通し番号を表で割っているだけ。重複ではない）
```

`spec-writing-rules.md:166`「ID の接頭辞」は
**「表に無い接頭辞を本文で使ってはならない（MUST NOT）」**と定めているが、
その表が持つのは **`GL` `UC` `FR` `NFR` `ADR` `SWS` `TC` `TR` の 8 つ**、
すなわち **StrictDoc のノード ID だけ**である。⇒ **行 ID には登録簿が無い。**

### 7.2 ⭐ どこに置くか — **この製品が既に持つ型に合わせる。発明しない**

⛔ **`spec-writing-rules.md` に足すのは違う。**あの表が縛るのは**要求の書き手**であり、
`GL`→`UC`→`FR` という**トレースの鎖**を定めている。行 ID は鎖の外であり、**仕様書自身の中身**である。

⭐ **正しい前例は `1.8 Glossary` である** —— 用語の正は `_assets/tbl-glossary.md` が持ち、
**章からは指し先だけを置いている。**行 ID の接頭辞はこれと同じ性質（名前の権威）を持つ。

| | 置き場所 | 役割 |
|---|---|---|
| **SSOT** | `docs/spec/_source/row-id-prefixes.json` | ⭐ **意味だけを持つ。員数は持たない** |
| 生成器 | `docs/spec/_source/row_id_prefixes_json_to_md.py` | 原稿を歩いて員数を読み、意味と突き合わせる |
| 生成物 | `docs/spec/_assets/tbl-row-id-prefixes.md`（`DOC-TBL-ROW-ID-PREFIXES`）| 全数表 |
| 参照 | **`01-04-requirements.md` の `1.9 Notation`**、表 T-006a の隣 | ⛔ **写さない。指し先だけ** |

### 7.3 ⭐ 「員数を持たない」が肝である — `display-words.json` の前例

その SSOT は自ら宣言している:

> **THIS FILE HOLDS NO ROSTER. Which entries exist is read from `docs/spec` every run.**

⇒ **同じ形にする:**

```
_source/row-id-prefixes.json   接頭辞 → 元の語 → 何を指すか → 定義する章
                               ⛔ どの接頭辞が在るかは書かない

生成器が毎回          docs/spec を歩いて `| XX-n |` を集める
                     ↓
        原稿に在って json に無い  → ⛔ エラー（未登録の接頭辞）
        json に在って原稿に無い  → ⛔ エラー（使われていない登録）
                     ↓
        _assets/tbl-row-id-prefixes.md を書く
```

⭐⭐ **生成器がそのまま検査になる。**別に検査を書かなくてよい ——
`npm run gen:check` が落ちる。⛔ **これがあれば `PD-` の衝突は登録の時点で見えていた。**

### 7.4 表が持つ列

| 列 | 例 | 出どころ |
|---|---|---|
| 接頭辞 | `PTD` | json（人が書く）|
| 元の語 | `Pointer Down` | json |
| 何を指すか | ポインタを押したときの判定順序の行 | json |
| 定義する表 | `T-023a` | ⭐ **生成器が原稿から読む** |
| 行数 | 6 | ⭐ 生成器 |

⚠️ **`S` のように複数の表にまたがる 7 個は「定義する表」が複数になる。**
⇒ **通し番号を表で割っているだけであることを、json の「何を指すか」に人が書く。**

### 7.5 ⛔ 同時に要る 1 文（裁定案件）

`spec-writing-rules.md` の「ID の接頭辞」節に **1 文足す:**

> **本表が縛るのはノード ID である。表の行 ID の接頭辞は `_assets/tbl-row-id-prefixes.md` が持つ（MUST）。**

⛔ **これを書かないと、あの節の MUST NOT が行 ID にも掛かって読め、124 個すべてが違反に見える。**
⚠️ `docs/development-rules/` の変更は裁定案件（第 11 節）。**この 1 文だけを別に諮る。**

### 7.6 順番

```
巡 A  接頭辞表を作る（json ＋ 生成器 ＋ 1.9 からの参照 ＋ 規則の 1 文）
      ⭐ PD- の改名より先にやると、PTD- と PND- が登録の時点で検査される
巡 0〜3  PD- の改名（第 4 節）
```

⇒ ⭐ **接頭辞表を先に作ることを推す。**`PTD` と `PND` が**新しい接頭辞**であり、
**登録簿があれば、その追加そのものが機械に見られる。**
