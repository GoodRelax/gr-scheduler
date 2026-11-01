---
type: Design Study
title: GRS JSON のプロパティの順
description: CR-851 で GRS JSON のスキーマと書き出す文書のプロパティを並べる順（JDG-3322）。規則は 01-04-requirements.md に足す DR-6、本書はその規則で並べた全部の順。2026-10-25。
tags: [grs-json, schema, order, cr-851]
phase: design
status: draft
---

# GRS JSON のプロパティの順（JDG-3322）

- 利用者の言葉（2026-10-25）: 「スキーマの順番がぐちゃぐちゃやな。 ERDをベースに綺麗に順番を考えてくれ。 そりゃJSONに順番はないんだろうがAIはそのへんをきにするだろ？ ってか、俺もわからんくなるし。」「とにかくきれいな順番に並べなおして。」
- 規則（`DR-6` の案、`spec-rows-map.tsv` の行）: ① ルート ② 実体は MSPDI → GRS → 刻印 → 共通の型 ③ 実体の中は 識別子 → 参照 → 兄弟の中の位置 → 名と文 → 値と状態 → 描き方（形 → 塗り → 線の色 → 線の太さ → 字）→ リンク → GRS の設定と帳簿 → 子の配列 → 素通し ④ 和は `kind` が先 ⑤ `documentSettings` は意味の群
- 行のレビューのページの「GRS JSON のプロパティ」と「コマンド（applyCommands）」の表は、この順に並べ直した（行の中身は変えていない）。消えるプロパティは、元の置き場の近く（実体の末尾）に残した。

## 1. ルート

`$schema`・`schemaVersion`・`buildVersion`・`scheduleData`・`documentSettings`・`documentStamp`・`changeLogEntries`

## 2. `scheduleData`

`project`・`calendars`・`tasks`・`resources`・`assignments`・`taskGroups`・`taskGroupMembers`・`taskGraphicStyles`・`taskOrigins`・`baselineTasks`・`commentBoxes`・`highlightBoxes`

## 3. `documentSettings`

| 群 | プロパティ |
|---|---|
| 倍率 | `displayScalePercent`・`fontSizeStep`・`dayWidthPx`・`verticalZoomRatio`・`taskGroupAutoExpandDepth` |
| 表示位置 | `scrollPosition`・`fitSpan` |
| 時刻帯 | `viewTimeZone`・`displayTimeZones`・`isTimeOfDayVisible` |
| 見せるもの | `isPlanBarVisible`・`isPlanDatesVisible`・`isActualBarVisible`・`isPercentCompleteLabelVisible`・`isBaselineOutlineVisible`・`isProgressLineVisible`・`isProgressMarkVisible`・`isDependencyLineVisible`・`isAssigneeLabelVisible`・`isDateGridLinesVisible`・`isGroupGridLinesVisible` |
| 積み方と色 | `stackDirection`・`isThemeMonochrome` |
| タスクグループパネル | `taskGroupPanelWidthPx`・`isTaskGroupPanelWidthFixed`・`levelZeroTreeState`・`pinnedTaskGroupIds` |
| 表の見え方 | `tableViews` |

中の順: `scrollPosition` は `kind`・`leftEdgeDay`・`leftEdgeDayFraction`・`topEdgeTaskGroupId`・`topEdgeTaskGroupFraction`；`fitSpan` は `firstDay`・`lastDay`・`isFixed`；`viewTimeZone` は `kind`・`offset`；`displayTimeZones` は `offset`・`season`；`tableViews` は `searchPanel`・`delayDiagnosticsReport`・`resourceList`；`table` は `isScheduleFilterApplied`・`shownTaskUids`・`shownResourceUids`・`isUnassignedShown`・`columnFilters`・`sort`（`table` は 3 つの表のどれも）

## 4. `$defs` の実体と型

`Project`・`Calendar`・`WeekDay`・`Exception`・`WorkingTime`・`Task`・`Dependency`・`Resource`・`Assignment`・`TaskGroup`・`TaskGroupMember`・`TaskGraphicStyle`・`TaskOrigin`・`BaselineTask`・`CommentBox`・`LeaderAnchor`・`LeaderAnchorFallback`・`HighlightBox`・`DocumentStamp`・`Writer`・`ChangeLogEntry`・`PassthroughValues`・`PassthroughElement`・`Day`・`DateTime`・`Time`・`UtcInstant`・`UtcOffset`・`Color`・`ColorSide`・`LaneColor`・`ColumnFilter`・`ColumnSort`・`ColumnKey`

## 5. 実体の中

| 実体 | プロパティ |
|---|---|
| `Project` | `id`・`calendarUid`・`name`・`title`・`subject`・`category`・`company`・`manager`・`author`・`revision`・`creationDate`・`startDate`・`statusDate`・`scheduleDataTimeZone`・`minutesPerDay`・`minutesPerWeek`・`daysPerMonth`・`weekStartDay`・`defaultStartTime`・`defaultFinishTime`・`themeHueDegrees`・`parentTaskProgressToleranceWorkingDays`・`highestIssuedUid`・`lastImportNumber`・`firstOutlineLevel`・`sourceFormat`・`passthroughValues`・`passthroughElements` |
| `Calendar` | `uid`・`baseCalendarUid`・`ordinal`・`name`・`isBaseCalendar`・`weekDays`・`exceptions`・`passthroughValues`・`passthroughElements` |
| `WeekDay` | `ordinal`・`dayType`・`dayWorking`・`workingTimes`・`passthroughValues`・`passthroughElements` |
| `Exception` | `ordinal`・`name`・`fromDate`・`toDate`・`dayWorking`・`recurrenceKind`・`recurrencePeriod`・`workingTimes`・`passthroughValues`・`passthroughElements` |
| `WorkingTime` | `ordinal`・`fromTime`・`toTime` |
| `Task` | `uid`・`parentTaskUid`・`calendarUid`・`siblingOrder`・`name`・`notes`・`start`・`finish`・`milestone`・`deadline`・`actualStart`・`stop`・`actualFinish`・`resume`・`resumeValid`・`percentComplete`・`fadeInCalendarDays`・`fadeOutCalendarDays`・`hyperlinkAddress`・`hyperlink`・`dependencies`・`passthroughValues`・`passthroughElements` |
| `Dependency` | `predecessorUid`・`linkType`・`linkLag`・`lagFormat`・`passthroughValues`・`passthroughElements` |
| `Resource` | `uid`・`calendarUid`・`name`・`resourceKind`・`isCostResource`・`passthroughValues`・`passthroughElements` |
| `Assignment` | `uid`・`taskUid`・`resourceUid`・`passthroughValues`・`passthroughElements` |
| `TaskGroup` | `id`・`parentId`・`representedTaskUid`・`siblingOrder`・`name`・`treeState`・`editGroup`・`color`・`minHeightPx`・`hyperlinkAddress`・`hyperlink` |
| `TaskGroupMember` | `taskUid`・`taskGroupId` |
| `TaskGraphicStyle` | `taskUid`・`taskShape`・`milestoneShape`・`fillColor`・`strokeColor`・`strokeWidthPx` |
| `TaskOrigin` | `taskUid`・`sourceProjectId`・`sourceUid`・`importSessionId`・`lastSeenImportNumber` |
| `BaselineTask` | `uid`・`name`・`start`・`finish`・`milestone` |
| `CommentBox` | `id`・`leaderAnchor`・`bodyOffsetPx`・`text`・`fillColor`・`fillTransparencyPercent`・`strokeColor`・`strokeWidthPx`・`textColor`・`fontSizePx`・`hyperlinkAddress`・`hyperlink` |
| `HighlightBox` | `id`・`topTaskGroupId`・`bottomTaskGroupId`・`firstDay`・`lastDay`・`cornerRadiusPx`・`fillColor`・`fillTransparencyPercent`・`strokeColor`・`strokeWidthPx` |
| `DocumentStamp` | `scheduleDataUpdatedAt`・`documentUpdatedAt`・`fileSavedAt`・`lastEditedBy` |
| `ChangeLogEntry` | `changedAt`・`changedBy`・`affectedArea`・`changeDescription`・`reason`・`note`（`JDG-3332`） |
| `PassthroughElement` | `ordinal`・`name`・`fields`・`children` |
| `ColorSide` | `value`・`source` |
| `ColumnSort` | `column`・`direction` |

## 6. 和（`kind` で形を分ける型）

| 型 | 順 |
|---|---|
| `LeaderAnchor` | 共通: `kind` → freePoint: `dateTime`・`taskGroupId`・`laneFraction` → task: `taskUid`・`graphicPart`・`point`・`fallback` → highlightBox: `highlightBoxId`・`point`・`fallback` |
| `Color` | 共通: `kind` → theme: （無し） → palette: `name` → custom: `light`・`dark` |
| `Writer` | 共通: `kind` → person: （無し） → agent: `name` |
| `ColumnFilter` | 共通: `kind`・`column` → values: `hiddenValues`・`isBlankHidden` → dateRange: `firstDay`・`lastDay` |

## 7. コマンド（`applyCommands`）

実体の順は 4 と同じ。実体ごとに、新しい `edit<実体>` → それに畳まれる元のコマンド（書くプロパティの順）→ 作る → ほかのコマンド → 消す → 退いた名。

