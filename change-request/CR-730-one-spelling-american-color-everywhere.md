# CR-730 —— 英語の綴りをアメリカ式にそろえる —— colour を color へ、画面の語から識別子・ファイル名まで（棚卸しと当てる計画）

> 状態: ⭐ **当てた** —— 2026-10-10、凍結（`JDG-1926`）の中で調整役の作業木の体が `5a9ccd80` の上に当てた。範囲は 11 節の問い 1 の案 A（`JDG-1925`）、`unanalysed` → `unreliable`（`JDG-1924`）。台本 `tools/rename/apply_spelling.py` を 1 回（衝突の決めは `docs/review/spelling-decisions-cr730.tsv`）、ほかは生成と 7 節の手作業。番号は `JDG-1924`〜`JDG-1926`・変更履歴 `4.33` を調整役から受けた。
> 起草の状態（当てる前の記録）: **下書き（当てていない）**。2026-10-10、作業木 `b72dab32` の上で棚卸しを測り、当てる計画を書いた。`docs/spec`・`src`・`tests`・`tools` には何も当てていない。台帳は `rulings.md` に `JDG-1921` の行を足し、`JDG-966` の状態を変えただけ（12 節。行が 1 つ増えたので、生成物 `docs/spec/_assets/tbl-row-id-prefixes.md` の数を `row_id_prefixes_json_to_md.py` で刷り直した）。変更履歴と `perf-pending` は当てるときに書く。
> ID の帯: 番号 `CR-730` と `JDG-1921` を調整役から受けた。使ったのはこの 2 つだけ。`b72dab32` の木で `CR-730`・`JDG-1921` を名乗る所は 0 件だった。`DFC`・`PND`・表の行・設定値の番号は使わない。
> 当てる裁定: `JDG-1921`（「Colorの方がいいだろ？ 普通コーディングでどっちを使う？」／「識別子まで全部」）。
> 覆す裁定: `JDG-966` の一部（en の語 theme colour の綴りだけ。語の選びは保つ）。`CR-726` の 11 節の問い 2（推奨 Colour）は `JDG-1921` が答えた —— `CR-726` は当てた変更要求なので書き足さない（検査 62）。
> 測った木: `b72dab32`。数はすべて `docs/review/british-spelling-survey-cr730.py` が刷る（13 節）。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 利用者の裁定の逐語（全文は `docs/development-records/rulings.md` の `JDG-1921`）

| 裁定 | 逐語 | 本書での扱い |
|---|---|---|
| `JDG-1921` | 「Colorの方がいいだろ？ 普通コーディングでどっちを使う？」 | colour の家族（colour・colours・coloured・colouring・colourless・recolour）を color へ |
| `JDG-1921` | 「識別子まで全部」（範囲の 3 択 —— 画面の語と手引き ／ 識別子まで全部 ／ 画面の語だけ —— への答え） | 画面の語・英語の手引き・仕様の英語の名・`src` の識別子と注釈と文字列・試験・道具・ファイル名のすべて（1 節）。⛔ 履歴と他人の名は除く（4 節） |

### 0.2 裁定の鎖（rulings.md を「colour」「Colour」「color」「綴」「British」「American」「イギリス」「アメリカ」「theme colour」「Title Case」「PR-19」で引いた）

| 裁定 | 何を決めたか | 本書との関係 |
|---|---|---|
| `JDG-966` | en の語も theme hue → theme colour（利用者が選んだ択の語が colour と綴っていた） | ⚠️ **綴りだけ覆す**（覆された（一部））。語を theme colour にした選び（hue をやめる）は保ち、綴りが theme color になる |
| `JDG-454` | `IC-17` の hint の語（既に `JDG-966` が一部覆した） | 触らない —— 覆りの印は既にある。綴りは本書が当てる |
| `JDG-863` | 利用者自身が「fill color」「outline color」「project theme color」と書いた | 覆さない。利用者の語は始めから color だった（本書の裁定と同じ向き） |
| `JDG-408` | 語は「枠の色」／「strokeColor」 | 覆さない。既に color |
| `JDG-1850`・`JDG-1857` | 書く者がいちばん使う綴りにすれば誤りが減る。もう一方の綴りは検査 32 が赤にする | 同じ理由と同じ形（表記の表の「止める」の行）を使う（E-08） |
| `JDG-1862` | 画面の名前の en は Title Case | 覆さない。Fill Colour → Fill Color のように、大文字の決まりはそのまま |
| `JDG-1732` | 進捗の文書と `sample-schedule/Three-Year Product Plan.json` は書き直さない | 従う（X-5） |
| `JDG-1663`・`JDG-1733` | 稼働前なので古い形式の読み替えを作らない | 従う。ただし GRS JSON の形式は本書で変わらない（X-3） |
| `JDG-324`・`JDG-326`・`JDG-383`・`JDG-402`・`JDG-405`・`JDG-990` ほか色の裁定 | 色の値・並び・語の選び | 覆さない。これらの逐語は綴りを決めていない（色の語の綴りは提案した体のもの）。鍵 `colourNames`・`colourField` などの綴りは本書が替える |

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

- `GL-006`（マニュアルを読まずに使える）—— 英語の画面の語を、利用者が毎日見る綴り（Windows の Minimize・Maximize、MS Project と CSS の Color）にそろえる。いまは同じプロパティパネルに Color（`PR-19`）と Fill Colour が並ぶ。
- 書き手の側: 1 つの語に 1 つの綴り。木はすでに color を 9,767 か所で書き（生きている木、13 節）、colour は 1,852 か所 —— 同じ値の型が `kind: 'color'` で、その欄の名が `colour`（`src/adapter/screen-renderer/screen-renderer.ts:289`）という混ざり方が、名前を書くたびに引き直しを求めている。

### ② レビュー観点のどの条項を当て、何が出たか

