# CR-708 —— 「行」をタスクグループへ、「WBS の親」を親タスクへ改名する（名前の対応表と 3 段の計画）

> 起草の状態: **下書き（当てていない）**。2026-10-08、作業木 `c42039df` の上で起草した。`docs/spec`・`src`・`tests` には何も当てていない。いつ・どの持ち場で当てるかは調整役が決める（8 節）。
> ID の帯: 番号 `CR-708` を調整役から受けた。使ったのは `CR-708` の 1 つだけ。`c42039df` の木で `CR-708` を名乗る所は 0 件だった（13 節）。新しい表・表の行・`DFC`・`JDG`・`PND` の番号は使わない。
> 当てる裁定: `JDG-1570`（行 → タスクグループ）・`JDG-1652`（WBS の親 → 親タスク、同じ時期に）・`JDG-1614`（`PR-15` の見出し）・`JDG-1659`〜`JDG-1668`（一覧への 10 の答え、すべて推奨のとおり）・`JDG-1697`（プロパティパネルの英語の項目名は小文字）。覆す裁定は `JDG-1062` ③ の呼び名（親子判別・親定義）—— `JDG-1667` が既に覆している。`JDG-1614` の「列の名 `wbsParentUid` は変えない」は `JDG-1666` が既に覆している。
> 元の一覧: `docs/review/rename-row-to-task-group-2026-10-08.md` と同名の `.tsv`（基準 `e39177b4`、1,667 パターン）。本書の数は `c42039df` で測り直した（3 節。測り方は 13 節）。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 利用者の裁定の逐語（全文は `docs/development-records/rulings.md` の該当行）

| 裁定 | 逐語（短く引く） | 本書での扱い |
|---|---|---|
| `JDG-1570` | 「タスクグループに統一しよう。」 | 1 つの概念に 1 つの名 —— 画面・仕様・データ・コードのすべて（2 節） |
| `JDG-1652` | 「「親タスク」に変えてよい。 用語を統一しろ。」 | WBS の親 → 親タスク（2.1・2.5） |
| `JDG-1614` | 「親タスク / Parent task (Recommended)」 | `PR-15` の見出しを「親タスク」/ "parent task"（小文字は `JDG-1697`） |
| `JDG-1659` | 「このまま当てる (Recommended)」 | 一覧の 2 節の画面の語の案をそのまま当てる（2.1） |
| `JDG-1660` | 「縦軸 / vertical axis (Recommended)」 | 「行軸（縦）」→「縦軸」、コードの `rowZoom*`・`row-axis` も縦軸の名へ |
| `JDG-1661` | 「Task Group Area にする (Recommended)」 | `U-50` `Row Area` → `Task Group Area`、`rowArea*` → `taskGroupArea*` |
| `JDG-1662` | 「案 A 見出しと名を分ける (Recommended)」 | 箱は「タスクグループ見出し」/ `taskGroupTitle*`、字は「タスクグループ名」/ `taskGroupName*`、パネルは `taskGroupPanel*` |
| `JDG-1663` | 「鍵も改名する (Recommended)」 | 設定の鍵 6 つ（と `CR-690` が足した 1 つ）を改名。旧形式の読み替えは作らない（2.3） |
| `JDG-1664` | 「「タスク」と書く (Recommended)」 | 遅延診断の文で診断の対象を指す「行」は「タスク」 |
| `JDG-1665` | 「すべて変える (Recommended)」 | ファイル名・DOM の名・エージェント API の名もすべて（2.4・2.6） |
| `JDG-1666` | 「parentTask* に変える (Recommended)」 | `wbsParent*` → `parentTask*`、保存の列 `wbsParentUid` → `parentTaskUid` |
| `JDG-1667` | 「親タスク表示 / 親タスク設定 (Recommended)」 | `IC-141`・`IC-142` の名 |
| `JDG-1668` | 「「タスク」で揃える (Recommended)」 | 子タスク・子孫タスク・祖先タスク・兄弟タスク・親タスクの部分木、`K-99` の語 |

### 0.2 裁定の鎖（rulings.md を「行」「タスクグループ」「WBS の親」「親タスク」「部分木」「読み替え」で引いた）

| 裁定・変更要求 | 何を決めたか | 本書との関係 |
|---|---|---|
| `JDG-1062` ③ | パレットのアイコンの名「親子判別」「親定義」 | `JDG-1667` が覆した（覆された印は rulings.md に既にある）。本書は新しい名だけを当てる |
| `JDG-1697` | プロパティパネルの英語の項目名は小文字 | `PR-15` の英語は "parent task"（`JDG-1614` の "Parent task" ではない） |
| `CR-690` | `K-71`・`K-143` の和名を既に「タスクグループパネルの幅」とした。`PR-18` は既に「タスクグループ名」 | 和名は変えない。鍵 `rowTitlePanelWidth`・`rowTitlePanelWidthFixed` だけを変える |
| `CR-706` X-3 | 命令の名 `pasteTaskSubtree`・`pasteTaskGroupSubtree` は変えず、名と中身の食い違いを改名の CR へ送った | 2.4 と 11 節の問 1 で扱う |
| `JDG-601`・`JDG-1691`・`JDG-1678` | 公式運用の宣言の前は、古い形の文書を読み替えずに拒む。運用開始の版は null | `wbsParentUid` を持つ文書は版によらず拒む（2.3）。表 T-297 に行を足さない |

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

- `CH-4` / `GL-006`（説明を読まずに操作できる）—— 画面が「行」、データとコードが「タスクグループ」と、1 つのものを 2 つの名で呼ぶことが無くなる（`DFC-2174`）。AI に渡す文書と画面の語が一致する。
- `CH-1` / `GL-008`（構造化した日程データを出す）—— 書き出す `GRS JSON` の列名 `parentTaskUid` が、画面の「親タスク」と同じ名になる。

### ② レビュー観点のどの条項を当て、何が出たか

`docs/development-rules/07-review-standards.md` を当てた。

- `R2.1`（命名が本質を表す）—— 改名の本体。`pasteTaskSubtree` は中身が「選んだ `Task` の複製」なのに名が部分木を言う（`CR-706` X-3）—— 11 節の問 1。
- `R1.2`（読みが 1 つ）—— 「行」は TaskGroup・仕様の表の行・文字の行の 3 義を持っていた（表 T-006b の `A-2` が「明示せよ」と書くほど）。改名で TaskGroup の義が消え、`A-2` は要らなくなる（X-5）。
- `R1.3`（唯一の正）—— 名前の対応表は本書の 2 節の 1 か所に置き、道具（7 節）は本書から作る対応表の TSV だけを読む。
- `R4.4`（状態機械の命名）—— 状態機械の事象・番人・値（`childRowAddPressed`・`isPressedRow`・`chosenRows`・`rowGrabStateMachine`）も同じ規則で改名する（2.5）。

