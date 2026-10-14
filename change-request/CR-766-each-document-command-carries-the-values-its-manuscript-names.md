# CR-766 —— 文書を書き換える 88 の命令（表 T-108）が運ぶ値を 1 つの原稿が持ち、命令の型と AI の `applyCommands` の入力はそこから刷る

> 起草の状態: 起草だけ（2026-10-15、`4a907919` の上で起草した）。当てていない —— `docs/spec`・`src`・`tests`・生成器に触れていない。11 節に利用者へ問う 1 つ（Q1 —— 欄の名を列の名にそろえるか）を残した。利用者は眠っており、問うていない。Q1 の答えが無くても、推奨の択 A なら当てられる（8 節）。
> ID の帯: 番号 `CR-765`〜`CR-768`、裁定 `JDG-2220`〜`JDG-2229`、台帳 `DFC-2720`〜`DFC-2729`、`PND-948`〜`PND-951`、見本の置き場 `57` を調整役から受けた（4 つの変更要求で共有）。本書が使うのは `CR-766` だけ。`4a907919` の木で `CR-766` を名乗るものは 0 件だった（13 節）。
> 当てるもの: 裁定 `JDG-2162`（表 T-108 を `_source` の JSON の原稿にし、命令ごとに運ぶ値（欄の名・型・意味。文書の列を書く値は列を指す）を書き起こし、表 T-108・`DocumentCommand` の型・AI の `applyCommands` の `request` の形をそこから生成する）。閉じるもの: 台帳 `DFC-2642`。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 行は仮説 —— 反証した結果（`4a907919`）

| 主張 | 見たもの | 本書での扱い |
|---|---|---|
| 命令は 88 | 表 T-108 は 88 行（`CM-1`〜`CM-98`、欠番 10 —— `CM-25`・`33`・`34`・`57`・`59`・`60`・`61`・`63`・`70`・`75`）。`src` の和は 87 の種類（8 つの集約の和、`edit-document.ts` の 132 行）。無いのは `CM-76` `setTaskGroupEditGroup` だけ（「人だけが使う（表 T-275 の `GP-1`）」、`DFC-730`・`CR-433` が持つ —— 止めてある） | 原稿は 88 を持つ。`CM-76` の扱いは ③ の X-g |
| 運ぶ値は列から機械で決まる | 運ぶ値は 164（`setDependencyLag` の 2 つの形を 1 つと数えて）。鍵 53・同じ名の列 66・綴りの違う列 15・列の組 9・列でない 21。命令で数えて、全部が列か鍵 65、列でない値を持つ 21、はっきりしない 1（`setCalendar`） | 列を指せる 134 は指すだけ（型を書き直さない）。30 は型と意味を書き起こす（X-d） |
| 文書の列は 表 T-058 の列 | 67 の命令は 表 T-058（`erd.json`、`AT-` の行）の列を書く。20 の命令（`DocumentSettingsCommand` の全部）は見せ方の群の値 —— 表 T-202・表 T-203 の `S-` の行 —— を書く | どちらも「文書の列」として指す（X-c） |
| 欄の名は列の名と同じ | 15 が違う —— `days`（`fadeInDays`・`fadeOutDays`）、`parentUid`（`parentTaskUid`）、`glyph`（`milestoneGlyph`）、`date`（`statusDate`）、`hue`（`themeHue`）、`workingDays`（`parentProgressToleranceDays`）、`timeZone`（`scheduleDataTimeZone`・`viewTimeZone`）、`timeZones`（`displayTimeZones`）、`direction`（`stackDirection`）、`scale`（`fontScale`・`displayScale`）、`monochrome`（`themeMonochrome`）ほか | 11 節の Q1 |
| AI は命令の形を知っている | MCP の `applyCommands` の入力は `{ type: 'object' }` だけ（`mcp-tool-translator.ts` の 65 行）。命令の名も欄も型も道具の一覧に出ない。実行時に形を確かめるのは、上の段の浅い確かめ（`agent-api-members.ts` の 651〜667 行）と、集約に無い種類を断ることと、投げたら拾う `try`（498 行 —— 「表 T-108 が定める形ではない」と言うが、表 T-108 は形を定めていない） | 原稿から入力の形と、実行時の確かめを生成する（X-h） |
| 表 T-108 を移しても読み手は困らない | 表 T-108 を構文で読む道具は 0。試験 47 が `specTable` で読む（多くは「確定名」の欄）。5 つの試験が書の行を逐語で読む（`cr-559`・`cr-560`・`h4`・`dfc-568`・`cr-572` の「全数である」の文）。ファイル名を手で並べる所は `CR-765` と同じ 10 か所ほど | 当てる体と試験の体が同じ巡で直す（5 節） |
| 進行中の草案は 表 T-108 を変えない | `CR-753` は `CM-8` の升と `PasteLanding.dayShift`（日 → 分）を変える。`CR-755` は `CM-94`・`CM-95` の説明の括弧を変える。`CR-757` は命令 `shiftScheduleToStartDate` を 1 つ足す（枝 `claude/compassionate-goldberg-0bf1a8` の `6f7c3ac3`）。`CM-94`〜`CM-98` は `CR-710` で既に在る | 3 つとも本書の前に当てる（8 節）。後なら原稿を書き替える形に直す |
| 6 つの行は既に運ぶ値を文で言う | `CM-8`・`CM-15`・`CM-39`・`CM-92`・`CM-93`・`CM-98` の「何を担うか」 | 値の欄と同じことを 2 度言わないように文を直す（X-i） |

