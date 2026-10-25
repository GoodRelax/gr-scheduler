# CR-851 命令と Agent API の行レビュー表 —— 注（作業メモ、第 3 版）

作業木 `.claude/worktrees/cr851-json-reshape-8cc2ca`（HEAD `84283a081`）で 2026-10-25 に読んだ。リポジトリのファイルは 1 つも書き換えていない。
表は同じフォルダの `commands-map.tsv`（命令）と `refusal-reasons-map.tsv`（拒否の理由）。下書きの台本は残していない。2 つの表が今の `document-commands.json` の行をちょうど 1 度ずつ覆うことは、同じフォルダの `check_tables.py` で確かめられる。

**第 2 版で当てたもの**: 裁定 35〜40（JDG-3308 タスクの輪郭の既定 1、JDG-3309「書かない = 無い」、JDG-3310 色は palette・custom・theme でプロパティを省けば描かない、JDG-3311 taskShape／milestoneShape、JDG-3312 フェードの Alias、JDG-3313 名の無いタスクグループへ一度だけ写す）と、拡大縮小の名（`scaling-names-for-cr851-2026-10-25.md` の 3・4 と E-16〜E-21、JDG-3290〜3297）。第 1 版の「計画 Y」「`{"kind":"none"}`」「C1／C2／C3」「保留」はこの版で消えた。

**第 3 版で当てたもの**: JDG-3315（名は強いない: `Task.name`・`TaskGroup.name` は任意、GRS はタスクの名をタスクグループへ写さない —— 写すのは MSPDI の取り込みの親タスクの名だけ、全部消した後の最初のタスクグループは "Untitled"、IV-8 と `taskGroupWithoutNameOrTask` は退く、名の clear はプロパティを消す）と JDG-3314（CR-849: `editTask`・`editCommentBox`・`editTaskGroup` が `hyperlinkAddress`・`hyperlink` を set/clear できる、`javascript:`・`vbscript:`・`data:` を JDG-3185 の読み方で断る）。名は書き直された `doc-shape-map.tsv` に揃えた（TaskGroup の親は `parentId` のまま）。読みやすい形は同じフォルダの `commands-map.md`（2 つの TSV から刷った版）。

表の `why` の欄の `JDG-nnnn` は `docs/development-records/rulings.md` の裁定の行である（JDG-3267 畳む、JDG-3268 set/clear、JDG-3275 所見の一括、JDG-3276 箱の塗り、JDG-3279 全面改名、JDG-3285 外へ出す値は名、JDG-3287 字数、JDG-3301 版、JDG-3303 タスクグループ名は追随しない、JDG-3304 箱の既定と 50、JDG-3306・JDG-3307 変換の HTML、JDG-3308〜JDG-3313 は上）。「所見 nn」は `studies/75-grs-json-reshape/multi-meaning-inventory.md` の所見の番号である。

---

## 0. 数と測り方

| 数 | 値 | 測り方 |
| --- | --- | --- |
| 今の命令（表 T-108 の行） | 93 | `python -c "import json;print(len(json.load(open('docs/spec/_source/document-commands.json',encoding='utf-8'))['rows']))"` |
| 退いた番号（`retired`） | 10 | 同じファイルの `retired` の長さ。名は git から起こした: `git log -S"CM-<n> \|" -- docs/spec` で最後に触れたコミットを探し、その親の `_assets/tbl-document-commands.md` から名を読んだ（CM-25 は 6f6741983、CM-33・34・75 は c5a95f231、CM-57 は 146693496、CM-59・60・61・63 は 34261746f、CM-70 は 4a0ce761e） |
| `commands-map.tsv` の行 | 112 | 93 ＋ 退いた 10 ＋ 足す 9。`check_tables.py` が `document-commands.json` と突き合わせる（欠け 0・余り 0・重複 0） |
| 93 の内訳 | edit-fold 58 ／ named-kept 31 ／ named-renamed 3 ／ retired 1 | 表の `kind` の欄を数えた数（第 2 版で変わらない） |
| 退いた名の一覧に入る名 | 72 | 今の 10 ＋ 畳む 58 ＋ CM-49 ＋ 改名の旧名 3 |
| 新しい命令の数 | 43 | 名つき 34（kept 31 ＋ renamed 3）＋ edit 9 |
| edit の欄 | 書ける 87 ／ clear できる 37 | 下の B の表を数えた（Project 13/10、Task 10/8、TaskVisual 5/2、TaskGroup 7/6、Resource 1/1、CommentBox 11/3、HighlightBox 8/1、DocumentSettings 26/2、TableView 6/4）。第 1 版 80/14 → 第 2 版 81/31（ズームの欄＋1、JDG-3309 で clear が任意のプロパティすべてへ）→ 第 3 版 87/37（リンクの 2 欄 × 3 実体、JDG-3314） |
| `refusal-reasons-map.tsv` の行 | 94 | 形 9 ／ 上の理由 21 ／ 上と命令の両方 1 ／ 取次 7 ／ 文書の欠陥 27 ／ 命令ごと 29 |
| 新しい理由の名 | 66 | `refusal-reasons-map.tsv` の名の欄を数えた数。第 1 版から removedName を retiredName に畳み（JDG-3309）、hyperlinkSchemeNotAllowed を足した（JDG-3314）。第 2 版で足した taskGroupWithoutNameOrTask は JDG-3315 で退いた |
| 今の拒否で行 ID が値になる所 | `reason` に RS-25・RS-64、IV- 23 行、RS-78〜81、`refusals[].rule` に 66 種、`refusals[].command` に CM-n、`target` に AM-n | `src/adapter/document-codec/json-codec.ts:34`、`src/use-case/validate-imported-document/validate-imported-document.ts:42-64`、`src/adapter/agent-api-endpoint/agent-api-members.ts:576-592`。rule の数は `src/use-case/**/*.ts`（テストを除く）の `reject(<row>, '<rule>'` を python の正規表現で集めた |

---

## A. edit 命令の読み方（全部の edit に共通）

形: `{"kind":"edit<実体>", <プロパティ>, "set":{<欄>:<値>,…}, "clear":[<欄の名>,…]}`

1. **set と clear のどちらか 1 つ以上**を持つ。空の `set`・空の `clear` は書かない（`minProperties: 1`・`minItems: 1`、違えば `malformedRequest`）。
2. **set にも clear にも無い欄は触らない。**
3. **clear はプロパティを消す。任意のプロパティならどれでも clear できる**（JDG-3309: 無い ＝ プロパティを省く、MSPDI と同じ）。必須の欄（いつも値を持つ欄）は clear に載らない。`{"kind":"none"}` は無い —— 「無い」はいつもプロパティの不在で言う。残る状態の kind は「ほかに従う」3 つだけ: `{"kind":"theme"}`（色）、`{"kind":"sameAsScheduleData"}`（viewTimeZone）、`{"kind":"notDecided"}`（scrollPosition）。これらは値なので set で書く。
4. **空の配列は書かない。** 並びを空にするのは clear（プロパティが消える）。名つきの命令が並びを空にするとき（`unpinTaskGroup` で最後の 1 つを外すなど）もプロパティを消す。
5. **同じ欄を set と clear の両方に書けば拒む**（`fieldSetAndCleared`）。
6. **文字の欄に空の字列は書けない**（`minLength: 1`）—— 空にするのは clear。
7. **判定は書いた後の行で行う。** 片方だけ送ってよい。組の規則（IV-9・IV-10・IV-12・IV-19・FX-1・書き直した IV-8）は書いた後の行で判定する。
8. **edit は名指した欄だけを書く。** 例外は 1 つだけ: `editTask` の start・finish が動いたら percentComplete と carry の Manual*／余裕を作り直す（導く値）。第 1 版の fontSizeStep の波及は 2 プロパティが文書から消えて無くなり（JDG-3294）、第 2 版の名の写しは JDG-3315 で撤回した。ほかの欄へ波及させる規則（JDG-3304 の 50 など）は画面が同じ命令の set に入れて送る。刻印と changeLog はいつも動く。
9. 何も変えない edit は受けて、同じ文書を返す。プロパティの指す行が無ければ `notFound`（`field` にプロパティの名）。

---

## B. 欄の表

列: 欄 ｜ set ｜ clear ｜ set のときの規則 ｜ clear のときの規則（＝プロパティが無いときの意味）。「→」の右は拒否の理由の名。

### B.1 `editProject`（プロパティなし）