### ③ 利用者に問わずに決めたこと

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| X-1 | 数は機械の分類で測り直し、元の一覧（読んで分けた数）との差を足して見込みとした | 1,667 パターンを読み直す時間は無い。差分は機械で確かめられる | 和文の素の「行」は、当てる段で 1 行ずつ読む（7 節） |
| X-2 | `rowTitlePanel*` は `taskGroupPanel*`（Title を落とす） | `JDG-1659` のパネルの名「タスクグループパネル」/ Task Group Panel | 無い |
| X-3 | 縦のズームのコード名は `vertical*`（`verticalZoom*`・`vertical-axis`）とし、`zoomY*` にはしない | `zoomY` は既に設定の鍵の名であり、軸の名には画面の語「縦軸」を写す | 無い |
| X-4 | 履歴は改名しない —— `docs/development-records/`・`change-request/`・`docs/review/`・`previous-project-result/` の名と文、rulings.md の逐語 | 逐語は 1 文字も変えない。過去の成果物の名は過去の事実 | 古い文書を読むときは本書の対応表を引く |
| X-5 | 表 T-006b の `A-2` を消す。`A-1` ③・`A-3`・`A-4` は語を変えて残す | 一覧の 3.1 節。語が 1 つになると `A-2` が守るものが無い | 無い |
| X-6 | 図 `fig-hit-stacked-row.svg` は `fig-hit-stacked-task-group.svg` にする（中身は変えない） | 一覧の 3.1 節 | 無い |
| X-7 | 設定値の行が指す見本のフォルダ名（`33-wbs-parent-palette-icons`・`11-row-controls` など）は変えない | X-4 と同じ —— 過去の成果物の住所 | 識別子の中に古い名が残る（7 節の除外の表に載せる） |
| X-8 | `agentApiVersion` を 1 → 2 に上げる | 表 T-035 の `AG-1`「非互換な変更で上げること」 | 無い |
| X-9 | `TaskGroup.parentId`（タスクグループの親）は変えない。「親タスク」はタスクの親だけを指す | タスクグループの入れ子の親はタスクではない | 無い |
| X-10 | 改名は 1 本の作業ブランチで行い、段と段のあいだの赤（型・試験）を許す。`main` へは 3 段が緑になってから 1 度だけ早送りする | 生成物が仕様から作られるので、段 1 で `src` の生成物が変わり型が赤になるのは避けられない | 凍結の間（8 節）は他の作業が止まる |
| X-11 | 段 2 の識別子の改名は TypeScript の言語サービスの改名で行い、`tests` の中の参照も同じ一手で直す。段 3 は試験だけが持つ名を直す | `tsconfig.json` の `include` が `src` と `tests` の両方を持つ —— 同じ記号の参照を 2 回に分けると、段 2 の後の型が赤のまま残る | 段 2 の差分に `tests` のファイルが入る |
| X-12 | 汎用の局所名 `row` / `rows` は、型が `TaskGroup`・`TaskGroupPlacement`（旧 `RowPlacement`）のときだけ改名する。それ以外は残す | 型を見て決めれば、検索の行・表の行を巻き込まない（元の一覧の 0.1 節で、試験の汎用語の分けは ±15%） | 型を持たない JS の中の `row` は手で読む |
| X-13 | 名前が「行」でも中身が TaskGroup でない試験のファイル名 8 本は変えない（`cr-571-search-rows` など、7 節） | 区分 b | 無い |

---

## 1. 範囲 —— 行き先

| 何 | どこ | 段 |
|---|---|---|
| 画面の語（和・英） | `docs/spec/_source/display-words.json` → 生成で `src/adapter/screen-renderer/display-words.json` | 1 |
| 仕様の和文・英文 | `docs/spec/01-04-requirements.md`・`05-07-design.md`・`_assets/*.md`・`_source/*.json`・`_source/*.md` | 1 |
| 用語集 | 表 T-006b（`A-2` を消す）、`tbl-glossary.md` の `U-1`・`U-22`・`U-23`・`U-46`〜`U-48`・`U-50`、`K-12`・`K-36`〜`K-38`・`K-70`・`K-71`・`K-99`・`K-111`・`K-120`・`K-140`・`K-143`、表 T-108 の `CM-8`・`CM-18`・`CM-19`・`CM-26`〜`CM-32` の語、`G-6` | 1 |
| 開発規則 | `docs/development-rules/*.md`（和 24・英 15 程度） | 1 |
| `GRS JSON` のスキーマと版 | `_source/erd.json` → `grs-document.schema.json`、`tools/generate_startup_template.py` の `SCHEMA_VERSION` | 1 |
| 仕様の文を引く試験と、`src` の注釈の引用（check 42） | `tests/**`・`src/**` の注釈 | 1 |
| `src` の識別子・ファイル名・DOM の名・文字列・注釈 | `src/**`（参照する `tests` を含む、X-11） | 2 |
| 道具 | `tools/**`（生成器・探り針の例 `row-controls-press-all.mjs` など 33 種 116 件）、`.claude/skills/spec-graph-check/*.py` の名指し | 2 |
| 試験だけが持つ名 | 試験のファイル名、固定データの鍵、DOM のセレクタの文字列、注釈、`tests/known-red.txt`、生成の `test-inventory.md` | 3 |
| リポジトリの中の GRS 文書 | `sample-schedule/Three-Year Product Plan.json`・`docs/guides/schedule-to-grs-json/`（skeleton と prompt 2 本）・`previous-project-result/38-project-progress/*.json`（11 節の問 6） | 3 |
| 基準値のファイルのパス | function-size・comment-rules-tests・twin-comments・crossing-names・quoted-source・repeated-expressions の基準値（計 37 行がパスを持つ） | 3（調整役、`JDG-520`） |

---

## 2. 名前の対応表

⭐ 本節が対応表の唯一の正である。7 節の道具は、本節から作る `rename-map.tsv` だけを読む。

### 2.1 画面の語・仕様の語（和 / 英）