### 0.2 裁定の鎖（`rulings.md` を「`T-108`」「`DocumentCommand`」「引数」「`applyCommands`」「`AM-7`」で引いた）

| 裁定 | 何を決めたか | 本書との関係 |
|---|---|---|
| `JDG-2071` | 仕様書が唯一の正 | 本書の起こり（`DFC-2642` はその ③ の調べ） |
| `JDG-2162` | 表 T-108 を原稿にし、運ぶ値を書き起こし、表・型・AI の入力を生成する（`JDG-2160` と同じ道） | 本書そのもの |
| `JDG-2160` | 表 T-107 を原稿にする | `CR-765`。`AM-7` の入力の形を刷る生成器は `CR-765` が作る |
| `JDG-1953` | 依存線を 1 本だけ名指して消す命令（`CM-93`）を足した | 変えない。`order` は列でない値として書き起こす |
| `JDG-961` | 既定の暦のままなら `CM-39` が暦を 1 つ作ってから直す | 変えない |
| `JDG-122`・`JDG-145`・`JDG-456`・`JDG-464`・`JDG-823`・`JDG-1221`・`JDG-1727`・`JDG-1728`・`JDG-1784` | 個々の命令の足し・振る舞い | 変えない —— 本書は命令を足さず、名を変えず、振る舞いを変えない（Q1 の択 B を除く） |

覆す裁定: 無い。覆すのは 表 T-108 の前文の 2 文（裁定ではなく本文、`DFC-2642`）。

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

- `CH-1`（`GL-004`、構造化した日程データを出す）—— AI が文書を書き換える口は 表 T-108 の命令である（`AM-7`、`PI-8`）。命令の形が道具の一覧に無いので、AI は試して断られるしか知る道が無い。
- 画面は変わらない。

### ② レビュー観点のどの条項を当て、何が出たか

- `R1.3`（唯一の正）—— 命令の形はコードだけが持ち、表は名だけ。⭐ 列を書く値の型は `erd.json`・`settings.json` が既に持つ —— 原稿に型を書き直すと 2 か所になるので、列を指すだけにする（X-d）。
- `R1.2`（検証できる表現）—— 「表 T-108 が定める形ではない」（498 行）は、表が形を定めて初めて検証できる。
- `R2.21`（1 つの仕事は 1 か所）—— 組の形（`AnnotationAnchor`・`HighlightRange`・`TableView` ほか 12）は原稿で 1 度だけ定め、使う命令は名で指す。

