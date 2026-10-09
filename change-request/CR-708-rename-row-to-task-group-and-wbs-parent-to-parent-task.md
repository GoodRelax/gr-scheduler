# CR-708 —— 「行」をタスクグループへ、「WBS の親」を親タスクへ改名する（名前の対応表と 3 段の計画）

> 状態: ⭐ **当てた** —— 2026-10-09、調整役の作業木の体が枝 `rename/task-group` で `2d59c7c8`〜`e1945a24` と台帳のコミットに当てた（`JDG-1771`）。当てる順は `docs/review/rename-lanes-cr708.md` の 7 節。
> 起草の状態（当てる前の記録）: **下書き（当てていない）**。2026-10-08、作業木 `c42039df` の上で起草した。2026-10-09、作業木 `d32b2b4a` の上で、`JDG-1731`（接頭辞 `WL` → `PTL`）・`JDG-1732`（追従する GRS 文書）・`CR-712` の着地（知らせの名簿の原稿）に合わせて書き直し、数を測り直した（3 節。測り方は 13.2 節）。`docs/spec`・`src`・`tests` には何も当てていない。⛔ 凍結は利用者が「やれ」と言ったときにだけ始める（`JDG-1726`）。⛔ ほかのどの変更とも束ねない（`JDG-1735`）。いつ・どの持ち場で当てるかは調整役が決める（8 節）。
> ID の帯: 番号 `CR-708` を調整役から受けた。使ったのは `CR-708` の 1 つだけ。`c42039df` の木で `CR-708` を名乗る所は 0 件だった（13 節）。新しい表・表の行・`DFC`・`JDG`・`PND` の番号は使わない。
> 当てる裁定: `JDG-1570`（行 → タスクグループ）・`JDG-1652`（WBS の親 → 親タスク、同じ時期に）・`JDG-1614`（`PR-15` の見出し）・`JDG-1659`〜`JDG-1668`（一覧への 10 の答え、すべて推奨のとおり）・`JDG-1697`（プロパティパネルの英語の項目名は小文字）・`JDG-1727`〜`JDG-1734`（11 節の問 1〜8 への答え）。調整役が従う裁定は `JDG-1726`（始める時機）・`JDG-1735`（束ねない）。覆す裁定は `JDG-1062` ③ の呼び名（親子判別・親定義）—— `JDG-1667` が既に覆している。`JDG-1614` の「列の名 `wbsParentUid` は変えない」は `JDG-1666` が既に覆している。
> 元の一覧: `docs/review/rename-row-to-task-group-2026-10-08.md` と同名の `.tsv`（基準 `e39177b4`、1,667 パターン）。本書の数は `c42039df` で測り直し（13.1 節）、2026-10-09 に `d32b2b4a` で再び測った（3 節。測り方は 13.2 節）。

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
| `JDG-1726` | 「俺が指示したらやれ。」 | 凍結（8 節）は利用者の指示で始める。調整役は軽い案件を片づけた後に時機を提案する |
| `JDG-1727` | 「問 2:-1: pasteTasks」 | `CM-8` `pasteTaskSubtree` → `pasteTasks`、`CM-28` は変えない（2.4・11 節の問 1） |
| `JDG-1728` | 「問 2-2:  setTaskParentTask」 | `CM-18` `setTaskWbsParent` → `setTaskParentTask`（11 節の問 2） |
| `JDG-1729` | 「MSPDIで wbsOrder やwbs って言葉使ってるなら、wbsOrder  でOK。」 | `Task.wbsOrder` は変えない（11 節の問 3） |
| `JDG-1730` | 「問 2-4 木の名 WBS: 残す」 | 木の名「WBS」（`G-6`・「WBS の深さ」）は残す（11 節の問 4） |
| `JDG-1731` | 「PTL でよい」 | 接頭辞 `WL`（WBS Link）→ `PTL`（Parent Task Link）、番号はそのまま（2.7・11 節の問 5） |
| `JDG-1732` | 「デフォルトの組み込みのJSONだけ追従しろ。」 | 追従は組み込みの起動テンプレートと `grs-skeleton.json` だけ。進捗の文書と `Three-Year Product Plan.json` は書き直さない（8 節・11 節の問 6） |
| `JDG-1733` | 「問 2-7: 改名の後は開けない」 | 利用者の手元の旧い文書は開けない。読み替えも変換の道具も作らない（11 節の問 7） |
| `JDG-1734` | 「問 2-8 設定の鍵の綴り: 推奨: このままでOK.」 | 鍵は `taskGroupTitleFont`・`taskGroupTitleIndent`・`taskGroupTitleTopScale`（2.2・11 節の問 8） |
| `JDG-1735` | 「問 2-9 ほかの変更と束ねない。 絶対ダメ。」 | 改名はほかの変更と同じ枝・同じコミットに載せない。凍結の間はほかの CR を当てない（10 節・11 節の問 9） |

### 0.2 裁定の鎖（rulings.md を「行」「タスクグループ」「WBS の親」「親タスク」「部分木」「読み替え」で引いた）

