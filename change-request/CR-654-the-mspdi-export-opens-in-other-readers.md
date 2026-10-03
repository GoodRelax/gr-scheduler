# CR-654 —— 書き出した MSPDI を、ほかの読み手が開ける

> 起草の状態: 当てた（2026-10-04、`3b9c6f5c` の上）。起草と当てを同じ作業木で行った。
> ID の帯: 番号 `CR-654` と台帳の帯 `DFC-2020`〜`DFC-2024` は調整役から受けた。帯の行は使わなかった（12 節）。仕様の新しい行 ID は 表 T-033 の `EX-13` ／ `EX-14` と 表 T-059 の `DV-13`〜`DV-15` の 5 つ（2 節。調整役が併合のときに番号を見直す）。
> 閉じるもの: `DFC-1960`（`JDG-1300`）、`DFC-1961`（`JDG-1300`）、`DFC-1962`（`JDG-1301`）、`DFC-1963`（`PND-700`）、`DFC-1964`（`JDG-1302`）。
> ⛔ 触れないもの: 休日の設定の面（`WC-4`〜`WC-7`）の組み立て —— `src` にまだ無い（`CR-649` の 10 節と同じ）。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 利用者の裁定（`docs/development-records/rulings.md`。全文は同書を見よ）

| 裁定 | 逐語（抜粋） | 本書での扱い |
|---|---|---|
| `JDG-1300` | 「そうする (Recommended)」 —— 1 回きりの休日を公式の例と同じ形で書き、読むときも「Type 9、または Type 1 で Period が無いか 1」を繰り返し無しと読む | 述語を `AT-82` の 1 か所に（E-01）。書き出しの形を `EX-13`（E-05）。`FR-088` ／ `WC-5` ／ `WC-6` ／ `OD-1` は述語を指す（E-03） |
| `JDG-1301` | 「無いときだけ 1 を足す (Recommended)」 | `EX-14`（E-05）と `DV-15`（E-02） |
| `JDG-1302` | 「日数にも使わない (Recommended)」 | `FR-054` の RATIONALE に MUST NOT 1 つ（E-04） |

`PND-700`（一般の要求にするか）は、推奨どおり「一般の要求にはせず、分かった形を 表 T-033 の行として足す」で閉じた —— 調整役の指示（本書の起票の文）による。⚠️ 利用者の逐語の裁定は無い。

### 0.2 ⛔ 当てる前に確かめた 3 つ

**問い 1 —— 範囲が 2 日以上の例外日も `Occurrences` 1 でよいか。⇒ よい。**

- 公式の説明の例は 2 つある。`occurrences-element.md` の 1 日の休日は `Occurrences` 1、`calendar-element.md` の 2 日の休日は `Occurrences` 2 である（どちらも `EnteredByOccurrences` 0、`Type` 1）。
- `EnteredByOccurrences` 0 は「範囲を終わりの日で決める」と言う（`enteredbyoccurrences-element.md`）。範囲は `TimePeriod` が持つ。
- 交換相手の読み手が自分で書いた見本 6 つ（`sample-schedule/*.xml`）を数えた: 例外日 516 件すべてが `Type` 1・`Occurrences` 1・`EnteredByOccurrences` 0、`Period` 無し。うち 64 件は範囲が 2 日以上である（13 節）。
- ⇒ `JDG-1300` の逐語どおり 1 とし、その理由を `EX-13` の ⚠️ に 1 文で書いた（決定 2）。

**問い 2 —— 述語をどこに 1 つ置くか。⇒ `Entity` の `working-calendar.ts`（`UF-128`）。**

- 述語を読む所は 4 つ —— 取り込みの告知（`mspdi-codec.ts`、`Adapter`）、書き出しの形（同）、稼働日の数え（`working-calendar.ts`、`Entity`）、非稼働日の塗り（`schedule-grid.ts`、`Adapter`）。数える側が `Entity` にあるので、そこに置けば 3 つの `Adapter` は既に読む `Schedule` の公開名を 1 つ増やすだけで済む（`R2.21`）。
- 定数 `9` の写しが 2 つ（`mspdi-codec.ts` と `schedule-grid.ts` の `NO_RECURRENCE`）あった。どちらも消した。
- 公開名 `isNonRecurringException` と `DAILY_RECURRENCE_KIND` を 表 T-064 の `Schedule` の項に足した（`published-entries.json`）。辺は増えない。