### ③ 利用者に問わずに決めたこと

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| X-a | 原稿は `docs/spec/_source/document-commands.json`（と手で書く `.schema.json`、刷る `document_commands_json_to_md.py`）。刷る書は `docs/spec/_assets/tbl-document-commands.md`（UID `DOC-TBL-DOCUMENT-COMMANDS`）。用語辞書の 7 節は節の頭と、置き場を指す 1 文だけを残す | `CR-765` の X-a と同じ（前例 `CR-581`・`CR-278`・`CR-712`） | 0.1 の 6 行目の一覧と逐語の試験を直す |
| X-b | 表 T-108 に欄「運ぶ値」を足す（「組」の後）。1 行に 1 つ —— 「`名`: 型 —— 意味（`AT-n` ／ `S-n`）」。行を特定する鍵は「鍵」と書く。値の無い命令は `—` | 行は 88 のまま、表も増えない | 表が横に広くなる |
| X-c | 文書の列は 表 T-058 の `AT-` の行と、見せ方の群の 表 T-202・表 T-203 の `S-` の行の 2 種を指す | 見せ方の群も文書の 3 つの根の群の 1 つ（表 T-052 の `DR-1`）。裁定の「文書の列」を `AT-` に限ると 20 の命令が指す先を失う | — |
| X-d | 列を指す値（134）は、型・空を許すか・上下限を `erd.json` ／ `settings.json` から引き、原稿に書かない。原稿が型を書くのは列でない 30 だけ。型の語は `erd.json` の `json` の語（`string`・`integer`・`number`・`boolean`・`enum`・`color`・`array`・`map`・`object`・`ref`）を使う | `R1.3`（② の 1 行目） | 生成器が 3 つの原稿を読む |
| X-e | 組の形（12）は原稿の「形」の区で 1 度だけ定め、刷るときに使う命令の升へ展開する（新しい表を作らない）。2 つの形を取る値（`setDependencyLag` の稼働日 ／ 分と単位、`setTaskPlanActualState` の `PA-1`〜`PA-5`）は択として書く | 刷り物の重複は生成なので食い違わない。表と接頭辞を増やさない | 刷った升が長くなる（`CM-92` の `TableView` など） |
| X-f | 欄の名は今のコードの名のまま（Q1 の推奨 A）。列の名と違う 15 は、列を指すことで意味を言う | 裁定の文は「列を指す」であり「列の名にする」ではない | Q1 で B が選ばれれば 15 の名と、呼び手のコード・試験・進行中の草案（`CR-753`・`CR-755`・`CR-757`）が動く |
| X-g | `CM-76` は原稿に運ぶ値ごと書く（`groupId`・入れる ／ 消す）。生成した型に種類が入るので、コードは「人だけが使う、まだ実装していない」として断る道を 1 つ持つ（今も集約に無い種類として断られる —— 振る舞いは同じ）。実装は `DFC-730`（`CR-433`）のまま | 仕様が正。表 T-108 は「全数」 | 断る理由の文が変わる |
| X-h | AI の入力の形: `applyCommands` の `request.commands` の 1 つを、種類（`kind`）で分けた択の並びとして刷る（`CR-765` の道具の入力の生成器に足す）。実行時の確かめ: 原稿から、種類・要る欄・欄の型を確かめる表を生成し、外れた束は `AM-7` の `malformedRequest` で断る —— 投げない（`FR-028`、`DFC-325`）。前例は `tools/generate_json_schema_validator.py`（`ajv` を同梱しない —— 内容セキュリティ方針の `PO-4`） | 498 行の文を真にする。AI が試して断られる前に形を読める | 道具の一覧が大きくなる（87 の択）。今は黙って `undefined` を書いていた束が断られる（`dfc-325` の試験が挙げる形） |
| X-i | 運ぶ値を文で言う 6 つの「何を担うか」（`CM-8`・`CM-15`・`CM-39`・`CM-92`・`CM-93`・`CM-98`）は、値の欄と重なる文を消し、規則（何をどう書くか）だけを残す | `R1.3` | — |
| X-j | 前文の「**本表は `applyDocumentChange` が受け取る命令の全数である**」はそのまま刷る（`cr-572` の試験が逐語で読む） | 文は真のまま | — |
| X-k | 原稿の命令の並びを刷る並びとする（今の群の順）。欠番 10 は原稿の「退いた番号」の区に持つ（`retired.py` と同じ） | 並びは試験と読み手が頼る | — |
| X-l | `setCalendar`（はっきりしない 1）は今のコードの形（渡さない欄は今のまま、`null` は消す ／ 既定に戻す）を書き起こし、`FR-088` の 表 T-344 の `WC-8`・`WC-9` と照らす。食い違えば `DFC-` の行にする（規則 01 の ⑤） | 正を決めるのは書き起こしの後 | — |

---

## 1. 範囲 —— 行き先