| 裁定・変更要求 | 何を決めたか | 本書との関係 |
|---|---|---|
| `JDG-1062` ③ | パレットのアイコンの名「親子判別」「親定義」 | `JDG-1667` が覆した（覆された印は rulings.md に既にある）。本書は新しい名だけを当てる |
| `JDG-1697` | プロパティパネルの英語の項目名は小文字 | `PR-15` の英語は "parent task"（`JDG-1614` の "Parent task" ではない） |
| `CR-690` | `K-71`・`K-143` の和名を既に「タスクグループパネルの幅」とした。`PR-18` は既に「タスクグループ名」 | 和名は変えない。鍵 `rowTitlePanelWidth`・`rowTitlePanelWidthFixed` だけを変える |
| `CR-706` X-3 | 命令の名 `pasteTaskSubtree`・`pasteTaskGroupSubtree` は変えず、名と中身の食い違いを改名の CR へ送った | 2.4 と 11 節の問 1 で扱う |
| `JDG-601`・`JDG-1691`・`JDG-1678` | 公式運用の宣言の前は、古い形の文書を読み替えずに拒む。運用開始の版は null | `wbsParentUid` を持つ文書は版によらず拒む（2.3）。表 T-297 に行を足さない |
| `CR-699`（適用済）・`JDG-1740` | 形式の版は着地の時刻（RFC 3339 UTC、20 字）。変更の台帳 `grs-json-changes.json` は `S-541` が null のあいだ空のまま。正式公開は少なくとも分刻みの日程などの後 | 版だけを上げ、台帳には足さない（2.3） |
| `CR-712`（適用済） | 表 T-233・表 T-234 の行を `docs/spec/_source/notice-reasons.json` へ移し、語は `display-words.json` に残した。新しい語は既に「タスクグループ」と書く | 2 つの表の書き換え先を原稿 2 つに替える（2.8） |
| `CR-713`・`CR-714`（適用済、`JDG-1736`・`JDG-1737`） | 「写し」→「コピー」。コピーは親子の結びを持ち越さない | 本書の語もコピーと書く。`CM-28` の中身（配下のタスクグループもコピーする、`DU-2`）は変わらない（2.4） |

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
| X-3 | 縦のズームのコード名は `vertical*`（`verticalZoom*`・`vertical-axis`）とし、`zoomY*` にはしない | `zoomY` は既に設定の鍵の名であり、軸の名には画面の語「縦軸」をそのまま使う | 無い |
| X-4 | 履歴は改名しない —— `docs/development-records/`・`change-request/`・`docs/review/`・`previous-project-result/` の名と文、rulings.md の逐語 | 逐語は 1 文字も変えない。過去の成果物の名は過去の事実 | 古い文書を読むときは本書の対応表を引く |
| X-5 | 表 T-006b の `A-2` を消す。`A-1` ③・`A-3`・`A-4` は語を変えて残す | 一覧の 3.1 節。語が 1 つになると `A-2` が守るものが無い | 無い |
| X-6 | 図 `fig-hit-stacked-row.svg` は `fig-hit-stacked-task-group.svg` にする（中身は変えない） | 一覧の 3.1 節 | 無い |
| X-7 | 設定値の行が指す見本のフォルダ名（`33-wbs-parent-palette-icons`・`11-row-controls` など）は変えない | X-4 と同じ —— 過去の成果物の住所 | 識別子の中に古い名が残る（7 節の除外の表に載せる） |
| X-8 | `agentApiVersion` を 1 → 2 に上げる | 表 T-035 の `AG-1`「非互換な変更で上げること」 | 無い |
| X-9 | `TaskGroup.parentId`（タスクグループの親）は変えない。「親タスク」はタスクの親だけを指す | タスクグループの入れ子の親はタスクではない | 無い |
| X-10 | 改名は 1 本の作業ブランチで行い、段と段のあいだの赤（型・試験）を許す。`main` へは 3 段が緑になってから 1 度だけ早送りする | 生成物が仕様から作られるので、段 1 で `src` の生成物が変わり型が赤になるのは避けられない | 凍結の間（8 節）は他の作業が止まる |
| X-11 | 段 2 の識別子の改名は TypeScript の言語サービスの改名で行い、`tests` の中の参照も同じ一手で直す。段 3 は試験だけが持つ名を直す | `tsconfig.json` の `include` が `src` と `tests` の両方を持つ —— 同じ記号の参照を 2 回に分けると、段 2 の後の型が赤のまま残る | 段 2 の差分に `tests` のファイルが入る |
| X-12 | 汎用の局所名 `row` / `rows` は、型が `TaskGroup`・`TaskGroupPlacement`（旧 `RowPlacement`）のときだけ改名する。それ以外は残す | 型を見て決めれば、検索の行・表の行を巻き込まない（元の一覧の 0.1 節で、試験の汎用語の分けは ±15%） | 型を持たない JS の中の `row` は手で読む |
| X-13 | 名前が「行」でも中身が TaskGroup でない試験のファイル名 14 本は変えない（`cr-571-search-rows` など。`c42039df` の 8 本に、`d32b2b4a` までに足された 6 本を加えた。4 節） | 区分 b | 無い |
| X-14 | 表 T-233・表 T-234 の書き換え先は原稿の `docs/spec/_source/notice-reasons.json`（場面・正・名の升）と `docs/spec/_source/display-words.json`（行 ID を鍵とする語）だけとする。生成物の `docs/spec/_assets/tbl-notice-reasons.md` と `src/use-case/advance-screen-session/notice-values.ts` の生成の区画は `npm run gen` が追う | `CR-712` が 2 つの表を名簿の原稿へ移した。生成物を手で直さない | 無い |
| X-15 | `WL-n` → `PTL-n` は、生きている仕様・コード・試験・道具だけで書き換える。履歴（`docs/development-records/`・`change-request/`・`docs/review/`）の `WL-n` は残し、本書の 2.7 の対応表で引く。生成物（`test-inventory.md`・`dist/index.html`）は生成が追う | `JDG-1731`「履歴の `WL-n` は書き換えない」・X-4 | `docs/development-records/` の 5 本 41 か所（rulings.md・changelog.md・defects.md の `DFC-1850`・`DFC-1852`・`DFC-2192`・pending-decisions.md の `PND-800`・perf-pending.md の 120 番）は古い番号のまま |
| X-16 | 手引き（`grs-skeleton.json` と prompt の和英）と、起動テンプレートの生成器 `tools/generate_startup_template.py` の鍵の字面 7 か所と `SCHEMA_VERSION` は、段 1 でスキーマと同じコミットに直す（下書きは段 3 だった） | 検査 75 が手引きをスキーマで検める。テンプレートはスキーマから作る試験が読む —— 段 3 まで待つと段 1 から赤い | 段 1 の差分に `tools` と `docs/guides` のファイルが入る |
| X-17 | `JDG-1732` が名指す試験 2 本のうち、`tests/contract/dfc-378-a-write-that-changed-nothing-answers-the-same-document.test.ts` は読み先を替えない —— 測ると、この試験はファイルを読まず、題の文字列 `Three-Year Product Plan` を借りて文書を試験の中で組み立てる。中の鍵（`rowTitlePanelWidth` など）は段 2 の改名が追う | 替える読み先が無い | 無い（11 節の問 6 に記す） |
| X-18 | 表 T-108 の命令 `CM-67` `setRowTitlePanelWidth`・`CM-91` `setRowTitlePanelWidthFixed` も 2.5 の規則 2 で改名する（下書きの 2.4 は落としていた） | `JDG-1665`「すべて変える」。`applyCommands` が受ける命令の名である | 公開の名の変化が 4 から 6 になる |

---

## 1. 範囲 —— 行き先

| 何 | どこ | 段 |
|---|---|---|
| 画面の語（和・英） | `docs/spec/_source/display-words.json` → 生成で `src/adapter/screen-renderer/display-words.json` | 1 |
| 仕様の和文・英文 | `docs/spec/01-04-requirements.md`・`05-07-design.md`・`_assets/*.md`・`_source/*.json`・`_source/*.md` | 1 |
| 用語集 | 表 T-006b（`A-2` を消す）、`tbl-glossary.md` の `U-1`・`U-22`・`U-23`・`U-46`〜`U-48`・`U-50`、`K-12`・`K-36`〜`K-38`・`K-70`・`K-71`・`K-99`・`K-111`・`K-120`・`K-140`・`K-143`、表 T-108 の `CM-8`・`CM-18`・`CM-19`・`CM-26`〜`CM-32`・`CM-67`・`CM-91` の語、`G-6` | 1 |
| 知らせの名簿（表 T-233・表 T-234） | 原稿 `docs/spec/_source/notice-reasons.json`（場面・正・名の升）と `docs/spec/_source/display-words.json`（`RS-n`・`QN-n` を鍵とする語）—— 生成で `_assets/tbl-notice-reasons.md` と `notice-values.ts` の区画（X-14、2.8） | 1 |
| 行 ID の接頭辞 `WL` → `PTL` | 表 T-351 の 17 行（`01-04-requirements.md`）、登録 `_source/row-id-prefixes.json`、引く所（2.7） | 1（仕様）・2（`src`・`tools`）・3（`tests`） |
| 開発規則 | `docs/development-rules/*.md`（和 約 30・英 15 程度） | 1 |
| `GRS JSON` のスキーマと版 | `_source/erd.json` → `grs-document.schema.json`、`tools/generate_startup_template.py` の `SCHEMA_VERSION` | 1 |
| 仕様の文を引く試験と、`src` の注釈の引用（check 42） | `tests/**`・`src/**` の注釈 | 1 |
| `src` の識別子・ファイル名・DOM の名・文字列・注釈 | `src/**`（参照する `tests` を含む、X-11） | 2 |
| 道具 | `tools/**`（生成器・探り針の例 `row-controls-press-all.mjs` など。区分 a の名 36 種 98 件、`wbsParent*` 5 種 17 件、`WL-n` 2 件 —— 13.2 節）、`.claude/skills/spec-graph-check/*.py` の名指し | 2 |
| 試験だけが持つ名 | 試験のファイル名、固定データの鍵、DOM のセレクタの文字列、注釈、`tests/known-red.txt`、生成の `test-inventory.md` | 3 |
| リポジトリの中の GRS 文書（`JDG-1732`） | ⭐ 追従する: 組み込みの起動テンプレート（`tools/generate_startup_template.py` が作る `src/framework/single-html-shell/startup-template.json`）と手引き `docs/guides/schedule-to-grs-json/`（`grs-skeleton.json` と prompt の和英）—— 段 1（X-16）。⛔ 書き直さない: `previous-project-result/38-project-progress/*.json` の 5 本と `sample-schedule/Three-Year Product Plan.json`（改名の後は開けなくてよい） | 1 |
| 見本を読む試験（`JDG-1732`） | `tests/contract/dfc-2228-a-document-without-the-export-span-opens.contract.test.ts` の見本の場合を組み込みのテンプレートへ替える。`tests/contract/dfc-378-a-write-that-changed-nothing-answers-the-same-document.test.ts` は替えない（X-17） | 3（段 1 で先に替えてよい、8 節） |
| 基準値のファイルの行 | 改名するパス・区分 a の名・`wbsParent*` を持つ行 45（comment-rules-tests 16・twin-comments 12・function-size 10・crossing-names 3・literal-restatement 1・quoted-source 1・repeated-expressions 1・ruling-landed 1 —— 13.2 節。下書きの 37 は別の数え方） | 3（調整役、`JDG-520`） |

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