- `R1.3`（唯一の正）—— 綴りは規則 02 の 5 節の表記の表が持ち、検査 32 は表から読む（E-08）。検査のコードに語を書き写さない。
- 規則 03 の 1 節「綴りまで写す」—— 仕様の公開名（`colourOf` など 7 種、2.5）を替えるときは、同じ段でコードの名も替える（8 節の段 1 と段 2 は同じ凍結の中で続けて当てる）。
- 規則 03 の 1 節「仕様が名前を持っている概念に別名を与えない」—— 本書は別名を作らない。名の綴りだけが変わり、指すものは変わらない。

### ③ 利用者に問わずに決めたこと

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| X-1 | 履歴は替えない —— `docs/development-records/`（rulings の逐語・台帳・計測）、`change-request/`、`docs/review/`、`previous-project-result/`（見本のフォルダ名 `23-status-date-line-colour/` などを含む） | `JDG-1857`・`JDG-1863` の注（「ウインドウ」「取込」は履歴なので直さない）と同じ。裁定の逐語が見本のパスを引いている | 履歴に colour が 1,790 か所残る（3.1 の l の行。パス 25 を含む）。検査 32 は履歴を読まないので赤くならない |
| X-2 | 生成物は手で直さない —— `npm run gen` と各生成器、`npm run build` が追う | CR-708 の 7 節と同じ | 無い |
| X-3 | GRS JSON の形式は変わらない —— 鍵 150 と列挙の値 36 にイギリス式は 0。変わるのは `erd.json` の説明の文 2 か所（生成されたスキーマの説明が追う）だけ。`SCHEMA_VERSION` を上げない | CR-708 の 2.3 の「説明の文 —— 変わらない（鍵と型は同じ）」と同じ扱い | 無い。利用者の手元の文書もそのまま開ける |
| X-4 | 他人の名は替えない（4 節の表）—— MCP の `notifications/cancelled`、MITRE、URL のドメイン、MSPDI の名 | `JDG-1921` は GRS 自身の綴りの話。他人の名を替えると通じなくなる | 道具に「除く所の表」が要る（7 節） |
| X-5 | `sample-schedule/Three-Year Product Plan.json` を書き直さない（タスク名の Programme・Stabilise・localisation の 8 か所。どれも colour ではない） | `JDG-1732` | 問い 1 で A なら、起動テンプレート（生成）は Program などになり、見本のファイルと名が食い違う |
| X-6 | dialogue（`Dialogue Field`・`postDialogueMessage` ほか、生きている木に 1,128）は替えない | アメリカ英語でも会話は dialogue と綴る。dialog は窓の箱を指す語で、対話欄は会話の場所である | 無い。問い 1 の数にも入れない |
| X-7 | towards・afterwards・backwards などの -wards は替えない | どちらの綴りもアメリカ英語で使う | 数えていない |
| X-8 | 置き換えは「名の表 ＋ 部分語ごとの綴りの表」を全文に当てる一本の台本で行い、TypeScript の言語サービスで名を探して回る方法（CR-708 の `rename_symbols.mjs`）は使わない | CR-708 が言語サービスを要したのは汎用の `row` を型で読み分けるためだった。綴りには読み分ける語が無い —— どの colour も color になる | 外の名（ライブラリの名）を巻き込む恐れ —— 測ると 4 節の 4 か所だけで、除く所の表が持つ |
| X-9 | `CR-726` の 11 節の問い 2 は閉じた —— `PR-19` の Color はそのまま、ほかの項目名の Colour 7 つ（Fill Colour ×3・Outline Colour ×3・Text Colour）と辞書の説明の colour が color になる | `JDG-1921` | 無い |
| X-10 | 問い 1 で A なら、co-ordinate（`tools/generate_startup_template.py` の注釈の co-ordinating ほか 6 か所。ハイフンで割れるので 3 節の数に入らない）も coordinate にする | 同じ扱い | 無い |

---

## 1. 範囲 —— 行き先

| 何 | 変える所 | 3 節の行 |
|---|---|---|
| 画面の語（en） | `docs/spec/_source/display-words.json` の en の値（ja は 0 件で変わらない） | a |
| 英語の手引きと頼みの文 | `docs/guides/schedule-to-grs-json/prompt-en.md`・`docs/spec/_source/image-to-grs-json-prompt.en.md` | a2 |
| 仕様の英語の名 | 設定の値の鍵 `colour`（`settings.json`・`settings.schema.json`）、公開名（`published-entries.json`）、状態と出来事の名（`state-machines.json`、問い 1 で A のとき）、辞書の節の鍵（`colourNames`・`colourField`）、行 ID の接頭辞の語（`row-id-prefixes.json` の Colour Fit・Colour Value・Theme Colour (Hue)） | b |
| 仕様の文 | `01-04`・`05-07` の英語の語、`components.json`・`erd.json` の説明、図（`view-*.drawio` と書き出した `.svg`）、`strictdoc-theme.css` の注釈 | b |
| `src` | 識別子・注釈・文字列・DOM の名（`data-colour-*`。`src` に 7 種、試験だけに 2 種）・ファイル名（`stored-colour.ts`。A なら `licence.json` も） | e・f・i |
| 試験 | 識別子・文字列・注釈・ファイル名（colour 16 本。A なら 25 本） | g・i |
| 道具と検査 | `tools/`（生成器 —— 設定の鍵 `colour` を読む所を含む）、`.claude/skills/spec-graph-check/`（検査と基準値の名）、規則 02・03・04・09、`package.json` の台本名（A なら `licence` → `license`） | h |
| 表記の表と検査 32 | 規則 02 の 5 節に行を足し、検査 32 を広げる | E-08・E-09 |

数: 要求 ±0。表 ±0。表の行 ±0。辞書の項 ±0（値と節の鍵の綴りだけが替わる）。設定値 ±0（鍵の綴りだけ）。`（MUST）` ±0。

---

## 2. 名前の対応表

### 2.1 綴りの対応（部分語ごと、大文字小文字を保つ）