| 観点 | 今 | 本書の後 |
|---|---|---|
| 表 T-108 の置き場 | 手で書く `tbl-glossary.md` の 7 節 | 原稿 `_source/document-commands.json` から刷る `_assets/tbl-document-commands.md` |
| 命令が運ぶ値 | `src` の 8 つの和の型だけ | 表 T-108 の「運ぶ値」の欄（列を書く値は `AT-` ／ `S-` を指す） |
| `DocumentCommand` の型 | 手で書く 8 つの和 | 原稿から生成（出す名 `TaskCommand` 〜 `DocumentSettingsCommand` と欄の名は保つ） |
| AI の `applyCommands` の入力 | `request` は `object` | 命令ごとの択の並び。形の外れた束は断る |
| 画面 | — | 変わらない |

---

## 2. 新しい識別子

| 何か | 置き場 | 番号 |
|---|---|---|
| 書の UID | 刷る書の頭 | `DOC-TBL-DOCUMENT-COMMANDS` |

新しい表・接頭辞・要求・行は無い（表 T-108 に欄が 1 つ増える）。

---

## 3. ⛔ 消すものを先に列挙する（旧 → 新）

| 旧 | 新 |
|---|---|
| `tbl-glossary.md` の 7 節の前文 4 文の 2 つ —— 「引数・戻り値は `src/` の公開エントリが持ち、境界値は Chapter 6.1 が持つ。」「本表は名前と、何を担うかだけを持つ。」 | X-2 |
| 7 節の 表 T-108 の 88 行と前後の文 | X-1（指す 1 文）・X-2（刷る書） |
| 6 つの行の「何を担うか」の、運ぶ値を言う部分（X-i） | 当てる体が原稿へ移すときに 1 行ずつ直す（`4a907919` の升を変更履歴に残す） |
| 「`tbl-glossary.md` の 表 T-108」と書く所 | 「`tbl-document-commands.md` の 表 T-108」（当てる時に `grep -rn "tbl-glossary.md. の 表 T-108\|tbl-glossary.md の 表 T-108" docs/spec` で数え直す） |
| 表 T-064 の `PI-8` の `DocumentCommand` の注「型。」「**全数は 表 T-108 が持つ**」 | X-3 |

---

## 4. 書き直す所

### X-1 —— `tbl-glossary.md` の 7 節

```
## 7. `DocumentCommand` の全数

**Type**: SECTION

表 T-108（`DocumentCommand` の全数）と、命令ごとに運ぶ値は `_assets/tbl-document-commands.md` が持つ（原稿 `_source/document-commands.json`）。
```

### X-2 —— 刷る書 `tbl-document-commands.md` の前文（原稿の `before`）

```
**本表は `applyDocumentChange` が受け取る命令の全数である**（表 T-064 の `PI-8`）。
⭐ **命令が運ぶ値（名・型・意味）は本表が持つ** —— 文書の列を書く値は、その列（表 T-058 の `AT-` の行、見せ方の群は 表 T-202 ・表 T-203 の `S-` の行）を指し、型と上下限はその行に従う。境界値は Chapter 6.1 が持つ。
コードの命令の型と、`Agent API` の `applyCommands`（表 T-107 の `AM-7`）が受ける形は本表の原稿から生成し、手で書かない。
従う規則は「正」の列が指す要求が持つ。
（`組` の ⭐ の 2 つの ⚠️ の段は今のまま）
```

表の見出し:

```
| 行 ID | 群 | 確定名 | 組 | 運ぶ値 | 何を担うか | 正 |
```

升の例（`4a907919` のコードの形 —— 当てる体が 88 行を書き起こす）:

```
| CM-9  | `Task` | `setTaskName` | — | `uid`: 鍵（`AT-24`）<br>`name` —— 新しい名（`AT-27`） | タスクの名前を変える | … |
| CM-16 | `Task` | `setTaskFadeInDays` | — | `uid`: 鍵（`AT-24`）<br>`days` —— フェードインの日数（`AT-40`） | … | … |
| CM-93 | `Dependency` | `deleteDependencyAt` | — | `predecessorUid`: 鍵（`AT-45`）<br>`successorUid`: 鍵（線を持つ `Task` の `uid`、`AT-24`）<br>`order`: `integer` —— 同じ 2 つのタスクの同じ向きの線のうち何本目か | … | … |
```

### X-3 —— 表 T-064 の `PI-8`（`_source/published-entries.json`）

```
型。
**全数と、命令ごとに運ぶ値は 表 T-108 が持ち、本型はその原稿から生成する**（`_assets/tbl-document-commands.md`）
```

### 4.1 生成物

