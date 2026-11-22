# 送る人へ（AI には送らない）

- GRS JSON の最終レビュー（`JDG-3717` の 3.、観点は `JDG-3718`）の、外の AI への 2 段の質問状です。1 段目はこのファイルの「ここから下を AI へ送る」より下、2 段目は `grs-json-final-review-ai-stage2.md` の「ここから下を AI へ送る」より下です。
- 3 つ以上の、別々の会社の AI に出してください。AI ごとに新しい会話を使い、前の質問状を見た会話は使わないでください。リポジトリやウェブの資料は見せません。
- 1 段目を貼って答えを待ちます。答えが長いので、途中で切れたら「続けて」と送ってください。1 段目の答えが R428 まで揃ったら、同じ会話に 2 段目を貼ります。1 段目の答えを直させないでください。
- 2 つの答えを 1 つのファイルにまとめ、持ち主の手元のフォルダー（GQA の写しと同じ所）に `final-review-answer-<ai>.md` の名で保存してください。席がリポジトリの `ai-answers/` へ写し、AI の名を役割の名（AI-A など）に置き換えます。
- 1 段目は名だけを見せます（観点 V-1〜V-3）。意図は 2 段目にだけ書きました。

---- ここから下を AI へ送る（1 段目） ----

# 初見の質問状（1 段目）: この JSON の名を、初めて見てどう読みますか

**答え方: 日本語で（名そのものは英語のまま）、1 つのコードブロック（```markdown で始めて ``` で閉じる）の中に、6 節の答えの型で書いてください。コードブロックの外には何も書かないでください。**

## 1. 頼みたいこと

ある日程表のアプリ（ガントチャート）は、1 つの文書を 1 つの JSON ファイルに保存します。この JSON のキーと値の名は、外との約束として長く変えずに使います。そこで、名が初めて読む人に **一発で、誤解なく** 読まれるかを測ります。

- 3 節の木（すべてのキーと、列挙の値のすべて）と、4 節の実例だけを見て、それぞれの名が何を意味すると思うかを書いてください。
- 名の意味の説明は、わざと書いていません。名と形と実例の値だけから読んでください。
- 私たちの意図を推し量らないでください。似た製品を調べたり、ほかの資料から当てたりしないでください。欲しいのは初見の読みです。外れても構いません。外れた読みと、迷った読みがいちばん役に立ちます。
- この答えの後に、同じ会話で 2 段目（私たちの意図と、審査の問い）を送ります。

## 2. 木の読み方

- 各行の頭の `R001`〜`R428` は行の番号です。答えで行を指すときに使ってください。
- `[]` は配列です。`->` は、5 番目の部分「共通の型」にある型を指します。
- `[M]` は、Microsoft Project の XML 形式（MSPDI）の要素の名を camelCase にしたキーです。括弧の中は、MSPDI の名が違うときの MSPDI の名です。`[G]` は、MSPDI から来た物の中に、このアプリが足した値です。
- `"…"` の行は文字列の値の 1 つ、数だけの行は数の値の 1 つです。値の行は、すぐ上のキーが取る値をすべて並べています。

## 3. 木（キー 278、値 150）

### 根と帳簿

```text
R001  ScheduleDocument
R002  +- $schema
R003  +- schemaVersionUtc
R004  +- buildVersionUtc
R005  +- documentStamp
R006  |  +- scheduleDataUpdatedAt
R007  |  +- documentUpdatedAt
R008  |  +- fileSavedAt
R009  |  +- lastEditedBy
R010  |     +- type
R011  |     |  +- "user"
R012  |     |  +- "template"
R013  |     |  +- "agent"
R014  |     +- name
R015  +- documentSettings
R016  +- scheduleData
R017  +- changeLogEntries[]
R018     +- changedAt
R019     +- changedBy
R020     |  +- editorType
R021     |  |  +- "user"
R022     |  |  +- "agent"
R023     |  +- name
R024     +- affectedArea
R025     +- changeDescription
R026     +- reason
R027     +- remarks
```

### 文書設定