名は camelCase・snake_case・kebab-case の継ぎ目で部分語に割り、部分語ごとに下の表を当てる（`colourOf` → `colorOf`、`MARK_COLOUR_ROWS` → `MARK_COLOR_ROWS`、`data-colour-choice` → `data-color-choice`、`Fill Colour` → `Fill Color`）。

| 家族 | イギリス式 → アメリカ式 | 範囲 |
|---|---|---|
| colour | colour(s / ed / ing / less)・recolour → color(s / ed / ing / less)・recolor | `JDG-1921` で決まり |
| centre | centre(s / d)・centring → center(s / ed)・centering | 問い 1 |
| grey | grey(s / ed / ing) → gray(s / ed / ing) | 問い 1 |
| behaviour | behaviour(al) → behavior(al) | 問い 1 |
| -our | neighbour・honour・flavour・favour → neighbor・honor・flavor・favor | 問い 1 |
| -ise | minimise・maximise・normalise・summarise・recognise・organise・serialise・initialise・stabilise・emphasise・rasterise ほか（-isation ・-iser を含む）→ -ize（-ization・-izer） | 問い 1 |
| -yse | analyse(d)・unanalysed → analyze(d)・unanalyzed | 問い 1 |
| -lled | cancelled・cancelling・labelled・unlabelled・travelled・travelling → canceled・canceling・labeled・unlabeled・traveled・traveling | 問い 1 |
| -re | mitred → mitered | 問い 1 |
| licence | licence → license | 問い 1 |
| その他 | judgement・programme・spelt・burnt・learnt・co-ordinate → judgment・program・spelled・burned・learned・coordinate | 問い 1 |

### 2.2 画面の語（`display-words.json` の en。ja は変わらない）

| 項 | 今 | 後 |
|---|---|---|
| プロパティパネルの項目名（7） | Fill Colour ×3・Outline Colour ×3・Text Colour | Fill Color・Outline Color・Text Color（`PR-19` の Color と同じ綴りになる） |
| 設定の項目名（`K-60`） | theme colour | theme color |
| ボタンの説明（2） | Draw in monochrome; press again to go back to colour ／ …where the theme colour is chosen… | …go back to color ／ …the theme color… |
| 色の欄（`colourField` の 4） | Custom colour ・Follow the project theme colour ・Follow the default colour ・Custom colour (now {value}) | Custom color ほか |
| 理由と次の一手（2）・割当の説明（1） | Give one of them a colour ×2・…edits its frame colour | …a color・…frame color |
| 問い 1 で A のとき（8） | Minimise ×2・Maximise（名前）・Minimise the Command Palette… ・Minimise the window… ・Maximise the window（説明）・Not analysed {count}・Zoom both axes, centred on the pointer | Minimize・Maximize・Not analyzed・centered |

辞書の節の鍵 `colourNames`・`colourField` と部品の鍵 `defaultColour`（A なら `unanalysed`）は名なので 2.5 に従う。

### 2.3 `GRS JSON` —— 形式は変わらない

| 測ったもの | 数 | イギリス式 |
|---|---|---|
| `grs-document.schema.json` の鍵（`properties` の名） | 150 | 0 |
| 列挙と定数の値（`enum`・`const`） | 36 | 0 |
| 列の型の名（`erd.json` の `kind`） | — | 既に `color` |
| 説明の文（`erd.json` の en → 生成したスキーマの `description`） | — | 2（colour・colours） |

⇒ 形式の版（`tools/generate_startup_template.py` の `SCHEMA_VERSION`）を上げない。変更の台帳 `grs-json-changes.json` にも足さない（`S-541` が `null` のあいだ空、検査 76）。手引きの `grs-skeleton.json` も変わらない。

### 2.4 エージェント API・MCP で公開している名

| 何 | 数 | イギリス式 | 扱い |
|---|---|---|---|
| MCP の道具の名と説明（`mcp-tool-descriptions.json`） | 22 | 0 | 変わらない |
| 表 T-107 の `AM-*`・`CM-*` の名 | 103 | 0 | 変わらない（`CM-30` は既に `setTaskGroupColor`） |
| `readDelayDiagnostics`（`AM-19`）が返す欄 | 1 | `unanalysedCount`（`src/entity/document-model/schedule/delay-diagnostics.ts:90`） | 問い 1 で A のときだけ `unanalyzedCount` へ。互換でない変更なので `agentApiVersion` を 2 → 3（表 T-035 の `AG-1`）、`.mcpb` を作り直す |
| 拒否の文（`what` の散文） | 4 | 「not a palette name or a custom colour」ほか | 文だけが替わる。形は変わらないので版を上げない |
| MCP の約束の名 `notifications/cancelled` | 1 | cancelled | ⛔ 変えない（4 節） |

⇒ colour だけなら `agentApiVersion` も `.mcpb` も変わらない。

### 2.5 識別子（仕様の名・コード）

| 置き場 | colour の名（異なり） | ほかのイギリス式の名（異なり） | 例 |
|---|---|---|---|
| 仕様の名 | 10 | 11 | `colourOf`・`isStoredColour`・`customColourOf`・`customColourChosen`・`isScheduleColourRow`・`markColourVariableOf`・`MARK_COLOUR_ROWS`・設定の鍵 `colour`・`colourNames`・`colourField` ／ 状態機械の名 9（`minimised`・`maximised`・`paletteMinimiseToggled` ほか）・`labelledAssigneeUidOf`・`isImportCancelled` |
| `src` | 44 | 51 | `ColourField`・`ColourLook`・`COLOUR_NAME_WORDS`・`colourWord`・`settledColour` ／ `centreX`・`isMinimised`・`labelledAssigneeOf`・`serialisedDocument`・`ParameterisedMember` |
| 試験 | 39 | 66 | （試験だけが持つ補助の名） |
| 道具と検査 | 3 | 7 | `COLOUR_TARGETS`・`ColourForm`（基準値）／ `LICENCE`・`honour_links` |