当てる体が `npm run gen` で `docs/spec/_assets/tbl-document-commands.md`・`docs/spec/_assets/tbl-published-entries.md`・`src/use-case/edit-document/` の 8 つの和の生成の領域・実行時の確かめの表・`src/adapter/mcp-tool-translator/mcp-tool-descriptions.json`（`AM-7` の入力の形 —— `CR-765` の生成器）・`docs/development-records/test-inventory.md` を刷り直す。

---

## 5. 継ぎ目（コード）と試験

| ファイル | 変えるもの |
|---|---|
| `docs/spec/_source/document-commands.json`・`.schema.json`・`document_commands_json_to_md.py` | 新しい原稿・契約・刷り手。`erd.json`・`settings.json` を読んで指す列が在ることを確かめ、無い `AT-` ／ `S-` を指せば止まる |
| 新しい生成器（名は当てる体が `JDG-820` で付ける） | 8 つの和（`edit-task.ts`・`edit-task-group.ts`・`edit-dependency.ts`・`edit-annotation.ts`・`edit-resource.ts`・`edit-calendar.ts`・`edit-project.ts`・`edit-document-settings.ts`）の生成の領域。出す名と欄の名を保つ（`edit-document/` の中の 47 の `Extract`／`CommandOf`、外の 19 のファイルの import を動かさない） |
| `tools/generate_mcp_tool_descriptions.py`（`CR-765` の後の形） | `AM-7` の `request.commands` の択の並び |
| 実行時の確かめ（`src/adapter/agent-api-endpoint/` の中、名は当てる体） | 生成された表で、種類・要る欄・欄の型を確かめ、外れた束を `malformedRequest` で断る |
| `src/use-case/edit-document/edit-document.ts` | `CM-76` を断る道（X-g） |
| ファイル名の一覧（`tests/contract/spec-table.ts` の `FILES`、`tools/follow_the_manuscript.py`、検査 5 本ほど） | 新しい書を足す |
| `docs/development-rules/03-implementation.md` | 新しい生成の定数を一覧に足す（検査 30） |

試験（仕様だけを読む別の体が書く —— 規則 04）:

- 表 T-108 の 88 行と、生成された和の種類が等しいこと（`CM-76` は断られること）。行ごとに、運ぶ値の名と要る ／ 要らないが型の欄と等しいこと。列を指す値は、その列の型を外れた値で断られること（列ごとに 1 つ —— 例 `setTaskFadeInDays` の `days` に文字列）。
- `dfc-325` の形の外れた束（綴りの違う欄・欄の無い命令）が、投げずに `malformedRequest` で断られること。
- 逐語で書の行を読む試験（`cr-559`・`cr-560`・`h4`・`dfc-568`・`cr-572`）は、刷った書を `specTable` で読む形に直す。

毎フレームの経路に触れない（確かめは `applyCommands` の 1 回の呼びごと）—— `perf-pending` の行は要らない見込み。⚠️ 人の操作の命令は確かめを通らない（翻訳器がコードで組むので型が守る）。

---

## 6. グラフ（`impact.py`・`induced.py`、`4a907919`）

- 誘導部分グラフ（18 対象: `T-108`・`PI-8`・`PI-9`・`AM-7`・`AG-3`・`AG-9a`・`FR-028`・`T-058`・`CM-76`・`CM-8`・`CM-39`・`CM-92`・`CM-93`・`CM-98`・`CM-15`・`FR-088`・`T-202`・`T-203`）: 18 の種がすべて解決、辺 14、閉路 1。
  - 大きさ 2: `CM-39`・`FR-088` —— 値の行と、その規則を持つ要求の作法の閉路。⇒ `CM-39` の升（X-i・X-l）を直すときは `FR-088` を読み、同じ巡で書く（`FR-088` の文は変えない見込み）。