```text
R028  documentSettings
R029  +- displayScaleRatio
R030  +- fontSizePreset
R031  |  +- "small"
R032  |  +- "medium"
R033  |  +- "large"
R034  +- isThemeMonochrome
R035  +- themeHue
R036  |  +- "blue"
R037  |  +- "blueGreen"
R038  |  +- "green"
R039  |  +- "yellowGreen"
R040  |  +- "yellow"
R041  |  +- "orange"
R042  |  +- "red"
R043  |  +- "redPurple"
R044  |  +- "purple"
R045  |  +- "indigo"
R046  +- viewTimeZone
R047  |  +- type
R048  |  |  +- "sameAsScheduleData"
R049  |  |  +- "fixed"
R050  |  +- utcOffset
R051  +- displayTimeZones[]
R052  |  +- utcOffset
R053  |  +- zoneNameType
R054  |     +- "standard"
R055  |     +- "daylight"
R056  +- isTimeOfDayVisible
R057  +- dayWidthPx
R058  +- fitDayRange
R059  |  +- type
R060  |  |  +- "fixed"
R061  |  |  +- "automatic"
R062  |  +- firstDay
R063  |  +- lastDay
R064  +- verticalZoom
R065  |  +- ratio
R066  |  +- automaticallyShownDepth
R067  +- taskGroupPanelWidthPx
R068  +- isTaskGroupPanelWidthFixed
R069  +- pinnedTaskGroupIds[]
R070  +- taskStackDirection
R071  |  +- "bottomToTop"
R072  |  +- "topToBottom"
R073  +- scrollPosition
R074  |  +- type
R075  |  |  +- "automatic"
R076  |  |  +- "fixed"
R077  |  +- leftEdgeDay
R078  |  +- leftEdgeDayOffsetPercent
R079  |  +- topEdgeTaskGroupId
R080  |  +- topEdgeTaskGroupOffsetPercent
R081  +- scheduleCanvasElements
R082  |  +- isDateGridLinesVisible
R083  |  +- isGroupGridLinesVisible
R084  |  +- isProgressLineVisible
R085  |  +- isDependencyLineVisible
R086  |  +- isPlanBarVisible
R087  |  +- isPlanDatesVisible
R088  |  +- isActualBarVisible
R089  |  +- isPercentCompleteLabelVisible
R090  |  +- isProgressMarkVisible
R091  |  +- isBaselineOutlineVisible
R092  |  +- isAssigneeLabelVisible
R093  +- delayDiagnosisSettings
R094  |  +- toleranceWorkingDays
R095  +- tableWindows
R096     +- searchWindow
R097     +- delayDiagnosisReportWindow
R098     +- resourceListWindow
```

### スケジュールデータ（頭の値と、MSPDI と往復する群）

