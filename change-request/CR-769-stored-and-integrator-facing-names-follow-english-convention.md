# CR-769 —— 保存される名と連携する者が見る名を、英語の確立した慣習にそろえる（`GRS JSON` の鍵・エージェント API・文書の命令。棚卸しと当てる計画）

> 起草の状態: **下書き（当てていない）**。2026-10-15、作業木 `66d989c6` の上で棚卸しを測り、当てる計画を書いた。`docs/spec`・`src`・`tests`・`tools` には何も当てていない。台帳は `rulings.md` に `JDG-2245` の行を足しただけ（12 節）。
> ID の帯: 番号 `CR-769`〜`CR-771`、裁定 `JDG-2245`〜`JDG-2254`、台帳 `DFC-2745`〜`DFC-2759`、`PND-982`〜`PND-985` を調整役から受けた。本書が使うのは `CR-769` と `JDG-2245` だけ。`66d989c6` の木で `CR-769`・`JDG-2245` を名乗る所は 0 件だった（`git grep -c "CR-769\|JDG-2245" 66d989c6` が空）。変更履歴と `perf-pending` の番号は当てる体が調整役から受ける。
> 当てる裁定: `JDG-2245`（「英語の慣習に従う。…まだ公開前なので今がラストチャンスぐらいに思え。」）。
> 覆しうる裁定（11 節で問う。答えが出るまで覆さない）: `JDG-1488`（`groupId` にそろえる —— 問い 2）、`JDG-1784` のうち `showsTimeOfDay` の綴り（問い 1）。
> 棚卸しの全体: `docs/review/english-naming-survey-2026-10-15.md`（本書の数と出どころはそこから取った）。画面の英語の語は `CR-770`、コードの公開名と配る物の名は `CR-771` が持つ。
> 測った木: `66d989c6`。

---

## 0. ⛔ 立ちどまって答える 3 つ

### 0.1 利用者の裁定の逐語と、決めの土台

| 何 | 逐語・中身 | 本書での扱い |
|---|---|---|
| `JDG-2245` | 「英語の慣習に従う。 他の用語もそうしてきたはず。 もし慣習と違うなら、しかるべきタイミングで直すぞ。 まだ公開前なので今がラストチャンスぐらいに思え。」 | 保存される名（`GRS JSON` の鍵と値）と、AI・MCP の客が見る名（エージェント API・文書の命令）を、名指しできる慣習と比べ、違うものを 1 つの波で直す |
| 仕様の命名の表 | `01-04-requirements.md` の 表 T-006a（`W-1`〜`W-11`）と、その下の注（禁止語 `type`・`data`・`info`・`value`、大文字の略語を識別子に入れない） | ⭐ 本書は表 T-006a を正として測った。⚠️ 表そのものが慣習とも木とも食い違う行が 2 つある（`W-4`・`W-10`、2.1・2.6）—— その 2 行は表を直す |
| `JDG-1192` | 「MSPDI由来の部分はプロパティー名や定義値をMSPDIに合わせるのが鉄則。…」 | MSPDI 由来の列は語幹を変えない（`W-8`）。⚠️ 語幹が MSPDI から外れた列が 2 つある（`created`・`lag`、2.5） |
| `JDG-1784` | 「…長くても誤解が無い方が良い。 …でも平成のプログラム(Java)みたいに何でもかんでも機械的に長くするのもダメ。 あくまで基準は「名は体を表す」だ。」 | 名を長くするのは、短い名が別のものと取り違えられるときだけ（2.2 の `groupId`） |
| `JDG-1692` | 「x-grsChanges ってなに？ こんな命名規則あったっけ？  JSON業界で標準ならOK。」 | `GRS JSON` の鍵は JSON の慣習（Google AIP-140・AIP-142 など、出どころは 1.2）で比べる |

### 0.2 裁定の鎖（rulings.md を「慣習」「命名」「Visible」「真偽」「groupId」「taskGroupId」「showsTimeOfDay」「Utc」「fileSavedUtc」「label」「最小高さ」「MSPDI」「W-10」「W-4」で引いた）

| 裁定 | 何を決めたか | 本書との関係 |
|---|---|---|
| `JDG-1488` | 行の畳みの命令の鍵を `taskGroupId` から `groupId` にそろえる（2026-10-04。そのころ画面の語は「行」だった） | ⚠️ 問い 2 —— `TaskGroup` を指す鍵を `taskGroupId` にそろえるなら覆す |
| `JDG-1570`・`JDG-1665` | 「タスクグループに統一しよう。」・ファイル名・DOM・エージェント API の名もすべて | 同じ向き —— `TaskGroup` を指す名に `group` だけを残さない（問い 2 の推奨の理由） |
| `JDG-1784` | 保存する値の名 `scheduleDataTimeZone`（推奨を退けた）・`viewTimeZone`・`displayTimeZones`・`showsTimeOfDay` | `showsTimeOfDay` の綴りだけが問い 1 に掛かる。ほかは変えない |
| `JDG-1210` | 刻印 `documentStamp` に `fileSavedUtc` を残す（作成日は書き、最終保存日は書き出しで作る） | 覆さない —— 値を持つことは変えない。綴りの `Utc` だけを 2.4 が替える（裁定の逐語は値の要否を問い、綴りを決めていない） |
| `JDG-714`・`JDG-715` | 欄の名「最小高さ」（ズーム倍率 100% 時） | 覆さない —— 画面の語は変えない。鍵 `minHeight` に単位を足すだけ（2.3） |
| `JDG-1192` | MSPDI 由来の列は名も値も MSPDI のまま | 従う（2.5） |
| `JDG-1663`・`JDG-1733` | 稼働前なので古い形式の読み替えを作らない | 従う（5 節） |
| `JDG-1735` | 改名はほかの変更と束ねない | 従う（8 節） |
| `JDG-2162`（`CR-766` の問い 1） | 命令が運ぶ値の名を列の名にそろえるか —— 未答 | 触れ合う（2.7）。同じ慣習の問いなので、調整役が同じ時に問うことを勧める |

### ① この変更は `CH-` / `GL-` のどれを前へ進めるか