| 旧 和 | 新 和 | 旧 英 | 新 英 | 裁定 |
|---|---|---|---|---|
| 行（`TaskGroup` を指すとき） | タスクグループ | row / rows | task group / task groups | `JDG-1570`・`JDG-1659` |
| 行（`U-1` の UI の名） | タスクグループ | `Rows` | `Task Groups` | `JDG-1659` |
| 行見出しパネル | タスクグループパネル | `Row Title Panel` | `Task Group Panel` | `JDG-1659` |
| 行見出し（パネルの中の 1 つの箱） | タスクグループ見出し | row title | task group title | `JDG-1662` |
| 行見出しツリー | タスクグループ見出しツリー | `Row Title Tree` | `Task Group Title Tree` | `JDG-1662` |
| 行タイトル（`SQ-8`）・行名・行の名前 | タスクグループ名 | `Row Title` / row name | `Task Group Name` / task group name | `JDG-1659`・`JDG-1662` |
| ピン止めした行・ピン止め行 | ピン止めしたタスクグループ | `Pinned Row` | `Pinned Task Group` | `JDG-1659` |
| 行の折り畳みの操作子 | タスクグループの折り畳みの操作子 | `Row Expander` | `Task Group Expander` | `JDG-1659` |
| ピン止めの操作子 | （変えない） | `Row Pin` | `Task Group Pin` | `JDG-1659` |
| （和名なし） | （和名なし） | `Row Area` | `Task Group Area` | `JDG-1661` |
| 行軸（縦）・行の軸・行ズーム | 縦軸・縦軸のズーム | row axis | vertical axis | `JDG-1660` |
| 遅延診断の文の「行」（診断の対象） | タスク（例 `VS-2`「このタスクを束ねる上位タスクが無い」、`CH-7`「数字が信用できないタスク」） | row | task | `JDG-1664` |
| WBS の親・WBS 親 | 親タスク | WBS parent | parent task | `JDG-1652`・`JDG-1659` |
| `PR-15` の見出し「WBS の親」 | 親タスク | WBS parent | parent task | `JDG-1614`・`JDG-1697` |
| 導いた親・明記の親 | 導いた親タスク・明記の親タスク | derived / stated parent | derived / stated parent task | `JDG-1659` |
| WBS の親子・親子関係・親子の関係（Task） | 親タスクと子タスク・親タスクと子タスクの関係 | parent and child | parent and child tasks | `JDG-1659` |
| 子から親へ（矢印の向き） | 子タスクから親タスクへ | child to parent | from the child task to the parent task | `JDG-1659` |
| 親子の進捗の疑義（`K-140`・`FR-131`） | 親タスクの進捗の疑義 | parent-child progress doubt | parent-task progress doubt | `JDG-1659` |
| 親子判別（`IC-141`） | 親タスク表示 | Show WBS Parents | Show Parent Tasks | `JDG-1667` |
| 親定義（`IC-142`） | 親タスク設定 | Set a WBS Parent | Set Parent Task | `JDG-1667` |
| WBS の子・子孫・祖先・兄弟・部分木 | 子タスク・子孫タスク・祖先タスク・兄弟タスク・親タスクの部分木 | WBS child / descendant / ancestor / sibling / subtree | child / descendant / ancestor / sibling task, parent-task subtree | `JDG-1668` |
| WBS のネストの深さの上限（`K-99`） | 親タスクの入れ子の深さの上限 | — | maximum depth of nested parent tasks | `JDG-1668` |

### 2.2 用語集の `K` 行（設定の鍵と和名）

| 行 | 旧 鍵 | 新 鍵 | 旧 和名 | 新 和名 | `GRS JSON` |
|---|---|---|---|---|---|
| `K-12` | `rowGap` | `taskGroupGap` | 行の間隔 | タスクグループの間隔 | 載らない |
| `K-36` | `rowTitleFont` | `taskGroupTitleFont` | 行名の文字 | タスクグループ名の文字 | 載らない |
| `K-37` | `rowTitleIndent` | `taskGroupTitleIndent` | 行名の `TaskGroup` の深さ 1 段ぶんのインデント | タスクグループ名の `TaskGroup` の深さ 1 段ぶんのインデント | 載らない |
| `K-38` | `rowTitleTopScale` | `taskGroupTitleTopScale` | `TaskGroup` 深さ 1 の行名の倍率 | `TaskGroup` 深さ 1 のタスクグループ名の倍率 | 載らない |
| `K-70` | `scrollGroupId`（変えない） | — | 表示の上端が指す行 | 表示の上端が指すタスクグループ | 載らない |
| `K-120` | `scrollGroupOffset`（変えない） | — | 表示の上端が指す行のどこにあるか | 表示の上端が指すタスクグループのどこにあるか | 載らない |
| `K-71` | `rowTitlePanelWidth` | `taskGroupPanelWidth` | タスクグループパネルの幅（`CR-690` で済） | 変えない | **載る** |
| `K-143` | `rowTitlePanelWidthFixed` | `taskGroupPanelWidthFixed` | タスクグループパネルの幅を固定する（済） | 変えない | **載る** |
| `K-111` | `pinnedRowMax` | `pinnedTaskGroupMax` | ピン止めの件数の上限 | 変えない | 載らない |
| `K-99` | `importMaxDepth`（変えない） | — | WBS のネストの深さの上限 | 親タスクの入れ子の深さの上限 | 載らない |
| `K-140` | `parentProgressToleranceDays`（変えない） | — | 遅延診断時に親子の進捗の疑義を許す日数（稼働日） | 遅延診断時に親タスクの進捗の疑義を許す日数（稼働日） | 載る（鍵は変わらない） |

⚠️ `JDG-1663` の問いは 6 つの鍵を「文書に保存される設定の鍵」と書いたが、`c42039df` の `grs-document.schema.json` に載る鍵は `rowTitlePanelWidth` と、問いの後に `CR-690` が足した `rowTitlePanelWidthFixed` の 2 つだけである。ほかの 4 つ（`rowGap`・`rowTitleFont`・`rowTitleIndent`・`rowTitleTopScale`）と `pinnedRowMax` は設定の表の鍵（コードの定数）である。裁定どおり 7 つとも改名するが、形式が変わるのは 2 つだけである（2.3）。

### 2.3 `GRS JSON` の鍵 —— 形式と版

| 群 | 旧 鍵 | 新 鍵 | 形式が変わるか | 旧版の文書を読むと |
|---|---|---|---|---|
| 日程データ（`Task`） | `wbsParentUid` | `parentTaskUid` | 変わる | 知らない鍵でスキーマに合わず、版によらず文書ごと拒む（`OP-6` の「日程データの群は、この寛さを持たない」、`FR-073` の「版を上げても、古い形の文書を読み替えない」） |
| 見せ方（`documentSettings`） | `rowTitlePanelWidth` | `taskGroupPanelWidth` | 変わる | 版がこの造りの最大を超えないので、知らない鍵として黙って捨て、既定値 300 で開く（`OP-6`） |
| 見せ方（`documentSettings`） | `rowTitlePanelWidthFixed` | `taskGroupPanelWidthFixed` | 変わる | 同上（既定値で開く） |
| `TaskGroup` | `parentId` | 変えない（X-9） | — | — |
| `Task` | `wbsOrder` | 変えない（11 節の問 3） | — | — |
| 説明の文（`erd.json` の `description`、`A row on screen` など） | — | 語だけを変える | 変わらない（鍵と型は同じ） | — |