```text
R099  scheduleData
R100  +- scheduleDataTimeZone
R101  |  +- utcOffset
R102  +- sourceFormat
R103  |  +- "grs"
R104  |  +- "mspdi12"
R105  |  +- "mspdi15"
R106  +- importedTopTaskOutlineLevel
R107  +- mspdiImportCount
R108  +- highestIssuedUid
R109  +- project [M]
R110  |  +- uid [M]
R111  |  +- name [M]
R112  |  +- title [M]
R113  |  +- subject [M]
R114  |  +- category [M]
R115  |  +- company [M]
R116  |  +- manager [M]
R117  |  +- author [M]
R118  |  +- revision [M]
R119  |  +- creationDate [M]
R120  |  +- startDate [M]
R121  |  +- statusDate [M]
R122  |  +- minutesPerDay [M]
R123  |  +- minutesPerWeek [M]
R124  |  +- daysPerMonth [M]
R125  |  +- weekStartDay [M]
R126  |  |  +- 0
R127  |  |  +- 1
R128  |  |  +- 2
R129  |  |  +- 3
R130  |  |  +- 4
R131  |  |  +- 5
R132  |  |  +- 6
R133  |  +- defaultStartTime [M]
R134  |  +- defaultFinishTime [M]
R135  |  +- calendarUid [M]
R136  |  +- passthrough [G]
R137  +- calendars[] [M]
R138  |  +- uid [M]
R139  |  +- name [M]
R140  |  +- isBaseCalendar [M]
R141  |  +- baseCalendarUid [M]
R142  |  +- weekDays[] [M]
R143  |  |  +- dayType [M]
R144  |  |  |  +- 1
R145  |  |  |  +- 2
R146  |  |  |  +- 3
R147  |  |  |  +- 4
R148  |  |  |  +- 5
R149  |  |  |  +- 6
R150  |  |  |  +- 7
R151  |  |  +- dayWorking [M]
R152  |  |  +- workingTimes[] [M]
R153  |  |  |  +- fromTime [M]
R154  |  |  |  +- toTime [M]
R155  |  |  +- passthrough [G]
R156  |  +- exceptions[] [M]
R157  |  |  +- name [M]
R158  |  |  +- fromDate [M] (TimePeriod/FromDate)
R159  |  |  +- toDate [M] (TimePeriod/ToDate)
R160  |  |  +- dayWorking [M]
R161  |  |  +- type [M]
R162  |  |  |  +- 1
R163  |  |  |  +- 2
R164  |  |  |  +- 3
R165  |  |  |  +- 4
R166  |  |  |  +- 5
R167  |  |  |  +- 6
R168  |  |  |  +- 7
R169  |  |  |  +- 8
R170  |  |  |  +- 9
R171  |  |  +- period [M]
R172  |  |  +- workingTimes[] [M]
R173  |  |  |  +- fromTime [M]
R174  |  |  |  +- toTime [M]
R175  |  |  +- passthrough [G]
R176  |  +- passthrough [G]
R177  +- tasks[] [M]
R178  |  +- uid [M]
R179  |  +- name [M]
R180  |  +- notes [M]
R181  |  +- start [M]
R182  |  +- finish [M]
R183  |  +- milestone [M]
R184  |  +- deadline [M]
R185  |  +- actualStart [M]
R186  |  +- stop [M]
R187  |  +- actualFinish [M]
R188  |  +- resume [M]
R189  |  +- resumeValid [M]
R190  |  +- percentComplete [M]
R191  |  +- calendarUid [M]
R192  |  +- hyperlinkAddress [M]
R193  |  +- hyperlink [M]
R194  |  +- parentTaskUid [G]
R195  |  +- siblingOrder [G]
R196  |  +- grs [G]
R197  |  |  +- fadeInCalendarDays
R198  |  |  +- fadeOutCalendarDays
R199  |  |  +- style
R200  |  |  |  +- taskShape
R201  |  |  |  |  +- "rectangle"
R202  |  |  |  |  +- "chevron"
R203  |  |  |  |  +- "arrow"
R204  |  |  |  |  +- "dumbbell"
R205  |  |  |  +- milestoneShape
R206  |  |  |  |  +- "circle"
R207  |  |  |  |  +- "hexagon"
R208  |  |  |  |  +- "pentagon"
R209  |  |  |  |  +- "diamond"
R210  |  |  |  |  +- "square"
R211  |  |  |  |  +- "star"
R212  |  |  |  |  +- "triangleUp"
R213  |  |  |  |  +- "triangleDown"
R214  |  |  |  |  +- "file"
R215  |  |  |  |  +- "box"
R216  |  |  |  |  +- "floppyDisk"
R217  |  |  |  |  +- "cylinder"
R218  |  |  |  |  +- "meetingPeople"
R219  |  |  |  |  +- "smilingFace"
R220  |  |  |  |  +- "beerMug"
R221  |  |  |  +- fill
R222  |  |  |  +- stroke
R223  |  |  +- taskGroupId
R224  |  |  +- importOrigin
R225  |  |     +- sourceProjectUid
R226  |  |     +- sourceTaskUid
R227  |  |     +- importSessionId
R228  |  |     +- lastSeenMspdiImportCount
R229  |  +- predecessorLinks[] [M] (PredecessorLink)
R230  |  |  +- predecessorUid [M]
R231  |  |  +- type [M]
R232  |  |  |  +- 0
R233  |  |  |  +- 1
R234  |  |  |  +- 2
R235  |  |  |  +- 3
R236  |  |  +- linkLag [M]
R237  |  |  +- lagFormat [M]
R238  |  |  |  +- 3
R239  |  |  |  +- 4
R240  |  |  |  +- 5
R241  |  |  |  +- 6
R242  |  |  |  +- 7
R243  |  |  |  +- 8
R244  |  |  |  +- 9
R245  |  |  |  +- 10
R246  |  |  |  +- 11
R247  |  |  |  +- 12
R248  |  |  |  +- 19
R249  |  |  |  +- 20
R250  |  |  |  +- 35..44
R251  |  |  |  +- 51
R252  |  |  |  +- 52
R253  |  |  +- passthrough [G]
R254  |  +- passthrough [G]
R255  +- resources[] [M]
R256  |  +- uid [M]
R257  |  +- name [M]
R258  |  +- type [M]
R259  |  |  +- 0
R260  |  |  +- 1
R261  |  +- isCostResource [M]
R262  |  +- calendarUid [M]
R263  |  +- passthrough [G]
R264  +- assignments[] [M]
R265     +- uid [M]
R266     +- taskUid [M]
R267     +- resourceUid [M]
R268     +- passthrough [G]
```

### スケジュールデータ（GRS だけが持つ配列）

