# CR-644 —— ラグは 0.1 分で持ち、プロパティパネルは稼働日で見せて打たせる

> 起草の状態: 当てた（2026-10-03、`69c558c4` の上）。起草と当てを同じ作業木で行った。
> ID の帯: 番号 `CR-644` と台帳の帯 `DFC-1815`〜`DFC-1819` は調整役から受けた。帯の行は `DFC-1815` を 1 つ使った（12 節）。仕様の新しい識別子（表・行 ID・接頭辞・設定の行・要求）も取らない（2 節）。
> 閉じるもの: `docs/review/grs-json-schema-self-explanation-2026-10-03.md` の 7.1 節の CR B —— C-20・C-30（`JDG-1201`・`JDG-1208`）。同書 7.3 節の食い違い「ラグの単位」（`S-118` と `AT-47`）。台帳 `DFC-1798`、`PND-606`（`JDG-822`）。
> ⛔ 閉じないもの: CR C（完了率の数え直し、C-27）、CR D（版を上げる、ほか 17）。`DFC-1796` のうち、原稿の 1 行目の主張と案内を刷る生成器（12 節）。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 利用者の裁定（`docs/development-records/rulings.md`。全文は同書を見よ）

| 裁定 | 逐語（抜粋） | 本書での扱い |
|---|---|---|
| `JDG-1201` | 「A. 保存は 0.1 分、パネルは稼働日 (Recommended)」 | `S-118` を「ラグを見せる単位」にし（E-01）、`FR-009` が稼働日 ↔ 0.1 分の換算を持つ（E-04）。換算の 1 日は `Project.minutesPerDay`、空なら `S-128` |
| `JDG-1208` | 「A. 日の形式だけを解する (Recommended)」 | `FR-009` が「解するのは `lagFormat` 7 だけ」、ほかの形式は MS Project の字面で見せるだけ（E-04）。`VC-15` は解さない形式を判じず、`BD-2` は 0 として流す（E-05・E-06） |
| `JDG-822` | 「6.依存の遅れ（lag）の単位  これは 日  / days じゃないの？…」 | 遅延診断がラグを稼働日で読む（E-05・E-06）。`PND-606` の仮の実装（遅れ 0）を外した |

### 0.2 ⛔ 当てる前に確かめた 3 つ

**問い 1 —— 換算は誰がするか。⇒ `EditDocument`（`edit-dependency.ts`）。命令は稼働日を運ぶ。**

- 打つ口（`field-commit.ts`）は文書の `Project` を持たない。`EditDocument` は文書を持ち、`createDependency` も同じ換算が要る（`FR-009` の「依存を作るときも同じく書く」）。
- ⇒ `setDependencyLag` の荷を `lag` から `lagWorkingDays` に改名した（単位を名に入れる、07 の `R2`）。命令の名 `setDependencyLag`（`CM-38`）は変えない。荷の名は表 T-108 に無い。
- 換算の式は 1 か所 —— `working-calendar.ts`（`UF-128`）の `lagWorkingDaysOf`・`lagOfWorkingDays`・`minutesPerWorkingDayOf`。表 T-075 の `UF-128` の文に「ラグを稼働日へ換算する」を足した（E-07）。

**問い 2 —— 稼働日でない形式を「MS Project の字面」で見せるには、単位の長さが要る。どこにあるか。⇒ 交換相手の資料は記号しか言わない。長さは名が決めるもの（分・時・経過の日・経過の週）と `Project` の列（日・週・月）だけを使い、ほかは分の字面で見せる。**

- XSD（`mspdi_pj12.xsd:2203`）は 3 = `m` 〜 20 = `e%`、35〜52 は `?` 付きを列挙するだけで、単位の長さを言わない。`learn-docs` の `LagFormat` の項も同じ。
- 百分率は先行の期間に対する割合であり、経過の月の長さも資料に無い。⇒ 推して書かない。`AT-47`（`CR-642`）が「単位は `lagFormat` が何であっても 0.1 分」と言うので、分の字面（`2880m`）なら嘘にならない。
- `lagFormat` の空も同じく分の字面。⚠️ ただし `lag` が 0 か空なら形式によらず 0 日 —— 今の文書と試験の文書の大半は `lag: 0, lagFormat: null` を書く。

**問い 3 —— 遅延診断は端数のラグをどう数えるか。⇒ 稼働日へ換算し、小さいほうへ丸める（床）。**