- **形式の版を上げる**: `tools/generate_startup_template.py` の `SCHEMA_VERSION`（`d32b2b4a` で `2026-10-08T03:13:21Z`。`FR-073` の書式 —— 着地の時刻、RFC 3339 UTC、秒まで、20 字）を、段 1 のコミットの時刻へ上げる。スキーマの `const` は生成器が読む（`CR-643`）。生成でテンプレート・空の文書・画像からのプロンプトの版の行が追う。手引きの `grs-skeleton.json` の `schemaVersion` は手で同じ値にする（X-16、検査 75）。
- **旧形式の読み替えは作らない**（`JDG-1663`・`JDG-1733`、稼働前）。表 T-297 に行を足さない。`json-codec.ts` に読み替えを足さない。
- **変更の台帳に足さない**: `CR-699` は着地した（`886740a0`）。台帳 `docs/spec/_source/grs-json-changes.json` は、表 T-206 の `S-541`（公式運用を始めた版）が `null` のあいだ空のままであり、足すと検査 76 が赤い。`d32b2b4a` で `S-541` は `null` である。⚠️ ほかの変更と同時に当てない（`JDG-1735`）。

### 2.4 エージェント API・MCP で公開している名

| 何 | 旧 | 新 | 備考 |
|---|---|---|---|
| `readDocument`・`exportJson` が返す文書の列 | `wbsParentUid` | `parentTaskUid` | 2.3 と同じ |
| `readSelection` の `ItemRef` の `kind` | `'wbsParentLink'` | `'parentTaskLink'` | `src/entity/document-model/selection/selection.ts` |
| `applyCommands` の命令 `CM-18` | `setTaskWbsParent` | `setTaskParentTask` | `JDG-1728`（11 節の問 2） |
| `applyCommands` の命令 `CM-8` | `pasteTaskSubtree` | `pasteTasks` | `JDG-1727`（11 節の問 1、`CR-706` X-3） |
| `applyCommands` の命令 `CM-28` | `pasteTaskGroupSubtree` | 変えない | `JDG-1727`。表 T-223 の `DU-2` は今も配下のタスクグループをコピーする —— 名は中身と合っている |
| `applyCommands` の命令 `CM-67` | `setRowTitlePanelWidth` | `setTaskGroupPanelWidth` | 2.5 の規則 2（X-18） |
| `applyCommands` の命令 `CM-91` | `setRowTitlePanelWidthFixed` | `setTaskGroupPanelWidthFixed` | 2.5 の規則 2（X-18） |
| `agentApiVersion` | 1 | 2 | X-8 |
| MCP の道具の説明（生成） | 「タスクが載る行と祖先を開き」など | タスクグループ | `generate_mcp_tool_descriptions.py` が追う。`npm run build:relay` で `.mcpb` を作り直す |
| `readSearchRows` | — | 変えない | 検索の表の行（区分 b） |

⚠️ `JDG-1665` の問いは `rowGroupId`・`chosenRows`・`readDocumentRowIds`・`kind: 'row'` を「AI に公開しているエージェント API の名」と書いたが、測ると 4 つともエージェント API のメンバではない —— `rowGroupId` はシェルの押しの値（`src` 40）、`chosenRows` は状態機械の値（仕様 22・`src` 54）、`readDocumentRowIds` は試験 `tests/system/three-rows-read-from-the-spec-alone.test.ts` の補助（6）、`kind: 'row'` は画面の状態の選択の種類（`src` 6）である。裁定どおり 4 つとも改名する（2.5）。公開の名で実際に変わるのは上の表の 6 つ（列・`kind`・命令 4 つ）である（`d32b2b4a` で数え直した。下書きは `CM-67`・`CM-91` を落として 4 と書いた —— X-18）。4 つの数は `d32b2b4a` でも同じである（13.2 節の台本の `named` の行）。

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
- **衝突を見る**: 新しい名が同じファイルや同じ型に既にあるときは置き換えず、TSV に印を付けて人が決める。`c42039df` で `taskGroupId`・`TaskGroupPlacement`・`taskGroupTree`・`taskGroupName`・`taskGroupArea`・`parentTask`・`parentTaskUid`・`pasteTasks`・`taskGroupPanel`・`taskGroupTitle`・`chosenTaskGroups`・`verticalZoom`・`parentTaskLink` は `src`・`tests` に 0 件だった。`d32b2b4a` でも 0 件である（語の境界で数えた、13.2 節）。

### 2.6 ファイル名・DOM の名

| 種 | 旧 → 新 | 数 |
|---|---|---|
| `src` のファイル | `mspdi-imported-rows.ts` → `mspdi-imported-task-groups.ts`、`row-grab.ts` → `task-group-grab.ts`、`row-tree-entrances.ts` → `task-group-tree-entrances.ts`、`row-title-panel.ts` → `task-group-panel.ts`、`row-names.ts` → `task-group-names.ts`、`drawn-rows.ts` → `drawn-task-groups.ts`、`row-scroll.ts` → `task-group-scroll.ts`、`row-title-panel-drawing.ts` → `task-group-panel-drawing.ts`、`row-band-ceiling-cache.ts` → `task-group-band-ceiling-cache.ts`、`wbs-parent-arrows.ts` → `parent-task-arrows.ts`、`wbs-parent-hold.ts` → `parent-task-hold.ts` | 11 |
| 仕様の図 | `fig-hit-stacked-row.svg` → `fig-hit-stacked-task-group.svg`（X-6） | 1 |
| 試験のファイル | 名に区分 a の `row` / `rows` / `wbs-parent` を持つもの（例 `t-051-hf-15-grabbing-a-row.test.ts` → `t-051-hf-15-grabbing-a-task-group.test.ts`、`cr-631-wbs-parent-hits-and-hands.test.ts` → `cr-631-parent-task-hits-and-hands.test.ts`、`tests/fixtures/row-name-font.ts` → `tests/fixtures/task-group-name-font.ts`）。`d32b2b4a` で型に当たる 76 本から区分 b の 14 本（X-13）を除いた数 | 62（`c42039df` は 57） |
| 試験のファイル（接頭辞） | `tests/unit/wl-16-the-parent-link-answers-a-press-as-a-jump.test.ts` → `tests/unit/ptl-16-the-parent-link-answers-a-press-as-a-jump.test.ts`（2.7） | 1 |
| DOM の `data-*` | `data-row-grab`・`data-row-folding-grid`・`data-row-control-pair`・`data-row-control-ground`・`data-folded-rows`・`data-can-add-child-row`・`data-shown-on-another-row` → `task-group` の綴り | 7 |
| DOM の `data-role` の値 | `Row Title Panel`・`Row Title Tree`・`Pinned Row`・`Row Expander`・`Row Pin`・`Row Title` → 2.1 の新 英 | 6 種 |
| DOM の `id` と `class` の頭 | `` `row-${groupId}` `` → `` `task-group-${groupId}` ``、`wbs-parent-` → `parent-task-` | 2 |

### 2.7 行 ID の接頭辞 `WL` → `PTL`（`JDG-1731`）

