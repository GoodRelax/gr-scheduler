# GRS JSON のキー名の裁定 —— 1 枚目（全部のキーの木）

2026-10-27 に作った紙です。β の GRS JSON の形（`CR-851` を当てた後。`doc-shape-map.tsv` の `element_new`）のキー名だけを見ます。説明文は見ません。

- 木の名を直したいときは、その行に ★ を付けて直に書き換えてください。下の問は、用語の裁定（`terms/3-sheet1-questions.md`、`JDG-3351`〜`JDG-3379`）とぶつかるキーだけを集めたものです。
- 回答: の後に A・B などの字か自由な文を書き、保存してから席に一声ください。
- この紙は初めての版なので、🔄 は付けていません。次の版から、変わった所に付けます。前の版は `old/` に置きます。

---

## 決まったこと

| 問 | 決め | 裁定 |
|---|---|---|

---

## 全体の木

299 個のキー（行）です。右の欄: `← 古い名`（今のスキーマから名が変わるもの）、`MSPDI`（MSPDI と同じ名と意味。MSPDI の名に合わせるので、ふつうは変えない）、`問 N`（下の問で問うもの）。`(kind x)` は、`kind` の値で形が分かれるときの、その形の中のキーです。

**文書の木**（スキーマのいちばん上から）

```text
   $schema
   schemaVersion
   buildVersion
   schedule                           問 1
   +- project                         MSPDI
   +- calendars                       MSPDI
   +- tasks                           MSPDI
   +- resources                       MSPDI
   +- assignments                     MSPDI
   +- taskGroups
   +- taskGroupMembers
   +- taskVisuals                     問 5
   +- taskOrigins
   +- baselineTasks
   +- commentBoxes
   +- highlightBoxes
   documentSettings
   +- displayScalePercent             ← displayScale
   +- fontSizeStep
   +- dayWidthPx                      ← zoomX
   +- verticalZoomRatio               ← zoomY
   +- taskGroupAutoExpandDepth
   +- scrollPosition
   |  +- (every kind)
   |  |  +- kind
   |  +- (kind placed)
   |     +- leftEdgeDay               ← scrollDate
   |     +- leftEdgeDayFraction       ← scrollDateFraction
   |     +- topEdgeTaskGroupId        ← scrollTaskGroupId
   |     +- topEdgeTaskGroupFraction  ← scrollTaskGroupFraction
   +- fitSpan
   |  +- firstDay                     ← fitSpanStart
   |  +- lastDay                      ← fitSpanFinish
   |  +- isFixed                      ← isFitSpanFixed
   +- viewTimeZone
   |  +- (every kind)
   |  |  +- kind
   |  +- (kind fixed)
   |     +- offset
   +- displayTimeZones
   |  +- offset
   |  +- season
   +- isTimeOfDayVisible
   +- isPlanVisible                   問 3
   +- isPlanDatesVisible
   +- isActualVisible                 問 3
   +- isPercentCompleteVisible        問 3
   +- isBaselineVisible               問 3
   +- isProgressLineVisible
   +- isProgressMarkerVisible         問 3
   +- isDependencyVisible             問 3
   +- isAssigneeVisible               問 3
   +- isDateGridLinesVisible
   +- isGroupGridLinesVisible
   +- stackDirection
   +- isThemeMonochrome
   +- taskGroupPanelWidthPx
   +- isTaskGroupPanelWidthFixed
   +- levelZeroTreeState
   +- pinnedTaskGroupIds
   +- tableViews
      +- searchPanel                  問 4
      |  +- isScheduleFilterApplied
      |  +- shownTaskUids
      |  +- columnFilters
      |  +- sort
      +- delayDiagnosticsReport       問 4
      |  +- isScheduleFilterApplied
      |  +- shownTaskUids
      |  +- columnFilters
      |  +- sort
      +- resourceList                 問 4
         +- isScheduleFilterApplied
         +- shownResourceUids
         +- isUnassignedShown
         +- columnFilters
         +- sort
   documentStamp
   changeLogEntries                   ← changeLog
```

**型の木**（`$defs`。文書の木から名指される型）

