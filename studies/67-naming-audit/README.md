# 67 — 名の調べ：GRS JSON の鍵・Agent API・文書の命令

調べた版: `dc3cbafa`（`integ/coord-1017` の先端）。調べた日: 2026-10-17。**調べるだけで、名は 1 つも変えていない。** 変える名は、調整役が組む CR が当てる（`TaskGroup.editGroup` → `editPermission` はすでに `CR-792` が持つ）。

利用者の問い（2026-10-17、逐語）: 「JSONスキーマとAPIについてまだ不適切な命名があるのでは？ 調整役に依頼して調査用セッションを立ち上げてもらえ。」

## 0. 見た範囲と、測り方

| 範囲 | 正 | 数 |
| --- | --- | --- |
| GRS JSON の鍵 | `docs/spec/_source/grs-document.schema.json`（`erd.json`・`settings.json` から生成） | 定義 26・`documentSettings` の鍵 37 ほか |
| Agent API のメンバと値の型 | `docs/spec/_source/agent-api-members.json`（表 T-107・表 T-400） | メンバ 22・値の型 14 |
| 文書の命令 | `docs/spec/_source/document-commands.json`（表 T-108） | 命令 91・形 11 |
| 画面の語 | `docs/spec/_source/display-words.json`（`properties`・`settings`・`paletteGroups`） | — |

- **判定の物差し**: `JDG-820`（名は指すものを言い、仕様の名で綴る）、`JDG-1784`（名は体を表す。誤解が無いなら長くてよいが、機械的に長くしない）、`JDG-2241`（英語の慣習に従う。公開前がラストチャンス）、`JDG-2245`（真偽は `is`／`has`）、`JDG-2246`（`TaskGroup` を指す鍵は `taskGroupId`）、`JDG-2361`（命令の値は、1 対 1 で書く列の名と同じ名）。今日の先例: `editGroup` → `editPermission`（兄弟の `name`・`color`・`minHeightPx` が頭を付けず、画面が Edit Permission と言うから）。
- **MSPDI の名**（`stop`・`resume`・`resumeValid`・`linkType`・`linkLag`・`lagFormat`・`dayType`・`isBaseCalendar`・`isCostResource` ほか）は MSPDI の綴りのまま —— 調べの外。
- **参照の数**: `git grep -w -o <名> -- src tests docs/spec tools | wc -l`（出現）と、同じ条件の `-l`（ファイル数）。`dist/`・`studies/`・`docs/development-records/` は数えない（改名で書き換えるのは数えた 4 か所と、生成物）。版 `dc3cbafa`。
- **GRS JSON の形が変わるか**: 保存の鍵か値を変えると、生成するスキーマの `schemaVersion`（今は刻 `2026-10-16T12:35:39Z`）が新しくなる（`FR-073`）。公開前なので旧の形の読み替えは作らない（利用者の指示 2026-09-26）—— 古い `GRS JSON` は開けなくなる。命令と Agent API だけの改名は保存の形を変えないが、`AGENT_API_VERSION`（今は 5）を上げる。
- **問う前に `docs/development-records/rulings.md` を検索した**（各候補の名で `grep -c`）。過去の裁定に触れる候補は、その行の ID を「先の裁定」に書いた。

## 1. 候補（変える択を推す 12 件）

推奨の順は、AI が読み違える度合いの大きい順。