規則: 部分語ごとに 2.1 を当てる。新しい語を作らない（`colourOf` は `colorOf` であって `paintOf` ではない）。

### 2.6 ファイル名・DOM の名

| 何 | colour | 問い 1 で A のとき足すもの |
|---|---|---|
| `src` | `src/entity/document-model/schedule/stored-colour.ts` → `stored-color.ts`（`UF-130` の行 `05-07-design.md:393` も） | `src/adapter/screen-renderer/licence.json` → `license.json`、`tools/generate_licence.py` → `generate_license.py`（`package.json` の台本 `licence`・`licence:check`、`check.sh:544`、規則 09 の 27 の行） |
| 試験のファイル | 16（`cr-551-…-colour-field…`・`cr-584-…-ground-colour`・`w3-t1-theme-colours-…` ほか） | 9（grey 2・minimise ほか 5・centre 1・judgement 1） |
| DOM の属性 | `data-colour-choice`・`-chosen`・`-custom`・`-custom-entry`・`-palette`・`-theme-entry`・`-transparent-slot`（`src`）と、試験だけが引く `-sides`・`-swatch` | — |

---

## 3. 数（`b72dab32`）

### 3.1 区分 × 家族（出現の数。部分語で数えた。13 節の台本の 3.1）

| 区分 | colour | ほかのイギリス式 | 計 | 扱い |
|---|---|---|---|---|
| (a) 画面の語（辞書の en の値） | 18 | 9 | 27 | 変える（ja は 0） |
| (a2) 英語の手引き・画像の頼みの文 | 73 | 8 | 81 | 変える |
| (b) 仕様の英語の名 | 168 | 63 | 231 | 変える（設定の鍵 `colour` 150 を含む） |
| (b) 仕様の文（図・説明・注釈） | 58 | 25 | 83 | 変える |
| (c) `GRS JSON` の鍵と値 | 0 | 0 | 0 | 形式は変わらない（2.3） |
| (d) エージェント API・MCP の名 | 0 | (1) | (1) | `unanalysedCount`（2.4）—— (e) の内数なので計に足さない。拒否の文は (f) に数えた |
| (e) `src` の識別子 | 310 | 303 | 613 | 変える（45 ファイル） |
| (f) `src` の注釈・文字列 | 47 | 115 | 162 | 変える（DOM の名を含む） |
| (g) 試験 | 1,016 | 1,536 | 2,552 | 変える（246 ファイル。符号で綴った語は 0） |
| (h) 道具・検査・規則・根の設定 | 145 | 265 | 410 | 変える（69 ファイル） |
| (i) ファイル名（生きている木） | 17 | 11 | 28 | 動かす |
| (j) MSPDI の名 | 0 | 0 | 0 | ⛔ 変えない（XSD の名は始めから color・center） |
| (k) 他人の名 | 0 | 4 | 4 | ⛔ 変えない（4 節） |
| (l) 履歴 | 1,790 | 1,473 | 3,263 | ⛔ 変えない（X-1） |
| (x) `sample-schedule/Three-Year Product Plan.json` | 0 | 8 | 8 | ⛔ 変えない（X-5） |
| 生成物（`dist` 219・`docs` 156・`src` 81） | 173 | 283 | 456 | 生成器と build が追う（X-2） |
| 全部 | 3,815 | 4,103 | 7,918 | |

- 生きている木（a〜i）で替える数: **colour 1,852、ほかのイギリス式 2,335**（家族ごと: centre 795・-ise 842（minimise の類 438、maximise の類 187）・licence 85・-lled 162・-our 109・grey 83・behaviour 50・-yse 25・その他 183・-re 1）。ほかに co-ordinate 6（X-10）。
- dialogue（X-6）は数えたが替えない: 生きている木 1,128。

### 3.2 置き場ごとのファイル数（生きている木）

| 置き場（手書きのファイル。生成物を除く） | colour だけ | 全部（問い 1 で A） |
|---|---|---|
| `src/` | 20 | 59 |
| `tests/` | 105 | 246 |
| `tools/` | 10 | 21 |
| `.claude/` | 9 | 41 |
| `docs/spec/` | 16 | 20 |
| `docs/guides/` | 1 | 1 |
| `docs/development-rules/` | 2 | 4 |
| 根の設定（`package.json`・`vite.config.ts`・`vitest.config.ts`） | 0 | 3 |
| 計 | 163 | 395 |

### 3.3 基準値と台帳の行

| ファイル | colour | ほか | 扱い |
|---|---|---|---|
| `literal-restatement-baseline.txt` | 6 行（`ColourForm`・`COLOUR`） | — | 名だけ替える（調整役、`JDG-520`） |
| `comment-rules-tests-baseline.txt` | 2 行 | 1 行（minimise） | 同じ |
| `function-size-baseline.txt` | — | 1 行（normalisation） | 同じ |
| `must-clause-coverage-baseline.txt` | — | 8 行（organise ほか。注釈） | 同じ |
| `ruling-landed-baseline.txt` | — | 1 行（centre） | 同じ |
| `tests/known-red.txt` | 1 行 | — | 同じ |
| `docs/development-records/perf-pending.md` | 名を引く行（`colourOf`・`COLOURS` ほか） | `emphasisedWidthOf` | 履歴として残す。検査 66 が読む「パス」に替える名は無い（`stored-colour.ts` を引く行は 0） |

---

## 4. ⛔ 変えない語（例つき）

