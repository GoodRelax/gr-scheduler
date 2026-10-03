# CR-643 — GRS JSON のスキーマが日時の形と形式の版を見せ、読む路の照合では捨てる

> 起草の状態: 当てた（2026-10-03、`bf9d1fa2` の上）。起草と当てを同じコミットで行った。
> ID の帯: 番号 `CR-643` と台帳の帯 `DFC-1815`〜`DFC-1819` は調整役から受けた。⭐ 帯の行は 1 つも使わなかった（12 節）。仕様の新しい識別子（表・行 ID・接頭辞・設定の行・要求）も取らない（2 節）。
> 閉じるもの: `docs/review/grs-json-schema-self-explanation-2026-10-03.md` の 7.1 節の CR A —— C-15・C-29・C-31（`JDG-1200`・`JDG-1202`、`JDG-1205` の `pattern` の字面、`JDG-1191`）。台帳 `DFC-1793`・`DFC-1794`・`DFC-1795` の仕様の側。
> ⛔ 閉じないもの: CR B（ラグ、C-20・C-30）、CR C（完了率の数え直し、C-27）、CR D（側ごとの時刻・`Project` の 2 列・`stackOrder`・`TaskVisual`・版を上げる、ほか 17）。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 利用者の裁定（`docs/development-records/rulings.md`。全文は同書を見よ）

| 裁定 | 逐語（抜粋） | 本書での扱い |
|---|---|---|
| `JDG-1191` | 「将来的に時刻まで処理することを考えろ。」 | 日時の列は日時の形を保ち、スキーマがその形を `pattern` で言う（E-01・E-03）。`FR-024` が日時の形で書くことを求める（E-04） |
| `JDG-1200` | 「B. 形は見せ、照合は FR-023 (Recommended)」 | スキーマは `pattern` を出し、照合の表の生成器は日時の `pattern` だけを理由付きで捨てる（E-01・E-02・E-06）。表 T-220 の前文の「文書ごと拒む」から外した |
| `JDG-1202` | 「A. 出して、照合では捨てる (Recommended)」 | スキーマは `schemaVersion` を `const` で言い、生成器は `const` を `DROPPED` に入れる（E-05・E-06） |
| `JDG-1205` | 「表のとおり決める (Recommended)」 | ⚠️ 本書が当てるのは 1 文だけ —— 「スキーマの日時の `pattern` は `xsd:dateTime` の字面（小数秒・帯を許す）」。側ごとの時刻・`Project` の 2 列は CR D |
| `JDG-1209` | 「A. 上げる (Recommended)」 | ⚠️ 本書は版を上げない。当てるのは「スキーマの `const` も同じ所から起こす」だけ（`SCHEMA_VERSION` の 1 か所） |

### 0.2 ⛔ 当てる前に確かめた 3 つ

**問い 1 —— 照合の表の生成器に、日時の `pattern` だけを捨てる道はあるか。⇒ ある。ポインタの定数を 1 つ足すだけで済む。**

- `tools/generate_json_schema_validator.py` は、パスで語を捨てる仕組みを既に持つ —— `RELAXED_ROOT`（`/documentSettings`）の下では `RELAXED_OFF` の語を捨てる。
- 同じ形で `DATE_TIME_DEF = '/$defs/DateTime'` を置き、そのノードでは `pattern` だけを捨てる。⛔ 定数が指す定義がスキーマに無いか `pattern` を持たないときは、生成器が止まる（改名で黙って `pattern` が効き出さないように）。
- ⚠️ 生成器は `$ref` の隣に `DROPPED` でない語があると止まる —— `pattern` は `$defs/DateTime` の側だけに置き、列は `$ref` だけを持つ（説明 `description` は `DROPPED` なので隣に置ける）。
- ⚠️ `scrollDate` は `$ref` にしない —— `tools/generate_entity_types.py` の `settings_property` は見せ方の鍵の型をそのノードの `type` から読み、参照を辿らない（`$ref` にすると `SETTINGS` の型が `unknown` になる）。だから `pattern` を同じ定数から直に書く。照合では `RELAXED_OFF` が捨てる。
- ⇒ 刷り直した `grs-json-schema.ts` は、日時の 18 列が `ref: 'DateTime'` になり、`SCHEMA_DEFS.DateTime` は `type: ['string', 'null']` だけを持つ —— 判じる中身は base と同じ。