| # | 今の名 | 在りか | 画面の語 ja / en | 何がまずいか | 択（★ 推奨） | 参照の数 | GRS JSON の形 | 先の裁定 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| N-1 | `hasMovedSchedule` | `agent-api-members.json:689`・`:958`（表 T-400 の `AV-2`・`AV-6`） | 画面に無い | 意味は「日程データの群を書き換えた（その刻 `scheduleUpdatedAt` が進んだ）」。日程表で「動かす」は日付をずらすこと（`moveTaskGroup`・`shiftScheduleTimes`）なので、日付をずらしたかと読める | ★ A `hasUpdatedSchedule`（進めた刻の鍵 `scheduleUpdatedAt` と同じ語）／ B `hasChangedSchedule` ／ C 今のまま | 94 / 22 ファイル | 変わらない（API の答え） | `JDG-2245` は頭の `has` を保っただけで、語 Moved は問うていない |
| N-2 | `scrollDayOffset` ・ `scrollGroupOffset` | `grs-document.schema.json:341`・`:345`（`S-177`・`S-176`） | 日程表の左端の日時 / Left Edge Time ・ 上端のタスクグループの位置 / Top Task Group Position | ① 値は 0 以上 1 未満の比で px でない。同じ文書で Offset は px のずれ（`bodyOffsetPx`、`setCommentBoxBodyOffsetPx` の `dx`・`dy`）—— 1 語が 2 つの意味。比には先例 `anchorBandFraction`（`AT-163`）がある ② 相方の語と違う（`scrollDate` ↔ Day、`scrollTaskGroupId` ↔ Group） | ★ A `scrollDateFraction` ・ `scrollTaskGroupFraction` ／ B `scrollDateOffset` ・ `scrollTaskGroupOffset`（相方の語だけそろえる）／ C 今のまま | 216 / 91 ・ 227 / 100 | **変わる**（`documentSettings`、命令 `CM-66`・`CM-71` の値も） | `JDG-2469` は見せ方だけ決め「保存の持ち方は変えない」—— 名は問うていない |
| N-3 | `fontScale` ・ 命令 `setFontScale` | `grs-document.schema.json:238`（`S-70`）・`document-commands.json:2505`（`CM-62`） | 文字サイズ / Font Size | 値は S／M／L の段で、倍率ではない。同じ文書で Scale は倍率（`displayScale` は 50〜200 %、設定の `thinFontScale`・`taskGroupTitleTopScale`）—— 1 語が 2 つの意味。仕様の名は「文字サイズの段」 | ★ A `fontSizeStep` ・ `setFontSizeStep` ／ B `fontSize` ・ `setFontSize` ／ C 今のまま | 130 / 38 ・ 20 / 12 | **変わる** | `JDG-1473`・`JDG-2361` はこの名を使っただけで、名は問うていない。⚠️ 表 T-215 の `fontScaleSizes` も同じ語にそろえる |
| N-4 | `TaskOrigin.sourceProjectUid` | `grs-document.schema.json:1420`（表 T-058 の `AT-106`） | 画面に無い | 入るのは取り込み元の `Project.id`（文字列、`src/use-case/import-document/import-document.ts:811`）。ほかの `…Uid` はどれも MSPDI の整数の UID —— 指す先と違う名 | ★ A `sourceProjectId` ／ B 今のまま | 17 / 8 | **変わる** | なし |
| N-5 | `PlanActualPlacement` の判別の鍵 `row`（値 `PA-1`〜`PA-5`）・ `beginTaskActual` の `grabbed`（値 `GA-5` ほか） | `document-commands.json:175`（形）・`:904`（`CM-13`）・`:934`（`CM-14`） | 未着手 / 進行中 / 中断・再開予定あり / 中断・再開日未定 / 完了（表の行） | 鍵の名 `row` と値 `PA-2` は仕様の表の行 ID で、AI は表を読まないと何の状態か分からない。ほかの列挙の値はどれも語（`treeState` の `collapsed` ほか） | ★ A 鍵を `state`、値を語（`notStarted`・`inProgress`・`suspendedWithResume`・`suspendedResumeUnknown`・`completed`、`grabbed` も語へ）／ B 鍵の名だけ `state` にし、値は行 ID のまま ／ C 今のまま | 15 / 9（`PlanActualPlacement`）。値の `PA-n` は数えない（表の行 ID と同じ字） | 変わらない（命令の値） | なし |
| N-6 | 命令が「どの行を」を運ぶ値: タスクは `uid`、タスクグループは `taskGroupId`、注記の箱は `id`、担当は `uid`／`uids` | `document-commands.json:731`（`CM-7`）・`:790`（`CM-9`）ほか 17 のタスクの命令・`CM-41`・`CM-42`・コメントボックス 12・ハイライトボックス 8 の命令 | 画面に無い | 同じ役の値が実体ごとに 3 通りに綴られる。Agent API は `focusTask(taskUid)`・`showOnlyTasks(taskUids)`、文書の外鍵も `taskUid`・`resourceUid`・`anchorHighlightBoxId` —— AI は同じ物を 2 つの名で書く | ★ A 指す物の名を頭に付けてそろえる（`taskUid`・`resourceUid(s)`・`commentBoxId`・`highlightBoxId`。`taskGroupId` は今のまま）／ B タスクと担当だけ（`taskUid`・`resourceUid(s)`）／ C 今のまま | 命令 39（タスク 17・担当 2・コメントボックス 12・ハイライトボックス 8。作る命令を含む）。語 `uid`・`id` は一般的なので grep の数は出さない | 変わらない（命令の値） | `JDG-2246` は `TaskGroup` を指す鍵だけ、`JDG-2361` は列を書く値だけを決めた —— 「どの行を」の値は問うていない |
| N-7 | `setElementVisible` の値 `element`・`visible` | `document-commands.json:2459`（`CM-58`） | 表示 / Display（パレットの群）・表示の切り替え | ① 値 `element` に入るのは保存の鍵 `isPlanVisible` ほか 11 の名。Element は同じ文書で MSPDI の XML の要素（`carryElements`・`CarryElement`）—— 1 語が 2 つの意味 ② 真偽の値 `visible` は `is` で始まらない（`JDG-2245`、同じ群の `setTimeOfDayVisible` は `isTimeOfDayVisible` を運ぶ） | ★ A `setVisibilitySetting(setting, isVisible)` ／ B `setLayerVisible(layer, isVisible)` ／ C 今のまま | 17 / 12 | 変わらない（命令） | なし |
| N-8 | `AgentShownTasks.tables` | `agent-api-members.json:1059`（表 T-400 の `AV-8`） | スケジュールフィルタ | 入るのは「スケジュールフィルタを掛けている表」の名だけ。`tables` は表の全部と読める | ★ A `filteringTables` ／ B `scheduleFilterTables` ／ C 今のまま | 語が一般的なので grep の数は出さない（型 `AgentShownTasks` は 14 / 7） | 変わらない（API の答え） | なし |
| N-9 | `parentProgressToleranceDays` ・ 命令 `setParentProgressToleranceDays` | `grs-document.schema.json:696`（`AT-156`）・`document-commands.json:590`（`CM-87`） | 親タスクの進捗の疑義を許す日数 / Parent Task Progress Tolerance | `Project` の列なので「parent」が何の親か言わない。兄弟の名は `parentTaskUid`・`setTaskParentTask` と Task まで言う | ★ A `parentTaskProgressToleranceDays` ／ B 今のまま | 76 / 38 ・ 14 / 9 | **変わる**（`Project`） | `JDG-1259` は列を立てただけで、名は問うていない |
| N-10 | `pasteTaskGroupSubtree` の値 `targetTaskGroupId` | `document-commands.json:1338`（`CM-28`） | 画面に無い | 書くのは写しの根の親（`TaskGroup.parentId`、`AT-52`）。兄弟の `moveTaskGroup`・`createTaskGroup` は同じ列を `parentId` で運ぶ | ★ A `parentId` ／ B `targetParentId` ／ C 今のまま | 22 / 13 | 変わらない（命令の値） | `JDG-2361` は「列と 1 対 1 でない」として今のままにした —— 本席の読みで、利用者は問われていない |
| N-11 | `deleteResource` の値 `uids` | `document-commands.json:1784`（`CM-42`） | 画面に無い | 値は並び（複数を一度に消す）なのに、命令の名は単数。兄弟の `deleteUnreferencedResources` は複数形 | ★ A `deleteResources` ／ B 今のまま | 16 / 10 | 変わらない（命令） | なし |
| N-12 | `editGroup` ・ `setTaskGroupEditGroup` | `grs-document.schema.json:1003`（`AT-144`）・`CM-76` | 編集権限 / Edit Permission | 裁定済み —— 先例として載せる | `editPermission` ・ `setTaskGroupEditPermission`（利用者が選んだ） | 337 / 91 | **変わる** | 今日の裁定。`CR-792` が持つ |