| 何 | 例 | 数 | 理由 |
|---|---|---|---|
| MCP の約束の名 | `src/framework/mcp-relay-server/mcp-relay-server.ts:70` の `'notifications/cancelled'`、`tests/contract/cr-613-seam-3-mcp-relay-server.contract.test.ts:722` | 2 | Model Context Protocol が決めた名。替えると取消しの知らせが届かない。⚠️ 同じ行の定数名 `CANCELLED` は GRS の名なので替える（A のとき） |
| 団体名・URL | `software-quality-standards-ja.md:235` の MITRE、`usability-principles-ja.md:400` の `centercentre.com` | 2 | 他人の名 |
| MSPDI の名 | XSD（`docs/reference/mspdi/`、gitignored）の名 | 0 | MS Project の名は始めから color・center。規則は「MSPDI の名を変えない」のまま |
| `LICENSE`・`NOTICE`・`package-lock.json` | Apache の本文 | 0 | 始めから License。他人の文 |
| 履歴 | rulings の逐語、台帳、`change-request/`、`docs/review/`、`previous-project-result/` | 3,263 | X-1 |
| 利用者の手元と見本の文書 | `sample-schedule/Three-Year Product Plan.json` | 8 | X-5 |
| アメリカ英語でも正しい綴り | dialogue・towards | 1,128 ほか | X-6・X-7 |

---

## 5. 継ぎ目（コード）

- 設定の値の鍵 `colour`（表 T-236 の行の `{ "colour": "#ffffff" }`、`settings.json` に 150）は、`docs/spec/_source/settings_json_to_md.py:103,110` と `tools/generate_entity_types.py:2062,2122-2123` と `settings.schema.json`（`required` と `properties`）が読む。⛔ 4 つを同じコミットで替える —— どれか 1 つが古いと `npm run gen` が値を落とす。
- 公開名（`published-entries.json` の colour の 7 種、A なら `labelledAssigneeUidOf` も）とコードの名は同じ段の続きで替える（「綴りまで写す」）。検査の `check-published-members.py` が両方を突き合わせる。
- 状態機械の名（A のとき `minimised`・`maximised`・`*MinimiseToggled` ほか 9）は `state-machines.json` が持ち、生成器が `src` の型を刷る —— 原稿と生成と手書きのコードを同じ段で。
- `display-words.json` の節の鍵 `colourNames`・`colourField` は `tools/generate_display_words.py`（`colourField`・`colourNames`・`defaultColour` の字面）と `src/adapter/screen-renderer/properties-panel.ts` が読む。
- 新しい命令・新しい表・新しい辞書の項は無い。振る舞いは変えない。

---

## 6. グラフ

綴りは行 ID を 1 つも変えない —— 誘導部分グラフは当てる前後で同じ。動くのは、行と辞書の項の対の指紋（検査 37）だけ: 名前と説明の en が替わる項（colour 17、A なら +8）の組を、語を並べて読んでから付け直す（`CR-726` の 6 節と同じ）。

---

## 7. 機械の手順（台本で置き換える。⛔ 見ないままの全体置換をしない）

⭐ 段 0（凍結の前に作れる）—— 1 つの体（判断があるので Opus）:

1. **綴りの表** `docs/review/spelling-map-cr730.tsv`: 1 行 ＝ 1 つの異なる名か語（`old`・`new`・`kind`（identifier / dom / json-key / path / prose）・`files`・`count`・`collision`）。13 節の台本の `american()` が `new` を埋める。⛔ 調整役か判断の体が全行を読んでから使う（colour だけで約 100、A なら約 230 の名）。
2. **除く所の表** `docs/review/spelling-keep-cr730.tsv`: 4 節の行を `path`・`line`・`text`・理由で持つ。履歴とサンプルはパスの頭で除く。
3. **適用の台本** `tools/rename/apply_spelling.py`（新しく書く）: `tools/rename/rename_common.py` の `git_files`・`is_live`・`read_text`・`write_text`（CRLF を多数派に保ち、前後の CRLF の数を比べる）・`is_generated` をそのまま使う。部分語ごとに 2.1 を当て、除く所の表の行は飛ばし、`git mv` でファイルを動かす。表に `collision` の未決が 1 つでもあれば何も書かずに止まる。`--dry-run` は木のコピー（一時の場所）で回す。
4. **使わないもの**: `tools/rename/rename_symbols.mjs`（言語サービスでの改名）と `apply_rename.py`（読み票）—— X-8。`tools/rename/lex_spans.mjs` は 13 節の数え直しにだけ使う。
5. **衝突の読み**（7.3）: 下の 25 か所を 1 つずつ読み、`collision` 列に「そのまま」か「書き換え（文を渡す）」を書く。
6. **残りの数え直し**: 各段の後に 13 節の台本を回し、(a)〜(i) の colour（A なら全部の家族）が 0、(k)・(l)・(x) の数が変わらないことを確かめる。

### 7.1 名に空白を含むもの（識別子だけを追う道具が見落とす所）

言語サービスや識別子の表は、空白を含む名を見ない —— 画面の語の「Fill Colour」、行 ID の接頭辞の語「Colour Fit」「Theme Colour (Hue)」、試験の題（`it('…frame colour…')`）、`data-role` の値。⇒ 本書の台本は識別子だけでなく全文の部分語に当てる（X-8）。⚠️ 逆の向きの罠: 語を部品から組み立てる試験（`'Fill ' + word`、符号の列）は表で探せない —— `b72dab32` で 0 件（13 節の 5）。固定データの語を正規表現で探す試験（`tests/contract/cr-429-the-two-schemas.test.ts:115` が `tests/unit/cr-429-mspdi-schema.ts` の「Bridge programme」を引く）は、2 つのファイルが同じ回で替わるので合う（A のとき）。

### 7.2 大文字と小文字

部分語ごとに形を保つ: colour → color、Colour → Color、COLOUR → COLOR。`ColourField` も `COLOUR_NAME_WORDS` も `data-colour-choice` も同じ規則で済む。⚠️ 検査 32 は大文字と小文字を区別して探す（`style-checks.py` の `misspelt_at`）—— E-09。

### 7.3 衝突（イギリス式の名のアメリカ式が、同じファイルに既にある）

`b72dab32` で 25 か所（13 節の 6）。替えた後の名が別のものと同じになるので、宣言が重なれば `tsc` が赤にするが、入れ子の範囲で外の名を隠すと赤にならずに意味が変わる —— ⛔ 1 つずつ読む。

| ファイル | 名 → 既にある名 | 読みどころ |
|---|---|---|
| `src/adapter/screen-renderer/screen-renderer.ts`・`properties-panel.ts`・`src/framework/dom-screen-surface/properties-panel-drawing.ts` | `colour` → `color` | `PropertyControl` の欄 `colour?: ColourField` と、同じ型の値 `kind: 'color'`・列の名 `color`。欄の名が `color` になっても型の中で重ならないか |
| `src/adapter/svg-renderer/svg-renderer.ts`・`src/framework/dom-screen-surface/dom-screen-surface.ts` | `colour` → `color` | 引数・局所の `colour` と、列 `color` を読む所 |
| `tests/contract/cr-586-the-task-group-colour-list-is-one-and-black-is-refused.test.ts` | `setTaskGroupColour` → `setTaskGroupColor` | 試験の局所の補助が、命令の種類の名（文字列 `'setTaskGroupColor'`）と同じ綴りになる。import していないので重ならないが、読み手が命令そのものと読み違える —— 補助の名を `setTaskGroupColorThrough` などに替える案を読む体が決める |
| `tools/generate_licence.py`（A のとき） | `LICENCE` → `LICENSE` | 変数が指すファイル `LICENSE` と同じ字になる。`LICENSE_PATH` にする案 |
| `tests/contract/dfc-407-417-418-the-three-fixes-of-2026-09-09.test.ts`（A のとき） | `spelt` → `spelled` | 同じファイルに `spelled` が既にある |
| `docs/spec/_source/build.py`（A のとき）・`docs/spec/_source/erd_json_to_schema.py`・`tools/generate_entity_types.py` | `centre` → `center`・`colour` → `color` | 生成器の局所の名と出力の字面（`'color'` の型名） |
| ほかの試験 13 本（`display-words.contract.test.ts`・`measured-sweep.test.ts`・`user-reported-fixes.test.ts` ほか） | `colour` → `color` | 局所の `colour` と、列 `color` を引く所 |

木全体で見ると、ほかに `Colour` → `Color`（辞書に `PR-19` の Color が既にある —— 狙いどおり）、`grey` → `gray`（辞書の色の名 Dark gray・Light gray —— 狙いどおり）、`rasteriser` → `rasterizer`（仕様の部品名 `Rasterizer` と同じになる —— 狙いどおり）、`minimised` → `minimized`（試験の題 1 つが既に minimized）。

---

## 8. 段・凍結・確かめ・見積もり

⭐ 1 本の作業ブランチ（例 `spelling/american`）で当て、段ごとにコミットする。段と段のあいだの赤は許し、数を記録する。`main` へは全部が緑で 1 度だけ早送りする。

⛔ **束ねない**: CR-708 の `JDG-1735` に倣い、凍結の間はほかの CR を当てない。始める時機は調整役が決める（CR-708 の `JDG-1726` に倣い、利用者に一言伝えてから）。

⛔ **書き込みの凍結**: 段 1 の始めから `main` への早送りまで、ほかの席は `docs/spec`・`src`・`tests`・`tools`・`.claude/skills` を書かない。台帳への書き込みは続けてよいが、新しい行は color で書く。

| 段 | 持ち場（ファイルの持ち主） | 何をする | 終わりに確かめること | 見込み（実時間） |
|---|---|---|---|---|
| 0（凍結の前） | 1 つの体 | 7 節の 1〜3 と 5。表を一時の木のコピーに当てて `tsc`・`npm run gen:check` を回し、赤の数を記録する | 道具が未決の衝突で止まること。コピーの上の赤が 7.3 の読みで説明できること | colour だけ 2.5〜3 h、A 3〜4 h |
| 1 仕様と生成器 | L1: `docs/spec`・`docs/guides`・規則 02・03・04・09・`tools/generate_*.py`・`docs/spec/_source/*.py` | 台本を当て、`npm run gen`、図を書き出し直す（`npm run milestones` と `tools/probe/grab-figures.mjs`（錠の下）—— 図の頭の注釈 behaviour は A のとき）、検査 37 の指紋を付け直す | `npm run gen:check` 0、`strictdoc export docs/spec` の後 `rm -rf output`、検査 32 の新しい行で 0 | 0.5〜0.75 h |
| 2 `src` | L2: `src/entity`・`src/use-case` ／ L3: `src/adapter`・`src/framework` | 同じ台本の `src` の分（1 回の実行の中）、`git mv`（`stored-colour.ts`、A なら `licence.json`）、A なら `agentApiVersion` 2 → 3 と `.mcpb` の作り直し | `npm run typecheck` 0、`npm run build` 0 | 0.25〜0.5 h |
| 3 試験と道具 | L4: `tests`（unit ／ contract ／ system で分けてよい）／ L5: `.claude/skills`・`tools`（生成器を除く）・根の設定 | 同じ台本の残り、試験のファイルを動かす、`npm run gen:tests`、基準値の名（調整役、3.3） | `vitest` の全体（錠の下、既知の赤だけ）、`playwright`（錠の下）、check.sh 0、`privacy_count.py` | 0.75〜1.25 h |
| 締め | 調整役 | `dist/index.html` を作り直し、表記の表の行を「止める」にし（E-08）、台帳（`JDG-1921` を 適用済、変更履歴、検査 66 が求めれば `perf-pending` の行）、利用者に確かめてもらう一覧 | 英語の画面で Fill Color・Outline Color・（A なら）Minimize・Maximize が出る | 0.25〜0.5 h |