```text
   Project                                    MSPDI
   +- id                                      MSPDI
   +- calendarUid                             MSPDI
   +- name                                    MSPDI
   +- title                                   MSPDI
   +- subject                                 MSPDI
   +- category                                MSPDI
   +- company                                 MSPDI
   +- manager                                 MSPDI
   +- author                                  MSPDI
   +- revision                                MSPDI
   +- creationDate                            MSPDI
   +- startDate                               MSPDI
   +- statusDate                              MSPDI
   +- scheduleDataTimeZone
   +- minutesPerDay                           MSPDI
   +- minutesPerWeek                          MSPDI
   +- daysPerMonth                            MSPDI
   +- weekStartDay                            MSPDI
   +- defaultStartTime                        MSPDI
   +- defaultFinishTime                       MSPDI
   +- themeHueDegrees                         ← themeHue
   +- parentTaskProgressToleranceWorkingDays  ← parentTaskProgressToleranceDays
   +- highestIssuedUid                        ← uidHighWaterMark
   +- lastImportNumber                        ← importSequence
   +- firstOutlineLevel                       ← outlineBase
   +- sourceFormat
   +- passthroughValues                       ← carry
   +- passthroughElements                     ← carryElements
   Calendar                                   MSPDI
   +- uid                                     MSPDI
   +- baseCalendarUid                         MSPDI
   +- ordinal
   +- name                                    MSPDI
   +- isBaseCalendar                          MSPDI
   +- weekDays                                MSPDI
   +- exceptions                              MSPDI
   +- passthroughValues                       ← carry
   +- passthroughElements                     ← carryElements
   WeekDay                                    MSPDI
   +- ordinal
   +- dayType                                 MSPDI
   +- dayWorking                              MSPDI
   +- workingTimes                            MSPDI
   +- passthroughValues                       ← carry
   +- passthroughElements                     ← carryElements
   Exception                                  MSPDI
   +- ordinal
   +- name                                    MSPDI
   +- fromDate                                MSPDI
   +- toDate                                  MSPDI
   +- dayWorking                              MSPDI
   +- recurrenceKind                          MSPDI
   +- recurrencePeriod                        MSPDI
   +- workingTimes                            MSPDI
   +- passthroughValues                       ← carry
   +- passthroughElements                     ← carryElements
   WorkingTime                                MSPDI
   +- ordinal
   +- fromTime                                MSPDI
   +- toTime                                  MSPDI
   Task                                       MSPDI
   +- uid                                     MSPDI
   +- parentTaskUid
   +- calendarUid                             MSPDI
   +- siblingOrder                            ← wbsOrder
   +- name                                    MSPDI
   +- notes                                   MSPDI
   +- start                                   MSPDI
   +- finish                                  MSPDI
   +- milestone                               MSPDI
   +- deadline                                MSPDI
   +- actualStart                             MSPDI
   +- stop                                    MSPDI
   +- actualFinish                            MSPDI
   +- resume                                  MSPDI
   +- resumeValid                             MSPDI
   +- percentComplete                         MSPDI
   +- fadeInCalendarDays                      ← fadeInDays
   +- fadeOutCalendarDays                     ← fadeOutDays
   +- hyperlinkAddress                        MSPDI
   +- hyperlink                               MSPDI
   +- dependencies                            MSPDI
   +- passthroughValues                       ← carry
   +- passthroughElements                     ← carryElements
   Dependency                                 MSPDI
   +- predecessorUid                          MSPDI
   +- linkType                                MSPDI
   +- linkLag                                 MSPDI
   +- lagFormat                               MSPDI
   +- passthroughValues                       ← carry
   +- passthroughElements                     ← carryElements
   Resource                                   MSPDI
   +- uid                                     MSPDI
   +- calendarUid                             MSPDI
   +- name                                    MSPDI
   +- resourceKind                            MSPDI
   +- isCostResource                          MSPDI
   +- passthroughValues                       ← carry
   +- passthroughElements                     ← carryElements
   Assignment                                 MSPDI
   +- uid                                     MSPDI
   +- taskUid                                 MSPDI
   +- resourceUid                             MSPDI
   +- passthroughValues                       ← carry
   +- passthroughElements                     ← carryElements
   TaskGroup
   +- id
   +- parentId
   +- representedTaskUid                      ← derivedFromTaskUid
   +- siblingOrder                            ← order
   +- name
   +- treeState
   +- editGroup                               ← editPermission
   +- color
   +- minHeightPx
   +- hyperlinkAddress
   +- hyperlink
   TaskGroupMember
   +- taskUid
   +- taskGroupId
   TaskVisual                                 問 5
   +- taskUid
   +- taskShape                               ← shapeKind
   +- milestoneShape                          ← milestoneGlyph
   +- fillColor
   +- strokeColor
   +- strokeWidthPx
   TaskOrigin
   +- taskUid
   +- sourceProjectId
   +- sourceUid
   +- importSessionId
   +- lastSeenImportNumber                    ← lastSeenImportSequence
   BaselineTask
   +- uid
   +- name
   +- start
   +- finish
   +- milestone
   CommentBox
   +- id
   +- anchor                                  問 2
   +- bodyOffsetPx
   |  +- dx
   |  +- dy
   +- text
   +- fillColor
   +- fillTransparencyPercent
   +- strokeColor
   +- strokeWidthPx
   +- textColor
   +- fontSizePx
   +- hyperlinkAddress
   +- hyperlink
   CommentBoxAnchor                           問 2
   +- (every kind)
   |  +- kind
   +- (kind freePoint)
   |  +- dateTime                             ← anchorDate
   |  +- taskGroupId ;
   |  |  +- AnchorFallback
   |  |     +- taskGroupId                    ← anchorTaskGroupId
   |  +- bandFraction ;
   |     +- AnchorFallback
   |        +- bandFraction                   ← anchorBandFraction  問 2
   +- (kind task)
   |  +- taskUid                              ← anchorTaskUid
   |  +- figure                               ← anchorTaskFigure  問 2
   |  +- point ;
   |  |  +- CommentBoxAnchor
   |  |     +- (kind highlightBox)
   |  |        +- point                       ← anchorSnapPoint
   |  +- fallback
   +- (kind highlightBox)
      +- highlightBoxId                       ← anchorHighlightBoxId
      +- fallback
   AnchorFallback                             問 2
   HighlightBox
   +- id
   +- topTaskGroupId
   +- bottomTaskGroupId
   +- firstDay                                ← start
   +- lastDay                                 ← finish
   +- cornerRadiusPx
   +- fillColor
   +- fillTransparencyPercent
   +- strokeColor
   +- strokeWidthPx
   DocumentStamp                              ← documentStamp
   +- scheduleUpdatedAt                       問 1
   +- documentUpdatedAt                       ← settingsUpdatedAt
   +- fileSavedAt
   +- lastEditedBy
   Writer
   +- (every kind)
   |  +- kind
   +- (kind agent)
      +- name
   ChangeLogEntry                             ← changeLog
   +- changedAt
   +- changedBy                               ← editedBy
   +- affectedArea
   +- changeDescription                       ← explanation
   +- reason
   +- note
   PassthroughValues                          ← Carry
   PassthroughElement                         ← CarryElement
   +- ordinal
   +- name
   +- fields
   +- children
   Day
   DateTime
   Time
   UtcInstant
   UtcOffset
   Color
   +- (every kind)
   |  +- kind
   +- (kind palette)
   |  +- name
   +- (kind custom)
      +- light
      +- dark
   ColorSide
   +- value
   +- source
   BandColor                                  問 2
   ColumnFilter
   +- (every kind)
   |  +- kind
   |  +- column
   +- (kind values)
   |  +- hiddenValues
   |  +- isBlankHidden
   +- (kind dateRange)
      +- firstDay                             ← fromDate
      +- lastDay                              ← toDate
   ColumnSort
   +- column
   +- direction
   ColumnKey
```

