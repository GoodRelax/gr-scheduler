# GRS JSON と MSPDI の語を用語集に当てる — 第 2 段

読んだもの: CR-851 後の形（`doc-shape-map.tsv` の `element_new` / `type_new` / `description_new`）、
スキーマの頭の文（`spec-rows-map.tsv` の `ROOT_DESCRIPTION` の `new`）、MSPDI の公式スキーマ（`mspdi_pj12.xsd` の要素名と行番号だけ）、
第 1 段の `1-glossary-terms.tsv`。2026-10-26 の裁定 JDG-3348（Leader Line / Leader Anchor・View・Time Axis・Task Graphic、
Shape / Graphic / Glyph の使い分け、`kind` は oneOf の札だけ）は、もう決まったものとして扱った。

- 語ごとの全部は `2-json-mspdi-map.tsv`（526 行）にある。数はすべてスクリプトで数えた。
- 印: **match** 用語集の行と同じ / **alias** 同じものを別の名で呼ぶ / **missing** 行が無い / **clash** 別のものと同じ語 / **mspdi-only** MSPDI の名を「Same as MSPDI X」で借りるだけ。
- 「古い名」は、用語集が CR-851 より前の綴りのままの行を指す。

数え方:
- json-property は beta の形の `properties` の葉を名ごとに 1 行。`count` はその名が何か所に出るか（`name` は 10 の持ち主）。
- json-enum は `type_new` の `enum a|b|c` を割った値。`enum 5 states`・`enum 15 glyphs`・`enum 8 points` は beta が値を並べていないので、今のスキーマ（`grs-document.schema.json`）の値を使い、その旨を `where` に書いた。`ColumnKey` の値と `UtcOffset` の 27 個は語でないので数えていない。
- json-prose は `description_new`（-以外の 299 件）と頭の文で、名詞句を長いものから順に数え、数えた所は消して二重に数えないようにした（「task group panel」を数えたあとで「task group」を数える）。動詞の import なども混ざる。
- mspdi は「Same as MSPDI X」の X（80 行が使う）と、それ以外に名指す MSPDI の要素名。行番号は xsd の要素の宣言の行。

## 1. GRS JSON の形（実体まで）

`( )` は用語集に行が無いもの。`→` のあとは MSPDI の名。

```
(文書) ※行なし                             説明文で 48 回「document」
├─ $schema  ※行なし                         title "Address of this schema"
├─ schemaVersion  ※行なし                   title "Version of the shape" ← shape が Shape と衝突
├─ buildVersion  ※行なし                    title "GRS build that wrote the file"
├─ schedule  ※行なし                        title "Schedule data"
│  ├─ project: Project (N-8)                → Project
│  │  └─ passthroughValues / passthroughElements (N-7 は古い名 carry / carryElements)
│  ├─ calendars[]: Calendar (N-9)           → Calendars / Calendar
│  │  ├─ weekDays[]: WeekDay ※MSPDI のみ    → WeekDay
│  │  │  └─ workingTimes[]: WorkingTime ※MSPDI のみ
│  │  └─ exceptions[]: Exception ※MSPDI のみ → Exception（fromDate / toDate は TimePeriod を 1 段つぶした）
│  │     └─ workingTimes[]: WorkingTime
│  ├─ tasks[]: Task (N-1)                   → Tasks / Task
│  │  ├─ parentTaskUid (P-22) + siblingOrder ※行なし → MSPDI では OutlineLevel / OutlineNumber / ID
│  │  ├─ fadeInCalendarDays / fadeOutCalendarDays (P-21 は古い名 fadeInDays) → Task/ExtendedAttribute
│  │  └─ dependencies[]: Dependency (N-12)  → PredecessorLink
│  ├─ resources[]: Resource (N-10)          → Resources / Resource
│  ├─ assignments[]: Assignment (N-11)      → Assignments / Assignment
│  ├─ taskGroups[]: TaskGroup (N-2)         MSPDI に書かない
│  │  ├─ treeState (N-26)   color: (BandColor)   editGroup ← group が衝突
│  │  └─ representedTaskUid ※行なし（WBS のどのタスクを表すか）
│  ├─ taskGroupMembers[]: TaskGroupMember (N-3)
│  ├─ taskVisuals[]: TaskVisual (N-13)
│  │  ├─ taskShape (P-10 は古い名 shapeKind)   milestoneShape (P-16 は古い名 milestoneGlyph)
│  │  └─ fillColor / strokeColor: (Color)  strokeWidthPx (P-18)
│  ├─ taskOrigins[]: TaskOrigin (N-14)      MSPDI に対応なし
│  ├─ baselineTasks[]: (BaselineTask) ※行なし（文では earlier plan）
│  ├─ commentBoxes[]: CommentBox (N-5)
│  │  └─ anchor: CommentBoxAnchor (JDG-3348 Leader Anchor)  kind freePoint | task | highlightBox
│  │     ├─ figure (JDG-3348 では Task Graphic) plannedBar | actualBar | milestone
│  │     └─ fallback: (AnchorFallback)
│  └─ highlightBoxes[]: HighlightBox (N-6)  firstDay / lastDay（もとは start / finish）
├─ documentSettings  ※行なし                title "How the schedule is drawn when opened"
│  ├─ displayScalePercent (K-125 古い)  fontSizeStep (K-85)  dayWidthPx (K-67 古い zoomX)
│  ├─ verticalZoomRatio (K-68 古い zoomY)  taskGroupAutoExpandDepth ※行なし
│  ├─ scrollPosition ※行なし  kind notDecided | placed
│  │  └─ leftEdgeDay / leftEdgeDayFraction / topEdgeTaskGroupId / topEdgeTaskGroupFraction
│  │     (K-69 / K-121 / K-70 / K-120 は古い名 scrollDate ほか)
│  ├─ fitSpan { firstDay, lastDay, isFixed } (K-141 / K-142 古い)
│  ├─ viewTimeZone (K-144) kind sameAsScheduleData | fixed   displayTimeZones (K-145)
│  ├─ is…Visible 12 個 (K-75〜K-84・K-122〜K-124・K-146)  stackDirection (K-73)
│  ├─ isThemeMonochrome (K-61)  taskGroupPanelWidthPx (K-71)  isTaskGroupPanelWidthFixed (K-143)
│  ├─ levelZeroTreeState (K-138)  pinnedTaskGroupIds (K-110)
│  └─ tableViews ※行なし
│     ├─ searchPanel (U-64) / delayDiagnosticsReport (U-66) / resourceList (U-49)
│     └─ 各表: isScheduleFilterApplied (U-67 は帯だけ)・shown…Uids・columnFilters[]: (ColumnFilter)・sort: (ColumnSort)
├─ documentStamp: (DocumentStamp) ※行なし   title "Last change, last save and last writer"
│  └─ scheduleUpdatedAt / documentUpdatedAt / fileSavedAt (U-59) / lastEditedBy: (Writer)
└─ changeLogEntries[]: (ChangeLogEntry) ※行なし  title "Notes on changes"
共有の型（すべて行なし）: Day・DateTime・Time・UtcInstant・UtcOffset・Color・ColorSide・BandColor・ColumnKey
持ち回り（N-7 の古い名のまま）: PassthroughValues・PassthroughElement
```

実体（$defs）34 のうち、用語集の行にそのまま当たるのは 11（N-1〜N-14 の 11 行）。
共有の型・印（stamp）・変更の記録・表の形の 16 は行が無い。

## 2. MSPDI の要素と GRS JSON の名

80 か所の「Same as MSPDI X」のうち、名を lowerCamel に直しただけのものが大半である。名が変わるものと、文だけで名指すものを載せる。

| MSPDI の要素（xsd の行） | GRS JSON の名 | 用語集 | 印 |
| --- | --- | --- | --- |
| `Project` (225) | `schedule.project` / `Project` | N-8 | match |
| `Calendars` / `Calendar` (1198 / 1204) | `calendars` / `Calendar` | N-9 | match |
| `WeekDay` (1241)・`Exception` (1331)・`WorkingTime` (1295) | 同じ名 | 行なし | mspdi-only |
| `Tasks` / `Task` (1598 / 1604) | `tasks` / `Task` | N-1 | match |
| `Resources` / `Resource` (2486 / 2492) | `resources` / `Resource` | N-10 | match |
| `Assignments` / `Assignment` (3185 / 3191) | `assignments` / `Assignment` | N-11 | match |
| `Task/PredecessorLink` (2162) | `Task.dependencies` / `Dependency` | N-12 | **alias** |
| `PredecessorLink/Type` (2173) | `Dependency.linkType` | P-23 | match |
| `Project/UID` (238) | `Project.id`（ほかの UID はみな `uid`） | 行なし | **alias** |
| `UID`（Task 1610 ほか） | `uid`・`taskUid`・`sourceUid` など | 行なし | alias |
| `Exception/Type` (1376) | `Exception.recurrenceKind` | 行なし | **alias** |
| `Exception/Period` (1394) | `Exception.recurrencePeriod` | 行なし | **alias** |
| `Exception/TimePeriod/FromDate`・`ToDate` (1348 / 1353) | `Exception.fromDate`・`toDate` | 行なし | alias |
| `Resource/Type` (2518) | `Resource.resourceKind` | 行なし | **alias** |
| `Task/ID` (1615) | 持たない。`parentTaskUid` + `siblingOrder` から作る | 行なし | alias |
| `Task/OutlineNumber` (1672) | 同上（`siblingOrder` が兄弟の順） | 行なし | **alias** |
| `Task/OutlineLevel` (1682) | 同上・`Project.firstOutlineLevel` が始まりの段 | P-22 | alias |
| `Task/Summary` (1787) | 持たない。子があるかで作る | 行なし | mspdi-only |
| `Task/ExtendedAttribute` (2248) | `fadeInCalendarDays`・`fadeOutCalendarDays` を書く先 | P-21（古い名） | alias |
| `Task/WBS` (1662) | 使わない。GRS は「WBS」を親子の木の意味で使う（説明文 6 回、型の欄も入れて 8 回） | 行なし | **clash** |
| `Project/Title` (258) | `Project.title`（画面の名は Document Title） | U-27 | alias |
| `Project/StatusDate` (662) | `Project.statusDate`（これから U-11 Status Line を引く） | 行なし | missing |

GRS JSON が名を持つ子要素の数（xsd の直下の子のうち）: `Project` 19 / 70、`Task` 18 / 96、`Resource` 5 / 71、
`Calendar` 6 / 7、`Assignment` 3 / 265（多くはカスタムフィールドの符号）。残りは `passthroughValues` / `passthroughElements` で持ち回る。

逆に MSPDI に無い GRS だけの名: `taskGroups` 以下の 7 配列すべて・`documentSettings`・`documentStamp`・`changeLogEntries`、
`Project` の `scheduleDataTimeZone`・`themeHueDegrees`・`parentTaskProgressToleranceWorkingDays`・`highestIssuedUid`・`lastImportNumber`・`firstOutlineLevel`・`sourceFormat`、
それに 5 つの実体の `ordinal`。`hyperlinkAddress` / `hyperlink` は `Task` では MSPDI の名で、`TaskGroup`・`CommentBox` には GRS が足した。

## 3. ほころび

### 印ごとの数（語の行の数）

| 層 | match | alias | missing | clash | mspdi-only | 計 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| json-property | 55 | 32 | 64 | 4 | 33 | 188 |
| json-def | 11 | 4 | 16 | 0 | 3 | 34 |
| json-enum | 23 | 13 | 35 | 3 | 0 | 74 |
| json-title | 0 | 1 | 5 | 1 | 0 | 7 |
| json-prose | 44 | 21 | 53 | 19 | 0 | 137 |
| mspdi | 22 | 14 | 1 | 1 | 48 | 86 |
| **計** | **155** | **85** | **174** | **28** | **84** | **526** |

用語集が CR-851 より前の綴りのままの行は **24 行**（N-1・N-7・P-10・P-15・P-16・P-17・P-19・P-21・K-1・K-4・K-60・K-67・K-68・K-69・K-70・K-86・K-105・K-118・K-120・K-121・K-125・K-140・K-141・K-142）と、
名の決まりを書いた 1 か所（tbl-glossary.md 325 行「スクロール位置の名前は `scrollDate` と `scrollTaskGroupId` とし」）。
TSV の note に `stale:` と書いた語は 40。

### 大事な 15 件

1. **「document」に行が無い（文で 48 回）。** 第 1 段の 1 番と同じ穴が JSON 側でいちばん多く出る。`documentSettings`・`documentStamp`・`DocumentStamp.documentUpdatedAt` も名に持つ。
2. **持ち回りの語が 2 つ。** 用語集 N-7 は `carry` / `carryElements`、JSON の名は `passthroughValues` / `passthroughElements`（8 つの実体に 1 つずつ）、なのに説明文と頭の文は「Carried」を 19 回使い、頭の文が「"Carried" means …」と定義する。K-118 `carryMaxDepth` も古い。
3. **形の名が古く、Glyph が衝突。** P-10 `shapeKind`（5 値、milestone を含む）は `taskShape`（4 値）に、P-16 `milestoneGlyph` は `milestoneShape` になった。P-16 は 15 値のうち 8 値しか挙げない。そのうえ `milestoneShape` の説明は「Glyph of a milestone」で、Glyph はアイコンの絵だけ（JDG-3348）という裁定とぶつかる。
4. **Task Graphic の語が JSON に入っていない。** `CommentBoxAnchor.figure` の値は `plannedBar | actualBar | milestone`、`verticalZoomRatio` の説明は「task figures」。裁定の名は Task Graphic = Plan Bar（U-3）・Actual Bar・Milestone Mark で、figure / planned / milestone の 3 つがずれる。
5. **「table」「column」「row」に行が無い（29・19・20 回）。** 3 つの表（`tableViews`）の語がまるごと無い。しかも row は「タスクグループの 1 行（チャートの帯）」と「表の 1 行」と「(no assignee) の行」の 3 つを指す（clash）。checked row・show column・column filter（6・3・6 回）も無い。
6. **「chart」に行が無い（16 回）。** 用語集は画面に出ない構造名の U-32 Schedule Canvas・U-50 Task Group Area しか持たない。View（JDG-3348）は決まったが、チャートそのものの名が無い。
7. **スクロール位置の名の決まりが CR-851 と逆。** 325 行の決まりは `scrollDate` / `scrollTaskGroupId` を守れと書くが、JSON は `scrollPosition` の `leftEdgeDay` / `topEdgeTaskGroupId` に変えた。K-69・K-70・K-120・K-121 と U-51 の並べたキーも古い。
8. **`id` と `uid`。** MSPDI の `UID` はふつう `uid` になるのに、`Project/UID` だけ `Project.id`（16 字までの文字列）になり、`TaskGroup.id` などの uuid と同じ名になる。`uid`（16 回）・`id`（6 回）とも行が無い。
9. **木の位置の名が JSON と MSPDI で違う。** JSON は `parentTaskUid` + `siblingOrder`（`TaskGroup` にも `siblingOrder`）、MSPDI は `OutlineLevel`・`OutlineNumber`・`ID`。`siblingOrder` に行が無く、P-22 だけがある。`firstOutlineLevel` は MSPDI の語を残す。
10. **WBS が MSPDI と衝突。** GRS は「WBS is the tree of parent and child tasks」と定義して説明文で 6 回（型の欄も入れて 8 回）使うが、MSPDI の `Task/WBS`（1662 行）は木ではなく 1 つのタスクの符号の欄である。用語集にも WBS の行が無い。
11. **ズームの語が古い。** K-67 `zoomX`・K-68 `zoomY` は `dayWidthPx`・`verticalZoomRatio` になり、K-1・K-4 も「`zoomX` = 1」と書く。説明文には zoom がまだ 5 回、vertical zoom が 1 回ある。
12. **色の語。** P-19 `'transparent'` は消え、色は `Color`（`theme | palette | custom`、無ければ描かない）と `fillTransparencyPercent` になった。`Color`・`BandColor`・`ColorSide` に行が無い。palette（palette color 4 回、enum `palette`）は U-26 Command Palette・U-34 Palette Groups と同じ語である。
13. **吹き出しの先の語が足りない。** tip（13 回）は引出線の先と矢羽根の先（`fadeOutCalendarDays` の chevron tip）の 2 つを指す。free point（4）・target（4）・fallback（2）・`bandFraction` も行が無い。Leader Line / Leader Anchor は決まったが、JSON の名は `anchor` / `CommentBoxAnchor`。
14. **同じ操作が 2 つの名。** 「Fit to screen」（`dayWidthPx`・`fitSpan`・`isFixed` で 3 回）と「Zoom to Fit」（`treeState` で 1 回）。どちらも用語集に行が無い。
15. **前の計画の語が無い。** `baselineTasks` / `BaselineTask` は文で「earlier plan」「the plan as it was before」（8 回）。用語集には K-84 `isBaselineVisible` だけで、第 1 段の「変更前の予定」とも結べない。

### そのほか（数だけ）

- 1 語が 2 つ以上を指す（clash）: outline（棒の輪郭・前の計画を輪郭で描く・MSPDI の OutlineLevel、4 回）・step（文字サイズの段とタスクグループの段の高さ、2 回）・depth（タスクグループの深さと矢羽根の切り欠きの深さ、7 回）・span（稼働の時間帯・fit span・`endpointSpan`、7 回）・point（つく点・free point・時刻、10 回）・title（Project.title・タスクグループの見出し・リンクの見出し、8 回）・`source`（色の chosen / derived と、取り込み元の `sourceUid` など）・`editGroup`（編集できる人の group で、タスクグループではない）・title の「shape」（スキーマの形）・rectangle（形の値とハイライトボックスの説明）・arrow（第 1 段の 7 番）。
- 名の言い換え（alias）: panel border ⇔ U-24 Panel Divider・task name label ⇔ U-7 Name Label・lines between task groups ⇔ U-18 Group Grid Lines・outline / border / frame ⇔ P-18 の stroke・extra clock ⇔ K-145 `displayTimeZones`・`plannedBar` ⇔ U-3 Plan Bar。
- 古い名（上の 15 件にないもの）: `displayScale` → `displayScalePercent`（K-125）、`fontSizeStepSizes.S/M/L` → `small / medium / large`（K-105）、`themeHue` → `themeHueDegrees`（K-60、置き場も `Project` に移った）、`importSequence` → `lastImportNumber`・`lastSeenImportNumber`（K-86）、`parentTaskProgressToleranceDays` → `…WorkingDays`（K-140）、`fitSpanStart / Finish`・`isFitSpanFixed` → `fitSpan.firstDay / lastDay / isFixed`（K-141・K-142）、`fadeInDays / fadeOutDays` → `…CalendarDays`（P-21）。
- 多く使うのに行が無いもの: file 29・exception 16・CSS pixel 11・working day 11・person 9・schedule 8 + schedule data 6・link 7・screen 7・band 6 + task group band 3・lag 6・weekday 6。
- MSPDI の名を借りるだけ（mspdi-only）の JSON の名は 33（`subject`・`company`・`weekDays`・`dayType` など）。用語集はこれらを持たなくてよいが、`statusDate`・`linkLag`・`calendarUid` のように GRS の動きを決めるものは行が要る。

## 4. 用語集に足す・直す候補

すでに使っている語から名を取った。日本語は第 1 段で用語集が使っている語に合わせた。

| 種類 | 英語 | 日本語 | もとにした所 |
| --- | --- | --- | --- |
| 足す | Document | 文書 | 説明文 48 回・`documentSettings`・用語集 23 行 |
| 足す | Chart | チャート | 説明文 16 回（U-32 / U-50 の画面の名として） |
| 足す | Task Group Band | タスクグループの帯 | 「task group band」・`BandColor`・`bandFraction` |
| 足す | Table / Column / Row | 表 / 列 / 行 | `tableViews`・`columnFilters`・checked rows |
| 足す | Schedule Filter / Column Filter | スケジュールフィルタ / 列のフィルタ | `isScheduleFilterApplied`・`columnFilters`（U-67 は帯のまま） |
| 足す | Baseline Task（文では Earlier Plan） | 変更前の予定 | `baselineTasks`・K-84・第 1 段の C |
| 足す | Document Stamp / Change Log Entry | 文書の印 / 変更の記録 | `documentStamp`・`changeLogEntries` |
| 足す | Sibling Order | 兄弟の順 | `Task.siblingOrder`・`TaskGroup.siblingOrder`（MSPDI の OutlineNumber に当たると書く） |
| 足す | WBS | WBS（訳さない） | 頭の文の定義。MSPDI の `Task/WBS` の欄とは別と書く |
| 足す | Status Date | 基準日 | `Project.statusDate`（U-11・X-5 が使う） |
| 足す | Color（theme / palette / custom） | 色（テーマ色 / パレット色 / 指定色） | `Color`・`BandColor`。palette は Command Palette と別と書く |
| 足す | Free Point / Leader Tip / Fallback | 自由な点 / 引出線の先 / 戻り先 | `CommentBoxAnchor`・`AnchorFallback`。chevron の tip とは分ける |
| 直す | `carry` / `carryElements` → `passthroughValues` / `passthroughElements`（N-7） | そのまま持ち回る値 / 要素 | 頭の文の「Carried」もどちらかにそろえる |
| 直す | `shapeKind` → `taskShape`（P-10、4 値）・`milestoneGlyph` → `milestoneShape`（P-16、15 値） | タスク形状 / マイルストーン形状 | 説明文の「Glyph of a milestone」は Shape に直す |
| 直す | `'transparent'`（P-19）を消す | — | 「無ければ描かない」と `fillTransparencyPercent` に置き換え |
| 直す | `fadeInDays` / `fadeOutDays` → `fadeInCalendarDays` / `fadeOutCalendarDays`（P-21） | フェードイン日数 / フェードアウト日数 | 暦日であることを名が言う |
| 直す | K-67 `zoomX` → `dayWidthPx`・K-68 `zoomY` → `verticalZoomRatio`・K-125 → `displayScalePercent` | 1 日の幅 / 縦の倍率 / 表示の倍率 | K-1・K-4 の「`zoomX` = 1」も直す |
| 直す | K-69・K-70・K-120・K-121 と 325 行の決まり → `scrollPosition.leftEdgeDay` ほか | 表示の左端の日 / 上端のタスクグループ | U-51 の並べるキーも直す |
| 直す | K-60・K-86・K-105・K-140・K-141・K-142 を CR-851 の名に | — | 上の「古い名」の一覧 |
| 決める | Fit to screen と Zoom to Fit をどちらか 1 つに | 全体表示 | K-141「全体表示時の期間」が使う語 |
| 決める | `CommentBoxAnchor.figure` / `plannedBar` を Task Graphic / Plan Bar にそろえるか | 予定バー / 実績バー / マイルストーンの印 | JDG-3348 |