## 2. 調べたが、今のままを推す 7 件

| 今の名 | 在りか | 画面の語 | 気になる点 | 今のままを推す理由 |
| --- | --- | --- | --- | --- |
| `isDependencyVisible` | `grs-document.schema.json:262`（`S-62`） | 依存線 / Dependency Lines | 兄弟の `isDateGridLinesVisible`・`isProgressLineVisible` は Lines まで言う | 兄弟は線そのものが物の名。依存は物で、線はその描き方。`JDG-2241` は画面の行の名を物の名にするとした |
| `strokeColor` ・ `strokeWidthPx`（TaskVisual・CommentBox・HighlightBox） | `grs-document.schema.json:1388`・`:1551`・`:1627` | 枠線色 / Outline Color ・ 枠線幅 / Outline Width | 画面は Outline | SVG の属性名で、`fillColor` と対になる。AI も開発者も SVG の語で読める。参照 2,612 / 126 と 2,276 / 105 |
| `milestoneGlyph` | `grs-document.schema.json:1360`（`AT-101`） | マイルストーン形状 / Milestone Shape | 画面は Shape | `shapeKind` の値 `milestone` と分ける語。`JDG-1628` は画面の語だけを決めた。参照 2,155 / 83 |
| `viewTimeZone` ・ `displayTimeZones` | `grs-document.schema.json:488`・`:173`（`S-574`・`S-575`） | 本プロジェクトの基準タイムゾーン / Project Base Time Zone ・ 表示するタイムゾーン / Display Time Zone 1〜4 | view と display が近い語 | 利用者が `JDG-1784` で選んだ名。画面の基準の欄は `viewTimeZone` と `Project.scheduleDataTimeZone` の 2 つを書くので、どちらかの名に寄せられない |
| `carry` ・ `carryElements`（9 の実体） | `grs-document.schema.json:709`・`:712` ほか | 画面に無い | 名だけでは「解釈しないで持ち回る MSPDI の値と要素」と分からない | 仕様の語（表 T-053 の `DF-2`・`DF-3`）。参照 6,020 / 354 と 5,467 / 186。⚠️ ただし生成したスキーマに説明（`description`）が無い —— `CR-791` の資源で AI へ渡すなら、`erd.json` に英語の説明を足すほうが安い |
| `deleteTaskGroup` の値 `newTaskGroupId` | `document-commands.json:1308`（`CM-27`） | 画面に無い | 消した結果タスクグループが 0 になったときだけ使う | 作るタスクグループの `id` なので名は合う。⚠️ ただし同じ行の説明「いまの編集はこの値を読まない」は古い —— `src/use-case/apply-document-change/document-change-plan.ts:164` の `freshRowIdOf` が読む。`DFC-2855` も開いたまま（名の外。末尾の「ついでに見つけたこと」） |
| `levelZeroTreeState` | `S-418` | 段 0 の木の状態 / Top-Level Tree State | en の画面は Top-Level | ja の画面「段 0」と同じ語。`outlineBase` と同じく段の数え方を言う |

