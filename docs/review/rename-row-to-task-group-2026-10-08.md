# 「行 / row」→「タスクグループ」と「WBS の親」→「親タスク」の改名の一覧（2026-10-08、調査のみ）

⭐ **何も改名していない。** 改名の前に、どこに何件あるかを利用者に見せる一覧である（`JDG-1570` の「まずは、行 /row としている部分の抽出からだな。 一覧表で見たい」）。
裁定の出典は `JDG-1570`（行 → タスクグループ）・`JDG-1652`（WBS の親 → 親タスク、同じ時期に改名する）・不具合 `DFC-2174`。
本書への利用者の答えは `JDG-1659`〜`JDG-1668`（`docs/development-records/rulings.md`）にある。

## 0. 読み方

- **区分**: **a** ＝ 実体 `TaskGroup`（または Task の WBS の親）を指す → 改名する。**b** ＝ 別のものを指す → 残す。**c** ＝ 決められない → 利用者に問う（3 節）。
- **b の主なもの**: 仕様の表の行（「表 T-xxx の行」「行 ID」「本行」、`rowId`）、文字の行（「1 行」「改行」「行目」）、タスクグループでない画面の表の行（カレンダーの例外日の行・検索結果の行・プロパティの欄の行・パレットの行・遅延診断レポートの行）、CSS の語（`grid-row`・`row-gap`）、MSPDI の語（`WBS`・`OutlineLevel`・`WBSMask`）、字を含むだけの語（実行・先行・進行中）、タスクグループの親（入れ子の親は「親タスク」ではない）。
- **1 行 ＝ 1 つの使い方のパターン**であり、1 件ずつではない。件数は当たった数、例は最初の 1 か所（パスは repo からの相対）。
- **生成物**の欄が「はい」の行は、`docs/spec/_source/` の JSON などから再生成されるファイルである。改名は元を直して `npm run gen` で済む（数には含めた）。
- 全パターン（1,667 行）は同じ名前の TSV `docs/review/rename-row-to-task-group-2026-10-08.tsv` にある。本書の 4〜9 節は、その抜き出しである。

## 0.1 方法（数を確かめ直すための手順）

- **基準**: コミット `e39177b4`。
- **抜き出し**: 和文「行」は、`docs/spec/*.md`・`docs/spec/_assets/*.md`・`docs/spec/_source/*.json`・`*.md`・`docs/development-rules/*.md` の中の「行」を含む漢字とカタカナの連なりで数えた（4,742 件。「行う」などの動詞は除いた）。英語は、識別子をつなぎ目（camelCase・snake_case・kebab-case）で切り、`row` / `rows` の部分を含むものを数えた（`throw`・`arrow`・`browser`・`grow`・`narrow` は除いた）。src とテストは `*.{ts,tsx,js,mjs,css,html,json}` を見た（src の生成物 `src/adapter/screen-renderer/display-words.json` は元の `_source` 側で数えた）。「WBS の親」は、和文の「WBS の親」「親定義」「親子判別」「親子関係」と、英文の `WBS parent`・`wbsParent*` を全体で数えた。
- **分類**: 6 つの下請けに分けた。J1 ＝ 01-04 の和文、J2 ＝ ほかの仕様と開発規則の和文、E1 ＝ 文書の英語、S1 ＝ src、T1 ＝ テスト、W1 ＝ WBS の親。どの下請けも「入力の件数 ＝ パターンの件数の和、残り 0」を確かめて返した。
- **精度**: 文書と src の a/b の分けは、行を読んで決めた。**テストの汎用語（`row` 10,051 件・`rows` 2,653 件・`rowOf`・`rowId`）の a/b の分けは推定**である。手がかりの語で判じ、判じられない行はファイルの多数派に従わせた。手で 40 件を確かめると約 85% が合っていたので、±15% と読むこと。
- **重なり**: 画面の語は、和文と英文の両方を持つ J2 と、英文だけを数えた E1 と、W1 に重なって出る（2 節）。1 節の計は重なりを含む。

## 1. 集計（区分ごとの件数）

| 調査 | 領域 | a 改名 | b 残す | c 問う | 計 |
|---|---|---:|---:|---:|---:|
| J1 | spec 01-04 | 1185 | 1101 | 69 | 2355 |
| J2 | development-rules | 21 | 652 | 3 | 676 |
| J2 | screen words | 48 | 17 | 10 | 75 |
| J2 | spec 05-07 | 121 | 198 | 7 | 326 |
| J2 | spec _assets | 267 | 425 | 26 | 718 |
| J2 | spec _source | 252 | 317 | 23 | 592 |
| E1 | development-rules | 15 | 25 | 9 | 49 |
| E1 | generator scripts | 6 | 383 | 0 | 389 |
| E1 | screen words | 54 | 2 | 10 | 66 |
| E1 | spec identifiers | 334 | 803 | 162 | 1299 |
| E1 | spec prose en | 88 | 112 | 0 | 200 |
| S1 | src DOM/CSS name | 39 | 13 | 0 | 52 |
| S1 | src file name | 18 | 0 | 0 | 18 |
| S1 | src identifier | 2367 | 2478 | 291 | 5136 |
| S1 | src saved key | 0 | 0 | 71 | 71 |
| S1 | src string | 114 | 47 | 2 | 163 |
| T1 | tests file name | 0 | 10 | 82 | 92 |
| T1 | tests fixture key | 0 | 0 | 180 | 180 |
| T1 | tests identifier | 8235 | 13144 | 1008 | 22387 |
| T1 | tests quoted clause | 1008 | 789 | 136 | 1933 |
| W1 | development-rules | 2 | 60 | 1 | 63 |
| W1 | screen words | 78 | 12 | 25 | 115 |
| W1 | spec | 204 | 213 | 43 | 460 |
| W1 | spec identifier | 0 | 0 | 73 | 73 |
| W1 | src identifier | 14 | 14 | 210 | 238 |
| W1 | src saved key | 0 | 0 | 1077 | 1077 |
| W1 | tests | 84 | 87 | 1385 | 1556 |
| **計** | | **14554** | **20902** | **4903** | **40359** |

## 2. 画面の語（利用者が見る語）

### 2.1 「行 / row」—— `docs/spec/_source/display-words.json`（和文と英文を 1 行に並べる）

| # | 区分 | パターン | 件数 | ファイル数 | 例 | 案 ja | 案 en | 生成物 |
|---|---|---|---:|---:|---|---|---|---|
| J2-001 | a | この行の配下に行を 1 つ追加する。名前はその場で打つ / "Add one row below this one, and type its name there" | 2 | 1 | `docs/spec/_source/display-words.json:900` | このタスクグループの配下にタスクグループを 1 つ追加する。名前はその場で打つ | Add one task group below this one, and type its name there |  |
| J2-002 | a | この行と、その配下の行と、載っているタスクを削除する / "Delete this row, the rows below it and the tasks they carry" | 2 | 1 | `docs/spec/_source/display-words.json:922` | このタスクグループと、その配下のタスクグループと、載っているタスクを削除する | Delete this task group, the task groups below it and the tasks they carry |  |
| J2-003 | a | 行を畳むか、期間を絞ってから書き出してください / "Fold some rows or narrow the period, then export again" | 2 | 1 | `docs/spec/_source/display-words.json:2928` | タスクグループを畳むか、期間を絞ってから書き出してください | Fold some task groups or narrow the period, then export again |  |
| J2-004 | a | この行と、行に載っているタスクを削除しますか？ / "Delete this row and the tasks on it?" | 2 | 1 | `docs/spec/_source/display-words.json:3487` | このタスクグループと、タスクグループに載っているタスクを削除しますか？ | Delete this task group and the tasks on it? |  |
| J2-005 | a | すべての行と、行に載っているタスクを削除しますか？ / "Delete all rows and the tasks on them?" | 2 | 1 | `docs/spec/_source/display-words.json:3529` | すべてのタスクグループと、タスクグループに載っているタスクを削除しますか？ | Delete all task groups and the tasks on them? |  |
| J2-006 | a | この行の配下をすべて開く / "Open every row below this one" | 1 | 1 | `docs/spec/_source/display-words.json:856` | このタスクグループの配下をすべて開く | Open every task group below this one |  |
| J2-007 | a | この行自身を畳む / "Collapse this row itself" | 1 | 1 | `docs/spec/_source/display-words.json:867` | このタスクグループ自身を畳む | Collapse this task group itself |  |
| J2-008 | a | この行の配下をすべて畳む / "Collapse every row below this one" | 1 | 1 | `docs/spec/_source/display-words.json:878` | このタスクグループの配下をすべて畳む | Collapse every task group below this one |  |
| J2-009 | a | この行の直下の子だけを開く。孫より下は畳んだままにする / "Open only this row's own children, leaving deeper rows folded" | 1 | 1 | `docs/spec/_source/display-words.json:889` | このタスクグループの直下の子だけを開く。孫より下は畳んだままにする | Open only this task group's own children, leaving deeper task groups folded |  |
| J2-010 | a | 行をピン止めして画面に残す。もう一度押すと外す / "Pin the row so it stays on screen; press again to unpin it" | 1 | 1 | `docs/spec/_source/display-words.json:911` | タスクグループをピン止めして画面に残す。もう一度押すと外す | Pin the task group so it stays on screen; press again to unpin it |  |
| J2-011 | a | 行を削除 / "Delete Row" | 1 | 1 | `docs/spec/_source/display-words.json:918` | タスクグループを削除 | Delete Task Group |  |
| J2-012 | a | すべての行を削除 / "Delete All Rows" | 1 | 1 | `docs/spec/_source/display-words.json:929` | すべてのタスクグループを削除 | Delete All Task Groups |  |
| J2-013 | a | すべての行と、載っているタスクを削除する / "Delete all rows and the tasks they carry" | 1 | 1 | `docs/spec/_source/display-words.json:933` | すべてのタスクグループと、載っているタスクを削除する | Delete all task groups and the tasks they carry |  |
| J2-014 | a | 畳んだ行をすべて開く / "Open every row that was collapsed" | 1 | 1 | `docs/spec/_source/display-words.json:1285` | 畳んだタスクグループをすべて開く | Open every task group that was collapsed |  |
| J2-015 | a | すべての行を畳む / "Collapse every row" | 1 | 1 | `docs/spec/_source/display-words.json:1296` | すべてのタスクグループを畳む | Collapse every task group |  |
| J2-016 | a | 最も浅い段の行だけを戻す。その配下は畳まったままにする / "Bring back only the shallowest rows, leaving what is under them folded" | 1 | 1 | `docs/spec/_source/display-words.json:1307` | 最も浅い段のタスクグループだけを戻す。その配下は畳まったままにする | Bring back only the shallowest task groups, leaving what is under them folded |  |
| J2-017 | a | 最も浅い段に行を 1 つ追加する。名前はその場で打つ / "Add one row at the shallowest level, and type its name there" | 1 | 1 | `docs/spec/_source/display-words.json:1318` | 最も浅い段にタスクグループを 1 つ追加する。名前はその場で打つ | Add one task group at the shallowest level, and type its name there |  |
| J2-018 | a | 表示の上端が指す行 / "scrollGroupId" | 1 | 1 | `docs/spec/_source/display-words.json:2186` | 表示の上端が指すタスクグループ | scrollGroupId (key already says Group; unchanged) |  |
| J2-019 | a | 表示の上端が指す行のどこにあるか / "scrollGroupOffset" | 1 | 1 | `docs/spec/_source/display-words.json:2508` | 表示の上端が指すタスクグループのどこにあるか | scrollGroupOffset (key already says Group; unchanged) |  |
| J2-020 | a | 1 つの行に重なるタスクが多すぎるので、これ以上積めません / "Too many tasks overlap on one row, so no more can be stacked" | 1 | 1 | `docs/spec/_source/display-words.json:2946` | 1 つのタスクグループに重なるタスクが多すぎるので、これ以上積めません | Too many tasks overlap on one task group, so no more can be stacked |  |
| J2-021 | a | 重なっているタスクを別の行へ移すか、日付をずらしてください / "Move some of the overlapping tasks to another row, or shift their dates" | 1 | 1 | `docs/spec/_source/display-words.json:2950` | 重なっているタスクを別のタスクグループへ移すか、日付をずらしてください | Move some of the overlapping tasks to another task group, or shift their dates |  |
| J2-022 | a | この行は、描かれている子を 1 つも持っていません / "This row draws no child, so there is nothing to fold away" | 1 | 1 | `docs/spec/_source/display-words.json:3001` | このタスクグループは、描かれている子を 1 つも持っていません | This task group draws no child, so there is nothing to fold away |  |
| J2-023 | a | 配下の行を戻してから、もう一度押してください / "Bring a row under this one back first, then press again" | 1 | 1 | `docs/spec/_source/display-words.json:3005` | 配下のタスクグループを戻してから、もう一度押してください | Bring a task group under this one back first, then press again |  |
| J2-024 | a | この行の直下に、画面へ戻せる子がありません / "No child of this row is out of the picture to bring back" | 1 | 1 | `docs/spec/_source/display-words.json:3012` | このタスクグループの直下に、画面へ戻せる子がありません | No child of this task group is out of the picture to bring back |  |
| J2-025 | a | 配下を畳むか、直下の行を隠してから、もう一度押してください / "Fold what is under this row, or hide one of its children, then press again" | 1 | 1 | `docs/spec/_source/display-words.json:3016` | 配下を畳むか、直下のタスクグループを隠してから、もう一度押してください | Fold what is under this task group, or hide one of its children, then press aga… |  |
| J2-026 | a | すべての行が、もう開いて描かれています / "Every row is already open and drawn" | 1 | 1 | `docs/spec/_source/display-words.json:3023` | すべてのタスクグループが、もう開いて描かれています | Every task group is already open and drawn |  |
| J2-027 | a | どれかの行を畳むか、縦に縮小してから、もう一度押してください / "Fold a row or zoom out vertically, then press again" | 1 | 1 | `docs/spec/_source/display-words.json:3027` | どれかのタスクグループを畳むか、縦に縮小してから、もう一度押してください | Fold a task group or zoom out vertically, then press again |  |
| J2-028 | a | 開いている行が 1 つもありません / "No row is open" | 1 | 1 | `docs/spec/_source/display-words.json:3034` | 開いているタスクグループが 1 つもありません | No task group is open |  |
| J2-029 | a | どれかの行を開いてから、もう一度押してください / "Open a row first, then press again" | 1 | 1 | `docs/spec/_source/display-words.json:3038` | どれかのタスクグループを開いてから、もう一度押してください | Open a task group first, then press again |  |
| J2-030 | a | 行が多すぎて、この大きさでは描けません / "There are too many rows to draw at this size" | 1 | 1 | `docs/spec/_source/display-words.json:3144` | タスクグループが多すぎて、この大きさでは描けません | There are too many task groups to draw at this size |  |
| J2-031 | a | そこには注記を置く行がありません / "There is no row there to put the annotation on" | 1 | 1 | `docs/spec/_source/display-words.json:3155` | そこには注記を置くタスクグループがありません | There is no task group there to put the annotation on |  |
| J2-032 | a | 行の上で置いてください / "Place it over a row" | 1 | 1 | `docs/spec/_source/display-words.json:3159` | タスクグループの上で置いてください | Place it over a task group |  |
| J2-033 | a | これ以上深い段には行を追加できません / "A row cannot be added any deeper than this" | 1 | 1 | `docs/spec/_source/display-words.json:3166` | これ以上深い段にはタスクグループを追加できません | A task group cannot be added any deeper than this |  |
| J2-034 | a | もっと浅い行に追加してください / "Add it to a shallower row" | 1 | 1 | `docs/spec/_source/display-words.json:3170` | もっと浅いタスクグループに追加してください | Add it to a shallower task group |  |
| J2-035 | a | 自分自身や、その下にある行の中へは動かせません / "A row cannot be moved under itself or under one of its own descendants" | 1 | 1 | `docs/spec/_source/display-words.json:3276` | 自分自身や、その下にあるタスクグループの中へは動かせません | A task group cannot be moved under itself or under one of its own descendants |  |
| J2-036 | a | 先に外へ出してから、親にしたい行の下へ動かしてください / "Move it out first, then under the row you want as its parent" | 1 | 1 | `docs/spec/_source/display-words.json:3280` | 先に外へ出してから、親にしたいタスクグループの下へ動かしてください | Move it out first, then under the task group you want as its parent |  |
| J2-037 | a | この行は読み取り専用です（編集グループが設定されています） / "This row is read-only (an edit group is set on it)" | 1 | 1 | `docs/spec/_source/display-words.json:3342` | このタスクグループは読み取り専用です（編集グループが設定されています） | This task group is read-only (an edit group is set on it) |  |
| J2-038 | a | 編集グループの無い行へコピーしてから編集してください / "Copy it into a row with no edit group, then edit it" | 1 | 1 | `docs/spec/_source/display-words.json:3346` | 編集グループの無いタスクグループへコピーしてから編集してください | Copy it into a task group with no edit group, then edit it |  |
| J2-039 | a | ピン止め行が多くて検索結果を表示できません。 / "Too many pinned rows to show the search result." | 1 | 1 | `docs/spec/_source/display-words.json:3364` | ピン止めのタスクグループが多くて検索結果を表示できません。 | Too many pinned task groups to show the search result. |  |
| J2-040 | a | 行見出しパネル / "Row Title Panel" | 1 | 1 | `docs/spec/_source/display-words.json:4077` | タスクグループパネル | Task Group Panel |  |
| J2-041 | a | 対象で意味が決まる。コメントボックス＝プロパティパネルを開いて本文を編集、ハイライトボックス＝プロパティパネルを開いて枠の色を編集、名称ラベル＝名称、担当ラベル＝プロパティパネルを開いて担当者を編集、タスクと実績＝プロパティパネルを開いて名前を編集、行見出し＝行名 / "What it does … | 1 | 1 | `docs/spec/_source/display-words.json:4300` | 対象で意味が決まる。コメントボックス＝プロパティパネルを開いて本文を編集、ハイライトボックス＝プロパティパネルを開いて枠の色を編集、名称ラベル＝名称、担当ラベ… | What it does depends on what it lands on -- Comment Box: opens the Properties P… |  |
| J2-042 | a | 日付を変えずに行だけを移す（選択に無いタスクは選択に足す） / "Move to another row only, keeping the dates; a task outside the Selection joins it" | 1 | 1 | `docs/spec/_source/display-words.json:4322` | 日付を変えずにタスクグループだけを移す（選択に無いタスクは選択に足す） | Move to another task group only, keeping the dates; a task outside the Selectio… |  |
| J2-043 | a | 行タイトル / "Row Title" | 1 | 1 | `docs/spec/_source/display-words.json:4755` | タスクグループ名 | Task Group Name |  |
| J2-044 | c | 行軸（縦）を縮小 / "Zoom the row axis (vertical) out" | 1 | 1 | `docs/spec/_source/display-words.json:174` | タスクグループ軸（縦）を縮小 / or 縦軸を縮小 | Zoom the task group axis (vertical) out |  |
| J2-045 | c | 行軸（縦）を拡大 / "Zoom the row axis (vertical) in" | 1 | 1 | `docs/spec/_source/display-words.json:185` | タスクグループ軸（縦）を拡大 / or 縦軸を拡大 | Zoom the task group axis (vertical) in |  |
| J2-046 | c | 行の間隔 / "rowGap" | 1 | 1 | `docs/spec/_source/display-words.json:1766` | タスクグループの間隔 | rowGap (keep the key?) or taskGroupGap |  |
| J2-047 | c | 行名の文字 / "rowTitleFont" | 1 | 1 | `docs/spec/_source/display-words.json:1969` | タスクグループ名の文字 | rowTitleFont (keep the key?) or taskGroupNameFont |  |
| J2-048 | c | 行名の TaskGroup の深さ 1 段ぶんのインデント / "rowTitleIndent" | 1 | 1 | `docs/spec/_source/display-words.json:1976` | タスクグループ名の TaskGroup の深さ 1 段ぶんのインデント | rowTitleIndent (keep the key?) or taskGroupNameIndent |  |
| J2-049 | c | TaskGroup 深さ 1 の行名の倍率 / "rowTitleTopScale" | 1 | 1 | `docs/spec/_source/display-words.json:1983` | TaskGroup 深さ 1 のタスクグループ名の倍率 | rowTitleTopScale (keep the key?) or taskGroupNameTopScale |  |
| J2-050 | c | 別の行に表示中 / "shown on another row" | 1 | 1 | `docs/spec/_source/display-words.json:3835` | 別のタスクグループに表示中 | shown on another task group |  |
| J2-051 | c | 行軸（縦）だけをズームする / "Zoom the row axis only" | 1 | 1 | `docs/spec/_source/display-words.json:4190` | タスクグループ軸（縦）だけをズームする / or 縦軸だけをズームする | Zoom the task group axis only |  |
| J2-052 | c | 対象で意味が決まる。コメントボックス＝プロパティパネルを開いて本文を編集、ハイライトボックス＝プロパティパネルを開いて枠の色を編集、名称ラベル＝名称、担当ラベル＝プロパティパネルを開いて担当者を編集、タスクと実績＝プロパティパネルを開いて名前を編集、行見出し＝行名 / "What it does … | 1 | 1 | `docs/spec/_source/display-words.json:4300` | 対象で意味が決まる。コメントボックス＝プロパティパネルを開いて本文を編集、ハイライトボックス＝プロパティパネルを開いて枠の色を編集、名称ラベル＝名称、担当ラベ… | What it does depends on what it lands on -- Comment Box: opens the Properties P… |  |
| J2-053 | c | この行を束ねる上位タスクが無い / "No summary task holds this row" | 1 | 1 | `docs/spec/_source/display-words.json:5256` | このタスクを束ねる上位タスクが無い ? | No summary task holds this task ? |  |
| J2-054 | b | 先行 / "predecessors" | 2 | 1 | `docs/spec/_source/display-words.json:1505` | - | - |  |
| J2-055 | b | 例外日の行を追加する / "Add an exception day row" | 1 | 1 | `docs/spec/_source/display-words.json:1208` | - | - |  |
| J2-056 | b | この例外日の行を削除する（適用するまで文書は変わらない） / "Delete this exception day row (the document changes only when applied)" | 1 | 1 | `docs/spec/_source/display-words.json:1219` | - | - |  |
| J2-057 | b | いまの文書を読み直してから、もう一度行ってください / "Read the current document again, then try once more" | 1 | 1 | `docs/spec/_source/display-words.json:2785` | - | - |  |
| J2-058 | b | ドラッグを終えてから、もう一度行ってください / "Finish the drag, then try once more" | 1 | 1 | `docs/spec/_source/display-words.json:2796` | - | - |  |
| J2-059 | b | 編集を確定するか取りやめてから、もう一度行ってください / "Commit or cancel the edit, then try once more" | 1 | 1 | `docs/spec/_source/display-words.json:2807` | - | - |  |
| J2-060 | b | 少し待ってから、もう一度行ってください / "Wait a moment, then try once more" | 1 | 1 | `docs/spec/_source/display-words.json:2818` | - | - |  |
| J2-061 | b | 受け付けられなかった操作を取り除いて、もう一度行ってください / "Take out the refused change, then try once more" | 1 | 1 | `docs/spec/_source/display-words.json:2829` | - | - |  |
| J2-062 | b | 画面の問いに答えが出てから、もう一度行ってください / "Once the question on the screen has been answered, try once more" | 1 | 1 | `docs/spec/_source/display-words.json:3467` | - | - |  |
| J2-063 | b | もう一度行ってください。続くときは、直前の操作を控えてください / "Try once more; if it keeps happening, note what you did" | 1 | 1 | `docs/spec/_source/display-words.json:3478` | - | - |  |
| J2-064 | b | 進行中 / "In progress" | 1 | 1 | `docs/spec/_source/display-words.json:4799` | - | - |  |
| J2-065 | b | 同じタスクを先行と後続にする依存（自己依存） / "A dependency links a task to itself" | 1 | 1 | `docs/spec/_source/display-words.json:5151` | - | - |  |
| J2-066 | b | 後続が完了しているのに、依存が縛る先行の端がまだ起きていない / "The successor is finished but the predecessor end it waits for has not happened" | 1 | 1 | `docs/spec/_source/display-words.json:5228` | - | - |  |
| J2-067 | b | 手で完了にしたマイルストーンの先行に、未完了がある / "A milestone finished by hand has an unfinished predecessor" | 1 | 1 | `docs/spec/_source/display-words.json:5235` | - | - |  |
| J2-068 | b | 先行が未着手なのに、後続が着手済み / "The predecessor has not started but the successor has" | 1 | 1 | `docs/spec/_source/display-words.json:5263` | - | - |  |
| J2-069 | b | 先行の無いマイルストーンは診断できない / "A milestone with no predecessor cannot be diagnosed" | 1 | 1 | `docs/spec/_source/display-words.json:5300` | - | - |  |