---

## 問 1. `schedule` —— スケジュールデータの入れ物の名

**場面**: GRS JSON のいちばん上には `schedule` というキーがあり、その中に MSPDI part（`project`・`tasks` ほか）と GRS part（`taskGroups` ほか）が入っています。`documentStamp` の `scheduleUpdatedAt` は、その中身が最後に変わった時刻です。

用語の裁定で、単独の「schedule」は書かないと決めました（`JDG-3358`）。中身の名は `Schedule Data`（`JDG-3353`）です。今のキーのうち、`scheduleDataTimeZone` はもう Data を含んでいます。

| 案 | 中身 |
|---|---|
| **A（推奨）** | `schedule` → `scheduleData`、`scheduleUpdatedAt` → `scheduleDataUpdatedAt` |
| B | キーは今のまま（JSON のキーは用語の決まりの外とする） |

**推奨の理由**: キーは外の人や AI が最初に読む名で、説明文はもう Schedule Data と呼んでいます。キーだけ違うと、同じ物に 2 つの名ができます。β の前なので、今なら変換器（`CR-851`）が 1 回で直せます。

回答:

---

## 問 2. コメントボックスの線先のキー —— `anchor`・`band`・`figure`

**場面**: コメントボックスは引出し線（Leader Line）で何かを指します。その先が線先（Leader Anchor）で、タスク・ハイライトボックス・何も無い所のどれかに付きます。

| 今のキー | 何か | ぶつかる裁定 |
|---|---|---|
| `CommentBox.anchor` と型 `CommentBoxAnchor` | 線先 | `JDG-3348`: Leader Anchor は必ず 2 語で使う |
| 型 `AnchorFallback` | 先が消えたときの線先の置き場 | 同上 |
| `bandFraction` | 線先の高さ（タスクグループレーンの上端 0・下端 1） | `JDG-3361`・`JDG-3374`: タスクグループの帯は Task Group Lane |
| 型 `BandColor` | タスクグループレーンの色 | 同上 |
| `figure` | 線先が付くタスク図形の部分（予定バー・実績バー・マイルストーンマーク） | `JDG-3348`: 描いた物は Graphic |