- 届く所（`impact.py`、深さ 2）: 表 T-108 は要求 18 件から指され、2 次 67 件、要求以外 4 か所（5.3 節 2・`fig-erd-detail.md` の 4 節 2）。どれも行 ID か表の番号で指し、運ぶ値を写していない（`DFC-2642` の測り —— 「引数」「受け取」を含む行は 1）。
- 足す辺: `CM-n` → `AT-n` ／ `S-n`（運ぶ値が指す列 —— 134 本ほど）。消す辺は無い。⚠️ 辺が 134 本増えるので、表 T-058 の `AT-` の行の 2 次の届く先が広がる —— 当てた後の `impact.py` の数は予測しない。
- 並んで起草・適用している変更要求との重なり: `CR-753`（`CM-8`）・`CR-755`（`CM-94`・`CM-95`）・`CR-757`（新しい命令）が 表 T-108 の升を書く（0.1）。⭐ 統合の枝 `b492dfd7` で `CR-759`〜`CR-762` の 3 節〜5 節を測り直した（2026-10-15）: 4 つとも 表 T-108 の行を書かず、本書の `edit-*.ts` に触れない。`CR-760` が `agent-api-members.ts` に触れる（本書は確かめを呼ぶ 1 か所だけ —— `CR-765` の後に当てるので、`CR-760` も先に当たっている）。`CR-759` は同じ書 `tbl-glossary.md` の 表 T-109 に行を足す（別の節）。`CR-763`・`CR-764` は `b492dfd7` にまだ無い —— 当てる前に「`T-108`」「`CM-`」で測り直す。

---

## 7. 数の予測

- 要求 ±0、表 ±0、図 ±0、`UID` ±0、表の行 ±0（表 T-108 は書を移り、欄が 1 つ増えるだけ）—— `4a907919` の `check.sh` は `tables=240  figures=30  rows=3269  uids=183`。`CR-757` が先に当たれば行 +1 はそちらの数。
- `（MUST）`: ±0。

---

## 8. 波

### 8.1 幅（`05-working-method.md` の 11 節）

触る `src` のファイル: 8 つの `edit-*.ts`・`edit-document.ts`・`agent-api-members.ts`（確かめを呼ぶ所）・新しい確かめのファイル。進行中の変更要求と共有するもの: `edit-task.ts`（`CR-753`・`CR-756`）、`edit-project.ts`・`edit-document.ts`（`CR-757`）、`edit-document-settings.ts`（`CR-755`）、`agent-api-members.ts`（`CR-765`・`CR-760`）。`CR-759`〜`CR-762` は 8 つの `edit-*.ts` に触れない（`b492dfd7` で測った）。⇒ 生成の領域は 8 ファイルにまたがるが生成器 1 つが書くので、造りの体 1 つ（＋ 原稿の書き起こしの体 1 つ ＋ 試験の体 1 つ）。

### 8.2 順

1. `CR-753`・`CR-755`・`CR-756`・`CR-757` の後（表 T-108 の升と、共有する 4 ファイル）。
2. `CR-765` の後（`AM-7` の入力の形を `CR-765` の生成器に足す。`AgentWriteRequest` の型は `CR-765` の 表 T-新 の行）。
3. 波の中: 原稿の書き起こし（88 行。⚠️ 1 行ずつ、今のコードの形を写す前に「正」の要求と照らし、食い違えば `DFC-` の行 —— 規則 01 の ⑤）→ 契約・刷り手 → 用語辞書 7 節・`PI-8`・書の名の置き替え → `npm run gen` → 和の生成器 → 確かめ → 試験。
4. Q1 が択 B なら、名を変える 15 の欄の呼び手（翻訳器 8・シェル 5 ほか）が同じ巡に入る —— 見積りに 3 時間を足す。

---

## 9. 仕様の外で直すもの

- ファイル名の一覧（5 節）。
- `agent-api-members.ts` の 498 行の文は、表が形を持てば真になる（直さない）。
- 見本は作らない（画面は変わらない）。

---

## 10. ⛔ この変更でやらないこと

- 命令を足す・消す・名を変えること（`CM-76` の実装も —— `DFC-730`）。
- AI から受ける命令を絞ること —— 今は 87 を受ける。人だけの命令（`CM-76`）を AI から断るのは今と同じ。
- 列の型・上下限を原稿に書き直すこと（X-d）。

---

## 11. 利用者に問うこと

### Q1 —— 命令が運ぶ値の名を、書く列の名にそろえますか？（`DFC-2642`、③ の X-f）