英文側だけを数えた E1 の行（同じ見出し語の英語。2.1 と重なる）:

| # | 区分 | パターン | 件数 | ファイル数 | 例 | 案 ja | 案 en | 生成物 |
|---|---|---|---:|---:|---|---|---|---|
| SW-01 | a | row/rows in entrance hints (IC-*): 'this row', 'every row below this one', 'Collapse every row' | 14 | 1 | `docs/spec/_source/display-words.json:857` | タスクグループ | task group / task groups |  |
| SW-02 | a | entrance labels 'Delete Row' / 'Delete All Rows' / 'Add Top Row' | 3 | 1 | `docs/spec/_source/display-words.json:919` | タスクグループを削除 / すべてのタスクグループを削除 / 最上位にタスクグループを足す | Delete Task Group / Delete All Task Groups / Add Top Task Group |  |
| SW-03 | a | row/rows in refusal reasons and next steps (RS-*): 'This row draws no child', 'Open a row first' | 23 | 1 | `docs/spec/_source/display-words.json:2947` | タスクグループ | task group |  |
| SW-04 | a | 'pinned rows' in RS too-many-pinned reason | 2 | 1 | `docs/spec/_source/display-words.json:3365` | ピン止めのタスクグループ | pinned task groups |  |
| SW-05 | a | delete questions (QN-*): 'Delete this row and the tasks on it?' / 'Delete all rows ...?' | 2 | 1 | `docs/spec/_source/display-words.json:3488` | このタスクグループと…を削除しますか | Delete this task group and the tasks on it? / Delete all task groups and the ta… |  |
| SW-06 | a | mouse explanations (MK-13 'row title: the row name', MK-16 'Move to another row only') | 3 | 1 | `docs/spec/_source/display-words.json:4301` | タスクグループ見出し：タスクグループ名 / 別のタスクグループへだけ移す | task group title: the task group name / Move to another task group only |  |
| SW-07 | a | 'Row Title Panel' (surface heading en; K-71 ja word 'Row Title Panel の幅') | 2 | 1 | `docs/spec/_source/display-words.json:2193` | タスクグループパネル / タスクグループパネルの幅 | Task Group Panel |  |
| SW-08 | a | 'Row Title' (SQ-8 search-table column) | 1 | 1 | `docs/spec/_source/display-words.json:4756` | タスクグループ名 | Task Group Name |  |
| SW-09 | a | 'shown on another row' (confirmation mark) | 1 | 1 | `docs/spec/_source/display-words.json:3836` | 別のタスクグループに表示中 | shown on another task group |  |
| SW-10 | c | 'Zoom the row axis (vertical) in/out', 'Zoom the row axis only' | 3 | 1 | `docs/spec/_source/display-words.json:175` | (縦の軸 / タスクグループの軸?) | vertical axis? / task group axis? |  |
| SW-11 | c | 'No summary task holds this row' (VS-2, milestone with children) | 1 | 1 | `docs/spec/_source/display-words.json:5257` | ? | ? |  |
| SW-12 | c | settings word en = key name (rowGap, rowTitleFont, rowTitleIndent, rowTitleTopScale, rowTitlePanelWidth, pinnedRowMax) | 6 | 1 | `docs/spec/_source/display-words.json:1767` | - | taskGroupGap / taskGroupTitleFont / ... (if keys renamed) |  |
| SW-13 | b | 'exception day row' (calendar editor) | 2 | 1 | `docs/spec/_source/display-words.json:1209` | - | - |  |
| SW-14 | a | 'Too many rows to draw' / 'Fold some rows' (export refusals) | 3 | 1 | `docs/spec/_source/display-words.json:2929` | タスクグループ | task groups |  |

### 2.2 「WBS の親」と「親」—— 画面の語

| # | 区分 | パターン | 件数 | ファイル数 | 例 | 案 ja | 案 en | 生成物 |
|---|---|---|---:|---:|---|---|---|---|
| W1-001 | a | parent in screen words meaning the Task WBS parent (child to parent, the parent is finished...) | 14 | 1 | `docs/spec/_source/display-words.json:681` | 親タスク | parent task |  |
| W1-003 | a | 「親」単独（Task の WBS の親: 親の名・親を結ぶ・親が決まらない・親の点 ほか） | 7 | 1 | `docs/spec/_source/display-words.json:5128` | 親タスク | parent task |  |
| W1-005 | a | 「親子関係」「親子の関係」（Task の WBS） | 5 | 1 | `docs/spec/_source/display-words.json:3419` | 親タスクと子タスクの関係 | parent-task relation |  |
| W1-007 | a | WBS parent(s) | 4 | 1 | `docs/spec/_source/display-words.json:681` | 親タスク | parent task(s) |  |
| W1-009 | a | 「子から親へ」（矢印・引く向き） | 3 | 1 | `docs/spec/_source/display-words.json:680` | 子タスクから親タスクへ | from the child task to the parent task |  |
| W1-010 | a | 「WBS の親」 | 3 | 1 | `docs/spec/_source/display-words.json:691` | 親タスク | parent task |  |
| W1-013 | a | 「WBS の親子」 | 1 | 1 | `docs/spec/_source/display-words.json:680` | 親タスクと子タスク | parent and child tasks |  |
| W1-014 | a | 「親子の進捗の疑義」（K-140 / FR-131） | 1 | 1 | `docs/spec/_source/display-words.json:2529` | 親タスクの進捗の疑義 | parent-task progress doubt |  |
| W1-015 | a | parent link / "WBS parent link" | 1 | 1 | `docs/spec/_source/display-words.json:4902` | 親タスクの結び | parent-task link |  |
| W1-020 | c | parentProgress* key text / "{parent}" placeholder inside screen words | 4 | 1 | `docs/spec/_source/display-words.json:2530` | parentTaskProgress* | parentTaskProgress* |  |
| W1-021 | c | 「親定義」（IC-142 の名・親定義のドラッグ） | 2 | 1 | `docs/spec/_source/display-words.json:687` | 親タスク設定 | Set Parent Task |  |
| W1-022 | c | Set a WBS Parent（IC-142 の英名） | 2 | 1 | `docs/spec/_source/display-words.json:688` | 親タスク設定 | Set Parent Task |  |
| W1-025 | c | 「親子判別」（IC-141 の名・S-484） | 1 | 1 | `docs/spec/_source/display-words.json:676` | 親タスク表示 | Show Parent Tasks |  |
| W1-026 | c | Show WBS Parents（IC-141 の英名） | 1 | 1 | `docs/spec/_source/display-words.json:677` | 親タスク表示 | Show Parent Tasks |  |
| W1-027 | c | 「WBS のネストの深さの上限」（K-99 importMaxDepth / S-115） | 1 | 1 | `docs/spec/_source/display-words.json:2403` | 親タスクの入れ子の深さの上限 | Maximum depth of nested parent tasks |  |
| W1-028 | c | `wbsParentChoice` | 1 | 1 | `docs/spec/_source/display-words.json:4883` | parentTaskChoice | parentTaskChoice |  |
| W1-033 | b | transparent / "Transparent" | 2 | 1 | `docs/spec/_source/display-words.json:4470` | - | - |  |
| W1-035 | b | 「親」= TaskGroup の親（親の行・親へ畳み込む・親をまたぐ・同じ親の下の並び） | 1 | 1 | `docs/spec/_source/display-words.json:3280` | - | - |  |
| W1-036 | b | the row you want as its parent (TaskGroup parent) | 1 | 1 | `docs/spec/_source/display-words.json:3281` | - | - |  |
| W1-037 | b | 「親タスク」（既に新しい語） | 1 | 1 | `docs/spec/_source/display-words.json:3408` | - | - |  |
| W1-038 | b | parent task in screen words (already the new word) | 1 | 1 | `docs/spec/_source/display-words.json:3409` | - | - |  |

## 3. 区分 c —— 利用者に問うもの

⭐ 利用者は 10 問すべてに答えた（右の欄、逐語は `JDG-1659`〜`JDG-1668`）。すべて本席の案のとおりである。件数は 4〜9 節のパターンを足したもので、テストの数は推定（0.1 節）。

| 問 | 何を決めるか | 主な所と件数 | 本席の案 | 答え |
|---|---|---|---|---|
| Q0 | 2 節の画面の語の案（「行」→「タスクグループ」、「行見出しパネル」→「タスクグループパネル」、「行タイトル」→「タスクグループ名」、「WBS の親」→「親タスク」、英語は row → task group、WBS parent → parent task） | 和文 約 45 句・英文 約 60 句（2 節） | このまま当てる | `JDG-1659` —— 案のとおり当てる |
| Q1 | 縦のズームの軸「行軸（縦）」/ "row axis"（`IC-*` の説明、`MK-4`、`rowZoom*`） | 文書 約 70・src 72・テスト 約 40 | 「縦軸」/ "vertical axis"（コードは `zoomY` 系へ） | `JDG-1660` —— 「縦軸」/ vertical axis |
| Q2 | 画面に出ない構造名 `Row Area`（`U-50`、日本語は無い）と `rowArea*` | 文書 約 95・src 155・テスト 約 630 | `Task Group Area` / `taskGroupArea*` | `JDG-1661` —— `Task Group Area` / `taskGroupArea*` |
| Q3 | パネルの中の 1 つ 1 つの見出し「行見出し」/ `Row Title`・`Row Title Tree`（`U-23`）・`rowTitle*` | 文書 約 40・src 59・テスト 約 150 | 見出しは「タスクグループ見出し」/ "task group title"、名は「タスクグループ名」 | `JDG-1662` —— 案 A —— 箱は「タスクグループ見出し」/ `taskGroupTitle*`、字は「タスクグループ名」/ `taskGroupName*` |
| Q4 | 文書に保存される設定の鍵 `rowGap`・`rowTitleFont`・`rowTitleIndent`・`rowTitleTopScale`・`rowTitlePanelWidth`・`pinnedRowMax`（設定の英語の欄名は鍵そのもの） | src 71・テスト 約 180・画面 6 | 鍵も改名する（稼働前で旧形式の読み替えは要らない） | `JDG-1663` —— 鍵も改名する |
| Q5 | 遅延診断の文の「行」（`VS-2`「この行を束ねる上位タスクが無い」、「信用できない行」「矛盾の行」など）—— タスクグループではなく、診断の対象のタスクを指す | 仕様 22・画面 1 | 「タスク」と書く（`VS-2` は「このタスクを束ねる上位タスクが無い」） | `JDG-1664` —— 「タスク」と書く |
| Q6 | コードの名をどこまで変えるか —— src のファイル名 9 本、テストのファイル名 41 本、DOM の `data-role="Row Title Panel"`、エージェント API で公開している名（`rowGroupId`・`chosenRows`・`readDocumentRowIds`・`kind: 'row'`） | src 約 60・テスト 約 400 | すべて変える（稼働前） | `JDG-1665` —— すべて変える |
| Q7 | `wbsParent*` の識別子と、保存の列 `wbsParentUid` | src 1,077＋約 200・テスト 1,243＋約 140・仕様 約 120 | `parentTask*` / `parentTaskUid` に変える | `JDG-1666` —— `parentTask*` / `parentTaskUid` に変える |
| Q8 | パレットのアイコンの名「親子判別」/ "Show WBS Parents"（`IC-141`）と「親定義」/ "Set a WBS Parent"（`IC-142`） | 画面 4・仕様と src とテストに約 30 | 「親タスク表示」/ "Show Parent Tasks"、「親タスク設定」/ "Set Parent Task" | `JDG-1667` —— 「親タスク表示」/ Show Parent Tasks、「親タスク設定」/ Set Parent Task |
| Q9 | 「WBS の子・子孫・祖先・兄弟・部分木」の語の仲間と、「WBS のネストの深さの上限」（`K-99`、`importMaxDepth`、親タスクのつながりの深さ） | 仕様 42・画面 1 | 「子タスク」「子孫タスク」「祖先タスク」…、「親タスクの入れ子の深さの上限」 | `JDG-1668` —— 「タスク」で揃える |

### 3.1 本席が決めて問わないもの

- 用語集の `A-2`（表 T-006b、「行」は `Rows` か `TaskGroup` かを明示する、という規則）は、語が 1 つになると要らなくなる。改名の CR で消すか、「タスクグループ」の規則に書き換える。
- `previous-project-result/` の見本のパス（`11-row-controls` など）と、その中の CSS の `.row` は、過去の成果物の名なので残す（b）。仕様から貼ったリンクのアンカー（`user-order.md#行と階層`、6 件）は、行き先の見出しに合わせる。
- 図のファイル名 `fig-hit-stacked-row.svg` は、改名の CR で `fig-hit-stacked-task-group.svg` にする（中身は変えない）。

## 4. 仕様 01-04 の和文「行」（J1、全パターン）

| # | 区分 | パターン | 件数 | ファイル数 | 例 | 案 ja | 案 en | 生成物 |
|---|---|---|---:|---:|---|---|---|---|
| J1-A01 | a | 行見出しパネル (Row Title Panel) | 54 | 1 | `docs/spec/01-04-requirements.md:655` | タスクグループパネル | Task Group Panel |  |
| J1-A03 | a | 行の名前 / 行名 / 行タイトル (TaskGroup.label) | 54 | 1 | `docs/spec/01-04-requirements.md:1161` | タスクグループ名 | task group name |  |
| J1-A04 | a | 行の帯 / 行の帯高 / 行の地 (row band) | 52 | 1 | `docs/spec/01-04-requirements.md:232` | タスクグループの帯 | task group band |  |
| J1-A05 | a | ピン止めした行 / 留めた行 (pinned row) | 48 | 1 | `docs/spec/01-04-requirements.md:1759` | ピン止めしたタスクグループ | pinned task group |  |
| J1-A06 | a | 行自身（その行自身） | 15 | 1 | `docs/spec/01-04-requirements.md:1740` | そのタスクグループ自身 | the task group itself |  |
| J1-A07 | a | 行の高さ / 行の最小の高さ / 行高固定 | 11 | 1 | `docs/spec/01-04-requirements.md:1573` | タスクグループの高さ | task group height |  |
| J1-A08 | a | 行の操作子 / 行の掴み代 / 行の格子 | 19 | 1 | `docs/spec/01-04-requirements.md:1359` | タスクグループの操作子 | task group controls |  |
| J1-A09 | a | 行の木 / 行の木の状態 / 行と階層 | 26 | 2 | `docs/spec/01-04-requirements.md:167` | タスクグループの木 | task group tree |  |
| J1-A10 | a | 行の識別子 (anchorGroupId etc.) | 10 | 1 | `docs/spec/01-04-requirements.md:848` | タスクグループの識別子 | task group identifier |  |
| J1-A11 | a | 行の色 (TaskGroup.color) | 8 | 1 | `docs/spec/01-04-requirements.md:655` | タスクグループの色 | task group color |  |
| J1-A12 | a | 畳んだ行・隠した行・開いた行・描かれていない行 | 103 | 1 | `docs/spec/01-04-requirements.md:660` | 畳んだタスクグループ・隠したタスクグループ | folded / hidden task group |  |
| J1-A13 | a | 行を作る・足す・立てる・消す・削除する | 64 | 1 | `docs/spec/01-04-requirements.md:227` | タスクグループを作る／消す | create / delete a task group |  |
| J1-A14 | a | 行に載る・載せる行・別の行へ移す | 71 | 1 | `docs/spec/01-04-requirements.md:260` | タスクグループに載る | sit on a task group |  |
| J1-A15 | a | 行の数・N 行・1 行 ＝ 1 対象・行数（TaskGroup の数） | 57 | 1 | `docs/spec/01-04-requirements.md:25` | タスクグループの数 / N 個のタスクグループ | number of task groups |  |
| J1-A99 | a | 行（TaskGroup、その他の文脈: この行・その行・最上位の行・配下の行・各行・全行…） | 593 | 2 | `docs/spec/01-04-requirements.md:68` | タスクグループ | task group |  |
| J1-B01 | b | 行 ID | 178 | 1 | `docs/spec/01-04-requirements.md:33` | - | - |  |
| J1-B02 | b | 本行 | 114 | 1 | `docs/spec/01-04-requirements.md:196` | - | - |  |
| J1-B03 | b | 表 T-xxx の行・同表の行・本表の行・`XX-n` の行・`xxxPressed` の行・表 T-xxx の全行／各行 | 74 | 2 | `docs/development-rules/09-tools.md:154` | - | - |  |
| J1-B04 | b | 仕様表の行（表番号を前に置かない散文: 表に行を足す・行を持たない・N 行の表・設定値の行） | 224 | 2 | `docs/spec/_source/published-entries.json:1188` | - | - |  |
| J1-B04-gen | b | 仕様表の行（表番号を前に置かない散文: 表に行を足す・行を持たない・N 行の表・設定値の行） | 1 | 1 | `docs/spec/_assets/tbl-published-entries.md:25` | - | - | はい |
| J1-B05 | b | 文字の行: 1 行に並べる・行目・改行・空行・複数行・行送り・行番号・コマンド行・deltaMode の行 | 87 | 2 | `docs/spec/_source/settings.json:3923` | - | - |  |
| J1-B05-gen | b | 文字の行: 1 行に並べる・行目・改行・空行・複数行・行送り・行番号・コマンド行・deltaMode の行 | 1 | 1 | `docs/spec/_assets/tbl-settings.md:413` | - | - | はい |
| J1-B06a | b | プロパティパネル・面の欄の行（表 T-016 の入力の行） | 35 | 1 | `docs/spec/01-04-requirements.md:1902` | - | - |  |
| J1-B06b | b | 検索パネル・遅延診断レポートの表の行 | 38 | 1 | `docs/spec/01-04-requirements.md:3681` | - | - |  |
| J1-B06c | b | 題の行・見出しの行（ウインドウ・面の題の帯） | 53 | 1 | `docs/spec/01-04-requirements.md:2581` | - | - |  |
| J1-B06d | b | 説明（ツールチップ）・通知・追従札の行 | 44 | 1 | `docs/spec/01-04-requirements.md:3350` | - | - |  |
| J1-B06e | b | 暇の例外日・曜日の行 | 8 | 1 | `docs/spec/01-04-requirements.md:4391` | - | - |  |
| J1-B06f | b | 担当者名簿の行 | 5 | 1 | `docs/spec/01-04-requirements.md:2577` | - | - |  |
| J1-B06g | b | 色相・色の一覧の行 | 6 | 1 | `docs/spec/01-04-requirements.md:2134` | - | - |  |
| J1-B06h | b | ヘルプの一覧・備考・ライセンスの行 | 15 | 1 | `docs/spec/01-04-requirements.md:7768` | - | - |  |
| J1-B08 | b | MSPDI・取込入力の行（中身のない行・OutlineLevel 0 の行・ID は行の番号・Exception の行） | 21 | 2 | `docs/spec/_source/erd.json:3671` | - | - |  |
| J1-B08-gen | b | MSPDI・取込入力の行（中身のない行・OutlineLevel 0 の行・ID は行の番号・Exception の行） | 1 | 1 | `docs/spec/_assets/fig-erd-detail.md:481` | - | - | はい |
| J1-B09 | b | 字を含むだけの語（先行・進行中・実行・平行・退行・刊行・発行・行かせる…） | 166 | 2 | `docs/spec/01-04-requirements.md:43` | - | - |  |
| J1-B10 | b | 同行（同じ表の行） | 23 | 1 | `docs/spec/01-04-requirements.md:382` | - | - |  |
| J1-B11 | b | 従来の日程管理ソフトの行（1 行に 1 タスク） | 7 | 1 | `docs/spec/01-04-requirements.md:23` | - | - |  |
| J1-C01 | c | 行見出し（パネルでない: 行見出しの名前・行見出しの箱・行見出しの側・行見出しの木） | 14 | 1 | `docs/spec/01-04-requirements.md:651` | タスクグループ見出し（名前ならタスクグループ名） | task group title (or task group name) |  |
| J1-C02 | c | 行の軸 / 行軸（縦） (zoomY axis) | 25 | 2 | `docs/spec/01-04-requirements.md:2380` | タスクグループの軸？（縦の軸も候補） | task-group axis? (or vertical axis) |  |
| J1-C03 | c | 遅れの診断の散文の行（信用できない行・赤の行・紫の行・矛盾の行・巣き添えの行） | 22 | 1 | `docs/spec/01-04-requirements.md:62` | タスク（またはレポートの行） | task (or report row) |  |
| J1-C04 | c | リンクのアンカー user-order.md#行と階層 | 6 | 1 | `docs/spec/01-04-requirements.md:583` | 結び先の見出しに従う | follows the target heading |  |
| J1-C05 | c | 表 T-006b の A-2（語「行」そのものの規則） | 2 | 1 | `docs/spec/01-04-requirements.md:380` | 「タスクグループ」の規則へ書き換え | rewrite the rule for "task group" |  |