| 欄 | set | clear | set のときの規則 | clear のときの規則 |
| --- | --- | --- | --- | --- |
| `title` | ○ | ○ | 字列 1〜255 字（JDG-3287） | 画面の文書名と書き出しの名は AT-3 の「無いとき」に従う |
| `name`・`subject`・`category`・`company`・`manager`・`author` | ○ | ○ | 字列 1 字以上。`name` は 255 字（JDG-3287）、ほかは XSD が言わなければ 512 字と仮定 | MSPDI へ書かない |
| `revision` | ○ | ○ | 0 以上の整数 → outOfRange | 同上 |
| `startDate` | ○ | ○ | 日時 → unusableDate | 同上 |
| `statusDate` | ○ | ○ | 日時、受け入れる日の内 → unusableDate | 基準日線を立てない（AT-13） |
| `themeHue` | ○ | × | 整数 0〜359 → outOfRange | - |
| `parentTaskProgressToleranceWorkingDays` | ○ | × | 0 以上の整数 → outOfRange | - |
| `scheduleDataTimeZone` | ○ | × | `$defs/UtcOffset`。換算しない。`viewTimeZone` が `sameAsScheduleData` なら見せる帯もついて行く | - |

書けない: 取り込みだけが書く列、`uidHighWaterMark`・`importSequence`・`sourceFormat`、`weekStartDay`（`replaceCalendarRules`、選んだこと 9）。

### B.2 `editTask`（プロパティ `taskUid`）

| 欄 | set | clear | set のときの規則 | clear のときの規則 |
| --- | --- | --- | --- | --- |
| `name` | ○ | ○ | 字列 1〜512 字。⭐ タスクグループには何も写さない —— 名の無いタスクグループにも（JDG-3315） | 名の無いタスク（JDG-3315）。タスクグループには触れない |
| `notes` | ○ | ○ | 字列 1〜65535 字 | 備考なし |
| `start`・`finish` | ○ | × | 日時 → unusableDate。書いた後に finish が前 → endBeforeStart、フェードが収まらない → fadeLongerThanTask。動いたら percentComplete と carry を作り直す | -（任意のプロパティだが、日付の無いタスクは取り込みで拒む RS-81 ので GRS の中では消さない） |
| `deadline` | ○ | ○ | 日時 → unusableDate | 期限なし |
| `fadeInCalendarDays`・`fadeOutCalendarDays`（JDG-3312 の名を仮定） | ○ | ○ | 0 以上の整数（0 は端を平らにする明示のゼロ）→ outOfRange。finish を要す → fadeWithoutFinish、和が期間（暦日）を超えない → fadeLongerThanTask | 置いていない（矢羽根の端は既定の深さ、FD-5） |
| `parentTaskUid` | ○ | ○ | 指す先が無い → notFound、自分の部分木の中 → wouldMakeCycle。wbsOrder は動かさない | 根のタスク |
| `hyperlinkAddress` | ○ | ○ | URL 1〜512 字（MSPDI の `Task/HyperlinkAddress`）。JDG-3185 の読み方（前後の空白と制御文字を除き、大文字小文字を問わない）で `javascript:`・`vbscript:`・`data:` → hyperlinkSchemeNotAllowed（JDG-3314） | リンクなし |
| `hyperlink` | ○ | ○ | 見出し 1〜512 字（`Task/Hyperlink`） | 見出しなし |

書けない: `uid`、`milestone`（命令が無い。形のプロパティはこれに従う）、`wbsOrder`、実績の 4 列（`placeTaskPlanActual` ほか）、`percentComplete`（導く値）、`dependencies`、`calendarUid`・`resumeValid`・`carry`。

### B.3 `editTaskVisual`（プロパティ `taskUid`）

| 欄 | set | clear | set のときの規則 | clear のときの規則 |
| --- | --- | --- | --- | --- |
| `taskShape` | ○ | × | `rectangle`・`chevron`・`arrow`・`endpointSpan`。マイルストーンでないタスクだけが持つ —— マイルストーンに送れば拒む → milestoneShapeMismatch（FR-083 の乗り換えの禁止を保つ、JDG-3311） | -（持つべき行では必ず持つ） |
| `milestoneShape` | ○ | × | SH-5 の名。マイルストーンだけが持つ —— ほかに送れば拒む → milestoneShapeMismatch | - |
| `fillColor`・`strokeColor` | ○ | ○ | palette・custom・theme（JDG-3310）。書いた後に 2 つともプロパティが無い → fillAndStrokeBothInvisible | 描かない |
| `strokeWidthPx` | ○ | × | 整数 1〜10、既定 1（JDG-3308）。表示倍率 100 の CSS px（JDG-3291） | - |

### B.4 `editTaskGroup`（プロパティ `taskGroupId`）

| 欄 | set | clear | set のときの規則 | clear のときの規則 |
| --- | --- | --- | --- | --- |
| `name` | ○ | ○ | 字列 1〜512 字。表すタスクの名についていかない（JDG-3303） | 名の無いタスクグループ（JDG-3315 —— 拒まない、何も写らない） |
| `color` | ○ | ○ | palette（`ink` を除く）・custom・theme | 帯を塗らない（JDG-3310） |
| `minHeightPx` | ○ | ○ | 1 以上の整数。表示倍率 100 の CSS px、verticalZoomRatio では変わらない（JDG-3291） | 床なし（第 1 版の「0 ＝ 床なし」は JDG-3309 で覆った） |
| `treeState` | ○ | × | `auto`・`collapsed`・`expanded`・`temporarilyExpanded`・`hidden` | - |
| `editGroup` | △ | △ | 字列 1 字以上。⚠️ FR-111 が出来るまで set も clear も断る → notImplemented（選んだこと 8） | 誰でも編集できる |
| `hyperlinkAddress`・`hyperlink` | ○ | ○ | `editTask` と同じ（GRS の任意の列、JDG-3314） | リンクなし |

書けない: `id`、`parentId`・`order`（`moveTaskGroup`・`reorderTaskGroupSiblings`）、`representedTaskUid`（作るときと `deleteTask` だけ）。

### B.5 `editResource`（プロパティ `resourceUid`）

| 欄 | set | clear | set のときの規則 | clear のときの規則 |
| --- | --- | --- | --- | --- |
| `name` | ○ | ○ | 字列 1〜512 字 | 名の無い担当（MSPDI へ書かない） |

### B.6 `editCommentBox`（プロパティ `commentBoxId`）

| 欄 | set | clear | set のときの規則 | clear のときの規則 |
| --- | --- | --- | --- | --- |
| `text` | ○ | ○ | 字列 1〜65535 字 | 本文なし（第 1 版の `""` は JDG-3309 でプロパティの不在へ） |
| `anchor` | ○ | × | 和 `freePoint`（`dateTime`・`taskGroupId`・`bandFraction`）・`task`・`highlightBox`（中は全部必須）。吸着先が無い → notFound、日時 → unusableDate、`bandFraction` → outOfRange | - |
| `bodyOffsetPx` | ○ | × | `{"dx","dy"}` の有限の数 → outOfRange。⚠️ 表示倍率に従うようになる（JDG-3291） | - |
| `strokeColor`・`textColor` | ○ | × | palette・custom・theme。線と字はいつも描く（FR-019 を必須の欄として保つ） | - |
| `strokeWidthPx` | ○ | × | AT-149 の範囲の整数。⚠️ 表示倍率に従う（JDG-3291） | - |
| `fillColor` | ○ | × | palette・custom・theme。箱の塗りはいつも色を持つ（JDG-3276・JDG-3310）。透過率 100 の箱で色を選んだら 50（JDG-3304）は画面が同じ set に入れて送る | - |
| `fillTransparencyPercent` | ○ | × | 整数 0〜100。見えない塗り ＝ 100 | - |
| `fontSizePx` | ○ | × | 整数 8〜24。⚠️ 表示倍率に従う（JDG-3291、JDG-456・464・2895 を表示倍率について覆す） | - |
| `hyperlinkAddress`・`hyperlink` | ○ | ○ | `editTask` と同じ（JDG-3314） | リンクなし |

### B.7 `editHighlightBox`（プロパティ `highlightBoxId`）

| 欄 | set | clear | set のときの規則 | clear のときの規則 |
| --- | --- | --- | --- | --- |
| `firstDay`・`lastDay` | ○ | × | `$defs/Day` → unusableDate。書いた後に逆さ → highlightBoxInverted | - |
| `topTaskGroupId`・`bottomTaskGroupId` | ○ | × | 指す先が無い → notFound。書いた後に逆さ → highlightBoxInverted | - |
| `strokeColor` | ○ | ○ | palette・custom・theme | 枠を描かない（JDG-3310）。透過率 100 なら拒む → fillAndStrokeBothInvisible |
| `strokeWidthPx` | ○ | × | AT-145 の範囲の整数。⚠️ 表示倍率に従う（JDG-3291） | - |
| `fillColor` | ○ | × | palette・custom・theme（いつも色を持つ） | - |
| `fillTransparencyPercent` | ○ | × | 整数 0〜100。書いた後に枠のプロパティが無く 100 → fillAndStrokeBothInvisible | - |

書けない: `cornerRadiusPx`（作るときに S-132 を写す）。

### B.8 `editDocumentSettings`（プロパティなし）

| 欄 | set | clear | set のときの規則 | clear のときの規則 |
| --- | --- | --- | --- | --- |
| `stackDirection` | ○ | × | `up`・`down` | - |
| 真偽 11（`isBaselineVisible`・`isPlanVisible`・`isActualVisible`・`isProgressLineVisible`・`isProgressMarkerVisible`・`isDateGridLinesVisible`・`isGroupGridLinesVisible`・`isAssigneeVisible`・`isPercentCompleteVisible`・`isDependencyVisible`・`isPlanDatesVisible`） | ○ | × | 真偽 | - |
| `fontSizeStep` | ○ | × | `small`・`medium`・`large`（JDG-3295）。目盛の大きさは描く側が導く（JDG-3294） | - |
| `isThemeMonochrome` | ○ | × | 真偽 | - |
| `dayWidthPx` | ○ | × | 数 0.075〜900（1 日の幅、表示倍率 100 の CSS px）→ outOfRange、範囲へ丸めるのは今のまま（JDG-3292） | - |
| `verticalZoomRatio` | ○ | × | 数 1〜240（JDG-3293・3296） | - |
| `taskGroupAutoExpandDepth` | ○ | × | 整数 0〜4（treeState が auto のタスクグループが開く深さ、JDG-3293・3296） | - |
| `scrollPosition` | ○ | × | `{"kind":"notDecided"}` ／ `{"kind":"placed","leftEdgeDay","leftEdgeDayFraction","topEdgeTaskGroupId","topEdgeTaskGroupFraction"}` | - |
| `taskGroupPanelWidthPx` | ○ | × | 0 より大きく、Task Group Area を 0 以下にしない → outOfRange。表示倍率 100 の CSS px（JDG-3291） | - |
| `isTaskGroupPanelWidthFixed` | ○ | × | 真偽 | - |
| `displayScalePercent` | ○ | × | 50・67・75・90・100・110・125・150・175・200（JDG-3292） | - |
| `fitSpan` | ○ | ○ | `{"firstDay","lastDay","isFixed"}`。lastDay が前 → endBeforeStart | 期間なし（固定も無い） |
| `viewTimeZone` | ○ | × | `{"kind":"sameAsScheduleData"}` ／ `{"kind":"fixed","offset"}`。見せる時刻だけ換算する | - |
| `displayTimeZones` | ○ | ○ | `[{"offset","season"}]` 1〜4 個 | 0 個 |
| `isTimeOfDayVisible` | ○ | × | 真偽 | - |
| `levelZeroTreeState` | ○ | × | `auto`・`collapsed` | - |

書けない: `pinnedTaskGroupIds`（`pinTaskGroup`・`unpinTaskGroup`）、`tableViews`（`editTableView`）。`rulerFontSizePx`・`rulerHeightPx` は文書から消える（JDG-3294）。

### B.9 `editTableView`（プロパティ `table`: `searchPanel`・`delayDiagnosticsReport`・`resourceList`）

| 欄 | set | clear | set のときの規則 | clear のときの規則 |
| --- | --- | --- | --- | --- |
| `isScheduleFilterApplied` | ○（3 表） | × | 真偽 | - |
| `shownTaskUids` | ○（`searchPanel`・`delayDiagnosticsReport`） | ○ | uid の並び（1 つ以上）。ほかの表で書けば表ごとの `oneOf` が拒む | 1 つも表示にしていない |
| `shownResourceUids` | ○（`resourceList`） | ○ | uid の並び | 同上 |
| `isUnassignedShown` | ○（`resourceList`） | × | 真偽 | - |
| `columnFilters` | ○（3 表） | ○ | 和 `values`・`dateRange`（所見 50〜52）、列のプロパティは表ごとの enum | フィルタなし |
| `sort` | ○（3 表） | ○ | `{"column","direction"}` | 既定の並び |

---

## C. 拒否の形

今のページの拒否は `{target:"AM-7", reason, stamp, refusals:[{command:"CM-36", rule:"FR-009", reasonCategory?, what}], message}`、取次の拒否は `{target:"relay", reason, stamp:null, refusals:[], what, pageUrl?}`（`mcp-tool-translator.ts:117-121`）。

推す形（`from` で分ける和。持つプロパティは `from` と `reason` で決まり、無いものはプロパティを省く —— JDG-3309 を答えにも当てる）:

```json
{"ok": false, "refusal": {
  "from": "page",
  "member": "applyCommands",
  "reason": "commandRefused",
  "message": "The batch was not applied: command 2 (editTask) set.finish is before set.start.",
  "stamp": {"scheduleUpdatedAt": "…", "documentUpdatedAt": "…", "lastEditedBy": {"kind": "agent", "name": "claude-desktop"}, "fileSavedAt": "…", "grsBuildVersion": "2026-10-19T02:25:08Z"},
  "commandRefusals": [
    {"commandIndex": 2, "kind": "editTask", "field": "set.finish", "reason": "endBeforeStart", "message": "finish 2026-10-01T08:00:00 is before start 2026-10-03T08:00:00"}
  ]
}}
```

```json
{"ok": false, "refusal": {"from": "relay", "member": "readStamp", "reason": "pageNotConnected", "message": "No GRS page is connected to the relay. …", "pageUrl": "http://127.0.0.1:52011/#k=…"}}
```

```json
{"ok": false, "refusal": {"from": "page", "member": "applyCommands", "reason": "commandRefused", "message": "…", "stamp": {…},
  "commandRefusals": [{"commandIndex": 0, "kind": "setTaskName", "reason": "retiredName", "name": "setTaskName", "replacement": "editTask set.name", "message": "setTaskName was retired; send editTask with set.name."},
                      {"commandIndex": 1, "kind": "setExportPngScale", "reason": "retiredName", "name": "setExportPngScale", "message": "setExportPngScale was retired; nothing replaces it."}]}}
```

```json
{"ok": false, "refusal": {"from": "page", "member": "importDocument", "reason": "formatTooOld", "message": "…", "stamp": {…}, "knownSchemaVersion": "…", "converterUrl": "https://goodrelax.github.io/gr-scheduler/…"}}
```

決め事:

- `from` が `relay` の拒否は `stamp` を持たない。
- `commandRefusals` は reason が `commandRefused` のときだけ、`documentFaults`（`[{at, reason, message}]`）は `schemaViolation`・`documentInvalid`・`formatTooNew` のときだけ持つ（空の配列を書かない）。
- 名のある欄（extras）: `pageUrl`、`seconds`、`fileName`、`path`、`folder`、`name`・`replacement?`（retiredName）、`converterUrl`・`knownSchemaVersion`、`taskUids`、`cause`、`at`、`min`・`max`、`field`。今は文の中にだけある値を欄に出す。
- `message` は英語で、行 ID を含めない（今の "AG-10: …"・"BO-1: no frame yet"・"WS-1 refused it; the rule is AG-2"・"(RL-18)"・"past S-125's" は書き直す）。
- 呼ぶ側は知らない `reason` を失敗として扱う（JDG-3301）。

---

## D. 版

### D.1 `agentApiVersion` の指紋を広げる

今の指紋（`tests/contract/cr-822-a-call-shape-change-raises-the-agent-api-version.contract.test.ts` の `fingerprintOf`）は `agent-api-members.json` の `members.rows` と `values.rows` の呼び方のプロパティだけにかかる。足りない所: (1) 命令 —— 値の型は `column: AT-n` で文書の列から写るので、`document-commands.json` を触らずに命令の形が変わる、(2) `externalTypes` の 13 の型の形（刻印・Refusal ほか）、(3) 拒否の理由の語彙（AV-4 は型の名だけ、取次の 5 つは `mcp-relay-server.ts` に手書き）、(4) 退いた名と deprecated の印。

推す広げ方: 指紋 ＝ sha256(JSON{ `members`, `values`, `commands`: 生成した `grs-commands.schema.json` から説明（`description`・`$comment`・`title`・`examples`）を除いたもの, `externalTypes`: 13 の型の生成した形, `reasons`: 原稿に新しく置く理由の一覧（名・層・名のある欄）, `retired`, `deprecated` })。`Document` は `schemaVersion` の持ち物なので入れない。AG-1 の文と `10-versions.md` の `agentApiVersion` の行を同じだけ広げる。CR-851 は拡大縮小の改名（JDG-3292〜3295）もこの 1 度の上げに含む。

### D.2 `"deprecated": true` の置き場

- 原稿: `document-commands.json` の行・形の欄・edit の欄、`agent-api-members.json` の行・引数に `"deprecated": {"replacement": "<代わり>", "since": "<agentApiVersion>"}`。
- 生成物: `grs-commands.schema.json` の `$defs/<kind>`、edit の欄は `$defs/editTask/properties/set/properties/<欄>`、clear の名は `items` を `anyOf` の `const` に分けた枝に。説明の頭に "Deprecated: use <代わり>."。
- MCP の道具: Tool に deprecated の欄は無いので説明の頭の 1 文と、引数の `inputSchema.properties.<引数>` に `"deprecated": true`。
- リリースノートに一覧。⭐ CR-851 では使わない（公式運用の前は猶予なしで退いた名へ直行、JDG-3301）。仕組みだけ作る。

### D.3 退いた名の専用の理由

- **`retiredName`**（`name` と、代わりがあるときだけ `replacement`）。第 1 版は `removedName` を分けていたが、JDG-3309 で「無い ＝ プロパティを省く」が全体の作法になったので 1 つに畳んだ。
- 原稿: `document-commands.json` の `retired` を `{"id","name","replacement"?}` の並びへ（今は番号だけ）。`agent-api-members.json` にも `retired` を足す。
- 命令: 束を読む最初に kind・edit の欄の名を退いた名と照らし（スキーマの検査より前）、当たれば束を `commandRefused` で拒み `commandRefusals` に `retiredName`。道具: 取次が道具の名を照らし `from: "relay"` の拒否で返す（今は JSON-RPC の "Unknown tool"）。
- CR-851 で一覧に入る名は 72。退く欄の名も入る（例 `shapeKind` → `taskShape`／`milestoneShape`、`milestoneGlyph` → `milestoneShape`、`zoomX` → `dayWidthPx`、`zoomY` → `verticalZoomRatio`・`taskGroupAutoExpandDepth`、`displayScale` → `displayScalePercent`、`fadeInDays` → `fadeInCalendarDays`、`rulerFontSizePx`・`rulerHeightPx` → 代わりなし）。

### D.4 造りの版を答えの刻印に

- Agent API が手渡す刻印（`readStamp`、答えの `stamp`、`watchChanges` の知らせ）に `grsBuildVersion`（答えたページの造りの版）を足す。型は表 T-400 の新しい行 `AgentStamp` とし指紋に入る。
- `expectedStamp` の照合は全部のプロパティの等値のまま（推す）。照合から外す案もある（選んだこと 15）。
- 文書の最上段の「書いた造りの版」（並行の席の `doc-shape-map.tsv` は `buildVersion`）とは意味が違うので名を分ける。

### D.5 書き出しの説明（E-20・E-21、JDG-3290）

`agent-api-members.json` の `exportSvg`（AM-13）・`exportPng`（AM-14）の en を E-20・E-21 の文にする: 全体表示時の期間を固定していれば絵は文書だけで決まり、そうでなければ人の画面を 1920 px 幅に縮めたもので、ブラウザの倍率・OS の表示倍率・窓の大きさに従う（ページはそれを読めない）。PNG は 1920 px 幅。呼び方は変えない（説明だけ）ので指紋は動かない。`schemaNotes` に E-22 の「Sizes」の段を足し、今の `setCommentBoxFontSizePx` と null の言い回しを直す。

---

## E. 範囲の外で見つけた、外へ出る行 ID

- `AgentImportOutcome.asked` が `'U-61'`・`'QN-17'` —— 名にする（例 `mergeChoice`・`openFile`）。
- `AgentTableColumn.id`（`SQ-1` ほか）と `AgentTableCell.column`（`DT-1`・`RQ-1` ほか）—— 所見 50 の列のプロパティと同じ名にする。
- 画面の通知の語（`display-words.json`）は RS-・IV- で引く —— 画面も名で引くかは CR の判断。
- 依頼文の第 1 版の例「形を milestone にすると Task.milestone も揃う」は src と違った（今は `FR-083` で拒む）。JDG-3311 もその拒否を保つ。
- `deleteTaskGroup` の `newTaskGroupId` は今の編集が読まない値 —— 外す。

---

## F. 選んだこと（覆してよいもの）

1. **名つきで残す命令は set・clear で始めない** —— `placeTaskPlanActual`・`changeDependencyLag`・`replaceCalendarRules`（行のレビューで問う）。
2. **`setTaskParentTask` は `editTask` の `parentTaskUid` に畳んだ**（行のレビューで問う）。
3. **edit は名指した欄だけを書く。** JDG-3304 の 50 と JDG-3276 の透明の見本は画面の規則。
   3b. （第 2 版の「JDG-3313 の一度だけの写しを命令の規則に」は JDG-3315 で撤回 —— GRS はタスクの名をタスクグループへ写さない。）
4. **`fitScheduleToScreen` を `editDocumentSettings` に畳んだ**（行のレビューで問う）。
5. **組の欄は片方だけ送ってよく、書いた後の行で判定する。**
6. （第 1 版の「clear は C3 だけ」は JDG-3309 で消えた。）
7. **文字の欄はどれも空の字列を取らない**（空 ＝ clear）。第 1 版の「C1 の文字の欄は `""` を取る」は JDG-3309 で消えた —— `CommentBox.text` も任意のプロパティにした（並行の席の文書の表と合わせて確かめる）。
8. **`editGroup` は `editTaskGroup` に置き、FR-111 まで `notImplemented` で断る**（行のレビューで問う）。
9. **`weekStartDay` は `replaceCalendarRules` に残した。**
10. **取り込みの検証の拒否は上を `documentInvalid` 1 つにした**（行のレビューで問う）。
11. （第 1 版の retiredName／removedName の分割は JDG-3309 で畳んだ。）
12. **今の `commandRefused` の別の使い方に名を足した**（`historyEmpty`・`nothingToIssue`・`importNotLanded`）。
13. **`RS-64` → `formatTooNew`、新しく `formatTooOld`（`converterUrl` 付き）。**
14. **拒否の形を `from`（page／relay）の和にし、`target` を `member` に、`refusals` を `commandRefusals`・`documentFaults` に分けた。**
15. **`grsBuildVersion` は手渡す刻印の中に入れ、照合に含めた。**
16. **指紋に命令の生成スキーマと `deprecated` の印を入れた。**
17. **`createHighlightBox` の `range` の包みを外し、文書の欄の名に揃えた。**
18. （第 1 版の「最初の命名で写す案を問いたい」は JDG-3313 で一度決まり、JDG-3315 で「写さない」に覆った。）
19. **`deleteTaskGroup` から `newTaskGroupId` を外した。**
20. **`changeDependencyLag` の 2 つの形を値の kind の和にし、単位を `day`・`hour`・`minute` にした**（「無い」の kind ではないので JDG-3309 に反しない）。
21. **`cycleTaskPlanActualState` の `remembered` の null はプロパティを省く。**
22. **`tableViews` を表の名をプロパティにした実体と読み、`editTableView` を足した。**
23. **`setScheduleDataTimeZone` の「同じ書き込みで送れ」は画面の規則にした。**
24. **理由の名（66）は全部私が付けた。**
25. （第 2 版の「書き直した IV-8 を保つ」は JDG-3315 で撤回。名も表すタスクも無いタスクグループを許し、`deleteTask` は名を書かない。タスクグループを全部消したら `deleteTaskGroup` が "Untitled" の最上段のタスクグループを 1 つ作る —— IV-20 を保つため。）
26. **`TaskGroup.minHeightPx` の「床なし」はプロパティの不在に戻した**（第 1 版の 0 は JDG-3309 で覆る）。set は 1 以上。
27. **`start`・`finish` は任意のプロパティだが clear を取らない**（RS-81 で日付の無いタスクを取り込まないので）。
28. **コメントボックスの `strokeColor`・`textColor` は必須の欄にした**（今の FR-019「線と字は透明にできない」を保つ）。JDG-3310 の「色は省けば描かない」をここにも当てて任意にする案もある。

## G. 仮定した名（並行の席の文書の表 `doc-shape-map.tsv` は同じ裁定で書き直し中 —— 決まった名に合わせる）

第 2 版で JDG-3309 により和をやめたプロパティ: `parentTaskUid`（Task、今の名に戻る）、`parentId`（TaskGroup、今の名のまま —— doc-shape-map に揃えた）、`representedTaskUid`（所見 27 の名）、`editGroup`（字列）、`fadeInCalendarDays`・`fadeOutCalendarDays`（JDG-3312 の Alias）、`fitSpan`（組 `{firstDay,lastDay,isFixed}`）、`hyperlinkAddress`・`hyperlink`（JDG-3314、doc-shape-map にはまだ無い —— MSPDI の `Task` の名に倣った）、`sort`（組 `{column,direction}`）、`fileSavedAt`（刻印、今の名に戻る）。JDG-3311 の `taskShape`・`milestoneShape`。そのほか `parentTaskProgressToleranceWorkingDays`（所見 16）、`firstDay`・`lastDay`・`$defs/Day`、`newStartDay`（私の仮定）、`scrollPosition` の `leftEdgeDay` ほか、`anchor.freePoint.dateTime`、`$defs/UtcOffset` と `{offset, season}`、`documentUpdatedAt`。拡大縮小の名は JDG-3290〜3297 のとおり（`dayWidthPx`・`verticalZoomRatio`・`taskGroupAutoExpandDepth`・`displayScalePercent`、`fontSizeStep` の `small`／`medium`／`large`、`rulerFontSizePx`・`rulerHeightPx` を消す）。