- `CH-1` / `GL-008`（構造化した日程データを出す）—— 書き出す `GRS JSON` を読む道具と AI が、鍵の名だけで意味と単位を読める（例: `minHeight` が px か行数かを説明を読まずに分かる）。
- `CH-5` / `GL-007`（AI と協働する）—— MCP の客が、成功・拒否の答えを 1 つの判定の鍵で読める（2.6）。

### ② レビュー観点のどの条項を当て、何が出たか

- `R1.1`（曖昧さの無さ）—— `groupId` は同じ文書の `editGroup`（編集できる人の群）と取り違えうる（2.2）。`lag` は単位（0.1 分）を名が言わない（2.5）。
- `R1.3`（唯一の正）—— 表 T-006a の `W-10`（真偽値は `is`／`has`／`can` で始める）を、保存される真偽値 19 のうち 2 つしか守っていない（2.1）。`W-4`（文字列の判別値は kebab-case）を 0 個しか守っていない（2.6）。表と木の片方を直す —— 本書は慣習に合う側へそろえる。
- 規則 03 の 1 節「綴りまで写す」—— 公開名（表 T-064・表 T-107・表 T-108）とコードの名は同じ段で替える（8 節）。

### ③ 利用者に問わずに決めたこと

| # | 決めたこと | 導き | 代償 |
|---|---|---|---|
| X-1 | 慣習の出どころは本書とレビューの記録にだけ書き、仕様には書かない | 製品名を仕様に書かない規則（`JDG-2245` の読み） | 仕様の表 T-006a は規則だけを持つ |
| X-2 | `TaskGroup.label` → `name`、命令 `setTaskGroupLabel` → `setTaskGroupName` | 実体の人に読ませる名は、ほかの 6 つの実体（`Project`・`Task`・`Calendar`・`Exception`・`Resource`・`CarryElement`）と MSPDI と同じ `name`。画面の語も「Task Group Name」（`PR-18`）。1 つの概念に 1 つの語（1.9）。⚠️ 列は `null` を取り、`null` なら名は `derivedFromTaskUid` のタスクの名から来る（`taskGroupNameOf`、`AT-53`・`AT-54`）—— `name` が `null` を取る形は変わらず、意味（明示した名、無ければ導く）は説明が持つ | 鍵が 1 つ変わる（形式の版を上げる） |
| X-3 | 刻の鍵は `…At`（`scheduleUpdatedAt`・`settingsUpdatedAt`・`fileSavedAt`・`changedAt`）。値が RFC 3339 の `Z` で帯を言うので、名に `Utc` を書かない | 木に既に `settledAt`（対話の発話）がある。JSON の API の多数（GitHub REST の `created_at`・`updated_at`、Prisma・Mongoose の `createdAt`・`updatedAt`）。Google AIP-142 は `create_time` と言うが、JavaScript の世界では `…At` が多い | 2 つの慣習のうち片方を選んだ。⚠️ 問いにしなかった —— どちらを選んでも `Utc` の名は無くなる |
| X-4 | MSPDI 由来の語幹から外れた 2 つを戻す: `Project.created` → `creationDate`（`Project/CreationDate`）、`Dependency.lag` → `linkLag`（`PredecessorLink/LinkLag`） | `JDG-1192`・`W-8` | `lag` の単位（0.1 分）は名でなく説明が持つ（MSPDI の名を保つため）。⚠️ 単位を名に入れる案（`lagTenthMinutes`）は `JDG-1192` に反するので採らない |
| X-5 | 単位を名に足す: `TaskGroup.minHeight` → `minHeightPx`、`rulerHeight` → `rulerHeightPx`、`taskGroupPanelWidth` → `taskGroupPanelWidthPx`、`rulerFont` → `rulerFontSizePx` | 保存される数の鍵のうち単位を持つものは、既に `strokeWidthPx`・`cornerRadiusPx`・`bodyOffsetPx`・`fadeInDays`・`minutesPerDay`・`fillTransparencyPercent`・`parentProgressToleranceDays` と名に単位を書く（木の多数）。Google AIP-142 は整数の量に単位の接尾辞を求める。`rulerFont` は書体でなく字の大きさ（CSS の `font-size`） | 鍵が 4 つ変わる。⛔ 保存しない設定値（`rulerLabelPad` ほか）は本書の範囲の外（表 T-202 の単位の欄が持つ） |
| X-6 | `importSeq`・`lastSeenImportSeq` → `importSequence`・`lastSeenImportSequence` | 略語を避ける（.NET Framework Design Guidelines の「略語を使わない」、`JDG-1784` の「文字数をけちるな」）。Google AIP-140 が許す略語の一覧（`config`・`id`・`info`・`spec`・`stats`）に `seq` は無い | 2 つ変わる |
| X-7 | `HighlightBox.startDate`・`endDate` → `start`・`finish` | 値は日時（「日時」の型）で、日付ではない。GRS の他の区間（`Task.start`・`finish`、`fitSpanStart`・`fitSpanFinish`）は start／finish の対。MSPDI と PMBOK の語も start／finish | 2 つ変わる |
| X-8 | 表 T-006a の `W-4` の「文字列判別値」を、kebab-case から camelCase へ直す（`data-role`・CSS クラスは kebab-case のまま） | 保存の列挙の値 37 のうち kebab-case は 0、camelCase は 7（`temporarilyExpanded`・`endpointSpan`・`triangleUp` ほか）。`src` の `kind: '…'` の字面 277 のうち kebab-case は 0、camelCase は 186。命令の種類（`kind: 'setTaskName'`）は命令の名そのもので、名は `W-2` の camelCase。TypeScript の判別の和は識別子と同じ綴りを使うのが普通（TypeScript Handbook の discriminated unions の例） | 値は 1 つも変えない —— 表の 1 行だけを直す |
| X-9 | 変えない（確かめた）: MSPDI 由来の真偽 `milestone`・`resumeValid`・`dayWorking`・`isBaseCalendar`・`isCostResource`、`resourceKind`・`recurrenceKind`・`linkType`（禁止語 `type` の注）、`Project.id`、`wbsOrder`（`JDG-1729`）、`carry`・`carryElements`（`W-9`）、`scheduleDataTimeZone`（`JDG-1784`）、`zoomX`・`zoomY`、MCP の道具の名の camelCase（2.6） | 棚卸しの 3 節 | 無い |
| X-10 | 単位を持つ 1 列を書く命令の名は、列の単位まで名に持つ（2.7 の 8 つ）。`setTaskFadeInDays`・`setCommentBoxBodyOffsetPx` は既にそうである | 連携する者は同じ値を `GRS JSON` では列の名で、`applyCommands` では命令の名で打つ —— 1 つの概念に 1 つの名（.NET Framework Design Guidelines「同じ概念には同じ名」）。測ると 8 のうち 3 が単位を持ち 5 が落とす | 8 つの命令の名が変わる（1 つあたり `src` 6〜9 行・試験 2〜4 行・仕様 1 行）。⚠️ 命令が運ぶ値の名は `CR-766` の問い 1 が決める —— 本書は命令の名だけ |