**問い 3 —— 書き出しで形を足す行の条件。⇒ `recurrenceKind` が `1` で、述語が繰り返し無しと言い、`carry` にその子が無い行。**

- `JDG-1300` は「`GRS` が作る」行の形を言い、「取り込んだ値は読んだ字のまま書き戻す」と言う。取り込んだ行は `Occurrences` ／ `EnteredByOccurrences` を `carry` に持ち回るので、`carry` に無いときだけ足せば両方が立つ。
- `Type` 9 の行には足さない —— `Type` を `1` へ書き換えないかぎり形にならず、書き換えは `EX-2` に反する（`JDG-1300` の「訳さない」）。
- 間隔が 2 以上の日次の行には足さない —— 繰り返しの行に `Occurrences` 1 を足すと意味が変わる。

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

⭐ **`CH-1` の `GL-004`**（成果物が構造化データである）。書き出した MSPDI を、スキーマに妥当なだけでなく、ほかの読み手が実際に開ける。取り込んだ 1 回きりの休日が繰り返しと告げられず、塗られ、数えと絵が食い違わない。

### ② レビュー観点のどの条項を当て、何が出たか

- **`R2.21`（1 つの仕事は 1 か所）** —— 「繰り返しの無い例外日」の判じ方が 3 か所（取り込み・塗り・生成器）にばらばらの写しで在り、数える所は判じていなかった → `isNonRecurringException` の 1 か所（生成器の Python は同じ述語の写しを 1 つ持つ —— 言語が違う）。
- **`R3.4`（境界）** —— `Period` は文字列で持ち回るので、空と前後の空白を「無い」と読み、数として `1` と比べた。
- **`R2.10`（SoC）** —— 書き出しの形（`Occurrences` ／ `EnteredByOccurrences` ／ `Units`）は文書に持たず、書き出すときに作る（表 T-059 に 3 行）。

### ③ 利用者に問わずに決めたこと

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| 決定 1 | 述語は `Entity`、公開名 2 つ | 問い 2 | 公開名が 2 つ増えた |
| 決定 2 | 2 日以上の範囲でも `Occurrences` 1 | 問い 1 | 公式の 2 日の例（`Occurrences` 2）とは違う |
| 決定 3 | 形を足すのは `recurrenceKind` 1 の 1 回きりの行で、`carry` に無い子だけ | 問い 3 | 取り込んだ `Type` 9 の行は、ほかの読み手で止まりうるまま戻る |
| 決定 4 | `PND-700` は一般の MUST にせず、行 2 つ | 推奨と調整役の指示 | 新しく分かる形は、その都度行を足す |

---

## 1. 範囲 —— 行き先

| 何 | 仕様で変える所 | 編集 |
|---|---|---|
| 述語 | `docs/spec/_source/erd.json` の `Exception.recurrenceKind`（生成: `_assets/fig-erd-detail.md` の 表 T-058 の `AT-82`、`grs-document.schema.json` の説明） | E-01 |
| 書き出すときに作る値 | `erd.json` の `derived`（生成: 表 T-059 の `DV-13`・`DV-14`・`DV-15`） | E-02 |
| 暦の編集 | `docs/spec/01-04-requirements.md` の `FR-088` の本文、表 T-344 の `WC-5`・`WC-6`、表 T-343 の `OD-1` | E-03 |
| 稼働日の数え | 同書の `FR-054` の RATIONALE | E-04 |
| 書き出しの規約 | 同書の 表 T-033 に `EX-13`・`EX-14` | E-05 |
| ユニット・公開名 | `docs/spec/05-07-design.md` の 表 T-075 の `UF-128`、`docs/spec/_source/published-entries.json` | E-06 |
| コード | `src/entity/document-model/schedule/working-calendar.ts`・`schedule.ts`、`src/adapter/document-codec/mspdi-codec.ts`、`src/adapter/svg-renderer/schedule-grid.ts` | 5 節 |
| 見本 | `tools/generate_startup_template.py`（生成: `startup-template.json`・`tests/fixtures/measuring-document.json` の 7 行の `recurrenceKind`） | 9 節 |

**数**: `FR-054` に `（MUST NOT）` 1。`EX-13` に `（MUST）` 2 ・ `（MUST NOT）` 1。`EX-14` に `（MUST）` 2。表の行 5（`EX-13`・`EX-14`・`DV-13`〜`DV-15`）、設定の行 0、要求 0。