- **形式の版を上げる**: `schemaVersion` の `const`（いま `2026-10-04`）と `tools/generate_startup_template.py` の `SCHEMA_VERSION` を、段 1 を当てる日の日付へ上げる。生成でテンプレート・空の文書・画像からのプロンプトの版の行が追う。
- **旧形式の読み替えは作らない**（`JDG-1663`、稼働前）。表 T-297 に行を足さない。`json-codec.ts` に読み替えを足さない。
- `CR-699`（下書き、スキーマの所在と変更の台帳）が先に当たっていれば、その台帳に本書の版の 1 行を足す。当たっていなければ何もしない。⚠️ 2 つを同時に当てない（11 節の問 9）。

### 2.4 エージェント API・MCP で公開している名

| 何 | 旧 | 新 | 備考 |
|---|---|---|---|
| `readDocument`・`exportJson` が返す文書の列 | `wbsParentUid` | `parentTaskUid` | 2.3 と同じ |
| `readSelection` の `ItemRef` の `kind` | `'wbsParentLink'` | `'parentTaskLink'` | `src/entity/document-model/selection/selection.ts` |
| `applyCommands` の命令 `CM-18` | `setTaskWbsParent` | `setTaskParentTask` | 11 節の問 2 |
| `applyCommands` の命令 `CM-8` | `pasteTaskSubtree` | `pasteTasks`（推奨） | 11 節の問 1（`CR-706` X-3） |
| `applyCommands` の命令 `CM-28` | `pasteTaskGroupSubtree` | 変えない（推奨） | 表 T-223 の `DU-2` は今も配下のタスクグループを写す —— 名は中身と合っている |
| `agentApiVersion` | 1 | 2 | X-8 |
| MCP の道具の説明（生成） | 「タスクが載る行と祖先を開き」など | タスクグループ | `generate_mcp_tool_descriptions.py` が追う。`npm run build:relay` で `.mcpb` を作り直す |
| `readSearchRows` | — | 変えない | 検索の表の行（区分 b） |

⚠️ `JDG-1665` の問いは `rowGroupId`・`chosenRows`・`readDocumentRowIds`・`kind: 'row'` を「AI に公開しているエージェント API の名」と書いたが、測ると 4 つともエージェント API のメンバではない —— `rowGroupId` はシェルの押しの値（`src` 40）、`chosenRows` は状態機械の値（仕様 22・`src` 54）、`readDocumentRowIds` は試験 `tests/system/three-rows-read-from-the-spec-alone.test.ts` の補助（6）、`kind: 'row'` は画面の状態の選択の種類（`src` 6）である。裁定どおり 4 つとも改名する（2.5）。公開の名で実際に変わるのは上の表の 4 つ（列・`kind`・命令 2 つ）である。

### 2.5 識別子（仕様の公開名・状態機械・コード）

識別子は**部分**（camelCase・snake_case・kebab-case の継ぎ目で切った語）で置き換える。部分文字列では置き換えない（`throw`・`arrow`・`browser`・`grow`・`narrow` を巻き込まない）。上から順に、最初に当たった規則を使う。

| 順 | 部分の並び | 置き換え | 例 |
|---|---|---|---|
| 1 | `wbs` `parent`（`wbsParent`・`WbsParent`・`WBS_PARENT`・`wbs-parent`） | `parent` `task` | `wbsParentUid` → `parentTaskUid`、`derivedWbsParents` → `derivedParentTasks`、`isWbsParentLinksShown` → `isParentTaskLinksShown`、`wbs-parent-arrows.ts` → `parent-task-arrows.ts`、`setTaskWbsParent` → `setTaskParentTask` |
| 2 | `row` `title` `panel` | `task` `group` `panel` | `rowTitlePanelWidth` → `taskGroupPanelWidth`、`ROW_TITLE_PANEL` → `TASK_GROUP_PANEL`、`row-title-panel-drawing.ts` → `task-group-panel-drawing.ts` |
| 3 | `row` `title` `width` `field` | `task` `group` `panel` `width` `field` | `rowTitleWidthField` → `taskGroupPanelWidthField` |
| 4 | `row` `title`（箱） | `task` `group` `title` | `rowTitleTree` → `taskGroupTitleTree`、`RowTitle` → `TaskGroupTitle`、`rowTitleFont` → `taskGroupTitleFont` |
| 5 | `row` `name` | `task` `group` `name` | `defaultRowName` → `defaultTaskGroupName`、`rowNameOf` → `taskGroupNameOf`、`DEFAULT_ROW_NAME` → `DEFAULT_TASK_GROUP_NAME` |
| 6 | `row` `area` | `task` `group` `area` | `rowAreaWidth` → `taskGroupAreaWidth`、`isOnRowArea` → `isOnTaskGroupArea` |
| 7 | `row` `zoom`・`row` `axis`・`zoom` `row` | `vertical` `zoom`・`vertical` `axis`・`zoom` `vertical` | `rowZoomShrinkPressed` → `verticalZoomShrinkPressed`、`row-axis` → `vertical-axis`、`zoomRowIn` → `zoomVerticalIn`、`isRowZoomKey` → `isVerticalZoomKey` |
| 8 | `row` / `rows`（ほかの区分 a の複合名） | `task` `group` / `task` `groups` | `RowPlacement` → `TaskGroupPlacement`、`chosenRows` → `chosenTaskGroups`、`rowGroupId` → `taskGroupId`、`isLeafRow` → `isLeafTaskGroup`、`childRowAddPressed` → `childTaskGroupAddPressed`、`rowGrabStateMachine` → `taskGroupGrabStateMachine`、`rowsAtZoomY` → `taskGroupsAtZoomY`、`pinnedRowMax` → `pinnedTaskGroupMax`、`kind: 'row'` → `kind: 'taskGroup'`、`defaultNames` の `use: "row"` → `use: "taskGroup"` |

- **区分 a か b かは名ごとに決める**（7 節の対応表の TSV の 1 行 ＝ 1 つの名）。部分に `search`・`field`・`icon`・`command`・`delay`・`report`・`help`・`spec`・`table`・`column`・`cell`・`carried`・`profile`・`keyed`・`notice`・`palette`・`window`・`modal`・`grid`・`prefix`・`invariant`・`roster` を持つ名は既定で b とし、読んで覆す。
- **衝突を見る**: 新しい名が同じファイルや同じ型に既にあるときは置き換えず、TSV に印を付けて人が決める。`c42039df` で `taskGroupId`・`TaskGroupPlacement`・`taskGroupTree`・`taskGroupName`・`taskGroupArea`・`parentTask`・`parentTaskUid`・`pasteTasks`・`taskGroupPanel`・`taskGroupTitle`・`chosenTaskGroups`・`verticalZoom`・`parentTaskLink` は `src`・`tests` に 0 件だった。

### 2.6 ファイル名・DOM の名