---

## 1. 範囲 —— 行き先

| 何 | 変える所 | 2 節 |
|---|---|---|
| `GRS JSON` の鍵 | `docs/spec/_source/erd.json`（日程データの列）・`docs/spec/_source/settings.json`（`documentSettings` と刻印の鍵、表 T-202・表 T-203）→ 生成の `grs-document.schema.json`・`_assets/fig-erd-detail.md`・`_assets/tbl-settings.md`・`src` の型 | 2.1〜2.5 |
| 表 T-006a | `docs/spec/01-04-requirements.md` の `W-4`・`W-10` の行 | 2.1・2.6 |
| 用語集 | `docs/spec/_assets/tbl-glossary.md`（手書き）の 表 T-104（設定の鍵）・表 T-108（命令の名）・表 T-107（エージェント API。`CR-765` の後は原稿 `_source/agent-api-members.json`） | 2.6・2.7 |
| 公開名 | `docs/spec/_source/published-entries.json`（表 T-064）のうち、改名する鍵を名に含むもの（当てる体が数え直す） | 5 節 |
| 手引きと見本 | `docs/guides/schedule-to-grs-json/grs-skeleton.json`・`prompt-en.md`・`prompt-ja.md`、`docs/spec/_source/image-to-grs-json-prompt.*.md`、起動テンプレートの生成器 `tools/generate_startup_template.py`（`SCHEMA_VERSION` を含む） | 5 節 |
| `src`・`tests`・`tools` | 名の綴り、文字列の鍵、試験の固定データ | 7 節 |
| MCP の取次 | `.mcpb` の作り直し（`agentApiVersion` を上げる） | 2.6 |

数: 要求 ±0。表 ±0。表の行 ±0（表 T-006a の 2 行の升を書き換える）。設定値の行 ±0（鍵の綴りだけ）。`（MUST）` ±0。

---

## 2. 名前の対応表（推奨の案。問いの答えで変わる所は印を付けた）

### 2.1 真偽値の鍵 —— ⚠️ 問い 1

表 T-006a の `W-10` は「本ソフトウェア固有の真偽値は `is`／`has`／`can` で始める」と言うが、保存される固有の真偽値 19 のうち守るのは 2 つ。

| 形 | 鍵（`66d989c6`） | 数 |
|---|---|---|
| 主語 ＋ 形容詞（`…Visible`・`…Fixed`・`themeMonochrome`） | `actualVisible`・`assigneeVisible`・`baselineVisible`・`dateGridLinesVisible`・`dependencyVisible`・`groupGridLinesVisible`・`percentCompleteVisible`・`planDatesVisible`・`planVisible`・`progressLineVisible`・`progressMarkerVisible`・`fitSpanFixed`・`taskGroupPanelWidthFixed`・`themeMonochrome` | 14 |
| `is` ＋ 主語 ＋ 形容詞 | `isScheduleFilterApplied`（3 つの表の見た目）・`isUnassignedHidden` | 2 |
| 動詞の三人称（`shows…`） | `showsTimeOfDay` | 1 |
| エージェント API の答え（保存しないが MCP で外へ出る） | `hasMovedSchedule`・`isScrolled`・`hasReplacedEarlierWatch` | 3 |

**利用者の例「`xxxVisible` か `xxxVisibility` か」**: `visibility` は名詞で、慣習では**列挙の状態**に使う（CSS の `visibility: visible | hidden | collapse`、Office JavaScript API の `Worksheet.visibility`（`Visible`／`Hidden`／`VeryHidden`）、Android の `View.visibility`）。真か偽かの鍵は形容詞の `visible`（Office JavaScript API の `Shape.visible`、WinForms の `Control.Visible`）。⇒ 真偽の鍵は `…Visible` が慣習どおりで、`…Visibility` にしない。

推奨の案（問い 1 の B）: `W-10` を「保存される真偽値と外へ出す答えの真偽値は、状態を `主語 ＋ 形容詞`（または過去分詞）で言い、`is`／`has`／`can` を付けない。コードの中だけの真偽値は付けてよい」に直す（出どころ: Google AIP-140「Boolean fields should omit the prefix "is".」、Office JavaScript API・Google Sheets API の `hidden`）。⚠️ 反対の例もある: MCP の仕様（2025-11-25）の道具の答えは `isError`、能力の宣言は `listChanged` で、1 つの規格の中でも混ざる。JSON の真偽の鍵に業界で 1 つの決まりは無く、Google の指針が最も明文で、木の多数（14）と同じ向きなので B を推す。

| 旧 | 新（B） | 新（A、`W-10` のまま） |
|---|---|---|
| `isScheduleFilterApplied` | `scheduleFilterApplied` | 変えない |
| `isUnassignedHidden` | `unassignedHidden` | 変えない |
| `showsTimeOfDay` | `timeOfDayVisible` | `isTimeOfDayVisible` |
| 命令 `setShowsTimeOfDay`（`CM-97`） | `setTimeOfDayVisible` | `setTimeOfDayVisible` |
| `hasMovedSchedule` | `scheduleMoved` | 変えない |
| `isScrolled` | `scrolled` | 変えない |
| `hasReplacedEarlierWatch` | `earlierWatchReplaced` | 変えない |
| `…Visible` の 11・`fitSpanFixed`・`taskGroupPanelWidthFixed`・`themeMonochrome` | 変えない | `is` を頭に付ける（`isPlanVisible` ほか 14） |

### 2.2 `TaskGroup` を指す鍵 —— ⚠️ 問い 2