| 案 | 中身 |
|---|---|
| **A（推奨）** | `anchor` → `leaderAnchor`、`CommentBoxAnchor` → `LeaderAnchor`、`AnchorFallback` → `LeaderAnchorFallback`、`bandFraction` → `laneFraction`、`BandColor` → `LaneColor`、`figure` → `graphicPart` |
| B | 用語とぶつかる `band` と `figure` だけ直し、`anchor` は今のまま（コメントボックスの中なので取り違えない） |
| C | 全部今のまま |

**推奨の理由**: 説明文はもう Leader Anchor・Task Group Lane・Task Graphic と書いています。キーが別の語だと、AI が説明とキーを結び付けられません。

回答:

---

## 問 3. 見せる・隠すのキー —— 描く物の名に合わせるか

**場面**: `documentSettings` の `is...Visible` は、描く物ごとに見せるか隠すかを持ちます。今のキーは、用語で決めた描く物の名と合っていないものがあります。

| 今のキー | 何を見せるか | 案の名 |
|---|---|---|
| `isProgressMarkerVisible` | 進捗マークと再開マーク | `isProgressMarkVisible`（`JDG-3372` で Marker をやめた。直す必要がある） |
| `isDependencyVisible` | 依存線 | `isDependencyLineVisible` |
| `isAssigneeVisible` | 担当ラベル | `isAssigneeLabelVisible` |
| `isPercentCompleteVisible` | 完了率ラベル | `isPercentCompleteLabelVisible` |
| `isBaselineVisible` | 変更前予定輪郭 | `isBaselineOutlineVisible` |
| `isPlanVisible` | 予定バー | `isPlanBarVisible` |
| `isActualVisible` | 実績バー | `isActualBarVisible` |

| 案 | 中身 |
|---|---|
| **A（推奨）** | 7 つとも右の欄の名にする |
| B | 退いた語（Marker）を含む `isProgressMarkerVisible` だけ直す |

**推奨の理由**: キーが描く物の名と同じなら、画面のどれを隠すキーかが名だけで読めます。`isDateGridLinesVisible`・`isGroupGridLinesVisible`・`isProgressLineVisible` はもう描く物の名です。

回答:

---

## 問 4. 表の見せ方のキー —— 窓の名

**場面**: `documentSettings.tableViews` は、3 つの表の窓ごとに、絞り込みや並べ方を持ちます。キーの名は、窓の古い名のままです。

| 今のキー | 窓の名（`JDG-3356`） | 案の名 |
|---|---|---|
| `searchPanel` | Search Window | `searchWindow` |
| `resourceList` | Resource List Window | `resourceListWindow` |
| `delayDiagnosticsReport` | Delay Diagnostics Report Window | `delayDiagnosticsReportWindow` |

| 案 | 中身 |
|---|---|
| **A（推奨）** | 3 つとも右の欄の名にする |
| B | `searchPanel` だけ `searchWindow` にする（Panel は Task Group Panel・Properties Panel のための語なので） |
| C | 今のまま |

**推奨の理由**: 3 つとも窓の名に合わせると、同じ規則で読めます。`Panel` は 1 枚目の木で 2 つのパネルにだけ使うと決めました。

回答:

---

## 問 5. `taskVisuals` —— タスクの描き方の入れ物

**場面**: `taskVisuals`（型 `TaskVisual`）は、タスクごとに、形（`taskShape`・`milestoneShape`）・色・枠の太さを持ちます。用語では、描いた物を `Task Graphic`（タスク図形）、選ぶ形の種類を Shape と決めました（`JDG-3348`）。Visual は用語集にありません。

| 案 | 中身 |
|---|---|
| **A（推奨）** | `taskVisuals` → `taskGraphicStyles`、`TaskVisual` → `TaskGraphicStyle` —— タスク図形の描き方（スタイル）であって、描いた物そのものではない |
| B | `taskGraphics` / `TaskGraphic` —— 用語の名をそのまま使う |
| C | 今のまま |

**推奨の理由**: 中身は描き方の設定で、描いた物ではありません。Style を付けると、`Task Graphic` と取り違えません。B は「描いた物を保存している」と読まれるおそれがあります。

回答:

---

## 自由欄

木を見て、ほかに直したい名や問いたいことがあれば、ここに書いてください。

回答:
