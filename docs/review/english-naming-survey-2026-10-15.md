# 英語の名の棚卸し —— 確立した慣習と比べる（2026-10-15、`66d989c6`）

> 何のため: 利用者の指示 `JDG-2241`（「英語の慣習に従う。 他の用語もそうしてきたはず。 もし慣習と違うなら、しかるべきタイミングで直すぞ。  まだ公開前なので今がラストチャンスぐらいに思え。」）。利用者と連携する者（AI・MCP の客・`GRS JSON` を読み書きする道具）が見る英語の名と、保存される英語の名を、名指しできる慣習と比べた。
> 何もしていない: `docs/spec`・`src`・`tests` は読んだだけ。名は 1 つも替えていない。当てる計画は 3 本の変更要求 —— `change-request/CR-769-stored-and-integrator-facing-names-follow-english-convention.md`（保存の鍵・エージェント API・命令の名）、`change-request/CR-770-on-screen-english-words-follow-ui-writing-convention.md`（画面の英語の語）、`change-request/CR-771-code-public-names-and-shipped-file-names-follow-convention.md`（コードの公開名と配る物の名）。
> 測った木: `66d989c6`。2.4 節と 2.5 節は、本席が出した読むだけの体 2 つの調べを、番号を付けて取り込んだもの（英語のまま）。数はすべて横に測り方を書いた。⚠️ 仕様には製品名を書かない規則がある —— 本書は慣習の出どころとして製品名・規格名を名指す（記録であり、仕様ではない）。

---

## 0. 結論（利用者への影響の大きい順）

| 順 | 種 | 所見 | 公開の後に直すと | 変更要求 |
|---|---|---|---|---|
| 1 | `GRS JSON` の鍵 | 真偽の鍵が 3 通り（`planVisible` ／ `isScheduleFilterApplied` ／ `showsTimeOfDay`）。利用者は `xxxVisible` のまま（`JDG-2241`）と答えたが、仕様の命名の表 `W-10`（「`is` で始める」）は逆を言い、19 のうち 2 つしか守られていない | 利用者のファイルが開けなくなる | `CR-769` 問い 1 |
| 2 | `GRS JSON` の鍵 | `TaskGroup` を指す鍵が `groupId`（`taskUid`・`resourceUid` と作り方が違い、同じ文書の `editGroup` と取り違えうる）。`TaskGroup.label` だけが `name` でない | 同上 | `CR-769` 問い 2・X-2 |
| 3 | エージェント API | 成功の判定が `ok` と `accepted` の 2 通り、拒否の文が `what`、書き込みの前提の刻印の欄が `readStamp`（メソッドと同じ綴り） | AI の手順が断られる | `CR-769` 2.6 |
| 4 | 画面の語 | 英語のキーの書き方が `Ctrl ＋ A`（全角の ＋）、設定パネルに出る 34 行のうち 30 行の名がプログラムの名（`CR-754` が 11 行・`CR-755` が 2 行を直し、残る 19 行を `CR-770` が持つ。辞書の上では 131 のうち 127 —— 画面に出ない道具の定数を含む）、問いの答えが 11 の問いすべてで `Yes`／`No` | 利用者が戸惑う（壊れはしない） | `CR-770` 問い 1〜3 |
| 5 | `GRS JSON` の鍵 | 単位を名に持たない px の鍵 4（`minHeight`・`rulerHeight`・`rulerFont`・`taskGroupPanelWidth`）、刻の鍵の `Utc`、MSPDI の語幹から外れた `created`・`lag`、略語 `importSeq`、区間 `startDate`／`endDate` | ファイルが開けなくなる | `CR-769` X-3〜X-7 |
| 6 | 画面の語 | 「Arm」30、省略記号 0、知らせの句点 203 のうち 4、Bottleneck・Paused・Comment Box・Dialogue Field | 戸惑う | `CR-770` 問い 4・5 |
| 7 | 配る物 | ブラウザの保存の鍵の頭が `grsched.`（ほかはすべて `grs`）、MCP の取次の表示名 `GRS relay` | 利用者の画面の言語の選びが消える | `CR-771` 2.1・2.2 |
| 8 | コードの公開名 | 仕様の名への別名（`showPlan`・`AgentUtteranceOutcome`）、`Pc`、`date1`／`date2`、`hasNo…` ほか | 壊れない（コードの中だけ） | `CR-771` 2.3〜2.5 |

⭐ **慣習どおりと確かめたもの**（3 節に詳しく）: コードの記法（型 747・関数 864・型の欄 2,106 すべて）、頭字語を語として書く（`Uid`・`Html`・`Json` —— 大文字の頭字語を camelCase の中に書く所 0）、略語（`Cnt`・`Btn`・`Ctx` ほか 0）、エージェント API の 22 のメンバと 88 の命令の名の動詞の文法、MSPDI 由来の名、業務の標準の語（Baseline・% Complete・Lag ほか）、綴りのアメリカ式（`CR-730` の後）、「Please」「!」「Error:」0。

---

## 1. 決めの土台

### 1.1 GRS が既に持つ決まり

| 決まり | どこ | 本書での扱い |
|---|---|---|
| 面ごとの記法 `W-1`〜`W-11`、禁止語（`type`・`data`・`info`・`value`）、大文字の略語を識別子に入れない | `docs/spec/01-04-requirements.md` の 表 T-006a | 正として測った。⚠️ `W-4`（文字列の判別値は kebab-case —— 守る所 0）と `W-10`（真偽は `is` で始める —— 守る所 19 のうち 2）は表のほうが木とも慣習とも違う（`CR-769` X-8・問い 1） |
| 綴りはアメリカ式、画面の名前の en は Title Case | 規則 02 の 5 節の表記の表（`JDG-1921`・`JDG-1925`・`JDG-1862`） | 前提。⚠️ 取り残し 5（`CR-770` X-2） |
| 仕様が名の正、綴りまで写す | 規則 03 の 1 節 | 表 T-064 の名は仕様とコードを同じ段で替える |
| MSPDI 由来の名と値は MSPDI のまま | `JDG-1192`・`W-8` | 外れた 2 つを戻す（`CR-769` X-4） |
| 「名は体を表す」—— 文字数をけちらず、機械的に長くもしない | `JDG-1784` | 名を長くするのは取り違えが起きる所だけ |
| 「JSON業界で標準ならOK」 | `JDG-1692` | JSON の鍵は JSON の API の慣習で比べる |

### 1.2 慣習の出どころ（本書で名指したもの）

| 略 | 出どころ | 何に使ったか |
|---|---|---|
| AIP-140・AIP-142 | Google API Improvement Proposals（google.aip.dev）の Field names・Time and duration | JSON の鍵: 真偽に `is` を付けない（AIP-140「Boolean fields should omit the prefix "is".」）、単位の略記、刻の名（AIP-142 の `create_time`）、整数の量に単位の接尾辞 |
| MCP | Model Context Protocol の仕様 2025-11-25（Tools の Tool Names） | 道具の名の字（英数字・`_`・`-`・`.`、例 `getUser`）。答えの `isError` は反対の例 |
| Google TS | Google TypeScript Style Guide | 頭字語は語として書く（`loadHttpUrl`）、CONSTANT_CASE の範囲 |
| .NET | .NET Framework Design Guidelines の名付けの節 | 略語を避ける、同じ概念に同じ名、肯定の句、真偽の `Is`／`Can`／`Has` |
| Swift | Swift API Design Guidelines | 副作用の無いものは名詞句、あるものは動詞句（`xOf` の流儀） |
| MSWSG | Microsoft Writing Style Guide | キーの書き方（`Ctrl+A`）、省略記号、知らせの文、略記 |
| WinUX・HIG | Windows のアプリの設計の指針、Apple Human Interface Guidelines | 答えのボタン（Yes／No を避ける）、省略記号、全画面の語 |
| CMOS | Chicago Manual of Style | 並びのカンマ、範囲のダッシュ |
| 業務の語 | Microsoft Project・Primavera P6・PMI の用語集 | Stop／Resume、Driving path、Callout |
| JSON の API | GitHub REST API（`created_at`）、Slack Web API（すべての答えに `ok`）、JSON-RPC 2.0（`error.message`）、Ruby on Rails（外部キー `<関連>_id`）、Office JavaScript API（`visible`・`visibility` の列挙） | 刻の鍵、成功の判定、拒否の文、外部キー、真偽と列挙 |
| 媒体型 | RFC 6838 の 3.4 | `x-` の型（`CR-771` X-5） |

---

## 2. 種ごとの所見

### 2.1 `GRS JSON` の鍵と値（本席が測った。`CR-769`）

測り方: `docs/spec/_source/grs-document.schema.json` を Python で歩き、`properties` の名 170 と `enum` の文字列 37 を集めた。`erd.json` の 19 の実体の列（名・型・MSPDI の要素）を並べた。

| # | 所見 | 今 | 慣習の形 | 出どころ | 数（触れる所は 6 節の数え方） | 影響 |
|---|---|---|---|---|---|---|
| J1 | 真偽の鍵が 3 通り。`W-10` を 19 のうち 2 しか守らない | `…Visible` 11・`…Fixed` 2・`themeMonochrome` ／ `isScheduleFilterApplied`・`isUnassignedHidden` ／ `showsTimeOfDay` | `主語 ＋ 形容詞`（`is` なし）にそろえ、`W-10` を直す | AIP-140、Office JS の `visible`。`…Visibility` は列挙の名（CSS の `visibility`、Office JS の `Worksheet.visibility`）で、真偽には使わない | 3 つの鍵: 仕様 6・`src` 175・試験 88。⚠️ `JDG-1784` が `showsTimeOfDay` を決めた | 高 |
| J2 | `TaskGroup` を指す鍵が `group` だけを言う | `groupId`・`anchorGroupId`・`topGroupId`・`bottomGroupId`・`scrollGroupId`・`pinnedGroupIds` | `taskGroupId` ほか | 外部キーは指す実体の名から（Rails、GRS 自身の `taskUid`・`resourceUid`）。同じ文書に `editGroup` がある | 仕様 53・`src` 1,602・試験 2,202。⚠️ `JDG-1488` が `groupId` を選んだ | 高 |
| J3 | `TaskGroup` の名だけが `label` | `TaskGroup.label`、命令 `setTaskGroupLabel` | `name` | ほかの 6 つの実体と MSPDI が `name`。画面は「Task Group Name」（`PR-18`） | 一般の語なので型で数える | 中 |
| J4 | px の鍵に単位が無い | `TaskGroup.minHeight`・`rulerHeight`・`rulerFont`・`taskGroupPanelWidth` | `minHeightPx`・`rulerHeightPx`・`rulerFontSizePx`・`taskGroupPanelWidthPx` | 木の多数（`strokeWidthPx`・`cornerRadiusPx`・`bodyOffsetPx`・`fadeInDays`・`minutesPerDay`）、AIP-142。`rulerFont` は書体でなく大きさ（CSS の `font-size`） | 仕様 31・`src` 217・試験 453 | 中 |
| J5 | 刻の鍵の `Utc` | `scheduleUpdatedUtc`・`settingsUpdatedUtc`・`fileSavedUtc`・`changedUtc`（対話の発話は既に `settledAt`） | `…At` | GitHub REST の `created_at`・`updated_at`、Prisma・Mongoose。帯は値（RFC 3339 の `Z`）が言う。AIP-142 は `…_time` | 仕様 9・`src` 48・試験 235 | 中 |
| J6 | MSPDI の語幹から外れた | `Project.created`（`CreationDate`）・`Dependency.lag`（`LinkLag`、単位 0.1 分） | `creationDate`・`linkLag` | `JDG-1192`・`W-8` | 一般の語なので型で数える | 中 |
| J7 | 略語 | `importSeq`・`lastSeenImportSeq` | `importSequence`・`lastSeenImportSequence` | .NET（略語を避ける）。AIP-140 の許す略語に `seq` は無い | 仕様 10・`src` 34・試験 31 | 低 |
| J8 | 日時の区間が `startDate`／`endDate` | `HighlightBox.startDate`・`endDate`（値は日時） | `start`・`finish` | GRS のほかの区間と MSPDI・PMBOK は start／finish | 一般の語なので型で数える | 低 |
| J9 | 列挙の値と `W-4` | 値 37 のうち kebab-case 0・camelCase 7、`src` の `kind: '…'` 277 のうち kebab 0・camel 186 | 値は変えず、`W-4` を camelCase に直す | TypeScript の判別の和は識別子の綴り。命令の種類は命令の名 | 表の 1 行 | 低 |
| J10 | 低い所見（変えない） | `fontScale`（値 `S`／`M`／`L` —— 倍率でなく段）、`scrollGroupOffset`・`scrollDayOffset`（0〜1 の比を Offset と呼ぶ）、`linkType` と `resourceKind` の `Type`／`Kind` の混ざり | — | — | — | 低 |