- **計**: 凍結は段 1〜締めで、colour だけ **約 1.5〜2.5 h**、A **約 1.75〜3 h**。段 0 を入れた実時間は colour だけ 4〜5.5 h、A 5〜7 h。体の時間の和は colour だけ 5〜6 h、A 6〜8 h。
- **見込みの拠り所**: CR-708 の実測 —— 読み票の合流の後の突き合わせ（`7af10ca2` 20:04）から `dist` の作り直し（`e52e21fb` 21:41）まで約 1.6 h。CR-708 の 8 節の見込み（凍結 19〜23 h）は読み票の時間を含んでいた。本書には 1 か所ずつの読み票が無い（2.1 の表がすべての所を決める）ので、凍結は「当てる ＋ 確かめる」だけになる。⚠️ 時間は測ったものではなく、この実測と 3 節の数から置いたもの。
- **A と colour だけの違い**: 道具と段は同じ。違いは試験の数（1,016 → 2,552）、ファイルの移動（17 → 28）、`agentApiVersion` と `.mcpb`、状態機械の名、表記の表の行の数。

### E-08 —— 表記の表（規則 02 の 5 節）に足す行

| 書く | 書かない | 裁定 | 検査 32 | 注 |
|---|---|---|---|---|
| color | colour | `JDG-1921`（`CR-730`） | 止める | アメリカ式。Colour・COLOUR も止める（E-09）。⛔ 利用者の逐語と、台帳・変更要求・レビューの記録・`previous-project-result/` の中の colour は履歴であり、直さない。⛔ MSPDI と他人の名は範囲の外 |
| 新しく書く英語はアメリカ式 | イギリス式の綴り | `JDG-1921` | 止めない（A のときは下の行で止める） | 綴りの集まりが閉じていないので、機械は家族ごとの行で止める |

問い 1 で A のとき、家族ごとに「止める」の行を足す: center ｜ centre、gray ｜ grey、behavior ｜ behaviour、neighbor ｜ neighbour、honor ｜ honour、flavor ｜ flavour、minimize ｜ minimise、maximize ｜ maximise、normalize ｜ normalise、summarize ｜ summarise、recognize ｜ recognise、organize ｜ organise、serialize ｜ serialise、analyze ｜ analyse、canceled ｜ cancelled、labeled ｜ labelled、traveled ｜ travelled、license ｜ licence、judgment ｜ judgement、spelled ｜ spelt。⚠️ program ｜ programme は「programmer」「programmed」の中の programme も赤にするので、検査 32 の範囲（仕様・辞書・手引き）で 0 になることを当てた後に測ってから止める（規則 02 の 5 節「行を止めるにするのは 0 件にしてから」）。

### E-09 —— 検査 32 を広げる（提案）

`style-checks.py` の綴りの行の読み方に 1 つ足す: 「書かない」が ASCII だけの行は、大文字と小文字を区別せずに探す（colour の行 1 つで Colour・COLOUR も止まる）。`--self-test` に、Colour・COLOUR が赤になる例と、color・Color が赤にならない例を足す。⚠️ 検査 32 の範囲は仕様・辞書・手引きだけのまま。

### E-10 —— コードと試験の綴りの検査（提案。作らない）

検査 32 は `src`・`tests`・`tools` を読まない。当てた後に colour が識別子へ戻るのを止めるなら、新しい検査（番号は調整役が配る。仮に 77）: 表記の表の「止める」の行のうち ASCII の行を読み、生きている `src`・`tests`・`tools`・`.claude`・根の設定を部分語で探し、除く所の表（4 節の行。数の上限つき —— 検査 23 の免除の形）にあるものだけを許す。見込み 1.5〜2 h（体 1 つ）。⚠️ 作るかは調整役が決める。

---

## 9. 仕様の外で直すもの

- `tools/`・`.claude/skills/spec-graph-check/*.py`・`check.sh` の名指し（A なら `generate_licence.py` の名と `check.sh:544`）、規則 09 の 27 の行。
- 基準値の名（3.3）—— 名だけを替え、数は変えない（調整役、`JDG-520`）。
- `.claude/skills/spec-graph-check/dictionary-table-pairing.txt`（検査 37 の指紋、6 節）。
- `docs/guides/schedule-to-grs-json/prompt-en.md` —— 原稿 `image-to-grs-json-prompt.en.md` を手で写した文（`DFC-1796`）なので、同じ回に同じ表で替える。
- `tests/known-red.txt` の 1 行。
- A のとき: 起動テンプレートの生成器（`tools/generate_startup_template.py` の Product Development Programme・Programme Manager A・Stabilise・localisation）—— テンプレートは生成で追い、`sample-schedule/Three-Year Product Plan.json` は替えない（X-5）。
- 毎フレームの経路（`svg-renderer.ts` の `colourOf` ほか）は名だけが変わり、仕事は変わらない。検査 66 が行を求めたら、調整役が `perf-pending` の番号を配る。

---

## 10. ⛔ この変更でやらないこと ・ 触れ合うもの

- 振る舞い・値・表の行・行 ID・規範の文を 1 つも変えない。
- 古い綴りの読み替えを作らない（読み替えの要る保存の名が 0 —— 2.3）。
- MSPDI と他人の名、履歴、見本の文書を変えない（4 節）。
- 下書きの変更要求（`CR-723`・`CR-727`・`CR-728`・`CR-433`）に colour を含むものは 0 —— 当てるときに新しい綴りで書くだけでよい。
- ⛔ ほかのどの変更とも束ねない（8 節）。

---

## 11. 利用者に問うこと

**用語の説明**: 「画面の語」＝ 英語に切り替えた画面に出る文字。「手引き」＝ 利用者が読む英語の説明書きと、AI に渡す頼みの文。「プログラムの中の名前」＝ 利用者には見えない、コードの部品の名前とファイル名。「試験」＝ 自動で動かす確かめのコード。

**問い 1 —— 色（colour → color）のほかのイギリス式の綴りも、アメリカ式にそろえますか？**
**Q1 —— Should the other British spellings also become American, like colour → color?**

使う場面: 英語の画面で、窓の最小化・最大化のボタンが Minimise ／ Maximise、遅延診断のまとめが Not analysed、ズームの説明が centred。プログラムの中の名前は centre・minimised・cancelled・labelled・licence など（色の綴りの指示で color にそろえた後も、これらは残る）。

