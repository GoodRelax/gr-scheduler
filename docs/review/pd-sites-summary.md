---
type: Measurement
title: CR-371 巡 0 —— `PD-` の全箇所の分類（`pd-sites.jsonl` の読み方）
description: git 追跡下（`docs/spec/output/` を除く）の `PD-` 1,918 箇所を 1 件ずつ分類した結果の要約。`unknown` は 0。⛔ 巡 0 は 1 文字も書き換えていない。⚠️ CR-371 §3 の 1,684 / 181 は再現しなかった —— 実測は 1,918 / 208 で、差の理由は本書 §1 に書いてある。
tags: [id, namespace, rename, measurement, cr-371]
status: measured
---

# `PD-` の全箇所 —— 分類の要約（2026-09-13、巡 0）

**成果物**: [`pd-sites.jsonl`](pd-sites.jsonl) —— 1 行 1 箇所、**1,918 行 / 208 ファイル**。
**合否**: ⭐ **`confidence: "unknown"` は 0 件。** `certain` 1,912 ／ `likely` 6。

⛔ **本巡は追跡下のファイルを 1 文字も書き換えていない。**書いたのは `pd-sites.jsonl` と本書の 2 つだけである。

---

## 1. ⚠️ 総数は CR-371 §3 の数と合わない —— 合わないことに理由がある

| | CR-371 §3（2026-09-12）| 本巡の実測（2026-09-13）|
|---|---:|---:|
| 箇所 | 1,684 | **1,918** |
| ファイル | 181 | **208** |

**差は 2 つの原因に分かれる。どちらも「前の測定が誤っていた」ではない。**

| # | 原因 | 効き |
|---|---|---:|
| **1** | ⭐ **CR-371 自身と、それが生んだ文書が木に入った** —— `CR-371-…md`、`docs/review/pd-id-split-plan.md`、`_assets/tbl-row-id-prefixes.md`、`_source/row-id-prefixes.json`、`row_id_prefixes_json_to_md.py` ほか | 約 +130 |
| **2** | ⛔ **`PD-\d+` では拾えない綴りが 103 件ある** —— `PD-` に数字が続かないもの **87 件**（`PD-n` `PD-nnn` `PD-x`、検査の正規表現 `PD-\d+` そのもの、裸の `PD-`）と、**小文字 `pd-` 16 件**（試験ファイル名とその引用） | +103 |

⭐ **2 は巡 3 の合否にも効く。**CR-371 §5 の合否は `PD-\d+` を 0 件にすることだが、
**`check-pending-decisions.py` の `r'@provisional\s+(PD-\d+)'` という正規表現の中の文字列も `PD-` である。**
⇒ ⛔ **`PD-` が 1 件も無いことを合否にすると、検査自身の正規表現が引っかかる。**
**巡 3 の検査は「`PD-<数字>` が 0 件」と綴り、正規表現とプレースホルダは別に数えること。**

**⭐ 領域別の内訳は CR-371 §3 の表とよく一致している**（`tests/` 340→343、`src/` 335→336、
台帳 590→597）。⇒ **前の測定は、その日の木に対しては正しかった。**

---

## 2. ⭐⭐ いちばん大きな訂正 —— 曖昧なのは `PD-1`〜`PD-4` だけである

CR-371 §3 と `pd-id-split-plan.md` §4 は**曖昧集合を「`PD-1`〜`PD-5`・`PD-4a`」**としているが、
**`PD-5` と `PD-4a` は台帳に存在しない。**

```
台帳 pending-decisions.md の行 ID（実測 212 行）
    PD-1  PD-2  PD-3  PD-4   PD-10 PD-11 …  PD-444
                          ↑ここで飛ぶ。PD-5〜PD-9 は 1 つも無い
    字を持つ行（PD-4a のような綴り）は 1 つも無い
```

**反証も試みた**: `git log -S'| PD-5 |'` と `git log -S'| PD-4a |'` を
`pending-decisions.md` に当てて **0 件**。⇒ **退役した行でもない。一度も無かった。**

⇒ ⭐ **`PD-5`（113 箇所）と `PD-4a`（42 箇所）は無条件に `PTD-`。**
**1 件ずつ読む必要があったのは `PD-1`〜`PD-4` の 438 箇所だけである**（CR-371 の見積り 518 の 85%）。