---

## 2. 新しい識別子

表 T-033 の `EX-13` ／ `EX-14`、表 T-059 の `DV-13` ／ `DV-14` ／ `DV-15`（どちらも表の最大の次）。表 T-064 の `Schedule` の項に公開名 `isNonRecurringException` ／ `DAILY_RECURRENCE_KIND`。コードに私的な `absentLeaf`（`mspdi-codec.ts`）と、生成器の `is_non_recurring`。

---

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

| 消すもの | 所（`3b9c6f5c`） | 置き換わる先 | 編集 |
|---|---|---|---|
| `AT-82` の「これを読まないと毎年 1 日の祝日が何年ぶんも非稼働になる（`FR-088`）」 | `erd.json` | 述語の段と、数えに使わない理由（`FR-054` を指す） | E-01 |
| `FR-088` の「（表 T-058 の `AT-82` の `9`）」、`WC-5` の「（`AT-82` が `9` でない行）」 | `01-04-requirements.md` | 「`AT-82` が言う繰り返しの無い例外日」 | E-03 |
| `WC-6` の「`AT-82` を `9` とする」 | 同 | 「`1` とする（書き出す形は `EX-13`）」 | E-03 |
| `FR-054` の「EX-1 は … 相手のツールで開ける形で書き出すことを求めており」 | 同 | 「スキーマに妥当な形で … （読み手が求める形は `EX-13` ／ `EX-14`）」 | E-04 |
| `NO_RECURRENCE = 9`（2 つ） | `mspdi-codec.ts`・`schedule-grid.ts` | `isNonRecurringException` | 5 節 |
| 見本の `recurrenceKind` 9（7 行）と生成器の `!= NO_RECURRENCE` | `generate_startup_template.py` | `DAILY_RECURRENCE_KIND`、`is_non_recurring` | 9 節 |

---

## 4. 書き直す所

⭐ 文の正は当てたファイルそのものである。

- **E-01**（`AT-82`）—— 種別の列挙の後に: 繰り返しの無い例外日とは、`9` か空の行と、`1` で `carry` の `Period` が無いか `1` の行である。公式の例の形。間隔 1 の日次は範囲そのものであること。それ以外は数えにも塗りにも使わない（`FR-054`）。`GRS` が足す行は `1`（`WC-6`）、書き出す形は `EX-13`。スキーマの英語の説明にも同じ述語の 1 文と「足すなら 1」の 1 文。
- **E-02**（`DV-13`〜`DV-15`）—— `carry` の原値、無ければ `EX-13` ／ `EX-14` の値。
- **E-03**（`FR-088`・`WC-5`・`WC-6`・`OD-1`）—— 3 節のとおり。`OD-1` は「繰り返しの無い例外日（`Exception`、`AT-82`）」と指すだけ。
- **E-04**（`FR-054`）—— 「繰り返しの例外日（`AT-82` が言う繰り返しの無い例外日でない行）は、稼働日の数えに使ってはならない（MUST NOT）」と理由（何年ぶんも非稼働になり、塗らない日と数えた日数が食い違う）。`EX-1` の読み違えを直した。
- **E-05**（`EX-13`・`EX-14`）—— 形・`carry` に無いときだけ・`Type` 9 を書き換えない・`Occurrences` 1 の理由、`Units` 1・持ち回る `Units` はそのまま・解釈しない。どちらも「スキーマに妥当でも止まる読み手がある」と理由を書いた。第三者の製品名は書かない。
- **E-06**（`UF-128`）—— 「繰り返しの無い例外日を見分ける述語（`AT-82`）を持つのも本ユニットだけであり、取り込み・書き出し・稼働日の数え・非稼働日の塗りがそれを使う」。公開名 2 つの注。

当てた後に打ったもの: `npm run startup` → `npm run gen` → `python docs/spec/_source/build.py` → `python docs/spec/_source/row_id_prefixes_json_to_md.py` → `npm run gen:check` → `npm run startup:check` → `npm run typecheck` → `vitest`（機械の錠の下） → `rm -rf output` → `bash .claude/skills/spec-graph-check/check.sh` → `rm -rf output`。

---

## 5. 継ぎ目