| 旧 | 新（推奨） | どこ |
|---|---|---|
| `TaskGroupMember.groupId` | `taskGroupId` | 日程データ |
| `CommentBox.anchorGroupId` | `anchorTaskGroupId` | 日程データ |
| `HighlightBox.topGroupId`・`bottomGroupId` | `topTaskGroupId`・`bottomTaskGroupId` | 日程データ |
| `scrollGroupId`・`pinnedGroupIds` | `scrollTaskGroupId`・`pinnedTaskGroupIds` | `documentSettings` |
| 命令の値 `groupId`（`CM-27`・`CM-29`〜`CM-32`・`CM-68`・`CM-69`・`CM-73`・`CM-76`・`CM-85` ほか） | `taskGroupId` | エージェント API |
| `TaskGroup.parentId` | 変えない（`CR-708` の X-9 —— タスクグループの親はタスクグループ。実体の中の自分の親を `parentId` と呼ぶのは慣習どおり） | — |
| `TaskGroup.label` | `name`（X-2。問いではない） | 日程データ |

理由: 外の鍵の名は指す実体の名から作る（Ruby on Rails の外部キーの既定 `<関連>_id`、GRS 自身の `taskUid`・`resourceUid`・`calendarUid`・`predecessorUid`）。同じ文書に「グループ」がもう 1 つある —— `TaskGroup.editGroup`（編集できる人の群、`FR-111`）。MSPDI の `Resource/Group`（資源の群）も `carry` で同じ文書に乗る。

### 2.3 単位を名に足す（X-5）

| 旧 | 新 | 単位（`tbl-settings.md`・`erd.json`） |
|---|---|---|
| `TaskGroup.minHeight` | `minHeightPx` | px（表示の倍率 100 のとき） |
| `rulerHeight`（`S-2`） | `rulerHeightPx` | px |
| `rulerFont`（`S-3`） | `rulerFontSizePx` | px（字の大きさ） |
| `taskGroupPanelWidth`（`S-79`） | `taskGroupPanelWidthPx` | px |
| 命令 `setTaskGroupMinHeight`・`setTaskGroupPanelWidth` | 変えない（命令の名は列の語幹を言えば足りる。運ぶ値の名は `CR-766` の問い 1 が決める） | — |

⚠️ `fontScale`（値 `S`／`M`／`L`）は「倍率」ではなく字の大きさの段である。画面の語との対と `CR-754`・`CR-755` の着地を見てから決める —— 本書では変えない（棚卸しの 2.1 に低い所見として残す）。

### 2.4 刻の鍵（X-3）

| 旧 | 新 |
|---|---|
| `documentStamp.scheduleUpdatedUtc` | `scheduleUpdatedAt` |
| `documentStamp.settingsUpdatedUtc` | `settingsUpdatedAt` |
| `documentStamp.fileSavedUtc` | `fileSavedAt` |
| `changeLog[].changedUtc` | `changedAt` |
| `DialogueMessage.settledAt` | 変えない（既に慣習どおり） |

### 2.5 MSPDI の語幹へ戻す・略語・区間（X-4・X-6・X-7）

| 旧 | 新 | 導き |
|---|---|---|
| `Project.created` | `creationDate` | `Project/CreationDate`（`JDG-1192`・`W-8`） |
| `Dependency.lag` | `linkLag` | `PredecessorLink/LinkLag`（同） |
| 命令 `setDependencyLag`（`CM-38`） | 変えない | 命令の名は「依存線のラグ」を言えば足りる |
| `Project.importSeq`・`TaskOrigin.lastSeenImportSeq` | `importSequence`・`lastSeenImportSequence` | 略語を避ける |
| `HighlightBox.startDate`・`endDate` | `start`・`finish` | 日時の区間は start／finish |

### 2.6 エージェント API・MCP の名（`CR-765` の着地の後に、その原稿へ当てる）

| 何 | 旧 | 新（推奨） | 出どころ |
|---|---|---|---|
| 成功の判定の鍵 | `ok`（`AgentExport`）と `accepted`（`AgentWriteOutcome`・`AgentUtteranceOutcome`・`AgentFocusOutcome`）の 2 つ | `ok` 1 つ | 1 つの API の答えは 1 つの判定の鍵で読む（Slack Web API はすべての答えに `ok`、Fetch API の `Response.ok`） |
| 拒否の文 | `AgentRefusal.what` | `message` | JavaScript の `Error.message`、JSON-RPC 2.0 の `error.message`（MCP の取次が既に運ぶ形） |
| 書き込みが前提にする刻印 | `AgentWriteRequest.readStamp`（メンバ `AM-4` の名 `readStamp` と同じ綴りの欄） | `expectedStamp` | 楽観的な排他の「期待する版」（HTTP の `If-Match`、Kubernetes の `resourceVersion`、EventStoreDB の `expectedRevision`）。メソッドと欄が同じ綴りだと、読む側が欄を呼び出しと読み違える |
| 真偽の答え | 2.1 の 3 つ | 2.1 | 2.1 |
| 直す案の行の種類（`readDelayDiagnostics` の `fixProposals[].fixType`、型 `DelayFixType`・定数 `DELAY_FIX_TYPES` は表 T-064） | `fixType`・`DelayFixType`・`DELAY_FIX_TYPES` | `fixKind`・`DelayFixKind`・`DELAY_FIX_KINDS` | 種類を言う GRS 自身の名は `Kind`（`shapeKind`・`leaderShapeKind`・`resourceKind`・`recurrenceKind`、コードの公開名で `Kind` 17・`Type` 8 —— 棚卸しの 2.5）。`Type` を残すのは MSPDI の要素名を写す所（`linkType`・`dayType`）と、外の API が決めた所だけ |
| 版 | `agentApiVersion` 4 | 5 | 互換でない変更（表 T-035 の `AG-1`） |
| MCP の道具の名 | camelCase（`readDocument` ほか 22） | 変えない | MCP の仕様（2025-11-25 の Tool names）は大小を区別する英数字・`_`・`-`・`.` を許し、例に `getUser` を挙げる。道具の名はエージェント API のメンバ名そのもの（`CR-434`）。⚠️ 公式の見本の取次（filesystem ほか）は snake_case が多いが、メンバ名と 2 つの綴りを持つ方が害が大きい |

### 2.7 文書の命令（表 T-108）—— 変わるものだけ