- `VC-15` は「必ずどちらかが誤り」の階級である。端数を大きいほうへ丸めると、端数のラグで組んだ正しい計画に矛盾が付く。床は境を遅くしない（負のラグでも）。
- `BD-2` も同じ数を使う（同じ `Link` の `lagWorkingDays`）。解さない形式は `VC-15` では判じず（`null`）、`BD-2` では 0 として流す —— `JDG-1208` の「遅延診断は数えず」。
- 足し方は既存の `dateFromWorkingDays`（文書の暦で進める）。ラグ 0 の依存では暦を引かない（毎回の索引を避ける）。

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

⭐ **`CH-1` の `GL-004`**（成果物が構造化データである）。打った「2」が `MSPDI` で 0.2 分にならない —— 人が打つ単位と、交換相手が読む単位が、換算 1 か所で結ばれる。

### ② レビュー観点のどの条項を当て、何が出たか

- **`R1.3`（矛盾がない・唯一の正）** —— `S-118`（稼働日）と `AT-47`（0.1 分）の食い違いを、「見せる単位」と「持つ単位」に分けて解いた。⚠️ 原稿の手順 5 と `Dependency.lag` の説明が `S-128` の値 480 を手で写していた —— どちらも `{{S-128}}` で名指し、生成器が settings.json から刷る（E-08・E-09）。
- **`R1.4`（境界・空の場合）** —— `lag` が空、`lagFormat` が空、`minutesPerDay` が空か 0 以下、`minutesPerWeek`・`daysPerMonth` が空のときをそれぞれ決めた（E-04）。
- **`R2`（名）** —— 荷の名 `lagWorkingDays`、定数 `WORKING_DAY_LAG_FORMAT`・`TENTHS_OF_A_MINUTE`。

### ③ 利用者に問わずに決めたこと

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| 決定 1 | 稼働日でない形式の字面の単位の長さ —— 名が決めるものと `Project` の列だけ。ほかは分の字面 | 問い 2。資料に長さが無いものを推さない | 百分率・経過の月は `2ed` のようには見えない（分で見える） |
| 決定 2 | 見せる数は小数 2 桁まで | 取り込んだラグは端数を持ちうる（`JDG-1208` の「端数は見せるだけ」）。限らないと 0.2083333… が欄を割る | 3 桁目は見えない（値は保つ） |
| 決定 3 | 遅延診断の端数は床 | 問い 3 | 1.5 稼働日のラグは 1 日として判じる |
| 決定 4 | 新しく作る依存も `lagFormat` 7 | `FR-009`。単位の無いラグは交換相手が当て推量する（交換相手の資料「LinkLag requires a LagFormat to be specified」） | 既存の `lag: 0, lagFormat: null` の文書は変わらない（0 は形式によらず 0） |
| 決定 5 | 手で書く案内（`DFC-1796`）の手順 5 は、刷った原稿の文を写した | C-30 の「手書きの案内も同じ文へ」。案内を刷る生成器は無い | 案内には 480 が手で写る（`DFC-1796` は開いたまま） |

---

## 1. 範囲 —— 行き先

| 何 | 仕様で変える所 | 編集 |
|---|---|---|
| 見せる単位 | `docs/spec/_source/settings.json` の 表 T-213 の `S-118`（名と備考） | E-01 |
| パネルの行 | `docs/spec/_source/property-items.json` の 表 T-016 の `PR-42` | E-02 |
| 列の意味と説明 | `docs/spec/_source/erd.json` の `AT-47`・`AT-48`（意味と `schemaNote`） | E-03 |
| 換算と字面 | `docs/spec/01-04-requirements.md` の `FR-009` | E-04 |
| 遅延診断 | 同 表 T-310 の `VC-15`、表 T-313 の `BD-2` | E-05・E-06 |
| ユニット・公開名 | `docs/spec/05-07-design.md` の 表 T-075 の `UF-128`、`docs/spec/_source/published-entries.json` の 表 T-064 の `PI-1` | E-07 |
| プロンプトの原稿 | `docs/spec/_source/image-to-grs-json-prompt.ja.md`・`.en.md` の手順 5 | E-08 |
| 生成器 | `tools/generate_entity_types.py`・`docs/spec/_source/erd_json_to_schema.py`・`tools/generate_image_to_grs_json_prompt.py`・`tools/generate_startup_template.py` | E-09 |
| コード | `src/entity/document-model/schedule/working-calendar.ts`・`schedule.ts`・`delay-diagnostics.ts`、`src/use-case/edit-document/edit-dependency.ts`、`src/adapter/input-command-translator/field-commit.ts`、`src/adapter/screen-renderer/properties-panel.ts` | 5 節 |
| 見本・案内 | `sample-schedule/Three-Year Product Plan.json`、`docs/guides/schedule-to-grs-json/prompt-ja.md`・`prompt-en.md` | 9 節 |