```
SEAM (CR-654)
- Entity (UF-128, working-calendar.ts, published by schedule.ts as Schedule members of T-064):
    DAILY_RECURRENCE_KIND = 1
    isNonRecurringException(exception): boolean
      true for recurrenceKind 9 or null, or 1 with carry.Period absent, blank or 1 (AT-82).
    indexOfCalendar skips a row the predicate calls recurring (FR-054), so isWorkingDay,
    workingDaysBetween and every count built on them ignore it.
- Adapter (UF-36, mspdi-codec.ts):
    exceptionsOfCalendar tells RS "repeats..." only for a row the predicate calls recurring.
    writtenException adds Occurrences 1 / EnteredByOccurrences 0 (EX-13, DV-13, DV-14) to a
    DAILY_RECURRENCE_KIND one-off row whose carry lacks them; EX-10 places them.
    writtenAssignment adds Units 1 (EX-14, DV-15) when the carry lacks Units.
- Adapter (UF-82, schedule-grid.ts): shadedCalendarOf keeps the rows the predicate calls one-off (OD-1).
```

---

## 6. グラフ（`3b9c6f5c`）

- `impact.py AT-82`: 要求 1 件（`FR-088`）・参照 3 箇所 —— どれも E-03 で書き直した。
- `impact.py WC-5`: 参照 1（`IC-136` の行）、`WC-6`: 要求 1（`FR-057`）・参照 2 —— `FR-057` の文（`WC-6` が時刻を知らずに済む）は本書の変更と食い違わない。
- `impact.py FR-054`: 本書は RATIONALE に 1 文足し、1 文を直しただけで、指す先を消していない。
- `impact.py EX-1`: `FR-054` の RATIONALE の 1 か所 —— E-04。

---

## 7. 数の予測と測った数

| 数 | 前 → 後 | 測り方 |
|---|---|---|
| 見本 6 本の「繰り返し」の告知 | 大 110 → 0、中 81 → 0、小 67 → 0（en と ja は同じ数） | 13 節の台本 |
| 見本 6 本の 1 回きりと読む例外日 | 0 → 110 ／ 81 ／ 67（塗られる） | 同 |
| 見本 6 本の 2020-01-01〜2031-12-31 の稼働日 | 大 2992 → 2992、中 3031 → 3031、小 3049 → 3049 | 同 —— 前も範囲の全日を数えていたので、日数は変わらない（`DFC-1961` の測りと同じ） |
| `tests/contract/cr-618-…`（見本がふつうに管理された日程に見える、表 S） | 緑 → 緑 | `vitest` |
| 起動時の見本の書き出し | pj12 ・ pj15 とも誤り 0 → 0。例外日 7 件の形 `9,–,–` → `1,1,0`。割り当て 946 件のうち `Units` を持つもの 0 → 946。読み戻して書き直した字は同じ | 新しい契約の試験（9 節） |
| `npm run typecheck` の誤り | 0 → 0 | 同 |
| 新しい試験 | 25 件（単体 21、契約 4）。壊した写し 3 つで: `Units` を足さない 2 件、数えで繰り返しを飛ばさない 1 件、日次を繰り返しと読む 8 件が赤くなった | 13 節 |

---

## 8. 波 —— 持ち場で割る

| 波 | 持ち場 | 中身 | 体 |
|---|---|---|---|
| 1 | 仕様 ＋ 生成物 ＋ コード ＋ 試験 ＋ 台帳 | E-01〜E-06、5 節 | 本書の体 |

⚠️ **毎フレームの経路**: `src/adapter/svg-renderer/schedule-grid.ts`（`shadedCalendarOf` の述語を差し替えた —— 比べは行ごとに 1 つのまま）と、生成された `src/adapter/screen-renderer/image-to-grs-json-prompt.json`（スキーマの説明の字だけ）が規則 04 の 5 節に入るので、`perf-pending.md` に 1 行足した。⚠️ 表の外だが、`working-calendar.ts` の `indexOfCalendar` も毎フレーム作られる —— 本書は行ごとに比べを 1 つ足しただけである。

---

## 9. 仕様の外で直すもの