| 旧 | 新 |
|---|---|
| `setShowsTimeOfDay`（`CM-97`） | `setTimeOfDayVisible`（問い 1 の A でも B でも） |
| `setTaskGroupLabel`（`CM-29`） | `setTaskGroupName`（X-2） |
| `unassignResource`（`CM-45`） | `deleteAssignment` —— 対の `createAssignment`（`CM-44`）と同じ実体の名と動詞の対にする。ほかの 7 つの実体は create／delete の対（`createTask`／`deleteTask` ほか）。2 つの命令はどちらも `taskUid`・`resourceUid` を運ぶ |
| 単位を持つ 1 列を書く命令のうち、単位を落とした 5 ＋ 2.3 で単位が付く 2 ＋ `setParentProgressTolerance`（X-10） | `setTaskVisualStrokeWidthPx`・`setCommentBoxStrokeWidthPx`・`setHighlightBoxStrokeWidthPx`・`setCommentBoxFillTransparencyPercent`・`setHighlightBoxFillTransparencyPercent`・`setTaskGroupMinHeightPx`・`setTaskGroupPanelWidthPx`・`setParentProgressToleranceDays` |
| ほかの 78 | 変えない —— 動詞 ＋ 実体 ＋ 列の語幹で一貫している（88 のうち `set` 56・`delete` 8・`create` 7・`reset` 3・`clear` 2 ほか、すべて動詞で始まる。棚卸しの 2.3） |

---

## 3. 数（`66d989c6`。測り方は 13 節）

| 群 | 名 | 触れる所（仕様 ／ 手引き ／ `src` ／ 試験 ／ 道具 ／ 見本、生成物は除く） | ファイル |
|---|---|---|---|
| 2.1（B） | `isScheduleFilterApplied`・`isUnassignedHidden`・`showsTimeOfDay`・`setShowsTimeOfDay`・`hasMovedSchedule`・`isScrolled`・`hasReplacedEarlierWatch` | 6 ／ 5 ／ 218 ／ 175 ／ 1 ／ 0 | 116（重なりを含む和） |
| 2.1（A） | B の 2 つを除き、`…Visible` の 11・`…Fixed` の 2・`themeMonochrome` を足す | B より約 ＋570 | — |
| 2.2 | `groupId`・`anchorGroupId`・`topGroupId`・`bottomGroupId`・`scrollGroupId`・`pinnedGroupIds` | 53 ／ 14 ／ 1,602 ／ 2,202 ／ 6 ／ 1,002 | 552（重なりを含む和）。⚠️ `groupId` の見本 1,000 は `sample-schedule/Three-Year Product Plan.json`（`JDG-1732` で書き直さない） |
| X-2 | `label`（`TaskGroup` の列）・`setTaskGroupLabel` | ⚠️ `label` は一般の語なので語の一致では数えられない（`src` 626・試験 1,018 は上限）。型の言語サービスで数える（7 節） | — |
| 2.3 | `minHeight`・`rulerHeight`・`rulerFont`・`taskGroupPanelWidth` | 31 ／ 10 ／ 217 ／ 453 ／ 10 ／ 102 | 270 |
| 2.4 | `scheduleUpdatedUtc`・`settingsUpdatedUtc`・`fileSavedUtc`・`changedUtc` | 9 ／ 3 ／ 48 ／ 235 ／ 12 ／ 3 | 129 |
| 2.5 | `created`・`lag`・`importSeq`・`lastSeenImportSeq`・`startDate`・`endDate` | ⚠️ `created`・`lag`・`startDate` は一般の語・MSPDI の要素名と重なるので上限（`src` 81・603・58）。`importSeq` 系は 10 ／ 1 ／ 34 ／ 31 ／ 4 ／ 1 | — |
| 2.6 | `accepted`・`what`・`readStamp`（欄） | ⚠️ 一般の語。型で数える（`readStamp` の欄は `src` 20・試験 256 が上限） | — |
| 2.6 | `fixType`・`DelayFixType`・`DELAY_FIX_TYPES` | 2 ／ 0 ／ 63 ／ 21 ／ 0 ／ 0（`_assets` と生成物 2 を除く） | 18 |
| 2.7 | `unassignResource` と単位を持つ 8 つの命令 | 0 ／ 0 ／ 63 ／ 40 ／ 1 ／ 0（表 T-108 は `_assets` の手書きの表で、命令ごとに 1 行 —— 計 9） | 約 45（重なりを含む和） |

⇒ 語の一致の数は、一般の語を除いて **約 5,000 か所・約 1,000 ファイル（重なりを含む）**。CR-708（1,667 パターン、凍結の実測 約 1.6 時間）と同じ桁である。

---

## 4. ⛔ 変えない語

| 何 | 例 | 理由 |
|---|---|---|
| MSPDI の要素名と、その語幹の列 | `milestone`・`resumeValid`・`dayWorking`・`isBaseCalendar`・`isCostResource`・`percentComplete`・`statusDate` | `JDG-1192`・`W-8` |
| 禁止語を避けた複合語 | `linkType`・`resourceKind`・`recurrenceKind` | 表 T-006a の注。⚠️ `Type` と `Kind` が混ざるが、どちらも慣習の範囲（棚卸しの 2.1） |
| `carry` の中身 | MSPDI の綴りそのまま | `W-9` |
| 裁定が決めた名 | `wbsOrder`（`JDG-1729`）・`scheduleDataTimeZone`（`JDG-1784`）・`parentTaskUid`（`JDG-1666`） | 裁定 |
| 履歴 | rulings の逐語、台帳、`change-request/`、`docs/review/`、`previous-project-result/` | `CR-730` の X-1 と同じ |
| 見本の文書 | `sample-schedule/Three-Year Product Plan.json` | `JDG-1732` |

---

## 5. 継ぎ目（コード）