### 2.2 エージェント API と MCP（本席と 2.5 の体が測った。`CR-769` 2.6）

| # | 今 | 慣習の形 | 出どころ |
|---|---|---|---|
| A1 | 成功の判定が `ok`（`AgentExport`）と `accepted`（書き込み・発話・フォーカスの答え） | `ok` 1 つ | Slack Web API、Fetch の `Response.ok` |
| A2 | 拒否の文 `AgentRefusal.what` | `message` | `Error.message`、JSON-RPC 2.0 の `error.message` |
| A3 | `AgentWriteRequest.readStamp`（メンバ `readStamp` と同じ綴りの欄） | `expectedStamp` | 楽観的な排他の「期待する版」（HTTP の `If-Match`、Kubernetes の `resourceVersion`） |
| A4 | 真偽の答え `hasMovedSchedule`・`isScrolled`・`hasReplacedEarlierWatch` | J1 の答えに従う | J1 |
| A5 | 直す案の行の `fixType`（型 `DelayFixType`） | `fixKind` | GRS 自身の種類の名は `Kind` |
| A6 | MCP の道具の名 22 は camelCase（エージェント API のメンバ名そのもの） | 変えない | MCP の仕様は `getUser` を例に挙げる。見本の取次と仕様の別の例（`get_weather`）は snake_case —— メンバ名と 2 つの綴りを持つ害のほうが大きい |
| A7 | 22 のメンバの名 | 慣習どおり（`readX`・`exportX`・`applyCommands`・名詞の性質 `agentApiVersion`） | — |

### 2.3 文書の命令（表 T-108 の 88。`CR-769` 2.7）

- 文法は一貫している: 88 のすべてが動詞で始まる（`set` 56・`delete` 8・`create` 7・`reset` 3・`clear` 2 ほか）—— 表 T-108 の名を `tbl-glossary.md` から読んで数えた。
- 揺れ: 単位を持つ 1 列を書く命令 8 のうち 3 が単位を名に持ち（`setTaskFadeInDays`・`setTaskFadeOutDays`・`setCommentBoxBodyOffsetPx`）、5 が落とす（`setTaskVisualStrokeWidth`・`setCommentBoxStrokeWidth`・`setHighlightBoxStrokeWidth`・`setCommentBoxFillTransparency`・`setHighlightBoxFillTransparency`）。
- 対の揺れ: `createAssignment`（`CM-44`）の対が `unassignResource`（`CM-45`）。ほかの 7 つの実体は create／delete。
- 連れて変わる: `setShowsTimeOfDay`（J1）、`setTaskGroupLabel`（J3）。
- 触れ合う未答の問い: `CR-766` の問い 1（命令が運ぶ値の名 15 を列の名にそろえるか）。

### 2.4 画面の英語の語（読むだけの体の調べ、英語のまま。番号 D…。`CR-770`）

> 調べた範囲: `docs/spec/_source/display-words.json` の en の値 1,027 と、ヘルプとツールチップのキーの列。本席は設定の項目名（125 ＋ 2 ＝ 127）と知らせの句点（203 のうち 4）を測り直して一致を確かめた。 ⚠️ D6.1 の「127 of 131」は辞書の上の数である —— 画面に出るのは保存される見せ方の鍵の 34 行だけで、道具の定数の約 95 行は出ない（`SETTINGS_DEFAULTS` を読んだ）。画面の 19 行の扱いは `CR-770` の 2.2（`JDG-2241` が答えた）。

Read-only survey, worktree `claude/sleepy-hodgkin-ecd207` at 66d989c6, 2026-10-15.
Subject: every `en` value in `docs/spec/_source/display-words.json`, plus the key notation the
Help and the icon tooltips print (`src/adapter/screen-renderer/help-roster.json`, generated from
table T-036 of `docs/spec/01-04-requirements.md`).

#### D Method and base counts

- Walk: python json walk of `docs/spec/_source/display-words.json`, every dict holding a string `en`
  (`$comment` skipped). **1027 en values, 1025 non-empty** (2 blank: RS-68.nextStep and delayReportSummary[1], a spacer of two spaces).
- The generated copy `src/adapter/screen-renderer/display-words.json` holds the same 1027 en values
  (python: sorted multiset of en values equal -> True).
- 137 icon entries (IC-*), 131 settings rows (K-*), 160 reason values (80 RS text + 80 nextStep), 44 invariant values.
- Every "N=" below is the count of en values matching the stated regex in that walk, unless another method is named.
- Tests/spec dependency counts: `grep -rlF "<text>" tests | wc -l` (files) and `grep -roF "<text>" docs/spec | wc -l` (occurrences).
- 01-04-requirements.md skim: the spec is Japanese; the only English on-screen words outside the dictionary
  are the key names of table T-036 (Help + tooltips) and the date shapes of CU-3 / TM-*. Nothing else found
  (`grep -nE "\`en\` は"` -> 1 hit, TL-11 weekday words, already in `weekdays`).

Convention sources named below (abbreviations used in the findings):
- **MSWSG** Microsoft Writing Style Guide (learn.microsoft.com/style-guide): "ellipses", "keys and keyboard shortcuts",
  "error messages", "contractions", "e.g.", "gridlines", "double-click", "ID", "serial comma", "dashes".
- **WinUX** Windows desktop UX guidelines / Windows App design (menus: ellipsis rule; dialog buttons: specific verbs over Yes/No).
- **HIG** Apple Human Interface Guidelines (menus ellipsis, alerts: "avoid Yes and No", Enter/Exit Full Screen, checkbox capitalization).
- **M3** Google Material Design writing ("Writing / UX writing best practices").
- **CMOS** Chicago Manual of Style 17th (en dash for ranges 6.78, serial comma 6.19, em dash closed 6.85).
- **MSP** Microsoft Project desktop UI/field names; **P6** Oracle Primavera P6; **PMBOK** PMI Lexicon / PMBOK glossary;
  **XL** Excel; **GS** Google Sheets; **Figma**; **VSC** VS Code; **Office** PowerPoint/Word.

Impact: High = seen in normal daily use (header, palette, tooltips, every question); Medium = seen in a
specific surface regularly; Low = rare surface or edge message.
Risk: what else names the same word. ja values are separate cells, so no ja value changes with an en edit unless noted.

---

#### D1 Ellipsis on commands that need more input

Count: en values containing `...` or U+2026: **N=0** (regex `\.\.\.|…`). The project has no ellipsis anywhere.
WinUX/MSWSG/HIG rule: a command whose label opens a dialog/picker that needs more input before the action
happens takes an ellipsis; a command that only opens a window/panel to show something, or only asks a
confirmation, does not.

| # | Key | Current en | Conventional | Why | Impact | Risk |
|---|---|---|---|---|---|---|
| D1.1 | icons IC-1 label | Open | Open... | opens the OS file picker (WinUX/HIG; MSP/Word "Open...") | High (header) | label is in Title Case field list; tests: none found for "Open" alone (not grepped, too common) |
| D1.2 | icons IC-2 label; surfaces[2] heading | Save to File | Export... (or Save As...) | opens the format chooser first (FR-096); see 2.1 | High | tests: 1 file has "Save to File" |
| D1.3 | icons IC-41 label | Hide the Watermark (Password Required) | Watermark... (toggle; see 2.9) | hiding asks a password first | Low | none known |
| D1.4 | icons IC-158 label | Save a Backup and Fix | Save Copy and Fix... | "Save a backup under another name" = save picker | Low | none |
| D1.5 | icons IC-140 label | .md | Save as Markdown... | writes a file (picker) | Medium (report window) | none |
| D1.6 | icons IC-132 label | Holiday Settings | Working Time... | opens an editing surface with Apply (a dialog) | Medium | "Holiday Settings" 23 occ. in docs/spec, 4 test files, 7 src .ts (surface role names) |
| D1.7 | colorField custom | Custom color | More Colors... (Office) | opens a color picker | Low | none |

Correctly WITHOUT ellipsis (checked): IC-98 New (asks only a confirmation, WinUX), IC-139 GRS Reset ("asks first" = confirmation),
IC-162 Time Shift (amount typed beside it, then QN-14 confirmation), IC-22 Help, IC-62 Resource List, IC-117 Search (panels),
IC-17 Document Settings (opens a panel, not a modal), IC-71/72/73 (they act), IC-157 Overwrite and Fix.

#### D2 Standard command wording

| # | Key | Current en | Conventional | Source | Count (method) | Impact | Risk |
|---|---|---|---|---|---|---|---|
| D2.1 | confirmation[0..1] | Yes / No | specific verbs per question: "Delete" / "Cancel", "Overwrite" / "Cancel", "Close" / "Cancel", "Reset" / "Cancel", "Shift Dates" / "Cancel"; at least "Continue" / "Cancel" | WinUX dialog buttons; HIG Alerts "avoid Yes and No"; M3 dialogs | 2 values, shown under all 11 questions (`questions` N=11) | **High** | spec U-55 / NT-7 define "two answers"; "Yes" in 10 test files; a per-question verb needs a new dictionary shape |
| D2.2 | IC-2 label / surfaces[2] | Save to File | Export... (Ctrl+Shift+E is already SK-12 "open export", Figma uses Ctrl+Shift+E for Export) or Save As... | MSP/Word File > Save As; Figma Export | 2 | High | as 1.2 |
| D2.3 | defaultNames[0] | No name | Untitled | Word "Document1", Google Docs "Untitled document", Figma "Untitled", VSC "Untitled-1" | 1 | **High** (every new document title) | tests: 2 files have "No name"; searchPanel[1] "(No name)" is a different thing (unnamed task) - keep or "(Untitled)" |
| D2.4 | IC-10 label | Fit | Zoom to Fit (or Fit to Window) | Figma "Zoom to fit"; MSP "Entire Project"; Office "Fit to Window" | 1 | High | glossary/FR-055 call it "Fit"; label only |
| D2.5 | IC-21 label | Screen Language | Display Language | Windows "Windows display language"; Office "Display Language"; VSC "Configure Display Language" | 1 (+ QN-11 "such as the screen language") | Medium | none |
| D2.6 | IC-11 hint | Enter or leave full screen | Enter or exit full screen | HIG "Enter Full Screen / Exit Full Screen"; Chrome "Exit full screen" | 1 | Medium | none |
| D2.7 | IC-95 / IC-96 / IC-97 labels | Take from the Opened File / Keep Both / Stop the Import | Use Opened File (or Replace) / Keep Both / Cancel Import | VSC merge "Accept Incoming / Accept Both"; macOS copy dialog "Replace / Keep Both / Stop"; WinUX "Cancel" | 3 | Medium (every merge with duplicates) | labels with articles, see 2.11 |
| D2.8 | IC-162 label; QN-14 | Time Shift | Shift Dates (or Move Project) | MSP Project tab "Move Project" does exactly this | 2 | Low | none |
| D2.9 | IC-41 label | Hide the Watermark (Password Required) | Watermark (toggle noun like IC-42..43) | WinUX toggle buttons are named by the thing; state is shown by the button | 1 | Low | none |
| D2.10 | IC-139 label | GRS Reset | Reset GRS... is wrong (confirmation, no ellipsis): "Reset GRS" | verb-first commands: WinUX, M3, Chrome "Reset settings" | 1 | Low | none |
| D2.11 | icon labels with articles | Draw a Dependency Line, Hide the Watermark (...), Save a Backup and Fix, Take from the Opened File, Stop the Import | drop articles: "Link Tasks" (MSP), "Save Backup and Fix", "Cancel Import" | WinUX "labels: omit articles"; MSWSG concise UI text | N=5 (regex `\b(a|an|the)\b` on icons.*.label) | Medium | label field is Title Case-checked; check 32 tolerates articles |
| D2.12 | IC-61 label | Draw a Dependency Line | Link Tasks (or Dependency Line, a noun like its palette siblings) | MSP "Link the Selected Tasks" / "Link Tasks"; siblings IC-23.. are nouns | 1 | Medium | AR-4 "Dependency Line" stays |
| D2.13 | IC-81, IC-141 labels | Show Dependency Lines / Show Parent Tasks | Dependency Lines / Parent Tasks (sibling toggles IC-39..43, IC-79..80 have no "Show") | consistency; WinUX toggle naming | 2 of the 13 palette display toggles (method: labels starting "Show", N=2) | Low | none |
| D2.14 | IC-22 hint | Open the list of shortcut keys and icons | Show keyboard shortcuts and icons | MSWSG "keyboard shortcut", not "shortcut key" | N=1 (regex `shortcut key`) | Medium | none |
| D2.15 | IC-163 label | + | Add (IC-135 in the same surface is "Add") | consistency; WinUX icon-only buttons still need an accessible name | 1 | Low | none |
| D2.16 | IC-16 label | Light / Dark | Theme (or Dark Mode) ; if kept, "Light/Dark" (closed slash) | CMOS 6.106 slash between single words is closed; Windows "Choose your mode" | 1 | Medium | none |
| D2.17 | IC-104 / IC-105 | Smaller / Larger | Decrease Size / Increase Size (or Zoom Out / Zoom In for display scale) | Office "Decrease/Increase Font Size"; browser "Zoom in/out" | 2 | Medium | none |
| D2.18 | delayFixes[2],[5],[1] | Automatic / By Hand / By hand {k} / {m} | Automatic / Manual / Manual {k} of {m} | MSP "Auto Scheduled / Manually Scheduled"; standard pair Automatic/Manual | N=5 (regex `[Bb]y [Hh]and|[Mm]anual`, incl. IC-159/160 hints, VC-14) | Low | none |
| D2.19 | IC-115 label | Schedule Image-to-JSON Prompt | Copy Image-to-JSON Prompt | it is a copy command (verb-first, WinUX/M3) | 1 | Low | none |
| D2.20 | shortcuts SK-19 | Commit the edit in place | Confirm the edit (or Finish editing) | "commit" is developer jargon; MSWSG plain words | 1 | Medium (Help) | none |
| D2.21 | MK-13 press | Double click | Double-click | MSWSG "double-click" (hyphenated) | N=1 | Medium (Help) | none |
| D2.22 | MK-6/7/8/11 press | Plain left drag / Plain left click / Left drag on an item | Drag / Click / Drag an item | MSWSG: "click", "drag" (left is implied); "right-click" only when right | 4 | Medium (Help) | none |
| D2.23 | IC-117 label | Search | (keep) or Find | MS Office/XL "Find" with Ctrl+F; VSC/GS "Search"/"Find" both seen | 1 | - | conventional enough; listed for coverage |