| 家族（イギリス式 → アメリカ式） | 画面の語 | 手引き | 仕様の名と文 | プログラム | 試験 | 道具 |
|---|---|---|---|---|---|---|
| Minimise / Maximise → Minimize / Maximize ほか -ise → -ize | 6 | 0 | 62 | 165 | 525 | 79 |
| centre → center | 1 | 2 | 6 | 135 | 586 | 64 |
| cancelled・labelled → canceled・labeled ほか | 0 | 1 | 15 | 69 | 74 | 3 |
| licence → license | 0 | 0 | 1 | 11 | 39 | 32 |
| grey → gray | 0 | 5 | 0 | 16 | 60 | 0 |
| analysed → analyzed | 2 | 0 | 0 | 5 | 17 | 1 |
| behaviour・neighbour・honour → behavior・neighbor・honor ほか | 0 | 0 | 2 | 11 | 112 | 34 |
| judgement・programme・spelt・burnt → judgment・program・spelled・burned ほか | 0 | 0 | 2 | 6 | 123 | 52 |
| 計（2,335 か所、ファイル名 11 を含む） | 9 | 8 | 88 | 418 | 1,536 | 265 |

| | A（推奨）すべてアメリカ式 | B 画面の語と手引きだけ | C 色だけ（今の指示のまま） |
|---|---|---|---|
| 英語の画面 | Minimize・Maximize・Not analyzed・centered | A と同じ | Minimise・Maximise のまま（Color の隣に残る） |
| プログラムの中の名前 | すべてアメリカ式 | イギリス式のまま —— ボタンは Minimize、それを動かす名前は minimise（1 つの物に 2 つの綴り） | イギリス式のまま |
| 外へ見せる名前 | 遅延診断の答えの欄 1 つ（unanalysedCount）が変わる —— AI の窓口の版を 2 → 3 に上げる | 変わらない | 変わらない |
| 手間（凍結の時間） | 約 1.75〜3 時間（色だけより 15〜30 分長い。同じ道具で一度に当てる） | 約 1.5〜2.5 時間 ＋ 画面の語だけを選ぶ手間 | 約 1.5〜2.5 時間 |
| 後で戻る心配 | 検査が家族ごとに止める | 画面と手引きだけを検査が止める | 色だけを検査が止める |

推奨: **A**。理由は色の指示と同じ —— 普通のコーディングはアメリカ式で書き、Windows のボタンも Minimize・Maximize と書く。木は既にアメリカ式とイギリス式が混ざっている（minimized・initialize・Rasterizer は既にアメリカ式）。B は 1 つの物を 2 つの綴りで呼ぶので、次の書き手がまた迷う。⚠️ 変えないもの（どの案でも）: 他人の名（MCP の notifications/cancelled など）、記録（裁定の言葉・台帳・過去の変更要求）、見本の文書、dialogue（アメリカ英語でも会話は dialogue）。

---

## 12. 台帳

| 行 | 何 | 本書での扱い |
|---|---|---|
| `JDG-1921` | 利用者の裁定（逐語 2 つ） | 足した。状態は「指示 —— CR-730 が当てる」 |
| `JDG-966` | en の語 theme colour | 状態を「覆された（一部。`JDG-1921`）」にした —— 綴りだけ。旧の状態は残した |
| 変更履歴・`perf-pending` | — | 触らない（当てるときに調整役が番号を配る） |

---

## 13. 測り方の再現

```
# the tree: worktree at b72dab32, clean (the script reads `git ls-files`)
# <out> lies OUTSIDE the worktree (OneDrive syncs it, DFC-2312)
PYTHONIOENCODING=utf-8 python docs/review/british-spelling-survey-cr730.py <out>
#   1  class x family table            -> 3.1 (columns summed per row: colour / the rest)
#   2  live totals per family           -> 3.1 under the table
#   3  distinct names and files         -> 2.5, 3.1
#   4  GRS JSON keys and enum values, MCP tools, T-107 AM/CM names -> 2.3, 2.4
#   5  code-point and split-literal spellings -> 7.1 (0)
#   6  same-file collisions             -> 7.3 (25)
# <out>/hits.tsv holds one row per occurrence (path, line, word, sub-word, family, class, kind):
#   files per folder (3.2):    rows whose class is a..i, family != note:dialogue, distinct path per top folder
#   question 1 table (11):     the same rows, family != colour, grouped by family and class
#   baseline lines (3.3):      rows whose path ends in -baseline.txt or is tests/known-red.txt
```

- 語は部分語で数えた（camelCase・snake_case・kebab-case で割り、小文字にして家族の正規表現に全一致）—— `groupDepthLimitReached` を mitre と読まない。JS と TS の注釈・文字列・コードの別は `tools/rename/lex_spans.mjs`（babel）、Python は `tokenize`、JSON は鍵か値か、Markdown は `` ` `` の内か外か。
- 生成物の見分けは `tools/rename/rename_common.is_generated` の印に「Generated from」「generated by」を足したもの、`dist/`、`src/` の JSON のすべて。`.ts` はファイルごと生成されることが無い（生成器は手書きのファイルの中の区画に刷る）ので、手書きに数えた。
- アメリカ式の数（① の 9,767）: 同じ割り方で、生きている木（履歴と `dist` を除く）の color の家族を数えた（`src` 2,831・`tests` 2,689・`docs/spec` 2,047・ほか 2,200）。
- MSPDI の名（(j)）: 根の作業木の gitignored の `docs/reference/mspdi/pj12`・`pj15` を同じ語で引き、イギリス式の名 0（color 224・center 4）。`learn-docs` の LICENSE の本文の licence・programme は他人の文。
- ⚠️ 本書と台本が着地すると、`change-request/` と `docs/review/` の自分の分だけ (l) の数が増える。生きている木の数は変わらない。