- 鍵の綴りは原稿 2 つ（`erd.json`・`settings.json`）が持ち、`npm run gen` がスキーマ・`src` の型（`tools/generate_entity_types.py`）・表を刷る。⛔ 原稿と生成と手書きのコードを同じ段で替える（`CR-708` の 7 節と同じ）。
- 手引きの `grs-skeleton.json` と画像の頼みの文（和英）は手で同じ綴りにする（検査 75）。起動テンプレートは生成器 `tools/generate_startup_template.py` の鍵の字面を替えて刷る。
- **形式の版**: `SCHEMA_VERSION`（`66d989c6` で `2026-10-11T04:10:00Z`）を段 1 のコミットの時刻へ上げる（`FR-073`）。変更の台帳 `grs-json-changes.json` には足さない —— `S-541` が `null` のあいだ空（検査 76）。旧い鍵の読み替えは作らない（`JDG-1663`・`JDG-1733`）—— 稼働前の文書は開けなくなる（日程データの鍵）か、知らない鍵として既定値で開く（`documentSettings` の鍵、`OP-6`）。
- **エージェント API の版**: `agentApiVersion` 4 → 5（`src/adapter/agent-api-endpoint/agent-api-members.ts` の `AGENT_API_VERSION`。`CR-765` の後は原稿が持つ）。`npm run build:relay` で `.mcpb` を作り直す。
- 毎フレームの経路（規則 04 の 5 節）: 名だけが変わり、仕事は変わらない。検査 66 が行を求めたら調整役が `perf-pending` の番号を配る。

---

## 6. グラフ

鍵の綴りは行 ID を 1 つも変えない —— 誘導部分グラフは当てる前後で同じ。動くのは表 T-006a の 2 行（`W-4`・`W-10`）の升と、表 T-104・表 T-108 の名の升。⚠️ 当てる体は `impact.py T-006a T-104 T-108` を当てる日の木で測り、表 T-006a を名指す要求（`01-04-requirements.md` の 1.9 の前文）が偽にならないことを読む。

---

## 7. 機械の手順（台本で置き換える。⛔ 見ないままの全体置換をしない）

`CR-730` の `tools/rename/apply_spelling.py`（1 回の実行、決めの表、衝突で止まる）と `CR-708` の `tools/rename/rename_symbols.mjs`（TypeScript の言語サービスで型をたどる改名）の 2 つを先例とする。名が 2 種あるので、道具も 2 つに分ける。

| 種 | 名 | 道具 | 理由 |
|---|---|---|---|
| (a) 一意の名 | `isScheduleFilterApplied`・`showsTimeOfDay`・`scheduleUpdatedUtc`・`fileSavedUtc`・`anchorGroupId`・`topGroupId`・`rulerFont`・`importSeq`・`hasMovedSchedule` ほか | `apply_spelling.py` を写した新しい台本 `tools/rename/apply_names.py`（部分語でなく**名ごと**の表。表の行 ＝ `old`・`new`・`kind`（`json-key` ／ `identifier` ／ `prose` ／ `command`）・`files`・`count`・`collision`） | 木の中でその綴りが指すものは 1 つ —— 全文の名の一致で足りる |
| (b) 一般の語の名 | `label`（`TaskGroup` の列）・`groupId`・`created`・`lag`・`startDate`・`endDate`・`minHeight`・`accepted`・`what`・`readStamp`（欄） | 原稿は JSON の位置（実体名 ＋ 列名）で替え、`src` は `rename_symbols.mjs` で宣言からたどり、試験の文字列の鍵（`{ label: … }` の固定データ、`'groupId'` の字面）は読み票（`CR-708` の `apply_rename.py` の形）で 1 か所ずつ決める | 同じ綴りが別のもの（UI の部品の `label`、MSPDI の `Created`、`Array` の `startDate`）を指す |

⭐ 段 0（凍結の前に作れる）—— 1 つの体（判断があるので Opus）:

1. 表 (a) を名ごとに作り、`collision`（新しい名が同じファイルに既にあるか）を埋める。`apply_spelling.py` の止まり方（未知の名・衝突・2 つの新名）をそのまま使う。
2. 表 (b) の読み票を作る —— `rename_symbols.mjs` が拾わない所（試験の固定データの鍵、文字列の `'groupId'`、手引きの JSON）を `rg -w` で全部挙げ、1 行ずつ「替える／替えない」を書く。
3. 試験が語を符号で綴る所（`String.fromCharCode`・`\uXXXX`）を検査 77 の読み方で解いて、改名する名が無いことを数える（英語の名なので 0 の見込み。`CR-730` の 13 節の 5 と同じ測り方）。
4. 木のコピー（一時の場所）に 1 と 2 を当て、`npm run gen:check`・`tsc`・`vitest` の赤の数を記録する。

---

## 8. 段・凍結・確かめ・見積もり

### 8.1 ⛔ 当てる時機 —— 進行中の波の後

本書は次の変更要求が**すべて着地してから**当てる。名が触れ合う所（棚卸しの 4 節、`66d989c6` で各変更要求の本文に旧い名が現れるかを数えた）:

| 群 | 触れ合う変更要求 | 何が重なるか |
|---|---|---|
| 2.1 真偽値 | `CR-754`（設定パネル。`isScheduleFilterApplied`・`isUnassignedHidden`・`showsTimeOfDay`・`…Visible` の 11 を名指す）、`CR-756`（`showsTimeOfDay`） | 同じ鍵の行と、設定パネルの欄 |
| 2.2 `groupId` | `CR-766`（命令の運ぶ値の原稿 —— `groupId` を運ぶ値の名として書き起こす）、`CR-754`（`scrollGroupId`・`pinnedGroupIds`）、`CR-767`（`parentId` —— 本書は変えない） | `CR-766` の原稿が書いた名を、本書が 1 回で替える |
| 2.3 単位 | `CR-754`・`CR-755`（`rulerFont`・`rulerHeight`・`fontScale`・`taskGroupPanelWidth`）、`CR-766`（`fontScale`・`displayScale`） | 設定の行と設定パネル |
| 2.5 | `CR-757`（`lag`・`created`・`startDate` を名指す —— 全体を稼働日で動かす命令）、`CR-760`（`linkType`、本書は変えない） | 依存線のラグと開始日の欄 |
| 2.6 エージェント API | `CR-765`（表 T-107 を原稿へ移し、`AgentApi` の型と MCP の入力の形を刷る） | ⭐ 本書の 2.6 は `CR-765` の原稿に当てる —— 先に当てると、`CR-765` が手の写しを消すときに旧い名を写し直す |
| 2.7 命令 | `CR-766`（表 T-108 を原稿へ移す）と、その問い 1 | `CR-766` の原稿に当てる |
| 2.6 `fixType` | どの変更要求も名指さない（0）。⚠️ `CR-758`・`CR-759` は直す案の表を変える —— 着地の後に数え直す | 直す案の行の形 |
| 触れない | `CR-740`・`CR-758`・`CR-759`・`CR-761`・`CR-762`・`CR-768` | 旧い名を名指さない（`CR-758`・`CR-759` に現れる `label` は部品の字で、`TaskGroup.label` ではない —— 本文を読んで確かめた） |
| 測れない | `CR-763`・`CR-764`（`66d989c6` の木に無い） | 当てる日に同じ数え方で測る |