**数**: `FR-009` に `（MUST）` 3（見せて打たせる・書く・字面で見せて保つ）と文 7、`VC-15` に `（MUST NOT）` 1 と文 3、`BD-2` に文 2、表の升 5（`S-118` の名と備考、`PR-42`、`AT-47`、`AT-48`、`UF-128`）。表の行 0、設定の行 0。

---

## 2. 新しい識別子

仕様の行 ID は 1 つも取らない。表 T-064 の `PI-1`（`Schedule`）に公開名 5 つ —— `minutesPerWorkingDayOf`・`lagWorkingDaysOf`・`lagOfWorkingDays`・`WORKING_DAY_LAG_FORMAT`・`TENTHS_OF_A_MINUTE` —— を足した（`docs/spec/_source/published-entries.json`。`UseCase` と `Adapter` が読むので、検査 26b が表の全数に求める）。コードに `WORKING_DAY_LAG_FORMAT`・`TENTHS_OF_A_MINUTE`・`minutesPerWorkingDayOf`・`lagWorkingDaysOf`・`lagOfWorkingDays`（`working-calendar.ts`）、生成器に `default_calendar_number`・`with_calendar_rows_printed`（`generate_entity_types.py`）と `lag_of_working_days`・`TENTHS_OF_A_MINUTE`（`generate_startup_template.py`）を足した。原稿の中の印 `{{S-128}}`（表 T-209 の行を名指し、生成器が値を刷る）を足した。

---

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

| 消すもの | 所（`69c558c4`） | 置き換わる先 | 編集 |
|---|---|---|---|
| `S-118` の名「ラグの単位」 | 表 T-213 | 「ラグを見せる単位」と、保存の単位でないことの備考 | E-01 |
| `PR-42` の「単位は … 表 T-213」 | 表 T-016 | 見せる単位は `S-118`、換算と字面は `FR-009` | E-02 |
| `AT-48` の意味「ラグの単位」と説明「(7 = days)」 | 表 T-058 | 見せる単位、XSD の列挙、解するのは 7 だけ | E-03 |
| `FR-009` の「既定値と単位は … 表 T-213 が持つ」 | 01-04 | 見せる単位と換算・字面の 7 文 | E-04 |
| 原稿の手順 5 の手で写した 480 と 9600 | 原稿 ja・en | `{{S-128}}`（生成器が刷る）と式 | E-08 |
| `delay-diagnostics.ts` の STOP と `@provisional PND-606`（遅れ 0 で読む） | `src` | ラグを稼働日で読む | 5 節 |
| 命令の荷 `setDependencyLag.lag`（打たれた数をそのまま保存） | `edit-dependency.ts` | `lagWorkingDays`（換算して `lag` と `lagFormat` 7 を書く） | 5 節 |
| 新しい依存の `lagFormat: null` | `edit-dependency.ts:103` | `lagFormat: 7` | 5 節 |
| 起動時の見本の生成器の、日数で書くラグと「単位がある」だけを確かめる所 | `generate_startup_template.py` | 0.1 分で書き、`lagFormat` が 7 であることを確かめる | E-09 |

---

## 4. 書き直す所

⭐ 文の正は当てたファイルそのものである。

- **E-01**（`S-118`）—— 名を「ラグを見せる単位」に、備考に「プロパティパネルがラグを見せ、打たせる単位（`FR-009`）。⚠️ 保存の単位ではない —— 保存は 0.1 分である（`AT-47`）。1 稼働日は `Project.minutesPerDay` 分、空なら `S-128` 分である」を足した。値「稼働日」と 🔎 は変えない。
- **E-02**（`PR-42`）—— 見せて打たせる単位は `S-118`、換算と稼働日でない形式の見せ方は `FR-009`。
- **E-03**（`AT-47`・`AT-48`）—— `AT-47` の意味に「空なら `S-128`」。説明に「or {{S-128}} when that is null」（生成器が 480 を刷る —— レビューの指摘「the lag note must say the 480 fallback」）。`AT-48` の意味は「ラグを見せる単位。値と記号は XSD の列挙が持つ。解するのは 7 だけ」、説明は「7 (working days) is the one GRS reads and the one to write; any other is kept but not counted.」
- **E-04**（`FR-009`）—— パネルは稼働日で見せ整数の稼働日で打たせる（MUST）、書くときは `lag` に 稼働日 × 1 日の分数 × 10、`lagFormat` に 7（MUST）、作るときも同じ、解するのは 7 だけ、0 か空は 0 日、ほかの形式は MS Project の字面で見せて往復で保つ（MUST、`FR-021`）、単位の長さ、長さを決められないときは分の字面、小数 2 桁まで。
- **E-05**（`VC-15`）—— `lag` は稼働日で数え、先行の日から文書の暦で進めた日と比べる、端数は床、解さない形式で `lag` が 0 でない依存は判じない（MUST NOT）。`VS-4` は「式は `VC-15` を実績の列に当てたもの」なので同じく届く。
- **E-06**（`BD-2`）—— `lag` は `VC-15` と同じく稼働日で数えて暦で進める、解さない形式は 0 として流す。
- **E-07**（`UF-128`）—— 「文書の暦で稼働日を判じ、数え、進め、ラグを稼働日へ換算する（`FR-054`・`FR-009`）」。
- **E-08**（原稿の手順 5）—— 「null なら {{S-128}} 分」と「2 日のラグは 2 × 1 日の分数 × 10（null なら 2 × {{S-128}} × 10）」。手で計算した 9600 を消した。
- **E-09**（生成器）—— `generate_entity_types.py` に表 T-209 の値を読む `default_calendar_number` と `{{S-n}}` を刷る `with_calendar_rows_printed`（名指した行が無ければ止まる）。`erd_json_to_schema.py` は `schemaNote` を、`generate_image_to_grs_json_prompt.py` は原稿を、それで刷る。`generate_startup_template.py` は FS の間の稼働日 × `S-128` × 10 を書き、`lagFormat` が 7 であることを確かめる。