| 種 | 旧 → 新 | 数 |
|---|---|---|
| `src` のファイル | `mspdi-imported-rows.ts` → `mspdi-imported-task-groups.ts`、`row-grab.ts` → `task-group-grab.ts`、`row-tree-entrances.ts` → `task-group-tree-entrances.ts`、`row-title-panel.ts` → `task-group-panel.ts`、`row-names.ts` → `task-group-names.ts`、`drawn-rows.ts` → `drawn-task-groups.ts`、`row-scroll.ts` → `task-group-scroll.ts`、`row-title-panel-drawing.ts` → `task-group-panel-drawing.ts`、`row-band-ceiling-cache.ts` → `task-group-band-ceiling-cache.ts`、`wbs-parent-arrows.ts` → `parent-task-arrows.ts`、`wbs-parent-hold.ts` → `parent-task-hold.ts` | 11 |
| 仕様の図 | `fig-hit-stacked-row.svg` → `fig-hit-stacked-task-group.svg`（X-6） | 1 |
| 試験のファイル | 名に区分 a の `row` / `rows` / `wbs-parent` を持つもの（例 `t-051-hf-15-grabbing-a-row.test.ts` → `t-051-hf-15-grabbing-a-task-group.test.ts`、`cr-631-wbs-parent-hits-and-hands.test.ts` → `cr-631-parent-task-hits-and-hands.test.ts`、`tests/fixtures/row-name-font.ts` → `tests/fixtures/task-group-name-font.ts`） | 57 |
| DOM の `data-*` | `data-row-grab`・`data-row-folding-grid`・`data-row-control-pair`・`data-row-control-ground`・`data-folded-rows`・`data-can-add-child-row`・`data-shown-on-another-row` → `task-group` の綴り | 7 |
| DOM の `data-role` の値 | `Row Title Panel`・`Row Title Tree`・`Pinned Row`・`Row Expander`・`Row Pin`・`Row Title` → 2.1 の新 英 | 6 種 |
| DOM の `id` と `class` の頭 | `` `row-${groupId}` `` → `` `task-group-${groupId}` ``、`wbs-parent-` → `parent-task-` | 2 |

---

## 3. 数（`c42039df` で測り直した）

⭐ 元の一覧は `e39177b4` で、行を読んで a / b / c に分けた。本書は 13 節の台本の機械の分類を `e39177b4` と `c42039df` の両方に当て、その**差**を元の一覧の数に足して見込みとした（X-1）。c はすべて裁定が付いたので、改名の側に数える。

### 3.1 仕様と開発規則

| 領域 | 一覧の a ＋ c（`e39177b4`） | 機械の分類の差（a ＋ 素の「行」） | 見込み（`c42039df`） |
|---|---:|---:|---:|
| 仕様 01-04 の和文「行」 | 1,185 ＋ 69 | ＋86 | 約 1,340 |
| 仕様 05-07 の和文「行」 | 121 ＋ 7 | 0 | 約 128 |
| 仕様 `_assets` の和文「行」 | 267 ＋ 26 | ＋8 | 約 301 |
| 仕様 `_source` の和文「行」（画面の語を除く） | 252 ＋ 23 | ＋7 | 約 282 |
| 画面の語（`display-words.json`、和と英） | 102 ＋ 20 | 0 | 約 122 |
| 開発規則の和文「行」 | 21 ＋ 3 | 0 | 約 24 |
| 仕様の英語の識別子（区分 a ＋ c） | 334 ＋ 162 | ＋27 | 約 523 |
| 仕様の英語の散文 | 88 | 0 | 約 88 |
| 仕様の「WBS の親」の仲間（和の句と `wbsParent*`） | 204 ＋ 116 | ＋18（「親」の字の増分） | 約 338 |

- **`c42039df` で数えた句**（機械、正確）: 「WBS の親」55、「WBS の子・子孫・祖先・兄弟・部分木」23、「親子判別」10、「親定義」10、`wbsParentUid` 46、ほかの `wbsParent*` 28（12 種）、`Row Area` 117、`chosenRows` 22。
- **基準から増えた所**（`CR-689`・`CR-690`・`CR-701`〜`CR-707`）: `HM-1`・`HM-7`・`HM-12`・`DU-1`・`DU-2`・`CY-3`・`CY-6`・`FO-5`〜`FO-7`・`MH-1`・`UN-16`・`EL-15`・`EL-20`・`GR-22`・`WF-2`〜`WF-4`・`FX-3`・`FX-6`・`EP-3`・`OP-10`・`NT-7`・`UF-73`・`LM-23`、表 T-368 の題「行見出しパネルの幅の欄」、表 T-367・表 T-369 の本文、`PR-15`（「WBS の親」）。
- 区分 b（変えない）の和文「行」は、機械の分類で 01-04 が 673、05-07 が 115、`_assets` が 261、`_source` が 220、開発規則が 398（どれも差はほぼ 0）。

### 3.2 `src`

| 何 | 一覧（`e39177b4`） | `c42039df` |
|---|---:|---:|
| 区分 a の複合の識別子（機械の分類） | 1,611 | 1,679（＋68） |
| 区分 a か b か決まらない複合名（機械の「other」） | 1,728 | 1,753（＋25） |
| 汎用の `row` / `rows`（X-12 で型を見て決める） | 2,212 | 2,215（＋3） |
| 名に `row` を持つ複合名と `wbsParent*` の種類 | — | 617 種 5,170 件（`wbsParent*` 1,288 件と、`rowId` 989 件などの区分 b を含む） |
| `wbsParentUid` | 1,077 | 1,078 |
| ほかの `wbsParent*` | 206 | 206（47 種） |
| 主な名: `rowTitlePanel*` | 84 | 115 |
| 主な名: `rowArea*` | 125 | 134 |
| 主な名: `rowTitlePanelWidth` を含む名 | 38 | 65（うち `rowTitlePanelWidthFixed` 22） |
| 主な名: `pasteTaskSubtree` ／ `pasteTaskGroupSubtree` | 10 ／ 4 | 10 ／ 4 |
| ファイル名 | 9 ＋ 2 | 11 |
| DOM の名（区分 a） | 39 件 | 15 種（2.6） |

### 3.3 `tests`

| 何 | 一覧（`e39177b4`） | `c42039df` |
|---|---:|---:|
| 試験のファイル | 491 | 545（＋54） |
| 区分 a の複合の識別子（機械の分類） | 2,562 | 2,719（＋157） |
| 決まらない複合名（機械の「other」） | 5,689 | 5,924（＋235） |
| 汎用の `row` / `rows` | 13,761 | 14,124（＋363。一覧の読みでは約 25% が区分 a） |
| 一覧の見込みの区分 a ＋ c（識別子） | 8,235 ＋ 1,008 | 約 9,600（±15%） |
| `wbsParentUid` | 1,243 | 1,247 |
| ほかの `wbsParent*` | 116 | 116（21 種） |
| 主な名: `rowTitlePanel*` ／ `rowArea*` ／ `rowGroupId` | 281 ／ 357 ／ 131 | 324 ／ 393 ／ 144 |
| 主な名: `pasteTaskSubtree` ／ `pasteTaskGroupSubtree` | 18 ／ 4 | 20 ／ 5 |
| 試験のファイル名（区分 a） | 41（一覧の問） | 57（変えない 8） |
| ⭐ **仕様の文を引く試験**（段 1 で同じコミットに直す） | 128 | 122〜197 本（下限 ＝ 「行見出し」「行名」「行軸」などの印か「WBS の親」の仲間を持ち、仕様を読む試験。上限 ＝ 素の「行」を持つものも含む） |

---

## 4. ⛔ 変えない語（例つき）

| 何 | 例 | 見分け方 |
|---|---|---|
| 仕様の表の行 | 「行 ID」「本行」「同行」「表 T-108 の行」「`XX-n` の行」、`_source/*.json` の鍵 `rowId`（仕様 526・`src` 989）と `rows`、`row-id-prefixes.json`・`tbl-row-id-prefixes.md`、`check-press-row-ids`・`PressRow` | 前に表の番号・行 ID が立つ。`rowId` は常に b |
| 文字の行 | 「1 行に収める」「改行」「行目」「空行」「複数行」「行頭」「行末」「行送り」、`textarea` の `rows`、CSS の `grid-row`・`grid-template-rows`・`row-gap` | 字の並びを数える |
| 字を含むだけの語 | 先行・実行・進行中・並行・平行・発行・刊行・走行・試行・移行・行列 | 2 字以上の熟語の中の「行」 |
| 動詞 | 「行う」「行い」「行った」「行わない」「もう一度行ってください」 | 「行」の後ろが仮名（う・い・っ・わ・え・お・か・き・く・け・こ） |
| タスクグループでない画面の表の行 | 検索の表の行（`readSearchRows`・`SearchRows`・`TaskSearchRow`）、プロパティパネルの欄の行（`fieldRow`・`data-field-row`）、パレット・アイコン・ヘルプの行（`commandRow`・`IconRosterRow`・`data-row`）、遅延診断レポートの表の行（`DelayReportRow`）、暦の例外日の行（「例外日の行を追加する」）、色の行（`isScheduleColourRow`・`MARK_COLOUR_ROWS`）、窓の題の行（`windowTitleRowElement`・「題の行」） | 部分に `search`・`field`・`icon`・`delay` などを持つ（2.5） |
| タスクグループの親 | `TaskGroup.parentId`、「親の行」「同じ親の下の並び」（→「親のタスクグループ」にはするが、「親タスク」にはしない） | 入れ子の親はタスクではない（X-9） |
| 状態機械・XML・トレースの「親」 | 「親 `shown` の升」「`xsd:all` の親」「要求の親」 | 文脈 |
| MSPDI の名 | `WBS`・`WBSMask`・`WBSMasks`・`WBSLevel`・`OutlineLevel`・`OutlineNumber`、要素名すべて、`mspdi-codec.ts` の `rowPath`・`rowsOf`（MSPDI のデータの行） | ⛔ MSPDI の名は決して変えない（`JDG-1668`） |
| 「WBS」という木の名 | 用語集 `G-6`「WBS: タスクの親子の木」、「WBS の深さ」「外部 WBS マスタ」、`Task.wbsOrder` | 11 節の問 3・問 4 |
| 型の引数 | `TableColumns<Row>`・`inGroupBlocks<Row>` | 総称の型の名 |
| 過去の事実 | 従来の日程管理ソフトの行（「1 行に 1 タスク」）、`previous-project-result/` のパスと `.row`、見本のフォルダ名 `33-wbs-parent-palette-icons`、rulings.md の逐語、`change-request/` の過去の CR | X-4・X-7 |
| 試験のファイル名（区分 b） | `cr-571-search-rows`・`cr-592-monochrome-greys-every-t-236-row`・`cr-606-the-panel-rows-follow-t-016`・`dfc-582-every-invariant-row-has-a-dictionary-entry`・`dfc-587-title-row-entries-are-drawn`・`cr-664-the-colour-rows-line-up-with-the-other-fields`・`cr-652-palette-rows-and-armed-label`・`cr-441-t-274-principles-and-rows-both-ways` | X-13 |

---

## 5. 継ぎ目（コード）

- 型・関数・定数・状態機械の名は 2.5 の規則で変える。生成物（`display-words.json`・状態機械の型・実体の型・アイコンとヘルプの名簿・プロパティの項目・MCP の説明・画像のプロンプト・スタートアップのテンプレート・スキーマの検証器・交換の形式）は段 1 の `npm run gen` と各生成器が追う。手で直さない。
- `src` のファイル 11 本は `git mv` で動かし、import の道は言語サービスの `getEditsForFileRename` で直す（`src` と `tests` の両方）。
- エージェント API: `agentApiVersion` を 2 に上げる（X-8）。MCP の取次の束（`.mcpb`）を作り直す。
- 新しい命令・新しい表・新しい辞書の語は無い。振る舞いは変えない。

---

## 6. グラフ

改名は語だけを変え、表の行・要求の間の辺を変えない。`impact.py` の種は表の行 ID であり、ID は 1 つも変わらない（`IC-141`・`IC-142`・`PR-15`・`CM-8`・`CM-18`・`U-22` などは番号を保つ）—— 誘導部分グラフは当てる前後で同じになることを、段 1 の後に `induced.py` で確かめる（`induced.py U-1 U-22 U-23 U-46 U-47 U-48 U-50 PR-15 IC-141 IC-142 CM-8 CM-18 K-71 K-143 G-6 A-2`、`A-2` だけが消える）。

---

## 7. 機械の手順（台本で置き換える。⛔ 見ないままの全体置換をしない）

⭐ 段 0（凍結の前に作れる）: 道具と対応表を作る。

1. **対応表の TSV** `rename-map.tsv`（作業ブランチの `docs/review/` に置く）: 1 行 ＝ 1 つの名。列は `old`・`new`・`kind`（spec-word / identifier / file / dom / json-key / api）・`class`（a / b）・`rule`（2.5 の順）・`files`・`count`・`decided-by`。`src`・`tests`・`docs/spec`・`tools` の名を 13 節の台本で全部拾い、2.5 の規則で `new` を埋め、b の既定と衝突に印を付ける。⛔ 人（調整役か判断の体）が全行を読んでから使う。`c42039df` で拾う種類は `src` 617・`tests` 921・仕様 100 である（`wbsParent*` は `src` 47・`tests` 21・仕様 12）。
2. **和文の句の表** `rename-phrases-ja.tsv`: 長い句から先に当てる（「行見出しパネル」→「タスクグループパネル」を「行見出し」より先に）。句は 2.1 と、一覧の 4〜5 節の区分 a のパターン（「この行」「その行」「配下の行」「畳んだ行」「ピン止めした行」「行を畳む」「行に載る」「行の帯」「行の木」「行の高さ」「行の色」「行の操作子」…）。
3. **素の「行」の読み票** `rename-lines-ja.tsv`: 句の表で決まらない「行」を 1 行 ＝ 1 か所（ファイル・行番号・前後 20 字）で並べ、`decision` 列に「タスクグループ」「タスク（`JDG-1664`）」「残す」「書き換え（文を渡す）」のどれかを書く。⭐ 読み票は持ち場（ファイルの行の範囲）ごとに別の体が埋めてよい —— 書くのは 1 本の適用の台本だけなので、同じファイルでも衝突しない。助詞の直し（「1 行」→「1 つのタスクグループ」）は「書き換え」で文ごと渡す。
4. **適用の台本** `apply_rename.py`: 2 と 3 の TSV を読み、決めた所だけを書き換える。決まっていない行が 1 つでも残れば何も書かずに止まる。CRLF は多数派に合わせ、置き換えの前後で CRLF の数を比べる。
5. **識別子の改名** `rename_symbols.mjs`: TypeScript の言語サービス（`node_modules/typescript`）で、1 の TSV の a の行ごとに宣言を探し `findRenameLocations` で参照ごと変える（`src` と `tests`、X-11）。文字列・注釈・JSON・CSS・HTML は 1 の TSV の名を語の継ぎ目で当てる正規表現で変える（部分文字列にしない）。汎用の `row` / `rows` は型を問うて `TaskGroup`・`TaskGroupPlacement` のときだけ（X-12）。
6. **残りの数え直し**: 各段の後に 13 節の台本を回し、区分 a の印（「行見出し」「行名」「行軸」「WBS の親」、`rowTitle`・`rowArea`・`wbsParent`）が 0、素の「行」が読み票の「残す」の数と等しいことを確かめる。

| 語 | 決め |
|---|---|
| 行う・行い・行った（動詞） | 触らない —— 「行」の後ろの仮名で外す（4 節） |
| 行見出しパネル | タスクグループパネル（「行見出し」より先に当てる） |
| 行見出しツリー | タスクグループ見出しツリー |
| 行見出し（箱） | タスクグループ見出し。ただし「行見出しの名前」はタスクグループ名 |
| 見出しの行（窓・パネルの題の帯） | 触らない（b） |
| 行名・行の名前・行タイトル | タスクグループ名 |
| 行 ID・本行・同行 | 触らない |
| 1 行・各行・全行 | 読み票で 1 つずつ（表の行か、文字の行か、タスクグループか） |
| 行軸（縦）・行の軸・行ズーム | 縦軸・縦軸のズーム |
| 行の高さ・行高・行の帯 | タスクグループの高さ・タスクグループの帯 |

---

## 8. 段・凍結・確かめ・見積もり

⭐ 1 本の作業ブランチ（例 `rename/task-group`）で 3 段を当て、段ごとにコミットする。段と段のあいだの赤は許し（X-10）、数を記録する。`main` へは段 3 の後に全部が緑で 1 度だけ早送りする。

⛔ **書き込みの凍結**: 段 1 の始めから `main` への早送りまで、ほかの席は `docs/spec`・`src`・`tests`・`tools` の生成器を書かない。台帳（`docs/development-records/`）への書き込みは続けてよいが、新しい行は新しい語で書く。凍結の前に、走っている体を区切りのよい所で止める（中途で止めない）。

| 段 | 何をする | 終わりに確かめること | 見込み（実時間） |
|---|---|---|---|
| 0（凍結の前） | 7 節の 1〜5 の道具と TSV を作り、TSV を読む | 道具が `c42039df` の写しの上で「決まっていない行」を数えて止まること | 3〜4 h（＋ 調整役の確認 1 h） |
| 1 仕様 | `docs/spec` の原稿と画面の語・用語集・開発規則を置き換え、`npm run gen`、スキーマの版を上げ、仕様の文を引く試験（122〜197 本）と `src` の注釈の引用（check 42）を同じコミットで直す | `npm run gen:check` 0、各生成器の `--check` 0、`strictdoc export docs/spec` の後 `rm -rf output`、check.sh（仕様の側の検査が緑。`src` の生成物の名の変化による `typecheck` の赤は数を記録して次の段へ渡す）、仕様を引く試験の `vitest` が緑、6 節の `induced.py` が当てる前と同じ、13 節の台本で仕様の区分 a の印が 0 | 7〜8 h（読み票を 4 つの体で分ける） |
| 2 `src` | 7 節の 5 で識別子を改名（参照する `tests` も）、ファイル 11 本を動かし、DOM の名・文字列・注釈・名簿の JSON を直し、`agentApiVersion` を 2 に、`.mcpb` を作り直す | `npm run typecheck` 0、`npm run build` 0、check.sh（function-size などの基準値はパスの変化だけを調整役が直す）、`vitest` の `tests/unit`（錠の下）、13 節の台本で `src` の区分 a の印が 0 | 5〜6 h（層ごとに 3 つの体） |
| 3 `tests` | 試験だけが持つ名（ファイル 57 本、固定データの鍵、DOM のセレクタ、注釈、`readDocumentRowIds`）、`tests/known-red.txt`、`npm run gen:tests`、リポジトリの中の GRS 文書（11 節の問 6）、基準値のパス（調整役） | `npm run typecheck` 0、`vitest` の全体（錠の下、既知の赤だけ）、`playwright`（錠の下）、check.sh 0、`privacy_count.py`、13 節の台本の最終の数 | 6〜7 h（`unit` ／ `contract` ／ `system`・`usecase` の 3 つの体） |
| 締め | `dist/index.html` を作り直し、利用者の確かめの一覧を作る | 利用者が本物の画面で語を見る（`JDG-1340` の道で調整役が頼む） | 1〜2 h |

- **計**: 実時間で約 22〜27 時間、凍結は段 1〜3 の約 18〜21 時間。体の時間の和は約 40〜50 時間。`JDG-1662` に答えた「実時間 1〜2 日」の上の端にあたる —— 差は、測り直しで仕様を引く試験が 128 から最大 197 本に増えたことと、`tests` の汎用語を型で分ける手間である。
- **並べ方**: 段 1 は 01-04 を章で 2 つ、05-07 と `_assets` で 1 つ、`_source` と画面の語と開発規則で 1 つ —— 4 つの体が読み票を埋め、適用は 1 回。段 2 は `entity` ／ `use-case`・`adapter` ／ `framework` で分けるが、言語サービスの改名は 1 つの体が 1 回で回す（参照が層をまたぐ）。段 3 は試験の木で分ける。

---

## 9. 仕様の外で直すもの