### 8.2 段

⭐ 1 本の作業ブランチで当て、段ごとにコミットする。段と段のあいだの赤は許し、数を記録する。`main` へは全部が緑で 1 度だけ早送りする。⛔ ほかの変更と束ねない（`JDG-1735`）。始める時機は調整役が決め、利用者に一言伝える（`JDG-1726` に倣う）。⛔ 凍結のあいだ、ほかの席は `docs/spec`・`src`・`tests`・`tools`・`.claude/skills`・`docs/guides` を書かない。

| 段 | 持ち場 | 何をする | 終わりに確かめること | 見込み |
|---|---|---|---|---|
| 0（凍結の前） | 1 つの体 | 7 節の 1〜4 | 道具が未決の衝突で止まること。コピーの上の赤が読み票で説明できること | 3〜4 h |
| 1 仕様と生成器 | `docs/spec`・`docs/guides`・`tools/generate_*.py` | 原稿の鍵・表 T-006a の 2 行・表 T-104・表 T-107（原稿）・表 T-108（原稿）・`SCHEMA_VERSION`、`npm run gen` | `npm run gen:check` 0、`strictdoc export docs/spec` の後 `rm -rf output` | 0.5〜1 h |
| 2 `src` | `src/entity`・`src/use-case` ／ `src/adapter`・`src/framework` | 表 (a) と (b)、`agentApiVersion` 5、`.mcpb` | `npm run typecheck` 0、`npm run build` 0 | 0.5〜1 h |
| 3 試験と道具 | `tests` ／ `.claude/skills`・`tools` | 同じ表の残り、`npm run gen:tests`、基準値の名（調整役、`JDG-520`） | `vitest` の全体と `playwright`（錠の下、既知の赤だけ）、check.sh 0、`privacy_count.py` | 1〜1.5 h |
| 締め | 調整役 | `dist/index.html`、台帳（`JDG-2245` の状態、変更履歴）、利用者に確かめてもらう一覧（14 節） | 14 節 | 0.25〜0.5 h |

- **計**: 凍結 約 2.25〜4 h（問い 1 が A なら ＋0.5 h、問い 2 で `groupId` を変えないなら −1 h）。段 0 を入れた実時間 約 5.5〜8 h。⚠️ 見込みは測ったものではなく、`CR-708` の実測（凍結の当てと確かめ 約 1.6 h、1,667 パターン）と 3 節の数から置いた。`CR-708` より重いのは、一般の語（(b) の種）に読み票が要るからである。

---

## 9. 仕様の外で直すもの

- 規則 03 の 1 節（名前の正）は変えない。規則 02 の 5 節の表記の表は英語の名の行を持たない —— 鍵の綴りは表 T-006a が持つ。
- 基準値のファイル（`literal-restatement-baseline.txt` ほか）に旧い名があれば、名だけを替える（調整役、`JDG-520`）。
- `tests/known-red.txt` の行。
- 見本の `sample-schedule/Three-Year Product Plan.json` は書き直さない（`JDG-1732`）。⚠️ 鍵が替わると、この見本は古い形の文書になり、開けない（日程データの鍵 `groupId`・`label`・`lag`・`created` を持つ）。見本を残すかは `JDG-1732` の外 —— 問い 3。

---

## 10. ⛔ この変更でやらないこと ・ 触れ合うもの

- 振る舞い・値・表の行・行 ID・規範の文（表 T-006a の 2 行を除く）を変えない。
- 古い鍵の読み替えを作らない。変更の台帳に足さない。
- 画面の語は変えない（`CR-770`）。コードだけの名と配る物の名は変えない（`CR-771`）。
- ⛔ ほかのどの変更とも束ねない（8 節）。

---

## 11. 利用者に問うこと

**用語の説明**: 「鍵」＝ 保存したファイル（`.json`）の中で値に付く英語の名。「AI の窓口」＝ AI（Claude など）が GRS を読み書きする口（エージェント API と、それを運ぶ MCP）。どちらも画面には出ないが、ファイルを読む道具や AI はこの名で読む。

**問い 1 —— 保存する「はい／いいえ」の値の名に、`is` を付けますか？（`JDG-1784` の `showsTimeOfDay` を覆すかを含む）**
**Q1 —— Should stored yes/no keys start with "is"?**

使う場面: 保存したファイルの中で、「予定を表示する」は `"planVisible": true`、「スケジュールフィルタを当てる」は `"isScheduleFilterApplied": true`、「時刻を表示する」は `"showsTimeOfDay": true` と書かれている。名の作り方が 3 通り混ざっている。仕様の命名の表（`W-10`）は「`is` で始める」と言うが、守っているのは 19 のうち 2 つ。

| | **B（推奨）`is` を付けない。表を直す** | A 表のとおり `is` を付ける | C 今のまま |
|---|---|---|---|
| ファイルの中の名 | `planVisible`・`scheduleFilterApplied`・`unassignedHidden`・`timeOfDayVisible` | `isPlanVisible`・`isScheduleFilterApplied`・`isUnassignedHidden`・`isTimeOfDayVisible` | 3 通りのまま |
| 変える名の数 | 7（AI の窓口の答えの 3 を含む） | 15 | 0 |
| 表 `W-10` | 「保存と外へ出す値は `is` を付けない」に直す | そのまま | 木と食い違ったまま |
| 慣習 | Google の API 設計の指針（AIP-140）「真偽の欄は is を付けない」。Office の JavaScript API の `visible`、Google Sheets API の `hidden` | Swift・.NET の「プロパティは is で始めてよい」。AI の窓口の規格（MCP）自身の答えの `isError` | — |