Note on Title Case itself (settled, not a finding): current MSWSG and M3 prefer sentence case for all UI
labels; HIG and classic WinUX/Office use Title Case for buttons/menus/titles. Rule 02 section 5 follows the HIG/Office line.

#### D3 Tooltip / hint style (icons.*.hint, 137 values)

Measured: hints ending with "." N=0; hints with ";" N=59; first word is an imperative verb in 133 of 137
(python Counter of first word; non-verbs: "This" x2 IC-67/68, "The" IC-54, "Marks" IC-102).

| # | Pattern | Examples | Conventional | Source | Count | Impact | Risk |
|---|---|---|---|---|---|---|---|
| D3.1 | "Arm" as a UI verb | IC-23 "Arm the rectangle; drag on empty space to create a rectangle task"; IC-54 "Armed Glyph"; palette group "Armed Shape"; RS-54 "The arming is still live" | "Rectangle: drag on empty space to draw a rectangle task" / "Draw a rectangle task (drag on empty space)"; "Armed Glyph" -> "Current Tool"; "Armed Shape" -> "Current Tool" | Figma/PowerPoint tool tooltips name the tool and the gesture ("Rectangle (R)"); "arm" is not in MSWSG/HIG vocabulary | N=30 (regex `\b[Aa]rm(ed|ing)?\b`), 23 of them first word of a hint | **High** (every palette hover) | glossary uses "arm" (構える) concept across spec; AR-* "arms" section name is internal only |
| D3.2 | Three toggle-hint styles | "Show or hide X" (N=6, regex `^Show or hide`); "Show X; press again to hide it" (N=20 hints, regex `press again` on icons); "Turn X on or off" (IC-143); "Enable X; press again to disable it" (IC-20); "Enter or leave" (IC-11) | one style: "Show or hide X" (MSP/Office ribbon toggles: "Show/hide ...") or state-neutral noun description | MSWSG tooltips: short, consistent; Office ribbon | 29 toggle hints in 5 styles | High | none |
| D3.3 | "press" for click | 27 "press again" (regex `press again`, all fields) | "click again" or drop it (toggle state is visible) | MSWSG: "select" (or "click") for buttons; "press" is for keys | N=27 | Medium | none |
| D3.4 | Internal jargon "surface", "glyph" | IC-52 "Close the open surface"; IC-132 "Open the surface that edits..."; IC-50 "milestone glyphs"; IC-54 "The glyph now armed" | "window"/"panel"/"dialog"; "shapes"/"icons" | MSWSG: avoid internal terms | surface N=2, glyph N=2 (+ label "Armed Glyph") | Medium | none |
| D3.5 | Two-sentence hints without final period | IC-4 "Show or hide the baseline. With no baseline yet, choose its file"; IC-161 "...for display. The schedule date-time values are not rewritten" | end with a period when the tooltip holds a sentence (or make it one fragment) | MSWSG "punctuation in UI": tooltips that are complete sentences end with a period | 2 hints; 15 values overall (regex `[.?] [A-Z]` and no final `.`/`?`) | Medium | none |
| D3.6 | Word order / redundancy | IC-12..15 "Zoom the time axis (horizontal) out", "Zoom the vertical axis (vertical) out" | "Zoom out on the time axis", "Zoom out vertically" | plain English, MSWSG | 4 | Medium | none |
| D3.7 | Non-imperative hints | IC-67 "This resource is selected; press to deselect it", IC-54 "The glyph now armed", IC-102 "Marks turning the mouse wheel" | fine for state indicators; IC-54 -> "Current tool. Press Esc to clear it." | MSWSG | 4 | Low | none |
| D3.8 | Grammar slip | IC-87 hint "Arm meeting people milestone" (article missing; siblings say "Arm a ...") | "...a meeting milestone" | - | 1 | Low | none |
| D3.9 | Capitalized named things in hints, inconsistently | "Show the Progress Line", "Arm a Comment Box" vs "Show or hide the baseline", "Show the parent tasks", "Place ... the status date; the Status Line" | either always cap the UI-named thing (MSWSG allows matching the UI label) or never | MSWSG "capitalization: UI elements" | not counted exactly (mixed in ~25 hints) | Low | glossary names are Title Case in spec |

#### D4 Errors, notices, questions (reasons 160, invariants 44, questions 11)

Measured: "Please" N=0; "!" N=0; "Error" N=0 (good, MSWSG/M3). Passive "... could not be ..., so it was not made" family common.

| # | Pattern | Examples / keys | Conventional | Source | Count | Impact | Risk |
|---|---|---|---|---|---|---|---|
| D4.1 | Final period inconsistent | 199 reason/invariant values end without "." (regex `[^.]$`), 4 end with "." (RS-65 text+next, RS-66 text+next); propertyField[12], rowMinHeightField[2], delayReportReasons[10..11] also end with "." | full sentences in messages end with a period (all of them) | MSWSG "error messages" & "periods"; HIG alerts | 4 vs 199 in reasons/invariants; 9 en values end with "." project-wide | High (every notice) | ja side separate; spec T-233 holds texts (generated from notice-reasons.json?) - edit at source |
| D4.2 | Multi-sentence questions/messages with no closing period | QN-3, QN-4, QN-5, QN-8, QN-9, QN-11, QN-14; RS-48, RS-52, RS-89, RS-90, RS-53 next; delayFixes[11] "Fixed {n}. Undo reverts them in one step" | close every sentence | MSWSG; HIG | N=15 (regex `[.?] [A-Z]` with no final `.?`) | High | none |
| D4.3 | "cannot" never contracted | 44 values use "cannot", 0 use "can't" (regex `\bcannot\b` / `n't\b`) | "can't", "doesn't" in UI messages | MSWSG "use contractions"; M3 conversational tone | 44 vs 0 | Medium (style choice; consistent now) | optional |
| D4.4 | "Try once more" | RS-6, RS-10, RS-15, RS-23, RS-74, RS-75, RS-76, RS-82, RS-83 | "Try again" | MSWSG error messages; WinUX "Try again" button wording | N=9 (regex `once more`) vs "try again" N=2 | Medium | none |
| D4.5 | "write it out" for save/export | RS-2, RS-3, RS-5, RS-25, RS-67, RS-76 | "save it" / "export it"; "Open the file as it was exported" | MSWSG: Save/Export are the standard verbs | N=6 (regex `writ(e|ten) (it )?out`) | Medium | none |
| D4.6 | "Go on" | QN-8 "Go on? This makes a change that undo cannot bring back"; RS-48 "If you go on" | "Continue? This can't be undone." | WinUX/HIG standard "This action can't be undone" | 2 | High (QN-8 every irreversible action) | none |
| D4.7 | QN-9 is not a question | "Hiding the watermark needs the watermark unlock password. ..." under Yes/No | phrase as a question or use a password dialog with OK/Cancel | HIG alerts; WinUX | 1 | Low | none |
| D4.8 | Wordy passive refusals | RS-6/RS-8 "The change could not be accepted just now, so it was not made" | "Can't make this change right now." | MSWSG "be brief; active voice" | family "so it was not made"/"so the change was not made" ~8 (not exactly counted) | Medium | none |
| D4.9 | Jargon in messages | RS-25 "match the settled shape"; differenceReview "the original WBS ledger"; RS-23 "watchers"; IV-23 "appearance record" | "isn't in the expected format"; "the original WBS"; "connected apps" | MSWSG: user words, not internal model words | ~5 | Low | spec terms |

#### D5 Domain terms vs scheduling convention

| # | On-screen term (key) | Standard term (source) | Verdict |
|---|---|---|---|
| D5.1 | Baseline (IC-4, IC-73) | Baseline (MSP, P6, PMBOK) | conventional |
| D5.2 | Planned Start/Finish, Actual Start/Finish, Actual Duration (PR-3/47/4/6/5, SQ-3/4/12/13) | same (P6 "Planned Start", MSP "Actual Start") | conventional |
| D5.3 | % Complete (PR-9) vs "Percent Complete Label" (IC-80) and "percent complete" (RS-52) | MSP field "% Complete"; prose "percent complete" | conventional; label IC-80 could be "% Complete Label" for one spelling. Low |
| D5.4 | Milestone, Deadline, Lag, Predecessor/Successor, Status Date, Progress Line (PR-10, PR-42..44, IC-44, IC-39) | identical in MSP; PMBOK | conventional |
| D5.5 | Predecessor Tasks / Successor Tasks (PR-37/38) | MSP columns "Predecessors" / "Successors" | change to the MSP column words. Low |
| D5.6 | Resume (PR-7) + "Paused, no resume date" (PS-3/4), "Clear the Pause Values" (delayFixes[16]), "stop or resume date" (VC-7) | MSP task fields **Stop** and **Resume** | "Resume" is standard; **mixing Pause and Stop** is not: N=3 "Paus*" vs 1 "stop" (regexes `\b[Pp]aus`, `\bstop\b` excl. non-field hits). Pick one; MSP pair is Stop/Resume. Medium |
| D5.7 | Parent Task (PR-15, IC-141/142, AR-7) vs "No summary task holds this task" (VS-2) | MSP "summary task" (outline parent); GanttProject "supertask" | "parent task" is widely understood (Smartsheet, Asana "parent task"), keep; **VS-2 uses a second term** - "No parent task holds this task". N=10 "parent task" vs 1 "summary task". Low |
| D5.8 | Assignee (PR-16, DT-2), Assignees (SQ-2), Resource (RQ-2), Resource List | MSP "Resource Names"/"Resources"; Asana/Jira "Assignee" | both exist in the industry; GRS uses Assignee on tasks and Resource in the list. Acceptable; SQ-2 plural vs DT-2 singular is inconsistent. Low |
| D5.9 | Bottleneck / Bottleneck path (DG-2/3, delayReportReasons[2]) | MSP Task Path "Driving Predecessors"; P6 "Driving path" / "Longest Path"; PMBOK "critical path" | coined; standard exists -> "Driving task" / "Driving path". N=3 (regex `[Bb]ottleneck`). Medium (report) |
| D5.10 | Holiday Settings (IC-132, surface) with Working Weekdays / Working Hours / Exception Days / Day Off | MSP "Change Working Time" dialog: "Exceptions", "Work Weeks", "Working times", "Nonworking" | "Exception Days" ok; surface name understates (it edits weekdays and hours too) -> "Working Time". Also "Working Hours" (holidaySettings[2]) vs "working-time range" (IC-163/164, RS-89) - one term. Medium |
| D5.11 | Task Group (PR-18, many) | no single standard; Office Timeline/Lucidchart "Swimlane", MSP has no row-of-many-bars concept | coined but justified (no exact standard); "Swimlane" is the closest common word. Risk: "Task Group" 182 occ. in docs/spec + ERD entity TaskGroup. Keep |
| D5.12 | Comment Box (IC-35, AR-5, IC-119) | MSP Timeline "Callout"; PowerPoint "Text Box"/"Callout" | standard exists -> "Text Box" or "Callout". Medium. Risk: glossary 7 occ. in docs/spec |
| D5.13 | Highlight Box (IC-36, AR-6) | no fixed standard (MSP "shading"/bar highlight; Office Timeline "Shape") | justified; keep |
| D5.14 | Endpoint Span (IC-26) | none | justified (shape name) |
| D5.15 | Fade In/Out Days (PR-14) | none in MSP/P6 | justified; keep |
| D5.16 | Delay Diagnostics (IC-107, surface) | none exact (MSP "Task Path", "Task Inspector" is the closest: it explains why a task is scheduled where it is) | justified as a product feature name; "Task Inspector" is the MSP analogue. Keep |
| D5.17 | Fix Proposals / Fix Log (IC-155/156) | VSC "Quick Fix", Office "Suggestions"; GRS itself writes "Suggested" (delayFixes[6]) | -> "Suggested Fixes" / "Fix History". Low |
| D5.18 | Dialogue Field (IC-18, surface) | VSC "Chat", Office "Copilot chat pane"; "field" means one input box in MSWSG | -> "Chat" / "Chat Panel". Medium. Risk: 14 occ. in docs/spec, 13 test files, 6 src .ts (role ids) |
| D5.19 | Guide Cursor / Crosshair / Single Vertical / Dual Cursor (IC-45..48) | Figma/CAD "crosshair"; "ruler"/"measure" for two lines | "Single Vertical" -> "Vertical Line"; "Dual Cursor" acceptable (oscilloscope convention). Low |
| D5.20 | Progress Marker, Resume Icon, Status Line (IC-40, IC-44) | MSP "status date" line; no standard for marker | Status Line acceptable (MSP calls it the status date gridline); others justified. Low |
| D5.21 | Fit span / Fit Span (K-141, K-142, fitSpanField[2], exportChooser[0]) | none | coined, acceptable; **capitalization differs** for one term: N=4 (regex `[Ff]it [Ss]pan`), 3 "Fit span" vs 1 "Fit Span". Low |
| D5.22 | Schedule Filter (IC-143, searchPanel) | XL/GS "Filter" (rows), Smartsheet "Filter" applies to the sheet | justified (it filters the chart, not the table). Keep |
| D5.23 | Path from Top (SQ-6) | MSP "Outline Number"/WBS; file explorers "Path" | -> "Outline Path" or "WBS Path". Low |
| D5.24 | Task (Milestone) (SQ-1, DT-4) | MSP "Task Name"; "Name" | -> "Task or Milestone" or "Name". Low |
| D5.25 | Project Name (openChooser[1]) vs Document Name (delayReportMarkdown[0]) vs "Edit the document name" (SK-9) | MSP "Project Title" / file name | two words for one value. Low |
| D5.26 | Dummy, Carry | appear only inside settings labels (`dummyOpacity`, `carryMaxDepth`, see 6.1) | no on-screen use of either as a term: regex `(?i)dummy|carry` outside settings hits 3 values (IC-82, IC-106, RS-72), all the plain verb "carry" |

#### D6 Abbreviations, acronyms, units

| # | Key | Current en | Conventional | Source | Count | Impact | Risk |
|---|---|---|---|---|---|---|---|
| D6.1 | settings K-* labels (Document Settings panel, `settingsFields` in properties-panel.ts lists every SETTINGS_DEFAULTS key read-only plus about 15 edited fields) | camelCase identifiers: `pxPerDayAt1x`, `taskGroupPanelWidth`, `parentProgressToleranceDays`, `showsTimeOfDay`, `viewTimeZone`, `dummyOpacity` ... | words: "Pixels per Day at 100%", "Task Group Panel Width", "Parent Progress Tolerance (days)", "Show Time of Day" | MSWSG: never show code identifiers; VSC Settings UI turns `editor.fontSize` into "Editor: Font Size" | **127 of 131** settings labels are camelCase (regex `^[a-z][A-Za-z0-9.]*([A-Z]...)+`); the other 4 are mixed: "theme color", "Fit span", "Fix the fit span", "Fix the task group panel width" | **High** for the edited fields, Medium for the read-only list | rule 02 s.5 note says the settings item name en (the identifier) is not changed - so this needs an owner ruling; `pxPerDayAt1x` etc. appear in 36 test files (as keys); T-104 English name column is the origin |
| D6.2 | settings K-60 | theme color | Theme Color (if the K-* labels become words) | Title Case for names (rule 02 s.5) | 1 | Low | settings.label not in the check-32 field list |
| D6.3 | exportFormats IO-1 | MSPDI XML | Microsoft Project XML (or "MS Project XML (.xml)") | MSP Save As type "XML Format (*.xml)"; users do not know "MSPDI" | 1 (+ RS-11) | Medium | memory note: MS Project/MSPDI naming is the allowed exception; MSPDI element names untouched |
| D6.4 | RS-57 | "same id", "a different id" vs IV-1 "share one ID" | ID | MSWSG "ID" (all caps) | lowercase N=2 vs ID N=2 | Low | none |
| D6.5 | PR-20, rowMinHeightField[0], scaleEcho | Min Height, Set a Min Height, (max), (min) | Minimum Height; (maximum)/(minimum) or keep (max)/(min) in tight space | MSWSG: spell out unless space-limited | N=4 (regex `\b(Min|Max|min|max)\b`) | Low | none |
| D6.6 | day unit spelled 3 ways | RS-89 "1d" (no space), propertyField[7] "{lag} d" (space), dualCursorReadout "{d}d" | MSP shows "2d"/"2 days"; pick one: "{n}d" with no space (MSP) or "{n} days" | MSP duration display; MSWSG units: space between number and unit word | N=5 (regex `\dd\b|\} ?d\b|\{d\}d`) | Low | none |
| D6.7 | dualCursorReadout[3..4] | {y}y {m}m {d}d | {y} yr {m} mo {d} d (m reads as minutes) | MSWSG abbreviations "mo", "yr"; ISO 8601 uses M for months only inside P..T | 2 | Medium (Dual Cursor readout) | none |
| D6.8 | GRS vs GoodRelax Scheduler | "GRS" in 10 values (regex `\bGRS\b`); IC-115 hint spells "GoodRelax Scheduler" | spell the product name in user text, acronym only where defined | MSWSG "acronyms: spell out on first use" | 10 vs 1 | Low | brand decision |
| D6.9 | Conventional: UID (PR-34; MSP field "Unique ID" - acceptable short form), JSON, XML, PNG, SVG, HTML, UTC, PC, AI, WBS, MB, px, % | - | - | - | - | - | - |

#### D7 Keyboard and mouse notation

| # | Where | Current en | Conventional | Source | Count | Impact | Risk |
|---|---|---|---|---|---|---|---|
| D7.1 | Help key column and icon tooltips (help-roster.json `keys`, joined in tooltips.ts) | `Ctrl ＋ A`, `Ctrl ＋ Shift ＋ E` (FULL-WIDTH plus U+FF0B with spaces) | `Ctrl+A`, `Ctrl+Shift+E` | MSWSG "keys and keyboard shortcuts" (plus, no spaces); Google/M3 same | 19 of 28 key strings (python: count of U+FF0B in help-roster keys) | **High** (every tooltip that has a key + Help) | **FR-036 (MUST, CR-425) requires the full-width plus and slash**, and tools/generate_help_roster.py stops on `Ctrl+A`; a language-dependent join needs a spec change |
| D7.2 | same; tooltips.ts ASSIGNMENT_SEPARATOR; assignments MK-7 press | `Delete ／ Backspace`, `Ctrl ＋ Y ／ Ctrl ＋ Shift ＋ Z`, "Ctrl + drag ／ middle-button drag" (FULL-WIDTH slash U+FF0F) | "Delete or Backspace", "Ctrl+Y or Ctrl+Shift+Z" | MSWSG: use "or" between alternatives | 3 key strings + 1 dictionary value (regex `[＀-￯]` N=1) + every tooltip that joins key and press | High | same FR-036 rule |
| D7.3 | assignments MK-2..5, MK-7, MK-15..17 press | "Ctrl + {IC-102}", "Ctrl + Shift + {IC-102}" (ASCII plus WITH spaces) | "Ctrl+wheel", "Ctrl+drag" | MSWSG; and consistency with 7.1 | 8 values (substring ` + ` in assignments.*.press) | Medium | same table family |
| D7.4 | QN-11 text | "Ctrl + F5 : reload", "F12 (developer tools) → Application ..." | "Ctrl+F5: Reload" (no space before colon) | MSWSG; English punctuation (no space before colon) | 1 | Low | none |
| D7.5 | SK-16/16a/22 keys | `Shift ＋ +`, `Alt ＋ +`, `Ctrl ＋ Shift ＋ +` | "Shift+Plus sign (+)" or "Shift+=" | MSWSG: spell "Plus sign" when the key is + | 4 key strings end in "+" (python) | Low | FR-036 |
| D7.6 | Mac | Help says Ctrl only; input-command-translator maps a `meta` key | "Ctrl (Cmd on Mac)" or show ⌘ on macOS | HIG keyboard shortcuts | - | Low (if Mac users exist) | behaviour, not wording |
| D7.7 | Conventional: Esc (MSWSG writes "Esc"), Enter, Delete, Backspace, F1/F2/F11, Shift, Alt | - | - | - | - | - | - |

#### D8 Other unconventional items

| # | Key | Current en | Conventional | Source | Count | Impact | Risk |
|---|---|---|---|---|---|---|---|
| D8.1 | British idiom/spelling (violates rule 02 s.5 row "new English is American"; not machine-stopped) | IV-16, IV-19 (text+next), IV-22 "the wrong way round"; RS-26 "start-up" (NT-4 already says "startup") | "reversed" / "the wrong way around"; "startup" | Merriam-Webster; MSWSG "startup (n.)" | N=5 (regex `way round|start-up|...`) | Low | none |
| D8.2 | Missing serial comma | IC-44 "Place, move or clear"; IC-127 "title bar, table and search box (cycles through 9, 10 and 12 px)"; IC-132 "...the exception days and the week start"; RS-11 "(GRS JSON, MSPDI XML or a GRS .html)"; RS-82 "(a task, task group or assignee)" | "Place, move, or clear" etc. | MSWSG "serial comma: use it"; CMOS 6.19 | 5 (regex for "x, y and/or z" without ", and"; 1 false hit removed by hand) | Low | none |
| D8.3 | Ranges with spaced hyphen | fitSpanField[1] "{start} - {finish}", exportChooser[0], delayReportReasons[10..11] "({leftmost} - {rightmost})" | en dash, closed: "{start}–{finish}" | CMOS 6.78; MSWSG "en dash for ranges" | N=4 (regex ` - `) | Low | none |
| D8.4 | Arrows: ASCII and Unicode for the same pattern | timeZoneField[2] "{before} -> {after}" vs timeZoneField[8] "{before} → {after}" | one form, "→" | consistency | 1 vs 3 | Low | check which one is live |
| D8.5 | Dashes | MK-13 " -- " (double hyphen as dash); delayFixes[12] "{row} — {reason}" (spaced em dash) | closed em dash "—" (CMOS 6.85) or colon; MSWSG allows no spaces | CMOS/MSWSG | N=2 | Low | none |
| D8.6 | "e.g." | IC-165 "(e.g. 8:00; ...)", timeZoneField[4] "h:mm (e.g. -16:00)" | "for example" | MSWSG "e.g.: don't use" | N=2 | Low | none |
| D8.7 | Japanese footnote mark | helpNotes IC-20 "(see note *1)", helpFootnotes "*1 Get the bundle..."; QN-11 "* If resetting..." | superscript 1 / "Note 1" / "[1]"; plain "If resetting..." | CMOS 14 notes; English UI rarely uses "*1" (it mirrors ※1) | 3 | Low | none |
| D8.8 | Mid-sentence capitals for common nouns | MK-6/8/11/15/16 "the Selection", "that Item" | "the selection", "that item" | sentence case (rule 02 s.5 values are Sentence case; MSWSG) | N=6 (regex `(the|a|that|its) (Selection|Item)`) | Medium (Help) | glossary names "Selection"/"Item" in spec |
| D8.9 | Same panel named three ways | "Properties Panel" (IC-17, MK-13), "properties panel" (RS-62), "property panel" (delayReportReasons[10..11]) | "Properties Panel" everywhere | consistency | N=5 (regex `[Pp]ropert(y|ies) [Pp]anel`), 3 spellings | Low | none |
| D8.10 | Same label, different command | "Expand One Level" = IC-90 (expand children of one group) and IC-92 (show only the top level, collapse below = MSP "Outline > Level 1") | IC-92 -> "Show Top Level Only" | consistency | 4 labels duplicated (Counter over icons labels: Font Size, Minimize, Expand One Level, Delete); only Expand One Level differs in meaning | Low | none |
| D8.11 | Inconsistent capitalization of checkbox labels | rowMinHeightField[0] "Set a Min Height" (Title Case) vs K-143 "Fix the task group panel width" / K-142 "Fix the fit span" (sentence case), all three are checkboxes | one style; HIG and Windows Fluent use sentence case for checkbox labels | HIG "checkboxes"; WinUX | 3 | Low | rowMinHeightField/enable is in the Title Case check list |
| D8.12 | Verb form drift in twin strings | delayReportReasons[0] "Delaying the whole schedule by {days}..." vs [1] "Delays the whole schedule by {amount}..." | same verb form in both | consistency | 2 | Low | none |
| D8.13 | Dates shown as yyyy/mm/dd (Wed) and month tier as a number | CU-3 "2026/04/01 (Wed)" (spec 01-04 line 6475), TM-2 month tier prints `m` | ISO "2026-04-01 (Wed)" or locale "Apr 1, 2026"; month tier "Apr" | MSWSG "dates"; MSP/XL timescale "Apr" | spec-defined, not in dictionary | Medium | spec MUST (CU-3, TM-*) |
| D8.14 | notices.*.manner (10 values, "When input is not accepted" ...) | not drawn: `grep -rn mannerText src/framework` -> 0 hits; they read as spec descriptions | no action unless they become visible | - | 10 | none | - |

---

#### D Checked and found CONVENTIONAL (coverage)

- American spelling: color/gray/center/behavior families: 0 British forms remain except 8.1 (check 32 covers the families).
- No "Please", no "!", no "Error:" prefix (N=0 each).
- Standard verbs already right: New, Open (needs "..."), Copy, Undo, Redo, Delete, Select All, Deselect All, Expand All,
  Collapse All, Sort Ascending/Descending, Clear Filters, Apply, Cancel, OK (noticeDismiss), Close, Minimize/Maximize/Restore,
  Previous/Next, Pin, Replace, Merge, Keep Both, Full Screen (label), Help, Search.
- Help headings, surface headings, column headings: Title Case and noun phrases (Basic Operations, App Header, Visibility, Status, Reason...).
- Time zone list matches the Windows time zone list form "(UTC+09:00) Tokyo", "(UTC) Coordinated Universal Time".
- Weekdays Sun..Sat, colorNames/themeHues in sentence case values ("Dark gray", "Blue-green").
- planActualStates "Not started / In progress / Finished" (Asana/MSP-like), delayFixes "Mark as Started/Finished" (MSP "Mark on Track" style).
- Curly quotes in propertyField[1] "Add “{name}”" (MSWSG).
- "(Blanks)" in the filter list matches Excel exactly; "(Unassigned)" fine; "None (Default)".
- Units: "MB", "px", "%", "Fill Transparency (%)" (Office "Transparency").
- Scheduling core vocabulary: Baseline, Planned/Actual Start/Finish, Actual Duration, % Complete, Deadline, Lag, Predecessor,
  Successor, Milestone, Status Date, Progress Line, Resume, Late, Notes, Type (FS/SF/FF/SS abbreviations as MSP).
- Ellipsis correctly absent on confirmation-only commands (see section 1).

#### D Ranked shortlist (highest user impact first)

1. 7.1/7.2 full-width "＋" and "／" in every key shortcut of the English Help and tooltips (19 + 3 strings) - needs an FR-036 change.
2. 6.1 camelCase settings identifiers as labels in Document Settings (127 of 131) - needs an owner ruling against rule 02 s.5's note.
3. 2.1 Yes/No buttons under all 11 questions - use verbs.
4. 3.1 "Arm" vocabulary in 30 values (23 palette hints).
5. 4.1/4.2 end punctuation: 4 of 203 messages have a period, 15 multi-sentence values lack the final one.
6. 1.x missing ellipsis (0 in the dictionary): Open..., Export..., Working Time..., Save as Markdown...
7. 2.3 "No name" -> "Untitled"; 2.2 "Save to File" -> "Export..."; 2.4 "Fit" -> "Zoom to Fit".
8. 3.2 five toggle-hint styles over 29 toggles; 3.3 "press" for click (27).
9. 4.4-4.6 "Try once more" (9), "write it out" (6), "Go on?" (2).
10. Domain: Pause vs Stop/Resume (5.6), Bottleneck -> Driving (5.9), Dialogue Field -> Chat (5.18), Comment Box -> Text Box/Callout (5.12).

### 2.5 コードの公開名（読むだけの体の調べ、英語のまま。番号 S…。`CR-771`、一部は `CR-769`）

> 調べた範囲: `src` の公開の宣言 1,790、公開の型の欄 2,106、表 T-064 の 473 の名。⚠️ 体は S5 で「`CR-708` が `scrollGroupId` を変えなかったので `groupId` を報告しない」と書いた —— 本席は `JDG-2241` の下で改めて問う（`CR-769` 問い 2）。SF4 の案 `finishDate` は、本席の案 `start`／`finish`（値が日時のため）に替えた。

Read-only survey, worktree at 66d989c6 (branch claude/sleepy-hodgkin-ecd207). No repository file was changed.
The scratch scripts that counted lived outside the repository and are not kept; the method of every count is written beside it.

#### S0 Inventory and method

- **Extraction** -- TypeScript 7.0.2 in the parent `node_modules` is the native compiler with no JS API, so
  extraction is regex-based: comments, string and template text, and regex literals are stripped
  (a stripping pass), then `^export (declare|default|async|abstract)? (function|const|let|var|class|interface|type|enum) Name`
  is matched over `git ls-files 'src/*.ts'`. Members are taken from the top-level `{...}` body of every exported
  `interface`, `class` and `type X = {...}`.
- **Coverage** -- the same regex over the raw text finds 1790 declarations; the stripped scan finds all 1790 (0 missed).
- **Inventory** -- 187 `.ts` files under src/, 186 of them export. 1790 exported declarations (1772 distinct names):
  864 function, 396 interface, 349 type, 179 const, 2 class, 0 enum. There are also 547 re-export entries
  (`export {..}` / `export type {..}`), and 2106 member names (1295 distinct) in 408 exported object types.
- **Generated code** -- `*.generated.ts` does not exist. Generated blocks (`<generated` markers in 20 files, from
  erd.json / settings.json and others) are **included**, because they are what GRS JSON integrators see.
- **Spec lists**
  - T-064 = `docs/spec/_source/published-entries.json`: 480 members, 473 distinct names.
  - T-107 (AM rows, 22) and T-108 (CM rows, 88) are parsed from `docs/spec/_assets/tbl-glossary.md` (`^| AM-n |` / `^| CM-n |`).
  - The GRS JSON column names come from `docs/spec/_source/erd.json` (19 entities) and
    `docs/spec/_source/grs-document.schema.json` (34 documentSettings keys).
- **"Places touched"** = lines matched by `git grep -wc <name>`, summed per area: src / tests / tools / docs/spec.
  `src` includes JSON under src/. A line count is a lower bound on the edits needed.
- **Risk scale** (from the brief)
  - **Low** -- internal only.
  - **Medium** -- a spec name (T-064 / glossary).
  - **High** -- crosses the Agent API / MCP (T-107 / T-108 command kinds / MCP payloads) or GRS JSON.

#### S1 Findings ranked by impact on integrators

| # | Finding | Risk | Spec name? | Recommendation (short) |
|---|---|---|---|---|
| SF1 | Agent API reply shapes: `ok` vs `accepted`; `readStamp` as a data field; `what`; `Utterance` vs `DialogueMessage` | **High** (MCP payload) | **No** -- not in T-064/T-107/spec | Name them in the spec now, then fix the spelling |
| SF2 | Command kinds drop the unit their field carries (`setXStrokeWidth` -> `strokeWidthPx`) | **High** (T-108, Agent API) | Yes (CM) | One rule: setter = `set` + Entity + exact field name |
| SF3 | `Kind` vs `Type` suffix in GRS JSON (`linkType`, `dayType` vs `resourceKind`, `recurrenceKind`, `shapeKind`) | **High** (GRS JSON) | Yes | Write the rule down; rename the GRS-own `DelayFixType` family |
| SF4 | GRS-own date pair `HighlightBox.startDate/endDate` vs the house `start/finish` | **High** (GRS JSON) | Yes | `startDate/finishDate` |
| SF5 | Abbreviation `Seq` in GRS JSON (`importSeq`, `lastSeenImportSeq`) | **High** (GRS JSON) | Yes | `importSequence`, `lastSeenImportSequence` |
| SF6 | Units: Px in entity columns but not in documentSettings or code; font size spelled 3 ways | **High** (GRS JSON) | Yes | Decide "unit in name" for stored numbers |
| SF7 | documentSettings booleans: 14 adjective-predicates + 1 verb form (`showsTimeOfDay`); in-code synonyms `showPlan`/`showActual` | **High** (GRS JSON) | Yes | `timeOfDayVisible`; drop the synonyms |
| SF8 | `createAssignment` paired with `unassignResource` | **High** (T-108) | Yes | `deleteAssignment` |
| SF9 | Boolean functions/members without is/has/can; 3 negative `hasNo*` | Medium (2 in T-064) / Low | Partly | `is`/`has` for the ambiguous ones; affirmative form |
| SF10 | "Empty value" spelled 3 ways: `emptyXValues` camelCase consts, `NO_X`/`OPENED_X` UPPER consts, `blankX()`/`emptyX()` functions | Medium (2 in T-064) | Partly | CONSTANT_CASE for the 10 consts, or one documented rule |
| SF11 | Abbreviation `Pc` (`PcTimeZone`, `PcRegionChoice`, `regionForPc`, `readPcRegion`) | Medium | Yes (2 in T-064) | `SystemTimeZone` / `regionForSystem` |
| SF12 | Number-series names `date1`/`date2`/`date1X`/`date2X` (dual cursor) | Medium | Yes (spec uses `date1`) | Name the two ends by role |
| SF13 | Discriminant field `kind` (commands) vs `type` (session events) | Low | No | Keep `kind`; `type` only where MCP/DOM mandates it |
| SF14 | `dep` abbreviation (`depLinkParts`) beside `dependencyLinkParts` | Low | No | `dependencyLinkParts...` |
| SF15 | Callback props named on+value (`onAppHeaderHeightPx`) | Low | No | `onAppHeaderHeightPxMeasured` (or keep) |
| SF16 | The same exported name declared in two files (17 names) | Low | Partly | Rename the duplicates that mean different things |
| SF17 | tests/: folder `usecase` vs src `use-case`; `.contract.test.ts` infix on 135 of 332 files in tests/contract | Low | No | `tests/use-case`; drop the redundant infix |

**Spec note** -- rule 03 section 1 makes the spec the source of every name. A Medium or High row marked
"Yes" is therefore **a finding on the spec first**: the spec row changes, then code copies it. F1 is the reverse
case. The spec never names these reply shapes, so code chose them freely, yet they cross MCP. They become
integrator contract on the day of release.

#### S2 Detail

##### SF1 -- Agent API reply and request shapes (High; not in the spec)

Source: `src/adapter/agent-api-endpoint/agent-api-members.ts:53-106`. The MCP relay passes these values as JSON
(design-mcp-relay.md 3.2). Any member of `applyCommands` `{ request }` and of every result is integrator contract.

- **Success flag spelled two ways**
  - `AgentExport<T>` uses `{ ok: true | false }`.
  - `AgentWriteOutcome`, `AgentUtteranceOutcome` and `AgentFocusOutcome` use `{ accepted: true | false }`.
  - An integrator must branch on two different keys for the same success-or-refusal pattern.
  - Convention: one discriminant per API. `ok` is the web-platform form (`Response.ok`). If the distinction is
    intended (a write is accepted, an export succeeds), the spec should say so.
  - Places: `\bok\b` / `accepted` appear in the spec 0 times as a field name.
- **`AgentWriteRequest.readStamp`** -- a data field spelled exactly like the method AM-4 `readStamp`.
  - It is a verb phrase used as a noun. Clean Code ch. 2 says class/field names are nouns, and .NET says
    "names of fields ... nouns or noun phrases".
  - It reads as "call readStamp" inside an `applyCommands` request.
  - Conventional: `expectedStamp` or `baseStamp` (the optimistic-lock token).
  - Places: `readStamp` src=20 tests=188 tools=1 docs/spec=3 (lines; the spec lines are the AM-4 method).
  - The same field name also appears in `use-case/apply-document-change/document-change-plan.ts:41,321`.
- **`AgentRefusal.what: string`** -- the human-readable reason.
  - Convention: `message` (ECMAScript `Error.message`, .NET `Exception.Message`).
  - `what` is a coherent house word: about 25 declarations of `readonly what: string` across codecs, gateways
    and use-cases. Only the copy that crosses MCP must change before release; renaming all of them is optional.
  - Places: `\bwhat\b` src=212 lines (many are prose); `` `what` `` appears in the spec 0 times.
- **`AgentUtteranceOutcome`** -- the reply of AM-18 `postDialogueMessage` uses a second word, "Utterance",
  for the spec's `DialogueMessage`. Rule 03 section 1 forbids a second name for one concept.
  - `Utterance` src=14 tests=2 spec=0. `DialogueMessage` src=37 tests=52 spec=28.
  - Conventional: `AgentDialogueMessageOutcome` (or `AgentPostOutcome`).

Recommendation: before release, add the reply and request member names to the spec (T-107 or a new row family),
choose them there, then rename. This is the only cluster where the cost of waiting is permanent.

##### SF2 -- Command kinds and the field they write disagree on units (High; T-108)

The CM names otherwise follow one regular grammar: of 88 names, 56 start with `set`, 8 `delete`, 7 `create`,
3 `reset`, 2 `clear` and so on. All are verb-first.

| command (CM) | field it writes | unit in command? |
|---|---|---|
| `setTaskVisualStrokeWidth` | `TaskVisual.strokeWidthPx` | dropped |
| `setCommentBoxStrokeWidth` | `CommentBox.strokeWidthPx` | dropped |
| `setHighlightBoxStrokeWidth` | `HighlightBox.strokeWidthPx` | dropped |
| `setCommentBoxFillTransparency` | `CommentBox.fillTransparencyPercent` | dropped |
| `setHighlightBoxFillTransparency` | `HighlightBox.fillTransparencyPercent` | dropped |
| `setCommentBoxBodyOffsetPx` | `CommentBox.bodyOffsetPx` | kept |
| `setTaskFadeInDays` / `setTaskFadeOutDays` | `Task.fadeInDays` / `fadeOutDays` | kept |

- Count: 5 of 8 unit-bearing setters drop the unit, 3 keep it. Method: CM names from tbl-glossary.md against the
  erd.json columns with a Px/Percent/Days suffix.
- Places: each dropped name has src=6..9, tests=2..4, docs/spec=1 lines.
- Convention: .NET says "use the same name for the same concept". The integrator types the field name in GRS JSON
  and the command name in `applyCommands`, so the two should match.
- Recommendation: setters become `set` + Entity + field name, for example `setCommentBoxStrokeWidthPx` and
  `setCommentBoxFillTransparencyPercent`.
- This is a spec change (T-108 and the CM rows). It is cheap: 5 names, about 40 lines in all.

##### SF3 -- Kind vs Type (High; GRS JSON + T-064)

GRS JSON columns that hold a classification:

| column | MSPDI element | suffix |
|---|---|---|
| `Dependency.linkType` | `PredecessorLink/Type` | Type |
| `WeekDay.dayType` | `WeekDay/DayType` | Type (1:1 mirror) |
| `Resource.resourceKind` | `Resource/Type` | Kind |
| `Exception.recurrenceKind` | `Exception/Type` | Kind |
| `TaskVisual.shapeKind`, `CommentBox.leaderShapeKind` | (GRS-own) | Kind |

- **The inconsistency** -- MSPDI `Type` became `Kind` in 2 places and stayed `Type` in 1 (`linkType`). Only
  `dayType` is a 1:1 mirror of the element name.
- **In exported code** -- 17 names end in Kind and 8 in Type (regex `Kind(?![a-z])` / `Type(?![a-z])` over all
  exported and member names). The 8 Type names:
  - 4 GRS-own: `DelayFixType`, `DELAY_FIX_TYPES` (both in T-064), `fixType`, `fixTypeOf`.
  - 2 MSPDI: `linkType`, `dayType`.
  - 1 platform: `SaveFileType` (File System Access API `types`).
  - 1 MCP-mandated: `type`.
- **Discriminants follow the same split** -- see F13.
- **Convention** -- `type` collides with the TypeScript keyword and with the discriminant habit. Google TS gives no
  rule, but .NET says "one term per concept". The house majority is `Kind`.
- **Recommendation**
  - (a) Rename the GRS-own `DelayFixType` -> `DelayFixKind`, `DELAY_FIX_TYPES` -> `DELAY_FIX_KINDS`, and
    `fixType` -> `fixKind`. Places: DelayFixType src=8 spec=2; DELAY_FIX_TYPES src=6 spec=2; fixType src=46 tests=21.
  - (b) For `linkType`, either rename it to `linkKind` or write the rule "a column that mirrors MSPDI `Type`
    keeps Type". Renaming is expensive: src=586 tests=598 tools=9 spec=14. The rule would leave
    `resourceKind`/`recurrenceKind` as the exceptions; they are smaller (src=24/18, tests=27/41, spec=7/8).
    Pick one direction; today there is none.
  - (c) Keep `dayType` (1:1 mirror).

##### SF4 -- HighlightBox date pair (High; GRS JSON)

- **The pairs in use**
  - Task, Project and the fit span use Start/Finish: `start`/`finish`, `actualStart`/`actualFinish`,
    `defaultStartTime`/`defaultFinishTime`, `fitSpanStart`/`fitSpanFinish`.
  - MSPDI periods use `fromDate`/`toDate` and `fromTime`/`toTime` (1:1 mirrors; keep).
  - The GRS-own `HighlightBox` alone uses `startDate`/`endDate`.
  - Places: endDate src=19 tests=60 spec=13. Command `setHighlightBoxRange` (no change needed).
- **In code** -- 15 exported names end in `End` and 9 in `Finish`.
  - `actualEndOf` is deliberate: it returns `actualFinish ?? stop`, a union of two fields, so a third word is
    defensible.
  - `DAY_START_TIME`/`DAY_END_TIME` (T-064) and `textOfDayStart`/`textOfDayEnd` (T-064) pair Start with End,
    while `defaultStartTime`/`defaultFinishTime` pair it with Finish. Low; mention only.
- **Convention** -- .NET says one pair per concept. The house pair, inherited from MSPDI, is Start/Finish.
- **Recommendation** -- `HighlightBox.finishDate`. Spec rows: erd.json, T-058.

##### SF5 -- `importSeq`, `lastSeenImportSeq` (High; GRS JSON)

- These are the only abbreviated GRS JSON columns. Method: every word of the 1097 distinct words in exported
  names was split on case, and the words of 3 letters or fewer were reviewed.
- Besides `seq`, the abbreviations are `max`/`min` (universal), `rect` (DOM `DOMRect`), `params` (JSON-RPC) and
  `defs` (SVG element). All of those are conventional.
- Convention: .NET "do not use abbreviations or contractions as part of identifiers"; Google TS "do not use
  abbreviations that are ambiguous or unfamiliar".
- Conventional: `importSequence`, `lastSeenImportSequence`.
- Places: importSeq src=23 tests=28 tools=3 spec=14; lastSeenImportSeq src=8 tests=2 tools=1 spec=6.

##### SF6 -- Units in stored numbers; font size (High; GRS JSON)

**Entity columns carry the unit in the name:**

- `strokeWidthPx` (x3), `bodyOffsetPx`, `cornerRadiusPx`.
- `fillTransparencyPercent` (x2).
- `fadeInDays`, `fadeOutDays`, `parentProgressToleranceDays`.
- `TaskGroup.minHeight` (px) does not.

**documentSettings keys do not:**

- `taskGroupPanelWidth` (px), `rulerHeight` (px), `rulerFont` (px).
- `scrollGroupOffset` and `scrollDayOffset` are fractions 0..1 named "Offset". Conventionally an offset is a
  distance, so these read as one.
- In tbl-settings.md the unit lives in a column, not in the name. All 41 px rows matched by a cell parse have no
  `Px` suffix. The parse matched 56 of 504 rows, so read 41 as a lower bound.

**Code members:**

- 22 of 131 number-typed members that look like geometry carry `Px`. Geometry-like means the name ends in
  Width/Height/Top/Left/X/Y/Offset/Radius/Gap/Font/Size/Indent/Reach.
- 5 exported interfaces mix both forms. Examples: `TaskPlacement` has `fadeInPx` and 16 unsuffixed pixel fields;
  `CommentGeometry` and `SearchJumpLanding` mix the two as well.

**Font size is spelled 3 ways:**

- `xFont`: `rulerFont` (GRS JSON, settings S-3), `zoomYAtRectangleLabelFont`, plus settings `taskGroupTitleFont`
  and `fontOfActual`.
- `xFontPx`: `fontPx`, `searchPanelFontPxOf`, `taskGroupTitleFontPxOf` (T-064).
- `xFontSize`: `fontSize`, `labelFontSize`, `widthInFontSizes`.
- A bare `xFont` holding a number reads as a font family. The CSS and DOM word is `fontSize`.

**Conventions and recommendation:**

- Google TS has no unit rule. The common rule (Microsoft REST API guidelines; Clean Code "use intention-revealing
  names") is to put the unit in the name of a stored number whose unit is not obvious.
- Recommendation: decide one rule for **stored** numbers -- columns and documentSettings keys -- before release.
  Candidates:
  - `taskGroupPanelWidthPx`, `rulerHeightPx`, `rulerFontSizePx`, `minHeightPx`.
  - `scrollGroupFraction`, `scrollDayFraction`.
- Inside the code, Px on every pixel value is optional (Low).
- Places: rulerFont src=27 tests=27 tools=1 spec=22; taskGroupPanelWidth src=34 tests=93 spec=7;
  minHeight src=126 tests=268 spec=14 (src includes DOM `style.minHeight`, so this one is over-counted).

##### SF7 -- documentSettings booleans (High; GRS JSON)

**What the stored keys use:**

- 15 boolean keys, from grs-document.schema.json.
- 11 `xxxVisible`, plus `fitSpanFixed`, `taskGroupPanelWidthFixed`, `themeMonochrome`. These are adjective
  predicates, the .NET style (`Control.Visible`, `Enabled`): ".NET: affirmative phrase; Is/Can/Has optional".
- The odd one out is `showsTimeOfDay`, a verb form, together with its command `setShowsTimeOfDay`.
- Places: showsTimeOfDay src=96 tests=16 tools=1 spec=6; setShowsTimeOfDay src=6 tests=2 spec=1.

**Code synonyms for spec names (rule 03 section 1):**

- `GeometryInputs.showPlan` and `showActual` are filled from `settings.planVisible` and `actualVisible`
  (`entity/layout-engine/schedule-geometry/schedule-geometry.ts:273,568`). showActual src=7, showPlan src=3.
- `ScreenTheme.monochrome` and `GridInput.monochrome` stand for `themeMonochrome`. That one is acceptable inside
  a theme object.

**Recommendation:**

- `timeOfDayVisible` with `setTimeOfDayVisible`. Alternatively fold it into `setElementVisible`, which already
  covers the Visible family.
- Rename `showPlan`/`showActual` to `planVisible`/`actualVisible`.
- Keep the adjective form for the family. Moving 14 keys to `isX` buys nothing conventional and costs much.

##### SF8 -- `createAssignment` / `unassignResource` (High; T-108)

- Every other entity pairs create with delete: `createTask`/`deleteTask`, `createResource`/`deleteResource`,
  `createCommentBox`/`deleteCommentBox`, and so on (7 creates, 8 deletes).
- The Assignment pair alone is create + unassign, and its object changes from Assignment to Resource.
- Conventional: `deleteAssignment`, or `assignResource`/`unassignResource` if the verb pair is preferred.
- Places: createAssignment src=5 tests=4 spec=1; unassignResource src=4 tests=3 spec=1.

##### SF9 -- Boolean names in code (Medium where published, else Low)

**Exported functions returning `boolean` or a type predicate: 83.**

- 60 start with `is`, 4 with `has`, 2 with `can`, 1 with `holds`, 1 with `same`.
- 15 have other names. 6 of those are actions that return success (`answer*`, `spend*`, `focus*`,
  `watchChanges` AM-17, `unwatchChanges`). That is fine.
- Bare predicates:
  - `planDatesSpanYears` (T-064), `holdsWorkingDayUnlikeMinutesPerDay` (T-064).
  - `laidBelow`, `namesAPlace`, `leavesTaskGroupArea`, `standsUndecidedResume`, `startupAgentApiEnabled`,
    `pasteRefusedFor`, `wouldScheduleFilterChange`, `sameRecord`.
- Convention: Google TS does not mandate a prefix. typescript-eslint's documented boolean example enforces
  `is/should/has/can/did/will`. .NET: affirmative, Is/Can/Has where it adds value.
- Recommendation: rename the 2 T-064 ones (`doPlanDatesSpanYears` is awkward; prefer `isPlanSpanningYears`,
  `isWorkingDayUnlikeMinutesPerDay`), plus `startupAgentApiEnabled` -> `isStartupAgentApiEnabled` and
  `sameRecord` -> `isSameRecord`.

**Boolean members of exported types: 178.**

- 94 `is`, 11 `can`, 6 `has`, 3 `shows`, 2 `show`, 1 `should`, 61 bare.
- Of the 61 bare ones:
  - DOM mirrors, fine: `alt`, `ctrl`, `shift`, `meta`, `checked`.
  - MSPDI mirrors, keep: `milestone`, `dayWorking`, `resumeValid`.
  - Ambiguous ones (Clean Code "avoid disinformation"):
    - `ZoomEntranceEnds.timeIn/timeOut/verticalIn/verticalOut` (verticalIn tests=80).
    - `EntityRows.many`, `Selection.ordered`, `ResumeGeometry.valid/undecided`, `DrawnRow.shown`.
- Negative names, against .NET "affirmative phrase (CanSeek, not CantSeek)": `hasNoCalendarDraftRefusal` (spec=2),
  `hasNoSurfaceOrConfirmation` (spec=5), `hasNoUnsettledEntry` (spec=5). Medium, because the spec names them.

##### SF10 -- the "empty value" spelled 3 ways (Medium)

- **camelCase consts (10)** -- `emptyScreenSession` and `emptySearchPanelSession` (both T-064),
  `emptyScreenValues`, `emptyAgentApiValues`, and 6 more `empty*Values` in
  `use-case/advance-screen-session/*.ts`. These are the only camelCase exported consts (method: an exported
  `const` that is not an arrow function).
- **The same kind of value in CONSTANT_CASE** -- `NO_DELAY_FIX_VALUES`, `NO_DELAY_FIX_TABLES`,
  `OPENED_RESOURCE_LIST`, `OPENED_DELAY_DIAGNOSTICS_REPORT`, `UNASSIGNED`, and the `*_INITIAL_AXES` that the
  `empty*Values` spread.
- **Functions** -- `emptyHistory()`, `emptySelection()`, `emptyDialogueLog()`, `emptyChangeWatchers()`,
  `blankTaskVisual()` (T-064).
- **Convention** -- Google TS: CONSTANT_CASE for module-level values that are never reassigned and deeply
  immutable; lowerCamelCase otherwise. Typed `readonly` object constants qualify for CONSTANT_CASE. The
  typescript-eslint default (`variable: camelCase | UPPER_CASE`) accepts both.
- **Recommendation** -- `EMPTY_SCREEN_SESSION` and so on, or one written rule such as "an initial session value
  is camelCase". Also choose one of `empty`/`blank` (2 `blank` names vs 16 `empty`).
- **Places** -- emptyScreenSession src=6 tests=388 spec=4. The test count makes this costly; it is a candidate to
  keep with a rule.

##### SF11 -- `Pc` (Medium; T-064)

- Names: `PcTimeZone`, `PcRegionChoice` (T-064), `regionForPc` (T-064), `readPcRegion`, local `withPcTimeZone`.
- Convention: .NET "avoid abbreviations; use acronyms only when widely known". PC is widely known but names the
  device, not the setting. JavaScript calls this the system or host time zone
  (`Intl.DateTimeFormat().resolvedOptions().timeZone`).
- Conventional: `SystemTimeZone`, `SystemRegionChoice`, `regionForSystem`, `readSystemRegion`.
- Places: regionForPc src=6 tests=9 spec=2; PcRegionChoice src=5 spec=2; PcTimeZone src=3; readPcRegion src=6 tests=2.

##### SF12 -- `date1`/`date2` (Medium; spec)

- Names: `DualCursor.date1` (`entity/layout-engine/schedule-geometry/dual-cursor.ts:13`), `date1X`/`date2X`,
  the side literal `'date1'`, and the tooltip `{date1, date2}`.
- Convention: Clean Code ch. 2 "avoid number-series naming (a1, a2)".
- Conventional: name the role, for example `anchorDate`/`movingDate` or `firstDate`/`secondDate` if the order is
  the meaning.
- Places: date1 src=17 tests=19 tools=2 spec=8. Low-to-medium value; it can wait.

##### SF13 -- discriminant field `kind` vs `type` (Low)

- `readonly kind: '...'` appears on 372 lines in 49 src files. `DocumentCommand` uses it and crosses the Agent API.
- `readonly type: '...'` appears on 134 lines in about 10 files: the session events in
  `use-case/advance-screen-session/*`, plus the MCP content items, which MCP mandates.
- These are internal unless the events cross out. Recommendation: `kind` everywhere except MCP and DOM shapes.

##### SF14 -- `depLinkParts`, `depLinkPartsPinned` (Low)

- `adapter/svg-renderer/schedule-task-figures.ts:113-114`.
- `dep` is the only `dep` abbreviation; `dependencyLinkParts` already exists as a function.
- Conventional: `dependencyLinkParts`, `pinnedDependencyLinkParts`. Places: src=6 tests=1.

##### SF15 -- callback props named on + value (Low)

- Names: `onAppHeaderHeightPx`, `onCommandPaletteBandPx`, `onTaskGroupControlsHeightPx` (`onSearchWordTyped` is
  fine).
- The React/DOM convention is on + event (`onChange`, `onResize`), so `onAppHeaderHeightMeasured` is the
  conventional form.
- No `handleX` exports exist (1 `handleParts` is a noun). No `addEventListener`-style custom APIs.

##### SF16 -- the same exported name declared in more than one file (Low)

- 17 names. Same-meaning type aliases: `ColumnFilter`, `ColumnSort`, `SearchColumn`, `MergeChoices`,
  `MergeMapping`, `DelayFixTables`, `DelayFixTelling`, `InvariantRow`, `BaseChangeWay`, `VisibilityTable`,
  `MergeCandidateLine`.
- Different functions with one name: `fault` (grs-json-schema.ts vs mspdi-xml.ts), `withSchedule`
  (edit-task-group.ts vs edit-task.ts), `dayFromSerial` and `taskGroupRankById`
  (input-command-translator.ts vs entity), and `NOT_STORED_SEARCH_PANEL_FONT_SIZES` (two consts).
- `itemAtPointer` x3 is overloads, which is fine.
- Recommendation: re-export instead of re-declaring the aliases, and give the different functions different names.

##### SF17 -- files and folders (Low)

- Every file and folder segment under src/ (251 distinct) and tests/ (669 distinct) is kebab-case except
  `tests/README.md` (conventional). Regex: `^[a-z0-9]+(-[a-z0-9]+)*(\.[a-z0-9-]+)*$`.
- Deviation 1: `tests/usecase/` (15 files) vs `src/use-case/`. Referenced on 184 lines in 51 files outside tests/.
- Deviation 2: in tests/contract, 135 of 332 test files carry a `.contract.test.ts` infix and 197 do not. The
  folder already says "contract", and vitest includes `tests/contract/**/*.test.ts`, so the infix carries no
  meaning. `.sws.test.ts` (5 files) is a separate infix.
- No `.spec.ts`; all 620 test files are `*.test.ts`.

#### S3 The xOf / noun-phrase function style (check 4) -- a recommendation, not a finding

The 864 exported functions (836 distinct names) were classified by their first camelCase word
(the verb list is hand-made):

| class | count | in T-064 | examples |
|---|---|---|---|
| ends in `Of` | 215 | 99 | `colorOf`, `taskNameOf`, `actualEndOf` |
| verb-first | 222 | 59 | `diagnoseDelay`, `applyCommands`, `isDelayed` |
| noun + From/By/At/With/In/To (`xFromY`, `withX`) | 126 | 62 | `geometryFromLayout`, `taskByUid`, `withoutDependencyAt` |
| other noun phrase | 245 | 93 | `scheduleViolations`, `delayDiagnosticsReportRows` |
| participle-first | 50 | 6 | `drawnSettingsOf`, `writtenXml`, `shownCalendarDraft` |

- **There is no `getX` anywhere** (0 functions).
- **Every function returning `void`/`Promise<void>` (34) starts with a verb.** So the tree follows a real rule:
  a function that only computes a value is named for the value (a noun phrase), and a function with an effect is
  named for the action (a verb).
- **That is an established convention, not a deviation.** The Swift API Design Guidelines say "those without
  side-effects should read as noun phrases (`x.distance(to: y)`); those with side-effects should read as
  imperative verb phrases". Meyer's command-query separation backs the same split, and the standard library does
  it too (`Array.from`, `Object.entries`).
- **It deviates from** .NET ("give methods names that are verbs or verb phrases") and Clean Code ch. 2 ("methods
  should have verb or verb phrase names"). Google TS states no verb rule.
- **Recommendation: keep it as the house style, and write it down** in 03-implementation section 2, so a release
  reviewer reads it as a decision and not as drift. Wording: "pure -> noun phrase (`xOf`, `xFromY`, `withX`);
  effect -> verb; predicate -> `is`/`has`/`can`".
- **Outliers to look at** -- 15 `Of` names whose first word is also a verb: `clearEntryOf`, `pressRowOf`,
  `dismissKeyOf`, `jumpLandingOf`, `scrollOffsetOf`, `startSideOf`, `snapMinutesOf` and others. They read as
  commands. `pressRowOf` and `dismissKeyOf` are in T-064.
- **Factories** -- noun factories (`browserClipboard()`, `canvasRasterizer()`, `domScreenSurface()`,
  `fileSystemAccessFileStore()`) match the house style. Only 2 GRS `createX` functions exist (`createTask`,
  `createTaskGroup`), and both are commands (CM-6, CM-26), not factories. There is no `makeX`/`buildX`/`newX`
  factory; `newGroupId` and the like are id issuers.

#### S4 Checked and found conventional (short)

- **Case form (check 1)**
  - Types: 396 interface + 349 type + 2 class are all PascalCase.
  - Functions: 864 of 864 are camelCase.
  - Consts: 169 of 179 are UPPER_SNAKE, 0 are arrow functions in UPPER, and the 10 camelCase ones are F10.
  - Members: 2106 of 2106 are camelCase.
  - 0 enums (string-literal unions instead, which is Google-TS-preferred).
  - All 31 UPPER names in T-064 are true constants.
  - GRS JSON enum values are camelCase throughout (`temporarilyExpanded`, `endpointSpan`, `calloutBox`).
- **Acronyms (check 2)**
  - Over all exported and member names, the word form is used every time: Uid 26, Id 29, Html 7, Json 6, Utc 6,
    Url 1, Svg 12, Png 2, Mspdi 6, Mcp 5, Api 24, Xml 3. The all-caps form appears **0** times inside a camelCase
    name.
  - The all-caps forms in src/tests are only MSPDI element names (`TaskUID`, `CalendarUID`, `FieldID` --
    external schema) and platform APIs (`innerHTML`, `toJSON`, `getUTCDate`, `baseURL`, `createSVGPoint`).
  - This matches Google TS "treat abbreviations like acronyms as whole words (loadHttpUrl)".
- **Abbreviations (check 6)** -- of the brief's list, Seq is F5. Cnt, Btn, Ctx, Cfg, Idx, Num and Tmp occur
  **0** times. A longer list (Msg, Val, Elem, Str, Obj, Fn, Cb, Evt, Prev, Cur, Len, Pos, Opts, Info, Desc, Src,
  Dst, Util, Mgr, Impl and others) also gives 0, except F11 `Pc` and F14 `dep`.
- **Hungarian, `_` prefix, `I` prefix, Manager/Helper/Util suffixes** -- 0 each (Google TS, MS TS guidelines).
- **Count / Number / Total (check 7)** -- `Count` is used 16 times and means a count every time. `Number` appears
  twice and neither is a count (`drawnAnnotationNumber` validates a number; `wholeNumberOf`). `Total` appears
  once (`maxTotalSizeBytes`). Consistent.
- **Uid vs Id** -- 24 `Uids` and 6 `Ids` follow the spec's split: an integer MSPDI UID for Task/Resource/Calendar
  and a GRS UUID `id` for TaskGroup/boxes. `Project.id` (MSPDI `Project/UID`) is a documented exception
  (erd.json: "not the primary key").
- **Time units** -- `Minutes` 20, `Ms` 4 (`hintTargetDwellMs`, `readClockMs`, MCP param `waitMs`), `Days` 17.
  There is no `Millis`/`Sec`/`Mins`. Consistent.
- **Agent API method names (T-107)** -- 22 of 22 are verb + object (`readX`, `exportX`, `applyCommands`,
  `focusTask`) or a noun property (`agentApiVersion`, `schemaVersion`).
- **MCP** -- tool names = AM names, camelCase. MCP allows `[A-Za-z0-9_.-]`, so this is valid, though many public
  servers use snake_case (judgement call, not a finding). MCP params: `request`, `source`, `taskUid`,
  `taskUids`, `word`, `text`, `waitMs`.
- **MSPDI-mirrored GRS JSON names** -- `milestone`, `dayWorking`, `resumeValid`, `isBaseCalendar`,
  `isCostResource`, `dayType`, `percentComplete`, `minutesPerDay`, `fromDate`/`toDate` and the rest are kept
  1:1, as the memory note on MSPDI names says. Not findings.
- **Spec <-> code spelling** -- all 473 distinct T-064 names exist as an exported declaration, re-export or
  member in src/. The first scan reported 5 missing (PI-19 `svgFromSchedule`, `swatchOf`, `inkOn`,
  `bandBaselineYOf`, `GROUP_GRID_LINE_WIDTH_PX`), but they exist in `adapter/svg-renderer/svg-renderer.ts`. They
  were a fault of the scan, fixed in the stripping pass.

#### S5 Settled or out of scope (not reported)

- British vs American spelling (CR-730) -- not examined.
- Row -> TaskGroup (CR-708) -- 43 exported names still contain `Row`, most of them table rows. CR-708 owns any
  that mean TaskGroup. CR-708 also explicitly kept `scrollGroupId` and the `...GroupId` short form
  (CR-708 line 153), so `groupId`/`pinnedGroupIds` are not reported.
- `TaskGroup.label` vs `taskGroupNameOf` -- intentional: the name is derived from `label` or from
  `derivedFromTaskUid` (`schedule/task-group-names.ts:18`).

#### S6 Limits of this survey

- **Regex, not a type checker.** A member type that spans lines is read from its first line, so the boolean-member
  count (178) can miss multi-line unions.
- **Line counts.** `git grep -wc` counts lines, not occurrences. Short names (`what`, `minHeight`, `ok`) are
  over-counted by prose and DOM uses.
- **The verb list** is hand-made; the class counts in section 3 can move by a few.
- **Units in tbl-settings.md.** The px-row count (41) comes from a loose cell parse that matched 56 of 504 rows.

### 2.6 配る物の名（本席が測った。`CR-771`）

| # | 今 | 慣習の形 | 出どころ・理由 | 扱い |
|---|---|---|---|---|
| P1 | ブラウザの保存の鍵の頭 `grsched.`（`grsched.screenLanguage`・`grsched.openedBy`・`grsched.agentApiEnabled`・`grsched.unlockPasswordSha256`） | `grs.` | 製品の頭は木のほかの所がすべて `grs`（`grs-relay`・`grs-export-fit`・`grs-files`・`x-grs-`）。公開の後に替えると利用者の選びが消える | `CR-771` 2.1 —— 公開の前に |
| P2 | MCP の取次の表示名 `GRS relay` | `GRS Relay` | 名前は Title Case（`JDG-1862`） | `CR-771` 2.2 |
| P3 | `grs-relay.mcpb`・`dist/index.html`・`docs/download/index.html`・`docs/about/index.html` | 変えない | kebab-case と `index.html` は慣習どおり | — |
| P4 | 見本 `sample-schedule/Three-Year Product Plan.json`（空白と大文字）と `sample-*.en.xml`（kebab-case） | 変えない | `JDG-1732` が名指す。⚠️ `CR-769` の鍵の変更の後は開けなくなる —— `CR-769` 問い 3 | `CR-771` X-3 |
| P5 | ja／en の接尾辞が 3 通り（`prompt-en.md` ／ `image-to-grs-json-prompt.en.md` ／ `sample-*.en.xml`） | 1 通り | 利用者の合図を待つ保留がある | 触れない（`CR-771` X-4） |
| P6 | 保存の面の媒体型 `image/x-grs-svg`・`text/x-grs-html`・`text/x-grs-markdown` | 変えない | RFC 6838 の 3.4 は `x-` を勧めないが、保存の面の中だけで使い利用者のファイルにも連携にも残らない。`CR-768` が表 T-024 に載せる | `CR-771` X-5 |

---

## 3. 慣習どおりと確かめたもの

- **コードの記法**（S4）: 型・クラス 747 と関数 864 と型の欄 2,106 がすべて記法どおり。定数 179 のうち CONSTANT_CASE 169（残り 10 は SF10 の `empty…`）。列挙の宣言 0（文字列の和 —— Google TS の勧め）。
- **頭字語**（S4）: `Uid` 26・`Id` 29・`Html` 7・`Json` 6・`Utc` 6・`Svg` 12・`Api` 24 ほか、すべて語として書く。大文字の頭字語を camelCase の中に書く所 0。
- **略語**（S4）: `Cnt`・`Btn`・`Ctx`・`Cfg`・`Idx`・`Num`・`Tmp` ほか 0（例外は SF5 `Seq`・SF11 `Pc`・SF14 `dep`）。ハンガリアン・`_` の頭・`I` の頭・Manager／Helper／Util の尾 0。
- **時間の単位**（S4）: `Minutes` 20・`Ms` 4・`Days` 17。`Millis`・`Sec`・`Mins` 0。
- **名付けの流儀**（S3）: `getX` 0、`…Of` 215、作用を持つ関数 34 のすべてが動詞で始まる —— 名詞句と動詞を分ける一貫した流儀（Swift API Design Guidelines）。直さず規則に書く（`CR-771` E-01）。
- **エージェント API・命令の名**（2.2・2.3）: 22 のメンバと 88 の命令のすべてが動詞で始まるか名詞の性質。
- **MSPDI 由来の名**: `milestone`・`dayWorking`・`resumeValid`・`isBaseCalendar`・`isCostResource`・`dayType`・`percentComplete`・`minutesPerDay`・`fromDate`／`toDate` ほか。
- **画面の語**（D-…の「Checked and found CONVENTIONAL」）: 業務の標準の語、Title Case の見出し、「(Blanks)」、時刻帯の一覧の形、「Please」「!」「Error:」0。
- **綴り**: アメリカ式（`CR-730` の後）。取り残しは D8.1 の 5 だけ。

---

## 4. 進行中の波との衝突（`66d989c6` で、旧い名が各変更要求の本文に現れるかを 6 節の台本で数えた）

| 群 | 触れ合う変更要求 |
|---|---|
| J1 真偽の鍵 | `CR-754`・`CR-756` |
| J2 `groupId` | `CR-754`（`scrollGroupId`・`pinnedGroupIds`）・`CR-766` |
| J4 単位 | `CR-754`・`CR-755`・`CR-766`（`fontScale`・`displayScale`） |
| J6・J8 | `CR-757`（`lag`・`created`・`startDate`）・`CR-760`（`linkType`、変えない） |
| A1〜A5 エージェント API | `CR-765`（表 T-107 を原稿へ）—— 原稿の着地の後に当てる |
| 2.3 命令 | `CR-766`（表 T-108 を原稿へ、問い 1） |
| D6.1 設定の項目名 | `CR-754`・`CR-755`・`CR-756` |
| D7 キーの書き方 | `CR-754`・`CR-755`・`CR-757`・`CR-759`・`CR-762`（`FR-036`・表 T-036） |
| D2.1 答えのボタン | `CR-757`（`QN-14`）・`CR-767`（確認の状態機械） |
| D1・D2.2 保存の面の名 | `CR-768`（`IC-2`・`.md`） |
| SF11 `Pc` | `CR-755` |
| SF1 `AgentUtteranceOutcome` | `CR-765` |
| 触れない | `CR-740`・`CR-758`・`CR-761` |
| `CR-763`・`CR-764`（`integ/coord-1011` の `f6796d70` で測った） | 保存の鍵とコードの名には触れない。`CR-764` は `FR-036`（D7）と辞書、`CR-763` は辞書に触れる |

⚠️ 一般の語（`label`・`created`・`what`・`accepted`）の一致は、部品の字や別の意味の語を含む。`CR-756`〜`CR-759` に現れる `label` は部品の字で、`TaskGroup.label` ではない（本文を読んで確かめた）。

---

## 5. 利用者に問うこと（各変更要求の 11 節）

| 問い | 何を | 推奨 | 覆す裁定 |
|---|---|---|---|
| `CR-769` 問い 1 | `xxxVisible` の形（`JDG-2241`）からはみ出す保存の 3 つと答えの 3 つをそろえ、`W-10` を直すか | A 6 つともそろえる | `JDG-1784` の `showsTimeOfDay` |
| `CR-769` 問い 2 | `groupId` を `taskGroupId` にするか | A する | `JDG-1488` |
| `CR-769` 問い 3 | 開けなくなる見本をどうするか | A 鍵だけ追従 | `JDG-1732`（鍵の綴りだけ） |
| `CR-770` 問い 1 | 英語のキーを `Ctrl+A` と書くか | A 英語だけ | `JDG-174`（英語だけ） |
| `CR-770` 問い 2 | （問わない —— `JDG-2241` が答えた）設定の項目名 19 行を語にする | — | `JDG-1862` の注（`JDG-2241` が覆した） |
| `CR-770` 問い 3 | 答えのボタンを動詞にするか | A 英語だけ | 無い |
| `CR-770` 問い 4 | Arm・Bottleneck・Paused・Comment Box・Dialogue Field を標準の語にするか | 5 つとも | 無い |
| `CR-770` 問い 5 | 書き方の束 17 を推奨どおりに当てるか | A まとめて | `JDG-1223` |
| （触れ合う）`CR-766` 問い 1 | 命令が運ぶ値の名を列の名にそろえるか | `CR-766` の推奨は A（今のまま） | — |

⭐ 答え（2026-10-15、本席が利用者に問うた。`JDG-2245`〜`JDG-2251`）: `CR-769` 問い 1 は「`is`／`has` にそろえる」（推奨を問い直した後の答え。`W-10` のまま、値は true／false）、問い 2 は A、問い 3 は A。`CR-770` 問い 1 は C（日本語も Ctrl+A）、問い 3 は Yes／No を保つ（`QN-9` を問いの形に直す）、問い 4 は Bottleneck を保ち残り 4 つを替える、問い 5 は束を当て `IC-2` を Save As… にする。詳しくは各変更要求の 11 節。

---

## 6. 数え方の再現

触れる所の数（`CR-769`〜`CR-771` の 3 節と本書の J-…の数）は、次の台本で数えた。作業木の根で `PYTHONIOENCODING=utf-8 python <この台本> <名> <名> …`。台本は木の外に置いた（OneDrive が同期するので木に置かない）。

```python
# Count whole-word occurrences of candidate names per area, and which in-flight CRs name them.
# Usage: python count_names.py name1 name2 ...   (run at the worktree root)
import re, subprocess, sys
AREAS = [('spec', ['docs/spec']), ('guides', ['docs/guides']), ('src', ['src']), ('tests', ['tests']),
         ('tools', ['tools', '.claude/skills', 'check.sh', 'package.json']), ('samples', ['sample-schedule'])]
INFLIGHT = re.compile(r'change-request/CR-(740|75[4-9]|76[0-8])-')
files = subprocess.run(['git', 'ls-files', '-z'], capture_output=True).stdout.decode('utf-8').split('\0')
gen = re.compile(r'(^dist/|\.generated\.|/_assets/|docs/review/public-entry-index\.md|test-inventory\.md|grs-document\.schema\.json)')
texts = {}
def text(p):
    if p not in texts:
        try: texts[p] = open(p, encoding='utf-8', errors='replace').read()
        except Exception: texts[p] = ''
    return texts[p]
print('name\t' + '\t'.join(a for a, _ in AREAS) + '\tgenerated\tfiles\tinflight-CRs')
for name in sys.argv[1:]:
    pat = re.compile(r'(?<![A-Za-z0-9_])' + re.escape(name) + r'(?![A-Za-z0-9_])')
    row = []; nfiles = set(); g = 0
    for area, roots in AREAS:
        n = 0
        for p in files:
            if not any(p == r or p.startswith(r + '/') for r in roots): continue
            if p.endswith(('.png', '.ico', '.woff2', '.mcpb')): continue
            c = len(pat.findall(text(p)))
            if not c: continue
            if gen.search(p): g += c; continue
            n += c; nfiles.add(p)
        row.append(n)
    crs = sorted({re.search(r'CR-\d+', p).group(0) for p in files if INFLIGHT.search(p) and pat.search(text(p))})
    print(name + '\t' + '\t'.join(map(str, row)) + f'\t{g}\t{len(nfiles)}\t' + ','.join(crs))
```

⚠️ 読み方: 「generated」の列は `docs/spec/_assets/` をまとめて数えた —— そこには手書きの `tbl-glossary.md`（表 T-104・表 T-107・表 T-108）も入る。命令の名の仕様の数が 0 と出るのはそのためで、表 T-108 には命令ごとに 1 行ある。一般の語の数は上限である（部品の字・別の意味を含む）。

ほかの数:

```
# keys and enum values of the published schema: walk docs/spec/_source/grs-document.schema.json -> 170 property names, 37 enum strings
# kind literals: grep -rhoE "kind: '[a-zA-Z-]+'" src --include=*.ts | sort -u -> 277 (kebab 0, camelCase 186, one word 91)
# command names: the CM rows of docs/spec/_assets/tbl-glossary.md (table T-108) -> 88
# Agent API members: AM rows of table T-107 -> 22; agentApiVersion: grep -n "AGENT_API_VERSION =" src/adapter/agent-api-endpoint/agent-api-members.ts -> 4
# web storage prefix: grep -rn "WEB_STORAGE_KEY_PREFIX =" src -> 'grsched.'
# the D-... and S-... counts: the method stands beside each number in 2.4 and 2.5
```