```text
R269  scheduleData
R270  +- taskGroups[]
R271  |  +- id
R272  |  +- name
R273  |  +- parentTaskGroupId
R274  |  +- siblingOrder
R275  |  +- style
R276  |  |  +- color
R277  |  +- minHeightPx
R278  |  +- representativeTaskUid
R279  |  +- hyperlinkAddress
R280  |  +- hyperlink
R281  |  +- selfShowMode
R282  |  |  +- "shown"
R283  |  |  +- "hidden"
R284  |  |  +- "automatic"
R285  |  |  +- "hiddenUntilZoomIn"
R286  |  +- editableByGroupName
R287  +- baselineTasks[]
R288  |  +- uid
R289  |  +- name
R290  |  +- start
R291  |  +- finish
R292  |  +- milestone
R293  +- highlightBoxes[]
R294  |  +- id
R295  |  +- style
R296  |  |  +- cornerRadiusPx
R297  |  |  +- fill
R298  |  |  +- stroke
R299  |  +- firstDay
R300  |  +- lastDay
R301  |  +- firstTaskGroupId
R302  |  +- lastTaskGroupId
R303  +- commentBoxes[]
R304  |  +- id
R305  |  +- text
R306  |  +- style
R307  |  |  +- fill
R308  |  |  +- stroke
R309  |  |  +- font
R310  |  |     +- color
R311  |  |     +- sizePx
R312  |  +- leaderTarget
R313  |  |  +- type
R314  |  |  |  +- "freePoint"
R315  |  |  |  +- "task"
R316  |  |  |  +- "highlightBox"
R317  |  |  +- dateTime
R318  |  |  +- taskGroupId
R319  |  |  +- laneTopOffsetPercent
R320  |  |  +- taskUid
R321  |  |  +- snapPart
R322  |  |  |  +- "planBar"
R323  |  |  |  +- "actualBar"
R324  |  |  |  +- "milestoneMark"
R325  |  |  +- highlightBoxId
R326  |  |  +- snapPoint
R327  |  |     +- "topLeftCorner"
R328  |  |     +- "topMiddle"
R329  |  |     +- "topRightCorner"
R330  |  |     +- "rightMiddle"
R331  |  |     +- "bottomRightCorner"
R332  |  |     +- "bottomMiddle"
R333  |  |     +- "bottomLeftCorner"
R334  |  |     +- "leftMiddle"
R335  |  +- bodyOffsetPx
R336  |  |  +- dx
R337  |  |  +- dy
R338  |  +- hyperlinkAddress
R339  |  +- hyperlink
R340  +- passthroughTasks[]
R341  |  +- precedingTaskUid
R342  |  +- mspdiElement
R343  +- passthroughResources[]
R344  |  +- precedingResourceUid
R345  |  +- mspdiElement
R346  +- passthroughAssignments[]
R347  |  +- precedingAssignmentUid
R348  |  +- mspdiElement
R349  +- passthroughCalendars[]
R350     +- precedingCalendarUid
R351     +- mspdiElement
```

### 共通の型（-> で指す物）

```text
R352  Color
R353  +- type
R354  |  +- "theme"
R355  |  +- "palette"
R356  |  +- "custom"
R357  +- name
R358  |  +- "white"
R359  |  +- "black"
R360  |  +- "dimGray"
R361  |  +- "lightGray"
R362  |  +- "red"
R363  |  +- "blue"
R364  |  +- "yellow"
R365  |  +- "green"
R366  |  +- "orange"
R367  |  +- "purple"
R368  +- light
R369  |  +- hexColor
R370  |  +- isCalculatedFromOppositeColor
R371  +- dark
R372  LaneColor
R373  TaskTableWindow
R374  +- isScheduleFilterApplied
R375  +- checkedTaskUids[]
R376  +- columnFilters[]
R377  +- columnSort
R378  ResourceTableWindow
R379  +- isScheduleFilterApplied
R380  +- checkedResourceUids[]
R381  +- isUnassignedChecked
R382  +- columnFilters[]
R383  +- columnSort
R384  ColumnFilter
R385  +- type
R386  |  +- "values"
R387  |  +- "dateRange"
R388  +- column
R389  |  +- "progressStatus"
R390  |  +- "percentComplete"
R391  |  +- "taskType"
R392  |  +- "taskName"
R393  |  +- "resourceNames"
R394  |  +- "start"
R395  |  +- "finish"
R396  |  +- "actualStart"
R397  |  +- "actualFinish"
R398  |  +- "taskGroupPath"
R399  |  +- "text"
R400  |  +- "taskGroupName"
R401  |  +- "leaderTargetDay"
R402  |  +- "diagnosisStatus"
R403  |  +- "planDates"
R404  |  +- "actualDates"
R405  |  +- "diagnosisReason"
R406  |  +- "resourceName"
R407  |  +- "isSelected"
R408  |  +- "assignedTaskCount"
R409  |  +- "assignedTaskNames"
R410  +- hiddenValues[]
R411  +- isBlankHidden
R412  +- firstDay
R413  +- lastDay
R414  ColumnSort
R415  +- column
R416  +- direction
R417     +- "ascending"
R418     +- "descending"
R419  Paint
R420  +- color
R421  +- opacityPercent
R422  Stroke
R423  +- color
R424  +- opacityPercent
R425  +- widthPx
R426  ShapeStyle
R427  +- fill
R428  +- stroke
```