⚠️ 下書きは「行 ID は変えない」「文字 `WL` は変えない」と書いた（6 節・11 節の問 5）。`JDG-1731` がそれを覆した —— 接頭辞を `PTL`（Parent Task Link）に替え、番号は保つ。`PT` は既にある `PTD` の頭になるので使わない。`PTL` は `d32b2b4a` で表 0・仕様・`src`・`tests` の参照 0（`git grep -E "\bPTL\b|PTL-[0-9]"` の当たりは rulings.md と handoff.md の文だけ）。

| 何 | 旧 → 新 | 数（`d32b2b4a`） |
|---|---|---|
| 表 T-351 の行（`docs/spec/01-04-requirements.md`） | `WL-1`〜`WL-17` → `PTL-1`〜`PTL-17`（番号はそのまま。欠番なし） | 17 行 |
| 接頭辞の登録（`docs/spec/_source/row-id-prefixes.json`、生成で `_assets/tbl-row-id-prefixes.md`） | `prefix` `WL` → `PTL`、語 `WBS Link` → `Parent Task Link`、説明「WBS の親を結ぶ・外す・辿る手の 1 行」→「親タスクを結ぶ・外す・辿る手の 1 行」 | 1 行 |
| 仕様の原稿で `WL-n` を引く所 | `01-04-requirements.md` 28・`05-07-design.md` 2・`_source/notice-reasons.json` 4・`_source/property-items.json` 4・`_source/property-items.schema.json` 2・`_source/state-machines.json` 2・`_source/settings.json` 1 | 7 本 43 か所 |
| 仕様の生成物（手で直さない） | `_assets/tbl-notice-reasons.md` 4・`_assets/tbl-property-items.md` 4・`_assets/tbl-settings.md` 1 | 3 本 9 か所 |
| `src`（注釈と文字列） | `framework/single-html-shell/wbs-parent-hold.ts` 6・`adapter/screen-renderer/properties-panel.ts` 9・`adapter/input-command-translator/armed-placement.ts` 7・`framework/dom-screen-surface/properties-panel-drawing.ts` 5・`entity/layout-engine/item-hit-area/item-hit-area.ts` 4・`adapter/screen-renderer/screen-renderer.ts` 4・`adapter/input-command-translator/selection-input.ts` 3・`framework/single-html-shell/frame-loop.ts` 2・`framework/single-html-shell/pointer-shape.ts` 2・`adapter/screen-renderer/notices.ts` 1・`entity/document-model/schedule/delay-diagnostics.ts` 1・`entity/layout-engine/item-hit-area/marquee.ts` 1・`framework/single-html-shell/held-press-preview.ts` 1 | 13 本 46 か所 |
| `tests` | `unit/cr-631-wbs-parent-hits-and-hands.test.ts` 39・`system/w3-t1-the-wbs-parent-and-the-panel-rows.test.ts` 14・`unit/cr-631-wbs-parent-palette-chooser-and-picture.test.ts` 13・`system/cr-671-document-name-choosers-fit-the-panel.test.ts` 4・`contract/display-words.contract.test.ts` 2・`contract/t-233-reason-words-tell-the-row.contract.test.ts` 2・`system/w3-t2-file-and-picture-clauses.test.ts` 2・`unit/wl-16-the-parent-link-answers-a-press-as-a-jump.test.ts` 2（ファイル名も、2.6）・`contract/cr-712-the-words-and-the-hidden-rows.contract.test.ts` 1 | 9 本 79 か所 |
| `tools` | `tools/generate_display_words.py` | 1 本 2 か所 |
| 書き換えない（X-15） | 履歴: `change-request/` 7 本 51 か所・`docs/development-records/`（生成の `test-inventory.md` を除く）5 本 41 か所・`docs/review/` の一覧。生成が追う: `test-inventory.md` 26 か所・`dist/index.html` 4 か所 | — |

- 数え方: `git grep -o -E "\bWL-[0-9]+\b" d32b2b4a -- <道>` の当たりをファイルごとに数えた（13.2 節）。識別子の中の `WL`（`wl_`・`Wl1` など）は `src`・`tests`・`tools`・`docs/spec` に 0。
- `WL-15` の ①〜④ のように本文が行 ID に付ける印は、行 ID だけを替える（`PTL-15` の ①）。
- `impact.py` の種と 6 節の確かめは、`WL-n` と `PTL-n` を同じ点として比べる。

### 2.8 知らせの名簿（表 T-233・表 T-234）の書き換え先（`CR-712` の着地）

`CR-712` が、表 T-233（通知が運ぶ理由、`RS-n`）と表 T-234（問いが示す文、`QN-n`）の行を `01-04-requirements.md` から原稿 `docs/spec/_source/notice-reasons.json` へ移した。語は `docs/spec/_source/display-words.json` に残り、同じ行 ID を鍵とする。`docs/spec/_assets/tbl-notice-reasons.md` と `src/use-case/advance-screen-session/notice-values.ts` の生成の区画（`tools/generate_notice_reasons.py`）は生成物である（X-14）。

| 何 | 書き換え先（原稿） | 候補の行（`d32b2b4a`、機械） |
|---|---|---|
| 行の升（場面・正・名） | `docs/spec/_source/notice-reasons.json` | 82 行のうち 24 行 —— `QN-1`・`QN-2`・`QN-4`・`QN-8`・`QN-10`・`QN-12`・`RS-11`・`RS-12`・`RS-15`・`RS-22`・`RS-28`・`RS-29`・`RS-31`・`RS-32`・`RS-44`・`RS-46`・`RS-49`・`RS-53`・`RS-55`・`RS-61`・`RS-66`・`RS-69`・`RS-70`・`RS-75` |
| 語（和・英、次の一手） | `docs/spec/_source/display-words.json` | 77 行のうち 19 行 —— `QN-1`・`QN-10`・`RS-22`・`RS-24`・`RS-28`・`RS-29`・`RS-30`・`RS-31`・`RS-32`・`RS-36`・`RS-37`・`RS-39`・`RS-43`・`RS-44`・`RS-46`・`RS-55`・`RS-61`・`RS-66`・`RS-70`（例 `RS-61`「この行は読み取り専用です」） |
| 表 T-233・表 T-234 を名指す文 | `01-04-requirements.md` の本文（`HF-10`・`HF-14`・`HF-15` など）—— 名指しの「表 T-233 の行」は表の行（区分 b）、本文の「行」は読み票で決める | 7 節の読み票 |

- 候補の数え方: 行（行 ID を持つ要素）の文字列のどれかに、機械の分類で a か open の「行」、「WBS の親」の仲間、英語の `row` / `rows`・`WBS parent`・`wbsParent`、`WL-n` のどれかを持てば候補とした（13.2 節）。候補は読み票で 1 つずつ決める —— 例えば `RS-22` の「席番号」の文のように、表の行を言う「行」は残す。
- ⭐ `CR-712` が足した語（`IV-3`・`IV-5`・`IV-6`・`IV-8`・`IV-18`・`IV-20` など）は既に「タスクグループ」と書く（`display-words.json` の「タスクグループ」は `c42039df` の 5 か所から `d32b2b4a` の 11 か所へ）。本書はそれらを書き換えない。今のままの語（`RS-61` ほか）は本書が直す（`CR-712` の 10 節）。

---

## 3. 数（`c42039df` で測り直し、`d32b2b4a` で再び測った）

⭐ 元の一覧は `e39177b4` で、行を読んで a / b / c に分けた。本書は 13 節の台本の機械の分類を当て、その**差**を元の一覧の数に足して見込みとした（X-1）。c はすべて裁定が付いたので、改名の側に数える。2026-10-09 に、同じ台本を `c42039df` と `d32b2b4a` の 2 つの木に当てた差を、さらに足した（13.2 節）。

### 3.1 仕様と開発規則