推奨: **B**。理由 —— JSON の鍵の慣習は `is` を付けない形で、木の多数（14）もその形である。変える数も少ない。「`xxxVisible` か `xxxVisibility` か」は、`Visible` が正しい（`visibility` は「表示・非表示・畳む」のような 3 つ以上の状態の名に使う語）。⚠️ `showsTimeOfDay` は `JDG-1784` で一度決めた名だが、ほかの「表示する」の 11 個と同じ形 `timeOfDayVisible` にそろえる —— どちらの案でもこの 1 つは変わる。

**問い 2 —— タスクグループを指す鍵の名を `groupId` から `taskGroupId` に変えますか？（`JDG-1488` を覆すか）**
**Q2 —— Should keys that point at a task group say taskGroupId instead of groupId?**

使う場面: 保存したファイルの中で、タスクがどのタスクグループに載るかは `{ "taskUid": 12, "groupId": "…" }`、コメントボックスが留まるタスクグループは `anchorGroupId`、表示の上端のタスクグループは `scrollGroupId`。2026-10-04 に `JDG-1488` で、命令の鍵を `taskGroupId` から `groupId` にそろえた（そのころ画面の語は「行」だった）。その後「タスクグループに統一しよう」（`JDG-1570`）で、画面もデータも「タスクグループ」になった。同じファイルに「編集グループ」（`editGroup` —— 編集できる人の群）がある。

| | **A（推奨）`taskGroupId` にそろえる** | B 今のまま `groupId` | C 日程データの 1 つ（`TaskGroupMember.groupId`）だけ変える |
|---|---|---|---|
| ファイルの中の名 | `taskGroupId`・`anchorTaskGroupId`・`topTaskGroupId`・`scrollTaskGroupId` ほか | `groupId`・`anchorGroupId` ほか | 1 つだけ `taskGroupId` |
| 読む者の迷い | 無い —— タスクは `taskUid`、タスクグループは `taskGroupId` | 「どのグループか」を説明で確かめる（`editGroup` と並ぶ） | 名の作り方が 2 通りになる |
| 手間（凍結の時間） | 約 1 時間足す（触れる所 約 4,900、`src` 1,602・試験 2,202） | 0 | 小さい |
| `JDG-1488` | 覆す（「1 つの役に 1 つの綴り」は A でも保たれる） | 保つ | 一部覆す |

推奨: **A**。理由 —— 外の鍵は指す実体の名から作るのが慣習（GRS 自身も `taskUid`・`resourceUid` と書く）で、`JDG-1784` の「名は体を表す」にも合う。`JDG-1488` の狙い（同じ役の鍵を 1 つの綴りに）は A でも守られる。⚠️ タスクグループの親 `parentId` は変えない（タスクグループの中の自分の親）。

**問い 3 —— 鍵を変えると開けなくなる見本 `Three-Year Product Plan.json` をどうしますか？**
**Q3 —— What should happen to the sample "Three-Year Product Plan.json", which will no longer open?**

使う場面: リポジトリの `sample-schedule/Three-Year Product Plan.json` は、GRS JSON で書いた大きめの見本である。`JDG-1732` で「書き直さない」と決めた（改名 `CR-708` のとき）。本書の鍵の変更（`groupId`・`label`・`lag`・`created` ほか）の後、この見本は古い形になり、GRS で開くと拒まれる。

| | **A（推奨）改名の台本で鍵だけ追従させる** | B そのまま残す（開けない） | C 消す |
|---|---|---|---|
| 結果 | 開ける。中身（タスク名・日付）は変わらない | 開けない見本が残る | 見本が無くなる |
| `JDG-1732` | 覆す（鍵の綴りだけ） | 保つ | 覆す |

推奨: **A**。理由 —— 見本は開けることに意味がある。中身を書き直すのではなく、改名の台本が鍵の綴りだけを替える（`CR-708` の起動テンプレートと同じ扱い）。

⭐ 答え: まだ無い（2026-10-15 07:30 から利用者は不在）。調整役が問う時期を決める。答えが無いあいだは当てない —— 問い 1〜3 は名の表の範囲を変える。

---

## 12. 台帳

| 台帳 | 動かしたもの |
|---|---|
| `rulings.md` | `JDG-2245` を足した（状態「指示 —— CR-769 が当てる」）。`JDG-1488`・`JDG-1784`・`JDG-1732` の状態は変えない（問いの答えが出てから） |
| `defects.md` | 動かさない —— 本書は改名の計画で、仕様とコードの食い違いを新たに見つけていない（表 T-006a の 2 行は仕様の中の食い違いで、本書が直す） |
| `changelog.md`・`perf-pending` | 当てる体が番号を受ける |

---

## 13. 測り方の再現

```
# the tree: worktree at 66d989c6, clean
# 1. every key of the published schema (170) and every enum value (37)
python: walk docs/spec/_source/grs-document.schema.json, collect "properties" names and "enum" strings
# 2. places a name touches -- the counter lives in the survey (docs/review/english-naming-survey-2026-10-15.md, section 6)
#    whole-word match (?<![A-Za-z0-9_])NAME(?![A-Za-z0-9_]) over `git ls-files`, per area:
#    spec = docs/spec minus docs/spec/_assets and the generated schema, guides = docs/guides, src, tests,
#    tools = tools + .claude/skills + package.json, samples = sample-schedule
#    the same pattern over change-request/CR-(740|754..768)-*.md names the in-flight CRs (8.1)
# 3. kind literals in src: grep -rhoE "kind: '[a-zA-Z-]+'" src --include=*.ts | sort -u  -> 277 (kebab 0, camelCase 186)
# 4. agentApiVersion: grep -n "AGENT_API_VERSION =" src/adapter/agent-api-endpoint/agent-api-members.ts -> 4
```

---

## 14. 利用者の実物の手順と見積り

- 実物の手順（調整役へ送る。`JDG-1340`）: (1) 新しい `dist/index.html` で見本を開き、保存した `.json` をテキストで開いて、2 節の新しい鍵（`planVisible`・`taskGroupId`・`minHeightPx`・`scheduleUpdatedAt` ほか）が並び、旧い鍵が無いこと。(2) MCP の客から `readDocument` と `applyCommands` を呼び、答えの判定が `ok` 1 つで、`agentApiVersion` が 5 であること。
- 見積り: 段 0 3〜4 h ＋ 凍結 2.25〜4 h（8.2）。