- 場面: AI（Claude など、MCP の取次を通して `GRS` を操作する相手）が `applyCommands` で文書を書き換えるとき、命令ごとに値の名を付けて渡す。例: タスクのフェードインの日数を変える命令 `setTaskFadeInDays` は、値を `days` という名で運び、書く先は `Task` の列 `fadeInDays`（表 T-058 の `AT-40`）である。本書の後、AI は道具の一覧でこの名と「書く列」を読める。
- 名と列の名が違うのは 15（`days` → `fadeInDays`・`fadeOutDays`、`parentUid` → `parentTaskUid`、`glyph` → `milestoneGlyph`、`date` → `statusDate`、`hue` → `themeHue`、`workingDays` → `parentProgressToleranceDays`、`timeZone` → `scheduleDataTimeZone`・`viewTimeZone`、`timeZones` → `displayTimeZones`、`direction` → `stackDirection`、`scale` → `fontScale`・`displayScale`、`monochrome` → `themeMonochrome` ほか）。人の画面には出ない。
- 使い方の例: AI が「タスク 12 を 3 日でフェードインに」と頼まれ、`{ kind: 'setTaskFadeInDays', uid: 12, days: 3 }` を送る。名をそろえると `{ ..., fadeInDays: 3 }` になる。

| 択 | 形 | 代償 |
|---|---|---|
| **A 今の名のまま、列を指す（推奨）** | 原稿は 15 の値に「書く列」を書き、名は今のまま | 名と列の名が 2 つある（原稿が対応を持つので食い違いはしない） |
| B 列の名にそろえる | 15 の値の名を列の名にする | 呼び手のコード（翻訳器・シェル 13 ファイルほか）と試験と、進行中の 3 つの草案が動く。AI の古い手順は断られる（出荷前なので古い形を読む約束は無い） |
| C 1 つの命令で 2 つの列に同じ名を使う所だけそろえる | `days`・`scale`・`timeZone` の 3 つの名を列の名にする | 一部だけ違う規則になり、AI はどちらの名の付け方かを命令ごとに覚える |

推奨は A —— 理由: 裁定の文は「列を指す」であり、指せば名の違いは原稿が 1 か所で持つ。名が違っても命令の名（`setTaskFadeInDays`）がどの列かを言っているので、AI が迷う所は少ない。B は出荷前なら取れる道だが、進行中の 3 つの草案と呼び手を動かす費用に見合う読みやすさの差が小さい。

⭐ 答え: まだ無い（利用者は眠っていた）。調整役が問う時期を決める。答えが無いあいだも択 A で当てられる。

---

## 12. 台帳

| 台帳 | 動かしたもの |
|---|---|
| `defects.md` | `DFC-2642` の対応方針の欄の頭に「指示 —— `CR-766` が当てる」を書いた（本書の起草と同じコミット）。ステータスは `仕様待ち` のまま |
| `rulings.md` | `JDG-2162` の状態の欄を「指示 —— `change-request/CR-766-each-document-command-carries-the-values-its-manuscript-names.md` が当てる」にした |
| `changelog.md` | 当てる体が番号を受ける |

---

## 13. 測り方の再現

```
git grep -c "CR-766" 4a907919 -- change-request docs src tests previous-project-result tools   # 0 件
grep -c "^| CM-" docs/spec/_assets/tbl-glossary.md                                            # 88
grep -n "^export type DocumentCommand" -A9 src/use-case/edit-document/edit-document.ts         # 8 つの和
grep -rn "setTaskGroupEditGroup" src | wc -l                                                    # 0
sed -n 60,70p src/adapter/mcp-tool-translator/mcp-tool-translator.ts                            # request: OBJECT_VALUE
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/impact.py T-108
PYTHONIOENCODING=utf-8 python .claude/skills/spec-graph-check/induced.py <6 節の 18 対象>
```

運ぶ値の 164 と 5 つの種類（鍵・同じ名の列・綴りの違う列・列の組・列でない）は、8 つの和の型の塊を Python で読み、欄ごとに `erd.json` の列の名と `settings.json` の鍵に照らして数えた（試算の表は調整役の覚え書きの置き場に残した —— `cr-765-768-drafts.md`）。

---

## 14. 利用者の実物の手順と見積り

- 実物の手順（調整役へ送る）: MCP の客から `tools/list` を読み、`applyCommands` の入力に命令の名と運ぶ値が並ぶこと。綴りを誤った欄の命令を送り、断られて文書が変わらないこと。正しい命令（`setTaskName`）が今と同じに当たること。
- 見積り（当てる側）: 原稿の書き起こし（88 の命令・164 の値）4 時間、契約と刷り手 2 時間、和の生成器 3 時間、実行時の確かめと入力の形 3 時間、書の名と一覧 1.5 時間、仕様だけを読む試験 3 時間、`check.sh` と全試験 1 時間 —— 計 17.5 時間ほど（Q1 が B なら ＋3 時間）。