| 領域 | 一覧の a ＋ c（`e39177b4`） | 差 `e39177b4` → `c42039df`（a ＋ 素の「行」） | 差 `c42039df` → `d32b2b4a`（同） | 見込み（`d32b2b4a`） |
|---|---:|---:|---:|---:|
| 仕様 01-04 の和文「行」 | 1,185 ＋ 69 | ＋86 | ＋3 | 約 1,343 |
| 仕様 05-07 の和文「行」 | 121 ＋ 7 | 0 | ＋1 | 約 129 |
| 仕様 `_assets` の和文「行」 | 267 ＋ 26 | ＋8 | ＋33（うち生成物 `tbl-notice-reasons.md` 27） | 約 334（手で直すのは約 307） |
| 仕様 `_source` の和文「行」（画面の語を除く） | 252 ＋ 23 | ＋7 | ＋30（うち `notice-reasons.json` 26） | 約 312 |
| 画面の語（`display-words.json`、和と英） | 102 ＋ 20 | 0 | 0 | 約 122 |
| 開発規則の和文「行」 | 21 ＋ 3 | 0 | ＋6 | 約 30 |
| 仕様の英語の識別子（区分 a ＋ c） | 334 ＋ 162 | ＋27 | ＋1 | 約 524 |
| 仕様の英語の散文 | 88 | 0 | （台本は数えない） | 約 88 |
| 仕様の「WBS の親」の仲間（和の句と `wbsParent*`） | 204 ＋ 116 | ＋18（「親」の字の増分） | ＋9（下の句と `wbsParent*` の和の差） | 約 347 |
| 仕様の `WL-n`（2.7） | — | — | — | 17 行 ＋ 原稿 43 か所 ＋ 登録 1 |

- 差の列の数え方: 13.2 節の台本の `ja-row a` と `ja-row open` の差の和（英語の識別子は `en-row a` の差）。01-04 の差が小さいのは、表 T-233・表 T-234 の行が `notice-reasons.json` へ出て（`CR-712`）、ほかの変更要求が足した分と打ち消し合ったからである。
- **`d32b2b4a` で数えた句**（機械、正確。括弧は `c42039df`）: 「WBS の親」61（55）、「WBS の子・子孫・祖先・兄弟・部分木」25（23）、「親子判別」10（10）、「親定義」10（10）、`wbsParentUid` 46（46）、ほかの `wbsParent*` 29（28、12 種）、`Row Area` 117（117）、`chosenRows` 22（22）。数え方は台本の `wbs prose`・`wbs ident`・`named` の行を仕様の 4 領域で足した。
- **基準から増えた所**（`CR-689`・`CR-690`・`CR-701`〜`CR-707`）: `HM-1`・`HM-7`・`HM-12`・`DU-1`・`DU-2`・`CY-3`・`CY-6`・`FO-5`〜`FO-7`・`MH-1`・`UN-16`・`EL-15`・`EL-20`・`GR-22`・`WF-2`〜`WF-4`・`FX-3`・`FX-6`・`EP-3`・`OP-10`・`NT-7`・`UF-73`・`LM-23`、表 T-368 の題「行見出しパネルの幅の欄」、表 T-367・表 T-369 の本文、`PR-15`（「WBS の親」）。`c42039df` から `d32b2b4a` までに増えた所（`CR-709`・`CR-711`〜`CR-717`）は差の列に入れ、行ごとには並べない。名簿の行は 2.8 節。
- 区分 b（変えない）の和文「行」は、機械の分類で `d32b2b4a` の 01-04 が 671、05-07 が 121、`_assets` が 285、`_source` が 243、開発規則が 404（`c42039df` は 673・115・261・220・398）。

### 3.2 `src`

| 何 | 一覧（`e39177b4`） | `c42039df` | `d32b2b4a` |
|---|---:|---:|---:|
| 区分 a の複合の識別子（機械の分類） | 1,611 | 1,679（＋68） | 1,704（＋25） |
| 区分 a か b か決まらない複合名（機械の「other」） | 1,728 | 1,753（＋25） | 1,771（＋18） |
| 汎用の `row` / `rows`（X-12 で型を見て決める） | 2,212 | 2,215（＋3） | 2,240（＋25） |
| 名に `row` を持つ複合名と `wbsParent*` の種類 | — | 617 種 5,170 件（下書きの数え方。再現できなかった）／ 13.2 節の数え方で 621 種 7,387 件 | 631 種 7,463 件（13.2 節の数え方） |
| `wbsParentUid` | 1,077 | 1,078 | 1,076 |
| ほかの `wbsParent*` | 206 | 206（47 種） | 206（`wbsParent*` 全体で 46 種、13.2 節の数え方） |
| 主な名: `rowTitlePanel*` | 84 | 115 | 117 |
| 主な名: `rowArea*` | 125 | 134 | 138 |
| 主な名: `rowTitlePanelWidth` を含む名 | 38 | 65（うち `rowTitlePanelWidthFixed` 22） | 65（うち 22） |
| 主な名: `pasteTaskSubtree` ／ `pasteTaskGroupSubtree` | 10 ／ 4 | 10 ／ 4 | 10 ／ 9 |
| ファイル名 | 9 ＋ 2 | 11 | 11 |
| DOM の名（区分 a） | 39 件 | 15 種（2.6） | 15 種（`data-*` の種類は同じ） |
| `WL-n`（2.7） | — | — | 13 本 46 か所 |

### 3.3 `tests`

| 何 | 一覧（`e39177b4`） | `c42039df` | `d32b2b4a` |
|---|---:|---:|---:|
| 試験のファイル | 491 | 545（＋54） | 579（＋34） |
| 区分 a の複合の識別子（機械の分類） | 2,562 | 2,719（＋157） | 2,776（＋57） |
| 決まらない複合名（機械の「other」） | 5,689 | 5,924（＋235） | 6,230（＋306） |
| 汎用の `row` / `rows` | 13,761 | 14,124（＋363。一覧の読みでは約 25% が区分 a） | 14,469（＋345） |
| 一覧の見込みの区分 a ＋ c（識別子） | 8,235 ＋ 1,008 | 約 9,600（±15%） | 約 9,900（±15%。`c42039df` の見込みに、a の差 57、汎用の差の 25%（86）、other の差の半分（153）を足した） |
| `wbsParentUid` | 1,243 | 1,247 | 1,262 |
| ほかの `wbsParent*` | 116 | 116（21 種） | 113（20 種） |
| 主な名: `rowTitlePanel*` ／ `rowArea*` ／ `rowGroupId` | 281 ／ 357 ／ 131 | 324 ／ 393 ／ 144 | 331 ／ 400 ／ 151 |
| 主な名: `pasteTaskSubtree` ／ `pasteTaskGroupSubtree` | 18 ／ 4 | 20 ／ 5 | 21 ／ 9 |
| 試験のファイル名（区分 a） | 41（一覧の問） | 57（変えない 8） | 62（変えない 14、X-13）＋ 接頭辞の 1 本（2.7） |
| ⭐ **仕様の文を引く試験**（段 1 で同じコミットに直す） | 128 | 122〜197 本（下書きの数え方） | 102〜204 本（13.2 節の数え方。同じ数え方で `c42039df` は 102〜197 —— 上限は下書きと一致し、下限の 122 は再現できなかった） |
| `WL-n`（2.7） | — | — | 9 本 79 か所 |

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
| 試験のファイル名（区分 b） | `cr-571-search-rows`・`cr-592-monochrome-greys-every-t-236-row`・`cr-606-the-panel-rows-follow-t-016`・`dfc-582-every-invariant-row-has-a-dictionary-entry`・`dfc-587-title-row-entries-are-drawn`・`cr-664-the-colour-rows-line-up-with-the-other-fields`・`cr-652-palette-rows-and-armed-label`・`cr-441-t-274-principles-and-rows-both-ways`、`d32b2b4a` までに足された `cr-712-report-rows-reach-the-import-report`・`cr-712-the-display-manner-of-every-row`・`cr-712-the-words-and-the-hidden-rows`・`dfc-1412-fr-006-every-target-lists-its-looks-in-one-order-one-colour-a-row`・`dfc-703-t-280-the-screen-session-names-its-surfaces-by-u-row`・`dfc-732-ir-3-the-record-names-the-t-220-row-of-a-refused-import`（表の行・欄の行。名だけを読んで決めた —— 当てる段で中身を確かめる） | X-13 |