⚠️ **`PD-6` 以上は無条件に `PND-` という規則は保った**が、**台帳が定義していない番号が 8 綴りある**
（`PD-7` `PD-100` `PD-103` `PD-120` `PD-161a` `PD-161b` `PD-213`、および上の `PD-5`）。
**いずれも台帳の名前空間を指しており、行が書かれなかったか退役したものである。**
⛔ **巡 2 で改名すると `PND-100` のような「行の無い指し先」ができる。**
`spec-id-references-baseline.txt:56` は既にそれを承知で書いている（逐語: 「PD-100 .. PD-103 は取り下げられたのではない。一度も書かれなかった」）。

---

## 3. 数

### 3.1 行き先

| 行き先 | 箇所 |
|---|---:|
| **`PND-`（台帳）** | **1,237** |
| **`PTD-`（表 T-023a）** | **535** |
| `null` | **146** |
| **合計** | **1,918** |

`PTD-` の内訳: `PTD-1` 153 ／ `PTD-2` 44 ／ `PTD-3` 94 ／ `PTD-4` 89 ／ `PTD-4a` 42 ／ `PTD-5` 113。

`null` 146 の内訳:

| 区分 | 箇所 | 扱い |
|---|---:|---|
| **META** —— 接頭辞そのもの・綴りの範囲・正規表現・プレースホルダを指すもの | **125** | ⛔ **機械で置換してはならない。文として書き直す** |
| `previous-project-result/` | **20** | ⭐ **裁定 2026-09-12 により修正不要** |
| ⛔ **誤りの記述**（下の §6）| **1** | **改名ではなく訂正が要る** |

### 3.2 確からしさ

| | 箇所 |
|---|---:|
| `certain` | 1,912 |
| `likely` | **6** |
| **`unknown`** | **⭐ 0** |

### 3.3 種類

| `kind` | 箇所 | 綴りがどこに在るか |
|---|---:|---|
| `prose` | 895 | 散文 |
| `comment` | 534 | `//` `#` `*` のコメント |
| `table-row` | 226 | 表の行の先頭セル、または生成物の 1 行 |
| `code-literal` | 125 | **`'PD-1'` のような文字列リテラル** |
| `test-name` | 55 | `it(...)` / `describe(...)` の題 |
| `code-other` | 53 | コードだが引用符の中ではない（多くは正規表現）|
| `json-value` | 25 | `"rowId": "PD-1"` ほか |
| `file-name` | 5 | 試験ファイル名 2 本とその引用 |

### 3.4 領域

| 領域 | 総数 | `PTD-` | `PND-` | `null` |
|---|---:|---:|---:|---:|
| 台帳 `docs/development-records` | 597 | 47 | 544 | 6 |
| `tests/` | 343 | 214 | 128 | 1 |
| `src/` | 336 | 132 | 203 | 1 |
| `change-request/` | 288 | 18 | 241 | 29 |
| その他（`docs/review` ほか）| 158 | 42 | 68 | 48 |
| 道具・検査 `tools/` `.claude/` | 91 | 21 | 45 | 25 |
| **`dist/`（生成物）** | **37** | **37** | 0 | 0 |
| `docs/spec` | 34 | 24 | 4 | 6 |
| `previous-project-result/` | 20 | 0 | 0 | 20 |
| 規則 `docs/development-rules` | 14 | 0 | 4 | 10 |

⚠️ **`dist/index.html` は CR-371 §3 の表に無いが、追跡下にあり 37 箇所を持つ。**
**中身は縮小された `PressRow` のリテラルと生成物のロースターである。**
⇒ ⭐ **手で直してはならない。`npm run build` で作り直す。**

---

## 4. ⛔ `unknown` の一覧 —— **0 件**

⭐ **裁定を要する箇所は無い。**ただし §5 の `likely` 6 件と §6 の誤り 1 件は、
**分類ではなく「そもそも何を書くべきか」を前に立つ者が見るべきものである。**

---

## 5. `likely` 6 件 —— 分類は付いているが、根拠が 1 段弱い

| # | 場所 | 綴り → 行き先 | なぜ `likely` か |
|---|---|---|---|
| 1 | `check-ruled-elsewhere.py:216:20` | `PD-5` → **`PND-5`** | 逐語「reads here as naming pending decision PD-5」。⛔ **その `PND-5` は存在しない。**検査が*引きに行く先*を述べた文であり、改名より書き直しが合うかもしれない |
| 2 | `ruled-elsewhere-baseline.txt:38:23` | `PD-3` → **`PND-3`** | 基準線は検査 40 が**印字したもの**を記録しており、その「裁定済の PD」は台帳側である。⚠️ **D-468 が名指した既知の偽陽性**であり、巡 1 で `D-292` の綴りが変わると**印字が変わって基準線がずれる** |
| 3 | `CR-258:26:139` | `PD-1` → **`PND-1`** | 「暫定で持っており、`PD-1` が付いている」＝ 印であり、印は台帳の行にしか付かない（規則 06）。⚠️ **台帳の `PD-1` は色の話で、この文が述べる 2px / `3 2` ではない** |
| 4 | `fixed-defects.md:72:147` | `PD-4` → `PTD-4` | 同じセルに `表 T-023a` と `台帳` の両方が在る。**直接名指しているのは仕様の行**である |
| 5 | `fixed-defects.md:74:730` | `PD-1` → `PTD-1` | 同上（`表 T-023a の PD-1` と `裁定待ちの PD-363` が同じセルに同居）|
| 6 | `cleanup-2026-09-11-prompt.md:408:608` | `PD-5` → **`null`** | §6 を見よ |