- `src`・`tests`・`tools`・`.claude/skills/spec-graph-check/*.py` の名指し（`list-inverted-authority.py`・`check-repeated-expressions.py` など）。
- 基準値のファイルのパス（function-size 9・comment-rules-tests 17・twin-comments 7・crossing-names 2・quoted-source 1・repeated-expressions 1）—— 名だけを変え、数は変えない（`JDG-520`、調整役）。
- `docs/development-records/perf-pending.md` の 10 行と `test-inventory.md`（生成）—— パスの名だけ。
- `docs/guides/schedule-to-grs-json/`（skeleton と prompt の和英）—— 文書の形が変わるので check の `check-guide-grs-json.py` が見る。
- 毎フレームの経路は語と名だけが変わり、仕事は変わらない —— `perf-pending.md` に行を足さない（測り直しは要らない）。

---

## 10. ⛔ この変更でやらないこと ・ 触れ合うもの

- 振る舞い・表の行・行 ID・番号は変えない。表の番号（`T-368` など）も変えない —— 題の語だけを変える。
- 旧形式の読み替えを作らない（`JDG-1663`）。
- MSPDI の名を変えない。
- 履歴を改名しない（X-4）。
- 触れ合う: `CR-699`（下書き、スキーマ）・`CR-433`（止めてある、編集グループ）—— 凍結の間は当てない（11 節の問 9）。

---

## 11. 利用者に問うこと（推奨つき）

| 問 | 何を | 推奨 | 理由 |
|---|---|---|---|
| 1 | `CM-8` `pasteTaskSubtree` の新しい名（`CR-706` X-3）。`CM-28` `pasteTaskGroupSubtree` はどうするか | `CM-8` は `pasteTasks`、`CM-28` は変えない | `CM-8` は選んだ `Task` だけを写す（`DU-1`）—— 部分木ではない。`CM-28` は今も配下のタスクグループを写す（`DU-2`）—— 名と中身が合っている |
| 2 | `CM-18` `setTaskWbsParent` の新しい名 | `setTaskParentTask` | 表 T-108 の名は「set ＋ 実体 ＋ 列」（`setTaskName`・`setTaskNotes`）。列が `parentTaskUid` なので `setTaskParentTask`。`setParentTask` は実体の名が抜ける |
| 3 | `Task.wbsOrder`（`src` と `tests` で 2,145 件。`AT-26`「同じ親の下での並び」）を変えるか | 変えない | `JDG-1666` の名指しは `wbsParent*` だけ。並びは WBS の木の順であり、木の名「WBS」は残る（問 4） |
| 4 | 木そのものの名「WBS」（`G-6`、「WBS の深さ」、`A-1` ②、`A-4`）を残すか | 残す。`G-6` の説明は「親タスクと子タスクの木。`Task.parentTaskUid` が持つ。MSPDI へ書き出す」 | `JDG-1668` が変えたのは「WBS の子・子孫…」の仲間であり、木の名ではない。WBS は MSPDI と MS Project の語 |
| 5 | 行 ID の接頭辞 `WL` の語「WBS Link」 | 語を「Parent Task Link」に、文字 `WL` は変えない | 行 ID は変えない（6 節）。語だけを揃える |
| 6 | リポジトリの中の GRS 文書（`sample-schedule/Three-Year Product Plan.json`、`docs/guides/schedule-to-grs-json/grs-skeleton.json`、`previous-project-result/38-project-progress/*.json` の 4 本） | 段 3 で鍵 3 つと版を同じ対応表で書き換える。ほかの `previous-project-result/` は残す | 改名の後は開けなくなる。アプリの読み替えではなく、データの直しである。進捗の文書は利用者が今も使う |
| 7 | 利用者の手元の文書（リポジトリの外） | 段 1 の前に「改名の後は開けない」と告げる。直す道具は求められたときだけ渡す | 稼働前で読み替えを作らない（`JDG-1663`）。MSPDI で書き出して読み直せば WBS は運べる |
| 8 | 設定の鍵 `rowTitleFont` などの新しい名 | `JDG-1663` の綴り（`taskGroupTitleFont`・`taskGroupTitleIndent`・`taskGroupTitleTopScale`）のまま | 案 A（`JDG-1662`）で「見出し」は箱であり、字の大きさ・インデント・倍率は箱の見た目の値である。和名は「タスクグループ名の文字」のまま |
| 9 | 凍結の時期と、`CR-699`（下書き）・`CR-433`（止めてある）との順 | `CR-699` を先に当てるか、改名の後に回す。同時に当てない | どちらも `grs-document.schema.json` と版を動かす |

---

## 12. 台帳

| 行 | 何 | 本書での扱い |
|---|---|---|
| `JDG-1659`〜`JDG-1668` | 一覧への 10 の答え | 状態を「指示 —— `CR-708` が当てる（下書き。時期と持ち場は調整役が決める）」にした |
| `JDG-1614` | `PR-15` の見出し | 同じ（`JDG-1666` の一部の覆りの印は残した） |
| `JDG-1570`・`JDG-1652` | 改名そのもの | 触らない（当てる段で 適用済 にする） |
| `DFC-2174` | 1 つの概念に 2 つの名 | 触らない（段 3 の後に閉じる） |

---

## 13. 測り方の再現

```
# the tree: worktree at c42039df; the survey base e39177b4 extracted beside it
git merge --ff-only c42039df
git grep -n "CR-708" c42039df -- .                                   # 0 lines
git archive -o <scratch>/old.tar e39177b4 docs src tests             # then tar -xf into <scratch>/old
PYTHONIOENCODING=utf-8 python docs/review/rename-row-to-task-group-remeasure.py <scratch>/old .
#   per area: ja-row a / b / open / verb, en-row a / b / generic / other,
#   wbs ident (wbsParentUid apart), wbs prose, and named counts; third column = delta
git diff -U0 e39177b4 c42039df -- docs/spec | grep -E "^\+[^+]"      # new uses since the survey (3.1)
git ls-files src tests docs/spec | grep -iE "(^|[/-])rows?([-.]|$)|wbs-parent"   # file names (2.6)
grep -rnoE "data-[a-z-]*row[a-z-]*" src                               # DOM names (2.6)
```

- 機械の分類は `docs/review/rename-row-to-task-group-remeasure.py` の `ja_class` と `en_class` である。⚠️ 和文の「open」（素の「行」）は機械では分けられず、元の一覧は行を読んで分けた —— 本書の見込みは、元の一覧の数に機械の差を足したものである（X-1）。
- 仕様を引く試験の 122〜197 本は、`tests` の `.ts` のうち、仕様を読む印（`docs/spec`・`01-04-requirements`・`display-words.json`・`STATEMENT` など）を持ち、かつ区分 a の印（下限）か素の「行」（上限）か「WBS の親」の仲間か `Row Title Panel` などの英名を持つファイルの数である（作業木の外の使い捨ての台本で数えた）。