## 3. ついでに見つけたこと（名の外）

- `CM-27` の `newTaskGroupId` の説明「⚠️ いまの編集はこの値を読まない」は古い（`document-change-plan.ts:164`・`:262` が読む）。`DFC-2855` は `defects.md:723` で開いたまま。`rulings.md:2737` の行は「反証した」と書く —— 閉じ方を調整役が決める。
- 生成した `grs-document.schema.json` の鍵の多くに `description` が無い（例 `Project.carry`・`outlineBase`・`Calendar.ordinal`・`changeLog` の 4 つの鍵）。`CR-791` がこのスキーマを AI へ資源として渡すなら、名より説明の欠けのほうが AI の読み違いを生む。

## 4. 裁定

利用者に 1 件ずつ問うた（2026-10-17）。答えの逐語は `docs/development-records/rulings.md` の `JDG-2680`〜`JDG-2692` が持つ。

| # | 決まった名 | 裁定の行 | 改名の大きさ（参照、上の測り方） | GRS JSON の形 |
| --- | --- | --- | --- | --- |
| N-1 | `hasMovedSchedule` → `hasUpdatedSchedule` | `JDG-2680` | 94 / 22 | 変わらない（`AGENT_API_VERSION` を上げる） |
| N-2 | `scrollDayOffset` → `scrollDateFraction`、`scrollGroupOffset` → `scrollTaskGroupFraction` | `JDG-2681` | 216 / 91 ＋ 227 / 100 | **変わる** |
| N-3 | `fontScale` → `fontSizeStep`、`setFontScale` → `setFontSizeStep`（表 T-215 の `fontScaleSizes` も同じ語へ） | `JDG-2682` | 130 / 38 ＋ 20 / 12 | **変わる** |
| N-4 | `TaskOrigin.sourceProjectUid` → `sourceProjectId` | `JDG-2683` | 17 / 8 | **変わる** |
| N-5 | `PlanActualPlacement` の判別の鍵 `row` → `state`、値 `PA-1`〜`PA-5` → 語（`notStarted`・`inProgress`・`suspendedWithResume`・`suspendedResumeUnknown`・`completed`。最終の語は CR が示す）。`beginTaskActual` の `grabbed` も語へ | `JDG-2684` | 15 / 9 ＋ 値の行 ID | 変わらない |
| N-6 | 「どの行を」の値に指す物の名を付ける: `uid` → `taskUid`・`resourceUid`、`uids` → `resourceUids`、注記の箱の `id` → `commentBoxId`・`highlightBoxId`（`taskGroupId` は今のまま。保存の鍵は変えない） | `JDG-2685` | 命令 39 | 変わらない |
| N-7 | `setElementVisible { element, visible }` → `setVisibilitySetting { setting, isVisible }` | `JDG-2686` | 17 / 12 | 変わらない |
| N-8 | `AgentShownTasks.tables` → `filteringTables` | `JDG-2687` | 型 14 / 7 | 変わらない |
| N-9 | `parentProgressToleranceDays` → `parentTaskProgressToleranceDays`、命令も `setParentTaskProgressToleranceDays` | `JDG-2688` | 76 / 38 ＋ 14 / 9 | **変わる** |
| N-10 | `pasteTaskGroupSubtree` の `targetTaskGroupId` → `parentId` | `JDG-2689` | 22 / 13 | 変わらない |
| N-11 | `deleteResource` → `deleteResources` | `JDG-2690` | 16 / 10 | 変わらない |
| 据え置き | 2 節の 7 件は今のまま | `JDG-2691` | — | — |
| 進め方 | `_source` の関係の ERD（参照から生成する mermaid）と、`_source` 間の矛盾の自動の検査（参照の整合と、許可リスト付きの名の整合の 2 層）を、アルファの後に 1 席で作る。時期と席は調整役が組む | `JDG-2692` | — | — |

N-12（`editGroup` → `editPermission`）は `CR-792` が持つ。保存の形を変える 4 件（N-2・N-3・N-4・N-9）と `editGroup` は、同じ `schemaVersion` の 1 回の更新にまとめられる。