## 5. 仕様 05-07・_assets・_source・開発規則の和文「行」（J2、画面の語を除く）

### 5.1 区分 a と c

| # | 区分 | パターン | 件数 | ファイル数 | 例 | 案 ja | 案 en | 生成物 |
|---|---|---|---:|---:|---|---|---|---|
| J2-070 | a | 「行」 = TaskGroup (other phrasing: 行を作る・行を足す・親の行・この行・すべての行 ...) | 34 | 1 | `docs/spec/05-07-design.md:347` | タスクグループ | task group |  |
| J2-071 | a | 「描く行」「スクロールする行」「最後の行」「行の並び」 (layout of drawn TaskGroups) | 28 | 1 | `docs/spec/05-07-design.md:347` | 描くタスクグループ | drawn task groups |  |
| J2-072 | a | 「行の帯」「行の帯高」「行の縦位置」「行の高さ」 (row band geometry) | 11 | 1 | `docs/spec/05-07-design.md:479` | タスクグループの帯 | task group band |  |
| J2-073 | a | 「畳んだ行」「隠した行」「配下の行」「行を畳む/開く」 (fold / hide / descendants) | 9 | 1 | `docs/spec/05-07-design.md:409` | 畳んだタスクグループ・配下のタスクグループ | folded / descendant task groups |  |
| J2-074 | a | 「ピン止めした行」「ピン止め行」 (pinned row) | 9 | 1 | `docs/spec/05-07-design.md:412` | ピン止めのタスクグループ | pinned task group |  |
| J2-075 | a | 「行の木」 (TaskGroup tree / treeState) | 7 | 1 | `docs/spec/05-07-design.md:335` | タスクグループの木 | task group tree |  |
| J2-076 | a | 「行名」「行の名前」「行タイトル」 (TaskGroup.label) | 5 | 1 | `docs/spec/05-07-design.md:346` | タスクグループ名 | task group name |  |
| J2-077 | a | 「行に載る/載っているタスク」「タスクと行」「1 つの行に重なる」 (task placed on a TaskGroup) | 5 | 1 | `docs/spec/05-07-design.md:420` | タスクグループ（に載るタスク） | task group (holding tasks) |  |
| J2-078 | a | 「行の操作子」「行の掴み(代)」「掴んだ行」 (row controls and grab) | 4 | 1 | `docs/spec/05-07-design.md:343` | タスクグループの操作子・掴み代 | task group controls / grab |  |
| J2-079 | a | 「行の色」「行の縞」 (TaskGroup colour / stripes) | 3 | 1 | `docs/spec/05-07-design.md:439` | タスクグループの色・縞 | task group colour / stripes |  |
| J2-080 | a | 「行見出しパネル」 (Row Title Panel) | 3 | 1 | `docs/spec/05-07-design.md:1353` | タスクグループパネル | Task Group Panel |  |
| J2-081 | a | 「行の間隔」「行と行のあいだ」 (rowGap) | 2 | 1 | `docs/spec/05-07-design.md:1363` | タスクグループの間隔 | task group gap |  |
| J2-082 | a | 「1 行」 counting TaskGroups (1 つのタスクは 1 行にしか載らない, 1 行または全行) | 1 | 1 | `docs/spec/05-07-design.md:440` | 1 つのタスクグループ | one task group |  |
| J2-083 | c | 「行ズーム」 (vertical zoom) | 3 | 1 | `docs/spec/05-07-design.md:339` | タスクグループズーム? / 縦ズーム? | task group zoom? / vertical zoom? |  |
| J2-084 | c | 「行軸（縦）」「行の軸」 (vertical zoom axis) | 3 | 1 | `docs/spec/05-07-design.md:462` | タスクグループ軸（縦）? / 縦軸? | task group axis? / vertical axis? |  |
| J2-085 | c | 「行見出し」 (the cell in the panel) | 1 | 1 | `docs/spec/05-07-design.md:1497` | タスクグループ見出し | task group title |  |
| J2-108 | a | 「行」 = TaskGroup (other phrasing: 行を作る・行を足す・親の行・この行・すべての行 ...) | 98 | 7 | `docs/spec/_source/erd.json:1461` | タスクグループ | task group |  |
| J2-109 | a | 「行の色」「行の縞」 (TaskGroup colour / stripes) | 25 | 4 | `docs/spec/_source/erd.json:1606` | タスクグループの色・縞 | task group colour / stripes |  |
| J2-110 | a | 「行の操作子」「行の掴み(代)」「掴んだ行」 (row controls and grab) | 24 | 3 | `docs/spec/_source/published-entries.json:2386` | タスクグループの操作子・掴み代 | task group controls / grab |  |
| J2-111 | a | 「行見出しパネル」 (Row Title Panel) | 18 | 3 | `docs/spec/_source/published-entries.json:816` | タスクグループパネル | Task Group Panel |  |
| J2-112 | a | 「行の帯」「行の帯高」「行の縦位置」「行の高さ」 (row band geometry) | 15 | 5 | `docs/spec/_source/erd.json:1622` | タスクグループの帯 | task group band |  |
| J2-113 | a | 「描く行」「スクロールする行」「最後の行」「行の並び」 (layout of drawn TaskGroups) | 14 | 4 | `docs/spec/_source/erd.json:1570` | 描くタスクグループ | drawn task groups |  |
| J2-114 | a | 「畳んだ行」「隠した行」「配下の行」「行を畳む/開く」 (fold / hide / descendants) | 12 | 4 | `docs/spec/_source/image-to-grs-json-prompt.ja.md:31` | 畳んだタスクグループ・配下のタスクグループ | folded / descendant task groups |  |
| J2-115 | a | 「行名」「行の名前」「行タイトル」 (TaskGroup.label) | 11 | 5 | `docs/spec/_source/erd.json:1514` | タスクグループ名 | task group name |  |
| J2-116 | a | 「行の木」 (TaskGroup tree / treeState) | 11 | 5 | `docs/spec/_source/erd.json:1570` | タスクグループの木 | task group tree |  |
| J2-117 | a | 「行に載る/載っているタスク」「タスクと行」「1 つの行に重なる」 (task placed on a TaskGroup) | 10 | 3 | `docs/spec/_source/erd.json:1631` | タスクグループ（に載るタスク） | task group (holding tasks) |  |
| J2-118 | a | 「ピン止めした行」「ピン止め行」 (pinned row) | 8 | 3 | `docs/spec/_source/erd.json:429` | ピン止めのタスクグループ | pinned task group |  |
| J2-119 | a | 「表示の上端が指す行」 (scrollGroupId) | 4 | 2 | `docs/spec/_source/erd.json:421` | 表示の上端が指すタスクグループ | task group at the top of the view |  |
| J2-120 | a | 「1 行」 counting TaskGroups (1 つのタスクは 1 行にしか載らない, 1 行または全行) | 2 | 2 | `docs/spec/_source/erd.json:1653` | 1 つのタスクグループ | one task group |  |
| J2-121 | c | 「行軸（縦）」「行の軸」 (vertical zoom axis) | 18 | 4 | `docs/spec/_source/published-entries.json:849` | タスクグループ軸（縦）? / 縦軸? | task group axis? / vertical axis? |  |
| J2-122 | c | 「行見出し」 (the cell in the panel) | 3 | 2 | `docs/spec/_source/published-entries.json:2584` | タスクグループ見出し | task group title |  |
| J2-123 | c | cannot tell TaskGroup from table row / other | 2 | 2 | `docs/spec/_source/published-entries.json:1115` | タスクグループ? | task group? |  |
| J2-150 | a | 「行」 = TaskGroup (other phrasing: 行を作る・行を足す・親の行・この行・すべての行 ...) | 70 | 6 | `docs/spec/_assets/fig-erd-detail.md:210` | タスクグループ | task group | はい |
| J2-151 | a | 「行の色」「行の縞」 (TaskGroup colour / stripes) | 24 | 3 | `docs/spec/_assets/fig-erd-detail.md:374` | タスクグループの色・縞 | task group colour / stripes | はい |
| J2-152 | a | 「行の操作子」「行の掴み(代)」「掴んだ行」 (row controls and grab) | 24 | 3 | `docs/spec/_assets/tbl-published-entries.md:51` | タスクグループの操作子・掴み代 | task group controls / grab | はい |
| J2-153 | a | 「行見出しパネル」 (Row Title Panel) | 18 | 3 | `docs/spec/_assets/tbl-published-entries.md:23` | タスクグループパネル | Task Group Panel | はい |
| J2-154 | a | 「行の帯」「行の帯高」「行の縦位置」「行の高さ」 (row band geometry) | 16 | 5 | `docs/spec/_assets/fig-erd-detail.md:375` | タスクグループの帯 | task group band | はい |
| J2-155 | a | 「描く行」「スクロールする行」「最後の行」「行の並び」 (layout of drawn TaskGroups) | 15 | 4 | `docs/spec/_assets/fig-erd-detail.md:372` | 描くタスクグループ | drawn task groups | はい |
| J2-156 | a | 「行」 = TaskGroup (other phrasing: 行を作る・行を足す・親の行・この行・すべての行 ...) | 14 | 2 | `docs/spec/_assets/design-mcp-relay.md:125` | タスクグループ | task group |  |
| J2-157 | a | 「行名」「行の名前」「行タイトル」 (TaskGroup.label) | 13 | 5 | `docs/spec/_assets/fig-erd-detail.md:213` | タスクグループ名 | task group name | はい |
| J2-158 | a | 「行の木」 (TaskGroup tree / treeState) | 13 | 5 | `docs/spec/_assets/fig-erd-detail.md:372` | タスクグループの木 | task group tree | はい |
| J2-159 | a | 「畳んだ行」「隠した行」「配下の行」「行を畳む/開く」 (fold / hide / descendants) | 11 | 3 | `docs/spec/_assets/tbl-published-entries.md:23` | 畳んだタスクグループ・配下のタスクグループ | folded / descendant task groups | はい |
| J2-160 | a | 「ピン止めした行」「ピン止め行」 (pinned row) | 8 | 3 | `docs/spec/_assets/fig-erd-overview.md:69` | ピン止めのタスクグループ | pinned task group | はい |
| J2-161 | a | 「畳んだ行」「隠した行」「配下の行」「行を畳む/開く」 (fold / hide / descendants) | 8 | 1 | `docs/spec/_assets/tbl-glossary.md:128` | 畳んだタスクグループ・配下のタスクグループ | folded / descendant task groups |  |
| J2-162 | a | 「行に載る/載っているタスク」「タスクと行」「1 つの行に重なる」 (task placed on a TaskGroup) | 6 | 2 | `docs/spec/_assets/fig-erd-detail.md:211` | タスクグループ（に載るタスク） | task group (holding tasks) | はい |
| J2-163 | a | 「表示の上端が指す行」 (scrollGroupId) | 4 | 2 | `docs/spec/_assets/fig-erd-overview.md:68` | 表示の上端が指すタスクグループ | task group at the top of the view | はい |
| J2-164 | a | 「行の木」 (TaskGroup tree / treeState) | 4 | 1 | `docs/spec/_assets/tbl-glossary.md:42` | タスクグループの木 | task group tree |  |
| J2-165 | a | 「行見出しパネル」 (Row Title Panel) | 4 | 1 | `docs/spec/_assets/tbl-glossary.md:105` | タスクグループパネル | Task Group Panel |  |
| J2-166 | a | 「ピン止めした行」「ピン止め行」 (pinned row) | 3 | 1 | `docs/spec/_assets/tbl-glossary.md:127` | ピン止めのタスクグループ | pinned task group |  |
| J2-167 | a | 「1 行」 counting TaskGroups (1 つのタスクは 1 行にしか載らない, 1 行または全行) | 2 | 2 | `docs/spec/_assets/fig-erd-detail.md:376` | 1 つのタスクグループ | one task group | はい |
| J2-168 | a | 「行名」「行の名前」「行タイトル」 (TaskGroup.label) | 2 | 1 | `docs/spec/_assets/tbl-glossary.md:134` | タスクグループ名 | task group name |  |
| J2-169 | a | 「表示の上端が指す行」 (scrollGroupId) | 2 | 1 | `docs/spec/_assets/tbl-glossary.md:262` | 表示の上端が指すタスクグループ | task group at the top of the view |  |
| J2-170 | a | 「行の色」「行の縞」 (TaskGroup colour / stripes) | 2 | 1 | `docs/spec/_assets/tbl-glossary.md:449` | タスクグループの色・縞 | task group colour / stripes |  |
| J2-171 | a | glossary U-1 `Rows` = 「行」 (the settled screen name itself) | 1 | 1 | `docs/spec/_assets/tbl-glossary.md:83` | タスクグループ | Task Groups |  |
| J2-172 | a | 「行見出しツリー」 (Row Title Tree) | 1 | 1 | `docs/spec/_assets/tbl-glossary.md:106` | タスクグループツリー | Task Group Tree |  |
| J2-173 | a | 「行に載る/載っているタスク」「タスクと行」「1 つの行に重なる」 (task placed on a TaskGroup) | 1 | 1 | `docs/spec/_assets/tbl-glossary.md:428` | タスクグループ（に載るタスク） | task group (holding tasks) |  |
| J2-174 | a | 「行の帯」「行の帯高」「行の縦位置」「行の高さ」 (row band geometry) | 1 | 1 | `docs/spec/_assets/tbl-glossary.md:451` | タスクグループの帯 | task group band |  |
| J2-175 | c | 「行軸（縦）」「行の軸」 (vertical zoom axis) | 16 | 4 | `docs/spec/_assets/tbl-published-entries.md:23` | タスクグループ軸（縦）? / 縦軸? | task group axis? / vertical axis? | はい |
| J2-176 | c | Japanese name of a settings key spelled with row (rowGap 行の間隔, rowTitleFont 行名の文字, rowTitleIndent, rowTitleSc… | 4 | 1 | `docs/spec/_assets/tbl-glossary.md:202` | タスクグループの間隔 / タスクグループ名の文字 ... | keep rowGap / rename to taskGroupGap? |  |
| J2-177 | c | 「行見出し」 (the cell in the panel) | 3 | 2 | `docs/spec/_assets/tbl-published-entries.md:53` | タスクグループ見出し | task group title | はい |
| J2-178 | c | 「行軸（縦）」「行の軸」 (vertical zoom axis) | 2 | 1 | `docs/spec/_assets/tbl-glossary.md:551` | タスクグループ軸（縦）? / 縦軸? | task group axis? / vertical axis? |  |
| J2-179 | c | cannot tell TaskGroup from table row / other | 1 | 1 | `docs/spec/_assets/tbl-settings.md:629` | タスクグループ? | task group? | はい |
| J2-216 | a | 「行の操作子」「行の掴み(代)」「掴んだ行」 (row controls and grab) | 6 | 2 | `docs/development-rules/03-implementation.md:88` | タスクグループの操作子・掴み代 | task group controls / grab |  |
| J2-217 | a | 「行名」「行の名前」「行タイトル」 (TaskGroup.label) | 5 | 2 | `docs/development-rules/03-implementation.md:93` | タスクグループ名 | task group name |  |
| J2-218 | a | 「行見出しパネル」 (Row Title Panel) | 4 | 3 | `docs/development-rules/03-implementation.md:65` | タスクグループパネル | Task Group Panel |  |
| J2-219 | a | 「行の帯」「行の帯高」「行の縦位置」「行の高さ」 (row band geometry) | 2 | 2 | `docs/development-rules/04-verification.md:141` | タスクグループの帯 | task group band |  |
| J2-220 | a | 「行」 = TaskGroup (other phrasing: 行を作る・行を足す・親の行・この行・すべての行 ...) | 2 | 1 | `docs/development-rules/04-verification.md:276` | タスクグループ | task group |  |
| J2-221 | a | 「行の木」 (TaskGroup tree / treeState) | 1 | 1 | `docs/development-rules/03-implementation.md:130` | タスクグループの木 | task group tree |  |
| J2-222 | a | 「描く行」「スクロールする行」「最後の行」「行の並び」 (layout of drawn TaskGroups) | 1 | 1 | `docs/development-rules/04-verification.md:141` | 描くタスクグループ | drawn task groups |  |
| J2-223 | c | 「行軸（縦）」「行の軸」 (vertical zoom axis) | 2 | 2 | `docs/development-rules/03-implementation.md:87` | タスクグループ軸（縦）? / 縦軸? | task group axis? / vertical axis? |  |
| J2-224 | c | cannot tell TaskGroup from table row / other | 1 | 1 | `docs/development-rules/05-working-method.md:405` | タスクグループ? | task group? |  |

### 5.2 区分 b（領域ごとにまとめる。全行は TSV）

| 領域 | 件数 | パターン数 | 大きいもの（件数） |
|---|---:|---:|---|
| development-rules | 652 | 22 | 「表 T-xxx の行」「本表の行」「`XX-n` の行」「行ごと」「行を持た… 230、「1 行」「2 行」「n 行」 (a line of text / code … 99、台帳・裁定・CR・DFC・PND・件数表の行 (ledger / ruling… 94、「行 ID」 (spec-table row ID) 50、並行・並行性・並行作業 (parallel) 38、「行目」「行番号」「該当行」「行頭」「行末」 (line position) 27、実行・実行時・実行ファイル・再試行 etc. (execute) 25、走行・走行中・走行回数 (a run) 21 |
| spec 05-07 | 198 | 22 | 「行 ID」 (spec-table row ID) 46、「表 T-xxx の行」「本表の行」「`XX-n` の行」「行ごと」「行を持た… 45、実行・実行時・実行ファイル・再試行 etc. (execute) 17、「本行」 (this table row) 15、年を刷る行・月の行 `m`・日の段の行 (time-scale label l… 10、走行・走行中・走行回数 (a run) 9、「題の行」 (window title row) 8、刊行・刊行物・発行 (publish) 8 |
| spec _assets | 425 | 36 | 「本行」 (this table row) 95、「表 T-xxx の行」「本表の行」「`XX-n` の行」「行ごと」「行を持た… 69、「行 ID」 (spec-table row ID) 47、「表 T-xxx の行」「本表の行」「`XX-n` の行」「行ごと」「行を持た… 22、「n 行」 counting table rows (表 T-065 は 8 … 17、a record of a data / interchange table … 13、「本行」 (this table row) 12、「設定値の行」「`S-` 行」「設定の行」 (settings-table r… 12 |
| spec _source | 317 | 26 | 「本行」 (this table row) 95、「表 T-xxx の行」「本表の行」「`XX-n` の行」「行ごと」「行を持た… 43、「行 ID」 (spec-table row ID) 38、a record of a data / interchange table … 13、「題の行」 (window title row) 11、「設定値の行」「`S-` 行」「設定の行」 (settings-table r… 11、「同行」 (the same table row) 10、先行・先行タスク (predecessor) 9 |

## 6. 文書の英語「row」（E1、画面の語を除く）

### 6.1 区分 a と c

| # | 区分 | パターン | 件数 | ファイル数 | 例 | 案 ja | 案 en | 生成物 |
|---|---|---|---:|---:|---|---|---|---|
| DR-04 | c | WHY-comment example 'looping per row ... rows are the outer loop' | 2 | 1 | `docs/development-rules/03-implementation.md:237` | - | - |  |
| DR-07 | a | NOT_STORED_ROW_* constants (BAND, BAND_CEILING_SEARCH, CONTROL, CONTROL_EDGE, CONTROL_OUTER, GRAB, GRAB_ROOM,… | 8 | 1 | `docs/development-rules/03-implementation.md:87` | - | NOT_STORED_TASK_GROUP_* |  |
| DR-08 | c | test file names (t-051-hf-15-grabbing-a-row, fr-085-double-click-a-row-name, rows-fixed-with-nothing-holding-… | 3 | 2 | `docs/development-rules/02-changing-the-spec.md:173` | - | ...-task-group... |  |
| DR-10 | a | RowTitle (type name, RowTitle.fontPx) | 1 | 1 | `docs/development-rules/05-working-method.md:141` | - | TaskGroupTitle |  |
| DR-12 | a | tools probe reads/presses: rows / rowBands / pressRow; tool row-controls-press-all | 6 | 1 | `docs/development-rules/09-tools.md:137` | - | taskGroups / taskGroupBands / pressTaskGroup / task-group-controls-press-all |  |
| DR-13 | c | sample path 11-row-controls / row-controls-sample / sample CSS .row | 3 | 1 | `docs/development-rules/09-tools.md:137` | - | - |  |
| DR-14 | c | pinnedRowMax (settings key) | 1 | 1 | `docs/development-rules/09-tools.md:137` | - | pinnedTaskGroupMax |  |
| GS-03 | a | TaskGroup sense in generator comments: 'row-band cells', 'row colour field', '(the row tree)' | 3 | 2 | `docs/spec/_source/erd_json_to_schema.py:182` | タスクグループ | task group |  |
| GS-04 | a | rowTree in printed text literal (state_machines_json_to_md.py) | 1 | 1 | `docs/spec/_source/state_machines_json_to_md.py:938` | - | taskGroupTree |  |
| GS-05 | a | rowBandCeilingOf / rowPlacesAtZoomY cited in a docstring | 2 | 1 | `docs/spec/_source/published_entries_json_to_md.py:42` | - | taskGroupBandCeilingOf / taskGroupPlacesAtZoomY |  |
| SI-20 | a | state-machine events: childRowAddPressed, everyRowOpenPressed, everyRowFoldPressed, everyRowDeletePressed, ro… | 27 | 2 | `docs/spec/01-04-requirements.md:1763` | - | childTaskGroupAddPressed, everyTaskGroupOpenPressed, everyTaskGroupFoldPressed,… |  |
| SI-20g | a | state-machine events: childRowAddPressed, everyRowOpenPressed, everyRowFoldPressed, everyRowDeletePressed, ro… | 36 | 1 | `docs/spec/_assets/tbl-state-machines.md:656` | - | childTaskGroupAddPressed, everyTaskGroupOpenPressed, everyTaskGroupFoldPressed,… | はい |
| SI-21 | a | state-machine guards: isPressedRow, isBelowPressedRow, isChildOfPressedRow, isLeafRow, isTopLevelRow, isRevea… | 42 | 1 | `docs/spec/_source/state-machines.json:4020` | - | isPressedTaskGroup, isBelowPressedTaskGroup, isChildOfPressedTaskGroup, isLeafT… |  |
| SI-21g | a | state-machine guards: isPressedRow, isBelowPressedRow, isChildOfPressedRow, isLeafRow, isTopLevelRow, isRevea… | 42 | 1 | `docs/spec/_assets/tbl-state-machines.md:722` | - | isPressedTaskGroup, isBelowPressedTaskGroup, isChildOfPressedTaskGroup, isLeafT… | はい |
| SI-22 | a | state-machine values/actions: chosenRows, pressedRowId, revealedRowId, bringCreatedRowIntoSight | 18 | 1 | `docs/spec/_source/state-machines.json:203` | - | chosenTaskGroups, pressedTaskGroupId, revealedTaskGroupId, bringCreatedTaskGrou… |  |
| SI-22g | a | state-machine values/actions: chosenRows, pressedRowId, revealedRowId, bringCreatedRowIntoSight | 18 | 1 | `docs/spec/_assets/tbl-state-machines.md:35` | - | chosenTaskGroups, pressedTaskGroupId, revealedTaskGroupId, bringCreatedTaskGrou… | はい |
| SI-23 | a | rowGrabStateMachine and its state ids (rowGrabStateMachine_notGrabbed ...) | 1 | 1 | `docs/spec/_source/state-machines.json:3973` | - | taskGroupGrabStateMachine |  |
| SI-23g | a | rowGrabStateMachine and its state ids (rowGrabStateMachine_notGrabbed ...) | 24 | 1 | `docs/spec/_assets/tbl-state-machines.md:653` | - | taskGroupGrabStateMachine | はい |
| SI-24 | a | rowTree (region name; TaskGroup.treeState) | 1 | 1 | `docs/spec/_source/state-machines.json:6978` | - | taskGroupTree |  |
| SI-24g | a | rowTree (region name; TaskGroup.treeState) | 34 | 1 | `docs/spec/_assets/tbl-state-machines.md:13` | - | taskGroupTree | はい |
| SI-25 | c | rowZoomShrinkPressed / rowZoomEndReached (row-axis zoom events) | 5 | 2 | `docs/spec/01-04-requirements.md:1766` | - | verticalZoomShrinkPressed? / taskGroupZoom...? |  |
| SI-25g | c | rowZoomShrinkPressed / rowZoomEndReached (row-axis zoom events) | 7 | 1 | `docs/spec/_assets/tbl-state-machines.md:87` | - | verticalZoomShrinkPressed? / taskGroupZoom...? | はい |
| SI-26 | a | published names: rowNameOf, rowBandCeilingOf, rowPlacesAtZoomY, drawnRowBoxesOf, selectionWithinDrawnRows, ro… | 15 | 3 | `docs/spec/01-04-requirements.md:4000` | - | taskGroupNameOf, taskGroupBandCeilingOf, taskGroupPlacesAtZoomY, drawnTaskGroup… |  |
| SI-26g | a | published names: rowNameOf, rowBandCeilingOf, rowPlacesAtZoomY, drawnRowBoxesOf, selectionWithinDrawnRows, ro… | 10 | 1 | `docs/spec/_assets/tbl-published-entries.md:19` | - | taskGroupNameOf, taskGroupBandCeilingOf, taskGroupPlacesAtZoomY, drawnTaskGroup… | はい |
| SI-27 | c | settings keys: rowGap, rowTitleFont, rowTitleIndent, rowTitlePanelWidth, rowTitleTopScale, pinnedRowMax, setR… | 22 | 4 | `docs/spec/01-04-requirements.md:1685` | - | taskGroupGap, taskGroupTitleFont, taskGroupTitleIndent, taskGroupPanelWidth, ta… |  |
| SI-27g | c | settings keys: rowGap, rowTitleFont, rowTitleIndent, rowTitlePanelWidth, rowTitleTopScale, pinnedRowMax, setR… | 10 | 2 | `docs/spec/_assets/tbl-settings.md:87` | - | taskGroupGap, taskGroupTitleFont, taskGroupTitleIndent, taskGroupPanelWidth, ta… | はい |
| SI-28 | a | display-words data keys/values: defaultNames use "row", rowMinHeightField, shownOnAnotherRow, block "Row Titl… | 5 | 2 | `docs/spec/01-04-requirements.md:2506` | - | taskGroup, taskGroupMinHeightField, shownOnAnotherTaskGroup, Task Group Panel |  |
| SI-29 | a | src module file names: row-title-panel(.ts), row-title-panel-drawing, row-names, row-scroll, row-grab, row-tr… | 16 | 1 | `docs/spec/05-07-design.md:339` | - | task-group-panel, task-group-panel-drawing, task-group-names, task-group-scroll… |  |
| SI-30 | c | test file names: t-050-a-document-always-holds-one-row, t-051-hf-15-grabbing-a-row, fr-085-double-click-a-row… | 1 | 1 | `docs/spec/05-07-design.md:1269` | - | ...-task-group... |  |
| SI-31 | a | UI part `Row Title Panel` (U-22) | 26 | 4 | `docs/spec/01-04-requirements.md:332` | タスクグループパネル | Task Group Panel |  |
| SI-31g | a | UI part `Row Title Panel` (U-22) | 2 | 1 | `docs/spec/_assets/tbl-published-entries.md:19` | タスクグループパネル | Task Group Panel | はい |
| SI-32 | c | UI part `Row Title Tree` (U-23) | 4 | 3 | `docs/spec/01-04-requirements.md:6780` | タスクグループツリー? | Task Group Tree? |  |
| SI-33 | a | UI part `Rows` (U-1) | 6 | 3 | `docs/spec/01-04-requirements.md:253` | タスクグループ | Task Groups |  |
| SI-34 | a | UI parts `Pinned Row` (U-46) / `Row Expander` (U-47) / `Row Pin` (U-48) | 10 | 2 | `docs/spec/01-04-requirements.md:1686` | ピン止めのタスクグループ / タスクグループの折り畳みの操作子 / ピン止めの操作子 | Pinned Task Group / Task Group Expander / Task Group Pin |  |
| SI-35 | c | UI part `Row Area` (U-50) | 82 | 6 | `docs/spec/01-04-requirements.md:885` | - | Task Group Area? |  |
| SI-35g | c | UI part `Row Area` (U-50) | 12 | 3 | `docs/spec/_assets/tbl-published-entries.md:36` | - | Task Group Area? | はい |
| SI-36 | c | `Rows` in glossary ambiguity rule A-2 (Rows vs TaskGroup) | 1 | 1 | `docs/spec/01-04-requirements.md:389` | - | - |  |
| SI-37 | c | figure name fig-hit-stacked-row | 2 | 1 | `docs/spec/01-04-requirements.md:4560` | - | fig-hit-stacked-task-group? |  |
| SI-38 | a | row-band (T-294 cell names lightBand/darkBand 'row-band cells') | 1 | 1 | `docs/spec/_source/erd.schema.json:528` | タスクグループの帯 | task-group-band |  |
| SI-39 | c | previous-project-result paths 11-row-controls / row-controls-sample / sample CSS class .row | 8 | 1 | `docs/spec/_source/settings.json:4251` | - | - |  |
| SI-39g | c | previous-project-result paths 11-row-controls / row-controls-sample / sample CSS class .row | 8 | 1 | `docs/spec/_assets/tbl-settings.md:438` | - | - | はい |
| SP-01 | a | entity/column descriptions: 'A row on screen', 'Which row a task sits on', 'tasks and rows without a colour',… | 8 | 1 | `docs/spec/_source/erd.json:795` | タスクグループ | task group |  |
| SP-01g | a | entity/column descriptions: 'A row on screen', 'Which row a task sits on', 'tasks and rows without a colour',… | 8 | 1 | `docs/spec/_source/grs-document.schema.json:462` | タスクグループ | task group | はい |
| SP-02 | a | 'up stacks a row's tasks' (stackDirection description) | 4 | 2 | `docs/spec/_source/erd.json:1632` | タスクグループ | a task group's tasks |  |
| SP-02g | a | 'up stacks a row's tasks' (stackDirection description) | 4 | 1 | `docs/spec/_source/grs-document.schema.json:284` | タスクグループ | a task group's tasks | はい |
| SP-03 | a | components.json/overview.json labels: 'row placement', 'ruler and rows', 'row names', 'pinned rows', 'row mem… | 16 | 2 | `docs/spec/_source/components.json:188` | タスクグループ | task group |  |
| SP-04 | a | image-to-grs prompt: 'Rows (taskGroups)', 'heading row', 'child row', 'row depth' | 43 | 1 | `docs/spec/_source/image-to-grs-json-prompt.en.md:11` | タスクグループ | task group |  |
| SP-05 | a | 'the row tree (TaskGroup.treeState)' | 2 | 2 | `docs/spec/_source/state-machines.json:5` | タスクグループの木 | task group tree |  |
| SP-06 | a | 'drawn as a row band', 'row colour field' | 2 | 1 | `docs/spec/_source/erd.schema.json:528` | タスクグループの帯 | task group band / task group colour field |  |
| SP-07 | a | display-words $comment: 'a row's min height field' | 1 | 1 | `docs/spec/_source/display-words.json:4` | タスクグループの最小の高さ | a task group's min height field |  |

### 6.2 区分 b

| 領域 | 件数 | パターン数 | 大きいもの（件数） |
|---|---:|---:|---|
| development-rules | 25 | 7 | row-id-prefixes / tbl-row-id-prefixes /… 8、data-field-row / rowId / firstRow menti… 4、PressRow / check-press-row-ids / check-… 4、ROW (changelog check regex) / Row/Table… 3、ENTITY_ROWS / SEARCH_COLUMN_WIDTH_ROWS … 3、'rows' count forecast in a CR (tables /… 2、`TaskGroup` を `Row` と呼び替えない (naming cou… 1 |
| generator scripts | 383 | 3 | table/record row in generator code: row… 233、table/record row in generator comments/… 145、row_id_prefixes_json_to_md (own script … 5 |
| spec identifiers | 803 | 19 | rowId (JSON key = spec-table row ID) 521、rows JSON key (rows of a spec table / r… 195、row_prefix / row_comment / entity_rows … 13、fieldRow / data-field-row (properties-p… 10、fieldRow / data-field-row (properties-p… 10、readSearchRows / searchRowsOf / SearchR… 8、readSearchRows / searchRowsOf / SearchR… 6、firstRow (first row of table T-109) 5 |
| spec prose en | 112 | 4 | spec-table / record row in schema descr… 106、'A row is a one-off exception' (calenda… 2、'A row is a one-off exception' (calenda… 2、'search rows' (components.json) 2 |

## 7. src（S1、全パターン）

| # | 区分 | パターン | 件数 | ファイル数 | 例 | 案 ja | 案 en | 生成物 |
|---|---|---|---:|---:|---|---|---|---|
| S1-01 | b | row/rows/Row as a spec-table row or row ID (T-xxx row, row: 'XX-n', rowId) | 580 | 86 | `src/adapter/agent-api-endpoint/agent-api-endpoint.ts:5 src/adapter/agent-api-endpoint/agent-api-members.ts:672 src/adapter/clipboard-gateway/clipboard-gateway.ts:5` | - | - |  |
| S1-02 | b | rowId (spec-table row ID field in rosters and code) | 491 | 25 | `src/adapter/document-codec/document-codec.ts:51 src/adapter/document-codec/exchange-formats.json:4 src/adapter/screen-renderer/app-header-items.ts:177` | - | - |  |
| S1-03 | a | row/rows local variable = TaskGroup or RowPlacement (layout, use-case, input, geometry code) | 679 | 49 | `src/adapter/document-codec/json-codec.ts:220 src/adapter/document-codec/mspdi-codec.ts:411 src/adapter/document-codec/mspdi-imported-rows.ts:63` | タスクグループ | taskGroup / taskGroups |  |
| S1-04 | a | row/rows in English comments meaning a TaskGroup | 158 | 40 | `src/adapter/document-codec/mspdi-imported-rows.ts:1 src/adapter/input-command-translator/armed-placement.ts:50 src/adapter/input-command-translator/input-command-translator.ts:137` | タスクグループ | task group |  |
| S1-05 | b | row/rows in English comments meaning a non-TaskGroup row (data record, table entry, field row, pixel/text lin… | 79 | 31 | `src/adapter/document-codec/document-codec.ts:102 src/adapter/document-codec/mspdi-child-placement.ts:37 src/adapter/document-codec/mspdi-codec.ts:200` | - | - |  |
| S1-06 | b | row/rows local variable = a non-TaskGroup row (search row, field row, help/tooltip/palette line, data record,… | 489 | 42 | `src/adapter/document-codec/document-codec.ts:63 src/adapter/document-codec/json-codec.ts:215 src/adapter/document-codec/mspdi-child-placement.ts:18` | - | - |  |
| S1-07 | b | Row as a generic type parameter (TableColumns<Row>, inGroupBlocks<Row>) | 34 | 2 | `src/adapter/screen-renderer/app-header-items.ts:158 src/adapter/screen-renderer/search-table-filters.ts:63` | - | - |  |
| S1-08 | c | Row Area / rowArea* / isOnRowArea / leavesRowArea (screen region U-50) | 155 | 27 | `src/adapter/agent-api-endpoint/agent-api-members.ts:340 src/adapter/input-command-translator/display-scale-steps.ts:1 src/adapter/input-command-translator/dual-cursor-input.ts:17` | タスクグループ領域（要裁定） | Task Group Area (ruling needed) |  |
| S1-09 | a | rowTitlePanel* / RowTitlePanel / Row Title Panel (code + comments) | 71 | 14 | `src/adapter/image-exporter/image-exporter.ts:170 src/adapter/input-command-translator/frame-drags.ts:111 src/adapter/screen-renderer/row-title-panel.ts:1` | タスクグループパネル | Task Group Panel (taskGroupPanel*) |  |
| S1-10 | c | rowTitle* / RowTitle / rowTitleTree / Row Title Tree (the title cell / tree inside the panel) | 59 | 7 | `src/adapter/image-exporter/image-exporter.ts:17 src/adapter/input-command-translator/input-command-translator.ts:49 src/adapter/screen-renderer/row-title-panel.ts:1` | タスクグループ見出し | task group title (taskGroupTitle*) |  |
| S1-11 | a | rowControl* / ROW_CONTROL_* / rowExpander* / rowPin / rowAddChild / rowDelete* / *EveryRow* / addTopRow / ADD… | 341 | 18 | `src/adapter/input-command-translator/display-scale-steps.ts:108 src/adapter/input-command-translator/input-command-translator.ts:89 src/adapter/input-command-translator/row-grab.ts:110` | タスクグループの操作子 | taskGroupControl*, taskGroupExpander*, taskGroupPin ... |  |
| S1-12 | a | rowGrab* / RowGrab* / ROW_GRAB_* / GrabbedRow* (dragging a TaskGroup) | 151 | 13 | `src/adapter/input-command-translator/input-command-translator.ts:84 src/adapter/input-command-translator/item-grab.ts:82 src/adapter/input-command-translator/row-grab.ts:12` | タスクグループのつかみ | taskGroupGrab* |  |
| S1-13 | a | RowPlacement / rowPlacements / placedRow* / drawnRow* / undrawnRowDepth / rowBoxes / rowAtY / rowById / rowAn… | 273 | 27 | `src/adapter/document-codec/mspdi-codec.ts:50 src/adapter/document-codec/mspdi-imported-rows.ts:15 src/adapter/input-command-translator/armed-placement.ts:34` | タスクグループの配置 | TaskGroupPlacement / placedTaskGroups / drawnTaskGroup* |  |
| S1-14 | a | rowTree / RowTreeFacts / folded/unfolded rows / foldedRow* / rowDepth* / isLeafRow / revealedRow* / pressedRo… | 224 | 16 | `src/adapter/document-codec/mspdi-imported-rows.ts:29 src/adapter/input-command-translator/input-command-translator.ts:1267 src/adapter/input-command-translator/item-grab.ts:264` | タスクグループの木・折り畳み | taskGroupTree / foldedTaskGroup* / taskGroupDepth* |  |
| S1-15 | a | chosenRows / rowsPicked / heldRow / rowGroupId / grabbedRowGroupId / createdRow* / addedRow* / pinnedRow* (se… | 179 | 21 | `src/adapter/agent-api-endpoint/agent-api-members.ts:347 src/adapter/document-codec/mspdi-codec.ts:1119 src/adapter/input-command-translator/input-command-translator.ts:85` | タスクグループ | chosenTaskGroups / heldTaskGroup / taskGroupId |  |
| S1-16 | a | rowOfTask / rowIndexOfTask / rowIdOfTask / taskUidsWithoutRow / emptyRowTaskUids (Task-to-TaskGroup membershi… | 34 | 7 | `src/adapter/document-codec/mspdi-imported-rows.ts:19 src/adapter/input-command-translator/item-grab.ts:422 src/framework/single-html-shell/document-file-flow.ts:679` | タスクグループ | taskGroupOfTask ... |  |
| S1-17 | a | defaultRowName / DEFAULT_ROW_NAME* / rowName / rowNameOf / nameOfRow / ROW_NAME_* / rowPath (search) / rowLab… | 83 | 24 | `src/adapter/agent-api-endpoint/agent-api-members.ts:497 src/adapter/agent-api-endpoint/snapshot-source.ts:42 src/adapter/input-command-translator/input-command-translator.ts:206` | タスクグループ名 | task group name (taskGroupName*) |  |
| S1-18 | a | rowBand* / NOT_STORED_ROW_BAND_* / RowBandCeilingCache / rowMinHeight* / pinnedRowMax(code use) / rowShrinkWr… | 41 | 7 | `src/adapter/input-command-translator/input-command-translator.ts:121 src/adapter/input-command-translator/zoom-and-fit.ts:27 src/adapter/screen-renderer/properties-panel.ts:912` | タスクグループの帯 | taskGroupBand* |  |
| S1-19 | c | rowZoom* / zoomRowIn / zoomRowOut / isRowZoomKey / row-axis / rowAxisReadingOf / rowsAtZoomY / rowPlacesAtZoo… | 70 | 12 | `src/adapter/input-command-translator/display-scale-steps.ts:6 src/adapter/input-command-translator/input-command-translator.ts:36 src/adapter/input-command-translator/shortcut-keys.ts:27` | 行軸（要裁定） | row axis (ruling needed) |  |
| S1-20 | a | isShownOnAnotherRow / shownOnAnotherRowMark / SHOWN_ON_ANOTHER_ROW (Task also shown in another TaskGroup) | 17 | 6 | `src/adapter/screen-renderer/notices.ts:48 src/adapter/screen-renderer/screen-renderer.ts:521 src/framework/dom-screen-surface/notices-drawing.ts:122` | 別のタスクグループ | isShownOnAnotherTaskGroup |  |
| S1-21 | a | other TaskGroup compounds (rowsFromTasks, ImportedRows, doomedRows, lostRows, tasksRankedByTheRowTree, withWb… | 115 | 27 | `src/adapter/document-codec/mspdi-codec.ts:1056 src/adapter/document-codec/mspdi-imported-rows.ts:8 src/adapter/input-command-translator/armed-placement.ts:180` | タスクグループ | taskGroup in the compound |  |
| S1-22 | b | search table rows: SearchRows / TaskSearchRow / CommentBoxSearchRow / SearchRowView / taskRows / commentBoxRo… | 124 | 16 | `src/adapter/agent-api-endpoint/agent-api-members.ts:13 src/adapter/agent-api-endpoint/relayed-call.ts:22 src/adapter/mcp-tool-translator/mcp-tool-descriptions.json:29` | - | - |  |
| S1-23 | b | properties-panel field rows: fieldRow / FIELD_ROW_* / *_FIELD_ROW / typedByRow / focusByRow / nullRow / joint… | 174 | 12 | `src/adapter/screen-renderer/command-palette.ts:34 src/adapter/screen-renderer/properties-panel.ts:291 src/adapter/svg-renderer/svg-renderer.ts:580` | - | - |  |
| S1-24 | b | icon / palette / help / tooltip / notice table rows: IconRosterRow / iconRow* / commandRow / *_BY_ROW / perRo… | 115 | 16 | `src/adapter/screen-renderer/command-palette.ts:28 src/adapter/screen-renderer/icon-roster.json:2 src/adapter/screen-renderer/notices.ts:28` | - | - |  |
| S1-25 | b | delay-report rows: DelayReportRow* / DelayMarkerRow / delayDiagnosticsReportRows / ShownRow / shownRowsOf / r… | 42 | 5 | `src/adapter/screen-renderer/delay-diagnostics-report.ts:9 src/adapter/screen-renderer/properties-panel.ts:827 src/entity/document-model/schedule/delay-diagnostics-report-table.ts:10` | - | - |  |
| S1-26 | b | spec-table row constants and types: *_ROW / *_ROWS / *Row type of a T-xxx table (UNIT_ROW, GROUND_ROW, PAINT_… | 230 | 34 | `src/adapter/agent-api-endpoint/agent-api-members.ts:33 src/adapter/document-codec/document-codec.ts:51 src/adapter/input-command-translator/input-command-translator.ts:124` | - | - |  |
| S1-27 | b | generic data rows: carriedRows / CARRIED_ROW_PATHS / rowPath (MSPDI) / rowsOf (MSPDI) / keyedRows / profileRo… | 67 | 7 | `src/adapter/document-codec/json-codec.ts:224 src/adapter/document-codec/mspdi-codec.ts:104 src/entity/document-model/schedule/delay-diagnostics.ts:785` | - | - |  |
| S1-28 | b | window/modal title rows and text lines: windowTitleRowElement / titleRowStyle / modalTitleRow / closeOnlyTitl… | 42 | 7 | `src/adapter/svg-renderer/schedule-grid.ts:146 src/framework/dom-screen-surface/app-header-drawing.ts:95 src/framework/dom-screen-surface/dialogue-field-drawing.ts:25` | - | - |  |
| S1-29 | b | CSS grid placement in row-title-panel-drawing (cell row:1, rowTracks) | 11 | 1 | `src/framework/dom-screen-surface/row-title-panel-drawing.ts:100` | - | - |  |
| S1-31 | c | rowTitlePanelWidth / rowGap / rowTitleFont / rowTitleIndent / rowTitleTopScale / pinnedRowMax (DocumentSettin… | 71 | 16 | `src/adapter/document-codec/grs-json-schema.ts:791 src/adapter/document-codec/json-codec.ts:421 src/adapter/input-command-translator/display-scale-steps.ts:72` | taskGroupPanelWidth / taskGroupGap / taskGroupTitleFont ...（要裁定） | taskGroupPanelWidth / taskGroupGap / ... (ruling needed) |  |
| S1-33 | c | kind: 'row' (selection / clipboard / field-entry kind literal for a TaskGroup) | 6 | 6 | `src/adapter/input-command-translator/input-command-translator.ts:230 src/adapter/input-command-translator/row-tree-entrances.ts:241 src/framework/single-html-shell/copy-and-paste.ts:27` | kind: 'taskGroup'（要裁定） | kind: 'taskGroup' (ruling needed) |  |
| S1-34 | c | defaultNames use: 'row' key (display-words defaultNames lookup) | 1 | 1 | `src/adapter/screen-renderer/screen-renderer.ts:33` | use: 'taskGroup' | use: 'taskGroup' |  |
| S1-40 | a | src module files named for TaskGroups: row-grab.ts, row-tree-entrances.ts, row-title-panel.ts, row-names.ts, … | 18 | 12 | `src/adapter/document-codec/mspdi-codec.ts:50 src/adapter/input-command-translator/input-command-translator.ts:87 src/adapter/input-command-translator/item-grab.ts:44` | - | task-group-grab.ts, task-group-tree-entrances.ts, task-group-panel.ts, task-gro… |  |
| S1-50 | a | data-* attributes for TaskGroups: data-row-grab, data-row-control-ground, data-row-folding-grid, data-row-con… | 8 | 4 | `src/adapter/svg-renderer/schedule-grid.ts:317 src/framework/dom-screen-surface/dom-screen-surface.ts:508 src/framework/dom-screen-surface/notices-drawing.ts:122` | - | data-task-group-grab, data-task-group-control-ground, ... task-group-${groupId} |  |
| S1-51 | a | role/label strings Row Title Panel / Row Title Tree / Pinned Row / Row Expander / Row Pin (dom-screen-surface… | 31 | 3 | `src/adapter/screen-renderer/help-roster.json:628 src/adapter/screen-renderer/icon-roster.json:859 src/framework/dom-screen-surface/dom-screen-surface.ts:80` | - | Task Group Panel / Task Group Title Tree / Pinned Task Group / Task Group Expan… |  |
| S1-52 | b | data-field-row / data-row (help line) / FIELD_ROW_SELECTOR | 10 | 5 | `src/framework/dom-screen-surface/field-editing.ts:104 src/framework/dom-screen-surface/open-modals-drawing.ts:216 src/framework/dom-screen-surface/properties-panel-drawing.ts:277` | - | - |  |
| S1-53 | b | CSS keywords grid-row / grid-template-rows / row-gap, textarea rows attribute | 3 | 2 | `src/framework/dom-screen-surface/open-modals-drawing.ts:76 src/framework/dom-screen-surface/row-title-panel-drawing.ts:172` | - | - |  |
| S1-60 | a | image-to-grs-json prompt (en): row / rows / Rows meaning TaskGroup | 58 | 1 | `src/adapter/screen-renderer/image-to-grs-json-prompt.json:4` | - | task group(s) | はい |
| S1-61 | a | image-to-grs-json prompt (ja): 行 meaning TaskGroup (子の行, 見出しの行, 行の深さ, 行自身 ...) | 41 | 1 | `src/adapter/screen-renderer/image-to-grs-json-prompt.json:3` | タスクグループ（子のタスクグループ, タスクグループの深さ ...） | task group | はい |
| S1-62 | b | image-to-grs-json prompt (ja): 行 not a TaskGroup (1 行ずつ, 行った, 進行中, 平行四辺形) | 4 | 1 | `src/adapter/screen-renderer/image-to-grs-json-prompt.json:3` | - | - | はい |
| S1-63 | a | icon-roster entryTo (ja): 行 = TaskGroup (行の配下をすべて開く, この行を隠す, 行を削除する, すべての行を開く, 行見出し ...) | 14 | 1 | `src/adapter/screen-renderer/icon-roster.json:18` | このタスクグループの配下をすべて開く / すべてのタスクグループを開く ... | task group | はい |
| S1-64 | b | icon-roster / exchange-formats (ja): 行 = spec-table row (行 ID, 本行, 表 T-xxx の行, 行を動かすのではなく) | 15 | 2 | `src/adapter/document-codec/exchange-formats.json:4 src/adapter/screen-renderer/icon-roster.json:4` | - | - | はい |
| S1-65 | c | icon-roster (ja): 行軸を縮小する / 行軸を拡大する (vertical zoom axis) | 2 | 1 | `src/adapter/screen-renderer/icon-roster.json:172` | 行軸（要裁定） | row axis (ruling needed) | はい |
| S1-66 | b | icon-roster (ja): calendar exception-day row (例外日を 1 行加える, その行の例外日を除く), 行う verb, 見出しの行の面 (modal heading row) | 6 | 1 | `src/adapter/screen-renderer/icon-roster.json:249` | - | - | はい |
| S1-67 | b | property-items (ja): 複数行 (multi-line text) | 2 | 1 | `src/adapter/screen-renderer/property-items.json:157` | - | - | はい |
| S1-68 | b | mcp-tool-descriptions (ja): 行 = search-table row (同じ行を返す) / タスクが載る行と祖先を開き (TaskGroup) | 1 | 1 | `src/adapter/mcp-tool-translator/mcp-tool-descriptions.json:30` | - | - | はい |
| S1-69 | a | mcp-tool-descriptions (ja): タスクが載る行と祖先を開き | 1 | 1 | `src/adapter/mcp-tool-translator/mcp-tool-descriptions.json:78` | タスクが載るタスクグループと祖先を開き | opens the task group holding the task and its ancestors | はい |
| S1-70 | b | generated JSON $comment prose (row of table T-xxx, row id) | 19 | 7 | `src/adapter/document-codec/exchange-formats.json:2 src/adapter/document-codec/mspdi-child-order.json:6 src/adapter/mcp-tool-translator/mcp-tool-descriptions.json:2` | - | - | はい |
| S1-71 | a | one-row (box one row high, comment) | 1 | 1 | `src/entity/layout-engine/item-hit-area/item-hit-area.ts:1046` | - | one-task-group |  |

## 8. テスト（T1。パターンは 1025 あるので、ここは大きいものだけ。全行は TSV）

### 8.1 区分 a（件数の多い 40）

| # | 区分 | パターン | 件数 | ファイル数 | 例 | 案 ja | 案 en | 生成物 |
|---|---|---|---:|---:|---|---|---|---|
| T1-0034 | a | row [tg] | 2725 | 274 | `tests/contract/cr-429-mr-1-mr-2-ex-10-child-order.test.ts:195 tests/contract/cr-429-mr-1-mr-2-ex-10-child-order.test.ts:210 tests/contract/cr-429-the-two-schemas.test.ts:67` | タスクグループ | taskGroup |  |
| T1-0912 | a | 行 [jtg] | 640 | 115 | `tests/contract/cr-430-ga-1-to-22-grab-areas.test.ts:39 tests/contract/cr-430-table-pe-press-and-drag-effects.test.ts:64 tests/contract/cr-430-ty-1-to-9-type-order.test.ts:21` | タスクグループ | task group |  |
| T1-0038 | a | rows [tg] | 507 | 138 | `tests/contract/cr-430-ga-pointer-column.test.ts:40 tests/contract/cr-541-wheel-escape-select-all-and-display-scale.test.ts:60 tests/contract/cr-541-wheel-escape-select-all-and-display-scale.test.ts:61` | タスクグループ | taskGroup |  |
| T1-0040 | a | row [tg~] | 459 | 67 | `tests/contract/cr-430-ga-1-to-22-grab-areas.test.ts:136 tests/contract/cr-430-ga-1-to-22-grab-areas.test.ts:213 tests/contract/cr-571-search-jump.contract.test.ts:193` | タスクグループ | taskGroup |  |
| T1-0042 | a | rows [tg~] | 330 | 60 | `tests/contract/cr-430-ga-1-to-22-grab-areas.test.ts:62 tests/contract/cr-541-wheel-escape-select-all-and-display-scale.test.ts:63 tests/contract/cr-577-a-row-zoom-in-below-the-floor-always-changes-the-picture.test.ts:90` | タスクグループ | taskGroup |  |
| T1-0914 | a | 行 [jtg~] | 223 | 53 | `tests/contract/cr-430-table-pe-press-and-drag-effects.test.ts:50 tests/contract/cr-430-table-pe-press-and-drag-effects.test.ts:58 tests/contract/cr-441-t-274-principles-and-rows-both-ways.contract.test.ts:17` | タスクグループ | task group |  |
| T1-0047 | a | rowTitlePanel [panel] | 198 | 91 | `tests/contract/cr-557-a-pressed-hue-swatch-is-one-undoable-step.test.ts:198 tests/contract/cr-557-the-theme-hue-field-heads-the-settings-panel.test.ts:263 tests/contract/cr-576-two-hint-waits-and-the-dismissed-hint.contract.test.ts:127` | タスクグループパネル | taskGroupPanel / Task Group Panel |  |
| T1-0049 | a | Row [panel-name] | 143 | 47 | `tests/contract/cr-582-the-min-height-field-reads-the-current-height.test.ts:389 tests/contract/cr-593-a-held-field-keeps-its-text-while-the-zoom-moves.test.ts:271 tests/contract/cr-601-the-landing-mark-stays-while-the-view-moves.contract.test.ts:613` | タスクグループパネル | Task Group Panel |  |
| T1-0052 | a | twoRowDocument [tgfix] | 122 | 7 | `tests/unit/fr-085-double-click-a-row-name.test.ts:161 tests/unit/fr-085-double-click-a-row-name.test.ts:311 tests/unit/in-4-escape-closes-the-panel.test.ts:24` | タスクグループ | task-group id value / taskGroupDocument |  |
| T1-0053 | a | ROW_B [tgfix] | 116 | 12 | `tests/contract/cr-596-a-click-on-the-mark-jumps-and-marks-the-landing.contract.test.ts:1461 tests/contract/cr-596-a-click-on-the-mark-jumps-and-marks-the-landing.contract.test.ts:1549 tests/contract/cr-596-a-click-on-the-mark-jumps-and-marks-the-landing.contract.test.ts:1554` | タスクグループ | task-group id value / taskGroupDocument |  |
| T1-0055 | a | rowDocument [tgfix] | 110 | 44 | `tests/contract/cr-541-wheel-escape-select-all-and-display-scale.test.ts:12 tests/contract/cr-541-wheel-escape-select-all-and-display-scale.test.ts:56 tests/contract/cr-541-wheel-escape-select-all-and-display-scale.test.ts:85` | タスクグループ | task-group id value / taskGroupDocument |  |
| T1-0056 | a | drawnRows [tg] | 108 | 11 | `tests/contract/cr-571-search-jump.contract.test.ts:39 tests/contract/cr-571-search-jump.contract.test.ts:40 tests/contract/cr-577-a-row-zoom-in-below-the-floor-always-changes-the-picture.test.ts:385` | タスクグループ | taskGroup / TaskGroup / TASK_GROUP |  |
| T1-0058 | a | ROW_A [tgfix] | 98 | 12 | `tests/contract/cr-596-a-click-on-the-mark-jumps-and-marks-the-landing.contract.test.ts:1460 tests/contract/cr-596-a-click-on-the-mark-jumps-and-marks-the-landing.contract.test.ts:1548 tests/contract/cr-596-a-click-on-the-mark-jumps-and-marks-the-landing.contract.test.ts:1553` | タスクグループ | task-group id value / taskGroupDocument |  |
| T1-0066 | a | ROW_C [tgfix] | 63 | 10 | `tests/contract/cr-596-a-click-on-the-mark-jumps-and-marks-the-landing.contract.test.ts:1462 tests/contract/cr-596-a-click-on-the-mark-jumps-and-marks-the-landing.contract.test.ts:1562 tests/contract/cr-596-a-click-on-the-mark-jumps-and-marks-the-landing.contract.test.ts:1568` | タスクグループ | task-group id value / taskGroupDocument |  |
| T1-0067 | a | ROW_TITLE_PANEL [panel] | 61 | 18 | `tests/contract/cr-608-an-added-row-opens-until-the-view-shrinks.test.ts:34 tests/contract/cr-608-an-added-row-opens-until-the-view-shrinks.test.ts:39 tests/contract/cr-608-an-added-row-opens-until-the-view-shrinks.test.ts:200` | タスクグループパネル | taskGroupPanel / Task Group Panel |  |
| T1-0068 | a | rowOf [tg~] | 59 | 38 | `tests/contract/cr-583-milestone-figures-sit-on-the-row-centre.contract.test.ts:34 tests/contract/cr-588-the-pre-change-plan-outline.contract.test.ts:24 tests/contract/cr-588-the-pre-change-plan-outline.contract.test.ts:72` | タスクグループ | taskGroup |  |
| T1-0070 | a | Row [tg] | 56 | 28 | `tests/contract/cr-596-a-click-on-the-mark-jumps-and-marks-the-landing.contract.test.ts:475 tests/contract/cr-660-the-two-tables-lead-with-status-and-filter-like-excel.contract.test.ts:175 tests/contract/dfc-1720-a-row-control-tip-sits-under-its-row.test.ts:37` | タスクグループ | taskGroup |  |
| T1-0073 | a | ROWS [tg] | 54 | 21 | `tests/contract/cr-430-ht-1-to-4-hit-order.test.ts:57 tests/contract/cr-430-ht-1-to-4-hit-order.test.ts:131 tests/contract/cr-430-ht-1-to-4-hit-order.test.ts:174` | タスクグループ | taskGroup |  |
| T1-0075 | a | ROW_D [tgfix] | 54 | 4 | `tests/contract/dfc-568-gr-14-corners-anchor-and-body.test.ts:217 tests/contract/dfc-568-gr-14-corners-anchor-and-body.test.ts:242 tests/contract/dfc-568-gr-14-corners-anchor-and-body.test.ts:250` | タスクグループ | task-group id value / taskGroupDocument |  |
| T1-0076 | a | ROW_F [tgfix] | 52 | 3 | `tests/contract/dfc-568-gr-14-corners-anchor-and-body.test.ts:219 tests/contract/dfc-568-gr-14-corners-anchor-and-body.test.ts:242 tests/contract/dfc-568-gr-14-corners-anchor-and-body.test.ts:252` | タスクグループ | task-group id value / taskGroupDocument |  |
| T1-0919 | a | 行見出 [jpanel] | 47 | 18 | `tests/contract/cr-657-group-grid-lines-across-the-row-title-panel.test.ts:41 tests/contract/cr-657-group-grid-lines-across-the-row-title-panel.test.ts:44 tests/contract/cr-657-group-grid-lines-across-the-row-title-panel.test.ts:46` | タスクグループパネル | Task Group Panel |  |
| T1-0077 | a | rowId [tg] | 46 | 19 | `tests/contract/cr-557-the-theme-hue-field-heads-the-settings-panel.test.ts:391 tests/contract/cr-557-the-theme-hue-field-heads-the-settings-panel.test.ts:408 tests/contract/cr-571-search-panel-view.test.ts:94` | タスクグループ | taskGroup |  |
| T1-0079 | a | ROW [tg] | 46 | 24 | `tests/contract/dfc-288-d-289-fr-099-deleting-the-chosen-assignees.test.ts:97 tests/contract/display-words.contract.test.ts:1145 tests/contract/fr-101-the-name-stands-above-the-time.test.ts:222` | タスクグループ | taskGroup |  |
| T1-0080 | a | ROWS [tg~] | 43 | 18 | `tests/contract/cr-430-ht-1-to-4-hit-order.test.ts:129 tests/contract/cr-430-ht-1-to-4-hit-order.test.ts:130 tests/contract/cr-430-ht-1-to-4-hit-order.test.ts:179` | タスクグループ | taskGroup |  |
| T1-0081 | a | rowOf [tg] | 40 | 11 | `tests/contract/cr-583-milestone-figures-sit-on-the-row-centre.contract.test.ts:20 tests/contract/cr-596-a-click-on-the-mark-jumps-and-marks-the-landing.contract.test.ts:475 tests/contract/cr-596-a-click-on-the-mark-jumps-and-marks-the-landing.contract.test.ts:900` | タスクグループ | taskGroup |  |
| T1-0084 | a | DEFAULT_ROW_NAME_FIXTURE [tgname] | 38 | 14 | `tests/contract/dfc-102-un-14-pinning-is-inside-the-history.test.ts:34 tests/contract/dfc-102-un-14-pinning-is-inside-the-history.test.ts:151 tests/contract/dfc-102-un-14-pinning-is-inside-the-history.test.ts:167` | タスクグループ名 | taskGroupName |  |
| T1-0085 | a | DrawnRow [tg] | 38 | 6 | `tests/system/cr-553-a-shown-control-group-stays-its-row.test.ts:161 tests/system/cr-553-a-shown-control-group-stays-its-row.test.ts:170 tests/system/cr-553-a-shown-control-group-stays-its-row.test.ts:193` | タスクグループ | taskGroup / TaskGroup / TASK_GROUP |  |
| T1-0086 | a | theRowOf [N:tg] | 38 | 1 | `tests/unit/uf-72-screen-part.test.ts:2547 tests/unit/uf-72-screen-part.test.ts:3572 tests/unit/uf-72-screen-part.test.ts:3738` | タスクグループ | taskGroup |  |
| T1-0089 | a | defaultRowName [tgname] | 36 | 21 | `tests/contract/cr-557-a-pressed-hue-swatch-is-one-undoable-step.test.ts:150 tests/contract/cr-557-a-pressed-hue-swatch-is-one-undoable-step.test.ts:166 tests/contract/cr-561-agent-api-reads-the-delay-diagnostics.contract.test.ts:125` | タスクグループ名 | taskGroupName |  |
| T1-0090 | a | RowTitlePanel [panel] | 36 | 14 | `tests/contract/cr-584-the-picture-is-painted-on-the-ground-colour.test.ts:11 tests/contract/cr-584-the-picture-is-painted-on-the-ground-colour.test.ts:201 tests/contract/cr-650-the-branding-divider-and-the-shared-header-width.test.ts:7` | タスクグループパネル | taskGroupPanel / Task Group Panel |  |
| T1-0091 | a | Row [tg~] | 36 | 20 | `tests/contract/cr-596-a-click-on-the-mark-jumps-and-marks-the-landing.contract.test.ts:308 tests/contract/cr-596-a-click-on-the-mark-jumps-and-marks-the-landing.contract.test.ts:367 tests/contract/cr-596-a-click-on-the-mark-jumps-and-marks-the-landing.contract.test.ts:449` | タスクグループ | taskGroup |  |
| T1-0092 | a | rowId [tg~] | 35 | 15 | `tests/contract/dfc-2030-a-body-drag-moves-the-selected-boxes.contract.test.ts:53 tests/contract/dfc-290-d-321-fr-033-copy-and-paste-reach-the-document.test.ts:195 tests/contract/dfc-568-gr-14-corners-anchor-and-body.test.ts:168` | タスクグループ | taskGroup |  |
| T1-0093 | a | rowBoxes [tg] | 34 | 32 | `tests/contract/cr-557-a-pressed-hue-swatch-is-one-undoable-step.test.ts:230 tests/contract/cr-557-the-theme-hue-field-heads-the-settings-panel.test.ts:224 tests/contract/cr-576-two-hint-waits-and-the-dismissed-hint.contract.test.ts:196` | タスクグループ | taskGroup / TaskGroup / TASK_GROUP |  |
| T1-0097 | a | ROW [tg~] | 33 | 16 | `tests/integration/schedule-drawing.sws.test.ts:460 tests/system/cr-553-a-shown-control-group-stays-its-row.test.ts:188 tests/system/cr-553-a-shown-control-group-stays-its-row.test.ts:219` | タスクグループ | taskGroup |  |
| T1-0099 | a | drawnRow [tg] | 32 | 5 | `tests/contract/dfc-2030-a-body-drag-moves-the-selected-boxes.contract.test.ts:252 tests/contract/dfc-2030-a-body-drag-moves-the-selected-boxes.contract.test.ts:260 tests/contract/dfc-568-gr-14-corners-anchor-and-body.test.ts:417` | タスクグループ | taskGroup / TaskGroup / TASK_GROUP |  |
| T1-0102 | a | ROW_E [tgfix] | 31 | 4 | `tests/contract/dfc-568-gr-14-corners-anchor-and-body.test.ts:218 tests/contract/dfc-568-gr-14-corners-anchor-and-body.test.ts:242 tests/contract/dfc-568-gr-14-corners-anchor-and-body.test.ts:251` | タスクグループ | task-group id value / taskGroupDocument |  |
| T1-0924 | a | 親 [pwbs] | 31 | 11 | `tests/contract/cr-561-the-delay-diagnostics-report.contract.test.ts:27 tests/contract/cr-561-the-delay-diagnostics-report.contract.test.ts:29 tests/contract/e24-paste-refused-while-several-rows-are-chosen.test.ts:27` | 親タスク | parent task |  |
| T1-0104 | a | HEAD_OPEN_EVERY_ROW [tg] | 30 | 6 | `tests/system/cr-570-tree-state-drawing-and-arming.test.ts:8 tests/system/cr-570-tree-state-drawing-and-arming.test.ts:138 tests/system/cr-570-tree-state-drawing-and-arming.test.ts:139` | タスクグループ | taskGroup / TaskGroup / TASK_GROUP |  |
| T1-0106 | a | HEAD_FOLD_EVERY_ROW [tg] | 28 | 7 | `tests/system/cr-570-tree-state-drawing-and-arming.test.ts:7 tests/system/cr-570-tree-state-drawing-and-arming.test.ts:202 tests/system/cr-570-tree-state-drawing-and-arming.test.ts:203` | タスクグループ | taskGroup / TaskGroup / TASK_GROUP |  |
| T1-0107 | a | onRow [N:tg] | 28 | 2 | `tests/unit/cr-624-a-rested-hint-names-its-holder.test.ts:124 tests/unit/cr-624-a-rested-hint-names-its-holder.test.ts:126 tests/unit/fr-029-the-reason-a-press-carries.test.ts:519` | タスクグループ | taskGroup |  |

### 8.2 区分 c（件数の多い 40）

| # | 区分 | パターン | 件数 | ファイル数 | 例 | 案 ja | 案 en | 生成物 |
|---|---|---|---:|---:|---|---|---|---|
| T1-0043 | c | rowArea [area] | 257 | 63 | `tests/contract/cr-430-table-pe-press-and-drag-effects.test.ts:81 tests/contract/cr-430-table-pe-press-and-drag-effects.test.ts:165 tests/contract/cr-430-table-pe-press-and-drag-effects.test.ts:228` | タスクグループ領域? | taskGroupArea? |  |
| T1-0045 | c | Row [area-name] | 211 | 54 | `tests/contract/cr-430-ga-1-to-22-grab-areas.test.ts:88 tests/contract/cr-430-table-pe-press-and-drag-effects.test.ts:165 tests/contract/cr-596-a-click-on-the-mark-jumps-and-marks-the-landing.contract.test.ts:636` | タスクグループ領域? | taskGroupArea? |  |
| T1-0051 | c | rowGroupId [api] | 131 | 82 | `tests/contract/cr-577-a-row-zoom-in-below-the-floor-always-changes-the-picture.test.ts:419 tests/contract/cr-582-the-min-height-field-reads-the-current-height.test.ts:258 tests/contract/cr-582-the-min-height-field-reads-the-current-height.test.ts:259` | タスクグループ（API名は利用者判断） | taskGroup... (API name, user decides) |  |
| T1-0020 | c | rowTitlePanelWidth [setkey] | 79 | 23 | `tests/contract/cr-620-seam-4-help-footnote.contract.test.ts:55 tests/contract/cr-620-seam-4-help-footnote.contract.test.ts:62 tests/contract/cr-657-group-grid-lines-across-the-row-title-panel.test.ts:138` | タスクグループ...（キー名は利用者判断） | e.g. taskGroupPanelWidth (user decides) |  |
| T1-0916 | c | 行 [jundet] | 78 | 37 | `tests/contract/cr-430-t-273-where-the-labels-stand.test.ts:40 tests/contract/cr-557-a-pressed-hue-swatch-is-one-undoable-step.test.ts:58 tests/contract/cr-557-the-theme-hue-roster-is-table-t-305.test.ts:15` | 要判断 | ask |  |
| T1-0063 | c | RowTitle [title] | 72 | 15 | `tests/contract/cr-657-group-grid-lines-across-the-row-title-panel.test.ts:11 tests/contract/cr-657-group-grid-lines-across-the-row-title-panel.test.ts:151 tests/contract/cr-657-group-grid-lines-across-the-row-title-panel.test.ts:206` | タスクグループ見出し | taskGroupTitle |  |
| T1-0065 | c | rowTitle [title] | 65 | 7 | `tests/contract/dfc-1720-a-row-control-tip-sits-under-its-row.test.ts:12 tests/contract/dfc-1720-a-row-control-tip-sits-under-its-row.test.ts:28 tests/unit/fr-031-a-write-that-moved-nothing-leaves-no-step.test.ts:184` | タスクグループ見出し | taskGroupTitle |  |
| T1-0922 | c | 親 [pundet] | 39 | 12 | `tests/contract/cr-429-mr-1-mr-2-ex-10-child-order.test.ts:26 tests/contract/cr-429-mr-1-mr-2-ex-10-child-order.test.ts:35 tests/contract/cr-429-mr-1-mr-2-ex-10-child-order.test.ts:45` | 要判断 | ask |  |
| T1-0087 | c | rowAreaWidth [area] | 37 | 10 | `tests/contract/cr-620-seam-4-help-footnote.contract.test.ts:67 tests/contract/cr-620-seam-4-help-footnote.contract.test.ts:73 tests/contract/cr-620-seam-4-help-footnote.contract.test.ts:75` | タスクグループ領域? | taskGroupArea? |  |
| T1-0088 | c | chosenRows [api] | 37 | 5 | `tests/contract/state-machine-agent-api.contract.test.ts:133 tests/contract/state-machine-agent-api.contract.test.ts:161 tests/contract/state-machine-interaction-record.contract.test.ts:117` | タスクグループ（API名は利用者判断） | taskGroup... (API name, user decides) |  |
| T1-0098 | c | rowAreaWidthWithoutPanels [area] | 32 | 28 | `tests/contract/cr-557-a-pressed-hue-swatch-is-one-undoable-step.test.ts:112 tests/contract/cr-561-agent-api-reads-the-delay-diagnostics.contract.test.ts:85 tests/contract/cr-571-agent-api-search.contract.test.ts:127` | タスクグループ領域? | taskGroupArea? |  |
| T1-0100 | c | ROW_AREA [area] | 32 | 2 | `tests/contract/dfc-298-d-420-gr-21-the-grip-starts-and-follows.test.ts:117 tests/contract/dfc-298-d-420-gr-21-the-grip-starts-and-follows.test.ts:123 tests/contract/dfc-298-d-420-gr-21-the-grip-starts-and-follows.test.ts:126` | タスクグループ領域? | taskGroupArea? |  |
| T1-0021 | c | rowTitleIndent [setkey] | 19 | 10 | `tests/contract/dfc-49-one-indent-for-the-screen-and-the-picture.test.ts:80 tests/contract/dfc-49-one-indent-for-the-screen-and-the-picture.test.ts:187 tests/contract/dfc-49-one-indent-for-the-screen-and-the-picture.test.ts:196` | タスクグループ...（キー名は利用者判断） | e.g. taskGroupPanelWidth (user decides) |  |
| T1-0022 | c | setRowTitlePanelWidth [setkey] | 16 | 5 | `tests/contract/dfc-378-a-write-that-changed-nothing-answers-the-same-document.test.ts:286 tests/contract/dfc-378-a-write-that-changed-nothing-answers-the-same-document.test.ts:289 tests/contract/dfc-378-a-write-that-changed-nothing-answers-the-same-document.test.ts:290` | タスクグループ...（キー名は利用者判断） | e.g. taskGroupPanelWidth (user decides) |  |
| T1-0023 | c | rowTitleFont [setkey] | 16 | 4 | `tests/fixtures/row-name-font.ts:5 tests/fixtures/row-name-font.ts:12 tests/fixtures/row-name-font.ts:15` | タスクグループ...（キー名は利用者判断） | e.g. taskGroupPanelWidth (user decides) |  |
| T1-0024 | c | rowGap [setkey] | 15 | 4 | `tests/contract/cr-582-the-drawn-floor-of-a-row-follows-the-zoom.test.ts:159 tests/contract/cr-582-the-min-height-field-reads-the-current-height.test.ts:50 tests/integration/schedule-drawing.sws.test.ts:964` | タスクグループ...（キー名は利用者判断） | e.g. taskGroupPanelWidth (user decides) |  |
| T1-0154 | c | rowAreaOf [area] | 15 | 2 | `tests/system/cr-553-a-shown-control-group-stays-its-row.test.ts:312 tests/system/cr-553-a-shown-control-group-stays-its-row.test.ts:355 tests/system/cr-553-a-shown-control-group-stays-its-row.test.ts:384` | タスクグループ領域? | taskGroupArea? |  |
| T1-0162 | c | ROW_ZOOM_SHRINK [axis] | 14 | 3 | `tests/contract/cr-608-an-added-row-opens-until-the-view-shrinks.test.ts:47 tests/contract/cr-608-an-added-row-opens-until-the-view-shrinks.test.ts:182 tests/contract/cr-608-an-added-row-opens-until-the-view-shrinks.test.ts:268` | 行軸（利用者判断） | row axis (user decides) |  |
| T1-0164 | c | rows [undet] | 14 | 4 | `tests/contract/cr-611-t-290-the-new-document-question-has-no-guard.test.ts:33 tests/contract/w3-t4-a-same-day-finish-to-start-is-no-contradiction.test.ts:27 tests/contract/w3-t4-a-same-day-finish-to-start-is-no-contradiction.test.ts:30` | 要判断 | ask |  |
| T1-0025 | c | rowTitleTopScale [setkey] | 12 | 4 | `tests/fixtures/row-name-font.ts:6 tests/fixtures/row-name-font.ts:13 tests/fixtures/row-name-font.ts:15` | タスクグループ...（キー名は利用者判断） | e.g. taskGroupPanelWidth (user decides) |  |
| T1-0191 | c | rowAreaHeight [area] | 11 | 5 | `tests/contract/cr-577-a-row-zoom-in-below-the-floor-always-changes-the-picture.test.ts:388 tests/contract/cr-577-a-row-zoom-in-below-the-floor-always-changes-the-picture.test.ts:484 tests/contract/cr-577-a-row-zoom-in-below-the-floor-always-changes-the-picture.test.ts:666` | タスクグループ領域? | taskGroupArea? |  |
| T1-0932 | c | 行見出 [jtitle] | 11 | 9 | `tests/contract/cr-657-group-grid-lines-across-the-row-title-panel.test.ts:201 tests/contract/cr-667-percent-complete-counts-both-end-days.contract.test.ts:34 tests/system/cr-667-panel-divider-in-the-rule-colour.test.ts:15` | タスクグループ見出し | task group title |  |
| T1-0026 | c | ROW_TITLE_INDENT [setkey] | 9 | 2 | `tests/unit/t-051-hf-6-ground-under-the-row-controls.test.ts:855 tests/unit/t-051-hf-6-ground-under-the-row-controls.test.ts:863 tests/unit/uf-71.test.ts:1104` | タスクグループ...（キー名は利用者判断） | e.g. taskGroupPanelWidth (user decides) |  |
| T1-0001 | c | t-051-hf-14-the-depth-cap-refuses-a-row [path] | 8 | 2 | `tests/unit/t-051-hf-14-a-raised-row-is-visible.test.ts:10 tests/unit/t-051-hf-14-a-raised-row-is-visible.test.ts:25 tests/unit/t-051-hf-14-a-raised-row-is-visible.test.ts:38` | ファイル名に追従 | follows the file rename |  |
| T1-0251 | c | row-axis [axis] | 8 | 5 | `tests/contract/cr-577-a-row-zoom-in-below-the-floor-always-changes-the-picture.test.ts:1 tests/system/user-reported-fixes.test.ts:1469 tests/unit/cr-423-the-row-zoom-stops-where-the-picture-stops-changing.test.ts:717` | 行軸（利用者判断） | row axis (user decides) |  |
| T1-0257 | c | rowZoomShrinkPressed [axis] | 8 | 4 | `tests/contract/cr-608-an-added-row-opens-until-the-view-shrinks.test.ts:28 tests/contract/tree-state-machine.contract.test.ts:194 tests/contract/tree-state-machine.contract.test.ts:251` | 行軸（利用者判断） | row axis (user decides) |  |
| T1-0271 | c | ROW_AREA_TOP [area] | 8 | 1 | `tests/unit/cr-408-the-property-panel-wraps-and-its-edge-can-be-held.test.ts:396 tests/unit/cr-408-the-property-panel-wraps-and-its-edge-can-be-held.test.ts:428 tests/unit/cr-408-the-property-panel-wraps-and-its-edge-can-be-held.test.ts:429` | タスクグループ領域? | taskGroupArea? |  |
| T1-0002 | c | row-name-font [path] | 7 | 7 | `tests/contract/dfc-49-one-indent-for-the-screen-and-the-picture.test.ts:29 tests/unit/t-015-t-051-the-four-folding-controls.test.ts:110 tests/unit/t-051-hf-6-ground-under-the-row-controls.test.ts:125` | ファイル名に追従 | follows the file rename |  |
| T1-0306 | c | ROW_AREA_HEIGHT [area] | 7 | 1 | `tests/unit/cr-408-the-property-panel-wraps-and-its-edge-can-be-held.test.ts:397 tests/unit/cr-408-the-property-panel-wraps-and-its-edge-can-be-held.test.ts:428 tests/unit/cr-408-the-property-panel-wraps-and-its-edge-can-be-held.test.ts:429` | タスクグループ領域? | taskGroupArea? |  |
| T1-0347 | c | readDocumentRowIds [api] | 6 | 1 | `tests/system/three-rows-read-from-the-spec-alone.test.ts:562 tests/system/three-rows-read-from-the-spec-alone.test.ts:576 tests/system/three-rows-read-from-the-spec-alone.test.ts:757` | タスクグループ（API名は利用者判断） | taskGroup... (API name, user decides) |  |
| T1-0386 | c | row [undet] | 5 | 3 | `tests/contract/state-machine-file-flow.contract.test.ts:85 tests/contract/state-machine-file-flow.contract.test.ts:86 tests/contract/state-machine-unsaved-edits.contract.test.ts:68` | 要判断 | ask |  |
| T1-0404 | c | rowAreaSpanOf [area] | 5 | 1 | `tests/system/user-reported-fixes.test.ts:1218 tests/system/user-reported-fixes.test.ts:1384 tests/system/user-reported-fixes.test.ts:1385` | タスクグループ領域? | taskGroupArea? |  |
| T1-0027 | c | HELD_ROW_TITLE_WIDTH [setkey] | 4 | 1 | `tests/unit/fr-031-a-write-that-moved-nothing-leaves-no-step.test.ts:107 tests/unit/fr-031-a-write-that-moved-nothing-leaves-no-step.test.ts:239 tests/unit/fr-031-a-write-that-moved-nothing-leaves-no-step.test.ts:243` | タスクグループ...（キー名は利用者判断） | e.g. taskGroupPanelWidth (user decides) |  |
| T1-0473 | c | row-zoom [axis] | 4 | 2 | `tests/contract/tree-state-machine.contract.test.ts:249 tests/unit/cr-404-a-row-opened-by-hand-stays-open.test.ts:527 tests/unit/cr-404-a-row-opened-by-hand-stays-open.test.ts:701` | 行軸（利用者判断） | row axis (user decides) |  |
| T1-0003 | c | row-title-panel [path] | 3 | 3 | `tests/contract/cr-657-group-grid-lines-across-the-row-title-panel.test.ts:9 tests/contract/dfc-49-one-indent-for-the-screen-and-the-picture.test.ts:6 tests/contract/seams.contract.test.ts:197` | ファイル名に追従 | follows the file rename |  |
| T1-0004 | c | fr-085-double-click-a-row-name [path] | 3 | 1 | `tests/unit/t-051-hf-17-adding-a-row-walks-the-rename-road.test.ts:58 tests/unit/t-051-hf-17-adding-a-row-walks-the-rename-road.test.ts:78 tests/unit/t-051-hf-17-adding-a-row-walks-the-rename-road.test.ts:216` | ファイル名に追従 | follows the file rename |  |
| T1-0028 | c | pinnedRowMax [setkey] | 3 | 3 | `tests/unit/cr-605-cm-39-carries-exceptions-and-makes-a-calendar.test.ts:166 tests/unit/edit-calendar.test.ts:130 tests/unit/use-case.test.ts:232` | タスクグループ...（キー名は利用者判断） | e.g. taskGroupPanelWidth (user decides) |  |
| T1-0544 | c | isInRowArea [area] | 3 | 1 | `tests/contract/cr-601-the-landing-mark-stays-while-the-view-moves.contract.test.ts:495 tests/contract/cr-601-the-landing-mark-stays-while-the-view-moves.contract.test.ts:510` | タスクグループ領域? | taskGroupArea? |  |
| T1-0545 | c | IN_ROW_AREA [area] | 3 | 1 | `tests/contract/cr-601-the-landing-mark-stays-while-the-view-moves.contract.test.ts:678 tests/contract/cr-601-the-landing-mark-stays-while-the-view-moves.contract.test.ts:683 tests/contract/cr-601-the-landing-mark-stays-while-the-view-moves.contract.test.ts:689` | タスクグループ領域? | taskGroupArea? |  |
| T1-0594 | c | ROW_ZOOM_ENLARGE [axis] | 3 | 2 | `tests/system/cr-570-tree-state-on-the-large-sample.test.ts:21 tests/system/cr-570-tree-state-on-the-large-sample.test.ts:242 tests/system/cr-570-tree-state-stage.ts:40` | 行軸（利用者判断） | row axis (user decides) |  |

### 8.3 区分ごと・領域ごとのまとめ

| 領域 | 件数 | パターン数 | 大きいもの（件数） |
|---|---:|---:|---|
| tests identifier | 8235 | 432 | row [tg] 2725、rows [tg] 507、row [tg~] 459、rows [tg~] 330、rowTitlePanel [panel] 198、Row [panel-name] 143、twoRowDocument [tgfix] 122、ROW_B [tgfix] 116 |
| tests quoted clause | 1008 | 19 | 行 [jtg] 640、行 [jtg~] 223、行見出 [jpanel] 47、親 [pwbs] 31、行自身 [jtg] 19、行数 [jtg] 13、行名 [jname] 9、各行 [jtg~] 6 |

| 領域 | 件数 | パターン数 | 大きいもの（件数） |
|---|---:|---:|---|
| tests file name | 10 | 10 | cr-441-t-274-principles-and-rows-both-w… 1、cr-571-search-rows.contract.test.ts 1、cr-592-monochrome-greys-every-t-236-row… 1、cr-606-the-panel-rows-follow-t-016.test… 1、dfc-582-every-invariant-row-has-a-dicti… 1、t-233-reason-words-tell-the-row.contrac… 1、cr-664-the-colour-rows-line-up-with-the… 1、three-rows-read-from-the-spec-alone.tes… 1 |
| tests identifier | 13144 | 413 | row [spec] 4733、row [spec~] 1859、rows [spec] 1260、rowOf [spec] 598、rows [spec~] 477、rowId [spec~] 411、row [ui] 228、rowId [spec] 204 |
| tests quoted clause | 789 | 37 | 行 [jspec] 276、行 [jw] 84、本行 [jspec] 75、行 [jspec~] 72、進行中 [jw] 44、行 [jui] 40、行 [jl] 39、先行 [jw] 24 |

| 領域 | 件数 | パターン数 | 大きいもの（件数） |
|---|---:|---:|---|
| tests file name | 82 | 60 | t-051-hf-14-the-depth-cap-refuses-a-row… 8、row-name-font [path] 7、row-title-panel [path] 3、fr-085-double-click-a-row-name [path] 3、row-title-panel-drawing [path] 2、rows-fixed-with-nothing-holding-them [p… 2、t-233-reason-words-tell-the-row [path] 2、fr-019-no-row-for-the-annotation [path] 2 |
| tests fixture key | 180 | 13 | rowTitlePanelWidth [setkey] 79、rowTitleIndent [setkey] 19、setRowTitlePanelWidth [setkey] 16、rowTitleFont [setkey] 16、rowGap [setkey] 15、rowTitleTopScale [setkey] 12、ROW_TITLE_INDENT [setkey] 9、HELD_ROW_TITLE_WIDTH [setkey] 4 |
| tests identifier | 1008 | 34 | rowArea [area] 257、Row [area-name] 211、rowGroupId [api] 131、RowTitle [title] 72、rowTitle [title] 65、rowAreaWidth [area] 37、chosenRows [api] 37、rowAreaWidthWithoutPanels [area] 32 |
| tests quoted clause | 136 | 7 | 行 [jundet] 78、親 [pundet] 39、行見出 [jtitle] 11、各行 [jundet] 3、親子 [pundet] 2、行軸 [jaxis] 2、行数 [jundet] 1 |

## 9. 「WBS の親」（W1、画面の語を除く）

### 9.1 区分 a と c

| # | 区分 | パターン | 件数 | ファイル数 | 例 | 案 ja | 案 en | 生成物 |
|---|---|---|---:|---:|---|---|---|---|
| W1-043 | a | 「親」単独（Task の WBS の親: 親の名・親を結ぶ・親が決まらない・親の点 ほか） | 101 | 6 | `docs/spec/01-04-requirements.md:1834` | 親タスク | parent task |  |
| W1-044 | a | 「WBS の親」 | 27 | 6 | `docs/spec/01-04-requirements.md:1160` | 親タスク | parent task |  |
| W1-045 | a | 「親子」単独（Task の WBS の親子・導いた親子） | 17 | 4 | `docs/spec/01-04-requirements.md:257` | 親タスクと子タスク | parent and child tasks |  |
| W1-046 | a | 「導いた親」「明記の親」 | 14 | 3 | `docs/spec/01-04-requirements.md:2421` | 導いた親タスク / 明記の親タスク | derived / stated parent task |  |
| W1-047 | a | 「WBS の親子」 | 10 | 5 | `docs/spec/01-04-requirements.md:2421` | 親タスクと子タスク | parent and child tasks |  |
| W1-048 | a | 「親子の進捗の疑義」（K-140 / FR-131） | 6 | 4 | `docs/spec/01-04-requirements.md:2335` | 親タスクの進捗の疑義 | parent-task progress doubt |  |
| W1-049 | a | 「WBS の親」 | 6 | 4 | `docs/spec/_assets/fig-erd-detail.md:341` | 親タスク | parent task | はい |
| W1-050 | a | 「親」単独（Task の WBS の親: 親の名・親を結ぶ・親が決まらない・親の点 ほか） | 6 | 3 | `docs/spec/_assets/fig-erd-detail.md:342` | 親タスク | parent task | はい |
| W1-051 | a | 「親子関係」「親子の関係」（Task の WBS） | 5 | 1 | `docs/spec/01-04-requirements.md:1834` | 親タスクと子タスクの関係 | parent-task relation |  |
| W1-052 | a | 「子から親へ」（矢印・引く向き） | 3 | 3 | `docs/spec/01-04-requirements.md:8073` | 子タスクから親タスクへ | from the child task to the parent task |  |
| W1-053 | a | 「WBS の親子」 | 3 | 2 | `docs/spec/_assets/fig-erd-detail.md:207` | 親タスクと子タスク | parent and child tasks | はい |
| W1-054 | a | 「親子の進捗の疑義」（K-140 / FR-131） | 2 | 2 | `docs/spec/_assets/fig-erd-detail.md:333` | 親タスクの進捗の疑義 | parent-task progress doubt | はい |
| W1-055 | a | 「導いた親」「明記の親」 | 2 | 1 | `docs/spec/_assets/tbl-published-entries.md:19` | 導いた親タスク / 明記の親タスク | derived / stated parent task | はい |
| W1-056 | a | 「WBS 親」（同じ WBS 親を持つ兄弟） | 1 | 1 | `docs/spec/01-04-requirements.md:1841` | 親タスク | parent task |  |
| W1-057 | a | 「親子」単独（Task の WBS の親子・導いた親子） | 1 | 1 | `docs/spec/_assets/fig-pointer-shapes.svg:63` | 親タスクと子タスク | parent and child tasks | はい |
| W1-058 | c | 「WBS の子孫・子・祖先・兄弟・部分木」/ "WBS descendant/child/sibling/ancestor/subtree/pair" | 19 | 3 | `docs/spec/01-04-requirements.md:1085` | 子孫タスク・子タスク・祖先タスク・兄弟タスク・部分木 | descendant / child / ancestor / sibling tasks |  |
| W1-059 | c | 「親定義」（IC-142 の名・親定義のドラッグ） | 8 | 1 | `docs/spec/01-04-requirements.md:3450` | 親タスク設定 | Set Parent Task |  |
| W1-060 | c | 「親子判別」（IC-141 の名・S-484） | 8 | 4 | `docs/spec/01-04-requirements.md:3767` | 親タスク表示 | Show Parent Tasks |  |
| W1-061 | c | 「WBS のネストの深さの上限」（K-99 importMaxDepth / S-115） | 3 | 3 | `docs/spec/01-04-requirements.md:6660` | 親タスクの入れ子の深さの上限 | Maximum depth of nested parent tasks |  |
| W1-062 | c | WBS Link（行 ID 接頭辞 WL の語） | 1 | 1 | `docs/spec/_assets/tbl-row-id-prefixes.md:240` | 親タスクの手 | Parent Task Link | はい |
| W1-063 | c | 「親子判別」（IC-141 の名・S-484） | 1 | 1 | `docs/spec/_assets/tbl-settings.md:493` | 親タスク表示 | Show Parent Tasks | はい |
| W1-064 | c | 「WBS のネストの深さの上限」（K-99 importMaxDepth / S-115） | 1 | 1 | `docs/spec/_assets/tbl-settings.md:683` | 親タスクの入れ子の深さの上限 | Maximum depth of nested parent tasks | はい |
| W1-065 | c | 「WBS の子孫・子・祖先・兄弟・部分木」/ "WBS descendant/child/sibling/ancestor/subtree/pair" | 1 | 1 | `docs/spec/_assets/tbl-state-machines.md:754` | 子孫タスク・子タスク・祖先タスク・兄弟タスク・部分木 | descendant / child / ancestor / sibling tasks | はい |
| W1-066 | c | WBS Link（行 ID 接頭辞 WL の語） | 1 | 1 | `docs/spec/_source/row-id-prefixes.json:1596` | 親タスクの手 | Parent Task Link |  |
| W1-082 | c | `wbsParentUid` | 39 | 9 | `docs/spec/01-04-requirements.md:257` | parentTaskUid | parentTaskUid |  |
| W1-083 | c | `wbsParentUid` | 7 | 3 | `docs/spec/_assets/fig-erd-detail.md:54` | parentTaskUid | parentTaskUid | はい |
| W1-084 | c | `wbsParentArmed` | 4 | 1 | `docs/spec/_source/state-machines.json:1332` | parentTaskArmed | parentTaskArmed |  |
| W1-085 | c | `wbsParentArmed` | 3 | 1 | `docs/spec/_assets/tbl-state-machines.md:140` | parentTaskArmed | parentTaskArmed | はい |
| W1-086 | c | `setTaskWbsParent` | 2 | 2 | `docs/spec/01-04-requirements.md:3772` | setTaskParentTask | setTaskParentTask |  |
| W1-087 | c | `wbs-parent-hold` | 2 | 1 | `docs/spec/05-07-design.md:339` | parent-task-hold | parent-task-hold |  |
| W1-088 | c | `wbs-parent-arrows` | 2 | 1 | `docs/spec/05-07-design.md:348` | parent-task-arrows | parent-task-arrows |  |
| W1-089 | c | `wbsParentResolutionsOf` | 2 | 1 | `docs/spec/_assets/tbl-published-entries.md:19` | parentTaskResolutionsOf | parentTaskResolutionsOf | はい |
| W1-090 | c | `wbsParentResolutionsOf` | 2 | 1 | `docs/spec/_source/published-entries.json:187` | parentTaskResolutionsOf | parentTaskResolutionsOf |  |
| W1-091 | c | `wbsParentChoice` | 1 | 1 | `docs/spec/01-04-requirements.md:8103` | parentTaskChoice | parentTaskChoice |  |
| W1-092 | c | `WbsParentResolution` | 1 | 1 | `docs/spec/_assets/tbl-published-entries.md:19` | ParentTaskResolution | ParentTaskResolution | はい |
| W1-093 | c | `WbsParentFamilies` | 1 | 1 | `docs/spec/_assets/tbl-published-entries.md:24` | ParentTaskFamilies | ParentTaskFamilies | はい |
| W1-094 | c | `wbsParentLinksShown` | 1 | 1 | `docs/spec/_assets/tbl-settings.md:493` | parentTaskLinksShown | parentTaskLinksShown | はい |
| W1-095 | c | `33-wbs-parent-palette-icons` | 1 | 1 | `docs/spec/_assets/tbl-settings.md:494` | 33-parent-task-palette-icons | 33-parent-task-palette-icons | はい |
| W1-096 | c | `armModeStateMachine_wbsParentArmed` | 1 | 1 | `docs/spec/_assets/tbl-state-machines.md:140` | armModeStateMachine_parentTaskArmed | armModeStateMachine_parentTaskArmed | はい |
| W1-097 | c | `WbsParentResolution` | 1 | 1 | `docs/spec/_source/published-entries.json:196` | ParentTaskResolution | ParentTaskResolution |  |
| W1-098 | c | `WbsParentFamilies` | 1 | 1 | `docs/spec/_source/published-entries.json:1075` | ParentTaskFamilies | ParentTaskFamilies |  |
| W1-099 | c | `wbsParentLinksShown` | 1 | 1 | `docs/spec/_source/settings.json:4959` | parentTaskLinksShown | parentTaskLinksShown |  |
| W1-100 | c | `33-wbs-parent-palette-icons` | 1 | 1 | `docs/spec/_source/settings.json:4980` | 33-parent-task-palette-icons | 33-parent-task-palette-icons |  |
| W1-101 | a | WBS parent(s) | 5 | 4 | `src/entity/layout-engine/schedule-geometry/wbs-parent-arrows.ts:1` | 親タスク | parent task(s) |  |
| W1-102 | a | 「親子」単独（Task の WBS の親子・導いた親子） | 4 | 2 | `src/adapter/screen-renderer/icon-roster.json:689` | 親タスクと子タスク | parent and child tasks | はい |
| W1-103 | a | 「親」単独（Task の WBS の親: 親の名・親を結ぶ・親が決まらない・親の点 ほか） | 2 | 1 | `src/adapter/screen-renderer/image-to-grs-json-prompt.json:3` | 親タスク | parent task | はい |
| W1-104 | a | 「WBS の親子」 | 1 | 1 | `src/adapter/screen-renderer/icon-roster.json:678` | 親タスクと子タスク | parent and child tasks | はい |
| W1-105 | a | 「子から親へ」（矢印・引く向き） | 1 | 1 | `src/adapter/screen-renderer/icon-roster.json:678` | 子タスクから親タスクへ | from the child task to the parent task | はい |
| W1-106 | a | 「WBS の親」 | 1 | 1 | `src/adapter/screen-renderer/icon-roster.json:689` | 親タスク | parent task | はい |
| W1-107 | c | `wbsParentLink` | 23 | 11 | `src/adapter/input-command-translator/armed-placement.ts:117` | parentTaskLink | parentTaskLink |  |
| W1-108 | c | `wbsParents` | 13 | 6 | `src/adapter/svg-renderer/schedule-overlays.ts:97` | parentTasks | parentTasks |  |
| W1-109 | c | `WbsParentResolution` | 13 | 4 | `src/entity/document-model/schedule/delay-diagnostics.ts:1189` | ParentTaskResolution | ParentTaskResolution |  |
| W1-110 | c | `wbsParentArmed` | 12 | 6 | `src/adapter/input-command-translator/input-command-translator.ts:491` | parentTaskArmed | parentTaskArmed |  |
| W1-111 | c | `WbsParentFamilies` | 12 | 4 | `src/entity/layout-engine/schedule-geometry/schedule-geometry.ts:44` | ParentTaskFamilies | ParentTaskFamilies |  |
| W1-112 | c | `wbsParentChoice` | 10 | 4 | `src/adapter/screen-renderer/notices.ts:36` | parentTaskChoice | parentTaskChoice |  |
| W1-113 | c | `isWbsParentLinksShown` | 8 | 4 | `src/adapter/screen-renderer/command-palette.ts:113` | isParentTaskLinksShown | isParentTaskLinksShown |  |
| W1-114 | c | `setTaskWbsParent` | 7 | 5 | `src/adapter/input-command-translator/armed-placement.ts:110` | setTaskParentTask | setTaskParentTask |  |
| W1-115 | c | `wbsParentFamilies` | 7 | 2 | `src/entity/layout-engine/schedule-geometry/schedule-geometry.ts:559` | parentTaskFamilies | parentTaskFamilies |  |
| W1-116 | c | `wbsParentResolutionsOf` | 6 | 4 | `src/adapter/screen-renderer/properties-panel.ts:27` | parentTaskResolutionsOf | parentTaskResolutionsOf |  |
| W1-117 | c | `WbsParentGeometry` | 5 | 2 | `src/entity/layout-engine/schedule-geometry/schedule-geometry.ts:44` | ParentTaskGeometry | ParentTaskGeometry |  |
| W1-118 | c | `WbsParentArrowGeometry` | 5 | 1 | `src/entity/layout-engine/schedule-geometry/wbs-parent-arrows.ts:21` | ParentTaskArrowGeometry | ParentTaskArrowGeometry |  |
| W1-119 | c | `WbsParentChoice` | 4 | 2 | `src/adapter/screen-renderer/notices.ts:14` | ParentTaskChoice | ParentTaskChoice |  |
| W1-120 | c | `WBS_PARENT_CHOICE_QUESTION` | 4 | 1 | `src/adapter/screen-renderer/notices.ts:38` | PARENT_TASK_CHOICE_QUESTION | PARENT_TASK_CHOICE_QUESTION |  |
| W1-121 | c | `WbsParentQueryGeometry` | 4 | 1 | `src/entity/layout-engine/schedule-geometry/wbs-parent-arrows.ts:45` | ParentTaskQueryGeometry | ParentTaskQueryGeometry |  |
| W1-122 | c | `commandFromWbsParentDrag` | 3 | 2 | `src/adapter/input-command-translator/armed-placement.ts:96` | commandFromParentTaskDrag | commandFromParentTaskDrag |  |
| W1-123 | c | `commandFromWbsParentLinkRelease` | 3 | 2 | `src/adapter/input-command-translator/armed-placement.ts:115` | commandFromParentTaskLinkRelease | commandFromParentTaskLinkRelease |  |
| W1-124 | c | `wbsParentParts` | 3 | 2 | `src/adapter/svg-renderer/schedule-overlays.ts:91` | parentTaskParts | parentTaskParts |  |
| W1-125 | c | `derivedWbsParents` | 3 | 1 | `src/entity/document-model/schedule/delay-diagnostics.ts:93` | derivedParentTasks | derivedParentTasks |  |
| W1-126 | c | `wbsParentGeometryOf` | 3 | 2 | `src/entity/layout-engine/schedule-geometry/schedule-geometry.ts:44` | parentTaskGeometryOf | parentTaskGeometryOf |  |
| W1-127 | c | `WbsParentCandidateGeometry` | 3 | 1 | `src/entity/layout-engine/schedule-geometry/wbs-parent-arrows.ts:38` | ParentTaskCandidateGeometry | ParentTaskCandidateGeometry |  |
| W1-128 | c | `NOT_STORED_WBS_PARENT_ARROW_SIZES` | 3 | 1 | `src/entity/layout-engine/schedule-geometry/wbs-parent-arrows.ts:96` | NOT_STORED_PARENT_TASK_ARROW_SIZES | NOT_STORED_PARENT_TASK_ARROW_SIZES |  |
| W1-129 | c | `wbsParentHoldOf` | 3 | 2 | `src/framework/single-html-shell/frame-loop.ts:238` | parentTaskHoldOf | parentTaskHoldOf |  |
| W1-130 | c | `WbsParentChoiceStep` | 3 | 1 | `src/framework/single-html-shell/wbs-parent-hold.ts:42` | ParentTaskChoiceStep | ParentTaskChoiceStep |  |
| W1-131 | c | `WbsParentReadings` | 3 | 1 | `src/framework/single-html-shell/wbs-parent-hold.ts:47` | ParentTaskReadings | ParentTaskReadings |  |
| W1-132 | c | `isWbsParentArmed` | 3 | 1 | `src/framework/single-html-shell/wbs-parent-hold.ts:101` | isParentTaskArmed | isParentTaskArmed |  |
| W1-133 | c | `WBS_PARENT_LINKS_ROW` | 2 | 1 | `src/adapter/screen-renderer/command-palette.ts:103` | PARENT_TASK_LINKS_ROW | PARENT_TASK_LINKS_ROW |  |
| W1-134 | c | `WBS_PARENT_CHOICE_LINKS` | 2 | 1 | `src/adapter/screen-renderer/notices.ts:40` | PARENT_TASK_CHOICE_LINKS | PARENT_TASK_CHOICE_LINKS |  |
| W1-135 | c | `wbsParentChoiceOf` | 2 | 1 | `src/adapter/screen-renderer/notices.ts:271` | parentTaskChoiceOf | parentTaskChoiceOf |  |
| W1-136 | c | `DerivedWbsParent` | 2 | 1 | `src/entity/document-model/schedule/delay-diagnostics.ts:70` | DerivedParentTask | DerivedParentTask |  |
| W1-137 | c | `wbsParentsOf` | 2 | 1 | `src/entity/document-model/schedule/delay-diagnostics.ts:364` | parentTasksOf | parentTasksOf |  |
| W1-138 | c | `wbsParentLinkHitOf` | 2 | 1 | `src/entity/layout-engine/item-hit-area/item-hit-area.ts:1136` | parentTaskLinkHitOf | parentTaskLinkHitOf |  |
| W1-139 | c | `wbsParentLinksIn` | 2 | 1 | `src/entity/layout-engine/item-hit-area/marquee.ts:36` | parentTaskLinksIn | parentTaskLinksIn |  |
| W1-140 | c | `wbs-parent-arrows` | 2 | 1 | `src/entity/layout-engine/schedule-geometry/schedule-geometry.ts:44` | parent-task-arrows | parent-task-arrows |  |
| W1-141 | c | `NO_WBS_PARENT_GEOMETRY` | 2 | 1 | `src/entity/layout-engine/schedule-geometry/wbs-parent-arrows.ts:63` | NO_PARENT_TASK_GEOMETRY | NO_PARENT_TASK_GEOMETRY |  |
| W1-142 | c | `spentOnWbsParentChoice` | 2 | 1 | `src/framework/single-html-shell/frame-loop.ts:2554` | spentOnParentTaskChoice | spentOnParentTaskChoice |  |
| W1-143 | c | `WBS_PARENT_LINKS_ENTRY` | 2 | 1 | `src/framework/single-html-shell/wbs-parent-hold.ts:17` | PARENT_TASK_LINKS_ENTRY | PARENT_TASK_LINKS_ENTRY |  |
| W1-144 | c | `WBS_PARENT_LINKS_ANSWER` | 2 | 1 | `src/framework/single-html-shell/wbs-parent-hold.ts:20` | PARENT_TASK_LINKS_ANSWER | PARENT_TASK_LINKS_ANSWER |  |
| W1-145 | c | `wbsParentFamiliesOf` | 2 | 1 | `src/framework/single-html-shell/wbs-parent-hold.ts:59` | parentTaskFamiliesOf | parentTaskFamiliesOf |  |
| W1-146 | c | `wbsParentViewOf` | 2 | 1 | `src/framework/single-html-shell/wbs-parent-hold.ts:107` | parentTaskViewOf | parentTaskViewOf |  |
| W1-147 | c | `wbsParentChooserOf` | 2 | 1 | `src/framework/single-html-shell/wbs-parent-hold.ts:147` | parentTaskChooserOf | parentTaskChooserOf |  |
| W1-148 | c | `wbsParentArmed` | 2 | 1 | `src/use-case/advance-screen-session/screen-values.ts:198` | parentTaskArmed | parentTaskArmed | はい |
| W1-149 | c | `wbsParentAfterTheMove` | 2 | 1 | `src/use-case/edit-document/task-group-order.ts:196` | parentTaskAfterTheMove | parentTaskAfterTheMove |  |
| W1-150 | c | 「WBS の子孫・子・祖先・兄弟・部分木」/ "WBS descendant/child/sibling/ancestor/subtree/pair" | 2 | 2 | `src/use-case/edit-document/task-group-order.ts:200` | 子孫タスク・子タスク・祖先タスク・兄弟タスク・部分木 | descendant / child / ancestor / sibling tasks |  |
| W1-151 | c | `wbsParent` | 2 | 1 | `src/use-case/import-document/import-document.ts:126` | parentTask | parentTask |  |
| W1-152 | c | 「親子判別」（IC-141 の名・S-484） | 1 | 1 | `src/adapter/screen-renderer/icon-roster.json:689` | 親タスク表示 | Show Parent Tasks | はい |
| W1-153 | c | `wbs-parent-` | 1 | 1 | `src/adapter/svg-renderer/schedule-overlays.ts:104` | parent-task- | parent-task- |  |
| W1-154 | c | file name `wbs-parent-arrows.ts` | 1 | 1 | `src/entity/layout-engine/schedule-geometry/wbs-parent-arrows.ts:0` | parent-task-arrows.ts | parent-task-arrows.ts |  |
| W1-155 | c | `NOT_STORED_WBS_PARENT_ARROW_SIZES` | 1 | 1 | `src/entity/layout-engine/schedule-geometry/wbs-parent-arrows.ts:225` | NOT_STORED_PARENT_TASK_ARROW_SIZES | NOT_STORED_PARENT_TASK_ARROW_SIZES | はい |
| W1-156 | c | `wbs-parent-hold` | 1 | 1 | `src/framework/single-html-shell/frame-loop.ts:238` | parent-task-hold | parent-task-hold |  |
| W1-157 | c | file name `wbs-parent-hold.ts` | 1 | 1 | `src/framework/single-html-shell/wbs-parent-hold.ts:0` | parent-task-hold.ts | parent-task-hold.ts |  |
| W1-162 | c | `wbsParentUid` | 1066 | 16 | `src/adapter/document-codec/mspdi-codec.ts:646` | parentTaskUid | parentTaskUid |  |
| W1-163 | c | `wbsParentUid` | 11 | 4 | `src/adapter/document-codec/grs-json-schema.ts:144` | parentTaskUid | parentTaskUid | はい |
| W1-164 | a | WBS parent(s) | 28 | 20 | `tests/contract/cr-633-delay-diagnostics-judges-by-the-link-ends.contract.test.ts:298` | 親タスク | parent task(s) |  |
| W1-165 | a | 「親」単独（Task の WBS の親: 親の名・親を結ぶ・親が決まらない・親の点 ほか） | 26 | 9 | `tests/contract/cr-561-the-delay-diagnostics-report.contract.test.ts:29` | 親タスク | parent task |  |
| W1-166 | a | 「WBS の親」 | 10 | 6 | `tests/contract/e24-paste-refused-while-several-rows-are-chosen.test.ts:27` | 親タスク | parent task |  |
| W1-167 | a | 「親子」単独（Task の WBS の親子・導いた親子） | 5 | 5 | `tests/contract/cr-430-table-pk-the-pointer-shapes.test.ts:34` | 親タスクと子タスク | parent and child tasks |  |
| W1-168 | a | 「導いた親」「明記の親」 | 5 | 3 | `tests/contract/cr-561-the-delay-diagnostics-report.contract.test.ts:27` | 導いた親タスク / 明記の親タスク | derived / stated parent task |  |
| W1-169 | a | 「WBS 親」（同じ WBS 親を持つ兄弟） | 3 | 2 | `tests/system/fr-019-hm-9-the-row-tree-decides-what-is-below.test.ts:681` | 親タスク | parent task |  |
| W1-170 | a | parent link / "WBS parent link" | 3 | 2 | `tests/unit/cr-631-wbs-parent-hits-and-hands.test.ts:226` | 親タスクの結び | parent-task link |  |
| W1-171 | a | 「親子関係」「親子の関係」（Task の WBS） | 3 | 2 | `tests/unit/cr-631-wbs-parent-palette-chooser-and-picture.test.ts:67` | 親タスクと子タスクの関係 | parent-task relation |  |
| W1-172 | a | 「親子の進捗の疑義」（K-140 / FR-131） | 1 | 1 | `tests/contract/w3-t3-settings-panel-span-status-date-and-scale-fields.test.ts:35` | 親タスクの進捗の疑義 | parent-task progress doubt |  |
| W1-173 | c | `wbsParentUid` | 1243 | 132 | `tests/contract/cr-561-agent-api-reads-the-delay-diagnostics.contract.test.ts:65` | parentTaskUid | parentTaskUid |  |
| W1-174 | c | 「WBS の子孫・子・祖先・兄弟・部分木」/ "WBS descendant/child/sibling/ancestor/subtree/pair" | 19 | 9 | `tests/contract/cr-561-the-delay-diagnostics-report.contract.test.ts:27` | 子孫タスク・子タスク・祖先タスク・兄弟タスク・部分木 | descendant / child / ancestor / sibling tasks |  |
| W1-175 | c | `wbsParentLink` | 16 | 4 | `tests/unit/cr-631-wbs-parent-hits-and-hands.test.ts:82` | parentTaskLink | parentTaskLink |  |
| W1-176 | c | `wbsParentsOf` | 11 | 2 | `tests/unit/cr-631-scene.ts:249` | parentTasksOf | parentTasksOf |  |
| W1-177 | c | `wbsParentChoice` | 10 | 2 | `tests/contract/display-words.contract.test.ts:398` | parentTaskChoice | parentTaskChoice |  |
| W1-178 | c | `wbsParentResolutionsOf` | 10 | 3 | `tests/unit/cr-631-scene.ts:9` | parentTaskResolutionsOf | parentTaskResolutionsOf |  |
| W1-179 | c | `wbsParentHoldOf` | 10 | 1 | `tests/unit/cr-631-wbs-parent-palette-chooser-and-picture.test.ts:23` | parentTaskHoldOf | parentTaskHoldOf |  |
| W1-180 | c | `setTaskWbsParent` | 9 | 2 | `tests/contract/w3-t4-a-child-descendant-is-never-a-parent-candidate.test.ts:12` | setTaskParentTask | setTaskParentTask |  |
| W1-181 | c | `wbsParents` | 7 | 3 | `tests/contract/cr-661-only-the-checked-tasks-are-laid-and-drawn.contract.test.ts:246` | parentTasks | parentTasks |  |
| W1-182 | c | `wbsParentArmed` | 6 | 4 | `tests/contract/dfc-295-entering-the-dual-cursor-drops-the-arm.test.ts:336` | parentTaskArmed | parentTaskArmed |  |
| W1-183 | c | `isWbsParentLinksShown` | 6 | 1 | `tests/unit/cr-631-wbs-parent-palette-chooser-and-picture.test.ts:122` | isParentTaskLinksShown | isParentTaskLinksShown |  |
| W1-184 | c | `derivedWbsParents` | 5 | 5 | `tests/contract/cr-633-delay-diagnostics-judges-by-the-link-ends.contract.test.ts:325` | derivedParentTasks | derivedParentTasks |  |
| W1-185 | c | `WbsParentFamilies` | 5 | 2 | `tests/contract/cr-661-only-the-checked-tasks-are-laid-and-drawn.contract.test.ts:14` | ParentTaskFamilies | ParentTaskFamilies |  |
| W1-186 | c | `wbsParentOfItself` | 5 | 1 | `tests/unit/nt-8-enter-keeps-the-telling-its-own-settling-raised.test.ts:253` | parentTaskOfItself | parentTaskOfItself |  |
| W1-187 | c | `WBS_PARENT_CHOICE` | 3 | 1 | `tests/contract/display-words.contract.test.ts:2406` | PARENT_TASK_CHOICE | PARENT_TASK_CHOICE |  |
| W1-188 | c | `wbsParentOf` | 3 | 2 | `tests/system/w3-t1-stage.ts:16` | parentTaskOf | parentTaskOf |  |
| W1-189 | c | `ARM_WBS_PARENT` | 3 | 1 | `tests/system/w3-t1-the-wbs-parent-and-the-panel-rows.test.ts:26` | ARM_PARENT_TASK | ARM_PARENT_TASK |  |
| W1-190 | c | `t-016-choosing-the-wbs-parent` | 2 | 1 | `tests/contract/dfc-286-fr-044-emptying-a-set-resume-date-clears-resume-valid.test.ts:51` | t-016-choosing-the-parent-task | t-016-choosing-the-parent-task |  |
| W1-191 | c | `wbsParentParts` | 2 | 1 | `tests/unit/cr-631-wbs-parent-palette-chooser-and-picture.test.ts:12` | parentTaskParts | parentTaskParts |  |
| W1-192 | c | 「親子判別」（IC-141 の名・S-484） | 2 | 1 | `tests/unit/cr-631-wbs-parent-palette-chooser-and-picture.test.ts:69` | 親タスク表示 | Show Parent Tasks |  |
| W1-193 | c | `wbs-parent-arrows` | 1 | 1 | `tests/contract/cr-661-only-the-checked-tasks-are-laid-and-drawn.contract.test.ts:14` | parent-task-arrows | parent-task-arrows |  |
| W1-194 | c | file name `w3-t1-the-wbs-parent-and-the-panel-rows.test.ts` | 1 | 1 | `tests/system/w3-t1-the-wbs-parent-and-the-panel-rows.test.ts:0` | w3-t1-the-parent-task-and-the-panel-rows.test.ts | w3-t1-the-parent-task-and-the-panel-rows.test.ts |  |
| W1-195 | c | 「親定義」（IC-142 の名・親定義のドラッグ） | 1 | 1 | `tests/system/w3-t2-file-and-picture-clauses.test.ts:15` | 親タスク設定 | Set Parent Task |  |
| W1-196 | c | file name `cr-631-wbs-parent-hits-and-hands.test.ts` | 1 | 1 | `tests/unit/cr-631-wbs-parent-hits-and-hands.test.ts:0` | cr-631-parent-task-hits-and-hands.test.ts | cr-631-parent-task-hits-and-hands.test.ts |  |
| W1-197 | c | file name `cr-631-wbs-parent-palette-chooser-and-picture.test.ts` | 1 | 1 | `tests/unit/cr-631-wbs-parent-palette-chooser-and-picture.test.ts:0` | cr-631-parent-task-palette-chooser-and-picture.test.ts | cr-631-parent-task-palette-chooser-and-picture.test.ts |  |
| W1-198 | c | `wbs-parent-hold` | 1 | 1 | `tests/unit/cr-631-wbs-parent-palette-chooser-and-picture.test.ts:24` | parent-task-hold | parent-task-hold |  |
| W1-199 | c | `wbs-parent-` | 1 | 1 | `tests/unit/cr-631-wbs-parent-palette-chooser-and-picture.test.ts:320` | parent-task- | parent-task- |  |
| W1-200 | c | file name `cr-631-wbs-parent-resolutions-and-arrows.test.ts` | 1 | 1 | `tests/unit/cr-631-wbs-parent-resolutions-and-arrows.test.ts:0` | cr-631-parent-task-resolutions-and-arrows.test.ts | cr-631-parent-task-resolutions-and-arrows.test.ts |  |
| W1-206 | a | 「WBS の親子」 | 1 | 1 | `docs/development-rules/03-implementation.md:103` | 親タスクと子タスク | parent and child tasks |  |
| W1-207 | a | 「導いた親」「明記の親」 | 1 | 1 | `docs/development-rules/03-implementation.md:103` | 導いた親タスク / 明記の親タスク | derived / stated parent task |  |
| W1-208 | c | `NOT_STORED_WBS_PARENT_ARROW_SIZES` | 1 | 1 | `docs/development-rules/03-implementation.md:103` | NOT_STORED_PARENT_TASK_ARROW_SIZES | NOT_STORED_PARENT_TASK_ARROW_SIZES |  |

### 9.2 区分 b

| 領域 | 件数 | パターン数 | 大きいもの（件数） |
|---|---:|---:|---|
| development-rules | 60 | 2 | 「親」= トレースの親（要求・UID・表の親） 46、「親」その他（親クラス・親の文脈=親セッション・親の木・親切・表見出し「親」） 14 |
| spec | 213 | 15 | 「親」= TaskGroup の親（親の行・親へ畳み込む・親をまたぐ・同じ親の… 59、「親」= 状態機械の親状態（親 `shown` の升） 51、「WBS」= タスクの親子の木そのもの（G-6。WBS の深さ・WBS の木・… 33、「外部 WBS マスタ」/ "external WBS master" 22、「親」= トレースの親（要求・UID・表の親） 10、「親」= XML 要素の親（xsd:all の親・同じ親の下の子） 8、「親」= 状態機械の親状態（親 `shown` の升） 6、「親」= TaskGroup の親（親の行・親へ畳み込む・親をまたぐ・同じ親の… 5 |
| src identifier | 14 | 4 | MSPDI 語（WBSMask / WBSMasks / WBSLevel /… 7、「WBS」= タスクの親子の木そのもの（G-6。WBS の深さ・WBS の木・… 4、「親」= TaskGroup の親（親の行・親へ畳み込む・親をまたぐ・同じ親の… 2、「WBS」= タスクの親子の木そのもの（G-6。WBS の深さ・WBS の木・… 1 |
| tests | 87 | 5 | 「親」= TaskGroup の親（親の行・親へ畳み込む・親をまたぐ・同じ親の… 40、「WBS」= タスクの親子の木そのもの（G-6。WBS の深さ・WBS の木・… 38、「親」= XML 要素の親（xsd:all の親・同じ親の下の子） 5、「外部 WBS マスタ」/ "external WBS master" 3、MSPDI 語（WBSMask / WBSMasks / WBSLevel /… 1 |

## 10. 改名の CR の大きさ（本席の見積もり）

- **仕様**: 和文の区分 a が約 1,900 件（01-04 は 1,185、ほかは 709）、英語が約 500 件。用語集の `U-1`・`U-22`・`U-23`・`U-46`〜`U-48`・`U-50`・`A-2` と、RATIONALE（決めた理由）を書き足す。生成物の表は `npm run gen` で追う。
- **画面の語**: `display-words.json` の約 45 句（和文と英文）。
- **src**: 区分 a が約 2,500 件、加えて c を当てると約 360 件。モジュールのファイルは 9 本。
- **テスト**: 区分 a が約 9,200 件で、触るファイルは 373 本（c を含めると 404 本）。そのうち 128 本は仕様の文を引いており（check 42 が読む）、仕様の改名と同じコミットで直さないと赤くなる。
- **WBS の親**: Q7 で保存の列も変えるなら、`wbsParentUid` だけで約 2,400 件（src とテスト）。
- ⚠️ 1 つの CR では大きすぎる。**仕様と画面の語の CR → src の機械的な置き換え → テスト** の 3 段に分け、段ごとに持ち場を分けるのがよい。置き換えは語の一覧（本書の TSV）を表にした置換で行い、汎用語の `row` / `rows` は手で読むこと（b が半分を超える）。