当てた後に打ったもの: `npm run gen` → `npm run gen:check` → `npm run typecheck` → `vitest` フル（機械の錠の下） → `rm -rf output` → `bash .claude/skills/spec-graph-check/check.sh` → `rm -rf output`。

### 4.1 重なり

CR A（`CR-643`）は当て済み。CR C（`JDG-1196`）は `json-codec.ts` の読む路を、CR D は見本と雛形を作り直して版を上げる —— ⚠️ CR D が見本を作り直すときは、本書の 0.1 分のラグ（生成器が書く）をそのまま継ぐ。本書は版を上げない（形は変わらない）。

---

## 5. 継ぎ目

```
SEAM (CR-644)
- Entity (UF-128, working-calendar.ts, re-exported by schedule.ts):
    WORKING_DAY_LAG_FORMAT = 7, TENTHS_OF_A_MINUTE = 10,
    minutesPerWorkingDayOf(project): minutesPerDay, or S-128 when null/<= 0
    lagWorkingDaysOf(dependency, minutesPerDay): number | null
      0 for a lag of 0 or null whatever the format; null when lagFormat != 7
    lagOfWorkingDays(workingDays, minutesPerDay): rounded tenths of a minute
- Use case (UF-13): setDependencyLag carries lagWorkingDays (whole working
  days; a fraction is refused, CM-38 / FR-009) and writes lag + lagFormat 7;
  createDependency writes S-117 converted, lagFormat 7.
- Adapter: field-commit hands the typed number on as lagWorkingDays;
  properties-panel shows PR-42 as working days (2 decimals), or as the
  MS Project literal ("2ed", "3h", "1ed?"), or in minutes ("2880m").
- Delay diagnostics (UF-184): Link carries lagWorkingDays (floor; null =
  unread); VC-15 / VS-4 skip a null, BD-2 flows it as 0.
```

---

## 6. グラフ（`69c558c4`）

- `impact.py S-118`・`PR-42`・`AT-48`・`BD-2`: 指している側は 0。
- `impact.py VC-15`: 指している側は `FR-131`・`FR-132`（各 1） —— どちらも観点の一覧を指すだけで、新しい文はどれの意味も変えない。
- 表 T-213 を指すのは `FR-009` 1 つ（既定値と単位）—— その文を E-04 で書き直した。

---

## 7. 数の予測と測った数

| 数 | 前 → 後 | 測り方 |
|---|---|---|
| 0 でないラグを 0.1 分へ直した数 | 見本 354（509 本のうち、0 の 155 本はそのまま）。起動時の見本 354、計測用の文書 354（どちらも生成） | 13 節の台本 |
| `lagFormat` 7 でない依存 | 3 本とも 0 | 同 |
| スキーマの説明の変化 | 2 か所（`lag`・`lagFormat`） | `git diff` |
| 生成物のうち中身が動いたファイル | 4（`grs-document.schema.json`・`image-to-grs-json-prompt.json`・`startup-template.json`・`measuring-document.json`）と仕様の生成表 3（`fig-erd-detail.md`・`tbl-property-items.md`・`tbl-settings.md`） | `npm run gen` 後の `git status` |
| `npm run typecheck` の誤り | 0 → 0 | 同 |
| 新しい試験 | 34 件（`tests/unit/cr-644-…`） | `vitest` |
| 自動試験の失敗（`vitest` フル） | base 4（30069 件）→ 8（30103 件）。増えた 4 件は `tests/contract/cr-618-the-mspdi-samples-read-as-managed-projects.contract.test.ts` の ERP の見本 en・ja × 2 —— `DFC-1815` | 13 節 |
| 検査の基準 | 検査 37 の `PR-42` の指紋を書き直した（行と語を読み合わせた —— 語「ラグ」は行の言うことのまま）。`editDependency` は `setDependencyLag` の枝を `withLagSet` へ出して、検査 60 の基準を上げずに収めた | `check.sh` |