---

## 6. ⛔⛔ 分類の途中で見つかった、記述そのものの誤り

### 6.1 `docs/review/cleanup-2026-09-11-prompt.md:408`

逐語:

> ⚠️ **台帳にも独立に `PD-1` `PD-3` `PD-4` `PD-5` があり、中身は全く別である。**

⛔ **`PD-5` は偽である。**台帳が持つのは `PD-1` `PD-2` `PD-3` `PD-4` であり、**`PD-2` が落ちて `PD-5` が入っている。**
⇒ **改名ではなく訂正が要る。**`pd-sites.jsonl` では `target: null` ／ `confidence: "likely"` ／
evidence に "DEFECT, not a rename" と書いてある。

⚠️ **同じ誤りが `docs/review/pd-id-split-plan.md` §4 と CR-371 §3 の「曖昧（`PD-1`〜`5`・`4a`）」にも入っている**
（§2 を見よ）。⇒ **巡 1・巡 2 で 3 文書とも直すこと。**

### 6.2 台帳が定義しない `PND-` の指し先が 8 綴り

§2 の末尾を見よ。⛔ **巡 2 は「行の無い `PND-`」を作る。**それでよいか、注を付けるかは裁定を要する。

---

## 7. ⭐⭐ 機械が結んでいる束 —— **一緒に動かさなければ門が赤になる**

### 7.1 三角形（表 T-023a ／ 生成器 ／ `PressRow`）——**巡 1 の 1 つの手**

```
docs/spec/01-04-requirements.md  表 T-023a の行 ID（PD-1..PD-5, PD-4a）
        │
        ├─ tools/generate_display_words.py:72
        │     PRESS_ORDER_ROW = re.compile(r'^\| (PD-\d+[a-z]?) \|')
        │        ↓ 原稿を歩いて行 ID を読む
        │     docs/spec/_source/display-words.json   "rowId": "PD-1" …（6 件）
        │        ↓ npm run words
        │     src/adapter/screen-renderer/display-words.json（6 件）
        │
        ├─ tools/generate_help_roster.py:79
        │     ('T-023a', r'PD-\d+[a-z]?', None)
        │        ↓ npm run helproster
        │     src/adapter/screen-renderer/help-roster.json  "row": "PD-1" …（6 件）
        │
        ├─ src/adapter/input-command-translator/…ts:175
        │     export type PressRow = 'PD-1' | … | 'PD-5'      ← 型の値（74 箇所）
        │        ├─ 同ファイルの return / case / 比較
        │        └─ src/framework/single-html-shell/frame-loop.ts の写像のキー（41 箇所）
        │              'PD-1': false, 'PD-2': true, …
        │
        ├─ dist/index.html                     ← npm run build で作り直す（37 箇所）
        │
        ├─ .claude/skills/spec-graph-check/dictionary-table-pairing.txt
        │     T-023a PD-1 <hash> …             ← 表の行 ID で鍵を持つ生成基準線（6 件）
        │
        ├─ docs/spec/_source/row-id-prefixes.json ＋ row_id_prefixes_json_to_md.py
        │     接頭辞 PD の行と、PTD / PND の「登録のみ」の 2 行
        │        ↓ npm run gen:prefixes
        │     docs/spec/_assets/tbl-row-id-prefixes.md（員数 仕様書 6 → PTD 6 へ動く）
        │
        └─ git mv  tests/unit/t-023a-pd-1-pan-follows-the-pointer.test.ts
                   tests/unit/fr-009-pd-3-the-two-halves-of-a-bar.test.ts
                   ＋ その名を引く 4 箇所（`must-clause-coverage-baseline.txt:96`、
                     `what-belongs-where.md:237`、`fixed-defects.md:74`、
                     `cleanup-2026-09-11-prompt.md:271`）
```

⛔ **`npm run gen:check` は `words` `helproster` `prefixes` の 3 つで落ちる。**
⇒ **原稿・型・生成物・登録簿・`git mv` を 1 つの手で。途中で門は緑にならない。**

### 7.2 巡 1 が触らなければならない検査（仕様側の綴りを機械が持っている）

| ファイル | 何を持つか |
|---|---|
| `check-ruled-elsewhere.py:138` | `TABLE_ROW_PD = re.compile(u'表 T-023a の [`]?PD-\\d+[`]?')` ⛔ **D-468 の免除そのもの。直さないと免除が効かなくなる** |
| `check-spec-id-references.py:117,278` | `PD-4a` を「字を持つ実在の行 ID」の例として持つ |
| `spec-id-references-baseline.txt:122` | 同上 |
| `tools/precheck.py:143` | 「`PD-1` .. `PD-5` は表 T-023a の行である」という但し書き |
| `list-asserted-claims.py:97` | 同上 |
| `row_id_prefixes_json_to_md.py:46` | 「字を持つ行 ID」の例として `PD-4a` |

### 7.3 巡 2 が触らなければならない検査（台帳側）——**⛔ 同じ手でないと検査 25 が赤**

| ファイル | 何を持つか |
|---|---|
| `check-pending-decisions.py:33` | `MARK = re.compile(r'@provisional\\s+(PD-\\d+)')` |
| `check-pending-decisions.py:34` | `ROW = re.compile(r'^\\|\\s*(PD-\\d+)\\s*\\|…')` |
| `check-pending-decisions.py:77` | `re.match(r'^\\|\\s*PD-\\d+\\s*\\|', line)` |
| `check-ruled-elsewhere.py:154,225` | `line.startswith('| PD-')` ／ `re.findall(r'PD-\\d+', …)` |
| `check-quoted-source.py:90` | `u'D-\\d+\|PD-\\d+\|CR-\\d+\|…'` |
| `list-lying-edges.py:81` | `u'D-[0-9]+\|CR-[0-9]+\|PD-[0-9]+\|…'` |
| `tools/precheck.py:145` | `BACKTICKED_ID = re.compile(r'\`(CR-\\d+\|PD-\\d{3,})\`')` ⚠️ **3 桁以上しか見ていない** |
| `docs/development-rules/05-working-method.md` ／ `06-pending-decisions.md` | `// @provisional PD-n` の記述 |
| `ruled-elsewhere-baseline.txt` | 検査 40 が印字した `PD-` 20 件を本文に持つ基準線 |

⛔⛔ **`check-ruled-elsewhere.py` は両方の巡に跨る**（:138 が仕様側、:154/:225 が台帳側）。
⇒ **どちらの巡で触っても、もう一方の綴りを壊さないことを確かめること。**

### 7.4 両方の名前空間を持つファイル（26 本）—— **一括置換をしてはならない**

`PTD-` と `PND-` の両方が同じファイルに在る。**行どころか、1 行の中で混ざっているものが 6 本ある**
（`check-ruled-elsewhere.py:214`、`CR-243:47`、`tbl-row-id-prefixes.md:182`、
`row-id-prefixes.json:25`、`pd-id-split-plan.md:57-58`、`cleanup-2026-09-11-prompt.md:408`）。

| PTD | PND | ファイル |
|---:|---:|---|
| 74 | 26 | `src/adapter/input-command-translator/input-command-translator.ts` |
| 41 | 36 | `src/framework/single-html-shell/frame-loop.ts` |
| 35 | 1 | `tests/unit/uf-30-31.test.ts` |
| 23 | 179 | `docs/development-records/fixed-defects.md` |
| 16 | 5 | `docs/review/cleanup-2026-09-11-prompt.md` |
| 15 | 272 | `docs/development-records/pending-decisions.md` |
| 9 | 5 | `docs/review/pd-id-split-plan.md` |
| 6 | 1 | `docs/spec/_source/display-words.json` |
| 6 | 1 | `change-request/CR-300-…md` |
| 5 | 7 | `.claude/skills/spec-graph-check/check-ruled-elsewhere.py` |
| 5 | 3 | `src/entity/layout-engine/item-hit-area/item-hit-area.ts` |
| 5 | 1 | `docs/review/ft1-wiring-findings-2026-08-22.md` |
| 4 | 5 | `docs/development-records/evidence/order-2026-09-06.md` |
| 4 | 2 | `tests/unit/uf-72-screen-part.test.ts` |
| 3 | 2 | `change-request/CR-371-…md` ／ `tests/unit/uf-71-confirmation.test.ts` |
| 2 | 18 | `docs/development-records/W4-adapter.md` |
| 2 | 4 | `change-request/CR-192-…md` |
| 2 | 1 | `.claude/skills/spec-graph-check/list-asserted-claims.py` |
| 1 | 20 | `docs/development-records/changelog.md` |
| 1 | 3 | `docs/development-records/handoff.md` |
| 1 | 2 | `spec-id-references-baseline.txt` ／ `tests/system/divider-colour-…test.ts` |
| 1 | 1 | `CR-243-…md` ／ `tbl-row-id-prefixes.md` ／ `row-id-prefixes.json` |

⚠️ **`pending-decisions.md` の 15 件の `PTD-` に注意** —— ⛔ **「その行が `pending-decisions.md` に在るなら `PND-`」という規則は誤りである。**
**行 ID の欄（行頭の最初のセル）だけが `PND-` であり、関連の欄や本文が引く `表 T-023a の PD-1` は `PTD-` である。**

---

## 8. ⭐ 巡 1・巡 2 が触る順

```
巡 1（PTD-）  69 ファイル / 535 箇所
  ① docs/spec/01-04-requirements.md            表 T-023a の行 ID と本文の参照（15）
  ② docs/spec/_source/row-id-prefixes.json     PD の行を畳み、PTD を「登録のみ」から実体へ
  ③ src/ の型と参照                            translator 74 ＋ frame-loop 41 ＋ item-hit-area 5
  ④ tests/ の参照（214）＋ git mv 2 本 ＋ その引用 4
  ⑤ 検査の正規表現（§7.2 の 6 ファイル）
  ⑥ npm run gen（words / helproster / prefixes）＋ npm run build（dist）
  ⑦ change-request/ と docs/review の該当分（18 ＋ 42）
  門: npm run guard:commit  ⛔ gen:check が落ちたら ⑥ を忘れている

巡 2（PND-）  152 ファイル / 1,237 箇所
  ① docs/development-records/pending-decisions.md  行 ID 212 と参照（272）
  ② @provisional の印（src/ 203 ＋ tests/ 128）
  ③ 検査の正規表現（§7.3 の 9 ファイル）⛔⛔ ①②と同じ手でないと検査 25 が赤
  ④ ほかの台帳（fixed-defects 179・changelog 20・W4/W5 62 ほか）
  ⑤ change-request/（241）と docs/review（68）
  ⑥ docs/spec/_source/*.json の $comment（PD-51 / PD-160 ほか 4 件）
  ⑦ dist/index.html は ②の後に npm run build
  門: npm run guard:commit ＋ 検査 25 を名指しで

巡 3（終端）
  ⛔ 綴りは「PD-<数字> は 0 件」。裸の PD- / PD-n / PD-\d+ は別に数える（§1）
  除外: previous-project-result/ のみ（20 箇所）
  ⚠️ META の 125 箇所は「PD-」を文として語っている。検査の綴りを誤ると全部引っかかる
```

---

## 9. `pd-sites.jsonl` の読み方

```json
{"path":"src/...ts","line":175,"col":25,"token":"PD-1","target":"PTD-1",
 "kind":"code-literal","evidence":"PressRow type …","confidence":"certain"}
```

- `line` は 1 起点。**`line: 0` は「ファイル名そのものが綴りを持つ」**（試験 2 本）で、`col` はファイル名の中の位置である。
- `col` は 1 起点の**文字**位置（バイトではない）。**行の中の位置で一意に決まる** —— 同じ行に 20 件在るものがある。
- `target: null` は **`unknown` ではない。**`evidence` が `META` で始まるもの・`out of scope` のもの・`DEFECT` のものの 3 種である。
- **分類の当て方**（`evidence` がどれで当たったかを言う）:
  1. `previous-project-result/` → 対象外（裁定 2026-09-12）
  2. 1 件ずつ人が読んだ上書き（**両方の名前空間が混ざる行など 106 件**）
  3. 小文字 `pd-` → 試験ファイル名かどうか
  4. 数字が続かない `PD-` → META
  5. **番号 6 以上 → `PND-`**（無条件）
  6. **`4a` / `5` → `PTD-`**（無条件。§2 の実測による）
  7. `PD-1`〜`PD-4` → 行 ID の欄か ／ 全文を読んだファイルの既定か ／ 近傍の目印か
- ⚠️ **走査の正規表現**: `(?<![A-Za-z0-9])(?P<head>[Pp][Dd])-(?:(?P<num>\d+[a-z]?)(?![0-9a-zA-Z]))?`
  ⭐ `(?![0-9a-zA-Z])` が罠 1（`PD-4` が `PD-4a` を食う）と罠 2（`PD-1` が `PD-10` を食う）の両方を止める。
  ⛔ **`\b` を使ってはならない。**