**問い 2 —— 試験の側の ajv（`tests/fixtures/grs-document.ts`）は、捨てるか守らせるか。⇒ 守らせたままにし、試験の文書を直した。**

- 仕様は試験の補助の役を書かない。`tests/README.md` は「生成した `GRS JSON` のスキーマと、それに照らす検証」と書く —— 照らすのは刊行するスキーマである。
- 刊行するスキーマは書く者の約束であり（`FR-024`）、ajv で照らす試験はどれも「この文書は正しい `GRS JSON` である」という前提を確かめている。⇒ 照合の寛さ（読む路）を試験の側へ持ち込まない。補助に 1 行の WHY を足した。
- ⛔ `FR-023` の入力（使えない日付）を ajv に通す試験は無い —— `tests/unit/fr-023-drops-unusable-dates-and-tells-the-names.test.ts` は歩き手（本体の読み込み）だけを通り、緑のまま（`CR-642` の問い 2 で落ちた 5 件）。
- 数（レビューの指摘「C-15 ④ の 30 ファイルと 6 節 D4 の最大 20 が合わない」を測った）: 補助を取り込むのは 29 の試験ファイル（`tests/README.md` を数えれば 30）。そのうち `pattern` で赤くなったのは **11 ファイル 22 件**（7 節）。⇒ 30 は取り込む数、20 は名指す上限、実際に赤いのは 11 である。
- 版: `schemaVersion` に `'1'`・`'2026-01-01'`・`'1970-01-01'` を書く試験の文書は 20 ファイル 21 か所あるが、**どれも ajv の補助を通らない**（版を照らす歩き手は `const` を捨てる）。ajv を通る文書はどれもテンプレートの版を写す。⇒ `const` で直したものは 0。

**問い 3 —— 版の値の正はどこか。⇒ `tools/generate_startup_template.py` の `SCHEMA_VERSION` の 1 つ。**

- `erd_json_to_schema.py` は `generate_startup_template` から `SCHEMA_VERSION` を取り込む（取り込みは 0.1 秒、作用なし）。3 つ目の写しは作らない。
- ⚠️ 実行の順の罠は無い —— 取り込むのは Python の定数であり、`startup-template-manifest.json`（生成物）ではない。
- ⚠️ `generate_startup_template.py` の自前の読み手（`schema_faults`）は知らない語で止まる —— `const` を `SCHEMA_READ` に足し、値が違えば誤りとして並べるようにした。起動時の文書・空の文書・計測用の文書は `SCHEMA_VERSION` を書くので通る。

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

⭐ **`CH-1` の `GL-004`**（成果物が構造化データである）。スキーマだけを渡された書き手（`AI` を含む）が、日付だけの形で書くことも、版を当て推量することもなくなる —— 調査（`docs/review/grs-json-schema-self-explanation-2026-10-03.md` の 2.1 節）では、2 体とも日付だけで書き、版を "1"・"1.0" と書いた。

### ② レビュー観点のどの条項を当て、何が出たか

`docs/development-rules/07-review-standards.md` の条項を当てた。

- **`R1.3`（矛盾がない・唯一の正）** —— 表 T-220 の前文の MUST（日程データの群がスキーマに合わなければ文書ごと拒む）と `FR-023`（行ごと落とす）のぶつかり（`DFC-1795`）を、前文に例外を書いて解いた。⚠️ 表 T-024a の `OP-6` も「スキーマに合わない文書は文書ごと拒む（Chapter 6.1）」と言うが、Chapter 6.1 を指して言っているので、例外はそちらから届く —— `OP-6` は書き換えない。版の値は `SCHEMA_VERSION` の 1 か所から読む。
- **`R1.4`（境界・空の場合）** —— 日時の 18 列はどれも `null` 可であり、`$defs/DateTime` も `null` を許す。⛔ `null` を許さない日時の列が原稿に現れたら、生成器が止まる（参照で広げない）。
- **`R2.9`（YAGNI）** —— `$defs/DateTime` に説明を足さない。根の説明が既に日時を語り、その文を直すのは CR D（C-24）である。