- `tools/generate_startup_template.py` —— 見本の 7 行を `recurrenceKind` 1 に、自分の稼働日の検査を `is_non_recurring` に。`npm run startup` で `startup-template.json` と `tests/fixtures/measuring-document.json` を刷り直した（差分は 7 行ずつ）。
- 新しい試験 2 本: `tests/unit/cr-654-at-82-fr-054-ex-13-ex-14-the-one-off-exception-and-assignment-units.test.ts`、`tests/contract/cr-654-ex-1-ex-13-ex-14-the-startup-sample-exports-in-the-reader-shape.contract.test.ts`（`DFC-1963` ／ `PND-700`）。
- ⚠️ `DFC-1963` の「`startup-template.json` を書き出す試験は 0」は半分だけ正しかった —— `tests/contract/cr-429-ex-1-dv-2-a-document-grs-made.test.ts` は起動時の見本を書き出して pj12 に照らしていた。無かったのは、pj15 への照合と、読み手が求める形と、往復である。

---

## 10. ⛔ この変更でやらないこと ・ 触れ合うもの

- 休日の設定の面（`WC-4` の一覧、`WC-5` の語、`WC-6` の足す入口）は組まない —— `src` にまだ無い。組むとき、`WC-5` の見分けは `isNonRecurringException` を、`WC-6` の種別は `DAILY_RECURRENCE_KIND` を使う。
- 繰り返しの例外日を実日付へ展開しない（`JDG-1302` の択「実際の日付に展開する」は採られなかった）。
- 取り込んだ `Type` 9 の行は `9` のまま戻す —— ほかの読み手がその行で止まるかは本書の範囲の外である（決定 3）。
- 仕様の `EX-5` に第三者の製品名が 1 つ残っている —— 本書の範囲の外なので触れない。

---

## 11. 利用者に問うこと

本書からは問わない。⚠️ ほかの読み手で実際に開けるかは自動の試験では見られない —— 出荷ビルドの書き出しを、利用者がその読み手で開いて確かめる（`DFC-1960` ／ `DFC-1962` の `実測待ち`）。

---

## 12. 台帳

| 行 | 何 | 本書での扱い |
|---|---|---|
| `JDG-1300` ／ `JDG-1301` ／ `JDG-1302` | 本書の裁定 | 「適用済」。着地先に `AT-82`・`EX-13`・`EX-14`・`DV-13`〜`DV-15`・`FR-054` |
| `DFC-1960` ／ `DFC-1962` | 書き出しの形 | `仕様待ち` → `実測待ち`（ほかの読み手で開く） |
| `DFC-1961` ／ `DFC-1964` | 読みと数え | `仕様待ち` → `実測待ち` |
| `DFC-1963` | 試験の欠け | `仕様待ち` → `実測済`（契約の試験が緑、壊した写しで赤） |
| `PND-700` | 一般の要求にするか | `未裁定` → `裁定済`（0.1 の注） |
| `DFC-2020`〜`DFC-2024` | 帯 | 使わなかった |
| `perf-pending.md` | `schedule-grid.ts`・生成されたプロンプト | 1 行足した |
| `docs/development-records/changelog.md` | 本書 | 1 行足した |

---

## 13. 測り方の再現

```
# tree: 3b9c6f5c + this CR.
npm run startup && npm run gen && python docs/spec/_source/build.py
python docs/spec/_source/row_id_prefixes_json_to_md.py && npm run gen:check && npm run startup:check
npm run typecheck                                                        # 0 errors before and after
node tools/gate/gate-queue.mjs run -- node ../../../node_modules/vitest/vitest.mjs run --reporter=json --outputFile=<after.json>

# the partner's own samples: for each sample-schedule/*.xml count <Exception> by
#   (Type, Occurrences, EnteredByOccurrences, Period, FromDate day == ToDate day) and <Assignment> with <Units>:
#   516 exceptions, all (1, 1, 0, none); 64 span 2 days or more; 1826 assignments, all with Units.

# samples before / after: a scratch copy of the tree (git archive 3b9c6f5c) and of this tree, one vitest file each
#   that reads every sample-schedule/*.xml with documentFromMspdi and prints the "repeats" notices, the rows the
#   predicate calls one-off (before: recurrenceKind null or 9) and workingDaysBetween(2020-01-01, 2032-01-01).

# break tests: copy src/ tests/ sample-schedule/ docs/spec/ docs/reference/mspdi/ into the scratchpad, break one
#   piece, run the two cr-654 files there:
#   nounits (drop the Units leaf) 2 red; noskip (count recurring rows) 1 red; oldpredicate (kind 1 repeats) 8 red.

PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py AT-82 WC-5 WC-6 FR-088 FR-054 OD-1 EX-1
```