---

## 5. 継ぎ目（コード）

- 型・関数・定数・状態機械の名は 2.5 の規則で変える。生成物（`display-words.json`・状態機械の型・実体の型・アイコンとヘルプの名簿・プロパティの項目・MCP の説明・画像のプロンプト・スタートアップのテンプレート・スキーマの検証器・交換の形式）は段 1 の `npm run gen` と各生成器が追う。手で直さない。
- `src` のファイル 11 本は `git mv` で動かし、import の道は言語サービスの `getEditsForFileRename` で直す（`src` と `tests` の両方）。
- エージェント API: `agentApiVersion` を 2 に上げる（X-8）。MCP の取次の束（`.mcpb`）を作り直す。
- 行 ID の接頭辞 `WL` → `PTL`（2.7）は、`src`・`tools`・`tests` では注釈・文字列・試験の題の中の `WL-n` だけであり、識別子には無い（`d32b2b4a` で 0）。2.7 の表の 17 の対を語の境界で当てる（`WL-1` が `WL-15` を巻き込まない）。
- 新しい命令・新しい表・新しい辞書の語は無い。振る舞いは変えない。

---

## 6. グラフ

改名は語だけを変え、表の行・要求の間の辺を変えない。`impact.py` の種は表の行 ID であり、変わる ID は表 T-351 の 17 行（`WL-n` → `PTL-n`、`JDG-1731`、2.7）だけである。ほか（`IC-141`・`IC-142`・`PR-15`・`CM-8`・`CM-18`・`U-22` など）は番号を保つ —— 誘導部分グラフは、`WL-n` と `PTL-n` を同じ点と読めば当てる前後で同じになることを、段 1 の後に `induced.py` で確かめる（前 `induced.py U-1 U-22 U-23 U-46 U-47 U-48 U-50 PR-15 IC-141 IC-142 CM-8 CM-18 K-71 K-143 G-6 A-2 WL-1 WL-15 WL-17`、後は同じ並びの `WL-n` を `PTL-n` に替える。`A-2` だけが消える）。

---

## 7. 機械の手順（台本で置き換える。⛔ 見ないままの全体置換をしない）

⭐ 段 0（凍結の前に作れる）: 道具と対応表を作る。

1. **対応表の TSV** `rename-map.tsv`（作業ブランチの `docs/review/` に置く）: 1 行 ＝ 1 つの名。列は `old`・`new`・`kind`（spec-word / identifier / file / dom / json-key / api）・`class`（a / b）・`rule`（2.5 の順）・`files`・`count`・`decided-by`。`src`・`tests`・`docs/spec`・`tools` の名を 13 節の台本で全部拾い、2.5 の規則で `new` を埋め、b の既定と衝突に印を付ける。⛔ 人（調整役か判断の体）が全行を読んでから使う。`c42039df` で拾う種類は `src` 617・`tests` 921・仕様 100 である（`wbsParent*` は `src` 47・`tests` 21・仕様 12。下書きの数え方）。`d32b2b4a` では、13.2 節の数え方（名に `row` / `rows` の部分を持つ識別子と `wbsParent*` の異なり）で `src` 631・`tests` 982・仕様 121・`tools` 173（`c42039df` は同じ数え方で 621・932・117・169）、`wbsParent*` は `src` 46・`tests` 20・仕様 12・`tools` 5。⭐ TSV には 2.7 の `WL-n` → `PTL-n` の 17 行を `kind` row-id で足す。
2. **和文の句の表** `rename-phrases-ja.tsv`: 長い句から先に当てる（「行見出しパネル」→「タスクグループパネル」を「行見出し」より先に）。句は 2.1 と、一覧の 4〜5 節の区分 a のパターン（「この行」「その行」「配下の行」「畳んだ行」「ピン止めした行」「行を畳む」「行に載る」「行の帯」「行の木」「行の高さ」「行の色」「行の操作子」…）。
3. **素の「行」の読み票** `rename-lines-ja.tsv`: 句の表で決まらない「行」を 1 行 ＝ 1 か所（ファイル・行番号・前後 20 字）で並べ、`decision` 列に「タスクグループ」「タスク（`JDG-1664`）」「残す」「書き換え（文を渡す）」のどれかを書く。⭐ 読み票は持ち場（ファイルの行の範囲）ごとに別の体が埋めてよい —— 書くのは 1 本の適用の台本だけなので、同じファイルでも衝突しない。助詞の直し（「1 行」→「1 つのタスクグループ」）は「書き換え」で文ごと渡す。
4. **適用の台本** `apply_rename.py`: 2 と 3 の TSV を読み、決めた所だけを書き換える。決まっていない行が 1 つでも残れば何も書かずに止まる。CRLF は多数派に合わせ、置き換えの前後で CRLF の数を比べる。
5. **識別子の改名** `rename_symbols.mjs`: TypeScript の言語サービス（`node_modules/typescript`）で、1 の TSV の a の行ごとに宣言を探し `findRenameLocations` で参照ごと変える（`src` と `tests`、X-11）。文字列・注釈・JSON・CSS・HTML は 1 の TSV の名を語の継ぎ目で当てる正規表現で変える（部分文字列にしない）。汎用の `row` / `rows` は型を問うて `TaskGroup`・`TaskGroupPlacement` のときだけ（X-12）。
6. **残りの数え直し**: 各段の後に 13 節の台本を回し、区分 a の印（「行見出し」「行名」「行軸」「WBS の親」、`rowTitle`・`rowArea`・`wbsParent`、生きている木の `WL-n`）が 0、素の「行」が読み票の「残す」の数と等しいことを確かめる。

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

⛔ **始める時機**: 凍結は、利用者が「やれ」と指示したときにだけ始める（`JDG-1726`）。調整役は自分で始めず、目の前の軽い案件を片づけた後の良い時機に、利用者へ「いま始めてよいか」を提案する。⛔ 改名はほかのどの変更とも同じ枝・同じコミットに載せない（`JDG-1735`）。

⛔ **書き込みの凍結**: 段 1 の始めから `main` への早送りまで、ほかの席は `docs/spec`・`src`・`tests`・`tools` の生成器を書かず、ほかの CR を当てない（`JDG-1735`）。台帳（`docs/development-records/`）への書き込みは続けてよいが、新しい行は新しい語と新しい接頭辞 `PTL` で書く。凍結の前に、走っている体を区切りのよい所で止める（中途で止めない）。