## 4. 実例（すべての部分を 1 度ずつ使った小さな文書）

```json
{
  "$schema": "https://goodrelax.github.io/gr-scheduler/spec/_source/grs-document.schema.json",
  "schemaVersionUtc": "2026-11-17T00:00:00Z",
  "buildVersionUtc": "2026-11-17T03:00:00Z",
  "documentStamp": {
    "scheduleDataUpdatedAt": "2026-12-03T05:10:00Z",
    "documentUpdatedAt": "2026-12-03T05:12:00Z",
    "fileSavedAt": "2026-12-03T05:15:00Z",
    "lastEditedBy": {
      "type": "agent",
      "name": "planning-assistant"
    }
  },
  "documentSettings": {
    "displayScaleRatio": 1,
    "fontSizePreset": "medium",
    "isThemeMonochrome": false,
    "themeHue": "blue",
    "viewTimeZone": {
      "type": "fixed",
      "utcOffset": "+09:00"
    },
    "displayTimeZones": [
      {
        "utcOffset": "+00:00",
        "zoneNameType": "standard"
      },
      {
        "utcOffset": "-04:00",
        "zoneNameType": "daylight"
      }
    ],
    "isTimeOfDayVisible": false,
    "dayWidthPx": 24,
    "fitDayRange": {
      "type": "fixed",
      "firstDay": "2026-11-30",
      "lastDay": "2026-12-11"
    },
    "verticalZoom": {
      "ratio": 1,
      "automaticallyShownDepth": 2
    },
    "taskGroupPanelWidthPx": 160,
    "isTaskGroupPanelWidthFixed": false,
    "pinnedTaskGroupIds": [
      "db19099a-0302-418d-82e1-e95c7a6a093c"
    ],
    "taskStackDirection": "bottomToTop",
    "scrollPosition": {
      "type": "fixed",
      "leftEdgeDay": "2026-11-30",
      "leftEdgeDayOffsetPercent": 0,
      "topEdgeTaskGroupId": "db19099a-0302-418d-82e1-e95c7a6a093c",
      "topEdgeTaskGroupOffsetPercent": 0
    },
    "scheduleCanvasElements": {
      "isDateGridLinesVisible": true,
      "isGroupGridLinesVisible": false,
      "isProgressLineVisible": true,
      "isDependencyLineVisible": true,
      "isPlanBarVisible": true,
      "isPlanDatesVisible": true,
      "isActualBarVisible": true,
      "isPercentCompleteLabelVisible": true,
      "isProgressMarkVisible": true,
      "isBaselineOutlineVisible": true,
      "isAssigneeLabelVisible": true
    },
    "delayDiagnosisSettings": {
      "toleranceWorkingDays": 1
    },
    "tableWindows": {
      "searchWindow": {
        "isScheduleFilterApplied": true,
        "checkedTaskUids": [2, 3],
        "columnFilters": [
          {
            "type": "values",
            "column": "taskName",
            "hiddenValues": ["Work package A"],
            "isBlankHidden": true
          }
        ],
        "columnSort": {
          "column": "start",
          "direction": "ascending"
        }
      },
      "delayDiagnosisReportWindow": {
        "isScheduleFilterApplied": false,
        "checkedTaskUids": [2],
        "columnFilters": [
          {
            "type": "dateRange",
            "column": "finish",
            "firstDay": "2026-12-01",
            "lastDay": "2026-12-31"
          }
        ],
        "columnSort": {
          "column": "finish",
          "direction": "descending"
        }
      },
      "resourceListWindow": {
        "isScheduleFilterApplied": false,
        "checkedResourceUids": [1],
        "isUnassignedChecked": true,
        "columnSort": {
          "column": "resourceName",
          "direction": "ascending"
        }
      }
    }
  },
  "scheduleData": {
    "scheduleDataTimeZone": {
      "utcOffset": "+09:00"
    },
    "sourceFormat": "mspdi15",
    "importedTopTaskOutlineLevel": 1,
    "mspdiImportCount": 1,
    "highestIssuedUid": 4,
    "project": {
      "uid": "c335b2c9-5721-419b-8203-6ea85ce2dc98",
      "name": "Sample Schedule",
      "title": "Sample Schedule",
      "subject": "A two-level WBS example",
      "category": "Example",
      "company": "Example Org",
      "manager": "Manager A",
      "author": "Author A",
      "revision": 3,
      "creationDate": "2026-11-20T09:00:00",
      "startDate": "2026-12-01T08:00:00",
      "statusDate": "2026-12-04T17:00:00",
      "minutesPerDay": 480,
      "minutesPerWeek": 2400,
      "daysPerMonth": 20,
      "weekStartDay": 1,
      "defaultStartTime": "08:00:00",
      "defaultFinishTime": "17:00:00",
      "calendarUid": 1,
      "passthrough": {
        "ScheduleFromStart": 1,
        "CurrencyCode": "USD"
      }
    },
    "calendars": [
      {
        "uid": 1,
        "name": "Standard",
        "isBaseCalendar": true,
        "weekDays": [
          {
            "dayType": 1,
            "dayWorking": false,
            "passthrough": {
              "TimePeriod": {
                "FromDate": "2026-01-01T00:00:00",
                "ToDate": "2026-12-31T23:59:00"
              }
            }
          },
          {
            "dayType": 2,
            "dayWorking": true,
            "workingTimes": [
              { "fromTime": "08:00:00", "toTime": "12:00:00" },
              { "fromTime": "13:00:00", "toTime": "17:00:00" }
            ]
          },
          {
            "dayType": 3,
            "dayWorking": true,
            "workingTimes": [
              { "fromTime": "08:00:00", "toTime": "12:00:00" },
              { "fromTime": "13:00:00", "toTime": "17:00:00" }
            ]
          },
          {
            "dayType": 4,
            "dayWorking": true,
            "workingTimes": [
              { "fromTime": "08:00:00", "toTime": "12:00:00" },
              { "fromTime": "13:00:00", "toTime": "17:00:00" }
            ]
          },
          {
            "dayType": 5,
            "dayWorking": true,
            "workingTimes": [
              { "fromTime": "08:00:00", "toTime": "12:00:00" },
              { "fromTime": "13:00:00", "toTime": "17:00:00" }
            ]
          },
          {
            "dayType": 6,
            "dayWorking": true,
            "workingTimes": [
              { "fromTime": "08:00:00", "toTime": "12:00:00" },
              { "fromTime": "13:00:00", "toTime": "17:00:00" }
            ]
          },
          {
            "dayType": 7,
            "dayWorking": false
          }
        ],
        "exceptions": [
          {
            "name": "Make-up working day",
            "fromDate": "2026-12-05T00:00:00",
            "toDate": "2026-12-05T23:59:00",
            "dayWorking": true,
            "type": 1,
            "period": 1,
            "workingTimes": [
              { "fromTime": "08:00:00", "toTime": "12:00:00" }
            ],
            "passthrough": {
              "EnteredByOccurrences": 1,
              "Occurrences": 1
            }
          }
        ],
        "passthrough": {
          "GUID": "8677e724-9b8c-4b5e-aa02-c53710734eb3",
          "IsBaselineCalendar": 0
        }
      },
      {
        "uid": 2,
        "name": "Worker A",
        "isBaseCalendar": false,
        "baseCalendarUid": 1
      }
    ],
    "tasks": [
      {
        "uid": 1,
        "name": "Work package A",
        "notes": "Parent of the two steps below.",
        "start": "2026-12-01T08:00:00",
        "finish": "2026-12-04T17:00:00",
        "milestone": false,
        "percentComplete": 0,
        "calendarUid": 1,
        "hyperlinkAddress": "https://example.com/work-package-a",
        "hyperlink": "Work package A page",
        "siblingOrder": 1,
        "grs": {
          "style": {
            "taskShape": "dumbbell",
            "fill": {
              "color": { "type": "theme" },
              "opacityPercent": 100
            }
          },
          "taskGroupId": "db19099a-0302-418d-82e1-e95c7a6a093c",
          "importOrigin": {
            "sourceProjectUid": "b7ee990a-21f3-47aa-b1b3-2c388a58a9f5",
            "sourceTaskUid": 11,
            "importSessionId": "618c67bd-8974-481d-848b-eb68aa1fb8ca",
            "lastSeenMspdiImportCount": 1
          }
        }
      },
      {
        "uid": 2,
        "name": "Prepare draft",
        "start": "2026-12-01T08:00:00",
        "finish": "2026-12-03T17:00:00",
        "milestone": false,
        "deadline": "2026-12-03T17:00:00",
        "actualStart": "2026-12-01T08:00:00",
        "stop": "2026-12-02T12:00:00",
        "resume": "2026-12-03T08:00:00",
        "resumeValid": true,
        "percentComplete": 50,
        "calendarUid": 1,
        "parentTaskUid": 1,
        "siblingOrder": 1,
        "grs": {
          "fadeInCalendarDays": 2,
          "fadeOutCalendarDays": 1,
          "style": {
            "taskShape": "chevron",
            "fill": {
              "color": { "type": "palette", "name": "blue" },
              "opacityPercent": 80
            },
            "stroke": {
              "color": { "type": "palette", "name": "black" },
              "opacityPercent": 100,
              "widthPx": 1
            }
          },
          "taskGroupId": "15e4d36c-dc58-4088-b28d-3530c76a6da5",
          "importOrigin": {
            "sourceProjectUid": "b7ee990a-21f3-47aa-b1b3-2c388a58a9f5",
            "sourceTaskUid": 12,
            "importSessionId": "618c67bd-8974-481d-848b-eb68aa1fb8ca",
            "lastSeenMspdiImportCount": 1
          }
        },
        "passthrough": {
          "Priority": 500,
          "ExtendedAttribute": [
            { "FieldID": "188743731", "Value": "Alpha" },
            { "FieldID": "188743734", "Value": "Beta" }
          ]
        }
      },
      {
        "uid": 3,
        "name": "Draft approved",
        "start": "2026-12-04T17:00:00",
        "finish": "2026-12-04T17:00:00",
        "milestone": true,
        "deadline": "2026-12-04T17:00:00",
        "actualStart": "2026-12-04T17:00:00",
        "actualFinish": "2026-12-04T17:00:00",
        "percentComplete": 100,
        "parentTaskUid": 1,
        "siblingOrder": 2,
        "grs": {
          "style": {
            "milestoneShape": "diamond",
            "fill": {
              "color": { "type": "theme" },
              "opacityPercent": 100
            }
          },
          "taskGroupId": "15e4d36c-dc58-4088-b28d-3530c76a6da5",
          "importOrigin": {
            "sourceProjectUid": "b7ee990a-21f3-47aa-b1b3-2c388a58a9f5",
            "sourceTaskUid": 13,
            "importSessionId": "618c67bd-8974-481d-848b-eb68aa1fb8ca",
            "lastSeenMspdiImportCount": 1
          }
        },
        "predecessorLinks": [
          {
            "predecessorUid": 2,
            "type": 1,
            "linkLag": 4800,
            "lagFormat": 7,
            "passthrough": {
              "CrossProject": 0
            }
          }
        ]
      }
    ],
    "resources": [
      {
        "uid": 1,
        "name": "Worker A",
        "type": 1,
        "isCostResource": false,
        "calendarUid": 2,
        "passthrough": {
          "Initials": "WA",
          "MaxUnits": 1
        }
      }
    ],
    "assignments": [
      {
        "uid": 1,
        "taskUid": 2,
        "resourceUid": 1,
        "passthrough": {
          "Units": 1,
          "Work": "PT20H0M0S"
        }
      }
    ],
    "taskGroups": [
      {
        "id": "db19099a-0302-418d-82e1-e95c7a6a093c",
        "name": "Work package A",
        "siblingOrder": 1,
        "style": {
          "color": { "type": "theme" }
        },
        "minHeightPx": 40,
        "representativeTaskUid": 1,
        "hyperlinkAddress": "https://example.com/lanes/work-package-a",
        "hyperlink": "Lane notes",
        "selfShowMode": "shown",
        "editableByGroupName": "Team A"
      },
      {
        "id": "15e4d36c-dc58-4088-b28d-3530c76a6da5",
        "name": "Steps",
        "parentTaskGroupId": "db19099a-0302-418d-82e1-e95c7a6a093c",
        "siblingOrder": 1,
        "style": {
          "color": { "type": "palette", "name": "lightGray" }
        },
        "selfShowMode": "automatic"
      }
    ],
    "baselineTasks": [
      {
        "uid": 2,
        "name": "Prepare draft",
        "start": "2026-12-01T08:00:00",
        "finish": "2026-12-02T17:00:00",
        "milestone": false
      }
    ],
    "highlightBoxes": [
      {
        "id": "8bc08829-d2ac-4cc5-87f8-c2fd9591a23a",
        "style": {
          "cornerRadiusPx": 4,
          "fill": {
            "color": { "type": "palette", "name": "yellow" },
            "opacityPercent": 30
          },
          "stroke": {
            "color": { "type": "palette", "name": "yellow" },
            "opacityPercent": 100,
            "widthPx": 2
          }
        },
        "firstDay": "2026-12-03",
        "lastDay": "2026-12-04",
        "firstTaskGroupId": "15e4d36c-dc58-4088-b28d-3530c76a6da5",
        "lastTaskGroupId": "15e4d36c-dc58-4088-b28d-3530c76a6da5"
      }
    ],
    "commentBoxes": [
      {
        "id": "23739f92-76e5-494f-aec7-3eab514f8f6e",
        "text": "Paused for half a day; resumes on Dec 3.",
        "style": {
          "fill": {
            "color": { "type": "palette", "name": "white" },
            "opacityPercent": 90
          },
          "stroke": {
            "color": { "type": "palette", "name": "orange" },
            "opacityPercent": 100,
            "widthPx": 1
          },
          "font": {
            "color": {
              "type": "custom",
              "light": { "hexColor": "#1f2328" },
              "dark": { "hexColor": "#e6edf3", "isCalculatedFromOppositeColor": true }
            },
            "sizePx": 12
          }
        },
        "leaderTarget": {
          "type": "task",
          "taskUid": 2,
          "snapPart": "planBar",
          "snapPoint": "topRightCorner"
        },
        "bodyOffsetPx": {
          "dx": 40,
          "dy": -30
        },
        "hyperlinkAddress": "https://example.com/notes/prepare-draft",
        "hyperlink": "Draft notes"
      }
    ],
    "passthroughTasks": [
      {
        "mspdiElement": {
          "UID": 0,
          "ID": 0,
          "Name": "Sample Schedule",
          "Type": 1,
          "IsNull": 0,
          "OutlineNumber": "0",
          "OutlineLevel": 0,
          "Summary": 1
        }
      },
      {
        "precedingTaskUid": 2,
        "mspdiElement": {
          "UID": 4,
          "ID": 3,
          "IsNull": 1
        }
      }
    ],
    "passthroughResources": [
      {
        "mspdiElement": {
          "UID": 0,
          "ID": 0,
          "Type": 1,
          "IsNull": 0
        }
      },
      {
        "precedingResourceUid": 1,
        "mspdiElement": {
          "UID": 2,
          "ID": 2,
          "IsNull": 1
        }
      }
    ],
    "passthroughAssignments": [
      {
        "precedingAssignmentUid": 1,
        "mspdiElement": {
          "UID": 2,
          "TaskUID": 3,
          "ResourceUID": -65535,
          "Units": 1
        }
      }
    ],
    "passthroughCalendars": [
      {
        "precedingCalendarUid": 2,
        "mspdiElement": {
          "UID": 3,
          "Name": "Baseline calendar",
          "IsBaseCalendar": 1,
          "IsBaselineCalendar": 1,
          "BaseCalendarUID": -1
        }
      }
    ]
  },
  "changeLogEntries": [
    {
      "changedAt": "2026-12-02T03:00:00Z",
      "changedBy": { "editorType": "user", "name": "Manager A" },
      "affectedArea": "tasks",
      "changeDescription": "Imported the plan from the MSPDI file.",
      "reason": "Start tracking the work package.",
      "remarks": "First import."
    },
    {
      "changedAt": "2026-12-03T05:10:00Z",
      "changedBy": { "editorType": "agent", "name": "planning-assistant" },
      "affectedArea": "Prepare draft",
      "changeDescription": "Recorded a stop on Dec 2 and a resume on Dec 3.",
      "reason": "Work paused for half a day."
    }
  ]
}
```

## 5. 問い

**問 1. 行ごとの説明.** `R001` から `R428` までの **すべての行** について、その名（値の行では、その値）が何を意味すると思うかを、日本語 20 字前後で書いてください。あわせて、読みの確信（1 ＝ 当てずっぽう 〜 5 ＝ 迷いなし）と、迷ったなら何と何で迷ったかを書いてください。迷わなかった行の「迷い」は空にしてください。

**問 2. 迷いの大きい名.** 問 1 で迷った行のうち、迷いの大きい順に 10 まで。最初の読み、ほかに浮かんだ読み、名のどの部分があなたを迷わせたか。

**問 3. 部分ごとの一目.** 5 つの部分（根と帳簿・文書設定・頭の値と MSPDI と往復する群・GRS だけが持つ配列・共通の型）のそれぞれについて、何のための物か一目で分かるか（○・△・×）と、その一言。

## 6. 答えの型（この型のまま、1 つのコードブロックに書く）

- 答えは長くなります。途中で切れたら、こちらが「続けて」と送ります。そのときは、切れた行の次の行から、同じ型で続けてください。
- 問 1 の表は、`R001` から `R428` まで 1 行も飛ばさずに書いてください。

```markdown
## 問 1. 行ごとの説明
| 行 | 意味だと思うこと | 確信 1〜5 | 迷い（何と何で迷ったか） |
| R001 | | | |
| R002 | | | |
（R428 まで、すべての行）
## 問 2. 迷いの大きい名（迷いの大きい順に 10 まで）
| # | 行 | 名 | 最初の読み | ほかに浮かんだ読み | 迷わせた部分 |
## 問 3. 部分ごとの一目
| 部分 | 一目で分かるか（○・△・×） | 一言 |
| 根と帳簿 | | |
| 文書設定 | | |
| 頭の値と MSPDI と往復する群 | | |
| GRS だけが持つ配列 | | |
| 共通の型 | | |
```

**繰り返します: 答えはすべて、1 つのコードブロックの中に書いてください。2 段目は答えの後に送ります。**