### ③ 利用者に問わずに決めたこと

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| 決定 1 | 試験の側の ajv は守らせたままにし、試験の文書を直す | 問い 2。`FR-024` は書いた文書がスキーマに合うことを求め、ajv の試験はその前提を確かめている | 11 ファイルの日付の値に `T00:00:00` を足した |
| 決定 2 | `scrollDate` は `$ref` でなく、同じ定数の `pattern` を直に持つ | 問い 1。型の生成器が参照を辿らない | スキーマの中に同じ `pattern` が 2 か所（生成器の定数は 1 つ） |
| 決定 3 | `FR-024` の文に「`GRS` が値を作るときは帯を持たず秒までの形」と、取り込んだ値は綴りを保つことを書いた | `JDG-1205` の「`GRS` は帯なし・秒までで書く」と、`EX-4`。スキーマが小数秒と帯を許すので、`GRS` 自身の書き方を言わないと読み手がどちらを書くか分からない | 時刻そのもの（`00:00:00` か既定の時刻か）は `EX-7` と CR D のまま |
| 決定 4 | Chapter 6.2 にも、日時の定義と版の `const` を刷る規則を書いた | スキーマを起こす規則の置き場は Chapter 6.2（`CR-642` の E-06 と同じ） | 段落 1 つ |

---

## 1. 範囲 —— 行き先

| 何 | 仕様で変える所 | 編集 |
|---|---|---|
| 照合の例外（日時の `pattern` と版の `const`） | `docs/spec/05-07-design.md` の Chapter 6.1（表 T-220 の前文） | E-01 |
| 節の表が刷らない 2 語 | 同 表 T-075 の `UF-152` | E-02 |
| スキーマが日時の形と版を言う規則 | 同 Chapter 6.2 | E-03 |
| 日時の形で書く | `docs/spec/01-04-requirements.md` の `FR-024` | E-04 |
| 版の `const` | 同 表 T-052 の `DR-4` | E-05 |
| 生成器 | `docs/spec/_source/erd_json_to_schema.py`・`tools/generate_json_schema_validator.py`・`tools/generate_startup_template.py` | E-06 |

**数**: 要求の文 2（`FR-024` に `（MUST）` 1、`DR-4` に `（MUST）` 1）、Chapter 6.1 に 5 文、Chapter 6.2 に `（MUST）` 2、表の升 2（`UF-152`・`DR-4`）。表の行 0、設定の行 0。⚠️ 新しい印を逐語で引く試験はまだ無い —— 試験は仕様だけを読む試験の体が書く（8 節）。

---

## 2. 新しい識別子

仕様の識別子は 1 つも取らない。スキーマに `$defs/DateTime` を 1 つ足す（生成物）。生成器に定数 `DATE_TIME_DEF`・`DATE_TIME_PATTERN`・`VERSION_KEY`（`erd_json_to_schema.py`）と `DATE_TIME_DEF`（`generate_json_schema_validator.py`）を足す。

---

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

| 消すもの | 所（`bf9d1fa2`） | 置き換わる先 | 編集 |
|---|---|---|---|
| 生成器の頭の「a date column carries NO pattern yet … said in the root description only」 | `erd_json_to_schema.py` の docstring | 日時の列が `$defs/DateTime` を指すこと・照合が捨てること・`scrollDate`・`schemaVersion` の `const` の 2 項 | E-06 |
| 日時の 18 列の `{"type": ["string", "null"]}` | `grs-document.schema.json` の `$defs` | `{"$ref": "#/$defs/DateTime"}`（説明を持つ 4 列は説明も） | E-06 |
| `schemaVersion` の `{"type": "string"}` | 同 根 | `{"type": "string", "const": <SCHEMA_VERSION>}` | E-06 |
| 照合の生成器の頭の「Two departures from the manuscript」 | `generate_json_schema_validator.py` | 「Three departures」（3 つ目は `DATE_TIME_DEF`） | E-06 |

---

## 4. 書き直す所

⭐ 文の正は当てたファイルそのものである。

- **E-01**（Chapter 6.1、表 T-220 の前文）—— 「⛔ 日程データの群にこの寛さを当ててはならない（MUST NOT）…」の段の後に、日時の形を照合に載せないこと（使えない日付は `FR-023` が行ごと落とす、`IV-14`）、スキーマは形を書き手への約束として言うこと（`FR-024`）、版の `const` も照合に載せないこと（`FR-073`）の 5 文。
- **E-02**（`UF-152`）—— 「日時の `pattern` と形式の版の `const` は節の表に刷らない —— 日時は `FR-023` が、版は `FR-073` が判じる（Chapter 6.1）」。
- **E-03**（Chapter 6.2、持ち回りの器の文の後）—— 日時の列は 1 つの日時の定義を指し、形を `xsd:dateTime` の字面の `pattern` で言うこと（MUST）、小数秒と帯を許す理由（`EX-4`）、`S-77` も同じ `pattern`、`schemaVersion` は造りの版を `const` で言うこと（MUST、`DR-4`）、どちらも照合に載せないこと。
- **E-04**（`FR-024` の STATEMENT の末尾）—— 「日時の列は、日付だけで書かず、いつも日時の形で書くこと（MUST）」、日時の列とは何か（表 T-058 が型を日時とする列と `S-77`）、理由、`GRS` が値を作るときの形（決定 3）。
- **E-05**（`DR-4` の升の末尾）—— 「刊行するスキーマは `schemaVersion` を、その造りの版の `const` で示すこと（MUST）」、値の出どころ（`FR-027` のテンプレートの版と同じ 1 か所）、読む路は `const` で拒まないこと。
- **E-06**（生成器）—— `erd_json_to_schema.py`: `isDate` の列を `$defs/DateTime` への参照にし（`null` を許さない日時の列か、ほかの鍵を持つ日時の列なら止まる）、`$defs/DateTime` を足し、型の欄が日付の見せ方の鍵（`scrollDate`）に同じ `pattern` を書き、根の `schemaVersion` に `const` を書く（鍵が根から消えたら止まる）。`generate_json_schema_validator.py`: `DROPPED` に `const`、`DATE_TIME_DEF` のノードで `pattern` を捨てる。`generate_startup_template.py`: 自前の読み手が `const` を解する。

当てた後に打ったもの: `npm run gen` → `npm run gen:check` → `npm run typecheck` → `vitest` フル（機械の錠の下） → `rm -rf output` → `bash .claude/skills/spec-graph-check/check.sh` → `rm -rf output`。

### 4.1 重なり

着地していない変更要求のうち、表 T-220 の前文・`UF-152`・`FR-024`・`DR-4` を書くものは無い。⚠️ CR D（版を上げる、`JDG-1209`）は `SCHEMA_VERSION` を動かす —— 本書の後なら `const` も同時に動く。CR D の C-24 は根の説明の「writes 00:00:00」を書き直す（本書は触れない）。

---

## 5. 継ぎ目

```
SEAM (CR-643)
- Generated, no hand-written src changed:
  * src/adapter/document-codec/grs-json-schema.ts (generated region): the 18
    date columns become `ref: 'DateTime'`; SCHEMA_DEFS gains
    DateTime {type: ['string', 'null']} -- the pattern is DROPPED there
    (DATE_TIME_DEF), so the walker judges exactly what it judged on the base.
    schemaVersion stays {type: ['string']}: `const` is DROPPED.
  * src/adapter/screen-renderer/image-to-grs-json-prompt.json: the minified
    schema the prompt carries.
- Test side: tests/fixtures/grs-document.ts keeps holding documents to the
  PUBLISHED schema (pattern and const included); 11 hand-written test
  documents now write their dates as YYYY-MM-DDT00:00:00.
- Not here: the writer of times per side (CR D, C-17), the version bump (CR D).
```

---

## 6. グラフ（`bf9d1fa2`）

- `impact.py FR-024`: 指す先に 表 T-052・T-024a・T-058・T-033・T-053・T-216、行 `OP-6`・`S-77`・`EX-4`・`DF-4`・`AT-140`。指している側は要求 11 件 ／ 参照 22 箇所 —— 新しい文はどれの意味も変えない（日時の形で書くことを足すだけ）。
- `impact.py DR-4`: 指している側は要求 2 件（`FR-095`・`FR-066`）／ 参照 8 箇所。`FR-095` の 表 T-342 の `BK-6`（`schemaVersion` は `FR-027` のテンプレートと同じ版）と、E-05 の値の出どころは同じことを言う。
- `impact.py UF-152`: 指している側は 0。
- 表 T-024a の `OP-6` は「スキーマに合わない文書は文書ごと拒む（Chapter 6.1）」と Chapter 6.1 を指す —— E-01 の例外はそこから届く（② の `R1.3`）。

---

## 7. 数の予測と測った数

| 数 | 前 → 後 | 測り方 |
|---|---|---|
| スキーマの `$defs` | 19 → 20（`DateTime`） | 生成物を読んだ |
| スキーマの `pattern` | 8 → 10（`$defs/DateTime` と `scrollDate`） | `"pattern"` を数えた |
| `$defs/DateTime` を指す列 | 0 → 18（`erd.json` の `isDate` の列すべて） | `#/$defs/DateTime` を数えた |
| スキーマの大きさ（字下げ 1） | 29,534 → 29,476 バイト | `wc -c` |
| 生成物のうち中身が動いたファイル | 3（`grs-document.schema.json`・`grs-json-schema.ts`・`image-to-grs-json-prompt.json`） | `npm run gen` 後の `git status` |
| 自動試験の失敗（`vitest` フル、30069 件） | base 4 → 生成だけ当てて 26（増えた 22 件は 11 ファイル、どれも ajv の補助が日付だけの値を拒んだ） → 試験の文書を直して base と同じ 4 | 13 節 |
| 直した試験の文書の値 | 52 か所（11 ファイル —— 試験 10 と共有の段 `tests/unit/cr-541-stage.ts`） | 13 節の台本 |
| `npm run typecheck` の誤り | 0 → 0 | 同 |
| `check.sh` | 当てた木で base と同じ赤 | `GRS_DEV_PORT=5991`、`rm -rf output` の後 |

---

## 8. 波 —— 持ち場で割る

| 波 | 持ち場 | 中身 | 体 |
|---|---|---|---|
| 1 | `docs/spec/`（Chapter 6.1・6.2・`FR-024`・`DR-4`）＋ 生成器 ＋ 生成物 ＋ 試験の文書 ＋ 台帳 | E-01〜E-06、`npm run gen` | 仕様の波（本書） |
| 1b | `tests/` | 新しい印を逐語で引き、刷られたスキーマと節の表で確かめる試験 —— 日時の 18 列が 1 つの定義を指し、その `pattern` が `xsd:dateTime` の字面を受けて日付だけを拒む、`scrollDate` も同じ、`schemaVersion` の `const` が `startup-template-manifest.json` の版と等しい、節の表に `pattern`（日時）も `const` も無い、`FR-023` の落とす行は読み込みで文書ごと拒まれない | 仕様だけを読む試験の体（本書の書き手ではない） |

⚠️ **毎フレームの経路**: `src/adapter/screen-renderer/image-to-grs-json-prompt.json`（生成）が規則 04 の 5 節の `src/adapter/screen-renderer/**` に入るので、`perf-pending.md` に 1 行足した（68）。中身はクリップボードへ写す文字列であり、毎フレームには読まれない。

---

## 9. 仕様の外で直すもの

無い。案内 `docs/guides/schedule-to-grs-json/` の土台と例は検査 75（`check-guide-grs-json.py`）が刊行するスキーマで照らす —— 当てた木で緑。

---

## 10. ⛔ この変更でやらないこと ・ 触れ合うもの

- 版を上げない（`JDG-1209` は CR D）。
- `GRS` が書く時刻を変えない（`EX-7` の `00:00:00` と `textOfDay` のまま。側ごとの時刻は CR D の C-13・C-17）。
- 根の説明の「writes 00:00:00」を直さない（CR D の C-24）。
- ラグ（CR B）・完了率（CR C）・`stackOrder`・`TaskVisual` に触れない。
- 歩き手（`grs-json-schema.ts` の手で書く側）に `const` も `pattern` の新しい扱いも足さない —— 節の表から語が来ないので、手で書く側は変わらない。

---

## 11. 利用者に問うこと

本書からは問わない。

---

## 12. 台帳

| 行 | 何 | 本書での扱い |
|---|---|---|
| `JDG-1191` | 日付は日時の形を保ち、`pattern` で言う | 「適用済」。着地先に `FR-024`・Chapter 6.2・生成器を名指した |
| `JDG-1200` | 形は見せ、照合は `FR-023` | 「適用済」 |
| `JDG-1202` | 版の `const` を出し、照合では捨てる | 「適用済」 |
| `JDG-1205` | 書く時刻（`pattern` の字面を含む） | 状態は変えない。着地先に「`pattern` の字面だけは `CR-643` が当てた」 |
| `JDG-1209` | 版を上げる、版の正は 1 つ | 状態は変えない。着地先に「`const` を `SCHEMA_VERSION` から起こすことだけは `CR-643` が当てた」 |
| `DFC-1793` | 日時の形をスキーマが言わない | `仕様待ち` → `試験待ち`。対応方針の欄に「以下は裁定の前」の印を足した（レビューの指摘） |
| `DFC-1794` | `const` で `npm run gen` が止まる | `仕様待ち` → `試験待ち` |
| `DFC-1795` | 日付の `pattern` と `FR-023` のぶつかり | `仕様待ち` → `試験待ち` |
| `DFC-1815`〜`DFC-1819` | 帯 | 使わなかった |
| `perf-pending.md` の 68 | `CR-643` の生成物 `image-to-grs-json-prompt.json` | 1 行足した |
| `docs/development-records/changelog.md` の 3.46 | 本書 | 1 行足した |

---

## 13. 測り方の再現

```
# tree: bf9d1fa2. Every file edited here is LF-only; the Japanese edits were
# made by scripts that assert each old string occurs exactly once.

# base failure set (full vitest under the machine lock)
node tools/gate/gate-queue.mjs run -- node ../../../node_modules/vitest/vitest.mjs run --reporter=json --outputFile=<base.json>
#   -> 30069 tests, 4 failed

# generators changed, npm run gen, the same run
#   -> 26 failed: 22 new, in 11 files, every one an ajv premise
#      ("... is a valid GRS JSON document") or a case that re-validates the
#      document it left; all were date-only values ('2026-04-01').
# the test documents fixed: each named line's '\d{4}-\d{2}-\d{2}' literal
#   gained T00:00:00 (52 literals, 11 files); the same run
#   -> 4 failed, the same 4 as the base (one load timeout in
#      tests/contract/cr-430-* passed when run alone)

grep -rlE "schemaVersion: ?'(1|2026-01-01|grs-1|1\.0)'" tests        # 20 files
grep -rlE "schemaVersion: ?'(1|2026-01-01|grs-1|1\.0)'" tests | xargs grep -l fixtures/grs-document   # 0
grep -rl "fixtures/grs-document" tests                                 # 30 (29 tests + README)

npm run typecheck          # 0 errors on both
npm run gen:check          # 0 drift

PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py FR-024
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py DR-4
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py UF-152
```