| 段 | 何をする | 終わりに確かめること | 見込み（実時間） |
|---|---|---|---|
| 0（凍結の前） | 7 節の 1〜5 の道具と TSV を作り、TSV を読む（2.7 の `WL-n` → `PTL-n` の 17 行を含む） | 道具が凍結の時点の木のコピーの上で「決まっていない行」を数えて止まること | 3〜4 h（＋ 調整役の確認 1 h） |
| 1 仕様 | `docs/spec` の原稿と画面の語・用語集・開発規則を置き換え（表 T-233・表 T-234 は原稿の `notice-reasons.json` と `display-words.json` で、2.8・X-14）、表 T-351 の行 ID と接頭辞の登録を `PTL` へ替え（2.7）、`npm run gen`、スキーマの版を上げ、⭐ 起動テンプレートの生成器の鍵の字面 7 か所と手引き（`grs-skeleton.json` と prompt の和英）を同じコミットで直し（X-16、`JDG-1732`）、仕様の文を引く試験（102〜204 本）と `src` の注釈の引用（check 42）を同じコミットで直す | `npm run gen:check` 0、各生成器の `--check` 0、`strictdoc export docs/spec` の後 `rm -rf output`、check.sh（仕様の側の検査が緑。検査 75 が手引きを、検査 76 が空の変更の台帳を見る。`src` の生成物の名の変化による `typecheck` の赤は数を記録して次の段へ渡す）、仕様を引く試験の `vitest` が緑、6 節の `induced.py` が当てる前と同じ（`WL-n` ＝ `PTL-n` と読んで）、13 節の台本で仕様の区分 a の印が 0 | 7.5〜9 h（読み票を 4 つの体で分ける） |
| 2 `src` | 7 節の 5 で識別子を改名（参照する `tests` も）、ファイル 11 本を動かし、DOM の名・文字列・注釈（`WL-n` 13 本 46 か所を含む）・名簿の JSON を直し、`tools` の `WL-n` 2 か所を直し、`agentApiVersion` を 2 に、`.mcpb` を作り直す | `npm run typecheck` 0、`npm run build` 0、check.sh（function-size などの基準値はパスと名の変化だけを調整役が直す）、`vitest` の `tests/unit`（錠の下）、13 節の台本で `src` の区分 a の印が 0 | 5〜6.5 h（層ごとに 3 つの体） |
| 3 `tests` | 試験だけが持つ名（ファイル 62 本と接頭辞の 1 本、固定データの鍵、DOM のセレクタ、注釈、`readDocumentRowIds`、`WL-n` 9 本 79 か所）、⭐ `tests/contract/dfc-2228-a-document-without-the-export-span-opens.contract.test.ts` の見本の場合（「bundled sample "Three-Year Product Plan.json" opens with 0 refusals」）の読み先を組み込みの起動テンプレートへ替える（`JDG-1732`。段 1 で鍵が変わった時点でこの場合は赤くなるので、段 1 のコミットで先に替えてよい）、`tests/known-red.txt`、`npm run gen:tests`、基準値のパスと名（調整役）。⛔ 進捗の文書 5 本と `sample-schedule/Three-Year Product Plan.json` は書き直さない。`tests/contract/dfc-378-a-write-that-changed-nothing-answers-the-same-document.test.ts` の読み先は替えない（X-17） | `npm run typecheck` 0、`vitest` の全体（錠の下、既知の赤だけ）、`playwright`（錠の下）、check.sh 0、`privacy_count.py`、13 節の台本の最終の数 | 6〜7.5 h（`unit` ／ `contract` ／ `system`・`usecase` の 3 つの体） |
| 締め | `dist/index.html` を作り直し、利用者の確かめの一覧を作る | 利用者が本物の画面で語を見る（`JDG-1340` の道で調整役が頼む） | 1〜2 h |

- **計**（2026-10-09、`d32b2b4a` の数で見直した）: 実時間で約 23〜28 時間（下書き 22〜27）、凍結は段 1〜3 の約 19〜23 時間（下書き 18〜21）。体の時間の和は約 42〜53 時間（下書き 40〜50）。
- **見直しの入力**（どれも 3 節・2.7・2.8 の数。数え方は 13.2 節）: 段 1 に足したもの —— 接頭辞の 17 行と原稿の 43 か所と登録 1、名簿の候補 24 行と語の候補 19 行の書き換え先の替え、手引きとテンプレートの生成器（段 3 から移した）。段 2 に足したもの —— `WL-n` 46 か所と `tools` 2 か所。段 3 から除いたもの —— 進捗の文書 5 本と見本 1 本の書き直し（`JDG-1732`）。段 3 に足したもの —— 試験のファイル 34 本（545 → 579）、改名するファイル名 5 本と接頭辞の 1 本、`WL-n` 79 か所、汎用の `row` 345・「other」306 の増分。仕様を引く試験の上限は 197 → 204 本。⚠️ 時間は、下書きの段ごとの時間にこれらの増減を判断で足したものであり、測ったものではない。
- **並べ方**: 段 1 は 01-04 を章で 2 つ、05-07 と `_assets` で 1 つ、`_source`（`notice-reasons.json` を含む）と画面の語と開発規則と手引きで 1 つ —— 4 つの体が読み票を埋め、適用は 1 回。段 2 は `entity` ／ `use-case`・`adapter` ／ `framework` で分けるが、言語サービスの改名は 1 つの体が 1 回で回す（参照が層をまたぐ）。段 3 は試験の木で分ける。

---

## 9. 仕様の外で直すもの

- `src`・`tests`・`tools`・`.claude/skills/spec-graph-check/*.py` の名指し（`list-inverted-authority.py`・`check-repeated-expressions.py` など）。
- 基準値のファイルの行 —— `d32b2b4a` で、改名するパス・区分 a の名・`wbsParent*` のどれかを持つ行が 45（comment-rules-tests 16・twin-comments 12・function-size 10・crossing-names 3・literal-restatement 1・quoted-source 1・repeated-expressions 1・ruling-landed 1。`c42039df` も同じ 45。下書きの 37 は別の数え方で、再現できなかった）。名だけを変え、数は変えない（`JDG-520`、調整役）。基準値のファイルに `WL-n` は 0。
- `docs/development-records/perf-pending.md` の行（同じ数え方で `d32b2b4a` が 15 行、`c42039df` は 12 行。下書きの 10 は別の数え方）と `test-inventory.md`（生成）—— パスの名だけ。⛔ その中の `WL-n`（perf-pending の 120 番）は書き換えない（X-15）。
- `docs/guides/schedule-to-grs-json/`（skeleton と prompt の和英）—— 段 1 で直す（X-16）。検査 75（`check-guide-grs-json.py`）がスキーマで検める。
- ⛔ `previous-project-result/38-project-progress/*.json` の 5 本と `sample-schedule/Three-Year Product Plan.json` は書き直さない（`JDG-1732`）。改名の後は開けない。
- 毎フレームの経路は語と名だけが変わり、仕事は変わらない —— `perf-pending.md` に行を足さない（測り直しは要らない）。

---

## 10. ⛔ この変更でやらないこと ・ 触れ合うもの

- 振る舞い・表の行・番号は変えない。行 ID は表 T-351 の接頭辞（`WL` → `PTL`、`JDG-1731`、2.7）だけを替え、番号は保つ。表の番号（`T-368` など）も変えない —— 題の語だけを変える。
- 旧形式の読み替えを作らない（`JDG-1663`・`JDG-1733`）。
- MSPDI の名を変えない。
- 履歴を改名しない（X-4・X-15）。
- 進捗の文書と `Three-Year Product Plan.json` を書き直さない（`JDG-1732`）。
- ⛔ ほかのどの変更とも束ねない（`JDG-1735`）—— 凍結の間はほかの CR を当てない。`CR-699` は着地済み（2.3）。触れ合う: `CR-433`（止めてある、編集グループ）と、その時に走っている CR。

---

## 11. 利用者に問うたこと（答えの記録）

2026-10-08 の夜、裁定の席が 9 つの問いを利用者に問い、答えを受けた（全文は rulings.md の `JDG-1727`〜`JDG-1735`）。