---

## 8. 波 —— 持ち場で割る

| 波 | 持ち場 | 中身 | 体 |
|---|---|---|---|
| 1 | 仕様 ＋ 生成器 ＋ 生成物 ＋ コード ＋ 試験 ＋ 見本 ＋ 案内 ＋ 台帳 | E-01〜E-09、5 節 | 本書の体 |

⚠️ **毎フレームの経路**: `src/adapter/screen-renderer/properties-panel.ts`（依存線を選んだときの `PR-42` の欄の文字）と `image-to-grs-json-prompt.json`（生成）が規則 04 の 5 節の `src/adapter/screen-renderer/**` に入るので、`perf-pending.md` に 1 行足した（69）。パネルの変化は依存線を 1 本選んだときの 1 欄の文字だけである。

---

## 9. 仕様の外で直すもの

- `sample-schedule/Three-Year Product Plan.json` —— 日数で書いたラグ 354 本を 0.1 分へ（`minutesPerDay` が空なので 1 日 = `S-128`）。レビューの指摘 (b): CR D まで待つと、その間 0.1 分として読まれる。
- `docs/guides/schedule-to-grs-json/prompt-ja.md`・`prompt-en.md` の手順 5 —— 刷った原稿の文を写した（決定 5）。検査 75 は散文を読まない。

---

## 10. ⛔ この変更でやらないこと ・ 触れ合うもの

- 版を上げない（形は変わらない）。
- 稼働日でない形式を数えない —— 百分率・経過の月の長さを推さない（問い 2）。
- 案内を刷る生成器を足さない（`DFC-1796` の残り）。
- `mspdi-codec.ts`・`task-plan-actual.ts` の同じ形の 1 日の分数の私的な関数は、本書では寄せない（触れない持ち場）。

---

## 11. 利用者に問うこと

本書からは問わない。

---

## 12. 台帳

| 行 | 何 | 本書での扱い |
|---|---|---|
| `JDG-1201` | 保存は 0.1 分、パネルは稼働日 | 「適用済」。着地先に `FR-009`・`S-118`・`PR-42`・`AT-47` |
| `JDG-1208` | 解するのは日の形式だけ | 「適用済」。着地先に `FR-009`・`AT-48`・`VC-15`・`BD-2` |
| `JDG-822` | 遅れは日で扱う | 「適用済」。着地先に `VC-15`・`BD-2` |
| `PND-606` | ラグの単位（診断） | `未裁定` → `裁定済` |
| `DFC-1798` | ラグの単位の食い違い | `仕様待ち` → `実測待ち`（コードと試験は緑、出荷ビルドはまだ押していない） |
| `DFC-1796` | 案内の手順 5 | 状態は変えない。対応方針に「手順 5 の文は `CR-644` が写した」 |
| `DFC-1815` | ERP の見本（MSPDI）の UID 230 の依存が、ラグを読むと `VC-15` の矛盾になり、`CR-618` の表 S と食い違う（試験 4 件が赤い） | 起こした（`未検討`）。どちらの側も選ばない |
| `DFC-1816`〜`DFC-1819` | 帯 | 使わなかった |
| `perf-pending.md` の 69 | `properties-panel.ts` ほか | 1 行足した |
| `docs/development-records/changelog.md` の 3.47 | 本書 | 1 行足した |

---

## 13. 測り方の再現

```
# tree: 69c558c4.
python <scratchpad>/crb_sample.py          # converted 354 zero 155 per day 480
python -c "<count (lagFormat, lag != 0) per document>"   # 13 lines above: 354 / 155, all lagFormat 7
grep -c '"lag"' "sample-schedule/Three-Year Product Plan.json"   # 509

npm run gen && npm run gen:check           # 0 drift
npm run typecheck                          # 0 errors on both
node tools/gate/gate-queue.mjs run -- node ../../../node_modules/vitest/vitest.mjs run --reporter=json --outputFile=<after.json>

PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py S-118   # and PR-42, AT-48, VC-15, BD-2
```