| 問 | 何を | 下書きの推奨 | 答え | 本書の扱い |
|---|---|---|---|---|
| 1 | `CM-8` `pasteTaskSubtree` の新しい名（`CR-706` X-3）。`CM-28` `pasteTaskGroupSubtree` はどうするか | `CM-8` は `pasteTasks`、`CM-28` は変えない | 推奨のとおり（`JDG-1727`） | 2.4。`CM-8` は選んだ `Task` だけをコピーする（`DU-1`）、`CM-28` は配下のタスクグループもコピーする（`DU-2`） |
| 2 | `CM-18` `setTaskWbsParent` の新しい名 | `setTaskParentTask` | 推奨のとおり（`JDG-1728`） | 2.4 |
| 3 | `Task.wbsOrder` を変えるか（`src` と `tests` で、語の境界で数えて `c42039df` 2,151・`d32b2b4a` 2,154。下書きの 2,145 は別の数え方） | 変えない | 推奨のとおり（`JDG-1729`。MSPDI が `WBS`・`WBSLevel` の語を使う） | 2.3 |
| 4 | 木そのものの名「WBS」（`G-6`、「WBS の深さ」、`A-1` ②、`A-4`）を残すか | 残す。`G-6` の説明は「親タスクと子タスクの木。`Task.parentTaskUid` が持つ。MSPDI へ書き出す」 | 推奨のとおり（`JDG-1730`） | 4 節 |
| 5 | 行 ID の接頭辞 `WL` の語「WBS Link」 | 語だけを「Parent Task Link」に、文字 `WL` は変えない | ⚠️ **覆った**（`JDG-1731`）—— 接頭辞を `PTL` に替え、番号は保つ | 2.7・6 節・X-15 |
| 6 | リポジトリの中の GRS 文書 | 段 3 で 4 本を書き直す | ⚠️ **覆った**（`JDG-1732`）—— 追従は組み込みの起動テンプレートと `grs-skeleton.json` だけ。進捗の文書 5 本（下書きの「4 本」は測ると 5 本）と `Three-Year Product Plan.json` は書き直さない。見本を読む試験 2 本は読み先をテンプレートへ | 1 節・8 節・9 節・X-16・X-17。⚠️ 名指された 2 本のうち `dfc-378-a-write-that-changed-nothing-answers-the-same-document.test.ts` はファイルを読まないので、替えるのは `dfc-2228-a-document-without-the-export-span-opens.contract.test.ts` の 1 本だけ |
| 7 | 利用者の手元の文書（リポジトリの外） | 「改名の後は開けない」と告げる。道具は求められたときだけ | 「開けない」（`JDG-1733`）—— 読み替えも変換の道具も作らない | 2.3 |
| 8 | 設定の鍵 `rowTitleFont` などの新しい名 | `JDG-1663` の綴りのまま | 推奨のとおり（`JDG-1734`） | 2.2 |
| 9 | ほかの変更との順 | 同時に当てない | 「束ねない。絶対」（`JDG-1735`） | 8 節・10 節 |

- 始める時機は `JDG-1726`（利用者の指示で始める。調整役が時機を提案する）。正式公開は少なくとも解明・リファクタ・分刻みの日程の後（`JDG-1740`）であり、それまで読み替えを作らない方針が続く。
- 残る問いは本書には無い。凍結を始める時機だけが利用者の言葉を待つ（`JDG-1726`）。

---

## 12. 台帳

| 行 | 何 | 本書での扱い |
|---|---|---|
| `JDG-1659`〜`JDG-1668` | 一覧への 10 の答え | 状態を「指示 —— `CR-708` が当てる（下書き。時期と持ち場は調整役が決める）」にした |
| `JDG-1614` | `PR-15` の見出し | 同じ（`JDG-1666` の一部の覆りの印は残した） |
| `JDG-1727`〜`JDG-1734` | 11 節の問 1〜8 への答え | 状態は既に「指示 —— `CR-708` が当てる」（裁定の席が記した）。2026-10-09 の更新で変えていない |
| `JDG-1726`・`JDG-1735` | 始める時機・束ねない | 状態は「指示 —— 調整役が従う」。本書は 8 節・10 節に書き入れた |
| `JDG-1570`・`JDG-1652` | 改名そのもの | 触らない（当てる段で 適用済 にする） |
| `DFC-2174` | 1 つの概念に 2 つの名 | 触らない（段 3 の後に閉じる） |

---

## 13. 測り方の再現

### 13.1 `c42039df`（2026-10-08、起草）

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

### 13.2 `d32b2b4a`（2026-10-09、`JDG-1731`・`JDG-1732`・`CR-712` の後）

```
# the tree: worktree at d32b2b4a; c42039df extracted beside it (docs src tests tools .claude sample-schedule)
git merge --ff-only d32b2b4a
git archive -o <scratch>/old.tar c42039df docs src tests             # then tar -xf into <scratch>/old
PYTHONIOENCODING=utf-8 python docs/review/rename-row-to-task-group-remeasure.py <scratch>/old .
#   the c42039df -> d32b2b4a column of 3.1 (a + open), 3.2 and 3.3 (en-row a / other / generic, wbs, named)
git grep -o -E "\bWL-[0-9]+\b" d32b2b4a -- . | cut -d: -f2 | sort | uniq -c       # WL-n per file (2.7)
git grep -o -h -E "\bWL-[0-9]+\b" d32b2b4a -- . | sort | uniq -c                   # WL-n per id: 17 ids
git grep -n -E "\bPTL\b|PTL-[0-9]" d32b2b4a -- .                     # PTL is free (rulings.md, handoff.md only)
git grep -l "Three-Year" d32b2b4a -- src tests tools docs/spec docs/guides           # the 2 tests of JDG-1732
git grep -o "rowTitlePanelWidthFixed" d32b2b4a -- src | wc -l        # 22
```

台本に無い数は、作業木の外の使い捨ての台本で、`remeasure.py` の `CJK_RUN`・`ja_class`・`IDENT`・`PART`・`en_class`・`WBS_IDENT` を取り込んで、2 つの木に同じに当てた。

- **識別子の種類**（3.2・7 節）: 拡張子 `.ts .tsx .js .mjs .css .html .json .md .py .svg .txt .sh` のファイルで、`IDENT` の当たりのうち `PART` で切った部分に `row` か `rows` を持つものの異なりと、`WBS_IDENT` の当たりの異なりの和。件数は当たりの総数。
- **改名するファイル名**（2.6・3.3）: パスが `(^|[/-])rows?([-.]|$)|wbs-parent`（大小を問わない）に当たるファイルから、X-13 の名を含むものを除いた数。新しく当たった 11 本は名を読んで a 5・b 6 に分けた。
- **仕様を引く試験**（3.3・8 節）: `tests` の `.ts` / `.tsx` のうち、`docs/spec|01-04-requirements|05-07-design|display-words\.json|STATEMENT|_assets/|_source/` に当たり、かつ下限 ＝ `A_MARKERS` か英名（`Row Title Panel`・`Row Title Tree`・`Row Area`・`Pinned Row`・`Row Expander`・`Row Pin`・`WBS parent`）か `WBS_PROSE` を持つ、上限 ＝ それに加えて `ja_class` が a か open の「行」を持つ。この数え方で `c42039df` は 102〜197（上限は 13.1 節の数と一致、下限は一致しない）。
- **基準値の行**（1 節・9 節）: `.claude/skills/spec-graph-check/*-baseline.txt` の行のうち、`src/` か `tests/` の改名するパス（上のファイル名から b を除く）、`en_class` が a の名、`WBS_IDENT` のどれかを持つ行。perf-pending.md は同じ判定を `|` で始まる行に当てた。
- **衝突**（2.5）: 2.5 の新しい名 13 個を `\b<名>\b` で `src`・`tests` に数えた —— 0。
- **名簿の候補**（2.8）: `notice-reasons.json` と `display-words.json` の、`id` か `rowId` が `RS-n` / `QN-n` の要素について、その中の文字列のどれかが ① `ja_class` で a か open の「行」、② 「WBS の親」「親子判別」「親定義」「WBS の子」「WBS の部分木」、③ `\b(row|rows|Row|Rows)\b`・`WBS parent`・`wbsParent`・`WL-n` のどれかを持てば候補とした。
- **`Task.wbsOrder`**（11 節の問 3）: `\bwbsOrder\b` を `src` と `tests` の上の拡張子のファイルで数えた（`src` 1,018・`tests` 1,136）。
- **`display-words.json` の「タスクグループ」**（2.8）: 文字列「タスクグループ」の出現数（`c42039df` 5、`d32b2b4a` 11）。
